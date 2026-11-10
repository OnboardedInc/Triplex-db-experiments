#!/usr/bin/env bash
# [XN-S2] Why: measure the broker's idle resource floor even if XTDB lacks its Kafka module. Rejected: calling idle CPU a loaded engine cost.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
out=/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
# [XN-S2] Why: enforce the task's two-minute rest before asking for another hold. Rejected: relying on caller timing.
while ! node -e 'const fs=require("node:fs"); const p=process.argv[1]; process.exit(!fs.existsSync(p)||Date.now()-Date.parse(fs.readFileSync(p,"utf8"))>=120000?0:1)' "$out/inspection-window-ended.txt"; do sleep 5; done
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
printf '{"id":"XN-S2","pid":%s}\n' "$$" > "$lock/owner.json"
cleanup() {
  set +e
  docker logs tx2-xns2-kafka > "$out/kafka.log" 2>&1
  docker inspect tx2-xns2-kafka > "$out/kafka-container.json"
  docker rm -fv tx2-xns2-kafka >/dev/null
  docker volume rm tx2-xns2-kafka-data tx2-xns2-kafka-secrets tx2-xns2-kafka-config
  lab/experiments/EXP-DX1/vm-wake/keep-awake.sh stop
  date -u +%FT%TZ > "$out/kafka-window-ended.txt"
  rm "$lock/owner.json"
  rmdir "$lock"
}
trap cleanup EXIT
lab/experiments/EXP-DX1/vm-wake/keep-awake.sh start
date -u +%FT%TZ > "$out/kafka-window-started.txt"
docker run -d --pull never --name tx2-xns2-kafka --hostname tx2-xns2-kafka --cpuset-cpus 0 --memory 1g --memory-swap 1g \
 -v tx2-xns2-kafka-data:/var/lib/kafka/data -v tx2-xns2-kafka-secrets:/etc/kafka/secrets -v tx2-xns2-kafka-config:/mnt/shared/config \
 -e KAFKA_NODE_ID=1 -e KAFKA_PROCESS_ROLES=broker,controller \
 -e KAFKA_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093 \
 -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://tx2-xns2-kafka:9092 \
 -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
 -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@tx2-xns2-kafka:9093 \
 -e KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
 -e KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1 -e KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1 \
 -e KAFKA_LOG_DIRS=/var/lib/kafka/data -e KAFKA_HEAP_OPTS='-Xms256m -Xmx512m' \
 -e CLUSTER_ID=MkU3OEVBNTcwNTJENDM2Qk apache/kafka:4.1.1 > "$out/kafka-container-id.txt"
# Bound startup wait; no client workload or network publication.
for i in $(seq 1 45); do
  if docker logs tx2-xns2-kafka 2>&1 | grep -q 'Kafka Server started'; then break; fi
  sleep 2
done
docker logs tx2-xns2-kafka 2>&1 | grep 'Kafka Server started' > "$out/kafka-ready.txt"
# Broker CLI proves metadata service is reachable on the internal listener.
node -e 'const {spawnSync}=require("node:child_process");const r=spawnSync("docker",["exec","tx2-xns2-kafka","/opt/kafka/bin/kafka-topics.sh","--bootstrap-server","localhost:9092","--list"],{stdio:"inherit",timeout:30000});process.exit(r.status??124)' > "$out/kafka-topics.txt"
# Allow startup work to settle before the idle bracket.
sleep 15
for i in $(seq 0 6); do
  date -u +%FT%TZ > "$out/kafka-sample-$i-time.txt"
  docker exec tx2-xns2-kafka sh -c 'cat /sys/fs/cgroup/cpu.stat; cat /sys/fs/cgroup/memory.current; cat /sys/fs/cgroup/memory.peak; du -sb /var/lib/kafka/data' > "$out/kafka-sample-$i.txt"
  if [[ $i != 6 ]]; then sleep 10; fi
done
