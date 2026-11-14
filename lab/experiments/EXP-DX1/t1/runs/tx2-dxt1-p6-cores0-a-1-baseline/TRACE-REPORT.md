# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (69.607 ms, trace `da68d8af77f9e071000000000000013a`); `gw-w/thread-45/gateway.admitted-work` (55.440 ms, trace `da68d8af77f9e0710000000000000245`); `tx/thread-85/transactor.triplex-function` (54.676 ms, trace `da68d8af77f9e0710000000000000134`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (65.645 ms, trace `da68d8af77f9e0710000000000000119`); `node-14/thread-0/socket.wait-first-byte` (37.309 ms, trace `da68d8af77f9e0710000000000000551`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p6-cores0-a-1-baseline`; source `7629065bb0a0221b3ec27af2f5a6f030bd33487f`; subjects 10000; tracing full.

Recorders: gateway, node, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 17638353.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 188 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13440.306 | 253.539 | 3.321 | 454 |
| L1 | 0 | 19975.356 | 345.630 | 15.216 | 668 |
| L4 | 0 | 19973.634 | 318.299 | 6.365 | 628 |
| L16 | 0 | 19979.797 | 340.193 | 7.959 | 686 |
| L64 | 0 | 19973.632 | 346.877 | 12.445 | 850 |
| L256 | 0 | 19992.666 | 419.865 | 10.105 | 708 |
| L1024 | 0 | 19987.678 | 3246.458 | 31.072 | 17046 |
| tail | 0 | 64580.219 | 10046.786 | 73.528 | 52913 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| da68d8af77f9e071000000000000013a | driver.queue.scheduler-late | 0.319 | none | 0 / 32 |
| da68d8af77f9e071000000000000013a | driver.queue.scheduler-dispatch | 0.103 | none | 0 / 32 |

Observed active steps while trace da68d8af77f9e071000000000000013a waited: []

| da68d8af77f9e0710000000000000245 | driver.queue.scheduler-dispatch | 0.052 | none | 0 / 32 |
| da68d8af77f9e0710000000000000245 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace da68d8af77f9e0710000000000000245 waited: []

| da68d8af77f9e0710000000000000134 | driver.queue.scheduler-dispatch | 0.104 | none | 0 / 32 |
| da68d8af77f9e0710000000000000134 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace da68d8af77f9e0710000000000000134 waited: []

| da68d8af77f9e0710000000000000119 | driver.queue.scheduler-dispatch | 0.053 | none | 0 / 32 |
| da68d8af77f9e0710000000000000119 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace da68d8af77f9e0710000000000000119 waited: []

| da68d8af77f9e0710000000000000551 | driver.queue.scheduler-late | 0.414 | none | 0 / 32 |
| da68d8af77f9e0710000000000000551 | driver.queue.scheduler-dispatch | 0.051 | none | 0 / 32 |

Observed active steps while trace da68d8af77f9e0710000000000000551 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.641 | 0.000 | 0.000 | 0.549 | 4.438 | 1.236 | 0.000 | 0.116 | 1.523 | 6.253 | 0.030 | n/a | 0.236 | 9.762 | 5.173 | n/a | 0.027 | 5.268 | 0.183 | 0.027 |
| p99 | 82.662 | 4.065 | 0.000 | 4.145 | 17.261 | n/a | 3.382 | 1.194 | 6.893 | 20.291 | 0.140 | n/a | 3.775 | 65.645 | 13.854 | n/a | 0.145 | 17.757 | 0.311 | 0.145 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e0710000000000000119 | 82.662 | 3.789 | 0.182 | 0.407 | 0.055 | 1.024 | 6.253 | 0.030 | n/a | 0.089 | 65.645 | 5.173 | n/a | 0.017 | 4.433 | 0.054 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000000f3 | 68.159 | 17.261 | 0.430 | 0.000 | 0.065 | 2.456 | 20.291 | 0.140 | n/a | 0.309 | 13.330 | 13.854 | n/a | 0.022 | 17.757 | 0.261 | 0.022 | tx/thread-85/transactor.triplex-function | none observed |
| da68d8af77f9e07100000000000000ef | 66.219 | 9.265 | n/a | 3.382 | 1.194 | 2.988 | 13.013 | 0.058 | n/a | 0.156 | 27.855 | 8.164 | n/a | 0.145 | 13.841 | 0.209 | 0.145 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000103 | 45.646 | 5.123 | 0.483 | 0.000 | 0.066 | 3.068 | 12.906 | 0.030 | n/a | 0.082 | 16.816 | 7.039 | n/a | 0.032 | 5.672 | 0.124 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000010b | 45.329 | 7.989 | 0.259 | 0.000 | 0.054 | 1.867 | 15.798 | 0.040 | n/a | 2.270 | 9.922 | 7.109 | n/a | 0.024 | 8.301 | 0.183 | 0.024 | gw-w/thread-46/gateway.admitted-work | none observed |
| da68d8af77f9e07100000000000000f7 | 38.969 | 4.971 | 0.245 | 0.000 | 0.052 | 4.679 | 15.387 | 0.031 | n/a | 0.354 | 7.142 | 6.078 | n/a | 0.029 | 5.268 | 0.135 | 0.029 | gw-w/thread-48/gateway.admitted-work | none observed |
| da68d8af77f9e0710000000000000116 | 38.689 | 8.897 | n/a | 2.031 | 1.123 | 1.523 | 1.770 | 0.022 | n/a | 0.120 | 16.867 | 6.284 | n/a | 0.052 | 12.051 | 0.311 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| da68d8af77f9e07100000000000000fd | 37.250 | 6.302 | 0.341 | 0.000 | 0.053 | 2.811 | 7.629 | 0.030 | n/a | 0.105 | 9.762 | 10.164 | n/a | 0.053 | 6.696 | 0.180 | 0.053 | tx/thread-85/transactor.triplex-function | none observed |
| da68d8af77f9e0710000000000000105 | 36.322 | 6.406 | 0.190 | 0.000 | 0.053 | 2.122 | 7.007 | 0.058 | n/a | 0.448 | 13.375 | 6.643 | n/a | 0.019 | 6.649 | 0.183 | 0.019 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000010d | 35.876 | 7.741 | 1.236 | 0.361 | 0.065 | 1.948 | 11.959 | 0.105 | n/a | 1.374 | 10.467 | 0.594 | n/a | 0.025 | 9.404 | 0.262 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000000fb | 35.005 | 6.169 | 0.196 | 0.000 | 0.042 | 2.290 | 9.540 | 0.052 | n/a | 0.587 | 12.606 | 3.501 | n/a | 0.022 | 6.407 | 0.183 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000000f8 | 34.061 | 3.615 | n/a | 2.354 | 0.879 | 1.207 | 5.025 | 0.027 | n/a | 0.543 | 13.344 | 7.026 | n/a | 0.042 | 6.847 | 0.201 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| da68d8af77f9e071000000000000011d | 33.131 | 3.886 | 0.202 | 0.354 | 0.052 | 1.599 | 8.101 | 0.064 | n/a | 0.668 | 10.807 | 7.373 | n/a | 0.024 | 4.494 | 0.136 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000127 | 32.292 | 3.655 | 0.238 | 0.194 | 0.055 | 6.893 | 10.721 | 0.028 | n/a | 0.078 | 5.646 | 4.758 | n/a | 0.025 | 4.142 | 0.128 | 0.025 | gw-w/thread-48/gateway.admitted-work | none observed |
| da68d8af77f9e0710000000000000106 | 31.641 | 5.355 | n/a | 3.197 | 0.194 | 0.847 | 1.735 | 0.022 | n/a | 3.775 | 9.876 | 6.618 | n/a | 0.023 | 8.746 | 0.276 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000010f | 31.462 | 7.590 | 0.403 | 0.618 | 0.041 | 2.627 | 7.656 | 0.053 | n/a | 0.818 | 8.015 | 3.620 | n/a | 0.020 | 8.652 | 0.275 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000121 | 31.073 | 4.045 | 0.322 | 0.000 | 0.105 | 1.251 | 9.057 | 0.029 | n/a | 0.382 | 8.541 | 7.296 | n/a | 0.047 | 4.472 | 0.144 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000115 | 29.947 | 5.007 | 0.275 | 0.367 | 0.116 | 2.615 | 7.705 | 0.031 | n/a | 0.178 | 9.810 | 3.799 | n/a | 0.043 | 5.765 | 0.193 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000100 | 26.471 | 4.438 | n/a | 0.000 | 0.234 | 1.386 | 5.864 | 0.027 | n/a | 0.098 | 10.585 | 3.810 | n/a | 0.030 | 4.672 | 0.176 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000108 | 23.540 | 2.820 | n/a | 0.000 | 0.230 | 1.260 | 5.424 | 0.021 | n/a | 0.468 | 7.292 | 6.000 | n/a | 0.026 | 3.051 | 0.130 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.574 | 0.000 | 0.000 | 0.549 | 2.777 | n/a | 0.000 | 0.632 | 0.853 | 1.947 | 0.027 | n/a | 0.151 | 6.116 | 2.613 | n/a | 0.037 | 3.329 | 0.218 | 0.037 |
| p99 | 34.061 | 1.189 | 0.000 | 0.967 | 4.650 | n/a | 2.354 | 1.007 | 1.539 | 5.025 | 0.061 | n/a | 0.543 | 13.344 | 7.026 | n/a | 0.066 | 6.847 | 0.283 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e07100000000000000f8 | 34.061 | 3.615 | n/a | 2.354 | 0.879 | 1.207 | 5.025 | 0.027 | n/a | 0.543 | 13.344 | 7.026 | n/a | 0.042 | 6.847 | 0.201 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| da68d8af77f9e071000000000000011e | 23.467 | 2.423 | n/a | 0.000 | 0.276 | 0.809 | 4.098 | 0.024 | n/a | 0.118 | 9.006 | 6.685 | n/a | 0.028 | 2.699 | 0.115 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000112 | 21.338 | 4.650 | n/a | 0.000 | 1.007 | 0.831 | 1.663 | 0.023 | n/a | 0.147 | 9.021 | 3.946 | n/a | 0.051 | 5.657 | 0.265 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000000f4 | 15.271 | 2.777 | n/a | 0.000 | 0.552 | 1.129 | 1.968 | 0.027 | n/a | 0.408 | 5.731 | 2.613 | n/a | 0.066 | 3.329 | 0.218 | 0.066 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000125 | 14.574 | 1.899 | n/a | 0.000 | 0.151 | 0.772 | 1.806 | 0.030 | n/a | 0.113 | 6.116 | 3.660 | n/a | 0.027 | 2.050 | 0.141 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000011a | 14.311 | 3.243 | n/a | 0.000 | 0.720 | 1.539 | 1.639 | 0.030 | n/a | 0.151 | 6.168 | 0.783 | n/a | 0.037 | 3.963 | 0.277 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000000fe | 13.220 | 2.997 | n/a | 0.000 | 0.744 | 0.853 | 3.794 | 0.038 | n/a | 0.121 | 4.103 | 0.528 | n/a | 0.042 | 3.741 | 0.283 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000122 | 12.860 | 2.199 | n/a | 0.000 | 0.387 | 1.161 | 1.947 | 0.061 | n/a | 0.236 | 6.072 | 0.770 | n/a | 0.025 | 2.587 | 0.201 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000110 | 11.822 | 2.410 | n/a | 0.000 | 0.632 | 0.752 | 1.558 | 0.021 | n/a | 0.410 | 5.491 | 0.519 | n/a | 0.027 | 3.042 | 0.257 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.412 | 0.000 | 0.000 | 0.778 | 2.622 | 0.225 | 0.000 | 0.111 | 1.791 | 1.381 | 0.017 | n/a | 0.058 | 5.725 | 0.667 | n/a | 0.017 | 2.756 | 0.208 | 0.017 |
| p99 | 27.877 | 0.426 | 0.000 | 1.530 | 5.064 | n/a | 0.410 | 0.134 | 1.899 | 9.825 | 0.031 | n/a | 0.438 | 5.749 | 4.057 | n/a | 0.069 | 5.810 | 0.222 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e0710000000000000129 | 27.877 | 5.064 | 0.225 | 0.410 | 0.111 | 1.899 | 9.825 | 0.031 | n/a | 0.438 | 5.749 | 4.057 | n/a | 0.069 | 5.810 | 0.208 | 0.069 | gw-w/thread-46/gateway.admitted-work | none observed |
| da68d8af77f9e0710000000000000281 | 12.412 | 2.622 | n/a | 0.000 | 0.134 | 1.791 | 1.381 | 0.017 | n/a | 0.058 | 5.725 | 0.667 | n/a | 0.017 | 2.756 | 0.222 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.358 | 0.336 | 0.000 | 0.591 | 3.794 | n/a | 0.000 | 0.156 | 1.185 | 4.159 | 0.035 | n/a | 0.331 | 7.943 | 3.660 | n/a | 0.032 | 4.404 | 0.184 | 0.032 |
| p99 | 107.229 | 3.874 | 0.000 | 2.955 | 7.951 | n/a | 2.547 | 5.793 | 4.458 | 18.486 | 0.078 | n/a | 4.405 | 69.607 | 54.676 | n/a | 0.073 | 9.873 | 0.401 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e071000000000000013a | 107.229 | 4.445 | n/a | 2.019 | 0.422 | 2.961 | 12.502 | 0.052 | n/a | 0.488 | 69.607 | 14.689 | n/a | 0.043 | 6.886 | 0.064 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| da68d8af77f9e0710000000000000134 | 83.013 | 3.577 | 0.203 | 0.000 | 0.106 | 1.160 | 5.624 | 0.029 | n/a | 0.410 | 17.186 | 54.676 | n/a | 0.043 | 3.885 | 0.047 | 0.043 | tx/thread-85/transactor.triplex-function | none observed |
| da68d8af77f9e0710000000000000179 | 65.881 | 3.668 | 0.263 | 0.000 | 0.035 | 1.114 | 10.697 | 0.052 | n/a | 0.612 | 7.982 | 41.439 | n/a | 0.018 | 3.967 | 0.060 | 0.018 | tx/thread-85/transactor.triplex-function | driver.reader-basis.broadcast 0.112ms |
| da68d8af77f9e0710000000000000137 | 41.959 | 4.289 | 0.924 | 0.000 | 0.050 | 1.185 | 6.786 | 0.029 | n/a | 0.089 | 17.876 | 10.705 | n/a | 0.027 | 5.262 | 0.125 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000145 | 40.747 | 3.670 | 0.267 | 0.000 | 0.156 | 1.422 | 9.639 | 0.034 | n/a | 0.113 | 15.947 | 9.448 | n/a | 0.052 | 4.092 | 0.100 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| da68d8af77f9e071000000000000014e | 38.552 | 4.450 | 0.188 | 0.490 | 0.052 | 4.240 | 16.576 | 0.048 | n/a | 0.421 | 8.605 | 3.457 | n/a | 0.023 | 5.181 | 0.134 | 0.023 | gw-w/thread-46/gateway.admitted-work | driver.expected-state.bind-receipt 2.073ms; driver.publication.persist-deferred 1.178ms; driver.reader-basis.broadcast 0.045ms |
| da68d8af77f9e071000000000000013f | 38.387 | 3.817 | 0.239 | 0.000 | 0.145 | 1.382 | 7.695 | 0.037 | n/a | 0.156 | 19.270 | 5.580 | n/a | 0.065 | 4.202 | 0.109 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.056ms |
| da68d8af77f9e0710000000000000165 | 35.809 | 3.993 | 0.366 | 0.000 | 0.045 | 1.344 | 15.477 | 0.065 | n/a | 0.192 | 7.329 | 6.970 | n/a | 0.027 | 4.404 | 0.123 | 0.027 | gw-w/thread-46/gateway.admitted-work | driver.reader-basis.broadcast 0.080ms |
| da68d8af77f9e071000000000000012b | 35.314 | 6.665 | 0.259 | 0.000 | 0.052 | 2.231 | 11.774 | 0.045 | n/a | 0.491 | 6.482 | 7.288 | n/a | 0.027 | 6.977 | 0.198 | 0.027 | gw-w/thread-42/gateway.admitted-work | none observed |
| da68d8af77f9e0710000000000000168 | 34.158 | 3.334 | 0.173 | 0.275 | 0.024 | 0.893 | 18.486 | 0.041 | n/a | 0.201 | 7.059 | 3.660 | n/a | 0.014 | 3.806 | 0.111 | 0.014 | gw-w/thread-44/gateway.admitted-work | driver.publication.persist-deferred 1.143ms; driver.expected-state.bind-receipt 1.093ms; driver.reader-basis.broadcast 0.068ms |
| da68d8af77f9e0710000000000000155 | 33.694 | 4.332 | 0.238 | 0.000 | 0.095 | 1.469 | 9.565 | 0.077 | n/a | 0.803 | 10.284 | 6.786 | n/a | 0.044 | 4.665 | 0.138 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| da68d8af77f9e071000000000000016b | 32.895 | 4.286 | 0.299 | 0.331 | 0.052 | 1.368 | 6.409 | 0.035 | n/a | 0.490 | 15.203 | 4.400 | n/a | 0.024 | 4.968 | 0.151 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.096ms |
| da68d8af77f9e0710000000000000131 | 32.288 | 2.401 | n/a | 0.000 | 0.963 | 0.730 | 1.538 | 0.020 | n/a | 0.485 | 19.520 | 6.606 | n/a | 0.025 | 3.364 | 0.104 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| da68d8af77f9e0710000000000000149 | 31.132 | 5.516 | 0.257 | 0.000 | 0.179 | 1.323 | 9.700 | 0.034 | n/a | 0.077 | 9.890 | 4.081 | n/a | 0.073 | 5.953 | 0.191 | 0.073 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.050ms |
| da68d8af77f9e071000000000000012d | 30.932 | 4.271 | 0.366 | 0.331 | 0.150 | 1.592 | 10.250 | 0.035 | n/a | 0.144 | 7.943 | 5.794 | n/a | 0.057 | 5.118 | 0.165 | 0.057 | gw-w/thread-46/gateway.admitted-work | none observed |
| da68d8af77f9e0710000000000000171 | 30.156 | 6.743 | 0.241 | 0.490 | 0.084 | 2.240 | 9.104 | 0.071 | n/a | 0.137 | 6.776 | 4.232 | n/a | 0.038 | 7.559 | 0.251 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.053ms |
| da68d8af77f9e0710000000000000141 | 28.800 | 3.366 | 0.177 | 0.000 | 0.052 | 1.761 | 7.220 | 0.078 | n/a | 0.199 | 8.958 | 6.965 | n/a | 0.023 | 3.595 | 0.125 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000014d | 28.019 | 5.573 | n/a | 1.308 | 0.641 | 0.497 | 2.125 | 0.023 | n/a | 3.380 | 11.036 | 3.416 | n/a | 0.020 | 7.522 | 0.268 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000017b | 27.538 | 4.004 | 0.270 | 0.238 | 0.062 | 1.604 | 10.489 | 0.040 | n/a | 0.113 | 7.469 | 3.219 | n/a | 0.032 | 4.573 | 0.166 | 0.032 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.088ms |
| da68d8af77f9e0710000000000000162 | 27.299 | 5.111 | n/a | 0.000 | 0.491 | 0.964 | 1.836 | 0.020 | n/a | 0.371 | 9.408 | 9.048 | n/a | 0.050 | 5.602 | 0.205 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.375 | 0.580 | 0.000 | 0.456 | 2.401 | n/a | 0.000 | 0.691 | 0.802 | 1.538 | 0.023 | n/a | 0.415 | 6.220 | 1.037 | n/a | 0.032 | 3.364 | 0.252 | 0.032 |
| p99 | 32.288 | 1.007 | 0.000 | 0.890 | 7.951 | n/a | 0.000 | 5.793 | 4.458 | 4.159 | 0.053 | n/a | 1.236 | 19.520 | 6.606 | n/a | 0.054 | 8.383 | 0.401 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e0710000000000000131 | 32.288 | 2.401 | n/a | 0.000 | 0.963 | 0.730 | 1.538 | 0.020 | n/a | 0.485 | 19.520 | 6.606 | n/a | 0.025 | 3.364 | 0.104 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| da68d8af77f9e0710000000000000135 | 22.975 | 7.951 | n/a | 0.000 | 0.432 | 4.458 | 4.159 | 0.043 | n/a | 0.583 | 4.699 | 0.599 | n/a | 0.050 | 8.383 | 0.365 | 0.050 | node-14/thread-0/driver.execute | none observed |
| da68d8af77f9e0710000000000000175 | 19.935 | 2.205 | n/a | 0.000 | 5.793 | 0.786 | 3.131 | 0.053 | n/a | 0.204 | 6.709 | 1.037 | n/a | 0.017 | 7.998 | 0.401 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.221ms |
| da68d8af77f9e071000000000000015a | 17.797 | 3.528 | n/a | 0.000 | 0.960 | 1.032 | 1.275 | 0.023 | n/a | 1.236 | 6.711 | 2.977 | n/a | 0.054 | 4.489 | 0.252 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000016c | 17.375 | 3.119 | n/a | 0.000 | 0.835 | 1.092 | 1.310 | 0.023 | n/a | 0.140 | 9.524 | 1.296 | n/a | 0.036 | 3.954 | 0.228 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.100ms |
| da68d8af77f9e0710000000000000146 | 15.048 | 2.047 | n/a | 0.000 | 0.318 | 0.802 | 1.691 | 0.023 | n/a | 0.498 | 6.220 | 3.427 | n/a | 0.023 | 2.365 | 0.157 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000015f | 10.768 | 2.628 | n/a | 0.000 | 0.649 | 0.909 | 2.045 | 0.037 | n/a | 0.236 | 3.760 | 0.455 | n/a | 0.050 | 3.277 | 0.304 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000150 | 9.545 | 2.217 | n/a | 0.000 | 0.691 | 0.759 | 1.155 | 0.019 | n/a | 0.415 | 3.685 | 0.573 | n/a | 0.032 | 2.908 | 0.305 | 0.032 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.428 | 0.124 | 0.000 | 0.516 | 3.784 | 0.303 | 0.000 | 0.167 | 1.283 | 4.692 | 0.035 | n/a | 0.305 | 6.628 | 3.883 | n/a | 0.029 | 4.405 | 0.195 | 0.029 |
| p99 | 57.854 | 1.989 | 0.141 | 2.219 | 7.854 | n/a | 0.498 | 1.349 | 4.524 | 32.197 | 0.088 | n/a | 3.427 | 42.358 | 10.945 | n/a | 0.073 | 9.050 | 0.355 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e0710000000000000187 | 57.854 | 3.439 | n/a | 0.000 | 0.428 | 1.112 | 4.692 | 0.028 | n/a | 0.110 | 42.358 | 5.644 | n/a | 0.042 | 3.867 | 0.067 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| da68d8af77f9e07100000000000001a8 | 48.917 | 4.268 | 0.243 | 0.232 | 0.043 | 1.680 | 32.197 | 0.049 | n/a | 0.153 | 5.903 | 4.122 | n/a | 0.026 | 4.787 | 0.098 | 0.026 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.023ms |
| da68d8af77f9e07100000000000001a2 | 44.665 | 5.632 | 0.248 | 0.477 | 0.045 | 1.668 | 17.782 | 0.046 | n/a | 0.419 | 13.610 | 4.712 | n/a | 0.026 | 6.402 | 0.143 | 0.026 | gw-w/thread-46/gateway.admitted-work | driver.reader-basis.broadcast 0.057ms |
| da68d8af77f9e07100000000000001a4 | 37.855 | 7.854 | 0.209 | 0.371 | 0.049 | 1.828 | 7.618 | 0.033 | n/a | 3.233 | 7.028 | 9.603 | n/a | 0.029 | 8.483 | 0.224 | 0.029 | tx/thread-85/transactor.triplex-function | driver.reader-basis.broadcast 0.019ms |
| da68d8af77f9e07100000000000001b2 | 37.114 | 3.893 | 0.227 | 0.259 | 0.148 | 2.033 | 18.216 | 0.088 | n/a | 0.100 | 7.758 | 4.329 | n/a | 0.063 | 4.527 | 0.122 | 0.063 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.021ms |
| da68d8af77f9e071000000000000017f | 35.382 | 4.261 | 0.274 | 0.314 | 0.074 | 2.215 | 17.174 | 0.049 | n/a | 0.169 | 6.921 | 3.893 | n/a | 0.038 | 4.923 | 0.139 | 0.038 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.079ms |
| da68d8af77f9e071000000000000019c | 34.576 | 3.440 | 0.181 | 0.238 | 0.036 | 1.283 | 12.059 | 0.066 | n/a | 0.574 | 10.587 | 6.091 | n/a | 0.021 | 3.895 | 0.113 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| da68d8af77f9e07100000000000001b5 | 34.220 | 7.134 | n/a | 0.000 | 0.310 | 4.186 | 1.977 | 0.026 | n/a | 0.130 | 9.471 | 10.945 | n/a | 0.042 | 7.444 | 0.218 | 0.042 | tx/thread-85/transactor.triplex-function | none observed |
| da68d8af77f9e0710000000000000196 | 33.770 | 3.498 | 0.177 | 0.283 | 0.042 | 1.241 | 12.848 | 0.073 | n/a | 1.324 | 10.858 | 3.402 | n/a | 0.025 | 3.999 | 0.118 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| da68d8af77f9e0710000000000000197 | 33.424 | 7.829 | n/a | 0.000 | 1.221 | 1.041 | 4.954 | 0.032 | n/a | 0.149 | 11.220 | 6.914 | n/a | 0.063 | 9.050 | 0.271 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000019a | 32.008 | 3.774 | 0.303 | 0.330 | 0.069 | 1.409 | 14.548 | 0.044 | n/a | 0.729 | 5.854 | 4.909 | n/a | 0.040 | 4.475 | 0.140 | 0.040 | gw-w/thread-42/gateway.admitted-work | driver.reader-basis.broadcast 0.027ms |
| da68d8af77f9e0710000000000000183 | 30.171 | 5.844 | 0.297 | 0.498 | 0.120 | 1.591 | 7.141 | 0.031 | n/a | 0.066 | 9.886 | 4.649 | n/a | 0.050 | 6.759 | 0.224 | 0.050 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| da68d8af77f9e07100000000000001a0 | 29.536 | 5.266 | 0.236 | 0.401 | 0.063 | 4.524 | 8.489 | 0.045 | n/a | 0.122 | 6.775 | 3.587 | n/a | 0.027 | 5.966 | 0.202 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| da68d8af77f9e0710000000000000186 | 29.237 | 5.034 | 0.249 | 0.000 | 0.135 | 1.195 | 9.719 | 0.035 | n/a | 0.386 | 8.838 | 3.574 | n/a | 0.073 | 5.417 | 0.185 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| da68d8af77f9e071000000000000018e | 29.073 | 3.851 | 0.260 | 0.368 | 0.104 | 4.006 | 8.284 | 0.049 | n/a | 2.298 | 6.440 | 3.365 | n/a | 0.047 | 4.583 | 0.158 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| da68d8af77f9e07100000000000001c1 | 28.548 | 4.026 | 0.281 | 0.374 | 0.162 | 2.684 | 7.394 | 0.049 | n/a | 1.174 | 6.030 | 6.316 | n/a | 0.059 | 4.843 | 0.170 | 0.059 | tx/thread-85/transactor.triplex-function | driver.reader-basis.broadcast 0.052ms |
| da68d8af77f9e07100000000000001b9 | 27.330 | 4.271 | n/a | 0.000 | 1.028 | 2.062 | 4.008 | 0.024 | n/a | 0.160 | 9.554 | 6.166 | n/a | 0.058 | 5.298 | 0.194 | 0.058 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001a9 | 26.045 | 3.784 | n/a | 0.000 | 0.618 | 2.134 | 2.908 | 0.055 | n/a | 1.039 | 7.929 | 7.549 | n/a | 0.029 | 4.402 | 0.169 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000017c | 25.880 | 2.044 | n/a | 0.000 | 0.317 | 1.326 | 1.277 | 0.025 | n/a | 0.185 | 13.300 | 7.384 | n/a | 0.023 | 2.361 | 0.091 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001bc | 25.428 | 4.762 | 0.166 | 0.000 | 0.052 | 1.097 | 8.696 | 0.031 | n/a | 0.088 | 6.628 | 3.883 | n/a | 0.026 | 4.980 | 0.196 | 0.026 | gw-w/thread-47/gateway.admitted-work | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.805 | 0.248 | 0.000 | 0.481 | 2.044 | n/a | 0.000 | 0.689 | 1.080 | 1.277 | 0.025 | n/a | 0.303 | 5.632 | 1.196 | n/a | 0.023 | 3.041 | 0.184 | 0.023 |
| p99 | 25.880 | 1.046 | 0.141 | 0.809 | 3.393 | n/a | 0.000 | 1.349 | 4.003 | 2.131 | 0.054 | n/a | 3.427 | 13.300 | 7.384 | n/a | 0.052 | 4.175 | 0.292 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e071000000000000017c | 25.880 | 2.044 | n/a | 0.000 | 0.317 | 1.326 | 1.277 | 0.025 | n/a | 0.185 | 13.300 | 7.384 | n/a | 0.023 | 2.361 | 0.091 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001a5 | 24.382 | 2.507 | n/a | 0.000 | 0.689 | 4.003 | 1.524 | 0.026 | n/a | 3.427 | 10.969 | 1.196 | n/a | 0.041 | 3.197 | 0.131 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000018b | 20.927 | 3.192 | n/a | 0.000 | 0.649 | 2.060 | 1.135 | 0.021 | n/a | 0.399 | 7.102 | 6.332 | n/a | 0.037 | 3.842 | 0.184 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000180 | 19.557 | 3.393 | n/a | 0.000 | 0.782 | 1.133 | 2.131 | 0.054 | n/a | 0.303 | 9.139 | 2.569 | n/a | 0.052 | 4.175 | 0.213 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000193 | 18.274 | 1.915 | n/a | 0.000 | 1.126 | 0.925 | 1.826 | 0.042 | n/a | 0.768 | 5.436 | 6.213 | n/a | 0.023 | 3.041 | 0.166 | 0.023 | tx/thread-85/transactor.triplex-function | none observed |
| da68d8af77f9e07100000000000001c6 | 12.805 | 1.728 | n/a | 0.000 | 0.434 | 1.081 | 1.037 | 0.020 | n/a | 0.133 | 4.960 | 3.395 | n/a | 0.019 | 2.161 | 0.169 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001bd | 12.083 | 1.725 | n/a | 0.000 | 1.349 | 0.488 | 0.859 | 0.019 | n/a | 0.305 | 6.455 | 0.862 | n/a | 0.021 | 3.073 | 0.254 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001af | 11.811 | 2.605 | n/a | 0.000 | 0.181 | 1.080 | 1.856 | 0.040 | n/a | 0.231 | 5.201 | 0.582 | n/a | 0.035 | 2.787 | 0.236 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000191 | 11.644 | 1.874 | n/a | 0.000 | 1.033 | 0.783 | 1.203 | 0.029 | n/a | 0.477 | 5.632 | 0.591 | n/a | 0.022 | 2.907 | 0.250 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001c8 | 10.593 | 2.390 | n/a | 0.000 | 0.703 | 0.817 | 1.394 | 0.023 | n/a | 0.143 | 4.568 | 0.526 | n/a | 0.028 | 3.094 | 0.292 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.685 | 0.261 | 0.000 | 0.468 | 3.693 | n/a | 0.000 | 0.184 | 1.398 | 3.189 | 0.035 | n/a | 0.434 | 7.323 | 3.872 | n/a | 0.031 | 4.359 | 0.175 | 0.031 |
| p99 | 72.129 | 3.883 | 0.000 | 5.318 | 22.032 | n/a | 2.217 | 0.988 | 6.923 | 23.449 | 0.510 | n/a | 4.215 | 30.378 | 13.589 | n/a | 0.137 | 24.830 | 0.359 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e07100000000000001ef | 72.129 | 22.032 | n/a | 2.217 | 0.581 | 6.923 | 23.449 | 0.141 | n/a | 1.154 | 10.228 | 5.309 | n/a | 0.096 | 24.830 | 0.344 | 0.096 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001f7 | 46.657 | 4.192 | 0.356 | 0.427 | 0.065 | 1.999 | 18.989 | 0.087 | n/a | 0.389 | 11.722 | 8.397 | n/a | 0.033 | 5.041 | 0.108 | 0.033 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.062ms |
| da68d8af77f9e07100000000000001db | 45.663 | 2.733 | n/a | 0.000 | 0.434 | 0.777 | 7.148 | 0.020 | n/a | 0.804 | 30.378 | 3.344 | n/a | 0.024 | 3.167 | 0.069 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001d3 | 45.612 | 7.961 | n/a | 0.000 | 0.712 | 4.474 | 3.189 | 0.021 | n/a | 2.988 | 21.478 | 4.754 | n/a | 0.036 | 8.674 | 0.190 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.259ms; driver.reader-basis.broadcast 0.031ms |
| da68d8af77f9e07100000000000001da | 44.633 | 3.525 | 0.241 | 0.000 | 0.037 | 1.210 | 17.897 | 0.048 | n/a | 2.357 | 11.281 | 8.019 | n/a | 0.019 | 3.803 | 0.085 | 0.019 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.027ms |
| da68d8af77f9e07100000000000001de | 43.925 | 6.708 | 0.274 | 0.527 | 0.036 | 1.226 | 9.882 | 0.049 | n/a | 0.821 | 10.794 | 13.589 | n/a | 0.019 | 7.545 | 0.172 | 0.019 | tx/thread-85/transactor.triplex-function | driver.reader-basis.broadcast 0.022ms |
| da68d8af77f9e0710000000000000209 | 43.702 | 3.424 | 0.191 | 0.219 | 0.052 | 1.502 | 18.865 | 0.034 | n/a | 0.105 | 8.611 | 10.676 | n/a | 0.022 | 3.886 | 0.089 | 0.022 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.029ms |
| da68d8af77f9e07100000000000001d7 | 38.284 | 3.730 | 0.186 | 0.464 | 0.035 | 0.922 | 18.687 | 0.030 | n/a | 0.534 | 9.132 | 4.544 | n/a | 0.020 | 4.415 | 0.115 | 0.020 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.025ms |
| da68d8af77f9e071000000000000020f | 37.865 | 3.857 | 0.263 | 0.412 | 0.072 | 1.606 | 16.963 | 0.097 | n/a | 0.421 | 9.010 | 5.127 | n/a | 0.037 | 4.604 | 0.122 | 0.037 | gw-w/thread-44/gateway.admitted-work | none observed |
| da68d8af77f9e0710000000000000219 | 37.528 | 4.710 | 0.212 | 0.483 | 0.098 | 4.998 | 17.678 | 0.055 | n/a | 0.451 | 5.096 | 3.701 | n/a | 0.045 | 5.503 | 0.147 | 0.045 | gw-w/thread-42/gateway.admitted-work | none observed |
| da68d8af77f9e07100000000000001d2 | 33.918 | 3.044 | n/a | 0.000 | 0.268 | 5.755 | 2.094 | 0.067 | n/a | 4.215 | 9.224 | 9.221 | n/a | 0.030 | 3.312 | 0.098 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| da68d8af77f9e071000000000000020d | 32.718 | 4.380 | 0.281 | 0.227 | 0.184 | 2.325 | 14.162 | 0.035 | n/a | 3.913 | 4.879 | 2.224 | n/a | 0.108 | 5.072 | 0.155 | 0.108 | gw-w/thread-45/gateway.admitted-work | none observed |
| da68d8af77f9e0710000000000000215 | 28.986 | 5.031 | 0.177 | 0.352 | 0.061 | 2.279 | 8.310 | 0.083 | n/a | 0.520 | 8.560 | 3.580 | n/a | 0.031 | 5.622 | 0.194 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000201 | 28.690 | 4.012 | 0.298 | 0.360 | 0.104 | 1.599 | 9.904 | 0.041 | n/a | 0.393 | 7.614 | 4.325 | n/a | 0.040 | 4.775 | 0.166 | 0.040 | gw-w/thread-47/gateway.admitted-work | none observed |
| da68d8af77f9e07100000000000001ce | 28.527 | 2.059 | n/a | 0.000 | 0.852 | 1.144 | 2.044 | 0.052 | n/a | 1.091 | 16.290 | 4.964 | n/a | 0.032 | 2.910 | 0.102 | 0.032 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| da68d8af77f9e071000000000000021d | 28.503 | 5.459 | 0.217 | 0.449 | 0.068 | 1.979 | 9.524 | 0.110 | n/a | 0.294 | 6.934 | 3.443 | n/a | 0.027 | 6.193 | 0.217 | 0.027 | gw-w/thread-47/gateway.admitted-work | none observed |
| da68d8af77f9e07100000000000001f1 | 28.496 | 3.817 | 0.190 | 0.000 | 0.088 | 1.896 | 8.350 | 0.035 | n/a | 0.462 | 9.279 | 4.344 | n/a | 0.035 | 4.096 | 0.144 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001f9 | 26.487 | 4.137 | 0.425 | 0.440 | 0.213 | 1.824 | 8.015 | 0.036 | n/a | 0.118 | 7.323 | 3.872 | n/a | 0.083 | 5.216 | 0.197 | 0.083 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001f5 | 26.104 | 2.286 | n/a | 0.000 | 0.988 | 1.573 | 2.255 | 0.051 | n/a | 1.627 | 11.953 | 5.338 | n/a | 0.034 | 3.274 | 0.125 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001fb | 24.776 | 4.387 | n/a | 0.000 | 0.530 | 1.822 | 1.904 | 0.045 | n/a | 0.193 | 10.790 | 4.967 | n/a | 0.137 | 4.917 | 0.198 | 0.137 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.117 | 0.660 | 0.000 | 0.468 | 2.524 | n/a | 0.000 | 0.376 | 0.883 | 1.794 | 0.025 | n/a | 0.646 | 6.693 | 3.864 | n/a | 0.030 | 3.023 | 0.140 | 0.030 |
| p99 | 45.663 | 1.891 | 0.000 | 1.020 | 3.386 | n/a | 0.000 | 0.988 | 5.755 | 7.148 | 0.510 | n/a | 4.215 | 30.378 | 9.221 | n/a | 0.062 | 4.359 | 0.311 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e07100000000000001db | 45.663 | 2.733 | n/a | 0.000 | 0.434 | 0.777 | 7.148 | 0.020 | n/a | 0.804 | 30.378 | 3.344 | n/a | 0.024 | 3.167 | 0.069 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001d2 | 33.918 | 3.044 | n/a | 0.000 | 0.268 | 5.755 | 2.094 | 0.067 | n/a | 4.215 | 9.224 | 9.221 | n/a | 0.030 | 3.312 | 0.098 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| da68d8af77f9e07100000000000001ce | 28.527 | 2.059 | n/a | 0.000 | 0.852 | 1.144 | 2.044 | 0.052 | n/a | 1.091 | 16.290 | 4.964 | n/a | 0.032 | 2.910 | 0.102 | 0.032 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| da68d8af77f9e07100000000000001f5 | 26.104 | 2.286 | n/a | 0.000 | 0.988 | 1.573 | 2.255 | 0.051 | n/a | 1.627 | 11.953 | 5.338 | n/a | 0.034 | 3.274 | 0.125 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001ff | 20.357 | 2.802 | n/a | 0.000 | 0.221 | 0.811 | 1.806 | 0.023 | n/a | 0.946 | 7.637 | 6.073 | n/a | 0.038 | 3.023 | 0.149 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001e3 | 18.390 | 2.753 | n/a | 0.000 | 0.468 | 0.487 | 0.921 | 0.017 | n/a | 0.221 | 6.256 | 7.237 | n/a | 0.031 | 3.220 | 0.175 | 0.031 | tx/thread-85/transactor.triplex-function | driver.reader-basis.broadcast 0.019ms |
| da68d8af77f9e07100000000000001e5 | 16.204 | 1.833 | n/a | 0.000 | 0.376 | 1.156 | 2.242 | 0.045 | n/a | 0.635 | 5.898 | 3.995 | n/a | 0.024 | 2.209 | 0.136 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001cc | 16.117 | 2.120 | n/a | 0.000 | 0.130 | 1.038 | 1.469 | 0.031 | n/a | 0.185 | 8.412 | 2.693 | n/a | 0.040 | 2.250 | 0.140 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000203 | 16.006 | 1.784 | n/a | 0.000 | 0.323 | 0.960 | 1.794 | 0.039 | n/a | 0.646 | 7.123 | 3.316 | n/a | 0.021 | 2.107 | 0.132 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001e9 | 15.429 | 2.548 | n/a | 0.000 | 0.956 | 0.883 | 1.125 | 0.020 | n/a | 0.321 | 5.682 | 3.864 | n/a | 0.030 | 3.504 | 0.227 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000211 | 15.346 | 2.524 | n/a | 0.000 | 0.195 | 0.883 | 2.124 | 0.510 | n/a | 0.729 | 5.065 | 3.291 | n/a | 0.025 | 2.719 | 0.177 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000207 | 14.727 | 1.920 | n/a | 0.000 | 0.065 | 0.788 | 1.234 | 0.024 | n/a | 0.133 | 6.120 | 4.419 | n/a | 0.024 | 1.985 | 0.135 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| da68d8af77f9e071000000000000021b | 14.024 | 3.386 | n/a | 0.000 | 0.973 | 1.398 | 1.605 | 0.023 | n/a | 0.904 | 5.036 | 0.642 | n/a | 0.058 | 4.359 | 0.311 | 0.058 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000001e7 | 13.246 | 3.110 | n/a | 0.000 | 0.464 | 0.788 | 1.301 | 0.025 | n/a | 0.180 | 6.693 | 0.623 | n/a | 0.062 | 3.574 | 0.270 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000020b | 10.315 | 1.959 | n/a | 0.000 | 0.375 | 0.746 | 1.523 | 0.024 | n/a | 0.202 | 4.889 | 0.571 | n/a | 0.027 | 2.334 | 0.226 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.367 | 0.474 | 0.000 | 0.593 | 3.510 | n/a | 0.000 | 0.219 | 1.360 | 2.947 | 0.026 | n/a | 0.188 | 7.097 | 2.194 | n/a | 0.031 | 4.203 | 0.195 | 0.031 |
| p99 | 83.317 | 2.009 | 0.000 | 1.437 | 6.052 | n/a | 0.554 | 1.289 | 4.553 | 57.063 | 1.248 | n/a | 4.040 | 17.554 | 16.374 | n/a | 0.080 | 6.930 | 0.434 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e0710000000000000245 | 83.317 | 4.619 | 0.172 | 0.446 | 0.053 | 1.360 | 57.063 | 0.023 | n/a | 0.103 | 12.354 | 7.098 | n/a | 0.027 | 5.290 | 0.063 | 0.027 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.027ms |
| da68d8af77f9e071000000000000025b | 45.540 | 5.172 | 0.281 | 0.468 | 0.178 | 2.123 | 13.903 | 0.054 | n/a | 1.076 | 13.964 | 8.249 | n/a | 0.072 | 6.098 | 0.134 | 0.072 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.346ms |
| da68d8af77f9e071000000000000026e | 41.154 | 3.536 | 2.712 | 0.295 | 0.063 | 4.553 | 10.660 | 0.021 | n/a | 0.092 | 10.249 | 8.948 | n/a | 0.025 | 6.605 | 0.161 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.317ms |
| da68d8af77f9e071000000000000027c | 38.430 | 4.124 | 0.202 | 0.452 | 0.071 | 1.865 | 22.317 | 0.037 | n/a | 0.635 | 5.080 | 3.612 | n/a | 0.036 | 4.849 | 0.126 | 0.036 | gw-w/thread-45/gateway.admitted-work | none observed |
| da68d8af77f9e0710000000000000265 | 34.642 | 4.396 | 0.522 | 0.406 | 0.083 | 2.447 | 7.887 | 0.065 | n/a | 0.231 | 10.576 | 7.995 | n/a | 0.033 | 5.408 | 0.156 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000241 | 33.992 | 3.510 | 0.195 | 0.429 | 0.070 | 1.436 | 10.697 | 0.023 | n/a | 0.113 | 14.253 | 3.232 | n/a | 0.037 | 4.203 | 0.124 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000231 | 33.831 | 6.052 | 0.229 | 0.354 | 0.073 | 1.642 | 10.220 | 0.026 | n/a | 0.105 | 10.542 | 4.552 | n/a | 0.035 | 6.708 | 0.198 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000022a | 33.620 | 3.818 | 0.209 | 0.274 | 0.144 | 2.028 | 8.099 | 0.026 | n/a | 0.452 | 14.038 | 4.479 | n/a | 0.053 | 4.445 | 0.132 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000023d | 33.054 | 3.832 | 0.228 | 0.388 | 0.116 | 1.712 | 11.897 | 0.028 | n/a | 0.637 | 7.143 | 7.024 | n/a | 0.049 | 4.564 | 0.138 | 0.049 | gw-w/thread-49/gateway.admitted-work | none observed |
| da68d8af77f9e071000000000000024d | 31.866 | 5.261 | 0.329 | 0.459 | 0.185 | 2.375 | 12.345 | 1.248 | n/a | 0.172 | 6.358 | 3.055 | n/a | 0.080 | 6.234 | 0.196 | 0.080 | gw-w/thread-47/gateway.admitted-work | none observed |
| da68d8af77f9e0710000000000000276 | 30.728 | 3.130 | 0.199 | 0.276 | 0.065 | 1.494 | 11.471 | 0.055 | n/a | 0.194 | 8.348 | 5.462 | n/a | 0.035 | 3.670 | 0.119 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000257 | 30.420 | 5.510 | 0.200 | 0.427 | 0.063 | 2.534 | 12.934 | 0.026 | n/a | 0.081 | 6.421 | 2.194 | n/a | 0.030 | 6.201 | 0.204 | 0.030 | gw-w/thread-46/gateway.admitted-work | none observed |
| da68d8af77f9e0710000000000000261 | 30.265 | 3.037 | n/a | 0.000 | 0.263 | 0.861 | 1.807 | 0.026 | n/a | 0.116 | 7.760 | 16.374 | n/a | 0.020 | 3.300 | 0.109 | 0.020 | tx/thread-85/transactor.triplex-function | none observed |
| da68d8af77f9e0710000000000000243 | 29.678 | 3.905 | 0.276 | 0.281 | 0.063 | 1.392 | 6.559 | 0.026 | n/a | 0.188 | 12.758 | 4.196 | n/a | 0.035 | 4.524 | 0.152 | 0.035 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000233 | 29.656 | 3.669 | 0.175 | 0.272 | 0.059 | 4.332 | 6.840 | 0.026 | n/a | 0.097 | 7.992 | 6.171 | n/a | 0.023 | 4.175 | 0.141 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000253 | 29.162 | 3.595 | 0.336 | 0.277 | 0.111 | 3.088 | 8.782 | 0.023 | n/a | 0.562 | 6.664 | 5.672 | n/a | 0.052 | 4.319 | 0.148 | 0.052 | gw-w/thread-48/gateway.admitted-work | none observed |
| da68d8af77f9e0710000000000000248 | 29.009 | 2.361 | n/a | 0.000 | 0.282 | 0.794 | 1.615 | 0.037 | n/a | 4.040 | 8.360 | 11.502 | n/a | 0.016 | 2.644 | 0.091 | 0.016 | tx/thread-85/transactor.triplex-function | driver.publication.persist-deferred 1.860ms |
| da68d8af77f9e0710000000000000280 | 28.123 | 3.434 | 0.196 | 0.389 | 0.049 | 1.174 | 12.312 | 0.020 | n/a | 0.091 | 6.476 | 3.956 | n/a | 0.027 | 4.068 | 0.145 | 0.027 | gw-w/thread-47/gateway.admitted-work | driver.publication.persist-deferred 1.714ms |
| da68d8af77f9e071000000000000022d | 26.160 | 2.439 | n/a | 0.000 | 0.206 | 1.116 | 2.053 | 0.037 | n/a | 0.669 | 12.342 | 7.275 | n/a | 0.022 | 2.645 | 0.101 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000026c | 26.081 | 2.980 | n/a | 0.000 | 0.316 | 1.001 | 1.500 | 0.089 | n/a | 0.287 | 14.599 | 5.271 | n/a | 0.037 | 3.296 | 0.126 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.978 | 0.893 | 0.000 | 0.542 | 2.361 | n/a | 0.000 | 0.451 | 0.932 | 1.493 | 0.020 | n/a | 0.146 | 4.858 | 1.030 | n/a | 0.027 | 2.768 | 0.207 | 0.027 |
| p99 | 29.009 | 1.021 | 0.000 | 0.839 | 5.303 | n/a | 0.000 | 1.128 | 2.574 | 5.982 | 0.089 | n/a | 4.040 | 14.599 | 11.502 | n/a | 0.053 | 6.040 | 0.434 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e0710000000000000248 | 29.009 | 2.361 | n/a | 0.000 | 0.282 | 0.794 | 1.615 | 0.037 | n/a | 4.040 | 8.360 | 11.502 | n/a | 0.016 | 2.644 | 0.091 | 0.016 | tx/thread-85/transactor.triplex-function | driver.publication.persist-deferred 1.860ms |
| da68d8af77f9e071000000000000022d | 26.160 | 2.439 | n/a | 0.000 | 0.206 | 1.116 | 2.053 | 0.037 | n/a | 0.669 | 12.342 | 7.275 | n/a | 0.022 | 2.645 | 0.101 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000026c | 26.081 | 2.980 | n/a | 0.000 | 0.316 | 1.001 | 1.500 | 0.089 | n/a | 0.287 | 14.599 | 5.271 | n/a | 0.037 | 3.296 | 0.126 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000267 | 19.442 | 4.608 | n/a | 0.000 | 1.111 | 1.633 | 5.982 | 0.037 | n/a | 0.147 | 4.858 | 1.030 | n/a | 0.037 | 5.719 | 0.294 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000025c | 18.882 | 2.070 | n/a | 0.000 | 0.219 | 0.893 | 0.806 | 0.007 | n/a | 0.020 | 14.329 | 0.506 | n/a | 0.033 | 2.289 | 0.121 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000228 | 16.783 | 2.238 | n/a | 0.000 | 0.229 | 2.295 | 2.947 | 0.039 | n/a | 0.690 | 6.401 | 1.922 | n/a | 0.024 | 2.466 | 0.147 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000224 | 15.182 | 3.927 | n/a | 0.000 | 0.624 | 1.368 | 2.048 | 0.034 | n/a | 1.023 | 4.016 | 2.092 | n/a | 0.050 | 4.551 | 0.300 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000023f | 14.253 | 2.569 | n/a | 0.000 | 0.384 | 1.391 | 0.976 | 0.015 | n/a | 0.096 | 8.328 | 0.464 | n/a | 0.031 | 2.953 | 0.207 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000235 | 13.978 | 1.944 | n/a | 0.000 | 0.451 | 2.574 | 0.976 | 0.014 | n/a | 3.042 | 3.255 | 1.705 | n/a | 0.016 | 2.395 | 0.171 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| da68d8af77f9e071000000000000021f | 13.908 | 5.303 | n/a | 0.000 | 0.737 | 2.334 | 2.727 | 0.033 | n/a | 0.146 | 2.343 | 0.258 | n/a | 0.027 | 6.040 | 0.434 | 0.027 | node-14/thread-0/driver.execute | none observed |
| da68d8af77f9e0710000000000000263 | 11.225 | 2.014 | n/a | 0.000 | 0.694 | 0.896 | 1.493 | 0.027 | n/a | 0.145 | 4.453 | 1.485 | n/a | 0.019 | 2.708 | 0.241 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000027e | 11.114 | 2.112 | n/a | 0.000 | 0.656 | 0.720 | 0.904 | 0.015 | n/a | 0.128 | 6.090 | 0.464 | n/a | 0.026 | 2.768 | 0.249 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| da68d8af77f9e071000000000000027a | 10.760 | 2.066 | n/a | 0.000 | 0.090 | 0.601 | 2.122 | 0.014 | n/a | 0.106 | 5.109 | 0.626 | n/a | 0.025 | 2.156 | 0.200 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000274 | 10.714 | 2.781 | n/a | 0.000 | 1.128 | 0.623 | 1.003 | 0.016 | n/a | 0.133 | 3.877 | 1.100 | n/a | 0.053 | 3.909 | 0.365 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000251 | 10.469 | 2.050 | n/a | 0.000 | 0.839 | 0.932 | 1.315 | 0.020 | n/a | 0.494 | 4.215 | 0.567 | n/a | 0.037 | 2.889 | 0.276 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000025e | 9.199 | 3.089 | n/a | 0.000 | 0.794 | 0.698 | 0.836 | 0.013 | n/a | 0.042 | 3.197 | 0.500 | n/a | 0.029 | 3.883 | 0.422 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.412 | 0.000 | 0.000 | 0.778 | 2.622 | n/a | 0.000 | 0.134 | 1.791 | 1.381 | 0.017 | n/a | 0.058 | 5.725 | 0.667 | n/a | 0.017 | 2.756 | 0.222 | 0.017 |
| p99 | 12.412 | 0.000 | 0.000 | 0.778 | 2.622 | n/a | 0.000 | 0.134 | 1.791 | 1.381 | 0.017 | n/a | 0.058 | 5.725 | 0.667 | n/a | 0.017 | 2.756 | 0.222 | 0.017 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e0710000000000000281 | 12.412 | 2.622 | n/a | 0.000 | 0.134 | 1.791 | 1.381 | 0.017 | n/a | 0.058 | 5.725 | 0.667 | n/a | 0.017 | 2.756 | 0.222 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.443 | 0.000 | 0.000 | 0.524 | 3.471 | n/a | 0.000 | 0.220 | 1.287 | 2.294 | 0.024 | n/a | 0.379 | 5.973 | 3.262 | n/a | 0.031 | 4.068 | 0.203 | 0.031 |
| p99 | 57.729 | 3.021 | 0.000 | 1.476 | 5.763 | n/a | 0.464 | 1.079 | 11.304 | 13.698 | 0.066 | n/a | 3.709 | 16.049 | n/a | n/a | 0.080 | 6.156 | 0.359 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e0710000000000000297 | 57.729 | 4.235 | 0.248 | 0.000 | 0.077 | 1.366 | 6.331 | 0.028 | n/a | 0.111 | 6.794 | 38.504 | n/a | 0.035 | 4.560 | 0.079 | 0.035 | tx/thread-85/transactor.triplex-function | none observed |
| da68d8af77f9e0710000000000000291 | 42.249 | 3.517 | 0.248 | 0.273 | 0.066 | 1.384 | 13.698 | 0.024 | n/a | 0.743 | 10.990 | 11.277 | n/a | 0.029 | 4.104 | 0.097 | 0.029 | tx/thread-85/transactor.triplex-function | none observed |
| da68d8af77f9e071000000000000028a | 33.746 | 4.913 | 0.272 | 0.448 | 0.051 | 1.661 | 7.094 | 0.034 | n/a | 0.231 | 12.082 | 6.930 | n/a | 0.029 | 5.683 | 0.168 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000299 | 32.423 | 4.111 | 0.257 | 0.000 | 0.122 | 1.527 | 10.041 | 0.032 | n/a | 0.123 | 10.976 | 5.181 | n/a | 0.052 | 4.490 | 0.138 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000028f | 29.228 | 4.438 | n/a | 0.000 | 0.427 | 2.647 | 7.799 | 0.017 | n/a | 0.087 | 6.055 | 7.719 | n/a | 0.038 | 4.866 | 0.166 | 0.038 | tx/thread-85/transactor.triplex-function | driver.reader-basis.broadcast 0.067ms |
| da68d8af77f9e07100000000000002a7 | 28.116 | 4.813 | 0.331 | 0.000 | 0.063 | 2.351 | 11.112 | 0.043 | n/a | 0.136 | 5.856 | 3.384 | n/a | 0.027 | 5.207 | 0.185 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000002ce | 27.399 | 3.858 | 0.176 | 0.000 | 0.069 | 1.783 | 5.701 | 0.028 | n/a | 0.128 | 6.792 | 8.836 | n/a | 0.029 | 4.103 | 0.150 | 0.029 | tx/thread-85/transactor.triplex-function | none observed |
| da68d8af77f9e07100000000000002a3 | 26.703 | 4.563 | 0.386 | 0.000 | 0.065 | 2.060 | 6.656 | 0.030 | n/a | 0.453 | 6.441 | 6.017 | n/a | 0.033 | 5.013 | 0.188 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000002ab | 26.437 | 5.062 | 0.211 | 0.000 | 0.081 | 2.282 | 8.840 | 0.027 | n/a | 0.452 | 4.821 | 4.629 | n/a | 0.032 | 5.354 | 0.203 | 0.032 | gw-w/thread-49/gateway.admitted-work | none observed |
| da68d8af77f9e07100000000000002cf | 26.325 | 4.177 | n/a | 0.000 | 0.787 | 0.786 | 2.897 | 0.040 | n/a | 1.033 | 10.794 | 5.795 | n/a | 0.016 | 4.964 | 0.189 | 0.016 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000002af | 26.171 | 3.291 | n/a | 0.000 | 0.841 | 0.903 | 1.245 | 0.017 | n/a | 0.536 | 16.049 | 3.262 | n/a | 0.028 | 4.132 | 0.158 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000002d3 | 25.836 | 5.763 | 0.283 | 0.000 | 0.110 | 1.942 | 3.943 | 0.026 | n/a | 0.131 | 12.260 | 1.319 | n/a | 0.059 | 6.156 | 0.238 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000286 | 24.835 | 3.312 | 0.194 | 0.464 | 0.067 | 1.719 | 8.876 | 0.036 | n/a | 0.434 | 5.973 | 3.726 | n/a | 0.035 | 4.037 | 0.163 | 0.035 | gw-w/thread-49/gateway.admitted-work | none observed |
| da68d8af77f9e07100000000000002d5 | 23.025 | 3.756 | 0.272 | 0.000 | 0.069 | 1.551 | 5.412 | 0.028 | n/a | 0.104 | 6.864 | 4.939 | n/a | 0.031 | 4.097 | 0.178 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000288 | 22.700 | 2.243 | n/a | 0.000 | 0.752 | 0.856 | 1.854 | 0.031 | n/a | 3.129 | 9.889 | 3.915 | n/a | 0.031 | 2.996 | 0.132 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000002cb | 22.300 | 2.843 | n/a | 0.000 | 0.825 | 11.304 | 7.158 | 0.030 | n/a | 0.088 | 0.000 | n/a | n/a | 0.051 | 3.668 | 0.164 | 0.051 | node-14/thread-0/socket.wait-first-byte | none observed |
| da68d8af77f9e07100000000000002b3 | 21.450 | 3.003 | 0.195 | 0.000 | 0.069 | 1.343 | 6.935 | 0.026 | n/a | 0.417 | 5.543 | 3.893 | n/a | 0.027 | 3.267 | 0.152 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000002d7 | 20.410 | 3.975 | 0.271 | 0.000 | 0.052 | 1.323 | 4.936 | 0.033 | n/a | 0.349 | 6.635 | 2.808 | n/a | 0.028 | 4.297 | 0.211 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000002c9 | 19.889 | 3.448 | 0.244 | 0.000 | 0.138 | 1.396 | 5.495 | 0.066 | n/a | 0.264 | 6.273 | 2.492 | n/a | 0.073 | 3.830 | 0.193 | 0.073 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000002bb | 19.870 | 4.521 | 0.186 | 0.000 | 0.048 | 1.432 | 5.390 | 0.024 | n/a | 0.417 | 4.507 | 3.317 | n/a | 0.028 | 4.755 | 0.239 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.803 | 0.000 | 0.000 | 0.524 | 3.036 | n/a | 0.000 | 0.568 | 0.813 | 1.152 | 0.017 | n/a | 0.349 | 5.494 | 1.717 | n/a | 0.038 | 3.668 | 0.217 | 0.038 |
| p99 | 22.300 | 1.001 | 0.000 | 0.979 | 4.933 | n/a | 0.000 | 1.079 | 11.304 | 7.158 | 0.030 | n/a | 3.709 | 11.668 | n/a | n/a | 0.080 | 5.414 | 0.359 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e07100000000000002cb | 22.300 | 2.843 | n/a | 0.000 | 0.825 | 11.304 | 7.158 | 0.030 | n/a | 0.088 | 0.000 | n/a | n/a | 0.051 | 3.668 | 0.164 | 0.051 | node-14/thread-0/socket.wait-first-byte | none observed |
| da68d8af77f9e071000000000000029d | 19.443 | 3.903 | n/a | 0.000 | 0.644 | 1.064 | 1.213 | 0.019 | n/a | 0.135 | 10.694 | 1.717 | n/a | 0.053 | 4.547 | 0.234 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000293 | 19.435 | 3.406 | n/a | 0.000 | 0.803 | 0.727 | 1.004 | 0.016 | n/a | 0.093 | 11.668 | 1.675 | n/a | 0.042 | 4.209 | 0.217 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000002ad | 19.272 | 4.933 | n/a | 0.000 | 0.482 | 1.561 | 1.434 | 0.026 | n/a | 0.618 | 5.849 | 4.289 | n/a | 0.080 | 5.414 | 0.281 | 0.080 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000002bc | 18.539 | 3.096 | n/a | 0.000 | 0.892 | 0.516 | 0.867 | 0.015 | n/a | 0.349 | 5.494 | 7.271 | n/a | 0.038 | 3.989 | 0.215 | 0.038 | tx/thread-85/transactor.triplex-function | driver.reader-basis.broadcast 0.032ms |
| da68d8af77f9e07100000000000002c7 | 17.833 | 4.372 | n/a | 0.000 | 0.568 | 0.903 | 1.152 | 0.019 | n/a | 0.382 | 6.327 | 4.056 | n/a | 0.056 | 4.940 | 0.277 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000002b5 | 16.679 | 4.151 | n/a | 0.000 | 1.079 | 0.698 | 1.298 | 0.017 | n/a | 3.709 | 4.996 | 0.681 | n/a | 0.048 | 5.230 | 0.314 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000002b9 | 15.803 | 2.656 | n/a | 0.000 | 0.568 | 2.139 | 1.131 | 0.016 | n/a | 0.434 | 7.787 | 1.044 | n/a | 0.029 | 3.224 | 0.204 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000284 | 13.474 | 3.036 | n/a | 0.000 | 0.374 | 1.287 | 1.450 | 0.024 | n/a | 0.229 | 6.218 | 0.818 | n/a | 0.038 | 3.410 | 0.253 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000002c1 | 13.384 | 1.915 | n/a | 0.000 | 0.440 | 0.471 | 1.223 | 0.015 | n/a | 0.401 | 5.688 | 3.208 | n/a | 0.022 | 2.355 | 0.176 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000002a5 | 13.162 | 1.882 | n/a | 0.000 | 0.597 | 0.629 | 1.361 | 0.017 | n/a | 0.748 | 5.387 | 2.515 | n/a | 0.025 | 2.479 | 0.188 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000002a1 | 12.651 | 2.297 | n/a | 0.000 | 1.066 | 1.468 | 1.099 | 0.016 | n/a | 0.445 | 3.708 | 2.523 | n/a | 0.028 | 3.363 | 0.266 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e071000000000000029b | 11.332 | 3.696 | n/a | 0.000 | 0.372 | 0.813 | 1.099 | 0.020 | n/a | 0.155 | 4.287 | 0.833 | n/a | 0.056 | 4.068 | 0.359 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| da68d8af77f9e07100000000000002c5 | 8.556 | 1.426 | n/a | 0.000 | 0.377 | 0.469 | 1.107 | 0.015 | n/a | 0.082 | 4.454 | 0.612 | n/a | 0.015 | 1.803 | 0.211 | 0.015 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (37 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 76.941 | n/a | n/a | n/a | 40.681 | 2.147 | 2.810 | 0.000 | 3.519 | 3.165 | 0.003 | n/a | 0.009 | 0.000 | n/a | n/a | 0.008 | 52.874 | 0.850 | 0.008 |
| p99 | 210.075 | n/a | n/a | n/a | 94.579 | 135.344 | 10.013 | 0.000 | 117.712 | 49.503 | 9.913 | n/a | 0.020 | 0.000 | n/a | n/a | 0.024 | 176.914 | 1.000 | 0.024 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e071000000000000145b | 210.075 | 65.250 | 0.204 | 9.146 | 0.000 | 117.712 | 14.009 | 3.740 | n/a | 0.004 | 0.000 | n/a | n/a | 0.010 | 74.600 | 0.355 | 0.010 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.717ms; driver.publication.persist-deferred 2.470ms; driver.publication.persist-deferred 1.648ms; driver.publication.persist-deferred 1.536ms; driver.publication.persist-deferred 1.216ms |
| da68d8af77f9e0710000000000001466 | 181.835 | 40.813 | 135.344 | 0.758 | 0.000 | 0.503 | 4.390 | 0.006 | n/a | 0.015 | 0.000 | n/a | n/a | 0.007 | 176.914 | 0.973 | 0.007 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.470ms; driver.publication.persist-deferred 1.648ms; driver.publication.persist-deferred 1.544ms; driver.publication.persist-deferred 1.536ms; driver.publication.persist-deferred 1.216ms |
| da68d8af77f9e0710000000000000f55 | 134.573 | 32.204 | 3.459 | 3.120 | 0.000 | 94.466 | 1.306 | 0.003 | n/a | 0.008 | 0.000 | n/a | n/a | 0.009 | 38.783 | 0.288 | 0.009 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.662ms; driver.publication.persist-deferred 1.360ms; driver.publication.persist-deferred 1.306ms; driver.publication.persist-deferred 1.272ms; driver.publication.persist-deferred 1.180ms |
| da68d8af77f9e0710000000000000f54 | 123.677 | 94.579 | 4.083 | 10.013 | 0.000 | 4.163 | 10.812 | 0.007 | n/a | 0.014 | 0.000 | n/a | n/a | 0.008 | 108.674 | 0.879 | 0.008 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.662ms; driver.publication.persist-deferred 1.360ms; driver.publication.persist-deferred 1.306ms; driver.publication.persist-deferred 1.272ms; driver.publication.persist-deferred 1.180ms |
| da68d8af77f9e0710000000000001ca0 | 119.383 | 37.695 | 0.352 | 2.810 | 0.000 | 64.600 | 3.992 | 9.913 | n/a | 0.013 | 0.000 | n/a | n/a | 0.009 | 40.857 | 0.342 | 0.009 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.140ms; driver.publication.persist-deferred 0.992ms; driver.publication.persist-deferred 0.978ms; driver.publication.persist-deferred 0.959ms; driver.publication.persist-deferred 0.733ms |
| da68d8af77f9e071000000000000142b | 118.052 | 59.462 | 0.168 | 8.316 | 0.000 | 0.590 | 49.503 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.003 | 67.947 | 0.576 | 0.003 | gw-r/thread-47/gateway.admitted-work | driver.publication.persist-deferred 0.919ms; driver.publication.persist-deferred 0.831ms; driver.publication.persist-deferred 0.742ms; driver.reader-basis.broadcast 0.237ms |
| da68d8af77f9e071000000000000181f | 117.953 | 43.054 | 61.549 | 2.067 | 0.000 | 1.376 | 9.869 | 0.008 | n/a | 0.017 | 0.000 | n/a | n/a | 0.013 | 106.670 | 0.904 | 0.013 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.797ms; driver.publication.persist-deferred 1.598ms; driver.publication.persist-deferred 1.475ms; driver.publication.persist-deferred 1.340ms; driver.publication.persist-deferred 1.249ms |
| da68d8af77f9e0710000000000001ca3 | 113.737 | 47.855 | 2.209 | 2.810 | 0.000 | 52.841 | 0.788 | 7.223 | n/a | 0.005 | 0.000 | n/a | n/a | 0.005 | 52.874 | 0.465 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 0.992ms; driver.publication.persist-deferred 0.978ms; driver.publication.persist-deferred 0.959ms; driver.reader-basis.broadcast 0.719ms |
| da68d8af77f9e0710000000000001464 | 105.430 | 46.835 | 0.236 | 3.953 | 0.000 | 48.858 | 1.132 | 4.403 | n/a | 0.006 | 0.000 | n/a | n/a | 0.007 | 51.024 | 0.484 | 0.007 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.470ms; driver.publication.persist-deferred 1.648ms; driver.publication.persist-deferred 1.216ms; driver.publication.persist-deferred 1.211ms; driver.publication.persist-deferred 1.055ms |
| da68d8af77f9e071000000000000181e | 93.531 | 64.904 | 14.964 | 4.709 | 0.000 | 0.812 | 8.125 | 0.003 | n/a | 0.009 | 0.000 | n/a | n/a | 0.006 | 84.577 | 0.904 | 0.006 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 3.305ms; driver.publication.persist-deferred 1.797ms; driver.publication.persist-deferred 1.475ms; driver.publication.persist-deferred 1.340ms; driver.publication.persist-deferred 1.140ms |
| da68d8af77f9e071000000000000145f | 90.972 | 54.990 | 7.948 | 3.670 | 0.000 | 11.531 | 12.821 | 0.003 | n/a | 0.005 | 0.000 | n/a | n/a | 0.005 | 66.607 | 0.732 | 0.005 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 2.717ms; driver.publication.persist-deferred 2.470ms; driver.publication.persist-deferred 1.216ms; driver.publication.persist-deferred 1.211ms; driver.publication.persist-deferred 1.055ms |
| da68d8af77f9e0710000000000001a31 | 89.997 | 42.646 | 42.580 | 1.790 | 0.000 | 0.863 | 2.102 | 0.003 | n/a | 0.009 | 0.000 | n/a | n/a | 0.005 | 87.016 | 0.967 | 0.005 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.877ms; driver.publication.persist-deferred 1.639ms; driver.publication.persist-deferred 1.161ms; driver.publication.persist-deferred 0.978ms; driver.publication.persist-deferred 0.927ms |
| da68d8af77f9e07100000000000003cd | 86.007 | 71.307 | 4.306 | 5.816 | 0.000 | 2.065 | 2.479 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.008 | 81.429 | 0.947 | 0.008 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 5.048ms; driver.publication.persist-deferred 1.229ms; driver.publication.persist-deferred 1.103ms; driver.publication.persist-deferred 0.993ms; driver.publication.persist-deferred 0.970ms |
| da68d8af77f9e0710000000000001c9e | 83.412 | 59.348 | 0.235 | 3.338 | 0.000 | 8.917 | 11.548 | 0.007 | n/a | 0.012 | 0.000 | n/a | n/a | 0.007 | 62.922 | 0.754 | 0.007 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.279ms; driver.publication.persist-deferred 1.140ms; driver.publication.persist-deferred 0.978ms; driver.publication.persist-deferred 0.959ms; driver.publication.persist-deferred 0.733ms |
| da68d8af77f9e07100000000000009b6 | 81.605 | 35.766 | 21.754 | 2.764 | 0.000 | 13.978 | 5.376 | 1.927 | n/a | 0.016 | 0.000 | n/a | n/a | 0.024 | 60.284 | 0.739 | 0.024 | node-14/thread-0/rpc.replica.observe | driver.publication.persist-deferred 2.513ms; driver.publication.persist-deferred 1.726ms; driver.publication.persist-deferred 1.504ms; driver.publication.persist-deferred 1.234ms; driver.publication.persist-deferred 1.229ms |
| da68d8af77f9e07100000000000009b8 | 78.688 | 14.382 | 13.640 | 2.395 | 0.000 | 44.659 | 1.821 | 1.767 | n/a | 0.011 | 0.000 | n/a | n/a | 0.011 | 30.418 | 0.387 | 0.011 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.513ms; driver.publication.persist-deferred 1.726ms; driver.publication.persist-deferred 1.229ms; driver.publication.persist-deferred 1.190ms; driver.publication.persist-deferred 1.168ms |
| da68d8af77f9e07100000000000008d6 | 78.660 | 21.504 | 51.252 | 0.000 | 0.000 | 5.107 | 0.777 | 0.002 | n/a | 0.011 | 0.000 | n/a | n/a | 0.006 | 72.756 | 0.925 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.173ms; driver.publication.persist-deferred 1.005ms; driver.publication.persist-deferred 1.002ms; driver.publication.persist-deferred 0.990ms |
| da68d8af77f9e0710000000000001ca1 | 77.760 | 12.600 | 0.105 | 0.000 | 0.000 | 52.201 | 3.165 | 9.667 | n/a | 0.017 | 0.000 | n/a | n/a | 0.004 | 12.706 | 0.163 | 0.004 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.140ms; driver.publication.persist-deferred 0.978ms; driver.publication.persist-deferred 0.959ms; driver.reader-basis.broadcast 0.719ms |
| da68d8af77f9e0710000000000001a2e | 76.941 | 51.909 | 8.837 | 5.051 | 0.000 | 7.465 | 3.656 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.007 | 65.797 | 0.855 | 0.007 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.877ms; driver.publication.persist-deferred 1.161ms; driver.publication.persist-deferred 1.159ms; driver.publication.persist-deferred 0.927ms; driver.publication.persist-deferred 0.886ms |
| da68d8af77f9e07100000000000008d1 | 73.193 | 36.574 | 0.372 | 2.660 | 0.000 | 32.349 | 1.218 | 0.002 | n/a | 0.005 | 0.000 | n/a | n/a | 0.014 | 39.605 | 0.541 | 0.014 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.191ms; driver.publication.persist-deferred 1.173ms; driver.publication.persist-deferred 1.005ms; driver.publication.persist-deferred 1.002ms; driver.publication.persist-deferred 0.990ms |

## P2 / L1024 / commit (846 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.297 | 0.210 | 0.000 | 0.523 | 2.224 | n/a | 0.000 | 0.716 | 0.675 | 1.065 | 0.014 | n/a | 0.123 | 5.097 | 0.893 | n/a | 0.017 | 3.077 | 0.249 | 0.017 |
| p99 | 54.572 | 2.007 | 0.000 | 2.167 | 8.041 | n/a | 0.000 | 15.112 | 8.473 | 7.952 | 0.052 | n/a | 3.440 | 31.735 | 17.181 | n/a | 0.048 | 18.607 | 0.625 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e0710000000000000551 | 81.995 | 18.340 | n/a | 0.000 | 0.465 | 39.441 | 9.962 | 0.046 | n/a | 0.586 | 11.749 | 1.383 | n/a | 0.023 | 18.805 | 0.229 | 0.023 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.484ms; driver.reader-basis.broadcast 0.120ms |
| da68d8af77f9e07100000000000002fb | 76.523 | 3.293 | 0.228 | 0.000 | 0.015 | 1.467 | 6.128 | 0.019 | n/a | 0.088 | 55.138 | 10.136 | n/a | 0.010 | 3.537 | 0.046 | 0.010 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.086ms; driver.publication.persist-deferred 1.083ms; driver.publication.persist-deferred 0.913ms |
| da68d8af77f9e0710000000000000554 | 73.402 | 8.433 | n/a | 0.000 | 17.533 | 3.645 | 1.353 | 0.014 | n/a | 2.079 | 39.305 | 1.032 | n/a | 0.008 | 25.965 | 0.354 | 0.008 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.484ms; driver.publication.persist-deferred 1.014ms; driver.publication.persist-deferred 0.998ms; driver.publication.persist-deferred 0.667ms; driver.reader-basis.broadcast 0.120ms |
| da68d8af77f9e07100000000000002fa | 64.451 | 3.178 | n/a | 0.000 | 1.801 | 0.562 | 3.701 | 0.019 | n/a | 0.056 | 45.051 | 10.071 | n/a | 0.012 | 4.978 | 0.077 | 0.012 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.086ms; driver.publication.persist-deferred 1.083ms |
| da68d8af77f9e07100000000000002f9 | 60.801 | 2.789 | n/a | 0.000 | 1.080 | 0.652 | 2.032 | 0.032 | n/a | 0.851 | 44.254 | 9.095 | n/a | 0.016 | 3.869 | 0.064 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.083ms |
| da68d8af77f9e071000000000000074e | 60.781 | 2.510 | n/a | 0.000 | 7.150 | 0.687 | 1.113 | 0.031 | n/a | 0.149 | 18.768 | 30.341 | n/a | 0.033 | 9.660 | 0.159 | 0.033 | tx/thread-85/transactor.triplex-function | driver.publication.persist-deferred 1.376ms; driver.publication.persist-deferred 0.997ms; driver.publication.persist-deferred 0.970ms |
| da68d8af77f9e0710000000000000555 | 57.397 | 9.124 | n/a | 0.000 | 4.243 | 3.174 | 0.561 | 0.006 | n/a | 0.019 | 38.166 | 2.100 | n/a | 0.005 | 13.366 | 0.233 | 0.005 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.484ms; driver.publication.persist-deferred 0.998ms; driver.publication.persist-deferred 0.667ms; driver.reader-basis.broadcast 0.120ms |
| da68d8af77f9e0710000000000000750 | 57.188 | 1.609 | n/a | 0.000 | 0.236 | 0.385 | 0.747 | 0.010 | n/a | 0.133 | 52.419 | 1.634 | n/a | 0.014 | 1.845 | 0.032 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.997ms; driver.publication.persist-deferred 0.930ms; driver.publication.persist-deferred 0.188ms |
| da68d8af77f9e0710000000000000553 | 54.572 | 3.609 | n/a | 0.000 | 25.615 | 12.262 | 0.878 | 0.010 | n/a | 0.028 | 11.385 | 0.759 | n/a | 0.026 | 29.223 | 0.536 | 0.026 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 1.484ms; driver.publication.persist-deferred 0.998ms; driver.reader-basis.broadcast 0.120ms |
| da68d8af77f9e071000000000000081e | 54.542 | 6.329 | n/a | 0.000 | 0.862 | 13.265 | 4.929 | 0.054 | n/a | 0.341 | 26.939 | 1.808 | n/a | 0.016 | 7.191 | 0.132 | 0.016 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.287ms; driver.publication.persist-deferred 1.064ms; driver.publication.persist-deferred 1.052ms; driver.publication.persist-deferred 1.025ms; driver.publication.persist-deferred 0.946ms |
| da68d8af77f9e0710000000000000819 | 50.796 | 2.170 | n/a | 0.000 | 27.833 | 0.865 | 0.879 | 0.011 | n/a | 0.040 | 18.194 | 0.788 | n/a | 0.015 | 30.004 | 0.591 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.396ms; driver.publication.persist-deferred 1.287ms; driver.publication.persist-deferred 1.025ms; driver.publication.persist-deferred 0.946ms; driver.publication.persist-deferred 0.851ms |
| da68d8af77f9e07100000000000002fe | 50.644 | 1.686 | n/a | 0.000 | 0.126 | 2.169 | 1.672 | 0.012 | n/a | 0.159 | 40.742 | 4.061 | n/a | 0.017 | 1.812 | 0.036 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.086ms; driver.publication.persist-deferred 0.913ms; driver.publication.persist-deferred 0.890ms; driver.reader-basis.broadcast 0.039ms |
| da68d8af77f9e07100000000000002fd | 49.153 | 2.416 | n/a | 0.000 | 0.334 | 0.578 | 1.373 | 0.020 | n/a | 0.094 | 37.612 | 6.697 | n/a | 0.030 | 2.750 | 0.056 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.086ms; driver.publication.persist-deferred 0.913ms; driver.reader-basis.broadcast 0.039ms |
| da68d8af77f9e0710000000000000445 | 48.658 | 1.277 | n/a | 0.000 | 1.338 | 15.324 | 6.435 | 0.033 | n/a | 1.200 | 21.982 | 1.059 | n/a | 0.009 | 2.615 | 0.054 | 0.009 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.770ms; driver.publication.persist-deferred 1.235ms; driver.publication.persist-deferred 1.205ms; driver.publication.persist-deferred 1.019ms |
| da68d8af77f9e0710000000000000444 | 48.231 | 4.005 | n/a | 0.000 | 1.072 | 0.398 | 14.420 | 0.052 | n/a | 7.515 | 17.260 | 3.489 | n/a | 0.021 | 5.077 | 0.105 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.770ms; driver.publication.persist-deferred 1.235ms; driver.publication.persist-deferred 1.205ms |
| da68d8af77f9e0710000000000000371 | 45.241 | 2.502 | n/a | 0.000 | 15.112 | 19.980 | 0.917 | 0.015 | n/a | 0.055 | 5.747 | 0.893 | n/a | 0.019 | 17.615 | 0.389 | 0.019 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.318ms; driver.publication.persist-deferred 1.022ms; driver.publication.persist-deferred 0.880ms; driver.reader-basis.broadcast 0.043ms |
| da68d8af77f9e0710000000000000552 | 44.636 | 3.859 | n/a | 0.000 | 1.031 | 28.820 | 1.337 | 0.026 | n/a | 1.642 | 7.374 | 0.517 | n/a | 0.031 | 4.889 | 0.110 | 0.031 | node-14/thread-0/socket.wait-first-byte | none observed |
| da68d8af77f9e07100000000000004b9 | 44.560 | 5.752 | n/a | 0.000 | 0.631 | 0.553 | 1.286 | 0.016 | n/a | 0.045 | 31.735 | 4.514 | n/a | 0.028 | 6.384 | 0.143 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.988ms; driver.reader-basis.broadcast 0.046ms |
| da68d8af77f9e0710000000000000373 | 43.853 | 2.619 | n/a | 0.000 | 1.843 | 0.528 | 25.557 | 0.010 | n/a | 0.189 | 8.945 | 4.137 | n/a | 0.025 | 4.462 | 0.102 | 0.025 | gw-w/thread-48/commit.prepare-and-validate | driver.publication.persist-deferred 1.299ms; driver.publication.persist-deferred 1.022ms; driver.publication.persist-deferred 0.880ms; driver.reader-basis.broadcast 0.043ms |
| da68d8af77f9e07100000000000006bf | 43.393 | 9.478 | n/a | 0.000 | 0.758 | 14.691 | 6.807 | 0.026 | n/a | 0.074 | 11.427 | 0.121 | n/a | 0.011 | 10.236 | 0.236 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.183ms; driver.publication.persist-deferred 1.015ms; driver.publication.persist-deferred 0.932ms; driver.publication.persist-deferred 0.767ms; driver.reader-basis.broadcast 0.072ms |

## P2 / L1024 / commit / 5-10 facts (491 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.632 | 0.000 | 0.000 | 0.413 | 1.816 | n/a | 0.000 | 0.715 | 0.647 | 0.951 | 0.013 | n/a | 0.135 | 4.763 | 0.645 | n/a | 0.017 | 2.650 | 0.239 | 0.017 |
| p99 | 50.644 | 1.942 | 0.000 | 1.006 | 5.267 | n/a | 0.000 | 15.112 | 7.217 | 6.833 | 0.054 | n/a | 3.256 | 30.358 | 11.569 | n/a | 0.049 | 17.615 | 0.591 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e071000000000000074e | 60.781 | 2.510 | n/a | 0.000 | 7.150 | 0.687 | 1.113 | 0.031 | n/a | 0.149 | 18.768 | 30.341 | n/a | 0.033 | 9.660 | 0.159 | 0.033 | tx/thread-85/transactor.triplex-function | driver.publication.persist-deferred 1.376ms; driver.publication.persist-deferred 0.997ms; driver.publication.persist-deferred 0.970ms |
| da68d8af77f9e0710000000000000555 | 57.397 | 9.124 | n/a | 0.000 | 4.243 | 3.174 | 0.561 | 0.006 | n/a | 0.019 | 38.166 | 2.100 | n/a | 0.005 | 13.366 | 0.233 | 0.005 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.484ms; driver.publication.persist-deferred 0.998ms; driver.publication.persist-deferred 0.667ms; driver.reader-basis.broadcast 0.120ms |
| da68d8af77f9e0710000000000000750 | 57.188 | 1.609 | n/a | 0.000 | 0.236 | 0.385 | 0.747 | 0.010 | n/a | 0.133 | 52.419 | 1.634 | n/a | 0.014 | 1.845 | 0.032 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.997ms; driver.publication.persist-deferred 0.930ms; driver.publication.persist-deferred 0.188ms |
| da68d8af77f9e0710000000000000819 | 50.796 | 2.170 | n/a | 0.000 | 27.833 | 0.865 | 0.879 | 0.011 | n/a | 0.040 | 18.194 | 0.788 | n/a | 0.015 | 30.004 | 0.591 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.396ms; driver.publication.persist-deferred 1.287ms; driver.publication.persist-deferred 1.025ms; driver.publication.persist-deferred 0.946ms; driver.publication.persist-deferred 0.851ms |
| da68d8af77f9e07100000000000002fe | 50.644 | 1.686 | n/a | 0.000 | 0.126 | 2.169 | 1.672 | 0.012 | n/a | 0.159 | 40.742 | 4.061 | n/a | 0.017 | 1.812 | 0.036 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.086ms; driver.publication.persist-deferred 0.913ms; driver.publication.persist-deferred 0.890ms; driver.reader-basis.broadcast 0.039ms |
| da68d8af77f9e0710000000000000445 | 48.658 | 1.277 | n/a | 0.000 | 1.338 | 15.324 | 6.435 | 0.033 | n/a | 1.200 | 21.982 | 1.059 | n/a | 0.009 | 2.615 | 0.054 | 0.009 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.770ms; driver.publication.persist-deferred 1.235ms; driver.publication.persist-deferred 1.205ms; driver.publication.persist-deferred 1.019ms |
| da68d8af77f9e0710000000000000371 | 45.241 | 2.502 | n/a | 0.000 | 15.112 | 19.980 | 0.917 | 0.015 | n/a | 0.055 | 5.747 | 0.893 | n/a | 0.019 | 17.615 | 0.389 | 0.019 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.318ms; driver.publication.persist-deferred 1.022ms; driver.publication.persist-deferred 0.880ms; driver.reader-basis.broadcast 0.043ms |
| da68d8af77f9e0710000000000000373 | 43.853 | 2.619 | n/a | 0.000 | 1.843 | 0.528 | 25.557 | 0.010 | n/a | 0.189 | 8.945 | 4.137 | n/a | 0.025 | 4.462 | 0.102 | 0.025 | gw-w/thread-48/commit.prepare-and-validate | driver.publication.persist-deferred 1.299ms; driver.publication.persist-deferred 1.022ms; driver.publication.persist-deferred 0.880ms; driver.reader-basis.broadcast 0.043ms |
| da68d8af77f9e07100000000000007f5 | 41.231 | 2.401 | n/a | 0.000 | 16.206 | 1.686 | 1.048 | 0.012 | n/a | 2.397 | 16.503 | 0.972 | n/a | 0.006 | 18.607 | 0.451 | 0.006 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 9.592ms; driver.publication.persist-deferred 1.209ms; driver.publication.persist-deferred 1.081ms; driver.publication.persist-deferred 0.972ms; driver.publication.persist-deferred 0.920ms |
| da68d8af77f9e0710000000000000667 | 41.054 | 1.680 | n/a | 0.000 | 3.742 | 6.928 | 0.811 | 0.012 | n/a | 1.067 | 25.505 | 1.286 | n/a | 0.021 | 5.422 | 0.132 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.484ms; driver.expected-state.bind-receipt 1.415ms; driver.publication.persist-deferred 1.170ms; driver.publication.persist-deferred 0.895ms; driver.reader-basis.broadcast 0.086ms |
| da68d8af77f9e07100000000000004bb | 39.205 | 2.979 | n/a | 0.000 | 0.091 | 0.738 | 0.887 | 0.019 | n/a | 0.074 | 31.644 | 2.747 | n/a | 0.025 | 3.070 | 0.078 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.208ms; driver.publication.persist-deferred 0.782ms |
| da68d8af77f9e0710000000000000310 | 38.270 | 1.797 | n/a | 0.000 | 0.904 | 1.452 | 1.151 | 0.018 | n/a | 1.590 | 30.358 | 0.975 | n/a | 0.025 | 2.701 | 0.071 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.208ms; driver.publication.persist-deferred 1.023ms |
| da68d8af77f9e0710000000000000469 | 37.731 | 2.013 | n/a | 0.000 | 2.744 | 6.010 | 5.531 | 0.011 | n/a | 0.052 | 20.299 | 1.062 | n/a | 0.008 | 4.757 | 0.126 | 0.008 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.450ms; driver.publication.persist-deferred 1.009ms; driver.publication.persist-deferred 0.794ms; driver.reader-basis.broadcast 0.047ms |
| da68d8af77f9e07100000000000007f4 | 36.056 | 1.837 | n/a | 0.000 | 17.784 | 6.730 | 0.577 | 0.007 | n/a | 0.020 | 8.399 | 0.679 | n/a | 0.022 | 19.621 | 0.544 | 0.022 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 9.592ms; driver.publication.persist-deferred 1.209ms; driver.publication.persist-deferred 1.081ms; driver.publication.persist-deferred 0.920ms; driver.reader-basis.broadcast 0.093ms |
| da68d8af77f9e0710000000000000510 | 36.048 | 1.681 | n/a | 0.000 | 0.955 | 1.900 | 1.677 | 0.034 | n/a | 0.556 | 19.406 | 9.822 | n/a | 0.018 | 2.636 | 0.073 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.931ms; driver.publication.persist-deferred 1.702ms; driver.reader-basis.broadcast 0.133ms |
| da68d8af77f9e071000000000000036c | 35.315 | 3.995 | n/a | 0.000 | 4.260 | 2.437 | 0.978 | 0.015 | n/a | 2.442 | 17.688 | 3.473 | n/a | 0.026 | 8.256 | 0.234 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.318ms; driver.publication.persist-deferred 1.167ms; driver.publication.persist-deferred 0.967ms |
| da68d8af77f9e071000000000000090b | 34.986 | 1.942 | n/a | 0.000 | 22.414 | 0.398 | 0.951 | 0.009 | n/a | 0.069 | 7.453 | 1.725 | n/a | 0.024 | 24.356 | 0.696 | 0.024 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.150ms; driver.publication.persist-deferred 1.067ms; driver.publication.persist-deferred 1.022ms; driver.publication.persist-deferred 0.928ms; driver.publication.persist-deferred 0.792ms |
| da68d8af77f9e0710000000000000312 | 34.353 | 2.452 | n/a | 0.000 | 0.405 | 1.293 | 3.067 | 0.030 | n/a | 0.309 | 26.292 | 0.485 | n/a | 0.019 | 2.857 | 0.083 | 0.019 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.355ms; driver.publication.persist-deferred 1.208ms; driver.publication.persist-deferred 1.023ms |
| da68d8af77f9e0710000000000000351 | 33.845 | 1.350 | n/a | 0.000 | 0.812 | 5.113 | 1.564 | 0.034 | n/a | 4.721 | 19.348 | 0.879 | n/a | 0.024 | 2.163 | 0.064 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.099ms |
| da68d8af77f9e0710000000000000443 | 31.573 | 2.105 | n/a | 0.000 | 4.057 | 0.713 | 0.804 | 0.007 | n/a | 0.053 | 23.058 | 0.755 | n/a | 0.020 | 6.163 | 0.195 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (2622 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.883 | 0.213 | 0.000 | 0.497 | 2.215 | n/a | 0.000 | 0.670 | 0.571 | 0.938 | 0.013 | n/a | 0.086 | 4.168 | 0.734 | n/a | 0.013 | 3.049 | 0.288 | 0.013 |
| p99 | 40.789 | 2.189 | 0.016 | 2.072 | 6.728 | n/a | 0.000 | 13.661 | 7.379 | 6.413 | 0.046 | n/a | 2.921 | 23.139 | 6.561 | n/a | 0.043 | 16.075 | 0.628 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e07100000000000019e1 | 58.933 | 4.768 | n/a | 0.000 | 9.640 | 2.020 | 1.213 | 0.014 | n/a | 1.096 | 38.955 | 1.216 | n/a | 0.012 | 14.407 | 0.244 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 8.429ms; driver.publication.persist-deferred 1.229ms |
| da68d8af77f9e071000000000000181c | 57.802 | 1.392 | n/a | 0.000 | 49.135 | 1.529 | 1.167 | 0.021 | n/a | 0.336 | 3.671 | 0.541 | n/a | 0.010 | 50.527 | 0.874 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.305ms; driver.publication.persist-deferred 1.797ms; driver.publication.persist-deferred 1.384ms; driver.publication.persist-deferred 1.140ms; driver.publication.persist-deferred 1.123ms |
| da68d8af77f9e0710000000000000eaf | 56.528 | 4.724 | n/a | 0.000 | 1.061 | 7.379 | 0.743 | 0.010 | n/a | 0.063 | 41.006 | 1.534 | n/a | 0.007 | 5.785 | 0.102 | 0.007 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000eb0 | 56.430 | 2.719 | n/a | 0.000 | 1.804 | 9.300 | 2.157 | 0.004 | n/a | 0.022 | 13.218 | 27.191 | n/a | 0.016 | 4.523 | 0.080 | 0.016 | tx/thread-85/transactor.triplex-function | none observed |
| da68d8af77f9e0710000000000000eb1 | 55.365 | 4.673 | n/a | 0.000 | 1.584 | 7.808 | 0.726 | 0.006 | n/a | 0.917 | 38.974 | 0.668 | n/a | 0.010 | 6.257 | 0.113 | 0.010 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000001514 | 51.974 | 1.713 | n/a | 0.000 | 6.019 | 0.396 | 0.647 | 0.007 | n/a | 0.052 | 42.824 | 0.305 | n/a | 0.010 | 7.733 | 0.149 | 0.010 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.210ms; driver.publication.persist-deferred 1.201ms; driver.publication.persist-deferred 0.686ms; driver.reader-basis.broadcast 0.539ms |
| da68d8af77f9e0710000000000001662 | 51.965 | 2.408 | n/a | 0.000 | 17.753 | 3.072 | 20.325 | 0.018 | n/a | 0.029 | 7.508 | 0.842 | n/a | 0.010 | 20.161 | 0.388 | 0.010 | gw-w/thread-62/commit.prepare-and-validate | driver.publication.persist-deferred 1.115ms; driver.publication.persist-deferred 1.071ms; driver.publication.persist-deferred 1.057ms; driver.publication.persist-deferred 0.977ms; driver.publication.persist-deferred 0.942ms |
| da68d8af77f9e071000000000000181b | 50.182 | 5.193 | n/a | 0.000 | 25.101 | 0.647 | 3.668 | 0.014 | n/a | 0.868 | 8.862 | 5.813 | n/a | 0.015 | 30.293 | 0.604 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.305ms; driver.publication.persist-deferred 1.984ms; driver.publication.persist-deferred 1.384ms; driver.publication.persist-deferred 1.140ms; driver.reader-basis.broadcast 0.267ms |
| da68d8af77f9e0710000000000001818 | 49.710 | 2.081 | n/a | 0.000 | 41.381 | 0.428 | 0.962 | 0.016 | n/a | 0.045 | 3.953 | 0.832 | n/a | 0.012 | 43.462 | 0.874 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.621ms; driver.publication.persist-deferred 1.384ms |
| da68d8af77f9e0710000000000000d38 | 49.540 | 3.706 | 3.041 | 0.000 | 0.018 | 1.081 | 3.786 | 0.012 | n/a | 0.037 | 15.626 | 22.226 | n/a | 0.007 | 6.764 | 0.137 | 0.007 | tx/thread-85/transactor.triplex-function | driver.publication.persist-deferred 1.042ms; driver.publication.persist-deferred 0.971ms; driver.publication.persist-deferred 0.809ms; driver.publication.persist-deferred 0.668ms |
| da68d8af77f9e0710000000000000eb2 | 49.358 | 2.295 | n/a | 0.000 | 0.627 | 6.524 | 1.000 | 0.014 | n/a | 0.093 | 38.146 | 0.639 | n/a | 0.021 | 2.922 | 0.059 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.124ms; driver.publication.persist-deferred 1.067ms; driver.publication.persist-deferred 0.546ms |
| da68d8af77f9e0710000000000001817 | 48.627 | 2.657 | n/a | 0.000 | 6.672 | 15.754 | 0.878 | 0.011 | n/a | 3.331 | 15.637 | 3.660 | n/a | 0.027 | 9.328 | 0.192 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.621ms; driver.publication.persist-deferred 1.622ms |
| da68d8af77f9e0710000000000001815 | 48.328 | 5.303 | n/a | 0.000 | 6.719 | 0.722 | 1.057 | 0.041 | n/a | 22.214 | 9.464 | 2.788 | n/a | 0.021 | 12.021 | 0.249 | 0.021 | gw-w/thread-45/d/transact-async | driver.publication.persist-deferred 2.434ms; driver.publication.persist-deferred 1.622ms |
| da68d8af77f9e0710000000000001886 | 47.642 | 2.183 | n/a | 0.000 | 2.163 | 0.576 | 0.809 | 0.013 | n/a | 0.056 | 37.730 | 4.089 | n/a | 0.023 | 4.346 | 0.091 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.051ms |
| da68d8af77f9e0710000000000000a7d | 47.285 | 2.025 | n/a | 0.000 | 0.102 | 0.415 | 1.243 | 0.017 | n/a | 0.172 | 36.556 | 6.740 | n/a | 0.016 | 2.127 | 0.045 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.571ms; driver.publication.persist-deferred 0.875ms; driver.reader-basis.broadcast 0.119ms |
| da68d8af77f9e0710000000000001374 | 45.505 | 2.789 | n/a | 0.000 | 0.201 | 0.611 | 0.838 | 0.012 | n/a | 0.068 | 40.427 | 0.531 | n/a | 0.029 | 2.990 | 0.066 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e07100000000000011c8 | 45.074 | 4.066 | n/a | 0.000 | 6.469 | 0.564 | 0.943 | 0.013 | n/a | 0.101 | 31.953 | 0.947 | n/a | 0.017 | 10.535 | 0.234 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.000ms; driver.publication.persist-deferred 0.907ms; driver.reader-basis.broadcast 0.215ms |
| da68d8af77f9e0710000000000000d7c | 44.248 | 3.372 | n/a | 0.000 | 2.332 | 28.798 | 0.838 | 0.013 | n/a | 0.064 | 7.376 | 1.439 | n/a | 0.015 | 5.704 | 0.129 | 0.015 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.949ms; driver.publication.persist-deferred 1.598ms; driver.reader-basis.broadcast 0.138ms |
| da68d8af77f9e0710000000000001727 | 44.031 | 4.378 | 1.788 | 0.534 | 0.024 | 1.198 | 10.997 | 0.022 | n/a | 0.223 | 13.770 | 11.088 | n/a | 0.008 | 6.726 | 0.153 | 0.008 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.212ms; driver.publication.persist-deferred 1.100ms; driver.publication.persist-deferred 1.032ms |
| da68d8af77f9e0710000000000000f93 | 43.992 | 1.656 | n/a | 0.000 | 10.121 | 1.083 | 0.686 | 0.008 | n/a | 19.786 | 10.052 | 0.584 | n/a | 0.017 | 11.777 | 0.268 | 0.017 | gw-w/thread-44/d/transact-async | driver.publication.persist-deferred 3.849ms; driver.publication.persist-deferred 1.021ms; driver.publication.persist-deferred 0.795ms |

## P2 / tail / commit / 5-10 facts (1557 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.624 | 0.000 | 0.000 | 0.391 | 1.741 | n/a | 0.000 | 0.691 | 0.561 | 0.801 | 0.012 | n/a | 0.087 | 3.909 | 0.564 | n/a | 0.013 | 2.562 | 0.275 | 0.013 |
| p99 | 37.672 | 1.879 | 0.021 | 0.859 | 4.852 | n/a | 0.000 | 14.325 | 7.312 | 4.014 | 0.046 | n/a | 2.112 | 23.078 | 6.076 | n/a | 0.043 | 15.769 | 0.629 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da68d8af77f9e071000000000000181c | 57.802 | 1.392 | n/a | 0.000 | 49.135 | 1.529 | 1.167 | 0.021 | n/a | 0.336 | 3.671 | 0.541 | n/a | 0.010 | 50.527 | 0.874 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.305ms; driver.publication.persist-deferred 1.797ms; driver.publication.persist-deferred 1.384ms; driver.publication.persist-deferred 1.140ms; driver.publication.persist-deferred 1.123ms |
| da68d8af77f9e0710000000000000eaf | 56.528 | 4.724 | n/a | 0.000 | 1.061 | 7.379 | 0.743 | 0.010 | n/a | 0.063 | 41.006 | 1.534 | n/a | 0.007 | 5.785 | 0.102 | 0.007 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000eb0 | 56.430 | 2.719 | n/a | 0.000 | 1.804 | 9.300 | 2.157 | 0.004 | n/a | 0.022 | 13.218 | 27.191 | n/a | 0.016 | 4.523 | 0.080 | 0.016 | tx/thread-85/transactor.triplex-function | none observed |
| da68d8af77f9e0710000000000001514 | 51.974 | 1.713 | n/a | 0.000 | 6.019 | 0.396 | 0.647 | 0.007 | n/a | 0.052 | 42.824 | 0.305 | n/a | 0.010 | 7.733 | 0.149 | 0.010 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.210ms; driver.publication.persist-deferred 1.201ms; driver.publication.persist-deferred 0.686ms; driver.reader-basis.broadcast 0.539ms |
| da68d8af77f9e0710000000000001886 | 47.642 | 2.183 | n/a | 0.000 | 2.163 | 0.576 | 0.809 | 0.013 | n/a | 0.056 | 37.730 | 4.089 | n/a | 0.023 | 4.346 | 0.091 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.051ms |
| da68d8af77f9e0710000000000000a7d | 47.285 | 2.025 | n/a | 0.000 | 0.102 | 0.415 | 1.243 | 0.017 | n/a | 0.172 | 36.556 | 6.740 | n/a | 0.016 | 2.127 | 0.045 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.571ms; driver.publication.persist-deferred 0.875ms; driver.reader-basis.broadcast 0.119ms |
| da68d8af77f9e0710000000000001374 | 45.505 | 2.789 | n/a | 0.000 | 0.201 | 0.611 | 0.838 | 0.012 | n/a | 0.068 | 40.427 | 0.531 | n/a | 0.029 | 2.990 | 0.066 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da68d8af77f9e0710000000000000f93 | 43.992 | 1.656 | n/a | 0.000 | 10.121 | 1.083 | 0.686 | 0.008 | n/a | 19.786 | 10.052 | 0.584 | n/a | 0.017 | 11.777 | 0.268 | 0.017 | gw-w/thread-44/d/transact-async | driver.publication.persist-deferred 3.849ms; driver.publication.persist-deferred 1.021ms; driver.publication.persist-deferred 0.795ms |
| da68d8af77f9e0710000000000001819 | 43.677 | 2.829 | n/a | 0.000 | 32.384 | 3.079 | 0.743 | 0.013 | n/a | 0.308 | 3.106 | 1.202 | n/a | 0.014 | 35.213 | 0.806 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.305ms; driver.publication.persist-deferred 2.621ms; driver.publication.persist-deferred 1.384ms |
| da68d8af77f9e07100000000000009ae | 42.729 | 2.314 | n/a | 0.000 | 3.364 | 2.652 | 0.996 | 0.014 | n/a | 1.168 | 25.975 | 6.227 | n/a | 0.020 | 5.678 | 0.133 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.752ms; driver.publication.persist-deferred 1.438ms; driver.publication.persist-deferred 1.234ms; driver.publication.persist-deferred 1.203ms; driver.publication.persist-deferred 1.085ms |
| da68d8af77f9e07100000000000009de | 42.587 | 1.532 | n/a | 0.000 | 4.084 | 4.109 | 1.468 | 0.022 | n/a | 1.931 | 22.006 | 7.425 | n/a | 0.011 | 5.616 | 0.132 | 0.011 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.649ms; driver.expected-state.bind-receipt 1.444ms; driver.publication.persist-deferred 1.091ms; driver.publication.persist-deferred 0.997ms; driver.publication.persist-deferred 0.994ms |
| da68d8af77f9e0710000000000000d7e | 40.806 | 2.770 | n/a | 0.000 | 19.978 | 1.728 | 0.937 | 0.013 | n/a | 0.721 | 14.280 | 0.365 | n/a | 0.013 | 22.748 | 0.557 | 0.013 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 1.187ms; driver.publication.persist-deferred 1.000ms; driver.reader-basis.broadcast 0.138ms |
| da68d8af77f9e0710000000000000f90 | 40.754 | 2.262 | n/a | 0.000 | 5.050 | 4.459 | 0.385 | 0.004 | n/a | 0.014 | 27.943 | 0.626 | n/a | 0.011 | 7.312 | 0.179 | 0.011 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.849ms; driver.publication.persist-deferred 1.039ms; driver.publication.persist-deferred 1.021ms |
| da68d8af77f9e07100000000000018ae | 38.602 | 4.442 | n/a | 0.000 | 4.660 | 5.628 | 0.572 | 0.009 | n/a | 0.538 | 22.377 | 0.358 | n/a | 0.016 | 9.103 | 0.236 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.199ms; driver.publication.persist-deferred 1.158ms; driver.publication.persist-deferred 0.999ms; driver.reader-basis.broadcast 0.575ms |
| da68d8af77f9e0710000000000000f91 | 38.309 | 4.196 | n/a | 0.000 | 4.478 | 0.523 | 0.979 | 0.008 | n/a | 0.354 | 27.289 | 0.476 | n/a | 0.007 | 8.675 | 0.226 | 0.007 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.849ms; driver.publication.persist-deferred 1.039ms |
| da68d8af77f9e0710000000000000d7f | 37.672 | 3.604 | n/a | 0.000 | 19.411 | 1.270 | 0.746 | 0.007 | n/a | 0.211 | 8.576 | 3.842 | n/a | 0.005 | 23.014 | 0.611 | 0.005 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 1.187ms; driver.reader-basis.broadcast 0.138ms |
| da68d8af77f9e0710000000000000a7b | 36.284 | 1.644 | n/a | 0.000 | 1.182 | 0.418 | 0.825 | 0.011 | n/a | 0.098 | 8.385 | 23.709 | n/a | 0.011 | 2.826 | 0.078 | 0.011 | tx/thread-85/transactor.triplex-function | driver.publication.persist-deferred 0.712ms |
| da68d8af77f9e07100000000000015c3 | 36.232 | 3.196 | n/a | 0.000 | 0.386 | 18.641 | 0.793 | 0.013 | n/a | 0.065 | 12.349 | 0.746 | n/a | 0.042 | 3.582 | 0.099 | 0.042 | node-14/thread-0/socket.wait-first-byte | none observed |
| da68d8af77f9e0710000000000001518 | 36.005 | 2.087 | n/a | 0.000 | 0.433 | 2.856 | 0.706 | 0.014 | n/a | 0.267 | 27.913 | 1.706 | n/a | 0.023 | 2.520 | 0.070 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.474ms; driver.publication.persist-deferred 1.210ms; driver.reader-basis.broadcast 0.539ms |
| da68d8af77f9e07100000000000009af | 35.971 | 2.333 | n/a | 0.000 | 1.156 | 0.447 | 1.069 | 0.007 | n/a | 0.066 | 18.606 | 12.278 | n/a | 0.011 | 3.488 | 0.097 | 0.011 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.752ms; driver.publication.persist-deferred 1.438ms; driver.publication.persist-deferred 1.085ms; driver.publication.persist-deferred 0.952ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 200.771 | n/a | n/a | n/a | 0.051 | n/a | 0.000 | 0.000 | 0.939 | 200.379 | 0.012 | n/a | 0.020 | 0.000 | n/a | n/a | 0.150 | 0.051 | 0.000 | 0.150 |
| p99 | 392.103 | n/a | n/a | n/a | 20.923 | n/a | 1.566 | 0.000 | 5.054 | 384.982 | 0.160 | n/a | 0.265 | 0.000 | n/a | n/a | 0.502 | 22.433 | 0.351 | 0.502 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4387f02e373927320000000000000002 | 392.103 | 4.734 | n/a | 0.000 | 0.000 | 1.460 | 384.982 | 0.160 | n/a | 0.265 | 0.000 | n/a | n/a | 0.502 | 4.734 | 0.012 | 0.502 | gw-r/thread-47/gateway.admitted-work | none observed |
| 9ab027266b518c770000000000000007 | 203.368 | 0.042 | n/a | 0.000 | 0.000 | 0.939 | 201.970 | 0.021 | n/a | 0.215 | 0.000 | n/a | n/a | 0.181 | 0.042 | 0.000 | 0.181 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c770000000000000006 | 202.770 | 0.136 | n/a | 0.000 | 0.000 | 1.141 | 201.224 | 0.013 | n/a | 0.157 | 0.000 | n/a | n/a | 0.099 | 0.136 | 0.001 | 0.099 | gw-r/thread-44/journal/page | none observed |
| 9ab027266b518c770000000000000005 | 202.124 | 0.048 | n/a | 0.000 | 0.000 | 0.818 | 200.996 | 0.013 | n/a | 0.115 | 0.000 | n/a | n/a | 0.134 | 0.048 | 0.000 | 0.134 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c770000000000000f2b | 201.354 | 0.051 | n/a | 0.000 | 0.000 | 0.766 | 200.369 | 0.003 | n/a | 0.015 | 0.000 | n/a | n/a | 0.150 | 0.051 | 0.000 | 0.150 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c770000000000000f2a | 200.771 | 0.024 | n/a | 0.000 | 0.000 | 0.279 | 200.401 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.043 | 0.024 | 0.000 | 0.043 | gw-r/thread-64/journal/page | none observed |
| 9ab027266b518c770000000000000f2c | 200.727 | 0.017 | n/a | 0.000 | 0.000 | 0.254 | 200.379 | 0.012 | n/a | 0.024 | 0.000 | n/a | n/a | 0.041 | 0.017 | 0.000 | 0.041 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c770000000000000f2f | 74.195 | 20.923 | n/a | 1.510 | 0.000 | 5.054 | 46.528 | 0.003 | n/a | 0.003 | 0.000 | n/a | n/a | 0.175 | 22.433 | 0.302 | 0.175 | gw-r/thread-44/gateway.admitted-work | none observed |
| 9ab027266b518c770000000000000f30 | 59.743 | 14.894 | n/a | 0.000 | 0.000 | 2.664 | 41.998 | 0.011 | n/a | 0.010 | 0.000 | n/a | n/a | 0.167 | 14.894 | 0.249 | 0.167 | gw-r/thread-46/gateway.admitted-work | none observed |
| 9ab027266b518c770000000000000f31 | 56.157 | 18.120 | n/a | 1.566 | 0.000 | 2.513 | 33.690 | 0.012 | n/a | 0.017 | 0.000 | n/a | n/a | 0.238 | 19.686 | 0.351 | 0.238 | gw-r/thread-64/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 837.237 | n/a | n/a | n/a | 0.209 | n/a | 0.000 | 0.000 | 0.658 | 818.824 | 0.012 | n/a | 0.143 | 0.000 | n/a | n/a | 0.281 | 0.209 | 0.000 | 0.281 |
| p99 | 1007.303 | n/a | n/a | n/a | 17.312 | n/a | 0.000 | 0.000 | 4.241 | 1001.290 | 0.018 | n/a | 0.269 | 0.000 | n/a | n/a | 1.282 | 17.312 | 0.021 | 1.282 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4387f02e3739273200000000000000a4 | 1007.303 | 0.209 | n/a | 0.000 | 0.000 | 4.241 | 1001.290 | 0.012 | n/a | 0.269 | 0.000 | n/a | n/a | 1.282 | 0.209 | 0.000 | 1.282 | gw-r/thread-43/journal/page | none observed |
| 4387f02e3739273200000000000000a5 | 837.237 | 17.312 | n/a | 0.000 | 0.000 | 0.658 | 818.824 | 0.018 | n/a | 0.143 | 0.000 | n/a | n/a | 0.281 | 17.312 | 0.021 | 0.281 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 389.890 | n/a | n/a | n/a | 2.699 | n/a | 0.000 | 0.000 | 0.852 | 386.964 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.090 | 2.699 | 0.007 | 0.090 |
| p99 | 1000.864 | n/a | n/a | n/a | 9.010 | n/a | 0.000 | 0.000 | 4.651 | 997.054 | 0.041 | n/a | 0.154 | 0.000 | n/a | n/a | 0.339 | 9.010 | 0.090 | 0.339 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4387f02e3739273200000000000000ae | 1000.864 | 4.351 | n/a | 0.000 | 0.000 | 4.363 | 991.907 | 0.013 | n/a | 0.078 | 0.000 | n/a | n/a | 0.152 | 4.351 | 0.004 | 0.152 | gw-r/thread-43/journal/page | none observed |
| 4387f02e3739273200000000000000bb | 1000.365 | 2.510 | n/a | 0.000 | 0.000 | 0.569 | 997.054 | 0.018 | n/a | 0.131 | 0.000 | n/a | n/a | 0.083 | 2.510 | 0.003 | 0.083 | gw-r/thread-45/journal/page | none observed |
| 4387f02e3739273200000000000000cf | 990.840 | 3.055 | n/a | 0.000 | 0.000 | 0.852 | 986.778 | 0.011 | n/a | 0.065 | 0.000 | n/a | n/a | 0.079 | 3.055 | 0.003 | 0.079 | gw-r/thread-47/journal/page | none observed |
| 4387f02e3739273200000000000000b4 | 987.399 | 2.663 | n/a | 0.000 | 0.000 | 0.652 | 983.905 | 0.012 | n/a | 0.079 | 0.000 | n/a | n/a | 0.088 | 2.663 | 0.003 | 0.088 | gw-r/thread-43/journal/page | none observed |
| 4387f02e3739273200000000000000ba | 982.400 | 2.608 | n/a | 0.000 | 0.000 | 4.651 | 974.939 | 0.012 | n/a | 0.103 | 0.000 | n/a | n/a | 0.086 | 2.608 | 0.003 | 0.086 | gw-r/thread-43/journal/page | none observed |
| 4387f02e3739273200000000000000ab | 844.404 | 3.150 | n/a | 0.000 | 0.000 | 0.495 | 840.543 | 0.012 | n/a | 0.081 | 0.000 | n/a | n/a | 0.124 | 3.150 | 0.004 | 0.124 | gw-r/thread-46/journal/page | none observed |
| 4387f02e3739273200000000000000c1 | 795.616 | 9.010 | n/a | 0.000 | 0.000 | 0.564 | 785.854 | 0.023 | n/a | 0.050 | 0.000 | n/a | n/a | 0.115 | 9.010 | 0.011 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 4387f02e3739273200000000000000a8 | 786.315 | 4.479 | n/a | 0.000 | 0.000 | 0.733 | 780.832 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.176 | 4.479 | 0.006 | 0.176 | gw-r/thread-45/journal/page | none observed |
| 4387f02e3739273200000000000000b2 | 684.492 | 2.818 | n/a | 0.000 | 0.000 | 0.611 | 680.875 | 0.036 | n/a | 0.080 | 0.000 | n/a | n/a | 0.073 | 2.818 | 0.004 | 0.073 | gw-r/thread-46/journal/page | none observed |
| 4387f02e3739273200000000000000ca | 654.793 | 4.378 | n/a | 0.000 | 0.000 | 0.508 | 649.698 | 0.011 | n/a | 0.075 | 0.000 | n/a | n/a | 0.123 | 4.378 | 0.007 | 0.123 | gw-r/thread-45/journal/page | none observed |
| 4387f02e3739273200000000000000c9 | 606.777 | 2.921 | n/a | 0.000 | 0.000 | 0.530 | 603.179 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.078 | 2.921 | 0.005 | 0.078 | gw-r/thread-43/journal/page | none observed |
| 4387f02e3739273200000000000000c0 | 585.126 | 2.390 | n/a | 0.000 | 0.000 | 0.620 | 581.958 | 0.020 | n/a | 0.049 | 0.000 | n/a | n/a | 0.091 | 2.390 | 0.004 | 0.091 | gw-r/thread-43/journal/page | none observed |
| 4387f02e3739273200000000000000c6 | 571.396 | 2.625 | n/a | 0.000 | 0.000 | 1.815 | 566.810 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.072 | 2.625 | 0.005 | 0.072 | gw-r/thread-44/journal/page | none observed |
| 4387f02e3739273200000000000000b7 | 424.347 | 6.027 | n/a | 0.000 | 0.000 | 0.917 | 417.078 | 0.011 | n/a | 0.110 | 0.000 | n/a | n/a | 0.204 | 6.027 | 0.014 | 0.204 | gw-r/thread-47/journal/page | none observed |
| 4387f02e3739273200000000000000c7 | 389.890 | 2.156 | n/a | 0.000 | 0.000 | 0.585 | 386.964 | 0.041 | n/a | 0.072 | 0.000 | n/a | n/a | 0.073 | 2.156 | 0.006 | 0.073 | gw-r/thread-41/journal/page | none observed |
| 4387f02e3739273200000000000000a7 | 383.165 | 5.365 | n/a | 0.000 | 0.000 | 1.190 | 376.287 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.241 | 5.365 | 0.014 | 0.241 | gw-r/thread-43/journal/page | none observed |
| 4387f02e3739273200000000000000c4 | 373.041 | 2.099 | n/a | 0.000 | 0.000 | 0.414 | 370.377 | 0.012 | n/a | 0.069 | 0.000 | n/a | n/a | 0.069 | 2.099 | 0.006 | 0.069 | gw-r/thread-45/journal/page | none observed |
| 4387f02e3739273200000000000000b8 | 351.576 | 2.517 | n/a | 0.000 | 0.000 | 1.203 | 347.623 | 0.019 | n/a | 0.124 | 0.000 | n/a | n/a | 0.090 | 2.517 | 0.007 | 0.090 | gw-r/thread-45/journal/page | none observed |
| 4387f02e3739273200000000000000b1 | 307.995 | 4.165 | n/a | 0.000 | 0.000 | 2.063 | 301.577 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 0.117 | 4.165 | 0.014 | 0.117 | gw-r/thread-43/journal/page | none observed |
| 4387f02e3739273200000000000000cc | 273.286 | 2.657 | n/a | 0.000 | 0.000 | 4.447 | 265.993 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 0.086 | 2.657 | 0.010 | 0.086 | gw-r/thread-47/journal/page | none observed |

## P3 / L1 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 412.734 | n/a | n/a | n/a | 4.136 | n/a | 0.491 | 0.000 | 0.738 | 405.730 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.104 | 4.451 | 0.015 | 0.104 |
| p99 | 1012.615 | n/a | n/a | n/a | 15.882 | n/a | 3.841 | 0.000 | 4.366 | 1000.784 | 3.446 | n/a | 0.159 | 0.000 | n/a | n/a | 0.517 | 16.423 | 0.290 | 0.517 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4387f02e3739273200000000000000d0 | 1012.615 | 9.924 | n/a | 0.710 | 0.000 | 2.466 | 999.299 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.136 | 10.635 | 0.011 | 0.136 | gw-r/thread-43/journal/page | none observed |
| 4387f02e373927320000000000000104 | 1007.306 | 6.101 | n/a | 0.706 | 0.000 | 1.449 | 998.795 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.179 | 6.806 | 0.007 | 0.179 | gw-r/thread-41/journal/page | none observed |
| 4387f02e3739273200000000000000dc | 1003.117 | 0.113 | n/a | 0.000 | 0.000 | 2.065 | 1000.784 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 0.052 | 0.113 | 0.000 | 0.052 | gw-r/thread-44/journal/page | none observed |
| 4387f02e373927320000000000000100 | 997.529 | 2.770 | n/a | 0.000 | 0.000 | 0.614 | 993.550 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.517 | 2.770 | 0.003 | 0.517 | gw-r/thread-46/journal/page | none observed |
| 4387f02e3739273200000000000000de | 994.578 | 3.719 | n/a | 0.516 | 0.000 | 0.416 | 989.784 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.080 | 4.235 | 0.004 | 0.080 | gw-r/thread-43/journal/page | none observed |
| 4387f02e3739273200000000000000d1 | 993.029 | 4.136 | n/a | 0.476 | 0.000 | 0.633 | 987.583 | 0.011 | n/a | 0.076 | 0.000 | n/a | n/a | 0.114 | 4.612 | 0.005 | 0.114 | gw-r/thread-44/journal/page | none observed |
| 4387f02e3739273200000000000000d8 | 980.716 | 4.226 | n/a | 0.515 | 0.000 | 0.616 | 975.147 | 0.018 | n/a | 0.090 | 0.000 | n/a | n/a | 0.104 | 4.741 | 0.005 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 4387f02e3739273200000000000000fd | 979.564 | 7.253 | n/a | 0.606 | 0.000 | 0.554 | 970.920 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.158 | 7.860 | 0.008 | 0.158 | gw-r/thread-47/journal/page | none observed |
| 4387f02e37392732000000000000010c | 963.293 | 2.862 | n/a | 0.000 | 0.000 | 0.539 | 959.724 | 0.017 | n/a | 0.083 | 0.000 | n/a | n/a | 0.069 | 2.862 | 0.003 | 0.069 | gw-r/thread-41/journal/page | none observed |
| 4387f02e3739273200000000000000d7 | 953.938 | 3.775 | n/a | 0.491 | 0.000 | 0.595 | 948.835 | 0.011 | n/a | 0.065 | 0.000 | n/a | n/a | 0.167 | 4.266 | 0.004 | 0.167 | gw-r/thread-46/journal/page | none observed |
| 4387f02e3739273200000000000000e3 | 811.427 | 3.116 | n/a | 0.515 | 0.000 | 0.429 | 807.255 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.080 | 3.631 | 0.004 | 0.080 | gw-r/thread-47/journal/page | none observed |
| 4387f02e3739273200000000000000df | 809.242 | 5.811 | n/a | 1.030 | 0.000 | 0.593 | 801.614 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.125 | 6.840 | 0.008 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 4387f02e373927320000000000000101 | 790.485 | 2.907 | n/a | 0.614 | 0.000 | 1.159 | 785.596 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.138 | 3.521 | 0.004 | 0.138 | gw-r/thread-44/journal/page | none observed |
| 4387f02e3739273200000000000000ea | 630.810 | 4.630 | n/a | 0.000 | 0.000 | 0.699 | 625.261 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.143 | 4.630 | 0.007 | 0.143 | gw-r/thread-48/journal/page | none observed |
| 4387f02e3739273200000000000000fa | 604.363 | 4.889 | n/a | 0.732 | 0.000 | 0.900 | 597.616 | 0.014 | n/a | 0.129 | 0.000 | n/a | n/a | 0.082 | 5.621 | 0.009 | 0.082 | gw-r/thread-47/journal/page | none observed |
| 4387f02e3739273200000000000000d9 | 596.078 | 5.855 | n/a | 3.841 | 0.000 | 1.001 | 585.164 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.128 | 9.696 | 0.016 | 0.128 | gw-r/thread-43/journal/page | none observed |
| 4387f02e3739273200000000000000e7 | 578.615 | 11.082 | n/a | 1.420 | 0.000 | 2.807 | 563.004 | 0.023 | n/a | 0.159 | 0.000 | n/a | n/a | 0.121 | 12.501 | 0.022 | 0.121 | gw-r/thread-44/journal/page | none observed |
| 4387f02e373927320000000000000106 | 474.476 | 15.882 | n/a | 0.541 | 0.000 | 0.760 | 456.928 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.283 | 16.423 | 0.035 | 0.283 | gw-r/thread-46/journal/page | none observed |
| 4387f02e3739273200000000000000d3 | 454.492 | 6.559 | n/a | 3.199 | 0.000 | 0.809 | 443.773 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.087 | 9.757 | 0.021 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 4387f02e3739273200000000000000d2 | 416.664 | 5.591 | n/a | 0.732 | 0.000 | 0.884 | 409.242 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.120 | 6.323 | 0.015 | 0.120 | gw-r/thread-41/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 377.361 | n/a | n/a | n/a | 3.362 | n/a | 0.000 | 0.000 | 0.772 | 370.058 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.080 | 3.739 | 0.010 | 0.080 |
| p99 | 1003.779 | n/a | n/a | n/a | 13.868 | n/a | 1.296 | 0.000 | 4.116 | 1001.042 | 0.230 | n/a | 0.142 | 0.000 | n/a | n/a | 1.120 | 13.868 | 0.311 | 1.120 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4387f02e373927320000000000000124 | 1003.779 | 5.083 | n/a | 0.728 | 0.000 | 0.627 | 997.197 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.097 | 5.811 | 0.006 | 0.097 | gw-r/thread-45/journal/page | none observed |
| 4387f02e373927320000000000000128 | 1003.365 | 0.141 | n/a | 0.000 | 0.000 | 0.689 | 1001.042 | 0.230 | n/a | 0.142 | 0.000 | n/a | n/a | 1.120 | 0.141 | 0.000 | 1.120 | gw-r/thread-47/journal/page | none observed |
| 4387f02e37392732000000000000011b | 997.114 | 7.013 | n/a | 1.276 | 0.000 | 0.593 | 988.014 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.177 | 8.289 | 0.008 | 0.177 | gw-r/thread-47/journal/page | none observed |
| 4387f02e37392732000000000000012a | 995.543 | 7.116 | n/a | 0.000 | 0.000 | 0.868 | 987.276 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.238 | 7.116 | 0.007 | 0.238 | gw-r/thread-43/journal/page | none observed |
| 4387f02e373927320000000000000113 | 993.391 | 3.049 | n/a | 0.689 | 0.000 | 0.659 | 988.830 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.110 | 3.739 | 0.004 | 0.110 | gw-r/thread-48/journal/page | none observed |
| 4387f02e373927320000000000000136 | 986.162 | 2.403 | n/a | 0.000 | 0.000 | 0.772 | 982.857 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.057 | 2.403 | 0.002 | 0.057 | gw-r/thread-43/journal/page | none observed |
| 4387f02e37392732000000000000013f | 950.171 | 5.585 | n/a | 0.000 | 0.000 | 1.119 | 943.261 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.167 | 5.585 | 0.006 | 0.167 | gw-r/thread-46/journal/page | none observed |
| 4387f02e373927320000000000000110 | 834.250 | 7.434 | n/a | 0.728 | 0.000 | 1.545 | 824.324 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.162 | 8.162 | 0.010 | 0.162 | gw-r/thread-46/journal/page | none observed |
| 4387f02e373927320000000000000146 | 743.252 | 4.624 | n/a | 0.000 | 0.000 | 0.836 | 737.655 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.080 | 4.624 | 0.006 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 4387f02e37392732000000000000011c | 740.405 | 2.506 | n/a | 0.000 | 0.000 | 0.683 | 737.032 | 0.015 | n/a | 0.096 | 0.000 | n/a | n/a | 0.072 | 2.506 | 0.003 | 0.072 | gw-r/thread-45/journal/page | none observed |
| 4387f02e373927320000000000000125 | 739.008 | 4.207 | n/a | 0.000 | 0.000 | 1.903 | 732.767 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.073 | 4.207 | 0.006 | 0.073 | gw-r/thread-44/journal/page | none observed |
| 4387f02e37392732000000000000013b | 722.579 | 2.727 | n/a | 0.000 | 0.000 | 0.684 | 719.021 | 0.005 | n/a | 0.068 | 0.000 | n/a | n/a | 0.073 | 2.727 | 0.004 | 0.073 | gw-r/thread-43/journal/page | none observed |
| 4387f02e373927320000000000000131 | 696.871 | 2.622 | n/a | 0.688 | 0.000 | 0.467 | 692.992 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.055 | 3.310 | 0.005 | 0.055 | gw-r/thread-46/journal/page | none observed |
| 4387f02e373927320000000000000133 | 692.331 | 2.901 | n/a | 0.000 | 0.000 | 1.067 | 688.236 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.071 | 2.901 | 0.004 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 4387f02e37392732000000000000010d | 688.594 | 2.607 | n/a | 0.494 | 0.000 | 0.551 | 684.811 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.080 | 3.101 | 0.005 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 4387f02e373927320000000000000122 | 665.604 | 3.362 | n/a | 0.000 | 0.000 | 1.403 | 660.725 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.069 | 3.362 | 0.005 | 0.069 | gw-r/thread-45/journal/page | none observed |
| 4387f02e37392732000000000000012c | 652.051 | 2.460 | n/a | 0.000 | 0.000 | 0.379 | 649.115 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.063 | 2.460 | 0.004 | 0.063 | gw-r/thread-41/journal/page | none observed |
| 4387f02e373927320000000000000140 | 620.367 | 6.049 | n/a | 0.000 | 0.000 | 0.602 | 613.496 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.178 | 6.049 | 0.010 | 0.178 | gw-r/thread-43/journal/page | none observed |
| 4387f02e373927320000000000000137 | 583.620 | 13.868 | n/a | 0.000 | 0.000 | 2.018 | 567.521 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.142 | 13.868 | 0.024 | 0.142 | gw-r/thread-48/journal/page | none observed |
| 4387f02e373927320000000000000138 | 415.577 | 2.770 | n/a | 0.000 | 0.000 | 0.898 | 411.795 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.061 | 2.770 | 0.007 | 0.061 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 394.047 | n/a | n/a | n/a | 2.621 | n/a | 0.000 | 0.000 | 0.593 | 389.648 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.071 | 2.651 | 0.009 | 0.071 |
| p99 | 1004.170 | n/a | n/a | n/a | 9.630 | n/a | 0.826 | 0.000 | 5.610 | 1000.940 | 5.095 | n/a | 0.103 | 0.000 | n/a | n/a | 1.135 | 9.630 | 0.327 | 1.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4387f02e373927320000000000000152 | 1004.170 | 0.176 | n/a | 0.000 | 0.000 | 2.069 | 1000.738 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 1.135 | 0.176 | 0.000 | 1.135 | gw-r/thread-44/journal/page | none observed |
| 4387f02e373927320000000000000184 | 1002.791 | 0.129 | n/a | 0.000 | 0.000 | 0.518 | 1000.940 | 0.025 | n/a | 0.065 | 0.000 | n/a | n/a | 1.114 | 0.129 | 0.000 | 1.114 | gw-r/thread-47/journal/page | none observed |
| 4387f02e373927320000000000000163 | 1002.336 | 0.110 | n/a | 0.000 | 0.000 | 0.441 | 1000.628 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 1.101 | 0.110 | 0.000 | 1.101 | gw-r/thread-41/journal/page | none observed |
| 4387f02e37392732000000000000017d | 1001.916 | 2.337 | n/a | 0.000 | 0.000 | 0.412 | 999.062 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.057 | 2.337 | 0.002 | 0.057 | gw-r/thread-46/journal/page | none observed |
| 4387f02e373927320000000000000183 | 996.123 | 5.286 | n/a | 0.000 | 0.000 | 2.424 | 988.196 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.170 | 5.286 | 0.005 | 0.170 | gw-r/thread-43/journal/page | none observed |
| 4387f02e37392732000000000000016d | 977.677 | 2.331 | n/a | 0.000 | 0.000 | 0.550 | 974.681 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 0.060 | 2.331 | 0.002 | 0.060 | gw-r/thread-43/journal/page | none observed |
| 4387f02e373927320000000000000172 | 956.807 | 2.872 | n/a | 0.000 | 0.000 | 0.394 | 953.423 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.068 | 2.872 | 0.003 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 4387f02e373927320000000000000158 | 829.238 | 2.959 | n/a | 0.000 | 0.000 | 0.461 | 825.719 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.065 | 2.959 | 0.004 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 4387f02e373927320000000000000179 | 813.096 | 5.201 | n/a | 0.000 | 0.000 | 0.780 | 807.017 | 0.002 | n/a | 0.022 | 0.000 | n/a | n/a | 0.074 | 5.201 | 0.006 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 4387f02e373927320000000000000154 | 754.330 | 2.086 | n/a | 0.000 | 0.000 | 3.120 | 743.947 | 5.095 | n/a | 0.012 | 0.000 | n/a | n/a | 0.069 | 2.086 | 0.003 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 4387f02e37392732000000000000016b | 647.847 | 2.456 | n/a | 0.000 | 0.000 | 0.354 | 644.918 | 0.010 | n/a | 0.046 | 0.000 | n/a | n/a | 0.063 | 2.456 | 0.004 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 4387f02e373927320000000000000182 | 631.498 | 2.267 | n/a | 0.000 | 0.000 | 0.526 | 628.595 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.068 | 2.267 | 0.004 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 4387f02e37392732000000000000014d | 614.462 | 1.961 | n/a | 0.000 | 0.000 | 0.414 | 611.898 | 0.024 | n/a | 0.103 | 0.000 | n/a | n/a | 0.063 | 1.961 | 0.003 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 4387f02e37392732000000000000017c | 591.348 | 2.651 | n/a | 0.000 | 0.000 | 2.668 | 585.871 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.112 | 2.651 | 0.004 | 0.112 | gw-r/thread-48/journal/page | none observed |
| 4387f02e373927320000000000000187 | 589.017 | 2.393 | n/a | 0.754 | 0.000 | 2.205 | 583.513 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.093 | 3.147 | 0.005 | 0.093 | gw-r/thread-44/journal/page | none observed |
| 4387f02e373927320000000000000176 | 587.321 | 3.829 | n/a | 0.000 | 0.000 | 0.652 | 582.713 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.092 | 3.829 | 0.007 | 0.092 | gw-r/thread-43/journal/page | none observed |
| 4387f02e37392732000000000000016f | 578.740 | 2.298 | n/a | 0.000 | 0.000 | 0.515 | 575.831 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.067 | 2.298 | 0.004 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 4387f02e373927320000000000000165 | 561.565 | 9.630 | n/a | 0.000 | 0.000 | 0.975 | 550.837 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.080 | 9.630 | 0.017 | 0.080 | gw-r/thread-43/journal/page | none observed |
| 4387f02e373927320000000000000166 | 443.133 | 2.282 | n/a | 0.000 | 0.000 | 0.558 | 440.163 | 0.015 | n/a | 0.048 | 0.000 | n/a | n/a | 0.068 | 2.282 | 0.005 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 4387f02e37392732000000000000016e | 416.869 | 5.519 | n/a | 0.000 | 0.000 | 5.610 | 405.638 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.073 | 5.519 | 0.013 | 0.073 | gw-r/thread-47/journal/page | none observed |

## P3 / L64 / internal (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 324.727 | n/a | n/a | n/a | 2.799 | n/a | 0.000 | 0.000 | 0.596 | 318.804 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.069 | 2.799 | 0.011 | 0.069 |
| p99 | 1002.773 | n/a | n/a | n/a | 10.282 | n/a | 0.000 | 0.000 | 4.233 | 1001.040 | 3.112 | n/a | 0.345 | 0.000 | n/a | n/a | 1.098 | 10.282 | 0.798 | 1.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4387f02e3739273200000000000001a5 | 1002.773 | 0.110 | n/a | 0.000 | 0.000 | 0.443 | 1001.040 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 1.098 | 0.110 | 0.000 | 1.098 | gw-r/thread-41/journal/page | none observed |
| 4387f02e3739273200000000000001c3 | 1001.651 | 2.420 | n/a | 0.000 | 0.000 | 4.233 | 994.900 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.059 | 2.420 | 0.002 | 0.059 | gw-r/thread-47/journal/page | none observed |
| 4387f02e373927320000000000000198 | 996.108 | 2.443 | n/a | 0.000 | 0.000 | 1.872 | 991.654 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 0.066 | 2.443 | 0.002 | 0.066 | gw-r/thread-44/journal/page | none observed |
| 4387f02e373927320000000000000189 | 995.565 | 2.507 | n/a | 0.000 | 0.000 | 3.220 | 989.726 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.063 | 2.507 | 0.003 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 4387f02e3739273200000000000001a4 | 994.631 | 2.537 | n/a | 0.000 | 0.000 | 0.344 | 991.651 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.066 | 2.537 | 0.003 | 0.066 | gw-r/thread-43/journal/page | none observed |
| 4387f02e3739273200000000000001c2 | 982.186 | 3.351 | n/a | 0.000 | 0.000 | 0.549 | 978.082 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.176 | 3.351 | 0.003 | 0.176 | gw-r/thread-44/journal/page | none observed |
| 4387f02e3739273200000000000001a2 | 933.677 | 2.501 | n/a | 0.000 | 0.000 | 0.463 | 930.596 | 0.010 | n/a | 0.040 | 0.000 | n/a | n/a | 0.067 | 2.501 | 0.003 | 0.067 | gw-r/thread-45/journal/page | none observed |
| 4387f02e37392732000000000000019a | 845.484 | 4.013 | n/a | 0.000 | 0.000 | 0.744 | 840.593 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.084 | 4.013 | 0.005 | 0.084 | gw-r/thread-43/journal/page | none observed |
| 4387f02e3739273200000000000001c0 | 811.231 | 3.796 | n/a | 0.000 | 0.000 | 0.643 | 806.677 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.076 | 3.796 | 0.005 | 0.076 | gw-r/thread-48/journal/page | none observed |
| 4387f02e3739273200000000000001d3 | 729.760 | 1.521 | n/a | 0.000 | 0.000 | 0.596 | 727.540 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.075 | 1.521 | 0.002 | 0.075 | gw-r/thread-41/journal/page | none observed |
| 4387f02e3739273200000000000001b4 | 677.495 | 3.103 | n/a | 0.000 | 0.000 | 0.651 | 673.644 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.066 | 3.103 | 0.005 | 0.066 | gw-r/thread-45/journal/page | none observed |
| 4387f02e37392732000000000000019e | 637.859 | 3.985 | n/a | 0.000 | 0.000 | 0.402 | 633.372 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.066 | 3.985 | 0.006 | 0.066 | gw-r/thread-45/journal/page | none observed |
| 4387f02e3739273200000000000001c4 | 624.352 | 2.636 | n/a | 0.000 | 0.000 | 0.344 | 621.274 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.071 | 2.636 | 0.004 | 0.071 | gw-r/thread-45/journal/page | none observed |
| 4387f02e3739273200000000000001b8 | 593.181 | 2.886 | n/a | 0.000 | 0.000 | 0.872 | 589.294 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.085 | 2.886 | 0.005 | 0.085 | gw-r/thread-41/journal/page | none observed |
| 4387f02e3739273200000000000001cc | 577.520 | 2.576 | n/a | 0.000 | 0.000 | 0.290 | 574.534 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.064 | 2.576 | 0.004 | 0.064 | gw-r/thread-48/journal/page | none observed |
| 4387f02e3739273200000000000001ae | 574.288 | 4.343 | n/a | 0.000 | 0.000 | 0.613 | 569.222 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.068 | 4.343 | 0.008 | 0.068 | gw-r/thread-41/journal/page | none observed |
| 4387f02e3739273200000000000001d0 | 544.260 | 3.022 | n/a | 0.000 | 0.000 | 0.435 | 540.605 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.158 | 3.022 | 0.006 | 0.158 | gw-r/thread-43/journal/page | none observed |
| 4387f02e3739273200000000000001a7 | 522.467 | 3.289 | n/a | 0.000 | 0.000 | 2.147 | 516.909 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.077 | 3.289 | 0.006 | 0.077 | gw-r/thread-48/journal/page | none observed |
| 4387f02e373927320000000000000197 | 475.679 | 2.269 | n/a | 0.000 | 0.000 | 0.440 | 472.869 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.065 | 2.269 | 0.005 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 4387f02e3739273200000000000001b6 | 410.805 | 10.282 | n/a | 0.000 | 0.000 | 0.531 | 399.765 | 0.008 | n/a | 0.081 | 0.000 | n/a | n/a | 0.138 | 10.282 | 0.025 | 0.138 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 359.312 | n/a | n/a | n/a | 2.563 | n/a | 0.000 | 0.000 | 0.620 | 354.100 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.070 | 2.563 | 0.009 | 0.070 |
| p99 | 1006.668 | n/a | n/a | n/a | 7.618 | n/a | 0.000 | 0.000 | 10.696 | 1002.495 | 1.668 | n/a | 0.082 | 0.000 | n/a | n/a | 1.099 | 7.618 | 0.335 | 1.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4387f02e3739273200000000000001fc | 1006.668 | 3.660 | n/a | 0.000 | 0.000 | 0.394 | 1002.495 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.063 | 3.660 | 0.004 | 0.063 | gw-r/thread-46/journal/page | none observed |
| 4387f02e373927320000000000000210 | 1002.654 | 0.101 | n/a | 0.000 | 0.000 | 0.565 | 1000.828 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 1.099 | 0.101 | 0.000 | 1.099 | gw-r/thread-44/journal/page | none observed |
| 4387f02e373927320000000000000215 | 1001.447 | 2.225 | n/a | 0.000 | 0.000 | 0.528 | 998.582 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.073 | 2.225 | 0.002 | 0.073 | gw-r/thread-41/journal/page | none observed |
| 4387f02e373927320000000000000216 | 998.942 | 2.219 | n/a | 0.000 | 0.000 | 0.449 | 996.158 | 0.007 | n/a | 0.030 | 0.000 | n/a | n/a | 0.080 | 2.219 | 0.002 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 4387f02e37392732000000000000020f | 994.915 | 2.483 | n/a | 0.000 | 0.000 | 1.114 | 991.221 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.068 | 2.483 | 0.002 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 4387f02e373927320000000000000214 | 975.478 | 2.732 | n/a | 0.000 | 0.000 | 0.487 | 972.138 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.070 | 2.732 | 0.003 | 0.070 | gw-r/thread-44/journal/page | none observed |
| 4387f02e3739273200000000000001e8 | 972.557 | 2.476 | n/a | 0.000 | 0.000 | 0.636 | 969.325 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.070 | 2.476 | 0.003 | 0.070 | gw-r/thread-43/journal/page | none observed |
| 4387f02e373927320000000000000205 | 933.095 | 2.187 | n/a | 0.000 | 0.000 | 0.694 | 930.081 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.064 | 2.187 | 0.002 | 0.064 | gw-r/thread-41/journal/page | none observed |
| 4387f02e3739273200000000000001f5 | 843.905 | 4.840 | n/a | 0.000 | 0.000 | 0.694 | 838.154 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.186 | 4.840 | 0.006 | 0.186 | gw-r/thread-43/journal/page | none observed |
| 4387f02e3739273200000000000001fd | 795.291 | 2.484 | n/a | 0.000 | 0.000 | 5.489 | 787.191 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.074 | 2.484 | 0.003 | 0.074 | gw-r/thread-45/journal/page | none observed |
| 4387f02e373927320000000000000200 | 736.394 | 2.293 | n/a | 0.000 | 0.000 | 0.548 | 733.442 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.064 | 2.293 | 0.003 | 0.064 | gw-r/thread-41/journal/page | none observed |
| 4387f02e3739273200000000000001db | 718.134 | 2.588 | n/a | 0.000 | 0.000 | 0.423 | 714.998 | 0.011 | n/a | 0.051 | 0.000 | n/a | n/a | 0.063 | 2.588 | 0.004 | 0.063 | gw-r/thread-46/journal/page | none observed |
| 4387f02e3739273200000000000001f3 | 709.294 | 2.240 | n/a | 0.000 | 0.000 | 0.673 | 706.249 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.070 | 2.240 | 0.003 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 4387f02e3739273200000000000001ee | 708.604 | 1.904 | n/a | 0.000 | 0.000 | 0.375 | 706.229 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.065 | 1.904 | 0.003 | 0.065 | gw-r/thread-43/journal/page | none observed |
| 4387f02e3739273200000000000001e7 | 702.730 | 2.531 | n/a | 0.000 | 0.000 | 0.569 | 699.518 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.069 | 2.531 | 0.004 | 0.069 | gw-r/thread-45/journal/page | none observed |
| 4387f02e3739273200000000000001d8 | 603.496 | 3.148 | n/a | 0.000 | 0.000 | 0.636 | 599.579 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.087 | 3.148 | 0.005 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 4387f02e3739273200000000000001f7 | 515.226 | 2.998 | n/a | 0.000 | 0.000 | 0.487 | 511.583 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.120 | 2.998 | 0.006 | 0.120 | gw-r/thread-45/journal/page | none observed |
| 4387f02e37392732000000000000020e | 502.078 | 3.030 | n/a | 0.000 | 0.000 | 0.659 | 498.288 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.065 | 3.030 | 0.006 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 4387f02e3739273200000000000001df | 490.415 | 5.124 | n/a | 0.000 | 0.000 | 2.594 | 480.942 | 1.668 | n/a | 0.023 | 0.000 | n/a | n/a | 0.065 | 5.124 | 0.010 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 4387f02e3739273200000000000001ec | 472.794 | 2.551 | n/a | 0.000 | 0.000 | 0.475 | 469.611 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.064 | 2.551 | 0.005 | 0.064 | gw-r/thread-44/journal/page | none observed |

## P3 / L1024 / internal (773 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.611 | n/a | n/a | n/a | 3.045 | n/a | 0.000 | 0.000 | 0.506 | 9.254 | 0.003 | n/a | 0.015 | 0.000 | n/a | n/a | 0.072 | 3.045 | 0.258 | 0.072 |
| p99 | 133.005 | n/a | n/a | n/a | 11.170 | n/a | 1.035 | 0.000 | 4.515 | 128.382 | 0.199 | n/a | 0.076 | 0.000 | n/a | n/a | 0.475 | 12.735 | 0.818 | 0.475 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4387f02e373927320000000000000222 | 992.561 | 3.911 | n/a | 0.000 | 0.000 | 0.639 | 987.831 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.120 | 3.911 | 0.004 | 0.120 | gw-r/thread-41/journal/page | none observed |
| 4387f02e373927320000000000000217 | 855.405 | 1.958 | n/a | 0.000 | 0.000 | 0.459 | 852.858 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.082 | 1.958 | 0.002 | 0.082 | gw-r/thread-48/journal/page | none observed |
| 4387f02e373927320000000000000223 | 842.775 | 2.563 | n/a | 0.000 | 0.000 | 0.761 | 839.335 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.087 | 2.563 | 0.003 | 0.087 | gw-r/thread-43/journal/page | none observed |
| 4387f02e37392732000000000000021f | 715.596 | 2.245 | n/a | 0.000 | 0.000 | 0.468 | 712.774 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.075 | 2.245 | 0.003 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 4387f02e37392732000000000000021a | 709.191 | 3.019 | n/a | 0.000 | 0.000 | 0.506 | 705.469 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.152 | 3.019 | 0.004 | 0.152 | gw-r/thread-44/journal/page | none observed |
| 4387f02e373927320000000000000220 | 279.264 | 2.298 | n/a | 0.000 | 0.000 | 0.704 | 276.142 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.060 | 2.298 | 0.008 | 0.060 | gw-r/thread-43/journal/page | none observed |
| 4387f02e37392732000000000000021b | 248.901 | 2.942 | n/a | 0.000 | 0.000 | 0.738 | 245.087 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.085 | 2.942 | 0.012 | 0.085 | gw-r/thread-48/journal/page | none observed |
| 4387f02e373927320000000000000219 | 133.005 | 3.230 | n/a | 0.000 | 0.000 | 1.286 | 128.382 | 0.004 | n/a | 0.013 | 0.000 | n/a | n/a | 0.089 | 3.230 | 0.024 | 0.089 | gw-r/thread-41/journal/page | none observed |
| 4387f02e3739273200000000000004f2 | 107.057 | 6.932 | n/a | 0.758 | 0.000 | 0.477 | 98.763 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.116 | 7.690 | 0.072 | 0.116 | gw-r/thread-41/journal/page | none observed |
| 4387f02e37392732000000000000030f | 105.332 | 2.361 | n/a | 0.000 | 0.000 | 0.966 | 101.893 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.064 | 2.361 | 0.022 | 0.064 | gw-r/thread-46/journal/page | none observed |
| 4387f02e373927320000000000000768 | 90.386 | 3.134 | n/a | 0.000 | 0.000 | 0.358 | 86.791 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.067 | 3.134 | 0.035 | 0.067 | gw-r/thread-41/journal/page | none observed |
| 4387f02e3739273200000000000005f7 | 89.862 | 4.794 | n/a | 0.000 | 0.000 | 0.495 | 84.305 | 0.143 | n/a | 0.016 | 0.000 | n/a | n/a | 0.110 | 4.794 | 0.053 | 0.110 | gw-r/thread-46/journal/page | none observed |
| 4387f02e3739273200000000000002f3 | 88.218 | 6.065 | n/a | 0.768 | 0.000 | 1.123 | 80.104 | 0.006 | n/a | 0.019 | 0.000 | n/a | n/a | 0.133 | 6.833 | 0.077 | 0.133 | gw-r/thread-44/journal/page | none observed |
| 4387f02e373927320000000000000672 | 86.864 | 4.111 | n/a | 0.000 | 0.000 | 0.283 | 82.392 | 0.004 | n/a | 0.014 | 0.000 | n/a | n/a | 0.059 | 4.111 | 0.047 | 0.059 | gw-r/thread-44/journal/page | none observed |
| 4387f02e3739273200000000000007ae | 86.507 | 2.831 | n/a | 0.000 | 0.000 | 0.521 | 83.011 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.131 | 2.831 | 0.033 | 0.131 | gw-r/thread-46/journal/page | none observed |
| 4387f02e3739273200000000000004fa | 84.123 | 3.121 | n/a | 0.000 | 0.000 | 0.529 | 80.362 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.083 | 3.121 | 0.037 | 0.083 | gw-r/thread-45/journal/page | none observed |
| 4387f02e37392732000000000000063f | 80.282 | 6.735 | n/a | 0.000 | 0.000 | 0.494 | 72.892 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.132 | 6.735 | 0.084 | 0.132 | gw-r/thread-44/journal/page | none observed |
| 4387f02e373927320000000000000830 | 78.737 | 4.529 | n/a | 0.000 | 0.000 | 0.470 | 73.580 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.123 | 4.529 | 0.058 | 0.123 | gw-r/thread-47/journal/page | none observed |
| 4387f02e37392732000000000000079a | 76.558 | 8.345 | n/a | 0.000 | 0.000 | 0.244 | 67.833 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.126 | 8.345 | 0.109 | 0.126 | gw-r/thread-45/journal/page | none observed |
| 4387f02e3739273200000000000003d1 | 74.715 | 7.421 | n/a | 0.000 | 0.000 | 0.533 | 66.649 | 0.004 | n/a | 0.014 | 0.000 | n/a | n/a | 0.094 | 7.421 | 0.099 | 0.094 | gw-r/thread-45/journal/page | none observed |

## P3 / tail / internal (2321 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.254 | n/a | n/a | n/a | 3.799 | n/a | 0.000 | 0.000 | 0.435 | 7.839 | 0.004 | n/a | 0.009 | 0.000 | n/a | n/a | 0.088 | 3.813 | 0.316 | 0.088 |
| p99 | 339.385 | n/a | n/a | n/a | 14.438 | n/a | 1.489 | 0.000 | 4.192 | 335.469 | 0.235 | n/a | 0.043 | 0.000 | n/a | n/a | 1.097 | 15.267 | 0.845 | 1.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4387f02e373927320000000000001abe | 1002.438 | 0.150 | n/a | 0.000 | 0.000 | 0.437 | 1000.591 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 1.223 | 0.150 | 0.000 | 1.223 | gw-r/thread-45/journal/page | none observed |
| 4387f02e373927320000000000001b0c | 1002.196 | 0.133 | n/a | 0.000 | 0.000 | 0.754 | 1000.201 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 1.098 | 0.133 | 0.000 | 1.098 | gw-r/thread-46/journal/page | none observed |
| 4387f02e373927320000000000001ac8 | 1002.095 | 0.092 | n/a | 0.000 | 0.000 | 0.336 | 1000.534 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 1.091 | 0.092 | 0.000 | 1.091 | gw-r/thread-41/journal/page | none observed |
| 4387f02e373927320000000000001ae2 | 994.535 | 2.104 | n/a | 0.000 | 0.000 | 0.243 | 992.105 | 0.007 | n/a | 0.023 | 0.000 | n/a | n/a | 0.054 | 2.104 | 0.002 | 0.054 | gw-r/thread-44/journal/page | none observed |
| 4387f02e373927320000000000001b07 | 992.776 | 2.500 | n/a | 0.000 | 0.000 | 0.385 | 989.808 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.054 | 2.500 | 0.003 | 0.054 | gw-r/thread-46/journal/page | none observed |
| 4387f02e373927320000000000001ad2 | 971.100 | 5.138 | n/a | 0.000 | 0.000 | 0.661 | 965.126 | 0.002 | n/a | 0.028 | 0.000 | n/a | n/a | 0.144 | 5.138 | 0.005 | 0.144 | gw-r/thread-48/journal/page | none observed |
| 4387f02e373927320000000000001b02 | 957.540 | 2.123 | n/a | 0.000 | 0.000 | 0.542 | 954.797 | 0.006 | n/a | 0.017 | 0.000 | n/a | n/a | 0.055 | 2.123 | 0.002 | 0.055 | gw-r/thread-41/journal/page | none observed |
| 4387f02e373927320000000000001ac3 | 951.957 | 3.051 | n/a | 0.000 | 0.000 | 0.493 | 948.262 | 0.011 | n/a | 0.037 | 0.000 | n/a | n/a | 0.103 | 3.051 | 0.003 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 4387f02e373927320000000000001abd | 932.552 | 2.978 | n/a | 0.000 | 0.000 | 0.428 | 929.048 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.062 | 2.978 | 0.003 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 4387f02e373927320000000000001ac0 | 882.369 | 8.915 | n/a | 1.496 | 0.000 | 0.303 | 871.210 | 0.008 | n/a | 0.028 | 0.000 | n/a | n/a | 0.409 | 10.410 | 0.012 | 0.409 | gw-r/thread-43/journal/page | none observed |
| 4387f02e373927320000000000001b04 | 789.146 | 2.273 | n/a | 0.000 | 0.000 | 0.964 | 781.560 | 4.232 | n/a | 0.045 | 0.000 | n/a | n/a | 0.073 | 2.273 | 0.003 | 0.073 | gw-r/thread-64/journal/page | none observed |
| 4387f02e373927320000000000001ae4 | 778.147 | 2.283 | n/a | 0.000 | 0.000 | 0.395 | 775.373 | 0.009 | n/a | 0.036 | 0.000 | n/a | n/a | 0.052 | 2.283 | 0.003 | 0.052 | gw-r/thread-47/journal/page | none observed |
| 4387f02e373927320000000000001ade | 691.582 | 2.186 | n/a | 0.000 | 0.000 | 0.440 | 688.873 | 0.005 | n/a | 0.016 | 0.000 | n/a | n/a | 0.062 | 2.186 | 0.003 | 0.062 | gw-r/thread-43/journal/page | none observed |
| 4387f02e373927320000000000001aca | 612.908 | 2.045 | n/a | 0.000 | 0.000 | 0.434 | 610.277 | 0.008 | n/a | 0.022 | 0.000 | n/a | n/a | 0.123 | 2.045 | 0.003 | 0.123 | gw-r/thread-45/journal/page | none observed |
| 4387f02e373927320000000000001ad9 | 605.964 | 2.214 | n/a | 0.000 | 0.000 | 0.388 | 603.276 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.058 | 2.214 | 0.004 | 0.058 | gw-r/thread-47/journal/page | none observed |
| 4387f02e373927320000000000001afe | 600.743 | 4.452 | n/a | 0.000 | 0.000 | 0.573 | 595.577 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.105 | 4.452 | 0.007 | 0.105 | gw-r/thread-48/journal/page | none observed |
| 4387f02e373927320000000000001ae6 | 584.272 | 8.873 | n/a | 0.000 | 0.000 | 1.132 | 573.977 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.264 | 8.873 | 0.015 | 0.264 | gw-r/thread-46/journal/page | none observed |
| 4387f02e373927320000000000001afd | 510.971 | 2.077 | n/a | 0.000 | 0.000 | 0.484 | 508.302 | 0.010 | n/a | 0.038 | 0.000 | n/a | n/a | 0.059 | 2.077 | 0.004 | 0.059 | gw-r/thread-44/journal/page | none observed |
| 4387f02e373927320000000000001af4 | 486.518 | 2.247 | n/a | 0.000 | 0.000 | 0.348 | 483.810 | 0.011 | n/a | 0.039 | 0.000 | n/a | n/a | 0.063 | 2.247 | 0.005 | 0.063 | gw-r/thread-44/journal/page | none observed |
| 4387f02e373927320000000000001af9 | 454.274 | 2.468 | n/a | 0.000 | 0.000 | 0.314 | 451.413 | 0.006 | n/a | 0.017 | 0.000 | n/a | n/a | 0.057 | 2.468 | 0.005 | 0.057 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / read (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.932 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.824 | 200.906 | 0.013 | n/a | 0.108 | 0.000 | n/a | n/a | 0.077 | 0.040 | 0.000 | 0.077 |
| p99 | 209.752 | n/a | n/a | n/a | 0.094 | n/a | 0.000 | 0.000 | 3.822 | 207.766 | 2.250 | n/a | 0.400 | 0.000 | n/a | n/a | 0.571 | 0.094 | 0.001 | 0.571 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9ab027266b518c770000000000000055 | 209.752 | 0.089 | n/a | 0.000 | 0.000 | 1.583 | 207.766 | 0.020 | n/a | 0.111 | 0.000 | n/a | n/a | 0.183 | 0.089 | 0.000 | 0.183 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c77000000000000002a | 207.295 | 0.024 | n/a | 0.000 | 0.000 | 0.876 | 206.162 | 0.014 | n/a | 0.160 | 0.000 | n/a | n/a | 0.059 | 0.024 | 0.000 | 0.059 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c77000000000000004e | 205.873 | 0.031 | n/a | 0.000 | 0.000 | 0.836 | 204.766 | 0.014 | n/a | 0.151 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c77000000000000000d | 205.800 | 0.035 | n/a | 0.000 | 0.000 | 0.853 | 204.672 | 0.020 | n/a | 0.146 | 0.000 | n/a | n/a | 0.074 | 0.035 | 0.000 | 0.074 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c770000000000000030 | 205.608 | 0.036 | n/a | 0.000 | 0.000 | 1.154 | 204.177 | 0.012 | n/a | 0.125 | 0.000 | n/a | n/a | 0.103 | 0.036 | 0.000 | 0.103 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c770000000000000049 | 205.358 | 0.033 | n/a | 0.000 | 0.000 | 1.244 | 201.659 | 2.250 | n/a | 0.096 | 0.000 | n/a | n/a | 0.075 | 0.033 | 0.000 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c770000000000000024 | 205.314 | 0.052 | n/a | 0.000 | 0.000 | 1.121 | 203.659 | 0.024 | n/a | 0.320 | 0.000 | n/a | n/a | 0.137 | 0.052 | 0.000 | 0.137 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c770000000000000042 | 205.101 | 0.035 | n/a | 0.000 | 0.000 | 0.908 | 203.939 | 0.013 | n/a | 0.125 | 0.000 | n/a | n/a | 0.080 | 0.035 | 0.000 | 0.080 | gw-r/thread-44/journal/page | none observed |
| 9ab027266b518c77000000000000003b | 204.931 | 0.028 | n/a | 0.000 | 0.000 | 0.393 | 204.315 | 0.013 | n/a | 0.114 | 0.000 | n/a | n/a | 0.068 | 0.028 | 0.000 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c770000000000000040 | 204.487 | 0.031 | n/a | 0.000 | 0.000 | 0.778 | 203.392 | 0.020 | n/a | 0.189 | 0.000 | n/a | n/a | 0.077 | 0.031 | 0.000 | 0.077 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c770000000000000017 | 203.671 | 0.031 | n/a | 0.000 | 0.000 | 1.916 | 201.235 | 0.021 | n/a | 0.400 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c770000000000000009 | 203.472 | 0.061 | n/a | 0.000 | 0.000 | 1.804 | 200.903 | 0.012 | n/a | 0.121 | 0.000 | n/a | n/a | 0.571 | 0.061 | 0.000 | 0.571 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c77000000000000001a | 203.405 | 0.046 | n/a | 0.000 | 0.000 | 2.197 | 200.869 | 0.034 | n/a | 0.137 | 0.000 | n/a | n/a | 0.122 | 0.046 | 0.000 | 0.122 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c770000000000000026 | 203.266 | 0.033 | n/a | 0.000 | 0.000 | 1.260 | 201.676 | 0.022 | n/a | 0.210 | 0.000 | n/a | n/a | 0.066 | 0.033 | 0.000 | 0.066 | gw-r/thread-44/journal/page | none observed |
| 9ab027266b518c770000000000000034 | 203.249 | 0.027 | n/a | 0.000 | 0.000 | 1.992 | 201.030 | 0.013 | n/a | 0.107 | 0.000 | n/a | n/a | 0.078 | 0.027 | 0.000 | 0.078 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c77000000000000001f | 203.154 | 0.040 | n/a | 0.000 | 0.000 | 1.308 | 201.583 | 0.014 | n/a | 0.129 | 0.000 | n/a | n/a | 0.080 | 0.040 | 0.000 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c77000000000000000b | 203.145 | 0.068 | n/a | 0.000 | 0.000 | 1.407 | 201.276 | 0.063 | n/a | 0.153 | 0.000 | n/a | n/a | 0.178 | 0.068 | 0.000 | 0.178 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c770000000000000014 | 203.017 | 0.047 | n/a | 0.000 | 0.000 | 1.242 | 201.439 | 0.012 | n/a | 0.147 | 0.000 | n/a | n/a | 0.130 | 0.047 | 0.000 | 0.130 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c770000000000000044 | 203.004 | 0.032 | n/a | 0.000 | 0.000 | 0.625 | 202.139 | 0.016 | n/a | 0.121 | 0.000 | n/a | n/a | 0.071 | 0.032 | 0.000 | 0.071 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c77000000000000000f | 202.849 | 0.033 | n/a | 0.000 | 0.000 | 0.648 | 201.931 | 0.015 | n/a | 0.143 | 0.000 | n/a | n/a | 0.079 | 0.033 | 0.000 | 0.079 | gw-r/thread-41/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.875 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.841 | 200.824 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.082 | 0.042 | 0.000 | 0.082 |
| p99 | 212.155 | n/a | n/a | n/a | 0.082 | n/a | 0.000 | 0.000 | 11.079 | 207.401 | 3.631 | n/a | 0.627 | 0.000 | n/a | n/a | 0.171 | 0.082 | 0.001 | 0.171 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9ab027266b518c770000000000000092 | 212.155 | 0.031 | n/a | 0.000 | 0.000 | 11.079 | 200.851 | 0.011 | n/a | 0.106 | 0.000 | n/a | n/a | 0.077 | 0.031 | 0.000 | 0.077 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c770000000000000063 | 208.386 | 0.049 | n/a | 0.000 | 0.000 | 0.719 | 207.401 | 0.011 | n/a | 0.102 | 0.000 | n/a | n/a | 0.104 | 0.049 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c770000000000000073 | 208.015 | 0.047 | n/a | 0.000 | 0.000 | 1.667 | 206.105 | 0.014 | n/a | 0.088 | 0.000 | n/a | n/a | 0.093 | 0.047 | 0.000 | 0.093 | gw-r/thread-44/journal/page | none observed |
| 9ab027266b518c7700000000000000a5 | 206.820 | 0.033 | n/a | 0.000 | 0.000 | 0.841 | 205.793 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 0.078 | 0.033 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c77000000000000008c | 206.016 | 0.030 | n/a | 0.000 | 0.000 | 0.509 | 205.251 | 0.019 | n/a | 0.138 | 0.000 | n/a | n/a | 0.069 | 0.030 | 0.000 | 0.069 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c7700000000000000b8 | 205.190 | 0.051 | n/a | 0.000 | 0.000 | 4.292 | 200.654 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.117 | 0.051 | 0.000 | 0.117 | gw-r/thread-44/journal/page | none observed |
| 9ab027266b518c770000000000000088 | 205.093 | 0.055 | n/a | 0.000 | 0.000 | 0.865 | 203.937 | 0.013 | n/a | 0.077 | 0.000 | n/a | n/a | 0.146 | 0.055 | 0.000 | 0.146 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c77000000000000005e | 204.584 | 0.031 | n/a | 0.000 | 0.000 | 3.544 | 200.850 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.084 | 0.031 | 0.000 | 0.084 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c770000000000000093 | 203.167 | 0.045 | n/a | 0.000 | 0.000 | 1.115 | 201.788 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.146 | 0.045 | 0.000 | 0.146 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c770000000000000097 | 203.057 | 0.041 | n/a | 0.000 | 0.000 | 1.210 | 201.067 | 0.028 | n/a | 0.627 | 0.000 | n/a | n/a | 0.083 | 0.041 | 0.000 | 0.083 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c770000000000000078 | 202.977 | 0.046 | n/a | 0.000 | 0.000 | 1.084 | 201.520 | 0.033 | n/a | 0.200 | 0.000 | n/a | n/a | 0.094 | 0.046 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c77000000000000009b | 202.929 | 0.028 | n/a | 0.000 | 0.000 | 0.488 | 202.149 | 0.022 | n/a | 0.174 | 0.000 | n/a | n/a | 0.067 | 0.028 | 0.000 | 0.067 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c770000000000000060 | 202.910 | 0.031 | n/a | 0.000 | 0.000 | 1.247 | 201.407 | 0.013 | n/a | 0.134 | 0.000 | n/a | n/a | 0.078 | 0.031 | 0.000 | 0.078 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c77000000000000007f | 202.891 | 0.028 | n/a | 0.000 | 0.000 | 0.949 | 201.735 | 0.010 | n/a | 0.099 | 0.000 | n/a | n/a | 0.070 | 0.028 | 0.000 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c770000000000000065 | 202.853 | 0.030 | n/a | 0.000 | 0.000 | 1.372 | 201.207 | 0.015 | n/a | 0.160 | 0.000 | n/a | n/a | 0.070 | 0.030 | 0.000 | 0.070 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c77000000000000005f | 202.822 | 0.052 | n/a | 0.000 | 0.000 | 1.356 | 201.153 | 0.013 | n/a | 0.110 | 0.000 | n/a | n/a | 0.139 | 0.052 | 0.000 | 0.139 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c770000000000000082 | 202.609 | 0.052 | n/a | 0.000 | 0.000 | 1.046 | 201.246 | 0.015 | n/a | 0.117 | 0.000 | n/a | n/a | 0.132 | 0.052 | 0.000 | 0.132 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c770000000000000070 | 202.533 | 0.042 | n/a | 0.000 | 0.000 | 0.875 | 201.347 | 0.017 | n/a | 0.140 | 0.000 | n/a | n/a | 0.113 | 0.042 | 0.000 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 9ab027266b518c77000000000000005a | 202.502 | 0.046 | n/a | 0.000 | 0.000 | 1.082 | 201.079 | 0.014 | n/a | 0.133 | 0.000 | n/a | n/a | 0.148 | 0.046 | 0.000 | 0.148 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c77000000000000008a | 202.496 | 0.048 | n/a | 0.000 | 0.000 | 1.590 | 200.680 | 0.011 | n/a | 0.043 | 0.000 | n/a | n/a | 0.123 | 0.048 | 0.000 | 0.123 | gw-r/thread-44/journal/page | none observed |

## P3 / L4 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.770 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.738 | 200.811 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.076 | 0.037 | 0.000 | 0.076 |
| p99 | 211.066 | n/a | n/a | n/a | 0.098 | n/a | 0.000 | 0.000 | 5.785 | 204.971 | 3.914 | n/a | 0.354 | 0.000 | n/a | n/a | 0.188 | 0.098 | 0.001 | 0.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9ab027266b518c7700000000000000cf | 211.066 | 0.046 | n/a | 0.000 | 0.000 | 5.785 | 204.971 | 0.021 | n/a | 0.105 | 0.000 | n/a | n/a | 0.137 | 0.046 | 0.000 | 0.137 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c77000000000000011c | 205.913 | 0.027 | n/a | 0.000 | 0.000 | 0.784 | 204.864 | 0.014 | n/a | 0.158 | 0.000 | n/a | n/a | 0.066 | 0.027 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c7700000000000000f0 | 205.628 | 0.024 | n/a | 0.000 | 0.000 | 0.760 | 204.694 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.058 | 0.024 | 0.000 | 0.058 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c7700000000000000d3 | 205.159 | 0.059 | n/a | 0.000 | 0.000 | 3.966 | 200.866 | 0.008 | n/a | 0.108 | 0.000 | n/a | n/a | 0.153 | 0.059 | 0.000 | 0.153 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c7700000000000000d7 | 204.751 | 0.046 | n/a | 0.000 | 0.000 | 3.841 | 200.678 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.130 | 0.046 | 0.000 | 0.130 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c7700000000000000ff | 204.478 | 0.027 | n/a | 0.000 | 0.000 | 0.511 | 203.732 | 0.060 | n/a | 0.081 | 0.000 | n/a | n/a | 0.066 | 0.027 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c7700000000000000e3 | 204.126 | 0.028 | n/a | 0.000 | 0.000 | 0.956 | 203.026 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.081 | 0.028 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c7700000000000000cd | 204.040 | 0.045 | n/a | 0.000 | 0.000 | 0.781 | 202.976 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.140 | 0.045 | 0.000 | 0.140 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c770000000000000100 | 203.547 | 0.039 | n/a | 0.000 | 0.000 | 0.432 | 199.199 | 3.804 | n/a | 0.017 | 0.000 | n/a | n/a | 0.056 | 0.039 | 0.000 | 0.056 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c7700000000000000f3 | 203.354 | 0.034 | n/a | 0.000 | 0.000 | 1.083 | 201.931 | 0.063 | n/a | 0.165 | 0.000 | n/a | n/a | 0.077 | 0.034 | 0.000 | 0.077 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c7700000000000000f2 | 203.179 | 0.036 | n/a | 0.000 | 0.000 | 0.948 | 201.940 | 0.041 | n/a | 0.124 | 0.000 | n/a | n/a | 0.089 | 0.036 | 0.000 | 0.089 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c7700000000000000f9 | 202.921 | 0.029 | n/a | 0.000 | 0.000 | 1.110 | 201.580 | 0.007 | n/a | 0.116 | 0.000 | n/a | n/a | 0.079 | 0.029 | 0.000 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c770000000000000104 | 202.909 | 0.044 | n/a | 0.000 | 0.000 | 2.159 | 200.540 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.127 | 0.044 | 0.000 | 0.127 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c7700000000000000f8 | 202.847 | 0.057 | n/a | 0.000 | 0.000 | 1.746 | 200.834 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.162 | 0.057 | 0.000 | 0.162 | gw-r/thread-44/journal/page | none observed |
| 9ab027266b518c770000000000000105 | 202.802 | 0.032 | n/a | 0.000 | 0.000 | 0.875 | 201.675 | 0.012 | n/a | 0.128 | 0.000 | n/a | n/a | 0.079 | 0.032 | 0.000 | 0.079 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c7700000000000000df | 202.700 | 0.037 | n/a | 0.000 | 0.000 | 1.864 | 200.660 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.078 | 0.037 | 0.000 | 0.078 | gw-r/thread-44/journal/page | none observed |
| 9ab027266b518c7700000000000000fa | 202.643 | 0.033 | n/a | 0.000 | 0.000 | 1.245 | 201.196 | 0.011 | n/a | 0.081 | 0.000 | n/a | n/a | 0.078 | 0.033 | 0.000 | 0.078 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c770000000000000118 | 202.592 | 0.046 | n/a | 0.000 | 0.000 | 0.784 | 201.557 | 0.011 | n/a | 0.098 | 0.000 | n/a | n/a | 0.096 | 0.046 | 0.000 | 0.096 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c7700000000000000c1 | 202.569 | 0.042 | n/a | 0.000 | 0.000 | 1.195 | 201.130 | 0.008 | n/a | 0.097 | 0.000 | n/a | n/a | 0.097 | 0.042 | 0.000 | 0.097 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c7700000000000000dc | 202.566 | 0.060 | n/a | 0.000 | 0.000 | 1.329 | 200.971 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.149 | 0.060 | 0.000 | 0.149 | gw-r/thread-41/journal/page | none observed |

## P3 / L16 / read (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.519 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.677 | 200.729 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.079 | 0.042 | 0.000 | 0.079 |
| p99 | 206.999 | n/a | n/a | n/a | 0.098 | n/a | 0.000 | 0.000 | 4.733 | 203.694 | 2.764 | n/a | 0.955 | 0.000 | n/a | n/a | 0.188 | 0.098 | 0.001 | 0.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9ab027266b518c770000000000000137 | 206.999 | 0.037 | n/a | 0.000 | 0.000 | 3.443 | 203.383 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.072 | 0.037 | 0.000 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c770000000000000151 | 206.210 | 0.055 | n/a | 0.000 | 0.000 | 4.043 | 201.830 | 0.054 | n/a | 0.092 | 0.000 | n/a | n/a | 0.136 | 0.055 | 0.000 | 0.136 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c770000000000000126 | 205.587 | 0.029 | n/a | 0.000 | 0.000 | 4.716 | 200.694 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.068 | 0.029 | 0.000 | 0.068 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c770000000000000184 | 205.331 | 0.030 | n/a | 0.000 | 0.000 | 4.178 | 200.977 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.067 | 0.030 | 0.000 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 9ab027266b518c77000000000000013e | 204.544 | 0.026 | n/a | 0.000 | 0.000 | 0.683 | 203.694 | 0.015 | n/a | 0.068 | 0.000 | n/a | n/a | 0.058 | 0.026 | 0.000 | 0.058 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c77000000000000012d | 203.153 | 0.039 | n/a | 0.000 | 0.000 | 0.621 | 202.281 | 0.014 | n/a | 0.077 | 0.000 | n/a | n/a | 0.122 | 0.039 | 0.000 | 0.122 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c770000000000000140 | 203.093 | 0.051 | n/a | 0.000 | 0.000 | 1.569 | 201.179 | 0.007 | n/a | 0.124 | 0.000 | n/a | n/a | 0.163 | 0.051 | 0.000 | 0.163 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c770000000000000166 | 202.771 | 0.039 | n/a | 0.000 | 0.000 | 1.199 | 201.345 | 0.005 | n/a | 0.081 | 0.000 | n/a | n/a | 0.103 | 0.039 | 0.000 | 0.103 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c770000000000000165 | 202.574 | 0.029 | n/a | 0.000 | 0.000 | 0.746 | 201.660 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.063 | 0.029 | 0.000 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c77000000000000013b | 202.537 | 0.036 | n/a | 0.000 | 0.000 | 1.168 | 201.170 | 0.012 | n/a | 0.083 | 0.000 | n/a | n/a | 0.068 | 0.036 | 0.000 | 0.068 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c77000000000000017f | 202.500 | 0.037 | n/a | 0.000 | 0.000 | 0.990 | 201.299 | 0.013 | n/a | 0.078 | 0.000 | n/a | n/a | 0.084 | 0.037 | 0.000 | 0.084 | gw-r/thread-44/journal/page | none observed |
| 9ab027266b518c77000000000000015e | 202.342 | 0.061 | n/a | 0.000 | 0.000 | 1.266 | 200.844 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.127 | 0.061 | 0.000 | 0.127 | gw-r/thread-44/journal/page | none observed |
| 9ab027266b518c770000000000000157 | 202.255 | 0.043 | n/a | 0.000 | 0.000 | 0.918 | 201.132 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.073 | 0.043 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c770000000000000172 | 202.230 | 0.044 | n/a | 0.000 | 0.000 | 0.835 | 201.151 | 0.020 | n/a | 0.061 | 0.000 | n/a | n/a | 0.119 | 0.044 | 0.000 | 0.119 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c77000000000000014c | 202.212 | 0.056 | n/a | 0.000 | 0.000 | 1.280 | 200.702 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.134 | 0.056 | 0.000 | 0.134 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c770000000000000164 | 202.169 | 0.050 | n/a | 0.000 | 0.000 | 0.884 | 201.062 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.129 | 0.050 | 0.000 | 0.129 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c770000000000000132 | 202.104 | 0.033 | n/a | 0.000 | 0.000 | 0.692 | 201.215 | 0.009 | n/a | 0.086 | 0.000 | n/a | n/a | 0.069 | 0.033 | 0.000 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c770000000000000177 | 202.050 | 0.045 | n/a | 0.000 | 0.000 | 0.647 | 201.191 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.084 | 0.045 | 0.000 | 0.084 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c770000000000000135 | 202.029 | 0.050 | n/a | 0.000 | 0.000 | 0.997 | 200.800 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.131 | 0.050 | 0.000 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c770000000000000188 | 202.027 | 0.046 | n/a | 0.000 | 0.000 | 0.615 | 201.182 | 0.013 | n/a | 0.058 | 0.000 | n/a | n/a | 0.113 | 0.046 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |

## P3 / L64 / read (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.389 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.627 | 200.649 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.071 | 0.040 | 0.000 | 0.071 |
| p99 | 203.664 | n/a | n/a | n/a | 0.084 | n/a | 0.000 | 0.000 | 2.851 | 202.967 | 3.790 | n/a | 0.120 | 0.000 | n/a | n/a | 0.233 | 0.084 | 0.001 | 0.233 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9ab027266b518c7700000000000001b4 | 204.472 | 0.034 | n/a | 0.000 | 0.000 | 0.558 | 203.736 | 0.006 | n/a | 0.069 | 0.000 | n/a | n/a | 0.070 | 0.034 | 0.000 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c7700000000000001af | 203.664 | 0.047 | n/a | 0.000 | 0.000 | 0.809 | 202.005 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.733 | 0.047 | 0.000 | 0.733 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c7700000000000001a0 | 203.534 | 0.027 | n/a | 0.000 | 0.000 | 0.416 | 202.967 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.061 | 0.027 | 0.000 | 0.061 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c7700000000000001a9 | 203.233 | 0.027 | n/a | 0.000 | 0.000 | 1.926 | 201.121 | 0.027 | n/a | 0.071 | 0.000 | n/a | n/a | 0.062 | 0.027 | 0.000 | 0.062 | gw-r/thread-44/journal/page | none observed |
| 9ab027266b518c7700000000000001a1 | 202.929 | 0.041 | n/a | 0.000 | 0.000 | 0.557 | 202.139 | 0.017 | n/a | 0.120 | 0.000 | n/a | n/a | 0.055 | 0.041 | 0.000 | 0.055 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c7700000000000001e8 | 202.821 | 0.028 | n/a | 0.000 | 0.000 | 0.378 | 202.234 | 0.020 | n/a | 0.092 | 0.000 | n/a | n/a | 0.069 | 0.028 | 0.000 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c7700000000000001be | 202.812 | 0.045 | n/a | 0.000 | 0.000 | 1.949 | 200.656 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.102 | 0.045 | 0.000 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c7700000000000001de | 202.620 | 0.029 | n/a | 0.000 | 0.000 | 0.619 | 201.789 | 0.012 | n/a | 0.108 | 0.000 | n/a | n/a | 0.063 | 0.029 | 0.000 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c7700000000000001e5 | 202.398 | 0.082 | n/a | 0.000 | 0.000 | 1.193 | 200.810 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.233 | 0.082 | 0.000 | 0.233 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c7700000000000001c8 | 202.365 | 0.040 | n/a | 0.000 | 0.000 | 0.750 | 201.359 | 0.011 | n/a | 0.116 | 0.000 | n/a | n/a | 0.089 | 0.040 | 0.000 | 0.089 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c77000000000000018c | 202.296 | 0.045 | n/a | 0.000 | 0.000 | 0.886 | 201.168 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.120 | 0.045 | 0.000 | 0.120 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c7700000000000001bc | 202.264 | 0.059 | n/a | 0.000 | 0.000 | 1.347 | 200.659 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.163 | 0.059 | 0.000 | 0.163 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c7700000000000001f6 | 202.253 | 0.041 | n/a | 0.000 | 0.000 | 0.847 | 201.112 | 0.006 | n/a | 0.107 | 0.000 | n/a | n/a | 0.140 | 0.041 | 0.000 | 0.140 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c7700000000000001f5 | 202.208 | 0.050 | n/a | 0.000 | 0.000 | 1.080 | 200.895 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.109 | 0.050 | 0.000 | 0.109 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c77000000000000018b | 202.186 | 0.054 | n/a | 0.000 | 0.000 | 1.249 | 200.690 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.129 | 0.054 | 0.000 | 0.129 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c7700000000000001e4 | 202.175 | 0.068 | n/a | 0.000 | 0.000 | 1.104 | 200.781 | 0.007 | n/a | 0.027 | 0.000 | n/a | n/a | 0.188 | 0.068 | 0.000 | 0.188 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c7700000000000001e6 | 202.148 | 0.034 | n/a | 0.000 | 0.000 | 0.966 | 201.000 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.074 | 0.034 | 0.000 | 0.074 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c7700000000000001fc | 202.122 | 0.040 | n/a | 0.000 | 0.000 | 0.679 | 201.204 | 0.011 | n/a | 0.114 | 0.000 | n/a | n/a | 0.074 | 0.040 | 0.000 | 0.074 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c7700000000000001dc | 202.111 | 0.031 | n/a | 0.000 | 0.000 | 0.715 | 201.194 | 0.008 | n/a | 0.086 | 0.000 | n/a | n/a | 0.076 | 0.031 | 0.000 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c770000000000000190 | 202.102 | 0.053 | n/a | 0.000 | 0.000 | 0.627 | 201.249 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.118 | 0.053 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.556 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.628 | 200.718 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.069 | 0.037 | 0.000 | 0.069 |
| p99 | 205.506 | n/a | n/a | n/a | 0.081 | n/a | 0.000 | 0.000 | 3.251 | 204.083 | 1.795 | n/a | 0.120 | 0.000 | n/a | n/a | 0.176 | 0.081 | 0.001 | 0.176 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9ab027266b518c77000000000000020d | 205.656 | 0.029 | n/a | 0.000 | 0.000 | 2.730 | 202.744 | 0.007 | n/a | 0.080 | 0.000 | n/a | n/a | 0.066 | 0.029 | 0.000 | 0.066 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c770000000000000240 | 205.506 | 0.036 | n/a | 0.000 | 0.000 | 4.253 | 201.063 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.067 | 0.036 | 0.000 | 0.067 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c770000000000000260 | 205.311 | 0.050 | n/a | 0.000 | 0.000 | 0.700 | 204.371 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.123 | 0.050 | 0.000 | 0.123 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c77000000000000020a | 204.728 | 0.028 | n/a | 0.000 | 0.000 | 0.435 | 204.083 | 0.030 | n/a | 0.088 | 0.000 | n/a | n/a | 0.063 | 0.028 | 0.000 | 0.063 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c770000000000000256 | 204.027 | 0.041 | n/a | 0.000 | 0.000 | 3.251 | 200.612 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.075 | 0.041 | 0.000 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c770000000000000241 | 203.411 | 0.031 | n/a | 0.000 | 0.000 | 2.175 | 201.076 | 0.009 | n/a | 0.045 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c77000000000000023b | 203.314 | 0.027 | n/a | 0.000 | 0.000 | 0.423 | 202.769 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.066 | 0.027 | 0.000 | 0.066 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c77000000000000022c | 203.244 | 0.029 | n/a | 0.000 | 0.000 | 2.025 | 201.056 | 0.005 | n/a | 0.069 | 0.000 | n/a | n/a | 0.060 | 0.029 | 0.000 | 0.060 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c77000000000000024e | 202.827 | 0.067 | n/a | 0.000 | 0.000 | 1.389 | 201.188 | 0.006 | n/a | 0.083 | 0.000 | n/a | n/a | 0.094 | 0.067 | 0.000 | 0.094 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c770000000000000231 | 202.820 | 0.049 | n/a | 0.000 | 0.000 | 0.609 | 201.972 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.123 | 0.049 | 0.000 | 0.123 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c77000000000000023e | 202.750 | 0.032 | n/a | 0.000 | 0.000 | 1.039 | 201.472 | 0.011 | n/a | 0.120 | 0.000 | n/a | n/a | 0.075 | 0.032 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c770000000000000266 | 202.608 | 0.025 | n/a | 0.000 | 0.000 | 0.819 | 201.581 | 0.010 | n/a | 0.128 | 0.000 | n/a | n/a | 0.046 | 0.025 | 0.000 | 0.046 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c77000000000000025b | 202.597 | 0.035 | n/a | 0.000 | 0.000 | 1.763 | 200.679 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.079 | 0.035 | 0.000 | 0.079 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c77000000000000026b | 202.594 | 0.043 | n/a | 0.000 | 0.000 | 1.012 | 201.339 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.110 | 0.043 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c770000000000000233 | 202.574 | 0.029 | n/a | 0.000 | 0.000 | 0.500 | 201.884 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.069 | 0.029 | 0.000 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c77000000000000023d | 202.438 | 0.038 | n/a | 0.000 | 0.000 | 0.731 | 201.482 | 0.011 | n/a | 0.105 | 0.000 | n/a | n/a | 0.071 | 0.038 | 0.000 | 0.071 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c770000000000000265 | 202.397 | 0.048 | n/a | 0.000 | 0.000 | 0.779 | 201.370 | 0.008 | n/a | 0.104 | 0.000 | n/a | n/a | 0.088 | 0.048 | 0.000 | 0.088 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c770000000000000267 | 202.393 | 0.045 | n/a | 0.000 | 0.000 | 1.140 | 201.026 | 0.007 | n/a | 0.084 | 0.000 | n/a | n/a | 0.092 | 0.045 | 0.000 | 0.092 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c770000000000000202 | 202.362 | 0.067 | n/a | 0.000 | 0.000 | 0.912 | 201.118 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.176 | 0.067 | 0.000 | 0.176 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c770000000000000264 | 202.258 | 0.041 | n/a | 0.000 | 0.000 | 1.040 | 201.029 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.073 | 0.041 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / read (65 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 71.137 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.509 | 70.417 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.068 | 0.047 | 0.001 | 0.068 |
| p99 | 203.515 | n/a | n/a | n/a | 0.138 | n/a | 0.000 | 0.000 | 2.999 | 202.071 | 4.525 | n/a | 0.100 | 0.000 | n/a | n/a | 0.134 | 0.138 | 0.003 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9ab027266b518c770000000000000283 | 203.515 | 0.038 | n/a | 0.000 | 0.000 | 1.275 | 202.071 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.070 | 0.038 | 0.000 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c770000000000000279 | 202.488 | 0.041 | n/a | 0.000 | 0.000 | 1.316 | 200.946 | 0.009 | n/a | 0.072 | 0.000 | n/a | n/a | 0.105 | 0.041 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c770000000000000281 | 202.231 | 0.041 | n/a | 0.000 | 0.000 | 0.737 | 201.247 | 0.010 | n/a | 0.100 | 0.000 | n/a | n/a | 0.097 | 0.041 | 0.000 | 0.097 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c770000000000000273 | 201.741 | 0.045 | n/a | 0.000 | 0.000 | 0.722 | 200.810 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.109 | 0.045 | 0.000 | 0.109 | gw-r/thread-44/journal/page | none observed |
| 9ab027266b518c770000000000000287 | 201.719 | 0.033 | n/a | 0.000 | 0.000 | 0.642 | 200.886 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.076 | 0.033 | 0.000 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c770000000000000288 | 201.638 | 0.045 | n/a | 0.000 | 0.000 | 0.699 | 200.726 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.110 | 0.045 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c77000000000000028b | 201.568 | 0.024 | n/a | 0.000 | 0.000 | 0.478 | 200.930 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 0.059 | 0.024 | 0.000 | 0.059 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c770000000000000280 | 201.538 | 0.028 | n/a | 0.000 | 0.000 | 0.592 | 200.805 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.063 | 0.028 | 0.000 | 0.063 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c77000000000000028a | 201.523 | 0.043 | n/a | 0.000 | 0.000 | 0.477 | 200.864 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.072 | 0.043 | 0.000 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c770000000000000286 | 201.479 | 0.041 | n/a | 0.000 | 0.000 | 0.677 | 200.625 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.083 | 0.041 | 0.000 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c770000000000000275 | 201.450 | 0.023 | n/a | 0.000 | 0.000 | 0.309 | 200.977 | 0.011 | n/a | 0.084 | 0.000 | n/a | n/a | 0.046 | 0.023 | 0.000 | 0.046 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c77000000000000027f | 201.396 | 0.043 | n/a | 0.000 | 0.000 | 0.552 | 200.659 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.098 | 0.043 | 0.000 | 0.098 | gw-r/thread-44/journal/page | none observed |
| 9ab027266b518c77000000000000028c | 201.362 | 0.037 | n/a | 0.000 | 0.000 | 0.612 | 200.594 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.091 | 0.037 | 0.000 | 0.091 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c77000000000000027a | 201.303 | 0.033 | n/a | 0.000 | 0.000 | 0.500 | 200.674 | 0.007 | n/a | 0.023 | 0.000 | n/a | n/a | 0.066 | 0.033 | 0.000 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c770000000000000285 | 201.232 | 0.040 | n/a | 0.000 | 0.000 | 0.443 | 200.642 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.068 | 0.040 | 0.000 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c77000000000000027c | 201.211 | 0.031 | n/a | 0.000 | 0.000 | 0.362 | 200.697 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.061 | 0.031 | 0.000 | 0.061 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c770000000000000274 | 201.089 | 0.026 | n/a | 0.000 | 0.000 | 0.454 | 200.520 | 0.006 | n/a | 0.015 | 0.000 | n/a | n/a | 0.068 | 0.026 | 0.000 | 0.068 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c770000000000000278 | 201.040 | 0.032 | n/a | 0.000 | 0.000 | 0.318 | 200.580 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.062 | 0.032 | 0.000 | 0.062 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c770000000000000276 | 195.088 | 0.070 | n/a | 0.000 | 0.000 | 0.812 | 193.692 | 0.366 | n/a | 0.013 | 0.000 | n/a | n/a | 0.134 | 0.070 | 0.000 | 0.134 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c77000000000000028d | 176.813 | 0.038 | n/a | 0.000 | 0.000 | 0.544 | 176.141 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.060 | 0.038 | 0.000 | 0.060 | gw-r/thread-46/journal/page | none observed |

## P3 / tail / read (218 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 84.155 | n/a | n/a | n/a | 0.035 | n/a | 0.000 | 0.000 | 0.440 | 83.487 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.056 | 0.035 | 0.000 | 0.056 |
| p99 | 203.289 | n/a | n/a | n/a | 0.099 | n/a | 0.000 | 0.000 | 3.863 | 201.405 | 1.636 | n/a | 0.085 | 0.000 | n/a | n/a | 0.154 | 0.099 | 0.002 | 0.154 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9ab027266b518c770000000000000ee4 | 204.848 | 0.056 | n/a | 0.000 | 0.000 | 3.863 | 200.681 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.194 | 0.056 | 0.000 | 0.194 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c770000000000000ec3 | 204.275 | 0.018 | n/a | 0.000 | 0.000 | 0.293 | 203.862 | 0.027 | n/a | 0.025 | 0.000 | n/a | n/a | 0.049 | 0.018 | 0.000 | 0.049 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c770000000000000eca | 203.289 | 0.048 | n/a | 0.000 | 0.000 | 0.863 | 202.269 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.072 | 0.048 | 0.000 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 9ab027266b518c770000000000000f1f | 202.242 | 0.066 | n/a | 0.000 | 0.000 | 1.656 | 200.396 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.093 | 0.066 | 0.000 | 0.093 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c770000000000000ee9 | 202.174 | 0.019 | n/a | 0.000 | 0.000 | 0.588 | 201.405 | 0.017 | n/a | 0.099 | 0.000 | n/a | n/a | 0.045 | 0.019 | 0.000 | 0.045 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c770000000000000f01 | 202.171 | 0.020 | n/a | 0.000 | 0.000 | 1.219 | 200.805 | 0.015 | n/a | 0.058 | 0.000 | n/a | n/a | 0.054 | 0.020 | 0.000 | 0.054 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c770000000000000ebb | 202.043 | 0.058 | n/a | 0.000 | 0.000 | 0.924 | 200.894 | 0.017 | n/a | 0.059 | 0.000 | n/a | n/a | 0.091 | 0.058 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c770000000000000ec9 | 202.026 | 0.075 | n/a | 0.000 | 0.000 | 0.780 | 201.002 | 0.015 | n/a | 0.079 | 0.000 | n/a | n/a | 0.075 | 0.075 | 0.000 | 0.075 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c770000000000000ef0 | 202.021 | 0.021 | n/a | 0.000 | 0.000 | 1.255 | 200.641 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.059 | 0.021 | 0.000 | 0.059 | gw-r/thread-44/journal/page | none observed |
| 9ab027266b518c770000000000000f08 | 201.801 | 0.024 | n/a | 0.000 | 0.000 | 0.605 | 201.029 | 0.014 | n/a | 0.065 | 0.000 | n/a | n/a | 0.064 | 0.024 | 0.000 | 0.064 | gw-r/thread-44/journal/page | none observed |
| 9ab027266b518c770000000000000f0b | 201.730 | 0.020 | n/a | 0.000 | 0.000 | 0.364 | 201.215 | 0.016 | n/a | 0.070 | 0.000 | n/a | n/a | 0.045 | 0.020 | 0.000 | 0.045 | gw-r/thread-43/journal/page | none observed |
| 9ab027266b518c770000000000000eb6 | 201.729 | 0.050 | n/a | 0.000 | 0.000 | 0.713 | 200.768 | 0.010 | n/a | 0.035 | 0.000 | n/a | n/a | 0.154 | 0.050 | 0.000 | 0.154 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c770000000000000eb1 | 201.724 | 0.034 | n/a | 0.000 | 0.000 | 0.584 | 200.980 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.064 | 0.034 | 0.000 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 9ab027266b518c770000000000000ec0 | 201.601 | 0.042 | n/a | 0.000 | 0.000 | 0.481 | 200.926 | 0.009 | n/a | 0.036 | 0.000 | n/a | n/a | 0.107 | 0.042 | 0.000 | 0.107 | gw-r/thread-45/journal/page | none observed |
| 9ab027266b518c770000000000000eb0 | 201.584 | 0.047 | n/a | 0.000 | 0.000 | 0.506 | 200.818 | 0.053 | n/a | 0.053 | 0.000 | n/a | n/a | 0.107 | 0.047 | 0.000 | 0.107 | gw-r/thread-64/journal/page | none observed |
| 9ab027266b518c770000000000000eb2 | 201.562 | 0.027 | n/a | 0.000 | 0.000 | 0.598 | 200.821 | 0.011 | n/a | 0.049 | 0.000 | n/a | n/a | 0.057 | 0.027 | 0.000 | 0.057 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c770000000000000eb7 | 201.540 | 0.024 | n/a | 0.000 | 0.000 | 0.331 | 201.016 | 0.016 | n/a | 0.104 | 0.000 | n/a | n/a | 0.049 | 0.024 | 0.000 | 0.049 | gw-r/thread-46/journal/page | none observed |
| 9ab027266b518c770000000000000ee7 | 201.508 | 0.031 | n/a | 0.000 | 0.000 | 0.417 | 200.900 | 0.013 | n/a | 0.049 | 0.000 | n/a | n/a | 0.096 | 0.031 | 0.000 | 0.096 | gw-r/thread-41/journal/page | none observed |
| 9ab027266b518c770000000000000eba | 201.492 | 0.026 | n/a | 0.000 | 0.000 | 0.472 | 200.850 | 0.024 | n/a | 0.064 | 0.000 | n/a | n/a | 0.056 | 0.026 | 0.000 | 0.056 | gw-r/thread-64/journal/page | none observed |
| 9ab027266b518c770000000000000ecd | 201.481 | 0.079 | n/a | 0.000 | 0.000 | 0.821 | 200.397 | 0.006 | n/a | 0.017 | 0.000 | n/a | n/a | 0.161 | 0.079 | 0.000 | 0.161 | gw-r/thread-64/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
