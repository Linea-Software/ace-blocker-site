#!/usr/bin/env bash
set -euo pipefail

write_cloudflare_real_ip_config() {
    local v4 v6
    v4="$(mktemp)"; v6="$(mktemp)"
    SECRET_FILES+=("$v4" "$v6")
    if curl -fsS --max-time 15 https://www.cloudflare.com/ips-v4 -o "$v4" \
       && curl -fsS --max-time 15 https://www.cloudflare.com/ips-v6 -o "$v6"; then
        {
            echo '# Managed by Ace Blocker VPS setup. Only Cloudflare may supply CF-Connecting-IP.'
            while read -r cidr; do [[ "$cidr" =~ ^[0-9.]+/[0-9]{1,2}$ ]] && printf 'set_real_ip_from %s;\n' "$cidr"; done < "$v4"
            while read -r cidr; do [[ "$cidr" =~ ^[0-9A-Fa-f:]+/[0-9]{1,3}$ ]] && printf 'set_real_ip_from %s;\n' "$cidr"; done < "$v6"
            echo 'real_ip_header CF-Connecting-IP;'
            echo 'real_ip_recursive off;'
        } > /etc/nginx/conf.d/ace-blocker-real-ip.conf
    else
        err 'Could not fetch Cloudflare IP ranges. Refusing to deploy an origin config that trusts spoofable forwarding headers.'
        exit 1
    fi
    rm -f "$v4" "$v6"
}

write_nginx_site() {
    local ssl_mode="$1"
    local site=/etc/nginx/sites-available/ace-blocker
    local cdn_host
    cdn_host="$(read_env_value BUNNY_CDN_BASE_URL "${APP_DIR}/.env")"
    [[ -n "$cdn_host" ]] || { err 'BUNNY_CDN_BASE_URL is missing.'; exit 1; }

    cat > /etc/nginx/conf.d/ace-blocker-upgrade.conf <<'EOF'
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
# realip_remote_addr exists only when a trusted Cloudflare edge replaced the IP.
# Drop any country header supplied directly to the origin.
map $realip_remote_addr $ace_cf_country {
    default $http_cf_ipcountry;
    "" "";
}
server_tokens off;
EOF

    {
        cat <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 444;
}

EOF
        if [[ "$ssl_mode" == true ]]; then
            cat <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};
    location ^~ /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/${DOMAIN}/chain.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Resource-Policy "same-site" always;

    # Staged CSP: SvelteKit emits inline hydration/style content, so production
    # observations are required before removing report-only. Dodo checkout is a
    # top-level hosted redirect, not an embedded frame/script. Bunny is needed
    # only for application-controlled CDN images/assets.
    add_header Content-Security-Policy-Report-Only "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://${cdn_host}; font-src 'self' data:; connect-src 'self'; frame-src 'none'; worker-src 'self'; manifest-src 'self'; upgrade-insecure-requests" always;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header CF-IPCountry \$ace_cf_country;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
        else
            cat <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};
    location ^~ /.well-known/acme-challenge/ { root /var/www/html; }
    client_max_body_size 50m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header CF-IPCountry \$ace_cf_country;
    }
}
EOF
        fi
    } > "$site"

    rm -f /etc/nginx/sites-enabled/default
    ln -sfn "$site" /etc/nginx/sites-enabled/ace-blocker
    nginx -t
    systemctl reload nginx
}

setup_nginx_and_tls() {
    step '12. Nginx, Cloudflare real IP and TLS'
    write_cloudflare_real_ip_config
    install -d -m 755 /var/www/html

    if [[ -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
        write_nginx_site true
        ok 'Existing certificate found; HTTPS configuration validated.'
        return
    fi

    write_nginx_site false
    apt-get -y install certbot python3-certbot-dns-cloudflare
    if [[ -z "$CF_TOKEN" ]]; then
        read -rsp 'Cloudflare API token (Zone:DNS:Edit for this zone only): ' CF_TOKEN; echo ''
    fi
    [[ -n "$CF_TOKEN" ]] || { err 'Cloudflare API token is required.'; exit 1; }
    if [[ -z "$EMAIL" ]]; then
        read -rp "Let's Encrypt contact email: " EMAIL
    fi
    [[ -n "$EMAIL" ]] || { err "Let's Encrypt contact email is required."; exit 1; }

    local cf_ini=/root/.cloudflare.ini
    new_secret_file "$cf_ini"
    printf 'dns_cloudflare_api_token = %s\n' "$CF_TOKEN" > "$cf_ini"
    CF_TOKEN=''

    certbot certonly --non-interactive --agree-tos \
        --dns-cloudflare --dns-cloudflare-credentials "$cf_ini" \
        --dns-cloudflare-propagation-seconds 30 \
        --email "$EMAIL" --deploy-hook 'systemctl reload nginx' \
        -d "$DOMAIN" -d "*.${DOMAIN}"
    systemctl enable --now certbot.timer >/dev/null 2>&1 || true
    write_nginx_site true
    ok 'TLS certificate installed and Nginx HTTPS configuration validated.'
}
