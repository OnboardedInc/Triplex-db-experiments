#!/usr/bin/env bash
# [DX-H1] Why: separate peers and durable SQL storage measure the intended topology. Rejected: dev storage (single process).
set -euo pipefail
# [DX-INT1] Why: name the guard that refused a launch (ha1/first-offer-dry-run.sh reads this line); output only.
# [DX-REAL2] The same trap: a refused guard printed nothing, so a server launch stopped with an empty start.log.
trap 'echo "DX-STACK refused at lab/experiments/EXP-DX1/stack/up.sh:$LINENO: $BASH_COMMAND" >&2' ERR
source "$(dirname "${BASH_SOURCE[0]}")/platform.sh"
prefix=${1:?usage: up.sh PREFIX [--cpus-tx LIST] [--cpus-pg LIST] [--cpus-gw-write LIST] [--cpus-gw-read LIST] [--gateway-src DIR] [--port-write N] [--port-read N]}
shift
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
runtime_tool="$repo/lab/config/datomic/runtime.mjs"
jvm_tool="$repo/lab/experiments/EXP-DX1/jvm1/launch.mjs"
final_flags=' -XX:+PrintFlagsFinal -Xlog:gc+init=info,cds=info:stdout:uptimemillis,level,tags'
probe_options() {
  node "$jvm_tool" gw-w 1 "$1 $final_flags $(node "$runtime_tool" compatibility)" serial
}
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
    -e "DATOMIC_JAVA_OPTS=$(probe_options '-Xms64m -Xmx512m')" -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src \
    -e "TRIPLEX_TRACE_RUN=$prefix" -e "TRIPLEX_TRACE_SOURCE=$(git rev-parse HEAD)" \
    -v "$PWD/packages/datomic/gateway:/opt/gateway:ro" --entrypoint /opt/datomic/bin/run \
    "$(node "$runtime_tool" image)" -m triplex.gateway.sql-pair-probe
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
    --tmpfs /tmp:rw,size=64m -e "DATOMIC_JAVA_OPTS=$(probe_options '-Xms64m -Xmx512m -Dtriplex.codec.spec=/opt/spec/codec-spec.json')" \
    -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src -e "TRIPLEX_TRACE_RUN=$prefix" -e "TRIPLEX_TRACE_SOURCE=$(git rev-parse HEAD)" \
    -v "$input_dir:/inputs:ro" -v "$PWD/packages/datomic/gateway:/opt/gateway:ro" \
    -v "$PWD/packages/datomic/src/codec-spec.json:/opt/spec/codec-spec.json:ro" --entrypoint /opt/datomic/bin/run \
    "$(node "$runtime_tool" image)" -m triplex.gateway.layout-input-audit "/inputs/$(basename "$2")"
  exit
fi
tx=6 pg=6 gw_w=5,6 gw_r=7 port_w=8491 port_r=8492 src= publish=true spec= seed_volume= wal_dir= prepared_pg= restored_pgdata= demo_pg=
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
pgdata=${DX_V01_PGDATA:-}
# [DX-M2] Why: opt-in JVM arms preserve concurrent experiments' defaults. Rejected: changing the control globally.
tx_java=${DX_TX_JAVA_OPTS:-$tx_java}
index_threshold=${DX_INDEX_THRESHOLD:-128m} index_max=${DX_INDEX_MAX:-512m} object_cache=${DX_TX_OBJECT_CACHE:-${DX_OBJECT_CACHE:-128m}} pg_settings='' pg_data=''
quiet_loggers=${DX_QUIET_LOGS:-0} encrypt_channel=${DX_ENCRYPT_CHANNEL:-true} native_readback=${DX_NATIVE_SETTINGS_READBACK:-0}
[[ $quiet_loggers =~ ^[01]$ && $encrypt_channel =~ ^(true|false)$ && $native_readback =~ ^[01]$ ]] || exit 2
while (($#)); do
  case "$1" in
    --no-publish) publish=false; shift; continue;;
    --clone-seed) seed_volume=$2;;
    --pg-data) pg_data=$2;;
    --demo-pgdata) demo_pg=$2;;
    --real1-pgdata) restored_pgdata=$2;;
    --wal-directory) wal_dir=$2;;
    --prepared-pgdata) prepared_pg=$2;;
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
# [DX-REAL1] Why: only the dedicated server runner can bind its newly verified copy.
# Rejected: a writable bind of the originally held PostgreSQL tree.
if [[ -n $restored_pgdata ]]; then
  [[ ${DX_BARE_METAL:-0} == 1 && $prefix == tx2-dxreal1-* && -z $seed_volume && -z $wal_dir && -z $pg_data && -z $prepared_pg ]]
  [[ $(realpath -e "$restored_pgdata") == "$restored_pgdata" && -f $restored_pgdata/PG_VERSION ]]
  [[ -f $restored_pgdata/../real1-copy.json && ! -e $restored_pgdata/postmaster.pid ]]
  [[ $restored_pgdata != *','* && $restored_pgdata != *'"'* ]]
fi
# [DX-DEMO1] Why: the owner's demo opens a stopped working copy of a sealed cluster (a host directory on the server,
# a lab VM volume for the toy) with loopback-only gateways and the native log and query routes on.
# Rejected: reusing the removal, scorecard or prepared-copy paths (each is bound to its own runner and guards).
if [[ -n $demo_pg ]]; then
  [[ $prefix =~ ^tx2-dxdemo1-[a-z0-9-]+$ && $publish == true && -z $seed_volume && -z $wal_dir && -z $prepared_pg &&
     -z $restored_pgdata && -z $pg_data && -z ${DX_V01_PGDATA:-} && -z ${DX_JVM1_COLD_PGDATA:-} && -z ${DX_PREP1_DUMP:-} &&
     -z ${DX_JVM1_PG_RESTORE:-} && -z ${DX_BM1_WAL_MOUNT:-} && ${DX_PREP1_SERVER:-0} == 0 ]] || exit 2
  if [[ $demo_pg == /* ]]; then
    [[ ${DX_BARE_METAL:-0} == 1 && $(realpath -e "$demo_pg") == "$demo_pg" && $demo_pg != *[,\"$'\n']* &&
       $(cat "$demo_pg/PG_VERSION") == 17 && ! -e $demo_pg/postmaster.pid && -z $(find "$demo_pg" -type l -print -quit) ]] || exit 2
  else
    [[ $demo_pg =~ ^tx2-dxdemo1-[a-z0-9-]+-work$ ]] && docker volume inspect "$demo_pg" >/dev/null || exit 2
    [[ -z $(docker ps -aq --filter "volume=$demo_pg") ]] || { echo 'Demo working copy is in use' >&2; exit 2; }
  fi
fi
# bin/run reads DATOMIC_JAVA_OPTS. Preserve precedence across the common and per-role options.
peer_java() {
  local heap=$1 override=$2 options=$gw_java
  if [[ -z $options && ${DX_INT1_GATEWAYS:-original} == demand ]]; then
    options="-Xms64m -Xmx${heap:-384m} $demand_peer"
  elif [[ -z $options && -n $heap ]]; then
    options="-Xms256m -Xmx$heap"
  fi
  printf '%s' "${override:-$options}"
}
gw_w_java=$(peer_java "${DX_GW_WRITE_HEAP:-}" "${DX_GW_WRITE_JAVA_OPTS:-}")
gw_r_java=$(peer_java "${DX_GW_READ_HEAP:-}" "${DX_GW_READ_JAVA_OPTS:-}")
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
prepw=${DX_PREP1_WRITERS:-1}
subject_save=${TX2_SUBJECT_SAVE:-0}
subject_numeric_owner=${TX2_SUBJECT_NUMERIC_OWNER:-0}
subject_prefetch=${TX2_SUBJECT_PREFETCH:-0}
subject_ordered_ids=${TX2_SUBJECT_ORDERED_IDS:-0}
append_retirement=${TX2_SUBJECT_APPEND_RETIREMENT:-0}
subject_owner_head=${TX2_SUBJECT_OWNER_HEAD:-0}
[[ $subject_owner_head =~ ^[01]$ ]] || exit 2
subject_narrow_revision=${TX2_SUBJECT_NARROW_REVISION:-0}
subject_reuse_predecessor=${TX2_SUBJECT_REUSE_PREDECESSOR:-0}
lookup_every=${PREP1_LOOKUP_EVERY:-0}
# [DX-W3] Why: default-off general-writer hints, a bound on reads waiting for a permit, and web-thread counters.
# Rejected: passing them when unset (every default stack stays byte-identical in its container environment).
general_prefetch=${TX2_GENERAL_PREFETCH:-0}
[[ $general_prefetch =~ ^[01]$ ]] || exit 2
read_wait_limit=${DX_READ_WAIT_LIMIT:-}
[[ -z $read_wait_limit || $read_wait_limit =~ ^[1-9][0-9]{0,3}$ ]] || exit 2
thread_counters=${DX_THREAD_COUNTERS:-0}
[[ $thread_counters =~ ^[01]$ ]] || exit 2
# [DX-W4] Why: default-off hints for the per-subject writer that work with ordered IDs.
# Rejected: lifting the TX2_SUBJECT_PREFETCH guard below (that option keeps its meaning); passing it when unset.
subject_hints=${TX2_SUBJECT_HINTS:-0}
[[ $subject_hints =~ ^[01]$ ]] || exit 2
[[ $subject_hints == 0 || $subject_prefetch == 0 ]] || { echo "TX2_SUBJECT_HINTS replaces TX2_SUBJECT_PREFETCH; set one" >&2; exit 2; }
# [DX-S1] Why: default-off wide saves on the per-subject writer (W2), for one commit per subject's save.
# Rejected: passing it when unset (every default stack stays byte-identical in its container environment).
subject_wide=${TX2_SUBJECT_WIDE:-0}
[[ $subject_wide =~ ^[01]$ ]] || exit 2
[[ $lookup_every =~ ^(0|[1-9][0-9]{0,3})$ ]] && (( lookup_every <= 4096 )) || exit 2
if [[ ${DX_PREP1_SERVER:-0} == 1 ]]; then
  [[ ${DX_BARE_METAL:-0} == 1 && $prepw =~ ^(1|2|4)$ ]]
  # [DX-V01] Why: the scorecard uses the same selected writer on private bridge endpoints.
  # Rejected: publishing ports solely to select the integrated per-person writer.
  [[ ( $prefix == tx2-dxprep1-* && $publish == true ) ||
     ( ${DX_V01_ADOPTED_STACK:-0} == 1 && $publish == false && $prepw == 1 &&
       ( $prefix == tx2-dxscale1-v01-* || ( $prefix == tx2-dxscale1-removal-* && -n $pg_data ) ||
         ( $prefix == tx2-dxscale1-publish-* && -n $prepared_pg ) ) ) ]]
  [[ ${DX_PREP1_SUBJECT:-0} =~ ^[01]$ && -z $seed_volume ]]
  (( port_w + prepw - 1 < port_r ))
  [[ -z ${DX_PREP1_DUMP:-} || -f $DX_PREP1_DUMP ]]
  subject_save=${DX_PREP1_SUBJECT:-0}
else
  [[ $prepw == 1 && -z ${DX_PREP1_DUMP:-} ]]
fi
[[ $subject_save =~ ^[01]$ && $subject_numeric_owner =~ ^[01]$ ]]
[[ $subject_numeric_owner == 0 || $subject_save == 1 ]]
[[ $append_retirement =~ ^[01]$ && ( $append_retirement == 0 || $subject_numeric_owner == 1 ) ]] || exit 2
[[ $subject_prefetch =~ ^[01]$ && ( $subject_prefetch == 0 || $subject_save == 1 ) ]]
[[ $subject_ordered_ids =~ ^[01]$ && ( $subject_ordered_ids == 0 || ( $subject_save == 1 && $subject_prefetch == 0 ) ) ]]
[[ $subject_hints == 0 || $subject_save == 1 ]] || { echo "TX2_SUBJECT_HINTS needs the per-subject writer" >&2; exit 2; }
[[ $subject_wide == 0 || $subject_save == 1 ]] || { echo "TX2_SUBJECT_WIDE needs the per-subject writer" >&2; exit 2; }
[[ $subject_narrow_revision =~ ^[01]$ && $subject_reuse_predecessor =~ ^[01]$ ]] || exit 2
[[ ( $subject_narrow_revision == 0 && $subject_reuse_predecessor == 0 ) || ( $subject_ordered_ids == 1 && $subject_numeric_owner == 1 ) ]] || exit 2
prep_pgdata=${DX_PREP1_PGDATA:-}
prep_wal=${DX_PREP1_SCALE_WAL_DIR:-}
if [[ -n $prep_pgdata ]]; then
  # [DX-REAL2] The production-shaped arms (prodR, prodS, prodS-394, each with or without -cache32) are prepared copies too.
  [[ $prefix =~ ^tx2-dxprep1-[a-f0-9]{8}-1-(ceiling|scale-(base|cache|wal-zgc)|barrier6|rolling(6|8|12|16)|rolling6(-tx5)?(-cache32)?|fresh(-zgc)?(6|12)|prod(r|s)(-394)?(-cache32)?)-s$ ]] ||
    { echo "DX-STACK refused: $prefix is not an allowed prepared-copy slot name" >&2; exit 2; }
  [[ ${DX_BARE_METAL:-0} == 1 && ${DX_PREP1_SERVER:-0} == 1 && ${DX_PREP1_CAMPAIGN:-} =~ ^(ceiling|scale|rolling)$ &&
     -d $prep_pgdata && $prep_pgdata == /* &&
     $prep_pgdata != *[,\"$'\n']* && -z $seed_volume && -z ${DX_PREP1_DUMP:-} && -z ${DX_JVM1_PG_RESTORE:-} &&
     -z ${DX_BM1_WAL_MOUNT:-} && ${DX_BM1_WAL_AB:-0} == 0 ]]
  [[ ${DX_PREP1_SEED_SHA:?} =~ ^[a-f0-9]{64}$ && ${DX_WRITE_OPTIONS_ATTEMPT:?} =~ ^[a-f0-9-]{36}$ ]]
fi
if [[ ( ${DX_PREP1_CAMPAIGN:-} == scale && $prefix == *-scale-wal-zgc-s ) || ${DX_PREP1_CAMPAIGN:-} == rolling ]]; then
  [[ -n $prep_pgdata && $prep_wal == /* && $prep_wal != *[,\"$'\n']* && ${prep_wal##*/} == "$prefix" &&
     -d $prep_wal && ! -L $prep_wal &&
     $(findmnt -nro SOURCE --mountpoint "$(dirname "$prep_wal")") == "${DX_PREP1_ROLLING_WAL_DEVICE:-/dev/nvme1n1}" ]]
else
  [[ -z $prep_wal ]]
fi
stack_labels=()
tx_java=$(node "$jvm_tool" tx "$tx" "$tx_java")
gw_w_java=$(node "$jvm_tool" gw-w "$gw_w" "$gw_w_java")
gw_r_java=$(node "$jvm_tool" gw-r "$gw_r" "$gw_r_java")
peer_major=$(node "$runtime_tool" major)
tx_major=${DX_TX_JAVA:-$peer_major}
write_major=${DX_GW_WRITE_JAVA:-$peer_major}
if [[ ${DX_PREP1_TAIL_TX_ZGC:-0} == 1 ]]; then
  [[ ${DX_BARE_METAL:-0} == 1 && $peer_major == 21 && ${DX_PREP1_SERVER:-0} == 1 &&
     ( $prefix =~ -tail-(zgc|combined)-s$ || ($prefix == *-scale-wal-zgc-s && -n $prep_wal) ) ]]
  tx_major=25
fi
peer_image=$(node "$runtime_tool" image)
role_image() {
  if [[ $1 == "$peer_major" ]]; then
    printf '%s' "$peer_image"
  else
    [[ ${DX_BARE_METAL:-0} == 1 && -z ${DX_DATOMIC_IMAGE_RECEIPT:-} ]] || return 1
    DX_JAVA="$1" node "$runtime_tool" image
  fi
}
tx_image=$(role_image "$tx_major")
write_image=$(role_image "$write_major")
tx_java="$tx_java $(DX_JAVA="$tx_major" node "$runtime_tool" compatibility)"
peer_compatibility=$(node "$runtime_tool" compatibility)
gw_w_java="$gw_w_java $(DX_JAVA="$write_major" node "$runtime_tool" compatibility)"
gw_r_java="$gw_r_java $peer_compatibility"
if [[ -n ${DX_TAIL1_ATTEMPT:-} ]]; then
  # [DX-TAIL1] Why: bind the owned stack to the reservation and reject name reuse at cleanup.
  # Rejected: inferring ownership from the slot number alone.
  [[ $prefix == tx2-dxscale1-tail1-* && $DX_TAIL1_ATTEMPT =~ ^[a-f0-9-]{36}$ ]]
  [[ $DX_TAIL1_IMAGE =~ ^sha256:[a-f0-9]{64}$ ]]
  [[ $tx_major == "$peer_major" && $write_major == "$peer_major" ]]
  tx_image=$DX_TAIL1_IMAGE peer_image=$DX_TAIL1_IMAGE write_image=$DX_TAIL1_IMAGE
  [[ ${DX_TAIL1_HOLDER:-DX-TAIL1} =~ ^DX-(TAIL1|JVM1|THIN1)$ ]]
  stack_labels=(--label "tx2.holder=${DX_TAIL1_HOLDER:-DX-TAIL1}" --label "tx2.tail1=$DX_TAIL1_ATTEMPT")
fi
network_tuning=()
if [[ ${DX_IDLE_TCP:-default} != default ]]; then
  # [DX-T1-10] Why: test slow-start-after-idle only in this attempt's endpoint namespaces, leaving guest/global settings alone.
  # Rejected: mutate the VM's global TCP setting or carry diagnostic tuning into a verdict by default.
  [[ $prefix == tx2-dxt1-* && $DX_IDLE_TCP == 0 ]] || exit 2
  network_tuning=(--sysctl net.ipv4.tcp_slow_start_after_idle=0)
fi
evidence=${DX_STACK_EVIDENCE:-$DX_EVIDENCE_ROOT/DX-H1}
attempt="$evidence/$prefix"
if [[ -n ${DX_LAUNCH_PROFILE:-} ]]; then
  mkdir -p "$evidence"
  mkdir "$attempt"
fi
mkdir -p "$attempt/sql" "$attempt/config" "$attempt/trace/raw"
[[ ! -e "$attempt/stack.json" ]] || { echo "use a fresh prefix; evidence already exists" >&2; exit 2; }
cold_pgdata=${DX_JVM1_COLD_PGDATA:-}
if [[ -n $cold_pgdata ]]; then
  [[ ${DX_BARE_METAL:-0} == 1 && $prefix =~ ^tx2-dxscale1-v01-cold-[a-f0-9]{12}$ &&
     $publish == false && -z $seed_volume && -z $prepared_pg && -z $pg_data && -z $restored_pgdata && -z ${DX_PREP1_DUMP:-} && -z ${DX_JVM1_PG_RESTORE:-} &&
     -n $wal_dir && $cold_pgdata == /* && $cold_pgdata != *[,\"$'\n']* && -d $cold_pgdata &&
     $cold_pgdata == "$(realpath -e "$cold_pgdata")" && $DX_JVM1_COLD_CONTROL =~ ^[a-f0-9]{64}$ ]] || exit 2
fi
# [DX-BM1] Why: separate only WAL from the root data volume under the same durability settings.
# Rejected: relocating the database or changing synchronous_commit (either would confound the WAL A/B).
wal_mount=()
pg_mount=(-v "$prefix-pg-data:/var/lib/postgresql/data")
if [[ -n $prepared_pg ]]; then
  # [DX-ACT1] Why: mount only the exclusive, stopped copy after the server launcher checks its original template.
  # Rejected: restoring the logical dump or ever attaching the held template to PostgreSQL.
  [[ ${DX_BARE_METAL:-0} == 1 && $prefix =~ ^tx2-dxscale1-publish-[a-f0-9]+$ &&
      $publish == false && -z $seed_volume && -n $wal_dir && $prepared_pg == "$(realpath -e "$prepared_pg")" &&
      $prepared_pg != *[,\"$'\n']* && $(cat "$prepared_pg/PG_VERSION") == 17 &&
      ! -e $prepared_pg/postmaster.pid && $(readlink "$prepared_pg/pg_wal") == /wal ]]
  pg_mount=(--mount "type=bind,source=$prepared_pg,target=/var/lib/postgresql/data")
fi
# [DX-PREP1] Why: PREP1's stopped-copy campaigns bind their own owned WAL directory.
# Rejected: combining it with the launcher's --wal-dir or BM1's WAL mount in one stack.
if [[ -n $prep_wal ]]; then
  [[ -z $wal_dir && -z $prepared_pg ]] || exit 2
  wal_mount=(--mount "type=bind,source=$prep_wal,target=/wal")
fi
if [[ -n ${DX_BM1_WAL_MOUNT:-} ]]; then
  [[ -z $wal_dir ]]
  [[ ${DX_BARE_METAL:-0} == 1 && $prefix =~ ^tx2-dxt1-bm1-[a-z0-9]+-wal-ssd$ && $publish == false && -z $seed_volume ]]
  [[ $(findmnt -nro SOURCE --mountpoint "$DX_BM1_WAL_MOUNT") == /dev/nvme1n1 ]]
  wal_dir=$DX_BM1_WAL_MOUNT/$prefix
  mkdir -m 0700 "$wal_dir"
fi
if [[ -n $wal_dir ]]; then
  # [DX-INT1] Why: verify the empty owned bind and the actual Docker data filesystem before creating a service.
  # Rejected: inferring WAL separation from the directory name or from the host root filesystem.
  [[ ${DX_BARE_METAL:-0} == 1 && -z $seed_volume ]] || exit 2
  if [[ -n $pgdata ]]; then
    data_location=$pgdata
  elif [[ -n $prepared_pg ]]; then
    data_location=$prepared_pg
  else
    docker_root=$(docker info --format '{{.DockerRootDir}}') || exit 2
    data_location=$docker_root/volumes
  fi
  wal_real=$(realpath -e "$wal_dir") || exit 2
  wal_device=$(stat -c %d "$wal_real") || exit 2
  data_device=$(stat -c %d "$data_location") || exit 2
  wal_entries=$(find "$wal_real" -mindepth 1 -maxdepth 1 -print -quit) || exit 2
  if [[ $wal_dir != "$wal_real" || $wal_dir == *[,\"$'\n']* || ! -d $wal_dir ||
        ( -z $prepared_pg && -n $wal_entries ) || ( -n $prepared_pg && -z $wal_entries ) ||
        ! $wal_device =~ ^[0-9]+$ || ! $data_device =~ ^[0-9]+$ || $wal_device == "$data_device" ]]; then
    echo 'WAL needs an empty directory on a filesystem distinct from PostgreSQL data' >&2
    exit 2
  fi
  wal_mount=(-e POSTGRES_INITDB_WALDIR=/wal --mount "type=bind,source=$wal_dir,target=/wal")
fi
if [[ ${DX_PREP1_CAMPAIGN:-} =~ ^tail(-combined)?$ ]]; then
  [[ ${DX_BARE_METAL:-0} == 1 && $prefix =~ ^tx2-dxprep1-[a-f0-9]{8}-1-tail-(control|wal|zgc|fair|combined)-s$ && -z $seed_volume && ${DX_PREP1_SERVER:-0} == 1 ]]
  [[ -z ${DX_BM1_WAL_MOUNT:-} && ${DX_BM1_WAL_AB:-0} == 0 ]]
  if [[ $prefix =~ -tail-(wal|combined)-s$ ]]; then
    [[ $(findmnt -nro SOURCE --mountpoint "${DX_PREP1_TAIL_WAL_MOUNT:?}") == /dev/nvme1n1 ]]
    wal_dir=$DX_PREP1_TAIL_WAL_MOUNT/$prefix
    [[ -d $wal_dir && ! -L $wal_dir && -z $(ls -A "$wal_dir") ]]
    wal_mount=(-e POSTGRES_INITDB_WALDIR=/wal --mount "type=bind,source=$wal_dir,target=/wal")
  else
    [[ -z ${DX_PREP1_TAIL_WAL_MOUNT:-} ]]
  fi
fi
for role in pg tx gw-w gw-r extract; do
  if docker container inspect "$prefix-$role" >/dev/null 2>&1; then echo "container already exists: $prefix-$role" >&2; exit 2; fi
done
# [DX-JVM1] Why: bind each role to an immutable image and the promised Temurin release before starting it.
# Rejected: trusting a mutable tag or filling a Java 25 run from the Java 21 image.
pin_image() {
  local major=$1 tag=$2 file=$3 meta id image_major image_base image_hash
  meta=$(docker image inspect --format '{{.Id}}|{{index .Config.Labels "tx2.java-major"}}|{{index .Config.Labels "tx2.java-base"}}|{{index .Config.Labels "tx2.build-inputs-sha256"}}' "$tag")
  IFS='|' read -r id image_major image_base image_hash <<< "$meta"
  [[ $id =~ ^sha256:[a-f0-9]{64}$ ]] || return 1
  if [[ $major != 21 || -n $image_major && $image_major != '<no value>' ]]; then
    [[ $image_major == "$major" && $image_base == "$(DX_JAVA="$major" node "$runtime_tool" base)" ]] || return 1
  fi
  if [[ -n ${DX_DATOMIC_IMAGE_RECEIPT:-} ]]; then
    [[ $image_hash == "$(DX_JAVA="$major" node "$runtime_tool" input-hash)" ]] || return 1
  fi
  printf '%s\n' "$meta" > "$file"
  printf '%s' "$id"
}
datomic_image=$(pin_image "$peer_major" "$peer_image" "$attempt/config/java-image.txt")
pin_role() {
  if [[ $1 == "$peer_major" && $2 == "$peer_image" ]]; then
    cp "$attempt/config/java-image.txt" "$3" || return 1
    printf '%s' "$datomic_image"
  else
    pin_image "$@"
  fi
}
tx_image=$(pin_role "$tx_major" "$tx_image" "$attempt/config/tx-java-image.txt")
write_image=$(pin_role "$write_major" "$write_image" "$attempt/config/gw-w-java-image.txt")
if [[ ${DX_PREP1_TAIL_TX_ZGC:-0} == 1 ]]; then cp "$attempt/config/tx-java-image.txt" "$attempt/config/tail-tx-image.txt"; fi
if [[ -n ${DX_LAUNCH_PROFILE:-} ]]; then
  printf 'Profile=%s WAL=%s\nPostgreSQL cores=%s memory=%s settings=%s\nDatomic object-cache=%s memory-index=%s/%s\nTransactor Java=%s image=%s cores=%s memory=%s flags=%s\nWrite gateway Java=%s image=%s cores=%s memory=%s flags=%s\nRead gateway Java=%s image=%s cores=%s memory=%s flags=%s\n' \
    "$DX_LAUNCH_PROFILE" "${wal_dir:-PGDATA}" "$pg" "$pg_mem" "$pg_settings" "$object_cache" "$index_threshold" "$index_max" \
    "$tx_major" "$tx_image" "$tx" "$tx_mem" "$tx_java" \
    "$write_major" "$write_image" "$gw_w" "${DX_GW_WRITE_MEMORY:-$gw_mem}" "$gw_w_java" \
    "$peer_major" "$datomic_image" "$gw_r" "${DX_GW_READ_MEMORY:-$gw_mem}" "$gw_r_java"
  if [[ -n ${DX_V01_CREDIT_MODE:-} ]]; then printf 'Scorecard credits=%s\n' "$DX_V01_CREDIT_MODE"; fi
  printf 'Narrow revision=%s predecessor decode reuse=%s lookup sampling interval=%s\n' "$subject_narrow_revision" "$subject_reuse_predecessor" "$lookup_every"
fi
docker image inspect postgres:17-alpine >/dev/null
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
docker create --name "$prefix-extract" ${stack_labels[@]+"${stack_labels[@]}"} --pull never "$datomic_image" >/dev/null
trap 'docker rm -f "$prefix-extract" >/dev/null 2>&1 || true' EXIT
for file in postgres-db.sql postgres-table.sql postgres-user.sql; do
  docker cp "$prefix-extract:/opt/datomic/bin/sql/$file" "$attempt/sql/$file"
done
docker cp "$prefix-extract:/opt/datomic/config/samples/sql-transactor-template.properties" "$attempt/config/template.properties"
docker cp "$prefix-extract:/opt/datomic/bin/logback.xml" "$attempt/config/vendor-logback.xml"
docker rm "$prefix-extract" >/dev/null
trap - EXIT
python3 - "$attempt/config" "$prefix" "$index_threshold" "$index_max" "$object_cache" "$encrypt_channel" <<'PY'
import json,os,pathlib,sys
root=pathlib.Path(sys.argv[1]); prefix=sys.argv[2]
settings={'protocol':'sql','host':prefix+'-tx','alt-host':prefix+'-tx',
'sql-url':'jdbc:postgresql://'+prefix+'-pg:5432/datomic?ApplicationName=triplex-tx','sql-user':'datomic','sql-password':'datomic',
'write-concurrency':'4','read-concurrency':'8','index-parallelism':'1','heartbeat-interval-msec':'5000',
'memory-index-threshold':sys.argv[3],'memory-index-max':sys.argv[4],'object-cache-max':sys.argv[5],'encrypt-channel':sys.argv[6]}
# [DX-RD5] Why: a read gateway on a second machine finds the transactor by its alternative address (rd5/second-reader.sh).
# Rejected: changing the primary host (this machine's peers keep resolving the container by name).
if os.environ.get('DX_REMOTE_READER_HOST'): settings['alt-host']=os.environ['DX_REMOTE_READER_HOST']
# [DX-JVM1] Why: tune only approved non-durability properties in this experiment.
# Rejected: accepting arbitrary properties from an inherited environment.
extra=json.loads(os.environ.get('DX_JVM1_TX_PROPERTIES', '{}'))
allowed={'write-concurrency':range(2,17), 'read-concurrency':range(2,33), 'index-parallelism':range(1,9),
         'heartbeat-interval-msec':[5000], 'prefetch-concurrency':range(1,9), 'prefetch-probes':[True,False]}
assert extra.keys() <= allowed.keys() and all(
    type(v) is (bool if k == 'prefetch-probes' else int) and v in allowed[k] for k,v in extra.items()
)
settings.update({k:str(v).lower() for k,v in extra.items()})
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
trace_native_jfr=$TRIPLEX_TRACE_TX_NATIVE_JFR
trace_env+=(-e "TRIPLEX_TRACE_TX_NATIVE_JFR=$trace_native_jfr" -e "TRIPLEX_TRACE_TX_JFR=$TRIPLEX_TRACE_TX_JFR" -e "TRIPLEX_TRACE_JFR_PROFILE=${DX_JFR_PROFILE:-0}" -e "TRIPLEX_TRACE_GATEWAY=$TRIPLEX_TRACE_GATEWAY" -e "TRIPLEX_TRACE_NATIVE_LOGS=$TRIPLEX_TRACE_NATIVE_LOGS")
trace_tx_java= trace_gw_java=
# [DX-TAIL1] Why: preserve collector labels and JVM uptime alongside the anchored JFR events.
# Rejected: attributing a minute GC rollup to one request or using a shared PID as the log filename.
jvm_events() { printf ' -Xlog:gc*=info,safepoint*=info:file=/trace/%s-jvm.log:time,uptimenanos,level,tags:filecount=4,filesize=8m' "$1"; }
if [[ $TRIPLEX_TRACE_NATIVE_LOGS == 1 ]]; then
  trace_tx_java=" -Dlogback.configurationFile=/opt/gateway/trace-logback.xml"
  trace_gw_java=" -Dlogback.configurationFile=/opt/gateway/trace-logback.xml -Ddatomic.metricsCallback=triplex.gateway.trace/metrics"
fi
if [[ $quiet_loggers == 1 ]]; then
  # [DX-T1-6] Why: the binary native appender detaches file appenders itself; quiet logging must remain on in a native profile.
  # Rejected: restoring synchronous vendor file logging while measuring the transactor's counters.
  [[ $TRIPLEX_TRACE_NATIVE_LOGS == 0 ]] || { echo 'Quiet logging conflicts with native file capture' >&2; exit 2; }
  if [[ ${DX_V01_CELL_COUNTERS:-0} == 1 ]]; then
    # [DX-V01] Why: keep the first native index-job boundary and alarms without restoring per-transaction DEBUG.
    # Rejected: deriving index-job starts from a later adoption or enabling all native logger categories.
    sed 's/name="datomic.update" level="WARN"/name="datomic.update" level="INFO"/' "$attempt/config/quiet-logback.xml" > "$attempt/config/scorecard-tx-logback.xml"
    trace_tx_java+=' -Dlogback.configurationFile=/dxh1/scorecard-tx-logback.xml -Duser.timezone=UTC'
  else
    trace_tx_java+=' -Dlogback.configurationFile=/dxh1/quiet-logback.xml'
  fi
  trace_gw_java+=' -Dlogback.configurationFile=/dxh1/quiet-logback.xml'
fi
if [[ $native_readback == 1 && $TRIPLEX_TRACE_TX_JFR == 0 && $TRIPLEX_TRACE_NATIVE_LOGS == 0 && $TRIPLEX_TRACE_GATEWAY == 0 ]]; then
  trace_tx_java+=' -Ddatomic.metricsCallback=triplex.gateway.native-settings/metrics'
fi
if [[ $TRIPLEX_TRACE_TX_JFR == 1 ]]; then
  trace_tx_java+=" -XX:StartFlightRecording=name=triplex,settings=/opt/gateway/trace.jfc,dumponexit=false,maxsize=0$(jvm_events tx)"
fi
if [[ $TRIPLEX_TRACE_TX_JFR == 1 || $TRIPLEX_TRACE_NATIVE_LOGS == 1 || $TRIPLEX_TRACE_GATEWAY == 1 ]]; then
  trace_tx_java+=" -Ddatomic.metricsCallback=triplex.gateway.trace/metrics"
fi
if [[ $TRIPLEX_TRACE_POSTGRES == 1 ]]; then
  pg_duration='-c log_min_duration_statement=0'
  # [DX-TAIL1] Why: correlate duration-only SQL records by backend and role without retaining statement text.
  # Rejected: per-statement SQL text in the permanent scorecard, and guessing a Datomic t from a backend PID.
  if [[ $trace_level == summary ]]; then pg_duration='-c log_min_duration_statement=-1 -c log_duration=on -c log_line_prefix=dxpg|%m|%p|%c|%l|%a|'; fi
  pg_settings="$pg_settings -c track_io_timing=on -c track_wal_io_timing=on $pg_duration -c log_parameter_max_length=0 -c log_parameter_max_length_on_error=0 -c log_checkpoints=on -c log_autovacuum_min_duration=0 -c log_timezone=UTC"
fi
if [[ ${TRIPLEX_TRACE_DEBUG:-0} == 1 ]]; then
  trace_tx_java="$trace_tx_java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:8505"
fi
# [DX-T1-5] Why: exercise the real installed transaction function and both layouts before a smoke stack.
# Rejected: mocking the server-clock serial point or silently skipping the gateway's normal selftests.
if [[ ${DX_GATEWAY_SELFTEST:-0} == 1 ]]; then
  # [DX-JVM1] Why: the smoke preflight and the serving JVM must load the same tracked codec.
  # Rejected: copying the whole gateway tree just to put the codec next to its source.
  docker run --rm --pull never --name "$prefix-selftest" --network none --memory 1500m --memory-swap 1500m \
    -e "DATOMIC_JAVA_OPTS=$(probe_options "-Xms128m -Xmx1g$spec_java")" -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src -v "$src:/opt/gateway:ro" ${spec_mount[@]+"${spec_mount[@]}"} \
    --entrypoint /opt/datomic/bin/run "$datomic_image" -m triplex.gateway.selftest > "$attempt/gateway-selftests.log" 2>&1
fi
if [[ ${DX_TRACE_TEST_GATEWAY:-0} == 1 ]]; then
  mkdir -p "$attempt/trace/preflight"
  docker run --rm --pull never --name "$prefix-trace-check" --network none --memory 768m --memory-swap 768m \
    -e TRIPLEX_TRACE_LEVEL=off -e "DATOMIC_JAVA_OPTS=$(probe_options "-Xms128m -Xmx512m -XX:StartFlightRecording=name=triplex,settings=/opt/gateway/trace.jfc,dumponexit=false,maxsize=0$spec_java")" -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src -e TRIPLEX_TRACE_DIR=/test-trace -e TRIPLEX_TRACE_TEST_JFR=1 -v "$attempt/trace/preflight:/test-trace" -v "$src:/opt/gateway:ro" ${spec_mount[@]+"${spec_mount[@]}"} \
    --entrypoint /opt/datomic/bin/run "$datomic_image" -m triplex.gateway.trace-test > "$attempt/gateway-trace-tests.log" 2>&1
fi
if [[ -n $pgdata ]]; then
  [[ ${DX_BARE_METAL:-0} == 1 && ${DX_V01_ADOPTED_STACK:-0} == 1 &&
     $prefix == tx2-dxscale1-v01-* && $publish == false &&
     -z $seed_volume && -z ${DX_BM1_WAL_MOUNT:-} && -z ${DX_JVM1_PG_RESTORE:-} && -z ${DX_PREP1_DUMP:-} &&
     -z $cold_pgdata && -z $pg_data && -z $prepared_pg && -z $restored_pgdata ]]
  [[ $pgdata == /* && -d $pgdata && ${DX_V01_PGDATA_FILE_ID:-} =~ ^[0-9]+:[0-9]+$ &&
     ${DX_V01_PGDATA_CONTROL_SHA:-} =~ ^[a-f0-9]{64}$ ]]
fi
docker network create ${stack_labels[@]+"${stack_labels[@]}"} "$prefix-net" >/dev/null
pg_target=/var/lib/postgresql/data
# [DX-RD5] Why: a second machine's read gateway needs PostgreSQL (segments) and the transactor (novelty) on this
# machine's private address; nothing is published unless DX_REMOTE_READER_HOST names that address.
remote_pg=() remote_tx=()
if [[ -n ${DX_REMOTE_READER_HOST:-} ]]; then
  [[ $DX_REMOTE_READER_HOST =~ ^(10|172|192)\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]] ||
    { echo "up.sh: DX_REMOTE_READER_HOST must be this machine's private IPv4 address" >&2; exit 2; }
  remote_pg=(-p "$DX_REMOTE_READER_HOST:5432:5432") remote_tx=(-p "$DX_REMOTE_READER_HOST:4334:4334")
fi
pg_args=(--pull never --name "$prefix-pg" ${stack_labels[@]+"${stack_labels[@]}"} --network "$prefix-net"
  ${network_tuning[@]+"${network_tuning[@]}"} --cpuset-cpus "$pg" --memory "$pg_mem" --memory-swap "$pg_mem"
  ${remote_pg[@]+"${remote_pg[@]}"} -e POSTGRES_PASSWORD=datomic)
# [DX-T1-14] Why: activation uses a byte-verified fresh clone under the holder's lease; a sealed source is never writable.
# Rejected: S5's old first-use/reuse fallback, incomplete copies, or attaching a transactor directly to a sealed seed.
if [[ -n $pgdata ]]; then
  # [DX-V01] Why: inspect the exact private bind mount before starting PostgreSQL.
  # Rejected: writing to the sealed source or populating a newly created volume.
  pg_entry="$repo/lab/experiments/EXP-DX1/v01/pgdata-entrypoint.sh"
  docker create "${pg_args[@]}" --mount "type=bind,source=$pgdata,target=$pg_target" \
    --mount "type=bind,source=$pg_entry,target=/scorecard-pgdata-entrypoint.sh,readonly" \
    ${wal_mount[@]+"${wal_mount[@]}"} \
    -e "DX_V01_PGDATA_FILE_ID=$DX_V01_PGDATA_FILE_ID" -e "DX_V01_PGDATA_CONTROL_SHA=$DX_V01_PGDATA_CONTROL_SHA" \
    --entrypoint /bin/sh postgres:17-alpine /scorecard-pgdata-entrypoint.sh postgres $pg_settings >/dev/null
  mount=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Type}}|{{.Source}}|{{.RW}}{{end}}{{end}}' "$prefix-pg")
  [[ $mount == "bind|$pgdata|true" ]]
  if [[ -n $wal_dir ]]; then
    wal_bind=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/wal"}}{{.Type}}|{{.Source}}|{{.RW}}{{end}}{{end}}' "$prefix-pg")
    [[ $wal_bind == "bind|$wal_dir|true" ]]
  fi
  docker start "$prefix-pg" >/dev/null
elif [[ -n $cold_pgdata ]]; then
  # [DX-JVM1] Why: copy only the stopped, read-only physical seed into a fresh owned volume.
  # Rejected: a logical restore that scans all pages just before the cold-start clock.
  docker volume create ${stack_labels[@]+"${stack_labels[@]}"} "$prefix-pg-data" >/dev/null
  pg_image=$(docker image inspect --format '{{.Id}}' postgres:17-alpine)
  docker create --pull never --name "$prefix-seed-copy" ${stack_labels[@]+"${stack_labels[@]}"} --network none --read-only \
    --memory 256m --memory-swap 256m --tmpfs /tmp:size=64m \
    --mount "type=bind,src=$cold_pgdata,dst=/from,readonly" \
    --mount "type=volume,src=$prefix-pg-data,dst=/to" \
    --mount "type=bind,src=$wal_dir,dst=/wal" \
    --mount "type=bind,src=$repo/lab/experiments/EXP-DX1/jvm1/copy-pgdata.sh,dst=/copy-pgdata.sh,readonly" \
    --entrypoint /bin/sh "$pg_image" /copy-pgdata.sh /from /to /wal "$DX_JVM1_COLD_CONTROL" >/dev/null
  docker start -a "$prefix-seed-copy" > "$attempt/pgdata.control.sha256"
  docker inspect "$prefix-seed-copy" > "$attempt/pgdata-copy-container.json"
  [[ $(docker inspect --format '{{.State.ExitCode}}' "$prefix-seed-copy") == 0 &&
     $(head -n 1 "$attempt/pgdata.control.sha256") == "$DX_JVM1_COLD_CONTROL" ]]
  docker rm "$prefix-seed-copy" >/dev/null
  cold_data_dir=$(docker volume inspect --format '{{.Mountpoint}}' "$prefix-pg-data")
  # [DX-JVM1] Why: a streaming copy can populate Linux cache with clone pages before PostgreSQL opens them.
  # Rejected: dropping the machine's global page cache or reading user pages to measure residency.
  python3 - "$cold_data_dir" "$wal_dir" <<'COLD_CACHE'
import os, sys
for root in sys.argv[1:]:
    assert os.path.isdir(root)
    for base, dirs, files in os.walk(root, followlinks=False):
        for file in files:
            path = os.path.join(base, file)
            if not os.path.islink(path):
                with open(path, 'rb') as stream:
                    os.posix_fadvise(stream.fileno(), 0, 0, os.POSIX_FADV_DONTNEED)
COLD_CACHE
elif [[ -n ${pg_data:-} ]]; then
  # [DX-ERASE2] Why: run only a disposable copy and require a clean PostgreSQL shutdown before startup.
  # Rejected: accepting a directory merely because its postmaster pid file disappeared.
  [[ ${DX_BARE_METAL:-0} == 1 && $prefix == tx2-dxscale1-removal-* && -z $seed_volume && -z $wal_dir && -z $prepared_pg ]]
  [[ $pg_data == /* && $pg_data != *','* && -f $pg_data/global/pg_control && ! -e $pg_data/postmaster.pid ]]
  [[ -z $(find "$pg_data" -type l -print -quit) ]]
  pg_mount=(--mount "type=bind,src=$pg_data,dst=/var/lib/postgresql/data")
  docker run --rm --pull never --name "$prefix-health" --read-only --network none \
    --mount "type=bind,src=$pg_data,dst=/var/lib/postgresql/data,readonly" \
    --entrypoint pg_controldata postgres:17-alpine /var/lib/postgresql/data > "$attempt/pg-before.txt"
  grep -Eq '^Database cluster state:[[:space:]]+shut down$' "$attempt/pg-before.txt"
elif [[ $seed_volume == bm1-pristine-* ]]; then
  [[ ${DX_BARE_METAL:-0} == 1 && $seed_volume == bm1-pristine-"${DX_BM1_PRISTINE_BATCH:?}" ]] || exit 2
  python3 lab/experiments/EXP-DX1/bm1/pristine-seed.py clone "$DX_BM1_PRISTINE_BATCH" "$prefix" "$attempt"
elif [[ -n $seed_volume && $prefix == tx2-dxthin1-lf-* ]];then
  # [DX-INT1] Why: the Mac launch-fix proof restarts a stopped toy copy the way the server runners restart the held copy.
  # Rejected: a measurement lease on the Mac, or running the vendor SQL against a cluster that already holds Datomic.
  [[ ${DX_BARE_METAL:-0} == 0 && $seed_volume =~ ^tx2-dxthin1-lf-held-[a-z0-9-]+$ ]] || exit 2
  [[ -z $(docker ps -aq --filter "volume=$seed_volume") ]] || { echo 'Held toy copy is in use' >&2; exit 2; }
  if docker volume inspect "$prefix-pg-data" >/dev/null 2>&1;then echo 'Refusing an existing clone destination' >&2;exit 2;fi
  docker volume create "$prefix-pg-data" >/dev/null
  docker run --rm --pull never --name "$prefix-seed-copy" --network none --memory 256m --memory-swap 256m \
    -v "$seed_volume:/from:ro" -v "$prefix-pg-data:/to" --entrypoint /bin/sh postgres:17-alpine -eu -c '
      test "$(cat /from/PG_VERSION)" = 17
      test ! -e /from/postmaster.pid
      cp -a /from/. /to/' > "$attempt/seed-clone.log"
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
  docker volume create ${stack_labels[@]+"${stack_labels[@]}"} "$prefix-pg-data" >/dev/null
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
elif [[ -n $demo_pg ]]; then
  if [[ $demo_pg == /* ]]; then
    pg_mount=(--mount "type=bind,src=$demo_pg,dst=/var/lib/postgresql/data")
    demo_control=(--mount "type=bind,src=$demo_pg,dst=/var/lib/postgresql/data,readonly")
  else
    pg_mount=(--mount "type=volume,src=$demo_pg,dst=/var/lib/postgresql/data")
    demo_control=(--mount "type=volume,src=$demo_pg,dst=/var/lib/postgresql/data,readonly")
  fi
  docker run --rm --pull never --name "$prefix-control" --network none "${demo_control[@]}" \
    --entrypoint pg_controldata postgres:17-alpine /var/lib/postgresql/data > "$attempt/pg-before.txt"
  grep -Eq '^Database cluster state:[[:space:]]+shut down$' "$attempt/pg-before.txt" ||
    { echo 'Demo working copy was not shut down cleanly' >&2; exit 2; }
elif [[ -z $prepared_pg && -z $restored_pgdata ]]; then
  if [[ -n $prep_pgdata ]]; then
    ! docker volume inspect "$prefix-pg-data" >/dev/null 2>&1 || exit 2
  fi
  docker volume create ${stack_labels[@]+"${stack_labels[@]}"} "$prefix-pg-data" >/dev/null
fi
if [[ -n $restored_pgdata ]]; then
  pg_mount=(--mount "type=bind,source=$restored_pgdata,target=/var/lib/postgresql/data")
fi
pg_image=postgres:17-alpine
if [[ -n $prep_pgdata ]]; then
  # [DX-PREP1] Why: copy the stopped SCALE1 directory once, read-only, into the owned PG volume.
  # Rejected: replaying the large SQL dump or putting the held directory under a live postmaster.
  pg_image=$(docker image inspect --format '{{.Id}}' "$pg_image")
  copy_helper="$repo/lab/experiments/EXP-DX1/prep1/copy-pgdata.sh"
  copy_wal=() wal_target=()
  if [[ -n $prep_wal ]]; then
    copy_wal=("${wal_mount[@]}" --tmpfs /tmp:size=4m)
    wal_target=(/wal)
  fi
  docker create --pull never --name "$prefix-seed-copy" --read-only --network none --memory 256m --memory-swap 256m \
    --mount "type=bind,src=$prep_pgdata,dst=/from,readonly" --mount "type=volume,src=$prefix-pg-data,dst=/to" \
    --mount "type=bind,src=$copy_helper,dst=/copy-pgdata.sh,readonly" \
    "${copy_wal[@]}" --entrypoint /bin/sh "$pg_image" /copy-pgdata.sh /from /to "${wal_target[@]}" >/dev/null
  docker start -a "$prefix-seed-copy" > "$attempt/pgdata.control.sha256"
  docker inspect "$prefix-seed-copy" > "$attempt/pgdata-copy-container.json"
  python3 - "$attempt" "$prefix" "$prep_pgdata" "$DX_PREP1_SEED_SHA" "$DX_WRITE_OPTIONS_ATTEMPT" \
    "$(git -C "$repo" rev-parse HEAD)" "$pg_image" "$copy_helper" "$prep_wal" <<'PGDATA_COPY'
import hashlib, json, pathlib, re, sys
directory, slot, source_dir, seed, attempt, source, image, helper, wal_dir = sys.argv[1:]
root = pathlib.Path(directory)
container, = json.loads((root/'pgdata-copy-container.json').read_text())
assert not container['State']['Running'] and container['State']['ExitCode'] == 0
assert container['Name'] == '/'+slot+'-seed-copy' and container['Image'] == image
mounts = {m['Destination']: m for m in container['Mounts']}
assert (mounts['/from']['Type'], mounts['/from']['Source'], mounts['/from']['RW']) == ('bind', source_dir, False)
assert (mounts['/to']['Type'], mounts['/to']['Name'], mounts['/to']['RW']) == ('volume', slot+'-pg-data', True)
assert (mounts['/copy-pgdata.sh']['Source'], mounts['/copy-pgdata.sh']['RW']) == (helper, False)
control, *wal_digest = (root/'pgdata.control.sha256').read_text().splitlines()
assert all(re.fullmatch(r'[a-f0-9]{64}', value) for value in [control, *wal_digest])
if wal_dir:
    assert (mounts['/wal']['Type'], mounts['/wal']['Source'], mounts['/wal']['RW']) == ('bind', wal_dir, True)
    assert len(wal_digest) == 1
else:
    assert '/wal' not in mounts and not wal_digest
with (root/'pgdata-copy.json').open('x') as f:
    json.dump(dict(source=source, slot=slot, nonce=attempt, seedSha=seed, image=image, volume=slot+'-pg-data',
                   pgVersion=17, sourceControlSha=control, helperSha=hashlib.sha256(pathlib.Path(helper).read_bytes()).hexdigest(),
                   inspectSha=hashlib.sha256((root/'pgdata-copy-container.json').read_bytes()).hexdigest(),
                   **(dict(walDirectory=wal_dir, walFilesSha=wal_digest[0]) if wal_dir else {})), f)
PGDATA_COPY
  docker rm "$prefix-seed-copy" >/dev/null
fi
# [DX-THIN1] Why: the scorecard's private copy already created and started its own container above.
# Rejected: a second PostgreSQL launch path with different resource flags.
if [[ -z $pgdata ]]; then
  docker run -d "${pg_args[@]}" "${pg_mount[@]}" ${wal_mount[@]+"${wal_mount[@]}"} "$pg_image" postgres $pg_settings >/dev/null
fi
# [DX-B2-N4] Why: initdb's temporary socket server stops before the final TCP server starts.
# Rejected: socket-only pg_isready (n4b raced that shutdown during vendor SQL setup).
ready=false
for ((i=0;i<90;i++)); do
  if docker exec "$prefix-pg" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then ready=true; break; fi
  if [[ -n $pgdata && $(docker inspect --format '{{.State.Running}}' "$prefix-pg") != true ]]; then
    docker logs --tail 20 "$prefix-pg" >&2
    exit 1
  fi
  sleep 1
done
[[ $ready == true ]] || { echo "Postgres TCP startup timed out" >&2; exit 1; }
if [[ ${DX_BM1_WAL_AB:-0} == 1 ]]; then
  [[ ${DX_BARE_METAL:-0} == 1 && $prefix =~ ^tx2-dxt1-bm1-[a-z0-9]+-wal-(root|ssd)$ ]]
fi
if [[ -n $wal_dir || ${DX_BM1_WAL_AB:-0} == 1 ]]; then
  docker exec "$prefix-pg" sh -ceu '
    data=$(psql -X -Atq -U postgres -c "SHOW data_directory")
    wal=$(readlink -f "$data/pg_wal")
    if [ "$1" = ssd ]; then
      if [ "$2" = cold ]; then test "$wal" = /wal/pg_wal; else test "$wal" = /wal; fi
      test "$(stat -c %d "$data")" != "$(stat -c %d "$wal")"
    else
      test "$wal" = "$data/pg_wal"
    fi
    printf "data=%s wal=%s\n" "$data" "$wal"
    df -P "$data" "$wal"
  ' sh "${wal_dir:+ssd}" "${cold_pgdata:+cold}" > "$attempt/wal-placement.txt"
fi
# Vendor scripts use their own database/connect statements; keep their order and bytes.
if [[ -z $seed_volume && -z $prepared_pg && -z $pg_data && -z $restored_pgdata && -z $cold_pgdata && -z $pgdata && -z $prep_pgdata && -z $demo_pg ]];then
for file in postgres-db.sql postgres-table.sql postgres-user.sql; do
  db=postgres
  [[ "$file" != postgres-table.sql ]] || db=datomic
  docker exec -i "$prefix-pg" psql -v ON_ERROR_STOP=1 -U postgres -d "$db" < "$attempt/sql/$file" > "$attempt/sql/$file.log"
done
fi
# [DX-JVM1] Why: restore one sealed seed into a fresh PostgreSQL volume before any measured JVM starts.
# Rejected: running the large import during the timed arm or attaching a writable original.
if [[ -n ${DX_JVM1_PG_RESTORE:-} || ${DX_PREP1_CAMPAIGN:-} =~ ^tail(-combined)?$ ]]; then
  restore_flags=()
  if [[ ${DX_PREP1_CAMPAIGN:-} =~ ^tail(-combined)?$ ]]; then
    [[ -z ${DX_JVM1_PG_RESTORE:-} && ${DX_BARE_METAL:-0} == 1 && -z $seed_volume && -f ${DX_PREP1_DUMP:?} ]]
    restore_dump=$DX_PREP1_DUMP restore_sha=${DX_PREP1_DUMP_SHA:?}
    restore_flags+=(--single-transaction)
  else
    [[ ${DX_BARE_METAL:-0} == 1 && $prefix == tx2-dxt1-jvm1-* && -z $seed_volume && -f $DX_JVM1_PG_RESTORE ]]
    restore_dump=$DX_JVM1_PG_RESTORE restore_sha=$DX_JVM1_PG_RESTORE_SHA256
  fi
  # [DX-JVM1] Why: verify the actual stream given to pg_restore.
  # Rejected: checksumming a separate open of a dump that can change while restoring.
  python3 - "$prefix-pg" "$restore_dump" "$restore_sha" "${restore_flags[@]}" \
    > "$attempt/restore.sha256" 2> "$attempt/restore.log" <<'PG_RESTORE'
import hashlib, subprocess, sys
container, dump, expected, *flags = sys.argv[1:]
digest = hashlib.sha256()
with open(dump, 'rb') as source:
    assert source.peek(5)[:5] == b'PGDMP', 'Expected a custom PostgreSQL dump'
    with subprocess.Popen(['docker', 'exec', '-i', container, 'pg_restore', '-U', 'postgres',
                           '--clean', '--if-exists', '--exit-on-error', *flags, '-d', 'datomic'],
                          stdin=subprocess.PIPE, stdout=sys.stderr) as restore:
        with restore.stdin:
            while (block := source.read(1024 * 1024)):
                digest.update(block)
                restore.stdin.write(block)
        assert restore.wait() == 0, 'PostgreSQL restore failed'
assert digest.hexdigest() == expected, 'Restored dump bytes differ from the sealed seed'
print(digest.hexdigest())
PG_RESTORE
fi
tx_start=(--entrypoint /opt/datomic/bin/transactor "$tx_image" /dxh1/sql.properties)
prep_tx=()
if [[ ${DX_PREP1_SERVER:-0} == 1 ]]; then
  if [[ -n ${DX_PREP1_DUMP:-} && ! ${DX_PREP1_CAMPAIGN:-} =~ ^tail(-combined)?$ ]]; then
    [[ -z ${DX_JVM1_PG_RESTORE:-} ]]
    # [DX-PREP1] Why: restore the same sealed bytes before any peer or transactor opens the arm.
    # Rejected: clearing rows in a warm database or measuring an incremental restore.
    docker exec -i "$prefix-pg" pg_restore --clean --if-exists --exit-on-error --single-transaction -U postgres -d datomic < "$DX_PREP1_DUMP" > "$attempt/restore.log" 2>&1
  fi
  cp "$repo/lab/experiments/EXP-DX1/prep1/observe.clj" "$attempt/config/prep1-observe.clj"
  prep_tx=(-e "PREP1_ATTEMPT=${DX_WRITE_OPTIONS_ATTEMPT:?}" -e PREP1_MODE=subject-server -e "PREP1_LOOKUP_EVERY=$lookup_every")
  if [[ ${DX_PREP1_CAMPAIGN:-} =~ ^tail(-combined)?$ ]]; then prep_tx+=(-e PREP1_TAIL_SQL=1); fi
  if [[ ${DX_PREP1_CAMPAIGN:-} == rolling ]]; then
    python3 - "$attempt/config" <<'ROLLING_LOGBACK'
from pathlib import Path
import sys
root = Path(sys.argv[1])
base = (root / 'quiet-logback.xml').read_text()
assert base.count('</configuration>') == 1
extra = """<appender name="PREP1_INDEX" class="ch.qos.logback.core.FileAppender">
  <file>/trace/prep1-index-jobs.log</file><append>false</append>
  <encoder><pattern>%d{yyyy-MM-dd'T'HH:mm:ss.SSS,UTC} %-5level %logger - %msg%n</pattern></encoder>
</appender>
<logger name="datomic.update" level="INFO" additivity="false"><appender-ref ref="PREP1_INDEX"/></logger>"""
(root / 'rolling-index-logback.xml').write_text(base.replace('</configuration>', extra + '</configuration>'))
ROLLING_LOGBACK
    # [DX-PREP1] Why: collect Datomic index and pressure events without enabling per-transaction logging.
    # Rejected: turning every transaction into a synchronous vendor log event.
    prep_tx+=(-e PREP1_ROLLING_INDEX=1)
    if [[ $prefix == *-cache32-s ]]; then prep_tx+=(-e PREP1_CACHE_METRICS=1); fi
    trace_tx_java+=' -Ddatomic.metricsCallback=triplex.prep1.observe/rolling-metrics -Dlogback.configurationFile=/dxh1/rolling-index-logback.xml'
  fi
  trace_tx_java+=' -Xlog:gc*,safepoint*=debug:file=/trace/prep1-gc-tx.log:time,uptimemillis,level,tags,pid,tid:filecount=0'
  tx_start=(--entrypoint /bin/bash "$tx_image" -c
    'exec java -server $JAVA_OPTS -cp "$(bin/classpath)" clojure.main -i /dxh1/prep1-observe.clj -m datomic.launcher /dxh1/sql.properties')
  if [[ -n $cold_pgdata ]]; then
    cp "$repo/lab/experiments/EXP-DX1/jvm1/cold-index.clj" "$attempt/config/cold-index.clj"
    # [DX-JVM1] Why: capture only the Datomic index build logger alongside its adoption observer.
    # Rejected: enabling INFO on the per-transaction logger during the five-minute window.
    python3 - "$attempt/config" <<'COLD_INDEX_LOG'
import pathlib, sys
root = pathlib.Path(sys.argv[1])
base = (root / 'quiet-logback.xml').read_text()
assert base.count('</configuration>') == 1
prior = '<logger name="datomic.update" level="WARN"/>'
assert base.count(prior) == 1
base = base.replace(prior, '')
appender = """<appender name="COLD_INDEX" class="ch.qos.logback.core.FileAppender">
  <file>/trace/cold-index-jobs.log</file><append>false</append>
  <encoder><pattern>%d{yyyy-MM-dd'T'HH:mm:ss.SSS,UTC} %-5level %logger - %msg%n</pattern></encoder>
</appender>
<logger name="datomic.update" level="INFO" additivity="false"><appender-ref ref="COLD_INDEX"/></logger>"""
(root / 'cold-logback.xml').write_text(base.replace('</configuration>', appender + '\n</configuration>'))
COLD_INDEX_LOG
    trace_tx_java+=' -Ddatomic.metricsCallback=triplex.cold-index/metrics -Dlogback.configurationFile=/dxh1/cold-logback.xml'
    startup_read=
    if [[ ${DX_JVM1_STARTUP_READ_HOOK:-0} == 1 ]]; then
      # [DX-JVM1] Why: load the one-time start-up reader only in its arms; it starts a thread only on a marked boot.
      # Rejected: loading it in every cold arm, or any reader that runs after the runner opens admission.
      cp "$repo/lab/experiments/EXP-DX1/jvm1/startup-read.clj" "$attempt/config/startup-read.clj"
      startup_read=' -i /dxh1/startup-read.clj'
    fi
    tx_start=(--entrypoint /bin/bash "$tx_image" -c
      'exec java -server $JAVA_OPTS -cp "$(bin/classpath)" clojure.main -i /dxh1/prep1-observe.clj -i /dxh1/cold-index.clj'"$startup_read"' -m datomic.launcher /dxh1/sql.properties')
  fi
fi
docker run -d --pull never --name "$prefix-tx" ${stack_labels[@]+"${stack_labels[@]}"} --network "$prefix-net" ${network_tuning[@]+"${network_tuning[@]}"} ${remote_tx[@]+"${remote_tx[@]}"} --cpuset-cpus "$tx" --memory "$tx_mem" --memory-swap "$tx_mem" \
  -e "JAVA_OPTS=$tx_java$spec_java$trace_tx_java$final_flags" -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src "${trace_env[@]}" ${prep_tx[@]+"${prep_tx[@]}"} -e "TRIPLEX_TRACE_JFR=$TRIPLEX_TRACE_TX_JFR" -e TRIPLEX_TRACE_PROCESS=tx "${trace_mount[@]}" -v "$src:/opt/gateway:ro" -v "$attempt/config:/dxh1:ro" ${spec_mount[@]+"${spec_mount[@]}"} "${tx_start[@]}" >/dev/null
template="datomic:sql://{db}?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic"
erase_env=()
erase_mount=()
gateway_main=triplex.gateway.main
if [[ -n ${pg_data:-} ]]; then
  [[ -n ${DX_ERASE2_SCOPE:-} && -n ${DX_ERASE2_FIELD:-} && -n ${DX_ERASE_TOKEN:-} && -n ${TRIPLEX_ERASURE_WRAPPING_KEY:-} ]]
  docker exec "$prefix-pg" psql -Xq -v ON_ERROR_STOP=1 -U postgres -d postgres     -c 'CREATE DATABASE removal_authority OWNER datomic'
  authority_jdbc=${template#*\?}
  authority_jdbc=${authority_jdbc/\/datomic\?/\/removal_authority\?}
  erase_env=(-e DX_ERASE2_SCOPE -e DX_ERASE2_FIELD -e DX_ERASE_TOKEN -e TRIPLEX_ERASURE_WRAPPING_KEY
    -e TRIPLEX_ERASURE_SHRED_GRACE_MS=0 -e TX2_REMOVAL_COST_READBACK=1
    -e "TRIPLEX_ERASURE_JDBC=$authority_jdbc")
  erase_mount=(-v "$repo/lab/experiments/EXP-DX1/erase1:/erase1:ro")
  gateway_main=erase1
fi
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
gateway_roles=(w r)
if [[ $prepw -ge 2 ]]; then gateway_roles+=(w2); fi
if [[ $prepw == 4 ]]; then gateway_roles+=(w3 w4); fi
for role in "${gateway_roles[@]}"; do
  mode=$role; if [[ $role == w* ]]; then mode=w; fi
  # [DX-W1] Why: bootstrap is finished on the other peer before the single authoritative writer admits live traffic.
  # Rejected: allowing a large labeled import through the live writer's frame cap during measurement.
  field_policy=()
  # [DX-PREP1] Why: carry the one opt-in setting through the normal writer launcher.
  # Rejected: coupling activation to trace collection or installing the writer on reader peers.
  if [[ $mode == w ]]; then
    field_policy+=(-e "TX2_SUBJECT_SAVE=$subject_save" -e "TX2_SUBJECT_NUMERIC_OWNER=$subject_numeric_owner"
      -e "TX2_SUBJECT_PREFETCH=$subject_prefetch" -e "TX2_SUBJECT_ORDERED_IDS=$subject_ordered_ids"
      -e "TX2_SUBJECT_OWNER_HEAD=$subject_owner_head"
      -e "TX2_SUBJECT_NARROW_REVISION=$subject_narrow_revision" -e "TX2_SUBJECT_REUSE_PREDECESSOR=$subject_reuse_predecessor")
  fi
  if [[ $mode == w && $general_prefetch == 1 ]]; then
    field_policy+=(-e "TX2_GENERAL_PREFETCH=1")
  fi
  if [[ $mode == w && $subject_hints == 1 ]]; then
    field_policy+=(-e "TX2_SUBJECT_HINTS=1")
  fi
  if [[ $mode == w && $subject_wide == 1 ]]; then
    field_policy+=(-e "TX2_SUBJECT_WIDE=1")
  fi
  if [[ -n $read_wait_limit ]]; then field_policy+=(-e "TX2_READ_WAIT_LIMIT=$read_wait_limit"); fi
  if [[ $thread_counters == 1 ]]; then field_policy+=(-e "TX2_THREAD_COUNTERS=1"); fi
  if [[ $mode == w && $append_retirement == 1 ]]; then
    field_policy+=(-e "TX2_SUBJECT_APPEND_RETIREMENT=1")
  fi
  if [[ $mode == w && ${DX_W1_RETIREMENT_PAIR:-0} == 1 ]]; then
    field_policy+=(-e "TX2_SUBJECT_RETIREMENT_TRACE=1")
  fi
  if [[ $mode == w && -n ${DX_WRITE_OPTIONS_ATTEMPT:-} ]]; then
    [[ ${DX_PREDECESSOR_LOOKUP:-} =~ ^[01]$ && $DX_WRITE_OPTIONS_ATTEMPT =~ ^[a-f0-9-]{36}$ ]] || exit 2
    field_policy+=(-e "TX2_PREDECESSOR_LOOKUP=$DX_PREDECESSOR_LOOKUP" -e "TX2_WRITE_OPTIONS_ATTEMPT=$DX_WRITE_OPTIONS_ATTEMPT")
  fi
  if [[ -n ${DX_LIVE_PRIORITY:-} ]]; then
    [[ $DX_LIVE_PRIORITY =~ ^[01]$ && ${DX_FIELD_COALESCE:-0} =~ ^[01]$ ]] || exit 2
    if [[ $mode == w ]]; then field_policy+=(-e "TX2_LIVE_PRIORITY=$DX_LIVE_PRIORITY" -e "TX2_FIELD_COALESCE=${DX_FIELD_COALESCE:-0}"); fi
  fi
  if [[ $mode == w && ${DX_W1_EXTRA:-0} == 1 ]]; then
    [[ ${DX_SMALL_ROWS:-0} =~ ^[01]$ && ${DX_GROUP_REUSE_PREPARED:-0} =~ ^[01]$ && ${DX_GROUP_MAX_MEMBERS:-8} =~ ^[1-9][0-9]{0,2}$ ]] || exit 2
    field_policy+=(-e "TX2_GROUP_STAGE_CLOCK=1" -e "TX2_SMALL_ROWS=${DX_SMALL_ROWS:-0}" -e "TX2_GROUP_REUSE_PREPARED=${DX_GROUP_REUSE_PREPARED:-0}" -e "TX2_GROUP_MAX_MEMBERS=${DX_GROUP_MAX_MEMBERS:-8}")
    if [[ -z ${DX_WRITE_OPTIONS_ATTEMPT:-} ]]; then
      [[ ${DX_W1_PREDECESSOR:-0} =~ ^[01]$ ]] || exit 2
      field_policy+=(-e "TX2_PREDECESSOR_LOOKUP=${DX_W1_PREDECESSOR:-0}")
    fi
    for pair in "TX2_SAVE_LEDGER=${DX_W1_LEDGER:-0}" \
                "TX2_PACKED_JOURNAL=${DX_W1_PACKED_JOURNAL:-0}" "TX2_GROUP_FAST_REPLY=${DX_W1_FAST_REPLY:-0}" \
                "TX2_LEAN_NATIVE_QUERY=${DX_W1_JOURNAL_QUERY:-0}" "TX2_LEAN_NATIVE_LOG=${DX_W1_JOURNAL_QUERY:-0}"; do
      [[ ${pair#*=} =~ ^[01]$ ]] || exit 2
      field_policy+=(-e "$pair")
    done
    if [[ -n ${DX_WRITE_BUDGET_US:-} ]]; then
      [[ $DX_WRITE_BUDGET_US =~ ^[1-9][0-9]{0,5}$ ]] || exit 2
      field_policy+=(-e "TX2_WRITE_BUDGET_US=$DX_WRITE_BUDGET_US")
    fi
  fi
  if [[ $mode == w && ${DX_INT1_NATIVE_WRITE_READBACK:-0} == 1 ]]; then
    [[ ${DX_PREDECESSOR_LOOKUP:-0} =~ ^[01]$ ]] || exit 2
    field_policy+=(-e "TX2_INT1_WRITE_READBACK=1" -e "TX2_PREDECESSOR_LOOKUP=${DX_PREDECESSOR_LOOKUP:-0}")
  fi
  if [[ $role == w && ${DX_V01_IMPORT_TIMING:-0} == 1 ]]; then
    field_policy+=(-e "TX2_LOAD1_PRIORITY=${DX_GROUP_COMMIT:-0}" -e TX2_LOAD2_TIMING=1)
  fi
  if [[ -n $demo_pg ]]; then
    field_policy+=(-e TX2_LEAN_NATIVE_QUERY=1 -e TX2_LEAN_NATIVE_LOG=1)
  fi
  if [[ $mode == r && ${DX_V01_ADOPTED_STACK:-0} == 1 && ${DX_W1_JOURNAL_QUERY:-0} == 1 ]]; then
    # [DX-V01] Why: the scorecard independently checks the layout K journal through the read peer.
    # Rejected: accepting an output reconstructed only by the same peer that acknowledged the saves.
    field_policy+=(-e TX2_LEAN_NATIVE_QUERY=1 -e TX2_LEAN_NATIVE_LOG=1)
  fi
  # [DX-XQ3] Why: the ID list route (questions across subjects, step 0) and its permit pool, on every gateway that
  # serves reads; unset leaves both gateways' environment exactly as before.
  if [[ -n ${DX_ID_LISTS:-} ]]; then
    [[ $DX_ID_LISTS =~ ^[01]$ ]] || { echo "up.sh: DX_ID_LISTS must be 0 or 1" >&2; exit 2; }
    field_policy+=(-e "TX2_ID_LISTS=$DX_ID_LISTS")
  fi
  if [[ -n ${DX_INDEX_QUERY_PERMITS:-} ]]; then
    [[ $DX_INDEX_QUERY_PERMITS =~ ^[1-9][0-9]?$ ]] || { echo "up.sh: DX_INDEX_QUERY_PERMITS must be 1..64" >&2; exit 2; }
    field_policy+=(-e "TX2_INDEX_QUERY_PERMITS=$DX_INDEX_QUERY_PERMITS")
  fi
  # [DX-XQ3] Why: the ID list gate removes a subject's protected values on request; both gateways share one erasure
  # directory (an owned volume, removed by down.sh --volumes). Rejected: the erase1 stack (it replaces the gateway main).
  xq3_mount=()
  if [[ ${DX_XQ3_ERASURE_DIRECTORY:-0} == 1 ]]; then
    field_policy+=(-e TRIPLEX_ERASURE_DIRECTORY=/dx-authority)
    xq3_mount=(-v "$prefix-authority:/dx-authority")
  fi
  if [[ $mode == w ]]; then
    cpu=$gw_w port=$port_w
    if [[ $role != w ]]; then port=$((port_w + ${role#w} - 1)); fi
  else cpu=$gw_r port=$port_r; fi
  ports=(); [[ $publish == false ]] || ports=(-p "127.0.0.1:$port:8080")
  if [[ $mode == w ]]; then
    mem=${DX_GW_WRITE_MEMORY:-$gw_mem}; role_java=$gw_w_java; image=$write_image
  else
    mem=${DX_GW_READ_MEMORY:-$gw_mem}; role_java=$gw_r_java; image=$datomic_image
    field_policy+=(-e "TX2_READ_PROFILE=${DX_RD1_READ_PROFILE:-0}" -e "TX2_READ_FILTER_EARLY=${DX_RD1_READ_FILTER:-0}")
    # [DX-RD3] Why: read permits above the reader's core count, so a permit waiting on a storage round trip leaves its
    # core to another read. Unset keeps the gateway's default (the processor count).
    if [[ -n ${DX_READ_PERMITS:-} ]]; then
      [[ $DX_READ_PERMITS =~ ^[1-9][0-9]?$ ]] || { echo "up.sh: DX_READ_PERMITS must be 1..99" >&2; exit 2; }
      field_policy+=(-e "TX2_READ_PERMITS=$DX_READ_PERMITS")
    fi
    # [DX-RD5] Why: an uncached pinned read of eight subjects made its storage round trips one after another inside the
    # permit, and Datomic's index read-ahead loaded leaves no point read uses (rd5/UNCACHED-READ.md). Both default off.
    [[ ${DX_READ_PREFETCH:-0} =~ ^[01]$ && ${DX_READ_AHEAD_OFF:-0} =~ ^[01]$ ]] ||
      { echo "up.sh: DX_READ_PREFETCH and DX_READ_AHEAD_OFF are 0 or 1" >&2; exit 2; }
    if [[ ${DX_READ_PREFETCH:-0} == 1 ]]; then field_policy+=(-e TX2_READ_PREFETCH=1); fi
    if [[ ${DX_READ_AHEAD_OFF:-0} == 1 ]]; then role_java+=" -Ddatomic.readAheadPool=0"; fi
  fi
  entity_cache_bytes=${DX_GW_READ_ENTITY_CACHE_BYTES:-268435456}
  [[ $mode != w ]] || entity_cache_bytes=${DX_GW_WRITE_ENTITY_CACHE_BYTES:-268435456}
  role_trace_java=$trace_gw_java
  if [[ $mode == r && ${DX_RD1_READ_PROFILE:-0} == 1 ]]; then
    role_trace_java+=" -Ddatomic.metricsCallback=triplex.gateway.trace/metrics -Xlog:gc*,safepoint=info:file=/trace/rd1-gc.log:time,uptimemillis,level,tags:filecount=0"
  fi
  if [[ ${DX_PREP1_SERVER:-0} == 1 ]]; then
    role_trace_java+=" -Xlog:gc*,safepoint*=debug:file=/trace/prep1-gc-gw-$role.log:time,uptimemillis,level,tags,pid,tid:filecount=0"
    if [[ $mode == w ]]; then field_policy+=(-e TX2_SUBJECT_PROFILE=1); fi
  elif [[ $mode == w && ${DX_V01_COMMIT_READS:-0} == 1 ]]; then
    # [DX-INT1] The card on the production-shaped tape reports storage reads per commit from each acknowledgement.
    field_policy+=(-e TX2_SUBJECT_PROFILE=1)
  fi
  gw_startup_read=()
  if [[ $role == w && ${DX_JVM1_STARTUP_READ_HOOK:-0} == 1 ]]; then
    # [DX-JVM1] Why: the write peer resolves owners in its own cache; it loads the same one-time reader, marked per boot.
    [[ -n ${DX_JVM1_COLD_PGDATA:-} && -f $attempt/config/startup-read.clj ]]
    gw_startup_read=(-i /dxh1/startup-read.clj)
    field_policy+=(-e TRIPLEX_STARTUP_READ_ROLE=gw-w)
  fi
  role_jfr=$TRIPLEX_TRACE_GW_JFR
  if [[ $role == w && -n ${DX_TAIL1_ATTEMPT:-} && ${DX_TAIL1_EVENT_TRACE:-0} != 1 ]]; then
    # [DX-TAIL1] Why: dump the allocation recording from the owning live JVM.
    # Rejected: depending on bin/run to forward Docker shutdown to the Java child.
    role_jfr=1
    role_trace_java="$role_trace_java -XX:StartFlightRecording=name=triplex,settings=profile,dumponexit=false,maxsize=32m"
  elif [[ $role_jfr == 1 ]]; then
    role_trace_java="$role_trace_java -XX:StartFlightRecording=name=triplex,settings=/opt/gateway/trace.jfc,dumponexit=false,maxsize=0$(jvm_events "gw-$role")"
  fi
  if [[ ${TRIPLEX_TRACE_DEBUG:-0} == 1 ]]; then
    debug_port=8506; [[ $role == w ]] || debug_port=8507
    role_trace_java="$role_trace_java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:$debug_port"
  fi
  tail1_env=()
  if [[ $role == w && -n ${DX_TAIL1_ATTEMPT:-} ]]; then
    if [[ ${DX_TAIL1_EVENT_TRACE:-0} != 1 ]]; then tail1_env=(-e TRIPLEX_TRACE_ALLOCATION_ONLY=1); fi
    if [[ ${DX_TAIL1_LESS_ALLOCATION:-0} == 1 ]]; then
      tail1_env+=(-e TX2_TAIL1_ROW_DECODE=1)
    fi
  fi
  role_network=(--network "$prefix-net")
  if [[ $mode == r && ${DX_RD4_READ_HOLD:-0} == 1 ]]; then
    # [DX-RD4] Test stack only: the read peer reaches the transactor through rd4/hold-proxy.mjs in a container whose
    # network namespace it shares, so a gate can hold the peer behind an acknowledged write. Default off.
    # Rejected: on any other stack, on bare metal, or beside the idle-TCP setting (container networking refuses it).
    [[ $prefix == tx2-dxrd4-* && $publish == true && ${DX_BARE_METAL:-0} == 0 && -z ${network_tuning[*]:-} ]] ||
      { echo "DX_RD4_READ_HOLD is only for a published tx2-dxrd4-* stack on the Mac" >&2; exit 2; }
    tx_address=$(docker inspect --format "{{(index .NetworkSettings.Networks \"$prefix-net\").IPAddress}}" "$prefix-tx")
    [[ $tx_address =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || exit 2
    docker run -d --pull never --name "$prefix-hold" --network "$prefix-net" --add-host "$prefix-tx:127.0.0.1" \
      --memory 128m --memory-swap 128m ${ports[@]+"${ports[@]}"} -p "127.0.0.1:$((port + 100)):8099" \
      -v "$repo/lab/experiments/EXP-DX1/rd4/hold-proxy.mjs:/hold-proxy.mjs:ro" \
      node:22.23.2-bookworm-slim node /hold-proxy.mjs "$tx_address" 4334 >/dev/null
    role_network=(--network "container:$prefix-hold") ports=()
  fi
  docker run -d --pull never --restart on-failure:10 --name "$prefix-gw-$role" ${stack_labels[@]+"${stack_labels[@]}"} "${role_network[@]}" ${network_tuning[@]+"${network_tuning[@]}"} --cpuset-cpus "$cpu" --memory "$mem" --memory-swap "$mem" \
    ${ports[@]+"${ports[@]}"} ${tail1_env[@]+"${tail1_env[@]}"} "${trace_env[@]}" ${field_policy[@]+"${field_policy[@]}"} -e "TRIPLEX_TRACE_JFR=$role_jfr" -e "TRIPLEX_TRACE_PROCESS=gw-$role" "${trace_mount[@]}" -e "DATOMIC_JAVA_OPTS=${role_java}${spec_java}${role_trace_java}${final_flags}" -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src${pg_data:+:/erase1} \
    -e "TRIPLEX_LAYOUT_REPLAY=$([[ $role == w ]] && echo ${DX_LAYOUT_REPLAY:-0} || echo 0)" -e "TX2_SLIM_ROWS=${DX_SLIM_ROWS:-0}" -e "TX2_REV_AEVT=${DX_REV_AEVT:-0}" -e "TX2_COMMIT_HINTS=${DX_COMMIT_HINTS:-false}" -e "DATOMIC_URI_TEMPLATE=$template&ApplicationName=triplex-gw-$role" -e "GATEWAY_SOURCE_SHA256=$gateway_hash" \
    -e "TX2_ENTITY_CACHE_BYTES=$entity_cache_bytes" -e "TX2_ID_CACHE_ENTRIES=${DX_ID_CACHE_ENTRIES:-2097152}" -e "TX2_ID_CACHE_BYTES=${DX_ID_CACHE_BYTES:-536870912}" \
    -e "TX2_REACH_SESSION_ENTRIES=${DX_GW_SESSION_ENTRIES:-1000000}" \
    -e "TX2_PINNED_SHORTCUT=${DX_PINNED_SHORTCUT:-0}" -e "TX2_PINNED_CUT_LOOKUP=${DX_PINNED_CUT_LOOKUP:-0}" \
    -v "$src:/opt/gateway:ro" -v "$attempt/config:/dxh1:ro" ${spec_mount[@]+"${spec_mount[@]}"} \
    ${erase_env[@]+"${erase_env[@]}"} ${erase_mount[@]+"${erase_mount[@]}"} ${xq3_mount[@]+"${xq3_mount[@]}"} \
    --entrypoint /opt/datomic/bin/run "$image" ${gw_startup_read[@]+"${gw_startup_read[@]}"} -m "$gateway_main" ${pg_data:+gateway} >/dev/null
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
for role in tx gw-w gw-r; do
  bash "$repo/lab/experiments/EXP-DX1/jvm1/readback.sh" "$prefix-$role" "$attempt/config" "$role"
  major=$peer_major
  case $role in tx) major=$tx_major;; gw-w) major=$write_major;; esac
  grep -F "Version: $(DX_JAVA="$major" node "$runtime_tool" version)" "$attempt/config/$role.gc-init.txt" >/dev/null
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
if [[ $TRIPLEX_TRACE_POSTGRES == 1 ]]; then
  docker exec "$prefix-pg" psql -X -At -U postgres -d datomic -c "SHOW log_duration; SHOW log_line_prefix;" > "$attempt/postgres-event-settings.txt"
fi
if [[ -n $pg_data ]]; then
  # [DX-ERASE2] Why: container evidence needs immutable IDs and mounts, while the private gateway keeps its runtime secrets.
  # Rejected: saving full inspect responses containing the ephemeral wrapping key.
  docker inspect "$prefix-pg" "$prefix-tx" "${gateway_roles[@]/#/$prefix-gw-}" |
    python3 -c 'import json,sys
rows=json.load(sys.stdin)
for row in rows:
    row["Config"]["Env"]=[v for v in row["Config"]["Env"]
                          if not v.startswith(("TRIPLEX_ERASURE_WRAPPING_KEY=", "DX_ERASE_TOKEN=", "TRIPLEX_ERASURE_JDBC="))]
json.dump(rows,sys.stdout)' > "$attempt/containers.json"
else
  docker inspect "$prefix-pg" "$prefix-tx" "${gateway_roles[@]/#/$prefix-gw-}" > "$attempt/containers.json"
fi
for role in pg tx "${gateway_roles[@]/#/gw-}"; do docker exec "$prefix-$role" cat /proc/sys/net/ipv4/tcp_slow_start_after_idle > "$attempt/tcp-idle-$role.txt"; done
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
if (root/'pgdata-copy.json').exists():
    clone=json.loads((root/'pgdata-copy.json').read_text())
    pg,=[r for r in rows if r['Name']=='/'+sys.argv[2]+'-pg']
    mount,=[m for m in pg['Mounts'] if m['Destination']=='/var/lib/postgresql/data']
    assert pg['Image']==clone['image'] and (mount['Type'],mount['Name'],mount['RW'])==('volume',clone['volume'],True)
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
