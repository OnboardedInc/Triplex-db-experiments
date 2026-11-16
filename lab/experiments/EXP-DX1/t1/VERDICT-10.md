# Part 10 full comparison: C, A, F, G, H

Every cell shows **today / corrected diagnostic**. Today remains scheduled offer to benchmark finish and is the only authoritative definition. Corrected stops at the captured ACK and subtracts observed offer lateness; subject/slot waits remain. This also removes real GC/event-loop lateness, so its numeric threshold results cannot qualify acceptance. The actual ACK-only definition retains lateness and is reported separately below and in every new run report.

C/A/F are historical references, not same-session causal controls. G is the retained failed first final attempt. † means the entire attempt is unqualified despite any numeric threshold being met. Zero/off arms have no independent oracle; their DONE state is not oracle PASS. H, when present, is the fresh retry after bounded error-cause capture, with the same performance settings. Original 500-subject history growth, volume placement and CPU layout remain default; no warming or TCP change is used.

| arm / level | driver status | original primary p50/p99 ms | ACK-only p50/p99 ms | corrected p50/p99 ms | swap GiB median (range) | Mac non-VM CPU median/p99 % | same-session off original p50/p99 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C off-before / off | DONE | 11.007/45.569 | 10.530/44.686 | unavailable: no offer clock | 4.694 (4.694–4.694) | 11.8/180.8 | 10.876/43.490 |
| C zero / summary | DONE | 11.077/54.825 | 10.595/54.125 | 9.748/52.187 | 4.679 (4.679–4.687) | 11.3/90.6 | 10.876/43.490 |
| C ladder / summary | DONE | 11.189/55.647 | 10.658/54.942 | 9.718/50.636 | 4.679 (4.679–4.679) | 10.9/93.5 | 10.876/43.490 |
| C off-after / off | DONE | 10.745/41.412 | 10.252/40.639 | unavailable: no offer clock | 4.679 (4.679–4.679) | 10.5/94.7 | 10.876/43.490 |
| A off-before / off | DONE | 10.593/47.676 | 10.133/47.389 | unavailable: no offer clock | 4.140 (4.140–4.140) | 9.7/148.5 | 10.660/46.380 |
| A zero / summary | DONE | 10.517/49.378 | 10.097/48.863 | 9.267/47.033 | 4.140 (4.140–4.140) | 10.2/83.5 | 10.660/46.380 |
| A ladder / summary | DONE | 11.122/71.013 | 10.600/70.816 | 9.729/67.050 | 4.124 (4.124–4.140) | 9.5/94.9 | 10.660/46.380 |
| A off-after / off | DONE | 10.726/45.084 | 10.254/44.851 | unavailable: no offer clock | 4.124 (4.124–4.124) | 9.5/354.7 | 10.660/46.380 |
| F off-before / off | DONE | 10.448/41.437 | 10.012/41.127 | unavailable: no offer clock | 4.109 (4.109–4.109) | 8.9/63.2 | 10.477/42.226 |
| F zero / summary | DONE | 10.461/48.729 | 10.003/48.234 | 9.285/45.640 | 4.101 (4.101–4.101) | 10.8/93.8 | 10.477/42.226 |
| F ladder / summary | DONE | 11.080/67.224 | 10.566/66.700 | 9.856/61.955 | 4.101 (4.101–4.101) | 10.0/90.4 | 10.477/42.226 |
| F off-after / off | DONE | 10.506/43.016 | 9.995/42.330 | unavailable: no offer clock | 4.093 (4.093–4.101) | 10.4/89.6 | 10.477/42.226 |
| G off-before / off | DONE | 10.133/40.009 | 9.684/39.323 | 9.446/39.056 | 4.033 (4.033–4.033) | 13.9/120.7 | 10.106/39.677 |
| G zero / summary | DONE | 10.184/57.291 | 9.698/56.291 | 9.463/53.105 | 4.033 (4.033–4.033) | 14.4/102.4 | 10.106/39.677 |
| G ladder / summary | ERROR | 10.605/49.807 | 10.063/49.305 | 9.731/46.395 | 4.033 (4.033–4.033) | 14.1/100.9 | 10.106/39.677 |
| G off-after / off | DONE | 10.079/39.345 | 9.634/38.931 | 9.377/38.072 | 4.017 (4.017–4.017) | 13.6/88.5 | 10.106/39.677 |
| H off-before / off | DONE | 9.872/43.999 | 9.447/43.104 | 9.232/41.822 | 4.017 (4.017–4.017) | 12.6/82.5 | 9.849/42.266 |
| H zero / summary | DONE | 10.033/51.130 | 9.569/50.281 | 9.299/48.570 | 4.017 (4.017–4.017) | 15.0/96.1 | 9.849/42.266 |
| H ladder / summary | DONE | 10.201/48.849 | 9.680/48.242 | 9.397/45.584 | 4.017 (4.017–4.017) | 13.7/85.2 | 9.849/42.266 |
| H off-after / off | DONE | 9.826/40.533 | 9.392/39.894 | 9.175/39.618 | 4.017 (4.017–4.017) | 14.7/105.5 | 9.849/42.266 |

Host samples cover primary offer to final primary finish, excluding seed/oracle work. Every latency below inherits its arm’s tracing level, CPU/swap and same-session controls above. Full pairs are 900 seconds; off context arms are 200 seconds and are not a matched tracing-cost experiment. Values in different sessions do not isolate a change.

| bar | unchanged requirement | C | A | F | G | H |
| --- | --- | --- | --- | --- | --- | --- |
| NS-P1-VIOLATIONS-MAX (L256) | = 0 | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) † | 0 (met) / 0 (met) |
| NS-P1-GOODPUT-256-VS-64 | >= 1.0 | 1.017381 (met) / 1.017381 (met) | 0.997503 (MISS) / 0.997503 (MISS) | 1.016169 (met) / 1.016169 (met) | 1.02013 (met) / 1.02013 (met) † | 0.995609 (MISS) / 0.995609 (MISS) |
| NS-P1-READ-P99-256-MS | <= 100 | 6.815 (met) / 6.815 (met) | 6.303 (met) / 6.303 (met) | 6.303 (met) / 6.303 (met) | 7.103 (met) / 7.103 (met) † | 6.175 (met) / 6.175 (met) |
| NS-P1-WRITER-P99-RATIO-256 | <= 1.25 | 1.129014 (met) / 1.110382 (met) | 0.340909 (met) / 0.333806 (met) | 3.385504 (MISS) / 3.410516 (MISS) | 1.325976 (MISS) / 1.298491 (MISS) † | 4.164693 (MISS) / 4.211075 (MISS) |
| NS-P1-WRITER-WAIT-MAX-MS (L256) | <= 2000 | 24.464111 (met) / 22.584717 (met) | 39.836426 (met) / 38.759766 (met) | 150.401855 (met) / 149.478516 (met) | 46.032715 (met) / 44.292236 (met) † | 103.006104 (met) / 102.28125 (met) |
| NS-P1-VIOLATIONS-MAX (L1024) | = 0 | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) † | 0 (met) / 0 (met) |
| NS-P1-GOODPUT-1024-VS-256 | >= 0.9 | 1.124474 (met) / 1.124474 (met) | 1.209618 (met) / 1.209618 (met) | 1.194368 (met) / 1.194368 (met) | 1.116211 (met) / 1.116211 (met) † | 1.137928 (met) / 1.137928 (met) |
| NS-P1-WRITER-P99-RATIO-1024 | <= 2.0 | 3.73017 (MISS) / 3.691964 (MISS) | 1.305911 (met) / 1.315003 (met) | 2.497677 (MISS) / 2.485776 (MISS) | 2.60643 (MISS) / 2.617085 (MISS) † | 0.824726 (met) / 0.776937 (met) |
| NS-P1-RECOVERY-MS | <= 60000 | 35000 (met) / 35000 (met) | null (MISS) / null (MISS) | null (MISS) / null (MISS) | 40000 (met) / 40000 (met) † | 35000 (met) / 35000 (met) |
| 1.1 P1.1 hot-set share of reads (min over ladder levels) | >= 0.5 | 0.595714 (met) / 0.595714 (met) | 0.595664 (met) / 0.595664 (met) | 0.595755 (met) / 0.595755 (met) | 0.59544 (met) / 0.59544 (met) † | 0.595583 (met) / 0.595583 (met) |
| 1.1 P1.2 split reads straddling a frozen-trace command, all correct | > 0 and all correct | 70184 (met) / 70184 (met) | 74353 (met) / 74353 (met) | 73896 (met) / 73896 (met) | 71173 (met) / 71173 (met) † | 72423 (met) / 72423 (met) |
| 4.1.5 fallback share per window (reported) | reported | [0,3.1431838094601976e-05,0.000457050899596591,0,2.5452301538506786e-05,0.00033549890246086184] (unmeasured/reported) / [0,3.1431838094601976e-05,0.000457050899596591,0,2.5452301538506786e-05,0.00033549890246086184] (unmeasured/reported) | [0,2.0367355203080504e-05,0.00028335140485626526,0,1.7552771343239126e-05,0] (unmeasured/reported) / [0,2.0367355203080504e-05,0.00028335140485626526,0,1.7552771343239126e-05,0] (unmeasured/reported) | [0,4.3576836545776224e-05,0.0005196515557812227,0,0,1.6939813733374464e-05] (unmeasured/reported) / [0,4.3576836545776224e-05,0.0005196515557812227,0,0,1.6939813733374464e-05] (unmeasured/reported) | [0,3.315091489894938e-05,0.0005114847264977504,1.0063596337969111e-05,0,0.0002621878050265428] (unmeasured/reported) / [0,3.315091489894938e-05,0.0005114847264977504,1.0063596337969111e-05,0,0.0002621878050265428] (unmeasured/reported) † | [1.1965544019441616e-06,2.4293133737536984e-05,0.00034528764873075055,0,1.5608432299465465e-05,0.00018242451785519974] (unmeasured/reported) / [1.1965544019441616e-06,2.4293133737536984e-05,0.00034528764873075055,0,1.5608432299465465e-05,0.00018242451785519974] (unmeasured/reported) |
| 1.1 P1.3 a maintenance event in every P1 window | every window >= 1 | [1,1,1,1,1,1] (met) / [1,1,1,1,1,1] (met) | [1,1,1,1,1,1] (met) / [1,1,1,1,1,1] (met) | [1,1,1,1,1,1] (met) / [1,1,1,1,1,1] (met) | [1,1,1,1,1,1] (met) / [1,1,1,1,1,1] (met) † | [1,1,1,1,1,1] (met) / [1,1,1,1,1,1] (met) |
| NS-P2 5-10 band p50 ms (L256) | <= 10 | 11.391 (MISS) / 10.175 (MISS) | 11.647 (MISS) / 10.175 (MISS) | 12.223 (MISS) / 11.071 (MISS) | 10.943 (MISS) / 9.791 (met) † | 10.879 (MISS) / 10.047 (MISS) |
| NS-P2 5-10 band p99 ms (L256) | <= 50 | 24.464 (met) / 22.585 (met) | 39.836 (met) / 38.76 (met) | 150.402 (MISS) / 149.479 (MISS) | 18.651 (met) / 18.023 (met) † | 103.006 (MISS) / 102.281 (MISS) |
| NS-P2 11-25 band p50 ms (L256) | <= 10 | 13.567 (MISS) / 12.095 (MISS) | 14.655 (MISS) / 12.799 (MISS) | 13.055 (MISS) / 11.583 (MISS) | 14.527 (MISS) / 13.439 (MISS) † | 12.799 (MISS) / 11.967 (MISS) |
| NS-P2 11-25 band p99 ms (L256) | <= 50 | 22.795 (met) / 20.769 (met) | 30.121 (met) / 28.527 (met) | 23.268 (met) / 21.979 (met) | 46.033 (met) / 44.292 (met) † | 18.909 (met) / 17.982 (met) |
| NS-P2 26-50 band p99 ms (L256, provisional) | <= 100 | 15.019 (met) / 11.878 (met) | 17.196 (met) / 15.705 (met) | 22.155 (met) / 20.458 (met) | 12.347 (met) / 10.368 (met) † | 15.746 (met) / 14.053 (met) |
| NS-P2 every offered command accounted | = 0 | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) † | 0 (met) / 0 (met) |
| NS-P2 every oracle-valid trace command published | all | "7408/7408" (met) / "7408/7408" (met) | "7408/7408" (met) / "7408/7408" (met) | "7408/7408" (met) / "7408/7408" (met) | "7408/7408" (met) / "7408/7408" (met) † | "7408/7408" (met) / "7408/7408" (met) |
| NS-P2 typed rejections only for deliberately invalid commands | = 0 (the trace holds no invalid commands yet) | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) † | 0 (met) / 0 (met) |
| NS-P2 typed conflicts only where the oracle finds a CAS race | = 0 (serial per subject: the trace has no CAS race) | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) † | 0 (met) / 0 (met) |
| NS-P2 steady-state queue <= 2 s of offered rate | <= 2.19 commands | 2 (met) / 2 (met) | 1 (met) / 1 (met) | 3 (MISS) / 3 (MISS) | 2 (met) / 2 (met) † | 2 (met) / 2 (met) |
| NS-P2 queue drains within 60 s after each burst | every burst <= 60 s | [0.045012695312493634,0.7007136230469087] (met) / [0.045012695312493634,0.7007136230469087] (met) | [0.08511035156249136,0.2745527343749927] (met) / [0.08511035156249136,0.2745527343749927] (met) | [0.02558154296875159,0.4101291503906168] (met) / [0.02558154296875159,0.4101291503906168] (met) | [0.02718383789061818,0.2573798828125291] (met) / [0.02718383789061818,0.2573798828125291] (met) † | [0.023116943359383413,0.17938525390627547] (met) / [0.023116943359383413,0.17938525390627547] (met) |
| NS-P2 read-your-own-write at the returned tx | = 1.0 | 1 (met) / 1 (met) | 1 (met) / 1 (met) | 1 (met) / 1 (met) | 1 (met) / 1 (met) † | 1 (met) / 1 (met) |
| NS-P2 duplicates return the original receipt | = 1.0 | 1 (met) / 1 (met) | 1 (met) / 1 (met) | 1 (met) / 1 (met) | 1 (met) / 1 (met) † | 1 (met) / 1 (met) |
| NS-P2 lost ACKs return the original receipt | = 1.0 | 1 (met) / 1 (met) | 1 (met) / 1 (met) | 1 (met) / 1 (met) | 1 (met) / 1 (met) † | 1 (met) / 1 (met) |
| NS-P3 gaps | = 0 | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) † | 0 (met) / 0 (met) |
| NS-P3 per-subject order violations | = 0 | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) † | 0 (met) / 0 (met) |
| NS-P3 visible duplicate effects | = 0 | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) † | 0 (met) / 0 (met) |
| NS-P3 resume from checkpoint replays exactly | = true | true (met) / true (met) | true (met) / true (met) | true (met) / true (met) | true (met) / true (met) † | true (met) / true (met) |
| NS-P3 crash injection at three points | = 3 | 3 (met) / 3 (met) | 3 (met) / 3 (met) | 3 (met) / 3 (met) | 3 (met) / 3 (met) † | 3 (met) / 3 (met) |
| NS-P3 lag p99 ms at L256 | <= 250 | 46.322 (met) / 46.322 (met) | 18.28 (met) / 18.28 (met) | 76.858 (met) / 76.858 (met) | 52.781 (met) / 52.781 (met) † | 22.5 (met) / 22.5 (met) |
| NS-P3 affected-subject set matches | = 0 | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) | 0 (met) / 0 (met) † | 0 (met) / 0 (met) |
| NS-P3 corrections report their valid-time range | = 1.0 | 1 (met) / 1 (met) | 1 (met) / 1 (met) | 1 (met) / 1 (met) | 1 (met) / 1 (met) † | 1 (met) / 1 (met) |
| NS-P4 weighted-mix pull p50 ms | <= 5 | 0.032 (met) / 0.032 (met) | 0.028 (met) / 0.028 (met) | 0.029 (met) / 0.029 (met) | 0.03 (met) / 0.03 (met) † | 0.029 (met) / 0.029 (met) |
| NS-P4 weighted-mix pull p99 ms | <= 25 | 0.247 (met) / 0.247 (met) | 0.2 (met) / 0.2 (met) | 0.21 (met) / 0.21 (met) | 0.213 (met) / 0.213 (met) † | 0.212 (met) / 0.212 (met) |
| NS-P4 largest bucket p99 ms (provisional) | <= 50 | 0.357 (met) / 0.357 (met) | 0.281 (met) / 0.281 (met) | 0.289 (met) / 0.289 (met) | 0.299 (met) / 0.299 (met) † | 0.299 (met) / 0.299 (met) |
| NS-P4 history flatness p99 depth10 / depth1 | <= 1.1 | 1.01875 (met) / 1.01875 (met) | 1.045802 (met) / 1.045802 (met) | 1.021583 (met) / 1.021583 (met) | 1.021127 (met) / 1.021127 (met) † | 1.021429 (met) / 1.021429 (met) |
| NS-P4 history flatness bytes read depth10 / depth1 | <= 1.1 | null (unmeasured/reported) / null (unmeasured/reported) | null (unmeasured/reported) / null (unmeasured/reported) | null (unmeasured/reported) / null (unmeasured/reported) | null (unmeasured/reported) / null (unmeasured/reported) † | null (unmeasured/reported) / null (unmeasured/reported) |
| Zero context all-primary p99 ms (50-ms reference) | <= 50 | 54.824707 (MISS) / 52.186768 (MISS) | 49.37793 (met) / 47.033447 (met) | 48.729492 (met) / 45.639648 (met) | 57.290527 (MISS) / 53.10498 (MISS) † | 51.130371 (MISS) / 48.570312 (met) |
| P2 loaded all-primary p99 ms | <= 50 | 55.647461 (MISS) / 50.63623 (MISS) | 71.013428 (MISS) / 67.049805 (MISS) | 67.224121 (MISS) / 61.95459 (MISS) | 49.807129 (met) / 46.39502 (met) † | 48.849365 (met) / 45.58374 (met) |
| P2 burst 5-10 p50 ms | <= 10 | 9.791 (met) / 8.511 (met) | 9.663 (met) / 8.383 (met) | 9.663 (met) / 8.575 (met) | 9.151 (met) / 8.575 (met) † | 8.831 (met) / 8.191 (met) |
| P2 burst 11-25 p50 ms | <= 10 | 12.095 (MISS) / 10.431 (MISS) | 11.775 (MISS) / 10.239 (MISS) | 11.839 (MISS) / 10.431 (MISS) | 11.263 (MISS) / 10.303 (MISS) † | 10.879 (MISS) / 9.983 (met) |
| P4 whole-machine weighted correct pulls/s | >= 4400 | 16521.215287 (met) / 16521.215287 (met) | 19073.441454 (met) / 19073.441454 (met) | 18171.534387 (met) / 18171.534387 (met) | 17830.605789 (met) / 17830.605789 (met) † | 18345.833971 (met) / 18345.833971 (met) |
| P4 depth1/depth3/depth10 p99 ms | depth10/depth1 <=1.1 | [0.16,0.166,0.163] (same clocks) | [0.131,0.137,0.137] (same clocks) | [0.139,0.143,0.142] (same clocks) | [0.142,0.146,0.145] (same clocks) † | [0.14,0.144,0.143] (same clocks) |
| all-read correct / total / errors | zero errors and wrong worlds | 18290176/18290176/0 | 20304039/20304039/0 | 19766713/19766713/0 | 19175247/19175248/1 | 19971607/19971607/0 |
| oracle commands/reads/queries/mismatches | exact | [810,53,2241,0] PASS | [810,53,2296,0] PASS | [810,53,2771,0] PASS | [810,53,2682,0] PASS † | [810,53,2485,0] PASS |

P4 uses actual correct weighted pulls divided by measured weighted-phase wall time across the whole machine. Physical engine bytes/query remain unmeasured. P5 is outside this task. Original counters and clocks are never adjusted for the verdict. The corrected column is a counterfactual threshold comparison, not a promotion or a proposal to change Sam’s definition.

| commit measurement | C | A | F | G | H |
| --- | --- | --- | --- | --- | --- |
| all-primary p50/p99; today → ACK-only → corrected ms | [11.18896484375,55.6474609375] → [10.658203125,54.941650390625] → [9.717529296875,50.63623046875] | [11.12158203125,71.013427734375] → [10.599853515625,70.816162109375] → [9.728759765625,67.0498046875] | [11.07958984375,67.22412109375] → [10.56640625,66.699951171875] → [9.85595703125,61.95458984375] | [10.604736328125,49.80712890625] → [10.0634765625,49.30517578125] → [9.73095703125,46.39501953125] | [10.200927734375,48.849365234375] → [9.680419921875,48.241943359375] → [9.396728515625,45.583740234375] |
| L256 5-10 p50/p99; today → ACK-only → corrected ms | [11.391,24.464] → [10.815,23.513] → [10.175,22.585] | [11.647,39.836] → [11.071,38.772] → [10.175,38.76] | [12.223,150.402] → [11.583,149.729] → [11.071,149.479] | [10.943,18.651] → [10.367,18.024] → [9.791,18.023] | [10.879,103.006] → [10.239,102.283] → [10.047,102.281] |
| L256 11-25 p50/p99; today → ACK-only → corrected ms | [13.567,22.795] → [12.351,21.09] → [12.095,20.769] | [14.655,30.121] → [13.311,29.227] → [12.799,28.527] | [13.055,23.268] → [12.287,22.286] → [11.583,21.979] | [14.527,46.033] → [13.439,44.296] → [13.439,44.292] | [12.799,18.909] → [12.031,17.983] → [11.967,17.982] |
| burst 5-10/11-25 p50; today → ACK-only → corrected ms | [9.791,12.095] → [9.471,11.455] → [8.511,10.431] | [9.663,11.775] → [9.279,11.135] → [8.383,10.239] | [9.663,11.839] → [9.279,11.199] → [8.575,10.431] | [9.151,11.263] → [8.831,10.687] → [8.575,10.303] | [8.831,10.879] → [8.511,10.303] → [8.191,9.983] |

| scheduler / clock / counts | C | A | F | G | H |
| --- | --- | --- | --- | --- | --- |
| offer lateness p50/p99 ms | [0.693115234375,6.0654296875] | [0.657958984375,5.748291015625] | [0.602783203125,5.301513671875] | [0.001708984375,4.50390625] | [0.001708984375,4.102294921875] |
| post-ACK p50/p99 ms | [0.406494140625,2.020751953125] | [0.407958984375,1.920654296875] | [0.412109375,1.98046875] | [0.409423828125,2.020751953125] | [0.401611328125,1.9384765625] |
| primary >50 ms burst/growth/sparse | [68,16,12] | [101,15,28] | [77,17,37] | [51,12,10] | [47,13,8] |
| indexed complete depths / retained witness count / pending | [true,7436,0] | [true,7436,0] | [true,7436,0] | [true,7436,0] | [true,7436,0] |

Stress ratios use the same exact source and matched-zero writer file bytes; observed L256 bands, bursts, stress distributions/denominators and every recovery window are reconstructed and compared with the original scorecard. Historical off arms do not have an observed offer clock, so a corrected off control cannot be invented. Every new off arm records it.

Source hashes: C `7e8ccd816d69592eee0c8db6445ea1b985008a7a`, A `5e9e1ad336ef30670e182eaf865f7c7ff1c09795`, F `c8ef367bb0deb12bea3a8587bdbd2c21ccf10df5`, G `dce01797d3015f243262c70bdc6605186a090e06`, H `f846bcd77f7858836861a5efb1d3c6fc15d2d22a`. Split rule is `pending` in every pair. The scheduler repair starts a new bench source series. Raw traces, unchanged reports, offline timelines and source/slot/input seals stay under the corresponding private run tags; public run folders retain reports/indices/seals only. [History switch](HISTORY-10.md), [disk diagnostic](DISK-10.md), [idle diagnosis](IDLE-10.md), [CPU rejection](CORES-10.md), [failed G](FAILED-PAIR-10.md), [audit](AUDIT-10.md).
