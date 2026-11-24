#!/usr/bin/env bash
# [DX-XQ7] Mac toy run, one ordinary heavy token, times diagnostic. DOCKER_HOST must name the lab VM's socket:
#   node lab/bin/heavy.mjs --label DX-XQ7-gate -- bash lab/experiments/EXP-DX1/xq7/gate.sh "$PWD" NEW_OUT_DIR [SCRIPT]
# Starts a stack of this checkout's gateway with the question reader on (role q, cores 3,4) beside the main reader,
# both serving questions (DX_QUESTION_MAIN_REFUSES=0, so one request can go to both; SCRIPT refusal.ts sets 1), one
# cursor secret for every gateway, small peers (32 MB object caches), per-read io counters on the read gateways, and
# the question reader's own pools; ports 18971 (write), 18972 (main reader), 18982 (question reader). Runs xq7/SCRIPT
# (gate.ts, cache.ts or refusal.ts), then removes the stack and its volumes.
set -uo pipefail
repo=$1 out=$2 script=${3:-gate.ts}
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
prefix=tx2-dxxq7-${script%.ts}-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')
mkdir -p "$out/stack"
cleanup() { bash "$repo/lab/experiments/EXP-DX1/stack/down.sh" "$prefix" --volumes >/dev/null 2>&1; }
trap cleanup EXIT
secret=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
refuses=0; [[ $script == refusal.ts ]] && refuses=1
for attempt in 1 2 3 4 5 6; do
  DX_STACK_EVIDENCE=$out/stack DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_INT1_GATEWAYS=demand \
    DX_TX_MEMORY=2g DX_TX_HEAP=1g DX_GW_WRITE_MEMORY=1g DX_GW_READ_MEMORY=1g \
    DX_SWEEP=1 DX_ID_LISTS=1 DX_SWEEP_CURSOR_SECRET=$secret DX_XQ3_ERASURE_DIRECTORY=1 DX_READ_IO_COUNTERS=1 \
    DX_QUESTION_READER=1 DX_QUESTION_CPUS=3,4 DX_QUESTION_MAIN_REFUSES=$refuses DX_QUESTION_MEMORY=1g \
    DX_QUESTION_SWEEP_PERMITS=2 DX_QUESTION_SWEEP_PER_ACCOUNT=2 DX_QUESTION_SWEEP_QUEUE_MS=1000 \
    DX_QUESTION_INDEX_QUERY_PERMITS=1 DX_QUESTION_ID_LIST_QUEUE_MS=1000 TRIPLEX_TRACE_LEVEL=off \
    bash "$repo/lab/experiments/EXP-DX1/stack/up.sh" "$prefix" --port-write 18971 --port-read 18972 > "$out/stack-up-$attempt.log" 2>&1 && break
  echo "stack did not start (attempt $attempt); see $out/stack-up-$attempt.log" >&2
  cleanup
  [[ $attempt == 6 ]] && exit 1
  sleep 60
done
(cd "$repo" && node --no-warnings --experimental-transform-types "lab/experiments/EXP-DX1/xq7/$script" "$out" \
  http://127.0.0.1:18971 http://127.0.0.1:18972 http://127.0.0.1:18982 "$prefix") > "$out/driver.log" 2>&1
status=$?
for role in gw-q gw-r gw-w tx; do docker logs "$prefix-$role" > "$out/stack/$role.log" 2>&1; done
exit "$status"
