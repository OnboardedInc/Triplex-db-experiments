#!/bin/sh
set -eu
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QG1
ATTEMPT=${1:-2}
cleanup() { node lab/bin/engine.mjs down --lane qlever --slot s1 --holder CX-QG1 --remove-volume > "$EVIDENCE/cleanup-$(date +%s).log" 2>&1; }
trap cleanup EXIT
if [ ! -f "$EVIDENCE/base-10m-attempt2/manifest.json" ]; then
  sh lab/experiments/EXP-QG1-qlever-generations/seed-and-prepare.sh > "$EVIDENCE/seed-attempt2.log" 2>&1
fi
for ARM in M U; do
  FREE_KB=$(df -Pk . | awk 'NR==2 {print $4}')
  [ "$FREE_KB" -ge 5242880 ] || { echo 'host free below 5GiB; no new arm'; exit 1; }
  node lab/bin/engine.mjs up --lane qlever --slot s1 --holder CX-QG1 --exp EXP-QG1 --qlever-memory 1000M --qlever-seed-dir "$EVIDENCE/base-10m-attempt2" > "$EVIDENCE/start-$ARM-attempt$ATTEMPT.log" 2>&1
  node lab/experiments/EXP-QG1-qlever-generations/grid.mjs "$EVIDENCE/grid-$ARM-attempt$ATTEMPT" "$EVIDENCE/base-10m-attempt2" "$ARM" > "$EVIDENCE/grid-$ARM-attempt$ATTEMPT.log" 2>&1
  docker --host "$DOCKER_HOST" logs tx2-qlever-s1 > "$EVIDENCE/server-$ARM-attempt$ATTEMPT.log" 2>&1
  cleanup
 done
