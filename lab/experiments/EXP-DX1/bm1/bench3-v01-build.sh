#!/usr/bin/env bash
set -euo pipefail

# [DX-BM1] Why: let each named benchmark bind its exact build and image IDs.
# Rejected: testing a new checkout against packages or mutable tags from the prior arm.
root=$1
item=$2
pin=$3
[[ $root == /var/tmp/triplex-bm1/bench3 && $EUID == 0 && $(systemd-detect-virt) == none ]]
[[ $item =~ ^[a-z][a-z0-9-]+$ && $pin =~ ^[a-f0-9]{40}$ ]]
export DOCKER_HOST=unix:///var/run/docker.sock GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0
runner=$root/rolling-build/tools/bin/node
job=$root/queue/$item
build=$job/build
if [[ -f $build/BUILD-v0.1.json ]]; then
  [[ $(git -C "$build/repository" rev-parse HEAD) == "$pin" ]]
  exit 0
fi
[[ -z $(docker ps -q) && ! -e $build ]]
df -Pk "$root" | awk 'NR==2 {exit ($4 < 5242880)}'
mkdir -p "$job"
inputs=$job/build-input
mkdir "$inputs"
git -C "$inputs" init -q
git -C "$inputs" fetch --no-tags --depth 1 https://github.com/OnboardedInc/Triplex-db-experiments.git "$pin"
git -C "$inputs" checkout --detach FETCH_HEAD
[[ $(git -C "$inputs" rev-parse HEAD) == "$pin" ]]
cd "$inputs"
exec "$runner" --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/build.ts "$pin" "$build"
