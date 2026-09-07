#!/usr/bin/env bash
set -euo pipefail

setup_docker() {
    step '5. Docker engine'
    if ! command -v docker >/dev/null 2>&1; then
        # Remaining mutable host dependency: Docker's signed vendor installer.
        # The application/runtime and database images themselves are version-pinned.
        curl -fsSL https://get.docker.com -o /tmp/ace-blocker-get-docker.sh
        sh /tmp/ace-blocker-get-docker.sh
        rm -f /tmp/ace-blocker-get-docker.sh
    fi
    systemctl enable --now docker

    # Docker-published ports can bypass normal UFW chains. Compose also binds
    # Postgres explicitly to 127.0.0.1; this daemon default is defense-in-depth.
    if [[ ! -f /etc/docker/daemon.json ]]; then
        install -d -m 755 /etc/docker
        cat > /etc/docker/daemon.json <<'EOF'
{
  "ip": "127.0.0.1",
  "live-restore": true,
  "no-new-privileges": true
}
EOF
        systemctl restart docker
    fi
    docker compose version >/dev/null
    ok "Docker available: $(docker --version)"
}

install_database_service() {
    step '9. Root-owned database deployment'
    install -d -m 750 -o root -g root "$CONFIG_DIR"
    install -m 644 -o root -g root "${APP_DIR}/compose.yaml" "$DB_COMPOSE"

    # Copy only Compose's database inputs. The deploy user cannot alter the
    # root-owned Compose definition or this environment after setup completes.
    new_secret_file "$DB_ENV"
    grep -E '^(POSTGRES_USER|POSTGRES_PASSWORD|POSTGRES_DB)=' "${APP_DIR}/.env" > "$DB_ENV"
    if [[ "$(wc -l < "$DB_ENV")" -ne 3 ]]; then
        err 'Could not extract all PostgreSQL settings into the root-owned database environment.'
        exit 1
    fi

    cat > /etc/systemd/system/ace-blocker-db.service <<EOF
[Unit]
Description=Ace Blocker PostgreSQL stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${CONFIG_DIR}
ExecStart=/usr/bin/docker compose --project-name ace-blocker-site --env-file ${DB_ENV} -f ${DB_COMPOSE} up -d --wait db
ExecReload=/usr/bin/docker compose --project-name ace-blocker-site --env-file ${DB_ENV} -f ${DB_COMPOSE} up -d --wait db
ExecStop=/usr/bin/docker compose --project-name ace-blocker-site --env-file ${DB_ENV} -f ${DB_COMPOSE} stop -t 30 db
TimeoutStartSec=180
TimeoutStopSec=60

[Install]
WantedBy=multi-user.target
EOF
    chmod 644 /etc/systemd/system/ace-blocker-db.service
    systemctl daemon-reload
    systemctl enable ace-blocker-db.service
    systemctl restart ace-blocker-db.service
    ok 'PostgreSQL is managed by a root-owned systemd/Compose boundary.'
}
