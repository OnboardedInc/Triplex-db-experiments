#!/usr/bin/env bash
# [DX-T1-2] Why: a full default-level pair needs same-session off references and one uninterrupted quiet hold.
# Rejected: compare its latency with an earlier session or shorten the full pair to fit a control.
set -euo pipefail
prefix=${1:?tx2-dxt1-prefix};shift
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
node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),5400000)' "$$" & watchdog=$!
run_stage() {
 [[ $(git rev-parse HEAD) == $(cat "$session_dir/head.txt") ]] || exit 2
 local stage_rc=0; "$@" & child=$!;wait "$child" || stage_rc=$?;child=;return "$stage_rc"
}
unset TRIPLEX_TRACE_COMPONENTS
session_rc=0
for arm in off-before pair off-after;do
 stage_rc=0
 sh lab/bin/host-quiet.sh > "$session_dir/$arm-host-before.jsonl" || true
 if [[ $arm == pair ]];then
  run_stage env TRIPLEX_TRACE_LEVEL=summary bash lab/experiments/EXP-DX1/t1/run.sh pair "$prefix" --rung 10k "$@" > "$session_dir/$arm-controller.log" 2>&1 || stage_rc=$?
 else
  run_stage env TRIPLEX_TRACE_LEVEL=off bash lab/experiments/EXP-DX1/t1/run.sh real "$prefix-$arm" --rung 10k --zero-readers --reader-ladder-only --max-readers 0 --level-s 20 --match-duration-s 200 "$@" > "$session_dir/$arm-controller.log" 2>&1 || stage_rc=$?
 fi
 printf '%s\n' "$stage_rc" > "$session_dir/$arm-exit.txt"
 if [[ $stage_rc != 0 ]];then
  [[ $session_rc != 0 ]] || session_rc=$stage_rc
  bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --inventory > "$session_dir/$arm-remaining-after-failure.txt"
  [[ ! -s $session_dir/$arm-remaining-after-failure.txt ]] || exit "$stage_rc"
 fi
 sh lab/bin/host-quiet.sh > "$session_dir/$arm-host-after.jsonl" || true
done
[[ $session_rc == 0 ]] || exit "$session_rc"
python3 lab/experiments/EXP-DX1/h4/summarize.py "$DX_STACK_EVIDENCE/$prefix-ladder" > "$session_dir/TABLES.md"
node lab/trace/study.mjs "$DX_STACK_EVIDENCE" "$prefix" > "$session_dir/analysis.log"
