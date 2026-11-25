#!/usr/bin/env bash
# [DX-ERA4] The server run (written, not run: a rental needs the owner's approval in money terms). Linux, a clean clone
# at the branch head, Docker on the server, this branch's Datomic image built from the head (its ID in IMAGE_RECEIPT).
#   bash lab/experiments/EXP-DX1/era4/server.sh NEW_ABSOLUTE_DIR
# Per arm (off: TX2_DERIVED_SEAL unset; on), a stack with the PostgreSQL removal authority shared by both gateways (a
# fresh wrapping key; the production removal path), the per-account removal rule and account tickets, then era4/derived.ts
# against the write gateway with ERA4_SEALED=1 for on and ERA4_SEALED=0 for off (off cannot run sealed, page 5.1).
# Then the stack and its volumes are removed. Predictions and what would show them wrong: page section 8.
set -euo pipefail
out=${1:?new absolute output directory}
[[ $out == /* && ! -e $out ]] || { echo "server.sh: give a new absolute output directory" >&2; exit 2; }
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
: "${DX_DATOMIC_IMAGE_RECEIPT:?start the stack from this branch's image, by ID}"
for arm in off on; do
  prefix=tx2-dxera4-srv-$arm port_w=18991 port_r=18995
  gw=(DX_ERASURE_SQL=1 DX_REMOVAL_PER_ACCOUNT=1 DX_REMOVAL_SUBJECT_CHECK=1 DX_ACCOUNT_TICKETS=1 DX_ERASURE_SHRED_GRACE_MS=0)
  [[ $arm == on ]] && gw+=(DX_DERIVED_SEAL=1)
  mkdir -p "$out/$arm"
  env "${gw[@]}" DX_STACK_EVIDENCE="$out/$arm" DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_QUIET_LOGS=1 \
    bash "$repo/lab/experiments/EXP-DX1/stack/up.sh" "$prefix" --port-write "$port_w" --port-read "$port_r" > "$out/$arm/up.log" 2>&1
  client=(DATOMIC_URL="http://127.0.0.1:$port_w" TRIPLEX_DATOMIC_LAYOUT=lean TX2_SETTLE_FRAMES=bytes
          TX2_SETTLE_PRECONDITION=progress TX2_REMOVAL_PER_ACCOUNT=1 TX2_ACCOUNT_TICKETS=1)
  [[ $arm == on ]] && client+=(TX2_DERIVED_SEAL=1 ERA4_SEALED=1) || client+=(ERA4_SEALED=0)
  # The native dump of derived.ts is the in-memory gateway's (serve.clj); on a stack the scan covers every route and
  # the client's reads, and the PostgreSQL rows are scanned by pg_dump of both databases below.
  mkdir -p "$out/$arm/run.out"
  env "${client[@]}" ERA4_NO_DUMP=1 node --no-warnings --experimental-transform-types \
    "$repo/lab/experiments/EXP-DX1/era4/derived.ts" "$out/$arm" "$out/$arm/run.out" > "$out/$arm/derived.log" 2>&1 || true
  docker exec "$prefix-pg" pg_dump -U postgres -d datomic --data-only | gzip > "$out/$arm/datomic.sql.gz"
  docker exec "$prefix-pg" pg_dump -U postgres -d removal_authority --data-only --exclude-table=triplex_removal.keys | gzip > "$out/$arm/authority.sql.gz"
  bash "$repo/lab/experiments/EXP-DX1/stack/down.sh" "$prefix" --volumes > /dev/null 2>&1 || true
done
