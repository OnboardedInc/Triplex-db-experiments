#!/usr/bin/env bash
# [DX-S4] Why: the public entry point owns its lock, cleanup and admission. Rejected: trusting an undocumented caller to keep the seed safe.
set -euo pipefail
[[ $# == 5 ]] || { echo 'usage: footprint.sh STOPPED-PG-VOLUME SUBJECTS COMMANDS ROWS EXPORT-BYTES' >&2; exit 2; }
[[ $1 == tx2-dxh5-seed-1000-pg-data || $1 =~ ^tx2-dxs4-[a-z0-9-]+$ ]] || { echo 'only the sealed seed and tx2-dxs4-* volumes are authorized' >&2; exit 2; }
for n in "${@:2}"; do [[ $n =~ ^[1-9][0-9]*$ ]] || exit 2; done
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../../../.." && pwd)
cd "$root"
exec bash "$here/launch.sh" "tx2-dxs4-footprint-$(date +%s)-$$" footprint-inner.sh "$@"
