#!/bin/bash
# [EXP-DA00] Why: separate CPU-pinned JVMs in one pool cap. Rejected: two containers (split ownership).
set -euo pipefail
cd /opt/datomic
export DATOMIC_EXT_CLASSPATH=/opt/gateway/src
if [[ "${1:-}" == selftest ]]; then
  export DATOMIC_JAVA_OPTS="-Xms512m -Xmx768m -XX:MaxMetaspaceSize=160m -XX:MaxDirectMemorySize=128m -XX:+ExitOnOutOfMemoryError -XX:+UseSerialGC -XX:+PrintFlagsFinal -Xlog:gc+init=info,cds=info:stdout:uptimemillis,level,tags"
  if [[ ${DX_JAVA:-21} == 25 ]]; then
    export DATOMIC_JAVA_OPTS="$DATOMIC_JAVA_OPTS --sun-misc-unsafe-memory-access=allow --enable-native-access=ALL-UNNAMED"
  fi
  exec bin/run -m triplex.gateway.selftest
fi
command -v taskset
mkdir -p /data/log
# [DX-JVM1] Why: retain one flag table per live JVM and distinguish multiple boots on one volume.
# Rejected: scraping an unlabelled stdout stream shared by multiple JVMs.
jvm_dir=$(mktemp -d /data/log/jvm.XXXXXXXX)
printf '%s\n' "$jvm_dir" > /run/tx2-jvm-evidence
jvm_flags='-XX:+PrintFlagsFinal -Xlog:gc+init=info,cds=info:stdout:uptimemillis,level,tags'
cp /config/transactor.properties /data/effective-transactor.properties
if [[ "${DATOMIC_PROFILE:-dev}" != dev ]]; then
  sed -i 's/memory-index-max=192m/memory-index-max=256m/;s/object-cache-max=96m/object-cache-max=192m/' /data/effective-transactor.properties
fi
# Intentional option word splitting: these strings are controlled by slots.json, never HTTP input.
taskset -c "$TX_CPUS" bin/transactor $TRANSACTOR_JAVA_OPTS $jvm_flags -Dtriplex.jvm.role=tx /data/effective-transactor.properties > >(tee "$jvm_dir/tx.log") 2>&1 &
tx=$!
gw=''
cleanup() { trap - EXIT TERM INT; [[ -z "$gw" ]] || kill "$gw" 2>/dev/null || true; kill "$tx" 2>/dev/null || true; wait "$tx" ${gw:+"$gw"} || true; }
trap cleanup EXIT TERM INT
ready=0
for ((i=0;i<180;i++)); do
  kill -0 "$tx" || exit 1
  if (exec 3<>/dev/tcp/127.0.0.1/4334) 2>/dev/null; then ready=1; break; fi
  sleep 1
done
[[ "$ready" == 1 ]] || exit 1
export DATOMIC_JAVA_OPTS="$GATEWAY_JAVA_OPTS $jvm_flags -Dtriplex.jvm.role=gw-w"
# Gateway main creates tx2-health before opening HTTP, on its own pinned CPU.
taskset -c "$GW_CPUS" bin/run -m triplex.gateway.main > >(tee "$jvm_dir/gw-w.log") 2>&1 &
gw=$!
wait -n "$tx" "$gw" || true
exit 1
