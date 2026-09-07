#!/usr/bin/env bash
set -euo pipefail

RD='\033[0;31m'; GR='\033[0;32m'; YL='\033[1;33m'; BL='\033[0;34m'; B='\033[1m'; NC='\033[0m'
info() { echo -e "${BL}[INFO]${NC}    $*"; }
ok() { echo -e "${GR}[OK]${NC}      $*"; }
warn() { echo -e "${YL}[WARN]${NC}    $*"; }
err() { echo -e "${RD}[ERROR]${NC}   $*"; }
step() { echo -e "\n${B}${BL}═══ $* ═══${NC}\n"; }

SECRET_FILES=()
cleanup_secrets() {
    local f
    for f in ${SECRET_FILES[@]+"${SECRET_FILES[@]}"}; do
        [[ -n "$f" && -e "$f" ]] && rm -f "$f"
    done
}

new_secret_file() {
    local path="$1" owner="${2:-root:root}"
    install -m 600 -o "${owner%%:*}" -g "${owner##*:}" /dev/null "$path"
}

pkg_installed() { dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -q 'ok installed'; }
run_as_deploy() { runuser -u "$USERNAME" -- "$@"; }

read_env_value() {
    local key="$1" file="$2" line value
    line="$(grep -m1 -E "^${key}=" "$file" 2>/dev/null || true)"
    [[ -n "$line" ]] || return 1
    value="${line#*=}"
    if [[ "$value" == '"'*'"' ]]; then
        value="${value:1:${#value}-2}"
        value="${value//\\\"/\"}"
        value="${value//\\\\/\\}"
    elif [[ "$value" == "'"*"'" ]]; then
        value="${value:1:${#value}-2}"
    fi
    printf '%s' "$value"
}

parse_args() {
    DOMAIN='aceblocker.com'
    USERNAME='aceblocker'
    EMAIL=''
    CF_TOKEN=''
    DOCKER_GROUP=false
    REVISION=''
    B2_KEY_ID="${B2_KEY_ID:-}"
    B2_APP_KEY="${B2_APP_KEY:-}"
    B2_BUCKET="${B2_BUCKET:-}"

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --domain) [[ $# -ge 2 && -n "${2:-}" ]] || { err "$1 requires a value"; exit 1; }; DOMAIN="$2"; shift 2 ;;
            --username) [[ $# -ge 2 && -n "${2:-}" ]] || { err "$1 requires a value"; exit 1; }; USERNAME="$2"; shift 2 ;;
            --email) [[ $# -ge 2 && -n "${2:-}" ]] || { err "$1 requires a value"; exit 1; }; EMAIL="$2"; shift 2 ;;
            --cf-token) [[ $# -ge 2 && -n "${2:-}" ]] || { err "$1 requires a value"; exit 1; }; CF_TOKEN="$2"; shift 2 ;;
            --docker-group) DOCKER_GROUP=true; shift ;;
            --b2-key-id) [[ $# -ge 2 && -n "${2:-}" ]] || { err "$1 requires a value"; exit 1; }; B2_KEY_ID="$2"; shift 2 ;;
            --b2-app-key) [[ $# -ge 2 && -n "${2:-}" ]] || { err "$1 requires a value"; exit 1; }; B2_APP_KEY="$2"; shift 2 ;;
            --b2-bucket) [[ $# -ge 2 && -n "${2:-}" ]] || { err "$1 requires a value"; exit 1; }; B2_BUCKET="$2"; shift 2 ;;
            --revision) [[ $# -ge 2 && -n "${2:-}" ]] || { err "$1 requires a value"; exit 1; }; REVISION="$2"; shift 2 ;;
            --help)
                cat <<'HELP'
Usage: sudo bash scripts/setup-vps.sh [options]
  --domain <domain>        Production domain (default: aceblocker.com)
  --username <name>        SSH/deploy user (default: aceblocker)
  --email <email>          Let's Encrypt contact email
  --cf-token <token>       Cloudflare DNS token (prompted if omitted)
  --docker-group           Explicitly grant deploy user root-equivalent Docker access
  --b2-key-id <id>         Backblaze B2 key id
  --b2-app-key <key>       Backblaze B2 application key
  --b2-bucket <bucket>     Backblaze B2 bucket
  --revision <git-ref>     Deploy an explicit commit/tag/ref; defaults to fetched origin/main
HELP
                exit 0 ;;
            *) err "Unknown option: $1"; exit 1 ;;
        esac
    done

    [[ "$DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$ ]] || { err "Invalid domain: $DOMAIN"; exit 1; }
    [[ "$USERNAME" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]] || { err "Invalid username: $USERNAME"; exit 1; }
    [[ -z "$EMAIL" || "$EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || { err "Invalid email: $EMAIL"; exit 1; }
    [[ -z "$B2_BUCKET" || "$B2_BUCKET" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{4,48}$ ]] || { err "Invalid B2 bucket: $B2_BUCKET"; exit 1; }
    [[ -z "$REVISION" || "$REVISION" =~ ^[A-Za-z0-9._/@+-]+$ ]] || { err "Invalid revision: $REVISION"; exit 1; }

    APP_DIR="/home/${USERNAME}/ace-blocker-site"
    BUN_VERSION='1.4.1'
    BUN="/home/${USERNAME}/.bun/bin/bun"
    RUNTIME_USER='aceblocker-app'
    CONFIG_DIR='/etc/ace-blocker'
    DB_COMPOSE="${CONFIG_DIR}/compose.yaml"
    DB_ENV="${CONFIG_DIR}/database.env"
    BACKUP_ENV="${CONFIG_DIR}/backup.env"
    REPO_URL='https://github.com/Linea-Software/ace-blocker-site.git'
}
