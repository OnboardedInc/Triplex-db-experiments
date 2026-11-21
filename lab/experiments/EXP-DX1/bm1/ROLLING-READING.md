# Full-size rolling-credit comparison

**North star P2.** Measure scheduled offer to durable ACK and the quiet account's tail while nine neighbours write in the same database. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The published producer `c8f903ce1` reopens each arm at cut 87,002 with 162,456,470 facts and one million people. All arms use the `server` profile, Java 25 ZGC on three transactor cores, a 16 GiB object cache, Java 21 gateways and a separate WAL drive. PostgreSQL keeps synchronous commit, fsync and full-page writes on. The timed sender runs on core 9 and the counter sampler on core 10. The reader verifies the journal after each cell. [Method and before-launch forecasts](https://github.com/OnboardedInc/Triplex-db-experiments/blob/cb5e3cf7a2083b97f0a3fbc0d699a082a0940657/lab/experiments/EXP-DX1/prep1/ROLLING-CREDITS.md)

## Barrier 6

The 394/s window delivered 353.12 ACKs/s against 351 forecast. Its second half expired all 1,060 refused offers. At 620/s, the barrier delivered 391.78/s against 340 forecast and still expired 54,553 offers. At 235/s it delivered the full load, but whole-window p99 hit 5.30 s against 1.60 s forecast. The second half improved to 45.68 ms. Quiet ratios ranged from 2.77× to 8.10×.

Rates count ACKs inside the named wall window. ACK latencies use offers scheduled in that window and include their later drain ACKs. Expiries remain separate.

| Offered | ACKs/s whole forecast→actual | First half actual | Second half forecast→actual | Whole ACK p50/p99 ms forecast→actual | First-half ACK p50/p99 ms | Second-half ACK p50/p99 ms forecast→actual | Expired first + second |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 235 | 235→235.00 | 235.03 | 235→234.97 | 24/1,600→8.28/5,303.03 | 15.35/5,575.28 | 12/110→6.61/45.68 | 0 + 0 |
| 394 | 351→353.12 | 340.42 | 367→365.83 | 16,500/30,020→25,604.18/29,995.72 | 17,113.25/27,488.54 | 23,200/30,020→28,072.58/30,004.75 | 0 + 1,060 |
| 620 | 340→391.78 | 374.39 | 355→409.16 | 29,910/30,040→29,938.75/30,022.25 | 29,878.44/30,020.81 | 29,950/30,040→29,969.31/30,023.66 | 25,143 + 29,410 |

| Offered | Quiet p99 ms solo / loaded forecast→actual | Quiet ratio | Solo p50 ms whole / first / second | Solo p99 ms first / second | Loaded quiet p99 ms first / second |
| --- | ---: | ---: | ---: | ---: | ---: |
| 235 | 18/75→31.19/86.43 | 2.77× | 9.77/11.78/7.77 | 42.61/16.91 | 104.29/34.99 |
| 394 | 15/73→14.53/114.57 | 7.88× | 6.96/7.20/6.67 | 14.53/14.09 | 114.57/108.89 |
| 620 | 17/84→15.67/126.87 | 8.10× | 7.35/7.79/6.90 | 15.62/16.36 | 113.87/392.17 |

All solo cells observed 3.5 ACKs/s, with 1,050 durable offers each and zero expiry. Their forecast p50 was 7 ms. In the loaded second halves the transactor averaged 0.65 / 1.78 / 1.87 cores at 235 / 394 / 620. Mean SQL reads per durable save over the whole loaded cells were 0.70 / 1.30 / 1.01. The exact per-role counters and native append data remain with the arm.

The producer summary was admitted only after the native collector reconciled all six planned cells and the arm's data clone and WAL directory were removed. The Mac checkpoint binds the pinned commit, arm, slot and nonce to the exact plan, seed, header and completion hashes and exact offer counts. It is 15,329,280 bytes at `evidence/DX-BM1/bench3/checkpoints/barrier6/checkpoint.tar`. Raw event files stay on the bench until campaign collection. [Checksums](SHA256SUMS)

## Rolling 6

At 394 offered, all 118,200 saves became durable and the in-window rate rose from 353.12 with the barrier to 391.85/s. This beat the 381/s forecast and cleared the barrier's 1,060 expiries. Quiet p99 fell from 114.57 to 54.00 ms, still above the 36 ms forecast. At 620, rolling 6 delivered 454.02/s against 388 forecast and had 36,164 expiries. The 235/s early tail remained visible at 2.63 s whole-window p99, while its second half reached 31.82 ms.

| Offered | ACKs/s whole forecast→actual | First half actual | Second half forecast→actual | Whole ACK p50/p99 ms forecast→actual | First-half ACK p50/p99 ms | Second-half ACK p50/p99 ms forecast→actual | Expired first + second |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 235 | 235→235.00 | 235.03 | 235→234.97 | 11/95→5.13/2,631.67 | 6.60/2,706.33 | 10/64→4.52/31.82 | 0 + 0 |
| 394 | 381→391.85 | 392.14 | 388→391.55 | 4,500/10,400→635.99/5,976.42 | 995.94/6,154.68 | 7,000/10,400→320.79/5,067.37 | 0 + 0 |
| 620 | 388→454.02 | 422.55 | 402→485.49 | 29,920/30,035→29,727.32/30,022.01 | 29,612.69/30,020.13 | 29,960/30,035→29,820.56/30,023.80 | 14,140 + 22,024 |

| Offered | Quiet p99 ms solo / loaded forecast→actual | Quiet ratio | Solo p50 ms whole / first / second | Solo p99 ms first / second | Loaded quiet p99 ms first / second |
| --- | ---: | ---: | ---: | ---: | ---: |
| 235 | 18/36→30.85/43.91 | 1.42× | 9.71/11.82/7.83 | 34.83/16.32 | 50.68/34.89 |
| 394 | 15/36→21.60/54.00 | 2.50× | 6.90/7.29/6.61 | 24.35/11.74 | 56.11/50.67 |
| 620 | 17/43→14.97/61.79 | 4.13× | 7.33/7.61/7.00 | 30.50/12.29 | 61.79/44.80 |

All solo cells observed 3.5 ACKs/s with 1,050 durable offers each and zero expiries. Their forecast p50 was 7 ms. In the second halves at 235 / 394 / 620, the transactor used 0.61 / 1.84 / 2.25 cores on average. Whole-window mean SQL reads per durable save were 0.61 / 1.35 / 1.32. At 394, 117,554 of 118,200 ACKs landed inside the timed window. The complete arm and cleanup preceded its 15,329,280-byte Mac checkpoint at `evidence/DX-BM1/bench3/checkpoints/rolling6/checkpoint.tar`. [Checksums](SHA256SUMS)

## Rolling 12

At 394 offered, all 118,200 saves ACKed inside the five-minute window. The throughput matched the forecast and the whole-window ACK p99 was 7.05 s against 105 ms forecast. Even the second half reached 2.46 s against 80 ms. Compared with rolling 6, quiet p99 nearly doubled from 54.00 to 105.67 ms. At 620 offered the wider window raised throughput from 454.02 to 473.80/s, ahead of the 447/s forecast, and reduced expiries from 36,164 to 26,865.

| Offered | ACKs/s whole forecast→actual | First half actual | Second half forecast→actual | Whole ACK p50/p99 ms forecast→actual | First-half ACK p50/p99 ms | Second-half ACK p50/p99 ms forecast→actual | Expired first + second |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 235 | 235→235.00 | 235.03 | 235→234.97 | 10/67→5.46/2,661.95 | 6.83/2,741.01 | 10/55→4.79/32.28 | 0 + 0 |
| 394 | 394→394.00 | 392.79 | 394→395.21 | 18/105→610.93/7,051.54 | 1,193.86/7,227.13 | 16/80→220.46/2,455.35 | 0 + 0 |
| 620 | 447→473.80 | 440.70 | 462→506.89 | 29,850/30,030→29,179.26/30,042.57 | 29,018.73/30,040.09 | 29,950/30,030→29,203.15/30,044.49 | 11,192 + 15,673 |

| Offered | Quiet p99 ms solo / loaded forecast→actual | Quiet ratio | Solo p50 ms whole / first / second | Solo p99 ms first / second | Loaded quiet p99 ms first / second |
| --- | ---: | ---: | ---: | ---: | ---: |
| 235 | 18/38→31.95/98.95 | 3.10× | 9.50/11.95/7.71 | 35.81/14.85 | 119.48/37.30 |
| 394 | 15/43→30.23/105.67 | 3.50× | 7.02/7.21/6.77 | 34.14/13.19 | 105.67/87.12 |
| 620 | 17/53→23.65/114.51 | 4.84× | 7.17/7.46/6.92 | 23.65/13.32 | 81.43/371.07 |

All solo cells observed 3.5 ACKs/s with 1,050 durable offers each and zero expiry. Their forecast p50 was 7 ms. The transactor averaged 0.67 / 1.83 / 2.36 cores in the loaded second halves at 235 / 394 / 620. Whole-window mean SQL reads per durable save were 0.71 / 1.37 / 1.24. The 15,329,280-byte checkpoint is at `evidence/DX-BM1/bench3/checkpoints/rolling12/checkpoint.tar`. [Checksums](SHA256SUMS)

The full main-campaign evidence is on the Mac at `evidence/DX-BM1/bench3/bench3-rolling-main`. Its 14,316,289-byte summary and 208,114,992-byte raw archives were checked against both transfer manifests and decoded member hashes. The per-arm checkpoint digests are listed separately. [Checksums](SHA256SUMS)

## Rolling 8

At 394 offered, rolling 8 delivered 394.00/s and zero expiries. Busy p99 was 7.48 s over the whole window and 5.84 s in the second half, well above forecasts of 1.9 s and 350 ms. Quiet p99 was 57.16 / 57.96 / 75.93 ms at 235 / 394 / 620. All three miss the quiet diagnostic rule of 50 ms or 1.25× solo. At 235, rolling 6 met that rule with 43.91 ms. The formal P2 save-latency row remains UNJUDGED because the credit comparison lacks the P1 reader load. Rolling 16 was cancelled before preparation on the owner's direction.

| Offered | ACKs/s whole forecast→actual | First half actual | Second half forecast→actual | Whole ACK p50/p99 ms forecast→actual | First-half ACK p50/p99 ms | Second-half ACK p50/p99 ms forecast→actual | Expired first + second |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 235 | 235→235.00 | 234.99 | 235→235.01 | 10/78→5.07/2,793.84 | 6.81/2,863.59 | 10/60→4.35/34.70 | 0 + 0 |
| 394 | 391→394.00 | 390.19 | 394→397.81 | 150/1,900→1,281.70/7,480.40 | 2,131.95/7,579.43 | 16/350→625.25/5,836.91 | 0 + 0 |
| 620 | 415→455.69 | 429.07 | 427→482.31 | 29,900/30,035→29,689.08/30,028.68 | 29,572.09/30,028.61 | 29,950/30,035→29,742.16/30,028.71 | 15,807 + 18,313 |

| Offered | Quiet p99 ms solo / loaded forecast→actual | Quiet ratio | Solo p50 ms whole / first / second | Solo p99 ms first / second | Loaded quiet p99 ms first / second |
| --- | ---: | ---: | ---: | ---: | ---: |
| 235 | 18/37→32.05/57.16 | 1.78× | 9.94/11.92/7.83 | 39.53/15.24 | 74.57/36.24 |
| 394 | 15/39→12.56/57.96 | 4.62× | 6.98/7.07/6.91 | 15.22/12.18 | 55.69/60.74 |
| 620 | 17/46→16.06/75.93 | 4.73× | 7.31/7.55/7.08 | 30.13/13.00 | 52.57/347.55 |

Each solo cell verified 1,050 durable offers at 3.5/s. Loaded in-window/durable counts were 70,500/70,500, 118,200/118,200 and 136,706/151,880. Whole-window native SQL reads/save averaged 0.56 / 1.40 / 1.29. Second-half transactor CPU averaged 0.56 / 1.88 / 2.26 cores. The 15,329,280-byte checkpoint passed the exact source, current slot and content checks after the unit closed. The Mac archive at `evidence/DX-BM1/bench3/bench3-rolling-rolling8` contains 8,818,210 summary bytes and 71,164,303 raw bytes, verified member by member. [Checksums](SHA256SUMS)

## 32 GiB object cache (cache32)

**The larger cache removed the late SQL reads.** It did not remove the tail. With the 32 GiB cache, SQL reads per save fell to near zero after the first minute. The 16 GiB rolling 6 arm read about 1.0 per save outside index jobs and 1.6 inside. The cache32 arms read 0.04 outside and under 0.001 inside, from 150 s onwards. The early backlog remained. In the first 60 seconds, reads were 1.48 and then 0.94 per save, and apply took 3.62 and then 2.15 ms. That backlog set the whole-window busy p99 at 14.3 s and the second-half p99 at 521 ms. Forecasts were 90 ms on three cores and 60 ms on five. Late busy p99 is therefore not under 100 ms. No spell of 1,000 or even 300 waiting offers occurred after 150 s. Both arms used PREP1 `97aced1b1`, rolling 6 credits, a 48 GiB ZGC heap, an 8 GiB direct-memory limit and a 60 GiB transactor container. No step warmed the cache: each arm ran its 3.5/s solo cell before the loaded window, as in the 16 GiB arm.

| Arm at 394 offered | Stored/s whole / second half, forecast→actual | Expired | Busy ACK p50/p99 ms, whole | Busy ACK p50/p99 ms, second half, forecast→actual | Quiet loaded p99 ms forecast→actual | Quiet solo p99 ms | Late SQL reads/save outside→inside jobs, forecast→actual | Late apply ms outside→inside, forecast→actual |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 16 GiB, three cores (rolling 6 reference; reads and apply are PREP1's outside→inside backlog spells) | 391.85 | 0 | — | 320.79 / 5,067 | 54.00 | — | 0.99→1.57 | 1.40→2.79 |
| 32 GiB, three cores | 394→394.00 / 393.95 | 0 | 5.52 / 14,287 | 90 p99 → 4.51 / 520.99 | 47→61.81 | 29.63 | 0.55→0.95 → 0.043→0.0006 | 1.10→1.90 → 0.30→0.48 |
| 32 GiB, five cores | 394→394.00 / 393.95 | 0 | 9.05 / 9,973 | 60 p99 → 5.60 / 655.96 | 43→47.63 | 38.11 | 0.55→0.95 → 0.038→0.0003 | 1.08→1.62 → 0.30→0.34 |

| Loaded window, 30 s bins from the start | 0 | 30 | 60 | 90 | 120 | 150 | 180 | 210 | 240 | 270 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Three cores, SQL reads/save | 1.48 | 0.94 | 0.05 | 0.02 | 0.06 | 0.02 | 0.05 | 0.03 | 0.01 | 0.08 |
| Three cores, apply ms/save | 3.62 | 2.15 | 0.59 | 0.29 | 0.40 | 0.28 | 0.47 | 0.29 | 0.35 | 0.34 |
| Five cores, SQL reads/save | 1.17 | 0.61 | 0.05 | 0.02 | 0.06 | 0.02 | 0.05 | 0.03 | 0.04 | 0.04 |

**At 620 offered, three cores kept up and five cores did not.** The three-core cache32 arm stored 620.00/s, with 619.99 in the first half and 620.01 in the second, and no expiries. The forecast was 495/515 stored/s and a 30,025 ms late busy p99. Its busy p99 was 20,940 ms whole and 708.99 ms in the second half, and quiet loaded p99 was 44.68 ms against a 50 ms forecast. The five-core arm stored 617.86/s, 595.71 then 640.00 as it drained, also with no expiries. Its busy p99 was 16,925 ms whole and 5,867 ms in the second half. It had one 63-second spell from 150 s with up to 3,645 offers waiting, and quiet loaded p99 was 76.64 ms against a 48 ms forecast. The five-core split leaves the write gateway two cores, and it averaged 1.63 of them in the second half. The three-core arm's write gateway averaged 1.60 of its three, and its transactor 1.25 cores.

**Verdict against the falsifiers.** The cache-size hypothesis survives, with a larger effect than forecast. It would have lost if reads had stayed near 1.0→1.6 while the heap had room. Reads instead fell 25× outside index jobs and over 1,000× inside. CPU headroom does not explain the gain: the five-core arm gained no more than the three-core arm at 394, and it lost at 620. What remains is a first-minute cold-cache backlog. Since no warm step is allowed, a restart pays it each time. That puts the cold-start item and fresh-first ordering in front of the late index spells. Peak transactor cgroup memory was 51.2 GiB of 60 GiB on three cores and 50.7 GiB on five. PostgreSQL peaked at 8.0 GiB. Solo cells all verified 1,050 of 1,050 offers at 3.5/s. Loaded cells verified 118,200 of 118,200 at 394 and 186,000 of 186,000 at 620.

The Mac copy is at `evidence/DX-BM1/bench3/bench3-cache32`. It holds the 9,657,164-byte summary and 117,835,127-byte raw archives, both checked member by member against the transfer manifest, plus the pinned-analyser readout `readout-check.json`. The readout re-ran PREP1's checkpoint, source, slot and clock checks at `97aced1b1`. The bins above come from its `cacheBySecond` series. The rental had cost about USD 4.52 at 18:22 UTC. [Checksums](SHA256SUMS)

## Five transactor cores with the 16 GiB cache (tx5)

**At 394 offered, five cores kept up but missed the latency forecast.** The arm ran PREP1 `73afad665` (`DX_PREP1_ROLLING_ARM=rolling6-tx5`) with five transactor cores, two write-gateway cores, the 16 GiB cache and rolling 6 credits. It stored 394.00/s with no expiries and no spell of 300 waiting offers after 150 s, as forecast. Second-half busy p99 was 467.66 ms against a 300 ms forecast. Quiet loaded p99 was 68.83 ms against 49 ms; it was 56.93 ms in the first half and 332.77 ms in the second. Late SQL reads per save were 0.49 outside and 0.48 inside index jobs, and late apply was 0.76 and 0.83 ms. These late figures come from the readout's 150 s split; the 16 GiB three-core reference figures come from PREP1's spell split, so the two are not strictly the same measure. As in the cache32 arms, the whole-window tail came from the first minute: 1.19 then 0.70 reads per save, a whole-window p99 of 8,274 ms and a first-half p99 of 8,386 ms.

| Offered | Stored/s whole / second half, forecast→actual | Expired | Busy ACK p50/p99 ms, whole | Busy ACK p99 ms, second half, forecast→actual | Late waiting offers, max; spells ≥300 / ≥1,000 | Quiet loaded p99 ms forecast→actual | Quiet solo p99 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 394 | 394/394 → 394.00 / 393.95 | 0 | 17.71 / 8,274 | 300→467.66 | 266; 0 / 0 | 49→68.83 | 33.82 |
| 620 | 478/500 → 485.61 / 526.77 | 24,984 | 29,750 / 30,019 | 30,025→30,022 | 40,359; one spell from 150 to 300 s | 55→250.10 | 29.37 |

| 394 loaded, 30 s bins from the start | 0 | 30 | 60 | 90 | 120 | 150 | 180 | 210 | 240 | 270 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| SQL reads/save | 1.19 | 0.70 | 0.18 | 0.87 | 0.47 | 0.25 | 0.61 | 0.65 | 0.39 | 0.56 |
| Apply ms/save | 3.08 | 1.51 | 0.62 | 1.36 | 0.85 | 0.51 | 0.92 | 0.94 | 0.67 | 0.86 |

**Verdict against the falsifier.** The falsifier needed indexing to keep raising apply to 2.5–3.0 ms and reads to about 1.6 per save, with queues and spare capacity. That did not happen: reads were flat at 0.48–0.49 inside and outside jobs, and apply stayed under 1 ms. The forecast's capacity at 620 matched: 485.61/526.77 stored against 478/500, with a sustained spell of 40,359 waiting against about 42,600 deficits. The latency forecasts at 394 missed by 1.6× on busy saves and 1.4× on the quiet account. **Against cache32, the larger cache is the change that matters.** At 620 offered, the 32 GiB cache on three cores stored 620.00/s with no expiries, and it read 0.04 instead of 0.49 per save late at 394. At 394, the second-half busy p99 ranges from 468 to 656 ms across tx5 and both cache32 arms. All three keep the same cold first minute. In the second half, the transactor averaged 1.19 cores at 394 and 2.44 at 620, and the two-core write gateway 0.87 and 1.18.

Solo cells verified 1,050 of 1,050 offers each. Loaded cells verified 118,200 of 118,200 at 394; at 620, 161,016 of 186,000 were acknowledged and 24,984 expired. The Mac copy is at `evidence/DX-BM1/bench3/bench3-tx5`, with the 7,401,632-byte summary and 57,389,683-byte raw archives checked member by member, and the pinned-analyser readout. The rental had cost about USD 5.03 at 18:50 UTC. [Checksums](SHA256SUMS)
