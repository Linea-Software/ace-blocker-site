#!/usr/bin/env bash
set -euo pipefail

# Backup-only configuration is created root:root 0600 and never loaded by the web service.

migrate_backup_secret() {
    install -d -m 700 -o root -g root "$CONFIG_DIR"
    if [[ ! -s "$BACKUP_ENV" ]]; then
        new_secret_file "$BACKUP_ENV"
        if grep -q '^BACKUP_PASSPHRASE=' "${APP_DIR}/.env" 2>/dev/null; then
            grep -m1 '^BACKUP_PASSPHRASE=' "${APP_DIR}/.env" | sed 's/^BACKUP_PASSPHRASE=/PASSPHRASE=/' > "$BACKUP_ENV"
            info 'Migrated existing backup encryption material to root-only backup configuration.'
        else
            printf 'PASSPHRASE="' > "$BACKUP_ENV"
            openssl rand -base64 36 | tr -d '\n' >> "$BACKUP_ENV"
            printf '"\n' >> "$BACKUP_ENV"
            warn "Generated new backup encryption material in ${BACKUP_ENV}."
            warn 'Copy it to an external password manager from a root-only console before relying on off-site recovery.'
        fi
    fi
    sed -i '/^BACKUP_PASSPHRASE=/d' "${APP_DIR}/.env"
    chmod 600 "${APP_DIR}/.env" "$BACKUP_ENV"
    chown root:root "$BACKUP_ENV"
}

configure_b2_backup() {
    B2_ENABLED=false
    if [[ -z "$B2_KEY_ID" ]]; then read -rp 'Backblaze B2 Key ID (blank for local-only): ' B2_KEY_ID; fi
    [[ -n "$B2_KEY_ID" ]] || return
    if [[ -z "$B2_APP_KEY" ]]; then read -rsp 'Backblaze B2 application key: ' B2_APP_KEY; echo ''; fi
    if [[ -z "$B2_BUCKET" ]]; then read -rp 'Backblaze B2 bucket: ' B2_BUCKET; fi
    [[ -n "$B2_APP_KEY" && -n "$B2_BUCKET" ]] || { err 'B2 key and bucket are both required.'; exit 1; }
    [[ "$B2_BUCKET" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{4,48}$ ]] || { err 'Invalid B2 bucket.'; exit 1; }
    command -v rclone >/dev/null 2>&1 || apt-get -y install rclone
    install -d -m 700 -o root -g root /root/.config/rclone
    local obscured
    obscured="$(printf '%s\n' "$B2_APP_KEY" | rclone obscure -)"
    new_secret_file /root/.config/rclone/rclone.conf
    cat > /root/.config/rclone/rclone.conf <<EOF
[b2backup]
type = b2
account = ${B2_KEY_ID}
key = ${obscured}
EOF
    B2_APP_KEY=''; obscured=''
    if rclone lsd "b2backup:${B2_BUCKET}" >/dev/null 2>&1; then
        B2_ENABLED=true
        ok "B2 bucket ${B2_BUCKET} is reachable."
    else
        warn 'B2 validation failed; backups will remain local-only.'
    fi
}

install_backup_job() {
    step '13. Root-only encrypted backups'
    local backup_dir=/var/backups/ace-blocker
    local backup_script=/usr/local/sbin/ace-blocker-backup.sh
    local backup_log=/var/log/ace-blocker-backup.log
    install -d -m 700 -o root -g root "$backup_dir"
    migrate_backup_secret
    configure_b2_backup

    if [[ -d "/home/${USERNAME}/backups" ]]; then
        find "/home/${USERNAME}/backups" -maxdepth 1 -type f \
            \( -name 'db_*.sql' -o -name 'db_*.sql.gz' -o -name 'db_*.sql.gz.gpg' \) \
            -exec mv -n {} "$backup_dir"/ \; 2>/dev/null || true
        rm -f "/home/${USERNAME}/backups/backup_db.sh"
    fi
    if crontab -u "$USERNAME" -l 2>/dev/null | grep -q 'backup_db'; then
        (crontab -u "$USERNAME" -l 2>/dev/null | grep -v 'backup_db' || true) | crontab -u "$USERNAME" -
    fi

    install -m 700 -o root -g root /dev/null "$backup_script"
    cat > "$backup_script" <<'BACKUP_SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
umask 077
exec 9>/var/lock/ace-blocker-backup.lock
flock -n 9 || { echo 'Another backup is running; skipping.'; exit 0; }

DB_ENV='/etc/ace-blocker/database.env'
BACKUP_ENV='/etc/ace-blocker/backup.env'
BACKUP_DIR='/var/backups/ace-blocker'
B2_BUCKET='REPLACE_B2_BUCKET'

read_value() {
    local key="$1" file="$2" line value
    line="$(grep -m1 -E "^${key}=" "$file" 2>/dev/null || true)"
    [[ -n "$line" ]] || return 1
    value="${line#*=}"
    if [[ "$value" == '"'*'"' ]]; then
        value="${value:1:${#value}-2}"
        value="${value//\\\"/\"}"
        value="${value//\\\\/\\}"
    elif [[ "$value" == "'"*"'" ]]; then value="${value:1:${#value}-2}"; fi
    printf '%s' "$value"
}

DB_USER="$(read_value POSTGRES_USER "$DB_ENV")"
DB_VALUE="$(read_value POSTGRES_PASSWORD "$DB_ENV")"
DB_NAME="$(read_value POSTGRES_DB "$DB_ENV")"
PASSPHRASE="$(read_value PASSPHRASE "$BACKUP_ENV")"
[[ -n "$DB_VALUE" && -n "$PASSPHRASE" ]] || { echo 'Backup configuration is incomplete.' >&2; exit 1; }

plain="${BACKUP_DIR}/db_$(date +%Y%m%d_%H%M%S).sql"
compressed="${plain}.gz"
encrypted="${compressed}.gpg"
printf '%s\n' "$DB_VALUE" | docker exec -i ace-blocker-db \
    sh -c 'IFS= read -r PGPASSWORD; export PGPASSWORD; exec pg_dump -U "$0" -d "$1"' \
    "$DB_USER" "$DB_NAME" > "$plain"
[[ -s "$plain" ]] || { rm -f "$plain"; echo 'pg_dump produced an empty file.' >&2; exit 1; }
gzip -f "$plain"
printf '%s' "$PASSPHRASE" | gpg --batch --yes --pinentry-mode loopback \
    --passphrase-fd 0 --cipher-algo AES256 -o "$encrypted" -c "$compressed"
[[ -s "$encrypted" ]] || { echo 'Backup encryption failed.' >&2; exit 1; }
rm -f "$compressed"

if [[ -n "$B2_BUCKET" ]] && command -v rclone >/dev/null 2>&1; then
    rclone copy "$encrypted" "b2backup:${B2_BUCKET}/db-backups/"
    rclone delete --b2-hard-delete --fast-list --min-age 30d "b2backup:${B2_BUCKET}/db-backups/" || true
fi
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db_*.sql.gz.gpg' -mtime +7 -delete
printf 'Backup completed: %s\n' "$encrypted"
BACKUP_SCRIPT

    if [[ "$B2_ENABLED" == true ]]; then
        sed -i "s|REPLACE_B2_BUCKET|${B2_BUCKET}|g" "$backup_script"
    else
        sed -i 's|REPLACE_B2_BUCKET||g' "$backup_script"
    fi
    cat > /etc/cron.d/ace-blocker-backup <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
0 3 * * * root ${backup_script} >> ${backup_log} 2>&1
EOF
    chmod 644 /etc/cron.d/ace-blocker-backup
    [[ -f "$backup_log" ]] || install -m 600 -o root -g root /dev/null "$backup_log"
    cat > /etc/logrotate.d/ace-blocker-backup <<EOF
${backup_log} {
    weekly
    rotate 8
    compress
    missingok
    notifempty
    create 0600 root root
}
EOF
    ok 'Encrypted backup job installed; backup-only secrets remain root-only.'
}
