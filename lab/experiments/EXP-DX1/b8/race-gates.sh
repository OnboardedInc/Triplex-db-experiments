#!/usr/bin/env bash
# [DX-B8-C] Why: the oracle is a separate process with a zero-byte parsed/revision cache, on the same immutable SQL cut.
# Rejected: bypassing only a single cache layer in the process being tested.
set -euo pipefail
prefix=${1:?prefix};src=${B8_GATEWAY_SRC:?gateway source}
[[ $prefix =~ ^tx2-dxb8-[a-z0-9-]+$ ]] || exit 2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B8
cleanup(){ rc=$?;trap - EXIT;docker logs "$prefix-uncached" > "$root/$prefix-uncached.log" 2>&1||true;docker rm -f "$prefix-uncached" "$prefix-oracle-health" "$prefix-recent-selftest" >/dev/null 2>&1||true;exit "$rc";}
trap cleanup EXIT
trap 'exit 124' TERM INT
docker run --rm --pull never --name "$prefix-recent-selftest" --cpuset-cpus 4,5,6,7 --memory 3g --memory-swap 3g -v "$src:/opt/gateway:ro" -e 'DATOMIC_URI_TEMPLATE=datomic:mem://{db}' -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m triplex.gateway.recent-test > "$root/$prefix-recent.log" 2>&1
cat "$root/$prefix-recent.log"
docker run -d --pull never --name "$prefix-uncached" --network "$prefix-net" --cpuset-cpus 2,3 --memory 2g --memory-swap 2g -e 'DATOMIC_JAVA_OPTS=-Xms128m -Xmx1g -Dtriplex.entityCacheVerify=true' -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src -e TX2_ENTITY_CACHE_BYTES=0 -e "DATOMIC_URI_TEMPLATE=datomic:sql://{db}?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic" -v "$src:/opt/gateway:ro" --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m triplex.gateway.main >/dev/null
docker inspect "$prefix-uncached" > "$root/$prefix-uncached-container.json"
ready=false
for ((i=0;i<90;i++));do
 if docker run --rm --pull never --name "$prefix-oracle-health" --network "$prefix-net" node:22.23.2-bookworm-slim node -e "fetch('http://$prefix-uncached:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))";then ready=true;break;fi
 sleep 1
done
[[ $ready == true ]]
export DX_DRIVER_ENV="${DX_DRIVER_ENV:-} B8_UNCACHED_URL=http://$prefix-uncached:8080"
bash lab/experiments/EXP-DX1/stack/run-in-vm.sh "$prefix" --cpus 4,5,6,7 --memory 5g -- node --experimental-strip-types packages/datomic/test/report-revision-race.mjs
