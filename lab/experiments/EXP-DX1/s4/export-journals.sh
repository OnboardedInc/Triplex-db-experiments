#!/usr/bin/env bash
# [DX-S4] Why: extract native journal row texts from a fresh read-only SQL clone. Rejected: another full transactor stack just to read journal rows.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd);p=$S4_PREFIX;out=$S4_EVIDENCE/$p
bash "$here/footprint-inner.sh" tx2-dxh5-seed-1000-pg-data 1000 42775 442410 97654944 > "$out/footprint-stdout.json"
docker start "$p-pg" >/dev/null
for i in {1..60}; do docker exec "$p-pg" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1 && break;sleep 1;done
docker run --pull never --name "$p-journals" --network "container:$p-pg" --memory 1500m \
 -e DATOMIC_JAVA_OPTS='-Xms128m -Xmx768m -Ddatomic.objectCacheMax=64m' -e DATOMIC_EXT_CLASSPATH=/s4 \
 -v "$here:/s4:ro" -v "$out:/attempt" --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m journal-export \
 'datomic:sql://?jdbc:postgresql://127.0.0.1:5432/datomic?user=datomic&password=datomic' > "$out/export.jsonl" 2> "$out/journal.stderr"
docker inspect "$p-journals" > "$out/journal-container.json"
docker stop -t 20 "$p-pg" >/dev/null
