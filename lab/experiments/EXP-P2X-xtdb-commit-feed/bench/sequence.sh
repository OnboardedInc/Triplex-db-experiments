#!/bin/sh
# EXP-P2X measurement sequence. Usage: XTDB_URL=... sh sequence.sh <phase>
# Each step prints one summary line; full receipts land in ../receipts, raw samples in RAW_DIR.
set -u
cd "$(dirname "$0")"
LOG=/Users/sam/Claude/Projects/triplex-db-2/EXP-P2X-xtdb-commit-feed/sequence.log
mkdir -p "$(dirname "$LOG")"
step() {
  echo "[$(date +%H:%M:%S)] start $*" | tee -a "$LOG"
  out=$(node run.mjs "$@" 2>>"$LOG.stderr" | tail -1)
  echo "[$(date +%H:%M:%S)] done $* :: $(echo "$out" | cut -c1-400)" | tee -a "$LOG"
}
case "$1" in
  fresh)
    for arm in C A0 A0q; do step contention --arm $arm --writers 16 --per 30; done
    for arm in A0 C A0 C; do step service --arm $arm --n 150; done ;;
  preload)
    step preload --arm C --commits "${2:-100000}" --batch 1 --concurrency 16 --spread uniform --subjects 10000 ;;
  history)
    for arm in A0 C A0 C; do step service --arm $arm --n 150; done
    for arm in C A0; do step contention --arm $arm --writers 16 --per 30; done
    step trace --arm A0 --seed p2x-a --subjects 10000 --window 300
    step trace --arm C --seed p2x-a --subjects 10000 --window 300 ;;
  crash)
    for v in keyed-atomic unkeyed-atomic keyed-split unkeyed-split; do step crash --variant $v --crashes 100 --commits 400; done ;;
esac
echo "[$(date +%H:%M:%S)] phase $1 complete" | tee -a "$LOG"
