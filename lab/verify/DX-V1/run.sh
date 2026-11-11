#!/usr/bin/env bash
# [DX-V1-R2] Why: run the repaired claim gates and require the exact new counterexamples.
# Rejected: counting obsolete first-round characterization failures as current evidence.
set -euo pipefail
cd "$(dirname "$0")/../../.."
out=lab/verify/DX-V1/round2
DX_V1_ASSERT_CLAIM=1 node --experimental-strip-types --test lab/verify/DX-V1/adversarial.test.ts > "$out/final-claims.log" 2>&1
node --experimental-strip-types --test "$out/attacks.test.ts" "$out/reader-probes.test.ts" > "$out/final-checks.log" 2>&1
rc=0
DX_V1_R2_ASSERT_CLAIM=1 node --experimental-strip-types --test "$out/attacks.test.ts" > "$out/final-counterexamples.log" 2>&1 || rc=$?
[[ $rc == 1 ]]
[[ $(rg -c '^not ok' "$out/final-counterexamples.log") == 3 ]]
for finding in R2-A R2-B R2-C; do
  rg -q "^not ok [0-9]+ - $finding:" "$out/final-counterexamples.log"
done
node "$out/check-numbers.mjs" > "$out/builder-numbers.json"
