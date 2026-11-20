#!/usr/bin/env bash
set -euo pipefail

action=${1:?usage: rd-aged-run.sh run|cleanup ROOT}
root=${2:?}
[[ $root == /var/tmp/triplex-bm1/day-n20-rd1-aged || $root == /var/tmp/triplex-bm1/day-n20-rd1-aged-retry ]]
source=5f51de7d6ab09b884df61f5c260db7f6688726c1
repo=$root/build/repository
entry=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/rd-aged.py
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export PATH="$root/build/tools/bin:$PATH"
export DX_QUIET_LOGS=1 DX_NATIVE_GATES=0 DX_STACK_WAIT_FOR_TRANSACTOR=1
export TRIPLEX_DATOMIC_LAYOUT=lean DX_STRICT_RECORD_CLOCKS=1 DX_SERVER_RECORD_TIME=1
export TRIPLEX_TRACE_LEVEL=summary TRIPLEX_TRACE_GATEWAY=1 TRIPLEX_TRACE_COMPONENTS=gateway
export TRIPLEX_TRACE_SOURCE=$source

status() {
  local tmp
  tmp=$(mktemp "$root/status.XXXXXX")
  printf 'item=rd1-aged state=%s since=%s next=%s\n' "$1" "$(date -u +%FT%TZ)" "$2" > "$tmp"
  mv "$tmp" /var/tmp/triplex-bm1/STATUS
}

cleanup() {
  [[ -s $root/active-slot ]] || return 0
  local slot mode
  read -r slot < "$root/active-slot"
  [[ $slot =~ ^tx2-dxt1-bm1-rdaged-[a-f0-9]{12}-(small|full)$ ]] || return 2
  mode=${slot##*-}
  python3 - "$root/$mode/request.json" "$slot" "$source" <<'PY' || return 2
import json
import sys

row = json.load(open(sys.argv[1]))
assert [row["slot"], row["source"]] == sys.argv[2:]
PY
  for role in pg tx gw-w gw-r; do
    timeout 20s docker logs --timestamps "$slot-$role" > "$root/$mode/$role.log" 2>&1 || true
  done
  (cd "$repo" && timeout 100s bash lab/experiments/EXP-DX1/stack/down.sh "$slot" --volumes) || return 1
  local names
  names=$(docker ps -a --format '{{.Names}}' && docker volume ls --format '{{.Name}}' && docker network ls --format '{{.Name}}') || return 1
  if grep -q "^$slot-" <<<"$names"; then return 1; fi
  mv "$root/active-slot" "$root/$mode/cleaned-slot"
}

if [[ $action == cleanup ]]; then
  if ! cleanup; then status cleanup-failed operator; exit 1; fi
  if [[ ${SERVICE_RESULT:-success} != success ]]; then status incomplete next-ready-item; fi
  exit 0
fi
[[ $action == run && $(id -u) == 0 ]]
[[ -z $(docker ps -q) ]]
cd "$repo"
[[ $(git rev-parse HEAD) == "$source" ]]
git diff --quiet HEAD --
measure=$(python3 "$entry" prepare "$repo")
start_gc='-Xms256m -Xmx3g -XX:+UseG1GC'
gc_flags() { printf ' -Xlog:gc*=info:file=/trace/%s.log:time,uptimemillis,level,tags:filecount=4,filesize=8m' "$1"; }
export DX_GW_WRITE_JAVA_OPTS="$start_gc$(gc_flags gw-w)" DX_GW_READ_JAVA_OPTS="$start_gc$(gc_flags gw-r)"
trap cleanup EXIT

arm() {
  local mode=$1 people=$2 age=$3 seconds=$4 seats=$5 directory slot nonce
  directory=$root/$mode
  mkdir "$directory"
  read -r nonce < /proc/sys/kernel/random/uuid
  nonce=${nonce//-/}
  slot="tx2-dxt1-bm1-rdaged-${nonce:0:12}-$mode"
  [[ $slot =~ ^tx2-dxt1-bm1-rdaged-[a-f0-9]{12}-(small|full)$ ]]
  python3 - "$directory/request.json" "$slot" "$source" "$measure" "$people" "$age" "$seconds" "$seats" <<'PY'
import hashlib
import json
from pathlib import Path
import sys
import time

target, slot, source, entry, people, age, seconds, seats = sys.argv[1:]
with Path(target).open("x") as f:
    json.dump(dict(slot=slot, source=source, entrypointSha256=hashlib.sha256(Path(entry).read_bytes()).hexdigest(),
        people=int(people), age=int(age), seconds=int(seconds), seats=int(seats), start=time.time()),f)
    f.write("\n")
PY
  printf '%s\n' "$slot" > "$root/active-slot"
  export DX_BARE_METAL_ROOT="$directory" DX_STACK_EVIDENCE="$directory/engines"
  export TRIPLEX_TRACE_RUN="$slot" TRIPLEX_TRACE_SLOT="$slot"
  timeout 250s bash lab/experiments/EXP-DX1/stack/up.sh "$slot" --no-publish \
    --cpus-tx 0 --cpus-pg 1 --cpus-gw-write 2 --cpus-gw-read 4,8 --tx-memory 6g --pg-memory 4g \
    --gw-memory 4g --tx-java-opts "$start_gc$(gc_flags tx)" --object-cache-max 1280m
  export DATOMIC_URL="http://$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$slot-gw-w"):8080"
  export DATOMIC_READ_URLS="http://$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$slot-gw-r"):8080"
  export DX_BM1_RD_NATIVE_LOG="$directory/engines/$slot/trace/raw/gw-r.jsonl"
  export DX_BM1_RD_AGED_SIZE=$people DX_BM1_RD_AGED_WRITES=$age
  status "aging-$mode" collector
  timeout 4500s node lab/bin/heavy.mjs --label "DX-BM1-rdaged-$mode" -- \
    taskset -c 3,5,6,7,9,10,11 node --max-old-space-size=8192 --import tsx "$measure" "$directory/results" prepared "$seconds" "$seats" curve
  cleanup
  python3 "$entry" collect "$directory/results" "$directory/request.json" > "$directory/collector.json"
}

arm small 24 32 1 16
arm full 10000 10000 3 128
status measured next-ready-item
