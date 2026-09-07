#!/usr/bin/env bash
set -euo pipefail

install_bun() {
    step '6. Bun runtime'
    if [[ ! -x "$BUN" ]] || ! run_as_deploy "$BUN" --version | grep -qx "$BUN_VERSION"; then
        info "Installing Bun ${BUN_VERSION} for the deploy user..."
        run_as_deploy env HOME="/home/${USERNAME}" bash -c "curl -fsSL https://bun.sh/install | bash -s -- bun-v${BUN_VERSION}"
    fi
    chmod -R g+rX "/home/${USERNAME}/.bun"
    run_as_deploy "$BUN" --version | grep -qx "$BUN_VERSION" || { err "Expected Bun ${BUN_VERSION}"; exit 1; }
    ok "Bun ${BUN_VERSION} installed."
}

make_git_askpass() {
    local helper="/home/${USERNAME}/.ace-git-askpass-$$"
    cat > "$helper" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  *Username*) printf '%s\n' 'x-access-token' ;;
  *) printf '%s\n' "${ACE_REPO_CREDENTIAL:?}" ;;
esac
EOF
    chown "$USERNAME:$USERNAME" "$helper"
    chmod 700 "$helper"
    SECRET_FILES+=("$helper")
    printf '%s' "$helper"
}

prompt_repo_credential() {
    [[ -n "${REPO_CREDENTIAL:-}" ]] && return
    read -rsp 'GitHub repository credential: ' REPO_CREDENTIAL; echo ''
    [[ -n "$REPO_CREDENTIAL" ]] || { err 'A repository credential is required.'; exit 1; }
}

git_with_optional_credential() {
    local helper=''
    if [[ -n "${REPO_CREDENTIAL:-}" ]]; then
        helper="$(make_git_askpass)"
        run_as_deploy env GIT_TERMINAL_PROMPT=0 GIT_ASKPASS="$helper" ACE_REPO_CREDENTIAL="$REPO_CREDENTIAL" "$@"
        rm -f "$helper"
    else
        run_as_deploy env GIT_TERMINAL_PROMPT=0 "$@"
    fi
}

deploy_source() {
    step '7. Deploy a known source revision'
    REPO_CREDENTIAL=''
    if [[ -d "${APP_DIR}/.git" ]]; then
        if [[ -n "$(run_as_deploy git -C "$APP_DIR" status --porcelain)" ]]; then
            err "${APP_DIR} has local changes; refusing to overwrite operator work."
            exit 1
        fi
        if ! git_with_optional_credential git -C "$APP_DIR" fetch --prune origin; then
            prompt_repo_credential
            git_with_optional_credential git -C "$APP_DIR" fetch --prune origin
        fi
    else
        if [[ -e "$APP_DIR" && -n "$(find "$APP_DIR" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
            err "${APP_DIR} exists and is not a Git checkout."
            exit 1
        fi
        rm -rf "$APP_DIR"
        if ! git_with_optional_credential git clone "$REPO_URL" "$APP_DIR"; then
            rm -rf "$APP_DIR"
            prompt_repo_credential
            git_with_optional_credential git clone "$REPO_URL" "$APP_DIR"
        fi
        chown -R "$USERNAME:$USERNAME" "$APP_DIR"
    fi

    local requested="${REVISION:-origin/main}" target
    target="$(run_as_deploy git -C "$APP_DIR" rev-parse "${requested}^{commit}")"
    run_as_deploy git -C "$APP_DIR" checkout --detach "$target"
    DEPLOYED_REVISION="$target"
    REPO_CREDENTIAL=''
    ok "Checked out immutable deployment revision ${DEPLOYED_REVISION}."
}

configure_application() {
    step '8. Dependencies and production environment'
    run_as_deploy "$BUN" --cwd "$APP_DIR" install --frozen-lockfile
    run_as_deploy "$BUN" "${APP_DIR}/scripts/setup-env.ts" --domain "$DOMAIN" --env-file "${APP_DIR}/.env"
    chown "$USERNAME:$USERNAME" "${APP_DIR}/.env"
    chmod 600 "${APP_DIR}/.env"
    ok 'Dependencies and strict production environment configured.'
}

migrate_and_provision() {
    step '10. Database migrations and explicit administrator provisioning'
    run_as_deploy "$BUN" --cwd "$APP_DIR" run db:migrate

    local admin_email="admin@${DOMAIN}" admin_username='admin' admin_password='' answer=''
    read -rp "Initial admin email [${admin_email}]: " answer
    [[ -n "$answer" ]] && admin_email="$answer"
    read -rp "Initial admin username [${admin_username}]: " answer
    [[ -n "$answer" ]] && admin_username="$answer"

    if run_as_deploy "$BUN" --cwd "$APP_DIR" run provision-admin -- --email "$admin_email" --username "$admin_username" >/dev/null 2>&1; then
        ok 'Existing administrator confirmed; password was not reset.'
        return
    fi

    while true; do
        read -rsp 'Initial admin password (12+ characters; not stored after provisioning): ' admin_password; echo ''
        [[ ${#admin_password} -ge 12 ]] && break
        warn 'Password must be at least 12 characters.'
    done
    printf '%s\n' "$admin_password" | run_as_deploy "$BUN" --cwd "$APP_DIR" run provision-admin -- --email "$admin_email" --username "$admin_username" --password-stdin
    admin_password=''
    ok 'Initial administrator provisioned without a long-lived bootstrap password.'
}

build_and_install_app_service() {
    step '11. Build and locked-down application service'
    run_as_deploy "$BUN" --cwd "$APP_DIR" run build
    chown -R "$USERNAME:$USERNAME" "$APP_DIR"
    chmod -R go-w "$APP_DIR"
    chmod 600 "${APP_DIR}/.env"

    cat > /etc/systemd/system/ace-blocker.service <<EOF
[Unit]
Description=Ace Blocker Web Application
After=network.target ace-blocker-db.service
Requires=ace-blocker-db.service

[Service]
Type=simple
User=${RUNTIME_USER}
Group=${RUNTIME_USER}
SupplementaryGroups=${USERNAME}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3000
ExecStart=${BUN} build
Restart=on-failure
RestartSec=5

NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only
ReadOnlyPaths=${APP_DIR}
StateDirectory=ace-blocker
StateDirectoryMode=0700
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictSUIDSGID=yes
LockPersonality=yes
RestrictNamespaces=yes
MemoryDenyWriteExecute=yes
CapabilityBoundingSet=
AmbientCapabilities=
SystemCallArchitectures=native
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
UMask=0077

[Install]
WantedBy=multi-user.target
EOF
    chmod 644 /etc/systemd/system/ace-blocker.service
    systemctl daemon-reload
    systemctl enable ace-blocker.service
    systemctl restart ace-blocker.service
    sleep 2
    systemctl is-active --quiet ace-blocker.service || { journalctl -u ace-blocker.service -n 50 --no-pager; exit 1; }
    ok 'Application runs as a dedicated read-only runtime identity on 127.0.0.1:3000.'
}
