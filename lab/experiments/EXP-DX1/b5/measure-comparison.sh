#!/usr/bin/env bash
# [DX-B5-L6] Why: CPU 0-4 stacks exist only under the bounded global window, and cleanup precedes unlock.
# Rejected: returning a resident measured stack to CPU 5 between phases while releasing ownership.
set -euo pipefail
layout=pair
prefix="tx2-dxb5-measure-pair-$(date +%s)"
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
guard=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B5/functional-active
while true; do
  if [[ -e "$guard" ]]; then sleep 5; continue; fi
  if mkdir "$lock" 2>/dev/null; then
    if [[ ! -e "$guard" ]]; then break; fi
    rmdir "$lock"
  fi
  sleep 5
done
started=$(date +%s)
printf '{"id":"DX-B5","prefix":"%s","layout":"%s"}\n' "$prefix" "$layout" > "$lock/owner.json"
cleanup() {
  dxb5_result=$?
  python3 lab/experiments/EXP-DX1/b5/cleanup-measurement.py "$prefix" "$dxb5_result"
}
trap cleanup EXIT
DX5_TX_HEAP=2g DX5_TX_MEMORY=3g DX5_GW_HEAP=1g bash lab/experiments/EXP-DX1/b5/up.sh "$prefix" --cpus-tx 0,1 --cpus-pg 0 --cpus-gw-write 2 --cpus-gw-read 3,4
# macOS has no timeout utility by default: a bounded node supervisor retains the actual exit status.
for dxb5_layout in lean legacy; do
  dxb5_compare=0
  [[ $dxb5_layout != legacy ]] || dxb5_compare=1
  DX_B5_REMAINING=$((840-$(date +%s)+started)) DX_B5_COMPARE_ONLY="$dxb5_compare" DX5_PREFIX="$prefix" DX_B5_LOCK_HELD=1 TRIPLEX_DATOMIC_LAYOUT="$dxb5_layout" node --import tsx --input-type=module <<'JS'
import {spawn} from 'node:child_process';
const child=spawn(process.execPath,['--import','tsx','lab/experiments/EXP-DX1/b5/bench.mjs'],{stdio:'inherit',env:process.env});
const timer=setTimeout(()=>child.kill('SIGTERM'),Math.max(1,Number(process.env.DX_B5_REMAINING))*1000);
child.on('exit',(code)=>{clearTimeout(timer);process.exitCode=code??124;});
JS
done
