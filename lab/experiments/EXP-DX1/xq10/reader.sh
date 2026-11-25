#!/usr/bin/env bash
# [DX-XQ10] Mac toy run, one ordinary heavy token, times diagnostic. DOCKER_HOST must name the lab VM's socket:
#   node lab/bin/heavy.mjs --label DX-XQ10-reader -- bash lab/experiments/EXP-DX1/xq10/reader.sh "$PWD" NEW_OUT_DIR MODE
# A stack of this checkout's gateway with the commit-time index, the ID lists, the sweep with every shape and the
# question reader (role q, cores 3,4) on; MODE main: the main reader also serves questions (one request to both);
# MODE refusal: it refuses them. No cursor secret is given: the launcher makes both keys and passes them to every
# gateway (what is under test). Ports 18951 (write), 18952 (main reader), 18962 (question reader). Then xq10/reader.ts,
# then the image and source check of every container (xq10/stack-check.py), then the stack and its volumes are removed.
set -uo pipefail
repo=$1 out=$2 mode=${3:?mode: main or refusal}
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
prefix=tx2-dxxq10-$mode-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')
mkdir -p "$out/stack"
cleanup() { bash "$repo/lab/experiments/EXP-DX1/stack/down.sh" "$prefix" --volumes >/dev/null 2>&1; }
trap cleanup EXIT
refuses=0; [[ $mode == refusal ]] && refuses=1
for attempt in 1 2 3 4 5 6; do
  DX_STACK_EVIDENCE=$out/stack DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_INT1_GATEWAYS=demand \
    DX_TX_MEMORY=2g DX_TX_HEAP=1g DX_GW_WRITE_MEMORY=1g DX_GW_READ_MEMORY=1g \
    DX_CROSS_INDEX=1 DX_SWEEP=1 DX_ID_LISTS=1 DX_SWEEP_SHAPES=all DX_SWEEP_PERMITS=1 DX_XQ3_ERASURE_DIRECTORY=1 \
    DX_QUESTION_READER=1 DX_QUESTION_CPUS=3,4 DX_QUESTION_MAIN_REFUSES=$refuses DX_QUESTION_MEMORY=1g \
    DX_QUESTION_SWEEP_PERMITS=2 DX_QUESTION_SWEEP_PER_ACCOUNT=2 DX_QUESTION_SWEEP_QUEUE_MS=1000 \
    DX_QUESTION_INDEX_QUERY_PERMITS=1 DX_QUESTION_FIND_PERMITS=1 DX_QUESTION_ID_LIST_QUEUE_MS=1000 TRIPLEX_TRACE_LEVEL=off \
    bash "$repo/lab/experiments/EXP-DX1/stack/up.sh" "$prefix" --port-write 18951 --port-read 18952 > "$out/stack-up-$attempt.log" 2>&1 && break
  echo "stack did not start (attempt $attempt); see $out/stack-up-$attempt.log" >&2
  cleanup
  [[ $attempt == 6 ]] && exit 1
  sleep 60
done
(cd "$repo" && node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq10/reader.ts "$out" \
  http://127.0.0.1:18951 http://127.0.0.1:18952 http://127.0.0.1:18962 "$prefix" "$mode") > "$out/driver.log" 2>&1
status=$?
python3 -I "$repo/lab/experiments/EXP-DX1/xq10/stack-check.py" "$out/stack" "$prefix" "$repo/packages/datomic/gateway" | tee "$out/stack-check.txt"
[[ ${PIPESTATUS[0]} == 0 ]] || status=1
for role in gw-q gw-r gw-w tx; do docker logs "$prefix-$role" > "$out/stack/$role.log" 2>&1; done
grep -E '"kind":"(PASS\?|FAIL|\(a\)|\(b\)|\(c\))"' "$out/driver.log" | cut -c1-600 | tail -30
exit "$status"
