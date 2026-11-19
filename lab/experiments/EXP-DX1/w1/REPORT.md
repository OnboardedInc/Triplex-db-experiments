The fixed sender brought p99 to 41.70 ms, 8.30 ms below the target on one 10,000-subject account with zero readers.
Three of ten bursts still exceeded 50 ms at p99. The last reached 229.67 ms.
Of 38,826 saves, 629 took over 30 ms. Waiting for Datomic was the largest part of 421.
The save at p99 waited 39.81 ms for Datomic. Datomic reported 3.24 ms calculating that transaction, including 0.20 ms of SQL reads.
Seventy-two slow saves waited for an earlier save on the same subject. One save delayed seven followers by a combined 836 ms.
Two changes worth testing are moving trace encoding off the sender’s thread and checking a save’s new IDs together.
The ID check now takes one history lookup when the range is empty. It passed the local conflict and stored-data checks.
Its effect at 100,000 thin and 100,000 deep subjects is still open. One command below runs both comparisons.

**North star.** P2 commit latency and P7 cost as accounts grow. Baseline semantics and targets follow `origin/main` on 19 November. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

**Bare-metal tail.** Old/fixed/old p99 was 140.543 / 41.705 / 141.612 ms. The fixed arm's 90% i.i.d. interval was 39.707–43.711 ms, leaving 6.289 ms at its upper end. Bursts are correlated and there was one fixed arm. Overall, 276 saves exceeded 50 ms, with room for 112 more at this denominator.

| Above 30 ms | Peer wait | Late offer | Socket/callback | Sender | Subject wait | Gateway | Dispatch / unknown / slot |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Exclusive seconds | 22.168 | 10.405 | 5.230 | 4.401 | 4.198 | 1.529 | 0.028 / 0.014 / 0 |
| Largest interval, saves | 421 | 74 | 34 | 20 | 43 | 37 | 0 / 0 / 0 |

Native `tx-with` reported 5.841 s over 629/629 saves, including 0.542 s for 1,165 logical SQL reads on 281 saves. Removing just that read time would move six saves below 50 ms. Sender GC overlapped 3.665 s of late offers. The recording does not identify the allocations that triggered it. Just 33.70 ms of subject waiting fell after the preceding ACK.
One peer wait overlapped an index adoption for 6.32 ms. Eleven started within two seconds after one of 72 process-wide adoptions. The recording could not identify individual native apply times, PostgreSQL statement/WAL waits or gateway JVM pauses. Overlaps can count one pause across multiple saves.

**Range check.** `TRIPLEX_DATOMIC_FAST_PATHS=history-range` lets a lean TypeScript client suggest bounds for distinct, 26-character uppercase alphanumeric IDs. At serialized db-before, Datomic verifies the actual assertions and both endpoints. It seeks historical AVET from the smallest full prefix to the ASCII successor of the largest. Occupied or unsupported groups use the original checks in order. No stored format or acceptance pin changed.

**Permanent unique ID, design only.** Mint a fresh native entity with a never-retracted cardinality-one `:db.unique/value` string per row, in the same transaction. A subject entity could accept a repeated value as redundant. Keep in-save duplicates invalid and map this attribute's conflict to the existing identity error.
Dual-write during migration. Backfill all historical IDs at a named cut, including imports and born-retired rows. Reconcile through a catch-up cut before removing the history check. Restore must preserve reservations. Protected or unindexable imported IDs need an exact fallback.
At 26 bytes per distinct ID the literals alone cost 416 MB per 16M IDs, 4.16 GB across ten deep accounts, before journal IDs or history. Each mint adds a datom, log and EAVT/AEVT/AVET entries. At 500–750M distinct mints/year, literals add 13–19.5 GB/year. Physical bytes, migration workspace and latency need measurement. Keep the existing row-text index for point reads.

**Bench handoff.** With `BENCH_SERVER` set on the clean published W1 branch, run `node --experimental-strip-types lab/experiments/EXP-DX1/w1/control.ts w1trial01`. Use a fresh batch name for a new attempt. [Controller](control.ts)
Each population gets newly seeded individual/zero, range/zero, range/loaded and individual/loaded arms. Loaded arms use their matching zero baseline. Thin uses BM1’s first 900 seconds. Deep uses the pinned SCALE1 account and its 5,910-second schedule. `DX-W1/BATCH/comparison.json` gives paired reads/commit, native apply and scheduled-offer-to-ACK p50/p99, denominators and range decisions. Each population/load/mode has one arm.
The saved 100k thin baseline reproduced 7,047 reads across 7,408 commits (2,486 nonzero), native apply 1.09/13.90 ms and ACK 6.31/76.07 ms at p50/p99. The new matrix has not run on a bench.

**Evidence and PASS audit**

- `tail.ts` verifies consumed bytes against all three arm seals, compares identical frozen cohorts, checks source/slot/boot/command/ACK/parent joins, and reconciles each partition within 0.01 ms. `DX-W1/tail-03/{chains.jsonl,summary.json}` contains all 629 slow primaries and their predecessors, the ranked commit, bursts and top ten chains.
- Native tests compared independent row bytes, typed errors, seek counts and JFR decisions on fresh scopes. Retire/reassert, imported and born-retired IDs, bounds, duplicates and two racing writers all agreed. The public TS wire fixture also passed the gateway parser, durable save, readback and reuse rejection. `DX-W1/local-05` binds the tested gateway inputs to image sha256:70d03f098fa31128a0da394f786b8829da141c652fc7b89b67b6593ce231e2e8. It passed 27 tests/54,074 assertions. Six TS suites passed 27 tests. Both first fixture failures are retained.
- `bench.ts` checks source, staged gateway bytes, images, placement, durability, seed identity, exit and cleanup. `measure.ts` checks expected offers, receipts, feed and applicable oracle bytes, then joins one source/slot/clock-bound gateway parent and native database/t per primary. Missing counters stop comparison. `control.ts` checks the published ref, machine, batch and transferred hash. Three runner tests checked scheduling and invalid inputs.
- `saved-scale.ts` verified the historical source and slot manifests and reran those native counter joins on all 7,408 thin commits. Local runs establish functional behavior only. [Input and output hashes](SHA256SUMS)
