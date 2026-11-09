# DX-B1 report

North star: P1/P4 subject pulls and P2 commits; targets are lab/TARGETS.md.

## M0

Implemented DATOMIC_BASE_URI with the requested default. Offline install reused 600 packages, downloaded zero. Built the Datomic dependency graph. Isolated container tx2-dxb1-dev, image tx2-datomic:1.0.7745-da00, CPUs 6/7, memory/swap 3g, port 8490, owned volume tx2-dxb1-data.

Baseline: 7 files, 135 tests passed, 1 failed (136). Existing failure: adapter.test.ts “preserves signed zero and int64 bounds and rejects noncanonical integers” raises InvalidTripleError for a value outside the declared Datomic domain. Not changed or chased.

Raw baseline and build logs: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B1/{baseline.log,build-baseline.log}. No acceptance or scorecard PASS claimed.

## M1

Implemented rowText.ts, row datoms and retirement, sticky regularity metadata, exact position/time db selection, bounded peer BFS, hand-written reach response, adapter decoding and core-BFS ordering. Empty visited entities are explicitly carried in `visited`, allowing coverage validation; decode/coverage faults increment client.reachDiagnostics.faults and fall back. Added optional atomicReach to avoid the core's otherwise mandatory basis preflight, and StorageAdapter.reachBy to reuse the exact core traversal without private source imports. Other adapters retain the default path.

Fresh M1 gate: 200 scenarios, 6,600 comparisons, 5,960 accepted/deep-equal, 640 declined (380 interior-position, 260 irregular), zero decode/coverage faults. Valid ranges, time equality, earlier exact/interior cuts, combined cuts, chains/cycles/shared and absent targets, retirement and nested two-position commits are covered. Public Triples.reach is asserted to make exactly one HTTP request. Codec fuzz: 10,000 rows; 2 codec tests passed, 1 integration property test passed. Core existing reach-cut suite: 5 passed.

All three manually staged mutants failed with answer-mismatch assertions: skip valid-time filtering; skip retracting row datoms; ignore recordedAt. mutants.sh restored production source and restarted afterwards. Final unmutated gate passed. Raw evidence: m1-final.log, m1-results.json, core-m1.log, mutant-{valid,retraction,recorded}.log, mutants.log, build-m1-final.log under the durable evidence directory. Earlier failed attempts remain there: domain-invalid fuzz fixtures, a startup race, and an oracle fixture that accidentally dropped recordedPosition were corrected before the final gate.

Declines: rows-version absent/not 1; sticky irregular record-time/position history; non-head position without an exact physical tx (including position zero); overflow flag on any visited entity (text >8,000 UTF-16 code units, or an empty ref target); more than 5,000 visited entities; more than 100,000 returned rows. Transaction-local calls decline in the adapter so staged rows use the existing path. Malformed decoded response, basis mismatch or missing visited coverage increments faults and falls back. Historical overflow is evaluated at the selected db. Gateway id cache is cleared on database deletion.

The current declared domain rejects negative zero business-number values and malformed/NUL string values. The row codec preserves negative zero in time columns and preserves literal string "-0"; it uses the same value-domain rejection as decodeRow. Four-digit header lengths reject strings above 65,535 code units. Oversized data is not silently truncated.

### Observation-to-verdict audit (M1)

- rowText.test.ts: deep equality with decodeRow(encodeRow(row)), seeded 10,000-row generation and explicit domain rejection; current process imports current source against the freshly built core.
- reach.test.ts: each accepted answer is deep-equal in content and BFS order to core BFS over actual by-entity reads at the identical resolved basis, in a freshly created UUID scope; declined answers must be undefined. Explicit one-request assertion and zero-fault assertion prevent a silent fallback from qualifying.
- mutants.sh: each staged mutation requires a nonzero test exit AND an AssertionError answer mismatch, not a startup/transport error. Restores the source after every run series.
- Report counts describe these diagnostic executions only. No scorecard, contract or semantic acceptance PASS is issued. Source copies are retained in evidence/DX-B1/source-M1 and the staged gateway; dependencies are bound by dependencies.sha256. No lab/acceptance file was edited.

## M2 implementation checkpoint

Read routes now use d/db; no-argument d/sync is restricted to connection startup and write paths. Position waiting polls every 1 ms, or waits locally with d/sync(conn,t). DatomicClient remembers its last acknowledged database/position/t and attaches basisT only for that exact database and position. Build passed. Added a client binding test and the suspended-transactor diagnostic script.

At this checkpoint the stopped-transactor proof is still waiting for the shared PROTOCOL 0b measurement lock; client/read-pin tests are waiting for a heavy slot. These are pending, not successful observations. The M2 implementation is committed separately so M3 can progress while the diagnostic waits. Final validation below supersedes this pending status only if actually executed.

## M3 and final correctness gates

Implemented optional command/triple-id hints in the two named core files; new /v2/.../begin atomically prefetches snapshot, claim and by-id rows. Transaction-local staged rows override prefetches, including staged retractions and nested savepoints. Non-prefetched reads retain the existing request path. The transaction response carries operationId, position, t and datom count; a validated bound ACK skips the redundant operation lookup. Ambiguous/lost ACKs still resolve the original operation. Transact releases its handle in finally, including errors while acquiring the latest write db; the adapter omits its separate release after submission. Unsubmitted/duplicate/stale-precondition callbacks still release their handle. admissionQueue is exposed by makeDatomicRuntime.

Additional safety corrections: core-equivalent transaction-id validation in the fast decoder, peer-connection-scoped entity cache keys (database deletion/recreation cannot reuse a stale cached id), and a budget on scanned as well as returned row datoms. M1 files were formatted; unrelated core formatting was intentionally not changed.

Build and declaration generation passed. Two-call integration test passed with typed duplicate/stale errors, lost-ACK exactly-once readback, and released-handle readbacks after success/failure. Initial duplicate fixture incorrectly expected a return value; corrected to the existing CommandAlreadyCommittedError behavior and retained its failed run.

Final Datomic suite: 10 files, 140 passed, 1 failed (141). The only failure is the same baseline signed-zero/domain test; it was not changed. Fresh 200-scenario equivalence again ran 6,600 comparisons with 5,960 matches, 380 interior-position declines, 260 irregular declines, zero faults. Core suites touched by the edits: 15 passed. M2 client/read-pin subset: 99 passed. The focused strengthened M3 test: 1 passed. Logs: final-tests.log, final-reach-results.json, core-final.log, m2-tests.log, m3-typed.log, build-m3.log.

### Observation-to-verdict audit (M2/M3)

- DatomicClient.transact: validates ACK long tags, safe exact expected position and nonnegative native t before remembering a database-bound local wait token. client.test.ts checks that equal positions in another database do not reuse it.
- DatomicStorageAdapter.persist: normal success requires the fresh operation UUID, expected position, valid t and safe datom count in this submission's HTTP ACK. Ambiguous outcomes retain the original operation lookup path; a success is never inferred from exit zero or an empty ACK.
- DatomicClient.beginCommand: validates snapshot coordinates, claim shape, requested row identities, no duplicates, live retirement state and each row's position at/before the snapshot.
- commit-fast.test.ts: freshly created UUID scope, two actual HTTP requests, typed duplicate receipt with the exact original transaction id, typed stale precondition, lost-ACK readback exactly once, and attempts to read released handles rejected by SnapshotExpired.
- reads-without-transactor.mjs (still pending measurement lock at this checkpoint): will verify exact owned process identity, stopped state, expected row bytes/position across 90 reads, then resume in finally. It cannot claim success without content checks.
- measure.mjs waits for the measurement directory before taking a heavy token. The first M2 wait was cancelled (only its own waiting process) to free a heavy slot; m2-wait-cancelled.json records it. No other process or shared lock was stopped/removed. A mistyped measurement-wrapper smoke invocation also failed before running a diagnostic; it produced no measurement or semantic verdict.

## M1/M2 edge-guard follow-up

Removed the lazy initial d/sync from connection lookup entirely: existing databases are synchronized before Jetty accepts HTTP; subsequent cold read lookup has no explicit no-argument sync. Added conservative irregular declines when a low-level caller supplies assertion/retirement positions above the submitted commit position, as well as the specified at/below-source cases. This avoids treating an unusual SPI position as a row visible at the physical commit cut.

Fresh affected-route run: 3 files, 7 passed, including another full 200-scenario/6,600-comparison equivalence run with identical 5,960/380/260 counts, the lower/upper/future-retirement guard test (three fresh scopes), read-pin tests and the typed two-call test. Evidence: guard-tests.log and guard-reach-results.json. This is additional builder verification, not an acceptance PASS.

## Source pin changes

No lab/acceptance file or contract pin was edited. The table is a conservative inventory of all changed package/core source and test paths, including newly added paths, so the contract builder can re-pin whichever it owns. Old hashes are from the pre-task byte inventory, not inferred from historical PASS receipts.

| Path | Old SHA-256 | New SHA-256 |
| --- | --- | --- |
| `packages/core/src/storage/StorageAdapter.ts` | `c1adfaa6557d9b2005530b5a51b1e5cf928594c8beff96812bdcafef84166fa3` | `e4fc53e12643d065be9f78a52945c962e70d85790b8350d8a811bd5a74b64701` |
| `packages/core/src/store/TriplesLive.ts` | `cdc31080a5d9394155379d0b393819cd6a8031223b395a725ba94bc2f9d6dc3b` | `bc1a92b1019b9fa7ceabac8d1a03e736046dbda5d7628b928166a6e3b2e03738` |
| `packages/datomic/gateway/src/triplex/gateway/main.clj` | `5d070016255c2a38afce92f1dd55deb0b8da51925db46fbf73e2e630d699f4c3` | `63fb6608c7ce3472afedad459dc4fcd6105a08df1ab5732c7797e649fdc2c3df` |
| `packages/datomic/gateway/src/triplex/gateway/reach.clj` | `absent` | `b16a2ae00d44bc362630d8b3961ab954fc1cbffdb11f29d58764f140a7fc8773` |
| `packages/datomic/gateway/src/triplex/gateway/schema.clj` | `636254617e969cbaa4ec4c9bd25d29be0b3b636fb2d81394e69cf9b8cfa4f2e9` | `8026af67e3256c1248092af04820f273889e865b9746099d9b5afcbc09b048b7` |
| `packages/datomic/gateway/src/triplex/gateway/storage.clj` | `a300bd5339d40f63b1a9ed8ad5df8a3f19d67b76f0805595fbfaa3d68f0f2424` | `206b5b5348ae383d50a185e4042a06248694cda36caf79896e40a1cb5b0126fe` |
| `packages/datomic/src/DatomicClient.ts` | `da67e6b05f895ec871f43818f91a133f5baf233ffb151b880b02a46d352c1256` | `a6aa9280d14078b348d089d44a32ab1072ee7d3999e097c35a7e0a4afe3b19c4` |
| `packages/datomic/src/DatomicStorageAdapter.ts` | `a6225eec140aec9868124005c7df22ac856e1207bf15c9a63bc447fbdb080e2c` | `41db0700fcc54f90eedbae19ada2d56ec6d702ea713c822fd2df8b4d9bc7c8ee` |
| `packages/datomic/src/TransactionContext.ts` | `c762a47c553a453c1ac72833a029ca276c8e1f224d06d60aff450df45355236a` | `132ebc0f4489c2b757d71704456aab39c558995ccb20eb16840d44500984aca3` |
| `packages/datomic/src/index.ts` | `effd45fd207db218f6f350871dffff64636f9a9a77ef6037068654f32af309ba` | `18532fe2192d2722e28edfafad97f2b593bc8b7ee38cdc73c53059de864f594f` |
| `packages/datomic/src/protocol.ts` | `414860b9e13cc0fdd7e7ad92b45a4cbd1bf723456ba58988b35e1709cc3ea660` | `ca53c3398dedb1e9508225c3cd8de5b6b9f72fdfdbee549af507fe4ea324db5d` |
| `packages/datomic/src/reach.ts` | `absent` | `dd6d8aef3dd45d68fb14c3359c4e20eee3f54243783c8d20f877c2b155f3b4ab` |
| `packages/datomic/src/rowText.ts` | `absent` | `cdaf0563d3f4ab0bf3e558ec01169ddcf82e261beeff849585db286b0879ad4f` |
| `packages/datomic/test/client.test.ts` | `86280df65376e2ef857b5d3424d438afae401da790bb811f9549df7a0efcb28e` | `47db8b5ddb6429a71a18b46df9361f85120c27d35d014bb0482fd2e803c4d33d` |
| `packages/datomic/test/commit-fast.test.ts` | `absent` | `0546d7d5fbfb5140c37eddf05e1be10f91ccb07c40a85411cef5ebfb08918b57` |
| `packages/datomic/test/reach.test.ts` | `absent` | `eea7ddfc3308fb1e913ddb272293181867c1557124f43da8aeb018f9e0ca1f49` |
| `packages/datomic/test/rowText.test.ts` | `absent` | `04b5da9f988c01f930852969c897b2fe4b46aca8e56ad5ef88e09b978df9b088` |
| `packages/datomic/test/value-domain.test.ts` | `547d16ce6f3b965ef69e620500affffb693892bfac0eb97983d432917527dc02` | `692aaa17d602710890fac592e1d72062a8d17013dc36dc93beb2d9a2b7489060` |

## M2 stopped-transactor proof completed

The measurement lock became available and the script completed with exit 0. It verified the exact owned transactor process, stopped it, and checked expected row bytes and position across 30 reach, 30 read and 30 basis calls, then resumed it. Independent post-run process readback confirmed state S (sleeping), not stopped, on the same container/process identity.

| Route (30 calls, warm peer, transactor stopped) | p50 ms | max ms |
| --- | ---: | ---: |
| reach | 1.774 | 15.222 |
| read | 2.061 | 9.990 |
| basis | 1.375 | 6.187 |

Evidence: reads-without-transactor.json includes all responses, native basis, container id, process id and exact staged gateway/client-build hashes; m2-stopped-retry.log and m2-resume-verified.json retain the completed run and resume readback. This proves the tested warm last-known reads proceed without the stopped transactor; it is not a cold-storage or production/Postgres qualification.

## Cross-adapter compatibility and evidence retention

SQLite, PostgreSQL, Cloudflare, FoundationDB, XTDB and QLever typechecks passed (9 successful build/typecheck tasks including their dependencies), using the updated public core declarations. No other adapter source was changed. Evidence: other-adapters-typecheck.log.

The existing route-equivalence suite generated two raw oracle directories above 5 MB. After their test processes completed, they were moved to durable evidence and every file hash was verified before/after: generated-oracle/seed-29-36dab7ee-8bd4-46bc-9aac-799d81d81641 (6 files, 5,834,805 bytes) and generated-oracle/seed-29-fbc03a39-ce4f-4173-9238-de2cab6dfb4c (6 files, 5,835,153 bytes). generated-oracle-index.json binds original paths, durable paths, byte counts and SHA-256 values. None of the raw oracle output is committed.

M4 driver is complete and queued for the measurement lock. It reuses world.ts/commands.ts and built public packages, uses accounts 22/470 with 15/90 requirements, samples the same roots for both arms, and retains attempt-specific runners, raw arms and commit progress. No M4 numbers are claimed at this checkpoint.
