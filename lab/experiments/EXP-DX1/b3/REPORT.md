# DX-B3

North star: P2 small atomic idempotent commits, with P1 read isolation. Targets: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md.

## Final status

Implemented M1-M5 and completed the requested measurements. **The performance targets remain open.** Final combined gates: 203 passed, one permitted pre-existing failure; all nine package typechecks passed. Final serial p50/p99: **8.17/34.13 ms**. Final 55/s burst p50/p99: **14.15/481.92 ms**, or **17.92/583.62 ms** with 32 readers. All 2,000 RYOW checks were correct, and final bursts had zero conflicts/replays at 1.008 HTTP calls per commit. All owned containers, networks and volumes were removed.

| Milestone | Final outcome |
| --- | --- |
| M1 | Version 2 row codec, version 1 reading and codec/reach gates complete |
| M2 | Transactor positions, entity conflicts, staged reads, final receipts and 16-client/500-race gates complete |
| M3 | One-call hinted commits, bounded LRU, typed replay/duplicate/lost-ACK gates complete |
| M4 | Both full measurement attempts retained; burst and 8 ms serial-stretch bars missed |
| M5 | JSON index disabled and actual schema observed; complete gates and full remeasurement complete; no isolated native-latency benefit established |

## M1

Implemented version 2 fixed-width position strings and journal-position flag, retaining canonical version 1 decoding. Reach streams the array after the new flag. Tests: rowText + reach, 2 files / 7 tests passed on this attempt, including 10,000 seeded round trips for both versions and 200 reach scenarios. Development stack: tx2-dxb3-dev, all four containers CPU 5, ports 8499/8500. Evidence in `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B3/tx2-dxb3-dev/stack.json`.

No scorecard PASS or qualification receipt is produced. Test assertions check actual decoded content against the tagged codec and original reach path using fresh UUID databases and this attempt's gateway source hash. Later milestone results follow.

## M2 implementation checkpoint

Installed source-hashed `:triplex/commit`; prepared transaction data uses position/text/retraction placeholders. Inside Datomic it checks live IDs and entity revisions, assigns the final span, finds exact current row text for retraction, and maintains recorded-time metadata. The function uses only `d/datoms`/`d/entid`; its payload walker accepts Datomic's Java map/list representation. The gateway returns the position from the report's own transaction datom and its delta. The optional core member corrects the public receipt after storage commits. Snapshot reads (`d/with`) use the same function.

Read tracking is entity-scoped for named entities and row IDs, scope-wide for history, dependency-state and Datalog/pattern/constraint reads without named entities. Added `concurrent-commits.test.ts`: 16 x 200 buildTraceCommand commands, 500 same-row races, nested spans, scope-wide replay, stored receipt positions and historical reach. The broad suite is still running at this checkpoint; this is an implementation commit, not a gate-complete claim. Focused nested/span/pattern replay test passed. Touched-core tests: 4 files, 46 tests passed.

Initial diagnostic failures retained: stack startup raced transactor discovery (socket reset); placeholder walker initially recognized Clojure collections only; journal number placeholders initially produced a long instead of a double. Those defects were corrected before the current full-suite attempt. Development source reloads are diagnostic and do not constitute immutable gateway-source receipts.

## M3 implementation checkpoint

Implemented the bounded 100,000-row LRU populated by committed rows and decoded reads (including reach), one-call optimistic hinted commits, real live-ID verification, cache eviction and snapshot replay after conflicts, and snapshot restart for unsupported reads before submission. Only replay-safe callbacks use the optimistic path; an optional `optimisticCommits: false` retains the explicit M2 two-call gate. ACK and operation-resolution paths share final-position settlement, including cached rows, journal values and nested position spans. Request diagnostics count optimistic attempts, unsupported-read restarts, conflicts and replays.

Focused M3 gates: 22 tests across commit-fast and the offline value-domain fixture passed. They assert one HTTP request, remote stale-row rejection after exactly one conflict/replay, original duplicate receipt, lost-ACK exactly-once readback, and entity-state fallback before submission. The offline fixture now supplies the actual receipt shape (operation ID, position, t, datom count), instead of a position-less success response. An immutable stack rebuild and complete fresh suite are running; final counts will supersede this checkpoint.

Design addition: concurrent timestamp regression sets the existing sticky irregular flag but need not invalidate position-only/current reach. New scopes carry a sticky `position-regular` proof; any out-of-span assertion/retraction clears it. Reach still declines record-time bases after irregularity, and older scopes without the proof retain the prior conservative rule. This avoids turning all concurrent-read traffic into history scans while preserving exact cuts. Added independent tests for both timestamp-only regression and out-of-span positions.

Acceptance audit at this commit: no performance or scorecard PASS is emitted. `persist` accepts only a tagged safe final position/t with the submitted operation ID and actual datom count, or the operation-specific resolved receipt; `settle` runs only after those checks. Semantic test assertions compare actual stored rows, public receipts, expected typed failures and request paths in fresh UUID databases. Position regularity is cleared on actual out-of-span content and is never inferred for older scopes.

## Functional gate closure before M4

Fresh complete suite: **153 passed, 1 known pre-existing failure, 12 files** (154 tests, 154.94 s). The only failure is adapter.test.ts `preserves signed zero and int64 bounds and rejects noncanonical integers`, rejected by the existing exact value domain. The 16-client/3,200-command test, 500 same-row races, nested span and replay tests, reach, route equivalence, receipts and lost ACKs all passed. It additionally checks all 16,000 asserted user rows, every retired stamp's final retirement position, exact contiguous public receipt positions, all 3,200 historical reach cuts, and Datomic physical transaction ordering. The M2 concurrency gate explicitly disables optimistic commits so it continues to exercise stale two-call snapshots.

The position-regularity test's initial new fixture used noncanonical transaction IDs, which the Triple decoder correctly declined; its corrected fixture passes. Fresh decoder edge tests: 7 passed, including both row versions, malformed fixed-width wire positions and non-null journal placeholders. Prefetched absent IDs now conservatively make a transaction scope-wide; its replay regression test passed. Scope-wide/read-set tracking also retains reads from rolled-back nested callbacks.

Touched core: **46 passed / 4 files**, rerun after implementation. Typechecks: core, datomic, sql, sqlite, postgres, cloudflare, foundationdb, xtdb and qlever all exit 0. SQL declaration generation was required before checking its consumers. No external dependencies were downloaded; installation used the offline frozen lockfile and the designated store.

## PASS / receipt audit

No scorecard PASS, promotion, contract change or qualification verdict is produced.

- `gateway/commit.clj`: conflict and regularity decisions inspect current transactor datoms, the submitted live IDs, exact entity revisions and the staged position interval. Scope identity comes from the gateway's scope config. The function runs on the database immediately before this transaction, including under `d/with`.
- `gateway/storage.clj` `commit!`: final position comes from this `d/transact` report's transaction-position datom, t from this report's db-after, delta from the submitted provisional position; operation ID is this submission's ID. Unique claims/identities remain atomic in this transaction.
- `DatomicStorageAdapter.ts` `persist` / `settle`: accepts a tagged safe final position and t, nonnegative datom count and matching operation ID; otherwise resolves the fresh UUID operation at its operation-specific endpoint. Cache publication and public-position overrides happen only after that bound acknowledgement/resolution. The operation-resolution receipt must contain a safe final position. No provisional rows are published as committed cache entries.
- `rowText.test.ts`, `concurrent-commits.test.ts`, `commit-fast.test.ts`, `position-regularity.test.ts`: assertions compare actual decoded bytes/rows, stored journal values, complete asserted-row and retirement positions, exact typed failures, request counts and historical reach contents. Integration databases use new UUID identities on this attempt's source-hashed owned stack; pure codec and offline HTTP tests are explicitly not native-engine qualification.
- `b3/bench.mjs` (M4): records completed public calls, final-position HTTP samples, actual datom counts and wall/gateway/transactor timings. It counts every write HTTP attempt, bounds in-flight work at 32 without scope admission, and checks read-your-own-write against each exact returned position and expected stamp. Each timed phase takes the shared measurement lock and records exact container IDs/cpusets. Raw observations, copied runner and source/build hashes stay outside git. Percentile tables are diagnostic numbers beside bars, not automated performance PASS claims.

## M4 first attempt (retained diagnostic miss)

Attempt: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B3/bench-1794268877201-f6e8fefe-1c41-4c20-9e1e-d55b22a07b05`. Input/build snapshot: `m4-source-20261109-190116/` under that evidence root. A post-run hash comparison confirms all snapshot source/build files stayed unchanged during execution. Stack `tx2-dxb3-m4`: PG CPU 0, transactor 0,1, writer 2, reader 3,4 only under the shared measurement lock; otherwise CPU 5. PG durability flags remain on. Same 2,000-subject seed and deterministic shape/arrival seeds as DX-B2; writers use 200 subjects.

| Mode | DX-B2 p50 / p90 / p99 ms | First DX-B3 p50 / p90 / p99 ms | HTTP calls/commit | Bar |
| --- | --- | --- | --- | --- |
| Serial, 3,000 warm + 3,000 timed | 9.77 / 17.18 / 30.69 | 9.87 / 19.80 / 33.78 | 1.008 | stretch p50 <=8; P2 <=10 / 50 |
| 55/s, 60 s, 3,291 offers | 25.16 / 69.29 / 177.86 | 18.56 / 37.94 / 157.22 | 1.549 | <=10 / 50 |
| Same + 32 readers | 28.77 / 126.48 / 353.21 | 21.02 / 54.27 / 417.79 | 1.628 | <=10 / 50 |

No conflicts or replays in either burst. Max in flight 21 / 32 (cap 32); unfinished offers minus one peaked at 22 / 42. Writer p99 reader/no-reader ratio 2.657 (DX-B2 1.99; P1 reference <=1.25). All 2,000 returned-position RYOW checks observed their stamp; pull p50/p90/p99 5.44/20.35/48.40 ms (DX-B2 4.87/11.63/50.27). Serial datoms p50/p90/p99 249/538/896, identical to DX-B2's final shape distribution.

The first attempt misses the requested burst bars and serial stretch target. Attribution: staging p50 1.325 ms, transact HTTP 6.539, gateway 4.937, d/transact 4.501, post-response 1.963. Begin p50 is zero. The 1.008 serial HTTP mean includes cold correction-address hints evicted by the bounded LRU; those correctly use begin.

Two measured implementation defects are being corrected next: the client retained `position === provisional` ACK validation, so concurrent position shifts caused unnecessary operation-resolution HTTP calls (semantics stayed correct); and insertion-order Map eviction repeatedly scans deleted slots under a sustained 100,000-row cache workload. A new concurrent gate will require zero operation-resolution calls on valid shifted ACKs. M5's conditional index experiment is now eligible because d/transact exceeded 4 ms p50. No isolated causal speedup is inferred from this whole-design first attempt.

## M5 and M4 corrections, gates before remeasurement

The eligible M5 change explicitly sets `:f.v/json :db/index false`, including schema upgrades. The M4 rerun also contains necessary D4 corrections: the client now validates `final - provisional === delta` instead of rejecting shifted ACKs; the 100,000-row LRU uses direct linked-list eviction; unchanged-position settlement avoids redundant staged-row copies. Gateway preparation carries the exact row patch offset and the transaction function pads the final position once, avoiding per-row header parsing/Formatter allocation at the serial point. These are measured together; the rerun cannot isolate the JSON-index effect.

A public nested-receipt gate exposed the remaining D5 edge: an inner receipt exists before the outer commit. Its `position` now resolves through the optional adapter member when read after outer completion; readings inside the uncommitted outer callback are necessarily provisional. Final overrides remain until consumed rather than being evicted at a row-cache-like limit. The outer normal receipt remains a plain final-position value; adapters without the optional member retain their behavior.

Final fresh combined gates: **203 passed, 1 permitted pre-existing failure / 204 tests, 17 files, 150.95 s**. Datomic contributes 157 passed + the known failure; touched core contributes 46 passed. This includes all 3,200 concurrent commands with **zero operation-resolution HTTP requests**, all 500 same-row races, both kinds of nested-position test, every asserted/retired position, exact reach cuts, duplicates and lost ACKs. All nine package typechecks pass again. Added client ACK-delta and sustained LRU-turnover tests. The benchmark rerun will also query its actual database schema for the JSON attribute without an enabled index.

Audit additions: `DatomicClient.transact` checks tagged safe final position/t and the exact submitted-provisional-to-final delta; the concurrency gate asserts no resolution calls on shifted ACKs. The nested receipt getter consumes only its own txId's bound override after publication. RowCache changes eviction mechanics, not whether a row is accepted: liveness remains checked inside the current transactor database. M5's schema observation binds the actual queried database and attribute identity before recording its non-indexed witness.


## Final M4 remeasurement after M5

Final attempt: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B3/bench-1794270094390-083990e2-6dc5-4146-b347-eb15cfcf3c0a`. Complete source/build preimages: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B3/m5-source-20261109-192133`. All **660 source/build files** matched their pre-execution hashes on post-run readback. The runner's schema witness identifies the measured database's `:f.v/json` attribute with no enabled index. Its first setup-only probe used unsupported `not`; the retained failure was corrected to the gateway's supported `not-join` before the measured attempt. The source snapshot includes that exact working-tree runner patch.

| Mode | DX-B2 p50 / p90 / p99 ms | Final DX-B3 p50 / p90 / p99 ms | Target / status |
| --- | --- | --- | --- |
| Serial, 3,000 warm + 3,000 timed | 9.77 / 17.18 / 30.69 | 8.17 / 15.63 / 34.13 | <=8 stretch **missed**; <=10 / 50 observed |
| 55/s, 60 s, 3,291 offers | 25.16 / 69.29 / 177.86 | 14.15 / 27.79 / 481.92 | <=10 / 50 **missed** |
| Same + 32 readers | 28.77 / 126.48 / 353.21 | 17.92 / 59.03 / 583.62 | <=10 / 50 **missed** |
| RYOW pull, 2,000 checks | 4.87 / 11.63 / 50.27 | 4.63 / 16.30 / 41.41 | all 2,000 stamps correct; 5 / 25 ms pull reference misses p99 |

| Burst measure | No readers | 32 readers |
| --- | ---: | ---: |
| Completed offers | 3291 | 3291 |
| Max in flight (cap 32) | 32 | 32 |
| Max unfinished offers minus one | 47 | 46 |
| HTTP calls / commit | 1.0082 | 1.0082 |
| Conflicts / replays | 0 / 0 | 0 / 0 |

No scope admission queue is enabled. Subject ordering, the explicit 32-in-flight cap and late timer releases still count in latency from the intended offer. Every scheduled offer is retained; no deadline censoring or dropped work. The p99 ratio is **1.211** (DX-B2 1.99; reference 1.25), measured at 32 readers, with both absolute burst latency bars missed. This is not a full P1 isolation qualification. Both arms reuse the Poisson schedule and subsequent deterministic command-shape draws as DX-B2 did; accumulated worlds and phase-specific engine maintenance are not matched clones.

Serial HTTP calls/commit **1.0077**: bounded-cache misses on rare correction-address hints correctly take two calls. Serial datoms p50/p90/p99 remain **249 / 538 / 896**, exactly the DX-B2 final distribution. The read and write reach diagnostics report zero faults, zero reference misses and zero declines. The read gateway waited in 13 of 2,000 RYOW checks.

| Serial component | DX-B2 p50 / p99 ms | Final DX-B3 p50 / p99 ms |
| --- | --- | --- |
| beforeMs | 0.18 / 0.42 | 0.000 / 0.000 |
| beginWallMs | 1.05 / 3.26 | 0.000 / 0.000 |
| beginGatewayMs | 0.34 / 2.17 | 0.000 / 0.000 |
| stagingMs | 1.44 / 4.77 | 1.304 / 4.462 |
| transactWallMs | 6.73 / 26.37 | 6.626 / 31.525 |
| transactGatewayMs | 5.00 / 24.18 | 4.977 / 29.433 |
| datomicTransactMs | 4.21 / 22.71 | 4.534 / 28.309 |
| afterMs | 0.11 / 0.22 | 0.161 / 0.313 |

Medians are not additive. Post-response p50 fell from the first attempt's 1.963 ms to 0.161 ms. Native transact p50 stayed about 4.5 ms, so this experiment does **not** demonstrate a native latency benefit from disabling the JSON index. The complete design improved the serial median and removed the unnecessary shifted-ACK resolution calls; its burst tails remain unacceptable for the stated bar.

### What the retained tail evidence shows

`burst-wait-breakdown.json` derives only from actual per-command observations. Median service time is 12.08 ms without readers and 16.53 ms with readers; median offer/subject/cap wait is 1.84 / 1.18 ms. Respectively 83 / 419 commands exceeded 50 ms. Percentiles of components are not additive, particularly around rare pauses affecting different in-flight/queued cohorts.

The owned transactor's native log and compact `measurement-metrics-summary.json` are retained. Minute summaries overlapping these measured windows include transaction/apply maxima of 674/669 ms and 855/851 ms, a storage-put maximum of 808 ms, and multi-second background index builds. This corroborates engine-side tail events after removing the client admission queue; it does not identify whether storage, indexing, JVM pauses or transaction-function work caused each command's tail. Per-command native and pause correlation is the next measurement. These data do not support the initial assumption that eliminating client admission alone would meet P2.

## Conservative and fallback cases

- Scope-wide snapshot validation: history (even for a named entity), dependency state, Datalog, patterns without a fixed entity ID (including variables and entity-type/constraint scans), and a by-ID read that finds no row, including prefetched absence. Reads from failed nested callbacks are retained in the parent's validation set.
- Snapshot path from the start: no hint, any hinted row absent from the 100,000-row LRU, callbacks not explicitly replay-safe, or `optimisticCommits: false`.
- Optimistic restart before submission: entity-state reads, any unhinted/by-pattern/entity/history/basis read that the hinted by-ID cache cannot answer, an unhinted command claim, Datalog/constraints, or a request for the current source position. The shared restart flag survives wrapped/caught read errors and nested callbacks.
- Optimistic CasConflict / CommandConflict: hinted IDs are evicted and replay is forced through `begin`; original duplicate claims and stale preconditions then surface their existing typed errors. Raw callbacks without complete hints may require additional read calls beyond the common two-call path.
- Fast reach declines: record-time bases after timestamp irregularity, out-of-span position irregularity, older irregular scopes without explicit position proof, interior positions of a multi-position transaction, existing row overflow/budget limits, and other existing conservative cases. Normal current/exact physical-position reach survives timestamp reordering on proven new scopes.
- A nested public receipt's numeric position is provisional while its outer transaction is uncommitted; the receipt object resolves the final value after the outer commit. Position overrides remain until consumed or the adapter closes; only the row LRU has the requested 100,000-row bound.

## Pins, procedure, retention and limits

No edited path or old source SHA256 appears in the current `lab/acceptance/` content/pins search. **No pinned acceptance file changed; the contract was not edited.** `source-hash-changes.json` lists every relevant edited/new code path with its base and final SHA256 so the contract builder can independently re-pin it. Core edits are limited to the optional committed-position member and its transact result handling; the composition edit only removes Datomic admission. No Changeset outside the task's allowed paths was added.

All engine gates, stack runs, timed benchmarks and final typechecks ran through `lab/bin/heavy.mjs`; early short source-hash/typecheck probes ran directly, a procedural deviation retained as diagnostic work. The final evidence sealing uses the heavy wrapper. Every final functional stack container used CPU 5; every measured CPU 0-4 window held the shared lock and recorded exact container IDs/cpusets, returning them to CPU 5 on release. No downloads, default-Docker/Colima changes, unrelated residents, forbidden ports, merges, pushes or deployments occurred.

`CLEANUP.json` freshly reads back **zero** `tx2-dxb3-*` containers, networks and volumes after benchmark completion and owned-stack removal. Dedicated test database state was intentionally removed; source/build preimages, first-failure artifacts, raw observations, native logs and checksums are retained under the durable evidence root. Bulky oracle output from the first suite was moved out of the repository; later suites wrote directly to durable evidence. The repo contains only this report, small summaries/indexes and the evidence SHA256 manifest.

No independent review, promotion, scorecard PASS, full NS acceptance run, 256-reader isolation test, package packing/root-wide pnpm check, fresh power-loss durability experiment, or existing-indexed-database upgrade exercise was performed. The explicit false index value is implemented for schema reinstallation, but the actual schema witness and measurements are from fresh databases. The next work is explaining the native/storage/indexing tail events and meeting the burst and serial-stretch bars; correctness gates and one-call optimistic submission are established for the tested paths.


Final sealing audit: the heavy-wrapped sealer enumerated 2,954 quiescent durable files, wrote their SHA256 manifest, and read each file again against its manifest entry with zero mismatches. The committed evidence index binds that manifest and its readback record by SHA256. `CLEANUP.json` was written only after successful owned-stack removal and fresh prefix-filtered Docker inventories returned no resources. These checks establish byte integrity and cleanup of this attempt, not a performance or independent acceptance verdict.
