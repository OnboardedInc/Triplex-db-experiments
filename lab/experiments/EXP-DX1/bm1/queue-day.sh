#!/usr/bin/env bash
# [DX-BM1] Why: a timed stage's systemd cgroup owns its shell descendants and a separate stop hook owns its Docker teardown.
# Rejected: wait on a killed foreground shell, archive a growing run, or let the next stage inherit a stale lock.
set -euo pipefail

mode=${1:---plan}
if [[ $mode == --plan ]]; then
  printf '%s\n' 'After the driver comparison releases the native bench: prepare, prove 1k W0, clone and reverify the retained 100k seed, run one v3 pair.'
  printf '%s\n' 'Run as root from the named pushed checkout: queue-day.sh --launch BATCH UTC_CUTOFF'
  exit
fi
[[ $EUID == 0 && $(uname -s) == Linux && $(systemd-detect-virt) == none ]] || exit 2
batch=${2:?batch required}
stop=${3:?UTC cutoff required}
[[ $batch =~ ^[a-z0-9]{1,12}$ && $stop =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]] || exit 2
root=/var/tmp/triplex-bm1
day=$root/day-$batch
work=$day/checkout
logs=$day/logs
prefix=tx2-dxt1-bm1-$batch
runner=$(cd "$(dirname "$0")" && pwd)
runner_source=$(git -C "$runner" rev-parse HEAD)
cutoff=$(date -u -d "$stop" +%s)
t1=lab/experiments/EXP-DX1/t1
bm1=lab/experiments/EXP-DX1/bm1
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
export DOCKER_HOST=unix:///var/run/docker.sock DEBIAN_FRONTEND=noninteractive TURBO_TELEMETRY_DISABLED=1
unset DOCKER_CONTEXT DOCKER_TLS DOCKER_TLS_VERIFY DOCKER_CERT_PATH
umask 077
stamp() { date -u '+%FT%TZ'; }
status() {
  local temporary
  temporary=$(mktemp "$root/.STATUS.XXXXXX")
  printf 'item=%s state=%s since=%s next=%s\n' "$1" "$2" "$(stamp)" "$3" > "$temporary"
  chmod 0644 "$temporary"
  mv -T "$temporary" "$root/STATUS"
}
use_checkout() {
  export PATH="$work/tools/bin:$PATH" DOCKER_CONFIG=$work/docker-config
  export DX_BARE_METAL=1 DX_BARE_METAL_ROOT=$work/state
  export DX_STACK_EVIDENCE=$work/state/evidence/DX-T1 TRIPLEX_TRACE_EVIDENCE=$work/state/evidence
  export DX_COMPILER_POLICY=early DX_NATIVE_GATES=0 TRIPLEX_BENCH_SPILL_MAX_BYTES=137438953472
  unset DX_NIGHT_WINDOW DX_IDLE_SENTINEL DX_IDLE_REFUSAL_PROBE DX_IDLE_TCP DX_ORACLE_ROOT TRIPLEX_TRACE_COMPONENTS
  cd "$work/repository"
  [[ $(git rev-parse HEAD) == "$runner_source" && -z $(git status --porcelain) ]]
}

# Known batch tags are disjoint from the comparison and from the retained seed volume.
owned_tags() {
  case $1 in
    setup) return 0 ;;
    smoke|activation-a|activation-b) printf '%s\n' "$prefix-$1" ;;
    pair) printf '%s\n' "$prefix-pair-"off-before "$prefix-pair-"zero "$prefix-pair-"ladder "$prefix-pair-"off-after ;;
    *) return 2 ;;
  esac
}
owned_resources() {
  local item=$1 kind=$2 name tag rows tags id
  tags=$(owned_tags "$item") || return
  [[ -n $tags ]] || return 0
  case $kind in
    containers) rows=$(timeout 15s docker ps -a --format '{{.ID}} {{.Names}}') || return ;;
    volumes) rows=$(timeout 15s docker volume ls --format '{{.Name}} {{.Name}}') || return ;;
    networks) rows=$(timeout 15s docker network ls --format '{{.ID}} {{.Name}}') || return ;;
    *) return 2 ;;
  esac
  while read -r id name; do
    [[ -n $name ]] || continue
    for tag in $tags; do
      if [[ $name == "$tag-"* ]]; then printf '%s %s\n' "$id" "$name"; break; fi
    done
  done <<< "$rows"
}

cleanup_item() {
  local item=$1 id name names kind pass
  local ids
  local cleanup=$logs/$item-cleanup
  mkdir -p "$cleanup"
  exec >> "$cleanup/cleanup.log" 2>&1
  printf '%s stop result=%s code=%s status=%s\n' "$(stamp)" "${SERVICE_RESULT:-manual}" "${EXIT_CODE:-}" "${EXIT_STATUS:-}"
  # Capture before force removal. This only runs after systemd has signalled the whole stage cgroup.
  owned_resources "$item" containers > "$cleanup/containers-before.txt"
  while read -r id name; do
    [[ -n $id ]] || continue
    timeout 8s docker logs --tail 4000 --timestamps "$id" > "$cleanup/$name.log" 2>&1 || true
    timeout 8s docker inspect "$id" > "$cleanup/$name.inspect.json" 2>&1 || true
  done < "$cleanup/containers-before.txt"
  for pass in 1 2 3; do
    for kind in containers networks volumes; do
      names=$(owned_resources "$item" "$kind")
      [[ -n $names ]] || continue
      ids=()
      while read -r id name; do ids+=("$id"); done <<< "$names"
      case $kind in
        containers) timeout 15s docker rm -f "${ids[@]}" || true ;;
        networks) timeout 12s docker network rm "${ids[@]}" || true ;;
        volumes) timeout 12s docker volume rm "${ids[@]}" || true ;;
      esac
    done
    sleep 1
    : > "$cleanup/remaining.txt"
    for kind in containers networks volumes; do owned_resources "$item" "$kind" >> "$cleanup/remaining.txt"; done
    [[ -s $cleanup/remaining.txt ]] || break
  done
  [[ ! -s $cleanup/remaining.txt ]] || { printf '%s\n' 'Owned resources remain'; exit 1; }
  if [[ $item != setup && -d $work/state/locks/measure ]]; then
    local lock=$work/state/locks/measure
    if [[ -f $lock/owner.json ]]; then
      python3 - "$lock/owner.json" "$item" "$prefix" <<'LEASE'
import json,sys
r=json.load(open(sys.argv[1]))
item,prefix=sys.argv[2:]
assert r['id']=='DX-T1'
if item=='pair': assert r['kind']=='full-pair'
else: assert r['kind']=='activation' and r['prefix']==f'{prefix}-{item}'
LEASE
      rm -- "$lock/owner.json"
    fi
    rmdir "$lock"
  fi
  printf '%s\n' clean > "$cleanup/result"
}

# [DX-BM1] Why: the child cgroup belongs to the stage even if the controller itself is killed.
# Rejected: leave an independent systemd unit running after losing its collector.
reconcile_controller() {
  [[ -d $logs ]] || return 0
  if [[ -f $day/active-item ]]; then
    local item
    item=$(cat "$day/active-item")
    owned_tags "$item" >/dev/null
    status "$item" reconciling collect
    if ! timeout 160s systemctl stop "triplex-bm1-$batch-$item"; then
      local state
      state=$(systemctl show "triplex-bm1-$batch-$item" -p ActiveState --value)
      [[ $state == inactive || $state == failed ]] ||
        { status "$item" teardown-failed collect; return 1; }
    fi
    if [[ $(cat "$logs/$item-cleanup/result" 2>/dev/null) != clean ]]; then
      (cleanup_item "$item") || { status "$item" teardown-failed collect; return 1; }
    fi
    rm -- "$day/active-item"
    status "$item" controller-interrupted collect
  fi
}

configure_placement() {
  export DX_CPUS_TX=0 DX_CPUS_PG=1 DX_CPUS_GW_WRITE=2 DX_CPUS_GW_READ=4,8
  export DX_CPUS_DRIVER=3,5,6,7,9,10,11 DX_MAIN_CPU=3 DX_WORKER_CPUS=5,6,7,9,10,11
  export DX_READER_THREADS=6 DX_DRIVER_MEMORY=48g
  export NODE_OPTIONS=--max-old-space-size=1536
  export DX_ACTIVATION_GW_READ_CPUS=$DX_CPUS_GW_READ DX_ACTIVATION_CPUS=$DX_CPUS_DRIVER
  export DX_ACTIVATION_VERIFY_PAGES=4 DX_P5_LIVE_READERS=64 DX_ACTIVATION_POST_CAPTURE=1
}
run_item() {
  local item=$1 item_stop=$2
  exec >> "$logs/$item.log" 2>&1
  printf '%s start %s source=%s\n' "$(stamp)" "$item" "$runner_source"
  if [[ $item == setup ]]; then
    local cache=$root/queue-20261118r/scale bootstrap_rc=0
    if [[ -f $cache/downloads/node.tar.xz && -f $cache/downloads/node-SHASUMS256.txt &&
          -f $cache/downloads/datomic-pro-1.0.7745.zip && -d $cache/corepack && -d $cache/pnpm-store ]]; then
      export DX_NATIVE_BOOTSTRAP_CACHE=$cache
    fi
    bash "$runner/../t1/bare-metal.sh" --prepare "$runner_source" "$work" || bootstrap_rc=$?
    if ((bootstrap_rc != 0)) && [[ -n ${DX_NATIVE_BOOTSTRAP_CACHE:-} ]]; then
      echo "Cached bootstrap failed with $bootstrap_rc; preserving it before a fresh bootstrap"
      if [[ -d $work ]]; then mv -T "$work" "$day/setup-cache-failure"; fi
      unset DX_NATIVE_BOOTSTRAP_CACHE
      bash "$runner/../t1/bare-metal.sh" --prepare "$runner_source" "$work"
    else
      ((bootstrap_rc == 0)) || exit "$bootstrap_rc"
    fi
    docker image inspect python:3.13-slim --format '{{.Id}}' > "$logs/python-image.txt"
    exit
  fi
  use_checkout
  configure_placement
  case $item in
    smoke)
      DX_ACTIVATION_STOP_AT=$item_stop bash "$t1/activation.sh" --execute "$prefix-smoke" 1000 seed live ;;
    activation-a|activation-b)
      export DX_ACTIVATION_RETAINED_RUN=$root/queue-20261118r/scale/state/evidence/DX-T1/tx2-dxt1-bm1-20261118d-activation
      DX_ACTIVATION_STOP_AT=$item_stop bash "$t1/activation.sh" --execute "$prefix-$item" 100000 retained live ;;
    pair)
      DX_NS_PROFILE=v3 DX_STUDY_LEVEL=summary bash "$t1/study.sh" "$prefix-pair" --idle-keep none ;;
    *) exit 2 ;;
  esac
}

case $mode in
  --item) [[ $# == 5 && -d $logs ]] || exit 2; run_item "$4" "$5"; exit ;;
  --cleanup) [[ $# == 4 && -d $logs ]] || exit 2; cleanup_item "$4"; exit ;;
  --reconcile) [[ $# == 3 ]] || exit 2; reconcile_controller; exit ;;
  --launch)
    [[ $# == 3 && ! -e $day && $runner != *[[:space:]]* ]] || exit 2
    state=$(systemctl show triplex-drv1-wait -p ActiveState --value)
    [[ $state == inactive || $state == failed ]] || exit 75
    lifetime=$((cutoff - $(date +%s) + 180))
    ((lifetime > 600)) || exit 75
    exec systemd-run --no-block --unit="triplex-bm1-$batch-queue" \
      --property=KillMode=control-group --property="RuntimeMaxSec=${lifetime}s" \
      --property=TimeoutStopSec=180s \
      --property="ExecStopPost=/bin/bash $runner/queue-day.sh --reconcile $batch $stop" \
      /bin/bash "$runner/queue-day.sh" --run "$batch" "$stop"
    ;;
  --run) [[ $# == 3 ]] || exit 2 ;;
  *) exit 2 ;;
esac

mkdir -p "$root"
exec 9> "$root/dx-bm1-day.lock"
flock -n 9 || exit 75
[[ -z $(git -C "$runner" status --porcelain) ]]
mkdir "$day" "$logs"
exec >> "$logs/queue.log" 2>&1
final=failed
trap 'status queue "$final" collect' EXIT
trap 'exit 143' TERM INT
systemctl show triplex-drv1-wait -p ActiveState -p Result -p ExecMainStatus > "$logs/comparison-terminal.txt"
state=$(systemctl show triplex-drv1-wait -p ActiveState --value)
[[ $state == inactive || $state == failed ]] || { echo 'Comparison still owns the bench'; exit 75; }
[[ -z $(docker ps -q) ]] || { echo 'Running Docker resources belong to a prior holder'; exit 75; }
printf '%s\n' "$runner_source" > "$logs/source.txt"
printf '%s\n' "$stop" > "$logs/cutoff.txt"
lscpu -p=CPU,CORE,SOCKET > "$logs/topology.csv"
python3 - "$logs/topology.csv" <<'CORES'
import csv,sys
physical={}
for cpu,core,socket in csv.reader(l for l in open(sys.argv[1]) if not l.startswith('#')):
    physical[int(cpu)]=(socket,core)
assert all(cpu in physical for cpu in range(12))
assert len({physical[cpu] for cpu in range(12)})==12, 'bench placement shares an SMT sibling'
CORES

seal_run() {
  local tag=$1 path=$2 item=$3 archive_seconds
  shift 3
  [[ -d $path ]] || return 0
  archive_seconds=$((cutoff - $(date +%s)))
  if ((archive_seconds <= 0)); then echo "Deadline before archive $tag"; return 1; fi
  if ((archive_seconds > 1200)); then archive_seconds=1200; fi
  timeout --kill-after=10s "${archive_seconds}s" bash "$runner/bundle.sh" "$root" "$tag" "$path" \
    "$logs/$item.log" "$logs/$item.exit" "$logs/source.txt" "$logs/topology.csv" "$@"
}
run_stage() {
  local item=$1 next=$2 ceiling=$3 minimum=$4 rc=0
  local now remaining unit item_stop running reserve=180
  now=$(date +%s)
  [[ $item != pair ]] || reserve=900
  remaining=$((cutoff - now - reserve))
  if ((ceiling > remaining)); then ceiling=$remaining; fi
  running=$(timeout 15s docker ps -q) || { echo 'Docker inventory unavailable'; return 76; }
  if ((ceiling < minimum)) || [[ -e $day/active-item || -e $work/state/locks/measure || -n $running ]]; then
    printf '%s skipped %s, remaining=%ss or bench not idle\n' "$(stamp)" "$item" "$remaining" > "$logs/$item.log"
    printf '%s\n' 75 > "$logs/$item.exit"
    return 75
  fi
  unit=triplex-bm1-$batch-$item
  item_stop=$(date -u -d "@$((now + ceiling))" '+%FT%TZ')
  printf '%s\n' "$item" > "$day/active-item"
  status "$item" running "$next"
  systemd-run --wait --unit="$unit" \
    --property=KillMode=control-group --property="RuntimeMaxSec=${ceiling}s" \
    --property=TimeoutStopSec=150s \
    --property="ExecStopPost=/bin/bash $runner/queue-day.sh --cleanup $batch $stop $item" \
    /bin/bash "$runner/queue-day.sh" --item "$batch" "$stop" "$item" "$item_stop" || rc=$?
  printf '%s\n' "$rc" > "$logs/$item.exit"
  printf '%s terminal %s exit=%s\n' "$(stamp)" "$item" "$rc"
  [[ $(cat "$logs/$item-cleanup/result" 2>/dev/null) == clean ]] ||
    { echo "Teardown failed for $item"; return 76; }
  rm -- "$day/active-item"
  status "$item" archiving "$next"
  local evidence=$work/state/evidence/DX-T1 tag suffix
  if [[ $item == pair ]]; then
    for suffix in off-before zero ladder off-after session; do
      tag=$prefix-pair-$suffix
      seal_run "$tag" "$evidence/$tag" "$item" "$logs/$item-cleanup/"* || archive_failed=1
    done
  elif [[ $item == setup ]]; then
    seal_run "$prefix-$item" "$work/results" "$item" "$logs/$item-cleanup/"* || archive_failed=1
  else
    tag=$prefix-$item
    seal_run "$tag" "$evidence/$tag" "$item" "$logs/$item-cleanup/"* || archive_failed=1
  fi
  return "$rc"
}

archive_failed=0
if run_stage setup smoke 2100 150; then
  smoke_rc=0
  run_stage smoke activation-a 1500 600 || smoke_rc=$?
  activation_rc=$smoke_rc
  if ((smoke_rc == 0)); then
    # Reserve the two frozen 5,910-second arms and bookends. An earlier activation failure can retry inside the same two hours.
    activation_started=$(date +%s)
    activation_limit=$((activation_started + 7200))
    pair_reserve=15300
    next_stop=$((cutoff - pair_reserve))
    if ((activation_limit > next_stop)); then activation_limit=$next_stop; fi
    activation_rc=0
    run_stage activation-a pair "$((activation_limit - $(date +%s)))" 1500 || activation_rc=$?
    if ((activation_rc != 0 && activation_rc != 76 && activation_limit - $(date +%s) >= 1800)); then
      activation_rc=0
      run_stage activation-b pair "$((activation_limit - $(date +%s)))" 1800 || activation_rc=$?
    fi
  fi
  pair_rc=0
  run_stage pair collect 17400 12600 || pair_rc=$?
  printf '%s\n' "$activation_rc" > "$logs/activation-final.exit"
  printf '%s\n' "$pair_rc" > "$logs/pair-final.exit"
  final=finished
  if ((activation_rc != 0 || pair_rc != 0 || archive_failed != 0)); then final=finished-with-failures; fi
else
  final=setup-failed
fi
status queue archiving collect
seal_run "$prefix-day-logs" "$logs" setup || final=archive-failed
printf '%s end %s\n' "$(stamp)" "$final"
[[ $final == finished ]]
