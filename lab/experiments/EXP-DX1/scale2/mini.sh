#!/usr/bin/env bash
# [DX-SCALE2] The Mac miniature of many small accounts in the one database, under one ordinary heavy token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-SCALE2-mini -- \
#     bash lab/experiments/EXP-DX1/scale2/mini.sh NEW_OUT_DIR
# A fresh stack in the lab VM (laptop profile, the held toy's write-gateway switches as act7/miniature.sh, the ID list
# route and the sweep on the read gateway), then scale2/mini.ts with the environment's DX_SCALE2_* settings, then the
# stack and its volumes are removed. Diagnostic only; no time here is a result. Ports 18741/18745.
set -euo pipefail
out=${1:?new output directory}
[[ $out == /* && ! -e $out ]] || { echo "give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
cd "$repo"
mkdir -p "$out/evidence"
git rev-parse HEAD > "$out/source"
prefix=tx2-dxscale2-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
echo "$prefix" > "$out/prefix"
port_w=${DX_SCALE2_PORT_WRITE:-18741} port_r=${DX_SCALE2_PORT_READ:-18745}
cleanup() {
  for role in gw-r gw-w tx; do docker logs "$prefix-$role" > "$out/evidence/$role.log" 2>&1 || true; done
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes >/dev/null 2>&1 || true
}
trap cleanup EXIT
profile=()
while IFS= read -r line; do profile+=("$line"); done < <(node demo/server/profile.mjs toy)
envs=() args=() sep=0
for line in "${profile[@]}"; do
  if [[ $line == -- ]]; then sep=1; elif [[ $sep == 0 ]]; then envs+=("$line"); else args+=("$line"); fi
done
gateway=(TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 DX_W1_EXTRA=1 DX_W1_PREDECESSOR=1
  DX_W1_FAST_REPLY=1 DX_W1_JOURNAL_QUERY=1 DX_GROUP_COMMIT=0 DX_PINNED_SHORTCUT=0 DX_PINNED_CUT_LOOKUP=0
  DX_ID_LISTS=1 DX_SWEEP=1 DX_SWEEP_PERMITS=2 DX_SWEEP_PER_ACCOUNT=1)
started=0
for attempt in 1 2 3 4 5 6; do
  if env "${envs[@]}" "${gateway[@]}" ${DX_SCALE2_GATEWAY_ENV:-} DX_STACK_EVIDENCE="$out/evidence" \
    DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_QUIET_LOGS=1 TRIPLEX_TRACE_LEVEL=off \
    bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --port-write "$port_w" --port-read "$port_r" "${args[@]}" \
    > "$out/up-$attempt.log" 2>&1; then started=1; break; fi
  echo "stack did not start (attempt $attempt); see $out/up-$attempt.log" >&2
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes >/dev/null 2>&1 || true
  sleep 60
done
[[ $started == 1 ]] || exit 1
status=0
client_env=(TRIPLEX_DATOMIC_LAYOUT=lean TRIPLEX_DATOMIC_FAST_PATHS=save-wire TX2_SWEEP_STRICT=1 TX2_W0_POINT_JOURNAL=1
  TX2_W0_RESTORE_INDEXED_JOURNAL=1 DX_SERVER_RECORD_TIME=1 DX_STRICT_RECORD_CLOCKS=1
  TX2_SETTLE_FRAMES=bytes TX2_SETTLE_PRECONDITION=progress
  DATOMIC_URL="http://127.0.0.1:$port_w" DATOMIC_READ_URLS="http://127.0.0.1:$port_r")
env "${client_env[@]}" node --no-warnings --expose-gc --experimental-transform-types --max-old-space-size=4096 \
  lab/experiments/EXP-DX1/scale2/mini.ts "$out" "http://127.0.0.1:$port_w" "http://127.0.0.1:$port_r" "$prefix" \
  > "$out/mini.log" 2>&1 || status=$?
grep -E '"kind":"(PASS|roster|load|enrolled|published|window|final-reads|feed|settlement)"' "$out/mini.log" | cut -c1-400 || tail -30 "$out/mini.log"
exit "$status"
