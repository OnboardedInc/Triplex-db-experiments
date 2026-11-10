#!/usr/bin/env bash
# [DX-B7] Why: overlap independent correctness cases while a shared proxy bounds physical VM connections.
# Rejected: exceeding the 15-minute lease or reducing scenario counts.
set -euo pipefail
prefix=${1:?prefix}; layout=${2:?layout}; shift 2
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B7
node lab/experiments/EXP-DX1/b7/gate-proxy.mjs 8516 8517 "$root/$prefix-proxy-ready.json" "$root/$prefix-proxy.json" & proxy=$!
cleanup(){ kill "$proxy" 2>/dev/null || true; wait "$proxy" || true; }
trap cleanup EXIT
for ((i=0;i<100;i++)); do [[ -s "$root/$prefix-proxy-ready.json" ]] && break; sleep 0.1; done
[[ -s "$root/$prefix-proxy-ready.json" ]]
export DATOMIC_GATEWAY_URL=http://127.0.0.1:8536 DATOMIC_URL=http://127.0.0.1:8536 DATOMIC_READ_URLS=http://127.0.0.1:8537 DATOMIC_TEST_LAYOUT=$layout
node_modules/.bin/vitest run --maxWorkers 2 --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts "$@"
