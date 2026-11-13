# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread--1/jdk.GCPhasePause` (120.001 ms, trace `b31f71e15b1047420000000000000538`); `gw-w/thread-66/gateway.admitted-work` (48.547 ms, trace `b31f71e15b1047420000000000000c31`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (68.831 ms, trace `b31f71e15b1047420000000000000c47`); `node-14/thread-0/driver.queue (scheduler/subject/admission)` (118.969 ms, trace `b31f71e15b1047420000000000000e4e`); `node-14/thread-0/driver.queue (scheduler/subject/admission)` (107.635 ms, trace `b31f71e15b1047420000000000000e59`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-cost-b-3-full`; source `d7aeb0699071e22fc8499fb97ea91eaf58ce195d`; subjects 10000; tracing full.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 19713916.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.646 | 5.376 | 4.865 | 0.000 | 0.072 | 2.445 | 5.595 | 0.048 | 0.000 | 0.734 | 17.592 | n/a | n/a | 0.027 | 5.998 | 0.194 | 0.027 |
| p99 | 94.010 | 16.245 | n/a | 7.340 | 1.131 | 6.705 | 29.384 | 0.201 | 20.031 | 4.159 | 64.172 | n/a | n/a | 0.159 | 17.683 | 0.470 | 0.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b1047420000000000000426 | 94.010 | 14.438 | 0.699 | 0.000 | 0.081 | 3.082 | 29.384 | 0.201 | 0.000 | 4.159 | 41.938 | n/a | n/a | 0.029 | 15.218 | 0.162 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000438 | 85.194 | 6.337 | 0.371 | 0.000 | 0.042 | 2.518 | 10.865 | 0.042 | 0.000 | 0.821 | 64.172 | n/a | n/a | 0.027 | 6.750 | 0.079 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000042e | 66.056 | 16.245 | 0.248 | 0.000 | 0.038 | 2.452 | 20.488 | 0.066 | 0.000 | 0.657 | 25.836 | n/a | n/a | 0.027 | 16.531 | 0.250 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000044c | 52.463 | 12.434 | 4.865 | 0.341 | 0.042 | 6.705 | 7.404 | 0.062 | 0.000 | 1.042 | 19.546 | n/a | n/a | 0.022 | 17.683 | 0.337 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000449 | 49.616 | 9.745 | n/a | 7.340 | 0.412 | 1.157 | 4.042 | 0.043 | 0.000 | 1.250 | 25.604 | n/a | n/a | 0.022 | 17.498 | 0.353 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000422 | 44.622 | 12.172 | n/a | 0.000 | 0.926 | 1.912 | 7.881 | 0.077 | 0.000 | 1.014 | 20.480 | n/a | n/a | 0.159 | 13.098 | 0.294 | 0.159 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000448 | 44.301 | 4.459 | 0.319 | 0.391 | 0.030 | 2.275 | 11.816 | 0.035 | 0.000 | 0.413 | 24.547 | n/a | n/a | 0.016 | 5.199 | 0.117 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000432 | 43.896 | 5.509 | 0.278 | 0.000 | 0.061 | 3.174 | 13.854 | 0.052 | 0.000 | 3.349 | 17.592 | n/a | n/a | 0.028 | 5.848 | 0.133 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000440 | 43.532 | 5.808 | 0.339 | 0.506 | 0.048 | 2.589 | 4.284 | 0.056 | 20.031 | 0.396 | 9.452 | n/a | n/a | 0.025 | 6.700 | 0.154 | 0.025 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| b31f71e15b104742000000000000045a | 43.375 | 6.439 | 0.498 | 2.425 | 0.039 | 2.650 | 11.015 | 0.151 | 0.000 | 1.065 | 19.070 | n/a | n/a | 0.024 | 9.399 | 0.217 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000450 | 40.422 | 4.001 | 0.235 | 0.247 | 0.056 | 2.445 | 10.584 | 0.054 | 0.000 | 0.805 | 21.971 | n/a | n/a | 0.023 | 4.540 | 0.112 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000442 | 38.389 | 5.245 | 1.806 | 0.325 | 0.030 | 2.614 | 10.716 | 0.053 | 0.000 | 0.534 | 17.048 | n/a | n/a | 0.018 | 7.406 | 0.193 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000043e | 37.690 | 4.736 | 0.313 | 0.000 | 0.061 | 2.363 | 10.139 | 0.034 | 0.000 | 0.370 | 19.644 | n/a | n/a | 0.029 | 5.110 | 0.136 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000436 | 37.088 | 4.601 | 0.208 | 0.000 | 0.048 | 2.453 | 16.149 | 0.049 | 0.000 | 0.465 | 13.090 | n/a | n/a | 0.024 | 4.858 | 0.131 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000042c | 36.646 | 5.631 | n/a | 0.000 | 0.367 | 4.262 | 2.073 | 0.055 | 0.000 | 3.867 | 20.368 | n/a | n/a | 0.024 | 5.998 | 0.164 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000433 | 36.219 | 6.932 | n/a | 0.000 | 0.977 | 1.298 | 2.379 | 0.061 | 0.000 | 1.317 | 23.212 | n/a | n/a | 0.044 | 7.908 | 0.218 | 0.044 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000454 | 34.973 | 4.726 | 0.210 | 0.256 | 0.034 | 2.465 | 9.327 | 0.044 | 0.000 | 0.734 | 17.155 | n/a | n/a | 0.022 | 5.226 | 0.149 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000043b | 34.279 | 6.069 | n/a | 0.000 | 0.893 | 1.453 | 3.367 | 0.048 | 0.000 | 2.031 | 20.383 | n/a | n/a | 0.034 | 6.962 | 0.203 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000445 | 33.218 | 4.524 | n/a | 0.000 | 0.739 | 1.291 | 1.680 | 0.069 | 0.000 | 0.925 | 23.960 | n/a | n/a | 0.029 | 5.263 | 0.158 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000042a | 32.718 | 5.142 | 0.337 | 0.000 | 0.072 | 2.558 | 8.578 | 0.035 | 0.000 | 0.787 | 15.183 | n/a | n/a | 0.027 | 5.550 | 0.170 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (36 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 65.486 | 26.702 | 13.219 | 0.000 | 0.000 | 1.178 | 12.711 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 50.807 | 0.700 | 0.011 |
| p99 | 163.795 | 48.525 | 61.167 | 3.742 | 0.000 | 76.488 | 80.617 | 59.967 | 32.766 | 0.021 | 0.000 | n/a | n/a | 0.034 | 84.877 | 1.000 | 0.034 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b1047420000000000001ce8 | 163.795 | 23.845 | 12.658 | 3.742 | 0.000 | 31.513 | 41.498 | 50.512 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.007 | 40.245 | 0.246 | 0.007 | gw-w/thread-44/gateway.admission-wait | driver.publication 1.274ms; client.parse 1.242ms; driver.publication 1.227ms; driver.publication 1.078ms |
| b31f71e15b1047420000000000001ce6 | 128.431 | 44.586 | 23.249 | 3.438 | 0.000 | 1.943 | 39.180 | 0.000 | 16.023 | 0.000 | 0.000 | n/a | n/a | 0.011 | 71.273 | 0.555 | 0.011 | gw-w/thread-70/gateway.admitted-work | driver.publication 1.140ms; driver.publication 1.078ms |
| b31f71e15b1047420000000000000e41 | 126.831 | 38.403 | 43.118 | 3.356 | 0.000 | 4.742 | 21.440 | 0.006 | 15.749 | 0.010 | 0.000 | n/a | n/a | 0.007 | 84.877 | 0.669 | 0.007 | node-14/thread-0/rpc.replica.observe | none observed |
| b31f71e15b104742000000000000095b | 123.358 | 20.637 | 13.367 | 0.000 | 0.000 | 5.327 | 24.035 | 59.967 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.011 | 34.005 | 0.276 | 0.011 | gw-w/thread-70/gateway.admission-wait | driver.publication 1.058ms |
| b31f71e15b1047420000000000000a36 | 114.901 | 47.249 | 30.390 | 2.391 | 0.000 | 1.399 | 33.442 | 0.016 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 80.031 | 0.697 | 0.013 | node-14/thread-0/client.reach | driver.publication 1.141ms |
| b31f71e15b104742000000000000149c | 111.742 | 16.662 | 1.981 | 0.000 | 0.000 | 76.488 | 5.530 | 11.065 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.005 | 18.644 | 0.167 | 0.005 | node-14/thread-0/socket.wait-first-byte | client.parse 2.052ms; driver.publication 2.025ms; client.encode 1.616ms; client.parse 1.348ms; driver.publication 1.248ms |
| b31f71e15b104742000000000000149b | 107.153 | 26.702 | 16.919 | 0.000 | 0.000 | 47.118 | 4.297 | 12.106 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 43.621 | 0.407 | 0.012 | node-14/thread-0/socket.wait-first-byte | client.parse 2.052ms; driver.publication 2.025ms; client.encode 1.616ms; driver.publication 1.248ms |
| b31f71e15b10474200000000000019b7 | 106.938 | 48.525 | 25.578 | 2.173 | 0.000 | 2.040 | 28.576 | 0.010 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.017 | 76.276 | 0.713 | 0.017 | node-14/thread-0/client.reach | none observed |
| b31f71e15b104742000000000000169f | 102.808 | 42.924 | 26.305 | 2.722 | 0.000 | 4.975 | 15.384 | 0.009 | 10.458 | 0.021 | 0.000 | n/a | n/a | 0.011 | 71.951 | 0.700 | 0.011 | node-14/thread-0/client.reach | driver.expected-state.bind-receipt 1.968ms; driver.publication 1.018ms |
| b31f71e15b1047420000000000000689 | 102.371 | 13.949 | 2.818 | 0.000 | 0.000 | 4.949 | 80.617 | 0.013 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 16.767 | 0.164 | 0.025 | gw-w/thread-48/gateway.admitted-work | driver.publication 1.553ms; driver.publication 1.148ms; driver.publication 1.138ms; driver.publication 1.128ms; driver.publication 1.111ms |
| b31f71e15b10474200000000000007a4 | 86.542 | 20.542 | 13.219 | 2.303 | 0.000 | 3.023 | 47.429 | 0.004 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.016 | 36.064 | 0.417 | 0.016 | gw-w/thread-68/gateway.admitted-work | driver.publication 2.202ms; driver.publication 1.036ms |
| b31f71e15b1047420000000000001c1c | 83.620 | 23.740 | 6.936 | 0.000 | 0.000 | 4.755 | 15.401 | 0.011 | 32.766 | 0.000 | 0.000 | n/a | n/a | 0.011 | 30.676 | 0.367 | 0.011 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| b31f71e15b104742000000000000095a | 83.107 | 15.174 | 1.005 | 0.000 | 0.000 | 1.209 | 34.836 | 30.868 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 16.180 | 0.195 | 0.014 | gw-w/thread-50/gateway.admitted-work | none observed |
| b31f71e15b1047420000000000001499 | 80.564 | 11.526 | 1.277 | 0.000 | 0.000 | 48.159 | 14.233 | 5.358 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 12.803 | 0.159 | 0.011 | node-14/thread-0/socket.wait-first-byte | client.parse 2.052ms; driver.publication 2.025ms; client.encode 1.616ms; driver.publication 1.248ms |
| b31f71e15b1047420000000000000423 | 75.433 | 16.175 | 2.790 | 0.000 | 0.000 | 1.178 | 55.160 | 0.096 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 18.964 | 0.251 | 0.034 | gw-w/thread-44/gateway.admitted-work | none observed |
| b31f71e15b1047420000000000001497 | 72.892 | 31.833 | 16.550 | 2.676 | 0.000 | 1.144 | 20.681 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 51.058 | 0.700 | 0.008 | node-14/thread-0/client.reach | driver.publication 1.181ms |
| b31f71e15b1047420000000000000958 | 70.366 | 18.913 | 11.351 | 0.000 | 0.000 | 3.810 | 36.254 | 0.005 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.019 | 30.264 | 0.430 | 0.019 | gw-w/thread-67/gateway.admitted-work | none observed |
| b31f71e15b1047420000000000001994 | 67.214 | 27.683 | 38.094 | 1.432 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 67.209 | 1.000 | 0.005 | node-14/thread-0/rpc.replica.observe | none observed |
| b31f71e15b1047420000000000001f06 | 65.486 | 34.730 | 15.728 | 0.000 | 0.000 | 2.305 | 12.711 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 50.458 | 0.771 | 0.012 | node-14/thread-0/client.reach | none observed |
| b31f71e15b1047420000000000001991 | 65.236 | 36.203 | 12.942 | 0.000 | 0.000 | 1.000 | 15.083 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 49.145 | 0.753 | 0.008 | node-14/thread-2/replica.pull-at | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.054 | 4.524 | n/a | 0.000 | 0.367 | 1.291 | 1.378 | 0.039 | 0.000 | 0.657 | 12.195 | n/a | n/a | 0.027 | 5.701 | 0.246 | 0.027 |
| p99 | 36.646 | 6.007 | n/a | 4.385 | 1.131 | 4.262 | 2.073 | 0.069 | 0.000 | 3.867 | 23.960 | n/a | n/a | 0.039 | 10.837 | 0.470 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b104742000000000000042c | 36.646 | 5.631 | n/a | 0.000 | 0.367 | 4.262 | 2.073 | 0.055 | 0.000 | 3.867 | 20.368 | n/a | n/a | 0.024 | 5.998 | 0.164 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000445 | 33.218 | 4.524 | n/a | 0.000 | 0.739 | 1.291 | 1.680 | 0.069 | 0.000 | 0.925 | 23.960 | n/a | n/a | 0.029 | 5.263 | 0.158 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000451 | 24.220 | 4.213 | n/a | 1.677 | 0.056 | 1.281 | 0.575 | 0.040 | 0.000 | 1.712 | 14.637 | n/a | n/a | 0.028 | 5.947 | 0.246 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000428 | 23.108 | 3.608 | n/a | 0.000 | 1.131 | 4.066 | 1.378 | 0.034 | 0.000 | 0.671 | 12.195 | n/a | n/a | 0.024 | 4.739 | 0.205 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000044d | 23.054 | 6.007 | n/a | 4.385 | 0.445 | 1.358 | 0.860 | 0.039 | 0.000 | 0.434 | 9.498 | n/a | n/a | 0.027 | 10.837 | 0.470 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000443 | 19.688 | 3.606 | n/a | 0.000 | 0.220 | 1.237 | 1.660 | 0.036 | 0.000 | 0.424 | 12.481 | n/a | n/a | 0.023 | 3.826 | 0.194 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000458 | 18.739 | 4.756 | n/a | 1.908 | 0.306 | 1.144 | 0.944 | 0.028 | 0.000 | 0.360 | 9.260 | n/a | n/a | 0.033 | 6.969 | 0.372 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000455 | 17.860 | 5.376 | n/a | 0.000 | 0.324 | 3.920 | 1.257 | 0.029 | 0.000 | 0.657 | 6.258 | n/a | n/a | 0.039 | 5.701 | 0.319 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000430 | 14.135 | 3.179 | n/a | 0.000 | 0.837 | 1.253 | 2.020 | 0.049 | 0.000 | 0.486 | 6.292 | n/a | n/a | 0.020 | 4.016 | 0.284 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.134 | 3.708 | 0.200 | 0.419 | 0.025 | 2.334 | 7.094 | 0.052 | 0.000 | 0.439 | 17.848 | n/a | n/a | 0.013 | 4.353 | 0.135 | 0.013 |
| p99 | 32.134 | 3.708 | 0.200 | 0.419 | 0.025 | 2.334 | 7.094 | 0.052 | 0.000 | 0.439 | 17.848 | n/a | n/a | 0.013 | 4.353 | 0.135 | 0.013 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b104742000000000000045c | 32.134 | 3.708 | 0.200 | 0.419 | 0.025 | 2.334 | 7.094 | 0.052 | 0.000 | 0.439 | 17.848 | n/a | n/a | 0.013 | 4.353 | 0.135 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.644 | 5.477 | n/a | 0.224 | 0.088 | 2.293 | 5.117 | 0.046 | 0.000 | 0.679 | 16.186 | n/a | n/a | 0.023 | 6.167 | 0.191 | 0.023 |
| p99 | 74.583 | 10.189 | n/a | 3.740 | 8.663 | 5.722 | 21.953 | 0.183 | 23.557 | 6.127 | 56.196 | n/a | n/a | 0.044 | 14.314 | 0.559 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b104742000000000000045e | 74.583 | 6.427 | 0.260 | 0.401 | 0.061 | 2.563 | 15.451 | 0.043 | 23.557 | 0.580 | 25.210 | n/a | n/a | 0.030 | 7.149 | 0.096 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000470 | 74.434 | 5.580 | 0.285 | 0.419 | 0.041 | 2.670 | 8.718 | 0.035 | 0.000 | 0.469 | 56.196 | n/a | n/a | 0.021 | 6.325 | 0.085 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000460 | 56.574 | 6.594 | 0.381 | 0.474 | 0.037 | 2.772 | 8.105 | 0.048 | 0.000 | 6.127 | 32.006 | n/a | n/a | 0.030 | 7.486 | 0.132 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000474 | 53.213 | 5.616 | 0.443 | 0.689 | 0.065 | 3.205 | 20.462 | 0.183 | 0.000 | 0.668 | 21.861 | n/a | n/a | 0.021 | 6.813 | 0.128 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000498 | 51.741 | 4.163 | 0.599 | 0.000 | 0.030 | 2.504 | 20.053 | 0.062 | 0.000 | 0.552 | 23.760 | n/a | n/a | 0.020 | 4.792 | 0.093 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004a2 | 50.718 | 6.831 | 0.346 | 0.383 | 0.042 | 2.555 | 16.251 | 0.063 | 0.000 | 3.651 | 20.562 | n/a | n/a | 0.034 | 7.602 | 0.150 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000049e | 47.023 | 5.227 | 0.270 | 0.356 | 0.036 | 2.500 | 21.953 | 0.079 | 0.000 | 0.929 | 15.642 | n/a | n/a | 0.031 | 5.889 | 0.125 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000494 | 43.930 | 5.713 | 0.242 | 0.000 | 0.037 | 2.508 | 7.125 | 0.065 | 0.000 | 0.680 | 27.542 | n/a | n/a | 0.017 | 5.992 | 0.136 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000046d | 41.454 | 6.842 | n/a | 2.254 | 0.823 | 1.262 | 2.335 | 0.052 | 0.000 | 0.558 | 27.304 | n/a | n/a | 0.023 | 9.919 | 0.239 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000472 | 40.665 | 5.985 | 0.321 | 0.313 | 0.102 | 2.441 | 8.021 | 0.063 | 0.000 | 1.110 | 22.272 | n/a | n/a | 0.036 | 6.721 | 0.165 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000482 | 40.560 | 5.477 | 0.448 | 0.000 | 0.037 | 2.776 | 10.659 | 0.044 | 0.000 | 0.371 | 20.718 | n/a | n/a | 0.030 | 5.962 | 0.147 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000046a | 39.955 | 5.500 | 0.214 | 0.418 | 0.035 | 2.327 | 14.236 | 0.033 | 0.000 | 3.345 | 13.826 | n/a | n/a | 0.020 | 6.167 | 0.154 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000478 | 39.765 | 5.061 | 0.660 | 0.396 | 0.067 | 2.533 | 12.166 | 0.066 | 0.000 | 0.547 | 18.234 | n/a | n/a | 0.036 | 6.183 | 0.155 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004ac | 36.621 | 6.127 | 0.264 | 0.463 | 0.078 | 2.713 | 9.028 | 0.082 | 0.000 | 0.476 | 17.353 | n/a | n/a | 0.037 | 6.931 | 0.189 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000480 | 34.812 | 10.189 | n/a | 3.740 | 0.385 | 1.750 | 1.951 | 0.054 | 0.000 | 1.145 | 15.554 | n/a | n/a | 0.044 | 14.314 | 0.411 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000488 | 34.685 | 5.945 | 0.936 | 0.508 | 0.066 | 2.442 | 5.117 | 0.026 | 0.000 | 0.648 | 18.965 | n/a | n/a | 0.032 | 7.455 | 0.215 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000475 | 33.554 | 6.686 | n/a | 1.875 | 0.657 | 1.342 | 2.527 | 0.054 | 0.000 | 2.206 | 18.179 | n/a | n/a | 0.028 | 9.218 | 0.275 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000467 | 33.426 | 6.157 | 0.211 | 0.713 | 0.036 | 2.293 | 6.918 | 0.034 | 0.000 | 1.901 | 15.141 | n/a | n/a | 0.020 | 7.117 | 0.213 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000049c | 33.413 | 4.443 | 0.371 | 0.389 | 0.033 | 2.365 | 12.626 | 0.067 | 0.000 | 0.550 | 12.547 | n/a | n/a | 0.021 | 5.237 | 0.157 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000047c | 32.898 | 5.008 | 0.344 | 0.600 | 0.042 | 2.314 | 7.867 | 0.053 | 0.000 | 0.564 | 16.084 | n/a | n/a | 0.023 | 5.993 | 0.182 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.443 | 4.096 | n/a | 0.000 | 0.280 | 1.247 | 1.063 | 0.035 | 0.000 | 0.679 | 6.529 | n/a | n/a | 0.018 | 5.136 | 0.274 | 0.018 |
| p99 | 29.279 | 7.069 | n/a | 0.000 | 8.663 | 5.722 | 1.943 | 0.049 | 0.000 | 0.896 | 19.858 | n/a | n/a | 0.037 | 11.837 | 0.559 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b104742000000000000048e | 29.279 | 6.401 | n/a | 0.000 | 0.088 | 1.124 | 1.028 | 0.045 | 0.000 | 0.722 | 19.858 | n/a | n/a | 0.012 | 6.489 | 0.222 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000465 | 24.820 | 4.144 | n/a | 0.000 | 0.211 | 1.781 | 0.677 | 0.029 | 0.000 | 0.896 | 17.064 | n/a | n/a | 0.018 | 4.354 | 0.175 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000468 | 22.978 | 7.069 | n/a | 0.000 | 1.114 | 5.722 | 1.943 | 0.026 | 0.000 | 0.552 | 6.529 | n/a | n/a | 0.024 | 8.183 | 0.356 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004a9 | 21.192 | 3.173 | n/a | 0.000 | 8.663 | 1.544 | 1.063 | 0.035 | 0.000 | 0.421 | 6.277 | n/a | n/a | 0.015 | 11.837 | 0.559 | 0.015 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.expected-state.bind-receipt 1.345ms; driver.publication 1.215ms |
| b31f71e15b1047420000000000000479 | 19.443 | 5.041 | n/a | 0.000 | 0.280 | 1.136 | 1.087 | 0.029 | 0.000 | 0.622 | 11.212 | n/a | n/a | 0.037 | 5.321 | 0.274 | 0.037 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000049f | 15.851 | 4.096 | n/a | 0.000 | 1.040 | 1.195 | 1.120 | 0.045 | 0.000 | 0.818 | 7.513 | n/a | n/a | 0.023 | 5.136 | 0.324 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000492 | 13.497 | 2.945 | n/a | 0.000 | 0.754 | 1.769 | 1.173 | 0.049 | 0.000 | 0.857 | 5.933 | n/a | n/a | 0.017 | 3.699 | 0.274 | 0.017 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000483 | 12.488 | 3.623 | n/a | 0.000 | 0.101 | 1.247 | 0.762 | 0.035 | 0.000 | 0.679 | 6.019 | n/a | n/a | 0.022 | 3.724 | 0.298 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.392 | 4.325 | 0.733 | 0.000 | 0.075 | 2.311 | 4.789 | 0.046 | 0.000 | 0.594 | 13.275 | n/a | n/a | 0.024 | 4.730 | 0.195 | 0.024 |
| p99 | 83.463 | 10.308 | n/a | 3.252 | 1.111 | 4.489 | 17.444 | 0.097 | 0.000 | 2.885 | 73.535 | n/a | n/a | 0.058 | 14.329 | 0.437 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b10474200000000000004ca | 83.463 | 5.591 | n/a | 0.000 | 1.078 | 1.240 | 1.497 | 0.030 | 0.000 | 0.473 | 73.535 | n/a | n/a | 0.020 | 6.669 | 0.080 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004b9 | 72.212 | 4.510 | 0.448 | 0.000 | 0.033 | 4.489 | 13.027 | 0.083 | 0.000 | 0.816 | 48.770 | n/a | n/a | 0.036 | 4.991 | 0.069 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004e1 | 51.675 | 9.965 | 0.301 | 0.000 | 0.044 | 2.435 | 8.832 | 0.047 | 0.000 | 0.481 | 29.539 | n/a | n/a | 0.030 | 10.310 | 0.200 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004d7 | 45.957 | 4.050 | 0.229 | 0.000 | 0.037 | 2.676 | 11.537 | 0.078 | 0.000 | 0.844 | 26.483 | n/a | n/a | 0.023 | 4.316 | 0.094 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004db | 43.567 | 4.112 | 0.236 | 0.000 | 0.062 | 2.396 | 17.444 | 0.048 | 0.000 | 0.380 | 18.857 | n/a | n/a | 0.032 | 4.410 | 0.101 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004c1 | 43.018 | 4.661 | 0.345 | 0.000 | 0.075 | 2.355 | 13.327 | 0.046 | 0.000 | 0.603 | 21.562 | n/a | n/a | 0.041 | 5.082 | 0.118 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004c9 | 39.274 | 4.241 | 0.733 | 0.000 | 0.033 | 2.598 | 15.700 | 0.027 | 0.000 | 0.618 | 15.302 | n/a | n/a | 0.022 | 5.007 | 0.127 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004e8 | 34.992 | 10.308 | n/a | 3.252 | 0.769 | 1.565 | 4.137 | 0.080 | 0.000 | 0.649 | 14.195 | n/a | n/a | 0.038 | 14.329 | 0.410 | 0.038 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004eb | 33.277 | 4.221 | 0.265 | 0.000 | 0.032 | 2.697 | 14.773 | 0.055 | 0.000 | 1.075 | 10.137 | n/a | n/a | 0.022 | 4.519 | 0.136 | 0.022 | gw-w/thread-51/gateway.admitted-work | none observed |
| b31f71e15b10474200000000000004c3 | 32.721 | 3.786 | 0.345 | 0.000 | 0.033 | 2.360 | 12.423 | 0.097 | 0.000 | 0.560 | 13.095 | n/a | n/a | 0.022 | 4.165 | 0.127 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004b6 | 31.514 | 3.755 | 0.214 | 0.000 | 0.031 | 2.311 | 9.773 | 0.056 | 0.000 | 0.256 | 15.092 | n/a | n/a | 0.025 | 4.001 | 0.127 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004ba | 30.131 | 5.480 | n/a | 0.000 | 0.170 | 1.162 | 7.719 | 0.032 | 0.000 | 0.338 | 15.206 | n/a | n/a | 0.023 | 5.651 | 0.188 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004e7 | 30.026 | 4.082 | 0.223 | 0.000 | 0.042 | 2.657 | 8.840 | 0.070 | 0.000 | 0.656 | 13.429 | n/a | n/a | 0.026 | 4.347 | 0.145 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004cf | 29.385 | 3.425 | 0.244 | 0.000 | 0.033 | 2.378 | 9.737 | 0.074 | 0.000 | 0.398 | 13.073 | n/a | n/a | 0.025 | 3.701 | 0.126 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004ef | 29.247 | 6.053 | n/a | 0.000 | 0.684 | 1.168 | 1.335 | 0.035 | 0.000 | 0.650 | 19.265 | n/a | n/a | 0.058 | 6.737 | 0.230 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004b2 | 28.539 | 5.563 | 0.386 | 0.385 | 0.069 | 2.665 | 8.518 | 0.049 | 0.000 | 0.370 | 10.500 | n/a | n/a | 0.032 | 6.404 | 0.224 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004d3 | 28.507 | 3.245 | 0.245 | 0.000 | 0.042 | 2.401 | 9.704 | 0.055 | 0.000 | 0.436 | 12.354 | n/a | n/a | 0.024 | 3.532 | 0.124 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004ec | 28.169 | 7.502 | n/a | 0.000 | 1.014 | 1.370 | 4.789 | 0.042 | 0.000 | 0.482 | 12.933 | n/a | n/a | 0.037 | 8.515 | 0.302 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004f3 | 28.029 | 4.247 | 0.221 | 0.228 | 0.034 | 2.512 | 7.701 | 0.044 | 0.000 | 0.562 | 12.459 | n/a | n/a | 0.021 | 4.730 | 0.169 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004cd | 27.392 | 3.766 | 0.249 | 0.000 | 0.028 | 2.696 | 7.841 | 0.031 | 0.000 | 0.905 | 11.852 | n/a | n/a | 0.024 | 4.043 | 0.148 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.567 | 3.633 | n/a | 0.000 | 0.770 | 1.171 | 1.169 | 0.035 | 0.000 | 0.603 | 13.275 | n/a | n/a | 0.024 | 4.410 | 0.230 | 0.024 |
| p99 | 29.247 | 6.053 | n/a | 0.000 | 1.111 | 1.829 | 1.931 | 0.063 | 0.000 | 0.841 | 19.265 | n/a | n/a | 0.058 | 6.737 | 0.307 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b10474200000000000004ef | 29.247 | 6.053 | n/a | 0.000 | 0.684 | 1.168 | 1.335 | 0.035 | 0.000 | 0.650 | 19.265 | n/a | n/a | 0.058 | 6.737 | 0.230 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004e2 | 23.813 | 5.011 | n/a | 0.000 | 0.934 | 1.829 | 1.931 | 0.047 | 0.000 | 0.761 | 13.275 | n/a | n/a | 0.025 | 5.945 | 0.250 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004f8 | 23.249 | 2.974 | n/a | 0.000 | 0.972 | 1.171 | 0.796 | 0.035 | 0.000 | 0.560 | 16.723 | n/a | n/a | 0.018 | 3.946 | 0.170 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004af | 22.367 | 5.243 | n/a | 0.000 | 0.770 | 1.213 | 1.694 | 0.063 | 0.000 | 0.603 | 12.749 | n/a | n/a | 0.030 | 6.013 | 0.269 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004b3 | 21.789 | 3.309 | n/a | 0.000 | 0.981 | 1.187 | 0.761 | 0.029 | 0.000 | 0.577 | 14.928 | n/a | n/a | 0.016 | 4.290 | 0.197 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004c6 | 21.567 | 4.325 | n/a | 0.000 | 0.085 | 1.150 | 1.546 | 0.047 | 0.000 | 0.841 | 13.543 | n/a | n/a | 0.029 | 4.410 | 0.204 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004be | 21.116 | 3.546 | n/a | 0.000 | 0.174 | 1.137 | 1.169 | 0.032 | 0.000 | 0.365 | 14.669 | n/a | n/a | 0.024 | 3.720 | 0.176 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004fa | 18.651 | 4.328 | n/a | 0.000 | 0.345 | 1.288 | 0.896 | 0.029 | 0.000 | 0.676 | 11.061 | n/a | n/a | 0.028 | 4.674 | 0.251 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004d8 | 17.001 | 3.633 | n/a | 0.000 | 0.907 | 1.129 | 1.818 | 0.058 | 0.000 | 0.652 | 8.781 | n/a | n/a | 0.021 | 4.540 | 0.267 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004c4 | 14.219 | 3.256 | n/a | 0.000 | 1.111 | 1.190 | 0.875 | 0.030 | 0.000 | 0.526 | 7.213 | n/a | n/a | 0.018 | 4.367 | 0.307 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.161 | 3.842 | n/a | 0.000 | 0.067 | 2.243 | 5.228 | 0.044 | 0.000 | 0.580 | 12.773 | n/a | n/a | 0.023 | 4.325 | 0.192 | 0.023 |
| p99 | 160.526 | 13.559 | n/a | 0.235 | 1.990 | 6.580 | 17.215 | 0.228 | 120.001 | 5.022 | 50.972 | n/a | n/a | 0.043 | 13.612 | 0.313 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b1047420000000000000538 | 160.526 | 3.150 | 0.188 | 0.000 | 0.041 | 2.406 | 16.163 | 0.013 | 120.001 | 0.278 | 18.262 | n/a | n/a | 0.023 | 3.379 | 0.021 | 0.023 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| b31f71e15b1047420000000000000510 | 71.697 | 4.666 | 0.232 | 0.000 | 0.043 | 2.418 | 11.389 | 0.047 | 0.000 | 1.905 | 50.972 | n/a | n/a | 0.024 | 4.941 | 0.069 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000521 | 57.792 | 13.559 | n/a | 0.000 | 0.053 | 6.580 | 14.173 | 0.089 | 0.000 | 5.022 | 18.295 | n/a | n/a | 0.021 | 13.612 | 0.236 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000054a | 42.379 | 4.487 | 0.410 | 0.000 | 0.033 | 2.507 | 13.482 | 0.046 | 0.000 | 0.400 | 20.981 | n/a | n/a | 0.033 | 4.930 | 0.116 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000503 | 41.399 | 3.503 | 0.173 | 0.232 | 0.035 | 2.379 | 7.888 | 0.027 | 0.000 | 0.442 | 26.696 | n/a | n/a | 0.024 | 3.944 | 0.095 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000540 | 39.956 | 4.366 | 0.357 | 0.000 | 0.035 | 2.512 | 6.380 | 0.045 | 0.000 | 0.690 | 25.547 | n/a | n/a | 0.025 | 4.758 | 0.119 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000054c | 39.799 | 3.435 | 0.297 | 0.000 | 0.042 | 3.134 | 13.467 | 0.228 | 0.000 | 0.555 | 18.623 | n/a | n/a | 0.019 | 3.773 | 0.095 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000509 | 39.272 | 3.825 | 0.348 | 0.235 | 0.048 | 5.649 | 14.403 | 0.052 | 0.000 | 1.121 | 13.561 | n/a | n/a | 0.029 | 4.457 | 0.113 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000524 | 36.955 | 3.281 | 0.296 | 0.000 | 0.067 | 2.314 | 14.771 | 0.079 | 0.000 | 0.473 | 15.633 | n/a | n/a | 0.042 | 3.645 | 0.099 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.295ms |
| b31f71e15b1047420000000000000548 | 36.760 | 4.481 | 0.272 | 0.000 | 0.043 | 2.592 | 17.215 | 0.078 | 0.000 | 1.042 | 11.019 | n/a | n/a | 0.019 | 4.795 | 0.130 | 0.019 | gw-w/thread-51/gateway.admitted-work | none observed |
| b31f71e15b1047420000000000000520 | 33.759 | 5.063 | 0.176 | 0.000 | 0.030 | 2.487 | 10.783 | 0.052 | 0.000 | 0.452 | 14.695 | n/a | n/a | 0.021 | 5.268 | 0.156 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000052c | 32.596 | 3.398 | 0.201 | 0.000 | 0.036 | 2.312 | 15.397 | 0.067 | 0.000 | 0.525 | 10.631 | n/a | n/a | 0.027 | 3.635 | 0.112 | 0.027 | gw-w/thread-47/gateway.admitted-work | none observed |
| b31f71e15b1047420000000000000534 | 32.486 | 4.828 | 0.229 | 0.000 | 0.039 | 2.535 | 7.279 | 0.059 | 0.000 | 1.199 | 16.282 | n/a | n/a | 0.035 | 5.095 | 0.157 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000511 | 31.030 | 6.766 | n/a | 0.000 | 0.974 | 1.076 | 1.473 | 0.030 | 0.000 | 0.652 | 20.034 | n/a | n/a | 0.026 | 7.739 | 0.249 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000053c | 29.732 | 3.978 | 0.234 | 0.000 | 0.040 | 2.492 | 7.935 | 0.036 | 0.000 | 0.408 | 14.578 | n/a | n/a | 0.031 | 4.252 | 0.143 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000051e | 29.260 | 3.916 | 0.330 | 0.000 | 0.079 | 2.467 | 8.372 | 0.042 | 0.000 | 0.673 | 13.339 | n/a | n/a | 0.043 | 4.325 | 0.148 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000052d | 27.989 | 5.592 | n/a | 0.000 | 0.983 | 1.181 | 2.240 | 0.048 | 0.000 | 0.540 | 17.381 | n/a | n/a | 0.024 | 6.575 | 0.235 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000516 | 27.887 | 2.828 | 0.194 | 0.000 | 0.031 | 2.316 | 13.506 | 0.066 | 0.000 | 3.785 | 5.143 | n/a | n/a | 0.018 | 3.054 | 0.110 | 0.018 | gw-w/thread-47/gateway.admitted-work | none observed |
| b31f71e15b104742000000000000052a | 27.531 | 5.108 | 0.185 | 0.000 | 0.029 | 2.500 | 8.676 | 0.059 | 0.000 | 0.779 | 10.175 | n/a | n/a | 0.020 | 5.322 | 0.193 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000550 | 27.352 | 4.176 | 0.240 | 0.000 | 0.059 | 2.783 | 8.534 | 0.040 | 0.000 | 0.534 | 10.961 | n/a | n/a | 0.026 | 4.474 | 0.164 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.110 | 3.593 | n/a | 0.000 | 0.833 | 1.185 | 0.918 | 0.036 | 0.000 | 0.580 | 11.587 | n/a | n/a | 0.020 | 4.157 | 0.226 | 0.020 |
| p99 | 24.675 | 4.650 | n/a | 0.000 | 1.119 | 1.443 | 5.228 | 0.060 | 0.000 | 3.840 | 14.806 | n/a | n/a | 0.037 | 5.571 | 0.297 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b104742000000000000050d | 24.675 | 4.602 | n/a | 0.000 | 0.969 | 1.183 | 5.228 | 0.039 | 0.000 | 0.474 | 12.146 | n/a | n/a | 0.034 | 5.571 | 0.226 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000543 | 22.130 | 2.868 | n/a | 0.000 | 0.833 | 1.185 | 1.436 | 0.057 | 0.000 | 0.930 | 14.806 | n/a | n/a | 0.016 | 3.701 | 0.167 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000500 | 22.072 | 4.310 | n/a | 0.000 | 1.015 | 1.443 | 1.470 | 0.037 | 0.000 | 0.653 | 13.128 | n/a | n/a | 0.016 | 5.325 | 0.241 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000517 | 21.515 | 4.650 | n/a | 0.000 | 0.565 | 1.438 | 0.918 | 0.033 | 0.000 | 1.105 | 12.773 | n/a | n/a | 0.033 | 5.216 | 0.242 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000527 | 20.558 | 3.593 | n/a | 0.000 | 0.650 | 1.245 | 1.831 | 0.033 | 0.000 | 0.580 | 12.607 | n/a | n/a | 0.018 | 4.243 | 0.206 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000504 | 20.520 | 3.646 | n/a | 0.000 | 0.152 | 1.255 | 0.678 | 0.028 | 0.000 | 0.573 | 14.165 | n/a | n/a | 0.023 | 3.798 | 0.185 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000530 | 19.490 | 3.960 | n/a | 0.000 | 1.119 | 1.113 | 0.919 | 0.036 | 0.000 | 0.720 | 11.587 | n/a | n/a | 0.037 | 5.079 | 0.261 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000539 | 18.110 | 3.290 | n/a | 0.000 | 1.027 | 1.181 | 0.485 | 0.042 | 0.000 | 3.840 | 8.220 | n/a | n/a | 0.024 | 4.317 | 0.238 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000053d | 17.745 | 2.677 | n/a | 0.000 | 1.017 | 1.203 | 0.617 | 0.030 | 0.000 | 0.409 | 11.772 | n/a | n/a | 0.019 | 3.694 | 0.208 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000514 | 17.556 | 3.721 | n/a | 0.000 | 0.861 | 1.230 | 0.909 | 0.044 | 0.000 | 0.441 | 10.326 | n/a | n/a | 0.024 | 4.582 | 0.261 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000535 | 16.975 | 2.931 | n/a | 0.000 | 0.706 | 1.153 | 0.551 | 0.031 | 0.000 | 0.575 | 11.012 | n/a | n/a | 0.016 | 3.637 | 0.214 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000004fe | 16.802 | 3.336 | n/a | 0.000 | 0.068 | 1.189 | 0.663 | 0.043 | 0.000 | 0.364 | 11.121 | n/a | n/a | 0.018 | 3.404 | 0.203 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000051b | 16.015 | 3.019 | n/a | 0.000 | 0.059 | 1.172 | 1.054 | 0.036 | 0.000 | 0.759 | 9.895 | n/a | n/a | 0.022 | 3.078 | 0.192 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000054d | 14.396 | 3.793 | n/a | 0.000 | 0.364 | 1.142 | 1.670 | 0.060 | 0.000 | 0.416 | 6.933 | n/a | n/a | 0.019 | 4.157 | 0.289 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000519 | 13.386 | 3.138 | n/a | 0.000 | 0.842 | 1.167 | 0.527 | 0.029 | 0.000 | 0.727 | 6.938 | n/a | n/a | 0.020 | 3.980 | 0.297 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.964 | 3.892 | n/a | 0.000 | 0.258 | 1.534 | 2.590 | 0.033 | 0.000 | 0.603 | 10.374 | n/a | n/a | 0.021 | 4.360 | 0.191 | 0.021 |
| p99 | 54.688 | 8.996 | n/a | 0.000 | 1.169 | 6.599 | 17.831 | 0.087 | 20.212 | 3.977 | 39.043 | n/a | n/a | 0.052 | 9.774 | 0.454 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b10474200000000000005a3 | 54.688 | 3.576 | 0.246 | 0.000 | 0.063 | 2.257 | 4.984 | 0.040 | 19.275 | 3.968 | 20.257 | n/a | n/a | 0.022 | 3.885 | 0.071 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000558 | 47.761 | 4.839 | n/a | 0.000 | 1.090 | 1.198 | 0.834 | 0.032 | 0.000 | 0.699 | 39.043 | n/a | n/a | 0.027 | 5.928 | 0.124 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000592 | 43.465 | 3.344 | 0.227 | 0.000 | 0.052 | 2.550 | 3.820 | 0.000 | 0.000 | 0.129 | 33.321 | n/a | n/a | 0.022 | 3.623 | 0.083 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000564 | 42.547 | 4.209 | 0.264 | 0.000 | 0.063 | 2.819 | 11.640 | 0.066 | 0.000 | 0.522 | 22.940 | n/a | n/a | 0.025 | 4.536 | 0.107 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000058b | 41.281 | 7.549 | n/a | 0.000 | 0.348 | 1.921 | 6.053 | 0.046 | 0.000 | 0.443 | 24.901 | n/a | n/a | 0.021 | 7.896 | 0.191 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000578 | 40.114 | 3.960 | 0.319 | 0.000 | 0.081 | 2.369 | 17.831 | 0.045 | 0.000 | 1.767 | 13.706 | n/a | n/a | 0.035 | 4.360 | 0.109 | 0.035 | gw-w/thread-44/gateway.admitted-work | none observed |
| b31f71e15b1047420000000000000583 | 38.749 | 3.379 | n/a | 0.000 | 0.094 | 1.245 | 3.993 | 0.046 | 20.212 | 1.932 | 7.820 | n/a | n/a | 0.028 | 3.473 | 0.090 | 0.028 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| b31f71e15b1047420000000000000586 | 35.439 | 5.281 | 0.204 | 0.000 | 0.034 | 2.497 | 8.400 | 0.050 | 0.000 | 0.475 | 18.480 | n/a | n/a | 0.018 | 5.519 | 0.156 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000576 | 32.466 | 3.872 | 0.281 | 0.000 | 0.045 | 2.711 | 10.062 | 0.054 | 0.000 | 0.752 | 14.668 | n/a | n/a | 0.021 | 4.199 | 0.129 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000057a | 30.883 | 4.183 | n/a | 0.000 | 0.836 | 1.208 | 2.590 | 0.031 | 0.000 | 0.328 | 21.692 | n/a | n/a | 0.014 | 5.020 | 0.163 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.055ms |
| b31f71e15b1047420000000000000574 | 30.429 | 4.133 | 0.270 | 0.000 | 0.071 | 2.536 | 12.433 | 0.029 | 0.000 | 0.703 | 10.226 | n/a | n/a | 0.029 | 4.473 | 0.147 | 0.029 | gw-w/thread-48/gateway.admitted-work | none observed |
| b31f71e15b1047420000000000000569 | 30.080 | 5.116 | n/a | 0.000 | 0.508 | 4.818 | 1.493 | 0.038 | 0.000 | 3.784 | 14.297 | n/a | n/a | 0.026 | 5.625 | 0.187 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000553 | 29.110 | 3.257 | 0.871 | 0.000 | 0.034 | 2.429 | 4.861 | 0.000 | 0.000 | 0.537 | 17.104 | n/a | n/a | 0.017 | 4.162 | 0.143 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000058a | 28.353 | 3.745 | 0.254 | 0.000 | 0.064 | 2.445 | 10.982 | 0.029 | 0.000 | 0.436 | 10.373 | n/a | n/a | 0.026 | 4.063 | 0.143 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000570 | 28.189 | 3.104 | 0.216 | 0.000 | 0.040 | 2.413 | 7.659 | 0.064 | 0.000 | 0.894 | 13.781 | n/a | n/a | 0.018 | 3.359 | 0.119 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005af | 27.801 | 3.818 | 0.198 | 0.000 | 0.063 | 2.326 | 6.447 | 0.020 | 0.000 | 0.432 | 14.450 | n/a | n/a | 0.046 | 4.078 | 0.147 | 0.046 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000055d | 27.614 | 3.215 | 0.671 | 0.000 | 0.034 | 2.429 | 5.924 | 0.063 | 0.000 | 1.472 | 13.787 | n/a | n/a | 0.018 | 3.921 | 0.142 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000568 | 27.408 | 3.365 | 0.174 | 0.000 | 0.014 | 2.337 | 7.293 | 0.028 | 0.000 | 0.356 | 13.829 | n/a | n/a | 0.010 | 3.554 | 0.130 | 0.010 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000598 | 27.319 | 3.993 | 0.401 | 0.000 | 0.076 | 2.413 | 4.551 | 0.017 | 0.000 | 1.516 | 14.320 | n/a | n/a | 0.033 | 4.470 | 0.164 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000056c | 27.145 | 3.861 | 0.373 | 0.000 | 0.030 | 2.404 | 8.391 | 0.039 | 0.000 | 0.603 | 11.425 | n/a | n/a | 0.020 | 4.264 | 0.157 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.340 | 3.892 | n/a | 0.000 | 0.649 | 1.180 | 0.803 | 0.031 | 0.000 | 0.601 | 8.058 | n/a | n/a | 0.025 | 4.764 | 0.271 | 0.025 |
| p99 | 38.749 | 5.732 | n/a | 0.000 | 1.158 | 6.599 | 4.889 | 0.054 | 20.212 | 1.932 | 21.692 | n/a | n/a | 0.052 | 6.889 | 0.454 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b1047420000000000000583 | 38.749 | 3.379 | n/a | 0.000 | 0.094 | 1.245 | 3.993 | 0.046 | 20.212 | 1.932 | 7.820 | n/a | n/a | 0.028 | 3.473 | 0.090 | 0.028 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| b31f71e15b104742000000000000057a | 30.883 | 4.183 | n/a | 0.000 | 0.836 | 1.208 | 2.590 | 0.031 | 0.000 | 0.328 | 21.692 | n/a | n/a | 0.014 | 5.020 | 0.163 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.055ms |
| b31f71e15b104742000000000000055f | 24.295 | 5.654 | n/a | 0.000 | 0.931 | 1.350 | 0.955 | 0.027 | 0.000 | 0.553 | 14.803 | n/a | n/a | 0.021 | 6.585 | 0.271 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000556 | 23.083 | 5.103 | n/a | 0.000 | 0.465 | 1.127 | 4.231 | 0.042 | 0.000 | 0.387 | 11.700 | n/a | n/a | 0.026 | 5.568 | 0.241 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000551 | 21.839 | 5.006 | n/a | 0.000 | 0.823 | 6.599 | 0.901 | 0.028 | 0.000 | 0.412 | 8.034 | n/a | n/a | 0.037 | 5.829 | 0.267 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000599 | 18.809 | 4.319 | n/a | 0.000 | 1.032 | 4.538 | 4.889 | 0.050 | 0.000 | 0.412 | 3.549 | n/a | n/a | 0.020 | 5.351 | 0.285 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| b31f71e15b104742000000000000058e | 18.701 | 5.732 | n/a | 0.000 | 1.158 | 1.285 | 1.307 | 0.054 | 0.000 | 1.083 | 8.058 | n/a | n/a | 0.025 | 6.889 | 0.368 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000059e | 18.579 | 3.687 | n/a | 0.000 | 0.649 | 1.474 | 0.794 | 0.032 | 0.000 | 0.375 | 11.547 | n/a | n/a | 0.021 | 4.336 | 0.233 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005a6 | 18.340 | 4.737 | n/a | 0.000 | 0.559 | 1.145 | 1.187 | 0.044 | 0.000 | 1.151 | 9.491 | n/a | n/a | 0.027 | 5.296 | 0.289 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000571 | 17.038 | 3.644 | n/a | 0.000 | 0.272 | 1.131 | 0.803 | 0.028 | 0.000 | 1.872 | 9.263 | n/a | n/a | 0.025 | 3.917 | 0.230 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000055a | 16.306 | 3.131 | n/a | 0.000 | 0.975 | 1.276 | 0.521 | 0.033 | 0.000 | 0.631 | 9.724 | n/a | n/a | 0.015 | 4.106 | 0.252 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000566 | 16.176 | 3.865 | n/a | 0.000 | 0.899 | 1.180 | 0.589 | 0.034 | 0.000 | 0.772 | 8.785 | n/a | n/a | 0.052 | 4.764 | 0.295 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005ac | 13.954 | 2.992 | n/a | 0.000 | 0.624 | 1.126 | 0.471 | 0.029 | 0.000 | 0.902 | 7.795 | n/a | n/a | 0.015 | 3.616 | 0.259 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005b2 | 13.105 | 3.892 | n/a | 0.000 | 0.435 | 1.112 | 0.443 | 0.028 | 0.000 | 0.583 | 6.587 | n/a | n/a | 0.025 | 4.327 | 0.330 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000595 | 12.908 | 5.237 | n/a | 0.000 | 0.623 | 1.153 | 0.549 | 0.026 | 0.000 | 0.339 | 4.948 | n/a | n/a | 0.031 | 5.861 | 0.454 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000590 | 11.107 | 2.938 | n/a | 0.000 | 0.957 | 1.177 | 0.383 | 0.029 | 0.000 | 0.601 | 5.010 | n/a | n/a | 0.011 | 3.895 | 0.351 | 0.011 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005b0 | 9.257 | 2.614 | n/a | 0.000 | 0.151 | 1.116 | 0.375 | 0.029 | 0.000 | 0.608 | 4.348 | n/a | n/a | 0.017 | 2.765 | 0.299 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.888 | 4.267 | n/a | 0.000 | 0.073 | 1.728 | 2.154 | 0.033 | 0.000 | 0.620 | 10.154 | n/a | n/a | 0.022 | 4.683 | 0.220 | 0.022 |
| p99 | 57.066 | 10.413 | n/a | 0.000 | 1.159 | 2.849 | 13.771 | 0.124 | 20.824 | 3.075 | 32.938 | n/a | n/a | 0.076 | 11.502 | 0.494 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b10474200000000000005e5 | 57.066 | 3.331 | 0.223 | 0.000 | 0.068 | 2.311 | 9.668 | 0.042 | 20.824 | 0.805 | 19.770 | n/a | n/a | 0.023 | 3.622 | 0.063 | 0.023 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| b31f71e15b10474200000000000005db | 48.861 | 4.403 | 0.414 | 0.000 | 0.072 | 2.298 | 7.576 | 0.093 | 0.000 | 1.039 | 32.938 | n/a | n/a | 0.029 | 4.889 | 0.100 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005e7 | 38.304 | 4.404 | 0.255 | 0.000 | 0.043 | 2.475 | 3.716 | 0.000 | 0.000 | 3.075 | 24.323 | n/a | n/a | 0.014 | 4.703 | 0.123 | 0.014 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000608 | 35.421 | 3.083 | 0.208 | 0.000 | 0.032 | 2.442 | 13.771 | 0.048 | 0.000 | 0.458 | 15.362 | n/a | n/a | 0.017 | 3.322 | 0.094 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005c5 | 33.198 | 5.756 | 0.381 | 0.000 | 0.094 | 2.413 | 7.810 | 0.043 | 0.000 | 0.598 | 16.076 | n/a | n/a | 0.027 | 6.231 | 0.188 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005f4 | 32.557 | 4.401 | n/a | 0.000 | 1.000 | 1.114 | 4.380 | 0.033 | 0.000 | 0.366 | 21.234 | n/a | n/a | 0.029 | 5.401 | 0.166 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005f0 | 30.698 | 3.079 | 0.258 | 0.000 | 0.034 | 2.370 | 5.786 | 0.047 | 0.000 | 1.228 | 17.883 | n/a | n/a | 0.015 | 3.371 | 0.110 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 4.562ms |
| b31f71e15b10474200000000000005cb | 29.544 | 3.728 | 0.289 | 0.000 | 0.048 | 2.510 | 9.187 | 0.057 | 0.000 | 0.565 | 13.141 | n/a | n/a | 0.020 | 4.065 | 0.138 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005d7 | 28.797 | 4.049 | 0.269 | 0.000 | 0.073 | 2.619 | 8.710 | 0.014 | 0.000 | 0.620 | 12.420 | n/a | n/a | 0.024 | 4.390 | 0.152 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005df | 28.451 | 4.848 | 0.218 | 0.000 | 0.029 | 2.347 | 6.786 | 0.000 | 0.000 | 0.419 | 13.789 | n/a | n/a | 0.015 | 5.095 | 0.179 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b104742000000000000060a | 28.444 | 6.043 | 0.192 | 0.000 | 0.022 | 2.621 | 4.956 | 0.033 | 0.000 | 0.362 | 14.202 | n/a | n/a | 0.013 | 6.257 | 0.220 | 0.013 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005f3 | 28.102 | 3.356 | 0.211 | 0.000 | 0.036 | 2.320 | 4.457 | 0.000 | 0.000 | 0.500 | 17.205 | n/a | n/a | 0.017 | 3.604 | 0.128 | 0.017 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005be | 27.339 | 3.898 | 0.381 | 0.000 | 0.045 | 2.435 | 13.345 | 0.016 | 0.000 | 0.615 | 6.582 | n/a | n/a | 0.022 | 4.323 | 0.158 | 0.022 | gw-w/thread-49/gateway.admitted-work | none observed |
| b31f71e15b10474200000000000005cd | 26.878 | 3.836 | 0.361 | 0.000 | 0.064 | 2.474 | 8.828 | 0.048 | 0.000 | 0.400 | 10.843 | n/a | n/a | 0.024 | 4.262 | 0.159 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000600 | 25.339 | 4.922 | 0.437 | 0.000 | 0.039 | 2.420 | 4.756 | 0.055 | 0.000 | 0.604 | 12.088 | n/a | n/a | 0.020 | 5.397 | 0.213 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005e2 | 24.611 | 5.964 | n/a | 0.000 | 0.174 | 1.122 | 2.154 | 0.046 | 0.000 | 0.958 | 14.145 | n/a | n/a | 0.049 | 6.138 | 0.249 | 0.049 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005eb | 24.159 | 3.968 | 0.312 | 0.000 | 0.066 | 2.549 | 4.902 | 0.000 | 0.000 | 0.288 | 12.044 | n/a | n/a | 0.032 | 4.345 | 0.180 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005dc | 23.274 | 10.413 | n/a | 0.000 | 1.088 | 1.161 | 0.687 | 0.026 | 0.000 | 1.836 | 8.017 | n/a | n/a | 0.045 | 11.502 | 0.494 | 0.045 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005ba | 22.990 | 3.284 | 0.279 | 0.000 | 0.072 | 2.393 | 6.582 | 0.019 | 0.000 | 0.622 | 9.713 | n/a | n/a | 0.026 | 3.635 | 0.158 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000601 | 22.596 | 7.516 | n/a | 0.000 | 0.432 | 1.230 | 1.424 | 0.063 | 0.000 | 1.153 | 10.703 | n/a | n/a | 0.076 | 7.948 | 0.352 | 0.076 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.088 | 3.877 | n/a | 0.000 | 0.454 | 1.193 | 1.002 | 0.033 | 0.000 | 0.684 | 8.466 | n/a | n/a | 0.024 | 4.577 | 0.312 | 0.024 |
| p99 | 32.557 | 6.791 | n/a | 0.000 | 1.123 | 2.847 | 4.380 | 0.124 | 0.000 | 1.561 | 21.234 | n/a | n/a | 0.063 | 6.964 | 0.418 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b10474200000000000005f4 | 32.557 | 4.401 | n/a | 0.000 | 1.000 | 1.114 | 4.380 | 0.033 | 0.000 | 0.366 | 21.234 | n/a | n/a | 0.029 | 5.401 | 0.166 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005ef | 21.888 | 6.791 | n/a | 0.000 | 0.173 | 1.137 | 0.328 | 0.027 | 0.000 | 0.378 | 13.040 | n/a | n/a | 0.014 | 6.964 | 0.318 | 0.014 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005fa | 20.705 | 6.016 | n/a | 0.000 | 0.454 | 1.318 | 2.001 | 0.057 | 0.000 | 1.561 | 9.257 | n/a | n/a | 0.041 | 6.470 | 0.312 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005d8 | 18.557 | 3.672 | n/a | 0.000 | 0.853 | 1.309 | 1.177 | 0.124 | 0.000 | 0.822 | 10.584 | n/a | n/a | 0.017 | 4.525 | 0.244 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005e8 | 16.944 | 3.174 | n/a | 0.000 | 0.585 | 1.179 | 1.314 | 0.045 | 0.000 | 1.172 | 9.456 | n/a | n/a | 0.019 | 3.759 | 0.222 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005c6 | 16.890 | 3.680 | n/a | 0.000 | 0.221 | 1.193 | 1.015 | 0.050 | 0.000 | 0.671 | 10.038 | n/a | n/a | 0.021 | 3.902 | 0.231 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005e0 | 16.541 | 5.190 | n/a | 0.000 | 0.849 | 1.248 | 0.710 | 0.035 | 0.000 | 1.196 | 7.270 | n/a | n/a | 0.043 | 6.040 | 0.365 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005ce | 15.088 | 4.852 | n/a | 0.000 | 0.172 | 1.437 | 2.051 | 0.038 | 0.000 | 0.774 | 5.739 | n/a | n/a | 0.026 | 5.023 | 0.333 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005d4 | 15.021 | 3.146 | n/a | 0.000 | 0.040 | 1.147 | 0.307 | 0.028 | 0.000 | 0.893 | 9.439 | n/a | n/a | 0.020 | 3.187 | 0.212 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005ec | 14.919 | 3.877 | n/a | 0.000 | 0.063 | 1.157 | 0.682 | 0.051 | 0.000 | 0.599 | 8.466 | n/a | n/a | 0.024 | 3.940 | 0.264 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005b6 | 14.376 | 4.573 | n/a | 0.000 | 0.109 | 1.195 | 0.691 | 0.029 | 0.000 | 0.684 | 7.065 | n/a | n/a | 0.029 | 4.683 | 0.326 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005d0 | 13.818 | 4.490 | n/a | 0.000 | 0.798 | 1.162 | 0.604 | 0.028 | 0.000 | 0.862 | 5.842 | n/a | n/a | 0.033 | 5.289 | 0.383 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005f8 | 13.080 | 3.454 | n/a | 0.000 | 1.123 | 1.728 | 1.002 | 0.032 | 0.000 | 0.566 | 5.162 | n/a | n/a | 0.013 | 4.577 | 0.350 | 0.013 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b10474200000000000005fe | 10.903 | 3.583 | n/a | 0.000 | 0.970 | 2.847 | 3.431 | 0.010 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.063 | 4.553 | 0.418 | 0.063 | node-14/thread-0/driver.execute | none observed |

## P2 / L1024 / commit (851 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.500 | 3.478 | n/a | 0.000 | 0.716 | 1.225 | 0.780 | 0.030 | 0.000 | 0.571 | 9.740 | n/a | n/a | 0.015 | 4.484 | 0.250 | 0.015 |
| p99 | 112.465 | 41.963 | n/a | 2.167 | 54.475 | 14.042 | 12.600 | 6.392 | 0.427 | 8.821 | 70.810 | n/a | n/a | 0.044 | 66.432 | 1.000 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b1047420000000000000c31 | 151.393 | 4.424 | 0.195 | 0.000 | 0.025 | 27.677 | 53.134 | 0.094 | 15.548 | 8.697 | 41.581 | n/a | n/a | 0.019 | 4.643 | 0.031 | 0.019 | gw-w/thread-66/gateway.admitted-work | driver.publication 1.353ms; driver.expected-state.bind-receipt 1.261ms; driver.publication 1.214ms; driver.publication 1.180ms; driver.publication 1.150ms |
| b31f71e15b1047420000000000000c47 | 145.579 | 3.234 | n/a | 0.000 | 63.198 | 2.956 | 2.646 | 0.051 | 0.000 | 4.653 | 68.831 | n/a | n/a | 0.010 | 66.432 | 0.456 | 0.010 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.353ms; driver.expected-state.bind-receipt 1.261ms; driver.publication 1.214ms; driver.publication 1.161ms; driver.publication 1.142ms |
| b31f71e15b1047420000000000000c3a | 139.490 | 5.475 | n/a | 0.000 | 92.242 | 1.404 | 13.732 | 0.043 | 0.000 | 4.627 | 21.957 | n/a | n/a | 0.009 | 97.718 | 0.701 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.180ms; driver.publication 1.150ms; driver.publication 1.095ms; driver.expected-state.bind-receipt 1.064ms; driver.expected-state.bind-receipt 1.060ms |
| b31f71e15b1047420000000000000c3f | 128.964 | 3.239 | n/a | 0.000 | 90.563 | 1.533 | 2.098 | 0.052 | 0.000 | 11.453 | 20.018 | n/a | n/a | 0.009 | 93.802 | 0.727 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.expected-state.bind-receipt 1.261ms; driver.publication 1.214ms; driver.publication 1.180ms; driver.publication 1.150ms; driver.publication 1.095ms |
| b31f71e15b104742000000000000095c | 128.771 | 2.315 | n/a | 0.000 | 37.681 | 6.442 | 2.114 | 0.025 | 0.000 | 8.310 | 71.874 | n/a | n/a | 0.009 | 39.996 | 0.311 | 0.009 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.399ms; driver.publication 1.058ms; driver.expected-state.bind-receipt 1.017ms |
| b31f71e15b1047420000000000000963 | 121.744 | 2.489 | n/a | 0.000 | 83.461 | 9.755 | 0.230 | 0.035 | 0.000 | 8.862 | 16.902 | n/a | n/a | 0.010 | 85.950 | 0.706 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.058ms |
| b31f71e15b1047420000000000000953 | 121.330 | 3.316 | 0.375 | 0.000 | 0.029 | 2.349 | 19.433 | 0.010 | 0.000 | 0.194 | 95.603 | n/a | n/a | 0.020 | 3.720 | 0.031 | 0.020 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 1.399ms; driver.expected-state.bind-receipt 1.017ms |
| b31f71e15b1047420000000000000956 | 118.168 | 2.188 | n/a | 0.000 | 0.952 | 2.544 | 1.719 | 0.022 | 0.000 | 0.868 | 109.854 | n/a | n/a | 0.022 | 3.140 | 0.027 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.399ms; driver.publication 1.058ms; driver.expected-state.bind-receipt 1.017ms |
| b31f71e15b1047420000000000000957 | 112.465 | 2.668 | n/a | 0.000 | 1.004 | 1.117 | 0.754 | 0.000 | 0.000 | 0.295 | 106.612 | n/a | n/a | 0.016 | 3.671 | 0.033 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.399ms; driver.expected-state.bind-receipt 1.017ms |
| b31f71e15b1047420000000000000c2d | 108.704 | 5.255 | n/a | 0.000 | 1.291 | 7.768 | 2.540 | 0.031 | 0.000 | 0.690 | 91.118 | n/a | n/a | 0.010 | 6.546 | 0.060 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.397ms; driver.publication 1.095ms; driver.expected-state.bind-receipt 1.064ms; driver.publication 1.004ms; driver.publication 0.804ms |
| b31f71e15b1047420000000000000955 | 106.894 | 4.735 | n/a | 0.000 | 0.199 | 10.439 | 2.281 | 0.059 | 0.000 | 6.563 | 82.608 | n/a | n/a | 0.011 | 4.934 | 0.046 | 0.011 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.399ms; driver.expected-state.bind-receipt 1.017ms |
| b31f71e15b1047420000000000000c37 | 105.352 | 2.812 | n/a | 0.000 | 72.045 | 1.992 | 0.356 | 1.027 | 0.000 | 1.942 | 25.172 | n/a | n/a | 0.006 | 74.857 | 0.711 | 0.006 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.180ms; driver.publication 1.150ms; driver.publication 1.095ms; driver.expected-state.bind-receipt 1.064ms; driver.expected-state.bind-receipt 1.060ms |
| b31f71e15b1047420000000000000968 | 104.801 | 2.433 | n/a | 0.000 | 91.240 | 1.534 | 0.623 | 0.031 | 0.000 | 0.587 | 8.347 | n/a | n/a | 0.008 | 93.673 | 0.894 | 0.008 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.058ms; driver.publication 1.020ms |
| b31f71e15b1047420000000000000a3a | 101.292 | 6.636 | n/a | 0.000 | 0.957 | 68.753 | 0.680 | 0.024 | 0.000 | 2.270 | 21.952 | n/a | n/a | 0.021 | 7.592 | 0.075 | 0.021 | node-14/thread-0/socket.wait-first-byte | client.parse 1.848ms |
| b31f71e15b1047420000000000000959 | 100.793 | 2.499 | n/a | 0.000 | 0.327 | 2.459 | 1.518 | 0.030 | 0.000 | 1.443 | 92.505 | n/a | n/a | 0.012 | 2.827 | 0.028 | 0.012 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.058ms; driver.expected-state.bind-receipt 0.023ms |
| b31f71e15b1047420000000000000951 | 91.152 | 2.303 | n/a | 0.000 | 24.384 | 1.038 | 0.383 | 0.000 | 0.000 | 0.645 | 62.389 | n/a | n/a | 0.009 | 26.687 | 0.293 | 0.009 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.399ms; driver.expected-state.bind-receipt 1.017ms; driver.publication 1.008ms |
| b31f71e15b1047420000000000000a3b | 87.731 | 2.660 | n/a | 0.000 | 0.655 | 70.891 | 0.705 | 0.026 | 0.000 | 8.271 | 4.505 | n/a | n/a | 0.017 | 3.315 | 0.038 | 0.017 | node-14/thread-0/socket.wait-first-byte | client.parse 1.848ms; driver.publication 1.488ms; driver.expected-state.bind-receipt 1.340ms |
| b31f71e15b1047420000000000000c30 | 86.647 | 4.554 | n/a | 0.000 | 3.203 | 6.835 | 11.807 | 0.083 | 0.000 | 3.332 | 56.820 | n/a | n/a | 0.013 | 7.758 | 0.090 | 0.013 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 1.004ms |
| b31f71e15b1047420000000000000c2f | 83.122 | 6.036 | n/a | 0.000 | 0.385 | 1.123 | 1.255 | 0.034 | 0.000 | 9.412 | 64.862 | n/a | n/a | 0.016 | 6.420 | 0.077 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b31f71e15b1047420000000000000688 | 82.812 | 4.284 | n/a | 0.000 | 0.151 | 2.308 | 1.670 | 2.339 | 0.000 | 1.233 | 70.810 | n/a | n/a | 0.016 | 4.435 | 0.054 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.540ms; driver.publication 1.128ms; driver.publication 1.111ms; driver.publication 1.046ms |

## P2 / L1024 / commit / 5-10 facts (493 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.266 | 3.065 | n/a | 0.000 | 0.752 | 1.211 | 0.595 | 0.030 | 0.000 | 0.517 | 8.721 | n/a | n/a | 0.014 | 4.015 | 0.243 | 0.014 |
| p99 | 104.801 | 41.963 | n/a | 2.167 | 56.423 | 11.881 | 8.222 | 6.558 | 0.281 | 8.310 | 62.389 | n/a | n/a | 0.045 | 65.369 | 1.000 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b1047420000000000000c3f | 128.964 | 3.239 | n/a | 0.000 | 90.563 | 1.533 | 2.098 | 0.052 | 0.000 | 11.453 | 20.018 | n/a | n/a | 0.009 | 93.802 | 0.727 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.expected-state.bind-receipt 1.261ms; driver.publication 1.214ms; driver.publication 1.180ms; driver.publication 1.150ms; driver.publication 1.095ms |
| b31f71e15b104742000000000000095c | 128.771 | 2.315 | n/a | 0.000 | 37.681 | 6.442 | 2.114 | 0.025 | 0.000 | 8.310 | 71.874 | n/a | n/a | 0.009 | 39.996 | 0.311 | 0.009 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.399ms; driver.publication 1.058ms; driver.expected-state.bind-receipt 1.017ms |
| b31f71e15b1047420000000000000963 | 121.744 | 2.489 | n/a | 0.000 | 83.461 | 9.755 | 0.230 | 0.035 | 0.000 | 8.862 | 16.902 | n/a | n/a | 0.010 | 85.950 | 0.706 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.058ms |
| b31f71e15b1047420000000000000956 | 118.168 | 2.188 | n/a | 0.000 | 0.952 | 2.544 | 1.719 | 0.022 | 0.000 | 0.868 | 109.854 | n/a | n/a | 0.022 | 3.140 | 0.027 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.399ms; driver.publication 1.058ms; driver.expected-state.bind-receipt 1.017ms |
| b31f71e15b1047420000000000000968 | 104.801 | 2.433 | n/a | 0.000 | 91.240 | 1.534 | 0.623 | 0.031 | 0.000 | 0.587 | 8.347 | n/a | n/a | 0.008 | 93.673 | 0.894 | 0.008 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.058ms; driver.publication 1.020ms |
| b31f71e15b1047420000000000000959 | 100.793 | 2.499 | n/a | 0.000 | 0.327 | 2.459 | 1.518 | 0.030 | 0.000 | 1.443 | 92.505 | n/a | n/a | 0.012 | 2.827 | 0.028 | 0.012 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.058ms; driver.expected-state.bind-receipt 0.023ms |
| b31f71e15b1047420000000000000951 | 91.152 | 2.303 | n/a | 0.000 | 24.384 | 1.038 | 0.383 | 0.000 | 0.000 | 0.645 | 62.389 | n/a | n/a | 0.009 | 26.687 | 0.293 | 0.009 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.399ms; driver.expected-state.bind-receipt 1.017ms; driver.publication 1.008ms |
| b31f71e15b1047420000000000000a3b | 87.731 | 2.660 | n/a | 0.000 | 0.655 | 70.891 | 0.705 | 0.026 | 0.000 | 8.271 | 4.505 | n/a | n/a | 0.017 | 3.315 | 0.038 | 0.017 | node-14/thread-0/socket.wait-first-byte | client.parse 1.848ms; driver.publication 1.488ms; driver.expected-state.bind-receipt 1.340ms |
| b31f71e15b1047420000000000000708 | 79.440 | 2.627 | n/a | 0.000 | 50.050 | 1.125 | 0.434 | 0.036 | 0.000 | 2.404 | 22.755 | n/a | n/a | 0.010 | 52.677 | 0.663 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.723ms; driver.publication 1.517ms; driver.publication 1.420ms; driver.publication 1.395ms; driver.publication 1.384ms |
| b31f71e15b1047420000000000000684 | 78.992 | 3.805 | n/a | 0.000 | 0.093 | 1.486 | 0.362 | 0.025 | 0.000 | 0.555 | 72.647 | n/a | n/a | 0.020 | 3.897 | 0.049 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 2.540ms |
| b31f71e15b104742000000000000068a | 77.402 | 5.105 | n/a | 0.000 | 1.466 | 5.479 | 8.222 | 0.059 | 0.000 | 4.225 | 52.829 | n/a | n/a | 0.016 | 6.571 | 0.085 | 0.016 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.128ms; driver.publication 1.111ms; driver.publication 1.046ms; driver.publication 1.001ms; driver.publication 0.187ms |
| b31f71e15b1047420000000000000c32 | 74.803 | 4.151 | n/a | 0.000 | 0.782 | 14.042 | 0.134 | 0.000 | 0.000 | 2.267 | 53.401 | n/a | n/a | 0.025 | 4.933 | 0.066 | 0.025 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 1.180ms; driver.publication 1.095ms; driver.expected-state.bind-receipt 1.064ms; driver.expected-state.bind-receipt 1.060ms; driver.publication 1.004ms |
| b31f71e15b1047420000000000000a3e | 73.018 | 4.305 | n/a | 0.000 | 51.786 | 1.201 | 0.362 | 0.022 | 0.000 | 0.219 | 15.111 | n/a | n/a | 0.012 | 56.091 | 0.768 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.488ms; driver.expected-state.bind-receipt 1.340ms; driver.publication 1.177ms |
| b31f71e15b10474200000000000006a7 | 71.934 | 2.721 | n/a | 0.000 | 56.423 | 1.240 | 0.427 | 0.029 | 0.000 | 0.600 | 10.483 | n/a | n/a | 0.009 | 59.145 | 0.822 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.079ms; driver.publication 1.036ms |
| b31f71e15b1047420000000000000a3c | 71.780 | 3.385 | n/a | 0.000 | 56.626 | 6.240 | 0.383 | 0.028 | 0.000 | 0.438 | 4.662 | n/a | n/a | 0.017 | 60.011 | 0.836 | 0.017 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.488ms; driver.expected-state.bind-receipt 1.340ms; driver.publication 1.177ms |
| b31f71e15b1047420000000000000c33 | 69.534 | 2.380 | n/a | 0.000 | 0.649 | 11.881 | 19.797 | 0.041 | 0.000 | 9.406 | 25.363 | n/a | n/a | 0.017 | 3.029 | 0.044 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.180ms; driver.publication 1.150ms; driver.publication 1.095ms; driver.expected-state.bind-receipt 1.064ms; driver.expected-state.bind-receipt 1.060ms |
| b31f71e15b1047420000000000000687 | 69.255 | 4.584 | n/a | 0.000 | 0.688 | 2.672 | 0.425 | 0.036 | 0.000 | 4.864 | 55.960 | n/a | n/a | 0.024 | 5.273 | 0.076 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.540ms; driver.publication 1.128ms; driver.publication 1.046ms |
| b31f71e15b1047420000000000000701 | 66.711 | 65.891 | n/a | 0.000 | 0.809 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 66.699 | 1.000 | 0.012 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.420ms; driver.publication 1.384ms; driver.publication 1.232ms |
| b31f71e15b10474200000000000007e5 | 66.327 | 2.584 | n/a | 0.000 | 10.865 | 1.810 | 10.573 | 0.056 | 20.956 | 7.059 | 12.415 | n/a | n/a | 0.008 | 13.449 | 0.203 | 0.008 | gw-w/thread--1/jdk.GCPhasePause | client.encode 2.263ms; driver.publication 1.228ms |
| b31f71e15b1047420000000000000696 | 65.383 | 64.472 | n/a | 0.000 | 0.897 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 65.369 | 1.000 | 0.014 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.553ms; driver.publication 1.148ms; driver.publication 1.138ms; driver.publication 1.036ms; driver.publication 1.001ms |

## P2 / tail / commit (2617 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.102 | 3.560 | n/a | 0.000 | 0.763 | 1.160 | 0.743 | 0.031 | 0.000 | 0.464 | 8.281 | n/a | n/a | 0.013 | 4.594 | 0.282 | 0.013 |
| p99 | 81.884 | 38.863 | n/a | 2.197 | 38.629 | 19.365 | 7.617 | 4.383 | 0.000 | 5.813 | 44.979 | n/a | n/a | 0.044 | 60.710 | 1.000 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b1047420000000000000e4e | 143.984 | 7.387 | n/a | 0.000 | 118.969 | 3.398 | 1.391 | 0.032 | 0.000 | 0.514 | 12.276 | n/a | n/a | 0.018 | 126.356 | 0.878 | 0.018 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.872ms; driver.publication 1.396ms; driver.publication 1.353ms; driver.publication 1.176ms; client.parse 1.164ms |
| b31f71e15b1047420000000000000e59 | 143.775 | 11.412 | n/a | 0.000 | 107.635 | 1.169 | 0.970 | 0.037 | 0.000 | 5.553 | 16.985 | n/a | n/a | 0.014 | 119.048 | 0.828 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.938ms; driver.publication 1.872ms; driver.publication 1.579ms; driver.publication 1.471ms; driver.expected-state.bind-receipt 1.463ms |
| b31f71e15b1047420000000000000e51 | 141.587 | 5.406 | n/a | 0.000 | 111.247 | 1.717 | 1.273 | 0.056 | 0.000 | 3.053 | 18.812 | n/a | n/a | 0.023 | 116.653 | 0.824 | 0.023 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.872ms; driver.publication 1.426ms; driver.publication 1.396ms; driver.publication 1.353ms; driver.publication 1.338ms |
| b31f71e15b104742000000000000163c | 126.691 | 4.577 | n/a | 0.000 | 62.358 | 3.000 | 1.825 | 0.039 | 0.000 | 0.646 | 54.233 | n/a | n/a | 0.012 | 66.935 | 0.528 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 2.567ms; client.encode 1.648ms; driver.publication 1.636ms; driver.publication 1.484ms; driver.publication 1.427ms |
| b31f71e15b1047420000000000000e43 | 123.813 | 99.272 | n/a | 8.804 | 15.722 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 123.799 | 1.000 | 0.015 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.353ms; client.parse 1.164ms; driver.publication 1.082ms |
| b31f71e15b1047420000000000000e42 | 123.065 | 5.818 | n/a | 0.000 | 20.208 | 52.686 | 1.582 | 0.051 | 0.000 | 7.320 | 35.387 | n/a | n/a | 0.013 | 26.026 | 0.211 | 0.013 | node-14/thread-0/socket.wait-first-byte | client.parse 1.164ms |
| b31f71e15b1047420000000000000e44 | 122.504 | 101.001 | n/a | 8.804 | 12.685 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 122.490 | 1.000 | 0.014 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.353ms; client.parse 1.164ms; driver.publication 1.082ms |
| b31f71e15b1047420000000000000e45 | 120.697 | 107.047 | n/a | 8.804 | 4.833 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 120.685 | 1.000 | 0.012 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.353ms; client.parse 1.164ms; driver.publication 1.082ms; driver.publication 1.067ms |
| b31f71e15b1047420000000000000e56 | 120.695 | 11.367 | n/a | 0.000 | 83.757 | 1.582 | 2.330 | 0.038 | 0.000 | 0.801 | 20.807 | n/a | n/a | 0.013 | 95.125 | 0.788 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.938ms; driver.publication 1.872ms; driver.publication 1.471ms; driver.publication 1.426ms; driver.publication 1.396ms |
| b31f71e15b1047420000000000001646 | 119.509 | 2.413 | n/a | 0.000 | 104.331 | 1.072 | 2.182 | 0.036 | 0.000 | 0.609 | 8.854 | n/a | n/a | 0.012 | 106.745 | 0.893 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 2.227ms; client.encode 1.648ms; driver.publication 1.484ms; driver.publication 1.427ms; driver.publication 1.265ms |
| b31f71e15b1047420000000000000e47 | 115.083 | 3.251 | n/a | 0.000 | 6.790 | 47.273 | 0.546 | 39.089 | 0.000 | 0.937 | 17.185 | n/a | n/a | 0.013 | 10.041 | 0.087 | 0.013 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.353ms; client.parse 1.164ms; driver.publication 1.082ms; driver.publication 1.067ms |
| b31f71e15b1047420000000000001f42 | 111.390 | 2.795 | n/a | 0.000 | 96.280 | 1.065 | 0.159 | 0.000 | 0.000 | 1.270 | 9.813 | n/a | n/a | 0.009 | 99.075 | 0.889 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.427ms; driver.publication 1.203ms; driver.publication 1.197ms; driver.publication 1.191ms; driver.publication 1.090ms |
| b31f71e15b104742000000000000164a | 109.934 | 2.663 | n/a | 0.000 | 97.238 | 1.074 | 0.558 | 0.034 | 0.000 | 0.296 | 8.060 | n/a | n/a | 0.011 | 99.901 | 0.909 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 2.227ms; client.encode 1.648ms; driver.publication 1.265ms; driver.publication 1.148ms; driver.publication 1.120ms |
| b31f71e15b1047420000000000001640 | 108.387 | 3.646 | n/a | 0.000 | 89.037 | 1.065 | 1.837 | 0.045 | 0.000 | 0.891 | 11.859 | n/a | n/a | 0.008 | 92.683 | 0.855 | 0.008 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 2.227ms; client.encode 1.648ms; driver.publication 1.484ms; driver.publication 1.427ms; driver.publication 1.265ms |
| b31f71e15b1047420000000000001f3d | 107.639 | 4.448 | n/a | 0.000 | 70.716 | 4.458 | 0.698 | 0.032 | 0.000 | 0.472 | 26.808 | n/a | n/a | 0.007 | 75.164 | 0.698 | 0.007 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.203ms; driver.publication 1.197ms; driver.publication 1.191ms; driver.publication 1.090ms; driver.publication 1.088ms |
| b31f71e15b1047420000000000001cec | 107.215 | 4.235 | n/a | 0.000 | 1.524 | 52.441 | 1.083 | 0.030 | 0.000 | 1.984 | 45.901 | n/a | n/a | 0.016 | 5.760 | 0.054 | 0.016 | node-14/thread-0/socket.wait-first-byte | client.parse 1.242ms |
| b31f71e15b1047420000000000000e48 | 106.290 | 5.316 | n/a | 0.000 | 0.086 | 47.066 | 1.218 | 32.940 | 0.000 | 0.701 | 18.935 | n/a | n/a | 0.029 | 5.402 | 0.051 | 0.029 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.353ms; driver.publication 1.176ms; client.parse 1.164ms; driver.publication 1.082ms; driver.publication 1.067ms |
| b31f71e15b1047420000000000000e49 | 101.701 | 9.158 | n/a | 0.000 | 1.031 | 60.822 | 0.211 | 9.657 | 0.719 | 0.345 | 19.723 | n/a | n/a | 0.035 | 10.189 | 0.100 | 0.035 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.396ms; driver.publication 1.353ms; driver.publication 1.176ms; client.parse 1.164ms; driver.publication 1.082ms |
| b31f71e15b1047420000000000001530 | 98.857 | 2.715 | n/a | 0.000 | 70.794 | 2.320 | 0.506 | 0.036 | 0.000 | 0.785 | 21.691 | n/a | n/a | 0.009 | 73.509 | 0.744 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 21.763ms; driver.expected-state.bind-receipt 1.836ms; driver.publication 1.729ms; driver.publication 1.348ms; driver.publication 1.138ms |
| b31f71e15b1047420000000000001ced | 98.486 | 1.947 | n/a | 0.000 | 0.068 | 72.912 | 1.506 | 0.085 | 0.000 | 6.821 | 15.135 | n/a | n/a | 0.012 | 2.015 | 0.020 | 0.012 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.274ms; client.parse 1.242ms |

## P2 / tail / commit / 5-10 facts (1555 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.927 | 3.107 | n/a | 0.000 | 0.778 | 1.157 | 0.588 | 0.030 | 0.000 | 0.451 | 7.841 | n/a | n/a | 0.013 | 4.101 | 0.272 | 0.013 |
| p99 | 84.194 | 28.637 | n/a | 2.197 | 35.030 | 26.046 | 5.333 | 4.955 | 0.000 | 5.813 | 44.940 | n/a | n/a | 0.049 | 55.963 | 1.000 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b31f71e15b1047420000000000000e51 | 141.587 | 5.406 | n/a | 0.000 | 111.247 | 1.717 | 1.273 | 0.056 | 0.000 | 3.053 | 18.812 | n/a | n/a | 0.023 | 116.653 | 0.824 | 0.023 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.872ms; driver.publication 1.426ms; driver.publication 1.396ms; driver.publication 1.353ms; driver.publication 1.338ms |
| b31f71e15b1047420000000000000e43 | 123.813 | 99.272 | n/a | 8.804 | 15.722 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 123.799 | 1.000 | 0.015 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.353ms; client.parse 1.164ms; driver.publication 1.082ms |
| b31f71e15b1047420000000000000e42 | 123.065 | 5.818 | n/a | 0.000 | 20.208 | 52.686 | 1.582 | 0.051 | 0.000 | 7.320 | 35.387 | n/a | n/a | 0.013 | 26.026 | 0.211 | 0.013 | node-14/thread-0/socket.wait-first-byte | client.parse 1.164ms |
| b31f71e15b1047420000000000000e44 | 122.504 | 101.001 | n/a | 8.804 | 12.685 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 122.490 | 1.000 | 0.014 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.353ms; client.parse 1.164ms; driver.publication 1.082ms |
| b31f71e15b1047420000000000001646 | 119.509 | 2.413 | n/a | 0.000 | 104.331 | 1.072 | 2.182 | 0.036 | 0.000 | 0.609 | 8.854 | n/a | n/a | 0.012 | 106.745 | 0.893 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 2.227ms; client.encode 1.648ms; driver.publication 1.484ms; driver.publication 1.427ms; driver.publication 1.265ms |
| b31f71e15b1047420000000000000e47 | 115.083 | 3.251 | n/a | 0.000 | 6.790 | 47.273 | 0.546 | 39.089 | 0.000 | 0.937 | 17.185 | n/a | n/a | 0.013 | 10.041 | 0.087 | 0.013 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.353ms; client.parse 1.164ms; driver.publication 1.082ms; driver.publication 1.067ms |
| b31f71e15b1047420000000000001f42 | 111.390 | 2.795 | n/a | 0.000 | 96.280 | 1.065 | 0.159 | 0.000 | 0.000 | 1.270 | 9.813 | n/a | n/a | 0.009 | 99.075 | 0.889 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.427ms; driver.publication 1.203ms; driver.publication 1.197ms; driver.publication 1.191ms; driver.publication 1.090ms |
| b31f71e15b104742000000000000164a | 109.934 | 2.663 | n/a | 0.000 | 97.238 | 1.074 | 0.558 | 0.034 | 0.000 | 0.296 | 8.060 | n/a | n/a | 0.011 | 99.901 | 0.909 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 2.227ms; client.encode 1.648ms; driver.publication 1.265ms; driver.publication 1.148ms; driver.publication 1.120ms |
| b31f71e15b1047420000000000001f3d | 107.639 | 4.448 | n/a | 0.000 | 70.716 | 4.458 | 0.698 | 0.032 | 0.000 | 0.472 | 26.808 | n/a | n/a | 0.007 | 75.164 | 0.698 | 0.007 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.203ms; driver.publication 1.197ms; driver.publication 1.191ms; driver.publication 1.090ms; driver.publication 1.088ms |
| b31f71e15b1047420000000000001cec | 107.215 | 4.235 | n/a | 0.000 | 1.524 | 52.441 | 1.083 | 0.030 | 0.000 | 1.984 | 45.901 | n/a | n/a | 0.016 | 5.760 | 0.054 | 0.016 | node-14/thread-0/socket.wait-first-byte | client.parse 1.242ms |
| b31f71e15b1047420000000000000e48 | 106.290 | 5.316 | n/a | 0.000 | 0.086 | 47.066 | 1.218 | 32.940 | 0.000 | 0.701 | 18.935 | n/a | n/a | 0.029 | 5.402 | 0.051 | 0.029 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.353ms; driver.publication 1.176ms; client.parse 1.164ms; driver.publication 1.082ms; driver.publication 1.067ms |
| b31f71e15b1047420000000000000e49 | 101.701 | 9.158 | n/a | 0.000 | 1.031 | 60.822 | 0.211 | 9.657 | 0.719 | 0.345 | 19.723 | n/a | n/a | 0.035 | 10.189 | 0.100 | 0.035 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.396ms; driver.publication 1.353ms; driver.publication 1.176ms; client.parse 1.164ms; driver.publication 1.082ms |
| b31f71e15b1047420000000000001530 | 98.857 | 2.715 | n/a | 0.000 | 70.794 | 2.320 | 0.506 | 0.036 | 0.000 | 0.785 | 21.691 | n/a | n/a | 0.009 | 73.509 | 0.744 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 21.763ms; driver.expected-state.bind-receipt 1.836ms; driver.publication 1.729ms; driver.publication 1.348ms; driver.publication 1.138ms |
| b31f71e15b1047420000000000001ced | 98.486 | 1.947 | n/a | 0.000 | 0.068 | 72.912 | 1.506 | 0.085 | 0.000 | 6.821 | 15.135 | n/a | n/a | 0.012 | 2.015 | 0.020 | 0.012 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.274ms; client.parse 1.242ms |
| b31f71e15b1047420000000000001627 | 98.153 | 7.711 | n/a | 0.000 | 18.703 | 1.068 | 5.943 | 0.019 | 28.640 | 1.170 | 34.884 | n/a | n/a | 0.014 | 26.414 | 0.269 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 5.614ms; driver.publication 4.107ms; driver.publication 1.900ms |
| b31f71e15b10474200000000000016a3 | 84.194 | 6.156 | n/a | 0.000 | 49.807 | 6.949 | 2.037 | 0.089 | 0.000 | 5.311 | 13.824 | n/a | n/a | 0.021 | 55.963 | 0.665 | 0.021 | node-14/thread-0/driver.queue (scheduler/subject/admission) | none observed |
| b31f71e15b10474200000000000019bb | 81.884 | 6.174 | n/a | 0.000 | 3.726 | 19.020 | 5.398 | 2.124 | 0.000 | 1.007 | 44.418 | n/a | n/a | 0.017 | 9.899 | 0.121 | 0.017 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.publication 1.109ms; driver.publication 1.102ms; driver.publication 1.068ms; driver.publication 1.046ms |
| b31f71e15b10474200000000000016aa | 81.648 | 4.007 | n/a | 0.000 | 65.783 | 1.549 | 0.235 | 0.028 | 0.000 | 0.676 | 9.362 | n/a | n/a | 0.009 | 69.790 | 0.855 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.479ms; driver.publication 1.197ms; driver.publication 1.080ms; driver.publication 1.078ms; driver.publication 1.053ms |
| b31f71e15b1047420000000000001cee | 80.828 | 2.353 | n/a | 0.000 | 0.201 | 64.956 | 0.740 | 0.040 | 0.000 | 0.729 | 11.795 | n/a | n/a | 0.014 | 2.553 | 0.032 | 0.014 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.274ms; client.parse 1.242ms |
| b31f71e15b1047420000000000001f35 | 80.318 | 2.669 | n/a | 0.000 | 23.192 | 5.960 | 0.608 | 0.019 | 0.000 | 6.257 | 41.604 | n/a | n/a | 0.009 | 25.861 | 0.322 | 0.009 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.520ms; driver.publication 1.317ms; driver.publication 1.197ms; driver.publication 1.088ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.273 | 0.086 | n/a | 0.000 | 0.000 | 2.972 | 198.188 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.135 | 0.086 | 0.000 | 0.135 |
| p99 | 202.886 | 26.017 | n/a | 2.605 | 0.000 | 8.589 | 199.336 | 0.128 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.300 | 28.621 | 0.318 | 0.300 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a0ec6c3258cff330000000000000007 | 202.886 | 0.086 | n/a | 0.000 | 0.000 | 3.114 | 199.263 | 0.027 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.287 | 0.086 | 0.000 | 0.287 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff330000000000000006 | 202.705 | 0.106 | n/a | 0.000 | 0.000 | 2.950 | 199.336 | 0.036 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.086 | 0.106 | 0.001 | 0.086 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff330000000000000005 | 202.481 | 0.043 | n/a | 0.000 | 0.000 | 2.972 | 199.100 | 0.035 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.210 | 0.043 | 0.000 | 0.210 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff330000000000000f50 | 201.366 | 0.029 | n/a | 0.000 | 0.000 | 2.890 | 198.346 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.066 | 0.029 | 0.000 | 0.066 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff330000000000000f4f | 201.354 | 0.049 | n/a | 0.000 | 0.000 | 2.982 | 198.188 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.100 | 0.049 | 0.000 | 0.100 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff330000000000000f51 | 201.273 | 0.020 | n/a | 0.000 | 0.000 | 2.839 | 198.331 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.044 | 0.020 | 0.000 | 0.044 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000002 | 134.833 | 1.501 | n/a | 0.000 | 0.000 | 2.942 | 129.963 | 0.128 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.300 | 1.501 | 0.011 | 0.300 | gw-r/thread-49/gateway.admitted-work | none observed |
| 1a0ec6c3258cff330000000000000f54 | 90.066 | 26.017 | n/a | 2.605 | 0.000 | 8.589 | 52.720 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.135 | 28.621 | 0.318 | 0.135 | gw-r/thread-52/gateway.admitted-work | none observed |
| 1a0ec6c3258cff330000000000000f55 | 75.658 | 21.499 | n/a | 0.000 | 0.000 | 4.839 | 49.161 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.159 | 21.499 | 0.284 | 0.159 | gw-r/thread-51/gateway.admitted-work | none observed |
| 1a0ec6c3258cff330000000000000f56 | 55.074 | 14.481 | n/a | 0.000 | 0.000 | 4.938 | 35.486 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.169 | 14.481 | 0.263 | 0.169 | gw-r/thread-52/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 814.364 | 0.168 | n/a | 0.000 | 0.000 | 2.963 | 797.164 | 0.025 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.292 | 0.168 | 0.000 | 0.292 |
| p99 | 1005.594 | 13.552 | n/a | 0.000 | 0.000 | 3.216 | 1001.103 | 0.030 | 0.000 | 0.118 | 0.000 | n/a | n/a | 1.217 | 13.552 | 0.017 | 1.217 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fbbaa8aea79184a00000000000000a4 | 1005.594 | 0.168 | n/a | 0.000 | 0.000 | 2.963 | 1001.103 | 0.025 | 0.000 | 0.118 | 0.000 | n/a | n/a | 1.217 | 0.168 | 0.000 | 1.217 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000a5 | 814.364 | 13.552 | n/a | 0.000 | 0.000 | 3.216 | 797.164 | 0.030 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.292 | 13.552 | 0.017 | 0.292 | gw-r/thread-52/journal/page | none observed |

## P3 / warmup / internal (30 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 394.496 | 2.789 | n/a | 0.000 | 0.000 | 3.008 | 388.347 | 0.023 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.108 | 2.789 | 0.007 | 0.108 |
| p99 | 1004.768 | 7.392 | n/a | 0.000 | 0.000 | 4.418 | 999.456 | 0.600 | 0.000 | 0.191 | 0.000 | n/a | n/a | 1.135 | 7.392 | 0.558 | 1.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fbbaa8aea79184a00000000000000bb | 1004.768 | 0.133 | n/a | 0.000 | 0.000 | 3.868 | 999.456 | 0.031 | 0.000 | 0.154 | 0.000 | n/a | n/a | 1.126 | 0.133 | 0.000 | 1.126 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000b4 | 1003.692 | 0.135 | n/a | 0.000 | 0.000 | 2.788 | 999.358 | 0.084 | 0.000 | 0.191 | 0.000 | n/a | n/a | 1.135 | 0.135 | 0.000 | 1.135 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000d1 | 990.252 | 4.176 | n/a | 0.000 | 0.000 | 3.096 | 982.813 | 0.014 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.080 | 4.176 | 0.004 | 0.080 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000bd | 987.110 | 2.462 | n/a | 0.000 | 0.000 | 3.008 | 981.419 | 0.015 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.087 | 2.462 | 0.002 | 0.087 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000ae | 936.073 | 1.766 | n/a | 0.000 | 0.000 | 2.910 | 931.223 | 0.016 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.073 | 1.766 | 0.002 | 0.073 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000ab | 792.165 | 3.856 | n/a | 0.000 | 0.000 | 3.077 | 785.012 | 0.019 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.122 | 3.856 | 0.005 | 0.122 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000b2 | 731.093 | 5.449 | n/a | 0.000 | 0.000 | 4.418 | 720.947 | 0.029 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.162 | 5.449 | 0.007 | 0.162 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000c3 | 720.991 | 7.138 | n/a | 0.000 | 0.000 | 3.167 | 710.455 | 0.024 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.124 | 7.138 | 0.010 | 0.124 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000a8 | 714.796 | 2.094 | n/a | 0.000 | 0.000 | 2.879 | 709.620 | 0.024 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.099 | 2.094 | 0.003 | 0.099 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000ca | 684.882 | 2.883 | n/a | 0.000 | 0.000 | 3.004 | 678.799 | 0.014 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.118 | 2.883 | 0.004 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000c1 | 654.704 | 3.035 | n/a | 0.000 | 0.000 | 2.874 | 648.472 | 0.026 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.222 | 3.035 | 0.005 | 0.222 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000c7 | 645.875 | 4.537 | n/a | 0.000 | 0.000 | 3.067 | 637.465 | 0.600 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.133 | 4.537 | 0.007 | 0.133 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000cc | 584.469 | 2.312 | n/a | 0.000 | 0.000 | 2.937 | 578.546 | 0.532 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.077 | 2.312 | 0.004 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000a7 | 485.333 | 2.938 | n/a | 0.000 | 0.000 | 3.010 | 479.156 | 0.016 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.143 | 2.938 | 0.006 | 0.143 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000b8 | 442.885 | 2.685 | n/a | 0.000 | 0.000 | 2.968 | 437.040 | 0.022 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.078 | 2.685 | 0.006 | 0.078 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000b9 | 394.496 | 2.787 | n/a | 0.000 | 0.000 | 3.069 | 388.347 | 0.042 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.142 | 2.787 | 0.007 | 0.142 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000c6 | 349.941 | 2.667 | n/a | 0.000 | 0.000 | 3.002 | 344.084 | 0.021 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.080 | 2.667 | 0.008 | 0.080 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000c9 | 307.339 | 2.129 | n/a | 0.000 | 0.000 | 2.931 | 301.971 | 0.172 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.080 | 2.129 | 0.007 | 0.080 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000c4 | 284.067 | 5.701 | n/a | 0.000 | 0.000 | 3.462 | 274.698 | 0.017 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.108 | 5.701 | 0.020 | 0.108 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000cd | 275.964 | 2.035 | n/a | 0.000 | 0.000 | 3.147 | 270.617 | 0.016 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.071 | 2.035 | 0.007 | 0.071 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (44 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 340.636 | 4.604 | n/a | 0.000 | 0.000 | 3.040 | 325.600 | 0.019 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.126 | 5.244 | 0.017 | 0.126 |
| p99 | 1004.397 | 19.766 | n/a | 7.455 | 0.000 | 4.807 | 999.048 | 0.644 | 0.000 | 0.185 | 0.000 | n/a | n/a | 1.240 | 20.807 | 0.783 | 1.240 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fbbaa8aea79184a00000000000000e1 | 1004.397 | 0.183 | n/a | 0.000 | 0.000 | 4.187 | 998.590 | 0.039 | 0.000 | 0.185 | 0.000 | n/a | n/a | 1.213 | 0.183 | 0.000 | 1.213 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000104 | 1003.696 | 0.401 | n/a | 0.000 | 0.000 | 3.003 | 998.918 | 0.017 | 0.000 | 0.116 | 0.000 | n/a | n/a | 1.240 | 0.401 | 0.000 | 1.240 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000d2 | 1003.609 | 0.182 | n/a | 0.000 | 0.000 | 3.087 | 999.048 | 0.024 | 0.000 | 0.137 | 0.000 | n/a | n/a | 1.131 | 0.182 | 0.000 | 1.131 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000da | 1002.937 | 0.132 | n/a | 0.000 | 0.000 | 3.000 | 998.572 | 0.019 | 0.000 | 0.096 | 0.000 | n/a | n/a | 1.118 | 0.132 | 0.000 | 1.118 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000111 | 999.078 | 8.742 | n/a | 0.000 | 0.000 | 4.807 | 984.883 | 0.167 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.397 | 8.742 | 0.009 | 0.397 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000dc | 988.595 | 4.448 | n/a | 0.000 | 0.000 | 3.005 | 980.805 | 0.020 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.238 | 4.448 | 0.004 | 0.238 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000109 | 982.342 | 7.973 | n/a | 0.844 | 0.000 | 3.119 | 969.966 | 0.153 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.223 | 8.817 | 0.009 | 0.223 | gw-r/thread-49/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000d4 | 975.213 | 2.708 | n/a | 0.000 | 0.000 | 2.959 | 968.892 | 0.378 | 0.000 | 0.179 | 0.000 | n/a | n/a | 0.096 | 2.708 | 0.003 | 0.096 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000e0 | 964.586 | 2.304 | n/a | 0.000 | 0.000 | 3.040 | 958.798 | 0.251 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.117 | 2.304 | 0.002 | 0.117 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000101 | 921.050 | 7.743 | n/a | 1.404 | 0.000 | 3.175 | 908.250 | 0.295 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.105 | 9.146 | 0.010 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000e7 | 872.864 | 4.360 | n/a | 1.006 | 0.000 | 3.011 | 864.286 | 0.016 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.108 | 5.366 | 0.006 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000e3 | 742.380 | 18.495 | n/a | 2.312 | 0.000 | 3.171 | 717.957 | 0.243 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.139 | 20.807 | 0.028 | 0.139 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000106 | 706.608 | 7.206 | n/a | 0.000 | 0.000 | 3.122 | 696.050 | 0.021 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.124 | 7.206 | 0.010 | 0.124 | gw-r/thread-49/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000de | 600.159 | 2.490 | n/a | 0.000 | 0.000 | 2.953 | 594.507 | 0.023 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.091 | 2.490 | 0.004 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000eb | 589.903 | 12.947 | n/a | 7.455 | 0.000 | 3.003 | 565.609 | 0.465 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.309 | 20.402 | 0.035 | 0.309 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000ee | 578.426 | 2.809 | n/a | 0.000 | 0.000 | 2.976 | 572.417 | 0.032 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.106 | 2.809 | 0.005 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000fe | 519.465 | 7.085 | n/a | 1.154 | 0.000 | 3.516 | 507.510 | 0.019 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.104 | 8.239 | 0.016 | 0.104 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000ff | 485.525 | 5.521 | n/a | 0.789 | 0.000 | 3.002 | 475.875 | 0.019 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.240 | 6.311 | 0.013 | 0.240 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a000000000000010b | 476.879 | 19.766 | n/a | 1.040 | 0.000 | 3.217 | 452.685 | 0.020 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.114 | 20.806 | 0.044 | 0.114 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a00000000000000dd | 446.466 | 5.444 | n/a | 0.000 | 0.000 | 3.337 | 437.463 | 0.024 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.120 | 5.444 | 0.012 | 0.120 | gw-r/thread-49/journal/page | none observed |

## P3 / L4 / internal (41 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 458.422 | 3.395 | n/a | 0.000 | 0.000 | 3.030 | 450.266 | 0.013 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.097 | 3.635 | 0.010 | 0.097 |
| p99 | 1004.240 | 11.854 | n/a | 1.077 | 0.000 | 4.322 | 998.559 | 4.940 | 21.452 | 0.264 | 0.000 | n/a | n/a | 1.340 | 12.834 | 0.440 | 1.340 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fbbaa8aea79184a000000000000012f | 1004.240 | 0.125 | n/a | 0.000 | 0.000 | 4.140 | 998.559 | 0.013 | 0.000 | 0.064 | 0.000 | n/a | n/a | 1.340 | 0.125 | 0.000 | 1.340 | gw-r/thread-49/journal/page | none observed |
| 0fbbaa8aea79184a000000000000012a | 1004.185 | 2.612 | n/a | 0.689 | 0.000 | 2.931 | 997.806 | 0.013 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.089 | 3.301 | 0.003 | 0.089 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000145 | 1004.163 | 2.532 | n/a | 0.000 | 0.000 | 2.936 | 984.811 | 0.025 | 13.748 | 0.051 | 0.000 | n/a | n/a | 0.060 | 2.532 | 0.003 | 0.060 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000118 | 1002.803 | 0.120 | n/a | 0.000 | 0.000 | 2.975 | 998.484 | 0.010 | 0.000 | 0.070 | 0.000 | n/a | n/a | 1.144 | 0.120 | 0.000 | 1.144 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a000000000000012e | 1001.089 | 2.457 | n/a | 0.677 | 0.000 | 2.935 | 994.849 | 0.009 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.106 | 3.134 | 0.003 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a000000000000013c | 999.008 | 3.395 | n/a | 0.000 | 0.000 | 2.980 | 992.055 | 0.420 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.092 | 3.395 | 0.003 | 0.092 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000121 | 987.144 | 3.016 | n/a | 0.796 | 0.000 | 3.010 | 980.129 | 0.019 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.114 | 3.812 | 0.004 | 0.114 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a000000000000014c | 800.339 | 3.433 | n/a | 0.000 | 0.000 | 3.226 | 793.368 | 0.160 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.096 | 3.433 | 0.004 | 0.096 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000138 | 795.808 | 4.428 | n/a | 0.841 | 0.000 | 3.068 | 787.249 | 0.008 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.160 | 5.270 | 0.007 | 0.160 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000115 | 770.949 | 2.281 | n/a | 0.662 | 0.000 | 2.928 | 764.910 | 0.010 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.094 | 2.943 | 0.004 | 0.094 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000141 | 769.172 | 2.678 | n/a | 0.000 | 0.000 | 3.030 | 763.287 | 0.013 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.112 | 2.678 | 0.003 | 0.112 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000132 | 721.555 | 3.144 | n/a | 0.000 | 0.000 | 2.912 | 715.164 | 0.205 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.080 | 3.144 | 0.004 | 0.080 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a000000000000012b | 685.010 | 6.084 | n/a | 0.000 | 0.000 | 3.356 | 675.014 | 0.402 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.080 | 6.084 | 0.009 | 0.080 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000128 | 679.051 | 2.887 | n/a | 0.000 | 0.000 | 3.329 | 672.501 | 0.213 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.073 | 2.887 | 0.004 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000122 | 671.722 | 2.839 | n/a | 0.000 | 0.000 | 2.892 | 665.854 | 0.010 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.082 | 2.839 | 0.004 | 0.082 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000112 | 609.098 | 4.955 | n/a | 0.739 | 0.000 | 3.201 | 599.393 | 0.481 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.257 | 5.694 | 0.009 | 0.257 | gw-r/thread-49/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000139 | 601.495 | 5.701 | n/a | 0.000 | 0.000 | 3.292 | 591.620 | 0.580 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.242 | 5.701 | 0.009 | 0.242 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000146 | 567.732 | 8.050 | n/a | 1.077 | 0.000 | 2.899 | 555.336 | 0.014 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.297 | 9.126 | 0.016 | 0.297 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a000000000000013d | 509.209 | 11.854 | n/a | 0.980 | 0.000 | 3.030 | 493.149 | 0.011 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.141 | 12.834 | 0.025 | 0.141 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a000000000000013e | 498.541 | 7.256 | n/a | 0.000 | 0.000 | 3.018 | 487.937 | 0.009 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.211 | 7.256 | 0.015 | 0.211 | gw-r/thread-50/journal/page | none observed |

## P3 / L16 / internal (43 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 373.372 | 2.730 | n/a | 0.000 | 0.000 | 2.987 | 367.866 | 0.007 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.073 | 2.730 | 0.007 | 0.073 |
| p99 | 1008.746 | 7.537 | n/a | 0.760 | 0.000 | 5.484 | 1001.722 | 0.872 | 0.000 | 0.157 | 0.000 | n/a | n/a | 1.140 | 7.537 | 0.710 | 1.140 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fbbaa8aea79184a0000000000000168 | 1008.746 | 3.674 | n/a | 0.000 | 0.000 | 3.087 | 1001.722 | 0.148 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.081 | 3.674 | 0.004 | 0.081 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000171 | 1004.623 | 2.403 | n/a | 0.000 | 0.000 | 4.601 | 997.522 | 0.006 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.067 | 2.403 | 0.002 | 0.067 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000188 | 1002.701 | 0.152 | n/a | 0.000 | 0.000 | 2.987 | 998.370 | 0.008 | 0.000 | 0.045 | 0.000 | n/a | n/a | 1.140 | 0.152 | 0.000 | 1.140 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000177 | 1002.602 | 0.139 | n/a | 0.000 | 0.000 | 2.944 | 998.335 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 1.135 | 0.139 | 0.000 | 1.135 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a000000000000018a | 994.853 | 2.622 | n/a | 0.000 | 0.000 | 3.023 | 989.093 | 0.007 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.080 | 2.622 | 0.003 | 0.080 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000158 | 985.959 | 2.730 | n/a | 0.000 | 0.000 | 2.940 | 979.635 | 0.557 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.075 | 2.730 | 0.003 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000182 | 985.744 | 2.744 | n/a | 0.000 | 0.000 | 4.175 | 978.719 | 0.007 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.066 | 2.744 | 0.003 | 0.066 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a000000000000017d | 858.743 | 3.324 | n/a | 0.000 | 0.000 | 3.164 | 852.146 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.073 | 3.324 | 0.004 | 0.073 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a000000000000015d | 843.881 | 2.587 | n/a | 0.000 | 0.000 | 2.940 | 838.243 | 0.007 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.075 | 2.587 | 0.003 | 0.075 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a000000000000017a | 793.572 | 3.288 | n/a | 0.000 | 0.000 | 2.951 | 787.091 | 0.145 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.065 | 3.288 | 0.004 | 0.065 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000186 | 712.369 | 2.871 | n/a | 0.000 | 0.000 | 3.799 | 705.594 | 0.007 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.064 | 2.871 | 0.004 | 0.064 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000170 | 704.783 | 4.119 | n/a | 0.000 | 0.000 | 2.937 | 697.240 | 0.389 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.066 | 4.119 | 0.006 | 0.066 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000159 | 681.625 | 2.045 | n/a | 0.000 | 0.000 | 2.909 | 676.555 | 0.007 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.078 | 2.045 | 0.003 | 0.078 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000180 | 660.100 | 2.495 | n/a | 0.000 | 0.000 | 2.975 | 654.460 | 0.006 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.139 | 2.495 | 0.004 | 0.139 | gw-r/thread-49/journal/page | none observed |
| 0fbbaa8aea79184a000000000000018c | 657.416 | 4.388 | n/a | 0.000 | 0.000 | 3.472 | 649.444 | 0.007 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.072 | 4.388 | 0.007 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000173 | 621.056 | 2.202 | n/a | 0.000 | 0.000 | 2.903 | 615.740 | 0.097 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.063 | 2.202 | 0.004 | 0.063 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a000000000000016a | 525.189 | 3.416 | n/a | 0.000 | 0.000 | 3.802 | 517.823 | 0.007 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.083 | 3.416 | 0.007 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000153 | 516.115 | 3.126 | n/a | 0.000 | 0.000 | 5.484 | 507.333 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.108 | 3.126 | 0.006 | 0.108 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000156 | 477.608 | 2.896 | n/a | 0.000 | 0.000 | 3.295 | 471.311 | 0.007 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.069 | 2.896 | 0.006 | 0.069 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000169 | 462.398 | 6.367 | n/a | 0.000 | 0.000 | 2.972 | 452.731 | 0.161 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.137 | 6.367 | 0.014 | 0.137 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / internal (49 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 352.474 | 3.190 | n/a | 0.000 | 0.000 | 3.001 | 336.563 | 0.010 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.076 | 3.421 | 0.016 | 0.076 |
| p99 | 1004.261 | 10.476 | n/a | 0.887 | 0.000 | 5.424 | 998.565 | 0.994 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.234 | 10.476 | 0.391 | 0.234 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fbbaa8aea79184a000000000000018e | 1004.261 | 2.564 | n/a | 0.000 | 0.000 | 2.901 | 998.565 | 0.117 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.065 | 2.564 | 0.003 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001aa | 1003.918 | 3.035 | n/a | 0.000 | 0.000 | 2.949 | 997.635 | 0.181 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.088 | 3.035 | 0.003 | 0.088 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001a9 | 1002.046 | 3.047 | n/a | 0.000 | 0.000 | 3.070 | 995.798 | 0.007 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.095 | 3.047 | 0.003 | 0.095 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001c6 | 1000.032 | 2.384 | n/a | 0.000 | 0.000 | 2.959 | 994.465 | 0.131 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.063 | 2.384 | 0.002 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001a8 | 999.701 | 3.421 | n/a | 0.000 | 0.000 | 3.121 | 993.058 | 0.008 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.061 | 3.421 | 0.003 | 0.061 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001c7 | 987.125 | 3.004 | n/a | 0.783 | 0.000 | 2.891 | 980.272 | 0.023 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.114 | 3.787 | 0.004 | 0.114 | gw-r/thread-49/journal/page | none observed |
| 0fbbaa8aea79184a000000000000019d | 942.456 | 1.708 | n/a | 0.000 | 0.000 | 2.925 | 937.731 | 0.008 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.065 | 1.708 | 0.002 | 0.065 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001c4 | 869.137 | 4.631 | n/a | 0.000 | 0.000 | 2.974 | 861.329 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.164 | 4.631 | 0.005 | 0.164 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001a0 | 816.066 | 5.382 | n/a | 0.887 | 0.000 | 3.001 | 806.560 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.202 | 6.269 | 0.008 | 0.202 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001b8 | 744.931 | 2.399 | n/a | 0.000 | 0.000 | 2.940 | 739.163 | 0.304 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.072 | 2.399 | 0.003 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001d7 | 672.293 | 2.134 | n/a | 0.000 | 0.000 | 2.919 | 667.122 | 0.006 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.105 | 2.134 | 0.003 | 0.105 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001d0 | 639.975 | 4.340 | n/a | 0.000 | 0.000 | 3.184 | 632.330 | 0.007 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.076 | 4.340 | 0.007 | 0.076 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001bc | 583.621 | 2.394 | n/a | 0.000 | 0.000 | 4.460 | 576.551 | 0.117 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.072 | 2.394 | 0.004 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a000000000000019b | 578.698 | 3.863 | n/a | 0.000 | 0.000 | 4.035 | 570.693 | 0.006 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.069 | 3.863 | 0.007 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001a3 | 559.072 | 4.216 | n/a | 0.000 | 0.000 | 3.198 | 551.550 | 0.008 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.066 | 4.216 | 0.008 | 0.066 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001c8 | 552.401 | 3.190 | n/a | 0.000 | 0.000 | 3.023 | 546.079 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.074 | 3.190 | 0.006 | 0.074 | gw-r/thread-49/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001d3 | 540.348 | 2.576 | n/a | 0.000 | 0.000 | 3.128 | 534.525 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.077 | 2.576 | 0.005 | 0.077 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001b2 | 509.347 | 4.580 | n/a | 0.000 | 0.000 | 3.157 | 500.484 | 0.994 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.105 | 4.580 | 0.009 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001ab | 490.558 | 6.062 | n/a | 0.000 | 0.000 | 4.745 | 479.621 | 0.007 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.090 | 6.062 | 0.012 | 0.090 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001a4 | 441.458 | 2.487 | n/a | 0.000 | 0.000 | 2.921 | 435.923 | 0.027 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.070 | 2.487 | 0.006 | 0.070 | gw-r/thread-49/journal/page | none observed |

## P3 / L256 / internal (42 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 432.401 | 3.022 | n/a | 0.000 | 0.000 | 2.981 | 423.904 | 0.010 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.107 | 3.022 | 0.009 | 0.107 |
| p99 | 1006.473 | 8.551 | n/a | 0.000 | 0.000 | 4.626 | 1000.340 | 1.209 | 12.521 | 0.102 | 0.000 | n/a | n/a | 0.287 | 8.551 | 0.209 | 0.287 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fbbaa8aea79184a0000000000000213 | 1006.473 | 3.022 | n/a | 0.000 | 0.000 | 2.976 | 1000.340 | 0.008 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.094 | 3.022 | 0.003 | 0.094 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001ec | 1002.639 | 5.899 | n/a | 0.000 | 0.000 | 3.072 | 993.073 | 0.343 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.206 | 5.899 | 0.006 | 0.206 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000218 | 1002.224 | 0.123 | n/a | 0.000 | 0.000 | 2.905 | 999.008 | 0.028 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.058 | 0.123 | 0.000 | 0.058 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000209 | 1001.305 | 5.200 | n/a | 0.000 | 0.000 | 3.122 | 992.540 | 0.165 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.245 | 5.200 | 0.005 | 0.245 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a000000000000021a | 995.938 | 2.425 | n/a | 0.000 | 0.000 | 2.924 | 990.260 | 0.151 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.145 | 2.425 | 0.002 | 0.145 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000217 | 992.912 | 3.069 | n/a | 0.000 | 0.000 | 3.073 | 986.517 | 0.150 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.077 | 3.069 | 0.003 | 0.077 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000200 | 985.829 | 2.959 | n/a | 0.000 | 0.000 | 2.980 | 979.756 | 0.006 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.100 | 2.959 | 0.003 | 0.100 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000214 | 937.203 | 8.551 | n/a | 0.000 | 0.000 | 3.012 | 925.460 | 0.012 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.118 | 8.551 | 0.009 | 0.118 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001f9 | 902.839 | 4.747 | n/a | 0.000 | 0.000 | 3.431 | 894.412 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.218 | 4.747 | 0.005 | 0.218 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001f6 | 796.814 | 3.782 | n/a | 0.000 | 0.000 | 2.981 | 789.862 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.160 | 3.782 | 0.005 | 0.160 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001ea | 748.920 | 3.007 | n/a | 0.000 | 0.000 | 2.928 | 742.780 | 0.012 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.154 | 3.007 | 0.004 | 0.154 | gw-r/thread-49/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000201 | 711.389 | 2.394 | n/a | 0.000 | 0.000 | 2.921 | 705.937 | 0.007 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.099 | 2.394 | 0.003 | 0.099 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000204 | 665.728 | 5.934 | n/a | 0.000 | 0.000 | 4.626 | 654.948 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.184 | 5.934 | 0.009 | 0.184 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001df | 644.786 | 3.756 | n/a | 0.000 | 0.000 | 2.968 | 637.744 | 0.137 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.131 | 3.756 | 0.006 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001f2 | 639.155 | 1.989 | n/a | 0.000 | 0.000 | 2.977 | 634.050 | 0.010 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.099 | 1.989 | 0.003 | 0.099 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000211 | 570.484 | 2.617 | n/a | 0.000 | 0.000 | 2.940 | 564.781 | 0.013 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.101 | 2.617 | 0.005 | 0.101 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001dc | 554.355 | 2.820 | n/a | 0.000 | 0.000 | 3.180 | 535.674 | 0.009 | 12.521 | 0.031 | 0.000 | n/a | n/a | 0.119 | 2.820 | 0.005 | 0.119 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001f0 | 550.496 | 3.117 | n/a | 0.000 | 0.000 | 2.953 | 544.281 | 0.008 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.102 | 3.117 | 0.006 | 0.102 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001e3 | 468.608 | 6.762 | n/a | 0.000 | 0.000 | 3.093 | 458.614 | 0.007 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.104 | 6.762 | 0.014 | 0.104 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a00000000000001fb | 441.383 | 2.305 | n/a | 0.000 | 0.000 | 2.919 | 436.015 | 0.010 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.091 | 2.305 | 0.005 | 0.091 | gw-r/thread-51/journal/page | none observed |

## P3 / L1024 / internal (782 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.499 | 3.245 | n/a | 0.000 | 0.000 | 2.941 | 5.394 | 0.004 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.090 | 3.245 | 0.267 | 0.090 |
| p99 | 229.999 | 12.583 | n/a | 1.148 | 0.000 | 5.966 | 221.599 | 0.352 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.532 | 13.575 | 0.803 | 0.532 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fbbaa8aea79184a0000000000000226 | 1002.486 | 2.416 | n/a | 0.000 | 0.000 | 3.628 | 994.946 | 1.322 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.091 | 2.416 | 0.002 | 0.091 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a000000000000021b | 795.547 | 7.743 | n/a | 0.000 | 0.000 | 2.975 | 784.511 | 0.010 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.268 | 7.743 | 0.010 | 0.268 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000227 | 755.170 | 2.620 | n/a | 0.000 | 0.000 | 2.978 | 749.298 | 0.156 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.088 | 2.620 | 0.003 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000223 | 669.723 | 2.577 | n/a | 0.000 | 0.000 | 2.945 | 664.081 | 0.011 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.076 | 2.577 | 0.004 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a000000000000021e | 599.661 | 2.538 | n/a | 0.000 | 0.000 | 3.110 | 593.901 | 0.007 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.081 | 2.538 | 0.004 | 0.081 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000224 | 342.361 | 6.010 | n/a | 0.000 | 0.000 | 3.044 | 332.368 | 0.713 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.198 | 6.010 | 0.018 | 0.198 | gw-r/thread-49/journal/page | none observed |
| 0fbbaa8aea79184a000000000000021f | 255.798 | 3.494 | n/a | 0.000 | 0.000 | 4.295 | 247.790 | 0.012 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.156 | 3.494 | 0.014 | 0.156 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a000000000000021c | 229.999 | 4.948 | n/a | 0.000 | 0.000 | 3.053 | 221.599 | 0.145 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.230 | 4.948 | 0.022 | 0.230 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000221 | 114.163 | 3.700 | n/a | 0.000 | 0.000 | 2.947 | 107.215 | 0.127 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.127 | 3.700 | 0.032 | 0.127 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a00000000000004f5 | 109.005 | 6.095 | n/a | 0.838 | 0.000 | 3.074 | 98.797 | 0.016 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.138 | 6.933 | 0.064 | 0.138 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a00000000000002fc | 104.911 | 17.274 | n/a | 0.000 | 0.000 | 3.459 | 83.670 | 0.352 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.144 | 17.274 | 0.165 | 0.144 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000643 | 99.067 | 8.054 | n/a | 0.000 | 0.000 | 3.080 | 87.591 | 0.124 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.180 | 8.054 | 0.081 | 0.180 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a00000000000007b3 | 94.606 | 4.445 | n/a | 0.000 | 0.000 | 3.102 | 86.869 | 0.009 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.151 | 4.445 | 0.047 | 0.151 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a000000000000076d | 90.739 | 2.983 | n/a | 0.000 | 0.000 | 3.006 | 84.563 | 0.086 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.076 | 2.983 | 0.033 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 0fbbaa8aea79184a000000000000047a | 88.916 | 3.331 | n/a | 0.000 | 0.000 | 2.941 | 82.386 | 0.165 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.065 | 3.331 | 0.037 | 0.065 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000675 | 88.547 | 4.900 | n/a | 0.000 | 0.000 | 3.686 | 79.789 | 0.092 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.072 | 4.900 | 0.055 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000319 | 87.368 | 2.688 | n/a | 0.000 | 0.000 | 2.948 | 81.627 | 0.006 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.073 | 2.688 | 0.031 | 0.073 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a000000000000041d | 84.165 | 5.069 | n/a | 0.000 | 0.000 | 3.068 | 75.895 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.100 | 5.069 | 0.060 | 0.100 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a0000000000000531 | 82.969 | 5.360 | n/a | 0.000 | 0.000 | 2.944 | 50.919 | 0.163 | 23.476 | 0.025 | 0.000 | n/a | n/a | 0.083 | 5.360 | 0.065 | 0.083 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a00000000000005db | 80.162 | 5.260 | n/a | 0.000 | 0.000 | 2.957 | 71.646 | 0.118 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.152 | 5.260 | 0.066 | 0.152 | gw-r/thread-49/journal/page | none observed |

## P3 / tail / internal (2338 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.026 | 4.073 | n/a | 0.000 | 0.000 | 2.938 | 4.371 | 0.004 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.102 | 4.082 | 0.357 | 0.102 |
| p99 | 334.477 | 16.537 | n/a | 1.560 | 0.000 | 5.792 | 327.293 | 0.296 | 0.000 | 0.047 | 0.000 | n/a | n/a | 1.408 | 18.131 | 0.849 | 1.408 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fbbaa8aea79184a0000000000001b29 | 1002.885 | 0.125 | n/a | 0.000 | 0.000 | 2.955 | 998.548 | 0.009 | 0.000 | 0.116 | 0.000 | n/a | n/a | 1.132 | 0.125 | 0.000 | 1.132 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001adb | 1002.757 | 0.117 | n/a | 0.000 | 0.000 | 2.935 | 998.518 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 1.132 | 0.117 | 0.000 | 1.132 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001b20 | 1002.434 | 0.193 | n/a | 0.000 | 0.000 | 3.036 | 998.013 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 1.152 | 0.193 | 0.000 | 1.152 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001b25 | 999.989 | 3.532 | n/a | 0.000 | 0.000 | 3.080 | 993.247 | 0.005 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.103 | 3.532 | 0.004 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001aff | 998.402 | 2.319 | n/a | 0.000 | 0.000 | 2.955 | 993.030 | 0.004 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.076 | 2.319 | 0.002 | 0.076 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001ae6 | 998.295 | 2.148 | n/a | 0.000 | 0.000 | 2.933 | 992.888 | 0.248 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.057 | 2.148 | 0.002 | 0.057 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001add | 995.876 | 2.057 | n/a | 0.000 | 0.000 | 2.912 | 990.591 | 0.222 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.061 | 2.057 | 0.002 | 0.061 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001b01 | 925.277 | 3.344 | n/a | 0.000 | 0.000 | 3.082 | 918.662 | 0.096 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.069 | 3.344 | 0.004 | 0.069 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001af0 | 884.578 | 6.229 | n/a | 0.000 | 0.000 | 3.155 | 874.984 | 0.005 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.183 | 6.229 | 0.007 | 0.183 | gw-r/thread-50/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001ae1 | 866.565 | 4.548 | n/a | 0.000 | 0.000 | 3.016 | 858.768 | 0.088 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.125 | 4.548 | 0.005 | 0.125 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001ade | 792.697 | 11.183 | n/a | 1.041 | 0.000 | 3.072 | 776.993 | 0.109 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.279 | 12.223 | 0.015 | 0.279 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001afb | 704.734 | 2.729 | n/a | 0.000 | 0.000 | 2.923 | 698.961 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.091 | 2.729 | 0.004 | 0.091 | gw-r/thread-46/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001af6 | 683.009 | 5.536 | n/a | 0.000 | 0.000 | 3.000 | 674.280 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.167 | 5.536 | 0.008 | 0.167 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001b22 | 678.090 | 2.051 | n/a | 0.000 | 0.000 | 2.964 | 672.879 | 0.088 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.067 | 2.051 | 0.003 | 0.067 | gw-r/thread-53/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001b19 | 593.315 | 2.206 | n/a | 0.000 | 0.000 | 2.971 | 588.029 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.081 | 2.206 | 0.004 | 0.081 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001ae7 | 526.540 | 3.676 | n/a | 0.000 | 0.000 | 3.280 | 519.394 | 0.081 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.085 | 3.676 | 0.007 | 0.085 | gw-r/thread-52/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001b0f | 516.872 | 2.227 | n/a | 0.000 | 0.000 | 2.948 | 511.609 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.058 | 2.227 | 0.004 | 0.058 | gw-r/thread-48/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001b1b | 512.883 | 3.930 | n/a | 0.000 | 0.000 | 3.031 | 505.786 | 0.005 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.107 | 3.930 | 0.008 | 0.107 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001b1c | 452.844 | 2.037 | n/a | 0.000 | 0.000 | 3.458 | 447.262 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.063 | 2.037 | 0.004 | 0.063 | gw-r/thread-51/journal/page | none observed |
| 0fbbaa8aea79184a0000000000001b03 | 439.925 | 11.588 | n/a | 0.000 | 0.000 | 2.990 | 424.866 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.455 | 11.588 | 0.026 | 0.455 | gw-r/thread-50/journal/page | none observed |

## P3 / warmup / read (73 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.169 | 0.046 | n/a | 0.000 | 0.000 | 2.971 | 198.868 | 0.023 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.088 | 0.046 | 0.000 | 0.088 |
| p99 | 210.800 | 0.133 | n/a | 0.000 | 0.000 | 3.470 | 201.061 | 6.623 | 0.000 | 0.274 | 0.000 | n/a | n/a | 0.229 | 0.133 | 0.001 | 0.229 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a0ec6c3258cff330000000000000009 | 210.800 | 0.076 | n/a | 0.000 | 0.000 | 3.372 | 200.454 | 6.623 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.222 | 0.076 | 0.000 | 0.222 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff330000000000000021 | 204.424 | 0.052 | n/a | 0.000 | 0.000 | 2.932 | 201.061 | 0.025 | 0.000 | 0.258 | 0.000 | n/a | n/a | 0.096 | 0.052 | 0.000 | 0.096 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff33000000000000000a | 203.832 | 0.058 | n/a | 0.000 | 0.000 | 2.981 | 200.393 | 0.073 | 0.000 | 0.183 | 0.000 | n/a | n/a | 0.144 | 0.058 | 0.000 | 0.144 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff33000000000000000d | 203.784 | 0.061 | n/a | 0.000 | 0.000 | 3.101 | 200.189 | 0.021 | 0.000 | 0.274 | 0.000 | n/a | n/a | 0.138 | 0.061 | 0.000 | 0.138 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff33000000000000001c | 203.727 | 0.056 | n/a | 0.000 | 0.000 | 3.059 | 200.324 | 0.017 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.115 | 0.056 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000008 | 203.606 | 0.047 | n/a | 0.000 | 0.000 | 3.139 | 200.063 | 0.077 | 0.000 | 0.186 | 0.000 | n/a | n/a | 0.095 | 0.047 | 0.000 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff33000000000000001f | 203.424 | 0.038 | n/a | 0.000 | 0.000 | 2.942 | 200.073 | 0.087 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.088 | 0.038 | 0.000 | 0.088 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff33000000000000003e | 203.266 | 0.053 | n/a | 0.000 | 0.000 | 3.120 | 199.644 | 0.064 | 0.000 | 0.248 | 0.000 | n/a | n/a | 0.137 | 0.053 | 0.000 | 0.137 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff330000000000000027 | 203.162 | 0.043 | n/a | 0.000 | 0.000 | 2.952 | 199.909 | 0.028 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.086 | 0.043 | 0.000 | 0.086 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff330000000000000031 | 203.089 | 0.059 | n/a | 0.000 | 0.000 | 3.051 | 199.773 | 0.016 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.088 | 0.059 | 0.000 | 0.088 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff33000000000000000f | 202.929 | 0.050 | n/a | 0.000 | 0.000 | 3.066 | 199.434 | 0.045 | 0.000 | 0.219 | 0.000 | n/a | n/a | 0.117 | 0.050 | 0.000 | 0.117 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff330000000000000017 | 202.909 | 0.039 | n/a | 0.000 | 0.000 | 2.982 | 199.676 | 0.023 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.078 | 0.039 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000049 | 202.902 | 0.059 | n/a | 0.000 | 0.000 | 2.907 | 199.523 | 0.075 | 0.000 | 0.226 | 0.000 | n/a | n/a | 0.111 | 0.059 | 0.000 | 0.111 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000033 | 202.746 | 0.038 | n/a | 0.000 | 0.000 | 2.901 | 199.511 | 0.031 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.074 | 0.038 | 0.000 | 0.074 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff33000000000000000b | 202.711 | 0.041 | n/a | 0.000 | 0.000 | 3.044 | 199.408 | 0.023 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.072 | 0.041 | 0.000 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000011 | 202.629 | 0.032 | n/a | 0.000 | 0.000 | 2.920 | 199.378 | 0.031 | 0.000 | 0.193 | 0.000 | n/a | n/a | 0.074 | 0.032 | 0.000 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff33000000000000000e | 202.598 | 0.057 | n/a | 0.000 | 0.000 | 2.982 | 199.305 | 0.019 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.091 | 0.057 | 0.000 | 0.091 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff330000000000000022 | 202.551 | 0.046 | n/a | 0.000 | 0.000 | 2.994 | 199.211 | 0.023 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.092 | 0.046 | 0.000 | 0.092 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff330000000000000048 | 202.502 | 0.044 | n/a | 0.000 | 0.000 | 3.011 | 199.209 | 0.017 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.093 | 0.044 | 0.000 | 0.093 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff33000000000000002c | 202.494 | 0.043 | n/a | 0.000 | 0.000 | 2.975 | 199.167 | 0.025 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.098 | 0.043 | 0.000 | 0.098 | gw-r/thread-53/journal/page | none observed |

## P3 / L1 / read (89 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.134 | 0.051 | n/a | 0.000 | 0.000 | 2.971 | 198.835 | 0.018 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.099 | 0.051 | 0.000 | 0.099 |
| p99 | 209.080 | 0.146 | n/a | 0.000 | 0.000 | 4.856 | 203.891 | 6.001 | 0.000 | 0.494 | 0.000 | n/a | n/a | 0.448 | 0.146 | 0.001 | 0.448 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a0ec6c3258cff330000000000000079 | 209.080 | 0.045 | n/a | 0.000 | 0.000 | 4.856 | 203.891 | 0.027 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.115 | 0.045 | 0.000 | 0.115 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000ad | 206.385 | 0.077 | n/a | 0.000 | 0.000 | 2.990 | 202.565 | 0.081 | 0.000 | 0.494 | 0.000 | n/a | n/a | 0.178 | 0.077 | 0.000 | 0.178 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000ac | 205.027 | 0.058 | n/a | 0.000 | 0.000 | 3.373 | 200.752 | 0.093 | 0.000 | 0.304 | 0.000 | n/a | n/a | 0.448 | 0.058 | 0.000 | 0.448 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff330000000000000064 | 203.915 | 0.042 | n/a | 0.000 | 0.000 | 3.298 | 200.183 | 0.051 | 0.000 | 0.261 | 0.000 | n/a | n/a | 0.080 | 0.042 | 0.000 | 0.080 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000ae | 203.853 | 0.052 | n/a | 0.000 | 0.000 | 3.018 | 200.492 | 0.022 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.113 | 0.052 | 0.000 | 0.113 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000a6 | 203.773 | 0.074 | n/a | 0.000 | 0.000 | 3.135 | 200.004 | 0.097 | 0.000 | 0.289 | 0.000 | n/a | n/a | 0.173 | 0.074 | 0.000 | 0.173 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff330000000000000097 | 203.737 | 0.060 | n/a | 0.000 | 0.000 | 3.069 | 200.369 | 0.015 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.133 | 0.060 | 0.000 | 0.133 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff33000000000000005c | 203.476 | 0.030 | n/a | 0.000 | 0.000 | 3.053 | 200.219 | 0.014 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.071 | 0.030 | 0.000 | 0.071 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff33000000000000005f | 203.389 | 0.051 | n/a | 0.000 | 0.000 | 3.120 | 199.845 | 0.025 | 0.000 | 0.205 | 0.000 | n/a | n/a | 0.143 | 0.051 | 0.000 | 0.143 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff33000000000000008e | 203.092 | 0.056 | n/a | 0.000 | 0.000 | 3.106 | 199.671 | 0.018 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.137 | 0.056 | 0.000 | 0.137 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff330000000000000088 | 203.082 | 0.042 | n/a | 0.000 | 0.000 | 2.948 | 199.802 | 0.026 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.099 | 0.042 | 0.000 | 0.099 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000086 | 202.989 | 0.049 | n/a | 0.000 | 0.000 | 2.959 | 199.692 | 0.022 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.117 | 0.049 | 0.000 | 0.117 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000bc | 202.938 | 0.050 | n/a | 0.000 | 0.000 | 2.998 | 199.642 | 0.015 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.099 | 0.050 | 0.000 | 0.099 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff330000000000000083 | 202.912 | 0.058 | n/a | 0.000 | 0.000 | 2.950 | 199.630 | 0.023 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.094 | 0.058 | 0.000 | 0.094 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000aa | 202.793 | 0.042 | n/a | 0.000 | 0.000 | 2.933 | 199.615 | 0.013 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.082 | 0.042 | 0.000 | 0.082 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff330000000000000063 | 202.719 | 0.062 | n/a | 0.000 | 0.000 | 3.043 | 199.332 | 0.024 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.116 | 0.062 | 0.000 | 0.116 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff330000000000000082 | 202.700 | 0.044 | n/a | 0.000 | 0.000 | 2.937 | 199.444 | 0.037 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.085 | 0.044 | 0.000 | 0.085 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff330000000000000087 | 202.676 | 0.046 | n/a | 0.000 | 0.000 | 2.950 | 199.342 | 0.075 | 0.000 | 0.178 | 0.000 | n/a | n/a | 0.085 | 0.046 | 0.000 | 0.085 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000a7 | 202.660 | 0.053 | n/a | 0.000 | 0.000 | 3.198 | 199.101 | 0.079 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.124 | 0.053 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000066 | 202.646 | 0.045 | n/a | 0.000 | 0.000 | 2.970 | 199.321 | 0.046 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.107 | 0.045 | 0.000 | 0.107 | gw-r/thread-52/journal/page | none observed |

## P3 / L4 / read (90 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.912 | 0.047 | n/a | 0.000 | 0.000 | 2.956 | 198.640 | 0.009 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.084 | 0.047 | 0.000 | 0.084 |
| p99 | 203.185 | 0.113 | n/a | 0.000 | 0.000 | 3.441 | 200.002 | 4.569 | 21.452 | 0.132 | 0.000 | n/a | n/a | 0.161 | 0.113 | 0.002 | 0.161 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a0ec6c3258cff3300000000000000d7 | 203.185 | 0.036 | n/a | 0.000 | 0.000 | 2.903 | 200.002 | 0.016 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.108 | 0.036 | 0.000 | 0.108 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000c6 | 203.091 | 0.062 | n/a | 0.000 | 0.000 | 2.962 | 199.852 | 0.034 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.103 | 0.062 | 0.000 | 0.103 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000cb | 202.970 | 0.075 | n/a | 0.000 | 0.000 | 3.119 | 199.568 | 0.008 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.129 | 0.075 | 0.000 | 0.129 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000e9 | 202.929 | 0.044 | n/a | 0.000 | 0.000 | 3.090 | 199.566 | 0.022 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.120 | 0.044 | 0.000 | 0.120 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000d2 | 202.890 | 0.040 | n/a | 0.000 | 0.000 | 2.991 | 199.518 | 0.067 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.143 | 0.040 | 0.000 | 0.143 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000e0 | 202.816 | 0.047 | n/a | 0.000 | 0.000 | 3.039 | 199.486 | 0.029 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.116 | 0.047 | 0.000 | 0.116 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff33000000000000010e | 202.795 | 0.046 | n/a | 0.000 | 0.000 | 2.914 | 199.611 | 0.035 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.075 | 0.046 | 0.000 | 0.075 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000e3 | 202.791 | 0.051 | n/a | 0.000 | 0.000 | 2.973 | 199.559 | 0.010 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.100 | 0.051 | 0.000 | 0.100 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000d3 | 202.757 | 0.038 | n/a | 0.000 | 0.000 | 2.869 | 199.638 | 0.014 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.072 | 0.038 | 0.000 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000e4 | 202.689 | 0.051 | n/a | 0.000 | 0.000 | 3.063 | 199.364 | 0.008 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.134 | 0.051 | 0.000 | 0.134 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000df | 202.666 | 0.067 | n/a | 0.000 | 0.000 | 2.993 | 199.408 | 0.009 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.104 | 0.067 | 0.000 | 0.104 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000ed | 202.525 | 0.058 | n/a | 0.000 | 0.000 | 2.943 | 199.328 | 0.009 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.099 | 0.058 | 0.000 | 0.099 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000de | 202.481 | 0.054 | n/a | 0.000 | 0.000 | 3.079 | 199.133 | 0.010 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.127 | 0.054 | 0.000 | 0.127 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000ec | 202.431 | 0.032 | n/a | 0.000 | 0.000 | 3.441 | 198.806 | 0.009 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.069 | 0.032 | 0.000 | 0.069 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff33000000000000010d | 202.401 | 0.062 | n/a | 0.000 | 0.000 | 3.018 | 199.098 | 0.017 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.121 | 0.062 | 0.000 | 0.121 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000107 | 202.362 | 0.058 | n/a | 0.000 | 0.000 | 2.909 | 199.170 | 0.017 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.105 | 0.058 | 0.000 | 0.105 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000da | 202.358 | 0.070 | n/a | 0.000 | 0.000 | 3.031 | 198.993 | 0.010 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.159 | 0.070 | 0.000 | 0.159 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000cf | 202.343 | 0.034 | n/a | 0.000 | 0.000 | 3.249 | 198.864 | 0.012 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.091 | 0.034 | 0.000 | 0.091 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff3300000000000000d1 | 202.297 | 0.046 | n/a | 0.000 | 0.000 | 2.956 | 199.115 | 0.009 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.091 | 0.046 | 0.000 | 0.091 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff330000000000000108 | 202.286 | 0.058 | n/a | 0.000 | 0.000 | 3.119 | 198.907 | 0.009 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.131 | 0.058 | 0.000 | 0.131 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.689 | 0.046 | n/a | 0.000 | 0.000 | 2.944 | 198.548 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.083 | 0.046 | 0.000 | 0.083 |
| p99 | 203.994 | 0.127 | n/a | 0.000 | 0.000 | 3.645 | 202.708 | 3.309 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.206 | 0.127 | 0.001 | 0.206 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a0ec6c3258cff33000000000000013f | 203.994 | 0.045 | n/a | 0.000 | 0.000 | 3.004 | 200.791 | 0.025 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.083 | 0.045 | 0.000 | 0.083 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff33000000000000013d | 203.556 | 0.069 | n/a | 0.000 | 0.000 | 0.623 | 202.708 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.107 | 0.069 | 0.000 | 0.107 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff330000000000000161 | 203.199 | 0.077 | n/a | 0.000 | 0.000 | 3.087 | 199.782 | 0.014 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.150 | 0.077 | 0.000 | 0.150 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff33000000000000016a | 202.826 | 0.054 | n/a | 0.000 | 0.000 | 2.908 | 199.634 | 0.031 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.101 | 0.054 | 0.000 | 0.101 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff33000000000000018a | 202.719 | 0.054 | n/a | 0.000 | 0.000 | 2.893 | 199.508 | 0.038 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.130 | 0.054 | 0.000 | 0.130 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff33000000000000012d | 202.650 | 0.045 | n/a | 0.000 | 0.000 | 3.504 | 198.867 | 0.049 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.113 | 0.045 | 0.000 | 0.113 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff330000000000000160 | 202.634 | 0.080 | n/a | 0.000 | 0.000 | 3.142 | 199.172 | 0.008 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.174 | 0.080 | 0.000 | 0.174 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff33000000000000017c | 202.610 | 0.045 | n/a | 0.000 | 0.000 | 2.946 | 199.443 | 0.017 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.080 | 0.045 | 0.000 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000189 | 202.577 | 0.062 | n/a | 0.000 | 0.000 | 3.021 | 199.224 | 0.028 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.111 | 0.062 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff330000000000000170 | 202.448 | 0.073 | n/a | 0.000 | 0.000 | 3.084 | 199.054 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.177 | 0.073 | 0.000 | 0.177 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff33000000000000013b | 202.434 | 0.060 | n/a | 0.000 | 0.000 | 3.021 | 199.126 | 0.011 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.132 | 0.060 | 0.000 | 0.132 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff330000000000000177 | 202.434 | 0.052 | n/a | 0.000 | 0.000 | 3.023 | 199.083 | 0.039 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.125 | 0.052 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff33000000000000018c | 202.423 | 0.044 | n/a | 0.000 | 0.000 | 2.915 | 199.268 | 0.014 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.078 | 0.044 | 0.000 | 0.078 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff33000000000000017e | 202.377 | 0.031 | n/a | 0.000 | 0.000 | 3.172 | 199.028 | 0.018 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.060 | 0.031 | 0.000 | 0.060 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff330000000000000137 | 202.302 | 0.042 | n/a | 0.000 | 0.000 | 2.898 | 199.187 | 0.020 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.080 | 0.042 | 0.000 | 0.080 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff330000000000000159 | 202.260 | 0.062 | n/a | 0.000 | 0.000 | 3.114 | 198.891 | 0.007 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.130 | 0.062 | 0.000 | 0.130 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff330000000000000133 | 202.227 | 0.033 | n/a | 0.000 | 0.000 | 2.907 | 199.102 | 0.014 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.069 | 0.033 | 0.000 | 0.069 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff33000000000000016b | 202.221 | 0.035 | n/a | 0.000 | 0.000 | 2.922 | 199.129 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.081 | 0.035 | 0.000 | 0.081 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff330000000000000181 | 202.099 | 0.053 | n/a | 0.000 | 0.000 | 2.968 | 198.936 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.089 | 0.053 | 0.000 | 0.089 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff330000000000000187 | 202.095 | 0.042 | n/a | 0.000 | 0.000 | 3.172 | 198.722 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.106 | 0.042 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / read (105 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.579 | 0.049 | n/a | 0.000 | 0.000 | 2.940 | 198.439 | 0.008 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.081 | 0.049 | 0.000 | 0.081 |
| p99 | 202.957 | 0.116 | n/a | 0.000 | 0.000 | 3.616 | 199.526 | 2.922 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.260 | 0.116 | 0.002 | 0.260 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a0ec6c3258cff3300000000000001a6 | 205.481 | 0.040 | n/a | 0.000 | 0.000 | 3.313 | 201.994 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.075 | 0.040 | 0.000 | 0.075 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff3300000000000001b7 | 202.957 | 0.048 | n/a | 0.000 | 0.000 | 3.372 | 199.343 | 0.008 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.102 | 0.048 | 0.000 | 0.102 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff3300000000000001de | 202.802 | 0.055 | n/a | 0.000 | 0.000 | 3.306 | 199.231 | 0.036 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.127 | 0.055 | 0.000 | 0.127 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff3300000000000001df | 202.658 | 0.066 | n/a | 0.000 | 0.000 | 2.898 | 199.526 | 0.010 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.096 | 0.066 | 0.000 | 0.096 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff3300000000000001b5 | 202.588 | 0.116 | n/a | 0.000 | 0.000 | 3.051 | 199.189 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.186 | 0.116 | 0.001 | 0.186 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff3300000000000001bf | 202.582 | 0.046 | n/a | 0.000 | 0.000 | 2.936 | 199.340 | 0.016 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.102 | 0.046 | 0.000 | 0.102 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff3300000000000001ba | 202.551 | 0.108 | n/a | 0.000 | 0.000 | 3.505 | 198.548 | 0.009 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.314 | 0.108 | 0.001 | 0.314 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff3300000000000001d3 | 202.506 | 0.054 | n/a | 0.000 | 0.000 | 3.055 | 199.210 | 0.011 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.111 | 0.054 | 0.000 | 0.111 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff330000000000000201 | 202.498 | 0.095 | n/a | 0.000 | 0.000 | 3.127 | 199.119 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.111 | 0.095 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff3300000000000001af | 202.469 | 0.037 | n/a | 0.000 | 0.000 | 2.861 | 199.351 | 0.021 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.095 | 0.037 | 0.000 | 0.095 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff3300000000000001e5 | 202.467 | 0.072 | n/a | 0.000 | 0.000 | 3.616 | 198.577 | 0.011 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.125 | 0.072 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff3300000000000001d6 | 202.451 | 0.031 | n/a | 0.000 | 0.000 | 3.311 | 198.966 | 0.016 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.063 | 0.031 | 0.000 | 0.063 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff3300000000000001c9 | 202.341 | 0.064 | n/a | 0.000 | 0.000 | 3.164 | 198.908 | 0.009 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.159 | 0.064 | 0.000 | 0.159 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff3300000000000001e6 | 202.316 | 0.057 | n/a | 0.000 | 0.000 | 2.917 | 199.149 | 0.013 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.096 | 0.057 | 0.000 | 0.096 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff330000000000000203 | 202.293 | 0.040 | n/a | 0.000 | 0.000 | 3.173 | 198.924 | 0.008 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.083 | 0.040 | 0.000 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff3300000000000001f9 | 202.290 | 0.032 | n/a | 0.000 | 0.000 | 2.862 | 199.241 | 0.011 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.069 | 0.032 | 0.000 | 0.069 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff3300000000000001aa | 202.273 | 0.042 | n/a | 0.000 | 0.000 | 2.929 | 199.155 | 0.010 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.074 | 0.042 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff33000000000000019a | 202.249 | 0.091 | n/a | 0.000 | 0.000 | 3.013 | 198.978 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.109 | 0.091 | 0.000 | 0.109 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff3300000000000001fc | 202.218 | 0.063 | n/a | 0.000 | 0.000 | 3.059 | 198.877 | 0.040 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.135 | 0.063 | 0.000 | 0.135 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff330000000000000209 | 202.198 | 0.069 | n/a | 0.000 | 0.000 | 3.220 | 198.671 | 0.018 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.156 | 0.069 | 0.000 | 0.156 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.777 | 0.049 | n/a | 0.000 | 0.000 | 2.954 | 198.607 | 0.010 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.080 | 0.049 | 0.000 | 0.080 |
| p99 | 203.396 | 0.100 | n/a | 0.000 | 0.000 | 3.275 | 200.169 | 2.809 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.175 | 0.100 | 0.001 | 0.175 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a0ec6c3258cff33000000000000021b | 206.399 | 0.044 | n/a | 0.000 | 0.000 | 3.081 | 203.059 | 0.012 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.080 | 0.044 | 0.000 | 0.080 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff33000000000000026b | 203.396 | 0.034 | n/a | 0.000 | 0.000 | 2.909 | 200.169 | 0.054 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.067 | 0.034 | 0.000 | 0.067 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff330000000000000268 | 203.311 | 0.058 | n/a | 0.000 | 0.000 | 2.906 | 200.160 | 0.013 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.093 | 0.058 | 0.000 | 0.093 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff330000000000000276 | 203.211 | 0.034 | n/a | 0.000 | 0.000 | 2.891 | 199.998 | 0.055 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.083 | 0.034 | 0.000 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000267 | 202.979 | 0.073 | n/a | 0.000 | 0.000 | 3.222 | 199.401 | 0.014 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.175 | 0.073 | 0.000 | 0.175 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff33000000000000022c | 202.866 | 0.040 | n/a | 0.000 | 0.000 | 2.950 | 199.632 | 0.018 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.078 | 0.040 | 0.000 | 0.078 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff33000000000000020d | 202.766 | 0.063 | n/a | 0.000 | 0.000 | 3.088 | 199.361 | 0.012 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.118 | 0.063 | 0.000 | 0.118 | gw-r/thread-51/journal/page | none observed |
| 1a0ec6c3258cff33000000000000023f | 202.656 | 0.048 | n/a | 0.000 | 0.000 | 3.096 | 199.270 | 0.022 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.130 | 0.048 | 0.000 | 0.130 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000251 | 202.614 | 0.063 | n/a | 0.000 | 0.000 | 3.216 | 199.034 | 0.035 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.201 | 0.063 | 0.000 | 0.201 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff33000000000000022e | 202.597 | 0.033 | n/a | 0.000 | 0.000 | 2.876 | 199.504 | 0.037 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.068 | 0.033 | 0.000 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff33000000000000027d | 202.478 | 0.038 | n/a | 0.000 | 0.000 | 2.788 | 199.480 | 0.015 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.071 | 0.038 | 0.000 | 0.071 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff330000000000000240 | 202.471 | 0.053 | n/a | 0.000 | 0.000 | 3.082 | 199.104 | 0.011 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.157 | 0.053 | 0.000 | 0.157 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff330000000000000272 | 202.467 | 0.046 | n/a | 0.000 | 0.000 | 2.944 | 199.337 | 0.009 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.075 | 0.046 | 0.000 | 0.075 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff33000000000000025b | 202.414 | 0.040 | n/a | 0.000 | 0.000 | 2.969 | 199.214 | 0.020 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.079 | 0.040 | 0.000 | 0.079 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff330000000000000249 | 202.406 | 0.042 | n/a | 0.000 | 0.000 | 3.018 | 199.150 | 0.024 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.072 | 0.042 | 0.000 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000259 | 202.295 | 0.030 | n/a | 0.000 | 0.000 | 2.903 | 199.217 | 0.014 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.069 | 0.030 | 0.000 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff33000000000000020f | 202.278 | 0.052 | n/a | 0.000 | 0.000 | 3.038 | 198.978 | 0.011 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.121 | 0.052 | 0.000 | 0.121 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000277 | 202.276 | 0.054 | n/a | 0.000 | 0.000 | 2.877 | 199.138 | 0.018 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.112 | 0.054 | 0.000 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff330000000000000237 | 202.237 | 0.059 | n/a | 0.000 | 0.000 | 3.074 | 198.929 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.126 | 0.059 | 0.000 | 0.126 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff33000000000000024d | 202.221 | 0.069 | n/a | 0.000 | 0.000 | 3.045 | 198.911 | 0.010 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.119 | 0.069 | 0.000 | 0.119 | gw-r/thread-52/journal/page | none observed |

## P3 / L1024 / read (70 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 71.426 | 0.057 | n/a | 0.000 | 0.000 | 2.962 | 67.691 | 0.008 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.083 | 0.057 | 0.001 | 0.083 |
| p99 | 203.321 | 0.121 | n/a | 0.000 | 0.000 | 4.131 | 199.829 | 0.930 | 0.000 | 0.214 | 0.000 | n/a | n/a | 0.173 | 0.121 | 0.035 | 0.173 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a0ec6c3258cff33000000000000028c | 203.321 | 0.091 | n/a | 0.000 | 0.000 | 3.141 | 199.801 | 0.019 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.173 | 0.091 | 0.000 | 0.173 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff330000000000000291 | 202.996 | 0.052 | n/a | 0.000 | 0.000 | 2.974 | 199.829 | 0.008 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.085 | 0.052 | 0.000 | 0.085 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff330000000000000292 | 202.937 | 0.058 | n/a | 0.000 | 0.000 | 3.128 | 199.368 | 0.041 | 0.000 | 0.214 | 0.000 | n/a | n/a | 0.128 | 0.058 | 0.000 | 0.128 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000286 | 202.730 | 0.042 | n/a | 0.000 | 0.000 | 2.934 | 199.529 | 0.017 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.073 | 0.042 | 0.000 | 0.073 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff330000000000000283 | 202.400 | 0.045 | n/a | 0.000 | 0.000 | 2.973 | 199.230 | 0.009 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.088 | 0.045 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000298 | 202.361 | 0.041 | n/a | 0.000 | 0.000 | 2.916 | 199.248 | 0.017 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.071 | 0.041 | 0.000 | 0.071 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff330000000000000293 | 202.172 | 0.057 | n/a | 0.000 | 0.000 | 2.908 | 199.071 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.083 | 0.057 | 0.000 | 0.083 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff330000000000000288 | 202.167 | 0.055 | n/a | 0.000 | 0.000 | 2.895 | 199.034 | 0.020 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.093 | 0.055 | 0.000 | 0.093 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff330000000000000281 | 202.046 | 0.059 | n/a | 0.000 | 0.000 | 2.932 | 198.853 | 0.011 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.143 | 0.059 | 0.000 | 0.143 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000285 | 202.045 | 0.045 | n/a | 0.000 | 0.000 | 2.995 | 198.838 | 0.026 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.107 | 0.045 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff33000000000000028b | 202.005 | 0.051 | n/a | 0.000 | 0.000 | 3.215 | 198.578 | 0.007 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.110 | 0.051 | 0.000 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff330000000000000280 | 201.970 | 0.033 | n/a | 0.000 | 0.000 | 2.901 | 198.891 | 0.018 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.067 | 0.033 | 0.000 | 0.067 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff330000000000000294 | 201.955 | 0.040 | n/a | 0.000 | 0.000 | 2.951 | 198.827 | 0.009 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.078 | 0.040 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff33000000000000028f | 201.913 | 0.042 | n/a | 0.000 | 0.000 | 2.923 | 198.794 | 0.034 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.078 | 0.042 | 0.000 | 0.078 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff33000000000000028d | 201.716 | 0.056 | n/a | 0.000 | 0.000 | 3.018 | 198.469 | 0.007 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.113 | 0.056 | 0.000 | 0.113 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff33000000000000027f | 201.611 | 0.056 | n/a | 0.000 | 0.000 | 2.943 | 198.460 | 0.013 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.090 | 0.056 | 0.000 | 0.090 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff330000000000000296 | 201.586 | 0.051 | n/a | 0.000 | 0.000 | 2.926 | 198.454 | 0.009 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.084 | 0.051 | 0.000 | 0.084 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff330000000000000297 | 201.368 | 0.029 | n/a | 0.000 | 0.000 | 2.901 | 198.329 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.060 | 0.029 | 0.000 | 0.060 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff330000000000000287 | 154.434 | 0.087 | n/a | 0.000 | 0.000 | 3.045 | 151.161 | 0.006 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.118 | 0.087 | 0.001 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000282 | 123.081 | 0.076 | n/a | 0.000 | 0.000 | 2.946 | 119.600 | 0.299 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.145 | 0.076 | 0.001 | 0.145 | gw-r/thread-51/journal/page | none observed |

## P3 / tail / read (228 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 83.136 | 0.041 | n/a | 0.000 | 0.000 | 2.933 | 78.371 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.072 | 0.041 | 0.001 | 0.072 |
| p99 | 202.255 | 0.123 | n/a | 0.000 | 0.000 | 4.407 | 198.929 | 1.307 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.156 | 0.123 | 0.002 | 0.156 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a0ec6c3258cff330000000000000f48 | 202.936 | 0.040 | n/a | 0.000 | 0.000 | 4.239 | 198.521 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.093 | 0.040 | 0.000 | 0.093 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff330000000000000f13 | 202.474 | 0.035 | n/a | 0.000 | 0.000 | 3.744 | 198.568 | 0.008 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.082 | 0.035 | 0.000 | 0.082 | gw-r/thread-52/journal/page | none observed |
| 1a0ec6c3258cff330000000000000f47 | 202.255 | 0.049 | n/a | 0.000 | 0.000 | 3.032 | 198.956 | 0.010 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.138 | 0.049 | 0.000 | 0.138 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff330000000000000f22 | 202.032 | 0.037 | n/a | 0.000 | 0.000 | 2.925 | 198.929 | 0.008 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.079 | 0.037 | 0.000 | 0.079 | gw-r/thread-50/journal/page | none observed |
| 1a0ec6c3258cff330000000000000f4e | 202.011 | 0.046 | n/a | 0.000 | 0.000 | 2.892 | 198.933 | 0.010 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.078 | 0.046 | 0.000 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff330000000000000f0e | 202.005 | 0.039 | n/a | 0.000 | 0.000 | 2.888 | 198.922 | 0.008 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.086 | 0.039 | 0.000 | 0.086 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000eff | 201.927 | 0.039 | n/a | 0.000 | 0.000 | 3.247 | 198.488 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.115 | 0.039 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000eed | 201.913 | 0.040 | n/a | 0.000 | 0.000 | 2.899 | 198.810 | 0.009 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.091 | 0.040 | 0.000 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000f14 | 201.908 | 0.056 | n/a | 0.000 | 0.000 | 2.916 | 198.762 | 0.009 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.087 | 0.056 | 0.000 | 0.087 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff330000000000000f27 | 201.894 | 0.026 | n/a | 0.000 | 0.000 | 3.664 | 198.113 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.059 | 0.026 | 0.000 | 0.059 | gw-r/thread-48/journal/page | none observed |
| 1a0ec6c3258cff330000000000000ed3 | 201.884 | 0.035 | n/a | 0.000 | 0.000 | 2.926 | 198.785 | 0.008 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.083 | 0.035 | 0.000 | 0.083 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff330000000000000edd | 201.861 | 0.046 | n/a | 0.000 | 0.000 | 2.974 | 198.654 | 0.008 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.118 | 0.046 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff330000000000000f18 | 201.849 | 0.022 | n/a | 0.000 | 0.000 | 2.902 | 198.807 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.062 | 0.022 | 0.000 | 0.062 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff330000000000000f4d | 201.783 | 0.028 | n/a | 0.000 | 0.000 | 2.911 | 198.716 | 0.008 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.065 | 0.028 | 0.000 | 0.065 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff330000000000000f3d | 201.777 | 0.037 | n/a | 0.000 | 0.000 | 2.901 | 198.657 | 0.016 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.073 | 0.037 | 0.000 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff330000000000000ede | 201.753 | 0.061 | n/a | 0.000 | 0.000 | 2.969 | 198.544 | 0.009 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.118 | 0.061 | 0.000 | 0.118 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff330000000000000ee2 | 201.669 | 0.038 | n/a | 0.000 | 0.000 | 2.893 | 198.584 | 0.009 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.080 | 0.038 | 0.000 | 0.080 | gw-r/thread-46/journal/page | none observed |
| 1a0ec6c3258cff330000000000000f1b | 201.667 | 0.036 | n/a | 0.000 | 0.000 | 3.057 | 198.391 | 0.006 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.123 | 0.036 | 0.000 | 0.123 | gw-r/thread-49/journal/page | none observed |
| 1a0ec6c3258cff330000000000000f0a | 201.648 | 0.039 | n/a | 0.000 | 0.000 | 3.109 | 198.371 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.097 | 0.039 | 0.000 | 0.097 | gw-r/thread-53/journal/page | none observed |
| 1a0ec6c3258cff330000000000000f15 | 201.636 | 0.032 | n/a | 0.000 | 0.000 | 2.903 | 198.573 | 0.008 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.067 | 0.032 | 0.000 | 0.067 | gw-r/thread-50/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux per-thread CPU is sampled from /proc (10 ms ticks); per-request CPU attribution is not available. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
