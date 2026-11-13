#!/usr/bin/env bash
# [DX-T1-2] Why: one lease, one source and bookend controls bind recorder ablations to one host session.
# Rejected: compare a recorder with a historical quiet off arm or allow unrelated work between arms.
set -euo pipefail
kind=${1:?ablation|cost}; prefix=${2:?tx2-dxt1-prefix}; shift 2
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}
export TRIPLEX_TRACE_SESSION=$prefix
session_dir=$DX_STACK_EVIDENCE/$prefix-session
mkdir "$session_dir"
git rev-parse HEAD > "$session_dir/head.txt"
sh lab/bin/host-quiet.sh --wait "${DX_QUIET_WAIT_MIN:-10}" > "$session_dir/quiet-admission.jsonl" || exit 75
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
  rm "$lock/owner.json";rmdir "$lock"
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM INT
node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),5400000)' "$$" & watchdog=$!
if [[ $kind == ablation ]]; then
  arms=(off tx-jfr gw-jfr postgres gateway node native-logs full off)
elif [[ $kind == cost ]]; then arms=(off summary summary off)
else exit 2;fi
i=0
for arm in "${arms[@]}"; do
  i=$((i+1));tag=$prefix-$i-$arm
  [[ $(git rev-parse HEAD) == $(cat "$session_dir/head.txt") ]] || exit 2
  sh lab/bin/host-quiet.sh > "$session_dir/$i-host-before.jsonl" || true
  level=full;components=$arm
  if [[ $arm == off ]]; then level=off;components=;fi
  if [[ $arm == full || $arm == summary ]]; then level=$arm;components=default;fi
  export TRIPLEX_TRACE_LEVEL=$level
  if [[ $components == default ]]; then unset TRIPLEX_TRACE_COMPONENTS;else export TRIPLEX_TRACE_COMPONENTS=$components;fi
  bash lab/experiments/EXP-DX1/t1/run.sh real "$tag" --rung 10k --zero-readers --reader-ladder-only --max-readers 0 --level-s 20 --match-duration-s 200 "$@" > "$session_dir/$i-controller.log" 2>&1 & child=$!
  wait "$child";child=
  sh lab/bin/host-quiet.sh > "$session_dir/$i-host-after.jsonl" || true
done
node lab/trace/ablation.mjs "$DX_STACK_EVIDENCE" "$prefix" "$kind" > "$session_dir/analysis.log"
