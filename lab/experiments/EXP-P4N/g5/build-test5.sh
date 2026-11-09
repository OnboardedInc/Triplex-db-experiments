#!/bin/sh
# [EXP-P4N-R2] Why: one heavy token for build, typecheck, retain and the QH1 test list with documents off and on (offline). usage: build-test5.sh <arm> <logdir>
set -u
cd /Users/sam/projects/triplex-db-2/.claude/worktrees/qh1
mkdir -p "$2"
( set -e
  cd packages/core && ../../node_modules/.bin/tsdown && ../../node_modules/.bin/tsc --noEmit
  cd ../qlever && ../../node_modules/.bin/tsdown && ../../node_modules/.bin/tsc --declaration --emitDeclarationOnly --rootDir src --outDir dist && ../../node_modules/.bin/tsc --noEmit
  cd ../.. && node lab/experiments/EXP-P4N/g5/arms5.mjs "$1" ) > "$2/build.log" 2>&1; echo "build exit $?" >> "$2/index.txt"
export QH1_RESULT="$2/measurements.json"
L=lab/verify/QH1/vitest.config.ts
FILES="h1decode.test.ts validfrom.test.ts codec.test.ts domain.test.ts route.test.ts public.test.ts real.test.ts workercache.test.ts reach-cut.test.ts oreplay.test.ts"
P4N_DOCS=1 node_modules/.bin/vitest run --config $L $FILES docs.test.ts p2verdict.test.ts > "$2/vitest-docs-on.log" 2>&1; echo "vitest-docs-on exit $?" >> "$2/index.txt"
node_modules/.bin/vitest run --config $L $FILES > "$2/vitest-docs-off.log" 2>&1; echo "vitest-docs-off exit $?" >> "$2/index.txt"
