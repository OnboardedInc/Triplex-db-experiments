#!/usr/bin/env bash
# [DX-H1] Why: separate peers and durable SQL storage measure the intended topology. Rejected: dev storage (single process).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/platform.sh"
prefix=${1:?usage: up.sh PREFIX [--cpus-tx LIST] [--cpus-pg LIST] [--cpus-gw-write LIST] [--cpus-gw-read LIST] [--gateway-src DIR] [--port-write N] [--port-read N]}
shift
[[ "$prefix" =~ ^tx2-dx[a-z0-9-]+$ ]] || { echo "DX stack accepts only tx2-dx* prefixes" >&2; exit 2; }
# [DX-T1] Why: read owned startup logs through the same scoped runner, before a health deadline expires.
# Rejected: reaching an unrelated Docker context or losing the first JVM startup error behind retries.
if [[ ${1:-} == --inventory ]]; then
  docker ps -a --filter "name=^/${prefix}-" --format '{{.Names}}'
  docker volume ls --filter "name=^${prefix}-" --format '{{.Name}}'
  docker network ls --filter "name=^${prefix}-" --format '{{.Name}}'
  exit
fi
if [[ ${1:-} == --logs ]]; then
  for role in pg tx gw-w gw-r; do docker logs --tail 35 "$prefix-$role" 2>&1 || true; done
  exit
fi
# [DX-T1-14] Why: distinguish a guest-global OOM from an owned cgroup limit using the kernel's exact boot and container identity.
# Rejected: infer the victim from RSS, clear the ring buffer, enable tracing, or grant a helper access while another stack runs.
if [[ ${1:-} == --kernel-log ]];then
  [[ $prefix == tx2-dxt1-* && $# == 2 && $2 =~ ^[a-f0-9-]{36}$ ]] || exit 2
  expected_boot=$2
  python3 - "$DX_LAB_ROOT/locks/measure/owner.json" "$prefix" <<'KERNEL_LEASE'
import json,os,sys
r=json.load(open(sys.argv[1]));assert r['id']=='DX-T1' and r['prefix']==sys.argv[2] and r['kind']=='diagnostics';os.kill(r['pid'],0)
KERNEL_LEASE
  [[ -z $(docker ps -q) ]] || { echo 'Kernel collection requires all containers stopped' >&2;exit 2; }
  trap 'docker rm -f "$prefix-kernel" >/dev/null 2>&1 || true' EXIT
  trap 'exit 143' TERM INT
  docker run --rm --pull never --read-only --name "$prefix-kernel" --ulimit core=0 --network none \
    --memory 64m --memory-swap 64m --cap-drop ALL --cap-add SYSLOG --entrypoint /bin/sh postgres:17-alpine \
    -c 'actual=$(cat /proc/sys/kernel/random/boot_id);test "$actual" = "$1" || exit 2;printf "boot_id=%s\n" "$actual";cat /proc/uptime;dmesg' sh "$expected_boot"
  exit
fi
# [DX-T1-14] Why: virtiofs can retain an unlinked crash file until its guest dentry is revalidated.
# Rejected: restart the VM, flush global caches, or truncate a file without its verified private archive.
if [[ ${1:-} == --revalidate-core ]];then
  [[ $prefix == tx2-dxt1-* && $# == 2 ]] || exit 2
  artifact=$2
  python3 - "$DX_LAB_ROOT/locks/measure/owner.json" "$prefix" "$artifact" "$DX_EVIDENCE_ROOT/DX-T1" <<'CORE_LEASE'
import json,pathlib,os,sys
lease=json.load(open(sys.argv[1]));assert lease['id']=='DX-T1' and lease['prefix']==sys.argv[2] and lease['kind']=='cleanup';os.kill(lease['pid'],0)
p=pathlib.Path(sys.argv[3]).resolve();assert p.is_relative_to(pathlib.Path(sys.argv[4]).resolve())
r=json.loads((p/'CORE.json').read_text());assert r['originalSha256']==r['roundTripSha256'] and (p/'writer-incomplete.core.zst').is_file()
CORE_LEASE
  repo=$(cd "$(dirname "$0")/../../../.." && pwd)
  reclaim=${DX_CORE_RECLAIM_INODES:-0};[[ $reclaim == 0 || $reclaim == 1 ]] || exit 2
  privilege=()
  if [[ $reclaim == 1 ]];then
    # [DX-T1-14] Why: an unlinked owned core can stay open through an unused virtiofs inode after all its containers stop.
    # Rejected: drop file-data caches, stop a shared resident, or restart/reconfigure the VM.
    [[ -z $(docker ps -q) ]] || { echo 'Inode reclaim requires all containers stopped' >&2;exit 2; }
    privilege=(--privileged)
  fi
  trap 'docker rm -f "$prefix-core-cache" >/dev/null 2>&1 || true' EXIT
  docker run --rm --pull never --name "$prefix-core-cache" --ulimit core=0 --network none --memory 64m --memory-swap 64m "${privilege[@]}" \
    -v "$repo:$repo:ro" -v "$artifact:$artifact:ro" node:22.23.2-bookworm-slim node -e '
const fs=require("fs");if(process.argv[1]==="1"){if(fs.readFileSync("/proc/sys/kernel/random/boot_id","utf8").trim()!==process.argv[2])throw Error("Guest identity changed");fs.writeFileSync("/proc/sys/vm/drop_caches","2\n");console.log(JSON.stringify({operation:"unused inode/dentry reclaim",bootId:process.argv[2]}));}for(const p of process.argv.slice(3)){try{const s=fs.statSync(p);console.log(JSON.stringify({name:p.split("/").at(-1),exists:true,bytes:s.size,links:s.nlink}));}catch(e){if(e.code!=="ENOENT")throw e;console.log(JSON.stringify({name:p.split("/").at(-1),exists:false}));}}' "$reclaim" "${DX_CORE_GUEST_BOOT_ID:-}" "$repo/core" "$artifact/writer-incomplete.core"
  exit
fi
# [DX-T1-12] Why: the authorized eight-versus-six trial must change guest CPUs only under this holder's live lease and restore all eight before releasing it.
# Rejected: invoking COLD's helper (foreign names/holder), restarting the VM, or leaving a partial offline transition after failure.
if [[ ${1:-} == --guest-cpus ]]; then
  [[ $prefix == tx2-dxt1-* && ( ${2:-} == eight || ${2:-} == six || ${2:-} == show ) ]] || exit 2
  mode=$2
  python3 - "$DX_LAB_ROOT/locks/measure/owner.json" "${DX_R3_PAIR_LEASE_PID:?}" "$mode" <<'CPU_LEASE'
import json,sys,os,shutil
o=json.load(open(sys.argv[1]));assert o['id']=='DX-T1' and o['pid']==int(sys.argv[2]) and o['kind']=='writer-arms'
os.kill(o['pid'],0)
if sys.argv[3]=='six':assert shutil.disk_usage('.').free>=15*1024**3
CPU_LEASE
  # [DX-T1-12] Why: global CPU changes must not interfere with a running unrelated engine; stopped foreign residents are left alone.
  # Rejected: using the measurement lease as proof that every other container is idle.
  if [[ $mode == six ]]; then
    [[ -z $(docker ps -q) ]] || { echo 'CPU transition requires all measured stacks to be stopped' >&2; exit 2; }
  fi
  trap 'docker rm -f "$prefix-cpu-control" >/dev/null 2>&1 || true' EXIT
  trap 'exit 143' TERM INT
  docker run --rm --pull never --privileged --network none --memory 64m --memory-swap 64m \
    --label tx2.holder=DX-T1 --name "$prefix-cpu-control" node:22.23.2-bookworm-slim node -e '
const fs=require("fs"),mode=process.argv[1],base="/sys/devices/system/cpu/",read=n=>fs.readFileSync(base+n,"utf8").trim();
if(read("present")!=="0-7")throw Error("Expected exactly eight present guest CPUs");
if(!fs.readFileSync("/proc/cmdline","utf8").split(/\s+/).includes("nohlt"))throw Error("Guest nohlt is required");
const before=read("online"),set=(n,on)=>fs.writeFileSync(base+"cpu"+n+"/online",on?"1\n":"0\n");
try {
 if(mode==="six"){if(before!=="0-7")throw Error("Six-CPU transition must start with eight online");set(7,false);set(6,false);}
 if(mode==="eight")for(let n=1;n<8;n++)if(fs.readFileSync(base+"cpu"+n+"/online","utf8").trim()!=="1")set(n,true);
 const after=read("online");if(mode!=="show"&&after!==(mode==="six"?"0-5":"0-7"))throw Error("CPU readback differs");
 console.log(JSON.stringify({mode,before,after,present:read("present"),nohlt:true,at:Date.now()}));
}catch(error){for(let n=1;n<8;n++)try{set(n,true);}catch{};throw error;}' "$mode"
  exit
fi
# [DX-T1-11] Why: run original SQL/retry classes with fake SQL under a verified lease, with no database or durability changes.
# Rejected: the menu's asynchronous-INSERT trigger (a Postgres-only failure can lose a referenced chunk).
if [[ ${1:-} == --sql-pair-probe ]]; then
  [[ $prefix == tx2-dxt1-* ]] || exit 2
  python3 - "$DX_LAB_ROOT/locks/measure/owner.json" "${DX_R3_PAIR_LEASE_PID:?}" <<'PAIR_LEASE'
import json,sys
o=json.load(open(sys.argv[1]));assert o['id']=='DX-T1' and o['pid']==int(sys.argv[2]) and o['kind']=='writer-arms'
PAIR_LEASE
  trap 'docker rm -f "$prefix-probe" >/dev/null 2>&1 || true' EXIT
  trap 'exit 143' TERM INT
  docker run --rm --pull never --name "$prefix-probe" --network none --memory 768m --memory-swap 768m --cpuset-cpus 0 \
    -e 'DATOMIC_JAVA_OPTS=-Xms64m -Xmx512m' -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src \
    -e "TRIPLEX_TRACE_RUN=$prefix" -e "TRIPLEX_TRACE_SOURCE=$(git rev-parse HEAD)" \
    -v "$PWD/packages/datomic/gateway:/opt/gateway:ro" --entrypoint /opt/datomic/bin/run \
    tx2-datomic:1.0.7745-da00 -m triplex.gateway.sql-pair-probe
  exit
fi
# [DX-T1-11] Why: size the sealed seed read-only before admitting a clone; disk headroom is an observed limit.
# Rejected: start Postgres on the sealed volume or assume a large clone fits from an old free-space figure.
if [[ ${1:-} == --seed-size ]]; then
  [[ $prefix == tx2-dxt1-* && ${2:-} == tx2-dxs5-seed-100000-pg-data ]] || exit 2
  python3 - "$DX_LAB_ROOT/locks/measure/owner.json" "${DX_R3_PAIR_LEASE_PID:?}" <<'SEED_LEASE'
import json,sys,shutil
o=json.load(open(sys.argv[1]));assert o['id']=='DX-T1' and o['pid']==int(sys.argv[2]) and o['kind']=='writer-arms'
assert shutil.disk_usage('.').free>=15*1024**3
SEED_LEASE
  [[ -z $(docker ps -q --filter "volume=$2") ]] || exit 2
  trap 'docker rm -f "$prefix-probe" >/dev/null 2>&1 || true' EXIT
  trap 'exit 143' TERM INT
  docker create --pull never --name "$prefix-probe" --network none --read-only --memory 64m --memory-swap 64m \
    -v "$2:/data:ro" node:22.23.2-bookworm-slim sh -c 'du -sk /data; du -sk --apparent-size /data' >/dev/null
  docker inspect "$prefix-probe" >&2
  docker start -a "$prefix-probe"
  exit
fi
# [DX-T1-11] Why: check original EDN claim/row identities in the pinned runtime with only read-only input mounts.
# Rejected: infer non-row metadata equivalence from the replay's row-delta check.
if [[ ${1:-} == --layout-input-audit ]]; then
  [[ $prefix == tx2-dxt1-* && -f ${2:-} ]] || exit 2
  python3 - "$DX_LAB_ROOT/locks/measure/owner.json" "${DX_R3_PAIR_LEASE_PID:?}" <<'INPUT_LEASE'
import json,sys,shutil
o=json.load(open(sys.argv[1]));assert o['id']=='DX-T1' and o['pid']==int(sys.argv[2]) and o['kind']=='writer-arms'
assert shutil.disk_usage('.').free>=15*1024**3
INPUT_LEASE
  trap 'docker rm -f "$prefix-probe" >/dev/null 2>&1 || true' EXIT
  trap 'exit 143' TERM INT
  input_dir=$(cd "$(dirname "$2")" && pwd)
  docker run --rm --pull never --name "$prefix-probe" --network none --read-only --memory 768m --memory-swap 768m \
    --tmpfs /tmp:rw,size=64m -e 'DATOMIC_JAVA_OPTS=-Xms64m -Xmx512m -Dtriplex.codec.spec=/opt/spec/codec-spec.json' \
    -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src -e "TRIPLEX_TRACE_RUN=$prefix" -e "TRIPLEX_TRACE_SOURCE=$(git rev-parse HEAD)" \
    -v "$input_dir:/inputs:ro" -v "$PWD/packages/datomic/gateway:/opt/gateway:ro" \
    -v "$PWD/packages/datomic/src/codec-spec.json:/opt/spec/codec-spec.json:ro" --entrypoint /opt/datomic/bin/run \
    tx2-datomic:1.0.7745-da00 -m triplex.gateway.layout-input-audit "/inputs/$(basename "$2")"
  exit
fi
tx=6 pg=6 gw_w=6 gw_r=7 port_w=8491 port_r=8492 src= publish=true spec= seed_volume=
if [[ ${DX_INT1_GATEWAYS:-original} == demand ]]; then
  # [DX-THIN1] Why: apply the same peer limits on ordinary stack launches and the physical queue. Rejected: tuning only the Mac diagnostic container.
  demand_peer='-Ddatomic.objectCacheMax=32m -XX:MinHeapFreeRatio=15 -XX:MaxHeapFreeRatio=30 -XX:-ShrinkHeapInSteps'
  DX_GW_WRITE_ENTITY_CACHE_BYTES=${DX_GW_WRITE_ENTITY_CACHE_BYTES:-8388608}
  DX_GW_READ_ENTITY_CACHE_BYTES=${DX_GW_READ_ENTITY_CACHE_BYTES:-8388608}
  DX_ID_CACHE_BYTES=${DX_ID_CACHE_BYTES:-1048576}
  DX_ID_CACHE_ENTRIES=${DX_ID_CACHE_ENTRIES:-4096}
  DX_GW_SESSION_ENTRIES=${DX_GW_SESSION_ENTRIES:-4096}
  DX_INDEX_THRESHOLD=${DX_INDEX_THRESHOLD:-8m}
  DX_INDEX_MAX=${DX_INDEX_MAX:-32m}
fi
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
    --clone-seed) seed_volume=$2;;
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
if [[ ${DX_BARE_METAL:-0} == 1 ]]; then
  # [DX-BM1] Why: the native read gateway spans cores 4 and 8. Check each requested CPU against this host's actual allocation.
  # Rejected: carrying the eight-CPU Mac VM limit onto the 12-core bench, or allowing unavailable native CPUs.
  python3 - "$tx" "$pg" "$gw_w" "$gw_r" <<'NATIVE_CPUS'
import os,re,sys
allowed=os.sched_getaffinity(0)
for group in sys.argv[1:]:
    cpus=set()
    for part in group.split(','):
        assert re.fullmatch(r'[0-9]+(?:-[0-9]+)?',part), 'invalid CPU range'
        limits=[int(v) for v in part.split('-')]
        first,last=limits[0],limits[-1]
        assert first<=last<=max(allowed), 'unavailable CPU range'
        members=set(range(first,last+1))
        assert members<=allowed and members.isdisjoint(cpus), 'unavailable or duplicate CPU'
        cpus.update(members)
NATIVE_CPUS
else
  for cpus in "$tx" "$pg" "$gw_w" "$gw_r"; do
    [[ "$cpus" =~ ^[0-7](,[0-7])*$ || "$cpus" =~ ^[0-7]-[0-7]$ ]] || { echo "only VM CPUs 0 through 7 are allowed" >&2; exit 2; }
  done
fi
for port in "$port_w" "$port_r"; do
  [[ "$port" =~ ^[0-9]+$ && "$port" -ge 1024 && "$port" -le 65535 && "$port" != 15442 && "$port" != 17019 ]] || exit 2
done
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
network_tuning=()
if [[ ${DX_IDLE_TCP:-default} != default ]]; then
  # [DX-T1-10] Why: test slow-start-after-idle only in this attempt's endpoint namespaces, leaving guest/global settings alone.
  # Rejected: mutate the VM's global TCP setting or carry diagnostic tuning into a verdict by default.
  [[ $prefix == tx2-dxt1-* && $DX_IDLE_TCP == 0 ]] || exit 2
  network_tuning=(--sysctl net.ipv4.tcp_slow_start_after_idle=0)
fi
evidence=${DX_STACK_EVIDENCE:-$DX_EVIDENCE_ROOT/DX-H1}
attempt="$evidence/$prefix"
mkdir -p "$attempt/sql" "$attempt/config" "$attempt/trace/raw"
[[ ! -e "$attempt/stack.json" ]] || { echo "use a fresh prefix; evidence already exists" >&2; exit 2; }
# [DX-BM1] Why: separate only WAL from the root data volume under the same durability settings.
# Rejected: relocating the database or changing synchronous_commit (either would confound the WAL A/B).
wal_mount=()
if [[ -n ${DX_BM1_WAL_MOUNT:-} ]]; then
  [[ ${DX_BARE_METAL:-0} == 1 && $prefix =~ ^tx2-dxt1-bm1-[a-z0-9]+-wal-ssd$ && $publish == false && -z $seed_volume ]]
  [[ $(findmnt -nro SOURCE --mountpoint "$DX_BM1_WAL_MOUNT") == /dev/nvme1n1 ]]
  wal_dir=$DX_BM1_WAL_MOUNT/$prefix
  mkdir -m 0700 "$wal_dir"
  wal_mount=(-e POSTGRES_INITDB_WALDIR=/wal --mount "type=bind,source=$wal_dir,target=/wal")
fi
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
# [DX-W1] Why: named gateway options give both measured arms the same native queue timestamp.
# Rejected: changing the default image or enabling diagnostics for earlier studies.
if [[ -n ${DX_GROUP_COMMIT:-} ]]; then
  [[ $DX_GROUP_COMMIT =~ ^[01]$ && ${DX_GROUP_QUEUE_CLOCK:-0} =~ ^[01]$ ]] || exit 2
  trace_env+=(-e "TX2_GROUP_COMMIT=$DX_GROUP_COMMIT" -e "TX2_GROUP_QUEUE_CLOCK=${DX_GROUP_QUEUE_CLOCK:-0}")
fi
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
  # [DX-T1-6] Why: the binary native appender detaches file appenders itself; quiet logging must remain on in a native profile.
  # Rejected: restoring synchronous vendor file logging while measuring the transactor's counters.
  [[ $TRIPLEX_TRACE_NATIVE_LOGS == 0 ]] || { echo 'Quiet logging conflicts with native file capture' >&2; exit 2; }
  trace_tx_java+=' -Dlogback.configurationFile=/dxh1/quiet-logback.xml'
  trace_gw_java+=' -Dlogback.configurationFile=/dxh1/quiet-logback.xml'
fi
if [[ $native_readback == 1 && $TRIPLEX_TRACE_TX_JFR == 0 && $TRIPLEX_TRACE_NATIVE_LOGS == 0 && $TRIPLEX_TRACE_GATEWAY == 0 ]]; then
  trace_tx_java+=' -Ddatomic.metricsCallback=triplex.gateway.native-settings/metrics'
fi
if [[ $TRIPLEX_TRACE_TX_JFR == 1 ]]; then
  trace_tx_java+=" -XX:StartFlightRecording=name=triplex,settings=/opt/gateway/trace.jfc,dumponexit=false,maxsize=0"
fi
if [[ $TRIPLEX_TRACE_TX_JFR == 1 || $TRIPLEX_TRACE_NATIVE_LOGS == 1 || $TRIPLEX_TRACE_GATEWAY == 1 ]]; then
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
# [DX-T1-14] Why: activation uses a byte-verified fresh clone under the holder's lease; a sealed source is never writable.
# Rejected: S5's old first-use/reuse fallback, incomplete copies, or attaching a transactor directly to a sealed seed.
if [[ $seed_volume == bm1-pristine-* ]]; then
  [[ ${DX_BARE_METAL:-0} == 1 && $seed_volume == bm1-pristine-"${DX_BM1_PRISTINE_BATCH:?}" ]] || exit 2
  python3 lab/experiments/EXP-DX1/bm1/pristine-seed.py clone "$DX_BM1_PRISTINE_BATCH" "$prefix" "$attempt"
elif [[ -n $seed_volume ]];then
  [[ $prefix == tx2-dxt1-* ]] || exit 2
  case $seed_volume in
    tx2-dxh5-seed-1000-pg-data|tx2-dxh8-seed-10000-pg-data|tx2-dxs5-seed-100000-pg-data) ;;
    tx2-dxt1-bm1-20261118d-activation-pg-data)
      [[ ${DX_BARE_METAL:-0} == 1 && ${DX_BM1_RETAINED_SEED:-0} == 1 &&
         $prefix == tx2-dxt1-bm1-* && -s $attempt/seed-origin.json ]] || exit 2
      ;;
    *) exit 2 ;;
  esac
  python3 - "$DX_LAB_ROOT/locks/measure/owner.json" "$prefix" <<'CLONE_LEASE'
import json,os,sys
r=json.load(open(sys.argv[1]));assert r['id']=='DX-T1' and r['kind']=='activation' and r['prefix']==sys.argv[2];os.kill(r['pid'],0)
CLONE_LEASE
  docker volume inspect "$seed_volume" > "$attempt/seed-source-volume.json"
  [[ -z $(docker ps -q --filter "volume=$seed_volume") ]] || { echo 'Seed source is active' >&2;exit 2; }
  if docker volume inspect "$prefix-pg-data" >/dev/null 2>&1;then echo 'Refusing an existing clone destination' >&2;exit 2;fi
  docker volume create "$prefix-pg-data" >/dev/null
  docker create --pull never --name "$prefix-seed-copy" --read-only --network none --memory 128m --memory-swap 128m \
    -v "$seed_volume:/from:ro" -v "$prefix-pg-data:/to" --entrypoint /bin/sh postgres:17-alpine -eu -c '
      test "$(cat /from/PG_VERSION)" = 17
      test -z "$(find /from -type l -print)"
      cp -a /from/. /to/
      cd /from; find . -type f -exec sha256sum {} \; > /to/.clone-sha256
      cd /to; sha256sum -c .clone-sha256; rm .clone-sha256
      # This is the verified private copy. The original is mounted read-only.
      if [ "$1" = 1 ]; then rm -f postmaster.pid; fi
    ' sh "${DX_BM1_RETAINED_SEED:-0}" >/dev/null
  trap 'docker rm -f "$prefix-seed-copy" >/dev/null 2>&1 || true' EXIT
  docker inspect "$prefix-seed-copy" > "$attempt/seed-clone-container.json"
  python3 - "$attempt/seed-clone-container.json" "$seed_volume" "$prefix" <<'CLONE_MOUNTS'
import json,sys
r=json.load(open(sys.argv[1]))[0];m={x['Destination']:x for x in r['Mounts']}
assert m['/from']['Name']==sys.argv[2] and m['/from']['RW'] is False
assert m['/to']['Name']==sys.argv[3]+'-pg-data' and m['/to']['RW'] is True
CLONE_MOUNTS
  docker start -a "$prefix-seed-copy" > "$attempt/seed-clone-verified.sha256.log"
  [[ $(docker inspect --format '{{.State.ExitCode}}' "$prefix-seed-copy") == 0 ]] || exit 1
  docker rm "$prefix-seed-copy" >/dev/null
  trap - EXIT
else
  docker volume create "$prefix-pg-data" >/dev/null
fi
docker run -d --pull never --name "$prefix-pg" --network "$prefix-net" ${network_tuning[@]+"${network_tuning[@]}"} --cpuset-cpus "$pg" --memory "$pg_mem" --memory-swap "$pg_mem" \
  -e POSTGRES_PASSWORD=datomic -v "$prefix-pg-data:/var/lib/postgresql/data" ${wal_mount[@]+"${wal_mount[@]}"} postgres:17-alpine postgres $pg_settings >/dev/null
# [DX-B2-N4] Why: initdb's temporary socket server stops before the final TCP server starts.
# Rejected: socket-only pg_isready (n4b raced that shutdown during vendor SQL setup).
ready=false
for ((i=0;i<90;i++)); do
  if docker exec "$prefix-pg" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[[ $ready == true ]] || { echo "Postgres TCP startup timed out" >&2; exit 1; }
if [[ ${DX_BM1_WAL_AB:-0} == 1 ]]; then
  [[ ${DX_BARE_METAL:-0} == 1 && $prefix =~ ^tx2-dxt1-bm1-[a-z0-9]+-wal-(root|ssd)$ ]]
  docker exec "$prefix-pg" sh -ceu '
    data=$(psql -X -Atq -U postgres -c "SHOW data_directory")
    wal=$(readlink -f "$data/pg_wal")
    if [ "$1" = ssd ]; then
      test "$wal" = /wal
      test "$(stat -c %d "$data")" != "$(stat -c %d "$wal")"
    else
      test "$wal" = "$data/pg_wal"
    fi
    printf "data=%s wal=%s\n" "$data" "$wal"
    df -P "$data" "$wal"
  ' sh "${wal_dir:+ssd}" > "$attempt/wal-placement.txt"
fi
# Vendor scripts use their own database/connect statements; keep their order and bytes.
if [[ -z $seed_volume ]];then
for file in postgres-db.sql postgres-table.sql postgres-user.sql; do
  db=postgres
  [[ "$file" != postgres-table.sql ]] || db=datomic
  docker exec -i "$prefix-pg" psql -v ON_ERROR_STOP=1 -U postgres -d "$db" < "$attempt/sql/$file" > "$attempt/sql/$file.log"
done
fi
# [DX-JVM1] Why: emit the real JVM's final flags and GC startup identity to its own container log.
# Rejected: a second JVM running outside the live cgroup or inferring collector from affinity.
final_flags=''
if [[ ${DX_JVM_EVIDENCE:-0} == 1 ]]; then
  final_flags=' -XX:+PrintFlagsFinal -Xlog:gc+init=info:stdout:uptimemillis,level,tags'
fi
docker run -d --pull never --name "$prefix-tx" --network "$prefix-net" ${network_tuning[@]+"${network_tuning[@]}"} --cpuset-cpus "$tx" --memory "$tx_mem" --memory-swap "$tx_mem" \
  -e "JAVA_OPTS=$tx_java$trace_tx_java$final_flags" -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src "${trace_env[@]}" -e "TRIPLEX_TRACE_JFR=$TRIPLEX_TRACE_TX_JFR" -e TRIPLEX_TRACE_PROCESS=tx "${trace_mount[@]}" -v "$src:/opt/gateway:ro" -v "$attempt/config:/dxh1:ro" --entrypoint /opt/datomic/bin/transactor tx2-datomic:1.0.7745-da00 /dxh1/sql.properties >/dev/null
template="datomic:sql://{db}?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic"
# [DX-BM1] Why: avoid probing catalog creation before the SQL transactor announces startup.
# Rejected: treating an early location read failure as a missing database, or unbounded health fetches.
if [[ ${DX_STACK_WAIT_FOR_TRANSACTOR:-0} == 1 ]]; then
  start_deadline=$((SECONDS + 120))
  while (( SECONDS < start_deadline )); do
    docker logs "$prefix-tx" > "$attempt/tx-startup-wait.log" 2>&1
    if grep -Fx 'System started' "$attempt/tx-startup-wait.log" >/dev/null; then break; fi
    [[ $(docker inspect --format '{{.State.Running}}' "$prefix-tx") == true ]] || exit 1
    sleep 1
  done
  grep -Fx 'System started' "$attempt/tx-startup-wait.log" >/dev/null ||
    { echo "Transactor startup timed out; see $attempt/tx-startup-wait.log" >&2; exit 1; }
fi
# A ready transactor is checked by gateway health, which creates and syncs a real SQL database.
for role in w r; do
  # [DX-W1] Why: bootstrap is finished on the other peer before the single authoritative writer admits live traffic.
  # Rejected: allowing a large labeled import through the live writer's frame cap during measurement.
  field_policy=()
  if [[ -n ${DX_LIVE_PRIORITY:-} ]]; then
    [[ $DX_LIVE_PRIORITY =~ ^[01]$ && ${DX_FIELD_COALESCE:-0} =~ ^[01]$ ]] || exit 2
    if [[ $role == w ]]; then field_policy=(-e "TX2_LIVE_PRIORITY=$DX_LIVE_PRIORITY" -e "TX2_FIELD_COALESCE=${DX_FIELD_COALESCE:-0}"); fi
  fi
  if [[ $role == w && ${DX_W1_EXTRA:-0} == 1 ]]; then
    [[ ${DX_SMALL_ROWS:-0} =~ ^[01]$ && ${DX_GROUP_REUSE_PREPARED:-0} =~ ^[01]$ && ${DX_GROUP_MAX_MEMBERS:-8} =~ ^[1-9][0-9]{0,2}$ ]] || exit 2
    field_policy+=(-e "TX2_GROUP_STAGE_CLOCK=1" -e "TX2_SMALL_ROWS=${DX_SMALL_ROWS:-0}" -e "TX2_GROUP_REUSE_PREPARED=${DX_GROUP_REUSE_PREPARED:-0}" -e "TX2_GROUP_MAX_MEMBERS=${DX_GROUP_MAX_MEMBERS:-8}")
    for pair in "TX2_PREDECESSOR_LOOKUP=${DX_W1_PREDECESSOR:-0}" "TX2_SAVE_LEDGER=${DX_W1_LEDGER:-0}" \
                "TX2_PACKED_JOURNAL=${DX_W1_PACKED_JOURNAL:-0}" "TX2_GROUP_FAST_REPLY=${DX_W1_FAST_REPLY:-0}"; do
      [[ ${pair#*=} =~ ^[01]$ ]] || exit 2
      field_policy+=(-e "$pair")
    done
    if [[ -n ${DX_WRITE_BUDGET_US:-} ]]; then
      [[ $DX_WRITE_BUDGET_US =~ ^[1-9][0-9]{0,5}$ ]] || exit 2
      field_policy+=(-e "TX2_WRITE_BUDGET_US=$DX_WRITE_BUDGET_US")
    fi
  fi
  if [[ $role == w && ${DX_INT1_NATIVE_WRITE_READBACK:-0} == 1 ]]; then
    [[ ${DX_PREDECESSOR_LOOKUP:-0} =~ ^[01]$ ]] || exit 2
    field_policy+=(-e "TX2_INT1_WRITE_READBACK=1" -e "TX2_PREDECESSOR_LOOKUP=${DX_PREDECESSOR_LOOKUP:-0}")
  fi
  if [[ $role == w ]]; then cpu=$gw_w port=$port_w; else cpu=$gw_r port=$port_r; fi
  ports=(); [[ $publish == false ]] || ports=(-p "127.0.0.1:$port:8080")
  if [[ $role == w ]]; then mem=${DX_GW_WRITE_MEMORY:-$gw_mem}; heap=${DX_GW_WRITE_HEAP:-}; else mem=${DX_GW_READ_MEMORY:-$gw_mem}; heap=${DX_GW_READ_HEAP:-}; fi
  # bin/run reads DATOMIC_JAVA_OPTS, not JAVA_OPTS (DX-S3). An explicit --gw-java-opts wins; else DX_GW_*_HEAP; else the launcher default (1g).
  role_java=$gw_java
  if [[ -z $role_java && ${DX_INT1_GATEWAYS:-original} == demand ]]; then role_java="-Xms64m -Xmx${heap:-384m} $demand_peer"
  elif [[ -z $role_java && -n $heap ]]; then role_java="-Xms256m -Xmx$heap"; fi
  if [[ $role == w ]]; then role_java=${DX_GW_WRITE_JAVA_OPTS:-$role_java}; fi
  if [[ $role == r ]]; then role_java=${DX_GW_READ_JAVA_OPTS:-$role_java}; fi
  entity_cache_bytes=${DX_GW_READ_ENTITY_CACHE_BYTES:-268435456}
  [[ $role != w ]] || entity_cache_bytes=${DX_GW_WRITE_ENTITY_CACHE_BYTES:-268435456}
  role_trace_java=$trace_gw_java
  if [[ $TRIPLEX_TRACE_GW_JFR == 1 ]]; then role_trace_java="$role_trace_java -XX:StartFlightRecording=name=triplex,settings=/opt/gateway/trace.jfc,dumponexit=false,maxsize=0"; fi
  if [[ ${TRIPLEX_TRACE_DEBUG:-0} == 1 ]]; then
    debug_port=8506; [[ $role == w ]] || debug_port=8507
    role_trace_java="$role_trace_java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:$debug_port"
  fi
  docker run -d --pull never --restart on-failure:10 --name "$prefix-gw-$role" --network "$prefix-net" ${network_tuning[@]+"${network_tuning[@]}"} --cpuset-cpus "$cpu" --memory "$mem" --memory-swap "$mem" \
    ${ports[@]+"${ports[@]}"} -e "JAVA_OPTS=-Xms256m -Xmx1g" "${trace_env[@]}" ${field_policy[@]+"${field_policy[@]}"} -e "TRIPLEX_TRACE_JFR=$TRIPLEX_TRACE_GW_JFR" -e "TRIPLEX_TRACE_PROCESS=gw-$role" "${trace_mount[@]}" -e "DATOMIC_JAVA_OPTS=${role_java}${spec_java}${role_trace_java}${final_flags}" -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src \
    -e "TRIPLEX_LAYOUT_REPLAY=$([[ $role == w ]] && echo ${DX_LAYOUT_REPLAY:-0} || echo 0)" -e "TX2_SLIM_ROWS=${DX_SLIM_ROWS:-0}" -e "TX2_REV_AEVT=${DX_REV_AEVT:-0}" -e "TX2_COMMIT_HINTS=${DX_COMMIT_HINTS:-false}" -e "DATOMIC_URI_TEMPLATE=$template" -e "GATEWAY_SOURCE_SHA256=$gateway_hash" \
    -e "TX2_ENTITY_CACHE_BYTES=$entity_cache_bytes" -e "TX2_ID_CACHE_ENTRIES=${DX_ID_CACHE_ENTRIES:-2097152}" -e "TX2_ID_CACHE_BYTES=${DX_ID_CACHE_BYTES:-536870912}" \
    -e "TX2_REACH_SESSION_ENTRIES=${DX_GW_SESSION_ENTRIES:-1000000}" \
    -v "$src:/opt/gateway:ro" -v "$attempt/config:/dxh1:ro" ${spec_mount[@]+"${spec_mount[@]}"} --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m triplex.gateway.main >/dev/null
  ok=false
  health_deadline=$((SECONDS + 180))
  while (( SECONDS < health_deadline )); do
    if [[ $publish == false ]]; then
      if docker run --rm --pull never --name "$prefix-health" --network "$prefix-net" node:22.23.2-bookworm-slim node -e "fetch('http://$prefix-gw-$role:8080/health',{signal:AbortSignal.timeout(5000)}).then(async r=>{if(!r.ok)process.exit(1); console.log(await r.text())}).catch(()=>process.exit(1))" > "$attempt/health-$role.json" 2>/dev/null; then ok=true; break; fi
    elif curl -fsS --max-time 5 "http://127.0.0.1:$port/health" > "$attempt/health-$role.json" 2>/dev/null; then ok=true; break; fi
    sleep 1
  done
  if [[ $ok != true ]]; then docker logs "$prefix-gw-$role" > "$attempt/gateway-$role.log" 2>&1; echo "gateway $role failed; see $attempt" >&2; exit 1; fi
done
if [[ -n $final_flags ]]; then
  for role in tx gw-w gw-r; do
    bash "$repo/lab/experiments/EXP-DX1/jvm1/readback.sh" "$prefix-$role" "$attempt/config" "$role"
  done
fi
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
for role in pg tx gw-w gw-r; do docker exec "$prefix-$role" cat /proc/sys/net/ipv4/tcp_slow_start_after_idle > "$attempt/tcp-idle-$role.txt"; done
if [[ ${DX_IDLE_SENTINEL:-0} == 1 ]]; then
  [[ $prefix == tx2-dxt1-* ]] || exit 2
  docker volume create --label "triplex.owner=$prefix" "$prefix-idle-disk" >/dev/null
  docker run -d --pull never --name "$prefix-idle-sentinel" --network none --cpuset-cpus 4 --memory 128m --memory-swap 128m \
    -e "TRIPLEX_TRACE_RUN=$prefix" -e "TRIPLEX_TRACE_SLOT=$prefix" -e "TRIPLEX_TRACE_SOURCE=$(git -C "$repo" rev-parse HEAD)" \
    -v "$prefix-idle-disk:/probe" -v "$attempt/trace/raw:/trace" -v "$repo/lab/trace/idle-sentinel.mjs:/sentinel.mjs:ro" \
    node:22.23.2-bookworm-slim node /sentinel.mjs >/dev/null
  docker inspect "$prefix-idle-sentinel" > "$attempt/idle-sentinel-container.json"
  docker exec "$prefix-idle-sentinel" sh -c 'df -k /probe; findmnt -T /probe -o SOURCE,FSTYPE,TARGET' > "$attempt/idle-sentinel-mount.txt"
fi
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
