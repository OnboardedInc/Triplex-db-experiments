#!/usr/bin/env bash
# [DX-H6] Why: exclusive VM lifetime, durable failure evidence, and clean clones of stopped Postgres.
# Rejected: leaving a peer alive between measurement leases or copying a running database.
set -euo pipefail
kind=${1:?seed|sweep|probe|equivalence}; prefix=${2:?tx2-dxh6-*}; shift 2
[[ $prefix =~ ^tx2-dxh6-[a-z0-9-]+$ ]] || exit 2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
export DX_STACK_EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6
out=$DX_STACK_EVIDENCE/$prefix; mkdir -p "$out"
[[ ! -e $out/arguments.json ]] || { echo 'fresh prefix required'; exit 2; }
python3 - "$out/arguments.json" "$kind" "$prefix" "$@" <<'PY'
import json,sys
open(sys.argv[1],'w').write(json.dumps(sys.argv[2:],indent=2)+'\n')
PY
git rev-parse HEAD > "$out/head.txt"
python3 - "$out/source-build-hashes.json" <<'PYHASH'
import subprocess,pathlib,sys,hashlib,json
files=subprocess.check_output(['git','ls-files','lab/bench','lab/experiments/EXP-DX1/h6','packages/datomic','packages/core','pnpm-lock.yaml'],text=True).splitlines()
files += [str(p) for d in ['datomic','core','host','qualification','w0','xtdb','qlever','sql'] for p in pathlib.Path('packages/'+d+'/dist').rglob('*') if p.is_file()]
rows={p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest() for p in sorted(set(files)) if pathlib.Path(p).is_file()}
pathlib.Path(sys.argv[1]).write_text(json.dumps(rows,indent=2)+'\n')
PYHASH

lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
held=false; timer=; guard=; watcher=
cleanup() {
 rc=$?; trap - EXIT TERM INT
 [[ -z $timer ]] || kill "$timer" 2>/dev/null || true
 [[ -z $guard ]] || kill "$guard" 2>/dev/null || true
 [[ -z $watcher ]] || kill "$watcher" 2>/dev/null || true
 for role in gw-w gw-r tx pg; do docker logs --timestamps "$prefix-$role" > "$out/$role.log" 2>&1 || true; done
 # [DX-H6] Why: a deadline must retain driver bytes before removing its container.
 # Rejected: relying only on the child wrapper's exit trap during outer cleanup.
 if docker container inspect "$prefix-driver" >/dev/null 2>&1; then
   mkdir -p "$out/driver"; docker cp "$prefix-driver:/driver/." "$out/driver/" >> "$out/cleanup.log" 2>&1 || true
 fi
 for role in driver health cgroups extract tools-extract copy runtime-check budget; do docker rm -f "$prefix-$role" >> "$out/cleanup.log" 2>&1 || true; done
 for role in gw-r gw-w; do docker exec "$prefix-$role" sh -c 'for f in /proc/[0-9]*/comm; do read n < "$f" || continue; if [ "$n" = java ]; then p=${f#/proc/}; p=${p%/comm}; kill -TERM "$p"; fi; done' >> "$out/cleanup.log" 2>&1 || true; done
 for role in gw-r gw-w tx pg; do docker stop -t 30 "$prefix-$role" >> "$out/cleanup.log" 2>&1 || true; done
 bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes >> "$out/cleanup.log" 2>&1
 for v in driver tools; do docker volume rm "$prefix-$v" >> "$out/cleanup.log" 2>&1 || true; done
 docker ps -a --filter "name=$prefix" --format '{{.Names}}' > "$out/remaining-containers.txt"
 docker network ls --filter "name=$prefix" --format '{{.Name}}' > "$out/remaining-networks.txt"
 docker volume ls --filter "name=$prefix" --format '{{.Name}}' > "$out/remaining-volumes.txt"
 if [[ -s $out/remaining-containers.txt || -s $out/remaining-networks.txt || -s $out/remaining-volumes.txt ]]; then echo 'cleanup incomplete; lock retained'; exit 1; fi
 printf '{"exit":%s,"finishedAt":"%s"}\n' "$rc" "$(date -u +%FT%TZ)" > "$out/exit.json"
 if [[ $held == true ]]; then rm "$lock/owner.json"; rmdir "$lock"; fi
 exit "$rc"
}
trap cleanup EXIT
trap 'exit 124' TERM INT
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
held=true; printf '{"id":"DX-H6","prefix":"%s","kind":"%s","pid":%s}\n' "$prefix" "$kind" "$$" > "$lock/owner.json"
lease_ms=${DXH6_LEASE_MS:-900000}
[[ $lease_ms == 900000 || $lease_ms == 2700000 ]] || exit 2
DXH6_LEASE_MS=$lease_ms node lab/experiments/EXP-DX1/h6/deadline.mjs "$prefix" > "$out/deadline.log" 2>&1 & guard=$!
(sleep $((lease_ms / 1000 - 90)); kill -TERM $$) & timer=$!
python3 - <<'PY'
import shutil
assert shutil.disk_usage('.').free >= 5*1024**3, 'host disk under 5GiB'
PY
docker stats --no-stream --format '{{json .}}' > "$out/stats-before.jsonl"
# Local images only: combine the local Python runtime with Node's executable/shared libraries on an owned volume.
docker image inspect python:3.13-slim node:22.23.2-bookworm-slim > "$out/tool-images.json"
docker volume create "$prefix-tools" >/dev/null
docker create --pull never --name "$prefix-tools-extract" -v "$prefix-tools:/tool" node:22.23.2-bookworm-slim sh -c 'cp /usr/local/bin/node /tool/node; cp /usr/lib/*-linux-gnu/libstdc++.so.6 /usr/lib/*-linux-gnu/libgcc_s.so.1 /tool/' >/dev/null
docker start -a "$prefix-tools-extract"
docker rm "$prefix-tools-extract" >/dev/null
# [DX-H6] Why: prove the local ARM64/x86 runtime pairing before paying for JVM startup.
# Rejected: architecture-specific library paths and a first check inside the measured driver.
docker run --rm --pull never --name "$prefix-runtime-check" --network none -v "$prefix-tools:/tool:ro" -v "$PWD:$PWD:ro" -w "$PWD" -e LD_LIBRARY_PATH=/tool python:3.13-slim /tool/node --experimental-strip-types --input-type=module -e 'import {execFileSync} from "node:child_process";console.log(process.version,process.arch);console.log(execFileSync("python3",["--version"],{encoding:"utf8"}));await import("./lab/bench/w0-driver.ts");console.log("W0 public imports ready")' > "$out/runtime-check.txt"
if [[ -n ${DXH6_SEED_VOLUME:-} ]]; then
 [[ $DXH6_SEED_VOLUME == tx2-dxh5-seed-1000-pg-data || $DXH6_SEED_VOLUME == tx2-dxh6-seed-10000-pg-data ]] || exit 2
 docker volume inspect "$DXH6_SEED_VOLUME" > "$out/seed-volume.json"
 docker volume create "$prefix-pg-data" >/dev/null
 docker run --rm --pull never --name "$prefix-copy" -v "$DXH6_SEED_VOLUME:/from:ro" -v "$prefix-pg-data:/to" postgres:17-alpine sh -c 'cp -a /from/. /to/'
 export DXH6_RESTORE=true
fi
export DX_TX_HEAP=3g DX_TX_MEMORY=4g DX_GW_WRITE_MEMORY=3g DX_GW_READ_MEMORY=3g DX_PG_MEMORY=2g DX_OBJECT_CACHE=1g DX_INDEX_THRESHOLD=256m DX_INDEX_MAX=1g
bash lab/experiments/EXP-DX1/h6/up.sh "$prefix" --no-publish --cpus-pg 0 --cpus-tx 0,1 --cpus-gw-write 1 --cpus-gw-read 2,3 \
 --gw-java-opts '-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g' \
 --pg-settings '-c shared_buffers=512MB -c max_wal_size=8GB -c checkpoint_timeout=30min' > "$out/up.log" 2>&1
export DX_DRIVER_ENV="TRIPLEX_DATOMIC_LAYOUT=lean TX2_W0_COUNT_CONCURRENCY=64 TX2_SWEEP_STRICT=1"
if [[ $kind == record ]]; then
 command=(node --experimental-strip-types lab/experiments/EXP-DX1/h6/record.ts)
elif [[ $kind == equivalence || $kind == probe || $kind == history ]]; then
 command=(node --experimental-strip-types "lab/experiments/EXP-DX1/h6/$kind.ts" "$@")
else
 command=(node --experimental-strip-types lab/experiments/EXP-DX1/h6/observe-counts.mjs --world w0 --lane datomic --composition reach --output runs/DX-H6-vm/receipt.json "$@")
fi
node lab/experiments/EXP-DX1/h6/disk-watch.mjs "$prefix" > "$out/disk-watch.log" 2>&1 & watcher=$!
bash lab/experiments/EXP-DX1/h6/run-in-vm.sh "$prefix" --cpus 4,5,6,7 --memory 8g -- "${command[@]}" > "$out/driver.log" 2>&1
[[ ! -e $out/resource-abort.json ]] || exit 1
docker exec "$prefix-pg" df -k /var/lib/postgresql/data > "$out/vm-disk-kib.txt"
docker exec "$prefix-pg" psql -U postgres -d datomic -Atc "SELECT json_build_object('database_bytes',pg_database_size(current_database()),'tables',(SELECT json_agg(t) FROM (SELECT relname,pg_relation_size(relid) AS table_bytes,pg_indexes_size(relid) AS index_bytes,pg_total_relation_size(relid) AS total_bytes FROM pg_catalog.pg_statio_user_tables) t),'wal_bytes',(SELECT COALESCE(sum(size),0) FROM pg_ls_waldir()));" > "$out/postgres-sizes.json"
if [[ $kind == seed ]]; then
 n=$(python3 -c 'import json,sys; r=json.load(open(sys.argv[1])); assert r["status"]=="G0-PASS"; print(r["N"])' "$out/driver/receipt.json")
 for role in gw-r gw-w; do docker exec "$prefix-$role" sh -c 'for f in /proc/[0-9]*/comm; do read n < "$f" || continue; if [ "$n" = java ]; then p=${f#/proc/}; p=${p%/comm}; kill -TERM "$p"; fi; done' >> "$out/seal.log" 2>&1 || true; done
 for role in gw-r gw-w tx pg; do docker stop -t 30 "$prefix-$role" >> "$out/seal.log"; done
 [[ -z $watcher ]] || kill "$watcher" 2>/dev/null || true
 [[ -z $watcher ]] || wait "$watcher" 2>/dev/null || true
 watcher=
 [[ $(docker inspect --format '{{.State.ExitCode}}' "$prefix-pg") == 0 ]] || { echo "Postgres did not stop cleanly"; exit 1; }
 docker run --rm --pull never --name "$prefix-copy" -v "$prefix-pg-data:/from:ro" postgres:17-alpine sh -c 'du -sk /from; du -sk /from/pg_wal; du -sk /from/base' > "$out/stopped-volume-kib.txt"
 if [[ $n != 10000 ]]; then exit 0; fi
 sealed=tx2-dxh6-seed-$n-pg-data
 if docker volume inspect "$sealed" >/dev/null 2>&1; then echo 'sealed seed exists; refuse overwrite'; exit 2; fi
 # [DX-H6] Why: sealed seeds have a 30 GB aggregate retention budget independent of free host space.
 # Rejected: assuming a small rung implies a small SQL volume.
 existing_bytes=0
 for v in $(docker volume ls --filter name=tx2-dxh6-seed- --format '{{.Name}}'); do
  [[ $v =~ ^tx2-dxh6-seed-[0-9]+-pg-data$ ]] || exit 2
  kb=$(docker run --rm --pull never --name "$prefix-copy" -v "$v:/from:ro" postgres:17-alpine du -sk /from | awk '{print $1}')
  existing_bytes=$((existing_bytes + kb * 1024))
 done
 new_kb=$(docker run --rm --pull never --name "$prefix-copy" -v "$prefix-pg-data:/from:ro" postgres:17-alpine du -sk /from | awk '{print $1}')
 [[ $((existing_bytes + 2 * new_kb * 1024 + 3500000000)) -le 20000000000 ]] || { echo 'sealed seed budget exceeded'; exit 2; }
 docker volume create "$sealed" > "$out/sealed-volume.txt"
 docker run --rm --pull never --name "$prefix-copy" -v "$prefix-pg-data:/from:ro" -v "$sealed:/to" postgres:17-alpine sh -c 'cp -a /from/. /to/; du -sk /to' >> "$out/seal.log"
fi
