#!/usr/bin/env bash
# [DX-T1-2] Why: one lease, one source and bookend controls bind recorder ablations to one host session.
# Rejected: compare a recorder with a historical quiet off arm or allow unrelated work between arms.
set -euo pipefail
kind=${1:?ablation|cost|anatomy|cpu-floor|fallback-floor|history-256|seed-floor|writer-256}; prefix=${2:?tx2-dxt1-prefix}; shift 2
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}
export TRIPLEX_TRACE_SESSION=$prefix
session_dir=$DX_STACK_EVIDENCE/$prefix-session
mkdir "$session_dir"
git rev-parse HEAD > "$session_dir/head.txt"
# [DX-T1-4] Why: the authorized in-use-host study records admission and retains bookend drift.
# Rejected: stopping diagnosis on host CPU activity; only the final absolute verdict needs quiet qualification.
quiet_rc=0
sh lab/bin/host-quiet.sh --wait "${DX_QUIET_WAIT_MIN:-0}" > "$session_dir/quiet-admission.jsonl" || quiet_rc=$?
printf '%s\n' "$quiet_rc" > "$session_dir/quiet-admission-exit.txt"
python3 -c 'import shutil;assert shutil.disk_usage(".").free>=15*1024**3'
lock=$HOME/Claude/Projects/triplex-db-2/locks/measure
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
printf '{"id":"DX-T1","pid":%s,"kind":"writer-arms"}\n' "$$" > "$lock/owner.json"
export DX_R3_PAIR_LEASE_PID=$$ DX_PAIR_LEASE_ID=DX-T1
child= watchdog=
cleanup() {
  rc=$?;trap - EXIT TERM INT
  if [[ -n $child ]]; then kill -TERM "$child" 2>/dev/null || true;wait "$child" || true;fi
  if [[ -n $watchdog ]]; then kill "$watchdog" 2>/dev/null || true;wait "$watchdog" 2>/dev/null || true;fi
  bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --inventory > "$session_dir/remaining.txt" || exit 1
  [[ ! -s $session_dir/remaining.txt ]] || { echo 'Owned resources remain; retaining lease' >&2;exit 1; }
 python3 - "$DX_STACK_EVIDENCE" "$prefix" <<'PY_RESTORE'
import pathlib,json,sys
for state in pathlib.Path(sys.argv[1]).glob(sys.argv[2]+"*/scheduler-state.json"):
 old=json.loads(state.read_text());rows=[json.loads(l) for l in state.with_name("scheduler-control.jsonl").read_text().splitlines() if l.strip()]
 assert rows and rows[-1]["mode"]=="restore" and rows[-1]["after"]==old["before"], "Unrestored guest scheduler: "+str(state)
PY_RESTORE
  rm "$lock/owner.json";rmdir "$lock"
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM INT
node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),5400000)' "$$" & watchdog=$!
if [[ $kind == ablation ]]; then
  arms=(off tx-jfr gw-jfr postgres gateway node native-logs full off)
elif [[ $kind == cost ]]; then arms=(off summary summary off)
elif [[ $kind == anatomy ]]; then arms=(off anatomy anatomy off)
elif [[ $kind == cpu-floor ]]; then arms=(baseline engine-isolated engine-isolated baseline)
elif [[ $kind == fallback-floor ]]; then arms=(baseline fallback-worker fallback-worker baseline)
elif [[ $kind == history-256 ]]; then arms=(baseline history-192 history-192 baseline)
elif [[ $kind == seed-floor ]]; then arms=(baseline seed-2000 seed-2000 baseline)
elif [[ $kind == writer-256 ]]; then arms=(baseline writer-core writer-core baseline)
else exit 2;fi
i=0;session_rc=0
for arm in "${arms[@]}"; do
  i=$((i+1));tag=$prefix-$i-$arm
  [[ $(git rev-parse HEAD) == $(cat "$session_dir/head.txt") ]] || exit 2
  sh lab/bin/host-quiet.sh > "$session_dir/$i-host-before.jsonl" || true
  level=full;components=$arm
  if [[ $arm == off ]]; then level=off;components=;fi
  if [[ $arm == anatomy || $kind == cpu-floor ]]; then components=node,gateway,tx-jfr,gw-jfr,postgres;fi
  placement=()
  if [[ $kind == cpu-floor ]]; then
    # [DX-T1-4] Why: isolate the largest peer wait from PG/HTTP CPU competition, without changing TX capacity or Node placement.
    # Rejected: simultaneously changing the writer core, collector or workload (cannot attribute a floor change).
    placement=(DX_CPUS_TX=0,1 DX_CPUS_PG=0 DX_CPUS_GW_WRITE=1 DX_CPUS_GW_READ=2,3 DX_CPUS_DRIVER=4,5,6,7 DX_MAIN_CPU= DX_WORKER_CPUS=)
    if [[ $arm == engine-isolated ]]; then placement=(DX_CPUS_TX=0,1 DX_CPUS_PG=2 DX_CPUS_GW_WRITE=3 DX_CPUS_GW_READ=2,3 DX_CPUS_DRIVER=4,5,6,7 DX_MAIN_CPU= DX_WORKER_CPUS=);fi
  fi
  workload=();duration=200;level_s=20;reader_args=(--zero-readers --max-readers 0)
  if [[ $kind == fallback-floor ]]; then
    # [DX-T1-4] Why: sampled writer stacks identify full-world fallback decoding/checking on this thread.
    # Rejected: change CPU placement or expected-state representation in the same comparison.
    level=summary;components=default;workload=(--replica-fallback-thread main)
    [[ $arm != fallback-worker ]] || workload=(--replica-fallback-thread worker)
  fi
  if [[ $kind == history-256 ]]; then
    # [DX-T1-4] Why: q8 retained 192 MiB; a 64-MiB window sends old exact cuts to the gateway.
    # Rejected: changing the read basis or hiding fallbacks; compare the same cohort with more retained history.
    level=summary;components=default;duration=300;level_s=45;reader_args=(--max-readers 256)
    workload=(--replica-history-mib 64 --replica-fallback-thread worker)
    [[ $arm != history-192 ]] || workload=(--replica-history-mib 192 --replica-fallback-thread worker)
  fi
  if [[ $kind == seed-floor ]]; then
    # [DX-T1-4] Why: q8 used 2,000 seed facts per transaction; isolate its effect on the measured floor.
    # Rejected: changing the frozen writer trace, read window, collector or engine settings in this comparison.
    level=summary;components=default;workload=(--seed-batch-facts 400)
    [[ $arm != seed-2000 ]] || workload=(--seed-batch-facts 2000)
  fi
  if [[ $kind == writer-256 ]]; then
    # [DX-T1-4] Why: L256 trace counters show several seconds of writer run-queue wait; reserve one writer core.
    # Rejected: reducing reader CPUs or changing transactor/Postgres settings in the same trial.
    level=summary;components=default;duration=300;level_s=45;reader_args=(--max-readers 256)
    workload=(--replica-history-mib 192 --replica-fallback-thread worker)
    placement=(DX_CPUS_DRIVER=4,5,6,7 DX_CPUS_GW_READ=2,3 DX_MAIN_CPU= DX_WORKER_CPUS=)
    [[ $arm != writer-core ]] || placement=(DX_CPUS_DRIVER=3,4,5,6,7 DX_CPUS_GW_READ=2 DX_MAIN_CPU=3 DX_WORKER_CPUS=4,5,6,7)
  fi
  if [[ $arm == full || $arm == summary ]]; then level=$arm;components=default;fi
  export TRIPLEX_TRACE_LEVEL=$level
  if [[ $components == default ]]; then unset TRIPLEX_TRACE_COMPONENTS;else export TRIPLEX_TRACE_COMPONENTS=$components;fi
  env DX_FSYNC_PROBE=$([[ $kind == anatomy && $i == 1 ]] && echo 1 || echo 0) ${placement[@]+"${placement[@]}"} bash lab/experiments/EXP-DX1/t1/run.sh real "$tag" --rung 10k --reader-ladder-only "${reader_args[@]}" --level-s "$level_s" --match-duration-s "$duration" ${workload[@]+"${workload[@]}"} "$@" > "$session_dir/$i-controller.log" 2>&1 & child=$!
  stage_rc=0;wait "$child" || stage_rc=$?;child=
  printf '%s\n' "$stage_rc" > "$session_dir/$i-exit.txt"
  if [[ $stage_rc != 0 ]];then
    [[ $session_rc != 0 ]] || session_rc=$stage_rc
    bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --inventory > "$session_dir/$i-remaining-after-failure.txt"
    [[ ! -s $session_dir/$i-remaining-after-failure.txt ]] || exit "$stage_rc"
  fi
  sh lab/bin/host-quiet.sh > "$session_dir/$i-host-after.jsonl" || true
done
[[ $session_rc == 0 ]] || exit "$session_rc"
node lab/trace/ablation.mjs "$DX_STACK_EVIDENCE" "$prefix" "$kind" > "$session_dir/analysis.log"
