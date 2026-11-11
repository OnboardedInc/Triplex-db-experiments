#!/usr/bin/env bash
set -euo pipefail
prefix=${1:?}
[[ $prefix =~ ^tx2-dxb10-[a-z0-9-]+$ ]] || exit 2
# [DX-B10] Why: run the load generator on VM CPUs 4–7, writing disposable seed logs to its own volume.
# Rejected: Mac forwarding as a throughput measurement.
if [[ ${B10_RESTART_NORMAL:-0} == 1 ]]; then
 bash lab/experiments/EXP-DX1/b10/gateways.sh "$prefix" 0
fi
docker volume create "$prefix-driver" >/dev/null
# [DX-B10] Why: sample owned CPU use during the single seed comparison for a quick bottleneck check.
# Rejected: repeating the timed run just to diagnose a small window speedup.
(while sleep 15; do
 docker stats --no-stream --format '{{.Name}} cpu={{.CPUPerc}} memory={{.MemUsage}}' "$prefix-tx" "$prefix-gw-w" "$prefix-gw-r" "$prefix-driver" || true
done) & sampler=$!
trap 'kill "$sampler" 2>/dev/null || true; wait "$sampler" || true' EXIT
docker run --rm --pull never --name "$prefix-driver" --network "$prefix-net" --cpuset-cpus 4,5,6,7 --memory 5g --memory-swap 5g \
 -v "$PWD:$PWD:ro" -w "$PWD" -v "$prefix-driver:/driver" \
 -e DATOMIC_URL="http://$prefix-gw-w:8080" -e DATOMIC_READ_URLS="http://$prefix-gw-r:8080" \
 -e TRIPLEX_DATOMIC_LAYOUT=lean -e TX2_W0_COUNT_CONCURRENCY=64 -e TX2_SWEEP_STRICT=1 \
 node:22.23.2-bookworm-slim node --experimental-strip-types lab/experiments/EXP-DX1/b10/seed-probe.ts
