# Part 7 full verdict comparison

Sources: reference c9b9fc3f; quiet closing 7e8ccd81. Observed original benchmark gates, not an acceptance promotion. Both completed full pairs use default summary tracing, 10,000 subjects, exact local reads, strict server record time, deferred witnesses, 192-MiB history and split rule `pending`. Reference has the old 1-GiB transactor cache and busy host; closing has 1280 MiB and a quieter host. Cross-pair differences do not isolate a cause. Later diagnostics are not substituted for a full pair.

| pair arm / level | primary p50 / p99 ms | swap GiB median (min-max) | Mac non-VM CPU median / p99 % | same-session off p50 / p99 ms |
| --- | --- | --- | --- | --- |
| reference off-before / off | 13.724 / 104.423 | 11.649 (11.649-11.649) | 45.6 / 197.0 | 13.366 / 77.784 |
| reference zero / summary | 13.551 / 208.668 | 11.649 (11.524-11.649) | 55.5 / 247.1 | 13.366 / 77.784 |
| reference ladder / summary | 15.742 / 203.881 | 10.701 (10.677-12.108) | 65.3 / 308.4 | 13.366 / 77.784 |
| reference off-after / off | 13.008 / 51.145 | 12.053 (12.045-12.084) | 54.8 / 190.4 | 13.366 / 77.784 |
| closing off-before / off | 11.007 / 45.569 | 4.694 (4.694-4.694) | 10.5 / 156.4 | 10.876 / 43.490 |
| closing zero / summary | 11.077 / 54.825 | 4.679 (4.679-4.694) | 11.3 / 86.6 | 10.876 / 43.490 |
| closing ladder / summary | 11.189 / 55.647 | 4.679 (4.679-4.679) | 12.2 / 147.4 | 10.876 / 43.490 |
| closing off-after / off | 10.745 / 41.412 | 4.679 (4.679-4.679) | 10.5 / 109.8 | 10.876 / 43.490 |

All latency rows below use their loaded arm/context above. Off controls are 200-second host context; the full zero/loaded arms are 900 seconds. These are not a new tracing-cost test. Both quiet closing off controls meet the 12-ms host reference; neither busy reference control does.

| bar | required | reference | quiet closing | final after changes |
| --- | --- | --- | --- | --- |
| NS-P1-VIOLATIONS-MAX (L256) | = 0 | 0 (met) | 0 (met) | not run |
| NS-P1-GOODPUT-256-VS-64 | >= 1.0 | 0.9704190990349689 (miss) | 1.017380993364056 (met) | not run |
| NS-P1-READ-P99-256-MS | <= 100 | 8.383 (met) | 6.815 (met) | not run |
| NS-P1-WRITER-P99-RATIO-256 | <= 1.25 | 2.244690085106036 (miss) | 1.129014399351015 (met) | not run |
| NS-P1-WRITER-WAIT-MAX-MS (L256) | <= 2000 | 134.3232421875 (met) | 24.464111328125 (met) | not run |
| NS-P1-VIOLATIONS-MAX (L1024) | = 0 | 0 (met) | 0 (met) | not run |
| NS-P1-GOODPUT-1024-VS-256 | >= 0.9 | 0.8704191297614783 (miss) | 1.1244738876417735 (met) | not run |
| NS-P1-WRITER-P99-RATIO-1024 | <= 2.0 | 6.9454545102562655 (miss) | 3.730169741023248 (miss) | not run |
| NS-P1-RECOVERY-MS | <= 60000 | 40000 (met) | 35000 (met) | not run |
| 1.1 P1.1 hot-set share of reads (min over ladder levels) | >= 0.5 | 0.594637669674112 (met) | 0.5957137625975563 (met) | not run |
| 1.1 P1.2 split reads straddling a frozen-trace command, all correct | > 0 and all correct | 53738 (met) | 70184 (met) | not run |
| 4.1.5 fallback share per window (reported) | reported | [0,0.0001928039152048381,0.0014092562985831634,0,0.00017837707520126648,0.0018651444526361376] (unmeasured/reported) | [0,3.1431838094601976e-05,0.000457050899596591,0,2.5452301538506786e-05,0.00033549890246086184] (unmeasured/reported) | not run |
| 1.1 P1.3 a maintenance event in every P1 window | every window >= 1 | [1,1,1,1,1,1] (met) | [1,1,1,1,1,1] (met) | not run |
| NS-P2 5-10 band p50 ms (L256) | <= 10 | 15.999 (miss) | 11.391 (miss) | not run |
| NS-P2 5-10 band p99 ms (L256) | <= 50 | 52.613 (miss) | 24.464 (met) | not run |
| NS-P2 11-25 band p50 ms (L256) | <= 10 | 16.383 (miss) | 13.567 (miss) | not run |
| NS-P2 11-25 band p99 ms (L256) | <= 50 | 134.323 (miss) | 22.795 (met) | not run |
| NS-P2 26-50 band p99 ms (L256, provisional) | <= 100 | 30.939 (met) | 15.019 (met) | not run |
| NS-P2 every offered command accounted | = 0 | 0 (met) | 0 (met) | not run |
| NS-P2 every oracle-valid trace command published | all | "7408/7408" (met) | "7408/7408" (met) | not run |
| NS-P2 typed rejections only for deliberately invalid commands | = 0 (the trace holds no invalid commands yet) | 0 (met) | 0 (met) | not run |
| NS-P2 typed conflicts only where the oracle finds a CAS race | = 0 (serial per subject: the trace has no CAS race) | 0 (met) | 0 (met) | not run |
| NS-P2 steady-state queue <= 2 s of offered rate | <= 2.19 commands | 2 (met) | 2 (met) | not run |
| NS-P2 queue drains within 60 s after each burst | every burst <= 60 s | [0.1267316894531234,0.6024804687499454] (met) | [0.045012695312493634,0.7007136230469087] (met) | not run |
| NS-P2 read-your-own-write at the returned tx | = 1.0 | 1 (met) | 1 (met) | not run |
| NS-P2 duplicates return the original receipt | = 1.0 | 1 (met) | 1 (met) | not run |
| NS-P2 lost ACKs return the original receipt | = 1.0 | 1 (met) | 1 (met) | not run |
| NS-P3 gaps | = 0 | 0 (met) | 0 (met) | not run |
| NS-P3 per-subject order violations | = 0 | 0 (met) | 0 (met) | not run |
| NS-P3 visible duplicate effects | = 0 | 0 (met) | 0 (met) | not run |
| NS-P3 resume from checkpoint replays exactly | = true | true (met) | true (met) | not run |
| NS-P3 crash injection at three points | = 3 | 3 (met) | 3 (met) | not run |
| NS-P3 lag p99 ms at L256 | <= 250 | 221.096 (met) | 46.322 (met) | not run |
| NS-P3 affected-subject set matches | = 0 | 0 (met) | 0 (met) | not run |
| NS-P3 corrections report their valid-time range | = 1.0 | 1 (met) | 1 (met) | not run |
| NS-P4 weighted-mix pull p50 ms | <= 5 | 0.034 (met) | 0.032 (met) | not run |
| NS-P4 weighted-mix pull p99 ms | <= 25 | 0.293 (met) | 0.247 (met) | not run |
| NS-P4 largest bucket p99 ms (provisional) | <= 50 | 0.429 (met) | 0.357 (met) | not run |
| NS-P4 history flatness p99 depth10 / depth1 | <= 1.1 | 1.0714285714285714 (met) | 1.01875 (met) | not run |
| NS-P4 history flatness bytes read depth10 / depth1 | <= 1.1 | null (unmeasured/reported) | null (unmeasured/reported) | not run |
| P2 all-primary p99 ms | <=50 | 203.880859375 | 55.6474609375 | not run |
| P2 burst 5-10 p50 ms | <=10 | 14.015 | 9.791 | not run |
| P2 burst 11-25 p50 ms | <=10 | 16.895 | 12.095 | not run |
| P4 whole-machine weighted correct pulls/s | >=4400 | 14720.200798985376 | 16521.215286985178 | not run |
| P4 depth1 / depth3 / depth10 p99 ms | depth10/depth1 <=1.1 | [0.182,0.191,0.195] | [0.16,0.166,0.163] | not run |
| oracle commands / reads / queries / mismatches | exact | [810,53,2626,0] | [810,53,2241,0] | not run |

The whole-machine P4 row uses the actual correctness-qualified weighted-phase goodput, with no quota multiplier or best-ladder substitution. Client single-reader P4 execution is CPU-saturated; this is the composed-path throughput. Physical engine bytes per query remain unmeasured. Exact all-read/oracle results are preserved independently of missed performance bars.

Final status: the first model hold and its later closing control were refused at the unchanged 15-GiB floor. The retained delta broadcast has not yet had a later full-pair verdict; the journal stays opt-in because its timing bookend is missing. No missing arm is a PASS.
