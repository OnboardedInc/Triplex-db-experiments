#!/usr/bin/env bash
# [DX-T1-9] Why: tail candidates need identical frozen inputs and baseline/candidate/baseline in one uninterrupted session.
# Rejected: compare a storage diagnostic with a historical summary pair or release the lease between bookends.
set -euo pipefail
kind=${1:?witness|storage|scheduler|disk|history|cores}; prefix=${2:?tx2-dxt1-prefix}; shift 2
[[ $kind == witness || $kind == storage || $kind == scheduler || $kind == disk || $kind == history || $kind == cores ]] && [[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}
export TRIPLEX_TRACE_SESSION=$prefix
session_dir=$DX_STACK_EVIDENCE/$prefix-session
mkdir "$session_dir"
git rev-parse HEAD > "$session_dir/head.txt"
python3 - "$session_dir/request.json" "$kind" <<'PY'
import os,json,sys
json.dump({'kind':sys.argv[2],'candidate':os.environ.get('DX_TAIL_PG_SETTINGS'),'publication':os.environ.get('DX_PUBLICATION_MODE','deferred' if sys.argv[2]=='witness' else 'worker'),'witnessLevel':os.environ.get('DX_WITNESS_LEVEL','summary')},open(sys.argv[1],'w'),indent=2)
PY
python3 -c 'import shutil;assert shutil.disk_usage(".").free>=15*1024**3'
lock=$HOME/Claude/Projects/triplex-db-2/locks/measure
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
printf '{"id":"DX-T1","pid":%s,"kind":"writer-arms"}\n' "$$" > "$lock/owner.json"
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
node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),5400000)' "$$" & watchdog=$!
i=0;session_rc=0
# [DX-T1-10] Why: disk traffic needs a same-session zero-reader reference as well as loaded bookends.
# Rejected: use an old host session's quiet count or change tracing between volume placements.
modes=(baseline candidate baseline)
[[ $kind != disk ]] || modes=(zero baseline candidate baseline)
for mode in "${modes[@]}"; do
 i=$((i+1));tag=$prefix-$i-$mode
 [[ $(git rev-parse HEAD) == $(cat "$session_dir/head.txt") ]] || exit 2
 sh lab/bin/host-quiet.sh > "$session_dir/$i-host-before.jsonl" || true
 settings=();workload=(--rung 10k --reader-ladder-only --max-readers 1024 --level-s 45 --match-duration-s 450)
 if [[ $kind == witness ]]; then
  witness_level=${DX_WITNESS_LEVEL:-summary}
  [[ $witness_level == summary || $witness_level == full ]] || exit 2
  settings=(TRIPLEX_TRACE_LEVEL=$witness_level DX_PUBLICATION_MODE=deferred)
  # [DX-T1-9] Why: a full witness comparison can also observe storage, with identical collectors in all arms.
  # Rejected: enabling server diagnostics only in the candidate and confusing collector cost with the witness change.
  [[ $witness_level != full ]] || settings+=(DX_STORAGE_DIAGNOSTIC=1 DX_TX_NATIVE_JFR=1)
  [[ $mode != candidate ]] || settings+=(DX_PUBLICATION_MODE=worker)
 elif [[ $kind == storage ]]; then
  [[ -n ${DX_TAIL_PG_SETTINGS:-} ]] || exit 2
  settings=(TRIPLEX_TRACE_LEVEL=full DX_STORAGE_DIAGNOSTIC=1 DX_TX_NATIVE_JFR=1 "DX_PG_SETTINGS=-c shared_buffers=512MB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_buffers=64MB -c wal_sync_method=fdatasync")
  workload=(--rung 10k --reader-ladder-only --max-readers 256 --level-s 45 --match-duration-s 300)
  [[ $mode != candidate ]] || settings+=("DX_PG_SETTINGS=$DX_TAIL_PG_SETTINGS")
 elif [[ $kind == scheduler ]]; then
  settings=(TRIPLEX_TRACE_LEVEL=summary DX_HARNESS_STORAGE=volume)
  workload=(--rung 10k --zero-readers --reader-ladder-only --max-readers 0 --level-s 20 --match-duration-s 200 --scheduler-timing legacy)
  [[ $mode != candidate ]] || workload+=(--scheduler-timing precise)
 elif [[ $kind == disk ]]; then
  settings=(TRIPLEX_TRACE_LEVEL=summary DX_HARNESS_STORAGE=volume)
  [[ $mode != candidate ]] || settings+=(DX_HARNESS_STORAGE=root-disk)
  [[ $mode != zero ]] || workload+=(--zero-readers)
 elif [[ $kind == cores ]]; then
  # [DX-T1-10] Why: share the gateway core without removing a reader core, with matched zero/loaded bookends.
  # Rejected: reuse the rejected shared-Postgres layout or compare a loaded window against a different source.
  settings=(TRIPLEX_TRACE_LEVEL=summary DX_MATCH_DURATION_S=450 DX_CPUS_TX=0 DX_CPUS_PG=1 DX_CPUS_GW_WRITE=2 DX_CPUS_GW_READ=4 DX_CPUS_DRIVER=3,4,5,6,7 DX_MAIN_CPU=3 DX_WORKER_CPUS=4,5,6,7)
  [[ $mode != candidate ]] || settings+=(DX_CPUS_TX=0,2)
 else
  # [DX-T1-10] Why: the original 500-subject growth remains the verdict workload; four is an explicit trial only.
  # Rejected: silently replace a frozen maintenance step or shorten history-depth verification to improve a tail.
  settings=(TRIPLEX_TRACE_LEVEL=summary)
  workload=(--rung 10k --max-readers 1024 --match-duration-s 900)
  [[ $mode != candidate ]] || workload+=(--history-growth-subjects 4)
 fi
 run_kind=real; [[ $kind != cores ]] || run_kind=pair
 env "${settings[@]}" bash lab/experiments/EXP-DX1/t1/run.sh "$run_kind" "$tag" "${workload[@]}" "$@" > "$session_dir/$i-controller.log" 2>&1 & child=$!
 rc=0;wait "$child" || rc=$?;child=
 printf '%s\n' "$rc" > "$session_dir/$i-exit.txt"
 [[ $rc == 0 ]] || session_rc=$rc
 bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --inventory > "$session_dir/$i-remaining.txt"
 [[ ! -s $session_dir/$i-remaining.txt ]] || exit 1
 sh lab/bin/host-quiet.sh > "$session_dir/$i-host-after.jsonl" || true
 [[ $rc == 0 ]] || break
done
if [[ $session_rc == 0 && ( $kind == scheduler || $kind == disk || $kind == history || $kind == cores ) ]]; then
 node lab/trace/trial.mjs "$DX_STACK_EVIDENCE" "$prefix" > "$session_dir/analysis.log"
fi
exit "$session_rc"
