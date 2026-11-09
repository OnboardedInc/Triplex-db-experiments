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
