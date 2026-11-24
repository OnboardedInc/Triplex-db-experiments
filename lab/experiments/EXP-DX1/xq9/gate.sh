#!/usr/bin/env bash
# [DX-XQ9] Mac toy runs, one ordinary heavy token each, times diagnostic. DOCKER_HOST must name the lab VM's socket:
#   node lab/bin/heavy.mjs --label DX-XQ9-gate -- bash lab/experiments/EXP-DX1/xq9/gate.sh "$PWD" NEW_OUT_DIR ARM
# Arms:
#   twin-off  this branch's gateway with TX2_SWEEP=1 and TX2_SWEEP_SHAPES unset, beside a twin read gateway running the
#             base source (5faf8b80e); the sweep builder's whole gate (xq6/gate.ts, unchanged) runs through
#             twin-proxy.mjs, which sends every sweep request to both and compares the answers.
#   twin-on   the same with TX2_SWEEP_SHAPES=all: every request of the old gate must still be answered identically,
#             except those the base refused and a shape now accepts.
#   shapes    TX2_SWEEP_SHAPES=all, xq9/gate.ts: every new shape against an independent brute force.
#   load      TX2_SWEEP_SHAPES=all, xq9/load.ts: counted work per 1,000 subjects for each new shape.
set -uo pipefail
repo=$1 out=$2 arm=${3:?arm: twin-off, twin-on, shapes or load}
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
base_commit=${XQ9_BASE_COMMIT:-5faf8b80e}
# The sweep builder's gate checks that the stack prefix starts with tx2-dxxq6 (its file is run unchanged).
prefix=tx2-dxxq6-xq9-${arm}-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')
mkdir -p "$out/stack"
proxy_pid=
cleanup() {
  [[ -n $proxy_pid ]] && kill "$proxy_pid" 2>/dev/null && sleep 1
  docker logs "$prefix-gw-b" > "$out/stack/gw-b.log" 2>&1 || true
  docker rm -f "$prefix-gw-b" >/dev/null 2>&1 || true
  bash "$repo/lab/experiments/EXP-DX1/stack/down.sh" "$prefix" --volumes >/dev/null 2>&1
  rm -rf "$out/base-gateway"
}
trap cleanup EXIT
secret=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
if [[ $arm == twin-off ]]; then unset DX_SWEEP_SHAPES; else export DX_SWEEP_SHAPES=all; fi
for attempt in 1 2 3 4 5 6; do
  DX_STACK_EVIDENCE=$out/stack DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_SWEEP=1 DX_SWEEP_CURSOR_SECRET=$secret \
    DX_SWEEP_PERMITS=${DX_SWEEP_PERMITS:-1} DX_SWEEP_PER_ACCOUNT=${DX_SWEEP_PER_ACCOUNT:-1} \
    DX_XQ3_ERASURE_DIRECTORY=1 TRIPLEX_TRACE_LEVEL=off \
    bash "$repo/lab/experiments/EXP-DX1/stack/up.sh" "$prefix" --port-write 18981 --port-read 18982 > "$out/stack-up-$attempt.log" 2>&1 && break
  echo "stack did not start (attempt $attempt); see $out/stack-up-$attempt.log" >&2
  bash "$repo/lab/experiments/EXP-DX1/stack/down.sh" "$prefix" --volumes >/dev/null 2>&1
  [[ $attempt == 6 ]] && exit 1
  sleep 60
done
read_url=http://127.0.0.1:18982
case $arm in
  twin-off|twin-on)
    mkdir -p "$out/base-gateway"
    git -C "$repo" archive "$base_commit" packages/datomic/gateway | tar -x -C "$out/base-gateway" --strip-components 3
    git -C "$repo" show "$base_commit:packages/datomic/src/codec-spec.json" > "$out/base-gateway/codec-spec.json"
    python3 "$repo/lab/experiments/EXP-DX1/xq9/twin.py" "$prefix" "$out/base-gateway" 18983 > "$out/twin-container.txt" || exit 1
    for i in $(seq 1 180); do curl -fsS --max-time 2 http://127.0.0.1:18983/health > "$out/twin-health.json" 2>/dev/null && break; sleep 1; done
    node "$repo/lab/experiments/EXP-DX1/xq9/twin-proxy.mjs" 18984 "$read_url" http://127.0.0.1:18983 "$out/twin.jsonl" &
    proxy_pid=$!
    sleep 1
    (cd "$repo" && node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq6/gate.ts "$out" http://127.0.0.1:18981 http://127.0.0.1:18984 "$prefix") > "$out/driver.log" 2>&1
    status=$?
    kill "$proxy_pid"; wait "$proxy_pid" 2>/dev/null; proxy_pid=
    grep '"kind":"final"' "$out/twin.jsonl" | tail -1
    ;;
  shapes|load)
    (cd "$repo" && node --no-warnings --experimental-transform-types "lab/experiments/EXP-DX1/xq9/$arm.ts" "$out" http://127.0.0.1:18981 "$read_url" "$prefix") > "$out/driver.log" 2>&1
    status=$?
    ;;
  *) echo "unknown arm $arm" >&2; exit 2;;
esac
for role in gw-r gw-w tx; do docker logs "$prefix-$role" > "$out/stack/$role.log" 2>&1; done
exit "$status"
