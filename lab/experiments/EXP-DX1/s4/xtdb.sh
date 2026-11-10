#!/usr/bin/env bash
# [DX-S4] Why: local log/storage are both counted after flush and observed idle compaction. Rejected: counting only compressed Arrow files.
set -euo pipefail
p=$S4_PREFIX; out=$S4_EVIDENCE/$p; here=$(cd "$(dirname "$0")" && pwd)
python3 "$here/check-input.py" "$S4_INPUT" > "$out/input-check.json"
docker image inspect ghcr.io/xtdb/xtdb:2.2.0 node:22.23.2-bookworm-slim > "$out/xtdb-images.json"
docker network create "$p-net" >/dev/null
docker volume create "$p-data" >/dev/null
docker run -d --pull never --name "$p-xtdb" --network "$p-net" --memory 4g -e JDK_JAVA_OPTIONS='-Xms128m -Xmx2g -XX:MaxDirectMemorySize=1g' -v "$here/xtdb.yaml:/etc/xtdb.yaml:ro" -v "$p-data:/var/lib/xtdb" ghcr.io/xtdb/xtdb:2.2.0 -f /etc/xtdb.yaml > "$out/xtdb-id.txt"
ready=false
for i in {1..90}; do if docker exec "$p-xtdb" wget -qO- http://127.0.0.1:8080/healthz/alive > "$out/health.json" 2>/dev/null; then ready=true;break;fi;sleep 1;done
$ready || exit 1
docker run --pull never --name "$p-driver" --network "$p-net" --memory 2g -e "S4_PREFIX=$p" -v "$here:/s4:ro" -v "$S4_INPUT:/input:ro" node:22.23.2-bookworm-slim node /s4/xtdb.mjs > "$out/driver.jsonl" 2> "$out/driver.stderr"
docker inspect "$p-xtdb" "$p-driver" > "$out/containers.json"
docker exec "$p-xtdb" wget -qO- --post-data= http://127.0.0.1:8080/system/finish-block > "$out/finish-block.json"
# Stable no-work queue observations after the flush, retained rather than inferred from elapsed time.
quiet=0
for i in {1..40}; do
 docker exec "$p-xtdb" wget -qO- http://127.0.0.1:8080/metrics > "$out/metrics-$i.txt"
 cpu=$(docker stats --no-stream --format '{{.CPUPerc}}' "$p-xtdb")
 printf '%s %s\n' "$(date -u +%FT%TZ)" "$cpu" >> "$out/idle-cpu.txt"
 if python3 - "$out/metrics-$i.txt" "$cpu" <<'PY'
import sys,re
s=[x for x in open(sys.argv[1]) if re.match(r'^compactor_jobs_available(?:\{|\s)',x)]
assert s and all(float(x.split()[-1])==0 for x in s)
assert float(sys.argv[2].strip('%'))<5
PY
 then quiet=$((quiet+1));else quiet=0;fi
 [[ $quiet -lt 12 ]] || break
 sleep 5
done
[[ $quiet -ge 12 ]] || { echo 'compaction not observed idle' >&2;exit 1; }
docker exec "$p-xtdb" find /var/lib/xtdb -type f > "$out/files.txt"
docker stop -t 30 "$p-xtdb" >/dev/null
docker run --rm --pull never --name "$p-du" -v "$p-data:/data:ro" postgres:17-alpine sh -c 'du -sk /data; du -sk /data/log; du -sk /data/storage; find /data -type f -exec stat -c "%s %n" {} \;' > "$out/stopped-du.txt"
cat "$out/stopped-du.txt" | head -4
