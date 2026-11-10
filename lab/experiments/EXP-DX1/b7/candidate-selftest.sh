#!/usr/bin/env bash
# [DX-B7] Why: use otherwise idle owned VM CPUs for isolated in-memory candidate compilation, without changing the current gateway.
# Rejected: an unbound host JVM or a candidate container surviving the measurement lease.
set -euo pipefail
prefix=${1:?prefix}; name="$prefix-candidate-${2:-a}"
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B7
python3 - <<'PY'
import json,time
s=json.load(open('/Users/sam/Claude/Projects/triplex-db-2/locks/measure/owner.json'))
assert s['id']=='DX-B7' and time.time()-s['startedAtSeconds']<600
PY
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
image=$(docker inspect --format '{{.Image}}' "$prefix-gw-w")
source="$root/$name-source"
mkdir "$source"
cp -R "${3:-lab/experiments/EXP-DX1/b7/candidate}/." "$source/"
cp packages/datomic/src/codec-spec.json "$source/codec-spec.json"
python3 - "$source" <<'PY'
from pathlib import Path
import hashlib,sys
p=Path(sys.argv[1]);files=sorted(f for f in p.rglob('*') if f.is_file());(p/'SHA256SUMS').write_text(''.join(hashlib.sha256(f.read_bytes()).hexdigest()+'  '+str(f.relative_to(p))+'\n' for f in files))
PY
cleanup(){ docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker create --rm --pull never --name "$name" --cpuset-cpus 4,5,6,7 --memory 1500m --memory-swap 1500m \
  -v "$source:/opt/gateway:ro" -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src -e 'DATOMIC_JAVA_OPTS=-Xms128m -Xmx768m' \
  --entrypoint /opt/datomic/bin/run "$image" -m triplex.gateway.selftest > "$root/$name.id"
docker inspect "$name" > "$root/$name-container.json"
node lab/experiments/EXP-DX1/b6/bounded-command.mjs 90 docker start -a "$name" > "$root/$name-selftest.log" 2>&1
