#!/usr/bin/env bash
# [DX-H3] Why: direct VM networking avoids Lima SSH forwarding and disk-backed SQLite avoids virtiofs fsync.
# Rejected: host load generation (one failed tunnel invalidates all endpoints).
set -euo pipefail
prefix=${1:?usage: run-in-vm.sh PREFIX [--cpus LIST] [--memory SIZE] -- COMMAND...}; shift
[[ $prefix =~ ^tx2-dx[a-z0-9-]+$ ]] || exit 2
cpus=6,7 memory=3g
while [[ ${1:-} != -- ]]; do
  case ${1:-} in --cpus) cpus=$2;; --memory) memory=$2;; *) exit 2;; esac
  shift 2
done
shift
source "$(dirname "${BASH_SOURCE[0]}")/platform.sh"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
agent=$(printf '%s' "$prefix" | cut -d- -f2 | tr '[:lower:]' '[:upper:]' | sed 's/^DX/DX-/')
evidence=${DX_STACK_EVIDENCE:-$DX_EVIDENCE_ROOT/$agent}/$prefix
mkdir -p "$evidence/driver" "$evidence/oracle-bridge"
bridge_pid=
docker image inspect node:22.23.2-bookworm-slim >/dev/null
if [[ $prefix == tx2-dxt1-* ]]; then
  docker run --rm --pull never --name "$prefix-disk-map" --network none --memory 64m --memory-swap 64m \
    --mount type=bind,src=/,dst=/guest,readonly node:22.23.2-bookworm-slim \
    sh -c 'df -k /guest /guest/var/lib/docker /guest/var/tmp; findmnt -T /guest -o SOURCE,FSTYPE,TARGET; findmnt -T /guest/var/lib/docker -o SOURCE,FSTYPE,TARGET' > "$evidence/guest-filesystems.txt"
fi
# [DX-T1-10] Why: the diagnostic moves every driver spill, witness and trace file to a different durable ext4 disk together.
# Rejected: tmpfs (the consumer correctly refuses its durability), or moving only one lexical output alias.
storage=${DX_HARNESS_STORAGE:-volume}
driver_mounts=(); command=("$@")
if [[ $storage == volume ]]; then
  docker volume create "$prefix-driver" >/dev/null
  driver_mounts=(-v "$prefix-driver:/driver" -v "$prefix-driver:$repo/runs/DX-H3-vm")
elif [[ $storage == root-disk && $prefix == tx2-dxt1-* ]]; then
  node "$repo/lab/trace/harness-volume.mjs" create "$prefix" "$evidence"
  driver_mounts=(-v "$prefix-driver:/driver" -v "$prefix-driver:$repo/runs/DX-H3-vm")
else
  echo 'Invalid harness storage: volume or owned root-disk only' >&2; exit 2
fi
# Refuse host port forwarding in this mode, even for a pre-existing caller stack.
for role in gw-w gw-r; do
  [[ $(docker inspect --format '{{len .HostConfig.PortBindings}}' "$prefix-$role") == 0 ]] || { echo "VM mode requires up.sh --no-publish" >&2; exit 1; }
done
ids=$(docker inspect --format '{{.Name}}={{.Id}}' "$prefix-pg" "$prefix-tx" "$prefix-gw-w" "$prefix-gw-r")
# [DX-H3] Why: engine cgroup namespaces expose only /; resolve IDs against the host cgroup mount.
# Rejected: assuming a systemd layout or mounting the Docker socket in the measuring client.
cgroups=$(docker run --rm --pull never --name "$prefix-cgroups" --cgroupns host -v /sys/fs/cgroup:/sys/fs/cgroup:ro node:22.23.2-bookworm-slim node -e '
const fs=require("fs"); const rows=process.argv[1].trim().split("\n");
function find(root,id,depth=0) { if(depth>5)return; for(const d of fs.readdirSync(root,{withFileTypes:true})) {if(!d.isDirectory())continue; const p=root+"/"+d.name;if(d.name.includes(id)&&fs.existsSync(p+"/cpu.stat"))return p;const r=find(p,id,depth+1);if(r)return r;}}
console.log(rows.map(row=>{const [name,id]=row.split("=");const p=find("/sys/fs/cgroup",id);if(!p)throw Error("cgroup missing "+name);return name.replace(/^\//,"")+"="+p}).join(","));' "$ids")
# [DX-T1-2] Why: prove scheduler counters and affinity tools on this guest, never infer support from host APIs.
# Rejected: reporting a disabled run-queue counter as measured zero wait.
docker run --rm --pull never --name "$prefix-scheduler-probe" --network none node:22.23.2-bookworm-slim node -e '
const fs=require("fs");const read=p=>{try{return fs.readFileSync(p,"utf8")}catch{return null}};
console.log(JSON.stringify({at:Date.now(),enabled:read("/proc/sys/kernel/sched_schedstats"),sample:read("/proc/thread-self/schedstat"),taskset:fs.existsSync("/usr/bin/taskset"),kernel:read("/proc/version")}));' > "$evidence/scheduler-capability.json"
cleanup() {
  rc=$?
  trap - EXIT
  if [[ -n $bridge_pid ]]; then kill "$bridge_pid" 2>/dev/null || true; wait "$bridge_pid" 2>/dev/null || true; fi
  # [DX-T1-14] Why: preserve the driver's actual exit/OOM state before removing its cgroup, including interrupted clients.
  # Rejected: infer an OOM from a near-limit sample after cleanup has destroyed the terminal evidence.
  docker container inspect "$prefix-driver" > "$evidence/driver-container-at-cleanup.json" || exit 1
  if [[ $(docker container inspect --format '{{.State.Running}}' "$prefix-driver") == true ]];then
    docker stop --time 10 "$prefix-driver" > "$evidence/driver-stop-requested.txt" || exit 1
  fi
  docker container inspect "$prefix-driver" > "$evidence/driver-container-final.json" || exit 1
  # Copy even after command failure; retain container and volume if copy fails.
  docker cp "$prefix-driver:/driver/." "$evidence/driver/" || exit 1
  docker rm -f "$prefix-driver" >/dev/null
  if [[ $storage == root-disk ]]; then node "$repo/lab/trace/harness-volume.mjs" export-clean "$prefix" "$evidence" || exit 1; fi
  exit "$rc"
}
trap cleanup EXIT
# [orchestrator] Why: the layout and similar driver settings are environment variables. DX_DRIVER_ENV is a space-separated NAME=VALUE list.
extra_env=(); for kv in ${DX_DRIVER_ENV:-}; do extra_env+=(-e "$kv"); done
network_tuning=()
if [[ ${DX_IDLE_TCP:-default} != default ]]; then
  [[ $prefix == tx2-dxt1-* && $DX_IDLE_TCP == 0 ]] || exit 2
  network_tuning=(--sysctl net.ipv4.tcp_slow_start_after_idle=0)
fi
# The lexical output remains under runs/; that directory is a real Docker volume during execution.
# [DX-T1-14] Why: a failed heap must retain stderr/exit state without a multi-GiB dump into the source bind mount.
# Rejected: changing the host/guest global core policy.
docker create --ulimit core=0 --pull never --name "$prefix-driver" --network "$prefix-net" ${network_tuning[@]+"${network_tuning[@]}"} --cpuset-cpus "$cpus" --memory "$memory" --memory-swap "$memory" \
  --cgroupns host -v /sys/fs/cgroup:/sys/fs/cgroup:ro -v "$repo:$repo" \
  -v "$DX_EVIDENCE_ROOT:$DX_EVIDENCE_ROOT" \
  "${driver_mounts[@]}" -w "$repo" \
  -e "TRIPLEX_TRACE_CPU_PROFILE=${DX_NODE_PROFILE:-0}" -e "TRIPLEX_TRACE_NODE=${TRIPLEX_TRACE_NODE:-1}" -e "TRIPLEX_TRACE_SESSION=${TRIPLEX_TRACE_SESSION:-}" -e "TRIPLEX_TRACE_SYSTEM=${TRIPLEX_TRACE_SYSTEM:-0}" \
  -e "TRIPLEX_TRACE_LEVEL=${TRIPLEX_TRACE_LEVEL:-off}" -e "TRIPLEX_TRACE_RUN=$prefix" -e "TRIPLEX_TRACE_SLOT=$prefix" -e "TRIPLEX_TRACE_SOURCE=$(git -C "$repo" rev-parse HEAD)" -e TRIPLEX_TRACE_DIR=/driver/trace/raw -e TRIPLEX_TRACE_PROCESS=node -e "TRIPLEX_TRACE_DEBUG=${TRIPLEX_TRACE_DEBUG:-0}" \
  -e "TX2_ORACLE_BRIDGE=$evidence/oracle-bridge" \
  -e "DATOMIC_URL=http://$prefix-gw-w:8080" -e "DATOMIC_READ_URLS=http://$prefix-gw-r:8080" \
  -e "TX2_ENGINE_CONTAINER=$prefix-pg,$prefix-tx,$prefix-gw-w,$prefix-gw-r" \
  -e "TX2_ENGINE_CGROUPS=$cgroups" -e "TX2_ENGINE_CPUS=${TX2_ENGINE_CPUS:-1}" \
  ${extra_env[@]+"${extra_env[@]}"} \
  node:22.23.2-bookworm-slim "${command[@]}" >/dev/null
docker inspect "$prefix-driver" > "$evidence/driver-container.json"
printf '%s\n' "$cgroups" > "$evidence/cgroups.txt"
node "$repo/lab/experiments/EXP-DX1/h3/oracle-bridge.mjs" server "$evidence/oracle-bridge" &
bridge_pid=$!
docker start -a "$prefix-driver"
