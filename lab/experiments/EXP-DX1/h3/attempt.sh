#!/usr/bin/env bash
# [DX-H3] Why: cleanup precedes measurement-lock release. Rejected: abandoned engines outside a lease.
set -euo pipefail
# [DX-R3-P8] Why: EXIT may run inside a redirected failing stage; restore the caller stream before reading stage logs.
# Rejected: inheriting that redirection (cat driver.log recursively appends to itself until disk exhaustion).
exec 8>&1 9>&2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
kind=${1:?functional|medium|real}; prefix=${2:?prefix}; shift 2
[[ $prefix =~ ^tx2-dx[a-z0-9-]+$ ]] || exit 2
# [DX-H4] Why: each arm needs a fresh physical stack and identical immutable arguments.
# Rejected: the in-run baseline phase (a different frozen-trace segment).
if [[ $kind == pair ]]; then
  root=${DX_STACK_EVIDENCE:-/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4}
  duration=${DX_MATCH_DURATION_S:-900}
  # [DX-R3] Why: a parent cancelled while waiting for a child arm must stop that same owned child before returning.
  # Rejected: leaving a queued real-arm shell orphaned after the pair's heavy wrapper receives TERM.
  pair_child=
  trap 'if [[ -n $pair_child ]]; then kill -TERM "$pair_child" 2>/dev/null || true; wait "$pair_child" || true; fi; exit 143' TERM INT
  pair_arm() { "$@" & pair_child=$!; wait "$pair_child"; pair_child=; }
  # [DX-T1] Why: the authorized full pair shares one lease across matched arms, including cleanup.
  # Rejected: releasing the lock between arms, or silently extending a single-arm diagnostic lease.
  if [[ $prefix == tx2-dxr3-* || $prefix == tx2-dxt1-* ]]; then
    pair_id=DX-R3; [[ $prefix != tx2-dxt1-* ]] || pair_id=DX-T1
    pair_lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
    python3 -c 'import shutil; assert shutil.disk_usage(".").free >= 15*1024**3'
    if [[ ${DX_R3_TRY_LOCK:-0} == 1 ]]; then
      if ! mkdir "$pair_lock" 2>/dev/null; then echo 'DX-R3 pair lock busy; no resources created'; exit 75; fi
    else
      while ! mkdir "$pair_lock" 2>/dev/null; do sleep 5; done
    fi
    printf '{"id":"%s","pid":%s,"kind":"full-pair"}\n' "$pair_id" "$$" > "$pair_lock/owner.json"
    export DX_R3_PAIR_LEASE_PID=$$ DX_PAIR_LEASE_ID=$pair_id
    pair_cleanup() {
      pair_rc=$?; trap - EXIT TERM INT
      if [[ -n $pair_child ]]; then kill -TERM "$pair_child" 2>/dev/null || true; wait "$pair_child" || true; fi
      kill "$pair_watchdog" 2>/dev/null || true; wait "$pair_watchdog" 2>/dev/null || true
      # [DX-R3] Why: a child's incomplete cleanup must retain ownership even if only a volume or network survives.
      # Rejected: checking containers alone before releasing the shared pair lease.
      pair_remaining=$(docker ps -a --filter "name=$prefix" --format '{{.Names}}') || exit 1
      [[ -z $pair_remaining ]] || exit 1
      pair_remaining=$(docker volume ls --filter "name=$prefix" --format '{{.Name}}') || exit 1
      [[ -z $pair_remaining ]] || exit 1
      pair_remaining=$(docker network ls --filter "name=$prefix" --format '{{.Name}}') || exit 1
      [[ -z $pair_remaining ]] || exit 1
      rm "$pair_lock/owner.json"; rmdir "$pair_lock"
      exit "$pair_rc"
    }
    trap pair_cleanup EXIT
    trap 'exit 143' TERM INT
    node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),2580000)' "$$" & pair_watchdog=$!
  fi
  pair_arm bash "$0" real "$prefix-zero" "$@" --zero-readers --match-duration-s "$duration"
  baseline="$root/$prefix-zero/driver/ns-writes.jsonl"
  [[ -s $baseline ]] || exit 1
  mkdir -p "$root/$prefix-ladder/input"
  cp "$baseline" "$root/$prefix-ladder/input/ns-writes.jsonl"
  cp "$root/$prefix-zero/driver/ns-report.json" "$root/$prefix-ladder/input/ns-report.json"
  pair_arm bash "$0" real "$prefix-ladder" "$@" --baseline-writes "$root/$prefix-ladder/input/ns-writes.jsonl" --match-duration-s "$duration"
  exit
fi
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
agent=$(printf '%s' "$prefix" | cut -d- -f2 | tr '[:lower:]' '[:upper:]' | sed 's/^DX/DX-/')
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-/Users/sam/Claude/Projects/triplex-db-2/evidence/$agent}
out=$DX_STACK_EVIDENCE/$prefix
[[ ! -e $out/arguments.txt ]] || { echo "refusing reused run tag: $prefix" >&2; exit 2; }
mkdir -p "$out"
printf '%s\n' "$kind" "$prefix" "$@" > "$out/arguments.txt"
git rev-parse HEAD > "$out/head.txt"
[[ $prefix != tx2-dxr3-* ]] || cat "$out/head.txt"
if [[ $prefix != tx2-dxr3-* ]]; then
python3 - "$out" <<'PY2'
import subprocess,pathlib,sys,hashlib,json
files=subprocess.check_output(['git','ls-files','lab/bench','lab/experiments/EXP-DX1/stack','lab/experiments/EXP-DX1/h3','lab/experiments/EXP-DX1/h4','packages/datomic','packages/core','pnpm-lock.yaml'],text=True).splitlines()
files += [str(p) for d in ['datomic','core','host','qualification','w0','xtdb','qlever','sql'] for p in pathlib.Path('packages/'+d+'/dist').rglob('*') if p.is_file()]
rows={p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest() for p in sorted(set(files)) if pathlib.Path(p).is_file()}
pathlib.Path(sys.argv[1]+'/source-build-hashes.json').write_text(json.dumps(rows,indent=2)+'\n')
PY2
fi
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
held=false; watchdog=; operational=; child=; trace_host=; trace_pg=
cleanup() {
  rc=$?; trap - EXIT TERM INT
  exec 1>&8 2>&9
  if [[ -n $watchdog ]]; then kill "$watchdog" 2>/dev/null || true; wait "$watchdog" 2>/dev/null || true; fi
  if [[ $prefix == tx2-dxr3-* ]] && docker container inspect "$prefix-driver" >/dev/null 2>&1; then
    docker stop --time 10 "$prefix-driver" || true
  fi
  if [[ -n $child ]]; then kill -TERM "$child" 2>/dev/null || true; wait "$child" 2>/dev/null || true; fi
  if [[ $prefix == tx2-dxr3-* ]] && docker container inspect "$prefix-driver" >/dev/null 2>&1; then
    mkdir -p "$out/driver"
    docker cp "$prefix-driver:/driver/." "$out/driver/" || { echo 'driver evidence copy failed; retain lock' >&2; exit 1; }
    docker rm -f "$prefix-driver"
  fi
  # [DX-T1] Why: orderly JVM shutdown dumps and converts JFR before any owned container is removed.
  # Rejected: rm -f (loses the only recording of the slow run).
  for sampler in "$trace_host" "$trace_pg"; do
    if [[ -n $sampler ]]; then kill -TERM "$sampler" 2>/dev/null || true; wait "$sampler" 2>/dev/null || true; fi
  done
  if [[ ${TRIPLEX_TRACE_LEVEL:-off} != off ]]; then
    touch "$out/trace/raw/.finish"
    for ((jfr_wait=0;jfr_wait<90;jfr_wait++)); do
      [[ -s $out/driver/ns-report.json ]] || break
      [[ ! -f $out/trace/raw/gw-w.jfr-complete.jsonl || ! -f $out/trace/raw/gw-r.jfr-complete.jsonl || ! -f $out/trace/raw/tx.jfr-complete.jsonl ]] || break
      sleep 1
    done
    for role in gw-w gw-r tx; do
      docker update --restart=no "$prefix-$role" >> "$out/trace-shutdown.log" 2>&1 || true
      # The launcher is PID 1; signal only java PIDs *inside this owned container*.
      docker exec "$prefix-$role" bash -c 'for f in /proc/[0-9]*/comm; do IFS= read -r comm < "$f" || continue; if [[ $comm == java ]]; then pid=${f#/proc/}; pid=${pid%/comm}; kill -TERM "$pid"; fi; done' >> "$out/trace-shutdown.log" 2>&1 || true
      docker stop --timeout 15 "$prefix-$role" >> "$out/trace-shutdown.log" 2>&1 || true
    done
  fi
  for role in gw-w gw-r tx pg; do docker logs --timestamps "$prefix-$role" > "$out/$role.log" 2>&1 || true; done
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes
  docker volume rm "$prefix-driver" > "$out/volume-cleanup.txt" 2>&1 || true
  docker ps -a --filter "name=$prefix" --format '{{.Names}}' > "$out/remaining-containers.txt"
  docker network ls --filter "name=$prefix" --format '{{.Name}}' > "$out/remaining-networks.txt"
  docker volume ls --filter "name=$prefix" --format '{{.Name}}' > "$out/remaining-volumes.txt"
  if [[ -s $out/remaining-containers.txt || -s $out/remaining-networks.txt || -s $out/remaining-volumes.txt ]]; then echo 'cleanup incomplete; retain lock' >&2; exit 1; fi
  # [DX-R3] Why: one compressed command stream retains the actual reports, writes and logs even on a late failure.
  # Rejected: source captures/hash manifests or relying on files that disappear with the driver volume.
  if [[ $prefix == tx2-dxr3-* ]]; then
    for file in up.log driver.log gw-w.log gw-r.log tx.log pg.log remaining-containers.txt remaining-networks.txt remaining-volumes.txt; do
      if [[ -f $out/$file ]]; then echo "DX-R3 raw-output $prefix/$file"; cat "$out/$file"; fi
    done
    for file in ns-report.json ns-writes.jsonl scan-stats.jsonl oracle-case.json oracle-expected.json; do
      if [[ -f $out/driver/$file ]]; then echo "DX-R3 raw-output $prefix/driver/$file"; cat "$out/driver/$file"; echo; fi
    done
  fi
  if [[ -n $operational ]]; then rm -rf "$operational"; fi
  if [[ $held == true ]]; then rm "$lock/owner.json"; rmdir "$lock"; fi
  if [[ ${TRIPLEX_TRACE_LEVEL:-off} != off ]]; then
    node lab/trace/finalize.mjs "$out" "lab/experiments/EXP-DX1/t1/runs/$prefix" > "$out/trace-finalize.log" 2>&1 || { cat "$out/trace-finalize.log" >&2; [[ $rc != 0 ]] || rc=1; }
  fi
  exit "$rc"
}
# [DX-H3] Why: a queued attempt's memory observation can become stale before it owns the lock.
# Rejected: starting a large stack from a pre-wait memory snapshot.
check_resources() {
  phase=$1
  df -k . > "$out/disk-$phase.txt"
  docker stats --no-stream --format '{{json .}}' > "$out/stats-$phase.jsonl"
  python3 - "$out" "$phase" <<'PY2'
import json,re,sys,shutil
rows=[json.loads(l) for l in open(sys.argv[1]+'/stats-'+sys.argv[2]+'.jsonl')]
units={'B':1,'KiB':1024,'MiB':1024**2,'GiB':1024**3}
used=0
for r in rows:
 m=re.search(r'([\d.]+)([KMG]?i?B)',r['MemUsage'].split('/')[0].strip()); used+=float(m[1])*units[m[2]]
if sys.argv[2]=='admitted': assert 20*1024**3-used>=8*1024**3, 'less than 8 GiB VM memory free at admission'
assert shutil.disk_usage('.').free>=15*1024**3, 'less than 15 GiB host disk free'
PY2
}
check_resources before
if [[ $kind =~ ^(functional|medium|real)$ ]]; then
  if [[ ( $prefix == tx2-dxr3-* || $prefix == tx2-dxt1-* ) && -n ${DX_R3_PAIR_LEASE_PID:-} ]]; then
    python3 - "$lock/owner.json" "$DX_R3_PAIR_LEASE_PID" "${DX_PAIR_LEASE_ID:-DX-R3}" <<'LEASE'
import json,sys
owner=json.load(open(sys.argv[1])); assert owner['id']==sys.argv[3] and owner['kind'] in ('full-pair','writer-arms') and owner['pid']==int(sys.argv[2])
LEASE
  else
  while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
  held=true; printf '{"id":"%s","pid":%s,"prefix":"%s","kind":"%s"}\n' "$agent" "$$" "$prefix" "$kind" > "$lock/owner.json"
  fi
fi
trap cleanup EXIT
trap 'exit 143' TERM INT
# [DX-R3] Why: bound the complete owned hold, including setup, and copy completed phases before cleanup.
# Rejected: timing only the final benchmark command while setup can already consume the lease.
if [[ $prefix == tx2-dxr3-* && -z ${DX_R3_PAIR_LEASE_PID:-} ]]; then
  node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),1140000)' "$$" & watchdog=$!
fi
run_stage() { "$@" & child=$!; wait "$child"; child=; }
check_resources admitted
if [[ $kind == functional ]]; then
  export DX_TX_HEAP=1g DX_TX_MEMORY=1500m DX_GW_WRITE_HEAP=768m DX_GW_READ_HEAP=768m TX2_ENGINE_CPUS=1
  cpus=(--cpus-tx 6 --cpus-pg 6 --cpus-gw-write 6 --cpus-gw-read 6)
else
  # [orchestrator] Why: placement, heaps and JVM options vary between runs; every value has DX-H3's value as its default.
  export TX2_ENGINE_CPUS=${DX_ENGINE_CPUS:-5}
  cpus=(--cpus-tx "${DX_CPUS_TX:-0,1}" --cpus-pg "${DX_CPUS_PG:-0}" --cpus-gw-write "${DX_CPUS_GW_WRITE:-2}" --cpus-gw-read "${DX_CPUS_GW_READ:-3,4}")
  if [[ $kind == real ]]; then
    export DX_DRIVER_MEMORY=${DX_DRIVER_MEMORY:-5g}
    export DX_TX_HEAP=${DX_TX_HEAP:-4g} DX_TX_MEMORY=${DX_TX_MEMORY:-5g} DX_GW_WRITE_HEAP=${DX_GW_WRITE_HEAP:-2g} DX_GW_WRITE_MEMORY=${DX_GW_WRITE_MEMORY:-2500m} DX_GW_READ_HEAP=${DX_GW_READ_HEAP:-3g} DX_GW_READ_MEMORY=${DX_GW_READ_MEMORY:-3500m} DX_PG_MEMORY=${DX_PG_MEMORY:-2g} DX_OBJECT_CACHE=${DX_OBJECT_CACHE:-1g} DX_INDEX_THRESHOLD=${DX_INDEX_THRESHOLD:-256m} DX_INDEX_MAX=${DX_INDEX_MAX:-1g}
  fi
fi
extra=(); [[ -z ${DX_GW_JAVA_OPTS:-} ]] || extra+=(--gw-java-opts "$DX_GW_JAVA_OPTS")
[[ -z ${DX_PG_SETTINGS:-} ]] || extra+=(--pg-settings "$DX_PG_SETTINGS")
# [DX-R3] Why: stack configuration is temporary machinery; durable evidence contains command output only.
# Rejected: retaining copied gateway sources and setup hash manifests as experimental evidence.
stack_evidence=$DX_STACK_EVIDENCE
if [[ $prefix == tx2-dxr3-* ]]; then
  operational="$PWD/lab/experiments/EXP-DX1/r3/.runtime-$prefix"
  mkdir "$operational"
  stack_evidence=$operational
  gateway_source=${DX_R3_GATEWAY_SRC:-$PWD/packages/datomic/gateway}
  if [[ -n ${DX_R3_GATEWAY_SRC:-} ]]; then
    [[ $gateway_source == "$PWD/lab/experiments/EXP-DX1/r3/.old-commit-"*/gateway ]] || exit 2
    echo "DX-R3 temporary non-strict commit source: $gateway_source"
  fi
  extra+=(--gateway-src "$gateway_source" --codec-spec "$PWD/packages/datomic/src/codec-spec.json")
fi
if [[ ${TRIPLEX_TRACE_LEVEL:-off} != off ]]; then
  export TRIPLEX_TRACE_RUN=$prefix TRIPLEX_TRACE_SLOT=$prefix TRIPLEX_TRACE_SOURCE=$(git rev-parse HEAD)
  node -e 'const fs=require("fs");fs.writeFileSync(process.argv[1],JSON.stringify({tag:process.env.TRIPLEX_TRACE_RUN,slot:process.env.TRIPLEX_TRACE_SLOT,source:process.env.TRIPLEX_TRACE_SOURCE,level:process.env.TRIPLEX_TRACE_LEVEL,requiredJfr:["gw-w","gw-r","tx"],requireSystem:true,startedAt:Date.now()})+"\n")' "$out/trace-run.json"
fi
run_stage env DX_STACK_EVIDENCE="$stack_evidence" bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --no-publish "${cpus[@]}" ${extra[@]+"${extra[@]}"} > "$out/up.log" 2>&1
# [DX-R3-P9] Why: q6 comparisons require the same live guest boot parameters, not a remembered VM setting.
# Rejected: assuming nohlt survives an orchestrator restart.
if [[ $prefix == tx2-dxr3-* || $prefix == tx2-dxt1-* ]]; then
  docker exec "$prefix-tx" cat /proc/cmdline > "$out/guest-kernel.txt"
  if [[ $prefix == tx2-dxt1-* ]]; then python3 -c 'import sys; assert "nohlt" in open(sys.argv[1]).read().split(), "guest nohlt condition absent"' "$out/guest-kernel.txt"; fi
fi
if [[ ${TRIPLEX_TRACE_LEVEL:-off} != off ]]; then
  node lab/trace/system-sampler.mjs "$out/trace/raw" & trace_host=$!
  docker exec -i "$prefix-pg" psql -X -Atq -U postgres -d datomic < lab/trace/postgres.sql > "$out/trace/raw/postgres-samples.log" 2> "$out/trace/raw/postgres-sample-errors.txt" & trace_pg=$!
fi
run_stage bash lab/experiments/EXP-DX1/stack/run-in-vm.sh "$prefix" --cpus "${DX_CPUS_DRIVER:-6,7}" --memory "${DX_DRIVER_MEMORY:-3g}" -- node lab/experiments/EXP-DX1/h3/observe.mjs \
 --lane datomic --composition reach --read-path "${DX_READ_PATH:-gateway}" --profile "${DX_NS_PROFILE:-smoke}" --reader-threads "${DX_READER_THREADS:-2}" --oracle-root "${DX_ORACLE_ROOT:-$DX_STACK_EVIDENCE/oracle}" --output runs/DX-H3-vm/ns-report.json "$@" > "$out/driver.log" 2>&1
