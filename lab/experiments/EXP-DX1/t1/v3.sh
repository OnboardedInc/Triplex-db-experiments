#!/usr/bin/env bash
# [DX-T1-12] Why: full v3 verdicts need passive quiet admission and room for the unchanged lossless observation spill.
# Rejected: a smoke substitute, a paced trace, deleting unfinished reads, or an active disk sentinel.
set -euo pipefail
prefix=${1:?tx2-dxt1-prefix}; shift
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
root=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}
out=$root/$prefix-admission
mkdir "$out"
git rev-parse HEAD > "$out/head.txt"
node --import tsx lab/bench/plan.ts "$out/plan.json"
node lab/trace/host-admission.mjs "$out/host-gate.json" || exit 75
export TRIPLEX_BENCH_SPILL_MAX_BYTES=${TRIPLEX_BENCH_SPILL_MAX_BYTES:-30064771072}
python3 - "$out" <<'PY'
import shutil,json,pathlib,sys,os
# [DX-T1-12] Why: reserve the v3 spill's 28-GiB hard cap (including strings/scratch), plus DB/evidence and the 15-GiB floor.
# Rejected: admit at 15 GiB then exhaust the host during a long arm. This is conservative until streaming verification is built.
cap=int(os.environ['TRIPLEX_BENCH_SPILL_MAX_BYTES'])
if cap<=0 or cap>2**53-1: raise SystemExit('invalid spill cap')
free=shutil.disk_usage('.').free; needed=(15+4)*1024**3+cap
pathlib.Path(sys.argv[1],'disk-budget.json').write_text(json.dumps({'freeBytes':free,'spillCapBytes':cap,'requiredBytes':needed,'admitted':free>=needed})+'\n')
if free<needed: raise SystemExit(f'v3 lossless spill requires {needed/1024**3:.2f} GiB free; no containers created')
PY
export DX_NS_PROFILE=v3 DX_MATCH_DURATION_S=5520
exec bash lab/experiments/EXP-DX1/t1/study.sh "$prefix" "$@"
