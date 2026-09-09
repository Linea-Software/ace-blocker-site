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
#
# Secrets handling: no secret is ever passed on a command line (argv is world
# readable via /proc and is logged verbatim by sudo). Tokens/passwords are
# passed via stdin, 0600 files, or askpass helpers, and wiped on exit.
# =============================================================================

set -euo pipefail

# apt must never stop on an interactive config prompt (that hangs the whole
# unattended run), and needrestart must not pop its service-restart dialog.
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a NEEDRESTART_SUSPEND=1
APT_OPTS=(-y -qq -o Dpkg::Options::=--force-confold -o Dpkg::Options::=--force-confdef)

# ── Colors ──────────────────────────────────────────────────────────────────
RD='\033[0;31m'; GR='\033[0;32m'; YL='\033[1;33m'; BL='\033[0;34m'; B='\033[1m'; NC='\033[0m'
info()  { echo -e "${BL}[INFO]${NC}    $*"; }
ok()    { echo -e "${GR}[OK]${NC}      $*"; }
warn()  { echo -e "${YL}[WARN]${NC}    $*"; }
err()   { echo -e "${RD}[ERROR]${NC}   $*"; }
step()  { echo -e "\n${B}${BL}═══ $* ═══${NC}\n"; }

# ── Secret hygiene ──────────────────────────────────────────────────────────
# Any temp file that holds a credential is registered here and removed on exit,
# including on error or Ctrl-C.
SECRET_FILES=()
cleanup_secrets() {
    local f
    for f in ${SECRET_FILES[@]+"${SECRET_FILES[@]}"}; do
        [[ -n "$f" && -e "$f" ]] && rm -f "$f"
    done
}
trap cleanup_secrets EXIT INT TERM

# Create <path> with mode 0600 BEFORE any content is written, so a secret is
# never briefly world-readable (a plain `cat >` uses the 0022 umask).
new_secret_file() {  # new_secret_file <path> [owner:group]
    local path="$1" owner="${2:-root:root}"
    install -m 600 -o "${owner%%:*}" -g "${owner##*:}" /dev/null "$path"
}

pkg_installed() { dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -q "ok installed"; }

# ── Parse Arguments ─────────────────────────────────────────────────────────
DOMAIN="aceblocker.com"; USERNAME="aceblocker"; EMAIL=""; CF_TOKEN="${CF_TOKEN:-}"; DOCKER_GROUP=false
# Backblaze B2 (optional off-site backups). Can be supplied via flags or env.
B2_KEY_ID="${B2_KEY_ID:-}"; B2_APP_KEY="${B2_APP_KEY:-}"; B2_BUCKET="${B2_BUCKET:-}"
need_val() { [[ $# -ge 2 && -n "${2:-}" ]] || { err "Option $1 requires a value."; exit 1; }; }
while [[ $# -gt 0 ]]; do
    case "$1" in
        --domain)     need_val "$@"; DOMAIN="$2";    shift 2 ;;
        --username)   need_val "$@"; USERNAME="$2";  shift 2 ;;
        --email)      need_val "$@"; EMAIL="$2";     shift 2 ;;
        --cf-token)   need_val "$@"; CF_TOKEN="$2";  shift 2 ;;
        --docker-group) DOCKER_GROUP=true; shift ;;
        --b2-key-id)  need_val "$@"; B2_KEY_ID="$2";  shift 2 ;;
        --b2-app-key) need_val "$@"; B2_APP_KEY="$2"; shift 2 ;;
        --b2-bucket)  need_val "$@"; B2_BUCKET="$2";  shift 2 ;;
        --help)       sed -n '/^#/{/^#!/d;/^# =/d;p;}' "$0"; exit 0 ;;
        *) err "Unknown option: $1"; exit 1 ;;
    esac
done

# Validate anything that gets interpolated into config files, sudoers entries,
# shell strings and certbot arguments. These are operator-supplied, but a typo
# (or a stray quote) here silently produces a broken — or unsafe — config.
if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$ ]]; then
    err "Invalid domain: '${DOMAIN}'"; exit 1
fi
if [[ ! "$USERNAME" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]]; then
    err "Invalid username: '${USERNAME}' (must be a valid POSIX user name)"; exit 1
fi
if [[ -n "$EMAIL" && ! "$EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
    err "Invalid email: '${EMAIL}'"; exit 1
fi
if [[ -n "$B2_BUCKET" && ! "$B2_BUCKET" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{4,48}$ ]]; then
    err "Invalid B2 bucket name: '${B2_BUCKET}'"; exit 1
fi

APP_DIR="/home/${USERNAME}/ace-blocker-site"
BUN="/home/${USERNAME}/.bun/bin/bun"
COMPOSE=(docker compose --project-directory "${APP_DIR}" -f "${APP_DIR}/compose.yaml")

# Every docker/compose call this script makes now runs as root directly (the
# daemon is root-owned regardless), so no `sudo docker` shim is needed here.
# --docker-group only affects whether ${USERNAME} can drive docker interactively.

# ── Pre-flight ──────────────────────────────────────────────────────────────
echo -e "\n${B}${BL}┌──────────────────────────────────────────────────────┐${NC}"
echo -e   "${B}${BL}│${NC}  Ace Blocker VPS Setup"
echo -e   "${B}${BL}└──────────────────────────────────────────────────────┘${NC}\n"

[[ "$EUID" -ne 0 ]] && { err "Run as root (use sudo)."; exit 1; }
info "Domain: ${DOMAIN}   User: ${USERNAME}   App: ${APP_DIR}"

# ── 1. System Updates & Base Packages ───────────────────────────────────────
step "1. System Updates & Base Packages"
# Note: 'apt upgrade -y' runs on every invocation. On a fresh box this is what
# you want; on re-runs it will pull the latest packages too. If you need
# reproducible re-runs, pin versions or gate this behind a first-run check.
apt-get update -qq && apt-get "${APT_OPTS[@]}" upgrade
# gnupg -> backup encryption, jq -> daemon.json merge, iproute2 -> port checks,
# ca-certificates -> TLS for every curl below, cron -> backup schedule.
apt-get "${APT_OPTS[@]}" install curl git ufw nginx unzip gnupg jq iproute2 ca-certificates cron
ok "System updated."

# ── 2. User Setup ───────────────────────────────────────────────────────────
step "2. User Setup"
if ! id "$USERNAME" &>/dev/null; then
    adduser --disabled-password --gecos "" "$USERNAME"
fi
usermod -aG sudo "$USERNAME" 2>/dev/null || true
# Keep the home directory off-limits to other local users: .env, backups and
# the rclone config all live under here.
chmod 750 "/home/${USERNAME}"

# Grant sudo. We deliberately DO NOT use 'NOPASSWD: ALL' — that makes the
# service account root-equivalent, so any app/SSH/dependency compromise becomes
# instant root. Instead:
#   - General sudo requires the user's password (set below).
#   - Only the exact command lines 'bun run setup' invokes are NOPASSWD, pinned
#     to absolute paths (so they can't be shadowed via PATH) *and* to their full
#     argument list (so 'sudo docker run -v /:/host …' is not permitted).
#
# HONEST CAVEAT: `sudo docker compose up -d` is still root-equivalent in
# practice, because compose.yaml lives in a directory this user can write — they
# can add `privileged: true` / a bind mount of `/` and then invoke the permitted
# command. Pinning the arguments raises the bar (it defeats a one-shot `sudo
# docker run`), it does not eliminate the escalation. To actually close it:
# use rootless Docker, or make compose.yaml root-owned and deploy via a
# root-run unit. Backups no longer need this rule at all — they run as root
# from /etc/cron.d (step 17), so a compromised app cannot read or delete them.
SUDOERS_FILE="/etc/sudoers.d/${USERNAME}"
APT_BIN="$(command -v apt || echo /usr/bin/apt)"
DOCKER_BIN="$(command -v docker || echo /usr/bin/docker)"
SUDOERS_TMP="$(mktemp)"; SECRET_FILES+=("$SUDOERS_TMP")
cat > "$SUDOERS_TMP" << SUDOERS
# General sudo for ${USERNAME} requires a password.
${USERNAME} ALL=(ALL) ALL
# Narrow exceptions needed by 'bun run setup' (passwordless, pinned paths+args).
${USERNAME} ALL=(ALL) NOPASSWD: ${APT_BIN} update, ${APT_BIN} install -y libnss3-tools
${USERNAME} ALL=(ALL) NOPASSWD: ${DOCKER_BIN} compose up -d, ${DOCKER_BIN} compose down -v
SUDOERS
# Validate BEFORE installing: sudo reads /etc/sudoers.d live, so writing a
# broken file there even briefly can lock out sudo entirely.
if ! visudo -cf "$SUDOERS_TMP" >/dev/null 2>&1; then
    err "Generated sudoers file failed validation — not installing it."
    exit 1
fi
install -m 440 -o root -g root "$SUDOERS_TMP" "$SUDOERS_FILE"
ok "Scoped sudo granted for ${USERNAME} (password required except for setup commands)."

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
    elif [[ ${#USER_PASS} -lt 12 ]]; then
        warn "Password must be at least 12 characters (it guards sudo/root)."
    else
        # chpasswd reads stdin — the password never appears in argv.
        printf '%s:%s\n' "${USERNAME}" "${USER_PASS}" | chpasswd
        ok "Password set for ${USERNAME}."
        break
    fi
done
unset USER_PASS USER_PASS_CONFIRM

# ── 3. SSH Hardening ────────────────────────────────────────────────────────
step "3. SSH Hardening"
SSHD="/etc/ssh/sshd_config"
SSHD_DROPIN="/etc/ssh/sshd_config.d/00-ace-hardening.conf"

# WHY A DROP-IN, AND WHY '00-': sshd uses the FIRST value it obtains for a
# keyword. Cloud images ship /etc/ssh/sshd_config.d/50-cloud-init.conf with
# 'PasswordAuthentication yes', and the Include of that directory sits near the
# TOP of sshd_config. Appending our directives to the BOTTOM of sshd_config —
# as this script used to do — therefore silently loses: password auth stays
# enabled and the box looks hardened while it is not. A '00-' drop-in sorts
# ahead of 50-cloud-init and wins.
if [[ "$SSH_KEY_OK" != true ]]; then
    # SAFETY: disabling PasswordAuthentication + PermitRootLogin with no working
    # key is a guaranteed lockout. Only proceed if a key is confirmed present.
    warn "No verified SSH key for ${USERNAME}; SKIPPING SSH hardening to avoid lockout."
    warn "Add a key to /home/${USERNAME}/.ssh/authorized_keys, confirm you can log in,"
    warn "then re-run this script (or harden sshd manually)."
else
    SSHD_BAK="${SSHD}.bak.$(date +%Y%m%d%H%M%S)"
    cp "$SSHD" "$SSHD_BAK"
    mkdir -p /etc/ssh/sshd_config.d

    # Older images have no Include line at all — add one at the very top so our
    # drop-in still takes precedence over everything in the main file.
    if ! grep -qE '^[[:space:]]*Include[[:space:]]+/etc/ssh/sshd_config\.d/\*\.conf' "$SSHD"; then
        printf 'Include /etc/ssh/sshd_config.d/*.conf\n' | cat - "$SSHD" > "${SSHD}.new"
        mv "${SSHD}.new" "$SSHD"
        chmod 644 "$SSHD"
    fi

    # Comment out (don't delete) conflicting directives in the main file so the
    # effective config is obvious to whoever reads it next.
    sed -i -E 's/^[[:space:]]*(PermitRootLogin|PasswordAuthentication|PermitEmptyPasswords|MaxAuthTries|MaxStartups|ClientAliveInterval|ClientAliveCountMax|X11Forwarding|AllowUsers|KbdInteractiveAuthentication|ChallengeResponseAuthentication)[[:space:]]/#&/' "$SSHD"

    cat > "$SSHD_DROPIN" << EOF
# Managed by scripts/setup-vps.sh — sorts before 50-cloud-init.conf on purpose.
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitEmptyPasswords no
AuthenticationMethods publickey
MaxAuthTries 3
MaxStartups 3:50:10
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
AllowUsers ${USERNAME}
EOF
    chmod 644 "$SSHD_DROPIN"

    # Validate before applying; a bad config + restart can drop sshd entirely.
    if sshd -t 2>/dev/null; then
        # reload keeps existing connections alive if the new config is faulty in
        # a way -t didn't catch; a restart would kill your current session.
        systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
        # Socket-activated sshd (Ubuntu 24.04+) spawns a fresh sshd per
        # connection, so it picks the new config up on its own.
        systemctl is-active --quiet ssh.socket && systemctl restart ssh.socket 2>/dev/null || true

        # Report on the EFFECTIVE config, not on what we wrote — this is what
        # catches an override we failed to outrank.
        if sshd -T 2>/dev/null | grep -q '^passwordauthentication no'; then
            ok "SSH hardened (password auth off). Keep this session open and test a NEW login."
        else
            warn "sshd still reports passwordauthentication=yes — check /etc/ssh/sshd_config.d/"
            warn "for a drop-in that sorts before ${SSHD_DROPIN##*/}."
        fi
    else
        err "sshd config validation failed — reverting."
        rm -f "$SSHD_DROPIN"
        cp "$SSHD_BAK" "$SSHD"
        exit 1
    fi
fi

# ── 4. Firewall ─────────────────────────────────────────────────────────────
step "4. Firewall (UFW)"
if ufw status | grep -q "active" && ufw status | grep -q "Nginx Full"; then
    info "UFW already configured."
else
    ufw --force reset >/dev/null 2>&1
    ufw default deny incoming  >/dev/null
    ufw default allow outgoing >/dev/null
    ufw limit OpenSSH
    ufw allow 'Nginx Full'
    ufw logging low >/dev/null
    ufw --force enable
    ok "UFW enabled."
fi
# NOTE: UFW does NOT filter traffic to published Docker ports — Docker inserts
# its DNAT rules ahead of UFW's chains. That is handled in step 7 by forcing
# Docker to bind published ports to 127.0.0.1 only. Do not rely on UFW for it.

# ── 5. Fail2Ban ─────────────────────────────────────────────────────────────
step "5. Fail2Ban"
pkg_installed fail2ban || apt-get "${APT_OPTS[@]}" install fail2ban
# python3-systemd is what lets the journald backend actually read the journal.
pkg_installed python3-systemd || apt-get "${APT_OPTS[@]}" install python3-systemd || true

# Written on every run, not only on first install: Ubuntu 24.04 and other
# journald-only images have no /var/log/auth.log, so fail2ban's default file
# backend finds nothing and the sshd jail silently never bans anyone.
cat > /etc/fail2ban/jail.local << 'F2B'
# Managed by scripts/setup-vps.sh
[DEFAULT]
backend  = systemd
bantime  = 1h
findtime = 10m
maxretry = 5
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
mode    = aggressive
F2B
systemctl enable fail2ban >/dev/null 2>&1 || true
systemctl restart fail2ban || true
if fail2ban-client status sshd >/dev/null 2>&1; then
    ok "Fail2Ban running with an active sshd jail."
else
    warn "Fail2Ban is installed but the sshd jail is not reporting — check:"
    warn "  systemctl status fail2ban ; fail2ban-client status"
fi

# ── 6. Automatic Security Updates ───────────────────────────────────────────
step "6. Automatic Security Updates"
pkg_installed unattended-upgrades || apt-get "${APT_OPTS[@]}" install unattended-upgrades
# Also rewritten on every run — previously this config was only created when the
# package was absent, so a box with the package preinstalled got no schedule.
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now unattended-upgrades >/dev/null 2>&1 || true
ok "Unattended upgrades configured."

# ── 6b. Kernel / Network Hardening ──────────────────────────────────────────
# Deliberately does NOT touch net.ipv4.ip_forward or rp_filter — Docker needs
# forwarding on, and strict rp_filter breaks container return paths.
cat > /etc/sysctl.d/99-ace-hardening.conf << 'SYSCTL'
# Managed by scripts/setup-vps.sh
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_source_route = 0
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
SYSCTL
sysctl -q --system >/dev/null 2>&1 || true
ok "Kernel/network hardening applied."

# ── 7. Docker ───────────────────────────────────────────────────────────────
step "7. Docker"
if ! command -v docker &>/dev/null; then
    # NOTE: this is an unpinned curl|sh of a third-party script. It is the
    # vendor's documented install path; if your threat model doesn't allow it,
    # install docker.io/docker-ce from apt with the signed repo instead.
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh && rm -f /tmp/get-docker.sh
    ok "Docker installed."
else
    info "Docker already installed."
fi

# CRITICAL: `ports: - 5432:5432` in compose.yaml binds 0.0.0.0 and Docker's
# iptables DNAT rules are evaluated BEFORE UFW's filter chains — so a published
# port is reachable from the internet no matter what UFW says. That would put
# Postgres on the public interface with only its password in front of it.
# Setting the daemon's default bind address to 127.0.0.1 fixes every published
# port that doesn't name an explicit host IP, and survives daemon restarts.
DOCKER_DAEMON_JSON="/etc/docker/daemon.json"
mkdir -p /etc/docker
DOCKER_CFG_CHANGED=false
if [[ ! -f "$DOCKER_DAEMON_JSON" ]]; then
    cat > "$DOCKER_DAEMON_JSON" << 'DJSON'
{
  "ip": "127.0.0.1",
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
DJSON
    DOCKER_CFG_CHANGED=true
elif ! jq -e '.ip == "127.0.0.1"' "$DOCKER_DAEMON_JSON" >/dev/null 2>&1; then
    if jq '. + {ip: "127.0.0.1"}' "$DOCKER_DAEMON_JSON" > "${DOCKER_DAEMON_JSON}.new" 2>/dev/null; then
        mv "${DOCKER_DAEMON_JSON}.new" "$DOCKER_DAEMON_JSON"
        DOCKER_CFG_CHANGED=true
    else
        rm -f "${DOCKER_DAEMON_JSON}.new"
        warn "Could not merge into ${DOCKER_DAEMON_JSON}. Add '\"ip\": \"127.0.0.1\"' by hand,"
        warn "or published container ports will be exposed to the internet."
    fi
fi
if [[ "$DOCKER_CFG_CHANGED" == true ]]; then
    ok "Docker default publish address pinned to 127.0.0.1."
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
systemctl enable docker >/dev/null 2>&1 || true
if [[ "$DOCKER_CFG_CHANGED" == true ]]; then
    systemctl restart docker || systemctl start docker || true
else
    systemctl start docker 2>/dev/null || true
fi

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
# fallback.
#
# The token is fed to git through a GIT_ASKPASS helper reading a 0600 file.
# The previous approach — embedding it in an https://user:token@github.com URL —
# leaked it three ways: the full URL is visible in `ps`/`/proc/<pid>/cmdline`
# to every local user for the duration of the clone, `git pull <url>` records
# the URL (token included) in .git/FETCH_HEAD on disk, and it lands in the
# root shell history/sudo log of anyone who reruns the command.
CRED_FILE="/home/${USERNAME}/.git-credentials"
ASKPASS_SH="/home/${USERNAME}/.ace-askpass.sh"
ASKPASS_CREDS="/home/${USERNAME}/.ace-askpass.creds"
SECRET_FILES+=("$ASKPASS_SH" "$ASKPASS_CREDS")

# Make sure no persistent helper is configured and remove any stale plaintext
# credential file left by previous versions of this script.
su - "$USERNAME" -c "git config --global --unset-all credential.helper 2>/dev/null; true" || true
rm -f "$CRED_FILE"
# Git refuses to operate on a repo owned by another user; be explicit.
su - "$USERNAME" -c "git config --global --add safe.directory '${APP_DIR}' 2>/dev/null; true" || true

# Helper: prompt for GitHub credentials and stage them for GIT_ASKPASS.
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

    new_secret_file "$ASKPASS_CREDS" "${USERNAME}:${USERNAME}"
    printf '%s\n%s\n' "$GH_USER" "$GH_TOKEN" > "$ASKPASS_CREDS"

    install -m 700 -o "$USERNAME" -g "$USERNAME" /dev/null "$ASKPASS_SH"
    cat > "$ASKPASS_SH" << ASKPASS
#!/bin/sh
# Transient credential helper written by setup-vps.sh; deleted when it exits.
{ IFS= read -r _u; IFS= read -r _t; } < "${ASKPASS_CREDS}"
case "\$1" in
    Username*) printf '%s\n' "\$_u" ;;
    *)         printf '%s\n' "\$_t" ;;
esac
ASKPASS

    unset GH_USER GH_TOKEN
}

git_as_user() {  # git_as_user <command string, already quoted>
    su - "$USERNAME" -c "GIT_ASKPASS='${ASKPASS_SH}' GIT_TERMINAL_PROMPT=0 $1"
}

if [[ ! -d "${APP_DIR}/.git" ]]; then
    prompt_github_auth
    git_as_user "git clone '${REPO_URL}' '${APP_DIR}'"
    ok "Repository cloned (token not persisted to disk)."
else
    # Try an unauthenticated/cached pull first; if it fails, prompt and retry.
    if su - "$USERNAME" -c "GIT_TERMINAL_PROMPT=0 git -C '${APP_DIR}' pull --ff-only" 2>/dev/null; then
        ok "Repository updated."
    else
        prompt_github_auth
        # --ff-only on purpose: a deploy checkout should never auto-merge. If
        # this fails, the working tree has diverged — resolve it by hand.
        git_as_user "git -C '${APP_DIR}' pull --ff-only" || {
            err "git pull --ff-only failed. The deploy checkout has local commits or"
            err "changes. Inspect it: sudo -u ${USERNAME} git -C ${APP_DIR} status"
            exit 1
        }
        ok "Repository updated (token not persisted to disk)."
    fi
fi

rm -f "$ASKPASS_SH" "$ASKPASS_CREDS"

# ── 10. Install Dependencies & Run Setup ────────────────────────────────────
step "10. Dependencies & Setup"
su - "$USERNAME" -c "cd '${APP_DIR}' && '${BUN}' install"
su - "$USERNAME" -c "cd '${APP_DIR}' && '${BUN}' run setup"
ok "Dependencies installed, setup complete."

# ── 11. Production Environment Variables ────────────────────────────────────
step "11. Environment Variables"
ENV_FILE="${APP_DIR}/.env"
[[ -f "$ENV_FILE" ]] || { err ".env missing at ${ENV_FILE}"; exit 1; }
# Lock it down before it is populated, not after: 'bun run setup' creates it
# with the default 0644 umask and it is about to receive every production
# secret the app has.
chmod 600 "$ENV_FILE"
chown "${USERNAME}:${USERNAME}" "$ENV_FILE"

# Delegate .env configuration to Bun (handles prompts, derivation, and validation)
su - "$USERNAME" -c "cd '${APP_DIR}' && '${BUN}' run setup-env -- --domain '${DOMAIN}' --env-file '${ENV_FILE}'"
chmod 600 "$ENV_FILE"

# ── Recreate Docker container with updated .env credentials ──
# (The DB container was started in step 10 with dev defaults, but .env has now
#  been reconfigured with production values. Postgres only reads POSTGRES_PASSWORD
#  on first init of the data dir, so we must destroy the old volume and restart.)
# Run as root: the daemon is root-owned anyway, and this keeps `sudo docker` out
# of the deploy path. Project name still derives from ${APP_DIR}, so this
# manages the same stack 'bun run setup' created.
"${COMPOSE[@]}" down -v
"${COMPOSE[@]}" up -d

# Wait for readiness instead of a fixed sleep — on a cold volume Postgres
# initdb regularly takes longer than 5s and the migration then fails.
info "Waiting for the database to accept connections..."
DB_READY=false
for _ in $(seq 1 60); do
    if docker exec ace-blocker-db pg_isready -q 2>/dev/null; then DB_READY=true; break; fi
    sleep 2
done
[[ "$DB_READY" == true ]] || { err "Database did not become ready in 120s. Check: docker logs ace-blocker-db"; exit 1; }

# Re-run migrations on the fresh database
su - "$USERNAME" -c "cd '${APP_DIR}' && '${BUN}' run db:migrate"

# Provision the initial administrator only after the production database is
# ready. The password is read silently and passed to provision-admin.ts over
# stdin, never on argv. If the account already exists, provision-admin.ts keeps
# its existing password and only confirms/promotes the admin role.
echo ""
info "Configure the administrator account."
while true; do
    read -rp "  Admin email: " ADMIN_EMAIL
    if [[ "$ADMIN_EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
        break
    fi
    warn "Enter a valid administrator email address."
done

while true; do
    read -rsp "  Admin password: " ADMIN_PW
    echo ""
    read -rsp "  Confirm admin password: " ADMIN_PW_CONFIRM
    echo ""
    if [[ "$ADMIN_PW" != "$ADMIN_PW_CONFIRM" ]]; then
        warn "Passwords do not match. Try again."
    elif [[ ${#ADMIN_PW} -lt 12 ]]; then
        warn "Administrator password must be at least 12 characters."
    else
        break
    fi
done

# Keep the email out of shell interpolation by placing it in a short-lived,
# user-readable 0600 file, then expanding it as a quoted variable in the child
# shell. The password stays on stdin for the Bun provisioning script.
ADMIN_EMAIL_FILE="$(mktemp)"; SECRET_FILES+=("$ADMIN_EMAIL_FILE")
new_secret_file "$ADMIN_EMAIL_FILE" "${USERNAME}:${USERNAME}"
printf '%s\n' "$ADMIN_EMAIL" > "$ADMIN_EMAIL_FILE"
if ! printf '%s\n' "$ADMIN_PW" | su - "$USERNAME" -c "cd '${APP_DIR}' && ADMIN_EMAIL=\$(cat '${ADMIN_EMAIL_FILE}') && '${BUN}' scripts/provision-admin.ts --email \"\$ADMIN_EMAIL\" --username Admin --password-stdin"; then
    unset ADMIN_EMAIL ADMIN_PW ADMIN_PW_CONFIRM
    err "Administrator provisioning failed."
    exit 1
fi
rm -f "$ADMIN_EMAIL_FILE"
unset ADMIN_EMAIL ADMIN_PW ADMIN_PW_CONFIRM ADMIN_EMAIL_FILE
ok "Administrator account provisioned."

echo ""
ok "Environment configured and saved to ${ENV_FILE}"

# ── 12. Build ───────────────────────────────────────────────────────────────
step "12. Build Application"
su - "$USERNAME" -c "cd '${APP_DIR}' && '${BUN}' run build"
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
PrivateDevices=yes
PrivateMounts=yes
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
RestrictNamespaces=yes
RestrictSUIDSGID=yes
RestrictRealtime=yes
LockPersonality=yes
ProtectClock=yes
ProtectControlGroups=yes
ProtectHostname=yes
ProtectKernelLogs=yes
ProtectKernelModules=yes
ProtectKernelTunables=yes
ProtectProc=invisible
RemoveIPC=yes
UMask=0077
# The app binds :3000 and needs no capabilities at all.
CapabilityBoundingSet=
AmbientCapabilities=
SystemCallArchitectures=native
SystemCallFilter=@system-service
SystemCallErrorNumber=EPERM

# NOTE: MemoryDenyWriteExecute conflicts with JIT compilers. If the service
# fails to start with a mmap/JIT error in 'journalctl -u ace-blocker', remove
# this line first, then SystemCallFilter, before touching anything else here.
MemoryDenyWriteExecute=yes

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
    err "If the failure mentions JIT/mmap, drop MemoryDenyWriteExecute from the unit."
fi

# ── 14. Nginx Configuration ──────────────────────────────────────────────
step "14. Nginx Configuration"
SITE="/etc/nginx/sites-available/ace-blocker"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

# ── Real client IP (http context) ──
# Without this, every request from Cloudflare arrives with $remote_addr set to a
# Cloudflare edge IP, so better-auth's rate limiter (auth.ts: 50 requests /
# 5 min, keyed on X-Forwarded-For) buckets ALL users together. And because the
# old config forwarded $proxy_add_x_forwarded_for, the client's own
# X-Forwarded-For header was preserved as the left-most entry — which is the
# entry better-auth reads. Anyone could rotate that header per request and the
# login rate limit never triggered. We resolve the real IP from Cloudflare's
# published ranges and then overwrite (not append to) X-Forwarded-For.
REALIP_CONF="/etc/nginx/conf.d/ace-cloudflare-realip.conf"
CF_V4="$(mktemp)"; CF_V6="$(mktemp)"; SECRET_FILES+=("$CF_V4" "$CF_V6")
if curl -fsS --max-time 15 https://www.cloudflare.com/ips-v4 -o "$CF_V4" \
   && curl -fsS --max-time 15 https://www.cloudflare.com/ips-v6 -o "$CF_V6"; then
    {
        echo "# Generated by setup-vps.sh on $(date -Is). Refresh with:"
        echo "#   sudo bash scripts/setup-vps.sh   (or re-fetch cloudflare.com/ips-v4|v6)"
        # Validate each line so an error page or captive portal response can
        # never be injected as nginx directives.
        while read -r cidr; do
            [[ "$cidr" =~ ^[0-9a-fA-F:.]+/[0-9]{1,3}$ ]] && echo "set_real_ip_from ${cidr};"
        done < "$CF_V4"
        while read -r cidr; do
            [[ "$cidr" =~ ^[0-9a-fA-F:.]+/[0-9]{1,3}$ ]] && echo "set_real_ip_from ${cidr};"
        done < "$CF_V6"
        echo "real_ip_header CF-Connecting-IP;"
        echo "real_ip_recursive off;"
    } > "$REALIP_CONF"
    ok "Cloudflare real-IP ranges installed."
else
    echo "# Cloudflare IP list unavailable at setup time." > "$REALIP_CONF"
    warn "Could not fetch Cloudflare's IP ranges. If this origin sits behind the"
    warn "Cloudflare proxy, every visitor will share one rate-limit bucket until"
    warn "you populate ${REALIP_CONF}."
fi
rm -f "$CF_V4" "$CF_V6"

# ── WebSocket upgrade map (http context) ──
# 'Connection: upgrade' must only be sent when the client actually asked to
# upgrade; sending it unconditionally breaks keep-alive to the upstream.
cat > /etc/nginx/conf.d/ace-upgrade.conf << 'UPGRADE'
map $http_upgrade $connection_upgrade {
    default upgrade;
    ""      close;
}
server_tokens off;
UPGRADE

# HTTP/2 is enabled with a standalone `http2 on;` from nginx 1.25.1, and with
# the `listen … http2` parameter before that. Ubuntu 24.04 ships 1.24 and
# Debian 12 ships 1.22, where the new form is an unknown directive and `nginx -t`
# fails — so pick the syntax that matches the installed version.
NGINX_VER="$(nginx -v 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo 0.0.0)"
if printf '%s\n%s\n' "1.25.1" "$NGINX_VER" | sort -V -C; then
    SSL_LISTEN=$'listen 443 ssl;\n    listen [::]:443 ssl;\n    http2 on;'
else
    SSL_LISTEN=$'listen 443 ssl http2;\n    listen [::]:443 ssl http2;'
fi

# Single source of truth for the vhost — the config used to be duplicated three
# times, which is how the three copies drift apart.
write_nginx_site() {  # write_nginx_site <http|ssl>
    local mode="$1"
    {
        cat << CATCHALL
# ── Reject anything that isn't our hostname (direct-to-IP scans, host fuzzing) ──
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 444;
}

CATCHALL
        if [[ "$mode" == "ssl" ]]; then
            cat << REDIR
# ── HTTP → HTTPS redirect ──
server {
    listen 80;
    listen [::]:80;
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
    ${SSL_LISTEN}
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate         /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key     /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/${DOMAIN}/chain.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
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
    add_header Cross-Origin-Opener-Policy "same-origin" always;

    client_max_body_size 50m;
REDIR
        else
            cat << PLAIN
# ── HTTP only (pre-certificate) ──
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    client_max_body_size 50m;
PLAIN
        fi

        # Shared proxy block. X-Forwarded-For is SET, never appended: the client
        # does not get to choose the IP the app rate-limits on.
        cat << PROXY

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
PROXY
    } > "$SITE"
}

if [[ -d "$CERT_DIR" ]]; then
    info "SSL certificates found — writing HTTPS configuration."
    write_nginx_site ssl
    SSL_SKIP=true
else
    info "No SSL certificates yet — writing HTTP-only configuration."
    write_nginx_site http
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

    apt-get "${APT_OPTS[@]}" install certbot python3-certbot-dns-cloudflare

    # This token lives on disk at /root/.cloudflare.ini because certbot's
    # automatic renewal needs it. Created 0600 before the write so it is never
    # momentarily world-readable. Scope it to Zone:DNS:Edit on ONLY this
    # domain's zone — never an account-wide token — so a leak is contained.
    CF_INI="/root/.cloudflare.ini"
    new_secret_file "$CF_INI"
    printf 'dns_cloudflare_api_token = %s\n' "$CF_TOKEN" > "$CF_INI"

    if [[ -z "$EMAIL" ]]; then
        warn "No --email provided. Certbot requires an email for non-interactive registration."
        read -rp "  Email for Let's Encrypt registration: " EMAIL
        [[ -z "$EMAIL" ]] && { err "Email is required for SSL certificate."; exit 1; }
    fi

    info "Requesting SSL certificate for ${DOMAIN} and *.${DOMAIN}..."
    # --deploy-hook is stored in the renewal config: without it nginx keeps
    # serving the OLD certificate after each renewal until someone reloads it by
    # hand, i.e. the site starts serving an expired cert ~90 days in.
    certbot certonly --non-interactive --agree-tos \
        --dns-cloudflare --dns-cloudflare-credentials "$CF_INI" \
        --dns-cloudflare-propagation-seconds 30 \
        --email "$EMAIL" \
        --deploy-hook "systemctl reload nginx" \
        -d "${DOMAIN}" -d "*.${DOMAIN}" || {
        err "Certbot failed. Check the Cloudflare token and try:\n         sudo certbot certificates\n         sudo certbot renew --dry-run"
        exit 1
    }
    unset CF_TOKEN
    systemctl enable --now certbot.timer >/dev/null 2>&1 || true
    ok "SSL certificate obtained (renewal reloads nginx automatically)."
fi

# ── 16. Update Nginx with SSL ───────────────────────────────────────────────
step "16. Nginx SSL Configuration"

if [[ "$SSL_SKIP" == "true" ]]; then
    info "SSL Nginx config already applied (skipped)."
else
    write_nginx_site ssl
    nginx -t && systemctl restart nginx
    ok "Nginx SSL configuration applied."
fi

# ── 17. Database Backups ────────────────────────────────────────────────────
step "17. Database Backups"

# Backups run as ROOT from /etc/cron.d, and live outside the app user's home.
# Rationale: the dumps are a full copy of every credential and customer record
# in the database. When they lived in /home/${USERNAME} and were driven by the
# app user's crontab, anyone who popped the web app could read every historical
# dump, delete them, or edit backup_db.sh — and, because that script needed
# `sudo docker`, use it to escalate to root. Running them as root removes the
# `sudo docker` requirement entirely and puts the dumps out of the app's reach.
BACKUP_DIR="/var/backups/ace-blocker"
BACKUP_SCRIPT="/usr/local/sbin/ace-blocker-backup.sh"
BACKUP_LOG="/var/log/ace-blocker-backup.log"
install -d -m 700 -o root -g root "$BACKUP_DIR"

# Migrate anything the previous layout left behind.
OLD_BACKUP_DIR="/home/${USERNAME}/backups"
if [[ -d "$OLD_BACKUP_DIR" ]]; then
    find "$OLD_BACKUP_DIR" -maxdepth 1 -type f \( -name '*.sql.gz' -o -name '*.sql.gz.gpg' \) \
        -exec mv -n {} "$BACKUP_DIR"/ \; 2>/dev/null || true
    rm -f "${OLD_BACKUP_DIR}/backup_db.sh"
    info "Migrated old backups from ${OLD_BACKUP_DIR} to ${BACKUP_DIR}."
fi
if crontab -u "$USERNAME" -l 2>/dev/null | grep -q "backup_db"; then
    (crontab -u "$USERNAME" -l 2>/dev/null | grep -v "backup_db" || true) | crontab -u "$USERNAME" -
    info "Removed the old user-level backup cron entry."
fi

# ── Backblaze B2 (optional off-site copy) ──
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
    if [[ ! "$B2_BUCKET" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{4,48}$ ]]; then
        err "Invalid B2 bucket name: '${B2_BUCKET}'"; exit 1
    fi
fi

B2_ENABLED=false
if [[ -n "$B2_KEY_ID" ]]; then
    B2_ENABLED=true

    # Prefer the signed distro package; fall back to the vendor script only if
    # apt has no rclone (curl|bash is the weaker supply-chain path).
    if ! command -v rclone &>/dev/null; then
        info "Installing rclone..."
        apt-get "${APT_OPTS[@]}" install rclone \
            || curl -fsSL https://rclone.org/install.sh | bash \
            || { err "rclone install failed."; exit 1; }
    fi

    # rclone config is root-only now, matching the backup job's identity — and
    # keeping the B2 credentials away from a compromised app process.
    RCLONE_DIR="/root/.config/rclone"
    install -d -m 700 -o root -g root "$RCLONE_DIR"
    # `rclone obscure <key>` would put the application key in argv, where every
    # local user can read it out of /proc. Feed it on stdin instead.
    OBSCURED_KEY="$(printf '%s\n' "$B2_APP_KEY" | rclone obscure -)"
    new_secret_file "${RCLONE_DIR}/rclone.conf"
    cat > "${RCLONE_DIR}/rclone.conf" << RCLONECONF
[b2backup]
type = b2
account = ${B2_KEY_ID}
key = ${OBSCURED_KEY}
RCLONECONF
    # Remove the old user-owned copy if a previous run created one.
    rm -f "/home/${USERNAME}/.config/rclone/rclone.conf"

    # Verify the bucket is reachable with these credentials before relying on it.
    if rclone lsd "b2backup:${B2_BUCKET}" &>/dev/null; then
        ok "B2 bucket '${B2_BUCKET}' reachable — off-site backups enabled."
    else
        warn "Could not reach B2 bucket '${B2_BUCKET}' with the given key."
        warn "Backups will still run locally; fix the key/bucket and re-run to enable off-site."
        B2_ENABLED=false
    fi
fi
unset B2_APP_KEY OBSCURED_KEY

# ── Backup encryption passphrase ──
# Dumps leaving the machine unencrypted is not acceptable, and setup-env.ts
# never prompts for BACKUP_PASSPHRASE — so generate one if it's missing.
if ! grep -q '^BACKUP_PASSPHRASE=' "$ENV_FILE" 2>/dev/null || \
   grep -q '^BACKUP_PASSPHRASE=""$' "$ENV_FILE" 2>/dev/null; then
    GEN_PASS="$(head -c 32 /dev/urandom | base64 | tr -d '\n=')"
    sed -i '/^BACKUP_PASSPHRASE=/d' "$ENV_FILE"
    printf 'BACKUP_PASSPHRASE="%s"\n' "$GEN_PASS" >> "$ENV_FILE"
    chmod 600 "$ENV_FILE"; chown "${USERNAME}:${USERNAME}" "$ENV_FILE"
    echo ""
    warn "═══════════════════════════════════════════════════════════════"
    warn "A backup encryption passphrase was generated and stored in .env:"
    echo -e "${B}    ${GEN_PASS}${NC}"
    warn "STORE IT IN YOUR PASSWORD MANAGER NOW. It also lives on this server,"
    warn "so if the server is lost you cannot decrypt the off-site backups"
    warn "without your own copy."
    warn "═══════════════════════════════════════════════════════════════"
    echo ""
    unset GEN_PASS
fi

# ── Backup script ──
install -m 700 -o root -g root /dev/null "$BACKUP_SCRIPT"
cat > "$BACKUP_SCRIPT" << 'BACKUPSCRIPT'
#!/bin/bash
set -euo pipefail
umask 077  # backups readable only by owner (root)

# Never let two runs overlap (a slow dump + the daily timer = corrupt output).
exec 9>/var/lock/ace-blocker-backup.lock
flock -n 9 || { echo "Another backup is running; skipping."; exit 0; }

ENV_FILE="REPLACE_APP_DIR/.env"
BACKUP_DIR="REPLACE_BACKUP_DIR"
B2_BUCKET="REPLACE_B2_BUCKET"

# Safely load only the vars we need, WITHOUT executing the .env as shell.
# Using 'source' breaks (and is a minor injection risk) when a secret contains
# characters like '$', backticks, or spaces; under 'set -u' a '$VAR' inside a
# password aborts the whole script. This reads KEY=VALUE literally instead and
# reverses the quoting scheme setup-env.ts writes (double quotes, \" and \\).
while IFS='=' read -r _k _v || [[ -n "${_k:-}" ]]; do
    case "$_k" in
        POSTGRES_USER|POSTGRES_DB|POSTGRES_PASSWORD|BACKUP_PASSPHRASE)
            if [[ "$_v" == '"'*'"' ]]; then
                _v="${_v:1:${#_v}-2}"; _v="${_v//\\\"/\"}"; _v="${_v//\\\\/\\}"
            elif [[ "$_v" == "'"*"'" ]]; then
                _v="${_v:1:${#_v}-2}"
            fi
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

BACKUP_PATH="${BACKUP_DIR}/db_$(date +%Y%m%d_%H%M%S).sql"

# 1. Dump the database from the running container.
#    The password goes in over stdin: `docker exec -e PGPASSWORD=secret` would
#    expose it in `ps` to every local user, and — when run through sudo — write
#    it verbatim into /var/log/auth.log on every single run.
printf '%s\n' "$POSTGRES_PASSWORD" | docker exec -i ace-blocker-db \
    sh -c 'IFS= read -r PGPASSWORD; export PGPASSWORD; exec pg_dump -U "$0" -d "$1"' \
    "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_PATH"

# A truncated dump that still "succeeds" is worse than no backup at all.
if [[ ! -s "$BACKUP_PATH" ]]; then
    echo "ERROR: pg_dump produced an empty file — discarding." >&2
    rm -f "$BACKUP_PATH"
    exit 1
fi
gzip -f "$BACKUP_PATH"

# 2. Encrypt at rest if BACKUP_PASSPHRASE is set in .env. Requires 'gpg'.
if [[ -n "$BACKUP_PASSPHRASE" ]] && command -v gpg >/dev/null 2>&1; then
    printf '%s' "$BACKUP_PASSPHRASE" | gpg --batch --yes --pinentry-mode loopback \
        --passphrase-fd 0 --cipher-algo AES256 \
        -o "${BACKUP_PATH}.gz.gpg" -c "${BACKUP_PATH}.gz"
    rm -f "${BACKUP_PATH}.gz"
    FINAL="${BACKUP_PATH}.gz.gpg"
else
    FINAL="${BACKUP_PATH}.gz"
    if [[ -n "$B2_BUCKET" ]]; then
        echo "WARNING: BACKUP_PASSPHRASE unset — uploading an UNENCRYPTED dump." >&2
    fi
fi

# 3. Off-site copy to Backblaze B2 (only if configured at setup time).
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

# 4. Local retention: keep 7 days locally. Prunes every extension we may have
#    produced — pinning a single one leaked files forever whenever encryption
#    was toggled on or off.
find "$BACKUP_DIR" -maxdepth 1 -type f \
    \( -name 'db_*.sql' -o -name 'db_*.sql.gz' -o -name 'db_*.sql.gz.gpg' \) \
    -mtime +7 -delete
echo "Backup completed: ${FINAL}"
BACKUPSCRIPT

# Use | as the sed delimiter: paths contain / and would break s/// silently.
sed -i "s|REPLACE_APP_DIR|${APP_DIR}|g"       "$BACKUP_SCRIPT"
sed -i "s|REPLACE_BACKUP_DIR|${BACKUP_DIR}|g" "$BACKUP_SCRIPT"
# Inject the bucket name only if B2 was successfully enabled; otherwise leave it
# empty so the upload block is skipped and backups stay local-only.
if [[ "$B2_ENABLED" == true ]]; then
    sed -i "s|REPLACE_B2_BUCKET|${B2_BUCKET}|g" "$BACKUP_SCRIPT"
else
    sed -i "s|REPLACE_B2_BUCKET||g" "$BACKUP_SCRIPT"
fi

# System cron entry (root), replacing the old per-user crontab job.
cat > /etc/cron.d/ace-blocker-backup << CRON
# Managed by scripts/setup-vps.sh — nightly database backup.
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
0 3 * * * root ${BACKUP_SCRIPT} >> ${BACKUP_LOG} 2>&1
CRON
chmod 644 /etc/cron.d/ace-blocker-backup
# Create it only if absent — `install /dev/null` would truncate the history.
[[ -f "$BACKUP_LOG" ]] || install -m 600 -o root -g root /dev/null "$BACKUP_LOG"

cat > /etc/logrotate.d/ace-blocker-backup << ROTATE
${BACKUP_LOG} {
    weekly
    rotate 8
    compress
    missingok
    notifempty
    create 0600 root root
}
ROTATE
ok "Daily backup scheduled at 03:00 (root cron, logs to ${BACKUP_LOG})."

if [[ "$B2_ENABLED" == true ]]; then
    ok "Backups: local (7-day) + Backblaze B2 off-site (30-day), GPG-encrypted."
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

# Security assertions — these are the regressions that are easy to reintroduce
# and invisible until something is already wrong.
check "! ss -Hltn | grep -qE '(0\.0\.0\.0|\[::\]|\*):5432'" \
                                                     "Postgres is NOT listening on a public interface"
check "[[ \$(stat -c %a '${ENV_FILE}') == 600 ]]"    ".env is 0600"
if [[ "$SSH_KEY_OK" == true ]]; then
    check "sshd -T 2>/dev/null | grep -q '^passwordauthentication no'" \
                                                     "SSH password authentication is disabled"
    check "sshd -T 2>/dev/null | grep -q '^permitrootlogin no'" \
                                                     "SSH root login is disabled"
fi
check "test -x '${BACKUP_SCRIPT}'"                   "Backup script installed (root-only)"

echo ""
if [[ -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
    check "curl -s -o /dev/null -w '%{http_code}' https://${DOMAIN} | grep -q '2..\|3..'" \
                                                     "HTTPS is accessible at https://${DOMAIN}"
    # Exercises the full renewal path (DNS challenge + the nginx deploy hook)
    # against LE staging. Advisory only — staging flakiness or a rate limit
    # shouldn't fail an otherwise good deploy.
    info "Testing certificate auto-renewal (this takes ~30s)..."
    if certbot renew --dry-run --cert-name "${DOMAIN}" &>/dev/null; then
        ok "Certificate auto-renewal works"
    else
        warn "Renewal dry-run failed. Investigate before the cert expires:"
        warn "  sudo certbot renew --dry-run --cert-name ${DOMAIN}"
    fi
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
