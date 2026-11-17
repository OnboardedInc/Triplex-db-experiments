Busy-host diagnostic reading; no verdict. Every phase below has **zero logical readers**, including names L64/L256/L1024. Both arms ran source `c165501b0b77c9301764c6d3df323abf82ff0051`, full tracing, in one session. The 100k arm was killed, and the host changed; no population-only latency or optimization claim is made.

| Population | State | swap GiB p50/p99 | Mac non-VM CPU gauge p50/p99 | seed facts / s / facts per s |
| --- | --- | --- | --- | --- |
| 10000 | DONE; trace complete True | 19.100/21.336 | 245.800/701.100 | 384785 / 143.897 / 2674.030 |
| 100000 | RUNNING; trace complete False | 15.725/18.251 | 133.900/631.000 | 3848930 / 1561.517 / 2464.866 |

CPU is the retained process-lifetime `ps` gauge, not an interval CPU measurement or a measured host-to-guest request alignment. Analysis ran during the busy-host control as allowed. The complete 10k arm has 8,529/8,529 offers/completions, zero expired, 7,408 exact all-ACK model reads, and oracle NOT-RUN (zero-reader policy). The 100k complete offer/expiry denominator and final model/oracle check are unavailable. It retained 6,178 primary ACK markers and 6,169 native matches; last closed marker T+786.401 s of the planned 900 s.

Observed ACK subset by phase. Counts are closed, committed, non-resend background markers. The complete control matches all 18 original phase counts and ACK p50/p99 within 0.001 ms. Outside-window observations are retained, not discarded. SQL counts are native serial-point logical tier reads; an absent reads map remains unobserved.

| N | Phase | observed ACK / native / reads maps / SQL-cold | busy-host ACK p50/p99 ms | finish p50/p99 ms | SQL reads mean | native apply p50/p99 ms | datoms p50/p99 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10000 | warmup | 13/13/13/6 | 36.629/106.158 | 38.638/107.034 | 2.077 | 9.910/76.500 | 43/95 |
| 10000 | baseline | 49/49/49/23 | 32.489/1579.848 | 35.156/1581.859 | 1.408 | 8.520/296 | 47/123 |
| 10000 | L1 | 53/53/53/30 | 40.086/558.957 | 41.309/565.334 | 1.811 | 11.900/314 | 45/119 |
| 10000 | L4 | 1693/1693/1693/172 | 1161.284/29235.441 | 1162.243/29235.778 | 0.231 | 11/86.800 | 45/121 |
| 10000 | L16 | 1605/1605/1605/99 | 1040.983/25669.661 | 1041.952/25670.406 | 0.117 | 7.830/93.300 | 43/121 |
| 10000 | L64 | 50/50/50/25 | 29.471/869.844 | 31.452/887.752 | 1.400 | 7.660/251 | 43/113 |
| 10000 | L256 | 48/48/48/21 | 48.789/643.075 | 56.404/649.712 | 1.333 | 12.700/274 | 43/91 |
| 10000 | L1024 | 47/47/47/25 | 38.792/230.616 | 42.069/231.594 | 1.277 | 9.480/215 | 45/123 |
| 10000 | recovery | 76/76/76/15 | 42.348/694.905 | 43.888/696.812 | 0.368 | 6.750/557 | 43/111 |
| 10000 | p4mix | 59/59/59/10 | 38.118/216.074 | 43.312/218.477 | 0.305 | 5.730/110 | 45/121 |
| 10000 | p4h1 | 51/51/51/24 | 37.386/519.682 | 40.004/527.502 | 0.843 | 6.430/150 | 43/125 |
| 10000 | grow3 | 39/39/39/13 | 49.786/352.333 | 50.638/355.481 | 0.410 | 8.480/37.400 | 43/115 |
| 10000 | p4h3 | 45/45/45/33 | 41.047/457.816 | 47.406/462.012 | 3.089 | 14/151 | 43/89 |
| 10000 | grow10 | 72/72/72/21 | 40.547/1255.712 | 43.504/1258.474 | 0.431 | 6.540/369 | 43/119 |
| 10000 | p4h10 | 51/51/51/29 | 28.164/245.784 | 29.451/271.605 | 1.314 | 5.760/122 | 45/103 |
| 10000 | presweep | 374/374/374/56 | 25.490/349.289 | 26.847/350.782 | 0.225 | 3.020/22.600 | 43/125 |
| 10000 | sweep | 2430/2430/2430/216 | 18.514/231.553 | 19.223/232.116 | 0.139 | 2.760/15.200 | 43/123 |
| 10000 | tail | 631/631/631/43 | 22.646/387.245 | 23.438/388.270 | 0.090 | 3.230/24.500 | 43/120 |
| 10000 | outside-recorded-phase-windows | 22/22/22/3 | 48.216/1464.099 | 50.523/1465.943 | 0.409 | 5.120/89.600 | 41/117 |
| 100000 | warmup | 13/13/13/9 | 71.690/453.772 | 74.750/458.384 | 4.462 | 37.800/329 | 43/95 |
| 100000 | baseline | 49/49/49/36 | 46.498/375.016 | 51.938/378.532 | 3.265 | 18.500/98.400 | 47/123 |
| 100000 | L1 | 54/54/54/38 | 47.056/441.561 | 49.878/446.999 | 3.037 | 20.100/415 | 45/119 |
| 100000 | L4 | 1721/1721/1721/647 | 11965.768/86434.639 | 11968.725/86435.075 | 1.226 | 12.100/215 | 45/121 |
| 100000 | L16 | 1587/1578/1578/459 | 31012.198/82190.094 | 31012.567/82192.145 | 0.795 | 12.400/241 | 43/123 |
| 100000 | L64 | 55/55/55/23 | 424.721/44375.050 | 433.328/44375.591 | 1.218 | 22.200/704 | 43/113 |
| 100000 | L256 | 42/42/42/29 | 40.680/267.965 | 44.431/270.333 | 2.476 | 12/114 | 43/111 |
| 100000 | L1024 | 50/50/50/31 | 46.782/397.408 | 49.495/398.467 | 2.580 | 15.100/385 | 45/123 |
| 100000 | recovery | 73/73/73/32 | 48.141/1154.971 | 51.988/1158.493 | 1.233 | 8.020/74.200 | 43/121 |
| 100000 | p4mix | 57/57/57/30 | 36.544/733.079 | 40.652/735.133 | 1.825 | 9.180/121 | 45/113 |
| 100000 | p4h1 | 60/60/60/36 | 24.133/461.594 | 25.958/466.446 | 2.200 | 6.460/439 | 41/125 |
| 100000 | grow3 | 47/47/47/35 | 79.258/396.407 | 81.757/399.415 | 2.723 | 12.100/250 | 45/91 |
| 100000 | p4h3 | 42/42/42/32 | 23.647/207.165 | 26.269/208.334 | 3.310 | 10.400/30.500 | 41/75 |
| 100000 | grow10 | 91/91/91/65 | 58.602/838.302 | 60.204/845.482 | 2.714 | 12.600/327 | 45/119 |
| 100000 | p4h10 | 361/361/361/189 | 261.258/2221.347 | 262.119/2222.635 | 1.795 | 11.200/65.300 | 43/125 |
| 100000 | presweep | 1675/1675/1675/910 | 2317.692/34333.882 | 2319.822/34336.021 | 1.486 | 10.400/118 | 43/123 |
| 100000 | outside-recorded-phase-windows | 201/201/201/167 | 9380.668/13362.074 | 9381.391/13363.175 | 2.239 | 15.400/175 | 43/117 |

ACK-clipped exclusive layer scopes, p50/p99 ms. Quantiles do not add. Both populations use the same partition; transactor/storage internals stay inside peer wait. This subset tool does not attribute JVM pauses, so gateway GC/safepoints are unknown; Postgres attribution is also unknown. The original viewers keep their separate JFR evidence and errors. Timer lateness is in driver queue; separate measured event-loop attribution is unavailable.

| N | Phase | TS own | Node GC | driver queue | network | gateway own | gateway admission | peer calls | peer wait | TS share % | unexplained |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10000 | warmup | 6.418/11.748 | 0/0 | 0.159/3.156 | 1.085/5.113 | 3.005/15.242 | 0.032/0.100 | 1.060/3.690 | 21.106/91.853 | 17.898 | 0.045/0.095 |
| 10000 | baseline | 6.659/398.157 | 0/6.004 | 0.141/1318.485 | 1.325/29.843 | 2.357/35.745 | 0.031/6.619 | 0.657/15.181 | 20.534/840.075 | 22.124 | 0.050/8.375 |
| 10000 | L1 | 6.203/131.328 | 0/0 | 0.152/40.986 | 1.227/11.177 | 2.933/127.458 | 0.042/0.449 | 0.290/12.868 | 24.945/352.094 | 18.009 | 0.059/3.049 |
| 10000 | L4 | 5.385/154.716 | 0/25.828 | 388.107/29180.817 | 5.090/384.960 | 2.425/73.267 | 0.030/0.947 | 0.192/16.236 | 130.424/1265.497 | 42.321 | 0.030/0.492 |
| 10000 | L16 | 5.625/44.411 | 0/3.723 | 390.683/25652.275 | 5.033/137.607 | 2.454/56.137 | 0.030/0.992 | 0.161/13.345 | 66.132/1350.529 | 46.424 | 0.029/0.587 |
| 10000 | L64 | 5.462/252.962 | 0/0 | 0.123/35.339 | 1.286/81.584 | 2.409/40.666 | 0.030/0.098 | 0.395/7.132 | 17.472/431.082 | 22.445 | 0.058/178.541 |
| 10000 | L256 | 9.903/148.435 | 0/0 | 0.168/42.426 | 1.369/141.096 | 3.180/260.554 | 0.028/0.357 | 0.198/9.982 | 31.412/627.500 | 21.120 | 0.063/5.414 |
| 10000 | L1024 | 7.550/135.703 | 0/0 | 0.118/12.686 | 1.250/70.931 | 3.327/119.741 | 0.036/1.027 | 0.350/8.499 | 24.769/221.017 | 24.960 | 0.066/21.637 |
| 10000 | recovery | 10.188/162.768 | 0/0 | 0.169/386.921 | 1.381/297.245 | 3.647/55.616 | 0.035/0.120 | 0.184/298.314 | 21.673/597.722 | 27.801 | 0.066/53.761 |
| 10000 | p4mix | 9.579/121.229 | 0/4.910 | 0.136/24.546 | 1.452/8.842 | 4.084/122.444 | 0.031/0.229 | 0.169/4.541 | 20.103/152.532 | 26.809 | 0.072/2.763 |
| 10000 | p4h1 | 8.354/196.074 | 0/3.917 | 0.291/190.036 | 1.548/185.772 | 3.080/70.207 | 0.030/0.824 | 0.349/6.486 | 18.758/255.215 | 27.074 | 0.111/7.185 |
| 10000 | grow3 | 6.112/41.306 | 0/0 | 0.182/21.953 | 2.859/117.175 | 2.527/25.132 | 0.030/4.266 | 0.311/5.490 | 29.886/273.873 | 17.035 | 0.091/0.799 |
| 10000 | p4h3 | 9.310/86.433 | 0/0 | 0.143/82.643 | 1.330/184.574 | 2.778/79.203 | 0.030/0.448 | 0.169/1.605 | 25.985/297.100 | 26.466 | 0.098/4.665 |
| 10000 | grow10 | 7.511/86.471 | 0/0 | 0.668/1017.143 | 1.974/111.737 | 2.382/95.510 | 0.026/32.347 | 0.150/10.333 | 21.571/814.913 | 21.014 | 0.084/13.063 |
| 10000 | p4h10 | 6.368/32.188 | 0/0 | 0.122/36.527 | 1.013/9.336 | 2.320/33.723 | 0.027/0.163 | 0.217/1.392 | 12.851/216.629 | 24.943 | 0.094/2.212 |
| 10000 | presweep | 3.888/62.111 | 0/2.491 | 0.699/198.249 | 1.356/190.994 | 1.645/29.265 | 0.020/0.317 | 0.104/6.589 | 12.273/64.992 | 26.471 | 0.033/0.233 |
| 10000 | sweep | 3.164/15.198 | 0/0 | 0.101/122.757 | 0.901/51.680 | 1.492/14.015 | 0.016/0.103 | 0.088/3.712 | 9.307/98.437 | 23.391 | 0.023/0.109 |
| 10000 | tail | 3.673/56.422 | 0/2.203 | 0.119/314.087 | 1.101/105.274 | 1.623/21.924 | 0.018/0.157 | 0.109/3.534 | 10.882/110.374 | 24.304 | 0.028/0.295 |
| 10000 | outside-recorded-phase-windows | 9.257/86.977 | 0/11.504 | 1.212/1041.545 | 1.211/79.781 | 2.760/16.603 | 0.028/0.199 | 0.218/2.239 | 31.970/352.051 | 23.708 | 0.076/11.604 |
| 100000 | warmup | 9.368/36.084 | 0/10.652 | 0.195/12.978 | 1.596/13.980 | 5.903/19.234 | 0.019/0.051 | 0.426/4.188 | 59.241/394.293 | 14.483 | 0.047/0.362 |
| 100000 | baseline | 8.605/33.089 | 0/18.022 | 0.119/38.586 | 0.995/36.531 | 1.767/27.935 | 0.016/0.078 | 0.338/3.996 | 29.114/356.925 | 22.029 | 0.047/0.174 |
| 100000 | L1 | 8.812/95.068 | 0/0 | 0.125/233.244 | 1.189/35.333 | 1.765/15.845 | 0.021/0.099 | 0.257/4.261 | 32.327/423.843 | 21.282 | 0.059/1.659 |
| 100000 | L4 | 5.429/93.452 | 0/17.719 | 11066.192/86368.715 | 7.609/399.351 | 2.012/43.867 | 0.021/0.255 | 0.102/7.444 | 424.862/3138.496 | 94.164 | 0.060/0.836 |
| 100000 | L16 | 5.873/94.662 | 0/25.682 | 30254.587/82144.133 | 4.375/11374.125 | 2.146/32.510 | 0.022/0.256 | 0.108/5.944 | 307.706/4778.404 | 98.600 | 0.049/5.405 |
| 100000 | L64 | 6.179/127.540 | 0/0 | 21.241/44364.917 | 2.909/370.097 | 2.228/44.083 | 0.016/2.237 | 0.232/12.327 | 127.186/794.113 | 18.767 | 0.042/0.449 |
| 100000 | L256 | 9.174/80.268 | 0/0 | 0.103/32.891 | 1.109/94.984 | 2.363/149.430 | 0.020/0.071 | 0.165/1.817 | 22.193/149.702 | 24.491 | 0.048/0.516 |
| 100000 | L1024 | 10.578/202.553 | 0/0 | 0.106/122.985 | 1.227/176.195 | 2.025/82.401 | 0.019/0.081 | 0.135/0.980 | 23.407/390.820 | 27.426 | 0.060/23.823 |
| 100000 | recovery | 11.722/73.213 | 0/13.160 | 0.120/1105.535 | 1.428/100.349 | 2.476/58.260 | 0.022/0.079 | 0.141/3.770 | 19.219/230.662 | 40.086 | 0.080/17.331 |
| 100000 | p4mix | 7.523/335.956 | 0/43.303 | 0.113/62.059 | 1.074/52.158 | 2.089/92.475 | 0.020/0.276 | 0.136/4.274 | 19.568/450.385 | 31.354 | 0.089/6.198 |
| 100000 | p4h1 | 6.177/181.739 | 0/0 | 0.101/60.644 | 0.784/27.942 | 1.379/6.669 | 0.011/0.054 | 0.147/1.342 | 14.537/450.859 | 30.466 | 0.078/2.890 |
| 100000 | grow3 | 7.501/34.098 | 0/0 | 0.118/69.870 | 1.116/153.576 | 1.656/31.158 | 0.017/0.149 | 0.099/1.728 | 60.135/384.966 | 13.818 | 0.071/1.365 |
| 100000 | p4h3 | 5.869/71.584 | 0/0 | 0.100/36.185 | 0.908/47.415 | 1.822/15.931 | 0.015/0.229 | 0.068/1.572 | 15.477/198.996 | 28.181 | 0.056/11.169 |
| 100000 | grow10 | 6.595/131.156 | 0/13.148 | 0.581/529.068 | 1.292/358.282 | 1.792/313.642 | 0.015/0.615 | 0.099/83.258 | 38.950/479.252 | 15.604 | 0.061/0.795 |
| 100000 | p4h10 | 5.360/36.717 | 0/0 | 5.068/1994.735 | 3.783/64.052 | 1.734/31.982 | 0.017/0.083 | 0.099/5.602 | 154.361/485.608 | 10.078 | 0.037/1.363 |
| 100000 | presweep | 4.861/139.365 | 0/145.958 | 1556.435/30358.719 | 8.053/11285.637 | 1.736/42.490 | 0.017/0.236 | 0.086/6.729 | 365.354/1423.416 | 69.588 | 0.078/1.507 |
| 100000 | outside-recorded-phase-windows | 5.128/26.673 | 0/21.538 | 8885.494/12983.345 | 3.439/301.435 | 2.010/19.107 | 0.019/0.076 | 0.101/2.039 | 533.158/1110.020 | 94.334 | 0.131/1.000 |

Per-phase administrative PG and sampled memory. PG commit/native ratios count every client, reads, heartbeat, indexing and the samplers in a window bracketing the phase by up to 35 s per side in an unchanged database/WAL statistics epoch; missing or stale brackets yield no ratio; they are not exact transaction or WAL-sync costs. Epoch samples require the contemporaneous qualified Linux boot-clock anchor; ambiguous samples stay unknown. Memory is sampled cgroup charge, including reclaimable cache, not summed process RSS.

| N | Phase | PG aggregate commits/native | PG window ms | sampled current GiB PG/TX/GWw/GWr/driver | minimum sampled guest available MiB |
| --- | --- | --- | --- | --- | --- |
| 10000 | warmup | 15.652 | 60735.075 | 0.503/0.885/1.175/1.444/1.306 | 10309.289 |
| 10000 | baseline | 10.309 | 60748.741 | 0.504/0.908/1.180/1.449/1.300 | 10325.023 |
| 10000 | L1 | 8.686 | 91076.410 | 0.552/0.995/1.178/1.458/1.342 | 10170.395 |
| 10000 | L4 | 5.420 | 60753.168 | 0.573/1.553/1.198/1.494/1.655 | 9242.461 |
| 10000 | L16 | 5.509 | 91384.445 | 0.647/1.704/1.220/2.080/1.909 | 8254.062 |
| 10000 | L64 | 10.243 | 60927.835 | 0.664/1.705/1.265/2.094/1.983 | 8125.961 |
| 10000 | L256 | 13.048 | 91877.134 | 0.678/1.708/1.265/2.098/2.018 | 8092.152 |
| 10000 | L1024 | 11.038 | 61488.466 | 0.703/1.710/1.266/2.102/2.013 | 8092.504 |
| 10000 | recovery | 7.345 | 91247.372 | 0.705/1.710/1.267/2.103/2.026 | 8097.051 |
| 10000 | p4mix | 8.142 | 91008.331 | 0.705/1.710/1.267/2.104/2.040 | 8104.148 |
| 10000 | p4h1 | 9.026 | 60901.710 | 0.712/1.711/1.269/2.105/1.788 | 8358.219 |
| 10000 | grow3 | 8.268 | 61238.800 | 0.719/1.934/1.352/2.110/1.902 | 7947.199 |
| 10000 | p4h3 | 7.382 | 91586.395 | 0.748/1.937/1.363/2.112/1.949 | 7892.727 |
| 10000 | grow10 | 6.640 | 91430.062 | 0.793/2.274/1.369/2.122/2.288 | 7302.559 |
| 10000 | p4h10 | 8.517 | 90925.599 | 0.813/2.522/1.370/2.123/2.352 | 6975.000 |
| 10000 | presweep | 5.378 | 60622.391 | 0.816/2.522/1.371/2.125/2.355 | 6983.934 |
| 10000 | sweep | 5.367 | 90854.662 | 0.863/2.527/1.379/2.148/3.478 | 5963.988 |
| 10000 | tail | 5.721 | 151002.610 | 0.892/2.528/1.383/2.161/3.623 | 5846.480 |
| 100000 | warmup | unknown | unknown | 1.099/2.599/1.237/1.493/7.638 | 1482.004 |
| 100000 | baseline | unknown | unknown | 1.090/2.647/1.239/1.521/7.610 | 1432.770 |
| 100000 | L1 | unknown | unknown | 1.069/3.243/1.240/1.525/7.621 | 1393.324 |
| 100000 | L4 | 10.016 | 93279.915 | 1.134/3.421/1.265/1.506/7.208 | 1079.285 |
| 100000 | L16 | 7.562 | 93392.211 | 0.774/3.434/1.250/1.509/7.560 | 701.398 |
| 100000 | L64 | 7.441 | 60861.948 | 0.836/3.442/1.260/1.514/7.569 | 685.488 |
| 100000 | L256 | 13.315 | 91045.305 | 0.784/3.442/1.258/1.516/7.612 | 619.246 |
| 100000 | L1024 | 17.696 | 60522.328 | 0.760/3.443/1.258/1.517/7.615 | 616.730 |
| 100000 | recovery | 10.960 | 90960.583 | 0.765/3.443/1.259/1.517/7.366 | 871.973 |
| 100000 | p4mix | 11.094 | 60561.403 | 0.775/3.442/1.310/1.518/7.171 | 1041.133 |
| 100000 | p4h1 | 20.678 | 60696.046 | 0.811/3.371/1.311/1.518/7.193 | 1088.012 |
| 100000 | grow3 | 20.950 | 90898.678 | 0.921/3.371/1.691/1.520/7.235 | 644.477 |
| 100000 | p4h3 | 19.930 | 60602.763 | 0.763/3.371/1.691/1.520/7.247 | 645.598 |
| 100000 | grow10 | 15.461 | 121495.796 | 0.760/3.373/1.697/1.522/7.423 | 519.047 |
| 100000 | p4h10 | unknown | unknown | 0.724/3.373/1.736/1.518/7.484 | 373.824 |
| 100000 | presweep | 7.662 | 61537.811 | 0.687/3.370/1.814/1.506/7.780 | 35.230 |

Kernel peaks through the last bound live snapshot; peaks of different containers need not be simultaneous. The kernel OOM record matches the exact 100k driver ID and guest boot: `CONSTRAINT_NONE,global_oom`, Node victim anon RSS 7,952,624 KiB. Printk timestamps have no measured bridge to requests.

| N | Role | kernel peak / limit GiB | observed OOM kills |
| --- | --- | --- | --- |
| 10000 | pg | 0.904/2.000 | 0 |
| 10000 | tx | 2.529/4.000 | 0 |
| 10000 | gw-w | 1.384/3.000 | 0 |
| 10000 | gw-r | 2.167/3.000 | 0 |
| 10000 | driver | 3.632/8.000 | 0 |
| 100000 | pg | 2.000/2.000 | 0 |
| 100000 | tx | 3.443/4.000 | 0 |
| 100000 | gw-w | 1.820/3.000 | 0 |
| 100000 | gw-r | 1.525/1.750 | 0 |
| 100000 | driver | 7.841/8.000 | 1 |

Storage snapshots and quiet native cache callback totals (including setup and all streams). No exact per-transaction WAL count can be inferred from these PG aggregates; `open_datasync` can account sync work in WAL writes.

| N | pre-offer table / database / WAL bytes | final retained table / database / WAL bytes | native cache hits / requests / rate | completed adoptions |
| --- | --- | --- | --- | --- |
| 10000 | 104456192/112236211/134217728 | 237305856/245151411/268435456 | 2999685/3011487/99.608% | 12 |
| 100000 | 1182941184/1190778547/1241513984 | 1425465344/1433310899/1493172224 | 25272817/25318045/99.821% | 43 |

Adoption windows: processor entry/return, exact database hash, qualified boot clock. “After” selects offers within two seconds of the adoption end, not a causal claim about queued transactions. Full exact times/basis changes remain in each JSON.

| N | Phase | adoptions / max ms | subsequent observed ACK count | ACK p50/p99 ms | SQL-cold |
| --- | --- | --- | --- | --- | --- |
| 10000 | warmup | 0/unknown | 0 | unknown/unknown | 0 |
| 10000 | baseline | 0/unknown | 0 | unknown/unknown | 0 |
| 10000 | L1 | 1/27.693 | 0 | unknown/unknown | 0 |
| 10000 | L4 | 1/36.618 | 0 | unknown/unknown | 0 |
| 10000 | L16 | 1/19.036 | 0 | unknown/unknown | 0 |
| 10000 | L64 | 1/19.625 | 0 | unknown/unknown | 0 |
| 10000 | L256 | 1/49.389 | 0 | unknown/unknown | 0 |
| 10000 | L1024 | 1/24.507 | 0 | unknown/unknown | 0 |
| 10000 | recovery | 0/unknown | 0 | unknown/unknown | 0 |
| 10000 | p4mix | 0/unknown | 0 | unknown/unknown | 0 |
| 10000 | p4h1 | 0/unknown | 0 | unknown/unknown | 0 |
| 10000 | grow3 | 0/unknown | 0 | unknown/unknown | 0 |
| 10000 | p4h3 | 0/unknown | 0 | unknown/unknown | 0 |
| 10000 | grow10 | 0/unknown | 0 | unknown/unknown | 0 |
| 10000 | p4h10 | 0/unknown | 0 | unknown/unknown | 0 |
| 10000 | presweep | 0/unknown | 0 | unknown/unknown | 0 |
| 10000 | sweep | 0/unknown | 0 | unknown/unknown | 0 |
| 10000 | tail | 0/unknown | 0 | unknown/unknown | 0 |
| 10000 | outside-recorded-phase-windows | 0/unknown | 0 | unknown/unknown | 0 |
| 100000 | warmup | 0/unknown | 0 | unknown/unknown | 0 |
| 100000 | baseline | 0/unknown | 0 | unknown/unknown | 0 |
| 100000 | L1 | 1/8.949 | 0 | unknown/unknown | 0 |
| 100000 | L4 | 1/22.268 | 0 | unknown/unknown | 0 |
| 100000 | L16 | 0/unknown | 0 | unknown/unknown | 0 |
| 100000 | L64 | 2/19.523 | 0 | unknown/unknown | 0 |
| 100000 | L256 | 1/3.278 | 0 | unknown/unknown | 0 |
| 100000 | L1024 | 1/45.564 | 0 | unknown/unknown | 0 |
| 100000 | recovery | 0/unknown | 0 | unknown/unknown | 0 |
| 100000 | p4mix | 0/unknown | 0 | unknown/unknown | 0 |
| 100000 | p4h1 | 0/unknown | 0 | unknown/unknown | 0 |
| 100000 | grow3 | 0/unknown | 0 | unknown/unknown | 0 |
| 100000 | p4h3 | 0/unknown | 0 | unknown/unknown | 0 |
| 100000 | grow10 | 0/unknown | 0 | unknown/unknown | 0 |
| 100000 | p4h10 | 0/unknown | 0 | unknown/unknown | 0 |
| 100000 | presweep | 0/unknown | 0 | unknown/unknown | 0 |
| 100000 | outside-recorded-phase-windows | 0/unknown | 0 | unknown/unknown | 0 |

Per-phase native callbacks, intervals ending in the phase; process-wide and including auxiliary streams. Missing callbacks or native eviction counts remain unknown. Transaction bytes are native histogram values, distinct from physical PG bytes.

| N | Phase | observed cache intervals | cache hits/requests/% | maximum observed cache entries | mean transaction bytes/datoms | mean log-block bytes |
| --- | --- | --- | --- | --- | --- | --- |
| 10000 | warmup | 0/0 | unknown/unknown/unknown | unknown | unknown/unknown | unknown |
| 10000 | baseline | 1/1 | 7262/7461/97.333 | 750 | 15092.268/50.930 | 15092.268 |
| 10000 | L1 | 1/1 | 12938/13512/95.752 | 1111 | 14483.431/49.585 | 14825.559 |
| 10000 | L4 | 0/0 | unknown/unknown/unknown | unknown | unknown/unknown | unknown |
| 10000 | L16 | 1/1 | 325718/327159/99.560 | 2346 | 16092.710/53.089 | 17724.032 |
| 10000 | L64 | 1/1 | 252975/254163/99.533 | 3058 | 15431.318/51.621 | 16828.303 |
| 10000 | L256 | 1/1 | 18554/18940/97.962 | 2473 | 12990.153/46.301 | 12990.153 |
| 10000 | L1024 | 0/0 | unknown/unknown/unknown | unknown | unknown/unknown | unknown |
| 10000 | recovery | 1/1 | 12206/12542/97.321 | 2398 | 15137.774/50.984 | 15137.774 |
| 10000 | p4mix | 1/1 | 9178/9341/98.255 | 2367 | 14451.176/49.496 | 14451.176 |
| 10000 | p4h1 | 1/1 | 9487/9724/97.563 | 2226 | 13971.889/48.437 | 13971.889 |
| 10000 | grow3 | 0/0 | unknown/unknown/unknown | unknown | unknown/unknown | unknown |
| 10000 | p4h3 | 1/1 | 78800/80042/98.448 | 1402 | 18130.644/67.659 | 18159.286 |
| 10000 | grow10 | 1/1 | 53481/54570/98.004 | 1407 | 17952.708/67.004 | 17952.708 |
| 10000 | p4h10 | 1/1 | 165069/166476/99.155 | 1684 | 18871.167/70.816 | 18888.107 |
| 10000 | presweep | 1/1 | 9027/9257/97.515 | 1685 | 14344.992/49.244 | 14344.992 |
| 10000 | sweep | 1/1 | 179414/180861/99.200 | 1914 | 15820.921/52.467 | 16149.775 |
| 10000 | tail | 2/2 | 111763/112699/99.169 | 1899 | 15112.530/50.898 | 15413.108 |
| 100000 | warmup | 0/0 | unknown/unknown/unknown | unknown | unknown/unknown | unknown |
| 100000 | baseline | 1/1 | 4787/5154/92.879 | 5520 | 15272.746/51.313 | 15272.746 |
| 100000 | L1 | 1/1 | 8873/10346/85.763 | 3884 | 14423.023/49.434 | 14423.023 |
| 100000 | L4 | 0/0 | unknown/unknown/unknown | unknown | unknown/unknown | unknown |
| 100000 | L16 | 1/1 | 191462/195198/98.086 | 1567 | 15986.053/52.859 | 16656.708 |
| 100000 | L64 | 1/1 | 239706/242819/98.718 | 2035 | 15554.868/51.865 | 17000.153 |
| 100000 | L256 | 1/1 | 106915/108552/98.492 | 1788 | 15551.393/51.886 | 15810.393 |
| 100000 | L1024 | 1/1 | 25446/26317/96.690 | 1757 | 15024.272/50.712 | 15024.272 |
| 100000 | recovery | 1/1 | 25702/26084/98.536 | 1725 | 14558.000/49.725 | 14558.000 |
| 100000 | p4mix | 0/0 | unknown/unknown/unknown | unknown | unknown/unknown | unknown |
| 100000 | p4h1 | 1/1 | 24106/24935/96.675 | 1742 | 13717.098/47.872 | 13717.098 |
| 100000 | grow3 | 1/1 | 41373/43734/94.601 | 1458 | 16841.051/61.687 | 16897.946 |
| 100000 | p4h3 | 1/1 | 76108/80386/94.678 | 1530 | 17738.874/66.091 | 17777.521 |
| 100000 | grow10 | 1/1 | 153792/160250/95.970 | 1459 | 18563.797/69.392 | 18563.797 |
| 100000 | p4h10 | 1/1 | 202264/209054/96.752 | 1496 | 18831.465/70.469 | 18823.966 |
| 100000 | presweep | 1/1 | 280517/283098/99.088 | 1859 | 15885.750/52.578 | 16045.345 |

Last retained gateway cache snapshots. Native peer-library cache entry/eviction counters are not exposed here; transactor entries/evictions are also unknown.

| N | Gateway/cache | entries | hits | misses | evictions | bytes/budget |
| --- | --- | --- | --- | --- | --- | --- |
| 10000 | w/idMemo | 0 | 0 | 0 | 0 | 0/536870912 |
| 10000 | w/entity | 0 | 0 | 0 | 0 | 0/268435456 |
| 10000 | w/revision | 0 | 0 | 0 | 0 | 0/33554432 |
| 10000 | w/recent | 0 | 0 | 0 | unknown | 0/16777216 |
| 10000 | r/idMemo | 144825 | 2061739 | 144825 | 0 | 27506270/536870912 |
| 10000 | r/entity | 6717 | 1961929 | 244635 | 237918 | 251562788/268435456 |
| 10000 | r/revision | 707 | 785981 | 1420583 | 13623 | 33463296/33554432 |
| 10000 | r/recent | 0 | 0 | 0 | unknown | 0/16777216 |
| 100000 | w/idMemo | 0 | 0 | 0 | 0 | 0/536870912 |
| 100000 | w/entity | 0 | 0 | 0 | 0 | 0/536870912 |
| 100000 | w/revision | 0 | 0 | 0 | 0 | 0/67108864 |
| 100000 | w/recent | 0 | 0 | 0 | unknown | 0/33554432 |
| 100000 | r/idMemo | 1272614 | 1287294 | 1272614 | 0 | 239686472/536870912 |
| 100000 | r/entity | 11269 | 824948 | 1734960 | 1723691 | 251641160/268435456 |
| 100000 | r/revision | 6877 | 666220 | 1893688 | 5903 | 33538560/33554432 |
| 100000 | r/recent | 0 | 0 | 0 | unknown | 0/16777216 |

Last retained client cache samples, each instance separate. A missing hit/miss counter is unknown, not zero. UUID suffix disambiguates instances; all complete per-phase snapshots remain in `neighbour-d-qualified.json`, and censored original resource samples remain in the large arm’s raw trace.

| N | process/thread/client suffix/cache | entries | hits/misses | evictions | bytes/budget |
| --- | --- | --- | --- | --- | --- |
| 10000 | node-14/0/ff40d765/rows | 7799 | unknown/unknown | 477922 | 8388080/8388608 |
| 10000 | node-14/0/ff40d765/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 10000 | node-14/0/ff40d765/predecessors | 40032 | unknown/unknown | 0 | 16204472/268435456 |
| 10000 | node-14/0/ff40d765/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/0/a5272cf6/rows | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/0/a5272cf6/reach | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/0/a5272cf6/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 10000 | node-14/0/a5272cf6/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/0/3c02f87f/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 10000 | node-14/0/3c02f87f/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 10000 | node-14/0/3c02f87f/predecessors | 0 | unknown/unknown | 0 | 0/268435456 |
| 10000 | node-14/0/3c02f87f/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/0/9399966b/rows | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/0/9399966b/reach | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/0/9399966b/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 10000 | node-14/0/9399966b/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/0/0e44da76/rows | 7928 | unknown/unknown | 12072 | 8387824/8388608 |
| 10000 | node-14/0/0e44da76/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 10000 | node-14/0/0e44da76/predecessors | 2000 | unknown/unknown | 0 | 814000/268435456 |
| 10000 | node-14/0/0e44da76/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/0/8c8470fb/rows | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/0/8c8470fb/reach | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/0/8c8470fb/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 10000 | node-14/0/8c8470fb/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/0/763170c2/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 10000 | node-14/0/763170c2/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 10000 | node-14/0/763170c2/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 10000 | node-14/0/763170c2/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/0/47421ba0/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 10000 | node-14/0/47421ba0/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 10000 | node-14/0/47421ba0/predecessors | 0 | unknown/unknown | 0 | 0/268435456 |
| 10000 | node-14/0/47421ba0/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/0/ccc70c6a/rows | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/0/ccc70c6a/reach | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/0/ccc70c6a/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 10000 | node-14/0/ccc70c6a/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/2/61249834/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 10000 | node-14/2/61249834/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 10000 | node-14/2/61249834/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 10000 | node-14/2/61249834/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/3/ee79cf87/rows | 7794 | unknown/unknown | 7062412 | 8387642/8388608 |
| 10000 | node-14/3/ee79cf87/reach | 725 | unknown/unknown | 696259 | 16732588/16777216 |
| 10000 | node-14/3/ee79cf87/predecessors | 80883 | unknown/unknown | 39726 | 33554366/33554432 |
| 10000 | node-14/3/ee79cf87/reachKeys | 9757 | unknown/unknown | unknown | 3995292/4194304 |
| 10000 | node-14/5/b8cd57fb/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 10000 | node-14/5/b8cd57fb/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 10000 | node-14/5/b8cd57fb/predecessors | 0 | unknown/unknown | 0 | 0/268435456 |
| 10000 | node-14/5/b8cd57fb/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/5/e3645efc/rows | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/5/e3645efc/reach | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/5/e3645efc/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 10000 | node-14/5/e3645efc/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/5/548f04f6/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 10000 | node-14/5/548f04f6/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 10000 | node-14/5/548f04f6/predecessors | 0 | unknown/unknown | 0 | 0/268435456 |
| 10000 | node-14/5/548f04f6/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/5/21a8e1fe/rows | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/5/21a8e1fe/reach | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/5/21a8e1fe/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 10000 | node-14/5/21a8e1fe/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/5/91274de3/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 10000 | node-14/5/91274de3/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 10000 | node-14/5/91274de3/predecessors | 0 | unknown/unknown | 0 | 0/268435456 |
| 10000 | node-14/5/91274de3/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/5/f9f3afa0/rows | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/5/f9f3afa0/reach | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/5/f9f3afa0/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 10000 | node-14/5/f9f3afa0/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/5/11885ad2/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 10000 | node-14/5/11885ad2/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 10000 | node-14/5/11885ad2/predecessors | 0 | unknown/unknown | 0 | 0/268435456 |
| 10000 | node-14/5/11885ad2/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/5/72018abe/rows | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/5/72018abe/reach | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/5/72018abe/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 10000 | node-14/5/72018abe/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/5/9af8360f/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 10000 | node-14/5/9af8360f/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 10000 | node-14/5/9af8360f/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 10000 | node-14/5/9af8360f/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/5/4b8f9830/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 10000 | node-14/5/4b8f9830/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 10000 | node-14/5/4b8f9830/predecessors | 0 | unknown/unknown | 0 | 0/268435456 |
| 10000 | node-14/5/4b8f9830/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/5/4dcca7de/rows | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/5/4dcca7de/reach | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/5/4dcca7de/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 10000 | node-14/5/4dcca7de/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/5/d4b26d59/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 10000 | node-14/5/d4b26d59/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 10000 | node-14/5/d4b26d59/predecessors | 0 | unknown/unknown | 0 | 0/268435456 |
| 10000 | node-14/5/d4b26d59/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/5/a2a4d01e/rows | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/5/a2a4d01e/reach | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/5/a2a4d01e/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 10000 | node-14/5/a2a4d01e/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/6/c6c1f605/rows | 7852 | unknown/unknown | 1943 | 8388528/8388608 |
| 10000 | node-14/6/c6c1f605/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 10000 | node-14/6/c6c1f605/predecessors | 0 | unknown/unknown | 0 | 0/268435456 |
| 10000 | node-14/6/c6c1f605/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 10000 | node-14/6/f68ce2b3/rows | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/6/f68ce2b3/reach | 0 | unknown/unknown | 0 | 0/1 |
| 10000 | node-14/6/f68ce2b3/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 10000 | node-14/6/f68ce2b3/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/0/9bb0e67e/rows | 7793 | unknown/unknown | 3925200 | 8387674/8388608 |
| 100000 | node-14/0/9bb0e67e/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 100000 | node-14/0/9bb0e67e/predecessors | 400004 | unknown/unknown | 0 | 162082143/268435456 |
| 100000 | node-14/0/9bb0e67e/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/0/2350acc7/rows | 0 | unknown/unknown | 0 | 0/1 |
| 100000 | node-14/0/2350acc7/reach | 0 | unknown/unknown | 0 | 0/1 |
| 100000 | node-14/0/2350acc7/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 100000 | node-14/0/2350acc7/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/0/30e31910/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 100000 | node-14/0/30e31910/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 100000 | node-14/0/30e31910/predecessors | 0 | unknown/unknown | 0 | 0/268435456 |
| 100000 | node-14/0/30e31910/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/0/1822ab5e/rows | 0 | unknown/unknown | 0 | 0/1 |
| 100000 | node-14/0/1822ab5e/reach | 0 | unknown/unknown | 0 | 0/1 |
| 100000 | node-14/0/1822ab5e/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 100000 | node-14/0/1822ab5e/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/0/458bf30c/rows | 7913 | unknown/unknown | 12087 | 8387772/8388608 |
| 100000 | node-14/0/458bf30c/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 100000 | node-14/0/458bf30c/predecessors | 2000 | unknown/unknown | 0 | 816000/268435456 |
| 100000 | node-14/0/458bf30c/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/0/c7760d2a/rows | 0 | unknown/unknown | 0 | 0/1 |
| 100000 | node-14/0/c7760d2a/reach | 0 | unknown/unknown | 0 | 0/1 |
| 100000 | node-14/0/c7760d2a/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 100000 | node-14/0/c7760d2a/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/0/d0f38a65/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 100000 | node-14/0/d0f38a65/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 100000 | node-14/0/d0f38a65/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 100000 | node-14/0/d0f38a65/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/2/c47b9a30/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 100000 | node-14/2/c47b9a30/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 100000 | node-14/2/c47b9a30/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 100000 | node-14/2/c47b9a30/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/3/69e1a5e9/rows | 7787 | unknown/unknown | 1608155 | 8388080/8388608 |
| 100000 | node-14/3/69e1a5e9/reach | 779 | unknown/unknown | 241289 | 16754012/16777216 |
| 100000 | node-14/3/69e1a5e9/predecessors | 81782 | unknown/unknown | 159112 | 33554394/33554432 |
| 100000 | node-14/3/69e1a5e9/reachKeys | 10382 | unknown/unknown | unknown | 4122852/4194304 |
| 100000 | node-14/5/247ae1b8/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 100000 | node-14/5/247ae1b8/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 100000 | node-14/5/247ae1b8/predecessors | 0 | unknown/unknown | 0 | 0/268435456 |
| 100000 | node-14/5/247ae1b8/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/5/71c1c02d/rows | 0 | unknown/unknown | 0 | 0/1 |
| 100000 | node-14/5/71c1c02d/reach | 0 | unknown/unknown | 0 | 0/1 |
| 100000 | node-14/5/71c1c02d/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 100000 | node-14/5/71c1c02d/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/5/70f083f7/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 100000 | node-14/5/70f083f7/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 100000 | node-14/5/70f083f7/predecessors | 0 | unknown/unknown | 0 | 0/268435456 |
| 100000 | node-14/5/70f083f7/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/5/dd86a037/rows | 0 | unknown/unknown | 0 | 0/1 |
| 100000 | node-14/5/dd86a037/reach | 0 | unknown/unknown | 0 | 0/1 |
| 100000 | node-14/5/dd86a037/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 100000 | node-14/5/dd86a037/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/5/24524cb5/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 100000 | node-14/5/24524cb5/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 100000 | node-14/5/24524cb5/predecessors | 0 | unknown/unknown | 0 | 0/268435456 |
| 100000 | node-14/5/24524cb5/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/5/ebfff3b8/rows | 0 | unknown/unknown | 0 | 0/1 |
| 100000 | node-14/5/ebfff3b8/reach | 0 | unknown/unknown | 0 | 0/1 |
| 100000 | node-14/5/ebfff3b8/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 100000 | node-14/5/ebfff3b8/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/5/d1dc3f0b/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 100000 | node-14/5/d1dc3f0b/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 100000 | node-14/5/d1dc3f0b/predecessors | 0 | unknown/unknown | 0 | 0/268435456 |
| 100000 | node-14/5/d1dc3f0b/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/5/6339c957/rows | 0 | unknown/unknown | 0 | 0/1 |
| 100000 | node-14/5/6339c957/reach | 0 | unknown/unknown | 0 | 0/1 |
| 100000 | node-14/5/6339c957/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 100000 | node-14/5/6339c957/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/5/a121c664/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 100000 | node-14/5/a121c664/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 100000 | node-14/5/a121c664/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 100000 | node-14/5/a121c664/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/5/e9d1b2d8/rows | 0 | unknown/unknown | 0 | 0/8388608 |
| 100000 | node-14/5/e9d1b2d8/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 100000 | node-14/5/e9d1b2d8/predecessors | 0 | unknown/unknown | 0 | 0/268435456 |
| 100000 | node-14/5/e9d1b2d8/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/6/f2eca5f1/rows | 7837 | unknown/unknown | 487 | 8387726/8388608 |
| 100000 | node-14/6/f2eca5f1/reach | 0 | unknown/unknown | 0 | 0/16777216 |
| 100000 | node-14/6/f2eca5f1/predecessors | 0 | unknown/unknown | 0 | 0/268435456 |
| 100000 | node-14/6/f2eca5f1/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |
| 100000 | node-14/6/799351da/rows | 0 | unknown/unknown | 0 | 0/1 |
| 100000 | node-14/6/799351da/reach | 0 | unknown/unknown | 0 | 0/1 |
| 100000 | node-14/6/799351da/predecessors | 0 | unknown/unknown | 0 | 0/33554432 |
| 100000 | node-14/6/799351da/reachKeys | 0 | unknown/unknown | unknown | 0/4194304 |

Replica final diagnostics: complete 10k copy 77,692,736 bytes, history 201,204,246 bytes; all ACK positions applied. The 100k final replica geometry and all-ACK lag summary were lost; per-worker world-cache hits/evictions were not emitted. Its warmup writer heap was 2,885,520,408 bytes; the complete driver cgroup later peaked at 8,419,491,840 bytes. No 100k reader arm or independent replay oracle ran.

The 10k post-run census is present in `neighbour-d-qualified.json`; the 100k post-run attribute/physical byte census did not run. Native datom sizes above remain measured. Native callback byte histograms, original adoption intervals and raw PG statements are retained; they are not replaced with estimates.

Inputs: `partial-d-ack.json`, `neighbour-d-ack.json`, `neighbour-d-qualified.json`, `reading-extra.json`, `OOM-D.json` under `$EVIDENCE_ROOT/DX-T1/p14/`, sealed in EVIDENCE-14.sha256. This renderer and both analysis-program/input manifests are retained there.
