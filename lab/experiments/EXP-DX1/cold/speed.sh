#!/usr/bin/env bash
# [COLD-1] Why: run the speed probe on chosen guest CPUs at the same time, one pinned container each.
# Rejected: one multi-threaded process (Node cannot pin its own threads without a helper).
# usage (under with-lock.sh): speed.sh OUT_DIR TAG SECONDS CPU_LIST
set -euo pipefail
out=${1:?out}; tag=${2:?tag}; seconds=${3:?seconds}; cpus=${4:?cpus}
[[ $tag =~ ^[a-z0-9-]+$ ]] || exit 2
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$out"
pids=()
for cpu in ${cpus//,/ }; do
  docker run --rm --pull never --network none --name "tx2-cold-speed-$tag-$cpu" --cpuset-cpus "$cpu" --memory 512m --memory-swap 512m \
    -e COLD_RUNS="${COLD_RUNS:-1}" -v "$here:/cold:ro" node:22.23.2-bookworm-slim node /cold/speed.mjs "$seconds" "$tag-cpu$cpu" > "$out/speed-$tag-cpu$cpu.json" &
  pids+=($!)
done
rc=0; for p in "${pids[@]}"; do wait "$p" || rc=$?; done
exit "$rc"
