#!/usr/bin/env bash
# [DX-T1-11] Why: even a read-only seed inventory owns its small container until cleanup and preserves the live disk reading.
# Rejected: touch a sealed PG data directory to learn whether a clone fits.
set -euo pipefail
tag=${1:?tx2-dxt1-tag};[[ $tag =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
out=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}/$tag
mkdir "$out"
python3 - "$out/disk-before.json" <<'DISK'
import shutil,json,sys,time
d=shutil.disk_usage('.');assert d.free>=15*1024**3
json.dump({'at':int(time.time()*1000),'freeBytes':d.free,'floorBytes':15*1024**3,'availableAboveFloor':d.free-15*1024**3},open(sys.argv[1],'w'),indent=2)
DISK
lock=$HOME/Claude/Projects/triplex-db-2/locks/measure
while ! mkdir "$lock" 2>/dev/null;do sleep 5;done
printf '{"id":"DX-T1","pid":%s,"kind":"writer-arms"}\n' "$$" > "$lock/owner.json"
export DX_R3_PAIR_LEASE_PID=$$
cleanup() {
 rc=$?;trap - EXIT TERM INT
 bash lab/experiments/EXP-DX1/stack/up.sh "$tag" --inventory > "$out/remaining.txt" || exit 1
 [[ ! -s $out/remaining.txt ]] || exit 1
 rm "$lock/owner.json";rmdir "$lock";exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM INT
git rev-parse HEAD > "$out/head.txt"
bash lab/experiments/EXP-DX1/stack/up.sh "$tag" --seed-size tx2-dxs5-seed-100000-pg-data > "$out/seed-size.txt" 2> "$out/container.json"
df -k . > "$out/disk-after.txt"
