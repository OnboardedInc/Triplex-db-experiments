#!/usr/bin/env bash
# [DX-B9] Why: the retained seed is no longer needed only after the final clone hold has exited.
# Rejected: deleting a seed while a queued arm can still need it, or taking a lock during that wait.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9
out=$root/final-owned-cleanup
mkdir "$out"
python3 - "$root/default-mixed-1/exit.json" <<'PY'
import json,sys
v=json.load(open(sys.argv[1]));assert v['exit']==0 and v['heldSeconds']<=1200
PY
python3 -c 'import shutil;assert shutil.disk_usage("/System/Volumes/Data").free>=15*1024**3'
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
printf '{"id":"DX-B9","pid":%d}\n' $$ > "$lock/owner.json"
watchdog=
cleanup(){ rc=$?;trap - EXIT TERM INT;[[ -z $watchdog ]] || kill "$watchdog" 2>/dev/null || true;sh lab/bin/host-quiet.sh > "$out/host-after.jsonl" || true;python3 - "$lock/owner.json" $$ <<'PY'
import json,sys
assert json.load(open(sys.argv[1]))=={'id':'DX-B9','pid':int(sys.argv[2])}
PY
rm "$lock/owner.json";rmdir "$lock";exit "$rc"; }
trap cleanup EXIT
trap 'exit 124' TERM INT
(sleep 300;kill -TERM $$) & watchdog=$!
sh lab/bin/host-quiet.sh > "$out/host-before.jsonl" || true
volume=tx2-dxb9-seed-clone-1-seed-pg-data
docker ps -a --filter "volume=$volume" --format '{{.Names}}' > "$out/attachments.txt"
[[ ! -s $out/attachments.txt ]]
docker volume inspect "$volume" > "$out/seed-volume-before.json"
docker volume rm "$volume" > "$out/removed.txt"
docker volume ls --filter "name=$volume" --format '{{.Name}}' > "$out/seed-volume-after.txt"
[[ ! -s $out/seed-volume-after.txt ]]
# Other B9 gate holds may still be queued/running; prefix-wide inventory is informational here.
docker ps -a --filter name=tx2-dxb9- --format '{{.Names}}' > "$out/owned-containers-at-cleanup.txt"
docker network ls --filter name=tx2-dxb9- --format '{{.Name}}' > "$out/owned-networks-at-cleanup.txt"
docker volume ls --filter name=tx2-dxb9- --format '{{.Name}}' > "$out/owned-volumes-at-cleanup.txt"
python3 lab/experiments/EXP-DX1/b9/compress-evidence.py
printf '{"removedVolume":"%s","attachmentsEmpty":true,"absenceObserved":true,"semanticVerdict":null,"keepAwake":false}\n' "$volume" > "$out/result.json"
