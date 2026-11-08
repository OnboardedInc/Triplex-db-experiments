#!/bin/zsh
# EXP-X05 measurement on engines already up (run.sh or by hand): the full plan, then two burst-only trials
# (normal-size commands at the burst rate, then a second 20-60 KB trial), then release writer, follower and volume.
# The driver replaces a follower whose ingestion stopped and records the incident. Exit 3 leaves the engines up.
set -u
WT=${X05_CHECKOUT:-/Users/sam/projects/triplex-db-2/.claude/worktrees/agent-a5b9cf52579902ee0}
cd "$WT" || exit 1
export TX2_CONFIG_DIR="$WT" TX2_HOLDER=EXP-X05-xtdb-read-follower
D=lab/experiments/EXP-X05-xtdb-read-follower/driver.mjs
node $D > runs/X05/full.out 2> runs/X05/full.err || { echo "FULL-FAILED (engines left up)"; exit 3; }
echo "FULL-OK"
node $D --phases burst --burst-kind small --subjects 20000 --active 400 > runs/X05/burst-small.out 2> runs/X05/burst-small.err || { echo "BURST-SMALL-FAILED (engines left up)"; exit 3; }
echo "BURST-SMALL-OK"
node $D --phases burst --burst-kind large --subjects 20000 --active 400 --seed x05-v1-trial2 > runs/X05/burst-large2.out 2> runs/X05/burst-large2.err || { echo "BURST-LARGE2-FAILED (engines left up)"; exit 3; }
echo "BURST-LARGE2-OK"
node lab/bin/engine.mjs down --lane xtdb --slot s2 --follower
node lab/bin/engine.mjs down --lane xtdb --slot s2 --remove-volume
echo "RELEASED"
