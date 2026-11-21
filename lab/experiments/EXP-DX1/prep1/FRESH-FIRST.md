# Keep the old queue from setting the tail

**North star P2.** Measure scheduled offer to durable ACK, with exact predecessor order and all offered outcomes accounted for. The experiment changes the ingress order of different people. It preserves the ordinary journal, ordered identities and PostgreSQL's synchronous durability. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Policy

The optional `Admission.freshFirst` setting keeps rolling credit release and the quiet reservation. Among ready neighbours, it serves person heads queued for at most 20 ms first. When both classes stay ready it serves an eligible overdue head after seven fresh neighbour grants. If either class has no eligible head, the other can use the credit. Quiet always goes first when ready and does not consume a neighbour's overdue turn. Pending commands for the same person remain in offer order. A held or uncertain predecessor cannot be bypassed. The existing 30-second pre-submit expiry and lost-ACK recovery still apply. Advancing unrelated fresh work does not turn an already late save into an on-time one.

At 394/s, 20 ms corresponds to about eight global offers. The measured 485.49/s late-window saturation gives roughly 425/s for the fresh lane even while it yields an eighth of grants. Its early counterpart at 422.55/s gives 370/s, so this cannot absorb every early offer within 50 ms. It should keep the slow interval from penalizing as many subsequent people. At 620/s, both policies can expire valid offers. Every expiry remains visible. The latency quantiles include every ACK by offer cohort, even if the ACK arrived in drain. Qualification still needs progress as well as latency. [Rolling-arm reading](ROLLING-RESULTS.md)

## Server handoff

On the assigned physical host, use a clean, built checkout at the server revision in [REPORT.md](REPORT.md). The same prepared stopped template at position 87,002 carries 162,456,470 facts and ten accounts of 100,000 people. Each arm validates the original seal, independently copies PostgreSQL, verifies separate WAL by device, exact predecessors and installed writer settings, then releases its own copy. Use the existing Java 21 and Java 25 pinned images, PostgreSQL 17, an ext4 second NVMe and the same file-level seed and evidence directories required by the rolling command.

```bash
DX_PREP1_FRESH_CREDITS=6 DX_BARE_METAL=1 node lab/bin/heavy.mjs --label DX-PREP1-fresh -- \
  bash lab/experiments/EXP-DX1/prep1/server.sh fresh "$OUT" "$(git rev-parse HEAD)" \
  "$SCALE1_IMAGE" 77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
  1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
  --pg-data "$SCALE1_PGDATA" --wal-mount "$SCALE1_WAL_MOUNT" --write-jvm j25-zgc
```

Arms are rolling 6 on Java 21 G1, rolling 6 plus fresh-first on Java 21 G1, and that policy with Java 25 ZGC only on the write gateway. All transactors use Java 25 ZGC on three cores and a 16 GiB object cache with separate WAL. Every arm runs matched solo and loaded 300-second windows at 235, 394 and 620/s, with 1,050 quiet offers per window and 1,900 people in each busy neighbour's active set. The reader peer checks the journal after each window. The measured run does not include additional background reader load. Ninety minutes of offers fit under the 120-minute hard campaign cutoff if three copies, startup, verification and cleanup take at most 30 minutes. The prior two arms took about 38 minutes apiece by their checkpoint file timestamps. Budget 115–118 minutes here with staged images and the same NVMe copy speed. If a copy or collection overruns, the launcher stops, retains the partial evidence and leaves the result unqualified.

Retain all prior counters and logs. The additions are excess-save time by first/second offer half, matching quiet excess ledgers, ranked quiet-save clocks, native neighbour apply and JVM pause overlaps, one-second offered-minus-granted/ACKed balances, and the overdue grants. CPU/throttle and PostgreSQL counters stay at one second. The producer and selector log the actual writer collector and late classification. Readbacks bind each Java image and collector to its own role. Overlap is diagnostic. A scheduled-minus-ACKed gap also includes expiries under overload.

## Forecast before launch

All numbers are predictions. Busy rate is in-window ACKs per second. Busy latency includes every ACK for the offered cohort and states expiries separately. The quiet pair reports p99 in ms, with 3.5/s and approximately 7 ms p50 in every solo arm. Time columns are ms.

| Arm | Offered/s | Stored/s whole / second | Busy p50 / p99 whole | Busy p50 / p99 second half | Quiet p99 alone → loaded |
| --- | ---: | ---: | ---: | ---: | ---: |
| Rolling 6 | 235 | 235 / 235 | 5 / 2,600 | 5 / 34 | 30 → 44 |
| Rolling 6 | 394 | 392 / 392 | 640 / 6,000 | 320 / 5,100 | 21 → 54 |
| Rolling 6 | 620 | 454 / 485 | 29,730 / 30,025 | 29,820 / 30,025 | 15 → 62 |
| Fresh-first | 235 | 235 / 235 | 6 / 1,200 | 5 / 39 | 30 → 42 |
| Fresh-first | 394 | 392 / 394 | 10 / 1,300 | 9 / 85 | 21 → 53 |
| Fresh-first | 620 | 454 / 480 | 24 / 29,990 | 23 / 29,990 | 15 → 57 |
| Fresh-first + writer ZGC | 235 | 235 / 235 | 5 / 400 | 5 / 29 | 21 → 35 |
| Fresh-first + writer ZGC | 394 | 393 / 394 | 9 / 300 | 8 / 48 | 18 → 45 |
| Fresh-first + writer ZGC | 620 | 468 / 483 | 21 / 29,980 | 20 / 29,980 | 14 → 49 |

At 235 and 394 prefer zero expiry. At 620 the respective forecasts imply roughly 36k, 48k and 44k expiries after drain, since the queue policy leaves some older work in debt. The throughput forecast for fresh-first depends on sender CPU staying well below one full core. The ZGC prediction depends on less pause overlap without a new writer CPU bottleneck. Reject the policy if it shifts tail time to overdue people without reducing original-clock busy p99 or decreases durable delivery materially at 394. The 50 ms target applies to the whole qualifying offer cohort, so even the forecast ZGC arm would leave that bar open despite a second half below 50 ms. [Fresh full-size reading](SCORECARD-FRESH-READING.md)
