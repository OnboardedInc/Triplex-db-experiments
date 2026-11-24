#!/usr/bin/env bash
# [DX-RD4] Pinned-read exactness gates, the SDK's integration tests that pin reads, on a fresh stack of this checkout's
# gateway and then on a fresh stack of a base gateway source (for example origin/exp/DX-INT1's), one heavy token per step:
#   bash lab/experiments/EXP-DX1/rd4/integration-pair.sh NEW_DIR BASE_GATEWAY_DIR [TEST_FILE...]
set -uo pipefail
out=${1:?new output directory} base=${2:?base gateway source directory (src/ and codec-spec.json)}
[[ $out == /Users/* && ! -e $out && -d $base/src ]] || exit 2
repo=$(git rev-parse --show-toplevel)
mkdir -p "$out"
shift 2
tests=("$@")
[[ ${#tests[@]} -gt 0 ]] || tests=(test/read-pins.test.ts test/reach.test.ts test/adapter.test.ts test/route-equivalence.test.ts
  test/record-time-peer.test.ts test/history-grouping.test.ts)
for arm in candidate base; do
  prefix=tx2-dxrd4-it-$arm-$(od -An -N2 -tx1 /dev/urandom | tr -d ' \n')
  src=(); [[ $arm == base ]] && src=(--gateway-src "$base")
  node "$repo/lab/bin/heavy.mjs" --label DX-RD4-it-$arm -- env DX_STACK_EVIDENCE=$out/stacks DX_STACK_WAIT_FOR_TRANSACTOR=1 \
    TRIPLEX_TRACE_LEVEL=off bash "$repo/lab/experiments/EXP-DX1/stack/up.sh" "$prefix" --port-write 18681 --port-read 18682 \
    ${src[@]+"${src[@]}"} > "$out/$arm-up.log" 2>&1 || { echo "$arm: stack failed" >&2; bash "$repo/lab/experiments/EXP-DX1/stack/down.sh" "$prefix" --volumes; continue; }
  (cd "$repo/packages/datomic" && node "$repo/lab/bin/heavy.mjs" --label DX-RD4-it-$arm -- env DATOMIC_INTEGRATION=1 \
    DATOMIC_GATEWAY_URL=http://127.0.0.1:18681 DATOMIC_URL=http://127.0.0.1:18681 DATOMIC_READ_URLS=http://127.0.0.1:18682 \
    npx vitest run --reporter verbose --no-file-parallelism "${tests[@]}") > "$out/$arm-tests.log" 2>&1
  echo "$arm exit=$?" >> "$out/summary.txt"
  bash "$repo/lab/experiments/EXP-DX1/stack/down.sh" "$prefix" --volumes
done
