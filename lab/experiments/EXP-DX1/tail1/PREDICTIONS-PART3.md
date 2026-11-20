# What would explain the deep backlog?

North star P2. Measure scheduled offer to durable ACK and name the source of time spent waiting at 39.4 saves/s. These predictions precede a DX-TAIL1 part 3 physical run. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## What the archived run already says

Thin and deep both offered the same five-field replacements with zero readers. After two seconds, each population has 3,388 joined saves. All four transactors used a 1,280 MiB object cache and a 128/512 MiB memory-index threshold/maximum.

| Observed per save | Thin mean / p50 / p99 | Deep mean / p50 / p99 |
| --- | ---: | ---: |
| ACK, ms | 4.68 / 3.70 / 18.97 | 18.21 / 10.76 / 177.38 |
| Native tx-with, ms | 1.43 / 0.75 / 6.55 | 9.69 / 8.03 / 31.97 |
| Native SQL segment reads | 0.55 / 0 / 3 | 12.61 / 11 / 37 |
| Time the native API reports for those reads, ms | 0.14 / 0 / 2.80 | 2.32 / 1.63 / 10.20 |
| Native tx-with minus reported SQL, ms | 1.29 / 0.75 / 5.69 | 7.37 / 6.28 / 21.90 |

The native SQL count observes the storage API, including reads served by PostgreSQL buffers. Deep spent an additional 8.26 ms in mean tx-with time. Reported SQL accounts for 2.18 ms of that increment. Traversal, deserialization, pauses and other apply work can account for the remainder. One deep save's 151 ms of own SQL shows a possible trigger. Across the other deep tail saves the queue remains a reading of overlapping earlier replies, not a measured enqueue interval. The 25.38 ms interarrival interval leaves room at the mean for isolated service and permits a queue after an occasional long service. The two deep callback buckets that overlapped nearly all the scored window report mean transaction durations of 23.1 and 25.0 ms, and mean apply of 13.8 and 13.9 ms. These minute totals include neighboring work and transaction durations that include queue time. No matching thin bucket or per-event transactor storage log survived the archive. [Original analysis](OVERNIGHT.md) · [Hash for archived reanalysis](SHA256SUMS)

## Predictions and disconfirming results

- **Service.** At the same placement and storage policy, before queue time, predict thin typical native service of 2–5 ms and deep 8–15 ms for five-field replacements. For tx-with alone, expect medians of 0.5–2 ms thin and 6–11 ms deep. Durable log batching can move both. The native `:tx/process` duration includes queue time and tests a different prediction. If unmatched native processing time remains short through the deep ACK spikes, the backlog is outside that native interval.
- **Read count and cache.** At the BM1 1,280 MiB setting, predict 0–1 mean SQL segment reads thin and 9–16 deep. For the JVM1 extension, the 256 MiB cache should yield at least 30% more reads per save than the selected 2–2.5 GiB cache if evictions drive the tail. Expect a 1–4 ms deep tx-with median improvement with the larger cache and fewer cohorts of prior native replies outstanding. If hit rate and SQL counts improve materially while apply time, residual and the tail persist, storage reads explain only part of the gap. If both caches have similar actual hit rate and read count, the intervention has insufficient separation.
- **Memory index.** JVM1 already varies its 32 versus 128 MiB threshold at the same 512 MiB cap. Predict earlier, more frequent index jobs and smaller peaks at 32 MiB. The 128 MiB threshold should leave pre-adoption steady read demand similar, within 15%, with larger or less frequent adoption episodes. If the larger threshold lowers steady SQL counts without changing object-cache misses, test in-memory residency before attributing that result to the cache. Raising `memory-index-max` alone only changes the behavior of windows approaching the cap. The extension holds both index settings constant. [Datomic capacity planning](https://docs.datomic.com/operation/capacity.html)
- **Pauses and apply.** If independent transactor GC/safepoints repeatedly cover the stalls and explain their time while SQL count and duration remain flat, that favors the pause mechanism. If residual stalls persist at high cache hits, away from pauses and SQL duration bursts, but align with a long native apply or the measured Triplex transaction function, that favors serial work. PostgreSQL WAL samples and individual statement timestamps can locate storage pressure during the window. Keep a per-save interval unresolved if it lacks a causal identifier.

## Two extra JVM1 windows

After JVM1's restore launcher and policy are integrated, give the command its existing sealed ten-account seed and selected policy arm. It uses the same one-database workload and one `solo394` window for each of two new cache settings. It leaves JVM1's four-arm data intact and reuses the threshold comparison already run there. It spends up to 17 minutes on each restored stack, including the 60-second offer window, and leaves the remainder of 40 minutes for cleanup. Physical runtime is unmeasured.

```sh
env DOCKER_HOST=unix:///var/run/docker.sock node lab/bin/heavy.mjs --label DX-TAIL1-backlog -- \
  node --import tsx lab/experiments/EXP-DX1/tail1/backlog-server.ts run \
  "$DX_TAIL1_OUTPUT" "$DX_JVM1_SEED" "${DX_TAIL1_JVM_ARM:-j21-g1-writer2}"
```

Each cache arm restores and rechecks the same sealed seed, retains ACK and readback, and records all three JVMs plus PostgreSQL duration and WAL samples. The comparison requires all 2,364 offered saves per arm and matching schedule hashes and native joins. Compare matched native read counts, apply, prior outstanding replies, and pause overlap before extrapolating the single-cache result to the archived thin/deep pair. The command also accepts JVM1's other named policies and their pinned Java images. [JVM1 command and setup](https://github.com/OnboardedInc/Triplex-db-experiments/blob/b3047cd41eda6008f6af8eb18fc97d2e116915e6/lab/experiments/EXP-DX1/jvm1/SERVER.md)

The archive analyzer checks the original manifest, archive hash and per-arm source, slot, schedule, readback and transaction identity before counting. A second reconstruction produced identical bytes. The physical runner requires fresh arm directories and binds the restored seed bytes, roster, exact command schedule, acknowledged slots, native transactions and recorder seals to the running source. It publishes observations with unresolved intervals and leaves the causal comparison open until both physical arms run.
