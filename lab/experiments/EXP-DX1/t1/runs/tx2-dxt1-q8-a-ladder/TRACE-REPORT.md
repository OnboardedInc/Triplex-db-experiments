# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue (scheduler/subject/admission)` (1197.156 ms, trace `e8b48d1b06f03040000000000000e088`); `node-14/thread-0/driver.queue (scheduler/subject/admission)` (1034.880 ms, trace `e8b48d1b06f03040000000000000de74`); `node-14/thread-0/driver.queue (scheduler/subject/admission)` (1175.263 ms, trace `e8b48d1b06f03040000000000003025f`); `node-14/thread-0/driver.queue (scheduler/subject/admission)` (1199.487 ms, trace `e8b48d1b06f0304000000000000302e1`); `node-14/thread-0/driver.queue (scheduler/subject/admission)` (919.181 ms, trace `e8b48d1b06f030400000000000030185`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-q8-a-ladder`; source `c4c5b5984fe30695c99ee55a5c60fdfdb2087346`; subjects 10000; tracing full.

Commit coverage: 8537/8540 (99.965%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 8540/8540. Raw trace bytes: 104737049.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node wall time excluding observed waits/GC, not on-CPU time. Driver queue is separate; timer drift is a bounded estimate shown only as an overlay. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## P2 / outside-phases / commit (25 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 40.997 | 10.253 | 0.000 | 0.000 | 1.064 | 1.075 | 1.536 | 0.041 | 0.000 | 0.011 | 18.719 | n/a | n/a | 0.022 | 36.049 | 0.671 | 0.022 |
| p99 | 906.647 | 307.924 | 0.000 | 4.729 | 879.058 | 107.919 | 35.613 | 63.366 | 54.207 | 0.032 | 229.638 | n/a | n/a | 0.416 | 882.297 | 1.000 | 0.416 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000000d62e | 906.647 | 3.240 | 0.000 | 0.000 | 879.058 | 0.928 | 1.578 | 2.075 | 0.000 | 0.014 | 19.745 | n/a | n/a | 0.010 | 882.297 | 0.973 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f030400000000000002221 | 778.230 | 18.310 | 0.000 | 4.729 | 706.313 | 1.180 | 10.002 | 0.175 | 0.000 | 0.031 | 37.075 | n/a | n/a | 0.416 | 729.351 | 0.937 | 0.416 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000000d2ea | 487.294 | 3.144 | 0.000 | 0.000 | 466.789 | 2.824 | 3.817 | 0.063 | 0.000 | 0.014 | 10.635 | n/a | n/a | 0.009 | 469.933 | 0.964 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d0a9 | 476.108 | 307.924 | 0.000 | 3.134 | 15.866 | 25.736 | 23.407 | 2.904 | 28.459 | 0.021 | 68.644 | n/a | n/a | 0.015 | 326.923 | 0.687 | 0.015 | node-14/thread-0/client.persist-and-resolve | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d0cd | 462.785 | 9.223 | 0.000 | 0.000 | 16.972 | 107.919 | 35.613 | 63.366 | 0.000 | 0.024 | 229.638 | n/a | n/a | 0.029 | 26.196 | 0.057 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d0a3 | 444.160 | 287.388 | 0.000 | 3.134 | 18.374 | 3.159 | 26.339 | 6.479 | 28.459 | 0.016 | 70.791 | n/a | n/a | 0.022 | 308.895 | 0.695 | 0.022 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000000d09d | 437.517 | 283.751 | 0.000 | 3.134 | 26.676 | 10.794 | 14.196 | 0.041 | 0.000 | 0.024 | 98.821 | n/a | n/a | 0.081 | 313.561 | 0.717 | 0.081 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000000d097 | 437.059 | 260.224 | 0.000 | 3.134 | 29.820 | 10.087 | 9.002 | 7.443 | 0.000 | 0.032 | 117.293 | n/a | n/a | 0.024 | 293.177 | 0.671 | 0.024 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000000d172 | 393.061 | 6.443 | 0.000 | 0.000 | 248.751 | 12.340 | 1.133 | 0.043 | 0.000 | 0.009 | 124.325 | n/a | n/a | 0.018 | 255.193 | 0.649 | 0.018 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000000d091 | 291.233 | 10.253 | 0.000 | 0.000 | 37.653 | 52.481 | 13.148 | 25.607 | 0.000 | 0.011 | 152.052 | n/a | n/a | 0.028 | 47.906 | 0.164 | 0.028 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000000d07a | 275.363 | 21.938 | 0.000 | 0.000 | 6.862 | 2.262 | 26.677 | 0.062 | 54.207 | 0.009 | 163.309 | n/a | n/a | 0.036 | 28.800 | 0.105 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000196b5 | 45.973 | 45.938 | 0.000 | 0.000 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 45.956 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b007 | 40.997 | 6.691 | 0.000 | 0.000 | 0.895 | 1.000 | 1.536 | 0.033 | 0.000 | 0.011 | 30.791 | n/a | n/a | 0.040 | 7.586 | 0.185 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001afe1 | 40.527 | 40.485 | 0.000 | 0.000 | 0.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 40.507 | 1.000 | 0.020 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001afb0 | 36.917 | 36.883 | 0.000 | 0.000 | 0.014 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 36.897 | 0.999 | 0.020 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001affa | 36.065 | 36.024 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 36.049 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001a22a | 34.069 | 3.021 | 0.000 | 0.000 | 0.561 | 0.997 | 1.492 | 0.040 | 0.000 | 0.010 | 27.927 | n/a | n/a | 0.021 | 3.582 | 0.105 | 0.021 | gw-w/thread-81/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a223 | 31.453 | 31.401 | 0.000 | 0.000 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 31.418 | 0.999 | 0.035 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001afbf | 30.093 | 5.350 | 0.000 | 0.000 | 0.697 | 1.147 | 4.085 | 0.052 | 0.000 | 0.020 | 18.719 | n/a | n/a | 0.022 | 6.047 | 0.201 | 0.022 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000196c4 | 27.502 | 27.470 | 0.000 | 0.000 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 27.487 | 0.999 | 0.014 | node-14/thread-0/driver.execute | none observed |

## P2/P4 / read-your-own-write / read (1101 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 90.570 | 82.859 | 0.000 | 8.087 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 90.554 | 1.000 | 0.013 |
| p99 | 504.506 | 440.465 | 0.000 | 73.416 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.048 | 504.492 | 1.000 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000019f43 | 773.087 | 727.595 | 0.000 | 45.465 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 773.060 | 1.000 | 0.027 | node-14/thread-0/driver.ryow-capture | none observed |
| e8b48d1b06f03040000000000002faeb | 682.283 | 577.580 | 0.000 | 104.687 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 682.267 | 1.000 | 0.016 | node-14/thread-0/driver.ryow-capture | none observed |
| e8b48d1b06f03040000000000002fad5 | 612.384 | 520.248 | 0.000 | 92.101 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 612.349 | 1.000 | 0.035 | node-14/thread-0/driver.ryow-capture | none observed |
| e8b48d1b06f03040000000000002fb01 | 611.121 | 519.845 | 0.000 | 91.255 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 611.100 | 1.000 | 0.021 | node-14/thread-0/driver.ryow-capture | none observed |
| e8b48d1b06f030400000000000027474 | 551.099 | 488.863 | 0.000 | 62.223 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 551.086 | 1.000 | 0.013 | node-14/thread-0/driver.ryow-capture | none observed |
| e8b48d1b06f03040000000000002fa4f | 550.110 | 475.690 | 0.000 | 74.399 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 550.089 | 1.000 | 0.021 | node-14/thread-0/driver.ryow-capture | none observed |
| e8b48d1b06f0304000000000000304cb | 520.954 | 435.234 | 0.000 | 85.700 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 520.933 | 1.000 | 0.021 | node-14/thread-0/driver.ryow-capture | none observed |
| e8b48d1b06f030400000000000029892 | 519.932 | 451.744 | 0.000 | 68.171 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 519.915 | 1.000 | 0.017 | node-14/thread-0/driver.ryow-capture | none observed |
| e8b48d1b06f0304000000000000304a9 | 516.843 | 435.726 | 0.000 | 81.105 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 516.831 | 1.000 | 0.012 | node-14/thread-0/driver.ryow-capture | none observed |
| e8b48d1b06f0304000000000000274f8 | 514.802 | 464.732 | 0.000 | 50.058 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 514.790 | 1.000 | 0.013 | node-14/thread-0/driver.ryow-capture | none observed |
| e8b48d1b06f03040000000000002989c | 511.554 | 443.337 | 0.000 | 68.171 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.046 | 511.508 | 1.000 | 0.046 | node-14/thread-0/driver.ryow-capture | none observed |
| e8b48d1b06f03040000000000002fb0b | 504.506 | 428.190 | 0.000 | 76.302 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 504.492 | 1.000 | 0.014 | node-14/thread-0/driver.ryow-capture | none observed |
| e8b48d1b06f03040000000000002fa21 | 495.732 | 437.221 | 0.000 | 58.498 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 495.719 | 1.000 | 0.013 | node-14/thread-0/driver.ryow-capture | none observed |
| e8b48d1b06f03040000000000000ddb1 | 494.243 | 440.465 | 0.000 | 53.757 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 494.222 | 1.000 | 0.021 | node-14/thread-0/driver.ryow-capture | driver.worker-message 0.602ms |
| e8b48d1b06f030400000000000013f3f | 488.097 | 446.869 | 0.000 | 41.206 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 488.075 | 1.000 | 0.022 | node-14/thread-0/driver.ryow-capture | driver.worker-message 2.058ms; driver.worker-message 1.244ms; driver.worker-message 0.535ms |
| e8b48d1b06f030400000000000027462 | 485.587 | 436.450 | 0.000 | 49.116 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 485.566 | 1.000 | 0.021 | node-14/thread-0/driver.ryow-capture | none observed |
| e8b48d1b06f030400000000000029870 | 483.693 | 412.458 | 0.000 | 71.187 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.048 | 483.645 | 1.000 | 0.048 | node-14/thread-0/driver.ryow-capture | none observed |
| e8b48d1b06f030400000000000013ee9 | 473.931 | 441.449 | 0.000 | 32.445 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 473.894 | 1.000 | 0.037 | node-14/thread-0/driver.ryow-capture | driver.worker-message 2.058ms; driver.worker-message 1.244ms; driver.worker-message 0.535ms |
| e8b48d1b06f03040000000000001675b | 467.002 | 391.945 | 0.000 | 75.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 466.985 | 1.000 | 0.017 | node-14/thread-0/driver.ryow-capture | none observed |
| e8b48d1b06f0304000000000000308cd | 459.925 | 372.310 | 0.000 | 87.601 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 459.911 | 1.000 | 0.013 | node-14/thread-0/driver.ryow-capture | none observed |

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 60.718 | 34.071 | 0.000 | 0.000 | 0.064 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 35.024 | 0.999 | 0.027 |
| p99 | 299.200 | 298.886 | 0.000 | 2.079 | 1.751 | 6.090 | 13.454 | 0.156 | 0.000 | 0.048 | 57.342 | n/a | n/a | 0.066 | 299.140 | 1.000 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000002282 | 299.200 | 298.886 | 0.000 | 0.000 | 0.254 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.060 | 299.140 | 1.000 | 0.060 | node-14/thread-0/driver.execute | driver.worker-message 31.558ms; driver.worker-message 21.048ms; driver.worker-message 1.179ms |
| e8b48d1b06f0304000000000000023de | 222.356 | 222.296 | 0.000 | 0.000 | 0.028 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 222.324 | 1.000 | 0.032 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000022f1 | 175.511 | 175.417 | 0.000 | 0.000 | 0.049 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.045 | 175.466 | 1.000 | 0.045 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000022a7 | 157.876 | 157.789 | 0.000 | 0.000 | 0.054 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 157.843 | 1.000 | 0.034 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002316 | 132.965 | 132.905 | 0.000 | 0.000 | 0.034 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 132.939 | 1.000 | 0.026 | node-14/thread-0/driver.execute | driver.worker-message 0.564ms |
| e8b48d1b06f03040000000000000225d | 121.323 | 121.249 | 0.000 | 0.000 | 0.047 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 121.297 | 1.000 | 0.027 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000022ac | 97.636 | 33.499 | 0.000 | 0.000 | 1.751 | 1.909 | 2.994 | 0.081 | 0.000 | 0.013 | 57.342 | n/a | n/a | 0.048 | 35.250 | 0.361 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000022cc | 94.835 | 94.742 | 0.000 | 0.000 | 0.065 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 94.808 | 1.000 | 0.028 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002428 | 81.289 | 79.147 | 0.000 | 2.079 | 0.038 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 81.265 | 1.000 | 0.025 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000000236f | 77.447 | 77.382 | 0.000 | 0.000 | 0.044 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 77.426 | 1.000 | 0.021 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002325 | 75.927 | 75.869 | 0.000 | 0.000 | 0.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 75.900 | 1.000 | 0.027 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000022db | 73.718 | 25.689 | 0.000 | 0.000 | 0.458 | 1.122 | 13.454 | 0.156 | 0.000 | 0.031 | 32.741 | n/a | n/a | 0.066 | 26.147 | 0.355 | 0.066 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002291 | 72.380 | 18.060 | 0.000 | 0.000 | 0.834 | 6.090 | 3.267 | 0.124 | 0.000 | 0.018 | 43.947 | n/a | n/a | 0.040 | 18.894 | 0.261 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002419 | 62.858 | 62.804 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 62.830 | 1.000 | 0.028 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000022f8 | 60.718 | 27.085 | 0.000 | 0.000 | 1.442 | 1.581 | 2.615 | 0.038 | 0.000 | 0.018 | 27.915 | n/a | n/a | 0.024 | 28.527 | 0.470 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002376 | 54.539 | 14.328 | 0.000 | 0.000 | 0.830 | 2.342 | 3.345 | 0.037 | 0.000 | 0.011 | 33.628 | n/a | n/a | 0.018 | 15.158 | 0.278 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002394 | 50.473 | 50.429 | 0.000 | 0.000 | 0.024 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 50.454 | 1.000 | 0.019 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002351 | 42.454 | 6.780 | 0.000 | 0.000 | 0.834 | 1.107 | 1.653 | 0.033 | 0.000 | 0.012 | 31.989 | n/a | n/a | 0.045 | 7.615 | 0.179 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002264 | 39.953 | 7.355 | 0.000 | 0.000 | 1.119 | 4.190 | 1.919 | 0.073 | 0.000 | 0.017 | 25.248 | n/a | n/a | 0.033 | 8.474 | 0.212 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000023b9 | 35.207 | 35.143 | 0.000 | 0.000 | 0.043 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 35.187 | 0.999 | 0.020 | node-14/thread-0/driver.execute | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.792 | 6.780 | 0.000 | 0.000 | 0.834 | 1.141 | 1.919 | 0.052 | 0.000 | 0.017 | 19.451 | n/a | n/a | 0.024 | 7.615 | 0.251 | 0.024 |
| p99 | 72.380 | 18.060 | 0.000 | 0.000 | 1.323 | 6.090 | 5.942 | 0.124 | 0.000 | 0.048 | 43.947 | n/a | n/a | 0.045 | 18.894 | 0.285 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000002291 | 72.380 | 18.060 | 0.000 | 0.000 | 0.834 | 6.090 | 3.267 | 0.124 | 0.000 | 0.018 | 43.947 | n/a | n/a | 0.040 | 18.894 | 0.261 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002351 | 42.454 | 6.780 | 0.000 | 0.000 | 0.834 | 1.107 | 1.653 | 0.033 | 0.000 | 0.012 | 31.989 | n/a | n/a | 0.045 | 7.615 | 0.179 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002264 | 39.953 | 7.355 | 0.000 | 0.000 | 1.119 | 4.190 | 1.919 | 0.073 | 0.000 | 0.017 | 25.248 | n/a | n/a | 0.033 | 8.474 | 0.212 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002334 | 35.004 | 7.476 | 0.000 | 0.000 | 1.323 | 1.931 | 5.942 | 0.052 | 0.000 | 0.035 | 18.222 | n/a | n/a | 0.023 | 8.799 | 0.251 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000000223f | 33.792 | 8.206 | 0.000 | 0.000 | 0.835 | 1.186 | 4.904 | 0.081 | 0.000 | 0.041 | 18.512 | n/a | n/a | 0.028 | 9.041 | 0.268 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000023e5 | 31.177 | 5.044 | 0.000 | 0.000 | 0.308 | 1.086 | 2.678 | 0.052 | 0.000 | 0.048 | 21.937 | n/a | n/a | 0.024 | 5.353 | 0.172 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000023c0 | 26.561 | 4.347 | 0.000 | 0.000 | 0.332 | 1.108 | 1.269 | 0.024 | 0.000 | 0.010 | 19.451 | n/a | n/a | 0.022 | 4.678 | 0.176 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000000239b | 14.829 | 4.155 | 0.000 | 0.000 | 0.064 | 1.135 | 1.186 | 0.032 | 0.000 | 0.017 | 8.222 | n/a | n/a | 0.018 | 4.219 | 0.285 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002403 | 12.208 | 3.171 | 0.000 | 0.000 | 0.061 | 1.141 | 1.345 | 0.031 | 0.000 | 0.011 | 6.438 | n/a | n/a | 0.011 | 3.232 | 0.265 | 0.011 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (95 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.614 | 11.165 | 0.000 | 0.000 | 0.122 | 0.972 | 0.935 | 0.024 | 0.000 | 0.011 | 7.972 | n/a | n/a | 0.024 | 12.125 | 0.425 | 0.024 |
| p99 | 181.059 | 180.962 | 0.000 | 0.000 | 5.171 | 8.598 | 6.904 | 2.975 | 38.568 | 0.329 | 157.796 | n/a | n/a | 0.117 | 181.012 | 1.000 | 0.117 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000002791 | 181.059 | 180.962 | 0.000 | 0.000 | 0.050 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.046 | 181.012 | 1.000 | 0.046 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002796 | 166.814 | 5.737 | 0.000 | 0.000 | 0.177 | 1.064 | 1.946 | 0.044 | 0.000 | 0.021 | 157.796 | n/a | n/a | 0.029 | 5.914 | 0.035 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002851 | 140.612 | 140.537 | 0.000 | 0.000 | 0.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 140.579 | 1.000 | 0.033 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000026a4 | 99.011 | 98.902 | 0.000 | 0.000 | 0.067 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.042 | 98.969 | 1.000 | 0.042 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002463 | 84.317 | 19.454 | 0.000 | 0.000 | 0.950 | 8.598 | 3.121 | 0.040 | 0.000 | 0.067 | 52.042 | n/a | n/a | 0.045 | 20.404 | 0.242 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000028c8 | 79.820 | 7.998 | 0.000 | 0.000 | 0.235 | 1.007 | 6.649 | 0.054 | 38.568 | 0.031 | 25.230 | n/a | n/a | 0.049 | 8.233 | 0.103 | 0.049 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f03040000000000000293e | 78.097 | 30.315 | 0.000 | 0.000 | 5.171 | 1.271 | 4.740 | 0.073 | 0.000 | 0.015 | 36.395 | n/a | n/a | 0.117 | 35.486 | 0.454 | 0.117 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002b01 | 62.871 | 62.761 | 0.000 | 0.000 | 0.073 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 62.834 | 0.999 | 0.037 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000000257d | 60.880 | 10.935 | 0.000 | 0.000 | 0.543 | 1.085 | 3.427 | 0.031 | 0.000 | 0.013 | 44.829 | n/a | n/a | 0.017 | 11.479 | 0.189 | 0.017 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000028d4 | 55.844 | 55.744 | 0.000 | 0.000 | 0.061 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.039 | 55.806 | 0.999 | 0.039 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002894 | 55.294 | 55.243 | 0.000 | 0.000 | 0.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 55.274 | 1.000 | 0.020 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000024bc | 55.250 | 55.149 | 0.000 | 0.000 | 0.054 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.046 | 55.204 | 0.999 | 0.046 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000027f1 | 54.857 | 54.790 | 0.000 | 0.000 | 0.040 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 54.830 | 1.000 | 0.027 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002738 | 52.003 | 51.916 | 0.000 | 0.000 | 0.052 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.036 | 51.967 | 0.999 | 0.036 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002968 | 50.589 | 50.505 | 0.000 | 0.000 | 0.060 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 50.565 | 1.000 | 0.025 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000000295c | 50.303 | 7.620 | 0.000 | 0.000 | 0.726 | 1.060 | 4.818 | 0.067 | 0.000 | 0.023 | 35.950 | n/a | n/a | 0.038 | 8.346 | 0.166 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000029f7 | 48.518 | 48.479 | 0.000 | 0.000 | 0.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 48.501 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000000282c | 48.403 | 48.344 | 0.000 | 0.000 | 0.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 48.379 | 1.000 | 0.024 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000028d9 | 47.075 | 10.098 | 0.000 | 0.000 | 0.884 | 3.871 | 1.724 | 0.032 | 0.000 | 0.012 | 30.437 | n/a | n/a | 0.017 | 10.982 | 0.233 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002481 | 46.192 | 46.115 | 0.000 | 0.000 | 0.037 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.040 | 46.152 | 0.999 | 0.040 | node-14/thread-0/driver.execute | none observed |

## P2 / baseline / commit / 5-10 facts (26 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.183 | 4.195 | 0.000 | 0.000 | 0.671 | 1.114 | 1.301 | 0.031 | 0.000 | 0.019 | 13.277 | n/a | n/a | 0.026 | 4.866 | 0.240 | 0.026 |
| p99 | 84.317 | 19.454 | 0.000 | 0.000 | 3.834 | 8.598 | 6.904 | 2.975 | 0.000 | 0.329 | 52.042 | n/a | n/a | 0.113 | 20.404 | 0.425 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000002463 | 84.317 | 19.454 | 0.000 | 0.000 | 0.950 | 8.598 | 3.121 | 0.040 | 0.000 | 0.067 | 52.042 | n/a | n/a | 0.045 | 20.404 | 0.242 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002488 | 44.894 | 10.362 | 0.000 | 0.000 | 0.226 | 6.664 | 6.904 | 0.076 | 0.000 | 0.329 | 20.302 | n/a | n/a | 0.031 | 10.588 | 0.236 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000028aa | 38.665 | 8.666 | 0.000 | 0.000 | 0.447 | 1.967 | 1.064 | 0.028 | 0.000 | 0.014 | 26.447 | n/a | n/a | 0.032 | 9.113 | 0.236 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002a48 | 34.352 | 7.205 | 0.000 | 0.000 | 0.530 | 1.114 | 0.966 | 0.028 | 0.000 | 0.012 | 24.471 | n/a | n/a | 0.026 | 7.735 | 0.225 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002533 | 28.467 | 3.108 | 0.000 | 0.000 | 1.047 | 0.988 | 2.008 | 0.079 | 0.000 | 0.038 | 21.179 | n/a | n/a | 0.020 | 4.155 | 0.146 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000000273f | 26.760 | 5.893 | 0.000 | 0.000 | 0.526 | 1.003 | 1.546 | 0.044 | 0.000 | 0.021 | 17.701 | n/a | n/a | 0.024 | 6.419 | 0.240 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000000262d | 24.720 | 5.162 | 0.000 | 0.000 | 0.892 | 1.386 | 3.804 | 0.070 | 0.000 | 0.016 | 13.277 | n/a | n/a | 0.113 | 6.054 | 0.245 | 0.113 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000027c4 | 24.498 | 4.984 | 0.000 | 0.000 | 0.996 | 1.094 | 1.018 | 0.029 | 0.000 | 0.012 | 16.334 | n/a | n/a | 0.031 | 5.979 | 0.244 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002a23 | 23.647 | 4.222 | 0.000 | 0.000 | 0.122 | 1.117 | 0.935 | 0.024 | 0.000 | 0.011 | 17.190 | n/a | n/a | 0.026 | 4.344 | 0.184 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000000290a | 22.807 | 4.957 | 0.000 | 0.000 | 0.306 | 1.894 | 2.033 | 0.026 | 0.000 | 0.048 | 13.508 | n/a | n/a | 0.035 | 5.263 | 0.231 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000027f8 | 22.552 | 3.346 | 0.000 | 0.000 | 0.141 | 1.033 | 1.630 | 2.975 | 0.000 | 0.022 | 13.386 | n/a | n/a | 0.019 | 3.488 | 0.155 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002b1e | 22.496 | 3.948 | 0.000 | 0.000 | 0.675 | 1.142 | 0.978 | 0.025 | 0.000 | 0.014 | 15.676 | n/a | n/a | 0.040 | 4.623 | 0.205 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002acd | 20.699 | 5.287 | 0.000 | 0.000 | 0.915 | 1.222 | 1.755 | 0.031 | 0.000 | 0.041 | 11.416 | n/a | n/a | 0.031 | 6.203 | 0.300 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000026ab | 20.183 | 3.769 | 0.000 | 0.000 | 1.089 | 1.033 | 1.069 | 0.030 | 0.000 | 0.014 | 13.156 | n/a | n/a | 0.024 | 4.857 | 0.241 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002981 | 19.824 | 2.480 | 0.000 | 0.000 | 0.241 | 0.971 | 0.902 | 0.025 | 0.000 | 0.011 | 15.161 | n/a | n/a | 0.032 | 2.721 | 0.137 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002b08 | 19.792 | 3.867 | 0.000 | 0.000 | 0.911 | 1.256 | 1.612 | 0.032 | 0.000 | 0.021 | 12.073 | n/a | n/a | 0.019 | 4.778 | 0.241 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002a0d | 19.507 | 2.988 | 0.000 | 0.000 | 0.250 | 0.974 | 0.931 | 0.025 | 0.000 | 0.018 | 14.292 | n/a | n/a | 0.030 | 3.238 | 0.166 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002aeb | 19.364 | 2.971 | 0.000 | 0.000 | 0.664 | 1.202 | 1.809 | 0.084 | 0.000 | 0.020 | 12.597 | n/a | n/a | 0.017 | 3.636 | 0.188 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000000259a | 18.690 | 6.541 | 0.000 | 0.000 | 0.833 | 0.996 | 1.701 | 0.039 | 0.000 | 0.023 | 8.539 | n/a | n/a | 0.017 | 7.374 | 0.395 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002a92 | 18.636 | 5.698 | 0.000 | 0.000 | 0.894 | 1.121 | 1.238 | 0.034 | 0.000 | 0.019 | 9.615 | n/a | n/a | 0.017 | 6.592 | 0.354 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (100 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.745 | 7.702 | 0.000 | 0.000 | 0.212 | 0.965 | 0.903 | 0.025 | 0.000 | 0.012 | 9.167 | n/a | n/a | 0.022 | 8.615 | 0.331 | 0.022 |
| p99 | 108.672 | 87.189 | 0.000 | 0.000 | 1.499 | 9.429 | 16.319 | 0.209 | 10.307 | 0.085 | 69.463 | n/a | n/a | 0.085 | 87.387 | 1.000 | 0.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000002be7 | 134.799 | 134.690 | 0.000 | 0.000 | 0.070 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.039 | 134.760 | 1.000 | 0.039 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002c8e | 108.672 | 3.442 | 0.000 | 0.000 | 0.369 | 1.215 | 11.295 | 0.034 | 0.000 | 0.013 | 92.282 | n/a | n/a | 0.022 | 3.811 | 0.035 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000003092 | 87.416 | 87.189 | 0.000 | 0.000 | 0.198 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 87.387 | 1.000 | 0.029 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000003057 | 84.779 | 84.580 | 0.000 | 0.000 | 0.114 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.085 | 84.694 | 0.999 | 0.085 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000003272 | 81.387 | 81.324 | 0.000 | 0.000 | 0.041 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 81.365 | 1.000 | 0.022 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000003097 | 78.801 | 6.187 | 0.000 | 0.000 | 1.107 | 1.027 | 8.958 | 0.067 | 31.206 | 0.059 | 30.165 | n/a | n/a | 0.025 | 7.294 | 0.093 | 0.025 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f030400000000000002fb4 | 77.384 | 5.046 | 0.000 | 0.000 | 0.162 | 1.014 | 1.606 | 0.062 | 0.000 | 0.014 | 69.463 | n/a | n/a | 0.017 | 5.208 | 0.067 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002b52 | 77.001 | 20.360 | 0.000 | 0.000 | 1.016 | 9.429 | 17.317 | 0.209 | 0.000 | 0.162 | 28.476 | n/a | n/a | 0.032 | 21.376 | 0.278 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002c39 | 70.543 | 70.466 | 0.000 | 0.000 | 0.056 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 70.522 | 1.000 | 0.021 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002ea3 | 63.620 | 63.556 | 0.000 | 0.000 | 0.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 63.595 | 1.000 | 0.025 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002d05 | 62.714 | 62.674 | 0.000 | 0.000 | 0.024 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 62.698 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002b99 | 62.476 | 3.315 | 0.000 | 0.000 | 0.410 | 0.993 | 4.439 | 0.029 | 0.000 | 0.012 | 53.261 | n/a | n/a | 0.017 | 3.724 | 0.060 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002eb2 | 60.253 | 60.136 | 0.000 | 0.000 | 0.080 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 60.216 | 0.999 | 0.037 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002c2a | 60.209 | 60.156 | 0.000 | 0.000 | 0.030 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 60.186 | 1.000 | 0.023 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002cbb | 57.548 | 3.178 | 0.000 | 0.000 | 0.954 | 1.002 | 0.882 | 0.026 | 0.000 | 0.014 | 51.473 | n/a | n/a | 0.019 | 4.131 | 0.072 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000003306 | 53.300 | 53.246 | 0.000 | 0.000 | 0.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 53.277 | 1.000 | 0.023 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002c74 | 52.161 | 52.115 | 0.000 | 0.000 | 0.029 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 52.144 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002bd8 | 51.546 | 51.476 | 0.000 | 0.000 | 0.049 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 51.525 | 1.000 | 0.021 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002f21 | 49.040 | 48.970 | 0.000 | 0.000 | 0.047 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 49.017 | 1.000 | 0.022 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000002cc7 | 47.176 | 47.112 | 0.000 | 0.000 | 0.038 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 47.150 | 0.999 | 0.026 | node-14/thread-0/driver.execute | none observed |

## P2 / L1 / commit / 5-10 facts (31 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.969 | 4.386 | 0.000 | 0.000 | 0.620 | 1.086 | 1.358 | 0.037 | 0.000 | 0.014 | 14.677 | n/a | n/a | 0.025 | 5.039 | 0.203 | 0.025 |
| p99 | 108.672 | 7.735 | 0.000 | 0.000 | 1.456 | 12.641 | 16.319 | 0.179 | 10.307 | 0.085 | 92.282 | n/a | n/a | 0.060 | 8.226 | 0.372 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000002c8e | 108.672 | 3.442 | 0.000 | 0.000 | 0.369 | 1.215 | 11.295 | 0.034 | 0.000 | 0.013 | 92.282 | n/a | n/a | 0.022 | 3.811 | 0.035 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002fb4 | 77.384 | 5.046 | 0.000 | 0.000 | 0.162 | 1.014 | 1.606 | 0.062 | 0.000 | 0.014 | 69.463 | n/a | n/a | 0.017 | 5.208 | 0.067 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002cbb | 57.548 | 3.178 | 0.000 | 0.000 | 0.954 | 1.002 | 0.882 | 0.026 | 0.000 | 0.014 | 51.473 | n/a | n/a | 0.019 | 4.131 | 0.072 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002c5e | 42.116 | 3.221 | 0.000 | 0.000 | 0.988 | 1.102 | 1.395 | 0.038 | 0.000 | 0.024 | 35.325 | n/a | n/a | 0.023 | 4.208 | 0.100 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002d40 | 35.878 | 4.797 | 0.000 | 0.000 | 0.596 | 4.691 | 16.319 | 0.127 | 0.000 | 0.085 | 9.242 | n/a | n/a | 0.020 | 5.393 | 0.150 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000032c3 | 34.362 | 6.536 | 0.000 | 0.000 | 0.775 | 12.641 | 1.577 | 0.037 | 0.000 | 0.028 | 12.737 | n/a | n/a | 0.030 | 7.312 | 0.213 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002bba | 29.449 | 6.411 | 0.000 | 0.000 | 0.877 | 1.053 | 0.945 | 0.024 | 0.000 | 0.013 | 20.097 | n/a | n/a | 0.028 | 7.288 | 0.247 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002c0c | 29.366 | 2.848 | 0.000 | 0.000 | 0.277 | 1.043 | 0.954 | 0.024 | 0.000 | 0.008 | 24.197 | n/a | n/a | 0.015 | 3.125 | 0.106 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000031c8 | 29.059 | 3.060 | 0.000 | 0.000 | 0.772 | 1.008 | 4.372 | 0.042 | 10.307 | 0.012 | 9.467 | n/a | n/a | 0.019 | 3.832 | 0.132 | 0.019 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f030400000000000002ee3 | 28.405 | 5.084 | 0.000 | 0.000 | 0.499 | 1.280 | 4.228 | 0.037 | 0.000 | 0.022 | 17.213 | n/a | n/a | 0.042 | 5.583 | 0.197 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000030ea | 27.635 | 6.996 | 0.000 | 0.000 | 0.987 | 1.224 | 1.527 | 0.048 | 0.000 | 0.020 | 16.806 | n/a | n/a | 0.026 | 7.983 | 0.289 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000000305e | 27.389 | 7.735 | 0.000 | 0.000 | 0.491 | 2.023 | 2.500 | 0.051 | 0.000 | 0.044 | 14.516 | n/a | n/a | 0.029 | 8.226 | 0.300 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000030af | 25.984 | 4.646 | 0.000 | 0.000 | 0.617 | 1.130 | 2.791 | 0.179 | 0.000 | 0.032 | 16.564 | n/a | n/a | 0.025 | 5.263 | 0.203 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000000322f | 25.466 | 3.737 | 0.000 | 0.000 | 0.449 | 0.992 | 1.055 | 0.041 | 0.000 | 0.013 | 19.149 | n/a | n/a | 0.029 | 4.186 | 0.164 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000003254 | 25.011 | 3.804 | 0.000 | 0.000 | 0.913 | 0.965 | 1.099 | 0.027 | 0.000 | 0.021 | 18.159 | n/a | n/a | 0.022 | 4.717 | 0.189 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000003212 | 23.969 | 5.765 | 0.000 | 0.000 | 0.980 | 1.163 | 1.069 | 0.028 | 0.000 | 0.013 | 14.923 | n/a | n/a | 0.029 | 6.745 | 0.281 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000003125 | 23.618 | 5.135 | 0.000 | 0.000 | 1.091 | 1.010 | 1.278 | 0.039 | 0.000 | 0.014 | 15.021 | n/a | n/a | 0.030 | 6.225 | 0.264 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000002c40 | 22.980 | 3.945 | 0.000 | 0.000 | 0.473 | 0.998 | 1.671 | 0.049 | 0.000 | 0.022 | 15.802 | n/a | n/a | 0.019 | 4.419 | 0.192 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000000314a | 22.948 | 3.502 | 0.000 | 0.000 | 0.439 | 0.983 | 1.506 | 0.036 | 0.000 | 0.046 | 16.398 | n/a | n/a | 0.036 | 3.941 | 0.172 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000003014 | 21.798 | 3.697 | 0.000 | 0.000 | 0.759 | 3.062 | 8.242 | 0.090 | 0.000 | 0.075 | 5.855 | n/a | n/a | 0.019 | 4.456 | 0.204 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (1782 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.330 | 3.957 | 0.000 | 0.000 | 0.897 | 1.096 | 1.290 | 0.036 | 0.000 | 0.011 | 12.715 | n/a | n/a | 0.016 | 5.533 | 0.245 | 0.016 |
| p99 | 366.680 | 106.576 | 0.000 | 4.664 | 209.637 | 34.646 | 12.474 | 11.575 | 0.332 | 0.115 | 140.743 | n/a | n/a | 0.072 | 277.188 | 1.000 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000000d5e2 | 991.044 | 11.536 | 0.000 | 0.000 | 942.614 | 1.318 | 5.399 | 0.027 | 0.000 | 0.215 | 29.928 | n/a | n/a | 0.008 | 954.149 | 0.963 | 0.008 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d548 | 973.190 | 4.109 | 0.000 | 0.000 | 932.448 | 0.967 | 1.272 | 0.037 | 0.000 | 0.008 | 34.337 | n/a | n/a | 0.012 | 936.556 | 0.962 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d4d2 | 959.871 | 5.970 | 0.000 | 0.000 | 906.508 | 5.502 | 2.863 | 0.047 | 0.000 | 0.014 | 38.898 | n/a | n/a | 0.069 | 912.478 | 0.951 | 0.069 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d5a8 | 944.774 | 5.582 | 0.000 | 0.000 | 912.690 | 1.795 | 1.398 | 0.039 | 0.000 | 0.009 | 23.247 | n/a | n/a | 0.014 | 918.272 | 0.972 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d456 | 943.056 | 2.898 | 0.000 | 0.000 | 893.301 | 4.709 | 1.507 | 5.971 | 0.000 | 0.010 | 34.650 | n/a | n/a | 0.010 | 896.199 | 0.950 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d588 | 940.936 | 2.859 | 0.000 | 0.000 | 920.055 | 0.944 | 1.012 | 0.029 | 0.000 | 0.010 | 16.012 | n/a | n/a | 0.016 | 922.914 | 0.981 | 0.016 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d0fa | 918.393 | 16.956 | 0.000 | 0.000 | 662.619 | 0.974 | 11.560 | 21.170 | 0.000 | 0.016 | 205.070 | n/a | n/a | 0.028 | 679.574 | 0.740 | 0.028 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.784ms; driver.worker-message 0.783ms |
| e8b48d1b06f03040000000000000d2d4 | 910.662 | 5.309 | 0.000 | 0.000 | 873.564 | 16.637 | 1.489 | 0.980 | 0.000 | 0.010 | 12.659 | n/a | n/a | 0.013 | 878.874 | 0.965 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d39c | 909.300 | 4.441 | 0.000 | 0.000 | 822.343 | 62.021 | 1.546 | 0.034 | 0.000 | 0.010 | 18.896 | n/a | n/a | 0.009 | 826.784 | 0.909 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d3f4 | 909.145 | 8.231 | 0.000 | 3.086 | 873.245 | 2.612 | 2.010 | 0.034 | 0.000 | 0.011 | 19.906 | n/a | n/a | 0.010 | 884.562 | 0.973 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d1ed | 905.838 | 9.708 | 0.000 | 3.238 | 807.707 | 5.062 | 13.175 | 1.299 | 0.000 | 0.008 | 65.615 | n/a | n/a | 0.028 | 820.653 | 0.906 | 0.028 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms; driver.worker-message 0.784ms |
| e8b48d1b06f03040000000000000d35e | 851.539 | 10.065 | 0.000 | 0.000 | 821.370 | 1.074 | 4.345 | 0.043 | 0.000 | 0.008 | 14.619 | n/a | n/a | 0.014 | 831.435 | 0.976 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d02d | 708.680 | 7.296 | 0.000 | 0.000 | 462.874 | 3.853 | 1.095 | 0.032 | 0.000 | 0.009 | 233.499 | n/a | n/a | 0.022 | 470.170 | 0.663 | 0.022 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.784ms; driver.worker-message 0.783ms |
| e8b48d1b06f03040000000000000d126 | 488.418 | 5.934 | 0.000 | 0.000 | 279.011 | 16.626 | 2.081 | 0.049 | 0.000 | 0.043 | 184.655 | n/a | n/a | 0.020 | 284.945 | 0.583 | 0.020 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000000cfd7 | 479.754 | 9.157 | 0.000 | 0.000 | 353.798 | 0.951 | 5.531 | 2.027 | 0.000 | 0.014 | 108.265 | n/a | n/a | 0.011 | 362.955 | 0.757 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.784ms; driver.worker-message 0.783ms |
| e8b48d1b06f03040000000000000cf4b | 388.158 | 17.289 | 0.000 | 0.000 | 296.426 | 9.408 | 1.671 | 0.036 | 0.000 | 0.035 | 63.281 | n/a | n/a | 0.012 | 313.715 | 0.808 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.784ms; driver.worker-message 0.783ms |
| e8b48d1b06f03040000000000000d04f | 369.848 | 16.883 | 0.000 | 0.000 | 0.289 | 64.815 | 82.959 | 45.608 | 0.074 | 0.027 | 159.177 | n/a | n/a | 0.016 | 17.172 | 0.046 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000000cdef | 366.680 | 7.312 | 0.000 | 0.000 | 209.637 | 36.331 | 8.375 | 0.121 | 0.000 | 0.016 | 104.868 | n/a | n/a | 0.020 | 216.949 | 0.592 | 0.020 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.816ms; driver.worker-message 0.783ms |
| e8b48d1b06f03040000000000000d062 | 360.587 | 8.536 | 0.000 | 0.000 | 84.003 | 5.490 | 29.465 | 44.030 | 0.000 | 0.016 | 189.032 | n/a | n/a | 0.015 | 92.539 | 0.257 | 0.015 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000000ceaf | 335.147 | 6.993 | 0.000 | 0.000 | 241.871 | 1.067 | 1.076 | 0.040 | 0.000 | 0.009 | 84.064 | n/a | n/a | 0.027 | 248.864 | 0.743 | 0.027 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.784ms; driver.worker-message 0.783ms |

## P2 / L4 / commit / 5-10 facts (1040 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.734 | 3.365 | 0.000 | 0.000 | 0.923 | 1.108 | 1.166 | 0.037 | 0.000 | 0.011 | 12.472 | n/a | n/a | 0.016 | 4.692 | 0.227 | 0.016 |
| p99 | 309.175 | 104.084 | 0.000 | 3.576 | 113.470 | 34.887 | 11.353 | 11.575 | 0.000 | 0.115 | 149.306 | n/a | n/a | 0.069 | 248.864 | 1.000 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000000d4d2 | 959.871 | 5.970 | 0.000 | 0.000 | 906.508 | 5.502 | 2.863 | 0.047 | 0.000 | 0.014 | 38.898 | n/a | n/a | 0.069 | 912.478 | 0.951 | 0.069 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d5a8 | 944.774 | 5.582 | 0.000 | 0.000 | 912.690 | 1.795 | 1.398 | 0.039 | 0.000 | 0.009 | 23.247 | n/a | n/a | 0.014 | 918.272 | 0.972 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d456 | 943.056 | 2.898 | 0.000 | 0.000 | 893.301 | 4.709 | 1.507 | 5.971 | 0.000 | 0.010 | 34.650 | n/a | n/a | 0.010 | 896.199 | 0.950 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d588 | 940.936 | 2.859 | 0.000 | 0.000 | 920.055 | 0.944 | 1.012 | 0.029 | 0.000 | 0.010 | 16.012 | n/a | n/a | 0.016 | 922.914 | 0.981 | 0.016 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d2d4 | 910.662 | 5.309 | 0.000 | 0.000 | 873.564 | 16.637 | 1.489 | 0.980 | 0.000 | 0.010 | 12.659 | n/a | n/a | 0.013 | 878.874 | 0.965 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d02d | 708.680 | 7.296 | 0.000 | 0.000 | 462.874 | 3.853 | 1.095 | 0.032 | 0.000 | 0.009 | 233.499 | n/a | n/a | 0.022 | 470.170 | 0.663 | 0.022 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.784ms; driver.worker-message 0.783ms |
| e8b48d1b06f03040000000000000cfd7 | 479.754 | 9.157 | 0.000 | 0.000 | 353.798 | 0.951 | 5.531 | 2.027 | 0.000 | 0.014 | 108.265 | n/a | n/a | 0.011 | 362.955 | 0.757 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.784ms; driver.worker-message 0.783ms |
| e8b48d1b06f03040000000000000d04f | 369.848 | 16.883 | 0.000 | 0.000 | 0.289 | 64.815 | 82.959 | 45.608 | 0.074 | 0.027 | 159.177 | n/a | n/a | 0.016 | 17.172 | 0.046 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000000d062 | 360.587 | 8.536 | 0.000 | 0.000 | 84.003 | 5.490 | 29.465 | 44.030 | 0.000 | 0.016 | 189.032 | n/a | n/a | 0.015 | 92.539 | 0.257 | 0.015 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000000ceaf | 335.147 | 6.993 | 0.000 | 0.000 | 241.871 | 1.067 | 1.076 | 0.040 | 0.000 | 0.009 | 84.064 | n/a | n/a | 0.027 | 248.864 | 0.743 | 0.027 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.784ms; driver.worker-message 0.783ms |
| e8b48d1b06f03040000000000000d06e | 309.175 | 12.104 | 0.000 | 0.000 | 0.915 | 25.968 | 4.875 | 86.954 | 0.000 | 0.010 | 178.323 | n/a | n/a | 0.026 | 13.020 | 0.042 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000000cd19 | 277.080 | 252.832 | 0.000 | 5.180 | 19.057 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 277.070 | 1.000 | 0.010 | node-14/thread-0/client.persist-and-resolve | driver.worker-message 0.816ms |
| e8b48d1b06f03040000000000000cdd9 | 276.983 | 4.424 | 0.000 | 0.000 | 113.035 | 39.549 | 1.526 | 0.042 | 0.000 | 0.011 | 118.385 | n/a | n/a | 0.011 | 117.459 | 0.424 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.worker-message 0.783ms |
| e8b48d1b06f03040000000000000ccd3 | 272.700 | 8.392 | 0.000 | 0.000 | 11.425 | 0.944 | 4.405 | 0.077 | 0.000 | 0.008 | 247.434 | n/a | n/a | 0.015 | 19.817 | 0.073 | 0.015 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.worker-message 0.816ms |
| e8b48d1b06f03040000000000000ccc3 | 266.907 | 16.381 | 0.000 | 0.000 | 0.054 | 1.300 | 2.616 | 0.068 | 0.000 | 0.014 | 246.461 | n/a | n/a | 0.012 | 16.435 | 0.062 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.worker-message 0.816ms |
| e8b48d1b06f03040000000000000cd13 | 266.840 | 240.302 | 0.000 | 5.180 | 21.343 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 266.824 | 1.000 | 0.015 | node-14/thread-0/client.persist-and-resolve | driver.worker-message 0.816ms |
| e8b48d1b06f03040000000000000ccf1 | 262.262 | 239.292 | 0.000 | 5.180 | 17.772 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 262.245 | 1.000 | 0.017 | node-14/thread-0/client.persist-and-resolve | driver.worker-message 0.816ms |
| e8b48d1b06f03040000000000000cd0d | 252.639 | 7.251 | 0.000 | 0.000 | 34.516 | 6.791 | 1.867 | 0.068 | 0.000 | 0.016 | 202.118 | n/a | n/a | 0.013 | 41.767 | 0.165 | 0.013 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.worker-message 0.816ms |
| e8b48d1b06f03040000000000000cd51 | 242.260 | 4.979 | 0.000 | 0.000 | 0.317 | 3.567 | 1.336 | 0.036 | 0.000 | 0.014 | 231.977 | n/a | n/a | 0.034 | 5.295 | 0.022 | 0.034 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000000cd5d | 234.831 | 4.796 | 0.000 | 0.000 | 0.938 | 1.003 | 2.098 | 0.061 | 0.000 | 0.016 | 225.888 | n/a | n/a | 0.030 | 5.735 | 0.024 | 0.030 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (1687 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 54.309 | 6.453 | 0.000 | 0.000 | 4.008 | 2.425 | 1.424 | 0.036 | 0.000 | 0.009 | 13.532 | n/a | n/a | 0.015 | 16.096 | 0.363 | 0.015 |
| p99 | 847.172 | 235.841 | 0.000 | 16.786 | 732.827 | 161.069 | 21.154 | 30.909 | 0.244 | 0.091 | 140.129 | n/a | n/a | 0.061 | 736.015 | 1.000 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000000e088 | 1283.710 | 4.806 | 0.000 | 0.000 | 1197.156 | 0.950 | 2.155 | 0.041 | 0.000 | 0.009 | 78.531 | n/a | n/a | 0.062 | 1201.962 | 0.936 | 0.062 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000de74 | 1265.333 | 19.565 | 0.000 | 0.000 | 1034.880 | 113.408 | 6.187 | 0.167 | 0.000 | 0.046 | 91.067 | n/a | n/a | 0.012 | 1054.445 | 0.833 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000e120 | 1144.362 | 3.741 | 0.000 | 0.000 | 1100.256 | 0.929 | 1.225 | 0.058 | 0.000 | 0.009 | 38.128 | n/a | n/a | 0.017 | 1103.997 | 0.965 | 0.017 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000e19b | 1104.134 | 5.153 | 0.000 | 0.000 | 1070.482 | 4.029 | 3.752 | 0.051 | 0.000 | 0.008 | 20.646 | n/a | n/a | 0.014 | 1075.635 | 0.974 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms; driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000e1ef | 1090.118 | 3.408 | 0.000 | 0.000 | 1067.146 | 0.993 | 0.968 | 0.032 | 0.000 | 0.004 | 17.557 | n/a | n/a | 0.010 | 1070.554 | 0.982 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms; driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000e262 | 1089.323 | 4.107 | 0.000 | 0.000 | 1010.428 | 2.407 | 4.952 | 0.053 | 0.000 | 0.013 | 67.346 | n/a | n/a | 0.017 | 1014.534 | 0.931 | 0.017 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms; driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000ddf8 | 1039.151 | 5.741 | 0.000 | 0.000 | 908.156 | 114.514 | 1.083 | 0.030 | 0.000 | 0.009 | 9.607 | n/a | n/a | 0.011 | 913.898 | 0.879 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000dbd6 | 924.039 | 16.031 | 0.000 | 0.000 | 272.694 | 204.489 | 19.639 | 122.887 | 0.000 | 0.067 | 288.210 | n/a | n/a | 0.020 | 288.726 | 0.312 | 0.020 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000000e2f4 | 914.063 | 3.529 | 0.000 | 0.000 | 829.501 | 0.925 | 1.245 | 0.062 | 0.000 | 0.007 | 78.774 | n/a | n/a | 0.020 | 833.030 | 0.911 | 0.020 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms; driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000e485 | 911.873 | 4.391 | 0.000 | 0.000 | 875.405 | 1.001 | 2.059 | 0.040 | 0.000 | 0.013 | 28.938 | n/a | n/a | 0.027 | 879.795 | 0.965 | 0.027 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms; driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000e3a7 | 894.565 | 3.197 | 0.000 | 0.000 | 821.808 | 0.948 | 4.096 | 0.068 | 0.000 | 0.008 | 64.429 | n/a | n/a | 0.012 | 825.004 | 0.922 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms; driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000e40f | 882.391 | 3.255 | 0.000 | 0.000 | 851.517 | 12.394 | 2.508 | 0.032 | 0.000 | 0.009 | 12.668 | n/a | n/a | 0.009 | 854.772 | 0.969 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms; driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000e368 | 882.340 | 3.987 | 0.000 | 0.000 | 853.803 | 1.040 | 0.747 | 0.029 | 0.000 | 0.007 | 22.707 | n/a | n/a | 0.020 | 857.790 | 0.972 | 0.020 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms; driver.worker-message 0.602ms |
| e8b48d1b06f030400000000000012e7a | 878.516 | 18.944 | 0.000 | 0.000 | 620.683 | 201.901 | 8.319 | 15.957 | 0.000 | 0.104 | 12.586 | n/a | n/a | 0.022 | 639.627 | 0.728 | 0.022 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 3.149ms; driver.worker-message 1.054ms; driver.worker-message 0.992ms; driver.worker-message 0.929ms; driver.worker-message 0.918ms |
| e8b48d1b06f03040000000000001304b | 863.084 | 7.780 | 0.000 | 0.000 | 775.182 | 38.355 | 2.184 | 0.090 | 0.000 | 0.010 | 39.469 | n/a | n/a | 0.016 | 782.961 | 0.907 | 0.016 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 3.149ms; driver.worker-message 1.054ms; driver.worker-message 0.992ms; driver.worker-message 0.929ms; driver.worker-message 0.918ms |
| e8b48d1b06f030400000000000012fb1 | 851.324 | 14.475 | 0.000 | 0.000 | 694.779 | 1.074 | 5.241 | 0.047 | 0.000 | 0.010 | 135.674 | n/a | n/a | 0.025 | 709.254 | 0.833 | 0.025 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 3.149ms; driver.worker-message 1.054ms; driver.worker-message 0.992ms; driver.worker-message 0.929ms; driver.worker-message 0.918ms |
| e8b48d1b06f03040000000000000e4dd | 847.172 | 7.397 | 0.000 | 0.000 | 815.272 | 0.929 | 3.553 | 0.045 | 0.000 | 0.009 | 19.957 | n/a | n/a | 0.010 | 822.669 | 0.971 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms; driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000ded8 | 842.042 | 4.934 | 0.000 | 0.000 | 732.827 | 93.825 | 1.189 | 0.031 | 0.000 | 0.008 | 9.214 | n/a | n/a | 0.013 | 737.761 | 0.876 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000dc42 | 838.482 | 24.162 | 0.000 | 0.000 | 148.957 | 337.319 | 7.912 | 35.187 | 0.000 | 0.037 | 284.892 | n/a | n/a | 0.016 | 173.119 | 0.206 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000ddb4 | 834.512 | 63.106 | 0.000 | 0.000 | 419.613 | 303.420 | 1.134 | 0.031 | 0.000 | 0.009 | 47.183 | n/a | n/a | 0.016 | 482.720 | 0.578 | 0.016 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.602ms |

## P2 / L16 / commit / 5-10 facts (1007 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 52.991 | 5.522 | 0.000 | 0.000 | 4.988 | 2.633 | 1.323 | 0.036 | 0.000 | 0.009 | 13.466 | n/a | n/a | 0.014 | 14.717 | 0.353 | 0.014 |
| p99 | 771.218 | 188.912 | 0.000 | 15.528 | 680.125 | 102.248 | 15.274 | 34.963 | 0.000 | 0.091 | 141.815 | n/a | n/a | 0.056 | 686.658 | 1.000 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000000e120 | 1144.362 | 3.741 | 0.000 | 0.000 | 1100.256 | 0.929 | 1.225 | 0.058 | 0.000 | 0.009 | 38.128 | n/a | n/a | 0.017 | 1103.997 | 0.965 | 0.017 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000e19b | 1104.134 | 5.153 | 0.000 | 0.000 | 1070.482 | 4.029 | 3.752 | 0.051 | 0.000 | 0.008 | 20.646 | n/a | n/a | 0.014 | 1075.635 | 0.974 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms; driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000e1ef | 1090.118 | 3.408 | 0.000 | 0.000 | 1067.146 | 0.993 | 0.968 | 0.032 | 0.000 | 0.004 | 17.557 | n/a | n/a | 0.010 | 1070.554 | 0.982 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms; driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000ddf8 | 1039.151 | 5.741 | 0.000 | 0.000 | 908.156 | 114.514 | 1.083 | 0.030 | 0.000 | 0.009 | 9.607 | n/a | n/a | 0.011 | 913.898 | 0.879 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000e2f4 | 914.063 | 3.529 | 0.000 | 0.000 | 829.501 | 0.925 | 1.245 | 0.062 | 0.000 | 0.007 | 78.774 | n/a | n/a | 0.020 | 833.030 | 0.911 | 0.020 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms; driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000e40f | 882.391 | 3.255 | 0.000 | 0.000 | 851.517 | 12.394 | 2.508 | 0.032 | 0.000 | 0.009 | 12.668 | n/a | n/a | 0.009 | 854.772 | 0.969 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms; driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000e368 | 882.340 | 3.987 | 0.000 | 0.000 | 853.803 | 1.040 | 0.747 | 0.029 | 0.000 | 0.007 | 22.707 | n/a | n/a | 0.020 | 857.790 | 0.972 | 0.020 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms; driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000001304b | 863.084 | 7.780 | 0.000 | 0.000 | 775.182 | 38.355 | 2.184 | 0.090 | 0.000 | 0.010 | 39.469 | n/a | n/a | 0.016 | 782.961 | 0.907 | 0.016 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 3.149ms; driver.worker-message 1.054ms; driver.worker-message 0.992ms; driver.worker-message 0.929ms; driver.worker-message 0.918ms |
| e8b48d1b06f03040000000000000dc42 | 838.482 | 24.162 | 0.000 | 0.000 | 148.957 | 337.319 | 7.912 | 35.187 | 0.000 | 0.037 | 284.892 | n/a | n/a | 0.016 | 173.119 | 0.206 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000dd7e | 821.036 | 5.035 | 0.000 | 0.000 | 386.759 | 312.551 | 8.337 | 0.060 | 0.000 | 0.014 | 108.267 | n/a | n/a | 0.013 | 391.794 | 0.477 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000e533 | 771.218 | 2.357 | 0.000 | 0.000 | 733.658 | 1.889 | 3.158 | 0.042 | 0.000 | 0.013 | 30.095 | n/a | n/a | 0.005 | 736.015 | 0.954 | 0.005 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms |
| e8b48d1b06f03040000000000000dc1e | 747.082 | 10.210 | 0.000 | 0.000 | 0.176 | 353.446 | 35.678 | 93.880 | 0.000 | 0.032 | 253.647 | n/a | n/a | 0.012 | 10.386 | 0.014 | 0.012 | node-14/thread-0/socket.wait-first-byte | driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000e58b | 727.105 | 6.532 | 0.000 | 0.000 | 680.125 | 5.732 | 10.587 | 0.149 | 0.000 | 0.083 | 23.889 | n/a | n/a | 0.007 | 686.658 | 0.944 | 0.007 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms |
| e8b48d1b06f03040000000000000d67a | 723.447 | 2.574 | 0.000 | 0.000 | 698.367 | 3.401 | 1.492 | 0.045 | 0.000 | 0.023 | 17.534 | n/a | n/a | 0.009 | 700.942 | 0.969 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000e240 | 700.623 | 3.545 | 0.000 | 0.000 | 620.806 | 7.241 | 0.789 | 0.028 | 0.000 | 0.011 | 68.193 | n/a | n/a | 0.010 | 624.351 | 0.891 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms; driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000deae | 699.547 | 4.555 | 0.000 | 0.000 | 581.074 | 99.855 | 2.810 | 0.034 | 0.000 | 0.012 | 11.186 | n/a | n/a | 0.021 | 585.629 | 0.837 | 0.021 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.602ms |
| e8b48d1b06f03040000000000000d6b2 | 669.493 | 3.492 | 0.000 | 0.000 | 648.101 | 1.006 | 1.827 | 0.070 | 0.000 | 0.008 | 14.976 | n/a | n/a | 0.013 | 651.593 | 0.973 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f030400000000000012cef | 648.123 | 3.844 | 0.000 | 0.000 | 575.921 | 7.356 | 0.655 | 0.019 | 0.000 | 0.007 | 60.311 | n/a | n/a | 0.010 | 579.765 | 0.895 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.054ms; driver.worker-message 0.992ms; driver.worker-message 0.842ms; driver.worker-message 0.672ms; driver.worker-message 0.578ms |
| e8b48d1b06f03040000000000000e0c0 | 624.006 | 16.162 | 0.000 | 0.000 | 469.856 | 22.915 | 5.023 | 0.231 | 0.000 | 0.052 | 109.749 | n/a | n/a | 0.019 | 486.018 | 0.779 | 0.019 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 0.605ms; driver.worker-message 0.602ms |
| e8b48d1b06f030400000000000013163 | 623.561 | 4.132 | 0.000 | 0.000 | 591.213 | 5.141 | 1.728 | 0.097 | 0.000 | 0.014 | 21.225 | n/a | n/a | 0.011 | 595.345 | 0.955 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 3.149ms; driver.worker-message 0.929ms; driver.worker-message 0.918ms; driver.worker-message 0.918ms; driver.worker-message 0.847ms |

## P2 / outside-phases / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 437.059 | 4.470 | 0.000 | 0.000 | 16.972 | 2.054 | 3.817 | 0.052 | 0.000 | 0.014 | 18.719 | n/a | n/a | 0.024 | 26.196 | 0.329 | 0.024 |
| p99 | 906.647 | 283.751 | 0.000 | 3.134 | 879.058 | 107.919 | 35.613 | 63.366 | 0.000 | 0.032 | 229.638 | n/a | n/a | 0.081 | 882.297 | 0.973 | 0.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000000d62e | 906.647 | 3.240 | 0.000 | 0.000 | 879.058 | 0.928 | 1.578 | 2.075 | 0.000 | 0.014 | 19.745 | n/a | n/a | 0.010 | 882.297 | 0.973 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d2ea | 487.294 | 3.144 | 0.000 | 0.000 | 466.789 | 2.824 | 3.817 | 0.063 | 0.000 | 0.014 | 10.635 | n/a | n/a | 0.009 | 469.933 | 0.964 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d0cd | 462.785 | 9.223 | 0.000 | 0.000 | 16.972 | 107.919 | 35.613 | 63.366 | 0.000 | 0.024 | 229.638 | n/a | n/a | 0.029 | 26.196 | 0.057 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.worker-message 1.105ms |
| e8b48d1b06f03040000000000000d09d | 437.517 | 283.751 | 0.000 | 3.134 | 26.676 | 10.794 | 14.196 | 0.041 | 0.000 | 0.024 | 98.821 | n/a | n/a | 0.081 | 313.561 | 0.717 | 0.081 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000000d097 | 437.059 | 260.224 | 0.000 | 3.134 | 29.820 | 10.087 | 9.002 | 7.443 | 0.000 | 0.032 | 117.293 | n/a | n/a | 0.024 | 293.177 | 0.671 | 0.024 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000001afbf | 30.093 | 5.350 | 0.000 | 0.000 | 0.697 | 1.147 | 4.085 | 0.052 | 0.000 | 0.020 | 18.719 | n/a | n/a | 0.022 | 6.047 | 0.201 | 0.022 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001afd5 | 24.740 | 4.470 | 0.000 | 0.000 | 1.092 | 1.075 | 1.134 | 0.022 | 0.000 | 0.008 | 16.911 | n/a | n/a | 0.028 | 5.562 | 0.225 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001969f | 21.190 | 3.683 | 0.000 | 0.000 | 0.286 | 2.054 | 1.365 | 0.031 | 0.000 | 0.011 | 13.731 | n/a | n/a | 0.030 | 3.969 | 0.187 | 0.030 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a240 | 14.978 | 3.867 | 0.000 | 0.000 | 1.064 | 1.002 | 1.698 | 0.048 | 0.000 | 0.010 | 7.266 | n/a | n/a | 0.023 | 4.931 | 0.329 | 0.023 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (95 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.726 | 16.308 | 0.000 | 0.000 | 0.129 | 0.912 | 0.897 | 0.028 | 0.000 | 0.007 | 6.001 | n/a | n/a | 0.018 | 17.144 | 0.493 | 0.018 |
| p99 | 131.070 | 131.032 | 0.000 | 3.480 | 6.460 | 18.105 | 9.861 | 0.237 | 0.000 | 0.038 | 78.216 | n/a | n/a | 0.127 | 131.046 | 1.000 | 0.127 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000016eef | 131.070 | 131.032 | 0.000 | 0.000 | 0.014 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 131.046 | 1.000 | 0.024 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000016e02 | 126.126 | 125.806 | 0.000 | 0.000 | 0.289 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 126.095 | 1.000 | 0.031 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000016e8b | 88.168 | 5.910 | 0.000 | 0.000 | 0.812 | 0.963 | 2.162 | 0.058 | 0.000 | 0.017 | 78.216 | n/a | n/a | 0.030 | 6.722 | 0.076 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000170d6 | 83.188 | 83.138 | 0.000 | 0.000 | 0.027 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 83.165 | 1.000 | 0.023 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000170a2 | 80.687 | 26.598 | 0.000 | 0.000 | 0.998 | 1.927 | 9.861 | 0.237 | 0.000 | 0.033 | 40.905 | n/a | n/a | 0.127 | 27.596 | 0.342 | 0.127 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017293 | 75.667 | 75.637 | 0.000 | 0.000 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 75.654 | 1.000 | 0.013 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000017197 | 63.263 | 63.217 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 63.243 | 1.000 | 0.020 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000016e15 | 57.424 | 57.385 | 0.000 | 0.000 | 0.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 57.401 | 1.000 | 0.023 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000016e1c | 56.601 | 14.248 | 0.000 | 0.000 | 0.731 | 6.009 | 7.562 | 0.180 | 0.000 | 0.027 | 27.807 | n/a | n/a | 0.037 | 14.979 | 0.265 | 0.037 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000016f4f | 56.268 | 56.217 | 0.000 | 0.000 | 0.036 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 56.253 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000017188 | 55.267 | 55.202 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.039 | 55.228 | 0.999 | 0.039 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000016e50 | 53.897 | 53.850 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 53.875 | 1.000 | 0.022 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000017034 | 52.916 | 16.136 | 0.000 | 0.000 | 1.008 | 5.202 | 5.852 | 0.091 | 0.000 | 0.028 | 24.501 | n/a | n/a | 0.098 | 17.144 | 0.324 | 0.098 | gw-w/thread-80/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017065 | 51.327 | 16.308 | 0.000 | 0.000 | 0.269 | 18.105 | 3.046 | 0.115 | 0.000 | 0.008 | 13.453 | n/a | n/a | 0.024 | 16.576 | 0.323 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| e8b48d1b06f030400000000000017311 | 50.286 | 50.248 | 0.000 | 0.000 | 0.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 50.271 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001704a | 47.890 | 47.834 | 0.000 | 0.000 | 0.032 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 47.866 | 0.999 | 0.024 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000017059 | 47.723 | 17.416 | 0.000 | 0.000 | 0.295 | 3.103 | 2.891 | 0.059 | 0.000 | 0.030 | 23.895 | n/a | n/a | 0.035 | 17.711 | 0.371 | 0.035 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000172dd | 45.130 | 45.104 | 0.000 | 0.000 | 0.012 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 45.116 | 1.000 | 0.013 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001700f | 43.611 | 43.579 | 0.000 | 0.000 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 43.594 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000016ea1 | 43.329 | 43.293 | 0.000 | 0.000 | 0.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 43.308 | 1.000 | 0.021 | node-14/thread-0/driver.execute | none observed |

## P2 / L64 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.564 | 4.217 | 0.000 | 0.000 | 0.731 | 1.014 | 1.297 | 0.035 | 0.000 | 0.010 | 8.434 | n/a | n/a | 0.019 | 5.058 | 0.277 | 0.019 |
| p99 | 80.687 | 26.598 | 0.000 | 0.000 | 3.469 | 6.175 | 9.861 | 0.237 | 0.000 | 0.038 | 40.905 | n/a | n/a | 0.127 | 27.596 | 0.508 | 0.127 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f0304000000000000170a2 | 80.687 | 26.598 | 0.000 | 0.000 | 0.998 | 1.927 | 9.861 | 0.237 | 0.000 | 0.033 | 40.905 | n/a | n/a | 0.127 | 27.596 | 0.342 | 0.127 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000016e1c | 56.601 | 14.248 | 0.000 | 0.000 | 0.731 | 6.009 | 7.562 | 0.180 | 0.000 | 0.027 | 27.807 | n/a | n/a | 0.037 | 14.979 | 0.265 | 0.037 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017405 | 40.218 | 13.366 | 0.000 | 0.000 | 3.469 | 6.175 | 2.339 | 0.160 | 0.000 | 0.022 | 14.667 | n/a | n/a | 0.021 | 16.835 | 0.419 | 0.021 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000016e3a | 36.742 | 8.657 | 0.000 | 0.000 | 0.429 | 1.625 | 2.928 | 0.063 | 0.000 | 0.025 | 22.996 | n/a | n/a | 0.019 | 9.085 | 0.247 | 0.019 | gw-w/thread-79/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000016f39 | 35.478 | 5.713 | 0.000 | 0.000 | 0.506 | 1.004 | 1.752 | 0.032 | 0.000 | 0.012 | 26.420 | n/a | n/a | 0.037 | 6.220 | 0.175 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000016e57 | 29.576 | 4.955 | 0.000 | 0.000 | 0.254 | 3.063 | 4.667 | 0.041 | 0.000 | 0.007 | 16.568 | n/a | n/a | 0.021 | 5.209 | 0.176 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017085 | 26.324 | 7.422 | 0.000 | 0.000 | 2.874 | 6.027 | 1.482 | 0.035 | 0.000 | 0.012 | 8.452 | n/a | n/a | 0.020 | 10.297 | 0.391 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017298 | 26.078 | 5.118 | 0.000 | 0.000 | 0.250 | 1.022 | 1.211 | 0.043 | 0.000 | 0.011 | 18.405 | n/a | n/a | 0.018 | 5.368 | 0.206 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000016ed9 | 25.072 | 4.120 | 0.000 | 0.000 | 0.938 | 1.014 | 2.636 | 0.035 | 0.000 | 0.008 | 16.301 | n/a | n/a | 0.021 | 5.058 | 0.202 | 0.021 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001741b | 24.924 | 5.448 | 0.000 | 0.000 | 1.306 | 5.324 | 4.767 | 0.045 | 0.000 | 0.027 | 7.965 | n/a | n/a | 0.041 | 6.754 | 0.271 | 0.041 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000174a1 | 24.446 | 3.583 | 0.000 | 0.000 | 0.162 | 0.943 | 3.571 | 0.037 | 0.000 | 0.008 | 16.122 | n/a | n/a | 0.019 | 3.745 | 0.153 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000171a6 | 22.161 | 4.217 | 0.000 | 0.000 | 2.692 | 0.929 | 1.557 | 0.042 | 0.000 | 0.012 | 12.695 | n/a | n/a | 0.017 | 6.909 | 0.312 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000016dec | 21.266 | 4.942 | 0.000 | 0.000 | 0.923 | 1.031 | 1.297 | 0.041 | 0.000 | 0.015 | 12.999 | n/a | n/a | 0.020 | 5.864 | 0.276 | 0.020 | gw-w/thread-81/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000016fd4 | 21.122 | 8.424 | 0.000 | 0.000 | 2.283 | 1.207 | 1.575 | 0.045 | 0.000 | 0.009 | 7.555 | n/a | n/a | 0.024 | 10.707 | 0.507 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000016ff9 | 20.878 | 3.752 | 0.000 | 0.000 | 0.074 | 1.062 | 1.850 | 0.040 | 0.000 | 0.038 | 14.027 | n/a | n/a | 0.036 | 3.826 | 0.183 | 0.036 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000016f79 | 20.456 | 3.970 | 0.000 | 0.000 | 0.821 | 0.918 | 1.416 | 0.029 | 0.000 | 0.007 | 13.271 | n/a | n/a | 0.024 | 4.791 | 0.234 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001701e | 19.078 | 4.582 | 0.000 | 0.000 | 0.123 | 0.922 | 1.918 | 0.121 | 0.000 | 0.015 | 11.380 | n/a | n/a | 0.018 | 4.704 | 0.247 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017441 | 18.564 | 5.978 | 0.000 | 0.000 | 0.811 | 1.815 | 3.650 | 0.033 | 0.000 | 0.013 | 6.252 | n/a | n/a | 0.013 | 6.789 | 0.366 | 0.013 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000174be | 16.871 | 8.441 | 0.000 | 0.000 | 0.129 | 0.929 | 0.897 | 0.029 | 0.000 | 0.007 | 6.421 | n/a | n/a | 0.017 | 8.570 | 0.508 | 0.017 | node-14/thread-0/driver.publication | none observed |
| e8b48d1b06f030400000000000017145 | 16.687 | 2.701 | 0.000 | 0.000 | 0.709 | 2.486 | 1.065 | 0.031 | 0.000 | 0.010 | 9.669 | n/a | n/a | 0.015 | 3.411 | 0.204 | 0.015 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (96 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.656 | 22.531 | 0.000 | 0.000 | 0.061 | 0.923 | 0.846 | 0.029 | 0.000 | 0.007 | 5.476 | n/a | n/a | 0.020 | 25.382 | 0.569 | 0.020 |
| p99 | 328.846 | 205.805 | 0.000 | 167.151 | 73.128 | 118.721 | 21.020 | 0.595 | 43.407 | 0.108 | 83.325 | n/a | n/a | 5.500 | 212.578 | 1.000 | 5.500 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000017b58 | 328.846 | 120.116 | 0.000 | 0.000 | 73.128 | 118.721 | 2.209 | 0.112 | 0.000 | 0.009 | 14.530 | n/a | n/a | 0.021 | 193.245 | 0.588 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| e8b48d1b06f030400000000000017b72 | 212.602 | 45.409 | 0.000 | 167.151 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 212.578 | 1.000 | 0.024 | node-14/thread-0/node.gc | none observed |
| e8b48d1b06f030400000000000017637 | 205.867 | 205.805 | 0.000 | 0.000 | 0.032 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 205.837 | 1.000 | 0.030 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000175ae | 181.019 | 172.048 | 0.000 | 8.926 | 0.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 180.997 | 1.000 | 0.021 | node-14/thread-0/driver.execute | driver.worker-message 0.960ms |
| e8b48d1b06f0304000000000000175f8 | 142.149 | 36.839 | 0.000 | 0.000 | 0.414 | 10.647 | 10.249 | 0.595 | 0.000 | 0.048 | 83.325 | n/a | n/a | 0.032 | 37.252 | 0.262 | 0.032 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017aaa | 135.709 | 135.635 | 0.000 | 0.000 | 0.047 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 135.682 | 1.000 | 0.026 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000178b2 | 86.754 | 86.719 | 0.000 | 0.000 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 86.739 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000017b03 | 84.991 | 84.915 | 0.000 | 0.000 | 0.044 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 84.959 | 1.000 | 0.033 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000017619 | 80.289 | 12.770 | 0.000 | 0.000 | 1.008 | 1.058 | 8.572 | 0.103 | 0.000 | 0.007 | 56.747 | n/a | n/a | 0.024 | 13.778 | 0.172 | 0.024 | gw-w/thread-83/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017904 | 79.582 | 11.899 | 0.000 | 0.000 | 0.540 | 2.118 | 3.525 | 0.448 | 0.000 | 0.036 | 60.985 | n/a | n/a | 0.032 | 12.438 | 0.156 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017ad6 | 78.596 | 18.911 | 0.000 | 0.000 | 0.353 | 0.921 | 8.192 | 0.092 | 0.000 | 0.012 | 50.092 | n/a | n/a | 0.023 | 19.264 | 0.245 | 0.023 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017697 | 76.404 | 3.957 | 0.000 | 0.000 | 0.027 | 3.485 | 2.759 | 0.045 | 43.407 | 0.032 | 22.674 | n/a | n/a | 0.018 | 3.984 | 0.052 | 0.018 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f030400000000000017646 | 74.533 | 27.794 | 0.000 | 0.000 | 12.988 | 1.101 | 3.650 | 0.052 | 0.000 | 0.010 | 28.909 | n/a | n/a | 0.030 | 40.782 | 0.547 | 0.030 | gw-w/thread-80/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000179a7 | 74.417 | 74.387 | 0.000 | 0.000 | 0.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 74.403 | 1.000 | 0.013 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000017a85 | 72.129 | 72.074 | 0.000 | 0.000 | 0.027 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 72.101 | 1.000 | 0.028 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000017792 | 59.728 | 59.672 | 0.000 | 0.000 | 0.040 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 59.712 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000017ab9 | 54.905 | 54.812 | 0.000 | 0.000 | 0.061 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 54.873 | 0.999 | 0.032 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001794e | 54.355 | 54.313 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 54.339 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000017a4e | 52.958 | 14.845 | 0.000 | 0.000 | 12.229 | 15.973 | 1.284 | 0.035 | 0.000 | 0.011 | 8.555 | n/a | n/a | 0.025 | 27.075 | 0.511 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| e8b48d1b06f030400000000000017a00 | 52.925 | 52.891 | 0.000 | 0.000 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 52.906 | 1.000 | 0.019 | node-14/thread-0/driver.execute | none observed |

## P2 / L256 / commit / 5-10 facts (34 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.647 | 7.983 | 0.000 | 0.000 | 0.540 | 1.197 | 1.284 | 0.041 | 0.000 | 0.009 | 9.969 | n/a | n/a | 0.020 | 9.154 | 0.363 | 0.020 |
| p99 | 328.846 | 120.116 | 0.000 | 1.495 | 73.128 | 118.721 | 21.020 | 0.595 | 43.407 | 0.108 | 83.325 | n/a | n/a | 0.098 | 193.245 | 0.588 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000017b58 | 328.846 | 120.116 | 0.000 | 0.000 | 73.128 | 118.721 | 2.209 | 0.112 | 0.000 | 0.009 | 14.530 | n/a | n/a | 0.021 | 193.245 | 0.588 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| e8b48d1b06f0304000000000000175f8 | 142.149 | 36.839 | 0.000 | 0.000 | 0.414 | 10.647 | 10.249 | 0.595 | 0.000 | 0.048 | 83.325 | n/a | n/a | 0.032 | 37.252 | 0.262 | 0.032 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017904 | 79.582 | 11.899 | 0.000 | 0.000 | 0.540 | 2.118 | 3.525 | 0.448 | 0.000 | 0.036 | 60.985 | n/a | n/a | 0.032 | 12.438 | 0.156 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017697 | 76.404 | 3.957 | 0.000 | 0.000 | 0.027 | 3.485 | 2.759 | 0.045 | 43.407 | 0.032 | 22.674 | n/a | n/a | 0.018 | 3.984 | 0.052 | 0.018 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f030400000000000017646 | 74.533 | 27.794 | 0.000 | 0.000 | 12.988 | 1.101 | 3.650 | 0.052 | 0.000 | 0.010 | 28.909 | n/a | n/a | 0.030 | 40.782 | 0.547 | 0.030 | gw-w/thread-80/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017a4e | 52.958 | 14.845 | 0.000 | 0.000 | 12.229 | 15.973 | 1.284 | 0.035 | 0.000 | 0.011 | 8.555 | n/a | n/a | 0.025 | 27.075 | 0.511 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| e8b48d1b06f03040000000000001772b | 47.350 | 10.314 | 0.000 | 0.000 | 0.300 | 7.992 | 21.020 | 0.083 | 0.000 | 0.075 | 7.538 | n/a | n/a | 0.027 | 10.614 | 0.224 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001780f | 41.147 | 22.531 | 0.000 | 0.000 | 0.875 | 1.197 | 1.447 | 0.051 | 0.000 | 0.011 | 15.016 | n/a | n/a | 0.020 | 23.406 | 0.569 | 0.020 | node-14/thread-0/driver.publication | none observed |
| e8b48d1b06f030400000000000017681 | 36.209 | 9.314 | 0.000 | 0.000 | 0.062 | 2.836 | 1.293 | 0.035 | 0.000 | 0.011 | 22.633 | n/a | n/a | 0.025 | 9.376 | 0.259 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000177f9 | 34.436 | 6.279 | 0.000 | 0.000 | 0.398 | 5.172 | 1.354 | 0.075 | 0.000 | 0.009 | 21.050 | n/a | n/a | 0.098 | 6.677 | 0.194 | 0.098 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017b79 | 32.929 | 10.103 | 0.000 | 1.495 | 0.363 | 0.954 | 1.220 | 0.033 | 0.000 | 0.011 | 18.718 | n/a | n/a | 0.032 | 11.961 | 0.363 | 0.032 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017b0a | 27.242 | 9.649 | 0.000 | 0.000 | 0.834 | 0.938 | 1.323 | 0.044 | 0.000 | 0.021 | 14.412 | n/a | n/a | 0.021 | 10.483 | 0.385 | 0.021 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017be8 | 26.804 | 10.802 | 0.000 | 0.000 | 0.998 | 1.123 | 1.390 | 0.044 | 0.000 | 0.011 | 12.405 | n/a | n/a | 0.030 | 11.800 | 0.440 | 0.030 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001766b | 26.697 | 4.362 | 0.000 | 0.000 | 0.298 | 0.923 | 2.231 | 0.094 | 0.000 | 0.008 | 18.762 | n/a | n/a | 0.018 | 4.660 | 0.175 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017582 | 25.909 | 8.459 | 0.000 | 0.000 | 0.695 | 4.254 | 6.867 | 0.100 | 0.000 | 0.108 | 5.409 | n/a | n/a | 0.018 | 9.154 | 0.353 | 0.018 | gw-w/thread-83/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001797a | 25.604 | 10.922 | 0.000 | 0.000 | 1.091 | 2.169 | 1.452 | 0.053 | 0.000 | 0.011 | 9.891 | n/a | n/a | 0.015 | 12.013 | 0.469 | 0.015 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017964 | 24.823 | 7.485 | 0.000 | 0.000 | 1.105 | 6.125 | 0.922 | 0.041 | 0.000 | 0.008 | 9.117 | n/a | n/a | 0.020 | 8.590 | 0.346 | 0.020 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017a8c | 24.647 | 10.761 | 0.000 | 0.000 | 1.296 | 1.027 | 1.506 | 0.039 | 0.000 | 0.014 | 9.969 | n/a | n/a | 0.035 | 12.057 | 0.489 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001770d | 23.591 | 7.935 | 0.000 | 0.000 | 0.539 | 4.624 | 1.080 | 0.032 | 0.000 | 0.007 | 9.354 | n/a | n/a | 0.021 | 8.474 | 0.359 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017b2d | 22.842 | 5.236 | 0.000 | 0.000 | 0.039 | 3.245 | 1.702 | 0.070 | 0.000 | 0.013 | 12.517 | n/a | n/a | 0.020 | 5.275 | 0.231 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (94 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 40.291 | 22.904 | 0.000 | 0.000 | 0.068 | 0.935 | 1.018 | 0.029 | 0.000 | 0.007 | 6.201 | n/a | n/a | 0.020 | 24.649 | 0.555 | 0.020 |
| p99 | 319.328 | 278.140 | 0.000 | 25.505 | 58.786 | 131.661 | 15.037 | 0.164 | 19.783 | 0.140 | 307.925 | n/a | n/a | 0.424 | 278.204 | 1.000 | 0.424 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000017c6a | 319.328 | 8.947 | 0.000 | 0.000 | 0.177 | 0.981 | 1.234 | 0.037 | 0.000 | 0.010 | 307.925 | n/a | n/a | 0.019 | 9.124 | 0.029 | 0.019 | gw-w/thread-81/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017f5b | 278.234 | 278.140 | 0.000 | 0.000 | 0.064 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 278.204 | 1.000 | 0.030 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000017ce8 | 165.672 | 12.281 | 0.000 | 0.000 | 0.899 | 131.661 | 1.430 | 0.028 | 0.000 | 0.007 | 19.337 | n/a | n/a | 0.028 | 13.181 | 0.080 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| e8b48d1b06f030400000000000017c4d | 163.889 | 160.519 | 0.000 | 3.303 | 0.047 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 163.868 | 1.000 | 0.020 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000018134 | 158.281 | 9.031 | 0.000 | 0.000 | 1.531 | 4.157 | 1.631 | 0.064 | 0.000 | 0.012 | 141.833 | n/a | n/a | 0.021 | 10.562 | 0.067 | 0.021 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018140 | 145.133 | 13.800 | 0.000 | 0.000 | 0.691 | 24.415 | 1.079 | 0.038 | 0.000 | 0.010 | 105.080 | n/a | n/a | 0.021 | 14.491 | 0.100 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018048 | 114.521 | 11.484 | 0.000 | 0.000 | 58.786 | 1.323 | 2.777 | 0.135 | 0.000 | 0.027 | 39.961 | n/a | n/a | 0.028 | 70.269 | 0.614 | 0.028 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000001814c | 111.258 | 19.250 | 0.000 | 0.000 | 1.381 | 45.946 | 3.459 | 0.061 | 0.000 | 0.058 | 41.089 | n/a | n/a | 0.013 | 20.631 | 0.185 | 0.013 | node-14/thread-0/socket.wait-first-byte | none observed |
| e8b48d1b06f03040000000000001836c | 106.204 | 106.138 | 0.000 | 0.000 | 0.029 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.036 | 106.167 | 1.000 | 0.036 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000181b3 | 101.020 | 100.954 | 0.000 | 0.000 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.051 | 100.969 | 0.999 | 0.051 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001800d | 97.732 | 49.310 | 0.000 | 0.000 | 0.952 | 1.169 | 3.244 | 0.098 | 0.000 | 0.013 | 42.875 | n/a | n/a | 0.072 | 50.261 | 0.514 | 0.072 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017fa5 | 81.893 | 81.857 | 0.000 | 0.000 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 81.872 | 1.000 | 0.021 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000017c52 | 73.813 | 26.676 | 0.000 | 0.000 | 2.666 | 21.578 | 7.092 | 0.122 | 0.000 | 0.013 | 15.630 | n/a | n/a | 0.036 | 29.342 | 0.398 | 0.036 | node-14/thread-0/socket.wait-first-byte | none observed |
| e8b48d1b06f030400000000000017c8f | 72.696 | 15.362 | 0.000 | 0.000 | 0.086 | 1.192 | 4.014 | 0.164 | 0.000 | 0.024 | 51.817 | n/a | n/a | 0.037 | 15.448 | 0.213 | 0.037 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001802a | 72.195 | 33.596 | 0.000 | 0.000 | 2.944 | 8.711 | 1.770 | 0.036 | 0.000 | 0.013 | 25.100 | n/a | n/a | 0.025 | 36.540 | 0.506 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017cc3 | 68.702 | 68.605 | 0.000 | 0.000 | 0.068 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 68.673 | 1.000 | 0.029 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000017f33 | 65.558 | 19.301 | 0.000 | 0.000 | 0.189 | 9.646 | 1.806 | 0.043 | 0.000 | 0.007 | 34.548 | n/a | n/a | 0.018 | 19.490 | 0.297 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018322 | 65.012 | 64.986 | 0.000 | 0.000 | 0.013 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 64.999 | 1.000 | 0.013 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000181ba | 63.393 | 29.623 | 0.000 | 0.000 | 0.696 | 2.321 | 5.133 | 0.079 | 0.000 | 0.020 | 25.487 | n/a | n/a | 0.034 | 30.319 | 0.478 | 0.034 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018023 | 62.869 | 37.301 | 0.000 | 25.505 | 0.046 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 62.853 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |

## P2 / L1024 / commit / 5-10 facts (27 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.434 | 7.725 | 0.000 | 0.000 | 0.720 | 1.369 | 1.819 | 0.054 | 0.000 | 0.013 | 19.179 | n/a | n/a | 0.021 | 9.014 | 0.297 | 0.021 |
| p99 | 145.133 | 29.653 | 0.000 | 0.000 | 58.786 | 24.415 | 15.037 | 0.146 | 0.000 | 0.140 | 105.080 | n/a | n/a | 0.424 | 70.269 | 0.614 | 0.424 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000018140 | 145.133 | 13.800 | 0.000 | 0.000 | 0.691 | 24.415 | 1.079 | 0.038 | 0.000 | 0.010 | 105.080 | n/a | n/a | 0.021 | 14.491 | 0.100 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018048 | 114.521 | 11.484 | 0.000 | 0.000 | 58.786 | 1.323 | 2.777 | 0.135 | 0.000 | 0.027 | 39.961 | n/a | n/a | 0.028 | 70.269 | 0.614 | 0.028 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f030400000000000017f33 | 65.558 | 19.301 | 0.000 | 0.000 | 0.189 | 9.646 | 1.806 | 0.043 | 0.000 | 0.007 | 34.548 | n/a | n/a | 0.018 | 19.490 | 0.297 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017cce | 61.196 | 6.826 | 0.000 | 0.000 | 0.571 | 1.311 | 15.037 | 0.062 | 0.000 | 0.093 | 37.278 | n/a | n/a | 0.020 | 7.396 | 0.121 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018229 | 56.706 | 29.653 | 0.000 | 0.000 | 0.132 | 1.779 | 2.902 | 0.078 | 0.000 | 0.140 | 21.598 | n/a | n/a | 0.424 | 29.785 | 0.525 | 0.424 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017fac | 55.523 | 19.370 | 0.000 | 0.000 | 1.029 | 3.931 | 4.719 | 0.146 | 0.000 | 0.020 | 26.284 | n/a | n/a | 0.024 | 20.399 | 0.367 | 0.024 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017f6a | 55.261 | 5.114 | 0.000 | 0.000 | 0.946 | 1.020 | 1.946 | 0.045 | 0.000 | 0.007 | 46.154 | n/a | n/a | 0.028 | 6.060 | 0.110 | 0.028 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017f87 | 51.376 | 7.971 | 0.000 | 0.000 | 1.043 | 1.778 | 4.882 | 0.131 | 0.000 | 0.016 | 35.515 | n/a | n/a | 0.040 | 9.014 | 0.175 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000180d4 | 40.979 | 6.644 | 0.000 | 0.000 | 0.038 | 0.940 | 1.073 | 0.034 | 0.000 | 0.008 | 32.223 | n/a | n/a | 0.019 | 6.681 | 0.163 | 0.019 | gw-w/thread-83/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000181d0 | 40.919 | 14.298 | 0.000 | 0.000 | 1.772 | 3.588 | 2.000 | 0.054 | 0.000 | 0.009 | 19.179 | n/a | n/a | 0.020 | 16.070 | 0.393 | 0.020 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017dbc | 38.481 | 5.654 | 0.000 | 0.000 | 1.095 | 4.745 | 15.010 | 0.073 | 0.000 | 0.071 | 11.812 | n/a | n/a | 0.022 | 6.749 | 0.175 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017def | 37.712 | 14.533 | 0.000 | 0.000 | 0.066 | 1.261 | 1.756 | 0.054 | 0.000 | 0.011 | 20.005 | n/a | n/a | 0.026 | 14.599 | 0.387 | 0.026 | gw-w/thread-83/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017ee4 | 35.303 | 11.645 | 0.000 | 0.000 | 0.125 | 0.935 | 1.930 | 0.085 | 0.000 | 0.033 | 20.532 | n/a | n/a | 0.018 | 11.770 | 0.333 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017e05 | 33.434 | 6.321 | 0.000 | 0.000 | 2.128 | 1.002 | 1.051 | 0.032 | 0.000 | 0.007 | 22.860 | n/a | n/a | 0.031 | 8.450 | 0.253 | 0.031 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017ca5 | 31.519 | 6.383 | 0.000 | 0.000 | 0.327 | 0.952 | 3.099 | 0.061 | 0.000 | 0.008 | 20.677 | n/a | n/a | 0.012 | 6.710 | 0.213 | 0.012 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018329 | 30.224 | 8.036 | 0.000 | 0.000 | 0.824 | 0.936 | 2.041 | 0.063 | 0.000 | 0.014 | 18.285 | n/a | n/a | 0.023 | 8.860 | 0.293 | 0.023 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000180be | 27.608 | 10.201 | 0.000 | 0.000 | 4.932 | 1.035 | 1.622 | 0.052 | 0.000 | 0.010 | 9.733 | n/a | n/a | 0.023 | 15.132 | 0.548 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017d2f | 27.321 | 7.645 | 0.000 | 0.000 | 2.051 | 3.523 | 1.366 | 0.046 | 0.000 | 0.012 | 12.660 | n/a | n/a | 0.017 | 9.696 | 0.355 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017c2b | 26.880 | 8.857 | 0.000 | 0.000 | 2.924 | 1.369 | 1.424 | 0.045 | 0.000 | 0.013 | 12.231 | n/a | n/a | 0.018 | 11.781 | 0.438 | 0.018 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000017e92 | 25.444 | 6.182 | 0.000 | 0.000 | 0.160 | 1.021 | 1.480 | 0.050 | 0.000 | 0.013 | 16.521 | n/a | n/a | 0.017 | 6.342 | 0.249 | 0.017 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (140 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.924 | 21.366 | 0.000 | 0.000 | 0.296 | 0.942 | 1.140 | 0.033 | 0.000 | 0.008 | 7.805 | n/a | n/a | 0.020 | 22.863 | 0.524 | 0.020 |
| p99 | 486.874 | 137.016 | 0.000 | 8.381 | 11.721 | 36.006 | 16.807 | 0.215 | 21.044 | 0.125 | 416.627 | n/a | n/a | 0.400 | 145.419 | 1.000 | 0.400 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000018c53 | 519.177 | 26.444 | 0.000 | 0.000 | 2.260 | 6.096 | 1.819 | 0.058 | 0.000 | 0.055 | 482.396 | n/a | n/a | 0.051 | 28.704 | 0.055 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018c6b | 486.874 | 23.858 | 0.000 | 0.000 | 1.044 | 65.034 | 2.632 | 0.046 | 0.000 | 0.013 | 394.107 | n/a | n/a | 0.140 | 24.902 | 0.051 | 0.140 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.worker-message 4.356ms |
| e8b48d1b06f030400000000000018c5f | 476.243 | 54.508 | 0.000 | 0.000 | 0.562 | 33.728 | 3.510 | 0.111 | 0.000 | 0.016 | 383.758 | n/a | n/a | 0.051 | 55.071 | 0.116 | 0.051 | gw-w/thread-83/peer.transact-await (includes order/network/storage) | driver.worker-message 4.356ms |
| e8b48d1b06f030400000000000018c77 | 475.352 | 18.457 | 0.000 | 0.000 | 1.099 | 36.006 | 3.042 | 0.076 | 0.000 | 0.017 | 416.627 | n/a | n/a | 0.028 | 19.555 | 0.041 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.worker-message 4.356ms |
| e8b48d1b06f030400000000000018c83 | 333.825 | 317.509 | 0.000 | 15.799 | 0.398 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.119 | 333.706 | 1.000 | 0.119 | node-14/thread-0/driver.execute | driver.worker-message 4.356ms |
| e8b48d1b06f030400000000000018e76 | 145.439 | 137.016 | 0.000 | 8.381 | 0.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 145.419 | 1.000 | 0.019 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000018398 | 136.502 | 65.092 | 0.000 | 0.000 | 11.721 | 1.572 | 16.807 | 0.148 | 0.000 | 0.017 | 41.089 | n/a | n/a | 0.056 | 76.813 | 0.563 | 0.056 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018e67 | 122.855 | 122.802 | 0.000 | 0.000 | 0.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 122.833 | 1.000 | 0.022 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000018b41 | 120.464 | 120.422 | 0.000 | 0.000 | 0.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 120.444 | 1.000 | 0.020 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000185bf | 111.815 | 111.762 | 0.000 | 0.000 | 0.013 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.040 | 111.776 | 1.000 | 0.040 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000018870 | 106.316 | 106.235 | 0.000 | 0.000 | 0.027 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.055 | 106.261 | 0.999 | 0.055 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000018543 | 103.717 | 103.670 | 0.000 | 0.000 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 103.687 | 1.000 | 0.030 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000018775 | 101.134 | 100.960 | 0.000 | 0.000 | 0.121 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.054 | 101.081 | 0.999 | 0.054 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000018d13 | 96.086 | 96.048 | 0.000 | 0.000 | 0.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 96.072 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000183d3 | 93.990 | 21.791 | 0.000 | 0.000 | 1.072 | 7.303 | 17.324 | 0.125 | 35.125 | 0.060 | 11.141 | n/a | n/a | 0.049 | 22.863 | 0.243 | 0.049 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f0304000000000000188a4 | 90.267 | 26.600 | 0.000 | 0.000 | 2.852 | 11.229 | 12.019 | 0.181 | 0.000 | 0.125 | 37.243 | n/a | n/a | 0.017 | 29.452 | 0.326 | 0.017 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000183ac | 85.746 | 85.659 | 0.000 | 0.000 | 0.066 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 85.725 | 1.000 | 0.021 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000189c1 | 83.484 | 83.453 | 0.000 | 0.000 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 83.470 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000018977 | 76.737 | 76.298 | 0.000 | 0.000 | 0.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.400 | 76.337 | 0.995 | 0.400 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000018784 | 76.296 | 69.909 | 0.000 | 6.355 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 76.282 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |

## P2 / recovery / commit / 5-10 facts (42 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.266 | 8.412 | 0.000 | 0.000 | 0.765 | 1.591 | 1.615 | 0.050 | 0.000 | 0.012 | 12.384 | n/a | n/a | 0.023 | 9.569 | 0.320 | 0.023 |
| p99 | 519.177 | 26.600 | 0.000 | 0.000 | 5.595 | 16.189 | 13.683 | 0.231 | 21.044 | 0.125 | 482.396 | n/a | n/a | 0.105 | 29.452 | 0.652 | 0.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000018c53 | 519.177 | 26.444 | 0.000 | 0.000 | 2.260 | 6.096 | 1.819 | 0.058 | 0.000 | 0.055 | 482.396 | n/a | n/a | 0.051 | 28.704 | 0.055 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000188a4 | 90.267 | 26.600 | 0.000 | 0.000 | 2.852 | 11.229 | 12.019 | 0.181 | 0.000 | 0.125 | 37.243 | n/a | n/a | 0.017 | 29.452 | 0.326 | 0.017 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001893c | 60.885 | 12.251 | 0.000 | 0.000 | 0.454 | 1.120 | 2.549 | 0.079 | 0.000 | 0.011 | 44.380 | n/a | n/a | 0.042 | 12.705 | 0.209 | 0.042 | gw-w/thread-81/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001885a | 56.888 | 13.377 | 0.000 | 0.000 | 0.291 | 2.867 | 2.909 | 0.078 | 0.000 | 0.037 | 37.262 | n/a | n/a | 0.066 | 13.668 | 0.240 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018d29 | 54.688 | 15.499 | 0.000 | 0.000 | 0.875 | 6.127 | 1.243 | 0.028 | 0.000 | 0.008 | 30.867 | n/a | n/a | 0.041 | 16.373 | 0.299 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001865d | 52.925 | 16.337 | 0.000 | 0.000 | 0.617 | 4.173 | 13.683 | 0.090 | 0.000 | 0.040 | 17.879 | n/a | n/a | 0.105 | 16.955 | 0.320 | 0.105 | gw-w/thread-81/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018844 | 45.780 | 14.362 | 0.000 | 0.000 | 3.770 | 1.042 | 1.873 | 0.042 | 0.000 | 0.021 | 24.643 | n/a | n/a | 0.029 | 18.132 | 0.396 | 0.029 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001887f | 45.157 | 4.682 | 0.000 | 0.000 | 0.826 | 0.911 | 5.231 | 0.043 | 21.044 | 0.016 | 12.384 | n/a | n/a | 0.019 | 5.507 | 0.122 | 0.019 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f030400000000000018a81 | 43.477 | 14.238 | 0.000 | 0.000 | 2.078 | 5.355 | 3.097 | 0.089 | 0.000 | 0.010 | 18.578 | n/a | n/a | 0.032 | 16.316 | 0.375 | 0.032 | gw-w/thread-81/peer.transact-await (includes order/network/storage) | driver.worker-message 2.430ms |
| e8b48d1b06f030400000000000018724 | 39.026 | 7.379 | 0.000 | 0.000 | 0.854 | 1.160 | 5.022 | 0.047 | 18.129 | 0.007 | 6.405 | n/a | n/a | 0.023 | 8.234 | 0.211 | 0.023 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f030400000000000018dc4 | 37.924 | 6.418 | 0.000 | 0.000 | 0.460 | 16.189 | 1.403 | 0.057 | 0.000 | 0.019 | 13.354 | n/a | n/a | 0.023 | 6.878 | 0.181 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| e8b48d1b06f030400000000000018cd8 | 35.969 | 14.334 | 0.000 | 0.000 | 0.701 | 4.151 | 2.188 | 0.151 | 0.000 | 0.016 | 14.405 | n/a | n/a | 0.024 | 15.035 | 0.418 | 0.024 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018802 | 35.206 | 4.662 | 0.000 | 0.000 | 1.143 | 10.946 | 2.698 | 0.056 | 0.000 | 0.030 | 15.625 | n/a | n/a | 0.046 | 5.805 | 0.165 | 0.046 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001840e | 33.610 | 18.274 | 0.000 | 0.000 | 0.370 | 1.034 | 1.406 | 0.035 | 0.000 | 0.011 | 12.442 | n/a | n/a | 0.038 | 18.643 | 0.555 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018750 | 32.674 | 6.722 | 0.000 | 0.000 | 2.340 | 9.721 | 0.909 | 0.068 | 0.000 | 0.009 | 12.885 | n/a | n/a | 0.020 | 9.062 | 0.277 | 0.020 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018acb | 30.611 | 4.198 | 0.000 | 0.000 | 0.513 | 4.319 | 1.414 | 0.037 | 0.000 | 0.019 | 20.095 | n/a | n/a | 0.016 | 4.711 | 0.154 | 0.016 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018a04 | 29.952 | 6.287 | 0.000 | 0.000 | 0.280 | 4.315 | 1.537 | 0.038 | 0.000 | 0.020 | 17.458 | n/a | n/a | 0.016 | 6.567 | 0.219 | 0.016 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018647 | 29.586 | 9.845 | 0.000 | 0.000 | 0.503 | 7.538 | 0.875 | 0.030 | 0.000 | 0.007 | 10.765 | n/a | n/a | 0.023 | 10.347 | 0.350 | 0.023 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018d55 | 29.202 | 6.065 | 0.000 | 0.000 | 0.732 | 3.793 | 2.006 | 0.038 | 0.000 | 0.009 | 16.539 | n/a | n/a | 0.021 | 6.797 | 0.233 | 0.021 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000185f6 | 29.067 | 9.605 | 0.000 | 0.000 | 3.647 | 5.827 | 5.377 | 0.071 | 0.000 | 0.063 | 4.456 | n/a | n/a | 0.021 | 13.253 | 0.456 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |

## P4 / p4mix / commit (105 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.847 | 8.722 | 0.000 | 0.000 | 0.145 | 0.962 | 0.917 | 0.028 | 0.000 | 0.007 | 7.847 | n/a | n/a | 0.020 | 10.381 | 0.389 | 0.020 |
| p99 | 252.199 | 76.120 | 0.000 | 4.972 | 4.001 | 4.329 | 6.429 | 0.200 | 24.830 | 0.060 | 176.861 | n/a | n/a | 0.046 | 76.151 | 1.000 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000001949d | 310.014 | 305.017 | 0.000 | 4.972 | 0.014 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 310.003 | 1.000 | 0.011 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000194a2 | 252.199 | 6.519 | 0.000 | 0.000 | 4.001 | 1.294 | 3.250 | 0.050 | 0.000 | 0.011 | 237.057 | n/a | n/a | 0.016 | 10.521 | 0.042 | 0.016 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018f3f | 203.577 | 3.932 | 0.000 | 0.000 | 18.369 | 1.151 | 3.113 | 0.104 | 0.000 | 0.020 | 176.861 | n/a | n/a | 0.026 | 22.302 | 0.110 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000194b6 | 116.895 | 6.418 | 0.000 | 0.000 | 2.495 | 2.362 | 6.429 | 0.098 | 0.000 | 0.019 | 99.053 | n/a | n/a | 0.021 | 8.913 | 0.076 | 0.021 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001924e | 85.094 | 34.001 | 0.000 | 0.000 | 0.739 | 1.173 | 2.033 | 0.052 | 0.000 | 0.007 | 47.043 | n/a | n/a | 0.046 | 34.740 | 0.408 | 0.046 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019264 | 76.179 | 76.120 | 0.000 | 0.000 | 0.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 76.151 | 1.000 | 0.028 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000018eb2 | 63.354 | 63.281 | 0.000 | 0.000 | 0.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 63.323 | 1.000 | 0.030 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000018f21 | 56.209 | 8.722 | 0.000 | 0.000 | 0.697 | 1.034 | 5.682 | 0.069 | 27.050 | 0.011 | 12.927 | n/a | n/a | 0.018 | 9.419 | 0.168 | 0.018 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f0304000000000000192e9 | 53.342 | 53.277 | 0.000 | 0.000 | 0.043 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 53.320 | 1.000 | 0.021 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019033 | 48.002 | 47.956 | 0.000 | 0.000 | 0.030 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 47.986 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019273 | 44.864 | 14.352 | 0.000 | 0.000 | 0.865 | 1.148 | 9.926 | 0.071 | 0.000 | 0.030 | 18.454 | n/a | n/a | 0.017 | 15.217 | 0.339 | 0.017 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019676 | 44.783 | 3.597 | 0.000 | 0.000 | 0.699 | 0.971 | 5.173 | 0.029 | 24.830 | 0.012 | 9.453 | n/a | n/a | 0.019 | 4.296 | 0.096 | 0.019 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f0304000000000000191c2 | 44.610 | 7.239 | 0.000 | 0.000 | 0.921 | 1.106 | 1.060 | 0.036 | 0.000 | 0.008 | 34.197 | n/a | n/a | 0.044 | 8.160 | 0.183 | 0.044 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019513 | 43.401 | 43.346 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.036 | 43.366 | 0.999 | 0.036 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001919d | 41.821 | 6.817 | 0.000 | 0.000 | 0.677 | 1.156 | 1.244 | 0.043 | 0.000 | 0.012 | 31.844 | n/a | n/a | 0.027 | 7.494 | 0.179 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018e94 | 40.701 | 33.252 | 0.000 | 7.396 | 0.036 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 40.685 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000018efc | 39.319 | 11.109 | 0.000 | 2.044 | 0.506 | 1.775 | 5.535 | 0.065 | 0.000 | 0.007 | 18.251 | n/a | n/a | 0.027 | 13.659 | 0.347 | 0.027 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019058 | 39.003 | 38.962 | 0.000 | 0.000 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 38.980 | 0.999 | 0.023 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019349 | 38.987 | 38.909 | 0.000 | 0.000 | 0.045 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 38.954 | 0.999 | 0.032 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019522 | 35.990 | 35.956 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 35.975 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |

## P4 / p4mix / commit / 5-10 facts (33 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.219 | 4.789 | 0.000 | 0.000 | 0.575 | 1.096 | 1.245 | 0.036 | 0.000 | 0.011 | 11.814 | n/a | n/a | 0.022 | 5.277 | 0.252 | 0.022 |
| p99 | 203.577 | 34.001 | 0.000 | 0.000 | 18.369 | 4.329 | 5.331 | 0.200 | 24.830 | 0.060 | 176.861 | n/a | n/a | 0.046 | 34.740 | 0.423 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000018f3f | 203.577 | 3.932 | 0.000 | 0.000 | 18.369 | 1.151 | 3.113 | 0.104 | 0.000 | 0.020 | 176.861 | n/a | n/a | 0.026 | 22.302 | 0.110 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001924e | 85.094 | 34.001 | 0.000 | 0.000 | 0.739 | 1.173 | 2.033 | 0.052 | 0.000 | 0.007 | 47.043 | n/a | n/a | 0.046 | 34.740 | 0.408 | 0.046 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019676 | 44.783 | 3.597 | 0.000 | 0.000 | 0.699 | 0.971 | 5.173 | 0.029 | 24.830 | 0.012 | 9.453 | n/a | n/a | 0.019 | 4.296 | 0.096 | 0.019 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f0304000000000000191c2 | 44.610 | 7.239 | 0.000 | 0.000 | 0.921 | 1.106 | 1.060 | 0.036 | 0.000 | 0.008 | 34.197 | n/a | n/a | 0.044 | 8.160 | 0.183 | 0.044 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001919d | 41.821 | 6.817 | 0.000 | 0.000 | 0.677 | 1.156 | 1.244 | 0.043 | 0.000 | 0.012 | 31.844 | n/a | n/a | 0.027 | 7.494 | 0.179 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000190ae | 30.685 | 5.469 | 0.000 | 0.000 | 0.647 | 2.944 | 0.471 | 0.014 | 0.000 | 0.003 | 21.112 | n/a | n/a | 0.024 | 6.115 | 0.199 | 0.024 | gw-w/thread-83/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018f89 | 30.670 | 3.988 | 0.000 | 0.000 | 1.052 | 1.096 | 0.967 | 0.026 | 0.000 | 0.007 | 23.510 | n/a | n/a | 0.024 | 5.040 | 0.164 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000195f1 | 29.819 | 9.584 | 0.000 | 0.000 | 1.681 | 1.249 | 3.703 | 0.106 | 0.000 | 0.029 | 13.441 | n/a | n/a | 0.026 | 11.265 | 0.378 | 0.026 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000193d3 | 27.680 | 6.872 | 0.000 | 0.000 | 0.726 | 1.031 | 0.945 | 0.038 | 0.000 | 0.004 | 18.046 | n/a | n/a | 0.016 | 7.598 | 0.275 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000194fd | 24.849 | 6.796 | 0.000 | 0.000 | 1.034 | 1.062 | 1.564 | 0.038 | 0.000 | 0.012 | 14.325 | n/a | n/a | 0.018 | 7.830 | 0.315 | 0.018 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019471 | 24.774 | 5.482 | 0.000 | 0.000 | 0.575 | 1.081 | 0.835 | 0.026 | 0.000 | 0.007 | 16.752 | n/a | n/a | 0.015 | 6.058 | 0.245 | 0.015 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000193f3 | 24.375 | 4.196 | 0.000 | 0.000 | 0.507 | 1.914 | 5.331 | 0.069 | 0.000 | 0.023 | 12.329 | n/a | n/a | 0.006 | 4.703 | 0.193 | 0.006 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019324 | 22.674 | 5.031 | 0.000 | 0.000 | 0.246 | 1.064 | 3.111 | 0.200 | 0.000 | 0.014 | 12.990 | n/a | n/a | 0.018 | 5.277 | 0.233 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018ec1 | 22.657 | 7.485 | 0.000 | 0.000 | 0.207 | 1.067 | 1.208 | 0.034 | 0.000 | 0.012 | 12.623 | n/a | n/a | 0.022 | 7.691 | 0.339 | 0.022 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000192f8 | 21.932 | 3.947 | 0.000 | 0.000 | 0.114 | 4.329 | 1.481 | 0.047 | 0.000 | 0.013 | 11.983 | n/a | n/a | 0.017 | 4.061 | 0.185 | 0.017 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000018ff8 | 20.935 | 3.197 | 0.000 | 0.000 | 0.424 | 1.448 | 1.438 | 0.046 | 0.000 | 0.011 | 14.345 | n/a | n/a | 0.026 | 3.621 | 0.173 | 0.026 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000194d8 | 20.219 | 5.323 | 0.000 | 0.000 | 0.029 | 1.069 | 1.855 | 0.079 | 0.000 | 0.022 | 11.814 | n/a | n/a | 0.028 | 5.351 | 0.265 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001937d | 19.949 | 5.267 | 0.000 | 0.000 | 1.032 | 1.053 | 1.927 | 0.062 | 0.000 | 0.021 | 10.563 | n/a | n/a | 0.023 | 6.299 | 0.316 | 0.023 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019547 | 19.714 | 5.851 | 0.000 | 0.000 | 1.063 | 1.347 | 2.050 | 0.086 | 0.000 | 0.018 | 9.279 | n/a | n/a | 0.022 | 6.914 | 0.351 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001941d | 19.571 | 4.789 | 0.000 | 0.000 | 0.135 | 1.220 | 1.324 | 0.063 | 0.000 | 0.012 | 12.001 | n/a | n/a | 0.028 | 4.924 | 0.252 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (96 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.034 | 18.699 | 0.000 | 0.000 | 0.184 | 0.942 | 0.879 | 0.023 | 0.000 | 0.006 | 6.458 | n/a | n/a | 0.022 | 18.724 | 0.414 | 0.022 |
| p99 | 332.203 | 331.941 | 0.000 | 3.033 | 6.311 | 4.934 | 10.088 | 0.137 | 20.477 | 2.940 | 41.920 | n/a | n/a | 0.087 | 332.148 | 1.000 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000019b0e | 332.203 | 331.941 | 0.000 | 0.000 | 0.207 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.055 | 332.148 | 1.000 | 0.055 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019b51 | 250.610 | 250.574 | 0.000 | 0.000 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 250.594 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019b1d | 135.246 | 135.088 | 0.000 | 0.000 | 0.083 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.074 | 135.171 | 0.999 | 0.074 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019842 | 120.479 | 120.342 | 0.000 | 0.000 | 0.106 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 120.448 | 1.000 | 0.031 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000197b5 | 80.233 | 80.077 | 0.000 | 0.000 | 0.087 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.068 | 80.164 | 0.999 | 0.068 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000197f8 | 70.958 | 67.835 | 0.000 | 3.033 | 0.048 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.042 | 70.916 | 0.999 | 0.042 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019b3b | 70.218 | 29.186 | 0.000 | 0.000 | 0.344 | 2.184 | 2.400 | 0.030 | 0.000 | 0.015 | 36.026 | n/a | n/a | 0.032 | 29.531 | 0.421 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000199d8 | 69.651 | 19.698 | 0.000 | 0.000 | 0.897 | 1.881 | 5.127 | 0.063 | 0.000 | 0.033 | 41.920 | n/a | n/a | 0.032 | 20.595 | 0.296 | 0.032 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019876 | 54.856 | 54.816 | 0.000 | 0.000 | 0.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 54.839 | 1.000 | 0.018 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019ad3 | 52.312 | 52.281 | 0.000 | 0.000 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 52.298 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019b76 | 52.070 | 51.543 | 0.000 | 0.000 | 0.487 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.040 | 52.030 | 0.999 | 0.040 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019cc3 | 51.683 | 21.196 | 0.000 | 0.000 | 0.149 | 3.932 | 2.969 | 0.085 | 0.000 | 0.014 | 23.313 | n/a | n/a | 0.024 | 21.345 | 0.413 | 0.024 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019a5d | 51.209 | 24.855 | 0.000 | 0.000 | 0.696 | 4.565 | 3.958 | 0.089 | 0.000 | 0.008 | 16.972 | n/a | n/a | 0.065 | 25.551 | 0.499 | 0.065 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019de3 | 50.635 | 50.568 | 0.000 | 0.000 | 0.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 50.607 | 0.999 | 0.028 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000199fd | 49.213 | 49.172 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 49.191 | 1.000 | 0.022 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f0304000000000000199e4 | 46.740 | 46.700 | 0.000 | 0.000 | 0.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 46.723 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019953 | 46.735 | 5.578 | 0.000 | 0.000 | 0.958 | 4.108 | 10.088 | 0.083 | 20.477 | 0.057 | 5.360 | n/a | n/a | 0.026 | 6.536 | 0.140 | 0.026 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f0304000000000000197fd | 41.661 | 11.240 | 0.000 | 0.000 | 1.133 | 1.240 | 2.690 | 0.050 | 0.000 | 0.016 | 25.267 | n/a | n/a | 0.024 | 12.373 | 0.297 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000196ed | 41.296 | 41.238 | 0.000 | 0.000 | 0.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 41.278 | 1.000 | 0.018 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019af8 | 40.732 | 9.186 | 0.000 | 0.000 | 0.146 | 1.217 | 5.299 | 0.069 | 0.000 | 2.940 | 21.847 | n/a | n/a | 0.028 | 9.332 | 0.229 | 0.028 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit / 5-10 facts (33 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.313 | 4.763 | 0.000 | 0.000 | 0.696 | 1.030 | 1.474 | 0.042 | 0.000 | 0.011 | 11.132 | n/a | n/a | 0.023 | 5.602 | 0.259 | 0.023 |
| p99 | 51.209 | 24.855 | 0.000 | 0.000 | 6.311 | 4.934 | 10.088 | 0.137 | 20.477 | 2.940 | 24.438 | n/a | n/a | 0.087 | 25.551 | 0.499 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000019a5d | 51.209 | 24.855 | 0.000 | 0.000 | 0.696 | 4.565 | 3.958 | 0.089 | 0.000 | 0.008 | 16.972 | n/a | n/a | 0.065 | 25.551 | 0.499 | 0.065 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019953 | 46.735 | 5.578 | 0.000 | 0.000 | 0.958 | 4.108 | 10.088 | 0.083 | 20.477 | 0.057 | 5.360 | n/a | n/a | 0.026 | 6.536 | 0.140 | 0.026 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f030400000000000019af8 | 40.732 | 9.186 | 0.000 | 0.000 | 0.146 | 1.217 | 5.299 | 0.069 | 0.000 | 2.940 | 21.847 | n/a | n/a | 0.028 | 9.332 | 0.229 | 0.028 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019a31 | 36.969 | 12.391 | 0.000 | 0.000 | 1.298 | 3.688 | 1.408 | 0.030 | 0.000 | 0.008 | 18.059 | n/a | n/a | 0.087 | 13.689 | 0.370 | 0.087 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019c54 | 36.603 | 4.763 | 0.000 | 0.000 | 0.431 | 1.073 | 5.842 | 0.069 | 17.929 | 0.011 | 6.458 | n/a | n/a | 0.027 | 5.194 | 0.142 | 0.027 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f0304000000000000196d7 | 35.497 | 4.370 | 0.000 | 0.000 | 0.312 | 0.942 | 7.745 | 0.122 | 0.000 | 0.016 | 21.969 | n/a | n/a | 0.022 | 4.682 | 0.132 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000196f4 | 33.414 | 6.658 | 0.000 | 0.000 | 0.659 | 1.137 | 2.863 | 0.078 | 0.000 | 0.016 | 21.964 | n/a | n/a | 0.039 | 7.317 | 0.219 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019d7c | 32.690 | 4.390 | 0.000 | 0.000 | 0.220 | 0.976 | 2.510 | 0.115 | 0.000 | 0.021 | 24.438 | n/a | n/a | 0.020 | 4.610 | 0.141 | 0.020 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019860 | 31.662 | 5.541 | 0.000 | 0.000 | 0.902 | 1.030 | 1.061 | 0.025 | 0.000 | 0.007 | 23.066 | n/a | n/a | 0.030 | 6.443 | 0.203 | 0.030 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019ce8 | 29.492 | 6.974 | 0.000 | 0.000 | 6.311 | 1.328 | 3.119 | 0.118 | 0.000 | 0.030 | 11.531 | n/a | n/a | 0.080 | 13.285 | 0.450 | 0.080 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019737 | 25.658 | 4.296 | 0.000 | 0.000 | 0.972 | 0.964 | 2.257 | 0.075 | 0.000 | 0.012 | 17.053 | n/a | n/a | 0.028 | 5.268 | 0.205 | 0.028 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000198c0 | 25.482 | 9.392 | 0.000 | 0.000 | 1.169 | 1.006 | 2.357 | 0.053 | 0.000 | 0.015 | 11.450 | n/a | n/a | 0.041 | 10.561 | 0.414 | 0.041 | gw-w/thread-81/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001988a | 25.096 | 3.592 | 0.000 | 0.000 | 1.077 | 3.272 | 1.333 | 0.034 | 0.000 | 0.008 | 15.763 | n/a | n/a | 0.016 | 4.669 | 0.186 | 0.016 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019721 | 23.937 | 4.148 | 0.000 | 0.000 | 0.781 | 1.726 | 3.190 | 0.042 | 0.000 | 0.012 | 13.997 | n/a | n/a | 0.040 | 4.929 | 0.206 | 0.040 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019a9f | 23.276 | 5.839 | 0.000 | 0.000 | 0.627 | 1.040 | 1.197 | 0.039 | 0.000 | 0.011 | 14.492 | n/a | n/a | 0.031 | 6.466 | 0.278 | 0.031 | gw-w/thread-83/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019987 | 22.231 | 3.207 | 0.000 | 0.000 | 0.972 | 0.960 | 1.234 | 0.030 | 0.000 | 0.008 | 15.793 | n/a | n/a | 0.027 | 4.179 | 0.188 | 0.027 | gw-w/thread-83/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001982c | 20.313 | 5.857 | 0.000 | 0.000 | 1.100 | 1.030 | 1.132 | 0.028 | 0.000 | 0.011 | 11.132 | n/a | n/a | 0.023 | 6.957 | 0.343 | 0.023 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019936 | 20.205 | 6.317 | 0.000 | 0.000 | 0.456 | 1.240 | 1.407 | 0.050 | 0.000 | 0.007 | 10.666 | n/a | n/a | 0.062 | 6.773 | 0.335 | 0.062 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019bde | 19.285 | 3.919 | 0.000 | 0.000 | 0.584 | 4.934 | 0.853 | 0.026 | 0.000 | 0.007 | 8.943 | n/a | n/a | 0.018 | 4.504 | 0.234 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f0304000000000000198d6 | 18.548 | 3.063 | 0.000 | 0.000 | 0.099 | 1.385 | 1.913 | 0.137 | 0.000 | 0.016 | 11.914 | n/a | n/a | 0.020 | 3.163 | 0.171 | 0.020 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (34 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 128.074 | 27.894 | 0.000 | 0.000 | 0.286 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 38.704 | 0.999 | 0.024 |
| p99 | 507.031 | 420.661 | 0.000 | 26.101 | 72.169 | 70.645 | 8.293 | 14.712 | 0.510 | 0.019 | 258.323 | n/a | n/a | 0.082 | 507.005 | 1.000 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000019f6b | 507.031 | 408.935 | 0.000 | 26.101 | 71.969 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 507.005 | 1.000 | 0.026 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f030400000000000019fa3 | 420.708 | 420.661 | 0.000 | 0.000 | 0.030 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 420.690 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019f77 | 395.565 | 336.622 | 0.000 | 26.101 | 32.812 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 395.534 | 1.000 | 0.031 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000001a020 | 309.000 | 298.009 | 0.000 | 10.938 | 0.029 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 308.976 | 1.000 | 0.023 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019ecb | 299.355 | 296.513 | 0.000 | 2.787 | 0.030 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 299.330 | 1.000 | 0.024 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019e33 | 275.750 | 6.318 | 0.000 | 0.000 | 0.814 | 70.645 | 8.293 | 0.060 | 0.510 | 0.000 | 189.091 | n/a | n/a | 0.019 | 7.133 | 0.026 | 0.019 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a03b | 270.728 | 8.856 | 0.000 | 0.000 | 0.650 | 1.087 | 1.723 | 0.065 | 0.000 | 0.007 | 258.323 | n/a | n/a | 0.016 | 9.507 | 0.035 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019f7f | 256.951 | 199.270 | 0.000 | 26.101 | 31.562 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 256.933 | 1.000 | 0.018 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f030400000000000019eea | 188.802 | 175.439 | 0.000 | 13.279 | 0.060 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 188.777 | 1.000 | 0.025 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019f97 | 186.861 | 5.432 | 0.000 | 0.000 | 72.169 | 12.198 | 1.251 | 14.712 | 0.000 | 0.012 | 81.040 | n/a | n/a | 0.047 | 77.601 | 0.415 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a157 | 184.152 | 178.318 | 0.000 | 5.802 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 184.135 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f030400000000000019fe2 | 178.616 | 8.497 | 0.000 | 0.000 | 0.206 | 20.811 | 1.442 | 0.027 | 0.000 | 0.010 | 147.595 | n/a | n/a | 0.027 | 8.703 | 0.049 | 0.027 | gw-w/thread-81/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019f46 | 153.511 | 153.458 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 153.483 | 1.000 | 0.028 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001a15c | 151.808 | 3.262 | 0.000 | 0.000 | 0.101 | 22.219 | 0.946 | 0.027 | 0.000 | 0.007 | 125.225 | n/a | n/a | 0.019 | 3.364 | 0.022 | 0.019 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a055 | 148.159 | 4.197 | 0.000 | 0.000 | 0.088 | 4.802 | 1.012 | 0.028 | 0.000 | 0.007 | 138.005 | n/a | n/a | 0.022 | 4.284 | 0.029 | 0.022 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a10b | 141.049 | 101.506 | 0.000 | 6.066 | 33.395 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.082 | 140.967 | 0.999 | 0.082 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f030400000000000019f4d | 137.496 | 21.188 | 0.000 | 0.000 | 29.212 | 30.567 | 2.125 | 0.053 | 0.000 | 0.019 | 54.260 | n/a | n/a | 0.074 | 50.400 | 0.367 | 0.074 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019e60 | 128.074 | 6.083 | 0.000 | 0.000 | 21.459 | 1.088 | 1.635 | 0.065 | 0.000 | 0.011 | 97.708 | n/a | n/a | 0.024 | 27.542 | 0.215 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a1d1 | 122.537 | 2.844 | 0.000 | 0.000 | 0.286 | 18.723 | 4.656 | 0.075 | 0.000 | 0.004 | 95.934 | n/a | n/a | 0.015 | 3.129 | 0.026 | 0.015 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a184 | 106.998 | 3.348 | 0.000 | 0.000 | 0.482 | 20.555 | 1.045 | 0.025 | 0.000 | 0.008 | 81.516 | n/a | n/a | 0.018 | 3.830 | 0.036 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (12 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 128.074 | 8.216 | 0.000 | 0.000 | 6.417 | 1.088 | 1.012 | 0.028 | 0.000 | 0.007 | 15.730 | n/a | n/a | 0.029 | 27.542 | 0.358 | 0.029 |
| p99 | 395.565 | 336.622 | 0.000 | 26.101 | 72.169 | 30.567 | 6.024 | 14.712 | 0.000 | 0.019 | 138.005 | n/a | n/a | 0.082 | 395.534 | 1.000 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f030400000000000019f77 | 395.565 | 336.622 | 0.000 | 26.101 | 32.812 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 395.534 | 1.000 | 0.031 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f030400000000000019f7f | 256.951 | 199.270 | 0.000 | 26.101 | 31.562 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 256.933 | 1.000 | 0.018 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f030400000000000019f97 | 186.861 | 5.432 | 0.000 | 0.000 | 72.169 | 12.198 | 1.251 | 14.712 | 0.000 | 0.012 | 81.040 | n/a | n/a | 0.047 | 77.601 | 0.415 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a055 | 148.159 | 4.197 | 0.000 | 0.000 | 0.088 | 4.802 | 1.012 | 0.028 | 0.000 | 0.007 | 138.005 | n/a | n/a | 0.022 | 4.284 | 0.029 | 0.022 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a10b | 141.049 | 101.506 | 0.000 | 6.066 | 33.395 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.082 | 140.967 | 0.999 | 0.082 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f030400000000000019f4d | 137.496 | 21.188 | 0.000 | 0.000 | 29.212 | 30.567 | 2.125 | 0.053 | 0.000 | 0.019 | 54.260 | n/a | n/a | 0.074 | 50.400 | 0.367 | 0.074 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019e60 | 128.074 | 6.083 | 0.000 | 0.000 | 21.459 | 1.088 | 1.635 | 0.065 | 0.000 | 0.011 | 97.708 | n/a | n/a | 0.024 | 27.542 | 0.215 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a0d0 | 79.857 | 70.805 | 0.000 | 3.161 | 5.833 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.058 | 79.799 | 0.999 | 0.058 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f030400000000000019f30 | 43.417 | 8.216 | 0.000 | 0.000 | 0.353 | 12.367 | 1.489 | 0.132 | 0.000 | 0.007 | 20.814 | n/a | n/a | 0.039 | 8.569 | 0.197 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a073 | 35.035 | 5.176 | 0.000 | 0.000 | 6.417 | 1.611 | 6.024 | 0.051 | 0.000 | 0.012 | 15.730 | n/a | n/a | 0.013 | 11.593 | 0.331 | 0.013 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a025 | 27.249 | 5.854 | 0.000 | 0.000 | 0.918 | 2.341 | 0.878 | 0.026 | 0.000 | 0.007 | 17.196 | n/a | n/a | 0.029 | 6.772 | 0.249 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f030400000000000019e0d | 25.131 | 8.545 | 0.000 | 0.000 | 0.458 | 1.056 | 1.203 | 0.036 | 0.000 | 0.010 | 13.797 | n/a | n/a | 0.026 | 9.003 | 0.358 | 0.026 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (92 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.180 | 22.578 | 0.000 | 0.000 | 0.061 | 0.941 | 0.884 | 0.022 | 0.000 | 0.005 | 4.741 | n/a | n/a | 0.022 | 22.606 | 0.716 | 0.022 |
| p99 | 204.324 | 204.061 | 0.000 | 2.337 | 7.584 | 11.167 | 17.364 | 0.325 | 0.000 | 0.076 | 73.513 | n/a | n/a | 0.091 | 204.234 | 1.000 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000001a890 | 204.324 | 204.061 | 0.000 | 0.000 | 0.173 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.091 | 204.234 | 1.000 | 0.091 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001a60d | 192.975 | 92.815 | 0.000 | 0.000 | 7.584 | 1.751 | 17.143 | 0.091 | 0.000 | 0.037 | 73.513 | n/a | n/a | 0.040 | 100.399 | 0.520 | 0.040 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a460 | 127.665 | 127.633 | 0.000 | 0.000 | 0.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 127.648 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001a897 | 125.002 | 56.666 | 0.000 | 0.000 | 0.695 | 3.416 | 17.364 | 0.093 | 0.000 | 0.073 | 46.656 | n/a | n/a | 0.038 | 57.362 | 0.459 | 0.038 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a872 | 99.879 | 84.108 | 0.000 | 0.000 | 0.835 | 1.335 | 1.655 | 0.033 | 0.000 | 0.011 | 11.877 | n/a | n/a | 0.024 | 84.944 | 0.850 | 0.024 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000001a416 | 91.507 | 89.134 | 0.000 | 2.337 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 91.489 | 1.000 | 0.018 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001a7ba | 76.116 | 76.070 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 76.096 | 1.000 | 0.020 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001a67c | 74.412 | 18.791 | 0.000 | 0.000 | 2.902 | 1.092 | 10.542 | 0.055 | 0.000 | 0.024 | 40.953 | n/a | n/a | 0.052 | 21.693 | 0.292 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a5a5 | 67.526 | 13.531 | 0.000 | 0.000 | 0.496 | 11.167 | 3.896 | 0.265 | 0.000 | 0.032 | 38.051 | n/a | n/a | 0.088 | 14.026 | 0.208 | 0.088 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a5d2 | 58.655 | 58.627 | 0.000 | 0.000 | 0.013 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 58.640 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001a296 | 56.945 | 56.903 | 0.000 | 0.000 | 0.027 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 56.930 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001a2f6 | 55.295 | 11.846 | 0.000 | 0.000 | 1.051 | 1.179 | 5.779 | 0.325 | 0.000 | 0.012 | 35.041 | n/a | n/a | 0.062 | 12.897 | 0.233 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a786 | 54.071 | 37.871 | 0.000 | 0.000 | 0.867 | 1.104 | 1.860 | 0.026 | 0.000 | 0.008 | 12.309 | n/a | n/a | 0.026 | 38.738 | 0.716 | 0.026 | node-14/thread-0/driver.publication | none observed |
| e8b48d1b06f03040000000000001a62b | 49.294 | 49.248 | 0.000 | 0.000 | 0.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 49.265 | 0.999 | 0.029 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001a59e | 47.870 | 47.806 | 0.000 | 0.000 | 0.045 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 47.851 | 1.000 | 0.019 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001a8e2 | 46.273 | 46.195 | 0.000 | 0.000 | 0.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.036 | 46.237 | 0.999 | 0.036 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001a6b0 | 46.011 | 45.962 | 0.000 | 0.000 | 0.030 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 45.992 | 1.000 | 0.019 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001a262 | 41.744 | 41.574 | 0.000 | 0.000 | 0.117 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.052 | 41.692 | 0.999 | 0.052 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001a494 | 39.929 | 7.570 | 0.000 | 0.000 | 0.663 | 0.968 | 2.318 | 0.065 | 0.000 | 0.028 | 28.285 | n/a | n/a | 0.032 | 8.233 | 0.206 | 0.032 | gw-w/thread-81/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a72e | 39.892 | 39.837 | 0.000 | 0.000 | 0.027 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 39.864 | 0.999 | 0.028 | node-14/thread-0/driver.execute | none observed |

## P4 / p4h3 / commit / 5-10 facts (30 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.711 | 5.044 | 0.000 | 0.000 | 0.723 | 1.026 | 1.356 | 0.046 | 0.000 | 0.011 | 13.590 | n/a | n/a | 0.027 | 5.796 | 0.250 | 0.027 |
| p99 | 192.975 | 92.815 | 0.000 | 0.000 | 7.584 | 11.167 | 17.143 | 0.325 | 0.000 | 0.062 | 73.513 | n/a | n/a | 0.088 | 100.399 | 0.520 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000001a60d | 192.975 | 92.815 | 0.000 | 0.000 | 7.584 | 1.751 | 17.143 | 0.091 | 0.000 | 0.037 | 73.513 | n/a | n/a | 0.040 | 100.399 | 0.520 | 0.040 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a67c | 74.412 | 18.791 | 0.000 | 0.000 | 2.902 | 1.092 | 10.542 | 0.055 | 0.000 | 0.024 | 40.953 | n/a | n/a | 0.052 | 21.693 | 0.292 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a5a5 | 67.526 | 13.531 | 0.000 | 0.000 | 0.496 | 11.167 | 3.896 | 0.265 | 0.000 | 0.032 | 38.051 | n/a | n/a | 0.088 | 14.026 | 0.208 | 0.088 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a2f6 | 55.295 | 11.846 | 0.000 | 0.000 | 1.051 | 1.179 | 5.779 | 0.325 | 0.000 | 0.012 | 35.041 | n/a | n/a | 0.062 | 12.897 | 0.233 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a5e1 | 32.513 | 5.310 | 0.000 | 0.000 | 0.931 | 1.048 | 1.416 | 0.036 | 0.000 | 0.009 | 23.710 | n/a | n/a | 0.052 | 6.241 | 0.192 | 0.052 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a467 | 32.199 | 5.253 | 0.000 | 0.000 | 0.120 | 1.019 | 1.323 | 0.041 | 0.000 | 0.017 | 24.394 | n/a | n/a | 0.032 | 5.373 | 0.167 | 0.032 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a8e9 | 31.769 | 13.378 | 0.000 | 0.000 | 0.323 | 1.315 | 1.395 | 0.046 | 0.000 | 0.007 | 15.267 | n/a | n/a | 0.039 | 13.701 | 0.431 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a69a | 30.933 | 3.922 | 0.000 | 0.000 | 0.723 | 0.993 | 1.001 | 0.023 | 0.000 | 0.005 | 24.238 | n/a | n/a | 0.028 | 4.645 | 0.150 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a2bb | 30.668 | 4.606 | 0.000 | 0.000 | 3.050 | 4.198 | 9.306 | 0.084 | 0.000 | 0.062 | 9.339 | n/a | n/a | 0.023 | 7.656 | 0.250 | 0.023 | gw-w/thread-81/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a924 | 26.905 | 7.841 | 0.000 | 0.000 | 1.287 | 1.702 | 2.375 | 0.079 | 0.000 | 0.010 | 13.590 | n/a | n/a | 0.022 | 9.127 | 0.339 | 0.022 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a579 | 25.510 | 4.782 | 0.000 | 0.000 | 1.065 | 1.095 | 1.088 | 0.035 | 0.000 | 0.011 | 17.404 | n/a | n/a | 0.028 | 5.847 | 0.229 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a520 | 24.707 | 5.375 | 0.000 | 0.000 | 0.061 | 0.956 | 1.508 | 0.050 | 0.000 | 0.010 | 16.720 | n/a | n/a | 0.027 | 5.436 | 0.220 | 0.027 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a280 | 23.840 | 5.882 | 0.000 | 0.000 | 1.033 | 0.947 | 1.703 | 0.081 | 0.000 | 0.010 | 14.161 | n/a | n/a | 0.024 | 6.915 | 0.290 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a735 | 23.776 | 4.440 | 0.000 | 0.000 | 0.616 | 1.079 | 2.178 | 0.050 | 0.000 | 0.016 | 15.380 | n/a | n/a | 0.016 | 5.057 | 0.213 | 0.016 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a907 | 23.598 | 4.136 | 0.000 | 0.000 | 0.650 | 1.101 | 1.770 | 0.073 | 0.000 | 0.012 | 15.837 | n/a | n/a | 0.018 | 4.786 | 0.203 | 0.018 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a6c6 | 20.711 | 5.044 | 0.000 | 0.000 | 0.752 | 3.446 | 6.127 | 0.046 | 0.000 | 0.051 | 5.208 | n/a | n/a | 0.039 | 5.796 | 0.280 | 0.039 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a313 | 20.687 | 3.307 | 0.000 | 0.000 | 0.257 | 0.969 | 0.884 | 0.025 | 0.000 | 0.006 | 15.223 | n/a | n/a | 0.017 | 3.563 | 0.172 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a373 | 20.664 | 6.462 | 0.000 | 0.000 | 0.865 | 0.968 | 1.196 | 0.032 | 0.000 | 0.010 | 11.104 | n/a | n/a | 0.027 | 7.327 | 0.355 | 0.027 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a29d | 20.657 | 3.499 | 0.000 | 0.000 | 1.075 | 0.969 | 1.356 | 0.046 | 0.000 | 0.011 | 13.681 | n/a | n/a | 0.019 | 4.574 | 0.221 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a34e | 20.083 | 5.320 | 0.000 | 0.000 | 0.805 | 0.950 | 1.120 | 0.030 | 0.000 | 0.007 | 11.814 | n/a | n/a | 0.037 | 6.125 | 0.305 | 0.037 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (44 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.719 | 26.593 | 0.000 | 0.000 | 0.398 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 37.462 | 0.997 | 0.019 |
| p99 | 392.213 | 334.932 | 0.000 | 10.450 | 31.062 | 76.847 | 8.747 | 0.088 | 0.000 | 0.039 | 307.240 | n/a | n/a | 0.202 | 337.964 | 1.000 | 0.202 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000001a94d | 392.213 | 5.108 | 0.000 | 0.000 | 0.751 | 76.847 | 2.167 | 0.052 | 0.000 | 0.011 | 307.240 | n/a | n/a | 0.037 | 5.860 | 0.015 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001ae44 | 337.992 | 334.932 | 0.000 | 2.971 | 0.061 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 337.964 | 1.000 | 0.028 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001aa04 | 321.721 | 4.126 | 0.000 | 0.000 | 0.634 | 23.184 | 2.412 | 0.086 | 0.000 | 0.011 | 291.250 | n/a | n/a | 0.018 | 4.760 | 0.015 | 0.018 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a9f5 | 319.212 | 312.398 | 0.000 | 6.777 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 319.196 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001a99a | 261.418 | 5.411 | 0.000 | 0.000 | 0.398 | 31.570 | 1.070 | 0.024 | 0.000 | 0.007 | 222.905 | n/a | n/a | 0.034 | 5.809 | 0.022 | 0.034 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001af53 | 257.111 | 5.829 | 0.000 | 0.000 | 1.062 | 26.895 | 1.491 | 0.059 | 0.000 | 0.007 | 221.731 | n/a | n/a | 0.038 | 6.891 | 0.027 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001aa2a | 201.718 | 197.945 | 0.000 | 3.745 | 0.013 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 201.703 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001af35 | 200.178 | 4.186 | 0.000 | 0.000 | 1.033 | 19.355 | 1.575 | 0.053 | 0.000 | 0.007 | 173.946 | n/a | n/a | 0.023 | 5.219 | 0.026 | 0.023 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a9a6 | 186.491 | 183.359 | 0.000 | 3.099 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 186.477 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001abce | 181.494 | 179.051 | 0.000 | 2.196 | 0.045 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.202 | 181.292 | 0.999 | 0.202 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001a9bf | 177.720 | 3.948 | 0.000 | 0.000 | 0.852 | 29.819 | 1.282 | 0.062 | 0.000 | 0.013 | 141.724 | n/a | n/a | 0.019 | 4.800 | 0.027 | 0.019 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001acf5 | 157.671 | 155.429 | 0.000 | 2.218 | 0.013 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 157.660 | 1.000 | 0.011 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001ac32 | 150.706 | 2.501 | 0.000 | 0.000 | 0.969 | 25.318 | 1.438 | 0.025 | 0.000 | 0.013 | 120.426 | n/a | n/a | 0.015 | 3.470 | 0.023 | 0.015 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001ab07 | 147.730 | 5.281 | 0.000 | 0.000 | 0.962 | 19.486 | 1.456 | 0.041 | 0.000 | 0.010 | 120.470 | n/a | n/a | 0.024 | 6.243 | 0.042 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001aaf8 | 141.605 | 138.369 | 0.000 | 3.199 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 141.588 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001ab31 | 123.730 | 12.279 | 0.000 | 0.000 | 31.062 | 37.551 | 2.761 | 0.073 | 0.000 | 0.009 | 39.973 | n/a | n/a | 0.021 | 43.341 | 0.350 | 0.021 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001abfd | 111.258 | 109.054 | 0.000 | 2.179 | 0.013 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 111.247 | 1.000 | 0.012 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001ae16 | 109.212 | 6.288 | 0.000 | 0.000 | 0.596 | 28.802 | 4.928 | 0.025 | 0.000 | 0.006 | 68.543 | n/a | n/a | 0.024 | 6.884 | 0.063 | 0.024 | gw-w/thread-81/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001ac02 | 103.242 | 4.682 | 0.000 | 0.000 | 0.801 | 10.006 | 1.023 | 0.015 | 0.000 | 0.005 | 86.695 | n/a | n/a | 0.015 | 5.483 | 0.053 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001acbe | 96.150 | 92.513 | 0.000 | 3.597 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 96.136 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |

## P2 / grow10 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 83.779 | 4.186 | 0.000 | 0.000 | 0.892 | 19.355 | 1.282 | 0.041 | 0.000 | 0.007 | 39.973 | n/a | n/a | 0.020 | 5.219 | 0.042 | 0.020 |
| p99 | 392.213 | 81.793 | 0.000 | 4.710 | 31.062 | 76.847 | 8.747 | 0.088 | 0.000 | 0.039 | 307.240 | n/a | n/a | 0.038 | 86.713 | 1.000 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000001a94d | 392.213 | 5.108 | 0.000 | 0.000 | 0.751 | 76.847 | 2.167 | 0.052 | 0.000 | 0.011 | 307.240 | n/a | n/a | 0.037 | 5.860 | 0.015 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001af53 | 257.111 | 5.829 | 0.000 | 0.000 | 1.062 | 26.895 | 1.491 | 0.059 | 0.000 | 0.007 | 221.731 | n/a | n/a | 0.038 | 6.891 | 0.027 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001af35 | 200.178 | 4.186 | 0.000 | 0.000 | 1.033 | 19.355 | 1.575 | 0.053 | 0.000 | 0.007 | 173.946 | n/a | n/a | 0.023 | 5.219 | 0.026 | 0.023 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001a9bf | 177.720 | 3.948 | 0.000 | 0.000 | 0.852 | 29.819 | 1.282 | 0.062 | 0.000 | 0.013 | 141.724 | n/a | n/a | 0.019 | 4.800 | 0.027 | 0.019 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001ac32 | 150.706 | 2.501 | 0.000 | 0.000 | 0.969 | 25.318 | 1.438 | 0.025 | 0.000 | 0.013 | 120.426 | n/a | n/a | 0.015 | 3.470 | 0.023 | 0.015 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001ab07 | 147.730 | 5.281 | 0.000 | 0.000 | 0.962 | 19.486 | 1.456 | 0.041 | 0.000 | 0.010 | 120.470 | n/a | n/a | 0.024 | 6.243 | 0.042 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001ab31 | 123.730 | 12.279 | 0.000 | 0.000 | 31.062 | 37.551 | 2.761 | 0.073 | 0.000 | 0.009 | 39.973 | n/a | n/a | 0.021 | 43.341 | 0.350 | 0.021 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001adc1 | 86.719 | 81.793 | 0.000 | 4.369 | 0.551 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 86.713 | 1.000 | 0.005 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000001ad9d | 83.779 | 2.379 | 0.000 | 0.000 | 0.756 | 35.535 | 0.641 | 0.023 | 0.000 | 0.006 | 44.419 | n/a | n/a | 0.020 | 3.135 | 0.037 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001adbb | 83.708 | 2.717 | 0.000 | 0.000 | 0.791 | 20.429 | 0.969 | 0.088 | 0.000 | 0.007 | 58.691 | n/a | n/a | 0.015 | 3.508 | 0.042 | 0.015 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001aaa6 | 79.432 | 50.340 | 0.000 | 4.710 | 19.359 | 3.669 | 1.280 | 0.014 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.020 | 74.409 | 0.937 | 0.020 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000001ad77 | 44.228 | 2.187 | 0.000 | 0.000 | 14.284 | 0.969 | 0.666 | 0.024 | 0.000 | 0.007 | 26.080 | n/a | n/a | 0.011 | 16.471 | 0.372 | 0.011 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001aa96 | 33.460 | 4.231 | 0.000 | 0.000 | 0.892 | 10.667 | 1.671 | 0.043 | 0.000 | 0.027 | 15.906 | n/a | n/a | 0.023 | 5.123 | 0.153 | 0.023 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001ad59 | 25.154 | 4.847 | 0.000 | 0.000 | 0.842 | 2.180 | 1.038 | 0.041 | 0.000 | 0.009 | 16.179 | n/a | n/a | 0.019 | 5.689 | 0.226 | 0.019 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001aa60 | 24.370 | 2.014 | 0.000 | 0.000 | 0.438 | 1.886 | 8.747 | 0.052 | 0.000 | 0.004 | 11.224 | n/a | n/a | 0.005 | 2.452 | 0.101 | 0.005 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001ad0c | 18.003 | 3.108 | 0.000 | 0.000 | 1.890 | 0.955 | 0.711 | 0.026 | 0.000 | 0.005 | 11.272 | n/a | n/a | 0.036 | 4.998 | 0.278 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (92 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.512 | 12.085 | 0.000 | 0.000 | 0.078 | 0.907 | 0.896 | 0.022 | 0.000 | 0.006 | 5.473 | n/a | n/a | 0.019 | 15.884 | 0.478 | 0.019 |
| p99 | 212.570 | 178.194 | 0.000 | 12.360 | 57.271 | 8.679 | 13.870 | 0.188 | 35.800 | 0.060 | 180.749 | n/a | n/a | 0.059 | 190.572 | 1.000 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000001b46b | 212.570 | 18.054 | 0.000 | 0.000 | 1.043 | 2.341 | 10.110 | 0.188 | 0.000 | 0.035 | 180.749 | n/a | n/a | 0.049 | 19.098 | 0.090 | 0.049 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | driver.worker-message 0.884ms |
| e8b48d1b06f03040000000000001b68e | 190.587 | 178.194 | 0.000 | 12.360 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 190.572 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b428 | 173.808 | 173.763 | 0.000 | 0.000 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 173.783 | 1.000 | 0.025 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b477 | 135.808 | 6.122 | 0.000 | 0.000 | 57.271 | 1.229 | 9.125 | 0.087 | 0.000 | 0.011 | 61.920 | n/a | n/a | 0.042 | 63.393 | 0.467 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.worker-message 0.884ms |
| e8b48d1b06f03040000000000001b45c | 117.488 | 117.462 | 0.000 | 0.000 | 0.012 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 117.475 | 1.000 | 0.013 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b512 | 63.892 | 5.215 | 0.000 | 0.000 | 0.355 | 1.887 | 1.225 | 0.026 | 0.000 | 0.008 | 55.150 | n/a | n/a | 0.026 | 5.571 | 0.087 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b204 | 62.585 | 62.542 | 0.000 | 0.000 | 0.027 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 62.569 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b343 | 58.817 | 58.739 | 0.000 | 0.000 | 0.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.039 | 58.778 | 0.999 | 0.039 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b048 | 54.985 | 54.937 | 0.000 | 0.000 | 0.024 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 54.961 | 1.000 | 0.024 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b368 | 52.113 | 3.591 | 0.000 | 0.000 | 0.946 | 0.955 | 4.900 | 0.031 | 35.800 | 0.012 | 5.862 | n/a | n/a | 0.015 | 4.537 | 0.087 | 0.015 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f03040000000000001b291 | 51.890 | 12.085 | 0.000 | 0.000 | 0.400 | 2.034 | 2.762 | 0.050 | 0.000 | 0.024 | 34.513 | n/a | n/a | 0.022 | 12.485 | 0.241 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b023 | 48.653 | 7.509 | 0.000 | 0.000 | 0.725 | 8.679 | 13.870 | 0.129 | 0.000 | 0.012 | 17.707 | n/a | n/a | 0.022 | 8.233 | 0.169 | 0.022 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b1ab | 46.597 | 46.541 | 0.000 | 0.000 | 0.033 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 46.574 | 1.000 | 0.023 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b5d5 | 44.224 | 10.416 | 0.000 | 0.000 | 0.473 | 2.582 | 3.881 | 0.056 | 0.000 | 0.031 | 26.766 | n/a | n/a | 0.020 | 10.889 | 0.246 | 0.020 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b541 | 43.910 | 7.825 | 0.000 | 0.000 | 0.080 | 1.044 | 2.746 | 0.088 | 0.000 | 0.039 | 32.067 | n/a | n/a | 0.023 | 7.904 | 0.180 | 0.023 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b5a8 | 43.269 | 43.237 | 0.000 | 0.000 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 43.254 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b497 | 43.045 | 43.001 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 43.020 | 0.999 | 0.025 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b06d | 42.813 | 42.772 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 42.798 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b3c8 | 42.269 | 42.238 | 0.000 | 0.000 | 0.014 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 42.251 | 1.000 | 0.018 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b6bb | 41.304 | 9.291 | 0.000 | 0.000 | 0.364 | 1.070 | 2.187 | 0.034 | 0.000 | 0.007 | 28.310 | n/a | n/a | 0.042 | 9.655 | 0.234 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (34 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.956 | 4.379 | 0.000 | 0.000 | 0.646 | 0.991 | 1.225 | 0.029 | 0.000 | 0.011 | 11.746 | n/a | n/a | 0.024 | 4.995 | 0.261 | 0.024 |
| p99 | 135.808 | 7.509 | 0.000 | 0.000 | 57.271 | 8.679 | 13.870 | 0.129 | 35.800 | 0.060 | 61.920 | n/a | n/a | 0.042 | 63.393 | 0.478 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000001b477 | 135.808 | 6.122 | 0.000 | 0.000 | 57.271 | 1.229 | 9.125 | 0.087 | 0.000 | 0.011 | 61.920 | n/a | n/a | 0.042 | 63.393 | 0.467 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.worker-message 0.884ms |
| e8b48d1b06f03040000000000001b512 | 63.892 | 5.215 | 0.000 | 0.000 | 0.355 | 1.887 | 1.225 | 0.026 | 0.000 | 0.008 | 55.150 | n/a | n/a | 0.026 | 5.571 | 0.087 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b368 | 52.113 | 3.591 | 0.000 | 0.000 | 0.946 | 0.955 | 4.900 | 0.031 | 35.800 | 0.012 | 5.862 | n/a | n/a | 0.015 | 4.537 | 0.087 | 0.015 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f03040000000000001b023 | 48.653 | 7.509 | 0.000 | 0.000 | 0.725 | 8.679 | 13.870 | 0.129 | 0.000 | 0.012 | 17.707 | n/a | n/a | 0.022 | 8.233 | 0.169 | 0.022 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b0c6 | 32.813 | 5.721 | 0.000 | 0.000 | 0.460 | 0.975 | 1.837 | 0.053 | 0.000 | 0.018 | 23.729 | n/a | n/a | 0.021 | 6.181 | 0.188 | 0.021 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b4a6 | 31.446 | 6.366 | 0.000 | 0.000 | 0.522 | 1.011 | 1.148 | 0.022 | 0.000 | 0.007 | 22.340 | n/a | n/a | 0.030 | 6.888 | 0.219 | 0.030 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b617 | 31.065 | 6.818 | 0.000 | 0.000 | 1.165 | 2.064 | 7.068 | 0.104 | 0.000 | 0.060 | 13.754 | n/a | n/a | 0.032 | 7.982 | 0.257 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b057 | 29.404 | 3.756 | 0.000 | 0.000 | 0.578 | 0.968 | 2.368 | 0.048 | 0.000 | 0.010 | 21.660 | n/a | n/a | 0.016 | 4.334 | 0.147 | 0.016 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b3d7 | 26.918 | 7.025 | 0.000 | 0.000 | 0.646 | 1.087 | 1.192 | 0.028 | 0.000 | 0.017 | 16.890 | n/a | n/a | 0.033 | 7.671 | 0.285 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b0a1 | 26.763 | 6.199 | 0.000 | 0.000 | 0.790 | 1.248 | 1.806 | 0.035 | 0.000 | 0.033 | 16.613 | n/a | n/a | 0.039 | 6.990 | 0.261 | 0.039 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b14b | 24.790 | 4.289 | 0.000 | 0.000 | 0.882 | 0.907 | 1.411 | 0.027 | 0.000 | 0.012 | 17.239 | n/a | n/a | 0.024 | 5.171 | 0.209 | 0.024 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b3b2 | 22.371 | 7.318 | 0.000 | 0.000 | 0.758 | 0.925 | 1.534 | 0.049 | 0.000 | 0.009 | 11.746 | n/a | n/a | 0.033 | 8.075 | 0.361 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b64c | 22.341 | 4.067 | 0.000 | 0.000 | 0.137 | 0.960 | 1.298 | 0.030 | 0.000 | 0.008 | 15.819 | n/a | n/a | 0.021 | 4.205 | 0.188 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b412 | 21.648 | 6.818 | 0.000 | 0.000 | 0.548 | 1.025 | 1.225 | 0.023 | 0.000 | 0.006 | 11.987 | n/a | n/a | 0.016 | 7.365 | 0.340 | 0.016 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b238 | 21.086 | 3.630 | 0.000 | 0.000 | 0.656 | 0.931 | 0.905 | 0.024 | 0.000 | 0.011 | 14.910 | n/a | n/a | 0.019 | 4.286 | 0.203 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b110 | 21.084 | 6.843 | 0.000 | 0.000 | 0.461 | 1.042 | 1.057 | 0.030 | 0.000 | 0.007 | 11.605 | n/a | n/a | 0.040 | 7.304 | 0.346 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b186 | 20.155 | 3.625 | 0.000 | 0.000 | 0.604 | 0.937 | 1.087 | 0.027 | 0.000 | 0.008 | 13.844 | n/a | n/a | 0.022 | 4.229 | 0.210 | 0.022 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b2c5 | 19.956 | 5.597 | 0.000 | 0.000 | 0.533 | 1.264 | 2.658 | 0.056 | 0.000 | 0.012 | 9.809 | n/a | n/a | 0.026 | 6.130 | 0.307 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b506 | 19.953 | 4.640 | 0.000 | 0.000 | 0.078 | 0.914 | 2.221 | 0.039 | 0.000 | 0.034 | 12.000 | n/a | n/a | 0.027 | 4.718 | 0.236 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b574 | 19.562 | 6.768 | 0.000 | 0.000 | 0.281 | 1.145 | 1.319 | 0.033 | 0.000 | 0.012 | 9.984 | n/a | n/a | 0.020 | 7.049 | 0.360 | 0.020 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (96 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.633 | 14.807 | 0.000 | 0.000 | 0.093 | 0.925 | 0.961 | 0.023 | 0.000 | 0.007 | 7.972 | n/a | n/a | 0.022 | 15.017 | 0.528 | 0.022 |
| p99 | 194.938 | 137.438 | 0.000 | 0.000 | 5.614 | 15.291 | 13.805 | 0.133 | 35.401 | 0.128 | 179.267 | n/a | n/a | 0.199 | 137.463 | 1.000 | 0.199 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000001b9e8 | 194.938 | 11.680 | 0.000 | 0.000 | 0.605 | 1.115 | 2.196 | 0.034 | 0.000 | 0.012 | 179.267 | n/a | n/a | 0.027 | 12.286 | 0.063 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001ba6d | 137.480 | 137.438 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 137.463 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001bd4e | 88.401 | 88.362 | 0.000 | 0.000 | 0.012 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 88.374 | 1.000 | 0.027 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001bb68 | 72.675 | 6.051 | 0.000 | 0.000 | 0.513 | 3.219 | 6.502 | 0.096 | 35.401 | 0.039 | 20.812 | n/a | n/a | 0.042 | 6.564 | 0.090 | 0.042 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f03040000000000001bdae | 72.670 | 72.602 | 0.000 | 0.000 | 0.044 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 72.646 | 1.000 | 0.024 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001bc76 | 71.040 | 8.036 | 0.000 | 0.000 | 5.614 | 15.291 | 5.641 | 0.107 | 0.000 | 0.017 | 36.309 | n/a | n/a | 0.026 | 13.649 | 0.192 | 0.026 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b6f6 | 66.934 | 66.895 | 0.000 | 0.000 | 0.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 66.917 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001bb94 | 63.914 | 8.899 | 0.000 | 0.000 | 1.359 | 1.407 | 1.229 | 0.033 | 0.000 | 0.010 | 50.953 | n/a | n/a | 0.022 | 10.259 | 0.161 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001be08 | 63.654 | 63.580 | 0.000 | 0.000 | 0.030 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.044 | 63.610 | 0.999 | 0.044 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b7ea | 61.855 | 61.812 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 61.838 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001ba48 | 59.439 | 59.385 | 0.000 | 0.000 | 0.027 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 59.412 | 1.000 | 0.027 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b774 | 58.896 | 6.852 | 0.000 | 0.000 | 0.506 | 1.085 | 5.084 | 0.044 | 0.000 | 0.128 | 45.176 | n/a | n/a | 0.021 | 7.358 | 0.125 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b9d9 | 58.005 | 57.960 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 57.986 | 1.000 | 0.019 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001bdbd | 55.514 | 55.432 | 0.000 | 0.000 | 0.029 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.053 | 55.461 | 0.999 | 0.053 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b8b9 | 51.552 | 51.511 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 51.536 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b78a | 50.024 | 49.883 | 0.000 | 0.000 | 0.081 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.060 | 49.964 | 0.999 | 0.060 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b82a | 48.717 | 48.664 | 0.000 | 0.000 | 0.033 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 48.698 | 1.000 | 0.019 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001b80f | 48.684 | 48.645 | 0.000 | 0.000 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 48.661 | 1.000 | 0.022 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001bb8d | 48.404 | 48.372 | 0.000 | 0.000 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 48.389 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| e8b48d1b06f03040000000000001bcfc | 47.404 | 47.376 | 0.000 | 0.000 | 0.013 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 47.389 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |

## P5 / presweep / commit / 5-10 facts (29 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.767 | 5.563 | 0.000 | 0.000 | 0.618 | 1.183 | 1.414 | 0.033 | 0.000 | 0.010 | 11.626 | n/a | n/a | 0.022 | 6.587 | 0.282 | 0.022 |
| p99 | 72.675 | 23.368 | 0.000 | 0.000 | 5.614 | 15.291 | 13.805 | 0.133 | 35.401 | 0.128 | 50.953 | n/a | n/a | 0.046 | 23.999 | 0.696 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000001bb68 | 72.675 | 6.051 | 0.000 | 0.000 | 0.513 | 3.219 | 6.502 | 0.096 | 35.401 | 0.039 | 20.812 | n/a | n/a | 0.042 | 6.564 | 0.090 | 0.042 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| e8b48d1b06f03040000000000001bc76 | 71.040 | 8.036 | 0.000 | 0.000 | 5.614 | 15.291 | 5.641 | 0.107 | 0.000 | 0.017 | 36.309 | n/a | n/a | 0.026 | 13.649 | 0.192 | 0.026 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001bb94 | 63.914 | 8.899 | 0.000 | 0.000 | 1.359 | 1.407 | 1.229 | 0.033 | 0.000 | 0.010 | 50.953 | n/a | n/a | 0.022 | 10.259 | 0.161 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b774 | 58.896 | 6.852 | 0.000 | 0.000 | 0.506 | 1.085 | 5.084 | 0.044 | 0.000 | 0.128 | 45.176 | n/a | n/a | 0.021 | 7.358 | 0.125 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b903 | 39.958 | 10.978 | 0.000 | 0.000 | 0.275 | 9.942 | 2.411 | 0.065 | 0.000 | 0.033 | 16.208 | n/a | n/a | 0.046 | 11.253 | 0.282 | 0.046 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b963 | 34.489 | 23.368 | 0.000 | 0.000 | 0.631 | 0.911 | 1.326 | 0.029 | 0.000 | 0.008 | 8.194 | n/a | n/a | 0.023 | 23.999 | 0.696 | 0.023 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000001b945 | 33.761 | 4.786 | 0.000 | 0.000 | 0.362 | 2.203 | 1.186 | 0.024 | 0.000 | 0.007 | 25.165 | n/a | n/a | 0.028 | 5.148 | 0.152 | 0.028 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b9ad | 31.938 | 4.041 | 0.000 | 0.000 | 0.593 | 6.556 | 13.805 | 0.057 | 0.000 | 0.055 | 6.812 | n/a | n/a | 0.020 | 4.634 | 0.145 | 0.020 | gw-w/thread-76/gateway.admitted-work | none observed |
| e8b48d1b06f03040000000000001b988 | 31.934 | 4.527 | 0.000 | 0.000 | 0.330 | 6.934 | 3.126 | 0.059 | 0.000 | 0.022 | 16.921 | n/a | n/a | 0.015 | 4.856 | 0.152 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b81e | 31.843 | 4.921 | 0.000 | 0.000 | 1.666 | 0.997 | 1.693 | 0.033 | 0.000 | 0.007 | 22.494 | n/a | n/a | 0.031 | 6.587 | 0.207 | 0.031 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b7f9 | 29.925 | 6.122 | 0.000 | 0.000 | 0.849 | 0.967 | 0.951 | 0.029 | 0.000 | 0.008 | 20.973 | n/a | n/a | 0.025 | 6.971 | 0.233 | 0.025 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b6e0 | 28.451 | 7.969 | 0.000 | 0.000 | 0.812 | 6.239 | 1.932 | 0.061 | 0.000 | 0.017 | 11.399 | n/a | n/a | 0.022 | 8.781 | 0.309 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001bbd7 | 28.411 | 13.839 | 0.000 | 0.000 | 1.172 | 1.232 | 2.387 | 0.030 | 0.000 | 0.008 | 9.719 | n/a | n/a | 0.023 | 15.011 | 0.528 | 0.023 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001bce6 | 27.438 | 9.039 | 0.000 | 0.000 | 0.093 | 1.099 | 2.310 | 0.133 | 0.000 | 0.012 | 14.731 | n/a | n/a | 0.022 | 9.132 | 0.333 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001bb43 | 26.767 | 6.419 | 0.000 | 0.000 | 0.510 | 1.037 | 0.883 | 0.024 | 0.000 | 0.006 | 17.865 | n/a | n/a | 0.023 | 6.929 | 0.259 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001ba4d | 24.525 | 9.323 | 0.000 | 0.000 | 1.863 | 0.941 | 1.414 | 0.039 | 0.000 | 0.009 | 10.906 | n/a | n/a | 0.031 | 11.186 | 0.456 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001ba92 | 23.224 | 5.563 | 0.000 | 0.000 | 1.006 | 3.835 | 1.130 | 0.031 | 0.000 | 0.011 | 11.626 | n/a | n/a | 0.021 | 6.569 | 0.283 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001b705 | 22.208 | 5.500 | 0.000 | 0.000 | 0.404 | 1.220 | 1.071 | 0.028 | 0.000 | 0.011 | 13.943 | n/a | n/a | 0.030 | 5.905 | 0.266 | 0.030 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001bae3 | 21.711 | 6.273 | 0.000 | 0.000 | 0.618 | 0.979 | 1.698 | 0.048 | 0.000 | 0.011 | 12.066 | n/a | n/a | 0.018 | 6.891 | 0.317 | 0.018 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001bca3 | 20.993 | 4.637 | 0.000 | 0.000 | 0.319 | 0.941 | 1.243 | 0.026 | 0.000 | 0.013 | 13.797 | n/a | n/a | 0.017 | 4.956 | 0.236 | 0.017 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (12 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 128.960 | 107.840 | 0.000 | 21.091 | 0.004 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 128.949 | 1.000 | 0.014 |
| p99 | 195.526 | 171.486 | 0.000 | 21.091 | 9.412 | 44.146 | 15.708 | 0.170 | 0.000 | 0.115 | 44.653 | n/a | n/a | 0.056 | 192.580 | 1.000 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000001be2d | 195.526 | 118.005 | 0.000 | 21.091 | 0.002 | 40.470 | 15.708 | 0.080 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.056 | 139.098 | 0.711 | 0.056 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000001be48 | 192.588 | 171.486 | 0.000 | 21.091 | 0.002 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 192.580 | 1.000 | 0.008 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000001be42 | 188.639 | 167.533 | 0.000 | 21.091 | 0.003 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 188.628 | 1.000 | 0.011 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000001be3c | 186.256 | 165.148 | 0.000 | 21.091 | 0.002 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 186.241 | 1.000 | 0.015 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000001be36 | 174.166 | 153.041 | 0.000 | 21.091 | 0.010 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 174.142 | 1.000 | 0.024 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000001be27 | 130.963 | 109.857 | 0.000 | 21.091 | 0.004 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 130.952 | 1.000 | 0.011 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000001be21 | 128.960 | 107.840 | 0.000 | 21.091 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 128.949 | 1.000 | 0.011 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000001be1b | 121.786 | 100.683 | 0.000 | 21.091 | 0.003 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 121.777 | 1.000 | 0.009 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000001be15 | 118.678 | 97.554 | 0.000 | 21.091 | 0.014 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 118.660 | 1.000 | 0.018 | node-14/thread-0/client.persist-and-resolve | none observed |
| e8b48d1b06f03040000000000001be0f | 115.240 | 23.871 | 0.000 | 0.000 | 0.024 | 44.146 | 2.340 | 0.170 | 0.000 | 0.008 | 44.653 | n/a | n/a | 0.027 | 23.895 | 0.207 | 0.027 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001bedd | 51.874 | 16.152 | 0.000 | 0.000 | 9.412 | 7.605 | 1.710 | 0.060 | 0.000 | 0.007 | 16.903 | n/a | n/a | 0.024 | 25.564 | 0.493 | 0.024 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| e8b48d1b06f03040000000000001bef3 | 30.547 | 30.517 | 0.000 | 0.000 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 30.532 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |

## P2 / tail / commit (3827 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.695 | 4.573 | 0.000 | 0.000 | 1.069 | 1.060 | 1.167 | 0.027 | 0.000 | 0.007 | 10.135 | n/a | n/a | 0.015 | 8.029 | 0.318 | 0.015 |
| p99 | 514.149 | 202.237 | 0.000 | 33.390 | 356.640 | 164.701 | 10.077 | 7.414 | 0.219 | 0.075 | 104.729 | n/a | n/a | 0.061 | 434.957 | 1.000 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000003025f | 1223.693 | 4.388 | 0.000 | 0.000 | 1175.263 | 30.487 | 1.428 | 0.050 | 0.000 | 0.010 | 12.053 | n/a | n/a | 0.012 | 1179.652 | 0.964 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f0304000000000000302e1 | 1223.662 | 3.641 | 0.000 | 0.000 | 1199.487 | 3.789 | 1.247 | 0.024 | 0.000 | 0.010 | 15.447 | n/a | n/a | 0.018 | 1203.128 | 0.983 | 0.018 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f030400000000000030185 | 1177.823 | 6.558 | 0.000 | 0.000 | 919.181 | 158.156 | 3.839 | 20.750 | 0.000 | 0.006 | 69.320 | n/a | n/a | 0.014 | 925.739 | 0.786 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f0304000000000000300c1 | 924.495 | 9.922 | 0.000 | 0.000 | 759.197 | 141.095 | 1.258 | 0.021 | 0.000 | 0.006 | 12.975 | n/a | n/a | 0.021 | 769.119 | 0.832 | 0.021 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000003001a | 783.398 | 4.619 | 0.000 | 0.000 | 716.948 | 0.966 | 2.288 | 0.034 | 0.000 | 0.010 | 58.517 | n/a | n/a | 0.016 | 721.566 | 0.921 | 0.016 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f0304000000000000305b2 | 745.456 | 7.711 | 0.000 | 0.000 | 617.129 | 90.265 | 2.050 | 0.045 | 0.000 | 0.006 | 28.226 | n/a | n/a | 0.023 | 624.840 | 0.838 | 0.023 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000002fbb2 | 737.196 | 5.798 | 0.000 | 0.000 | 497.216 | 216.767 | 2.065 | 0.155 | 0.000 | 0.008 | 15.172 | n/a | n/a | 0.014 | 503.014 | 0.682 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000002fefb | 728.341 | 8.335 | 0.000 | 0.000 | 637.034 | 1.535 | 1.852 | 0.034 | 0.000 | 0.008 | 79.530 | n/a | n/a | 0.013 | 645.369 | 0.886 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000003064c | 715.184 | 6.999 | 0.000 | 0.000 | 681.776 | 17.232 | 1.439 | 0.024 | 0.000 | 0.029 | 7.674 | n/a | n/a | 0.011 | 688.775 | 0.963 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000003033d | 713.436 | 3.895 | 0.000 | 0.000 | 691.045 | 0.933 | 1.252 | 0.038 | 0.000 | 0.011 | 16.241 | n/a | n/a | 0.021 | 694.939 | 0.974 | 0.021 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000002fe62 | 683.675 | 2.774 | 0.000 | 0.000 | 563.072 | 11.063 | 1.248 | 0.043 | 0.000 | 0.009 | 105.453 | n/a | n/a | 0.012 | 565.846 | 0.828 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000002fc64 | 671.353 | 208.657 | 0.000 | 34.497 | 287.012 | 25.686 | 22.890 | 0.046 | 0.000 | 0.020 | 92.527 | n/a | n/a | 0.018 | 530.167 | 0.790 | 0.018 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f0304000000000000306e9 | 670.605 | 3.342 | 0.000 | 0.000 | 645.672 | 5.378 | 2.011 | 0.025 | 0.000 | 0.005 | 14.166 | n/a | n/a | 0.006 | 649.014 | 0.968 | 0.006 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f0304000000000000271f8 | 662.075 | 3.696 | 0.000 | 0.000 | 613.526 | 17.492 | 8.573 | 0.047 | 0.000 | 0.012 | 18.715 | n/a | n/a | 0.013 | 617.223 | 0.932 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000002d970 | 651.890 | 5.103 | 0.000 | 0.000 | 601.041 | 13.978 | 1.550 | 0.022 | 0.000 | 0.005 | 30.177 | n/a | n/a | 0.014 | 606.144 | 0.930 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f030400000000000030534 | 647.059 | 6.328 | 0.000 | 0.000 | 472.286 | 157.385 | 2.628 | 0.024 | 0.000 | 0.008 | 8.385 | n/a | n/a | 0.015 | 478.614 | 0.740 | 0.015 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000002729c | 644.335 | 2.196 | 0.000 | 0.000 | 618.945 | 0.928 | 1.880 | 0.625 | 0.000 | 0.010 | 19.740 | n/a | n/a | 0.009 | 621.141 | 0.964 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000003036b | 627.917 | 5.543 | 0.000 | 0.000 | 602.163 | 2.436 | 1.047 | 0.059 | 0.000 | 0.007 | 16.639 | n/a | n/a | 0.023 | 607.706 | 0.968 | 0.023 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f0304000000000000271a1 | 622.873 | 3.926 | 0.000 | 0.000 | 438.214 | 131.604 | 2.272 | 0.052 | 0.000 | 0.018 | 46.775 | n/a | n/a | 0.012 | 442.140 | 0.710 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f030400000000000027092 | 619.198 | 6.297 | 0.000 | 0.000 | 547.850 | 31.302 | 2.874 | 0.035 | 0.000 | 0.012 | 30.805 | n/a | n/a | 0.022 | 554.147 | 0.895 | 0.022 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |

## P2 / tail / commit / 5-10 facts (2181 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.403 | 3.643 | 0.000 | 0.000 | 1.389 | 1.127 | 1.091 | 0.028 | 0.000 | 0.008 | 10.279 | n/a | n/a | 0.015 | 6.644 | 0.289 | 0.015 |
| p99 | 527.119 | 208.024 | 0.000 | 34.497 | 388.328 | 176.698 | 8.219 | 9.451 | 0.352 | 0.083 | 102.825 | n/a | n/a | 0.053 | 455.918 | 1.000 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8b48d1b06f03040000000000003025f | 1223.693 | 4.388 | 0.000 | 0.000 | 1175.263 | 30.487 | 1.428 | 0.050 | 0.000 | 0.010 | 12.053 | n/a | n/a | 0.012 | 1179.652 | 0.964 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f0304000000000000302e1 | 1223.662 | 3.641 | 0.000 | 0.000 | 1199.487 | 3.789 | 1.247 | 0.024 | 0.000 | 0.010 | 15.447 | n/a | n/a | 0.018 | 1203.128 | 0.983 | 0.018 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f030400000000000030185 | 1177.823 | 6.558 | 0.000 | 0.000 | 919.181 | 158.156 | 3.839 | 20.750 | 0.000 | 0.006 | 69.320 | n/a | n/a | 0.014 | 925.739 | 0.786 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000003001a | 783.398 | 4.619 | 0.000 | 0.000 | 716.948 | 0.966 | 2.288 | 0.034 | 0.000 | 0.010 | 58.517 | n/a | n/a | 0.016 | 721.566 | 0.921 | 0.016 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000002fbb2 | 737.196 | 5.798 | 0.000 | 0.000 | 497.216 | 216.767 | 2.065 | 0.155 | 0.000 | 0.008 | 15.172 | n/a | n/a | 0.014 | 503.014 | 0.682 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000003033d | 713.436 | 3.895 | 0.000 | 0.000 | 691.045 | 0.933 | 1.252 | 0.038 | 0.000 | 0.011 | 16.241 | n/a | n/a | 0.021 | 694.939 | 0.974 | 0.021 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000002fe62 | 683.675 | 2.774 | 0.000 | 0.000 | 563.072 | 11.063 | 1.248 | 0.043 | 0.000 | 0.009 | 105.453 | n/a | n/a | 0.012 | 565.846 | 0.828 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000002729c | 644.335 | 2.196 | 0.000 | 0.000 | 618.945 | 0.928 | 1.880 | 0.625 | 0.000 | 0.010 | 19.740 | n/a | n/a | 0.009 | 621.141 | 0.964 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000003036b | 627.917 | 5.543 | 0.000 | 0.000 | 602.163 | 2.436 | 1.047 | 0.059 | 0.000 | 0.007 | 16.639 | n/a | n/a | 0.023 | 607.706 | 0.968 | 0.023 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f0304000000000000271a1 | 622.873 | 3.926 | 0.000 | 0.000 | 438.214 | 131.604 | 2.272 | 0.052 | 0.000 | 0.018 | 46.775 | n/a | n/a | 0.012 | 442.140 | 0.710 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f030400000000000027092 | 619.198 | 6.297 | 0.000 | 0.000 | 547.850 | 31.302 | 2.874 | 0.035 | 0.000 | 0.012 | 30.805 | n/a | n/a | 0.022 | 554.147 | 0.895 | 0.022 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000002fcfd | 618.815 | 117.669 | 0.000 | 8.535 | 492.598 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 618.802 | 1.000 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000003095b | 612.678 | 1.908 | 0.000 | 0.000 | 435.875 | 163.682 | 0.713 | 0.020 | 0.000 | 0.007 | 10.468 | n/a | n/a | 0.006 | 437.783 | 0.715 | 0.006 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f03040000000000002d6e5 | 603.094 | 7.968 | 0.000 | 0.000 | 166.075 | 333.793 | 2.960 | 77.945 | 0.000 | 0.031 | 14.310 | n/a | n/a | 0.013 | 174.042 | 0.289 | 0.013 | node-14/thread-0/socket.wait-first-byte | none observed |
| e8b48d1b06f030400000000000026fcc | 583.203 | 5.876 | 0.000 | 0.000 | 450.042 | 105.681 | 1.151 | 0.024 | 0.000 | 0.009 | 20.394 | n/a | n/a | 0.026 | 455.918 | 0.782 | 0.026 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f0304000000000000304ac | 576.360 | 3.555 | 0.000 | 0.000 | 342.547 | 200.507 | 0.657 | 0.020 | 0.000 | 0.006 | 29.055 | n/a | n/a | 0.013 | 346.102 | 0.600 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f030400000000000026fad | 576.251 | 26.819 | 0.000 | 0.000 | 373.709 | 158.147 | 4.760 | 0.068 | 0.000 | 0.074 | 12.650 | n/a | n/a | 0.023 | 400.528 | 0.695 | 0.023 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f030400000000000030763 | 546.753 | 2.466 | 0.000 | 0.000 | 532.585 | 2.117 | 2.226 | 0.035 | 0.000 | 0.011 | 7.307 | n/a | n/a | 0.007 | 535.052 | 0.979 | 0.007 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f0304000000000000303d9 | 531.425 | 4.887 | 0.000 | 0.000 | 509.169 | 1.589 | 1.262 | 0.035 | 0.000 | 0.012 | 14.457 | n/a | n/a | 0.014 | 514.057 | 0.967 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| e8b48d1b06f030400000000000030987 | 529.287 | 1.968 | 0.000 | 0.000 | 517.987 | 0.925 | 1.312 | 0.033 | 0.000 | 0.017 | 7.038 | n/a | n/a | 0.008 | 519.955 | 0.982 | 0.008 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |

## P1 / warmup / read (729 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.158 | 0.068 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.156 | 0.984 | 0.002 |
| p99 | 318.236 | 65.450 | 0.000 | 11.783 | 318.150 | 76.139 | 14.023 | 5.072 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.036 | 318.235 | 1.000 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 505a9f741fba3f0f0000000000025302 | 320.354 | 0.150 | 0.000 | 0.000 | 320.201 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 320.351 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 02348800e68cc67e000000000001f1ae | 319.992 | 0.240 | 0.000 | 0.000 | 319.748 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 319.989 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2a2c225191da714e000000000001d340 | 319.776 | 0.062 | 0.000 | 0.000 | 319.711 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 319.773 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2a2c225191da714e000000000001d33a | 319.644 | 0.108 | 0.000 | 0.000 | 319.532 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 319.639 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2a2c225191da714e000000000001d334 | 319.597 | 0.369 | 0.000 | 0.000 | 319.223 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 319.593 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 02348800e68cc67e000000000001f1f6 | 319.074 | 0.046 | 0.000 | 0.000 | 319.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 319.072 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 02348800e68cc67e000000000001f1f0 | 319.043 | 0.127 | 0.000 | 0.000 | 318.915 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 319.042 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000000253a3 | 318.236 | 0.084 | 0.000 | 0.000 | 318.150 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 318.235 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 2a2c225191da714e000000000000cab5 | 318.175 | 0.150 | 0.000 | 0.000 | 318.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 318.172 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2a2c225191da714e000000000000caaf | 318.164 | 0.043 | 0.000 | 0.000 | 318.117 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 318.160 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2a2c225191da714e000000000000caa9 | 318.132 | 0.074 | 0.000 | 0.000 | 318.056 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 318.130 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2a2c225191da714e000000000000caa3 | 318.055 | 0.109 | 0.000 | 0.000 | 317.942 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 318.051 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 02348800e68cc67e000000000001f233 | 317.785 | 0.092 | 0.000 | 0.000 | 317.690 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 317.782 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2a2c225191da714e000000000001d3f0 | 317.726 | 0.026 | 0.000 | 0.000 | 317.698 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.725 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f000000000002543d | 317.501 | 0.022 | 0.000 | 0.000 | 317.478 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.501 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f0000000000025437 | 317.454 | 0.018 | 0.000 | 0.000 | 317.435 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.453 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f0000000000025431 | 317.443 | 0.020 | 0.000 | 0.000 | 317.422 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.442 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f000000000002542b | 317.433 | 0.029 | 0.000 | 0.000 | 317.403 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.432 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 2a2c225191da714e000000000000ca9d | 317.081 | 0.276 | 0.000 | 0.000 | 316.794 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 317.070 | 1.000 | 0.011 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2a2c225191da714e000000000001d469 | 316.780 | 0.066 | 0.000 | 0.000 | 316.710 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 316.776 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (669 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.022 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.021 | 0.968 | 0.001 |
| p99 | 292.504 | 0.387 | 0.000 | 0.000 | 292.158 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 292.500 | 1.000 | 0.007 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 505a9f741fba3f0f00000000001550d0 | 358.392 | 0.139 | 0.000 | 0.000 | 358.250 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 358.390 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000002f8e5f | 326.971 | 0.251 | 0.000 | 0.000 | 326.713 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 326.964 | 1.000 | 0.007 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000000e8ebb | 324.361 | 0.138 | 0.000 | 0.000 | 324.221 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 324.359 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000000ee373 | 311.748 | 0.120 | 0.000 | 0.000 | 311.625 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 311.746 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f0000000000181c0f | 307.327 | 0.330 | 0.000 | 0.000 | 306.994 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 307.324 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f0000000000114d35 | 295.916 | 0.141 | 0.000 | 0.000 | 295.771 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 295.912 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000002963c2 | 292.504 | 0.342 | 0.000 | 0.000 | 292.158 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 292.500 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f0000000000140605 | 291.443 | 0.228 | 0.000 | 0.000 | 291.212 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 291.440 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000003d6201 | 282.877 | 0.200 | 0.000 | 0.000 | 282.673 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 282.873 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000001e3b41 | 278.444 | 0.247 | 0.000 | 0.000 | 278.195 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.442 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f0000000000353873 | 278.164 | 0.110 | 0.000 | 0.000 | 278.053 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.163 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f000000000011ca42 | 277.990 | 0.151 | 0.000 | 0.000 | 277.836 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.987 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f000000000029947e | 277.527 | 0.112 | 0.000 | 0.000 | 277.411 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.523 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000002aab1e | 276.221 | 0.124 | 0.000 | 0.000 | 276.094 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 276.218 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f000000000030a8a2 | 275.798 | 0.157 | 0.000 | 0.000 | 275.639 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.796 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f000000000039cb65 | 274.528 | 0.104 | 0.000 | 0.000 | 274.421 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.526 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000002f58ee | 274.502 | 0.387 | 0.000 | 0.000 | 274.107 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 274.494 | 1.000 | 0.008 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f0000000000347d33 | 274.188 | 0.131 | 0.000 | 0.000 | 274.056 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.187 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000002f7e12 | 273.647 | 0.104 | 0.000 | 0.000 | 273.541 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.645 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f000000000021c77a | 273.349 | 0.162 | 0.000 | 0.000 | 273.184 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 273.345 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P1 / L4 / read (1034 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.778 | 0.120 | 0.000 | 0.000 | 51.630 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 51.772 | 1.000 | 0.002 |
| p99 | 275.582 | 1.430 | 0.000 | 0.000 | 275.376 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 275.579 | 1.000 | 0.016 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02348800e68cc67e0000000000191c6b | 925.168 | 2.154 | 0.000 | 0.000 | 923.004 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 925.158 | 1.000 | 0.010 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000004f7992 | 910.495 | 6.043 | 0.000 | 0.000 | 904.448 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 910.491 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000004f79bd | 829.298 | 1.497 | 0.000 | 0.000 | 827.780 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 829.277 | 1.000 | 0.021 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 2a2c225191da714e000000000018db13 | 355.089 | 1.018 | 0.000 | 0.000 | 354.065 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 355.084 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2a2c225191da714e0000000000107840 | 284.055 | 0.250 | 0.000 | 0.000 | 283.802 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 284.051 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000004542c4 | 283.780 | 0.158 | 0.000 | 0.000 | 283.619 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 283.777 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000004542ca | 283.780 | 0.030 | 0.000 | 0.000 | 283.748 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 283.778 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 02348800e68cc67e000000000010c973 | 283.592 | 0.156 | 0.000 | 0.000 | 283.433 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 283.589 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2a2c225191da714e00000000001629cc | 277.756 | 0.138 | 0.000 | 0.000 | 277.613 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 277.751 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 02348800e68cc67e0000000000165a70 | 275.673 | 0.319 | 0.000 | 0.000 | 275.347 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 275.667 | 1.000 | 0.007 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000004bbf1e | 275.582 | 0.057 | 0.000 | 0.000 | 275.521 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.579 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000004bbf18 | 275.571 | 0.191 | 0.000 | 0.000 | 275.376 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.568 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 2a2c225191da714e0000000000150c46 | 273.283 | 0.352 | 0.000 | 0.000 | 272.923 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 273.275 | 1.000 | 0.008 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000004a7737 | 273.253 | 0.021 | 0.000 | 0.000 | 273.231 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.253 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000004a7731 | 273.226 | 0.118 | 0.000 | 0.000 | 273.106 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.224 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 02348800e68cc67e000000000015f636 | 272.619 | 0.675 | 0.000 | 0.000 | 271.938 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 272.613 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000004b4a47 | 272.605 | 0.032 | 0.000 | 0.000 | 272.572 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.604 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000004b4a41 | 272.602 | 0.135 | 0.000 | 0.000 | 272.462 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 272.597 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 02348800e68cc67e00000000001549b5 | 272.282 | 0.120 | 0.000 | 0.000 | 272.159 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.279 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000004246dd | 271.424 | 0.555 | 0.000 | 0.000 | 270.865 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 271.420 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P1 / L16 / read (2719 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 78.189 | 0.916 | 0.000 | 0.000 | 56.930 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 63.798 | 1.000 | 0.003 |
| p99 | 581.741 | 141.246 | 0.000 | 33.431 | 558.421 | 171.595 | 14.271 | 6.701 | 10.504 | 0.070 | 0.000 | n/a | n/a | 0.026 | 581.738 | 1.000 | 0.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02348800e68cc67e000000000019310a | 1263.408 | 2.917 | 0.000 | 0.000 | 1260.484 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 1263.401 | 1.000 | 0.007 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2a2c225191da714e000000000018ee9f | 1258.316 | 2.433 | 0.000 | 0.000 | 1255.879 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 1258.312 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2a2c225191da714e000000000018eecd | 1252.481 | 0.651 | 0.000 | 0.000 | 1251.826 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 1252.478 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 02348800e68cc67e0000000000193142 | 1251.663 | 2.231 | 0.000 | 0.000 | 1249.425 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 1251.656 | 1.000 | 0.007 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000004f9202 | 1246.397 | 5.893 | 0.000 | 0.000 | 1240.490 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 1246.384 | 1.000 | 0.014 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 2a2c225191da714e000000000018eee2 | 1244.086 | 0.908 | 0.000 | 0.000 | 1243.165 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 1244.073 | 1.000 | 0.014 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2a2c225191da714e000000000018eee8 | 1243.133 | 0.061 | 0.000 | 0.000 | 1243.066 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 1243.127 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000004f9569 | 1005.975 | 2.611 | 0.000 | 0.000 | 1003.358 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 1005.970 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 2a2c225191da714e000000000018ee2d | 907.712 | 1.179 | 0.000 | 0.000 | 906.525 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 907.704 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 02348800e68cc67e0000000000191ca3 | 874.085 | 0.627 | 0.000 | 0.000 | 873.453 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 874.080 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000004f7a7f | 869.420 | 4.481 | 0.000 | 0.000 | 864.937 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 869.417 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 02348800e68cc67e00000000001a4d6d | 809.237 | 3.651 | 0.000 | 0.000 | 805.570 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 809.221 | 1.000 | 0.015 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2a2c225191da714e00000000001a0e9d | 808.283 | 6.949 | 0.000 | 0.000 | 801.327 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 808.276 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f000000000050f036 | 773.366 | 333.138 | 0.000 | 60.175 | 349.522 | 10.057 | 20.425 | 0.010 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.005 | 742.835 | 0.961 | 0.005 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f000000000050ed81 | 752.855 | 2.297 | 0.000 | 0.000 | 750.553 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 752.850 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000004f9374 | 743.093 | 0.770 | 0.000 | 0.000 | 742.320 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 743.090 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 02348800e68cc67e000000000019322d | 737.201 | 0.902 | 0.000 | 0.000 | 736.283 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 737.185 | 1.000 | 0.016 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 02348800e68cc67e000000000019323b | 709.957 | 0.811 | 0.000 | 0.000 | 709.133 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 709.944 | 1.000 | 0.013 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f00000000004f9563 | 651.720 | 0.807 | 0.000 | 0.000 | 650.899 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 651.706 | 1.000 | 0.014 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f000000000050f028 | 648.792 | 2.024 | 0.000 | 0.000 | 646.756 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 648.780 | 1.000 | 0.012 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P1 / L64 / read (6772 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 105.613 | 2.452 | 0.000 | 0.000 | 0.000 | 47.313 | 0.710 | 0.004 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.003 | 26.862 | 0.312 | 0.003 |
| p99 | 383.279 | 91.590 | 0.000 | 29.125 | 324.835 | 281.590 | 12.068 | 42.027 | 0.283 | 0.060 | 0.000 | n/a | n/a | 0.022 | 329.347 | 1.000 | 0.022 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 505a9f741fba3f0f0000000000567af2 | 865.138 | 151.817 | 0.000 | 22.656 | 3.196 | 638.745 | 48.684 | 0.010 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.002 | 177.668 | 0.205 | 0.002 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f0000000000567a7c | 792.325 | 225.038 | 0.000 | 40.781 | 6.597 | 511.304 | 8.580 | 0.006 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.003 | 272.416 | 0.344 | 0.003 | node-14/thread-3/socket.wait-first-byte | none observed |
| 02348800e68cc67e00000000001c85f1 | 737.691 | 53.343 | 0.000 | 3.305 | 66.481 | 599.372 | 5.214 | 9.936 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.003 | 123.128 | 0.167 | 0.003 | node-14/thread-5/socket.wait-first-byte | none observed |
| 02348800e68cc67e00000000001c8581 | 691.925 | 49.923 | 0.000 | 11.168 | 68.872 | 539.228 | 2.735 | 19.973 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.003 | 129.963 | 0.188 | 0.003 | node-14/thread-5/socket.wait-first-byte | none observed |
| 2a2c225191da714e0000000000203f00 | 680.207 | 170.203 | 0.000 | 19.205 | 6.327 | 474.768 | 9.662 | 0.013 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.002 | 195.736 | 0.288 | 0.002 | node-14/thread-4/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f0000000000567a8a | 660.021 | 250.844 | 0.000 | 48.904 | 112.993 | 219.707 | 27.527 | 0.012 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.002 | 412.741 | 0.625 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 02348800e68cc67e00000000001c85a0 | 656.962 | 8.123 | 0.000 | 2.961 | 0.000 | 622.917 | 4.790 | 18.144 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.004 | 11.084 | 0.017 | 0.004 | node-14/thread-5/socket.wait-first-byte | none observed |
| 2a2c225191da714e00000000001e279d | 644.047 | 250.438 | 0.000 | 177.128 | 0.000 | 176.446 | 17.645 | 22.378 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.003 | 427.566 | 0.664 | 0.003 | node-14/thread-4/node.gc | none observed |
| 02348800e68cc67e00000000001c861b | 636.011 | 44.787 | 0.000 | 5.962 | 0.000 | 564.899 | 6.693 | 13.654 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.004 | 50.749 | 0.080 | 0.004 | node-14/thread-5/socket.wait-first-byte | none observed |
| 2a2c225191da714e0000000000203d52 | 631.785 | 273.519 | 0.000 | 51.765 | 171.700 | 84.643 | 50.133 | 0.008 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.002 | 496.984 | 0.787 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 2a2c225191da714e00000000001e2c7e | 614.784 | 26.131 | 0.000 | 6.104 | 0.000 | 576.821 | 5.706 | 0.006 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.003 | 32.236 | 0.052 | 0.003 | node-14/thread-4/socket.wait-first-byte | none observed |
| 2a2c225191da714e00000000001e2b28 | 613.439 | 5.398 | 0.000 | 0.000 | 0.000 | 578.549 | 0.363 | 29.116 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.006 | 5.398 | 0.009 | 0.006 | node-14/thread-4/socket.wait-first-byte | none observed |
| 02348800e68cc67e00000000001c85dc | 598.612 | 16.517 | 0.000 | 6.673 | 0.000 | 556.667 | 2.102 | 16.634 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.004 | 23.189 | 0.039 | 0.004 | node-14/thread-5/socket.wait-first-byte | none observed |
| 2a2c225191da714e00000000001e2c63 | 583.605 | 34.425 | 0.000 | 7.034 | 0.000 | 540.165 | 1.970 | 0.004 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.003 | 41.459 | 0.071 | 0.003 | node-14/thread-4/socket.wait-first-byte | none observed |
| 02348800e68cc67e00000000001c8589 | 563.652 | 29.723 | 0.000 | 7.396 | 0.000 | 506.581 | 5.389 | 14.526 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.005 | 37.120 | 0.066 | 0.005 | node-14/thread-5/socket.wait-first-byte | none observed |
| 2a2c225191da714e00000000001d4367 | 558.642 | 34.285 | 0.000 | 3.250 | 16.649 | 502.566 | 1.879 | 0.004 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.002 | 54.184 | 0.097 | 0.002 | node-14/thread-4/socket.wait-first-byte | none observed |
| 2a2c225191da714e00000000001e2c54 | 542.828 | 4.434 | 0.000 | 0.000 | 0.000 | 537.580 | 0.802 | 0.004 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.002 | 4.434 | 0.008 | 0.002 | node-14/thread-4/socket.wait-first-byte | none observed |
| 2a2c225191da714e00000000001d438c | 538.562 | 70.762 | 0.000 | 13.512 | 0.000 | 444.893 | 9.356 | 0.008 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.004 | 84.274 | 0.156 | 0.004 | node-14/thread-4/socket.wait-first-byte | none observed |
| 02348800e68cc67e00000000001c852f | 532.047 | 23.258 | 0.000 | 4.853 | 0.000 | 481.200 | 2.965 | 19.757 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.005 | 28.111 | 0.053 | 0.005 | node-14/thread-5/socket.wait-first-byte | none observed |
| 2a2c225191da714e00000000001d3fe1 | 503.766 | 0.764 | 0.000 | 0.000 | 502.992 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 503.756 | 1.000 | 0.009 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L256 / read (12439 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 176.847 | 2.747 | 0.000 | 0.000 | 0.000 | 120.792 | 0.839 | 0.005 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.003 | 9.873 | 0.056 | 0.003 |
| p99 | 733.158 | 119.863 | 0.000 | 46.810 | 359.663 | 676.876 | 10.757 | 42.679 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.138 | 364.596 | 1.000 | 0.138 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 505a9f741fba3f0f0000000000593e5a | 1614.058 | 117.352 | 0.000 | 16.516 | 11.292 | 1464.698 | 4.173 | 0.007 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.006 | 145.159 | 0.090 | 0.006 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f0000000000593d4f | 1533.984 | 262.466 | 0.000 | 41.441 | 19.476 | 1200.893 | 9.631 | 0.016 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.017 | 323.383 | 0.211 | 0.017 | node-14/thread-3/socket.wait-first-byte | none observed |
| 02348800e68cc67e0000000000226c21 | 1473.032 | 217.915 | 0.000 | 31.935 | 30.375 | 1138.651 | 52.559 | 1.546 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.002 | 280.225 | 0.190 | 0.002 | node-14/thread-5/socket.wait-first-byte | none observed |
| 2a2c225191da714e000000000022632b | 1379.714 | 124.983 | 0.000 | 22.423 | 12.304 | 1207.929 | 12.032 | 0.014 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.002 | 159.709 | 0.116 | 0.002 | node-14/thread-4/socket.wait-first-byte | none observed |
| 02348800e68cc67e0000000000226c19 | 1348.063 | 361.439 | 0.000 | 61.475 | 121.127 | 656.169 | 147.198 | 0.626 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.002 | 544.041 | 0.404 | 0.002 | node-14/thread-5/socket.wait-first-byte | none observed |
| 02348800e68cc67e000000000021dd16 | 1305.668 | 231.189 | 0.000 | 44.057 | 30.990 | 990.701 | 7.657 | 1.050 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.008 | 306.236 | 0.235 | 0.008 | node-14/thread-5/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f0000000000593d41 | 1304.966 | 210.123 | 0.000 | 39.689 | 73.834 | 972.888 | 8.380 | 0.012 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.005 | 323.646 | 0.248 | 0.005 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f0000000000594272 | 1249.787 | 28.333 | 0.000 | 4.791 | 0.000 | 1213.521 | 3.112 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.005 | 33.124 | 0.027 | 0.005 | node-14/thread-3/socket.wait-first-byte | none observed |
| 02348800e68cc67e000000000021da01 | 1238.230 | 120.790 | 0.000 | 26.625 | 32.503 | 1052.229 | 6.030 | 0.014 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.005 | 179.919 | 0.145 | 0.005 | node-14/thread-5/socket.wait-first-byte | none observed |
| 2a2c225191da714e00000000002261e4 | 1223.135 | 239.094 | 0.000 | 41.792 | 24.969 | 817.314 | 96.158 | 3.782 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.006 | 305.855 | 0.250 | 0.006 | node-14/thread-4/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f0000000000594279 | 1219.176 | 28.784 | 0.000 | 3.012 | 0.000 | 1185.674 | 1.678 | 0.006 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.005 | 31.796 | 0.026 | 0.005 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f0000000000594267 | 1189.887 | 38.816 | 0.000 | 5.880 | 0.000 | 1141.983 | 3.177 | 0.007 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.005 | 44.696 | 0.038 | 0.005 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f0000000000594258 | 1147.900 | 7.089 | 0.000 | 0.000 | 0.000 | 1139.671 | 1.117 | 0.006 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.004 | 7.089 | 0.006 | 0.004 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f0000000000594231 | 1144.340 | 38.893 | 0.000 | 8.212 | 0.000 | 1094.131 | 3.067 | 0.010 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.005 | 47.105 | 0.041 | 0.005 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f0000000000593d33 | 1132.826 | 188.498 | 0.000 | 32.607 | 106.323 | 797.257 | 8.092 | 0.013 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.007 | 327.428 | 0.289 | 0.007 | node-14/thread-3/socket.wait-first-byte | none observed |
| 02348800e68cc67e000000000022a5e2 | 1119.841 | 181.384 | 0.000 | 26.152 | 37.745 | 863.302 | 11.217 | 0.011 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.004 | 245.281 | 0.219 | 0.004 | node-14/thread-5/socket.wait-first-byte | none observed |
| 02348800e68cc67e000000000022a767 | 1107.174 | 124.589 | 0.000 | 15.650 | 13.982 | 942.614 | 10.282 | 0.017 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.002 | 154.221 | 0.139 | 0.002 | node-14/thread-5/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f00000000005810e0 | 1096.199 | 360.738 | 0.000 | 69.206 | 14.924 | 634.820 | 16.465 | 0.015 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.003 | 444.868 | 0.406 | 0.003 | node-14/thread-3/socket.wait-first-byte | none observed |
| 02348800e68cc67e000000000021d9e1 | 1082.681 | 66.115 | 0.000 | 17.575 | 60.019 | 935.466 | 3.468 | 0.017 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.001 | 143.708 | 0.133 | 0.001 | node-14/thread-5/socket.wait-first-byte | none observed |
| 2a2c225191da714e00000000002261ec | 1074.889 | 253.533 | 0.000 | 41.913 | 126.707 | 636.128 | 12.214 | 4.364 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.007 | 422.152 | 0.393 | 0.007 | node-14/thread-4/socket.wait-first-byte | none observed |

## P1 / L1024 / read (12451 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 532.031 | 6.895 | 0.000 | 0.000 | 0.000 | 476.021 | 0.700 | 0.006 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.003 | 19.774 | 0.028 | 0.003 |
| p99 | 2286.163 | 490.840 | 0.000 | 105.775 | 670.385 | 2003.492 | 14.705 | 35.365 | 11.565 | 0.053 | 0.000 | n/a | n/a | 1.642 | 763.543 | 1.000 | 1.642 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02348800e68cc67e000000000024f12d | 5361.866 | 94.727 | 0.000 | 12.246 | 145.011 | 5068.005 | 6.813 | 35.047 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.003 | 251.984 | 0.047 | 0.003 | node-14/thread-5/socket.wait-first-byte | none observed |
| 02348800e68cc67e000000000024f0f9 | 5141.958 | 370.150 | 0.000 | 71.673 | 889.594 | 2573.412 | 1192.007 | 10.449 | 34.637 | 0.030 | 0.000 | n/a | n/a | 0.006 | 1331.417 | 0.259 | 0.006 | node-14/thread-5/socket.wait-first-byte | none observed |
| 02348800e68cc67e000000000024f125 | 4753.194 | 201.697 | 0.000 | 41.566 | 280.377 | 4192.339 | 14.027 | 23.166 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.005 | 523.639 | 0.110 | 0.005 | node-14/thread-5/socket.queue-and-write | none observed |
| 2a2c225191da714e0000000000268455 | 4698.104 | 241.519 | 0.000 | 40.958 | 86.924 | 4268.517 | 60.104 | 0.014 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.004 | 369.401 | 0.079 | 0.004 | node-14/thread-4/socket.wait-first-byte | none observed |
| 2a2c225191da714e0000000000268469 | 4446.448 | 436.500 | 0.000 | 171.839 | 292.166 | 3524.440 | 21.404 | 0.031 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.003 | 900.506 | 0.203 | 0.003 | node-14/thread-4/socket.wait-first-byte | none observed |
| 02348800e68cc67e000000000024f0a9 | 4381.337 | 350.718 | 0.000 | 64.082 | 916.892 | 2881.396 | 152.260 | 9.557 | 6.388 | 0.038 | 0.000 | n/a | n/a | 0.007 | 1331.692 | 0.304 | 0.007 | node-14/thread-5/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f00000000005ba86d | 4064.317 | 171.847 | 0.000 | 41.615 | 267.019 | 3554.264 | 12.178 | 17.359 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.008 | 480.480 | 0.118 | 0.008 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f00000000005ba823 | 3980.886 | 184.342 | 0.000 | 40.353 | 286.304 | 3399.612 | 56.871 | 13.376 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.005 | 510.999 | 0.128 | 0.005 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f00000000005dce23 | 3714.568 | 480.001 | 0.000 | 92.505 | 189.518 | 2814.486 | 108.610 | 15.587 | 13.818 | 0.037 | 0.000 | n/a | n/a | 0.006 | 762.024 | 0.205 | 0.006 | node-14/thread-3/socket.wait-first-byte | none observed |
| 2a2c225191da714e0000000000268b70 | 3609.411 | 150.606 | 0.000 | 21.708 | 132.759 | 3300.076 | 4.191 | 0.025 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.002 | 305.073 | 0.085 | 0.002 | node-14/thread-4/socket.wait-first-byte | none observed |
| 2a2c225191da714e0000000000269d29 | 3608.594 | 318.235 | 0.000 | 63.273 | 65.357 | 3141.036 | 1.647 | 18.810 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.088 | 446.866 | 0.124 | 0.088 | node-14/thread-4/socket.wait-first-byte | none observed |
| 2a2c225191da714e0000000000269d79 | 3601.756 | 9.557 | 0.000 | 5.175 | 371.498 | 3195.759 | 1.459 | 18.287 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.002 | 386.229 | 0.107 | 0.002 | node-14/thread-4/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f00000000005bc20e | 3598.924 | 325.930 | 0.000 | 58.622 | 566.946 | 2545.447 | 63.923 | 21.249 | 16.756 | 0.051 | 0.000 | n/a | n/a | 0.002 | 951.498 | 0.264 | 0.002 | node-14/thread-3/socket.wait-first-byte | none observed |
| 02348800e68cc67e000000000024f788 | 3596.764 | 798.950 | 0.000 | 136.371 | 313.376 | 2339.184 | 8.836 | 0.009 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.019 | 1248.697 | 0.347 | 0.019 | node-14/thread-5/socket.wait-first-byte | none observed |
| 2a2c225191da714e0000000000269d87 | 3595.432 | 267.614 | 0.000 | 72.789 | 373.192 | 2858.970 | 2.578 | 20.262 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.003 | 713.595 | 0.198 | 0.003 | node-14/thread-4/socket.wait-first-byte | none observed |
| 02348800e68cc67e000000000024f77a | 3574.430 | 803.860 | 0.000 | 140.010 | 319.249 | 2307.577 | 1.729 | 1.984 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.003 | 1263.119 | 0.353 | 0.003 | node-14/thread-5/socket.wait-first-byte | none observed |
| 02348800e68cc67e0000000000264bff | 3404.153 | 297.326 | 0.000 | 45.851 | 280.149 | 2715.238 | 31.908 | 21.374 | 12.293 | 0.012 | 0.000 | n/a | n/a | 0.002 | 623.326 | 0.183 | 0.002 | node-14/thread-5/socket.wait-first-byte | none observed |
| 02348800e68cc67e00000000002841a6 | 3398.748 | 561.991 | 0.000 | 127.449 | 168.506 | 2520.727 | 20.051 | 0.005 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.008 | 857.947 | 0.252 | 0.008 | node-14/thread-5/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f00000000005ba881 | 3366.354 | 180.426 | 0.000 | 28.043 | 59.692 | 3017.583 | 59.793 | 20.780 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.005 | 268.161 | 0.080 | 0.005 | node-14/thread-3/socket.wait-first-byte | none observed |
| 2a2c225191da714e0000000000268441 | 3329.675 | 1031.225 | 0.000 | 212.849 | 107.432 | 1931.799 | 26.608 | 2.971 | 16.746 | 0.041 | 0.000 | n/a | n/a | 0.004 | 1351.506 | 0.406 | 0.004 | node-14/thread-4/socket.wait-first-byte | none observed |

## P1 / recovery / read (14196 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 173.391 | 2.701 | 0.000 | 0.000 | 0.000 | 111.370 | 0.848 | 0.005 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.003 | 11.102 | 0.061 | 0.003 |
| p99 | 1023.078 | 154.560 | 0.000 | 41.707 | 556.549 | 883.210 | 12.005 | 16.205 | 0.207 | 0.073 | 0.000 | n/a | n/a | 0.471 | 583.703 | 1.000 | 0.471 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 505a9f741fba3f0f0000000000639bd0 | 2704.394 | 49.898 | 0.000 | 15.113 | 115.683 | 2520.522 | 3.147 | 0.009 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.002 | 180.694 | 0.067 | 0.002 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000063a052 | 2653.332 | 87.223 | 0.000 | 34.849 | 2020.859 | 498.310 | 7.744 | 4.290 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.003 | 2142.931 | 0.808 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f000000000063a54f | 2640.293 | 15.703 | 0.000 | 0.000 | 92.711 | 2507.985 | 2.379 | 21.495 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.002 | 108.414 | 0.041 | 0.002 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000063a45a | 2637.600 | 23.763 | 0.000 | 3.223 | 165.992 | 2426.037 | 2.116 | 16.448 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.002 | 192.979 | 0.073 | 0.002 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000063a4cd | 2570.758 | 12.260 | 0.000 | 0.000 | 16.051 | 2477.119 | 15.104 | 10.910 | 39.285 | 0.026 | 0.000 | n/a | n/a | 0.002 | 28.311 | 0.011 | 0.002 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000063a5c4 | 2417.311 | 5.444 | 0.000 | 0.000 | 0.000 | 2410.992 | 0.860 | 0.007 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.002 | 5.444 | 0.002 | 0.002 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000063a5a5 | 2413.491 | 24.879 | 0.000 | 4.393 | 0.000 | 2382.896 | 1.309 | 0.003 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.005 | 29.272 | 0.012 | 0.005 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000063a575 | 2406.937 | 37.825 | 0.000 | 6.910 | 0.000 | 2338.653 | 1.809 | 21.731 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.004 | 44.735 | 0.019 | 0.004 | node-14/thread-3/socket.wait-first-byte | none observed |
| 02348800e68cc67e0000000000285c31 | 2384.881 | 2.674 | 0.000 | 0.000 | 0.000 | 2381.420 | 0.766 | 0.005 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.006 | 2.674 | 0.001 | 0.006 | node-14/thread-5/socket.wait-first-byte | none observed |
| 02348800e68cc67e0000000000285be4 | 2383.461 | 2.733 | 0.000 | 0.000 | 0.000 | 2379.008 | 1.676 | 0.019 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.002 | 2.733 | 0.001 | 0.002 | node-14/thread-5/socket.wait-first-byte | none observed |
| 02348800e68cc67e0000000000285c2a | 2382.685 | 1.449 | 0.000 | 0.000 | 0.000 | 2380.464 | 0.725 | 0.010 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.007 | 1.449 | 0.001 | 0.007 | node-14/thread-5/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000063a48f | 2361.401 | 61.795 | 0.000 | 7.626 | 0.000 | 2272.214 | 6.091 | 13.658 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.004 | 69.421 | 0.029 | 0.004 | node-14/thread-3/socket.wait-first-byte | none observed |
| 02348800e68cc67e0000000000285c23 | 2356.352 | 1954.453 | 0.000 | 394.600 | 0.000 | 6.909 | 0.381 | 0.002 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.004 | 2349.053 | 0.997 | 0.004 | node-14/thread-5/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000005ee6be | 2317.703 | 350.186 | 0.000 | 60.012 | 47.648 | 1829.268 | 27.413 | 3.069 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.002 | 457.846 | 0.198 | 0.002 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000063a4b3 | 2306.730 | 27.424 | 0.000 | 2.165 | 0.000 | 2261.312 | 1.266 | 14.552 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.004 | 29.589 | 0.013 | 0.004 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000063a468 | 2289.780 | 18.963 | 0.000 | 0.000 | 0.000 | 2245.394 | 6.376 | 19.038 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.003 | 18.963 | 0.008 | 0.003 | node-14/thread-3/socket.wait-first-byte | none observed |
| 2a2c225191da714e000000000027faa4 | 2285.949 | 18.599 | 0.000 | 4.262 | 0.000 | 2254.813 | 8.215 | 0.008 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.014 | 22.861 | 0.010 | 0.014 | node-14/thread-4/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000063a406 | 2280.933 | 12.798 | 0.000 | 0.000 | 0.000 | 2247.798 | 0.672 | 19.644 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.004 | 12.798 | 0.006 | 0.004 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000063a38a | 2276.756 | 48.527 | 0.000 | 9.756 | 0.000 | 2196.651 | 1.789 | 20.026 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.002 | 58.283 | 0.026 | 0.002 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000063a510 | 2220.999 | 22.071 | 0.000 | 3.272 | 0.000 | 2174.462 | 0.587 | 20.600 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.003 | 25.343 | 0.011 | 0.003 | node-14/thread-3/socket.wait-first-byte | none observed |

## P4 / p4mix / read (99 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.078 | 0.077 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.077 | 0.978 | 0.001 |
| p99 | 217.560 | 146.232 | 0.000 | 43.996 | 0.000 | 170.700 | 49.112 | 0.106 | 21.928 | 0.072 | 0.000 | n/a | n/a | 0.013 | 166.530 | 0.997 | 0.013 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 505a9f741fba3f0f000000000066ee3e | 217.560 | 138.241 | 0.000 | 28.289 | 0.000 | 1.889 | 49.112 | 0.006 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.004 | 166.530 | 0.765 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f000000000063c5f9 | 174.235 | 3.069 | 0.000 | 0.000 | 0.000 | 170.700 | 0.455 | 0.003 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.002 | 3.069 | 0.018 | 0.002 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f0000000000670987 | 172.506 | 146.232 | 0.000 | 11.780 | 0.000 | 3.116 | 11.319 | 0.016 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.008 | 158.012 | 0.916 | 0.008 | node-14/thread-3/reader.observe | none observed |
| 505a9f741fba3f0f000000000063c5f2 | 171.699 | 2.294 | 0.000 | 0.000 | 0.000 | 168.343 | 1.035 | 0.008 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.004 | 2.294 | 0.013 | 0.004 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000068f870 | 139.502 | 29.129 | 0.000 | 0.000 | 0.000 | 108.057 | 2.241 | 0.011 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.004 | 29.129 | 0.209 | 0.004 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f0000000000670ac7 | 134.396 | 41.557 | 0.000 | 0.000 | 0.000 | 91.568 | 1.241 | 0.007 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.004 | 41.557 | 0.309 | 0.004 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f0000000000655fe6 | 115.072 | 26.061 | 0.000 | 0.000 | 0.000 | 86.654 | 2.267 | 0.009 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.008 | 26.061 | 0.226 | 0.008 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f0000000000670267 | 93.806 | 77.676 | 0.000 | 8.429 | 0.000 | 3.037 | 4.506 | 0.106 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.006 | 86.105 | 0.918 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f0000000000655f39 | 88.473 | 30.015 | 0.000 | 43.996 | 0.000 | 12.700 | 1.724 | 0.013 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.003 | 74.010 | 0.837 | 0.003 | node-14/thread-3/node.gc | none observed |
| 505a9f741fba3f0f000000000064b1a7 | 87.631 | 71.214 | 0.000 | 9.318 | 0.000 | 1.722 | 5.334 | 0.011 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.004 | 80.532 | 0.919 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f000000000064b6cb | 71.885 | 58.889 | 0.000 | 7.593 | 0.000 | 1.428 | 3.891 | 0.016 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.006 | 66.482 | 0.925 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f000000000069e776 | 64.243 | 36.950 | 0.000 | 6.259 | 0.000 | 1.310 | 6.580 | 0.008 | 13.118 | 0.016 | 0.000 | n/a | n/a | 0.002 | 43.209 | 0.673 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f000000000063e735 | 58.380 | 42.178 | 0.000 | 6.038 | 0.000 | 2.230 | 7.869 | 0.022 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.008 | 48.216 | 0.826 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f0000000000645ecd | 57.236 | 45.673 | 0.000 | 7.629 | 0.000 | 1.053 | 2.841 | 0.010 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.005 | 53.302 | 0.931 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f000000000063c6e5 | 56.662 | 39.770 | 0.000 | 12.333 | 0.000 | 1.138 | 3.382 | 0.011 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.004 | 52.103 | 0.920 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f000000000064318f | 55.722 | 42.996 | 0.000 | 7.413 | 0.000 | 1.233 | 4.041 | 0.012 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.005 | 50.410 | 0.905 | 0.005 | node-14/thread-3/reader.observe | none observed |
| 505a9f741fba3f0f000000000066d895 | 55.213 | 43.141 | 0.000 | 7.067 | 0.000 | 1.855 | 3.098 | 0.011 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.013 | 50.208 | 0.909 | 0.013 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f000000000064b09d | 55.201 | 43.855 | 0.000 | 7.206 | 0.000 | 0.942 | 3.170 | 0.009 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.002 | 51.061 | 0.925 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000006aeed5 | 53.883 | 23.374 | 0.000 | 2.891 | 0.000 | 3.372 | 2.302 | 0.004 | 21.928 | 0.008 | 0.000 | n/a | n/a | 0.003 | 26.265 | 0.487 | 0.003 | gw-r/thread--1/jdk.GCPhasePause | none observed |
| 505a9f741fba3f0f000000000067b4e5 | 52.820 | 41.410 | 0.000 | 6.348 | 0.000 | 1.700 | 3.324 | 0.008 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.004 | 47.758 | 0.904 | 0.004 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h1 / read (103 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.079 | 0.077 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.077 | 0.958 | 0.001 |
| p99 | 135.638 | 98.260 | 0.000 | 20.271 | 0.000 | 32.127 | 27.718 | 0.029 | 23.626 | 0.051 | 0.000 | n/a | n/a | 0.009 | 107.682 | 0.997 | 0.009 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 505a9f741fba3f0f00000000006b25e4 | 253.941 | 100.221 | 0.000 | 148.802 | 0.000 | 1.622 | 3.230 | 0.013 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.004 | 249.023 | 0.981 | 0.004 | node-14/thread-3/node.gc | none observed |
| 505a9f741fba3f0f000000000071f3f1 | 135.638 | 31.013 | 0.000 | 0.000 | 0.000 | 103.184 | 1.393 | 0.014 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.006 | 31.013 | 0.229 | 0.006 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f00000000006c3983 | 118.811 | 9.997 | 0.000 | 0.000 | 0.000 | 13.864 | 25.175 | 0.013 | 69.737 | 0.021 | 0.000 | n/a | n/a | 0.003 | 9.997 | 0.084 | 0.003 | gw-r/thread--1/jdk.GCPhasePause | none observed |
| 505a9f741fba3f0f0000000000716d6a | 112.154 | 98.260 | 0.000 | 9.422 | 0.000 | 2.633 | 1.804 | 0.009 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.003 | 107.682 | 0.960 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000006da97f | 99.359 | 84.098 | 0.000 | 11.063 | 0.000 | 2.663 | 1.514 | 0.005 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.006 | 95.161 | 0.958 | 0.006 | node-14/thread-3/reader.observe | none observed |
| 505a9f741fba3f0f00000000006f507e | 99.073 | 21.120 | 0.000 | 0.000 | 0.000 | 32.127 | 44.425 | 0.053 | 0.000 | 1.330 | 0.000 | n/a | n/a | 0.018 | 21.120 | 0.213 | 0.018 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f00000000006fa71d | 93.296 | 70.074 | 0.000 | 6.014 | 0.000 | 3.466 | 13.692 | 0.011 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.006 | 76.088 | 0.816 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000006d3d06 | 80.402 | 64.131 | 0.000 | 9.623 | 0.000 | 1.603 | 4.981 | 0.023 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.008 | 73.754 | 0.917 | 0.008 | node-14/thread-3/reader.observe | none observed |
| 505a9f741fba3f0f00000000006f5114 | 73.925 | 54.790 | 0.000 | 7.640 | 0.000 | 2.439 | 8.981 | 0.029 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.004 | 62.429 | 0.844 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000006f7e3a | 73.340 | 60.067 | 0.000 | 8.238 | 0.000 | 1.805 | 3.193 | 0.010 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.004 | 68.305 | 0.931 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000006fc981 | 70.137 | 56.082 | 0.000 | 8.573 | 0.000 | 2.213 | 3.238 | 0.006 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.004 | 64.655 | 0.922 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000006d41cf | 67.822 | 42.321 | 0.000 | 17.685 | 0.000 | 1.858 | 5.925 | 0.008 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.004 | 60.006 | 0.885 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f000000000071c641 | 67.464 | 40.446 | 0.000 | 6.866 | 0.000 | 1.382 | 9.028 | 0.006 | 9.722 | 0.012 | 0.000 | n/a | n/a | 0.002 | 47.312 | 0.701 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000006e4124 | 63.146 | 47.890 | 0.000 | 12.670 | 0.000 | 1.067 | 1.496 | 0.005 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.004 | 60.561 | 0.959 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000006f72dd | 61.547 | 43.048 | 0.000 | 10.047 | 0.000 | 3.388 | 5.008 | 0.013 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.004 | 53.095 | 0.863 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000006b6db9 | 60.164 | 24.546 | 0.000 | 6.787 | 0.000 | 1.078 | 27.718 | 0.010 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.003 | 31.333 | 0.521 | 0.003 | gw-r/thread-97/gateway.admitted-work | none observed |
| 505a9f741fba3f0f0000000000716b40 | 59.561 | 37.359 | 0.000 | 20.271 | 0.000 | 0.974 | 0.949 | 0.002 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.002 | 57.631 | 0.968 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000006f464a | 59.364 | 45.641 | 0.000 | 7.868 | 0.000 | 1.759 | 4.035 | 0.021 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.007 | 53.509 | 0.901 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000006c5841 | 56.921 | 34.226 | 0.000 | 6.127 | 0.000 | 1.274 | 1.666 | 0.003 | 13.618 | 0.005 | 0.000 | n/a | n/a | 0.002 | 40.353 | 0.709 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000006f5091 | 56.557 | 38.019 | 0.000 | 0.000 | 0.000 | 13.955 | 4.531 | 0.012 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.009 | 38.019 | 0.672 | 0.009 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h3 / read (142 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.077 | 0.076 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.076 | 0.955 | 0.001 |
| p99 | 246.415 | 103.618 | 0.000 | 26.825 | 0.000 | 36.412 | 43.517 | 0.933 | 17.403 | 1.041 | 0.000 | n/a | n/a | 0.018 | 141.500 | 0.996 | 0.018 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 505a9f741fba3f0f00000000007444e9 | 247.561 | 103.618 | 0.000 | 137.278 | 0.000 | 2.655 | 3.979 | 0.014 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.003 | 240.896 | 0.973 | 0.003 | node-14/thread-3/node.gc | none observed |
| 505a9f741fba3f0f000000000078e582 | 246.415 | 35.919 | 0.000 | 0.000 | 0.000 | 207.519 | 2.932 | 0.014 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.004 | 35.919 | 0.146 | 0.004 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f0000000000790246 | 156.064 | 37.363 | 0.000 | 0.000 | 0.000 | 36.412 | 81.169 | 0.066 | 0.000 | 1.041 | 0.000 | n/a | n/a | 0.014 | 37.363 | 0.239 | 0.014 | gw-r/thread-173/gateway.route | none observed |
| 505a9f741fba3f0f0000000000795dff | 146.210 | 114.675 | 0.000 | 26.825 | 0.000 | 1.262 | 3.389 | 0.012 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.006 | 141.500 | 0.968 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000007906b1 | 132.206 | 89.362 | 0.000 | 6.670 | 0.000 | 5.740 | 30.372 | 0.012 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.005 | 96.032 | 0.726 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f000000000076d0eb | 110.589 | 81.190 | 0.000 | 7.780 | 0.000 | 7.868 | 13.629 | 0.016 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.009 | 88.969 | 0.805 | 0.009 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f0000000000727be5 | 106.139 | 73.207 | 0.000 | 8.146 | 0.000 | 1.444 | 23.277 | 0.029 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.004 | 81.353 | 0.766 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f000000000072ae98 | 104.295 | 89.387 | 0.000 | 8.622 | 0.000 | 3.023 | 3.239 | 0.005 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.006 | 98.009 | 0.940 | 0.006 | node-14/thread-3/reader.observe | none observed |
| 505a9f741fba3f0f00000000007870d6 | 99.543 | 81.676 | 0.000 | 11.506 | 0.000 | 2.133 | 4.171 | 0.008 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.007 | 93.181 | 0.936 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000007900fb | 82.165 | 19.883 | 0.000 | 0.000 | 0.000 | 13.121 | 43.517 | 3.414 | 0.000 | 2.224 | 0.000 | n/a | n/a | 0.006 | 19.883 | 0.242 | 0.006 | gw-r/thread-173/gateway.admitted-work | none observed |
| 505a9f741fba3f0f000000000079a343 | 77.958 | 40.815 | 0.000 | 11.328 | 0.000 | 1.064 | 6.711 | 0.029 | 17.982 | 0.025 | 0.000 | n/a | n/a | 0.003 | 52.144 | 0.669 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f0000000000797607 | 77.266 | 59.311 | 0.000 | 9.219 | 0.000 | 2.398 | 6.295 | 0.009 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.004 | 68.531 | 0.887 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000007624ac | 73.206 | 45.276 | 0.000 | 13.213 | 0.000 | 3.505 | 11.162 | 0.010 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.005 | 58.489 | 0.799 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f000000000072744f | 70.895 | 60.434 | 0.000 | 5.927 | 0.000 | 1.270 | 3.240 | 0.005 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.009 | 66.360 | 0.936 | 0.009 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f000000000073c81a | 67.652 | 35.912 | 0.000 | 3.730 | 0.000 | 1.559 | 8.983 | 0.013 | 17.403 | 0.047 | 0.000 | n/a | n/a | 0.004 | 39.643 | 0.586 | 0.004 | node-14/thread-3/reader.observe | none observed |
| 505a9f741fba3f0f00000000007901da | 64.108 | 12.712 | 0.000 | 0.000 | 0.000 | 25.686 | 24.534 | 0.933 | 0.000 | 0.226 | 0.000 | n/a | n/a | 0.018 | 12.712 | 0.198 | 0.018 | gw-r/thread-173/gateway.admitted-work | none observed |
| 505a9f741fba3f0f00000000007627a2 | 64.038 | 48.954 | 0.000 | 9.487 | 0.000 | 1.801 | 3.742 | 0.014 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.003 | 58.441 | 0.913 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f0000000000748f56 | 60.793 | 47.892 | 0.000 | 7.577 | 0.000 | 1.498 | 3.764 | 0.015 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.005 | 55.470 | 0.912 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f000000000074f88e | 59.416 | 48.352 | 0.000 | 6.727 | 0.000 | 0.988 | 3.296 | 0.014 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.004 | 55.079 | 0.927 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f000000000072d2f2 | 58.608 | 41.056 | 0.000 | 13.196 | 0.000 | 1.217 | 3.099 | 0.010 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.004 | 54.252 | 0.926 | 0.004 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h10 / read (105 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.146 | 0.144 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.144 | 0.958 | 0.001 |
| p99 | 148.372 | 72.583 | 0.000 | 27.271 | 0.000 | 105.039 | 22.806 | 0.054 | 45.466 | 0.101 | 0.000 | n/a | n/a | 0.011 | 79.453 | 0.998 | 0.011 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 505a9f741fba3f0f00000000007b096c | 162.759 | 0.301 | 0.000 | 0.000 | 0.000 | 162.030 | 0.414 | 0.003 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.002 | 0.301 | 0.002 | 0.002 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f00000000007f21a7 | 148.372 | 41.412 | 0.000 | 0.000 | 0.000 | 105.039 | 1.854 | 0.023 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.005 | 41.412 | 0.279 | 0.005 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f00000000007d1ea1 | 120.906 | 29.024 | 0.000 | 0.000 | 0.000 | 90.548 | 1.302 | 0.007 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.003 | 29.024 | 0.240 | 0.003 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f00000000007f20a1 | 114.001 | 82.201 | 0.000 | 9.256 | 0.000 | 16.012 | 6.435 | 0.049 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.004 | 91.458 | 0.802 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000007f1f13 | 111.471 | 72.583 | 0.000 | 6.870 | 0.000 | 17.106 | 14.788 | 0.014 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.009 | 79.453 | 0.713 | 0.009 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000007ec421 | 84.443 | 13.991 | 0.000 | 0.000 | 0.000 | 45.717 | 2.993 | 0.014 | 0.000 | 21.721 | 0.000 | n/a | n/a | 0.007 | 13.991 | 0.166 | 0.007 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f00000000007e1543 | 81.167 | 46.202 | 0.000 | 3.779 | 0.000 | 2.514 | 28.561 | 0.054 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.003 | 49.981 | 0.616 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f0000000000800bd9 | 77.482 | 47.203 | 0.000 | 7.353 | 0.000 | 1.554 | 3.591 | 0.011 | 17.753 | 0.014 | 0.000 | n/a | n/a | 0.003 | 54.556 | 0.704 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000007aa3f5 | 77.427 | 43.892 | 0.000 | 27.271 | 0.000 | 1.885 | 4.312 | 0.031 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.008 | 71.162 | 0.919 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000007ec40e | 76.865 | 19.247 | 0.000 | 0.000 | 0.000 | 1.927 | 3.671 | 0.021 | 51.963 | 0.030 | 0.000 | n/a | n/a | 0.006 | 19.247 | 0.250 | 0.006 | gw-r/thread--1/jdk.GCPhasePause | none observed |
| 505a9f741fba3f0f00000000007e10f6 | 73.093 | 36.344 | 0.000 | 6.152 | 0.000 | 1.336 | 2.130 | 0.008 | 27.106 | 0.016 | 0.000 | n/a | n/a | 0.002 | 42.495 | 0.581 | 0.002 | gw-r/thread--1/jdk.GCPhasePause | none observed |
| 505a9f741fba3f0f000000000079ea84 | 68.334 | 51.100 | 0.000 | 7.165 | 0.000 | 2.061 | 7.950 | 0.015 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.005 | 58.265 | 0.853 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000007b83c3 | 66.827 | 38.337 | 0.000 | 12.932 | 0.000 | 1.017 | 5.903 | 0.010 | 8.610 | 0.010 | 0.000 | n/a | n/a | 0.009 | 51.269 | 0.767 | 0.009 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000007d1e61 | 66.407 | 5.119 | 0.000 | 58.618 | 0.000 | 0.917 | 1.706 | 0.015 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.003 | 63.737 | 0.960 | 0.003 | node-14/thread-3/node.gc | none observed |
| 505a9f741fba3f0f00000000008109c5 | 63.488 | 36.902 | 0.000 | 5.741 | 0.000 | 1.361 | 7.032 | 0.002 | 12.445 | 0.003 | 0.000 | n/a | n/a | 0.002 | 42.643 | 0.672 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000007ef01b | 62.574 | 38.913 | 0.000 | 6.316 | 0.000 | 1.090 | 5.843 | 0.003 | 10.400 | 0.005 | 0.000 | n/a | n/a | 0.004 | 45.229 | 0.723 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000007a9474 | 61.671 | 36.844 | 0.000 | 6.324 | 0.000 | 1.235 | 5.528 | 0.005 | 11.725 | 0.010 | 0.000 | n/a | n/a | 0.002 | 43.167 | 0.700 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000007a3216 | 60.431 | 46.884 | 0.000 | 5.832 | 0.000 | 3.577 | 4.079 | 0.013 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.003 | 52.716 | 0.872 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000007e2daa | 59.932 | 48.204 | 0.000 | 8.193 | 0.000 | 1.126 | 2.384 | 0.007 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.003 | 56.396 | 0.941 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 505a9f741fba3f0f00000000007eec01 | 54.184 | 32.104 | 0.000 | 5.213 | 0.000 | 1.243 | 15.602 | 0.006 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.003 | 37.317 | 0.689 | 0.003 | node-14/thread-3/replica.pull-at | none observed |

## P5 / presweep / read (6407 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 109.820 | 2.742 | 0.000 | 0.000 | 0.000 | 51.248 | 0.973 | 0.006 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.003 | 24.335 | 0.250 | 0.003 |
| p99 | 579.482 | 213.157 | 0.000 | 50.295 | 407.937 | 455.098 | 17.400 | 50.967 | 0.234 | 0.086 | 0.000 | n/a | n/a | 0.019 | 430.632 | 1.000 | 0.019 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02348800e68cc67e000000000030922d | 1744.555 | 288.201 | 0.000 | 60.503 | 63.745 | 1311.512 | 20.525 | 0.024 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.004 | 412.448 | 0.236 | 0.004 | node-14/thread-5/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000084c1ad | 1512.427 | 300.388 | 0.000 | 65.851 | 22.157 | 1110.021 | 13.924 | 0.025 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.006 | 388.397 | 0.257 | 0.006 | node-14/thread-3/socket.wait-first-byte | none observed |
| 2a2c225191da714e00000000002d5929 | 1372.629 | 277.746 | 0.000 | 42.792 | 10.386 | 1019.078 | 20.760 | 1.819 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.004 | 330.924 | 0.241 | 0.004 | node-14/thread-4/socket.wait-first-byte | none observed |
| 02348800e68cc67e00000000003093ac | 1342.623 | 225.501 | 0.000 | 74.677 | 57.312 | 968.661 | 16.406 | 0.017 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.004 | 357.491 | 0.266 | 0.004 | node-14/thread-5/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000084c262 | 1342.281 | 287.295 | 0.000 | 76.273 | 12.531 | 910.269 | 55.854 | 0.018 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.002 | 376.099 | 0.280 | 0.002 | node-14/thread-3/socket.wait-first-byte | none observed |
| 02348800e68cc67e00000000002e0250 | 1331.077 | 349.333 | 0.000 | 229.915 | 7.059 | 637.129 | 98.994 | 8.558 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.003 | 586.307 | 0.440 | 0.003 | node-14/thread-5/socket.wait-first-byte | none observed |
| 02348800e68cc67e00000000002e00e3 | 1190.722 | 531.368 | 0.000 | 95.277 | 14.239 | 489.818 | 52.919 | 7.048 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.007 | 640.885 | 0.538 | 0.007 | node-14/thread-5/replica.pull-at | none observed |
| 2a2c225191da714e00000000002d59d7 | 1186.431 | 428.726 | 0.000 | 76.560 | 195.286 | 416.109 | 66.477 | 3.221 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.004 | 700.572 | 0.590 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| 505a9f741fba3f0f000000000084c2d2 | 1182.177 | 292.898 | 0.000 | 83.367 | 236.177 | 554.157 | 15.479 | 0.033 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.005 | 612.441 | 0.518 | 0.005 | node-14/thread-3/socket.wait-first-byte | none observed |
| 02348800e68cc67e00000000003093b4 | 1139.689 | 400.555 | 0.000 | 93.617 | 114.700 | 511.646 | 19.101 | 0.026 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.003 | 608.873 | 0.534 | 0.003 | node-14/thread-5/socket.wait-first-byte | none observed |
| 2a2c225191da714e00000000002fbf58 | 1112.320 | 393.020 | 0.000 | 74.083 | 241.211 | 374.691 | 29.211 | 0.030 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.003 | 708.313 | 0.637 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 2a2c225191da714e00000000002dc1c4 | 1088.294 | 403.467 | 0.000 | 139.870 | 10.786 | 461.694 | 72.425 | 0.015 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.004 | 554.123 | 0.509 | 0.004 | node-14/thread-4/socket.wait-first-byte | none observed |
| 2a2c225191da714e00000000002d2ce5 | 999.366 | 349.237 | 0.000 | 51.208 | 6.691 | 579.180 | 12.990 | 0.017 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.005 | 407.137 | 0.407 | 0.005 | node-14/thread-4/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f00000000008247e9 | 934.337 | 18.912 | 0.000 | 7.709 | 0.000 | 904.924 | 2.758 | 0.009 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.004 | 26.621 | 0.028 | 0.004 | node-14/thread-3/socket.wait-first-byte | none observed |
| 2a2c225191da714e00000000002d59c3 | 918.539 | 338.159 | 0.000 | 72.198 | 5.809 | 441.658 | 60.665 | 0.016 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.003 | 416.167 | 0.453 | 0.003 | node-14/thread-4/socket.wait-first-byte | none observed |
| 2a2c225191da714e00000000002dc17c | 900.858 | 391.861 | 0.000 | 85.825 | 379.452 | 6.180 | 37.476 | 0.019 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.004 | 857.138 | 0.951 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| 505a9f741fba3f0f000000000082449f | 893.851 | 214.953 | 0.000 | 46.547 | 0.000 | 321.501 | 308.226 | 2.606 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.004 | 261.500 | 0.293 | 0.004 | gw-r/thread-86/gateway.response-write | none observed |
| 505a9f741fba3f0f000000000082489d | 851.457 | 3.751 | 0.000 | 0.000 | 0.000 | 846.552 | 1.126 | 0.010 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.006 | 3.751 | 0.004 | 0.006 | node-14/thread-3/socket.wait-first-byte | none observed |
| 2a2c225191da714e00000000002d7e0e | 807.123 | 46.145 | 0.000 | 7.794 | 327.442 | 419.067 | 3.600 | 3.024 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.003 | 381.381 | 0.473 | 0.003 | node-14/thread-4/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000082496f | 783.526 | 31.838 | 0.000 | 3.887 | 38.100 | 707.128 | 2.534 | 0.013 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.005 | 73.825 | 0.094 | 0.005 | node-14/thread-3/socket.wait-first-byte | none observed |

## P5 / sweep / read (126 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 103.847 | 5.080 | 0.000 | 0.000 | 0.000 | 73.746 | 1.560 | 0.008 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.004 | 9.405 | 0.155 | 0.004 |
| p99 | 879.711 | 58.749 | 0.000 | 20.933 | 193.930 | 874.279 | 17.804 | 4.686 | 27.863 | 3.553 | 0.000 | n/a | n/a | 0.033 | 197.966 | 1.000 | 0.033 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02348800e68cc67e0000000000309660 | 883.721 | 2.562 | 0.000 | 4.093 | 0.000 | 876.092 | 0.922 | 0.023 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.004 | 6.655 | 0.008 | 0.004 | node-14/thread-5/socket.wait-first-byte | none observed |
| 02348800e68cc67e0000000000309649 | 879.711 | 3.920 | 0.000 | 0.000 | 0.000 | 874.279 | 1.456 | 0.013 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.007 | 3.920 | 0.004 | 0.007 | node-14/thread-5/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000084c4f8 | 692.686 | 5.525 | 0.000 | 0.000 | 0.000 | 686.216 | 0.917 | 0.006 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.003 | 5.525 | 0.008 | 0.003 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000084c4d9 | 688.360 | 9.617 | 0.000 | 5.041 | 0.000 | 672.740 | 0.932 | 0.009 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.008 | 14.657 | 0.021 | 0.008 | node-14/thread-3/socket.wait-first-byte | none observed |
| 2a2c225191da714e00000000002fc3c3 | 318.176 | 13.912 | 0.000 | 2.965 | 0.000 | 298.089 | 3.152 | 0.025 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.003 | 16.877 | 0.053 | 0.003 | node-14/thread-4/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000084c8c0 | 232.230 | 10.680 | 0.000 | 0.000 | 0.000 | 216.931 | 4.588 | 0.007 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.002 | 10.680 | 0.046 | 0.002 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000084caa3 | 228.209 | 45.984 | 0.000 | 7.287 | 0.000 | 171.348 | 3.550 | 0.015 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.003 | 53.271 | 0.233 | 0.003 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000084c981 | 226.356 | 17.411 | 0.000 | 0.000 | 0.000 | 208.129 | 0.794 | 0.005 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.005 | 17.411 | 0.077 | 0.005 | node-14/thread-3/socket.wait-first-byte | none observed |
| 02348800e68cc67e00000000003098ca | 225.962 | 10.760 | 0.000 | 0.000 | 0.000 | 202.145 | 13.014 | 0.011 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.007 | 10.760 | 0.048 | 0.007 | node-14/thread-5/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000084c8cf | 220.718 | 4.811 | 0.000 | 0.000 | 0.000 | 211.929 | 3.947 | 0.010 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.005 | 4.811 | 0.022 | 0.005 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000084c7f5 | 214.147 | 12.543 | 0.000 | 0.000 | 0.000 | 199.777 | 1.776 | 0.010 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.003 | 12.543 | 0.059 | 0.003 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000084ca50 | 208.397 | 12.666 | 0.000 | 5.024 | 0.000 | 189.852 | 0.834 | 0.006 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.003 | 17.689 | 0.085 | 0.003 | node-14/thread-3/socket.wait-first-byte | none observed |
| 02348800e68cc67e00000000003098fc | 206.734 | 23.021 | 0.000 | 3.815 | 0.000 | 174.761 | 4.110 | 0.982 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.004 | 26.836 | 0.130 | 0.004 | node-14/thread-5/socket.wait-first-byte | none observed |
| 02348800e68cc67e000000000030995f | 203.193 | 3.290 | 0.000 | 0.000 | 0.000 | 190.443 | 0.935 | 8.506 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.004 | 3.290 | 0.016 | 0.004 | node-14/thread-5/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000084ca63 | 199.101 | 7.994 | 0.000 | 0.000 | 0.000 | 190.037 | 1.046 | 0.005 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.004 | 7.994 | 0.040 | 0.004 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000084c8a5 | 198.641 | 30.740 | 0.000 | 7.500 | 0.000 | 158.898 | 1.481 | 0.007 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.004 | 38.240 | 0.193 | 0.004 | node-14/thread-3/socket.wait-first-byte | none observed |
| 505a9f741fba3f0f000000000084c43e | 198.151 | 4.218 | 0.000 | 0.000 | 193.930 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 198.148 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 505a9f741fba3f0f000000000084c443 | 197.970 | 1.402 | 0.000 | 0.000 | 196.564 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 197.966 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 2a2c225191da714e00000000002fc7a0 | 190.044 | 47.860 | 0.000 | 12.503 | 0.000 | 127.490 | 2.160 | 0.010 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.004 | 60.363 | 0.318 | 0.004 | node-14/thread-4/socket.wait-first-byte | none observed |
| 02348800e68cc67e00000000003098dd | 180.724 | 57.087 | 0.000 | 8.709 | 0.000 | 104.423 | 10.459 | 0.012 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.004 | 65.797 | 0.364 | 0.004 | node-14/thread-5/socket.wait-first-byte | none observed |

## P3 / outside-phases / read (44 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.588 | 0.053 | 0.000 | 0.000 | 0.000 | 0.813 | 200.633 | 0.008 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.089 | 0.053 | 0.000 | 0.089 |
| p99 | 473.617 | 154.614 | 0.000 | 19.545 | 0.000 | 6.335 | 256.908 | 2.219 | 38.413 | 0.499 | 0.000 | n/a | n/a | 1.184 | 174.159 | 0.368 | 1.184 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d5500000000000013139 | 473.617 | 154.614 | 0.000 | 19.545 | 0.000 | 3.950 | 256.908 | 0.012 | 38.413 | 0.010 | 0.000 | n/a | n/a | 0.165 | 174.159 | 0.368 | 0.165 | gw-r/thread-46/gateway.admitted-work | none observed |
| 7152304862c892b50000000000000009 | 214.486 | 1.167 | 0.000 | 0.000 | 0.000 | 1.768 | 193.360 | 0.175 | 16.750 | 0.081 | 0.000 | n/a | n/a | 1.184 | 1.167 | 0.005 | 1.184 | gw-r/thread-48/gateway.admitted-work | none observed |
| e606a721a887d5500000000000009541 | 210.726 | 0.027 | 0.000 | 0.000 | 0.000 | 0.562 | 178.490 | 0.005 | 31.546 | 0.027 | 0.000 | n/a | n/a | 0.069 | 0.027 | 0.000 | 0.069 | gw-r/thread-91/journal/page | none observed |
| e606a721a887d5500000000000000021 | 206.933 | 0.139 | 0.000 | 0.000 | 0.000 | 2.753 | 203.106 | 0.083 | 0.000 | 0.353 | 0.000 | n/a | n/a | 0.498 | 0.139 | 0.001 | 0.498 | gw-r/thread-53/journal/page | none observed |
| e606a721a887d550000000000000a069 | 205.805 | 0.057 | 0.000 | 0.000 | 0.000 | 0.734 | 204.894 | 0.010 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.079 | 0.057 | 0.000 | 0.079 | gw-r/thread-104/journal/page | none observed |
| e606a721a887d550000000000000acb9 | 205.079 | 0.066 | 0.000 | 0.000 | 0.000 | 1.135 | 202.955 | 0.049 | 0.000 | 0.499 | 0.000 | n/a | n/a | 0.374 | 0.066 | 0.000 | 0.374 | gw-r/thread-46/journal/page | none observed |
| e606a721a887d5500000000000009579 | 204.974 | 0.041 | 0.000 | 0.000 | 0.000 | 1.132 | 203.705 | 0.007 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.064 | 0.041 | 0.000 | 0.064 | gw-r/thread-139/journal/page | none observed |
| e606a721a887d5500000000000000029 | 204.970 | 0.266 | 0.000 | 0.000 | 0.000 | 2.394 | 201.865 | 0.029 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.226 | 0.266 | 0.001 | 0.226 | gw-r/thread-52/journal/page | none observed |
| e606a721a887d5500000000000000039 | 203.853 | 0.081 | 0.000 | 0.000 | 0.000 | 2.007 | 201.363 | 0.050 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.196 | 0.081 | 0.000 | 0.196 | gw-r/thread-52/journal/page | none observed |
| e606a721a887d5500000000000000031 | 202.856 | 0.082 | 0.000 | 0.000 | 0.000 | 1.122 | 201.149 | 0.021 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.311 | 0.082 | 0.000 | 0.311 | gw-r/thread-53/journal/page | none observed |
| e606a721a887d550000000000000a051 | 202.741 | 0.021 | 0.000 | 0.000 | 0.000 | 0.556 | 202.042 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.063 | 0.021 | 0.000 | 0.063 | gw-r/thread-91/journal/page | none observed |
| e606a721a887d550000000000000ace9 | 202.373 | 0.042 | 0.000 | 0.000 | 0.000 | 0.903 | 201.271 | 0.012 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.068 | 0.042 | 0.000 | 0.068 | gw-r/thread-161/journal/page | none observed |
| e606a721a887d55000000000000130f1 | 202.230 | 0.040 | 0.000 | 0.000 | 0.000 | 0.839 | 201.180 | 0.009 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.070 | 0.040 | 0.000 | 0.070 | gw-r/thread-173/journal/page | none observed |
| e606a721a887d550000000000000acf1 | 202.212 | 0.038 | 0.000 | 0.000 | 0.000 | 0.937 | 201.038 | 0.011 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.092 | 0.038 | 0.000 | 0.092 | gw-r/thread-150/journal/page | none observed |
| e606a721a887d5500000000000008279 | 202.133 | 0.074 | 0.000 | 0.000 | 0.000 | 0.813 | 201.093 | 0.003 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.066 | 0.074 | 0.000 | 0.066 | gw-r/thread-123/journal/page | none observed |
| e606a721a887d5500000000000013101 | 201.934 | 0.045 | 0.000 | 0.000 | 0.000 | 0.748 | 200.938 | 0.012 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.110 | 0.045 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| e606a721a887d550000000000000acc9 | 201.802 | 0.028 | 0.000 | 0.000 | 0.000 | 0.887 | 200.741 | 0.005 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.087 | 0.028 | 0.000 | 0.087 | gw-r/thread-46/journal/page | none observed |
| e606a721a887d5500000000000009551 | 201.780 | 0.016 | 0.000 | 0.000 | 0.000 | 0.486 | 201.125 | 0.026 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.060 | 0.016 | 0.000 | 0.060 | gw-r/thread-171/journal/page | none observed |
| e606a721a887d550000000000000ace1 | 201.739 | 0.030 | 0.000 | 0.000 | 0.000 | 0.844 | 200.690 | 0.010 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.105 | 0.030 | 0.000 | 0.105 | gw-r/thread-150/journal/page | none observed |
| e606a721a887d5500000000000009569 | 201.734 | 0.044 | 0.000 | 0.000 | 0.000 | 0.631 | 200.939 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.089 | 0.044 | 0.000 | 0.089 | gw-r/thread-157/journal/page | none observed |

## P3 / outside-phases / internal (21 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 281.770 | 3.622 | 0.000 | 0.000 | 0.000 | 0.716 | 277.948 | 0.024 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.103 | 3.622 | 0.013 | 0.103 |
| p99 | 22498.293 | 185.476 | 0.000 | 12.111 | 0.000 | 21492.027 | 1004.117 | 3.043 | 85.354 | 1.061 | 0.000 | n/a | n/a | 4.608 | 197.587 | 0.763 | 4.608 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b50000000000000519 | 22498.293 | 0.248 | 0.000 | 0.000 | 0.000 | 21492.027 | 1004.117 | 0.058 | 0.000 | 1.061 | 0.000 | n/a | n/a | 0.782 | 0.248 | 0.000 | 0.782 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7152304862c892b50000000000000523 | 6635.886 | 0.152 | 0.000 | 0.000 | 0.000 | 5632.242 | 1002.737 | 0.077 | 0.000 | 0.287 | 0.000 | n/a | n/a | 0.392 | 0.152 | 0.000 | 0.392 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7152304862c892b5000000000000f43d | 1096.453 | 185.476 | 0.000 | 12.111 | 0.000 | 1.604 | 891.022 | 1.593 | 0.000 | 0.040 | 0.000 | n/a | n/a | 4.608 | 197.587 | 0.180 | 4.608 | gw-r/thread-49/journal/page | none observed |
| 7152304862c892b50000000000000537 | 1012.106 | 1.198 | 0.000 | 0.000 | 0.000 | 2.188 | 921.619 | 0.094 | 85.354 | 0.303 | 0.000 | n/a | n/a | 1.349 | 1.198 | 0.001 | 1.349 | gw-r/thread-52/journal/page | none observed |
| 7152304862c892b5000000000000052d | 1005.496 | 0.233 | 0.000 | 0.000 | 0.000 | 1.370 | 1002.202 | 0.056 | 0.000 | 0.439 | 0.000 | n/a | n/a | 1.196 | 0.233 | 0.000 | 1.196 | gw-r/thread-48/journal/page | none observed |
| 7152304862c892b50000000000018f91 | 996.182 | 4.821 | 0.000 | 0.000 | 0.000 | 0.557 | 990.332 | 0.347 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.103 | 4.821 | 0.005 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 7152304862c892b5000000000000ee29 | 979.799 | 4.283 | 0.000 | 0.000 | 0.000 | 0.716 | 952.464 | 0.240 | 21.928 | 0.046 | 0.000 | n/a | n/a | 0.121 | 4.283 | 0.004 | 0.121 | gw-r/thread-144/journal/page | none observed |
| 7152304862c892b50000000000000541 | 874.988 | 38.111 | 0.000 | 4.208 | 0.000 | 2.992 | 827.793 | 0.024 | 0.000 | 0.165 | 0.000 | n/a | n/a | 1.695 | 42.320 | 0.048 | 1.695 | gw-r/thread-51/journal/page | none observed |
| 7152304862c892b50000000000018f61 | 454.482 | 10.229 | 0.000 | 0.000 | 0.000 | 0.778 | 442.996 | 0.149 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.304 | 10.229 | 0.023 | 0.304 | gw-r/thread-136/journal/page | none observed |
| 7152304862c892b50000000000018f71 | 411.376 | 3.488 | 0.000 | 0.000 | 0.000 | 0.754 | 406.999 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.086 | 3.488 | 0.008 | 0.086 | gw-r/thread-136/journal/page | none observed |
| 7152304862c892b5000000000001164f | 281.770 | 3.191 | 0.000 | 0.000 | 0.000 | 0.526 | 277.948 | 0.006 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.067 | 3.191 | 0.011 | 0.067 | gw-r/thread-99/journal/page | none observed |
| 7152304862c892b5000000000001166f | 279.542 | 3.622 | 0.000 | 0.000 | 0.000 | 0.510 | 275.155 | 0.129 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.077 | 3.622 | 0.013 | 0.077 | gw-r/thread-171/journal/page | none observed |
| 7152304862c892b5000000000000ee39 | 270.147 | 2.566 | 0.000 | 0.000 | 0.000 | 0.579 | 263.804 | 3.043 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.108 | 2.566 | 0.009 | 0.108 | gw-r/thread-76/journal/page | none observed |
| 7152304862c892b5000000000000ee19 | 264.598 | 2.676 | 0.000 | 0.000 | 0.000 | 0.646 | 229.503 | 0.005 | 31.648 | 0.033 | 0.000 | n/a | n/a | 0.087 | 2.676 | 0.010 | 0.087 | gw-r/thread-163/journal/page | none observed |
| 7152304862c892b5000000000001163f | 182.047 | 4.683 | 0.000 | 0.000 | 0.000 | 0.532 | 176.713 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.069 | 4.683 | 0.026 | 0.069 | gw-r/thread-171/journal/page | none observed |
| 7152304862c892b5000000000001167f | 130.962 | 10.663 | 0.000 | 0.000 | 0.000 | 0.593 | 119.516 | 0.007 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.149 | 10.663 | 0.081 | 0.149 | gw-r/thread-113/journal/page | none observed |
| 7152304862c892b5000000000001165f | 87.455 | 4.142 | 0.000 | 0.000 | 0.000 | 1.637 | 81.546 | 0.007 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.083 | 4.142 | 0.047 | 0.083 | gw-r/thread-171/journal/page | none observed |
| 7152304862c892b50000000000018fa1 | 49.860 | 7.740 | 0.000 | 0.000 | 0.000 | 2.808 | 39.105 | 0.024 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.092 | 7.740 | 0.155 | 0.092 | gw-r/thread-150/journal/page | none observed |
| 7152304862c892b50000000000018f81 | 26.726 | 2.617 | 0.000 | 0.000 | 0.000 | 0.540 | 23.470 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.059 | 2.617 | 0.098 | 0.059 | gw-r/thread-46/journal/page | none observed |
| 7152304862c892b5000000000001162f | 6.758 | 5.159 | 0.000 | 0.000 | 0.000 | 0.630 | 0.867 | 0.005 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.091 | 5.159 | 0.763 | 0.091 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (30 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 450.345 | 7.553 | 0.000 | 0.565 | 0.000 | 1.532 | 433.811 | 0.036 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.188 | 8.379 | 0.026 | 0.188 |
| p99 | 1004.281 | 132.285 | 0.000 | 6.862 | 0.000 | 55.659 | 1001.351 | 2.904 | 25.876 | 0.482 | 0.000 | n/a | n/a | 7.635 | 132.285 | 0.795 | 7.635 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b500000000000006fb | 1004.281 | 0.272 | 0.000 | 0.000 | 0.000 | 1.306 | 1001.351 | 0.028 | 0.000 | 0.160 | 0.000 | n/a | n/a | 1.162 | 0.272 | 0.000 | 1.162 | gw-r/thread-79/journal/page | none observed |
| 7152304862c892b500000000000006b1 | 1004.088 | 0.189 | 0.000 | 0.000 | 0.000 | 1.078 | 975.567 | 0.026 | 25.876 | 0.210 | 0.000 | n/a | n/a | 1.142 | 0.189 | 0.000 | 1.142 | gw-r/thread-48/journal/page | none observed |
| 7152304862c892b50000000000000715 | 952.373 | 8.560 | 0.000 | 0.655 | 0.000 | 2.597 | 940.005 | 0.018 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.417 | 9.215 | 0.010 | 0.417 | gw-r/thread-77/journal/page | none observed |
| 7152304862c892b50000000000000611 | 948.227 | 17.390 | 0.000 | 6.862 | 0.000 | 2.958 | 917.746 | 2.904 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.178 | 24.251 | 0.026 | 0.178 | gw-r/thread-76/journal/page | none observed |
| 7152304862c892b50000000000000651 | 921.609 | 13.014 | 0.000 | 0.686 | 0.000 | 3.811 | 903.524 | 0.026 | 0.000 | 0.369 | 0.000 | n/a | n/a | 0.179 | 13.700 | 0.015 | 0.179 | gw-r/thread-46/journal/page | none observed |
| 7152304862c892b500000000000005d1 | 893.991 | 13.625 | 0.000 | 1.505 | 0.000 | 1.532 | 874.623 | 2.223 | 0.000 | 0.323 | 0.000 | n/a | n/a | 0.161 | 15.130 | 0.017 | 0.161 | gw-r/thread-50/journal/page | none observed |
| 7152304862c892b50000000000000691 | 885.408 | 6.479 | 0.000 | 0.542 | 0.000 | 1.648 | 876.492 | 0.013 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.163 | 7.021 | 0.008 | 0.163 | gw-r/thread-50/journal/page | none observed |
| 7152304862c892b500000000000005c1 | 839.005 | 16.677 | 0.000 | 0.000 | 0.000 | 10.563 | 811.288 | 0.063 | 0.000 | 0.243 | 0.000 | n/a | n/a | 0.171 | 16.677 | 0.020 | 0.171 | gw-r/thread-52/journal/page | none observed |
| 7152304862c892b50000000000000581 | 826.077 | 132.285 | 0.000 | 0.000 | 0.000 | 7.741 | 678.408 | 0.148 | 0.000 | 0.238 | 0.000 | n/a | n/a | 7.255 | 132.285 | 0.160 | 7.255 | gw-r/thread-74/journal/page | none observed |
| 7152304862c892b50000000000000621 | 811.424 | 6.354 | 0.000 | 1.928 | 0.000 | 1.722 | 801.149 | 0.017 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.113 | 8.282 | 0.010 | 0.113 | gw-r/thread-52/journal/page | none observed |
| 7152304862c892b50000000000000601 | 651.205 | 27.641 | 0.000 | 1.294 | 0.000 | 10.909 | 609.637 | 1.056 | 0.000 | 0.482 | 0.000 | n/a | n/a | 0.185 | 28.936 | 0.044 | 0.185 | gw-r/thread-71/journal/page | none observed |
| 7152304862c892b50000000000000561 | 552.895 | 18.718 | 0.000 | 0.000 | 0.000 | 1.316 | 532.205 | 0.046 | 0.000 | 0.218 | 0.000 | n/a | n/a | 0.391 | 18.718 | 0.034 | 0.391 | gw-r/thread-50/journal/page | none observed |
| 7152304862c892b50000000000000671 | 514.976 | 4.377 | 0.000 | 0.826 | 0.000 | 1.524 | 507.982 | 0.017 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.089 | 5.203 | 0.010 | 0.089 | gw-r/thread-46/journal/page | none observed |
| 7152304862c892b50000000000000571 | 466.195 | 8.716 | 0.000 | 0.000 | 0.000 | 1.107 | 456.043 | 0.018 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.151 | 8.716 | 0.019 | 0.151 | gw-r/thread-52/journal/page | none observed |
| 7152304862c892b50000000000000661 | 453.016 | 15.989 | 0.000 | 1.751 | 0.000 | 1.097 | 433.811 | 0.028 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.181 | 17.740 | 0.039 | 0.181 | gw-r/thread-78/journal/page | none observed |
| 7152304862c892b50000000000000551 | 450.345 | 8.733 | 0.000 | 0.000 | 0.000 | 2.688 | 438.190 | 0.034 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.521 | 8.733 | 0.019 | 0.521 | gw-r/thread-48/journal/page | none observed |
| 7152304862c892b500000000000006eb | 405.065 | 3.517 | 0.000 | 0.000 | 0.000 | 1.097 | 397.362 | 0.229 | 0.000 | 0.095 | 0.000 | n/a | n/a | 2.765 | 3.517 | 0.009 | 2.765 | gw-r/thread-72/journal/page | none observed |
| 7152304862c892b50000000000000591 | 381.544 | 9.779 | 0.000 | 0.000 | 0.000 | 21.010 | 350.129 | 0.118 | 0.000 | 0.313 | 0.000 | n/a | n/a | 0.196 | 9.779 | 0.026 | 0.196 | gw-r/thread-48/journal/page | none observed |
| 7152304862c892b500000000000005a1 | 345.063 | 26.997 | 0.000 | 0.000 | 0.000 | 1.979 | 312.233 | 0.140 | 0.000 | 0.242 | 0.000 | n/a | n/a | 3.472 | 26.997 | 0.078 | 3.472 | gw-r/thread-76/journal/page | none observed |
| 7152304862c892b500000000000005f1 | 314.190 | 10.951 | 0.000 | 0.902 | 0.000 | 55.659 | 238.577 | 0.327 | 0.000 | 0.139 | 0.000 | n/a | n/a | 7.635 | 11.853 | 0.038 | 7.635 | gw-r/thread-51/journal/page | none observed |

## P3 / baseline / internal (102 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 398.804 | 4.343 | 0.000 | 0.000 | 0.000 | 0.847 | 394.818 | 0.015 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.118 | 4.382 | 0.013 | 0.118 |
| p99 | 1004.787 | 17.312 | 0.000 | 2.135 | 0.000 | 4.608 | 1002.655 | 0.866 | 0.000 | 0.351 | 0.000 | n/a | n/a | 1.386 | 18.665 | 0.643 | 1.386 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b50000000000000aab | 1020.049 | 0.160 | 0.000 | 0.000 | 0.000 | 9.213 | 1008.287 | 0.543 | 0.000 | 0.119 | 0.000 | n/a | n/a | 1.727 | 0.160 | 0.000 | 1.727 | gw-r/thread-76/journal/page | none observed |
| 7152304862c892b50000000000000af5 | 1004.787 | 0.210 | 0.000 | 0.000 | 0.000 | 0.692 | 1002.655 | 0.008 | 0.000 | 0.081 | 0.000 | n/a | n/a | 1.140 | 0.210 | 0.000 | 1.140 | gw-r/thread-50/journal/page | none observed |
| 7152304862c892b50000000000000767 | 1004.447 | 5.793 | 0.000 | 0.000 | 0.000 | 1.182 | 996.982 | 0.182 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.149 | 5.793 | 0.006 | 0.149 | gw-r/thread-50/journal/page | none observed |
| 7152304862c892b50000000000000911 | 1004.343 | 0.279 | 0.000 | 0.000 | 0.000 | 0.972 | 1001.574 | 0.034 | 0.000 | 0.184 | 0.000 | n/a | n/a | 1.299 | 0.279 | 0.000 | 1.299 | gw-r/thread-52/journal/page | none observed |
| 7152304862c892b500000000000007f7 | 1004.045 | 0.205 | 0.000 | 0.000 | 0.000 | 0.978 | 1001.608 | 0.027 | 0.000 | 0.100 | 0.000 | n/a | n/a | 1.128 | 0.205 | 0.000 | 1.128 | gw-r/thread-52/journal/page | none observed |
| 7152304862c892b5000000000000099b | 1003.327 | 0.182 | 0.000 | 0.000 | 0.000 | 0.772 | 1000.900 | 0.010 | 0.000 | 0.077 | 0.000 | n/a | n/a | 1.386 | 0.182 | 0.000 | 1.386 | gw-r/thread-51/journal/page | none observed |
| 7152304862c892b500000000000009f5 | 1003.295 | 0.188 | 0.000 | 0.000 | 0.000 | 0.841 | 1001.017 | 0.011 | 0.000 | 0.097 | 0.000 | n/a | n/a | 1.142 | 0.188 | 0.000 | 1.142 | gw-r/thread-53/journal/page | none observed |
| 7152304862c892b50000000000000cb1 | 1003.071 | 0.203 | 0.000 | 0.000 | 0.000 | 0.725 | 1000.925 | 0.012 | 0.000 | 0.061 | 0.000 | n/a | n/a | 1.145 | 0.203 | 0.000 | 1.145 | gw-r/thread-46/journal/page | none observed |
| 7152304862c892b50000000000000a4f | 1002.844 | 0.097 | 0.000 | 0.000 | 0.000 | 0.618 | 985.028 | 0.008 | 15.688 | 0.070 | 0.000 | n/a | n/a | 1.334 | 0.097 | 0.000 | 1.334 | gw-r/thread-73/journal/page | none observed |
| 7152304862c892b5000000000000094b | 1000.871 | 4.071 | 0.000 | 0.000 | 0.000 | 0.733 | 995.783 | 0.032 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.163 | 4.071 | 0.004 | 0.163 | gw-r/thread-52/journal/page | none observed |
| 7152304862c892b500000000000007a7 | 999.674 | 4.382 | 0.000 | 0.000 | 0.000 | 0.967 | 994.099 | 0.014 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.137 | 4.382 | 0.004 | 0.137 | gw-r/thread-72/journal/page | none observed |
| 7152304862c892b50000000000000b8f | 998.512 | 3.175 | 0.000 | 0.000 | 0.000 | 0.703 | 993.897 | 0.554 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.108 | 3.175 | 0.003 | 0.108 | gw-r/thread-78/journal/page | none observed |
| 7152304862c892b50000000000000725 | 995.620 | 4.293 | 0.000 | 0.895 | 0.000 | 0.875 | 989.338 | 0.020 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.108 | 5.188 | 0.005 | 0.108 | gw-r/thread-77/journal/page | none observed |
| 7152304862c892b50000000000000777 | 990.062 | 5.545 | 0.000 | 0.949 | 0.000 | 1.359 | 981.742 | 0.179 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.165 | 6.494 | 0.007 | 0.165 | gw-r/thread-73/journal/page | none observed |
| 7152304862c892b500000000000007b7 | 988.802 | 5.540 | 0.000 | 0.548 | 0.000 | 0.666 | 981.684 | 0.154 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.137 | 6.088 | 0.006 | 0.137 | gw-r/thread-72/journal/page | none observed |
| 7152304862c892b50000000000000c3f | 986.448 | 4.588 | 0.000 | 0.000 | 0.000 | 0.618 | 981.065 | 0.010 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.094 | 4.588 | 0.005 | 0.094 | gw-r/thread-72/journal/page | none observed |
| 7152304862c892b50000000000000bef | 980.695 | 3.097 | 0.000 | 0.000 | 0.000 | 0.599 | 976.820 | 0.008 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.093 | 3.097 | 0.003 | 0.093 | gw-r/thread-74/journal/page | none observed |
| 7152304862c892b50000000000000b5f | 974.832 | 5.569 | 0.000 | 0.000 | 0.000 | 1.189 | 967.896 | 0.008 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.099 | 5.569 | 0.006 | 0.099 | gw-r/thread-72/journal/page | none observed |
| 7152304862c892b50000000000000b0f | 957.880 | 3.190 | 0.000 | 0.000 | 0.000 | 0.571 | 953.944 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.118 | 3.190 | 0.003 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 7152304862c892b50000000000000b2f | 929.524 | 21.651 | 0.000 | 5.017 | 0.000 | 1.045 | 901.466 | 0.015 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.243 | 26.667 | 0.029 | 0.243 | gw-r/thread-79/journal/page | none observed |

## P3 / L1 / internal (102 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 327.212 | 3.710 | 0.000 | 0.000 | 0.000 | 0.828 | 320.164 | 0.010 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.102 | 3.710 | 0.013 | 0.102 |
| p99 | 1009.352 | 11.848 | 0.000 | 0.999 | 0.000 | 5.323 | 1002.675 | 1.124 | 12.819 | 0.188 | 0.000 | n/a | n/a | 1.177 | 11.848 | 0.734 | 1.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b50000000000000dbb | 1021.477 | 0.040 | 0.000 | 0.000 | 0.000 | 0.117 | 1018.340 | 0.058 | 0.000 | 1.937 | 0.000 | n/a | n/a | 0.985 | 0.040 | 0.000 | 0.985 | gw-r/thread-72/journal/page | none observed |
| 7152304862c892b50000000000001149 | 1009.352 | 0.116 | 0.000 | 0.000 | 0.000 | 5.323 | 1002.675 | 0.012 | 0.000 | 0.107 | 0.000 | n/a | n/a | 1.120 | 0.116 | 0.000 | 1.120 | gw-r/thread-75/journal/page | none observed |
| 7152304862c892b50000000000000e05 | 1007.346 | 4.747 | 0.000 | 0.000 | 0.000 | 0.649 | 1001.637 | 0.124 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.109 | 4.747 | 0.005 | 0.109 | gw-r/thread-73/journal/page | none observed |
| 7152304862c892b50000000000000eb5 | 1007.052 | 0.153 | 0.000 | 0.000 | 0.000 | 4.593 | 1001.079 | 0.012 | 0.000 | 0.083 | 0.000 | n/a | n/a | 1.132 | 0.153 | 0.000 | 1.132 | gw-r/thread-77/journal/page | none observed |
| 7152304862c892b50000000000001393 | 1005.911 | 0.244 | 0.000 | 0.000 | 0.000 | 0.885 | 1001.054 | 0.012 | 0.000 | 0.077 | 0.000 | n/a | n/a | 3.640 | 0.244 | 0.000 | 3.640 | gw-r/thread-72/journal/page | none observed |
| 7152304862c892b5000000000000111f | 1004.113 | 0.206 | 0.000 | 0.000 | 0.000 | 1.369 | 1001.278 | 0.008 | 0.000 | 0.075 | 0.000 | n/a | n/a | 1.177 | 0.206 | 0.000 | 1.177 | gw-r/thread-53/journal/page | none observed |
| 7152304862c892b5000000000000101f | 1001.109 | 4.548 | 0.000 | 1.657 | 0.000 | 0.952 | 993.548 | 0.261 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.082 | 6.205 | 0.006 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 7152304862c892b50000000000000e75 | 997.899 | 2.446 | 0.000 | 0.000 | 0.000 | 0.677 | 994.588 | 0.007 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.140 | 2.446 | 0.002 | 0.140 | gw-r/thread-52/journal/page | none observed |
| 7152304862c892b50000000000001353 | 996.780 | 2.743 | 0.000 | 0.000 | 0.000 | 0.838 | 993.080 | 0.008 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.074 | 2.743 | 0.003 | 0.074 | gw-r/thread-72/journal/page | none observed |
| 7152304862c892b50000000000000e45 | 989.658 | 4.169 | 0.000 | 0.000 | 0.000 | 0.806 | 984.526 | 0.008 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.085 | 4.169 | 0.004 | 0.085 | gw-r/thread-50/journal/page | none observed |
| 7152304862c892b50000000000000fff | 988.431 | 3.673 | 0.000 | 0.000 | 0.000 | 0.942 | 983.358 | 0.228 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.092 | 3.673 | 0.004 | 0.092 | gw-r/thread-50/journal/page | none observed |
| 7152304862c892b50000000000000d5b | 987.625 | 2.616 | 0.000 | 0.000 | 0.000 | 0.557 | 984.106 | 0.155 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.081 | 2.616 | 0.003 | 0.081 | gw-r/thread-53/journal/page | none observed |
| 7152304862c892b50000000000001139 | 984.501 | 2.906 | 0.000 | 0.000 | 0.000 | 0.828 | 980.254 | 0.364 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.078 | 2.906 | 0.003 | 0.078 | gw-r/thread-51/journal/page | none observed |
| 7152304862c892b5000000000000100f | 979.920 | 3.645 | 0.000 | 0.000 | 0.000 | 0.643 | 975.467 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.110 | 3.645 | 0.004 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 7152304862c892b500000000000012b3 | 974.074 | 3.428 | 0.000 | 0.000 | 0.000 | 0.792 | 969.629 | 0.003 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.179 | 3.428 | 0.004 | 0.179 | gw-r/thread-53/journal/page | none observed |
| 7152304862c892b50000000000000ecf | 972.881 | 3.530 | 0.000 | 0.000 | 0.000 | 1.004 | 968.198 | 0.015 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.083 | 3.530 | 0.004 | 0.083 | gw-r/thread-77/journal/page | none observed |
| 7152304862c892b500000000000010af | 958.849 | 3.484 | 0.000 | 0.000 | 0.000 | 0.855 | 954.352 | 0.007 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.104 | 3.484 | 0.004 | 0.104 | gw-r/thread-79/journal/page | none observed |
| 7152304862c892b500000000000012c3 | 955.991 | 4.304 | 0.000 | 0.000 | 0.000 | 0.841 | 950.064 | 0.619 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.107 | 4.304 | 0.005 | 0.107 | gw-r/thread-79/journal/page | none observed |
| 7152304862c892b50000000000000dab | 953.970 | 4.290 | 0.000 | 0.000 | 0.000 | 0.948 | 948.558 | 0.013 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.094 | 4.290 | 0.004 | 0.094 | gw-r/thread-72/journal/page | none observed |
| 7152304862c892b50000000000000ea5 | 921.254 | 3.536 | 0.000 | 0.000 | 0.000 | 0.895 | 916.632 | 0.008 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.126 | 3.536 | 0.004 | 0.126 | gw-r/thread-52/journal/page | none observed |

## P3 / L4 / internal (1551 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.869 | 4.151 | 0.000 | 0.000 | 0.000 | 0.695 | 7.492 | 0.007 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.092 | 4.151 | 0.334 | 0.092 |
| p99 | 382.481 | 18.502 | 0.000 | 1.917 | 0.000 | 5.507 | 377.503 | 0.396 | 7.700 | 0.133 | 0.000 | n/a | n/a | 1.244 | 19.654 | 0.835 | 1.244 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b500000000000014ad | 1003.569 | 2.795 | 0.000 | 0.000 | 0.000 | 0.703 | 999.877 | 0.009 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.123 | 2.795 | 0.003 | 0.123 | gw-r/thread-75/journal/page | none observed |
| 7152304862c892b5000000000000145d | 1001.090 | 3.877 | 0.000 | 0.000 | 0.000 | 1.067 | 995.771 | 0.177 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.115 | 3.877 | 0.004 | 0.115 | gw-r/thread-53/journal/page | none observed |
| 7152304862c892b5000000000000149d | 994.912 | 3.057 | 0.000 | 0.000 | 0.000 | 0.686 | 990.889 | 0.014 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.176 | 3.057 | 0.003 | 0.176 | gw-r/thread-71/journal/page | none observed |
| 7152304862c892b5000000000000148d | 964.431 | 2.822 | 0.000 | 0.000 | 0.000 | 0.806 | 960.627 | 0.008 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.102 | 2.822 | 0.003 | 0.102 | gw-r/thread-75/journal/page | none observed |
| 7152304862c892b5000000000000152d | 930.658 | 5.627 | 0.000 | 0.000 | 0.000 | 0.924 | 923.929 | 0.013 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.106 | 5.627 | 0.006 | 0.106 | gw-r/thread-48/journal/page | none observed |
| 7152304862c892b5000000000000144d | 818.748 | 4.930 | 0.000 | 0.000 | 0.000 | 0.964 | 798.938 | 0.016 | 12.730 | 0.102 | 0.000 | n/a | n/a | 1.069 | 4.930 | 0.006 | 1.069 | gw-r/thread-71/journal/page | none observed |
| 7152304862c892b500000000000013fd | 817.585 | 2.672 | 0.000 | 0.000 | 0.000 | 0.727 | 813.904 | 0.048 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.123 | 2.672 | 0.003 | 0.123 | gw-r/thread-52/journal/page | none observed |
| 7152304862c892b5000000000000146d | 697.562 | 11.843 | 0.000 | 0.000 | 0.000 | 0.729 | 684.767 | 0.020 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.098 | 11.843 | 0.017 | 0.098 | gw-r/thread-46/journal/page | none observed |
| 7152304862c892b5000000000000151d | 639.613 | 10.047 | 0.000 | 0.000 | 0.000 | 1.951 | 627.206 | 0.019 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.199 | 10.047 | 0.016 | 0.199 | gw-r/thread-48/journal/page | none observed |
| 7152304862c892b500000000000013bd | 546.094 | 10.078 | 0.000 | 0.000 | 0.000 | 2.587 | 533.117 | 0.137 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.099 | 10.078 | 0.018 | 0.099 | gw-r/thread-48/journal/page | none observed |
| 7152304862c892b500000000000014bd | 536.997 | 2.312 | 0.000 | 0.000 | 0.000 | 0.943 | 533.579 | 0.008 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.094 | 2.312 | 0.004 | 0.094 | gw-r/thread-50/journal/page | none observed |
| 7152304862c892b5000000000000153d | 521.433 | 4.732 | 0.000 | 0.000 | 0.000 | 0.592 | 515.971 | 0.007 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.092 | 4.732 | 0.009 | 0.092 | gw-r/thread-48/journal/page | none observed |
| 7152304862c892b500000000000013ad | 472.275 | 2.374 | 0.000 | 0.000 | 0.000 | 0.995 | 468.595 | 0.111 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.127 | 2.374 | 0.005 | 0.127 | gw-r/thread-78/journal/page | none observed |
| 7152304862c892b500000000000014cd | 464.227 | 5.955 | 0.000 | 0.000 | 0.000 | 0.567 | 457.398 | 0.007 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.235 | 5.955 | 0.013 | 0.235 | gw-r/thread-74/journal/page | none observed |
| 7152304862c892b500000000000014fd | 459.049 | 11.887 | 0.000 | 0.000 | 0.000 | 0.568 | 446.087 | 0.010 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.433 | 11.887 | 0.026 | 0.433 | gw-r/thread-74/journal/page | none observed |
| 7152304862c892b500000000000013cd | 382.481 | 3.702 | 0.000 | 0.000 | 0.000 | 1.121 | 377.503 | 0.006 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.068 | 3.702 | 0.010 | 0.068 | gw-r/thread-52/journal/page | none observed |
| 7152304862c892b500000000000014dd | 374.365 | 3.541 | 0.000 | 0.000 | 0.000 | 1.212 | 369.463 | 0.009 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.080 | 3.541 | 0.009 | 0.080 | gw-r/thread-74/journal/page | none observed |
| 7152304862c892b5000000000000147d | 337.850 | 3.195 | 0.000 | 0.000 | 0.000 | 4.238 | 330.229 | 0.012 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.096 | 3.195 | 0.009 | 0.096 | gw-r/thread-46/journal/page | none observed |
| 7152304862c892b5000000000000150d | 328.305 | 3.805 | 0.000 | 0.000 | 0.000 | 1.105 | 322.830 | 0.028 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.436 | 3.805 | 0.012 | 0.436 | gw-r/thread-52/journal/page | none observed |
| 7152304862c892b500000000000013dd | 326.430 | 3.936 | 0.000 | 0.000 | 0.000 | 1.019 | 321.145 | 0.146 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.125 | 3.936 | 0.012 | 0.125 | gw-r/thread-75/journal/page | none observed |

## P3 / L16 / internal (1147 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.939 | 8.161 | 0.000 | 0.000 | 0.000 | 1.037 | 3.660 | 0.008 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.147 | 8.277 | 0.577 | 0.147 |
| p99 | 639.381 | 59.063 | 0.000 | 7.880 | 0.000 | 13.512 | 618.063 | 0.328 | 26.076 | 0.113 | 0.000 | n/a | n/a | 5.668 | 62.232 | 0.911 | 5.668 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b5000000000000ca2b | 1013.350 | 14.028 | 0.000 | 0.000 | 0.000 | 2.137 | 975.750 | 0.159 | 21.196 | 0.017 | 0.000 | n/a | n/a | 0.064 | 14.028 | 0.014 | 0.064 | gw-r/thread-90/journal/page | none observed |
| 7152304862c892b5000000000000ca5b | 990.088 | 5.325 | 0.000 | 0.000 | 0.000 | 1.236 | 925.205 | 0.010 | 58.152 | 0.057 | 0.000 | n/a | n/a | 0.103 | 5.325 | 0.005 | 0.103 | gw-r/thread-49/journal/page | none observed |
| 7152304862c892b5000000000000ca8b | 974.506 | 2.589 | 0.000 | 0.000 | 0.000 | 3.448 | 968.390 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.053 | 2.589 | 0.003 | 0.053 | gw-r/thread-77/journal/page | none observed |
| 7152304862c892b5000000000000cb7b | 965.072 | 3.806 | 0.000 | 0.000 | 0.000 | 2.661 | 945.921 | 0.087 | 11.588 | 0.031 | 0.000 | n/a | n/a | 0.978 | 3.806 | 0.004 | 0.978 | gw-r/thread-53/journal/page | none observed |
| 7152304862c892b5000000000000caeb | 952.172 | 7.923 | 0.000 | 0.000 | 0.000 | 1.632 | 942.493 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.081 | 7.923 | 0.008 | 0.081 | gw-r/thread-77/journal/page | none observed |
| 7152304862c892b5000000000000ccbb | 923.387 | 21.106 | 0.000 | 0.000 | 0.000 | 0.749 | 847.393 | 0.016 | 53.620 | 0.067 | 0.000 | n/a | n/a | 0.437 | 21.106 | 0.023 | 0.437 | gw-r/thread-78/journal/page | none observed |
| 7152304862c892b5000000000000ca3b | 910.102 | 15.091 | 0.000 | 0.000 | 0.000 | 0.656 | 865.445 | 0.004 | 28.448 | 0.021 | 0.000 | n/a | n/a | 0.438 | 15.091 | 0.017 | 0.438 | gw-r/thread-86/journal/page | none observed |
| 7152304862c892b5000000000000ca1b | 823.734 | 5.673 | 0.000 | 0.000 | 0.000 | 0.646 | 773.897 | 0.010 | 43.352 | 0.054 | 0.000 | n/a | n/a | 0.102 | 5.673 | 0.007 | 0.102 | gw-r/thread-90/journal/page | none observed |
| 7152304862c892b5000000000000cb9b | 707.336 | 5.416 | 0.000 | 0.000 | 0.000 | 1.960 | 673.706 | 0.005 | 26.076 | 0.082 | 0.000 | n/a | n/a | 0.092 | 5.416 | 0.008 | 0.092 | gw-r/thread-53/journal/page | none observed |
| 7152304862c892b5000000000000cb5b | 644.233 | 2.986 | 0.000 | 0.000 | 0.000 | 1.401 | 639.778 | 0.004 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.050 | 2.986 | 0.005 | 0.050 | gw-r/thread-91/journal/page | none observed |
| 7152304862c892b5000000000000ca9b | 641.854 | 2.745 | 0.000 | 0.000 | 0.000 | 1.489 | 618.063 | 0.068 | 19.361 | 0.058 | 0.000 | n/a | n/a | 0.070 | 2.745 | 0.004 | 0.070 | gw-r/thread-48/journal/page | none observed |
| 7152304862c892b5000000000000cc8b | 639.381 | 2.545 | 0.000 | 0.000 | 0.000 | 0.569 | 636.160 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.074 | 2.545 | 0.004 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 7152304862c892b5000000000000cbab | 634.080 | 13.965 | 0.000 | 0.000 | 0.000 | 0.906 | 587.927 | 0.008 | 30.994 | 0.049 | 0.000 | n/a | n/a | 0.232 | 13.965 | 0.022 | 0.232 | gw-r/thread-51/journal/page | none observed |
| 7152304862c892b5000000000000cb2b | 603.239 | 6.604 | 0.000 | 0.000 | 0.000 | 0.735 | 573.273 | 0.120 | 22.425 | 0.019 | 0.000 | n/a | n/a | 0.063 | 6.604 | 0.011 | 0.063 | gw-r/thread-88/journal/page | none observed |
| 7152304862c892b5000000000000cc2b | 523.059 | 5.758 | 0.000 | 0.000 | 0.000 | 0.703 | 516.408 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.159 | 5.758 | 0.011 | 0.159 | gw-r/thread-91/journal/page | none observed |
| 7152304862c892b5000000000000cc7b | 466.847 | 2.509 | 0.000 | 0.000 | 0.000 | 0.695 | 463.472 | 0.094 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.064 | 2.509 | 0.005 | 0.064 | gw-r/thread-76/journal/page | none observed |
| 7152304862c892b5000000000000cc5b | 461.550 | 3.889 | 0.000 | 0.000 | 0.000 | 0.636 | 456.861 | 0.011 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.077 | 3.889 | 0.008 | 0.077 | gw-r/thread-91/journal/page | none observed |
| 7152304862c892b5000000000000cc1b | 392.553 | 7.318 | 0.000 | 0.000 | 0.000 | 0.732 | 365.656 | 0.006 | 18.741 | 0.035 | 0.000 | n/a | n/a | 0.067 | 7.318 | 0.019 | 0.067 | gw-r/thread-52/journal/page | none observed |
| 7152304862c892b5000000000000cc9b | 369.526 | 7.906 | 0.000 | 0.000 | 0.000 | 0.670 | 360.714 | 0.128 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.056 | 7.906 | 0.021 | 0.056 | gw-r/thread-87/journal/page | none observed |
| 7152304862c892b5000000000000cb1b | 356.082 | 2.195 | 0.000 | 0.000 | 0.000 | 2.191 | 351.602 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.063 | 2.195 | 0.006 | 0.063 | gw-r/thread-53/journal/page | none observed |

## P3 / L64 / internal (100 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 333.070 | 5.992 | 0.000 | 0.000 | 0.000 | 0.856 | 300.369 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.131 | 5.992 | 0.017 | 0.131 |
| p99 | 1002.846 | 31.433 | 0.000 | 3.603 | 0.000 | 42.392 | 984.704 | 0.294 | 56.478 | 0.063 | 0.000 | n/a | n/a | 3.309 | 31.433 | 0.704 | 3.309 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b5000000000000cfd5 | 1003.505 | 0.411 | 0.000 | 0.000 | 0.000 | 0.941 | 1000.785 | 0.014 | 0.000 | 0.045 | 0.000 | n/a | n/a | 1.310 | 0.411 | 0.000 | 1.310 | gw-r/thread-110/journal/page | none observed |
| 7152304862c892b5000000000000d1e3 | 1002.846 | 0.085 | 0.000 | 0.000 | 0.000 | 1.162 | 963.617 | 0.005 | 36.829 | 0.041 | 0.000 | n/a | n/a | 1.107 | 0.085 | 0.000 | 1.107 | gw-r/thread-96/journal/page | none observed |
| 7152304862c892b5000000000000d07f | 1002.443 | 0.071 | 0.000 | 0.000 | 0.000 | 0.781 | 975.347 | 0.008 | 25.082 | 0.048 | 0.000 | n/a | n/a | 1.107 | 0.071 | 0.000 | 1.107 | gw-r/thread-108/journal/page | none observed |
| 7152304862c892b5000000000000d149 | 1002.318 | 0.062 | 0.000 | 0.000 | 0.000 | 0.514 | 984.704 | 0.009 | 15.887 | 0.049 | 0.000 | n/a | n/a | 1.094 | 0.062 | 0.000 | 1.094 | gw-r/thread-103/journal/page | none observed |
| 7152304862c892b5000000000000cf6b | 1001.988 | 0.068 | 0.000 | 0.000 | 0.000 | 0.573 | 956.207 | 0.002 | 44.037 | 0.007 | 0.000 | n/a | n/a | 1.094 | 0.068 | 0.000 | 1.094 | gw-r/thread-103/journal/page | none observed |
| 7152304862c892b5000000000000cfef | 1001.071 | 10.974 | 0.000 | 0.000 | 0.000 | 47.279 | 916.943 | 0.014 | 25.668 | 0.062 | 0.000 | n/a | n/a | 0.131 | 10.974 | 0.011 | 0.131 | gw-r/thread-99/journal/page | none observed |
| 7152304862c892b5000000000000d21d | 998.609 | 7.116 | 0.000 | 0.000 | 0.000 | 2.025 | 959.533 | 0.016 | 29.773 | 0.031 | 0.000 | n/a | n/a | 0.115 | 7.116 | 0.007 | 0.115 | gw-r/thread-95/journal/page | none observed |
| 7152304862c892b5000000000000d01f | 995.971 | 4.543 | 0.000 | 0.000 | 0.000 | 0.699 | 956.392 | 0.003 | 34.225 | 0.034 | 0.000 | n/a | n/a | 0.076 | 4.543 | 0.005 | 0.076 | gw-r/thread-125/journal/page | none observed |
| 7152304862c892b5000000000000d02f | 993.280 | 11.470 | 0.000 | 0.000 | 0.000 | 9.537 | 936.303 | 0.006 | 35.802 | 0.031 | 0.000 | n/a | n/a | 0.131 | 11.470 | 0.012 | 0.131 | gw-r/thread-91/journal/page | none observed |
| 7152304862c892b5000000000000d22d | 991.735 | 8.633 | 0.000 | 0.000 | 0.000 | 0.528 | 974.419 | 0.009 | 7.965 | 0.041 | 0.000 | n/a | n/a | 0.140 | 8.633 | 0.009 | 0.140 | gw-r/thread-101/journal/page | none observed |
| 7152304862c892b5000000000000d20d | 971.255 | 5.062 | 0.000 | 0.000 | 0.000 | 10.129 | 933.768 | 0.005 | 22.137 | 0.038 | 0.000 | n/a | n/a | 0.115 | 5.062 | 0.005 | 0.115 | gw-r/thread-133/journal/page | none observed |
| 7152304862c892b5000000000000cceb | 970.490 | 10.814 | 0.000 | 0.000 | 0.000 | 0.736 | 920.598 | 0.029 | 38.078 | 0.042 | 0.000 | n/a | n/a | 0.191 | 10.814 | 0.011 | 0.191 | gw-r/thread-122/journal/page | none observed |
| 7152304862c892b5000000000000cd7b | 952.525 | 7.833 | 0.000 | 0.000 | 0.000 | 0.524 | 916.662 | 0.015 | 27.349 | 0.043 | 0.000 | n/a | n/a | 0.098 | 7.833 | 0.008 | 0.098 | gw-r/thread-48/journal/page | none observed |
| 7152304862c892b5000000000000d0f9 | 951.603 | 5.124 | 0.000 | 0.000 | 0.000 | 0.550 | 886.093 | 0.006 | 56.478 | 0.025 | 0.000 | n/a | n/a | 3.328 | 5.124 | 0.005 | 3.328 | gw-r/thread-109/journal/page | none observed |
| 7152304862c892b5000000000000cf3b | 951.346 | 4.635 | 0.000 | 0.000 | 0.000 | 2.621 | 899.098 | 0.012 | 44.784 | 0.032 | 0.000 | n/a | n/a | 0.164 | 4.635 | 0.005 | 0.164 | gw-r/thread-117/journal/page | none observed |
| 7152304862c892b5000000000000d05f | 892.497 | 3.227 | 0.000 | 0.000 | 0.000 | 0.544 | 877.120 | 0.009 | 11.418 | 0.040 | 0.000 | n/a | n/a | 0.140 | 3.227 | 0.004 | 0.140 | gw-r/thread-72/journal/page | none observed |
| 7152304862c892b5000000000000d129 | 889.877 | 2.740 | 0.000 | 0.000 | 0.000 | 0.738 | 874.703 | 0.005 | 11.566 | 0.026 | 0.000 | n/a | n/a | 0.098 | 2.740 | 0.003 | 0.098 | gw-r/thread-119/journal/page | none observed |
| 7152304862c892b5000000000000d1c3 | 864.842 | 11.410 | 0.000 | 0.000 | 0.000 | 0.582 | 836.828 | 0.002 | 15.888 | 0.006 | 0.000 | n/a | n/a | 0.126 | 11.410 | 0.013 | 0.126 | gw-r/thread-108/journal/page | none observed |
| 7152304862c892b5000000000000cfff | 827.385 | 3.617 | 0.000 | 0.000 | 0.000 | 0.671 | 812.369 | 0.005 | 10.489 | 0.036 | 0.000 | n/a | n/a | 0.198 | 3.617 | 0.004 | 0.198 | gw-r/thread-52/journal/page | none observed |
| 7152304862c892b5000000000000d2ad | 821.449 | 3.815 | 0.000 | 0.000 | 0.000 | 6.357 | 786.245 | 0.141 | 24.772 | 0.042 | 0.000 | n/a | n/a | 0.077 | 3.815 | 0.005 | 0.077 | gw-r/thread-101/journal/page | none observed |

## P3 / L256 / internal (98 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 351.532 | 8.281 | 0.000 | 0.000 | 0.000 | 1.862 | 340.056 | 0.007 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.125 | 8.281 | 0.025 | 0.125 |
| p99 | 1049.217 | 53.594 | 0.000 | 5.842 | 0.000 | 25.617 | 1005.728 | 6.446 | 118.295 | 1.151 | 0.000 | n/a | n/a | 10.320 | 53.594 | 0.853 | 10.320 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b5000000000000d7eb | 1049.217 | 0.407 | 0.000 | 0.000 | 0.000 | 1.300 | 1005.728 | 0.011 | 40.418 | 0.113 | 0.000 | n/a | n/a | 1.240 | 0.407 | 0.000 | 1.240 | gw-r/thread-110/journal/page | none observed |
| 7152304862c892b5000000000000d771 | 1033.042 | 0.232 | 0.000 | 0.000 | 0.000 | 25.617 | 1003.102 | 0.015 | 0.000 | 0.061 | 0.000 | n/a | n/a | 4.014 | 0.232 | 0.000 | 4.014 | gw-r/thread-94/journal/page | none observed |
| 7152304862c892b5000000000000d8e5 | 1019.739 | 21.902 | 0.000 | 0.000 | 0.000 | 3.111 | 994.333 | 0.076 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.188 | 21.902 | 0.021 | 0.188 | gw-r/thread-95/journal/page | none observed |
| 7152304862c892b5000000000000d47d | 1008.487 | 10.911 | 0.000 | 0.000 | 0.000 | 1.667 | 949.157 | 0.002 | 46.656 | 0.018 | 0.000 | n/a | n/a | 0.075 | 10.911 | 0.011 | 0.075 | gw-r/thread-97/journal/page | none observed |
| 7152304862c892b5000000000000d59d | 1008.034 | 0.125 | 0.000 | 0.000 | 0.000 | 5.857 | 945.553 | 0.008 | 55.294 | 0.055 | 0.000 | n/a | n/a | 1.143 | 0.125 | 0.000 | 1.143 | gw-r/thread-50/journal/page | none observed |
| 7152304862c892b5000000000000d6a7 | 1003.238 | 0.166 | 0.000 | 0.000 | 0.000 | 0.646 | 963.829 | 0.010 | 37.395 | 0.024 | 0.000 | n/a | n/a | 1.168 | 0.166 | 0.000 | 1.168 | gw-r/thread-121/journal/page | none observed |
| 7152304862c892b5000000000000d657 | 1000.440 | 8.176 | 0.000 | 0.000 | 0.000 | 2.206 | 968.861 | 0.008 | 21.064 | 0.034 | 0.000 | n/a | n/a | 0.090 | 8.176 | 0.008 | 0.090 | gw-r/thread-100/journal/page | none observed |
| 7152304862c892b5000000000000d607 | 1000.097 | 14.155 | 0.000 | 0.000 | 0.000 | 3.606 | 933.013 | 0.003 | 49.154 | 0.028 | 0.000 | n/a | n/a | 0.138 | 14.155 | 0.014 | 0.138 | gw-r/thread-122/journal/page | none observed |
| 7152304862c892b5000000000000d5f7 | 995.551 | 7.921 | 0.000 | 0.000 | 0.000 | 0.711 | 983.050 | 0.009 | 0.000 | 0.056 | 0.000 | n/a | n/a | 3.804 | 7.921 | 0.008 | 3.804 | gw-r/thread-122/journal/page | none observed |
| 7152304862c892b5000000000000d701 | 983.009 | 5.505 | 0.000 | 0.000 | 0.000 | 2.995 | 918.233 | 0.005 | 56.106 | 0.030 | 0.000 | n/a | n/a | 0.133 | 5.505 | 0.006 | 0.133 | gw-r/thread-134/journal/page | none observed |
| 7152304862c892b5000000000000d8a5 | 982.200 | 10.392 | 0.000 | 0.000 | 0.000 | 0.546 | 931.775 | 0.086 | 39.257 | 0.045 | 0.000 | n/a | n/a | 0.099 | 10.392 | 0.011 | 0.099 | gw-r/thread-76/journal/page | none observed |
| 7152304862c892b5000000000000d8b5 | 980.889 | 7.128 | 0.000 | 0.000 | 0.000 | 2.403 | 962.344 | 0.010 | 8.888 | 0.034 | 0.000 | n/a | n/a | 0.083 | 7.128 | 0.007 | 0.083 | gw-r/thread-164/journal/page | none observed |
| 7152304862c892b5000000000000d667 | 979.431 | 6.159 | 0.000 | 0.000 | 0.000 | 1.948 | 947.615 | 0.037 | 23.559 | 0.052 | 0.000 | n/a | n/a | 0.062 | 6.159 | 0.006 | 0.062 | gw-r/thread-94/journal/page | none observed |
| 7152304862c892b5000000000000d835 | 979.076 | 2.851 | 0.000 | 0.000 | 0.000 | 0.737 | 923.965 | 0.006 | 51.379 | 0.043 | 0.000 | n/a | n/a | 0.095 | 2.851 | 0.003 | 0.095 | gw-r/thread-52/journal/page | none observed |
| 7152304862c892b5000000000000d6c1 | 949.731 | 3.278 | 0.000 | 0.000 | 0.000 | 2.562 | 943.748 | 0.003 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.116 | 3.278 | 0.003 | 0.116 | gw-r/thread-46/journal/page | none observed |
| 7152304862c892b5000000000000d45d | 934.549 | 16.796 | 0.000 | 0.000 | 0.000 | 0.960 | 893.539 | 0.063 | 22.958 | 0.052 | 0.000 | n/a | n/a | 0.181 | 16.796 | 0.018 | 0.181 | gw-r/thread-98/journal/page | none observed |
| 7152304862c892b5000000000000d7ab | 908.708 | 9.731 | 0.000 | 0.000 | 0.000 | 2.952 | 788.387 | 0.002 | 107.531 | 0.005 | 0.000 | n/a | n/a | 0.098 | 9.731 | 0.011 | 0.098 | gw-r/thread-53/journal/page | none observed |
| 7152304862c892b5000000000000d5d7 | 907.414 | 27.439 | 0.000 | 0.000 | 0.000 | 2.150 | 877.426 | 0.012 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.318 | 27.439 | 0.030 | 0.318 | gw-r/thread-132/journal/page | none observed |
| 7152304862c892b5000000000000d3cd | 892.008 | 15.193 | 0.000 | 0.000 | 0.000 | 0.842 | 750.838 | 0.268 | 118.295 | 1.151 | 0.000 | n/a | n/a | 5.421 | 15.193 | 0.017 | 5.421 | gw-r/thread-51/journal/page | none observed |
| 7152304862c892b5000000000000d647 | 862.069 | 7.023 | 0.000 | 0.000 | 0.000 | 0.644 | 843.898 | 0.123 | 0.000 | 0.062 | 0.000 | n/a | n/a | 10.320 | 7.023 | 0.008 | 10.320 | gw-r/thread-129/journal/page | none observed |

## P3 / L1024 / internal (96 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 427.943 | 9.272 | 0.000 | 0.000 | 0.000 | 2.158 | 354.656 | 0.007 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.129 | 9.272 | 0.026 | 0.129 |
| p99 | 1013.161 | 68.862 | 0.000 | 15.166 | 0.000 | 20.013 | 983.813 | 2.182 | 191.775 | 0.783 | 0.000 | n/a | n/a | 4.517 | 68.862 | 0.800 | 4.517 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b5000000000000dac9 | 1013.161 | 4.756 | 0.000 | 0.000 | 0.000 | 7.420 | 949.381 | 0.003 | 50.461 | 0.115 | 0.000 | n/a | n/a | 1.024 | 4.756 | 0.005 | 1.024 | gw-r/thread-176/journal/page | none observed |
| 7152304862c892b5000000000000ddf9 | 1009.001 | 4.276 | 0.000 | 0.000 | 0.000 | 4.258 | 983.801 | 0.005 | 16.546 | 0.018 | 0.000 | n/a | n/a | 0.099 | 4.276 | 0.004 | 0.099 | gw-r/thread-165/journal/page | none observed |
| 7152304862c892b5000000000000da4f | 1005.267 | 0.190 | 0.000 | 0.000 | 0.000 | 1.825 | 954.702 | 0.017 | 46.283 | 0.092 | 0.000 | n/a | n/a | 2.157 | 0.190 | 0.000 | 2.157 | gw-r/thread-138/journal/page | none observed |
| 7152304862c892b5000000000000de49 | 1004.429 | 0.288 | 0.000 | 0.000 | 0.000 | 2.053 | 948.888 | 0.006 | 51.660 | 0.045 | 0.000 | n/a | n/a | 1.488 | 0.288 | 0.000 | 1.488 | gw-r/thread-149/journal/page | none observed |
| 7152304862c892b5000000000000d9b5 | 1003.372 | 0.135 | 0.000 | 0.000 | 0.000 | 1.287 | 966.413 | 0.006 | 34.337 | 0.048 | 0.000 | n/a | n/a | 1.145 | 0.135 | 0.000 | 1.145 | gw-r/thread-141/journal/page | none observed |
| 7152304862c892b5000000000000de73 | 1003.259 | 0.161 | 0.000 | 0.000 | 0.000 | 0.760 | 962.950 | 0.012 | 38.171 | 0.079 | 0.000 | n/a | n/a | 1.126 | 0.161 | 0.000 | 1.126 | gw-r/thread-97/journal/page | none observed |
| 7152304862c892b5000000000000dcf3 | 1002.760 | 2.833 | 0.000 | 0.000 | 0.000 | 3.385 | 983.813 | 0.116 | 12.508 | 0.039 | 0.000 | n/a | n/a | 0.065 | 2.833 | 0.003 | 0.065 | gw-r/thread-148/journal/page | none observed |
| 7152304862c892b5000000000000dc19 | 1002.746 | 0.073 | 0.000 | 0.000 | 0.000 | 1.069 | 966.960 | 0.004 | 33.511 | 0.028 | 0.000 | n/a | n/a | 1.100 | 0.073 | 0.000 | 1.100 | gw-r/thread-86/journal/page | none observed |
| 7152304862c892b5000000000000dc33 | 994.634 | 68.862 | 0.000 | 0.000 | 0.000 | 1.411 | 878.641 | 0.240 | 42.376 | 0.046 | 0.000 | n/a | n/a | 3.060 | 68.862 | 0.069 | 3.060 | gw-r/thread-167/journal/page | none observed |
| 7152304862c892b5000000000000da3f | 991.070 | 3.468 | 0.000 | 0.000 | 0.000 | 2.399 | 973.508 | 0.004 | 11.565 | 0.019 | 0.000 | n/a | n/a | 0.108 | 3.468 | 0.003 | 0.108 | gw-r/thread-122/journal/page | none observed |
| 7152304862c892b5000000000000dd99 | 991.063 | 5.046 | 0.000 | 0.000 | 0.000 | 2.742 | 967.352 | 0.008 | 15.043 | 0.783 | 0.000 | n/a | n/a | 0.087 | 5.046 | 0.005 | 0.087 | gw-r/thread-152/journal/page | none observed |
| 7152304862c892b5000000000000dab9 | 989.910 | 5.263 | 0.000 | 0.000 | 0.000 | 0.681 | 969.197 | 0.006 | 14.601 | 0.034 | 0.000 | n/a | n/a | 0.129 | 5.263 | 0.005 | 0.129 | gw-r/thread-79/journal/page | none observed |
| 7152304862c892b5000000000000de63 | 984.150 | 2.613 | 0.000 | 0.000 | 0.000 | 0.925 | 980.532 | 0.003 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.064 | 2.613 | 0.003 | 0.064 | gw-r/thread-171/journal/page | none observed |
| 7152304862c892b5000000000000d8f5 | 982.536 | 13.889 | 0.000 | 1.765 | 0.000 | 2.226 | 905.291 | 0.015 | 59.212 | 0.049 | 0.000 | n/a | n/a | 0.089 | 15.654 | 0.016 | 0.089 | gw-r/thread-146/journal/page | none observed |
| 7152304862c892b5000000000000d9cf | 974.839 | 10.649 | 0.000 | 0.000 | 0.000 | 1.087 | 926.210 | 0.005 | 36.719 | 0.030 | 0.000 | n/a | n/a | 0.139 | 10.649 | 0.011 | 0.139 | gw-r/thread-130/journal/page | none observed |
| 7152304862c892b5000000000000d915 | 972.028 | 32.111 | 0.000 | 15.166 | 0.000 | 9.167 | 911.152 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 4.393 | 47.277 | 0.049 | 4.393 | gw-r/thread-97/journal/page | none observed |
| 7152304862c892b5000000000000de19 | 944.879 | 2.731 | 0.000 | 0.000 | 0.000 | 0.539 | 910.165 | 0.007 | 31.327 | 0.035 | 0.000 | n/a | n/a | 0.075 | 2.731 | 0.003 | 0.075 | gw-r/thread-133/journal/page | none observed |
| 7152304862c892b5000000000000debd | 919.078 | 18.525 | 0.000 | 0.000 | 0.000 | 1.232 | 874.828 | 0.010 | 19.921 | 0.044 | 0.000 | n/a | n/a | 4.517 | 18.525 | 0.020 | 4.517 | gw-r/thread-164/journal/page | none observed |
| 7152304862c892b5000000000000db09 | 909.533 | 2.366 | 0.000 | 0.000 | 0.000 | 0.593 | 881.423 | 0.003 | 25.054 | 0.017 | 0.000 | n/a | n/a | 0.078 | 2.366 | 0.003 | 0.078 | gw-r/thread-170/journal/page | none observed |
| 7152304862c892b5000000000000dca3 | 904.039 | 7.977 | 0.000 | 0.000 | 0.000 | 4.236 | 848.969 | 0.002 | 42.731 | 0.022 | 0.000 | n/a | n/a | 0.103 | 7.977 | 0.009 | 0.103 | gw-r/thread-156/journal/page | none observed |

## P3 / recovery / internal (138 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 351.135 | 10.272 | 0.000 | 0.000 | 0.000 | 1.760 | 325.575 | 0.007 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.181 | 10.272 | 0.035 | 0.181 |
| p99 | 1016.869 | 91.936 | 0.000 | 9.632 | 0.000 | 18.453 | 995.251 | 0.486 | 63.955 | 0.152 | 0.000 | n/a | n/a | 5.679 | 91.936 | 0.885 | 5.679 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b5000000000000e733 | 1037.189 | 0.337 | 0.000 | 0.000 | 0.000 | 10.732 | 1020.791 | 0.049 | 3.858 | 0.118 | 0.000 | n/a | n/a | 1.304 | 0.337 | 0.000 | 1.304 | gw-r/thread-106/journal/page | none observed |
| 7152304862c892b5000000000000dfdd | 1016.869 | 48.582 | 0.000 | 0.000 | 0.000 | 4.640 | 953.273 | 0.004 | 9.774 | 0.024 | 0.000 | n/a | n/a | 0.571 | 48.582 | 0.048 | 0.571 | gw-r/thread-152/journal/page | none observed |
| 7152304862c892b5000000000000e1b9 | 1016.718 | 18.339 | 0.000 | 0.000 | 0.000 | 2.902 | 995.251 | 0.010 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.198 | 18.339 | 0.018 | 0.198 | gw-r/thread-144/journal/page | none observed |
| 7152304862c892b5000000000000e6a9 | 1015.559 | 0.068 | 0.000 | 0.000 | 0.000 | 0.546 | 977.908 | 0.003 | 35.128 | 0.036 | 0.000 | n/a | n/a | 1.869 | 0.068 | 0.000 | 1.869 | gw-r/thread-156/journal/page | none observed |
| 7152304862c892b5000000000000e4e9 | 1014.851 | 12.172 | 0.000 | 0.000 | 0.000 | 1.054 | 937.463 | 0.004 | 63.955 | 0.034 | 0.000 | n/a | n/a | 0.168 | 12.172 | 0.012 | 0.168 | gw-r/thread-126/journal/page | none observed |
| 7152304862c892b5000000000000deed | 1012.970 | 39.958 | 0.000 | 0.000 | 0.000 | 1.869 | 970.796 | 0.072 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.189 | 39.958 | 0.039 | 0.189 | gw-r/thread-116/journal/page | none observed |
| 7152304862c892b5000000000000e559 | 1012.406 | 1.767 | 0.000 | 0.000 | 0.000 | 2.144 | 979.712 | 0.012 | 27.048 | 0.113 | 0.000 | n/a | n/a | 1.610 | 1.767 | 0.002 | 1.610 | gw-r/thread-95/journal/page | none observed |
| 7152304862c892b5000000000000e179 | 1004.470 | 12.415 | 0.000 | 0.000 | 0.000 | 0.642 | 938.531 | 0.009 | 52.626 | 0.031 | 0.000 | n/a | n/a | 0.216 | 12.415 | 0.012 | 0.216 | gw-r/thread-74/journal/page | none observed |
| 7152304862c892b5000000000000e14f | 1004.080 | 0.228 | 0.000 | 0.000 | 0.000 | 0.975 | 953.677 | 0.012 | 47.738 | 0.137 | 0.000 | n/a | n/a | 1.311 | 0.228 | 0.000 | 1.311 | gw-r/thread-162/journal/page | none observed |
| 7152304862c892b5000000000000e75d | 1003.006 | 5.860 | 0.000 | 0.000 | 0.000 | 15.229 | 961.642 | 0.005 | 20.067 | 0.039 | 0.000 | n/a | n/a | 0.165 | 5.860 | 0.006 | 0.165 | gw-r/thread-120/journal/page | none observed |
| 7152304862c892b5000000000000e6e3 | 1001.950 | 6.547 | 0.000 | 0.000 | 0.000 | 2.429 | 992.807 | 0.003 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.143 | 6.547 | 0.007 | 0.143 | gw-r/thread-79/journal/page | none observed |
| 7152304862c892b5000000000000e359 | 995.065 | 8.296 | 0.000 | 0.000 | 0.000 | 1.579 | 984.873 | 0.017 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.256 | 8.296 | 0.008 | 0.256 | gw-r/thread-148/journal/page | none observed |
| 7152304862c892b5000000000000e4f9 | 983.256 | 3.044 | 0.000 | 0.000 | 0.000 | 4.580 | 958.206 | 0.004 | 17.306 | 0.006 | 0.000 | n/a | n/a | 0.111 | 3.044 | 0.003 | 0.111 | gw-r/thread-97/journal/page | none observed |
| 7152304862c892b5000000000000e5b9 | 968.821 | 17.494 | 0.000 | 0.000 | 0.000 | 1.164 | 858.991 | 0.008 | 90.777 | 0.076 | 0.000 | n/a | n/a | 0.311 | 17.494 | 0.018 | 0.311 | gw-r/thread-130/journal/page | none observed |
| 7152304862c892b5000000000000e2b9 | 958.674 | 11.074 | 0.000 | 0.000 | 0.000 | 7.750 | 888.198 | 0.013 | 48.088 | 0.040 | 0.000 | n/a | n/a | 3.511 | 11.074 | 0.012 | 3.511 | gw-r/thread-96/journal/page | none observed |
| 7152304862c892b5000000000000e609 | 940.221 | 4.409 | 0.000 | 0.000 | 0.000 | 4.582 | 907.775 | 0.083 | 23.203 | 0.045 | 0.000 | n/a | n/a | 0.125 | 4.409 | 0.005 | 0.125 | gw-r/thread-49/journal/page | none observed |
| 7152304862c892b5000000000000e169 | 936.342 | 9.789 | 0.000 | 0.000 | 0.000 | 2.117 | 903.666 | 0.007 | 13.899 | 0.035 | 0.000 | n/a | n/a | 6.829 | 9.789 | 0.010 | 6.829 | gw-r/thread-76/journal/page | none observed |
| 7152304862c892b5000000000000dfcd | 911.340 | 9.888 | 0.000 | 0.000 | 0.000 | 2.279 | 845.152 | 0.005 | 53.911 | 0.020 | 0.000 | n/a | n/a | 0.086 | 9.888 | 0.011 | 0.086 | gw-r/thread-178/journal/page | none observed |
| 7152304862c892b5000000000000e2a9 | 908.479 | 3.069 | 0.000 | 0.000 | 0.000 | 0.728 | 904.495 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.140 | 3.069 | 0.003 | 0.140 | gw-r/thread-174/journal/page | none observed |
| 7152304862c892b5000000000000e439 | 894.150 | 12.632 | 0.000 | 0.000 | 0.000 | 1.135 | 854.464 | 0.002 | 25.647 | 0.129 | 0.000 | n/a | n/a | 0.139 | 12.632 | 0.014 | 0.139 | gw-r/thread-141/journal/page | none observed |

## P3 / p4mix / internal (109 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 334.763 | 5.134 | 0.000 | 0.000 | 0.000 | 0.773 | 320.906 | 0.008 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.145 | 5.134 | 0.018 | 0.145 |
| p99 | 1003.494 | 20.515 | 0.000 | 2.806 | 0.000 | 7.045 | 989.082 | 1.015 | 37.139 | 0.093 | 0.000 | n/a | n/a | 1.305 | 20.984 | 0.772 | 1.305 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b5000000000000ea51 | 1007.365 | 3.360 | 0.000 | 0.000 | 0.000 | 2.021 | 981.325 | 0.446 | 19.990 | 0.054 | 0.000 | n/a | n/a | 0.169 | 3.360 | 0.003 | 0.169 | gw-r/thread-76/journal/page | none observed |
| 7152304862c892b5000000000000e77d | 1003.494 | 0.249 | 0.000 | 0.000 | 0.000 | 1.026 | 989.082 | 0.008 | 11.741 | 0.183 | 0.000 | n/a | n/a | 1.204 | 0.249 | 0.000 | 1.204 | gw-r/thread-131/journal/page | none observed |
| 7152304862c892b5000000000000edaf | 1003.268 | 0.234 | 0.000 | 0.000 | 0.000 | 1.376 | 977.071 | 0.004 | 23.342 | 0.033 | 0.000 | n/a | n/a | 1.209 | 0.234 | 0.000 | 1.209 | gw-r/thread-178/journal/page | none observed |
| 7152304862c892b5000000000000e9d7 | 1002.926 | 0.211 | 0.000 | 0.000 | 0.000 | 0.897 | 983.567 | 0.004 | 16.938 | 0.023 | 0.000 | n/a | n/a | 1.285 | 0.211 | 0.000 | 1.285 | gw-r/thread-159/journal/page | none observed |
| 7152304862c892b5000000000000eb4b | 1002.672 | 0.083 | 0.000 | 0.000 | 0.000 | 1.238 | 987.987 | 0.004 | 12.206 | 0.010 | 0.000 | n/a | n/a | 1.144 | 0.083 | 0.000 | 1.144 | gw-r/thread-147/journal/page | none observed |
| 7152304862c892b5000000000000ed55 | 1002.474 | 0.077 | 0.000 | 0.000 | 0.000 | 0.507 | 963.553 | 0.014 | 37.139 | 0.064 | 0.000 | n/a | n/a | 1.120 | 0.077 | 0.000 | 1.120 | gw-r/thread-153/journal/page | none observed |
| 7152304862c892b5000000000000eaf1 | 1002.175 | 0.089 | 0.000 | 0.000 | 0.000 | 0.553 | 1000.385 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 1.122 | 0.089 | 0.000 | 1.122 | gw-r/thread-135/journal/page | none observed |
| 7152304862c892b5000000000000ecd5 | 993.037 | 3.635 | 0.000 | 0.000 | 0.000 | 0.533 | 988.741 | 0.019 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.070 | 3.635 | 0.004 | 0.070 | gw-r/thread-141/journal/page | none observed |
| 7152304862c892b5000000000000e817 | 990.580 | 3.535 | 0.000 | 0.000 | 0.000 | 0.609 | 986.286 | 0.021 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.088 | 3.535 | 0.004 | 0.088 | gw-r/thread-161/journal/page | none observed |
| 7152304862c892b5000000000000e8f7 | 987.859 | 5.942 | 0.000 | 0.000 | 0.000 | 0.670 | 963.458 | 0.008 | 17.670 | 0.027 | 0.000 | n/a | n/a | 0.084 | 5.942 | 0.006 | 0.084 | gw-r/thread-107/journal/page | none observed |
| 7152304862c892b5000000000000e76d | 985.590 | 8.865 | 0.000 | 0.000 | 0.000 | 0.996 | 951.591 | 0.224 | 22.982 | 0.054 | 0.000 | n/a | n/a | 0.877 | 8.865 | 0.009 | 0.877 | gw-r/thread-111/journal/page | none observed |
| 7152304862c892b5000000000000ec65 | 968.755 | 6.338 | 0.000 | 0.000 | 0.000 | 0.773 | 920.251 | 0.258 | 40.940 | 0.039 | 0.000 | n/a | n/a | 0.155 | 6.338 | 0.007 | 0.155 | gw-r/thread-74/journal/page | none observed |
| 7152304862c892b5000000000000e797 | 956.626 | 18.438 | 0.000 | 0.000 | 0.000 | 1.205 | 920.431 | 0.036 | 16.033 | 0.048 | 0.000 | n/a | n/a | 0.436 | 18.438 | 0.019 | 0.436 | gw-r/thread-179/journal/page | none observed |
| 7152304862c892b5000000000000e8b7 | 915.307 | 5.482 | 0.000 | 0.000 | 0.000 | 0.862 | 908.625 | 0.133 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.171 | 5.482 | 0.006 | 0.171 | gw-r/thread-154/journal/page | none observed |
| 7152304862c892b5000000000000e8e7 | 898.416 | 4.428 | 0.000 | 0.000 | 0.000 | 0.878 | 875.037 | 0.004 | 17.959 | 0.023 | 0.000 | n/a | n/a | 0.087 | 4.428 | 0.005 | 0.087 | gw-r/thread-107/journal/page | none observed |
| 7152304862c892b5000000000000e927 | 893.929 | 4.213 | 0.000 | 0.000 | 0.000 | 0.773 | 870.091 | 0.074 | 18.636 | 0.052 | 0.000 | n/a | n/a | 0.090 | 4.213 | 0.005 | 0.090 | gw-r/thread-138/journal/page | none observed |
| 7152304862c892b5000000000000eb65 | 849.264 | 7.444 | 0.000 | 0.000 | 0.000 | 0.616 | 840.818 | 0.123 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.233 | 7.444 | 0.009 | 0.233 | gw-r/thread-127/journal/page | none observed |
| 7152304862c892b5000000000000e867 | 834.823 | 4.210 | 0.000 | 0.000 | 0.000 | 0.701 | 803.724 | 0.004 | 26.015 | 0.023 | 0.000 | n/a | n/a | 0.145 | 4.210 | 0.005 | 0.145 | gw-r/thread-130/journal/page | none observed |
| 7152304862c892b5000000000000ed6f | 814.637 | 5.464 | 0.000 | 0.000 | 0.000 | 0.635 | 806.963 | 1.015 | 0.369 | 0.053 | 0.000 | n/a | n/a | 0.138 | 5.464 | 0.007 | 0.138 | gw-r/thread-127/journal/page | none observed |
| 7152304862c892b5000000000000ecf5 | 806.980 | 5.664 | 0.000 | 0.000 | 0.000 | 0.613 | 800.294 | 0.104 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.268 | 5.664 | 0.007 | 0.268 | gw-r/thread-107/journal/page | none observed |

## P3 / p4h1 / internal (96 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 388.849 | 5.396 | 0.000 | 0.000 | 0.000 | 0.725 | 376.083 | 0.011 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.157 | 5.396 | 0.017 | 0.157 |
| p99 | 1082.228 | 31.653 | 0.000 | 1.359 | 0.000 | 17.852 | 1002.881 | 5.020 | 69.924 | 0.079 | 0.000 | n/a | n/a | 2.247 | 31.653 | 0.849 | 2.247 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b5000000000000eef9 | 1082.228 | 4.183 | 0.000 | 0.000 | 0.000 | 3.100 | 1002.881 | 0.017 | 69.737 | 0.063 | 0.000 | n/a | n/a | 2.247 | 4.183 | 0.004 | 2.247 | gw-r/thread-133/journal/page | none observed |
| 7152304862c892b5000000000000f37d | 1004.645 | 3.595 | 0.000 | 0.000 | 0.000 | 0.535 | 1000.417 | 0.002 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.083 | 3.595 | 0.004 | 0.083 | gw-r/thread-79/journal/page | none observed |
| 7152304862c892b5000000000000ef43 | 1002.541 | 0.209 | 0.000 | 0.000 | 0.000 | 0.649 | 982.937 | 0.009 | 17.512 | 0.047 | 0.000 | n/a | n/a | 1.179 | 0.209 | 0.000 | 1.179 | gw-r/thread-164/journal/page | none observed |
| 7152304862c892b5000000000000f02d | 1001.936 | 5.120 | 0.000 | 0.000 | 0.000 | 0.697 | 971.841 | 0.022 | 24.045 | 0.073 | 0.000 | n/a | n/a | 0.138 | 5.120 | 0.005 | 0.138 | gw-r/thread-166/journal/page | none observed |
| 7152304862c892b5000000000000eea9 | 992.060 | 5.103 | 0.000 | 0.000 | 0.000 | 0.694 | 916.187 | 0.004 | 69.924 | 0.037 | 0.000 | n/a | n/a | 0.111 | 5.103 | 0.005 | 0.111 | gw-r/thread-141/journal/page | none observed |
| 7152304862c892b5000000000000f23d | 987.330 | 4.524 | 0.000 | 0.000 | 0.000 | 0.735 | 981.818 | 0.074 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.148 | 4.524 | 0.005 | 0.148 | gw-r/thread-126/journal/page | none observed |
| 7152304862c892b5000000000000f22d | 984.427 | 6.944 | 0.000 | 0.000 | 0.000 | 0.642 | 976.592 | 0.017 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.180 | 6.944 | 0.007 | 0.180 | gw-r/thread-122/journal/page | none observed |
| 7152304862c892b5000000000000efcd | 981.402 | 7.271 | 0.000 | 0.000 | 0.000 | 0.539 | 955.534 | 0.169 | 17.617 | 0.059 | 0.000 | n/a | n/a | 0.214 | 7.271 | 0.007 | 0.214 | gw-r/thread-79/journal/page | none observed |
| 7152304862c892b5000000000000f0dd | 980.386 | 9.709 | 0.000 | 0.000 | 0.000 | 0.708 | 969.708 | 0.017 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.199 | 9.709 | 0.010 | 0.199 | gw-r/thread-146/journal/page | none observed |
| 7152304862c892b5000000000000f2dd | 931.902 | 4.529 | 0.000 | 0.000 | 0.000 | 0.778 | 903.636 | 0.144 | 22.683 | 0.035 | 0.000 | n/a | n/a | 0.097 | 4.529 | 0.005 | 0.097 | gw-r/thread-173/journal/page | none observed |
| 7152304862c892b5000000000000ef6d | 930.546 | 4.140 | 0.000 | 0.000 | 0.000 | 0.541 | 925.633 | 0.107 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.105 | 4.140 | 0.004 | 0.105 | gw-r/thread-113/journal/page | none observed |
| 7152304862c892b5000000000000ee69 | 920.046 | 5.333 | 0.000 | 0.000 | 0.000 | 0.593 | 913.989 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.103 | 5.333 | 0.006 | 0.103 | gw-r/thread-136/journal/page | none observed |
| 7152304862c892b5000000000000ef9d | 915.072 | 2.853 | 0.000 | 0.000 | 0.000 | 0.568 | 896.101 | 0.005 | 15.431 | 0.018 | 0.000 | n/a | n/a | 0.097 | 2.853 | 0.003 | 0.097 | gw-r/thread-119/journal/page | none observed |
| 7152304862c892b5000000000000f27d | 910.230 | 4.581 | 0.000 | 0.000 | 0.000 | 0.742 | 904.690 | 0.003 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.186 | 4.581 | 0.005 | 0.186 | gw-r/thread-96/journal/page | none observed |
| 7152304862c892b5000000000000f14d | 895.612 | 7.339 | 0.000 | 0.000 | 0.000 | 0.615 | 887.346 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.278 | 7.339 | 0.008 | 0.278 | gw-r/thread-121/journal/page | none observed |
| 7152304862c892b5000000000000f1dd | 889.911 | 4.800 | 0.000 | 0.000 | 0.000 | 0.874 | 883.918 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.264 | 4.800 | 0.005 | 0.264 | gw-r/thread-89/journal/page | none observed |
| 7152304862c892b5000000000000ef13 | 888.961 | 5.651 | 0.000 | 0.000 | 0.000 | 0.729 | 868.627 | 0.173 | 13.618 | 0.062 | 0.000 | n/a | n/a | 0.102 | 5.651 | 0.006 | 0.102 | gw-r/thread-77/journal/page | none observed |
| 7152304862c892b5000000000000f24d | 872.435 | 5.483 | 0.000 | 0.000 | 0.000 | 0.758 | 848.208 | 0.005 | 17.741 | 0.021 | 0.000 | n/a | n/a | 0.218 | 5.483 | 0.006 | 0.218 | gw-r/thread-129/journal/page | none observed |
| 7152304862c892b5000000000000efbd | 867.455 | 19.586 | 0.000 | 0.000 | 0.000 | 2.025 | 831.691 | 0.010 | 13.917 | 0.063 | 0.000 | n/a | n/a | 0.164 | 19.586 | 0.023 | 0.164 | gw-r/thread-155/journal/page | none observed |
| 7152304862c892b5000000000000f0bd | 863.251 | 19.713 | 0.000 | 0.000 | 0.000 | 1.903 | 841.241 | 0.012 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.323 | 19.713 | 0.023 | 0.323 | gw-r/thread-153/journal/page | none observed |

## P3 / grow3 / internal (44 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 144.193 | 19.365 | 0.000 | 0.000 | 0.000 | 1.170 | 81.087 | 0.008 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.678 | 19.365 | 0.420 | 0.678 |
| p99 | 917.864 | 411.313 | 0.000 | 39.203 | 0.000 | 5.806 | 749.449 | 2.389 | 182.346 | 18.440 | 0.000 | n/a | n/a | 23.470 | 450.517 | 0.883 | 23.470 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b5000000000000fcc1 | 917.864 | 180.483 | 0.000 | 28.880 | 0.000 | 1.032 | 704.251 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 3.161 | 209.363 | 0.228 | 3.161 | gw-r/thread-88/journal/page | none observed |
| 7152304862c892b50000000000010019 | 916.046 | 411.313 | 0.000 | 39.203 | 0.000 | 1.720 | 440.233 | 0.007 | 0.000 | 0.099 | 0.000 | n/a | n/a | 23.470 | 450.517 | 0.492 | 23.470 | gw-r/thread-94/journal/page | none observed |
| 7152304862c892b5000000000000fe6d | 915.415 | 231.991 | 0.000 | 10.051 | 0.000 | 1.404 | 652.606 | 0.010 | 0.000 | 0.064 | 0.000 | n/a | n/a | 19.288 | 242.042 | 0.264 | 19.288 | gw-r/thread-77/journal/page | none observed |
| 7152304862c892b5000000000000f5f9 | 915.223 | 147.982 | 0.000 | 9.728 | 0.000 | 1.473 | 749.449 | 2.389 | 0.000 | 0.054 | 0.000 | n/a | n/a | 4.149 | 157.710 | 0.172 | 4.149 | gw-r/thread-160/journal/page | none observed |
| 7152304862c892b500000000000101d1 | 815.172 | 54.237 | 0.000 | 4.146 | 0.000 | 5.806 | 732.236 | 0.013 | 0.000 | 18.440 | 0.000 | n/a | n/a | 0.294 | 58.383 | 0.072 | 0.294 | gw-r/thread-133/journal/page | none observed |
| 7152304862c892b50000000000010903 | 775.889 | 134.332 | 0.000 | 6.767 | 0.000 | 1.117 | 447.111 | 2.250 | 182.346 | 0.053 | 0.000 | n/a | n/a | 1.913 | 141.099 | 0.182 | 1.913 | gw-r/thread-124/journal/page | none observed |
| 7152304862c892b5000000000000fb15 | 713.877 | 143.840 | 0.000 | 10.426 | 0.000 | 1.646 | 554.165 | 0.013 | 0.000 | 0.080 | 0.000 | n/a | n/a | 3.706 | 154.266 | 0.216 | 3.706 | gw-r/thread-86/journal/page | none observed |
| 7152304862c892b5000000000000f979 | 686.953 | 152.814 | 0.000 | 8.938 | 0.000 | 1.691 | 518.613 | 1.069 | 0.000 | 0.054 | 0.000 | n/a | n/a | 3.773 | 161.752 | 0.235 | 3.773 | gw-r/thread-172/journal/page | none observed |
| 7152304862c892b5000000000000f7cd | 668.001 | 154.747 | 0.000 | 6.865 | 0.000 | 0.887 | 502.034 | 0.007 | 0.000 | 0.041 | 0.000 | n/a | n/a | 3.420 | 161.612 | 0.242 | 3.420 | gw-r/thread-165/journal/page | none observed |
| 7152304862c892b5000000000001020d | 498.629 | 145.105 | 0.000 | 6.723 | 0.000 | 1.219 | 341.168 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 4.374 | 151.828 | 0.304 | 4.374 | gw-r/thread-71/journal/page | none observed |
| 7152304862c892b50000000000010757 | 497.025 | 146.660 | 0.000 | 8.709 | 0.000 | 1.500 | 337.664 | 0.031 | 0.000 | 0.076 | 0.000 | n/a | n/a | 2.385 | 155.369 | 0.313 | 2.385 | gw-r/thread-90/journal/page | none observed |
| 7152304862c892b5000000000001040f | 467.595 | 125.219 | 0.000 | 12.731 | 0.000 | 1.700 | 322.416 | 1.581 | 0.000 | 0.065 | 0.000 | n/a | n/a | 3.882 | 137.950 | 0.295 | 3.882 | gw-r/thread-102/journal/page | none observed |
| 7152304862c892b50000000000010ab5 | 419.785 | 119.182 | 0.000 | 8.518 | 0.000 | 0.884 | 289.621 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.532 | 127.700 | 0.304 | 1.532 | gw-r/thread-106/journal/page | none observed |
| 7152304862c892b50000000000011493 | 331.337 | 110.395 | 0.000 | 7.550 | 0.000 | 0.667 | 209.612 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 3.066 | 117.945 | 0.356 | 3.066 | gw-r/thread-99/journal/page | none observed |
| 7152304862c892b500000000000105ab | 292.939 | 93.431 | 0.000 | 6.317 | 0.000 | 1.378 | 190.165 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.602 | 99.749 | 0.341 | 1.602 | gw-r/thread-106/journal/page | none observed |
| 7152304862c892b5000000000001114b | 286.836 | 146.210 | 0.000 | 8.084 | 0.000 | 0.885 | 129.002 | 0.005 | 0.000 | 0.217 | 0.000 | n/a | n/a | 2.433 | 154.294 | 0.538 | 2.433 | gw-r/thread-112/journal/page | none observed |
| 7152304862c892b50000000000010f9f | 282.429 | 148.005 | 0.000 | 8.952 | 0.000 | 1.609 | 121.255 | 0.004 | 0.000 | 0.048 | 0.000 | n/a | n/a | 2.555 | 156.957 | 0.556 | 2.555 | gw-r/thread-128/journal/page | none observed |
| 7152304862c892b500000000000103d9 | 273.084 | 5.885 | 0.000 | 0.000 | 0.000 | 0.633 | 266.008 | 0.258 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.128 | 5.885 | 0.022 | 0.128 | gw-r/thread-173/journal/page | none observed |
| 7152304862c892b50000000000010ded | 270.878 | 125.752 | 0.000 | 9.040 | 0.000 | 1.178 | 103.265 | 0.014 | 29.356 | 0.041 | 0.000 | n/a | n/a | 2.231 | 134.792 | 0.498 | 2.231 | gw-r/thread-124/journal/page | none observed |
| 7152304862c892b50000000000010c51 | 269.035 | 122.905 | 0.000 | 7.144 | 0.000 | 1.313 | 134.940 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 2.697 | 130.049 | 0.483 | 2.697 | gw-r/thread-106/journal/page | none observed |

## P3 / p4h3 / internal (95 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 426.134 | 5.396 | 0.000 | 0.000 | 0.000 | 0.710 | 418.944 | 0.008 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.149 | 5.396 | 0.015 | 0.149 |
| p99 | 1076.259 | 182.798 | 0.000 | 14.090 | 0.000 | 7.211 | 1000.692 | 0.311 | 58.826 | 0.267 | 0.000 | n/a | n/a | 5.662 | 196.887 | 0.664 | 5.662 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b50000000000011c53 | 1076.259 | 182.798 | 0.000 | 14.090 | 0.000 | 4.266 | 871.268 | 0.013 | 0.000 | 0.067 | 0.000 | n/a | n/a | 3.758 | 196.887 | 0.183 | 3.758 | gw-r/thread-122/journal/page | none observed |
| 7152304862c892b50000000000011bf3 | 1008.069 | 6.897 | 0.000 | 0.000 | 0.000 | 0.883 | 999.923 | 0.112 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.191 | 6.897 | 0.007 | 0.191 | gw-r/thread-104/journal/page | none observed |
| 7152304862c892b50000000000011be3 | 1007.515 | 6.272 | 0.000 | 0.000 | 0.000 | 0.963 | 999.981 | 0.003 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.278 | 6.272 | 0.006 | 0.278 | gw-r/thread-167/journal/page | none observed |
| 7152304862c892b5000000000001195f | 1003.148 | 0.193 | 0.000 | 0.000 | 0.000 | 0.582 | 950.747 | 0.021 | 50.334 | 0.128 | 0.000 | n/a | n/a | 1.144 | 0.193 | 0.000 | 1.144 | gw-r/thread-52/journal/page | none observed |
| 7152304862c892b50000000000011925 | 1002.720 | 0.178 | 0.000 | 0.000 | 0.000 | 0.634 | 981.498 | 0.011 | 19.092 | 0.050 | 0.000 | n/a | n/a | 1.258 | 0.178 | 0.000 | 1.258 | gw-r/thread-122/journal/page | none observed |
| 7152304862c892b50000000000011bc9 | 1002.077 | 0.113 | 0.000 | 0.000 | 0.000 | 0.607 | 975.825 | 0.003 | 24.313 | 0.008 | 0.000 | n/a | n/a | 1.206 | 0.113 | 0.000 | 1.206 | gw-r/thread-106/journal/page | none observed |
| 7152304862c892b500000000000117df | 1001.891 | 0.097 | 0.000 | 0.000 | 0.000 | 0.555 | 967.161 | 0.003 | 32.934 | 0.008 | 0.000 | n/a | n/a | 1.134 | 0.097 | 0.000 | 1.134 | gw-r/thread-133/journal/page | none observed |
| 7152304862c892b50000000000011829 | 1001.772 | 0.178 | 0.000 | 0.000 | 0.000 | 0.726 | 1000.692 | 0.010 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.104 | 0.178 | 0.000 | 0.104 | gw-r/thread-166/journal/page | none observed |
| 7152304862c892b50000000000011a59 | 1001.031 | 6.619 | 0.000 | 0.000 | 0.000 | 0.627 | 993.352 | 0.139 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.251 | 6.619 | 0.007 | 0.251 | gw-r/thread-169/journal/page | none observed |
| 7152304862c892b50000000000011b19 | 998.800 | 6.539 | 0.000 | 0.000 | 0.000 | 0.793 | 991.049 | 0.004 | 0.000 | 0.267 | 0.000 | n/a | n/a | 0.148 | 6.539 | 0.007 | 0.148 | gw-r/thread-100/journal/page | none observed |
| 7152304862c892b50000000000011999 | 997.943 | 2.717 | 0.000 | 0.000 | 0.000 | 0.501 | 994.540 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.142 | 2.717 | 0.003 | 0.142 | gw-r/thread-92/journal/page | none observed |
| 7152304862c892b50000000000011a49 | 997.933 | 6.482 | 0.000 | 0.000 | 0.000 | 0.537 | 974.709 | 0.079 | 15.989 | 0.026 | 0.000 | n/a | n/a | 0.111 | 6.482 | 0.006 | 0.111 | gw-r/thread-123/journal/page | none observed |
| 7152304862c892b5000000000001169f | 997.875 | 7.802 | 0.000 | 0.000 | 0.000 | 0.677 | 989.118 | 0.008 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.230 | 7.802 | 0.008 | 0.230 | gw-r/thread-140/journal/page | none observed |
| 7152304862c892b500000000000118d3 | 993.093 | 5.388 | 0.000 | 0.000 | 0.000 | 0.524 | 967.050 | 0.002 | 20.001 | 0.027 | 0.000 | n/a | n/a | 0.101 | 5.388 | 0.005 | 0.101 | gw-r/thread-144/journal/page | none observed |
| 7152304862c892b50000000000011a39 | 985.815 | 2.833 | 0.000 | 0.000 | 0.000 | 0.510 | 982.332 | 0.003 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.110 | 2.833 | 0.003 | 0.110 | gw-r/thread-163/journal/page | none observed |
| 7152304862c892b50000000000011905 | 980.956 | 4.537 | 0.000 | 0.000 | 0.000 | 0.527 | 947.642 | 0.004 | 27.966 | 0.011 | 0.000 | n/a | n/a | 0.269 | 4.537 | 0.005 | 0.269 | gw-r/thread-93/journal/page | none observed |
| 7152304862c892b500000000000118c3 | 958.335 | 5.322 | 0.000 | 0.000 | 0.000 | 0.561 | 935.222 | 0.002 | 17.067 | 0.039 | 0.000 | n/a | n/a | 0.122 | 5.322 | 0.006 | 0.122 | gw-r/thread-112/journal/page | none observed |
| 7152304862c892b500000000000116af | 947.126 | 5.122 | 0.000 | 0.000 | 0.000 | 0.881 | 881.986 | 0.009 | 58.826 | 0.053 | 0.000 | n/a | n/a | 0.249 | 5.122 | 0.005 | 0.249 | gw-r/thread-154/journal/page | none observed |
| 7152304862c892b500000000000117cf | 931.586 | 6.548 | 0.000 | 0.000 | 0.000 | 2.015 | 905.469 | 0.002 | 17.403 | 0.020 | 0.000 | n/a | n/a | 0.129 | 6.548 | 0.007 | 0.129 | gw-r/thread-77/journal/page | none observed |
| 7152304862c892b50000000000011979 | 917.488 | 5.395 | 0.000 | 0.000 | 0.000 | 0.599 | 901.589 | 0.005 | 9.675 | 0.025 | 0.000 | n/a | n/a | 0.199 | 5.395 | 0.006 | 0.199 | gw-r/thread-52/journal/page | none observed |

## P3 / grow10 / internal (103 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 214.793 | 121.825 | 0.000 | 8.484 | 0.000 | 0.994 | 58.947 | 0.008 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.762 | 130.358 | 0.576 | 1.762 |
| p99 | 706.796 | 211.669 | 0.000 | 20.253 | 0.000 | 3.987 | 526.419 | 2.285 | 49.366 | 0.139 | 0.000 | n/a | n/a | 5.408 | 231.362 | 0.912 | 5.408 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b50000000000011e05 | 839.975 | 129.457 | 0.000 | 10.904 | 0.000 | 0.833 | 692.778 | 0.135 | 0.000 | 0.065 | 0.000 | n/a | n/a | 5.803 | 140.361 | 0.167 | 5.803 | gw-r/thread-180/journal/page | none observed |
| 7152304862c892b500000000000152a3 | 706.796 | 160.970 | 0.000 | 13.681 | 0.000 | 1.114 | 526.419 | 2.285 | 0.000 | 0.069 | 0.000 | n/a | n/a | 2.257 | 174.652 | 0.247 | 2.257 | gw-r/thread-121/journal/page | none observed |
| 7152304862c892b5000000000001249b | 578.059 | 150.185 | 0.000 | 11.001 | 0.000 | 0.994 | 411.480 | 0.009 | 0.000 | 0.065 | 0.000 | n/a | n/a | 4.324 | 161.187 | 0.279 | 4.324 | gw-r/thread-180/journal/page | none observed |
| 7152304862c892b50000000000012647 | 524.580 | 116.663 | 0.000 | 6.751 | 0.000 | 1.173 | 398.052 | 0.007 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.892 | 123.414 | 0.235 | 1.892 | gw-r/thread-139/journal/page | none observed |
| 7152304862c892b50000000000015e0d | 478.633 | 122.786 | 0.000 | 9.883 | 0.000 | 0.727 | 343.862 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.327 | 132.669 | 0.277 | 1.327 | gw-r/thread-102/journal/page | none observed |
| 7152304862c892b50000000000018095 | 447.912 | 205.322 | 0.000 | 9.931 | 0.000 | 1.536 | 229.279 | 0.010 | 0.000 | 0.073 | 0.000 | n/a | n/a | 1.761 | 215.253 | 0.481 | 1.761 | gw-r/thread-76/journal/page | none observed |
| 7152304862c892b500000000000127f3 | 444.368 | 163.039 | 0.000 | 8.136 | 0.000 | 2.029 | 184.849 | 0.010 | 84.140 | 0.041 | 0.000 | n/a | n/a | 2.125 | 171.175 | 0.385 | 2.125 | gw-r/thread-135/journal/page | none observed |
| 7152304862c892b50000000000018a7d | 428.657 | 160.907 | 0.000 | 12.410 | 0.000 | 1.466 | 250.575 | 1.274 | 0.000 | 0.049 | 0.000 | n/a | n/a | 1.976 | 173.317 | 0.404 | 1.976 | gw-r/thread-93/journal/page | none observed |
| 7152304862c892b50000000000016e91 | 403.242 | 131.692 | 0.000 | 13.469 | 0.000 | 1.495 | 233.166 | 0.006 | 21.701 | 0.047 | 0.000 | n/a | n/a | 1.667 | 145.160 | 0.360 | 1.667 | gw-r/thread-146/journal/page | none observed |
| 7152304862c892b50000000000011fa1 | 402.522 | 152.870 | 0.000 | 9.464 | 0.000 | 0.958 | 234.222 | 0.011 | 0.000 | 0.052 | 0.000 | n/a | n/a | 4.945 | 162.334 | 0.403 | 4.945 | gw-r/thread-180/journal/page | none observed |
| 7152304862c892b500000000000183cd | 400.424 | 166.407 | 0.000 | 9.227 | 0.000 | 1.398 | 170.458 | 0.007 | 49.366 | 0.061 | 0.000 | n/a | n/a | 3.501 | 175.634 | 0.439 | 3.501 | gw-r/thread-76/journal/page | none observed |
| 7152304862c892b50000000000012e89 | 385.925 | 151.945 | 0.000 | 11.617 | 0.000 | 1.333 | 192.278 | 25.747 | 0.000 | 0.090 | 0.000 | n/a | n/a | 2.914 | 163.562 | 0.424 | 2.914 | gw-r/thread-126/journal/page | none observed |
| 7152304862c892b50000000000014a77 | 378.028 | 169.935 | 0.000 | 10.966 | 0.000 | 1.170 | 157.547 | 0.017 | 35.566 | 0.096 | 0.000 | n/a | n/a | 2.731 | 180.901 | 0.479 | 2.731 | gw-r/thread-103/journal/page | none observed |
| 7152304862c892b5000000000001388d | 376.040 | 145.366 | 0.000 | 9.332 | 0.000 | 1.630 | 216.477 | 1.266 | 0.000 | 0.068 | 0.000 | n/a | n/a | 1.900 | 154.699 | 0.411 | 1.900 | gw-r/thread-49/journal/page | none observed |
| 7152304862c892b50000000000016175 | 374.859 | 139.653 | 0.000 | 10.113 | 0.000 | 0.857 | 220.847 | 0.030 | 0.000 | 0.080 | 0.000 | n/a | n/a | 3.280 | 149.765 | 0.400 | 3.280 | gw-r/thread-178/journal/page | none observed |
| 7152304862c892b5000000000001703d | 335.994 | 162.373 | 0.000 | 8.821 | 0.000 | 1.252 | 161.218 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 2.287 | 171.194 | 0.510 | 2.287 | gw-r/thread-108/journal/page | none observed |
| 7152304862c892b5000000000001543f | 333.010 | 110.170 | 0.000 | 6.998 | 0.000 | 1.378 | 213.010 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 1.411 | 117.167 | 0.352 | 1.411 | gw-r/thread-103/journal/page | none observed |
| 7152304862c892b50000000000015fa9 | 328.503 | 174.509 | 0.000 | 10.590 | 0.000 | 1.851 | 139.666 | 0.173 | 0.000 | 0.135 | 0.000 | n/a | n/a | 1.579 | 185.099 | 0.563 | 1.579 | node-14/thread-2/replica.fetch-feed | none observed |
| 7152304862c892b50000000000018231 | 322.479 | 154.210 | 0.000 | 12.495 | 0.000 | 3.487 | 149.823 | 0.007 | 0.000 | 0.139 | 0.000 | n/a | n/a | 2.317 | 166.706 | 0.517 | 2.317 | gw-r/thread-76/journal/page | none observed |
| 7152304862c892b50000000000017385 | 316.065 | 114.324 | 0.000 | 9.721 | 0.000 | 0.676 | 189.549 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 1.757 | 124.045 | 0.392 | 1.757 | gw-r/thread-50/journal/page | none observed |

## P3 / p4h10 / internal (99 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 411.825 | 4.150 | 0.000 | 0.000 | 0.000 | 0.641 | 402.862 | 0.007 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.133 | 4.150 | 0.015 | 0.133 |
| p99 | 1004.377 | 26.247 | 0.000 | 2.970 | 0.000 | 6.823 | 999.043 | 0.817 | 51.963 | 0.105 | 0.000 | n/a | n/a | 1.539 | 26.247 | 0.813 | 1.539 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b50000000000019299 | 1004.377 | 0.394 | 0.000 | 0.000 | 0.000 | 1.835 | 973.805 | 0.019 | 27.106 | 0.063 | 0.000 | n/a | n/a | 1.155 | 0.394 | 0.000 | 1.155 | gw-r/thread-100/journal/page | none observed |
| 7152304862c892b500000000000191df | 1003.543 | 3.573 | 0.000 | 0.000 | 0.000 | 0.661 | 999.043 | 0.075 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.158 | 3.573 | 0.004 | 0.158 | gw-r/thread-94/journal/page | none observed |
| 7152304862c892b500000000000192e3 | 1003.085 | 3.864 | 0.000 | 0.000 | 0.000 | 0.558 | 998.476 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.141 | 3.864 | 0.004 | 0.141 | gw-r/thread-165/journal/page | none observed |
| 7152304862c892b5000000000001906b | 1002.980 | 6.889 | 0.000 | 0.000 | 0.000 | 0.615 | 980.044 | 0.017 | 15.256 | 0.043 | 0.000 | n/a | n/a | 0.116 | 6.889 | 0.007 | 0.116 | gw-r/thread-52/journal/page | none observed |
| 7152304862c892b50000000000018fd1 | 1002.823 | 0.090 | 0.000 | 0.000 | 0.000 | 0.533 | 988.863 | 0.015 | 12.031 | 0.072 | 0.000 | n/a | n/a | 1.220 | 0.090 | 0.000 | 1.220 | gw-r/thread-110/journal/page | none observed |
| 7152304862c892b5000000000001910b | 1002.531 | 0.147 | 0.000 | 0.000 | 0.000 | 0.566 | 970.767 | 0.006 | 29.884 | 0.043 | 0.000 | n/a | n/a | 1.117 | 0.147 | 0.000 | 1.117 | gw-r/thread-154/journal/page | none observed |
| 7152304862c892b50000000000019165 | 1002.329 | 0.174 | 0.000 | 0.000 | 0.000 | 0.508 | 980.061 | 0.006 | 20.455 | 0.023 | 0.000 | n/a | n/a | 1.101 | 0.174 | 0.000 | 1.101 | gw-r/thread-51/journal/page | none observed |
| 7152304862c892b500000000000194c5 | 1002.229 | 0.122 | 0.000 | 0.000 | 0.000 | 0.545 | 984.339 | 0.004 | 16.073 | 0.028 | 0.000 | n/a | n/a | 1.118 | 0.122 | 0.000 | 1.118 | gw-r/thread-116/journal/page | none observed |
| 7152304862c892b5000000000001920f | 1002.212 | 0.078 | 0.000 | 0.000 | 0.000 | 0.524 | 954.983 | 0.011 | 45.466 | 0.045 | 0.000 | n/a | n/a | 1.105 | 0.078 | 0.000 | 1.105 | gw-r/thread-71/journal/page | none observed |
| 7152304862c892b500000000000191cf | 1000.277 | 3.249 | 0.000 | 0.000 | 0.000 | 0.552 | 996.385 | 0.012 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.051 | 3.249 | 0.003 | 0.051 | gw-r/thread-152/journal/page | none observed |
| 7152304862c892b500000000000193f5 | 993.077 | 3.949 | 0.000 | 0.000 | 0.000 | 0.529 | 962.578 | 0.002 | 25.891 | 0.021 | 0.000 | n/a | n/a | 0.106 | 3.949 | 0.004 | 0.106 | gw-r/thread-180/journal/page | none observed |
| 7152304862c892b50000000000019269 | 989.516 | 6.927 | 0.000 | 0.000 | 0.000 | 3.055 | 979.319 | 0.002 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.193 | 6.927 | 0.007 | 0.193 | gw-r/thread-117/journal/page | none observed |
| 7152304862c892b500000000000194b5 | 981.829 | 2.807 | 0.000 | 0.000 | 0.000 | 0.566 | 960.577 | 0.014 | 17.753 | 0.049 | 0.000 | n/a | n/a | 0.063 | 2.807 | 0.003 | 0.063 | gw-r/thread-118/journal/page | none observed |
| 7152304862c892b50000000000019145 | 976.006 | 9.721 | 0.000 | 0.000 | 0.000 | 0.640 | 965.303 | 0.083 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.234 | 9.721 | 0.010 | 0.234 | gw-r/thread-143/journal/page | none observed |
| 7152304862c892b5000000000001952f | 919.878 | 3.080 | 0.000 | 0.000 | 0.000 | 0.645 | 916.052 | 0.002 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.075 | 3.080 | 0.003 | 0.075 | gw-r/thread-168/journal/page | none observed |
| 7152304862c892b50000000000018feb | 911.814 | 2.958 | 0.000 | 0.000 | 0.000 | 0.725 | 908.004 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.094 | 2.958 | 0.003 | 0.094 | gw-r/thread-110/journal/page | none observed |
| 7152304862c892b5000000000001904b | 907.796 | 3.728 | 0.000 | 0.000 | 0.000 | 0.612 | 903.279 | 0.011 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.140 | 3.728 | 0.004 | 0.140 | gw-r/thread-105/journal/page | none observed |
| 7152304862c892b50000000000019249 | 906.815 | 2.604 | 0.000 | 0.000 | 0.000 | 0.537 | 903.407 | 0.135 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.073 | 2.604 | 0.003 | 0.073 | gw-r/thread-104/journal/page | none observed |
| 7152304862c892b500000000000190fb | 890.214 | 3.002 | 0.000 | 0.000 | 0.000 | 0.555 | 861.887 | 0.050 | 24.561 | 0.065 | 0.000 | n/a | n/a | 0.094 | 3.002 | 0.003 | 0.094 | gw-r/thread-79/journal/page | none observed |
| 7152304862c892b50000000000019375 | 858.256 | 2.579 | 0.000 | 0.000 | 0.000 | 0.806 | 854.740 | 0.017 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.080 | 2.579 | 0.003 | 0.080 | gw-r/thread-71/journal/page | none observed |

## P3 / presweep / internal (97 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 388.826 | 7.027 | 0.000 | 0.000 | 0.000 | 1.294 | 357.386 | 0.008 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.153 | 7.027 | 0.024 | 0.153 |
| p99 | 1031.337 | 53.006 | 0.000 | 12.946 | 0.000 | 20.549 | 1002.352 | 0.291 | 104.328 | 0.224 | 0.000 | n/a | n/a | 10.000 | 65.952 | 0.840 | 10.000 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b50000000000019b5f | 1031.337 | 0.312 | 0.000 | 0.000 | 0.000 | 1.314 | 955.923 | 0.014 | 72.182 | 0.063 | 0.000 | n/a | n/a | 1.529 | 0.312 | 0.000 | 1.529 | gw-r/thread-126/journal/page | none observed |
| 7152304862c892b50000000000019993 | 1023.651 | 17.718 | 0.000 | 0.000 | 0.000 | 2.716 | 982.452 | 0.013 | 20.359 | 0.098 | 0.000 | n/a | n/a | 0.294 | 17.718 | 0.017 | 0.294 | gw-r/thread-87/journal/page | none observed |
| 7152304862c892b50000000000019ad5 | 1014.266 | 12.499 | 0.000 | 0.000 | 0.000 | 0.582 | 964.249 | 0.005 | 36.705 | 0.023 | 0.000 | n/a | n/a | 0.204 | 12.499 | 0.012 | 0.204 | gw-r/thread-174/journal/page | none observed |
| 7152304862c892b5000000000001973f | 1012.892 | 11.372 | 0.000 | 0.000 | 0.000 | 2.208 | 969.945 | 0.005 | 29.185 | 0.041 | 0.000 | n/a | n/a | 0.135 | 11.372 | 0.011 | 0.135 | gw-r/thread-166/journal/page | none observed |
| 7152304862c892b50000000000019899 | 1010.875 | 0.292 | 0.000 | 0.000 | 0.000 | 3.242 | 1002.352 | 0.014 | 0.000 | 0.075 | 0.000 | n/a | n/a | 4.898 | 0.292 | 0.000 | 4.898 | gw-r/thread-120/journal/page | none observed |
| 7152304862c892b5000000000001980f | 1010.728 | 0.091 | 0.000 | 0.000 | 0.000 | 0.478 | 952.525 | 0.026 | 56.352 | 0.065 | 0.000 | n/a | n/a | 1.191 | 0.091 | 0.000 | 1.191 | gw-r/thread-71/journal/page | none observed |
| 7152304862c892b50000000000019859 | 1006.945 | 6.489 | 0.000 | 0.000 | 0.000 | 0.720 | 999.469 | 0.125 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.103 | 6.489 | 0.006 | 0.103 | gw-r/thread-175/journal/page | none observed |
| 7152304862c892b50000000000019af5 | 1002.832 | 0.149 | 0.000 | 0.000 | 0.000 | 0.929 | 1000.547 | 0.008 | 0.000 | 0.053 | 0.000 | n/a | n/a | 1.145 | 0.149 | 0.000 | 1.145 | gw-r/thread-173/journal/page | none observed |
| 7152304862c892b500000000000198e3 | 1001.741 | 8.195 | 0.000 | 0.000 | 0.000 | 0.711 | 978.780 | 0.008 | 13.802 | 0.127 | 0.000 | n/a | n/a | 0.118 | 8.195 | 0.008 | 0.118 | gw-r/thread-101/journal/page | none observed |
| 7152304862c892b50000000000019b89 | 992.664 | 11.740 | 0.000 | 2.258 | 0.000 | 2.165 | 929.408 | 0.009 | 46.852 | 0.049 | 0.000 | n/a | n/a | 0.183 | 13.998 | 0.014 | 0.183 | gw-r/thread-78/journal/page | none observed |
| 7152304862c892b50000000000019ae5 | 991.566 | 14.845 | 0.000 | 0.000 | 0.000 | 0.897 | 917.008 | 0.007 | 58.534 | 0.048 | 0.000 | n/a | n/a | 0.226 | 14.845 | 0.015 | 0.226 | gw-r/thread-86/journal/page | none observed |
| 7152304862c892b500000000000196bf | 967.659 | 9.682 | 0.000 | 0.000 | 0.000 | 0.807 | 956.575 | 0.194 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.339 | 9.682 | 0.010 | 0.339 | gw-r/thread-178/journal/page | none observed |
| 7152304862c892b5000000000001960f | 938.884 | 3.869 | 0.000 | 0.000 | 0.000 | 0.689 | 934.087 | 0.063 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.111 | 3.869 | 0.004 | 0.111 | gw-r/thread-149/journal/page | none observed |
| 7152304862c892b50000000000019b99 | 934.047 | 53.006 | 0.000 | 12.946 | 0.000 | 9.089 | 857.960 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.009 | 65.952 | 0.071 | 1.009 | gw-r/thread-175/journal/page | none observed |
| 7152304862c892b500000000000197ef | 931.626 | 4.400 | 0.000 | 0.000 | 0.000 | 1.015 | 907.926 | 0.030 | 18.133 | 0.033 | 0.000 | n/a | n/a | 0.088 | 4.400 | 0.005 | 0.088 | gw-r/thread-79/journal/page | none observed |
| 7152304862c892b50000000000019ab5 | 902.711 | 7.027 | 0.000 | 0.000 | 0.000 | 0.768 | 876.145 | 0.009 | 18.518 | 0.063 | 0.000 | n/a | n/a | 0.180 | 7.027 | 0.008 | 0.180 | gw-r/thread-149/journal/page | none observed |
| 7152304862c892b50000000000019b79 | 892.509 | 27.521 | 0.000 | 3.225 | 0.000 | 0.820 | 832.343 | 0.023 | 28.307 | 0.021 | 0.000 | n/a | n/a | 0.250 | 30.746 | 0.034 | 0.250 | gw-r/thread-118/journal/page | none observed |
| 7152304862c892b500000000000195ff | 887.618 | 5.716 | 0.000 | 0.000 | 0.000 | 1.359 | 833.382 | 0.042 | 46.733 | 0.224 | 0.000 | n/a | n/a | 0.161 | 5.716 | 0.006 | 0.161 | gw-r/thread-166/journal/page | none observed |
| 7152304862c892b500000000000199b3 | 853.718 | 3.541 | 0.000 | 0.000 | 0.000 | 1.012 | 817.608 | 0.012 | 31.354 | 0.034 | 0.000 | n/a | n/a | 0.157 | 3.541 | 0.004 | 0.157 | gw-r/thread-163/journal/page | none observed |
| 7152304862c892b500000000000199d3 | 778.241 | 2.649 | 0.000 | 0.000 | 0.000 | 0.883 | 749.683 | 0.006 | 24.906 | 0.033 | 0.000 | n/a | n/a | 0.081 | 2.649 | 0.003 | 0.081 | gw-r/thread-78/journal/page | none observed |

## P3 / sweep / internal (8 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 48.430 | 12.646 | 0.000 | 1.138 | 0.000 | 3.225 | 2.179 | 0.008 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.205 | 12.646 | 0.315 | 0.205 |
| p99 | 1009.807 | 32.869 | 0.000 | 9.047 | 0.000 | 7.642 | 943.372 | 0.337 | 57.384 | 0.083 | 0.000 | n/a | n/a | 1.166 | 41.702 | 0.949 | 1.166 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b50000000000019c47 | 1009.807 | 0.176 | 0.000 | 0.000 | 0.000 | 7.642 | 943.372 | 0.010 | 57.384 | 0.058 | 0.000 | n/a | n/a | 1.166 | 0.176 | 0.000 | 1.166 | gw-r/thread-53/journal/page | none observed |
| 7152304862c892b50000000000019c37 | 652.356 | 12.646 | 0.000 | 0.000 | 0.000 | 3.225 | 636.284 | 0.007 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.112 | 12.646 | 0.019 | 0.112 | gw-r/thread-94/journal/page | none observed |
| 7152304862c892b50000000000019c27 | 91.178 | 25.908 | 0.000 | 2.771 | 0.000 | 0.718 | 61.495 | 0.008 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.205 | 28.679 | 0.315 | 0.205 | gw-r/thread-103/journal/page | none observed |
| 7152304862c892b50000000000019bb9 | 85.976 | 6.036 | 0.000 | 0.000 | 0.000 | 6.472 | 72.919 | 0.337 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.179 | 6.036 | 0.070 | 0.179 | gw-r/thread-154/journal/page | none observed |
| 7152304862c892b50000000000019bc9 | 48.430 | 32.869 | 0.000 | 8.833 | 0.000 | 5.030 | 1.328 | 0.012 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.354 | 41.702 | 0.861 | 0.354 | node-14/thread-2/replica.fetch-feed | none observed |
| 7152304862c892b50000000000019bdf | 42.025 | 30.816 | 0.000 | 9.047 | 0.000 | 0.613 | 1.285 | 0.008 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.247 | 39.863 | 0.949 | 0.247 | node-14/thread-2/replica.fetch-feed | none observed |
| 7152304862c892b50000000000019bf5 | 35.481 | 25.244 | 0.000 | 3.551 | 0.000 | 4.158 | 2.179 | 0.007 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.335 | 28.795 | 0.812 | 0.335 | node-14/thread-2/replica.fetch-feed | none observed |
| 7152304862c892b50000000000019c11 | 11.578 | 8.368 | 0.000 | 1.138 | 0.000 | 0.603 | 1.319 | 0.006 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.131 | 9.506 | 0.821 | 0.131 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / tail / internal (2642 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.899 | 7.111 | 0.000 | 0.000 | 0.000 | 0.695 | 6.037 | 0.007 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.151 | 7.202 | 0.503 | 0.151 |
| p99 | 1001.946 | 53.371 | 0.000 | 4.904 | 0.000 | 9.432 | 997.520 | 0.327 | 19.793 | 0.093 | 0.000 | n/a | n/a | 5.826 | 56.258 | 0.884 | 5.826 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7152304862c892b50000000000025063 | 1010.309 | 7.945 | 0.000 | 0.000 | 0.000 | 0.867 | 1001.283 | 0.012 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.155 | 7.945 | 0.008 | 0.155 | gw-r/thread-120/journal/page | none observed |
| 7152304862c892b50000000000019cd1 | 1008.681 | 6.894 | 0.000 | 0.000 | 0.000 | 1.063 | 1000.547 | 0.010 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.122 | 6.894 | 0.007 | 0.122 | gw-r/thread-156/journal/page | none observed |
| 7152304862c892b500000000000254a1 | 1006.443 | 4.105 | 0.000 | 0.000 | 0.000 | 0.613 | 1001.460 | 0.118 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.092 | 4.105 | 0.004 | 0.092 | gw-r/thread-119/journal/page | none observed |
| 7152304862c892b5000000000001a34f | 1006.414 | 4.682 | 0.000 | 0.000 | 0.000 | 0.581 | 1000.921 | 0.017 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.177 | 4.682 | 0.005 | 0.177 | gw-r/thread-87/journal/page | none observed |
| 7152304862c892b5000000000001a3e9 | 1005.301 | 2.931 | 0.000 | 0.000 | 0.000 | 0.894 | 1001.190 | 0.121 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.081 | 2.931 | 0.003 | 0.081 | gw-r/thread-116/journal/page | none observed |
| 7152304862c892b5000000000001a11b | 1005.260 | 5.458 | 0.000 | 0.000 | 0.000 | 0.616 | 998.782 | 0.124 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.227 | 5.458 | 0.005 | 0.227 | gw-r/thread-173/journal/page | none observed |
| 7152304862c892b500000000000258a5 | 1004.327 | 5.216 | 0.000 | 0.000 | 0.000 | 0.942 | 997.927 | 0.012 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.188 | 5.216 | 0.005 | 0.188 | gw-r/thread-141/journal/page | none observed |
| 7152304862c892b50000000000025855 | 1003.833 | 2.983 | 0.000 | 0.000 | 0.000 | 0.568 | 1000.070 | 0.074 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.100 | 2.983 | 0.003 | 0.100 | gw-r/thread-123/journal/page | none observed |
| 7152304862c892b5000000000001a2e5 | 1003.740 | 5.608 | 0.000 | 0.000 | 0.000 | 0.900 | 996.882 | 0.133 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.154 | 5.608 | 0.006 | 0.154 | gw-r/thread-119/journal/page | none observed |
| 7152304862c892b500000000000257eb | 1003.727 | 2.990 | 0.000 | 0.000 | 0.000 | 0.565 | 999.903 | 0.130 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.100 | 2.990 | 0.003 | 0.100 | gw-r/thread-165/journal/page | none observed |
| 7152304862c892b50000000000024eff | 1003.237 | 0.199 | 0.000 | 0.000 | 0.000 | 0.681 | 1001.063 | 0.009 | 0.000 | 0.087 | 0.000 | n/a | n/a | 1.198 | 0.199 | 0.000 | 1.198 | gw-r/thread-146/journal/page | none observed |
| 7152304862c892b50000000000024eab | 1003.097 | 0.236 | 0.000 | 0.000 | 0.000 | 0.788 | 1000.802 | 0.007 | 0.000 | 0.063 | 0.000 | n/a | n/a | 1.202 | 0.236 | 0.000 | 1.202 | gw-r/thread-139/journal/page | none observed |
| 7152304862c892b50000000000024ed5 | 1003.015 | 0.144 | 0.000 | 0.000 | 0.000 | 0.698 | 1000.883 | 0.018 | 0.000 | 0.071 | 0.000 | n/a | n/a | 1.201 | 0.144 | 0.000 | 1.201 | gw-r/thread-76/journal/page | none observed |
| 7152304862c892b5000000000002572b | 1002.960 | 5.107 | 0.000 | 0.000 | 0.000 | 0.597 | 997.092 | 0.006 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.124 | 5.107 | 0.005 | 0.124 | gw-r/thread-152/journal/page | none observed |
| 7152304862c892b5000000000001a12b | 1002.942 | 0.122 | 0.000 | 0.000 | 0.000 | 0.607 | 1000.977 | 0.012 | 0.000 | 0.096 | 0.000 | n/a | n/a | 1.127 | 0.122 | 0.000 | 1.127 | gw-r/thread-102/journal/page | none observed |
| 7152304862c892b50000000000025ab5 | 1002.894 | 0.125 | 0.000 | 0.000 | 0.000 | 0.550 | 1001.008 | 0.015 | 0.000 | 0.083 | 0.000 | n/a | n/a | 1.113 | 0.125 | 0.000 | 1.113 | gw-r/thread-46/journal/page | none observed |
| 7152304862c892b50000000000024f29 | 1002.877 | 0.201 | 0.000 | 0.000 | 0.000 | 0.766 | 1000.620 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 1.233 | 0.201 | 0.000 | 1.233 | gw-r/thread-166/journal/page | none observed |
| 7152304862c892b50000000000019fb1 | 1002.856 | 0.085 | 0.000 | 0.000 | 0.000 | 0.603 | 1000.976 | 0.023 | 0.000 | 0.061 | 0.000 | n/a | n/a | 1.108 | 0.085 | 0.000 | 1.108 | gw-r/thread-96/journal/page | none observed |
| 7152304862c892b500000000000256b1 | 1002.739 | 0.410 | 0.000 | 0.000 | 0.000 | 0.535 | 1000.531 | 0.008 | 0.000 | 0.053 | 0.000 | n/a | n/a | 1.203 | 0.410 | 0.000 | 1.203 | gw-r/thread-178/journal/page | none observed |
| 7152304862c892b500000000000257fb | 1002.582 | 0.101 | 0.000 | 0.000 | 0.000 | 0.725 | 1000.598 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 1.103 | 0.101 | 0.000 | 1.103 | gw-r/thread-167/journal/page | none observed |

## P3 / warmup / read (70 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.182 | 0.065 | 0.000 | 0.000 | 0.000 | 1.271 | 201.447 | 0.034 | 0.000 | 0.215 | 0.000 | n/a | n/a | 0.120 | 0.065 | 0.000 | 0.120 |
| p99 | 281.917 | 0.634 | 0.000 | 0.000 | 0.000 | 6.919 | 273.510 | 6.380 | 25.876 | 1.884 | 0.000 | n/a | n/a | 1.367 | 0.634 | 0.003 | 1.367 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d5500000000000000099 | 281.917 | 0.286 | 0.000 | 0.000 | 0.000 | 6.077 | 273.510 | 0.163 | 0.000 | 0.514 | 0.000 | n/a | n/a | 1.367 | 0.286 | 0.001 | 1.367 | gw-r/thread-49/journal/page | none observed |
| e606a721a887d55000000000000000b1 | 216.527 | 0.104 | 0.000 | 0.000 | 0.000 | 3.087 | 210.436 | 0.261 | 0.000 | 1.884 | 0.000 | n/a | n/a | 0.754 | 0.104 | 0.000 | 0.754 | gw-r/thread-76/journal/page | none observed |
| e606a721a887d55000000000000000a9 | 212.566 | 0.634 | 0.000 | 0.000 | 0.000 | 6.919 | 204.245 | 0.123 | 0.000 | 0.472 | 0.000 | n/a | n/a | 0.173 | 0.634 | 0.003 | 0.173 | gw-r/thread-49/journal/page | none observed |
| e606a721a887d55000000000000001e1 | 208.054 | 0.036 | 0.000 | 0.000 | 0.000 | 5.913 | 201.775 | 0.058 | 0.000 | 0.208 | 0.000 | n/a | n/a | 0.064 | 0.036 | 0.000 | 0.064 | gw-r/thread-78/journal/page | none observed |
| e606a721a887d5500000000000000139 | 207.775 | 0.052 | 0.000 | 0.000 | 0.000 | 3.608 | 203.449 | 0.043 | 0.000 | 0.473 | 0.000 | n/a | n/a | 0.150 | 0.052 | 0.000 | 0.150 | gw-r/thread-48/journal/page | none observed |
| e606a721a887d5500000000000000181 | 206.867 | 0.065 | 0.000 | 0.000 | 0.000 | 1.237 | 204.008 | 0.144 | 0.000 | 1.284 | 0.000 | n/a | n/a | 0.128 | 0.065 | 0.000 | 0.128 | gw-r/thread-79/journal/page | none observed |
| e606a721a887d55000000000000000e9 | 206.618 | 0.072 | 0.000 | 0.000 | 0.000 | 2.222 | 203.750 | 0.135 | 0.000 | 0.342 | 0.000 | n/a | n/a | 0.096 | 0.072 | 0.000 | 0.096 | gw-r/thread-72/journal/page | none observed |
| e606a721a887d5500000000000000149 | 206.207 | 0.198 | 0.000 | 0.000 | 0.000 | 2.074 | 203.420 | 0.035 | 0.000 | 0.339 | 0.000 | n/a | n/a | 0.140 | 0.198 | 0.001 | 0.140 | gw-r/thread-76/journal/page | none observed |
| e606a721a887d5500000000000000151 | 205.952 | 0.071 | 0.000 | 0.000 | 0.000 | 3.865 | 201.690 | 0.023 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.113 | 0.071 | 0.000 | 0.113 | gw-r/thread-52/journal/page | none observed |
| e606a721a887d5500000000000000141 | 205.806 | 0.119 | 0.000 | 0.000 | 0.000 | 2.137 | 202.772 | 0.101 | 0.000 | 0.266 | 0.000 | n/a | n/a | 0.411 | 0.119 | 0.001 | 0.411 | gw-r/thread-52/journal/page | none observed |
| e606a721a887d55000000000000000c1 | 205.797 | 0.160 | 0.000 | 0.000 | 0.000 | 1.487 | 203.139 | 0.279 | 0.000 | 0.418 | 0.000 | n/a | n/a | 0.315 | 0.160 | 0.001 | 0.315 | gw-r/thread-71/journal/page | none observed |
| e606a721a887d55000000000000000d9 | 205.093 | 0.062 | 0.000 | 0.000 | 0.000 | 1.038 | 203.108 | 0.123 | 0.000 | 0.544 | 0.000 | n/a | n/a | 0.218 | 0.062 | 0.000 | 0.218 | gw-r/thread-71/journal/page | none observed |
| e606a721a887d5500000000000000069 | 205.039 | 0.059 | 0.000 | 0.000 | 0.000 | 2.558 | 201.816 | 0.073 | 0.000 | 0.393 | 0.000 | n/a | n/a | 0.140 | 0.059 | 0.000 | 0.140 | gw-r/thread-52/journal/page | none observed |
| e606a721a887d55000000000000000e1 | 204.949 | 0.062 | 0.000 | 0.000 | 0.000 | 1.542 | 202.897 | 0.033 | 0.000 | 0.288 | 0.000 | n/a | n/a | 0.127 | 0.062 | 0.000 | 0.127 | gw-r/thread-75/journal/page | none observed |
| e606a721a887d5500000000000000061 | 204.892 | 0.056 | 0.000 | 0.000 | 0.000 | 1.468 | 202.809 | 0.078 | 0.000 | 0.362 | 0.000 | n/a | n/a | 0.120 | 0.056 | 0.000 | 0.120 | gw-r/thread-73/journal/page | none observed |
| e606a721a887d55000000000000001e9 | 204.849 | 0.040 | 0.000 | 0.000 | 0.000 | 1.206 | 203.315 | 0.015 | 0.000 | 0.204 | 0.000 | n/a | n/a | 0.069 | 0.040 | 0.000 | 0.069 | gw-r/thread-73/journal/page | none observed |
| e606a721a887d5500000000000000251 | 204.511 | 0.088 | 0.000 | 0.000 | 0.000 | 0.909 | 203.252 | 0.023 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.137 | 0.088 | 0.000 | 0.137 | gw-r/thread-46/journal/page | none observed |
| e606a721a887d5500000000000000271 | 204.475 | 0.033 | 0.000 | 0.000 | 0.000 | 3.194 | 201.049 | 0.015 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.067 | 0.033 | 0.000 | 0.067 | gw-r/thread-79/journal/page | none observed |
| e606a721a887d5500000000000000129 | 204.467 | 0.075 | 0.000 | 0.000 | 0.000 | 1.896 | 201.967 | 0.061 | 0.000 | 0.294 | 0.000 | n/a | n/a | 0.173 | 0.075 | 0.000 | 0.173 | gw-r/thread-48/journal/page | none observed |
| e606a721a887d55000000000000001b1 | 204.198 | 0.052 | 0.000 | 0.000 | 0.000 | 2.735 | 201.145 | 0.022 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.095 | 0.052 | 0.000 | 0.095 | gw-r/thread-75/journal/page | none observed |

## P3 / baseline / read (227 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.969 | 0.055 | 0.000 | 0.000 | 0.000 | 0.868 | 200.945 | 0.012 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.096 | 0.055 | 0.000 | 0.096 |
| p99 | 207.732 | 0.116 | 0.000 | 0.000 | 0.000 | 2.927 | 203.362 | 2.743 | 0.000 | 0.260 | 0.000 | n/a | n/a | 0.378 | 0.116 | 0.001 | 0.378 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d5500000000000000709 | 220.830 | 0.033 | 0.000 | 0.000 | 0.000 | 0.693 | 204.224 | 0.009 | 15.688 | 0.082 | 0.000 | n/a | n/a | 0.101 | 0.033 | 0.000 | 0.101 | gw-r/thread-46/journal/page | none observed |
| e606a721a887d5500000000000000789 | 210.529 | 0.050 | 0.000 | 0.000 | 0.000 | 3.345 | 206.853 | 0.063 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.115 | 0.050 | 0.000 | 0.115 | gw-r/thread-76/journal/page | none observed |
| e606a721a887d55000000000000002d1 | 207.732 | 0.035 | 0.000 | 0.000 | 0.000 | 5.857 | 201.439 | 0.072 | 0.000 | 0.259 | 0.000 | n/a | n/a | 0.071 | 0.035 | 0.000 | 0.071 | gw-r/thread-51/journal/page | none observed |
| e606a721a887d5500000000000000529 | 204.837 | 0.096 | 0.000 | 0.000 | 0.000 | 1.877 | 202.542 | 0.018 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.130 | 0.096 | 0.000 | 0.130 | gw-r/thread-52/journal/page | none observed |
| e606a721a887d55000000000000007f9 | 204.574 | 0.048 | 0.000 | 0.000 | 0.000 | 0.964 | 202.687 | 0.635 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.103 | 0.048 | 0.000 | 0.103 | gw-r/thread-50/journal/page | none observed |
| e606a721a887d55000000000000007a9 | 204.433 | 0.064 | 0.000 | 0.000 | 0.000 | 1.260 | 202.624 | 0.031 | 0.000 | 0.304 | 0.000 | n/a | n/a | 0.150 | 0.064 | 0.000 | 0.150 | gw-r/thread-50/journal/page | none observed |
| e606a721a887d5500000000000000611 | 204.310 | 0.047 | 0.000 | 0.000 | 0.000 | 0.649 | 203.362 | 0.031 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.109 | 0.047 | 0.000 | 0.109 | gw-r/thread-71/journal/page | none observed |
| e606a721a887d55000000000000006f9 | 204.112 | 0.083 | 0.000 | 0.000 | 0.000 | 1.119 | 202.526 | 0.027 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.231 | 0.083 | 0.000 | 0.231 | gw-r/thread-79/journal/page | none observed |
| e606a721a887d5500000000000000731 | 203.959 | 0.061 | 0.000 | 0.000 | 0.000 | 1.099 | 202.529 | 0.033 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.118 | 0.061 | 0.000 | 0.118 | gw-r/thread-71/journal/page | none observed |
| e606a721a887d55000000000000007b9 | 203.907 | 0.062 | 0.000 | 0.000 | 0.000 | 2.124 | 201.426 | 0.020 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.144 | 0.062 | 0.000 | 0.144 | gw-r/thread-75/journal/page | none observed |
| e606a721a887d55000000000000005b9 | 203.859 | 0.055 | 0.000 | 0.000 | 0.000 | 1.794 | 201.672 | 0.072 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.116 | 0.055 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| e606a721a887d5500000000000000649 | 203.853 | 0.054 | 0.000 | 0.000 | 0.000 | 1.251 | 202.151 | 0.082 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.197 | 0.054 | 0.000 | 0.197 | gw-r/thread-72/journal/page | none observed |
| e606a721a887d5500000000000000a89 | 203.823 | 0.080 | 0.000 | 0.000 | 0.000 | 1.567 | 201.938 | 0.026 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.109 | 0.080 | 0.000 | 0.109 | gw-r/thread-74/journal/page | none observed |
| e606a721a887d55000000000000004e1 | 203.747 | 0.078 | 0.000 | 0.000 | 0.000 | 1.603 | 201.774 | 0.027 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.147 | 0.078 | 0.000 | 0.147 | gw-r/thread-72/journal/page | none observed |
| e606a721a887d5500000000000000579 | 203.729 | 0.064 | 0.000 | 0.000 | 0.000 | 1.538 | 201.853 | 0.028 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.140 | 0.064 | 0.000 | 0.140 | gw-r/thread-52/journal/page | none observed |
| e606a721a887d5500000000000000301 | 203.656 | 0.043 | 0.000 | 0.000 | 0.000 | 1.095 | 202.252 | 0.013 | 0.000 | 0.174 | 0.000 | n/a | n/a | 0.077 | 0.043 | 0.000 | 0.077 | gw-r/thread-73/journal/page | none observed |
| e606a721a887d55000000000000002e9 | 203.645 | 0.055 | 0.000 | 0.000 | 0.000 | 1.276 | 201.872 | 0.096 | 0.000 | 0.260 | 0.000 | n/a | n/a | 0.087 | 0.055 | 0.000 | 0.087 | gw-r/thread-75/journal/page | none observed |
| e606a721a887d5500000000000000501 | 203.640 | 0.072 | 0.000 | 0.000 | 0.000 | 1.449 | 201.871 | 0.013 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.090 | 0.072 | 0.000 | 0.090 | gw-r/thread-75/journal/page | none observed |
| e606a721a887d5500000000000000351 | 203.556 | 0.041 | 0.000 | 0.000 | 0.000 | 1.115 | 201.442 | 0.013 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.803 | 0.041 | 0.000 | 0.803 | gw-r/thread-76/journal/page | none observed |
| e606a721a887d5500000000000000809 | 203.554 | 0.052 | 0.000 | 0.000 | 0.000 | 1.083 | 202.205 | 0.018 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.092 | 0.052 | 0.000 | 0.092 | gw-r/thread-50/journal/page | none observed |

## P3 / L1 / read (220 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.815 | 0.055 | 0.000 | 0.000 | 0.000 | 0.756 | 200.870 | 0.011 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.084 | 0.055 | 0.000 | 0.084 |
| p99 | 204.406 | 0.150 | 0.000 | 0.000 | 0.000 | 3.559 | 202.349 | 5.323 | 0.000 | 0.199 | 0.000 | n/a | n/a | 0.244 | 0.150 | 0.001 | 0.244 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d5500000000000000c59 | 205.746 | 0.060 | 0.000 | 0.000 | 0.000 | 3.629 | 201.800 | 0.027 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.124 | 0.060 | 0.000 | 0.124 | gw-r/thread-74/journal/page | none observed |
| e606a721a887d5500000000000000fe9 | 205.455 | 0.107 | 0.000 | 0.000 | 0.000 | 3.559 | 201.421 | 0.023 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.248 | 0.107 | 0.001 | 0.248 | gw-r/thread-53/journal/page | none observed |
| e606a721a887d5500000000000000bd1 | 204.406 | 0.064 | 0.000 | 0.000 | 0.000 | 1.017 | 202.898 | 0.019 | 0.000 | 0.262 | 0.000 | n/a | n/a | 0.146 | 0.064 | 0.000 | 0.146 | gw-r/thread-50/journal/page | none observed |
| e606a721a887d5500000000000000e31 | 204.247 | 0.053 | 0.000 | 0.000 | 0.000 | 1.475 | 202.349 | 0.026 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.195 | 0.053 | 0.000 | 0.195 | gw-r/thread-46/journal/page | none observed |
| e606a721a887d5500000000000000b91 | 203.961 | 0.065 | 0.000 | 0.000 | 0.000 | 1.207 | 202.405 | 0.012 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.147 | 0.065 | 0.000 | 0.147 | gw-r/thread-74/journal/page | none observed |
| e606a721a887d5500000000000000ea9 | 203.711 | 0.112 | 0.000 | 0.000 | 0.000 | 1.668 | 201.616 | 0.022 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.169 | 0.112 | 0.001 | 0.169 | gw-r/thread-76/journal/page | none observed |
| e606a721a887d5500000000000000c61 | 203.400 | 0.074 | 0.000 | 0.000 | 0.000 | 1.091 | 201.925 | 0.019 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.131 | 0.074 | 0.000 | 0.131 | gw-r/thread-77/journal/page | none observed |
| e606a721a887d5500000000000001189 | 203.159 | 0.057 | 0.000 | 0.000 | 0.000 | 1.765 | 201.157 | 0.026 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.078 | 0.057 | 0.000 | 0.078 | gw-r/thread-49/journal/page | none observed |
| e606a721a887d5500000000000000fe1 | 203.088 | 0.059 | 0.000 | 0.000 | 0.000 | 0.974 | 201.773 | 0.019 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.187 | 0.059 | 0.000 | 0.187 | gw-r/thread-50/journal/page | none observed |
| e606a721a887d5500000000000000e21 | 202.963 | 0.064 | 0.000 | 0.000 | 0.000 | 1.116 | 201.467 | 0.023 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.121 | 0.064 | 0.000 | 0.121 | gw-r/thread-46/journal/page | none observed |
| e606a721a887d5500000000000000f49 | 202.941 | 0.057 | 0.000 | 0.000 | 0.000 | 1.466 | 201.206 | 0.015 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.114 | 0.057 | 0.000 | 0.114 | gw-r/thread-48/journal/page | none observed |
| e606a721a887d5500000000000000b49 | 202.929 | 0.054 | 0.000 | 0.000 | 0.000 | 0.839 | 201.745 | 0.017 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.115 | 0.054 | 0.000 | 0.115 | gw-r/thread-79/journal/page | none observed |
| e606a721a887d5500000000000000f99 | 202.897 | 0.072 | 0.000 | 0.000 | 0.000 | 1.246 | 201.340 | 0.007 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.137 | 0.072 | 0.000 | 0.137 | gw-r/thread-51/journal/page | none observed |
| e606a721a887d5500000000000000fa9 | 202.875 | 0.053 | 0.000 | 0.000 | 0.000 | 1.543 | 201.070 | 0.027 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.116 | 0.053 | 0.000 | 0.116 | gw-r/thread-53/journal/page | none observed |
| e606a721a887d5500000000000001199 | 202.808 | 0.065 | 0.000 | 0.000 | 0.000 | 1.655 | 200.900 | 0.008 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.086 | 0.065 | 0.000 | 0.086 | gw-r/thread-49/journal/page | none observed |
| e606a721a887d5500000000000000bc1 | 202.804 | 0.132 | 0.000 | 0.000 | 0.000 | 1.481 | 200.982 | 0.006 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.121 | 0.132 | 0.001 | 0.121 | gw-r/thread-50/journal/page | none observed |
| e606a721a887d5500000000000000e61 | 202.783 | 0.055 | 0.000 | 0.000 | 0.000 | 1.069 | 201.456 | 0.021 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.076 | 0.055 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| e606a721a887d5500000000000001019 | 202.712 | 0.064 | 0.000 | 0.000 | 0.000 | 0.928 | 201.402 | 0.011 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.210 | 0.064 | 0.000 | 0.210 | gw-r/thread-72/journal/page | none observed |
| e606a721a887d5500000000000000fd9 | 202.701 | 0.061 | 0.000 | 0.000 | 0.000 | 0.941 | 201.426 | 0.012 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.122 | 0.061 | 0.000 | 0.122 | gw-r/thread-53/journal/page | none observed |
| e606a721a887d5500000000000001009 | 202.676 | 0.055 | 0.000 | 0.000 | 0.000 | 1.055 | 201.338 | 0.007 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.126 | 0.055 | 0.000 | 0.126 | gw-r/thread-72/journal/page | none observed |

## P3 / L4 / read (124 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 91.255 | 0.055 | 0.000 | 0.000 | 0.000 | 0.751 | 89.495 | 0.009 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.080 | 0.055 | 0.001 | 0.080 |
| p99 | 203.829 | 0.279 | 0.000 | 0.000 | 0.000 | 3.843 | 202.204 | 7.537 | 13.875 | 0.217 | 0.000 | n/a | n/a | 0.904 | 0.279 | 0.004 | 0.904 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d55000000000000014c9 | 214.692 | 0.053 | 0.000 | 0.000 | 0.000 | 1.336 | 213.061 | 0.034 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.113 | 0.053 | 0.000 | 0.113 | gw-r/thread-79/journal/page | none observed |
| e606a721a887d5500000000000001479 | 203.829 | 0.055 | 0.000 | 0.000 | 0.000 | 1.392 | 202.125 | 0.035 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.083 | 0.055 | 0.000 | 0.083 | gw-r/thread-48/journal/page | none observed |
| e606a721a887d55000000000000014a9 | 203.744 | 0.079 | 0.000 | 0.000 | 0.000 | 1.365 | 201.887 | 0.027 | 0.000 | 0.217 | 0.000 | n/a | n/a | 0.170 | 0.079 | 0.000 | 0.170 | gw-r/thread-79/journal/page | none observed |
| e606a721a887d5500000000000001369 | 203.425 | 0.063 | 0.000 | 0.000 | 0.000 | 1.091 | 201.791 | 0.010 | 0.265 | 0.103 | 0.000 | n/a | n/a | 0.103 | 0.063 | 0.000 | 0.103 | gw-r/thread-53/journal/page | none observed |
| e606a721a887d55000000000000014a1 | 203.338 | 0.051 | 0.000 | 0.000 | 0.000 | 0.755 | 202.204 | 0.043 | 0.000 | 0.205 | 0.000 | n/a | n/a | 0.080 | 0.051 | 0.000 | 0.080 | gw-r/thread-51/journal/page | none observed |
| e606a721a887d5500000000000001489 | 203.287 | 0.133 | 0.000 | 0.000 | 0.000 | 1.244 | 201.583 | 0.052 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.168 | 0.133 | 0.001 | 0.168 | gw-r/thread-52/journal/page | none observed |
| e606a721a887d5500000000000001491 | 202.990 | 0.046 | 0.000 | 0.000 | 0.000 | 0.730 | 201.930 | 0.040 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.088 | 0.046 | 0.000 | 0.088 | gw-r/thread-51/journal/page | none observed |
| e606a721a887d5500000000000001301 | 202.989 | 0.043 | 0.000 | 0.000 | 0.000 | 0.741 | 201.846 | 0.026 | 0.000 | 0.204 | 0.000 | n/a | n/a | 0.128 | 0.043 | 0.000 | 0.128 | gw-r/thread-52/journal/page | none observed |
| e606a721a887d55000000000000012c9 | 202.887 | 0.060 | 0.000 | 0.000 | 0.000 | 1.343 | 201.294 | 0.010 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.083 | 0.060 | 0.000 | 0.083 | gw-r/thread-52/journal/page | none observed |
| e606a721a887d55000000000000012d9 | 202.748 | 0.054 | 0.000 | 0.000 | 0.000 | 1.509 | 201.008 | 0.023 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.072 | 0.054 | 0.000 | 0.072 | gw-r/thread-52/journal/page | none observed |
| e606a721a887d55000000000000014b1 | 202.676 | 0.066 | 0.000 | 0.000 | 0.000 | 1.231 | 201.148 | 0.014 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.109 | 0.066 | 0.000 | 0.109 | gw-r/thread-51/journal/page | none observed |
| e606a721a887d5500000000000001469 | 202.612 | 0.071 | 0.000 | 0.000 | 0.000 | 0.884 | 201.385 | 0.029 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.156 | 0.071 | 0.000 | 0.156 | gw-r/thread-52/journal/page | none observed |
| e606a721a887d5500000000000001389 | 202.600 | 0.054 | 0.000 | 0.000 | 0.000 | 0.904 | 201.422 | 0.012 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.109 | 0.054 | 0.000 | 0.109 | gw-r/thread-72/journal/page | none observed |
| e606a721a887d5500000000000001311 | 202.572 | 0.062 | 0.000 | 0.000 | 0.000 | 1.376 | 200.935 | 0.013 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.084 | 0.062 | 0.000 | 0.084 | gw-r/thread-52/journal/page | none observed |
| e606a721a887d55000000000000014b9 | 202.563 | 0.065 | 0.000 | 0.000 | 0.000 | 0.876 | 201.339 | 0.025 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.157 | 0.065 | 0.000 | 0.157 | gw-r/thread-79/journal/page | none observed |
| e606a721a887d5500000000000001361 | 202.479 | 0.050 | 0.000 | 0.000 | 0.000 | 0.736 | 188.953 | 0.015 | 12.464 | 0.160 | 0.000 | n/a | n/a | 0.100 | 0.050 | 0.000 | 0.100 | gw-r/thread-50/journal/page | none observed |
| e606a721a887d55000000000000014d1 | 202.463 | 0.059 | 0.000 | 0.000 | 0.000 | 1.030 | 201.183 | 0.006 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.091 | 0.059 | 0.000 | 0.091 | gw-r/thread-76/journal/page | none observed |
| e606a721a887d5500000000000001399 | 202.410 | 0.046 | 0.000 | 0.000 | 0.000 | 0.856 | 201.323 | 0.009 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.079 | 0.046 | 0.000 | 0.079 | gw-r/thread-72/journal/page | none observed |
| e606a721a887d5500000000000001371 | 202.272 | 0.054 | 0.000 | 0.000 | 0.000 | 0.817 | 201.214 | 0.019 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.073 | 0.054 | 0.000 | 0.073 | gw-r/thread-50/journal/page | none observed |
| e606a721a887d5500000000000001391 | 202.248 | 0.054 | 0.000 | 0.000 | 0.000 | 1.005 | 201.012 | 0.008 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.088 | 0.054 | 0.000 | 0.088 | gw-r/thread-71/journal/page | none observed |

## P3 / L16 / read (114 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 200.708 | 0.036 | 0.000 | 0.000 | 0.000 | 0.628 | 181.127 | 0.006 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.064 | 0.036 | 0.000 | 0.064 |
| p99 | 227.559 | 0.111 | 0.000 | 0.000 | 0.000 | 20.809 | 204.825 | 6.124 | 26.076 | 0.106 | 0.000 | n/a | n/a | 0.212 | 0.111 | 0.002 | 0.212 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d55000000000000068d9 | 227.897 | 0.045 | 0.000 | 0.000 | 0.000 | 20.809 | 206.638 | 0.005 | 0.270 | 0.012 | 0.000 | n/a | n/a | 0.117 | 0.045 | 0.000 | 0.117 | gw-r/thread-46/journal/page | none observed |
| e606a721a887d5500000000000006781 | 227.559 | 0.030 | 0.000 | 0.000 | 0.000 | 0.559 | 204.230 | 0.002 | 22.651 | 0.029 | 0.000 | n/a | n/a | 0.058 | 0.030 | 0.000 | 0.058 | gw-r/thread-86/journal/page | none observed |
| e606a721a887d55000000000000067f9 | 221.593 | 0.014 | 0.000 | 0.000 | 0.000 | 0.503 | 185.899 | 0.002 | 35.113 | 0.023 | 0.000 | n/a | n/a | 0.040 | 0.014 | 0.000 | 0.040 | gw-r/thread-76/journal/page | none observed |
| e606a721a887d5500000000000006981 | 217.689 | 0.014 | 0.000 | 0.000 | 0.000 | 0.512 | 200.588 | 0.004 | 16.500 | 0.019 | 0.000 | n/a | n/a | 0.052 | 0.014 | 0.000 | 0.052 | gw-r/thread-52/journal/page | none observed |
| e606a721a887d5500000000000006831 | 205.589 | 0.067 | 0.000 | 0.000 | 0.000 | 0.604 | 204.825 | 0.006 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.065 | 0.067 | 0.000 | 0.065 | gw-r/thread-89/journal/page | none observed |
| e606a721a887d55000000000000067c9 | 204.649 | 0.027 | 0.000 | 0.000 | 0.000 | 3.859 | 199.951 | 0.007 | 0.713 | 0.031 | 0.000 | n/a | n/a | 0.061 | 0.027 | 0.000 | 0.061 | gw-r/thread-90/journal/page | none observed |
| e606a721a887d5500000000000006889 | 204.480 | 0.042 | 0.000 | 0.000 | 0.000 | 0.635 | 203.667 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.102 | 0.042 | 0.000 | 0.102 | gw-r/thread-87/journal/page | none observed |
| e606a721a887d5500000000000006779 | 204.004 | 0.032 | 0.000 | 0.000 | 0.000 | 0.619 | 203.243 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.069 | 0.032 | 0.000 | 0.069 | gw-r/thread-86/journal/page | none observed |
| e606a721a887d55000000000000068a1 | 203.150 | 0.027 | 0.000 | 0.000 | 0.000 | 2.302 | 200.673 | 0.010 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.063 | 0.027 | 0.000 | 0.063 | gw-r/thread-87/journal/page | none observed |
| e606a721a887d5500000000000006989 | 202.970 | 0.022 | 0.000 | 0.000 | 0.000 | 0.557 | 187.451 | 0.027 | 14.493 | 0.345 | 0.000 | n/a | n/a | 0.075 | 0.022 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| e606a721a887d5500000000000006829 | 202.917 | 0.014 | 0.000 | 0.000 | 0.000 | 2.521 | 200.325 | 0.003 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.041 | 0.014 | 0.000 | 0.041 | gw-r/thread-72/journal/page | none observed |
| e606a721a887d5500000000000006a09 | 202.831 | 0.036 | 0.000 | 0.000 | 0.000 | 1.266 | 184.615 | 0.016 | 16.744 | 0.055 | 0.000 | n/a | n/a | 0.099 | 0.036 | 0.000 | 0.099 | gw-r/thread-91/journal/page | none observed |
| e606a721a887d5500000000000006a21 | 202.420 | 0.029 | 0.000 | 0.000 | 0.000 | 1.269 | 200.838 | 0.014 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.206 | 0.029 | 0.000 | 0.206 | gw-r/thread-79/journal/page | none observed |
| e606a721a887d5500000000000006939 | 202.313 | 0.041 | 0.000 | 0.000 | 0.000 | 1.085 | 201.012 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.121 | 0.041 | 0.000 | 0.121 | gw-r/thread-87/journal/page | none observed |
| e606a721a887d5500000000000006891 | 202.281 | 0.069 | 0.000 | 0.000 | 0.000 | 1.161 | 200.852 | 0.015 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.118 | 0.069 | 0.000 | 0.118 | gw-r/thread-78/journal/page | none observed |
| e606a721a887d5500000000000006a61 | 202.267 | 0.038 | 0.000 | 0.000 | 0.000 | 1.666 | 200.435 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.092 | 0.038 | 0.000 | 0.092 | gw-r/thread-93/journal/page | none observed |
| e606a721a887d5500000000000006a89 | 202.197 | 0.020 | 0.000 | 0.000 | 0.000 | 1.507 | 200.580 | 0.013 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.046 | 0.020 | 0.000 | 0.046 | gw-r/thread-92/journal/page | none observed |
| e606a721a887d5500000000000006909 | 202.088 | 0.080 | 0.000 | 0.000 | 0.000 | 0.670 | 201.069 | 0.018 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.181 | 0.080 | 0.000 | 0.181 | gw-r/thread-88/journal/page | none observed |
| e606a721a887d5500000000000006999 | 202.047 | 0.047 | 0.000 | 0.000 | 0.000 | 1.023 | 186.626 | 0.003 | 14.160 | 0.074 | 0.000 | n/a | n/a | 0.114 | 0.047 | 0.000 | 0.114 | gw-r/thread-92/journal/page | none observed |
| e606a721a887d5500000000000006901 | 202.036 | 0.033 | 0.000 | 0.000 | 0.000 | 1.417 | 200.490 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.062 | 0.033 | 0.000 | 0.062 | gw-r/thread-78/journal/page | none observed |

## P3 / L64 / read (227 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.202 | 0.030 | 0.000 | 0.000 | 0.000 | 0.679 | 200.125 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.066 | 0.030 | 0.000 | 0.066 |
| p99 | 217.952 | 0.153 | 0.000 | 0.000 | 0.000 | 16.466 | 203.455 | 1.296 | 41.938 | 0.273 | 0.000 | n/a | n/a | 0.246 | 0.153 | 0.002 | 0.246 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d5500000000000006e79 | 225.323 | 0.046 | 0.000 | 0.000 | 0.000 | 23.771 | 201.255 | 0.010 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.205 | 0.046 | 0.000 | 0.205 | gw-r/thread-134/journal/page | none observed |
| e606a721a887d5500000000000006dd1 | 225.262 | 0.017 | 0.000 | 0.000 | 0.000 | 0.514 | 196.340 | 0.004 | 28.328 | 0.015 | 0.000 | n/a | n/a | 0.044 | 0.017 | 0.000 | 0.044 | gw-r/thread-97/journal/page | none observed |
| e606a721a887d5500000000000006b09 | 217.952 | 0.090 | 0.000 | 0.000 | 0.000 | 22.931 | 194.626 | 0.007 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.127 | 0.090 | 0.000 | 0.127 | gw-r/thread-128/journal/page | none observed |
| e606a721a887d5500000000000006a99 | 212.475 | 0.019 | 0.000 | 0.000 | 0.000 | 0.502 | 158.253 | 0.002 | 53.620 | 0.027 | 0.000 | n/a | n/a | 0.052 | 0.019 | 0.000 | 0.052 | gw-r/thread-72/journal/page | none observed |
| e606a721a887d5500000000000007029 | 210.391 | 0.029 | 0.000 | 0.000 | 0.000 | 0.606 | 197.378 | 0.007 | 12.210 | 0.065 | 0.000 | n/a | n/a | 0.097 | 0.029 | 0.000 | 0.097 | gw-r/thread-97/journal/page | none observed |
| e606a721a887d5500000000000006e51 | 208.404 | 0.047 | 0.000 | 0.000 | 0.000 | 1.449 | 205.836 | 0.029 | 0.000 | 0.946 | 0.000 | n/a | n/a | 0.096 | 0.047 | 0.000 | 0.096 | gw-r/thread-92/journal/page | none observed |
| e606a721a887d55000000000000071a9 | 207.433 | 0.029 | 0.000 | 0.000 | 0.000 | 0.795 | 176.725 | 0.006 | 29.773 | 0.025 | 0.000 | n/a | n/a | 0.080 | 0.029 | 0.000 | 0.080 | gw-r/thread-123/journal/page | none observed |
| e606a721a887d5500000000000006ed9 | 207.400 | 0.033 | 0.000 | 0.000 | 0.000 | 5.589 | 201.394 | 0.010 | 0.000 | 0.273 | 0.000 | n/a | n/a | 0.102 | 0.033 | 0.000 | 0.102 | gw-r/thread-114/journal/page | none observed |
| e606a721a887d5500000000000006af9 | 206.965 | 0.043 | 0.000 | 0.000 | 0.000 | 2.094 | 204.438 | 0.038 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.246 | 0.043 | 0.000 | 0.246 | gw-r/thread-131/journal/page | none observed |
| e606a721a887d5500000000000007139 | 206.706 | 0.016 | 0.000 | 0.000 | 0.000 | 6.285 | 200.325 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.048 | 0.016 | 0.000 | 0.048 | gw-r/thread-103/journal/page | none observed |
| e606a721a887d5500000000000006b11 | 206.454 | 0.028 | 0.000 | 0.000 | 0.000 | 0.827 | 194.307 | 0.008 | 11.109 | 0.075 | 0.000 | n/a | n/a | 0.100 | 0.028 | 0.000 | 0.100 | gw-r/thread-72/journal/page | none observed |
| e606a721a887d55000000000000070e9 | 205.379 | 0.030 | 0.000 | 0.000 | 0.000 | 4.770 | 200.457 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.084 | 0.030 | 0.000 | 0.084 | gw-r/thread-120/journal/page | none observed |
| e606a721a887d5500000000000006c11 | 205.003 | 0.048 | 0.000 | 0.000 | 0.000 | 3.503 | 201.324 | 0.013 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.066 | 0.048 | 0.000 | 0.066 | gw-r/thread-128/journal/page | none observed |
| e606a721a887d5500000000000006e39 | 204.572 | 0.042 | 0.000 | 0.000 | 0.000 | 1.377 | 202.861 | 0.017 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.208 | 0.042 | 0.000 | 0.208 | gw-r/thread-122/journal/page | none observed |
| e606a721a887d5500000000000006e91 | 204.568 | 0.042 | 0.000 | 0.000 | 0.000 | 3.947 | 189.677 | 0.005 | 10.746 | 0.034 | 0.000 | n/a | n/a | 0.118 | 0.042 | 0.000 | 0.118 | gw-r/thread-92/journal/page | none observed |
| e606a721a887d5500000000000006f99 | 204.449 | 0.022 | 0.000 | 0.000 | 0.000 | 3.356 | 180.292 | 0.009 | 20.651 | 0.058 | 0.000 | n/a | n/a | 0.060 | 0.022 | 0.000 | 0.060 | gw-r/thread-115/journal/page | none observed |
| e606a721a887d5500000000000006c59 | 204.273 | 0.032 | 0.000 | 0.000 | 0.000 | 3.462 | 195.889 | 0.003 | 4.759 | 0.038 | 0.000 | n/a | n/a | 0.091 | 0.032 | 0.000 | 0.091 | gw-r/thread-132/journal/page | none observed |
| e606a721a887d5500000000000006fd1 | 204.187 | 0.032 | 0.000 | 0.000 | 0.000 | 0.592 | 203.455 | 0.005 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.080 | 0.032 | 0.000 | 0.080 | gw-r/thread-95/journal/page | none observed |
| e606a721a887d5500000000000006cb9 | 204.134 | 0.025 | 0.000 | 0.000 | 0.000 | 0.673 | 203.325 | 0.004 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.093 | 0.025 | 0.000 | 0.093 | gw-r/thread-127/journal/page | none observed |
| e606a721a887d5500000000000006f39 | 204.079 | 0.043 | 0.000 | 0.000 | 0.000 | 4.691 | 199.252 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.083 | 0.043 | 0.000 | 0.083 | gw-r/thread-97/journal/page | none observed |

## P3 / L256 / read (225 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.442 | 0.034 | 0.000 | 0.000 | 0.000 | 0.838 | 200.360 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.078 | 0.034 | 0.000 | 0.078 |
| p99 | 220.704 | 0.175 | 0.000 | 0.000 | 0.000 | 13.116 | 203.643 | 2.739 | 65.998 | 0.287 | 0.000 | n/a | n/a | 0.617 | 0.175 | 0.001 | 0.617 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d5500000000000007939 | 230.314 | 0.035 | 0.000 | 0.000 | 0.000 | 29.344 | 181.331 | 0.012 | 19.413 | 0.067 | 0.000 | n/a | n/a | 0.112 | 0.035 | 0.000 | 0.112 | gw-r/thread-125/journal/page | none observed |
| e606a721a887d55000000000000077d9 | 224.139 | 0.052 | 0.000 | 0.000 | 0.000 | 20.354 | 175.788 | 0.012 | 27.646 | 0.066 | 0.000 | n/a | n/a | 0.221 | 0.052 | 0.000 | 0.221 | gw-r/thread-140/journal/page | none observed |
| e606a721a887d5500000000000007749 | 220.704 | 0.057 | 0.000 | 0.000 | 0.000 | 0.897 | 203.205 | 0.006 | 16.122 | 0.018 | 0.000 | n/a | n/a | 0.399 | 0.057 | 0.000 | 0.399 | gw-r/thread-127/journal/page | none observed |
| e606a721a887d55000000000000078a1 | 216.692 | 0.265 | 0.000 | 0.000 | 0.000 | 0.964 | 211.995 | 2.921 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.441 | 0.265 | 0.001 | 0.441 | gw-r/thread-135/journal/page | none observed |
| e606a721a887d55000000000000077a1 | 216.477 | 0.022 | 0.000 | 0.000 | 0.000 | 0.768 | 195.989 | 0.002 | 19.625 | 0.011 | 0.000 | n/a | n/a | 0.059 | 0.022 | 0.000 | 0.059 | gw-r/thread-134/journal/page | none observed |
| e606a721a887d55000000000000078c9 | 213.933 | 0.041 | 0.000 | 0.000 | 0.000 | 13.116 | 93.093 | 0.003 | 107.531 | 0.027 | 0.000 | n/a | n/a | 0.121 | 0.041 | 0.000 | 0.121 | gw-r/thread--1/jdk.GCPhasePause | none observed |
| e606a721a887d55000000000000076d9 | 211.192 | 0.015 | 0.000 | 0.000 | 0.000 | 1.166 | 188.886 | 0.010 | 21.055 | 0.013 | 0.000 | n/a | n/a | 0.048 | 0.015 | 0.000 | 0.048 | gw-r/thread-96/journal/page | none observed |
| e606a721a887d5500000000000007a71 | 210.110 | 0.059 | 0.000 | 0.000 | 0.000 | 3.253 | 201.624 | 0.020 | 0.000 | 0.130 | 0.000 | n/a | n/a | 5.025 | 0.059 | 0.000 | 5.025 | gw-r/thread-123/journal/page | none observed |
| e606a721a887d5500000000000007371 | 209.284 | 0.034 | 0.000 | 0.000 | 0.000 | 0.706 | 90.101 | 0.024 | 118.295 | 0.048 | 0.000 | n/a | n/a | 0.077 | 0.034 | 0.000 | 0.077 | gw-r/thread--1/jdk.GCPhasePause | none observed |
| e606a721a887d5500000000000007389 | 208.347 | 0.078 | 0.000 | 0.000 | 0.000 | 2.466 | 205.583 | 0.005 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.165 | 0.078 | 0.000 | 0.165 | gw-r/thread-91/journal/page | none observed |
| e606a721a887d5500000000000007461 | 207.776 | 0.034 | 0.000 | 0.000 | 0.000 | 6.947 | 200.626 | 0.017 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.097 | 0.034 | 0.000 | 0.097 | gw-r/thread-77/journal/page | none observed |
| e606a721a887d5500000000000007369 | 207.239 | 0.013 | 0.000 | 0.000 | 0.000 | 6.561 | 200.555 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.055 | 0.013 | 0.000 | 0.055 | gw-r/thread-76/journal/page | none observed |
| e606a721a887d5500000000000007a09 | 206.986 | 0.030 | 0.000 | 0.000 | 0.000 | 0.546 | 199.913 | 0.003 | 6.403 | 0.030 | 0.000 | n/a | n/a | 0.060 | 0.030 | 0.000 | 0.060 | gw-r/thread-132/journal/page | none observed |
| e606a721a887d5500000000000007a01 | 206.419 | 0.043 | 0.000 | 0.000 | 0.000 | 3.367 | 202.818 | 0.002 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.147 | 0.043 | 0.000 | 0.147 | gw-r/thread-46/journal/page | none observed |
| e606a721a887d5500000000000007999 | 205.777 | 0.171 | 0.000 | 0.000 | 0.000 | 3.057 | 202.154 | 0.011 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.258 | 0.171 | 0.001 | 0.258 | gw-r/thread-129/journal/page | none observed |
| e606a721a887d5500000000000007641 | 205.405 | 0.175 | 0.000 | 0.000 | 0.000 | 0.781 | 203.643 | 0.013 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.617 | 0.175 | 0.001 | 0.617 | gw-r/thread-106/journal/page | none observed |
| e606a721a887d55000000000000078b1 | 205.153 | 0.024 | 0.000 | 0.000 | 0.000 | 2.930 | 202.099 | 0.007 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.072 | 0.024 | 0.000 | 0.072 | gw-r/thread-48/journal/page | none observed |
| e606a721a887d5500000000000007899 | 204.736 | 0.032 | 0.000 | 0.000 | 0.000 | 3.153 | 201.362 | 0.032 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.076 | 0.032 | 0.000 | 0.076 | gw-r/thread-95/journal/page | none observed |
| e606a721a887d5500000000000007821 | 204.587 | 0.042 | 0.000 | 0.000 | 0.000 | 0.576 | 173.505 | 0.003 | 26.993 | 3.357 | 0.000 | n/a | n/a | 0.111 | 0.042 | 0.000 | 0.111 | gw-r/thread-117/journal/page | none observed |
| e606a721a887d5500000000000007391 | 204.400 | 0.045 | 0.000 | 0.000 | 0.000 | 2.921 | 190.719 | 0.023 | 10.487 | 0.100 | 0.000 | n/a | n/a | 0.105 | 0.045 | 0.000 | 0.105 | gw-r/thread-119/journal/page | none observed |

## P3 / L1024 / read (219 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.710 | 0.047 | 0.000 | 0.000 | 0.000 | 0.874 | 200.260 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.084 | 0.047 | 0.000 | 0.084 |
| p99 | 231.322 | 0.875 | 0.000 | 0.000 | 0.000 | 27.852 | 205.028 | 1.605 | 66.451 | 0.433 | 0.000 | n/a | n/a | 0.628 | 0.875 | 0.004 | 0.628 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d55000000000000080f1 | 259.029 | 0.038 | 0.000 | 0.000 | 0.000 | 0.661 | 191.695 | 0.009 | 66.451 | 0.049 | 0.000 | n/a | n/a | 0.125 | 0.038 | 0.000 | 0.125 | gw-r/thread-121/journal/page | none observed |
| e606a721a887d5500000000000007b21 | 257.664 | 0.043 | 0.000 | 0.000 | 0.000 | 0.799 | 94.468 | 0.007 | 162.170 | 0.044 | 0.000 | n/a | n/a | 0.133 | 0.043 | 0.000 | 0.133 | gw-r/thread--1/jdk.GCPhasePause | none observed |
| e606a721a887d5500000000000007b61 | 231.322 | 0.045 | 0.000 | 0.000 | 0.000 | 30.076 | 201.021 | 0.010 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.073 | 0.045 | 0.000 | 0.073 | gw-r/thread-160/journal/page | none observed |
| e606a721a887d5500000000000007f41 | 231.307 | 0.113 | 0.000 | 0.000 | 0.000 | 27.852 | 202.525 | 0.041 | 0.144 | 0.075 | 0.000 | n/a | n/a | 0.559 | 0.113 | 0.000 | 0.559 | gw-r/thread-173/journal/page | none observed |
| e606a721a887d5500000000000007c19 | 222.914 | 0.039 | 0.000 | 0.000 | 0.000 | 2.415 | 194.171 | 0.010 | 26.173 | 0.035 | 0.000 | n/a | n/a | 0.072 | 0.039 | 0.000 | 0.072 | gw-r/thread-137/journal/page | none observed |
| e606a721a887d5500000000000007ce9 | 220.711 | 0.031 | 0.000 | 0.000 | 0.000 | 2.540 | 203.428 | 0.005 | 14.601 | 0.014 | 0.000 | n/a | n/a | 0.093 | 0.031 | 0.000 | 0.093 | gw-r/thread-141/journal/page | none observed |
| e606a721a887d5500000000000007e31 | 219.298 | 0.055 | 0.000 | 0.000 | 0.000 | 0.708 | 160.273 | 0.010 | 58.003 | 0.063 | 0.000 | n/a | n/a | 0.186 | 0.055 | 0.000 | 0.186 | gw-r/thread-124/journal/page | none observed |
| e606a721a887d55000000000000080c1 | 218.157 | 0.069 | 0.000 | 0.000 | 0.000 | 8.896 | 208.797 | 0.019 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.346 | 0.069 | 0.000 | 0.346 | gw-r/thread-159/journal/page | none observed |
| e606a721a887d5500000000000008041 | 217.301 | 0.875 | 0.000 | 0.000 | 0.000 | 11.079 | 205.028 | 0.007 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.195 | 0.875 | 0.004 | 0.195 | gw-r/thread-170/journal/page | none observed |
| e606a721a887d5500000000000007be9 | 216.671 | 0.052 | 0.000 | 0.000 | 0.000 | 15.412 | 200.878 | 0.009 | 0.113 | 0.101 | 0.000 | n/a | n/a | 0.106 | 0.052 | 0.000 | 0.106 | gw-r/thread-112/journal/page | none observed |
| e606a721a887d5500000000000007f81 | 215.956 | 0.080 | 0.000 | 0.000 | 0.000 | 14.546 | 181.377 | 0.016 | 19.685 | 0.073 | 0.000 | n/a | n/a | 0.179 | 0.080 | 0.000 | 0.179 | gw-r/thread-120/journal/page | none observed |
| e606a721a887d5500000000000007b41 | 215.875 | 0.058 | 0.000 | 0.000 | 0.000 | 1.465 | 200.509 | 0.005 | 13.690 | 0.019 | 0.000 | n/a | n/a | 0.129 | 0.058 | 0.000 | 0.129 | gw-r/thread-126/journal/page | none observed |
| e606a721a887d5500000000000007b89 | 209.591 | 0.066 | 0.000 | 0.000 | 0.000 | 0.805 | 187.786 | 0.007 | 20.761 | 0.050 | 0.000 | n/a | n/a | 0.116 | 0.066 | 0.000 | 0.116 | gw-r/thread-109/journal/page | none observed |
| e606a721a887d55000000000000080c9 | 209.081 | 0.165 | 0.000 | 0.000 | 0.000 | 5.092 | 203.591 | 0.013 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.146 | 0.165 | 0.001 | 0.146 | gw-r/thread-159/journal/page | none observed |
| e606a721a887d5500000000000007e39 | 208.861 | 0.048 | 0.000 | 0.000 | 0.000 | 7.599 | 200.890 | 0.013 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.264 | 0.048 | 0.000 | 0.264 | gw-r/thread-146/journal/page | none observed |
| e606a721a887d5500000000000007cd9 | 208.795 | 0.058 | 0.000 | 0.000 | 0.000 | 7.413 | 200.752 | 0.112 | 0.250 | 0.047 | 0.000 | n/a | n/a | 0.164 | 0.058 | 0.000 | 0.164 | gw-r/thread-112/journal/page | none observed |
| e606a721a887d5500000000000007f19 | 208.309 | 0.102 | 0.000 | 0.000 | 0.000 | 3.004 | 204.545 | 0.022 | 0.000 | 0.433 | 0.000 | n/a | n/a | 0.202 | 0.102 | 0.000 | 0.202 | gw-r/thread-120/journal/page | none observed |
| e606a721a887d5500000000000008039 | 208.010 | 0.189 | 0.000 | 0.000 | 0.000 | 6.511 | 185.105 | 0.010 | 15.856 | 0.062 | 0.000 | n/a | n/a | 0.276 | 0.189 | 0.001 | 0.276 | gw-r/thread-114/journal/page | none observed |
| e606a721a887d5500000000000007d11 | 207.917 | 0.029 | 0.000 | 0.000 | 0.000 | 1.063 | 206.750 | 0.003 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.054 | 0.029 | 0.000 | 0.054 | gw-r/thread-52/journal/page | none observed |
| e606a721a887d5500000000000007d19 | 207.825 | 0.057 | 0.000 | 0.000 | 0.000 | 0.768 | 171.225 | 0.003 | 29.479 | 6.189 | 0.000 | n/a | n/a | 0.104 | 0.057 | 0.000 | 0.104 | gw-r/thread-96/journal/page | none observed |

## P3 / recovery / read (297 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.569 | 0.044 | 0.000 | 0.000 | 0.000 | 1.047 | 200.293 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.081 | 0.044 | 0.000 | 0.081 |
| p99 | 251.251 | 0.853 | 0.000 | 0.000 | 0.000 | 25.762 | 215.274 | 2.567 | 47.738 | 0.421 | 0.000 | n/a | n/a | 1.212 | 0.853 | 0.004 | 1.212 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d5500000000000008649 | 263.768 | 0.047 | 0.000 | 0.000 | 0.000 | 2.082 | 245.740 | 15.712 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.088 | 0.047 | 0.000 | 0.088 | gw-r/thread-173/journal/page | none observed |
| e606a721a887d5500000000000008ac1 | 259.944 | 0.055 | 0.000 | 0.000 | 0.000 | 58.839 | 183.155 | 0.013 | 17.731 | 0.073 | 0.000 | n/a | n/a | 0.078 | 0.055 | 0.000 | 0.078 | gw-r/thread-102/journal/page | none observed |
| e606a721a887d5500000000000008439 | 251.251 | 0.093 | 0.000 | 0.000 | 0.000 | 7.058 | 243.424 | 0.049 | 0.000 | 0.386 | 0.000 | n/a | n/a | 0.241 | 0.093 | 0.000 | 0.241 | gw-r/thread-152/journal/page | none observed |
| e606a721a887d5500000000000008d11 | 232.880 | 0.067 | 0.000 | 0.000 | 0.000 | 27.441 | 203.406 | 1.719 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.168 | 0.067 | 0.000 | 0.168 | gw-r/thread-79/journal/page | none observed |
| e606a721a887d5500000000000008c89 | 227.759 | 0.087 | 0.000 | 0.000 | 0.000 | 7.572 | 176.676 | 3.749 | 39.285 | 0.063 | 0.000 | n/a | n/a | 0.327 | 0.087 | 0.000 | 0.327 | gw-r/thread-139/journal/page | none observed |
| e606a721a887d5500000000000008cc9 | 227.600 | 0.056 | 0.000 | 0.000 | 0.000 | 25.762 | 165.743 | 0.008 | 35.482 | 0.421 | 0.000 | n/a | n/a | 0.128 | 0.056 | 0.000 | 0.128 | gw-r/thread-126/journal/page | none observed |
| e606a721a887d5500000000000008b39 | 222.151 | 0.029 | 0.000 | 0.000 | 0.000 | 21.482 | 200.106 | 0.008 | 0.430 | 0.029 | 0.000 | n/a | n/a | 0.067 | 0.029 | 0.000 | 0.067 | gw-r/thread-146/journal/page | none observed |
| e606a721a887d5500000000000008b09 | 222.095 | 0.031 | 0.000 | 0.000 | 0.000 | 1.587 | 204.529 | 0.007 | 15.851 | 0.026 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 | gw-r/thread-176/journal/page | none observed |
| e606a721a887d5500000000000008a71 | 221.885 | 0.070 | 0.000 | 0.000 | 0.000 | 20.333 | 201.099 | 0.023 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.237 | 0.070 | 0.000 | 0.237 | gw-r/thread-89/journal/page | none observed |
| e606a721a887d5500000000000008cc1 | 220.715 | 0.081 | 0.000 | 0.000 | 0.000 | 16.041 | 201.881 | 0.026 | 0.000 | 1.849 | 0.000 | n/a | n/a | 0.838 | 0.081 | 0.000 | 0.838 | gw-r/thread-126/journal/page | none observed |
| e606a721a887d5500000000000008959 | 220.371 | 0.030 | 0.000 | 0.000 | 0.000 | 19.704 | 200.529 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.066 | 0.030 | 0.000 | 0.066 | gw-r/thread-178/journal/page | none observed |
| e606a721a887d5500000000000008cb9 | 219.336 | 0.089 | 0.000 | 0.000 | 0.000 | 2.959 | 214.202 | 0.023 | 0.000 | 1.727 | 0.000 | n/a | n/a | 0.336 | 0.089 | 0.000 | 0.336 | gw-r/thread-129/journal/page | none observed |
| e606a721a887d55000000000000082d9 | 218.615 | 0.910 | 0.000 | 0.000 | 0.000 | 2.102 | 215.274 | 0.015 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.232 | 0.910 | 0.004 | 0.232 | gw-r/thread-168/journal/page | none observed |
| e606a721a887d5500000000000008ca9 | 217.363 | 1.169 | 0.000 | 0.000 | 0.000 | 3.640 | 206.949 | 0.052 | 3.858 | 0.097 | 0.000 | n/a | n/a | 1.598 | 1.169 | 0.005 | 1.598 | gw-r/thread-173/journal/page | none observed |
| e606a721a887d5500000000000008589 | 215.115 | 0.060 | 0.000 | 0.000 | 0.000 | 1.242 | 213.577 | 0.020 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.130 | 0.060 | 0.000 | 0.130 | gw-r/thread-144/journal/page | none observed |
| e606a721a887d5500000000000008799 | 211.583 | 0.047 | 0.000 | 0.000 | 0.000 | 0.955 | 157.014 | 0.004 | 53.396 | 0.032 | 0.000 | n/a | n/a | 0.135 | 0.047 | 0.000 | 0.135 | gw-r/thread-161/journal/page | none observed |
| e606a721a887d5500000000000008b19 | 209.547 | 0.056 | 0.000 | 0.000 | 0.000 | 1.854 | 207.419 | 0.020 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.123 | 0.056 | 0.000 | 0.123 | gw-r/thread-133/journal/page | none observed |
| e606a721a887d5500000000000008831 | 209.508 | 0.084 | 0.000 | 0.000 | 0.000 | 7.557 | 201.496 | 0.025 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.229 | 0.084 | 0.000 | 0.229 | gw-r/thread-119/journal/page | none observed |
| e606a721a887d5500000000000008751 | 208.885 | 0.242 | 0.000 | 0.000 | 0.000 | 3.913 | 204.144 | 0.016 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.461 | 0.242 | 0.001 | 0.461 | gw-r/thread-175/journal/page | none observed |
| e606a721a887d55000000000000089f9 | 208.010 | 0.031 | 0.000 | 0.000 | 0.000 | 0.553 | 196.981 | 0.005 | 10.375 | 0.008 | 0.000 | n/a | n/a | 0.056 | 0.031 | 0.000 | 0.056 | gw-r/thread-135/journal/page | none observed |

## P3 / p4mix / read (227 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.135 | 0.031 | 0.000 | 0.000 | 0.000 | 0.614 | 200.315 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 |
| p99 | 210.969 | 0.096 | 0.000 | 0.000 | 0.000 | 3.534 | 201.323 | 0.719 | 26.149 | 0.125 | 0.000 | n/a | n/a | 0.277 | 0.096 | 0.001 | 0.277 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d5500000000000008de9 | 221.733 | 0.086 | 0.000 | 0.000 | 0.000 | 20.804 | 200.441 | 0.006 | 0.245 | 0.035 | 0.000 | n/a | n/a | 0.116 | 0.086 | 0.000 | 0.116 | gw-r/thread-94/journal/page | none observed |
| e606a721a887d5500000000000008dc1 | 213.949 | 0.028 | 0.000 | 0.000 | 0.000 | 0.556 | 187.115 | 0.014 | 26.149 | 0.020 | 0.000 | n/a | n/a | 0.066 | 0.028 | 0.000 | 0.066 | gw-r/thread-178/journal/page | none observed |
| e606a721a887d5500000000000008ea1 | 210.969 | 0.035 | 0.000 | 0.000 | 0.000 | 0.685 | 197.008 | 0.005 | 13.126 | 0.035 | 0.000 | n/a | n/a | 0.076 | 0.035 | 0.000 | 0.076 | gw-r/thread-79/journal/page | none observed |
| e606a721a887d5500000000000008d19 | 209.530 | 0.052 | 0.000 | 0.000 | 0.000 | 7.455 | 201.807 | 0.007 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.099 | 0.052 | 0.000 | 0.099 | gw-r/thread-98/journal/page | none observed |
| e606a721a887d5500000000000009039 | 208.148 | 0.030 | 0.000 | 0.000 | 0.000 | 2.792 | 202.805 | 0.029 | 0.000 | 0.077 | 0.000 | n/a | n/a | 2.416 | 0.030 | 0.000 | 2.416 | gw-r/thread-178/journal/page | none observed |
| e606a721a887d5500000000000009021 | 205.559 | 0.087 | 0.000 | 0.000 | 0.000 | 3.534 | 200.477 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.415 | 0.087 | 0.000 | 1.415 | gw-r/thread-86/journal/page | none observed |
| e606a721a887d5500000000000009211 | 203.832 | 0.042 | 0.000 | 0.000 | 0.000 | 2.545 | 201.085 | 0.012 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.076 | 0.042 | 0.000 | 0.076 | gw-r/thread-96/journal/page | none observed |
| e606a721a887d5500000000000008e69 | 203.454 | 0.054 | 0.000 | 0.000 | 0.000 | 0.836 | 186.418 | 0.010 | 16.014 | 0.057 | 0.000 | n/a | n/a | 0.066 | 0.054 | 0.000 | 0.066 | gw-r/thread-112/journal/page | none observed |
| e606a721a887d5500000000000008d61 | 202.992 | 0.065 | 0.000 | 0.000 | 0.000 | 1.460 | 201.218 | 0.010 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.120 | 0.065 | 0.000 | 0.120 | gw-r/thread-180/journal/page | none observed |
| e606a721a887d5500000000000008f71 | 202.784 | 0.027 | 0.000 | 0.000 | 0.000 | 1.513 | 200.944 | 0.026 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.211 | 0.027 | 0.000 | 0.211 | gw-r/thread-133/journal/page | none observed |
| e606a721a887d5500000000000009369 | 202.736 | 0.056 | 0.000 | 0.000 | 0.000 | 1.890 | 200.562 | 0.005 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.173 | 0.056 | 0.000 | 0.173 | gw-r/thread-87/journal/page | none observed |
| e606a721a887d5500000000000009521 | 202.674 | 0.041 | 0.000 | 0.000 | 0.000 | 2.088 | 200.466 | 0.003 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.055 | 0.041 | 0.000 | 0.055 | gw-r/thread-161/journal/page | none observed |
| e606a721a887d5500000000000008e31 | 202.345 | 0.017 | 0.000 | 0.000 | 0.000 | 1.791 | 200.450 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.053 | 0.017 | 0.000 | 0.053 | gw-r/thread-144/journal/page | none observed |
| e606a721a887d5500000000000008d51 | 202.246 | 0.054 | 0.000 | 0.000 | 0.000 | 0.890 | 201.090 | 0.013 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.120 | 0.054 | 0.000 | 0.120 | gw-r/thread-111/journal/page | none observed |
| e606a721a887d5500000000000009471 | 202.164 | 0.032 | 0.000 | 0.000 | 0.000 | 1.415 | 200.188 | 0.008 | 0.369 | 0.045 | 0.000 | n/a | n/a | 0.108 | 0.032 | 0.000 | 0.108 | gw-r/thread-96/journal/page | none observed |
| e606a721a887d55000000000000094c9 | 202.163 | 0.024 | 0.000 | 0.000 | 0.000 | 1.040 | 200.966 | 0.012 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.059 | 0.024 | 0.000 | 0.059 | gw-r/thread-164/journal/page | none observed |
| e606a721a887d5500000000000009461 | 202.147 | 0.022 | 0.000 | 0.000 | 0.000 | 0.609 | 201.323 | 0.003 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.145 | 0.022 | 0.000 | 0.145 | gw-r/thread-147/journal/page | none observed |
| e606a721a887d5500000000000009221 | 202.102 | 0.037 | 0.000 | 0.000 | 0.000 | 0.948 | 200.962 | 0.009 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.070 | 0.037 | 0.000 | 0.070 | gw-r/thread-172/journal/page | none observed |
| e606a721a887d5500000000000009131 | 202.085 | 0.057 | 0.000 | 0.000 | 0.000 | 0.868 | 200.951 | 0.007 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.077 | 0.057 | 0.000 | 0.077 | gw-r/thread-87/journal/page | none observed |
| e606a721a887d5500000000000009141 | 202.083 | 0.036 | 0.000 | 0.000 | 0.000 | 0.788 | 190.565 | 0.029 | 10.556 | 0.056 | 0.000 | n/a | n/a | 0.053 | 0.036 | 0.000 | 0.053 | gw-r/thread-177/journal/page | none observed |

## P3 / p4h1 / read (221 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.185 | 0.031 | 0.000 | 0.000 | 0.000 | 0.596 | 200.383 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.068 | 0.031 | 0.000 | 0.068 |
| p99 | 220.816 | 0.118 | 0.000 | 0.000 | 0.000 | 18.960 | 202.163 | 1.272 | 35.026 | 0.124 | 0.000 | n/a | n/a | 0.364 | 0.118 | 0.001 | 0.364 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d5500000000000009a39 | 235.289 | 0.063 | 0.000 | 0.000 | 0.000 | 27.053 | 207.906 | 0.015 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.202 | 0.063 | 0.000 | 0.202 | gw-r/thread-140/journal/page | none observed |
| e606a721a887d5500000000000009621 | 221.961 | 0.035 | 0.000 | 0.000 | 0.000 | 21.205 | 200.317 | 0.009 | 0.280 | 0.029 | 0.000 | n/a | n/a | 0.086 | 0.035 | 0.000 | 0.086 | gw-r/thread-107/journal/page | none observed |
| e606a721a887d5500000000000009ad9 | 220.816 | 0.106 | 0.000 | 0.000 | 0.000 | 18.960 | 201.429 | 0.009 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.230 | 0.106 | 0.000 | 0.230 | gw-r/thread-142/journal/page | none observed |
| e606a721a887d5500000000000009a49 | 210.324 | 0.042 | 0.000 | 0.000 | 0.000 | 0.911 | 176.264 | 0.012 | 32.977 | 0.033 | 0.000 | n/a | n/a | 0.084 | 0.042 | 0.000 | 0.084 | gw-r/thread-139/journal/page | none observed |
| e606a721a887d5500000000000009c91 | 208.086 | 0.028 | 0.000 | 0.000 | 0.000 | 7.525 | 200.185 | 0.004 | 0.261 | 0.011 | 0.000 | n/a | n/a | 0.072 | 0.028 | 0.000 | 0.072 | gw-r/thread-130/journal/page | none observed |
| e606a721a887d5500000000000009cf1 | 207.895 | 0.050 | 0.000 | 0.000 | 0.000 | 6.823 | 190.958 | 0.005 | 9.892 | 0.065 | 0.000 | n/a | n/a | 0.101 | 0.050 | 0.000 | 0.101 | gw-r/thread-93/journal/page | none observed |
| e606a721a887d55000000000000097e1 | 207.118 | 0.049 | 0.000 | 0.000 | 0.000 | 5.983 | 200.922 | 0.008 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.090 | 0.049 | 0.000 | 0.090 | gw-r/thread-139/journal/page | none observed |
| e606a721a887d55000000000000097c1 | 206.814 | 0.045 | 0.000 | 0.000 | 0.000 | 0.627 | 205.982 | 0.009 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.107 | 0.045 | 0.000 | 0.107 | gw-r/thread-74/journal/page | none observed |
| e606a721a887d5500000000000009a71 | 204.757 | 0.055 | 0.000 | 0.000 | 0.000 | 3.060 | 201.469 | 0.018 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.097 | 0.055 | 0.000 | 0.097 | gw-r/thread-154/journal/page | none observed |
| e606a721a887d5500000000000009969 | 203.675 | 0.039 | 0.000 | 0.000 | 0.000 | 2.837 | 199.858 | 0.005 | 0.771 | 0.026 | 0.000 | n/a | n/a | 0.138 | 0.039 | 0.000 | 0.138 | gw-r/thread-173/journal/page | none observed |
| e606a721a887d55000000000000096b1 | 203.598 | 0.084 | 0.000 | 0.000 | 0.000 | 2.978 | 130.522 | 0.008 | 69.737 | 0.036 | 0.000 | n/a | n/a | 0.232 | 0.084 | 0.000 | 0.232 | gw-r/thread-77/journal/page | none observed |
| e606a721a887d5500000000000009a79 | 203.378 | 0.054 | 0.000 | 0.000 | 0.000 | 2.376 | 200.831 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.071 | 0.054 | 0.000 | 0.071 | gw-r/thread-117/journal/page | none observed |
| e606a721a887d5500000000000009c89 | 203.358 | 0.019 | 0.000 | 0.000 | 0.000 | 2.334 | 200.906 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.055 | 0.019 | 0.000 | 0.055 | gw-r/thread-130/journal/page | none observed |
| e606a721a887d5500000000000009b01 | 203.067 | 0.025 | 0.000 | 0.000 | 0.000 | 0.640 | 202.163 | 0.023 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.084 | 0.025 | 0.000 | 0.084 | gw-r/thread-110/journal/page | none observed |
| e606a721a887d55000000000000095b1 | 202.869 | 0.034 | 0.000 | 0.000 | 0.000 | 1.047 | 201.523 | 0.014 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.186 | 0.034 | 0.000 | 0.186 | gw-r/thread-123/journal/page | none observed |
| e606a721a887d5500000000000009881 | 202.416 | 0.031 | 0.000 | 0.000 | 0.000 | 1.919 | 182.322 | 0.003 | 18.056 | 0.019 | 0.000 | n/a | n/a | 0.066 | 0.031 | 0.000 | 0.066 | gw-r/thread-122/journal/page | none observed |
| e606a721a887d5500000000000009ac1 | 202.321 | 0.031 | 0.000 | 0.000 | 0.000 | 1.649 | 200.495 | 0.010 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.094 | 0.031 | 0.000 | 0.094 | gw-r/thread-143/journal/page | none observed |
| e606a721a887d55000000000000096b9 | 202.289 | 0.047 | 0.000 | 0.000 | 0.000 | 0.877 | 200.918 | 0.008 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.364 | 0.047 | 0.000 | 0.364 | gw-r/thread-146/journal/page | none observed |
| e606a721a887d5500000000000009999 | 202.285 | 0.093 | 0.000 | 0.000 | 0.000 | 1.322 | 200.654 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.175 | 0.093 | 0.000 | 0.175 | gw-r/thread-167/journal/page | none observed |
| e606a721a887d5500000000000009d91 | 202.263 | 0.064 | 0.000 | 0.000 | 0.000 | 1.190 | 200.767 | 0.014 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.175 | 0.064 | 0.000 | 0.175 | gw-r/thread-118/journal/page | none observed |

## P3 / grow3 / read (58 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.576 | 0.071 | 0.000 | 0.000 | 0.000 | 0.802 | 200.646 | 0.011 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.098 | 0.071 | 0.000 | 0.098 |
| p99 | 833.910 | 2.214 | 0.000 | 0.000 | 0.000 | 763.092 | 202.928 | 34.257 | 0.000 | 0.381 | 0.000 | n/a | n/a | 0.352 | 2.214 | 0.019 | 0.352 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d5500000000000009ee9 | 833.910 | 0.091 | 0.000 | 0.000 | 0.000 | 763.092 | 70.081 | 0.036 | 0.000 | 0.258 | 0.000 | n/a | n/a | 0.352 | 0.091 | 0.000 | 0.352 | node-14/thread-7/socket.wait-first-byte | none observed |
| e606a721a887d5500000000000009e61 | 220.106 | 0.747 | 0.000 | 0.000 | 0.000 | 0.527 | 199.187 | 19.527 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.076 | 0.747 | 0.003 | 0.076 | gw-r/thread-116/journal/page | none observed |
| e606a721a887d5500000000000009fb9 | 206.210 | 0.514 | 0.000 | 0.000 | 0.000 | 0.655 | 198.177 | 6.772 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.063 | 0.514 | 0.002 | 0.063 | gw-r/thread-90/journal/page | none observed |
| e606a721a887d5500000000000009ec1 | 204.386 | 0.063 | 0.000 | 0.000 | 0.000 | 1.069 | 202.928 | 0.028 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.152 | 0.063 | 0.000 | 0.152 | gw-r/thread-77/journal/page | none observed |
| e606a721a887d5500000000000009f01 | 204.084 | 0.098 | 0.000 | 0.000 | 0.000 | 1.805 | 201.624 | 0.010 | 0.000 | 0.381 | 0.000 | n/a | n/a | 0.167 | 0.098 | 0.000 | 0.167 | gw-r/thread-133/journal/page | none observed |
| e606a721a887d5500000000000009e39 | 203.767 | 0.105 | 0.000 | 0.000 | 0.000 | 1.268 | 202.019 | 0.005 | 0.000 | 0.245 | 0.000 | n/a | n/a | 0.125 | 0.105 | 0.001 | 0.125 | gw-r/thread-146/journal/page | none observed |
| e606a721a887d5500000000000009e41 | 203.099 | 0.057 | 0.000 | 0.000 | 0.000 | 0.592 | 202.233 | 0.034 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.080 | 0.057 | 0.000 | 0.080 | gw-r/thread-116/journal/page | none observed |
| e606a721a887d5500000000000009db1 | 202.996 | 0.078 | 0.000 | 0.000 | 0.000 | 1.089 | 201.387 | 0.030 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.330 | 0.078 | 0.000 | 0.330 | gw-r/thread-160/journal/page | none observed |
| e606a721a887d5500000000000009ec9 | 202.902 | 0.107 | 0.000 | 0.000 | 0.000 | 1.449 | 201.105 | 0.008 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.150 | 0.107 | 0.001 | 0.150 | gw-r/thread-133/journal/page | none observed |
| e606a721a887d5500000000000009e81 | 202.833 | 0.070 | 0.000 | 0.000 | 0.000 | 1.529 | 200.966 | 0.010 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.153 | 0.070 | 0.000 | 0.153 | gw-r/thread-152/journal/page | none observed |
| e606a721a887d5500000000000009f91 | 202.796 | 0.078 | 0.000 | 0.000 | 0.000 | 0.802 | 201.140 | 0.518 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.191 | 0.078 | 0.000 | 0.191 | gw-r/thread-175/journal/page | none observed |
| e606a721a887d5500000000000009ea9 | 202.454 | 0.061 | 0.000 | 0.000 | 0.000 | 0.923 | 201.273 | 0.016 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.109 | 0.061 | 0.000 | 0.109 | gw-r/thread-133/journal/page | none observed |
| e606a721a887d5500000000000009e71 | 202.241 | 0.034 | 0.000 | 0.000 | 0.000 | 0.974 | 201.039 | 0.059 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.071 | 0.034 | 0.000 | 0.071 | gw-r/thread-152/journal/page | none observed |
| e606a721a887d5500000000000009e51 | 202.118 | 0.052 | 0.000 | 0.000 | 0.000 | 0.863 | 201.003 | 0.019 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.114 | 0.052 | 0.000 | 0.114 | gw-r/thread-116/journal/page | none observed |
| e606a721a887d5500000000000009de1 | 202.109 | 0.068 | 0.000 | 0.000 | 0.000 | 0.832 | 201.030 | 0.013 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.075 | 0.068 | 0.000 | 0.075 | gw-r/thread-172/journal/page | none observed |
| e606a721a887d5500000000000009da1 | 202.107 | 0.073 | 0.000 | 0.000 | 0.000 | 0.837 | 200.951 | 0.010 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.151 | 0.073 | 0.000 | 0.151 | gw-r/thread-138/journal/page | none observed |
| e606a721a887d5500000000000009f59 | 202.069 | 0.040 | 0.000 | 0.000 | 0.000 | 0.727 | 201.106 | 0.027 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.098 | 0.040 | 0.000 | 0.098 | gw-r/thread-124/journal/page | none observed |
| e606a721a887d5500000000000009e79 | 201.869 | 0.050 | 0.000 | 0.000 | 0.000 | 0.720 | 200.922 | 0.011 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.072 | 0.050 | 0.000 | 0.072 | gw-r/thread-133/journal/page | none observed |
| e606a721a887d5500000000000009e01 | 201.853 | 0.077 | 0.000 | 0.000 | 0.000 | 0.865 | 200.719 | 0.008 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.120 | 0.077 | 0.000 | 0.120 | gw-r/thread-172/journal/page | none observed |
| e606a721a887d5500000000000009e19 | 201.834 | 0.050 | 0.000 | 0.000 | 0.000 | 0.740 | 200.901 | 0.006 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.072 | 0.050 | 0.000 | 0.072 | gw-r/thread-48/journal/page | none observed |

## P3 / p4h3 / read (230 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.125 | 0.041 | 0.000 | 0.000 | 0.000 | 0.624 | 200.266 | 0.006 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.069 | 0.041 | 0.000 | 0.069 |
| p99 | 218.229 | 0.224 | 0.000 | 0.000 | 0.000 | 15.849 | 206.532 | 3.809 | 32.398 | 0.138 | 0.000 | n/a | n/a | 0.399 | 0.224 | 0.003 | 0.399 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d550000000000000a711 | 234.362 | 1.090 | 0.000 | 0.000 | 0.000 | 4.448 | 226.511 | 0.146 | 0.000 | 1.754 | 0.000 | n/a | n/a | 0.414 | 1.090 | 0.005 | 0.414 | gw-r/thread-74/journal/page | none observed |
| e606a721a887d550000000000000a779 | 219.543 | 0.043 | 0.000 | 0.000 | 0.000 | 17.921 | 201.432 | 0.020 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.052 | 0.043 | 0.000 | 0.052 | gw-r/thread-133/journal/page | none observed |
| e606a721a887d550000000000000a529 | 218.229 | 0.052 | 0.000 | 0.000 | 0.000 | 16.632 | 201.350 | 0.024 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.094 | 0.052 | 0.000 | 0.094 | gw-r/thread-140/journal/page | none observed |
| e606a721a887d550000000000000a309 | 211.616 | 0.096 | 0.000 | 0.000 | 0.000 | 10.842 | 200.236 | 0.006 | 0.256 | 0.010 | 0.000 | n/a | n/a | 0.171 | 0.096 | 0.000 | 0.171 | gw-r/thread-102/journal/page | none observed |
| e606a721a887d550000000000000a4b1 | 210.982 | 0.050 | 0.000 | 0.000 | 0.000 | 0.800 | 209.619 | 0.013 | 0.000 | 0.387 | 0.000 | n/a | n/a | 0.112 | 0.050 | 0.000 | 0.112 | gw-r/thread-146/journal/page | none observed |
| e606a721a887d550000000000000a781 | 209.692 | 0.056 | 0.000 | 0.000 | 0.000 | 6.812 | 202.632 | 0.015 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.090 | 0.056 | 0.000 | 0.090 | gw-r/thread-112/journal/page | none observed |
| e606a721a887d550000000000000a5b9 | 207.185 | 0.025 | 0.000 | 0.000 | 0.000 | 0.543 | 206.532 | 0.007 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.050 | 0.025 | 0.000 | 0.050 | gw-r/thread-122/journal/page | none observed |
| e606a721a887d550000000000000a561 | 205.630 | 0.045 | 0.000 | 0.000 | 0.000 | 5.063 | 200.410 | 0.003 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.084 | 0.045 | 0.000 | 0.084 | gw-r/thread-89/journal/page | none observed |
| e606a721a887d550000000000000a721 | 204.822 | 0.094 | 0.000 | 0.000 | 0.000 | 2.458 | 201.773 | 0.006 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.399 | 0.094 | 0.000 | 0.399 | gw-r/thread-74/journal/page | none observed |
| e606a721a887d550000000000000a7f1 | 203.223 | 0.054 | 0.000 | 0.000 | 0.000 | 0.675 | 202.348 | 0.008 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.094 | 0.054 | 0.000 | 0.094 | gw-r/thread-150/journal/page | none observed |
| e606a721a887d550000000000000a7c1 | 203.097 | 0.224 | 0.000 | 0.000 | 0.000 | 0.677 | 201.154 | 0.031 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.915 | 0.224 | 0.001 | 0.915 | gw-r/thread-117/journal/page | none observed |
| e606a721a887d550000000000000a361 | 203.080 | 0.020 | 0.000 | 0.000 | 0.000 | 0.531 | 182.491 | 0.008 | 19.986 | 0.000 | 0.000 | n/a | n/a | 0.044 | 0.020 | 0.000 | 0.044 | gw-r/thread-130/journal/page | none observed |
| e606a721a887d550000000000000a7a9 | 203.038 | 0.077 | 0.000 | 0.000 | 0.000 | 1.860 | 200.954 | 0.004 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.097 | 0.077 | 0.000 | 0.097 | gw-r/thread-154/journal/page | none observed |
| e606a721a887d550000000000000a3e1 | 202.964 | 0.023 | 0.000 | 0.000 | 0.000 | 0.557 | 200.959 | 1.318 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.049 | 0.023 | 0.000 | 0.049 | gw-r/thread-177/journal/page | none observed |
| e606a721a887d550000000000000a7f9 | 202.802 | 0.087 | 0.000 | 0.000 | 0.000 | 0.890 | 191.566 | 0.009 | 10.095 | 0.057 | 0.000 | n/a | n/a | 0.098 | 0.087 | 0.000 | 0.098 | gw-r/thread-161/journal/page | none observed |
| e606a721a887d550000000000000a651 | 202.611 | 0.026 | 0.000 | 0.000 | 0.000 | 1.249 | 201.181 | 0.033 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.076 | 0.026 | 0.000 | 0.076 | gw-r/thread-144/journal/page | none observed |
| e606a721a887d550000000000000a071 | 202.534 | 0.090 | 0.000 | 0.000 | 0.000 | 0.927 | 201.234 | 0.012 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.188 | 0.090 | 0.000 | 0.188 | gw-r/thread-144/journal/page | none observed |
| e606a721a887d550000000000000a609 | 202.533 | 0.060 | 0.000 | 0.000 | 0.000 | 1.032 | 201.256 | 0.008 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.133 | 0.060 | 0.000 | 0.133 | gw-r/thread-88/journal/page | none observed |
| e606a721a887d550000000000000a249 | 202.442 | 0.015 | 0.000 | 0.000 | 0.000 | 1.510 | 200.816 | 0.006 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.037 | 0.015 | 0.000 | 0.037 | gw-r/thread-161/journal/page | none observed |
| e606a721a887d550000000000000a5e9 | 202.210 | 0.071 | 0.000 | 0.000 | 0.000 | 0.971 | 200.920 | 0.007 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.151 | 0.071 | 0.000 | 0.151 | gw-r/thread-138/journal/page | none observed |

## P3 / grow10 / read (97 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 184.160 | 0.497 | 0.000 | 0.000 | 0.000 | 0.800 | 180.428 | 0.009 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.083 | 0.497 | 0.003 | 0.083 |
| p99 | 237.474 | 2.042 | 0.000 | 0.000 | 0.000 | 24.585 | 226.201 | 102.961 | 25.406 | 0.382 | 0.000 | n/a | n/a | 0.318 | 2.042 | 0.022 | 0.318 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d550000000000000a979 | 237.474 | 0.210 | 0.000 | 0.000 | 0.000 | 4.628 | 226.201 | 5.987 | 0.000 | 0.246 | 0.000 | n/a | n/a | 0.201 | 0.210 | 0.001 | 0.201 | gw-r/thread-144/journal/page | none observed |
| e606a721a887d550000000000000a839 | 208.456 | 2.042 | 0.000 | 0.000 | 0.000 | 1.801 | 179.868 | 24.425 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.246 | 2.042 | 0.010 | 0.246 | gw-r/thread-78/journal/page | none observed |
| e606a721a887d550000000000000aa51 | 207.266 | 0.093 | 0.000 | 0.000 | 0.000 | 6.435 | 200.570 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.115 | 0.093 | 0.000 | 0.115 | gw-r/thread-103/journal/page | none observed |
| e606a721a887d550000000000000ac59 | 204.645 | 0.063 | 0.000 | 0.000 | 0.000 | 0.695 | 191.809 | 0.019 | 11.934 | 0.021 | 0.000 | n/a | n/a | 0.105 | 0.063 | 0.000 | 0.105 | gw-r/thread-109/journal/page | none observed |
| e606a721a887d550000000000000aa21 | 204.642 | 0.852 | 0.000 | 0.000 | 0.000 | 1.610 | 201.911 | 0.021 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.141 | 0.852 | 0.004 | 0.141 | gw-r/thread-166/journal/page | none observed |
| e606a721a887d550000000000000aae9 | 204.624 | 0.576 | 0.000 | 0.000 | 0.000 | 0.655 | 203.274 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.077 | 0.576 | 0.003 | 0.077 | gw-r/thread-116/journal/page | none observed |
| e606a721a887d550000000000000ac91 | 204.410 | 0.027 | 0.000 | 0.000 | 0.000 | 3.164 | 201.055 | 0.021 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.057 | 0.027 | 0.000 | 0.057 | gw-r/thread-155/journal/page | none observed |
| e606a721a887d550000000000000a8a1 | 203.813 | 0.062 | 0.000 | 0.000 | 0.000 | 1.576 | 201.966 | 0.043 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.092 | 0.062 | 0.000 | 0.092 | gw-r/thread-110/journal/page | none observed |
| e606a721a887d550000000000000aae1 | 203.627 | 0.548 | 0.000 | 0.000 | 0.000 | 0.724 | 193.304 | 8.966 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.062 | 0.548 | 0.003 | 0.062 | gw-r/thread-137/journal/page | none observed |
| e606a721a887d550000000000000a8b9 | 203.618 | 0.030 | 0.000 | 0.000 | 0.000 | 2.589 | 200.844 | 0.010 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.084 | 0.030 | 0.000 | 0.084 | gw-r/thread-180/journal/page | none observed |
| e606a721a887d550000000000000ab69 | 203.542 | 0.062 | 0.000 | 0.000 | 0.000 | 1.177 | 201.560 | 0.043 | 0.000 | 0.382 | 0.000 | n/a | n/a | 0.318 | 0.062 | 0.000 | 0.318 | gw-r/thread-108/journal/page | none observed |
| e606a721a887d550000000000000ac49 | 203.341 | 0.042 | 0.000 | 0.000 | 0.000 | 0.903 | 202.200 | 0.013 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.096 | 0.042 | 0.000 | 0.096 | gw-r/thread-109/journal/page | none observed |
| e606a721a887d550000000000000a859 | 202.813 | 0.074 | 0.000 | 0.000 | 0.000 | 1.341 | 201.089 | 0.009 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.155 | 0.074 | 0.000 | 0.155 | gw-r/thread-122/journal/page | none observed |
| e606a721a887d550000000000000a8c1 | 202.425 | 0.068 | 0.000 | 0.000 | 0.000 | 1.110 | 201.022 | 0.012 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.131 | 0.068 | 0.000 | 0.131 | gw-r/thread-110/journal/page | none observed |
| e606a721a887d550000000000000ac21 | 202.381 | 0.041 | 0.000 | 0.000 | 0.000 | 0.965 | 201.128 | 0.011 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.153 | 0.041 | 0.000 | 0.153 | gw-r/thread-167/journal/page | none observed |
| e606a721a887d550000000000000ac11 | 202.256 | 0.067 | 0.000 | 0.000 | 0.000 | 0.738 | 201.204 | 0.007 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.162 | 0.067 | 0.000 | 0.162 | gw-r/thread-115/journal/page | none observed |
| e606a721a887d550000000000000a919 | 202.073 | 0.024 | 0.000 | 0.000 | 0.000 | 0.601 | 201.241 | 0.102 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.063 | 0.024 | 0.000 | 0.063 | gw-r/thread-153/journal/page | none observed |
| e606a721a887d550000000000000a849 | 202.039 | 0.056 | 0.000 | 0.000 | 0.000 | 0.794 | 200.949 | 0.018 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.164 | 0.056 | 0.000 | 0.164 | gw-r/thread-122/journal/page | none observed |
| e606a721a887d550000000000000a941 | 202.018 | 0.022 | 0.000 | 0.000 | 0.000 | 0.583 | 201.268 | 0.010 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.062 | 0.022 | 0.000 | 0.062 | gw-r/thread-153/journal/page | none observed |
| e606a721a887d550000000000000aa39 | 201.969 | 0.046 | 0.000 | 0.000 | 0.000 | 0.780 | 200.912 | 0.025 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.151 | 0.046 | 0.000 | 0.151 | gw-r/thread-103/journal/page | none observed |

## P3 / p4h10 / read (224 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.077 | 0.029 | 0.000 | 0.000 | 0.000 | 0.633 | 200.241 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.068 | 0.029 | 0.000 | 0.068 |
| p99 | 222.461 | 0.617 | 0.000 | 0.000 | 0.000 | 6.917 | 202.362 | 3.870 | 29.633 | 0.137 | 0.000 | n/a | n/a | 0.299 | 0.617 | 0.003 | 0.299 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d550000000000000b071 | 226.538 | 0.041 | 0.000 | 0.000 | 0.000 | 0.605 | 180.471 | 0.004 | 45.328 | 0.021 | 0.000 | n/a | n/a | 0.068 | 0.041 | 0.000 | 0.068 | gw-r/thread-156/journal/page | none observed |
| e606a721a887d550000000000000b149 | 224.174 | 0.042 | 0.000 | 0.000 | 0.000 | 0.739 | 196.184 | 0.009 | 27.097 | 0.033 | 0.000 | n/a | n/a | 0.070 | 0.042 | 0.000 | 0.070 | gw-r/thread-121/journal/page | none observed |
| e606a721a887d550000000000000b239 | 222.461 | 0.047 | 0.000 | 0.000 | 0.000 | 3.961 | 166.125 | 0.124 | 51.963 | 0.087 | 0.000 | n/a | n/a | 0.154 | 0.047 | 0.000 | 0.154 | gw-r/thread-88/journal/page | none observed |
| e606a721a887d550000000000000b4d9 | 216.681 | 0.030 | 0.000 | 0.000 | 0.000 | 15.270 | 201.210 | 0.010 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.057 | 0.030 | 0.000 | 0.057 | gw-r/thread-155/journal/page | none observed |
| e606a721a887d550000000000000b4c1 | 215.684 | 0.043 | 0.000 | 0.000 | 0.000 | 0.574 | 182.159 | 3.168 | 29.633 | 0.026 | 0.000 | n/a | n/a | 0.079 | 0.043 | 0.000 | 0.079 | gw-r/thread-119/journal/page | none observed |
| e606a721a887d550000000000000b301 | 212.363 | 0.038 | 0.000 | 0.000 | 0.000 | 11.308 | 200.766 | 0.016 | 0.074 | 0.066 | 0.000 | n/a | n/a | 0.094 | 0.038 | 0.000 | 0.094 | gw-r/thread-96/journal/page | none observed |
| e606a721a887d550000000000000b2e1 | 210.595 | 0.042 | 0.000 | 0.000 | 0.000 | 6.899 | 175.651 | 0.018 | 27.867 | 0.019 | 0.000 | n/a | n/a | 0.099 | 0.042 | 0.000 | 0.099 | gw-r/thread-136/journal/page | none observed |
| e606a721a887d550000000000000b141 | 207.957 | 5.952 | 0.000 | 0.000 | 0.000 | 1.191 | 200.650 | 0.003 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.128 | 5.952 | 0.029 | 0.128 | gw-r/thread-95/journal/page | none observed |
| e606a721a887d550000000000000aec1 | 207.370 | 0.028 | 0.000 | 0.000 | 0.000 | 6.917 | 200.111 | 0.002 | 0.251 | 0.007 | 0.000 | n/a | n/a | 0.053 | 0.028 | 0.000 | 0.053 | gw-r/thread-120/journal/page | none observed |
| e606a721a887d550000000000000ad31 | 205.189 | 0.042 | 0.000 | 0.000 | 0.000 | 0.631 | 184.324 | 0.003 | 20.110 | 0.017 | 0.000 | n/a | n/a | 0.063 | 0.042 | 0.000 | 0.063 | gw-r/thread-169/journal/page | none observed |
| e606a721a887d550000000000000b181 | 203.947 | 0.585 | 0.000 | 0.000 | 0.000 | 2.508 | 200.636 | 0.004 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.160 | 0.585 | 0.003 | 0.160 | gw-r/thread-109/journal/page | none observed |
| e606a721a887d550000000000000b2d1 | 203.887 | 0.018 | 0.000 | 0.000 | 0.000 | 1.381 | 202.362 | 0.011 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.054 | 0.018 | 0.000 | 0.054 | gw-r/thread-163/journal/page | none observed |
| e606a721a887d550000000000000b2a1 | 203.868 | 0.075 | 0.000 | 0.000 | 0.000 | 1.137 | 202.394 | 0.037 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.138 | 0.075 | 0.000 | 0.138 | gw-r/thread-97/journal/page | none observed |
| e606a721a887d550000000000000b1d9 | 203.827 | 0.264 | 0.000 | 0.000 | 0.000 | 3.186 | 200.183 | 0.003 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.174 | 0.264 | 0.001 | 0.174 | gw-r/thread-176/journal/page | none observed |
| e606a721a887d550000000000000ad19 | 203.252 | 0.054 | 0.000 | 0.000 | 0.000 | 1.207 | 201.678 | 0.023 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.184 | 0.054 | 0.000 | 0.184 | gw-r/thread-161/journal/page | none observed |
| e606a721a887d550000000000000b501 | 203.051 | 0.015 | 0.000 | 0.000 | 0.000 | 0.536 | 202.421 | 0.007 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.044 | 0.015 | 0.000 | 0.044 | gw-r/thread-163/journal/page | none observed |
| e606a721a887d550000000000000b279 | 203.033 | 0.026 | 0.000 | 0.000 | 0.000 | 2.059 | 196.054 | 0.003 | 4.790 | 0.032 | 0.000 | n/a | n/a | 0.070 | 0.026 | 0.000 | 0.070 | gw-r/thread-119/journal/page | none observed |
| e606a721a887d550000000000000aee9 | 202.911 | 0.171 | 0.000 | 0.000 | 0.000 | 1.818 | 200.681 | 0.016 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.165 | 0.171 | 0.001 | 0.165 | gw-r/thread-151/journal/page | none observed |
| e606a721a887d550000000000000b199 | 202.619 | 0.045 | 0.000 | 0.000 | 0.000 | 1.717 | 200.748 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.072 | 0.045 | 0.000 | 0.072 | gw-r/thread-103/journal/page | none observed |
| e606a721a887d550000000000000b151 | 202.421 | 0.059 | 0.000 | 0.000 | 0.000 | 1.248 | 200.859 | 0.010 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.191 | 0.059 | 0.000 | 0.191 | gw-r/thread-152/journal/page | none observed |

## P3 / presweep / read (221 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.343 | 0.028 | 0.000 | 0.000 | 0.000 | 0.745 | 200.366 | 0.008 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.072 | 0.028 | 0.000 | 0.072 |
| p99 | 214.583 | 0.220 | 0.000 | 0.000 | 0.000 | 5.997 | 203.221 | 5.843 | 46.733 | 0.181 | 0.000 | n/a | n/a | 0.249 | 0.220 | 0.002 | 0.249 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d550000000000000b8a1 | 243.659 | 0.041 | 0.000 | 0.000 | 0.000 | 1.341 | 167.311 | 0.009 | 74.803 | 0.063 | 0.000 | n/a | n/a | 0.092 | 0.041 | 0.000 | 0.092 | gw-r/thread-51/journal/page | none observed |
| e606a721a887d550000000000000bc61 | 228.291 | 0.028 | 0.000 | 0.000 | 0.000 | 4.161 | 223.645 | 0.232 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.087 | 0.028 | 0.000 | 0.087 | gw-r/thread-157/journal/page | none observed |
| e606a721a887d550000000000000bab1 | 214.583 | 0.027 | 0.000 | 0.000 | 0.000 | 0.629 | 185.994 | 0.008 | 27.765 | 0.029 | 0.000 | n/a | n/a | 0.132 | 0.027 | 0.000 | 0.132 | gw-r/thread-110/journal/page | none observed |
| e606a721a887d550000000000000b791 | 213.722 | 0.030 | 0.000 | 0.000 | 0.000 | 2.538 | 195.320 | 0.005 | 15.736 | 0.021 | 0.000 | n/a | n/a | 0.072 | 0.030 | 0.000 | 0.072 | gw-r/thread-129/journal/page | none observed |
| e606a721a887d550000000000000b729 | 210.791 | 0.036 | 0.000 | 0.000 | 0.000 | 9.560 | 201.052 | 0.013 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.083 | 0.036 | 0.000 | 0.083 | gw-r/thread-156/journal/page | none observed |
| e606a721a887d550000000000000b701 | 208.469 | 0.042 | 0.000 | 0.000 | 0.000 | 5.350 | 202.812 | 0.065 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.153 | 0.042 | 0.000 | 0.153 | gw-r/thread-146/journal/page | none observed |
| e606a721a887d550000000000000bcc1 | 207.215 | 0.018 | 0.000 | 0.000 | 0.000 | 5.997 | 201.038 | 0.006 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.053 | 0.018 | 0.000 | 0.053 | gw-r/thread-157/journal/page | none observed |
| e606a721a887d550000000000000bbe9 | 206.730 | 0.041 | 0.000 | 0.000 | 0.000 | 5.620 | 200.859 | 0.018 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.106 | 0.041 | 0.000 | 0.106 | gw-r/thread-109/journal/page | none observed |
| e606a721a887d550000000000000b519 | 206.514 | 0.054 | 0.000 | 0.000 | 0.000 | 5.145 | 201.107 | 0.013 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.117 | 0.054 | 0.000 | 0.117 | gw-r/thread-105/journal/page | none observed |
| e606a721a887d550000000000000b651 | 206.464 | 0.033 | 0.000 | 0.000 | 0.000 | 0.659 | 189.031 | 0.009 | 16.628 | 0.016 | 0.000 | n/a | n/a | 0.088 | 0.033 | 0.000 | 0.088 | gw-r/thread-91/journal/page | none observed |
| e606a721a887d550000000000000b7f1 | 205.194 | 0.041 | 0.000 | 0.000 | 0.000 | 0.670 | 202.625 | 0.009 | 0.000 | 0.095 | 0.000 | n/a | n/a | 1.753 | 0.041 | 0.000 | 1.753 | gw-r/thread-51/journal/page | none observed |
| e606a721a887d550000000000000b9c1 | 205.140 | 0.050 | 0.000 | 0.000 | 0.000 | 4.274 | 183.484 | 0.004 | 17.175 | 0.018 | 0.000 | n/a | n/a | 0.135 | 0.050 | 0.000 | 0.135 | gw-r/thread-152/journal/page | none observed |
| e606a721a887d550000000000000b709 | 205.071 | 0.023 | 0.000 | 0.000 | 0.000 | 2.071 | 202.385 | 0.007 | 0.441 | 0.075 | 0.000 | n/a | n/a | 0.068 | 0.023 | 0.000 | 0.068 | gw-r/thread-95/journal/page | none observed |
| e606a721a887d550000000000000b9d1 | 204.997 | 0.018 | 0.000 | 0.000 | 0.000 | 0.558 | 204.272 | 0.015 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.065 | 0.018 | 0.000 | 0.065 | gw-r/thread-100/journal/page | none observed |
| e606a721a887d550000000000000b731 | 204.950 | 0.022 | 0.000 | 0.000 | 0.000 | 3.991 | 200.783 | 0.013 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.070 | 0.022 | 0.000 | 0.070 | gw-r/thread-74/journal/page | none observed |
| e606a721a887d550000000000000b8a9 | 204.466 | 0.068 | 0.000 | 0.000 | 0.000 | 3.653 | 171.054 | 0.005 | 29.524 | 0.055 | 0.000 | n/a | n/a | 0.107 | 0.068 | 0.000 | 0.107 | gw-r/thread-94/journal/page | none observed |
| e606a721a887d550000000000000b9d9 | 204.264 | 0.024 | 0.000 | 0.000 | 0.000 | 3.311 | 181.006 | 0.007 | 19.797 | 0.065 | 0.000 | n/a | n/a | 0.056 | 0.024 | 0.000 | 0.056 | gw-r/thread-78/journal/page | none observed |
| e606a721a887d550000000000000b949 | 204.129 | 0.030 | 0.000 | 0.000 | 0.000 | 3.164 | 182.715 | 0.010 | 17.997 | 0.063 | 0.000 | n/a | n/a | 0.151 | 0.030 | 0.000 | 0.151 | gw-r/thread-74/journal/page | none observed |
| e606a721a887d550000000000000b6f9 | 204.091 | 0.025 | 0.000 | 0.000 | 0.000 | 0.741 | 203.221 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.078 | 0.025 | 0.000 | 0.078 | gw-r/thread-132/journal/page | none observed |
| e606a721a887d550000000000000b6a1 | 203.990 | 0.022 | 0.000 | 0.000 | 0.000 | 2.865 | 200.946 | 0.023 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.074 | 0.022 | 0.000 | 0.074 | gw-r/thread-151/journal/page | none observed |

## P3 / sweep / read (9 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.125 | 0.045 | 0.000 | 0.000 | 0.000 | 1.023 | 200.597 | 0.007 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.080 | 0.045 | 0.000 | 0.080 |
| p99 | 205.594 | 0.065 | 0.000 | 0.000 | 0.000 | 3.995 | 203.486 | 1.032 | 42.769 | 0.084 | 0.000 | n/a | n/a | 0.261 | 0.065 | 0.001 | 0.261 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d550000000000000bd49 | 205.594 | 0.045 | 0.000 | 0.000 | 0.000 | 1.792 | 203.486 | 0.004 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.188 | 0.045 | 0.000 | 0.188 | gw-r/thread-108/journal/page | none observed |
| e606a721a887d550000000000000bd31 | 204.951 | 0.051 | 0.000 | 0.000 | 0.000 | 3.995 | 200.753 | 0.007 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.080 | 0.051 | 0.000 | 0.080 | gw-r/thread-173/journal/page | none observed |
| e606a721a887d550000000000000bd59 | 204.762 | 0.024 | 0.000 | 0.000 | 0.000 | 0.676 | 202.856 | 0.014 | 1.055 | 0.068 | 0.000 | n/a | n/a | 0.069 | 0.024 | 0.000 | 0.069 | gw-r/thread-102/journal/page | none observed |
| e606a721a887d550000000000000bd51 | 202.666 | 0.065 | 0.000 | 0.000 | 0.000 | 0.909 | 187.984 | 0.002 | 13.559 | 0.035 | 0.000 | n/a | n/a | 0.112 | 0.065 | 0.000 | 0.112 | gw-r/thread-105/journal/page | none observed |
| e606a721a887d550000000000000bd41 | 202.125 | 0.016 | 0.000 | 0.000 | 0.000 | 1.255 | 157.784 | 0.004 | 42.769 | 0.035 | 0.000 | n/a | n/a | 0.261 | 0.016 | 0.000 | 0.261 | gw-r/thread-93/journal/page | none observed |
| e606a721a887d550000000000000bd29 | 202.007 | 0.030 | 0.000 | 0.000 | 0.000 | 0.576 | 201.236 | 0.014 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.069 | 0.030 | 0.000 | 0.069 | gw-r/thread-166/journal/page | none observed |
| e606a721a887d550000000000000bd21 | 201.772 | 0.027 | 0.000 | 0.000 | 0.000 | 1.023 | 200.597 | 0.005 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.063 | 0.027 | 0.000 | 0.063 | gw-r/thread-115/journal/page | none observed |
| e606a721a887d550000000000000bd19 | 80.832 | 0.055 | 0.000 | 0.000 | 0.000 | 3.920 | 75.696 | 1.032 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.073 | 0.055 | 0.001 | 0.073 | gw-r/thread-49/journal/page | none observed |
| e606a721a887d550000000000000bcf1 | 78.034 | 0.049 | 0.000 | 0.000 | 0.000 | 0.653 | 77.143 | 0.010 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.107 | 0.049 | 0.001 | 0.107 | gw-r/thread-132/journal/page | none observed |

## P3 / tail / read (1033 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.302 | 0.038 | 0.000 | 0.000 | 0.000 | 0.607 | 200.575 | 0.008 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.070 | 0.038 | 0.000 | 0.070 |
| p99 | 205.929 | 0.131 | 0.000 | 0.000 | 0.000 | 2.774 | 201.700 | 4.831 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.220 | 0.131 | 0.002 | 0.220 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e606a721a887d550000000000000c351 | 252.226 | 0.112 | 0.000 | 0.000 | 0.000 | 49.884 | 201.871 | 0.014 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.217 | 0.112 | 0.000 | 0.217 | gw-r/thread-76/journal/page | none observed |
| e606a721a887d55000000000000129d9 | 239.691 | 0.044 | 0.000 | 0.000 | 0.000 | 0.685 | 200.892 | 0.010 | 37.945 | 0.032 | 0.000 | n/a | n/a | 0.084 | 0.044 | 0.000 | 0.084 | gw-r/thread-104/journal/page | none observed |
| e606a721a887d55000000000000123b1 | 228.186 | 0.145 | 0.000 | 0.000 | 0.000 | 0.883 | 164.777 | 62.188 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.153 | 0.145 | 0.001 | 0.153 | gw-r/thread-128/journal/page | none observed |
| e606a721a887d550000000000000c3a1 | 225.636 | 0.068 | 0.000 | 0.000 | 0.000 | 23.776 | 200.855 | 0.018 | 0.000 | 0.804 | 0.000 | n/a | n/a | 0.115 | 0.068 | 0.000 | 0.115 | gw-r/thread-173/journal/page | none observed |
| e606a721a887d5500000000000012f59 | 221.253 | 0.038 | 0.000 | 0.000 | 0.000 | 20.082 | 200.719 | 0.010 | 0.261 | 0.067 | 0.000 | n/a | n/a | 0.076 | 0.038 | 0.000 | 0.076 | gw-r/thread-134/journal/page | none observed |
| e606a721a887d550000000000000c081 | 208.017 | 0.072 | 0.000 | 0.000 | 0.000 | 6.719 | 201.035 | 0.006 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.162 | 0.072 | 0.000 | 0.162 | gw-r/thread-91/journal/page | none observed |
| e606a721a887d550000000000000c321 | 207.669 | 0.077 | 0.000 | 0.000 | 0.000 | 0.818 | 206.581 | 0.005 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.123 | 0.077 | 0.000 | 0.123 | gw-r/thread-115/journal/page | none observed |
| e606a721a887d550000000000000be49 | 206.712 | 0.115 | 0.000 | 0.000 | 0.000 | 1.290 | 204.804 | 0.013 | 0.000 | 0.364 | 0.000 | n/a | n/a | 0.126 | 0.115 | 0.001 | 0.126 | gw-r/thread-46/journal/page | none observed |
| e606a721a887d5500000000000011e39 | 206.616 | 0.058 | 0.000 | 0.000 | 0.000 | 0.758 | 200.856 | 4.831 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.067 | 0.058 | 0.000 | 0.067 | gw-r/thread-175/journal/page | none observed |
| e606a721a887d55000000000000120a9 | 206.135 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 206.058 | 0.017 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.000 | 0.000 | 0.000 | 0.000 | gw-r/thread-136/journal/page | none observed |
| e606a721a887d5500000000000012461 | 205.929 | 0.039 | 0.000 | 0.000 | 0.000 | 4.644 | 201.073 | 0.010 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.094 | 0.039 | 0.000 | 0.094 | gw-r/thread-152/journal/page | none observed |
| e606a721a887d550000000000000bd69 | 204.884 | 0.064 | 0.000 | 0.000 | 0.000 | 2.835 | 201.700 | 0.068 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.133 | 0.064 | 0.000 | 0.133 | gw-r/thread-172/journal/page | none observed |
| e606a721a887d550000000000000bd81 | 204.810 | 0.048 | 0.000 | 0.000 | 0.000 | 2.924 | 200.964 | 0.008 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.787 | 0.048 | 0.000 | 0.787 | gw-r/thread-172/journal/page | none observed |
| e606a721a887d5500000000000012e81 | 204.701 | 0.057 | 0.000 | 0.000 | 0.000 | 0.843 | 203.481 | 0.028 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.221 | 0.057 | 0.000 | 0.221 | gw-r/thread-49/journal/page | none observed |
| e606a721a887d550000000000000c349 | 204.561 | 0.068 | 0.000 | 0.000 | 0.000 | 2.303 | 201.999 | 0.017 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.093 | 0.068 | 0.000 | 0.093 | gw-r/thread-76/journal/page | none observed |
| e606a721a887d5500000000000012ef1 | 204.372 | 0.014 | 0.000 | 0.000 | 0.000 | 0.066 | 204.179 | 0.017 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.014 | 0.014 | 0.000 | 0.014 | gw-r/thread-135/journal/page | none observed |
| e606a721a887d550000000000000c491 | 204.303 | 0.056 | 0.000 | 0.000 | 0.000 | 0.712 | 203.212 | 0.043 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.083 | 0.056 | 0.000 | 0.083 | gw-r/thread-156/journal/page | none observed |
| e606a721a887d550000000000000c319 | 203.900 | 0.052 | 0.000 | 0.000 | 0.000 | 0.684 | 202.993 | 0.012 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.080 | 0.052 | 0.000 | 0.080 | gw-r/thread-127/journal/page | none observed |
| e606a721a887d5500000000000012fb1 | 203.573 | 0.074 | 0.000 | 0.000 | 0.000 | 0.903 | 192.602 | 0.106 | 9.460 | 0.223 | 0.000 | n/a | n/a | 0.204 | 0.074 | 0.000 | 0.204 | gw-r/thread-106/journal/page | none observed |
| e606a721a887d550000000000000c2f1 | 203.426 | 0.060 | 0.000 | 0.000 | 0.000 | 1.770 | 201.325 | 0.038 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.097 | 0.060 | 0.000 | 0.097 | gw-r/thread-115/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux per-thread CPU is sampled from /proc (10 ms ticks); per-request CPU attribution is not available. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
