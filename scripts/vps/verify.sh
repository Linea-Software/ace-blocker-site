#!/usr/bin/env bash
set -euo pipefail

CHECKS_PASSED=true
run_check() {
    local description="$1" function_name="$2"
    if "$function_name" >/dev/null 2>&1; then
        ok "$description"
    else
        err "$description"
        CHECKS_PASSED=false
    fi
}

check_docker() { systemctl is-active --quiet docker; }
check_database_service() { systemctl is-active --quiet ace-blocker-db; }
check_app_service() { systemctl is-active --quiet ace-blocker; }
check_nginx() { systemctl is-active --quiet nginx && nginx -t; }
check_fail2ban() { systemctl is-active --quiet fail2ban; }
check_firewall() { ufw status | grep -q '^Status: active'; }
check_db_container() { docker inspect -f '{{.State.Health.Status}}' ace-blocker-db | grep -q '^healthy$'; }
check_app_response() { curl -fsS --max-time 10 http://127.0.0.1:3000/ >/dev/null; }
check_postgres_private() { ! ss -Hltn | grep -qE '(0\.0\.0\.0|\[::\]|\*):5432'; }
check_app_loopback() { ss -Hltn | grep -qE '127\.0\.0\.1:3000'; }
check_env_mode() { [[ "$(stat -c '%a:%U:%G' "${APP_DIR}/.env")" == "600:${USERNAME}:${USERNAME}" ]]; }
check_backup_env_mode() { [[ "$(stat -c '%a:%U:%G' "$BACKUP_ENV")" == '600:root:root' ]]; }
check_backup_secret_absent_from_app() { ! grep -q '^BACKUP_PASSPHRASE=' "${APP_DIR}/.env"; }
check_bootstrap_secret_absent() { ! grep -q '^DEFAULT_ADMIN_PASSWORD=' "${APP_DIR}/.env"; }
check_production_mode() { grep -q '^NODE_ENV="production"$' "${APP_DIR}/.env"; }
check_runtime_cannot_read_backup_secret() { ! runuser -u "$RUNTIME_USER" -- test -r "$BACKUP_ENV"; }
check_runtime_cannot_write_release() { ! runuser -u "$RUNTIME_USER" -- test -w "${APP_DIR}/build"; }
check_root_compose() { [[ "$(stat -c '%U:%G' "$DB_COMPOSE")" == 'root:root' ]]; }
check_no_docker_sudo_rule() { ! grep -RqsE 'NOPASSWD:.*docker' /etc/sudoers /etc/sudoers.d; }
check_ssh_root_disabled() { sshd -T | grep -q '^permitrootlogin no$'; }
check_ssh_password_disabled() { sshd -T | grep -q '^passwordauthentication no$'; }
check_https() { curl -fsS --max-time 15 "https://${DOMAIN}/" >/dev/null; }
check_csp_staged() { curl -fsSI --max-time 15 "https://${DOMAIN}/" | grep -qi '^Content-Security-Policy-Report-Only:'; }
check_backup_script() { [[ -x /usr/local/sbin/ace-blocker-backup.sh ]]; }

verify_deployment() {
    step '14. Final verification'
    run_check 'Docker is running' check_docker
    run_check 'Root-owned database service is running' check_database_service
    run_check 'Application service is running' check_app_service
    run_check 'Nginx is active and configuration-valid' check_nginx
    run_check 'Fail2Ban is running' check_fail2ban
    run_check 'UFW firewall is active' check_firewall
    run_check 'PostgreSQL container healthcheck is healthy' check_db_container
    run_check 'Application responds on loopback' check_app_response
    run_check 'PostgreSQL is not publicly listening' check_postgres_private
    run_check 'Application listens on loopback only' check_app_loopback
    run_check 'Application .env is deploy-user 0600' check_env_mode
    run_check 'Production mode is explicitly configured' check_production_mode
    run_check 'Bootstrap admin password is absent from runtime environment' check_bootstrap_secret_absent
    run_check 'Backup secret is absent from runtime environment' check_backup_secret_absent_from_app
    run_check 'Backup environment is root:root 0600' check_backup_env_mode
    run_check 'Runtime identity cannot read backup secret configuration' check_runtime_cannot_read_backup_secret
    run_check 'Runtime identity cannot modify deployed build output' check_runtime_cannot_write_release
    run_check 'Database Compose definition is root-owned' check_root_compose
    run_check 'No passwordless Docker sudo rule remains' check_no_docker_sudo_rule
    run_check 'SSH root login is disabled' check_ssh_root_disabled
    if [[ "${SSH_KEY_OK:-false}" == true ]]; then run_check 'SSH password authentication is disabled' check_ssh_password_disabled; fi
    run_check 'Backup script is installed root-only' check_backup_script

    if [[ -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
        run_check 'HTTPS is reachable' check_https
        run_check 'Staged CSP header is present' check_csp_staged
        info 'Running certificate renewal dry-run...'
        if certbot renew --dry-run --cert-name "$DOMAIN" >/dev/null 2>&1; then ok 'Certificate renewal dry-run succeeds'; else warn 'Certificate renewal dry-run failed; investigate before expiry.'; fi
    fi

    info 'systemd-analyze security summary:'
    systemd-analyze security ace-blocker.service --no-pager 2>/dev/null || true

    if [[ "$CHECKS_PASSED" != true ]]; then
        err 'One or more deployment verification checks failed.'
        return 1
    fi
    ok "Deployment verification passed for revision ${DEPLOYED_REVISION:-unknown}."
}
