#!/usr/bin/env bash
# [DX-ERA4, second review N1] Ledgers in parts with the setting on a stack: subjects owing F forms (era5/forms.ts case P,
# ERA5_FORMS_ONLY=1) against a stack's write gateway (transactor, PostgreSQL storage and removal authority, a write and
# a read gateway, every container on the image the stack pins by ID; TX2_DERIVED_SEAL, per account, subject check). The
# databases are declared sealed and `derived-seal-required`; settlement and the notice recorder run with
# TX2_NOTICE_LEDGER=parts. Adapted from era5/stack-shred.sh. One ordinary heavy token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA4-stack-forms -- \
#     bash lab/experiments/EXP-DX1/era4/stack-forms.sh NEW_ABSOLUTE_DIR
# ERA5_PARTS_FORMS (default 200,1000,1700): the owed forms per subject, in parts, with the setting.
set -euo pipefail
out=${1:?new absolute output directory}
[[ $out == /* && ! -e $out ]] || { echo "give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
cd "$repo"
mkdir -p "$out/evidence" "$out/gw" "$out/gwtmp" "$out/run.out"
git rev-parse HEAD > "$out/source"
prefix=tx2-dxera4f-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
echo "$prefix" > "$out/prefix"
port_w=${DX_ERA4_PORT_WRITE:-19051} port_r=${DX_ERA4_PORT_READ:-19055}
for p in "$port_w" "$port_r"; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then echo "port $p is in use" >&2; exit 2; fi
done
cleanup() {
  for role in gw-r gw-w tx; do docker logs "$prefix-$role" > "$out/evidence/$role.log" 2>&1 || true; done
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes >/dev/null 2>&1 || true
  rm -rf "$out/gw" "$out/gwtmp"
}
trap cleanup EXIT
git archive HEAD packages/datomic/gateway packages/datomic/src/codec-spec.json | tar -x -C "$out/gwtmp"
cp -R "$out/gwtmp/packages/datomic/gateway/." "$out/gw/"
cp "$out/gwtmp/packages/datomic/src/codec-spec.json" "$out/gw/codec-spec.json"
profile=()
while IFS= read -r line; do profile+=("$line"); done < <(node demo/server/profile.mjs toy)
envs=() args=() sep=0
for line in "${profile[@]}"; do
  if [[ $line == -- ]]; then sep=1; elif [[ $sep == 0 ]]; then envs+=("$line"); else args+=("$line"); fi
done
gateway=(TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 DX_W1_EXTRA=1 DX_W1_PREDECESSOR=1
  DX_W1_FAST_REPLY=1 DX_W1_JOURNAL_QUERY=1 DX_GROUP_COMMIT=0 DX_PINNED_SHORTCUT=0 DX_PINNED_CUT_LOOKUP=0
  DX_ERASURE_SQL=1 DX_INT1_NATIVE_WRITE_READBACK=1 DX_REMOVAL_PER_ACCOUNT=1 DX_REMOVAL_SUBJECT_CHECK=1
  DX_DERIVED_SEAL=1)
env "${envs[@]}" "${gateway[@]}" DX_STACK_EVIDENCE="$out/evidence" DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_QUIET_LOGS=1 \
  TRIPLEX_TRACE_LEVEL=off bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --port-write "$port_w" --port-read "$port_r" \
  --gateway-src "$out/gw" "${args[@]}" > "$out/up.log" 2>&1 || { echo "stack did not start; see $out/up.log" >&2; exit 1; }
pinned=$(cut -d'|' -f1 "$out/evidence/$prefix/config/java-image.txt")
pg_pinned=$(docker image inspect --format '{{.Id}}' postgres:17-alpine)
check_images() {
  for role in tx gw-w gw-r pg; do
    ran=$(docker inspect --format '{{.Image}}' "$prefix-$role")
    echo "$1 $prefix-$role $ran" >> "$out/images-ran"
    want=$pinned; [[ $role == pg ]] && want=$pg_pinned
    [[ $ran == "$want" ]] || { echo "container $prefix-$role runs $ran, not the pinned $want" >&2; exit 1; }
  done
}
check_images start
started=$(date +%s)
status=0
env DATOMIC_URL="http://127.0.0.1:$port_w" TRIPLEX_DATOMIC_LAYOUT=lean TX2_SETTLE_FRAMES=bytes TX2_SETTLE_PRECONDITION=progress \
  TX2_DERIVED_SEAL=1 ERA4_SEALED=1 ERA5_FORMS_ONLY=1 ERA5_FORMS= ERA5_PARTS_OFF= \
  ERA5_PARTS_FORMS="${ERA5_PARTS_FORMS:-200,1000,1700}" node --no-warnings --experimental-transform-types \
  lab/experiments/EXP-DX1/era5/forms.ts "$out" "$out/run.out" > "$out/forms.log" 2>&1 || status=$?
echo "$(( $(date +%s) - started ))" > "$out/seconds"
check_images end
grep -E '^\{"kind":' "$out/forms.log" | cut -c1-3000 | tail -20
exit "$status"
