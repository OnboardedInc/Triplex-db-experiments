# Transactor CPU placement, part 6

One variable is the complete placement plan on the same eight CPUs. A: TX 0, PG 1, write gateway 2, writer 3, background/readers 4–7, read gateway 4. B: TX 0–1, PG 2, write gateway 3, writer 4, background/readers 5–7, read gateway 5. Other knobs and memory limits remain identical; cache 1280 MiB, REV_AEVT=0, snapshot broadcast. These are diagnostics, not a full verdict.

# tx2-dxt1-p6-cores0-a

Source 7629065bb0a0221b3ec27af2f5a6f030bd33487f; one session, common host/VM sampling, 10,000 subjects, frozen 200-second zero-reader segment. Control is mean bookend control-arm quantiles; no pooled-percentile claim. Host context spans first scheduled to last finished primary commit; post-run oracle CPU is excluded.

| arm / level | p50 ms | p99 ms | control p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- | --- |
| baseline / full | 11.466 | 45.505 | 11.362 / 44.867 | 0.104 / 0.91% | 4.733 (4.733-4.733) | 10.6 / 101.6 |
| candidate / full | 10.654 | 36.958 | 11.362 / 44.867 | -0.708 / -6.23% | 4.733 (4.733-4.733) | 11.0 / 88.9 |
| baseline / full | 11.259 | 44.229 | 11.362 / 44.867 | -0.104 / -0.91% | 4.733 (4.733-4.733) | 11.4 / 80.4 |

Controls: tx2-dxt1-p6-cores0-a-1-baseline, tx2-dxt1-p6-cores0-a-3-baseline. Each arm: 3420 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.

Native medians / p99, same source, tracing and host context as the corresponding arm above. Independent quantiles do not add. Submit/ACK residuals include messaging, queueing, encoding and peer application; the native-read start is inferred from the native duration/event timestamp, not a transport measurement. Individual messaging-thread run-queue waits remain unmeasured.

| arm | peer wait ms | native process ms | submit residual ms | ACK residual ms | cold SQL commits / total |
| --- | --- | --- | --- | --- | --- |
| 1-baseline | 5.666/32.590 | 3.490/23.000 | 0.877/7.927 | 0.874/5.741 | 284/3420 |
| 2-candidate | 5.070/23.093 | 3.010/16.600 | 0.839/5.965 | 0.855/5.629 | 237/3420 |
| 3-baseline | 5.687/30.750 | 3.520/23.600 | 0.846/7.329 | 0.883/5.333 | 267/3420 |

# tx2-dxt1-p6-cores256-a

Source 7629065bb0a0221b3ec27af2f5a6f030bd33487f; one session, common host/VM sampling, 10,000 subjects, frozen 300-second reader-ladder diagnostic (normal 45-second levels, not a full verdict). Control is mean bookend control-arm quantiles; no pooled-percentile claim. Host context spans first scheduled to last finished primary commit; post-run oracle CPU is excluded.

| arm / level | p50 ms | p99 ms | control p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- | --- |
| baseline / full | 13.403 | 58.996 | 13.220 / 54.925 | 0.183 / 1.38% | 4.733 (4.733-4.733) | 11.1 / 92.6 |
| candidate / full | 12.182 | 49.842 | 13.220 / 54.925 | -1.038 / -7.86% | 4.726 (4.726-4.733) | 11.0 / 77.6 |
| baseline / full | 13.037 | 50.854 | 13.220 / 54.925 | -0.183 / -1.38% | 4.726 (4.726-4.726) | 10.6 / 99.1 |

Controls: tx2-dxt1-p6-cores256-a-1-baseline, tx2-dxt1-p6-cores256-a-3-baseline. Each arm: 3530 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.

| arm | L256 small commit p50 / p99 ms | L256 read p99 ms | correct pulls/s | phase swap GiB / Mac CPU % |
| --- | --- | ---: | ---: | --- |
| baseline | 10.943 / 161.097 | 6.271 | 42687.4 | 4.733 / 10.1 |
| candidate | 11.903 / 44.939 | 7.327 | 40131.0 | 4.726 / 12.2 |
| baseline | 11.583 / 21.715 | 6.175 | 43139.0 | 4.726 / 11.4 |

Native medians / p99, same source, tracing and host context as the corresponding arm above. Independent quantiles do not add. Submit/ACK residuals include messaging, queueing, encoding and peer application; the native-read start is inferred from the native duration/event timestamp, not a transport measurement. Individual messaging-thread run-queue waits remain unmeasured.

| arm | peer wait ms | native process ms | submit residual ms | ACK residual ms | cold SQL commits / total |
| --- | --- | --- | --- | --- | --- |
| 1-baseline | 6.771/41.006 | 4.110/32.000 | 0.957/13.071 | 1.020/6.393 | 359/3530 |
| 2-candidate | 5.755/30.337 | 3.460/22.900 | 0.912/6.891 | 0.944/6.138 | 324/3530 |
| 3-baseline | 6.608/36.348 | 4.090/29.800 | 0.945/8.429 | 0.991/5.678 | 345/3530 |

Two cores lower all-primary commit p50 by 0.708 ms at zero readers (bookend drift 0.207 ms) and 1.038 ms loaded (drift 0.366 ms). Loaded peer p50 falls about 0.934 ms versus 0.163-ms peer drift; most gain is inside the native process interval. This does not prove a particular messaging thread was CPU starved.

Tradeoff: L256 small p50 is 11.903 ms versus controls 10.943/11.583 ms; the 0.640-ms increase is as large as their 0.640-ms drift. Read goodput falls about 6.5%, though read p99 remains below 10 ms and lag below 250 ms. The complete phase table shows steady L256 peer p50 stays within drift: 6.089/6.488/6.583 ms in A/B/A, native process 4.33/4.70/4.83 ms. Leave this placement an explicit candidate, not the default, until a full pair qualifies its reader tradeoff. No L256 small-commit or P1 improvement is claimed. See PHASES-6.md for complete phase denominators and controls.
