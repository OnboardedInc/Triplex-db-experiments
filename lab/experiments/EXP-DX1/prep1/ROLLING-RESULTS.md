# Rolling release cuts the queue at full size

**North star P2.** One database, 162,456,470 facts, exact durable receipt for each accepted save, 300-second open-loop windows. Live offers at 394/s all became durable in the six-credit rolling arm. In-window delivery was 391.85/s and the second-half p99 was still 5.07 seconds. Results use the owner’s P6 rule that either a quiet ratio of 1.25× or loaded quiet p99 of 50 ms suffices. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Busy accounts and capacity

| Policy | Offered/s | ACKs/s whole · first / second | Expired | ACK p50 / p99 first half | ACK p50 / p99 second half |
| --- | ---: | ---: | ---: | ---: | ---: |
| Barrier 6 | 235 | 235.00 · 235.03 / 234.97 | 0 | 15 / 5,575 ms | 7 / 46 ms |
| Rolling 6 | 235 | 235.00 · 235.03 / 234.97 | 0 | 7 / 2,706 ms | 5 / 32 ms |
| Barrier 6 | 394 | 353.12 · 340.42 / 365.83 | 1,060 | 17,113 / 27,489 ms | 28,073 / 30,005 ms |
| Rolling 6 | 394 | 391.85 · 392.14 / 391.55 | 0 | 996 / 6,155 ms | 321 / 5,067 ms |
| Barrier 6 | 620 | 391.78 · 374.39 / 409.16 | 54,553 | 29,878 / 30,021 ms | 29,969 / 30,024 ms |
| Rolling 6 | 620 | 454.02 · 422.55 / 485.49 | 36,164 | 29,613 / 30,020 ms | 29,821 / 30,024 ms |

At 394, rolling 6 beat the 381/s forecast and returned all 118,200 receipts, of which 646 arrived in drain. Only 58,821 ACKs had arrived by the midpoint, when the jittered tape had offered 59,108. The outstanding balance grew from 287 there to 646 at 300 seconds. At the separate overloaded cell's observed warm service of 485.49/s, a backlog of 287 would drain in about three seconds after subtracting 394 arrivals/s. It did not shrink across this half. A single inherited cold backlog plus a steady 485/s server is insufficient to explain it. Earlier under-load effects, later service stalls and recurrent bursts can coexist. The checkpoint halves cannot identify their shares or timestamp the recovery. The first loaded cell follows a solo cell and does not time process startup.

The rolling 6 whole-window 394 stage p99 is 5,965.43 ms before the request was sent, against 33.89 ms HTTP, 34.05 ms credit hold, 4.16 ms preparation, 19.0 ms submit-to-entry, 6.59 ms apply and 1.91 ms ready-to-append. The native append distribution is tabulated below. These are separately ranked populations and cannot be subtracted or added to obtain a per-save excess ledger. The 394 tail remains upstream credit/admission queueing in magnitude. Its part that is credit hold on the preceding save versus sender scheduling or same-person eligibility needs the raw rows.

| At rolling 6 | 235 | 394 | 620 |
| --- | ---: | ---: | ---: |
| SQL reads/save | 0.61 | 1.35 | 1.32 |
| SQL reads/save, seed predecessor / ordered predecessor | 1.06 / 0.38 | 1.51 / 1.30 | 1.60 / 1.26 |
| Apply mean | 1.28 ms | 1.98 ms | 1.94 ms |
| Native append p99 | 1.71 ms | 2.98 ms | 3.11 ms |
| SQL + decode mean | 0.48 ms | 1.05 ms | 1.02 ms |
| Second-half CPU, transactor / writer / PG / sender | 0.61 / 0.56 / 0.18 / 0.10 | 1.84 / 0.88 / 0.34 / 0.19 | 2.25 / 1.16 / 0.40 / 0.23 |

At 620, multiplying the whole-cell 1.94 ms mean by 454/s leaves about 88% of a serial apply thread occupied, or 94% if the same mean holds at the late rate of 485.49/s. The serial apply ceiling from that mean is about 516/s. The sender and writer each used much less than their pinned budgets of one and four cores. Means cannot exclude a single saturated thread or pauses. Rolling 6 improves saturated goodput by 62.24/s over the barrier. Retaining independent releases matters, and the whole-arm apply footprint accounts for most of the remaining ceiling. Wider rolling credits at the same native work will show how much opportunity remains.

## Quiet account

| Offered/s | Barrier 6 solo → loaded p99 | Rolling 6 solo → loaded p99 | Rolling 6 loaded p99 first / second | Rolling 6 full P6 |
| --- | ---: | ---: | ---: | --- |
| 235 | 31.19 → 86.43 ms | 30.85 → 43.91 ms (1.42×) | 50.68 / 34.89 ms | Meets 50 ms |
| 394 | 14.53 → 114.57 ms | 21.60 → 54.00 ms (2.50×) | 56.11 / 50.67 ms | Misses both |
| 620 | 15.67 → 126.87 ms | 14.97 → 61.79 ms (4.13×) | 61.79 / 44.80 ms | Misses both |

The five-neighbour bound is a grant-count guarantee. Five mean applies at about 1.98 ms each can put about 10 ms of serial work ahead of the quiet save. A long apply, pause, append or an outstanding previous quiet save can consume more. The checkpoint contains no individual quiet clocks, native queue overlaps or safepoints. Claiming a particular cause for the p99 would exceed the evidence. The 394 late p99 needs only 0.67 ms to cross 50 ms, but the full window needs 4.00 ms and the 620 window 11.79 ms. Test shorter upstream debt and the writer on ZGC. To meet the ratio itself at the observed solo p99, 394 needs ≤27.0 ms loaded and 620 ≤18.7 ms. The additional budget above solo is only 5.4 / 3.7 ms. That likely requires fewer native neighbours ahead (about two or fewer at the observed mean), shorter applies and less pause overlap together. Simply reserving the admission credit did not buy enough. Reducing the neighbour cap before work gets cheaper could lose the throughput margin.

## Next experiment and full-load budget

Assume 75% utilization as a planning target under variable service. That requires roughly 525 durable saves/s for 394 offered, with 80% requiring 493/s and the measured 485.49/s late saturation already giving about 81%. Neither utilization by itself proves a p99. Early overloaded service at 422.55/s puts 394 at 93% utilization. A single-thread stage at 1.94 ms/save already has a raw ceiling around 516. Target about 1.6 ms serial apply or less to leave room for append/scheduling and go beyond 525. At 394 the mean SQL+decode budget is about 1.05 ms/save. Approximately 0.4 ms less serial work would take 1.98 to 1.58 ms and raise the raw ceiling to about 633/s. The previous lookup ledger located 0.840 EAVT and 0.977 AEVT loads/save. DX-W1 owns removing size-dependent reads; that is the capacity lever to combine with the new admission. The write-gateway collector arm is a tail lever. The older W1 diagnostic placed at least 85.8% of the slowest 1%'s preparation in safepoints, despite lower preparation p99 on this public checkpoint. Rolling already overlaps multiple gateway preparations and durable appends. A separate sender preparation pool would target a sender using only 0.19–0.23 cores here. [DX-W1 serial and pauses](https://github.com/OnboardedInc/Triplex-db-experiments/blob/ff4346209/REPORT-DX-W1.md) · [Cold-load reading](https://github.com/OnboardedInc/Triplex-db-experiments/blob/43310b304/lab/experiments/EXP-DX1/jvm1/COLD-START.md)

The next arm is optional fresh-first over rolling credits. Allow overdue work to keep settling while fresh eligible heads for other people pass. It can interrupt backlog propagation without discarding that work. It cannot retroactively make a late offer meet 50 ms or sustain a long-term overload. The build and 120-minute command are in [the forecast handoff](FRESH-FIRST.md).

## Custody

The Mac checkpoints match BM1’s manifest. Each verifies the exact plan and seed digests, source, the current owned slot and attempt, header and completion hashes, matched tape, and the offer/ACK and terminal-cut denominators. Their named raw paths are hashes only. The reader emits neither a product receipt nor a performance acceptance verdict. A raw recount additionally verifies consumption against the same checkpoint file hashes and joins each receipt to the exact bound database/native t before attributing stages. The original archives remain unmodified. [Checkpoint reader](read-rolling-checkpoints.py) · [Published run](https://github.com/OnboardedInc/Triplex-db-experiments/blob/0e5795578/lab/experiments/EXP-DX1/bm1/ROLLING-READING.md)
