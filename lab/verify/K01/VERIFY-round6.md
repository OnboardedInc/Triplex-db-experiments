# K01 round-6 offline review: FIX-FIRST

Reviewer: CX-VK01. Reviewed builder `77681166` and R36/Q93a-b; merged into `verify/K01` at
`bf189491`. All reviewed implementation bytes match the builder; no implementation fix was made.
[Source binding](evidence/review-round6/source-binding.json) identifies both independent executions and the builder blobs.
North star: correct, reusable seeds supporting P1-P5, with correctness as the floor. Authority remains `lab/SCOPE.md`,
`lab/NORTH-STAR.md`, `lab/TARGETS.md`, Q93a/b and R36; the retired Q83 process protocol is not an acceptance requirement.

**Verdict: FIX-FIRST.** The simplification establishes a single content-admission boundary, and the required row,
retraction, valid-time and count mutations all refuse. One persisted value used by the adapter is outside that boundary:
changing only `value_identity` is admitted. This needs a bounded G0 coverage fix, not restoration of the deleted machinery.

The current builder gate passes **73/73** freshly, including benchmark TypeScript and five syntax checks. The independent
23-case suite has **22 passes and one ordinary desired-refusal failure**, with no skips/TODOs/cancellations. The old 262
process tests are retired with their protocol and were not rerun or claimed as new-protocol evidence.

## Finding

### R6-F1 — MEDIUM: G0 omits a persisted value column that changes native uniqueness validation

**Location:** `lab/bench/lib/g0.ts:4-18` and `:141-146`; SQL projection consumes that list at
`lab/bench/lib/g0-xtdb.ts:75-79`.

The assertion projection includes the packed value fields but omits **`value_identity`**. This is neither a random ID nor
a wall-clock field. `XtdbStorageAdapter.ts:219-226` persists it as the canonical typed value of the assertion. Native
constraint validation reads it from `tx_assertions` (`ConstraintValidation.ts:7-20`) and groups uniqueness claims by it
(`:158-164`). It is therefore an input to Triplex's constraint behavior, not only physical layout or a timing statistic.
R36 section 2.1 calls for the value columns that Triplex answers from; section 3.3 specifically guards common-mode reader
omissions. G0's whitelist currently misses this persisted logical/constraint input on both source and clone.

**Reproduction:** `independent changed clone refuses: value-identity` in
[g0-review.test.mjs](g0-review.test.mjs). It pins D from two well-formed assertion rows with different member keys, then
changes only the first row's stored `value_identity`. All projected values, positions, valid-time ranges, counts and scope
metadata remain unchanged. Actual `admitG0` returns **`status:'PASS'` with the original D**, so the desired-refusal assertion
fails. The other eight mutation controls refuse. Exact before/after rows, independent count/scan calls, pin and returned
PASS are retained in [g0-review-cases.json](evidence/review-round6/g0-review-cases.json).

The source-based consequence is concrete: at recorded position 2 / valid time 101, a subsequent assertion for a new member
with the original first key joins that member's original `value_identity` on the intact seed. After this one-column change,
the original member no longer groups with that typed value, allowing native Unique validation to miss the conflict.
The missing-key compatibility fallback only looks for **NULL** identities (`ConstraintValidation.ts:199-204`); a wrong
non-null identity does not trigger it. [adapter-source.json](evidence/review-round6/adapter-source.json) retains exact file
hashes and numbered excerpts. This consequence is an inference from the actual compiler's grouping predicates, not a claim
that native SQL/constraint execution ran in this offline review.

The changed-row G0 PASS itself is directly executed, not inferred or supplied by a mock PASS. A true C1 mismatch could
still refuse this physical corruption; a false C1 match is supposed to be harmless under Q93, which requires the logical
content gate to cover it. Counts cannot detect a changed column in an existing row.

**Proposed fix:** include the persisted `value_identity` in the scanned/hashed assertion fields, or read it and validate
that it equals the canonical typed value reconstructed from the other columns before G0 can grant. Keep that integrity
check inside the sole content gate. Retain this one-column negative control and regenerate pre-freeze pins/goldens after
the reader changes. No stop proof, EXPLAIN gate, owner certificate or extra granting path is needed.

## Admission-path audit

I searched every PASS/admit/published/qualifiedAt/ready/seededBy site in the current K01 source and followed its consumers.
[admission-search.json](evidence/review-round6/admission-search.json) preserves the inventory; manual dispositions follow.
This review covers K01's XTDB path and the shared G0 API, not unintegrated other-lane/P5 callers.

| Producer/value | Consumer and disposition |
| --- | --- |
| `admitG0` → `status:'PASS'` (`g0.ts:182-188`) | **Only content grant found.** Revalidates pin binding, rereads all configured tables/counts/scopes, compares new D; does not consume prior PASS or diagnostics. R6-F1 is a coverage defect inside this gate |
| `checkXtdb` | Opens its endpoint reader and directly calls `admitG0`; no alternative success implementation or persisted readiness lookup |
| Driver `report.seedPath={...,G0,...}` (`driver.ts:279-280`) | Assigned only after awaited in-process `checkXtdb(writer.backend.url,...)`; happens before reader-worker creation and warm-up. Descriptive clone/seed-writer provenance alone does not grant |
| `golden.json`, `qualifiedAt` and “published” (`engine.mjs:733-748`) | Exclusive write occurs only after two sequential qualification-clone starts, each with awaited G0 against the pre-freeze pin; second quiescence must reproduce L and T |
| Seeder manifest `g0` / seed `complete` | `readG0` pins an expectation after the final seed receipt, before the freeze recipe. The manifest/summary is not measurement admission; the measuring driver must read G0 again |
| `fresh-state.json` | Stores D/layout and manifest binding after the fresh-arm restart; the driver still has to run G0. Cannot substitute for current content |
| Engine health `ready`, pool `readyAt`, status READY, follower readiness | Health/resource/lifecycle operation results only; none writes a content-admission certificate or bypasses driver G0 |
| Reader-worker `ready` | Thread initialization after the G0 block; not seed admission |
| Recipe/process status, C1 equality, key/config/build checks, disk/pool and quiescence | Only throw/refuse or permit control flow to reach G0. No match is returned as content PASS. False diagnostic stop status/lines were deliberately supplied in publication controls without bypassing G0 |
| `requireW0Fingerprint` | Refuses oracle disagreement; shared G0 still performs a fresh read and D comparison. It has no standalone PASS output |
| Existing NS performance/oracle bars | Evaluate the benchmark after it runs; not an alternative K01 seed-reuse admission. Other-lane integration remains separately unverified |

No extra content-granting assignment was found outside G0. No current decision reads `record.diagnostics`. `stopSlot` records
stop status/lines/timing while separately requiring a stopped container for copying; its diagnostic object is only stored.
`clone` exports a golden-record path after operational copy/start; the measuring driver still requires its own G0.

## G0 content, pinning, binding and deadlines

The configured assertion fields cover entity/attribute, packed type and scalar/JSON values, entity type/schema version,
valid_from/valid_to and recorded_position/retracted_position. Claims cover command_id/position; attempts cover position;
metadata covers scope_key/position. Random operation IDs and wall clocks are excluded as R36 explicitly requires. These
are position-based history reads at current XTDB system time and all valid time, not a latest-visible subject sample.
R6-F1 identifies the additional persisted value column used by native constraints.

Every row is hashed from the ordered field projection, row hashes are sorted, and multiplicity is retained. Per-table
COUNT queries are separate from scans, must equal expected counts, and the scan length must equal that count.
`expectedN01` obtains assertion counts from `populationCounts` and requires the complete manifest's assertions, subjects,
commands and last position to agree. Scope metadata must name exactly the expected scope/position before and after reading.
The logical scope normalization matches the adapter's `DatabaseScope.test` construction.

**Requested planted-clone controls:** changing one row's value, adding a retracted_position, editing valid_to, or dropping
one row/count all refuse freshly. Additional controls refuse a changed command claim, altered attempt position, duplicate
substitution, missing projected field and partial data despite independent expected counts. Row reordering and changed
random IDs are accepted as intended, with four new table scans in that admission call. The omitted value_identity control
is the sole new failure.

**Pin timing:** `xtdb-seed.ts` performs `pinXtdb(comp.backend.url,manifest)` after the seed's final position check, then
writes the manifest. No finish-block/freeze call precedes that pin in the seed writer. `golden` loads `m.g0` before invoking
the recipe and checks both starts against that same loaded pin, rather than deriving expected D from copied bytes.
The source/generator/build checks bind current reader code to seed inputs. Fresh E1 D is also compared with the reference
pin where `TRIPLEX_LAB_REFERENCE_GOLDEN` is supplied. These are source/wiring checks, not a live timing observation.

**Measuring process/endpoint:** the driver awaits `checkXtdb(writer.backend.url,bulkManifest,bulkManifest.g0)` in the process
that measures, before `workerCfg` / thread creation. The actual SQL client is made from that same endpoint in `openG0`;
`checkXtdb` does not spawn a verdict-producing child. The standard compositions/workers resolve the same configured backend.
No owner readiness is read. This is the intended Q93 construction; it has not been run against a live measured engine here.

**Deadlines:** shared readG0 has a ten-minute bounded scope over metadata/count/scan/W0 reads; each actual SQL call also
combines the outer abort signal with its own ten-minute bound and client timeout. Client close has a 30-second bound.
Health has a five-minute bound and ten-second wget calls. K3 SQL reads use the same bounded reader. The kept preliminary
Triplex position read is bounded in the adapter (`committedPosition` passes timeoutMs:30000), so its lack of a wrapper in
`seedFromManifest` does not create an unbounded engine read. Independent hung scopes/count/scan controls all refuse at a
25 ms test deadline and show the signal aborted. No native backend cancellation/termination is certified by these tests.

## Golden's two starts

The actual golden function is exercised with test-owned files, simulated engine lifecycle/refusal hooks and **actual G0**.
These are offline sequencing controls, not claims that a JVM started. The matching case records start 1 → G0 1 → stop →
start 2 → G0 2 before creating golden.json. A first-start D change, second-start D change, second-start L change,
second-start T change, or recipe failure leaves no published golden. First and second G0 read the test endpoint anew.
The successful case can carry failed diagnostic stop status and missing Log4j lines, demonstrating that those diagnostics
are not grants or publication inputs. First layout L/T is captured from the qualification clone; the second is checked
against it before the second D read. The golden volume itself is only mounted as copy source, never started as XTDB.

## Disposition of earlier findings made harmless by R36

The deleted code was not re-reviewed or restored. The seven “harmless” classifications in R36 section 1.3 have these
current structural reasons:

| Earlier finding | Why it no longer grants admission |
| --- | --- |
| V1-F2: T1 ignored a failed semantic stop proof | Stop proof is diagnostic; neither driver G0 nor golden publication reads its verdict |
| V1-F3: settle ignored a fresh transaction gauge | The old settle predicate is gone; recipe status cannot grant. Fresh-node T is refusal-only and actual content must match G0 |
| R2-F4: failed inspect/log acquisition supplied stop/start proof | No transported proof grants reuse; operational inspection may still refuse copy/cleanup, and the measuring process rereads content |
| R3-F2: C1 trusted a saved pass bit | There is no C1 re-verification certificate. Copy equality can refuse, while only current G0 can grant |
| R4-F1: matching partial C1 trees after shell failure | C1 match alone cannot grant. Its harmlessness relies on G0's logical coverage; R6-F1 closes an omitted logical constraint input rather than reinstating C1 as a grant |
| R5-F3: incomplete C8 EXPLAIN fields compared equal | Exact C8/EXPLAIN comparison is deleted from admission, so incomplete plan evidence cannot produce G0 PASS |
| R5-F4: CLI exit zero overwrote a diagnostic failure | The old CLI timer is deleted; a recipe/diagnostic process result still cannot replace in-process G0 |

The operational retained fixes remain separate: automatic golden cleanup is gone, and invalid pool/disk inputs remain
refusals. This review does not promote historical process receipts or claim the retired 262 tests apply to Q93.

## Evidence and reviewer receipt audit

Full rerun: [run.json](evidence/review-round6/run.json), [73-test log](evidence/review-round6/tests.log), adjacent type/syntax
logs. Every process exits 0 with no signal/spawn error. Independent controls:
[g0-review-run.json](evidence/review-round6/g0-review-run.json), [raw log](evidence/review-round6/g0-review.log), and
[cases](evidence/review-round6/g0-review-cases.json): 23 tests, 22 pass / 1 fail, process exit 1; no signal/spawn error or
skipped/TODO/cancelled cases. Exact Node version, source hashes and host disk readings are recorded. Both gates used the
shared heavy semaphore with free disk above 5 GiB.

`initial-23/` retains the first complete controls run and its exact source. It found the same one omission. The final
fixture uses initially distinct, correctly encoded value identities so the inferred future uniqueness example begins
with a valid unique set. `intermediate-23/` preserves that refinement before matching the injected stop diagnostic
object to the real stopSlot return shape; the final run covers that shape. One queued rerun was refused by the runner's no-overwrite guard before tests ran: the first
receipt had been copied, not cleared from the active path. `guarded-rerun.json` records that outcome; archived bytes were
compared before clearing only the active receipt for the new run. No failed test or command was silently adopted as PASS.

Reproduce with adequate disk and preserve the existing attempt first (both runners refuse to overwrite their receipt):

```sh
node lab/bin/heavy.mjs --label CX-VK01-round6-all -- node lab/verify/K01/run-review-round6.mjs
node lab/bin/heavy.mjs --label CX-VK01-round6-content -- node lab/verify/K01/run-g0-review.mjs
```

The first passes and the second currently exits 1 for R6-F1. [SHA256SUMS](evidence/review-round6/SHA256SUMS) covers the new
report/tools and retained evidence. Raw assertion-diff whitespace is preserved; authored files pass whitespace checking.

**Rule 9a — every reviewer-produced PASS/verdict/receipt boundary, audited before commit:**

| Boundary | Content | Freshness | Binding |
| --- | --- | --- | --- |
| Full gate process status / 73 PASS report | Actual zero exits, no signal/spawn error; actual TAP count/failure/skip/TODO/cancel summaries checked | Newly spawned commands and new log paths; runner refuses old receipt | Exact argv, merge head, source SHA-256, Node version and log-byte digest |
| G0 mutation/positive assertions and case JSON | Actual admitG0 return/error; changed bytes and count/scan calls retained; failed assertion keeps nonzero process status | New reads after each pin/mutation, no external PASS supplied | Exact input tables, expected scope/position/counts, endpoint label, source hashes and case name |
| Deadline controls | Require thrown deadline and aborted signal, not elapsed-time guess alone | New hung read per scope/count/scan case | Explicit configured timeout and current reader call |
| Simulated publication cases | Actual golden sequencing and actual G0; L/T/refusal/lifecycle hooks identified as simulations; inspect actual file existence | New isolated directory and calls per case | Exact current golden source, manifest/pin, event sequence and stored fixture record; never a real managed golden |
| Adapter consequence / source search | Primary source bytes and numbered predicates retained; uniqueness consequence labeled inference, search makes no completeness claim | Current checkout reads | Exact paths/hashes and Q93/R36 authority copies/excerpts |
| Source binding / checksums / final verdict | Recompute builder/current/executed source equality and artifact hashes; overall verdict stays FIX-FIRST with the negative control failing | After current runs; initial/guarded attempts retained separately | Named builder/merge, exact source and evidence paths, explicit offline limits |

## Limits and open work

No implementation edits, real Docker/daemon request, engine service request, volume creation/removal, container lifecycle,
engine slot, resident change, dependency install, main-checkout edit, main merge or push occurred. All fixtures and outputs
are inside this worktree; only the heavy-test semaphore was shared. The authorized merge was into `verify/K01` only.

No live 500/10k seed/clone, real two-JVM-start determinism, native SQL paging/cancellation, W0/P5 integration, full monorepo
check, E1 or PAIR-0 latency qualification ran. The uniqueness consequence is source-derived, not native execution proof.
R36's accepted exclusions of wall-clock/random-operation metadata are not reopened by this review. Fix/validate the
omitted deterministic constraint value inside G0, then rerun the content controls and independent review before the live
window. E1 for the new recipe/image/version remains required before clone comparisons count as qualified measurements.
