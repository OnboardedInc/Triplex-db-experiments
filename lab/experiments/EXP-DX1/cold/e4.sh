#!/usr/bin/env bash
# [COLD-1] Why: one session, plain controls around each candidate: which kind of disk activity during the gap removes the
# first-durable-write premium (a guest write sentinel, a guest read sentinel, a write sentinel on the Mac itself).
# usage (under with-lock.sh): e4.sh OUT_DIR REPS
set -euo pipefail
out=${1:?}; reps=${2:-30}
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$out"
docker volume create tx2-cold-disk >/dev/null
probe() { # tag
  "$here/host-context.sh" "$1-before" >> "$out/host.jsonl"
  docker run --rm --pull never --network none --name "tx2-cold-disk-$1" --cpuset-cpus 1 --memory 512m --memory-swap 512m \
    -v tx2-cold-disk:/probe -v "$here:/cold:ro" node:22.23.2-bookworm-slim node /cold/disk.mjs /probe/wal.bin "$reps" "${COLD_DISK_GAPS:-0,5,10,20,30,40,50,60,70,80,100,150,250,500,1000,2000}" "$1" | gzip -9 > "$out/disk-$1.json.gz"
  "$here/host-context.sh" "$1-after" >> "$out/host.jsonl"
}
probe 1-plain
docker run -d --pull never --network none --name tx2-cold-sentinel-w --cpuset-cpus 4 --memory 256m --memory-swap 256m \
  -v tx2-cold-disk:/probe -v "$here:/cold:ro" node:22.23.2-bookworm-slim node /cold/sentinel-write.mjs /probe/sentinel.bin 10 >/dev/null
sleep 2; probe 2-guest-write; docker stop -t 5 tx2-cold-sentinel-w >/dev/null; docker logs tx2-cold-sentinel-w >> "$out/sentinels.jsonl" 2>&1 || true; docker rm -f tx2-cold-sentinel-w >/dev/null
probe 3-plain
docker run -d --pull never --network none --name tx2-cold-sentinel-r --cpuset-cpus 4 --memory 256m --memory-swap 256m \
  -v tx2-cold-disk:/probe -v "$here:/cold:ro" python:3.13-slim python3 -I /cold/sentinel-read.py /probe/read.bin 10 >/dev/null
sleep 4; probe 4-guest-read; docker stop -t 5 tx2-cold-sentinel-r >/dev/null; docker logs tx2-cold-sentinel-r >> "$out/sentinels.jsonl" 2>&1 || true; docker rm -f tx2-cold-sentinel-r >/dev/null
probe 5-plain
python3 -I "$here/host-sentinel.py" "$out/host-sentinel.tmp" 10 100000 >> "$out/sentinels.jsonl" & hs=$!
sleep 2; probe 6-host-write; kill "$hs" 2>/dev/null || true; wait "$hs" 2>/dev/null || true; rm -f "$out/host-sentinel.tmp"
probe 7-plain
