# K01 round-8 offline review: FIX-FIRST

Reviewer CX-VK01. Reviewed builder `245a49664d6e6def36877bdee1b0ec2e0e0cc919`, merged into `verify/K01` at
`d0ca9e6f`. Read `REPORT-round9.md`, its PASS audit, Q93c, and the actual value/wire/normalization code.
North star: correct reusable seeds supporting P1-P5. Authority remains `lab/SCOPE.md`, `lab/NORTH-STAR.md`,
`lab/TARGETS.md` and Q93a-c; no correctness or contract rule was relaxed.

**Verdict: FIX-FIRST.** R7-F1 is fixed: all three signed-zero controls now refuse changed clones. The new encoder
separates the tested representations it receives. However, a column OID is not always the stored per-row type, and D′ can
erase a journal instant inconsistent with its assigning clock. Two findings below; no implementation fix was made.

Fresh results: **203/203 builder tests, 30/30 earlier reviewer tests, and 98/98 column/SQL-reader tests pass**.
The new independent suite has **53 passes / 4 desired-refusal failures out of 57**. Two failures model upstream type
widening; two execute the inconsistent-instant case through decoded and raw-frame readers. The six scratch schema
controls behave as required. TypeScript and nine syntax checks pass. No test is skipped, TODO or cancelled.

## Findings

### R8-F1 — MEDIUM: raw pgwire column types can already have erased stored numeric widths

**Location:** `lab/bench/lib/g0-wire.ts:20-28,51-54`; the supposedly lossless scalar acceptance is
`lab/bench/lib/g0-values.ts:7-13`.

Postgres.js `.raw()` does preserve its received field bytes and column OIDs. The missing boundary is earlier:
XTDB chooses one pgwire type for the whole result column. In the same pinned, clean XTDB source used in previous
reviews (`c6c19623d90c658c15400fb46dc056f3735ed57b`), `PgType.fromVectorType` collects the union legs and
`unifyPgTypes` widens every all-integer union to Int8 and every all-float union to Float8 (`PgType.kt:1008-1026`).
`IntVector.getLong` widens an I32 value (`IntVector.kt:40`), and `FloatVector.getDouble` widens F32 (`FloatVector.kt:37`).
Dense-union readers delegate to those widening getters (`DenseUnionVector.kt:216-218`). Int8/Float8 text serialization
then prints the widened value (`PgType.kt:203,280`). The prepared/result-type check accepts the same unified type;
it does not expose the original row's union leg (`pgwire.clj:950-970`).

Consequently these states have identical supported wire frames:

| Stored source → stored clone | Observed by G0 on both sides |
| --- | --- |
| tx_attempts.position: I64(1), I64(2) → I32(1), I64(2) | OID 20, bytes `1` and `2` |
| tx_query_members.binding_0: F64(1.5), F64(2.5) → F32(1.5), F64(2.5) | OID 701, bytes `1.5` and `2.5` |

**Reproduction:** the two `D must refuse a changed stored type hidden by XTDB column widening` controls in
[representation-review.test.mjs](representation-review.test.mjs). They apply the pinned source's widening rule,
then run actual `wireRows`, `readG0` and `admitG0` with complete tables/counts. Both return **G0 PASS with the source D**.
All other fields, counts and scope positions remain unchanged. This is a source-derived transport model plus directly
executed G0, **not a live mutation of XTDB storage**. The receipt explicitly marks `sourceInferenceOnly`.
[upstream-source.json](evidence/review-round8/upstream-source.json) preserves exact source hashes, revision and numbered
predicates; the test asserts the relevant source rules before applying the model.

The builder's direct OID-23-versus-20 and OID-700-versus-701 tests pass, but they assume distinct OIDs reach the client.
They do not cover this widening case. This contradicts round 9's claim that those stored widths remain distinct.
Copy/layout checks might independently refuse a physical change; they cannot establish G0's claimed representation
coverage. Changing the value encoder cannot recover information already lost before its input.

**Proposed fix:** obtain a per-row native representation/type discriminator that survives this conversion, or detect
and refuse cases where query/pgwire widening cannot preserve the promised representation. Apply the same discipline
already used to refuse text NaN. Keep the width controls, and qualify the chosen access against pinned XTDB source and
a later live reproduction. Do not treat a result-column OID as proof of every stored row's original type.

### R8-F2 — MEDIUM: D′ normalizes an inconsistent transaction instant into equivalence

**Location:** `lab/bench/lib/g0-normalize.ts:257-264`; `instantIdentity` at `:110-130` checks only identity/value agreement.

For `:_tx/instant`, `row()` replaces `value_datetime` with its recorded-position rank. `instantIdentity` checks that the
stored derived identity equals that value, but neither checks the value against the transaction's actual clock.
The corresponding clock relationship is checked for metadata valid_from (`:227-228`) and change JSON (`:141-155`).

**Reproduction:** the two `Dprime refuses or distinguishes an instant inconsistent with its assigning clock` controls.
Start with equivalent independent seed lineages, then change B's first system instant from **10000 to 42**, and update
its derived `value_identity` to the canonical datetime 42. Keep its recorded_at, claims clock and metadata valid_from
at 10000. Actual `readE1G0` returns a different full D but **the same D′ as the healthy lineage**. This happens through
both the decoded Reader and actual `wireRows` framing. Two complete stable reads occur; there is no source race or
stale receipt in this reproduction. The desired-refusal assertions fail normally.

The assigning source does not permit these cells to disagree: `TriplesLive.ts:514-515` passes the same timestamp to
`metadataInputs` and `adapter.insert`; `transactionMetadata.ts:43-44` writes that instant, and
`XtdbStorageAdapter.ts:439-441` persists the same timestamp as recorded_at/default valid_from. Matching a column name
and its derived identity is insufficient evidence that it contains that source's generated value. This is a missing
assignment-integrity check, rather than a request to compare different legitimate wall-clock instants across seeds.

**Proposed fix:** before normalizing an instant or its identity, require its value to equal the verified clock for that
recorded commit and retain the identity check. Refuse disagreement, or retain it in D′ so it cannot become equivalent.
Keep the decoded and raw-frame controls. Full-D clone admission still refuses this mutation; the defect is in E1
equivalence, not a second clone-admission path.

[normalization-source.json](evidence/review-round8/normalization-source.json) retains the numbered assigning-source and
reserved-namespace excerpts, with their builder-matching hashes.

## Representation coverage and limits

The independent suite changes a value in a complete source/clone read rather than testing `hash(a) != hash(b)` alone.
Its 19 decoded-representation cases and 10 raw-frame cases cover integer versus float, integer magnitude/width,
both zero signs, NaN payload/sign, adjacent finite floats, infinities, booleans/null, bytes and typed-view kinds,
Unicode NFC/NFD and surrogate distinctions, nested values, decimal scale/sign spelling, dates, and offset-bearing
date/time **text**. The encoded before/after witnesses retain NaN/zero bits without another lossy JSON round trip.
These 29 direct representation-separation controls pass. R8-F1 concerns information erased before these frames exist.

| Representation domain | Observed outcome and limit |
| --- | --- |
| Generic Reader numbers/bigints | Binary64 bits and exact integer text differ; -0, NaN payloads and signs are distinguished when those bits reach the encoder |
| Raw scalar OID/bytes | Distinct supplied OIDs and bytes change D, including decimal `1.0`/`1.00`; per-row width fidelity is limited by R8-F1 |
| Strings | Exact code units/bytes retained; NFC versus NFD and offset text remain different; no Unicode normalization applied |
| Generic Date | Epoch milliseconds are tagged distinctly from number/text; different milliseconds differ. A JS Date has already discarded its constructor's offset spelling, so no claim is made to recover it |
| Native NaN, JSON/JSONB, dates/times/intervals | Ten whole-read controls **refuse** unsupported wire types/NaN; they emit no approximate D |

Thus **not every native stored value kind currently has a supported representation-preserving digest**. In particular,
native temporal values with offsets are refused, not demonstrated to produce different D values. The normal N01
application datetime path packs numeric milliseconds, while user offset text remains text. Actual native transport
availability must be established live; the passing codec tests do not certify all XTDB storage representations.

## D′ source audit and caller-value controls

I checked all normalization entries against the named assigning sources, rather than relying on the existence of a
comment/file. The comments correctly identify the intended generated fields; R8-F2 identifies a missing value-level
precondition for using one of them.

| Entries | Source/condition |
| --- | --- |
| Assertion id/_id | Runtime IdGenerator supplies id; adapter persists scope/id composition and normalizer checks it |
| Assertion tx_id/retract_tx_id and claims tx_id | Runtime generates transaction IDs; adapter persists them; transaction names are bound to commit positions |
| Assertion recorded_at/retracted_at and claims recorded_at | Runtime supplies transaction clock; adapter persists it; collect validates per-commit clock consistency |
| Attempt operation_id/attempt_id/_id | Adapter withTransaction generates UUIDs; persist composes storage identity; not caller command IDs |
| Metadata entity_id/default valid_from | Only `_Transaction` rows; metadataInputs assigns txId/default clock; valid_from is checked against recorded_at |
| Metadata instant/change and derived identities | Only the exact reserved attributes; change JSON edits only documented generated top-level token spans. Instant lacks the R8-F2 check |

`systemNamespace.ts:50-66,80-86` prevents ordinary caller assertions from selecting the reserved `_Transaction` type or
`:_tx/` attributes. Public business timestamps therefore do not acquire metadata treatment merely by matching a clock
value. The two positive independent-lineage controls (decoded and raw-frame) show **different D but matching D′**, with
full-D clone admission refusing the other lineage and accepting its own fresh source pin.

Ten caller-input controls change a business datetime, explicit valid_from, valid_to, created_by or JSON value. Two more
change a nested caller timestamp whose key resembles generated metadata inside journal change JSON. Every such change
produces a different D′. In particular the explicit business valid_from is 1000: it coincides with A's system clock but
is still kept unchanged in B, whose clock is 10000. Normalization is not a global replacement of clock-looking numbers.
Unsupported/unrankable side state and ambiguous assertion ranks remain refusals as reported by the builder.

## Admission/PASS audit of the implementation

Full D remains the only seed-reuse grant: `admitG0` freshly reads content and compares D. It never reads Dprime.
`checkXtdb` runs on the measuring writer endpoint before warm-up. E1 compares the fresh source pin's Dprime with the
reference golden, then the driver still awaits full D against that arm's own pin. It does not use normalized equivalence
to admit a changed clone. Pins remain trusted pre-freeze expectations, not arbitrary verdict inputs.

`pinXtdb` now computes D/D′ before freeze. `readE1G0` performs two complete reads, requires equal full D, and includes
the normalization rules and expected binding in D′. Golden publication still awaits two clone starts reproducing full D
and L/T. Health, key/config, C1, quiescence, position/count checks and lifecycle readiness remain refusal-only or
operational. No diagnostic stop verdict is read by a grant. The earlier three signed-zero failures are fixed; the
retired 262 process-protocol tests were not revived or claimed as current evidence.

## Execution, evidence and contract handling

[run.json](evidence/review-round8/run.json) records Node v22.23.2, merge head, actual argv, **6,482,948,096 free bytes**
at heavy admission, source/dependency/upstream hashes and each log digest. It checks inputs again after execution.
[source-binding.json](evidence/review-round8/source-binding.json) independently recomputes source/log/raw-output hashes,
checks builder equality and retains the four finding outcomes. There were no signals or spawn errors.

| Fresh command group | Result |
| --- | --- |
| [Builder suite](evidence/review-round8/tests.log) | 203/203, exit 0 |
| [Earlier reviewer controls](evidence/review-round8/reviewer.log) | 30/30, exit 0 |
| [Column and SQL-reader controls](evidence/review-round8/columns.log) | 98/98, exit 0, including all 89 columns and three signed-zero cases |
| [Independent representation/E1 suite](evidence/review-round8/representation.log) | **53/57**, exit 1; four regular failing desired-refusal assertions, no skips/TODOs/cancellations |
| Scratch schema guard | Six controls behave as required: three covered schemas pass, three stale projections fail the selected audit |
| Benchmark TypeScript and nine syntax checks | All exit 0 |

The runner's overall exit remains **1**. It does not relabel the four failures as expected passes. The first launch
preflight refused at 5,259,980,800 free bytes, below 5 GiB; no heavy process or test started. A later explicit retry
passed both the pre-wrapper and admitted-runner disk checks. No executed attempt was overwritten or silently retried.

Reviewer controls' merge preimages and exact builder adaptation diffs are under
[merge-input](evidence/review-round8/merge-input). The raw-transport hook adaptation changes acquisition, not the
desired-refusal assertions. The scratch helper now copies the new imported modules and takes a fresh output directory;
its original guard assertions are unchanged. No dependency installation was needed.

All new case output and scratch snapshots live durably at
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VK01/round8/attempt-1/`.
The repository contains [RAW-INDEX](evidence/review-round8/RAW-INDEX.md) and
[SHA256SUMS-RAW](evidence/review-round8/SHA256SUMS-RAW), rather than bulky raw files. Finding cases are in that
directory's `representation/cases.json`; earlier controls are in `reviewer/` and `columns/`.
New in-repository evidence files are each below 1 MB and the new raw/log directory below 5 MB. Historical evidence
from earlier committed rounds was left unchanged. [SHA256SUMS](evidence/review-round8/SHA256SUMS) binds the report,
review tools and new repository evidence. Authored files pass whitespace checks; raw failure logs retain their bytes.

**Rule 9b:** no acceptance file, generated contract or version was edited. No changed implementation path has an explicit
pathname/file-hash entry in the inspected acceptance files; no pinned path was identified as moved. For the contract
builder, [source-and-authority.json](evidence/review-round8/source-and-authority.json) lists each changed implementation/
test source path's old/new SHA-256 and the inspected acceptance/authority hashes. It also records the failed preflight.
The acceptance files were rechecked unchanged after the gate. This review does not re-pin or qualify a contract.

Reproduce with adequate disk after preserving existing evidence under a new attempt (the runner refuses overwrites):

```sh
node lab/bin/heavy.mjs --label CX-VK01-round8-offline -- node lab/verify/K01/run-review-round8.mjs
```

## Reviewer PASS/receipt audit before commit (rule 9a)

| Reviewer boundary | Content | Freshness | Binding |
| --- | --- | --- | --- |
| Suite totals/status receipt | Actual statuses/TAP counts, no signal/spawn errors; passing groups have no fail/skip/TODO/cancel; failing group stays nonzero | New subprocesses; no-overwrite guard; preflight refusal recorded separately | Exact argv, source/schema/parser/Postgres.js/upstream hashes, Node, head and log digests |
| Representation distinctions/refusals | Complete actual readG0/admitG0 results; encoded bit/text/OID witnesses; unsupported reads must throw | New fixture and pre-change pin per case, followed by changed read | Same expected scope/position/counts, named endpoint and exact codec/wire sources |
| Upstream widening finding | Source rules asserted; modeled frames passed to actual wireRows/G0; actual returned PASS retained; native consequence explicitly source-derived | New source read and source/clone frame construction | Clean pinned upstream commit, getter/unifier excerpts, source/clone width arrays and actual pin/result |
| D′ positive/caller-value/instant controls | Actual two-read D/D′ outputs; expected equality/inequality checked; incorrect instant equality fails the suite | New lineages and reads per case; no saved D′ substituted | Generated identity relationships, complete tables, source clock and caller fields, decoded/raw mode and expected binding |
| Existing zero/column/deadline/publication controls | Unweakened assertions; actual G0 and golden function; lifecycle/endpoint hooks explicitly simulated | New fixture/isolated directory per case and new durable output | Current extracted reader/golden, manifest/pin, endpoint, call/event trace |
| Scratch guard control verdict | Specifically named actual declaration audit must pass or fail as prescribed, not an arbitrary nonzero exit | Six isolated scratch copies, no existing receipts adopted | Exact original/new schema snapshots, copied module hashes, selected test and raw logs |
| Source checks, manifests and final verdict | Recompute current/executed/builder equality, all artifacts and acceptance immutability; verdict reflects four actual failures | Checks after completed run | Named builder/merge, durable index, exact paths and explicit offline/model limits |

## Limits and open work

Fix or refuse the widening cases and validate the assigning clock before instant normalization, then rerun independent
review before ACCEPT-OFFLINE. Native temporal/NaN/structured transport remains refused; actual supported wire types and
byte fidelity need live qualification. D′ still refuses unranked side state and ambiguous ordering, as intended.

No actual engine/daemon/service request, volume, engine slot, container lifecycle, resident action, dependency install,
main-checkout edit, merge into main or push occurred. No live source/clone mutation, E1, two JVM starts, W0/P5 integration,
performance gate or full monorepo suite ran. Only the shared heavy-test semaphore was used. The widening consequence is
inferred from pinned upstream code and modeled frames; the G0 results and inconsistent-instant D′ equality were directly
executed offline. All reviewed implementation bytes still match the builder.
