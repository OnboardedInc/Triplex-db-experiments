#!/bin/sh
# [EXP-GS12F-R5] Why: retain fresh focused-suite results and source/equality checks. Rejected: replaying round 4 results as new evidence.
set -eu
cd "$(dirname "$0")/../../../.."
evidence=lab/experiments/EXP-GS12F/round5/evidence/attempt-1
export GS12F_EVIDENCE_DIR="$PWD/$evidence/probes/"
export npm_config_store_dir=/Users/sam/projects/triplex-db-2/.pnpm-store
node -e 'const s=require("node:fs").statfsSync("."); if(s.bavail*s.bsize<5*1024**3) throw new Error("less than 5 GiB free")'
python3 lab/experiments/EXP-GS12F/round5/audit.py "$evidence/sources.json"
: > "$evidence/exits.txt"
run() {
 label=$1
 shift
 set +e
 "$@" > "$evidence/$label.log" 2>&1
 result=$?
 set -e
 printf '%s %s\n' "$label" "$result" >> "$evidence/exits.txt"
 return "$result"
}
run core sh -c 'cd packages/core && ../../node_modules/.bin/vitest run'
run bounds node_modules/.bin/vitest run --config lab/experiments/EXP-GS12F/round4/vitest.config.ts
run source-stability python3 lab/experiments/EXP-GS12F/round5/audit.py "$evidence/closeout.json" "$evidence/sources.json"
