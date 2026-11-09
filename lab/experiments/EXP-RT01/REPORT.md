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

## Round 4 — F7: clock-independent journal cuts (2026-11-09)

Review `verify/RT01` `dad9d9b` confirmed F4–F6 and found F7: a fixed-position journal page disappeared when its reader clock preceded the transaction's staging time. Read `VERIFY-round3.md` and retained byte copies of its `round3/journal-clock.ts` and `sql-transport.ts` as `round4/reproductions/*.original.txt`. The runnable copies adjust paths and assert the repaired result, with additional continuation and feed checks. No acceptance or oracle file was changed.

**Implemented:** internal `journalBasis(position)` explicitly selects all valid time and the exact committed record-position cut. `TriplesLive` uses it for the entity-journal index; its `journalRows` choke point serves envelopes, transaction lookup, command lookup and the feed. KV uses the same basis for its Datalog index and `journalScan` choke point. Its feed retains the TYPE index through a basis-aware `getByEntityTypeAsync`, rather than introducing a scope-wide scan. The unchanged shared `transactionsForEntity` gate runs before the index; exact snapshot position reaches both index and envelope. `toReadError` still preserves typed basis refusals.

Core SQL lowering, XTDB SQL/rule lowering and row visibility, QLever SPARQL and row visibility, and KV visibility honor the explicit mode by omitting **only** business-time predicates. Record-position and retirement visibility remain enforced. SQLite, PostgreSQL and Cloudflare adapter filters also honor the mode because they consume the shared core journal service. Ordinary public temporal inputs still resolve business time normally; the public TemporalBasis schema is unchanged. The `validAt: 0` structural field in this internal basis is never a sentinel predicate: the explicit `allValidTime` mode removes valid-time predicates entirely.

Audit of other readers: all production `transactionRecordFromTriples` / `transactionRecordsFromTriples` consumers and the changed-entity journal index are in the SQL and KV services above. Host transaction/command/feed operations delegate to those services. HTTP's transaction metadata helper writes provenance rather than independently querying a journal. There is no remaining runtime-clock predicate in those journal/feed reads. Round-B paths are outside this branch.

### Fresh observations and limits

`round4/RESULT.json`, [round4/INDEX.md](round4/INDEX.md), [round4/DURABLE-INDEX.json](round4/DURABLE-INDEX.json) and [round4/DURABLE-SHA256SUMS](round4/DURABLE-SHA256SUMS) index the exact attempts. All new raw bytes are outside Git at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round4/`.

- Adopted package run `packages3`: **25/25 phases**, with source and runner bytes unchanged. Core 864, testkit 96, XTDB 79, QLever 39, SQLite 6, PostgreSQL offline exports 2, Cloudflare Node tests 10: **1,096 passed**, plus the existing 116 XTDB/QLever integration skips. Shared SQL was built with declarations before its consumers. PostgreSQL integration and Cloudflare workerd were excluded from this adopted offline run.
- New permanent regressions: both XTDB encodings execute the reviewer's emitted SQL through SQLite; KV exercises the analogous real service. A receipt-bound nonempty page remains byte-equivalent at clock 1000, backward clock 900, after a second commit staged at 5000 with reader clock 800, and on continuation at the fixed position. Transaction, command and feed envelopes remain equal. The XTDB normal entity read at validAt 900 remains empty, proving ordinary business-time filtering still applies. QLever's additional compiler test checks record predicates survive while valid-time comparisons disappear; it is not a live positive QLever journal result.
- Reproduction `attempt1`: the copied actual XTDB A0/compact reproduction and strengthened continuation/envelope/feed checks succeed. The copied F4–F6 matrices retain **510/510** expected outcomes, **80/80** pending outcomes, and four typed-before/nonempty-after publication proofs. All four commands exit zero. No earlier successful empty answer is adopted.
- Binding qualification: the reproduction controller honestly records `sourceUnchanged:false` and `error:" source drift"`. Its entire before/after inventory differs in exactly **one newly added, unused file**, `round4/run-pack.mjs`. No existing package, dependency lock, executed probe, imported helper, build or controller byte changed. `close-bound.mjs` explicitly checks that exact addition, every pre-existing hash, current source/build hashes and the absence of any reference to the new pack runner from the executed drivers/controller, then rechecks all actual results. The original strict `close.mjs` is retained but was not used to override the drift flag. RESULT preserves both `reproductionFullInventoryUnchanged:false` and `reproductionExistingInputBytesUnchanged:true`. This qualifies the stated observations through their unchanged actual inputs, not a fictitious globally stable inventory.

First failures remain durable. `packages1` failed my new KV fixture's malformed transaction ID; the corrected fixture uses a valid 26-character ID. `packages2` passed all four RT01 packages but exposed missing shared SQL declarations and explicit SQLite/PostgreSQL basis annotations in the extended checks. These were corrected before `packages3`. That extended attempt also unintentionally ran the PostgreSQL Testcontainers integration suite, contrary to the lab's engine-only lifecycle rule. It failed on the private Docker socket mount before PostgreSQL startup. I corrected the runner to use offline exports only. The retained read-only `packages2/container-inventory-after.json` shows only three lab-managed containers, no Testcontainers container and no CX-RT01 holder. I did not perform container cleanup or alter a resident/exclusive engine; the failed invocation is not integration evidence.

Host free disk was above 5 GiB at each heavy admission (about 6.8, 5.4 and 5.2 GiB respectively). It fell below 5 GiB after the final run, so **no further heavy job was admitted**. `pnpm pack:check` was prepared in `round4/run-pack.mjs`, including an owned-store wrapper for its nested pnpm calls, but was not started under that floor. Pack/consumer qualification remains open. No fresh root check, accepted-oracle execution, evaluator 108-suite, contract generation/verification, external-engine run, G2/G6 or independent acceptance is claimed. Earlier evaluator and G6 evidence remains historical. The Q96b added A0 scope-wide stamp scan measured offline in round 2 still belongs on the live G6 list; the CAS path was not changed here.

### Pins for the contract builder

The current recursive scan still finds exactly one unique stale existing path in three `lab/acceptance/obligations.json` entries. No additional existing pin moved in round 4:

| Path | Pinned sha256 | Current sha256 |
| --- | --- | --- |
| `packages/testkit/src/index.ts` | `6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988` | `995bc1ace5ebb9654a74e238b8860cb7e8f012a979c7c4cf86d03388efd935c7` |

Locations: `/oracleFilesPinned/O-TESTKIT/0`, `/caseSets/CS-U44/pinnedSourceFiles/0`, `/caseSourcesPinned/CS-U44/0`. The new all-valid-time basis/lowering and journal regressions need coverage in the contract builder's next source set; existing pins have not been regenerated. The diff of `lab/acceptance/` and `lab/oracles/replay/` against `26772e42` is empty.

### Round 4 PASS / receipt audit (before commit)

| Result-producing site | Content | Freshness and binding |
| --- | --- | --- |
| `Temporal.journalBasis`, `TriplesLive.journalRows` and entity index, `KvTriplesLive.journalScan` and entity index; compiler/storage visibility lowerers | Decode actual journal cells; shared page helper checks index row identities and exact envelope positions. All-valid-time mode removes clock predicates while retaining record/retirement predicates. Receipt creation and journal encoding are unchanged. | Current committed cut or the exact shared-gated page cut; fresh backend reads, scope-bound adapter/backend; no provisional overlay or cached historical PASS supplies a page. |
| New XTDB/KV clock tests and QLever compiler test | Nonempty receipt-bound pages; complete page/record equality, continuation and business-time negative control; generated SPARQL predicate checks. | Fresh isolated test scopes, current emitted SQL / actual KV service; both encodings; current package sources built/tested in `packages3`. Compiler coverage is labeled as such. |
| Copied/adapted `journal-clock.ts` and SQL interpreter | Complete logical page/envelope/feed equality and receipt/position identities, with actual SQL retained. | Fresh receipt IDs, same request/position at each clock, imported transport digest checked before/after; SQLite interpretation is offline, not XTDB isolation qualification. |
| Copied read/pending matrices and `run-reproductions.mjs` | Exact 510/80 expected outcomes and four timed refusal/publication proofs; controller checks complete journal observations, nonempty changes, continuation and no emitted journal valid-time predicate. | New attempt; exact executed driver/helper/source/build/lock hashes retained. Full inventory drift is preserved and narrowed to the unused addition, never silently relabeled. |
| `run-packages.mjs` | Every status and actual test summary retained; shared SQL declaration phase and restricted PostgreSQL exports explicit. | Fresh builds before tests, source/runner hashes before/after, command times and raw output SHA256s, heavy grant; no engine slot claimed. Failed earlier attempts retained. |
| `close.mjs` (strict, unused) and **executed `close-bound.mjs` / RESULT** | Re-read all adopted log hashes, 1,096-test totals, complete journal pages, all matrix denominators/proofs, pin drift and empty protected-source diff. The bound closure permits only the proven unused-file addition described above. | Exact current package/build/helper bytes and every pre-existing input checked against this attempt; closure self-hash recorded. `liveG2G6Qualified:false` and `independentReview:false`. |
| `seal.mjs`, local/durable manifests | Read back all retained bytes and compare SHA256s, including failures; enforce local single-file evidence size. | Manifest built from this run's owned durable paths and committed tools/report. Integrity verifies retention only and does not issue semantic acceptance. |
| `run-pack.mjs` / upstream pack checker (prepared, **not executed**) | No PASS or pack receipt was emitted; it would retain outputs and hashes with the owned store/native smoke disabled. | Admission was withheld below 5 GiB. Requires a later heavy grant and a fresh artifact directory. |

**Handoff:** F7 is fixed and the stated offline regressions pass. Independent re-review, live G2/G6 (including Q96b), contract-owner re-pinning and pack/consumer qualification remain open. No merge, push, deployment or round-B work was performed.

## Round 5 — N1 explicit-valid-time control and 0.4.0 pin handoff (2026-11-09)

Read independent review `verify/RT01` `7222e7e9`, `VERIFY-round4.md`: it accepts round A offline and identifies N1 as a nonblocking test-control defect. Fixed `packages/xtdb/test/journal-clock.test.ts` to pass the basis directly to `entity`. The first fact now has the explicit upper bound 2000 (default validFrom remains stagedAt 1000). With runtime fixed at **800**, the test compares complete returned triples against this attempt's receipt at V=1000 and 1999, and against the empty set at V=999, 2000 and 2001; the default-time read is also empty. Thus ignoring the explicit V or retaining the old nested shape would fail the inclusion checks. Both A0 and compact execute the same control. Journal/continuation/backward-clock checks remain in the test.

Fresh targeted gate: `node lab/bin/heavy.mjs --label CX-RT01-r5 -- node lab/experiments/EXP-RT01/round5/run-test.mjs`; **2/2 tests passed**, current source/runner bytes stable. This is the changed test file only, not a rerun of the earlier 1,096-test suite. No production code, dependency or lockfile changed. Host disk free was about 7.4 GiB at admission; no engine or Docker action occurred.

[PIN-CHANGES-0.4.0.md](PIN-CHANGES-0.4.0.md) inventories current-main file pins at `3e403d80ce3e667fb2fb3e2a211accb484da6b23` / contract 0.3.13, including input maps and transitive SHA256SUMS members: 302 direct references / 243 unique paths, expanded to 602 references / the same 243 paths. The sole RT01-moved pinned source remains `packages/testkit/src/index.ts`: main **`cb89a55ced5426b8fa0af3523fbbeb73870e61e3622ebb42e8a78c3e67da8d28`** → branch **`995bc1ace5ebb9654a74e238b8860cb7e8f012a979c7c4cf86d03388efd935c7`**. The report reviews every hunk's correctness and measured-workload effect, lists all eight other literal pin divergences as upstream-only, and identifies four main metadata/projection occurrences rather than repeating the older three-occurrence inventory.

Pending contract 0.3.14 at `bed67f1f47914d519f73e6ea1ebdee098c9cb4ec` instead pins `2c26c678577f98a71003588c7c62b9a81ff6d109a033c72c521f295f4cb2ffdd`, adding the value-limit export. The 0.4.0 owner must preserve that export and main's route exports while integrating RT01's expectation changes and new exports, then hash the resulting bytes. Neither existing branch hash is claimed as the final integrated pin. No acceptance file was edited or generated, and no oracle source was changed.

Evidence: [round5/RESULT.json](round5/RESULT.json), [round5/DURABLE-INDEX.json](round5/DURABLE-INDEX.json), [round5/DURABLE-SHA256SUMS](round5/DURABLE-SHA256SUMS), with raw test logs, exact source maps, pin inventory and three source diffs under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round5/`.

PASS audit before commit:

| Site | Content check | Freshness / binding |
| --- | --- | --- |
| Modified XTDB clock test, both encodings | Exact receipt-triple equality for inclusion; empty exclusion/default reads; lower inclusive and upper exclusive boundaries, plus unchanged journal assertions. | Fresh isolated offline services/SQL interpreters, this attempt's receipt and explicit V schedule; runtime 800 differs from every explicit V. No live-engine claim. |
| `round5/run-test.mjs` | Requires actual zero exit and the fresh `2 passed (2)` summary; assertions execute the exact changed test source. | New `test1` directory, actual command/times, current package/lock/runner hashes before and after, Node/tool hashes, offline heavy grant and holder. |
| `round5/pin_inventory.py`, final main-ref confirmation and `PIN-CHANGES-0.4.0.md` | Resolve actual main/branch/fork bytes and SHA256s, expand pin manifests, classify every differing pin; assert exactly one RT01-changed pinned path and no protected branch delta. Hunk notes distinguish changed correctness requests from performance inputs and upstream-only changes. | Immutable main/fork/pending-review commit IDs and exact authority bytes, current worktree pin bytes, retained index diffs; no live ref or guessed merged hash supplies a pin. This is a handoff, not a contract/workload PASS. |
| `round5/seal.mjs`, RESULT and manifests | Re-read test log/summary/source hashes and pin inventory against current bytes and immutable main; verify exact denominators, protected-source exclusion and retained SHA256s. | Fresh bound attempt outputs, current helper hashes and source, durable paths read back; manifests qualify byte retention only. |

No full package/root/pack check, accepted-oracle/evaluator run, contract verification, live G2/G6, merge, push or round-B work was performed in this small round. Prior independent ACCEPT-OFFLINE remains scoped to round A. The review's DuckDB declaration/pack blocker N2, live G2/G6 (including Q96b), pending 0.3.14 disposition and the final integrated 0.4.0 source pins remain with their respective owners.

Round-5 retention notes: the first seal attempt stopped before emitting RESULT because Node's default `execFileSync` buffer could not hold main's generated obligations JSON (`ENOBUFS`). Its error/source digest is retained as `round5/seal1-failure.json` in durable storage; that diagnostic is not a complete raw stderr copy. Increasing only the inspection buffer to 32 MiB allowed the integrity checks to finish. Main advanced to `2fbc4ff394810ac78cbc6a1051a32b7caa222116` during the handoff; the retained final confirmation checks identical authority and all 243 pin paths, with only NOTEBOOK/STATE changed since the inventory. No pin conclusion changed.

## Live window — first non-timeout failure, stopped (2026-11-09)

**Result: G2 blocked by fresh-database initialization; G6 not run.** Product source remains round-5 head `554bf7d256ba7951beaf11184d0aaa4c4fac02a5`. No production fix, timeout change, contract edit, oracle edit or re-pin was made in this window. The stop is intentional under the dispatch's “first failure that is not the timeout under diagnosis” rule.

### Earlier timeout diagnosis

Read retained `evidence/xtdb-G2.txt`: the outer Vitest test allowed 600,000 ms but failed after about 197,732 ms, last logging shared case 26, **“wrapped filters preserve scalar types and SQL null semantics.”** Its error is the query executor's `AbortSignal.timeout` error, not Vitest's suite-timeout error. Current `XtdbQueryExecutor.ts` defaults that deadline to **30,000 ms** for the whole executor invocation (including basis resolution, domain reads and answer execution). The old output has no individual statement trace, so it cannot establish which of that case's six wrapper queries or preparatory reads consumed the deadline, or prove a hung wait rather than slow execution. The older T1 progress also shows multi-second writes and about 25 seconds for a pinned read, but this is not proof of a particular engine bottleneck.

Prepared an instrumented final-source driver, `live/g2.ts`, which first runs that exact case alone at the **unchanged 30-second deadline**, retaining every client query/submit start/end, SQL, parameters, scope and elapsed time. It then schedules all 44 shared cases on A0 and compact, 21 named public/SPI/native/interval/maintained routes per encoding, the full T1–T12 schedules (including **200 independent and 50 contended commits**, journal and readback assertions), and cross-encoding deterministic receipts. Those later stages were **not reached**. No successful live conformance or route coverage is inferred from the driver's presence.

### Slot, source and actual failure

Acquired xtdb-s1 through `engine.mjs up --lane xtdb --slot s1 --holder CX-RT01 --exp EXP-RT01 --fresh`, admitted under a heavy grant. Startup was healthy, with **3,758,096,384 bytes / 2 CPUs**, endpoint port **5471**, image **`sha256:a6a426505b95a36e4e0e1d0de88efcf4220cb6bde8f1f5e594b0a1f92a948a77`**, effective config **`13f5a70b36655b51fdf6daca77cc8bc215c4ef8bc044569867500fb286458927`** and container **`9661ccea4299931154ff5de97330bc6443e8711ab1c783d0d0ae83de4628d2be`**. Start/failure inspect bytes and owner record are durable. The failure inspect is the same running, healthy, non-OOM-killed instance.

`live/run-g2.mjs` freshly built core, testkit and XTDB with tsdown and declaration/type generation: **6/6 build phases exit zero**, with exact source/build/runner hashes retained. The actual final-source driver ran at **06:45:18–06:45:19 UTC**, exited 1, and its before/after source inventory is unchanged.

The first application query, during layer initialization before the isolated case could run, was:

```sql
SELECT position, stamp FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?
```

It returned in about **688 ms**, with `Table not found: tx_meta` and missing-column diagnostics, then surfaced **`MigrationError` / `xtdb-baseline: Cannot initialize XTDB tables`**. The production reader automatically attempted its position-only legacy compatibility fallback (`SELECT position FROM tx_meta ...`), which also failed with the missing table in about **5.57 ms**. Trace denominator: **two client queries, zero submits, zero completed cases**. This internal compatibility branch is retained in the trace; it was not an agent retry. This is not a timeout, concurrency failure, observed slow commit, or evidence about the earlier wrapper query's plan.

Source trace: `XtdbStorageAdapter.initialize` calls `readXtdbCut(client, scopeKey)` **before** its `CREATE TABLE tx_meta ...` submission (`packages/xtdb/src/XtdbStorageAdapter.ts:779`). `RecordCut.readXtdbCut` does not resolve absence of the physical metadata table as the empty cut. The fresh slot therefore fails before schema creation. This is a real fresh-database bootstrap path absent from prior populated resident/offline transports, not a reason to pre-create tables invisibly. A follow-up fix must distinguish a genuinely uninitialized store from legacy nonempty data and preserve legacy-scope refusal. **I did not fix or retry this new failure in this window.**

Consequently the original timeout's exact statement/cause remains unresolved, and all full-suite, 200/50, journal/readback and positive live route completion remain unverified on this source. **No G6 A/A calibration, regression threshold, baseline build, A/B arm, fresh/10k history point, 5/10-fact commit sample, p50/p99, statement/round-trip count comparison or second-scan measurement was run.** No noise rule or no-regression result was fabricated. The next window still owes R39 F6's 150 ten-fact commits per point with the declared ABAB inputs and a rule recorded after A/A calibration but before B.

### Cleanup and retention

After retaining the failure and engine logs, executed `engine.mjs down --lane xtdb --slot s1 --holder CX-RT01 --remove-volume`. It removed `tx2-xtdb-s1`, removed `tx2-xtdb-s1-data`, and released the reservation/lock. No resident was stopped or recreated, no other holder's slot/volume was removed, and no baseline volume was created.

Then executed the requested `colima ssh -p triplex2 -- sudo fstrim -av` (**exit 0**) and `docker context use colima` (**exit 0**, output `colima`). Trim output records 880,885,760 bytes on `/mnt/lima-colima-triplex2`, 95,547,904 on EFI and 117,141,504 on root; host-wide free-space change is not attributed to this alone. DOCKER_HOST remained the explicit private socket for Docker inspections. Host free disk was about **39 GiB** at the G2 admission, safely above 5 GiB; all heavy commands used `lab/bin/heavy.mjs`.

The first cleanup checker returned a **false negative**: it expected `No such object` while Docker emitted lowercase `error: no such object: tx2-xtdb-s1`. Its original `cleanup.json` with `containerAbsent:false`, raw outputs, and exact original runner preimage remain durable. Corrected the checker spelling for future use without rerunning lifecycle commands. The distinct **read-only** `cleanup-verification.json` verifies the exact retained response, command arguments, output hashes and post-G2 timestamps; it does not overwrite the failed receipt. A later retained pool snapshot and `post-cleanup-state.json` independently show no owner file, no CX-RT01 s1 reservation and no retained owned volume. No G2 or cleanup lifecycle command was retried to hide a failure.

All new raw bytes are durable at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live-window/`; [live/DURABLE-INDEX.json](live/DURABLE-INDEX.json), [live/DURABLE-SHA256SUMS](live/DURABLE-SHA256SUMS) and [live/RESULT.json](live/RESULT.json) index them. Only tools, manifests and this report enter Git. No pinned product file changed in this window; the round-5 pin handoff is unchanged. No merge or push was performed.

### Live-window PASS / verdict / receipt audit (before commit)

| Site | Content check | Freshness and exact binding |
| --- | --- | --- |
| `live/run-g2.mjs` | Actual statuses and raw build logs, generated build hashes, live exit and trace hashes; failed exit is preserved, never converted into conformance PASS. | New `g2-attempt1`, exact product source, lock, executed driver/controller before/after, current emitted artifacts, actual times and exclusive holder/slot. |
| `live/g2.ts` initialization/first-failure trace | Captures actual failed SQL/parameters/error; `outcomes` stays empty, no case/schedule/route/determinism PASS event is emitted. | Fresh isolated scope on the exact owned endpoint; same start/failure engine identity, direct actual client timings. No application submit occurred. |
| Prepared but **unexecuted** `g2.ts` case-pass, schedule-pass, route-pass and determinism-pass branches | Shared cases/schedules require their authored assertions; named-route checks require nonempty seeded observations and exact repeated full payloads at the served T/P after a proven later mutation; determinism requires exact fixture equality. These planned checks do not establish independent oracle correctness or completed route coverage here. | Each planned suite has a fresh scope/receipt and fixed request; controller binds all imported source/build bytes. None issued a successful receipt in this failed run. |
| Original `live/cleanup.mjs` / `cleanup.json` | Down is followed by exact container/volume inspections, owner and pool membership checks; missing-object content is checked in addition to exit. Original case-sensitive container check fails and is retained. | Only CX-RT01's recorded resource names, direct post-G2 command timestamps/output hashes; explicit triplex2 profile, private Docker endpoint and colima context command. No arbitrary exit-one is adopted as absence. |
| `live/verify-cleanup.mjs` / distinct verification | Exact retained lowercase missing-container and missing-volume responses, original argument identities, all output hashes; trim/context actual content and zero exits; original false-negative preserved. | Original owner matches this window, all observations postdate G2, verifier and original runner digests retained; no stale cleanup receipt or lifecycle retry. Subsequent pool bytes retained separately. |
| `live/seal.mjs` / RESULT and manifests | Rechecks six build outcomes, source/build/trace content hashes, exact first failure/two-query/zero-submit/zero-case denominators, engine identity and cleanup verification; RESULT explicitly marks G2 blocked and G6 not run. | Current source and exact unique attempt/build/slot inputs; all durable bytes read back, including failed checker. Integrity does not grant live engine or performance acceptance. |

**Handoff:** fresh-store initialization must be fixed and reviewed before a new, uniquely identified live attempt. Then localize the older timeout if it still reproduces, complete G2 including 200/50 and all available routes, calibrate A/A and run G6. The slot is released and requested host cleanup is complete; live G2/G6 remain open.

Live-window verifier note: the first seal attempt incorrectly asserted one query. It stopped without emitting RESULT when the trace showed two (stamp lookup plus the automatic position-only legacy fallback). The original verifier preimage and `seal1-failure.json` are retained; the corrected checker requires both exact statements/errors. No engine test was repeated.
