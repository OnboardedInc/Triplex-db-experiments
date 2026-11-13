# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (217.411 ms, trace `b003d3138a81df1900000000000000d6`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (237.457 ms, trace `b003d3138a81df1900000000000000cf`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (184.963 ms, trace `b003d3138a81df1900000000000000b5`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (96.182 ms, trace `b003d3138a81df1900000000000000bf`); `node-13/thread-0/client.persist-and-resolve` (127.254 ms, trace `b003d3138a81df190000000000000156`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p2-smoke-a`; source `d634d57e0fc156529c9c74f52af412a967e1bc85`; subjects 1000; tracing full.

Commit coverage: 89/89 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 89/89. Raw trace bytes: 2708980.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1279.973 | 154.212 | n/a | 36 |
| baseline | 0 | 1967.666 | 87.679 | n/a | 35 |
| L1 | 1 | 1977.295 | 147.171 | n/a | 39 |
| L4 | 4 | 1964.421 | 250.441 | n/a | 44 |
| L16 | 16 | 1076.981 | 116.322 | n/a | 44 |
| L64 | 16 | 1308.934 | 216.662 | n/a | 44 |
| L256 | 16 | 1650.726 | 165.283 | n/a | 53 |
| L1024 | 16 | 1780.474 | 232.068 | n/a | 21 |
| recovery | 16 | 1053.479 | 97.163 | n/a | 44 |
| p4mix | 1 | 1705.733 | 33.914 | n/a | 38 |
| p4h1 | 1 | 1026.213 | 15.270 | n/a | 16 |
| grow3 | 0 | 1235.608 | 166.151 | n/a | 39 |
| p4h3 | 1 | 2039.582 | 83.666 | n/a | 108 |
| grow10 | 0 | 2077.809 | 641.160 | n/a | 47 |
| p4h10 | 1 | 1410.103 | 26.822 | n/a | 44 |
| presweep | 16 | 1032.985 | 67.608 | n/a | 58 |
| sweep | 16 | 132.387 | 32.607 | n/a | 104 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| b003d3138a81df1900000000000000d6 | driver.queue.scheduler-dispatch | 0.136 | none | 0 / 32 |
| b003d3138a81df1900000000000000d6 | driver.queue.scheduler-late | 0.007 | none | 0 / 32 |

Observed active steps while trace b003d3138a81df1900000000000000d6 waited: []

| b003d3138a81df1900000000000000cf | driver.queue.scheduler-dispatch | 0.069 | none | 0 / 32 |
| b003d3138a81df1900000000000000cf | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace b003d3138a81df1900000000000000cf waited: []

| b003d3138a81df1900000000000000b5 | driver.queue.scheduler-late | 0.354 | none | 0 / 32 |
| b003d3138a81df1900000000000000b5 | driver.queue.scheduler-dispatch | 0.071 | none | 0 / 32 |

Observed active steps while trace b003d3138a81df1900000000000000b5 waited: []

| b003d3138a81df1900000000000000bf | driver.queue.scheduler-dispatch | 0.058 | none | 0 / 32 |
| b003d3138a81df1900000000000000bf | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace b003d3138a81df1900000000000000bf waited: []

| b003d3138a81df190000000000000156 | driver.queue.scheduler-dispatch | 0.006 | none | 9 / 32 |
| b003d3138a81df190000000000000156 | driver.queue.scheduler-late | 0.000 | none | 9 / 32 |

Observed active steps while trace b003d3138a81df190000000000000156 waited: []

## P2 / warmup / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.518 | 0.635 | n/a | 1.572 | 16.928 | n/a | 0.000 | 0.135 | 2.424 | 7.998 | 0.141 | 0.000 | 1.201 | 15.848 | n/a | n/a | 0.058 | 18.347 | 0.300 | 0.058 |
| p99 | 61.230 | 4.347 | n/a | 6.962 | 25.004 | n/a | 0.000 | 1.419 | 3.273 | 17.657 | 0.254 | 0.000 | 1.650 | 20.871 | n/a | n/a | 0.433 | 25.658 | 0.498 | 0.433 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df190000000000000092 | 61.230 | 16.928 | n/a | 0.000 | 1.419 | 2.130 | 17.657 | 0.141 | 0.000 | 1.650 | 20.871 | n/a | n/a | 0.433 | 18.347 | 0.300 | 0.433 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000095 | 51.518 | 25.004 | 0.579 | 0.000 | 0.075 | 3.273 | 7.998 | 0.254 | 0.000 | 1.004 | 13.281 | n/a | n/a | 0.050 | 25.658 | 0.498 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.worker-message 2.998ms |
| b003d3138a81df190000000000000096 | 30.052 | 4.958 | n/a | 0.000 | 0.135 | 2.424 | 5.353 | 0.076 | 0.000 | 1.201 | 15.848 | n/a | n/a | 0.058 | 5.093 | 0.169 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.052 | 0.635 | n/a | 1.572 | 4.958 | n/a | 0.000 | 0.135 | 2.424 | 5.353 | 0.076 | 0.000 | 1.201 | 15.848 | n/a | n/a | 0.058 | 5.093 | 0.169 | 0.058 |
| p99 | 30.052 | 0.635 | n/a | 1.572 | 4.958 | n/a | 0.000 | 0.135 | 2.424 | 5.353 | 0.076 | 0.000 | 1.201 | 15.848 | n/a | n/a | 0.058 | 5.093 | 0.169 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df190000000000000096 | 30.052 | 4.958 | n/a | 0.000 | 0.135 | 2.424 | 5.353 | 0.076 | 0.000 | 1.201 | 15.848 | n/a | n/a | 0.058 | 5.093 | 0.169 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.203 | 0.536 | n/a | 1.513 | 4.894 | n/a | 0.000 | 0.210 | 1.248 | 2.189 | 0.045 | 0.000 | 1.265 | 17.383 | n/a | n/a | 0.060 | 5.273 | 0.185 | 0.060 |
| p99 | 63.072 | 2.547 | n/a | 3.828 | 8.514 | n/a | 3.637 | 6.271 | 3.152 | 16.530 | 0.149 | 0.000 | 3.761 | 50.529 | n/a | n/a | 0.082 | 9.486 | 0.343 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000e4 | 63.072 | 5.891 | n/a | 0.000 | 0.439 | 1.701 | 3.463 | 0.047 | 0.000 | 0.921 | 50.529 | n/a | n/a | 0.082 | 6.330 | 0.100 | 0.082 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000e6 | 60.268 | 4.894 | 0.282 | 3.637 | 0.064 | 1.833 | 16.530 | 0.149 | 0.000 | 1.210 | 31.608 | n/a | n/a | 0.060 | 8.878 | 0.147 | 0.060 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000fd | 56.522 | 5.672 | 0.306 | 0.444 | 0.091 | 3.152 | 3.017 | 0.074 | 0.000 | 3.396 | 40.317 | n/a | n/a | 0.053 | 6.513 | 0.115 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000fb | 49.355 | 8.514 | n/a | 0.000 | 0.972 | 1.428 | 2.055 | 0.041 | 0.000 | 1.853 | 34.443 | n/a | n/a | 0.049 | 9.486 | 0.192 | 0.049 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000099 | 33.713 | 5.001 | 0.201 | 0.000 | 0.070 | 2.436 | 7.630 | 0.090 | 0.000 | 0.586 | 17.643 | n/a | n/a | 0.055 | 5.273 | 0.156 | 0.055 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000139 | 31.406 | 4.104 | 0.242 | 0.412 | 0.068 | 1.509 | 3.869 | 0.047 | 0.000 | 0.847 | 20.264 | n/a | n/a | 0.045 | 4.825 | 0.154 | 0.045 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000f9 | 28.398 | 4.563 | n/a | 0.000 | 0.210 | 1.199 | 3.500 | 0.117 | 0.000 | 1.265 | 17.483 | n/a | n/a | 0.060 | 4.773 | 0.168 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000131 | 27.203 | 4.941 | n/a | 0.000 | 0.325 | 0.822 | 1.228 | 0.037 | 0.000 | 2.392 | 17.383 | n/a | n/a | 0.074 | 5.267 | 0.194 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000134 | 26.607 | 2.855 | n/a | 0.000 | 6.271 | 0.728 | 1.299 | 0.037 | 0.000 | 3.761 | 11.615 | n/a | n/a | 0.041 | 9.126 | 0.343 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.076ms |
| b003d3138a81df190000000000000133 | 25.358 | 6.903 | n/a | 0.000 | 0.761 | 0.835 | 1.566 | 0.036 | 0.000 | 2.139 | 13.043 | n/a | n/a | 0.074 | 7.664 | 0.302 | 0.074 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000137 | 24.761 | 5.770 | 2.112 | 0.398 | 0.119 | 2.603 | 2.189 | 0.063 | 0.000 | 2.029 | 9.414 | n/a | n/a | 0.065 | 8.399 | 0.339 | 0.065 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df19000000000000012f | 23.404 | 3.704 | 0.264 | 0.246 | 0.126 | 1.248 | 3.611 | 0.045 | 0.000 | 3.064 | 11.024 | n/a | n/a | 0.073 | 4.340 | 0.185 | 0.073 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000101 | 18.693 | 3.821 | n/a | 0.000 | 0.825 | 1.188 | 1.968 | 0.040 | 0.000 | 0.586 | 10.224 | n/a | n/a | 0.042 | 4.646 | 0.249 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000ff | 15.152 | 3.860 | n/a | 0.000 | 0.309 | 1.019 | 1.068 | 0.036 | 0.000 | 0.516 | 8.278 | n/a | n/a | 0.065 | 4.169 | 0.275 | 0.065 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.383 | 0.935 | n/a | 1.220 | 4.488 | 0.323 | 0.000 | 0.052 | 1.289 | 3.528 | 0.069 | 0.000 | 0.971 | 10.890 | n/a | n/a | 0.071 | 4.751 | 0.223 | 0.071 |
| p99 | 35.195 | 2.735 | n/a | 3.417 | 7.485 | n/a | 1.008 | 0.341 | 4.482 | 10.359 | 0.103 | 0.000 | 3.672 | 15.493 | n/a | n/a | 0.124 | 7.831 | 0.336 | 0.124 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000a0 | 35.195 | 7.485 | 0.323 | 0.000 | 0.023 | 4.482 | 3.528 | 0.065 | 0.000 | 3.672 | 15.493 | n/a | n/a | 0.124 | 7.831 | 0.223 | 0.124 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.093ms |
| b003d3138a81df19000000000000009f | 30.199 | 3.198 | n/a | 0.000 | 0.341 | 0.932 | 10.359 | 0.094 | 0.000 | 2.750 | 12.439 | n/a | n/a | 0.085 | 3.539 | 0.117 | 0.085 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df19000000000000009a | 22.383 | 6.186 | n/a | 1.008 | 0.327 | 1.289 | 1.574 | 0.069 | 0.000 | 0.971 | 10.890 | n/a | n/a | 0.071 | 7.520 | 0.336 | 0.071 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df19000000000000009d | 18.195 | 4.488 | 0.212 | 0.000 | 0.052 | 2.717 | 3.988 | 0.103 | 0.000 | 0.907 | 5.677 | n/a | n/a | 0.052 | 4.751 | 0.261 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.383 | 1.139 | n/a | 1.594 | 3.198 | n/a | 0.000 | 0.327 | 0.932 | 1.574 | 0.069 | 0.000 | 0.971 | 10.890 | n/a | n/a | 0.071 | 3.539 | 0.117 | 0.071 |
| p99 | 30.199 | 2.735 | n/a | 3.417 | 6.186 | n/a | 1.008 | 0.341 | 1.289 | 10.359 | 0.094 | 0.000 | 2.750 | 12.439 | n/a | n/a | 0.085 | 7.520 | 0.336 | 0.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df19000000000000009f | 30.199 | 3.198 | n/a | 0.000 | 0.341 | 0.932 | 10.359 | 0.094 | 0.000 | 2.750 | 12.439 | n/a | n/a | 0.085 | 3.539 | 0.117 | 0.085 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df19000000000000009a | 22.383 | 6.186 | n/a | 1.008 | 0.327 | 1.289 | 1.574 | 0.069 | 0.000 | 0.971 | 10.890 | n/a | n/a | 0.071 | 7.520 | 0.336 | 0.071 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.058 | 1.000 | n/a | 1.004 | 5.599 | 0.291 | 0.000 | 0.176 | 2.373 | 3.575 | 0.078 | 0.000 | 0.610 | 11.899 | n/a | n/a | 0.048 | 6.626 | 0.303 | 0.048 |
| p99 | 37.289 | 2.087 | n/a | 2.671 | 6.168 | n/a | 1.068 | 1.084 | 2.390 | 9.479 | 0.097 | 0.000 | 0.752 | 18.086 | n/a | n/a | 0.072 | 7.155 | 0.310 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000a8 | 37.289 | 6.168 | 0.282 | 0.000 | 0.176 | 2.373 | 9.479 | 0.078 | 0.000 | 0.610 | 18.086 | n/a | n/a | 0.038 | 6.626 | 0.178 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000a2 | 23.058 | 5.003 | n/a | 1.068 | 1.084 | 1.207 | 1.956 | 0.041 | 0.000 | 0.752 | 11.899 | n/a | n/a | 0.048 | 7.155 | 0.310 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000a5 | 19.682 | 5.599 | 0.291 | 0.000 | 0.080 | 2.390 | 3.575 | 0.097 | 0.000 | 0.522 | 7.056 | n/a | n/a | 0.072 | 5.970 | 0.303 | 0.072 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 43.683 | 0.500 | n/a | 1.850 | 5.813 | 0.662 | 0.000 | 0.099 | 1.523 | 9.846 | 0.144 | 0.000 | 1.007 | 23.185 | n/a | n/a | 0.048 | 6.304 | 0.164 | 0.048 |
| p99 | 76.190 | 2.908 | n/a | 2.534 | 10.308 | n/a | 4.289 | 0.677 | 3.925 | 13.689 | 0.198 | 0.000 | 4.223 | 43.094 | n/a | n/a | 0.064 | 15.356 | 0.202 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000b1 | 76.190 | 10.308 | 0.662 | 4.289 | 0.098 | 3.925 | 12.564 | 0.189 | 0.000 | 1.007 | 43.094 | n/a | n/a | 0.055 | 15.356 | 0.202 | 0.055 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.worker-message 0.731ms |
| b003d3138a81df1900000000000000a9 | 48.163 | 7.515 | n/a | 0.443 | 0.107 | 1.523 | 13.689 | 0.198 | 0.000 | 1.454 | 23.185 | n/a | n/a | 0.048 | 8.066 | 0.167 | 0.048 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000ab | 43.683 | 5.310 | n/a | 0.000 | 0.677 | 0.545 | 5.819 | 0.061 | 0.000 | 0.500 | 30.707 | n/a | n/a | 0.064 | 5.986 | 0.137 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000ae | 38.409 | 5.813 | 0.392 | 0.000 | 0.099 | 1.706 | 9.846 | 0.144 | 0.000 | 4.223 | 16.138 | n/a | n/a | 0.047 | 6.304 | 0.164 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.worker-message 0.899ms |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 76.958 | 0.383 | n/a | 0.748 | 5.306 | 0.347 | 0.000 | 0.124 | 2.061 | 5.315 | 0.073 | 0.000 | 1.083 | 35.596 | n/a | n/a | 0.061 | 6.470 | 0.079 | 0.061 |
| p99 | 199.701 | 2.212 | n/a | 2.314 | 11.945 | n/a | 0.624 | 1.232 | 2.379 | 37.892 | 0.203 | 0.000 | 4.965 | 184.963 | n/a | n/a | 0.116 | 12.627 | 0.195 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000b5 | 199.701 | 5.306 | n/a | 0.000 | 0.426 | 2.379 | 1.564 | 0.046 | 0.000 | 4.965 | 184.963 | n/a | n/a | 0.052 | 5.732 | 0.029 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000b7 | 82.191 | 5.238 | n/a | 0.000 | 1.232 | 0.954 | 37.892 | 0.080 | 0.000 | 1.083 | 35.596 | n/a | n/a | 0.116 | 6.470 | 0.079 | 0.116 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000ba | 76.958 | 11.945 | 0.216 | 0.369 | 0.097 | 2.304 | 20.637 | 0.203 | 0.000 | 1.168 | 39.958 | n/a | n/a | 0.061 | 12.627 | 0.164 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000b3 | 35.513 | 5.826 | 0.347 | 0.624 | 0.124 | 2.061 | 5.315 | 0.073 | 0.000 | 0.622 | 20.448 | n/a | n/a | 0.073 | 6.920 | 0.195 | 0.073 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 82.191 | 1.913 | n/a | 1.869 | 5.238 | n/a | 0.000 | 0.426 | 0.954 | 1.564 | 0.046 | 0.000 | 1.083 | 35.596 | n/a | n/a | 0.052 | 5.732 | 0.029 | 0.052 |
| p99 | 199.701 | 2.212 | n/a | 2.314 | 5.306 | n/a | 0.000 | 1.232 | 2.379 | 37.892 | 0.080 | 0.000 | 4.965 | 184.963 | n/a | n/a | 0.116 | 6.470 | 0.079 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000b5 | 199.701 | 5.306 | n/a | 0.000 | 0.426 | 2.379 | 1.564 | 0.046 | 0.000 | 4.965 | 184.963 | n/a | n/a | 0.052 | 5.732 | 0.029 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000b7 | 82.191 | 5.238 | n/a | 0.000 | 1.232 | 0.954 | 37.892 | 0.080 | 0.000 | 1.083 | 35.596 | n/a | n/a | 0.116 | 6.470 | 0.079 | 0.116 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 43.126 | 0.581 | n/a | 0.415 | 5.008 | 0.265 | 0.000 | 0.060 | 1.594 | 12.369 | 0.075 | 0.000 | 1.609 | 21.169 | n/a | n/a | 0.041 | 5.599 | 0.107 | 0.041 |
| p99 | 135.145 | 5.806 | n/a | 7.552 | 13.333 | n/a | 0.367 | 1.108 | 3.198 | 26.487 | 0.087 | 0.000 | 5.143 | 96.182 | n/a | n/a | 0.101 | 13.667 | 0.171 | 0.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000bf | 135.145 | 5.008 | 0.265 | 0.266 | 0.060 | 1.594 | 26.487 | 0.087 | 0.000 | 5.143 | 96.182 | n/a | n/a | 0.053 | 5.599 | 0.041 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | client.parse 1.287ms; driver.worker-message 0.824ms; driver.worker-message 0.703ms; driver.worker-message 0.547ms |
| b003d3138a81df1900000000000000bb | 127.816 | 13.333 | n/a | 0.000 | 0.334 | 1.682 | 21.050 | 0.083 | 0.000 | 1.609 | 89.625 | n/a | n/a | 0.101 | 13.667 | 0.107 | 0.101 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000c4 | 43.126 | 5.158 | 0.252 | 0.367 | 0.049 | 3.198 | 12.369 | 0.075 | 0.000 | 0.455 | 21.169 | n/a | n/a | 0.035 | 5.826 | 0.135 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000c1 | 30.947 | 4.187 | n/a | 0.000 | 1.108 | 1.586 | 3.805 | 0.074 | 0.000 | 2.327 | 17.819 | n/a | n/a | 0.041 | 5.295 | 0.171 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.043 | n/a | n/a | n/a | 10.100 | 2.117 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 12.011 | 0.998 | 0.016 |
| p99 | 201.474 | n/a | n/a | n/a | 37.195 | 24.539 | 2.622 | 0.000 | 2.806 | 136.521 | 7.690 | 12.898 | 0.312 | 0.000 | n/a | n/a | 0.057 | 63.090 | 1.000 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000bc | 201.474 | 37.195 | 23.273 | 2.622 | 0.000 | 1.486 | 136.521 | 0.026 | 0.000 | 0.312 | 0.000 | n/a | n/a | 0.039 | 63.090 | 0.313 | 0.039 | gw-w/thread-49/gateway.admitted-work | none observed |
| b003d3138a81df190000000000000119 | 166.257 | 34.447 | 23.541 | 2.291 | 0.000 | 1.655 | 91.357 | 0.017 | 12.898 | 0.036 | 0.000 | n/a | n/a | 0.016 | 60.278 | 0.363 | 0.016 | gw-w/thread-45/gateway.admitted-work | client.encode 4.284ms |
| b003d3138a81df1900000000000000c6 | 66.975 | 12.614 | 4.126 | 0.000 | 0.000 | 2.806 | 47.382 | 0.012 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.012 | 16.740 | 0.250 | 0.012 | gw-w/thread-52/gateway.admitted-work | none observed |
| b003d3138a81df190000000000000106 | 64.414 | 21.755 | 7.142 | 2.451 | 0.000 | 1.101 | 31.918 | 0.008 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.014 | 31.347 | 0.487 | 0.014 | gw-w/thread-52/gateway.admitted-work | none observed |
| b003d3138a81df1900000000000000f2 | 45.665 | 15.576 | 1.148 | 0.000 | 0.000 | 0.737 | 20.473 | 7.690 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.014 | 16.724 | 0.366 | 0.014 | gw-w/thread-48/gateway.admitted-work | none observed |
| b003d3138a81df190000000000000129 | 31.319 | 6.768 | 24.539 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 31.307 | 1.000 | 0.012 | node-13/thread-0/rpc.replica.observe | none observed |
| b003d3138a81df190000000000000135 | 15.817 | 0.530 | 15.271 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 15.801 | 0.999 | 0.016 | node-13/thread-0/rpc.replica.observe | none observed |
| b003d3138a81df1900000000000000ee | 13.291 | 13.166 | 0.103 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 13.269 | 0.998 | 0.022 | node-13/thread-2/replica.pull-at | none observed |
| b003d3138a81df190000000000000093 | 13.125 | 1.245 | 11.823 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.057 | 13.068 | 0.996 | 0.057 | node-13/thread-0/rpc.replica.observe | none observed |
| b003d3138a81df190000000000000097 | 12.862 | 10.733 | 2.117 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 12.850 | 0.999 | 0.012 | node-13/thread-2/replica.pull-at | none observed |
| b003d3138a81df1900000000000000db | 12.043 | 11.210 | 0.801 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 12.011 | 0.997 | 0.031 | node-13/thread-2/replica.pull-at | none observed |
| b003d3138a81df190000000000000109 | 11.444 | 11.320 | 0.110 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 11.429 | 0.999 | 0.014 | node-13/thread-2/replica.pull-at | none observed |
| b003d3138a81df1900000000000000a1 | 11.080 | 8.422 | 2.646 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 11.068 | 0.999 | 0.012 | node-13/thread-2/replica.pull-at | driver.expected-state.bind-receipt 1.053ms |
| b003d3138a81df1900000000000000fc | 10.881 | 10.696 | 0.168 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 10.864 | 0.998 | 0.017 | node-13/thread-2/replica.pull-at | none observed |
| b003d3138a81df190000000000000148 | 10.699 | 8.529 | 2.154 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 10.683 | 0.998 | 0.016 | node-13/thread-2/replica.pull-at | none observed |
| b003d3138a81df1900000000000000e5 | 10.642 | 10.100 | 0.521 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 10.620 | 0.998 | 0.022 | node-13/thread-2/replica.pull-at | none observed |
| b003d3138a81df1900000000000000b8 | 10.174 | 9.566 | 0.588 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 10.154 | 0.998 | 0.020 | node-13/thread-2/replica.pull-at | none observed |
| b003d3138a81df1900000000000000b6 | 9.464 | 7.609 | 1.844 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 9.452 | 0.999 | 0.012 | node-13/thread-2/replica.pull-at | none observed |
| b003d3138a81df19000000000000013c | 9.174 | 9.073 | 0.081 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 9.154 | 0.998 | 0.021 | node-13/thread-2/replica.pull-at | none observed |
| b003d3138a81df1900000000000000d9 | 9.049 | 3.354 | 5.677 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 9.031 | 0.998 | 0.019 | node-13/thread-0/rpc.replica.observe | driver.worker-message 1.083ms |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.947 | 1.014 | n/a | 1.931 | 4.187 | n/a | 0.000 | 1.108 | 1.586 | 3.805 | 0.074 | 0.000 | 2.327 | 17.819 | n/a | n/a | 0.041 | 5.295 | 0.171 | 0.041 |
| p99 | 30.947 | 1.014 | n/a | 1.931 | 4.187 | n/a | 0.000 | 1.108 | 1.586 | 3.805 | 0.074 | 0.000 | 2.327 | 17.819 | n/a | n/a | 0.041 | 5.295 | 0.171 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000c1 | 30.947 | 4.187 | n/a | 0.000 | 1.108 | 1.586 | 3.805 | 0.074 | 0.000 | 2.327 | 17.819 | n/a | n/a | 0.041 | 5.295 | 0.171 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 48.950 | 0.530 | n/a | 1.498 | 5.292 | n/a | 0.000 | 0.751 | 4.764 | 10.696 | 0.067 | 0.000 | 3.378 | 27.362 | n/a | n/a | 0.053 | 5.836 | 0.119 | 0.053 |
| p99 | 284.867 | 0.566 | n/a | 1.757 | 6.657 | n/a | 0.301 | 1.202 | 9.141 | 32.722 | 0.202 | 0.000 | 6.071 | 237.457 | n/a | n/a | 0.062 | 7.860 | 0.180 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000cf | 284.867 | 6.151 | 0.748 | 0.301 | 0.071 | 2.914 | 32.722 | 0.202 | 0.000 | 4.255 | 237.457 | n/a | n/a | 0.046 | 7.271 | 0.026 | 0.046 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000c5 | 66.040 | 3.341 | n/a | 0.000 | 0.989 | 0.936 | 10.696 | 0.106 | 0.000 | 3.378 | 46.541 | n/a | n/a | 0.053 | 4.330 | 0.066 | 0.053 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000c8 | 48.950 | 5.292 | 0.196 | 0.296 | 0.052 | 9.141 | 17.023 | 0.067 | 0.000 | 1.281 | 15.569 | n/a | n/a | 0.034 | 5.836 | 0.119 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000cb | 43.624 | 6.657 | n/a | 0.000 | 1.202 | 4.764 | 2.188 | 0.051 | 0.000 | 1.338 | 27.362 | n/a | n/a | 0.062 | 7.860 | 0.180 | 0.062 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000cd | 28.084 | 3.512 | n/a | 0.000 | 0.751 | 6.077 | 1.482 | 0.042 | 0.000 | 6.071 | 10.097 | n/a | n/a | 0.053 | 4.262 | 0.152 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 43.624 | 0.532 | n/a | 1.614 | 3.512 | n/a | 0.000 | 0.989 | 4.764 | 2.188 | 0.051 | 0.000 | 3.378 | 27.362 | n/a | n/a | 0.053 | 4.330 | 0.152 | 0.053 |
| p99 | 66.040 | 0.566 | n/a | 1.757 | 6.657 | n/a | 0.000 | 1.202 | 6.077 | 10.696 | 0.106 | 0.000 | 6.071 | 46.541 | n/a | n/a | 0.062 | 7.860 | 0.180 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000c5 | 66.040 | 3.341 | n/a | 0.000 | 0.989 | 0.936 | 10.696 | 0.106 | 0.000 | 3.378 | 46.541 | n/a | n/a | 0.053 | 4.330 | 0.066 | 0.053 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000cb | 43.624 | 6.657 | n/a | 0.000 | 1.202 | 4.764 | 2.188 | 0.051 | 0.000 | 1.338 | 27.362 | n/a | n/a | 0.062 | 7.860 | 0.180 | 0.062 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000cd | 28.084 | 3.512 | n/a | 0.000 | 0.751 | 6.077 | 1.482 | 0.042 | 0.000 | 6.071 | 10.097 | n/a | n/a | 0.053 | 4.262 | 0.152 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 58.426 | 0.000 | n/a | 0.329 | 6.085 | 0.158 | 0.310 | 0.059 | 3.967 | 21.298 | 0.154 | 0.000 | 2.583 | 22.320 | n/a | n/a | 0.042 | 6.621 | 0.113 | 0.042 |
| p99 | 63.452 | 0.036 | n/a | 0.352 | 7.179 | 0.158 | 3.326 | 0.067 | 5.715 | 22.325 | 0.188 | 0.000 | 2.998 | 22.900 | n/a | n/a | 0.046 | 10.722 | 0.169 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000d4 | 63.452 | 7.179 | 0.158 | 3.326 | 0.059 | 5.715 | 21.298 | 0.188 | 0.000 | 2.583 | 22.900 | n/a | n/a | 0.046 | 10.722 | 0.169 | 0.046 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000d1 | 58.426 | 6.085 | 0.158 | 0.310 | 0.067 | 3.967 | 22.325 | 0.154 | 0.000 | 2.998 | 22.320 | n/a | n/a | 0.042 | 6.621 | 0.113 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.worker-message 0.938ms |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.436 | 0.326 | n/a | 0.588 | 5.244 | 0.421 | 0.000 | 0.142 | 2.632 | 12.592 | 0.084 | 0.000 | 4.193 | 24.213 | n/a | n/a | 0.077 | 6.310 | 0.097 | 0.077 |
| p99 | 298.334 | 0.851 | n/a | 2.741 | 16.515 | n/a | 6.726 | 1.066 | 18.115 | 34.025 | 0.343 | 0.000 | 6.103 | 217.411 | n/a | n/a | 0.103 | 23.804 | 0.198 | 0.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000d6 | 298.334 | 16.515 | 0.421 | 6.726 | 0.142 | 18.115 | 34.025 | 0.343 | 0.000 | 4.542 | 217.411 | n/a | n/a | 0.095 | 23.804 | 0.080 | 0.095 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.worker-message 1.008ms; driver.worker-message 0.726ms |
| b003d3138a81df1900000000000000dc | 53.765 | 4.931 | 0.228 | 0.000 | 0.058 | 2.632 | 14.031 | 0.095 | 0.000 | 6.103 | 25.648 | n/a | n/a | 0.040 | 5.217 | 0.097 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000d8 | 51.436 | 9.158 | n/a | 0.000 | 1.026 | 1.883 | 12.592 | 0.084 | 0.000 | 2.375 | 24.213 | n/a | n/a | 0.103 | 10.185 | 0.198 | 0.103 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000da | 34.958 | 5.244 | n/a | 0.000 | 1.066 | 4.750 | 1.827 | 0.045 | 0.000 | 4.193 | 17.757 | n/a | n/a | 0.077 | 6.310 | 0.181 | 0.077 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.958 | 0.851 | n/a | 2.741 | 5.244 | n/a | 0.000 | 1.066 | 4.750 | 1.827 | 0.045 | 0.000 | 4.193 | 17.757 | n/a | n/a | 0.077 | 6.310 | 0.181 | 0.077 |
| p99 | 34.958 | 0.851 | n/a | 2.741 | 5.244 | n/a | 0.000 | 1.066 | 4.750 | 1.827 | 0.045 | 0.000 | 4.193 | 17.757 | n/a | n/a | 0.077 | 6.310 | 0.181 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000da | 34.958 | 5.244 | n/a | 0.000 | 1.066 | 4.750 | 1.827 | 0.045 | 0.000 | 4.193 | 17.757 | n/a | n/a | 0.077 | 6.310 | 0.181 | 0.077 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.706 | 0.000 | n/a | 0.385 | 4.444 | 1.559 | 0.000 | 0.080 | 1.810 | 12.217 | 0.099 | 0.000 | 1.337 | 15.117 | n/a | n/a | 0.064 | 6.492 | 0.234 | 0.064 |
| p99 | 38.163 | 0.219 | n/a | 0.430 | 8.521 | n/a | 0.345 | 0.195 | 4.297 | 14.940 | 0.170 | 0.000 | 2.266 | 18.086 | n/a | n/a | 0.094 | 8.600 | 0.243 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000df | 38.163 | 4.444 | 0.231 | 0.000 | 0.070 | 1.810 | 12.217 | 0.099 | 0.000 | 1.151 | 18.086 | n/a | n/a | 0.056 | 4.745 | 0.124 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000de | 36.706 | 8.521 | n/a | 0.000 | 0.080 | 4.297 | 14.940 | 0.170 | 0.000 | 1.337 | 7.268 | n/a | n/a | 0.094 | 8.600 | 0.234 | 0.094 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000e1 | 26.753 | 4.392 | 1.559 | 0.345 | 0.195 | 1.109 | 1.656 | 0.049 | 0.000 | 2.266 | 15.117 | n/a | n/a | 0.064 | 6.492 | 0.243 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.706 | 0.000 | n/a | 0.351 | 8.521 | n/a | 0.000 | 0.080 | 4.297 | 14.940 | 0.170 | 0.000 | 1.337 | 7.268 | n/a | n/a | 0.094 | 8.600 | 0.234 | 0.094 |
| p99 | 36.706 | 0.000 | n/a | 0.351 | 8.521 | n/a | 0.000 | 0.080 | 4.297 | 14.940 | 0.170 | 0.000 | 1.337 | 7.268 | n/a | n/a | 0.094 | 8.600 | 0.234 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000de | 36.706 | 8.521 | n/a | 0.000 | 0.080 | 4.297 | 14.940 | 0.170 | 0.000 | 1.337 | 7.268 | n/a | n/a | 0.094 | 8.600 | 0.234 | 0.094 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.541 | 0.245 | n/a | 0.408 | 5.030 | 0.202 | 0.229 | 0.068 | 0.933 | 1.563 | 0.046 | 0.000 | 1.118 | 13.867 | n/a | n/a | 0.040 | 7.486 | 0.076 | 0.040 |
| p99 | 98.503 | 0.328 | n/a | 0.416 | 6.988 | 0.282 | 2.547 | 0.101 | 1.849 | 26.929 | 0.140 | 0.000 | 4.256 | 57.803 | n/a | n/a | 0.056 | 7.958 | 0.312 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000e8 | 98.503 | 6.988 | 0.202 | 0.229 | 0.068 | 1.849 | 26.929 | 0.140 | 0.000 | 4.256 | 57.803 | n/a | n/a | 0.040 | 7.486 | 0.076 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000ea | 25.541 | 5.030 | 0.282 | 2.547 | 0.101 | 0.933 | 1.563 | 0.046 | 0.000 | 1.118 | 13.867 | n/a | n/a | 0.056 | 7.958 | 0.312 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.760 | 0.728 | n/a | 0.906 | 5.010 | 0.377 | 0.000 | 0.125 | 2.065 | 1.992 | 0.056 | 0.000 | 1.597 | 17.609 | n/a | n/a | 0.070 | 5.519 | 0.174 | 0.070 |
| p99 | 48.039 | 1.652 | n/a | 2.217 | 6.118 | n/a | 0.426 | 0.873 | 9.585 | 3.177 | 6.451 | 0.000 | 7.485 | 21.548 | n/a | n/a | 0.167 | 6.991 | 0.205 | 0.167 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000ef | 48.039 | 5.835 | 0.377 | 0.426 | 0.125 | 9.585 | 2.197 | 6.451 | 0.000 | 1.427 | 21.548 | n/a | n/a | 0.070 | 6.762 | 0.141 | 0.070 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000ed | 34.024 | 6.118 | n/a | 0.000 | 0.873 | 4.956 | 1.992 | 0.056 | 0.000 | 2.302 | 17.609 | n/a | n/a | 0.117 | 6.991 | 0.205 | 0.117 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000f1 | 31.760 | 5.010 | n/a | 0.000 | 0.508 | 0.814 | 1.064 | 0.036 | 0.000 | 7.485 | 16.676 | n/a | n/a | 0.167 | 5.519 | 0.174 | 0.167 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df1900000000000000f6 | 31.174 | 4.638 | 0.375 | 0.296 | 0.114 | 2.065 | 3.177 | 0.664 | 0.000 | 1.597 | 18.187 | n/a | n/a | 0.062 | 5.422 | 0.174 | 0.062 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.760 | 0.728 | n/a | 1.986 | 5.010 | n/a | 0.000 | 0.508 | 0.814 | 1.064 | 0.036 | 0.000 | 7.485 | 16.676 | n/a | n/a | 0.167 | 5.519 | 0.174 | 0.167 |
| p99 | 31.760 | 0.728 | n/a | 1.986 | 5.010 | n/a | 0.000 | 0.508 | 0.814 | 1.064 | 0.036 | 0.000 | 7.485 | 16.676 | n/a | n/a | 0.167 | 5.519 | 0.174 | 0.167 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df1900000000000000f1 | 31.760 | 5.010 | n/a | 0.000 | 0.508 | 0.814 | 1.064 | 0.036 | 0.000 | 7.485 | 16.676 | n/a | n/a | 0.167 | 5.519 | 0.174 | 0.167 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.152 | 0.536 | n/a | 1.513 | 2.855 | n/a | 0.000 | 0.309 | 0.728 | 1.068 | 0.036 | 0.000 | 0.516 | 8.278 | n/a | n/a | 0.041 | 4.169 | 0.275 | 0.041 |
| p99 | 26.607 | 1.504 | n/a | 1.528 | 3.860 | n/a | 0.000 | 6.271 | 1.019 | 1.299 | 0.037 | 0.000 | 3.761 | 11.615 | n/a | n/a | 0.065 | 9.126 | 0.343 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df190000000000000134 | 26.607 | 2.855 | n/a | 0.000 | 6.271 | 0.728 | 1.299 | 0.037 | 0.000 | 3.761 | 11.615 | n/a | n/a | 0.041 | 9.126 | 0.343 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.076ms |
| b003d3138a81df1900000000000000ff | 15.152 | 3.860 | n/a | 0.000 | 0.309 | 1.019 | 1.068 | 0.036 | 0.000 | 0.516 | 8.278 | n/a | n/a | 0.065 | 4.169 | 0.275 | 0.065 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.519 | 0.552 | n/a | 1.596 | 4.385 | n/a | 0.000 | 0.561 | 2.052 | 2.393 | 0.050 | 0.000 | 0.931 | 15.997 | n/a | n/a | 0.047 | 5.022 | 0.165 | 0.047 |
| p99 | 63.903 | 1.097 | n/a | 2.219 | 7.923 | n/a | 0.447 | 1.087 | 8.677 | 17.445 | 0.094 | 0.000 | 2.924 | 36.755 | n/a | n/a | 0.064 | 8.858 | 0.392 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df190000000000000103 | 63.903 | 4.385 | 0.301 | 0.278 | 0.058 | 1.621 | 17.445 | 0.088 | 0.000 | 2.924 | 36.755 | n/a | n/a | 0.047 | 5.022 | 0.079 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000112 | 44.386 | 5.088 | n/a | 0.000 | 1.087 | 1.605 | 2.453 | 0.067 | 0.000 | 0.979 | 33.064 | n/a | n/a | 0.044 | 6.175 | 0.139 | 0.044 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000114 | 39.267 | 7.386 | 1.147 | 0.263 | 0.050 | 2.052 | 8.382 | 0.064 | 0.000 | 0.486 | 19.374 | n/a | n/a | 0.064 | 8.845 | 0.225 | 0.064 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000110 | 38.326 | 5.372 | 0.387 | 0.447 | 0.128 | 2.575 | 12.120 | 0.094 | 0.000 | 0.994 | 16.147 | n/a | n/a | 0.062 | 6.334 | 0.165 | 0.062 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df19000000000000010e | 30.519 | 2.785 | n/a | 0.000 | 0.906 | 8.617 | 1.387 | 0.040 | 0.000 | 2.729 | 14.018 | n/a | n/a | 0.037 | 3.690 | 0.121 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df19000000000000010a | 26.203 | 3.094 | n/a | 0.000 | 0.387 | 8.677 | 1.741 | 0.050 | 0.000 | 0.463 | 11.736 | n/a | n/a | 0.054 | 3.482 | 0.133 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000105 | 24.456 | 3.604 | n/a | 0.000 | 0.561 | 1.252 | 2.393 | 0.047 | 0.000 | 0.561 | 15.997 | n/a | n/a | 0.041 | 4.165 | 0.170 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df19000000000000010b | 22.582 | 7.923 | n/a | 0.000 | 0.935 | 3.916 | 1.555 | 0.045 | 0.000 | 0.931 | 7.214 | n/a | n/a | 0.063 | 8.858 | 0.392 | 0.063 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.160ms |
| b003d3138a81df190000000000000108 | 21.483 | 3.620 | n/a | 0.000 | 0.758 | 0.887 | 1.616 | 0.046 | 0.000 | 0.895 | 13.620 | n/a | n/a | 0.042 | 4.378 | 0.204 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.203 | 0.383 | n/a | 1.443 | 2.785 | n/a | 0.000 | 0.387 | 8.617 | 1.387 | 0.040 | 0.000 | 0.463 | 11.736 | n/a | n/a | 0.037 | 3.482 | 0.121 | 0.037 |
| p99 | 30.519 | 0.552 | n/a | 1.596 | 3.094 | n/a | 0.000 | 0.906 | 8.677 | 1.741 | 0.050 | 0.000 | 2.729 | 14.018 | n/a | n/a | 0.054 | 3.690 | 0.133 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df19000000000000010e | 30.519 | 2.785 | n/a | 0.000 | 0.906 | 8.617 | 1.387 | 0.040 | 0.000 | 2.729 | 14.018 | n/a | n/a | 0.037 | 3.690 | 0.121 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df19000000000000010a | 26.203 | 3.094 | n/a | 0.000 | 0.387 | 8.677 | 1.741 | 0.050 | 0.000 | 0.463 | 11.736 | n/a | n/a | 0.054 | 3.482 | 0.133 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 57.068 | 0.493 | n/a | 0.562 | 4.721 | 9.103 | 0.245 | 0.079 | 2.285 | 9.677 | 0.093 | 0.000 | 1.634 | 26.133 | n/a | n/a | 0.045 | 6.077 | 0.109 | 0.045 |
| p99 | 95.651 | 1.829 | n/a | 2.539 | 4.952 | n/a | 0.476 | 21.648 | 4.039 | 25.091 | 0.233 | 11.461 | 10.510 | 74.270 | n/a | n/a | 0.090 | 24.271 | 0.425 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df190000000000000117 | 95.651 | 4.952 | n/a | 0.000 | 1.125 | 4.039 | 9.677 | 0.093 | 0.000 | 1.449 | 74.270 | n/a | n/a | 0.045 | 6.077 | 0.064 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000118 | 76.947 | 4.721 | 0.294 | 0.290 | 0.055 | 2.285 | 25.091 | 0.233 | 0.000 | 10.510 | 33.413 | n/a | n/a | 0.056 | 5.359 | 0.070 | 0.056 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | client.encode 4.284ms; driver.publication 1.637ms |
| b003d3138a81df190000000000000128 | 57.068 | 2.623 | n/a | 0.000 | 21.648 | 1.155 | 7.432 | 0.088 | 0.000 | 6.842 | 17.237 | n/a | n/a | 0.045 | 24.271 | 0.425 | 0.045 | node-13/thread-0/driver.queue.scheduler-late | client.encode 4.256ms |
| b003d3138a81df190000000000000121 | 52.227 | 4.889 | 0.287 | 0.476 | 0.029 | 1.582 | 5.540 | 0.107 | 11.461 | 1.634 | 26.133 | n/a | n/a | 0.090 | 5.681 | 0.109 | 0.090 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df19000000000000012c | 52.094 | 4.427 | 9.103 | 0.245 | 0.079 | 2.422 | 10.067 | 0.059 | 0.000 | 1.253 | 24.395 | n/a | n/a | 0.045 | 13.853 | 0.266 | 0.045 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 57.068 | 0.493 | n/a | 1.278 | 2.623 | n/a | 0.000 | 21.648 | 1.155 | 7.432 | 0.088 | 0.000 | 6.842 | 17.237 | n/a | n/a | 0.045 | 24.271 | 0.425 | 0.045 |
| p99 | 57.068 | 0.493 | n/a | 1.278 | 2.623 | n/a | 0.000 | 21.648 | 1.155 | 7.432 | 0.088 | 0.000 | 6.842 | 17.237 | n/a | n/a | 0.045 | 24.271 | 0.425 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df190000000000000128 | 57.068 | 2.623 | n/a | 0.000 | 21.648 | 1.155 | 7.432 | 0.088 | 0.000 | 6.842 | 17.237 | n/a | n/a | 0.045 | 24.271 | 0.425 | 0.045 | node-13/thread-0/driver.queue.scheduler-late | client.encode 4.256ms |

## P4 / p4h10 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.606 | 0.480 | n/a | 0.477 | 3.967 | 1.127 | 0.000 | 0.063 | 1.028 | 1.259 | 0.042 | 0.000 | 0.654 | 16.732 | n/a | n/a | 0.049 | 4.705 | 0.121 | 0.049 |
| p99 | 54.557 | 2.109 | n/a | 2.763 | 5.181 | n/a | 0.455 | 1.043 | 2.004 | 13.937 | 0.095 | 0.000 | 1.968 | 45.527 | n/a | n/a | 0.061 | 6.395 | 0.247 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df19000000000000013b | 54.557 | 3.439 | n/a | 0.000 | 0.885 | 1.028 | 3.073 | 0.052 | 0.000 | 0.493 | 45.527 | n/a | n/a | 0.061 | 4.324 | 0.079 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df19000000000000013d | 38.831 | 3.967 | 0.221 | 0.455 | 0.062 | 2.004 | 13.937 | 0.095 | 0.000 | 1.968 | 16.082 | n/a | n/a | 0.040 | 4.705 | 0.121 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df19000000000000013f | 28.606 | 5.181 | n/a | 0.000 | 1.043 | 1.067 | 1.259 | 0.041 | 0.000 | 0.815 | 19.148 | n/a | n/a | 0.052 | 6.224 | 0.218 | 0.052 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000141 | 25.910 | 4.831 | 1.127 | 0.374 | 0.063 | 1.015 | 1.024 | 0.042 | 0.000 | 0.654 | 16.732 | n/a | n/a | 0.049 | 6.395 | 0.247 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.606 | 0.816 | n/a | 1.683 | 3.439 | n/a | 0.000 | 0.885 | 1.028 | 1.259 | 0.041 | 0.000 | 0.493 | 19.148 | n/a | n/a | 0.052 | 4.324 | 0.079 | 0.052 |
| p99 | 54.557 | 2.109 | n/a | 2.763 | 5.181 | n/a | 0.000 | 1.043 | 1.067 | 3.073 | 0.052 | 0.000 | 0.815 | 45.527 | n/a | n/a | 0.061 | 6.224 | 0.218 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df19000000000000013b | 54.557 | 3.439 | n/a | 0.000 | 0.885 | 1.028 | 3.073 | 0.052 | 0.000 | 0.493 | 45.527 | n/a | n/a | 0.061 | 4.324 | 0.079 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df19000000000000013f | 28.606 | 5.181 | n/a | 0.000 | 1.043 | 1.067 | 1.259 | 0.041 | 0.000 | 0.815 | 19.148 | n/a | n/a | 0.052 | 6.224 | 0.218 | 0.052 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.549 | 1.155 | n/a | 1.706 | 3.947 | n/a | 0.000 | 0.420 | 0.928 | 1.341 | 0.048 | 0.000 | 0.468 | 14.823 | n/a | n/a | 0.047 | 4.787 | 0.199 | 0.047 |
| p99 | 33.166 | 2.719 | n/a | 2.173 | 5.047 | n/a | 0.000 | 1.124 | 1.835 | 8.412 | 0.097 | 0.000 | 1.247 | 17.818 | n/a | n/a | 0.063 | 5.395 | 0.256 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df19000000000000014b | 33.166 | 4.501 | 0.229 | 0.000 | 0.056 | 1.835 | 8.412 | 0.097 | 0.000 | 1.247 | 16.747 | n/a | n/a | 0.042 | 4.787 | 0.144 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000143 | 30.478 | 5.047 | 0.233 | 0.000 | 0.115 | 1.357 | 5.382 | 0.057 | 0.000 | 0.416 | 17.818 | n/a | n/a | 0.052 | 5.395 | 0.177 | 0.052 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000147 | 22.549 | 3.947 | n/a | 0.000 | 0.933 | 0.889 | 1.273 | 0.034 | 0.000 | 0.678 | 14.731 | n/a | n/a | 0.063 | 4.880 | 0.216 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000149 | 22.032 | 3.253 | n/a | 0.000 | 1.124 | 0.928 | 1.341 | 0.048 | 0.000 | 0.468 | 14.823 | n/a | n/a | 0.047 | 4.377 | 0.199 | 0.047 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| b003d3138a81df190000000000000145 | 15.718 | 3.609 | n/a | 0.000 | 0.420 | 0.738 | 1.156 | 0.045 | 0.000 | 0.376 | 9.328 | n/a | n/a | 0.046 | 4.029 | 0.256 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.032 | 1.601 | n/a | 1.723 | 3.253 | n/a | 0.000 | 1.124 | 0.928 | 1.341 | 0.048 | 0.000 | 0.468 | 14.823 | n/a | n/a | 0.047 | 4.377 | 0.199 | 0.047 |
| p99 | 22.032 | 1.601 | n/a | 1.723 | 3.253 | n/a | 0.000 | 1.124 | 0.928 | 1.341 | 0.048 | 0.000 | 0.468 | 14.823 | n/a | n/a | 0.047 | 4.377 | 0.199 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df190000000000000149 | 22.032 | 3.253 | n/a | 0.000 | 1.124 | 0.928 | 1.341 | 0.048 | 0.000 | 0.468 | 14.823 | n/a | n/a | 0.047 | 4.377 | 0.199 | 0.047 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.975 | 0.219 | n/a | 0.203 | 86.944 | n/a | 0.000 | 0.007 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 86.952 | 1.000 | 0.025 |
| p99 | 131.214 | 1.316 | n/a | 4.519 | 131.143 | n/a | 0.000 | 0.040 | 3.413 | 1.223 | 0.046 | 0.000 | 7.552 | 21.958 | n/a | n/a | 0.258 | 131.149 | 1.000 | 0.258 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b003d3138a81df190000000000000156 | 131.214 | 131.143 | n/a | 0.000 | 0.006 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.064 | 131.149 | 1.000 | 0.064 | node-13/thread-0/client.persist-and-resolve | driver.publication 4.973ms; driver.publication 3.598ms; driver.publication 2.664ms; driver.publication 2.294ms; driver.publication 1.785ms |
| b003d3138a81df190000000000000155 | 124.997 | 124.961 | n/a | 0.000 | 0.006 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 124.967 | 1.000 | 0.030 | node-13/thread-0/client.persist-and-resolve | driver.publication 4.973ms; driver.publication 3.598ms; driver.publication 2.664ms; driver.publication 2.294ms; driver.publication 1.785ms |
| b003d3138a81df190000000000000154 | 111.576 | 111.531 | n/a | 0.000 | 0.007 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 111.538 | 1.000 | 0.038 | node-13/thread-0/client.persist-and-resolve | driver.publication 3.598ms; driver.publication 2.664ms; driver.publication 2.294ms; driver.publication 1.785ms; driver.publication 1.479ms |
| b003d3138a81df190000000000000153 | 105.695 | 105.667 | n/a | 0.000 | 0.005 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 105.672 | 1.000 | 0.023 | node-13/thread-0/client.persist-and-resolve | driver.publication 3.598ms; driver.publication 2.294ms; driver.publication 1.785ms; driver.publication 1.479ms; driver.publication 1.394ms |
| b003d3138a81df190000000000000152 | 94.409 | 94.378 | n/a | 0.000 | 0.007 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 94.385 | 1.000 | 0.024 | node-13/thread-0/client.persist-and-resolve | driver.publication 3.598ms; driver.publication 1.785ms; driver.publication 1.479ms; driver.publication 1.394ms; driver.publication 1.203ms |
| b003d3138a81df190000000000000151 | 86.975 | 86.944 | n/a | 0.000 | 0.008 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 86.952 | 1.000 | 0.024 | node-13/thread-0/client.persist-and-resolve | driver.publication 3.598ms; driver.publication 1.785ms; driver.publication 1.479ms; driver.publication 1.394ms; driver.publication 1.031ms |
| b003d3138a81df190000000000000150 | 71.205 | 71.161 | n/a | 0.000 | 0.013 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 71.174 | 1.000 | 0.031 | node-13/thread-0/client.persist-and-resolve | driver.publication 3.598ms; driver.publication 1.479ms; driver.publication 1.394ms; driver.publication 1.031ms |
| b003d3138a81df19000000000000014f | 58.823 | 58.796 | n/a | 0.000 | 0.008 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 58.803 | 1.000 | 0.020 | node-13/thread-0/client.persist-and-resolve | driver.publication 3.598ms; driver.publication 1.479ms; driver.publication 1.031ms |
| b003d3138a81df19000000000000014e | 53.652 | 53.613 | n/a | 0.000 | 0.014 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 53.627 | 1.000 | 0.025 | node-13/thread-0/client.persist-and-resolve | driver.publication 3.598ms; driver.publication 1.479ms |
| b003d3138a81df19000000000000014d | 42.269 | 7.780 | n/a | 0.000 | 0.040 | 3.413 | 1.223 | 0.046 | 0.000 | 7.552 | 21.958 | n/a | n/a | 0.258 | 7.819 | 0.185 | 0.258 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (220 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.021 | n/a | n/a | n/a | 0.019 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.020 | 0.933 | 0.001 |
| p99 | 308.529 | n/a | n/a | n/a | 45.519 | n/a | 8.003 | 308.352 | 6.229 | 5.619 | 0.029 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.027 | 308.514 | 1.000 | 0.027 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1a6e1b2fc6cf45000000000000050f | 308.777 | 0.071 | n/a | 0.000 | 308.704 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 308.775 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 864486d632ca7dd50000000000000796 | 308.699 | 0.433 | n/a | 0.000 | 308.263 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 308.696 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf450000000000000510 | 308.529 | 0.133 | n/a | 0.000 | 308.381 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 308.514 | 1.000 | 0.015 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf450000000000000511 | 308.390 | 0.031 | n/a | 0.000 | 308.352 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 308.384 | 1.000 | 0.006 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 13597a31c87247910000000000000f36 | 308.343 | 0.060 | n/a | 0.000 | 308.280 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 308.340 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf450000000000000512 | 308.324 | 0.040 | n/a | 0.000 | 308.275 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 308.315 | 1.000 | 0.009 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 13597a31c87247910000000000000f37 | 308.306 | 0.031 | n/a | 0.000 | 308.272 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 308.303 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf450000000000000513 | 308.292 | 0.028 | n/a | 0.000 | 308.259 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 308.287 | 1.000 | 0.005 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 13597a31c87247910000000000000f38 | 308.274 | 0.024 | n/a | 0.000 | 308.248 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 308.272 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 13597a31c87247910000000000000f35 | 307.589 | 0.361 | n/a | 0.000 | 307.225 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 307.585 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 13597a31c87247910000000000000f43 | 307.518 | 0.052 | n/a | 0.000 | 307.462 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 307.514 | 1.000 | 0.004 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 864486d632ca7dd500000000000007d1 | 307.420 | 0.050 | n/a | 0.000 | 307.368 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 307.417 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 864486d632ca7dd500000000000007d2 | 307.395 | 0.022 | n/a | 0.000 | 307.371 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 307.392 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 864486d632ca7dd500000000000007d4 | 307.310 | 0.029 | n/a | 0.000 | 307.279 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 307.308 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 864486d632ca7dd500000000000007d5 | 307.300 | 0.017 | n/a | 0.000 | 307.281 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 307.298 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf4500000000000004de | 307.081 | 0.351 | n/a | 0.000 | 306.727 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 307.078 | 1.000 | 0.003 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf45000000000000b0cb | 279.773 | 0.052 | n/a | 0.000 | 279.719 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.772 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf45000000000000b0ca | 279.717 | 0.034 | n/a | 0.000 | 279.683 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.717 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf45000000000000b0c9 | 279.670 | 0.034 | n/a | 0.000 | 279.635 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.669 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf45000000000000b0c8 | 279.617 | 0.078 | n/a | 0.000 | 279.538 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.616 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |

## P1 / L1 / read (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.012 | 0.933 | 0.001 |
| p99 | 297.366 | n/a | n/a | n/a | 2.441 | n/a | 0.000 | 297.124 | 1.441 | 1.503 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 297.364 | 1.000 | 0.005 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1a6e1b2fc6cf4500000000000201ce | 297.366 | 0.240 | n/a | 0.000 | 297.124 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 297.364 | 1.000 | 0.003 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.030ms |
| 1e1a6e1b2fc6cf45000000000000d0d6 | 269.850 | 0.152 | n/a | 0.000 | 269.694 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 269.846 | 1.000 | 0.004 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf45000000000000d061 | 5.388 | 2.441 | n/a | 0.000 | 0.000 | 1.441 | 1.503 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.441 | 0.453 | 0.002 | node-13/thread-3/reader.execute | none observed |
| 1e1a6e1b2fc6cf45000000000000d033 | 2.229 | 0.093 | n/a | 0.000 | 2.133 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.226 | 0.999 | 0.003 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf45000000000000da17 | 0.833 | 0.831 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.831 | 0.999 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000001c1fd | 0.743 | 0.739 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.739 | 0.994 | 0.004 | node-13/thread-3/reader.execute | none observed |
| 1e1a6e1b2fc6cf4500000000000174bf | 0.502 | 0.500 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.500 | 0.996 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000000f5b3 | 0.423 | 0.420 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.420 | 0.994 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000000d090 | 0.410 | 0.406 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.406 | 0.991 | 0.004 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000000d062 | 0.361 | 0.356 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.356 | 0.986 | 0.005 | node-13/thread-3/replica.pull-at | replica.apply-delta 0.021ms |
| 1e1a6e1b2fc6cf45000000000001464b | 0.326 | 0.325 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.325 | 0.996 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000168dc | 0.309 | 0.307 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.307 | 0.994 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000000d0a9 | 0.306 | 0.305 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.305 | 0.994 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf450000000000017329 | 0.295 | 0.293 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.293 | 0.994 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000000d243 | 0.292 | 0.290 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.290 | 0.992 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000000ff0e | 0.291 | 0.289 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.289 | 0.994 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000199e0 | 0.289 | 0.288 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 0.288 | 0.998 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000000d933 | 0.288 | 0.286 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.286 | 0.992 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000145eb | 0.287 | 0.285 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.285 | 0.993 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf450000000000016879 | 0.287 | 0.285 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.285 | 0.993 | 0.002 | node-13/thread-3/replica.pull-at | none observed |

## P1 / L4 / read (230 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.012 | 0.938 | 0.001 |
| p99 | 293.322 | n/a | n/a | n/a | 3.670 | n/a | 0.000 | 293.062 | 1.304 | 0.885 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.582 | 293.314 | 1.000 | 0.582 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1a6e1b2fc6cf4500000000000214c8 | 293.723 | 0.254 | n/a | 0.000 | 293.456 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 293.710 | 1.000 | 0.013 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 1e1a6e1b2fc6cf4500000000000214c9 | 293.674 | 0.057 | n/a | 0.000 | 293.613 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 293.670 | 1.000 | 0.003 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 864486d632ca7dd5000000000000e08b | 293.322 | 0.252 | n/a | 0.000 | 293.062 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 293.314 | 1.000 | 0.008 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 13597a31c8724791000000000000d078 | 293.088 | 0.103 | n/a | 0.000 | 292.982 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 293.085 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| 1e1a6e1b2fc6cf4500000000000201d1 | 208.606 | 0.077 | n/a | 0.000 | 208.526 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 208.604 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.030ms |
| 13597a31c8724791000000000000c802 | 208.298 | 0.521 | n/a | 0.000 | 207.761 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 208.282 | 1.000 | 0.015 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| 864486d632ca7dd5000000000000d2fa | 207.847 | 0.212 | n/a | 0.000 | 207.632 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 207.844 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 13597a31c8724791000000000000c813 | 41.701 | 35.473 | n/a | 3.470 | 0.000 | 1.304 | 1.448 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 38.943 | 0.934 | 0.006 | node-13/thread-5/reader.execute | none observed |
| 864486d632ca7dd5000000000000d334 | 6.371 | 3.302 | n/a | 0.000 | 0.000 | 1.487 | 1.520 | 0.019 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.003 | 3.302 | 0.518 | 0.003 | node-13/thread-4/reader.execute | none observed |
| 1e1a6e1b2fc6cf450000000000020283 | 4.256 | 1.450 | n/a | 0.000 | 0.000 | 1.879 | 0.885 | 0.015 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.003 | 1.450 | 0.341 | 0.003 | node-13/thread-3/socket.wait-first-byte | none observed |
| 1e1a6e1b2fc6cf4500000000000301e6 | 3.706 | 3.670 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.036 | 3.670 | 0.990 | 0.036 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000301e5 | 3.690 | 3.686 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.686 | 0.999 | 0.003 | node-13/thread-3/replica.pull-at | none observed |
| 864486d632ca7dd50000000000019fce | 3.581 | 3.578 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.578 | 0.999 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000203e0 | 3.404 | 0.090 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.314 | 0.090 | 0.026 | 3.314 | uncovered | none observed |
| 13597a31c87247910000000000019477 | 2.237 | 2.233 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.233 | 0.998 | 0.004 | node-13/thread-5/reader.execute | none observed |
| 1e1a6e1b2fc6cf450000000000030234 | 1.705 | 1.704 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.704 | 0.999 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf450000000000028cb5 | 1.660 | 1.659 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.659 | 0.999 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 13597a31c8724791000000000000f32b | 1.558 | 1.557 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.557 | 0.999 | 0.001 | node-13/thread-5/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000201dd | 1.407 | 1.404 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.404 | 0.998 | 0.003 | node-13/thread-3/replica.pull-at | replica.apply-delta 0.058ms |
| 1e1a6e1b2fc6cf4500000000000201de | 1.335 | 1.325 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 1.325 | 0.992 | 0.010 | node-13/thread-3/replica.pull-at | replica.apply-delta 0.058ms |

## P1 / L16 / read (240 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.024 | n/a | n/a | n/a | 0.019 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.023 | 0.948 | 0.001 |
| p99 | 448.242 | n/a | n/a | n/a | 23.022 | n/a | 0.000 | 448.049 | 1.597 | 0.896 | 0.006 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 448.240 | 1.000 | 0.028 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 13597a31c87247910000000000021be8 | 448.506 | 0.525 | n/a | 0.000 | 447.977 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 448.502 | 1.000 | 0.004 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 13597a31c87247910000000000021be9 | 448.257 | 0.074 | n/a | 0.000 | 448.178 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 448.252 | 1.000 | 0.005 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 13597a31c87247910000000000021bea | 448.242 | 0.037 | n/a | 0.000 | 448.202 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 448.240 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 864486d632ca7dd500000000000220fa | 448.075 | 0.025 | n/a | 0.000 | 448.049 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 448.074 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 864486d632ca7dd500000000000220f9 | 448.038 | 0.027 | n/a | 0.000 | 448.011 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 448.037 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 864486d632ca7dd500000000000220f8 | 447.999 | 0.028 | n/a | 0.000 | 447.969 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 447.998 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 864486d632ca7dd500000000000220f6 | 447.969 | 0.323 | n/a | 0.000 | 447.643 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 447.966 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 864486d632ca7dd500000000000220f7 | 447.956 | 0.051 | n/a | 0.000 | 447.905 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 447.955 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 1e1a6e1b2fc6cf450000000000038f38 | 447.351 | 0.236 | n/a | 0.000 | 447.111 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 447.347 | 1.000 | 0.003 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 1e1a6e1b2fc6cf450000000000038f39 | 447.299 | 0.051 | n/a | 0.000 | 447.246 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 447.297 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 13597a31c87247910000000000021c05 | 447.249 | 0.053 | n/a | 0.000 | 447.193 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 447.247 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 13597a31c87247910000000000021c04 | 447.243 | 0.068 | n/a | 0.000 | 447.173 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 447.241 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 1e1a6e1b2fc6cf450000000000038f77 | 445.136 | 0.089 | n/a | 0.000 | 445.045 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 445.134 | 1.000 | 0.003 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 1e1a6e1b2fc6cf450000000000038f91 | 444.103 | 0.059 | n/a | 0.000 | 444.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 444.100 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 1e1a6e1b2fc6cf450000000000038f93 | 444.064 | 0.320 | n/a | 0.000 | 443.742 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 444.062 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 1e1a6e1b2fc6cf450000000000038f92 | 444.051 | 0.018 | n/a | 0.000 | 444.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 444.049 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 864486d632ca7dd50000000000022123 | 130.313 | 0.040 | n/a | 0.000 | 130.272 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 130.312 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.044ms |
| 864486d632ca7dd5000000000002212f | 130.060 | 0.012 | n/a | 0.000 | 130.047 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 130.059 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.044ms |
| 864486d632ca7dd5000000000002212e | 130.048 | 0.013 | n/a | 0.000 | 130.034 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 130.047 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.044ms |
| 864486d632ca7dd5000000000002212d | 130.040 | 0.019 | n/a | 0.000 | 130.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 130.039 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.044ms |

## P1 / L64 / read (181 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.045 | n/a | n/a | n/a | 0.024 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.041 | 0.964 | 0.001 |
| p99 | 369.096 | n/a | n/a | n/a | 9.663 | n/a | 0.000 | 369.033 | 1.854 | 42.633 | 0.033 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.018 | 369.095 | 1.000 | 0.018 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 13597a31c8724791000000000002b3d1 | 369.331 | 0.543 | n/a | 0.000 | 368.774 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 369.317 | 1.000 | 0.014 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 13597a31c8724791000000000002b3d5 | 369.096 | 0.037 | n/a | 0.000 | 369.058 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 369.095 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 13597a31c8724791000000000002b3d4 | 369.069 | 0.033 | n/a | 0.000 | 369.033 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 369.067 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 13597a31c8724791000000000002b3d2 | 369.052 | 0.071 | n/a | 0.000 | 368.978 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 369.049 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 13597a31c8724791000000000002b3d3 | 369.039 | 0.033 | n/a | 0.000 | 369.003 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 369.036 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf4500000000000425b6 | 366.830 | 0.081 | n/a | 0.000 | 366.748 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.829 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf4500000000000425b7 | 366.801 | 0.018 | n/a | 0.000 | 366.782 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.800 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf4500000000000425b5 | 366.795 | 0.018 | n/a | 0.000 | 366.776 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.794 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf4500000000000425b4 | 366.777 | 0.047 | n/a | 0.000 | 366.728 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 366.775 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf4500000000000425cb | 366.451 | 0.035 | n/a | 0.000 | 366.415 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.449 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 864486d632ca7dd5000000000002bb29 | 366.244 | 0.024 | n/a | 0.000 | 366.220 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.244 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 864486d632ca7dd5000000000002bb28 | 366.214 | 0.029 | n/a | 0.000 | 366.184 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.212 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 864486d632ca7dd5000000000002bb27 | 366.170 | 0.033 | n/a | 0.000 | 366.136 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.169 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 864486d632ca7dd5000000000002bb26 | 366.100 | 0.057 | n/a | 0.000 | 366.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 366.099 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf4500000000000425b3 | 365.170 | 0.380 | n/a | 0.000 | 364.781 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 365.162 | 1.000 | 0.008 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 864486d632ca7dd5000000000002bb25 | 364.364 | 0.287 | n/a | 0.000 | 364.071 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 364.358 | 1.000 | 0.005 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 864486d632ca7dd50000000000034340 | 318.308 | 0.024 | n/a | 0.000 | 318.283 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 318.307 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 864486d632ca7dd5000000000003433f | 318.282 | 0.025 | n/a | 0.000 | 318.256 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 318.281 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 864486d632ca7dd5000000000003433e | 318.246 | 0.050 | n/a | 0.000 | 318.195 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 318.245 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 864486d632ca7dd5000000000003433d | 318.138 | 0.158 | n/a | 0.000 | 317.976 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 318.134 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |

## P1 / L256 / read (191 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.039 | n/a | n/a | n/a | 0.032 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.037 | 0.960 | 0.001 |
| p99 | 292.920 | n/a | n/a | n/a | 3.416 | n/a | 0.000 | 292.603 | 3.293 | 5.083 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.082 | 292.917 | 1.000 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 13597a31c8724791000000000003cfc9 | 293.240 | 0.188 | n/a | 0.000 | 293.049 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 293.238 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 864486d632ca7dd5000000000003de45 | 292.920 | 0.435 | n/a | 0.000 | 292.482 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.917 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 13597a31c8724791000000000003cff9 | 292.655 | 0.051 | n/a | 0.000 | 292.603 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.653 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 864486d632ca7dd5000000000003de46 | 292.619 | 0.053 | n/a | 0.000 | 292.563 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.616 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 13597a31c8724791000000000003cff5 | 292.604 | 0.171 | n/a | 0.000 | 292.431 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.603 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 864486d632ca7dd5000000000003de47 | 292.584 | 0.024 | n/a | 0.000 | 292.559 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.583 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 13597a31c8724791000000000003cff4 | 292.433 | 0.030 | n/a | 0.000 | 292.402 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.432 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 13597a31c8724791000000000003cff3 | 292.404 | 0.055 | n/a | 0.000 | 292.347 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.403 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 864486d632ca7dd5000000000003de63 | 291.175 | 0.070 | n/a | 0.000 | 291.104 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 291.174 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 864486d632ca7dd5000000000003de64 | 291.155 | 0.047 | n/a | 0.000 | 291.106 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 291.153 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf4500000000000546c2 | 289.613 | 0.030 | n/a | 0.000 | 289.583 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 289.612 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf4500000000000546c3 | 289.579 | 0.047 | n/a | 0.000 | 289.527 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 289.574 | 1.000 | 0.005 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf4500000000000546c6 | 289.575 | 0.062 | n/a | 0.000 | 289.511 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 289.573 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf4500000000000546c5 | 289.568 | 0.024 | n/a | 0.000 | 289.541 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 289.566 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf4500000000000546c4 | 289.549 | 0.032 | n/a | 0.000 | 289.515 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 289.546 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf4500000000000546c1 | 289.525 | 0.189 | n/a | 0.000 | 289.334 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 289.522 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e1a6e1b2fc6cf450000000000054700 | 260.762 | 0.204 | n/a | 0.000 | 260.557 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 260.761 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.030ms |
| 1e1a6e1b2fc6cf450000000000054701 | 260.678 | 0.037 | n/a | 0.000 | 260.640 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 260.677 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.030ms |
| 1e1a6e1b2fc6cf4500000000000546ff | 260.660 | 0.025 | n/a | 0.000 | 260.634 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 260.659 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.030ms |
| 1e1a6e1b2fc6cf4500000000000546fe | 260.646 | 0.036 | n/a | 0.000 | 260.609 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 260.645 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.030ms |

## P1 / L1024 / read (269 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.026 | n/a | n/a | n/a | 0.024 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.024 | 0.952 | 0.001 |
| p99 | 11.005 | n/a | n/a | n/a | 5.233 | n/a | 0.000 | 0.000 | 1.485 | 4.175 | 0.011 | 0.000 | 0.019 | 0.000 | n/a | n/a | 2.418 | 5.233 | 1.000 | 2.418 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 864486d632ca7dd5000000000003f28e | 45.842 | 19.559 | n/a | 1.527 | 0.000 | 1.485 | 23.189 | 0.028 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.005 | 21.085 | 0.460 | 0.005 | gw-r/thread-54/gateway.admitted-work | none observed |
| 13597a31c8724791000000000003e3e0 | 20.815 | 2.800 | n/a | 0.000 | 0.000 | 2.214 | 15.769 | 0.011 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.003 | 2.800 | 0.134 | 0.003 | gw-r/thread-55/gateway.admitted-work | none observed |
| 1e1a6e1b2fc6cf450000000000055c9d | 11.005 | 3.635 | n/a | 0.000 | 0.000 | 2.654 | 4.175 | 0.513 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.003 | 3.635 | 0.330 | 0.003 | gw-r/thread-48/gateway.admitted-work | none observed |
| 1e1a6e1b2fc6cf45000000000005c40b | 5.261 | 5.233 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 5.233 | 0.995 | 0.028 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000005c40a | 5.252 | 5.247 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 5.247 | 0.999 | 0.005 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000005c40c | 5.249 | 5.218 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 5.218 | 0.994 | 0.031 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000005c40d | 5.238 | 5.207 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 5.207 | 0.994 | 0.032 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000005c40e | 5.230 | 5.197 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 5.197 | 0.994 | 0.033 | node-13/thread-3/reader.execute | none observed |
| 13597a31c872479100000000000516dc | 4.770 | 4.768 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.768 | 1.000 | 0.002 | node-13/thread-5/replica.pull-at | none observed |
| 13597a31c872479100000000000516dd | 4.702 | 4.686 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 4.686 | 0.997 | 0.016 | node-13/thread-5/replica.pull-at | none observed |
| 13597a31c872479100000000000516de | 4.681 | 4.663 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.663 | 0.996 | 0.017 | node-13/thread-5/replica.pull-at | none observed |
| 13597a31c872479100000000000516df | 4.661 | 4.642 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 4.642 | 0.996 | 0.018 | node-13/thread-5/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf450000000000057fef | 4.290 | 4.285 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 4.285 | 0.999 | 0.005 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf450000000000057ff0 | 4.288 | 4.259 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 4.259 | 0.993 | 0.029 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf450000000000057ff1 | 4.260 | 4.230 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 4.230 | 0.993 | 0.031 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf450000000000057ff2 | 4.229 | 4.198 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 4.198 | 0.993 | 0.031 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf450000000000057ff3 | 4.224 | 4.191 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 4.191 | 0.992 | 0.032 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf450000000000057ff4 | 4.104 | 4.069 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 4.069 | 0.992 | 0.034 | node-13/thread-3/replica.pull-at | none observed |
| 864486d632ca7dd50000000000045fbb | 4.061 | 4.060 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 4.060 | 1.000 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| 864486d632ca7dd5000000000004b985 | 3.938 | 3.937 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.937 | 1.000 | 0.001 | node-13/thread-4/replica.pull-at | none observed |

## P1 / recovery / read (205 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.041 | n/a | n/a | n/a | 0.032 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.039 | 0.966 | 0.001 |
| p99 | 299.182 | n/a | n/a | n/a | 6.254 | n/a | 0.000 | 298.910 | 1.698 | 0.896 | 0.008 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.334 | 299.177 | 1.000 | 0.334 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1a6e1b2fc6cf450000000000070bed | 299.427 | 0.081 | n/a | 0.000 | 299.343 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 299.424 | 1.000 | 0.004 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| 1e1a6e1b2fc6cf450000000000070bec | 299.328 | 0.052 | n/a | 0.000 | 299.275 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 299.327 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| 1e1a6e1b2fc6cf450000000000070beb | 299.182 | 0.267 | n/a | 0.000 | 298.910 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 299.177 | 1.000 | 0.004 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| 1e1a6e1b2fc6cf450000000000070bfa | 298.900 | 0.042 | n/a | 0.000 | 298.856 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.899 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| 1e1a6e1b2fc6cf450000000000070bf9 | 298.821 | 0.037 | n/a | 0.000 | 298.782 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.819 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| 1e1a6e1b2fc6cf450000000000070bf8 | 298.792 | 0.068 | n/a | 0.000 | 298.722 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.790 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| 13597a31c8724791000000000005ad0e | 298.692 | 0.035 | n/a | 0.000 | 298.655 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.690 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.081ms |
| 13597a31c8724791000000000005ad0d | 298.644 | 0.152 | n/a | 0.000 | 298.490 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.642 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.081ms |
| 864486d632ca7dd5000000000005b2e9 | 298.608 | 0.143 | n/a | 0.000 | 298.462 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 298.605 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.073ms |
| 864486d632ca7dd5000000000005b2ea | 298.502 | 0.065 | n/a | 0.000 | 298.430 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 298.495 | 1.000 | 0.007 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.073ms |
| 13597a31c8724791000000000005ad22 | 298.338 | 0.025 | n/a | 0.000 | 298.301 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 298.326 | 1.000 | 0.012 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.081ms |
| 13597a31c8724791000000000005ad21 | 298.321 | 0.021 | n/a | 0.000 | 298.299 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.320 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.081ms |
| 13597a31c8724791000000000005ad20 | 298.305 | 0.037 | n/a | 0.000 | 298.268 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.304 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.081ms |
| 864486d632ca7dd5000000000005b2d9 | 297.419 | 0.170 | n/a | 0.000 | 297.238 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 297.407 | 1.000 | 0.011 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.073ms |
| 864486d632ca7dd5000000000005b2e7 | 296.518 | 0.074 | n/a | 0.000 | 296.435 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 296.509 | 1.000 | 0.009 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.073ms |
| 864486d632ca7dd5000000000005b2e8 | 296.474 | 0.033 | n/a | 0.000 | 296.437 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 296.470 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.073ms |
| 864486d632ca7dd5000000000005c94e | 283.618 | 0.154 | n/a | 0.000 | 283.461 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 283.615 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 864486d632ca7dd5000000000005c952 | 283.576 | 0.024 | n/a | 0.000 | 283.551 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 283.575 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 864486d632ca7dd5000000000005c951 | 283.546 | 0.026 | n/a | 0.000 | 283.518 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 283.545 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 864486d632ca7dd5000000000005c950 | 283.529 | 0.051 | n/a | 0.000 | 283.477 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 283.528 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (159 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.015 | n/a | n/a | n/a | 0.014 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.014 | 0.939 | 0.001 |
| p99 | 1.605 | n/a | n/a | n/a | 1.604 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 1.604 | 0.998 | 0.023 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1a6e1b2fc6cf45000000000007458f | 10.428 | 2.263 | n/a | 0.000 | 0.000 | 1.533 | 6.578 | 0.017 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.003 | 2.263 | 0.217 | 0.003 | gw-r/thread-54/gateway.admitted-work | none observed |
| 1e1a6e1b2fc6cf4500000000000748cb | 1.605 | 1.604 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.604 | 1.000 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000007d0e5 | 0.971 | 0.969 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.969 | 0.998 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000007e458 | 0.562 | 0.561 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.561 | 0.998 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000008f1e4 | 0.546 | 0.540 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.540 | 0.988 | 0.007 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000008b025 | 0.538 | 0.515 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 0.515 | 0.956 | 0.023 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000009200b | 0.515 | 0.511 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.511 | 0.992 | 0.004 | node-13/thread-3/reader.execute | none observed |
| 1e1a6e1b2fc6cf450000000000075823 | 0.504 | 0.503 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.503 | 0.997 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000007f8c9 | 0.493 | 0.491 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.491 | 0.997 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000007caae | 0.485 | 0.485 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.485 | 0.998 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf450000000000089d5a | 0.485 | 0.483 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.483 | 0.996 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000007e45b | 0.419 | 0.388 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 0.388 | 0.927 | 0.031 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000008b00b | 0.417 | 0.416 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.416 | 0.996 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf450000000000089d5d | 0.416 | 0.411 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.411 | 0.987 | 0.006 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf450000000000078be4 | 0.411 | 0.409 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.409 | 0.996 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000007e563 | 0.397 | 0.395 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.395 | 0.994 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000785bb | 0.396 | 0.395 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.395 | 0.998 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000007e566 | 0.395 | 0.392 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.392 | 0.993 | 0.003 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000007def3 | 0.392 | 0.389 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.389 | 0.992 | 0.003 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000008a8f6 | 0.378 | 0.376 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.376 | 0.996 | 0.001 | node-13/thread-3/replica.pull-at | none observed |

## P4 / p4h1 / read (166 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.009 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.009 | 0.917 | 0.001 |
| p99 | 0.903 | n/a | n/a | n/a | 0.901 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.901 | 0.998 | 0.004 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1a6e1b2fc6cf450000000000092a59 | 5.687 | 1.257 | n/a | 0.000 | 0.000 | 1.432 | 2.997 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.257 | 0.221 | 0.001 | gw-r/thread-48/gateway.admitted-work | none observed |
| 1e1a6e1b2fc6cf45000000000009ee93 | 0.903 | 0.901 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.901 | 0.997 | 0.003 | node-13/thread-3/reader.execute | none observed |
| 1e1a6e1b2fc6cf4500000000000ae7ce | 0.886 | 0.148 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.739 | 0.148 | 0.167 | 0.739 | uncovered | none observed |
| 1e1a6e1b2fc6cf4500000000000997f2 | 0.865 | 0.864 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.864 | 0.998 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000b0c87 | 0.739 | 0.737 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.737 | 0.998 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000b1341 | 0.635 | 0.634 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.634 | 0.998 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf450000000000093898 | 0.592 | 0.590 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.590 | 0.997 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf45000000000009660f | 0.591 | 0.589 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.589 | 0.997 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000b2bb6 | 0.587 | 0.584 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.584 | 0.995 | 0.003 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000a71d9 | 0.553 | 0.551 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.551 | 0.996 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000982b2 | 0.521 | 0.519 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.519 | 0.996 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000b2c46 | 0.521 | 0.519 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.519 | 0.997 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000ab8af | 0.463 | 0.461 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.461 | 0.997 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000931a0 | 0.457 | 0.453 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.453 | 0.991 | 0.004 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000b29cd | 0.441 | 0.440 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.440 | 0.998 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000b56f8 | 0.433 | 0.431 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.431 | 0.995 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000a35f4 | 0.376 | 0.374 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.374 | 0.995 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000ae601 | 0.363 | 0.363 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 0.363 | 0.999 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000931a2 | 0.363 | 0.360 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.360 | 0.993 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf450000000000097fd6 | 0.354 | 0.353 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.353 | 0.995 | 0.002 | node-13/thread-3/replica.pull-at | none observed |

## P4 / p4h3 / read (146 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.009 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.009 | 0.926 | 0.001 |
| p99 | 9.072 | n/a | n/a | n/a | 6.128 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 6.128 | 1.000 | 0.016 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1a6e1b2fc6cf4500000000000bd52c | 9.185 | 9.178 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 9.178 | 0.999 | 0.007 | node-13/thread-3/replica.pull-at | replica.apply-delta 0.063ms |
| 1e1a6e1b2fc6cf4500000000000b761b | 9.072 | 2.045 | n/a | 0.000 | 0.000 | 1.698 | 4.636 | 0.691 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.045 | 0.225 | 0.002 | gw-r/thread-48/gateway.admitted-work | none observed |
| 1e1a6e1b2fc6cf4500000000000c81df | 6.131 | 6.128 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 6.128 | 1.000 | 0.003 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000caf10 | 5.617 | 5.615 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 5.615 | 1.000 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000c857c | 5.437 | 5.434 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 5.434 | 0.999 | 0.003 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000c8258 | 4.487 | 4.485 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.485 | 1.000 | 0.002 | node-13/thread-3/reader.execute | none observed |
| 1e1a6e1b2fc6cf4500000000000c8205 | 3.691 | 0.129 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.562 | 0.129 | 0.035 | 3.562 | uncovered | none observed |
| 1e1a6e1b2fc6cf4500000000000c84de | 3.020 | 3.019 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.019 | 1.000 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000c65b4 | 1.575 | 1.568 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 1.568 | 0.995 | 0.008 | node-13/thread-3/reader.execute | none observed |
| 1e1a6e1b2fc6cf4500000000000caee8 | 1.469 | 1.456 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 1.456 | 0.991 | 0.013 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000c858f | 1.365 | 1.363 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.363 | 0.999 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000c8567 | 1.320 | 1.318 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.318 | 0.998 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000c8484 | 1.113 | 1.111 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.111 | 0.998 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000c6ee0 | 0.925 | 0.922 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.922 | 0.997 | 0.003 | node-13/thread-3/reader.execute | none observed |
| 1e1a6e1b2fc6cf4500000000000c85a6 | 0.839 | 0.837 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.837 | 0.997 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000c857d | 0.810 | 0.794 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.794 | 0.980 | 0.016 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000d73f0 | 0.693 | 0.691 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.691 | 0.996 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000c224d | 0.615 | 0.614 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.614 | 0.999 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000c8fa6 | 0.609 | 0.607 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.607 | 0.996 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000c214d | 0.609 | 0.606 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.606 | 0.996 | 0.002 | node-13/thread-3/replica.pull-at | none observed |

## P4 / p4h10 / read (164 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.009 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.009 | 0.923 | 0.001 |
| p99 | 1.087 | n/a | n/a | n/a | 1.081 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.081 | 0.997 | 0.005 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1a6e1b2fc6cf4500000000000d97e7 | 8.445 | 2.090 | n/a | 0.000 | 0.000 | 1.542 | 4.811 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.090 | 0.247 | 0.002 | gw-r/thread-55/gateway.admitted-work | none observed |
| 1e1a6e1b2fc6cf4500000000000d9b35 | 1.087 | 1.081 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.081 | 0.995 | 0.005 | node-13/thread-3/reader.execute | none observed |
| 1e1a6e1b2fc6cf4500000000000f018a | 0.983 | 0.979 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.979 | 0.997 | 0.003 | node-13/thread-3/reader.execute | none observed |
| 1e1a6e1b2fc6cf4500000000000f1e0e | 0.607 | 0.605 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.605 | 0.998 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000e3550 | 0.526 | 0.524 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.524 | 0.996 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000da381 | 0.451 | 0.449 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.449 | 0.997 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000f5440 | 0.435 | 0.433 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.433 | 0.995 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000d979d | 0.425 | 0.408 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.408 | 0.960 | 0.017 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000f5499 | 0.403 | 0.399 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.399 | 0.992 | 0.003 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000dbfae | 0.401 | 0.399 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.399 | 0.996 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000dc6e3 | 0.380 | 0.377 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.377 | 0.993 | 0.003 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000dc6a5 | 0.379 | 0.377 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.377 | 0.994 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000e40c5 | 0.375 | 0.374 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.374 | 0.995 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000db9e2 | 0.366 | 0.364 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.364 | 0.995 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000d97a0 | 0.365 | 0.364 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.364 | 0.997 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000dc892 | 0.359 | 0.357 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.357 | 0.995 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000dbf37 | 0.358 | 0.356 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.356 | 0.995 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000dc4ac | 0.347 | 0.346 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.346 | 0.996 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000e6e1b | 0.347 | 0.346 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.346 | 0.996 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf4500000000000e8d46 | 0.342 | 0.340 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.340 | 0.994 | 0.002 | node-13/thread-3/replica.pull-at | none observed |

## P5 / presweep / read (202 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.056 | n/a | n/a | n/a | 0.032 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.055 | 0.974 | 0.001 |
| p99 | 264.526 | n/a | n/a | n/a | 7.454 | n/a | 1.835 | 264.467 | 1.594 | 2.677 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 264.524 | 1.000 | 0.024 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1a6e1b2fc6cf4500000000000ffa49 | 265.694 | 0.227 | n/a | 0.000 | 265.462 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 265.689 | 1.000 | 0.005 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 1e1a6e1b2fc6cf4500000000000ffa4a | 265.618 | 0.070 | n/a | 0.000 | 265.545 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 265.615 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 1e1a6e1b2fc6cf4500000000000ffa5e | 264.526 | 0.057 | n/a | 0.000 | 264.467 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.524 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 1e1a6e1b2fc6cf4500000000000ffa5f | 264.463 | 0.229 | n/a | 0.000 | 264.229 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 264.457 | 1.000 | 0.005 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 864486d632ca7dd50000000000061d2f | 264.302 | 0.014 | n/a | 0.000 | 264.287 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.302 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 864486d632ca7dd50000000000061d30 | 264.302 | 0.013 | n/a | 0.000 | 264.289 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.302 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 864486d632ca7dd50000000000061d2e | 264.297 | 0.016 | n/a | 0.000 | 264.281 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.296 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 864486d632ca7dd50000000000061d2d | 264.296 | 0.029 | n/a | 0.000 | 264.265 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.294 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 864486d632ca7dd50000000000061d2c | 264.295 | 0.148 | n/a | 0.000 | 264.145 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.293 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 13597a31c87247910000000000060a44 | 264.284 | 0.025 | n/a | 0.000 | 264.258 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.283 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 13597a31c87247910000000000060a43 | 264.248 | 0.032 | n/a | 0.000 | 264.215 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.247 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 1e1a6e1b2fc6cf4500000000000ffa60 | 264.247 | 0.020 | n/a | 0.000 | 264.225 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.245 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 13597a31c87247910000000000060a42 | 264.186 | 0.030 | n/a | 0.000 | 264.155 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.185 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 13597a31c87247910000000000060a41 | 264.130 | 0.034 | n/a | 0.000 | 264.095 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.129 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 13597a31c87247910000000000060a40 | 264.036 | 0.176 | n/a | 0.000 | 263.857 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 264.033 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 1e1a6e1b2fc6cf4500000000000ffa70 | 263.202 | 0.033 | n/a | 0.000 | 263.167 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 263.200 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 864486d632ca7dd50000000000061d6a | 241.354 | 0.016 | n/a | 0.000 | 241.336 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 241.353 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| 864486d632ca7dd50000000000061d69 | 241.348 | 0.033 | n/a | 0.000 | 241.313 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 241.346 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| 864486d632ca7dd50000000000061d68 | 241.327 | 0.249 | n/a | 0.000 | 241.067 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 241.316 | 1.000 | 0.012 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| 13597a31c87247910000000000060a4d | 241.133 | 0.375 | n/a | 0.000 | 240.754 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 241.128 | 1.000 | 0.004 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.024ms |

## P5 / sweep / read (83 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 3.811 | n/a | n/a | n/a | 2.784 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 2.784 | 0.992 | 0.007 |
| p99 | 156.172 | n/a | n/a | n/a | 52.771 | n/a | 7.405 | 0.000 | 77.202 | 49.607 | 10.172 | 0.000 | 0.029 | 0.000 | n/a | n/a | 3.720 | 57.662 | 0.999 | 3.720 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1a6e1b2fc6cf450000000000107d5f | 156.172 | 49.294 | n/a | 3.314 | 0.000 | 45.745 | 49.607 | 8.192 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.004 | 52.608 | 0.337 | 0.004 | gw-r/thread-48/gateway.response-write | reader.observe 13.337ms; reader.observe 9.965ms; reader.observe 5.620ms; reader.observe 3.673ms; client.parse 1.748ms |
| 864486d632ca7dd5000000000006ad18 | 138.395 | 39.937 | n/a | 4.523 | 0.000 | 77.202 | 10.703 | 6.019 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.003 | 44.460 | 0.321 | 0.003 | node-13/thread-4/socket.body-read | reader.observe 16.472ms; reader.observe 2.963ms; reader.observe 1.808ms; replica.apply-delta 0.060ms; replica.apply-delta 0.051ms |
| 13597a31c87247910000000000069554 | 123.099 | 39.204 | n/a | 2.058 | 0.000 | 48.510 | 23.139 | 10.172 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.006 | 41.262 | 0.335 | 0.006 | node-13/thread-5/socket.queue-and-write | reader.observe 17.046ms; reader.observe 7.362ms; reader.observe 1.003ms; replica.apply-delta 0.084ms; replica.apply-delta 0.037ms |
| 1e1a6e1b2fc6cf450000000000107d60 | 119.763 | 33.081 | n/a | 1.389 | 0.000 | 75.508 | 6.579 | 3.181 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.003 | 34.470 | 0.288 | 0.003 | node-13/thread-3/socket.wait-first-byte | reader.observe 13.337ms; reader.observe 9.965ms; reader.observe 3.673ms; client.parse 1.748ms; replica.apply-delta 0.040ms |
| 864486d632ca7dd5000000000006ad17 | 107.359 | 52.771 | n/a | 4.891 | 0.000 | 40.989 | 2.422 | 6.268 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.002 | 57.662 | 0.537 | 0.002 | node-13/thread-4/socket.wait-first-byte | reader.observe 2.963ms; reader.observe 1.808ms; replica.apply-delta 0.060ms; replica.apply-delta 0.051ms; replica.apply-delta 0.034ms |
| 1e1a6e1b2fc6cf450000000000107d5e | 105.638 | 24.689 | n/a | 0.000 | 0.000 | 69.388 | 7.615 | 3.920 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.002 | 24.689 | 0.234 | 0.002 | node-13/thread-3/socket.wait-first-byte | reader.observe 13.337ms; reader.observe 9.965ms; reader.observe 3.673ms; client.parse 1.748ms; replica.apply-delta 0.040ms |
| 13597a31c87247910000000000069553 | 104.156 | 24.202 | n/a | 0.000 | 0.000 | 70.592 | 9.326 | 0.012 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.001 | 24.202 | 0.232 | 0.001 | node-13/thread-5/socket.queue-and-write | reader.observe 17.046ms; reader.observe 7.362ms; replica.apply-delta 0.084ms; replica.apply-delta 0.037ms; replica.apply-delta 0.035ms |
| 13597a31c87247910000000000069552 | 101.608 | 22.577 | n/a | 0.000 | 0.000 | 72.452 | 0.701 | 5.865 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.002 | 22.577 | 0.222 | 0.002 | node-13/thread-5/socket.queue-and-write | reader.observe 17.046ms; reader.observe 7.362ms; replica.apply-delta 0.084ms; replica.apply-delta 0.037ms; replica.apply-delta 0.035ms |
| 1e1a6e1b2fc6cf450000000000107d5b | 101.074 | 41.391 | n/a | 7.405 | 0.000 | 30.842 | 21.432 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 48.796 | 0.483 | 0.004 | node-13/thread-3/socket.wait-first-byte | reader.observe 9.965ms; reader.observe 3.673ms; client.parse 1.748ms; replica.apply-delta 0.040ms; replica.apply-delta 0.032ms |
| 13597a31c87247910000000000069550 | 97.501 | 27.412 | n/a | 2.217 | 0.000 | 58.971 | 8.849 | 0.012 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.012 | 29.629 | 0.304 | 0.012 | node-13/thread-5/socket.queue-and-write | reader.observe 17.046ms; replica.apply-delta 0.084ms; replica.apply-delta 0.037ms; replica.apply-delta 0.035ms; replica.apply-delta 0.032ms |
| 13597a31c8724791000000000006954f | 66.391 | 45.949 | n/a | 5.613 | 0.000 | 8.048 | 6.745 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.003 | 51.562 | 0.777 | 0.003 | node-13/thread-5/client.reach | replica.apply-delta 0.035ms |
| 1e1a6e1b2fc6cf450000000000107d5c | 62.632 | 17.390 | n/a | 0.000 | 0.000 | 40.466 | 4.755 | 0.005 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.003 | 17.390 | 0.278 | 0.003 | node-13/thread-3/socket.wait-first-byte | reader.observe 9.965ms; client.parse 1.748ms; replica.apply-delta 0.040ms; replica.apply-delta 0.032ms; replica.apply-delta 0.019ms |
| 864486d632ca7dd5000000000006ad1a | 59.698 | 21.923 | n/a | 0.000 | 0.000 | 28.824 | 2.873 | 6.061 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.002 | 21.923 | 0.367 | 0.002 | node-13/thread-4/socket.wait-first-byte | reader.observe 2.963ms; reader.observe 1.808ms; replica.apply-delta 0.060ms; replica.apply-delta 0.051ms; replica.apply-delta 0.034ms |
| 1e1a6e1b2fc6cf450000000000107d5d | 55.681 | 45.537 | n/a | 5.744 | 0.000 | 3.113 | 1.255 | 0.007 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.005 | 51.281 | 0.921 | 0.005 | node-13/thread-3/replica.pull-at | replica.apply-delta 0.040ms |
| 864486d632ca7dd5000000000006ad19 | 51.633 | 23.104 | n/a | 0.000 | 0.000 | 17.006 | 6.462 | 5.048 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.003 | 23.104 | 0.447 | 0.003 | node-13/thread-4/replica.pull-at | reader.observe 2.963ms; replica.apply-delta 0.060ms; replica.apply-delta 0.051ms; replica.apply-delta 0.034ms |
| 1e1a6e1b2fc6cf4500000000001077e6 | 32.367 | 13.470 | n/a | 3.569 | 0.000 | 2.082 | 13.207 | 0.007 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.006 | 17.039 | 0.526 | 0.006 | gw-r/thread-53/gateway.admitted-work | none observed |
| 864486d632ca7dd5000000000006ad15 | 21.015 | 15.199 | n/a | 0.000 | 0.000 | 3.360 | 2.451 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 15.199 | 0.723 | 0.004 | node-13/thread-4/replica.pull-at | replica.apply-delta 0.034ms |
| 864486d632ca7dd5000000000006ad1b | 10.948 | 10.936 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 10.936 | 0.999 | 0.011 | node-13/thread-4/replica.pull-at | replica.apply-delta 0.060ms |
| 13597a31c872479100000000000691ad | 9.905 | 7.218 | n/a | 0.000 | 0.000 | 1.918 | 0.729 | 0.011 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.004 | 7.218 | 0.729 | 0.004 | node-13/thread-5/reader.execute | none observed |
| c7947c60eddc34ab0000000000000113 | 8.319 | 8.258 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.061 | 8.258 | 0.993 | 0.061 | node-13/thread-6/reader.execute | reader.observe 2.069ms |

## P1 / outside-phases / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.112 | n/a | n/a | n/a | 0.110 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.110 | 0.952 | 0.003 |
| p99 | 0.277 | n/a | n/a | n/a | 0.274 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.274 | 0.989 | 0.015 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 864486d632ca7dd5000000000006ad3d | 0.277 | 0.274 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.274 | 0.989 | 0.003 | node-13/thread-4/replica.pull-at | none observed |
| 864486d632ca7dd5000000000006ad3e | 0.213 | 0.198 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.198 | 0.931 | 0.015 | node-13/thread-4/replica.pull-at | none observed |
| 13597a31c87247910000000000069616 | 0.112 | 0.110 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.110 | 0.985 | 0.002 | node-13/thread-5/replica.pull-at | none observed |
| 1e1a6e1b2fc6cf450000000000107d74 | 0.051 | 0.049 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.049 | 0.952 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 13597a31c87247910000000000069617 | 0.023 | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.010 | 0.448 | 0.013 | uncovered | none observed |

## P3 / outside-phases / read (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.350 | n/a | n/a | n/a | 0.050 | n/a | 0.000 | 0.000 | 1.434 | 200.553 | 0.022 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.099 | 0.050 | 0.000 | 0.099 |
| p99 | 204.258 | n/a | n/a | n/a | 0.730 | n/a | 0.000 | 0.000 | 2.425 | 202.163 | 6.572 | 0.000 | 0.299 | 0.000 | n/a | n/a | 0.349 | 0.730 | 0.007 | 0.349 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8025e50af3e9b4b30000000000000007 | 204.258 | 0.062 | n/a | 0.000 | 0.000 | 1.467 | 202.163 | 0.080 | 0.000 | 0.299 | 0.000 | n/a | n/a | 0.187 | 0.062 | 0.000 | 0.187 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b30000000000000073 | 203.511 | 0.052 | n/a | 0.000 | 0.000 | 1.480 | 201.471 | 0.105 | 0.000 | 0.296 | 0.000 | n/a | n/a | 0.107 | 0.052 | 0.000 | 0.107 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b300000000000000ab | 203.258 | 0.188 | n/a | 0.000 | 0.000 | 2.197 | 200.386 | 0.020 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.349 | 0.188 | 0.001 | 0.349 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b3000000000000007d | 203.230 | 0.045 | n/a | 0.000 | 0.000 | 1.643 | 201.239 | 0.024 | 0.000 | 0.184 | 0.000 | n/a | n/a | 0.096 | 0.045 | 0.000 | 0.096 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b3000000000000005a | 203.029 | 0.038 | n/a | 0.000 | 0.000 | 1.416 | 201.209 | 0.056 | 0.000 | 0.228 | 0.000 | n/a | n/a | 0.083 | 0.038 | 0.000 | 0.083 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b300000000000000af | 203.004 | 0.072 | n/a | 0.000 | 0.000 | 1.586 | 200.916 | 0.043 | 0.000 | 0.221 | 0.000 | n/a | n/a | 0.166 | 0.072 | 0.000 | 0.166 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b300000000000000b0 | 202.952 | 0.048 | n/a | 0.000 | 0.000 | 1.400 | 201.199 | 0.019 | 0.000 | 0.195 | 0.000 | n/a | n/a | 0.092 | 0.048 | 0.000 | 0.092 | gw-r/thread-52/journal/page | none observed |
| 8025e50af3e9b4b300000000000000d7 | 202.862 | 0.050 | n/a | 0.000 | 0.000 | 1.459 | 201.046 | 0.016 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.111 | 0.050 | 0.000 | 0.111 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b300000000000000a5 | 202.841 | 0.050 | n/a | 0.000 | 0.000 | 1.568 | 200.938 | 0.017 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.130 | 0.050 | 0.000 | 0.130 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b300000000000000d6 | 202.798 | 0.079 | n/a | 0.000 | 0.000 | 1.672 | 200.712 | 0.022 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.188 | 0.079 | 0.000 | 0.188 | gw-r/thread-73/journal/page | none observed |
| 8025e50af3e9b4b300000000000000a0 | 202.794 | 0.038 | n/a | 0.000 | 0.000 | 1.414 | 201.114 | 0.012 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.082 | 0.038 | 0.000 | 0.082 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b3000000000000005b | 202.753 | 0.045 | n/a | 0.000 | 0.000 | 1.363 | 201.083 | 0.024 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.079 | 0.045 | 0.000 | 0.079 | gw-r/thread-52/journal/page | none observed |
| 8025e50af3e9b4b300000000000000d8 | 202.682 | 0.050 | n/a | 0.000 | 0.000 | 1.450 | 200.925 | 0.012 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.097 | 0.050 | 0.000 | 0.097 | gw-r/thread-73/journal/page | none observed |
| 8025e50af3e9b4b30000000000000005 | 202.653 | 0.052 | n/a | 0.000 | 0.000 | 1.480 | 200.670 | 0.038 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.258 | 0.052 | 0.000 | 0.258 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b30000000000000006 | 202.652 | 0.122 | n/a | 0.000 | 0.000 | 1.420 | 200.813 | 0.023 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.100 | 0.122 | 0.001 | 0.100 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b300000000000000ad | 202.598 | 0.052 | n/a | 0.000 | 0.000 | 1.578 | 200.662 | 0.022 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.130 | 0.052 | 0.000 | 0.130 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b3000000000000007a | 202.559 | 0.052 | n/a | 0.000 | 0.000 | 1.489 | 200.690 | 0.039 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.122 | 0.052 | 0.000 | 0.122 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b300000000000000b2 | 202.479 | 0.049 | n/a | 0.000 | 0.000 | 1.394 | 200.772 | 0.025 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.099 | 0.049 | 0.000 | 0.099 | gw-r/thread-48/journal/page | none observed |
| 8025e50af3e9b4b300000000000000a1 | 202.406 | 0.037 | n/a | 0.000 | 0.000 | 1.364 | 200.674 | 0.039 | 0.000 | 0.214 | 0.000 | n/a | n/a | 0.079 | 0.037 | 0.000 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 8025e50af3e9b4b3000000000000005d | 202.350 | 0.040 | n/a | 0.000 | 0.000 | 1.422 | 200.590 | 0.031 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.085 | 0.040 | 0.000 | 0.085 | gw-r/thread-52/journal/page | none observed |

## P3 / outside-phases / internal (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 462.991 | n/a | n/a | n/a | 3.265 | n/a | 0.000 | 0.000 | 1.442 | 448.615 | 0.025 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.128 | 3.265 | 0.014 | 0.128 |
| p99 | 1006.111 | n/a | n/a | n/a | 115.540 | n/a | 5.714 | 0.000 | 1.964 | 1002.478 | 0.686 | 0.000 | 0.468 | 0.000 | n/a | n/a | 4.370 | 121.254 | 0.832 | 4.370 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c70000000000000017 | 1006.111 | 0.188 | n/a | 0.000 | 0.000 | 1.661 | 1002.478 | 0.025 | 0.000 | 0.468 | 0.000 | n/a | n/a | 1.291 | 0.188 | 0.000 | 1.291 | gw-r/thread-55/journal/page | none observed |
| 7a0dc1136116f9c70000000000000018 | 1005.196 | 0.172 | n/a | 0.000 | 0.000 | 1.413 | 1002.221 | 0.025 | 0.000 | 0.127 | 0.000 | n/a | n/a | 1.237 | 0.172 | 0.000 | 1.237 | gw-r/thread-54/journal/page | none observed |
| 7a0dc1136116f9c70000000000000055 | 1004.115 | 0.262 | n/a | 0.000 | 0.000 | 1.558 | 1000.855 | 0.071 | 0.000 | 0.169 | 0.000 | n/a | n/a | 1.200 | 0.262 | 0.000 | 1.200 | gw-r/thread-50/journal/page | none observed |
| 7a0dc1136116f9c70000000000000019 | 1003.447 | 0.148 | n/a | 0.000 | 0.000 | 1.357 | 1000.567 | 0.091 | 0.000 | 0.172 | 0.000 | n/a | n/a | 1.112 | 0.148 | 0.000 | 1.112 | gw-r/thread-48/journal/page | none observed |
| 7a0dc1136116f9c7000000000000008c | 999.590 | 2.911 | n/a | 0.000 | 0.000 | 1.442 | 995.076 | 0.011 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.085 | 2.911 | 0.003 | 0.085 | gw-r/thread-48/journal/page | none observed |
| 7a0dc1136116f9c70000000000000033 | 949.924 | 2.433 | n/a | 0.000 | 0.000 | 1.382 | 945.809 | 0.082 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.115 | 2.433 | 0.003 | 0.115 | gw-r/thread-53/journal/page | none observed |
| 7a0dc1136116f9c70000000000000084 | 874.313 | 4.355 | n/a | 0.000 | 0.000 | 1.479 | 868.015 | 0.202 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.185 | 4.355 | 0.005 | 0.185 | gw-r/thread-52/journal/page | none observed |
| 7a0dc1136116f9c7000000000000008d | 651.605 | 4.777 | n/a | 0.000 | 0.000 | 1.525 | 645.103 | 0.011 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.128 | 4.777 | 0.007 | 0.128 | gw-r/thread-52/journal/page | none observed |
| 7a0dc1136116f9c70000000000000060 | 599.386 | 8.625 | n/a | 0.000 | 0.000 | 1.402 | 589.095 | 0.027 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.134 | 8.625 | 0.014 | 0.134 | gw-r/thread-52/journal/page | none observed |
| 7a0dc1136116f9c70000000000000064 | 585.262 | 3.265 | n/a | 0.000 | 0.000 | 1.422 | 580.338 | 0.024 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.127 | 3.265 | 0.006 | 0.127 | gw-r/thread-53/journal/page | none observed |
| 7a0dc1136116f9c70000000000000054 | 532.477 | 4.055 | n/a | 0.000 | 0.000 | 1.399 | 526.058 | 0.686 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.127 | 4.055 | 0.008 | 0.127 | gw-r/thread-53/journal/page | none observed |
| 7a0dc1136116f9c70000000000000086 | 462.991 | 12.477 | n/a | 0.000 | 0.000 | 1.695 | 448.615 | 0.015 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.125 | 12.477 | 0.027 | 0.125 | gw-r/thread-53/journal/page | none observed |
| 7a0dc1136116f9c70000000000000085 | 290.781 | 4.397 | n/a | 0.000 | 0.000 | 1.811 | 284.341 | 0.024 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.111 | 4.397 | 0.015 | 0.111 | gw-r/thread-54/journal/page | none observed |
| 7a0dc1136116f9c70000000000000068 | 253.282 | 4.875 | n/a | 0.000 | 0.000 | 1.749 | 246.416 | 0.017 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.149 | 4.875 | 0.019 | 0.149 | gw-r/thread-50/journal/page | none observed |
| 7a0dc1136116f9c7000000000000008a | 238.808 | 5.652 | n/a | 0.000 | 0.000 | 1.621 | 231.131 | 0.159 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.175 | 5.652 | 0.024 | 0.175 | gw-r/thread-50/journal/page | none observed |
| 7a0dc1136116f9c70000000000000065 | 172.448 | 3.208 | n/a | 0.000 | 0.000 | 1.350 | 167.571 | 0.153 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.088 | 3.208 | 0.019 | 0.088 | gw-r/thread-53/journal/page | none observed |
| 7a0dc1136116f9c7000000000000005e | 145.722 | 115.540 | n/a | 5.714 | 0.000 | 1.474 | 18.606 | 0.017 | 0.000 | 0.000 | 0.000 | n/a | n/a | 4.370 | 121.254 | 0.832 | 4.370 | node-13/thread-2/replica.fetch-feed | none observed |
| 7a0dc1136116f9c7000000000000005f | 75.578 | 6.250 | n/a | 0.000 | 0.000 | 1.964 | 67.079 | 0.017 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.184 | 6.250 | 0.083 | 0.184 | gw-r/thread-48/journal/page | none observed |
| 7a0dc1136116f9c70000000000000063 | 66.030 | 2.178 | n/a | 0.000 | 0.000 | 1.440 | 62.326 | 0.007 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.065 | 2.178 | 0.033 | 0.065 | gw-r/thread-55/journal/page | none observed |
| 7a0dc1136116f9c70000000000000032 | 38.186 | 11.962 | n/a | 0.000 | 0.000 | 1.409 | 20.632 | 0.046 | 0.000 | 0.141 | 0.000 | n/a | n/a | 3.996 | 11.962 | 0.313 | 3.996 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 189.582 | n/a | n/a | n/a | 5.016 | n/a | 0.000 | 0.000 | 1.406 | 185.574 | 0.022 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.192 | 5.016 | 0.012 | 0.192 |
| p99 | 790.622 | n/a | n/a | n/a | 13.759 | n/a | 0.545 | 0.000 | 2.769 | 780.114 | 0.032 | 0.000 | 0.195 | 0.000 | n/a | n/a | 0.650 | 14.304 | 0.085 | 0.650 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c7000000000000001d | 790.622 | 7.330 | n/a | 0.000 | 0.000 | 2.769 | 780.114 | 0.022 | 0.000 | 0.195 | 0.000 | n/a | n/a | 0.192 | 7.330 | 0.009 | 0.192 | gw-r/thread-54/journal/page | none observed |
| 7a0dc1136116f9c7000000000000001b | 431.269 | 5.016 | n/a | 0.000 | 0.000 | 1.406 | 424.488 | 0.032 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.192 | 5.016 | 0.012 | 0.192 | gw-r/thread-53/journal/page | none observed |
| 7a0dc1136116f9c7000000000000001f | 189.582 | 2.452 | n/a | 0.000 | 0.000 | 1.406 | 185.574 | 0.010 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.110 | 2.452 | 0.013 | 0.110 | gw-r/thread-50/journal/page | none observed |
| 7a0dc1136116f9c7000000000000001a | 168.176 | 13.759 | n/a | 0.545 | 0.000 | 1.382 | 151.743 | 0.031 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.650 | 14.304 | 0.085 | 0.650 | gw-r/thread-54/journal/page | none observed |

## P3 / baseline / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 804.675 | n/a | n/a | n/a | 2.440 | n/a | 0.000 | 0.000 | 1.443 | 797.584 | 0.021 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.189 | 2.440 | 0.006 | 0.189 |
| p99 | 1003.275 | n/a | n/a | n/a | 5.176 | n/a | 0.000 | 0.000 | 1.605 | 1000.400 | 0.026 | 0.000 | 0.140 | 0.000 | n/a | n/a | 1.128 | 5.176 | 0.013 | 1.128 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c70000000000000023 | 1003.275 | 0.155 | n/a | 0.000 | 0.000 | 1.443 | 1000.400 | 0.026 | 0.000 | 0.124 | 0.000 | n/a | n/a | 1.128 | 0.155 | 0.000 | 1.128 | gw-r/thread-54/journal/page | none observed |
| 7a0dc1136116f9c70000000000000020 | 804.675 | 5.176 | n/a | 0.000 | 0.000 | 1.605 | 797.584 | 0.018 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.189 | 5.176 | 0.006 | 0.189 | gw-r/thread-51/journal/page | none observed |
| 7a0dc1136116f9c70000000000000021 | 184.274 | 2.440 | n/a | 0.000 | 0.000 | 1.352 | 180.228 | 0.021 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.094 | 2.440 | 0.013 | 0.094 | gw-r/thread-52/journal/page | none observed |

## P3 / L1 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 282.971 | n/a | n/a | n/a | 2.629 | n/a | 0.000 | 0.000 | 1.454 | 270.994 | 0.020 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.106 | 2.629 | 0.030 | 0.106 |
| p99 | 1002.163 | n/a | n/a | n/a | 8.601 | n/a | 0.000 | 0.000 | 3.505 | 1000.381 | 0.061 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.212 | 8.601 | 0.464 | 0.212 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c7000000000000002a | 1002.163 | 0.135 | n/a | 0.000 | 0.000 | 1.454 | 1000.381 | 0.020 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.054 | 0.135 | 0.000 | 0.054 | gw-r/thread-48/journal/page | none observed |
| 7a0dc1136116f9c70000000000000028 | 700.661 | 2.349 | n/a | 0.000 | 0.000 | 1.387 | 696.688 | 0.013 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.089 | 2.349 | 0.003 | 0.089 | gw-r/thread-51/journal/page | none observed |
| 7a0dc1136116f9c70000000000000027 | 282.971 | 8.601 | n/a | 0.000 | 0.000 | 3.074 | 270.994 | 0.015 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.212 | 8.601 | 0.030 | 0.212 | gw-r/thread-48/journal/page | none observed |
| 7a0dc1136116f9c70000000000000024 | 9.024 | 3.700 | n/a | 0.000 | 0.000 | 3.505 | 1.520 | 0.061 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.171 | 3.700 | 0.410 | 0.171 | node-13/thread-2/socket.wait-first-byte | none observed |
| 7a0dc1136116f9c70000000000000026 | 5.671 | 2.629 | n/a | 0.000 | 0.000 | 1.365 | 1.550 | 0.022 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.106 | 2.629 | 0.464 | 0.106 | node-13/thread-2/replica.fetch-feed | none observed |

## P3 / L4 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 369.752 | n/a | n/a | n/a | 2.768 | n/a | 0.000 | 0.000 | 1.395 | 365.560 | 0.016 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.093 | 2.768 | 0.007 | 0.093 |
| p99 | 1004.710 | n/a | n/a | n/a | 5.704 | n/a | 0.000 | 0.000 | 3.176 | 1001.150 | 0.039 | 0.000 | 0.189 | 0.000 | n/a | n/a | 1.130 | 5.704 | 0.227 | 1.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c70000000000000031 | 1004.710 | 0.716 | n/a | 0.000 | 0.000 | 1.486 | 1001.150 | 0.039 | 0.000 | 0.189 | 0.000 | n/a | n/a | 1.130 | 0.716 | 0.001 | 1.130 | gw-r/thread-54/journal/page | none observed |
| 7a0dc1136116f9c7000000000000002d | 435.319 | 3.171 | n/a | 0.000 | 0.000 | 3.176 | 428.791 | 0.013 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.094 | 3.171 | 0.007 | 0.094 | gw-r/thread-50/journal/page | none observed |
| 7a0dc1136116f9c7000000000000002f | 369.752 | 2.616 | n/a | 0.000 | 0.000 | 1.394 | 365.560 | 0.016 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.082 | 2.616 | 0.007 | 0.082 | gw-r/thread-53/journal/page | none observed |
| 7a0dc1136116f9c7000000000000002c | 196.631 | 5.704 | n/a | 0.000 | 0.000 | 1.395 | 189.281 | 0.027 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.093 | 5.704 | 0.029 | 0.093 | gw-r/thread-48/journal/page | none observed |
| 7a0dc1136116f9c7000000000000002b | 12.215 | 2.768 | n/a | 0.000 | 0.000 | 1.379 | 7.914 | 0.013 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.092 | 2.768 | 0.227 | 0.092 | gw-r/thread-50/journal/page | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 304.029 | n/a | n/a | n/a | 3.471 | n/a | 0.000 | 0.000 | 1.512 | 300.390 | 0.042 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.151 | 3.471 | 0.007 | 0.151 |
| p99 | 867.321 | n/a | n/a | n/a | 16.917 | n/a | 0.000 | 0.000 | 2.514 | 784.443 | 0.053 | 63.012 | 0.197 | 0.000 | n/a | n/a | 0.345 | 16.917 | 0.026 | 0.345 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c70000000000000039 | 867.321 | 16.917 | n/a | 0.000 | 0.000 | 2.514 | 784.443 | 0.053 | 63.012 | 0.143 | 0.000 | n/a | n/a | 0.239 | 16.917 | 0.020 | 0.239 | gw-r/thread-50/journal/page | none observed |
| 7a0dc1136116f9c70000000000000038 | 621.028 | 3.741 | n/a | 0.000 | 0.000 | 1.614 | 615.087 | 0.045 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.345 | 3.741 | 0.006 | 0.345 | gw-r/thread-52/journal/page | none observed |
| 7a0dc1136116f9c70000000000000034 | 304.029 | 2.100 | n/a | 0.000 | 0.000 | 1.396 | 300.390 | 0.013 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.081 | 2.100 | 0.007 | 0.081 | gw-r/thread-52/journal/page | none observed |
| 7a0dc1136116f9c70000000000000036 | 131.548 | 3.471 | n/a | 0.000 | 0.000 | 1.512 | 126.247 | 0.042 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.151 | 3.471 | 0.026 | 0.151 | gw-r/thread-48/journal/page | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 266.097 | n/a | n/a | n/a | 2.406 | n/a | 0.000 | 0.000 | 1.476 | 261.970 | 0.020 | 0.000 | 0.178 | 0.000 | n/a | n/a | 0.116 | 2.406 | 0.009 | 0.116 |
| p99 | 627.789 | n/a | n/a | n/a | 7.397 | n/a | 0.000 | 0.000 | 2.515 | 618.020 | 0.203 | 0.000 | 0.230 | 0.000 | n/a | n/a | 0.620 | 7.397 | 0.021 | 0.620 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c7000000000000003d | 627.789 | 7.397 | n/a | 0.000 | 0.000 | 1.788 | 618.020 | 0.203 | 0.000 | 0.230 | 0.000 | n/a | n/a | 0.150 | 7.397 | 0.012 | 0.150 | gw-r/thread-54/journal/page | none observed |
| 7a0dc1136116f9c7000000000000003f | 370.940 | 2.406 | n/a | 0.000 | 0.000 | 1.109 | 367.121 | 0.020 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.086 | 2.406 | 0.006 | 0.086 | gw-r/thread-51/journal/page | none observed |
| 7a0dc1136116f9c7000000000000003c | 266.097 | 2.400 | n/a | 0.000 | 0.000 | 1.476 | 261.970 | 0.018 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.116 | 2.400 | 0.009 | 0.116 | gw-r/thread-51/journal/page | none observed |
| 7a0dc1136116f9c7000000000000003b | 207.349 | 4.377 | n/a | 0.000 | 0.000 | 2.515 | 199.634 | 0.026 | 0.000 | 0.178 | 0.000 | n/a | n/a | 0.620 | 4.377 | 0.021 | 0.620 | gw-r/thread-51/journal/page | none observed |

## P3 / L256 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 363.251 | n/a | n/a | n/a | 2.552 | n/a | 0.000 | 0.000 | 1.777 | 339.269 | 0.027 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.100 | 2.552 | 0.005 | 0.100 |
| p99 | 623.684 | n/a | n/a | n/a | 3.830 | n/a | 0.000 | 0.000 | 2.271 | 618.788 | 0.090 | 18.890 | 0.175 | 0.000 | n/a | n/a | 0.113 | 3.830 | 0.015 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c70000000000000041 | 623.684 | 2.864 | n/a | 0.000 | 0.000 | 1.777 | 618.788 | 0.025 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.092 | 2.864 | 0.005 | 0.092 | gw-r/thread-48/journal/page | none observed |
| 7a0dc1136116f9c70000000000000042 | 617.377 | 2.551 | n/a | 0.000 | 0.000 | 0.751 | 613.762 | 0.090 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.104 | 2.551 | 0.004 | 0.104 | gw-r/thread-50/journal/page | none observed |
| 7a0dc1136116f9c70000000000000045 | 363.251 | 2.552 | n/a | 0.000 | 0.000 | 2.225 | 339.269 | 0.027 | 18.890 | 0.175 | 0.000 | n/a | n/a | 0.113 | 2.552 | 0.007 | 0.113 | gw-r/thread-53/journal/page | none observed |
| 7a0dc1136116f9c70000000000000043 | 260.793 | 3.830 | n/a | 0.000 | 0.000 | 2.271 | 254.365 | 0.052 | 0.000 | 0.175 | 0.000 | n/a | n/a | 0.100 | 3.830 | 0.015 | 0.100 | gw-r/thread-53/journal/page | none observed |

## P3 / L1024 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1001.592 | n/a | n/a | n/a | 3.151 | n/a | 0.000 | 0.000 | 3.583 | 995.905 | 0.133 | 0.000 | 0.219 | 0.000 | n/a | n/a | 0.800 | 3.151 | 0.003 | 0.800 |
| p99 | 1008.718 | n/a | n/a | n/a | 6.106 | n/a | 0.000 | 0.000 | 4.634 | 1002.981 | 0.212 | 0.000 | 0.439 | 0.000 | n/a | n/a | 1.208 | 6.106 | 0.008 | 1.208 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c70000000000000049 | 1008.718 | 0.374 | n/a | 0.000 | 0.000 | 3.583 | 1002.981 | 0.133 | 0.000 | 0.439 | 0.000 | n/a | n/a | 1.208 | 0.374 | 0.000 | 1.208 | gw-r/thread-52/journal/page | none observed |
| 7a0dc1136116f9c70000000000000048 | 1001.592 | 3.151 | n/a | 0.000 | 0.000 | 1.981 | 995.905 | 0.212 | 0.000 | 0.219 | 0.000 | n/a | n/a | 0.124 | 3.151 | 0.003 | 0.124 | gw-r/thread-53/journal/page | none observed |
| 7a0dc1136116f9c70000000000000047 | 770.338 | 6.106 | n/a | 0.000 | 0.000 | 4.634 | 758.630 | 0.018 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.800 | 6.106 | 0.008 | 0.800 | gw-r/thread-53/journal/page | none observed |

## P3 / recovery / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 235.717 | n/a | n/a | n/a | 4.323 | n/a | 0.000 | 0.000 | 1.448 | 224.924 | 0.060 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.183 | 4.323 | 0.019 | 0.183 |
| p99 | 982.933 | n/a | n/a | n/a | 4.822 | n/a | 0.000 | 0.000 | 21.930 | 977.405 | 3.609 | 0.000 | 0.230 | 0.000 | n/a | n/a | 0.200 | 4.822 | 0.035 | 0.200 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c70000000000000050 | 982.933 | 3.878 | n/a | 0.000 | 0.000 | 1.432 | 977.405 | 0.016 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.125 | 3.878 | 0.004 | 0.125 | gw-r/thread-55/journal/page | none observed |
| 7a0dc1136116f9c7000000000000004c | 433.423 | 4.620 | n/a | 0.000 | 0.000 | 21.930 | 406.432 | 0.060 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.193 | 4.620 | 0.011 | 0.193 | gw-r/thread-52/journal/page | none observed |
| 7a0dc1136116f9c7000000000000004a | 235.717 | 4.822 | n/a | 0.000 | 0.000 | 1.949 | 224.924 | 3.609 | 0.000 | 0.230 | 0.000 | n/a | n/a | 0.183 | 4.822 | 0.020 | 0.183 | gw-r/thread-51/journal/page | none observed |
| 7a0dc1136116f9c7000000000000004f | 193.285 | 3.631 | n/a | 0.000 | 0.000 | 1.408 | 187.938 | 0.023 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.200 | 3.631 | 0.019 | 0.200 | gw-r/thread-50/journal/page | none observed |
| 7a0dc1136116f9c7000000000000004b | 122.232 | 4.323 | n/a | 0.000 | 0.000 | 1.448 | 116.044 | 0.275 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.118 | 4.323 | 0.035 | 0.118 | gw-r/thread-51/journal/page | none observed |

## P3 / p4mix / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 497.898 | n/a | n/a | n/a | 3.228 | n/a | 0.000 | 0.000 | 1.608 | 486.787 | 0.024 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.089 | 3.228 | 0.003 | 0.089 |
| p99 | 989.545 | n/a | n/a | n/a | 8.543 | n/a | 0.000 | 0.000 | 2.080 | 984.519 | 0.198 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.187 | 8.543 | 0.017 | 0.187 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c70000000000000051 | 989.545 | 3.228 | n/a | 0.000 | 0.000 | 1.608 | 984.519 | 0.024 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.089 | 3.228 | 0.003 | 0.089 | gw-r/thread-53/journal/page | none observed |
| 7a0dc1136116f9c70000000000000052 | 497.898 | 8.543 | n/a | 0.000 | 0.000 | 2.080 | 486.787 | 0.198 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.187 | 8.543 | 0.017 | 0.187 | gw-r/thread-51/journal/page | none observed |

## P3 / p4h1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 777.943 | n/a | n/a | n/a | 5.123 | n/a | 0.000 | 0.000 | 1.420 | 770.996 | 0.200 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.126 | 5.123 | 0.007 | 0.126 |
| p99 | 928.531 | n/a | n/a | n/a | 5.837 | n/a | 0.000 | 0.000 | 1.625 | 918.372 | 5.003 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.190 | 5.837 | 0.159 | 0.190 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c70000000000000057 | 928.531 | 3.526 | n/a | 0.000 | 0.000 | 1.396 | 918.372 | 5.003 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.112 | 3.526 | 0.004 | 0.112 | gw-r/thread-55/journal/page | none observed |
| 7a0dc1136116f9c70000000000000058 | 777.943 | 5.123 | n/a | 0.000 | 0.000 | 1.420 | 770.996 | 0.200 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.126 | 5.123 | 0.007 | 0.126 | gw-r/thread-50/journal/page | none observed |
| 7a0dc1136116f9c70000000000000056 | 36.615 | 5.837 | n/a | 0.000 | 0.000 | 1.625 | 28.877 | 0.025 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.190 | 5.837 | 0.159 | 0.190 | gw-r/thread-55/journal/page | none observed |

## P3 / grow3 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 245.779 | n/a | n/a | n/a | 2.974 | n/a | 0.000 | 0.000 | 1.436 | 240.920 | 0.018 | 10.716 | 0.102 | 0.000 | n/a | n/a | 0.103 | 2.974 | 0.016 | 0.103 |
| p99 | 962.433 | n/a | n/a | n/a | 149.667 | n/a | 9.000 | 0.000 | 1.628 | 775.599 | 0.303 | 20.547 | 0.107 | 0.000 | n/a | n/a | 5.878 | 158.666 | 0.165 | 5.878 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c7000000000000005d | 962.433 | 149.667 | n/a | 9.000 | 0.000 | 1.628 | 775.599 | 0.014 | 20.547 | 0.102 | 0.000 | n/a | n/a | 5.878 | 158.666 | 0.165 | 5.878 | gw-r/thread-52/journal/page | none observed |
| 7a0dc1136116f9c7000000000000005a | 245.779 | 2.974 | n/a | 0.000 | 0.000 | 1.383 | 240.920 | 0.303 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.092 | 2.974 | 0.012 | 0.092 | gw-r/thread-55/journal/page | none observed |
| 7a0dc1136116f9c7000000000000005b | 152.209 | 2.426 | n/a | 0.000 | 0.000 | 1.436 | 137.478 | 0.018 | 10.716 | 0.032 | 0.000 | n/a | n/a | 0.103 | 2.426 | 0.016 | 0.103 | gw-r/thread-54/journal/page | none observed |

## P3 / p4h3 / internal (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 258.021 | n/a | n/a | n/a | 3.662 | n/a | 0.000 | 0.000 | 1.578 | 252.408 | 0.025 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.116 | 3.662 | 0.032 | 0.116 |
| p99 | 1332.072 | n/a | n/a | n/a | 149.894 | n/a | 13.805 | 0.000 | 2.495 | 1130.761 | 0.558 | 33.446 | 0.164 | 0.000 | n/a | n/a | 1.886 | 163.698 | 0.137 | 1.886 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c70000000000000077 | 1332.072 | 149.894 | n/a | 13.805 | 0.000 | 2.108 | 1130.761 | 0.099 | 33.446 | 0.074 | 0.000 | n/a | n/a | 1.886 | 163.698 | 0.123 | 1.886 | gw-r/thread-52/journal/page | none observed |
| 7a0dc1136116f9c70000000000000074 | 537.422 | 7.254 | n/a | 0.000 | 0.000 | 1.741 | 528.155 | 0.025 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.171 | 7.254 | 0.013 | 0.171 | gw-r/thread-53/journal/page | none observed |
| 7a0dc1136116f9c70000000000000075 | 453.638 | 3.509 | n/a | 0.000 | 0.000 | 1.379 | 448.464 | 0.034 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.088 | 3.509 | 0.008 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 7a0dc1136116f9c7000000000000006b | 288.760 | 9.216 | n/a | 0.000 | 0.000 | 2.495 | 276.876 | 0.017 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.074 | 9.216 | 0.032 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 7a0dc1136116f9c7000000000000006d | 258.021 | 3.662 | n/a | 0.000 | 0.000 | 1.724 | 252.408 | 0.017 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.149 | 3.662 | 0.014 | 0.149 | gw-r/thread-48/journal/page | none observed |
| 7a0dc1136116f9c70000000000000069 | 224.795 | 3.532 | n/a | 0.000 | 0.000 | 1.462 | 198.629 | 0.059 | 20.970 | 0.072 | 0.000 | n/a | n/a | 0.072 | 3.532 | 0.016 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 7a0dc1136116f9c70000000000000072 | 118.029 | 5.085 | n/a | 0.000 | 0.000 | 1.578 | 111.102 | 0.023 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.163 | 5.085 | 0.043 | 0.163 | gw-r/thread-53/journal/page | none observed |
| 7a0dc1136116f9c70000000000000070 | 66.072 | 3.204 | n/a | 0.000 | 0.000 | 1.490 | 60.611 | 0.558 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.116 | 3.204 | 0.048 | 0.116 | gw-r/thread-51/journal/page | none observed |
| 7a0dc1136116f9c7000000000000006e | 19.471 | 2.672 | n/a | 0.000 | 0.000 | 1.519 | 15.130 | 0.015 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.062 | 2.672 | 0.137 | 0.062 | gw-r/thread-55/journal/page | none observed |

## P3 / grow10 / internal (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 150.892 | n/a | n/a | n/a | 87.591 | n/a | 4.963 | 0.000 | 1.581 | 40.332 | 0.024 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.445 | 95.834 | 0.556 | 1.445 |
| p99 | 521.594 | n/a | n/a | n/a | 166.984 | n/a | 12.777 | 0.000 | 4.281 | 421.113 | 0.067 | 11.032 | 0.120 | 0.000 | n/a | n/a | 3.104 | 179.761 | 0.775 | 3.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c7000000000000007a | 521.594 | 93.053 | n/a | 3.686 | 0.000 | 1.374 | 421.113 | 0.018 | 0.000 | 0.117 | 0.000 | n/a | n/a | 2.233 | 96.739 | 0.185 | 2.233 | gw-r/thread-51/journal/page | none observed |
| 7a0dc1136116f9c7000000000000007d | 427.937 | 166.984 | n/a | 12.777 | 0.000 | 1.781 | 243.114 | 0.058 | 0.000 | 0.120 | 0.000 | n/a | n/a | 3.104 | 179.761 | 0.420 | 3.104 | gw-r/thread-50/journal/page | none observed |
| 7a0dc1136116f9c70000000000000082 | 323.239 | 80.251 | n/a | 4.963 | 0.000 | 1.274 | 235.202 | 0.017 | 0.000 | 0.087 | 0.000 | n/a | n/a | 1.445 | 85.214 | 0.264 | 1.445 | gw-r/thread-53/journal/page | none observed |
| 7a0dc1136116f9c7000000000000007b | 201.059 | 101.616 | n/a | 10.228 | 0.000 | 1.887 | 78.196 | 0.009 | 7.360 | 0.031 | 0.000 | n/a | n/a | 1.731 | 111.844 | 0.556 | 1.731 | node-13/thread-2/replica.fetch-feed | none observed |
| 7a0dc1136116f9c7000000000000007f | 150.892 | 87.591 | n/a | 8.243 | 0.000 | 2.251 | 40.332 | 0.011 | 11.032 | 0.024 | 0.000 | n/a | n/a | 1.407 | 95.834 | 0.635 | 1.407 | node-13/thread-2/replica.fetch-feed | none observed |
| 7a0dc1136116f9c7000000000000007e | 139.775 | 100.537 | n/a | 7.836 | 0.000 | 4.281 | 25.381 | 0.048 | 0.000 | 0.055 | 0.000 | n/a | n/a | 1.635 | 108.374 | 0.775 | 1.635 | node-13/thread-2/replica.fetch-feed | none observed |
| 7a0dc1136116f9c70000000000000079 | 18.039 | 11.399 | n/a | 1.412 | 0.000 | 1.534 | 3.001 | 0.067 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.626 | 12.811 | 0.710 | 0.626 | node-13/thread-2/replica.fetch-feed | none observed |
| 7a0dc1136116f9c70000000000000080 | 6.888 | 4.097 | n/a | 0.000 | 0.000 | 1.581 | 1.111 | 0.024 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.075 | 4.097 | 0.595 | 0.075 | node-13/thread-2/replica.fetch-feed | none observed |
| 7a0dc1136116f9c7000000000000007c | 6.368 | 2.949 | n/a | 0.000 | 0.000 | 1.509 | 1.775 | 0.030 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.078 | 2.949 | 0.463 | 0.078 | node-13/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 360.410 | n/a | n/a | n/a | 2.415 | n/a | 0.000 | 0.000 | 1.440 | 355.787 | 0.016 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.077 | 2.415 | 0.003 | 0.077 |
| p99 | 1004.894 | n/a | n/a | n/a | 3.365 | n/a | 0.000 | 0.000 | 1.620 | 1000.840 | 0.044 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.084 | 3.365 | 0.014 | 0.084 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c70000000000000093 | 1004.894 | 2.228 | n/a | 0.000 | 0.000 | 1.620 | 1000.840 | 0.044 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.064 | 2.228 | 0.002 | 0.064 | gw-r/thread-55/journal/page | none observed |
| 7a0dc1136116f9c70000000000000090 | 756.911 | 2.415 | n/a | 0.000 | 0.000 | 1.391 | 752.938 | 0.014 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.084 | 2.415 | 0.003 | 0.084 | gw-r/thread-52/journal/page | none observed |
| 7a0dc1136116f9c7000000000000008f | 360.410 | 3.024 | n/a | 0.000 | 0.000 | 1.440 | 355.787 | 0.016 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.079 | 3.024 | 0.008 | 0.079 | gw-r/thread-52/journal/page | none observed |
| 7a0dc1136116f9c70000000000000091 | 233.957 | 3.365 | n/a | 0.000 | 0.000 | 1.549 | 228.773 | 0.020 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.077 | 3.365 | 0.014 | 0.077 | gw-r/thread-54/journal/page | none observed |

## P3 / presweep / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 247.460 | n/a | n/a | n/a | 3.863 | n/a | 0.000 | 0.000 | 1.540 | 235.364 | 0.065 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.084 | 3.863 | 0.016 | 0.084 |
| p99 | 542.977 | n/a | n/a | n/a | 6.174 | n/a | 0.000 | 0.000 | 5.312 | 538.569 | 0.148 | 6.318 | 0.073 | 0.000 | n/a | n/a | 0.154 | 6.174 | 0.028 | 0.154 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c7000000000000009b | 542.977 | 2.651 | n/a | 0.000 | 0.000 | 1.596 | 538.569 | 0.015 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.072 | 2.651 | 0.005 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 7a0dc1136116f9c7000000000000009a | 455.788 | 6.174 | n/a | 0.000 | 0.000 | 1.540 | 447.834 | 0.065 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.104 | 6.174 | 0.014 | 0.104 | gw-r/thread-52/journal/page | none observed |
| 7a0dc1136116f9c70000000000000096 | 247.460 | 4.033 | n/a | 0.000 | 0.000 | 1.392 | 235.364 | 0.148 | 6.318 | 0.051 | 0.000 | n/a | n/a | 0.154 | 4.033 | 0.016 | 0.154 | gw-r/thread-51/journal/page | none observed |
| 7a0dc1136116f9c70000000000000094 | 219.621 | 3.863 | n/a | 0.000 | 0.000 | 1.388 | 214.204 | 0.015 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.084 | 3.863 | 0.018 | 0.084 | gw-r/thread-50/journal/page | none observed |
| 7a0dc1136116f9c70000000000000098 | 81.762 | 2.304 | n/a | 0.000 | 0.000 | 5.312 | 73.917 | 0.127 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.070 | 2.304 | 0.028 | 0.070 | gw-r/thread-54/journal/page | none observed |

## P3 / sweep / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.895 | n/a | n/a | n/a | 5.450 | n/a | 0.000 | 0.000 | 1.522 | 10.731 | 0.031 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.185 | 5.450 | 0.272 | 0.185 |
| p99 | 1003.326 | n/a | n/a | n/a | 18.564 | n/a | 0.000 | 0.000 | 3.472 | 1000.514 | 0.792 | 0.000 | 0.172 | 0.000 | n/a | n/a | 4.639 | 18.564 | 0.585 | 4.639 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a0dc1136116f9c700000000000000a2 | 1003.326 | 0.148 | n/a | 0.000 | 0.000 | 1.451 | 1000.514 | 0.012 | 0.000 | 0.085 | 0.000 | n/a | n/a | 1.115 | 0.148 | 0.000 | 1.115 | gw-r/thread-72/journal/page | none observed |
| 7a0dc1136116f9c700000000000000a0 | 34.364 | 18.564 | n/a | 0.000 | 0.000 | 3.472 | 6.898 | 0.792 | 0.000 | 0.000 | 0.000 | n/a | n/a | 4.639 | 18.564 | 0.540 | 4.639 | node-13/thread-2/replica.fetch-feed | none observed |
| 7a0dc1136116f9c700000000000000a1 | 25.474 | 10.890 | n/a | 0.000 | 0.000 | 3.147 | 11.225 | 0.021 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.185 | 10.890 | 0.427 | 0.185 | gw-r/thread-54/gateway.admitted-work | none observed |
| 7a0dc1136116f9c7000000000000009f | 21.895 | 4.040 | n/a | 0.000 | 0.000 | 1.520 | 15.969 | 0.084 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.111 | 4.040 | 0.185 | 0.111 | gw-r/thread-53/journal/page | none observed |
| 7a0dc1136116f9c7000000000000009c | 20.008 | 5.450 | n/a | 0.000 | 0.000 | 2.869 | 10.731 | 0.350 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.521 | 5.450 | 0.272 | 0.521 | gw-r/thread-55/journal/page | none observed |
| 7a0dc1136116f9c7000000000000009d | 9.576 | 5.605 | n/a | 0.000 | 0.000 | 1.414 | 2.411 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.146 | 5.605 | 0.585 | 0.146 | node-13/thread-2/replica.validate-and-decode | none observed |
| 7a0dc1136116f9c7000000000000009e | 9.120 | 2.205 | n/a | 0.000 | 0.000 | 1.522 | 5.191 | 0.031 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.171 | 2.205 | 0.242 | 0.171 | gw-r/thread-54/gateway.admitted-work | none observed |

## P3 / warmup / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.064 | n/a | n/a | n/a | 0.045 | n/a | 0.000 | 0.000 | 1.517 | 200.993 | 0.023 | 0.000 | 0.210 | 0.000 | n/a | n/a | 0.094 | 0.045 | 0.000 | 0.094 |
| p99 | 207.450 | n/a | n/a | n/a | 0.097 | n/a | 0.000 | 0.000 | 5.994 | 202.125 | 0.042 | 0.000 | 2.191 | 0.000 | n/a | n/a | 0.343 | 0.097 | 0.001 | 0.343 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8025e50af3e9b4b3000000000000000d | 207.450 | 0.097 | n/a | 0.000 | 0.000 | 5.994 | 200.993 | 0.023 | 0.000 | 0.210 | 0.000 | n/a | n/a | 0.133 | 0.097 | 0.000 | 0.133 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b30000000000000008 | 204.668 | 0.045 | n/a | 0.000 | 0.000 | 2.066 | 202.125 | 0.023 | 0.000 | 0.308 | 0.000 | n/a | n/a | 0.099 | 0.045 | 0.000 | 0.099 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b30000000000000009 | 203.368 | 0.042 | n/a | 0.000 | 0.000 | 1.753 | 201.026 | 0.031 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.343 | 0.042 | 0.000 | 0.343 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b3000000000000000f | 203.217 | 0.042 | n/a | 0.000 | 0.000 | 1.401 | 201.432 | 0.020 | 0.000 | 0.237 | 0.000 | n/a | n/a | 0.086 | 0.042 | 0.000 | 0.086 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b3000000000000000e | 203.064 | 0.039 | n/a | 0.000 | 0.000 | 1.345 | 201.349 | 0.030 | 0.000 | 0.228 | 0.000 | n/a | n/a | 0.073 | 0.039 | 0.000 | 0.073 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b3000000000000000b | 202.569 | 0.038 | n/a | 0.000 | 0.000 | 1.402 | 200.818 | 0.019 | 0.000 | 0.206 | 0.000 | n/a | n/a | 0.087 | 0.038 | 0.000 | 0.087 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b3000000000000000c | 190.496 | 0.054 | n/a | 0.000 | 0.000 | 1.405 | 188.816 | 0.019 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.072 | 0.054 | 0.000 | 0.072 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b30000000000000011 | 188.643 | 0.063 | n/a | 0.000 | 0.000 | 1.662 | 186.714 | 0.020 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.094 | 0.063 | 0.000 | 0.094 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b30000000000000010 | 104.487 | 0.064 | n/a | 0.000 | 0.000 | 1.517 | 100.564 | 0.042 | 0.000 | 2.191 | 0.000 | n/a | n/a | 0.108 | 0.064 | 0.001 | 0.108 | gw-r/thread-50/journal/page | none observed |

## P3 / baseline / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.522 | n/a | n/a | n/a | 0.057 | n/a | 0.000 | 0.000 | 1.492 | 200.669 | 0.018 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.125 | 0.057 | 0.000 | 0.125 |
| p99 | 202.889 | n/a | n/a | n/a | 0.582 | n/a | 0.000 | 0.000 | 1.585 | 201.000 | 0.040 | 0.000 | 0.233 | 0.000 | n/a | n/a | 0.173 | 0.582 | 0.005 | 0.173 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8025e50af3e9b4b30000000000000013 | 202.889 | 0.057 | n/a | 0.000 | 0.000 | 1.386 | 201.000 | 0.040 | 0.000 | 0.233 | 0.000 | n/a | n/a | 0.173 | 0.057 | 0.000 | 0.173 | gw-r/thread-48/journal/page | none observed |
| 8025e50af3e9b4b30000000000000014 | 202.859 | 0.065 | n/a | 0.000 | 0.000 | 1.580 | 200.911 | 0.018 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.152 | 0.065 | 0.000 | 0.152 | gw-r/thread-52/journal/page | none observed |
| 8025e50af3e9b4b30000000000000012 | 202.522 | 0.047 | n/a | 0.000 | 0.000 | 1.492 | 200.669 | 0.021 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.125 | 0.047 | 0.000 | 0.125 | gw-r/thread-52/journal/page | none observed |
| 8025e50af3e9b4b30000000000000015 | 125.216 | 0.582 | n/a | 0.000 | 0.000 | 1.585 | 122.828 | 0.015 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.124 | 0.582 | 0.005 | 0.124 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.744 | n/a | n/a | n/a | 0.057 | n/a | 0.000 | 0.000 | 1.540 | 201.687 | 0.031 | 0.000 | 0.218 | 0.000 | n/a | n/a | 0.102 | 0.057 | 0.000 | 0.102 |
| p99 | 205.590 | n/a | n/a | n/a | 0.088 | n/a | 0.000 | 0.000 | 1.952 | 203.559 | 0.057 | 0.000 | 0.408 | 0.000 | n/a | n/a | 0.134 | 0.088 | 0.001 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8025e50af3e9b4b30000000000000024 | 205.590 | 0.057 | n/a | 0.000 | 0.000 | 1.540 | 203.559 | 0.057 | 0.000 | 0.244 | 0.000 | n/a | n/a | 0.134 | 0.057 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |
| 8025e50af3e9b4b30000000000000022 | 204.030 | 0.052 | n/a | 0.000 | 0.000 | 1.952 | 201.687 | 0.031 | 0.000 | 0.218 | 0.000 | n/a | n/a | 0.090 | 0.052 | 0.000 | 0.090 | gw-r/thread-48/journal/page | none observed |
| 8025e50af3e9b4b30000000000000021 | 203.744 | 0.040 | n/a | 0.000 | 0.000 | 1.450 | 201.718 | 0.027 | 0.000 | 0.408 | 0.000 | n/a | n/a | 0.102 | 0.040 | 0.000 | 0.102 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b30000000000000023 | 161.600 | 0.066 | n/a | 0.000 | 0.000 | 1.418 | 159.907 | 0.044 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.102 | 0.066 | 0.000 | 0.102 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b30000000000000020 | 118.531 | 0.088 | n/a | 0.000 | 0.000 | 1.608 | 116.614 | 0.030 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.115 | 0.088 | 0.001 | 0.115 | gw-r/thread-52/journal/page | none observed |

## P3 / L64 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.626 | n/a | n/a | n/a | 0.046 | n/a | 0.000 | 0.000 | 1.425 | 200.918 | 0.032 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.088 | 0.046 | 0.000 | 0.088 |
| p99 | 204.839 | n/a | n/a | n/a | 0.102 | n/a | 0.000 | 0.000 | 1.570 | 203.097 | 87.453 | 0.000 | 0.414 | 0.000 | n/a | n/a | 0.168 | 0.102 | 0.001 | 0.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8025e50af3e9b4b3000000000000002e | 204.839 | 0.039 | n/a | 0.000 | 0.000 | 1.417 | 203.097 | 0.022 | 0.000 | 0.179 | 0.000 | n/a | n/a | 0.084 | 0.039 | 0.000 | 0.084 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b30000000000000026 | 204.681 | 0.046 | n/a | 0.000 | 0.000 | 1.408 | 202.652 | 0.053 | 0.000 | 0.414 | 0.000 | n/a | n/a | 0.108 | 0.046 | 0.000 | 0.108 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b30000000000000025 | 203.973 | 0.048 | n/a | 0.000 | 0.000 | 1.520 | 201.925 | 0.030 | 0.000 | 0.371 | 0.000 | n/a | n/a | 0.080 | 0.048 | 0.000 | 0.080 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b3000000000000002b | 202.819 | 0.042 | n/a | 0.000 | 0.000 | 1.412 | 201.048 | 0.025 | 0.000 | 0.204 | 0.000 | n/a | n/a | 0.088 | 0.042 | 0.000 | 0.088 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b3000000000000002c | 202.626 | 0.044 | n/a | 0.000 | 0.000 | 1.425 | 200.918 | 0.032 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.085 | 0.044 | 0.000 | 0.085 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b30000000000000029 | 202.405 | 0.035 | n/a | 0.000 | 0.000 | 1.418 | 200.698 | 0.018 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.076 | 0.035 | 0.000 | 0.076 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b30000000000000028 | 196.761 | 0.102 | n/a | 0.000 | 0.000 | 1.570 | 172.649 | 22.215 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.168 | 0.102 | 0.001 | 0.168 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b30000000000000027 | 181.710 | 0.093 | n/a | 0.000 | 0.000 | 1.440 | 92.521 | 87.453 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.109 | 0.093 | 0.001 | 0.109 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b3000000000000002d | 170.689 | 0.084 | n/a | 0.000 | 0.000 | 1.438 | 161.660 | 7.306 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.106 | 0.084 | 0.000 | 0.106 | gw-r/thread-55/journal/page | none observed |

## P3 / L256 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.255 | n/a | n/a | n/a | 0.051 | n/a | 0.000 | 0.000 | 1.505 | 200.552 | 0.028 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.090 | 0.051 | 0.000 | 0.090 |
| p99 | 212.917 | n/a | n/a | n/a | 0.088 | n/a | 0.000 | 0.000 | 4.975 | 200.806 | 11.528 | 18.890 | 0.165 | 0.000 | n/a | n/a | 0.141 | 0.088 | 0.001 | 0.141 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8025e50af3e9b4b30000000000000038 | 212.917 | 0.040 | n/a | 0.000 | 0.000 | 2.148 | 191.592 | 0.030 | 18.890 | 0.132 | 0.000 | n/a | n/a | 0.085 | 0.040 | 0.000 | 0.085 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b30000000000000030 | 203.342 | 0.047 | n/a | 0.000 | 0.000 | 2.316 | 200.648 | 0.023 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.141 | 0.047 | 0.000 | 0.141 | gw-r/thread-52/journal/page | none observed |
| 8025e50af3e9b4b30000000000000036 | 202.620 | 0.038 | n/a | 0.000 | 0.000 | 1.505 | 200.806 | 0.026 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.083 | 0.038 | 0.000 | 0.083 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b30000000000000034 | 202.513 | 0.051 | n/a | 0.000 | 0.000 | 1.498 | 200.689 | 0.015 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.135 | 0.051 | 0.000 | 0.135 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b30000000000000033 | 202.255 | 0.040 | n/a | 0.000 | 0.000 | 1.402 | 200.569 | 0.020 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.103 | 0.040 | 0.000 | 0.103 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b30000000000000031 | 202.221 | 0.051 | n/a | 0.000 | 0.000 | 1.395 | 200.552 | 0.028 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.080 | 0.051 | 0.000 | 0.080 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b30000000000000035 | 171.038 | 0.088 | n/a | 0.000 | 0.000 | 3.065 | 166.550 | 1.107 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.131 | 0.088 | 0.001 | 0.131 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b30000000000000032 | 168.733 | 0.061 | n/a | 0.000 | 0.000 | 1.338 | 163.798 | 3.406 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.090 | 0.061 | 0.000 | 0.090 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b3000000000000002f | 144.431 | 0.063 | n/a | 0.000 | 0.000 | 4.975 | 127.763 | 11.528 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.088 | 0.063 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.701 | n/a | n/a | n/a | 0.050 | n/a | 0.000 | 0.000 | 1.509 | 200.978 | 0.022 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.092 | 0.050 | 0.000 | 0.092 |
| p99 | 204.339 | n/a | n/a | n/a | 0.083 | n/a | 0.000 | 0.000 | 4.482 | 201.644 | 12.072 | 0.000 | 0.214 | 0.000 | n/a | n/a | 0.199 | 0.083 | 0.001 | 0.199 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8025e50af3e9b4b3000000000000003e | 204.339 | 0.039 | n/a | 0.000 | 0.000 | 2.888 | 201.084 | 0.069 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.077 | 0.039 | 0.000 | 0.077 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b3000000000000003f | 203.957 | 0.058 | n/a | 0.000 | 0.000 | 1.890 | 201.644 | 0.056 | 0.000 | 0.214 | 0.000 | n/a | n/a | 0.094 | 0.058 | 0.000 | 0.094 | gw-r/thread-52/journal/page | none observed |
| 8025e50af3e9b4b30000000000000043 | 203.036 | 0.054 | n/a | 0.000 | 0.000 | 1.618 | 200.978 | 0.024 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.199 | 0.054 | 0.000 | 0.199 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b30000000000000041 | 202.806 | 0.040 | n/a | 0.000 | 0.000 | 1.390 | 201.078 | 0.020 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.092 | 0.040 | 0.000 | 0.092 | gw-r/thread-52/journal/page | none observed |
| 8025e50af3e9b4b3000000000000003c | 202.711 | 0.083 | n/a | 0.000 | 0.000 | 1.509 | 200.834 | 0.021 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.137 | 0.083 | 0.000 | 0.137 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b30000000000000040 | 202.701 | 0.039 | n/a | 0.000 | 0.000 | 1.384 | 201.006 | 0.021 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.096 | 0.039 | 0.000 | 0.096 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b3000000000000003a | 202.691 | 0.040 | n/a | 0.000 | 0.000 | 1.380 | 200.978 | 0.022 | 0.000 | 0.186 | 0.000 | n/a | n/a | 0.085 | 0.040 | 0.000 | 0.085 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b3000000000000003b | 202.210 | 0.042 | n/a | 0.000 | 0.000 | 1.407 | 200.548 | 0.020 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.079 | 0.042 | 0.000 | 0.079 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b30000000000000039 | 128.045 | 0.079 | n/a | 0.000 | 0.000 | 1.416 | 114.301 | 12.072 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.080 | 0.079 | 0.001 | 0.080 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b30000000000000042 | 102.781 | 0.070 | n/a | 0.000 | 0.000 | 4.482 | 98.038 | 0.020 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.096 | 0.070 | 0.001 | 0.096 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b3000000000000003d | 94.514 | 0.050 | n/a | 0.000 | 0.000 | 1.764 | 89.680 | 2.874 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.068 | 0.050 | 0.001 | 0.068 | gw-r/thread-50/journal/page | none observed |

## P3 / recovery / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.877 | n/a | n/a | n/a | 0.059 | n/a | 0.000 | 0.000 | 1.459 | 201.167 | 0.026 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.105 | 0.059 | 0.000 | 0.105 |
| p99 | 220.780 | n/a | n/a | n/a | 0.135 | n/a | 0.000 | 0.000 | 18.726 | 217.403 | 6.111 | 0.062 | 0.543 | 0.000 | n/a | n/a | 0.458 | 0.135 | 0.001 | 0.458 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8025e50af3e9b4b3000000000000004a | 220.780 | 0.050 | n/a | 0.000 | 0.000 | 18.726 | 201.674 | 0.024 | 0.062 | 0.143 | 0.000 | n/a | n/a | 0.101 | 0.050 | 0.000 | 0.101 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b30000000000000047 | 220.354 | 0.132 | n/a | 0.000 | 0.000 | 1.621 | 217.403 | 0.197 | 0.000 | 0.543 | 0.000 | n/a | n/a | 0.458 | 0.132 | 0.001 | 0.458 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b30000000000000046 | 204.264 | 0.061 | n/a | 0.000 | 0.000 | 1.606 | 202.098 | 0.067 | 0.000 | 0.297 | 0.000 | n/a | n/a | 0.135 | 0.061 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| 8025e50af3e9b4b30000000000000044 | 203.476 | 0.059 | n/a | 0.000 | 0.000 | 1.556 | 201.443 | 0.021 | 0.000 | 0.256 | 0.000 | n/a | n/a | 0.141 | 0.059 | 0.000 | 0.141 | gw-r/thread-48/journal/page | none observed |
| 8025e50af3e9b4b3000000000000004d | 203.034 | 0.041 | n/a | 0.000 | 0.000 | 1.459 | 201.277 | 0.022 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.083 | 0.041 | 0.000 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 8025e50af3e9b4b30000000000000045 | 202.877 | 0.057 | n/a | 0.000 | 0.000 | 1.400 | 201.167 | 0.020 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.105 | 0.057 | 0.000 | 0.105 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b3000000000000004b | 187.806 | 0.052 | n/a | 0.000 | 0.000 | 1.440 | 179.997 | 6.111 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.089 | 0.052 | 0.000 | 0.089 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b3000000000000004c | 186.571 | 0.063 | n/a | 0.000 | 0.000 | 1.391 | 182.354 | 2.628 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.092 | 0.063 | 0.000 | 0.092 | gw-r/thread-52/journal/page | none observed |
| 8025e50af3e9b4b30000000000000049 | 119.492 | 0.135 | n/a | 0.000 | 0.000 | 1.687 | 117.330 | 0.033 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.202 | 0.135 | 0.001 | 0.202 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b30000000000000048 | 91.475 | 0.068 | n/a | 0.000 | 0.000 | 1.397 | 89.776 | 0.026 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.109 | 0.068 | 0.001 | 0.109 | gw-r/thread-52/journal/page | none observed |

## P3 / p4mix / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.007 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 1.399 | 200.373 | 0.020 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.081 | 0.043 | 0.000 | 0.081 |
| p99 | 202.635 | n/a | n/a | n/a | 0.078 | n/a | 0.000 | 0.000 | 1.664 | 200.913 | 6.399 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.174 | 0.078 | 0.001 | 0.174 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8025e50af3e9b4b3000000000000004e | 202.635 | 0.074 | n/a | 0.000 | 0.000 | 1.377 | 200.913 | 0.018 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.101 | 0.074 | 0.000 | 0.101 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b30000000000000057 | 202.359 | 0.034 | n/a | 0.000 | 0.000 | 1.399 | 200.634 | 0.040 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.075 | 0.034 | 0.000 | 0.075 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b3000000000000004f | 202.220 | 0.036 | n/a | 0.000 | 0.000 | 1.396 | 200.556 | 0.020 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.108 | 0.036 | 0.000 | 0.108 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b30000000000000050 | 202.204 | 0.045 | n/a | 0.000 | 0.000 | 1.493 | 200.490 | 0.019 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.078 | 0.045 | 0.000 | 0.078 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b30000000000000052 | 202.195 | 0.043 | n/a | 0.000 | 0.000 | 1.482 | 200.380 | 0.026 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.119 | 0.043 | 0.000 | 0.119 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b30000000000000054 | 202.007 | 0.038 | n/a | 0.000 | 0.000 | 1.405 | 200.373 | 0.018 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.076 | 0.038 | 0.000 | 0.076 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b30000000000000053 | 201.939 | 0.043 | n/a | 0.000 | 0.000 | 1.390 | 200.300 | 0.014 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.081 | 0.043 | 0.000 | 0.081 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b30000000000000055 | 201.922 | 0.042 | n/a | 0.000 | 0.000 | 1.381 | 200.289 | 0.025 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.080 | 0.042 | 0.000 | 0.080 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b30000000000000056 | 98.559 | 0.069 | n/a | 0.000 | 0.000 | 1.664 | 90.250 | 6.399 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.098 | 0.069 | 0.001 | 0.098 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b30000000000000051 | 85.085 | 0.078 | n/a | 0.000 | 0.000 | 1.592 | 78.850 | 4.359 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.174 | 0.078 | 0.001 | 0.174 | gw-r/thread-54/journal/page | none observed |

## P3 / p4h1 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.407 | n/a | n/a | n/a | 0.052 | n/a | 0.000 | 0.000 | 1.531 | 200.674 | 0.018 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.095 | 0.052 | 0.000 | 0.095 |
| p99 | 203.922 | n/a | n/a | n/a | 0.082 | n/a | 0.000 | 0.000 | 2.597 | 201.238 | 4.545 | 0.000 | 2.053 | 0.000 | n/a | n/a | 0.208 | 0.082 | 0.000 | 0.208 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8025e50af3e9b4b30000000000000063 | 203.922 | 0.051 | n/a | 0.000 | 0.000 | 2.597 | 200.982 | 0.021 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.091 | 0.051 | 0.000 | 0.091 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b30000000000000060 | 203.534 | 0.066 | n/a | 0.000 | 0.000 | 2.512 | 200.674 | 0.025 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.141 | 0.066 | 0.000 | 0.141 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b3000000000000005e | 203.198 | 0.070 | n/a | 0.000 | 0.000 | 1.497 | 201.238 | 0.031 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.190 | 0.070 | 0.000 | 0.190 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b30000000000000068 | 202.663 | 0.082 | n/a | 0.000 | 0.000 | 1.523 | 200.756 | 0.017 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.159 | 0.082 | 0.000 | 0.159 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b30000000000000069 | 202.516 | 0.039 | n/a | 0.000 | 0.000 | 1.411 | 200.830 | 0.018 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.076 | 0.039 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 8025e50af3e9b4b3000000000000005f | 202.407 | 0.053 | n/a | 0.000 | 0.000 | 1.563 | 200.453 | 0.017 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.208 | 0.053 | 0.000 | 0.208 | gw-r/thread-48/journal/page | none observed |
| 8025e50af3e9b4b30000000000000065 | 202.282 | 0.038 | n/a | 0.000 | 0.000 | 1.335 | 200.680 | 0.025 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.069 | 0.038 | 0.000 | 0.069 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b30000000000000064 | 202.244 | 0.052 | n/a | 0.000 | 0.000 | 1.531 | 200.404 | 0.016 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.143 | 0.052 | 0.000 | 0.143 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b30000000000000062 | 202.167 | 0.034 | n/a | 0.000 | 0.000 | 1.535 | 200.410 | 0.014 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.076 | 0.034 | 0.000 | 0.076 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b30000000000000067 | 201.745 | 0.036 | n/a | 0.000 | 0.000 | 1.405 | 200.109 | 0.016 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.075 | 0.036 | 0.000 | 0.075 | gw-r/thread-52/journal/page | none observed |
| 8025e50af3e9b4b30000000000000061 | 143.725 | 0.054 | n/a | 0.000 | 0.000 | 2.040 | 134.939 | 4.545 | 0.000 | 2.053 | 0.000 | n/a | n/a | 0.095 | 0.054 | 0.000 | 0.095 | gw-r/thread-48/journal/page | none observed |

## P3 / grow3 / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.686 | n/a | n/a | n/a | 0.058 | n/a | 0.000 | 0.000 | 1.412 | 200.853 | 0.038 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.097 | 0.058 | 0.000 | 0.097 |
| p99 | 205.175 | n/a | n/a | n/a | 0.776 | n/a | 0.000 | 0.000 | 3.318 | 201.637 | 131.830 | 10.716 | 0.199 | 0.000 | n/a | n/a | 0.229 | 0.776 | 0.006 | 0.229 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8025e50af3e9b4b3000000000000006b | 205.175 | 0.060 | n/a | 0.000 | 0.000 | 3.318 | 201.438 | 0.033 | 0.000 | 0.199 | 0.000 | n/a | n/a | 0.126 | 0.060 | 0.000 | 0.126 | gw-r/thread-52/journal/page | none observed |
| 8025e50af3e9b4b30000000000000070 | 203.294 | 0.040 | n/a | 0.000 | 0.000 | 1.368 | 201.637 | 0.038 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.079 | 0.040 | 0.000 | 0.079 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b3000000000000006f | 203.098 | 0.037 | n/a | 0.000 | 0.000 | 1.386 | 201.375 | 0.024 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.086 | 0.037 | 0.000 | 0.086 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b3000000000000006e | 202.686 | 0.070 | n/a | 0.000 | 0.000 | 1.423 | 200.853 | 0.063 | 0.000 | 0.179 | 0.000 | n/a | n/a | 0.097 | 0.070 | 0.000 | 0.097 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b3000000000000006d | 150.586 | 0.049 | n/a | 0.000 | 0.000 | 1.412 | 138.181 | 0.039 | 10.716 | 0.106 | 0.000 | n/a | n/a | 0.084 | 0.049 | 0.000 | 0.084 | gw-r/thread-52/journal/page | none observed |
| 8025e50af3e9b4b30000000000000071 | 138.110 | 0.776 | n/a | 0.000 | 0.000 | 1.558 | 3.718 | 131.830 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.229 | 0.776 | 0.006 | 0.229 | gw-r/thread-54/gateway.admission-wait | none observed |
| 8025e50af3e9b4b3000000000000006a | 101.958 | 0.058 | n/a | 0.000 | 0.000 | 1.401 | 100.245 | 0.017 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.109 | 0.058 | 0.001 | 0.109 | gw-r/thread-55/journal/page | none observed |

## P3 / p4h3 / read (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.065 | n/a | n/a | n/a | 0.052 | n/a | 0.000 | 0.000 | 1.512 | 200.211 | 0.024 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.088 | 0.052 | 0.000 | 0.088 |
| p99 | 221.610 | n/a | n/a | n/a | 0.150 | n/a | 0.000 | 0.000 | 20.196 | 202.359 | 5.387 | 0.888 | 0.278 | 0.000 | n/a | n/a | 0.444 | 0.150 | 0.001 | 0.444 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8025e50af3e9b4b30000000000000080 | 221.610 | 0.033 | n/a | 0.000 | 0.000 | 20.196 | 200.211 | 0.055 | 0.888 | 0.156 | 0.000 | n/a | n/a | 0.072 | 0.033 | 0.000 | 0.072 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b3000000000000008e | 205.541 | 0.041 | n/a | 0.000 | 0.000 | 3.911 | 201.216 | 0.023 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.168 | 0.041 | 0.000 | 0.168 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b30000000000000087 | 205.110 | 0.150 | n/a | 0.000 | 0.000 | 1.772 | 202.359 | 0.108 | 0.000 | 0.278 | 0.000 | n/a | n/a | 0.444 | 0.150 | 0.001 | 0.444 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b30000000000000088 | 203.924 | 0.053 | n/a | 0.000 | 0.000 | 1.386 | 202.061 | 0.120 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.108 | 0.053 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 8025e50af3e9b4b30000000000000082 | 202.818 | 0.037 | n/a | 0.000 | 0.000 | 1.892 | 200.671 | 0.024 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.087 | 0.037 | 0.000 | 0.087 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b3000000000000008a | 202.332 | 0.033 | n/a | 0.000 | 0.000 | 1.364 | 200.677 | 0.046 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.075 | 0.033 | 0.000 | 0.075 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b3000000000000008f | 202.215 | 0.039 | n/a | 0.000 | 0.000 | 1.396 | 200.587 | 0.014 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.082 | 0.039 | 0.000 | 0.082 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b3000000000000008b | 202.065 | 0.089 | n/a | 0.000 | 0.000 | 1.395 | 200.256 | 0.017 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.218 | 0.089 | 0.000 | 0.218 | gw-r/thread-52/journal/page | none observed |
| 8025e50af3e9b4b3000000000000008d | 201.865 | 0.037 | n/a | 0.000 | 0.000 | 1.639 | 199.970 | 0.017 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.088 | 0.037 | 0.000 | 0.088 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b3000000000000007f | 196.504 | 0.052 | n/a | 0.000 | 0.000 | 1.401 | 194.879 | 0.022 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.075 | 0.052 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 8025e50af3e9b4b30000000000000086 | 114.703 | 0.057 | n/a | 0.000 | 0.000 | 1.397 | 107.685 | 5.387 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.083 | 0.057 | 0.000 | 0.083 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b30000000000000089 | 82.814 | 0.102 | n/a | 0.000 | 0.000 | 1.512 | 77.923 | 2.921 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.225 | 0.102 | 0.001 | 0.225 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b30000000000000081 | 65.558 | 0.065 | n/a | 0.000 | 0.000 | 5.327 | 55.161 | 4.838 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.115 | 0.065 | 0.001 | 0.115 | gw-r/thread-52/journal/page | none observed |
| 8025e50af3e9b4b30000000000000085 | 61.456 | 0.056 | n/a | 0.000 | 0.000 | 1.519 | 59.676 | 0.020 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.113 | 0.056 | 0.001 | 0.113 | gw-r/thread-55/journal/page | none observed |

## P3 / grow10 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.165 | n/a | n/a | n/a | 0.055 | n/a | 0.000 | 0.000 | 1.567 | 105.566 | 0.026 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.125 | 0.055 | 0.000 | 0.125 |
| p99 | 273.248 | n/a | n/a | n/a | 0.959 | n/a | 0.000 | 0.000 | 2.154 | 200.960 | 213.836 | 11.032 | 0.271 | 0.000 | n/a | n/a | 0.323 | 0.959 | 0.012 | 0.323 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8025e50af3e9b4b30000000000000091 | 273.248 | 0.467 | n/a | 0.000 | 0.000 | 1.865 | 56.877 | 213.836 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.107 | 0.467 | 0.002 | 0.107 | gw-r/thread-53/gateway.admission-wait | none observed |
| 8025e50af3e9b4b30000000000000098 | 202.952 | 0.049 | n/a | 0.000 | 0.000 | 1.567 | 200.912 | 0.038 | 0.000 | 0.255 | 0.000 | n/a | n/a | 0.131 | 0.049 | 0.000 | 0.131 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b30000000000000093 | 202.856 | 0.055 | n/a | 0.000 | 0.000 | 1.573 | 200.880 | 0.046 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.138 | 0.055 | 0.000 | 0.138 | gw-r/thread-52/journal/page | none observed |
| 8025e50af3e9b4b3000000000000009d | 202.657 | 0.034 | n/a | 0.000 | 0.000 | 1.401 | 200.960 | 0.022 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.078 | 0.034 | 0.000 | 0.078 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b30000000000000090 | 202.195 | 0.053 | n/a | 0.000 | 0.000 | 1.564 | 200.311 | 0.025 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.125 | 0.053 | 0.000 | 0.125 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b30000000000000094 | 202.165 | 0.046 | n/a | 0.000 | 0.000 | 1.540 | 200.369 | 0.026 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.092 | 0.046 | 0.000 | 0.092 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b3000000000000009b | 119.775 | 0.700 | n/a | 0.000 | 0.000 | 2.154 | 105.566 | 0.015 | 11.032 | 0.132 | 0.000 | n/a | n/a | 0.176 | 0.700 | 0.006 | 0.176 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b30000000000000096 | 102.833 | 0.841 | n/a | 0.000 | 0.000 | 1.675 | 92.668 | 0.017 | 7.360 | 0.095 | 0.000 | n/a | n/a | 0.176 | 0.841 | 0.008 | 0.176 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b3000000000000009a | 86.625 | 0.959 | n/a | 0.000 | 0.000 | 1.791 | 83.191 | 0.089 | 0.000 | 0.271 | 0.000 | n/a | n/a | 0.323 | 0.959 | 0.011 | 0.323 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b30000000000000099 | 59.994 | 0.719 | n/a | 0.000 | 0.000 | 1.453 | 50.300 | 7.255 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.121 | 0.719 | 0.012 | 0.121 | gw-r/thread-54/journal/page | none observed |

## P3 / p4h10 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.080 | n/a | n/a | n/a | 0.050 | n/a | 0.000 | 0.000 | 1.438 | 200.278 | 0.023 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.096 | 0.050 | 0.000 | 0.096 |
| p99 | 203.253 | n/a | n/a | n/a | 0.084 | n/a | 0.000 | 0.000 | 2.573 | 200.750 | 5.521 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.177 | 0.084 | 0.001 | 0.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8025e50af3e9b4b300000000000000b7 | 203.253 | 0.050 | n/a | 0.000 | 0.000 | 2.573 | 200.376 | 0.015 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.145 | 0.050 | 0.000 | 0.145 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b300000000000000b3 | 202.441 | 0.041 | n/a | 0.000 | 0.000 | 1.438 | 200.750 | 0.017 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.078 | 0.041 | 0.000 | 0.078 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b300000000000000b9 | 202.285 | 0.048 | n/a | 0.000 | 0.000 | 1.430 | 200.591 | 0.018 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.085 | 0.048 | 0.000 | 0.085 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b300000000000000be | 202.272 | 0.051 | n/a | 0.000 | 0.000 | 1.526 | 200.430 | 0.051 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.122 | 0.051 | 0.000 | 0.122 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b300000000000000bf | 202.156 | 0.052 | n/a | 0.000 | 0.000 | 1.406 | 200.487 | 0.020 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.091 | 0.052 | 0.000 | 0.091 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b300000000000000b5 | 202.132 | 0.043 | n/a | 0.000 | 0.000 | 1.537 | 200.268 | 0.041 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.115 | 0.043 | 0.000 | 0.115 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b300000000000000bb | 202.080 | 0.042 | n/a | 0.000 | 0.000 | 1.529 | 200.278 | 0.016 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.110 | 0.042 | 0.000 | 0.110 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b300000000000000b8 | 202.062 | 0.057 | n/a | 0.000 | 0.000 | 1.337 | 200.465 | 0.023 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.091 | 0.057 | 0.000 | 0.091 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b300000000000000bd | 202.053 | 0.056 | n/a | 0.000 | 0.000 | 1.528 | 200.149 | 0.033 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.177 | 0.056 | 0.000 | 0.177 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b300000000000000b4 | 196.274 | 0.063 | n/a | 0.000 | 0.000 | 1.382 | 189.170 | 5.521 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.096 | 0.063 | 0.000 | 0.096 | gw-r/thread-55/journal/page | none observed |
| 8025e50af3e9b4b300000000000000b6 | 137.583 | 0.047 | n/a | 0.000 | 0.000 | 1.396 | 134.240 | 1.754 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.073 | 0.047 | 0.000 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b300000000000000ba | 86.635 | 0.084 | n/a | 0.000 | 0.000 | 1.524 | 81.445 | 3.439 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.127 | 0.084 | 0.001 | 0.127 | gw-r/thread-50/journal/page | none observed |

## P3 / presweep / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.725 | n/a | n/a | n/a | 0.053 | n/a | 0.000 | 0.000 | 1.499 | 200.034 | 0.015 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.107 | 0.053 | 0.000 | 0.107 |
| p99 | 207.778 | n/a | n/a | n/a | 0.111 | n/a | 0.000 | 0.000 | 4.416 | 201.029 | 0.048 | 0.520 | 0.251 | 0.000 | n/a | n/a | 1.981 | 0.111 | 0.001 | 1.981 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8025e50af3e9b4b300000000000000cb | 207.778 | 0.053 | n/a | 0.000 | 0.000 | 4.416 | 201.029 | 0.048 | 0.000 | 0.251 | 0.000 | n/a | n/a | 1.981 | 0.053 | 0.000 | 1.981 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b300000000000000c8 | 202.820 | 0.058 | n/a | 0.000 | 0.000 | 1.566 | 200.880 | 0.029 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.142 | 0.058 | 0.000 | 0.142 | gw-r/thread-48/journal/page | none observed |
| 8025e50af3e9b4b300000000000000c0 | 202.240 | 0.045 | n/a | 0.000 | 0.000 | 1.435 | 200.589 | 0.018 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.086 | 0.045 | 0.000 | 0.086 | gw-r/thread-53/journal/page | none observed |
| 8025e50af3e9b4b300000000000000c2 | 202.022 | 0.045 | n/a | 0.000 | 0.000 | 1.453 | 200.249 | 0.018 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.125 | 0.045 | 0.000 | 0.125 | gw-r/thread-52/journal/page | none observed |
| 8025e50af3e9b4b300000000000000c7 | 201.971 | 0.040 | n/a | 0.000 | 0.000 | 1.410 | 200.327 | 0.018 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.086 | 0.040 | 0.000 | 0.086 | gw-r/thread-51/journal/page | none observed |
| 8025e50af3e9b4b300000000000000ca | 201.725 | 0.058 | n/a | 0.000 | 0.000 | 1.413 | 200.034 | 0.015 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.105 | 0.058 | 0.000 | 0.105 | gw-r/thread-48/journal/page | none observed |
| 8025e50af3e9b4b300000000000000c4 | 201.724 | 0.044 | n/a | 0.000 | 0.000 | 1.518 | 199.947 | 0.015 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.107 | 0.044 | 0.000 | 0.107 | gw-r/thread-54/journal/page | none observed |
| 8025e50af3e9b4b300000000000000c1 | 106.016 | 0.111 | n/a | 0.000 | 0.000 | 1.499 | 104.204 | 0.015 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.153 | 0.111 | 0.001 | 0.153 | gw-r/thread-50/journal/page | none observed |
| 8025e50af3e9b4b300000000000000cc | 100.783 | 0.054 | n/a | 0.000 | 0.000 | 4.069 | 96.536 | 0.007 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.101 | 0.054 | 0.001 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 8025e50af3e9b4b300000000000000c6 | 82.947 | 0.063 | n/a | 0.000 | 0.000 | 2.548 | 79.635 | 0.009 | 0.520 | 0.044 | 0.000 | n/a | n/a | 0.128 | 0.063 | 0.001 | 0.128 | gw-r/thread-52/journal/page | none observed |

## P3 / sweep / read (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 204.002 | n/a | n/a | n/a | 0.061 | n/a | 0.000 | 0.000 | 1.636 | 201.083 | 0.029 | 0.000 | 1.057 | 0.000 | n/a | n/a | 0.135 | 0.061 | 0.000 | 0.135 |
| p99 | 204.002 | n/a | n/a | n/a | 0.061 | n/a | 0.000 | 0.000 | 1.636 | 201.083 | 0.029 | 0.000 | 1.057 | 0.000 | n/a | n/a | 0.135 | 0.061 | 0.000 | 0.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8025e50af3e9b4b300000000000000d5 | 204.002 | 0.061 | n/a | 0.000 | 0.000 | 1.636 | 201.083 | 0.029 | 0.000 | 1.057 | 0.000 | n/a | n/a | 0.135 | 0.061 | 0.000 | 0.135 | gw-r/thread-70/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux per-thread CPU is sampled from /proc (10 ms ticks); per-request CPU attribution is not available. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
