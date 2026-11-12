#!/usr/bin/env bash
# [DX-S5] Why: make the full-scale retained-cut verdict reproducible with a fresh namespace for every attempt.
# Rejected: hand-edited long commands that accidentally replay claims or run a different pacing matrix.
set -euo pipefail
attempt=${1:?fresh attempt id}; shift
[[ $attempt =~ ^[a-z0-9-]+$ ]] || exit 2
export S5_POINT_JOURNAL=1 S5_WRITER_CPUS=1,2
export S5_TX_CACHE=${S5_TX_CACHE:-1280m} S5_PG_BUFFERS=${S5_PG_BUFFERS:-768MB} S5_PEER_CACHE=${S5_PEER_CACHE:-384m}
trials='[{"id":"dxs5-gateway32-'$attempt'","mode":"gateway","size":32,"inflight":1,"yieldToWriter":true,"maxWriterYieldMs":50,"r1Size":128,"r1Inflight":16},{"id":"dxs5-local16-'$attempt'","mode":"replica","size":16,"inflight":1,"yieldToWriter":true,"maxWriterYieldMs":100,"r1Size":64,"r1Inflight":8}]'
exec node lab/bin/heavy.mjs --label "DX-S5-activation-$attempt" -- bash lab/experiments/EXP-DX1/r2/window.sh \
 "tx2-dxs5-eval-100000-$attempt" tx2-dxs5-seed-100000-pg-data dxs5-w0-100000-v1 100000 \
 --reuse-seed --activation-at-seed --seed-position 4338757 --seed-fingerprint --publish \
 --publication-id "dxs5-full-$attempt" --publication-size 32 --publication-inflight 1 \
 --publication-yield-writer --publication-yield-ms 50 --r1-publication-size 256 --r1-publication-inflight 32 \
 --reader-mode replica --live --traffic-offset-s 120 --baseline-ms 100000 --live-warmup-ms 10000 \
 --oracle-concurrency 8 --oracle-processes 3 --batch-oracle --verification-pages 4 \
 --candidates --oracle-candidates --publication-trials "$trials" "$@"
