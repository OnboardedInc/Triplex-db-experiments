#!/usr/bin/env bash
# [COLD-1] Why: run the cache probe pinned to one guest CPU, with the Mac's state recorded on both sides.
# usage (under with-lock.sh): cold.sh OUT_DIR TAG CPU REPS MODE [GAPS]
set -euo pipefail
out=${1:?}; tag=${2:?}; cpu=${3:?}; reps=${4:?}; mode=${5:?}; gaps=${6:-0,2,5,10,25,50,100,250,500,1000,2000}
[[ $tag =~ ^[a-z0-9-]+$ ]] || exit 2
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$out"
"$here/host-context.sh" "$tag-before" >> "$out/host.jsonl"
docker run --rm --pull never --network none --name "tx2-cold-probe-$tag" --cpuset-cpus "$cpu" --memory 1g --memory-swap 1g \
  -v "$here:/cold:ro" node:22.23.2-bookworm-slim node /cold/cold.mjs "$reps" "$mode" "$gaps" "$tag" | gzip -9 > "$out/cold-$tag.json.gz"
"$here/host-context.sh" "$tag-after" >> "$out/host.jsonl"
