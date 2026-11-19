# DX-SCALE1 · deep accounts

One account of 100,000 people — awaiting a completed bare-metal reader arm.
Ten accounts of 100,000 people sharing one database — awaiting a completed bare-metal reader arm.
Activation for one account is pending. Activation for one account among ten in one database is pending.
The first shared resource to reach its limit is still unknown.
Three changes to test are another sender core for offer delays, a larger transactor cache for repeated SQL reads, and smaller per-save work at the serial commit point. Their effects are unmeasured.
The 10,000-person fixture generates 1,604,464 current facts, or 160.45 per person. The first observed seed used 594.29 PostgreSQL bytes per fact and 1,214.95 allocated volume bytes per fact, including WAL (n=1 fresh stack).

**Bench measurements**

| Item and arm | Scope | Commit p50 ms | Commit p99 ms | L256 read p99 ms | L256 feed p99 ms | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 zero | 1 | — | — | — | — | Running on the dedicated bench |

**Shared resources**

| Reader arm | PostgreSQL | Transactor | Write gateway | Read gateway | Transactor cache hits / requests | Lowest free disk, GiB |
| --- | --- | --- | --- | --- | --- | ---: |
| Awaiting first reader arm | — | — | — | — | — | — |

Each engine cell gives peak cgroup memory and its highest CPU use sustained across three samples. One fully used core is 100%. Each transfer includes PostgreSQL page counters, gateway heap observations and per-scope driver measurements.

Cells give estimate · n [90% interval] where available. The regular arms target 5,910 seconds of offers. Each transferred summary retains every per-account bar, pooled sample distributions and the count of accounts meeting each obligation.

The dedicated server arrived with 93.4 GiB RAM, 12 physical cores and two 894.3 GiB NVMe devices. The baseline uses the root device, SMT enabled, the performance governor and six reader cores. The second device arrived unformatted. [Assumptions](PROFILE.md)

**Population and checks**

| People per account | Placements | Tasks | Subtasks | Field values | Current facts |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 10,000 | 18,000 | 57,000 | 313,500 | 758,100 | 1,604,464 |
| 100,000 | 180,000 | 570,000 | 3,135,000 | 7,581,000 | 16,045,255 |

Ten full accounts store 160,452,550 business facts and 2,003,920 tenant and roster facts. The first account has 56,505 primary offers and 1,633 resends over the regular arm. The eligible daily roster is 200 or 2,000 people depending on the rung. [Profile and assumptions](PROFILE.md)

Local Datomic functional checks drove two 40-person accounts through the zero-reader, reader and guarded activation arms. All 10,319,892 observed reads matched the model. O-REPLAY matched 262 sampled reads across 8,097 entity queries. The worker matched all 523 receipt reads. O-DOMAIN matched 160 stored decisions across 80 people and two releases, including two R2 decisions whose work items stayed unchanged. [Evidence manifest](SHA256SUMS)

The tenant build passed 16 focused checks, 1,567 package tests and 18 additional Node tests. The package suites skipped 102 opt-in tests. All 116 seed digests and the logical offers and reader windows reproduced. The eight-person cross-account and release tests used the in-memory store. A local Datomic run returned both accounts in one gateway request and exposed a report-file path error during finalization. [Evidence manifest](SHA256SUMS)

**Audit of evidence and verdicts**

- `tenants.ts`, `tenant-proof.ts` and the NS driver bind fresh empty or verified restored scopes, per-account intent and population hashes, receipt IDs and positions to the pinned two-root and catalog queries. O-REPLAY checks both roots. O-DOMAIN checks the activated account at each published page cut.
- `tenant-feed.ts` and `tenant-metrics.ts` route effects and advance each tenant cursor in the same SQLite transaction as the physical checkpoint. They verify source, epoch, receipt positions and each account’s observed subjects. Each quiet-account ratio uses correct reads, receipt-clock commits and witnessed lag from the same phase and identity. Aggregate throughput counts actual primary acknowledgements.
- `seed-image.ts` verifies the sealed PostgreSQL bytes, original scope, source, seed identity and original command receipts after restoration. `seed-anatomy.ts` binds serial SQL counts and adoption timestamps to the assigned source and slot. Missing observations stay unjudged.
- The merged ACT1 collector checks the full native schedule and page coverage from this attempt, then compares the sealed seed hash, worker count, clone nonce, source and slot. Its negative controls substitute a different snapshot and a different passing schedule.

- `deep-profile.ts` checks a fresh empty scope, consecutively acknowledged seed contents and IDs, the independent population count and the frozen seed and command hashes. The coordinator binds each ready file and physical database to its nonce, source, slot and account. Each scope stays live until every R2 completion marker agrees with that cohort.
- The NS driver keeps the receipt-clock, full-row, feed/replay, old-basis, split-read, history and O-REPLAY checks. Deep terminal samples come from actual public reads at the seed and latest cut. The interference and small-account plans bind each scope’s business commands to a new frozen schedule. Their windows set the sentinel’s offers and reader counts before measuring.
- `deep-activation.ts` binds each fresh release receipt to its cut, hashes each evaluated world/output, re-reads the same cut, and checks both release facts and the immutable roster, range, commit and receipt hash for each 256-person page. The independent decoder compares every person’s fenced state with O-DOMAIN at both cuts.
- `measurements.ts` checks source hashes, cohort exits, complete planned offers and receipt positions, then recomputes the oracle comparisons and pooled bars from this attempt’s samples. Missing or invalid accounts leave the pooled result unjudged.
- `bench.ts` reads database and volume allocation on the owned stack at the seed barrier, records the component limits and restores an empty exact-prefix inventory. `resources.ts` reads that stack’s cgroups and bound cache counters. `archive.ts` rehashes decoded raw files before removing their originals. `small-host.ts` binds each open, empty snapshot and post-restart full-row hash to its database and original cut. `scope-report.ts` reads verified transfer bytes and checks the roster and restart denominators.
- `source.ts` pins source and summary files. `control.ts` checks the fresh transfer, file hashes, nonce and cleanup. `catalog.ts` rechecks each report before indexing. `owner-report.ts` rehashes every transferred summary and binds source, scope and arm before rendering. The detached queue checks each attempt, source, nonce, stage and terminal cleanup before advancing. A second failed item stops the queue.
- The functional tests use new databases and real public receipts. They check replacement semantics, duplicate receipts, independent replay and publication. The first slot lacked the current write endpoint. A later terminal read timed out on a closed replica. The retry used the source-matched gateway and a live source read at each recorded position.

All 43 acceptance files were checked for references to changed baseline sources. No acceptance pin changed. The frozen v3 offer digest remains unchanged. See [handoff](HANDOFF.md) for the queue and [resource layout](PROFILE.md) for sharing and measurement boundaries.
