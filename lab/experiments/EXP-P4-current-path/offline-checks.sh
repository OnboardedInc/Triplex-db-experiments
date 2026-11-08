#!/bin/bash
# EXP-P4 offline checks (no engine): the harness end to end on the in-process `memory` source, then two negative
# controls that must make the O-REPLAY gate FAIL. Outputs go to the durable EXP-P4 folder.
#   bash lab/experiments/EXP-P4-current-path/offline-checks.sh <out-root>
set -eu
root="${1:?out root}"
here="$(cd "$(dirname "$0")" && pwd)"
common=(--lane xtdb --source memory --subjects 400 --gate-sample 40 --timing-pulls 150 --closed-levels 1 --closed-s 1)
# [EXP-P4] Why: the shell gate must enforce both process status and semantic verdicts.
# Rejected: printing mutant results without assertions (silently passes a broken detector).
run() {
  name="$1"
  expected="$2"
  shift 2
  status=0
  node "$here/p4.ts" "${common[@]}" --out "$root/$name" "$@" > /dev/null 2>&1 || status=$?
  node --input-type=module - "$root/$name/p4-report.json" "$expected" "$status" <<'JS'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
const [file, expected, exit] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
assert.equal(r.status, expected);
assert.equal(r.oracle?.status, expected);
assert.equal(Number(exit), expected === 'PASS' ? 0 : 1);
if (expected === 'FAIL') {
  assert.ok(r.oracle.perArm.h1.mismatchedPulls > 0, 'mutant must produce oracle-visible wrong answers');
  if (r.mutant === 'drop-retracts') assert.equal(r.stages.at(-1).timing, undefined, 'rejected stage must not be timed');
} else {
  assert.ok(r.stages.every(s => s.oracle?.status === 'PASS' && s.timing));
}
assert.ok(fs.existsSync(file.replace('p4-report.json', 'gate-observations.json.gz')));
const raw = zlib.gunzipSync(fs.readFileSync(file.replace('p4-report.json', 'pulls.jsonl.gz'))).toString().trim().split('\n').map(JSON.parse);
assert.ok(raw.some(x => x[0] === 'gate' && typeof x[5] === 'string'));
console.log(file, r.status, 'exit', exit, 'oracle pulls', JSON.stringify(r.oracle.perArm));
JS
}
run offline-pass PASS --gate-pulls 1500 --gate-engine-pulls 300 --eligibility --cut-s 4
run offline-mutant-drop-retracts FAIL --gate-pulls 800 --stages d1,d3 --mutant drop-retracts
run offline-mutant-serve-ineligible FAIL --gate-pulls 300 --stages d1,d3 --eligibility --cut-s 2 --mutant serve-ineligible
