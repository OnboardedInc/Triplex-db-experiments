# K01 round-7 offline review: FIX-FIRST

Reviewer CX-VK01. Builder `6f7e11f7`, merged into `verify/K01` at `952bb4fa`.
North star: correct reusable seeds supporting P1-P5; correctness remains the floor under
`lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`. Review authority: Q93a/b, R36 and the
explicit round-7 instruction to cover every stored adapter column. No implementation fix was made.

**Verdict: FIX-FIRST.** Schema-derived coverage closes the omitted-column finding, but the digest's numeric encoding still
admits changed content: `-0` and `+0` hash identically. This is one bounded encoding defect inside the sole granting gate.
The final source-stable rerun confirms three false PASS cases: both zero-sign directions on an assertion and a dynamic
side-table binding. All 89 ordinary per-column mutations refuse. This head is not ready for live promotion yet.

## Finding

### R7-F1 — MEDIUM: G0 loses the sign of a stored zero before hashing

**Location:** `lab/bench/lib/g0.ts:35-51`, consumed by the row hash at `:132-135` and admission at `:169-173`.

The JSON canonicalizer checks finiteness but returns a finite number unchanged. `JSON.stringify` encodes both `-0`
and `+0` as `0`. Thus the exact stored `value_number` is not fully represented in D, even though its column is included.
Changing only that sign in a clone can return **G0 PASS with the source D**. This is an encoding collision before hashing,
not a SHA-256 collision or a missing-column problem.

**Reproduction:** the sign-of-zero cases in [columns-review.test.mjs](columns-review.test.mjs) pin source rows containing
one signed zero, change only `tx_assertions.value_number` to the other zero, then call actual G0 through the extracted
current SQL reader. The symmetric directions cover a source containing ordinary positive zero as well. A dynamic
`tx_query_members.binding_0` variation checks the same scalar encoding on a side-table value. The desired-refusal
assertions remain ordinary failing tests; they are not marked TODO or converted into expected-success tests.

The retained case receipt includes `beforeNegativeZero`/`afterNegativeZero` from `Object.is`, alongside the returned
PASS, D and fresh query log. These witnesses are necessary because JSON evidence would itself print either raw zero
as `0`. Every other field, scope, position, count, schema and endpoint stays the same. `value_identity` stays the same
too: its existing canonical JSON spelling already represents both numeric zeros as `0`.

This distinction is observable in the actual adapter, rather than an invented storage policy. `codecs.ts:88-92` packs
the number without changing its sign, `:115-120` preserves an already numeric value on decode, and `:239-240` returns it
to Triplex callers. `XtdbQueryExecutor.ts:29-37,64-65` likewise preserves it. `XtdbClient.ts:141-164` explicitly protects
negative zero's float8 spelling; `test/client-parameters.test.ts:20-34` checks that mapping. Exact numbered excerpts and
hashes are in [source-audit.json](evidence/review-round7/source-audit.json). Native round-trip execution is not claimed
here; the G0 false PASS is directly executed, and the adapter consequence follows from these primary source paths.

**Proposed fix:** use a lossless, unambiguous scalar encoding before hashing (for example typed nodes including binary64
bits, or a safely tagged negative-zero representation). Cover nested/dynamic values too and avoid a plain string
sentinel that collides with valid stored text. Keep ordinary zero distinct from negative zero, retain refusal of
unsupported values, and regenerate/version existing pins as needed. Add the symmetric and side-table controls. No
process proof or additional admission gate is needed, and no implementation change was made in this review.

## Scope and source binding

Read the builder's `REPORT-round8.md`, embedded PASS audit, implementation and tests. All reviewed implementation
and adapter source files match the builder, as recorded in [source-audit.json](evidence/review-round7/source-audit.json).
The only merge conflict was the reviewer suite. The original controls and exact builder adaptation are retained in
[merge-input](evidence/review-round7/merge-input). The executable retains all nine mutation cases, hung-reader controls
and six publication controls. Fixtures now contain the expanded schema, and partial-scan cases cover all eleven tables.
The old random-ID-positive case now preserves stored IDs: under this round's full-column requirement, changing them
must refuse. It still verifies that row reordering admits after fresh reads. Evidence goes to a new round-7 directory.

## Independent column audit and planted clones

[columns-review.test.mjs](columns-review.test.mjs) discovers declarations separately from G0's TypeScript AST parser:
it extracts `assertionColumns` and SQL declarations directly from the adapter source. It compares the independently
discovered names with G0, requiring exactly **11 tables / 89 declared columns**. It does not generate the mutation domain
from G0's coverage list. [inventory.json](evidence/review-round7/columns/inventory.json) lists every column and declaration
location. No declared column is excluded, so no exclusion is excused as unread.

| Table | Declared columns individually mutated |
| --- | ---: |
| tx_assertions | 23 |
| tx_meta | 3 |
| tx_claims | 6 |
| tx_attempts | 5 |
| tx_query_relations | 7 |
| tx_constraint_graphs | 17 |
| tx_constraint_generations | 4 |
| tx_query_generations | 8 |
| tx_query_members | 4, plus dynamic bindings |
| tx_native_relations | 7 |
| tx_native_relation_attempts | 5 |

Each mutation starts from a new populated source fixture, pins actual `readG0`, changes exactly one column in exactly
one clone row, and calls actual `admitG0` again. Core tables have their expected nonzero counts; every auxiliary table is
populated too. Values are non-null and mutations preserve their primitive type, avoiding an always-null fixture or a
type-error-only refusal. Scope/position mutations may refuse at the scope/count checks; other mutations must reach a
changed digest. Returned PASS would fail the desired-refusal test.

The controls execute the current **extracted `openG0` function**, transpiled without changing its reader logic.
Only its two dynamic module imports are replaced with test-owned clients. The simulated endpoint evaluates scope
filtering, COUNT, pagination and the actual SELECT projection. Thus a dropped SQL projection column can be detected,
as well as a dropped hashing column. This is not native SQL execution or a claim that a JVM clone was started.
Queries, input rows before/after, source pin, refusal and read boundary are retained in
[cases.json](evidence/review-round7/columns/cases.json).

Four additional controls cover dynamic binding addition/change/deletion and a declared sparse NULL changed to a value.
A positive control changes sparse absent-to-explicit-NULL representation, reorders rows, and requires an unchanged D,
the measured endpoint label and eleven new SELECT scans. `SELECT *` retains every returned dynamic column, while
declared absent columns are normalized to NULL. That normalization matches sparse SQL NULL semantics; it does not
discard a returned value or a dynamic binding.

The inventory covers adapter-defined stored columns, including `value_identity`, all IDs, timestamps, transaction and
attempt metadata, constraint/query materializations and native relations. XTDB engine system-time history and physical
index/layout metadata remain outside this position-based logical digest under R36. `_valid_from` in adapter INSERTs
is an engine temporal control, set to the epoch; the application paths and G0 read `FOR ALL VALID_TIME` rather than
using that control as Triplex valid time. The application valid-time columns `valid_from`/`valid_to` are included.
No claim of byte-for-byte identity of all engine files follows from G0.

## Scratch schema guard

[schema-guard-review.mjs](schema-guard-review.mjs) copies the actual schema sources, G0 modules and actual guard test
into isolated scratch roots. It adds an assertion column, a side-table column, and a side table, separately.

There are two controls for each edit. With normal schema derivation, the new field is automatically covered and the
actual independent declaration audit should pass. Then, in a separate scratch copy, it freezes G0's exported coverage to the original list,
modeling exactly a new field that G0 neither covers nor excludes. The unchanged **independent declaration audit** must
fail with process exit 1. The outer control checks that specific failing test, not merely any nonzero command exit.

Adding a column alone should no longer fail: automatically incorporating it is the builder's fix. The deliberate
stale-coverage variant proves the requested failure mode. The three corresponding automatically covered controls
prevent a guard that simply rejects every schema edit from masquerading as coverage. Logs, exact changed inputs and
before/after hashes are in [schema-guard/run.json](evidence/review-round7/schema-guard/run.json). Scratch directories
are removed after retaining their inputs; original schema sources are unchanged.

## Admission and publication audit

[admission-search.txt](evidence/review-round7/admission-search.txt) and
[source-audit.json](evidence/review-round7/source-audit.json) retain the current search and relevant source lines.

| Producer or observation | Disposition |
| --- | --- |
| `admitG0` → `status: PASS` | Only content grant found. Verifies pin/manifest binding, freshly counts/scans every table, checks scope/position before and after, compares D; W0 also requires its oracle. R7-F1 is a scalar-encoding defect inside D |
| `readG0` pin / schema inventory / counts | Establish an expectation or feed the digest; none alone admits a clone |
| `checkXtdb` / measuring driver's `report.seedPath.G0` | Same process and writer endpoint before workers and warm-up; driver awaits actual G0 rather than consuming a saved PASS |
| Golden `qualifiedAt`, `golden.json`, published output | Exclusive new file only after first-start G0, stop/start, second layout/T check and second-start G0 |
| Freeze recipe, C1 tree match, key/build checks, health, quiet/layout/T | Refuse or allow execution to reach G0; matching these observations alone never grants |
| `fresh-state.json`, clone export, seed manifest `complete`, provenance | Operational/descriptive inputs, followed by measuring-process G0; not content-admission receipts |
| Engine/worker readiness | Lifecycle/thread readiness, not seed content admission |
| Golden diagnostic stop object | Stored but not read by the granting path; simulated failed stop diagnostics cannot substitute for G0 |

No additional PASS-producing path was found outside the builder's audit. Golden sequencing controls execute the actual
golden function and G0 with simulated lifecycle hooks. Matching content publishes only after both G0 calls. First or
second D changes, second L or T changes, or recipe failure leave no published file. No real two-start determinism is
claimed by these offline controls.

The round-6 `value_identity` finding is covered by the schema and independently mutated here. Older deleted-code
findings remain retired. R36's harmless findings remain harmless for these specific reasons: V1-F2's stop proof and
R2-F4's failed proof acquisition cannot grant; V1-F3's old settle predicate grants nothing and current T only refuses;
R3-F2's saved C1 pass bit and R4-F1's partial C1 trees cannot replace complete G0; R5-F3's EXPLAIN equality is deleted;
R5-F4's diagnostic CLI status cannot produce an in-process G0 PASS. Full schema coverage removes the omitted-column
counterexample inside G0 without reinstating process evidence as a grant.

## Execution evidence

[run.json](evidence/review-round7/run.json) binds the completed source-stable run to merge `952bb4fa`, Node v22.23.2,
exact source/schema/dependency hashes, argv, log digests and **10,638,675,968 free bytes** at admission (above 5 GiB).
[source-binding.json](evidence/review-round7/source-binding.json) recomputes current/executed equality, builder equality,
all execution log hashes and scratch inputs/log hashes. The TypeScript parser's actual implementation bytes are
unchanged between [parser-input.json](evidence/review-round7/parser-input.json) and that final check.

| Fresh execution | Outcome |
| --- | --- |
| [Implementation/coverage suite](evidence/review-round7/tests.log) | 167/167 pass, exit 0 |
| [Earlier reviewer controls](evidence/review-round7/reviewer.log) | 30/30 pass, exit 0 |
| [Independent column/SQL-reader suite](evidence/review-round7/columns.log) | **95/98 pass, 3 fail**, exit 1; exactly the three sign-of-zero desired-refusal assertions |
| [Scratch schema controls](evidence/review-round7/schema-guard/run.json) | All 6 controls behave as required: 3 covered edits pass the selected guard, 3 stale projections fail it with exit 1 |
| Benchmark TypeScript and six syntax checks | All exit 0 |

All three complete TAP suites have zero skipped, TODO or cancelled cases. There are no spawn errors or signals.
The overall runner exits **1**, preserving the actual desired-refusal failures; it does not reinterpret them as success.
The 89 ordinary mutations, four extra dynamic/sparse negatives, inventory check and fresh-read positive account for
the 95 passing independent cases. The failing cases show G0 itself returned PASS with the pinned D, not a timeout or
an unrelated mock error. The scratch runs intentionally select the existing independent declaration audit by name;
they do not claim the other synthetic mutation tests ran in those modified scratch schemas. All four original guard
tests ran in the complete 167-case suite.

The first heavy wrapper was cancelled while queued, before it started tests: free disk had fallen below 5 GiB.
[queue-cancel.json](evidence/review-round7/queue-cancel.json) retains the observed capacity and exit 143.
The initial capacity read and launch were batched without making launch conditional; the queue was stopped when that
output showed the floor violation. The retry makes the disk check conditional before requesting the heavy semaphore
and checks again inside the admitted runner. No other agent's process or data was touched to obtain capacity.

[development-1](evidence/review-round7/development-1) preserves the first execution. It has 167/167 and 30/30 passes,
95/96 independent passes with the first zero-sign failure, and a scratch-harness failure. A queued job acquired its
token while I was adding that negative control, so its captured source hashes preceded the edit although the child
executed the edited suite. Both exact source states are retained, and this attempt is not adopted as final source-bound
evidence. The scratch harness initially ran all four builder tests after modifying a side column; an unrelated synthetic
edit then failed to find its pristine replacement text, while the target declaration audit passed. I corrected the
review harness to select the actual declaration audit, added the two numeric variations, and reran the complete gate
with finished, unchanged inputs. [rerun-reason.json](evidence/review-round7/rerun-reason.json) records these explicit
reasons. No implementation changed and no failure was silently retried or overwritten.

Reproduction, with sufficient disk, under a new retained evidence attempt:

```sh
node lab/bin/heavy.mjs --label CX-VK01-round7-offline -- node lab/verify/K01/run-review-round7.mjs
```

The runner refuses to overwrite its receipt. The retired 262 process-protocol tests do not apply to the Q93 redesign;
the current implementation suite and all retained current-protocol controls are the relevant rerun.
[SHA256SUMS](evidence/review-round7/SHA256SUMS) covers the report, review tools and retained evidence. Authored files
pass whitespace checks; raw assertion-diff whitespace remains preserved in the negative logs.

## Reviewer PASS/receipt audit before commit (rule 9a)

| Boundary | Content | Freshness | Binding |
| --- | --- | --- | --- |
| Full gate and reported suite totals | Actual statuses and TAP totals; failures stay nonzero. Passing suites require zero exit and no signal/error/failures/skips/TODOs/cancellations | New subprocesses and no-overwrite receipt; cancelled queue and first attempt retained separately | Exact argv, merge head, Node, source/schema/parser/lock hashes, log-byte hashes and admission-time disk |
| Independent column and dynamic mutations | Actual current reader/G0 result; ordinary mutations require refusal, sign-of-zero false PASS makes the desired-refusal tests fail; simulated endpoint identified | New fixture and pin per case, mutated clone then new read | Independently discovered table/column, input rows, scope/counts/position, actual query log and endpoint; signed-zero Object.is witnesses survive JSON evidence |
| Independent positive / sparse normalization | Actual PASS, unchanged D and eleven new SQL scans | New read after source pin and representation/reordering edits | Exact fixture, source G0/reader, expected manifest and measured endpoint label |
| Existing mutation/deadline/publication controls | Actual G0 returns/errors, aborted signal, actual publication file/events; lifecycle hooks explicitly simulated | Fresh pin, reader and isolated publication directory per case | Current extracted golden, manifest/pin, endpoint and expected event order |
| Scratch guard verdict | Expected guard failure must name the independent declaration audit and exit 1; matched covered controls exit 0 | Separate newly created scratch root per edit and coverage mode | Actual copied modules/test, original source hashes, exact edited snapshots and raw child logs |
| Source inventory, checksums and final verdict | Recomputed current/builder/executed hashes and observed outcomes; no historical PASS adopted | Current reads after these executions | Builder and merge IDs, exact artifact paths, explicit simulation/offline limits |

## Open work and limits

The full D now binds exact metadata within a golden lineage, which is appropriate for source/clone identity. Independently
reseeded E1 arms can differ in IDs/timestamps and therefore cannot use raw D equality. The current main rulings now include
**Q93c**, specifying a separate normalized D' for E1. This builder head has not implemented D'; that is follow-on work,
not evidence of a clone-content bypass. Do not treat this offline review as E1, PAIR-0 or performance qualification.

No real Docker/daemon/service request, volume, engine slot, container lifecycle or resident change occurred. No implementation
fix, dependency install, main-checkout edit, merge into main or push occurred. The only shared reservation is the heavy-test
semaphore. Actual SQL sparse representation/paging/cancellation, two JVM starts, W0/P5 integration and latency remain
unverified. Fix R7-F1 and rerun the controls before promoting this head to ACCEPT-OFFLINE for the live two-start run.
