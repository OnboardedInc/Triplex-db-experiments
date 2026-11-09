#!/bin/sh
# [EXP-P4N] Why (step c'): the QH1 test files rerun with documents on (P4N_DOCS=1), plus the document-specific tests, in one heavy token.
# usage: g5-gates-docs.sh <logdir>
cd /Users/sam/projects/triplex-db-2/.claude/worktrees/qh1
mkdir -p "$1"
export QH1_RESULT="$1/measurements.json"
run() { name=$1; shift; echo "== $name $(date -u +%FT%TZ)" >> "$1/index.txt" 2>/dev/null; }
L="$1"
echo "== docs-on $(date -u +%FT%TZ)" >> "$L/index.txt"
P4N_DOCS=1 node_modules/.bin/vitest run --config lab/verify/QH1/vitest.config.ts h1decode.test.ts validfrom.test.ts codec.test.ts domain.test.ts route.test.ts public.test.ts real.test.ts workercache.test.ts reach-cut.test.ts oreplay.test.ts docs.test.ts > "$L/vitest-docs-on.log" 2>&1; echo "vitest-docs-on exit $?" >> "$L/index.txt"
echo "== docs-off $(date -u +%FT%TZ)" >> "$L/index.txt"
node_modules/.bin/vitest run --config lab/verify/QH1/vitest.config.ts h1decode.test.ts validfrom.test.ts codec.test.ts domain.test.ts route.test.ts public.test.ts real.test.ts workercache.test.ts reach-cut.test.ts oreplay.test.ts > "$L/vitest-docs-off.log" 2>&1; echo "vitest-docs-off exit $?" >> "$L/index.txt"
