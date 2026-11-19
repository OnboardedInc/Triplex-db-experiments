# DX-SCALE1 · deep accounts

One account of 100,000 people — awaiting a completed bare-metal reader arm.
Ten accounts of 100,000 people — awaiting a completed bare-metal reader arm.
Activation for one account is pending. Activation for ten accounts is pending.
The first exhausted shared resource has not been established.
Three experiments could distinguish the limits. Give senders another physical core if offer delays dominate, enlarge the transactor object cache if storage misses dominate, and distribute databases across transactors if their JVM saturates.
The 10,000-person fixture generates 1,604,464 current facts, or 160.45 per person. Bytes per fact on the bench await the first completed seed measurement.

**Bench measurements**

| Item and arm | Scope | Commit p50 ms | Commit p99 ms | L256 read p99 ms | L256 feed p99 ms | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1–4 | 1 or 10 | — | — | — | — | Awaiting bench release and public source |

Cells give estimate · n [90% interval] where available. The regular arms target 5,910 seconds of offers. Each transferred summary retains every per-account bar, pooled sample distributions and the count of accounts meeting each obligation.

**Population and checks**

| People per account | Placements | Tasks | Subtasks | Field values | Current facts |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 10,000 | 18,000 | 57,000 | 313,500 | 758,100 | 1,604,464 |
| 100,000 | 180,000 | 570,000 | 3,135,000 | 7,581,000 | 16,045,255 |

Ten full accounts target 160,452,550 current facts. The first account has 56,505 primary offers and 1,633 resends over the regular arm. The eligible daily roster is 200 or 2,000 people depending on the rung. [Profile and assumptions](PROFILE.md)

The functional Datomic trial used two four-person databases at once. Each accepted 70 primary commands. O-REPLAY checked 16 historical/current reads and 508 entity queries across both. O-DOMAIN checked eight R2 outputs and durable outbox states. The original slot image lacked the current write endpoint. The successful retry used the existing source-matched image. [Evidence manifest](SHA256SUMS)

**Audit of evidence and verdicts**

- `deep-profile.ts` checks a fresh empty scope, consecutively acknowledged seed contents and IDs, the independent population count and the frozen seed and command hashes. The coordinator binds each ready file to its nonce, source, slot and account.
- The NS driver keeps the receipt-clock, full-row, feed/replay, old-basis, split-read, history and O-REPLAY checks. Deep terminal samples come from actual public reads at the seed and latest cut. The regular trace and phase plan have distinct identity fields.
- `deep-activation.ts` binds each fresh release receipt to its cut, hashes each evaluated world/output, re-reads the same cut, and checks both releases plus the durable R2 outbox against O-DOMAIN for every person.
- `measurements.ts` checks source-file hashes, fork exits, complete planned offers, exact receipt times and positions, and recomputes the sampled oracle comparisons from retained bytes. Missing or invalid accounts leave the pooled result unjudged.
- `bench.ts` reads database and volume allocation on the owned stack at the seed barrier, records the component limits and restores an empty exact-prefix inventory. `control.ts` checks archive size, hash, nonce and source before indexing a transfer.
- The functional tests use new databases and real public receipts. They check replacement semantics, duplicate receipts, independent replay and publication. The renderer fix preserves fresh output destinations for derived evidence.

The benchmark code has no authority to promote an acceptance contract. See [handoff](HANDOFF.md) for the queue and [resource layout](PROFILE.md) for sharing and measurement boundaries.
