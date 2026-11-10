#!/usr/bin/env bash
# [DX-B5] Why: final exact-cut and mutant gates share a private port guard, never a measurement lock.
# Rejected: a gap between native stacks in which the measurement waiter could claim the same ports.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
guard=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B5/functional-active
mkdir "$guard"
release_guard() {
  if [[ -z $(docker ps -a --filter name=tx2-dxb5- --format '{{.Names}}') && -z $(docker network ls --filter name=tx2-dxb5- --format '{{.Name}}') && -z $(docker volume ls --filter name=tx2-dxb5- --format '{{.Name}}') ]]; then rmdir "$guard"; fi
}
trap release_guard EXIT
DX_B5_GUARD_HELD=1 DX_B5_KEEP_GUARD=1 bash lab/experiments/EXP-DX1/b5/differential.sh
bash lab/experiments/EXP-DX1/b5/mutants.sh
