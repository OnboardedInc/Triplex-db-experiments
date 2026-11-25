#!/usr/bin/env bash
# [DX-REAL2] Mac live gate for production-aged: PREP1's aged-live container (PostgreSQL, transactor, this branch's
# gateway; AGE1's own code at its load pin ages the toy), driven by real2/aged-gate.ts. One ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-REAL2-aged-live -- bash lab/experiments/EXP-DX1/real2/aged-gate.sh OUT
set -uo pipefail
out=${1:?absolute new output directory under /Users (the lab VM shares only that tree)}
[[ $out == /Users/* && ! -e $out ]] || { echo "aged-gate.sh: give a new absolute output directory under /Users" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
mkdir -p "$out/out" "$out/age1src"
# [DX-INT4] Start from one image ID, never a fixed shared tag another builder can retag (lab/bin/gate-image.sh).
. "$repo/lab/bin/gate-image.sh"
image=$(gate_image "${DX_REAL2_GATE_IMAGE:-tx2-datomic:dx-real2-production}" "$out/image.json") || exit 2
# AGE1 at its load pin: its transactor functions, codec spec and aging code, nothing from this branch.
git -C "$repo" archive 5cda4ab204b9736e32960843bee8cbc47d5ca74d -- packages/datomic/gateway/src packages/datomic/src/codec-spec.json \
  lab/experiments/EXP-DX1/age1/src | tar -x -C "$out/age1src"
git -C "$repo" rev-parse HEAD > "$out/source"
# [DX-S2] Optional: a private container name and port (default as before), and DX_S2_PRODUCT (0 or 1) for the driver:
# every tape save through the product's path with the SDK's orderedSaves option off or on.
name=tx2-dxreal2-aged-live${DX_REAL2_AGED_NAME:+-$DX_REAL2_AGED_NAME}
port=${DX_REAL2_AGED_PORT:-18592}
[[ $port =~ ^[0-9]+$ ]] || { echo "DX_REAL2_AGED_PORT must be a port number" >&2; exit 2; }
[[ -z ${DX_S2_PRODUCT:-} || $DX_S2_PRODUCT =~ ^[01]$ ]] || { echo "DX_S2_PRODUCT must be 0 or 1" >&2; exit 2; }
docker rm -f "$name" >/dev/null 2>&1
# [DX-W3] Optional: the general writer's hints (0 or 1) with Datomic prefetch on; unset leaves the gate as it was.
w3=()
if [[ -n ${DX_W3_GENERAL_PREFETCH:-} ]]; then
  [[ $DX_W3_GENERAL_PREFETCH =~ ^[01]$ ]] || { echo "DX_W3_GENERAL_PREFETCH must be 0 or 1" >&2; exit 2; }
  w3=(-e "TX2_GENERAL_PREFETCH=$DX_W3_GENERAL_PREFETCH" -e DX_W3_PREFETCH_PROBES=1)
fi
# [DX-W4] Optional: the per-subject writer's hints (0 or 1) with Datomic prefetch on; unset leaves it as it was.
if [[ -n ${DX_W4_SUBJECT_HINTS:-} ]]; then
  [[ $DX_W4_SUBJECT_HINTS =~ ^[01]$ ]] || { echo "DX_W4_SUBJECT_HINTS must be 0 or 1" >&2; exit 2; }
  w3+=(-e "TX2_SUBJECT_HINTS=$DX_W4_SUBJECT_HINTS" -e DX_W3_PREFETCH_PROBES=1)
fi
# [DX-S1] Optional: wide saves on the per-subject writer (TX2_SUBJECT_WIDE, 0 or 1), in the gateway and the driver.
if [[ -n ${DX_S1_WIDE:-} ]]; then
  [[ $DX_S1_WIDE =~ ^[01]$ ]] || { echo "DX_S1_WIDE must be 0 or 1" >&2; exit 2; }
  w3+=(-e "TX2_SUBJECT_WIDE=$DX_S1_WIDE")
  export TX2_SUBJECT_WIDE=$DX_S1_WIDE
fi
# [DX-INT4] Optional: the merged read options (DX_READ_PREFETCH, DX_ID_LISTS, DX_SWEEP: 0 or 1) passed to the gateway as
# TX2_*; unset leaves the gate as it was. The gateway's own environment is recorded once it is up (gateway-options.txt).
for v in DX_READ_PREFETCH DX_ID_LISTS DX_SWEEP; do
  [[ -z ${!v:-} ]] && continue
  [[ ${!v} =~ ^[01]$ ]] || { echo "$v must be 0 or 1" >&2; exit 2; }
  w3+=(-e "TX2_${v#DX_}=${!v}")
done
# [DX-S3] Optional: several owners on the per-subject writer (0 or 1), in the gateway (TX2_SUBJECT_SEVERAL_OWNERS) and
# the driver's SDK (severalOwners); needs DX_S1_WIDE=1 and DX_S2_PRODUCT=1. Unset leaves the gate as it was.
if [[ -n ${DX_S3_OWNERS:-} ]]; then
  [[ $DX_S3_OWNERS =~ ^[01]$ && ${DX_S1_WIDE:-} == 1 && ${DX_S2_PRODUCT:-} == 1 ]] ||
    { echo "DX_S3_OWNERS must be 0 or 1, with DX_S1_WIDE=1 and DX_S2_PRODUCT=1" >&2; exit 2; }
  w3+=(-e "TX2_SUBJECT_SEVERAL_OWNERS=$DX_S3_OWNERS")
  export DX_S3_OWNERS
fi
# [DX-S4] Optional: tape M after R and S (DX_S4_MIX=1) and the creation option (DX_S4_CREATE 0 or 1) in the gateway
# (TX2_SUBJECT_CREATE) and the driver's SDK (creationSaves); needs DX_S3_OWNERS=1. Unset leaves the gate as it was.
if [[ -n ${DX_S4_MIX:-}${DX_S4_CREATE:-} ]]; then
  [[ ${DX_S4_MIX:-0} =~ ^[01]$ && ${DX_S4_CREATE:-0} =~ ^[01]$ && ${DX_S3_OWNERS:-} == 1 ]] ||
    { echo "DX_S4_MIX and DX_S4_CREATE must be 0 or 1, with DX_S3_OWNERS=1" >&2; exit 2; }
  w3+=(-e "TX2_SUBJECT_CREATE=${DX_S4_CREATE:-0}")
  export DX_S4_MIX=${DX_S4_MIX:-0} DX_S4_CREATE=${DX_S4_CREATE:-0}
fi
# [DX-XQ4] Optional: the commit-time index on (TX2_CROSS_INDEX=1) with xq4/declarations/production-6.json declared and
# backfilled by the driver after aging; unset leaves the gate as it was.
if [[ -n ${DX_XQ4_CROSS_INDEX:-} ]]; then
  [[ $DX_XQ4_CROSS_INDEX == 1 ]] || { echo "DX_XQ4_CROSS_INDEX must be 1 or unset" >&2; exit 2; }
  w3+=(-e TX2_CROSS_INDEX=1)
  export DX_XQ4_DECLARATION=$repo/lab/experiments/EXP-DX1/xq4/declarations/production-6.json
fi
docker run -d --name "$name" --memory 3g -p "127.0.0.1:$port:8080" ${w3[@]+"${w3[@]}"} --entrypoint /bin/bash \
  -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$out/age1src:/age:ro" \
  -v "$repo/lab/experiments/EXP-DX1/prep1/aged-live:/gate:ro" -v "$out/out:/out" "$image" /gate/container.sh >/dev/null
gate_image_ran "$name" "$image" "$out/image.json" || { docker rm -f "$name" >/dev/null; exit 2; }
for ((i=0; i<480; i++)); do [[ -f $out/out/ready ]] && break; sleep .5; done
docker exec "$name" bash -c 'for p in /proc/[0-9]*; do tr "\0" " " < $p/cmdline 2>/dev/null | grep -q triplex.gateway.main &&
  tr "\0" "\n" < $p/environ | grep -E "^TX2_(READ_PREFETCH|ID_LISTS|SWEEP)=" | sort; done; true' > "$out/out/gateway-options.txt" 2>&1
(cd "$repo" && DX_PREP1_LIBRARY=1 DX_PREP1_CAMPAIGN=rolling DX_REAL2_SET=aged DX_PREP1_AGED=1 \
  node --import tsx lab/experiments/EXP-DX1/real2/aged-gate.ts "$out/out" "http://127.0.0.1:$port") 2>&1 | tee "$out/driver.log"
status=${PIPESTATUS[0]}
docker logs "$name" > "$out/out/container.log" 2>&1
docker rm -f "$name" >/dev/null
rm -rf "$out/age1src"
exit "$status"
