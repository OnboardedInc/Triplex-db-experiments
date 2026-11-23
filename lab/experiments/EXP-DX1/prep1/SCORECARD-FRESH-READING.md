# Why the fresh full-size scorecard missed the peak

One database already carried all 394 saves/s on the small seed. At 162.5 million facts, the fresh scorecard carried 342.90/s inside the 394/s window and acknowledged 4,599 more after it ended.
The sender releases six slots together. At 394/s they need to turn over every 15.23 ms. The headline took 16.88 ms on average and the default took 18.68 ms.
At 235/s, waiting for older turns accounts for 97% of the headline saves’ time beyond 50 ms. The worst stretch was concentrated in the first 30 seconds of the window.
The quiet account still gets stuck behind whole turns, especially when two of its offers arrive close together. Its headline solo p99 stayed below 23 ms.
The archive records JVM pauses and native apply and append spans. It has no checkpoint events, WAL timing samples, process CPU counters or index-job spans.
Keep the ordered writer, separate WAL and ZGC. Test two PostgreSQL cores and a 4 GB WAL target on fresh before promoting the settings to the 1B card. The measured limit points to rolling credits for next week's writer change.

## 1. Slow-save cause ledger

H is the ordered writer with Java 25 ZGC on the transactor and WAL on the second NVMe. D is the ordered writer with Java 21 G1 and data-device WAL. Both ran one gateway, six fair-turn credits and the same 90-second offer tape in one database. The source was `92f8e6c30` (the PID census change over workload `3a71c1767`), with INT1 launch `57580241d`. All writes at 50 and 235 were durable. The ledger counts each receipt with scheduled-offer-to-ACK latency greater than 50 ms, then partitions only its time after the 50 ms mark. Shares are percentages of **summed excess save time**. Multiple saves may wait during the same wall-clock interval.

| Arm, rate and window | Slow saves / ACKs | Excess save-seconds | Older fair turns | Sender, socket and pre-handler¹ | Prepare² | Native submission | Transactor queue | Apply | Ready → append | Durable append call | Reply³ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| H 50 alone | 0 / 315 | 0 | — | — | — | — | — | — | — | — | — |
| H 50 loaded | 163 / 4,500 | 7.777 | 39.6% | 2.6% | 6.5% | 1.6% | 26.6% | 18.3% | 0.4% | 1.5% | 2.9% |
| H 235 alone | 0 / 315 | 0 | — | — | — | — | — | — | — | — | — |
| H 235 loaded | 10,312 / 21,150 | 7,371.382 | 97.3% | 0.8% | 0.35% | 0.09% | 0.83% | 0.39% | 0.02% | 0.08% | 0.10% |
| D 50 alone | 1 / 315 | 0.0014 | 0% | 0% | 0% | 0% | 0% | 0% | 2.6% | 34.0% | 63.5% |
| D 50 loaded | 300 / 4,500 | 22.341 | 51.4% | 2.5% | 5.7% | 0.7% | 13.0% | 9.4% | 5.7% | 9.6% | 2.2% |
| D 235 alone | 2 / 315 | 0.0737 | 0% | 0% | 0% | 0% | 0% | 23.6% | 73.3% | 1.6% | 1.5% |
| D 235 loaded | 12,381 / 21,150 | 2,472.345 | 92.0% | 1.5% | 1.4% | 0.4% | 2.6% | 1.3% | 0.2% | 0.4% | 0.3% |

¹ Timer wakeup, admission outside older active turns, socket send, inbound transport and gateway work before handler entry. The archive does not timestamp gateway queue entry separately. HTTP clocks that could not be aligned are included here (at most 1.04% of any loaded row). ² Includes the predecessor-ready step. ³ Native future completion, response construction and delivery through client decode. Native submission runs from predecessor-ready to the transactor's read stamp. The actual async API call is separately observed at 0.04–0.05 ms p99 across these four loaded cells and can overlap native handling.

To see what was holding an older turn, follow its **last durable ACK** through its stages during the wait. Across loaded H50 / H235 / D50 / D235, its transactor queue accounts for **22.8 / 55.4 / 19.2 / 45.1 percentage points** of all excess time. Its apply accounts for **11.2 / 13.3 / 8.2 / 11.9 points**, gateway preparation **3.0 / 15.1 / 4.3 / 16.8 points**, and append call **0.6 / 1.6 / 8.6 / 3.9 points**. This locates the delay along the observed dependency. A native queue interval can include work for other transactions, submission scheduling and an I/O or JVM stall. The archive cannot divide those intervals by root cause.

| Loaded arm | Writer / transactor safepoint overlap, % of excess time¹ | Safepoint wall total / max, ms, transactor · writer · reader | Native SQL reads/save · SQL + decode mean | Distinct appends/s in window | Append median / p99 / max, ms² |
| --- | ---: | --- | --- | ---: | --- |
| H 50 | 1.69 / 0.01 | 0.43 / 0.06 · 765 / 44 · 979 / 62 | 1.43 · 1.48 ms | 50.0 | 0.38 / 1.63 / 17.75 |
| H 235 | 2.96 / <0.01 | 5.80 / 2.30 · 3,489 / 35 · 1,537 / 81 | 1.08 · 0.97 ms | 229.6 | 0.44 / 2.31 / 14.33 |
| D 50 | 1.87 / 3.81 | 1,502 / 73 · 715 / 27 · 880 / 73 | 1.40 · 1.28 ms | 49.7 | 0.38 / 22.35 / 101.96 |
| D 235 | 3.65 / 4.37 | 4,000 / 110 · 3,301 / 35 · 1,342 / 68 | 1.04 · 0.91 ms | 224.5 | 0.43 / 2.38 / 78.77 |

¹ Overlap on the save or its older turn's last-ACK path. It is an overlay, and a pause can create queueing that outlives it. Reader safepoints are contextual because the reader JVM does not acknowledge a write. The two D235 solo excesses overlapped the transactor safepoint for 90% of their combined 73.7 ms. ² One sample per traced physical native append carrying at least one scored save, including drain for the distribution. Includes the call to durable storage and scheduling around it.

- **Storage and cache.** SQL plus decode could cover at most 9.61%, 0.18%, 4.55% and 0.54% of the respective loaded rows’ excess time **inside each slow save's own apply**. The per-transaction counters have no clocks or lookup keys for reads during an older transaction. At 394, the headline records 0.84 EAVT, 0.98 AEVT and 0.001 AVET index loads/save. The default records 1.03, 1.16 and 0.001. EAVT and AEVT loads are consistent with the earlier owner/predecessor and native row/retirement categories. The counts overlap and do not identify a specific key. The scattered-ID AVET misses from the original writer are absent at material scale. [Full-size lookup categories](FULL-SIZE-READING.md)
- **PostgreSQL, index work and memory pressure.** Both profiles confirm one PostgreSQL core, 8 GiB cap, 2 GB shared buffers, `min_wal_size=80MB`, `max_wal_size=1GB`, `checkpoint_timeout=5min` and `checkpoint_completion_target=0.9`. Synchronous commit, fsync, full-page writes and both timing flags were on. A 1 GB soft target can request checkpoints early. The archive omitted the PostgreSQL checkpoint log, WAL and I/O counter samples, core run queues, Datomic index spans and memory-index size or back-pressure notifications. The actual checkpoint count, WAL sync/write durations around checkpoints and shares due to any of these causes are unknown. In particular, an append call of 102 ms does not establish a 102 ms WAL sync. [PostgreSQL WAL settings](https://www.postgresql.org/docs/17/runtime-config-wal.html) · [PostgreSQL statistics](https://www.postgresql.org/docs/17/monitoring-stats.html) · [Datomic capacity and indexing](https://docs.datomic.com/operation/capacity.html)
- **Load generator.** One sender core was assigned. Its due-to-enqueue p99 was 1.68–1.99 ms at 50/235 and 2.05–2.08 ms at 394 (maximum 4.58 ms). The seconds of wait occur after enqueue. A sender CPU time series is absent. This rules out late offer generation as the explanation for the long backlog, while leaving transport and work inside admission as measurable smaller contributors.

## 2. Why 394 offered yielded 343 in-window

| At 394 offered/s | H | D |
| --- | ---: | ---: |
| In-window/s · ACKs after window | 342.90 · 4,599 | 296.59 · 8,767 |
| Full six-save turns · mean six-slot turnover | 99.4% · 16.88 ms | 99.2% · 18.68 ms |
| Dispatch wait p99 · HTTP p99 | 12,490 · 35.8 ms | 23,091 · 58.9 ms |
| Gateway preparation mean / p99 | 2.73 / 25.92 ms | 2.66 / 26.09 ms |
| Native queue mean / p99 | 3.87 / 13.46 ms | 4.52 / 14.16 ms |
| Apply mean / p99 · SQL reads/save · mean SQL + decode | 1.86 / 4.70 ms · 1.19 · 0.93 ms | 2.18 / 4.73 ms · 1.24 · 1.03 ms |
| Saves/append through drain · appends/s in window | 1.066 · 324.0 | 1.010 · 294.9 |
| Append mean per save · distinct append p99 / max | 0.57 ms · 1.99 / 11.10 ms | 0.73 ms · 1.94 / 96.61 ms |
| Window with apply / append / either active | 66.8 / 18.3 / 70.7% | 71.2 / 19.4 / 74.8% |

**The saturated resource the trace identifies is the shared six-credit admission window.** Under sustained backlog each turn waits for its slowest ACK and releases all six at once. At 620 the headline's turns averaged 17.87 ms and 5.90 saves while 620 would require 9.68 ms at six. Mean apply alone at H394 implies a roughly 536/s serial-apply upper bound. Its 70.7% apply-or-append wall occupancy includes I/O waits and excludes unscored work. This leaves gaps in the scored write stream and does not measure CPU or rule out concurrent indexing, reads or PostgreSQL scheduling inside the turns. At H394 the writer and reader reported 16.56 and 1.49 GC CPU seconds. D394 reported 12.23 / 13.48 / 1.37 GC CPU seconds for transactor / writer / reader. ZGC logs here omit comparable CPU counters. None of those figures are total process utilization.

The ladder's 762–988 native saves/s used one loader at depth 256 with 20 records per save and no six-ACK product ingress barrier. It used 2.66–2.71 of three transactor cores with index jobs active 83–91% of the sampled time, no memory-index alarms, and mean PostgreSQL WAL sync 0.17–0.296 ms. It proves the same engine and host can sustain a larger, differently shaped stream. Different transaction payloads, load depth, index geometry and read work preclude assigning the rate gap to one physical resource. [Ladder measurements](https://github.com/OnboardedInc/Triplex-db-experiments/blob/93e49dfb0/lab/experiments/EXP-DX1/scale1/AGE1-LADDER.md)

## 3. Quiet account

| Arm / rate | Published solo → loaded quiet p99 | At the p99-ranked loaded save |
| --- | --- | --- |
| H 50 | 22.91 → 53.50 ms | 48.0 ms behind one earlier turn, including 39.0 ms of its last ACK's native queue. No overlapping writer or transactor safepoint. |
| H 235 | 20.10 → 88.06 ms | 81.3 ms behind three turns. Their last ACKs contributed 32.9 ms in the native queue and 29.9 ms in preparation, with 23.3 ms overlapping writer safepoints. The previous quiet offer was 22.4 ms earlier and still outstanding. |
| H 394 | 13.70 → 69.63 ms | 51.9 ms behind two turns. The previous quiet offer was only 0.5 ms earlier. Earlier turns overlapped 22.0 ms of writer safepoints. |
| H 620 | 18.94 → 76.80 ms | 54.0 ms behind three turns, including 26.6 ms of earlier preparation and 15.6 ms of earlier native queue. |
| D 50 | 26.75 → 151.55 ms | 144.4 ms behind three turns, with 70.6 ms in their native queues and 41.9 ms preparing their last saves. |
| D 235 | 43.52 → 113.66 ms | 16.4 ms behind one earlier turn. The save itself took 20.1 ms in native queue, 28.7 ms ready-to-append and 40.2 ms in append. |
| D 394 | 67.07 → 115.71 ms | 94.4 ms behind three turns, with 47.0 ms of transactor safepoint overlap on the earlier last-ACK paths. |
| D 620 | 41.22 → 115.71 ms | 37.9 ms behind one earlier turn and 64.9 ms in its own native queue. Its own native spans overlapped 40.1 ms of transactor safepoint. |

Every quiet cell acknowledged 315/315. The nearest-rank save is used for splits, while the table shows the published histogram p99. There was no pending **same-subject** quiet ACK at enqueue for any of these ranked saves. Recent-share priority gives the next turn to a ready account under its share; quiet arrivals clumped across different subjects can consume the priority. Even a ready quiet account inherits the drain of the active turn. That explains why the fair-turn rule prevents expiry without assuring a one-turn latency bound for every arrival.

For **default solo**, the p99-ranked save at 50 spent 18.6 of 26.7 ms in response construction, with 17.9 ms of writer safepoint overlap. At 235, 35.2 of 43.5 ms was in append. At 394, 56.9 of 66.9 ms waited for the older turn, whose last save spent that time waiting for native completion after append. Default solo append p99 at the four rates was 2.94 / 31.05 / 31.62 / 30.90 ms. At 620, 28.5 of the ranked save's 41.0 ms was in append. Headline solo append p99 was 0.67–2.65 ms. The comparison changes both JVM and WAL placement. On the small seed, the WAL-only comparison shortened quiet solo tails. [Small-seed append-tail evidence](https://github.com/OnboardedInc/Triplex-db-experiments/blob/d767ae051/lab/experiments/EXP-DX1/bm1/APPEND-TAIL-READING.md)

## 4. What the benchmark adds

- **Start of cell matters.** First-15-second offers account for 99.2% of H50 excess and first-30-second offers account for 96.8% of H235 excess. H235 sender-wait p99 falls from 2,447 to 132 ms between halves. D235 rises from 631 to 1,164 ms. H394 delivers 302.4/s in the first half and 383.4/s in the second, still below 394. D394 delivers 293.3 and 299.9/s. The archive cannot separate changing cache/index state, maintenance and workload phase. Later cells reuse the database as modified by earlier ones.
- **The clock includes real admission wait.** A fast HTTP response after a late dispatch is still a late save. At 394, eventual ACKs and in-window goodput answer different questions. At 620, the 30 s pre-dispatch expiry clips the sample and removes demand from the queue, while acknowledged saves include the drain. Treat 329/s as measured in this finite cell, and retain expiries when judging capacity.
- **The workload is bounded.** Field updates touch one task and one to three fields, with widths of 1/2/3 at 80/15/5% on the tape. The quiet account replays the same arrivals and subjects in each pair. Even its solo cell has 3,840 checked reads and journal feed work. The six-minute 3.5/s prelude is measured traffic (22.53 ms p99 with readers and 24.58 ms without on the tuned profile). The older zero-reader anchor was 44.799 ms. A predecessor census before cells checks the selected rows. No independent cold/late-cell repeat measures the effect of those steps. The generator's independently jittered offer buckets can place consecutive quiet arrivals less than a millisecond apart. That matters for the ratio and should remain visible alongside the solo and loaded values.
- **Earlier full-size runs bracket this result.** The one-core/2 GiB G1 writer delivered 274.28/s at 620 with fair turns (278.08/s with them off). The six-credit three-core/16 GiB follow-up without the scorecard observers delivered 345.80/s at 394 on ZGC/separate WAL and 361.51/s on G1/data WAL. In those runs the transactor averaged 1.35 or 1.15 of three cores respectively. This scorecard's 342.90/s is near the tuned ZGC run and the different G1 result cautions against assuming a fixed ceiling. The 762–988/s loader and small-seed 394/s result answer different questions from this card. [Original full-size reading](FULL-SIZE-READING.md) · [Three-core follow-up](https://github.com/OnboardedInc/Triplex-db-experiments/blob/64a76c50d/lab/experiments/EXP-DX1/scale1/SCALE-TUNE.md)

## 5. Changes and predictions

### Settings for a matched 80-minute fresh rerun before the 1B card

Use the tuned headline as control and change only the PostgreSQL checkpoint budget and the core split in a second ordered arm. These are profile/readback values for the driver, not existing environment flags. Both arms use stopped copies of the same seal, the same trace policy and the same measured prelude and paired 50/235/394/620 windows. Two arms fit in the original run's 78:35 four-arm startup-to-cleanup envelope with local copies staged. Instrument during the existing windows. At 1B, validate the stopped copy, second-drive WAL placement and free space before launch. Budget the existing 16 GiB floor on each device plus at least 8 GiB extra on the WAL filesystem and monitor actual allocation. A larger soft WAL budget can extend recovery. [PostgreSQL WAL settings](https://www.postgresql.org/docs/17/runtime-config-wal.html)

| Role | Candidate profile |
| --- | --- |
| PostgreSQL | 2 physical cores `1,5`, 8 GiB cap, `shared_buffers=2GB`, WAL on the second NVMe. `min_wal_size=512MB`, `max_wal_size=4GB`, `checkpoint_timeout=5min`, `checkpoint_completion_target=0.9`, `checkpoint_flush_after=256kB`, `wal_sync_method=fdatasync`. Keep `synchronous_commit=on`, `fsync=on`, `full_page_writes=on`, `track_io_timing=on`, `track_wal_io_timing=on`, `log_checkpoints=on`, `log_timezone=UTC`. |
| Transactor | 3 physical cores `0,7,8`, Java 25 ZGC with the pinned collector flags, 24 GiB heap in a 30 GiB cap, 16 GiB object cache, `memory-index-threshold=256m`, `memory-index-max=1g`, `index-parallelism=1`, `write-concurrency=4`. No measured back-pressure justifies buying more index memory for this card. |
| Gateways and load | Writer 3 cores `2,3,4`, Java 21 G1, 4 GiB heap in 6 GiB, `ActiveProcessorCount=3`, `ParallelGCThreads=3`; reader 1 core `6`, Java 21 G1, 3 GiB heap in 5 GiB. Sender `9`, reader clients `10,11`. One ordered writer gateway, six credits and the same SDK tape. |

**Prediction.** A 4 GB target should reduce WAL-volume-triggered checkpoints if they currently occur; time-triggered checkpoints still follow the 5 min setting. Two PostgreSQL cores should reduce contention between the append connection, SQL reads and background work if one core is busy. Together, in that case expect 50 / 233–235 / **350–365** / **335–350** in-window saves/s, versus 50 / 234.98 / 342.90 / 329.42 today. At 235 expect about 20 → 75 ms quiet p99 (3.75×), and at 394 about 14 → 60 ms (4.3×). These are planning estimates. Earlier WAL placement improved quiet tails. The current headline's 394 append p99 is already about 2 ms. Full 394/s and 1.25× quiet isolation remain open. Moving a core from the writer may offset any benefit.

**Test and falsifier.** Capture per-role cgroup CPU, throttling and pressure plus sender CPU, Datomic index start/adoption and memory-index size/alarms, and timestamped PostgreSQL checkpoint start/end, cause, buffers and write/sync duration. Sample `pg_stat_wal`, `pg_stat_checkpointer` and `pg_stat_io` at cell boundaries and 1 s on the same clock. Counter deltas give means and counts, with exact checkpoint events from logs. Confirm fewer requested checkpoints or less PostgreSQL runnable/throttled time aligned with native stalls, and shorter turns. Spare PostgreSQL CPU and a lack of checkpoint-linked stalls would undermine the mechanism. **At 394, ≤345/s and ≥16.7 ms mean turn despite PostgreSQL relief**, or a ≥20% increase in writer preparation p99 or a material read/feed regression, rejects promoting the candidate. If the fresh rerun cannot happen first, use the measured headline profile for the 1B comparison and collect those counters. [PostgreSQL statistics](https://www.postgresql.org/docs/17/monitoring-stats.html)

### Code for next week

1. **Release credits per durable ACK.** Compare the barrier with rolling 6, 8, 12 and 16 credits using the same full-size tape. Reserve one quiet opportunity, cap the number of already-submitted neighbour saves ahead of it, and retain subject ordering and quarantine after an uncertain outcome. Recovering 1.65 ms on a six-save turn would close the headline's turnover gap at 394. Six rolling credits are the first check. At 12, forecast 390–440/s at 620 on this seed if blocks remain near 2 ms p99. Aim first for quiet loaded p99 35–55 ms at 235/394 and under 50 ms solo. The observed quiet bursts and the 1.25× isolation target still need a matched proof.
2. **Share durable append cost when backlog is present.** After measuring rolling credits, test 1.3–1.5 saves per append with independent subjects, demand-triggered issuance and receipts only after durability. At 394, increasing 1.066 to 1.4 at the measured call cost could save about 0.13 ms/save of append service before overlap (roughly 5% of the 2.54 ms peak budget). A sparse quiet save must issue without a batch-fill timer. Keep the ordinary journal and all receipt and erasure checks.
3. **Price exact predecessor reads at key level and remove repeated loads if confirmed.** H394 spends 0.93 ms/save across SQL fetch and decoding for 1.19 reads/save. Removing half a read per save would free about 0.39 ms of apply at that measured average, before considering overlap and skew. First record gateway queue entry, exclusive lookup timing, exact revision/predecessor hits and index/PG event spans. That telemetry earns no throughput credit. Any cache change must preserve the exact revision fence, native rows, pinned history and erasure.

## Evidence and audit

The original archive, readout and driver report match the three published hashes. Each analysed member is checked against the archive-bound custody file. [Driver checksums](https://github.com/OnboardedInc/Triplex-db-experiments/blob/1ed7bbfd7/lab/experiments/EXP-DX1/scale1/evidence/score-v01-fresh-tuned.sha256)

The only observation decisions in the diagnostic are archive admission, save/native join and ledger emission. Admission checks content hashes and the sealed image, source, launch and attempt. The join checks exact tape input, timing and writer settings, contiguous cuts, journal receipt fields and native database/transaction IDs with a complete 0-drop trace for the same attempt. Emission checks stage and excess sums, with cross-clock bounds reconstructed from send/ACK and native/gateway durations. Rows that cannot be aligned stay unassigned HTTP. An independent read of both compressed ledgers checked every row's arithmetic, identity, attempt and per-cell denominators. Neither the analyzer nor this report issues a product receipt or an acceptance verdict. No contract pins changed.

The recount, compressed per-save ledgers, source hash record and independent aggregation are under `evidence/DX-PREP1/p13-scorecard-reading/`, with the final run in `analysis-4/`. The first two diagnostic attempts remain as failure logs. The expanded scratch copy was removed. No server was contacted or run for this analysis. [Analyzer](scorecard-fresh-ledger.py) · [Evidence checksums](SHA256SUMS)
