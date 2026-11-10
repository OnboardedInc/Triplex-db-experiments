#!/usr/bin/env bash
# [DX-H3] Why: direct VM networking avoids Lima SSH forwarding and disk-backed SQLite avoids virtiofs fsync.
# Rejected: host load generation (one failed tunnel invalidates all endpoints).
set -euo pipefail
prefix=${1:?usage: run-in-vm.sh PREFIX [--cpus LIST] [--memory SIZE] -- COMMAND...}; shift
[[ $prefix =~ ^tx2-dxh8-[a-z0-9-]+$ ]] || exit 2
cpus=6,7 memory=3g
while [[ ${1:-} != -- ]]; do
  case ${1:-} in --cpus) cpus=$2;; --memory) memory=$2;; *) exit 2;; esac
  shift 2
done
shift
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
evidence=${DX_DRIVER_EVIDENCE:-/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H8/$prefix}
mkdir -p "$evidence/driver" "$evidence/oracle-bridge"
bridge_pid=
docker image inspect node:22.23.2-bookworm-slim >/dev/null
docker volume create "$prefix-driver" >/dev/null
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
cleanup() {
  rc=$?
  trap - EXIT
  if [[ -n $bridge_pid ]]; then kill "$bridge_pid" 2>/dev/null || true; wait "$bridge_pid" 2>/dev/null || true; fi
  # Copy even after command failure; retain container and volume if copy fails.
  docker cp "$prefix-driver:/driver/." "$evidence/driver/" || exit 1
  docker rm -f "$prefix-driver" >/dev/null
  exit "$rc"
}
trap cleanup EXIT
# [orchestrator] Why: the layout and similar driver settings are environment variables. DX_DRIVER_ENV is a space-separated NAME=VALUE list.
extra_env=(); for kv in ${DX_DRIVER_ENV:-}; do extra_env+=(-e "$kv"); done
# The lexical output remains under runs/; that directory is a real Docker volume during execution.
docker create --pull never --name "$prefix-driver" --network "$prefix-net" --cpuset-cpus "$cpus" --memory "$memory" --memory-swap "$memory" \
  --cgroupns host -v /sys/fs/cgroup:/sys/fs/cgroup:ro -v "$repo:$repo" \
  -v /Users/sam/Claude/Projects/triplex-db-2/evidence:/Users/sam/Claude/Projects/triplex-db-2/evidence \
  -v "$prefix-tools:/tool:ro" -e LD_LIBRARY_PATH=/tool -e PATH=/tool:/usr/local/bin:/usr/bin:/bin -e "TX2_W0_EXTERNAL_LEASE=$prefix" -v /Users/sam/Claude/Projects/triplex-db-2/locks:/Users/sam/Claude/Projects/triplex-db-2/locks:ro -v "$prefix-driver:/driver" -v "$prefix-driver:$repo/runs/DX-H8-vm" -w "$repo" \
  -e "TX2_ORACLE_BRIDGE=$evidence/oracle-bridge" \
  -e "DATOMIC_URL=http://$prefix-gw-w:8080" -e "DATOMIC_READ_URLS=http://$prefix-gw-r:8080" \
  -e "TX2_ENGINE_CONTAINER=$prefix-pg,$prefix-tx,$prefix-gw-w,$prefix-gw-r" \
  -e "TX2_ENGINE_CGROUPS=$cgroups" -e "TX2_ENGINE_CPUS=${TX2_ENGINE_CPUS:-1}" \
  ${extra_env[@]+"${extra_env[@]}"} \
  python:3.13-slim "$@" >/dev/null
docker inspect "$prefix-driver" > "$evidence/driver-container.json"
printf '%s\n' "$cgroups" > "$evidence/cgroups.txt"

docker start -a "$prefix-driver"
