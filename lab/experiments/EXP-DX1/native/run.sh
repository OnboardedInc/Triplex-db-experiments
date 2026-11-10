#!/usr/bin/env bash
# [DX-N1] Why: one lock owns startup, driver, and cleanup; wall limit includes startup. Rejected: separate competing arm locks.
source "$(dirname "$0")/common.sh"
kind=${1:?pair|real|medium|tests|smoke|micro}; prefix=${2:?prefix}; shift 2
valid_prefix "$prefix"
if [[ $kind == pair ]]; then
  duration=${DX_MATCH_DURATION_S:-900}
  bash "$0" real "$prefix-zero" --zero-readers --match-duration-s "$duration" "$@"
  baseline="$NATIVE/runs/$prefix-zero/driver/ns-writes.jsonl"
  [[ -s $baseline ]] || exit 1
  exec bash "$0" real "$prefix-ladder" --baseline-writes "$baseline" --match-duration-s "$duration" "$@"
fi
[[ $kind =~ ^(real|medium|tests|smoke|micro)$ ]] || exit 2
cd "$REPO"; resources
[[ ! -e $NATIVE/runs/$prefix ]] || { echo "use a fresh prefix; run already exists" >&2; exit 2; }
mkdir -p "$EVIDENCE" "$NATIVE/runs"
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
held=false; supervisor=; driver=; timer=
cleanup() {
  rc=$?; trap - EXIT TERM INT
  [[ -z $timer ]] || kill "$timer" 2>/dev/null || true
  [[ -z $driver ]] || { kill "$driver" 2>/dev/null || true; wait "$driver" 2>/dev/null || true; }
  [[ -z $supervisor ]] || { kill "$supervisor" 2>/dev/null || true; wait "$supervisor" 2>/dev/null || true; }
  if [[ -d $NATIVE/runs/$prefix ]]; then
    bash "$HERE/down.sh" "$prefix" || { echo 'cleanup failed; retaining measurement lock' >&2; exit 1; }
    tar -czf "$EVIDENCE/$prefix.tar.gz" -C "$NATIVE/runs" "$prefix"
  fi
  sh lab/bin/host-quiet.sh > "$EVIDENCE/$prefix-host-after.txt" 2>&1 || true
  if [[ $held == true ]]; then rm "$lock/owner.json"; rmdir "$lock"; fi
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
held=true; printf '{"id":"DX-N1","pid":%s}\n' "$$" > "$lock/owner.json"
# [DX-N1] Why: terminate within 20-minute lease even if a driver stalls. Rejected: relying on driver phase limits.
node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),1140000)' "$$" & timer=$!
resources
sh lab/bin/host-quiet.sh > "$EVIDENCE/$prefix-host-before.txt" 2>&1 || true
bash "$HERE/up.sh" "$prefix" > "$EVIDENCE/$prefix-up.log" 2>&1 & supervisor=$!
for ((i=0;i<240;i++)); do
 [[ ! -f $NATIVE/runs/$prefix/ready.json ]] || break
 kill -0 "$supervisor" 2>/dev/null || { echo 'native startup failed; see up.log' >&2; exit 1; }
 sleep 1
done
run=$NATIVE/runs/$prefix
[[ -f $run/ready.json ]] || { echo 'native stack not ready' >&2; exit 1; }
base=${DX_NATIVE_PORT_BASE:-28400}
export DATOMIC_URL=http://127.0.0.1:$((base+3)) DATOMIC_GATEWAY_URL=http://127.0.0.1:$((base+3)) DATOMIC_READ_URLS=http://127.0.0.1:$((base+4))
export TRIPLEX_DATOMIC_LAYOUT=lean DATOMIC_TEST_LAYOUT=lean DATOMIC_INTEGRATION=1
export TX2_NATIVE_RUN_DIR=$run/driver
export TX2_NATIVE_PIDS=$(python3 - "$run/ready.json" <<'PY'
import json,sys
print(json.dumps({k:v['pid'] for k,v in json.load(open(sys.argv[1]))['pids'].items()}))
PY
)
mkdir "$run/driver"
git rev-parse HEAD > "$run/head.txt"
python3 "$HERE/bind.py" "$run"
if [[ $kind == tests ]]; then
  /usr/sbin/taskpolicy -d default -t 0 -l 0 node "$HERE/command.mjs" "$REPO/node_modules/.bin/vitest" run --reporter=default --reporter=json --outputFile "$run/driver/tests.json" --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/reach.test.ts packages/datomic/test/reach-repair.test.ts packages/datomic/test/journal-fast.test.ts packages/datomic/test/record-time-peer.test.ts packages/datomic/test/concurrent-commits.test.ts packages/datomic/test/adapter.test.ts packages/datomic/test/commit-observation.test.ts packages/datomic/test/layout-differential.test.ts > "$run/driver.log" 2>&1 &
elif [[ $kind == micro ]]; then
  python3 "$HERE/prepare-matched.py"
  export DX_N1_OUTPUT=$run/driver
  /usr/sbin/taskpolicy -d default -t 0 -l 0 node "$HERE/command.mjs" bash "$HERE/matched-client.sh" > "$run/driver.log" 2>&1 &
elif [[ $kind == smoke ]]; then
  /usr/sbin/taskpolicy -d default -t 0 -l 0 node "$HERE/command.mjs" node --experimental-strip-types "$HERE/smoke.mjs" > "$run/driver.log" 2>&1 &
else
  args=(); [[ $kind != medium ]] || args=(--subjects 2000 --level-s 30)
  /usr/sbin/taskpolicy -d default -t 0 -l 0 node "$HERE/command.mjs" node --experimental-strip-types lab/bench/driver.ts --lane datomic --composition reach --profile smoke --reader-threads 3 --oracle-root /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3/oracle --output "$run/driver/ns-report.json" ${args[@]+"${args[@]}"} "$@" > "$run/driver.log" 2>&1 &
fi
driver=$!
/usr/sbin/taskpolicy -B -p "$driver"
ps -o pid,ppid,stat,ni,flags,command -p "$driver" > "$run/driver-policy.txt"
wait "$driver"; driver=
if [[ -f $run/driver/ns-report.json ]]; then python3 lab/experiments/EXP-DX1/h4/summarize.py "$run" > "$run/TABLES.md"; fi
