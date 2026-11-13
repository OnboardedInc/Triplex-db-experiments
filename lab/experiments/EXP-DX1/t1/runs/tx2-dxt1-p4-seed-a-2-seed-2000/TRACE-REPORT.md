# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-66/peer.transact-await (includes order/network/storage)` (26.041 ms, trace `da9f0f9b4c43665b0000000000000385`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (69.725 ms, trace `da9f0f9b4c43665b0000000000000213`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (74.300 ms, trace `da9f0f9b4c43665b0000000000000102`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (83.511 ms, trace `da9f0f9b4c43665b0000000000000354`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (40.101 ms, trace `da9f0f9b4c43665b00000000000002fe`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-seed-a-2-seed-2000`; source `647da7a8545c6ff0acd545de48fde57601c3de71`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 6671465.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 217 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13538.410 | 621.804 | 28.482 | 308 |
| L1 | 0 | 19964.595 | 449.378 | 27.914 | 462 |
| L4 | 0 | 19935.188 | 393.944 | 18.339 | 426 |
| L16 | 0 | 19975.393 | 413.497 | 12.715 | 474 |
| L64 | 0 | 19969.169 | 443.017 | 13.458 | 610 |
| L256 | 0 | 19940.072 | 421.107 | 6.473 | 472 |
| L1024 | 0 | 19979.120 | 3902.713 | 175.870 | 12099 |
| tail | 0 | 64485.720 | 11170.533 | 591.943 | 37338 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| da9f0f9b4c43665b0000000000000385 | driver.queue.scheduler-dispatch | 0.079 | none | 1 / 32 |
| da9f0f9b4c43665b0000000000000385 | driver.queue.scheduler-late | 0.003 | none | 1 / 32 |

Observed active steps while trace da9f0f9b4c43665b0000000000000385 waited: []

| da9f0f9b4c43665b0000000000000213 | driver.queue.scheduler-dispatch | 0.068 | none | 0 / 32 |
| da9f0f9b4c43665b0000000000000213 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace da9f0f9b4c43665b0000000000000213 waited: []

| da9f0f9b4c43665b0000000000000102 | driver.queue.scheduler-dispatch | 0.353 | none | 0 / 32 |
| da9f0f9b4c43665b0000000000000102 | driver.queue.scheduler-late | 0.006 | none | 0 / 32 |

Observed active steps while trace da9f0f9b4c43665b0000000000000102 waited: []

| da9f0f9b4c43665b0000000000000354 | driver.queue.scheduler-late | 0.357 | none | 5 / 32 |
| da9f0f9b4c43665b0000000000000354 | driver.queue.scheduler-dispatch | 0.072 | none | 5 / 32 |

Observed active steps while trace da9f0f9b4c43665b0000000000000354 waited: []

| da9f0f9b4c43665b00000000000002fe | driver.queue.scheduler-dispatch | 0.032 | none | 3 / 32 |
| da9f0f9b4c43665b00000000000002fe | driver.queue.scheduler-late | 0.002 | none | 3 / 32 |

Observed active steps while trace da9f0f9b4c43665b00000000000002fe waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.466 | 0.732 | 0.000 | 1.595 | 4.972 | 0.014 | 0.000 | 0.351 | 1.858 | 9.116 | 0.087 | n/a | 0.843 | 16.759 | n/a | n/a | 0.056 | 5.916 | 0.193 | 0.056 |
| p99 | 103.064 | 6.336 | 3.017 | 9.848 | 18.817 | 0.544 | 5.883 | 1.218 | 4.592 | 29.347 | 0.391 | n/a | 6.452 | 74.300 | n/a | n/a | 0.319 | 19.419 | 0.521 | 0.319 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b0000000000000102 | 103.064 | 5.197 | 0.352 | 2.386 | 0.359 | 2.207 | 14.188 | 0.064 | n/a | 3.935 | 74.300 | n/a | n/a | 0.077 | 8.293 | 0.080 | 0.077 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000000f0 | 77.222 | 18.817 | 0.517 | 0.000 | 0.085 | 2.983 | 29.347 | 0.391 | n/a | 1.213 | 23.813 | n/a | n/a | 0.056 | 19.419 | 0.251 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000000ed | 67.969 | 11.566 | 0.014 | 0.000 | 0.386 | 2.288 | 9.116 | 0.359 | n/a | 6.452 | 37.469 | n/a | n/a | 0.319 | 11.966 | 0.176 | 0.319 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000000f4 | 62.029 | 7.776 | 0.306 | 0.000 | 0.084 | 3.299 | 23.224 | 0.095 | n/a | 0.892 | 26.287 | n/a | n/a | 0.067 | 8.165 | 0.132 | 0.067 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000116 | 55.539 | 4.368 | 0.418 | 0.278 | 0.081 | 3.394 | 10.649 | 0.058 | n/a | 1.210 | 35.031 | n/a | n/a | 0.052 | 5.145 | 0.093 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000108 | 51.299 | 5.369 | 0.338 | 0.000 | 0.141 | 1.971 | 16.391 | 0.142 | n/a | 0.365 | 26.527 | n/a | n/a | 0.056 | 5.847 | 0.114 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000124 | 49.659 | 4.966 | 0.416 | 0.304 | 0.071 | 2.786 | 20.847 | 0.066 | n/a | 3.368 | 16.759 | n/a | n/a | 0.075 | 5.757 | 0.116 | 0.075 | gw-w/thread-48/gateway.admitted-work | none observed |
| da9f0f9b4c43665b0000000000000100 | 49.282 | 6.551 | 0.375 | 2.240 | 0.351 | 2.280 | 17.705 | 0.093 | n/a | 0.946 | 18.631 | n/a | n/a | 0.110 | 9.517 | 0.193 | 0.110 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000010c | 48.648 | 5.677 | 0.544 | 1.212 | 0.173 | 2.759 | 17.974 | 0.167 | n/a | 1.029 | 18.976 | n/a | n/a | 0.137 | 7.605 | 0.156 | 0.137 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000011a | 48.256 | 4.058 | 0.274 | 0.370 | 0.063 | 1.858 | 16.721 | 0.254 | n/a | 4.549 | 20.069 | n/a | n/a | 0.042 | 4.765 | 0.099 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000112 | 48.139 | 4.895 | 0.251 | 0.551 | 0.076 | 2.597 | 19.249 | 0.087 | n/a | 0.714 | 19.672 | n/a | n/a | 0.047 | 5.773 | 0.120 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000000f8 | 47.467 | 7.563 | 0.384 | 0.000 | 0.122 | 4.592 | 18.655 | 0.136 | n/a | 0.771 | 15.145 | n/a | n/a | 0.100 | 8.068 | 0.170 | 0.100 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000000fc | 42.419 | 4.929 | 0.243 | 0.000 | 0.073 | 3.490 | 10.406 | 0.094 | n/a | 0.581 | 22.528 | n/a | n/a | 0.074 | 5.246 | 0.124 | 0.074 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000011e | 40.206 | 4.852 | 0.328 | 0.306 | 0.070 | 1.813 | 14.618 | 0.077 | n/a | 0.838 | 17.264 | n/a | n/a | 0.039 | 5.556 | 0.138 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000114 | 35.466 | 8.807 | 0.006 | 1.306 | 1.218 | 1.162 | 2.279 | 0.039 | n/a | 0.843 | 19.751 | n/a | n/a | 0.055 | 11.337 | 0.320 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000103 | 31.710 | 10.151 | 0.008 | 5.883 | 0.475 | 0.921 | 3.857 | 0.040 | n/a | 0.646 | 9.660 | n/a | n/a | 0.068 | 16.518 | 0.521 | 0.068 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000010a | 30.579 | 6.721 | 0.372 | 0.000 | 0.076 | 2.685 | 13.136 | 0.086 | n/a | 0.666 | 6.781 | n/a | n/a | 0.056 | 7.169 | 0.234 | 0.056 | gw-w/thread-43/gateway.admitted-work | none observed |
| da9f0f9b4c43665b00000000000000f6 | 29.412 | 4.541 | 0.005 | 0.000 | 1.168 | 1.154 | 1.577 | 0.045 | n/a | 2.818 | 17.977 | n/a | n/a | 0.127 | 5.715 | 0.194 | 0.127 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000010f | 29.202 | 4.355 | 0.006 | 1.650 | 0.967 | 4.195 | 2.517 | 0.095 | n/a | 3.749 | 11.554 | n/a | n/a | 0.114 | 6.979 | 0.239 | 0.114 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000105 | 28.101 | 5.375 | 0.006 | 2.077 | 0.558 | 1.163 | 1.728 | 0.048 | n/a | 0.752 | 16.344 | n/a | n/a | 0.051 | 8.015 | 0.285 | 0.051 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.932 | 0.989 | 0.000 | 1.706 | 4.387 | 0.006 | 0.000 | 0.763 | 0.982 | 2.436 | 0.049 | n/a | 0.950 | 9.730 | n/a | n/a | 0.066 | 5.163 | 0.265 | 0.066 |
| p99 | 29.412 | 2.682 | 0.000 | 2.169 | 5.632 | 0.013 | 1.650 | 1.184 | 4.195 | 6.332 | 0.221 | n/a | 3.749 | 17.977 | n/a | n/a | 0.261 | 8.373 | 0.365 | 0.261 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b00000000000000f6 | 29.412 | 4.541 | 0.005 | 0.000 | 1.168 | 1.154 | 1.577 | 0.045 | n/a | 2.818 | 17.977 | n/a | n/a | 0.127 | 5.715 | 0.194 | 0.127 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000010f | 29.202 | 4.355 | 0.006 | 1.650 | 0.967 | 4.195 | 2.517 | 0.095 | n/a | 3.749 | 11.554 | n/a | n/a | 0.114 | 6.979 | 0.239 | 0.114 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000011b | 27.259 | 4.387 | 0.010 | 0.000 | 0.164 | 0.954 | 6.332 | 0.099 | n/a | 0.950 | 14.324 | n/a | n/a | 0.039 | 4.561 | 0.167 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000010d | 22.959 | 5.632 | 0.009 | 1.547 | 1.184 | 1.602 | 2.436 | 0.221 | n/a | 1.649 | 8.630 | n/a | n/a | 0.048 | 8.373 | 0.365 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000000f2 | 19.932 | 4.972 | 0.013 | 0.000 | 0.931 | 0.901 | 1.809 | 0.047 | n/a | 0.713 | 10.285 | n/a | n/a | 0.261 | 5.916 | 0.297 | 0.261 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000000fa | 19.480 | 4.646 | 0.011 | 0.000 | 0.506 | 0.982 | 2.886 | 0.047 | n/a | 0.596 | 9.730 | n/a | n/a | 0.077 | 5.163 | 0.265 | 0.077 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000011f | 16.167 | 3.486 | 0.005 | 0.000 | 0.607 | 1.447 | 1.601 | 0.048 | n/a | 1.318 | 7.607 | n/a | n/a | 0.048 | 4.099 | 0.254 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000117 | 14.828 | 3.398 | 0.006 | 0.000 | 0.763 | 0.924 | 2.893 | 0.145 | n/a | 0.520 | 6.113 | n/a | n/a | 0.066 | 4.167 | 0.281 | 0.066 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000122 | 13.714 | 3.130 | 0.006 | 0.000 | 0.627 | 0.720 | 1.369 | 0.049 | n/a | 0.677 | 7.099 | n/a | n/a | 0.039 | 3.762 | 0.274 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.545 | 0.323 | 0.000 | 0.356 | 8.351 | 0.256 | 0.000 | 0.112 | 2.834 | 12.151 | 0.057 | n/a | 0.216 | 15.714 | n/a | n/a | 0.054 | 9.487 | 0.246 | 0.054 |
| p99 | 49.225 | 1.582 | 2.801 | 5.296 | 8.878 | 3.109 | 0.241 | 1.450 | 4.822 | 21.383 | 0.064 | n/a | 2.361 | 16.830 | n/a | n/a | 0.063 | 9.807 | 0.311 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b000000000000096c | 49.225 | 4.643 | 3.109 | 0.000 | 0.092 | 2.834 | 21.383 | 0.064 | n/a | 0.216 | 16.830 | n/a | n/a | 0.054 | 7.844 | 0.159 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 4.823ms; driver.publication 4.179ms; driver.publication 2.960ms; driver.publication 1.619ms |
| da9f0f9b4c43665b0000000000000126 | 38.545 | 8.878 | 0.256 | 0.241 | 0.112 | 1.509 | 12.151 | 0.057 | n/a | 2.361 | 12.918 | n/a | n/a | 0.063 | 9.487 | 0.246 | 0.063 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000096d | 31.575 | 8.351 | 0.006 | 0.000 | 1.450 | 4.822 | 1.011 | 0.029 | n/a | 0.167 | 15.714 | n/a | n/a | 0.025 | 9.807 | 0.311 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.332 | 0.637 | 0.000 | 1.224 | 5.621 | 0.016 | 0.000 | 0.244 | 1.897 | 9.717 | 0.060 | n/a | 0.505 | 15.292 | n/a | n/a | 0.060 | 6.457 | 0.205 | 0.060 |
| p99 | 82.571 | 2.358 | 2.346 | 4.279 | 10.967 | 0.548 | 2.337 | 10.505 | 5.505 | 51.060 | 0.295 | n/a | 3.645 | 55.721 | n/a | n/a | 0.168 | 19.092 | 0.553 | 0.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b0000000000000137 | 82.571 | 7.836 | 0.006 | 1.773 | 0.274 | 1.351 | 15.157 | 0.083 | n/a | 0.282 | 55.721 | n/a | n/a | 0.087 | 9.889 | 0.120 | 0.087 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000128 | 72.324 | 10.967 | 0.392 | 1.016 | 0.345 | 3.219 | 28.819 | 0.135 | n/a | 2.892 | 24.408 | n/a | n/a | 0.130 | 12.721 | 0.176 | 0.130 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000179 | 68.950 | 4.289 | 0.234 | 0.354 | 0.289 | 1.910 | 51.060 | 0.117 | n/a | 1.283 | 9.245 | n/a | n/a | 0.168 | 5.167 | 0.075 | 0.168 | gw-w/thread-41/gateway.admitted-work | none observed |
| da9f0f9b4c43665b0000000000000131 | 58.527 | 3.794 | 0.191 | 0.000 | 0.088 | 4.994 | 27.613 | 0.070 | n/a | 0.272 | 21.449 | n/a | n/a | 0.056 | 4.073 | 0.070 | 0.056 | gw-w/thread-47/gateway.admitted-work | none observed |
| da9f0f9b4c43665b000000000000016d | 52.987 | 5.348 | 0.318 | 0.278 | 0.085 | 5.505 | 20.257 | 0.137 | n/a | 0.505 | 20.415 | n/a | n/a | 0.138 | 6.030 | 0.114 | 0.138 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000014d | 49.809 | 4.595 | 0.290 | 0.378 | 0.125 | 1.897 | 22.871 | 0.071 | n/a | 0.643 | 18.877 | n/a | n/a | 0.062 | 5.388 | 0.108 | 0.062 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000134 | 49.740 | 6.409 | 0.284 | 0.000 | 0.081 | 2.232 | 16.942 | 0.054 | n/a | 0.250 | 23.441 | n/a | n/a | 0.047 | 6.774 | 0.136 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000013d | 49.639 | 4.108 | 0.222 | 0.000 | 0.081 | 2.251 | 10.580 | 0.053 | n/a | 2.160 | 30.142 | n/a | n/a | 0.042 | 4.411 | 0.089 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000143 | 46.828 | 5.837 | 0.289 | 0.453 | 0.148 | 2.047 | 13.290 | 0.069 | n/a | 0.564 | 24.052 | n/a | n/a | 0.077 | 6.727 | 0.144 | 0.077 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000169 | 44.720 | 5.179 | 0.241 | 0.242 | 0.086 | 2.051 | 15.841 | 0.158 | n/a | 3.552 | 17.317 | n/a | n/a | 0.052 | 5.749 | 0.129 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000167 | 44.363 | 6.060 | 0.414 | 0.513 | 0.105 | 2.198 | 11.168 | 0.061 | n/a | 0.384 | 23.390 | n/a | n/a | 0.070 | 7.093 | 0.160 | 0.070 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000132 | 44.118 | 8.993 | 0.005 | 0.000 | 0.859 | 3.237 | 16.844 | 0.098 | n/a | 0.882 | 13.141 | n/a | n/a | 0.060 | 9.857 | 0.223 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000012a | 43.371 | 8.912 | 0.392 | 0.000 | 0.132 | 4.047 | 13.880 | 0.084 | n/a | 0.244 | 15.617 | n/a | n/a | 0.063 | 9.436 | 0.218 | 0.063 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000165 | 41.332 | 10.254 | 0.016 | 0.000 | 8.821 | 1.417 | 3.803 | 0.081 | n/a | 0.433 | 16.374 | n/a | n/a | 0.133 | 19.092 | 0.462 | 0.133 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000013b | 40.438 | 7.757 | 0.385 | 0.000 | 0.151 | 2.607 | 10.493 | 0.058 | n/a | 0.270 | 18.650 | n/a | n/a | 0.067 | 8.294 | 0.205 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000141 | 39.967 | 8.915 | 0.011 | 0.000 | 0.651 | 1.523 | 1.553 | 0.041 | n/a | 2.214 | 24.998 | n/a | n/a | 0.062 | 9.577 | 0.240 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000015f | 39.593 | 6.030 | 0.349 | 0.456 | 0.076 | 2.765 | 15.724 | 0.060 | n/a | 0.287 | 13.785 | n/a | n/a | 0.060 | 6.911 | 0.175 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000147 | 39.429 | 5.964 | 0.259 | 0.229 | 0.355 | 2.146 | 14.342 | 0.129 | n/a | 0.636 | 15.292 | n/a | n/a | 0.077 | 6.808 | 0.173 | 0.077 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000013f | 39.127 | 6.269 | 0.548 | 0.000 | 0.406 | 2.914 | 9.717 | 0.049 | n/a | 0.645 | 18.476 | n/a | n/a | 0.103 | 7.224 | 0.185 | 0.103 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000153 | 37.079 | 5.935 | 0.475 | 0.447 | 0.118 | 1.815 | 12.058 | 0.126 | n/a | 0.607 | 15.423 | n/a | n/a | 0.076 | 6.975 | 0.188 | 0.076 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.090 | 0.506 | 0.000 | 1.729 | 3.392 | 0.005 | 0.000 | 0.650 | 0.957 | 1.865 | 0.043 | n/a | 0.300 | 8.893 | n/a | n/a | 0.045 | 4.958 | 0.243 | 0.045 |
| p99 | 44.118 | 1.794 | 0.183 | 3.009 | 8.993 | 0.006 | 1.245 | 10.505 | 3.237 | 16.844 | 0.295 | n/a | 3.645 | 19.001 | n/a | n/a | 0.074 | 15.010 | 0.553 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b0000000000000132 | 44.118 | 8.993 | 0.005 | 0.000 | 0.859 | 3.237 | 16.844 | 0.098 | n/a | 0.882 | 13.141 | n/a | n/a | 0.060 | 9.857 | 0.223 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000144 | 30.120 | 3.848 | 0.005 | 0.000 | 1.105 | 0.781 | 4.791 | 0.295 | n/a | 0.249 | 19.001 | n/a | n/a | 0.045 | 4.958 | 0.165 | 0.045 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000174 | 27.166 | 3.257 | 0.004 | 1.245 | 10.505 | 0.957 | 1.887 | 0.075 | n/a | 3.645 | 5.554 | n/a | n/a | 0.037 | 15.010 | 0.553 | 0.037 | node-14/thread-0/driver.queue.subject | driver.publication 1.320ms; driver.expected-state.bind-receipt 1.264ms |
| da9f0f9b4c43665b000000000000012f | 23.997 | 3.807 | 0.005 | 1.236 | 0.781 | 0.935 | 2.121 | 0.066 | n/a | 0.680 | 14.324 | n/a | n/a | 0.042 | 5.829 | 0.243 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000016a | 18.090 | 5.115 | 0.006 | 0.000 | 0.650 | 1.314 | 1.865 | 0.040 | n/a | 2.228 | 6.797 | n/a | n/a | 0.074 | 5.772 | 0.319 | 0.074 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000159 | 16.469 | 3.238 | 0.005 | 0.000 | 0.378 | 0.706 | 1.232 | 0.038 | n/a | 0.228 | 10.604 | n/a | n/a | 0.042 | 3.621 | 0.220 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000014e | 15.753 | 3.392 | 0.006 | 0.000 | 0.428 | 1.231 | 1.413 | 0.043 | n/a | 0.300 | 8.893 | n/a | n/a | 0.046 | 3.826 | 0.243 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000015d | 9.632 | 2.548 | 0.005 | 0.000 | 0.088 | 1.244 | 1.379 | 0.035 | n/a | 0.221 | 4.061 | n/a | n/a | 0.051 | 2.640 | 0.274 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (37 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 73.474 | n/a | n/a | n/a | 35.642 | 3.236 | 2.069 | 0.000 | 0.490 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.436 | 58.017 | 0.861 | 11.436 |
| p99 | 228.641 | n/a | n/a | n/a | 130.839 | 65.375 | 24.670 | 0.000 | 2.018 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 93.143 | 159.352 | 1.000 | 93.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b0000000000001ba1 | 228.641 | 130.839 | 3.843 | 24.670 | 0.000 | 0.796 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 68.493 | 159.352 | 0.697 | 68.493 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 2.294ms; driver.publication 2.016ms; driver.expected-state.bind-receipt 1.791ms; driver.publication 1.486ms; driver.publication 1.406ms |
| da9f0f9b4c43665b0000000000000772 | 134.538 | 96.365 | 0.752 | 18.694 | 0.000 | 1.744 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.982 | 115.812 | 0.861 | 16.982 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.861ms; driver.publication 1.796ms; driver.expected-state.bind-receipt 1.264ms; driver.publication 1.225ms; driver.publication 1.214ms |
| da9f0f9b4c43665b000000000000030b | 134.067 | 34.350 | 2.387 | 2.985 | 0.000 | 1.202 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 93.143 | 39.722 | 0.296 | 93.143 | node-14/thread-3/socket.wait-first-byte | driver.publication 4.535ms; driver.publication 3.096ms; driver.publication 2.654ms; driver.publication 2.273ms; driver.publication 1.871ms |
| da9f0f9b4c43665b0000000000001037 | 123.512 | 54.506 | 3.236 | 3.816 | 0.000 | 0.666 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 61.288 | 61.558 | 0.498 | 61.288 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.666ms; driver.publication 1.484ms; driver.publication 1.268ms; driver.publication 1.243ms; driver.publication 1.211ms |
| da9f0f9b4c43665b0000000000001571 | 116.680 | 18.651 | 60.941 | 0.000 | 0.000 | 0.362 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.727 | 79.592 | 0.682 | 36.727 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 4.919ms; driver.publication 3.986ms; driver.publication 1.703ms; driver.publication 1.576ms; driver.expected-state.bind-receipt 1.206ms |
| da9f0f9b4c43665b00000000000012d5 | 116.598 | 33.563 | 0.407 | 3.563 | 0.000 | 0.510 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 78.556 | 37.532 | 0.322 | 78.556 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.416ms; driver.publication 1.254ms |
| da9f0f9b4c43665b0000000000001570 | 115.453 | 48.858 | 60.311 | 2.767 | 0.000 | 0.756 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.761 | 111.936 | 0.970 | 2.761 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 4.919ms; driver.publication 3.986ms; driver.publication 1.703ms; driver.publication 1.576ms; driver.expected-state.bind-receipt 1.206ms |
| da9f0f9b4c43665b0000000000000d36 | 97.956 | 26.968 | 65.375 | 0.000 | 0.000 | 0.194 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.418 | 92.344 | 0.943 | 5.418 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.711ms; driver.publication 1.836ms; driver.publication 1.709ms; driver.publication 1.575ms; driver.publication 1.551ms |
| da9f0f9b4c43665b000000000000156a | 91.941 | 64.739 | 0.690 | 6.902 | 0.000 | 0.743 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.866 | 72.331 | 0.787 | 18.866 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 4.919ms; driver.publication 3.986ms; driver.publication 1.703ms; driver.publication 1.406ms; driver.expected-state.bind-receipt 1.206ms |
| da9f0f9b4c43665b00000000000009db | 91.679 | 38.655 | 24.583 | 4.138 | 0.000 | 0.407 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.896 | 67.376 | 0.735 | 23.896 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.162ms; driver.publication 1.277ms; driver.publication 1.196ms; driver.publication 1.162ms |
| da9f0f9b4c43665b0000000000000d35 | 87.602 | 20.554 | 65.112 | 0.000 | 0.000 | 0.507 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.429 | 85.666 | 0.978 | 1.429 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.711ms; driver.publication 1.836ms; driver.publication 1.709ms; driver.publication 1.575ms; driver.publication 1.077ms |
| da9f0f9b4c43665b00000000000012d4 | 87.344 | 53.657 | 1.819 | 10.142 | 0.000 | 0.885 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.841 | 65.618 | 0.751 | 20.841 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.416ms; driver.publication 1.254ms |
| da9f0f9b4c43665b0000000000000312 | 85.615 | 54.869 | 10.186 | 7.106 | 0.000 | 2.018 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.436 | 72.161 | 0.843 | 11.436 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 4.535ms; driver.publication 3.096ms; driver.publication 2.654ms; driver.publication 2.273ms; driver.publication 1.339ms |
| da9f0f9b4c43665b0000000000000d32 | 83.688 | 21.904 | 0.819 | 0.000 | 0.000 | 0.433 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 60.532 | 22.723 | 0.272 | 60.532 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.711ms; driver.publication 1.836ms; driver.publication 1.709ms; driver.publication 1.449ms; driver.publication 1.077ms |
| da9f0f9b4c43665b00000000000012d6 | 83.421 | 16.278 | 0.480 | 0.000 | 0.000 | 0.415 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 66.247 | 16.758 | 0.201 | 66.247 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.416ms; driver.publication 1.254ms |
| da9f0f9b4c43665b0000000000000d30 | 80.791 | 55.876 | 2.954 | 3.571 | 0.000 | 0.547 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.841 | 62.402 | 0.772 | 17.841 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 2.711ms; driver.publication 1.836ms; driver.publication 1.449ms; driver.publication 1.202ms; driver.publication 1.077ms |
| da9f0f9b4c43665b00000000000009e3 | 78.393 | 31.430 | 12.472 | 0.000 | 0.000 | 0.270 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.221 | 43.902 | 0.560 | 34.221 | node-14/thread-3/socket.wait-first-byte | driver.publication 3.162ms; driver.publication 1.277ms; driver.publication 1.196ms |
| da9f0f9b4c43665b0000000000000138 | 76.613 | 59.339 | 1.181 | 7.060 | 0.000 | 1.777 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.256 | 67.580 | 0.882 | 7.256 | node-14/thread-3/worker.gateway-observer.observe | none observed |
| da9f0f9b4c43665b000000000000096b | 73.474 | 53.953 | 2.841 | 2.069 | 0.000 | 0.490 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.121 | 58.864 | 0.801 | 14.121 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 4.823ms; driver.publication 4.179ms; driver.publication 2.960ms; driver.publication 1.655ms; driver.publication 1.619ms |
| da9f0f9b4c43665b0000000000001613 | 73.088 | 47.008 | 0.424 | 4.340 | 0.000 | 0.517 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.799 | 51.772 | 0.708 | 20.799 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 6.217ms; driver.publication 1.503ms; driver.publication 1.185ms; driver.publication 1.053ms |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.128 | 0.784 | 0.000 | 1.226 | 5.127 | 0.205 | 0.000 | 0.154 | 1.791 | 8.531 | 0.074 | n/a | 0.401 | 12.470 | n/a | n/a | 0.061 | 5.875 | 0.187 | 0.061 |
| p99 | 85.669 | 3.368 | 0.000 | 4.946 | 8.486 | 0.788 | 1.787 | 1.389 | 6.138 | 25.991 | 0.283 | n/a | 4.121 | 69.976 | n/a | n/a | 0.203 | 9.643 | 0.356 | 0.203 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b00000000000001b6 | 85.669 | 3.976 | 0.272 | 0.000 | 0.082 | 1.517 | 9.530 | 0.044 | n/a | 0.217 | 69.976 | n/a | n/a | 0.055 | 4.329 | 0.051 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000185 | 55.313 | 7.730 | 0.012 | 0.000 | 1.097 | 1.014 | 25.991 | 0.079 | n/a | 0.223 | 19.091 | n/a | n/a | 0.074 | 8.839 | 0.160 | 0.074 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| da9f0f9b4c43665b0000000000000194 | 53.140 | 8.486 | 0.250 | 0.318 | 0.096 | 2.802 | 8.531 | 0.067 | n/a | 0.437 | 32.104 | n/a | n/a | 0.049 | 9.151 | 0.172 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001c3 | 52.227 | 6.923 | 0.428 | 0.000 | 0.203 | 2.226 | 12.266 | 0.203 | n/a | 2.085 | 27.689 | n/a | n/a | 0.203 | 7.555 | 0.145 | 0.203 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.529ms |
| da9f0f9b4c43665b0000000000000181 | 51.029 | 7.393 | 0.668 | 0.537 | 0.074 | 2.087 | 16.608 | 0.083 | n/a | 0.776 | 22.734 | n/a | n/a | 0.070 | 8.672 | 0.170 | 0.070 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000018e | 50.275 | 6.164 | 0.338 | 0.489 | 0.094 | 5.308 | 17.837 | 0.147 | n/a | 1.138 | 18.704 | n/a | n/a | 0.058 | 7.084 | 0.141 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000019e | 46.828 | 4.910 | 0.497 | 0.213 | 0.125 | 1.372 | 15.156 | 0.115 | n/a | 0.477 | 23.869 | n/a | n/a | 0.093 | 5.746 | 0.123 | 0.093 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000018c | 46.231 | 5.743 | 0.377 | 0.294 | 0.123 | 2.187 | 13.533 | 0.283 | n/a | 1.205 | 22.323 | n/a | n/a | 0.162 | 6.537 | 0.141 | 0.162 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000184 | 45.770 | 5.297 | 0.218 | 0.283 | 0.076 | 1.579 | 8.037 | 0.058 | n/a | 0.531 | 29.651 | n/a | n/a | 0.040 | 5.875 | 0.128 | 0.040 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000198 | 40.770 | 5.585 | 0.228 | 0.554 | 0.079 | 2.536 | 17.514 | 0.084 | n/a | 0.285 | 13.855 | n/a | n/a | 0.049 | 6.447 | 0.158 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001c2 | 40.084 | 4.609 | 0.006 | 0.000 | 0.637 | 6.138 | 2.240 | 0.050 | n/a | 4.121 | 22.240 | n/a | n/a | 0.044 | 5.251 | 0.131 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001bc | 39.267 | 5.192 | 0.334 | 0.000 | 0.063 | 2.178 | 18.667 | 0.084 | n/a | 0.222 | 12.470 | n/a | n/a | 0.056 | 5.590 | 0.142 | 0.056 | gw-w/thread-45/gateway.admitted-work | none observed |
| da9f0f9b4c43665b000000000000017d | 34.598 | 5.482 | 0.319 | 0.443 | 0.076 | 2.059 | 11.439 | 0.053 | n/a | 0.846 | 13.822 | n/a | n/a | 0.059 | 6.321 | 0.183 | 0.059 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001b2 | 34.196 | 4.044 | 0.390 | 0.000 | 0.084 | 2.131 | 9.560 | 0.074 | n/a | 0.258 | 17.585 | n/a | n/a | 0.070 | 4.518 | 0.132 | 0.070 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001b3 | 33.763 | 6.968 | 0.007 | 0.000 | 0.189 | 0.896 | 2.681 | 0.070 | n/a | 0.823 | 22.064 | n/a | n/a | 0.067 | 7.163 | 0.212 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001ac | 33.689 | 5.991 | 0.205 | 0.000 | 0.078 | 2.050 | 13.098 | 0.106 | n/a | 0.604 | 11.493 | n/a | n/a | 0.065 | 6.274 | 0.186 | 0.065 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001a6 | 33.503 | 5.127 | 0.311 | 0.000 | 0.154 | 1.633 | 14.304 | 0.053 | n/a | 0.231 | 11.609 | n/a | n/a | 0.082 | 5.592 | 0.167 | 0.082 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001be | 33.199 | 5.124 | 0.259 | 0.000 | 0.132 | 1.979 | 14.956 | 0.075 | n/a | 0.585 | 10.027 | n/a | n/a | 0.063 | 5.514 | 0.166 | 0.063 | gw-w/thread-44/gateway.admitted-work | none observed |
| da9f0f9b4c43665b00000000000001b0 | 32.667 | 5.741 | 0.354 | 0.000 | 0.133 | 1.906 | 11.581 | 0.097 | n/a | 0.245 | 12.534 | n/a | n/a | 0.075 | 6.229 | 0.191 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001a0 | 32.128 | 5.166 | 0.788 | 0.313 | 0.088 | 2.247 | 11.741 | 0.105 | n/a | 0.401 | 11.237 | n/a | n/a | 0.043 | 6.354 | 0.198 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.175 | 0.969 | 0.000 | 1.824 | 3.775 | 0.006 | 0.000 | 0.853 | 1.005 | 1.294 | 0.048 | n/a | 0.285 | 7.764 | n/a | n/a | 0.053 | 4.882 | 0.307 | 0.053 |
| p99 | 40.084 | 1.647 | 0.000 | 2.896 | 5.509 | 0.012 | 0.000 | 1.134 | 6.138 | 2.582 | 0.103 | n/a | 4.121 | 22.240 | n/a | n/a | 0.175 | 6.417 | 0.349 | 0.175 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b00000000000001c2 | 40.084 | 4.609 | 0.006 | 0.000 | 0.637 | 6.138 | 2.240 | 0.050 | n/a | 4.121 | 22.240 | n/a | n/a | 0.044 | 5.251 | 0.131 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000017a | 28.539 | 3.517 | 0.008 | 0.000 | 1.036 | 0.753 | 1.120 | 0.039 | n/a | 0.234 | 21.766 | n/a | n/a | 0.065 | 4.561 | 0.160 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001c5 | 19.898 | 5.509 | 0.012 | 0.000 | 0.896 | 1.791 | 2.582 | 0.087 | n/a | 1.082 | 7.764 | n/a | n/a | 0.175 | 6.417 | 0.322 | 0.175 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000189 | 19.225 | 3.872 | 0.005 | 0.000 | 1.006 | 0.879 | 1.677 | 0.077 | n/a | 0.940 | 10.716 | n/a | n/a | 0.053 | 4.882 | 0.254 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000017f | 17.613 | 4.908 | 0.007 | 0.000 | 0.647 | 1.143 | 1.234 | 0.039 | n/a | 0.220 | 9.350 | n/a | n/a | 0.064 | 5.562 | 0.316 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000018f | 17.175 | 5.121 | 0.010 | 0.000 | 0.858 | 1.625 | 1.903 | 0.103 | n/a | 2.025 | 5.445 | n/a | n/a | 0.086 | 5.988 | 0.349 | 0.086 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000191 | 15.939 | 3.483 | 0.005 | 0.000 | 0.853 | 0.872 | 1.069 | 0.035 | n/a | 0.285 | 9.295 | n/a | n/a | 0.042 | 4.340 | 0.272 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001ad | 15.453 | 3.775 | 0.007 | 0.000 | 1.134 | 1.005 | 1.412 | 0.048 | n/a | 0.325 | 7.695 | n/a | n/a | 0.053 | 4.915 | 0.318 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001ba | 14.299 | 3.652 | 0.006 | 0.000 | 0.853 | 1.072 | 1.294 | 0.042 | n/a | 0.272 | 7.062 | n/a | n/a | 0.045 | 4.512 | 0.316 | 0.045 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001a3 | 11.236 | 2.929 | 0.006 | 0.000 | 0.513 | 0.696 | 1.068 | 0.049 | n/a | 0.240 | 5.675 | n/a | n/a | 0.058 | 3.448 | 0.307 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.313 | 0.609 | 0.000 | 1.432 | 4.681 | 0.024 | 0.000 | 0.329 | 1.535 | 3.827 | 0.068 | n/a | 0.515 | 13.262 | n/a | n/a | 0.062 | 5.323 | 0.197 | 0.062 |
| p99 | 114.002 | 4.244 | 1.925 | 5.017 | 17.557 | 4.203 | 0.469 | 1.269 | 8.355 | 48.627 | 0.382 | n/a | 2.984 | 69.725 | n/a | n/a | 0.139 | 17.962 | 0.388 | 0.139 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b0000000000000213 | 114.002 | 8.225 | 0.552 | 0.000 | 0.071 | 2.831 | 32.208 | 0.046 | n/a | 0.258 | 69.725 | n/a | n/a | 0.086 | 8.848 | 0.078 | 0.086 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001f0 | 68.294 | 3.847 | 0.215 | 0.000 | 0.074 | 1.651 | 48.627 | 0.113 | n/a | 0.456 | 13.262 | n/a | n/a | 0.048 | 4.136 | 0.061 | 0.048 | gw-w/thread-48/gateway.admitted-work | driver.publication 1.391ms |
| da9f0f9b4c43665b00000000000001ff | 59.859 | 12.300 | 4.203 | 0.000 | 0.080 | 8.355 | 12.097 | 0.125 | n/a | 0.516 | 22.114 | n/a | n/a | 0.068 | 16.583 | 0.277 | 0.068 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001ec | 56.025 | 17.557 | 0.022 | 0.000 | 0.383 | 6.618 | 18.577 | 0.226 | n/a | 1.186 | 11.358 | n/a | n/a | 0.099 | 17.962 | 0.321 | 0.099 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001d7 | 46.731 | 7.997 | 0.535 | 0.469 | 0.101 | 3.265 | 11.644 | 0.084 | n/a | 2.164 | 20.381 | n/a | n/a | 0.092 | 9.102 | 0.195 | 0.092 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001db | 40.693 | 4.765 | 0.283 | 0.332 | 0.081 | 5.317 | 8.468 | 0.088 | n/a | 0.273 | 21.020 | n/a | n/a | 0.066 | 5.460 | 0.134 | 0.066 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000207 | 37.687 | 5.054 | 0.273 | 0.000 | 0.082 | 2.002 | 16.214 | 0.078 | n/a | 0.660 | 13.250 | n/a | n/a | 0.074 | 5.409 | 0.144 | 0.074 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001f8 | 34.683 | 4.839 | 0.006 | 0.000 | 0.478 | 1.230 | 2.849 | 0.117 | n/a | 1.305 | 23.809 | n/a | n/a | 0.050 | 5.323 | 0.153 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000021b | 34.518 | 4.934 | 0.200 | 0.000 | 0.058 | 1.879 | 11.790 | 0.068 | n/a | 0.410 | 15.137 | n/a | n/a | 0.042 | 5.192 | 0.150 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001eb | 34.004 | 6.209 | 0.214 | 0.000 | 0.088 | 3.078 | 8.525 | 0.083 | n/a | 0.431 | 15.323 | n/a | n/a | 0.053 | 6.511 | 0.191 | 0.053 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001d0 | 34.003 | 6.502 | 0.005 | 0.000 | 0.049 | 2.354 | 2.986 | 0.047 | n/a | 0.641 | 21.392 | n/a | n/a | 0.028 | 6.555 | 0.193 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.710ms |
| da9f0f9b4c43665b0000000000000217 | 33.350 | 3.556 | 0.406 | 0.000 | 0.134 | 1.916 | 12.359 | 0.382 | n/a | 0.250 | 14.261 | n/a | n/a | 0.085 | 4.097 | 0.123 | 0.085 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000020d | 32.428 | 4.421 | 0.257 | 0.000 | 0.222 | 2.579 | 10.008 | 0.094 | n/a | 0.772 | 14.014 | n/a | n/a | 0.062 | 4.899 | 0.151 | 0.062 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000203 | 31.915 | 4.123 | 0.256 | 0.000 | 0.075 | 1.555 | 9.291 | 0.178 | n/a | 0.515 | 15.879 | n/a | n/a | 0.043 | 4.454 | 0.140 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001e1 | 31.191 | 4.448 | 0.469 | 0.413 | 0.401 | 1.586 | 11.418 | 0.063 | n/a | 0.550 | 11.703 | n/a | n/a | 0.139 | 5.731 | 0.184 | 0.139 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001fb | 31.189 | 8.104 | 0.012 | 0.000 | 0.950 | 1.069 | 1.856 | 0.108 | n/a | 0.626 | 18.387 | n/a | n/a | 0.077 | 9.066 | 0.291 | 0.077 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000020b | 31.114 | 4.288 | 0.302 | 0.000 | 0.124 | 2.679 | 5.708 | 0.147 | n/a | 0.554 | 17.239 | n/a | n/a | 0.073 | 4.714 | 0.152 | 0.073 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001d4 | 30.793 | 4.397 | 0.280 | 0.226 | 0.068 | 1.498 | 11.273 | 0.083 | n/a | 0.791 | 12.121 | n/a | n/a | 0.056 | 4.971 | 0.161 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001ce | 29.726 | 4.728 | 0.222 | 0.416 | 0.079 | 1.934 | 9.896 | 0.149 | n/a | 0.254 | 12.003 | n/a | n/a | 0.045 | 5.445 | 0.183 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001df | 29.693 | 6.856 | 0.010 | 0.000 | 1.269 | 0.969 | 2.415 | 0.105 | n/a | 1.505 | 16.470 | n/a | n/a | 0.094 | 8.134 | 0.274 | 0.094 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.495 | 0.968 | 0.000 | 1.777 | 3.898 | 0.006 | 0.000 | 0.843 | 0.937 | 1.856 | 0.044 | n/a | 0.495 | 9.667 | n/a | n/a | 0.051 | 4.625 | 0.274 | 0.051 |
| p99 | 31.189 | 1.951 | 0.000 | 5.017 | 8.104 | 0.016 | 0.000 | 1.269 | 1.535 | 6.045 | 0.108 | n/a | 2.984 | 18.387 | n/a | n/a | 0.102 | 9.066 | 0.376 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b00000000000001fb | 31.189 | 8.104 | 0.012 | 0.000 | 0.950 | 1.069 | 1.856 | 0.108 | n/a | 0.626 | 18.387 | n/a | n/a | 0.077 | 9.066 | 0.291 | 0.077 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001df | 29.693 | 6.856 | 0.010 | 0.000 | 1.269 | 0.969 | 2.415 | 0.105 | n/a | 1.505 | 16.470 | n/a | n/a | 0.094 | 8.134 | 0.274 | 0.094 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001d8 | 23.775 | 5.186 | 0.011 | 0.000 | 0.383 | 1.332 | 6.045 | 0.053 | n/a | 0.238 | 10.439 | n/a | n/a | 0.089 | 5.580 | 0.235 | 0.089 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001cf | 23.647 | 4.681 | 0.006 | 0.000 | 0.987 | 0.778 | 2.568 | 0.043 | n/a | 0.281 | 14.257 | n/a | n/a | 0.047 | 5.674 | 0.240 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001cb | 22.540 | 3.322 | 0.006 | 0.000 | 0.568 | 0.996 | 2.248 | 0.082 | n/a | 1.607 | 13.662 | n/a | n/a | 0.048 | 3.896 | 0.173 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001e6 | 21.870 | 5.933 | 0.016 | 0.000 | 0.999 | 1.535 | 1.949 | 0.094 | n/a | 0.489 | 10.771 | n/a | n/a | 0.084 | 6.948 | 0.318 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000200 | 21.462 | 3.898 | 0.006 | 0.000 | 0.329 | 0.988 | 1.068 | 0.037 | n/a | 0.207 | 14.844 | n/a | n/a | 0.084 | 4.233 | 0.197 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001f2 | 19.495 | 4.900 | 0.009 | 0.000 | 0.912 | 0.942 | 2.512 | 0.044 | n/a | 0.516 | 9.558 | n/a | n/a | 0.102 | 5.821 | 0.299 | 0.102 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001e2 | 16.493 | 3.465 | 0.006 | 0.000 | 0.843 | 0.713 | 1.224 | 0.035 | n/a | 0.495 | 9.667 | n/a | n/a | 0.045 | 4.314 | 0.262 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000204 | 16.222 | 3.634 | 0.006 | 0.000 | 0.396 | 0.855 | 1.485 | 0.063 | n/a | 0.923 | 8.818 | n/a | n/a | 0.043 | 4.035 | 0.249 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000208 | 15.895 | 4.076 | 0.009 | 0.000 | 0.633 | 0.937 | 1.492 | 0.036 | n/a | 2.984 | 5.660 | n/a | n/a | 0.068 | 4.718 | 0.297 | 0.068 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000020e | 15.439 | 3.150 | 0.005 | 0.000 | 0.801 | 0.514 | 2.574 | 0.035 | n/a | 0.226 | 8.093 | n/a | n/a | 0.041 | 3.956 | 0.256 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001e4 | 12.333 | 3.756 | 0.005 | 0.000 | 0.865 | 0.807 | 1.023 | 0.037 | n/a | 0.258 | 5.532 | n/a | n/a | 0.051 | 4.625 | 0.375 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000001c9 | 12.012 | 3.315 | 0.005 | 0.000 | 1.194 | 0.791 | 1.170 | 0.042 | n/a | 0.215 | 5.236 | n/a | n/a | 0.045 | 4.514 | 0.376 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000218 | 11.982 | 3.409 | 0.006 | 0.000 | 0.730 | 0.840 | 1.116 | 0.051 | n/a | 0.591 | 5.197 | n/a | n/a | 0.042 | 4.145 | 0.346 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.558 | 0.895 | 0.000 | 1.660 | 4.760 | 0.010 | 0.000 | 0.269 | 1.390 | 3.296 | 0.048 | n/a | 0.436 | 9.636 | n/a | n/a | 0.059 | 5.549 | 0.255 | 0.059 |
| p99 | 67.322 | 3.977 | 0.638 | 6.034 | 15.105 | 0.573 | 0.000 | 1.351 | 6.555 | 42.119 | 0.254 | n/a | 5.730 | 35.991 | n/a | n/a | 0.115 | 15.648 | 0.492 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b000000000000025d | 67.322 | 7.366 | 0.322 | 0.000 | 0.067 | 1.842 | 42.119 | 0.048 | n/a | 0.397 | 15.094 | n/a | n/a | 0.066 | 7.755 | 0.115 | 0.066 | gw-w/thread-46/gateway.admitted-work | driver.publication 5.084ms |
| da9f0f9b4c43665b0000000000000280 | 61.169 | 5.127 | 0.307 | 0.000 | 0.115 | 1.635 | 17.399 | 0.111 | n/a | 0.412 | 35.991 | n/a | n/a | 0.073 | 5.549 | 0.091 | 0.073 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000023c | 45.225 | 6.622 | 0.573 | 0.000 | 0.013 | 2.482 | 19.214 | 0.088 | n/a | 3.859 | 12.336 | n/a | n/a | 0.039 | 7.207 | 0.159 | 0.039 | gw-w/thread-47/gateway.admitted-work | driver.publication 1.795ms |
| da9f0f9b4c43665b0000000000000255 | 44.785 | 15.105 | 0.421 | 0.000 | 0.123 | 1.768 | 7.993 | 0.254 | n/a | 5.730 | 13.312 | n/a | n/a | 0.079 | 15.648 | 0.349 | 0.079 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000243 | 41.403 | 3.931 | 0.307 | 0.000 | 0.068 | 1.544 | 19.764 | 0.041 | n/a | 0.536 | 15.155 | n/a | n/a | 0.057 | 4.306 | 0.104 | 0.057 | gw-w/thread-46/gateway.admitted-work | none observed |
| da9f0f9b4c43665b0000000000000228 | 41.326 | 5.676 | 0.312 | 0.000 | 0.119 | 2.108 | 11.182 | 0.087 | n/a | 0.680 | 21.075 | n/a | n/a | 0.087 | 6.106 | 0.148 | 0.087 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000026e | 37.737 | 7.008 | 0.381 | 0.000 | 0.070 | 2.000 | 15.048 | 0.073 | n/a | 0.436 | 12.652 | n/a | n/a | 0.069 | 7.459 | 0.198 | 0.069 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000021e | 36.226 | 3.406 | 0.193 | 0.000 | 0.076 | 1.540 | 18.723 | 0.139 | n/a | 0.379 | 11.727 | n/a | n/a | 0.043 | 3.675 | 0.101 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000024b | 36.178 | 4.106 | 0.255 | 0.000 | 0.118 | 1.490 | 15.953 | 0.041 | n/a | 0.273 | 13.882 | n/a | n/a | 0.061 | 4.479 | 0.124 | 0.061 | gw-w/thread-44/gateway.admitted-work | none observed |
| da9f0f9b4c43665b000000000000022f | 35.019 | 3.829 | 0.241 | 0.000 | 0.130 | 1.370 | 7.854 | 0.042 | n/a | 0.415 | 21.076 | n/a | n/a | 0.062 | 4.200 | 0.120 | 0.062 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000256 | 33.697 | 7.608 | 0.006 | 0.000 | 0.991 | 2.094 | 5.213 | 0.052 | n/a | 0.324 | 17.361 | n/a | n/a | 0.049 | 8.604 | 0.255 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000274 | 32.031 | 4.316 | 0.249 | 0.000 | 0.070 | 1.998 | 14.483 | 0.052 | n/a | 0.238 | 10.585 | n/a | n/a | 0.042 | 4.634 | 0.145 | 0.042 | gw-w/thread-41/gateway.admitted-work | none observed |
| da9f0f9b4c43665b0000000000000241 | 31.399 | 4.572 | 0.246 | 0.000 | 0.106 | 1.447 | 7.754 | 0.044 | n/a | 0.257 | 16.912 | n/a | n/a | 0.061 | 4.924 | 0.157 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000022c | 29.705 | 4.534 | 0.006 | 0.000 | 0.393 | 0.688 | 6.075 | 0.089 | n/a | 0.579 | 17.297 | n/a | n/a | 0.044 | 4.933 | 0.166 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000027a | 29.524 | 5.239 | 0.351 | 0.000 | 0.121 | 2.080 | 12.632 | 0.079 | n/a | 0.384 | 8.562 | n/a | n/a | 0.075 | 5.712 | 0.193 | 0.075 | gw-w/thread-48/gateway.admitted-work | none observed |
| da9f0f9b4c43665b0000000000000233 | 28.990 | 4.250 | 0.344 | 0.000 | 0.065 | 1.379 | 8.054 | 0.040 | n/a | 0.196 | 14.609 | n/a | n/a | 0.054 | 4.659 | 0.161 | 0.054 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000023f | 28.473 | 5.227 | 0.313 | 0.000 | 0.116 | 1.663 | 9.222 | 0.125 | n/a | 0.515 | 11.216 | n/a | n/a | 0.076 | 5.656 | 0.199 | 0.076 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000245 | 28.231 | 3.523 | 0.004 | 0.000 | 0.198 | 0.470 | 0.790 | 0.020 | n/a | 3.077 | 20.122 | n/a | n/a | 0.027 | 3.725 | 0.132 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.392ms |
| da9f0f9b4c43665b0000000000000223 | 28.124 | 4.991 | 0.006 | 0.000 | 0.584 | 0.892 | 4.962 | 0.042 | n/a | 0.483 | 16.112 | n/a | n/a | 0.053 | 5.581 | 0.198 | 0.053 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000251 | 27.121 | 6.047 | 0.280 | 0.000 | 0.068 | 2.425 | 7.846 | 0.084 | n/a | 0.823 | 9.490 | n/a | n/a | 0.059 | 6.395 | 0.236 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.560 | 1.260 | 0.000 | 1.928 | 4.538 | 0.006 | 0.000 | 0.503 | 0.942 | 1.231 | 0.042 | n/a | 0.504 | 6.497 | n/a | n/a | 0.056 | 5.223 | 0.330 | 0.056 |
| p99 | 28.231 | 2.964 | 0.638 | 3.110 | 6.262 | 0.031 | 0.000 | 1.351 | 5.869 | 7.848 | 0.100 | n/a | 3.077 | 20.122 | n/a | n/a | 0.115 | 6.926 | 0.492 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b0000000000000245 | 28.231 | 3.523 | 0.004 | 0.000 | 0.198 | 0.470 | 0.790 | 0.020 | n/a | 3.077 | 20.122 | n/a | n/a | 0.027 | 3.725 | 0.132 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.392ms |
| da9f0f9b4c43665b0000000000000225 | 26.874 | 4.329 | 0.010 | 0.000 | 1.351 | 3.335 | 7.848 | 0.038 | n/a | 0.220 | 9.682 | n/a | n/a | 0.060 | 5.690 | 0.212 | 0.060 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000022a | 26.030 | 4.086 | 0.010 | 0.000 | 0.862 | 0.985 | 1.034 | 0.034 | n/a | 0.490 | 18.474 | n/a | n/a | 0.055 | 4.958 | 0.190 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000021d | 21.540 | 5.144 | 0.006 | 0.000 | 0.073 | 5.869 | 5.382 | 0.100 | n/a | 0.523 | 4.400 | n/a | n/a | 0.042 | 5.223 | 0.242 | 0.042 | node-14/thread-0/socket.wait-first-byte | none observed |
| da9f0f9b4c43665b0000000000000221 | 20.887 | 5.785 | 0.010 | 0.000 | 0.430 | 2.171 | 1.365 | 0.034 | n/a | 0.601 | 10.447 | n/a | n/a | 0.043 | 6.225 | 0.298 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000264 | 18.774 | 5.892 | 0.006 | 0.000 | 0.503 | 2.112 | 7.360 | 0.050 | n/a | 0.294 | 2.482 | n/a | n/a | 0.076 | 6.401 | 0.341 | 0.076 | node-14/thread-0/driver.execute | none observed |
| da9f0f9b4c43665b000000000000023b | 17.943 | 4.867 | 0.005 | 0.000 | 0.774 | 1.390 | 1.062 | 0.035 | n/a | 0.541 | 9.202 | n/a | n/a | 0.065 | 5.647 | 0.315 | 0.065 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000277 | 17.939 | 4.715 | 0.005 | 0.000 | 0.953 | 0.997 | 1.589 | 0.060 | n/a | 0.296 | 9.269 | n/a | n/a | 0.056 | 5.674 | 0.316 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000231 | 15.560 | 4.538 | 0.005 | 0.000 | 1.082 | 0.921 | 1.574 | 0.071 | n/a | 0.532 | 6.798 | n/a | n/a | 0.039 | 5.625 | 0.362 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000025b | 15.259 | 4.467 | 0.006 | 0.000 | 0.563 | 0.942 | 1.735 | 0.076 | n/a | 0.886 | 6.497 | n/a | n/a | 0.086 | 5.035 | 0.330 | 0.086 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000027e | 14.487 | 5.038 | 0.031 | 0.000 | 0.499 | 0.824 | 2.111 | 0.046 | n/a | 0.504 | 5.361 | n/a | n/a | 0.074 | 5.567 | 0.384 | 0.074 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000271 | 14.067 | 6.262 | 0.011 | 0.000 | 0.652 | 1.006 | 1.094 | 0.045 | n/a | 0.467 | 4.414 | n/a | n/a | 0.115 | 6.926 | 0.492 | 0.115 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000269 | 14.007 | 3.830 | 0.005 | 0.000 | 0.150 | 0.888 | 1.158 | 0.050 | n/a | 0.233 | 7.645 | n/a | n/a | 0.047 | 3.985 | 0.285 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000027b | 13.084 | 4.278 | 0.010 | 0.000 | 0.269 | 0.807 | 1.219 | 0.036 | n/a | 0.206 | 6.187 | n/a | n/a | 0.072 | 4.557 | 0.348 | 0.072 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000259 | 11.589 | 4.578 | 0.007 | 0.000 | 0.114 | 0.707 | 1.231 | 0.042 | n/a | 0.674 | 4.189 | n/a | n/a | 0.048 | 4.699 | 0.405 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000260 | 11.034 | 3.968 | 0.006 | 0.000 | 0.979 | 0.851 | 0.982 | 0.035 | n/a | 0.256 | 3.883 | n/a | n/a | 0.073 | 4.953 | 0.449 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000024f | 8.244 | 2.832 | 0.005 | 0.000 | 0.077 | 0.587 | 0.849 | 0.036 | n/a | 0.507 | 3.317 | n/a | n/a | 0.034 | 2.914 | 0.353 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.613 | 0.611 | 0.000 | 1.374 | 5.141 | 0.014 | 0.000 | 0.223 | 1.155 | 3.374 | 0.048 | n/a | 0.379 | 10.087 | n/a | n/a | 0.060 | 5.648 | 0.232 | 0.060 |
| p99 | 59.596 | 2.980 | 0.100 | 5.255 | 8.902 | n/a | 0.000 | 2.566 | 2.997 | 36.954 | 3.052 | n/a | 3.805 | 22.915 | n/a | n/a | 0.162 | 9.434 | 0.440 | 0.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b0000000000000297 | 59.596 | 4.059 | 0.208 | 0.000 | 0.072 | 1.241 | 36.954 | 0.063 | n/a | 0.530 | 16.425 | n/a | n/a | 0.044 | 4.340 | 0.073 | 0.044 | gw-w/thread-41/gateway.admitted-work | none observed |
| da9f0f9b4c43665b000000000000028f | 42.066 | 5.141 | 0.356 | 0.000 | 0.353 | 2.512 | 10.163 | 3.052 | n/a | 0.419 | 19.907 | n/a | n/a | 0.162 | 5.850 | 0.139 | 0.162 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002d2 | 41.970 | 6.671 | 0.569 | 0.000 | 0.126 | 1.967 | 14.155 | 0.050 | n/a | 0.800 | 17.520 | n/a | n/a | 0.112 | 7.367 | 0.176 | 0.112 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002a5 | 40.680 | 5.577 | 0.436 | 0.000 | 0.197 | 1.785 | 14.867 | 0.187 | n/a | 3.538 | 13.976 | n/a | n/a | 0.118 | 6.209 | 0.153 | 0.118 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000284 | 38.831 | 3.681 | 0.227 | 0.000 | 0.071 | 1.155 | 10.472 | 0.048 | n/a | 0.216 | 22.915 | n/a | n/a | 0.046 | 3.979 | 0.102 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000288 | 38.785 | 5.342 | 0.230 | 0.000 | 0.075 | 2.134 | 8.480 | 0.074 | n/a | 1.535 | 20.819 | n/a | n/a | 0.094 | 5.648 | 0.146 | 0.094 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002a9 | 38.212 | 5.253 | 0.289 | 0.000 | 0.064 | 2.542 | 18.324 | 0.119 | n/a | 0.466 | 11.110 | n/a | n/a | 0.044 | 5.606 | 0.147 | 0.044 | gw-w/thread-45/gateway.admitted-work | none observed |
| da9f0f9b4c43665b0000000000000295 | 37.710 | 7.628 | 0.487 | 0.000 | 0.087 | 1.919 | 6.479 | 0.047 | n/a | 0.563 | 20.458 | n/a | n/a | 0.043 | 8.202 | 0.218 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002af | 37.404 | 4.422 | 0.345 | 0.000 | 0.072 | 1.698 | 9.855 | 0.045 | n/a | 0.330 | 20.529 | n/a | n/a | 0.109 | 4.839 | 0.129 | 0.109 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002d4 | 34.077 | 4.185 | 0.329 | 0.000 | 0.131 | 0.987 | 5.717 | 0.068 | n/a | 0.263 | 22.311 | n/a | n/a | 0.086 | 4.645 | 0.136 | 0.086 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002b1 | 33.455 | 3.428 | 0.329 | 0.000 | 0.096 | 1.345 | 13.862 | 0.072 | n/a | 0.280 | 13.991 | n/a | n/a | 0.052 | 3.853 | 0.115 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002a1 | 31.146 | 4.933 | 0.335 | 0.000 | 0.084 | 1.676 | 6.836 | 0.043 | n/a | 3.805 | 13.374 | n/a | n/a | 0.060 | 5.352 | 0.172 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002bd | 30.934 | 5.838 | 0.551 | 0.000 | 0.077 | 1.911 | 5.248 | 0.042 | n/a | 0.446 | 16.780 | n/a | n/a | 0.041 | 6.465 | 0.209 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002b5 | 29.014 | 5.435 | 0.255 | 0.000 | 0.223 | 2.145 | 13.234 | 0.084 | n/a | 1.277 | 6.274 | n/a | n/a | 0.087 | 5.913 | 0.204 | 0.087 | gw-w/thread-46/gateway.admitted-work | none observed |
| da9f0f9b4c43665b00000000000002c7 | 28.602 | 4.043 | 0.336 | 0.000 | 0.093 | 1.312 | 9.421 | 0.066 | n/a | 0.301 | 12.948 | n/a | n/a | 0.082 | 4.472 | 0.156 | 0.082 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002bb | 27.536 | 4.362 | 0.452 | 0.000 | 0.020 | 1.934 | 6.224 | 0.053 | n/a | 0.261 | 14.184 | n/a | n/a | 0.046 | 4.834 | 0.176 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000028a | 26.689 | 8.902 | 0.006 | 0.000 | 0.526 | 1.005 | 1.412 | 0.038 | n/a | 0.239 | 14.456 | n/a | n/a | 0.104 | 9.434 | 0.353 | 0.104 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002ce | 26.625 | 4.390 | 0.268 | 0.000 | 0.069 | 1.102 | 7.152 | 0.043 | n/a | 0.242 | 13.293 | n/a | n/a | 0.068 | 4.726 | 0.178 | 0.068 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000029d | 24.489 | 5.266 | 0.301 | 0.000 | 0.111 | 1.910 | 8.134 | 0.073 | n/a | 0.386 | 8.211 | n/a | n/a | 0.097 | 5.677 | 0.232 | 0.097 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000285 | 23.296 | 6.167 | 0.014 | 0.000 | 1.056 | 1.157 | 1.156 | 0.043 | n/a | 0.602 | 13.003 | n/a | n/a | 0.098 | 7.237 | 0.311 | 0.098 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.551 | 0.741 | 0.000 | 1.864 | 3.534 | 0.007 | 0.000 | 0.574 | 0.846 | 1.647 | 0.042 | n/a | 0.281 | 5.989 | n/a | n/a | 0.051 | 4.520 | 0.308 | 0.051 |
| p99 | 23.202 | 2.822 | 0.100 | 3.854 | 6.699 | n/a | 0.000 | 2.566 | 1.914 | 8.605 | 0.085 | n/a | 1.975 | 13.109 | n/a | n/a | 0.089 | 7.502 | 0.440 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b00000000000002aa | 23.202 | 6.699 | 0.010 | 0.000 | 0.793 | 0.868 | 4.487 | 0.046 | n/a | 0.271 | 9.984 | n/a | n/a | 0.044 | 7.502 | 0.323 | 0.044 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000281 | 22.613 | 4.201 | 0.007 | 0.000 | 2.566 | 0.741 | 1.647 | 0.042 | n/a | 0.219 | 13.109 | n/a | n/a | 0.080 | 6.774 | 0.300 | 0.080 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002b9 | 21.509 | 6.284 | 0.012 | 0.000 | 0.334 | 1.344 | 1.674 | 0.069 | n/a | 0.379 | 11.325 | n/a | n/a | 0.087 | 6.630 | 0.308 | 0.087 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002be | 17.383 | 5.377 | 0.010 | 0.000 | 0.545 | 0.846 | 0.996 | 0.035 | n/a | 0.201 | 9.313 | n/a | n/a | 0.059 | 5.933 | 0.341 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000029a | 16.911 | 2.781 | 0.005 | 0.000 | 0.597 | 0.564 | 3.374 | 0.035 | n/a | 0.214 | 9.299 | n/a | n/a | 0.042 | 3.383 | 0.200 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002b2 | 15.137 | 5.141 | 0.008 | 0.000 | 0.918 | 0.972 | 1.871 | 0.062 | n/a | 0.883 | 5.194 | n/a | n/a | 0.089 | 6.067 | 0.401 | 0.089 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002a2 | 14.988 | 5.857 | 0.010 | 0.000 | 0.214 | 1.134 | 1.045 | 0.058 | n/a | 1.975 | 4.614 | n/a | n/a | 0.081 | 6.081 | 0.406 | 0.081 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002c2 | 14.551 | 3.261 | 0.005 | 0.000 | 0.844 | 0.690 | 1.228 | 0.035 | n/a | 0.453 | 8.000 | n/a | n/a | 0.035 | 4.110 | 0.282 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002b6 | 14.059 | 3.534 | 0.006 | 0.000 | 0.980 | 0.986 | 2.327 | 0.075 | n/a | 0.281 | 5.823 | n/a | n/a | 0.048 | 4.520 | 0.322 | 0.048 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000298 | 14.011 | 5.361 | 0.009 | 0.000 | 0.799 | 0.943 | 1.063 | 0.040 | n/a | 0.443 | 5.288 | n/a | n/a | 0.065 | 6.169 | 0.440 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002c4 | 13.545 | 3.039 | 0.006 | 0.000 | 0.486 | 0.621 | 1.031 | 0.034 | n/a | 0.239 | 8.053 | n/a | n/a | 0.037 | 3.531 | 0.261 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002c8 | 13.494 | 2.588 | n/a | 0.000 | 0.235 | 1.914 | 8.605 | 0.036 | n/a | 0.066 | 0.000 | n/a | n/a | 0.051 | 2.823 | 0.209 | 0.051 | gw-w/thread-45/gateway.admitted-work | none observed |
| da9f0f9b4c43665b0000000000000290 | 11.934 | 3.169 | 0.005 | 0.000 | 0.574 | 0.695 | 1.891 | 0.085 | n/a | 0.720 | 4.750 | n/a | n/a | 0.044 | 3.749 | 0.314 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b000000000000029e | 11.217 | 2.955 | 0.007 | 0.000 | 0.101 | 0.774 | 0.996 | 0.042 | n/a | 0.298 | 5.989 | n/a | n/a | 0.055 | 3.063 | 0.273 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (850 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.710 | 0.873 | 0.000 | 1.862 | 4.073 | 0.005 | 0.000 | 0.832 | 0.918 | 1.288 | 0.038 | n/a | 0.350 | 8.039 | n/a | n/a | 0.039 | 5.230 | 0.307 | 0.039 |
| p99 | 76.856 | 3.123 | 2.292 | 7.084 | 13.113 | 3.277 | 0.000 | 24.294 | 17.262 | 20.408 | 4.615 | n/a | 6.959 | 56.172 | n/a | n/a | 0.105 | 32.654 | 0.736 | 0.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b0000000000000385 | 139.067 | 20.950 | 1.833 | 0.000 | 0.082 | 14.507 | 20.408 | 0.211 | n/a | 21.647 | 59.374 | n/a | n/a | 0.055 | 22.865 | 0.164 | 0.055 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 4.342ms; driver.publication 4.002ms; driver.publication 3.892ms; driver.publication 3.680ms; driver.publication 3.059ms |
| da9f0f9b4c43665b0000000000000354 | 95.722 | 7.731 | 0.009 | 0.000 | 0.429 | 2.509 | 1.293 | 0.039 | n/a | 0.144 | 83.511 | n/a | n/a | 0.056 | 8.169 | 0.085 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 3.594ms; driver.publication 3.148ms; driver.publication 1.628ms; driver.publication 1.423ms; driver.publication 1.199ms |
| da9f0f9b4c43665b00000000000002fe | 92.664 | 3.618 | 2.068 | 0.000 | 0.034 | 6.434 | 39.746 | 0.063 | n/a | 0.569 | 40.101 | n/a | n/a | 0.031 | 5.720 | 0.062 | 0.031 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.835ms; driver.publication 1.413ms; driver.publication 1.240ms; driver.publication 1.221ms |
| da9f0f9b4c43665b0000000000000352 | 87.506 | 6.135 | 0.005 | 0.000 | 0.497 | 2.715 | 1.771 | 0.031 | n/a | 0.167 | 76.152 | n/a | n/a | 0.033 | 6.637 | 0.076 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.148ms; driver.publication 1.423ms; driver.publication 1.119ms |
| da9f0f9b4c43665b00000000000003f0 | 87.083 | 7.542 | 7.994 | 0.000 | 0.036 | 2.582 | 17.354 | 0.044 | n/a | 0.177 | 51.316 | n/a | n/a | 0.039 | 15.572 | 0.179 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 4.474ms; driver.publication 3.768ms; driver.publication 2.817ms; driver.plan-and-encode-command 1.987ms; driver.expected-state.bind-receipt 1.402ms |
| da9f0f9b4c43665b0000000000000351 | 85.487 | 4.780 | 0.003 | 0.000 | 0.417 | 1.708 | 0.986 | 0.023 | n/a | 0.303 | 77.237 | n/a | n/a | 0.030 | 5.200 | 0.061 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.423ms; driver.publication 1.119ms |
| da9f0f9b4c43665b000000000000035a | 79.601 | 4.897 | 0.008 | 0.000 | 35.698 | 10.583 | 5.843 | 0.039 | n/a | 5.524 | 16.971 | n/a | n/a | 0.038 | 40.602 | 0.510 | 0.038 | node-14/thread-0/driver.queue.subject | driver.publication 3.594ms; driver.publication 3.148ms; driver.publication 2.780ms; driver.publication 1.628ms; driver.publication 1.423ms |
| da9f0f9b4c43665b0000000000000353 | 77.951 | 6.006 | 0.005 | 0.000 | 0.711 | 6.930 | 1.109 | 0.040 | n/a | 0.160 | 62.922 | n/a | n/a | 0.067 | 6.722 | 0.086 | 0.067 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 3.148ms; driver.publication 1.628ms; driver.publication 1.423ms; driver.publication 1.119ms |
| da9f0f9b4c43665b0000000000000627 | 76.856 | 5.548 | 0.009 | 0.000 | 0.780 | 9.004 | 21.197 | 14.553 | n/a | 0.622 | 25.102 | n/a | n/a | 0.040 | 6.338 | 0.082 | 0.040 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 3.869ms; driver.publication 1.359ms; driver.publication 1.327ms; driver.publication 1.038ms |
| da9f0f9b4c43665b0000000000000350 | 74.778 | 2.270 | 0.003 | 0.000 | 1.573 | 2.070 | 0.755 | 0.023 | n/a | 0.099 | 67.954 | n/a | n/a | 0.030 | 3.846 | 0.051 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.423ms |
| da9f0f9b4c43665b000000000000034f | 74.165 | 3.579 | 0.008 | 0.000 | 0.757 | 5.184 | 1.395 | 0.055 | n/a | 0.266 | 62.868 | n/a | n/a | 0.052 | 4.344 | 0.059 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000547 | 73.434 | 3.074 | 0.174 | 0.000 | 0.015 | 1.133 | 30.713 | 0.045 | n/a | 0.473 | 37.779 | n/a | n/a | 0.028 | 3.264 | 0.044 | 0.028 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.531ms |
| da9f0f9b4c43665b00000000000002f4 | 72.382 | 5.754 | 0.007 | 0.000 | 2.509 | 37.794 | 1.067 | 0.039 | n/a | 0.218 | 24.947 | n/a | n/a | 0.047 | 8.269 | 0.114 | 0.047 | node-14/thread-0/socket.wait-first-byte | driver.publication 0.863ms |
| da9f0f9b4c43665b0000000000000355 | 72.250 | 3.556 | 0.005 | 0.000 | 1.052 | 4.345 | 11.508 | 0.113 | n/a | 0.807 | 50.824 | n/a | n/a | 0.039 | 4.613 | 0.064 | 0.039 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 3.594ms; driver.publication 3.148ms; driver.publication 1.628ms; driver.publication 1.423ms; driver.publication 1.119ms |
| da9f0f9b4c43665b0000000000000628 | 70.235 | 6.873 | 0.010 | 0.000 | 0.851 | 2.494 | 26.723 | 4.800 | n/a | 0.579 | 27.841 | n/a | n/a | 0.065 | 7.733 | 0.110 | 0.065 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 3.869ms; driver.publication 1.359ms; driver.publication 1.327ms |
| da9f0f9b4c43665b00000000000007de | 70.224 | 5.294 | 2.407 | 0.000 | 0.055 | 1.746 | 23.378 | 0.055 | n/a | 2.129 | 35.115 | n/a | n/a | 0.044 | 7.756 | 0.110 | 0.044 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 3.867ms; driver.publication 2.257ms; driver.publication 1.446ms; driver.publication 1.257ms |
| da9f0f9b4c43665b0000000000000358 | 69.565 | 5.096 | 7.292 | 0.000 | 0.778 | 6.398 | 2.355 | 0.031 | n/a | 0.130 | 47.463 | n/a | n/a | 0.022 | 13.166 | 0.189 | 0.022 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 3.594ms; driver.publication 3.148ms; driver.publication 2.780ms; driver.publication 1.628ms; driver.publication 1.423ms |
| da9f0f9b4c43665b00000000000003f2 | 69.044 | 14.023 | 0.014 | 0.000 | 0.741 | 0.923 | 2.605 | 0.075 | n/a | 9.216 | 41.365 | n/a | n/a | 0.082 | 14.778 | 0.214 | 0.082 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.768ms |
| da9f0f9b4c43665b00000000000002d5 | 68.913 | 6.279 | 0.013 | 0.000 | 0.695 | 0.740 | 1.279 | 0.041 | n/a | 0.286 | 59.481 | n/a | n/a | 0.098 | 6.987 | 0.101 | 0.098 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000356 | 68.469 | 4.562 | 0.010 | 0.000 | 1.101 | 5.300 | 0.887 | 0.070 | n/a | 0.310 | 56.172 | n/a | n/a | 0.058 | 5.672 | 0.083 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 3.594ms; driver.publication 3.148ms; driver.publication 2.780ms; driver.publication 1.628ms; driver.publication 1.423ms |

## P2 / L1024 / commit / 5-10 facts (493 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.019 | 0.727 | 0.000 | 1.658 | 3.579 | 0.004 | 0.000 | 0.878 | 0.916 | 1.099 | 0.039 | n/a | 0.331 | 7.487 | n/a | n/a | 0.039 | 4.727 | 0.299 | 0.039 |
| p99 | 74.165 | 2.529 | 1.870 | 6.649 | 10.617 | 0.576 | 0.000 | 22.202 | 12.709 | 7.454 | 4.814 | n/a | 5.543 | 59.481 | n/a | n/a | 0.109 | 28.123 | 0.736 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b0000000000000351 | 85.487 | 4.780 | 0.003 | 0.000 | 0.417 | 1.708 | 0.986 | 0.023 | n/a | 0.303 | 77.237 | n/a | n/a | 0.030 | 5.200 | 0.061 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.423ms; driver.publication 1.119ms |
| da9f0f9b4c43665b0000000000000353 | 77.951 | 6.006 | 0.005 | 0.000 | 0.711 | 6.930 | 1.109 | 0.040 | n/a | 0.160 | 62.922 | n/a | n/a | 0.067 | 6.722 | 0.086 | 0.067 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 3.148ms; driver.publication 1.628ms; driver.publication 1.423ms; driver.publication 1.119ms |
| da9f0f9b4c43665b0000000000000627 | 76.856 | 5.548 | 0.009 | 0.000 | 0.780 | 9.004 | 21.197 | 14.553 | n/a | 0.622 | 25.102 | n/a | n/a | 0.040 | 6.338 | 0.082 | 0.040 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 3.869ms; driver.publication 1.359ms; driver.publication 1.327ms; driver.publication 1.038ms |
| da9f0f9b4c43665b0000000000000350 | 74.778 | 2.270 | 0.003 | 0.000 | 1.573 | 2.070 | 0.755 | 0.023 | n/a | 0.099 | 67.954 | n/a | n/a | 0.030 | 3.846 | 0.051 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.423ms |
| da9f0f9b4c43665b000000000000034f | 74.165 | 3.579 | 0.008 | 0.000 | 0.757 | 5.184 | 1.395 | 0.055 | n/a | 0.266 | 62.868 | n/a | n/a | 0.052 | 4.344 | 0.059 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002f4 | 72.382 | 5.754 | 0.007 | 0.000 | 2.509 | 37.794 | 1.067 | 0.039 | n/a | 0.218 | 24.947 | n/a | n/a | 0.047 | 8.269 | 0.114 | 0.047 | node-14/thread-0/socket.wait-first-byte | driver.publication 0.863ms |
| da9f0f9b4c43665b0000000000000355 | 72.250 | 3.556 | 0.005 | 0.000 | 1.052 | 4.345 | 11.508 | 0.113 | n/a | 0.807 | 50.824 | n/a | n/a | 0.039 | 4.613 | 0.064 | 0.039 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 3.594ms; driver.publication 3.148ms; driver.publication 1.628ms; driver.publication 1.423ms; driver.publication 1.119ms |
| da9f0f9b4c43665b00000000000002d5 | 68.913 | 6.279 | 0.013 | 0.000 | 0.695 | 0.740 | 1.279 | 0.041 | n/a | 0.286 | 59.481 | n/a | n/a | 0.098 | 6.987 | 0.101 | 0.098 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000356 | 68.469 | 4.562 | 0.010 | 0.000 | 1.101 | 5.300 | 0.887 | 0.070 | n/a | 0.310 | 56.172 | n/a | n/a | 0.058 | 5.672 | 0.083 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 3.594ms; driver.publication 3.148ms; driver.publication 2.780ms; driver.publication 1.628ms; driver.publication 1.423ms |
| da9f0f9b4c43665b0000000000000357 | 61.807 | 3.298 | 0.007 | 0.000 | 0.500 | 9.358 | 1.094 | 0.044 | n/a | 0.579 | 46.886 | n/a | n/a | 0.041 | 3.805 | 0.062 | 0.041 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 3.594ms; driver.publication 3.148ms; driver.publication 2.780ms; driver.publication 1.628ms; driver.publication 1.423ms |
| da9f0f9b4c43665b000000000000036c | 60.422 | 7.720 | 0.004 | 0.000 | 41.322 | 0.604 | 5.014 | 0.081 | n/a | 0.318 | 5.330 | n/a | n/a | 0.029 | 49.046 | 0.812 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication 1.408ms; driver.publication 1.177ms; driver.publication 1.134ms; driver.publication 1.129ms; driver.publication 1.096ms |
| da9f0f9b4c43665b00000000000003f5 | 56.042 | 10.217 | 0.340 | 0.000 | 1.225 | 10.349 | 2.554 | 0.568 | n/a | 0.816 | 29.917 | n/a | n/a | 0.056 | 11.782 | 0.210 | 0.056 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 4.474ms; driver.publication 1.829ms; driver.expected-state.bind-receipt 1.402ms |
| da9f0f9b4c43665b00000000000005f4 | 55.265 | 5.624 | 0.013 | 0.000 | 0.433 | 35.064 | 4.654 | 0.247 | n/a | 0.302 | 8.863 | n/a | n/a | 0.064 | 6.070 | 0.110 | 0.064 | node-14/thread-0/socket.wait-first-byte | none observed |
| da9f0f9b4c43665b0000000000000548 | 55.006 | 4.631 | 0.006 | 0.000 | 1.115 | 4.606 | 5.264 | 0.227 | n/a | 0.288 | 38.818 | n/a | n/a | 0.050 | 5.752 | 0.105 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000002f9 | 54.355 | 6.170 | 16.140 | 0.000 | 0.507 | 2.468 | 2.075 | 1.100 | n/a | 1.370 | 24.500 | n/a | n/a | 0.026 | 22.817 | 0.420 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.877ms; driver.publication 1.954ms; driver.publication 1.641ms; driver.publication 1.584ms; driver.publication 1.240ms |
| da9f0f9b4c43665b00000000000004a1 | 53.882 | 2.606 | 0.003 | 0.000 | 2.132 | 3.907 | 1.486 | 3.680 | n/a | 0.311 | 39.734 | n/a | n/a | 0.023 | 4.741 | 0.088 | 0.023 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.559ms; driver.publication 1.356ms; driver.publication 1.291ms; driver.publication 1.011ms |
| da9f0f9b4c43665b0000000000000466 | 52.437 | 4.055 | 0.056 | 0.000 | 2.115 | 6.160 | 0.935 | 0.688 | n/a | 0.305 | 38.093 | n/a | n/a | 0.030 | 6.225 | 0.119 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.674ms; driver.publication 1.340ms |
| da9f0f9b4c43665b00000000000005d6 | 51.450 | 15.720 | 0.180 | 0.000 | 18.327 | 3.308 | 1.434 | 1.330 | n/a | 0.422 | 10.511 | n/a | n/a | 0.218 | 34.227 | 0.665 | 0.218 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.007ms; driver.publication 1.029ms |
| da9f0f9b4c43665b0000000000000668 | 50.869 | 5.124 | 0.004 | 0.000 | 3.615 | 0.562 | 1.809 | 4.615 | n/a | 0.956 | 34.127 | n/a | n/a | 0.058 | 8.743 | 0.172 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.707ms; driver.expected-state.bind-receipt 2.057ms; driver.publication 1.467ms |
| da9f0f9b4c43665b000000000000030e | 50.777 | 4.282 | 0.008 | 0.000 | 4.119 | 5.854 | 4.878 | 0.079 | n/a | 0.255 | 31.214 | n/a | n/a | 0.088 | 8.409 | 0.166 | 0.088 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.871ms; driver.publication 1.339ms; driver.publication 1.234ms |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.575 | 1.582 | 2.801 | 5.296 | 8.351 | 0.006 | 0.000 | 1.450 | 4.822 | 1.011 | 0.029 | n/a | 0.167 | 15.714 | n/a | n/a | 0.025 | 9.807 | 0.311 | 0.025 |
| p99 | 31.575 | 1.582 | 2.801 | 5.296 | 8.351 | 0.006 | 0.000 | 1.450 | 4.822 | 1.011 | 0.029 | n/a | 0.167 | 15.714 | n/a | n/a | 0.025 | 9.807 | 0.311 | 0.025 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b000000000000096d | 31.575 | 8.351 | 0.006 | 0.000 | 1.450 | 4.822 | 1.011 | 0.029 | n/a | 0.167 | 15.714 | n/a | n/a | 0.025 | 9.807 | 0.311 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (2616 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.740 | 0.746 | 0.000 | 1.661 | 3.670 | 0.005 | 0.000 | 0.730 | 0.750 | 1.083 | 0.030 | n/a | 0.231 | 5.993 | n/a | n/a | 0.034 | 4.682 | 0.341 | 0.034 |
| p99 | 51.256 | 2.851 | 2.859 | 5.943 | 10.629 | 0.584 | 0.000 | 18.490 | 12.910 | 10.762 | 1.870 | n/a | 4.182 | 27.269 | n/a | n/a | 0.095 | 24.162 | 0.715 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b0000000000001d4a | 82.249 | 8.506 | 0.005 | 0.000 | 60.414 | 0.636 | 3.300 | 0.066 | n/a | 1.449 | 7.833 | n/a | n/a | 0.039 | 68.925 | 0.838 | 0.039 | node-14/thread-0/driver.queue.subject | driver.publication 7.202ms; driver.publication 5.103ms; driver.publication 3.851ms; driver.publication 2.168ms; driver.publication 1.028ms |
| da9f0f9b4c43665b0000000000001d4c | 70.851 | 5.957 | 2.046 | 0.000 | 5.830 | 42.686 | 1.267 | 2.291 | n/a | 0.054 | 10.700 | n/a | n/a | 0.018 | 13.833 | 0.195 | 0.018 | node-14/thread-0/socket.wait-first-byte | driver.publication 7.202ms; driver.publication 5.103ms; driver.publication 3.851ms |
| da9f0f9b4c43665b00000000000013e5 | 70.847 | 5.345 | 0.468 | 0.000 | 0.042 | 3.182 | 43.314 | 0.041 | n/a | 0.120 | 18.303 | n/a | n/a | 0.032 | 5.854 | 0.083 | 0.032 | gw-w/thread-48/gateway.admitted-work | driver.publication 2.134ms; driver.publication 1.195ms; driver.publication 1.151ms; driver.publication 1.120ms |
| da9f0f9b4c43665b0000000000001d4b | 69.387 | 12.734 | 1.840 | 0.000 | 5.866 | 36.813 | 3.143 | 0.079 | n/a | 0.365 | 8.514 | n/a | n/a | 0.032 | 20.439 | 0.295 | 0.032 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.103ms; driver.publication 3.851ms |
| da9f0f9b4c43665b0000000000001c0e | 68.639 | 3.575 | 0.006 | 0.000 | 52.417 | 2.207 | 1.389 | 0.045 | n/a | 0.908 | 8.040 | n/a | n/a | 0.052 | 55.999 | 0.816 | 0.052 | node-14/thread-0/driver.queue.subject | driver.publication 2.831ms; driver.publication 1.823ms; driver.publication 1.704ms; driver.publication 1.660ms; driver.publication 1.398ms |
| da9f0f9b4c43665b0000000000001d49 | 65.176 | 13.146 | 0.007 | 0.000 | 10.086 | 31.258 | 1.279 | 0.042 | n/a | 0.170 | 9.151 | n/a | n/a | 0.036 | 23.240 | 0.357 | 0.036 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.975ms; driver.publication 5.103ms |
| da9f0f9b4c43665b00000000000011ab | 62.572 | 3.239 | 0.005 | 0.000 | 50.167 | 0.762 | 0.769 | 0.091 | n/a | 0.515 | 6.983 | n/a | n/a | 0.041 | 53.412 | 0.854 | 0.041 | node-14/thread-0/driver.queue.subject | driver.publication 1.505ms; driver.publication 1.350ms; driver.publication 1.320ms; driver.publication 1.272ms; driver.publication 1.269ms |
| da9f0f9b4c43665b00000000000013e3 | 62.489 | 4.434 | 0.007 | 0.000 | 0.313 | 5.678 | 1.930 | 0.171 | n/a | 1.230 | 48.674 | n/a | n/a | 0.052 | 4.753 | 0.076 | 0.052 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 2.134ms |
| da9f0f9b4c43665b0000000000001d50 | 62.419 | 7.359 | 0.004 | 0.000 | 36.362 | 9.007 | 0.603 | 0.487 | n/a | 0.058 | 8.504 | n/a | n/a | 0.035 | 43.725 | 0.701 | 0.035 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 7.202ms; driver.publication 3.851ms; driver.publication 3.395ms; driver.expected-state.bind-receipt 1.070ms; driver.publication 1.028ms |
| da9f0f9b4c43665b0000000000001d4e | 62.010 | 3.342 | 0.005 | 0.000 | 8.573 | 41.774 | 1.080 | 0.029 | n/a | 1.410 | 5.763 | n/a | n/a | 0.035 | 11.920 | 0.192 | 0.035 | node-14/thread-0/socket.wait-first-byte | driver.publication 7.202ms; driver.publication 5.103ms; driver.publication 3.851ms; driver.publication 1.028ms |
| da9f0f9b4c43665b0000000000001b5f | 59.635 | 4.801 | 0.070 | 0.000 | 0.478 | 0.194 | 0.850 | 1.510 | n/a | 0.052 | 51.658 | n/a | n/a | 0.023 | 5.349 | 0.090 | 0.023 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 2.074ms; driver.publication 1.337ms |
| da9f0f9b4c43665b0000000000001b83 | 58.448 | 9.965 | 0.010 | 0.000 | 0.946 | 2.152 | 1.432 | 0.058 | n/a | 0.499 | 43.312 | n/a | n/a | 0.076 | 10.920 | 0.187 | 0.076 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000989 | 58.083 | 6.323 | 0.004 | 0.000 | 19.952 | 0.908 | 13.754 | 0.047 | n/a | 2.159 | 14.892 | n/a | n/a | 0.043 | 26.279 | 0.452 | 0.043 | node-14/thread-0/driver.queue.subject | driver.publication 4.919ms; driver.publication 1.292ms; driver.publication 1.277ms |
| da9f0f9b4c43665b0000000000000e90 | 57.655 | 6.896 | 0.006 | 0.000 | 14.909 | 28.566 | 0.979 | 0.025 | n/a | 0.119 | 6.131 | n/a | n/a | 0.025 | 21.810 | 0.378 | 0.025 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.392ms; driver.publication 1.661ms; driver.publication 1.252ms |
| da9f0f9b4c43665b0000000000000adf | 56.892 | 5.727 | 0.004 | 0.000 | 32.980 | 0.991 | 1.478 | 0.029 | n/a | 0.948 | 14.705 | n/a | n/a | 0.030 | 38.711 | 0.680 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 1.664ms; client.encode 1.461ms; driver.publication 1.324ms; driver.publication 1.311ms; driver.expected-state.bind-receipt 1.209ms |
| da9f0f9b4c43665b0000000000000e91 | 56.063 | 5.052 | 0.074 | 0.000 | 10.354 | 32.538 | 0.560 | 0.010 | n/a | 0.038 | 7.397 | n/a | n/a | 0.040 | 15.480 | 0.276 | 0.040 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.392ms; driver.publication 4.961ms; driver.publication 1.661ms; driver.publication 1.252ms |
| da9f0f9b4c43665b00000000000015c6 | 55.595 | 5.879 | 0.010 | 0.000 | 39.406 | 0.543 | 0.865 | 0.032 | n/a | 0.576 | 8.250 | n/a | n/a | 0.034 | 45.295 | 0.815 | 0.034 | node-14/thread-0/driver.queue.subject | driver.publication 1.448ms; driver.publication 1.388ms; driver.publication 1.355ms; driver.publication 1.223ms; driver.publication 1.196ms |
| da9f0f9b4c43665b00000000000013e4 | 54.575 | 6.539 | 0.013 | 0.000 | 0.198 | 0.907 | 1.107 | 0.031 | n/a | 3.278 | 42.444 | n/a | n/a | 0.057 | 6.750 | 0.124 | 0.057 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000001aeb | 54.174 | 4.196 | 0.009 | 0.000 | 0.354 | 2.733 | 5.059 | 0.052 | n/a | 0.185 | 41.547 | n/a | n/a | 0.039 | 4.559 | 0.084 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000011a8 | 53.471 | 14.556 | 0.012 | 0.000 | 0.309 | 8.977 | 7.341 | 0.090 | n/a | 4.393 | 17.745 | n/a | n/a | 0.050 | 14.877 | 0.278 | 0.050 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.605ms; driver.publication 1.505ms; driver.publication 1.272ms; driver.publication 1.269ms; driver.publication 1.156ms |

## P2 / tail / commit / 5-10 facts (1554 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.202 | 0.647 | 0.000 | 1.521 | 3.210 | 0.005 | 0.000 | 0.741 | 0.733 | 0.900 | 0.029 | n/a | 0.231 | 5.465 | n/a | n/a | 0.034 | 4.129 | 0.334 | 0.034 |
| p99 | 50.863 | 2.202 | 2.824 | 5.553 | 8.651 | 0.150 | 0.000 | 16.894 | 14.447 | 6.026 | 2.214 | n/a | 3.838 | 26.841 | n/a | n/a | 0.108 | 22.820 | 0.719 | 0.108 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9f0f9b4c43665b0000000000001d4c | 70.851 | 5.957 | 2.046 | 0.000 | 5.830 | 42.686 | 1.267 | 2.291 | n/a | 0.054 | 10.700 | n/a | n/a | 0.018 | 13.833 | 0.195 | 0.018 | node-14/thread-0/socket.wait-first-byte | driver.publication 7.202ms; driver.publication 5.103ms; driver.publication 3.851ms |
| da9f0f9b4c43665b0000000000001d4b | 69.387 | 12.734 | 1.840 | 0.000 | 5.866 | 36.813 | 3.143 | 0.079 | n/a | 0.365 | 8.514 | n/a | n/a | 0.032 | 20.439 | 0.295 | 0.032 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.103ms; driver.publication 3.851ms |
| da9f0f9b4c43665b0000000000001c0e | 68.639 | 3.575 | 0.006 | 0.000 | 52.417 | 2.207 | 1.389 | 0.045 | n/a | 0.908 | 8.040 | n/a | n/a | 0.052 | 55.999 | 0.816 | 0.052 | node-14/thread-0/driver.queue.subject | driver.publication 2.831ms; driver.publication 1.823ms; driver.publication 1.704ms; driver.publication 1.660ms; driver.publication 1.398ms |
| da9f0f9b4c43665b0000000000001d49 | 65.176 | 13.146 | 0.007 | 0.000 | 10.086 | 31.258 | 1.279 | 0.042 | n/a | 0.170 | 9.151 | n/a | n/a | 0.036 | 23.240 | 0.357 | 0.036 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.975ms; driver.publication 5.103ms |
| da9f0f9b4c43665b00000000000011ab | 62.572 | 3.239 | 0.005 | 0.000 | 50.167 | 0.762 | 0.769 | 0.091 | n/a | 0.515 | 6.983 | n/a | n/a | 0.041 | 53.412 | 0.854 | 0.041 | node-14/thread-0/driver.queue.subject | driver.publication 1.505ms; driver.publication 1.350ms; driver.publication 1.320ms; driver.publication 1.272ms; driver.publication 1.269ms |
| da9f0f9b4c43665b00000000000013e3 | 62.489 | 4.434 | 0.007 | 0.000 | 0.313 | 5.678 | 1.930 | 0.171 | n/a | 1.230 | 48.674 | n/a | n/a | 0.052 | 4.753 | 0.076 | 0.052 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 2.134ms |
| da9f0f9b4c43665b0000000000001d50 | 62.419 | 7.359 | 0.004 | 0.000 | 36.362 | 9.007 | 0.603 | 0.487 | n/a | 0.058 | 8.504 | n/a | n/a | 0.035 | 43.725 | 0.701 | 0.035 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 7.202ms; driver.publication 3.851ms; driver.publication 3.395ms; driver.expected-state.bind-receipt 1.070ms; driver.publication 1.028ms |
| da9f0f9b4c43665b0000000000001d4e | 62.010 | 3.342 | 0.005 | 0.000 | 8.573 | 41.774 | 1.080 | 0.029 | n/a | 1.410 | 5.763 | n/a | n/a | 0.035 | 11.920 | 0.192 | 0.035 | node-14/thread-0/socket.wait-first-byte | driver.publication 7.202ms; driver.publication 5.103ms; driver.publication 3.851ms; driver.publication 1.028ms |
| da9f0f9b4c43665b0000000000001b5f | 59.635 | 4.801 | 0.070 | 0.000 | 0.478 | 0.194 | 0.850 | 1.510 | n/a | 0.052 | 51.658 | n/a | n/a | 0.023 | 5.349 | 0.090 | 0.023 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 2.074ms; driver.publication 1.337ms |
| da9f0f9b4c43665b0000000000001b83 | 58.448 | 9.965 | 0.010 | 0.000 | 0.946 | 2.152 | 1.432 | 0.058 | n/a | 0.499 | 43.312 | n/a | n/a | 0.076 | 10.920 | 0.187 | 0.076 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b0000000000000e90 | 57.655 | 6.896 | 0.006 | 0.000 | 14.909 | 28.566 | 0.979 | 0.025 | n/a | 0.119 | 6.131 | n/a | n/a | 0.025 | 21.810 | 0.378 | 0.025 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.392ms; driver.publication 1.661ms; driver.publication 1.252ms |
| da9f0f9b4c43665b0000000000000e91 | 56.063 | 5.052 | 0.074 | 0.000 | 10.354 | 32.538 | 0.560 | 0.010 | n/a | 0.038 | 7.397 | n/a | n/a | 0.040 | 15.480 | 0.276 | 0.040 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.392ms; driver.publication 4.961ms; driver.publication 1.661ms; driver.publication 1.252ms |
| da9f0f9b4c43665b00000000000013e4 | 54.575 | 6.539 | 0.013 | 0.000 | 0.198 | 0.907 | 1.107 | 0.031 | n/a | 3.278 | 42.444 | n/a | n/a | 0.057 | 6.750 | 0.124 | 0.057 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| da9f0f9b4c43665b00000000000011a8 | 53.471 | 14.556 | 0.012 | 0.000 | 0.309 | 8.977 | 7.341 | 0.090 | n/a | 4.393 | 17.745 | n/a | n/a | 0.050 | 14.877 | 0.278 | 0.050 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.605ms; driver.publication 1.505ms; driver.publication 1.272ms; driver.publication 1.269ms; driver.publication 1.156ms |
| da9f0f9b4c43665b0000000000000e8d | 51.100 | 10.922 | 0.003 | 0.000 | 0.360 | 32.545 | 0.760 | 0.027 | n/a | 0.274 | 6.183 | n/a | n/a | 0.026 | 11.285 | 0.221 | 0.026 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.392ms; driver.publication 1.252ms |
| da9f0f9b4c43665b0000000000000e93 | 50.863 | 6.382 | 0.005 | 0.000 | 22.067 | 13.445 | 0.777 | 0.023 | n/a | 0.137 | 7.992 | n/a | n/a | 0.033 | 28.454 | 0.559 | 0.033 | node-14/thread-0/driver.queue.scheduler-late | client.encode 8.154ms; driver.publication 4.961ms; driver.publication 2.090ms; driver.publication 1.661ms |
| da9f0f9b4c43665b0000000000000adc | 49.805 | 3.559 | 0.006 | 0.000 | 38.095 | 0.744 | 0.890 | 0.029 | n/a | 0.429 | 6.019 | n/a | n/a | 0.036 | 41.659 | 0.836 | 0.036 | node-14/thread-0/driver.queue.subject | driver.publication 1.664ms; driver.publication 1.324ms; driver.publication 1.025ms |
| da9f0f9b4c43665b0000000000001aec | 49.482 | 2.270 | 0.005 | 0.000 | 0.648 | 4.123 | 0.965 | 0.040 | n/a | 21.619 | 19.789 | n/a | n/a | 0.023 | 2.923 | 0.059 | 0.023 | gw-w/thread-45/d/transact-async | driver.publication 1.150ms |
| da9f0f9b4c43665b0000000000000ad9 | 49.275 | 3.092 | 0.003 | 0.000 | 5.186 | 22.871 | 0.830 | 4.583 | n/a | 0.033 | 12.650 | n/a | n/a | 0.027 | 8.281 | 0.168 | 0.027 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.025ms |
| da9f0f9b4c43665b0000000000001646 | 48.095 | 14.149 | 0.005 | 0.000 | 0.023 | 15.572 | 2.098 | 0.855 | n/a | 0.511 | 14.867 | n/a | n/a | 0.013 | 14.178 | 0.295 | 0.013 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.192ms; driver.publication 1.166ms; driver.publication 1.077ms; driver.publication 1.015ms; driver.publication 1.015ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.683 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.013 | 200.573 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 |
| p99 | 252.958 | n/a | n/a | n/a | 17.395 | n/a | 2.115 | 0.000 | 10.000 | 236.778 | 0.116 | n/a | 0.189 | 0.000 | n/a | n/a | 43.856 | 17.395 | 0.249 | 43.856 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9642ef8bed5c3880000000000000002 | 252.958 | 5.405 | n/a | 0.000 | 0.000 | 10.000 | 236.778 | 0.116 | n/a | 0.097 | 0.000 | n/a | n/a | 0.563 | 5.405 | 0.021 | 0.563 | gw-r/thread-47/gateway.admitted-work | none observed |
| 0f89cbbd3f7d767a0000000000000005 | 202.852 | 0.000 | n/a | 0.000 | 0.000 | 0.807 | 201.584 | 0.046 | n/a | 0.189 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000007 | 202.784 | 0.000 | n/a | 0.000 | 0.000 | 1.013 | 201.359 | 0.012 | n/a | 0.172 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000006 | 202.348 | 0.000 | n/a | 0.000 | 0.000 | 0.982 | 201.011 | 0.013 | n/a | 0.121 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000f05 | 202.180 | 0.000 | n/a | 0.000 | 0.000 | 1.438 | 200.573 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000f04 | 201.683 | 0.000 | n/a | 0.000 | 0.000 | 0.525 | 200.903 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000f03 | 201.135 | 0.000 | n/a | 0.000 | 0.000 | 0.458 | 200.521 | 0.003 | n/a | 0.030 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000f08 | 69.881 | 17.395 | n/a | 0.000 | 0.000 | 8.854 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.632 | 17.395 | 0.249 | 43.632 | node-14/thread-4/socket.wait-first-byte | none observed |
| 0f89cbbd3f7d767a0000000000000f0a | 68.097 | 14.746 | n/a | 2.115 | 0.000 | 7.379 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.856 | 16.861 | 0.248 | 43.856 | node-14/thread-4/socket.wait-first-byte | none observed |
| 0f89cbbd3f7d767a0000000000000f09 | 64.230 | 15.498 | n/a | 0.000 | 0.000 | 7.269 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.464 | 15.498 | 0.241 | 41.464 | node-14/thread-4/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 827.024 | n/a | n/a | n/a | 0.310 | n/a | 0.000 | 0.000 | 0.813 | 803.869 | 0.013 | n/a | 0.096 | 0.000 | n/a | n/a | 0.246 | 0.310 | 0.000 | 0.246 |
| p99 | 1005.630 | n/a | n/a | n/a | 21.988 | n/a | 0.000 | 0.000 | 2.050 | 1001.396 | 0.013 | n/a | 0.492 | 0.000 | n/a | n/a | 1.368 | 21.988 | 0.027 | 1.368 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9642ef8bed5c38800000000000000a4 | 1005.630 | 0.310 | n/a | 0.000 | 0.000 | 2.050 | 1001.396 | 0.013 | n/a | 0.492 | 0.000 | n/a | n/a | 1.368 | 0.310 | 0.000 | 1.368 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c38800000000000000a5 | 827.024 | 21.988 | n/a | 0.000 | 0.000 | 0.813 | 803.869 | 0.013 | n/a | 0.096 | 0.000 | n/a | n/a | 0.246 | 21.988 | 0.027 | 0.246 | gw-r/thread-46/journal/page | none observed |

## P3 / warmup / internal (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 433.075 | n/a | n/a | n/a | 3.313 | n/a | 0.000 | 0.000 | 0.792 | 428.213 | 0.020 | n/a | 0.096 | 0.000 | n/a | n/a | 0.123 | 3.313 | 0.009 | 0.123 |
| p99 | 1004.869 | n/a | n/a | n/a | 6.191 | n/a | 0.000 | 0.000 | 2.507 | 1001.868 | 0.188 | n/a | 0.326 | 0.000 | n/a | n/a | 42.668 | 6.191 | 0.417 | 42.668 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9642ef8bed5c38800000000000000bc | 1004.869 | 0.146 | n/a | 0.000 | 0.000 | 1.484 | 1001.868 | 0.031 | n/a | 0.228 | 0.000 | n/a | n/a | 1.112 | 0.146 | 0.000 | 1.112 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c38800000000000000b4 | 1003.427 | 0.169 | n/a | 0.000 | 0.000 | 1.147 | 1000.844 | 0.013 | n/a | 0.112 | 0.000 | n/a | n/a | 1.142 | 0.169 | 0.000 | 1.142 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c38800000000000000d1 | 990.929 | 5.355 | n/a | 0.000 | 0.000 | 2.507 | 982.676 | 0.025 | n/a | 0.094 | 0.000 | n/a | n/a | 0.272 | 5.355 | 0.005 | 0.272 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c38800000000000000bb | 978.631 | 2.198 | n/a | 0.000 | 0.000 | 0.843 | 975.158 | 0.020 | n/a | 0.326 | 0.000 | n/a | n/a | 0.085 | 2.198 | 0.002 | 0.085 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c38800000000000000ae | 928.629 | 3.313 | n/a | 0.000 | 0.000 | 0.840 | 924.293 | 0.011 | n/a | 0.084 | 0.000 | n/a | n/a | 0.087 | 3.313 | 0.004 | 0.087 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c38800000000000000b3 | 761.998 | 2.733 | n/a | 0.000 | 0.000 | 1.496 | 757.544 | 0.022 | n/a | 0.108 | 0.000 | n/a | n/a | 0.094 | 2.733 | 0.004 | 0.094 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c38800000000000000ab | 739.906 | 2.913 | n/a | 0.000 | 0.000 | 0.619 | 736.123 | 0.015 | n/a | 0.130 | 0.000 | n/a | n/a | 0.106 | 2.913 | 0.004 | 0.106 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c38800000000000000a8 | 714.157 | 3.572 | n/a | 0.000 | 0.000 | 0.714 | 709.393 | 0.188 | n/a | 0.091 | 0.000 | n/a | n/a | 0.199 | 3.572 | 0.005 | 0.199 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c38800000000000000ca | 695.560 | 6.012 | n/a | 0.000 | 0.000 | 0.875 | 688.380 | 0.016 | n/a | 0.082 | 0.000 | n/a | n/a | 0.194 | 6.012 | 0.009 | 0.194 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c38800000000000000c3 | 687.920 | 5.574 | n/a | 0.000 | 0.000 | 1.180 | 680.903 | 0.016 | n/a | 0.115 | 0.000 | n/a | n/a | 0.133 | 5.574 | 0.008 | 0.133 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c38800000000000000c1 | 682.263 | 2.335 | n/a | 0.000 | 0.000 | 0.653 | 679.131 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.089 | 2.335 | 0.003 | 0.089 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c38800000000000000c7 | 669.216 | 4.366 | n/a | 0.000 | 0.000 | 0.688 | 663.960 | 0.021 | n/a | 0.094 | 0.000 | n/a | n/a | 0.087 | 4.366 | 0.007 | 0.087 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c38800000000000000cc | 562.222 | 3.043 | n/a | 0.000 | 0.000 | 1.213 | 557.773 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.086 | 3.043 | 0.005 | 0.086 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c38800000000000000a6 | 469.371 | 4.078 | n/a | 0.000 | 0.000 | 1.178 | 463.662 | 0.018 | n/a | 0.143 | 0.000 | n/a | n/a | 0.291 | 4.078 | 0.009 | 0.291 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c38800000000000000b7 | 443.788 | 2.974 | n/a | 0.000 | 0.000 | 0.875 | 439.674 | 0.036 | n/a | 0.142 | 0.000 | n/a | n/a | 0.087 | 2.974 | 0.007 | 0.087 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c38800000000000000b9 | 433.075 | 4.022 | n/a | 0.000 | 0.000 | 0.604 | 428.213 | 0.025 | n/a | 0.100 | 0.000 | n/a | n/a | 0.113 | 4.022 | 0.009 | 0.113 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c38800000000000000c6 | 338.807 | 1.815 | n/a | 0.000 | 0.000 | 0.792 | 336.031 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.069 | 1.815 | 0.005 | 0.069 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c38800000000000000c4 | 301.947 | 2.637 | n/a | 0.000 | 0.000 | 0.732 | 298.367 | 0.021 | n/a | 0.115 | 0.000 | n/a | n/a | 0.074 | 2.637 | 0.009 | 0.074 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c38800000000000000c9 | 294.929 | 4.413 | n/a | 0.000 | 0.000 | 0.965 | 289.147 | 0.013 | n/a | 0.096 | 0.000 | n/a | n/a | 0.295 | 4.413 | 0.015 | 0.295 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c38800000000000000a9 | 282.098 | 4.646 | n/a | 0.000 | 0.000 | 0.723 | 276.381 | 0.049 | n/a | 0.110 | 0.000 | n/a | n/a | 0.189 | 4.646 | 0.016 | 0.189 | gw-r/thread-49/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 330.972 | n/a | n/a | n/a | 4.517 | n/a | 0.452 | 0.000 | 0.872 | 326.947 | 0.018 | n/a | 0.074 | 0.000 | n/a | n/a | 0.146 | 4.893 | 0.016 | 0.146 |
| p99 | 1004.524 | n/a | n/a | n/a | 29.750 | n/a | 3.016 | 0.000 | 3.260 | 1001.416 | 1.531 | n/a | 0.159 | 0.000 | n/a | n/a | 39.655 | 30.889 | 0.549 | 39.655 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9642ef8bed5c38800000000000000d2 | 1004.524 | 0.446 | n/a | 0.000 | 0.000 | 1.257 | 1001.396 | 0.033 | n/a | 0.159 | 0.000 | n/a | n/a | 1.233 | 0.446 | 0.000 | 1.233 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c388000000000000010f | 1003.953 | 0.167 | n/a | 0.000 | 0.000 | 1.129 | 1001.416 | 0.011 | n/a | 0.098 | 0.000 | n/a | n/a | 1.132 | 0.167 | 0.000 | 1.132 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c38800000000000000df | 1003.154 | 0.174 | n/a | 0.000 | 0.000 | 0.872 | 1000.877 | 0.016 | n/a | 0.096 | 0.000 | n/a | n/a | 1.119 | 0.174 | 0.000 | 1.119 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c3880000000000000103 | 998.563 | 6.904 | n/a | 0.000 | 0.000 | 1.103 | 990.264 | 0.024 | n/a | 0.122 | 0.000 | n/a | n/a | 0.146 | 6.904 | 0.007 | 0.146 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c38800000000000000da | 993.379 | 2.744 | n/a | 0.000 | 0.000 | 0.604 | 989.777 | 0.044 | n/a | 0.113 | 0.000 | n/a | n/a | 0.099 | 2.744 | 0.003 | 0.099 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c38800000000000000e1 | 982.857 | 3.408 | n/a | 0.000 | 0.000 | 1.093 | 978.112 | 0.010 | n/a | 0.110 | 0.000 | n/a | n/a | 0.124 | 3.408 | 0.003 | 0.124 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c3880000000000000107 | 981.791 | 5.700 | n/a | 0.709 | 0.000 | 0.613 | 974.417 | 0.014 | n/a | 0.089 | 0.000 | n/a | n/a | 0.249 | 6.409 | 0.007 | 0.249 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c38800000000000000db | 976.615 | 4.601 | n/a | 0.000 | 0.000 | 1.113 | 970.673 | 0.028 | n/a | 0.098 | 0.000 | n/a | n/a | 0.101 | 4.601 | 0.005 | 0.101 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c38800000000000000d4 | 971.997 | 4.730 | n/a | 0.000 | 0.000 | 1.788 | 964.053 | 1.102 | n/a | 0.108 | 0.000 | n/a | n/a | 0.215 | 4.730 | 0.005 | 0.215 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c3880000000000000100 | 947.902 | 29.750 | n/a | 1.139 | 0.000 | 0.901 | 915.529 | 0.246 | n/a | 0.088 | 0.000 | n/a | n/a | 0.249 | 30.889 | 0.033 | 0.249 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c38800000000000000e6 | 890.013 | 5.840 | n/a | 0.955 | 0.000 | 0.725 | 882.173 | 0.052 | n/a | 0.081 | 0.000 | n/a | n/a | 0.187 | 6.795 | 0.008 | 0.187 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c38800000000000000e2 | 740.927 | 10.306 | n/a | 3.016 | 0.000 | 1.527 | 725.746 | 0.014 | n/a | 0.073 | 0.000 | n/a | n/a | 0.245 | 13.322 | 0.018 | 0.245 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c3880000000000000104 | 698.259 | 4.250 | n/a | 0.639 | 0.000 | 1.512 | 691.644 | 0.011 | n/a | 0.105 | 0.000 | n/a | n/a | 0.097 | 4.889 | 0.007 | 0.097 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c38800000000000000ea | 585.096 | 14.298 | n/a | 1.123 | 0.000 | 0.762 | 568.613 | 0.014 | n/a | 0.063 | 0.000 | n/a | n/a | 0.224 | 15.421 | 0.026 | 0.224 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c38800000000000000ed | 556.546 | 3.647 | n/a | 0.536 | 0.000 | 2.363 | 549.704 | 0.144 | n/a | 0.069 | 0.000 | n/a | n/a | 0.083 | 4.183 | 0.008 | 0.083 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c38800000000000000de | 517.616 | 3.589 | n/a | 0.000 | 0.000 | 1.072 | 512.539 | 0.013 | n/a | 0.128 | 0.000 | n/a | n/a | 0.275 | 3.589 | 0.007 | 0.275 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c38800000000000000dc | 500.157 | 6.295 | n/a | 0.000 | 0.000 | 0.810 | 491.266 | 1.531 | n/a | 0.083 | 0.000 | n/a | n/a | 0.172 | 6.295 | 0.013 | 0.172 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c38800000000000000ff | 498.826 | 3.780 | n/a | 0.000 | 0.000 | 0.894 | 493.837 | 0.157 | n/a | 0.074 | 0.000 | n/a | n/a | 0.084 | 3.780 | 0.008 | 0.084 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c38800000000000000fd | 496.499 | 5.335 | n/a | 0.909 | 0.000 | 0.503 | 489.543 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.141 | 6.244 | 0.013 | 0.141 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c3880000000000000109 | 472.408 | 10.807 | n/a | 0.555 | 0.000 | 3.260 | 457.371 | 0.225 | n/a | 0.067 | 0.000 | n/a | n/a | 0.123 | 11.362 | 0.024 | 0.123 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 476.450 | n/a | n/a | n/a | 3.941 | n/a | 0.000 | 0.000 | 0.817 | 467.685 | 0.011 | n/a | 0.055 | 0.000 | n/a | n/a | 0.112 | 4.152 | 0.009 | 0.112 |
| p99 | 1004.944 | n/a | n/a | n/a | 10.015 | n/a | 1.000 | 0.000 | 2.933 | 1000.034 | 1.338 | n/a | 0.117 | 0.000 | n/a | n/a | 42.259 | 10.649 | 0.641 | 42.259 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9642ef8bed5c388000000000000011f | 1004.944 | 3.188 | n/a | 0.694 | 0.000 | 0.822 | 1000.034 | 0.013 | n/a | 0.080 | 0.000 | n/a | n/a | 0.112 | 3.883 | 0.004 | 0.112 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c3880000000000000139 | 1003.719 | 3.995 | n/a | 0.000 | 0.000 | 0.729 | 998.660 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.254 | 3.995 | 0.004 | 0.254 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c388000000000000012c | 998.906 | 2.540 | n/a | 0.615 | 0.000 | 0.639 | 994.958 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.101 | 3.155 | 0.003 | 0.101 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c3880000000000000142 | 995.486 | 4.946 | n/a | 0.000 | 0.000 | 1.215 | 988.952 | 0.099 | n/a | 0.095 | 0.000 | n/a | n/a | 0.179 | 4.946 | 0.005 | 0.179 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c3880000000000000128 | 991.646 | 5.834 | n/a | 0.802 | 0.000 | 0.868 | 983.782 | 0.130 | n/a | 0.064 | 0.000 | n/a | n/a | 0.164 | 6.637 | 0.007 | 0.164 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c3880000000000000117 | 988.346 | 2.791 | n/a | 1.000 | 0.000 | 0.867 | 983.493 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.138 | 3.791 | 0.004 | 0.138 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c388000000000000012d | 987.898 | 3.136 | n/a | 0.000 | 0.000 | 0.892 | 983.718 | 0.023 | n/a | 0.046 | 0.000 | n/a | n/a | 0.082 | 3.136 | 0.003 | 0.082 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c3880000000000000149 | 820.786 | 4.406 | n/a | 0.983 | 0.000 | 0.857 | 814.308 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.153 | 5.389 | 0.007 | 0.153 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c3880000000000000134 | 794.649 | 4.424 | n/a | 0.000 | 0.000 | 0.694 | 789.281 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.191 | 4.424 | 0.006 | 0.191 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c3880000000000000126 | 774.084 | 6.244 | n/a | 0.000 | 0.000 | 0.655 | 766.811 | 0.132 | n/a | 0.044 | 0.000 | n/a | n/a | 0.199 | 6.244 | 0.008 | 0.199 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c388000000000000013e | 759.611 | 1.965 | n/a | 0.000 | 0.000 | 0.639 | 756.878 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.074 | 1.965 | 0.003 | 0.074 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c3880000000000000114 | 745.818 | 3.641 | n/a | 0.511 | 0.000 | 1.049 | 740.456 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.101 | 4.152 | 0.006 | 0.101 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c388000000000000012f | 731.771 | 3.271 | n/a | 0.000 | 0.000 | 0.841 | 727.402 | 0.120 | n/a | 0.053 | 0.000 | n/a | n/a | 0.084 | 3.271 | 0.004 | 0.084 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c3880000000000000129 | 660.560 | 4.551 | n/a | 0.000 | 0.000 | 0.795 | 655.071 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.082 | 4.551 | 0.007 | 0.082 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c3880000000000000120 | 642.839 | 4.594 | n/a | 0.000 | 0.000 | 0.851 | 637.242 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.070 | 4.594 | 0.007 | 0.070 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c3880000000000000136 | 590.860 | 3.941 | n/a | 0.000 | 0.000 | 1.093 | 585.677 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.085 | 3.941 | 0.007 | 0.085 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c388000000000000013b | 568.456 | 5.904 | n/a | 0.000 | 0.000 | 0.817 | 561.510 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.163 | 5.904 | 0.010 | 0.163 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c3880000000000000111 | 565.847 | 2.607 | n/a | 0.485 | 0.000 | 0.703 | 561.879 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 0.102 | 3.092 | 0.005 | 0.102 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c3880000000000000143 | 537.811 | 4.711 | n/a | 0.695 | 0.000 | 0.724 | 531.411 | 0.148 | n/a | 0.033 | 0.000 | n/a | n/a | 0.090 | 5.406 | 0.010 | 0.090 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c388000000000000013a | 480.668 | 10.015 | n/a | 0.634 | 0.000 | 1.237 | 468.549 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.146 | 10.649 | 0.022 | 0.146 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / internal (46 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 339.024 | n/a | n/a | n/a | 3.159 | n/a | 0.000 | 0.000 | 0.592 | 333.664 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.149 | 3.159 | 0.012 | 0.149 |
| p99 | 1010.014 | n/a | n/a | n/a | 12.235 | n/a | 1.278 | 0.000 | 3.878 | 1004.538 | 1.871 | n/a | 0.131 | 0.000 | n/a | n/a | 25.794 | 13.513 | 0.718 | 25.794 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9642ef8bed5c3880000000000000177 | 1010.014 | 0.203 | n/a | 0.000 | 0.000 | 3.878 | 1004.538 | 0.085 | n/a | 0.131 | 0.000 | n/a | n/a | 1.178 | 0.203 | 0.000 | 1.178 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c3880000000000000182 | 1005.062 | 4.744 | n/a | 0.000 | 0.000 | 0.492 | 999.566 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.204 | 4.744 | 0.005 | 0.204 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c3880000000000000155 | 1005.024 | 0.207 | n/a | 0.000 | 0.000 | 1.944 | 1001.579 | 0.011 | n/a | 0.098 | 0.000 | n/a | n/a | 1.185 | 0.207 | 0.000 | 1.185 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c3880000000000000166 | 1003.376 | 0.158 | n/a | 0.000 | 0.000 | 0.610 | 1001.389 | 0.006 | n/a | 0.075 | 0.000 | n/a | n/a | 1.138 | 0.158 | 0.000 | 1.138 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c3880000000000000170 | 1002.811 | 0.164 | n/a | 0.000 | 0.000 | 0.635 | 1000.803 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 1.149 | 0.164 | 0.000 | 1.149 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c3880000000000000189 | 1002.758 | 0.211 | n/a | 0.000 | 0.000 | 0.698 | 1000.648 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 1.149 | 0.211 | 0.000 | 1.149 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c3880000000000000188 | 900.949 | 4.781 | n/a | 0.000 | 0.000 | 2.368 | 893.490 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 0.220 | 4.781 | 0.005 | 0.220 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c388000000000000017d | 885.892 | 2.967 | n/a | 0.000 | 0.000 | 0.454 | 882.365 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.063 | 2.967 | 0.003 | 0.063 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c388000000000000015c | 854.356 | 11.012 | n/a | 0.000 | 0.000 | 1.246 | 841.926 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.114 | 11.012 | 0.013 | 0.114 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c3880000000000000186 | 810.657 | 11.003 | n/a | 0.000 | 0.000 | 0.963 | 798.397 | 0.019 | n/a | 0.088 | 0.000 | n/a | n/a | 0.186 | 11.003 | 0.014 | 0.186 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c388000000000000016f | 713.890 | 2.924 | n/a | 0.000 | 0.000 | 0.375 | 710.455 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.102 | 2.924 | 0.004 | 0.102 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c388000000000000018d | 682.023 | 3.728 | n/a | 0.837 | 0.000 | 0.375 | 676.903 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.149 | 4.564 | 0.007 | 0.149 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c388000000000000017a | 678.631 | 2.459 | n/a | 0.000 | 0.000 | 0.525 | 675.540 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.065 | 2.459 | 0.004 | 0.065 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c3880000000000000180 | 671.393 | 2.974 | n/a | 0.000 | 0.000 | 0.474 | 667.762 | 0.011 | n/a | 0.052 | 0.000 | n/a | n/a | 0.120 | 2.974 | 0.004 | 0.120 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c3880000000000000157 | 640.737 | 2.049 | n/a | 0.000 | 0.000 | 0.412 | 636.285 | 1.871 | n/a | 0.038 | 0.000 | n/a | n/a | 0.083 | 2.049 | 0.003 | 0.083 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c3880000000000000173 | 627.229 | 5.715 | n/a | 0.000 | 0.000 | 0.665 | 620.159 | 0.378 | n/a | 0.060 | 0.000 | n/a | n/a | 0.251 | 5.715 | 0.009 | 0.251 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c3880000000000000169 | 514.937 | 2.769 | n/a | 0.000 | 0.000 | 0.599 | 511.425 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.079 | 2.769 | 0.005 | 0.079 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c3880000000000000150 | 500.907 | 1.916 | n/a | 0.000 | 0.000 | 0.602 | 498.112 | 0.117 | n/a | 0.064 | 0.000 | n/a | n/a | 0.097 | 1.916 | 0.004 | 0.097 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c3880000000000000153 | 486.936 | 6.178 | n/a | 0.000 | 0.000 | 0.799 | 479.625 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.287 | 6.178 | 0.013 | 0.287 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c3880000000000000168 | 458.460 | 6.745 | n/a | 0.000 | 0.000 | 0.557 | 450.949 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.174 | 6.745 | 0.015 | 0.174 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 315.162 | n/a | n/a | n/a | 3.526 | n/a | 0.000 | 0.000 | 0.621 | 301.489 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.103 | 3.568 | 0.012 | 0.103 |
| p99 | 1004.933 | n/a | n/a | n/a | 14.775 | n/a | 1.408 | 0.000 | 4.463 | 1000.818 | 3.748 | n/a | 0.124 | 0.000 | n/a | n/a | 49.521 | 16.184 | 0.385 | 49.521 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9642ef8bed5c38800000000000001c8 | 1004.933 | 3.756 | n/a | 0.000 | 0.000 | 2.750 | 998.282 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.093 | 3.756 | 0.004 | 0.093 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c38800000000000001a9 | 1004.666 | 5.125 | n/a | 0.000 | 0.000 | 0.698 | 998.615 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.180 | 5.125 | 0.005 | 0.180 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c38800000000000001aa | 1002.977 | 0.193 | n/a | 0.000 | 0.000 | 0.740 | 1000.818 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 1.152 | 0.193 | 0.000 | 1.152 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c388000000000000018e | 1000.263 | 4.053 | n/a | 0.000 | 0.000 | 0.739 | 995.275 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.149 | 4.053 | 0.004 | 0.149 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c38800000000000001c7 | 996.161 | 3.362 | n/a | 0.000 | 0.000 | 0.614 | 992.005 | 0.010 | n/a | 0.036 | 0.000 | n/a | n/a | 0.135 | 3.362 | 0.003 | 0.135 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c38800000000000001a8 | 983.842 | 2.324 | n/a | 0.000 | 0.000 | 0.624 | 980.756 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.065 | 2.324 | 0.002 | 0.065 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c388000000000000019d | 936.783 | 1.591 | n/a | 0.000 | 0.000 | 1.332 | 932.892 | 0.863 | n/a | 0.048 | 0.000 | n/a | n/a | 0.057 | 1.591 | 0.002 | 0.057 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c38800000000000001c5 | 879.926 | 4.234 | n/a | 0.000 | 0.000 | 0.721 | 874.807 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.121 | 4.234 | 0.005 | 0.121 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c38800000000000001a0 | 790.525 | 3.475 | n/a | 0.000 | 0.000 | 0.685 | 786.094 | 0.160 | n/a | 0.034 | 0.000 | n/a | n/a | 0.077 | 3.475 | 0.004 | 0.077 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c38800000000000001b9 | 777.860 | 9.475 | n/a | 0.000 | 0.000 | 0.730 | 767.375 | 0.010 | n/a | 0.042 | 0.000 | n/a | n/a | 0.229 | 9.475 | 0.012 | 0.229 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c38800000000000001d1 | 666.987 | 4.976 | n/a | 0.000 | 0.000 | 0.459 | 661.313 | 0.020 | n/a | 0.124 | 0.000 | n/a | n/a | 0.095 | 4.976 | 0.007 | 0.095 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c38800000000000001d8 | 652.503 | 1.755 | n/a | 0.000 | 0.000 | 0.621 | 649.997 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.087 | 1.755 | 0.003 | 0.087 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c38800000000000001bc | 585.359 | 3.397 | n/a | 0.000 | 0.000 | 0.717 | 580.932 | 0.154 | n/a | 0.056 | 0.000 | n/a | n/a | 0.103 | 3.397 | 0.006 | 0.103 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c388000000000000019b | 569.906 | 2.326 | n/a | 0.000 | 0.000 | 0.431 | 566.863 | 0.173 | n/a | 0.045 | 0.000 | n/a | n/a | 0.068 | 2.326 | 0.004 | 0.068 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c38800000000000001a3 | 550.381 | 3.432 | n/a | 0.000 | 0.000 | 3.601 | 543.104 | 0.128 | n/a | 0.047 | 0.000 | n/a | n/a | 0.070 | 3.432 | 0.006 | 0.070 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c38800000000000001d4 | 545.570 | 4.269 | n/a | 0.000 | 0.000 | 0.465 | 540.687 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.106 | 4.269 | 0.008 | 0.106 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c38800000000000001c9 | 525.948 | 4.264 | n/a | 0.000 | 0.000 | 0.691 | 520.807 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.132 | 4.264 | 0.008 | 0.132 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c38800000000000001b3 | 494.773 | 3.979 | n/a | 0.000 | 0.000 | 0.621 | 490.048 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.066 | 3.979 | 0.008 | 0.066 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c38800000000000001ac | 466.066 | 3.749 | n/a | 0.000 | 0.000 | 0.512 | 461.691 | 0.003 | n/a | 0.035 | 0.000 | n/a | n/a | 0.077 | 3.749 | 0.008 | 0.077 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c38800000000000001a4 | 439.304 | 2.910 | n/a | 0.000 | 0.000 | 0.601 | 435.629 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.125 | 2.910 | 0.007 | 0.125 | gw-r/thread-45/journal/page | none observed |

## P3 / L256 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 419.355 | n/a | n/a | n/a | 4.021 | n/a | 0.000 | 0.000 | 0.687 | 416.449 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.113 | 4.021 | 0.010 | 0.113 |
| p99 | 1005.809 | n/a | n/a | n/a | 9.375 | n/a | 0.000 | 0.000 | 2.754 | 1001.426 | 2.203 | n/a | 0.111 | 0.000 | n/a | n/a | 47.270 | 9.375 | 0.452 | 47.270 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9642ef8bed5c388000000000000021a | 1005.809 | 0.288 | n/a | 0.000 | 0.000 | 2.754 | 1001.426 | 0.010 | n/a | 0.111 | 0.000 | n/a | n/a | 1.219 | 0.288 | 0.000 | 1.219 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c388000000000000020b | 1005.066 | 4.132 | n/a | 0.000 | 0.000 | 0.774 | 999.863 | 0.146 | n/a | 0.084 | 0.000 | n/a | n/a | 0.067 | 4.132 | 0.004 | 0.067 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c38800000000000001ed | 1003.396 | 0.183 | n/a | 0.000 | 0.000 | 0.708 | 1001.251 | 0.015 | n/a | 0.077 | 0.000 | n/a | n/a | 1.162 | 0.183 | 0.000 | 1.162 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c3880000000000000202 | 995.389 | 3.386 | n/a | 0.000 | 0.000 | 0.891 | 990.909 | 0.012 | n/a | 0.095 | 0.000 | n/a | n/a | 0.095 | 3.386 | 0.003 | 0.095 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c3880000000000000215 | 988.896 | 4.376 | n/a | 0.000 | 0.000 | 0.731 | 983.593 | 0.010 | n/a | 0.087 | 0.000 | n/a | n/a | 0.098 | 4.376 | 0.004 | 0.098 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c3880000000000000219 | 987.081 | 4.898 | n/a | 0.000 | 0.000 | 0.807 | 981.100 | 0.007 | n/a | 0.071 | 0.000 | n/a | n/a | 0.199 | 4.898 | 0.005 | 0.199 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c388000000000000021c | 964.760 | 5.462 | n/a | 0.000 | 0.000 | 0.885 | 957.918 | 0.165 | n/a | 0.080 | 0.000 | n/a | n/a | 0.250 | 5.462 | 0.006 | 0.250 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c38800000000000001fb | 938.598 | 4.844 | n/a | 0.000 | 0.000 | 0.527 | 932.888 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.301 | 4.844 | 0.005 | 0.301 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c3880000000000000216 | 927.455 | 7.103 | n/a | 0.000 | 0.000 | 0.720 | 919.427 | 0.015 | n/a | 0.077 | 0.000 | n/a | n/a | 0.113 | 7.103 | 0.008 | 0.113 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c38800000000000001f8 | 808.576 | 3.618 | n/a | 0.000 | 0.000 | 0.554 | 804.213 | 0.015 | n/a | 0.063 | 0.000 | n/a | n/a | 0.114 | 3.618 | 0.004 | 0.114 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c38800000000000001ec | 769.527 | 4.329 | n/a | 0.000 | 0.000 | 0.454 | 764.547 | 0.019 | n/a | 0.065 | 0.000 | n/a | n/a | 0.112 | 4.329 | 0.006 | 0.112 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c3880000000000000203 | 699.846 | 4.021 | n/a | 0.000 | 0.000 | 0.909 | 694.769 | 0.011 | n/a | 0.037 | 0.000 | n/a | n/a | 0.099 | 4.021 | 0.006 | 0.099 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c3880000000000000206 | 636.096 | 2.261 | n/a | 0.000 | 0.000 | 0.508 | 633.189 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.072 | 2.261 | 0.004 | 0.072 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c38800000000000001f4 | 614.559 | 4.544 | n/a | 0.000 | 0.000 | 0.658 | 609.103 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.184 | 4.544 | 0.007 | 0.184 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c38800000000000001e0 | 613.392 | 3.648 | n/a | 0.000 | 0.000 | 0.604 | 609.029 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.066 | 3.648 | 0.006 | 0.066 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c3880000000000000213 | 599.281 | 3.488 | n/a | 0.000 | 0.000 | 0.687 | 594.927 | 0.020 | n/a | 0.066 | 0.000 | n/a | n/a | 0.094 | 3.488 | 0.006 | 0.094 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c38800000000000001f2 | 576.781 | 5.721 | n/a | 0.000 | 0.000 | 0.838 | 569.955 | 0.016 | n/a | 0.049 | 0.000 | n/a | n/a | 0.202 | 5.721 | 0.010 | 0.202 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c38800000000000001dd | 497.731 | 4.503 | n/a | 0.000 | 0.000 | 0.666 | 492.367 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.113 | 4.503 | 0.009 | 0.113 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c38800000000000001de | 485.413 | 6.432 | n/a | 0.000 | 0.000 | 0.579 | 478.130 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.223 | 6.432 | 0.013 | 0.223 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c38800000000000001e6 | 462.759 | 3.836 | n/a | 0.000 | 0.000 | 0.753 | 455.836 | 2.203 | n/a | 0.052 | 0.000 | n/a | n/a | 0.079 | 3.836 | 0.008 | 0.079 | gw-r/thread-45/journal/page | none observed |

## P3 / L1024 / internal (745 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.072 | n/a | n/a | n/a | 3.463 | n/a | 0.000 | 0.000 | 0.255 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.548 | 3.463 | 0.255 | 8.548 |
| p99 | 222.258 | n/a | n/a | n/a | 15.382 | n/a | 1.099 | 0.000 | 0.839 | 218.397 | 0.129 | n/a | 0.064 | 0.000 | n/a | n/a | 45.730 | 16.075 | 0.812 | 45.730 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9642ef8bed5c3880000000000000228 | 1002.985 | 0.151 | n/a | 0.000 | 0.000 | 0.738 | 1000.889 | 0.008 | n/a | 0.074 | 0.000 | n/a | n/a | 1.125 | 0.151 | 0.000 | 1.125 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c388000000000000021d | 806.675 | 2.376 | n/a | 0.000 | 0.000 | 0.618 | 803.519 | 0.014 | n/a | 0.041 | 0.000 | n/a | n/a | 0.106 | 2.376 | 0.003 | 0.106 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c388000000000000022a | 730.316 | 7.341 | n/a | 0.000 | 0.000 | 0.635 | 722.104 | 0.019 | n/a | 0.058 | 0.000 | n/a | n/a | 0.159 | 7.341 | 0.010 | 0.159 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c3880000000000000225 | 644.919 | 3.018 | n/a | 0.000 | 0.000 | 1.698 | 640.035 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.097 | 3.018 | 0.005 | 0.097 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c3880000000000000220 | 571.884 | 2.377 | n/a | 0.000 | 0.000 | 0.542 | 568.814 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.065 | 2.377 | 0.004 | 0.065 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c3880000000000000226 | 358.457 | 4.065 | n/a | 0.000 | 0.000 | 0.880 | 353.357 | 0.013 | n/a | 0.050 | 0.000 | n/a | n/a | 0.091 | 4.065 | 0.011 | 0.091 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c3880000000000000221 | 249.656 | 2.295 | n/a | 0.000 | 0.000 | 0.448 | 246.663 | 0.120 | n/a | 0.061 | 0.000 | n/a | n/a | 0.069 | 2.295 | 0.009 | 0.069 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c388000000000000021e | 222.258 | 3.165 | n/a | 0.000 | 0.000 | 0.497 | 218.397 | 0.013 | n/a | 0.070 | 0.000 | n/a | n/a | 0.116 | 3.165 | 0.014 | 0.116 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c3880000000000000223 | 147.858 | 3.163 | n/a | 0.000 | 0.000 | 0.592 | 142.968 | 0.968 | n/a | 0.066 | 0.000 | n/a | n/a | 0.101 | 3.163 | 0.021 | 0.101 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c388000000000000030b | 104.727 | 3.620 | n/a | 0.000 | 0.000 | 0.551 | 100.345 | 0.010 | n/a | 0.046 | 0.000 | n/a | n/a | 0.154 | 3.620 | 0.035 | 0.154 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c3880000000000000284 | 99.897 | 3.052 | n/a | 0.000 | 0.000 | 0.610 | 95.990 | 0.129 | n/a | 0.017 | 0.000 | n/a | n/a | 0.099 | 3.052 | 0.031 | 0.099 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c3880000000000000751 | 90.318 | 5.114 | n/a | 0.000 | 0.000 | 0.697 | 84.347 | 0.016 | n/a | 0.009 | 0.000 | n/a | n/a | 0.135 | 5.114 | 0.057 | 0.135 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c38800000000000002ee | 89.304 | 12.608 | n/a | 0.000 | 0.000 | 0.579 | 75.545 | 0.359 | n/a | 0.023 | 0.000 | n/a | n/a | 0.189 | 12.608 | 0.141 | 0.189 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c3880000000000000793 | 86.234 | 2.505 | n/a | 0.000 | 0.000 | 0.443 | 83.064 | 0.090 | n/a | 0.019 | 0.000 | n/a | n/a | 0.114 | 2.505 | 0.029 | 0.114 | gw-r/thread-50/journal/page | none observed |
| f9642ef8bed5c388000000000000046a | 83.196 | 4.526 | n/a | 0.000 | 0.000 | 0.490 | 78.063 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.080 | 4.526 | 0.054 | 0.080 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c38800000000000004ef | 83.045 | 3.615 | n/a | 0.000 | 0.000 | 0.520 | 78.631 | 0.119 | n/a | 0.065 | 0.000 | n/a | n/a | 0.096 | 3.615 | 0.044 | 0.096 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c38800000000000005e7 | 82.977 | 3.932 | n/a | 0.000 | 0.000 | 0.417 | 78.426 | 0.115 | n/a | 0.019 | 0.000 | n/a | n/a | 0.067 | 3.932 | 0.047 | 0.067 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c388000000000000076d | 81.591 | 10.438 | n/a | 1.095 | 0.000 | 0.344 | 69.405 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.269 | 11.533 | 0.141 | 0.269 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c3880000000000000780 | 79.461 | 8.978 | n/a | 0.000 | 0.000 | 0.633 | 69.538 | 0.140 | n/a | 0.024 | 0.000 | n/a | n/a | 0.149 | 8.978 | 0.113 | 0.149 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c388000000000000024b | 78.362 | 7.437 | n/a | 0.000 | 0.000 | 0.587 | 70.094 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.168 | 7.437 | 0.095 | 0.168 | gw-r/thread-43/gateway.admitted-work | none observed |

## P3 / tail / internal (2315 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.416 | n/a | n/a | n/a | 4.061 | n/a | 0.000 | 0.000 | 0.243 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.914 | 4.074 | 0.347 | 5.914 |
| p99 | 331.633 | n/a | n/a | n/a | 16.624 | n/a | 1.831 | 0.000 | 1.045 | 328.610 | 0.117 | n/a | 0.033 | 0.000 | n/a | n/a | 45.463 | 17.206 | 0.836 | 45.463 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9642ef8bed5c3880000000000001ae6 | 1004.616 | 0.094 | n/a | 0.000 | 0.000 | 0.334 | 1003.039 | 0.018 | n/a | 0.039 | 0.000 | n/a | n/a | 1.093 | 0.094 | 0.000 | 1.093 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c3880000000000001ac4 | 1002.265 | 0.173 | n/a | 0.000 | 0.000 | 0.423 | 1000.529 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 1.104 | 0.173 | 0.000 | 1.104 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c3880000000000001aa1 | 1002.183 | 0.115 | n/a | 0.000 | 0.000 | 0.477 | 1000.466 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 1.091 | 0.115 | 0.000 | 1.091 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c3880000000000001aef | 1002.042 | 0.112 | n/a | 0.000 | 0.000 | 0.309 | 1000.500 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 1.088 | 0.112 | 0.000 | 1.088 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c3880000000000001aeb | 999.576 | 3.777 | n/a | 0.000 | 0.000 | 0.556 | 995.136 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.074 | 3.777 | 0.004 | 0.074 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c3880000000000001aab | 999.164 | 2.743 | n/a | 0.000 | 0.000 | 0.372 | 995.929 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.055 | 2.743 | 0.003 | 0.055 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c3880000000000001aa0 | 996.225 | 3.615 | n/a | 0.000 | 0.000 | 0.317 | 991.985 | 0.174 | n/a | 0.060 | 0.000 | n/a | n/a | 0.074 | 3.615 | 0.004 | 0.074 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c3880000000000001ac7 | 898.648 | 2.674 | n/a | 0.000 | 0.000 | 0.488 | 895.394 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.066 | 2.674 | 0.003 | 0.066 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c3880000000000001ab5 | 858.562 | 5.684 | n/a | 0.000 | 0.000 | 0.546 | 852.052 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.250 | 5.684 | 0.007 | 0.250 | gw-r/thread-45/journal/page | none observed |
| f9642ef8bed5c3880000000000001aa6 | 820.554 | 3.433 | n/a | 0.000 | 0.000 | 0.401 | 816.536 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.149 | 3.433 | 0.004 | 0.149 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c3880000000000001aa3 | 733.291 | 10.552 | n/a | 1.969 | 0.000 | 0.471 | 719.888 | 0.015 | n/a | 0.068 | 0.000 | n/a | n/a | 0.327 | 12.522 | 0.017 | 0.327 | gw-r/thread-46/journal/page | none observed |
| f9642ef8bed5c3880000000000001ac0 | 711.909 | 4.112 | n/a | 0.000 | 0.000 | 0.307 | 707.295 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.167 | 4.112 | 0.006 | 0.167 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c3880000000000001abb | 690.310 | 9.906 | n/a | 0.000 | 0.000 | 0.435 | 679.612 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.315 | 9.906 | 0.014 | 0.315 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c3880000000000001ae8 | 644.817 | 2.009 | n/a | 0.000 | 0.000 | 0.307 | 642.323 | 0.068 | n/a | 0.037 | 0.000 | n/a | n/a | 0.073 | 2.009 | 0.003 | 0.073 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c3880000000000001ae0 | 631.824 | 2.444 | n/a | 0.000 | 0.000 | 0.587 | 628.691 | 0.003 | n/a | 0.030 | 0.000 | n/a | n/a | 0.069 | 2.444 | 0.004 | 0.069 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c3880000000000001ad5 | 566.633 | 2.796 | n/a | 0.000 | 0.000 | 0.443 | 563.302 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.061 | 2.796 | 0.005 | 0.061 | gw-r/thread-48/journal/page | none observed |
| f9642ef8bed5c3880000000000001aac | 486.245 | 2.470 | n/a | 0.000 | 0.000 | 0.503 | 483.123 | 0.032 | n/a | 0.033 | 0.000 | n/a | n/a | 0.084 | 2.470 | 0.005 | 0.084 | gw-r/thread-43/journal/page | none observed |
| f9642ef8bed5c3880000000000001ae1 | 474.830 | 2.154 | n/a | 0.000 | 0.000 | 0.436 | 472.043 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.167 | 2.154 | 0.005 | 0.167 | gw-r/thread-49/journal/page | none observed |
| f9642ef8bed5c3880000000000001ac9 | 462.484 | 9.971 | n/a | 0.000 | 0.000 | 2.604 | 449.602 | 0.004 | n/a | 0.018 | 0.000 | n/a | n/a | 0.285 | 9.971 | 0.022 | 0.285 | gw-r/thread-47/journal/page | none observed |
| f9642ef8bed5c3880000000000001ae2 | 456.540 | 4.148 | n/a | 0.000 | 0.000 | 0.509 | 451.664 | 0.080 | n/a | 0.026 | 0.000 | n/a | n/a | 0.113 | 4.148 | 0.009 | 0.113 | gw-r/thread-45/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.104 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.832 | 200.948 | 0.018 | n/a | 0.136 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 206.224 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.152 | 204.259 | 3.592 | n/a | 0.361 | 0.000 | n/a | n/a | 0.588 | 0.000 | 0.000 | 0.588 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f89cbbd3f7d767a0000000000000013 | 206.224 | 0.000 | n/a | 0.000 | 0.000 | 3.152 | 202.499 | 0.017 | n/a | 0.361 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000023 | 205.374 | 0.000 | n/a | 0.000 | 0.000 | 0.861 | 204.259 | 0.015 | n/a | 0.126 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000009 | 204.007 | 0.000 | n/a | 0.000 | 0.000 | 2.536 | 199.388 | 1.441 | n/a | 0.054 | 0.000 | n/a | n/a | 0.588 | 0.000 | 0.000 | 0.588 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000003f | 203.574 | 0.000 | n/a | 0.000 | 0.000 | 1.554 | 201.592 | 0.034 | n/a | 0.172 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000002f | 203.543 | 0.000 | n/a | 0.000 | 0.000 | 0.924 | 202.326 | 0.032 | n/a | 0.126 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000043 | 203.248 | 0.000 | n/a | 0.000 | 0.000 | 0.718 | 202.170 | 0.097 | n/a | 0.174 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000022 | 203.134 | 0.000 | n/a | 0.000 | 0.000 | 1.094 | 201.623 | 0.020 | n/a | 0.179 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000000f | 203.078 | 0.000 | n/a | 0.000 | 0.000 | 1.218 | 201.464 | 0.013 | n/a | 0.203 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000004b | 202.939 | 0.000 | n/a | 0.000 | 0.000 | 0.906 | 201.639 | 0.066 | n/a | 0.221 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000004d | 202.887 | 0.000 | n/a | 0.000 | 0.000 | 0.951 | 201.590 | 0.026 | n/a | 0.192 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000008 | 202.852 | 0.000 | n/a | 0.000 | 0.000 | 1.157 | 201.367 | 0.014 | n/a | 0.190 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000032 | 202.688 | 0.000 | n/a | 0.000 | 0.000 | 1.037 | 201.179 | 0.020 | n/a | 0.172 | 0.000 | n/a | n/a | 0.281 | 0.000 | 0.000 | 0.281 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000000b | 202.657 | 0.000 | n/a | 0.000 | 0.000 | 1.090 | 201.222 | 0.013 | n/a | 0.155 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000042 | 202.638 | 0.000 | n/a | 0.000 | 0.000 | 1.038 | 201.269 | 0.013 | n/a | 0.178 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000000a | 202.635 | 0.000 | n/a | 0.000 | 0.000 | 1.130 | 201.123 | 0.013 | n/a | 0.173 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000000e | 202.605 | 0.000 | n/a | 0.000 | 0.000 | 0.815 | 201.441 | 0.036 | n/a | 0.190 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000047 | 202.583 | 0.000 | n/a | 0.000 | 0.000 | 0.713 | 201.567 | 0.020 | n/a | 0.179 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000021 | 202.573 | 0.000 | n/a | 0.000 | 0.000 | 0.968 | 201.157 | 0.055 | n/a | 0.258 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000038 | 202.567 | 0.000 | n/a | 0.000 | 0.000 | 0.992 | 201.294 | 0.013 | n/a | 0.136 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000004a | 202.559 | 0.000 | n/a | 0.000 | 0.000 | 1.015 | 201.155 | 0.054 | n/a | 0.116 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-49/journal/page | none observed |

## P3 / L1 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.104 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.803 | 200.943 | 0.015 | n/a | 0.108 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 |
| p99 | 208.961 | n/a | n/a | n/a | 0.662 | n/a | 0.000 | 0.000 | 7.767 | 204.699 | 5.467 | n/a | 0.235 | 0.000 | n/a | n/a | 0.313 | 0.662 | 0.009 | 0.313 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f89cbbd3f7d767a000000000000007c | 208.961 | 0.000 | n/a | 0.000 | 0.000 | 7.767 | 200.917 | 0.015 | n/a | 0.123 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000a4 | 205.895 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 204.699 | 0.016 | n/a | 0.108 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000079 | 204.838 | 0.000 | n/a | 0.000 | 0.000 | 1.289 | 203.267 | 0.017 | n/a | 0.128 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000063 | 203.742 | 0.000 | n/a | 0.000 | 0.000 | 1.162 | 202.229 | 0.026 | n/a | 0.193 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000a9 | 202.937 | 0.000 | n/a | 0.000 | 0.000 | 1.278 | 201.349 | 0.015 | n/a | 0.151 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000b9 | 202.913 | 0.000 | n/a | 0.000 | 0.000 | 1.358 | 201.188 | 0.010 | n/a | 0.171 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000008d | 202.904 | 0.000 | n/a | 0.000 | 0.000 | 0.945 | 201.623 | 0.024 | n/a | 0.180 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000b1 | 202.627 | 0.000 | n/a | 0.000 | 0.000 | 0.991 | 201.212 | 0.017 | n/a | 0.142 | 0.000 | n/a | n/a | 0.264 | 0.000 | 0.000 | 0.264 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000aa | 202.593 | 0.000 | n/a | 0.000 | 0.000 | 0.906 | 201.350 | 0.033 | n/a | 0.126 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-43/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000ac | 202.578 | 0.000 | n/a | 0.000 | 0.000 | 0.892 | 201.406 | 0.043 | n/a | 0.140 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-43/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000082 | 202.577 | 0.000 | n/a | 0.000 | 0.000 | 1.242 | 201.001 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000005f | 202.510 | 0.000 | n/a | 0.000 | 0.000 | 1.034 | 201.170 | 0.013 | n/a | 0.139 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000075 | 202.447 | 0.000 | n/a | 0.000 | 0.000 | 1.068 | 201.061 | 0.017 | n/a | 0.117 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000bc | 202.416 | 0.000 | n/a | 0.000 | 0.000 | 0.942 | 201.165 | 0.008 | n/a | 0.131 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000bf | 202.415 | 0.000 | n/a | 0.000 | 0.000 | 0.708 | 201.423 | 0.026 | n/a | 0.151 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-43/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000b8 | 202.414 | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 201.333 | 0.023 | n/a | 0.235 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000008b | 202.402 | 0.000 | n/a | 0.000 | 0.000 | 0.789 | 201.348 | 0.015 | n/a | 0.133 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000060 | 202.362 | 0.000 | n/a | 0.000 | 0.000 | 1.017 | 201.078 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-43/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000c2 | 202.362 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 201.308 | 0.015 | n/a | 0.206 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000006a | 202.359 | 0.000 | n/a | 0.000 | 0.000 | 1.004 | 201.060 | 0.013 | n/a | 0.155 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.738 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 200.804 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 |
| p99 | 205.619 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.464 | 203.849 | 5.333 | n/a | 0.132 | 0.000 | n/a | n/a | 0.313 | 0.000 | 0.000 | 0.313 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f89cbbd3f7d767a00000000000000d9 | 205.619 | 0.000 | n/a | 0.000 | 0.000 | 1.464 | 203.849 | 0.012 | n/a | 0.106 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000127 | 202.798 | 0.000 | n/a | 0.000 | 0.000 | 1.104 | 201.366 | 0.013 | n/a | 0.132 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000010f | 202.745 | 0.000 | n/a | 0.000 | 0.000 | 1.259 | 201.100 | 0.007 | n/a | 0.094 | 0.000 | n/a | n/a | 0.285 | 0.000 | 0.000 | 0.285 | gw-r/thread-43/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000d5 | 202.664 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 201.319 | 0.013 | n/a | 0.100 | 0.000 | n/a | n/a | 0.313 | 0.000 | 0.000 | 0.313 | gw-r/thread-43/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000f3 | 202.638 | 0.000 | n/a | 0.000 | 0.000 | 0.987 | 201.363 | 0.010 | n/a | 0.104 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000ec | 202.631 | 0.000 | n/a | 0.000 | 0.000 | 1.110 | 201.216 | 0.007 | n/a | 0.091 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000121 | 202.615 | 0.000 | n/a | 0.000 | 0.000 | 1.245 | 201.143 | 0.007 | n/a | 0.085 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000120 | 202.593 | 0.000 | n/a | 0.000 | 0.000 | 1.161 | 201.127 | 0.007 | n/a | 0.077 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000011f | 202.577 | 0.000 | n/a | 0.000 | 0.000 | 1.181 | 201.023 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.293 | 0.000 | 0.000 | 0.293 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000e6 | 202.561 | 0.000 | n/a | 0.000 | 0.000 | 0.957 | 201.326 | 0.009 | n/a | 0.100 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000e0 | 202.543 | 0.000 | n/a | 0.000 | 0.000 | 1.042 | 201.198 | 0.011 | n/a | 0.105 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000010d | 202.476 | 0.000 | n/a | 0.000 | 0.000 | 1.112 | 201.056 | 0.008 | n/a | 0.087 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-43/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000f7 | 202.460 | 0.000 | n/a | 0.000 | 0.000 | 0.654 | 201.534 | 0.038 | n/a | 0.105 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000126 | 202.376 | 0.000 | n/a | 0.000 | 0.000 | 0.989 | 201.126 | 0.008 | n/a | 0.084 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000e9 | 202.372 | 0.000 | n/a | 0.000 | 0.000 | 0.990 | 201.139 | 0.017 | n/a | 0.081 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-43/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000100 | 202.297 | 0.000 | n/a | 0.000 | 0.000 | 1.061 | 201.006 | 0.006 | n/a | 0.078 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-43/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000f0 | 202.295 | 0.000 | n/a | 0.000 | 0.000 | 0.771 | 201.271 | 0.010 | n/a | 0.120 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000e2 | 202.289 | 0.000 | n/a | 0.000 | 0.000 | 0.875 | 201.155 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000f2 | 202.267 | 0.000 | n/a | 0.000 | 0.000 | 0.845 | 201.131 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000000d7 | 202.247 | 0.000 | n/a | 0.000 | 0.000 | 0.854 | 201.039 | 0.009 | n/a | 0.105 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-43/journal/page | none observed |

## P3 / L16 / read (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.664 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.672 | 200.811 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 205.843 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.302 | 204.643 | 4.011 | n/a | 0.111 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f89cbbd3f7d767a0000000000000153 | 205.843 | 0.000 | n/a | 0.000 | 0.000 | 0.947 | 204.643 | 0.020 | n/a | 0.103 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000141 | 203.702 | 0.000 | n/a | 0.000 | 0.000 | 1.012 | 202.465 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000013e | 202.929 | 0.000 | n/a | 0.000 | 0.000 | 0.542 | 202.162 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000149 | 202.927 | 0.000 | n/a | 0.000 | 0.000 | 1.302 | 201.272 | 0.007 | n/a | 0.099 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000013f | 202.480 | 0.000 | n/a | 0.000 | 0.000 | 1.056 | 201.169 | 0.007 | n/a | 0.077 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000175 | 202.315 | 0.000 | n/a | 0.000 | 0.000 | 0.868 | 201.149 | 0.009 | n/a | 0.080 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000178 | 202.271 | 0.000 | n/a | 0.000 | 0.000 | 0.947 | 201.092 | 0.018 | n/a | 0.075 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000018c | 202.248 | 0.000 | n/a | 0.000 | 0.000 | 0.997 | 201.022 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000185 | 202.218 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 201.115 | 0.031 | n/a | 0.082 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000017e | 202.203 | 0.000 | n/a | 0.000 | 0.000 | 1.011 | 200.883 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000170 | 202.197 | 0.000 | n/a | 0.000 | 0.000 | 0.888 | 200.990 | 0.020 | n/a | 0.075 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000163 | 202.155 | 0.000 | n/a | 0.000 | 0.000 | 0.815 | 201.052 | 0.016 | n/a | 0.079 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000013c | 202.132 | 0.000 | n/a | 0.000 | 0.000 | 0.774 | 201.110 | 0.010 | n/a | 0.100 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000015f | 202.098 | 0.000 | n/a | 0.000 | 0.000 | 1.005 | 200.873 | 0.005 | n/a | 0.086 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000015b | 202.082 | 0.000 | n/a | 0.000 | 0.000 | 0.724 | 201.153 | 0.020 | n/a | 0.074 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000018a | 202.073 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 201.042 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000171 | 202.069 | 0.000 | n/a | 0.000 | 0.000 | 0.553 | 201.286 | 0.011 | n/a | 0.095 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000148 | 202.062 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 201.113 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000197 | 202.057 | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 201.094 | 0.005 | n/a | 0.075 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000195 | 202.025 | 0.000 | n/a | 0.000 | 0.000 | 0.810 | 200.925 | 0.008 | n/a | 0.078 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / read (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.490 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.646 | 200.712 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 202.950 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.203 | 201.403 | 2.521 | n/a | 0.115 | 0.000 | n/a | n/a | 0.287 | 0.000 | 0.000 | 0.287 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f89cbbd3f7d767a00000000000001df | 204.180 | 0.000 | n/a | 0.000 | 0.000 | 2.160 | 201.631 | 0.016 | n/a | 0.094 | 0.000 | n/a | n/a | 0.280 | 0.000 | 0.000 | 0.280 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000206 | 202.950 | 0.000 | n/a | 0.000 | 0.000 | 1.203 | 201.274 | 0.020 | n/a | 0.168 | 0.000 | n/a | n/a | 0.285 | 0.000 | 0.000 | 0.285 | gw-r/thread-43/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000001ed | 202.583 | 0.000 | n/a | 0.000 | 0.000 | 1.016 | 201.327 | 0.006 | n/a | 0.088 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000201 | 202.487 | 0.000 | n/a | 0.000 | 0.000 | 0.864 | 201.403 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000001a8 | 202.341 | 0.000 | n/a | 0.000 | 0.000 | 1.123 | 201.021 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000001b2 | 202.212 | 0.000 | n/a | 0.000 | 0.000 | 0.810 | 201.126 | 0.014 | n/a | 0.086 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000001e1 | 202.194 | 0.000 | n/a | 0.000 | 0.000 | 0.966 | 200.944 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000001ea | 202.169 | 0.000 | n/a | 0.000 | 0.000 | 1.003 | 200.853 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000001e2 | 202.120 | 0.000 | n/a | 0.000 | 0.000 | 0.564 | 201.296 | 0.039 | n/a | 0.093 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000001d9 | 202.097 | 0.000 | n/a | 0.000 | 0.000 | 1.027 | 200.888 | 0.005 | n/a | 0.062 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000001e9 | 202.044 | 0.000 | n/a | 0.000 | 0.000 | 0.782 | 201.053 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000020b | 202.003 | 0.000 | n/a | 0.000 | 0.000 | 0.604 | 201.152 | 0.013 | n/a | 0.115 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000001bd | 201.984 | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 201.067 | 0.031 | n/a | 0.077 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000001ba | 201.979 | 0.000 | n/a | 0.000 | 0.000 | 0.697 | 201.050 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000001ad | 201.979 | 0.000 | n/a | 0.000 | 0.000 | 0.813 | 200.932 | 0.008 | n/a | 0.074 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000001f4 | 201.966 | 0.000 | n/a | 0.000 | 0.000 | 1.013 | 200.686 | 0.009 | n/a | 0.039 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000001e8 | 201.929 | 0.000 | n/a | 0.000 | 0.000 | 0.902 | 200.716 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000001f7 | 201.927 | 0.000 | n/a | 0.000 | 0.000 | 0.722 | 200.953 | 0.007 | n/a | 0.112 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000001ab | 201.923 | 0.000 | n/a | 0.000 | 0.000 | 1.054 | 200.713 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a00000000000001fa | 201.912 | 0.000 | n/a | 0.000 | 0.000 | 0.631 | 201.068 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-49/journal/page | none observed |

## P3 / L256 / read (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.609 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 200.789 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 203.154 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.494 | 201.793 | 1.079 | n/a | 0.296 | 0.000 | n/a | n/a | 0.474 | 0.000 | 0.000 | 0.474 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f89cbbd3f7d767a000000000000025b | 205.443 | 0.000 | n/a | 0.000 | 0.000 | 4.421 | 200.833 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000023c | 203.154 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 201.793 | 0.009 | n/a | 0.296 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000220 | 203.148 | 0.000 | n/a | 0.000 | 0.000 | 0.620 | 202.271 | 0.010 | n/a | 0.053 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000270 | 202.938 | 0.000 | n/a | 0.000 | 0.000 | 1.231 | 201.369 | 0.008 | n/a | 0.139 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000027d | 202.921 | 0.000 | n/a | 0.000 | 0.000 | 1.485 | 201.083 | 0.022 | n/a | 0.083 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000266 | 202.779 | 0.000 | n/a | 0.000 | 0.000 | 1.171 | 201.269 | 0.013 | n/a | 0.122 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000027b | 202.743 | 0.000 | n/a | 0.000 | 0.000 | 0.661 | 201.748 | 0.021 | n/a | 0.125 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000280 | 202.532 | 0.000 | n/a | 0.000 | 0.000 | 0.844 | 201.336 | 0.009 | n/a | 0.107 | 0.000 | n/a | n/a | 0.237 | 0.000 | 0.000 | 0.237 | gw-r/thread-43/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000021e | 202.423 | 0.000 | n/a | 0.000 | 0.000 | 0.773 | 201.254 | 0.013 | n/a | 0.092 | 0.000 | n/a | n/a | 0.290 | 0.000 | 0.000 | 0.290 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000242 | 202.405 | 0.000 | n/a | 0.000 | 0.000 | 0.913 | 200.830 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.594 | 0.000 | 0.000 | 0.594 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000027f | 202.294 | 0.000 | n/a | 0.000 | 0.000 | 0.641 | 201.413 | 0.025 | n/a | 0.122 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000023b | 202.244 | 0.000 | n/a | 0.000 | 0.000 | 0.635 | 201.317 | 0.032 | n/a | 0.065 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000027a | 202.242 | 0.000 | n/a | 0.000 | 0.000 | 0.937 | 201.030 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000240 | 202.226 | 0.000 | n/a | 0.000 | 0.000 | 0.938 | 201.068 | 0.006 | n/a | 0.079 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000024b | 202.214 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 201.190 | 0.017 | n/a | 0.100 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-43/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000276 | 202.206 | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 201.257 | 0.025 | n/a | 0.108 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000022b | 202.180 | 0.000 | n/a | 0.000 | 0.000 | 0.794 | 201.133 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000027e | 202.156 | 0.000 | n/a | 0.000 | 0.000 | 0.703 | 201.203 | 0.014 | n/a | 0.104 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000258 | 202.151 | 0.000 | n/a | 0.000 | 0.000 | 0.553 | 201.333 | 0.012 | n/a | 0.119 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000022c | 202.133 | 0.000 | n/a | 0.000 | 0.000 | 0.959 | 200.924 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-45/journal/page | none observed |

## P3 / L1024 / read (60 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 75.792 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.634 | 74.204 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 |
| p99 | 208.303 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.396 | 203.569 | 5.415 | n/a | 0.150 | 0.000 | n/a | n/a | 49.816 | 0.000 | 0.000 | 49.816 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f89cbbd3f7d767a0000000000000293 | 208.303 | 0.000 | n/a | 0.000 | 0.000 | 4.396 | 203.569 | 0.013 | n/a | 0.117 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000296 | 203.162 | 0.000 | n/a | 0.000 | 0.000 | 0.841 | 202.025 | 0.032 | n/a | 0.150 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000286 | 202.618 | 0.000 | n/a | 0.000 | 0.000 | 1.036 | 201.283 | 0.013 | n/a | 0.122 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000295 | 202.541 | 0.000 | n/a | 0.000 | 0.000 | 0.445 | 201.883 | 0.011 | n/a | 0.107 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000298 | 202.342 | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 201.394 | 0.010 | n/a | 0.117 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000283 | 202.339 | 0.000 | n/a | 0.000 | 0.000 | 0.734 | 201.318 | 0.012 | n/a | 0.109 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000028e | 202.075 | 0.000 | n/a | 0.000 | 0.000 | 0.782 | 201.038 | 0.007 | n/a | 0.086 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000288 | 202.024 | 0.000 | n/a | 0.000 | 0.000 | 0.706 | 201.065 | 0.013 | n/a | 0.070 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000299 | 202.022 | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 200.930 | 0.007 | n/a | 0.109 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000028f | 202.009 | 0.000 | n/a | 0.000 | 0.000 | 0.913 | 200.859 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000284 | 201.998 | 0.000 | n/a | 0.000 | 0.000 | 0.693 | 201.085 | 0.007 | n/a | 0.085 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-43/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000289 | 201.975 | 0.000 | n/a | 0.000 | 0.000 | 0.771 | 200.987 | 0.008 | n/a | 0.076 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000028b | 201.970 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 201.005 | 0.024 | n/a | 0.095 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000291 | 201.949 | 0.000 | n/a | 0.000 | 0.000 | 0.730 | 200.920 | 0.011 | n/a | 0.093 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000029a | 201.750 | 0.000 | n/a | 0.000 | 0.000 | 0.678 | 200.875 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000294 | 201.613 | 0.000 | n/a | 0.000 | 0.000 | 0.495 | 200.891 | 0.008 | n/a | 0.078 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000282 | 201.506 | 0.000 | n/a | 0.000 | 0.000 | 0.602 | 200.707 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-43/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000290 | 199.334 | 0.000 | n/a | 0.000 | 0.000 | 0.845 | 197.250 | 1.041 | n/a | 0.053 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000285 | 143.401 | 0.000 | n/a | 0.000 | 0.000 | 0.825 | 142.312 | 0.010 | n/a | 0.038 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a000000000000028d | 141.924 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 141.134 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-50/journal/page | none observed |

## P3 / tail / read (218 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 85.812 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.499 | 85.186 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 |
| p99 | 201.984 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.502 | 201.214 | 1.000 | n/a | 0.096 | 0.000 | n/a | n/a | 50.043 | 0.000 | 0.000 | 50.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f89cbbd3f7d767a0000000000000eff | 202.730 | 0.000 | n/a | 0.000 | 0.000 | 1.077 | 201.456 | 0.014 | n/a | 0.077 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-43/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000ea5 | 202.026 | 0.000 | n/a | 0.000 | 0.000 | 0.653 | 201.123 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000ee5 | 201.984 | 0.000 | n/a | 0.000 | 0.000 | 0.706 | 201.070 | 0.008 | n/a | 0.105 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000ef7 | 201.937 | 0.000 | n/a | 0.000 | 0.000 | 0.275 | 201.534 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | gw-r/thread-49/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000eda | 201.932 | 0.000 | n/a | 0.000 | 0.000 | 0.543 | 201.214 | 0.012 | n/a | 0.066 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000e9e | 201.905 | 0.000 | n/a | 0.000 | 0.000 | 0.623 | 201.056 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000eb8 | 201.853 | 0.000 | n/a | 0.000 | 0.000 | 0.759 | 200.932 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000e8d | 201.842 | 0.000 | n/a | 0.000 | 0.000 | 0.631 | 200.982 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000ea7 | 201.826 | 0.000 | n/a | 0.000 | 0.000 | 0.807 | 200.849 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000ef0 | 201.812 | 0.000 | n/a | 0.000 | 0.000 | 0.793 | 200.836 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000eb9 | 201.763 | 0.000 | n/a | 0.000 | 0.000 | 1.043 | 200.598 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000ee9 | 201.761 | 0.000 | n/a | 0.000 | 0.000 | 0.774 | 200.711 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-45/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000ee2 | 201.749 | 0.000 | n/a | 0.000 | 0.000 | 0.548 | 201.015 | 0.004 | n/a | 0.065 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000e94 | 201.726 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 200.889 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-43/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000ef2 | 201.688 | 0.000 | n/a | 0.000 | 0.000 | 0.511 | 201.014 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000ed0 | 201.668 | 0.000 | n/a | 0.000 | 0.000 | 0.420 | 201.082 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-46/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000ea8 | 201.656 | 0.000 | n/a | 0.000 | 0.000 | 0.567 | 200.926 | 0.019 | n/a | 0.039 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-50/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000e97 | 201.626 | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 200.685 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000ee6 | 201.621 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 200.855 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-47/journal/page | none observed |
| 0f89cbbd3f7d767a0000000000000e93 | 201.602 | 0.000 | n/a | 0.000 | 0.000 | 0.522 | 200.902 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-49/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
