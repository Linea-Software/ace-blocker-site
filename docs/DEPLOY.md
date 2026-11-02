# VPS Deployment Guide for Ace Blocker

This guide provides a step-by-step walkthrough for deploying the Ace Blocker website to a Linux VPS (Ubuntu 22.04+ recommended) using **Docker**, **Bun**, **Nginx**, and **Certbot**.

> [!TIP]
> **Automated path:** Most of the steps below are automated by `scripts/setup-vps.sh`. To use it:
>
> ```bash
> sudo bash scripts/setup-vps.sh            # uses defaults (domain: aceblocker.com)
> # or override:
> sudo bash scripts/setup-vps.sh --domain aceblocker.com --email admin@aceblocker.com \
>     --b2-key-id <id> --b2-app-key <key> --b2-bucket <bucket>
> ```
>
> The flags are optional — the script prompts for anything it needs (Cloudflare token, B2 credentials). The manual steps in this guide remain useful for understanding what the script does and for troubleshooting. Where the script and this guide differ, **the script is the source of truth.**
>
> Credential-bearing setup steps validate access before continuing. Invalid GitHub, Cloudflare, or B2 credentials are discarded and prompted again. The production .env configurator likewise verifies Dodo, Resend, and Bunny Storage credentials when a safe provider check exists; webhook/signing secrets that have no standalone verification endpoint are required but cannot be remotely authenticated during setup.

---

## 📋 Prerequisites

1.  **A VPS**: (DigitalOcean, Hetzner, AWS, etc.) with at least 1GB RAM, running Ubuntu 22.04 or 24.04.
2.  **A Domain Name**: Pointed to your VPS IP address (A record).
3.  **SSH key access**: You should be able to log in via SSH key (password SSH login is disabled during hardening).

---

## 🛠️ 1. Initial Server Setup

Login to your server and perform basic security steps.

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install basic tools (gnupg is used later for encrypting backups)
sudo apt install -y curl git ufw nginx gnupg
```

### Create a New User

It is highly recommended not to run everything as `root`.

```bash
# Create a new user (replace 'aceblocker' with your preferred username)
adduser aceblocker

# Copy your SSH keys to the new user (assuming you logged in via SSH key as root)
mkdir -p /home/aceblocker/.ssh
cp /root/.ssh/authorized_keys /home/aceblocker/.ssh/
chown -R aceblocker:aceblocker /home/aceblocker/.ssh
chmod 700 /home/aceblocker/.ssh
chmod 600 /home/aceblocker/.ssh/authorized_keys
```

#### Sudo access (scoped, not blanket)

Avoid adding the service user to the `sudo` group with passwordless access — that
makes the account effectively root, so any app or dependency compromise becomes a
full root compromise. Instead, grant general sudo that **requires a password**,
plus a narrow passwordless exception (pinned to absolute paths) for the few
commands the deployment needs:

```bash
# Set a password for the user (used for sudo and console login, NOT for SSH)
passwd aceblocker

# Create a scoped sudoers file.
# Pin the ARGUMENTS, not just the binary: `NOPASSWD: /usr/bin/docker` permits
# `sudo docker run -v /:/host …`, which is a one-line path to root, and
# `NOPASSWD: /usr/bin/apt` permits `sudo apt -o APT::Update::Pre-Invoke::=<cmd>`.
# Both are exactly the root-equivalence the password prompt is there to prevent.
# These are the only command lines `bun run setup` actually invokes.
cat > /etc/sudoers.d/aceblocker << 'EOF'
aceblocker ALL=(ALL) ALL
aceblocker ALL=(ALL) NOPASSWD: /usr/bin/apt update, /usr/bin/apt install -y libnss3-tools
aceblocker ALL=(ALL) NOPASSWD: /usr/bin/docker compose up -d, /usr/bin/docker compose down -v
EOF
chmod 440 /etc/sudoers.d/aceblocker

# Validate — a broken sudoers file can lock out sudo entirely
visudo -cf /etc/sudoers.d/aceblocker

# Switch to the new user
su - aceblocker
```

> [!NOTE]
> The automated `setup-vps.sh` creates exactly this scoped sudoers file. Adjust the
> paths if your distro installs these binaries elsewhere (check with `command -v docker`).

### SSH Hardening

Secure your SSH connection by disabling root login and limiting login attempts.

1. Open the SSH configuration file:

    ```bash
    sudo nano /etc/ssh/sshd_config
    ```

2. Ensure the following settings are configured:

    ```ini
    # Disable root login
    PermitRootLogin no

    # Only allow your specific user to SSH
    AllowUsers aceblocker

    # Disable empty passwords
    PermitEmptyPasswords no

    # Limit authentication attempts
    MaxAuthTries 3

    # Limit concurrent unauthenticated connections (throttle brute force)
    MaxStartups 3:50:10

    # Disconnect idle sessions after ~15 minutes (300s x 2 missed probes)
    ClientAliveInterval 300
    ClientAliveCountMax 2

    # Disable password authentication (FORCE SSH keys)
    PasswordAuthentication no

    # Disable X11 forwarding (not needed for a server)
    X11Forwarding no
    ```

    **Important**: Only set `PasswordAuthentication no` if you have confirmed that your SSH key login works for the new user!

    **Important**: Replace `aceblocker` in `AllowUsers` with your actual username.

    > [!WARNING]
    > sshd uses the **first** value it obtains for each keyword, and
    > `/etc/ssh/sshd_config` includes `/etc/ssh/sshd_config.d/*.conf` near the
    > **top** of the file. Cloud images ship
    > `/etc/ssh/sshd_config.d/50-cloud-init.conf` containing
    > `PasswordAuthentication yes`, which therefore beats anything you add at the
    > bottom of `sshd_config` — the box looks hardened while password login is
    > still enabled. Put the settings above in
    > `/etc/ssh/sshd_config.d/00-hardening.conf` instead (`00-` sorts ahead of
    > `50-cloud-init`), then confirm with `sudo sshd -T | grep -E
'passwordauthentication|permitrootlogin'` — that prints the _effective_
    > config, which is the only thing worth trusting here.

3. Validate the config, then reload (don't blindly restart — a bad config plus a restart can drop sshd and lock you out):

    ```bash
    # Confirm there are no syntax errors BEFORE applying
    sudo sshd -t

    # Reload (keeps your current session alive); only proceeds if -t passed
    sudo systemctl reload ssh
    ```

> [!WARNING]
> Before you disable `PasswordAuthentication`, confirm key-based login works for
> the new user **in a separate terminal**, and keep your current session open
> until you've verified a fresh login succeeds. If the key copy failed and you've
> already disabled passwords + root login, you'll be locked out and will need your
> provider's recovery console.

### Setup Firewall

Allow SSH, HTTP, and HTTPS. Use `limit` on SSH to rate-limit connection attempts.

```bash
sudo ufw limit OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 443/udp
sudo ufw --force enable
```

### Install Fail2Ban (Brute-Force Protection)

Fail2Ban monitors logs and temporarily bans IPs that show malicious behavior (e.g., repeated failed SSH logins).

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

The default configuration protects SSH out of the box. To check status:

```bash
sudo fail2ban-client status sshd
```

### Enable Automatic Security Updates

Keep the OS patched against known vulnerabilities automatically.

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

This will automatically install security updates daily. You can verify it's active:

```bash
sudo systemctl status unattended-upgrades
```

---

## 📦 2. Install Dependencies

### Install Docker & Docker Compose

The database (and optionally the application) runs in Docker.

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

> [!WARNING]
> **Do not add the service user to the `docker` group by default.** Membership in
> the `docker` group is effectively root (a container can mount the host
> filesystem as root), which undermines the scoped-sudo setup above. The
> deployment runs Docker commands through the scoped `sudo` rule instead
> (`sudo docker ...`). Only add the user to the group if you have a specific need
> and accept that it grants root-equivalent access:
>
> ```bash
> # Optional, root-equivalent — only if you really need it:
> sudo usermod -aG docker $USER   # then log out and back in
> ```

### Install Bun

Used for package management and running the app.

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

---

## 🚀 3. Project Deployment

### Clone the Repository

```bash
git clone https://github.com/Linea-Software/ace-blocker-site.git
cd ace-blocker-site
```

> [!NOTE]
> Keep the clone URL above in sync with `REPO_URL` in `scripts/setup-vps.sh`
> (currently `https://github.com/Linea-Software/ace-blocker-site.git`) — they
> must match. For a **private** repo, prefer a read-only deploy key over a
> personal access token; the automated script avoids writing any token to disk
> (no plaintext `~/.git-credentials`).

### Initial Setup

Run the project's setup script to install dependencies, configure the initial `.env`, and start the database.

```bash
bun install
bun run setup
```

### Production Environment Variables

Edit the `.env` file for production.

```bash
nano .env
```

Ensure the following are set correctly:

- `DATABASE_URL`: Set to `postgres://postgres:mysecretpassword@localhost:5432/aceblocker` (adjust user/pass/db if changed).
- `BETTER_AUTH_SECRET`: Already generated by `setup`.
- `BETTER_AUTH_URL`: **IMPORTANT** - Set to `https://aceblocker.com`.
- `ORIGIN`: **IMPORTANT** - Set to `https://aceblocker.com` (Required for CSRF protection).

**Services & Security**:

- `POSTGRES_USER`: Database user (default: `postgres`).
- `POSTGRES_PASSWORD`: **CRITICAL** - Set a strong password for your database.
- `POSTGRES_DB`: Database name (default: `aceblocker`).
- `BACKUP_PASSPHRASE`: Optional. If set, daily backups are GPG-encrypted at rest before being copied off-site (see Section 10). Store it somewhere safe and separate — without it the backups cannot be restored.
- `BUNNY_URL_TOKEN_AUTH_KEY`: Required for BunnyCDN URL token authentication (used for Resistance Mode script token generation).
- `DODO_PAYMENTS_API_KEY`: Your production API key.
- `DODO_PAYMENTS_WEBHOOK_SECRET`: Your production webhook secret.

---

## 🐳 4. Docker Configuration

The project uses `compose.yaml` to manage infrastructure. By default, it manages the PostgreSQL database.

### The `compose.yaml` File

This file defines the services required for the application.

```yaml
services:
    db:
        image: postgres
        container_name: ace-blocker-db
        restart: unless-stopped
        ports:
            - 127.0.0.1:5432:5432
        environment:
            POSTGRES_USER: ${POSTGRES_USER:-postgres}
            POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-mysecretpassword}
            POSTGRES_DB: ${POSTGRES_DB:-aceblocker}
        volumes:
            - pgdata:/var/lib/postgresql/data
        healthcheck:
            test:
                [
                    'CMD-SHELL',
                    'pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-aceblocker}'
                ]
            interval: 10s
            timeout: 5s
            retries: 5
            start_period: 10s
        deploy:
            resources:
                limits:
                    memory: 512M

volumes:
    pgdata:
```

> [!WARNING]
> **Security**: In production, you MUST set `POSTGRES_PASSWORD` to a strong, unique value in your `.env` file. The `compose.yaml` uses `${VARIABLE}` syntax to safely pull these values from your environment.
>
> **Port Binding**: The database port is bound to `127.0.0.1` (localhost only), so it cannot be reached from the public internet. Only your app running locally can connect.
>
> **Restart Policy**: `unless-stopped` is preferred over `always` — the container won't restart if you intentionally stop it manually.
>
> **Health Check**: PostgreSQL health checks are configured so Docker Compose can verify the database is ready before dependent services start.

### Manual Database Management

If you're not using the `bun run setup` script, you can start the database manually:

```bash
docker compose up -d
```

### Dockerizing the Application (Optional)

A `Dockerfile` is provided to run the SvelteKit application in a containerized environment. This is recommended for consistent deployments.

1. **Build the image**:

```bash
docker build -t ace-blocker-site .
```

2. **Run with Docker Compose**:

To run both the app and the DB in Docker, you can add an `app` service to your `compose.yaml`:

```yaml
app:
    build: .
    restart: unless-stopped
    ports:
        - 3000:3000
    depends_on:
        db:
            condition: service_healthy
    env_file:
        - .env
    environment:
        DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
```

---

## 🏗️ 5. Build and Run

### Build the Application

```bash
bun run build
```

This generates the output in the `.svelte-kit/output` (or `build/` depending on adapter) directory.

### Create a Systemd Service

To keep the server alive and restart on failure.

1. Create the service file:

```bash
sudo nano /etc/systemd/system/ace-blocker.service
```

2. Add the following content (adjust paths and username as needed):

```ini
[Unit]
Description=Ace Blocker SvelteKit App
After=network.target

[Service]
Type=simple
User=aceblocker
Group=aceblocker
WorkingDirectory=/home/aceblocker/ace-blocker-site
EnvironmentFile=/home/aceblocker/ace-blocker-site/.env
ExecStart=/home/aceblocker/.bun/bin/bun /home/aceblocker/ace-blocker-site/build/index.js
Restart=always
RestartSec=10

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/aceblocker/ace-blocker-site
PrivateTmp=yes
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
RestrictNamespaces=yes
LockPersonality=yes
MemoryDenyWriteExecute=yes
PrivateDevices=yes
ProtectClock=yes
ProtectControlGroups=yes
ProtectKernelModules=yes
ProtectKernelTunables=yes
RestrictRealtime=yes
SystemCallArchitectures=native

[Install]
WantedBy=multi-user.target
```

**Note**: Make sure the `.env` file has restricted permissions so that secrets are not world-readable:

```bash
chmod 600 /home/aceblocker/ace-blocker-site/.env
```

_(Replace `aceblocker` with your actual Linux username throughout.)_

3. Start and enable the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ace-blocker
sudo systemctl start ace-blocker
```

---

## 🌐 6. Nginx Configuration

1. Create a new site configuration:

```bash
sudo nano /etc/nginx/sites-available/ace-blocker
```

2. Add the following content (Basic HTTP config):

```nginx
server {
    listen 80;
    server_name aceblocker.com;

    # Redirect ACME challenges to avoid redirect loops during cert renewal
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # SET, never append. $proxy_add_x_forwarded_for keeps the client's own
        # X-Forwarded-For as the left-most entry — which is the entry
        # better-auth reads to key its login rate limiter, so any client could
        # rotate the header and never get limited.
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> [!IMPORTANT]
> If this origin sits behind the Cloudflare proxy, `$remote_addr` is a Cloudflare
> edge IP, so every visitor shares one rate-limit bucket. Add a real-IP config in
> the `http` context (`/etc/nginx/conf.d/cloudflare-realip.conf`) with
> `set_real_ip_from` for each range in <https://www.cloudflare.com/ips-v4> and
> `ips-v6`, plus `real_ip_header CF-Connecting-IP;` and `real_ip_recursive off;`.
> `scripts/setup-vps.sh` generates this file for you.

_Note: The `X-Forwarded-Proto` header is essential for SvelteKit and Better Auth to correctly detect HTTPS._

3. Disable the default Nginx configuration and enable your site:

```bash
# Remove the default splash page
sudo rm /etc/nginx/sites-enabled/default

# Enable your site
sudo ln -s /etc/nginx/sites-available/ace-blocker /etc/nginx/sites-enabled/

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 7. HTTPS Support (SSL)

We recommend using **Certbot** with the **Cloudflare DNS plugin** for easy, automatically renewing SSL certificates, especially if you want to support wildcard domains or have restrictive firewall settings.

### Install Certbot and Cloudflare Plugin

```bash
sudo apt install -y certbot python3-certbot-dns-cloudflare
```

### Configure Cloudflare API Credentials

1.  Create a credentials file:
    ```bash
    nano ~/.cloudflare.ini
    ```
2.  Add your Cloudflare API token (ensure the token has `Zone:Zone:Read` and `Zone:DNS:Edit` permissions and is **scoped to your specific zone**, not all zones):
    ```ini
    dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
    ```
3.  Secure the file:
    ```bash
    chmod 600 ~/.cloudflare.ini
    ```

### Obtain Certificate

Run the following command to obtain the certificate via DNS challenge:

```bash
sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials ~/.cloudflare.ini -d aceblocker.com -d www.aceblocker.com
```

### Update Nginx for SSL

After obtaining the certificates, update your Nginx configuration to enable HTTPS and HTTP/2.

1. Open your configuration:

    ```bash
    sudo nano /etc/nginx/sites-available/ace-blocker
    ```

2. Replace the content with this robust SSL configuration:

```nginx
server {
    listen 80;
    server_name aceblocker.com www.aceblocker.com;

    # Redirect ACME challenges to avoid redirect loops during cert renewal
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    return 301 https://$host$request_uri;
}

server {
    # For Nginx < 1.25.1, use: listen 443 ssl http2;
    # For Nginx >= 1.25.1, use: listen 443 ssl; and http2 on;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name aceblocker.com www.aceblocker.com;

    ssl_certificate /etc/letsencrypt/live/aceblocker.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aceblocker.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/aceblocker.com/chain.pem;

    # Modern TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;

    # Performance
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Buffer size for uploads
    client_max_body_size 10m;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # SET, never append — see the note above on rate-limit bypass.
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

_Note: If you get an "unknown directive 'http2'" error, it means your Nginx is very new (>= 1.25.1). In that case, remove `http2` from the `listen` lines and add `http2 on;` as a separate line inside the `server` block._

Alternatively, you can run `sudo certbot --nginx` after obtaining the cert to have Certbot attempt to automatically configure Nginx, though the manual method above gives you more control.

### Verify Auto-Renewal

Certbot adds a timer to your system to handle renewals automatically.

```bash
sudo systemctl status certbot.timer
```

---

## 🚀 8. CDN Configuration (Optional - BunnyCDN)

If you are using a CDN like BunnyCDN to serve your site, follow these critical steps to avoid connection errors:

### 1. BunnyCDN Dashboard Setup

- **Origin URL**: If possible, use `https://aceblocker.com` (your domain). If BunnyCDN cannot reach your domain because DNS points to the CDN, use your VPS IP with HTTP: `http://YOUR_VPS_IP`. Avoid HTTPS with IP addresses as certificates will not validate.
- **Host Header**: Set this to your actual domain name (e.g., `aceblocker.com`). BunnyCDN needs this to tell your VPS which site it is requesting.
- **Purge Cache**: After making changes, always click **Purge Cache** in the BunnyCDN dashboard.

### 2. DNS Configuration (CRITICAL)

Your domain (`aceblocker.com`) must point to BunnyCDN, **NOT** directly to your VPS IP.

1.  **For `www.aceblocker.com`**:
    - Create a **CNAME** record.
    - Host/Name: `www`
    - Value: `aceblocker.b-cdn.net` (Your BunnyCDN hostname).
2.  **For the root domain (`aceblocker.com`)**:
    - If your provider supports **CNAME Flattening**, **ANAME**, or **ALIAS** records: Use one of those to point the root (`@`) to `aceblocker.b-cdn.net`.
    - If not: Add an **A Record** pointing to the **BunnyCDN Edge IP** provided in your BunnyCDN dashboard under "Hostnames".

### 3. VPS Firewall & Nginx

- **Firewall**: Ensure Port 443 (TCP & UDP) is open on your VPS (as done in Step 1).
- **Nginx**: Ensure your Nginx configuration in Step 6 is active and has the correct `server_name`.

---

## 💳 9. Webhooks (Dodo Payments)

Since the project uses Dodo Payments, you must configure the webhook URL in your **Dodo Payments Dashboard**:

1. Log in to Dodo Payments.
2. Go to **Developer > Webhooks**.
3. Add a new webhook with the URL: `https://aceblocker.com/api/auth/dodopayments/webhooks`
4. Copy the **Webhook Secret** and paste it into `.env` as `DODO_PAYMENTS_WEBHOOK_SECRET`.

---

## 💾 10. Database Backups (Crucial)

To prevent data loss, schedule a daily backup of your Postgres container. A good
strategy has three parts: a consistent dump, an **off-site copy** (a backup that
only lives on the same server is lost if the server is), and **encryption at rest**.

> [!TIP]
> The automated `setup-vps.sh` builds this entire backup pipeline (local + Backblaze
> B2 off-site + optional GPG encryption) and installs the cron job. The steps below
> document what it produces and how to set it up by hand.

### 10a. Set up off-site storage (Backblaze B2)

B2's free tier covers the first 10 GB of storage, and uploads/transactions are free,
so compressed database dumps typically cost nothing.

1. In the B2 console, **create a bucket** (keep it **Private**). Note the exact name.
2. Optionally set a **Lifecycle rule** on the bucket to delete files after ~30 days
   (server-side retention backstop).
3. Go to **Application Keys** and create a key **scoped to that one bucket** with
   read & write access. Copy the **keyID** and the **applicationKey** (the secret is
   shown only once).
4. Under **Caps & Alerts**, set a low cap/alert so cost can't surprise you.

Install and configure `rclone` as the service user:

```bash
curl -fsSL https://rclone.org/install.sh | sudo bash

sudo -u aceblocker mkdir -p /home/aceblocker/.config/rclone
sudo -u aceblocker bash -c 'cat > /home/aceblocker/.config/rclone/rclone.conf << EOF
[b2backup]
type = b2
account = YOUR_KEY_ID
key = YOUR_APPLICATION_KEY
EOF'
sudo chmod 600 /home/aceblocker/.config/rclone/rclone.conf

# Verify the credentials and bucket are reachable:
sudo -u aceblocker rclone lsd b2backup:               # lists buckets the key can see
sudo -u aceblocker rclone lsd b2backup:YOUR_BUCKET    # confirms the specific bucket
```

> [!NOTE]
> Use the **keyID** as the `account` value (not your master Account ID — B2 rejects
> that with a 401). B2 bucket names may contain uppercase; match the exact case.

### 10b. Backup script

```bash
mkdir -p ~/backups
nano ~/backups/backup_db.sh
```

```bash
#!/bin/bash
set -euo pipefail
umask 077  # backups readable only by owner

# Load only the vars we need, WITHOUT executing the .env as shell. Using
# 'source' breaks under 'set -u' when a secret contains characters like '$'
# (the shell tries to expand them), and is a minor injection risk. This reads
# KEY=VALUE literally, matching how systemd's EnvironmentFile parses the file.
ENV_FILE="/home/aceblocker/ace-blocker-site/.env"
while IFS='=' read -r _k _v; do
    case "$_k" in
        POSTGRES_USER|POSTGRES_DB|POSTGRES_PASSWORD|BACKUP_PASSPHRASE)
            _v="${_v%\"}"; _v="${_v#\"}"; _v="${_v%\'}"; _v="${_v#\'}"
            printf -v "$_k" '%s' "$_v"
            ;;
    esac
done < "$ENV_FILE"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-aceblocker}"
BACKUP_PASSPHRASE="${BACKUP_PASSPHRASE:-}"
if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
    echo "ERROR: POSTGRES_PASSWORD not found in ${ENV_FILE}" >&2
    exit 1
fi

BACKUP_DIR="/home/aceblocker/backups"
BACKUP_PATH="${BACKUP_DIR}/db_$(date +%Y%m%d_%H%M%S).sql"

# 1. Dump the database. The password goes in over STDIN: `-e PGPASSWORD=secret`
#    puts it in argv, where any local user can read it out of `ps` — and, run
#    under sudo, sudo writes the whole command line to /var/log/auth.log on
#    every single run.
printf '%s\n' "$POSTGRES_PASSWORD" | sudo docker exec -i ace-blocker-db \
    sh -c 'IFS= read -r PGPASSWORD; export PGPASSWORD; exec pg_dump -U "$0" -d "$1"' \
    "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_PATH"
[[ -s "$BACKUP_PATH" ]] || { echo "empty dump — discarding" >&2; rm -f "$BACKUP_PATH"; exit 1; }
gzip "$BACKUP_PATH"

# 2. Encrypt at rest if BACKUP_PASSPHRASE is set in .env (requires gpg).
#    --passphrase-fd 0 for the same argv reason as above.
if [[ -n "$BACKUP_PASSPHRASE" ]] && command -v gpg >/dev/null 2>&1; then
    printf '%s' "$BACKUP_PASSPHRASE" | gpg --batch --yes --pinentry-mode loopback \
        --passphrase-fd 0 --cipher-algo AES256 \
        -o "${BACKUP_PATH}.gz.gpg" -c "${BACKUP_PATH}.gz"
    rm -f "${BACKUP_PATH}.gz"
    EXT="sql.gz.gpg"; FINAL="${BACKUP_PATH}.gz.gpg"
else
    EXT="sql.gz"; FINAL="${BACKUP_PATH}.gz"
fi

# 3. Off-site copy to Backblaze B2 (set B2_BUCKET to enable; leave blank to skip)
B2_BUCKET="YOUR_BUCKET"
if [[ -n "$B2_BUCKET" ]] && command -v rclone >/dev/null 2>&1; then
    rclone copy "$FINAL" "b2backup:${B2_BUCKET}/db-backups/"
    rclone delete --b2-hard-delete --fast-list --min-age 30d \
        "b2backup:${B2_BUCKET}/db-backups/" || true
fi

# 4. Local retention: keep 7 days
find "$BACKUP_DIR" -type f -name "*.${EXT}" -mtime +7 -delete
echo "Backup completed: ${FINAL}"
```

> [!WARNING]
> Ensure `.env` is `chmod 600`. If you set `BACKUP_PASSPHRASE`, the dumps are
> encrypted before leaving the server — recommended, since they're full database
> dumps. **Store the passphrase somewhere safe and separate; without it the
> backups cannot be restored.** If you omit it, the dumps are uploaded
> unencrypted.

_(Check your actual container name with `docker ps` — it should be `ace-blocker-db`.)_

### 10c. Schedule it

```bash
chmod 700 ~/backups/backup_db.sh
crontab -e
# Add this line (logs each run so failures aren't silent):
0 3 * * * /home/aceblocker/backups/backup_db.sh >> /home/aceblocker/backups/backup.log 2>&1
```

### 10d. Verify before trusting it

A backup you've never restored is a guess. After setup, run it once by hand and
confirm the off-site copy appears in the B2 console:

```bash
sudo -u aceblocker /home/aceblocker/backups/backup_db.sh
gunzip -t ~/backups/db_*.sql.gz 2>/dev/null && echo "archive OK"   # if unencrypted
```

---

## 🔄 11. Maintenance & Updates

To update the site with new changes:

```bash
cd /home/aceblocker/ace-blocker-site
git pull
bun install
bun run build
bun run db:migrate
sudo systemctl restart ace-blocker
```

> [!TIP]
> If you have local modifications to `compose.yaml` that you want to preserve, create a `compose.override.yaml` instead of modifying the tracked file. Docker Compose automatically merges `compose.yaml` and `compose.override.yaml` files. This way `git pull` works cleanly every time.

---

## 📊 12. Logs & Monitoring

### View App Logs

The app runs as a systemd service, so you can view its logs using `journalctl`.

```bash
# View last 100 lines
sudo journalctl -u ace-blocker -n 100

# Follow logs in real-time
sudo journalctl -u ace-blocker -f
```

### View Database Logs

```bash
docker compose logs -f db
```

---

## 🛠️ 13. Troubleshooting

### "CSRF Error" or "Invalid Origin"

Ensure the `ORIGIN` variable in `.env` exactly matches your domain (including `https://`) and that Nginx is passing the `X-Forwarded-Proto` header.

### Database Connection Issues

If the app cannot connect to the database, ensure the Docker container is running:

```bash
docker ps
```

If it's not running, check the logs with `docker compose logs`.

### Memory Issues (Low RAM VPS)

If your build fails or the app crashes on a 512MB/1GB VPS, add a swap file:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```
