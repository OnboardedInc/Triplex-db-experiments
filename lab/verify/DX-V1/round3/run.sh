#!/usr/bin/env bash
# [DX-V1-R3] Why: distinguish repaired claims from precisely reproduced remaining validator failures.
# Rejected: interpreting any nonzero test exit, or this runner's success, as semantic acceptance.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
out=lab/verify/DX-V1/round3
git diff --quiet 59fb16ae -- packages lab/bench lab/experiments/EXP-DX1/r3 lab/acceptance
node -e 'require("fs").writeFileSync(process.argv[1],JSON.stringify({startedAt:new Date().toISOString(),source:"59fb16aef7e74a1c6d2b18dd297803f88765f638",engine:"none",expectedVerdict:"FIX-FIRST"},null,2)+"\n")' "$out/attempt.json"
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec turbo run build --force --filter=@triplex-build/triplex-datomic --filter=@triplex-build/triplex-qualification --filter=@triplex-build/w0 > "$out/build.log" 2>&1
node --experimental-strip-types --test "$out/claims.test.ts" > "$out/claims.log" 2>&1
node --experimental-strip-types --test "$out/temporal.test.ts" "$out/capability.test.ts" > "$out/temporal-capability.log" 2>&1
node --experimental-strip-types --test "$out/read-regressions.test.ts" "$out/reader-probes.test.ts" > "$out/regressions-workers.log" 2>&1
node --experimental-strip-types --test "$out/value-characterization.historical.ts" > "$out/values.log" 2>&1
rc=0
node --experimental-strip-types --test "$out/value-claims.test.ts" > "$out/value-claims.log" 2>&1 || rc=$?
[[ $rc == 1 ]]
[[ $(rg -c '^not ok' "$out/value-claims.log") == 3 ]]
for finding in R3-C1 R3-C2 R3-C3; do rg -q "^not ok [0-9]+ - $finding:" "$out/value-claims.log"; done
runtime=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-V1/round3/runtime/jdk-21.0.13+9-jre/Contents/Home
libs=/Users/sam/Claude/Projects/triplex-db-2/downloads/datomic-pro-1.0.7745/extracted/datomic-pro-1.0.7745/lib
classpath="$libs/clojure-1.12.5.jar:$libs/spec.alpha-0.5.238.jar:$libs/core.specs.alpha-0.4.74.jar"
"$runtime/bin/java" -Xmx128m -cp "$classpath" clojure.main "$out/commit-probe.clj" > "$out/commit.log" 2>&1
"$runtime/bin/java" -Xmx128m -cp "$classpath" clojure.main "$out/scope-probe.clj" > "$out/scope.log" 2>&1
builder=lab/experiments/EXP-DX1/r3
node --experimental-strip-types --test "$builder/round2-corrected.test.ts" "$builder/full-row.test.ts" "$builder/inline-clock.test.ts" "$builder/reader-oracle.test.ts" "$builder/read-records.test.ts" "$builder/spill-thread.test.ts" "$builder/prepared.test.ts" "$builder/turn.test.ts" "$builder/lifecycle.test.ts" "$builder/recent.test.ts" "$builder/expectation.test.ts" > "$out/builder-tests.log" 2>&1
node --max-old-space-size=2048 --experimental-strip-types "$builder/replay.ts" /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R1/tx2-dxr1-1000-d/pages > "$out/replay.log" 2>&1
git diff --quiet 59fb16ae -- packages lab/bench lab/experiments/EXP-DX1/r3 lab/acceptance
node "$out/capture.mjs"
echo 'Reproduced FIX-FIRST: repaired claims pass; exactly three current value-contract assertions fail.'
