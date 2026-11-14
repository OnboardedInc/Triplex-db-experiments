# Complete phase anatomy from original part-6 traces

Derived with the permanent report.mjs --anatomy-to command; original raw files and cited reports are unchanged. Original run source and renderer content hash are separate fields. Every input passes the normal source/slot/command/collector reader before the table is emitted. These are new analyses of old attempts, not reruns. Quantiles are p50/p99 ms; they do not add. CPU columns cover synchronous counter scopes and can be quantized; they cannot be subtracted from all TypeScript wall to identify a hidden wait.

Full binary components node,gateway,tx-jfr; unchanged 10,000 subjects. Floor arms run the 200-second zero-reader diagnostic; loaded arms run the 300-second ladder, with the normal full 45-second L256 phase. A/B/B/A for cache, A/B/A for revision and cores. Host columns below are measured-window medians (GiB swap; percent Mac non-VM CPU). Controls are the first/last baseline of each group, not another session. Complete commit latency/control tables remain in [CACHE-6](CACHE-6.md), [REVISION-6](REVISION-6.md), [CORES-6](CORES-6.md).

## cache0-b

Source 9ac79685c6286ce7a20f3d06be5556d314817f42; controls tx2-dxt1-p6-cache0-b-1-baseline, tx2-dxt1-p6-cache0-b-4-baseline.

| arm / scope | n | commit | peer | native process | native txfn | submit residual | ACK residual | cold SQL / observed | swap / Mac CPU |
| --- | ---: | --- | --- | --- | --- | --- | --- | ---: | --- |
| 1-baseline / all zero readers | 3420 | 11.488/43.077 | 5.740/31.566 | 3.520/24.400 | 0.830/8.860 | 0.863/9.716 | 0.894/5.764 | 340/3420 | 4.851/10.6 |
| 2-candidate / all zero readers | 3420 | 11.494/43.859 | 5.694/30.635 | 3.510/25.300 | 0.880/9.280 | 0.854/6.707 | 0.866/5.931 | 278/3420 | 4.851/12.6 |
| 3-candidate / all zero readers | 3420 | 11.260/49.365 | 5.593/36.300 | 3.460/25.000 | 0.840/9.120 | 0.849/6.992 | 0.865/5.790 | 273/3420 | 4.835/11.1 |
| 4-baseline / all zero readers | 3420 | 11.466/43.413 | 5.790/33.088 | 3.580/25.900 | 0.840/8.870 | 0.874/8.172 | 0.879/5.528 | 359/3420 | 4.835/11.4 |

| same scope / arm | TypeScript own | observed on CPU | waiting for CPU | swap / Mac CPU |
| --- | --- | --- | --- | --- |
| 1-baseline | 2.158/7.117 | 0.338/2.145 | 0.000/0.032 | 4.851/10.6 |
| 2-candidate | 2.210/7.146 | 0.379/2.228 | 0.000/0.029 | 4.851/12.6 |
| 3-candidate | 2.127/6.850 | 0.404/2.014 | 0.000/0.029 | 4.835/11.1 |
| 4-baseline | 2.138/6.906 | 0.340/2.117 | 0.000/0.023 | 4.835/11.4 |

Peer p50 mean-control 5.765, mean-candidate 5.644, benefit 0.122, bookend drift 0.050 ms. Same tracing/host contexts as the rows above.

## cache256-b

Source 9ac79685c6286ce7a20f3d06be5556d314817f42; controls tx2-dxt1-p6-cache256-b-1-baseline, tx2-dxt1-p6-cache256-b-4-baseline.

| arm / scope | n | commit | peer | native process | native txfn | submit residual | ACK residual | cold SQL / observed | swap / Mac CPU |
| --- | ---: | --- | --- | --- | --- | --- | --- | ---: | --- |
| 1-baseline / L256 | 50 | 12.124/28.567 | 6.422/21.174 | 4.630/17.800 | 1.860/6.040 | 0.730/1.445 | 0.829/3.210 | 29/50 | 4.827/10.2 |
| 2-candidate / L256 | 50 | 11.545/29.475 | 6.047/25.526 | 4.610/24.100 | 1.330/7.120 | 0.756/1.149 | 0.712/3.641 | 26/50 | 4.812/12.0 |
| 3-candidate / L256 | 50 | 11.129/44.363 | 6.323/38.304 | 4.280/36.400 | 1.280/23.660 | 0.783/2.752 | 0.790/4.209 | 20/50 | 4.812/11.0 |
| 4-baseline / L256 | 50 | 11.740/116.268 | 6.313/112.509 | 4.330/110.000 | 1.190/5.770 | 0.804/3.632 | 0.778/4.329 | 24/50 | 4.804/10.8 |

| same scope / arm | TypeScript own | observed on CPU | waiting for CPU | swap / Mac CPU |
| --- | --- | --- | --- | --- |
| 1-baseline | 2.718/5.046 | 0.000/1.896 | 0.000/0.000 | 4.827/10.2 |
| 2-candidate | 2.911/6.514 | 0.160/2.349 | 0.000/0.000 | 4.812/12.0 |
| 3-candidate | 2.420/9.323 | 0.000/3.287 | 0.000/0.047 | 4.812/11.0 |
| 4-baseline | 2.630/7.616 | 0.000/2.460 | 0.000/0.553 | 4.804/10.8 |

Peer p50 mean-control 6.367, mean-candidate 6.185, benefit 0.182, bookend drift 0.109 ms. Same tracing/host contexts as the rows above.

## rev0-a

Source b9b9c9f64441014c5fa84dc0bc6164736ca858fc; controls tx2-dxt1-p6-rev0-a-1-baseline, tx2-dxt1-p6-rev0-a-3-baseline.

| arm / scope | n | commit | peer | native process | native txfn | submit residual | ACK residual | cold SQL / observed | swap / Mac CPU |
| --- | ---: | --- | --- | --- | --- | --- | --- | ---: | --- |
| 1-baseline / all zero readers | 3420 | 11.818/50.014 | 5.847/38.728 | 3.610/31.800 | 0.960/10.770 | 0.867/7.066 | 0.879/5.858 | 293/3420 | 4.765/11.6 |
| 2-candidate / all zero readers | 3420 | 11.782/45.084 | 5.860/32.344 | 3.670/25.600 | 0.910/9.590 | 0.841/8.093 | 0.897/6.058 | 289/3420 | 4.765/11.7 |
| 3-baseline / all zero readers | 3420 | 11.410/45.606 | 5.726/34.229 | 3.500/24.700 | 0.890/8.840 | 0.853/10.361 | 0.874/5.796 | 290/3420 | 4.765/10.7 |

| same scope / arm | TypeScript own | observed on CPU | waiting for CPU | swap / Mac CPU |
| --- | --- | --- | --- | --- |
| 1-baseline | 2.277/7.877 | 0.378/2.639 | 0.000/0.029 | 4.765/11.6 |
| 2-candidate | 2.204/6.979 | 0.433/2.214 | 0.000/0.016 | 4.765/11.7 |
| 3-baseline | 2.112/6.974 | 0.334/2.397 | 0.000/0.033 | 4.765/10.7 |

Peer p50 mean-control 5.786, mean-candidate 5.860, benefit -0.074, bookend drift 0.121 ms. Same tracing/host contexts as the rows above.

## rev256-a

Source b9b9c9f64441014c5fa84dc0bc6164736ca858fc; controls tx2-dxt1-p6-rev256-a-1-baseline, tx2-dxt1-p6-rev256-a-3-baseline.

| arm / scope | n | commit | peer | native process | native txfn | submit residual | ACK residual | cold SQL / observed | swap / Mac CPU |
| --- | ---: | --- | --- | --- | --- | --- | --- | ---: | --- |
| 1-baseline / L256 | 50 | 12.003/41.043 | 6.363/37.063 | 4.510/34.600 | 1.440/16.550 | 0.812/8.737 | 0.875/3.809 | 23/50 | 4.741/10.5 |
| 2-candidate / L256 | 50 | 11.290/56.677 | 6.593/50.002 | 4.830/47.200 | 1.760/7.760 | 0.770/1.976 | 0.705/1.781 | 22/50 | 4.741/10.6 |
| 3-baseline / L256 | 50 | 11.757/96.466 | 6.368/89.605 | 4.480/87.500 | 1.830/75.580 | 0.735/4.547 | 0.737/1.389 | 26/50 | 4.741/11.3 |

| same scope / arm | TypeScript own | observed on CPU | waiting for CPU | swap / Mac CPU |
| --- | --- | --- | --- | --- |
| 1-baseline | 2.421/6.811 | 0.000/1.994 | 0.000/0.000 | 4.741/10.5 |
| 2-candidate | 2.522/6.196 | 0.000/2.005 | 0.000/0.004 | 4.741/10.6 |
| 3-baseline | 2.774/5.287 | 0.000/1.622 | 0.000/0.000 | 4.741/11.3 |

Peer p50 mean-control 6.365, mean-candidate 6.593, benefit -0.227, bookend drift 0.005 ms. Same tracing/host contexts as the rows above.

## cores0-a

Source 7629065bb0a0221b3ec27af2f5a6f030bd33487f; controls tx2-dxt1-p6-cores0-a-1-baseline, tx2-dxt1-p6-cores0-a-3-baseline.

| arm / scope | n | commit | peer | native process | native txfn | submit residual | ACK residual | cold SQL / observed | swap / Mac CPU |
| --- | ---: | --- | --- | --- | --- | --- | --- | ---: | --- |
| 1-baseline / all zero readers | 3420 | 11.466/45.505 | 5.666/32.590 | 3.490/23.000 | 0.840/7.800 | 0.877/7.927 | 0.874/5.741 | 284/3420 | 4.733/10.6 |
| 2-candidate / all zero readers | 3420 | 10.654/36.958 | 5.070/23.093 | 3.010/16.600 | 0.700/6.640 | 0.839/5.965 | 0.855/5.629 | 237/3420 | 4.733/11.0 |
| 3-baseline / all zero readers | 3420 | 11.259/44.229 | 5.687/30.750 | 3.520/23.600 | 0.840/7.590 | 0.846/7.329 | 0.883/5.333 | 267/3420 | 4.733/11.4 |

| same scope / arm | TypeScript own | observed on CPU | waiting for CPU | swap / Mac CPU |
| --- | --- | --- | --- | --- |
| 1-baseline | 2.191/6.974 | 0.330/2.235 | 0.000/0.000 | 4.733/10.6 |
| 2-candidate | 2.144/6.904 | 0.307/2.262 | 0.000/0.033 | 4.733/11.0 |
| 3-baseline | 2.128/6.869 | 0.311/2.234 | 0.000/0.029 | 4.733/11.4 |

Peer p50 mean-control 5.677, mean-candidate 5.070, benefit 0.607, bookend drift 0.021 ms. Same tracing/host contexts as the rows above.

## cores256-a

Source 7629065bb0a0221b3ec27af2f5a6f030bd33487f; controls tx2-dxt1-p6-cores256-a-1-baseline, tx2-dxt1-p6-cores256-a-3-baseline.

| arm / scope | n | commit | peer | native process | native txfn | submit residual | ACK residual | cold SQL / observed | swap / Mac CPU |
| --- | ---: | --- | --- | --- | --- | --- | --- | ---: | --- |
| 1-baseline / L256 | 50 | 12.389/161.097 | 6.089/155.404 | 4.330/153.000 | 1.370/7.330 | 0.793/3.657 | 0.708/3.613 | 21/50 | 4.733/10.1 |
| 2-candidate / L256 | 50 | 12.372/44.939 | 6.488/41.330 | 4.700/39.800 | 1.740/7.960 | 0.791/2.237 | 0.750/3.743 | 24/50 | 4.726/12.2 |
| 3-baseline / L256 | 50 | 12.282/21.715 | 6.583/15.533 | 4.830/14.000 | 1.320/6.270 | 0.775/3.837 | 0.753/5.523 | 22/50 | 4.726/11.4 |

| same scope / arm | TypeScript own | observed on CPU | waiting for CPU | swap / Mac CPU |
| --- | --- | --- | --- | --- |
| 1-baseline | 2.929/6.783 | 0.557/2.411 | 0.000/0.444 | 4.733/10.1 |
| 2-candidate | 2.901/6.119 | 0.184/1.998 | 0.000/0.193 | 4.726/12.2 |
| 3-baseline | 2.949/7.051 | 0.000/2.008 | 0.000/0.000 | 4.726/11.4 |

Peer p50 mean-control 6.336, mean-candidate 6.488, benefit -0.151, bookend drift 0.495 ms. Same tracing/host contexts as the rows above.

The two-core all-run benefit occurs outside the steady L256 median: steady peer p50 does not improve beyond its own drift. Cache improves the measured L256 small commit bar but its small-band peer median gain is within drift. Do not turn the mixed-load peer improvement into a claim about steady 256-reader engine service. Index-adoption times, dedicated messaging-thread run-queue waits, per-helper logical-read counts and exact peer/storage sublegs remain unsplit.

## Full-pair phase context

These complete fixed-window rows retain all primary commits; the zero arm has zero readers even when its clock-window name is L256. Subject/writer trace is unchanged. Reference uses summary; native diagnostic uses full with writer/JVM sampling. Separate off bookends and original source/whole-arm host drift are in REFERENCE-6.md and NATIVE-CONTEXT-6.md. Host columns below use samples inside the actual phase window. Native diagnostic bookends drift sharply, so its zero/loaded difference is not a causal reader-cost estimate.

| run / window / actual readers | n | commit p50/p99 | peer p50/p99 | native p50/p99 | txfn p50/p99 | cold SQL / observed | on CPU p50/p99 | runqueue p50/p99 | swap GiB / Mac CPU % |
| --- | ---: | --- | --- | --- | --- | ---: | --- | --- | --- |
| reference-a-zero / baseline / 0 | 46 | 20.451/169.091 | 11.760/155.528 | n/a | n/a | 0/0 | 0.997/10.138 | 0.000/0.046 | 11.649/65.1 |
| reference-a-zero / L64 / 0 | 50 | 14.911/133.756 | 6.826/75.484 | n/a | n/a | 0/0 | 0.997/4.998 | 0.000/0.031 | 11.649/56.9 |
| reference-a-zero / L256 / 0 | 50 | 14.275/59.840 | 7.058/51.153 | n/a | n/a | 0/0 | 0.898/2.926 | 0.000/0.068 | 11.649/49.1 |
| reference-a-zero / L1024 / 0 | 47 | 14.614/30.267 | 7.328/13.318 | n/a | n/a | 0/0 | 0.903/4.004 | 0.000/0.038 | 11.649/44.9 |
| reference-a-ladder / baseline / 0 | 46 | 20.854/46.464 | 12.756/30.317 | n/a | n/a | 0/0 | 0.999/2.998 | 0.000/0.000 | 11.469/45.6 |
| reference-a-ladder / L64 / 64 | 50 | 14.569/89.318 | 7.426/61.156 | n/a | n/a | 0/0 | 0.999/4.932 | 0.000/0.000 | 11.461/37.8 |
| reference-a-ladder / L256 / 256 | 50 | 15.966/134.323 | 8.795/114.079 | n/a | n/a | 0/0 | 0.995/2.999 | 0.000/0.343 | 11.076/62.0 |
| reference-a-ladder / L1024 / 1024 | 47 | 22.514/210.217 | 11.557/177.629 | n/a | n/a | 0/0 | 1.005/10.236 | 0.000/1.057 | 10.724/76.1 |
| native-a-zero / baseline / 0 | 47 | 22.207/72.732 | 13.033/57.860 | 8.640/49.500 | 2.890/21.060 | 22/47 | 0.801/2.104 | 0.000/0.147 | 11.998/49.0 |
| native-a-zero / L64 / 0 | 50 | 14.103/53.075 | 7.101/38.569 | 5.030/35.300 | 1.800/25.870 | 23/50 | 0.702/2.815 | 0.000/0.187 | 11.990/42.8 |
| native-a-zero / L256 / 0 | 50 | 13.610/135.231 | 7.495/126.125 | 5.590/98.600 | 2.100/29.860 | 30/50 | 0.582/1.964 | 0.000/0.216 | 11.990/38.6 |
| native-a-zero / L1024 / 0 | 48 | 15.760/55.459 | 7.911/38.332 | 5.990/35.100 | 2.750/21.020 | 22/48 | 0.847/2.996 | 0.000/0.201 | 11.990/39.7 |
| native-a-ladder / baseline / 0 | 47 | 23.364/160.072 | 13.339/145.121 | 10.200/139.000 | 2.700/133.130 | 23/47 | 0.923/3.315 | 0.000/0.464 | 11.826/71.8 |
| native-a-ladder / L64 / 64 | 50 | 17.211/136.836 | 9.160/125.567 | 6.730/34.100 | 1.990/13.420 | 26/50 | 0.593/3.707 | 0.000/0.783 | 11.826/59.1 |
| native-a-ladder / L256 / 256 | 50 | 17.849/163.433 | 8.990/61.711 | 6.410/59.200 | 2.180/7.400 | 21/50 | 0.952/2.565 | 0.000/0.679 | 11.819/53.2 |
| native-a-ladder / L1024 / 1024 | 47 | 22.823/125.223 | 11.098/109.453 | 7.660/106.000 | 3.490/100.680 | 25/47 | 1.059/4.984 | 0.134/1.426 | 11.819/50.5 |

Native counters confirm cold reads but not a higher L256 cold-read rate under readers in this diagnostic. The peer residual still contains unsplit storage/queue/messaging work. No index-threshold/warming setting or transaction-layout change is retained.
