# EXP-SQL01 independent QA: FIX-FIRST

Reviewer: CX-VSQL01-2. Branch: `verify/SQL01`. Reviewed builder head `53d41ad05809f3e6faab16de2258d2535556d77d`, implementation `3a53c3b891ee50d59486a0edb650dd28c3d1e1df`. Continued the committed CX-VSQL01 WIP at `e93fda8`; no product source, dependency lock entries, or package contracts were changed. Keep this candidate default-off. No promotion is justified by these results.

North star: P1 consistent named snapshots with continuing writes, P2 atomic idempotent durable commits, and P3 ordered restartable delivery. Goals and measurements come from `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`. The main checkout's `CLAUDE.md`, `lab/PROTOCOL.md`, R25, the builder report/manifest, and Q84a-e were read. Q84a-e are recorded in `lab/acceptance/RULINGS-PENDING.md`; this review does not promote pending rulings into compiled acceptance authority.

## Findings

### F1 — HIGH: H1 loses facts for a combined record-time and position cut

**Location:** `packages/qlever/src/broker/BrokerStorageAdapter.ts:330`, selecting the H1 result without considering `basis.recordedAt`; `packages/qlever/src/broker/sqlite-worker.ts:127`, discarding retired rows using only `rpos > B`.

**Reproduction:** `review.test.ts`, test `source outage honors a recorded-time cut combined with a later position`. Run:

```sh
node lab/verify/SQL01/gate.mjs <new-attempt> node node_modules/vitest/vitest.mjs run --config lab/verify/SQL01/vitest.config.ts review.test.ts -t 'source outage'
```

1. Commit 40 assertions for one subject, in one transaction, at time T1 and position P1.
2. At a strictly later T2/P2, retract ten of those assertions in one transaction.
3. Make answer requests encounter a replica outage. Read at `{ validAt: later, recordedAt: T1, recordedPosition: P2 }`.
4. Expect all 40 original assertions: the retractions happened after the requested record time. H1 returns **30**.
5. Commit an unrelated subject and advance the H1 horizon to P3 > P2. Repeat the **identical request**. Source fallback returns **40**.

Fresh reproduction: [`evidence/temporal-r8-recorded-cut.json`](evidence/temporal-r8-recorded-cut.json), with P2=3072 and H=4096; [`evidence/temporal-r8.log`](evidence/temporal-r8.log) contains the failing exact-ID assertion. An earlier independent reproduction is retained under `temporal-r4-*` and in `review-r5-*`. Each gate receipt reports `sourceStillMatches: true`.

**Cause:** H1 removes the ten rows because their retraction position is at or below P2. The adapter's subsequent `visibleAt` correctly says that a retraction after T1 is invisible, but cannot recover rows already removed by H1. Its eligibility check knows only a position and a position-based horizon, not the combined temporal cut. The same named basis therefore changes its answer when routing changes. This is a partial view of an earlier 40-assertion commit, without requiring a torn SQLite transaction, a crash, or a checkpoint race.

**Proposed fix:** bypass H1 for requests with `recordedAt` and use the complete persisted source until H1 supports that cut. A more complete fix must implement both temporal predicates and horizon eligibility for the combined cut; merely adding a timestamp filter after H1 selection is insufficient. Keep the exact-request, before/after-purge regression. No fix was made in this review.

### F2 — MEDIUM claim limitation: pinned readers can delay the writer's checkpoint/ACK path

**Location:** `packages/qlever/src/broker/sqlite-worker.ts:85` waits for active readers; line 86 runs a potentially waiting RESTART checkpoint; line 113 calls it before the append response returns.

**Reproduction:** `schedules.test.ts`, test `holds the real reader algorithm after its marker across commits and a WAL restart attempt`; passing receipt [`evidence/barrier-r6.json`](evidence/barrier-r6.json). A barrier holds a readonly snapshot after its first marker SELECT. Real commits grow the WAL above 64 MiB. At LSN 25 the writer's RESTART encounters that pin. The commit call takes **163.67 ms**, versus 23.83 and 29.02 ms for the preceding two large commits; WAL size is 83,289,952 bytes. All commits finish while the reader is still pinned. The checkpoint's 100 ms SQLite busy timeout and its placement on the ACK path explain a reader-dependent wait; the entire 163.67 ms is not attributed to that wait. Raw timings are in [`evidence/barrier-r6-barrier.json`](evidence/barrier-r6-barrier.json).

**Boundary:** this uses the product's actual reader algorithm with one test-only barrier, on a separate readonly connection and separate gate counter. It exercises SQLite's native checkpoint/read lock interaction. It does not prove that an ordinary short application-pool read will exceed a latency bar. Pool-gate waiting can add its own bounded wait. This is compatible with Q84b's explicit gated-checkpoint design, but disproves a literal claim of no reader-dependent writer delay. It is not a calibrated failure of TARGETS' P1 p99 ratio; that remains unqualified.

**Proposed response:** qualify the claim as bounded writer progress until measured at the required reader levels and trace. If zero reader-dependent waiting is required, remove blocking RESTART work from the ACK critical path and separately bound WAL growth. Preserve an explicit stuck-reader regression and record checkpoint wait outcomes. F1 is sufficient for the FIX-FIRST verdict independently of this claim limitation.

## Results against the five requested checks

| Check | Fresh independent evidence | Result and limit |
| --- | --- | --- |
| Whole snapshots during concurrent writes | `review-r5-hot-schedules.json`: 150 schedules, each 32 distinct-subject writes followed by eight concurrent five-fact writes to one hot subject | Every hot read returned all 40 exact IDs. The builder's original assertion-only failure was not reproduced. |
| Retained basis, hot replacements, purge and WAL maintenance | `review-r5-overlap.json`: 251 committed versions, 18,254 pulls from 32 logical readers, 250 hot replacements, repeated purges under a retention pin; WAL reached 81,337,072 bytes | Zero basis/row violations. Every retained version was checked again after the writers finished. WAL file-size decreases are visible in the recorded sizes; internal checkpoint return codes were not instrumented. |
| Snapshot physically held across a commit and restart attempt | `barrier-r6-barrier.json`: marker-pinned reader, 40-row replacement and 26 large subsequent commits | Held reader returns the original 40 exact IDs; latest pull returns the 40 new IDs; named old-basis pull still returns the original set. Writer progresses, with F2's wait. |
| Replica catch-up past epoch-only prefixes | `review-r5-live-epochs.json`: seven no-write restarts, `maxApplyCommands=1`, real qlever-dev, 80 concurrent fixed-basis reads overlapping replacement | Catch-up drains; old basis remains exact before, during and after apply. Final latest read has all 40 replacement IDs. Routes: 83 replica, one overlay, zero source-log reads. Only the uniquely named test graph was dropped afterward. |
| Abrupt process stop / acknowledged durability | `kill-r3-results.json`, `kill-r3.json`: 50 actual full-process SIGKILLs, ten each before append, in flight, after append, after ACKED rename, and after observed ACK | All **163 observed ACKs** survive successor open with original positions, claims, operation receipts and exact ten-row groups. No lost acknowledged commit in this bounded crash schedule. True power loss is untested. |
| Idempotency | Kill/reopen loop retries recovered operations; `review-r5-idempotency.json` adds 32 concurrent same-operation submissions and a changed-payload retry after reopen | 32 committed responses, one ten-row application, one commit feed frame, original receipt and head unchanged on replay. |
| Ordered resumable feed | `review-r5-feed-restarts.json`: 45 expected/observed positions across ten opens, including epoch-only opens; `kill-r3-results.json`: 189 positions resumed across crash cycles | No skips among acknowledged positions and no repeated delivered commit positions. The 189 include recovered unacknowledged commits, which are legal. This tests poll/cursor resume, not a full external consumer effect/checkpoint service. |
| Readers never delay writer | Replacement/reader overlap completes; controlled held-reader checkpoint case F2 | Writer progress established in these slices. Absolute no-delay claim is false for the held-reader case. No calibrated 0/64/256/1024-reader comparison or production P1 acceptance was performed. |

The final semantic case set has six passing cases and F1's intentional failing assertion across the source-bound `review-r5`, corrected-threshold `barrier-r6`, and strengthened identical-request `temporal-r8` executions. This is **not a passing full suite**: `review-r5` itself recorded five passes and two failures; the second failure was the verifier's WAL-size precondition described below. No passing rerun erases F1 or the builder's original failure.

## What the 30/40 observation means

F1 provides deterministic conditions and an identified cause for a 30-of-40 snapshot answer. It is a temporal-routing defect, not evidence of a torn SQLite commit. It does **not** explain the builder's original assertion-only case: that case had eight five-fact assertions and no later retraction. The original fixture was deleted by the builder suite, so its row timestamps, IDs and storage state cannot be inspected. Both the earlier corrected helper run and the final run each completed 150 assertion-only schedules without reproducing it. Its original cause remains unknown and remains a validation gap. Do not label it fixed based on F1 or these repetitions.

The barrier test also narrows the concurrency hypothesis: a marker-pinned product reader survives a replacement and a blocked WAL restart without mixing old and new rows. It inserts only an `Atomics` barrier immediately after the reader's actual marker query. The original and instrumented worker string hashes are recorded; no repository product source is edited. This targeted instrumentation is not the unmodified application-pool performance benchmark.

## Crash durability is not power-loss qualification

The parent process independently retains observed ACKs and feed cursors while each broker process and all its threads are killed. Successors rerun the product recovery path and independently compare the parent-observed ACKs with receipts, claims and exact rows. Killing in-flight calls covers selected timings; it does not enumerate every SQLite syscall or every possible commit instruction.

SIGKILL leaves the host filesystem and device caches alive. No physical power cut, filesystem crash simulator or SQLite VFS durability-fault injection was performed. FULL synchronous/fullfsync settings and recovery ordering were inspected in source and in R25; that is not direct proof of physical power-loss durability. Thus “every acknowledged commit survives power loss at any point” remains unverified. The sidecar corruption/recovery cases and 80 kills in the builder report are historical builder evidence, not additional independent executions here.

## Source, dependencies, first failures and retention

- All **256** builder-manifest entries were checked against their recorded bytes and SHA-256: zero missing or mismatched files. `identity-r9-identity.json` and `identity-r9-builder-manifest.json` bind this check, the unchanged product tree against both requested heads, lockfile, built core files, native binary, platform, and dependencies. Actual native identity is better-sqlite3 **12.10.0**, SQLite **3.53.1**, Node **22.23.2**, Darwin arm64.
- Gate receipts bind commands, source SHA-256 maps, execution head, times, disk observations, exit status and log hashes. The execution head is the reviewer WIP ancestor `e93fda8`, with reviewer working files separately hashed. All completed gates from this run report unchanged inputs across execution. `MANIFEST.json` seals the delivered reviewer report, tools and evidence; `identity-r9-raw-data.json` inventories retained synthetic fixtures by hash and byte count.
- Continued the existing WIP files rather than replacing the review. Preserved their first logs. `review-r2` found an obsolete `Triples.asEffect` helper; `review-r3` passed the hot/overlap/feed cases but its outage stub failed runtime initialization. The helper now yields the service, and the outage stub permits initialization and fails answer requests. These were verifier setup errors, not product defects.
- `kill-r2` failed before a crash cycle because the built core export was absent. The prior WIP build attempt had rejected `pnpm --store-dir ... build`. `core-build-r2` ran the package's pinned local tsdown build directly and completed successfully; no install or dependency mutation was needed. `kill-r3` is the subsequent successful execution.
- `review-r5` retained the F1 failure plus a verifier precondition failure: 90,000-character payloads reached only 62,109,032 WAL bytes at LSN 25, below the intended 64 MiB trigger. `barrier-r6` increased only the test payload to 120,000 characters, observed the threshold, and passed. `temporal-r8` strengthens F1 by repeating exactly the same request after moving H past B; it still fails 30 versus 40.
- Early unprefixed hot/overlap/feed JSON files reflect the last pre-prefix execution (`review-r3`); gate logs for earlier attempts remain. Later evidence is attempt-prefixed to prevent overwrite. Raw first-failure fixtures and all new synthetic database directories remain under `lab/verify/SQL01/data/` (gitignored); their hashes and paths are inventoried, not copied into Git. No fixture cleanup or deletion was performed.

All heavy tests, builds and fingerprints ran through `lab/bin/heavy.mjs`, with host free disk above 5 GiB (about 18–20 GiB during execution). No agents were spawned, no exclusive engine slot was acquired, no engine lifecycle command was used, and no shared resident was stopped or recreated. Only qlever-dev at `http://127.0.0.1:7070` was contacted. No forbidden port, unrelated database, global cache, main-checkout edit, merge, push, deployment or package publication was used.

## Open work

1. Fix F1 and independently rerun its exact-request regression plus affected temporal routes.
2. Preserve a failing assertion-only fixture if the original 30/40 case recurs; its cause is still unknown.
3. Independently qualify true power-loss behavior; the process-kill test is narrower.
4. Measure P1 writer latency at the declared reader levels and fixed trace, including gate/checkpoint outcomes. No year-one scale, full root check, package packing, external consumer effect/checkpoint crash matrix, erasure, retention-policy or production qualification was done here.
