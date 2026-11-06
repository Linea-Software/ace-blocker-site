#!/usr/bin/env bash
# Maintain the BunnyCDN origin IP allowlist used to trust country headers.
# Run as root during deployment and daily via /etc/cron.d/ace-bunny-geo.
set -euo pipefail

[[ "$(id -u)" -eq 0 ]] || { echo 'Bunny country IP refresh requires root.' >&2; exit 1; }
command -v nginx >/dev/null || { echo 'Nginx is required.' >&2; exit 1; }

exec 9>/run/lock/ace-bunny-geo.lock
flock -n 9 || exit 0

target=/etc/nginx/ace-bunny-edges.geo
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

curl -fsS --retry 2 --connect-timeout 5 --max-time 30 \
    https://api.bunny.net/system/edgeserverlist/plain -o "$tmpdir/v4"
curl -fsS --retry 2 --connect-timeout 5 --max-time 30 \
    https://api.bunny.net/system/edgeserverlist/ipv6/plain -o "$tmpdir/v6"

write_addresses() {
    local family="$1" path="$2" address
    local count=0
    while IFS= read -r address || [[ -n "$address" ]]; do
        address="${address%$'\r'}"
        if [[ "$family" == 4 ]]; then
            [[ "$address" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || return 1
        else
            [[ "$address" =~ ^[0-9A-Fa-f:]+$ ]] || return 1
        fi
        printf '%s 1;\n' "$address"
        ((count += 1))
    done < "$path"
    ((count >= 10))
}

{
    echo '# Auto-generated from the official BunnyCDN edge IP feeds. Do not edit.'
    write_addresses 4 "$tmpdir/v4"
    write_addresses 6 "$tmpdir/v6"
} > "$tmpdir/geo" || { echo 'Invalid or incomplete BunnyCDN IP feed.' >&2; exit 1; }

if [[ -f "$target" ]] && cmp -s "$tmpdir/geo" "$target"; then
    exit 0
fi

if [[ -f "$target" ]]; then
    cp -p "$target" "$tmpdir/previous"
fi
install -m 0644 "$tmpdir/geo" "$target.new"
mv -f "$target.new" "$target"
# Initial VPS setup validates and reloads Nginx after writing its vhost.
[[ "${1:-}" == "--prepare" ]] && exit 0
if ! nginx -t || ! systemctl reload nginx; then
    if [[ -f "$tmpdir/previous" ]]; then
        cp -p "$tmpdir/previous" "$target.new"
        mv -f "$target.new" "$target"
        nginx -t && systemctl reload nginx || true
    else
        rm -f "$target"
    fi
    echo 'Nginx rejected the BunnyCDN IP update; previous allowlist restored.' >&2
    exit 1
fi
