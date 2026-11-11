#!/usr/bin/env bash
# [DX-H3] Why: cleanup precedes measurement-lock release. Rejected: abandoned engines outside a lease.
set -euo pipefail
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
out=$DX_STACK_EVIDENCE/$prefix; mkdir -p "$out"
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
held=false; watchdog=; child=
cleanup() {
  rc=$?; trap - EXIT TERM INT
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
  if [[ $held == true ]]; then rm "$lock/owner.json"; rmdir "$lock"; fi
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
  while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
  held=true; printf '{"id":"%s","pid":%s,"prefix":"%s","kind":"%s"}\n' "$agent" "$$" "$prefix" "$kind" > "$lock/owner.json"
fi
trap cleanup EXIT
trap 'exit 143' TERM INT
# [DX-R3] Why: bound the complete owned hold, including setup, and copy completed phases before cleanup.
# Rejected: timing only the final benchmark command while setup can already consume the lease.
if [[ $prefix == tx2-dxr3-* ]]; then
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
run_stage bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --no-publish "${cpus[@]}" ${extra[@]+"${extra[@]}"} > "$out/up.log" 2>&1
run_stage bash lab/experiments/EXP-DX1/stack/run-in-vm.sh "$prefix" --cpus "${DX_CPUS_DRIVER:-6,7}" --memory "${DX_DRIVER_MEMORY:-3g}" -- node lab/experiments/EXP-DX1/h3/observe.mjs \
 --lane datomic --composition reach --read-path "${DX_READ_PATH:-gateway}" --profile "${DX_NS_PROFILE:-smoke}" --reader-threads "${DX_READER_THREADS:-2}" --oracle-root "${DX_ORACLE_ROOT:-$DX_STACK_EVIDENCE/oracle}" --output runs/DX-H3-vm/ns-report.json "$@" > "$out/driver.log" 2>&1
