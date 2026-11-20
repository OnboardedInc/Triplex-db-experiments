# DX-TAIL1 part 3
The candidate is `b6b8859f34`, based on the integration branch at `fa0e3c6fc`.
The scorecard launcher keeps all accounts in one Datomic database and enables recording for all three Java processes.
The writer defaults to two cores with G1. The reader and transactor specify their heaps and G1.
Receipt reuse stays optional. All 16 native receipt tests, erasure and the five-cut replay passed.
Deep saves averaged 12.61 SQL segment reads, compared with 0.55 for thin saves on the server.
SQL accounts for 2.18 ms of the 8.26 ms increase in mean transaction evaluation. The other tail causes are still open.
The bare-metal checks remain open. The cache test needs JVM1's restore launcher, images and sealed seed. [Forecasts and command](PREDICTIONS-PART3.md)

Scope covers P2, scheduled offer to durable ACK, and P6, a quiet account's p99 beside busy accounts relative to alone. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) · [Version 0.1](https://github.com/OnboardedInc/Triplex-db-experiments/blob/fcfa01b9a4e0b01ab3659f693cff1321692cc529/lab/V0.1.md)

## Tracing and verification

On the Mac, the merged recorder at `8d45ae5943` joined all 192 SDK saves by native t and confirmed 960 assertion IDs. It sealed all three JVM recordings, mapped 2,209 PostgreSQL durations and kept 14 with wall time only. WAL samples spanned 452 syncs in one statistics epoch. The stack shut down and released its reservation.

Both integrated Mac gates used ordinary heavy tokens, and their times are diagnostic. A quiet bare-metal comparison is still needed to check the 2% save p50 cost bar. The pre-run estimate is 0.5–4% for the small fixture. The four-arm cost command and the companion cache test remain unrun.

The gateway measures receive, submit and response. SDK ACK and native database hash/t join the exact save to Datomic's transaction, apply and I/O statistics. Each JVM records pauses and safepoints, wall and uptime clocks, effective collector, heap, processors and CPU throttling. PostgreSQL durations and WAL counter deltas use the guest clock where anchors qualify them. Per-save enqueue, WAL sync and closed-engine handoffs remain unresolved. [Intervals and audit](RECORDING.md)

## What the archive supports

The 6,776 post-start writes are joined by input, trace ID and native t. The ACK p99 was 177.38 ms deep and 18.97 ms thin. Mean native evaluation was 1.43 ms thin and 9.69 ms deep. Outside reported SQL it was 1.29 ms thin and 7.37 ms deep. Forty-nine of the fifty slowest deep saves spent most of their time awaiting a Datomic reply. One other save spent 151 ms on SQL reads. No per-event native storage logs or pause clocks survived that run. [Original rankings](OVERNIGHT.md) · [Archived reanalysis](SHA256SUMS)

The two new server windows vary only the transactor object cache. JVM1 supplies the threshold and collector comparisons. The new command budgets 40 minutes including cleanup. No physical command ran in this worktree. [Predictions and falsifiers](PREDICTIONS-PART3.md)

## Integration and gates

Core, Datomic and W0 built. On the integrated code, 39 Node cases and three Vitest retention cases passed. The native suite at `d7a6e0083` passed all 16 cases, the erasure route and all five O-REPLAY cuts. The standard root formatter still overflows on the inherited 2,000-level W0 array fixture. The full JavaScript check reports inherited ACTV and trace-test errors, uncovered files and missing XTDB/QLever build outputs. The first test attempt used stale packages and the first retention run used the wrong runner. Both were rerun with their correct prerequisites.

The campaign binds current JVM flags, role and boot IDs, recorder seals and output bytes to the same source, slot and attempt. The cache replay verifies its exact restored dump, schedule, native ACKs and readback. Receipt reuse still validates the live predecessors in Datomic and falls back on conflicts. [Content, freshness and binding audit](RECORDING.md) · [Cache replay audit](PREDICTIONS-PART3.md)

## Evidence and fingerprints

Raw evidence in `evidence/DX-TAIL1` is indexed by SHA-256. The integration base supplies the acceptance contract bytes. [Manifest](SHA256SUMS) · [Previously measured collectors](MAC.md) · [Prior physical predictions](PREDICTIONS.md)

Native fingerprint changes relative to the integration base, old SHA-256 followed by new.
- `packages/datomic/gateway/src/triplex/gateway/jfr.clj` `a703ed7772ab7fcdd62effde8135bc62f6b4325046a0f893a1165c8c08474d94` → `bf715c11eb92aeb755f6bc16a4b65fbda1c1664c2d3144c37739aca80f76a606`
- `packages/datomic/gateway/src/triplex/gateway/lean.clj` `b44bd37b4140c3c750b35f562be2947ef1c8532567cf2e52c1e64e33937c074f` → `2cc36d6ffbd13eaed5100b3d245beed98cbc7b324f0ff0e5c0a8860ed5380ed6`
- `packages/datomic/gateway/src/triplex/gateway/storage.clj` `a0acbd386371896ae069b8ec7d2f2b9b20344ab2acb3a01dabe239410a23709a` → `3b40fd2447e06489fb4ddade382826ebe1d3f447853ac5cb1dd57d6e12e0381e`
- `packages/datomic/gateway/src/triplex/gateway/trace.clj` `e25df1a17a622f53122c98f1512bf57b99ced7d4d5b433d1c66453a7aceb3a7e` → `b5fdae904ee60f5b5f3a45ee9d65208ca36f3b825db7675dcf1998af75c5e3f1`
- `packages/datomic/gateway/trace.jfc` `d8708de41c683ceca27a11a115d637622c129c93ba8340678c2b450ae2c340cb` → `0d192b3498b827b1730ccf22660ad63e4900c98e6cf0cf2e2e2429edd4756405`
