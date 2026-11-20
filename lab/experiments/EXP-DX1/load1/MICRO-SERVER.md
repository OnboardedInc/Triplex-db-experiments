# Single-server microframe prediction

At 50 aggregate noisy saves/s plus the quiet account, predict 1,950 / 2,850 / 3,440 queryable facts/s for 16 / 24 / 32 facts/frame. These correspond to observed mean frame intervals of about 8.2 / 8.4 / 9.3 ms. At 130 frames/s the hard ceilings are 2,080 / 3,120 / 4,160. Twenty-four facts need 125 successful frames/s and 8 ms between completions. Two matched 108-second live-only controls bracket every arm.

| Facts/frame | Predicted native apply p50 | Predicted quiet save/read p99 ms | Ratios against earlier faster control (10.92 / 4.01 ms) |
|---:|---:|---:|---:|
| 16 | 0.9 ms | 14 / 6.5 | 1.28 / 1.62 |
| 24 | 1.2 ms | 16 / 7.5 | 1.47 / 1.87 |
| 32 | 1.5 ms | 19 / 8.5 | 1.74 / 2.12 |

The model prices the overnight 128-fact arm's 3.43-ms apply, approximately 2 ms from native completion to peer return, and the fixed HTTP, receipt, and cursor costs. The tighter overnight control allowed 5.46 ms more on saves and 2.00 ms more on reads. The model predicts every arm will miss at least one limit. It extrapolates from 128-fact frames and 55 offered saves/s. The new paired workload offers more reads, so report ratios against each actual control and publish every account's results.

Run from the published experiment branch on one assigned server, using the operator-provided `BENCH_SERVER` and a new tag.

```sh
HA1_BENCH_HOURS=2 node --import tsx lab/experiments/EXP-DX1/ha1/control.ts load-micro load-micro-001 one-host
```

An arm reports chronological offers, measured gateway hold/queue and exact frame bytes, committed and independently queryable prefixes, and original receipts across a deliberately discarded reply. A bar comparison requires every originally offered live save and read to verify and every neighbouring account's p99 to be inside its own controls.
