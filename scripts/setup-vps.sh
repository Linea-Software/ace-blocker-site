#!/usr/bin/env bash
# =============================================================================
# Ace Blocker — VPS Setup Script
# =============================================================================
# Automates the full VPS deployment described in docs/DEPLOY.md.
#
# Usage:
#   export CF_TOKEN="your-cloudflare-token"
#   sudo bash scripts/setup-vps.sh --domain aceblocker.com [--email admin@aceblocker.com]
#
# Required:  --domain <domain>
# Optional:  --username <name> --email <email> --cf-token <token>
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
DOMAIN=""; USERNAME="aceblocker"; EMAIL=""; CF_TOKEN="${CF_TOKEN:-}"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --domain)   DOMAIN="$2";  shift 2 ;;
        --username) USERNAME="$2"; shift 2 ;;
        --email)    EMAIL="$2";   shift 2 ;;
        --cf-token) CF_TOKEN="$2"; shift 2 ;;
        --help)     sed -n '/^#/{/^#!/d;/^# =/d;p;}' "$0"; exit 0 ;;
        *) err "Unknown option: $1"; exit 1 ;;
    esac
done

APP_DIR="/home/${USERNAME}/ace-blocker-site"
BUN="/home/${USERNAME}/.bun/bin/bun"

# ── Pre-flight ──────────────────────────────────────────────────────────────
echo -e "\n${B}${BL}┌──────────────────────────────────────────────────────┐${NC}"
echo -e   "${B}${BL}│${NC}  Ace Blocker VPS Setup"
echo -e   "${B}${BL}└──────────────────────────────────────────────────────┘${NC}\n"

[[ -z "$DOMAIN" ]] && { err "--domain is required."; exit 1; }
[[ "$EUID" -ne 0 ]] && { err "Run as root (use sudo)."; exit 1; }
info "Domain: ${DOMAIN}   User: ${USERNAME}   App: ${APP_DIR}"

# ── 1. System Updates & Base Packages ───────────────────────────────────────
step "1. System Updates & Base Packages"
apt update -qq && apt upgrade -y -qq
apt install -y -qq curl git ufw nginx unzip
ok "System updated."

# ── 2. User Setup ───────────────────────────────────────────────────────────
step "2. User Setup"
if ! id "$USERNAME" &>/dev/null; then
    adduser --disabled-password --gecos "" "$USERNAME"
fi
usermod -aG sudo "$USERNAME" 2>/dev/null || true

if [[ -f /root/.ssh/authorized_keys ]]; then
    mkdir -p "/home/${USERNAME}/.ssh"
    cp /root/.ssh/authorized_keys "/home/${USERNAME}/.ssh/"
    chown -R "${USERNAME}:${USERNAME}" "/home/${USERNAME}/.ssh"
    chmod 700 "/home/${USERNAME}/.ssh"
    chmod 600 "/home/${USERNAME}/.ssh/authorized_keys"
    ok "SSH keys copied to ${USERNAME}."
else
    warn "No SSH keys found in /root/.ssh/. Set up SSH keys manually."
fi

# ── 3. SSH Hardening ────────────────────────────────────────────────────────
step "3. SSH Hardening"
SSHD="/etc/ssh/sshd_config"
if ! grep -q "^PermitRootLogin no" "$SSHD" 2>/dev/null; then
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
ClientAliveCountMax 0
X11Forwarding no
AllowUsers ${USERNAME}
EOF
    systemctl restart ssh
    ok "SSH hardened."
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
usermod -aG docker "$USERNAME" 2>/dev/null || true
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

REPO_URL="https://github.com/aintDatCap/ace-blocker-site.git"

# Configure git credential.helper to use file-based store on disk
# (libsecret requires D-Bus which is not available on headless servers)
CRED_FILE="/home/${USERNAME}/.git-credentials"
su - "$USERNAME" -c "git config --global --unset-all credential.helper 2>/dev/null; true"
su - "$USERNAME" -c "git config --global credential.helper 'store --file ${CRED_FILE}'"
su - "$USERNAME" -c "git config --global --add credential.helper 'cache --timeout 7200'"

# Helper: prompt for GitHub credentials
prompt_github_auth() {
    echo ""
    info "GitHub authentication required for the private repository."
    read -rp "  GitHub username: " GH_USER
    read -rsp "  GitHub token (classic or fine-grained): " GH_TOKEN
    echo ""
    if [[ -z "$GH_USER" || -z "$GH_TOKEN" ]]; then
        err "GitHub username and token are required."
        exit 1
    fi
}

if [[ ! -d "${APP_DIR}/.git" ]]; then
    prompt_github_auth

    AUTH_URL="https://${GH_USER}:${GH_TOKEN}@github.com/aintDatCap/ace-blocker-site.git"
    su - "$USERNAME" -c "git clone '${AUTH_URL}' ${APP_DIR}"

    # Reset remote to clean URL (no token in git config)
    su - "$USERNAME" -c "cd ${APP_DIR} && git remote set-url origin ${REPO_URL}"

    # Store the credential in the file for future pulls
    echo "https://${GH_USER}:${GH_TOKEN}@github.com" > "$CRED_FILE"
    chmod 600 "$CRED_FILE"
    chown "${USERNAME}:${USERNAME}" "$CRED_FILE"

    ok "Repository cloned (credentials saved)."
else
    # Try pulling with cached credentials first
    if su - "$USERNAME" -c "cd ${APP_DIR} && git pull" 2>/dev/null; then
        ok "Repository updated (using cached credentials)."
    else
        # Cached credentials missing or expired — prompt for new ones
        prompt_github_auth

        # Write credential directly to the store file
        echo "https://${GH_USER}:${GH_TOKEN}@github.com" > "$CRED_FILE"
        chmod 600 "$CRED_FILE"
        chown "${USERNAME}:${USERNAME}" "$CRED_FILE"

        su - "$USERNAME" -c "cd ${APP_DIR} && git pull"
        ok "Repository updated."
    fi
fi

# Clear token from memory
unset GH_USER GH_TOKEN

# ── 10. Install Dependencies & Run Setup ────────────────────────────────────
step "10. Dependencies & Setup"
su - "$USERNAME" -c "cd ${APP_DIR} && ${BUN} install"
su - "$USERNAME" -c "cd ${APP_DIR} && ${BUN} run setup"
ok "Dependencies installed, setup complete."

# ── 11. Production Environment Variables ────────────────────────────────────
step "11. Environment Variables"
ENV_FILE="${APP_DIR}/.env"
[[ -f "$ENV_FILE" ]] || { err ".env missing at ${ENV_FILE}"; exit 1; }

# Core helper: set a value directly (no prompt)
set_env() {
    local k="$1" v="$2"
    if grep -q "^${k}=" "$ENV_FILE"; then
        sed -i "s|^${k}=.*|${k}=${v}|" "$ENV_FILE"
    else
        echo "${k}=${v}" >> "$ENV_FILE"
    fi
}

# Interactive helper: read current value and prompt for a new one
prompt_env() {
    local key="$1" prompt="$2" default="$3" is_secret="${4:-false}"
    local current_val
    current_val=$(grep -oP "^${key}=\"?\K[^\"]*" "$ENV_FILE" 2>/dev/null | tr -d '"' || true)
    [[ -n "$current_val" ]] && default="$current_val"

    if [[ "$is_secret" == "true" ]] && [[ -n "$current_val" ]]; then
        echo -e "  ${YL}${prompt}${NC} ${BL}[***** existing value]${NC}"
    else
        echo -e "  ${YL}${prompt}${NC}"
    fi

    local display_default="$default"
    [[ "$is_secret" == "true" && -n "$default" ]] && display_default="*****"
    [[ -n "$display_default" ]] && echo -e "  ${BL}[default: ${display_default}]${NC}"

    local input
    read -rp "  > " input
    [[ -z "$input" ]] && input="$default"

    if grep -q "^${key}=" "$ENV_FILE"; then
        sed -i "s|^${key}=.*|${key}=\"${input}\"|" "$ENV_FILE"
    else
        echo "${key}=\"${input}\"" >> "$ENV_FILE"
    fi
}

echo ""
echo -e "${B}${BL}┌──────────────────────────────────────────────────────┐${NC}"
echo -e "${B}${BL}│${NC}  Configure Environment Variables"
echo -e "${B}${BL}└──────────────────────────────────────────────────────┘${NC}"
echo ""

# Check if .env is already fully configured (re-run detection)
ALREADY_CONFIGURED=true
for key in POSTGRES_PASSWORD BETTER_AUTH_SECRET DODO_PAYMENTS_API_KEY; do
    val=$(grep -oP "^${key}=\"?\K[^\"]*" "$ENV_FILE" 2>/dev/null || true)
    if [[ -z "$val" ]]; then ALREADY_CONFIGURED=false; break; fi
done

if [[ "$ALREADY_CONFIGURED" == "true" ]]; then
    echo -e "  ${GR}All required values are already configured.${NC}"
    echo ""
    info "BETTER_AUTH_URL: $(grep -oP '^BETTER_AUTH_URL="?\K[^"]+' "$ENV_FILE")"
    info "ORIGIN:         $(grep -oP '^ORIGIN="?\K[^"]+' "$ENV_FILE")"
    info "POSTGRES_USER:  $(grep -oP '^POSTGRES_USER="?\K[^"]+' "$ENV_FILE")"
    info "POSTGRES_DB:    $(grep -oP '^POSTGRES_DB="?\K[^"]+' "$ENV_FILE")"
    echo ""
    read -rp "  Press Enter to keep these values, or type 'edit' to change: " EDIT_CHOICE
    if [[ "$EDIT_CHOICE" != "edit" ]]; then
        # Still ensure DATABASE_URL is correctly encoded and core values updated
        PG_USER=$(grep -oP '^POSTGRES_USER="?\K[^"]+' "$ENV_FILE")
        PG_PASS=$(grep -oP '^POSTGRES_PASSWORD="?\K[^"]+' "$ENV_FILE")
        PG_DB=$(grep -oP '^POSTGRES_DB="?\K[^"]+' "$ENV_FILE")
        PG_PASS_ENCODED=$(urlencode "$PG_PASS")
        DATABASE_URL="postgresql://${PG_USER}:${PG_PASS_ENCODED}@localhost:5432/${PG_DB}"
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" "$ENV_FILE"
        set_env "BETTER_AUTH_URL" "https://${DOMAIN}"
        set_env "ORIGIN"         "https://${DOMAIN}"
        set_env "NODE_ENV"       "production"
        ok "Core values updated, DATABASE_URL re-encoded."
        SKIP_PROMPTS=true
    else
        SKIP_PROMPTS=false
    fi
else
    SKIP_PROMPTS=false
fi

if [[ "$SKIP_PROMPTS" != "true" ]]; then
    echo -e "  ${BL}Press Enter to accept defaults / skip optional values${NC}"
    echo ""

    # ── Database ──
    echo -e "\n${B}── Database ──${NC}"
    prompt_env "POSTGRES_USER"     "PostgreSQL user:"              "postgres"
    prompt_env "POSTGRES_PASSWORD" "PostgreSQL password:"          ""           "true"
    prompt_env "POSTGRES_DB"       "PostgreSQL database name:"     "aceblocker"

    # Auto-derive DATABASE_URL (URL-encode the password for safety)
    PG_USER=$(grep -oP '^POSTGRES_USER="?\K[^"]+' "$ENV_FILE")
    PG_PASS=$(grep -oP '^POSTGRES_PASSWORD="?\K[^"]+' "$ENV_FILE")
    PG_DB=$(grep -oP '^POSTGRES_DB="?\K[^"]+' "$ENV_FILE")
    PG_PASS_ENCODED=$(urlencode "$PG_PASS")
    DATABASE_URL="postgresql://${PG_USER}:${PG_PASS_ENCODED}@localhost:5432/${PG_DB}"
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" "$ENV_FILE"
    ok "DATABASE_URL derived: postgresql://${PG_USER}:*****@localhost:5432/${PG_DB}"

    # ── Core ──
    echo -e "\n${B}── Core ──${NC}"
    set_env "BETTER_AUTH_URL" "https://${DOMAIN}"
    set_env "ORIGIN"         "https://${DOMAIN}"
    set_env "NODE_ENV"       "production"
    ok "BETTER_AUTH_URL: https://${DOMAIN}"
    ok "ORIGIN:         https://${DOMAIN}"

    # ── Dodo Payments ──
    echo -e "\n${B}── Dodo Payments ──${NC}"
    prompt_env "DODO_PAYMENTS_API_KEY"      "API key:"                    ""  "true"
    prompt_env "DODO_PAYMENTS_WEBHOOK_SECRET" "Webhook secret:"           ""  "true"
    prompt_env "DODO_PAYMENTS_PRODUCTS"     "Products JSON:" \
        '[{ "productId" : "pdt_0NXOnI40qSEVOqAnCUwmm", "slug": "ace_blocker_monthly"}, { "productId" : "pdt_0NYXyjMDNixJ55IDOC42c", "slug": "ace_blocker_yearly"}]'

    # ── Email (Resend) ──
    echo -e "\n${B}── Email (Resend) ──${NC}"
    prompt_env "RESEND_API_KEY" "Resend API key:" "" "true"

    # ── BunnyCDN ──
    echo -e "\n${B}── BunnyCDN ──${NC}"
    prompt_env "BUNNY_SECURITY_KEY"    "Security key:"              ""  "true"
    prompt_env "BUNNY_STORAGE_ZONE"    "Storage zone name:"         "aceblocker-storage"
    prompt_env "BUNNY_CDN_BASE_URL"    "CDN base URL:"              "cdn.aceblocker.com"
    prompt_env "BUNNY_STORAGE_ACCESS_KEY" "Storage access key:"     ""  "true"

    # ── Default Admin ──
    echo -e "\n${B}── Default Admin Account ──${NC}"
    prompt_env "DEFAULT_ADMIN_EMAIL"    "Admin email:"              "admin@${DOMAIN}"
    prompt_env "DEFAULT_ADMIN_USERNAME" "Admin username:"           "admin"
    prompt_env "DEFAULT_ADMIN_PASSWORD" "Admin password:"           ""  "true"

fi  # end SKIP_PROMPTS

# ── Finalize ──
chmod 600 "$ENV_FILE"
chown "${USERNAME}:${USERNAME}" "$ENV_FILE"

echo ""
ok "Environment configured and saved to ${ENV_FILE}"

# Warn about any remaining empty required values
echo ""
for key in POSTGRES_PASSWORD DODO_PAYMENTS_API_KEY DODO_PAYMENTS_WEBHOOK_SECRET \
           RESEND_API_KEY BUNNY_SECURITY_KEY BUNNY_STORAGE_ACCESS_KEY DEFAULT_ADMIN_PASSWORD; do
    val=$(grep -oP "^${key}=\"?\K[^\"]*" "$ENV_FILE" 2>/dev/null || true)
    if [[ -z "$val" ]]; then
        warn "${key} is EMPTY — the app may not function without it."
    fi
done

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

# ── 14. Nginx ───────────────────────────────────────────────────────────────
step "14. Nginx Configuration"
SITE="/etc/nginx/sites-available/ace-blocker"

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

mkdir -p /var/www/html
rm -f /etc/nginx/sites-enabled/default
ln -sf "$SITE" /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
ok "Nginx configured (HTTP only — SSL next)."

# ── 15. SSL Certificate ─────────────────────────────────────────────────────
step "15. SSL Certificate"

if [[ -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
    info "SSL certificate already exists."
else
    if [[ -n "$CF_TOKEN" ]]; then
        apt install -y -qq certbot python3-certbot-dns-cloudflare

        CF_INI="/root/.cloudflare.ini"
        cat > "$CF_INI" <<< "dns_cloudflare_api_token = ${CF_TOKEN}"
        chmod 600 "$CF_INI"

        EMAIL_ARG=""
        [[ -n "$EMAIL" ]] && EMAIL_ARG="--email ${EMAIL}"

        info "Requesting SSL certificate via DNS challenge..."
        certbot certonly --non-interactive --agree-tos \
            --dns-cloudflare --dns-cloudflare-credentials "$CF_INI" \
            $EMAIL_ARG \
            -d "${DOMAIN}" -d "www.${DOMAIN}"
        ok "SSL certificate obtained."
    else
        warn "No Cloudflare API token. Attempting HTTP challenge..."
        apt install -y -qq certbot

        EMAIL_ARG="--register-unsafely-without-email"
        [[ -n "$EMAIL" ]] && EMAIL_ARG="--email ${EMAIL}"

        certbot certonly --non-interactive --agree-tos \
            --webroot -w /var/www/html \
            $EMAIL_ARG \
            -d "${DOMAIN}" -d "www.${DOMAIN}" || {
            warn "HTTP challenge failed. Install SSL manually later."
        }
    fi
fi

# ── 16. Update Nginx with SSL ───────────────────────────────────────────────
step "16. Nginx SSL Configuration"

if [[ -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
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

    client_max_body_size 10m;

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
else
    warn "No certificate found. Restart with --cf-token to enable SSL."
fi

# ── 17. Database Backups ────────────────────────────────────────────────────
step "17. Database Backups"

BACKUP_SCRIPT="/home/${USERNAME}/backups/backup_db.sh"
mkdir -p "/home/${USERNAME}/backups"

cat > "$BACKUP_SCRIPT" << 'BACKUPSCRIPT'
#!/bin/bash
set -euo pipefail
source /home/REPLACE_USER/ace-blocker-site/.env
BACKUP_DIR="/home/REPLACE_USER/backups"
BACKUP_PATH="${BACKUP_DIR}/db_$(date +%Y%m%d_%H%M%S).sql"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" ace-blocker-db \
    pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-aceblocker}" > "$BACKUP_PATH"
gzip "$BACKUP_PATH"
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete
echo "Backup completed: ${BACKUP_PATH}.gz"
BACKUPSCRIPT

sed -i "s/REPLACE_USER/${USERNAME}/g" "$BACKUP_SCRIPT"
chmod +x "$BACKUP_SCRIPT"
chown -R "${USERNAME}:${USERNAME}" "/home/${USERNAME}/backups"

# Add cron job if not already present
if ! crontab -u "$USERNAME" -l 2>/dev/null | grep -q "backup_db"; then
    (crontab -u "$USERNAME" -l 2>/dev/null || true
     echo "0 3 * * * ${BACKUP_SCRIPT}") | crontab -u "$USERNAME" -
    ok "Daily backup cron job added (runs at 3 AM)."
else
    info "Backup cron job already exists."
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
