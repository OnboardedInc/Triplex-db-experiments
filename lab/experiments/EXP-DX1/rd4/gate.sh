#!/usr/bin/env bash
# [DX-RD4] Mac gate for reads "at least" a receipt's position, under one ordinary heavy token (times diagnostic):
#   node lab/bin/heavy.mjs --label DX-RD4-gate -- bash lab/experiments/EXP-DX1/rd4/gate.sh NEW_DIR
# Starts a two-peer toy stack (PostgreSQL, transactor, write gateway, read gateway behind rd4/hold-proxy.mjs) from this
# checkout's gateway source on ports 18661, 18662 and 18762, runs gate.ts, and removes the stack and its volume.
set -uo pipefail
out=${1:?absolute new output directory under /Users}
[[ $out == /Users/* && ! -e $out ]] || { echo "gate.sh: give a new absolute output directory under /Users" >&2; exit 2; }
repo=$(git rev-parse --show-toplevel)
prefix=tx2-dxrd4-gate-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')
mkdir -p "$out/stack"
git -C "$repo" rev-parse HEAD > "$out/source"
cleanup() { bash "$repo/lab/experiments/EXP-DX1/stack/down.sh" "$prefix" --volumes >/dev/null 2>&1; }
trap cleanup EXIT
DX_STACK_EVIDENCE=$out/stack DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_RD4_READ_HOLD=1 TRIPLEX_TRACE_LEVEL=off \
  bash "$repo/lab/experiments/EXP-DX1/stack/up.sh" "$prefix" --port-write 18661 --port-read 18662 > "$out/stack-up.log" 2>&1 ||
  { echo "gate.sh: the stack did not start; see $out/stack-up.log" >&2; exit 1; }
(cd "$repo" && DX_RD4_SOURCE=$(cat "$out/source") node --no-warnings --experimental-transform-types \
  lab/experiments/EXP-DX1/rd4/gate.ts "$out" http://127.0.0.1:18661 http://127.0.0.1:18662 http://127.0.0.1:18762) \
  > "$out/driver.log" 2>&1
status=$?
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
for role in gw-r gw-w tx hold; do docker logs "$prefix-$role" > "$out/stack/$role.log" 2>&1; done
exit "$status"
