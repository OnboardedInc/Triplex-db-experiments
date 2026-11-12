#!/usr/bin/env bash
# [DX-S5] Why: the cache proof uses only fresh native memory databases inside its own bounded measurement hold.
# Rejected: touching the retained SQL seed or starting a peer before the shared lock is held.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
repo=$PWD; prefix=tx2-dxs5-memo-unit; held=false; timer=; watcher=
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
cleanup() {
 rc=$?; trap - EXIT TERM INT
 [[ -z $timer ]] || kill "$timer" 2>/dev/null || true
 [[ -z $watcher ]] || kill "$watcher" 2>/dev/null || true
 if [[ $held == true ]]; then
  [[ -z $watcher ]] || wait "$watcher" 2>/dev/null || true
  docker rm -f "$prefix-peer" "$prefix-guard" 2>/dev/null || true
  [[ -z $(docker ps -aq --filter "name=^/$prefix-") ]] || { echo 'unit client remains; lock retained'; exit 1; }
  rm "$lock/owner.json"; rmdir "$lock"
 fi
 exit "$rc"
}
trap cleanup EXIT
trap 'exit 124' TERM INT
(( $(df -k /System/Volumes/Data | awk 'NR==2{print $4}') >= 15728640 )) || exit 2
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
held=true
printf '{"id":"DX-S5","pid":%s,"kind":"memo-unit"}\n' "$$" > "$lock/owner.json"
(( $(df -k /System/Volumes/Data | awk 'NR==2{print $4}') >= 15728640 )) || exit 2
# [DX-S5] Why: a lock wait can outlive the admission disk sample; even the short native unit must stop at the shared floors.
# Rejected: checking only before waiting, or relying on the later activation window to notice a full disk.
(
 trap 'exit 0' TERM INT
 while sleep 5; do
  mac=$(df -k /System/Volumes/Data | awk 'NR==2{print $4}')
  vm=$(docker run --rm --pull never --name "$prefix-guard" --memory 64m --memory-swap 64m postgres:17-alpine sh -c 'df -Pk / | tail -1' | awk '{print $4}') || { docker rm -f "$prefix-peer" || true; kill -TERM $$; exit 1; }
  echo "memo-disk macFreeKiB=$mac vmFreeKiB=$vm"
  (( mac >= 15728640 && vm >= 5242880 )) || { docker rm -f "$prefix-peer" || true; kill -TERM $$; exit 1; }
 done
) & watcher=$!
(sleep 600; docker rm -f "$prefix-peer" 2>/dev/null || true; kill -TERM $$) & timer=$!
git rev-parse HEAD
docker run --rm --pull never --name "$prefix-peer" --memory 1g --memory-swap 1g \
 -e DATOMIC_JAVA_OPTS='-Xms128m -Xmx768m -Dtriplex.codec.spec=/opt/replica-codec-spec.json' \
 -e TX2_ID_CACHE_ENTRIES=128 -e DATOMIC_EXT_CLASSPATH=/s5:/opt/gateway/src \
 -v "$repo/lab/experiments/EXP-DX1/s5:/s5:ro" -v "$repo/packages/datomic/gateway:/opt/gateway:ro" \
 -v "$repo/packages/datomic/src/codec-spec.json:/opt/replica-codec-spec.json:ro" \
 --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m id-memo-test
docker run --rm --pull never --name "$prefix-peer" --memory 1g --memory-swap 1g \
 -e DATOMIC_JAVA_OPTS='-Xms128m -Xmx768m -Dtriplex.codec.spec=/opt/replica-codec-spec.json' \
 -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src \
 -v "$repo/packages/datomic/gateway:/opt/gateway:ro" \
 -v "$repo/packages/datomic/src/codec-spec.json:/opt/replica-codec-spec.json:ro" \
 --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m triplex.gateway.selftest
