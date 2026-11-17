#!/usr/bin/env bash
# [DX-T1-14] Why: the first population comparison needs a complete self-seed and its same-session 10k neighbour.
# Rejected: four long arms before a reading, a silently partial one-hour seed, or changing the protected night/v3 plan.
set -euo pipefail
mode=${1:---plan}; prefix=${2:-tx2-dxt1-first-100k}
[[ $mode == --plan || $mode == --execute ]] || exit 2
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
if [[ $mode == --plan ]]; then
  for subjects in 100000 10000; do
    node lab/experiments/EXP-DX1/t1/scale-settings.mjs --subjects "$subjects" --guest-bytes 17179869184 --zero-readers
  done
  printf '%s\n' 'Diagnostic only: full tracing, early JVM compilation, zero readers, full 900s smoke, 10800s setup budget, 600s command deadline; no warmer.'
  printf '%s\n' 'Execution requires DX_READING_STOP_AT (ISO timestamp with timezone); TERM starts cleanup at that deadline.'
  exit
fi
python3 -c 'import shutil;assert shutil.disk_usage(".").free>=28*1024**3'
stop_ms=$(node -e 'const s=process.argv[1];if(!/(Z|[+-]\d\d:\d\d)$/.test(s??""))throw Error("Explicit timezone required");const d=Date.parse(s)-Date.now();if(!Number.isFinite(d)||d<=0)throw Error("Reading deadline has passed");console.log(d)' "${DX_READING_STOP_AT:?ISO deadline required}")
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}
session=$DX_STACK_EVIDENCE/$prefix-session
mkdir "$session"
git rev-parse HEAD > "$session/head.txt"
printf '%s\n' "$DX_READING_STOP_AT" > "$session/cleanup-deadline.txt"
printf '%s\n' 'busy host; diagnostic; no verdict' > "$session/classification.txt"
child= observer= waiter= timer=
cleanup() {
  rc=$?;trap - EXIT TERM INT
  if [[ -n $child ]]; then kill -TERM "$child" 2>/dev/null || true;wait "$child" || true;fi
  for pid in "$observer" "$waiter" "$timer";do [[ -z $pid ]] || kill -TERM "$pid" 2>/dev/null || true;done
  for pid in "$observer" "$waiter" "$timer";do [[ -z $pid ]] || wait "$pid" 2>/dev/null || true;done
  printf '%s\n' "$rc" > "$session/exit.txt"
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM INT
node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),Number(process.argv[2]))' "$$" "$stop_ms" & timer=$!
export DX_TRANSACTION_CENSUS=1 DX_NS_PROFILE=smoke DX_COMPILER_POLICY=early DX_NATIVE_GATES=0 TRIPLEX_TRACE_LEVEL=full
unset DX_NIGHT_WINDOW TRIPLEX_TRACE_COMPONENTS
for subjects in 100000 10000; do
  tag=$prefix-$subjects
  [[ $(git rev-parse HEAD) == $(cat "$session/head.txt") ]] || exit 2
  node -e 'if(Date.now()>=Date.parse(process.argv[1]))process.exit(1)' "$DX_READING_STOP_AT"
  bash lab/experiments/EXP-DX1/t1/run.sh real "$tag" --subjects "$subjects" --zero-readers \
    --match-duration-s 900 --seed-budget-s 10800 --writer-deadline-ms 600000 --history-growth-subjects 4 \
    --probe-count 0 > "$session/$subjects.log" 2>&1 & child=$!
  # [DX-T1-14] Why: administrative size samples start only once the owned stack is ready, and stop before its lease is reused.
  # Rejected: polling application routes to keep an idle component warm, or observing another holder's database.
  (while [[ ! -f $DX_STACK_EVIDENCE/$tag/driver.log ]];do kill -0 "$child" 2>/dev/null || exit 0;sleep 1;done
   exec bash lab/experiments/EXP-DX1/t1/scale-observe.sh "$tag") & observer=$!
  rc=0;wait "$child" || rc=$?;child=
  kill -TERM "$observer" 2>/dev/null || true;wait "$observer" 2>/dev/null || true;observer=
  printf '%s\n' "$rc" > "$session/$subjects.exit"
  [[ $rc == 0 ]] || exit "$rc"
  python3 - "$DX_STACK_EVIDENCE/$tag/driver/ns-report.json" "$subjects" <<'PY_COMPLETE'
import json,sys
r=json.load(open(sys.argv[1]));assert r['status']=='DONE' and r['seed']['complete'] and r['seed']['seededSubjects']==int(sys.argv[2]) and r['seed']['assertionsMatchClosedForm'],'Incomplete seed is not a population reading'
PY_COMPLETE
done
node lab/trace/scale-reading.mjs "$session/comparison" "$DX_STACK_EVIDENCE/$prefix-100000" "$DX_STACK_EVIDENCE/$prefix-10000"
