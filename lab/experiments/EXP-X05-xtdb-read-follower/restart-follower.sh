#!/bin/zsh
# EXP-X05: replace a dead follower (R19 1.1: a failed ingestion state is absorbing) and time how long the new one
# takes to be ready and to reach the writer's latest completed tx. Prints one line of JSON.
set -eu
WT=${X05_CHECKOUT:-/Users/sam/projects/triplex-db-2/.claude/worktrees/agent-a5b9cf52579902ee0}
cd "$WT"
export TX2_CONFIG_DIR="$WT" TX2_HOLDER=EXP-X05-xtdb-read-follower
node lab/bin/engine.mjs down --lane xtdb --slot s2 --follower
t0=$(date +%s)
node lab/bin/engine.mjs up --lane xtdb --slot s2 --follower --cpuset-cpus 2,3 --follower-profile small --exp EXP-X05 >/dev/null
t1=$(date +%s)
node lab/experiments/EXP-X05-xtdb-read-follower/catchup.mjs "$t0" "$t1"
