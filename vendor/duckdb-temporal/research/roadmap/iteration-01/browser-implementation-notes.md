# Independent typed browser reference implementation

Checkpoint: 2026-10-30 19:14 UTC. Browser implementation, independent corrective
review and final reruns are complete. The three additive files are stable for
coordinator preservation; no source writer or operation is pending. This is not
item 1 completion, native
conformance, storage/migration acceptance, rendered UI verification or deployment.

## Scope and source

The coordinator confirmed the exact final baseline on draft PR 7 at
`fcc3e71f0aa49069dd35384bf17f008421696e4d` before authorizing this isolated work.
Working copy: `/workspace/scratch/497cfb3c035e/temporal-roadmap-20261030/implementation`.

Only these additive site files were created:

| File | SHA-256 |
| --- | --- |
| `site/dist/engine-v2.js` | `a564d71d3714f5db39110409a85e3f758371bed8ffbfb56ce826719328ea27bd` |
| `site/tests/typed-engine.test.mjs` | `e142d3f8b8321453d7a273e1424b324726acb72f33ba127276d74feb6bd582a5` |
| `site/tests/typed-fixtures.json` | `247e80d77a51f3a6287f40b078c5b090690992a64b15101779e64a006a796edf` |

All 218 manifest files in each original and frozen export match their manifest.
All ten pre-existing site files are byte-identical across original, frozen and
implementation copies. In
particular, `site/dist/engine.js` remains SHA-256
`512f272bd3f5dff7940df4f7314c170293ac9fd9a501ed002f18ac9f3eccc2a1`.
The new fixture file is a byte-identical copy of the research browser-contract
corpus. Its original status describes the provenance of its expectations, not
the execution status of the new implementation checks recorded here.

No Git staging, commit, branch/ref, PR, Page, Site, deploy, Codex task or
user-computer action was performed by this workstream. The coordinator owns
durable publication. Original prototype and frozen source were not edited.

## Genuine API and independence

```javascript
import {evaluateV2} from './site/dist/engine-v2.js';
evaluateV2(program, facts, validAt, knownAt, limits = {});
// synchronous: {rows, rounds, derived_facts, work, active}
```

No adapter is necessary for the prepared browser harness. Facts use exact plain
records with `e,a,v,valid_from,valid_to,tx_from,tx_to`; tagged values require
exactly `t,v`. Identifiers and string values are NUL-free Unicode scalar text.
All i64 payloads and all clock coordinates are canonical signed-int64 decimal
strings. Small integer coordinates are strings too, not Numbers. Internally they
are checked directly as BigInt without conversion through Number or wrapping.
Outputs contain tagged JSON cells with decimal strings, never raw BigInt.

The module retains the old JS reference's deliberately naive full-relation
scans and simultaneous pending rounds. It does not import the native evaluator,
use its algorithms, or use its compact-ID/index/semi-naive execution path.
Typed cells, explicit tag/payload equality, injective tagged tuple keys and
semantic sorting replace untagged string operations. Native and browser
counters are not claimed to be equal.

Selected contract: str/bool/i64/finite-f64; no cross-tag coercion; float negative
zero normalizes; subnormals remain; strings sort by exact UTF-8 bytes, followed
by boolean, signed integer and finite-numeric tag order. Every derived position
retains its tag. Text literals retain existing quoting/escaping and add strict
booleans/numbers with a 128-byte numeric token ceiling, complete consumption,
int64 checks and nonzero-underflow/overflow rejection. Other type families and
future expressions/negation/aggregates remain unsupported.

Every supplied row validates before snapshot exclusion. Limits accept only
positive safe-integer `facts,rounds,work`, clamped down to fixed ceilings.
Program/row/arity/body/variable/binding/input/symbol/tuple/output guards remain
bounded; numeric payloads, canonical keys and metadata consume budget too.
Output is returned only after complete saturation and bounded materialization;
errors throw stable `TD_E_*` markers and never expose partial rows. These are
reference admission guards, not complete process-memory/cancellation accounting
or a claim to have completed roadmap item 6.

## Actual verification

Node v24.22.1, no dependency installation. Commands below use only the isolated
copy; replace the absolute root consistently if reproducing elsewhere.

```sh
ROOT=/workspace/scratch/497cfb3c035e/temporal-roadmap-20261030
cd "$ROOT/implementation/site"
npm run check
node --check dist/engine-v2.js
node --check tests/typed-engine.test.mjs
npm test
node --test tests/typed-engine.test.mjs
node "$ROOT/test-prep/browser-contract/run-contract.mjs" \
  --engine "$ROOT/implementation/site/dist/engine-v2.js"
```

- Final unchanged external browser harness: **122 checks passed**, no adapter.
- Final full suite: **96 groups passed**, including all 25 old v1 groups and
  71 typed groups. No skips or failures.
- Final explicit v1-only run: **25 groups passed**, no skips/failures.
- Final typed-only run: **71 groups passed**, no skips/failures.
- Additional bounded adversarial boundary review: **10 groups passed**.
- Legacy syntax script and explicit new module/test syntax checks passed.
- Source audit verified ten old site files unchanged, exactly three additive
  files, byte-identical shared fixture/harness data, and all 218 manifest files
  unchanged in each original/frozen export.

Earlier historical green runs were 89 aggregate/64 typed before independent
review exposed two direct-JS admission defects. Their logs remain as historical
evidence and are not substituted for the final 96/71 runs.

Typed coverage includes all four tag combinations, every cell of arity-eight
derived tuples, mutual/nonlinear recursion and rule-order invariance; 1,000
deterministic finite binary64 patterns and 512 full-width signed-i64 samples;
ties-to-even, subnormal/finite extremes, signed-zero normalization and strict
literal tokens; full-range half-open clocks on both axes; Unicode byte order,
malformed/invisible/sparse records and all-or-error cap/allocation rejection
followed by a healthy independent query. Generated samples are finite tests,
not a proof over every possible value/program.

Raw evidence in this directory:

- `browser-v2-syntax-1839.log`
- `browser-v2-contract-initial-1839.log`
- `browser-v2-full-suite-initial-1843.log`
- `browser-v1-syntax-1844.log`
- `browser-v2-typed-only-1844.log`
- `browser-v2-source-audit-1844.json`
- `browser-fix-1908/HANDOFF.md`: final commands, results and source hashes
- `browser-fix-1908/verification-summary.json`: exit statuses for every final gate
- `browser-fix-1908/full-suite.log`: final 96 groups
- `browser-fix-1908/browser-fix-v1-only.log`: final unchanged 25 groups
- `browser-fix-1908/typed-only.log`: final 71 groups
- `browser-fix-1908/external-contract.log`: final unchanged 122 checks
- `browser-fix-1908/boundary-review.mjs` and `.log`: 10 additional adversarial groups
- `browser-fix-1908/source-and-baseline-audit.json`: final source/export audit
- `browser-fix-1908/pre-fix-repros.log`: retained failures before correction

## Corrective review and remaining boundaries

The first confirmed direct-JS defect was in `normalizeFacts`: `Array.from(facts, ...)` consumed a
caller-supplied iterator after checking only the array's declared length. A
custom iterator can hide a malformed indexed row or supply more rows than that
length. The JSON fixture path does not reproduce this, which is why the first
122/89 checks passed. The completed correction reads each own numeric index's
data descriptor in a bounded loop over one validated length snapshot, rejecting
holes/accessors without calling an iterator or indexed getter. The second
confirmed defect was a descriptor-check/property-read race: a Proxy could change
an f64 payload between finite validation and normalization, admitting NaN.
`requireRecord` now snapshots each own data descriptor exactly once and its two
callers use that validated snapshot. Seven regression groups cover these cases.
A separately pinned Sol/max worker completed the bounded correction, review and
all final reruns. No additional clear correctness issue was found.

Standard reflection can necessarily execute a Proxy's reflection traps; this is
not an arbitrary hostile-JavaScript sandbox or complete process isolation.

Native C API v2/binding/SQL/store/migration
work is independently owned and not inferred from these browser results.
No deployed UI imports this new module yet, intentionally.
