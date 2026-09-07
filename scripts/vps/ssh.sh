#!/usr/bin/env bash
set -euo pipefail

setup_ssh() {
    step '3. SSH key and daemon hardening'
    local ssh_dir="/home/${USERNAME}/.ssh" ssh_key_ok=false
    install -d -m 700 -o "$USERNAME" -g "$USERNAME" "$ssh_dir"

    if [[ -s /root/.ssh/authorized_keys && ! -s "${ssh_dir}/authorized_keys" ]]; then
        install -m 600 -o "$USERNAME" -g "$USERNAME" /root/.ssh/authorized_keys "${ssh_dir}/authorized_keys"
    fi
    if [[ -s "${ssh_dir}/authorized_keys" ]] && grep -qvE '^\s*(#|$)' "${ssh_dir}/authorized_keys"; then
        ssh_key_ok=true
    fi
    SSH_KEY_OK="$ssh_key_ok"

    local sshd_main=/etc/ssh/sshd_config
    local has_include=false
    grep -qE '^[[:space:]]*Include[[:space:]]+/etc/ssh/sshd_config\.d/\*\.conf' "$sshd_main" && has_include=true
    if [[ "$has_include" == true ]]; then
        cat > /etc/ssh/sshd_config.d/99-ace-blocker-hardening.conf <<EOF
PermitRootLogin no
MaxAuthTries 3
X11Forwarding no
AllowUsers ${USERNAME}
EOF
        if [[ "$ssh_key_ok" == true ]]; then
            cat >> /etc/ssh/sshd_config.d/99-ace-blocker-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
EOF
        else
            warn 'No deploy-user SSH key found; password authentication remains enabled.'
        fi
    else
        sed -i '/^# ACE-BLOCKER HARDENING$/,/^# END ACE-BLOCKER HARDENING$/d' "$sshd_main"
        cat >> "$sshd_main" <<EOF
# ACE-BLOCKER HARDENING
PermitRootLogin no
MaxAuthTries 3
X11Forwarding no
AllowUsers ${USERNAME}
$([[ "$ssh_key_ok" == true ]] && printf '%s\n' 'PasswordAuthentication no' 'KbdInteractiveAuthentication no' 'ChallengeResponseAuthentication no')
# END ACE-BLOCKER HARDENING
EOF
    fi

    if ! sshd -t; then
        err 'sshd -t failed; SSH configuration was not reloaded.'
        exit 1
    fi
    if [[ "$ssh_key_ok" == true ]]; then
        if ! sshd -T | grep -q '^passwordauthentication no$'; then
            err 'Effective SSH config does not disable password authentication.'
            exit 1
        fi
    fi
    systemctl reload ssh || systemctl reload sshd
    ok 'SSH configuration validated and reloaded.'
}
