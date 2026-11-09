# RT01 round A — independent review, round 3

**Verdict: FIX-FIRST.** F4–F6 from round 2 are fixed in the fresh offline reproductions. The strengthened named-time schedules found no unequal successful snapshot pairs in their declared route coverage. A new positive journal reproduction nevertheless returns different pages at the same snapshot position when the runtime clock moves backward (F7). This prevents ACCEPT-OFFLINE.

North star: P1 exact immutable reads, P2 decided receipt identity, and P3 an ordered resumable journal; correctness takes precedence over performance under `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

Reviewed builder report head `26772e42` and product `a754ac12` plus `4b305bc8886d4bcdd73f36be65b53fda3e1846cd`. Merged report head into `verify/RT01` as `c801942f4394f2a2a854ef4ae1eb5bdac7b1576b`. All adopted executions bind that merged head, the exact unchanged product sources, unique attempt IDs, and `offline-no-engine`. No product code was fixed by this reviewer.

## F7 — High: entity-journal snapshots still depend on the current clock

**Location:** `packages/core/src/store/TriplesLive.ts:725–738`, especially the journal index call at line 733. The reader captures `now` as `validAt` and supplies it to both the index and envelope queries. Journal facts have `validFrom = stagedAt` under R33 C9, so this business-time predicate can hide already committed journal entries. The journal page API has `snapshotPosition`, with no caller-selected valid time. Its fixed-position answer must not change with the caller's clock. This is a journal completeness defect, not an assertion that changing an ordinary query's explicit validAt should preserve its answer.

**Reproduction:** actual Triples service, XTDB adapter and XTDB Datalog executor; execute their emitted SQL using the reviewer's SQLite transport. Repeat with A0 and compact encoding:

1. Set the deterministic runtime clock to 1000. Assert `subject / :value / "value"`. Receive position 1, instant 1000, stagedAt 1000.
2. `transactionsForEntity(subject, {snapshotPosition: 1})` returns the single transaction and its change.
3. Set the clock to 900 without writing anything. Repeat the identical request. It succeeds with `{transactions: [], snapshotPosition: 1}`.
4. Set the clock back to 1000. The identical request returns the original transaction again. `transactions()` also still returns it.

O-REPLAY 0.5.0 independently expects the original nonempty page at position 1. Exact logical record comparisons match before and after restoration and **fail at clock 900 on both encodings**. The emitted index SQL contains `valid_from <= 900`; the metadata watermark remains position 1. Backward clocks are a supported decision-stamp case, not an invalid-input control.

**Evidence:** durable `journal-clock/attempt3/{a0,compact}-observed.json`, corresponding `*-sql.json`, `property-oracle/*-observed.case.oracle.json`, and `property-comparisons.json`; indexed by [round3/DURABLE-INDEX.md](round3/DURABLE-INDEX.md). The reproduction tool is [journal-clock.ts](round3/journal-clock.ts), with [sql-transport.ts](round3/sql-transport.ts).

**Proposed fix:** make journal index and envelope access depend on the committed record-position cut without applying the changing client valid-time clock. Use an explicitly journal/all-valid-time read path bound to that position, and retain the shared gate and typed mapping. Add a positive fixed-snapshot journal regression with clocks moving backward and with a commit whose staged clock is ahead of the reader. Merely changing the watermark or error mapping cannot repair an index that silently filters away its rows. The KV implementation has the analogous `runtime.now` predicate at `packages/core/src/kv/layers/KvTriplesLive.ts:821`; that is source inspection, not a reproduced lane result. No actual QLever journal-positive execution is claimed here.

## Fresh checks

| Check | Result and limit |
| --- | --- |
| Packages | All 14 build/type/test phases succeeded. **1,074 tests passed**, 116 skipped: core 863, testkit 96, XTDB 77 (+91 skipped), QLever 38 (+25 skipped). Includes core runtime/entity type fixtures. Skipped integrations are not acceptance. |
| F1–F3 and stamping | Four original actual-adapter schedules (XTDB/QLever × A0/compact), including raw/hydrated journal and nested ordinals, pass fresh comparisons. Valid defaults use stagedAt; decision receipts and same-clock ordering match the independent oracle. |
| F4/F5 | The full entry-point matrix now has **510/510** expected outcomes. Future journal snapshot positions wait and refuse typed before index access; injected index errors preserve the typed refusal. |
| F6 | **80/80** pending-read matrix outcomes match. Four pending before/after proofs now wait about two seconds and return `BasisNotAvailable / recordedAt`, then return the committed row after publication at the same T. No early successful empty answer is adopted. |
| Typed route comparisons | All **32/32** original public/SPI route probes match O-REPLAY's expected refusal tag and axis. All four before/after proof cases match its refusal and row identities. |
| O-REPLAY 0.5.0 | Exact accepted tree `fed510ecf5137873d5dab1ad192f0e54f8ed0955`: self-check, **403 tests**, and **14 O06 fixtures** succeed. The fixture denominator includes expected-failure controls. No oracle implementation was read; only execution, documented interface and byte identity were used. |
| Record-time rules against outputs | R-CMD-3, R-RCP-7, R-JNL-5, R-RCP-9 and R-CUT-6 pass the original four lane/encoding observations and nested cases. Wrong observed valid/journal defaults remain rejected by controls. Receipts alone are never used as proof of returned bytes. |
| Stronger actual schedule | Four runs; six competing writer pairs and six aborts per run; 13 committed cuts per run, all in epoch millisecond 1000. **3,650 successful repeated-answer comparisons**, zero mismatches; **52 final seed snapshots** also match O-REPLAY independently. |
| Stronger model schedule | 16 seeds per lane, generated length 36, all 3 XTDB and 5 QLever model routes: **128 route histories, 195,471 successful reads, 186,767 repeated-answer comparisons, 24,689 typed refusals**, zero violations. The staged-stamp negative control still detects HE-5. |
| Integrity | All **525** entries across the builder's main, round-3 and durable manifests verified. Reviewed package source matches the builder; acceptance/oracle diffs are empty. Only the previously reported existing pin is stale (below). |

The matrix preserves the round-2 catalog, including empty and nonempty entity batches, direct storage, entity page, Datalog query/page/echo, native, interval, dependency, maintained and journal entry points. Its detailed scenarios and observed typed objects are retained under durable `matrix/`, `pending/` and `reproductions/`.

## What the stronger schedules establish

[The actual driver](round3/strengthen-actual.ts) holds writer A immediately before the transport mutation, starts a read at the next microsecond, lets writer B decide there, then releases A to lose its CAS and retry at the following microsecond. Reads run while A is staged, while a future cut is waiting, after both decisions, inside read-only pending contexts, and inside a transaction that retracts/replaces a row and is then aborted. Every prior T is reread after later retirements. The aborted marker remains absent; attempted aborted writes are not represented as committed commands in the oracle case. Receipt positions/instants, actual assertion identities and race order are supplied to the independent oracle.

Actual positive pair coverage, on each encoding:

- **XTDB (18):** entity, entities, entityPage, match, storage query/getByEntity/getByEntities, queryAll, queryAll with basis echo, query, queryPage, executor execute/executePage, native facts/recordedFacts, intervals, maintained query, dependency state.
- **QLever (7):** entity, entities, entityPage, match, storage query/getByEntity/getByEntities.
- **Model snapshot routes:** X1-all-valid-time, X6-cold, X6-warm; Q1-replica, Q2-overlay, Q3-source-after-eviction, Q5-outage-source, Q5-h1-disabled. Q4-H1 and other round-B routes remain unimplemented/out of this round's positive qualification.

The model driver adds random microtask yields, overlapping reads and physical-group publication, whole-group resets, entity-specific and whole-relation requests, repeated old cuts, and future cuts. It forces each model route immediately before its read, as the fixture protocol requires. Each successful canonical row answer is compared with the full-history reference snapshot and the first served bytes for the complete request. Refusals never become an earlier empty answer.

For XTDB, SQLite executes emitted relational SQL and the actual CAS expressions. The transport strips XTDB valid-time syntax, translates array parameters, and evaluates the LATERAL interval subquery per SQL-derived span before running the original coalescer. It does not calculate answers from the expected history. This exercises adapter/executor filtering, not XTDB engine isolation, indexing, durability or planner behavior. QLever uses the builder's deterministic emitted-SPARQL fixture, not a running engine. Successful pairs compare canonical result payloads, preserving row fields while excluding per-call trace/header data; they are not a claim about literal transport JSON serialization order. Final seed rows are compared to all corresponding oracle fields, with Effect Options unwrapped and internal position fields omitted from the public Triple projection.

The new builder property is sequential between publication steps and its actual QLever schedule samples available cuts only. The extra schedules add the missing overlap/abort/same-millisecond cases within the coverage above. They do **not** prove a universal all-route invariant: journal pages fail F7, positive actual QLever executor/native/interval/broker paths were not qualified by these fixtures, and live engines remain deferred. The broader refusal matrix still exercises their typed refusal boundaries.

## Retained first failures and attempts

No failed attempt was replaced under the same identity:

- `actual-property/attempt1`: SQLite lacked LATERAL and schema-catalog handling. `attempt2`: the interval transport passed unused bindings to the remaining SQL. `attempt3`: A0 completed without pair violations, then compact exposed its typed array parameter encoding. These are reviewer transport limitations, with raw errors and SQL retained. The corrected transport is used by the clean `attempt4`, all four runs.
- `model-property/` first run recorded 433 violations in eight Q1 model histories because the reviewer reset its replica without forcing the route before each outstanding read. The driver violated the fixture protocol. Its original source and failed result remain; `model-property/attempt2` applies the declared force operation and passes. This is not a product finding or a hidden rerun.
- `comparison-attempt1`: four inner comparisons completed, but the outer wrapper could not write its receipt because its output directory did not yet exist. Not adopted. `comparisons/attempt2` has a complete fresh bound receipt.
- `journal-clock/` and `attempt2` are preliminary reproductions. `attempt3` is adopted, both encodings, with the exact imported transport hash checked before/after and matching the final source.

## Pins and unchanged boundaries

Existing pin scan: 41 entries; the same single unique path is stale in three places:

| Path | Pinned sha256 | Observed sha256 |
| --- | --- | --- |
| `packages/testkit/src/index.ts` | `6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988` | `995bc1ace5ebb9654a74e238b8860cb7e8f012a979c7c4cf86d03388efd935c7` |

Occurrences: `/oracleFilesPinned/O-TESTKIT/0`, `/caseSets/CS-U44/pinnedSourceFiles/0`, `/caseSourcesPinned/CS-U44/0` in `lab/acceptance/obligations.json`. No additional existing pin moved. New helper/property coverage and re-pinning belong to the contract builder; the contract was left unchanged.

## PASS / verdict audit (rule 9a)

Every reviewer result-producing site is listed here. These are bounded observations; none issues engine or contract acceptance.

| Site | Content check | Freshness and binding |
| --- | --- | --- |
| `probe.ts`, `journal-single.ts`, `public-routes.ts` | Actual adapter receipts, raw/hydrated journals and complete typed error objects are captured; suite assertions/control cases retained. | Rerun by this attempt's controller; helper before/after hashes in `reproductions/commands.json`; source/lock snapshots and unique offline execution receipt. |
| `read-matrix.ts`, `pending-reads.ts`, `pending-proof.ts`, `run-reproductions.mjs` | Every scenario's expected tag/axis/outcome, exact 510/80 denominators, and four typed-before/nonempty-after proofs checked. | Fresh six-command run; current source and helper hashes; proof receipt IDs bind observed cuts. No earlier empty answer is relabeled. |
| `run-packages.mjs` | Retains all 14 command statuses/raw logs; closure reads exact passed/skipped test summaries rather than exit alone. | Fresh build before tests, unchanged source/lock snapshots, command times; 143 embedded source-map contents checked and emitted JS hashes equal the earlier comparison inventory. |
| `run-oracle.py` | Accepted oracle tree hashes, self-check, 403-test summary and 14 fixture outcomes, including negative controls. | Fresh timed commands against the exact accepted Git tree; full input/dependency hashes retained by self-check. Implementation not inspected. |
| `binding.py`, `oracle-compare.py`, `compare-routes.py`, `compare-single.py`, `compare-pending.py`, `run-comparisons.py` | Independent expected bytes compared with actual logical values/defaults/journal changes and typed errors; receipt consistency and negative controls checked separately. | Inputs hash-bound to fresh package/reproduction receipts; current source/runners verified; exact accepted oracle identity; raw cases and responses retained. |
| `strengthen-model.ts` | Each successful row payload equals the expected snapshot and first served bytes; expected negative control detects HE-5. | New seed/schedule attempts and isolated route fixtures; source-bound execution, preserved failed first attempt. |
| `strengthen-actual.ts` | Full returned payload pair comparisons, route pair denominators, competing receipt order, abort marker absence; errors cannot count as successful answers. | Four fresh scopes, actual IDs and transport mutations; unique bound attempt; imported transport hash checked before/after. |
| `journal-clock.ts` | Asserts the reproducible 1→0→1 journal change without writing, and exact restoration. Exit zero means the defect reproduced, never product PASS. | Fresh A0/compact scopes, position/receipt binding, retained SQL; current source and imported transport hash. |
| `compare-property.py` | 52 seed snapshots and four receipt streams checked by O-REPLAY; both journal mismatches explicitly required and retained. | Hashes exact inputs/observed bytes, accepted oracle and source-bound run; never interprets oracle receipt PASS as agreement with the empty page. |
| `integrity.py`, `close-review.py` / `RESULT.json` | Rechecks all adopted contents/denominators, controls, package summaries, source maps, build hashes, raw output hashes, 525 builder manifest entries and pin drift; requires both F7 mismatches before FIX-FIRST. | Exact source/product/head, unique attempt IDs, offline slot, start times, helpers, accepted oracle and current bytes checked. Closure requires unchanged acceptance/oracle and records `liveQualified:false`. |
| `seal-review.py` and evidence manifests | Copies every selected raw byte, reads back its SHA256, then removes only that verified local copy; manifests bind durable paths and all committed review tools/report. | Inventory made from this run's owned outputs after closure. All failed attempts retained. No semantic PASS is inferred from a copy or checksum. |

`run-bound.mjs` supplies source/runner stability and raw-output hashes for the adopted controllers and property attempts. It is an execution binding, not a semantic judge. Its earlier imported-helper gap is closed for adopted reproductions by the controller's helper hashes, for actual/journal schedules by their transport digest, and by the closure's current-byte checks. Comparison helper implementations are retained in the committed source manifest.

## Evidence and remaining work

All round-3 raw output, including first failures, is durable under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VRT01/round3/`. [DURABLE-SHA256SUMS](round3/DURABLE-SHA256SUMS) verifies it; [DURABLE-INDEX.md](round3/DURABLE-INDEX.md) identifies adopted attempts. Small reviewer tools and this report are committed; bulky output is not. Closure result: durable `RESULT.json`, with seven adopted attempt bindings and `verdict: FIX-FIRST`.

No live G2/G6, external-engine integration, root `pnpm check`, tarball/consumer qualification, round-B implementation, deployment, publication or push was done. No container lifecycle or exclusive slot was used. Heavy commands ran through `lab/bin/heavy.mjs`, with host free disk above 5 GiB. Live G2/G6 still require the orchestrator's later exclusive slot; contract re-pinning remains with its owner. The immediate open action is F7's journal filtering fix and a fresh independent positive-journal regression.
