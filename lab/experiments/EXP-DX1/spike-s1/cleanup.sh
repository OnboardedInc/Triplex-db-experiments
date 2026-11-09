#!/bin/bash
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
OUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1
# [DX-S1] Why: select and recheck names before destructive cleanup. Rejected: broad Docker prune (could remove other work).
for name in $(docker ps -a --format '{{.Names}}' | awk '/^tx2-dxs1-/'); do
  case "$name" in tx2-dxs1-*) docker rm -f "$name";; *) exit 1;; esac
done
for name in $(docker network ls --format '{{.Name}}' | awk '/^tx2-dxs1-/'); do docker network rm "$name"; done
for name in $(docker volume ls --format '{{.Name}}' | awk '/^tx2-dxs1-/'); do docker volume rm "$name"; done
docker ps -a > "$OUT/final-containers.txt"
docker network ls > "$OUT/final-networks.txt"
docker volume ls > "$OUT/final-volumes.txt"
