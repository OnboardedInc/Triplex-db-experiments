#!/usr/bin/env bash
# [DX-T1-11] Why: current-layout native size pricing needs zero/256/zero bookends, one source and one admitted host session.
# Rejected: extrapolate a former host's datom slope or let offline replay compete with the measured driver.
set -euo pipefail
prefix=${1:?tx2-dxt1-prefix};shift
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}
export TRIPLEX_TRACE_SESSION=$prefix TRIPLEX_TRACE_LEVEL=full
export DX_LAYOUT_REPLAY=1 DX_TX_NATIVE_JFR=1 DX_STORAGE_DIAGNOSTIC=1 DX_NATIVE_SETTINGS_READBACK=1
session=$DX_STACK_EVIDENCE/$prefix-session
mkdir "$session"
git rev-parse HEAD > "$session/head.txt"
printf '%s\n' '{"kind":"current-layout size calibration; pure A-E replay","subjects":10000,"seconds":300,"arms":["zero-before","loaded","zero-after"],"layoutAdoption":false}' > "$session/plan.json"
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
 [[ ! -s $session/remaining.txt ]] || exit 1
 python3 - "$DX_STACK_EVIDENCE" "$prefix" <<'RESTORE'
import pathlib,json,sys
for p in pathlib.Path(sys.argv[1]).glob(sys.argv[2]+'*/scheduler-state.json'):
 old=json.loads(p.read_text());events=[json.loads(l) for l in p.with_name('scheduler-control.jsonl').read_text().splitlines() if l.strip()]
 assert events and events[-1]['mode']=='restore' and events[-1]['after']==old['before']
RESTORE
 rm "$lock/owner.json";rmdir "$lock";exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM INT
node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),5400000)' "$$" & watchdog=$!
for arm in zero-before loaded zero-after;do
 [[ $(git rev-parse HEAD) == $(cat "$session/head.txt") ]] || exit 2
 sh lab/bin/host-quiet.sh > "$session/$arm-host-before.jsonl" || true
 args=(--rung 10k --reader-ladder-only --max-readers 256 --level-s 45 --match-duration-s 300 --probe10-per-s 0)
 [[ $arm == loaded ]] || args+=(--zero-readers)
 bash lab/experiments/EXP-DX1/t1/run.sh real "$prefix-$arm" "${args[@]}" "$@" > "$session/$arm-controller.log" 2>&1 & child=$!
 rc=0;wait "$child" || rc=$?;child=
 printf '%s\n' "$rc" > "$session/$arm-exit.txt"
 [[ $rc == 0 ]] || exit "$rc"
 sh lab/bin/host-quiet.sh > "$session/$arm-host-after.jsonl" || true
done
