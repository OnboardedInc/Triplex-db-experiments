#!/usr/bin/env bash
set -euo pipefail
# [DX-B6] Why: check terminal current-attempt outputs before indexing immutable evidence.
# Rejected: fingerprinting logs while their writers still run.
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B6
python3 lab/experiments/EXP-DX1/b6/coverage.py > "$root/coverage.log"
python3 lab/experiments/EXP-DX1/b6/source-audit.py > "$root/source-audit.log"
python3 lab/experiments/EXP-DX1/b6/hash-changes.py > "$root/hash-changes.log"
python3 lab/experiments/EXP-DX1/b6/analyze.py "$root" "$root/write-analysis.json" > "$root/write-analysis.log"
node lab/experiments/EXP-DX1/b6/inventory.mjs > "$root/inventory.log"
python3 lab/experiments/EXP-DX1/b6/evidence-index.py > "$root/evidence-index.log"
cat "$root/evidence-index.log"
