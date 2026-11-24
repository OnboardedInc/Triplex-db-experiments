#!/usr/bin/env bash
set -euo pipefail
# [DX-BM1] Why: run W1's owner head pair on the fresh template (w1/SERVER-OWNER-HEAD.md line 1, db616801b): a first-offer
# pass of the reference arm, then reference and append arms, each on a new copy of the held directory.
# Rejected: putting the copy under the output or log tree (v01/pgdata.ts:83 refuses PGDATA inside scorecard evidence).
# Usage: bench4-owner-head.sh first-offer|run|build [owner-head|owner-head2]
mode=$1
selection=${2:-owner-head}
[[ $EUID == 0 && $(systemd-detect-virt) == none && $mode =~ ^(first-offer|run|build)$ ]]
commit=db616801bb27e493028b38f23e5af521d3d0b403
# [DX-BM1] Why: W1's fix (summarizer counts other event kinds; sampler pins at the saved position), 85fc3a4bd.
if [[ $selection == owner-head2 ]]; then commit=85fc3a4bd915ee173a83eecd394eb72113d7e5ee; else [[ $selection == owner-head ]]; fi
job=/var/tmp/triplex-bm1/bench4/queue/$selection
build=$job/build
held=/mnt/triplex-scale1-pgdata/fresh-a/cluster
seed=/var/tmp/triplex-scale1/decision/attempts/arm-d7-wfix-pool-seed
wal=/mnt/triplex-bench4-wal
copy=$job/pgdata-copy
status=/var/tmp/triplex-bm1/STATUS
if [[ $mode == build ]]; then
  [[ ! -e $build ]]
  mkdir -p "$job"; inputs=$job/build-input; rm -rf --one-file-system "$inputs"; mkdir "$inputs"
  git -C "$inputs" init -q
  git -C "$inputs" fetch -q --no-tags --depth 1 https://github.com/OnboardedInc/Triplex-db-experiments.git "$commit"
  git -C "$inputs" checkout -q --detach FETCH_HEAD
  cd "$inputs"
  exec /var/tmp/triplex-bm1/bench4/base-build/tools/bin/node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/build.ts "$commit" "$build"
fi
cd "$build/repository"
[[ $(git rev-parse HEAD) == "$commit" && -z $(git status --porcelain) && -z $(docker ps -q) && ! -e $copy ]]
export PATH="$build/tools/bin:$PATH" DX_V01_BUILD_RECEIPT="$build/BUILD-v0.1.json" DOCKER_HOST=unix:///var/run/docker.sock
python3 /var/tmp/triplex-bm1/bench4/bench4-retag.py "$build/BUILD-v0.1.json"
export DX_W1_RETIREMENT_PAIR=1 DX_W1_PAIR_OPTION=owner-head PREP1_LOOKUP_EVERY=64
if [[ $mode == first-offer ]]; then
  queue=$job/first-offer-queue-2.txt
  printf '%s\n' "owner-ref cp -a --reflink=never \"\$HELD\" $copy && env DX_RD1_PGDATA_SOURCE=\"\$HELD\" DX_RD1_LADDER=reference DX_RD1_PGDATA=$copy bash lab/experiments/EXP-DX1/v01/study-server.sh $commit \"\$LOGS/oh-out\" \"\$(( \$(date +%s%3N) + 75*60000 ))\" $seed 77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b 1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 fresh per-person-ordered j21-g1 \"\" \"\" \"\" \"\" j25-zgc $wal j21-g1 rolling6; rc=\$?; rm -rf --one-file-system $copy; exit \$rc" > "$queue"
  rm -rf --one-file-system "$job/first-offer-2"
  exec bash lab/experiments/EXP-DX1/ha1/first-offer-dry-run.sh "$queue" "$held" "$job/first-offer-2"
fi
out=$job/run/result
mkdir -p "$job/run"
[[ ! -e $out ]]  # out sits in run/ so its parent never contains the copy (v01/pgdata.ts:83)
deadline=$(( $(date +%s%3N) + 75*60000 ))
trap 'rm -rf --one-file-system "$copy"' EXIT
printf 'item=bench4-%s state=running since=%s next=collect\n' "$selection" "$(date -u +%FT%TZ)" > "$status"
for arm in reference append; do
  cp -a --reflink=never "$held" "$copy"
  DX_RD1_PGDATA_SOURCE="$held" DX_RD1_LADDER="$arm" DX_RD1_PGDATA="$copy" \
    bash lab/experiments/EXP-DX1/v01/study-server.sh "$commit" "$out" "$deadline" "$seed" \
    77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
    1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
    fresh per-person-ordered j21-g1 "" "" "" "" j25-zgc "$wal" j21-g1 rolling6
  rm -rf --one-file-system "$copy"
done
printf 'item=bench4-%s state=terminal since=%s next=collect\n' "$selection" "$(date -u +%FT%TZ)" > "$status"
