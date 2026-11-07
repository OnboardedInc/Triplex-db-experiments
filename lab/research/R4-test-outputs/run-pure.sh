#!/bin/bash
# Pure (engine-less) test runs for R4. Writes raw outputs next to this script.
cd /Users/sam/projects/triplex-db-2
OUT=lab/research/R4-test-outputs
for spec in "core:@triplex-build/triplex" "xtdb:@triplex-build/triplex-xtdb" "qlever:@triplex-build/triplex-qlever"; do
  name=${spec%%:*}; pkg=${spec#*:}
  s=$(date +%s)
  pnpm --filter "$pkg" test > "$OUT/$name-test.txt" 2>&1
  echo "exit=$? seconds=$(( $(date +%s)-s ))" > "$OUT/$name-test.exit"
done
echo done > $OUT/pure.done
