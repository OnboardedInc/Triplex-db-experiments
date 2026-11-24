#!/usr/bin/env bash
# [DX-ERA2] The fault measurement on the Mac, under one ordinary heavy token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA2-fault -- \
#     bash lab/experiments/EXP-DX1/era2/fault.sh NEW_OUT_DIR OPTION CELL...
# OPTION is 0 (TX2_REMOVAL_PER_ACCOUNT off) or 1 (on); each CELL is ACCOUNTS:REMOVALS_PER_S[:sealed] and runs era2/fault.ts
# on a fresh database of one stack (production write switches: per-subject writer with ordered IDs; the PostgreSQL removal
# authority shared by both gateways). The stack and its volumes are removed at the end. Counts are results; every time
# is diagnostic. Ports 18951/18955 (DX_ERA2_PORT_WRITE / _READ).
set -euo pipefail
out=${1:?new output directory}; option=${2:?0 or 1}; shift 2
[[ $out == /* && ! -e $out ]] || { echo "give a new absolute output directory" >&2; exit 2; }
[[ $option =~ ^[01]$ && $# -ge 1 ]] || { echo "OPTION must be 0 or 1, then at least one cell" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
cd "$repo"
mkdir -p "$out/evidence"
git rev-parse HEAD > "$out/source"
git diff --stat HEAD > "$out/source-diff" || true
prefix=tx2-dxera2-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
echo "$prefix" > "$out/prefix"
port_w=${DX_ERA2_PORT_WRITE:-18951} port_r=${DX_ERA2_PORT_READ:-18955}
cleanup() {
  for role in gw-r gw-w tx; do docker logs "$prefix-$role" > "$out/evidence/$role.log" 2>&1 || true; done
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes >/dev/null 2>&1 || true
  rm -rf "$out/gateway-ref/packages"
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
  DX_ERASURE_SQL=1 DX_INT1_NATIVE_WRITE_READBACK=1)
[[ $option == 0 ]] || gateway+=(DX_REMOVAL_PER_ACCOUNT=1)
# DX_ERA2_GATEWAY_REF=<commit>: run the gateway of that commit (the base, for the "before" counts) instead of this
# checkout's; the driver and the stack scripts stay this checkout's.
srcargs=()
if [[ -n ${DX_ERA2_GATEWAY_REF:-} ]]; then
  mkdir -p "$out/gateway-ref"
  git archive "$DX_ERA2_GATEWAY_REF" packages/datomic/gateway packages/datomic/src/codec-spec.json | tar -x -C "$out/gateway-ref"
  cp "$out/gateway-ref/packages/datomic/src/codec-spec.json" "$out/gateway-ref/packages/datomic/gateway/codec-spec.json"
  git rev-parse "$DX_ERA2_GATEWAY_REF" > "$out/gateway-ref/commit"
  srcargs=(--gateway-src "$out/gateway-ref/packages/datomic/gateway")
fi
started=0
for attempt in 1 2 3 4 5 6; do
  if env "${envs[@]}" "${gateway[@]}" ${DX_ERA2_GATEWAY_ENV:-} DX_STACK_EVIDENCE="$out/evidence" \
    DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_QUIET_LOGS=1 TRIPLEX_TRACE_LEVEL=off \
    bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --port-write "$port_w" --port-read "$port_r" ${srcargs[@]+"${srcargs[@]}"} "${args[@]}" \
    > "$out/up-$attempt.log" 2>&1; then started=1; break; fi
  echo "stack did not start (attempt $attempt); see $out/up-$attempt.log" >&2
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes >/dev/null 2>&1 || true
  sleep 60
done
[[ $started == 1 ]] || exit 1
status=0
for cell in "$@"; do
  IFS=: read -r accounts rate kind <<< "$cell"
  [[ $accounts =~ ^[0-9]+$ && $rate =~ ^[0-9.]+$ ]] || { echo "bad cell $cell" >&2; exit 2; }
  label="o${option}-a${accounts}-r${rate}${kind:+-$kind}"
  env ERA2_ACCOUNTS="$accounts" ERA2_REMOVAL_RATE="$rate" ERA2_SEALED=$([[ ${kind:-} == sealed ]] && echo 1 || echo 0) \
    ERA2_PER_ACCOUNT="$option" ERA2_LABEL="$label" \
    node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/era2/fault.ts "$out" \
    "http://127.0.0.1:$port_w" "http://127.0.0.1:$port_r" > "$out/$label.log" 2>&1 || status=$?
  grep -E '"kind":"(PASS|FAIL|result|seeded|scope)"' "$out/$label.log" | cut -c1-900 || tail -20 "$out/$label.log"
done
exit "$status"
