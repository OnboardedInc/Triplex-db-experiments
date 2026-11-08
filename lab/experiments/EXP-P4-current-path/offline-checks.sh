#!/bin/bash
# EXP-P4 offline checks (no engine): the harness end to end on the in-process `memory` source, then two negative
# controls that must make the O-REPLAY gate FAIL. Outputs go to the durable EXP-P4 folder.
#   bash lab/experiments/EXP-P4-current-path/offline-checks.sh <out-root>
set -u
root="${1:?out root}"
here="$(cd "$(dirname "$0")" && pwd)"
common=(--lane xtdb --source memory --subjects 400 --gate-sample 40 --timing-pulls 150 --closed-levels 1 --closed-s 1)
node "$here/p4.ts" "${common[@]}" --out "$root/offline-pass" --gate-pulls 1500 --eligibility --cut-s 4 > /dev/null 2>&1
node "$here/p4.ts" "${common[@]}" --out "$root/offline-mutant-drop-retracts" --gate-pulls 800 --stages d1,d3 --mutant drop-retracts > /dev/null 2>&1
node "$here/p4.ts" "${common[@]}" --out "$root/offline-mutant-serve-ineligible" --gate-pulls 300 --stages d1,d3 --eligibility --cut-s 2 --mutant serve-ineligible > /dev/null 2>&1
for d in offline-pass offline-mutant-drop-retracts offline-mutant-serve-ineligible; do
  node -e '
    const r = JSON.parse(require("fs").readFileSync(process.argv[1] + "/p4-report.json", "utf8"));
    const o = r.oracle ?? {};
    console.log(process.argv[2], r.status, "oracle", o.status, JSON.stringify(Object.fromEntries(Object.entries(o.perArm ?? {}).map(([k, v]) => [k, [v.pulls, v.mismatchedPulls]]))), "crossArm", r.crossArm?.mismatches);
  ' "$root/$d" "$d"
done
