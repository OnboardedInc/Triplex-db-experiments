#!/usr/bin/env bash
# [DX-T1-2] Why: two full default-level pairs needs same-session off references and one uninterrupted quiet hold.
# Rejected: compare its latency with an earlier session or shorten the full pair to fit a control.
set -euo pipefail
prefix=${1:?tx2-dxt1-prefix};shift
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}
export TRIPLEX_TRACE_SESSION=$prefix
session_dir=$DX_STACK_EVIDENCE/$prefix-session
mkdir "$session_dir"
git rev-parse HEAD > "$session_dir/head.txt"
sh lab/bin/host-quiet.sh --wait "${DX_QUIET_WAIT_MIN:-10}" > "$session_dir/quiet-admission.jsonl" || exit 75
python3 -c 'import shutil;assert shutil.disk_usage(".").free>=15*1024**3'
lock=$HOME/Claude/Projects/triplex-db-2/locks/measure
while ! mkdir "$lock" 2>/dev/null;do sleep 5;done
printf '{"id":"DX-T1","pid":%s,"kind":"full-pair"}\n' "$$" > "$lock/owner.json"
export DX_R3_PAIR_LEASE_PID=$$ DX_PAIR_LEASE_ID=DX-T1
child= watchdog=
cleanup() {
 rc=$?;trap - EXIT TERM INT
 if [[ -n $child ]];then kill -TERM "$child" 2>/dev/null || true;wait "$child" || true;fi
 if [[ -n $watchdog ]];then kill "$watchdog" 2>/dev/null || true;wait "$watchdog" 2>/dev/null || true;fi
 bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --inventory > "$session_dir/remaining.txt" || exit 1
 [[ ! -s $session_dir/remaining.txt ]] || { echo 'Owned resources remain; retaining lease' >&2;exit 1; }
 python3 - "$DX_STACK_EVIDENCE" "$prefix" <<'PY_RESTORE'
import pathlib,json,sys
for state in pathlib.Path(sys.argv[1]).glob(sys.argv[2]+"*/scheduler-state.json"):
 old=json.loads(state.read_text());rows=[json.loads(l) for l in state.with_name("scheduler-control.jsonl").read_text().splitlines() if l.strip()]
 assert rows and rows[-1]["mode"]=="restore" and rows[-1]["after"]==old["before"], "Unrestored guest scheduler: "+str(state)
PY_RESTORE
 rm "$lock/owner.json";rmdir "$lock";exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM INT
node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),7800000)' "$$" & watchdog=$!
run_stage() {
 [[ $(git rev-parse HEAD) == $(cat "$session_dir/head.txt") ]] || exit 2
 "$@" & child=$!;wait "$child";child=
}
unset TRIPLEX_TRACE_COMPONENTS
for arm in off-before baseline candidate off-after;do
 sh lab/bin/host-quiet.sh > "$session_dir/$arm-host-before.jsonl" || true
 if [[ $arm == baseline ]];then
  run_stage env TRIPLEX_TRACE_LEVEL=summary DX_CPUS_DRIVER=4,5,6,7 DX_CPUS_GW_READ=2,3 DX_MAIN_CPU= DX_WORKER_CPUS= bash lab/experiments/EXP-DX1/t1/run.sh pair "$prefix-baseline" --rung 10k "$@" > "$session_dir/$arm-controller.log" 2>&1
 elif [[ $arm == candidate ]];then
  run_stage env TRIPLEX_TRACE_LEVEL=summary DX_CPUS_DRIVER=3,4,5,6,7 DX_CPUS_GW_READ=2 DX_MAIN_CPU=3 DX_WORKER_CPUS=4,5,6,7 bash lab/experiments/EXP-DX1/t1/run.sh pair "$prefix-candidate" --rung 10k "$@" > "$session_dir/$arm-controller.log" 2>&1
 else
  run_stage env TRIPLEX_TRACE_LEVEL=off DX_CPUS_DRIVER=4,5,6,7 DX_CPUS_GW_READ=2,3 DX_MAIN_CPU= DX_WORKER_CPUS= bash lab/experiments/EXP-DX1/t1/run.sh real "$prefix-$arm" --rung 10k --zero-readers --reader-ladder-only --max-readers 0 --level-s 20 --match-duration-s 200 "$@" > "$session_dir/$arm-controller.log" 2>&1
 fi
 sh lab/bin/host-quiet.sh > "$session_dir/$arm-host-after.jsonl" || true
done
for placement in baseline candidate;do python3 lab/experiments/EXP-DX1/h4/summarize.py "$DX_STACK_EVIDENCE/$prefix-$placement-ladder" > "$session_dir/$placement-TABLES.md";done
node lab/trace/study.mjs "$DX_STACK_EVIDENCE" "$prefix" --placements > "$session_dir/analysis.log"
