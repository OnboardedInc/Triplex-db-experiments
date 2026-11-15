# Part 9 full verdict: C, A and final F

All are full 10,000-subject pairs with summary tracing, exact local reads, strict server record time and split rule `pending`. Cache 1280 MiB, history 192 MiB, the original CPU placement and quiet logging remain fixed. F source `c8ef367b` adds the off-thread witness and provisional PostgreSQL `open_datasync`; C/A source identities are `7e8ccd81`/`5e9e1ad3`. Cross-session differences do not isolate either change.

| arm / tracing | primary p50 / p99 ms | swap GiB median (min–max) | Mac non-VM CPU median / p99 % | same-session off p50 / p99 ms |
| --- | --- | --- | --- | --- |
| C off-before / off | 11.007 / 45.569 | 4.694 (4.694–4.694) | 11.8 / 180.8 | 10.876 / 43.490 |
| C zero / summary | 11.077 / 54.825 | 4.679 (4.679–4.687) | 11.3 / 90.6 | 10.876 / 43.490 |
| C ladder / summary | 11.189 / 55.647 | 4.679 (4.679–4.679) | 10.9 / 93.5 | 10.876 / 43.490 |
| C off-after / off | 10.745 / 41.412 | 4.679 (4.679–4.679) | 10.5 / 94.7 | 10.876 / 43.490 |
| A off-before / off | 10.593 / 47.676 | 4.140 (4.140–4.140) | 9.7 / 148.5 | 10.660 / 46.380 |
| A zero / summary | 10.517 / 49.378 | 4.140 (4.140–4.140) | 10.2 / 83.5 | 10.660 / 46.380 |
| A ladder / summary | 11.122 / 71.013 | 4.124 (4.124–4.140) | 9.5 / 94.9 | 10.660 / 46.380 |
| A off-after / off | 10.726 / 45.084 | 4.124 (4.124–4.124) | 9.5 / 354.7 | 10.660 / 46.380 |
| F off-before / off | 10.448 / 41.437 | 4.109 (4.109–4.109) | 8.9 / 63.2 | 10.477 / 42.226 |
| F zero / summary | 10.461 / 48.729 | 4.101 (4.101–4.101) | 10.8 / 93.8 | 10.477 / 42.226 |
| F ladder / summary | 11.080 / 67.224 | 4.101 (4.101–4.101) | 10.0 / 90.4 | 10.477 / 42.226 |
| F off-after / off | 10.506 / 43.016 | 4.093 (4.093–4.101) | 10.4 / 89.6 | 10.477 / 42.226 |

Host samples cover primary offer-to-last-ACK, excluding seeding/oracle. Every latency below inherits its loaded-arm level, host and same-session controls above. Off arms are 200-second context; full zero/loaded arms are 900 seconds. F off p50s both meet 12 ms. F bookend drift is .058-ms p50 / 1.580-ms p99. These unequal-duration arms are not a tracing-cost experiment.

| bar | required | C | A | F |
| --- | --- | --- | --- | --- |
| NS-P1-VIOLATIONS-MAX (L256) | = 0 | 0 (met) | 0 (met) | 0 (met) |
| NS-P1-GOODPUT-256-VS-64 | >= 1.0 | 1.017381 (met) | 0.997503 (MISS) | 1.016169 (met) |
| NS-P1-READ-P99-256-MS | <= 100 | 6.815 (met) | 6.303 (met) | 6.303 (met) |
| NS-P1-WRITER-P99-RATIO-256 | <= 1.25 | 1.129014 (met) | 0.340909 (met) | 3.385504 (MISS) |
| NS-P1-WRITER-WAIT-MAX-MS (L256) | <= 2000 | 24.464111 (met) | 39.836426 (met) | 150.401855 (met) |
| NS-P1-VIOLATIONS-MAX (L1024) | = 0 | 0 (met) | 0 (met) | 0 (met) |
| NS-P1-GOODPUT-1024-VS-256 | >= 0.9 | 1.124474 (met) | 1.209618 (met) | 1.194368 (met) |
| NS-P1-WRITER-P99-RATIO-1024 | <= 2.0 | 3.73017 (MISS) | 1.305911 (met) | 2.497677 (MISS) |
| NS-P1-RECOVERY-MS | <= 60000 | 35000 (met) | null (MISS) | null (MISS) |
| 1.1 P1.1 hot-set share of reads (min over ladder levels) | >= 0.5 | 0.595714 (met) | 0.595664 (met) | 0.595755 (met) |
| 1.1 P1.2 split reads straddling a frozen-trace command, all correct | > 0 and all correct | 70184 (met) | 74353 (met) | 73896 (met) |
| 4.1.5 fallback share per window (reported) | reported | [0,3.1431838094601976e-05,0.000457050899596591,0,2.5452301538506786e-05,0.00033549890246086184] (unmeasured/reported) | [0,2.0367355203080504e-05,0.00028335140485626526,0,1.7552771343239126e-05,0] (unmeasured/reported) | [0,4.3576836545776224e-05,0.0005196515557812227,0,0,1.6939813733374464e-05] (unmeasured/reported) |
| 1.1 P1.3 a maintenance event in every P1 window | every window >= 1 | [1,1,1,1,1,1] (met) | [1,1,1,1,1,1] (met) | [1,1,1,1,1,1] (met) |
| NS-P2 5-10 band p50 ms (L256) | <= 10 | 11.391 (MISS) | 11.647 (MISS) | 12.223 (MISS) |
| NS-P2 5-10 band p99 ms (L256) | <= 50 | 24.464 (met) | 39.836 (met) | 150.402 (MISS) |
| NS-P2 11-25 band p50 ms (L256) | <= 10 | 13.567 (MISS) | 14.655 (MISS) | 13.055 (MISS) |
| NS-P2 11-25 band p99 ms (L256) | <= 50 | 22.795 (met) | 30.121 (met) | 23.268 (met) |
| NS-P2 26-50 band p99 ms (L256, provisional) | <= 100 | 15.019 (met) | 17.196 (met) | 22.155 (met) |
| NS-P2 every offered command accounted | = 0 | 0 (met) | 0 (met) | 0 (met) |
| NS-P2 every oracle-valid trace command published | all | "7408/7408" (met) | "7408/7408" (met) | "7408/7408" (met) |
| NS-P2 typed rejections only for deliberately invalid commands | = 0 (the trace holds no invalid commands yet) | 0 (met) | 0 (met) | 0 (met) |
| NS-P2 typed conflicts only where the oracle finds a CAS race | = 0 (serial per subject: the trace has no CAS race) | 0 (met) | 0 (met) | 0 (met) |
| NS-P2 steady-state queue <= 2 s of offered rate | <= 2.19 commands | 2 (met) | 1 (met) | 3 (MISS) |
| NS-P2 queue drains within 60 s after each burst | every burst <= 60 s | [0.045012695312493634,0.7007136230469087] (met) | [0.08511035156249136,0.2745527343749927] (met) | [0.02558154296875159,0.4101291503906168] (met) |
| NS-P2 read-your-own-write at the returned tx | = 1.0 | 1 (met) | 1 (met) | 1 (met) |
| NS-P2 duplicates return the original receipt | = 1.0 | 1 (met) | 1 (met) | 1 (met) |
| NS-P2 lost ACKs return the original receipt | = 1.0 | 1 (met) | 1 (met) | 1 (met) |
| NS-P3 gaps | = 0 | 0 (met) | 0 (met) | 0 (met) |
| NS-P3 per-subject order violations | = 0 | 0 (met) | 0 (met) | 0 (met) |
| NS-P3 visible duplicate effects | = 0 | 0 (met) | 0 (met) | 0 (met) |
| NS-P3 resume from checkpoint replays exactly | = true | true (met) | true (met) | true (met) |
| NS-P3 crash injection at three points | = 3 | 3 (met) | 3 (met) | 3 (met) |
| NS-P3 lag p99 ms at L256 | <= 250 | 46.322 (met) | 18.28 (met) | 76.858 (met) |
| NS-P3 affected-subject set matches | = 0 | 0 (met) | 0 (met) | 0 (met) |
| NS-P3 corrections report their valid-time range | = 1.0 | 1 (met) | 1 (met) | 1 (met) |
| NS-P4 weighted-mix pull p50 ms | <= 5 | 0.032 (met) | 0.028 (met) | 0.029 (met) |
| NS-P4 weighted-mix pull p99 ms | <= 25 | 0.247 (met) | 0.2 (met) | 0.21 (met) |
| NS-P4 largest bucket p99 ms (provisional) | <= 50 | 0.357 (met) | 0.281 (met) | 0.289 (met) |
| NS-P4 history flatness p99 depth10 / depth1 | <= 1.1 | 1.01875 (met) | 1.045802 (met) | 1.021583 (met) |
| NS-P4 history flatness bytes read depth10 / depth1 | <= 1.1 | null (unmeasured/reported) | null (unmeasured/reported) | null (unmeasured/reported) |
| P2 all-primary p99 ms | <=50 | 55.647461 (MISS) | 71.013428 (MISS) | 67.224121 (MISS) |
| P2 burst 5-10 p50 ms | <=10 | 9.791 (met) | 9.663 (met) | 9.663 (met) |
| P2 burst 11-25 p50 ms | <=10 | 12.095 (MISS) | 11.775 (MISS) | 11.839 (MISS) |
| P4 whole-machine weighted correct pulls/s | >=4400 | 16521.215287 (met) | 19073.441454 (met) | 18171.534387 (met) |
| P4 depth1 / depth3 / depth10 p99 ms | depth10/depth1 <=1.1 | [0.16,0.166,0.163] | [0.131,0.137,0.137] | [0.139,0.143,0.142] |
| oracle commands / reads / queries / mismatches | exact | [810,53,2241,0] / PASS | [810,53,2296,0] / PASS | [810,53,2771,0] / PASS |

P4 uses actual correct weighted-phase pulls divided by that phase’s measured wall time. The obsolete per-engine-quota score is not a whole-machine result. History depths are complete and indexed; physical engine bytes per query remain unmeasured. P5 is outside this task and is not promoted.

F accounts for 7408/7408 primary commands; 19,766,713/19,766,713 model reads are correct, with zero errors. Its loaded independent oracle checks 810 commands, 53 reads and 2771 entity queries, with zero mismatches/receipt violations. Zero/off arms explicitly record oracle NOT-RUN, rather than PASS. The final pair captures and durably reads back 7436/7436 witnesses including non-primary operations, pending zero.

A’s G256/G64 miss does not repeat: F is 1.016169. That observation does not prove A was noise; there is one pair per configuration/session. A’s recovery miss repeats: no qualifying 30-second window inside 60 seconds. In F, window writer p99 is 72.217–360.891 ms versus matched zero 20.188–23.344 ms; all seven windows fail. `null` is a miss, not zero recovery time.

| stress window | C loaded / zero p99 ms | A loaded / zero p99 ms | F loaded / zero p99 ms |
| --- | --- | --- | --- |
| L256 | 24.464 / 21.668 | 39.836 / 116.852 | 150.402 / 44.425 |
| L1024 | 139.569 / 37.416 | 93.804 / 71.830 | 78.450 / 31.409 |

The ratios use exactly 46 numerator and 46 denominator commits per stress window. F’s worse ratios also reflect lower zero tails than A; no ratio is substituted for all-primary p99. The matched zero input’s SHA256 is checked against the actual zero writer file.

Run-produced offline HTML/Chrome timelines, original scorecards, anatomy and writer statistics live in the matching private run folders. The full F default pair retains 54,496,509 compressed raw trace bytes. Public copies retain `INDEX.md`, `TRACE-REPORT.md` and `SHA256SUMS` under `runs/tx2-dxt1-p9-final-a-*`. [Tail analysis](TAIL-9.md), [evidence and byte seals](EVIDENCE-9.md).
