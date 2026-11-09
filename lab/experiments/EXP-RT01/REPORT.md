# EXP-RT01 round A — builder report

North star: P1 immutable reads at a named recordedAt, and P2 receipts that name the exact decided commit. Goals and targets come from `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`. Implementation follows R33 round A and Q89a-i/Q90a-g.

**Latest (round 7, offline): Q104a/M01 grading and the rerun controller/runbook are prepared; 17 rule tests and retained compact SQL/plan analysis pass. No live run. Live3 stays FAILED; its compact p99 sample has 81.795 ms outside measured wire cycles, with no demonstrated causal marker-scan bug. Await the orchestrator's post-DF01 window and GREEN grading. See `round7/RESULT.json` and the final section.**

**Initial round-A result: implemented; not qualified for promotion.** The builder's offline checks and selected live probes are evidence of specific behaviors, not independent acceptance. Full live conformance did not complete, G6 has no established no-regression result, and the frozen contract intentionally remains unchanged with a stale testkit pin. A separate adversarial review is still required.

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

## Live round 2 — catalog bootstrap fixed; G2 complete; G6 regression (2026-11-09)

**Result: offline product checks and final-source live XTDB G2 pass; G6 fails its first measured point. No promotion/no-regression claim.** The first G6 failure is retained, not retried. No 10k preload or later A/B point ran. All owned engine resources have been removed.

### Bootstrap and offline checks

Read accepted K01 `9b764517`, `REPORT-round13.md` (review `88bce4f0`). Reused its physical-catalog approach, not the earlier blanket assumption that CREATE cannot declare a table: `RecordCatalog.ts` joins the public table/column catalogs, validates table names, nonempty typed column names/types and uniqueness, and rejects malformed inventories. `RecordCut.ts` chooses metadata SQL from that inventory; it never catches a planner error to infer absence or missing stamps. Initialization forces a fresh inventory before any CREATE submission. A nonempty unstamped metadata scope, null stamp (including position zero), or orphaned assertions without usable metadata refuses with `MigrationError / record-stamp`, before writes. Empty metadata requires a fresh assertions inventory and, where physically present, a scope-bound COUNT. A missing scope-key column requires global emptiness rather than silently calling its data another scope.

Only a positive, queryable metadata schema is cached per client to select SQL shape. Absence and source cuts are never cached; the empty-cut branch refreshes the physical inventory. If cached schema disappears, the data query fails rather than becoming an empty answer. The cache test explicitly adds assertions after an earlier positive schema probe and requires refusal.

Added ten product regressions and a fixture copying the actual prior fresh-engine error, its exact SQL, original durable path and source SHA256. The mock throws those captured bytes if the old invalid probe is attempted. Other SQL transport fixtures now model catalog rows separately from metadata values. No acceptance or oracle file changed.

Fresh offline product execution: 25 build/type/test phases across core, testkit, XTDB, QLever, SQL, SQLite, PostgreSQL (export test only) and Cloudflare. **1,106 product tests pass; 116 integration tests are skipped offline.** Core runtime/entity type projects and SQL declaration generation also pass. The first XTDB development run retained one failure from a permissive query-compiler mock; correcting its catalog response made the final complete XTDB suite pass (89/89). The first full run passed 24/25 phases: an unchanged testkit retired-store test exceeded its default 5,000 ms budget on the shared host. The retained rerun executes **all 96 testkit tests**, unchanged product bytes, with an explicit 120,000 ms per-test budget; 96/96 pass in 132.19 s. The full initial run plus that one justified phase rerun are the adopted offline result, not a claim that the first run was green. All source maps and runner hashes are stable. Targeted lint: zero errors, two existing warnings (historical client fixture's unassigned timeout; unchanged constant-condition retry loop).

### Diagnostic and formal G2

Started fresh xtdb-s1 through engine.mjs, own holder CX-RT01, at 07:07:09 UTC. Engine **`7e1ff4f2d76824a45d52ca464939e1f4c563891b0c373d4b8d3e3b55075813a6`**, image **`sha256:a6a426505b95a36e4e0e1d0de88efcf4220cb6bde8f1f5e594b0a1f92a948a77`**, effective config **`13f5a70b36655b51fdf6daca77cc8bc215c4ef8bc044569867500fb286458927`**, 3,758,096,384 bytes / 2 CPUs, private port 5471. Start/end inspections show the same healthy instance and no OOM. Initial host free disk was about 33 GiB; all heavy admissions remained above 5 GiB.

The diagnostic walker ran 07:13:32–07:14:29 on the genuinely fresh store. It catches case failures in order and continues; `grantsAcceptance:false` unconditionally for diagnostic mode. Both 44-case shared suites, all 24 schedule cases and deterministic receipt fixtures completed. It retained six diagnostic failures, all driver expectations, in order: batch Map serialization, page snapshot-head comparison and includeBasis-head comparison, first A0 then compact. The transport returned a nonempty Map; JSON.stringify(Map) had hidden its contents. The other two requests named T but left P unpinned. R33 3.1, 4.3 Q4 and 6.3 HE-7 explicitly require each new request to echo its gate's current head P, including when T is older; they do not require a later request to echo the earlier head. The corrected driver serializes Map entries, compares complete data payloads, and separately checks exact unchanged T and exact expected head P (first receipt before, second receipt after). It does not normalize an arbitrary P away. Original diagnostic driver bytes, six failures and all trace bytes are retained.

The old wrapper timeout did **not** reproduce: the isolated formerly failing case and both accumulated-scope executions completed under the unchanged 30-second executor deadline (compact diagnostic case about 1.143 s). The prior log proves the executor's inner deadline expired, rather than the 600-second Vitest suite budget; it has insufficient statement-level timing to identify the old slow query or establish a hung wait. This round supplies a complete statement trace and successful executions, **not a proven causal explanation of that historical slowdown**. No production timeout was increased to make G2 pass.

Formal G2 then ran once, **07:15:40–07:16:52 UTC**, on the final product source, new scopes on the same owned engine, with six fresh successful build/declaration phases and exact source/build bindings:

- **44/44 shared conformance cases per encoding** (88 total), plus the isolated timeout case.
- **21/21 available named routes per encoding** (42 total): public entity/batch/page/match/query/page/echo/journal/dependency, storage entity/batch/query, executor normal/page, intervals, maintained, SQL and XTQL facts/recordedFacts.
- **T1–T12 per encoding**, including 200 independent concurrent commits, 50 contended replacements, exact journal/readback stamps, backwards clock, watermark refusal/release and lost-ACK recovery. T8's deferred-only behavior remains N/A for A0; T12 exercises live v2 journal while legacy decoding remains an offline decoder check.
- Three deterministic fixtures, A0/compact/A0, compare exactly.

There are 197 successful asserted observations, 42 route-pass events, 2 schedule-pass events and one determinism-pass event; no first-failure or query-error event. The 1,699 observed CAS submission rejections are expected inside the authored contention/retry tests, not agent retries of a failed gate. Formal G2 has `failures:[]`, `failure:null`, unchanged source, actual exit zero. This is builder gate evidence; independent live review remains separate.

### G6: calibrated rule and first failure

Built the complete pre-RT01 core and XTDB from **`59e07afb7a25dfb22bca60f8d769b74651aa835a`**, using a retained Git source archive and isolated local package resolution. Baseline XTDB resolves baseline core, not RT01 core; third-party dependencies are the same installed lock-bound bytes. Archive, every baseline source/build file, current G2 build/source, runners, exact engine identity and before/after inventories are retained. No other worktree was built or edited.

A loopback proxy counts actual PostgreSQL Execute/simple-query executions and server ReadyForQuery protocol cycles. These are observed protocol cycles, not a guessed count of physical network packets. It stores exact SQL by content hash and binds each wire event to its statement. Its offline test covers SSL refusal/startup separately from simple and extended execution. Two development test timeouts exposed a self-targeting proxy URL bug; both original logs and source preimages are retained, and the corrected test passes. These were offline unit runs, not live gate retries.

Inputs are identical generated assertion batches: one subject `bench`, attributes `:bench/0` through `:bench/9` (or through 4), string value `value`, clock 100000, fixed deterministic ID seed, no commandId. The prepared history path uses actual public commits, one engine transaction per commit, with the declared fact count, not synthetic rows or a huge literal VALUES preload. **That history path was not executed.**

A/A calibration used pre-RT01 only, two independent scopes, alternating 75-commit blocks, **150 samples per control**, separately for A0/compact and 10/5 facts (1,200 commits total). Before creating any B runtime, it wrote and hashed `g6-attempt1/AA-RULE-BEFORE-B.json`. Per encoding/size and metric, tolerance is `max(Aleft / Aright, Aright / Aleft) - 1`; a pooled 150-sample B/A ratio above `1 + tolerance` fails. Equality passes. This exact rule was fixed before B, with no after-the-fact widening. For ten-fact A0 the A/A p50s were 50.1353 / 47.4935 ms; p99s 142.8915 / 162.2323 ms: bands **5.5624% p50 / 13.5353% p99**.

The first point was fresh **ten-fact A0**, ABAB, 75 commits per block, **150 samples per build**:

| Metric | Pre-RT01 A | Exact RT01 B | B/A change | Pre-B band |
| --- | ---: | ---: | ---: | ---: |
| service p50 | 70.0338 ms | 90.5187 ms | **+29.2500%** | +5.5624% |
| service p99 | 131.1757 ms | 159.3687 ms | +21.4926% | +13.5353% |

**First failing assertion: p50 regression.** P99 also lies outside its already frozen band, but the run stops at the first assertion. No five-fact/compact B point, 10k preload, 10k measurement or later calibration/retry occurred. This is a failed G6 under the declared shared-host rule; it does not establish the cause of the complete service difference or a 10k result.

Each arm's first block starts at position 0, second at 75, ending at 150. Actual assertion/journal rows: A 0→1,725→3,450; B 0→1,650→3,300. Each end has 150 distinct recorded positions and one current metadata row. These are complete-path representation differences, not padded to an artificially equal row count. Last-receipt fact bytes, values, positions and instants are read back and checked outside timing windows.

Observed per measured commit: A always **2 client queries + 1 submit containing 6 statements = 13 protocol executions / 13 ReadyForQuery cycles**. B has the same counts for 149/150 commits; its first fresh commit has 4 queries and **17/17** cycles, including fresh empty-scope catalog/count checks. No submitted-statement count was added by RT01's merged guard. Both measured arms use the same loopback counting path.

Q96b scan probes ran on the completed fresh point, before applying its regression verdict: 30 actual queries per projection per build, alternating projection order, over the same scope's `tx_meta FOR ALL VALID_TIME`. B's position-only query p50 **6.9048 ms**, stamp-only **7.6941 ms**, combined position+stamp **7.6815 ms**; combined-minus-position p50 **0.7768 ms**. A's corresponding values: 8.2140 / 8.1255 / 8.6607 ms; increment 0.4468 ms. Raw samples and p99s are retained. These client query costs include AWAIT_TOKEN. They measure the additional scan as a standalone diagnostic; they do **not** isolate that scan's execution within COMMIT SYNC or attribute all +29.25% service latency to it. The actual guard remains one ASSERT with two MAX subqueries. **10k-history second-scan cost remains unmeasured**, as required by stopping at the first failed point.

### Cleanup, pins and evidence

Retained end inspection and engine logs, then `engine.mjs down --lane xtdb --slot s1 --holder CX-RT01 --remove-volume` removed the owned container and volume and released its reservation/lock. Verified exact missing-object responses, owner absence and absence of the reservation/retained volume. Then requested fstrim and docker-context restoration both exited zero: triplex2 trim reports 1,062,612,992 bytes on its data mount, 95,547,904 EFI and 117,141,504 root; context output is `colima`. No resident, unrelated slot, other holder's volume or default VM was modified.

Raw evidence is durable under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live2/`; [live2/RESULT.json](live2/RESULT.json), [live2/INDEX.md](live2/INDEX.md), [live2/DURABLE-INDEX.json](live2/DURABLE-INDEX.json) and [live2/DURABLE-SHA256SUMS](live2/DURABLE-SHA256SUMS) provide the bounded receipt/index. Bulky raw output and baseline build/source copies remain outside Git.

Refreshed pin inventory against immutable main **`bdfe24a1d39d71bb47a667e063ff35bbcaceed1b`**, contract 0.3.13: 302 direct references / 243 paths, same sole RT01-moved pinned path. `packages/testkit/src/index.ts`: main **`cb89a55ced5426b8fa0af3523fbbeb73870e61e3622ebb42e8a78c3e67da8d28`** → branch **`995bc1ace5ebb9654a74e238b8860cb7e8f012a979c7c4cf86d03388efd935c7`**. No newly moved pinned product path in this round. [PIN-CHANGES-0.4.0.md](PIN-CHANGES-0.4.0.md) remains the per-hunk handoff; preserve pending 0.3.14's exports when integrating/re-pinning. No contract regeneration, acceptance edit or oracle edit occurred.

### PASS / verdict / receipt audit before commit

| Site | Content | Freshness and binding |
| --- | --- | --- |
| RecordCatalog validation/cache; RecordCut empty/legacy decisions; initialize | Typed names/types/duplicates; exact schema-selected metadata values; fresh physical absence or scoped zero count; nonempty/null-stamp refusal before writes; no planner-error recovery. | Fresh initialization inventory; fresh empty-cut assertions inventory; scope parameters and actual client signal/deadline. Only positive SQL shape cached, never observed source data/absence. Ten source-bound regressions include captured-error provenance and zero-write assertions. |
| Product tests and offline runner | All actual statuses and test summaries; 1,106 passing product tests after the explicitly retained budget failure and one justified phase rerun. | New attempt directories; full before/after package/lock source maps, runner hashes, timestamps and actual commands. No engine PASS inferred from skipped integration tests. |
| Diagnostic walker case events/outcomes | Actual ordered assertion failures and complete remaining walk; unconditional `grantsAcceptance:false`; old driver preimage retained. | Fresh engine/unique scopes, exact executed helper and package/build hashes; no failed observation adopted as formal acceptance. |
| Formal G2 observe/route/schedule/determinism events | Authored cases, exact seeded data and repeated data payloads; explicit T and expected head-P echo checks; Map entries included; exact deterministic fixtures. Failure cause propagates in formal mode. | Unique scopes and this attempt's receipts/IDs/bases; owned endpoint; same start/end engine; six actual build statuses and unchanged current source/helper maps. Expected CAS/lost-ACK test recovery is recorded. |
| Wire counter and corrected offline test | Actual Execute/Q and Z frames, parsed SQL/portal binding, separate startup accounting; manual simple/extended expected 2 executions and 3 total Ready cycles (including startup). | This connection's frames/events; corrected source bytes retained; unique test logs, failures preserved. Counts do not pretend to be physical packet counts or isolated engine guard timing. |
| G6 commit/block/history-count/readback | Actual input hash, receipt fact values/count/position/instant, physical fact readback; matching scope counts/distinct positions and metadata. | Fresh named A/A and A/B scopes, same declared inputs/clock/seed, exact loaded baseline/current source/build/dependencies, current owned engine. No synthetic or earlier history receipt adopted. |
| A/A frozen rule, point verdict and scan probes | 150/150 controls, exact computed bands, SHA-bound rule before B; 150/150 A/B raw samples, actual quantiles/ratios; expected MAX values on 30 queries per projection. First p50 failure preserved, not PASS. | Rule write/hash precedes B measurements; matched ABAB progress and scopes; raw wire/client timings from this run. 10k and later points explicitly absent. Standalone scan diagnostics are not causal service attribution. |
| Baseline builder, pin inventory, seal and post-controller retention | Git archive at exact pre-RT01 commit, isolated resolution and actual builds; exact main/fork/current pin hashes; source/build/log/trace denominator and hash checks; retention runs after controller stdout closes and re-reads all 839 files (70,393,302 bytes). | Immutable commits and this worktree's actual bytes; new evidence paths, source/build hashes checked again at closure; protected contract/oracle delta empty. |
| Cleanup checker | Exact owned missing-container/volume messages, pool/owner absence, actual trim/context outputs and zero statuses. | Same recorded CX-RT01 resource names/engine, observations after G6; private daemon and explicit triplex2 profile. No unrelated resource absence inferred from arbitrary exit-one. |

**Open:** G6 regression investigation and an independently authorized follow-up; 10k/remaining live performance points and scan cost; independent live review; 0.4.0 re-pinning/integration and pack/root qualification. Historical wrapper-timeout attribution remains uncertain, although the complete case now passes with a trace. No merge, push, round-B work, root/pack rerun, evaluator/oracle re-certification or contract verification was performed this round.

## Round 6 — keyed marker stamp CAS; offline complete; G03 VM window stopped live admission (2026-11-09)

**Result: marker lookup implemented, 25/25 product phases / 1,112 product tests and the 510/80 matrices pass. No round-6 live gate or performance result.** At the actual admission check, CX-G03-V had active VM-probe reservations, so this round stops with [round6/RUNBOOK.md](round6/RUNBOOK.md), as dispatched. The previous live2 G6 failure remains unresolved by live evidence. North star: preserve P1's exact cuts and P2's atomic receipts while removing avoidable stamp-guard work; scope and targets remain `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.

### Evidence and cause candidate

Re-read and SHA-verified the retained live2 G2 statement trace, G6 statement dictionary and failed ten-fact A0 point. Both emitted guards contain separate `MAX(position)` and `MAX(stamp)` scalar subqueries over scoped tx_meta. The retained A0 point has six submitted statements and 13 observed Execute/Q / ReadyForQuery cycles per warm commit on both builds (the first fresh B has 17 cycles). Thus the extra aggregate did not require another warm PG-wire round trip. The prior service result remains A p50 70.0338 ms versus B 90.5187 ms, +29.25%, against the frozen 5.5624% band.

**This establishes the extra-aggregate cause candidate, not a causal attribution of all +29.25%.** Retained live2 counts show one current metadata row per scope, not N visible tx_meta rows, and live2 captured neither native plans nor native scan counters. Its N/2N model explicitly excluded XTDB planning/historical visibility. It would be incorrect to relabel those modeled visits as measured XTDB historical-row I/O. Native plans, scan counters and a source-bound A/A/ABAB run are still needed to confirm physical history work and the performance effect.

The new offline analyzer captures the actual newly emitted SQL for both encodings, binds old SQL to the retained wire dictionary after PostgreSQL placeholder normalization, and executes SELECT forms of the exact predicates in SQLite with a declared N-row model and uniquely keyed current marker. SQLite EXPLAIN QUERY PLAN changes the stamp branch from a table aggregate to `SEARCH ... USING INDEX ... (_id=?)`. Projection callbacks count actual evaluated model values:

| Modeled scope rows N | Before position + stamp visits | After position + keyed-stamp visits |
| ---: | ---: | ---: |
| 0 | 0 | 0 |
| 1 | 2 | 2 |
| 100 | 200 | 101 |
| 10,000 | 20,000 | 10,001 |

Both encodings have the same counts. This is **constant matching-row stamp lookup**, with the existing position aggregate retained; total modeled work is N+1, not an O(1) whole CAS. SQLite/index/projection counts are not native XTDB execution counters. The model deliberately represents scope history as N modeled rows, unlike live2's one current marker. Its full predicates, parameters, plans, expected answers, input hashes and exact limits are retained in `round6/plan2/plan.json` in durable storage.

The first analyzer attempt failed because it compared emitted `?` placeholders with normalized `$n` wire SQL. Its original source and failure are retained under `extras1/`; the corrected analyzer normalizes with the actual XtdbClient helper, then checks exact SQL equality. Only that analyzer was rerun. Product source and all executed matrix/proof inputs were unchanged; their successful execution was not repeated or replaced.

### Guard change and exact semantics

One `priorMarkerStamp` expression is shared by A0 and compact:

```sql
COALESCE((SELECT stamp FROM tx_meta FOR ALL VALID_TIME
          WHERE _id = $1 AND scope_key = $1 AND position = $2), 0)
```

The scope marker is written under `_id = scopeKey` with both position and stamp in the same transaction as the attempt/receipt marker. Its key, scope and prior position must all agree. The existing scoped `MAX(position) = sourceK` CAS remains, and the same ASSERT compares this marker stamp with `sourceStamp`. An absent marker coalesces to zero only for the empty cut; every valid nonempty source has a positive stamp and therefore fails on absence. The legacy-stamp initialization refusal remains intact. No new statement or round trip is introduced.

The allocator and retry path are unchanged: `nextStamp(sourceStamp, stagedAt)` computes `max(previousStamp + 1, stagedClockUs)`; on a replay-safe CAS conflict, the complete callback reacquires a fresh `(position, stamp)` and recomputes. A0's first guard now uses PostgreSQL placeholder reuse, reducing its parameter vector from four entries to three; compact reuses its existing `$1`/`$2` and optional stamp parameter. This is an additional measured-work change worth retaining in the 0.4.0 handoff, not a changed fact workload or offer schedule. No row encoder, journal bytes, clock policy, basis gate, error mapper or public API changed.

Six new relational-interpreter tests execute the full emitted mutations, both encodings:

- A stamp-only change after source acquisition causes exactly one typed `XtdbSerializationConflict`; with replay disabled, no new assertion/journal/attempt rows commit and position stays 1.
- With replay enabled, exactly one rejection is followed by fresh-cut recomputation: position 2, stagedAt 1000 and decided instant **1000.011**, from injected prior stamp 1000010 microseconds. Receipt facts and decoded journal carry that exact instant; a read at the original receipt's T still equals the original fact bytes.
- Moving the marker to a different key while leaving the scoped aggregate values unchanged refuses atomically. A scope aggregate cannot substitute for the exact marker identity.

The light SQL model fixture now evaluates the keyed stamp condition as well as the old aggregate variant. The stronger new tests use the independent SQLite SQL interpreter, not that model. The existing compact guard shape test now expects the keyed predicate rather than MAX(stamp).

### Final offline gates

`run-products.mjs` executed all 25 phases successfully: core (including runtime/entity type projects), testkit, XTDB, QLever, SQL declarations, SQLite, PostgreSQL exports only, and Cloudflare. **1,112 product tests passed, 116 engine integrations skipped offline.** XTDB is now 95 passed / 91 skipped, including the six new tests. The testkit uses the already justified explicit 120-second budget from live2; no product timeout changed. Final package/lock source maps and runner hashes are stable. The earlier focused XTDB suite also passed 95/95; the final full product run adds the explicit typed-CAS assertion to its non-replay test.

Copied/adapted reviewer regressions retain all previous expected answers: **510/510 read-route matrix rows, 80/80 pending-route matrix rows, four publication proofs, and the backward/ahead staged-clock journal reproduction on A0 and compact**. Their transports now answer the typed catalog probe, and the journal reproduction uses the current shared SQL interpreter; no expectation or refusal boundary was weakened. The successful matrix/controller package and executed-helper hashes still match current bytes. The only later changed analyzer was not consumed by those reproductions.

F1–F7 remain covered: typed native and journal refusals; journal own-instant omission including same-command retracts; empty-batch watermark refusal; future journal positions; final-decision waits; and clock-independent journal pages. The core/testkit property suite still includes named-T byte equality across the RQ01 routes and its staged-stamp negative control. Catalog bootstrap/legacy refusal regressions from live2 remain in the full product run. Targeted lint: zero errors, one existing constant-condition retry-loop warning. No root/pack, PostgreSQL service integration, oracle/evaluator recertification or independent review was run.

### Admission stop and precise live limit

Inside the heavy grant, the actual status/pool/disk capture at **08:09:39.002 UTC** showed 13,253,419,008 host bytes free and these reservations, both holder **CX-G03-V**, PID 23490, state `starting`, cleanupRequired true:

- `tx2-g03-f6d8ea5cba52162f-V3-writer`, reserved 08:09:22.540 UTC, 128 MiB / 1 CPU.
- `tx2-g03-f6d8ea5cba52162f-V3-observer`, reserved 08:09:22.886 UTC, 128 MiB / 1 CPU.

**The xtdb-s1 engine row itself was free.** These are VM-probe helper reservations with no slot field, not an observed 3.5 GiB XTDB exclusive. The dispatch specifically says to stop for G03's VM probes; I treated that active VM window as occupied. The executed admission controller conservatively labeled any nonresident reservation `exclusive reservation occupied`; the original exact label, pool/status bytes and controller preimage remain retained. The future controller now names the condition accurately and specifically recognizes G03 VM helpers in addition to true engine exclusives, rather than unnecessarily blocking unrelated shared helpers.

`decision.json` has `up:null` and no resource inspections/lifecycle action. **No RT01 engine, volume, live G2, native plan probe, A/A calibration, B point or 10k preload was started in round 6.** No slot was held while waiting for G03, and no G03 resource was altered. Release/remove/fstrim/context commands were not run this round because nothing was acquired; running VM maintenance during G03's probes would violate the stopped-window instruction. Live2's earlier verified cleanup remains historical.

The committed runbook provides one future heavy-granted controller that rechecks the window, uses a new immutable admission attempt, builds/runs changed-source G2, then repeats G6 A/A first, fresh then 10k ABAB points, 150 samples per arm, with the pre-B rule retained. It revalidates the exact retained pre-RT01 baseline artifacts and isolates baseline core. Outside timings it captures old/new native SELECT-predicate plans and EXPLAIN ANALYZE scan counters plus keyed-marker costs. Pinned XTDB grammar supports EXPLAIN on query expressions, not direct ASSERT, so the SELECT wrapper is explicit. The future controller cleans up only ownership created during its own attempt, including a partially successful admission, then trims/restores context. **These new live/controller/native-plan branches are prepared and syntax-checked, not executed or qualified.** A first gate/regression failure still stops later measurements; this task did not authorize an immediate retry of the occupied window.

### Pins, workload and retention

A cheap old-authority check detected drift, so the full read-only pin inventory was refreshed against main **`bb36862daf55b4f46a3cbf763f757c6341de4575`**, contract **0.3.13**: 302 direct / 602 expanded references, 243 unique paths. The sole RT01-moved pinned file remains `packages/testkit/src/index.ts`: main **`cb89a55ced5426b8fa0af3523fbbeb73870e61e3622ebb42e8a78c3e67da8d28`** → branch **`995bc1ace5ebb9654a74e238b8860cb7e8f012a979c7c4cf86d03388efd935c7`**. Round 6 does not change that file, and none of its changed product paths is newly pinned. The source/admission/benchmark helper additions are not frozen workload edits. [PIN-CHANGES-0.4.0.md](PIN-CHANGES-0.4.0.md) remains the earlier per-hunk pin handoff; the new CAS hunk's measured-work effect is described above. No acceptance file, pin, contract generation/version or oracle was changed.

Raw source-bound gate outputs, failed analyzer, final plans/model, G03 admission and full current-main pin inventory are durable at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round6/`. [round6/INDEX.md](round6/INDEX.md), [round6/RESULT.json](round6/RESULT.json) and [round6/DURABLE-SHA256SUMS](round6/DURABLE-SHA256SUMS) bind them; raw data stays outside Git. The old live2 raw evidence remains immutable and separately hash-checked by the analyzer.

### PASS / verdict / receipt audit before commit

| Site | Content | Freshness and exact binding |
| --- | --- | --- |
| Shared marker predicate / scoped CAS / unchanged allocation-replay path | Exact key, scope, prior position and stamp inside the same scoped position CAS; nextStamp and successful receipt encoding unchanged. Refusal and replay tests check atomic data, typed conflict and exact recomputed instant, not SQL text alone. | Current attempt's source cut and scoped marker; replay reacquires both coordinates. Source-bound tests execute both emitted encodings and independent SQL interpretation; no cached stamp accepted. |
| Six new CAS tests; existing product F1–F7/property cases | Exact no-write refusal, marker-key negative case, one replay, full journal/receipt/readback and original named-T facts; existing authored expectations retained. | Fresh isolated SQL databases/services, each test's receipts and clock; actual current package/lock sources before/after the successful 25-phase run. No offline test is a live engine claim. |
| Product runner / successful copied matrices, clock and publication proofs | Actual exits, 1,112-test denominator, all 510/80 `matches` fields, complete clock page bytes, four timed typed-refusal/release proofs. | Unique durable attempt directories, source/build/executed-helper hashes and actual commands; original failed analyzer preserved separately, unused analyzer change not falsely adopted as a matrix input change. |
| Guard-plan analyzer / run-plan | SHA-verified original live trace/dictionary/point; exact normalized emitted SQL; actual keyed EXPLAIN plans, expected booleans and callback counts for 8 declared model cases; 6/5 emitted statement counts. | Current captured adapter output, fresh model database per N/encoding, bound prior live2 files and current helper/package hashes. Clearly labels model projection visits and excludes native/causal latency claims. |
| Admission stop / original controller preimage | Actual status, exact pool reservation identities, disk bytes, stop reason and `up:null`; preserves G03 state. This is a stopped admission, never a live PASS. | New `admission1`, current inside-grant observations and command times, same private Docker context requirement. Executed preimage retained; later argument/label/policy refinements explicitly unexecuted. |
| Pin inventory and final closure/retention | Full immutable-main pin expansion, exact changed hashes and empty protected-source delta; rechecks all adopted log/data hashes, assertions and current used source bytes. | Immutable main/fork IDs; fresh package/model/matrix attempts; evidence read back after controller output streams close. No contract repair or live qualification inferred. |
| Prepared G2/G6/native-plan/controller/cleanup branches — **unexecuted** | Authored gate assertions, pre-B noise rule, exact receipt/row counts, actual wire parser, source/build/engine binding, ownership-aware finally cleanup are defined. | No successful output or acceptance is claimed. The runbook requires a new authorized free window and unique output paths; prior live2 results do not qualify the new marker guard. |

**Open:** independent review, native guard/pushdown/scan confirmation, changed-source live G2 and complete G6 fresh/10k measurements after G03's window, actual no-regression result, final 0.4.0 pin integration and pack/root qualification. No merge or push. The task's allowed occupied-window stop is reached; do not resume live work from this report without a new authorized window.

## Live round 3 — stopped before acquisition (2026-11-09)

The orchestrator authorized a new free-slot window for marker-stamp CAS source **37ae44a9a1fa4a8ef153c5118ee9aed03be86a8b**. The slot was free and no G03 probe reservation remained. The dispatch explicitly requires a clean stop if the runbook's need exceeds disk available above the 5 GiB guard. At the retained preflight, **08:32:15.722 UTC**, `df -k` reported **10,150,318,080 bytes (9.45 GiB)** free. The committed `round6/g6.mjs` history predicate requires **strictly more than 10,737,418,240 bytes (10 GiB)**, reserving 5 GiB for growth above the 5 GiB guard. The deficit to that threshold was **587,100,160 bytes (559.9 MiB)**, before any engine creation, G2 or fresh measurements. Earlier read-only checks showed disk falling during this shared-host window; the retained refusal uses its own fresh observation.

**Result: NOT_RUN_DISK_FORECAST.** No heavy job, admission2, slot reservation, engine, volume, G2, A/A calibration, B measurement, native plan/rows-visited probe or 10k preload was started. No latency, statement-count or native-row result is granted for the new guard. The prepared `round6/run-live.mjs` remains unexecuted; its unchanged internal admission helper checks only the bare 5 GiB floor, so this runbook-level history check was deliberately applied before invoking it. The existing >10 GiB history requirement was not lowered to fit the window. There was no retry after this stop and no deletion of another holder's retained data.

No owned resources required release or removal. Per the dispatch, the private-profile command `colima ssh -p triplex2 -- sudo fstrim -av` nevertheless ran successfully (including 733,577,216 bytes trimmed on the data mount); `docker context use colima` also exited zero. The closure helper's final assertion failed because `docker context show` reports `default` when the private `DOCKER_HOST` override is set. Its original commands, outputs and executed source are retained. A separate read-only check of only `currentContext` in Docker's configuration confirmed **colima**; no trim/context command was retried and no Docker operation used the default daemon. `RESULT.json` describes the state at the initial stop; `CLOSURE.json` and `CONTEXT-VERIFICATION.json` record subsequent requested maintenance and the checker limitation.

Evidence: [live3/INDEX.md](live3/INDEX.md), [live3/RESULT.json](live3/RESULT.json), [live3/CLOSURE.json](live3/CLOSURE.json), [live3/CONTEXT-VERIFICATION.json](live3/CONTEXT-VERIFICATION.json), [live3/SHA256SUMS](live3/SHA256SUMS). Raw preflight status, disk, pool, exact runbook/G6 source preimages and maintenance stdout/stderr are durable at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live3/`. Previous round6/live2 evidence is unchanged. No product source, measured workload, dependency, acceptance pin or oracle changed; there are **no newly moved pinned paths/hashes** in this round. The existing testkit pin handoff remains in `PIN-CHANGES-0.4.0.md`.

### PASS / verdict / receipt audit before commit

| Site | Content check | Freshness and binding |
| --- | --- | --- |
| `live3/preflight.mjs` → stopped receipt | Parses actual df bytes, validates positive integer, compares with the exact committed G6 >10 GiB predicate; asserts no exclusive/G03 reservations, no s1 owner or retained s1 volume. Grants only a disk refusal. | Unique immutable output directory, timestamped commands, exact 37ae44a9 head, private DOCKER_HOST, source preimage hashes, exact pool SHA and named xtdb-s1. No older admission adopted. |
| `live3/close.mjs` → maintenance receipt | Retains actual trim/context commands and output. All commands exit zero, but the final context assertion fails; no successful overall closure assertion is claimed from that exit. | Bound by SHA to this attempt's refusal, unique closure file, actual private-profile trim and command times; original source preserved. No engine lifecycle mutation or retry. |
| Context correction observation | Reads only saved `currentContext=colima`; explicitly distinguishes it from effective context under DOCKER_HOST. This verifies configuration restoration only. | New timestamped read after the failed assertion, same Docker configuration and private endpoint; no old cleanup receipt reused. |
| Evidence manifest / report | SHA256 readback of every retained file; report preserves refusal and checker failure, makes no live PASS or latency claim. | Separate live3 artifact root, byte-identical committed receipt copies; existing raw gate evidence not rewritten. |

**Open:** enough host capacity for the unchanged forecast, then an authorized window for changed-source live G2 and complete G6 (A/A rule before B, fresh/10k ABAB, native row/statement counts). The marker CAS remains offline-qualified only. No independent review, merge or push in this round.

## Live round 3 — renewed dispatch, G2 PASS / G6 FAIL (2026-11-09)

North star: P1 exact pinned reads and P2 small-commit latency, under `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`. A repeated orchestrator dispatch authorized a fresh availability check after the preceding disk refusal. The new inside-grant admission recorded **19,671,977,984 bytes (18.32 GiB)** free, exceeding the unchanged >10 GiB forecast. No exclusive/G03 reservation remained. This is a new admitted attempt, not a retry of a failed benchmark. The earlier disk refusal and its maintenance/checker failure remain immutable in `live3/`.

The exact committed runbook/controller ran once through `heavy.mjs --label CX-RT01-r6-live`. Admission2 acquired fresh xtdb-s1 as CX-RT01; six package build phases and G2 completed; G6 ran its fresh A/A calibration and four fresh ABAB points, then stopped at its first regression. **No retry, rule widening or 10k preload occurred.** Admission began 09:22:45.034 UTC; G2 ran 09:23:05.175–09:25:05.711; G6 ran 09:25:05.711–09:27:53.353; ownership cleanup finished 09:27:56.336.

### Source, build and engine identity

Execution HEAD **2e67454d3680a5e25c69626d1304c3fc185628b9** contains only the preceding report/evidence additions beyond product **37ae44a9a1fa4a8ef153c5118ee9aed03be86a8b**. All packages and lockfile are byte-identical to that marker-CAS commit. G2 captures exact source before/after and every built artifact hash; G6 validates those hashes before loading B and after the run. The baseline remains **59e07afb7a25dfb22bca60f8d769b74651aa835a**, with the retained independently built baseline XTDB/core artifacts rehashed against `live2/baseline/identity.json`. Baseline XTDB resolves baseline core. Full build maps and identity hashes are in the raw execution receipts and derived `live3-run/RESULT.json`.

The same exclusive engine served A/A and every A/B point: container **4e2824681a1a21aef01e42e4a6ee19c277b5dd500a458379f3cea5c9b877b614**, XTDB 2.2.0 image **sha256:a6a426505b95a36e4e0e1d0de88efcf4220cb6bde8f1f5e594b0a1f92a948a77**, config **13f5a70b36655b51fdf6daca77cc8bc215c4ef8bc044569867500fb286458927**, 3.5 GiB / 2 CPUs, port 5471. Start/end inspections have the identical container ID, image and ownership labels. Baseline and B use distinct scopes on this engine; the host remains shared.

### G2 final marker-CAS source

All six build phases passed. **197 case assertions, 42 live route repetitions (21 per encoding), two T1–T12 schedules including 200 independent/50 contended commits each, and three byte-equal deterministic fixtures completed successfully.** Both encodings passed all 44 shared conformance cases, journal/receipt/readback and named-cut route checks. Routes include the public entity/batch/page/query/journal paths, storage and executor paths, intervals, maintained queries, dependency state and authored SQL/XTQL facts/recordedFacts. The closure rechecks actual before/after route bytes, allowing only the designed current-head position echo in entity-page snapshots and includeBasis responses. It does not adopt `grantsAcceptance:true` alone.

The earlier isolated timeout-diagnosis case completed. There were 1,745 expected `XTDB rejected transaction: triplex-cas-conflict` submit rejections during replay-enabled contention; no query error, case failure or diagnostic failure occurred. G6 uses maxRetries=0. No extra product tests or unrelated engine suite was run this round.

### G6 frozen A/A rule and observed latency

For each encoding and fact count, two pre-RT01 controls ran alternating 75-commit blocks, **150 samples per control**. Before any B sample, the controller wrote `AA-RULE-BEFORE-B.json` at **09:26:22.437 UTC**, SHA256 **75288c9b2c9369cb24f2460190256608945a6aa297b217cc81c7ea466ec794a8**. For each metric independently, the maximum allowed B/A ratio is `max(Aleft/Aright, Aright/Aleft)`. Equality passes; the first exceeded metric or correctness/transport error stops every later point. This rule was not adjusted after observing B.

| Encoding / facts | A/A left p50 / p99 ms | A/A right p50 / p99 ms | Allowed increase p50 / p99 |
| --- | ---: | ---: | ---: |
| A0 / 10 | 64.349 / 163.870 | 59.548 / 147.386 | 8.062% / 11.184% |
| A0 / 5 | 36.843 / 60.434 | 34.089 / 81.405 | 8.079% / 34.702% |
| Compact / 10 | 55.931 / 167.783 | 66.045 / 147.712 | 18.083% / 13.588% |
| Compact / 5 | 75.746 / 194.454 | 69.108 / 193.994 | 9.605% / 0.237% |

Each fresh point used the identical declared 5/10 string-fact public input, deterministic clock/id seed, distinct scopes and ABAB 75-commit blocks: **150 A and 150 B samples**, nearest-rank p50/p99. Receipt position/fact/stamp checks and final physical fact readbacks passed.

| Fresh point | A p50 / p99 ms | B p50 / p99 ms | B/A change p50 / p99 | Result |
| --- | ---: | ---: | ---: | --- |
| A0 / 10 | 89.134 / 227.993 | 87.729 / 240.906 | −1.576% / +5.664% | Within rule |
| A0 / 5 | 51.445 / 185.170 | 43.105 / 98.335 | −16.212% / −46.895% | Within rule |
| Compact / 10 | 52.815 / 133.908 | 53.017 / 142.798 | +0.382% / +6.639% | Within rule |
| Compact / 5 | 51.133 / 108.944 | 54.374 / 151.778 | +6.338% / **+39.317%** | **FAIL p99**, allowed +0.237% |

This is a failed G6 receipt under its declared rule, even though both fresh ten-fact points passed. The narrow compact-five p99 band and changing shared-host latency do not authorize widening it or discarding the point. No 10k-history point was reached, so no history-scale latency or growth claim is made.

### Statements, history and native rows beside latency

Every A0 commit submitted **6 engine statements**; every compact commit submitted **5**, in both builds. All measured commits used one submit. A used 2 client queries and **13 Execute/ReadyForQuery cycles for A0, 12 for compact**. B matched those counts for 149/150 samples per point; its first fresh-scope commit used 4 queries and 17/16 cycles respectively for empty-cut catalog initialization. These are actual PG-wire message/ready counts, not TCP packet counts. The failed compact-five point therefore had no extra steady-state statement or round-trip count. No replay hid a measured failure.

Scope-history counts were checked at 0, 75 and 150 committed positions. Ten-fact A assertion rows were **0→1,725→3,450**, B **0→1,650→3,300**; five-fact A **0→975→1,950**, B **0→900→1,800**. This difference reflects RT01's journal representation; the public application input is identical. Every nonempty scope had one current `tx_meta` marker and the exact distinct recorded-position count. The receipts and raw observations bind every count to its source scope.

Native EXPLAIN/EXPLAIN ANALYZE probes ran **outside timed commits, after each point**, on SELECT forms of the exact old RT01 wide-stamp ASSERT and new emitted marker ASSERT. Direct ASSERT execution counters were not captured. These native `scan_rows_read` values count physical input rows across pages in the shared tx_meta table; they are not the one matching marker row or the offline N+1 projection model.

| Point (statements/commit) | Old wide guard, two scans, both scopes | New guard, A scope (keyed + position) | New guard, B scope (keyed + position) | B marker / wide-stamp client p50 ms |
| --- | ---: | ---: | ---: | ---: |
| A0 / 10 (6) | 2,211 + 2,211 | 577 + 2,211 | 456 + 2,211 | 9.666 / 9.780 |
| A0 / 5 (6) | 2,511 + 2,511 | 606 + 2,511 | 869 + 2,511 | 4.127 / 4.449 |
| Compact / 10 (5) | 2,811 + 2,811 | 727 + 2,811 | 609 + 2,811 | 5.287 / 5.407 |
| Compact / 5 (5) | 3,111 + 3,111 | 756 + 3,111 | 1,019 + 3,111 | 7.787 / 8.125 |

Every native scan outputs one matching row. The keyed stamp branch uses one page versus four for each wide aggregate in these observations, with zero persisted files used. The unchanged position aggregate still reads broadly; keyed stamp lookup is **not proven constant physical-row I/O**. The old-wide SELECT is the pre-optimization RT01 predicate, not the pre-RT01 A baseline's actual ASSERT plan; baseline has no stamp branch. These probes show a narrower stamp branch on this engine, but do not assign a causal fraction of the compact-five p99 difference. Per-commit native ASSERT rows and 10k behavior remain unverified. Raw plans, pushdowns, times, per-sample wire counts and statement dictionary are retained for review.

### Cleanup, retention and pins

The controller's finally block inspected the same engine, captured logs, ran `engine.mjs down --holder CX-RT01 --remove-volume`, and verified the **exact owned** container and volume absent via Docker's specific missing-resource messages. The owner file, reservation and retained-volume entry are absent. Private triplex2 fstrim and `docker context use colima` exited zero; a separate saved-context read confirms colima under the persistent private DOCKER_HOST override. No resident or another holder's state was altered.

[Live evidence index](live3-run/INDEX.md), [derived receipt](live3-run/RESULT.json), [closure verification](live3-run/VERIFICATION.json) and [manifest](live3-run/DURABLE-SHA256SUMS) bind raw files under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round6/{admission2,live-attempt1,g2-attempt1,g6-attempt1}` plus the new owner/engine/cleanup files and `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live3-run/`. All **83 original round6 evidence files** were rehashed unchanged; their historical manifest/inventory/RESULT were not regenerated. The new manifest covers the combined immutable and added files. Raw output remains outside Git. The executed seal preimage is preserved; a separate post-seal checker verifies helper and native-plan parameter bindings without rerunning any gate. No product or frozen-workload edit, new pinned hash movement, acceptance change or oracle edit occurred. The earlier testkit pin handoff remains applicable.

### PASS / verdict / receipt audit before commit

| Site | Content | Freshness and exact binding |
| --- | --- | --- |
| Admission2 / run-live ownership | Actual free disk above forecast, free slot/pool, exact missing-resource inspections, successful fresh acquisition; only newly acquired CX-RT01 owner is cleaned. | New directories; command times, holder/s1/endpoint, engine ID start/end and private Docker endpoint. Previous disk refusal not reused. |
| Product CAS / receipt path (unchanged) | Exact prior marker position/stamp inside scoped CAS, allocator and receipt readback unchanged; live conformance includes journal/readback/atomicity. | Fresh engine/scope and source cut per commit; current product identical to 37ae44a9. No earlier engine's receipt adopted. |
| G2 observe/case/route/schedule/determinism verdicts; final grantsAcceptance | Exact authored expectations executed; closure checks complete 197/42/2/3 denominators, no case failure, actual route bytes and identical deterministic fixtures. Expected contention conflicts remain recorded. | Fresh scopes, current source/build before/after maps, actual engine owner; final source hashes read back. Exit zero and a boolean alone do not qualify G2. |
| G6 sample/receipt/readback/count checks | Receipt positions, exact string facts/instants and stored fact bytes, scope row counts; actual statements and PG-wire counts. | Same declared inputs/clock, separate named scopes, matching position sequence; original baseline artifacts and exact B build, source/runner hashes verified. |
| A/A rule / point verdicts | Recompute nearest-rank metrics from 150 samples/arm, exact tolerance formula and failed p99 comparison; first three points pass and fourth fails. No 10k result. | Rule file/hash timestamp precedes every B sample; actual ABAB order, scope and source/build/engine identity; one failure, no retries or widened band. |
| Native scan diagnostics | Actual engine scan counters and SQL predicate preimages, two scan operators per plan; parameter checks bind exact source scope, position 150 and observed marker stamp. Labels SELECT-probe scope and excludes per-commit/causal assertions. | Plans taken after the corresponding point on the same owned engine, outside timings; 16 exact old/new scope/cut parameter bindings checked. |
| Cleanup / seal / post-seal verification / manifest | Specific absent-resource messages, owner/pool absence, output hashes, trim/context command content and saved context; full byte readback and original 83-file preservation. Failed G6 stays FAIL. | Closed controller streams, same owned engine ID, unique closure root, exact executed checker preimages, separate final status/pool/context observations. No current file substituted for an older executed helper. |

**Open:** independent review of this live receipt and the compact-five tail failure; no 10k-history or whole-G6 no-regression qualification. No fix or benchmark retry is attempted in this window. No merge or push.

## Round 7 — offline Q104a grading and compact diagnosis (2026-11-09)

North star: P1 exact reads and P2 small atomic commit latency; goals/targets remain `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`. Read Q104a and Q100k directly from main's `lab/acceptance/RULINGS-PENDING.md`; the read-only row/file-hash capture is [round7/AUTHORITY.json](round7/AUTHORITY.json). Read accepted M01 at **99d9641d4d6f385ab3b3fade7e9e78680a8850b4**, including its PAIR statistics, R22 window gate and single-arm Q100k helper. This round changes experiment machinery only. **Live3's G6 receipt remains FAILED and byte-identical; no new live run, engine, VM probe or performance PASS occurred.**

### Rule, recording and future controller

[round7/rule.mjs](round7/rule.mjs) uses byte-exact local copies of M01's `paired.ts`, `single-analysis.ts`, `noise.ts`, `hist.ts`, `rng.ts` and `noise.json`. [M01-SOURCES.json](round7/M01-SOURCES.json) binds each original path, copied path and SHA256 to the immutable accepted commit. The offline runner compares every copy with that exact Git blob. These are experiment-local snapshots, not sibling source imports or changes to M01's harness paths. Inherited comments remain byte-exact; the adaptation's new reasoning comments use EXP-RT01.

The prepared runner collects **four A/A rounds per encoding and fact count**, each with **1,000 samples per control arm** in alternating 500-commit blocks. Four left-control observations on the same physical arm, same closed-loop input/phase, yield the three adjacent sequential log ratios required by M01's Q100k helper. Each metric separately records paired `d_k=ln(q_right/q_left)`, the sample `s_d`, bias, count and predictive band. The fixed formula is:

`band = exp(abs(mean(d)) + t975(k-1) × 1.5 × s_d × sqrt(1 + 1/k)) − 1`.

This is an RT01 prediction-band adaptation using M01's sample sd, Student t and preflight safety factor. It allows future-round variability rather than shrinking a standard error of the A/A mean; the absolute bias term conservatively covers observed persistent arm/order bias. It is not a claim to implement M01's full NS superiority protocol or a family-wide statistical guarantee. No arbitrary percentage floor is added and no post-B widening is allowed.

The rule records all context grades and complete calibration/identity data. Exclusive rule and SHA256-sidecar writes happen **before any B sample**. Reload verifies exact file bytes, source/build/baseline/input/attempt/engine identity and recomputes the statistics/grade; altered summaries are rejected even if a caller recomputes the outer SHA. Calibration noise windows must belong to the current attempt; point noise must be after rule creation. Source/runner hashes are checked again at completion.

The future G6 selects Q104a's **large-sample p99 option**, not bootstrap: each A/B point has 1,000 samples per arm, so nearest-rank p99 is no longer the second-highest of 150 values. p50 cannot be judged below 150; p99 cannot be judged below 1,000. A GREEN point is a regression only when the B/A ratio is strictly above `1+band`; equality is within band. Insufficient samples remain INCONCLUSIVE. A within-band observation is not a blanket promotion result.

[window.mjs](round7/window.mjs) adapts M01's actual private-profile recorder: boundary and ten-second host/VM samples, cgroup/neighbor counters, pre/post host/VM spin calibration, hiccups and driver event-loop utilization. Every round retains raw observations, calibration samples, parser errors, exact engine ID and summarized noise. The preflight grade uses the accepted single-arm sequential helper, including complete hard-rule history and missing-signal checks. **Only GREEN admits B.** Each measured point checks fresh noise with that frozen same-arm A/A drift reference and its complete hard history; candidate latency does not choose a noise grade. That is a preflight variance reference, not newly estimated post-B variance; a changed/gapped host window needs a new authorized attempt. AMBER/RED/INVALID/UNGRADED is **TIMING_INVALID** (child exit 3), not a failed acceptance receipt or a timing PASS. The controller distinguishes that outcome from an actual G6 regression.

The default shared quota placement can remain AMBER because M01 requires observed CPU separation for GREEN. A free slot alone cannot bypass that rule. The runbook states this explicitly and leaves placement changes to the orchestrator; no partition flag, noise threshold or engine config was falsified or changed. Q100k's three 30-minute deferrals are orchestrator-managed separate attempts, ending HOST-NOT-QUIET, not an automatic retry loop that hides a performance failure.

[RUNBOOK.md](round7/RUNBOOK.md) waits for an explicit new slot dispatch after DF01. It preserves final-source G2, the isolated 59e07afb baseline and exact application inputs/receipts/wire counts. The expanded plan has up to **128,000 public commits**: 32,000 controls, 16,000 measured A/B and 80,000 real history preload commits. Admission now requires >13 GiB (5 GiB guard + 8 GiB provisional whole-window forecast); it does not claim observed 10k growth. Before timing starts and every 500 commits, the runner checks remaining estimated growth above the guard and conservatively raises its per-commit estimate using observed host-wide df loss. Host-wide loss is not attributed solely to RT01. History-point/floor checks remain, and all disk checks occur outside service timing. The six-hour child deadline and its uncertainty are declared. The controller still cleans only its newly acquired owned engine/volume, trims the private profile and restores context in finally. **The new live orchestration/recorder branches are syntax-checked, not engine-qualified.**

### Compact path: what is known offline

[DIAGNOSIS.md](round7/DIAGNOSIS.md) and durable `round7/offline4/diagnosis.stdout` compare actual pure guard emission from the isolated pre-RT01 build and current marker build with SHA-verified live3 wire SQL and native plans. The matched operation/assertion identity guard's SQL and serialized parameters are identical; both builds have **two compact guards, five submitted statements and twelve warm wire cycles**. RT01's first guard adds one stamp parameter and an exact keyed scalar stamp branch to the position-only baseline ASSERT. Source reads, metadata/attempt inserts and receipt readback also carry wider stamp fields, and journal representation differs: five-fact history rows per commit fall 13→12. These are genuine work/byte differences despite the same public five-fact input.

The retained native `before` plan is **old RT01 MAX(stamp)**, not pre-RT01. It reads 3,111 + 3,111 tx_meta input rows; the current marker branch reads one page (756 rows on A's scope, 1,019 on B's), plus the broad 3,111-row position scan. Matching outputs are one row, which does not establish constant physical I/O. The baseline position branch can be compared as an induced subplan, but **a full native baseline position-only EXPLAIN was never captured**. The new runner explicitly adds that third plan version for the future window; it is not fabricated offline.

The analyzer segments complete warm commits from actual sample/wire boundaries, verifies twelve cycles for **148 commits per arm** (excluding each block's first sample's untimed count probes), then locates the *original* p99 samples, not the p99 of the filtered subset:

| Original p99 | Service ms | Wire sum ms | Outside measured wire ms | ASSERT wire ms | COMMIT SYNC wire ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| A, position 144 | 108.944 | 84.042 | 24.902 | 1.236 | 43.455 |
| B, position 78 | 151.778 | 69.983 | 81.795 | 2.699 | 22.835 |

For those observed tail samples, B's +42.834 ms service difference accompanies +56.893 ms outside the measured wire cycles; its wire sum and COMMIT SYNC time are lower. **This does not support assigning that tail difference solely to the marker scan.** Outside-wire time includes runtime/connection/event-loop scheduling and synchronous observer logging; it is not an isolated CPU measurement. ASSERT wire time can measure staging while evaluation happens at COMMIT SYNC. There is no demonstrated causal compact bug to patch from these observations. The extra scalar branch/wider fields remain measurable work candidates; runtime/observer scheduling is the retained tail candidate. The missing old host/VM/ELU evidence prevents stronger attribution. No product or correctness behavior was changed speculatively.

### Offline validation, first failure and retention

The final heavy-granted **offline4** run passes **17/17 rule tests**, the complete retained compact emission/plan/wire analysis, and syntax checks for all eleven authored experiment `.mjs` entry points (**13 phases total**). Tests cover four-round sd/sequential grade, single-pair refusal, both quantile floors, a planted 1,000-sample p99 regression, within-band/bias behavior, hard/missing/AMBER signals, stale point noise, wrong source/engine/attempt, exclusive freeze and SHA/summary edits. It verifies accepted M01 source copies and snapshots current source bytes before/after. No collector is invoked by these tests. Product source is unchanged, so the prior 1,112 product tests, 510/80 matrices and live G2 remain historical; they were not rerun or recertified this round. No root/pack/oracle/evaluator/live gate ran.

**offline1's diagnostic failure is retained:** `deepStrictEqual` compared distinct `XtdbTextArray` constructors from baseline/current modules, despite identical parameter payloads. The original error, source preimages and post-failure note remain. The fix compares serialized emitted payloads; it does not weaken SQL or parameter-content equality. offline2 completed after that fix; offline3 added complete tail decomposition and a stale-noise test; offline4 adds the final remaining-disk forecast and all current docs/helper snapshots. These are declared offline source updates, not benchmark retries. The original live3 FAIL is never regraded under Q104a.

[round7/INDEX.md](round7/INDEX.md), [RESULT.json](round7/RESULT.json), [DURABLE-INDEX.json](round7/DURABLE-INDEX.json) and [DURABLE-SHA256SUMS](round7/DURABLE-SHA256SUMS) bind closed logs, failed/successful offline attempts and exact source preimages at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round7/`. The retention checker revalidates all test phase outputs, current executed source hashes, retained live3 input hashes and the unchanged FAIL receipt before sealing/readback. Raw output remains outside Git. No resource was acquired or lifecycle/trim/context command executed this offline round. No acceptance or oracle file was touched. **No pinned path/hash changes in round 7**: only new experiment-local paths and this report change; the earlier branch pin handoff remains historical and the contract builder owns re-pinning.

### PASS / verdict / receipt audit before commit

| Site | Content | Freshness and exact binding |
| --- | --- | --- |
| `calibrate` / M01 `analyseSingleWindow`, `applyRules`, `hardRuleFailures`, `windowGrade` | Per-round quantiles, sample sd for each metric, three adjacent same-arm ratios; all hard history and active missing signals, exclusions/partition rules; only GREEN eligible. | Four fresh control rounds, matching phase/engine and current attempt binding; raw collector windows plus calibration retained. Accepted helpers are byte-exact and hash/Git-blob checked; synthetic tests are not real window grades. |
| Other copied M01 exports (`decide`, paired bootstrap/procedure checks) — unused | Their original pure statistical mappings remain byte-exact; this G6 uses neither their verdicts nor a bootstrap result. | These pure functions do not establish observation freshness/engine identity by themselves. No receipt or acceptance is adopted from them; the active large-n rule has the explicit binding below. |
| `makeRule`, `freezeRule`, `loadRule` | Exact context set, quantile sample floor, predictive formula/bias/safety, complete identity; rule bytes and recomputed summaries agree. | Exclusive new files and pre-B SHA event; calibration within this attempt, expected source/build/baseline/input/engine identity. No old FAILED rule substituted. |
| `gradePoint` / `judge` / future G6 receipt | Fresh noise and frozen same-arm control reference; strict per-metric comparison and floors; non-GREEN unjudged, within-band distinguished from promotion. | Rule readback before point, same current source/build/engine/inputs, exact receipt/data checks and actual wire counts inherited; no B latency-based noise selection, no retries. These live branches were not executed. |
| Future controller/admission/cleanup/disk budget | Exact owned slot, disk forecast before work, remaining growth/floor checks, concrete absence after down and private trim/context commands. | New round7 attempt directories, acquired owner and start/end engine identity; finally cleans only that attempt. Syntax-only now; no cleanup success receipt was invented offline. |
| `diagnose.mjs` | Exact generated guards and serialized params match retained wire SQL; twelve-cycle warm segmentation, original p99 sample lookup, actual old-wide/new-keyed native scan counters. Names missing full baseline plan and rejects causal overclaim. | Rehashes all adopted live3 bytes and baseline/current build identity, exact source scope/cut and sample position. Analysis runs now on historical data, never asserts a fresh performance PASS. |
| Unit/offline runner and retention result | Actual 17-test/zero-fail TAP, all 13 phase exits/output hashes, stable executed source snapshot, exact retained diagnosis and prior FAIL unchanged. | Unique offline attempts/preimages, current before/after hashes, retained initial error, readback manifest only after streams close. Success is offline rule/analysis verification only. |

**Open:** independent review of the statistical adaptation and live instrumentation; a GREEN-admissible post-DF01 window with sufficient disk; new G6 fresh/10k result and actual baseline native plan; causal attribution if compact tail regression recurs. No merge or push. Do not start live work from this offline report without the orchestrator's dispatch.
