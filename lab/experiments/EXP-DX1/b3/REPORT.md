# DX-B3

North star: P2 small atomic idempotent commits, with P1 read isolation. Targets: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md.

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
