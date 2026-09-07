#!/usr/bin/env bash
set -euo pipefail

setup_system() {
    step '1. System updates and dependencies'
    export DEBIAN_FRONTEND=noninteractive
    APT_OPTS=(-y -o Dpkg::Options::=--force-confold)
    apt-get "${APT_OPTS[@]}" update
    apt-get "${APT_OPTS[@]}" upgrade
    apt-get "${APT_OPTS[@]}" install curl git unzip ufw fail2ban nginx openssl gpg ca-certificates unattended-upgrades apt-listchanges libnss3-tools
    timedatectl set-timezone UTC
    ok 'Base system packages installed.'
}

setup_users() {
    step '2. Deploy and runtime identities'
    local needs_password=false
    if ! id "$USERNAME" &>/dev/null; then
        adduser --disabled-password --gecos '' "$USERNAME"
        usermod -aG sudo "$USERNAME"
        needs_password=true
        ok "Created deploy user ${USERNAME}."
    else
        info "Deploy user ${USERNAME} already exists."
        if passwd -S "$USERNAME" 2>/dev/null | awk '{exit $2 == "L" ? 0 : 1}'; then needs_password=true; fi
    fi

    if [[ "$needs_password" == true ]]; then
        local p1 p2
        while true; do
            read -rsp "Set sudo password for ${USERNAME}: " p1; echo ''
            read -rsp 'Confirm password: ' p2; echo ''
            [[ -n "$p1" && "$p1" == "$p2" ]] && break
            warn 'Passwords did not match or were empty.'
        done
        printf '%s:%s\n' "$USERNAME" "$p1" | chpasswd
        unset p1 p2
    fi

    if ! id "$RUNTIME_USER" &>/dev/null; then
        adduser --system --no-create-home --group --shell /usr/sbin/nologin "$RUNTIME_USER"
    fi
    usermod -aG "$USERNAME" "$RUNTIME_USER"
    chmod 750 "/home/${USERNAME}"

    # Keep ordinary sudo password-protected. Only the exact developer bootstrap
    # apt commands remain passwordless; Docker is intentionally excluded.
    cat > "/etc/sudoers.d/${USERNAME}" <<SUDOERS
${USERNAME} ALL=(ALL:ALL) ALL
${USERNAME} ALL=(root) NOPASSWD: /usr/bin/apt update, /usr/bin/apt install -y libnss3-tools
SUDOERS
    chmod 0440 "/etc/sudoers.d/${USERNAME}"
    visudo -cf "/etc/sudoers.d/${USERNAME}" >/dev/null

    if [[ "$DOCKER_GROUP" == true ]]; then
        usermod -aG docker "$USERNAME"
        warn "${USERNAME} was explicitly added to the docker group; this is root-equivalent access."
    fi
    ok 'Deploy/runtime privilege boundary configured.'
}

setup_firewall_and_intrusion_protection() {
    step '4. Firewall, Fail2Ban and kernel hardening'
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable

    mkdir -p /etc/fail2ban/jail.d
    cat > /etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = %(sshd_log)s
backend = systemd
maxretry = 5
findtime = 600
bantime = 3600
EOF
    systemctl enable --now fail2ban

    cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
    cat > /etc/apt/apt.conf.d/52ace-blocker-unattended-upgrades <<'EOF'
Unattended-Upgrade::Allowed-Origins {
        "${distro_id}:${distro_codename}-security";
        "${distro_id}ESMApps:${distro_codename}-apps-security";
        "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
EOF
    systemctl enable --now unattended-upgrades >/dev/null 2>&1 || true

    cat > /etc/sysctl.d/99-ace-blocker.conf <<'EOF'
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_redirects = 0
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
EOF
    sysctl --system >/dev/null
    ok 'Firewall, intrusion protection, unattended security updates and sysctl hardening configured.'
}
