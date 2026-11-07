# Item 2 native-core implementation handoff

**Native source write ownership released to the coordinator at 2026-10-30 21:09:38 UTC.** No further repository edits are planned by this worker. This is direct-core evidence, not a declaration that item 2 or the ten-item roadmap is accepted.

## Selected target and preservation

- Final contract SHA-256: `56c7b0c54670d95c4b012e925e8d931963951129663f49f94e58d6ed76950180`.
- The coordinator reported the completed preimplementation research snapshot remotely verified on private main commit `2a6a74b68ae2dbb594d8cef959df6f299574b398`, archive SHA `ccf3b1fab0df997019cab4803977ff49fd791e0c1f606c6d360f534959eb94ab`.
- Accepted iteration-1 source was read-only at `temporal-roadmap-20261030/accepted-iteration-01`. Original/frozen source was not changed.
- No Codex task, installation/download, Git write, PR/Page/Site write, deployment, binding/version edit, storage edit, browser edit, old-test edit, or public-header edit was performed by this worker.

The immutable `checkpoint-first/` contains six core source/header files. `checkpoint-final/` contains those same six files plus the two new tests/runner. **All six core/header bytes are identical between first and final checkpoints.** The final manifest SHA is `fda8a7867b66461c647b8ca9909d17df6b5c1feea9333fcb2b42d63b364d1790`.

## Changed source owned by this worker

| File | Purpose |
|---|---|
| `engine/src/temporal_core.cpp` | Typed-only infix parsing/grounding/admission; checked-entry guards; full-match and seed filters before head dedup; bitwise public float identity/order |
| `engine/src/temporal_value_domain.hpp` | Bitwise float validation, zero canonicalization, and typed interning |
| `engine/src/temporal_float.hpp` (new private) | IEEE bits and supported Linux x86-64 x87/MXCSR control checks; build-assumption rejection |
| `engine/src/temporal_expression.hpp` (new private) | Bounded owned postfix IR, fixed stack, checked arithmetic/comparison, work precharge |
| `engine/tests/test_expression_core.cpp` (new) | Focused syntax/value/error/cap/work/FP-state/recursion/temporal/fuzz checks and declarative corpus adapter hook |
| `engine/tests/run_expression_core.py` (new) | Strict offline reproducible core compilation, optional independent arithmetic/decimal corpora, exact default-environment differential |

Public `temporal_core.hpp` and `temporal_typed_core.hpp` retain their exact accepted bytes and signatures. Other source changes visible in the shared checkout belong to the coordinator/other assigned workers, not this handoff.

## Implementation properties

- Only typed body filters gain `= != < <= > >=`, arithmetic `+ - * /`, computed unary minus, and arithmetic parentheses. Existing predicate identifiers are not reserved. Relational/head terms stay simple.
- Adjacent signed MIN remains a literal. Exponent signs and compact arithmetic are handled separately. Booleans use their own keyword path; `true+1` and `false-true` are valid-grammar deferred type faults, not premature numeric-token errors.
- Every filter/head variable must be independently grounded by positive relational atoms. Filters bind nothing, create no deltas, and never intern numeric results.
- Each filter compiles once to owned postfix instructions. Runtime uses a fixed 32-cell stack of borrowed string pointers or inline scalar payloads. There is no candidate-loop parsing, heap allocation, owned string copy, or temporary interning in filter evaluation.
- The existing shared indexed/semi-naive kernel remains in use. Filters execute only at a complete relational match, before seen/pending head checks. A false filter does not skip later checks. Ground filter-only rules evaluate their single empty-binding candidate before seeding.
- Structural/literal admission checks remain separate from deferred arithmetic/type faults. No constant folding executes expressions during admission.
- Separate 16-positive-atom/16-filter caps; 256 filter nodes/rule; 4,096/program; height 32 including comparison; parenthesis/computed-unary nesting 32. Ordinary head/relational terms do not consume new AST budgets.
- Full filter node count is charged once before evaluation, with summed UTF-8 byte work before same-string comparisons. New filter-work exhaustion reports `TD_E_EXPR_LIMIT` with max-work context; old tuple-candidate diagnostics/counters remain unchanged.
- Integer arithmetic checks each node using defined overflow checks; division truncates toward zero with prior zero and MIN/-1 checks. No numeric coercion or bool ordering.
- Float arithmetic checks each binary64 node; finite subnormals remain admitted, nonzero multiply/divide rounding to zero errors, and exact cancellation/zero operands become +0. Output equality/order/admission/interning use integer bits.
- Typed construction-before-parse, add, and run reject unsupported x87/MXCSR rounding/masks/FTZ/DAZ without changing host controls. Sticky status is ignored. Internal arithmetic has a documented checked-entry precondition; no independently callable public arithmetic API was added.

## Verification actually run

Final **normal and ASan+UBSan** runs both passed on GCC 14.2.0, Linux x86-64, with:

```text
-fno-fast-math -frounding-math -ffp-contract=off -mfpmath=sse -msse2
```

Sanitizers used `-O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer`; leak detection was disabled and is not claimed.

| Campaign | Result per final run |
|---|---|
| Existing legacy core | 500 nonlinear recursive oracle trials and 10,000 bounded parser fuzz cases passed |
| Existing typed core (coordinator's intentional stronger-environment assertion update) | 487 explicit checks, value laws, and 10,000 parser fuzz cases passed |
| New direct/corpus expression checks | 7,621 passed |
| New parser fuzz | 15,000 bounded cases completed cleanly |
| Independent exact-rational arithmetic corpus via actual filter evaluation | 2,060 cases passed, included in the 7,621 |
| Independent decimal corpus | 2,962 applicable literal cases passed; successful numeric cases also tested through expression lexer; included in the 7,621 |
| Exact accepted/current default-environment differential | 16,828 legacy+typed cases matched rows, rounds, derived facts, work, and complete error strings |

The decimal-only corpus's single `true` rejection is explicitly excluded: the full language legitimately admits bool literals. This follows the same domain distinction as the independently reported native decimal research; no numeric expectation was weakened.

Coverage includes full-candidate versus empty-join error behavior; false/fault filter permutations; existing/pending head faults; non-answer-reachable and late recursive faults; no generated active domain; exact node/height/nesting/work boundaries; variable 63; UTF-8 versus UTF-16 ordering; i64 edges; subnormals/overflow/underflow; independent x87/MXCSR rounding and exception masks; DAZ/FTZ; sticky flags; public bit primitives/dictionary under hostile controls; and recovery after rejected add/run entry.

The exact differential uses separate immutable-baseline/current executables, the same deterministic synthetic input generator, and byte-for-byte complete observation comparison. Their full outputs remain in the selected build directories, with hashes in verification reports.

Three unsupported compiler configurations were separately rejected as intended: individual finite-math-only, fast-math, and x87 excess-precision evaluation. Results are in `engine/build/item2-core-build-guards/results.json`.

The compact-Boolean probe additionally compiled against `checkpoint-first` and passed live/empty cases for `true+1`, `false-true`, `false-1e-3`, plus exponent controls. Its source/output are in this directory; equivalent regressions are in the final new test file.

## Evidence locations

- `verified-normal-verification.json`, `verified-sanitized-verification.json`: full commands, source/corpus hashes, outcomes, and differential counts.
- `verified-normal.log`, `verified-sanitized.log`: concise terminal outputs.
- `checkpoint-final/MANIFEST.json`, `checkpoint-final/SHA256SUMS`: stable handoff bytes.
- `setup-failures.json`: retained initial test-source compilation mistake and one intermediate sanitizer command's misspelled baseline path. Both were corrected; the final two campaigns passed. These failures are not hidden or counted as native-feature failures.
- Initial/intermediate logs are retained, including the failed setup run. No first checkpoint was overwritten.

All candidate hashes captured by each final verification report were read back equal to the released source before handoff.

## Reproduce final direct campaign

```sh
python3 engine/tests/run_expression_core.py \
  --build-dir "$PWD/engine/build/item2-core-repeat-normal" \
  --baseline /workspace/scratch/497cfb3c035e/temporal-roadmap-20261030/accepted-iteration-01/engine/src \
  --arithmetic-fixtures /tmp/temporal-roadmap-research/iteration-02/browser/arithmetic-fixtures.json \
  --decimal-fixtures /tmp/temporal-roadmap-research/iteration-02/browser/decimal-fixtures.json
# Repeat with a distinct item2-core-* directory and --sanitize.
```

Without optional corpus paths/baseline, the new runner still executes all three direct test binaries; it does not download inputs or substitute an evaluator shim. It validates the explicit output directory and baseline presence.

## Remaining coordinator acceptance

The coordinator reported a genuine actual-v2 binding build/LOAD and 22 legacy plus 57 typed native integration passes against the unchanged first-checkpoint core. Those are **coordinator-reported**, not rerun here; independent SQL/native, browser, storage, binding sanitizers, reproducibility, and full-path matched performance checks remain the coordinator's acceptance responsibility.

This worker did not run a full-path performance campaign and makes no speedup/nonregression claim. No API stabilization, complete allocation/cancellation accounting, arbitrary functions, dates, table-filter pushdown, production readiness, or completion of later roadmap items is claimed.
