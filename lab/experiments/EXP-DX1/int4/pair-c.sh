#!/usr/bin/env bash
# [DX-INT4] Pair (c): one toy stack of this checkout whose read gateway serves the ID list route and the read prefetch
# with one permit each (DX_ID_LISTS=1, DX_INDEX_QUERY_PERMITS=1, DX_READ_PREFETCH=1, DX_READ_PERMITS=1), then
# int4/pair-c.ts (64 pinned readers, a steady ID lister and per-account count bursts), then the stack is removed.
#   node lab/bin/heavy.mjs --label DX-INT4-pair-c -- bash lab/experiments/EXP-DX1/int4/pair-c.sh NEW_ABSOLUTE_DIR
set -uo pipefail
out=${1:?absolute new output directory}
[[ $out == /* && ! -e $out ]] || { echo "pair-c.sh: give a new absolute output directory" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
prefix=tx2-dxint4-pairc-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')
mkdir -p "$out/stack"
git -C "$repo" rev-parse HEAD > "$out/source"
cleanup() { for role in gw-r gw-w tx; do docker logs "$prefix-$role" > "$out/stack/$role.log" 2>&1; done
  bash "$repo/lab/experiments/EXP-DX1/stack/down.sh" "$prefix" --volumes >/dev/null 2>&1; }
trap cleanup EXIT
DX_STACK_EVIDENCE=$out/stack DX_STACK_WAIT_FOR_TRANSACTOR=1 TRIPLEX_TRACE_LEVEL=off DX_ID_LISTS=1 DX_INDEX_QUERY_PERMITS=1 \
  DX_READ_PREFETCH=1 DX_READ_PERMITS=1 \
  bash "$repo/lab/experiments/EXP-DX1/stack/up.sh" "$prefix" --port-write 18881 --port-read 18882 > "$out/stack-up.log" 2>&1 ||
  { echo "pair-c.sh: the stack did not start; see $out/stack-up.log" >&2; exit 1; }
(cd "$repo" && node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/int4/pair-c.ts "$out" \
  http://127.0.0.1:18881 http://127.0.0.1:18882) > "$out/driver.log" 2>&1
status=$?
tail -2 "$out/driver.log"
exit "$status"
