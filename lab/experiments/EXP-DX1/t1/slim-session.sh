#!/usr/bin/env bash
# [DX-T1-8] Why: fresh opt-in layout seeds need one source-frozen ABA lease, with current-layout bookends.
# Rejected: mutating sealed seeds or comparing a slim arm with a historical current-layout run.
set -euo pipefail
prefix=${1:?tx2-dxt1-slim-tag}; subjects=${2:-1000}
[[ $prefix =~ ^tx2-dxt1-slim-[a-z0-9-]+$ && ( $subjects == 1000 || $subjects == 10000 ) ]] || exit 2
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}
export TRIPLEX_TRACE_SESSION=$prefix DX_NATIVE_SETTINGS_READBACK=1 DX_NATIVE_GATES=0 DX_TRANSACTION_CENSUS=1
export TRIPLEX_TRACE_LEVEL=full TRIPLEX_TRACE_COMPONENTS=node,gateway,tx-jfr,gw-jfr,postgres DX_TX_NATIVE_JFR=1
session=$DX_STACK_EVIDENCE/$prefix-session
mkdir "$session"
git rev-parse HEAD > "$session/head.txt"
printf '{"subjects":%s,"duration":200,"arms":["current","slim","current"],"scope":"zero-reader diagnostic, not a full verdict"}\n' "$subjects" > "$session/plan.json"
python3 -c 'import shutil;assert shutil.disk_usage(".").free>=15*1024**3'
lock=$HOME/Claude/Projects/triplex-db-2/locks/measure
while ! mkdir "$lock" 2>/dev/null;do sleep 5;done
printf '{"id":"DX-T1","pid":%s,"kind":"writer-arms"}\n' "$$" > "$lock/owner.json"
export DX_R3_PAIR_LEASE_PID=$$ DX_PAIR_LEASE_ID=DX-T1
child= watchdog=
cleanup() {
 rc=$?;trap - EXIT TERM INT
 if [[ -n $child ]];then kill -TERM "$child" 2>/dev/null || true;wait "$child" || true;fi
 if [[ -n $watchdog ]];then kill "$watchdog" 2>/dev/null || true;wait "$watchdog" 2>/dev/null || true;fi
 bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --inventory > "$session/remaining.txt" || exit 1
 [[ ! -s $session/remaining.txt ]] || { echo 'Owned resources remain; retaining lease' >&2;exit 1; }
 python3 - "$DX_STACK_EVIDENCE" "$prefix" <<'PY_RESTORE'
import pathlib,json,sys
for state in pathlib.Path(sys.argv[1]).glob(sys.argv[2]+"*/scheduler-state.json"):
 old=json.loads(state.read_text());rows=[json.loads(l) for l in state.with_name("scheduler-control.jsonl").read_text().splitlines() if l.strip()]
 assert rows and rows[-1]["mode"]=="restore" and rows[-1]["after"]==old["before"], "Unrestored guest scheduler"
PY_RESTORE
 rm "$lock/owner.json";rmdir "$lock";exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM INT
node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),3600000)' "$$" & watchdog=$!
i=0
for arm in current slim current;do
 i=$((i+1)); mode=0;[[ $arm != slim ]] || mode=1
 [[ $(git rev-parse HEAD) == $(cat "$session/head.txt") ]] || exit 2
 sh lab/bin/host-quiet.sh > "$session/$i-host-before.jsonl" || true
 env DX_SLIM_ROWS=$mode DX_GATEWAY_SELFTEST=1 bash lab/experiments/EXP-DX1/t1/run.sh real "$prefix-$i-$arm" --subjects "$subjects" --reader-ladder-only --zero-readers --max-readers 0 --level-s 20 --match-duration-s 200 > "$session/$i-controller.log" 2>&1 & child=$!
 stage_rc=0;wait "$child" || stage_rc=$?;child=
 printf '%s\n' "$stage_rc" > "$session/$i-exit.txt"
 [[ $stage_rc == 0 ]] || exit "$stage_rc"
 sh lab/bin/host-quiet.sh > "$session/$i-host-after.jsonl" || true
done
