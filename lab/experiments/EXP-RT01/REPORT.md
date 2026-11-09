# EXP-RT01 round A — builder report

North star: P1 immutable reads at a named recordedAt, and P2 receipts that name the exact decided commit. Goals and targets come from `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`. Implementation follows R33 round A and Q89a-i/Q90a-g.

**Result: round A implemented; not qualified for promotion.** The builder's offline checks and selected live probes are evidence of specific behaviors, not independent acceptance. Full live conformance did not complete, G6 has no established no-regression result, and the frozen contract intentionally remains unchanged with a stale testkit pin. A separate adversarial review is still required.

## Source and commit order

Branch: `exp/RT01-record-time`. Baseline: `59e07afb7a25dfb22bca60f8d769b74651aa835a` (main with EXP-RQ01). Final product source: `cc54c3c6` (later commits contain reports/evidence only).

The first five implementation commits follow R33 section 6.1:

| Order | Commit | Change |
| --- | --- | --- |
| 1 | `4e66f692` | Exact microsecond stamp helpers and conversion/property tests |
| 2 | `3069453c` | Core staging/decision protocol, journal v2 and cursor watermark defaults |
| 3 | `ccec4bbf` | Controllable-clock testkit conformance T1–T12 |
| 4 | `e5065fbe` | RQ01 D-C1 passing schedule, staged-stamp negative control and HE-8 |
| 5 | `630a2a27` | XTDB/QLever A0 stamps under scope CAS, columns/markers and legacy refusal |

Follow-up commits fix integration defects found during checks: normal ReadError tag narrowing/declaration generation; combined XTDB position/stamp ASSERT; memoized row-stamp validation; refusal metadata; column discovery on legacy XTDB nodes; bounded probe syntax; and future first-page cut selection. First failures remain in `evidence/`.

## Implemented behavior

- `RecordStamp.ts` stores an integer microsecond stamp and exposes exact `instantOf`, `stampOf`, quotient-adjusted `stampCut`, monotone `nextStamp`, `bindCommit` and a shared future-cut gate. Conversions reject values outside their exact range. Finite future cuts beyond that range get the typed unavailable-basis result.
- `TriplesLive` separates `stagedAt` (valid-time defaults, constraint evaluation and journal validFrom) from the decided `instant`. Decided adapters supply the transaction stamp; legacy adapters retain their previous instant behavior. Receipts expose additive `stagedAt`.
- Journal format v2 omits self-referential record instants from stored change JSON and reconstructs them from the persisted position fact. Legacy v1 journal facts still decode. New journals omit `:_tx/instant`.
- XTDB A0/compact and QLever A0 choose `max(previousStamp + 1, stagedClockUs)` inside their existing scoped CAS attempt. The stamp guards the exact prior cut and is persisted with the receipt marker. The XTDB stamp predicate shares its existing ASSERT, avoiding an extra PG-wire round trip. A retry recomputes from its newly observed source cut.
- Fresh scopes create the new stamp columns/markers. Existing nonempty scopes without stamps fail with typed MigrationError before initialization writes. Live probes confirmed zero writes following seeded legacy headers on both engines.
- Storage, Datalog, native and dependent read routes use the scope watermark gate and pin a position after availability. Named-cut results hide future retirement metadata. `BasisNotAvailable` carries the exact requested axis/cut and observed watermark.
- An idle first page defaults to the head watermark rather than the client's clock. Explicit future-time first pages and includeBasis queries wait before pinning their implicit position. Otherwise a release commit would be excluded by a position taken before the wait. T5 now exercises that first-page case with a dedicated entity type so previous fixture rows cannot fill its page. Continuations retain their original cursor cut.
- The testkit exports a controllable record clock, generic conformance cases, concrete A0 schedules and a deterministic reference fixture. T3 includes 200 disjoint transactions and 50 contending same-subject transactions, with receipt/history checks. Deferred-arm T8 is N/A on A0.
- RQ01 assigns decided instants, checks HE-8 exact stamp order and shared transaction ordinals, validates future-refusal axis/required cut, and checks the gate-pinned echo. D-C1 passes with decided stamps; the staged-stamp negative control still violates HE-5/HE-8.

No broker, P2X, Datomic, seal, public basis-token or T-to-position-reduction implementation is included. No oracle, golden vector, generated acceptance file or contract pin was edited.

## Gates and evidence

All paths below are relative to this experiment directory. Runners retain exact commands, raw output, exit status, source hashes before/after and attempt identity. A zero process exit is not treated as semantic qualification.

| Gate | Builder result and limits |
| --- | --- |
| G1 | Final four-package checks: all 14 phases exit 0; 856 core + 93 testkit + 70 XTDB + 35 QLever = **1,054 tests passed**, with 116 engine integration cases skipped. `evidence/offline-page-final/execution.json` binds the source. Datomic is round B, absent from this checkout. |
| G2 | **Incomplete.** Live XTDB and QLever conformance attempts timed out; see `evidence/xtdb-G2.txt`, `evidence/qlever-G2.txt`. No whole-lane acceptance is claimed. |
| G3 | Offline actual XTDB adapter/SQL-transport schedules cover T1–T12 for a0 and compact; deferred T8 N/A. Core tests cover legacy journal decode. QLever offline tests inspect real emitted update/marker bytes. Selected live T1/T2 and T10 slices passed on earlier source; these do not certify final-source T3 or the full suite. |
| G4 | Offline route fixtures and actual XTDB adapter with offline SQL transport pass HE-1–HE-8; staged-stamp control fails as required. Live route-equivalence qualification was not completed. |
| G5 | O-REPLAY 0.5.0 was independently built/accepted per dispatch. This builder did not edit or re-certify it. |
| G6 | Offline actual XTDB A0 commit-path comparison against preserved main source; **no no-regression qualification**. Details below. Broker/P2X round B. |
| G7 | Evaluator **108/108** passes, `evidence/evaluator-final.tap`. `build_contract.py --verify` exits 1: obligations.json and ACCEPTANCE.md are not byte-identical because of the testkit pin described below. Contract regeneration was expressly prohibited. |
| G8 | Pending separate adversarial reviewer. This report is not independent verification. |

The final unit runner reports sourceUnchanged=true. The new page regression initially failed because preceding fixture entities filled its first page; that retained attempt is `offline-page-cut/`. A dedicated entity type fixes the test boundary, and `offline-page-final/` passes without changing the 200/50 concurrency workload.

The final package consumer receipt is `evidence/changed-pack-DdJ1U1/execution.json`, with tarball hashes in its artifacts manifest. It checks core/testkit tar contents, installs them into a fresh external consumer with project-owned caches, compiles public imports including both error handlers, and executes public runtime/route assertions. It does not substitute for a whole-monorepo pack acceptance. The broader unchanged package checker stopped on the CLI tarball's missing `dist/index.d.ts` (`evidence/pack-retry-check.txt`); all 13 preceding package builds succeeded (`pack-retry-build-*.txt`). That unrelated CLI issue was not modified.

The final declaration diff is `evidence/declarations-page-final.diff`; the changed-file manifest is `evidence/declaration-changes-page-final.json`. Expected additions include stagedAt, optional adapter capabilities/currentCut, stamp exports, headRecordedAt preparation inputs, and BasisNotAvailable. The normal ReadError constructor keeps the ReadError runtime tag/name; its type now also admits the separate BasisNotAvailable tagged member. Both catchTag handlers are compiled in the consumer and core runtime typecheck. Generated union-order changes and internal inferred declarations are not additional runtime API changes. This is not a promise that exhaustive downstream error handling requires no updates.

`evidence/probes-page-final.stdout` records final-source mixed integer/fractional XTDB SQL/XTQL comparisons at 100000.0005 and 100000.001, and typed no-write legacy refusals for both engines. Earlier corrected probe success is retained in `evidence/probes-corrected.json`; its predecessor failed only on a malformed QLever seed statement. These probes inspect actual engine results but do not exercise all read surfaces or concurrency schedules.

## G6 offline commit latency

This round uses an offline microbench as authorized by the dispatch, not a slot-level M01 performance promotion. `evidence/latency-page-final.stdout` binds the main source snapshots, final source/build hashes, Node version, process command and measurements. The actual XTDB A0 adapter emits its normal guards/rows and verifies receipts against an in-memory SQL transport. Engine I/O, network, durability and contention are not measured. Each size uses six alternating-order pairs, 200 warmups and 600 measured commits per arm/pair. Main snapshots and their original hashes are retained in `evidence/baseline.json` and `evidence/main-*.txt`.

Median of the six per-arm quantiles (milliseconds; not pooled percentiles):

| Facts | Main p50 | RT01 p50 | Change | Main p99 | RT01 p99 | Change |
| --- | --- | --- | --- | --- | --- | --- |
| 5 | 0.148375 | 0.149333 | +0.65% | 0.977396 | 0.911562 | -6.74% |
| 10 | 0.231167 | 0.236688 | +2.39% | 1.056354 | 1.031541 | -2.35% |

Earlier serialized measurements (`latency-terminal.stdout`) had median pair p50 overhead of about 1.5% (5 facts) and 3.0% (10 facts), with p99 moving in opposite directions (+14.4% / -10.1%). No calibrated A/A noise window was run. These measurements do not establish that latency has no regression. The source avoids adding a transaction round trip, but that structural fact is not a latency PASS. Live same-slot confirmation and a calibrated comparison remain open.

## Frozen pins and contract handoff

Only one **existing pinned file** changes; it occurs at three locations in obligations.json:

| File | Frozen hash | New source hash | Why |
| --- | --- | --- | --- |
| `packages/testkit/src/index.ts` | `6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988` | `995bc1ace5ebb9654a74e238b8860cb7e8f012a979c7c4cf86d03388efd935c7` | Updates TK journal expectations and exports the new record-time conformance helpers |

Locations: `/oracleFilesPinned/O-TESTKIT/0`, `/caseSets/CS-U44/pinnedSourceFiles/0`, `/caseSourcesPinned/CS-U44/0`. The complete recursive scan is `evidence/pinned-hash-drift-final.json`; it lists every mismatched existing path/hash pair, not merely a guessed affected set. New helper modules are not covered by that old single-file pin and must be included by contract 0.4.0. The contract owner must also re-freeze both A0 controls and apply the separately accepted oracle/golden changes. No old receipt should be compared with a 0.4.0 series receipt.

`evidence/contract-page-final.stdout` retains the non-byte-identical result. Unchanged generated outputs remain byte-identical; the changed computed obligations and transitive ACCEPTANCE hash are expected drift, **not G7 PASS**. Source changes in `lab/oracles/replay/` and `lab/acceptance/` relative to baseline are empty.

## PASS / verdict / receipt audit

The complete initial audit is retained in [PASS-AUDIT.md](PASS-AUDIT.md). Final inventory:

| Site producing a receipt, observed verdict or completed-case event | Content | Freshness | Binding |
| --- | --- | --- | --- |
| RecordStamp gate/conversions | Exact inverse/order/range; watermark checked after wait | Reads current attempt; no cached successful cut adopted | Requested cut and observed scope cut |
| A0 transaction success, both adapters | Exact marker attempt, position and stamp; XTDB operation ID too; persisted rows use same stamp | New attempt IDs; read-back after this submission or exact lost-ACK resolution | Scoped position/stamp CAS and exact operation/attempt |
| Operations committed resolution | Durable marker identity, safe position, valid exact stamp | Resolves the original durable commit explicitly; never claims a new commit | Scope and operation ID, durable attempt |
| Journal decode | Own instant comes from its persisted position fact; legacy fallback explicit | Decodes supplied stored bytes, never today's clock | Transaction identity/position |
| Core cutFor | Shared gate checks T before implicit P is selected; propagates typed refusal and interruption | Each first-page/echo request reads/waits anew | Exact requested T and resulting position; cursor continuations stay pinned |
| Conformance/schedules/determinism and lane/core tests | Compare receipts, complete rows/history, journal changes, refusals, reference stamps and fresh-run bytes | Fresh fixtures/scopes per run; no prior PASS imported | Controllable clock, inputs, encoding, source-bound runner hashes |
| Route harness HE-1–HE-8 and case completion | Expected bytes, cut echoes, forcing/refusals, repeated served bytes, monotone/group stamps | Attempt-local plan and history extensions | Exact route/input plan; source bound by run receipts |
| Live probes | Hand-derived SQL/XTQL row arrays and typed refusal with zero writes | Unique probe scopes, current endpoint reads, source/build before/after equality | Exact endpoint, statements, input cuts and scope |
| Gate/consumer controllers | Raw exit codes plus actual package tests, type/runtime assertions and tar entries | Fresh run directories; before/after source equality | Commands, source/tar hashes, package lock and consumer source |
| Microbench | Receipt position/count/row-stamp checks before duration sampling | New fixture each arm; alternating pairs; source unchanged check | Preserved main snapshots and exact current source/build bytes; never emits performance PASS |
| Final evidence manifest/resident observation | SHA-256 of retained bytes; exact before/after container identity/caps comparison | Generated at closure with fresh private-daemon inspect | Relative paths and exact container IDs/private daemon; not semantic engine acceptance |

No runner exit, partial case completion, old passing receipt, generated query shape or benchmark timing is promoted to a whole-run semantic PASS. Failed and interrupted attempts are retained and labeled as such.

## Resources, cleanup and remaining work

All expensive commands ran through `lab/bin/heavy.mjs`; all package caches stayed owned by this checkout or the explicit shared project store. Disk remained above the 5 GiB admission floor. No engine was stopped/recreated, no exclusive slot was claimed, and no default Docker daemon or unrelated ports were used. Read-only resident identities before and after are in `evidence/resident-identities-before-probes.json` and `evidence/resident-identities-final.json`.

Only positively identified RT01 client workers were signaled during failed-attempt retirement. Their process chains/signals and fresh gone-readback are retained in `attempt3-cleanup.json`, `attempt4-cleanup.json` and `cleanup-final.json`. Resident state, unknown backend data and first failures were retained. Temporary owned baseline JS/declaration directories and exact scratch templates were removed; dependency caches remain local and ignored. Tarballs, consumer source/lock, original source snapshots and checksums are retained.

Before promotion: complete final-source live conformance (including 200/50 concurrency, journal/readback and available live routes), resolve/calibrate the latency guard, have contract 0.4.0 re-pin sources, and obtain independent adversarial review. Round B and seals require their own branches and gates. This builder neither merged nor pushed the branch.

## Fix round 2 — QA F1–F3 and Q96b

North star: P1 exact named cuts on every route; P2 journal bytes and receipts tied to the physical decision. Review authority: verify/RT01 `420f647`, findings F1–F3 against Q89c/Q90d/Q90e. Q96b additionally requires an engine measurement of the second scope scan before merge; this round supplies the requested offline measurement only and lists the live obligation.

Changes: one core `toReadError` mapper is used at storage, Datalog, native (both inner and outer), interval, maintained, operation and core-cut read boundaries. It preserves exact typed basis/normal read objects and wraps other causes once. One journal encoder now handles every row kind; callers pass the physical decision instant explicitly. It omits same-physical-commit assertion times on retracts as well as assertions and restores omitted fields from the journal row on decode. Legacy v1 and older-commit assertion times remain supported. Both adapters put the empty-ID shortcut inside their common query path after basis resolution, matching their existing nonempty and empty-dependency behavior.

Copied reviewer reproductions (original and adapted bytes), regression tests, source bindings and the scan-cost runner are indexed by [round2/INDEX.md](round2/INDEX.md). The pre-commit PASS audit is in that index: exact typed objects, raw/hydrated journal content, watermark observations before shortcuts, and fresh/source-bound runner checks. No code in this round emits an engine acceptance or performance PASS. Results follow after fresh gates; live G2/G6 and independent re-review remain outstanding. Acceptance files and the oracle are not edited.

### Round 2 results and boundaries

Final product commit: `2ade6e755cc2877e36569da6f8f44ece22229cf0`. Later round 2 commits update measurement controllers, indexes and retained evidence only. `evidence/round2-final/execution.json` records sourceUnchanged=true, the exact product commit, and all 14 phases at exit 0: builds/typechecks for core/testkit/XTDB/QLever plus both core typecheck suites. Tests: **859 core + 93 testkit + 74 XTDB + 37 QLever = 1,063 passed**, 116 engine integration cases skipped. The initial gate's sole failure was TS6133 for an unused QLever ReadError import after consolidation; its raw output is retained in `evidence/round2-initial/`.

`round2/attempt2/execution.json` has error=null and sourceUnchanged=true, binding fresh runner/source/build bytes. It executes copied reproductions from review `420f647`; PROVENANCE.json verifies their exact original bytes and records adapted hashes. All four actual adapter/core offline schedules complete (XTDB and QLever, A0 and compact; deferred T8 N/A). All **32 route observations** now expose top-level BasisNotAvailable with recordedAt axis, including XTQL, SQL, SPARQL and empty public entity batches. The 12 nearby route probes wait 2000.3–2002.9 ms before refusal; immediate far-future and successful available empty batches are separately checked by the new lane unit tests. The first reproduction attempt stopped at a scan-capture fixture error because schema initialization has no CAS guard; it remains in `round2/attempt1/`, with no semantic acceptance adopted from its process exit.

The ordinary same-command assert/retract reproduction and cross-ordinal journals on all four lane/encoding combinations now omit both their own recordedAt and retractedAt fields in raw changes. Hydrated public changes recover the receipt instant. Core table tests retain older assertion instants, and the original legacy-v1 decode test remains green. Two actual XTDB encoding tests additionally assert raw omissions and hydration for both single-command and nested physical groups. No accepted-oracle execution or oracle source edit was performed in this fix round; these are product content checks, followed by independent re-review.

### Q96b offline scan measurement and required live G6

`round2/scan-final/scan-cost.stdout` and its execution.json bind the captured **actual emitted A0 and compact ASSERTs**, source/build bytes, the exact baseline SHA256 and the input matrix. Baseline source is the preserved pre-RT01 adapter at `59e07afb7a25dfb22bca60f8d769b74651aa835a`, SHA256 `5a9b4d63a8754e974c4a270610880f3c5199a525354255ff6bf0b9c9a2d6a58e`. Its position-only guard is compared with RT01's position-plus-stamp guard. The counterfactual omits the stamp check only in the model; production CAS is unchanged.

The model evaluates each emitted MAX column as a separate sequential scan over explicitly sized synthetic scope history. Expected maxima are checked on every iteration, with warmup and six alternating-order pairs per point. It counts **N versus 2N row visits per guard**. Timing below is the median pair mean in microseconds per guard, including model validation overhead; it is neither an engine plan nor a complete commit latency.

| Encoding | Scope history rows | Position-only us | Position + stamp us | Model change |
| --- | --- | --- | --- | --- |
| a0 | 0 | 0.067 | 0.096 | 43.3% |
| a0 | 100 | 0.499 | 0.713 | 42.9% |
| a0 | 10000 | 43.875 | 61.587 | 40.4% |
| a0 | 100000 | 431.213 | 631.596 | 46.5% |
| compact | 0 | 0.084 | 0.167 | 100.1% |
| compact | 100 | 0.461 | 0.655 | 42.1% |
| compact | 10000 | 43.548 | 61.708 | 41.7% |
| compact | 100000 | 436.458 | 626.938 | 43.6% |

The added stamp predicate shares the existing ASSERT, so it adds no PG-wire statement; that does **not** establish zero engine cost. The offline scan model is distinct from round A's O(1) SQL transport microbench. QLever uses an exact marker/stamp predicate and has no additional MAX(stamp) history scan in this implementation. This measurement does not qualify either engine's planning, numeric storage, durability or commit latency.

**Live G6 remains required before RT01 merges (Q96b).** On one exclusive XTDB slot, compare the pre-RT01 A0 build with this exact product build at fresh and 10k-history points, alternating ABAB with the same declared 5/10-fact inputs and calibrated A/A noise. Retain p50/p99, exact source/build/engine identity, historical-row counts, statement/round-trip counts and actual scan/read evidence. R39 F6 specifies 150 ten-fact commits per point; include that trace. Measure A0 and compact separately if both are proposed. No live scan cost or no-regression verdict is inferred from the JS model.

### Round 2 pin, PASS audit and handoff

No additional existing pinned path changes in round 2. The previously moved `packages/testkit/src/index.ts` remains the sole unique stale existing pin: old `6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988`, new `995bc1ace5ebb9654a74e238b8860cb7e8f012a979c7c4cf86d03388efd935c7`, at the three contract locations listed above. The fresh recursive scan is retained in `round2/attempt1/pins.json`. No `lab/acceptance/` or oracle delta exists against the prior builder head. The evaluator 108/108 and non-byte-identical contract result above remain historical round A evidence; neither was rerun or re-certified here.

The complete round 2 content/freshness/binding audit is in `round2/INDEX.md`: the shared mapper preserves exact typed objects; the one encoder receives the required physical instant and checks raw and hydrated content; common read paths gate before empty returns; copied probes assert content rather than process success; and the scan controller verifies matrix/expected maxima, stable source/build/baseline bytes and raw-output hashes without emitting a performance PASS. Final checksum inventories bind the report, runner bytes, failures and successful attempts. The source-bound package runner retains actual commands and exits as before.

No engine/container/slot lifecycle action, Docker command, live query, merge or push was performed in round 2. No root pnpm check, full pack/consumer suite, PostgreSQL/FoundationDB integration, live G2/G6, oracle re-certification or independent acceptance is claimed. No new external service was used. Raw evidence is within rule 9c's Git limits; ignored local dependency caches are excluded. **Handoff: F1–F3 fixed with fresh offline checks; independent re-review and live G2/G6 remain open, as does the contract-owner re-pin.**

`round2/finalize.mjs` / `CLOSURE.json` adds the final receipt-audit site: before publishing the table/index it checks all 14 fresh phase exits and raw-log SHA256s, current package source equality with the gate's sourceAfter, current package/build bytes against the successful reproduction, and current scan/baseline bytes against the scan receipt. Its retained original runner preimage must match the scan receipt's SHA256. These are content and exact-byte bindings to those attempts, not a new semantic acceptance. It checks the empty acceptance/oracle diff and rule 9c sizes (4,438,908 raw bytes in total; no raw file exceeds 1 MB). Reconstructed intermediate runner preimages are explicitly hash-checked copies, not claims of original Git commits. The final checksum refresh includes this audit paragraph and does not change any measured/product bytes.

## Fix round 3 — journal basis and pending named reads

North star: P1 immutable named cuts and P2 exact journal snapshots. Review: verify/RT01 `fdbcbb7`, F4–F6 (Q89a/c, Q90d, R33). The journal now enters the same shared P/T gate as both lane resolvers before any index access; index and envelope reads are bound to the snapshot position, and its catch uses `toReadError`. Named reads use committed data, including inside an open transaction. Latest read-your-writes remains distinct. Unavailable pending cuts wait for publication, or return the typed refusal at the deadline. A T already covered by the committed watermark can be answered from committed rows without waiting on unrelated provisional work.

The pre-commit content/freshness/binding audit is [round3/INDEX.md](round3/INDEX.md). `runNamedTimeSchedule` extends RQ01 at the public testkit /route subpath, comparing every successful repeated request to its first served canonical bytes across random schedules and grouped physical commits. It tests all RQ01 semantic-model snapshot routes and actual pending/committed adapter routes; copied full read matrices and concrete before/commit/after proofs check the wider API inventory. Results follow after fresh execution; no promotion is implied.

### Round 3 results

Product source: `a754ac12` (journal/gate/overlay fixes and property tests), plus fixture correction `4b305bc8886d4bcdd73f36be65b53fda3e1846cd`. The adopted package and reproduction runs both bind that latter head and report sourceUnchanged=true. Later changes are report/index/evidence work only.

| Fresh check | Result | Evidence |
| --- | --- | --- |
| Four builds/types/tests, both core typecheck suites | **All 14 phases exit 0; 863 core + 96 testkit + 77 XTDB + 38 QLever = 1,074 passed**, 116 engine integration cases skipped | Durable `packages3/execution.json` and its hashed logs |
| Complete committed read-entry matrix | **510/510 match**, including all eight natural future journal snapshots and both injected index refusal identities | Durable `attempt1/matrix/observations.json` |
| Complete pending-context matrix | **80/80 match**, including empty/nonempty storage/core reads and XTDB executor/overlay routes | Durable `attempt1/pending/observations.json` |
| Concrete before/commit/after D-C1 proofs | **4/4**: both lanes, A0 and compact. Early reads refuse with recordedAt axis after 2000.6–2002.2 ms; publication at 1000.001 then yields one row at the identical T | Durable `attempt1/pending-proof/` |
| Random named-time property | 48 generated model histories cover every RQ01 model snapshot route; eight actual pending XTDB histories and eight actual QLever histories cover committed/pending routes. No violations; the staged-stamp control detects HE-5 | New package property tests and adopted logs |
| Pending publication/rollback controls | Both XTDB encodings: provisional retirement cannot alter an old named cut, latest read-your-writes still observes it, rollback restores latest state, and a child named read cannot answer before the enclosing physical publication | Adopted XTDB tests |
| Journal pagination controls | Delayed availability, timeout without an index query, exact typed index-object identity, empty result, positive envelopes and continuation after a later head | Adopted core journal-basis tests |

The property compares canonical **snapshot row bytes**, using RQ01's contract and reference fold; trace/latency fields are not part of that row contract. It remembers the first successful answer, not only the previous one. Unavailable-cut refusals may become answers after publication and are never stored as earlier successful bytes. The scheduler begins with a valid committed prefix and publishes each declared physical group atomically. It does not combine distinct equal-stamp commits or relax receipt/history grammar. Actual QLever randomized schedules sample available T values; its unavailable pending cuts are covered by the full pending matrix and four concrete proofs. These are offline transports/models, not planner, durability or live-isolation qualification.

First failures remain durable: `packages1/` exposed invalid new property histories (empty/partially published groups); `packages2/` exposed a missing SPARQL-fixture literal helper and also records source drift while fixture corrections were applied. They are not adopted as whole-run gates. `packages3/` and `attempt1/` are the clean source-bound attempts. No failed product comparison is converted to PASS by rerunning it under the same identity.

### Round 3 retained evidence and pins

All new raw output is outside Git at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round3/`. [DURABLE-INDEX.json](round3/DURABLE-INDEX.json) lists every attempt and the adopted ones; [DURABLE-SHA256SUMS](round3/DURABLE-SHA256SUMS) binds every retained file. [RESULT.json](round3/RESULT.json) records content/source checks and the exact test/matrix denominators. Local source/report/index checksums remain in the experiment manifest. Original and adapted reproduction bytes are retained locally with review commit `fdbcbb7` and SHA256 provenance. No dependency cache is copied into evidence.

The recursive existing-pin scan still finds only the same unique stale file, `packages/testkit/src/index.ts`: old SHA256 `6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988`, new SHA256 `995bc1ace5ebb9654a74e238b8860cb7e8f012a979c7c4cf86d03388efd935c7`. It is repeated at `/oracleFilesPinned/O-TESTKIT/0`, `/caseSets/CS-U44/pinnedSourceFiles/0` and `/caseSourcesPinned/CS-U44/0`. **No additional existing pin moved in round 3.** New/shared helper and property-harness source coverage remains for the contract builder. Acceptance and oracle diffs against `506cfaf2` are empty; neither was regenerated or re-certified here.

### Round 3 PASS / receipt audit and handoff

| Observation-producing site | Content / freshness / binding |
| --- | --- |
| `gateRecordBasis` | Reads this attempt's actual scoped cut, validates P, uses one P-then-T wait budget, rechecks availability and returns a cut or exact typed refusal. Both lane resolvers, the journal and page/echo bridge call it. |
| Journal reader and mapping | Shared gate runs before index access. The index and each selected envelope carry the same snapshot P; core page validAt is captured once. `toReadError` preserves typed object identity at availability/index/envelope boundaries. Tests inspect real refusals and callback cuts, including positive continuation. |
| Named storage / XTDB executor routes | Explicit T/P selects committed reads before any shortcut/overlay branch; no callback delta is adopted as a committed snapshot. Latest reads retain their separate overlay. Tests prove wait/publication and rollback content, and the concrete copied schedules check both lanes/encodings. |
| `runNamedTimeSchedule` | Seeded complete physical histories, forced route IDs, reference canonical row content and a first-served map check every repeated successful request. Undeclared/wrongly eligible refusals fail; a staged-stamp negative control produces HE-5. Package runner source/log hashes bind these tests. |
| Package/reproduction controllers | New attempt paths, actual command exits and all matrix/proof contents; before/after hashes cover exact package source, built JS and executing reproductions. A zero exit alone is not semantic acceptance. Complete 510/80/4 denominators are required. |
| `finalize.mjs` / `RESULT.json` / manifests | Verifies all phase log hashes, current source equality with gate sourceAfter, current source/build/runner equality with the adopted reproduction, every matrix row, four proof contents, 1,074 tests and the empty acceptance/oracle delta. Fresh local SHA256 inventories bind all durable attempts, including failures. It explicitly records independentReview=false and liveG2G6Qualified=false. |

No engine/container/slot lifecycle action, Docker command, live query, dependency install, merge or push was performed in round 3. Host free space remained above the 5 GiB admission floor (about 10.6 GiB at closure). New raw outputs stay durable outside Git under rule 9c. No root pnpm check, full pack/consumer rerun, external-backend integration, accepted-oracle execution, live G2/G6 or independent acceptance is claimed. The earlier evaluator and G6 observations remain historical. **Handoff: F4–F6 are fixed with fresh offline regressions and complete copied matrices; independent re-review, live G2/G6 and contract-owner re-pinning remain open.**

The final `round3/verify-evidence.mjs` / `VERIFIED.json` audit site checks every durable checksum, current package bytes against the adopted gate, and the complete post-publication public triples against each proof's exact receipt triples (all four lanes/encodings), not merely row counts. It then regenerates and verifies local report/source/index manifests. This is retained-byte and observed-content verification, with independentAcceptance=false.
