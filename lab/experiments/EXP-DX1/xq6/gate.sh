#!/usr/bin/env bash
# [DX-XQ6] Mac toy run, one ordinary heavy token, times diagnostic. DOCKER_HOST must name the lab VM's socket:
#   node lab/bin/heavy.mjs --label DX-XQ6-gate -- bash lab/experiments/EXP-DX1/xq6/gate.sh "$PWD" NEW_OUT_DIR [SCRIPT]
# Starts a stack of this checkout's gateway with TX2_SWEEP=1 (one cursor secret for both gateways, so a cursor survives
# a restart) and an erasure directory on ports 18961/18962, runs xq6/gate.ts (or SCRIPT: load.ts), removes the stack.
set -uo pipefail
repo=$1 out=$2 script=${3:-gate.ts}
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
prefix=tx2-dxxq6-${script%.ts}-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')
mkdir -p "$out/stack"
cleanup() { bash "$repo/lab/experiments/EXP-DX1/stack/down.sh" "$prefix" --volumes >/dev/null 2>&1; }
trap cleanup EXIT
secret=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
for attempt in 1 2 3 4 5 6; do
  DX_STACK_EVIDENCE=$out/stack DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_SWEEP=1 DX_SWEEP_CURSOR_SECRET=$secret \
    DX_SWEEP_PERMITS=${DX_SWEEP_PERMITS:-1} DX_SWEEP_PER_ACCOUNT=${DX_SWEEP_PER_ACCOUNT:-1} \
    DX_XQ3_ERASURE_DIRECTORY=1 TRIPLEX_TRACE_LEVEL=off \
    bash "$repo/lab/experiments/EXP-DX1/stack/up.sh" "$prefix" --port-write 18961 --port-read 18962 > "$out/stack-up-$attempt.log" 2>&1 && break
  echo "stack did not start (attempt $attempt); see $out/stack-up-$attempt.log" >&2
  cleanup
  [[ $attempt == 6 ]] && exit 1
  sleep 60
done
(cd "$repo" && node --no-warnings --experimental-transform-types "lab/experiments/EXP-DX1/xq6/$script" "$out" http://127.0.0.1:18961 http://127.0.0.1:18962 "$prefix") > "$out/driver.log" 2>&1
status=$?
for role in gw-r gw-w tx; do docker logs "$prefix-$role" > "$out/stack/$role.log" 2>&1; done
exit "$status"
