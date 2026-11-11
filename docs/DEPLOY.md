# VPS Deployment Guide for Ace Blocker

Deploy the Ace Blocker website to a Linux VPS with **Docker**, **Bun**, **Nginx**, and **Certbot**. Ubuntu 22.04 or later is recommended. Follow the steps in order.

> [!TIP]
> **Automated setup:** `scripts/setup-vps.sh` performs most of these steps. Run it as follows:
>
> ```bash
> sudo bash scripts/setup-vps.sh            # uses defaults (domain: aceblocker.com)
> # or override:
> sudo bash scripts/setup-vps.sh --domain aceblocker.com --email admin@aceblocker.com \
>     --b2-key-id <id> --b2-app-key <key> --b2-bucket <bucket>
> ```
>
> The flags are optional. The script asks for missing values, such as the Cloudflare token and B2 credentials. Use the manual steps to understand or troubleshoot the setup. If the script and this guide differ, **follow the script**.
>
> Setup checks credential access before continuing. It discards invalid GitHub, Cloudflare, or B2 credentials and asks again. The production `.env` configurator also verifies Dodo, Resend, and Bunny Storage credentials when the provider offers a safe check. You must provide webhook and signing secrets even when no standalone endpoint can verify them. Setup cannot authenticate those secrets remotely.

---

## 📋 Prerequisites

1. **VPS:** Use at least 1 GB of RAM and Ubuntu 22.04 or 24.04 (for example, DigitalOcean, Hetzner, or AWS).
2. **Domain:** Point its A record to the VPS IP address.
3. **SSH key access:** Verify that you can sign in with an SSH key. The hardening procedure disables password-based SSH login.

---

## 🛠️ 1. Initial Server Setup

Log in to the server. Apply the basic security settings.

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install basic tools (gnupg is used later for encrypting backups)
sudo apt install -y curl git ufw nginx gnupg
```

### Create a New User

Avoid running all services as `root`.

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

Do not grant the service user unrestricted passwordless sudo. That access makes
the account effectively root. A compromised application or dependency could then
compromise the whole server.
Require a password for general sudo. Grant passwordless access only to the few
required commands, with absolute paths and fixed arguments:

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
> `setup-vps.sh` creates this scoped sudoers file. If your distribution uses
> different binary paths, check them with `command -v docker` and update the file.

### SSH Hardening

Disable root SSH login and limit login attempts.

1. Open the SSH configuration file:

    ```bash
    sudo nano /etc/ssh/sshd_config
    ```

2. Set the following configuration values:

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

3. Validate the configuration, then reload SSH. Do not restart SSH without validation. An invalid configuration can stop SSH and lock you out:

    ```bash
    # Confirm there are no syntax errors BEFORE applying
    sudo sshd -t

    # Reload (keeps your current session alive); only proceeds if -t passed
    sudo systemctl reload ssh
    ```

> [!WARNING]
> Before you disable `PasswordAuthentication`, test SSH key login for the new user
> **in a separate terminal**. Keep the current session open until the new login
> succeeds. If the key copy fails and you disable both password and root login,
> you will need the provider's recovery console to regain access.

### Setup Firewall

Allow SSH, HTTP, and HTTPS. Apply `limit` to SSH to restrict connection attempts.

```bash
sudo ufw limit OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 443/udp
sudo ufw --force enable
```

### Install Fail2Ban (Brute-Force Protection)

Fail2Ban reads logs and temporarily blocks IP addresses after suspicious activity, such as repeated failed SSH logins.

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

The default configuration protects SSH. Check its status:

```bash
sudo fail2ban-client status sshd
```

### Enable Automatic Security Updates

Enable automatic OS security updates.

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

The system now installs security updates daily. Verify that automatic updates are active:

```bash
sudo systemctl status unattended-upgrades
```

---

## 📦 2. Install Dependencies

### Install Docker & Docker Compose

Run the database in Docker. You can also run the application in Docker.

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

> [!WARNING]
> **Do not add the service user to the `docker` group by default.** Members can
> mount the host filesystem as root from a container. This bypasses the scoped
> sudo controls. Run Docker commands through the scoped `sudo` rule instead
> (`sudo docker ...`). Add the user to the group only when necessary and only if
> you accept root-equivalent access:
>
> ```bash
> # Optional, root-equivalent — only if you really need it:
> sudo usermod -aG docker $USER   # then log out and back in
> ```

### Install Bun

Use Bun for package management and application execution.

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
> Keep the clone URL and `REPO_URL` in `scripts/setup-vps.sh` identical.
> The current URL is `https://github.com/Linea-Software/ace-blocker-site.git`.
> For a **private** repository, prefer a read-only deploy key to a personal
> access token. The automated script never writes the token to disk or to
> plaintext `~/.git-credentials`.

### Initial Setup

Run the project setup script. It installs dependencies, creates the initial `.env`, and starts the database.

```bash
bun install
bun run setup
```

### Production Environment Variables

Edit `.env` for production.

```bash
nano .env
```

Set and verify these values:

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

Use `compose.yaml` to manage infrastructure. By default, it manages PostgreSQL.

### The `compose.yaml` File

This file defines the services that the application needs.

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
> **Security:** In production, set a strong, unique `POSTGRES_PASSWORD` in `.env`.
> `compose.yaml` reads the value from the environment through `${VARIABLE}` syntax.
>
> **Port binding:** Bind the database port to `127.0.0.1` only. This prevents
> direct access from the public internet. Local applications can connect.
>
> **Restart policy:** Prefer `unless-stopped` to `always`. Docker will not
> restart a container that you intentionally stop.
>
> **Health check:** Use the configured PostgreSQL health checks. Docker Compose
> uses them to confirm database readiness before starting dependent services.

### Manual Database Management

If you do not run `bun run setup`, start the database manually:

```bash
docker compose up -d
```

### Dockerizing the Application (Optional)

The provided `Dockerfile` runs the SvelteKit application in a container. Use it for consistent deployments.

1. **Build the image**:

```bash
docker build -t ace-blocker-site .
```

2. **Run with Docker Compose**:

To run the application and database in Docker, add an `app` service to `compose.yaml`:

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

The build writes output to `.svelte-kit/output` or `build/`, depending on the adapter.

### Create a Systemd Service

Create a service to keep the server running and restart it after a failure.

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

**Security:** Restrict permissions on `.env` so other users cannot read secrets:

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
> If this origin is behind the Cloudflare proxy, `$remote_addr` is a Cloudflare
> edge IP, so every visitor shares one rate-limit bucket. Add a real-IP config in
> the `http` context (`/etc/nginx/conf.d/cloudflare-realip.conf`) with
> `set_real_ip_from` for each range in <https://www.cloudflare.com/ips-v4> and
> `ips-v6`, plus `real_ip_header CF-Connecting-IP;` and `real_ip_recursive off;`.
> `scripts/setup-vps.sh` generates this file for you.

_Keep `X-Forwarded-Proto`. SvelteKit and Better Auth need it to detect HTTPS correctly._

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

Use **Certbot** with the **Cloudflare DNS plugin** for automatic certificate renewal. This setup also supports wildcard domains and restricted firewall configurations.

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

Run this command to request the certificate with a DNS challenge:

```bash
sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials ~/.cloudflare.ini -d aceblocker.com -d www.aceblocker.com
```

### Update Nginx for SSL

After you obtain the certificates, enable HTTPS and HTTP/2 in Nginx.

1. Open your configuration:

    ```bash
    sudo nano /etc/nginx/sites-available/ace-blocker
    ```

2. Replace the content with this SSL configuration:

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

_If Nginx reports "unknown directive 'http2'" on version 1.25.1 or later, remove `http2` from each `listen` directive. Add `http2 on;` as a separate line inside the `server` block._

You can also run `sudo certbot --nginx` after obtaining the certificate. Certbot then attempts to configure Nginx automatically. Use the manual method above if you need more control.

### Verify Auto-Renewal

Certbot installs a timer for automatic renewal.

```bash
sudo systemctl status certbot.timer
```

---

### Regional subscription currency (BunnyCDN / Cloudflare)

BunnyCDN forwards the visitor's two-letter country to the origin in `CDN-RequestCountryCode`. The live site uses BunnyCDN, not Cloudflare, for its public requests. **Do not trust that request header directly in SvelteKit.** Requests can bypass the CDN or contain forged values.

The `scripts/setup-vps.sh` Nginx configuration (and `scripts/vps/nginx.sh`) maps country headers from verified BunnyCDN source IPs, with Cloudflare as an alternative. Nginx overwrites `X-Ace-Visitor-Country` and strips raw CDN country headers before proxying to the app. Pricing and checkout use that trusted header to select the matching Dodo subscription currency. The helper `scripts/vps/refresh-bunny-edges.sh` retrieves Bunny's official IPv4/IPv6 edge lists and is installed as `/usr/local/sbin/ace-refresh-bunny-edges`, with a daily refresh in `/etc/cron.d/ace-bunny-geo`. A failed update does not replace a previously working list.

After a code update, deploy **both the Nginx configuration and the SvelteKit build**. If you update only the app, the currency still defaults to USD. For manual deployments, copy the trusted edge-IP checks and header mapping from the setup script. Never forward unverified public request headers. Test an Italian visitor with `/get-pro` (expect EUR) and a matching `/checkout` session.

## 🚀 8. CDN Configuration (Optional - BunnyCDN)

If you use BunnyCDN or another CDN, follow these steps to prevent connection errors:

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

Configure the webhook URL in the **Dodo Payments Dashboard**:

1. Log in to Dodo Payments.
2. Go to **Developer > Webhooks**.
3. Add a new webhook with the URL: `https://aceblocker.com/api/auth/dodopayments/webhooks`
4. Copy the **Webhook Secret** and paste it into `.env` as `DODO_PAYMENTS_WEBHOOK_SECRET`.

---

## 💾 10. Database Backups (Crucial)

Schedule a daily backup of the PostgreSQL container. Make a consistent database
dump. Store an **off-site copy** so a server failure cannot destroy every backup.
Use **encryption at rest**.

> [!TIP]
> `setup-vps.sh` creates the local and Backblaze B2 backup pipeline. It can
> enable GPG encryption and installs the cron job. The following steps show how
> to configure and verify the same pipeline manually.

### 10a. Set up off-site storage (Backblaze B2)

The stated B2 free tier includes the first 10 GB of storage and free uploads
and transactions. Compressed database dumps can therefore cost nothing within
those limits.

1. In the B2 console, **create a bucket** (keep it **Private**). Note the exact name.
2. Optionally set a **Lifecycle rule** on the bucket to delete files after ~30 days
   (server-side retention backstop).
3. Go to **Application Keys** and create a key **scoped to that one bucket** with
   read & write access. Copy the **keyID** and the **applicationKey** (the secret is
   shown only once).
4. Under **Caps & Alerts**, set a low cap/alert so cost can't surprise you.

Install and configure `rclone` under the service user:

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
> Set `account` to the **keyID**, not the master Account ID. B2 rejects the
> master ID with HTTP 401. Bucket names are case-sensitive; preserve uppercase.

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
> Set `.env` permissions to `chmod 600`. Set `BACKUP_PASSPHRASE` to encrypt
> full database dumps before they leave the server. **Store the passphrase in
> a separate secure location. Without it, you cannot restore the backups.**
> If you omit the variable, uploads are unencrypted.

_(Check your actual container name with `docker ps` — it should be `ace-blocker-db`.)_

### 10c. Schedule it

```bash
chmod 700 ~/backups/backup_db.sh
crontab -e
# Add this line (logs each run so failures aren't silent):
0 3 * * * /home/aceblocker/backups/backup_db.sh >> /home/aceblocker/backups/backup.log 2>&1
```

### 10d. Verify before trusting it

Do not trust a backup until you test it. After setup, run the backup manually.
Confirm that the off-site copy appears in the B2 console:

```bash
sudo -u aceblocker /home/aceblocker/backups/backup_db.sh
gunzip -t ~/backups/db_*.sql.gz 2>/dev/null && echo "archive OK"   # if unencrypted
```

---

## 🔄 11. Maintenance & Updates

To deploy updated website code:

```bash
cd /home/aceblocker/ace-blocker-site
git pull
bun install
bun run build
bun run db:migrate
sudo systemctl restart ace-blocker
```

> [!TIP]
> To preserve local Compose changes, put them in `compose.override.yaml` instead of editing tracked `compose.yaml`. Docker Compose merges the two files. This lets `git pull` update the tracked file without conflicts from local changes.

---

## 📊 12. Logs & Monitoring

### View App Logs

The application runs as a systemd service. Read its logs with `journalctl`.

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

Set `ORIGIN` in `.env` to the exact domain, including `https://`. Verify that Nginx forwards `X-Forwarded-Proto`.

### Database Connection Issues

If the application cannot connect to PostgreSQL, verify that the Docker container is running:

```bash
docker ps
```

If the container is stopped, inspect logs with `docker compose logs`.

### Memory Issues (Low RAM VPS)

If the build fails or the application crashes on a 512 MB or 1 GB VPS, add swap:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Signed Pro entitlements

The desktop engine accepts only signed, API-key-bound Ed25519 leases. In development, `bun run setup` or `bun run gen:entitlement-keys` creates/reuses the dev pair under `~/.config/ace-blocker/dev-entitlement-keys` and adds both signing variables to `.env`. On VPS, `setup-vps.sh` → `setup-env.ts` (also used by `scripts/vps/app-service.sh`) creates/reuses a separate production pair under `~/.config/ace-blocker/entitlement-keys` and writes both values to the deployment `.env` (mode 0600). Keep valid existing values. Reject incomplete or mismatched pairs instead of rotating keys.

To generate a standalone pair on a trusted machine **outside the repository** without modifying `.env`, run:

```bash
bun run gen:entitlement-keys -- "$HOME/.config/ace-blocker/entitlement-keys"
```

The resulting `server-signing-private.b64` contains the PKCS#8 DER private key
encoded in base64. Put its **contents** into the backend secret
`ACE_ENTITLEMENT_SIGNING_KEY_BASE64`. Never print or commit this private key.

The `desktop-verification-public.b64` file contains the raw 32-byte public key
encoded in base64. Put its **contents** into the backend variable
`ACE_ENTITLEMENT_PUBLIC_KEY_BASE64` to check the key pair on the backend.
The engine obtains this public key from the authenticated
`GET /api/v1/account/entitlement` response at runtime and saves it with the
signed lease for offline verification. Neither development nor release builds need the key in Cargo or CI variables. Production must use HTTPS; key rotation
takes effect on the next authenticated license refresh without a desktop rebuild.

A lease lasts up to 24 hours; existing paid capabilities can continue offline
for up to another 72 hours when the server cannot be contacted. Already active
blocking protections stay enforced after downgrade, but enabling new Pro
capabilities is not allowed after expiration. No device limit is enforced.

**Pre-release billing policy:** Keep DodoPayments in `test_mode`, including when
`NODE_ENV=production`. Use test-mode Dodo credentials until the product changes
this policy explicitly.

### Signed desktop MSI updates (disabled until configured)

The server-side authenticated release workflow is documented in
[DESKTOP_UPDATES.md](DESKTOP_UPDATES.md). It is **off by default** and does
not use Better Auth, Pro licenses, payment status or tokenized CDN URLs for
public update discovery/download. The admin approval and private staging
Bunny zones are separate from legacy installer downloads.

Before production cutover, put only **public** Ed25519 verification keys on the
VPS. Keep the private signing key off the server. Configure a separate private
Bunny staging storage zone. Test direct anonymous HTTPS MSI downloads from the
public CDN. Apply the Drizzle migration with
`bun run db:migrate` using the site's existing migration process and
validate the schema before enabling `ACE_DESKTOP_UPDATES_ENABLED=true`.
Keep the legacy content updater untouched.

The CI ingest endpoint `POST /api/v1/releases/ingest/desktop` accepts
**only small JSON**, not MSI bytes. Configure Nginx/Cloudflare to cap its
request body to 16 KiB (e.g., an exact-match Nginx `location` with
`client_max_body_size 16k`) and to rate-limit authenticated ingest attempts.
Large MSI transfers must go directly from protected CI to private Bunny
storage. The server streams and verifies the remote object only at ingest
and promotion, never on user download. Refer to the linked document for
known v1 client compatibility and revocation limitations.
