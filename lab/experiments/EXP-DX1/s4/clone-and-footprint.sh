#!/usr/bin/env bash
# [DX-S4] Why: use one scarce quiet window for maintenance and the transactor-free footprint. Rejected: another lock wait just to re-read unchanged physical bytes.
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
base=$S4_PREFIX
clone_rc=0
bash "$here/datomic.sh" clone || clone_rc=$?
p=$base-footprint
mkdir -p "$S4_EVIDENCE/$p"
S4_PREFIX=$p bash "$here/footprint-inner.sh" tx2-dxh5-seed-1000-pg-data 1000 42775 442410 97654944 > "$S4_EVIDENCE/$p/stdout.json"
footprint_rc=$?
printf '{"clone_exit":%s,"footprint_exit":%s}\n' "$clone_rc" "$footprint_rc" > "$S4_EVIDENCE/$base/components.json"
[[ $clone_rc == 0 && $footprint_rc == 0 ]]
