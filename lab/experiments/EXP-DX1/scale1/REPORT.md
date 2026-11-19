# DX-SCALE1 · deep accounts

One account of 100,000 people — awaiting a completed bare-metal reader arm.
Ten accounts of 100,000 people sharing one database — awaiting a completed bare-metal reader arm.
The owner's release target is under one second. Activation for one account is pending. Activation among ten is pending.
The first shared resource to reach its limit is still unknown.
Three changes to test are grouping queued saves, reducing per-save work at the serial commit point, and publishing a release with a constant number of writes. Their effects on the full account are unmeasured.
The 10,000-person fixture generates 1,604,464 current facts, or 160.45 per person. PostgreSQL grew by 593.30 bytes per fact and the volume including WAL grew by 1213.96 bytes per fact (one seed).

The zero-reader 10k arm acknowledged 56,505 primary commands. Commit p99 was 87.04 ms (90% interval 82.43–94.21 ms), above the 50 ms bar. Peak simultaneous client and engine memory was 22.94 GiB. The first reader attempt routed all 77,838 reads at L1, L4, L16, L64 through the gateway and failed replica coverage. [Matched client and gateway timing](evidence/arm-d19-i1-reader-a-diagnostic.md)

**Bench measurements**

| Item and arm | Scope | Commit p50 ms | Commit p99 ms | L256 read p99 ms | L256 feed p99 ms | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 zero | account 1 | 5.09 · 56505 [5.09, 5.12] | 69.12 · 56505 [65.28, 72.70] | — | 20.09 · 2895 [19.20, 20.35] | Observed · arm-d19-i1-zero-a |
| 1 reader | account 1 | — | — | — | — | Incomplete · arm-d19-i1-reader-a |
| 1 zero | account 1 | 5.12 · 56505 [5.09, 5.12] | 87.04 · 56505 [82.43, 94.21] | — | 19.45 · 2895 [18.82, 20.48] | Observed · arm-d19-i1-zero-b |

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

The tenant build passed 16 focused checks, 1,567 package tests and 18 additional Node tests. The package suites skipped 102 opt-in tests. All 116 seed digests and the logical offers and reader windows reproduced. On fresh local Datomic databases, 1,613,811 of 1,613,811 reads matched. O-REPLAY checked 110 reads across 3,402 entity queries. All 40 acknowledged writes reached their correct tenant feed. One gateway request read two accounts at position 22 and the pinned count was eight. The separate databases reached positions 8 and 14. A prior local attempt exposed a report-file lookup error, corrected before these trials. [Evidence manifest](SHA256SUMS)

**Audit of evidence and verdicts**

- `tenants.ts`, `tenant-proof.ts` and the NS driver bind fresh empty or verified restored scopes, per-account intent and population hashes, receipt IDs and positions to the pinned two-root and catalog queries. O-REPLAY checks both roots. O-DOMAIN checks the activated account at each published page cut.
- `tenant-feed.ts` and `tenant-metrics.ts` route effects and advance each tenant cursor in the same SQLite transaction as the physical checkpoint. They verify source, epoch, receipt positions and each account’s observed subjects. Each quiet-account ratio uses correct reads, receipt-clock commits and witnessed lag from the same phase and identity. Aggregate throughput counts actual primary acknowledgements.
- `seed-image.ts` verifies the sealed PostgreSQL bytes, original scope, source, seed identity and original command receipts after restoration. `seed-anatomy.ts` binds serial SQL counts and adoption timestamps to the assigned source and slot. Missing observations stay unjudged.
- The merged ACT1 collector checks the full native schedule and page coverage from this attempt, then compares the sealed seed hash, worker count, clone nonce, source and slot. The reader starts its live feed after every worker installs the same verified seed cut. The feed measures each witnessed source position immediately after its SQLite commit, including pages followed by an injected crash.

- `deep-profile.ts` checks a fresh empty scope, acknowledged seed contents and IDs, population counts and frozen hashes. A seed-only grant checks the same population with an independently pinned empty offer schedule. The coordinator binds each ready file and physical database to its nonce, source, slot and account. The six-worker startup fixture requires a full canonical replica-to-gateway comparison on its own cut.
- The NS driver keeps the receipt-clock, full-row, feed/replay, old-basis, split-read, history and O-REPLAY checks. Deep terminal samples come from actual public reads at the seed and latest cut. The interference and small-account plans bind each scope’s business commands to a new frozen schedule. Their windows fix the sentinel’s offers and reader counts. After timed small-account traffic drains, `tenant-checks.ts` submits a tagged correction per account, loses its ACK and verifies the duplicate and original receipt against the durable tenant cursor.
- `deep-activation.ts` checks the observed release, each page receipt and its changed bodies against the source cut, roster hashes and O-DOMAIN. `deep-commit-meter.ts` binds native transaction IDs, members, datoms and logical change rows to actual source replies. `measurements.ts` opens the new attempt’s receipt ledger, rehashes its bytes, validates its source, nonce and database, and recomputes the reported release and burst rates.
- `measurements.ts` checks source hashes, cohort exits, complete planned offers and receipt positions, then recomputes the oracle comparisons and pooled bars from this attempt’s samples. Missing or invalid accounts leave the pooled result unjudged.
- `bench.ts` reads database and volume allocation on the owned stack at the seed barrier, records the component limits and restores an empty exact-prefix inventory. `resources.ts` reads that stack’s cgroups and bound cache counters. `archive.ts` rehashes decoded raw files before removing their originals. `small-host.ts` binds each open, empty snapshot and post-restart full-row hash to its database and original cut. `scope-report.ts` reads verified transfer bytes and checks the roster and restart denominators.
- `source.ts` pins source and summary files. `control.ts` checks the fresh transfer, file hashes, nonce and cleanup. `catalog.ts` rechecks each report before indexing. `owner-report.ts` rehashes transferred summaries. `functional-note.ts` checks manifest hashes, clean sources, nonces, terminal oracle comparisons and original receipt counts before publishing local results. The launcher records each freshly fetched upstream head and its changed paths. A guarded arm accepts independent lazy-publisher changes confined to its separate directory. The detached queue checks each attempt, source, nonce, stage and terminal cleanup before advancing. A second failed item stops the queue.
- Two fresh local tenant layouts matched 2,025,863 reads and 4 post-window corrections. Six reader workers passed 13/13 full comparisons at L4 (2,283,849 replica reads, 16 fallbacks). In each of two native scopes, R1 changed 40/40 with 40 body facts and 1 guard fact and R2 changed 39/40 with 78 body facts and 2 guard facts. O-DOMAIN and the native receipts agreed. Datomic passed 408 tests with 52 skips. W0 passed 174. [Functional evidence](evidence/part4-functional.sha256)

All 43 acceptance files were checked for references to changed baseline sources. No acceptance pin changed. The frozen v3 offer digest remains unchanged. See [handoff](HANDOFF.md) for the queue and [resource layout](PROFILE.md) for sharing and measurement boundaries.
