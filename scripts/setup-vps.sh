#!/usr/bin/env bash
# =============================================================================
# Ace Blocker — VPS Setup Script
# =============================================================================
# Automates the full VPS deployment described in docs/DEPLOY.md.
#
# Usage:
#   sudo bash scripts/setup-vps.sh [--domain aceblocker.com] [--email admin@aceblocker.com]
#
# Optional:  --domain <domain>        (default: aceblocker.com)
#            --username <name>        (default: aceblocker)
#            --email <email>          --cf-token <token>  --docker-group
#            --b2-key-id <id>  --b2-app-key <key>  --b2-bucket <bucket>
#   If --cf-token is omitted, the script prompts for it during the SSL step.
#   If the B2 values are omitted, the script prompts for them during the backup
#   step; leave them blank there to set up local-only backups (no off-site copy).
#   B2 values may also be supplied via env: B2_KEY_ID, B2_APP_KEY, B2_BUCKET.
# =============================================================================

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────────────
RD='\033[0;31m'; GR='\033[0;32m'; YL='\033[1;33m'; BL='\033[0;34m'; B='\033[1m'; NC='\033[0m'
info()  { echo -e "${BL}[INFO]${NC}    $*"; }
ok()    { echo -e "${GR}[OK]${NC}      $*"; }
warn()  { echo -e "${YL}[WARN]${NC}    $*"; }
err()   { echo -e "${RD}[ERROR]${NC}   $*"; }
step()  { echo -e "\n${B}${BL}═══ $* ═══${NC}\n"; }

# ── Parse Arguments ─────────────────────────────────────────────────────────
DOMAIN="aceblocker.com"; USERNAME="aceblocker"; EMAIL=""; CF_TOKEN="${CF_TOKEN:-}"; DOCKER_GROUP=false
# Backblaze B2 (optional off-site backups). Can be supplied via flags or env.
B2_KEY_ID="${B2_KEY_ID:-}"; B2_APP_KEY="${B2_APP_KEY:-}"; B2_BUCKET="${B2_BUCKET:-}"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --domain)     DOMAIN="$2";  shift 2 ;;
        --username)   USERNAME="$2"; shift 2 ;;
        --email)      EMAIL="$2";   shift 2 ;;
        --cf-token)   CF_TOKEN="$2"; shift 2 ;;
        --docker-group) DOCKER_GROUP=true; shift ;;
        --b2-key-id)  B2_KEY_ID="$2"; shift 2 ;;
        --b2-app-key) B2_APP_KEY="$2"; shift 2 ;;
        --b2-bucket)  B2_BUCKET="$2"; shift 2 ;;
        --help)       sed -n '/^#/{/^#!/d;/^# =/d;p;}' "$0"; exit 0 ;;
        *) err "Unknown option: $1"; exit 1 ;;
    esac
done

APP_DIR="/home/${USERNAME}/ace-blocker-site"
BUN="/home/${USERNAME}/.bun/bin/bun"

# When the user is NOT in the docker group, their docker calls must go through
# the scoped sudo rule. This prefix is injected into commands run as the user.
if [[ "$DOCKER_GROUP" == true ]]; then
    DOCKER_PREFIX=""
else
    DOCKER_PREFIX="sudo "
fi

# ── Pre-flight ──────────────────────────────────────────────────────────────
echo -e "\n${B}${BL}┌──────────────────────────────────────────────────────┐${NC}"
echo -e   "${B}${BL}│${NC}  Ace Blocker VPS Setup"
echo -e   "${B}${BL}└──────────────────────────────────────────────────────┘${NC}\n"

[[ -z "$DOMAIN" ]] && { err "Domain resolved empty (default is aceblocker.com; pass --domain to override)."; exit 1; }
[[ "$EUID" -ne 0 ]] && { err "Run as root (use sudo)."; exit 1; }
info "Domain: ${DOMAIN}   User: ${USERNAME}   App: ${APP_DIR}"

# ── 1. System Updates & Base Packages ───────────────────────────────────────
step "1. System Updates & Base Packages"
# Note: 'apt upgrade -y' runs on every invocation. On a fresh box this is what
# you want; on re-runs it will pull the latest packages too. If you need
# reproducible re-runs, pin versions or gate this behind a first-run check.
apt update -qq && apt upgrade -y -qq
apt install -y -qq curl git ufw nginx unzip gnupg
ok "System updated."

# ── 2. User Setup ───────────────────────────────────────────────────────────
step "2. User Setup"
if ! id "$USERNAME" &>/dev/null; then
    adduser --disabled-password --gecos "" "$USERNAME"
fi
usermod -aG sudo "$USERNAME" 2>/dev/null || true

# Grant sudo. We deliberately DO NOT use 'NOPASSWD: ALL' — that makes the
# service account root-equivalent, so any app/SSH/dependency compromise becomes
# instant root. Instead:
#   - General sudo requires the user's password (set below).
#   - Only the handful of commands 'bun run setup' actually needs are NOPASSWD,
#     and they are pinned to absolute paths so they can't be shadowed by a
#     malicious binary earlier on PATH.
# If 'bun run setup' does not actually need passwordless sudo at runtime, you can
# delete the NOPASSWD block entirely and run setup steps as root from this script.
SUDOERS_FILE="/etc/sudoers.d/${USERNAME}"
if [[ ! -f "$SUDOERS_FILE" ]]; then
    APT_BIN="$(command -v apt || echo /usr/bin/apt)"
    APTGET_BIN="$(command -v apt-get || echo /usr/bin/apt-get)"
    DOCKER_BIN="$(command -v docker || echo /usr/bin/docker)"
    SYSTEMCTL_BIN="$(command -v systemctl || echo /usr/bin/systemctl)"
    cat > "$SUDOERS_FILE" << SUDOERS
# General sudo for ${USERNAME} requires a password.
${USERNAME} ALL=(ALL) ALL
# Narrow exceptions needed by 'bun run setup' (passwordless, pinned paths).
${USERNAME} ALL=(ALL) NOPASSWD: ${APT_BIN}, ${APTGET_BIN}, ${DOCKER_BIN}, ${SYSTEMCTL_BIN}
SUDOERS
    chmod 440 "$SUDOERS_FILE"
    # Validate syntax; a broken sudoers file can lock out sudo entirely.
    if ! visudo -cf "$SUDOERS_FILE" >/dev/null 2>&1; then
        err "Generated sudoers file failed validation — removing it."
        rm -f "$SUDOERS_FILE"
        exit 1
    fi
    ok "Scoped sudo granted for ${USERNAME} (password required except for setup commands)."
fi

SSH_KEY_OK=false
if [[ -f /root/.ssh/authorized_keys ]] && [[ -s /root/.ssh/authorized_keys ]]; then
    mkdir -p "/home/${USERNAME}/.ssh"
    cp /root/.ssh/authorized_keys "/home/${USERNAME}/.ssh/"
    chown -R "${USERNAME}:${USERNAME}" "/home/${USERNAME}/.ssh"
    chmod 700 "/home/${USERNAME}/.ssh"
    chmod 600 "/home/${USERNAME}/.ssh/authorized_keys"
    # Confirm the destination is actually populated before we trust it.
    if [[ -s "/home/${USERNAME}/.ssh/authorized_keys" ]]; then
        SSH_KEY_OK=true
        ok "SSH keys copied to ${USERNAME}."
    else
        warn "authorized_keys copy ended up empty for ${USERNAME}."
    fi
else
    warn "No (non-empty) SSH keys found in /root/.ssh/. Set up SSH keys manually."
fi

# Set a password for the user (was created with --disabled-password above).
# This password is NOT used for SSH (PasswordAuthentication is disabled in the
# hardening step). It IS used for 'sudo' and for console/recovery login, so it
# is no longer dead weight — choose a strong one.
echo ""
while true; do
    read -rsp "  Set password for ${USERNAME}: " USER_PASS
    echo ""
    read -rsp "  Confirm password: " USER_PASS_CONFIRM
    echo ""
    if [[ "$USER_PASS" != "$USER_PASS_CONFIRM" ]]; then
        warn "Passwords do not match. Try again."
    elif [[ -z "$USER_PASS" ]]; then
        warn "Password cannot be empty."
    else
        echo "${USERNAME}:${USER_PASS}" | chpasswd
        ok "Password set for ${USERNAME}."
        break
    fi
done
unset USER_PASS USER_PASS_CONFIRM

# ── 3. SSH Hardening ────────────────────────────────────────────────────────
step "3. SSH Hardening"
SSHD="/etc/ssh/sshd_config"
if ! grep -q "^PermitRootLogin no" "$SSHD" 2>/dev/null; then
    # SAFETY: disabling PasswordAuthentication + PermitRootLogin with no working
    # key is a guaranteed lockout. Only proceed if a key is confirmed present.
    if [[ "$SSH_KEY_OK" != true ]]; then
        warn "No verified SSH key for ${USERNAME}; SKIPPING SSH hardening to avoid lockout."
        warn "Add a key to /home/${USERNAME}/.ssh/authorized_keys, confirm you can log in,"
        warn "then re-run this script (or harden sshd manually)."
    else
        cp "$SSHD" "${SSHD}.bak.$(date +%Y%m%d%H%M%S)"
        for key in PermitRootLogin PasswordAuthentication PermitEmptyPasswords \
                   MaxAuthTries MaxStartups ClientAliveInterval ClientAliveCountMax \
                   X11Forwarding AllowUsers; do
            sed -i "/^#\{0,1\}${key} /d" "$SSHD"
        done
        cat >> "$SSHD" << EOF
PermitRootLogin no
PasswordAuthentication no
PermitEmptyPasswords no
MaxAuthTries 3
MaxStartups 3:50:10
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
AllowUsers ${USERNAME}
EOF
        # Validate before applying; a bad config + restart can drop sshd entirely.
        if sshd -t 2>/dev/null; then
            # reload keeps existing connections alive if the new config is faulty
            # in a way -t didn't catch; restart would kill your current session.
            systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null \
                || systemctl restart ssh
            ok "SSH hardened. (Keep this session open and test a NEW login before closing it.)"
        else
            err "sshd config validation failed — reverting to backup."
            cp "${SSHD}.bak."* "$SSHD" 2>/dev/null || true
            exit 1
        fi
    fi
else
    info "SSH already hardened."
fi

# ── 4. Firewall ─────────────────────────────────────────────────────────────
step "4. Firewall (UFW)"
if ufw status | grep -q "active" && ufw status | grep -q "Nginx Full"; then
    info "UFW already configured."
else
    ufw --force reset >/dev/null 2>&1
    ufw limit OpenSSH
    ufw allow 'Nginx Full'
    ufw allow 443/udp
    ufw --force enable
    ok "UFW enabled."
fi

# ── 5. Fail2Ban ─────────────────────────────────────────────────────────────
step "5. Fail2Ban"
if ! dpkg -l fail2ban &>/dev/null; then
    apt install -y -qq fail2ban
    systemctl enable --now fail2ban
    ok "Fail2Ban running."
else
    info "Fail2Ban already installed."
fi

# ── 6. Automatic Security Updates ───────────────────────────────────────────
step "6. Automatic Security Updates"
if ! dpkg -l unattended-upgrades &>/dev/null; then
    apt install -y -qq unattended-upgrades
    cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF
    ok "Unattended upgrades configured."
else
    info "Unattended upgrades already installed."
fi

# ── 7. Docker ───────────────────────────────────────────────────────────────
step "7. Docker"
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh && rm /tmp/get-docker.sh
    ok "Docker installed."
else
    info "Docker already installed."
fi
if [[ "$DOCKER_GROUP" == true ]]; then
    # NOTE: docker group membership is effectively root (a container can mount
    # the host fs as root). Only enabled because you passed --docker-group.
    usermod -aG docker "$USERNAME" 2>/dev/null || true
    warn "${USERNAME} added to 'docker' group — this is root-equivalent access."
else
    info "Not adding ${USERNAME} to 'docker' group (root-equivalent). Docker commands"
    info "in setup run via the scoped sudo rule. Pass --docker-group to override."
fi
systemctl start docker 2>/dev/null || true

# ── 8. Bun ──────────────────────────────────────────────────────────────────
step "8. Bun"
if [[ ! -x "$BUN" ]]; then
    su - "$USERNAME" -c "curl -fsSL https://bun.sh/install | bash"
    ok "Bun installed."
else
    info "Bun already installed: $($BUN --version 2>/dev/null || echo '?')"
fi

# ── 9. Clone Repository ─────────────────────────────────────────────────────
step "9. Clone Repository"

REPO_URL="https://github.com/Linea-Software/ace-blocker-site.git"

# SECURITY NOTE on repo auth:
# The most secure option for a private repo is a read-only DEPLOY KEY (an SSH
# key registered to this one repo). To use it: drop the key at
# /home/${USERNAME}/.ssh/id_ed25519, set REPO_URL to the git@github.com: form,
# and skip the token prompt below. The token path here is a convenience
# fallback. We deliberately do NOT write the token to ~/.git-credentials in
# plaintext, and we do NOT persist it into .git/config. Within a single run we
# pass it inline only for the operations that need it, then unset it.
CRED_FILE="/home/${USERNAME}/.git-credentials"
# Make sure no persistent helper is configured and remove any stale plaintext
# credential file left by previous versions of this script.
su - "$USERNAME" -c "git config --global --unset-all credential.helper 2>/dev/null; true"
rm -f "$CRED_FILE"

# Helper: prompt for GitHub credentials
prompt_github_auth() {
    echo ""
    info "GitHub authentication required for the private repository."
    info "Tip: a read-only deploy key avoids storing any token. See note above."
    read -rp "  GitHub username: " GH_USER
    read -rsp "  GitHub token (classic or fine-grained, scoped to this repo): " GH_TOKEN
    echo ""
    if [[ -z "$GH_USER" || -z "$GH_TOKEN" ]]; then
        err "GitHub username and token are required."
        exit 1
    fi
}

if [[ ! -d "${APP_DIR}/.git" ]]; then
    prompt_github_auth

    # Clone with an inline token URL, then immediately reset the remote to the
    # clean URL so the token is never written into .git/config on disk.
    AUTH_URL="https://${GH_USER}:${GH_TOKEN}@github.com/Linea-Software/ace-blocker-site.git"
    su - "$USERNAME" -c "git clone '${AUTH_URL}' ${APP_DIR}"
    su - "$USERNAME" -c "cd ${APP_DIR} && git remote set-url origin ${REPO_URL}"
    ok "Repository cloned (token not persisted to disk)."
else
    # Try an unauthenticated/cached pull first; if it fails, prompt and pull once
    # using an inline token URL without persisting anything.
    if su - "$USERNAME" -c "cd ${APP_DIR} && git pull" 2>/dev/null; then
        ok "Repository updated."
    else
        prompt_github_auth
        AUTH_URL="https://${GH_USER}:${GH_TOKEN}@github.com/Linea-Software/ace-blocker-site.git"
        su - "$USERNAME" -c "cd ${APP_DIR} && git pull '${AUTH_URL}'"
        ok "Repository updated (token not persisted to disk)."
    fi
fi

# Clear token from memory
unset GH_USER GH_TOKEN AUTH_URL

# ── 10. Install Dependencies & Run Setup ────────────────────────────────────
step "10. Dependencies & Setup"
su - "$USERNAME" -c "cd ${APP_DIR} && ${BUN} install"
su - "$USERNAME" -c "cd ${APP_DIR} && ${BUN} run setup"
ok "Dependencies installed, setup complete."

# ── 11. Production Environment Variables ────────────────────────────────────
step "11. Environment Variables"
ENV_FILE="${APP_DIR}/.env"
[[ -f "$ENV_FILE" ]] || { err ".env missing at ${ENV_FILE}"; exit 1; }

# Delegate .env configuration to Bun (handles prompts, derivation, and validation)
su - "$USERNAME" -c "cd ${APP_DIR} && ${BUN} run setup-env -- --domain ${DOMAIN} --env-file ${ENV_FILE}"

# ── Recreate Docker container with updated .env credentials ──
# (The DB container was started in step 10 with dev defaults, but .env has now
#  been reconfigured with production values. Postgres only reads POSTGRES_PASSWORD
#  on first init of the data dir, so we must destroy the old volume and restart.)
su - "$USERNAME" -c "cd ${APP_DIR} && ${DOCKER_PREFIX}docker compose down -v"
su - "$USERNAME" -c "cd ${APP_DIR} && ${DOCKER_PREFIX}docker compose up -d"
info "Waiting 5s for database to become ready..."
sleep 5

# Re-run migrations on the fresh database
su - "$USERNAME" -c "cd ${APP_DIR} && ${BUN} run db:migrate"

# ── Finalize ──
chmod 600 "$ENV_FILE"
chown "${USERNAME}:${USERNAME}" "$ENV_FILE"
echo ""
ok "Environment configured and saved to ${ENV_FILE}"

# ── 12. Build ───────────────────────────────────────────────────────────────
step "12. Build Application"
su - "$USERNAME" -c "cd ${APP_DIR} && ${BUN} run build"
if [[ -f "${APP_DIR}/build/index.js" ]]; then
    ok "Build complete."
else
    warn "Build output not at expected path. Adapt ExecStart in systemd unit if needed."
fi

# ── 13. Systemd Service ─────────────────────────────────────────────────────
step "13. Systemd Service"
cat > /etc/systemd/system/ace-blocker.service << UNIT
[Unit]
Description=Ace Blocker SvelteKit App
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=${USERNAME}
Group=${USERNAME}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=${BUN} ${APP_DIR}/build/index.js
Restart=always
RestartSec=10

# Bun's Node-compat layer doesn't forward SIGTERM to server.close().
# SIGINT is handled natively by Bun (closes HTTP server cleanly).
KillSignal=SIGINT
TimeoutStopSec=15
SendSIGKILL=yes

NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=${APP_DIR}
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
UNIT

systemctl daemon-reload
systemctl enable --now ace-blocker
sleep 3
if systemctl is-active --quiet ace-blocker; then
    ok "Service is running."
else
    err "Service failed to start. Check: journalctl -u ace-blocker -n 50"
fi

# ── 14. Nginx Configuration ──────────────────────────────────────────────
step "14. Nginx Configuration"
SITE="/etc/nginx/sites-available/ace-blocker"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

if [[ -d "$CERT_DIR" ]]; then
    # Certs already exist — write full SSL config immediately
    info "SSL certificates found — writing HTTPS configuration."
    cat > "$SITE" << SSLNGX
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate         ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key     ${CERT_DIR}/privkey.pem;
    ssl_trusted_certificate ${CERT_DIR}/chain.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    client_max_body_size 30m;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
SSLNGX
    SSL_SKIP=true
else
    # No certs yet — write HTTP-only so Certbot can work
    info "No SSL certificates yet — writing HTTP-only configuration."
    cat > "$SITE" << NGX
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGX
    SSL_SKIP=false
fi

mkdir -p /var/www/html
rm -f /etc/nginx/sites-enabled/default
ln -sf "$SITE" /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
ok "Nginx configured."
# ── 15. SSL Certificate (Cloudflare DNS Challenge) ──────────────────────────
step "15. SSL Certificate"

if [[ "$SSL_SKIP" == "true" ]]; then
    info "SSL already configured (skipped)."
else
    echo ""
    info "A Cloudflare API token is required to obtain an SSL certificate"
    info "via DNS challenge (required when using Cloudflare proxying)."
    info "The token needs Zone:DNS:Edit permission scoped to your domain."
    echo ""

    # Use existing token if passed via --cf-token, otherwise prompt
    if [[ -z "$CF_TOKEN" ]]; then
        read -rsp "  Cloudflare API token: " CF_TOKEN
        echo ""
        if [[ -z "$CF_TOKEN" ]]; then
            err "Cloudflare API token is required for SSL."
            err "Run the script again with --cf-token or paste the token above."
            exit 1
        fi
    fi

    apt install -y -qq certbot python3-certbot-dns-cloudflare

    # This token lives on disk at /root/.cloudflare.ini (chmod 600) because
    # certbot's automatic renewal needs it. Scope it to Zone:DNS:Edit on ONLY
    # this domain's zone — never an account-wide token — so a leak is contained.
    CF_INI="/root/.cloudflare.ini"
    cat > "$CF_INI" <<< "dns_cloudflare_api_token = ${CF_TOKEN}"
    chmod 600 "$CF_INI"

    EMAIL_ARG=""
    [[ -n "$EMAIL" ]] && EMAIL_ARG="--email ${EMAIL}"

    if [[ -z "$EMAIL" ]]; then
        warn "No --email provided. Certbot requires an email for non-interactive registration."
        read -rp "  Email for Let's Encrypt registration: " EMAIL
        [[ -z "$EMAIL" ]] && { err "Email is required for SSL certificate."; exit 1; }
        EMAIL_ARG="--email ${EMAIL}"
    fi

    info "Requesting SSL certificate for ${DOMAIN} and *.${DOMAIN}..."
    certbot certonly --non-interactive --agree-tos \
        --dns-cloudflare --dns-cloudflare-credentials "$CF_INI" \
        $EMAIL_ARG \
        -d "${DOMAIN}" -d "*.${DOMAIN}" || {
        err "Certbot failed. Check the Cloudflare token and try:\n         sudo certbot certificates\n         sudo certbot renew --dry-run"
        exit 1
    }
    ok "SSL certificate obtained."
fi
# ── 16. Update Nginx with SSL ───────────────────────────────────────────────
step "16. Nginx SSL Configuration"

if [[ "$SSL_SKIP" == "true" ]]; then
    info "SSL Nginx config already applied (skipped)."
else
    cat > "$SITE" << NGXSSL
# ── HTTP → HTTPS redirect ──
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# ── HTTPS ──
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate         /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key     /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/${DOMAIN}/chain.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    client_max_body_size 30m;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGXSSL

    nginx -t && systemctl restart nginx
    ok "Nginx SSL configuration applied."
fi

# ── 17. Database Backups ────────────────────────────────────────────────────
step "17. Database Backups"

BACKUP_DIR_HOST="/home/${USERNAME}/backups"
BACKUP_SCRIPT="${BACKUP_DIR_HOST}/backup_db.sh"
mkdir -p "$BACKUP_DIR_HOST"

# ── Backblaze B2 (optional off-site copy) ──
# Prompt for credentials if not already supplied via flags/env. Leaving the
# Key ID blank disables the off-site copy and sets up LOCAL-ONLY backups.
echo ""
info "Off-site backups to Backblaze B2 (recommended). A backup that only lives"
info "on this server is lost if the server is. You need a B2 'application key'"
info "(Key ID + Application Key) scoped to one bucket, plus the bucket name."
info "Create one at: B2 Cloud Storage → Application Keys. Leave blank to skip."
echo ""

if [[ -z "$B2_KEY_ID" ]]; then
    read -rp "  B2 Key ID (blank = local-only backups): " B2_KEY_ID
fi
if [[ -n "$B2_KEY_ID" ]]; then
    if [[ -z "$B2_APP_KEY" ]]; then
        read -rsp "  B2 Application Key: " B2_APP_KEY; echo ""
    fi
    if [[ -z "$B2_BUCKET" ]]; then
        read -rp "  B2 Bucket name: " B2_BUCKET
    fi
    if [[ -z "$B2_APP_KEY" || -z "$B2_BUCKET" ]]; then
        err "B2 Application Key and Bucket are required when a Key ID is given."
        exit 1
    fi
fi

B2_ENABLED=false
if [[ -n "$B2_KEY_ID" ]]; then
    B2_ENABLED=true

    # Install rclone (official static install; falls back to apt if curl blocked).
    if ! command -v rclone &>/dev/null; then
        info "Installing rclone..."
        curl -fsSL https://rclone.org/install.sh | bash \
            || apt install -y -qq rclone \
            || { err "rclone install failed."; exit 1; }
    fi

    # Write rclone config as the service user (secrets live here, chmod 600).
    # rclone obscures the app key in its own config format.
    RCLONE_DIR="/home/${USERNAME}/.config/rclone"
    mkdir -p "$RCLONE_DIR"
    OBSCURED_KEY="$(rclone obscure "$B2_APP_KEY")"
    cat > "${RCLONE_DIR}/rclone.conf" << RCLONECONF
[b2backup]
type = b2
account = ${B2_KEY_ID}
key = ${OBSCURED_KEY}
RCLONECONF
    chmod 700 "$RCLONE_DIR"
    chmod 600 "${RCLONE_DIR}/rclone.conf"
    chown -R "${USERNAME}:${USERNAME}" "/home/${USERNAME}/.config"

    # Verify the bucket is reachable with these credentials before relying on it.
    if su - "$USERNAME" -c "rclone lsd 'b2backup:${B2_BUCKET}'" &>/dev/null; then
        ok "B2 bucket '${B2_BUCKET}' reachable — off-site backups enabled."
    else
        warn "Could not reach B2 bucket '${B2_BUCKET}' with the given key."
        warn "Backups will still run locally; fix the key/bucket and re-run to enable off-site."
        B2_ENABLED=false
    fi
fi

# Clear B2 secrets from this script's memory.
unset B2_APP_KEY OBSCURED_KEY

# ── Backup script ──
cat > "$BACKUP_SCRIPT" << 'BACKUPSCRIPT'
#!/bin/bash
set -euo pipefail
umask 077  # backups readable only by owner

# Safely load only the vars we need, WITHOUT executing the .env as shell.
# Using 'source' breaks (and is a minor injection risk) when a secret contains
# characters like '$', backticks, or spaces; under 'set -u' a '$VAR' inside a
# password aborts the whole script. This reads KEY=VALUE literally instead,
# matching how systemd's EnvironmentFile parses the same file for the app.
ENV_FILE="/home/REPLACE_USER/ace-blocker-site/.env"
while IFS='=' read -r _k _v; do
    case "$_k" in
        POSTGRES_USER|POSTGRES_DB|POSTGRES_PASSWORD|BACKUP_PASSPHRASE)
            _v="${_v%\"}"; _v="${_v#\"}"; _v="${_v%\'}"; _v="${_v#\'}"
            printf -v "$_k" '%s' "$_v"
            ;;
    esac
done < "$ENV_FILE"
# Provide safe defaults so 'set -u' doesn't abort on optional/missing vars.
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-aceblocker}"
BACKUP_PASSPHRASE="${BACKUP_PASSPHRASE:-}"
if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
    echo "ERROR: POSTGRES_PASSWORD not found in ${ENV_FILE}" >&2
    exit 1
fi

BACKUP_DIR="/home/REPLACE_USER/backups"
BACKUP_PATH="${BACKUP_DIR}/db_$(date +%Y%m%d_%H%M%S).sql"

# 1. Dump the database from the running container.
REPLACE_DOCKER_PREFIXdocker exec -e PGPASSWORD="$POSTGRES_PASSWORD" ace-blocker-db \
    pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-aceblocker}" > "$BACKUP_PATH"
gzip "$BACKUP_PATH"

# 2. Encrypt at rest if BACKUP_PASSPHRASE is set in .env. Requires 'gpg'.
if [[ -n "${BACKUP_PASSPHRASE:-}" ]] && command -v gpg >/dev/null 2>&1; then
    gpg --batch --yes --pinentry-mode loopback \
        --passphrase "$BACKUP_PASSPHRASE" \
        -c "${BACKUP_PATH}.gz"
    rm -f "${BACKUP_PATH}.gz"
    EXT="sql.gz.gpg"
    FINAL="${BACKUP_PATH}.gz.gpg"
else
    EXT="sql.gz"
    FINAL="${BACKUP_PATH}.gz"
fi

# 3. Off-site copy to Backblaze B2 (only if configured at setup time).
B2_BUCKET="REPLACE_B2_BUCKET"
if [[ -n "$B2_BUCKET" ]] && command -v rclone >/dev/null 2>&1; then
    if rclone copy "$FINAL" "b2backup:${B2_BUCKET}/db-backups/"; then
        echo "Off-site copy uploaded to b2backup:${B2_BUCKET}/db-backups/"
        # Prune remote copies older than 30 days. --b2-hard-delete actually
        # removes them (B2 otherwise just hides old versions, which keep
        # accruing storage). For belt-and-suspenders, also set a Lifecycle rule
        # on the bucket in the B2 console.
        rclone delete --b2-hard-delete --fast-list --min-age 30d \
            "b2backup:${B2_BUCKET}/db-backups/" || true
    else
        echo "WARNING: off-site upload to B2 failed (local backup retained)." >&2
        exit 1
    fi
fi

# 4. Local retention: keep 7 days locally.
find "$BACKUP_DIR" -type f -name "*.${EXT}" -mtime +7 -delete
echo "Backup completed: ${FINAL}"
BACKUPSCRIPT

sed -i "s/REPLACE_USER/${USERNAME}/g" "$BACKUP_SCRIPT"
sed -i "s/REPLACE_DOCKER_PREFIX/${DOCKER_PREFIX}/g" "$BACKUP_SCRIPT"
# Inject the bucket name only if B2 was successfully enabled; otherwise leave it
# empty so the upload block is skipped and backups stay local-only.
if [[ "$B2_ENABLED" == true ]]; then
    sed -i "s/REPLACE_B2_BUCKET/${B2_BUCKET}/g" "$BACKUP_SCRIPT"
else
    sed -i "s/REPLACE_B2_BUCKET//g" "$BACKUP_SCRIPT"
fi
chmod 700 "$BACKUP_SCRIPT"
chmod 700 "$BACKUP_DIR_HOST"
chown -R "${USERNAME}:${USERNAME}" "$BACKUP_DIR_HOST"

# Add cron job if not already present
if ! crontab -u "$USERNAME" -l 2>/dev/null | grep -q "backup_db"; then
    (crontab -u "$USERNAME" -l 2>/dev/null || true
     echo "0 3 * * * ${BACKUP_SCRIPT} >> ${BACKUP_DIR_HOST}/backup.log 2>&1") | crontab -u "$USERNAME" -
    ok "Daily backup cron job added (runs at 3 AM, logs to ${BACKUP_DIR_HOST}/backup.log)."
else
    info "Backup cron job already exists."
fi

if [[ "$B2_ENABLED" == true ]]; then
    ok "Backups: local (7-day) + Backblaze B2 off-site (30-day)."
else
    warn "Backups are LOCAL-ONLY. Re-run with --b2-key-id/--b2-app-key/--b2-bucket"
    warn "to enable off-site copies, or a disk/server loss will lose your backups."
fi

# ── 18. Permissions & Final Checks ──────────────────────────────────────────
step "18. Final Verification"

CHECKS_PASSED=true

check() {
    if eval "$1" &>/dev/null; then
        ok "$2"
    else
        err "$2"
        CHECKS_PASSED=false
    fi
}

check "systemctl is-active --quiet docker"          "Docker is running"
check "systemctl is-active --quiet nginx"            "Nginx is running"
check "systemctl is-active --quiet ace-blocker"      "Ace Blocker service is running"
check "systemctl is-active --quiet fail2ban"         "Fail2Ban is running"
check "ufw status | grep -q active"                  "Firewall is active"
check "docker ps | grep -q ace-blocker-db"           "Database container is running"
check "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 | grep -q '2..\|3..'" \
                                                     "App is responding on port 3000"

echo ""
if [[ -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
    check "curl -s -o /dev/null -w '%{http_code}' https://${DOMAIN} | grep -q '2..\|3..'" \
                                                     "HTTPS is accessible at https://${DOMAIN}"
fi

# ── Done ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${B}${GR}┌──────────────────────────────────────────────────────┐${NC}"
echo -e "${B}${GR}│${NC}  Setup Complete!                                    "
echo -e "${B}${GR}│${NC}  Site: https://${DOMAIN}"
echo -e "${B}${GR}│${NC}  Logs: sudo journalctl -u ace-blocker -f            "
echo -e "${B}${GR}│${NC}  DB:   docker compose -f ${APP_DIR}/compose.yaml logs "
echo -e "${B}${GR}└──────────────────────────────────────────────────────┘${NC}"

if [[ "$CHECKS_PASSED" != true ]]; then
    echo -e "\n${YL}Some checks failed. Review the errors above.${NC}"
    exit 1
fi
