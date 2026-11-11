# DX-M2 — partial; keep hints off

North star: P2, under lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md.
Status: additive JVM arms committed; opt-in hints candidate implemented; native/integration gates passed; both throughput comparisons complete. Defaults unchanged; no latency-target claim.

| Measurement                            | A       | B       | C       | D       |
| -------------------------------------- | ------- | ------- | ------- | ------- |
| T1 burst p50/p99/max, two alternations | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| T2 transactor GC/safepoint maxima      | NOT RUN | NOT RUN | NOT RUN | NOT RUN |

T3: NOT MET; record-time assignment and ClockConflict retries remain unchanged (contract stop below).
T4 diagnostic: 1,000 subjects/42,775 commands per arm, window 32; fixed JVM B/write-G1 goal 50. Rates are command-only, before count/fingerprint validation.
| Gateway cores | off A1 (commands/s) | on B1 | off A2 | on B2 |
| --- | --- | --- | --- | --- |
| 1 | 612.0 | 520.3 | 634.6 | 526.3 |
| 2 | 704.2 | 651.8 | 713.3 | 687.7 |
Two-core TX CPU ms/command, A1/B1/A2/B2: 2.229/2.269/2.122/2.067; count/fingerprint work excluded.
One-core TX CPU: 2.542/2.115/2.203/2.144, INCLUDING count validation; not comparable to command-only CPU. Original bytes retained, then endpoint corrected.
All eight fingerprints matched; no unhandled trial errors. Hints were slower in every pair and never reached 700/s; keep disabled on these profiles.
Rate holds: 06:28:23–06:39:28 UTC (host quiet→busy) and 07:18:04–07:29:08 (quiet→quiet); compare arms within each hold, not across profiles. Both cleaned completely.
T5: NOT RUN; no same-hold steady before/after numbers.
No JVM arm is recommended from fresh evidence. D is a provisional young-generation bound, not a choice derived from fresh A–C logs.
Commit p99 after these changes is unmeasured; its remaining cause has not been isolated.

Exact candidate flags (all append GC below; defaults remain unchanged):
A: `-Xms256m -Xmx3g`
B: `-Xms3g -Xmx3g -XX:+UseG1GC -XX:MaxGCPauseMillis=50`
C: `-Xms3g -Xmx3g -XX:+UseG1GC -XX:MaxGCPauseMillis=20 -XX:+AlwaysPreTouch`
D: C plus `-XX:+UnlockExperimentalVMOptions -XX:G1MaxNewSizePercent=20`
GC: `-Xlog:gc*,safepoint:file=/tmp/gc.log:time,uptime:filecount=2,filesize=10M`
Transactor object-cache-max: A/B 1g; C/D 256m; memory-index-max 1g; container 4g.
Write gateway: `-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=50 -Ddatomic.objectCacheMax=1g` plus GC.
Its second candidate replaces `50` with `20`; only 50 was exercised, without the requested 10k latency comparison.
`m2/arms.sh ARM 50|20` exports the options; DX_TX_OBJECT_CACHE survives H4's generic cache reset.

Record-time contract stop (ten lines):

1. Core chooses `timestamp` before staging at packages/core/src/store/TriplesLive.ts:272–274.
2. It constructs the public receipt with `instant: timestamp` at line 484.
3. It constructs returned triples and journal changes before the adapter commits.
4. Post-commit reconciliation at lines 505–519 only corrects position.
5. packages/core/src/storage/StorageAdapter.ts exposes committedPosition, but no committedInstant hook.
6. Its generic withTransaction returns arbitrary A; rewriting arbitrary callback results is not a sound timestamp contract.
7. Nested callers can already retain their receipts before the outer commit assigns a final cut.
8. Changing only stored times would leave public receipt instants and returned triples naming the submitted cut.
9. Per the task's stop condition, core, transaction time assignment, receipt times and client clock retries are unchanged.
10. A core receipt/triple reconciliation contract is needed before assigning a different record time on the server.

Hints: DX_COMMIT_HINTS=true enables d/with :return-hints before ordered submission; original transaction data is always submitted.
Speculative rejection falls back to normal authoritative submission; strict order code is unchanged.
Source: https://docs.datomic.com/reference/hints.html; this snapshot uses a stored db/fn, not a classpath commit function.
The native test requires real hints, compares datoms (excluding automatic db/txInstant), and advances the head before reusing older hints.

Executed: offline frozen install; eight package/dependency builds (cache hits); Datomic typecheck; shell/Node/Python syntax checks; owned process-group exit/descendant cleanup test.
Local suite: 172 passed/51 skipped. Fresh full lean suite: 215 passed/2 skipped (32 files).
Native attempt 1: admission cutoff, exit 124, no containers; attempt 2 cancelled to consolidate native and integration gates, exit 124.
Consolidated gate exited zero: SQL native 12 tests/507 assertions; unchanged differential 300 scenarios; HTTP order 4 tests per layout, both 10,000-commit runs; lean 215/2. Two-core profile reran order: 4 tests/layout, both 10,000-commit runs passed.
Hold 05:09:00–05:25:01 UTC; host quiet before/after; owned containers/networks/volumes removed. Rate comparison skipped by budget guard.
The checked-out h4/run.sh seeds afresh; it does not clone a sealed seed. Its zero-reader oracle is explicitly NOT-RUN in lab/bench/driver.ts:814.
Therefore it cannot supply the requested sealed-clone/oracle-qualified T1/T2 comparison unchanged; no diagnostic was relabelled as that proof.
PASS audit sites: hints_test.clj/-main (fresh SQL scopes, hint/datoms/head assertions); gates.sh (unchanged live Vitest assertions); run-owned.test.ts (new child PIDs/exit statuses).
rate.ts emits metrics only after a fresh empty-scope seed and full stored-world fingerprint match; CPU reads bind the exact transactor cgroup ID. The corrected endpoint is captured by storeCounts before it performs validation. All use current owned source mounts; raw IDs/options/source identity bind the slot. No acceptance promotion.
No pinned changed path was found in lab/acceptance; acceptance files, core, journal/feed, replica and durability settings are untouched.
Raw command output: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-M2/; 637,757 bytes compressed, gzip integrity checked. gates1.log.gz, rate3.log.gz, rate4.log.gz are the main runs; no manifests/source captures.
Commands: `pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`; `npm_config_store_dir=/Users/sam/projects/triplex-db-2/.pnpm-store pnpm exec vitest run --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic`.
Gates: `source lab/experiments/EXP-DX1/m2/arms.sh B 50`; `DX_COMMIT_HINTS=true node lab/bin/heavy.mjs --label DX-M2-gates1 -- bash lab/experiments/EXP-DX1/m2/hold.sh stack gates1 bash lab/experiments/EXP-DX1/m2/all-gates.sh tx2-dxm2-gates1`.
Rate: same arm; `DX_COMMIT_HINTS=true M2_GW_WRITE_CPUS=2,3 M2_ORDER_BEFORE_RATE=1 node lab/bin/heavy.mjs --label DX-M2-rate4 -- bash lab/experiments/EXP-DX1/m2/hold.sh stack rate4 bash lab/experiments/EXP-DX1/m2/measure-rate.sh tx2-dxm2-rate4`; fresh IDs/deadlines for reruns.
Tools: `node_modules/.bin/tsc -p lab/experiments/EXP-DX1/m2/tsconfig.tools.json`; `node --experimental-strip-types lab/experiments/EXP-DX1/m2/run-owned.test.ts`; scoped oxfmt/oxlint passed.
Rate1 cancelled before admission for checked TypeScript helpers; rate2 admission cutoff (124); rate3/4 completed. No measured sample discarded. Last admission cutoff 07:30 UTC respected.
Next: identify the intended sealed seed/zero-reader oracle and measure JVM arms; add the core reconciliation contract before assigned record time. No 10k latency or GC-pause bar was verified.
