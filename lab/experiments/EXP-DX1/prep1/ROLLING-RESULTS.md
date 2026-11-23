# Rolling release cuts the queue at full size

**North star P2.** One database, 162,456,470 facts, exact durable receipt for each accepted save, 300-second open-loop windows. Live offers at 394/s all became durable in the six-credit rolling arm. In-window delivery was 391.85/s and the second-half p99 was still 5.07 seconds. Results use the owner’s P6 rule that either a quiet ratio of 1.25× or loaded quiet p99 of 50 ms suffices. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Busy accounts and capacity

| Policy | Offered/s | ACKs/s whole · first / second | Expired | ACK p50 / p99 first half | ACK p50 / p99 second half |
| --- | ---: | ---: | ---: | ---: | ---: |
| Barrier 6 | 235 | 235.00 · 235.03 / 234.97 | 0 | 15 / 5,575 ms | 7 / 46 ms |
| Rolling 6 | 235 | 235.00 · 235.03 / 234.97 | 0 | 7 / 2,706 ms | 5 / 32 ms |
| Rolling 12 | 235 | 235.00 · 235.03 / 234.97 | 0 | 7 / 2,741 ms | 5 / 32 ms |
| Barrier 6 | 394 | 353.12 · 340.42 / 365.83 | 1,060 | 17,113 / 27,489 ms | 28,073 / 30,005 ms |
| Rolling 6 | 394 | 391.85 · 392.14 / 391.55 | 0 | 996 / 6,155 ms | 321 / 5,067 ms |
| Rolling 12 | 394 | 394.00 · 392.79 / 395.21 | 0 | 1,194 / 7,227 ms | 220 / 2,455 ms |
| Barrier 6 | 620 | 391.78 · 374.39 / 409.16 | 54,553 | 29,878 / 30,021 ms | 29,969 / 30,024 ms |
| Rolling 6 | 620 | 454.02 · 422.55 / 485.49 | 36,164 | 29,613 / 30,020 ms | 29,821 / 30,024 ms |
| Rolling 12 | 620 | 473.80 · 440.70 / 506.89 | 26,865 | 29,019 / 30,040 ms | 29,203 / 30,044 ms |

At 394, rolling 6 beat the 381/s forecast and returned all 118,200 receipts, including 646 during drain. It had 2,279 outstanding at 20 seconds and cleared the queue by 60 seconds, when the observer saw zero outstanding. The 287 unacknowledged at the midpoint fell to seven by second 160. A new backlog reached 2,117 at second 221, was zero at 240 and reached 1,825 by 290. Rolling 12 also cleared the queue at 240 after a peak of 1,002 outstanding at 219. The five-second late tail is recurring queue formation and recovery. The loaded cell follows a solo cell. Its early interval measures the beginning of busy service on a broader working set.

The excess ledger clips each durable save at scheduled offer plus 50 ms. Each subsequent millisecond belongs to exactly one stage. Halves use scheduled offer time, with late ACKs still credited to the original offer. Milliseconds are summed over all accounts, including quiet. Reply includes native return, response build and transit. The final column includes sender encoding, request transit, time waiting for the previous request at the gateway, ready-to-append and unaligned HTTP. Values below 0.1% are still included in the totals.

| 394/s arm and half | Saves over 50 ms | Excess save-s | Offer → grant | Prepare | Submit | Native queue | Apply | Append | Reply | Other |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Barrier 6 first | 58,462 | 964,842 | 99.93% | 0.01% | <0.01% | 0.03% | 0.01% | <0.01% | <0.01% | <0.01% |
| Barrier 6 second | 57,581 | 1,610,837 | 99.96% | <0.01% | <0.01% | 0.01% | <0.01% | <0.01% | <0.01% | <0.01% |
| Rolling 6 first | 44,134 | 111,271 | 99.51% | 0.06% | 0.01% | 0.24% | 0.09% | 0.03% | 0.04% | 0.02% |
| Rolling 6 second | 37,272 | 82,744 | 99.45% | 0.06% | 0.01% | 0.27% | 0.10% | 0.03% | 0.06% | 0.03% |
| Rolling 12 first | 46,776 | 134,937 | 99.07% | 0.06% | 0.23% | 0.47% | 0.08% | 0.02% | 0.05% | 0.03% |
| Rolling 12 second | 36,896 | 37,093 | 97.40% | 0.14% | 0.62% | 1.33% | 0.22% | 0.06% | 0.16% | 0.07% |

Offer-to-grant includes waits for all eligible credits and a person's own predecessor, plus any sender scheduling delay before the grant. The table locates the excess on the queue's clock. A pause or background job can slow releases and cause later offers to accrue debt in that stage.

Rolling 6 rebuilt debt in seconds 200–221 and 270–290. At 200–220, the transactor used 2.68–2.71 cores out of three, the serial apply thread was occupied 94% of wall time and the five neighbour credits were full for virtually the entire interval. The sender used 0.14–0.15 cores, the writer used 0.63–0.81 of four and PostgreSQL used 0.37–0.42 of one. Index adoption at 219.03 s came after debt had already accumulated. The next spell coincided with adoption at 285.27 s and a requested checkpoint in the 280–290 s bin. No checkpoint increment occurred at 200–220 s, so a checkpoint cannot explain both spells. Ten-second counters can localize contention and overlap. They cannot assign its trigger to index construction, particular cache reads or a JVM pause.

| At rolling 6 | 235 | 394 | 620 |
| --- | ---: | ---: | ---: |
| SQL reads/save | 0.61 | 1.35 | 1.32 |
| SQL reads/save, seed predecessor / ordered predecessor | 1.06 / 0.38 | 1.51 / 1.30 | 1.60 / 1.26 |
| Apply mean | 1.28 ms | 1.98 ms | 1.94 ms |
| Native append p99 | 1.71 ms | 2.98 ms | 3.11 ms |
| SQL + decode mean | 0.48 ms | 1.05 ms | 1.02 ms |
| Second-half CPU, transactor / writer / PG / sender | 0.61 / 0.56 / 0.18 / 0.10 | 1.84 / 0.88 / 0.34 / 0.19 | 2.25 / 1.16 / 0.40 / 0.23 |

At 620, all five neighbour credits were occupied 99.4% of the time in both rolling 6 halves. The union of serial apply intervals occupied 92.2% early and 87.2% late. At rolling 12, the eleven credits were occupied 98.8% early and 99.2% late, with 94.6% and 90.5% apply occupancy. Six credits are a binding limit on overlapping wait with useful work. Twelve raised late service from 485.49 to 506.89/s without materially changing late apply cost per save (1.80 to 1.79 ms from interval occupancy and rate). Whole-cell cost was 1.94 and 1.87 ms, implying raw apply-only ceilings near 516 and 535/s, before handoff and append. Mean SQL plus decode was 1.02 ms/save at rolling 6. The sender used 0.23–0.24 of one late core and the writer 1.16–1.24 of four at overload. Writer pauses still matter for individual saves. Removing whole-turn waits bought 62.24/s over the barrier. The next substantial gain needs cheaper native applies.

## Quiet account

| Offered/s | Barrier 6 solo → loaded p99 | Rolling 6 solo → loaded p99 | Rolling 6 loaded p99 first / second | Rolling 6 full P6 |
| --- | ---: | ---: | ---: | --- |
| 235 | 31.19 → 86.43 ms | 30.85 → 43.91 ms (1.42×) | 50.68 / 34.89 ms | Meets 50 ms |
| 394 | 14.53 → 114.57 ms | 21.60 → 54.00 ms (2.50×) | 56.11 / 50.67 ms | Misses both |
| 620 | 15.67 → 126.87 ms | 14.97 → 61.79 ms (4.13×) | 61.79 / 44.80 ms | Misses both |

Rolling 12 quiet solo to loaded p99 was 31.95 → 98.95 ms, 30.23 → 105.67 ms and 23.65 → 114.51 ms at 235, 394 and 620/s respectively. The loaded p99-ranked rolling 12 save at 620 had eleven neighbours ahead and waited 88.88 ms in the native queue, with 87.58 ms overlapping their apply.

The matched solo p99-ranked saves at 235 and 620 spent 14.88 and 6.35 ms on their own apply and 9.20 and 5.63 ms on preparation. At 394 the solo rank had 7.70 ms before its grant despite zero neighbours and a 6.08 ms estimated transport return. Broader solo tail samples also show writer safepoints. Below is the actual p99-ranked loaded save and the count among the 11 saves at or above that rank. The writer clock is aligned within documented causal bounds. Pause and previous-save overlap can coincide with any stage.

| Rolling 6 at | At the loaded p99 rank | Of the 11 tail saves, counts with ≥5 ms neighbour apply in native queue / ≥5 ms writer safepoint overlap / earlier quiet ACK pending |
| --- | --- | ---: |
| 235/s | 31.80 ms prepare with 26.62 ms writer safepoint overlap. One neighbour ahead, 6.19 ms native queue and 0.47 ms append. | 8 / 3 / 2 |
| 394/s | Five neighbours ahead, 19.21 ms native queue with 16.03 ms overlapping their apply, 9.95 ms own apply and 18.44 ms native reply. Writer safepoint overlapped 26.09 ms of the offer-to-ACK interval. No preceding quiet ACK outstanding. Append was 0.68 ms. | 9 / 4 / 3 |
| 620/s | Four neighbours ahead, 11.51 ms before grant, 7.92 ms native queue with 7.87 ms neighbour apply, and 36.61 ms estimated response transport with no observed JVM safepoint. The preceding quiet ACK was still outstanding at offer time. Append was 0.49 ms. | 6 / 2 / 5 |

Reader and transactor safepoints contributed less than 5 ms of overlap in all 33 loaded quiet tail rows above. At 394, writer ZGC and shorter applies are the strongest direct tail levers. At 620, quantify the sender/HTTP callback side as well. Its p99-ranked row spent most of its time after the gateway had prepared its reply, where the clock cannot separate networking from scheduling. ZGC may help the other slow rows. It cannot account for this row's late return. The 394 window needs 4 ms off quiet p99 and 620 needs 11.79 ms. Forecast ≤50 ms for both only in the combined arm, with more uncertainty at 620.

At unchanged solo p99, the 1.25× bar gives loaded budgets of 27.0 ms at 394 and 18.7 ms at 620, just 5.4 and 3.7 ms beyond solo. Test a native neighbour cap of about two once applies are cheaper, plus pause and response-path control. Cutting in-flight work with the current native cost would put goodput at risk.

## Default

Use rolling 6 for the one-branch headline via `--credit-mode rolling6` or `DX_V01_CREDIT_MODE=rolling6`. Keep barrier 6 selectable as the control. The six-credit rule releases each save's opportunity after its validated durable ACK, reserves one opportunity for quiet, and grants it before another eligible neighbour. At most five earlier neighbour grants can be in flight. Both rolling arms stored all 118,200 offers at 394. Rolling 12 adds 2.15/s in-window and shortens the late busy p99 to 2.46 s, with a worse whole-window p99 of 7.05 s vs 5.98 s and quiet p99 of 105.67 vs 54.00 ms. It also loses quiet's 50 ms result at 235. At 620 the +19.78/s whole-window gain is real, but it still expires 26,865. Six trades that peak throughput for stronger isolation. A 394-only rolling 8 check is worth considering after apply gets cheaper. Rolling 16 allows 15 neighbours ahead while width 12 is already near the current serial ceiling. No priority-2 394 latency claim is made for either width.

## Next experiment and full-load budget

Assume 75% utilization as a planning target under variable service. That requires roughly 525 durable saves/s for 394 offered, with 80% requiring 493/s and the measured 485.49/s late saturation already giving about 81%. Neither utilization by itself proves a p99. Early overloaded service at 422.55/s puts 394 at 93% utilization. A single-thread stage at 1.94 ms/save already has a raw ceiling around 516. Target about 1.6 ms serial apply or less to leave room for append/scheduling and go beyond 525. At 394 the mean SQL+decode budget is about 1.05 ms/save. Approximately 0.4 ms less serial work would take 1.98 to 1.58 ms and raise the raw ceiling to about 633/s. The previous lookup ledger located 0.840 EAVT and 0.977 AEVT loads/save. DX-W1 owns removing size-dependent reads; that is the capacity lever to combine with the new admission. The write-gateway collector arm is a tail lever. The older W1 diagnostic placed at least 85.8% of the slowest 1%'s preparation in safepoints, despite lower preparation p99 on this public checkpoint. Rolling already overlaps multiple gateway preparations and durable appends. A separate sender preparation pool would target a sender using only 0.19–0.23 cores here. [DX-W1 serial and pauses](https://github.com/OnboardedInc/Triplex-db-experiments/blob/ff4346209/REPORT-DX-W1.md) · [Cold-load reading](https://github.com/OnboardedInc/Triplex-db-experiments/blob/43310b304/lab/experiments/EXP-DX1/jvm1/COLD-START.md)

The next arm is optional fresh-first over rolling credits. Allow overdue work to keep settling while fresh eligible heads for other people pass. It can interrupt backlog propagation without discarding that work. It cannot retroactively make a late offer meet 50 ms or sustain a long-term overload. The build and 120-minute command are in [the forecast handoff](FRESH-FIRST.md).

## Custody

The three transferred checkpoints and both compressed archives match the published manifest. Each checkpoint identifies the sealed plan and seed, owned slot and attempt, offer tape, header and terminal cut. The recount checks every consumed raw member's digest against that arm's expected digest before joining exact receipt bytes and bound database/native t. It verifies conservation after the 50 ms cut and checks dated pause logs on the same host clock. Host counters are attributed to the checkpoint's source, slot and attempt. It emits diagnostics. The original archives remain compressed under `evidence/DX-BM1/bench3/bench3-rolling-main`. The derived ledger is `evidence/DX-PREP1/p15-read/checkpoints-timing.json.gz`. [Checkpoint reader](read-rolling-checkpoints.py) · [Published run](https://github.com/OnboardedInc/Triplex-db-experiments/blob/1b2eaf8bbcbea2117b4bc87fd4c8b915dc9888a8/lab/experiments/EXP-DX1/bm1/ROLLING-READING.md) · [Evidence manifest](SHA256SUMS)
