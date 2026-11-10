#!/usr/bin/env bash
# [XN-S2-PG] Why: distinguish Postgres source remotes from log factories with shipped bytecode and fresh parser failures. Rejected: launching a Postgres server before proving a log implementation exists.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
out=/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/postgres-log
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
printf '{"id":"XN-S2","pid":%s}\n' "$$" > "$lock/owner.json"
awake=
cleanup() {
  set +e
  docker rm -fv tx2-xns2-pg-bytecode tx2-xns2-pg-parse
  docker volume rm tx2-xns2-pg-bytecode-data tx2-xns2-pg-bytecode-config tx2-xns2-pg-bytecode-secrets tx2-xns2-pg-parse-data
  # [XN-S2-PG] Why: an already-running keeper belongs to another holder. Rejected: unconditional stop from the earlier task's policy.
  if [[ $awake == started\ * ]]; then lab/experiments/EXP-DX1/vm-wake/keep-awake.sh stop > "$out/keep-awake-stop.txt"; fi
  date -u +%FT%TZ > "$out/window-ended.txt"
  rm "$lock/owner.json"
  rmdir "$lock"
}
trap cleanup EXIT
awake=$(lab/experiments/EXP-DX1/vm-wake/keep-awake.sh start)
printf '%s\n' "$awake" > "$out/keep-awake-start.txt"
date -u +%FT%TZ > "$out/window-started.txt"
cp "$lock/owner.json" "$out/lock-owner.json"
docker image inspect ghcr.io/xtdb/xtdb:2.2.0 apache/kafka:4.1.1 postgres:17-alpine > "$out/images.json"
# The local Kafka image supplies a JDK; its broker is never started.
docker create --pull never --name tx2-xns2-pg-bytecode --cpuset-cpus 4-7 --memory 512m \
 -v tx2-xns2-pg-bytecode-data:/var/lib/kafka/data -v tx2-xns2-pg-bytecode-config:/mnt/shared/config -v tx2-xns2-pg-bytecode-secrets:/etc/kafka/secrets \
 --entrypoint sh apache/kafka:4.1.1 -c 'command -v javap; javap -version; javap -p -c -cp /tmp/xtdb.jar '\''xtdb.postgres.PostgresRemote$Factory'\'' '\''xtdb.postgres.PostgresRemote$Factory$$serializer'\'' '\''xtdb.postgres.PostgresRemote'\'' '\''xtdb.postgres.PostgresSource$Factory'\'' '\''xtdb.postgres.PostgresSource$Factory$$serializer'\'' '\''xtdb.api.log.Log$Factory$Companion'\'' '\''xtdb.api.storage.Storage$Factory$Companion'\''' > "$out/bytecode-container-id.txt"
docker cp /Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/xtdb.jar tx2-xns2-pg-bytecode:/tmp/xtdb.jar
node -e 'const {spawnSync}=require("node:child_process");const r=spawnSync("docker",["start","-a","tx2-xns2-pg-bytecode"],{stdio:"inherit",timeout:90000});process.exit(r.status??124)' > "$out/javap.txt" 2>&1
docker inspect tx2-xns2-pg-bytecode > "$out/bytecode-container.json"
docker rm -v tx2-xns2-pg-bytecode >/dev/null
for name in log-types storage-types remote-fields postgres-log object-store-types; do
 docker create --pull never --name tx2-xns2-pg-parse -v tx2-xns2-pg-parse-data:/var/lib/xtdb --cpuset-cpus 0,1 --memory 3584m --memory-swap 3584m \
  -e JDK_JAVA_OPTIONS='-Xmx2g -XX:MaxDirectMemorySize=1g' ghcr.io/xtdb/xtdb:2.2.0 -f /tmp/probe.yaml > "$out/$name-container-id.txt"
 docker cp "lab/experiments/EXP-XN1/spike-s2/postgres-config/$name.yaml" tx2-xns2-pg-parse:/tmp/probe.yaml
 set +e
 node -e 'const {spawnSync}=require("node:child_process");const r=spawnSync("docker",["start","-a","tx2-xns2-pg-parse"],{stdio:"inherit",timeout:60000});process.exit(r.status??124)' > "$out/$name.log" 2>&1
 printf '%s\n' "$?" > "$out/$name.exit"
 set -e
 docker inspect tx2-xns2-pg-parse > "$out/$name-container.json"
 docker rm -fv tx2-xns2-pg-parse >/dev/null
done
