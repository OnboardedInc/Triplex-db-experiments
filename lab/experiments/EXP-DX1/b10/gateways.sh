#!/usr/bin/env bash
# [DX-B10] Why: switch a quiescent owned stack between verified gates and normal measurement settings.
# Rejected: timing double-checked cache reads or extending a lease across test/measurement phases.
set -euo pipefail
prefix=${1:?}; verify=${2:?0|1}
[[ $prefix =~ ^tx2-dxb10-[a-z0-9-]+$ && $verify =~ ^[01]$ ]] || exit 2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
 for role in w r; do
  docker rm -f "$prefix-gw-$role" >/dev/null
  cpu=1; port=8526; [[ $role == w ]] || { cpu=2,3; port=8527; }
  docker run -d --pull never --name "$prefix-gw-$role" --network "$prefix-net" --cpuset-cpus "$cpu" --memory 3g --memory-swap 3g -p "127.0.0.1:$port:8080" \
   -e 'DATOMIC_JAVA_OPTS=-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g -Dtriplex.codec.spec=/opt/spec/codec-spec.json' \
   -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src -e GATEWAY_SOURCE_SHA256=DX-B10-local -e "TX2_ENTITY_CACHE_VERIFY=$verify" \
   -e "DATOMIC_URI_TEMPLATE=datomic:sql://{db}?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic" \
   -v "$PWD/packages/datomic/gateway:/opt/gateway:ro" -v "$PWD/packages/datomic/src/codec-spec.json:/opt/spec/codec-spec.json:ro" \
   --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m triplex.gateway.main >/dev/null
  ready=false
  for ((i=0;i<90;i++)); do
   if docker run --rm --pull never --name "$prefix-health" --network "$prefix-net" node:22.23.2-bookworm-slim node -e "fetch('http://$prefix-gw-$role:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" 2>/dev/null; then ready=true; break; fi
   sleep 1
  done
  [[ $ready == true ]] || exit 1
 done
