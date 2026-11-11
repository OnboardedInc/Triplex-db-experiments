#!/usr/bin/env bash
# [DX-S5] Why: correlate actual broker listeners, JVM state and SQL sessions during a failed peer start.
# Rejected: inferring transactor health from its container running flag.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
python3 - <<'PY'
import json,os
s=json.load(open('/Users/sam/Claude/Projects/triplex-db-2/locks/measure/owner.json'))
assert s['id']=='DX-S5' and s['kind']=='diagnose-80000';os.kill(s['pid'],0)
PY
prefix=tx2-dxs5-seed-100000
date -u
for role in tx gw-w gw-r; do
 name=$prefix-$role
 docker inspect --format '{{.Name}} {{json .State}} {{json .NetworkSettings.Networks}}' "$name"
 docker logs "$name"
 docker exec "$name" sh -c 'echo LISTENERS; cat /proc/net/tcp /proc/net/tcp6; echo TOOLS; command -v jcmd; echo PROCESSES; ps -ef' || true
 docker exec "$name" sh -c 'p=$(jcmd -l | awk "/clojure.main/{print \$1;exit}"); [ -n "$p" ] || p=1; jcmd "$p" GC.heap_info; jcmd "$p" VM.flags; jcmd "$p" Thread.print' || true
done
docker exec "$prefix-pg" psql -U postgres -d datomic -x -c 'SHOW max_connections;' -c "SELECT pid,state,wait_event_type,wait_event,left(query,200) AS query FROM pg_stat_activity;" -c "SELECT id,rev,map,octet_length(val) FROM datomic_kvs WHERE map IS NOT NULL LIMIT 50;"
