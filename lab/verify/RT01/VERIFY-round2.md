# RT01 round A — independent review round 2

**Verdict: FIX-FIRST.** The original F1–F3 reproductions now pass, including the ordinary and nested journal bodies. The requested wider read-entry audit found three additional defects: a future entity-journal snapshot is accepted, that journal route still wraps typed refusals, and pending-transaction reads bypass the watermark. The last defect reproduces a change in a previously served answer at the same named T on both lanes and encodings.

North star: P1 exact, immutable reads and P2 receipts/journals bound to the decided commit. Goals/targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Review authority: R33, Q89c, Q90d/e, Q96b. Reviewer: CX-VRT01. Review completed 2026-11-09 UTC, on `verify/RT01`.

Product reviewed: `2ade6e755cc2877e36569da6f8f44ece22229cf0`; builder report head `506cfaf2`. The requested merge into the review branch is `b05557f98a0882e3a8567b20c4d5354b36a997ec`. No product code was changed by the reviewer. Evidence and tools added by this round are under `lab/verify/RT01/round2/`; the round 1 report and evidence remain intact.

## New findings

### F4 — P2 / medium: entity-journal pagination accepts an unavailable snapshot position

**Location:** `packages/core/src/store/entityTransactionHistory.ts:49` (and the call wiring at `packages/core/src/store/TriplesLive.ts:734`).

An explicitly supplied `snapshotPosition` is used only as a logical `?position <= snapshotPosition` predicate. It is never passed to an availability gate. The underlying query is executed at its ordinary current cut, and the response echoes the unavailable snapshot position as if it existed. Q89c requires every future-position route to wait then refuse, rather than return an empty answer.

**Reproduction:** with head 1, call `Triples.transactionsForEntity(entity, {snapshotPosition:2})`. Both actual query executors return `{transactions:[], snapshotPosition:2}` in the offline empty-result transport, after ordinary answer queries and without the 2 s wait. The same failure occurs at head 0 / requested position 1 and with selectors for absent/present entities. Eight natural future-position cases fail. This also means the claimed snapshot boundary can include transactions that publish after the first response; the current implementation has not established a valid pinned cut.

**Evidence:** `round2/matrix/observations.json`, the eight `Triples.transactionsForEntity` / `near` observations. These execute the actual public core service and actual lane query executors, without passing an unsupported recordedPosition field to public TemporalBasis. `snapshotPosition` is this method's documented parameter.

**Proposed fix:** resolve the requested snapshot position through the shared availability machinery before issuing the journal index query, and bind every dependent read to that resolved cut. Preserve the position predicate for stable continuation. Add delayed-publication, timeout, empty-result and continuation tests for this public journal entry point.

### F5 — P2 / medium: the entity-journal index boundary still hides typed basis refusals

**Location:** `packages/core/src/store/entityTransactionHistory.ts:65`.

The indexed-query catch constructs a new `ReadError` for every cause. It does not use the new `toReadError` mapper, so the general error-mapping fix misses this public read boundary.

**Reproduction:** make the actual lane transport reject the entity-journal index request with a `BasisNotAvailable` object. `Triples.transactionsForEntity` exposes `_tag:"ReadError"`, with the original error only in `cause`; the object identity is lost. The result is identical on XTDB and QLever. The outer route cannot be handled by `Effect.catchTag("BasisNotAvailable", ...)` even though its underlying query returned that exact typed refusal.

**Evidence:** the two `Triples.transactionsForEntity` / `sentinel-index` observations in `round2/matrix/observations.json`. The injected refusal is a boundary test, not a claim that this no-recordedAt API naturally asks for a record-time cut. Natural future-position behavior is tested separately in F4.

**Proposed fix:** use `toReadError` at this boundary and retain the exact typed object. Add a public-route test whose index query fails with the typed basis refusal, rather than checking only the mapper in isolation.

### F6 — P1 / high: an open transaction disables the record-time watermark check

**Locations:** `packages/xtdb/src/XtdbStorageAdapter.ts:190`, `packages/qlever/src/QleverStorageAdapter.ts:121`, and `packages/xtdb/src/XtdbQueryExecutor.ts:169`.

Both storage adapters call their basis resolver only when there is no current transaction. Their empty-batch check is after that conditional resolver, so an open transaction still permits an unavailable T to return successfully. XTDB's executor also skips resolution when an overlay state exists and clamps position instead. R33 section 3.2 explicitly includes XTDB route X3 (the transaction overlay); Q90d requires the record watermark on every route.

**Concrete immutable-read reproduction, fresh on both lanes and both encodings:**

1. Commit `seed` at controllable clock 1000. Its receipt instant is 1000.
2. Open `adapter.withTransaction` without writing any facts. Read entity `later` with `{validAt:1000, recordedAt:1000.001}`. The read succeeds with `[]` in 0.1–0.7 ms; the scope watermark is still 1000. Close that read-only transaction.
3. Commit entity `later` at clock 1000. Its decided receipt instant is exactly 1000.001.
4. Repeat the same entity read with the same basis. It returns one row.

Thus an already served named-time answer changes from zero rows to one. The earlier response should have waited and failed `BasisNotAvailable {axis:"recordedAt"}`. This proof uses actual core/adapters and the same offline SQL/SPARQL transports as the successful normal schedules; it does not synthesize a product answer from the oracle.

**Evidence:** `round2/pending-proof/*-observed.json`, corresponding `*.case.json` / `*.case.oracle.json`, `round2/pending-comparisons.json`. Accepted O-REPLAY 0.5.0 passes all four receipt streams but requires R-CUT-6 refusal for every early read (`readStart:1`); all four observed early answers disagree. The subsequent rows at `readStart:2` match the oracle's assertion identities.

The wider pending-context matrix has 30 failures across 15 lane/entry combinations, covering empty/nonempty inputs. Affected on both lanes: storage getByEntity/getByEntities/query and public entity/entities/match. XTDB additionally fails executor execute/executePage and public queryAll without echo. `queryAll` with echo, page APIs, dependencyState, native, interval and maintained routes retain their gate. QLever's pending historical Datalog paths refuse with their documented `DatalogValidationError`; those are counted as supported typed refusals, not as successful temporal answers.

**Proposed fix:** make basis resolution transaction-aware instead of exempting a current transaction. Validate named cuts against the held source watermark, answer only an exact supported committed cut, and wait/refuse typed when unavailable. Keep latest read-your-writes semantics separate. Apply the check before empty shortcuts and the XTDB executor overlay branch. Rerun the four concrete before/commit/after schedules and the full pending-context matrix.

## Fresh results

| Check | Result | Evidence |
| --- | --- | --- |
| Four package builds, typechecks, unit suites, both core typecheck suites | All 14 phases exit 0; **859 core + 93 testkit + 74 XTDB + 37 QLever = 1,063 tests passed**, 116 integration tests skipped. This reruns the original 1,054 plus nine new regressions. | `round2/packages/{stdout,*-tests.txt,execution.json}`; the outer receipt retains source/runner/output hashes and all phase exits in stdout. |
| Original F1/F3 route reproductions | **32/32** top-level basis refusals now match O-REPLAY; native XTQL/SQL/SPARQL and empty public entity batches included | `round2/route-comparisons.json`, `round2/reproductions/route-probes.json`, `public-routes.json` |
| Original F2 journal reproductions | Ordinary same-command and all four cross-ordinal bodies match; nested hydrated changes also match. Older-commit assertion times and legacy-v1 decoding remain covered. | `round2/journal-single-comparison.json`, `round2/oracle-comparisons.json` |
| Actual adapter/core record-time schedules | All four T1–T12 A0/compact lane runs complete, including 200 disjoint transactions, 50 contending updates, lost ACK, backwards clocks, same-ms ties, idle pagination and watermark release. Deferred T8 remains N/A. Original D-C1 and its staged-stamp negative control remain in the freshly passing testkit suite. | `round2/reproductions/probe-summary.json`, source-bound `execution.json`, package testkit log |
| Accepted oracle | O-REPLAY **0.5.0**, exact accepted commit `fed510ecf5137873d5dab1ad192f0e54f8ed0955`: selfcheck PASS, **403 tests OK**, all **14 fixtures** have their wanted outcome, including nine wanted-FAIL controls | `round2/oracle/{selfcheck.stdout,tests.stderr,fixtures.stdout,commands.json}` |
| R-CMD-3, R-RCP-7, R-JNL-5, R-RCP-9 against fresh actual outputs | All four normal/tied/backwards-clock streams and nested ordinals match their applicable receipt/default/journal checks; same-command retract now matches | `round2/oracle-comparisons.json`, `journal-single-comparison.json` |
| R-CUT-6 against fresh outputs | All 32 original refusal observations match. All four additional pending-read proofs disagree on the early answer, while later answer identities match. | `round2/route-comparisons.json`, `pending-comparisons.json` |
| Full committed-context read matrix | **500/510** cases match; the ten failures are exactly eight F4 future snapshots and two F5 wrapped index refusals | `round2/matrix/{catalog.json,observations.json,summary.json,execution.json}` |
| Full pending-context basis matrix | **50/80** cases match; 30 F6 failures, with no harness failures | `round2/pending/{catalog.json,observations.json,summary.json,execution.json}` |
| Wait/refusal behavior where the gate runs | Nearby cut waits observed at 2000.1–2029.9 ms in the ordinary matrix; metadata checks include exact requested axis/cut and observed scope watermark. Far-future record cuts refuse immediately. | Matrix observations include independent request counters and elapsed times. |
| Builder checksum/pins | **423/423** builder manifest files match; 54 changed package files match product commit 2ade6e75. Sole existing pinned-path drift remains testkit/index.ts. | `round2/integrity.json` |

O-REPLAY is executed as the independent black-box judge; its implementation was not inspected or changed. Interface documentation and hashes identify its accepted version. Oracle process exit zero is never substituted for output agreement: in particular the pending proofs have valid receipt verdicts and invalid early observed answers.

Comparisons retain the round 1 normalization boundary: synthetic journal fact IDs and the wire-format `v` discriminator are excluded; exact remaining logical JSON and record/valid times are compared. The oracle's derived `changedEntities` convenience field is omitted when comparing the public TransactionRecord. Own recordedAt/retractedAt fields are not discarded to force a match. Matrix transport counters prevent a successful empty result from hiding an answer query before availability.

## Read-entry inventory and matrix scope

The complete per-lane inventory is `round2/matrix/catalog.json`: **38 XTDB and 34 QLever named call variants**. It includes the queryAll echo variant and XTDB's explicitly mutating maintained publish check, so these are not counts of distinct public methods. Runtime object keys are retained and checked for the core, executor and native services; returned adapter/temporal/maintained keys are also recorded.

| Surface | Every enumerated entry | Basis/refusal exercised |
| --- | --- | --- |
| Public core temporal reads | entity, entities, entityPage, match, dependencyState, queryAll, queryAll+includeBasis, query, queryPage | recordedAt just above W and far above W; empty/nonempty header scopes and selectors; exact typed-object refusal propagation; pending context separately |
| Public journal snapshot read | transactionsForEntity | Its documented snapshotPosition above head, absent/present selectors and head 0/1; refusal injected specifically at the dependent index query (F4/F5) |
| Public core latest reads | get, history, transaction, transactionByCommand, transactions, currentPosition | These accept no temporal basis. Exact BasisNotAvailable and ReadError objects are injected at their transport boundary and must survive end to end. No unsupported TemporalBasis field is invented for them. |
| Public core plan reads | explain, explainPage | No temporal basis or engine read. Invalid query/wrapper limit must expose DatalogValidationError. |
| Storage SPI | getByEntity, getByEntities, query, dependencyState | Future record-time and position cuts; empty/nonempty IDs/attributes/pattern inputs; empty/nonempty header scopes; exact refusal identity; pending context separately |
| Storage metadata/latest SPI | getById, history, currentCut, currentCommitPosition | No request basis; typed basis/read-object propagation exercised |
| Query executor SPI | execute, executePage | Future record-time and position cuts, empty-result/present selectors and header scopes; pending context separately |
| Query executor plans | explain, explainPage | Invalid query/wrapper refusal; no temporal basis |
| Native XTDB | select, selectSql, selectWithReachability, selectSqlWithReachability | Future record-time and position cuts; empty/nonempty parameters/relations; exact refusal identity; both outer and inner error boundaries exercised through actual calls |
| Native QLever | select, selectWithRelations | Same basis/refusal matrix, with SPARQL relation variants |
| Interval providers, both lanes | queryIntervals | Future record-time/position cuts with query selectors and both header scopes |
| XTDB maintained provider | query; additionally publish | Future record-time/position basis and typed refusal; future publish must refuse before any initialization/publication write |
| Operation resolvers, both lanes | resolveXtdbOperation / resolveQleverOperation | No basis argument. Exact typed basis/read refusal object propagation, using valid operation IDs |

For basis-taking methods, the normal matrix uses empty head `(P=0,W=0)` and populated header `(P=1,W=1000 ms)`, plus empty/nonempty selectors. `entities([])` and dependency attributes `[]` are actual empty collection inputs. Other single-entity APIs use absent/present identifiers; no invalid empty identifier is substituted. The matrix's answer transport is intentionally empty and records any premature answer request; normal content correctness comes from the actual-adapter schedules and oracle comparisons. The concrete F6 proof additionally uses real stored seed/later rows.

Record-position cases are sent only to APIs declaring that internal/native option or the journal's snapshotPosition parameter. Public TemporalBasis still declares recordedAt/validAt only. The pending matrix tests each record-basis entry at the same held source scope with both selector variants; unsupported QLever historical Datalog is expected to fail typed. Pure native-context builders (facts/history/recordedFact), client transports and runtime constructors are not independent Triplex reads; their actual I/O is exercised through the owning entry points. QLever sourceView is an internal transaction-state Effect with no requested basis. Writes, constraint validation, initialization and close are classified by their declared role, rather than falsely counted as temporal read APIs.

## Q96b scope-scan measurement

The builder's measurement is accurately labeled an offline sequential-scan model. A fresh independent execution of that runner is retained at `round2/scan/{stdout,execution.json}`. It captures the actual emitted A0 and compact ASSERTs, verifies the pinned pre-RT01 source hash `5a9b4d63a8754e974c4a270610880f3c5199a525354255ff6bf0b9c9a2d6a58e`, and checks eight matrix points (0/100/10k/100k synthetic scope rows, both encodings), six alternating-order pairs per point and exact maxima. The model visits N rows for position-only versus 2N for position-plus-stamp. At 10k synthetic rows the fresh median-pair guard means increased 41.3% (A0) / 40.4% (compact).

These are JavaScript scan-model timings. They establish neither XTDB's physical scan plan/historical-version visibility nor commit-latency overhead. The extra predicate shares the ASSERT, so unchanged statement count does not establish zero engine cost. **Q96b/live G6 remains open before a main merge**: exclusive-slot, same-build/engine, A/A-calibrated paired A0/compact measurements with actual scan evidence, including R39's fresh/10k-history trace. Live G2 is likewise deferred by the dispatch. No performance acceptance follows from this offline review.

## Pins, integrity and attempt retention

`round2/integrity.json` independently scans 41 existing path/hash entries in the frozen obligations. Only `packages/testkit/src/index.ts` differs, repeated at `/oracleFilesPinned/O-TESTKIT/0`, `/caseSets/CS-U44/pinnedSourceFiles/0`, and `/caseSourcesPinned/CS-U44/0`:

- Old: `6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988`
- New: `995bc1ace5ebb9654a74e238b8860cb7e8f012a979c7c4cf86d03388efd935c7`

No additional existing pin moved; no acceptance/oracle file was changed by the builder delta or this review. The contract-owner re-pin and helper/oracle inclusion remain separate work.

Source/runner before/after hashes and explicit `offline-no-engine` context are in each controller receipt. `round2/bindings.json` identifies the accepted oracle, current final build hashes and all adopted executions; its final build inventory is a closure snapshot, not a claim of pre-run engine state. Product source and executing runners are verified unchanged before comparisons. `round2/SHA256SUMS` and `round2/INDEX.json` provide the retained-byte inventory. Every file is under 1 MB and the new raw directory is under 5 MB; no bulky evidence is committed in breach of rule 9c.

`round2/comparison-attempt1/` preserves the first comparator's source/error: its broad filename glob treated the newly colocated single-command fixture as a lane fixture and sought a nonexistent nested case. The corrected comparator restricts lane observations explicitly. No product source was changed, and no failed comparator result was adopted. Original failed builder/reviewer attempts also remain in their earlier directories. Raw command logs preserve emitted whitespace; authored reviewer files are checked separately.

## PASS / verdict / receipt audit (rule 9a)

| Result-producing site | Content check | Freshness and exact binding |
| --- | --- | --- |
| run-packages.mjs; run-bound.mjs | Fresh build/type/test commands and exits; package tests assert their own semantics. Exit alone is not route acceptance. | Controller records source/runner before/after, attempt UUID, exact command, head, offline context and raw-output hashes; all stable. Fourteen phase exits are in retained stdout. |
| run-reproductions.mjs / original probe copies | Four completed actual-adapter suites, all 32 original top-level tag/axis reproductions, raw and hydrated journal observations | Fresh per-lane/encoding fixtures; copied helper hashes before/after, source-bound command receipt and output hashes; no round 1 output reused. |
| read-matrix.ts | Exact tag, axis, required/observed cut, timing, identity for injected objects and no answer/write before availability. Invalid plan inputs have their documented typed error. | Independent request fixtures/counters across both scope headers and selectors; complete 510-case denominator; exact source/runner/controller binding. Ten mismatches remain failures. |
| pending-reads.ts | Same checks in an actual open adapter transaction; explicitly expected QLever capability refusal distinguished from an answer | Fresh 80 cases, source-bound runner; 30 mismatches retained, not converted to PASS. |
| pending-proof.ts | Actual before/commit/after row bytes and exact later receipt stamp, on all four lane/encoding combinations | Fresh real adapter/transport scopes, source/runner hashes and actual clock/commands/receipts retained. It records the counterexample, not a successful correctness verdict. |
| oracle-compare.py, compare-routes.py, compare-single.py, compare-pending.py | Actual defaults/journal bodies/hydrated changes/receipt consistency/error types or row identities compared to freshly executed accepted 0.5.0 | require_binding validates current source and adopted attempts; cases and oracle bytes are hashed; 32 original matches and four early pending mismatches kept distinct. |
| run-oracle.py | Exact accepted source hashes; selfcheck, all 403 tests and 14 authored positive/negative fixture outcomes | Fresh executions with command/timestamps; no accepted source inspection/edit and no historical result adoption. |
| Scan runner / scan receipt | Captured emitted columns, exact baseline hash, known maxima, eight matrix points/six pairs, N/2N counts | Fresh source-bound offline run; explicitly engineIO=false; never emits a latency or engine PASS. |
| integrity.py, binding.py, final-checks.py, INDEX/SHA256SUMS | Builder manifest, reviewed Git source, frozen pin drift, current accepted oracle/build/runner hashes; complete expected outcome counts | Fresh local bytes; final-checks requires adopted executions stable and exits zero, then explicitly emits FIX-FIRST. Successful harness execution cannot erase the 10+30 route failures. |
| This report's verdict | F4–F6 map observed failures to Q89c/Q90d/R33; F6 independently disagrees with oracle R-CUT-6 | Exact product 2ade6e75 and retained new attempts; no promotion or live acceptance. |

## Handoff and limits

Fix F4–F6 on a builder branch and re-review independently. Keep all original regression tests, add entity-journal snapshot/refusal cases, and make the pending before/commit/after proof fail closed. The historical X3 overlay row in R31 is not a waiver: R33 explicitly lists X3 among the gated round A routes.

No engine/container was queried, started, stopped or recreated; no exclusive slot was claimed and no Docker or unrelated port was used. Host free space remained about 12 GiB. Heavy work used lab/bin/heavy.mjs; the shared lab semaphore caused waits without bypasses. No pnpm install/configuration change was needed. No product fix, main merge, push, release, root pnpm check, pack/consumer rerun, external-backend integration, live G2, live G6 or performance qualification was performed. The only merge was the user-requested builder-to-review-branch merge. Full live acceptance, the Q96b engine measurement and contract-owner work remain open.
