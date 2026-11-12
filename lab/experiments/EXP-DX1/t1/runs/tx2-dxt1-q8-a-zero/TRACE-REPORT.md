# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue (scheduler/subject/admission)` (1499.060 ms, trace `faa81eac2aa82f81000000000002c569`); `node-14/thread-0/driver.queue (scheduler/subject/admission)` (1574.638 ms, trace `faa81eac2aa82f81000000000002c613`); `node-14/thread-0/driver.queue (scheduler/subject/admission)` (1371.548 ms, trace `faa81eac2aa82f81000000000002c786`); `node-14/thread-0/driver.queue (scheduler/subject/admission)` (1301.881 ms, trace `faa81eac2aa82f81000000000002c3ce`); `node-14/thread-0/driver.queue (scheduler/subject/admission)` (1427.411 ms, trace `faa81eac2aa82f81000000000002c67e`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-q8-a-zero`; source `c4c5b5984fe30695c99ee55a5c60fdfdb2087346`; subjects 10000; tracing full.

Commit coverage: 8533/8533 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 8533/8533. Raw trace bytes: 43119533.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node wall time excluding observed waits/GC, not on-CPU time. Driver queue is separate; timer drift is a bounded estimate shown only as an overlay. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.642 | 18.453 | 0.000 | 0.000 | 0.176 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 19.154 | 0.410 | 0.023 |
| p99 | 141.972 | 141.752 | 0.000 | 4.237 | 1.104 | 1.349 | 11.600 | 0.096 | 0.000 | 0.031 | 53.472 | n/a | n/a | 0.258 | 141.928 | 1.000 | 0.258 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f810000000000002127 | 141.972 | 141.752 | 0.000 | 0.000 | 0.176 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.044 | 141.928 | 1.000 | 0.044 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000021bb | 76.152 | 76.022 | 0.000 | 0.000 | 0.090 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 76.111 | 0.999 | 0.041 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000022ad | 67.706 | 6.119 | 0.000 | 0.000 | 0.689 | 1.349 | 5.945 | 0.096 | 0.000 | 0.013 | 53.472 | n/a | n/a | 0.022 | 6.808 | 0.101 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000002111 | 62.395 | 18.453 | 0.000 | 0.000 | 0.701 | 0.736 | 11.600 | 0.079 | 0.000 | 0.018 | 30.551 | n/a | n/a | 0.258 | 19.154 | 0.307 | 0.258 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f8100000000000022a8 | 60.163 | 60.092 | 0.000 | 0.000 | 0.049 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 60.140 | 1.000 | 0.023 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000021ef | 53.771 | 6.431 | 0.000 | 0.000 | 0.893 | 0.911 | 1.710 | 0.033 | 0.000 | 0.015 | 43.751 | n/a | n/a | 0.027 | 7.323 | 0.136 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000002205 | 50.049 | 50.005 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 50.030 | 1.000 | 0.019 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002196 | 47.477 | 47.427 | 0.000 | 0.000 | 0.029 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 47.456 | 1.000 | 0.021 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000000225e | 44.174 | 44.134 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 44.159 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002171 | 43.405 | 43.342 | 0.000 | 0.000 | 0.028 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 43.370 | 0.999 | 0.035 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000000226d | 41.640 | 9.914 | 0.000 | 4.237 | 1.104 | 1.000 | 3.373 | 0.039 | 0.000 | 0.031 | 21.918 | n/a | n/a | 0.024 | 15.254 | 0.366 | 0.024 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f8100000000000022cd | 37.720 | 37.675 | 0.000 | 0.000 | 0.027 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 37.702 | 1.000 | 0.018 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002239 | 35.783 | 35.742 | 0.000 | 0.000 | 0.027 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 35.769 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000021ca | 35.188 | 35.131 | 0.000 | 0.000 | 0.038 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 35.168 | 0.999 | 0.020 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000000214c | 34.642 | 34.576 | 0.000 | 0.000 | 0.038 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 34.615 | 0.999 | 0.027 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002283 | 34.182 | 34.119 | 0.000 | 0.000 | 0.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 34.158 | 0.999 | 0.024 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000000215b | 33.156 | 6.098 | 0.000 | 0.000 | 0.370 | 1.040 | 1.256 | 0.033 | 0.000 | 0.013 | 24.310 | n/a | n/a | 0.036 | 6.468 | 0.195 | 0.036 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000000219d | 31.995 | 10.793 | 0.000 | 0.000 | 0.885 | 0.830 | 2.091 | 0.034 | 0.000 | 0.017 | 17.324 | n/a | n/a | 0.022 | 11.677 | 0.365 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000002214 | 31.878 | 27.834 | 0.000 | 3.997 | 0.029 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 31.860 | 0.999 | 0.018 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002308 | 27.786 | 27.715 | 0.000 | 0.000 | 0.037 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 27.751 | 0.999 | 0.034 | node-14/thread-0/driver.execute | none observed |

## P2 / baseline / commit (92 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.625 | 11.452 | 0.000 | 0.000 | 0.136 | 0.519 | 0.218 | 0.000 | 0.000 | 0.000 | 4.657 | n/a | n/a | 0.022 | 13.083 | 0.530 | 0.022 |
| p99 | 164.956 | 164.894 | 0.000 | 5.324 | 3.835 | 6.394 | 10.064 | 0.125 | 61.198 | 0.431 | 26.437 | n/a | n/a | 0.087 | 164.929 | 1.000 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f8100000000000023ab | 164.956 | 164.894 | 0.000 | 0.000 | 0.036 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 164.929 | 1.000 | 0.026 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000023c1 | 111.875 | 7.327 | 0.000 | 4.956 | 0.800 | 1.001 | 10.064 | 0.036 | 61.198 | 0.034 | 26.437 | n/a | n/a | 0.022 | 13.083 | 0.117 | 0.022 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| faa81eac2aa82f810000000000002838 | 95.309 | 95.251 | 0.000 | 0.000 | 0.032 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 95.283 | 1.000 | 0.026 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000023df | 69.031 | 68.979 | 0.000 | 0.000 | 0.034 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 69.013 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002740 | 57.281 | 57.229 | 0.000 | 0.000 | 0.033 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 57.261 | 1.000 | 0.020 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000000255f | 55.114 | 55.031 | 0.000 | 0.000 | 0.056 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 55.087 | 1.000 | 0.027 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002370 | 50.717 | 50.647 | 0.000 | 0.000 | 0.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 50.679 | 0.999 | 0.038 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002618 | 45.631 | 45.551 | 0.000 | 0.000 | 0.053 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 45.603 | 0.999 | 0.028 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002955 | 44.038 | 10.503 | 0.000 | 3.760 | 0.132 | 6.394 | 3.355 | 0.038 | 0.000 | 0.013 | 19.830 | n/a | n/a | 0.013 | 14.395 | 0.327 | 0.013 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000000297d | 43.593 | 43.480 | 0.000 | 0.000 | 0.076 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.036 | 43.556 | 0.999 | 0.036 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000028a7 | 43.104 | 43.046 | 0.000 | 0.000 | 0.032 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 43.078 | 0.999 | 0.026 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000025b8 | 42.845 | 42.490 | 0.000 | 0.000 | 0.268 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.087 | 42.758 | 0.998 | 0.087 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000000269d | 41.859 | 20.495 | 0.000 | 0.000 | 1.120 | 2.590 | 3.493 | 0.073 | 0.000 | 0.020 | 14.044 | n/a | n/a | 0.024 | 21.615 | 0.516 | 0.024 | node-14/thread-0/driver.publication | none observed |
| faa81eac2aa82f810000000000002317 | 41.232 | 41.185 | 0.000 | 0.000 | 0.032 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 41.217 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002375 | 40.469 | 6.930 | 0.000 | 0.000 | 0.720 | 2.734 | 8.896 | 0.107 | 0.000 | 0.431 | 20.635 | n/a | n/a | 0.015 | 7.651 | 0.189 | 0.015 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000002438 | 39.309 | 39.261 | 0.000 | 0.000 | 0.034 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 39.295 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000000298c | 38.780 | 38.721 | 0.000 | 0.000 | 0.033 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 38.755 | 0.999 | 0.025 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002584 | 37.841 | 37.794 | 0.000 | 0.000 | 0.032 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 37.825 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000028ae | 37.677 | 8.170 | 0.000 | 0.000 | 0.733 | 1.658 | 1.514 | 0.053 | 0.000 | 0.009 | 25.518 | n/a | n/a | 0.021 | 8.904 | 0.236 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f8100000000000027c9 | 36.713 | 7.081 | 0.000 | 4.089 | 0.582 | 0.730 | 1.796 | 0.030 | 0.000 | 0.013 | 22.373 | n/a | n/a | 0.019 | 11.752 | 0.320 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (103 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.603 | 7.226 | 0.000 | 0.000 | 0.137 | 0.586 | 0.985 | 0.027 | 0.000 | 0.011 | 6.761 | n/a | n/a | 0.022 | 7.939 | 0.386 | 0.022 |
| p99 | 103.296 | 92.175 | 0.000 | 2.421 | 2.034 | 3.716 | 11.739 | 0.178 | 0.000 | 0.089 | 56.998 | n/a | n/a | 0.082 | 92.227 | 1.000 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f810000000000002f05 | 136.104 | 4.484 | 0.000 | 1.647 | 0.136 | 5.835 | 11.739 | 0.019 | 106.079 | 0.035 | 6.102 | n/a | n/a | 0.029 | 6.267 | 0.046 | 0.029 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| faa81eac2aa82f810000000000002b71 | 103.296 | 103.237 | 0.000 | 0.000 | 0.034 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 103.271 | 1.000 | 0.025 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002ab4 | 92.274 | 92.175 | 0.000 | 0.000 | 0.052 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.048 | 92.227 | 0.999 | 0.048 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002e63 | 84.617 | 84.541 | 0.000 | 0.000 | 0.054 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 84.595 | 1.000 | 0.022 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000030cf | 78.811 | 17.506 | 0.000 | 0.000 | 0.538 | 0.949 | 1.109 | 0.030 | 0.000 | 0.014 | 58.644 | n/a | n/a | 0.021 | 18.045 | 0.229 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000002ab9 | 64.820 | 4.193 | 0.000 | 0.000 | 0.419 | 2.869 | 11.322 | 0.070 | 0.000 | 0.709 | 45.201 | n/a | n/a | 0.037 | 4.612 | 0.071 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000003120 | 64.793 | 5.033 | 0.000 | 0.000 | 0.531 | 0.754 | 1.379 | 0.055 | 0.000 | 0.021 | 56.998 | n/a | n/a | 0.020 | 5.565 | 0.086 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000002a57 | 60.362 | 14.737 | 0.000 | 0.000 | 0.571 | 2.835 | 11.193 | 0.099 | 0.000 | 0.059 | 30.851 | n/a | n/a | 0.017 | 15.308 | 0.254 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f8100000000000030db | 55.924 | 55.842 | 0.000 | 0.000 | 0.060 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 55.902 | 1.000 | 0.022 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002bca | 49.440 | 49.392 | 0.000 | 0.000 | 0.033 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 49.425 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002a3d | 47.355 | 47.299 | 0.000 | 0.000 | 0.032 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 47.331 | 0.999 | 0.024 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002ce0 | 47.145 | 47.112 | 0.000 | 0.000 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 47.133 | 1.000 | 0.012 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002ae8 | 46.063 | 45.944 | 0.000 | 0.000 | 0.043 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.076 | 45.987 | 0.998 | 0.076 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002f4f | 45.212 | 16.776 | 0.000 | 0.000 | 8.342 | 1.600 | 2.404 | 0.063 | 0.000 | 0.021 | 15.985 | n/a | n/a | 0.021 | 25.118 | 0.556 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000002ff9 | 44.879 | 44.714 | 0.000 | 0.000 | 0.050 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.115 | 44.764 | 0.997 | 0.115 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002d0f | 42.887 | 42.829 | 0.000 | 0.000 | 0.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 42.864 | 0.999 | 0.022 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002f39 | 42.126 | 42.076 | 0.000 | 0.000 | 0.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 42.107 | 1.000 | 0.019 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002d34 | 40.160 | 40.072 | 0.000 | 0.000 | 0.063 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 40.135 | 0.999 | 0.025 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000000313e | 38.907 | 38.784 | 0.000 | 0.000 | 0.095 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 38.878 | 0.999 | 0.029 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000002ad9 | 38.803 | 38.749 | 0.000 | 0.000 | 0.033 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 38.782 | 0.999 | 0.021 | node-14/thread-0/driver.execute | none observed |

## P2/P4 / read-your-own-write / read (628 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 90.177 | 83.050 | 0.000 | 8.578 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 90.168 | 1.000 | 0.011 |
| p99 | 592.281 | 522.010 | 0.000 | 78.702 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 592.259 | 1.000 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f81000000000002bd1b | 953.506 | 849.387 | 0.000 | 104.109 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 953.496 | 1.000 | 0.010 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002c15a | 882.323 | 774.838 | 0.000 | 107.477 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 882.314 | 1.000 | 0.008 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002bdb4 | 777.612 | 708.016 | 0.000 | 69.588 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 777.604 | 1.000 | 0.009 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002c115 | 749.841 | 653.527 | 0.000 | 96.291 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 749.818 | 1.000 | 0.023 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f8100000000000312f3 | 741.343 | 686.150 | 0.000 | 55.169 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 741.319 | 1.000 | 0.024 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002c10b | 696.115 | 607.762 | 0.000 | 88.339 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 696.100 | 1.000 | 0.014 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002c783 | 592.281 | 522.010 | 0.000 | 70.249 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 592.259 | 1.000 | 0.022 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002c123 | 582.415 | 499.614 | 0.000 | 82.792 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 582.405 | 1.000 | 0.010 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002c0f5 | 580.487 | 501.773 | 0.000 | 78.702 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 580.475 | 1.000 | 0.012 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002e47b | 580.259 | 499.438 | 0.000 | 80.796 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 580.234 | 1.000 | 0.025 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002c084 | 495.929 | 428.115 | 0.000 | 67.801 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 495.916 | 1.000 | 0.013 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002dfcb | 481.712 | 413.990 | 0.000 | 67.709 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 481.699 | 1.000 | 0.013 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002c12d | 478.396 | 410.556 | 0.000 | 67.801 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.039 | 478.357 | 1.000 | 0.039 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002c6cc | 459.664 | 411.921 | 0.000 | 47.734 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 459.655 | 1.000 | 0.009 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002cbe6 | 457.811 | 397.680 | 0.000 | 60.120 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 457.801 | 1.000 | 0.010 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002e3c8 | 457.285 | 394.475 | 0.000 | 62.795 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 457.271 | 1.000 | 0.015 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002c150 | 454.803 | 392.727 | 0.000 | 62.065 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 454.792 | 1.000 | 0.011 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000001a630 | 440.225 | 423.146 | 0.000 | 17.067 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 440.212 | 1.000 | 0.012 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002e46e | 439.898 | 374.420 | 0.000 | 65.444 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 439.865 | 1.000 | 0.033 | node-14/thread-0/driver.ryow-capture | none observed |
| faa81eac2aa82f81000000000002e460 | 423.670 | 363.136 | 0.000 | 60.523 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 423.659 | 1.000 | 0.010 | node-14/thread-0/driver.ryow-capture | none observed |

## P2 / L4 / commit (1711 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.855 | 4.000 | 0.000 | 0.000 | 0.772 | 0.802 | 1.147 | 0.034 | 0.000 | 0.010 | 11.650 | n/a | n/a | 0.014 | 5.869 | 0.279 | 0.014 |
| p99 | 151.984 | 97.940 | 0.000 | 10.809 | 80.319 | 18.201 | 9.440 | 6.812 | 19.575 | 0.078 | 76.183 | n/a | n/a | 0.053 | 123.136 | 1.000 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f81000000000000ad41 | 223.446 | 2.777 | 0.000 | 7.899 | 169.418 | 16.440 | 0.231 | 0.000 | 0.000 | 0.000 | 26.672 | n/a | n/a | 0.009 | 180.094 | 0.806 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000ac89 | 192.682 | 74.698 | 0.000 | 4.924 | 113.048 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 192.671 | 1.000 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000abae | 191.072 | 8.425 | 0.000 | 4.924 | 0.537 | 39.299 | 3.640 | 3.845 | 0.000 | 0.208 | 130.167 | n/a | n/a | 0.028 | 13.885 | 0.073 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000005cb5 | 183.709 | 4.530 | 0.000 | 3.448 | 90.403 | 13.854 | 1.609 | 0.070 | 51.129 | 0.018 | 18.628 | n/a | n/a | 0.020 | 98.382 | 0.536 | 0.020 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000abef | 177.973 | 170.072 | 0.000 | 4.924 | 2.968 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 177.964 | 1.000 | 0.009 | node-14/thread-0/client.persist-and-resolve | none observed |
| faa81eac2aa82f810000000000005d1d | 177.040 | 2.916 | 0.000 | 3.448 | 144.843 | 0.786 | 1.569 | 0.061 | 16.156 | 0.015 | 7.239 | n/a | n/a | 0.007 | 151.207 | 0.854 | 0.007 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000ac01 | 173.303 | 16.676 | 0.000 | 4.924 | 0.698 | 1.636 | 2.703 | 0.030 | 0.000 | 0.011 | 146.598 | n/a | n/a | 0.027 | 22.298 | 0.129 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000000abe9 | 172.545 | 4.587 | 0.000 | 4.924 | 4.508 | 1.763 | 1.204 | 0.036 | 0.000 | 0.008 | 155.497 | n/a | n/a | 0.017 | 14.019 | 0.081 | 0.017 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000000abe4 | 171.852 | 166.889 | 0.000 | 4.924 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 171.838 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000005c49 | 168.694 | 10.499 | 0.000 | 0.000 | 44.266 | 0.948 | 2.148 | 0.033 | 61.128 | 0.014 | 49.623 | n/a | n/a | 0.035 | 54.765 | 0.325 | 0.035 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| faa81eac2aa82f81000000000000ab9c | 165.113 | 162.657 | 0.000 | 2.037 | 0.405 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 165.099 | 1.000 | 0.014 | node-14/thread-0/client.persist-and-resolve | none observed |
| faa81eac2aa82f810000000000005cf5 | 164.779 | 3.501 | 0.000 | 3.448 | 129.191 | 0.743 | 1.639 | 0.029 | 16.539 | 0.005 | 9.676 | n/a | n/a | 0.008 | 136.140 | 0.826 | 0.008 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000c438 | 163.789 | 121.929 | 0.000 | 10.727 | 31.125 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 163.781 | 1.000 | 0.008 | node-14/thread-0/client.persist-and-resolve | none observed |
| faa81eac2aa82f81000000000000b2f6 | 163.372 | 2.086 | 0.000 | 1.874 | 129.099 | 0.594 | 1.116 | 0.847 | 0.000 | 0.012 | 27.737 | n/a | n/a | 0.009 | 133.058 | 0.814 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000c43e | 158.663 | 126.634 | 0.000 | 7.896 | 24.115 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 158.646 | 1.000 | 0.018 | node-14/thread-0/client.persist-and-resolve | none observed |
| faa81eac2aa82f81000000000000c432 | 154.869 | 107.810 | 0.000 | 10.809 | 36.243 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 154.862 | 1.000 | 0.007 | node-14/thread-0/client.persist-and-resolve | none observed |
| faa81eac2aa82f8100000000000047a4 | 152.620 | 6.976 | 0.000 | 2.317 | 113.843 | 0.892 | 1.238 | 0.029 | 0.469 | 0.012 | 26.827 | n/a | n/a | 0.016 | 123.136 | 0.807 | 0.016 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000c42c | 151.984 | 104.447 | 0.000 | 10.809 | 36.710 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 151.966 | 1.000 | 0.018 | node-14/thread-0/client.persist-and-resolve | none observed |
| faa81eac2aa82f81000000000000abd8 | 151.800 | 4.073 | 0.000 | 4.924 | 0.208 | 3.357 | 1.898 | 0.067 | 0.000 | 0.013 | 137.241 | n/a | n/a | 0.019 | 9.205 | 0.061 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000000c426 | 151.582 | 101.963 | 0.000 | 10.809 | 38.798 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 151.570 | 1.000 | 0.012 | node-14/thread-0/client.persist-and-resolve | none observed |

## P2 / L16 / commit (1767 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.508 | 3.979 | 0.000 | 0.000 | 0.798 | 0.697 | 1.148 | 0.033 | 0.000 | 0.007 | 10.658 | n/a | n/a | 0.014 | 6.165 | 0.292 | 0.014 |
| p99 | 266.242 | 108.435 | 0.000 | 35.496 | 159.204 | 59.739 | 12.134 | 8.727 | 37.403 | 0.070 | 85.429 | n/a | n/a | 0.054 | 205.417 | 1.000 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f81000000000000e058 | 534.885 | 9.953 | 0.000 | 26.265 | 99.782 | 184.951 | 29.576 | 114.488 | 37.403 | 0.032 | 32.422 | n/a | n/a | 0.014 | 135.999 | 0.254 | 0.014 | node-14/thread-0/socket.wait-first-byte | none observed |
| faa81eac2aa82f81000000000000dfbc | 497.430 | 5.338 | 0.000 | 26.265 | 0.051 | 178.368 | 26.162 | 162.764 | 37.403 | 0.037 | 61.036 | n/a | n/a | 0.006 | 31.654 | 0.064 | 0.006 | node-14/thread-0/socket.wait-first-byte | none observed |
| faa81eac2aa82f81000000000000fe76 | 364.824 | 29.740 | 0.000 | 35.496 | 150.514 | 54.594 | 11.721 | 9.811 | 11.875 | 0.071 | 60.993 | n/a | n/a | 0.010 | 215.750 | 0.591 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000e30b | 335.395 | 10.409 | 0.000 | 47.084 | 255.702 | 13.641 | 1.448 | 0.047 | 0.000 | 0.008 | 7.048 | n/a | n/a | 0.008 | 313.196 | 0.934 | 0.008 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000fafd | 327.378 | 6.706 | 0.000 | 15.202 | 211.670 | 58.653 | 1.520 | 0.034 | 0.000 | 0.010 | 33.568 | n/a | n/a | 0.016 | 233.578 | 0.713 | 0.016 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000e36f | 326.832 | 4.647 | 0.000 | 47.084 | 236.119 | 0.616 | 1.529 | 1.268 | 0.000 | 0.005 | 35.555 | n/a | n/a | 0.008 | 287.851 | 0.881 | 0.008 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000defd | 315.568 | 4.656 | 0.000 | 5.955 | 228.974 | 0.709 | 2.155 | 0.030 | 0.000 | 0.010 | 73.064 | n/a | n/a | 0.015 | 239.585 | 0.759 | 0.015 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000f96e | 310.775 | 12.657 | 0.000 | 6.926 | 5.349 | 46.448 | 13.673 | 0.069 | 0.000 | 0.007 | 225.626 | n/a | n/a | 0.021 | 24.933 | 0.080 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001631d | 309.044 | 4.914 | 0.000 | 69.319 | 1.015 | 220.596 | 1.657 | 10.796 | 0.000 | 0.027 | 0.699 | n/a | n/a | 0.021 | 75.248 | 0.243 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| faa81eac2aa82f81000000000000e2d1 | 303.489 | 6.097 | 0.000 | 47.084 | 237.299 | 8.965 | 0.453 | 0.000 | 0.000 | 0.007 | 3.575 | n/a | n/a | 0.009 | 290.480 | 0.957 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000e3cf | 292.723 | 2.364 | 0.000 | 41.153 | 230.370 | 0.430 | 1.154 | 0.051 | 0.000 | 0.011 | 17.181 | n/a | n/a | 0.009 | 273.886 | 0.936 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000f97a | 291.678 | 284.714 | 0.000 | 6.926 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 291.660 | 1.000 | 0.018 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000000df53 | 291.343 | 7.177 | 0.000 | 2.963 | 142.343 | 2.742 | 3.336 | 0.049 | 37.403 | 0.007 | 95.317 | n/a | n/a | 0.007 | 152.482 | 0.523 | 0.007 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f8100000000000163c2 | 279.746 | 5.706 | 0.000 | 58.802 | 130.906 | 83.493 | 0.813 | 0.016 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.007 | 195.413 | 0.699 | 0.007 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000fa9d | 272.433 | 7.396 | 0.000 | 9.321 | 229.499 | 1.625 | 4.479 | 0.052 | 0.000 | 0.019 | 20.018 | n/a | n/a | 0.023 | 246.217 | 0.904 | 0.023 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000f962 | 271.682 | 142.502 | 0.000 | 0.000 | 1.221 | 4.874 | 4.702 | 0.261 | 0.000 | 0.029 | 117.980 | n/a | n/a | 0.115 | 143.723 | 0.529 | 0.115 | node-14/thread-0/driver.publication | none observed |
| faa81eac2aa82f81000000000000fd27 | 268.999 | 6.742 | 0.000 | 14.789 | 121.281 | 26.640 | 16.428 | 4.398 | 48.270 | 0.022 | 30.412 | n/a | n/a | 0.017 | 142.812 | 0.531 | 0.017 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000e12c | 266.242 | 8.214 | 0.000 | 18.872 | 0.850 | 173.406 | 2.299 | 38.922 | 0.000 | 0.027 | 23.639 | n/a | n/a | 0.013 | 27.936 | 0.105 | 0.013 | node-14/thread-0/socket.wait-first-byte | none observed |
| faa81eac2aa82f81000000000000fdab | 263.312 | 9.724 | 0.000 | 14.789 | 162.871 | 0.690 | 1.199 | 0.048 | 48.270 | 0.009 | 25.695 | n/a | n/a | 0.017 | 187.384 | 0.712 | 0.017 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000000ff7b | 248.542 | 3.127 | 0.000 | 23.844 | 198.503 | 0.416 | 1.102 | 0.035 | 10.247 | 0.008 | 11.240 | n/a | n/a | 0.019 | 225.474 | 0.907 | 0.019 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |

## P2 / L64 / commit (95 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.846 | 10.593 | 0.000 | 0.000 | 0.069 | 0.403 | 0.441 | 0.000 | 0.000 | 0.000 | 5.902 | n/a | n/a | 0.020 | 11.779 | 0.487 | 0.020 |
| p99 | 617.879 | 613.716 | 0.000 | 32.135 | 1.439 | 2.273 | 4.171 | 1.832 | 49.642 | 0.027 | 102.527 | n/a | n/a | 4.140 | 613.739 | 1.000 | 4.140 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f810000000000016d2f | 617.879 | 613.716 | 0.000 | 0.000 | 0.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 4.140 | 613.739 | 0.993 | 4.140 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000016fb4 | 142.954 | 5.822 | 0.000 | 32.135 | 1.439 | 0.578 | 0.429 | 0.000 | 0.000 | 0.000 | 102.527 | n/a | n/a | 0.025 | 39.396 | 0.276 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000016d3e | 104.628 | 104.505 | 0.000 | 0.000 | 0.101 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 104.606 | 1.000 | 0.021 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000016984 | 88.763 | 88.706 | 0.000 | 0.000 | 0.038 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 88.744 | 1.000 | 0.019 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000016a02 | 76.975 | 5.332 | 0.000 | 0.000 | 0.499 | 0.771 | 4.171 | 0.039 | 49.642 | 0.010 | 16.488 | n/a | n/a | 0.024 | 5.831 | 0.076 | 0.024 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| faa81eac2aa82f810000000000016af6 | 59.656 | 59.614 | 0.000 | 0.000 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 59.631 | 1.000 | 0.025 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000016e6e | 54.275 | 54.229 | 0.000 | 0.000 | 0.028 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 54.257 | 1.000 | 0.019 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000016e75 | 49.505 | 10.111 | 0.000 | 0.000 | 0.746 | 0.403 | 4.117 | 0.088 | 0.000 | 0.010 | 34.009 | n/a | n/a | 0.021 | 10.857 | 0.219 | 0.021 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000016f20 | 47.364 | 47.290 | 0.000 | 0.000 | 0.054 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 47.344 | 1.000 | 0.020 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000016997 | 43.594 | 43.528 | 0.000 | 0.000 | 0.036 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 43.564 | 0.999 | 0.030 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000016a71 | 43.510 | 43.466 | 0.000 | 0.000 | 0.024 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 43.490 | 1.000 | 0.020 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000169f7 | 43.259 | 43.224 | 0.000 | 0.000 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 43.244 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000016d4d | 43.003 | 42.956 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 42.981 | 0.999 | 0.022 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000016efa | 42.612 | 10.593 | 0.000 | 0.000 | 0.470 | 0.887 | 2.444 | 0.031 | 0.000 | 0.010 | 28.149 | n/a | n/a | 0.029 | 11.063 | 0.260 | 0.029 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000016dff | 41.550 | 41.496 | 0.000 | 0.000 | 0.032 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 41.528 | 0.999 | 0.022 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000016c67 | 40.353 | 40.309 | 0.000 | 0.000 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 40.330 | 0.999 | 0.023 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000169bc | 39.565 | 39.499 | 0.000 | 0.000 | 0.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 39.541 | 0.999 | 0.024 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000016fad | 39.327 | 39.293 | 0.000 | 0.000 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 39.312 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000016b56 | 38.585 | 38.484 | 0.000 | 0.000 | 0.037 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.063 | 38.521 | 0.998 | 0.063 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000016e93 | 37.558 | 37.521 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 37.540 | 1.000 | 0.018 | node-14/thread-0/driver.execute | none observed |

## P2 / L256 / commit (97 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.394 | 7.987 | 0.000 | 0.000 | 0.125 | 0.393 | 0.811 | 0.025 | 0.000 | 0.005 | 5.279 | n/a | n/a | 0.019 | 10.869 | 0.474 | 0.019 |
| p99 | 223.454 | 221.184 | 0.000 | 2.865 | 1.664 | 2.525 | 6.773 | 0.177 | 0.000 | 0.224 | 168.079 | n/a | n/a | 0.927 | 223.438 | 1.000 | 0.927 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f810000000000017738 | 223.454 | 221.184 | 0.000 | 2.217 | 0.037 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 223.438 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001773d | 176.069 | 4.105 | 0.000 | 2.217 | 0.657 | 0.696 | 0.298 | 0.000 | 0.000 | 0.000 | 168.079 | n/a | n/a | 0.018 | 6.979 | 0.040 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f8100000000000170be | 124.453 | 3.742 | 0.000 | 0.000 | 0.351 | 0.607 | 1.683 | 0.058 | 0.000 | 0.010 | 117.975 | n/a | n/a | 0.028 | 4.093 | 0.033 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001718a | 89.381 | 86.767 | 0.000 | 2.560 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 89.347 | 1.000 | 0.034 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017170 | 73.375 | 3.532 | 0.000 | 0.000 | 0.808 | 0.564 | 3.539 | 0.045 | 0.000 | 0.030 | 64.838 | n/a | n/a | 0.018 | 4.339 | 0.059 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000017713 | 72.184 | 72.127 | 0.000 | 0.000 | 0.041 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 72.167 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000172bd | 59.906 | 59.849 | 0.000 | 0.000 | 0.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 59.888 | 1.000 | 0.018 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017718 | 57.840 | 10.469 | 0.000 | 0.000 | 1.544 | 0.638 | 1.980 | 0.177 | 0.000 | 0.010 | 42.994 | n/a | n/a | 0.028 | 12.013 | 0.208 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001731d | 48.166 | 4.106 | 0.000 | 0.000 | 1.007 | 0.669 | 1.130 | 0.054 | 0.000 | 0.010 | 41.173 | n/a | n/a | 0.018 | 5.114 | 0.106 | 0.018 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000017789 | 44.122 | 44.080 | 0.000 | 0.000 | 0.028 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 44.108 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000176ba | 40.836 | 40.803 | 0.000 | 0.000 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 40.821 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017453 | 36.749 | 36.678 | 0.000 | 0.000 | 0.041 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 36.719 | 0.999 | 0.030 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017505 | 36.604 | 36.470 | 0.000 | 0.000 | 0.109 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 36.579 | 0.999 | 0.025 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001711b | 35.393 | 7.419 | 0.000 | 0.000 | 0.561 | 0.750 | 2.822 | 0.047 | 0.000 | 0.006 | 23.760 | n/a | n/a | 0.028 | 7.980 | 0.225 | 0.028 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001754f | 34.120 | 34.084 | 0.000 | 0.000 | 0.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 34.101 | 0.999 | 0.019 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001763c | 33.484 | 33.341 | 0.000 | 0.000 | 0.100 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.043 | 33.441 | 0.999 | 0.043 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000176df | 33.231 | 33.202 | 0.000 | 0.000 | 0.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 33.219 | 1.000 | 0.013 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017514 | 32.967 | 32.913 | 0.000 | 0.000 | 0.028 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 32.941 | 0.999 | 0.026 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017333 | 32.672 | 32.626 | 0.000 | 0.000 | 0.028 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 32.654 | 0.999 | 0.018 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000171c9 | 31.242 | 31.193 | 0.000 | 0.000 | 0.024 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 31.217 | 0.999 | 0.025 | node-14/thread-0/driver.execute | none observed |

## P2 / L1024 / commit (94 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.949 | 8.772 | 0.000 | 0.000 | 0.064 | 0.383 | 0.483 | 0.000 | 0.000 | 0.000 | 4.403 | n/a | n/a | 0.019 | 10.782 | 0.479 | 0.019 |
| p99 | 121.046 | 120.047 | 0.000 | 6.147 | 1.103 | 2.136 | 8.878 | 0.133 | 0.000 | 0.040 | 27.637 | n/a | n/a | 0.219 | 120.827 | 1.000 | 0.219 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f810000000000017bad | 121.046 | 120.047 | 0.000 | 0.000 | 0.780 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.219 | 120.827 | 0.998 | 0.219 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017b3e | 48.858 | 48.824 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 48.844 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001793f | 46.107 | 46.079 | 0.000 | 0.000 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 46.094 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001784b | 45.917 | 45.821 | 0.000 | 0.000 | 0.052 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.044 | 45.874 | 0.999 | 0.044 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017e38 | 45.364 | 45.273 | 0.000 | 0.000 | 0.070 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 45.343 | 1.000 | 0.021 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000177df | 42.597 | 42.565 | 0.000 | 0.000 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 42.584 | 1.000 | 0.013 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017bbc | 40.868 | 40.823 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 40.849 | 1.000 | 0.019 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017866 | 39.090 | 39.056 | 0.000 | 0.000 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 39.071 | 1.000 | 0.019 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001780f | 38.054 | 8.272 | 0.000 | 0.000 | 0.229 | 0.621 | 8.878 | 0.031 | 0.000 | 0.010 | 19.983 | n/a | n/a | 0.029 | 8.501 | 0.223 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000017ea0 | 36.586 | 36.404 | 0.000 | 0.000 | 0.101 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.081 | 36.505 | 0.998 | 0.081 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000177e6 | 34.453 | 4.123 | 0.000 | 0.000 | 1.034 | 0.538 | 1.058 | 0.033 | 0.000 | 0.006 | 27.637 | n/a | n/a | 0.024 | 5.157 | 0.150 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000017804 | 33.368 | 33.295 | 0.000 | 0.000 | 0.058 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 33.353 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000177a7 | 31.678 | 31.638 | 0.000 | 0.000 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 31.655 | 0.999 | 0.023 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017b8f | 31.386 | 5.743 | 0.000 | 0.000 | 0.054 | 0.684 | 2.907 | 0.133 | 0.000 | 0.010 | 21.835 | n/a | n/a | 0.019 | 5.797 | 0.185 | 0.019 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000017eaf | 31.225 | 31.171 | 0.000 | 0.000 | 0.027 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 31.198 | 0.999 | 0.028 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017829 | 31.100 | 4.836 | 0.000 | 0.000 | 0.740 | 0.657 | 2.341 | 0.033 | 0.000 | 0.009 | 22.463 | n/a | n/a | 0.021 | 5.576 | 0.179 | 0.021 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000017904 | 31.094 | 31.054 | 0.000 | 0.000 | 0.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 31.076 | 0.999 | 0.019 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017bef | 29.021 | 3.432 | 0.000 | 0.000 | 0.249 | 0.655 | 0.882 | 0.031 | 0.000 | 0.007 | 23.745 | n/a | n/a | 0.021 | 3.681 | 0.127 | 0.021 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000017964 | 28.980 | 28.941 | 0.000 | 0.000 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 28.959 | 0.999 | 0.021 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017d4b | 28.907 | 14.386 | 0.000 | 0.000 | 1.058 | 0.647 | 1.303 | 0.028 | 0.000 | 0.006 | 11.457 | n/a | n/a | 0.022 | 15.444 | 0.534 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (142 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.302 | 6.932 | 0.000 | 0.000 | 0.145 | 0.459 | 0.756 | 0.024 | 0.000 | 0.005 | 5.204 | n/a | n/a | 0.018 | 8.764 | 0.411 | 0.018 |
| p99 | 127.099 | 64.030 | 0.000 | 3.306 | 1.035 | 2.347 | 5.881 | 0.124 | 0.000 | 0.039 | 58.084 | n/a | n/a | 0.037 | 64.065 | 1.000 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f810000000000018115 | 132.244 | 132.202 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 132.228 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000018024 | 127.099 | 47.304 | 0.000 | 0.000 | 0.518 | 2.347 | 4.401 | 0.057 | 0.000 | 0.014 | 72.421 | n/a | n/a | 0.037 | 47.823 | 0.376 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000018642 | 65.697 | 5.516 | 0.000 | 0.000 | 0.484 | 0.751 | 0.816 | 0.027 | 0.000 | 0.006 | 58.084 | n/a | n/a | 0.012 | 6.000 | 0.091 | 0.012 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000018259 | 64.090 | 64.030 | 0.000 | 0.000 | 0.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 64.065 | 1.000 | 0.025 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001876a | 54.902 | 54.849 | 0.000 | 0.000 | 0.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 54.880 | 1.000 | 0.021 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000187e8 | 51.526 | 51.487 | 0.000 | 0.000 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 51.507 | 1.000 | 0.019 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001858a | 48.475 | 48.439 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 48.458 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001803a | 47.516 | 24.912 | 0.000 | 0.000 | 0.450 | 1.032 | 1.908 | 0.060 | 0.000 | 0.011 | 19.107 | n/a | n/a | 0.036 | 25.362 | 0.534 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000018908 | 44.057 | 44.033 | 0.000 | 0.000 | 0.010 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 44.044 | 1.000 | 0.013 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017f34 | 42.680 | 6.896 | 0.000 | 0.000 | 0.380 | 0.606 | 1.732 | 0.109 | 10.450 | 0.005 | 22.483 | n/a | n/a | 0.018 | 7.277 | 0.170 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f8100000000000189b2 | 35.609 | 35.432 | 0.000 | 0.000 | 0.145 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 35.577 | 0.999 | 0.032 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017f08 | 34.323 | 34.265 | 0.000 | 0.000 | 0.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 34.300 | 0.999 | 0.023 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017ef9 | 32.601 | 32.562 | 0.000 | 0.000 | 0.024 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 32.585 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000018372 | 32.559 | 30.575 | 0.000 | 1.935 | 0.027 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 32.537 | 0.999 | 0.022 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017fb9 | 32.289 | 32.228 | 0.000 | 0.000 | 0.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 32.266 | 0.999 | 0.022 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000184c2 | 30.957 | 30.918 | 0.000 | 0.000 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 30.936 | 0.999 | 0.021 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000017f4a | 30.199 | 7.908 | 0.000 | 0.000 | 0.096 | 1.044 | 3.949 | 0.070 | 0.000 | 0.017 | 17.091 | n/a | n/a | 0.025 | 8.005 | 0.265 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000018540 | 30.035 | 29.975 | 0.000 | 0.000 | 0.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 30.016 | 0.999 | 0.019 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001886d | 29.336 | 29.292 | 0.000 | 0.000 | 0.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 29.315 | 0.999 | 0.022 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000018007 | 28.861 | 28.816 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 28.842 | 0.999 | 0.019 | node-14/thread-0/driver.execute | none observed |

## P4 / p4mix / commit (103 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.650 | 6.582 | 0.000 | 0.000 | 0.143 | 0.465 | 0.782 | 0.023 | 0.000 | 0.005 | 5.565 | n/a | n/a | 0.019 | 7.873 | 0.401 | 0.019 |
| p99 | 84.679 | 84.656 | 0.000 | 1.906 | 1.045 | 1.701 | 5.730 | 0.093 | 0.000 | 0.027 | 18.051 | n/a | n/a | 0.041 | 84.667 | 1.000 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f810000000000018b00 | 103.464 | 103.428 | 0.000 | 0.000 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 103.446 | 1.000 | 0.018 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019039 | 84.679 | 84.656 | 0.000 | 0.000 | 0.011 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 84.667 | 1.000 | 0.011 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000018a56 | 51.679 | 51.646 | 0.000 | 0.000 | 0.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 51.662 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000018ef4 | 51.504 | 51.473 | 0.000 | 0.000 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 51.490 | 1.000 | 0.013 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000191d7 | 44.166 | 44.135 | 0.000 | 0.000 | 0.014 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 44.148 | 1.000 | 0.018 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000018e76 | 38.915 | 38.878 | 0.000 | 0.000 | 0.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 38.894 | 0.999 | 0.021 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000018f19 | 35.642 | 35.579 | 0.000 | 0.000 | 0.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 35.620 | 0.999 | 0.022 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000018e3b | 35.342 | 35.278 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 35.303 | 0.999 | 0.038 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000018cb4 | 33.183 | 11.322 | 0.000 | 0.000 | 0.972 | 0.803 | 2.068 | 0.025 | 0.000 | 0.010 | 17.960 | n/a | n/a | 0.022 | 12.294 | 0.370 | 0.022 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000018a38 | 32.268 | 32.236 | 0.000 | 0.000 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 32.254 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000018ffe | 30.948 | 30.895 | 0.000 | 0.000 | 0.029 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 30.923 | 0.999 | 0.024 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019040 | 30.256 | 7.751 | 0.000 | 0.000 | 0.388 | 0.735 | 2.593 | 0.068 | 0.000 | 0.008 | 18.672 | n/a | n/a | 0.041 | 8.139 | 0.269 | 0.041 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000018d4f | 30.185 | 30.149 | 0.000 | 0.000 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 30.169 | 0.999 | 0.015 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000190cd | 28.548 | 5.966 | 0.000 | 0.000 | 0.908 | 0.770 | 2.724 | 0.097 | 0.000 | 0.012 | 18.051 | n/a | n/a | 0.021 | 6.873 | 0.241 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000018d14 | 26.844 | 26.783 | 0.000 | 0.000 | 0.044 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 26.827 | 0.999 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000018c3e | 26.704 | 26.672 | 0.000 | 0.000 | 0.014 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 26.686 | 0.999 | 0.018 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000018b3b | 26.613 | 26.578 | 0.000 | 0.000 | 0.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 26.594 | 0.999 | 0.019 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000018fad | 26.536 | 26.504 | 0.000 | 0.000 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 26.519 | 0.999 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000018cc0 | 26.248 | 26.227 | 0.000 | 0.000 | 0.012 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 26.239 | 1.000 | 0.009 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000018af1 | 25.965 | 25.937 | 0.000 | 0.000 | 0.012 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 25.949 | 0.999 | 0.016 | node-14/thread-0/driver.execute | none observed |

## P2 / outside-phases / commit (15 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.760 | 7.388 | 0.000 | 0.000 | 0.243 | 0.104 | 0.430 | 0.022 | 0.000 | 0.000 | 5.449 | n/a | n/a | 0.019 | 9.646 | 0.494 | 0.019 |
| p99 | 34.843 | 34.806 | 0.000 | 1.910 | 1.113 | 3.237 | 2.344 | 0.069 | 0.000 | 0.038 | 23.781 | n/a | n/a | 0.077 | 34.827 | 1.000 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f81000000000001a9f6 | 34.843 | 34.806 | 0.000 | 0.000 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 34.827 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001922c | 34.633 | 34.593 | 0.000 | 0.000 | 0.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 34.616 | 0.999 | 0.018 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019c53 | 32.873 | 6.109 | 0.000 | 0.000 | 0.415 | 0.751 | 1.716 | 0.031 | 0.000 | 0.038 | 23.781 | n/a | n/a | 0.033 | 6.524 | 0.198 | 0.033 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000019c7f | 30.729 | 7.161 | 0.000 | 0.000 | 0.329 | 0.104 | 2.344 | 0.026 | 0.000 | 0.007 | 20.681 | n/a | n/a | 0.077 | 7.490 | 0.244 | 0.077 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001a9d1 | 29.798 | 29.763 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 29.782 | 0.999 | 0.016 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019c44 | 26.376 | 26.336 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 26.356 | 0.999 | 0.020 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019c95 | 25.835 | 4.058 | 0.000 | 0.000 | 1.113 | 3.237 | 0.988 | 0.028 | 0.000 | 0.006 | 16.384 | n/a | n/a | 0.021 | 5.171 | 0.200 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000019cc1 | 22.760 | 22.727 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 22.747 | 0.999 | 0.014 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001923b | 22.593 | 22.539 | 0.000 | 0.000 | 0.036 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 22.575 | 0.999 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019200 | 19.530 | 7.388 | 0.000 | 1.910 | 0.348 | 1.114 | 0.430 | 0.033 | 0.000 | 0.000 | 8.290 | n/a | n/a | 0.018 | 9.646 | 0.494 | 0.018 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000019c69 | 19.026 | 2.971 | 0.000 | 0.000 | 0.243 | 0.474 | 0.934 | 0.022 | 0.000 | 0.005 | 14.358 | n/a | n/a | 0.019 | 3.214 | 0.169 | 0.019 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000019cab | 18.305 | 2.908 | 0.000 | 0.000 | 0.876 | 0.434 | 1.021 | 0.024 | 0.000 | 0.006 | 13.016 | n/a | n/a | 0.020 | 3.784 | 0.207 | 0.020 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001a9c2 | 17.937 | 17.901 | 0.000 | 0.000 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 17.918 | 0.999 | 0.019 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a9e0 | 17.551 | 3.870 | 0.000 | 0.000 | 0.566 | 0.774 | 1.308 | 0.037 | 0.000 | 0.008 | 10.966 | n/a | n/a | 0.021 | 4.437 | 0.253 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000019216 | 12.553 | 4.493 | 0.000 | 0.000 | 0.314 | 0.667 | 1.510 | 0.069 | 0.000 | 0.028 | 5.449 | n/a | n/a | 0.021 | 4.808 | 0.383 | 0.021 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (94 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.898 | 7.247 | 0.000 | 0.000 | 0.068 | 0.397 | 0.317 | 0.000 | 0.000 | 0.000 | 4.303 | n/a | n/a | 0.018 | 8.072 | 0.433 | 0.018 |
| p99 | 67.457 | 53.296 | 0.000 | 2.151 | 1.345 | 2.943 | 10.925 | 0.077 | 49.035 | 3.795 | 57.201 | n/a | n/a | 0.037 | 53.337 | 1.000 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f810000000000019430 | 67.457 | 3.428 | 0.000 | 0.000 | 0.055 | 0.511 | 0.924 | 0.027 | 49.035 | 0.007 | 13.452 | n/a | n/a | 0.019 | 3.483 | 0.052 | 0.019 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| faa81eac2aa82f810000000000019446 | 63.161 | 3.997 | 0.000 | 0.000 | 0.180 | 0.737 | 0.992 | 0.028 | 0.000 | 0.008 | 57.201 | n/a | n/a | 0.017 | 4.177 | 0.066 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000019394 | 53.358 | 53.296 | 0.000 | 0.000 | 0.041 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 53.337 | 1.000 | 0.021 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019360 | 39.383 | 39.337 | 0.000 | 0.000 | 0.030 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 39.366 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001924e | 38.043 | 4.223 | 0.000 | 0.000 | 0.171 | 0.414 | 10.925 | 0.024 | 0.000 | 0.005 | 22.267 | n/a | n/a | 0.014 | 4.394 | 0.116 | 0.014 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000019264 | 37.869 | 37.823 | 0.000 | 0.000 | 0.024 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 37.847 | 0.999 | 0.022 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019574 | 36.148 | 36.113 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 36.131 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001985f | 33.198 | 4.100 | 0.000 | 0.000 | 0.417 | 0.522 | 1.931 | 0.038 | 10.735 | 0.009 | 15.430 | n/a | n/a | 0.017 | 4.517 | 0.136 | 0.017 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f8100000000000193a3 | 32.053 | 8.831 | 0.000 | 0.000 | 0.321 | 0.737 | 1.848 | 0.031 | 0.000 | 0.007 | 20.251 | n/a | n/a | 0.027 | 9.151 | 0.286 | 0.027 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f8100000000000192ae | 29.987 | 29.950 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 29.969 | 0.999 | 0.018 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000193b9 | 29.811 | 29.778 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 29.797 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000193de | 29.578 | 29.528 | 0.000 | 0.000 | 0.028 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 29.556 | 0.999 | 0.021 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000193ed | 29.165 | 29.122 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 29.147 | 0.999 | 0.018 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019815 | 28.676 | 28.641 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 28.660 | 0.999 | 0.016 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000196c8 | 28.585 | 28.530 | 0.000 | 0.000 | 0.037 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 28.567 | 0.999 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019273 | 28.545 | 5.851 | 0.000 | 0.000 | 0.074 | 0.771 | 6.893 | 0.038 | 0.000 | 0.010 | 14.881 | n/a | n/a | 0.028 | 5.925 | 0.208 | 0.028 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001977a | 28.467 | 28.435 | 0.000 | 0.000 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 28.452 | 0.999 | 0.015 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001973f | 28.339 | 28.283 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 28.302 | 0.999 | 0.037 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019599 | 27.796 | 27.767 | 0.000 | 0.000 | 0.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 27.783 | 1.000 | 0.013 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001961e | 27.743 | 27.695 | 0.000 | 0.000 | 0.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 27.726 | 0.999 | 0.017 | node-14/thread-0/driver.execute | none observed |

## P2 / grow3 / commit (23 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 52.825 | 7.611 | 0.000 | 2.129 | 0.193 | 0.353 | 0.189 | 0.000 | 0.000 | 0.000 | 14.844 | n/a | n/a | 0.018 | 10.455 | 0.231 | 0.018 |
| p99 | 204.205 | 178.682 | 0.000 | 5.660 | 13.698 | 21.925 | 2.533 | 0.054 | 19.216 | 0.017 | 183.902 | n/a | n/a | 0.026 | 180.912 | 1.000 | 0.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f810000000000019975 | 204.205 | 3.062 | 0.000 | 2.357 | 0.537 | 12.709 | 1.365 | 0.047 | 0.191 | 0.016 | 183.902 | n/a | n/a | 0.018 | 5.957 | 0.029 | 0.018 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000019a4c | 191.735 | 3.428 | 0.000 | 5.357 | 0.129 | 21.925 | 2.232 | 0.024 | 19.216 | 0.010 | 139.393 | n/a | n/a | 0.022 | 8.914 | 0.046 | 0.022 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000019b3c | 180.926 | 178.682 | 0.000 | 2.212 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 180.912 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019b15 | 178.594 | 175.942 | 0.000 | 2.608 | 0.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 178.572 | 1.000 | 0.022 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f8100000000000199d2 | 166.699 | 164.540 | 0.000 | 2.129 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 166.687 | 1.000 | 0.012 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019a88 | 133.969 | 133.914 | 0.000 | 0.000 | 0.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 133.949 | 1.000 | 0.020 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019b8b | 131.000 | 111.628 | 0.000 | 5.660 | 13.698 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 130.986 | 1.000 | 0.015 | node-14/thread-0/client.persist-and-resolve | none observed |
| faa81eac2aa82f810000000000019b49 | 123.450 | 3.415 | 0.000 | 2.212 | 1.010 | 8.846 | 0.665 | 0.022 | 0.000 | 0.006 | 107.260 | n/a | n/a | 0.015 | 6.637 | 0.054 | 0.015 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f8100000000000199ed | 99.186 | 89.607 | 0.000 | 5.182 | 4.372 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 99.160 | 1.000 | 0.026 | node-14/thread-0/client.persist-and-resolve | none observed |
| faa81eac2aa82f810000000000019b9b | 98.696 | 3.615 | 0.000 | 0.000 | 0.417 | 1.488 | 0.953 | 0.025 | 0.000 | 0.006 | 92.175 | n/a | n/a | 0.018 | 4.031 | 0.041 | 0.018 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000019aee | 71.625 | 71.588 | 0.000 | 0.000 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 71.604 | 1.000 | 0.021 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019ab7 | 52.825 | 52.806 | 0.000 | 0.000 | 0.010 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 52.816 | 1.000 | 0.009 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019bb1 | 51.032 | 51.001 | 0.000 | 0.000 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 51.019 | 1.000 | 0.013 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019a17 | 47.543 | 6.617 | 0.000 | 2.838 | 0.438 | 21.784 | 0.817 | 0.026 | 0.000 | 0.006 | 14.994 | n/a | n/a | 0.023 | 9.893 | 0.208 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| faa81eac2aa82f810000000000019a58 | 45.306 | 1.857 | 0.000 | 5.357 | 0.000 | 3.558 | 2.533 | 0.040 | 9.671 | 0.006 | 22.280 | n/a | n/a | 0.003 | 7.214 | 0.159 | 0.003 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000019c26 | 45.164 | 7.611 | 0.000 | 2.651 | 0.193 | 14.424 | 0.189 | 0.000 | 0.000 | 0.000 | 20.071 | n/a | n/a | 0.025 | 10.455 | 0.231 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000019b69 | 40.955 | 2.925 | 0.000 | 3.300 | 1.118 | 13.479 | 0.662 | 0.022 | 0.000 | 0.006 | 19.421 | n/a | n/a | 0.020 | 7.344 | 0.179 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f8100000000000199a3 | 39.930 | 39.875 | 0.000 | 0.000 | 0.032 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 39.907 | 0.999 | 0.022 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019957 | 38.659 | 1.593 | 0.000 | 0.000 | 0.232 | 0.353 | 1.196 | 0.054 | 15.421 | 0.017 | 19.786 | n/a | n/a | 0.007 | 1.825 | 0.047 | 0.007 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000019bd2 | 30.216 | 3.321 | 0.000 | 0.000 | 0.393 | 0.427 | 0.695 | 0.019 | 0.000 | 0.004 | 25.332 | n/a | n/a | 0.025 | 3.714 | 0.123 | 0.025 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (98 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.850 | 7.371 | 0.000 | 0.000 | 0.226 | 0.438 | 0.653 | 0.022 | 0.000 | 0.005 | 6.147 | n/a | n/a | 0.018 | 9.216 | 0.443 | 0.018 |
| p99 | 140.354 | 140.327 | 0.000 | 5.704 | 1.310 | 9.440 | 7.595 | 0.143 | 30.643 | 0.101 | 42.990 | n/a | n/a | 0.045 | 140.341 | 1.000 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f81000000000001a2a2 | 140.354 | 140.327 | 0.000 | 0.000 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 140.341 | 1.000 | 0.013 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a242 | 94.905 | 94.851 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 94.876 | 1.000 | 0.029 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a2ce | 61.024 | 4.866 | 0.000 | 0.000 | 0.588 | 2.645 | 2.178 | 0.064 | 30.643 | 0.013 | 20.009 | n/a | n/a | 0.019 | 5.454 | 0.089 | 0.019 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| faa81eac2aa82f810000000000019cd4 | 50.640 | 3.807 | 0.000 | 0.000 | 0.584 | 0.715 | 2.498 | 0.024 | 0.000 | 0.007 | 42.990 | n/a | n/a | 0.015 | 4.391 | 0.087 | 0.015 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001a247 | 48.279 | 8.604 | 0.000 | 0.000 | 0.546 | 9.440 | 7.557 | 0.143 | 0.000 | 0.101 | 21.865 | n/a | n/a | 0.023 | 9.150 | 0.190 | 0.023 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f810000000000019fbe | 48.183 | 6.256 | 0.000 | 0.000 | 0.028 | 0.750 | 2.439 | 0.063 | 24.056 | 0.016 | 14.550 | n/a | n/a | 0.025 | 6.284 | 0.130 | 0.025 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| faa81eac2aa82f81000000000001a1ae | 47.322 | 15.148 | 0.000 | 0.000 | 0.713 | 1.891 | 2.076 | 0.034 | 0.000 | 0.016 | 27.398 | n/a | n/a | 0.045 | 15.861 | 0.335 | 0.045 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001a27d | 46.070 | 46.015 | 0.000 | 0.000 | 0.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 46.054 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a429 | 40.566 | 40.533 | 0.000 | 0.000 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 40.551 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a20e | 38.507 | 38.477 | 0.000 | 0.000 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 38.494 | 1.000 | 0.013 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019d0f | 36.219 | 36.167 | 0.000 | 0.000 | 0.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 36.190 | 0.999 | 0.028 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a0b2 | 32.064 | 32.015 | 0.000 | 0.000 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 32.035 | 0.999 | 0.030 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a1c4 | 31.838 | 31.799 | 0.000 | 0.000 | 0.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 31.821 | 0.999 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a008 | 31.281 | 31.225 | 0.000 | 0.000 | 0.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 31.264 | 0.999 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019ff9 | 30.934 | 30.901 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 30.919 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019d59 | 30.706 | 6.988 | 0.000 | 0.000 | 0.448 | 0.711 | 0.959 | 0.022 | 0.000 | 0.006 | 21.543 | n/a | n/a | 0.029 | 7.436 | 0.242 | 0.029 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001a07e | 30.676 | 30.641 | 0.000 | 0.000 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 30.661 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a32e | 30.379 | 30.343 | 0.000 | 0.000 | 0.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 30.364 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f810000000000019d4a | 29.154 | 29.121 | 0.000 | 0.000 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 29.141 | 1.000 | 0.013 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a17a | 29.082 | 28.965 | 0.000 | 0.000 | 0.083 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 29.049 | 0.999 | 0.033 | node-14/thread-0/driver.execute | none observed |

## P2 / grow10 / commit (31 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 45.298 | 26.656 | 0.000 | 2.741 | 0.092 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 30.761 | 0.999 | 0.018 |
| p99 | 172.751 | 168.718 | 0.000 | 7.226 | 10.440 | 25.271 | 7.884 | 2.616 | 20.970 | 0.030 | 48.099 | n/a | n/a | 0.327 | 172.736 | 1.000 | 0.327 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f81000000000001a463 | 172.751 | 168.718 | 0.000 | 4.003 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 172.736 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a48a | 164.369 | 161.352 | 0.000 | 2.632 | 0.059 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.327 | 164.042 | 0.998 | 0.327 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a827 | 131.320 | 128.251 | 0.000 | 3.035 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 131.301 | 1.000 | 0.020 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a5fe | 94.389 | 91.654 | 0.000 | 2.689 | 0.029 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 94.372 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a71c | 77.883 | 48.334 | 0.000 | 7.226 | 0.956 | 13.383 | 7.884 | 0.068 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.023 | 56.516 | 0.726 | 0.023 | node-14/thread-0/client.persist-and-resolve | none observed |
| faa81eac2aa82f81000000000001a93c | 77.854 | 73.375 | 0.000 | 4.438 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 77.828 | 1.000 | 0.026 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a6a0 | 75.799 | 3.920 | 0.000 | 4.735 | 0.488 | 17.013 | 1.462 | 0.029 | 0.000 | 0.008 | 48.099 | n/a | n/a | 0.046 | 9.142 | 0.121 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001a8c1 | 74.966 | 72.690 | 0.000 | 2.246 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 74.951 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a7df | 71.357 | 67.408 | 0.000 | 2.569 | 1.366 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 71.342 | 1.000 | 0.014 | node-14/thread-0/client.persist-and-resolve | none observed |
| faa81eac2aa82f81000000000001a83e | 69.188 | 9.017 | 0.000 | 2.752 | 1.176 | 24.687 | 2.497 | 0.064 | 0.000 | 0.014 | 28.961 | n/a | n/a | 0.020 | 12.945 | 0.187 | 0.020 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001a52c | 68.049 | 3.601 | 0.000 | 3.500 | 0.092 | 14.025 | 0.730 | 0.026 | 0.000 | 0.005 | 46.046 | n/a | n/a | 0.023 | 7.193 | 0.106 | 0.023 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001a84a | 62.020 | 6.543 | 0.000 | 2.752 | 0.730 | 25.271 | 1.550 | 2.616 | 0.000 | 0.010 | 22.519 | n/a | n/a | 0.028 | 10.025 | 0.162 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| faa81eac2aa82f81000000000001a585 | 57.934 | 46.524 | 0.000 | 6.741 | 4.656 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 57.922 | 1.000 | 0.012 | node-14/thread-0/client.persist-and-resolve | none observed |
| faa81eac2aa82f81000000000001a681 | 53.644 | 50.510 | 0.000 | 3.103 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 53.631 | 1.000 | 0.013 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a4cf | 52.575 | 52.542 | 0.000 | 0.000 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 52.558 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a61d | 45.298 | 5.110 | 0.000 | 0.000 | 5.993 | 0.776 | 0.827 | 0.028 | 0.000 | 0.002 | 32.549 | n/a | n/a | 0.013 | 11.103 | 0.245 | 0.013 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001a4f6 | 43.827 | 3.458 | 0.000 | 0.000 | 0.130 | 4.053 | 1.285 | 0.034 | 20.970 | 0.009 | 13.862 | n/a | n/a | 0.026 | 3.588 | 0.082 | 0.026 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| faa81eac2aa82f81000000000001a538 | 41.267 | 37.739 | 0.000 | 3.500 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 41.256 | 1.000 | 0.012 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001a8e0 | 41.129 | 4.940 | 0.000 | 2.866 | 0.163 | 1.068 | 4.381 | 0.044 | 0.000 | 0.007 | 27.554 | n/a | n/a | 0.105 | 7.969 | 0.194 | 0.105 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001a7b4 | 40.676 | 40.648 | 0.000 | 0.000 | 0.014 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 40.663 | 1.000 | 0.013 | node-14/thread-0/driver.execute | none observed |

## P4 / p4h10 / commit (88 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.756 | 20.423 | 0.000 | 0.000 | 0.091 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 20.483 | 0.999 | 0.021 |
| p99 | 122.633 | 71.455 | 0.000 | 7.095 | 2.750 | 2.236 | 8.881 | 0.111 | 0.000 | 0.024 | 114.540 | n/a | n/a | 0.073 | 71.475 | 1.000 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f81000000000001afef | 122.633 | 4.392 | 0.000 | 0.000 | 0.722 | 0.473 | 2.433 | 0.032 | 0.000 | 0.013 | 114.540 | n/a | n/a | 0.028 | 5.114 | 0.042 | 0.028 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001ad6a | 78.707 | 36.256 | 0.000 | 7.095 | 0.147 | 0.837 | 8.881 | 0.069 | 0.000 | 0.000 | 25.379 | n/a | n/a | 0.041 | 43.499 | 0.553 | 0.041 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001abdb | 71.491 | 71.455 | 0.000 | 0.000 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 71.475 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001ae5f | 53.269 | 53.134 | 0.000 | 0.000 | 0.114 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 53.247 | 1.000 | 0.021 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001aaab | 50.031 | 49.959 | 0.000 | 0.000 | 0.045 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 50.004 | 0.999 | 0.027 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001aec7 | 46.506 | 46.378 | 0.000 | 0.000 | 0.104 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 46.482 | 0.999 | 0.024 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001ad54 | 42.659 | 42.619 | 0.000 | 0.000 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 42.640 | 1.000 | 0.020 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001ab82 | 42.458 | 42.407 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 42.432 | 0.999 | 0.026 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001acb9 | 41.313 | 12.130 | 0.000 | 0.000 | 1.189 | 2.236 | 2.431 | 0.049 | 0.000 | 0.013 | 23.240 | n/a | n/a | 0.025 | 13.319 | 0.322 | 0.025 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001ac4a | 40.571 | 40.457 | 0.000 | 0.000 | 0.089 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 40.546 | 0.999 | 0.026 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001ad63 | 40.302 | 40.256 | 0.000 | 0.000 | 0.029 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 40.285 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001aaee | 39.129 | 38.936 | 0.000 | 0.000 | 0.161 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 39.097 | 0.999 | 0.032 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001aa9c | 37.838 | 37.801 | 0.000 | 0.000 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 37.822 | 1.000 | 0.016 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b007 | 34.597 | 34.562 | 0.000 | 0.000 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 34.582 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b04f | 33.759 | 33.705 | 0.000 | 0.000 | 0.032 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 33.737 | 0.999 | 0.022 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001aaba | 33.678 | 9.053 | 0.000 | 4.413 | 0.406 | 0.995 | 0.190 | 0.000 | 0.000 | 0.000 | 18.591 | n/a | n/a | 0.030 | 13.872 | 0.412 | 0.030 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001af02 | 33.522 | 33.465 | 0.000 | 0.000 | 0.036 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 33.500 | 0.999 | 0.022 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001ad2f | 33.160 | 33.117 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 33.143 | 0.999 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001aa58 | 33.052 | 30.548 | 0.000 | 0.000 | 2.493 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 33.041 | 1.000 | 0.011 | node-14/thread-0/client.persist-and-resolve | none observed |
| faa81eac2aa82f81000000000001ae6e | 32.653 | 32.576 | 0.000 | 0.000 | 0.053 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 32.629 | 0.999 | 0.023 | node-14/thread-0/driver.execute | none observed |

## P5 / presweep / commit (107 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.926 | 7.968 | 0.000 | 0.000 | 0.201 | 0.479 | 0.878 | 0.025 | 0.000 | 0.006 | 6.306 | n/a | n/a | 0.019 | 9.162 | 0.408 | 0.019 |
| p99 | 65.296 | 51.705 | 0.000 | 3.609 | 1.132 | 1.643 | 7.369 | 0.091 | 0.000 | 0.028 | 23.380 | n/a | n/a | 0.049 | 51.741 | 1.000 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f81000000000001b6a9 | 65.625 | 7.968 | 0.000 | 0.000 | 1.194 | 0.988 | 3.251 | 0.127 | 0.000 | 0.007 | 52.066 | n/a | n/a | 0.024 | 9.162 | 0.140 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001b272 | 65.296 | 65.172 | 0.000 | 0.000 | 0.074 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.049 | 65.247 | 0.999 | 0.049 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b709 | 51.758 | 51.705 | 0.000 | 0.000 | 0.036 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 51.741 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b2d2 | 50.743 | 39.548 | 0.000 | 0.000 | 1.063 | 0.624 | 1.609 | 0.073 | 0.000 | 0.010 | 7.796 | n/a | n/a | 0.021 | 40.611 | 0.800 | 0.021 | node-14/thread-0/client.transact-encode | none observed |
| faa81eac2aa82f81000000000001b6bf | 41.388 | 41.317 | 0.000 | 0.000 | 0.048 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 41.365 | 0.999 | 0.023 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b410 | 39.618 | 36.492 | 0.000 | 3.054 | 0.048 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 39.594 | 0.999 | 0.024 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b2f0 | 36.821 | 36.781 | 0.000 | 0.000 | 0.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 36.803 | 1.000 | 0.018 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b14a | 33.827 | 33.786 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 33.811 | 1.000 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b415 | 33.584 | 8.011 | 0.000 | 0.000 | 0.931 | 1.354 | 1.800 | 0.038 | 0.000 | 0.005 | 21.427 | n/a | n/a | 0.018 | 8.943 | 0.266 | 0.018 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001b6c4 | 33.557 | 7.885 | 0.000 | 0.000 | 0.454 | 0.912 | 0.870 | 0.030 | 0.000 | 0.011 | 23.380 | n/a | n/a | 0.015 | 8.340 | 0.249 | 0.015 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001b83c | 33.390 | 11.847 | 0.000 | 0.000 | 0.346 | 0.570 | 1.869 | 0.030 | 0.000 | 0.012 | 18.692 | n/a | n/a | 0.023 | 12.194 | 0.365 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001b5e9 | 32.790 | 32.738 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 32.758 | 0.999 | 0.033 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b4f5 | 32.300 | 32.260 | 0.000 | 0.000 | 0.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 32.282 | 0.999 | 0.018 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b59f | 31.707 | 31.665 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 31.684 | 0.999 | 0.023 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b7d5 | 31.654 | 31.602 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 31.621 | 0.999 | 0.033 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b3dc | 31.260 | 6.120 | 0.000 | 0.000 | 0.170 | 0.594 | 3.963 | 0.055 | 0.000 | 0.010 | 20.330 | n/a | n/a | 0.018 | 6.289 | 0.201 | 0.018 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001b38b | 31.159 | 31.123 | 0.000 | 0.000 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 31.143 | 1.000 | 0.015 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b72e | 30.829 | 30.783 | 0.000 | 0.000 | 0.030 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 30.813 | 0.999 | 0.016 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b160 | 29.786 | 10.219 | 0.000 | 0.000 | 0.305 | 0.661 | 1.414 | 0.023 | 0.000 | 0.005 | 17.133 | n/a | n/a | 0.026 | 10.524 | 0.353 | 0.026 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001b564 | 29.544 | 9.473 | 0.000 | 0.000 | 0.253 | 0.678 | 1.260 | 0.027 | 0.000 | 0.010 | 17.794 | n/a | n/a | 0.049 | 9.726 | 0.329 | 0.049 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (87 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.801 | 14.567 | 0.000 | 0.000 | 0.070 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 14.584 | 0.998 | 0.020 |
| p99 | 225.743 | 224.391 | 0.000 | 3.433 | 2.703 | 2.216 | 10.658 | 0.080 | 9.784 | 0.027 | 219.345 | n/a | n/a | 0.064 | 224.421 | 1.000 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f81000000000001bb9f | 225.743 | 3.862 | 0.000 | 0.000 | 0.842 | 0.698 | 0.942 | 0.029 | 0.000 | 0.006 | 219.345 | n/a | n/a | 0.020 | 4.705 | 0.021 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001bbab | 224.474 | 224.391 | 0.000 | 0.000 | 0.030 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.052 | 224.421 | 1.000 | 0.052 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001bbb0 | 200.750 | 5.238 | 0.000 | 0.000 | 0.529 | 0.749 | 1.683 | 0.037 | 0.000 | 0.011 | 192.483 | n/a | n/a | 0.020 | 5.768 | 0.029 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001bdab | 85.853 | 85.819 | 0.000 | 0.000 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 85.839 | 1.000 | 0.014 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001bc06 | 60.104 | 60.040 | 0.000 | 0.000 | 0.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 60.080 | 1.000 | 0.025 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001bb5c | 47.313 | 17.417 | 0.000 | 0.000 | 2.703 | 0.842 | 2.021 | 0.034 | 0.000 | 0.010 | 24.265 | n/a | n/a | 0.021 | 20.119 | 0.425 | 0.021 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001be22 | 44.436 | 44.353 | 0.000 | 0.000 | 0.048 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 44.402 | 0.999 | 0.034 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b8a4 | 40.734 | 40.677 | 0.000 | 0.000 | 0.037 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 40.714 | 1.000 | 0.020 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001baee | 40.339 | 40.263 | 0.000 | 0.000 | 0.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 40.305 | 0.999 | 0.033 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001baba | 35.398 | 35.368 | 0.000 | 0.000 | 0.012 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 35.379 | 0.999 | 0.018 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001ba3c | 34.357 | 34.316 | 0.000 | 0.000 | 0.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 34.339 | 0.999 | 0.019 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b8c2 | 34.135 | 34.096 | 0.000 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 34.116 | 0.999 | 0.019 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001bb29 | 31.924 | 4.952 | 0.000 | 0.000 | 0.512 | 2.216 | 10.658 | 0.050 | 9.784 | 0.027 | 3.706 | n/a | n/a | 0.019 | 5.464 | 0.171 | 0.019 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| faa81eac2aa82f81000000000001bdba | 31.474 | 31.400 | 0.000 | 0.000 | 0.050 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 31.450 | 0.999 | 0.024 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001bb55 | 31.342 | 31.298 | 0.000 | 0.000 | 0.028 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 31.325 | 0.999 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b94f | 28.948 | 28.886 | 0.000 | 0.000 | 0.041 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 28.927 | 0.999 | 0.021 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b8d1 | 27.835 | 27.713 | 0.000 | 0.000 | 0.058 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.064 | 27.771 | 0.998 | 0.064 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b87f | 27.766 | 27.725 | 0.000 | 0.000 | 0.024 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 27.749 | 0.999 | 0.017 | node-14/thread-0/driver.execute | none observed |
| faa81eac2aa82f81000000000001b9d4 | 27.090 | 4.528 | 0.000 | 0.000 | 1.116 | 0.652 | 2.154 | 0.027 | 0.000 | 0.006 | 18.583 | n/a | n/a | 0.023 | 5.644 | 0.208 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| faa81eac2aa82f81000000000001bc33 | 27.035 | 26.988 | 0.000 | 0.000 | 0.024 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 27.013 | 0.999 | 0.022 | node-14/thread-0/driver.execute | none observed |

## P2 / tail / commit (3758 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.426 | 4.648 | 0.000 | 0.000 | 0.913 | 0.721 | 1.057 | 0.024 | 0.000 | 0.006 | 9.667 | n/a | n/a | 0.014 | 8.279 | 0.351 | 0.014 |
| p99 | 1231.723 | 207.328 | 0.000 | 130.166 | 1018.204 | 125.947 | 9.520 | 7.440 | 39.740 | 0.054 | 110.492 | n/a | n/a | 0.059 | 1146.766 | 1.000 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| faa81eac2aa82f81000000000002c569 | 1798.167 | 4.751 | 0.000 | 188.441 | 1499.060 | 87.250 | 1.873 | 0.036 | 0.000 | 0.019 | 16.702 | n/a | n/a | 0.035 | 1692.253 | 0.941 | 0.035 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002c613 | 1790.031 | 3.029 | 0.000 | 188.441 | 1574.638 | 11.363 | 1.023 | 0.028 | 0.000 | 0.010 | 11.490 | n/a | n/a | 0.010 | 1766.108 | 0.987 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002c786 | 1774.327 | 10.189 | 0.000 | 218.015 | 1371.548 | 132.803 | 9.077 | 0.020 | 0.000 | 0.007 | 32.655 | n/a | n/a | 0.013 | 1599.752 | 0.902 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002c3ce | 1716.163 | 6.956 | 0.000 | 172.682 | 1301.881 | 70.757 | 3.651 | 22.048 | 0.000 | 0.010 | 138.168 | n/a | n/a | 0.011 | 1481.519 | 0.863 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002c67e | 1635.004 | 3.388 | 0.000 | 188.441 | 1427.411 | 8.230 | 1.694 | 0.022 | 0.000 | 0.012 | 5.799 | n/a | n/a | 0.006 | 1619.241 | 0.990 | 0.006 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002c6cf | 1631.381 | 2.365 | 0.000 | 195.560 | 1422.675 | 8.347 | 1.731 | 0.011 | 0.000 | 0.005 | 0.680 | n/a | n/a | 0.007 | 1620.601 | 0.993 | 0.007 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002cfdc | 1618.425 | 8.184 | 0.000 | 155.656 | 1059.942 | 165.823 | 36.871 | 81.258 | 87.355 | 0.038 | 23.286 | n/a | n/a | 0.011 | 1223.782 | 0.756 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002c7f1 | 1596.841 | 5.791 | 0.000 | 177.056 | 1368.956 | 34.358 | 1.954 | 0.030 | 0.000 | 0.016 | 8.673 | n/a | n/a | 0.008 | 1551.803 | 0.972 | 0.008 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002d1ae | 1594.493 | 3.489 | 0.000 | 151.313 | 1298.608 | 6.550 | 1.638 | 0.048 | 87.355 | 0.017 | 45.463 | n/a | n/a | 0.011 | 1453.411 | 0.912 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002d315 | 1587.701 | 6.730 | 0.000 | 144.385 | 1304.338 | 5.549 | 7.546 | 0.062 | 99.464 | 0.017 | 19.600 | n/a | n/a | 0.011 | 1455.453 | 0.917 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002d2bb | 1583.167 | 3.885 | 0.000 | 144.103 | 1298.746 | 24.588 | 1.180 | 0.039 | 87.355 | 0.007 | 23.243 | n/a | n/a | 0.019 | 1446.735 | 0.914 | 0.019 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002c722 | 1572.181 | 10.641 | 0.000 | 195.560 | 1296.844 | 0.634 | 3.561 | 0.013 | 0.000 | 0.006 | 64.902 | n/a | n/a | 0.020 | 1503.045 | 0.956 | 0.020 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002d234 | 1564.526 | 5.978 | 0.000 | 141.687 | 1282.322 | 0.889 | 1.502 | 5.818 | 87.355 | 0.013 | 38.948 | n/a | n/a | 0.013 | 1429.987 | 0.914 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002d36d | 1557.531 | 4.320 | 0.000 | 148.228 | 1326.645 | 3.530 | 1.148 | 0.045 | 59.724 | 0.008 | 13.865 | n/a | n/a | 0.017 | 1479.194 | 0.950 | 0.017 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002d3c4 | 1535.691 | 5.587 | 0.000 | 137.329 | 1300.107 | 7.067 | 2.335 | 0.018 | 59.724 | 0.006 | 23.498 | n/a | n/a | 0.020 | 1443.023 | 0.940 | 0.020 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002d422 | 1513.537 | 5.293 | 0.000 | 140.084 | 1281.931 | 11.652 | 0.154 | 0.000 | 59.724 | 0.000 | 14.679 | n/a | n/a | 0.020 | 1427.308 | 0.943 | 0.020 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002d4fb | 1490.807 | 3.057 | 0.000 | 149.400 | 1222.295 | 70.042 | 0.788 | 0.014 | 18.374 | 0.008 | 26.823 | n/a | n/a | 0.007 | 1374.752 | 0.922 | 0.007 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002c91f | 1450.021 | 2.874 | 0.000 | 159.636 | 1220.084 | 15.097 | 1.564 | 0.049 | 0.776 | 0.013 | 49.923 | n/a | n/a | 0.005 | 1382.594 | 0.953 | 0.005 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002c2f0 | 1449.495 | 5.599 | 0.000 | 143.307 | 1156.504 | 87.538 | 1.246 | 0.013 | 0.000 | 0.007 | 55.271 | n/a | n/a | 0.010 | 1305.410 | 0.901 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| faa81eac2aa82f81000000000002d5a5 | 1406.402 | 5.978 | 0.000 | 136.812 | 1190.474 | 41.975 | 3.140 | 0.043 | 12.353 | 0.006 | 15.613 | n/a | n/a | 0.008 | 1333.264 | 0.948 | 0.008 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |

## Visibility limits

Logical read histograms include every finished read; retained fast reads are a fixed 1/1024 FNV sample, and reads at least 50 ms are retained. Slowest read selection is among the retained sample plus every observed slow read. Worker resource series distinguish isolate heap and process RSS. Linux per-thread CPU is sampled from /proc (10 ms ticks); per-request CPU attribution is not available. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
