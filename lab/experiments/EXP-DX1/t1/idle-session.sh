#!/usr/bin/env bash
# [DX-T1-10] Why: fixed-gap probes need component-at-a-time comparisons between adjacent plain controls, on one source and lease.
# Rejected: ship warming in a verdict, change the global VM TCP setting, or compare across host sessions.
set -euo pipefail
prefix=${1:?tx2-dxt1-prefix};shift
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}
export TRIPLEX_TRACE_SESSION=$prefix
session_dir=$DX_STACK_EVIDENCE/$prefix-session
mkdir "$session_dir"
git rev-parse HEAD > "$session_dir/head.txt"
printf '%s\n' 'plain sentinel plain http plain refused plain tcp plain' > "$session_dir/modes.txt"
python3 -c 'import shutil;assert shutil.disk_usage(".").free>=15*1024**3'
lock=$HOME/Claude/Projects/triplex-db-2/locks/measure
while ! mkdir "$lock" 2>/dev/null;do sleep 5;done
printf '{"id":"DX-T1","pid":%s,"kind":"idle-components"}\n' "$$" > "$lock/owner.json"
export DX_R3_PAIR_LEASE_PID=$$ DX_PAIR_LEASE_ID=DX-T1
child= watchdog=
cleanup() {
 rc=$?;trap - EXIT TERM INT
 if [[ -n $child ]];then kill -TERM "$child" 2>/dev/null || true;wait "$child" || true;fi
 if [[ -n $watchdog ]];then kill "$watchdog" 2>/dev/null || true;wait "$watchdog" 2>/dev/null || true;fi
 bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --inventory > "$session_dir/remaining.txt" || exit 1
 [[ ! -s $session_dir/remaining.txt ]] || exit 1
 python3 - "$DX_STACK_EVIDENCE" "$prefix" <<'PY'
import pathlib,json,sys
for state in pathlib.Path(sys.argv[1]).glob(sys.argv[2]+"*/scheduler-state.json"):
 old=json.loads(state.read_text());rows=[json.loads(l) for l in state.with_name('scheduler-control.jsonl').read_text().splitlines() if l.strip()]
 assert rows and rows[-1]['mode']=='restore' and rows[-1]['after']==old['before']
PY
 rm "$lock/owner.json";rmdir "$lock";exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM INT
node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),7200000)' "$$" & watchdog=$!
i=0;session_rc=0
for mode in plain sentinel plain http plain refused plain tcp plain;do
 i=$((i+1));tag=$prefix-$i-$mode
 [[ $(git rev-parse HEAD) == $(cat "$session_dir/head.txt") ]] || exit 2
 sh lab/bin/host-quiet.sh > "$session_dir/$i-host-before.jsonl" || true
 settings=(TRIPLEX_TRACE_LEVEL=full DX_STORAGE_DIAGNOSTIC=1 DX_HARNESS_STORAGE=volume DX_IDLE_SENTINEL=0 DX_IDLE_TCP=default DX_IDLE_REFUSAL_PROBE=0)
 keep=none
 case "$mode" in
  sentinel) settings+=(DX_IDLE_SENTINEL=1);;
  http) keep=http;;
  refused) settings+=(DX_IDLE_REFUSAL_PROBE=1);keep=refused;;
  tcp) settings+=(DX_IDLE_TCP=0);;
 esac
 env "${settings[@]}" bash lab/experiments/EXP-DX1/t1/run.sh real "$tag" --rung 10k --zero-readers --reader-ladder-only --max-readers 0 \
  --idle-gaps-ms 10,25,50,100,250,500,1000 --idle-commits 150 --idle-keep "$keep" --probe10-per-s 0 "$@" > "$session_dir/$i-controller.log" 2>&1 & child=$!
 rc=0;wait "$child" || rc=$?;child=
 printf '%s\n' "$rc" > "$session_dir/$i-exit.txt"
 [[ $rc == 0 ]] || session_rc=$rc
 bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --inventory > "$session_dir/$i-remaining.txt"
 [[ ! -s $session_dir/$i-remaining.txt ]] || exit 1
 sh lab/bin/host-quiet.sh > "$session_dir/$i-host-after.jsonl" || true
done
if [[ $session_rc == 0 ]];then node lab/trace/idle-report.mjs "$DX_STACK_EVIDENCE" "$prefix" > "$session_dir/analysis.log";fi
exit "$session_rc"
