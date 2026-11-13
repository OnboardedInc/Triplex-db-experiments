# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-53/peer.transact-await (includes order/network/storage)` (279.413 ms, trace `e75182ffd70cad920000000000000116`); `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (217.586 ms, trace `e75182ffd70cad920000000000000117`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (224.569 ms, trace `e75182ffd70cad9200000000000000b4`); `node-14/thread-0/client.persist-and-resolve` (187.679 ms, trace `e75182ffd70cad920000000000000147`); `node-14/thread-0/client.persist-and-resolve` (178.554 ms, trace `e75182ffd70cad920000000000000146`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p2-smoke-c`; source `d7c89645926a6a867c856f24dca2d4caba04c075`; subjects 1000; tracing summary.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. Native DEBUG transaction logging and its metrics callback are excluded from the summary default; full retains them.

Commit coverage: 84/84 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 84/84. Raw trace bytes: 1964825.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1278.642 | 177.795 | 233.328 | 36 |
| baseline | 0 | 1971.371 | 54.699 | 2.212 | 30 |
| L1 | 1 | 1972.904 | 172.256 | 6.018 | 44 |
| L4 | 4 | 1968.750 | 253.478 | 222.667 | 44 |
| L16 | 16 | 1910.606 | 212.677 | 244.297 | 44 |
| L64 | 16 | 1395.187 | 162.700 | 122.155 | 41 |
| L256 | 16 | 1893.947 | 161.574 | 168.757 | 58 |
| L1024 | 16 | 1900.720 | 248.415 | 304.733 | 16 |
| recovery | 16 | 1958.311 | 206.285 | 260.857 | 44 |
| p4mix | 1 | 1947.483 | 51.766 | 41.543 | 38 |
| p4h1 | 1 | 1802.992 | 31.300 | 30.832 | 30 |
| grow3 | 0 | 1028.965 | 89.316 | 0.198 | 30 |
| p4h3 | 1 | 1778.302 | 53.110 | 30.001 | 100 |
| grow10 | 0 | 1101.259 | 351.328 | 61.213 | 30 |
| p4h10 | 1 | 2357.541 | 58.926 | 41.262 | 72 |
| presweep | 16 | 1026.538 | 87.467 | 147.265 | 30 |
| sweep | 16 | 171.709 | 42.165 | 44.595 | 94 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| e75182ffd70cad920000000000000116 | driver.queue.scheduler-late | 0.990 | none | 0 / 32 |
| e75182ffd70cad920000000000000116 | driver.queue.scheduler-dispatch | 0.079 | none | 0 / 32 |

Observed active steps while trace e75182ffd70cad920000000000000116 waited: []

| e75182ffd70cad920000000000000117 | driver.queue.scheduler-dispatch | 0.124 | none | 1 / 32 |
| e75182ffd70cad920000000000000117 | driver.queue.scheduler-late | 0.003 | none | 1 / 32 |

Observed active steps while trace e75182ffd70cad920000000000000117 waited: []

| e75182ffd70cad9200000000000000b4 | driver.queue.scheduler-late | 1.055 | none | 0 / 32 |
| e75182ffd70cad9200000000000000b4 | driver.queue.scheduler-dispatch | 0.054 | none | 0 / 32 |

Observed active steps while trace e75182ffd70cad9200000000000000b4 waited: []

| e75182ffd70cad920000000000000147 | driver.queue.scheduler-dispatch | 0.009 | none | 9 / 32 |
| e75182ffd70cad920000000000000147 | driver.queue.scheduler-late | 0.000 | none | 9 / 32 |

Observed active steps while trace e75182ffd70cad920000000000000147 waited: []

| e75182ffd70cad920000000000000146 | driver.queue.scheduler-dispatch | 0.009 | none | 8 / 32 |
| e75182ffd70cad920000000000000146 | driver.queue.scheduler-late | 0.000 | none | 8 / 32 |

Observed active steps while trace e75182ffd70cad920000000000000146 waited: []

## P2 / warmup / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 48.706 | 1.752 | 0.000 | 2.401 | 14.423 | n/a | 0.000 | 0.641 | 5.752 | 4.741 | 0.142 | 0.000 | 0.548 | 22.387 | n/a | n/a | 0.107 | 15.064 | 0.309 | 0.107 |
| p99 | 87.655 | 3.499 | 0.000 | 3.598 | 35.431 | n/a | 0.000 | 0.687 | 12.912 | 11.714 | 0.647 | 0.000 | 1.413 | 23.768 | n/a | n/a | 0.295 | 37.093 | 0.423 | 0.295 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad920000000000000094 | 87.655 | 35.431 | 1.404 | 0.000 | 0.258 | 12.912 | 11.714 | 0.647 | 0.000 | 1.413 | 23.768 | n/a | n/a | 0.107 | 37.093 | 0.423 | 0.107 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad920000000000000092 | 48.706 | 14.423 | n/a | 0.000 | 0.641 | 5.714 | 4.741 | 0.142 | 0.000 | 0.364 | 22.387 | n/a | n/a | 0.295 | 15.064 | 0.309 | 0.295 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad920000000000000096 | 28.013 | 6.126 | n/a | 0.000 | 0.687 | 5.752 | 1.039 | 0.140 | 0.000 | 0.548 | 13.622 | n/a | n/a | 0.099 | 6.812 | 0.243 | 0.099 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.013 | 1.752 | 0.000 | 2.401 | 6.126 | n/a | 0.000 | 0.687 | 5.752 | 1.039 | 0.140 | 0.000 | 0.548 | 13.622 | n/a | n/a | 0.099 | 6.812 | 0.243 | 0.099 |
| p99 | 28.013 | 1.752 | 0.000 | 2.401 | 6.126 | n/a | 0.000 | 0.687 | 5.752 | 1.039 | 0.140 | 0.000 | 0.548 | 13.622 | n/a | n/a | 0.099 | 6.812 | 0.243 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad920000000000000096 | 28.013 | 6.126 | n/a | 0.000 | 0.687 | 5.752 | 1.039 | 0.140 | 0.000 | 0.548 | 13.622 | n/a | n/a | 0.099 | 6.812 | 0.243 | 0.099 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 42.886 | 0.508 | 0.000 | 0.996 | 5.366 | 1.619 | 0.000 | 0.186 | 7.552 | 0.699 | 0.000 | 0.000 | 0.000 | 17.969 | n/a | n/a | 0.050 | 5.922 | 0.196 | 0.050 |
| p99 | 106.776 | 4.976 | 0.326 | 8.110 | 17.002 | n/a | 0.728 | 1.210 | 11.683 | 19.281 | 0.099 | 0.000 | 4.208 | 64.532 | n/a | n/a | 0.134 | 18.092 | 0.341 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000c3 | 106.776 | 6.105 | 0.279 | 0.728 | 0.047 | 11.487 | 19.281 | 0.079 | 0.000 | 4.208 | 64.532 | n/a | n/a | 0.029 | 7.160 | 0.067 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000fa | 57.943 | 13.183 | n/a | 0.000 | 0.186 | 5.880 | 6.165 | 0.099 | 0.000 | 2.539 | 29.757 | n/a | n/a | 0.134 | 13.369 | 0.231 | 0.134 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000e5 | 53.910 | 5.366 | 0.214 | 0.506 | 0.084 | 11.541 | 9.506 | 0.000 | 0.000 | 0.000 | 26.651 | n/a | n/a | 0.042 | 6.171 | 0.114 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000fc | 53.048 | 17.002 | 0.558 | 0.447 | 0.085 | 11.683 | 2.164 | 0.000 | 0.000 | 0.000 | 21.020 | n/a | n/a | 0.090 | 18.092 | 0.341 | 0.090 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad920000000000000128 | 49.148 | 5.264 | 0.232 | 0.000 | 0.320 | 9.323 | 0.611 | 0.000 | 0.000 | 0.000 | 33.330 | n/a | n/a | 0.068 | 5.816 | 0.118 | 0.068 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad92000000000000012a | 42.967 | 5.635 | 0.201 | 0.000 | 0.087 | 11.515 | 8.212 | 0.000 | 0.000 | 0.000 | 17.267 | n/a | n/a | 0.051 | 5.922 | 0.138 | 0.051 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000e3 | 42.886 | 5.884 | n/a | 0.000 | 0.508 | 1.555 | 7.549 | 0.070 | 0.000 | 0.712 | 26.559 | n/a | n/a | 0.050 | 6.391 | 0.149 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad920000000000000098 | 30.519 | 5.524 | 1.619 | 0.000 | 0.075 | 8.589 | 0.559 | 0.000 | 0.000 | 0.640 | 13.447 | n/a | n/a | 0.066 | 7.218 | 0.237 | 0.066 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad920000000000000100 | 30.298 | 3.586 | n/a | 0.000 | 1.161 | 5.641 | 0.699 | 0.000 | 0.000 | 1.202 | 17.969 | n/a | n/a | 0.040 | 4.747 | 0.157 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000fe | 26.939 | 5.233 | n/a | 0.000 | 0.330 | 5.663 | 0.541 | 0.000 | 0.000 | 0.000 | 15.125 | n/a | n/a | 0.049 | 5.563 | 0.206 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad920000000000000103 | 26.289 | 4.382 | 0.338 | 0.308 | 0.133 | 7.552 | 0.289 | 0.000 | 0.000 | 0.000 | 13.209 | n/a | n/a | 0.078 | 5.160 | 0.196 | 0.078 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000f8 | 19.891 | 3.953 | n/a | 0.000 | 1.210 | 5.672 | 0.389 | 0.000 | 0.000 | 0.000 | 8.634 | n/a | n/a | 0.034 | 5.163 | 0.260 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad920000000000000126 | 12.325 | 3.374 | n/a | 0.000 | 0.643 | 5.699 | 0.500 | 0.000 | 0.000 | 0.000 | 2.069 | n/a | n/a | 0.041 | 4.016 | 0.326 | 0.041 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / baseline / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.848 | 0.466 | 0.000 | 0.775 | 6.967 | 0.445 | 0.000 | 0.262 | 8.892 | 0.715 | 0.000 | 0.000 | 0.000 | 7.649 | n/a | n/a | 0.083 | 7.685 | 0.257 | 0.083 |
| p99 | 57.229 | 1.660 | 0.000 | 3.979 | 10.118 | n/a | 0.000 | 0.719 | 12.211 | 7.612 | 0.222 | 0.000 | 1.180 | 24.700 | n/a | n/a | 0.477 | 10.826 | 0.355 | 0.477 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad92000000000000009e | 57.229 | 10.118 | 0.445 | 0.000 | 0.262 | 12.211 | 7.612 | 0.222 | 0.000 | 1.180 | 24.700 | n/a | n/a | 0.477 | 10.826 | 0.189 | 0.477 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad92000000000000009c | 22.848 | 5.576 | 0.205 | 0.000 | 0.089 | 8.892 | 0.715 | 0.000 | 0.000 | 0.000 | 7.312 | n/a | n/a | 0.060 | 5.870 | 0.257 | 0.060 | node-14/thread-8/socket.wait-first-byte | none observed |
| e75182ffd70cad92000000000000009a | 21.676 | 6.967 | n/a | 0.000 | 0.719 | 5.807 | 0.452 | 0.000 | 0.000 | 0.000 | 7.649 | n/a | n/a | 0.083 | 7.685 | 0.355 | 0.083 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.676 | 1.660 | 0.000 | 3.979 | 6.967 | n/a | 0.000 | 0.719 | 5.807 | 0.452 | 0.000 | 0.000 | 0.000 | 7.649 | n/a | n/a | 0.083 | 7.685 | 0.355 | 0.083 |
| p99 | 21.676 | 1.660 | 0.000 | 3.979 | 6.967 | n/a | 0.000 | 0.719 | 5.807 | 0.452 | 0.000 | 0.000 | 0.000 | 7.649 | n/a | n/a | 0.083 | 7.685 | 0.355 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad92000000000000009a | 21.676 | 6.967 | n/a | 0.000 | 0.719 | 5.807 | 0.452 | 0.000 | 0.000 | 0.000 | 7.649 | n/a | n/a | 0.083 | 7.685 | 0.355 | 0.083 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.378 | 0.583 | 0.000 | 0.773 | 6.811 | 0.250 | 0.000 | 0.192 | 5.680 | 1.237 | 0.000 | 0.000 | 0.000 | 13.502 | n/a | n/a | 0.113 | 7.253 | 0.228 | 0.113 |
| p99 | 44.802 | 3.186 | 1.984 | 5.876 | 9.928 | n/a | 0.000 | 0.757 | 11.277 | 4.989 | 0.014 | 0.000 | 4.730 | 22.713 | n/a | n/a | 0.226 | 10.304 | 0.264 | 0.226 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad92000000000000009f | 44.802 | 9.459 | n/a | 0.000 | 0.757 | 5.680 | 1.237 | 0.000 | 0.000 | 4.730 | 22.713 | n/a | n/a | 0.226 | 10.216 | 0.228 | 0.226 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000a2 | 39.032 | 9.928 | n/a | 0.000 | 0.375 | 5.551 | 4.989 | 0.000 | 0.000 | 4.494 | 13.502 | n/a | n/a | 0.191 | 10.304 | 0.264 | 0.191 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000a7 | 32.378 | 6.811 | 0.250 | 0.000 | 0.192 | 8.494 | 0.967 | 0.000 | 0.000 | 0.000 | 15.552 | n/a | n/a | 0.113 | 7.253 | 0.224 | 0.113 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000a4 | 22.752 | 5.255 | 0.223 | 0.000 | 0.092 | 11.277 | 1.455 | 0.014 | 0.000 | 0.000 | 4.378 | n/a | n/a | 0.057 | 5.570 | 0.245 | 0.057 | node-14/thread-8/socket.wait-first-byte | none observed |

## P2 / L1 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 44.802 | 0.848 | 0.000 | 2.776 | 9.459 | n/a | 0.000 | 0.757 | 5.680 | 1.237 | 0.000 | 0.000 | 4.730 | 22.713 | n/a | n/a | 0.226 | 10.216 | 0.228 | 0.226 |
| p99 | 44.802 | 0.848 | 0.000 | 2.776 | 9.459 | n/a | 0.000 | 0.757 | 5.680 | 1.237 | 0.000 | 0.000 | 4.730 | 22.713 | n/a | n/a | 0.226 | 10.216 | 0.228 | 0.226 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad92000000000000009f | 44.802 | 9.459 | n/a | 0.000 | 0.757 | 5.680 | 1.237 | 0.000 | 0.000 | 4.730 | 22.713 | n/a | n/a | 0.226 | 10.216 | 0.228 | 0.226 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.517 | 0.418 | 0.000 | 1.939 | 5.582 | 1.713 | 0.000 | 0.080 | 5.735 | 0.420 | 0.000 | 0.000 | 0.000 | 12.342 | n/a | n/a | 0.044 | 7.375 | 0.173 | 0.044 |
| p99 | 95.586 | 2.891 | 2.389 | 4.128 | 15.545 | n/a | 0.542 | 0.612 | 11.173 | 0.709 | 0.000 | 0.000 | 0.000 | 68.960 | n/a | n/a | 0.057 | 16.502 | 0.432 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000b0 | 95.586 | 15.545 | 0.338 | 0.542 | 0.078 | 9.563 | 0.521 | 0.000 | 0.000 | 0.000 | 68.960 | n/a | n/a | 0.040 | 16.502 | 0.173 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.worker-message 0.601ms |
| e75182ffd70cad9200000000000000ad | 57.358 | 5.582 | 1.713 | 0.000 | 0.080 | 11.173 | 0.420 | 0.000 | 0.000 | 0.000 | 38.347 | n/a | n/a | 0.044 | 7.375 | 0.129 | 0.044 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000ab | 23.517 | 4.703 | n/a | 0.000 | 0.250 | 5.465 | 0.709 | 0.000 | 0.000 | 0.000 | 12.342 | n/a | n/a | 0.048 | 4.953 | 0.211 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000a8 | 20.567 | 8.269 | n/a | 0.000 | 0.612 | 5.735 | 0.420 | 0.000 | 0.000 | 0.000 | 5.475 | n/a | n/a | 0.057 | 8.880 | 0.432 | 0.057 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 61.456 | 0.407 | 0.000 | 0.737 | 5.849 | 0.304 | 0.000 | 0.061 | 5.713 | 1.016 | 0.000 | 0.000 | 0.287 | 20.193 | n/a | n/a | 0.056 | 6.555 | 0.114 | 0.056 |
| p99 | 281.364 | 1.627 | 0.000 | 2.774 | 13.100 | n/a | 0.491 | 1.109 | 12.518 | 45.274 | 0.082 | 0.000 | 0.826 | 224.569 | n/a | n/a | 0.133 | 13.743 | 0.224 | 0.133 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000b4 | 281.364 | 4.274 | n/a | 0.000 | 1.109 | 5.713 | 45.274 | 0.082 | 0.000 | 0.287 | 224.569 | n/a | n/a | 0.056 | 5.383 | 0.019 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000b6 | 65.847 | 6.813 | n/a | 0.000 | 0.697 | 5.671 | 1.016 | 0.000 | 0.000 | 0.826 | 50.728 | n/a | n/a | 0.096 | 7.510 | 0.114 | 0.096 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.341ms |
| e75182ffd70cad9200000000000000b9 | 61.456 | 13.100 | 0.304 | 0.280 | 0.059 | 12.518 | 14.494 | 0.077 | 0.000 | 0.299 | 20.193 | n/a | n/a | 0.133 | 13.743 | 0.224 | 0.133 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.worker-message 1.050ms |
| e75182ffd70cad9200000000000000b2 | 30.356 | 5.849 | 0.155 | 0.491 | 0.061 | 7.899 | 0.427 | 0.000 | 0.000 | 0.000 | 15.437 | n/a | n/a | 0.038 | 6.555 | 0.216 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 65.847 | 0.946 | 0.000 | 2.037 | 4.274 | n/a | 0.000 | 0.697 | 5.671 | 1.016 | 0.000 | 0.000 | 0.287 | 50.728 | n/a | n/a | 0.056 | 5.383 | 0.019 | 0.056 |
| p99 | 281.364 | 1.627 | 0.000 | 2.774 | 6.813 | n/a | 0.000 | 1.109 | 5.713 | 45.274 | 0.082 | 0.000 | 0.826 | 224.569 | n/a | n/a | 0.096 | 7.510 | 0.114 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000b4 | 281.364 | 4.274 | n/a | 0.000 | 1.109 | 5.713 | 45.274 | 0.082 | 0.000 | 0.287 | 224.569 | n/a | n/a | 0.056 | 5.383 | 0.019 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000b6 | 65.847 | 6.813 | n/a | 0.000 | 0.697 | 5.671 | 1.016 | 0.000 | 0.000 | 0.826 | 50.728 | n/a | n/a | 0.096 | 7.510 | 0.114 | 0.096 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.341ms |

## P2 / L64 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 66.041 | 0.959 | 0.000 | 1.684 | 5.521 | n/a | 0.000 | 0.272 | 5.734 | 7.601 | 0.134 | 0.000 | 1.211 | 41.721 | n/a | n/a | 0.042 | 6.286 | 0.131 | 0.042 |
| p99 | 118.430 | 4.962 | 0.000 | 4.214 | 8.392 | n/a | 0.382 | 0.537 | 11.407 | 30.420 | 0.198 | 0.000 | 2.128 | 68.880 | n/a | n/a | 0.059 | 8.664 | 0.198 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000be | 118.430 | 5.521 | 0.341 | 0.382 | 0.042 | 11.407 | 30.420 | 0.198 | 0.000 | 1.211 | 68.880 | n/a | n/a | 0.030 | 6.286 | 0.053 | 0.030 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.worker-message 0.688ms |
| e75182ffd70cad9200000000000000bb | 66.041 | 8.392 | n/a | 0.000 | 0.272 | 5.734 | 7.601 | 0.134 | 0.000 | 2.128 | 41.721 | n/a | n/a | 0.059 | 8.664 | 0.131 | 0.059 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000c1 | 24.691 | 4.347 | n/a | 0.000 | 0.537 | 5.622 | 0.508 | 0.000 | 0.000 | 0.000 | 13.635 | n/a | n/a | 0.042 | 4.884 | 0.198 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.470 | n/a | n/a | n/a | 9.464 | 1.495 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 12.448 | 0.998 | 0.019 |
| p99 | 186.841 | n/a | n/a | n/a | 51.071 | 32.180 | 0.655 | 0.000 | 5.685 | 110.247 | 0.000 | 11.266 | 0.000 | 0.000 | n/a | n/a | 27.149 | 70.891 | 1.000 | 27.149 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000bc | 186.841 | 51.071 | 19.820 | 0.000 | 0.000 | 5.685 | 110.247 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 70.891 | 0.379 | 0.018 | gw-w/thread-46/gateway.admitted-work | driver.worker-message 0.625ms |
| e75182ffd70cad920000000000000118 | 137.957 | 24.646 | 15.927 | 0.000 | 0.000 | 5.591 | 80.513 | 0.000 | 11.266 | 0.000 | 0.000 | n/a | n/a | 0.014 | 40.573 | 0.294 | 0.014 | gw-w/thread-48/gateway.admitted-work | client.encode 2.940ms |
| e75182ffd70cad920000000000000101 | 54.057 | 18.253 | 14.022 | 0.000 | 0.000 | 0.573 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 21.209 | 32.275 | 0.597 | 21.209 | node-14/thread-0/socket.wait-first-byte | none observed |
| e75182ffd70cad9200000000000000f0 | 42.471 | 13.788 | 0.969 | 0.000 | 0.000 | 0.565 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 27.149 | 14.757 | 0.347 | 27.149 | node-14/thread-0/socket.wait-first-byte | none observed |
| e75182ffd70cad9200000000000000f9 | 40.511 | 8.315 | 32.180 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 40.496 | 1.000 | 0.016 | node-14/thread-0/rpc.replica.observe | none observed |
| e75182ffd70cad920000000000000093 | 33.189 | 30.614 | 1.866 | 0.655 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.055 | 33.135 | 0.998 | 0.055 | node-14/thread-2/replica.pull-at | none observed |
| e75182ffd70cad9200000000000000fb | 18.836 | 2.555 | 16.231 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.050 | 18.786 | 0.997 | 0.050 | node-14/thread-0/rpc.replica.observe | none observed |
| e75182ffd70cad9200000000000000b8 | 17.273 | 14.702 | 2.524 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.046 | 17.227 | 0.997 | 0.046 | node-14/thread-2/replica.pull-at | none observed |
| e75182ffd70cad9200000000000000a9 | 13.644 | 12.263 | 1.367 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 13.630 | 0.999 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| e75182ffd70cad920000000000000108 | 12.657 | 12.528 | 0.116 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 12.644 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| e75182ffd70cad920000000000000137 | 12.470 | 12.327 | 0.121 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 12.448 | 0.998 | 0.022 | node-14/thread-2/replica.pull-at | none observed |
| e75182ffd70cad9200000000000000da | 10.597 | 0.339 | 10.245 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 10.584 | 0.999 | 0.013 | node-14/thread-0/rpc.replica.observe | none observed |
| e75182ffd70cad9200000000000000a0 | 10.498 | 0.723 | 9.741 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 10.464 | 0.997 | 0.034 | node-14/thread-0/rpc.replica.observe | none observed |
| e75182ffd70cad9200000000000000b7 | 9.924 | 9.381 | 0.519 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 9.900 | 0.998 | 0.024 | node-14/thread-2/replica.pull-at | none observed |
| e75182ffd70cad9200000000000000cb | 9.907 | 8.393 | 1.495 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 9.888 | 0.998 | 0.019 | node-14/thread-2/replica.pull-at | none observed |
| e75182ffd70cad920000000000000112 | 9.612 | 9.531 | 0.068 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 9.599 | 0.999 | 0.012 | node-14/thread-2/replica.pull-at | none observed |
| e75182ffd70cad920000000000000130 | 9.600 | 9.464 | 0.112 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 9.576 | 0.998 | 0.024 | node-14/thread-2/replica.pull-at | none observed |
| e75182ffd70cad9200000000000000ac | 9.599 | 9.451 | 0.103 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.045 | 9.553 | 0.995 | 0.045 | node-14/thread-2/replica.pull-at | none observed |
| e75182ffd70cad9200000000000000e4 | 9.142 | 1.525 | 7.599 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 9.123 | 0.998 | 0.019 | node-14/thread-0/rpc.replica.observe | none observed |
| e75182ffd70cad92000000000000009b | 8.835 | 8.640 | 0.181 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 8.821 | 0.998 | 0.014 | node-14/thread-2/replica.pull-at | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.691 | 0.959 | 0.000 | 1.684 | 4.347 | n/a | 0.000 | 0.537 | 5.622 | 0.508 | 0.000 | 0.000 | 0.000 | 13.635 | n/a | n/a | 0.042 | 4.884 | 0.198 | 0.042 |
| p99 | 24.691 | 0.959 | 0.000 | 1.684 | 4.347 | n/a | 0.000 | 0.537 | 5.622 | 0.508 | 0.000 | 0.000 | 0.000 | 13.635 | n/a | n/a | 0.042 | 4.884 | 0.198 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000c1 | 24.691 | 4.347 | n/a | 0.000 | 0.537 | 5.622 | 0.508 | 0.000 | 0.000 | 0.000 | 13.635 | n/a | n/a | 0.042 | 4.884 | 0.198 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 89.212 | 1.236 | 0.000 | 1.592 | 5.861 | n/a | 0.000 | 0.195 | 5.803 | 5.267 | 0.000 | 0.000 | 0.227 | 41.807 | n/a | n/a | 0.042 | 7.250 | 0.072 | 0.042 |
| p99 | 144.657 | 2.516 | 0.000 | 2.944 | 8.087 | n/a | 1.129 | 0.544 | 11.482 | 18.802 | 0.117 | 20.336 | 0.821 | 129.926 | n/a | n/a | 0.144 | 8.423 | 0.184 | 0.144 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000ca | 144.657 | 8.087 | n/a | 0.000 | 0.336 | 5.784 | 0.448 | 0.000 | 0.000 | 0.000 | 129.926 | n/a | n/a | 0.076 | 8.423 | 0.058 | 0.076 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000ce | 100.090 | 5.861 | 0.247 | 1.129 | 0.014 | 11.394 | 18.802 | 0.117 | 20.336 | 0.353 | 41.807 | n/a | n/a | 0.030 | 7.250 | 0.072 | 0.030 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000cc | 89.212 | 3.553 | n/a | 0.000 | 0.544 | 5.677 | 5.267 | 0.058 | 0.000 | 0.227 | 73.848 | n/a | n/a | 0.038 | 4.097 | 0.046 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000c7 | 40.835 | 6.691 | 0.283 | 0.480 | 0.067 | 11.482 | 8.951 | 0.000 | 0.000 | 0.000 | 12.840 | n/a | n/a | 0.042 | 7.521 | 0.184 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000c5 | 35.562 | 4.011 | n/a | 0.000 | 0.195 | 5.803 | 0.726 | 0.000 | 0.000 | 0.821 | 23.864 | n/a | n/a | 0.144 | 4.206 | 0.118 | 0.144 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 89.212 | 1.533 | 0.000 | 2.018 | 4.011 | n/a | 0.000 | 0.336 | 5.784 | 0.726 | 0.000 | 0.000 | 0.227 | 73.848 | n/a | n/a | 0.076 | 4.206 | 0.058 | 0.076 |
| p99 | 144.657 | 2.516 | 0.000 | 2.944 | 8.087 | n/a | 0.000 | 0.544 | 5.803 | 5.267 | 0.058 | 0.000 | 0.821 | 129.926 | n/a | n/a | 0.144 | 8.423 | 0.118 | 0.144 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000ca | 144.657 | 8.087 | n/a | 0.000 | 0.336 | 5.784 | 0.448 | 0.000 | 0.000 | 0.000 | 129.926 | n/a | n/a | 0.076 | 8.423 | 0.058 | 0.076 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000cc | 89.212 | 3.553 | n/a | 0.000 | 0.544 | 5.677 | 5.267 | 0.058 | 0.000 | 0.227 | 73.848 | n/a | n/a | 0.038 | 4.097 | 0.046 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000c5 | 35.562 | 4.011 | n/a | 0.000 | 0.195 | 5.803 | 0.726 | 0.000 | 0.000 | 0.821 | 23.864 | n/a | n/a | 0.144 | 4.206 | 0.118 | 0.144 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 42.082 | 0.319 | 0.000 | 0.495 | 5.081 | 0.340 | 0.274 | 0.061 | 11.318 | 7.988 | 0.000 | 0.000 | 0.000 | 12.185 | n/a | n/a | 0.036 | 5.762 | 0.137 | 0.036 |
| p99 | 49.593 | 1.172 | 0.011 | 1.070 | 6.298 | 3.919 | 0.279 | 0.065 | 12.174 | 14.621 | 0.000 | 0.000 | 0.000 | 16.979 | n/a | n/a | 0.057 | 10.556 | 0.213 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000d0 | 49.593 | 6.298 | 3.919 | 0.274 | 0.065 | 12.174 | 14.621 | 0.000 | 0.000 | 0.000 | 12.185 | n/a | n/a | 0.057 | 10.556 | 0.213 | 0.057 | gw-w/thread-46/gateway.admitted-work | driver.worker-message 2.122ms |
| e75182ffd70cad9200000000000000d3 | 42.082 | 5.081 | 0.340 | 0.279 | 0.061 | 11.318 | 7.988 | 0.000 | 0.000 | 0.000 | 16.979 | n/a | n/a | 0.036 | 5.762 | 0.137 | 0.036 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.636 | 0.481 | 0.000 | 0.739 | 4.752 | 0.294 | 0.000 | 0.077 | 5.650 | 4.485 | 0.007 | 0.000 | 0.000 | 11.251 | n/a | n/a | 0.048 | 5.376 | 0.089 | 0.048 |
| p99 | 106.196 | 1.056 | 0.000 | 3.095 | 6.017 | n/a | 0.276 | 0.663 | 11.360 | 26.089 | 0.162 | 0.000 | 0.941 | 66.126 | n/a | n/a | 0.056 | 6.665 | 0.236 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000d5 | 106.196 | 6.017 | 0.294 | 0.276 | 0.077 | 11.360 | 20.898 | 0.162 | 0.000 | 0.941 | 66.126 | n/a | n/a | 0.045 | 6.665 | 0.063 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000db | 53.528 | 4.432 | 0.286 | 0.000 | 0.071 | 11.342 | 26.089 | 0.007 | 0.000 | 0.000 | 11.251 | n/a | n/a | 0.051 | 4.788 | 0.089 | 0.051 | gw-w/thread-46/gateway.admitted-work | none observed |
| e75182ffd70cad9200000000000000d9 | 39.636 | 4.937 | n/a | 0.000 | 0.663 | 5.650 | 4.485 | 0.053 | 0.000 | 0.776 | 23.024 | n/a | n/a | 0.048 | 5.600 | 0.141 | 0.048 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000d7 | 22.748 | 4.752 | n/a | 0.000 | 0.624 | 5.637 | 0.460 | 0.000 | 0.000 | 0.000 | 11.219 | n/a | n/a | 0.056 | 5.376 | 0.236 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.636 | 0.789 | 0.000 | 3.095 | 4.937 | n/a | 0.000 | 0.663 | 5.650 | 4.485 | 0.053 | 0.000 | 0.776 | 23.024 | n/a | n/a | 0.048 | 5.600 | 0.141 | 0.048 |
| p99 | 39.636 | 0.789 | 0.000 | 3.095 | 4.937 | n/a | 0.000 | 0.663 | 5.650 | 4.485 | 0.053 | 0.000 | 0.776 | 23.024 | n/a | n/a | 0.048 | 5.600 | 0.141 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000d9 | 39.636 | 4.937 | n/a | 0.000 | 0.663 | 5.650 | 4.485 | 0.053 | 0.000 | 0.776 | 23.024 | n/a | n/a | 0.048 | 5.600 | 0.141 | 0.048 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.614 | 0.529 | 0.000 | 0.445 | 6.923 | 0.590 | 0.000 | 0.124 | 11.268 | 4.700 | 0.000 | 0.000 | 0.000 | 9.135 | n/a | n/a | 0.055 | 7.637 | 0.215 | 0.055 |
| p99 | 47.968 | 0.733 | 0.000 | 1.024 | 8.136 | n/a | 0.000 | 0.253 | 15.015 | 9.369 | 0.052 | 0.000 | 0.000 | 18.782 | n/a | n/a | 0.074 | 8.475 | 0.332 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000de | 47.968 | 8.136 | 0.268 | 0.000 | 0.071 | 11.268 | 9.369 | 0.000 | 0.000 | 0.000 | 18.782 | n/a | n/a | 0.074 | 8.475 | 0.177 | 0.074 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000dd | 32.614 | 6.761 | n/a | 0.000 | 0.253 | 15.015 | 4.700 | 0.052 | 0.000 | 0.000 | 5.783 | n/a | n/a | 0.048 | 7.015 | 0.215 | 0.048 | node-14/thread-0/socket.wait-first-byte | none observed |
| e75182ffd70cad9200000000000000e0 | 23.008 | 6.923 | 0.590 | 0.000 | 0.124 | 5.744 | 0.438 | 0.000 | 0.000 | 0.000 | 9.135 | n/a | n/a | 0.055 | 7.637 | 0.332 | 0.055 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.614 | 0.000 | 0.000 | 0.265 | 6.761 | n/a | 0.000 | 0.253 | 15.015 | 4.700 | 0.052 | 0.000 | 0.000 | 5.783 | n/a | n/a | 0.048 | 7.015 | 0.215 | 0.048 |
| p99 | 32.614 | 0.000 | 0.000 | 0.265 | 6.761 | n/a | 0.000 | 0.253 | 15.015 | 4.700 | 0.052 | 0.000 | 0.000 | 5.783 | n/a | n/a | 0.048 | 7.015 | 0.215 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000dd | 32.614 | 6.761 | n/a | 0.000 | 0.253 | 15.015 | 4.700 | 0.052 | 0.000 | 0.000 | 5.783 | n/a | n/a | 0.048 | 7.015 | 0.215 | 0.048 | node-14/thread-0/socket.wait-first-byte | none observed |

## P4 / p4h1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.565 | 0.077 | 0.000 | 0.370 | 5.084 | 0.265 | 0.304 | 0.071 | 5.965 | 2.921 | 0.000 | 0.000 | 0.000 | 13.653 | n/a | n/a | 0.046 | 6.218 | 0.240 | 0.046 |
| p99 | 72.489 | 1.434 | 0.000 | 2.466 | 5.654 | n/a | 0.399 | 1.134 | 11.304 | 6.003 | 0.111 | 0.000 | 0.256 | 49.910 | n/a | n/a | 0.047 | 6.364 | 0.263 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000e7 | 72.489 | 4.218 | 0.265 | 0.304 | 0.071 | 11.304 | 6.003 | 0.111 | 0.000 | 0.256 | 49.910 | n/a | n/a | 0.047 | 4.858 | 0.067 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000e9 | 26.565 | 5.654 | 0.242 | 0.399 | 0.068 | 5.965 | 0.546 | 0.000 | 0.000 | 0.000 | 13.653 | n/a | n/a | 0.037 | 6.364 | 0.240 | 0.037 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000eb | 23.613 | 5.084 | n/a | 0.000 | 1.134 | 5.678 | 2.921 | 0.000 | 0.000 | 0.000 | 8.749 | n/a | n/a | 0.046 | 6.218 | 0.263 | 0.046 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.429 | 0.000 | 0.000 | 0.358 | 4.426 | 6.665 | 0.271 | 0.131 | 7.427 | 2.010 | 0.000 | 0.000 | 0.000 | 14.002 | n/a | n/a | 0.039 | 5.197 | 0.156 | 0.039 |
| p99 | 61.525 | 0.890 | 0.000 | 1.936 | 4.565 | n/a | 0.338 | 0.897 | 32.918 | 3.164 | 7.318 | 0.000 | 0.038 | 16.730 | n/a | n/a | 0.042 | 11.444 | 0.384 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000ee | 61.525 | 4.565 | 0.163 | 0.338 | 0.131 | 32.918 | 2.010 | 7.318 | 0.000 | 0.038 | 14.002 | n/a | n/a | 0.042 | 5.197 | 0.084 | 0.042 | node-14/thread-8/socket.wait-first-byte | none observed |
| e75182ffd70cad9200000000000000ef | 30.429 | 3.861 | n/a | 0.000 | 0.897 | 5.738 | 3.164 | 0.000 | 0.000 | 0.000 | 16.730 | n/a | n/a | 0.039 | 4.758 | 0.156 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad9200000000000000f4 | 29.772 | 4.426 | 6.665 | 0.271 | 0.081 | 7.427 | 0.358 | 0.000 | 0.000 | 0.000 | 10.504 | n/a | n/a | 0.039 | 11.444 | 0.384 | 0.039 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.429 | 0.890 | 0.000 | 1.936 | 3.861 | n/a | 0.000 | 0.897 | 5.738 | 3.164 | 0.000 | 0.000 | 0.000 | 16.730 | n/a | n/a | 0.039 | 4.758 | 0.156 | 0.039 |
| p99 | 30.429 | 0.890 | 0.000 | 1.936 | 3.861 | n/a | 0.000 | 0.897 | 5.738 | 3.164 | 0.000 | 0.000 | 0.000 | 16.730 | n/a | n/a | 0.039 | 4.758 | 0.156 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000ef | 30.429 | 3.861 | n/a | 0.000 | 0.897 | 5.738 | 3.164 | 0.000 | 0.000 | 0.000 | 16.730 | n/a | n/a | 0.039 | 4.758 | 0.156 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.325 | 0.933 | 0.000 | 1.727 | 3.374 | n/a | 0.000 | 0.330 | 5.663 | 0.500 | 0.000 | 0.000 | 0.000 | 2.069 | n/a | n/a | 0.041 | 4.016 | 0.206 | 0.041 |
| p99 | 26.939 | 1.640 | 0.326 | 3.239 | 5.233 | n/a | 0.000 | 0.643 | 5.699 | 0.541 | 0.000 | 0.000 | 0.000 | 15.125 | n/a | n/a | 0.049 | 5.563 | 0.326 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad9200000000000000fe | 26.939 | 5.233 | n/a | 0.000 | 0.330 | 5.663 | 0.541 | 0.000 | 0.000 | 0.000 | 15.125 | n/a | n/a | 0.049 | 5.563 | 0.206 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad920000000000000126 | 12.325 | 3.374 | n/a | 0.000 | 0.643 | 5.699 | 0.500 | 0.000 | 0.000 | 0.000 | 2.069 | n/a | n/a | 0.041 | 4.016 | 0.326 | 0.041 | node-14/thread-0/socket.wait-first-byte | none observed |

## P4 / p4h3 / commit (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.188 | 0.686 | 0.000 | 1.840 | 3.712 | n/a | 0.000 | 0.331 | 5.742 | 0.474 | 0.000 | 0.000 | 0.000 | 10.553 | n/a | n/a | 0.042 | 4.445 | 0.167 | 0.042 |
| p99 | 116.287 | 2.371 | 0.000 | 2.489 | 4.787 | n/a | 0.406 | 1.329 | 11.274 | 16.848 | 0.149 | 15.300 | 4.836 | 68.370 | n/a | n/a | 0.093 | 5.342 | 0.250 | 0.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad920000000000000104 | 116.287 | 4.787 | n/a | 0.000 | 0.555 | 5.804 | 16.430 | 0.149 | 15.300 | 4.836 | 68.370 | n/a | n/a | 0.055 | 5.342 | 0.046 | 0.055 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad92000000000000010f | 46.486 | 4.400 | 0.259 | 0.406 | 0.111 | 11.274 | 16.848 | 0.136 | 0.000 | 0.448 | 12.509 | n/a | n/a | 0.093 | 5.177 | 0.111 | 0.093 | gw-w/thread-48/gateway.admitted-work | none observed |
| e75182ffd70cad920000000000000113 | 31.278 | 3.514 | 0.239 | 0.257 | 0.068 | 11.253 | 11.425 | 0.000 | 0.000 | 0.000 | 4.480 | n/a | n/a | 0.042 | 4.077 | 0.130 | 0.042 | node-14/thread-8/socket.wait-first-byte | none observed |
| e75182ffd70cad92000000000000010b | 29.820 | 3.654 | n/a | 0.000 | 1.329 | 5.731 | 0.995 | 0.000 | 0.000 | 0.000 | 18.071 | n/a | n/a | 0.039 | 4.984 | 0.167 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 0.201ms |
| e75182ffd70cad920000000000000111 | 22.188 | 4.138 | n/a | 0.000 | 0.785 | 5.656 | 0.474 | 0.000 | 0.000 | 0.000 | 11.080 | n/a | n/a | 0.055 | 4.923 | 0.222 | 0.055 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad920000000000000107 | 21.184 | 3.899 | n/a | 0.000 | 0.546 | 5.674 | 0.473 | 0.000 | 0.000 | 0.000 | 10.553 | n/a | n/a | 0.038 | 4.445 | 0.210 | 0.038 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad920000000000000109 | 18.538 | 3.712 | n/a | 0.000 | 0.331 | 5.742 | 0.375 | 0.000 | 0.000 | 0.000 | 8.324 | n/a | n/a | 0.053 | 4.043 | 0.218 | 0.053 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad92000000000000010d | 12.603 | 2.965 | n/a | 0.000 | 0.191 | 5.757 | 0.423 | 0.000 | 0.000 | 0.000 | 3.227 | n/a | n/a | 0.041 | 3.156 | 0.250 | 0.041 | node-14/thread-0/socket.wait-first-byte | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.603 | 0.686 | 0.000 | 1.623 | 2.965 | n/a | 0.000 | 0.191 | 5.742 | 0.375 | 0.000 | 0.000 | 0.000 | 3.227 | n/a | n/a | 0.041 | 3.156 | 0.218 | 0.041 |
| p99 | 18.538 | 0.838 | 0.000 | 1.919 | 3.712 | n/a | 0.000 | 0.331 | 5.757 | 0.423 | 0.000 | 0.000 | 0.000 | 8.324 | n/a | n/a | 0.053 | 4.043 | 0.250 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad920000000000000109 | 18.538 | 3.712 | n/a | 0.000 | 0.331 | 5.742 | 0.375 | 0.000 | 0.000 | 0.000 | 8.324 | n/a | n/a | 0.053 | 4.043 | 0.218 | 0.053 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad92000000000000010d | 12.603 | 2.965 | n/a | 0.000 | 0.191 | 5.757 | 0.423 | 0.000 | 0.000 | 0.000 | 3.227 | n/a | n/a | 0.041 | 3.156 | 0.250 | 0.041 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / grow10 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 283.720 | 0.990 | 0.000 | 0.346 | 4.380 | 3.473 | 0.000 | 0.127 | 21.511 | 13.382 | 0.000 | 0.000 | 0.000 | 225.872 | n/a | n/a | 0.056 | 5.449 | 0.062 | 0.056 |
| p99 | 316.080 | 1.089 | 0.000 | 1.833 | 13.400 | n/a | 0.486 | 1.069 | 30.333 | 17.401 | 0.084 | 7.961 | 1.310 | 279.413 | n/a | n/a | 0.069 | 17.486 | 0.082 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad920000000000000116 | 316.080 | 4.380 | n/a | 0.000 | 1.069 | 30.333 | 0.832 | 0.000 | 0.000 | 0.000 | 279.413 | n/a | n/a | 0.052 | 5.449 | 0.017 | 0.052 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad920000000000000117 | 283.720 | 13.400 | 3.473 | 0.486 | 0.127 | 21.511 | 17.401 | 0.084 | 0.000 | 1.310 | 225.872 | n/a | n/a | 0.056 | 17.486 | 0.062 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 1.132ms |
| e75182ffd70cad920000000000000120 | 54.655 | 4.186 | 0.190 | 0.000 | 0.111 | 11.312 | 13.382 | 0.000 | 7.961 | 0.000 | 17.444 | n/a | n/a | 0.069 | 4.487 | 0.082 | 0.069 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.490 | 0.429 | 0.000 | 1.460 | 5.642 | n/a | 0.000 | 0.158 | 5.678 | 0.457 | 0.000 | 0.000 | 0.000 | 14.222 | n/a | n/a | 0.060 | 7.303 | 0.183 | 0.060 |
| p99 | 64.554 | 2.502 | 0.000 | 4.377 | 7.488 | n/a | 0.000 | 13.664 | 11.416 | 9.117 | 0.088 | 0.000 | 0.696 | 46.600 | n/a | n/a | 0.100 | 16.704 | 0.586 | 0.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad92000000000000012b | 64.554 | 7.227 | n/a | 0.000 | 0.876 | 5.700 | 3.268 | 0.088 | 0.000 | 0.696 | 46.600 | n/a | n/a | 0.100 | 8.103 | 0.126 | 0.100 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad920000000000000134 | 52.602 | 5.642 | 0.251 | 0.000 | 0.062 | 11.416 | 9.117 | 0.018 | 0.000 | 0.054 | 26.004 | n/a | n/a | 0.040 | 5.954 | 0.113 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad92000000000000012e | 32.679 | 7.488 | n/a | 0.000 | 0.930 | 5.678 | 0.457 | 0.000 | 0.000 | 0.000 | 18.047 | n/a | n/a | 0.079 | 8.418 | 0.258 | 0.079 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad92000000000000012f | 28.490 | 3.040 | n/a | 0.000 | 13.664 | 5.622 | 0.294 | 0.000 | 0.000 | 0.000 | 5.809 | n/a | n/a | 0.060 | 16.704 | 0.586 | 0.060 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.862ms; driver.publication 1.535ms |
| e75182ffd70cad920000000000000136 | 27.997 | 7.144 | n/a | 0.000 | 0.158 | 5.606 | 0.795 | 0.000 | 0.000 | 0.000 | 14.222 | n/a | n/a | 0.071 | 7.303 | 0.261 | 0.071 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad920000000000000132 | 25.163 | 4.313 | 0.240 | 0.000 | 0.064 | 11.229 | 0.425 | 0.000 | 0.000 | 0.000 | 8.854 | n/a | n/a | 0.039 | 4.616 | 0.183 | 0.039 | node-14/thread-8/socket.wait-first-byte | none observed |

## P4 / p4h10 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.997 | 0.429 | 0.000 | 1.460 | 3.040 | n/a | 0.000 | 0.158 | 5.606 | 0.294 | 0.000 | 0.000 | 0.000 | 5.809 | n/a | n/a | 0.060 | 7.303 | 0.261 | 0.060 |
| p99 | 28.490 | 1.359 | 0.000 | 4.377 | 7.144 | n/a | 0.000 | 13.664 | 5.622 | 0.795 | 0.000 | 0.000 | 0.000 | 14.222 | n/a | n/a | 0.071 | 16.704 | 0.586 | 0.071 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad92000000000000012f | 28.490 | 3.040 | n/a | 0.000 | 13.664 | 5.622 | 0.294 | 0.000 | 0.000 | 0.000 | 5.809 | n/a | n/a | 0.060 | 16.704 | 0.586 | 0.060 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.862ms; driver.publication 1.535ms |
| e75182ffd70cad920000000000000136 | 27.997 | 7.144 | n/a | 0.000 | 0.158 | 5.606 | 0.795 | 0.000 | 0.000 | 0.000 | 14.222 | n/a | n/a | 0.071 | 7.303 | 0.261 | 0.071 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.670 | 0.000 | 0.000 | 0.348 | 7.677 | 2.163 | 0.000 | 0.078 | 5.852 | 0.398 | 0.000 | 0.000 | 0.000 | 12.487 | n/a | n/a | 0.044 | 7.849 | 0.294 | 0.044 |
| p99 | 35.588 | 1.231 | 0.000 | 1.938 | 8.264 | n/a | 0.000 | 0.959 | 10.443 | 0.438 | 0.000 | 0.000 | 0.000 | 14.201 | n/a | n/a | 0.055 | 10.504 | 0.295 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad920000000000000138 | 35.588 | 8.264 | 2.163 | 0.000 | 0.078 | 10.443 | 0.398 | 0.000 | 0.000 | 0.000 | 14.201 | n/a | n/a | 0.042 | 10.504 | 0.295 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad92000000000000013c | 26.670 | 7.677 | 0.103 | 0.000 | 0.069 | 5.852 | 0.438 | 0.000 | 0.000 | 0.000 | 12.487 | n/a | n/a | 0.044 | 7.849 | 0.294 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e75182ffd70cad92000000000000013a | 18.950 | 3.707 | n/a | 0.000 | 0.959 | 5.627 | 0.373 | 0.000 | 0.000 | 0.000 | 8.228 | n/a | n/a | 0.055 | 4.667 | 0.246 | 0.055 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.950 | 1.231 | 0.000 | 1.938 | 3.707 | n/a | 0.000 | 0.959 | 5.627 | 0.373 | 0.000 | 0.000 | 0.000 | 8.228 | n/a | n/a | 0.055 | 4.667 | 0.246 | 0.055 |
| p99 | 18.950 | 1.231 | 0.000 | 1.938 | 3.707 | n/a | 0.000 | 0.959 | 5.627 | 0.373 | 0.000 | 0.000 | 0.000 | 8.228 | n/a | n/a | 0.055 | 4.667 | 0.246 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad92000000000000013a | 18.950 | 3.707 | n/a | 0.000 | 0.959 | 5.627 | 0.373 | 0.000 | 0.000 | 0.000 | 8.228 | n/a | n/a | 0.055 | 4.667 | 0.246 | 0.055 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 123.016 | 0.000 | 0.000 | 0.261 | 121.430 | n/a | 1.553 | 0.009 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 122.989 | 1.000 | 0.032 |
| p99 | 193.816 | 1.109 | 0.000 | 3.060 | 192.196 | n/a | 1.553 | 0.046 | 5.660 | 3.979 | 15.757 | 0.000 | 0.497 | 23.164 | n/a | n/a | 0.061 | 193.758 | 1.000 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e75182ffd70cad920000000000000147 | 193.816 | 192.196 | n/a | 1.553 | 0.009 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.058 | 193.758 | 1.000 | 0.058 | node-14/thread-0/client.persist-and-resolve | driver.publication 4.136ms; driver.publication 3.095ms; driver.publication 2.292ms; driver.publication 2.243ms; driver.publication 2.041ms |
| e75182ffd70cad920000000000000146 | 184.680 | 183.057 | n/a | 1.553 | 0.010 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.061 | 184.620 | 1.000 | 0.061 | node-14/thread-0/client.persist-and-resolve | driver.publication 4.136ms; driver.publication 3.095ms; driver.publication 2.292ms; driver.publication 2.243ms; driver.publication 2.041ms |
| e75182ffd70cad920000000000000145 | 170.942 | 169.348 | n/a | 1.553 | 0.009 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 170.910 | 1.000 | 0.032 | node-14/thread-0/client.persist-and-resolve | driver.publication 4.136ms; driver.publication 3.095ms; driver.publication 2.292ms; driver.publication 2.243ms; driver.publication 1.958ms |
| e75182ffd70cad920000000000000144 | 152.448 | 150.832 | n/a | 1.553 | 0.008 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.056 | 152.392 | 1.000 | 0.056 | node-14/thread-0/client.persist-and-resolve | driver.publication 4.136ms; driver.publication 3.095ms; driver.publication 2.292ms; driver.publication 2.243ms; driver.publication 1.958ms |
| e75182ffd70cad920000000000000143 | 141.792 | 140.207 | n/a | 1.553 | 0.010 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 141.770 | 1.000 | 0.023 | node-14/thread-0/client.persist-and-resolve | driver.publication 4.136ms; driver.publication 3.095ms; driver.publication 2.292ms; driver.publication 1.958ms; driver.worker-message 1.794ms |
| e75182ffd70cad920000000000000142 | 123.016 | 121.430 | n/a | 1.553 | 0.007 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 122.989 | 1.000 | 0.026 | node-14/thread-0/client.persist-and-resolve | driver.publication 4.136ms; driver.publication 3.095ms; driver.publication 1.958ms; driver.worker-message 1.794ms; driver.publication 1.786ms |
| e75182ffd70cad920000000000000141 | 100.235 | 98.640 | n/a | 1.553 | 0.010 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 100.203 | 1.000 | 0.032 | node-14/thread-0/client.persist-and-resolve | driver.publication 4.136ms; driver.publication 3.095ms; driver.publication 1.958ms; driver.worker-message 1.794ms; driver.publication 1.706ms |
| e75182ffd70cad920000000000000140 | 89.628 | 88.042 | n/a | 1.553 | 0.007 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 89.602 | 1.000 | 0.027 | node-14/thread-0/client.persist-and-resolve | driver.publication 3.095ms; driver.publication 1.958ms; driver.worker-message 1.794ms; driver.publication 1.706ms |
| e75182ffd70cad92000000000000013f | 84.995 | 84.952 | n/a | 0.000 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 84.967 | 1.000 | 0.028 | node-14/thread-0/client.persist-and-resolve | driver.publication 3.095ms; driver.publication 1.958ms; driver.worker-message 1.794ms |
| e75182ffd70cad92000000000000013e | 54.028 | 4.870 | n/a | 0.000 | 0.046 | 5.660 | 3.979 | 15.757 | 0.000 | 0.497 | 23.164 | n/a | n/a | 0.055 | 4.916 | 0.091 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.worker-message 1.794ms |

## P1 / warmup / read (197 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.029 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 296.326 | n/a | n/a | n/a | 95.060 | n/a | 14.677 | 296.263 | 42.786 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 56.413 | 296.322 | 1.000 | 56.413 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f5afd385a28cf8d000000000000190c | 296.512 | 0.422 | n/a | 0.000 | 296.082 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 296.503 | 1.000 | 0.009 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000000190d | 296.326 | 0.076 | n/a | 0.000 | 296.246 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 296.322 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000000190e | 296.296 | 0.031 | n/a | 0.000 | 296.263 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 296.294 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000000190f | 296.294 | 0.029 | n/a | 0.000 | 296.263 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 296.292 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d0000000000001910 | 296.288 | 0.023 | n/a | 0.000 | 296.263 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 296.286 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| aeda5734d0d9792300000000000007ce | 295.960 | 0.517 | n/a | 0.000 | 295.437 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 295.954 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aeda5734d0d9792300000000000007d1 | 295.787 | 0.024 | n/a | 0.000 | 295.760 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 295.784 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aeda5734d0d9792300000000000007d0 | 295.769 | 0.026 | n/a | 0.000 | 295.740 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 295.767 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aeda5734d0d9792300000000000007cf | 295.757 | 0.056 | n/a | 0.000 | 295.698 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 295.754 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b00000000000006d7 | 295.505 | 0.877 | n/a | 0.000 | 294.621 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 295.498 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b00000000000006d8 | 295.216 | 0.178 | n/a | 0.000 | 295.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 295.208 | 1.000 | 0.008 | node-14/thread-4/reader.straddle-await-ack | none observed |
| aeda5734d0d979230000000000000803 | 294.995 | 0.028 | n/a | 0.000 | 294.964 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 294.992 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aeda5734d0d979230000000000000804 | 294.993 | 0.018 | n/a | 0.000 | 294.973 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 294.991 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b00000000000006e7 | 294.326 | 0.172 | n/a | 0.000 | 294.149 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 294.321 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b00000000000006e9 | 294.279 | 0.041 | n/a | 0.000 | 294.234 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 294.275 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b00000000000006e8 | 294.252 | 0.067 | n/a | 0.000 | 294.180 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 294.246 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b0000000000009338 | 277.340 | 0.038 | n/a | 0.000 | 277.300 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.338 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b0000000000009337 | 277.309 | 0.184 | n/a | 0.000 | 277.122 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.306 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b0000000000009336 | 277.122 | 0.064 | n/a | 0.000 | 277.056 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.120 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b0000000000009334 | 277.043 | 0.349 | n/a | 0.000 | 276.689 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 277.039 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (96 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.012 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 284.297 | n/a | n/a | n/a | 4.914 | n/a | 0.000 | 283.868 | 0.968 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 2.891 | 284.290 | 1.000 | 2.891 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeda5734d0d97923000000000000b283 | 284.297 | 0.422 | n/a | 0.000 | 283.868 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 284.290 | 1.000 | 0.007 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.743ms |
| aeda5734d0d97923000000000001bbb3 | 269.087 | 0.198 | n/a | 0.000 | 268.887 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 269.085 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| aeda5734d0d97923000000000000b271 | 54.615 | 0.364 | n/a | 0.000 | 54.246 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 54.610 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| aeda5734d0d97923000000000000b29f | 8.772 | 4.914 | n/a | 0.000 | 0.000 | 0.968 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 2.891 | 4.914 | 0.560 | 2.891 | node-14/thread-3/socket.wait-first-byte | none observed |
| aeda5734d0d97923000000000000e0bf | 0.768 | 0.764 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.764 | 0.995 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d97923000000000000e422 | 0.727 | 0.722 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.722 | 0.994 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d97923000000000000e33c | 0.670 | 0.666 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.666 | 0.994 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d97923000000000000bf94 | 0.660 | 0.658 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.658 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d97923000000000000b260 | 0.560 | 0.530 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 0.530 | 0.946 | 0.030 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d979230000000000015ec4 | 0.531 | 0.529 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.529 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d97923000000000000bea0 | 0.530 | 0.526 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.526 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d97923000000000000e0b4 | 0.526 | 0.515 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.515 | 0.979 | 0.011 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d9792300000000000154ea | 0.514 | 0.512 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.512 | 0.996 | 0.002 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d97923000000000001a984 | 0.495 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.495 | 0.000 | 0.000 | 0.495 | uncovered | none observed |
| aeda5734d0d97923000000000000b27a | 0.485 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.485 | 0.000 | 0.000 | 0.485 | uncovered | none observed |
| aeda5734d0d97923000000000000e5d2 | 0.479 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.479 | 0.000 | 0.000 | 0.479 | uncovered | none observed |
| aeda5734d0d97923000000000000e47a | 0.475 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.475 | 0.000 | 0.000 | 0.475 | uncovered | none observed |
| aeda5734d0d97923000000000000e426 | 0.465 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.465 | 0.000 | 0.000 | 0.465 | uncovered | none observed |
| aeda5734d0d979230000000000019c30 | 0.451 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.451 | 0.000 | 0.000 | 0.451 | uncovered | none observed |
| aeda5734d0d97923000000000000bfb0 | 0.431 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.431 | 0.000 | 0.000 | 0.431 | uncovered | none observed |

## P1 / L4 / read (204 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.016 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 272.961 | n/a | n/a | n/a | 6.037 | n/a | 0.000 | 272.770 | 0.475 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.399 | 272.957 | 1.000 | 3.399 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f5afd385a28cf8d000000000000bef4 | 274.339 | 0.201 | n/a | 0.000 | 274.134 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 274.335 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000001cdcf | 273.107 | 0.051 | n/a | 0.000 | 273.054 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.105 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000001cdce | 272.961 | 0.186 | n/a | 0.000 | 272.770 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 272.957 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b000000000000b916 | 272.753 | 0.200 | n/a | 0.000 | 272.550 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.750 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000001bbb6 | 218.745 | 0.187 | n/a | 0.000 | 218.555 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 218.742 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| 0f5afd385a28cf8d000000000000b308 | 218.656 | 0.504 | n/a | 0.000 | 218.142 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 218.646 | 1.000 | 0.010 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| b2c8d2581bbdf71b000000000000ab17 | 218.265 | 0.367 | n/a | 0.000 | 217.894 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 218.261 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 0f5afd385a28cf8d000000000000b311 | 41.970 | 35.047 | n/a | 2.796 | 0.000 | 0.728 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.399 | 37.843 | 0.902 | 3.399 | node-14/thread-5/reader.execute | none observed |
| aeda5734d0d97923000000000001bc2d | 21.843 | 17.232 | n/a | 0.000 | 0.000 | 0.415 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 4.195 | 17.232 | 0.789 | 4.195 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.021ms |
| aeda5734d0d97923000000000001bbfb | 14.580 | 5.069 | n/a | 0.000 | 0.000 | 0.475 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 9.035 | 5.069 | 0.348 | 9.035 | node-14/thread-3/socket.wait-first-byte | none observed |
| b2c8d2581bbdf71b000000000000ab51 | 6.991 | 4.567 | n/a | 0.000 | 0.000 | 1.124 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.299 | 4.567 | 0.653 | 1.299 | node-14/thread-4/reader.execute | none observed |
| aeda5734d0d97923000000000001d366 | 6.040 | 6.037 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 6.037 | 0.999 | 0.003 | node-14/thread-3/reader.execute | none observed |
| 0f5afd385a28cf8d0000000000012b07 | 3.527 | 3.525 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.525 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| aeda5734d0d97923000000000001bc52 | 2.625 | 2.622 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.622 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d97923000000000001dc57 | 2.375 | 2.372 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.372 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 0f5afd385a28cf8d0000000000010a2a | 2.017 | 2.014 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.014 | 0.998 | 0.004 | node-14/thread-5/replica.pull-at | none observed |
| b2c8d2581bbdf71b000000000000d747 | 1.753 | 1.751 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.751 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| aeda5734d0d97923000000000001bc37 | 1.591 | 1.589 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.589 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b2c8d2581bbdf71b000000000000be7a | 1.405 | 1.394 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 1.394 | 0.992 | 0.011 | node-14/thread-4/reader.execute | none observed |
| aeda5734d0d9792300000000000224c2 | 1.120 | 1.118 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.118 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P1 / L16 / read (235 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.032 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 |
| p99 | 531.694 | n/a | n/a | n/a | 6.724 | n/a | 0.000 | 531.668 | 0.747 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 4.536 | 531.693 | 1.000 | 4.536 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b2c8d2581bbdf71b000000000001e224 | 531.729 | 0.013 | n/a | 0.000 | 531.715 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 531.728 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| b2c8d2581bbdf71b000000000001e223 | 531.711 | 0.015 | n/a | 0.000 | 531.695 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 531.710 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| b2c8d2581bbdf71b000000000001e222 | 531.694 | 0.025 | n/a | 0.000 | 531.668 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 531.693 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| b2c8d2581bbdf71b000000000001e221 | 531.658 | 0.063 | n/a | 0.000 | 531.594 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 531.656 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| b2c8d2581bbdf71b000000000001e220 | 530.941 | 0.266 | n/a | 0.000 | 530.673 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 530.939 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| 0f5afd385a28cf8d000000000001ef2e | 530.298 | 0.353 | n/a | 0.000 | 529.943 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 530.295 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.062ms |
| 0f5afd385a28cf8d000000000001ef2f | 530.136 | 0.057 | n/a | 0.000 | 530.077 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 530.134 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.062ms |
| aeda5734d0d979230000000000034321 | 530.125 | 0.059 | n/a | 0.000 | 530.064 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 530.123 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| aeda5734d0d97923000000000003432a | 530.064 | 0.062 | n/a | 0.000 | 530.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 530.062 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| aeda5734d0d979230000000000034320 | 530.012 | 0.243 | n/a | 0.000 | 529.766 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 530.009 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| aeda5734d0d979230000000000034329 | 530.000 | 0.031 | n/a | 0.000 | 529.967 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 529.998 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| aeda5734d0d979230000000000034328 | 529.979 | 0.034 | n/a | 0.000 | 529.943 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 529.977 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| aeda5734d0d979230000000000034327 | 529.964 | 0.066 | n/a | 0.000 | 529.895 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 529.962 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| 0f5afd385a28cf8d000000000001ef41 | 529.721 | 0.052 | n/a | 0.000 | 529.667 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 529.719 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.062ms |
| 0f5afd385a28cf8d000000000001ef43 | 529.714 | 0.040 | n/a | 0.000 | 529.673 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 529.712 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.062ms |
| 0f5afd385a28cf8d000000000001ef42 | 529.705 | 0.020 | n/a | 0.000 | 529.684 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 529.703 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.062ms |
| b2c8d2581bbdf71b000000000001624f | 50.157 | 38.749 | n/a | 5.044 | 0.000 | 0.786 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 5.578 | 43.793 | 0.873 | 5.578 | node-14/thread-4/reader.execute | none observed |
| aeda5734d0d97923000000000003435a | 27.693 | 0.182 | n/a | 0.000 | 27.509 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 27.690 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| aeda5734d0d97923000000000003435e | 27.616 | 0.022 | n/a | 0.000 | 27.593 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 27.615 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| aeda5734d0d97923000000000003435b | 27.609 | 0.026 | n/a | 0.000 | 27.581 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 27.607 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.049ms |

## P1 / L64 / read (219 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.035 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 312.875 | n/a | n/a | n/a | 20.104 | n/a | 2.946 | 312.753 | 23.359 | 31.058 | 65.573 | 0.000 | 0.029 | 0.000 | n/a | n/a | 43.256 | 312.875 | 1.000 | 43.256 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeda5734d0d97923000000000003f1ae | 313.006 | 0.264 | n/a | 0.000 | 312.740 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 313.004 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b0000000000028b98 | 312.907 | 0.153 | n/a | 0.000 | 312.753 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.906 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b0000000000028b97 | 312.875 | 0.016 | n/a | 0.000 | 312.859 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.875 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b0000000000028b96 | 312.856 | 0.025 | n/a | 0.000 | 312.830 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.855 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b0000000000028b99 | 312.825 | 0.084 | n/a | 0.000 | 312.740 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.824 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b0000000000028b95 | 312.773 | 0.130 | n/a | 0.000 | 312.640 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 312.770 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000003f1f0 | 312.407 | 0.021 | n/a | 0.000 | 312.386 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.406 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000003f1ef | 312.384 | 0.013 | n/a | 0.000 | 312.370 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.383 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000003f1ee | 312.376 | 0.016 | n/a | 0.000 | 312.360 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.375 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000003f1ed | 312.365 | 0.014 | n/a | 0.000 | 312.350 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.364 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000003f1ec | 312.363 | 0.037 | n/a | 0.000 | 312.325 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.362 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d0000000000029ac1 | 312.254 | 0.341 | n/a | 0.000 | 311.910 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 312.251 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d0000000000029ac2 | 312.063 | 0.055 | n/a | 0.000 | 312.006 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 312.061 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d0000000000029ac5 | 311.972 | 0.047 | n/a | 0.000 | 311.923 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 311.970 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d0000000000029ac7 | 311.968 | 0.024 | n/a | 0.000 | 311.943 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 311.967 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d0000000000029ac6 | 311.960 | 0.027 | n/a | 0.000 | 311.932 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 311.958 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b000000000002a967 | 276.240 | 0.451 | n/a | 0.000 | 275.785 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 276.236 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b000000000002a983 | 275.160 | 0.090 | n/a | 0.000 | 275.067 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.158 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b000000000002a954 | 274.681 | 0.242 | n/a | 0.000 | 274.435 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 274.677 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b000000000002a9a4 | 274.388 | 0.188 | n/a | 0.000 | 274.198 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.386 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L256 / read (178 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.042 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 394.068 | n/a | n/a | n/a | 3.166 | n/a | 2.411 | 393.944 | 0.847 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 5.896 | 394.067 | 1.000 | 5.896 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeda5734d0d979230000000000052dda | 395.490 | 0.056 | n/a | 0.000 | 395.433 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 395.489 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000003ce72 | 394.068 | 0.154 | n/a | 0.000 | 393.914 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 394.067 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000003ce71 | 393.972 | 0.028 | n/a | 0.000 | 393.943 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 393.971 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| aeda5734d0d979230000000000052dd7 | 393.968 | 0.023 | n/a | 0.000 | 393.944 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 393.967 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aeda5734d0d979230000000000052dd6 | 393.950 | 0.038 | n/a | 0.000 | 393.911 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 393.949 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b000000000003b838 | 393.920 | 0.024 | n/a | 0.000 | 393.896 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 393.919 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000003ce70 | 393.918 | 0.035 | n/a | 0.000 | 393.883 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 393.917 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| aeda5734d0d979230000000000052dd5 | 393.915 | 0.025 | n/a | 0.000 | 393.889 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 393.914 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b000000000003b837 | 393.904 | 0.016 | n/a | 0.000 | 393.886 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 393.903 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b000000000003b836 | 393.887 | 0.022 | n/a | 0.000 | 393.864 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 393.886 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| aeda5734d0d979230000000000052dd4 | 393.884 | 0.041 | n/a | 0.000 | 393.842 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 393.883 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000003ce6f | 393.872 | 0.062 | n/a | 0.000 | 393.796 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 393.858 | 1.000 | 0.013 | node-14/thread-5/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b000000000003b835 | 393.854 | 0.031 | n/a | 0.000 | 393.822 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 393.853 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| aeda5734d0d979230000000000052dd3 | 393.755 | 0.206 | n/a | 0.000 | 393.546 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 393.752 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b000000000003b834 | 393.741 | 0.171 | n/a | 0.000 | 393.567 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 393.738 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000003ce6e | 393.725 | 0.358 | n/a | 0.000 | 393.365 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 393.723 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b000000000003174c | 286.781 | 0.021 | n/a | 0.000 | 286.759 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.781 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b2c8d2581bbdf71b000000000003174b | 286.750 | 0.028 | n/a | 0.000 | 286.721 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.748 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b2c8d2581bbdf71b000000000003174a | 286.633 | 0.163 | n/a | 0.000 | 286.467 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 286.630 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b2c8d2581bbdf71b000000000003174e | 286.036 | 0.041 | n/a | 0.000 | 285.995 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.035 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |

## P1 / L1024 / read (289 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.027 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 |
| p99 | 9.170 | n/a | n/a | n/a | 4.157 | n/a | 0.000 | 0.000 | 0.686 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 4.471 | 4.157 | 1.000 | 4.471 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeda5734d0d979230000000000052e73 | 46.143 | 25.793 | n/a | 2.988 | 0.000 | 0.686 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 16.676 | 28.781 | 0.624 | 16.676 | node-14/thread-3/socket.wait-first-byte | none observed |
| b2c8d2581bbdf71b000000000003b8d8 | 12.669 | 4.912 | n/a | 0.000 | 0.000 | 1.006 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 6.751 | 4.912 | 0.388 | 6.751 | node-14/thread-4/socket.wait-first-byte | none observed |
| 0f5afd385a28cf8d000000000003ced5 | 9.170 | 3.909 | n/a | 0.000 | 0.000 | 0.790 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 4.471 | 3.909 | 0.426 | 4.471 | node-14/thread-5/socket.wait-first-byte | none observed |
| aeda5734d0d97923000000000005a330 | 4.159 | 4.157 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.157 | 1.000 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d97923000000000005a1cd | 3.914 | 3.911 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.911 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d97923000000000005a1ce | 3.900 | 3.891 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 3.891 | 0.998 | 0.009 | node-14/thread-3/replica.pull-at | none observed |
| b2c8d2581bbdf71b0000000000045248 | 3.573 | 3.556 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.556 | 0.995 | 0.017 | node-14/thread-4/replica.pull-at | none observed |
| b2c8d2581bbdf71b0000000000045247 | 3.562 | 3.560 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.560 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| b2c8d2581bbdf71b0000000000045249 | 3.557 | 3.539 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.539 | 0.995 | 0.019 | node-14/thread-4/replica.pull-at | none observed |
| b2c8d2581bbdf71b000000000004524a | 3.553 | 3.533 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.533 | 0.994 | 0.020 | node-14/thread-4/replica.pull-at | none observed |
| b2c8d2581bbdf71b000000000004524b | 3.551 | 3.529 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 3.529 | 0.994 | 0.022 | node-14/thread-4/replica.pull-at | none observed |
| 0f5afd385a28cf8d000000000004515c | 3.232 | 3.231 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.231 | 1.000 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| 0f5afd385a28cf8d000000000004515d | 3.219 | 3.210 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 3.210 | 0.997 | 0.008 | node-14/thread-5/replica.pull-at | none observed |
| b2c8d2581bbdf71b000000000003b9b7 | 3.191 | 3.186 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 3.186 | 0.998 | 0.005 | node-14/thread-4/replica.pull-at | none observed |
| aeda5734d0d97923000000000005aad3 | 3.185 | 3.181 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.181 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| b2c8d2581bbdf71b000000000003b9b8 | 3.165 | 3.147 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.147 | 0.994 | 0.018 | node-14/thread-4/replica.pull-at | none observed |
| b2c8d2581bbdf71b000000000003b9b9 | 3.155 | 3.136 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.136 | 0.994 | 0.019 | node-14/thread-4/replica.pull-at | none observed |
| 0f5afd385a28cf8d000000000004c8e9 | 3.107 | 3.067 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 3.067 | 0.987 | 0.041 | node-14/thread-5/reader.execute | none observed |
| 0f5afd385a28cf8d000000000004c8e8 | 3.094 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.094 | 0.000 | 0.000 | 3.094 | uncovered | none observed |
| 0f5afd385a28cf8d00000000000450f3 | 3.082 | 3.081 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.081 | 1.000 | 0.001 | node-14/thread-5/replica.pull-at | none observed |

## P1 / recovery / read (228 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.032 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 288.406 | n/a | n/a | n/a | 16.913 | n/a | 1.463 | 288.377 | 0.560 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 4.666 | 288.405 | 1.000 | 4.666 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b2c8d2581bbdf71b000000000005aa2b | 288.436 | 0.016 | n/a | 0.000 | 288.420 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.436 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b000000000005aa2a | 288.430 | 0.019 | n/a | 0.000 | 288.411 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.429 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b000000000005aa29 | 288.406 | 0.028 | n/a | 0.000 | 288.377 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.405 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b000000000005aa28 | 288.351 | 0.047 | n/a | 0.000 | 288.302 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 288.349 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b000000000005aa27 | 287.310 | 0.108 | n/a | 0.000 | 287.196 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 287.304 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000005d645 | 286.988 | 0.014 | n/a | 0.000 | 286.973 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.987 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000005d644 | 286.982 | 0.016 | n/a | 0.000 | 286.965 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 286.981 | 1.000 | 0.000 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000005d643 | 286.975 | 0.035 | n/a | 0.000 | 286.939 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.974 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000007467d | 286.965 | 0.015 | n/a | 0.000 | 286.949 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.964 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000007467c | 286.961 | 0.016 | n/a | 0.000 | 286.945 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.960 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000007467b | 286.950 | 0.016 | n/a | 0.000 | 286.934 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.949 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000005d642 | 286.948 | 0.031 | n/a | 0.000 | 286.917 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.948 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000007467a | 286.940 | 0.018 | n/a | 0.000 | 286.921 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.939 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aeda5734d0d979230000000000074679 | 286.931 | 0.063 | n/a | 0.000 | 286.866 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.929 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000005d641 | 286.889 | 0.112 | n/a | 0.000 | 286.775 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 286.886 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| aeda5734d0d979230000000000074678 | 286.854 | 0.096 | n/a | 0.000 | 286.753 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 286.849 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000005bd3b | 271.678 | 0.013 | n/a | 0.000 | 271.664 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.677 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000005bd3a | 271.672 | 0.014 | n/a | 0.000 | 271.657 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.671 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000005bd39 | 271.662 | 0.015 | n/a | 0.000 | 271.646 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.661 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d000000000005bd38 | 271.646 | 0.021 | n/a | 0.000 | 271.624 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.646 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (128 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.015 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 6.403 | n/a | n/a | n/a | 2.903 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.543 | 2.903 | 1.000 | 1.543 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeda5734d0d979230000000000079730 | 8.354 | 8.350 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 8.350 | 1.000 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d979230000000000075c56 | 6.403 | 1.444 | n/a | 0.000 | 0.000 | 0.451 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 4.508 | 1.444 | 0.225 | 4.508 | node-14/thread-3/socket.wait-first-byte | none observed |
| aeda5734d0d97923000000000007971e | 3.154 | 2.903 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.251 | 2.903 | 0.920 | 0.251 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d97923000000000007971c | 2.508 | 2.372 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.135 | 2.372 | 0.946 | 0.135 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000796e0 | 2.456 | 2.346 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.111 | 2.346 | 0.955 | 0.111 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d979230000000000079719 | 2.402 | 2.389 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 2.389 | 0.995 | 0.012 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000796ed | 2.278 | 2.274 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.274 | 0.998 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d979230000000000079724 | 1.992 | 1.922 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.069 | 1.922 | 0.965 | 0.069 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d979230000000000075fe7 | 1.719 | 1.718 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.718 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000796f4 | 1.675 | 0.863 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.813 | 0.863 | 0.515 | 0.813 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d979230000000000079718 | 1.626 | 1.607 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 1.607 | 0.988 | 0.020 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d97923000000000007941d | 1.545 | 1.381 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.165 | 1.381 | 0.894 | 0.165 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d97923000000000008a83e | 1.543 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.543 | 0.000 | 0.000 | 1.543 | uncovered | none observed |
| aeda5734d0d9792300000000000770bc | 1.283 | 1.279 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.279 | 0.997 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d97923000000000008a84a | 1.114 | 1.112 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.112 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d97923000000000008a876 | 1.065 | 1.063 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.063 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d979230000000000077093 | 0.898 | 0.889 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.889 | 0.990 | 0.009 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d9792300000000000796ef | 0.856 | 0.853 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.853 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d979230000000000091fb0 | 0.814 | 0.812 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.812 | 0.996 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d97923000000000007988c | 0.809 | 0.808 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.808 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h1 / read (179 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 |
| p99 | 0.669 | n/a | n/a | n/a | 0.667 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.485 | 0.667 | 0.997 | 0.485 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeda5734d0d979230000000000092c2b | 14.919 | 5.566 | n/a | 0.992 | 0.000 | 0.475 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 7.886 | 6.558 | 0.440 | 7.886 | node-14/thread-3/socket.wait-first-byte | none observed |
| aeda5734d0d9792300000000000a9258 | 0.669 | 0.667 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.667 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d97923000000000009a7ce | 0.622 | 0.619 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.619 | 0.996 | 0.002 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d979230000000000096070 | 0.556 | 0.553 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.553 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000aa2b2 | 0.531 | 0.529 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.529 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000ba1a7 | 0.503 | 0.501 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.501 | 0.997 | 0.002 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d9792300000000000ad60b | 0.485 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.485 | 0.000 | 0.000 | 0.485 | uncovered | none observed |
| aeda5734d0d9792300000000000b04c3 | 0.461 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.461 | 0.000 | 0.000 | 0.461 | uncovered | none observed |
| aeda5734d0d9792300000000000a09ad | 0.441 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.441 | 0.000 | 0.000 | 0.441 | uncovered | none observed |
| aeda5734d0d9792300000000000b3bec | 0.435 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.435 | 0.000 | 0.000 | 0.435 | uncovered | none observed |
| aeda5734d0d9792300000000000ad033 | 0.415 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.415 | 0.000 | 0.000 | 0.415 | uncovered | none observed |
| aeda5734d0d9792300000000000b4740 | 0.415 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.415 | 0.000 | 0.000 | 0.415 | uncovered | none observed |
| aeda5734d0d9792300000000000aa2f5 | 0.407 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.407 | 0.000 | 0.000 | 0.407 | uncovered | none observed |
| aeda5734d0d9792300000000000a1c6d | 0.399 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.399 | 0.000 | 0.000 | 0.399 | uncovered | none observed |
| aeda5734d0d9792300000000000a21ce | 0.392 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.392 | 0.000 | 0.000 | 0.392 | uncovered | none observed |
| aeda5734d0d9792300000000000adfa4 | 0.392 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.392 | 0.000 | 0.000 | 0.392 | uncovered | none observed |
| aeda5734d0d9792300000000000944f1 | 0.388 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.388 | 0.000 | 0.000 | 0.388 | uncovered | none observed |
| aeda5734d0d979230000000000094c34 | 0.380 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.380 | 0.000 | 0.000 | 0.380 | uncovered | none observed |
| aeda5734d0d9792300000000000a0b2d | 0.380 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.380 | 0.000 | 0.000 | 0.380 | uncovered | none observed |
| aeda5734d0d9792300000000000aae6a | 0.379 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.379 | 0.000 | 0.000 | 0.379 | uncovered | none observed |

## P4 / p4h3 / read (180 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 1.620 | n/a | n/a | n/a | 1.616 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.744 | 1.616 | 0.998 | 0.744 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeda5734d0d9792300000000000bbf1e | 10.967 | 3.596 | n/a | 0.000 | 0.000 | 0.636 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 6.735 | 3.596 | 0.328 | 6.735 | node-14/thread-3/socket.wait-first-byte | none observed |
| aeda5734d0d9792300000000000bc210 | 1.620 | 1.616 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.616 | 0.997 | 0.004 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d9792300000000000bed8e | 0.923 | 0.914 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.914 | 0.990 | 0.009 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000d5dbe | 0.884 | 0.882 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.882 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000e035a | 0.790 | 0.789 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.789 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000d3203 | 0.744 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.744 | 0.000 | 0.000 | 0.744 | uncovered | none observed |
| aeda5734d0d9792300000000000bbf1f | 0.721 | 0.693 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 0.693 | 0.961 | 0.028 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000bc407 | 0.671 | 0.669 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.669 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000bed7d | 0.549 | 0.546 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.546 | 0.996 | 0.002 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d9792300000000000bee33 | 0.545 | 0.541 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.541 | 0.993 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000bedea | 0.544 | 0.543 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.543 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000bed8f | 0.523 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.523 | 0.000 | 0.000 | 0.523 | uncovered | none observed |
| aeda5734d0d9792300000000000c4dea | 0.518 | 0.516 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.516 | 0.996 | 0.002 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d9792300000000000dbfb5 | 0.510 | 0.505 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.505 | 0.991 | 0.004 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d9792300000000000bed7f | 0.505 | 0.501 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.501 | 0.992 | 0.004 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d9792300000000000beddd | 0.491 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.491 | 0.000 | 0.000 | 0.491 | uncovered | none observed |
| aeda5734d0d9792300000000000c28f0 | 0.485 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.485 | 0.000 | 0.000 | 0.485 | uncovered | none observed |
| aeda5734d0d9792300000000000cbe95 | 0.464 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.464 | 0.000 | 0.000 | 0.464 | uncovered | none observed |
| aeda5734d0d9792300000000000d4e9a | 0.458 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.458 | 0.000 | 0.000 | 0.458 | uncovered | none observed |
| aeda5734d0d9792300000000000bee1e | 0.457 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.457 | 0.000 | 0.000 | 0.457 | uncovered | none observed |

## P4 / p4h10 / read (169 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 |
| p99 | 1.392 | n/a | n/a | n/a | 1.390 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.494 | 1.390 | 0.998 | 0.494 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeda5734d0d9792300000000000e29a1 | 8.057 | 1.711 | n/a | 0.000 | 0.000 | 0.490 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 5.856 | 1.711 | 0.212 | 5.856 | node-14/thread-3/socket.wait-first-byte | none observed |
| aeda5734d0d9792300000000000e8796 | 1.392 | 1.390 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.390 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000eb7e8 | 1.199 | 1.197 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.197 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000ebef2 | 1.166 | 1.161 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.161 | 0.996 | 0.005 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.034ms |
| aeda5734d0d9792300000000000f1042 | 1.031 | 1.028 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.028 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000ff8e8 | 0.672 | 0.670 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.670 | 0.996 | 0.002 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d9792300000000000e4c54 | 0.556 | 0.519 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 0.519 | 0.934 | 0.037 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d9792300000000001041d6 | 0.543 | 0.541 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.541 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000e5c3c | 0.542 | 0.538 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.538 | 0.993 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000e5330 | 0.530 | 0.525 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.525 | 0.989 | 0.006 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d9792300000000001044dc | 0.518 | 0.514 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.514 | 0.993 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| aeda5734d0d9792300000000000f4051 | 0.507 | 0.502 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.502 | 0.991 | 0.005 | node-14/thread-3/reader.execute | none observed |
| aeda5734d0d9792300000000001019ca | 0.494 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.494 | 0.000 | 0.000 | 0.494 | uncovered | none observed |
| aeda5734d0d9792300000000000e5dfa | 0.493 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.493 | 0.000 | 0.000 | 0.493 | uncovered | none observed |
| aeda5734d0d9792300000000000f3cee | 0.491 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.491 | 0.000 | 0.000 | 0.491 | uncovered | none observed |
| aeda5734d0d9792300000000000f7448 | 0.491 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.491 | 0.000 | 0.000 | 0.491 | uncovered | none observed |
| aeda5734d0d9792300000000000eb880 | 0.489 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.489 | 0.000 | 0.000 | 0.489 | uncovered | none observed |
| aeda5734d0d9792300000000000eb49a | 0.487 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.487 | 0.000 | 0.000 | 0.487 | uncovered | none observed |
| aeda5734d0d9792300000000000f2ed9 | 0.473 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.473 | 0.000 | 0.000 | 0.473 | uncovered | none observed |
| aeda5734d0d9792300000000000e2bf3 | 0.441 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.441 | 0.000 | 0.000 | 0.441 | uncovered | none observed |

## P5 / presweep / read (227 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.039 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 0.000 | 0.000 | 0.020 |
| p99 | 268.001 | n/a | n/a | n/a | 9.848 | n/a | 7.323 | 267.934 | 0.582 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.959 | 268.000 | 1.000 | 3.959 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeda5734d0d97923000000000010be83 | 268.014 | 0.088 | n/a | 0.000 | 267.924 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.013 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b0000000000060129 | 268.009 | 0.024 | n/a | 0.000 | 267.984 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.008 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b0000000000060128 | 268.001 | 0.061 | n/a | 0.000 | 267.939 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.000 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b0000000000060127 | 267.956 | 0.021 | n/a | 0.000 | 267.934 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 267.955 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b0000000000060126 | 267.934 | 0.039 | n/a | 0.000 | 267.894 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 267.932 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000010be82 | 267.922 | 0.036 | n/a | 0.000 | 267.885 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 267.921 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d0000000000063bc8 | 267.903 | 0.033 | n/a | 0.000 | 267.868 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 267.902 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000010be81 | 267.872 | 0.033 | n/a | 0.000 | 267.837 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 267.870 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b2c8d2581bbdf71b0000000000060125 | 267.867 | 0.165 | n/a | 0.000 | 267.698 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 267.864 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d0000000000063bcb | 267.852 | 0.030 | n/a | 0.000 | 267.820 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 267.850 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d0000000000063bc7 | 267.846 | 0.037 | n/a | 0.000 | 267.808 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 267.845 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000010be80 | 267.830 | 0.034 | n/a | 0.000 | 267.795 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 267.829 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d0000000000063bc6 | 267.785 | 0.041 | n/a | 0.000 | 267.742 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 267.783 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000010be7f | 267.776 | 0.067 | n/a | 0.000 | 267.708 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 267.775 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 0f5afd385a28cf8d0000000000063bc5 | 267.644 | 0.206 | n/a | 0.000 | 267.435 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 267.640 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| aeda5734d0d97923000000000010be7e | 267.604 | 0.291 | n/a | 0.000 | 267.310 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 267.601 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aeda5734d0d979230000000000106222 | 26.747 | 14.131 | n/a | 2.665 | 0.000 | 0.764 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 9.187 | 16.797 | 0.628 | 9.187 | node-14/thread-3/reader.execute | none observed |
| b2c8d2581bbdf71b000000000005c06a | 21.847 | 13.229 | n/a | 2.765 | 0.000 | 0.584 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 5.270 | 15.993 | 0.732 | 5.270 | node-14/thread-4/reader.execute | none observed |
| 0f5afd385a28cf8d000000000005ed67 | 19.789 | 9.848 | n/a | 5.400 | 0.000 | 0.582 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.959 | 15.248 | 0.771 | 3.959 | node-14/thread-5/reader.execute | none observed |
| 0f5afd385a28cf8d000000000005ed7a | 7.772 | 0.439 | n/a | 7.323 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 7.762 | 0.999 | 0.010 | node-14/thread-5/node.gc | none observed |

## P5 / sweep / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 2.675 | n/a | n/a | n/a | 2.445 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 2.445 | 0.994 | 0.017 |
| p99 | 35.275 | n/a | n/a | n/a | 28.124 | n/a | 3.275 | 0.000 | 1.423 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 8.894 | 31.399 | 1.000 | 8.894 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b2c8d2581bbdf71b0000000000068731 | 35.275 | 28.124 | n/a | 3.275 | 0.000 | 1.423 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 2.453 | 31.399 | 0.890 | 2.453 | node-14/thread-4/reader.execute | none observed |
| aeda5734d0d9792300000000001151c2 | 15.497 | 5.976 | n/a | 0.000 | 0.000 | 0.626 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 8.894 | 5.976 | 0.386 | 8.894 | node-14/thread-3/socket.wait-first-byte | none observed |
| 0f5afd385a28cf8d000000000006c982 | 14.472 | 7.606 | n/a | 0.000 | 0.000 | 0.502 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 6.364 | 7.606 | 0.526 | 6.364 | node-14/thread-5/socket.wait-first-byte | none observed |
| a7e014263ec4aa3000000000000000d3 | 10.818 | 10.781 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 10.781 | 0.997 | 0.037 | node-14/thread-6/replica.pull-at | none observed |
| a7e014263ec4aa3000000000000000d4 | 10.739 | 10.692 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.047 | 10.692 | 0.996 | 0.047 | node-14/thread-6/replica.pull-at | none observed |
| a7e014263ec4aa3000000000000000d5 | 10.656 | 10.611 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.046 | 10.611 | 0.996 | 0.046 | node-14/thread-6/replica.pull-at | none observed |
| a7e014263ec4aa3000000000000000d6 | 10.614 | 10.556 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.057 | 10.556 | 0.995 | 0.057 | node-14/thread-6/replica.pull-at | none observed |
| a7e014263ec4aa3000000000000000d7 | 10.533 | 10.477 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.056 | 10.477 | 0.995 | 0.056 | node-14/thread-6/replica.pull-at | none observed |
| a7e014263ec4aa3000000000000000d8 | 10.469 | 10.411 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.058 | 10.411 | 0.994 | 0.058 | node-14/thread-6/replica.pull-at | none observed |
| a7e014263ec4aa3000000000000000d9 | 10.378 | 10.318 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.060 | 10.318 | 0.994 | 0.060 | node-14/thread-6/replica.pull-at | none observed |
| a7e014263ec4aa3000000000000000da | 10.276 | 10.205 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.071 | 10.205 | 0.993 | 0.071 | node-14/thread-6/replica.pull-at | none observed |
| a7e014263ec4aa3000000000000000db | 10.185 | 10.117 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.068 | 10.117 | 0.993 | 0.068 | node-14/thread-6/replica.pull-at | none observed |
| a7e014263ec4aa3000000000000000dc | 10.104 | 10.035 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.069 | 10.035 | 0.993 | 0.069 | node-14/thread-6/replica.pull-at | none observed |
| a7e014263ec4aa3000000000000000dd | 10.001 | 9.928 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.073 | 9.928 | 0.993 | 0.073 | node-14/thread-6/replica.pull-at | none observed |
| a7e014263ec4aa3000000000000000de | 9.879 | 9.800 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.079 | 9.800 | 0.992 | 0.079 | node-14/thread-6/replica.pull-at | none observed |
| a7e014263ec4aa3000000000000001e3 | 8.064 | 8.033 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 8.033 | 0.996 | 0.031 | node-14/thread-6/replica.pull-at | none observed |
| a7e014263ec4aa3000000000000001e4 | 7.789 | 7.760 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 7.760 | 0.996 | 0.030 | node-14/thread-6/replica.pull-at | none observed |
| a7e014263ec4aa3000000000000001e5 | 7.715 | 7.674 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 7.674 | 0.995 | 0.041 | node-14/thread-6/replica.pull-at | none observed |
| a7e014263ec4aa3000000000000001e6 | 7.641 | 7.595 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.046 | 7.595 | 0.994 | 0.046 | node-14/thread-6/replica.pull-at | none observed |
| a7e014263ec4aa3000000000000001e7 | 7.583 | 7.535 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.048 | 7.535 | 0.994 | 0.048 | node-14/thread-6/replica.pull-at | none observed |

## P1 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.049 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.049 | 0.000 | 0.000 | 0.049 |
| p99 | 0.197 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeda5734d0d979230000000000115c69 | 0.197 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | uncovered | none observed |
| 0f5afd385a28cf8d000000000006d346 | 0.097 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | uncovered | none observed |
| 0f5afd385a28cf8d000000000006d344 | 0.078 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | uncovered | none observed |
| 0f5afd385a28cf8d000000000006d347 | 0.063 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.063 | 0.000 | 0.000 | 0.063 | uncovered | none observed |
| aeda5734d0d979230000000000115c64 | 0.052 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.052 | 0.000 | 0.000 | 0.052 | uncovered | none observed |
| 0f5afd385a28cf8d000000000006d345 | 0.049 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.049 | 0.000 | 0.000 | 0.049 | uncovered | none observed |
| 0f5afd385a28cf8d000000000006d348 | 0.029 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 0.000 | 0.000 | 0.029 | uncovered | none observed |
| aeda5734d0d979230000000000115c68 | 0.023 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 0.000 | 0.000 | 0.023 | uncovered | none observed |
| aeda5734d0d979230000000000115c65 | 0.019 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 0.000 | 0.000 | 0.019 | uncovered | none observed |
| aeda5734d0d979230000000000115c66 | 0.012 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 | uncovered | none observed |
| aeda5734d0d979230000000000115c67 | 0.010 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 | uncovered | none observed |

## P1 / baseline / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.015 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 |
| p99 | 0.079 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b2c8d2581bbdf71b000000000000aafe | 0.079 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | uncovered | none observed |
| 0f5afd385a28cf8d000000000000b303 | 0.069 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.069 | 0.000 | 0.000 | 0.069 | uncovered | none observed |
| b2c8d2581bbdf71b000000000000ab01 | 0.056 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.056 | 0.000 | 0.000 | 0.056 | uncovered | none observed |
| b2c8d2581bbdf71b000000000000ab00 | 0.047 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.047 | 0.000 | 0.000 | 0.047 | uncovered | none observed |
| 0f5afd385a28cf8d000000000000b305 | 0.015 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 | uncovered | none observed |
| 0f5afd385a28cf8d000000000000b304 | 0.014 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 | uncovered | none observed |
| b2c8d2581bbdf71b000000000000aaff | 0.013 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 | uncovered | none observed |
| 0f5afd385a28cf8d000000000000b307 | 0.010 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 | uncovered | none observed |
| 0f5afd385a28cf8d000000000000b306 | 0.005 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.000 | 0.000 | 0.005 | uncovered | none observed |

## P3 / outside-phases / read (34 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.408 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.086 | 200.976 | 0.021 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 |
| p99 | 206.606 | n/a | n/a | n/a | 0.677 | n/a | 0.000 | 0.000 | 13.414 | 204.944 | 5.437 | 23.869 | 0.253 | 0.000 | n/a | n/a | 49.940 | 0.677 | 0.007 | 49.940 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca92a4f7f2497fe00000000000000007 | 206.606 | 0.000 | n/a | 0.000 | 0.000 | 1.245 | 204.944 | 0.019 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | gw-r/thread-53/journal/page | none observed |
| ca92a4f7f2497fe0000000000000007c | 205.035 | 0.000 | n/a | 0.000 | 0.000 | 3.025 | 201.639 | 0.023 | 0.000 | 0.186 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-82/journal/page | none observed |
| ca92a4f7f2497fe0000000000000005b | 204.794 | 0.000 | n/a | 0.000 | 0.000 | 1.575 | 202.737 | 0.071 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-83/journal/page | none observed |
| ca92a4f7f2497fe000000000000000cb | 204.665 | 0.000 | n/a | 0.000 | 0.000 | 2.151 | 202.185 | 0.019 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-48/journal/page | none observed |
| ca92a4f7f2497fe0000000000000005c | 203.797 | 0.000 | n/a | 0.000 | 0.000 | 1.635 | 201.750 | 0.037 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-85/journal/page | none observed |
| ca92a4f7f2497fe00000000000000078 | 203.647 | 0.000 | n/a | 0.000 | 0.000 | 1.663 | 201.586 | 0.022 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-72/journal/page | none observed |
| ca92a4f7f2497fe00000000000000005 | 203.552 | 0.000 | n/a | 0.000 | 0.000 | 1.227 | 201.658 | 0.017 | 0.000 | 0.253 | 0.000 | n/a | n/a | 0.398 | 0.000 | 0.000 | 0.398 | gw-r/thread-53/journal/page | none observed |
| ca92a4f7f2497fe000000000000000a8 | 203.345 | 0.000 | n/a | 0.000 | 0.000 | 2.106 | 200.909 | 0.021 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-82/journal/page | none observed |
| ca92a4f7f2497fe0000000000000007d | 203.265 | 0.000 | n/a | 0.000 | 0.000 | 1.492 | 201.384 | 0.083 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-71/journal/page | none observed |
| ca92a4f7f2497fe00000000000000061 | 203.151 | 0.000 | n/a | 0.000 | 0.000 | 0.979 | 201.798 | 0.055 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-75/journal/page | none observed |
| ca92a4f7f2497fe000000000000000a4 | 203.036 | 0.000 | n/a | 0.000 | 0.000 | 1.238 | 201.443 | 0.031 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-83/journal/page | none observed |
| ca92a4f7f2497fe0000000000000005e | 202.804 | 0.000 | n/a | 0.000 | 0.000 | 1.066 | 201.367 | 0.022 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-85/journal/page | none observed |
| ca92a4f7f2497fe000000000000000a3 | 202.799 | 0.000 | n/a | 0.000 | 0.000 | 0.913 | 201.367 | 0.055 | 0.000 | 0.241 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-71/journal/page | none observed |
| ca92a4f7f2497fe000000000000000cd | 202.794 | 0.000 | n/a | 0.000 | 0.000 | 0.815 | 201.593 | 0.020 | 0.000 | 0.204 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-72/journal/page | none observed |
| ca92a4f7f2497fe0000000000000005f | 202.649 | 0.000 | n/a | 0.000 | 0.000 | 1.084 | 201.244 | 0.016 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-75/journal/page | none observed |
| ca92a4f7f2497fe000000000000000a6 | 202.573 | 0.000 | n/a | 0.000 | 0.000 | 1.086 | 201.204 | 0.018 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-83/journal/page | none observed |
| ca92a4f7f2497fe00000000000000079 | 202.512 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 201.249 | 0.022 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-82/journal/page | none observed |
| ca92a4f7f2497fe00000000000000006 | 202.408 | 0.000 | n/a | 0.000 | 0.000 | 1.055 | 200.976 | 0.018 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-48/journal/page | none observed |
| ca92a4f7f2497fe000000000000000cc | 202.321 | 0.000 | n/a | 0.000 | 0.000 | 1.038 | 200.949 | 0.013 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-82/journal/page | none observed |
| ca92a4f7f2497fe000000000000000a5 | 202.278 | 0.000 | n/a | 0.000 | 0.000 | 1.093 | 200.867 | 0.016 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-53/journal/page | none observed |

## P3 / outside-phases / internal (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 354.142 | n/a | n/a | n/a | 3.475 | n/a | 0.000 | 0.000 | 0.810 | 349.402 | 0.022 | 0.000 | 0.102 | 0.000 | n/a | n/a | 1.110 | 3.475 | 0.015 | 1.110 |
| p99 | 1006.554 | n/a | n/a | n/a | 91.992 | n/a | 4.438 | 0.000 | 3.214 | 1002.054 | 2.971 | 23.869 | 0.413 | 0.000 | n/a | n/a | 45.109 | 96.431 | 0.838 | 45.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea0000000000000054 | 1006.554 | 0.524 | n/a | 0.000 | 0.000 | 3.214 | 1001.385 | 0.022 | 0.000 | 0.220 | 0.000 | n/a | n/a | 1.188 | 0.524 | 0.001 | 1.188 | gw-r/thread-85/journal/page | none observed |
| babc7326a065baea0000000000000017 | 1005.910 | 0.279 | n/a | 0.000 | 0.000 | 1.726 | 1002.054 | 0.081 | 0.000 | 0.413 | 0.000 | n/a | n/a | 1.357 | 0.279 | 0.000 | 1.357 | gw-r/thread-54/journal/page | none observed |
| babc7326a065baea0000000000000019 | 1003.718 | 0.136 | n/a | 0.000 | 0.000 | 0.909 | 993.574 | 0.015 | 7.847 | 0.126 | 0.000 | n/a | n/a | 1.110 | 0.136 | 0.000 | 1.110 | gw-r/thread-50/journal/page | none observed |
| babc7326a065baea0000000000000018 | 1003.477 | 0.153 | n/a | 0.000 | 0.000 | 0.674 | 1001.266 | 0.027 | 0.000 | 0.128 | 0.000 | n/a | n/a | 1.229 | 0.153 | 0.000 | 1.229 | gw-r/thread-53/journal/page | none observed |
| babc7326a065baea000000000000009d | 1003.157 | 0.127 | n/a | 0.000 | 0.000 | 0.524 | 1001.106 | 0.066 | 0.000 | 0.219 | 0.000 | n/a | n/a | 1.115 | 0.127 | 0.000 | 1.115 | gw-r/thread-49/journal/page | none observed |
| babc7326a065baea0000000000000083 | 977.469 | 3.071 | n/a | 0.000 | 0.000 | 0.807 | 973.356 | 0.029 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.083 | 3.071 | 0.003 | 0.083 | gw-r/thread-82/journal/page | none observed |
| babc7326a065baea0000000000000063 | 606.172 | 2.216 | n/a | 0.000 | 0.000 | 0.995 | 602.740 | 0.022 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.095 | 2.216 | 0.004 | 0.095 | gw-r/thread-76/journal/page | none observed |
| babc7326a065baea0000000000000060 | 584.305 | 17.389 | n/a | 2.451 | 0.000 | 1.223 | 562.435 | 0.341 | 0.000 | 0.241 | 0.000 | n/a | n/a | 0.224 | 19.841 | 0.034 | 0.224 | gw-r/thread-77/journal/page | none observed |
| babc7326a065baea0000000000000052 | 540.300 | 5.456 | n/a | 0.000 | 0.000 | 0.595 | 534.009 | 0.018 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.130 | 5.456 | 0.010 | 0.130 | gw-r/thread-49/journal/page | none observed |
| babc7326a065baea0000000000000051 | 485.192 | 8.250 | n/a | 0.000 | 0.000 | 1.080 | 475.504 | 0.022 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.245 | 8.250 | 0.017 | 0.245 | gw-r/thread-49/journal/page | none observed |
| babc7326a065baea0000000000000068 | 354.142 | 3.697 | n/a | 0.000 | 0.000 | 0.615 | 346.664 | 2.971 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.074 | 3.697 | 0.010 | 0.074 | gw-r/thread-81/journal/page | none observed |
| babc7326a065baea0000000000000084 | 353.853 | 3.475 | n/a | 0.000 | 0.000 | 0.810 | 349.402 | 0.028 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.068 | 3.475 | 0.010 | 0.068 | gw-r/thread-83/journal/page | none observed |
| babc7326a065baea0000000000000081 | 275.913 | 5.676 | n/a | 0.000 | 0.000 | 1.108 | 268.690 | 0.169 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.174 | 5.676 | 0.021 | 0.174 | gw-r/thread-82/journal/page | none observed |
| babc7326a065baea0000000000000064 | 207.919 | 8.049 | n/a | 0.000 | 0.000 | 1.039 | 174.559 | 0.021 | 23.869 | 0.187 | 0.000 | n/a | n/a | 0.195 | 8.049 | 0.039 | 0.195 | gw-r/thread-71/journal/page | none observed |
| babc7326a065baea0000000000000067 | 153.888 | 2.280 | n/a | 0.000 | 0.000 | 0.820 | 150.402 | 0.022 | 0.000 | 0.254 | 0.000 | n/a | n/a | 0.110 | 2.280 | 0.015 | 0.110 | gw-r/thread-76/journal/page | none observed |
| babc7326a065baea000000000000005d | 115.056 | 91.992 | n/a | 4.438 | 0.000 | 1.808 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 16.818 | 96.431 | 0.838 | 16.818 | node-14/thread-2/replica.fetch-feed | none observed |
| babc7326a065baea0000000000000080 | 51.333 | 5.805 | n/a | 0.000 | 0.000 | 0.419 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 45.109 | 5.805 | 0.113 | 45.109 | node-14/thread-2/socket.wait-first-byte | none observed |
| babc7326a065baea0000000000000061 | 39.140 | 11.102 | n/a | 0.000 | 0.000 | 0.622 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 27.417 | 11.102 | 0.284 | 27.417 | node-14/thread-2/socket.wait-first-byte | none observed |
| babc7326a065baea000000000000009c | 12.550 | 1.916 | n/a | 0.000 | 0.000 | 0.284 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 10.350 | 1.916 | 0.153 | 10.350 | node-14/thread-2/socket.wait-first-byte | none observed |
| babc7326a065baea000000000000005e | 8.100 | 4.348 | n/a | 0.000 | 0.000 | 0.455 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.298 | 4.348 | 0.537 | 3.298 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 171.157 | n/a | n/a | n/a | 4.263 | n/a | 0.000 | 0.000 | 0.781 | 165.654 | 0.018 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.282 | 4.263 | 0.025 | 0.282 |
| p99 | 773.151 | n/a | n/a | n/a | 20.522 | n/a | 0.655 | 0.000 | 6.522 | 768.221 | 0.025 | 0.000 | 0.169 | 0.000 | n/a | n/a | 1.410 | 21.177 | 0.124 | 1.410 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea000000000000001d | 773.151 | 3.199 | n/a | 0.000 | 0.000 | 1.367 | 768.221 | 0.025 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.181 | 3.199 | 0.004 | 0.181 | gw-r/thread-48/journal/page | none observed |
| babc7326a065baea000000000000001c | 426.973 | 11.143 | n/a | 0.000 | 0.000 | 6.522 | 408.878 | 0.025 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.282 | 11.143 | 0.026 | 0.282 | gw-r/thread-50/journal/page | none observed |
| babc7326a065baea000000000000001e | 171.157 | 4.263 | n/a | 0.000 | 0.000 | 0.781 | 165.654 | 0.018 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.346 | 4.263 | 0.025 | 0.346 | gw-r/thread-53/journal/page | none observed |
| babc7326a065baea000000000000001a | 170.819 | 20.522 | n/a | 0.655 | 0.000 | 0.603 | 147.443 | 0.017 | 0.000 | 0.169 | 0.000 | n/a | n/a | 1.410 | 21.177 | 0.124 | 1.410 | gw-r/thread-52/journal/page | none observed |

## P3 / baseline / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 841.130 | n/a | n/a | n/a | 2.671 | n/a | 0.000 | 0.000 | 1.477 | 836.240 | 0.028 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.140 | 2.671 | 0.004 | 0.140 |
| p99 | 1006.506 | n/a | n/a | n/a | 3.301 | n/a | 0.000 | 0.000 | 4.666 | 1002.648 | 0.092 | 0.000 | 0.745 | 0.000 | n/a | n/a | 1.198 | 3.301 | 0.018 | 1.198 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea0000000000000023 | 1006.506 | 0.347 | n/a | 0.000 | 0.000 | 1.477 | 1002.648 | 0.092 | 0.000 | 0.745 | 0.000 | n/a | n/a | 1.198 | 0.347 | 0.000 | 1.198 | gw-r/thread-52/journal/page | none observed |
| babc7326a065baea0000000000000020 | 841.130 | 3.301 | n/a | 0.000 | 0.000 | 1.249 | 836.240 | 0.028 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.140 | 3.301 | 0.004 | 0.140 | gw-r/thread-72/journal/page | none observed |
| babc7326a065baea0000000000000022 | 151.632 | 2.671 | n/a | 0.000 | 0.000 | 4.666 | 144.102 | 0.022 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.078 | 2.671 | 0.018 | 0.078 | gw-r/thread-54/journal/page | none observed |

## P3 / L1 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 280.639 | n/a | n/a | n/a | 6.432 | n/a | 0.000 | 0.000 | 1.228 | 271.428 | 0.018 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.289 | 6.432 | 0.025 | 0.289 |
| p99 | 1004.731 | n/a | n/a | n/a | 6.992 | n/a | 0.000 | 0.000 | 5.229 | 999.918 | 0.031 | 0.000 | 0.145 | 0.000 | n/a | n/a | 24.511 | 6.992 | 0.334 | 24.511 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea000000000000002a | 1004.731 | 3.301 | n/a | 0.000 | 0.000 | 1.228 | 999.918 | 0.018 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.121 | 3.301 | 0.003 | 0.121 | gw-r/thread-48/journal/page | none observed |
| babc7326a065baea0000000000000028 | 667.460 | 6.636 | n/a | 0.000 | 0.000 | 5.229 | 655.184 | 0.019 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.289 | 6.636 | 0.010 | 0.289 | gw-r/thread-49/journal/page | none observed |
| babc7326a065baea0000000000000026 | 280.639 | 6.992 | n/a | 0.000 | 0.000 | 1.883 | 271.428 | 0.031 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.211 | 6.992 | 0.025 | 0.211 | gw-r/thread-54/journal/page | none observed |
| babc7326a065baea0000000000000024 | 29.645 | 4.198 | n/a | 0.000 | 0.000 | 0.937 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 24.511 | 4.198 | 0.142 | 24.511 | node-14/thread-2/socket.wait-first-byte | none observed |
| babc7326a065baea0000000000000025 | 19.240 | 6.432 | n/a | 0.000 | 0.000 | 0.487 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 12.321 | 6.432 | 0.334 | 12.321 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 362.665 | n/a | n/a | n/a | 7.158 | n/a | 0.000 | 0.000 | 1.116 | 353.313 | 0.029 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.165 | 7.158 | 0.017 | 0.165 |
| p99 | 1003.838 | n/a | n/a | n/a | 8.269 | n/a | 0.000 | 0.000 | 2.028 | 1001.240 | 0.065 | 0.000 | 0.289 | 0.000 | n/a | n/a | 1.155 | 8.269 | 0.039 | 1.155 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea0000000000000030 | 1003.838 | 0.224 | n/a | 0.000 | 0.000 | 0.983 | 1001.240 | 0.029 | 0.000 | 0.207 | 0.000 | n/a | n/a | 1.155 | 0.224 | 0.000 | 1.155 | gw-r/thread-53/journal/page | none observed |
| babc7326a065baea000000000000002d | 443.875 | 7.523 | n/a | 0.000 | 0.000 | 2.028 | 433.739 | 0.022 | 0.000 | 0.289 | 0.000 | n/a | n/a | 0.273 | 7.523 | 0.017 | 0.273 | gw-r/thread-71/journal/page | none observed |
| babc7326a065baea000000000000002f | 362.665 | 7.158 | n/a | 0.000 | 0.000 | 1.796 | 353.313 | 0.065 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.165 | 7.158 | 0.020 | 0.165 | gw-r/thread-48/journal/page | none observed |
| babc7326a065baea000000000000002b | 214.170 | 8.269 | n/a | 0.000 | 0.000 | 1.116 | 204.412 | 0.044 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.157 | 8.269 | 0.039 | 0.157 | gw-r/thread-71/journal/page | none observed |

## P3 / L16 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 414.715 | n/a | n/a | n/a | 6.626 | n/a | 0.000 | 0.000 | 1.160 | 410.377 | 0.015 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.239 | 6.626 | 0.014 | 0.239 |
| p99 | 936.017 | n/a | n/a | n/a | 11.038 | n/a | 0.000 | 0.000 | 2.145 | 927.616 | 0.038 | 0.000 | 0.157 | 0.000 | n/a | n/a | 33.667 | 11.038 | 0.276 | 33.667 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea0000000000000032 | 936.017 | 6.626 | n/a | 0.000 | 0.000 | 1.342 | 927.616 | 0.038 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.239 | 6.626 | 0.007 | 0.239 | gw-r/thread-50/journal/page | none observed |
| babc7326a065baea0000000000000037 | 594.845 | 8.133 | n/a | 0.000 | 0.000 | 2.145 | 584.230 | 0.016 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.192 | 8.133 | 0.014 | 0.192 | gw-r/thread-72/journal/page | none observed |
| babc7326a065baea0000000000000033 | 414.715 | 2.996 | n/a | 0.000 | 0.000 | 1.160 | 410.377 | 0.015 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.112 | 2.996 | 0.007 | 0.112 | gw-r/thread-51/journal/page | none observed |
| babc7326a065baea0000000000000031 | 39.929 | 11.038 | n/a | 0.000 | 0.000 | 0.326 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 28.565 | 11.038 | 0.276 | 28.565 | node-14/thread-2/socket.wait-first-byte | none observed |
| babc7326a065baea0000000000000035 | 37.425 | 3.401 | n/a | 0.000 | 0.000 | 0.356 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 33.667 | 3.401 | 0.091 | 33.667 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 314.024 | n/a | n/a | n/a | 4.747 | n/a | 0.000 | 0.000 | 0.965 | 309.761 | 0.018 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.147 | 4.747 | 0.009 | 0.147 |
| p99 | 778.311 | n/a | n/a | n/a | 7.648 | n/a | 0.000 | 0.000 | 1.596 | 766.482 | 3.280 | 23.701 | 0.136 | 0.000 | n/a | n/a | 0.238 | 7.648 | 0.027 | 0.238 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea0000000000000038 | 778.311 | 7.257 | n/a | 0.000 | 0.000 | 0.965 | 766.482 | 3.280 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.191 | 7.257 | 0.009 | 0.191 | gw-r/thread-50/journal/page | none observed |
| babc7326a065baea000000000000003c | 676.745 | 4.747 | n/a | 0.000 | 0.000 | 0.715 | 671.022 | 0.024 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.123 | 4.747 | 0.007 | 0.123 | gw-r/thread-84/journal/page | none observed |
| babc7326a065baea000000000000003b | 314.024 | 3.039 | n/a | 0.000 | 0.000 | 0.978 | 309.761 | 0.015 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.147 | 3.039 | 0.010 | 0.147 | gw-r/thread-84/journal/page | none observed |
| babc7326a065baea000000000000003a | 282.422 | 7.648 | n/a | 0.000 | 0.000 | 1.596 | 249.106 | 0.018 | 23.701 | 0.115 | 0.000 | n/a | n/a | 0.238 | 7.648 | 0.027 | 0.238 | gw-r/thread-50/journal/page | none observed |

## P3 / L256 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 280.028 | n/a | n/a | n/a | 3.099 | n/a | 0.000 | 0.000 | 1.244 | 275.613 | 0.020 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.167 | 3.099 | 0.011 | 0.167 |
| p99 | 739.866 | n/a | n/a | n/a | 6.518 | n/a | 0.000 | 0.000 | 3.548 | 731.542 | 0.028 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.299 | 6.518 | 0.029 | 0.299 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea0000000000000041 | 739.866 | 6.518 | n/a | 0.000 | 0.000 | 1.401 | 731.542 | 0.019 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.299 | 6.518 | 0.009 | 0.299 | gw-r/thread-49/journal/page | none observed |
| babc7326a065baea000000000000003f | 650.520 | 5.909 | n/a | 0.000 | 0.000 | 1.244 | 642.986 | 0.027 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.179 | 5.909 | 0.009 | 0.179 | gw-r/thread-74/journal/page | none observed |
| babc7326a065baea000000000000003e | 280.028 | 3.099 | n/a | 0.000 | 0.000 | 0.985 | 275.613 | 0.016 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.167 | 3.099 | 0.011 | 0.167 | gw-r/thread-71/journal/page | none observed |
| babc7326a065baea0000000000000043 | 211.069 | 2.466 | n/a | 0.000 | 0.000 | 0.771 | 207.633 | 0.020 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.127 | 2.466 | 0.012 | 0.127 | gw-r/thread-79/journal/page | none observed |
| babc7326a065baea0000000000000044 | 106.210 | 3.091 | n/a | 0.000 | 0.000 | 3.548 | 99.323 | 0.028 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.115 | 3.091 | 0.029 | 0.115 | gw-r/thread-75/journal/page | none observed |

## P3 / L1024 / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 945.056 | n/a | n/a | n/a | 2.919 | n/a | 0.000 | 0.000 | 1.166 | 937.614 | 0.014 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.095 | 2.919 | 0.003 | 0.095 |
| p99 | 1010.631 | n/a | n/a | n/a | 5.948 | n/a | 0.000 | 0.000 | 3.129 | 985.501 | 0.024 | 18.915 | 0.105 | 0.000 | n/a | n/a | 0.200 | 5.948 | 0.006 | 0.200 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea0000000000000047 | 1010.631 | 2.919 | n/a | 0.000 | 0.000 | 3.129 | 985.501 | 0.014 | 18.915 | 0.058 | 0.000 | n/a | n/a | 0.095 | 2.919 | 0.003 | 0.095 | gw-r/thread-82/journal/page | none observed |
| babc7326a065baea0000000000000046 | 945.056 | 5.948 | n/a | 0.000 | 0.000 | 1.166 | 937.614 | 0.024 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.200 | 5.948 | 0.006 | 0.200 | gw-r/thread-54/journal/page | none observed |

## P3 / recovery / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 310.835 | n/a | n/a | n/a | 6.309 | n/a | 0.000 | 0.000 | 0.913 | 302.640 | 0.021 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.729 | 6.309 | 0.020 | 0.729 |
| p99 | 1003.272 | n/a | n/a | n/a | 9.646 | n/a | 0.000 | 0.000 | 2.669 | 1001.051 | 0.113 | 0.000 | 0.132 | 0.000 | n/a | n/a | 39.621 | 9.646 | 0.137 | 39.621 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea0000000000000048 | 1003.272 | 0.160 | n/a | 0.000 | 0.000 | 0.781 | 1001.051 | 0.021 | 0.000 | 0.119 | 0.000 | n/a | n/a | 1.140 | 0.160 | 0.000 | 1.140 | gw-r/thread-72/journal/page | none observed |
| babc7326a065baea000000000000004c | 458.200 | 9.646 | n/a | 0.000 | 0.000 | 2.669 | 445.069 | 0.021 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.705 | 9.646 | 0.021 | 0.705 | gw-r/thread-76/journal/page | none observed |
| babc7326a065baea000000000000004a | 310.835 | 6.309 | n/a | 0.000 | 0.000 | 0.913 | 302.640 | 0.113 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.729 | 6.309 | 0.020 | 0.729 | gw-r/thread-77/journal/page | none observed |
| babc7326a065baea000000000000004d | 173.919 | 2.959 | n/a | 0.000 | 0.000 | 1.123 | 169.591 | 0.020 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.146 | 2.959 | 0.017 | 0.146 | gw-r/thread-71/journal/page | none observed |
| babc7326a065baea0000000000000049 | 46.412 | 6.375 | n/a | 0.000 | 0.000 | 0.416 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 39.621 | 6.375 | 0.137 | 39.621 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4mix / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 985.667 | n/a | n/a | n/a | 6.507 | n/a | 0.000 | 0.000 | 0.877 | 974.203 | 0.017 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.200 | 6.507 | 0.007 | 0.200 |
| p99 | 992.692 | n/a | n/a | n/a | 10.203 | n/a | 0.000 | 0.000 | 1.936 | 983.901 | 0.039 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.212 | 10.203 | 0.010 | 0.212 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea000000000000004f | 992.692 | 6.507 | n/a | 0.000 | 0.000 | 1.936 | 983.901 | 0.017 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.212 | 6.507 | 0.007 | 0.212 | gw-r/thread-51/journal/page | none observed |
| babc7326a065baea0000000000000050 | 985.667 | 10.203 | n/a | 0.000 | 0.000 | 0.877 | 974.203 | 0.039 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.200 | 10.203 | 0.010 | 0.200 | gw-r/thread-83/journal/page | none observed |

## P3 / p4h1 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 262.705 | n/a | n/a | n/a | 3.622 | n/a | 0.000 | 0.000 | 0.633 | 254.743 | 0.013 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.233 | 3.622 | 0.006 | 0.233 |
| p99 | 955.146 | n/a | n/a | n/a | 6.726 | n/a | 0.000 | 0.000 | 0.920 | 950.384 | 0.157 | 0.000 | 0.084 | 0.000 | n/a | n/a | 5.237 | 6.726 | 0.379 | 5.237 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea0000000000000056 | 955.146 | 3.622 | n/a | 0.000 | 0.000 | 0.633 | 950.384 | 0.017 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.405 | 3.622 | 0.004 | 0.405 | gw-r/thread-85/journal/page | none observed |
| babc7326a065baea0000000000000057 | 774.125 | 4.953 | n/a | 0.000 | 0.000 | 0.745 | 768.024 | 0.157 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.169 | 4.953 | 0.006 | 0.169 | gw-r/thread-80/journal/page | none observed |
| babc7326a065baea0000000000000058 | 262.705 | 6.726 | n/a | 0.000 | 0.000 | 0.920 | 254.743 | 0.013 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.233 | 6.726 | 0.026 | 0.233 | gw-r/thread-85/journal/page | none observed |
| babc7326a065baea0000000000000055 | 9.245 | 3.503 | n/a | 0.000 | 0.000 | 0.505 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 5.237 | 3.503 | 0.379 | 5.237 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow3 / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 153.535 | n/a | n/a | n/a | 4.198 | n/a | 0.000 | 0.000 | 0.793 | 131.424 | 0.007 | 16.905 | 0.023 | 0.000 | n/a | n/a | 0.185 | 4.198 | 0.027 | 0.185 |
| p99 | 1087.476 | n/a | n/a | n/a | 136.340 | n/a | 13.698 | 0.000 | 0.974 | 907.848 | 0.026 | 23.963 | 0.128 | 0.000 | n/a | n/a | 4.499 | 150.038 | 0.138 | 4.499 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea000000000000005c | 1087.476 | 136.340 | n/a | 13.698 | 0.000 | 0.974 | 907.848 | 0.026 | 23.963 | 0.128 | 0.000 | n/a | n/a | 4.499 | 150.038 | 0.138 | 4.499 | gw-r/thread-82/journal/page | none observed |
| babc7326a065baea000000000000005a | 153.535 | 4.198 | n/a | 0.000 | 0.000 | 0.793 | 131.424 | 0.007 | 16.905 | 0.023 | 0.000 | n/a | n/a | 0.185 | 4.198 | 0.027 | 0.185 | gw-r/thread-82/journal/page | none observed |

## P3 / p4h3 / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 217.492 | n/a | n/a | n/a | 2.387 | n/a | 0.000 | 0.000 | 0.836 | 206.046 | 0.020 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.198 | 2.387 | 0.013 | 0.198 |
| p99 | 1003.086 | n/a | n/a | n/a | 9.020 | n/a | 0.000 | 0.000 | 2.102 | 1000.893 | 0.285 | 0.000 | 0.114 | 0.000 | n/a | n/a | 38.021 | 9.020 | 0.072 | 38.021 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea0000000000000076 | 1003.086 | 0.147 | n/a | 0.000 | 0.000 | 0.750 | 1000.893 | 0.020 | 0.000 | 0.106 | 0.000 | n/a | n/a | 1.170 | 0.147 | 0.000 | 1.170 | gw-r/thread-75/journal/page | none observed |
| babc7326a065baea0000000000000073 | 530.060 | 6.877 | n/a | 0.000 | 0.000 | 0.933 | 521.932 | 0.020 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.198 | 6.877 | 0.013 | 0.198 | gw-r/thread-78/journal/page | none observed |
| babc7326a065baea0000000000000075 | 449.456 | 2.661 | n/a | 0.000 | 0.000 | 2.047 | 444.342 | 0.261 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.067 | 2.661 | 0.006 | 0.067 | gw-r/thread-75/journal/page | none observed |
| babc7326a065baea000000000000006c | 249.313 | 1.968 | n/a | 0.000 | 0.000 | 0.836 | 246.221 | 0.136 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.072 | 1.968 | 0.008 | 0.072 | gw-r/thread-51/journal/page | none observed |
| babc7326a065baea000000000000006a | 217.492 | 9.020 | n/a | 0.000 | 0.000 | 2.102 | 206.046 | 0.026 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.211 | 9.020 | 0.041 | 0.211 | gw-r/thread-81/journal/page | none observed |
| babc7326a065baea0000000000000071 | 136.320 | 3.335 | n/a | 0.000 | 0.000 | 0.873 | 131.612 | 0.285 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.102 | 3.335 | 0.024 | 0.102 | gw-r/thread-75/journal/page | none observed |
| babc7326a065baea000000000000006f | 40.549 | 2.012 | n/a | 0.000 | 0.000 | 0.516 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 38.021 | 2.012 | 0.050 | 38.021 | node-14/thread-2/socket.wait-first-byte | none observed |
| babc7326a065baea000000000000006d | 33.293 | 2.387 | n/a | 0.000 | 0.000 | 0.301 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 30.605 | 2.387 | 0.072 | 30.605 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow10 / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 131.976 | n/a | n/a | n/a | 82.301 | n/a | 5.070 | 0.000 | 0.997 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 6.851 | 88.507 | 0.554 | 6.851 |
| p99 | 536.634 | n/a | n/a | n/a | 99.201 | n/a | 8.000 | 0.000 | 2.132 | 454.499 | 0.624 | 24.915 | 0.156 | 0.000 | n/a | n/a | 46.561 | 105.596 | 0.884 | 46.561 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea000000000000007e | 536.634 | 74.127 | n/a | 5.269 | 0.000 | 1.159 | 454.499 | 0.013 | 0.000 | 0.088 | 0.000 | n/a | n/a | 1.479 | 79.396 | 0.148 | 1.479 | gw-r/thread-77/journal/page | none observed |
| babc7326a065baea0000000000000077 | 453.762 | 99.201 | n/a | 6.396 | 0.000 | 0.997 | 317.367 | 0.033 | 24.915 | 0.156 | 0.000 | n/a | n/a | 4.698 | 105.596 | 0.233 | 4.698 | gw-r/thread-80/journal/page | none observed |
| babc7326a065baea000000000000007b | 182.215 | 95.854 | n/a | 5.070 | 0.000 | 0.795 | 69.042 | 0.624 | 9.175 | 0.027 | 0.000 | n/a | n/a | 1.628 | 100.924 | 0.554 | 1.628 | node-14/thread-2/replica.fetch-feed | none observed |
| babc7326a065baea000000000000007f | 135.823 | 82.301 | n/a | 4.829 | 0.000 | 2.132 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 46.561 | 87.130 | 0.641 | 46.561 | node-14/thread-2/replica.fetch-feed | none observed |
| babc7326a065baea000000000000007c | 131.976 | 90.666 | n/a | 3.990 | 0.000 | 1.006 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 36.315 | 94.656 | 0.717 | 36.315 | node-14/thread-2/replica.fetch-feed | none observed |
| babc7326a065baea000000000000007a | 124.955 | 81.573 | n/a | 6.933 | 0.000 | 0.849 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 35.600 | 88.507 | 0.708 | 35.600 | node-14/thread-2/replica.fetch-feed | none observed |
| babc7326a065baea0000000000000079 | 118.064 | 96.358 | n/a | 8.000 | 0.000 | 1.146 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 12.560 | 104.359 | 0.884 | 12.560 | node-14/thread-2/replica.fetch-feed | none observed |
| babc7326a065baea000000000000007d | 11.018 | 3.781 | n/a | 0.000 | 0.000 | 0.385 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 6.851 | 3.781 | 0.343 | 6.851 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h10 / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 347.380 | n/a | n/a | n/a | 2.491 | n/a | 0.000 | 0.000 | 0.750 | 341.301 | 0.022 | 0.000 | 0.077 | 0.000 | n/a | n/a | 1.139 | 2.491 | 0.012 | 1.139 |
| p99 | 1002.915 | n/a | n/a | n/a | 7.851 | n/a | 0.000 | 0.000 | 1.105 | 1000.781 | 0.271 | 8.020 | 0.136 | 0.000 | n/a | n/a | 23.661 | 7.851 | 0.269 | 23.661 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea000000000000008b | 1002.915 | 0.182 | n/a | 0.000 | 0.000 | 0.671 | 1000.781 | 0.022 | 0.000 | 0.120 | 0.000 | n/a | n/a | 1.139 | 0.182 | 0.000 | 1.139 | gw-r/thread-83/journal/page | none observed |
| babc7326a065baea000000000000008d | 628.143 | 2.462 | n/a | 0.000 | 0.000 | 0.858 | 616.662 | 0.016 | 8.020 | 0.057 | 0.000 | n/a | n/a | 0.067 | 2.462 | 0.004 | 0.067 | gw-r/thread-78/journal/page | none observed |
| babc7326a065baea0000000000000086 | 427.174 | 7.851 | n/a | 0.000 | 0.000 | 1.058 | 417.751 | 0.271 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.127 | 7.851 | 0.018 | 0.127 | gw-r/thread-49/journal/page | none observed |
| babc7326a065baea000000000000008f | 347.380 | 2.834 | n/a | 0.000 | 0.000 | 1.105 | 341.301 | 0.028 | 0.000 | 0.136 | 0.000 | n/a | n/a | 1.976 | 2.834 | 0.008 | 1.976 | gw-r/thread-78/journal/page | none observed |
| babc7326a065baea000000000000008a | 204.238 | 2.491 | n/a | 0.000 | 0.000 | 0.750 | 200.791 | 0.063 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.065 | 2.491 | 0.012 | 0.065 | gw-r/thread-54/journal/page | none observed |
| babc7326a065baea000000000000008c | 27.083 | 3.147 | n/a | 0.000 | 0.000 | 0.276 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 23.661 | 3.147 | 0.116 | 23.661 | node-14/thread-2/socket.wait-first-byte | none observed |
| babc7326a065baea0000000000000088 | 8.111 | 2.183 | n/a | 0.000 | 0.000 | 0.344 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 5.584 | 2.183 | 0.269 | 5.584 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / presweep / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 786.391 | n/a | n/a | n/a | 2.098 | n/a | 0.000 | 0.000 | 0.746 | 783.334 | 0.021 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.054 | 2.098 | 0.003 | 0.054 |
| p99 | 848.994 | n/a | n/a | n/a | 5.124 | n/a | 0.000 | 0.000 | 1.884 | 846.269 | 0.034 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.096 | 5.124 | 0.025 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea0000000000000093 | 848.994 | 1.782 | n/a | 0.000 | 0.000 | 0.734 | 846.269 | 0.034 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.054 | 1.782 | 0.002 | 0.054 | gw-r/thread-50/journal/page | none observed |
| babc7326a065baea0000000000000090 | 786.391 | 2.098 | n/a | 0.000 | 0.000 | 0.746 | 783.334 | 0.015 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.054 | 2.098 | 0.003 | 0.054 | gw-r/thread-52/journal/page | none observed |
| babc7326a065baea0000000000000092 | 206.693 | 5.124 | n/a | 0.000 | 0.000 | 1.884 | 199.499 | 0.021 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.096 | 5.124 | 0.025 | 0.096 | gw-r/thread-78/journal/page | none observed |

## P3 / sweep / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.906 | n/a | n/a | n/a | 5.200 | n/a | 0.000 | 0.000 | 0.409 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 7.889 | 5.200 | 0.322 | 7.889 |
| p99 | 30.371 | n/a | n/a | n/a | 10.817 | n/a | 0.000 | 0.000 | 0.688 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 18.867 | 10.817 | 0.508 | 18.867 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babc7326a065baea0000000000000094 | 30.371 | 10.817 | n/a | 0.000 | 0.000 | 0.688 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 18.867 | 10.817 | 0.356 | 18.867 | node-14/thread-2/socket.wait-first-byte | none observed |
| babc7326a065baea000000000000009a | 22.486 | 5.135 | n/a | 0.000 | 0.000 | 0.616 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 16.735 | 5.135 | 0.228 | 16.735 | node-14/thread-2/socket.wait-first-byte | none observed |
| babc7326a065baea0000000000000097 | 22.342 | 7.203 | n/a | 0.000 | 0.000 | 0.357 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 14.783 | 7.203 | 0.322 | 14.783 | node-14/thread-2/socket.wait-first-byte | none observed |
| babc7326a065baea0000000000000095 | 11.906 | 5.778 | n/a | 0.000 | 0.000 | 0.569 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 5.558 | 5.778 | 0.485 | 5.558 | node-14/thread-2/socket.wait-first-byte | none observed |
| babc7326a065baea0000000000000096 | 10.417 | 2.119 | n/a | 0.000 | 0.000 | 0.409 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 7.889 | 2.119 | 0.203 | 7.889 | node-14/thread-2/socket.wait-first-byte | none observed |
| babc7326a065baea0000000000000098 | 10.229 | 5.200 | n/a | 0.000 | 0.000 | 0.358 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 4.670 | 5.200 | 0.508 | 4.670 | node-14/thread-2/replica.fetch-feed | none observed |
| babc7326a065baea0000000000000099 | 9.569 | 2.420 | n/a | 0.000 | 0.000 | 0.316 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 6.833 | 2.420 | 0.253 | 6.833 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.815 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.222 | 201.229 | 0.025 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 |
| p99 | 214.674 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.999 | 202.115 | 0.770 | 7.847 | 0.257 | 0.000 | n/a | n/a | 0.363 | 0.000 | 0.000 | 0.363 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca92a4f7f2497fe00000000000000009 | 214.674 | 0.000 | n/a | 0.000 | 0.000 | 3.999 | 202.115 | 0.094 | 7.847 | 0.257 | 0.000 | n/a | n/a | 0.363 | 0.000 | 0.000 | 0.363 | gw-r/thread-51/journal/page | none observed |
| ca92a4f7f2497fe00000000000000008 | 204.829 | 0.000 | n/a | 0.000 | 0.000 | 2.985 | 201.475 | 0.023 | 0.000 | 0.204 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-54/journal/page | none observed |
| ca92a4f7f2497fe0000000000000000f | 203.499 | 0.000 | n/a | 0.000 | 0.000 | 1.222 | 201.882 | 0.037 | 0.000 | 0.236 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-53/journal/page | none observed |
| ca92a4f7f2497fe0000000000000000e | 202.957 | 0.000 | n/a | 0.000 | 0.000 | 0.955 | 201.621 | 0.038 | 0.000 | 0.217 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-51/journal/page | none observed |
| ca92a4f7f2497fe0000000000000000d | 202.815 | 0.000 | n/a | 0.000 | 0.000 | 1.409 | 201.108 | 0.025 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-53/journal/page | none observed |
| ca92a4f7f2497fe0000000000000000b | 202.430 | 0.000 | n/a | 0.000 | 0.000 | 0.777 | 201.229 | 0.022 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-71/journal/page | none observed |
| ca92a4f7f2497fe0000000000000000c | 172.748 | 0.000 | n/a | 0.000 | 0.000 | 1.108 | 170.595 | 0.770 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-53/journal/page | none observed |
| ca92a4f7f2497fe00000000000000011 | 165.973 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 165.027 | 0.016 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-48/journal/page | none observed |
| ca92a4f7f2497fe00000000000000010 | 100.294 | 0.000 | n/a | 0.000 | 0.000 | 1.313 | 98.729 | 0.017 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-51/journal/page | none observed |

## P3 / baseline / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.417 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.025 | 201.060 | 0.024 | 0.000 | 0.170 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 |
| p99 | 203.006 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.203 | 201.546 | 0.042 | 0.000 | 0.228 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca92a4f7f2497fe00000000000000014 | 203.006 | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 201.546 | 0.042 | 0.000 | 0.228 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-52/journal/page | none observed |
| ca92a4f7f2497fe00000000000000013 | 202.786 | 0.000 | n/a | 0.000 | 0.000 | 1.203 | 201.269 | 0.019 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-54/journal/page | none observed |
| ca92a4f7f2497fe00000000000000012 | 202.417 | 0.000 | n/a | 0.000 | 0.000 | 1.025 | 201.060 | 0.024 | 0.000 | 0.170 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-53/journal/page | none observed |
| ca92a4f7f2497fe00000000000000015 | 163.737 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 162.594 | 0.032 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-54/journal/page | none observed |

## P3 / L16 / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 153.312 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.278 | 123.293 | 0.032 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 |
| p99 | 203.719 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.302 | 201.758 | 25.525 | 0.000 | 0.223 | 0.000 | n/a | n/a | 0.277 | 0.000 | 0.000 | 0.277 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca92a4f7f2497fe00000000000000021 | 203.719 | 0.000 | n/a | 0.000 | 0.000 | 1.592 | 201.758 | 0.032 | 0.000 | 0.212 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-51/journal/page | none observed |
| ca92a4f7f2497fe00000000000000022 | 203.520 | 0.000 | n/a | 0.000 | 0.000 | 1.278 | 201.682 | 0.059 | 0.000 | 0.223 | 0.000 | n/a | n/a | 0.277 | 0.000 | 0.000 | 0.277 | gw-r/thread-54/journal/page | none observed |
| ca92a4f7f2497fe00000000000000023 | 153.312 | 0.000 | n/a | 0.000 | 0.000 | 4.302 | 123.293 | 25.525 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-51/journal/page | none observed |
| ca92a4f7f2497fe0000000000000001f | 83.197 | 0.000 | n/a | 0.000 | 0.000 | 1.086 | 81.740 | 0.031 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-54/journal/page | none observed |

## P3 / L64 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.821 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.174 | 201.208 | 0.033 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 |
| p99 | 208.997 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.454 | 207.160 | 0.688 | 23.701 | 0.642 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca92a4f7f2497fe00000000000000024 | 208.997 | 0.000 | n/a | 0.000 | 0.000 | 1.375 | 207.160 | 0.038 | 0.000 | 0.280 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-54/journal/page | none observed |
| ca92a4f7f2497fe0000000000000002c | 204.997 | 0.000 | n/a | 0.000 | 0.000 | 1.115 | 203.454 | 0.044 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-50/journal/page | none observed |
| ca92a4f7f2497fe00000000000000025 | 204.263 | 0.000 | n/a | 0.000 | 0.000 | 1.318 | 202.510 | 0.032 | 0.000 | 0.285 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-49/journal/page | none observed |
| ca92a4f7f2497fe00000000000000028 | 204.156 | 0.000 | n/a | 0.000 | 0.000 | 2.454 | 177.582 | 0.021 | 23.701 | 0.171 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-54/journal/page | none observed |
| ca92a4f7f2497fe0000000000000002e | 203.910 | 0.000 | n/a | 0.000 | 0.000 | 1.745 | 201.748 | 0.085 | 0.000 | 0.198 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-50/journal/page | none observed |
| ca92a4f7f2497fe0000000000000002d | 203.821 | 0.000 | n/a | 0.000 | 0.000 | 1.421 | 201.544 | 0.034 | 0.000 | 0.642 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-52/journal/page | none observed |
| ca92a4f7f2497fe0000000000000002a | 202.291 | 0.000 | n/a | 0.000 | 0.000 | 0.833 | 201.167 | 0.020 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-50/journal/page | none observed |
| ca92a4f7f2497fe00000000000000026 | 202.275 | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 201.208 | 0.018 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-54/journal/page | none observed |
| ca92a4f7f2497fe0000000000000002b | 85.514 | 0.000 | n/a | 0.000 | 0.000 | 1.174 | 83.394 | 0.688 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-83/journal/page | none observed |
| ca92a4f7f2497fe00000000000000029 | 70.915 | 0.000 | n/a | 0.000 | 0.000 | 1.057 | 69.577 | 0.033 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-81/journal/page | none observed |
| ca92a4f7f2497fe00000000000000027 | 54.884 | 0.000 | n/a | 0.000 | 0.000 | 0.852 | 53.748 | 0.031 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-49/journal/page | none observed |

## P3 / L256 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.956 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.207 | 201.293 | 0.026 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 |
| p99 | 205.385 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.188 | 203.495 | 7.399 | 0.000 | 0.210 | 0.000 | n/a | n/a | 3.143 | 0.000 | 0.000 | 3.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca92a4f7f2497fe00000000000000037 | 205.385 | 0.000 | n/a | 0.000 | 0.000 | 1.498 | 203.495 | 0.027 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-48/journal/page | none observed |
| ca92a4f7f2497fe00000000000000032 | 203.622 | 0.000 | n/a | 0.000 | 0.000 | 1.207 | 201.992 | 0.024 | 0.000 | 0.210 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-51/journal/page | none observed |
| ca92a4f7f2497fe00000000000000036 | 203.381 | 0.000 | n/a | 0.000 | 0.000 | 1.275 | 201.717 | 0.052 | 0.000 | 0.184 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-79/journal/page | none observed |
| ca92a4f7f2497fe00000000000000035 | 203.355 | 0.000 | n/a | 0.000 | 0.000 | 2.188 | 200.897 | 0.021 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-51/journal/page | none observed |
| ca92a4f7f2497fe00000000000000033 | 202.956 | 0.000 | n/a | 0.000 | 0.000 | 1.309 | 201.293 | 0.026 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-49/journal/page | none observed |
| ca92a4f7f2497fe00000000000000030 | 202.888 | 0.000 | n/a | 0.000 | 0.000 | 1.147 | 201.404 | 0.019 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-76/journal/page | none observed |
| ca92a4f7f2497fe00000000000000039 | 202.122 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 201.066 | 0.012 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| ca92a4f7f2497fe00000000000000034 | 198.988 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 190.544 | 4.478 | 0.000 | 0.066 | 0.000 | n/a | n/a | 3.143 | 0.000 | 0.000 | 3.143 | gw-r/thread-51/journal/page | none observed |
| ca92a4f7f2497fe00000000000000038 | 57.173 | 0.000 | n/a | 0.000 | 0.000 | 0.930 | 48.628 | 7.399 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-79/journal/page | none observed |

## P3 / L1024 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.592 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.095 | 201.121 | 0.023 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 |
| p99 | 203.191 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.457 | 201.656 | 4.689 | 18.915 | 0.225 | 0.000 | n/a | n/a | 0.286 | 0.000 | 0.000 | 0.286 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca92a4f7f2497fe00000000000000042 | 203.191 | 0.000 | n/a | 0.000 | 0.000 | 1.095 | 201.656 | 0.037 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-52/journal/page | none observed |
| ca92a4f7f2497fe0000000000000003d | 203.001 | 0.000 | n/a | 0.000 | 0.000 | 1.259 | 201.312 | 0.020 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-82/journal/page | none observed |
| ca92a4f7f2497fe00000000000000044 | 202.922 | 0.000 | n/a | 0.000 | 0.000 | 1.070 | 201.503 | 0.020 | 0.000 | 0.174 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-52/journal/page | none observed |
| ca92a4f7f2497fe0000000000000003e | 202.899 | 0.000 | n/a | 0.000 | 0.000 | 0.868 | 201.639 | 0.041 | 0.000 | 0.225 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-80/journal/page | none observed |
| ca92a4f7f2497fe0000000000000003f | 202.653 | 0.000 | n/a | 0.000 | 0.000 | 1.111 | 201.121 | 0.015 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.286 | 0.000 | 0.000 | 0.286 | gw-r/thread-82/journal/page | none observed |
| ca92a4f7f2497fe00000000000000043 | 202.592 | 0.000 | n/a | 0.000 | 0.000 | 1.212 | 201.055 | 0.023 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-54/journal/page | none observed |
| ca92a4f7f2497fe0000000000000003c | 202.507 | 0.000 | n/a | 0.000 | 0.000 | 1.039 | 201.175 | 0.022 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-80/journal/page | none observed |
| ca92a4f7f2497fe00000000000000041 | 202.091 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 200.862 | 0.035 | 0.000 | 0.179 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-54/journal/page | none observed |
| ca92a4f7f2497fe00000000000000045 | 110.834 | 0.000 | n/a | 0.000 | 0.000 | 1.101 | 86.938 | 3.709 | 18.915 | 0.030 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-54/journal/page | none observed |
| ca92a4f7f2497fe0000000000000003b | 87.577 | 0.000 | n/a | 0.000 | 0.000 | 1.457 | 81.187 | 4.689 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-48/journal/page | none observed |

## P3 / recovery / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.311 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.966 | 201.098 | 0.022 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 |
| p99 | 206.928 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.589 | 205.587 | 2.976 | 0.000 | 1.171 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca92a4f7f2497fe00000000000000046 | 206.928 | 0.000 | n/a | 0.000 | 0.000 | 1.059 | 205.587 | 0.024 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-77/journal/page | none observed |
| ca92a4f7f2497fe0000000000000004b | 203.988 | 0.000 | n/a | 0.000 | 0.000 | 1.589 | 201.838 | 0.030 | 0.000 | 0.336 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-72/journal/page | none observed |
| ca92a4f7f2497fe0000000000000004d | 203.063 | 0.000 | n/a | 0.000 | 0.000 | 1.314 | 201.407 | 0.052 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-71/journal/page | none observed |
| ca92a4f7f2497fe00000000000000047 | 202.856 | 0.000 | n/a | 0.000 | 0.000 | 0.966 | 201.473 | 0.022 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-52/journal/page | none observed |
| ca92a4f7f2497fe0000000000000004e | 202.363 | 0.000 | n/a | 0.000 | 0.000 | 1.034 | 200.993 | 0.018 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-53/journal/page | none observed |
| ca92a4f7f2497fe00000000000000048 | 202.311 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 201.137 | 0.019 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-77/journal/page | none observed |
| ca92a4f7f2497fe00000000000000049 | 202.177 | 0.000 | n/a | 0.000 | 0.000 | 0.805 | 201.098 | 0.019 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-52/journal/page | none observed |
| ca92a4f7f2497fe00000000000000050 | 178.396 | 0.000 | n/a | 0.000 | 0.000 | 1.127 | 172.911 | 2.976 | 0.000 | 1.171 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-53/journal/page | none observed |
| ca92a4f7f2497fe0000000000000004a | 136.080 | 0.000 | n/a | 0.000 | 0.000 | 0.921 | 134.862 | 0.018 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-77/journal/page | none observed |
| ca92a4f7f2497fe0000000000000004c | 76.491 | 0.000 | n/a | 0.000 | 0.000 | 0.931 | 75.250 | 0.027 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-76/journal/page | none observed |

## P3 / p4mix / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.263 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.027 | 201.083 | 0.020 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 |
| p99 | 228.702 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 9.713 | 222.761 | 4.609 | 0.000 | 0.397 | 0.000 | n/a | n/a | 3.491 | 0.000 | 0.000 | 3.491 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca92a4f7f2497fe00000000000000052 | 228.702 | 0.000 | n/a | 0.000 | 0.000 | 2.264 | 222.761 | 0.021 | 0.000 | 0.165 | 0.000 | n/a | n/a | 3.491 | 0.000 | 0.000 | 3.491 | gw-r/thread-79/journal/page | none observed |
| ca92a4f7f2497fe00000000000000053 | 211.666 | 0.000 | n/a | 0.000 | 0.000 | 9.713 | 201.332 | 0.026 | 0.000 | 0.397 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-83/journal/page | none observed |
| ca92a4f7f2497fe00000000000000051 | 202.965 | 0.000 | n/a | 0.000 | 0.000 | 1.285 | 201.285 | 0.019 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-78/journal/page | none observed |
| ca92a4f7f2497fe00000000000000054 | 202.561 | 0.000 | n/a | 0.000 | 0.000 | 1.079 | 201.218 | 0.013 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-79/journal/page | none observed |
| ca92a4f7f2497fe00000000000000056 | 202.549 | 0.000 | n/a | 0.000 | 0.000 | 1.027 | 201.194 | 0.016 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-79/journal/page | none observed |
| ca92a4f7f2497fe00000000000000059 | 202.263 | 0.000 | n/a | 0.000 | 0.000 | 0.938 | 200.987 | 0.018 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-49/journal/page | none observed |
| ca92a4f7f2497fe00000000000000057 | 202.198 | 0.000 | n/a | 0.000 | 0.000 | 0.847 | 201.083 | 0.020 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| ca92a4f7f2497fe00000000000000058 | 202.065 | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 201.022 | 0.024 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-79/journal/page | none observed |
| ca92a4f7f2497fe0000000000000005a | 90.644 | 0.000 | n/a | 0.000 | 0.000 | 4.617 | 81.035 | 4.609 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.312 | 0.000 | 0.000 | 0.312 | gw-r/thread-79/journal/page | none observed |
| ca92a4f7f2497fe00000000000000055 | 52.402 | 0.000 | n/a | 0.000 | 0.000 | 0.789 | 48.437 | 3.002 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-83/journal/page | none observed |

## P3 / p4h1 / read (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.060 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.867 | 200.984 | 0.014 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 202.923 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.225 | 201.742 | 4.771 | 0.000 | 0.183 | 0.000 | n/a | n/a | 0.307 | 0.000 | 0.000 | 0.307 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca92a4f7f2497fe00000000000000067 | 202.923 | 0.000 | n/a | 0.000 | 0.000 | 0.890 | 201.714 | 0.024 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-80/journal/page | none observed |
| ca92a4f7f2497fe0000000000000006b | 202.918 | 0.000 | n/a | 0.000 | 0.000 | 0.791 | 201.742 | 0.057 | 0.000 | 0.183 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-85/journal/page | none observed |
| ca92a4f7f2497fe00000000000000064 | 202.885 | 0.000 | n/a | 0.000 | 0.000 | 1.075 | 201.513 | 0.014 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-80/journal/page | none observed |
| ca92a4f7f2497fe00000000000000068 | 202.667 | 0.000 | n/a | 0.000 | 0.000 | 1.101 | 201.130 | 0.015 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.307 | 0.000 | 0.000 | 0.307 | gw-r/thread-84/journal/page | none observed |
| ca92a4f7f2497fe0000000000000006c | 202.592 | 0.000 | n/a | 0.000 | 0.000 | 1.039 | 201.265 | 0.015 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-85/journal/page | none observed |
| ca92a4f7f2497fe0000000000000006d | 202.583 | 0.000 | n/a | 0.000 | 0.000 | 1.225 | 200.984 | 0.013 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 | gw-r/thread-50/journal/page | none observed |
| ca92a4f7f2497fe00000000000000063 | 202.310 | 0.000 | n/a | 0.000 | 0.000 | 0.990 | 201.086 | 0.014 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-48/journal/page | none observed |
| ca92a4f7f2497fe00000000000000062 | 202.060 | 0.000 | n/a | 0.000 | 0.000 | 0.838 | 200.966 | 0.013 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-80/journal/page | none observed |
| ca92a4f7f2497fe00000000000000069 | 202.045 | 0.000 | n/a | 0.000 | 0.000 | 0.899 | 200.893 | 0.015 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-80/journal/page | none observed |
| ca92a4f7f2497fe00000000000000066 | 201.980 | 0.000 | n/a | 0.000 | 0.000 | 0.729 | 201.006 | 0.014 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-48/journal/page | none observed |
| ca92a4f7f2497fe0000000000000006f | 201.932 | 0.000 | n/a | 0.000 | 0.000 | 0.714 | 200.971 | 0.016 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-50/journal/page | none observed |
| ca92a4f7f2497fe00000000000000065 | 117.718 | 0.000 | n/a | 0.000 | 0.000 | 0.715 | 116.761 | 0.008 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-48/journal/page | none observed |
| ca92a4f7f2497fe0000000000000006e | 94.681 | 0.000 | n/a | 0.000 | 0.000 | 0.867 | 93.474 | 0.011 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.277 | 0.000 | 0.000 | 0.277 | gw-r/thread-85/journal/page | none observed |
| ca92a4f7f2497fe0000000000000006a | 65.703 | 0.000 | n/a | 0.000 | 0.000 | 0.773 | 60.003 | 4.771 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-84/journal/page | none observed |

## P3 / grow3 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.165 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.974 | 200.986 | 0.021 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 |
| p99 | 272.960 | n/a | n/a | n/a | 0.628 | n/a | 0.000 | 0.000 | 11.541 | 201.577 | 132.812 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.260 | 0.628 | 0.002 | 0.260 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca92a4f7f2497fe00000000000000075 | 272.960 | 0.628 | n/a | 0.000 | 0.000 | 0.824 | 138.496 | 132.812 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.119 | 0.628 | 0.002 | 0.119 | gw-r/thread-50/journal/page | none observed |
| ca92a4f7f2497fe00000000000000072 | 212.923 | 0.000 | n/a | 0.000 | 0.000 | 11.541 | 200.986 | 0.019 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.260 | 0.000 | 0.000 | 0.260 | gw-r/thread-74/journal/page | none observed |
| ca92a4f7f2497fe00000000000000073 | 203.165 | 0.000 | n/a | 0.000 | 0.000 | 1.254 | 201.577 | 0.021 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-50/journal/page | none observed |
| ca92a4f7f2497fe00000000000000074 | 202.582 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 201.437 | 0.064 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-74/journal/page | none observed |
| ca92a4f7f2497fe00000000000000071 | 128.259 | 0.000 | n/a | 0.000 | 0.000 | 0.974 | 126.957 | 0.013 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.238 | 0.000 | 0.000 | 0.238 | gw-r/thread-50/journal/page | none observed |

## P3 / p4h3 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.288 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.978 | 200.960 | 0.023 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 |
| p99 | 203.241 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.977 | 201.433 | 3.463 | 0.000 | 0.271 | 0.000 | n/a | n/a | 0.299 | 0.000 | 0.000 | 0.299 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca92a4f7f2497fe00000000000000085 | 203.241 | 0.000 | n/a | 0.000 | 0.000 | 1.652 | 201.299 | 0.016 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-79/journal/page | none observed |
| ca92a4f7f2497fe0000000000000008b | 203.241 | 0.000 | n/a | 0.000 | 0.000 | 1.375 | 201.433 | 0.067 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-48/journal/page | none observed |
| ca92a4f7f2497fe00000000000000090 | 203.114 | 0.000 | n/a | 0.000 | 0.000 | 1.977 | 200.907 | 0.015 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-52/journal/page | none observed |
| ca92a4f7f2497fe00000000000000093 | 202.920 | 0.000 | n/a | 0.000 | 0.000 | 1.069 | 201.307 | 0.050 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.299 | 0.000 | 0.000 | 0.299 | gw-r/thread-80/journal/page | none observed |
| ca92a4f7f2497fe0000000000000008d | 202.760 | 0.000 | n/a | 0.000 | 0.000 | 1.156 | 201.307 | 0.015 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-48/journal/page | none observed |
| ca92a4f7f2497fe00000000000000092 | 202.654 | 0.000 | n/a | 0.000 | 0.000 | 0.955 | 201.362 | 0.031 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-52/journal/page | none observed |
| ca92a4f7f2497fe0000000000000008e | 202.288 | 0.000 | n/a | 0.000 | 0.000 | 0.752 | 201.243 | 0.022 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-52/journal/page | none observed |
| ca92a4f7f2497fe00000000000000091 | 202.180 | 0.000 | n/a | 0.000 | 0.000 | 0.914 | 200.937 | 0.017 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-80/journal/page | none observed |
| ca92a4f7f2497fe00000000000000083 | 201.913 | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 200.960 | 0.026 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-51/journal/page | none observed |
| ca92a4f7f2497fe0000000000000008a | 201.868 | 0.000 | n/a | 0.000 | 0.000 | 0.831 | 200.742 | 0.016 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-54/journal/page | none observed |
| ca92a4f7f2497fe00000000000000089 | 127.948 | 0.000 | n/a | 0.000 | 0.000 | 0.721 | 126.978 | 0.031 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-78/journal/page | none observed |
| ca92a4f7f2497fe00000000000000082 | 118.274 | 0.000 | n/a | 0.000 | 0.000 | 1.372 | 116.420 | 0.023 | 0.000 | 0.271 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-78/journal/page | none observed |
| ca92a4f7f2497fe0000000000000008c | 81.048 | 0.000 | n/a | 0.000 | 0.000 | 0.978 | 76.385 | 3.463 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-75/journal/page | none observed |

## P3 / grow10 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 108.382 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.131 | 98.135 | 0.030 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.252 | 0.000 | 0.000 | 0.252 |
| p99 | 231.386 | n/a | n/a | n/a | 0.814 | n/a | 0.000 | 0.000 | 2.091 | 201.846 | 145.414 | 0.000 | 0.278 | 0.000 | n/a | n/a | 0.607 | 0.814 | 0.008 | 0.607 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca92a4f7f2497fe00000000000000095 | 231.386 | 0.000 | n/a | 0.000 | 0.000 | 0.877 | 84.365 | 145.414 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.607 | 0.000 | 0.000 | 0.607 | gw-r/thread-75/gateway.admission-wait | none observed |
| ca92a4f7f2497fe0000000000000009d | 203.708 | 0.000 | n/a | 0.000 | 0.000 | 1.454 | 201.846 | 0.054 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-72/journal/page | none observed |
| ca92a4f7f2497fe00000000000000094 | 202.984 | 0.000 | n/a | 0.000 | 0.000 | 1.254 | 201.405 | 0.021 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-52/journal/page | none observed |
| ca92a4f7f2497fe0000000000000009c | 202.821 | 0.000 | n/a | 0.000 | 0.000 | 0.806 | 201.545 | 0.047 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.252 | 0.000 | 0.000 | 0.252 | gw-r/thread-74/journal/page | none observed |
| ca92a4f7f2497fe00000000000000099 | 108.382 | 0.814 | n/a | 0.000 | 0.000 | 2.091 | 105.088 | 0.023 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.259 | 0.814 | 0.008 | 0.259 | gw-r/thread-85/journal/page | none observed |
| ca92a4f7f2497fe00000000000000098 | 99.457 | 0.000 | n/a | 0.000 | 0.000 | 0.597 | 98.135 | 0.030 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.602 | 0.000 | 0.000 | 0.602 | gw-r/thread-75/journal/page | none observed |
| ca92a4f7f2497fe0000000000000009a | 88.998 | 0.644 | n/a | 0.000 | 0.000 | 0.856 | 87.000 | 0.058 | 0.000 | 0.278 | 0.000 | n/a | n/a | 0.163 | 0.644 | 0.007 | 0.163 | gw-r/thread-50/journal/page | none observed |
| ca92a4f7f2497fe0000000000000009f | 62.794 | 0.000 | n/a | 0.000 | 0.000 | 1.131 | 60.926 | 0.022 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.574 | 0.000 | 0.000 | 0.574 | gw-r/thread-72/journal/page | none observed |
| ca92a4f7f2497fe0000000000000009b | 56.368 | 0.000 | n/a | 0.000 | 0.000 | 1.155 | 54.907 | 0.014 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-74/journal/page | none observed |

## P3 / p4h10 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.247 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.062 | 201.074 | 0.023 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 |
| p99 | 204.031 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.105 | 201.825 | 15.042 | 0.000 | 0.184 | 0.000 | n/a | n/a | 0.329 | 0.000 | 0.000 | 0.329 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca92a4f7f2497fe000000000000000af | 204.031 | 0.000 | n/a | 0.000 | 0.000 | 1.827 | 201.825 | 0.061 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-48/journal/page | none observed |
| ca92a4f7f2497fe000000000000000b6 | 203.451 | 0.000 | n/a | 0.000 | 0.000 | 2.105 | 201.074 | 0.023 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-80/journal/page | none observed |
| ca92a4f7f2497fe000000000000000b4 | 203.353 | 0.000 | n/a | 0.000 | 0.000 | 1.350 | 201.673 | 0.021 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-80/journal/page | none observed |
| ca92a4f7f2497fe000000000000000b0 | 203.007 | 0.000 | n/a | 0.000 | 0.000 | 1.062 | 201.630 | 0.016 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-78/journal/page | none observed |
| ca92a4f7f2497fe000000000000000b1 | 202.782 | 0.000 | n/a | 0.000 | 0.000 | 1.130 | 201.332 | 0.022 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-48/journal/page | none observed |
| ca92a4f7f2497fe000000000000000b3 | 202.683 | 0.000 | n/a | 0.000 | 0.000 | 0.930 | 201.401 | 0.064 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-83/journal/page | none observed |
| ca92a4f7f2497fe000000000000000aa | 202.247 | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 201.043 | 0.058 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-83/journal/page | none observed |
| ca92a4f7f2497fe000000000000000ae | 202.172 | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 201.162 | 0.016 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-78/journal/page | none observed |
| ca92a4f7f2497fe000000000000000ad | 198.267 | 0.000 | n/a | 0.000 | 0.000 | 1.033 | 196.976 | 0.013 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-83/journal/page | none observed |
| ca92a4f7f2497fe000000000000000ab | 187.470 | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 186.400 | 0.020 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-79/journal/page | none observed |
| ca92a4f7f2497fe000000000000000b5 | 179.386 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 163.516 | 15.042 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-83/journal/page | none observed |
| ca92a4f7f2497fe000000000000000b2 | 131.798 | 0.000 | n/a | 0.000 | 0.000 | 1.149 | 128.019 | 2.313 | 0.000 | 0.184 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-78/journal/page | none observed |
| ca92a4f7f2497fe000000000000000a9 | 115.228 | 0.000 | n/a | 0.000 | 0.000 | 1.322 | 106.332 | 7.203 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.329 | 0.000 | 0.000 | 0.329 | gw-r/thread-81/journal/page | none observed |

## P3 / presweep / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.755 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 200.854 | 0.029 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 |
| p99 | 204.256 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.902 | 201.669 | 3.811 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca92a4f7f2497fe000000000000000b8 | 204.256 | 0.000 | n/a | 0.000 | 0.000 | 2.840 | 201.094 | 0.022 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-78/journal/page | none observed |
| ca92a4f7f2497fe000000000000000be | 203.317 | 0.000 | n/a | 0.000 | 0.000 | 1.307 | 201.669 | 0.029 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-77/journal/page | none observed |
| ca92a4f7f2497fe000000000000000ba | 202.702 | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 201.397 | 0.032 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-78/journal/page | none observed |
| ca92a4f7f2497fe000000000000000b9 | 202.420 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 201.309 | 0.029 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-85/journal/page | none observed |
| ca92a4f7f2497fe000000000000000bf | 202.060 | 0.000 | n/a | 0.000 | 0.000 | 0.867 | 200.932 | 0.019 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-78/journal/page | none observed |
| ca92a4f7f2497fe000000000000000bd | 201.755 | 0.000 | n/a | 0.000 | 0.000 | 0.602 | 200.854 | 0.018 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-78/journal/page | none observed |
| ca92a4f7f2497fe000000000000000bc | 197.213 | 0.000 | n/a | 0.000 | 0.000 | 0.929 | 192.987 | 2.975 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | gw-r/thread-52/journal/page | none observed |
| ca92a4f7f2497fe000000000000000c0 | 177.537 | 0.000 | n/a | 0.000 | 0.000 | 1.598 | 171.826 | 3.811 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-72/journal/page | none observed |
| ca92a4f7f2497fe000000000000000b7 | 120.687 | 0.000 | n/a | 0.000 | 0.000 | 2.902 | 117.594 | 0.011 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-75/journal/page | none observed |
| ca92a4f7f2497fe000000000000000bb | 114.740 | 0.000 | n/a | 0.000 | 0.000 | 2.711 | 110.833 | 1.010 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-85/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
