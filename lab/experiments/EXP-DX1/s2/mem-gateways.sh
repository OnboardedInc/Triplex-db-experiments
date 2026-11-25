#!/usr/bin/env bash
# [DX-S2] Two in-memory write gateways in the lab VM for the product-path gates (correctness only, times diagnostic):
#   "subject": the per-subject writer with the server's settings (numeric owner, ordered IDs), TX2_SUBJECT_WIDE as given
#   "control": the same settings with the per-subject writer off, so every save takes the general writer
# Usage (one ordinary heavy token around the whole run, as the caller's gate script does):
#   s2/mem-gateways.sh up <name> <subject port> <control port> [wide 0|1]   prints when both answer /health
#   s2/mem-gateways.sh down <name>                                           removes both containers
# Gateway sources are mounted read-only from this checkout. Memory storage keeps nothing after `down`.
set -euo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
export DOCKER_HOST
repo=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
image=${DX_S2_IMAGE:-tx2-datomic:dx-real2-production}
action=${1:?up|down}
name=${2:?name}
[[ $name =~ ^[a-z0-9-]+$ ]] || { echo "mem-gateways.sh: name must be lower-case letters, digits and dashes" >&2; exit 2; }
prefix=tx2-dxs2-$name
case $action in
  down)
    docker rm -f "$prefix-subject" "$prefix-control" >/dev/null 2>&1 || true
    exit 0 ;;
  up) ;;
  *) echo "mem-gateways.sh: up|down" >&2; exit 2 ;;
esac
subject_port=${3:?subject port}
control_port=${4:?control port}
wide=${5:-1}
[[ $wide == 0 || $wide == 1 ]] || { echo "mem-gateways.sh: wide is 0 or 1" >&2; exit 2; }
start() {  # $1 container, $2 port, $3 TX2_SUBJECT_SAVE, $4 TX2_SUBJECT_WIDE
  docker rm -f "$1" >/dev/null 2>&1 || true
  docker run -d --pull never --name "$1" --memory 2g --memory-swap 2g -p "127.0.0.1:$2:8080" \
    -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" \
    -v "$repo/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
    -e 'DATOMIC_URI_TEMPLATE=datomic:mem://{db}' -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src \
    -e 'DATOMIC_JAVA_OPTS=-Xms128m -Xmx1200m -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json' \
    -e "TX2_SUBJECT_SAVE=$3" -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1 -e TX2_SUBJECT_PREFETCH=0 \
    -e "TX2_SUBJECT_WIDE=$4" -e TX2_PREDECESSOR_LOOKUP=1 -e TX2_GROUP_COMMIT=0 -e TX2_LIVE_PRIORITY=0 \
    -e TX2_LEAN_NATIVE_QUERY=1 -e TX2_LEAN_NATIVE_LOG=1 -e TRIPLEX_TRACE_LEVEL=off \
    --entrypoint /opt/datomic/bin/run "$image" -m triplex.gateway.main >/dev/null
}
start "$prefix-subject" "$subject_port" 1 "$wide"
start "$prefix-control" "$control_port" 0 0
for port in "$subject_port" "$control_port"; do
  for ((i = 0; i < 240; i++)); do
    curl -fsS -o /dev/null "http://127.0.0.1:$port/health" 2>/dev/null && break
    sleep 0.5
  done
  curl -fsS -o /dev/null "http://127.0.0.1:$port/health" || { docker logs --tail 40 "$prefix-subject" >&2; exit 1; }
done
echo "DX-S2 gateways up: subject 127.0.0.1:$subject_port (wide=$wide), control 127.0.0.1:$control_port"
