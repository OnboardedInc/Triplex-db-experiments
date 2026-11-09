# EXP-RT01 round A — CX-VRT01 independent review

**Verdict: FIX-FIRST.** Three reproducible contract defects remain in the final product source. The decision-order mechanism passes the exercised offline schedules, but this is not ACCEPT-OFFLINE and does not qualify live behavior or performance.

North star: P1 immutable reads at a named recordedAt, and P2 receipts naming the decided commit. Goals and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Authority for this review: R33 and Q89a-i/Q90a-g. Review branch: `verify/RT01`. Review completed 2026-11-09 UTC (2026-11-08 local). No product code or acceptance files were changed.

## Source and evidence identity

- Reviewed product: `cc54c3c61bc5984802bfe9c563bd885d8b53294b`.
- Builder report/evidence head: `1283f9fb`; source baseline: `59e07af`.
- Independent oracle: accepted `exp/O06-oracle-record-time`, `fed510e`, O-REPLAY 0.5.0. Its implementation was not inspected or modified. The interface schema/runner documentation was consulted; the accepted Git archive was executed as a black box. `binding.py` hashes its files against that exact Git object before comparisons.
- All 322 files in the builder's SHA256SUMS match retained bytes. All 52 changed package files match the reviewed product commit. See `integrity.json`.
- `attempt2/execution.json` binds the fresh probe's command, runner SHA256, attempt UUID, source before/after, head, and explicit `offline-transport-only` execution context. Both source and runner are unchanged. `extra-execution.json` binds the public-route and single-command probes and their output hashes. `package-checks.json` records the independent builds/tests and unchanged source hashes.
- `SHA256SUMS` indexes this review's evidence. All committed review artifacts are below 1 MB individually and the retained raw output is below 5 MB; no bulky evidence exception is needed. The reconstructed oracle tree is ignored and restorable from Git.

## Findings

### F1 — P2 / medium: native routes wrap the mandatory typed basis refusal

**Locations:** `packages/xtdb/src/native/NativeQueries.ts:159` and `packages/qlever/src/native/NativeQueries.ts:191`.

Their inner `Effect.tryPromise` catch unconditionally constructs `ReadError`. The outer `instanceof BasisNotAvailable` check cannot recover the original error after that wrapping. Both XTQL and SQL native entry points, plus QLever SPARQL, expose `_tag: "ReadError"`; `BasisNotAvailable` survives only in `cause`. The reachability/relation entry points share the same inner runner.

**Reproduction:** use a cut with head position 1 and stamp 1,000,000 us; call native `select` (and XTDB `selectSql`) with `{validAt:1000, recordedAt:1000.001}` and a valid contract/builder. The gate waits about 2 s, and no answer query executes. Observed result: `{tag:"ReadError", causeTag:"BasisNotAvailable", causeAxis:"recordedAt"}`. Required result: the top-level `BasisNotAvailable {axis:"recordedAt"}`. A caller's `Effect.catchTag("BasisNotAvailable", ...)` therefore does not handle this ordinary future-basis refusal.

**Evidence:** `attempt2/route-probes.json`, `route-comparisons.json`, and the three `route-*-native*.oracle.json` outputs. O-REPLAY R-CUT-6 independently requires the top-level basis refusal. Other tested near-future routes preserve the tag.

**Proposed fix:** preserve `BasisNotAvailable` in both inner promise catches before constructing a generic `ReadError`. Add public native tests for the top-level tag/axis, including SQL, XTQL and SPARQL, rather than inspecting only nested causes.

### F2 — P2 / medium: a retraction of a same-commit assertion stores its own record instant

**Locations:** `packages/core/src/store/transactionMetadata.ts:25`, the equivalent fallback serialization at `:75`, and decoder at `:119`.

The v2 encoder preserves `recordedAt` on every retract, assuming the assertion belongs to an older physical commit. That assumption fails when the same command asserts and retracts a fact, or two nested logical transactions assert/retract within one physical commit. In those cases the retained `recordedAt` is this physical transaction's own stamp, contrary to Q90e and R33 2.10. The decoder also assumes every v2 retract carries `recordedAt`.

**Minimal reproduction:** at clock 1000, one ordinary `Triples.transact` contains an assert for entity `single`, then `retract-pattern` for that entity. Its raw retract change contains `"v":2, "recordedAt":1000`; the transaction's instant is also 1000. O-REPLAY's expected raw retract change omits that field. This does not require deferred adapters or nested callbacks.

**Evidence:** `journal-single.ts`, `journal-single-observed.json`, `journal-single-comparison.json`, and `journal-single.oracle.json`. The receipt independently passes R-RCP-7/R-RCP-9, while the observed journal body fails R-JNL-5. `attempt2/*-nested.case.oracle.json` and `oracle-comparisons.json` additionally reproduce this on XTDB and QLever, both A0 and compact. The nested physical group's receipts share instant 1000.003 correctly, but its raw retract JSON still stores `recordedAt:1000.003`.

**Proposed fix:** omit a retract's assertion `recordedAt` when it equals the physical commit's instant, including across its ordinals. Retain it for assertions from older physical commits. Decode an omitted v2 assertion instant from the journal row's decided instant, while preserving the hydrated public change fields. Cover the one-command and cross-ordinal cases and legacy v1 decoding.

### F3 — P2 / medium: empty entity batches bypass the watermark gate

**Locations:** `packages/xtdb/src/XtdbStorageAdapter.ts:694` and `packages/qlever/src/QleverStorageAdapter.ts:544`; exposed by `packages/core/src/store/TriplesLive.ts:634`.

`getByEntities([],...basis)` returns a successful empty map before resolving the basis. Consequently `Triples.entities([], {recordedAt:T})` returns `[]` for an unavailable T, with no cut read, wait or typed refusal. Nonempty entity batches correctly refuse the identical basis. This violates the explicit Q89c/Q90d rule that every basis-taking route checks availability; it should not depend on the caller's batch size.

**Reproduction:** with head stamp 1000 ms, call `Triples.entities([], {validAt:1000, recordedAt:Date.now()+60000})`. Both lanes return `{success:[]}` after zero client queries. The same request with one entity yields top-level `BasisNotAvailable`. A far-future cut should refuse immediately; a nearby unavailable cut must wait then refuse. The shortcut bypasses both cases.

**Evidence:** `public-routes.ts`, `public-routes.json`, `extra-execution.json`, and the `empty-entities` rows in `route-comparisons.json`.

**Proposed fix:** resolve/gate the requested basis before the empty-batch shortcut, or apply the common gate in the core public method for decided adapters. Keep the empty-batch optimization after successful basis validation, and preserve legacy adapter behavior.

## Independent checks and limits

| Check | Fresh outcome | What it establishes |
| --- | --- | --- |
| Four package builds and unit suites | 856 core + 93 testkit + 70 XTDB + 35 QLever = **1,054 passed**; 116 integration tests skipped | Offline source/build regressions checked. `*-build.txt`, `*-tests.txt`, `package-checks.json`. Typecheck, pack/consumer and root pnpm check were not independently repeated. |
| Accepted O-REPLAY selfcheck and tests | selfcheck PASS; **403 tests OK** | `oracle-complete-*`, after restoring the accepted archive's external fixture dependencies. |
| O06 authored fixtures | **14/14 outcomes correct**, including nine wanted-FAIL controls | `oracle-fresh-fixtures.stdout`: R-CMD-3, R-RCP-7, R-JNL-5, R-RCP-9, R-CUT-6. No oracle exit code alone is treated as product acceptance. |
| Fresh actual adapter/core T1–T12 schedules | Completed on XTDB A0/compact and QLever A0/compact, using offline SQL/SPARQL transports | `attempt2/probe-summary.json`. Includes 200 disjoint transactions and 50 contending updates, rollback/retry, row/history/journal stamp checks, lost ACK, same-ms ties, backwards clocks, watermark release/refusal, pagination, and deterministic clocks. Deferred T8 remains N/A; legacy v1 decode is in the core suite. |
| R31 D-C1 and staged-stamp control | Decided case passes; negative control detects HE-5 and HE-8 | Fresh focused verbose output `dc1.txt`; full testkit route suite also passes. The negative control's test passes because it observes the required violations. |
| Actual receipts against O-REPLAY | R-RCP-7/R-RCP-9 PASS on all four encoding/lane combinations, including nested ordinals | `attempt2/*.case.oracle.json`, `oracle-comparisons.json`. Ties are 1000, 1000.001, 1000.002; nested ordinals share 1000.003. |
| Observed valid defaults/journal/receipts against O-REPLAY | R-CMD-3 default rows, ordinary R-JNL-5 values and hydrated transaction records match on all four combinations | `oracle-comparisons.json`. The same-physical-commit journal case fails (F2). Separate negative observation controls change a default and are rejected. |
| Near-future route gate | All 12 probes wait **2000–2005 ms** before failing; native tags are wrong (F1) | `attempt2/route-probes.json`. Storage, empty dependency set, Datalog, interval, XTDB maintained query and native routes exercised. No answer query is accepted by these future-cut transports. |
| Public far-future core routes | 18/20 expose the required tag; two empty batches return success (F3) | `public-routes.json`: entity/entities/entityPage/match/dependency/queryAll/queryAll+echo/query/queryPage on each lane. |
| R-CUT-6 output comparisons | **27/32 match**, with exactly the three native entries and two empty-batch entries failing | `route-comparisons.json`, accepted oracle case/output pairs. This is a failing product comparison, despite oracle commands exiting zero. |
| Builder manifest and frozen pins | 322/322 hashes match; exactly one unique existing pinned file moved | `integrity.json`; details below. |

The SPARQL transport decodes actual emitted VALUES/_row bytes and enforces the emitted source position/stamp CAS before applying tuples. The SQL transport is RT01's source-bound offline fixture and exercises the actual adapter. Neither transport certifies engine planning, numeric storage, durability, network behavior or isolation. These schedules do not substitute for G2.

The accepted oracle produces synthetic journal fact IDs and the logical change body without the wire-format `v` discriminator. Comparisons explicitly omit those representation fields; they compare the exact remaining logical JSON values and record/valid times. They do **not** omit recordedAt/retractedAt from actual change values, which is why F2 fails. Hydrated records are compared with the oracle's derived `changedEntities` convenience field removed, since the public TransactionRecord has no such field. Valid-time checks compare actual assertion identity, validFrom and recordedAt.

The original oracle archive attempts lacked external selfcheck fixtures and failed before completion. Their errors are retained in `oracle-selfcheck.stderr`, `oracle-tests.stderr`, and `oracle-fresh-*`. The complete archive run succeeds. `attempt1/` retains an incomplete reviewer SPARQL command-claim fixture; it is not a product failure and is not used for the final suite result. `probe-attempt1.ts` retains those runner bytes. The reviewer transport was corrected to read the emitted prefixed claim query; attempt2 is fresh. `dc1-first.txt` retains a wrong runner working-directory invocation. `oracle-compare-first.py` retains the first comparator's incorrect schema-key assumption; the final comparator uses the documented snapshot output. Product source did not change during any correction.

## R33 section 1 timestamp-use audit

| R33 uses | Observed final behavior |
| --- | --- |
| C1–C2, C10; QA1/QA2/QA4; XA1/XA2/XA6 | Core reads stagedAt, obtains a memoized stamp inside the adapter transaction, claims with that instant, and returns it in the receipt. Both adapters compute max(previous+1, stampCut(clock)); scope CAS guards both source position and stamp. Retries acquire a new cut. Operation markers check exact attempt/position/stamp (XTDB also operation ID). |
| C3–C5; QA3; XA3 | Constraint evaluation uses stagedAt; core fills omitted validFrom from stagedAt before insertion. Adapter record columns use the stamp. Positive oracle comparisons confirm the tied-clock assertion is valid at 1000 while recorded at 1000.001. |
| C6–C8; QA5; XA5 | Assert/retract row times use the decided instant. Hydrated normal transaction changes match the oracle. Raw same-physical-commit changes have F2. |
| C9, C11–C12 | No new `:_tx/instant` fact. Journal validFrom is stagedAt; record instant is reconstructed from the position fact for v2 records, and legacy v1 decoding remains covered. Ordinary raw values omit their own stamp; same-commit retract values do not (F2). |
| C13–C14 | TransactionResult adds stagedAt; snapshot materialization uses record.instant or result.instant instead of the removed instant-fact lookup. |
| C15–C16 | Snapshot ordering and derivation/materialization readers consume decided row/journal instants; no separate pre-commit timestamp writer remains in these locations. No live derivation qualification is claimed. |
| C17 | Both pagination preparations accept headRecordedAt. Core selects the implicit position after explicit T availability. T5's delayed-publication entity-page test and idle T11 pass in the four fresh offline schedules. |
| C18–C19 | Read-side now still resolves omitted validAt; write notifications keep their notification-time role, as R33 permits. |
| C20 | KV remains a legacy staged-clock backend, outside the round A lanes. It receives stagedAt and journal-v2 changes; core KV tests pass. |
| C21–C22 | Public temporal validation still admits nonnegative finite fractional milliseconds. New stamp helpers validate exact range/inversion. Optional adapter stamp/currentCut members preserve legacy adapter contracts. |
| Kernel; Q1–Q15, XP1–XP10, D1–D11 | W0 does not write record stamps. Broker, P2X and Datomic are round B and were not implemented or qualified by this review. |
| Oracle/fixture O1–O11 | Accepted 0.5.0 is executed independently. RT01 testkit and route histories use stagedAt plus decided stamps, retain the staged-stamp negative control, and exercise HE-8. No implementation-source oracle comparison was performed. |

This audit covers the listed round A timestamp uses; it does not make the failing gate/journal checks acceptable. In particular, the two route bypasses in F1/F3 remain exceptions to the universal watermark claim.

## Frozen pin audit

The recursive scan finds 41 existing path/hash entries. Only `packages/testkit/src/index.ts` differs, at three contract locations:

- `/oracleFilesPinned/O-TESTKIT/0`
- `/caseSets/CS-U44/pinnedSourceFiles/0`
- `/caseSourcesPinned/CS-U44/0`

Old SHA256: `6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988`.
New SHA256: `995bc1ace5ebb9654a74e238b8860cb7e8f012a979c7c4cf86d03388efd935c7`.

These agree with the builder's report. `lab/acceptance/` is unchanged against the baseline. No pin or contract was edited, rebuilt or re-certified here. Contract 0.4.0 must account for the new helper files and accepted oracle separately.

## Reviewer PASS / verdict / receipt audit (rule 9a)

| Site | Content check | Freshness and binding check |
| --- | --- | --- |
| `run-package-checks.mjs` and report's build/test result | Actual builds/tests and exits, not previous logs | New worktree installation/builds; source before/after equal in package-checks.json and changed source hashes match cc54c3c. The report checks equality explicitly; the runner's exit by itself does not certify source stability. |
| `probe.ts` / `probe-summary.json` completed-case events | Real adapter/core suites compare receipt/row/history/journal values, exact stamp order and deadline/release behavior; a thrown failure is retained | Fresh transport/fixture for every lane/encoding suite; run-bound.mjs captures runner hash, unique attempt, exact command and source before/after. No prior completed event is adopted. |
| `run-extra.py` / `extra-execution.json` | Commands execute actual public routes and single-command transact; raw outputs retained | Requires the bound product/oracle source before and after, captures each probe's runner/output hashes and start/end, checks zero exit and runner stability. Success here means execution completed, not semantic correctness. |
| `oracle-compare.py`, `compare-routes.py`, `compare-single.py` | Compare actual bodies/defaults/top-level error tags to fresh 0.5.0 expected bytes; receipt consistency separately checked; F1–F3 remain mismatches | require_binding() checks completed attempt2, stable source/runner and exact accepted oracle files before comparisons. Actual inputs come from that attempt and the bound extra executions; case hashes plus final SHA256SUMS bind the retained inputs/results. Empty answers/nested causes are not counted as typed refusal. |
| `binding.py` | Hash equality, actual attempt exit and before/after equality | Exact current package files, runner and fed510e oracle tree; no date-only or prior PASS substitution. |
| `integrity.py` / SHA256SUMS | Hash every declared builder file, changed source and recursive existing pin; enumerate differences | Fresh local byte reads, exact reviewed Git source and unchanged acceptance diff. This is an integrity observation, not a semantic PASS. |
| Accepted oracle fixture/selfcheck/test outcomes; D-C1 control | Selfcheck content, 403 tests, all positive and wanted-negative fixture outcomes; HE-5/HE-8 control assertions | Fresh executions on the archived accepted oracle / reviewed testkit. The incomplete archive and runner failures remain visible and are not adopted. |
| This review verdict | Three observed failures against explicit rulings and oracle outputs | Final source-bound evidence above; verdict is FIX-FIRST, with no promotion or live acceptance. |

## Remaining work and execution boundary

Fix F1–F3 on the builder branch and request a fresh independent offline review. Keep the existing ordinary-retraction and legacy-journal cases while adding the missing controls. After offline acceptance, run final-source G2 on an exclusive slot, calibrate the G6 latency guard, and complete the contract-owner work. These are separate remaining gates; none is inferred from the passing offline slices.

No engine was started, stopped, recreated or queried; no exclusive slot was claimed. No Docker command or unrelated port was used. Heavy local runs used lab/bin/heavy.mjs; host free space stayed around 14 GiB (above the 5 GiB floor). pnpm used only the specified shared project store with the frozen lockfile. No product changes, merge, push, release, live G2, live mixed-number comparison, durability test, full pack/consumer check, full root check, PostgreSQL/FoundationDB integration or performance qualification was performed.
