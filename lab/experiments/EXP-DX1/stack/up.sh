#!/usr/bin/env bash
# [DX-H1] Why: separate peers and durable SQL storage measure the intended topology. Rejected: dev storage (single process).
set -euo pipefail
prefix=${1:?usage: up.sh PREFIX [--cpus-tx LIST] [--cpus-pg LIST] [--cpus-gw-write LIST] [--cpus-gw-read LIST] [--gateway-src DIR] [--port-write N] [--port-read N]}
shift
[[ "$prefix" =~ ^tx2-dx[a-z0-9-]+$ ]] || { echo "DX stack accepts only tx2-dx* prefixes" >&2; exit 2; }
# [DX-T1] Why: read owned startup logs through the same scoped runner, before a health deadline expires.
# Rejected: reaching an unrelated Docker context or losing the first JVM startup error behind retries.
if [[ ${1:-} == --inventory ]]; then
  export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
  docker ps -a --filter "name=^/${prefix}-" --format '{{.Names}}'
  docker volume ls --filter "name=^${prefix}-" --format '{{.Name}}'
  docker network ls --filter "name=^${prefix}-" --format '{{.Name}}'
  exit
fi
if [[ ${1:-} == --logs ]]; then
  export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
  for role in pg tx gw-w gw-r; do docker logs --tail 35 "$prefix-$role" 2>&1 || true; done
  exit
fi
tx=6 pg=6 gw_w=6 gw_r=7 port_w=8491 port_r=8492 src= publish=true spec=
# [DX-S3] Why: tune placement, heap and durable storage without changing existing callers.
# Rejected: replacing defaults globally (would change other agents' measurements).
# [orchestrator merge] Flags (DX-S3) win; DX_* environment variables (DX-H3) are the fallback; then the old defaults.
pg_mem=${DX_PG_MEMORY:-512m} tx_mem=${DX_TX_MEMORY:-3g} gw_mem=1500m tx_java="-Xms256m -Xmx${DX_TX_HEAP:-2g}" gw_java=''
# [DX-M2] Why: opt-in JVM arms preserve concurrent experiments' defaults. Rejected: changing the control globally.
tx_java=${DX_TX_JAVA_OPTS:-$tx_java}
index_threshold=${DX_INDEX_THRESHOLD:-128m} index_max=${DX_INDEX_MAX:-512m} object_cache=${DX_TX_OBJECT_CACHE:-${DX_OBJECT_CACHE:-128m}} pg_settings=''
quiet_loggers=${DX_QUIET_LOGS:-0} encrypt_channel=${DX_ENCRYPT_CHANNEL:-true} native_readback=${DX_NATIVE_SETTINGS_READBACK:-0}
[[ $quiet_loggers =~ ^[01]$ && $encrypt_channel =~ ^(true|false)$ && $native_readback =~ ^[01]$ ]] || exit 2
while (($#)); do
  case "$1" in
    --no-publish) publish=false; shift; continue;;
    --cpus-tx) tx=$2;; --cpus-pg) pg=$2;;
    --cpus-gw-write) gw_w=$2;; --cpus-gw-read) gw_r=$2;;
    --pg-memory) pg_mem=$2;; --tx-memory) tx_mem=$2;; --gw-memory) gw_mem=$2;;
    --tx-java-opts) tx_java=$2;; --gw-java-opts) gw_java=$2;;
    --memory-index-threshold) index_threshold=$2;; --memory-index-max) index_max=$2;;
    --object-cache-max) object_cache=$2;; --pg-settings) pg_settings=$2;;
    --codec-spec) spec=$2;; --gateway-src) src=$2;; --port-write) port_w=$2;; --port-read) port_r=$2;;
    *) echo "unknown option $1" >&2; exit 2;;
  esac
  shift 2
done
for cpus in "$tx" "$pg" "$gw_w" "$gw_r"; do
  [[ "$cpus" =~ ^[0-7](,[0-7])*$ || "$cpus" =~ ^[0-7]-[0-7]$ ]] || { echo "only VM CPUs 0 through 7 are allowed" >&2; exit 2; }
done
for port in "$port_w" "$port_r"; do
  [[ "$port" =~ ^[0-9]+$ && "$port" -ge 1024 && "$port" -le 65535 && "$port" != 15442 && "$port" != 17019 ]] || exit 2
done
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
evidence=${DX_STACK_EVIDENCE:-/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H1}
attempt="$evidence/$prefix"
mkdir -p "$attempt/sql" "$attempt/config" "$attempt/trace/raw"
[[ ! -e "$attempt/stack.json" ]] || { echo "use a fresh prefix; evidence already exists" >&2; exit 2; }
for role in pg tx gw-w gw-r extract; do
  if docker container inspect "$prefix-$role" >/dev/null 2>&1; then echo "container already exists: $prefix-$role" >&2; exit 2; fi
done
docker image inspect tx2-datomic:1.0.7745-da00 postgres:17-alpine >/dev/null
if [[ -z "$src" ]]; then
  src="$evidence/stage/$prefix"
  mkdir -p "$src"
  cp -R "$repo/packages/datomic/gateway/." "$src/"
  cp "$repo/packages/datomic/src/codec-spec.json" "$src/codec-spec.json"
fi
src=$(cd "$src" && pwd)
# [DX-M2] Why: a live source mount can use the tracked codec spec without a source copy.
# Rejected: adding an untracked codec file to a shared gateway source tree.
spec_mount=(); spec_java=''
if [[ -n $spec ]]; then
  spec=$(cd "$(dirname "$spec")" && pwd)/$(basename "$spec")
  spec_mount=(-v "$spec:/opt/spec/codec-spec.json:ro")
  spec_java=' -Dtriplex.codec.spec=/opt/spec/codec-spec.json'
fi
spec=${spec:-$src/codec-spec.json}
[[ -d "$src/src" && -f "$spec" ]] || { echo "gateway source needs src/ and codec-spec.json" >&2; exit 2; }
gateway_hash=$(python3 - "$src" "$attempt/gateway-files.json" "$spec" "$spec_java" <<'PY'
import pathlib,hashlib,json,sys
root=pathlib.Path(sys.argv[1])
files={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}
# [DX-M2] Why: the loaded external codec participates in source identity. Rejected: hashing only unused local codec bytes.
if sys.argv[4]: files['@loaded-codec-spec.json']=hashlib.sha256(pathlib.Path(sys.argv[3]).read_bytes()).hexdigest()
data=json.dumps(files,sort_keys=True,separators=(',',':')).encode()
pathlib.Path(sys.argv[2]).write_bytes(data)
print(hashlib.sha256(data).hexdigest())
PY
)
# Copy only from the already-local image; never start its inherited entrypoint.
docker create --name "$prefix-extract" --pull never tx2-datomic:1.0.7745-da00 >/dev/null
trap 'docker rm -f "$prefix-extract" >/dev/null 2>&1 || true' EXIT
for file in postgres-db.sql postgres-table.sql postgres-user.sql; do
  docker cp "$prefix-extract:/opt/datomic/bin/sql/$file" "$attempt/sql/$file"
done
docker cp "$prefix-extract:/opt/datomic/config/samples/sql-transactor-template.properties" "$attempt/config/template.properties"
docker cp "$prefix-extract:/opt/datomic/bin/logback.xml" "$attempt/config/vendor-logback.xml"
docker rm "$prefix-extract" >/dev/null
trap - EXIT
python3 - "$attempt/config" "$prefix" "$index_threshold" "$index_max" "$object_cache" "$encrypt_channel" <<'PY'
import pathlib,sys
root=pathlib.Path(sys.argv[1]); prefix=sys.argv[2]
settings={'protocol':'sql','host':prefix+'-tx','alt-host':prefix+'-tx',
'sql-url':'jdbc:postgresql://'+prefix+'-pg:5432/datomic','sql-user':'datomic','sql-password':'datomic',
'memory-index-threshold':sys.argv[3],'memory-index-max':sys.argv[4],'object-cache-max':sys.argv[5],'encrypt-channel':sys.argv[6]}
lines=[line for line in (root/'template.properties').read_text().splitlines() if line.partition('=')[0].strip() not in settings]
(root/'sql.properties').write_text('\n'.join(lines)+'\n'+'\n'.join(k+'='+v for k,v in settings.items())+'\n')
PY
# [DX-T1-4] Why: remove only the five synchronous per-commit INFO categories, preserving vendor appenders and unrelated logs.
# Rejected: replacing the whole logging setup or equating the extra native trace logger with default INFO.
node "$repo/lab/trace/native-settings.mjs" "$attempt/config/vendor-logback.xml" "$attempt/config/quiet-logback.xml"
# [DX-T1] Why: JFR and structured gateway records survive process shutdown on an owned run mount.
# Rejected: pulling a JDK image or exposing debugging ports on the Mac.
trace_level=${TRIPLEX_TRACE_LEVEL:-off}
trace_env=(-e "TRIPLEX_TRACE_LEVEL=$trace_level" -e "TRIPLEX_TRACE_RUN=$prefix" -e "TRIPLEX_TRACE_SLOT=$prefix" -e "TRIPLEX_TRACE_SOURCE=$(git -C "$repo" rev-parse HEAD)" -e TRIPLEX_TRACE_DIR=/trace)
trace_env+=(-e "TRIPLEX_NATIVE_SETTINGS_READBACK=$native_readback")
trace_mount=(-v "$attempt/trace/raw:/trace")
# [DX-T1-2] Why: isolate collectors with an inspected effective configuration. Rejected: inferring enabled collectors from a tag.
eval "$(node "$repo/lab/trace/components.mjs" --shell)"
trace_native_jfr=0
if [[ $TRIPLEX_TRACE_TX_JFR == 1 && ${DX_TX_NATIVE_JFR:-0} == 1 ]]; then trace_native_jfr=1;fi
trace_env+=(-e "TRIPLEX_TRACE_TX_NATIVE_JFR=$trace_native_jfr" -e "TRIPLEX_TRACE_TX_JFR=$TRIPLEX_TRACE_TX_JFR" -e "TRIPLEX_TRACE_JFR_PROFILE=${DX_JFR_PROFILE:-0}" -e "TRIPLEX_TRACE_GATEWAY=$TRIPLEX_TRACE_GATEWAY" -e "TRIPLEX_TRACE_NATIVE_LOGS=$TRIPLEX_TRACE_NATIVE_LOGS")
trace_tx_java= trace_gw_java=
if [[ $TRIPLEX_TRACE_NATIVE_LOGS == 1 ]]; then
  trace_tx_java=" -Dlogback.configurationFile=/opt/gateway/trace-logback.xml"
  trace_gw_java=" -Dlogback.configurationFile=/opt/gateway/trace-logback.xml -Ddatomic.metricsCallback=triplex.gateway.trace/metrics"
fi
if [[ $quiet_loggers == 1 ]]; then
  [[ $TRIPLEX_TRACE_NATIVE_LOGS == 0 && $trace_native_jfr == 0 ]] || { echo 'Quiet logging conflicts with native INFO/DEBUG capture' >&2; exit 2; }
  trace_tx_java+=' -Dlogback.configurationFile=/dxh1/quiet-logback.xml'
  trace_gw_java+=' -Dlogback.configurationFile=/dxh1/quiet-logback.xml'
fi
if [[ $native_readback == 1 && $TRIPLEX_TRACE_TX_JFR == 0 && $TRIPLEX_TRACE_NATIVE_LOGS == 0 ]]; then
  trace_tx_java+=' -Ddatomic.metricsCallback=triplex.gateway.native-settings/metrics'
fi
if [[ $TRIPLEX_TRACE_TX_JFR == 1 ]]; then
  trace_tx_java+=" -XX:StartFlightRecording=name=triplex,settings=/opt/gateway/trace.jfc,dumponexit=false,maxsize=0"
fi
if [[ $TRIPLEX_TRACE_TX_JFR == 1 || $TRIPLEX_TRACE_NATIVE_LOGS == 1 ]]; then
  trace_tx_java+=" -Ddatomic.metricsCallback=triplex.gateway.trace/metrics"
fi
if [[ $TRIPLEX_TRACE_POSTGRES == 1 ]]; then
  pg_settings="$pg_settings -c track_io_timing=on -c track_wal_io_timing=on -c log_min_duration_statement=0 -c log_parameter_max_length=0 -c log_parameter_max_length_on_error=0 -c log_checkpoints=on -c log_autovacuum_min_duration=0 -c log_timezone=UTC"
fi
if [[ ${TRIPLEX_TRACE_DEBUG:-0} == 1 ]]; then
  trace_tx_java="$trace_tx_java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:8505"
fi
# [DX-T1-5] Why: exercise the real installed transaction function and both layouts before a smoke stack.
# Rejected: mocking the server-clock serial point or silently skipping the gateway's normal selftests.
if [[ ${DX_GATEWAY_SELFTEST:-0} == 1 ]]; then
  docker run --rm --pull never --name "$prefix-selftest" --network none --memory 1500m --memory-swap 1500m \
    -e "DATOMIC_JAVA_OPTS=-Xms128m -Xmx1g" -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src -v "$src:/opt/gateway:ro" \
    --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m triplex.gateway.selftest > "$attempt/gateway-selftests.log" 2>&1
fi
if [[ ${DX_TRACE_TEST_GATEWAY:-0} == 1 ]]; then
  mkdir -p "$attempt/trace/preflight"
  docker run --rm --pull never --name "$prefix-trace-check" --network none --memory 768m --memory-swap 768m \
    -e TRIPLEX_TRACE_LEVEL=off -e "DATOMIC_JAVA_OPTS=-Xms128m -Xmx512m -XX:StartFlightRecording=name=triplex,settings=/opt/gateway/trace.jfc,dumponexit=false,maxsize=0" -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src -e TRIPLEX_TRACE_DIR=/test-trace -e TRIPLEX_TRACE_TEST_JFR=1 -v "$attempt/trace/preflight:/test-trace" -v "$src:/opt/gateway:ro" \
    --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m triplex.gateway.trace-test > "$attempt/gateway-trace-tests.log" 2>&1
fi
docker network create "$prefix-net" >/dev/null
docker volume create "$prefix-pg-data" >/dev/null
docker run -d --pull never --name "$prefix-pg" --network "$prefix-net" --cpuset-cpus "$pg" --memory "$pg_mem" --memory-swap "$pg_mem" \
  -e POSTGRES_PASSWORD=datomic -v "$prefix-pg-data:/var/lib/postgresql/data" postgres:17-alpine postgres $pg_settings >/dev/null
# [DX-B2-N4] Why: initdb's temporary socket server stops before the final TCP server starts.
# Rejected: socket-only pg_isready (n4b raced that shutdown during vendor SQL setup).
ready=false
for ((i=0;i<90;i++)); do
  if docker exec "$prefix-pg" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[[ $ready == true ]] || { echo "Postgres TCP startup timed out" >&2; exit 1; }
# Vendor scripts use their own database/connect statements; keep their order and bytes.
for file in postgres-db.sql postgres-table.sql postgres-user.sql; do
  db=postgres
  [[ "$file" != postgres-table.sql ]] || db=datomic
  docker exec -i "$prefix-pg" psql -v ON_ERROR_STOP=1 -U postgres -d "$db" < "$attempt/sql/$file" > "$attempt/sql/$file.log"
done
docker run -d --pull never --name "$prefix-tx" --network "$prefix-net" --cpuset-cpus "$tx" --memory "$tx_mem" --memory-swap "$tx_mem" \
  -e "JAVA_OPTS=$tx_java$trace_tx_java" -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src "${trace_env[@]}" -e "TRIPLEX_TRACE_JFR=$TRIPLEX_TRACE_TX_JFR" -e TRIPLEX_TRACE_PROCESS=tx "${trace_mount[@]}" -v "$src:/opt/gateway:ro" -v "$attempt/config:/dxh1:ro" --entrypoint /opt/datomic/bin/transactor tx2-datomic:1.0.7745-da00 /dxh1/sql.properties >/dev/null
template="datomic:sql://{db}?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic"
# A ready transactor is checked by gateway health, which creates and syncs a real SQL database.
for role in w r; do
  if [[ $role == w ]]; then cpu=$gw_w port=$port_w; else cpu=$gw_r port=$port_r; fi
  ports=(); [[ $publish == false ]] || ports=(-p "127.0.0.1:$port:8080")
  if [[ $role == w ]]; then mem=${DX_GW_WRITE_MEMORY:-$gw_mem}; heap=${DX_GW_WRITE_HEAP:-}; else mem=${DX_GW_READ_MEMORY:-$gw_mem}; heap=${DX_GW_READ_HEAP:-}; fi
  # bin/run reads DATOMIC_JAVA_OPTS, not JAVA_OPTS (DX-S3). An explicit --gw-java-opts wins; else DX_GW_*_HEAP; else the launcher default (1g).
  role_java=$gw_java; [[ -n $role_java || -z $heap ]] || role_java="-Xms256m -Xmx$heap"
  if [[ $role == w ]]; then role_java=${DX_GW_WRITE_JAVA_OPTS:-$role_java}; fi
  role_trace_java=$trace_gw_java
  if [[ $TRIPLEX_TRACE_GW_JFR == 1 ]]; then role_trace_java="$role_trace_java -XX:StartFlightRecording=name=triplex,settings=/opt/gateway/trace.jfc,dumponexit=false,maxsize=0"; fi
  if [[ ${TRIPLEX_TRACE_DEBUG:-0} == 1 ]]; then
    debug_port=8506; [[ $role == w ]] || debug_port=8507
    role_trace_java="$role_trace_java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:$debug_port"
  fi
  docker run -d --pull never --restart on-failure:10 --name "$prefix-gw-$role" --network "$prefix-net" --cpuset-cpus "$cpu" --memory "$mem" --memory-swap "$mem" \
    ${ports[@]+"${ports[@]}"} -e "JAVA_OPTS=-Xms256m -Xmx1g" "${trace_env[@]}" -e "TRIPLEX_TRACE_JFR=$TRIPLEX_TRACE_GW_JFR" -e "TRIPLEX_TRACE_PROCESS=gw-$role" "${trace_mount[@]}" -e "DATOMIC_JAVA_OPTS=${role_java}${spec_java}${role_trace_java}" -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src \
    -e "TX2_COMMIT_HINTS=${DX_COMMIT_HINTS:-false}" -e "DATOMIC_URI_TEMPLATE=$template" -e "GATEWAY_SOURCE_SHA256=$gateway_hash" \
    -v "$src:/opt/gateway:ro" -v "$attempt/config:/dxh1:ro" ${spec_mount[@]+"${spec_mount[@]}"} --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m triplex.gateway.main >/dev/null
  ok=false
  for ((i=0;i<180;i++)); do
    if [[ $publish == false ]]; then
      if docker run --rm --pull never --name "$prefix-health" --network "$prefix-net" node:22.23.2-bookworm-slim node -e "fetch('http://$prefix-gw-$role:8080/health').then(async r=>{if(!r.ok)process.exit(1); console.log(await r.text())}).catch(()=>process.exit(1))" > "$attempt/health-$role.json" 2>/dev/null; then ok=true; break; fi
    elif curl -fsS "http://127.0.0.1:$port/health" > "$attempt/health-$role.json" 2>/dev/null; then ok=true; break; fi
    sleep 1
  done
  if [[ $ok != true ]]; then docker logs "$prefix-gw-$role" > "$attempt/gateway-$role.log" 2>&1; echo "gateway $role failed; see $attempt" >&2; exit 1; fi
done
if [[ $native_readback == 1 ]]; then
  for role in tx gw-w gw-r; do
    ready=false
    for ((i=0;i<45;i++)); do
      if [[ -s $attempt/trace/raw/$role-native-settings.json ]]; then ready=true;break;fi
      sleep 1
    done
    [[ $ready == true ]] || { echo "Missing running-JVM native settings: $role" >&2;exit 1; }
    cp "$attempt/trace/raw/$role-native-settings.json" "$attempt/config/$role-native-settings.json"
  done
  docker exec "$prefix-tx" bash -c 'for f in /opt/datomic/log/*.log; do [[ ! -f $f ]] || cat "$f"; done' > "$attempt/config/tx-startup.log"
  python3 - "$attempt/config/tx-startup.log" "$encrypt_channel" <<'PY_CHANNEL'
import re,sys
seen=re.findall(r':encrypt-channel\s+(true|false)',open(sys.argv[1]).read())
assert seen and set(seen)=={sys.argv[2]}, 'Transactor startup did not confirm the requested channel mode'
PY_CHANNEL
fi
node "$repo/lab/trace/components.mjs" > "$attempt/trace-components.json"
docker exec "$prefix-pg" psql -X -At -U postgres -d datomic -c "SHOW log_min_duration_statement; SHOW track_io_timing; SHOW track_wal_io_timing;" > "$attempt/postgres-trace-settings.txt"
docker inspect "$prefix-pg" "$prefix-tx" "$prefix-gw-w" "$prefix-gw-r" > "$attempt/containers.json"
docker exec "$prefix-pg" psql -U postgres -d datomic -Atc "SHOW fsync; SHOW synchronous_commit; SHOW full_page_writes; SHOW wal_sync_method;" > "$attempt/durability.txt"
python3 - "$attempt" "$prefix" "$gateway_hash" "$port_w" "$port_r" "$publish" <<'PY'
import json,pathlib,sys,datetime
root=pathlib.Path(sys.argv[1]); rows=json.loads((root/'containers.json').read_text())
durability=dict(zip(['fsync','synchronous_commit','full_page_writes','wal_sync_method'],(root/'durability.txt').read_text().splitlines()))
assert all(durability[k]=='on' for k in ['fsync','synchronous_commit','full_page_writes'])
for role in ['w','r']:
    assert json.loads((root/('health-'+role+'.json')).read_text())['gatewaySourceHash']==sys.argv[3]
out={'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'prefix':sys.argv[2],'gatewaySourceSha256':sys.argv[3],
'containers':[{'name':r['Name'].lstrip('/'),'id':r['Id'],'imageId':r['Image'],'cpuset':r['HostConfig']['CpusetCpus'],'memory':r['HostConfig']['Memory']} for r in rows],
'durability':durability,'writeUrl':('http://'+sys.argv[2]+'-gw-w:8080') if sys.argv[6]=='false' else 'http://127.0.0.1:'+sys.argv[4],'readUrl':('http://'+sys.argv[2]+'-gw-r:8080') if sys.argv[6]=='false' else 'http://127.0.0.1:'+sys.argv[5]}
(root/'stack.json').write_text(json.dumps(out,indent=2)+'\n')
PY
if [[ $publish == false ]]; then
  printf 'DATOMIC_URL=http://%s-gw-w:8080\nDATOMIC_READ_URLS=http://%s-gw-r:8080\nEvidence: %s/stack.json\n' "$prefix" "$prefix" "$attempt"
else
  printf 'DATOMIC_URL=http://127.0.0.1:%s\nDATOMIC_READ_URLS=http://127.0.0.1:%s\nEvidence: %s/stack.json\n' "$port_w" "$port_r" "$attempt"
fi
