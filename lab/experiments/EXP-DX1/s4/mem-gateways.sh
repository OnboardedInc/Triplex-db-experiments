#!/usr/bin/env bash
# [DX-S4] (copied from s3/mem-gateways.sh, which stays as it was) Three in-memory write gateways in the lab VM for the
# creation gates (correctness only, times diagnostic), started from one pinned image ID that is recorded:
#   "subject": the per-subject writer with the server's settings (numeric owner, ordered IDs), the wide writer on, and
#              TX2_SUBJECT_SEVERAL_OWNERS=1 and TX2_SUBJECT_CREATE as given
#   "control": the same settings with the per-subject writer off, so every save takes the general writer
#   "profile": the control's settings with TX2_LOAD1_PROFILE=1, so each general-writer commit reports its history
#              lookups (per-ID seeks and range probes); used only to count, never as the control
#   s4/mem-gateways.sh up <name> <subject port> <control port> <profile port> <create 0|1> [hints 0|1]
#   s4/mem-gateways.sh down <name>                                     removes the three containers
# Gateway sources are mounted read-only from this checkout. Memory storage keeps nothing after `down`.
set -euo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
export DOCKER_HOST
repo=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
image=${DX_S4_IMAGE:-tx2-datomic:dx-s4-runtime}
action=${1:?up|down}
name=${2:?name}
[[ $name =~ ^[a-z0-9-]+$ ]] || { echo "mem-gateways.sh: name must be lower-case letters, digits and dashes" >&2; exit 2; }
prefix=tx2-dxs4-$name
case $action in
  down)
    docker rm -f "$prefix-subject" "$prefix-control" "$prefix-profile" >/dev/null 2>&1 || true
    exit 0 ;;
  up) ;;
  *) echo "mem-gateways.sh: up|down" >&2; exit 2 ;;
esac
subject_port=${3:?subject port}
control_port=${4:?control port}
profile_port=${5:?profile port}
create=${6:?create 0|1}
hints=${7:-0}
[[ $create =~ ^[01]$ && $hints =~ ^[01]$ ]] || { echo "mem-gateways.sh: create and hints are 0 or 1" >&2; exit 2; }
image_id=$(docker image inspect -f '{{.Id}}' "$image")
start() {  # $1 container, $2 port, $3 TX2_SUBJECT_SAVE, $4 TX2_SUBJECT_WIDE, $5 several owners, $6 hints, $7 create, $8 profile
  docker rm -f "$1" >/dev/null 2>&1 || true
  docker run -d --pull never --label dx-s4=gate --name "$1" --memory 1500m --memory-swap 1500m -p "127.0.0.1:$2:8080" \
    -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" \
    -v "$repo/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
    -e 'DATOMIC_URI_TEMPLATE=datomic:mem://{db}' -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src \
    -e 'DATOMIC_JAVA_OPTS=-Xms128m -Xmx1200m -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json' \
    -e "TX2_SUBJECT_SAVE=$3" -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1 -e TX2_SUBJECT_PREFETCH=0 \
    -e "TX2_SUBJECT_WIDE=$4" -e "TX2_SUBJECT_SEVERAL_OWNERS=$5" -e "TX2_SUBJECT_HINTS=$6" -e "TX2_SUBJECT_CREATE=$7" \
    -e "TX2_LOAD1_PROFILE=$8" \
    -e TX2_PREDECESSOR_LOOKUP=1 -e TX2_GROUP_COMMIT=0 -e TX2_LIVE_PRIORITY=0 \
    -e TX2_LEAN_NATIVE_QUERY=1 -e TX2_LEAN_NATIVE_LOG=1 -e TRIPLEX_TRACE_LEVEL=off \
    --entrypoint /opt/datomic/bin/run "$image_id" -m triplex.gateway.main >/dev/null
}
start "$prefix-subject" "$subject_port" 1 1 1 "$hints" "$create" 0
start "$prefix-control" "$control_port" 0 0 0 0 0 0
start "$prefix-profile" "$profile_port" 0 0 0 0 0 1
for c in subject control profile; do
  echo "DX-S4_CONTAINER $prefix-$c $(docker inspect -f '{{.Image}}' "$prefix-$c") expected $image_id"
  [[ $(docker inspect -f '{{.Image}}' "$prefix-$c") == "$image_id" ]] || { echo "mem-gateways.sh: image mismatch" >&2; exit 1; }
done
for port in "$subject_port" "$control_port" "$profile_port"; do
  for ((i = 0; i < 240; i++)); do
    curl -fsS -o /dev/null "http://127.0.0.1:$port/health" 2>/dev/null && break
    sleep 0.5
  done
  curl -fsS -o /dev/null "http://127.0.0.1:$port/health" || { docker logs --tail 40 "$prefix-subject" >&2; exit 1; }
done
echo "DX-S4 gateways up: subject 127.0.0.1:$subject_port (create=$create hints=$hints), control 127.0.0.1:$control_port, profile 127.0.0.1:$profile_port"
