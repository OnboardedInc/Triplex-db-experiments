# P2Q independent QA, round 8

**Verdict: FIX-FIRST, including default-off integration.** The prior transactional future-basis clamp is fixed. Q89i still fails: ordinary snapshot reads expose retirement metadata committed after the named cut. An independently enumerated public read, `Triples.transactionsForEntity`, also accepts an unavailable future `snapshotPosition` instead of waiting and failing typed (Q89c). These are two distinct correctness defects; no product fix was made here.

Reviewer: CX-VP2Q-4. Scope and outcome authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`, and current main-checkout `lab/acceptance/RULINGS-PENDING.md` Q89c/Q89i. This is exact-basis correctness QA, not default enablement or performance acceptance.

## Source binding

Read the builder's `REPORT-round7.md` and captured its head **d14992e16c6a1eed7b3b01a8d9476c9358920597**, then merged that head into `verify/P2Q` at **8f599682**. The substantive product commit is **25c54ff27fbc6d50cac7a363eeea564044083037**; **542873d7** corrects the builder's live scope fixture. The builder report is not the acceptance oracle.

The delta from the previous reviewed target `7b2227e` changes exactly two product files: `packages/qlever/src/broker/BrokerStorageAdapter.ts` and `packages/qlever/src/QleverQueryExecutor.ts`. I inspected the complete product diff. It adds the common basis gate, refuses a requested cut above the immutable transaction pin, gates empty inputs, preserves earlier committed Datalog cuts, excludes staged writes for explicit committed cuts, and shares the outside wait budget. The other changes are tests and experiment evidence/reports. The reviewer product tree exactly matches d14992e. See [source binding](evidence-round8/source-binding.json) and [complete product delta](evidence-round8/product-delta.patch).

All test commands use `lab/bin/heavy.mjs` and the source-bound [round-eight runner](scripts/round8-gate.mjs), source aliases, Node v22.23.2, and existing dependencies. Free disk was above 5 GiB at admission (about 12 GiB initially). Receipts retain actual command, head/target, environment, preimage hashes, exit status, timestamps and log hash. State is retained under Git-ignored `state-round8/`.

## F1 — major: future retirement metadata leaks into a named snapshot

**Location:** [BrokerStorageAdapter.ts:335](../../../packages/qlever/src/broker/BrokerStorageAdapter.ts#L335), also the staged-row return at line 345. Public conversion preserves the leaked fields in [TriplesLive.ts:127](../../../packages/core/src/store/TriplesLive.ts#L127).

**Reproduction:** assert `s:immutable` at position **2048**; capture the full result at that position and fixed valid/record time; commit its retraction at **3072**, then a replacement assertion. Repeat the identical read at 2048. Fact membership and the old value remain correct, but `retracted_at`, `retracted_position` and `retract_tx_id` change from null to the later retraction's values. Public `Triple` payloads similarly change `retractedAt` and `retractTxId` from `None` to `Some`. This leaks knowledge unavailable at the named cut and violates Q89i's explicit metadata requirement.

The visibility predicate correctly ignores a retraction beyond the cut, but then returns the latest mutable row unchanged. The log fallback also collapses all versions before applying visibility; it does not return the pre-retirement representation. Tests compare full serialized payloads, with no metadata stripping, sorting away differences, or use of the older harness's immutable-field-only `key`.

**Affected verified entry points:** `getByEntity`, `getByEntities`, storage `query`, `Triples.entity`, `Triples.entities`, and `Triples.match`, both outside and inside a transaction, across overlay, unavailable-replica/log fallback and published-replica routes. Additional cases hold an old transaction pin while another fiber retracts the row: both adapter `getById` and public `Triples.get` leak the later metadata despite the pin remaining unchanged. A public `Triples.entityPage` with the identical pinned cursor also changes its full returned bytes. Raw `history` is deliberately excluded: Q89i explicitly permits a separate raw-lifetime history contract.

**Proposed fix:** construct the snapshot row representation at the effective position/time, clearing all retirement metadata when the retirement is beyond that cut, including the implicit transaction pin and explicit committed cuts over staged retractions. Apply this after merging all read sources or reconstruct the version at the cut. Preserve the separate raw-history representation. Keep full-row/public-page byte regressions on all routes, not just fact-count comparisons.

Evidence: [final model cases](evidence-round8/final-offline/), `round8-*-immutable.json`, `round8-model-implicit-pin.json`, `round8-model-entity-page.json`; live outcomes and counts are listed below.

## F2 — major: public entity transaction history labels a future snapshot as answered

**Location:** [entityTransactionHistory.ts:49](../../../packages/core/src/store/entityTransactionHistory.ts#L49), lines 53–64 and 109–112; wiring at [TriplesLive.ts:679](../../../packages/core/src/store/TriplesLive.ts#L679).

**Reproduction:** with an actual broker head of **2048** and its published replica caught up, call `triples.transactionsForEntity("s:immutable", {snapshotPosition: 6144, limit: 1})`. The method succeeds and returns `snapshotPosition: 6144` with currently available transaction rows. It does so both outside and inside `adapter.withTransaction`, using the real qlever-dev engine. No future-basis gate is reached. The final matrix also requests `s:absent`: all eight calls across two clients, present/absent and in/out succeed; absent entities return `{transactions: [], snapshotPosition: 6144}`.

The requested position is used only as a Datalog value predicate (`?position <= snapshotPosition`). The query runs at the current read basis; the helper then echoes the unavailable requested snapshot into a successful response. This is a named snapshot field, not the `transactions({after})` resume boundary. The public request/result comments at `Triples.ts:136–145` explicitly describe a captured commit-position snapshot for stable continuation. This core helper predates the two-file product delta; it is a gap in the requested repository-wide basis contract, not a claim that the new gate introduced it. Its positive-integer validation does not establish availability. Q89c requires waiting and typed refusal even when the current result would be empty.

**Proposed fix:** carry the requested snapshot through the authoritative exact-basis gate, retain immutable transaction semantics, and propagate the typed basis failure without wrapping away `reason`, `required`, `observed`, and `replica`. Do not merely relabel the current answer or add a refusal flag. Add present/absent entity cases and ensure later commits cannot change an answer already labeled with the same snapshot.

Evidence: `round8-{standard,fresh}-public-future.json` in the first live attempt and the corrected live directory; the cursor-scope correction described below does not affect this direct public method.

## Independent public read inventory

The inventory comes from `StorageAdapterService`, `TriplesService`, `QueryExecutorService`, `Repository.ts`, QLever native exports and their implementations, rather than the builder's route list. A future **position** can be tested only where the current API carries one; `TemporalBasis` exposes only `recordedAt`/`validAt` (Q89g still defers a public position token). I did not add or smuggle a position field into that public type. Q89c's future-record-time requirement is explicitly deferred until Q89a.

| Entry point | Position ingress and transaction behavior | Future-basis check / snapshot check |
| --- | --- | --- |
| Adapter `getByEntity`, `getByEntities`, `query` | `ResolvedTemporalBasis.recordedPosition`; transaction pin honored | Existing and expanded present/absent matrices, in/out; typed refusal passes. Full bytes fail F1. |
| Adapter empty entity batch | Same gate, including empty input | Expanded matrix, in/out, passes. |
| Adapter `dependencyState`, empty dependencies | Same exact-basis input and transaction pin | Expanded matrix, in/out, passes; live named payload comparison included. |
| Adapter `getById` | No basis argument; implicit current/pinned cut | Future injection inapplicable. Old-pin concurrent retirement fails F1. |
| Adapter `history` | No explicit basis; separate raw-lifetime history API | Not snapshot-equated. Prior staged-history control rerun. |
| Optional adapter `rawQuery` | Not provided by the broker adapter | No executable broker raw-query route to test. |
| Adapter `currentCommitPosition` | Reports current head or immutable transaction pin | No requested basis. Old pin preserved across concurrent commit. |
| `Triples.entity`, `entities`, `match` | Public record/valid time only; delegates to above pulls | No public position input. Fixed-time repeated payloads fail F1, in/out. |
| `Triples.get` | No basis argument; adapter `getById` | Old implicit transaction pin fails F1. |
| `Triples.entityPage` | Public pinned position inside a validated entity cursor | Well-formed future cursor, in/out, typed refusal passes after fixture correction. Same old cursor's full payload fails F1. |
| Executor `execute`, `executePage` | Internal exact position; shared Datalog run/gate | Expanded future matrix, in/out; earlier/staged-cut controls rerun. Named result payload comparisons included live. |
| `Triples.queryAll` | Public time input; `includeBasis` captures current position | No public position input. Named-time payload compared outside transaction; inside a transaction the current code refuses time-only historical reads with typed `DatalogValidationError`, both before and after later commits. This is an explicit unsupported route, not a silent alternate snapshot. |
| `Triples.query`, `queryPage` | Validated pagination cursor carries exact position | Independently constructed, correctly fingerprinted future cursors tested in/out. |
| Native `select`, `selectWithRelations` | Explicit position in `NativeReadOptions`; broker facade gate | Expanded future matrix in/out on both clients. An independently constructed facade does not inherit an adapter transaction's ambient pin; it honors its explicit basis against its own replica. Named payload comparison included live. |
| Native authored LIMIT/OFFSET | Part of trusted SPARQL; no separate page method | Same native entry/gate. No additional cursor API exists. |
| `Triples.transactionsForEntity` | Public `snapshotPosition`, distinct from `beforePosition` boundary | **Fails F2**, real engine, both clients, in/out. |
| `Triples.transaction`, `transactionByCommand` | Receipt identifiers; no requested basis | Existing receipt tests rerun; no future snapshot argument. |
| `Triples.transactions` | `after` is a resume boundary, not an as-of snapshot | Existing transaction/feed tests rerun; future boundary may correctly yield no new events. |
| `Triples.history` | Separate raw-lifetime history API | Not compared to snapshot payloads under Q89i. |
| `Triples.currentPosition`, public `dependencyState` | Head introspection / public time-only dependency input | No public future-position argument; adapter gate tested. |
| Executor/Triples `explain`, `explainPage` | Compile/validate, no fact read or named basis input | Not snapshot reads. |
| `Repository.at().get/getMany/find/count/timeline` | Explicit EXP-R02 stubs at `Repository.ts:127–134` | Unimplemented (`Effect.die(notImplemented(...))`), so future-position behavior cannot be verified as a working route. Existing gap, not a new P2Q regression. |
| Low-level exported HTTP clients, host-log/feed polling | Raw transport / append-log cursor APIs, no snapshot basis contract | Earlier HTTP, feed/resume and durability matrices rerun; not silently treated as snapshot APIs. |

## Gates and evidence

| Gate | Fresh result | Evidence under `evidence-round8/` |
| --- | --- | --- |
| Rounds 4–7 offline HTTP/cause/code/basis matrices | **802 passed**, 14 live cases skipped | `earlier-offline.json`, `.log` |
| Earlier durability/process locks/ACK/routing/feed/allocation/A0/native checks, full outage-scale and 60 routing seeds, independent Undici/Node source audits | **46/46 passed**, 12 files | `foundation.json`, `.log`, model/fuzz/scale/source-audit artifacts |
| Entire QLever package offline suite, including actual catalog inventory | **224 passed**, 26 live-only skipped | `package.json`, `.log` |
| All earlier live matrices on qlever-dev | **54/54 passed**, 3 files: 12 HTTP outage schedules + 8 legacy live cases + 2 new live basis fixtures, plus their 32 offline controls | `earlier-live.json`, `.log`, raw live artifacts |
| Actual package inventory guard with an injected unknown Undici source code | **Expected refusal:** 1 failed / 121 passed (`Unreviewed Undici code(s)`) | `guard-mutated.json`, `.log`, `guard-mutation-readback.json` |
| Final corrected model snapshot/public-cursor matrix | **1 passed / 4 failed**, 4 live-only skipped; six future-cursor calls pass; all 39 full-byte comparisons fail F1 | `final-offline.json`, `.log`, `final-offline/` |
| Final live expanded public-cursor/journal and snapshot payload matrix | **5 failed**, 5 skipped: F1/F2 plus two pre-existing typed time-only transaction refusals that stopped the first full payload sweep | `final-live.json`, `.log`, `final-live/` |
| Complete supported payload sweep, with the time-only transaction refusal recorded separately | **2 failed**, 6 skipped: 24 F1 byte failures; 30 supported query/dependency payload comparisons equal; 2 time-only transaction refusals stable | `payload-live.json`, `.log`, `payload-live/` |

Across the final public future matrix, **12/12 cursor calls** wait and fail with the correct typed basis error, while **8/8 journal snapshot calls incorrectly succeed** (present/absent, both clients, in/out). Across the complete live payload sweep, **54 supported comparisons** comprise 24 F1 metadata failures and 30 identical Datalog/native/materialized-relation/dependency results. The two unsupported time-only `queryAll` transaction cases return the same typed validation refusal before and after later commits. The additional live implicit-get/entity-page fixture has **3/3 full-byte failures**, also reproduced by the model.

The expanded original basis fixture checks 80 route/transaction/presence/time combinations per offline/standard/fresh setup (240 cases), as well as captured-pin concurrency and earlier/staged Datalog behavior. These all pass. The 664 real-client catalog cases and 252 protected-error/depth controls are included in the unchanged offline matrices. Decode, HTTP 4xx, typed basis failures, abort/timeout/cycle/depth handling and message-observation tripwires remain distinct and pass. The source-derived catalog is unchanged by this delta; both independent source audit tests and the actual package guard were rerun. The guard simulation changes only the source bytes returned to the test's read call, not installed dependency files.

All **12 gate receipts** report `sourceStillMatches: true`; source/readback checks preserve all first failures and fixture versions. [SUMMARY.json](evidence-round8/SUMMARY.json) inventories 852 case artifacts and all gate outcomes. [MANIFEST.json](evidence-round8/MANIFEST.json) hashes 932 evidence files, including the original verifier sources retained under [fixture-preimages/](evidence-round8/fixture-preimages/). [DEPENDENCY-READBACK.json](evidence-round8/DEPENDENCY-READBACK.json) confirms the installed/bundled Undici source bytes were unchanged after the simulated upgrade. [final-cleanup.json](evidence-round8/final-cleanup.json) records **zero owned lock-holder fixtures**, **empty product/benchmark drift**, no process/engine cleanup, and about 12.26 GB free.

The first new cursor fixture used the adapter graph scope for the cursor fingerprint, but `openRt` gives the core runtime `DatabaseScope.test(scope)`. This correctly caused `PaginationCursorError(scope_mismatch)` before any basis gate. I retained the first source/log/receipts, corrected only the verifier's fingerprint scope, and reran in fresh `corrected-offline/` and `corrected-live/` output directories. No product assertion was weakened. The first attempt's ordinary row-byte failures and direct `transactionsForEntity` failures are independent of the cursor setup error. The first positive `selectWithRelations` fixture also supplied an empty relation list, which that API correctly rejects as invalid; the final fixture supplies a real named, basis-filtered edge and queries the materialized relation. That fixture rejection is not a product finding. During the intermediate corrected live attempt, the standard client's journal requests hit their unchanged 30-second request timeout and were wrapped by the public history helper; these attempts are retained separately from the successful future-snapshot reproductions on both clients.

For query surfaces, byte comparisons cover the semantic row payload; variable execution/debug trace timings are not snapshot data. The first full live payload sweep stopped after `Triples.queryAll` rejected a time-only historical read inside a transaction. A fresh focused sweep verifies that same refusal before later commits, records it as unsupported under the existing contract, and continues to all remaining supported routes. Unexpected failures still fail an assertion and are retained. No successful empty result is accepted as a refusal.

Repository rows preserve every field, and the public entity page comparison includes its full snapshot/cursor payload. Neither a passing Datalog/native value check nor the older immutable-field-only oracle is claimed as proof that exposed row metadata is immutable.

No product edits, install/dependency mutation, main-checkout edit, push, main merge, publication, default enablement, engine lifecycle operation or exclusive reservation occurred. Live work contacts only qlever-dev at `http://127.0.0.1:7070`, with unique test graphs and owned loopback outage proxies. No root `pnpm check`, package build, matched benchmark, 256-reader acceptance, exhaustive interleaving proof or production-readiness claim was performed. The unimplemented Repository abstraction and public position-token design remain explicit limitations.

**Open actions:** fix F1's snapshot metadata and F2's public future snapshot, then rerun the retained regressions. No user clarification is needed to reproduce either finding.
