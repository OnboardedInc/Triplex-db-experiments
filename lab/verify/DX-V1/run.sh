#!/usr/bin/env bash
# [DX-V1] Why: retain successful characterization checks AND the three expected failed claim assertions.
# Rejected: treating any nonzero test exit, an old log, or a generic failed import as reproduction.
set -euo pipefail
cd "$(dirname "$0")/../../.."
out=lab/verify/DX-V1
node --experimental-strip-types --test "$out/adversarial.test.ts" > "$out/fresh-characterization.log" 2>&1
rc=0
DX_V1_ASSERT_CLAIM=1 node --experimental-strip-types --test "$out/adversarial.test.ts" > "$out/fresh-claim-regressions.log" 2>&1 || rc=$?
[[ $rc == 1 ]]
[[ $(rg -c '^not ok' "$out/fresh-claim-regressions.log") == 3 ]]
for finding in F1 F2 F3; do
  rg -q "^not ok [0-9]+ - $finding:" "$out/fresh-claim-regressions.log"
done
node --experimental-strip-types --test \
  lab/experiments/EXP-DX1/r3/recent.test.ts \
  lab/experiments/EXP-DX1/r3/prepared.test.ts \
  lab/experiments/EXP-DX1/r3/expectation.test.ts \
  lab/experiments/EXP-DX1/r3/read-records.test.ts \
  lab/experiments/EXP-DX1/r3/spill-thread.test.ts \
  lab/experiments/EXP-DX1/r3/inline-clock.test.ts \
  lab/experiments/EXP-DX1/r3/lifecycle.test.ts \
  lab/experiments/EXP-DX1/r3/turn.test.ts > "$out/fresh-existing-tests.log" 2>&1
node --experimental-strip-types lab/experiments/EXP-DX1/r3/replay.ts \
  /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R1/tx2-dxr1-1000-d/pages > "$out/fresh-recorded-replay.log" 2>&1
node --experimental-strip-types "$out/split-audit.ts" > "$out/split-audit.json"
