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
