# Preregistered predictions for pipelined import frames

The archived bare-metal run `i13-1/tail-128` has 4,943 matched 128-fact frames. Elapsed from offer through durable local cursor update was 19.52 ms p50 and 49.94 ms p99. Among those frames, average elapsed was 21.84 ms.

| Stage | p50 ms | Mean ms | p99 ms |
|---|---:|---:|---:|
| SDK before HTTP | 3.20 | 3.46 | 5.93 |
| HTTP client and transport outside gateway | 1.23 | 1.45 | 3.84 |
| Gateway preparation | 2.27 | 2.48 | 8.55 |
| Other gateway work | 0.81 | 0.93 | 5.12 |
| Ready lane queue | 0.02 | 1.24 | 25.76 |
| Dispatch to native start | 2.48 | 2.64 | 8.36 |
| Datomic apply | 3.43 | 4.08 | 19.80 |
| Rest of native transaction | 2.10 | 2.28 | 8.45 |
| Native end to peer return | 1.98 | 2.17 | 7.90 |
| SDK receipt and durable cursor | 1.06 | 1.10 | 1.60 |

Means sum per frame. Percentiles should be read individually. The archived traffic used 128-fact frames. The 8-ms completion interval for a 24-fact frame is a throughput requirement and the 8.4-ms single-frame estimate is a forecast. The HTTP round trip, peer return and SQLite fsync are separate measured intervals. The native remainder includes other transaction work and offers no per-command split for disk and peer apply. The [archive audit](EVIDENCE5.md) documents clock bounds and source binding.

## One database with 50 noisy saves/s, 5 quiet saves/s and 55 reads/s

Rates below are queryable business facts per second at 240 offered frames/s. Ratios use the earlier faster save/read control (10.92/4.01 ms). Repeat against each fresh control. Live-ready priority leaves at most **one previously submitted import transaction** ahead of a ready save, regardless of the HTTP window. The wait column is the forecast p99 of the **entire peer hold** as a worst-position blocking estimate for an arriving save. Absolute maximum wait has no millisecond bound under JVM pauses, Datomic stalls or an existing live backlog.

| Facts/frame | HTTP frames in flight | Facts/s | Wait behind one import frame | Quiet save p99 ratio | Quiet read p99 ratio |
|---:|---:|---:|---:|---:|---:|
| 16 | 1 | 1,950 | 9 ms | 1.28 | 1.62 |
| 16 | 2 | 3,040 | 9 ms | 1.46 | 1.69 |
| 16 | 4 | 3,160 | 10 ms | 1.53 | 1.78 |
| 16 | 8 | 3,100 | 12 ms | 1.63 | 1.96 |
| 24 | 1 | 2,850 | 10 ms | 1.47 | 1.87 |
| 24 | 2 | 3,600 | 10 ms | 1.61 | 2.00 |
| 24 | 4 | 3,700 | 11 ms | 1.72 | 2.19 |
| 24 | 8 | 3,550 | 13 ms | 1.82 | 2.39 |

The model credits overlap before dispatch and after peer return. It charges dispatch, native work and peer return to the serial lane. Native apply at 16/24 is forecast at 0.9/1.2 ms p50. Part 5's one-outstanding forecasts carry through, and p99 rises with higher frame rate because reads and writes compete for gateway and storage resources. The best early discriminators are 16×2 and 24×2. No arm is predicted to satisfy every neighbour's 1.5× allowance.

This model would need revision if low-depth frames spend most elapsed time in the peer hold, or 16×2 and 24×2 add less than 15% queryable goodput over their depth-one controls at similar offered load. Any second bulk submission before the first peer release, or any bulk dispatch past a ready live save, disproves the scheduling bound. An arm sustaining at least 3,000 queryable facts/s with zero missed offers and all eleven neighbours inside both paired controls' 1.5× allowance refutes the predicted frontier.
