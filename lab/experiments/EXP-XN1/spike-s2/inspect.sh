#!/usr/bin/env bash
# [XN-S2] Why: all containers require the exclusive measurement lock, including image inspection. Rejected: inspecting concurrently with another measurement.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
out=/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
printf '{"id":"XN-S2","pid":%s}\n' "$$" > "$lock/owner.json"
cleanup() {
  docker rm -fv tx2-xns2-inspect tx2-xns2-config 2>/dev/null || true
  docker volume rm tx2-xns2-inspect-data tx2-xns2-config-data 2>/dev/null || true
  lab/experiments/EXP-DX1/vm-wake/keep-awake.sh stop
  rm "$lock/owner.json"
  rmdir "$lock"
  date -u +%FT%TZ > "$out/inspection-window-ended.txt"
}
trap cleanup EXIT
lab/experiments/EXP-DX1/vm-wake/keep-awake.sh start
printf '{"keepAwake":true,"startedAt":"%s"}\n' "$(date -u +%FT%TZ)" > "$out/inspection-window.json"
docker image inspect ghcr.io/xtdb/xtdb:2.2.0 apache/kafka:4.1.1 node:22.23.2-bookworm-slim > "$out/images.json"
docker run --rm --pull never --name tx2-xns2-inspect -v tx2-xns2-inspect-data:/var/lib/xtdb --cpuset-cpus 4-7 --memory 512m --entrypoint sh ghcr.io/xtdb/xtdb:2.2.0 -c 'pwd; ls -la; find / -iname "*kafka*" -o -iname "*xtdb*.jar" -o -iname "*yaml" 2>/dev/null; cat /usr/local/bin/xtdb 2>/dev/null || true' > "$out/image-files.txt"
# [XN-S2] Why: copy the exact shipped classpath for offline entry/registration inspection. Rejected: assuming R19's packaging claim is still current.
docker create --pull never --name tx2-xns2-inspect -v tx2-xns2-inspect-data:/var/lib/xtdb --entrypoint sh ghcr.io/xtdb/xtdb:2.2.0 -c true >/dev/null
docker cp tx2-xns2-inspect:/usr/local/lib/xtdb/xtdb.jar "$out/xtdb.jar"
docker cp tx2-xns2-inspect:/usr/local/lib/xtdb/lib "$out/lib" 2> "$out/copy-lib.log" || true
docker rm -v tx2-xns2-inspect >/dev/null
# No broker is needed to distinguish a missing YAML subtype from a broker connection failure.
docker create --pull never --name tx2-xns2-config -v tx2-xns2-config-data:/var/lib/xtdb --cpuset-cpus 0,1 --memory 3584m --memory-swap 3584m -e JDK_JAVA_OPTIONS='-Xmx2g -XX:MaxDirectMemorySize=1g' ghcr.io/xtdb/xtdb:2.2.0 -f /tmp/xns2.yaml > "$out/config-container-id.txt"
docker cp lab/experiments/EXP-XN1/spike-s2/writer.yaml tx2-xns2-config:/tmp/xns2.yaml
set +e
node -e 'const {spawnSync}=require("node:child_process");const r=spawnSync("docker",["start","-a","tx2-xns2-config"],{stdio:"inherit",timeout:90000});process.exit(r.status??124)' > "$out/kafka-config-start.log" 2>&1
printf '%s\n' "$?" > "$out/kafka-config-start.exit"
set -e
docker inspect tx2-xns2-config > "$out/config-container.json"
