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
