#!/usr/bin/env bash
# [DX-RD5] A second read gateway on its own machine, serving the database of a stack that runs on machine 1 with
# DX_REMOTE_READER_HOST set (stack/up.sh publishes PostgreSQL 5432 and the transactor 4334 on that private address and
# names it as the transactor's alternative host). Not a load balancer: the window driver sends odd seats here.
#
#   start: RD5_MACHINE1=<machine 1 private IP> RD5_LISTEN=<this machine's private IP> RD5_IMAGE=<the stack's image>
#          RD5_REPO=<the build checkout, the same commit as machine 1> RD5_CPUS=0-2 RD5_PERMITS=6 RD5_PREFETCH=0|1
#          RD5_READ_AHEAD_OFF=0|1 RD5_HEAP_MIB=6144 RD5_CACHE_MIB=3072 RD5_MEMORY_MIB=9216 RD5_OUT=<new directory>
#          bash second-reader.sh start
#   stop:  RD5_OUT=<the same directory> bash second-reader.sh stop
# The start waits until machine 1's PostgreSQL and transactor accept connections, starts the gateway, and prints the
# URL for DX_RD5_SECOND_READER. Addresses stay in the private evidence, never in the repository.
# [DX-XQ7] RD5_ROLE=question (default reader) starts the question reader on this machine instead: the same image and
# sizing, TX2_QUESTION_READER=1 with the ID lists and the sweep on, its own pools (RD5_SWEEP_PERMITS, default 3;
# RD5_SWEEP_PER_ACCOUNT, default 3; RD5_SWEEP_QUEUE_MS, default 5000; RD5_INDEX_QUERY_PERMITS, default 1;
# RD5_ID_LIST_QUEUE_MS, default 1000) and the clients' cursor secret (RD5_SWEEP_CURSOR_SECRET, required); it prints
# DX_QUESTION_READER_URL. Give the same RD5_ROLE to stop. The main gateways on machine 1 then need
# TX2_QUESTIONS_AT=<that URL> to refuse questions (stack/up.sh does this only for its own role q).
set -euo pipefail
role=${RD5_ROLE:-reader}
[[ $role == reader || $role == question ]] || { echo "second-reader.sh: RD5_ROLE is reader or question" >&2; exit 2; }
name=tx2-dxrd5-second-reader
[[ $role == reader ]] || name=tx2-dxrd5-question-reader
action=${1:?start or stop}
out=${RD5_OUT:?a new evidence directory}
if [[ $action == stop ]]; then
  docker logs "$name" > "$out/second-reader.log" 2>&1 || true
  docker inspect "$name" > "$out/second-reader-inspect.json" 2>/dev/null || true
  docker rm -f "$name" >/dev/null 2>&1 || true
  echo "second reader removed"
  exit 0
fi
[[ $action == start ]] || { echo "second-reader.sh: start or stop" >&2; exit 2; }
ip='^(10|172|192)\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'
[[ ${RD5_MACHINE1:?} =~ $ip && ${RD5_LISTEN:?} =~ $ip ]] || { echo "second-reader.sh: private IPv4 addresses only" >&2; exit 2; }
[[ -d ${RD5_REPO:?}/packages/datomic/gateway/src/triplex/gateway && -n ${RD5_IMAGE:?} ]] || exit 2
cpus=${RD5_CPUS:-0-2} permits=${RD5_PERMITS:-6} prefetch=${RD5_PREFETCH:-0} ahead_off=${RD5_READ_AHEAD_OFF:-0}
heap=${RD5_HEAP_MIB:-6144} cache=${RD5_CACHE_MIB:-3072} memory=${RD5_MEMORY_MIB:-9216} port=${RD5_PORT:-18492}
[[ $permits =~ ^[1-9][0-9]?$ && $prefetch =~ ^[01]$ && $ahead_off =~ ^[01]$ && $heap =~ ^[0-9]+$ && $cache =~ ^[0-9]+$ ]] || exit 2
(( cache * 2 <= heap && heap + 2048 <= memory )) || { echo "second-reader.sh: cache at most half the heap, container 2 GiB above the heap" >&2; exit 2; }
mkdir "$out"
# The gateway source staged as stack/up.sh stages it: the gateway tree and the codec specification.
mkdir "$out/gateway"; cp -R "$RD5_REPO/packages/datomic/gateway/." "$out/gateway/"
cp "$RD5_REPO/packages/datomic/src/codec-spec.json" "$out/gateway/codec-spec.json"
git -C "$RD5_REPO" rev-parse HEAD > "$out/source"
ncpu=$(( $(echo "$cpus" | tr ',' '\n' | awk -F- '{n += ($2 == "" ? 1 : $2 - $1 + 1)} END {print n}') ))
# The tuned reader's flags (v01 launch profile `gw-r`, G1, Java 21), sized to this container.
java_opts="-Xms1024m -Xmx${heap}m -XX:MaxDirectMemorySize=${heap}m -XX:+UseG1GC -XX:ActiveProcessorCount=$ncpu -XX:MaxGCPauseMillis=25
 -XX:ParallelGCThreads=$ncpu -XX:ConcGCThreads=1 -XX:+UseDynamicNumberOfGCThreads -XX:+ExitOnOutOfMemoryError -Ddatomic.objectCacheMax=${cache}m"
(( ahead_off == 0 )) || java_opts+=" -Ddatomic.readAheadPool=0"
role_env=() app=triplex-gw-r2
if [[ $role == question ]]; then
  [[ ${RD5_SWEEP_CURSOR_SECRET:-} =~ ^[A-Za-z0-9]{16,128}$ ]] || { echo "second-reader.sh: RD5_SWEEP_CURSOR_SECRET (the clients' secret) is required" >&2; exit 2; }
  sp=${RD5_SWEEP_PERMITS:-3} spa=${RD5_SWEEP_PER_ACCOUNT:-3} sq=${RD5_SWEEP_QUEUE_MS:-5000} ip=${RD5_INDEX_QUERY_PERMITS:-1} lq=${RD5_ID_LIST_QUEUE_MS:-1000}
  [[ $sp =~ ^([1-9]|1[0-6])$ && $spa =~ ^([1-9]|1[0-6])$ && $sq =~ ^[1-9][0-9]{0,3}$ && $ip =~ ^[1-9][0-9]?$ && $lq =~ ^[1-9][0-9]{0,3}$ ]] || exit 2
  role_env=(-e TX2_QUESTION_READER=1 -e TX2_ID_LISTS=1 -e TX2_SWEEP=1 -e "TX2_SWEEP_PERMITS=$sp" -e "TX2_SWEEP_PER_ACCOUNT=$spa"
    -e "TX2_SWEEP_QUEUE_MS=$sq" -e "TX2_INDEX_QUERY_PERMITS=$ip" -e "TX2_ID_LIST_QUEUE_MS=$lq" -e "TX2_SWEEP_CURSOR_SECRET=$RD5_SWEEP_CURSOR_SECRET")
  app=triplex-gw-q2
fi
for p in 5432 4334; do
  for ((i=0; i<600; i++)); do (exec 3<>"/dev/tcp/$RD5_MACHINE1/$p") 2>/dev/null && break; sleep 1; done
  (exec 3<>"/dev/tcp/$RD5_MACHINE1/$p") 2>/dev/null || { echo "second-reader.sh: machine 1 port $p not reachable" >&2; exit 1; }
done
# Round trip to machine 1 over the private link, before any load (the model prices a storage read at 0.5 ms).
ping -c 50 -i 0.2 -q "$RD5_MACHINE1" > "$out/ping.txt" 2>&1 || true
docker rm -f "$name" >/dev/null 2>&1 || true
docker run -d --pull never --name "$name" --cpuset-cpus "$cpus" --memory "${memory}m" --memory-swap "${memory}m" \
  -p "$RD5_LISTEN:$port:8080" -e "DATOMIC_JAVA_OPTS=$(echo $java_opts) -Dtriplex.codec.spec=/opt/gateway/codec-spec.json" \
  -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src \
  -e "DATOMIC_URI_TEMPLATE=datomic:sql://{db}?jdbc:postgresql://$RD5_MACHINE1:5432/datomic?user=datomic&password=datomic&ApplicationName=$app" \
  -e TX2_PINNED_SHORTCUT=1 -e TX2_PINNED_CUT_LOOKUP=1 -e TX2_READ_FILTER_EARLY=1 -e "TX2_READ_PERMITS=$permits" ${role_env[@]+"${role_env[@]}"} \
  -e "TX2_READ_PREFETCH=$prefetch" -e TRIPLEX_TRACE_LEVEL=off \
  -v "$out/gateway:/opt/gateway:ro" --entrypoint /opt/datomic/bin/run "$RD5_IMAGE" -m triplex.gateway.main >/dev/null
for ((i=0; i<180; i++)); do curl -fsS --max-time 5 "http://$RD5_LISTEN:$port/health" > "$out/health.json" 2>/dev/null && break; sleep 1; done
curl -fsS --max-time 5 "http://$RD5_LISTEN:$port/health" > "$out/health.json" || { docker logs "$name" > "$out/second-reader.log" 2>&1; exit 1; }
# CPU and memory of the reader every 5 s, until the container is removed (machine 2 keeps no trace of its own).
nohup bash -c 'while docker inspect -f "{{.State.Running}}" '"$name"' 2>/dev/null | grep -q true; do
  echo "$(date +%s) $(docker stats --no-stream --format "{{.CPUPerc}} {{.MemUsage}}" '"$name"')"; sleep 5; done' >> "$out/stats.txt" 2>&1 &
printf '{"cpus":"%s","permits":%s,"prefetch":%s,"readAheadOff":%s,"heapMiB":%s,"cacheMiB":%s,"memoryMiB":%s}\n' \
  "$cpus" "$permits" "$prefetch" "$ahead_off" "$heap" "$cache" "$memory" > "$out/second-reader.json"
if [[ $role == question ]]; then echo "DX_QUESTION_READER_URL=http://$RD5_LISTEN:$port"; else echo "DX_RD5_SECOND_READER=http://$RD5_LISTEN:$port"; fi
