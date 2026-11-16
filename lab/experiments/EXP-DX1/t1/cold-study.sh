#!/usr/bin/env bash
# [DX-T1-12] Why: the cold investigation's owed probes use this holder's lease, names and permanent evidence without pruning a cited attempt.
# Rejected: COLD's worktree rewrite/pruning runner, background warmers, or changing a benchmark default from a diagnostic.
set -euo pipefail
study=${1:?e6|jit|six-loaded};prefix=${2:?tx2-dxt1-prefix};shift 2
[[ $study == e6 || $study == jit || $study == six-loaded ]] && [[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] && [[ $# == 0 ]] || exit 2
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}
export TRIPLEX_TRACE_SESSION=$prefix DX_PAIR_LEASE_ID=DX-T1
out=$DX_STACK_EVIDENCE/$prefix-session
mkdir "$out"
git rev-parse HEAD > "$out/head.txt"
python3 -c 'import shutil;assert shutil.disk_usage(".").free>=15*1024**3'
lock=$HOME/Claude/Projects/triplex-db-2/locks/measure
while ! mkdir "$lock" 2>/dev/null;do sleep 5;done
printf '{"id":"DX-T1","pid":%s,"kind":"writer-arms"}\n' "$$" > "$lock/owner.json"
export DX_R3_PAIR_LEASE_PID=$$
child= watchdog= cpu_owned=false
cleanup() {
 rc=$?;trap - EXIT TERM INT
 if [[ -n $child ]];then kill -TERM "$child" 2>/dev/null || true;wait "$child" || true;fi
 if [[ -n $watchdog ]];then kill "$watchdog" 2>/dev/null || true;wait "$watchdog" 2>/dev/null || true;fi
 if [[ $cpu_owned == true ]];then
  bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --guest-cpus eight >> "$out/cpu-restore.jsonl" || exit 1
 fi
 bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --inventory > "$out/remaining.txt" || exit 1
 [[ ! -s $out/remaining.txt ]] || { echo 'Owned resources remain; retaining lease' >&2;exit 1; }
 python3 - "$out/cpu-restore.jsonl" "$DX_STACK_EVIDENCE" "$prefix" "$cpu_owned" <<'RESTORE'
import json,pathlib,sys
if sys.argv[4]=='true':assert json.loads(pathlib.Path(sys.argv[1]).read_text().splitlines()[-1])['after']=='0-7'
for state in pathlib.Path(sys.argv[2]).glob(sys.argv[3]+'*/scheduler-state.json'):
 old=json.loads(state.read_text());rows=[json.loads(l) for l in state.with_name('scheduler-control.jsonl').read_text().splitlines() if l.strip()]
 assert rows[-1]['mode']=='restore' and rows[-1]['after']==old['before']
RESTORE
 rm "$lock/owner.json";rmdir "$lock";exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM INT
node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),10800000)' "$$" & watchdog=$!
bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --guest-cpus show > "$out/cpu-original.json"
python3 - "$out/cpu-original.json" <<'ORIGINAL'
import json,sys
assert json.load(open(sys.argv[1]))['after']=='0-7','Original CPU state is not eight online'
ORIGINAL
cpu_owned=true
case "$study" in
 e6) modes=(eight six eight six eight);;
 jit) modes=(plain warmup plain threshold plain warmup-reverse plain);;
 six-loaded) modes=(eight six eight);;
esac
printf '%s\n' "${modes[@]}" > "$out/modes.txt"
i=0
for mode in "${modes[@]}";do
 i=$((i+1));tag=$prefix-$i-$mode
 printf 'Starting %s arm %s (%s)\n' "$study" "$i" "$mode"
 [[ $(git rev-parse HEAD) == $(cat "$out/head.txt") ]] || exit 2
 python3 -c 'import shutil;assert shutil.disk_usage(".").free>=15*1024**3'
 bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --guest-cpus eight >> "$out/cpu-transitions.jsonl"
 [[ $mode != six ]] || bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --guest-cpus six >> "$out/cpu-transitions.jsonl"
 sh lab/bin/host-quiet.sh > "$out/$i-host-before.jsonl" || true
 settings=(TRIPLEX_TRACE_LEVEL=summary TRIPLEX_TRACE_COMPONENTS=node,gateway DX_NATIVE_GATES=0 DX_STORAGE_DIAGNOSTIC=0 DX_TX_NATIVE_JFR=0 DX_PG_CENSUS=0)
 # [DX-T1-12] Why: E6 keeps the identical CPU placement even with eight online; the loaded comparison separately prices the lost reader capacity.
 # Rejected: changing the number of online CPUs and moving a commit-path process in the same fixed-gap contrast.
 settings+=(DX_CPUS_TX=0 DX_CPUS_PG=1 DX_CPUS_GW_WRITE=2 DX_CPUS_GW_READ=4 DX_MAIN_CPU=3 DX_CPUS_DRIVER=3,4 DX_WORKER_CPUS=4)
 args=(--rung 10k --zero-readers --reader-ladder-only --max-readers 0 --idle-keep none --probe10-per-s 0)
 kind=real
 if [[ $study == e6 ]];then args+=(--idle-gaps-ms 25,50,250,1000 --idle-commits 150 --idle-warmup-commits 200);fi
 if [[ $study == jit ]];then
  settings+=(TRIPLEX_TRACE_LEVEL=full TRIPLEX_TRACE_COMPONENTS=node,gateway,tx-jfr,gw-jfr DX_TX_NATIVE_JFR=1)
  args+=(--idle-gaps-ms 10,50,100,250,500,1000 --idle-commits 150 --idle-warmup-commits 200)
  [[ $mode != warmup && $mode != warmup-reverse ]] || args+=(--idle-warmup-commits 5000)
  [[ $mode != warmup-reverse ]] || args+=(--idle-gaps-ms 1000,500,250,100,50,10)
  if [[ $mode == threshold ]];then
   settings+=("DX_TX_JAVA_OPTS=-Xms256m -Xmx3g -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:CompileThresholdScaling=0.1"
    "DX_GW_WRITE_JAVA_OPTS=-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g -XX:CompileThresholdScaling=0.1"
    "DX_GW_READ_JAVA_OPTS=-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g -XX:CompileThresholdScaling=0.1")
  fi
 fi
 if [[ $study == six-loaded ]];then
  kind=pair;args=(--rung 10k --max-readers 1024 --level-s 45 --probe10-per-s 0)
  settings+=(DX_MATCH_DURATION_S=900 DX_CPUS_DRIVER=3,4,5,6,7 DX_WORKER_CPUS=4,5,6,7)
  [[ $mode != six ]] || settings+=(DX_CPUS_DRIVER=3,4,5 DX_WORKER_CPUS=4,5)
 fi
 env "${settings[@]}" bash lab/experiments/EXP-DX1/t1/run.sh "$kind" "$tag" "${args[@]}" > "$out/$i-controller.log" 2>&1 & child=$!
 rc=0;wait "$child" || rc=$?;child=
 printf '%s\n' "$rc" > "$out/$i-exit.txt"
 printf 'Finished %s arm %s with exit %s\n' "$study" "$i" "$rc"
 sh lab/bin/host-quiet.sh > "$out/$i-host-after.jsonl" || true
 bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --inventory > "$out/$i-remaining.txt"
 [[ ! -s $out/$i-remaining.txt ]] || exit 1
 [[ $rc == 0 ]] || exit "$rc"
done
