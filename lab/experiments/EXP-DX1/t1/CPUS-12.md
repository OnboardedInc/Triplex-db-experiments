Eight/six/eight CPU comparison on the same code and frozen smoke workload. No v3 qualification: loaded write-derived bars are underfilled. All latencies are ACK-clock; all arms use summary tracing and early compilation. The database layout and durability settings are unchanged.

Source `2409bdada6be6cb7f17d1aa71f31da90a72f01af`. TX0, PG1, write gateway2, writer3; readers/helpers4–7 with eight CPUs or4–5 with six; read gateway4. The same complete smoke pair (900-second offered span, normal 45-second levels, P4/history) ran in each arm. All eight CPUs restored, scheduler settings restored, owned inventory empty before lease release.

| Arm / mode | all-primary p50 / p99 ms (n) | L256 all / small / medium p50 ms | swap GiB / Mac CPU median % | correct model reads / oracle | sampled minimum guest available GiB / OOM |
| --- | --- | --- | --- | --- | --- |
| 1-eight-zero | 9.914 / 123.192 (7408) | n/a | 11.833 / 32.500 | 7408 / NOT-RUN | 6.626 / 0 |
| 1-eight-ladder | 10.383 / 129.465 (7408) | 14.655 / 13.567 / 18.175 | 11.348 / 36.600 | 17401700 / PASS | 4.531 / 0 |
| 2-six-zero | 8.266 / 122.402 (7408) | n/a | 12.193 / 47.800 | 7408 / NOT-RUN | 6.713 / 0 |
| 2-six-ladder | 8.504 / 121.834 (7408) | 12.799 / 11.583 / 12.799 | 11.872 / 51.900 | 14446479 / PASS | 5.057 / 0 |
| 3-eight-zero | 9.851 / 60.589 (7408) | n/a | 12.760 / 31.300 | 7408 / NOT-RUN | 6.521 / 0 |
| 3-eight-ladder | 10.362 / 65.521 (7408) | 12.735 / 12.287 / 14.207 | 12.619 / 32.100 | 18104093 / PASS | 5.165 / 0 |

| Contrast | before / six / after p50 ms | gain / bookend drift ms | exceeds drift |
| --- | --- | --- | --- |
| zero all-primary | 9.914 / 8.266 / 9.851 | 1.616 / 0.063 | True |
| ladder L256 all commits | 14.655 / 12.799 / 12.735 | 0.896 / 1.920 | False |

Every loaded bar below is copied from the completed driver report, including n and the available 90% bootstrap interval. Unjudged counts as not met. Eight CPUs remains the default; the diagnostic cannot prove no P1 loss with sparse writer/recovery cohorts, and Sam must decide a test-bed change.

| Priority / bar | 8 before | 6 | 8 after |
| --- | --- | --- | --- |
| P1 / NS-P1-VIOLATIONS-MAX (L256) | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable |
| P1 / NS-P1-GOODPUT-256-VS-64 | 0.896; MISS; n=1557210/1737793; CI=[0.791,1.023] | 0.808; MISS; n=719019/890399; CI=[0.708,0.916] | 0.943; MISS; n=1697570/1799538; CI=[0.849,1.057] |
| P1 / NS-P1-READ-P99-256-MS | 8.063; MET; n=1557210/–; CI=[8.031,8.095] | 16.639; MET; n=719019/–; CI=[16.639,16.767] | 7.359; MET; n=1697570/–; CI=[7.327,7.359] |
| P1 / NS-P1-WRITER-P99-RATIO-256 | 7.167; UNJUDGED (n<500 on one or both sides); n=46/46; CI=[1.226,7.859] | 1.249; UNJUDGED (n<500 on one or both sides); n=46/46; CI=[0.533,2.952] | 1.570; UNJUDGED (n<500 on one or both sides); n=46/46; CI=[1.206,2.329] |
| P1 / NS-P1-WRITER-WAIT-MAX-MS (L256) | 207.474; UNJUDGED (n<500); n=46/–; CI=[32.303,207.474] | 94.652; UNJUDGED (n<500); n=46/–; CI=[35.465,94.652] | 50.848; UNJUDGED (n<500); n=46/–; CI=[36.751,50.848] |
| P1 / NS-P1-VIOLATIONS-MAX (L1024) | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable |
| P1 / NS-P1-GOODPUT-1024-VS-256 | 1.108; MET; n=1724916/1557210; CI=[0.969,1.261] | 1.504; MET; n=1081595/719019; CI=[1.240,1.772] | 1.074; MET; n=1822513/1697570; CI=[0.970,1.190] |
| P1 / NS-P1-WRITER-P99-RATIO-1024 | 1.765; UNJUDGED (n<500 on one or both sides); n=46/46; CI=[1.118,3.426] | 1.292; UNJUDGED (n<500 on one or both sides); n=46/46; CI=[1.059,1.420] | 0.444; UNJUDGED (n<500 on one or both sides); n=46/46; CI=[0.392,2.330] |
| P1 / NS-P1-RECOVERY-MS | unknown; UNJUDGED (recovery window incomplete or n<500); n=39/39; CI=unavailable | unknown; UNJUDGED (recovery window incomplete or n<500); n=39/39; CI=unavailable | unknown; UNJUDGED (recovery window incomplete or n<500); n=39/39; CI=unavailable |
| P1 / 1.1 P1.1 hot-set share of reads (min over ladder levels) | 0.593; MET; n=7408/–; CI=unavailable | 0.592; MET; n=7408/–; CI=unavailable | 0.593; MET; n=7408/–; CI=unavailable |
| P1 / 1.1 P1.2 split reads straddling a frozen-trace command, all correct | 62012; MET; n=7408/–; CI=unavailable | 39936; MET; n=7408/–; CI=unavailable | 65561; MET; n=7408/–; CI=unavailable |
| P1 / 4.1.5 fallback share per window (reported) | [0,8.722368318275314e-05,0.001494387002813283,8.228828174586962e-05,0.00022411877652981935,0.0005211847997235807]; UNJUDGED; n=7408/–; CI=unavailable | [9.65627522701903e-07,0.0008260145039838823,0.006544781959166252,6.963170443812269e-05,0.0008149993254698416,0.0010133182938160772]; UNJUDGED; n=7408/–; CI=unavailable | [0,3.209432769789856e-05,0.0009345883519774172,6.89065749097824e-05,0,0.00043017525800913357]; UNJUDGED; n=7408/–; CI=unavailable |
| P1 / 1.1 P1.3 a maintenance event in every P1 window | [1,1,1,1,1,1]; MET; n=7408/–; CI=unavailable | [1,1,1,1,1,1]; MET; n=7408/–; CI=unavailable | [1,1,1,1,1,1]; MET; n=7408/–; CI=unavailable |
| P2 / NS-P2 5-10 band p50 ms (L256) | 13.567; UNJUDGED (n<500); n=29/–; CI=[12.031,15.551] | 11.583; UNJUDGED (n<500); n=29/–; CI=[10.495,14.463] | 12.287; UNJUDGED (n<500); n=29/–; CI=[11.135,13.439] |
| P2 / NS-P2 5-10 band p99 ms (L256) | 32.303; UNJUDGED (n<500); n=29/–; CI=[27.901,32.303] | 40.373; UNJUDGED (n<500); n=29/–; CI=[26.000,40.373] | 50.848; UNJUDGED (n<500); n=29/–; CI=[35.276,50.848] |
| P2 / NS-P2 11-25 band p50 ms (L256) | 18.175; UNJUDGED (n<500); n=16/–; CI=[13.439,25.727] | 12.799; UNJUDGED (n<500); n=16/–; CI=[8.959,16.127] | 14.207; UNJUDGED (n<500); n=16/–; CI=[11.071,17.151] |
| P2 / NS-P2 11-25 band p99 ms (L256) | 207.474; UNJUDGED (n<500); n=16/–; CI=[29.457,207.474] | 94.652; UNJUDGED (n<500); n=16/–; CI=[26.184,94.652] | 43.378; UNJUDGED (n<500); n=16/–; CI=[18.368,43.378] |
| P2 / NS-P2 26-50 band p99 ms (L256, provisional) | 52.685; UNJUDGED (n<500); n=1/–; CI=[52.685,52.685] | 52.506; UNJUDGED (n<500); n=1/–; CI=[52.506,52.506] | 12.964; UNJUDGED (n<500); n=1/–; CI=[12.964,12.964] |
| P2 / NS-P2 every offered command accounted | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable |
| P2 / NS-P2 no expired primary commands | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable |
| P2 / NS-P2 every oracle-valid trace command published | 7408/7408; MET; n=7408/–; CI=unavailable | 7408/7408; MET; n=7408/–; CI=unavailable | 7408/7408; MET; n=7408/–; CI=unavailable |
| P2 / NS-P2 typed rejections only for deliberately invalid commands | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable |
| P2 / NS-P2 typed conflicts only where the oracle finds a CAS race | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable |
| P2 / NS-P2 steady-state queue <= 2 s of offered rate | 1; MET; n=7408/–; CI=unavailable | 1; MET; n=7408/–; CI=unavailable | 1; MET; n=7408/–; CI=unavailable |
| P2 / NS-P2 queue drains within 60 s after each burst | [0.04875170898438341,0.12556152343745453]; MET; n=7408/–; CI=unavailable | [0.03181176757811954,0.147178466796845]; MET; n=7408/–; CI=unavailable | [0.0315571289062575,0.09544433593748636]; MET; n=7408/–; CI=unavailable |
| P2 / NS-P2 read-your-own-write at the returned tx | 1; MET; n=7408/–; CI=unavailable | 1; MET; n=7408/–; CI=unavailable | 1; MET; n=7408/–; CI=unavailable |
| P2 / NS-P2 duplicates return the original receipt | 1; MET; n=7408/–; CI=unavailable | 1; MET; n=7408/–; CI=unavailable | 1; MET; n=7408/–; CI=unavailable |
| P2 / NS-P2 lost ACKs return the original receipt | 1; MET; n=7408/–; CI=unavailable | 1; MET; n=7408/–; CI=unavailable | 1; MET; n=7408/–; CI=unavailable |
| P2 / NS-P2 all-primary p99 ms | 129.465; MISS; n=7408/–; CI=[111.070,153.408] | 121.834; MISS; n=7408/–; CI=[98.989,139.679] | 65.521; MISS; n=7408/–; CI=[60.714,69.952] |
| P2 / NS-P2 burst 5-10 band p50 ms | 8.831; MET; n=3972/–; CI=[8.703,8.959] | 7.007; MET; n=3972/–; CI=[6.879,7.103] | 8.767; MET; n=3972/–; CI=[8.703,8.895] |
| P2 / NS-P2 burst 11-25 band p50 ms | 10.751; MISS; n=1895/–; CI=[10.559,10.943] | 8.703; MET; n=1895/–; CI=[8.511,8.895] | 11.007; MISS; n=1895/–; CI=[10.751,11.199] |
| P3 / NS-P3 gaps | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable |
| P3 / NS-P3 per-subject order violations | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable |
| P3 / NS-P3 visible duplicate effects | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable |
| P3 / NS-P3 resume from checkpoint replays exactly | True; MET; n=7408/–; CI=unavailable | True; MET; n=7408/–; CI=unavailable | True; MET; n=7408/–; CI=unavailable |
| P3 / NS-P3 crash injection at three points | 3; MET; n=7408/–; CI=unavailable | 3; MET; n=7408/–; CI=unavailable | 3; MET; n=7408/–; CI=unavailable |
| P3 / NS-P3 lag p99 ms at L256 | 58.846; UNJUDGED (n<500); n=46/–; CI=[28.031,58.846] | 41.704; UNJUDGED (n<500); n=46/–; CI=[32.767,41.704] | 43.360; UNJUDGED (n<500); n=46/–; CI=[23.039,43.360] |
| P3 / NS-P3 affected-subject set matches | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable | 0; MET; n=7408/–; CI=unavailable |
| P3 / NS-P3 corrections report their valid-time range | 1; MET; n=7408/–; CI=unavailable | 1; MET; n=7408/–; CI=unavailable | 1; MET; n=7408/–; CI=unavailable |
| P4 / NS-P4 weighted-mix pull p50 ms | 0.030; MET; n=766282/–; CI=[0.030,0.030] | 0.025; MET; n=909591/–; CI=[0.024,0.025] | 0.029; MET; n=787735/–; CI=[0.029,0.029] |
| P4 / NS-P4 weighted-mix pull p99 ms | 0.230; MET; n=766282/–; CI=[0.229,0.231] | 0.118; MET; n=909591/–; CI=[0.117,0.119] | 0.214; MET; n=787735/–; CI=[0.213,0.215] |
| P4 / NS-P4 largest bucket p99 ms (provisional) | 0.329; MET; n=113659/–; CI=[0.325,0.333] | 0.201; MET; n=135301/–; CI=[0.197,0.205] | 0.301; MET; n=116976/–; CI=[0.297,0.303] |
| P4 / NS-P4 history flatness p99 depth10 / depth1 | 1.029; MET; n=1541227/1613207; CI=[1.015,1.037] | 1; MET; n=1836342/1865783; CI=[1,1.011] | 1.074; MET; n=1529390/1620144; CI=[1.058,1.074] |
| P4 / NS-P4 history flatness bytes read depth10 / depth1 | unknown; UNJUDGED; n=7408/–; CI=unavailable | unknown; UNJUDGED; n=7408/–; CI=unavailable | unknown; UNJUDGED; n=7408/–; CI=unavailable |
| P4 / NS-P4 correct weighted pulls/s whole machine | 17820.855; MET; n=766282/–; CI=[17377.581,18223.023] | 21153.713; MET; n=909591/–; CI=[20619.772,21623.095] | 18319.918; MET; n=787735/–; CI=[17993.372,18581.023] |

Memory is the minimum of one-second whole-guest samples over each arm, not a per-request wall-clock join or a hard fit guarantee. Zero OOM counters are observed cgroup values. Zero-reader oracle is intentionally NOT-RUN; each loaded oracle is PASS with no mismatches and exact receipt consistency.

Producer: `p12/cpu-price.py`; consumed input hashes and source/build/slot checks: `p12/cpu-price-12.json`. No cited older evidence was changed.

L256 correct pulls/s are 36,215.047 / 16,721.873 / 39,479.580 (8/6/8). G256/G64 is .896089 / .807517 / .943350; read p99 is 8.063 / 16.639 / 7.359 ms. Whole-machine P4 is 17,820.855 / 21,153.713 / 18,319.918 pulls/s; flatness 1.029412 / 1.000000 / 1.073529. Six improves the zero-reader median beyond drift, but its L256 .896-ms gain is below 1.920-ms drift and reader capacity falls sharply. Reject six as the default. `p12/cpu-rows-check-12.json` additionally validates six unique driver containers, all six 7,408-command raw ACK cohorts through the common accessor, and 293 Git source preimages.
