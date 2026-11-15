# Part 8 full verdict: C beside final A

Original source-bound scorecards; no acceptance promotion. Both full 10,000-subject pairs use default summary tracing, exact local reads, strict server record time, deferred witness, 1280-MiB transactor cache, one transactor core, 192-MiB history and split rule `pending`. C source 7e8ccd81 used snapshot receipt broadcasts; final A source 5e9e1ad3 uses the retained delta broadcast. Journal retention, nursery/old-space experiments and shared Postgres core were rejected. Slim layout is off in this full pair. Cross-session differences do not isolate a cause.

| arm / level | primary p50 / p99 ms | swap GiB median (min–max) | Mac non-VM CPU median / p99 % | same-session off p50 / p99 ms |
| --- | --- | --- | --- | --- |
| C off-before / off | 11.007 / 45.569 | 4.694 (4.694–4.694) | 11.8 / 180.8 | 10.876 / 43.490 |
| C zero / summary | 11.077 / 54.825 | 4.679 (4.679–4.687) | 11.3 / 90.6 | 10.876 / 43.490 |
| C ladder / summary | 11.189 / 55.647 | 4.679 (4.679–4.679) | 10.9 / 93.5 | 10.876 / 43.490 |
| C off-after / off | 10.745 / 41.412 | 4.679 (4.679–4.679) | 10.5 / 94.7 | 10.876 / 43.490 |
| final A off-before / off | 10.593 / 47.676 | 4.140 (4.140–4.140) | 9.7 / 148.5 | 10.660 / 46.380 |
| final A zero / summary | 10.517 / 49.378 | 4.140 (4.140–4.140) | 10.2 / 83.5 | 10.660 / 46.380 |
| final A ladder / summary | 11.122 / 71.013 | 4.124 (4.124–4.140) | 9.5 / 94.9 | 10.660 / 46.380 |
| final A off-after / off | 10.726 / 45.084 | 4.124 (4.124–4.124) | 9.5 / 354.7 | 10.660 / 46.380 |

Host statistics use the raw Mac sampler in the primary offer-to-last-ACK window (not the entire seed/oracle run). Every latency below uses its loaded-arm host/level and same-session controls above. Off arms are 200-second host context; full zero/ladder arms are 900 seconds. Both final off p50s meet the 12-ms host reference; this is not a tracing-cost A/B. The final p50 bookend drift is .133 ms; p99 drift 2.592 ms.

| bar | required | C | final A |
| --- | --- | --- | --- |
| NS-P1-VIOLATIONS-MAX (L256) | = 0 | 0 (met) | 0 (met) |
| NS-P1-GOODPUT-256-VS-64 | >= 1.0 | 1.017380993364056 (met) | 0.9975030277944107 (MISS) |
| NS-P1-READ-P99-256-MS | <= 100 | 6.815 (met) | 6.303 (met) |
| NS-P1-WRITER-P99-RATIO-256 | <= 1.25 | 1.129014399351015 (met) | 0.34090900847632916 (met) |
| NS-P1-WRITER-WAIT-MAX-MS (L256) | <= 2000 | 24.464111328125 (met) | 39.83642578125 (met) |
| NS-P1-VIOLATIONS-MAX (L1024) | = 0 | 0 (met) | 0 (met) |
| NS-P1-GOODPUT-1024-VS-256 | >= 0.9 | 1.1244738876417735 (met) | 1.2096180789626623 (met) |
| NS-P1-WRITER-P99-RATIO-1024 | <= 2.0 | 3.730169741023248 (MISS) | 1.305910888901729 (met) |
| NS-P1-RECOVERY-MS | <= 60000 | 35000 (met) | null (MISS) |
| 1.1 P1.1 hot-set share of reads (min over ladder levels) | >= 0.5 | 0.5957137625975563 (met) | 0.5956642490728453 (met) |
| 1.1 P1.2 split reads straddling a frozen-trace command, all correct | > 0 and all correct | 70184 (met) | 74353 (met) |
| 4.1.5 fallback share per window (reported) | reported | [0,0.000031431838094601976,0.000457050899596591,0,0.000025452301538506786,0.00033549890246086184] (unmeasured/reported) | [0,0.000020367355203080504,0.00028335140485626526,0,0.000017552771343239126,0] (unmeasured/reported) |
| 1.1 P1.3 a maintenance event in every P1 window | every window >= 1 | [1,1,1,1,1,1] (met) | [1,1,1,1,1,1] (met) |
| NS-P2 5-10 band p50 ms (L256) | <= 10 | 11.391 (MISS) | 11.647 (MISS) |
| NS-P2 5-10 band p99 ms (L256) | <= 50 | 24.464 (met) | 39.836 (met) |
| NS-P2 11-25 band p50 ms (L256) | <= 10 | 13.567 (MISS) | 14.655 (MISS) |
| NS-P2 11-25 band p99 ms (L256) | <= 50 | 22.795 (met) | 30.121 (met) |
| NS-P2 26-50 band p99 ms (L256, provisional) | <= 100 | 15.019 (met) | 17.196 (met) |
| NS-P2 every offered command accounted | = 0 | 0 (met) | 0 (met) |
| NS-P2 every oracle-valid trace command published | all | "7408/7408" (met) | "7408/7408" (met) |
| NS-P2 typed rejections only for deliberately invalid commands | = 0 (the trace holds no invalid commands yet) | 0 (met) | 0 (met) |
| NS-P2 typed conflicts only where the oracle finds a CAS race | = 0 (serial per subject: the trace has no CAS race) | 0 (met) | 0 (met) |
| NS-P2 steady-state queue <= 2 s of offered rate | <= 2.19 commands | 2 (met) | 1 (met) |
| NS-P2 queue drains within 60 s after each burst | every burst <= 60 s | [0.045012695312493634,0.7007136230469087] (met) | [0.08511035156249136,0.2745527343749927] (met) |
| NS-P2 read-your-own-write at the returned tx | = 1.0 | 1 (met) | 1 (met) |
| NS-P2 duplicates return the original receipt | = 1.0 | 1 (met) | 1 (met) |
| NS-P2 lost ACKs return the original receipt | = 1.0 | 1 (met) | 1 (met) |
| NS-P3 gaps | = 0 | 0 (met) | 0 (met) |
| NS-P3 per-subject order violations | = 0 | 0 (met) | 0 (met) |
| NS-P3 visible duplicate effects | = 0 | 0 (met) | 0 (met) |
| NS-P3 resume from checkpoint replays exactly | = true | true (met) | true (met) |
| NS-P3 crash injection at three points | = 3 | 3 (met) | 3 (met) |
| NS-P3 lag p99 ms at L256 | <= 250 | 46.322 (met) | 18.28 (met) |
| NS-P3 affected-subject set matches | = 0 | 0 (met) | 0 (met) |
| NS-P3 corrections report their valid-time range | = 1.0 | 1 (met) | 1 (met) |
| NS-P4 weighted-mix pull p50 ms | <= 5 | 0.032 (met) | 0.028 (met) |
| NS-P4 weighted-mix pull p99 ms | <= 25 | 0.247 (met) | 0.2 (met) |
| NS-P4 largest bucket p99 ms (provisional) | <= 50 | 0.357 (met) | 0.281 (met) |
| NS-P4 history flatness p99 depth10 / depth1 | <= 1.1 | 1.01875 (met) | 1.0458015267175573 (met) |
| NS-P4 history flatness bytes read depth10 / depth1 | <= 1.1 | null (unmeasured/reported) | null (unmeasured/reported) |
| P2 all-primary p99 ms | <=50 | 55.647 (MISS) | 71.013 (MISS) |
| P2 burst 5-10 p50 ms | <=10 | 9.791 (met) | 9.663 (met) |
| P2 burst 11-25 p50 ms | <=10 | 12.095 (MISS) | 11.775 (MISS) |
| P4 whole-machine weighted correct pulls/s | >=4400 | 16521.215 (met) | 19073.441 (met) |
| P4 depth1 / depth3 / depth10 p99 ms | depth10/depth1 <=1.1 | [0.16,0.166,0.163] | [0.131,0.137,0.137] |
| oracle commands / reads / queries / mismatches | exact | [810,53,2241,0] / PASS | [810,53,2296,0] / PASS |

P4 uses the actual correctness-qualified weighted-phase total, without a quota multiplier or best-ladder substitution; the old per-quota-core scorecard row is superseded by Sam’s whole-machine ruling. Physical engine bytes per query remain unmeasured, not PASS. P5 is outside this task and is not promoted. Final A has 7408/7408 primary commands, zero errors, zero incorrect reads, and zero oracle/receipt mismatches.

Final recovery is not demonstrated in the 60-second phase: all seven sliding 30-second windows fail. The writer p99 alone is 40.889–68.322 ms against 19.243–19.797 ms in its matched zero windows, exceeding 1.25 times that denominator. `null` is a failed recovery observation, not zero milliseconds.

Artifacts were produced by the run: `runs/tx2-dxt1-p8-final-a-{zero,ladder}/TRACE-REPORT.md` and private matching run directories contain `trace.html`, `trace.chrome.json`, `COMMIT-ANATOMY.md`, original scorecards and compressed raw traces. The two default arms retain 52,984,036 compressed raw bytes. Byte seals and analysis provenance are indexed in [EVIDENCE-8.md](EVIDENCE-8.md).

Stress denominator detail (46 primary commits in each numerator and denominator):

| window | C loaded / zero p99 ms | final A loaded / zero p99 ms |
| --- | --- | --- |
| L256 | 24.464 / 21.668 | 39.836 / 116.852 |
| L1024 | 139.569 / 37.416 | 93.804 / 71.830 |

The L1024 ratio passes in final A with a lower loaded tail and a higher zero tail. It is not evidence that all-primary tail or a particular settings change improved. The missed G256/G64 ratio is a 0.25% difference; it remains a miss under the unchanged bar.
