#!/usr/bin/env bash
# [DX-XQ3] Mac toy run, one ordinary heavy token, times diagnostic:
#   node lab/bin/heavy.mjs --label DX-XQ3-gate -- bash lab/experiments/EXP-DX1/xq3/gate.sh "$PWD" NEW_OUT_DIR
# Starts a stack of this checkout's gateway with TX2_ID_LISTS=1 on ports 18861/18862, runs xq3/gate.ts, removes the stack.
set -uo pipefail
set -uo pipefail
repo=$1 out=$2
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
prefix=tx2-dxxq3-gate-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')
mkdir -p "$out/stack"
cleanup() { bash "$repo/lab/experiments/EXP-DX1/stack/down.sh" "$prefix" --volumes >/dev/null 2>&1; }
trap cleanup EXIT
DX_STACK_EVIDENCE=$out/stack DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_ID_LISTS=1 DX_XQ3_ERASURE_DIRECTORY=${DX_XQ3_ERASURE_DIRECTORY:-1} TRIPLEX_TRACE_LEVEL=off \
  bash "$repo/lab/experiments/EXP-DX1/stack/up.sh" "$prefix" --port-write 18861 --port-read 18862 > "$out/stack-up.log" 2>&1 ||
  { echo "stack did not start; see $out/stack-up.log" >&2; exit 1; }
(cd "$repo" && node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq3/gate.ts "$out" http://127.0.0.1:18861 http://127.0.0.1:18862) > "$out/driver.log" 2>&1
status=$?
for role in gw-r gw-w tx; do docker logs "$prefix-$role" > "$out/stack/$role.log" 2>&1; done
exit "$status"
