# EXP-SQL01 round-two independent QA: ACCEPT (default-off)

Reviewer **CX-VSQL01-2**, branch `verify/SQL01`. Target builder head **4863a8e0**, implementation **14f1e12a341ab1b54e89b8e891f953544a17ef1b**. The explicitly authorized merge is **934429aa**; its first parent preserves the round-one review at `f1cd8444`, and its second parent is the requested builder head. The three copied-test conflicts were resolved using the builder's additive round-two test versions. All new executions below ran in the verifier worktree. Product sources and dependency pins match the builder; no reviewer product fix was made.

**Verdict:** accept these fixes as a **default-off experimental candidate**, with no new blocking defect found in this review. This does not promote the broker, establish all P1–P3 production gates, or close the original unexplained assertion-only observation.

North star: P1 exact named snapshots during continuing writes, P2 atomic idempotent commits without a reader-dependent checkpoint wait on ACK, and P3 restartable ordered delivery. Scope and measurements come only from `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`. Main-checkout `CLAUDE.md`, scope, north star and protocol were reread before the merge; builder `REPORT-round2.md` and `MANIFEST-round2.json` were read. Inherited evidence and the original report remain historical.

## Findings and prior findings

| Finding | Severity / location | Independent outcome | Required action |
| --- | --- | --- | --- |
| Round-one F1: H1 discarded rows needed by a record-time cut | Previously HIGH; `packages/qlever/src/broker/BrokerStorageAdapter.ts:327` | **Fixed for the reviewed routing contract.** Record-time requests bypass H1 and execute the complete persisted source route. The original exact-request temporal regression now returns all 40 rows both before and after purge. Generated route comparisons below also pass. | Keep the bypass and regression. Timestamp-aware H1 requires a separate retention/eligibility design before optimization. |
| Round-one F2: checkpoint waited on a reader before append returned | Previously MEDIUM claim limitation; `packages/qlever/src/broker/sqlite-worker.ts:144` | **Fixed for completion dependency.** Append only signals the maintenance flag. The separate checkpointer uses nonwaiting SQLite lock acquisition at line 79; reader-drain waits occur on that maintenance thread at line 103. Both external-reader and actual-pool barriers pass. | Retain the causal barrier and checkpoint outcome diagnostics. Do not describe this as zero CPU, I/O or lock-contention overhead. |
| Builder's intermediate deferred-transaction lock-upgrade regression | `packages/qlever/src/broker/sqlite-worker.ts:141` | Final code reserves write intent with `.immediate()`. The copied deterministic lock probe passed independently: another nonwaiting writer can acquire before append, gets SQLITE_BUSY while append is paused after its marker, and maintenance succeeds after release. The overlapping replacement test also completes. | Keep this regression when changing checkpoint/transaction scheduling. |

**F3 — LOW, nonblocking evidence packaging:** `lab/experiments/EXP-SQL01/seal-round2.mjs:36` recursively includes the verifier's ignored `node_modules/.vite/vitest/.../results.json` cache in the builder manifest. Reproduction: rerun Vitest in the independent worktree, then compare every manifest entry; the regenerated cache differs. The first strict audit fails on that single entry and is retained in `evidence/qa2-audit-run.*` and `qa2-audit.json`. **Proposed fix:** exclude `node_modules` and runner caches from future authored-source/evidence manifests; retain a deliberate diagnostic cache separately only if useful. No builder manifest or sealer was edited. The final audit explicitly classifies that one mutable cache entry and still requires exact hashes for all 289 remaining entries; it records the cache's builder-origin identity separately. This does not indicate a product source mismatch.

There is no new reproducible defect requiring a product fix. The original assertion-only 30/40 case remains an unresolved historical correctness observation, discussed below.

## Generated route equivalence

New independent test: [`routes-round2.test.ts`](routes-round2.test.ts). Reproduce with a fresh attempt name:

```sh
node lab/verify/SQL01/gate-round2.mjs <new-attempt> node node_modules/vitest/vitest.mjs run --config lab/verify/SQL01/vitest.config.ts routes-round2.test.ts checkpoint-round2.test.ts
```

The generator executes **12 deterministic seeded histories**, each containing 24 real broker commits: **288 acknowledged commits** total. Coverage by command kind is 57 assertion commands, 59 retraction commands, 52 same-transaction retract/assert replacements, 51 valid-time correction commands and 69 cardinality-many commands. Cardinality-many assertions share an attribute and can share values while keeping distinct assertion identities. Histories contain multiple subjects, valid-time intervals and boundaries, future-effective assertions, retroactive corrections, and equal record timestamps at distinct commit positions.

An independent model is built from the submitted events and the returned commit positions. It never reads `recent_rows`, H1 or product visibility helpers to produce expected answers. Comparisons use **canonical complete rows**, not only row counts or IDs. This exercises the broker's row/position contract; the inherited regression suite separately exercises the public Triples transaction path.

Each history supplies **539 requests** across eight shapes: omitted low-level basis (latest recorded state), valid time, position, record time, record time plus position, valid time plus position, valid time plus record time, and all three cuts. Position and record-time cuts include before-first, exact boundaries, intermediate and final points; valid-time samples include interval starts and exclusive ends. For a shape with no explicit business-time cut, the resolved current valid time is fixed at 500. The low-level omitted-basis case is also tested separately; public runtimes ordinarily resolve omitted valid time before reaching the adapter.

Each request uses two selections: a multi-entity pull including a missing subject, and an entity/attribute cardinality-many query. Every selection is run before purge, after advancing the real H1 horizon to head, and after closing/reopening the broker. For each case:

1. The candidate runs the actual outage routing decision, which may serve H1 or naturally use source.
2. A second arm forces only H1 eligibility refusal, then executes the **real complete-source fallback** for the identical request. This is test-only method instrumentation; it does not substitute expected rows or edit product files.
3. Both answers must equal one another **and** the independent event-derived expected rows.

**Result: 38,808 exact route pairs, 77,616 answer/oracle comparisons, zero mismatches.** The candidate served 2,904 answers through H1 and 35,904 through natural source routing; the forced-source arm supplied another 38,808 answers. Requests with `recordedAt` made zero H1 pull calls. Ineligible historical cuts after purge correctly used complete source. Each of the three phases contributes 25,872 comparisons.

Evidence:

- [`evidence/qa2-generated.json`](evidence/qa2-generated.json): successful source-bound execution receipt.
- [`evidence/qa2-generated-routes-generated.json`](evidence/qa2-generated-routes-generated.json): seeds, submitted/finalized event traces, complete basis matrix, model state, denominators and mismatch list.
- [`evidence/qa2-generated-routes-generated-observations.json.gz`](evidence/qa2-generated-routes-generated-observations.json.gz): all 77,616 per-answer route decisions, eligibility/source call counts, full-row answer digests and oracle digests. The summary binds its SHA-256. `gunzip -c` reads the JSON array.

These are bounded generated histories, not exhaustive interleavings or world/schema conformance. Every operation above was valid for the broker row contract; deliberately invalid writes, erasure and concurrent retention-policy changes are outside this generator.

## Pinned readers and acknowledgement latency

The copied large-WAL barrier schedule passed again: [`evidence/qa2-baseline-barrier.json`](evidence/qa2-baseline-barrier.json). It holds the product reader algorithm after the actual snapshot-pinning marker SELECT on a separate readonly connection, then replaces all 40 hot rows and makes 26 large commits. WAL is **83,289,952 bytes** at LSN 25. Every commit finishes while the reader remains pinned. The held read returns the original 40 exact rows, the latest read returns the 40 replacement rows, and a named old-basis read remains exact.

LSN 25 took **19.95 ms** in this run, compared with the earlier implementation's 163.67 ms in the round-one diagnostic. These are unmatched shared-host observations, **not a speedup estimate or a latency acceptance test**. The stronger evidence is checkpoint outcome and completion ordering: while the reader was pinned, maintenance reported incomplete copying in **3.01 ms** and **0.03 ms**, with `busy=0`, and did not run a waiting RESTART. After release, a complete RESTART took **99.07 ms on the maintenance connection**. Those released-checkpoint 99 ms are not a commit ACK latency.

New independent causal test: [`checkpoint-round2.test.ts`](checkpoint-round2.test.ts). It inserts barriers into the actual product reader and checkpointer worker strings when the broker creates them, preserves the unchanged writer worker, and verifies all workers received the same actual shared gate buffer. Original/instrumented worker hashes are retained.

1. Pause an actual application-pool reader immediately after its marker query; the real gate's active-reader count is one.
2. Pause the actual maintenance worker immediately after it closes the same gate, before it can drain the reader or acquire SQLite maintenance locks.
3. Submit a ten-row commit through the real HostBroker. Its ACK completes in **9.41 ms while neither barrier is released**.
4. Release only maintenance. It reports `readers-busy` and reopens the gate. Eight further ten-row commits ACK while the reader remains paused (3.12–6.31 ms in this diagnostic).
5. Release the reader: its snapshot still has the original ten rows, latest has all 100 rows, and maintenance completes.

Evidence: [`evidence/qa2-generated-pool-barrier.json`](evidence/qa2-generated-pool-barrier.json). The maintenance event includes the deliberately inserted pause, so its duration is not a production maintenance measurement.

**Conclusion:** no commit in these schedules waited for the pinned reader to release or for maintenance completion. The actual-pool test proves that ACK has no completion dependency on those held barriers. Checkpoint CPU, sync I/O and brief lock acquisition can still influence writer latency; no calibrated zero/64/256/1024-reader TARGETS comparison or indefinitely stuck-reader WAL bound is claimed. A 64 MiB threshold is a maintenance trigger, not a hard cap while snapshots remain pinned.

## Original assertion-only 30/40 observation

**F1 does not establish its cause.** The deterministic F1 reproducer requires a later retraction and a record-time cut that still sees the earlier assertions. The builder's original case had eight successful five-fact assertion transactions followed by a position-based read, with no intervening retraction or record-time cut. Its fixture was deleted by the original package cleanup, so there is no original row-level state to inspect.

The fresh copied hot-subject test passed **150/150 schedules**, each preceded by 32 distinct-subject writes and containing eight concurrent five-fact writes to the hot subject. All 40 exact IDs were present at the requested position. [`evidence/qa2-baseline-hot-schedules.json`](evidence/qa2-baseline-hot-schedules.json) retains requested bases, positions and instants. Earlier successful repetitions in the builder and round-one reports remain historical, not additional executions in this round.

The original observation therefore remains **unexplained and unreproduced**, not fixed or retrospectively explained by F1. Preserve the first failing fixture if it recurs. Default-off acceptance here concerns the reviewed fixes and bounded fresh evidence; it does not establish absence of every snapshot defect.

## Fresh regression and durability results

| Execution | Result |
| --- | --- |
| `qa2-baseline`: copied reviewer regressions and builder additions | **9/9 passed**, including the exact temporal regression, 111 hand-authored route/cut comparisons, 150 hot schedules, the separate-reader checkpoint barrier and the write-intent lock probe. |
| Hot replacement/retention overlap within baseline | **251 versions, 19,930 pinned pulls**, zero row/basis violations; writers completed 250 replacements while 32 logical readers ran. |
| Live qlever-dev case within baseline | Epoch-only prefix catch-up with one-command apply batches and 80 fixed-basis reads passes on the shared endpoint. No engine lifecycle action. |
| `qa2-generated` | **2/2 passed**: 38,808 route pairs plus the actual-pool/maintenance causal barrier. |
| `qa2-kill50` | **50 real full-process stops, 161 observed ACKs, zero lost acknowledged commits/claims/receipts/exact ten-row groups**; all recovered operations are retried against their original receipts. |
| Feed across fresh crash cycles | **191 resumed positions**, strictly increasing, no duplicates or missing acknowledged positions; equals the successor's 191 recovered operations. Unacknowledged-but-recovered commits are legal. |
| Feed clean-restart regression within baseline | **45/45 expected positions** across ten opens, with no gaps/repeats. |

All **11 test cases** passed across the two Vitest executions. The separate crash harness also passed. Receipts and raw cycles are under [`evidence/qa2-kill50.json`](evidence/qa2-kill50.json) and [`evidence/qa2-kill50-results.json`](evidence/qa2-kill50-results.json). First failures from prior rounds are retained unchanged. No semantic test failed in this review; the initial identity audit's cache mismatch and the subsequent explicit classification are retained as F3. High-fanout overlap still emits the previously documented MaxListenersExceededWarning; these tests do not qualify long-duration listener/resource behavior.

SIGKILL leaves host/device caches alive. **No physical power-loss or VFS durability-fault test was performed**; successful process-stop tests do not prove that stronger claim. This round also did not rerun WAL corruption, full root checks, packaging, complete public world/schema acceptance, consumer-effect/checkpoint crash matrices, year-one scale, erasure, or production P1/P2/P3 performance gates.

## Identity, retention and operations

[`evidence/qa2-audit-final-summary.json`](evidence/qa2-audit-final-summary.json) and [`evidence/qa2-audit-final-builder-manifest-check.json`](evidence/qa2-audit-final-builder-manifest-check.json) record all 290 builder-manifest entries: **289 exact non-cache matches plus the explicitly classified mutable cache entry in F3**. They also record unchanged product source against `4863a8e0`, native driver/build identity, receipt/log identities, every archived route comparison, feed ordering and recovered-operation denominators. [`evidence/qa2-audit-final-raw-data.json`](evidence/qa2-audit-final-raw-data.json) inventories retained local synthetic fixtures by SHA-256 and byte count; raw databases remain gitignored in `lab/verify/SQL01/data/`. The initial stricter audit outputs remain alongside these files unchanged.

Gate receipts bind execution head **934429aa**, actual working-source hashes, commands, times, log hashes and before/after input equality. New test files are bound in their own execution receipt; the earlier baseline receipt covers the unchanged baseline files that actually ran. The final delivery is sealed separately by `MANIFEST-review-round2.json`. Round-one `VERIFY.md` and `MANIFEST.json`, builder manifests, and prior raw evidence remain immutable historical records.

Heavy tests and fingerprints used `lab/bin/heavy.mjs` with reviewer labels, and host free disk remained above 5 GiB. Only the shared qlever-dev at `http://127.0.0.1:7070` was contacted for live checks; its test used a unique graph and dropped only that graph. No agent delegation, exclusive engine slot, engine lifecycle change, main-checkout edit, default Docker access, forbidden port, dependency install, global package setting, raw-fixture cleanup, merge to main, push, deployment or publication occurred. The only merge was the explicitly requested builder-to-verifier merge.

Open questions: the original assertion-only observation; physical power-loss qualification; calibrated P1 writer/read latency and WAL growth/retention policy under long-lived readers. No new blocking product finding was reproduced in round two.
