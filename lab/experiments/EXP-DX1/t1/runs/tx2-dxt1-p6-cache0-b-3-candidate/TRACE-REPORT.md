# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (93.655 ms, trace `88da82624ad854610000000000000139`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (54.139 ms, trace `88da82624ad85461000000000000013f`); `node-14/thread-0/socket.wait-first-byte` (38.327 ms, trace `88da82624ad854610000000000001649`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (78.332 ms, trace `88da82624ad85461000000000000022d`); `gw-w/thread-45/gateway.admitted-work` (55.785 ms, trace `88da82624ad854610000000000000218`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p6-cache0-b-3-candidate`; source `9ac79685c6286ce7a20f3d06be5556d314817f42`; subjects 10000; tracing full.

Recorders: gateway, node, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 17810925.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 195 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13361.921 | 394.890 | 5.930 | 454 |
| L1 | 0 | 19964.582 | 339.830 | 10.787 | 668 |
| L4 | 0 | 19974.724 | 304.615 | 13.017 | 628 |
| L16 | 0 | 19976.369 | 305.461 | 9.008 | 686 |
| L64 | 0 | 19971.788 | 334.055 | 8.939 | 850 |
| L256 | 0 | 19973.904 | 405.819 | 10.050 | 708 |
| L1024 | 0 | 19994.273 | 3154.123 | 26.496 | 16856 |
| tail | 0 | 64664.587 | 9785.142 | 94.661 | 53062 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 88da82624ad854610000000000000139 | driver.queue.scheduler-dispatch | 0.111 | none | 0 / 32 |
| 88da82624ad854610000000000000139 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 88da82624ad854610000000000000139 waited: []

| 88da82624ad85461000000000000013f | driver.queue.scheduler-dispatch | 0.068 | none | 0 / 32 |
| 88da82624ad85461000000000000013f | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 88da82624ad85461000000000000013f waited: []

| 88da82624ad854610000000000001649 | driver.queue.scheduler-late | 0.403 | none | 1 / 32 |
| 88da82624ad854610000000000001649 | driver.queue.scheduler-dispatch | 0.020 | none | 1 / 32 |

Observed active steps while trace 88da82624ad854610000000000001649 waited: []

| 88da82624ad85461000000000000022d | driver.queue.scheduler-dispatch | 0.093 | none | 0 / 32 |
| 88da82624ad85461000000000000022d | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 88da82624ad85461000000000000022d waited: []

| 88da82624ad854610000000000000218 | driver.queue.scheduler-dispatch | 0.063 | none | 0 / 32 |
| 88da82624ad854610000000000000218 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 88da82624ad854610000000000000218 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.382 | 0.000 | 0.000 | 0.588 | 4.204 | 0.786 | 0.000 | 0.135 | 1.656 | 6.288 | 0.032 | n/a | 0.398 | 9.739 | 3.646 | n/a | 0.036 | 5.106 | 0.177 | 0.036 |
| p99 | 68.047 | 7.827 | 0.000 | 7.671 | 14.240 | n/a | 8.498 | 1.195 | 5.729 | 25.338 | 2.092 | n/a | 3.641 | 28.060 | 10.711 | n/a | 0.179 | 19.849 | 0.389 | 0.179 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad8546100000000000000f4 | 68.047 | 14.240 | 0.601 | 0.000 | 0.181 | 2.066 | 25.338 | 0.124 | n/a | 0.469 | 14.275 | 10.711 | n/a | 0.043 | 15.021 | 0.221 | 0.043 | gw-w/thread-40/gateway.admitted-work | none observed |
| 88da82624ad8546100000000000000f1 | 64.074 | 10.625 | n/a | 8.498 | 0.726 | 3.814 | 2.560 | 0.022 | n/a | 0.101 | 28.060 | 9.490 | n/a | 0.179 | 19.849 | 0.310 | 0.179 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000105 | 42.551 | 4.133 | 0.258 | 1.425 | 0.135 | 1.728 | 12.021 | 0.036 | n/a | 3.641 | 10.411 | 8.718 | n/a | 0.046 | 5.950 | 0.140 | 0.046 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000123 | 40.135 | 5.813 | 0.240 | 0.579 | 0.048 | 1.873 | 14.122 | 0.048 | n/a | 0.429 | 9.923 | 7.039 | n/a | 0.021 | 6.679 | 0.166 | 0.021 | gw-w/thread-46/gateway.admitted-work | none observed |
| 88da82624ad854610000000000000119 | 39.476 | 7.701 | n/a | 3.946 | 0.938 | 1.031 | 1.808 | 0.025 | n/a | 0.631 | 19.241 | 4.101 | n/a | 0.055 | 12.584 | 0.319 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000000f8 | 37.760 | 4.890 | 0.359 | 0.000 | 0.116 | 1.681 | 12.922 | 2.092 | n/a | 1.382 | 12.983 | 1.279 | n/a | 0.054 | 5.366 | 0.142 | 0.054 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000010d | 37.508 | 6.341 | 0.235 | 0.000 | 0.095 | 2.131 | 15.021 | 0.046 | n/a | 0.117 | 9.739 | 3.696 | n/a | 0.087 | 6.671 | 0.178 | 0.087 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000000fc | 36.954 | 4.204 | 0.786 | 0.000 | 0.117 | 1.902 | 13.655 | 0.037 | n/a | 0.113 | 7.988 | 8.105 | n/a | 0.048 | 5.106 | 0.138 | 0.048 | gw-w/thread-43/gateway.admitted-work | none observed |
| 88da82624ad854610000000000000109 | 35.886 | 5.061 | n/a | 3.072 | 1.133 | 1.052 | 6.288 | 0.065 | n/a | 0.148 | 16.430 | 2.611 | n/a | 0.026 | 9.265 | 0.258 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000011b | 34.953 | 3.926 | 0.326 | 0.409 | 0.101 | 1.474 | 11.505 | 0.047 | n/a | 0.098 | 13.600 | 3.431 | n/a | 0.036 | 4.762 | 0.136 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000000fe | 33.694 | 4.910 | 0.222 | 0.000 | 0.088 | 2.634 | 8.954 | 0.039 | n/a | 0.371 | 9.593 | 6.838 | n/a | 0.043 | 5.221 | 0.155 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000107 | 33.450 | 6.318 | 0.200 | 0.000 | 0.076 | 2.213 | 10.693 | 0.032 | n/a | 0.477 | 9.625 | 3.787 | n/a | 0.028 | 6.594 | 0.197 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000010b | 32.997 | 4.430 | n/a | 0.000 | 0.158 | 1.708 | 7.852 | 0.051 | n/a | 3.391 | 11.629 | 3.704 | n/a | 0.072 | 4.589 | 0.139 | 0.072 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000000fa | 31.517 | 4.205 | n/a | 0.000 | 1.026 | 0.941 | 5.540 | 0.070 | n/a | 1.188 | 13.162 | 5.357 | n/a | 0.030 | 5.230 | 0.166 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000111 | 31.382 | 4.710 | 0.320 | 0.000 | 0.202 | 2.712 | 9.360 | 0.031 | n/a | 0.398 | 9.938 | 3.646 | n/a | 0.065 | 5.232 | 0.167 | 0.065 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000127 | 29.911 | 5.264 | 0.191 | 0.000 | 0.065 | 1.656 | 8.962 | 0.032 | n/a | 0.591 | 6.426 | 6.699 | n/a | 0.025 | 5.520 | 0.185 | 0.025 | tx/thread-89/transactor.triplex-function | none observed |
| 88da82624ad854610000000000000121 | 28.633 | 2.982 | n/a | 0.000 | 0.122 | 1.713 | 5.750 | 0.021 | n/a | 0.086 | 9.906 | 8.024 | n/a | 0.029 | 3.104 | 0.108 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000117 | 28.410 | 4.145 | 0.307 | 0.000 | 0.078 | 5.304 | 7.791 | 0.032 | n/a | 0.396 | 6.893 | 3.436 | n/a | 0.027 | 4.530 | 0.159 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000103 | 26.015 | 7.115 | n/a | 1.814 | 1.195 | 0.866 | 2.172 | 0.021 | n/a | 0.390 | 8.338 | 4.058 | n/a | 0.046 | 10.124 | 0.389 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000010f | 24.886 | 4.086 | 0.263 | 0.000 | 0.050 | 5.729 | 3.893 | 0.032 | n/a | 0.708 | 9.490 | 0.615 | n/a | 0.020 | 4.398 | 0.177 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (46 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 76.027 | n/a | n/a | n/a | 41.582 | 1.346 | 2.853 | 0.000 | 8.500 | 2.977 | 0.003 | n/a | 0.009 | 0.000 | n/a | n/a | 0.006 | 50.417 | 0.756 | 0.006 |
| p99 | 253.832 | n/a | n/a | n/a | 91.903 | 178.606 | 12.922 | 0.000 | 127.221 | 44.101 | 7.888 | n/a | 0.048 | 0.000 | n/a | n/a | 0.046 | 211.638 | 1.000 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad854610000000000001992 | 253.832 | 31.311 | 178.606 | 1.721 | 0.000 | 40.974 | 1.204 | 0.004 | n/a | 0.009 | 0.000 | n/a | n/a | 0.004 | 211.638 | 0.834 | 0.004 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.198ms; driver.publication.persist-deferred 1.054ms; driver.expected-state.bind-receipt 1.004ms; driver.publication.persist-deferred 0.943ms; driver.publication.persist-deferred 0.943ms |
| 88da82624ad85461000000000000199b | 213.218 | 46.784 | 77.204 | 4.177 | 0.000 | 82.099 | 2.939 | 0.003 | n/a | 0.007 | 0.000 | n/a | n/a | 0.005 | 128.165 | 0.601 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.198ms; driver.publication.persist-deferred 1.054ms; driver.expected-state.bind-receipt 1.004ms; driver.publication.persist-deferred 0.943ms; driver.publication.persist-deferred 0.927ms |
| 88da82624ad85461000000000000198d | 191.567 | 45.775 | 5.029 | 3.947 | 0.000 | 127.221 | 9.580 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.006 | 54.750 | 0.286 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.198ms; driver.publication.persist-deferred 1.149ms; driver.publication.persist-deferred 1.115ms; driver.publication.persist-deferred 1.054ms; driver.expected-state.bind-receipt 1.004ms |
| 88da82624ad854610000000000001991 | 189.599 | 75.888 | 1.377 | 5.076 | 0.000 | 61.921 | 44.101 | 1.227 | n/a | 0.003 | 0.000 | n/a | n/a | 0.006 | 82.341 | 0.434 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.198ms; driver.publication.persist-deferred 1.054ms; driver.expected-state.bind-receipt 1.004ms; driver.publication.persist-deferred 0.943ms; driver.publication.persist-deferred 0.943ms |
| 88da82624ad85461000000000000199a | 186.721 | 18.942 | 95.361 | 0.000 | 0.000 | 71.372 | 1.035 | 0.002 | n/a | 0.005 | 0.000 | n/a | n/a | 0.004 | 114.304 | 0.612 | 0.004 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.198ms; driver.publication.persist-deferred 1.054ms; driver.expected-state.bind-receipt 1.004ms; driver.publication.persist-deferred 0.943ms; driver.publication.persist-deferred 0.943ms |
| 88da82624ad854610000000000001746 | 134.696 | 56.955 | 0.329 | 7.806 | 0.000 | 58.993 | 2.669 | 7.888 | n/a | 0.048 | 0.000 | n/a | n/a | 0.008 | 65.089 | 0.483 | 0.008 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.142ms; driver.publication.persist-deferred 0.976ms; driver.publication.persist-deferred 0.898ms; driver.publication.persist-deferred 0.851ms; driver.publication.persist-deferred 0.837ms |
| 88da82624ad85461000000000000198f | 125.846 | 14.026 | 0.442 | 0.000 | 0.000 | 110.042 | 0.428 | 0.900 | n/a | 0.005 | 0.000 | n/a | n/a | 0.003 | 14.468 | 0.115 | 0.003 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.115ms; driver.publication.persist-deferred 1.054ms; driver.expected-state.bind-receipt 1.004ms; driver.publication.persist-deferred 0.943ms; driver.publication.persist-deferred 0.943ms |
| 88da82624ad854610000000000001990 | 116.581 | 91.903 | 0.267 | 12.922 | 0.000 | 8.003 | 3.469 | 0.003 | n/a | 0.008 | 0.000 | n/a | n/a | 0.006 | 105.092 | 0.901 | 0.006 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.054ms; driver.expected-state.bind-receipt 1.004ms; driver.publication.persist-deferred 0.943ms; driver.publication.persist-deferred 0.943ms; driver.publication.persist-deferred 0.925ms |
| 88da82624ad8546100000000000009e8 | 111.148 | 41.903 | 1.210 | 3.818 | 0.000 | 45.375 | 12.886 | 5.906 | n/a | 0.045 | 0.000 | n/a | n/a | 0.006 | 46.931 | 0.422 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.099ms; driver.publication.persist-deferred 0.871ms; driver.publication.persist-deferred 0.773ms; driver.publication.persist-deferred 0.604ms |
| 88da82624ad8546100000000000000f2 | 104.490 | 50.626 | 45.496 | 4.752 | 0.000 | 1.311 | 2.210 | 0.014 | n/a | 0.035 | 0.000 | n/a | n/a | 0.046 | 100.875 | 0.965 | 0.046 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.957ms |
| 88da82624ad854610000000000001467 | 102.287 | 39.162 | 50.068 | 2.361 | 0.000 | 5.474 | 5.203 | 0.003 | n/a | 0.010 | 0.000 | n/a | n/a | 0.007 | 91.590 | 0.895 | 0.007 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 0.967ms; driver.publication.persist-deferred 0.966ms; driver.publication.persist-deferred 0.827ms; driver.publication.persist-deferred 0.806ms; driver.publication.persist-deferred 0.793ms |
| 88da82624ad8546100000000000015e6 | 99.935 | 13.848 | 1.438 | 0.000 | 0.000 | 73.985 | 2.988 | 7.655 | n/a | 0.017 | 0.000 | n/a | n/a | 0.005 | 15.285 | 0.153 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 3.900ms; driver.expected-state.bind-receipt 1.493ms; driver.publication.persist-deferred 0.967ms; driver.publication.persist-deferred 0.940ms; driver.publication.persist-deferred 0.860ms |
| 88da82624ad854610000000000000be9 | 94.324 | 35.160 | 0.328 | 2.884 | 0.000 | 50.799 | 5.124 | 0.002 | n/a | 0.014 | 0.000 | n/a | n/a | 0.013 | 38.372 | 0.407 | 0.013 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.152ms; driver.publication.persist-deferred 0.984ms; driver.publication.persist-deferred 0.936ms; driver.publication.persist-deferred 0.900ms |
| 88da82624ad8546100000000000015e8 | 91.392 | 34.760 | 0.270 | 3.151 | 0.000 | 43.979 | 2.379 | 6.839 | n/a | 0.005 | 0.000 | n/a | n/a | 0.010 | 38.180 | 0.418 | 0.010 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 3.900ms; driver.publication.persist-deferred 0.967ms; driver.publication.persist-deferred 0.860ms; driver.publication.persist-deferred 0.781ms; driver.publication.persist-deferred 0.584ms |
| 88da82624ad854610000000000000edf | 89.590 | 57.313 | 0.184 | 5.271 | 0.000 | 11.960 | 12.959 | 1.883 | n/a | 0.016 | 0.000 | n/a | n/a | 0.004 | 62.768 | 0.701 | 0.004 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.329ms; driver.publication.persist-deferred 1.077ms; driver.publication.capture 1.076ms; driver.publication.persist-deferred 1.041ms; driver.publication.persist-deferred 0.901ms |
| 88da82624ad854610000000000001bed | 86.125 | 58.122 | 11.813 | 6.129 | 0.000 | 1.187 | 8.841 | 0.008 | n/a | 0.021 | 0.000 | n/a | n/a | 0.005 | 76.063 | 0.883 | 0.005 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.138ms; driver.publication.persist-deferred 0.961ms; driver.publication.persist-deferred 0.781ms; driver.publication.persist-deferred 0.635ms; driver.publication.persist-deferred 0.617ms |
| 88da82624ad854610000000000001744 | 82.631 | 46.122 | 1.162 | 5.603 | 0.000 | 14.031 | 15.682 | 0.007 | n/a | 0.018 | 0.000 | n/a | n/a | 0.006 | 52.886 | 0.640 | 0.006 | node-14/thread-3/worker.gateway-observer.observe | driver.expected-state.bind-receipt 1.142ms; driver.publication.persist-deferred 0.898ms; driver.publication.persist-deferred 0.851ms; driver.publication.persist-deferred 0.837ms; driver.publication.persist-deferred 0.833ms |
| 88da82624ad854610000000000000bef | 81.078 | 13.088 | 31.719 | 0.000 | 0.000 | 35.113 | 1.140 | 0.003 | n/a | 0.011 | 0.000 | n/a | n/a | 0.004 | 44.807 | 0.553 | 0.004 | node-14/thread-3/socket.queue-and-write | driver.publication.persist-deferred 0.936ms; driver.publication.persist-deferred 0.900ms |
| 88da82624ad854610000000000001462 | 80.558 | 52.550 | 0.464 | 6.609 | 0.000 | 5.100 | 15.801 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.010 | 59.623 | 0.740 | 0.010 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 0.967ms; driver.publication.persist-deferred 0.923ms; driver.publication.persist-deferred 0.827ms; driver.publication.persist-deferred 0.804ms; driver.publication.persist-deferred 0.770ms |
| 88da82624ad854610000000000001d4e | 80.520 | 39.233 | 4.271 | 6.686 | 0.000 | 17.717 | 11.053 | 1.551 | n/a | 0.004 | 0.000 | n/a | n/a | 0.005 | 50.190 | 0.623 | 0.005 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 0.920ms; driver.publication.persist-deferred 0.889ms; driver.publication.persist-deferred 0.745ms; driver.publication.persist-deferred 0.685ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.343 | 0.000 | 0.000 | 0.629 | 2.848 | n/a | 0.000 | 0.395 | 0.805 | 1.697 | 0.023 | n/a | 0.446 | 8.356 | 1.178 | n/a | 0.029 | 3.198 | 0.200 | 0.029 |
| p99 | 31.517 | 2.041 | 0.000 | 2.349 | 4.205 | n/a | 1.513 | 1.026 | 1.713 | 5.750 | 0.070 | n/a | 1.188 | 13.162 | 8.024 | n/a | 0.038 | 5.230 | 0.330 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad8546100000000000000fa | 31.517 | 4.205 | n/a | 0.000 | 1.026 | 0.941 | 5.540 | 0.070 | n/a | 1.188 | 13.162 | 5.357 | n/a | 0.030 | 5.230 | 0.166 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000121 | 28.633 | 2.982 | n/a | 0.000 | 0.122 | 1.713 | 5.750 | 0.021 | n/a | 0.086 | 9.906 | 8.024 | n/a | 0.029 | 3.104 | 0.108 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000000f6 | 23.050 | 3.000 | n/a | 1.513 | 0.101 | 0.727 | 2.101 | 0.026 | n/a | 0.515 | 12.341 | 2.693 | n/a | 0.032 | 4.614 | 0.200 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000115 | 20.876 | 3.781 | n/a | 0.000 | 0.956 | 0.832 | 1.142 | 0.019 | n/a | 0.375 | 10.465 | 3.270 | n/a | 0.038 | 4.737 | 0.227 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000125 | 15.343 | 2.355 | n/a | 0.000 | 0.843 | 1.043 | 2.044 | 0.060 | n/a | 0.856 | 6.939 | 1.178 | n/a | 0.025 | 3.198 | 0.208 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000011d | 14.561 | 2.263 | n/a | 0.000 | 0.271 | 0.805 | 1.697 | 0.035 | n/a | 0.385 | 7.935 | 1.145 | n/a | 0.025 | 2.534 | 0.174 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000000ff | 14.032 | 2.151 | n/a | 0.000 | 0.346 | 0.761 | 1.420 | 0.020 | n/a | 0.446 | 8.356 | 0.497 | n/a | 0.036 | 2.496 | 0.178 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000113 | 11.137 | 2.848 | n/a | 0.000 | 0.827 | 0.516 | 1.086 | 0.023 | n/a | 0.497 | 4.738 | 0.583 | n/a | 0.018 | 3.676 | 0.330 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000128 | 10.546 | 1.792 | n/a | 0.000 | 0.395 | 0.581 | 0.947 | 0.020 | n/a | 0.070 | 6.254 | 0.474 | n/a | 0.013 | 2.187 | 0.207 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.515 | 0.000 | 0.000 | 0.484 | 3.301 | n/a | 0.000 | 8.397 | 2.240 | 1.051 | 0.012 | n/a | 0.406 | 7.950 | 0.809 | n/a | 0.022 | 10.396 | 0.502 | 0.022 |
| p99 | 36.145 | 2.002 | 0.000 | 1.311 | 6.591 | n/a | 0.000 | 16.771 | 2.859 | 11.169 | 0.064 | n/a | 0.670 | 12.122 | 3.532 | n/a | 0.026 | 20.073 | 0.704 | 0.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad85461000000000000012b | 36.145 | 6.591 | 0.179 | 0.000 | 0.058 | 2.240 | 11.169 | 0.064 | n/a | 0.165 | 12.122 | 3.532 | n/a | 0.026 | 6.828 | 0.189 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000960 | 28.515 | 3.301 | n/a | 0.000 | 16.771 | 2.859 | 1.051 | 0.012 | n/a | 0.670 | 3.031 | 0.809 | n/a | 0.011 | 20.073 | 0.704 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.703ms; driver.publication.persist-deferred 1.547ms; driver.publication.persist-deferred 1.193ms; driver.publication.persist-deferred 0.956ms; driver.publication.persist-deferred 0.949ms |
| 88da82624ad85461000000000000095f | 20.707 | 2.000 | n/a | 0.000 | 8.397 | 0.422 | 1.009 | 0.012 | n/a | 0.406 | 7.950 | 0.489 | n/a | 0.022 | 10.396 | 0.502 | 0.022 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 1.703ms; driver.publication.persist-deferred 1.547ms; driver.publication.persist-deferred 0.956ms |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.837 | 0.316 | 0.000 | 0.474 | 3.961 | n/a | 0.000 | 0.133 | 1.265 | 3.394 | 0.032 | n/a | 0.365 | 7.393 | 3.702 | n/a | 0.035 | 5.075 | 0.198 | 0.035 |
| p99 | 130.020 | 3.246 | 0.000 | 2.818 | 10.325 | n/a | 2.091 | 8.212 | 6.102 | 21.748 | 0.089 | n/a | 3.920 | 93.655 | 32.372 | n/a | 0.077 | 12.992 | 0.575 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad854610000000000000139 | 130.020 | 3.125 | 0.226 | 0.000 | 0.114 | 1.265 | 10.314 | 0.040 | n/a | 0.591 | 93.655 | 20.652 | n/a | 0.040 | 3.465 | 0.027 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000013f | 118.702 | 4.935 | 0.238 | 0.592 | 0.070 | 4.145 | 21.748 | 0.051 | n/a | 0.375 | 54.139 | 32.372 | n/a | 0.038 | 5.834 | 0.049 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000134 | 49.365 | 2.396 | n/a | 0.000 | 1.008 | 0.965 | 1.998 | 0.038 | n/a | 0.132 | 35.088 | 7.708 | n/a | 0.032 | 3.404 | 0.069 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000147 | 41.178 | 4.659 | 0.216 | 0.393 | 0.050 | 1.402 | 13.415 | 0.032 | n/a | 3.920 | 13.613 | 3.456 | n/a | 0.023 | 5.318 | 0.129 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000012f | 40.148 | 5.059 | 0.172 | 0.000 | 0.063 | 1.754 | 12.558 | 0.036 | n/a | 0.100 | 15.052 | 5.326 | n/a | 0.029 | 5.294 | 0.132 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000141 | 36.964 | 5.477 | 0.262 | 0.000 | 0.104 | 2.290 | 14.292 | 0.033 | n/a | 0.115 | 7.834 | 6.530 | n/a | 0.028 | 5.843 | 0.158 | 0.028 | gw-w/thread-44/gateway.admitted-work | none observed |
| 88da82624ad854610000000000000143 | 36.339 | 4.310 | 0.259 | 0.492 | 0.064 | 6.102 | 13.593 | 0.045 | n/a | 0.149 | 7.479 | 3.820 | n/a | 0.026 | 5.125 | 0.141 | 0.026 | gw-w/thread-43/gateway.admitted-work | none observed |
| 88da82624ad85461000000000000014b | 36.264 | 5.718 | 0.181 | 0.469 | 0.071 | 1.932 | 10.814 | 0.089 | n/a | 0.148 | 10.826 | 5.983 | n/a | 0.031 | 6.440 | 0.178 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000171 | 36.221 | 4.369 | 0.225 | 0.000 | 0.133 | 1.620 | 10.502 | 0.030 | n/a | 0.332 | 11.846 | 7.120 | n/a | 0.044 | 4.727 | 0.130 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000135 | 34.756 | 3.961 | 0.218 | 0.364 | 0.086 | 1.590 | 19.042 | 0.048 | n/a | 0.132 | 5.746 | 3.543 | n/a | 0.027 | 4.630 | 0.133 | 0.027 | gw-w/thread-40/gateway.admitted-work | driver.publication.persist-deferred 1.153ms |
| 88da82624ad85461000000000000016d | 32.670 | 4.830 | 0.169 | 0.000 | 0.076 | 2.670 | 9.973 | 0.057 | n/a | 0.140 | 9.492 | 5.227 | n/a | 0.035 | 5.075 | 0.155 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000161 | 32.269 | 3.108 | 0.506 | 0.212 | 0.053 | 1.056 | 9.931 | 0.069 | n/a | 0.465 | 13.294 | 3.555 | n/a | 0.020 | 3.879 | 0.120 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000173 | 31.952 | 6.755 | 0.171 | 0.247 | 0.131 | 1.142 | 9.693 | 0.031 | n/a | 0.124 | 6.653 | 6.954 | n/a | 0.052 | 7.304 | 0.229 | 0.052 | tx/thread-89/transactor.triplex-function | none observed |
| 88da82624ad85461000000000000014f | 31.548 | 3.838 | 0.325 | 0.384 | 0.082 | 1.844 | 6.276 | 0.037 | n/a | 0.392 | 10.958 | 7.375 | n/a | 0.038 | 4.629 | 0.147 | 0.038 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000150 | 31.211 | 10.325 | n/a | 1.789 | 0.878 | 0.724 | 1.778 | 0.020 | n/a | 0.095 | 8.032 | 7.528 | n/a | 0.041 | 12.992 | 0.416 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000145 | 30.133 | 3.765 | n/a | 0.000 | 0.520 | 1.711 | 2.774 | 0.035 | n/a | 1.329 | 9.499 | 10.464 | n/a | 0.035 | 4.285 | 0.142 | 0.035 | tx/thread-89/transactor.triplex-function | none observed |
| 88da82624ad854610000000000000138 | 29.869 | 6.717 | n/a | 0.000 | 0.103 | 2.401 | 11.766 | 0.086 | n/a | 2.201 | 5.688 | 0.861 | n/a | 0.046 | 6.820 | 0.228 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000012d | 27.476 | 3.399 | 0.184 | 0.273 | 0.132 | 1.387 | 9.775 | 0.029 | n/a | 0.527 | 5.766 | 5.955 | n/a | 0.049 | 3.988 | 0.145 | 0.049 | gw-w/thread-43/gateway.admitted-work | none observed |
| 88da82624ad85461000000000000017d | 27.258 | 7.107 | 0.223 | 0.262 | 0.099 | 1.979 | 9.298 | 0.058 | n/a | 0.139 | 5.292 | 2.760 | n/a | 0.041 | 7.691 | 0.282 | 0.041 | gw-w/thread-45/gateway.admitted-work | none observed |
| 88da82624ad854610000000000000177 | 27.199 | 9.301 | n/a | 1.907 | 0.170 | 1.219 | 2.377 | 0.023 | n/a | 0.535 | 10.453 | 1.150 | n/a | 0.062 | 11.379 | 0.418 | 0.062 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.217 | 0.681 | 0.000 | 0.446 | 2.549 | n/a | 0.000 | 0.610 | 0.965 | 1.796 | 0.025 | n/a | 0.357 | 5.688 | 0.902 | n/a | 0.032 | 3.371 | 0.217 | 0.032 |
| p99 | 49.365 | 1.004 | 0.000 | 0.860 | 6.717 | n/a | 0.000 | 8.212 | 2.401 | 11.766 | 0.086 | n/a | 2.201 | 35.088 | 7.708 | n/a | 0.075 | 11.271 | 0.575 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad854610000000000000134 | 49.365 | 2.396 | n/a | 0.000 | 1.008 | 0.965 | 1.998 | 0.038 | n/a | 0.132 | 35.088 | 7.708 | n/a | 0.032 | 3.404 | 0.069 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000138 | 29.869 | 6.717 | n/a | 0.000 | 0.103 | 2.401 | 11.766 | 0.086 | n/a | 2.201 | 5.688 | 0.861 | n/a | 0.046 | 6.820 | 0.228 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000016f | 20.115 | 4.804 | n/a | 0.000 | 0.948 | 1.484 | 2.004 | 0.032 | n/a | 0.635 | 9.504 | 0.629 | n/a | 0.075 | 5.752 | 0.286 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000178 | 19.596 | 3.058 | n/a | 0.000 | 8.212 | 0.893 | 1.746 | 0.025 | n/a | 0.125 | 4.990 | 0.495 | n/a | 0.050 | 11.271 | 0.575 | 0.050 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.152ms; driver.publication.persist-deferred 1.074ms |
| 88da82624ad854610000000000000149 | 16.217 | 2.306 | n/a | 0.000 | 0.610 | 1.134 | 1.437 | 0.024 | n/a | 0.780 | 6.202 | 3.702 | n/a | 0.022 | 2.916 | 0.180 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000153 | 14.611 | 3.092 | n/a | 0.000 | 0.279 | 1.056 | 1.796 | 0.031 | n/a | 0.264 | 7.153 | 0.902 | n/a | 0.036 | 3.371 | 0.231 | 0.036 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000015d | 13.126 | 2.549 | n/a | 0.000 | 0.304 | 0.793 | 1.155 | 0.021 | n/a | 1.078 | 4.903 | 2.295 | n/a | 0.028 | 2.854 | 0.217 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000162 | 11.900 | 1.534 | n/a | 0.000 | 0.825 | 0.559 | 2.019 | 0.020 | n/a | 0.357 | 3.803 | 2.769 | n/a | 0.013 | 2.359 | 0.198 | 0.013 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.123 | 0.149 | 0.000 | 0.554 | 3.794 | 0.394 | 0.214 | 0.207 | 1.352 | 5.126 | 0.034 | n/a | 0.171 | 7.199 | 3.680 | n/a | 0.032 | 4.507 | 0.204 | 0.032 |
| p99 | 77.870 | 5.780 | 0.000 | 5.191 | 6.971 | n/a | 3.004 | 1.394 | 4.365 | 13.395 | 0.127 | n/a | 3.310 | 57.518 | 7.083 | n/a | 0.107 | 10.744 | 0.372 | 0.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad8546100000000000001c3 | 77.870 | 3.397 | 0.248 | 0.342 | 0.183 | 1.232 | 9.642 | 0.053 | n/a | 1.761 | 57.518 | 3.430 | n/a | 0.063 | 4.171 | 0.054 | 0.063 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000188 | 32.437 | 3.503 | 0.203 | 0.402 | 0.078 | 1.183 | 7.235 | 0.040 | n/a | 3.310 | 12.771 | 3.680 | n/a | 0.031 | 4.186 | 0.129 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001b5 | 30.833 | 4.263 | 0.297 | 0.236 | 0.048 | 2.116 | 13.395 | 0.046 | n/a | 0.137 | 9.018 | 1.250 | n/a | 0.027 | 4.844 | 0.157 | 0.027 | gw-w/thread-47/gateway.admitted-work | none observed |
| 88da82624ad8546100000000000001ab | 30.555 | 4.901 | 0.183 | 0.458 | 0.075 | 1.936 | 10.624 | 0.032 | n/a | 0.127 | 8.699 | 3.485 | n/a | 0.034 | 5.617 | 0.184 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001b9 | 28.875 | 6.971 | n/a | 3.004 | 0.769 | 1.769 | 2.297 | 0.025 | n/a | 0.112 | 9.012 | 4.873 | n/a | 0.042 | 10.744 | 0.372 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000181 | 27.527 | 3.043 | 0.147 | 0.403 | 0.073 | 1.719 | 9.983 | 0.099 | n/a | 0.172 | 8.062 | 3.804 | n/a | 0.023 | 3.665 | 0.133 | 0.023 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000193 | 27.469 | 4.614 | 0.186 | 0.399 | 0.063 | 1.945 | 9.925 | 0.064 | n/a | 0.453 | 6.227 | 3.562 | n/a | 0.033 | 5.261 | 0.192 | 0.033 | gw-w/thread-40/gateway.admitted-work | none observed |
| 88da82624ad85461000000000000018f | 27.212 | 2.481 | n/a | 0.000 | 1.064 | 4.365 | 1.104 | 0.019 | n/a | 0.374 | 11.610 | 6.173 | n/a | 0.020 | 3.545 | 0.130 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000185 | 27.193 | 4.976 | 0.178 | 0.364 | 0.035 | 3.868 | 5.712 | 0.038 | n/a | 0.416 | 5.930 | 5.661 | n/a | 0.016 | 5.553 | 0.204 | 0.016 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001ad | 26.616 | 6.781 | n/a | 0.000 | 1.092 | 1.204 | 4.016 | 0.127 | n/a | 0.315 | 8.577 | 4.438 | n/a | 0.066 | 7.874 | 0.296 | 0.066 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000018a | 26.521 | 3.826 | n/a | 0.000 | 0.790 | 0.888 | 7.203 | 0.027 | n/a | 0.456 | 7.289 | 6.019 | n/a | 0.022 | 4.616 | 0.174 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001cd | 25.579 | 4.553 | 0.154 | 0.443 | 0.113 | 1.538 | 8.248 | 0.029 | n/a | 0.129 | 6.925 | 3.421 | n/a | 0.026 | 5.263 | 0.206 | 0.026 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000017f | 25.424 | 4.988 | n/a | 0.000 | 0.997 | 1.348 | 1.641 | 0.032 | n/a | 0.128 | 9.102 | 7.083 | n/a | 0.105 | 5.984 | 0.235 | 0.105 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000019b | 24.818 | 4.466 | n/a | 1.741 | 0.637 | 1.180 | 1.840 | 0.022 | n/a | 0.148 | 10.582 | 4.176 | n/a | 0.027 | 6.844 | 0.276 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001b1 | 24.759 | 3.255 | 0.253 | 0.219 | 0.068 | 1.251 | 10.187 | 0.044 | n/a | 0.095 | 4.934 | 4.421 | n/a | 0.032 | 3.795 | 0.153 | 0.032 | gw-w/thread-43/gateway.admitted-work | none observed |
| 88da82624ad854610000000000000191 | 24.468 | 3.175 | 0.170 | 0.252 | 0.057 | 1.216 | 8.668 | 0.032 | n/a | 0.414 | 6.952 | 3.497 | n/a | 0.034 | 3.655 | 0.149 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000019d | 24.398 | 4.413 | 0.394 | 0.250 | 0.207 | 1.922 | 7.388 | 0.034 | n/a | 0.135 | 5.696 | 3.876 | n/a | 0.082 | 5.264 | 0.216 | 0.082 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001a1 | 23.860 | 3.604 | n/a | 0.000 | 1.394 | 2.793 | 2.066 | 0.031 | n/a | 0.181 | 7.450 | 6.246 | n/a | 0.095 | 4.998 | 0.209 | 0.095 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000019f | 23.750 | 4.523 | 0.223 | 0.438 | 0.053 | 2.088 | 5.619 | 0.028 | n/a | 0.267 | 6.945 | 3.541 | n/a | 0.026 | 5.237 | 0.220 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001a5 | 23.123 | 4.698 | 0.186 | 0.467 | 0.064 | 1.939 | 6.208 | 0.041 | n/a | 0.420 | 5.444 | 3.625 | n/a | 0.032 | 5.415 | 0.234 | 0.032 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.264 | 1.002 | 0.000 | 0.551 | 2.417 | n/a | 0.000 | 0.497 | 1.150 | 1.566 | 0.032 | n/a | 0.152 | 7.199 | 2.318 | n/a | 0.026 | 3.233 | 0.190 | 0.026 |
| p99 | 27.212 | 1.747 | 0.000 | 0.739 | 4.988 | n/a | 0.000 | 1.064 | 4.365 | 2.600 | 0.078 | n/a | 0.578 | 13.257 | 7.083 | n/a | 0.107 | 5.984 | 0.271 | 0.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad85461000000000000018f | 27.212 | 2.481 | n/a | 0.000 | 1.064 | 4.365 | 1.104 | 0.019 | n/a | 0.374 | 11.610 | 6.173 | n/a | 0.020 | 3.545 | 0.130 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000017f | 25.424 | 4.988 | n/a | 0.000 | 0.997 | 1.348 | 1.641 | 0.032 | n/a | 0.128 | 9.102 | 7.083 | n/a | 0.105 | 5.984 | 0.235 | 0.105 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001b3 | 22.747 | 4.622 | n/a | 0.000 | 1.008 | 1.286 | 1.566 | 0.040 | n/a | 0.124 | 13.257 | 0.752 | n/a | 0.093 | 5.631 | 0.248 | 0.093 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000183 | 19.403 | 4.187 | n/a | 0.000 | 0.267 | 1.150 | 1.600 | 0.032 | n/a | 0.578 | 9.197 | 2.318 | n/a | 0.075 | 4.454 | 0.230 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001a9 | 18.132 | 1.973 | n/a | 0.000 | 0.115 | 0.935 | 1.581 | 0.053 | n/a | 0.126 | 12.343 | 0.979 | n/a | 0.026 | 2.088 | 0.115 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000197 | 16.264 | 2.417 | n/a | 0.000 | 0.676 | 0.748 | 1.736 | 0.071 | n/a | 0.171 | 4.270 | 6.155 | n/a | 0.021 | 3.093 | 0.190 | 0.021 | tx/thread-89/transactor.triplex-function | none observed |
| 88da82624ad854610000000000000195 | 15.127 | 2.252 | n/a | 0.000 | 0.428 | 1.400 | 2.600 | 0.078 | n/a | 0.431 | 7.199 | 0.697 | n/a | 0.041 | 2.680 | 0.177 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001c8 | 15.111 | 3.595 | n/a | 0.000 | 0.497 | 0.946 | 1.016 | 0.023 | n/a | 0.138 | 4.937 | 3.854 | n/a | 0.107 | 4.092 | 0.271 | 0.107 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001c0 | 13.102 | 1.518 | n/a | 0.000 | 0.395 | 1.574 | 1.201 | 0.019 | n/a | 0.311 | 4.102 | 3.957 | n/a | 0.024 | 1.913 | 0.146 | 0.024 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001cb | 12.137 | 2.260 | n/a | 0.000 | 0.973 | 0.559 | 0.966 | 0.024 | n/a | 0.152 | 6.676 | 0.505 | n/a | 0.022 | 3.233 | 0.266 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.356 | 0.000 | 0.000 | 0.408 | 3.365 | n/a | 0.000 | 0.154 | 1.148 | 3.074 | 0.031 | n/a | 0.255 | 6.851 | 3.698 | n/a | 0.032 | 4.048 | 0.179 | 0.032 |
| p99 | 95.120 | 2.344 | 0.028 | 1.762 | 15.246 | n/a | 0.657 | 1.143 | 7.454 | 59.173 | 0.099 | n/a | 2.940 | 15.975 | 9.769 | n/a | 0.080 | 15.354 | 0.371 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad854610000000000000218 | 95.120 | 4.298 | 0.189 | 0.467 | 0.065 | 5.382 | 59.173 | 0.094 | n/a | 0.171 | 15.478 | 9.769 | n/a | 0.036 | 5.018 | 0.053 | 0.036 | gw-w/thread-45/gateway.admitted-work | none observed |
| 88da82624ad8546100000000000001f2 | 42.994 | 15.246 | n/a | 0.000 | 0.108 | 3.115 | 13.949 | 0.078 | n/a | 0.255 | 8.904 | 1.300 | n/a | 0.041 | 15.354 | 0.357 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001d9 | 37.068 | 4.256 | 0.247 | 0.490 | 0.151 | 1.157 | 16.428 | 0.035 | n/a | 0.085 | 5.760 | 8.398 | n/a | 0.060 | 5.144 | 0.139 | 0.060 | tx/thread-89/transactor.triplex-function | none observed |
| 88da82624ad854610000000000000212 | 34.762 | 3.993 | 0.308 | 0.329 | 0.054 | 1.921 | 17.429 | 0.062 | n/a | 0.128 | 7.183 | 3.327 | n/a | 0.028 | 4.684 | 0.135 | 0.028 | gw-w/thread-42/gateway.admitted-work | none observed |
| 88da82624ad8546100000000000001dc | 34.499 | 4.336 | 0.218 | 0.000 | 0.052 | 1.379 | 11.771 | 0.028 | n/a | 0.101 | 12.936 | 3.651 | n/a | 0.027 | 4.606 | 0.134 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001fa | 33.051 | 3.889 | 0.187 | 0.345 | 0.086 | 2.014 | 11.320 | 0.038 | n/a | 0.524 | 10.170 | 4.441 | n/a | 0.037 | 4.507 | 0.136 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001d6 | 32.499 | 3.607 | n/a | 0.000 | 0.315 | 7.454 | 2.251 | 0.021 | n/a | 0.065 | 12.056 | 6.716 | n/a | 0.013 | 3.922 | 0.121 | 0.013 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.858ms |
| 88da82624ad8546100000000000001e0 | 31.503 | 4.457 | 0.281 | 0.406 | 0.149 | 1.337 | 10.408 | 0.032 | n/a | 0.088 | 9.584 | 4.711 | n/a | 0.050 | 5.293 | 0.168 | 0.050 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000021c | 28.652 | 2.981 | 0.200 | 0.272 | 0.137 | 1.148 | 11.625 | 0.063 | n/a | 0.405 | 5.715 | 6.026 | n/a | 0.080 | 3.590 | 0.125 | 0.080 | gw-w/thread-45/gateway.admitted-work | none observed |
| 88da82624ad854610000000000000220 | 27.716 | 3.325 | 0.179 | 0.297 | 0.064 | 1.332 | 11.986 | 0.028 | n/a | 0.346 | 6.600 | 3.527 | n/a | 0.031 | 3.866 | 0.139 | 0.031 | gw-w/thread-47/gateway.admitted-work | none observed |
| 88da82624ad8546100000000000001f0 | 27.404 | 3.501 | 0.319 | 0.000 | 0.154 | 1.456 | 9.308 | 0.042 | n/a | 0.107 | 8.103 | 4.350 | n/a | 0.064 | 3.973 | 0.145 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001d5 | 27.300 | 2.194 | n/a | 0.000 | 1.083 | 0.953 | 1.240 | 0.028 | n/a | 0.522 | 14.222 | 7.025 | n/a | 0.033 | 3.277 | 0.120 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000208 | 26.692 | 3.185 | 0.243 | 0.253 | 0.062 | 0.982 | 8.368 | 0.027 | n/a | 0.315 | 8.715 | 4.513 | n/a | 0.028 | 3.743 | 0.140 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000210 | 26.504 | 4.458 | 0.337 | 0.415 | 0.075 | 1.813 | 4.660 | 0.036 | n/a | 0.142 | 10.125 | 4.407 | n/a | 0.038 | 5.284 | 0.199 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000020c | 26.333 | 4.947 | 0.229 | 0.452 | 0.051 | 2.076 | 8.125 | 0.035 | n/a | 0.104 | 5.358 | 4.927 | n/a | 0.030 | 5.678 | 0.216 | 0.030 | gw-w/thread-42/gateway.admitted-work | none observed |
| 88da82624ad854610000000000000204 | 25.358 | 4.119 | 0.361 | 0.364 | 0.085 | 1.664 | 8.337 | 0.035 | n/a | 0.447 | 6.267 | 3.646 | n/a | 0.032 | 4.929 | 0.194 | 0.032 | gw-w/thread-44/gateway.admitted-work | none observed |
| 88da82624ad8546100000000000001d1 | 25.040 | 2.997 | n/a | 0.000 | 1.083 | 1.070 | 1.308 | 0.025 | n/a | 0.119 | 15.975 | 2.430 | n/a | 0.034 | 4.079 | 0.163 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001fe | 24.814 | 6.242 | n/a | 0.000 | 0.674 | 0.935 | 1.325 | 0.021 | n/a | 0.916 | 6.736 | 7.925 | n/a | 0.040 | 6.916 | 0.279 | 0.040 | tx/thread-89/transactor.triplex-function | none observed |
| 88da82624ad8546100000000000001fc | 24.793 | 3.461 | 0.312 | 0.242 | 0.056 | 1.657 | 8.904 | 0.093 | n/a | 0.490 | 5.621 | 3.926 | n/a | 0.030 | 4.072 | 0.164 | 0.030 | gw-w/thread-44/gateway.admitted-work | none observed |
| 88da82624ad8546100000000000001de | 24.670 | 2.314 | n/a | 0.000 | 0.830 | 1.447 | 3.074 | 0.032 | n/a | 2.940 | 8.147 | 5.852 | n/a | 0.035 | 3.144 | 0.127 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.226 | 0.623 | 0.000 | 0.452 | 2.314 | n/a | 0.000 | 0.847 | 0.921 | 1.358 | 0.025 | n/a | 0.344 | 6.851 | 3.624 | n/a | 0.034 | 3.144 | 0.179 | 0.034 |
| p99 | 27.300 | 2.344 | 0.028 | 0.817 | 3.795 | n/a | 0.000 | 1.143 | 1.447 | 3.074 | 0.099 | n/a | 2.940 | 15.975 | 7.025 | n/a | 0.056 | 4.812 | 0.371 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad8546100000000000001d5 | 27.300 | 2.194 | n/a | 0.000 | 1.083 | 0.953 | 1.240 | 0.028 | n/a | 0.522 | 14.222 | 7.025 | n/a | 0.033 | 3.277 | 0.120 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001d1 | 25.040 | 2.997 | n/a | 0.000 | 1.083 | 1.070 | 1.308 | 0.025 | n/a | 0.119 | 15.975 | 2.430 | n/a | 0.034 | 4.079 | 0.163 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001de | 24.670 | 2.314 | n/a | 0.000 | 0.830 | 1.447 | 3.074 | 0.032 | n/a | 2.940 | 8.147 | 5.852 | n/a | 0.035 | 3.144 | 0.127 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000201 | 18.714 | 1.915 | n/a | 0.000 | 1.063 | 0.921 | 2.197 | 0.024 | n/a | 0.435 | 5.833 | 6.302 | n/a | 0.024 | 2.978 | 0.159 | 0.024 | tx/thread-89/transactor.triplex-function | none observed |
| 88da82624ad8546100000000000001e5 | 18.384 | 3.724 | n/a | 0.000 | 1.088 | 1.143 | 2.171 | 0.099 | n/a | 0.204 | 6.208 | 3.698 | n/a | 0.048 | 4.812 | 0.262 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001cf | 17.421 | 1.649 | n/a | 0.000 | 0.196 | 0.554 | 1.378 | 0.020 | n/a | 0.520 | 9.450 | 3.624 | n/a | 0.030 | 1.845 | 0.106 | 0.030 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001ec | 16.507 | 2.637 | n/a | 0.000 | 0.310 | 1.052 | 1.669 | 0.030 | n/a | 0.169 | 6.851 | 3.760 | n/a | 0.029 | 2.947 | 0.179 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001e8 | 16.226 | 3.226 | n/a | 0.000 | 0.752 | 0.656 | 1.038 | 0.023 | n/a | 0.344 | 6.129 | 4.009 | n/a | 0.049 | 3.977 | 0.245 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000206 | 16.021 | 3.671 | n/a | 0.000 | 0.378 | 0.776 | 0.878 | 0.020 | n/a | 0.400 | 6.657 | 3.194 | n/a | 0.047 | 4.048 | 0.253 | 0.047 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001f8 | 15.955 | 1.842 | n/a | 0.000 | 1.016 | 0.638 | 1.135 | 0.021 | n/a | 0.102 | 9.104 | 2.073 | n/a | 0.023 | 2.859 | 0.179 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000214 | 15.521 | 2.106 | n/a | 0.000 | 0.889 | 0.475 | 1.103 | 0.030 | n/a | 0.625 | 5.664 | 4.600 | n/a | 0.028 | 2.995 | 0.193 | 0.028 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000020e | 14.232 | 2.078 | n/a | 0.000 | 0.518 | 1.023 | 1.722 | 0.057 | n/a | 0.259 | 7.580 | 0.960 | n/a | 0.035 | 2.596 | 0.182 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000020a | 14.198 | 2.177 | n/a | 0.000 | 0.302 | 0.562 | 1.995 | 0.069 | n/a | 0.304 | 8.180 | 0.588 | n/a | 0.022 | 2.479 | 0.175 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000001ea | 12.518 | 3.795 | n/a | 0.000 | 0.847 | 0.935 | 1.358 | 0.024 | n/a | 0.154 | 4.813 | 0.535 | n/a | 0.056 | 4.643 | 0.371 | 0.056 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000021e | 11.879 | 3.052 | n/a | 0.000 | 1.143 | 0.731 | 1.075 | 0.018 | n/a | 0.554 | 4.724 | 0.538 | n/a | 0.044 | 4.196 | 0.353 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.123 | 0.000 | 0.000 | 0.449 | 3.145 | n/a | 0.000 | 0.380 | 0.985 | 3.578 | 0.025 | n/a | 0.155 | 6.666 | 2.216 | n/a | 0.029 | 3.837 | 0.199 | 0.029 |
| p99 | 95.655 | 2.510 | 0.000 | 1.373 | 8.878 | n/a | 0.584 | 1.133 | 5.460 | 29.968 | 2.776 | n/a | 4.531 | 78.332 | 15.255 | n/a | 0.089 | 9.404 | 0.424 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad85461000000000000022d | 95.655 | 3.684 | 0.252 | 0.241 | 0.096 | 1.319 | 7.432 | 0.037 | n/a | 0.491 | 78.332 | 3.731 | n/a | 0.039 | 4.273 | 0.045 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000025b | 46.454 | 3.413 | 0.243 | 0.350 | 0.195 | 1.541 | 29.968 | 0.039 | n/a | 0.177 | 6.131 | 4.320 | n/a | 0.079 | 4.200 | 0.090 | 0.079 | gw-w/thread-42/gateway.admitted-work | none observed |
| 88da82624ad854610000000000000280 | 35.731 | 3.809 | 0.290 | 0.584 | 0.067 | 1.733 | 14.398 | 0.034 | n/a | 0.141 | 7.722 | 6.929 | n/a | 0.024 | 4.749 | 0.133 | 0.024 | gw-w/thread-43/gateway.admitted-work | none observed |
| 88da82624ad85461000000000000026c | 34.170 | 3.145 | 0.233 | 0.273 | 0.081 | 1.537 | 12.381 | 0.054 | n/a | 0.184 | 11.415 | 4.831 | n/a | 0.037 | 3.731 | 0.109 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000245 | 34.084 | 2.832 | 0.145 | 0.235 | 0.055 | 0.851 | 6.466 | 0.022 | n/a | 0.500 | 7.699 | 15.255 | n/a | 0.023 | 3.268 | 0.096 | 0.023 | tx/thread-89/transactor.triplex-function | none observed |
| 88da82624ad85461000000000000027a | 30.831 | 8.878 | 0.180 | 0.282 | 0.063 | 1.860 | 7.242 | 0.022 | n/a | 0.104 | 6.106 | 6.066 | n/a | 0.027 | 9.404 | 0.305 | 0.027 | node-14/thread-5/client.persist-and-resolve | none observed |
| 88da82624ad854610000000000000237 | 30.590 | 3.511 | 0.192 | 0.226 | 0.072 | 5.460 | 12.631 | 0.028 | n/a | 0.095 | 5.172 | 3.169 | n/a | 0.034 | 4.000 | 0.131 | 0.034 | gw-w/thread-45/gateway.admitted-work | none observed |
| 88da82624ad854610000000000000229 | 29.549 | 4.958 | n/a | 0.000 | 0.216 | 0.765 | 2.646 | 0.018 | n/a | 0.429 | 7.082 | 13.393 | n/a | 0.041 | 5.175 | 0.175 | 0.041 | tx/thread-89/transactor.triplex-function | none observed |
| 88da82624ad854610000000000000284 | 28.608 | 3.117 | 0.274 | 0.265 | 0.054 | 1.152 | 8.186 | 0.032 | n/a | 0.095 | 7.548 | 7.863 | n/a | 0.022 | 3.709 | 0.130 | 0.022 | tx/thread-89/transactor.triplex-function | none observed |
| 88da82624ad854610000000000000222 | 28.188 | 3.531 | 2.675 | 0.436 | 0.084 | 1.478 | 6.715 | 2.776 | n/a | 0.136 | 6.753 | 3.568 | n/a | 0.037 | 6.726 | 0.239 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000241 | 27.524 | 3.759 | 0.208 | 0.316 | 0.142 | 1.412 | 11.167 | 0.026 | n/a | 0.458 | 6.215 | 3.771 | n/a | 0.049 | 4.426 | 0.161 | 0.049 | gw-w/thread-46/gateway.admitted-work | none observed |
| 88da82624ad854610000000000000235 | 27.021 | 3.311 | 0.202 | 0.236 | 0.052 | 1.306 | 9.936 | 0.024 | n/a | 0.397 | 6.514 | 5.025 | n/a | 0.020 | 3.801 | 0.141 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000232 | 25.188 | 3.837 | n/a | 0.000 | 0.550 | 0.850 | 9.331 | 0.023 | n/a | 0.060 | 7.158 | 3.332 | n/a | 0.048 | 4.387 | 0.174 | 0.048 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000251 | 25.106 | 3.140 | 0.174 | 0.262 | 0.055 | 1.012 | 8.667 | 0.025 | n/a | 0.104 | 5.554 | 6.088 | n/a | 0.026 | 3.630 | 0.145 | 0.026 | tx/thread-89/transactor.triplex-function | none observed |
| 88da82624ad854610000000000000276 | 24.986 | 4.034 | n/a | 0.000 | 0.433 | 0.735 | 1.124 | 0.020 | n/a | 0.116 | 8.462 | 10.000 | n/a | 0.062 | 4.467 | 0.179 | 0.062 | tx/thread-89/transactor.triplex-function | none observed |
| 88da82624ad854610000000000000273 | 24.695 | 6.280 | n/a | 0.000 | 1.120 | 0.848 | 1.740 | 0.020 | n/a | 0.155 | 12.468 | 2.009 | n/a | 0.056 | 7.400 | 0.300 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000024c | 24.410 | 1.545 | n/a | 0.000 | 0.372 | 0.346 | 0.858 | 0.009 | n/a | 4.414 | 10.533 | 6.319 | n/a | 0.013 | 1.918 | 0.079 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.000ms |
| 88da82624ad85461000000000000025f | 23.593 | 3.302 | 0.172 | 0.224 | 0.049 | 1.247 | 7.804 | 0.027 | n/a | 0.172 | 6.805 | 3.766 | n/a | 0.024 | 3.747 | 0.159 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000272 | 23.365 | 7.673 | 0.178 | 0.479 | 0.063 | 1.499 | 4.230 | 0.024 | n/a | 0.104 | 6.666 | 2.419 | n/a | 0.031 | 8.392 | 0.359 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000255 | 22.768 | 3.174 | 0.172 | 0.282 | 0.053 | 1.297 | 6.851 | 0.048 | n/a | 4.531 | 4.023 | 2.303 | n/a | 0.034 | 3.681 | 0.162 | 0.034 | gw-w/thread-47/d/transact-async | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.707 | 0.000 | 0.000 | 0.466 | 2.086 | n/a | 0.000 | 0.783 | 0.757 | 1.521 | 0.019 | n/a | 0.132 | 5.165 | 1.007 | n/a | 0.024 | 2.970 | 0.228 | 0.024 |
| p99 | 24.410 | 1.651 | 0.000 | 0.863 | 4.746 | n/a | 0.000 | 1.133 | 1.946 | 8.780 | 0.045 | n/a | 4.414 | 10.721 | 6.319 | n/a | 0.075 | 5.529 | 0.424 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad85461000000000000024c | 24.410 | 1.545 | n/a | 0.000 | 0.372 | 0.346 | 0.858 | 0.009 | n/a | 4.414 | 10.533 | 6.319 | n/a | 0.013 | 1.918 | 0.079 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.000ms |
| 88da82624ad854610000000000000230 | 21.615 | 1.839 | n/a | 0.000 | 0.307 | 0.441 | 4.389 | 0.019 | n/a | 0.082 | 10.422 | 4.098 | n/a | 0.019 | 2.146 | 0.099 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000022b | 18.852 | 1.921 | n/a | 0.000 | 0.438 | 0.619 | 0.991 | 0.015 | n/a | 0.358 | 10.650 | 3.839 | n/a | 0.022 | 2.358 | 0.125 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000026b | 18.075 | 4.678 | n/a | 0.000 | 0.409 | 1.946 | 8.780 | 0.029 | n/a | 0.125 | 1.870 | 0.211 | n/a | 0.027 | 5.087 | 0.281 | 0.027 | gw-w/thread-46/storage/begin-command! | none observed |
| 88da82624ad854610000000000000227 | 17.938 | 3.100 | n/a | 0.000 | 0.895 | 0.982 | 4.604 | 0.037 | n/a | 0.118 | 5.017 | 3.146 | n/a | 0.039 | 3.995 | 0.223 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000242 | 16.878 | 2.488 | n/a | 0.000 | 1.077 | 0.794 | 1.161 | 0.019 | n/a | 0.111 | 10.721 | 0.483 | n/a | 0.024 | 3.565 | 0.211 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000238 | 16.324 | 2.782 | n/a | 0.000 | 0.220 | 0.854 | 3.888 | 0.017 | n/a | 0.078 | 3.768 | 4.668 | n/a | 0.050 | 3.002 | 0.184 | 0.050 | tx/thread-89/transactor.triplex-function | none observed |
| 88da82624ad854610000000000000262 | 15.638 | 3.137 | n/a | 0.000 | 0.973 | 0.985 | 1.837 | 0.033 | n/a | 0.199 | 7.938 | 0.491 | n/a | 0.044 | 4.111 | 0.263 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000270 | 14.707 | 2.972 | n/a | 0.000 | 1.064 | 1.053 | 2.143 | 0.044 | n/a | 0.400 | 5.395 | 1.603 | n/a | 0.031 | 4.037 | 0.274 | 0.031 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000282 | 14.397 | 3.638 | n/a | 0.000 | 1.133 | 1.212 | 1.863 | 0.026 | n/a | 0.132 | 5.518 | 0.801 | n/a | 0.075 | 4.771 | 0.331 | 0.075 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000027e | 13.129 | 2.086 | n/a | 0.000 | 0.884 | 0.571 | 1.281 | 0.017 | n/a | 0.137 | 6.268 | 1.868 | n/a | 0.018 | 2.970 | 0.226 | 0.018 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000223 | 13.029 | 4.746 | n/a | 0.000 | 0.783 | 1.645 | 3.706 | 0.045 | n/a | 0.160 | 1.680 | 0.190 | n/a | 0.074 | 5.529 | 0.424 | 0.074 | node-14/thread-0/driver.execute | none observed |
| 88da82624ad854610000000000000260 | 11.041 | 1.927 | n/a | 0.000 | 0.593 | 0.673 | 1.521 | 0.017 | n/a | 0.113 | 5.165 | 1.007 | n/a | 0.025 | 2.520 | 0.228 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000278 | 10.735 | 1.888 | n/a | 0.000 | 0.687 | 0.567 | 0.990 | 0.017 | n/a | 0.336 | 4.885 | 1.343 | n/a | 0.022 | 2.575 | 0.240 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000256 | 9.256 | 1.594 | n/a | 0.000 | 1.053 | 0.757 | 1.410 | 0.024 | n/a | 0.374 | 3.546 | 0.478 | n/a | 0.021 | 2.646 | 0.286 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000266 | 8.652 | 1.583 | n/a | 0.000 | 0.841 | 0.564 | 0.938 | 0.016 | n/a | 0.090 | 4.173 | 0.425 | n/a | 0.021 | 2.425 | 0.280 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.302 | 0.219 | 0.000 | 0.480 | 3.101 | n/a | 0.000 | 0.201 | 0.970 | 2.601 | 0.025 | n/a | 0.139 | 5.775 | 2.841 | n/a | 0.028 | 3.698 | 0.229 | 0.028 |
| p99 | 63.140 | 1.002 | 0.248 | 2.062 | 6.842 | n/a | 0.439 | 1.528 | 2.233 | 13.941 | 0.051 | n/a | 3.033 | 43.435 | n/a | n/a | 0.091 | 7.060 | 0.406 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad85461000000000000029d | 63.140 | 3.292 | 0.281 | 0.282 | 0.201 | 1.218 | 6.712 | 0.028 | n/a | 0.123 | 43.435 | 7.480 | n/a | 0.086 | 4.056 | 0.064 | 0.086 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000295 | 50.503 | 3.652 | 0.232 | 0.394 | 0.045 | 1.209 | 13.941 | 0.033 | n/a | 0.286 | 20.906 | 9.786 | n/a | 0.020 | 4.323 | 0.086 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002ab | 29.775 | 6.842 | 0.155 | 0.000 | 0.063 | 1.549 | 8.643 | 0.025 | n/a | 0.086 | 8.989 | 3.395 | n/a | 0.028 | 7.060 | 0.237 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002c3 | 28.845 | 3.081 | 0.167 | 0.317 | 0.064 | 1.203 | 9.418 | 0.033 | n/a | 0.167 | 9.399 | 4.966 | n/a | 0.030 | 3.629 | 0.126 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002af | 25.552 | 4.078 | 0.527 | 0.000 | 0.083 | 2.233 | 8.575 | 0.026 | n/a | 0.419 | 5.673 | 3.897 | n/a | 0.042 | 4.688 | 0.183 | 0.042 | gw-w/thread-45/gateway.admitted-work | none observed |
| 88da82624ad8546100000000000002d8 | 25.340 | 3.027 | 0.232 | 0.439 | 0.202 | 1.193 | 6.411 | 0.027 | n/a | 0.135 | 8.072 | 5.519 | n/a | 0.084 | 3.900 | 0.154 | 0.084 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000028e | 25.319 | 3.090 | 0.167 | 0.369 | 0.045 | 0.929 | 3.645 | 0.025 | n/a | 0.098 | 12.913 | 4.016 | n/a | 0.022 | 3.671 | 0.145 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000029b | 24.333 | 4.277 | 0.180 | 0.282 | 0.089 | 1.783 | 8.352 | 0.037 | n/a | 0.166 | 5.704 | 3.429 | n/a | 0.033 | 4.829 | 0.198 | 0.033 | gw-w/thread-43/gateway.admitted-work | none observed |
| 88da82624ad85461000000000000028a | 23.851 | 3.283 | 0.221 | 0.437 | 0.160 | 1.292 | 8.384 | 0.043 | n/a | 0.139 | 6.157 | 3.672 | n/a | 0.063 | 4.102 | 0.172 | 0.063 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002a7 | 23.231 | 4.435 | 0.182 | 0.000 | 0.052 | 1.437 | 8.095 | 0.029 | n/a | 0.307 | 5.410 | 3.261 | n/a | 0.024 | 4.669 | 0.201 | 0.024 | gw-w/thread-43/gateway.admitted-work | none observed |
| 88da82624ad8546100000000000002a5 | 22.589 | 2.541 | n/a | 0.000 | 0.632 | 1.368 | 5.843 | 0.049 | n/a | 0.163 | 7.635 | 4.324 | n/a | 0.034 | 3.173 | 0.140 | 0.034 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002bf | 22.561 | 3.388 | 0.244 | 0.000 | 0.049 | 1.349 | 5.649 | 0.020 | n/a | 0.060 | 6.339 | 5.441 | n/a | 0.021 | 3.681 | 0.163 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002b5 | 21.047 | 4.409 | 0.222 | 0.000 | 0.041 | 1.937 | 5.381 | 0.033 | n/a | 0.706 | 5.033 | 3.265 | n/a | 0.020 | 4.672 | 0.222 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002d2 | 20.769 | 3.588 | 0.340 | 0.379 | 0.213 | 1.950 | 5.338 | 0.027 | n/a | 0.136 | 4.987 | 3.726 | n/a | 0.085 | 4.519 | 0.218 | 0.085 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002ac | 20.103 | 5.707 | n/a | 0.000 | 1.158 | 0.687 | 5.397 | 0.027 | n/a | 0.094 | 5.859 | 1.128 | n/a | 0.045 | 6.865 | 0.342 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002b7 | 19.985 | 3.365 | 0.279 | 0.000 | 0.053 | 1.653 | 5.068 | 0.021 | n/a | 0.064 | 5.439 | 4.015 | n/a | 0.028 | 3.698 | 0.185 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002c6 | 19.217 | 2.863 | n/a | 0.000 | 0.862 | 0.687 | 2.125 | 0.027 | n/a | 0.096 | 11.540 | 1.000 | n/a | 0.018 | 3.725 | 0.194 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000290 | 18.728 | 5.157 | n/a | 0.000 | 0.313 | 0.984 | 1.499 | 0.020 | n/a | 1.269 | 6.554 | 2.841 | n/a | 0.091 | 5.470 | 0.292 | 0.091 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002c4 | 18.489 | 2.327 | n/a | 0.000 | 0.083 | 0.586 | 1.258 | 0.020 | n/a | 0.094 | 11.574 | 2.521 | n/a | 0.024 | 2.410 | 0.130 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000028c | 17.461 | 3.804 | n/a | 0.000 | 0.672 | 0.845 | 1.431 | 0.019 | n/a | 0.114 | 6.749 | 3.802 | n/a | 0.025 | 4.476 | 0.256 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.298 | 0.000 | 0.000 | 0.480 | 2.239 | n/a | 0.000 | 0.552 | 0.647 | 1.254 | 0.017 | n/a | 0.126 | 4.892 | 2.100 | n/a | 0.029 | 2.868 | 0.237 | 0.029 |
| p99 | 22.589 | 1.002 | 0.248 | 0.785 | 3.780 | n/a | 0.000 | 1.213 | 1.368 | 5.843 | 0.049 | n/a | 0.404 | 11.574 | n/a | n/a | 0.054 | 4.993 | 0.406 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad8546100000000000002a5 | 22.589 | 2.541 | n/a | 0.000 | 0.632 | 1.368 | 5.843 | 0.049 | n/a | 0.163 | 7.635 | 4.324 | n/a | 0.034 | 3.173 | 0.140 | 0.034 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002c4 | 18.489 | 2.327 | n/a | 0.000 | 0.083 | 0.586 | 1.258 | 0.020 | n/a | 0.094 | 11.574 | 2.521 | n/a | 0.024 | 2.410 | 0.130 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002a9 | 15.313 | 1.918 | n/a | 0.000 | 0.988 | 0.464 | 1.701 | 0.035 | n/a | 0.251 | 7.081 | 2.851 | n/a | 0.025 | 2.906 | 0.190 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000285 | 14.935 | 3.101 | n/a | 0.000 | 0.523 | 0.647 | 1.194 | 0.016 | n/a | 0.091 | 8.151 | 1.160 | n/a | 0.051 | 3.625 | 0.243 | 0.051 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002bd | 14.612 | 2.239 | n/a | 0.000 | 0.186 | 0.981 | 2.230 | 0.049 | n/a | 0.169 | 5.442 | 3.287 | n/a | 0.029 | 2.425 | 0.166 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002c0 | 13.835 | 2.715 | n/a | 0.000 | 0.489 | 0.809 | 1.165 | 0.019 | n/a | 0.124 | 4.828 | 3.660 | n/a | 0.026 | 3.204 | 0.232 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002b1 | 13.539 | 2.119 | n/a | 0.000 | 0.984 | 0.515 | 1.254 | 0.018 | n/a | 0.404 | 5.518 | 2.697 | n/a | 0.031 | 3.103 | 0.229 | 0.031 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000296 | 12.298 | 3.780 | n/a | 0.000 | 1.213 | 0.830 | 1.046 | 0.027 | n/a | 0.309 | 4.355 | 0.685 | n/a | 0.054 | 4.993 | 0.406 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad854610000000000000288 | 11.249 | 1.782 | n/a | 0.000 | 0.881 | 0.455 | 1.255 | 0.016 | n/a | 0.126 | 6.158 | 0.550 | n/a | 0.025 | 2.663 | 0.237 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002a1 | 11.216 | 2.745 | n/a | 0.000 | 0.552 | 0.786 | 0.933 | 0.015 | n/a | 0.100 | 4.892 | 1.150 | n/a | 0.044 | 3.297 | 0.294 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002cb | 10.620 | 2.429 | n/a | 0.000 | 0.313 | 0.646 | 0.896 | 0.016 | n/a | 0.226 | 3.971 | 2.100 | n/a | 0.023 | 2.743 | 0.258 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002b9 | 10.231 | 2.010 | n/a | 0.000 | 0.065 | 0.510 | 2.500 | 0.015 | n/a | 0.109 | 4.361 | 0.635 | n/a | 0.026 | 2.075 | 0.203 | 0.026 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002cf | 9.718 | 1.820 | n/a | 0.000 | 1.049 | 1.151 | 5.598 | 0.011 | n/a | 0.047 | 0.000 | n/a | n/a | 0.042 | 2.868 | 0.295 | 0.042 | gw-w/thread-44/storage/begin-command! | none observed |
| 88da82624ad85461000000000000029e | 8.770 | 1.954 | n/a | 0.000 | 0.195 | 0.970 | 1.070 | 0.017 | n/a | 0.105 | 3.899 | 0.530 | n/a | 0.030 | 2.149 | 0.245 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000002c8 | 8.310 | 1.383 | n/a | 0.000 | 1.028 | 0.365 | 0.842 | 0.015 | n/a | 0.373 | 2.578 | 1.713 | n/a | 0.013 | 2.411 | 0.290 | 0.013 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.844ms |

## P2 / L1024 / commit (840 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.684 | 0.474 | 0.000 | 0.499 | 2.210 | n/a | 0.000 | 0.697 | 0.636 | 1.035 | 0.014 | n/a | 0.109 | 5.056 | 0.792 | n/a | 0.016 | 3.097 | 0.252 | 0.016 |
| p99 | 55.303 | 2.012 | 0.051 | 2.024 | 6.222 | n/a | 0.000 | 17.326 | 9.246 | 8.760 | 0.051 | n/a | 3.592 | 29.452 | 18.652 | n/a | 0.051 | 18.420 | 0.607 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad854610000000000000407 | 73.626 | 1.604 | n/a | 0.000 | 1.232 | 10.770 | 0.480 | 0.009 | n/a | 0.022 | 56.282 | 3.208 | n/a | 0.019 | 2.836 | 0.039 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.975ms |
| 88da82624ad854610000000000000408 | 71.292 | 4.617 | n/a | 0.000 | 1.510 | 4.176 | 1.703 | 0.022 | n/a | 0.069 | 44.866 | 14.323 | n/a | 0.007 | 6.127 | 0.086 | 0.007 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.975ms |
| 88da82624ad854610000000000000409 | 67.098 | 1.790 | n/a | 0.000 | 0.328 | 4.617 | 0.971 | 0.012 | n/a | 0.060 | 53.686 | 5.615 | n/a | 0.020 | 2.118 | 0.032 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.148ms; driver.publication.persist-deferred 0.975ms; driver.publication.persist-deferred 0.810ms |
| 88da82624ad854610000000000000404 | 60.294 | 2.251 | n/a | 0.000 | 0.063 | 0.367 | 0.853 | 0.010 | n/a | 0.064 | 49.920 | 6.754 | n/a | 0.011 | 2.314 | 0.038 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.002ms; driver.publication.persist-deferred 0.899ms |
| 88da82624ad854610000000000000345 | 60.091 | 1.649 | n/a | 0.000 | 0.258 | 0.867 | 4.761 | 0.031 | n/a | 0.105 | 11.129 | 41.278 | n/a | 0.013 | 1.906 | 0.032 | 0.013 | tx/thread-89/transactor.triplex-function | none observed |
| 88da82624ad854610000000000000555 | 59.541 | 17.248 | n/a | 0.000 | 0.703 | 13.833 | 9.667 | 0.049 | n/a | 1.862 | 13.675 | 2.477 | n/a | 0.026 | 17.951 | 0.301 | 0.026 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 0.963ms; driver.publication.persist-deferred 0.953ms |
| 88da82624ad854610000000000000346 | 56.650 | 2.323 | n/a | 0.000 | 0.114 | 0.995 | 1.391 | 0.014 | n/a | 1.099 | 49.975 | 0.731 | n/a | 0.009 | 2.437 | 0.043 | 0.009 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.938ms |
| 88da82624ad854610000000000000411 | 56.458 | 1.288 | n/a | 0.000 | 31.180 | 1.727 | 0.895 | 0.016 | n/a | 0.344 | 19.845 | 1.152 | n/a | 0.010 | 32.468 | 0.575 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.267ms; driver.publication.persist-deferred 1.148ms; driver.publication.persist-deferred 0.985ms; driver.publication.persist-deferred 0.849ms; driver.publication.persist-deferred 0.801ms |
| 88da82624ad854610000000000000348 | 55.303 | 1.645 | n/a | 0.000 | 30.982 | 0.408 | 1.796 | 0.068 | n/a | 6.297 | 12.901 | 1.196 | n/a | 0.010 | 32.627 | 0.590 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 4.927ms; driver.publication.persist-deferred 0.938ms; driver.publication.persist-deferred 0.893ms; driver.publication.persist-deferred 0.586ms |
| 88da82624ad85461000000000000039f | 45.653 | 4.700 | n/a | 0.000 | 28.240 | 2.212 | 1.265 | 0.018 | n/a | 0.054 | 6.306 | 2.839 | n/a | 0.019 | 32.940 | 0.722 | 0.019 | node-14/thread-0/driver.queue.subject | client.encode 1.570ms; driver.publication.persist-deferred 0.984ms; driver.publication.persist-deferred 0.899ms; driver.publication.persist-deferred 0.614ms |
| 88da82624ad854610000000000000347 | 45.108 | 2.766 | n/a | 0.000 | 0.707 | 0.860 | 1.051 | 0.019 | n/a | 0.340 | 39.075 | 0.242 | n/a | 0.049 | 3.473 | 0.077 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.938ms; driver.publication.persist-deferred 0.893ms |
| 88da82624ad854610000000000000412 | 44.042 | 2.486 | n/a | 0.000 | 18.141 | 3.353 | 0.668 | 0.014 | n/a | 0.042 | 16.841 | 2.480 | n/a | 0.017 | 20.626 | 0.468 | 0.017 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.267ms; driver.publication.persist-deferred 0.985ms; driver.publication.persist-deferred 0.801ms; driver.publication.persist-deferred 0.793ms; driver.publication.persist-deferred 0.702ms |
| 88da82624ad8546100000000000002e9 | 42.115 | 2.875 | 0.339 | 0.236 | 0.048 | 1.104 | 19.992 | 0.032 | n/a | 0.083 | 7.546 | 9.835 | n/a | 0.024 | 3.498 | 0.083 | 0.024 | tx/thread-89/transactor.triplex-function | none observed |
| 88da82624ad85461000000000000039e | 42.073 | 1.527 | n/a | 0.000 | 0.587 | 18.536 | 6.552 | 0.019 | n/a | 0.082 | 10.498 | 4.253 | n/a | 0.020 | 2.115 | 0.050 | 0.020 | node-14/thread-0/socket.wait-first-byte | client.encode 1.570ms; driver.publication.persist-deferred 0.899ms |
| 88da82624ad854610000000000000908 | 41.626 | 2.054 | n/a | 0.000 | 30.355 | 0.459 | 1.347 | 0.014 | n/a | 0.109 | 4.827 | 2.449 | n/a | 0.011 | 32.409 | 0.779 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.216ms; driver.publication.persist-deferred 0.869ms; driver.publication.persist-deferred 0.715ms; driver.publication.persist-deferred 0.609ms |
| 88da82624ad854610000000000000906 | 41.430 | 3.479 | n/a | 0.000 | 3.341 | 4.847 | 2.373 | 0.024 | n/a | 0.062 | 20.386 | 6.909 | n/a | 0.009 | 6.820 | 0.165 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.216ms; driver.publication.persist-deferred 0.869ms; driver.publication.persist-deferred 0.609ms |
| 88da82624ad85461000000000000040b | 41.267 | 2.477 | n/a | 0.000 | 15.701 | 5.970 | 1.807 | 0.031 | n/a | 0.092 | 7.379 | 7.800 | n/a | 0.011 | 18.178 | 0.440 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.148ms; driver.publication.persist-deferred 0.810ms; driver.publication.persist-deferred 0.702ms; driver.publication.persist-deferred 0.645ms |
| 88da82624ad8546100000000000004cf | 41.145 | 3.260 | n/a | 0.000 | 0.681 | 0.565 | 1.034 | 0.014 | n/a | 0.077 | 33.627 | 1.870 | n/a | 0.015 | 3.941 | 0.096 | 0.015 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.652ms |
| 88da82624ad8546100000000000006a7 | 41.036 | 1.749 | n/a | 0.000 | 0.240 | 0.443 | 0.781 | 0.009 | n/a | 1.550 | 31.793 | 4.454 | n/a | 0.018 | 1.988 | 0.048 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.699ms |
| 88da82624ad85461000000000000040e | 40.524 | 5.516 | n/a | 0.000 | 0.755 | 15.014 | 1.412 | 0.022 | n/a | 0.071 | 11.400 | 6.327 | n/a | 0.007 | 6.271 | 0.155 | 0.007 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.148ms; driver.publication.persist-deferred 0.985ms; driver.publication.persist-deferred 0.810ms; driver.publication.persist-deferred 0.702ms; driver.publication.persist-deferred 0.655ms |

## P2 / L1024 / commit / 5-10 facts (488 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.342 | 0.000 | 0.000 | 0.397 | 1.738 | n/a | 0.000 | 0.725 | 0.637 | 0.887 | 0.014 | n/a | 0.122 | 4.643 | 0.632 | n/a | 0.016 | 2.570 | 0.240 | 0.016 |
| p99 | 45.108 | 1.985 | 0.063 | 1.003 | 4.693 | n/a | 0.000 | 18.141 | 8.910 | 5.375 | 0.056 | n/a | 3.607 | 19.845 | 19.937 | n/a | 0.052 | 20.626 | 0.609 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad854610000000000000407 | 73.626 | 1.604 | n/a | 0.000 | 1.232 | 10.770 | 0.480 | 0.009 | n/a | 0.022 | 56.282 | 3.208 | n/a | 0.019 | 2.836 | 0.039 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.975ms |
| 88da82624ad854610000000000000345 | 60.091 | 1.649 | n/a | 0.000 | 0.258 | 0.867 | 4.761 | 0.031 | n/a | 0.105 | 11.129 | 41.278 | n/a | 0.013 | 1.906 | 0.032 | 0.013 | tx/thread-89/transactor.triplex-function | none observed |
| 88da82624ad854610000000000000411 | 56.458 | 1.288 | n/a | 0.000 | 31.180 | 1.727 | 0.895 | 0.016 | n/a | 0.344 | 19.845 | 1.152 | n/a | 0.010 | 32.468 | 0.575 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.267ms; driver.publication.persist-deferred 1.148ms; driver.publication.persist-deferred 0.985ms; driver.publication.persist-deferred 0.849ms; driver.publication.persist-deferred 0.801ms |
| 88da82624ad854610000000000000348 | 55.303 | 1.645 | n/a | 0.000 | 30.982 | 0.408 | 1.796 | 0.068 | n/a | 6.297 | 12.901 | 1.196 | n/a | 0.010 | 32.627 | 0.590 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 4.927ms; driver.publication.persist-deferred 0.938ms; driver.publication.persist-deferred 0.893ms; driver.publication.persist-deferred 0.586ms |
| 88da82624ad854610000000000000347 | 45.108 | 2.766 | n/a | 0.000 | 0.707 | 0.860 | 1.051 | 0.019 | n/a | 0.340 | 39.075 | 0.242 | n/a | 0.049 | 3.473 | 0.077 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.938ms; driver.publication.persist-deferred 0.893ms |
| 88da82624ad854610000000000000412 | 44.042 | 2.486 | n/a | 0.000 | 18.141 | 3.353 | 0.668 | 0.014 | n/a | 0.042 | 16.841 | 2.480 | n/a | 0.017 | 20.626 | 0.468 | 0.017 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.267ms; driver.publication.persist-deferred 0.985ms; driver.publication.persist-deferred 0.801ms; driver.publication.persist-deferred 0.793ms; driver.publication.persist-deferred 0.702ms |
| 88da82624ad85461000000000000039e | 42.073 | 1.527 | n/a | 0.000 | 0.587 | 18.536 | 6.552 | 0.019 | n/a | 0.082 | 10.498 | 4.253 | n/a | 0.020 | 2.115 | 0.050 | 0.020 | node-14/thread-0/socket.wait-first-byte | client.encode 1.570ms; driver.publication.persist-deferred 0.899ms |
| 88da82624ad8546100000000000005c1 | 38.460 | 2.191 | n/a | 0.000 | 0.486 | 0.332 | 0.834 | 0.006 | n/a | 0.041 | 13.406 | 21.149 | n/a | 0.014 | 2.677 | 0.070 | 0.014 | tx/thread-89/transactor.triplex-function | driver.publication.persist-deferred 1.010ms |
| 88da82624ad85461000000000000081c | 37.741 | 1.570 | n/a | 0.000 | 19.439 | 6.693 | 0.878 | 0.013 | n/a | 0.147 | 8.175 | 0.813 | n/a | 0.012 | 21.009 | 0.557 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.901ms; driver.publication.persist-deferred 1.048ms; driver.publication.persist-deferred 0.884ms; driver.publication.persist-deferred 0.878ms; driver.publication.persist-deferred 0.622ms |
| 88da82624ad85461000000000000090b | 36.840 | 1.417 | n/a | 0.000 | 26.873 | 0.396 | 1.542 | 0.034 | n/a | 0.588 | 5.451 | 0.527 | n/a | 0.011 | 28.290 | 0.768 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.879ms; driver.publication.persist-deferred 0.869ms; driver.publication.persist-deferred 0.715ms; driver.publication.persist-deferred 0.609ms; driver.publication.persist-deferred 0.583ms |
| 88da82624ad854610000000000000751 | 35.988 | 1.522 | n/a | 0.000 | 1.514 | 1.746 | 0.890 | 0.011 | n/a | 0.052 | 10.306 | 19.937 | n/a | 0.011 | 3.036 | 0.084 | 0.011 | tx/thread-89/transactor.triplex-function | driver.publication.persist-deferred 1.467ms; driver.publication.persist-deferred 0.987ms; driver.publication.persist-deferred 0.868ms |
| 88da82624ad85461000000000000040d | 35.277 | 3.575 | n/a | 0.000 | 6.772 | 7.308 | 0.836 | 0.023 | n/a | 0.064 | 15.145 | 1.531 | n/a | 0.022 | 10.348 | 0.293 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.148ms; driver.publication.persist-deferred 0.810ms; driver.publication.persist-deferred 0.702ms; driver.publication.persist-deferred 0.645ms |
| 88da82624ad8546100000000000006c2 | 33.813 | 1.375 | n/a | 0.000 | 0.287 | 0.212 | 0.756 | 0.006 | n/a | 0.202 | 12.314 | 18.652 | n/a | 0.009 | 1.662 | 0.049 | 0.009 | tx/thread-89/transactor.triplex-function | driver.expected-state.bind-receipt 1.560ms; driver.publication.persist-deferred 1.063ms |
| 88da82624ad854610000000000000775 | 33.084 | 2.671 | n/a | 0.000 | 0.302 | 0.732 | 0.731 | 0.011 | n/a | 0.052 | 28.129 | 0.434 | n/a | 0.022 | 2.973 | 0.090 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 4.685ms; driver.publication.persist-deferred 0.667ms; driver.publication.persist-deferred 0.359ms; driver.publication.persist-deferred 0.207ms |
| 88da82624ad85461000000000000042f | 32.475 | 2.209 | n/a | 0.000 | 0.594 | 0.666 | 0.982 | 0.018 | n/a | 0.090 | 16.744 | 11.155 | n/a | 0.017 | 2.803 | 0.086 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad8546100000000000004a9 | 31.844 | 4.854 | n/a | 0.000 | 0.682 | 0.453 | 1.035 | 0.018 | n/a | 2.087 | 20.281 | 2.425 | n/a | 0.008 | 5.537 | 0.174 | 0.008 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.136ms; driver.publication.persist-deferred 0.927ms; driver.publication.persist-deferred 0.907ms; driver.publication.persist-deferred 0.892ms |
| 88da82624ad85461000000000000081d | 31.360 | 2.721 | n/a | 0.000 | 7.383 | 11.832 | 1.236 | 0.025 | n/a | 0.069 | 7.277 | 0.772 | n/a | 0.046 | 10.104 | 0.322 | 0.046 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 3.901ms; driver.publication.persist-deferred 0.878ms; driver.publication.persist-deferred 0.622ms |
| 88da82624ad8546100000000000006b8 | 30.231 | 1.509 | n/a | 0.000 | 2.735 | 0.343 | 0.629 | 0.007 | n/a | 0.077 | 17.793 | 7.127 | n/a | 0.011 | 4.244 | 0.140 | 0.011 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.892ms; driver.publication.persist-deferred 0.676ms; driver.publication.persist-deferred 0.635ms |
| 88da82624ad8546100000000000003a2 | 29.033 | 2.009 | n/a | 0.000 | 1.598 | 1.168 | 0.967 | 0.020 | n/a | 0.454 | 9.749 | 13.045 | n/a | 0.023 | 3.608 | 0.124 | 0.023 | tx/thread-89/transactor.triplex-function | client.encode 1.570ms; driver.publication.persist-deferred 0.984ms; driver.publication.persist-deferred 0.899ms; driver.publication.persist-deferred 0.614ms; driver.publication.persist-deferred 0.596ms |
| 88da82624ad8546100000000000002e4 | 28.090 | 5.807 | n/a | 0.000 | 0.379 | 6.049 | 6.591 | 0.049 | n/a | 0.211 | 8.232 | 0.749 | n/a | 0.022 | 6.186 | 0.220 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / tail / commit (2626 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.811 | 0.224 | 0.000 | 0.481 | 2.135 | n/a | 0.000 | 0.698 | 0.561 | 0.938 | 0.013 | n/a | 0.083 | 4.119 | 0.740 | n/a | 0.013 | 2.980 | 0.289 | 0.013 |
| p99 | 49.548 | 2.007 | 0.021 | 2.038 | 6.893 | n/a | 0.000 | 12.507 | 7.751 | 7.195 | 0.049 | n/a | 2.036 | 31.491 | 7.695 | n/a | 0.040 | 15.278 | 0.652 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad854610000000000001649 | 96.811 | 6.850 | n/a | 0.000 | 0.423 | 39.260 | 29.733 | 0.045 | n/a | 0.823 | 17.733 | 1.934 | n/a | 0.011 | 7.273 | 0.075 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.201ms; driver.publication.persist-deferred 1.146ms; driver.publication.persist-deferred 0.992ms; driver.publication.persist-deferred 0.976ms; driver.publication.persist-deferred 0.936ms |
| 88da82624ad8546100000000000009ad | 81.939 | 2.962 | n/a | 0.000 | 0.347 | 3.131 | 1.131 | 0.009 | n/a | 0.060 | 70.091 | 4.199 | n/a | 0.009 | 3.309 | 0.040 | 0.009 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.963ms; driver.publication.persist-deferred 0.940ms; driver.publication.persist-deferred 0.861ms; driver.publication.persist-deferred 0.798ms; driver.publication.persist-deferred 0.746ms |
| 88da82624ad8546100000000000009ac | 81.571 | 1.381 | n/a | 0.000 | 0.178 | 1.509 | 1.052 | 0.008 | n/a | 0.052 | 57.173 | 20.204 | n/a | 0.014 | 1.558 | 0.019 | 0.014 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.940ms; driver.publication.persist-deferred 0.861ms; driver.publication.persist-deferred 0.798ms; driver.publication.persist-deferred 0.746ms; driver.publication.persist-deferred 0.655ms |
| 88da82624ad854610000000000001053 | 74.462 | 3.001 | 0.164 | 0.000 | 0.014 | 3.863 | 25.664 | 0.015 | n/a | 0.494 | 10.631 | 30.605 | n/a | 0.009 | 3.180 | 0.043 | 0.009 | tx/thread-89/transactor.triplex-function | driver.publication.persist-deferred 1.211ms; driver.expected-state.bind-receipt 1.116ms; driver.publication.persist-deferred 0.821ms |
| 88da82624ad8546100000000000011f2 | 72.575 | 7.640 | n/a | 0.000 | 0.234 | 24.043 | 2.897 | 0.043 | n/a | 0.219 | 36.926 | 0.563 | n/a | 0.010 | 7.874 | 0.108 | 0.010 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 6.043ms; driver.publication.persist-deferred 1.424ms; driver.publication.persist-deferred 1.111ms; driver.publication.persist-deferred 0.906ms |
| 88da82624ad8546100000000000009ae | 71.493 | 1.564 | n/a | 0.000 | 0.373 | 2.604 | 0.795 | 0.021 | n/a | 0.099 | 64.831 | 1.190 | n/a | 0.015 | 1.937 | 0.027 | 0.015 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.963ms; driver.publication.persist-deferred 0.940ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.861ms; driver.publication.persist-deferred 0.798ms |
| 88da82624ad8546100000000000009af | 69.036 | 1.458 | n/a | 0.000 | 6.543 | 0.592 | 1.751 | 0.082 | n/a | 0.283 | 53.290 | 5.025 | n/a | 0.011 | 8.001 | 0.116 | 0.011 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.963ms; driver.publication.persist-deferred 0.940ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.861ms; driver.publication.persist-deferred 0.798ms |
| 88da82624ad85461000000000000164f | 66.364 | 3.365 | n/a | 2.430 | 48.896 | 0.343 | 0.844 | 0.008 | n/a | 0.222 | 7.725 | 2.521 | n/a | 0.010 | 54.691 | 0.824 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.146ms; driver.publication.persist-deferred 0.992ms; driver.publication.persist-deferred 0.936ms; driver.publication.persist-deferred 0.750ms; driver.publication.persist-deferred 0.729ms |
| 88da82624ad854610000000000000d5f | 64.035 | 6.595 | n/a | 0.000 | 3.303 | 17.746 | 2.573 | 0.029 | n/a | 0.347 | 33.220 | 0.201 | n/a | 0.021 | 9.898 | 0.155 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.151ms; driver.publication.persist-deferred 1.338ms; driver.publication.persist-deferred 1.242ms; driver.publication.persist-deferred 1.130ms; driver.publication.persist-deferred 0.959ms |
| 88da82624ad854610000000000001056 | 62.610 | 1.617 | n/a | 0.000 | 0.555 | 15.863 | 0.387 | 0.003 | n/a | 0.019 | 43.590 | 0.565 | n/a | 0.011 | 2.172 | 0.035 | 0.011 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.211ms; driver.expected-state.bind-receipt 1.116ms; driver.publication.persist-deferred 0.821ms |
| 88da82624ad8546100000000000009da | 59.588 | 8.351 | n/a | 0.000 | 2.248 | 0.522 | 1.352 | 0.013 | n/a | 0.064 | 30.535 | 16.473 | n/a | 0.029 | 10.599 | 0.178 | 0.029 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.282ms; driver.expected-state.bind-receipt 1.263ms; driver.publication.persist-deferred 1.038ms; driver.publication.persist-deferred 0.846ms; driver.publication.persist-deferred 0.524ms |
| 88da82624ad8546100000000000011f0 | 58.426 | 3.390 | n/a | 0.000 | 0.822 | 2.741 | 1.818 | 0.021 | n/a | 0.483 | 38.442 | 10.695 | n/a | 0.014 | 4.212 | 0.072 | 0.014 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 88da82624ad85461000000000000164c | 56.908 | 2.536 | n/a | 0.000 | 34.782 | 3.283 | 0.395 | 0.003 | n/a | 0.021 | 15.479 | 0.389 | n/a | 0.019 | 37.319 | 0.656 | 0.019 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.146ms; driver.publication.persist-deferred 0.976ms; driver.publication.persist-deferred 0.936ms; driver.publication.persist-deferred 0.750ms; driver.publication.persist-deferred 0.729ms |
| 88da82624ad85461000000000000153b | 56.335 | 1.113 | n/a | 0.000 | 49.665 | 0.260 | 0.568 | 0.008 | n/a | 0.154 | 2.527 | 2.031 | n/a | 0.009 | 50.778 | 0.901 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.520ms; driver.publication.persist-deferred 1.068ms; driver.publication.persist-deferred 0.843ms; driver.publication.persist-deferred 0.741ms; driver.publication.persist-deferred 0.731ms |
| 88da82624ad85461000000000000170a | 56.224 | 1.228 | n/a | 0.000 | 0.791 | 2.215 | 1.018 | 0.012 | n/a | 0.040 | 17.279 | 33.631 | n/a | 0.008 | 2.019 | 0.036 | 0.008 | tx/thread-89/transactor.triplex-function | driver.publication.persist-deferred 0.795ms |
| 88da82624ad854610000000000000d78 | 56.028 | 2.944 | n/a | 0.000 | 24.975 | 0.673 | 3.714 | 0.005 | n/a | 0.460 | 20.387 | 2.859 | n/a | 0.011 | 27.919 | 0.498 | 0.011 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 0.890ms; driver.publication.persist-deferred 0.773ms |
| 88da82624ad8546100000000000009ab | 55.591 | 1.182 | n/a | 0.000 | 0.829 | 1.685 | 0.813 | 0.011 | n/a | 0.066 | 47.509 | 3.487 | n/a | 0.009 | 2.010 | 0.036 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.940ms; driver.publication.persist-deferred 0.861ms; driver.publication.persist-deferred 0.798ms; driver.publication.persist-deferred 0.746ms |
| 88da82624ad8546100000000000009aa | 55.529 | 1.379 | n/a | 0.000 | 0.377 | 0.415 | 1.088 | 0.012 | n/a | 0.100 | 48.125 | 4.019 | n/a | 0.013 | 1.757 | 0.032 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.940ms; driver.publication.persist-deferred 0.798ms; driver.publication.persist-deferred 0.746ms |
| 88da82624ad854610000000000001057 | 54.802 | 5.736 | n/a | 0.000 | 0.208 | 0.662 | 2.456 | 0.010 | n/a | 0.322 | 38.025 | 7.351 | n/a | 0.034 | 5.944 | 0.108 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.211ms; driver.expected-state.bind-receipt 1.116ms; driver.publication.persist-deferred 0.853ms; driver.publication.persist-deferred 0.821ms |
| 88da82624ad8546100000000000009a5 | 53.788 | 3.241 | n/a | 0.000 | 0.022 | 2.660 | 1.362 | 0.030 | n/a | 0.075 | 41.514 | 4.874 | n/a | 0.010 | 3.263 | 0.061 | 0.010 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.873ms; driver.publication.persist-deferred 0.798ms |

## P2 / tail / commit / 5-10 facts (1560 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.468 | 0.000 | 0.000 | 0.378 | 1.686 | n/a | 0.000 | 0.730 | 0.542 | 0.801 | 0.012 | n/a | 0.083 | 3.846 | 0.555 | n/a | 0.013 | 2.526 | 0.273 | 0.013 |
| p99 | 48.244 | 1.675 | 0.000 | 0.876 | 5.237 | n/a | 0.000 | 13.209 | 6.395 | 4.216 | 0.047 | n/a | 1.946 | 33.312 | 5.727 | n/a | 0.040 | 15.110 | 0.648 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88da82624ad854610000000000001649 | 96.811 | 6.850 | n/a | 0.000 | 0.423 | 39.260 | 29.733 | 0.045 | n/a | 0.823 | 17.733 | 1.934 | n/a | 0.011 | 7.273 | 0.075 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.201ms; driver.publication.persist-deferred 1.146ms; driver.publication.persist-deferred 0.992ms; driver.publication.persist-deferred 0.976ms; driver.publication.persist-deferred 0.936ms |
| 88da82624ad8546100000000000009ac | 81.571 | 1.381 | n/a | 0.000 | 0.178 | 1.509 | 1.052 | 0.008 | n/a | 0.052 | 57.173 | 20.204 | n/a | 0.014 | 1.558 | 0.019 | 0.014 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.940ms; driver.publication.persist-deferred 0.861ms; driver.publication.persist-deferred 0.798ms; driver.publication.persist-deferred 0.746ms; driver.publication.persist-deferred 0.655ms |
| 88da82624ad8546100000000000011f2 | 72.575 | 7.640 | n/a | 0.000 | 0.234 | 24.043 | 2.897 | 0.043 | n/a | 0.219 | 36.926 | 0.563 | n/a | 0.010 | 7.874 | 0.108 | 0.010 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 6.043ms; driver.publication.persist-deferred 1.424ms; driver.publication.persist-deferred 1.111ms; driver.publication.persist-deferred 0.906ms |
| 88da82624ad8546100000000000009ae | 71.493 | 1.564 | n/a | 0.000 | 0.373 | 2.604 | 0.795 | 0.021 | n/a | 0.099 | 64.831 | 1.190 | n/a | 0.015 | 1.937 | 0.027 | 0.015 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.963ms; driver.publication.persist-deferred 0.940ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.861ms; driver.publication.persist-deferred 0.798ms |
| 88da82624ad8546100000000000009af | 69.036 | 1.458 | n/a | 0.000 | 6.543 | 0.592 | 1.751 | 0.082 | n/a | 0.283 | 53.290 | 5.025 | n/a | 0.011 | 8.001 | 0.116 | 0.011 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.963ms; driver.publication.persist-deferred 0.940ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.861ms; driver.publication.persist-deferred 0.798ms |
| 88da82624ad854610000000000000d5f | 64.035 | 6.595 | n/a | 0.000 | 3.303 | 17.746 | 2.573 | 0.029 | n/a | 0.347 | 33.220 | 0.201 | n/a | 0.021 | 9.898 | 0.155 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.151ms; driver.publication.persist-deferred 1.338ms; driver.publication.persist-deferred 1.242ms; driver.publication.persist-deferred 1.130ms; driver.publication.persist-deferred 0.959ms |
| 88da82624ad854610000000000001056 | 62.610 | 1.617 | n/a | 0.000 | 0.555 | 15.863 | 0.387 | 0.003 | n/a | 0.019 | 43.590 | 0.565 | n/a | 0.011 | 2.172 | 0.035 | 0.011 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.211ms; driver.expected-state.bind-receipt 1.116ms; driver.publication.persist-deferred 0.821ms |
| 88da82624ad85461000000000000153b | 56.335 | 1.113 | n/a | 0.000 | 49.665 | 0.260 | 0.568 | 0.008 | n/a | 0.154 | 2.527 | 2.031 | n/a | 0.009 | 50.778 | 0.901 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.520ms; driver.publication.persist-deferred 1.068ms; driver.publication.persist-deferred 0.843ms; driver.publication.persist-deferred 0.741ms; driver.publication.persist-deferred 0.731ms |
| 88da82624ad85461000000000000170a | 56.224 | 1.228 | n/a | 0.000 | 0.791 | 2.215 | 1.018 | 0.012 | n/a | 0.040 | 17.279 | 33.631 | n/a | 0.008 | 2.019 | 0.036 | 0.008 | tx/thread-89/transactor.triplex-function | driver.publication.persist-deferred 0.795ms |
| 88da82624ad854610000000000000d78 | 56.028 | 2.944 | n/a | 0.000 | 24.975 | 0.673 | 3.714 | 0.005 | n/a | 0.460 | 20.387 | 2.859 | n/a | 0.011 | 27.919 | 0.498 | 0.011 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 0.890ms; driver.publication.persist-deferred 0.773ms |
| 88da82624ad8546100000000000009ab | 55.591 | 1.182 | n/a | 0.000 | 0.829 | 1.685 | 0.813 | 0.011 | n/a | 0.066 | 47.509 | 3.487 | n/a | 0.009 | 2.010 | 0.036 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.940ms; driver.publication.persist-deferred 0.861ms; driver.publication.persist-deferred 0.798ms; driver.publication.persist-deferred 0.746ms |
| 88da82624ad8546100000000000009aa | 55.529 | 1.379 | n/a | 0.000 | 0.377 | 0.415 | 1.088 | 0.012 | n/a | 0.100 | 48.125 | 4.019 | n/a | 0.013 | 1.757 | 0.032 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.940ms; driver.publication.persist-deferred 0.798ms; driver.publication.persist-deferred 0.746ms |
| 88da82624ad8546100000000000009dd | 51.716 | 1.530 | n/a | 0.000 | 1.636 | 3.556 | 0.773 | 0.011 | n/a | 0.058 | 38.603 | 5.537 | n/a | 0.012 | 3.167 | 0.061 | 0.012 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.502ms; driver.expected-state.bind-receipt 1.263ms; driver.publication.persist-deferred 1.038ms; driver.publication.persist-deferred 0.920ms; driver.publication.persist-deferred 0.846ms |
| 88da82624ad8546100000000000011f1 | 50.544 | 1.595 | n/a | 0.000 | 0.964 | 5.753 | 0.694 | 0.013 | n/a | 0.060 | 41.129 | 0.324 | n/a | 0.013 | 2.559 | 0.051 | 0.013 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.424ms |
| 88da82624ad854610000000000000d77 | 49.343 | 3.278 | n/a | 0.000 | 24.213 | 4.335 | 1.000 | 0.024 | n/a | 0.098 | 10.850 | 5.524 | n/a | 0.021 | 27.491 | 0.557 | 0.021 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 0.890ms |
| 88da82624ad85461000000000000187d | 48.244 | 1.537 | n/a | 0.000 | 0.864 | 0.334 | 2.377 | 0.021 | n/a | 0.063 | 42.775 | 0.265 | n/a | 0.007 | 2.401 | 0.050 | 0.007 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.206ms; driver.publication.persist-deferred 1.603ms |
| 88da82624ad8546100000000000009b5 | 47.279 | 1.883 | n/a | 0.000 | 0.694 | 0.677 | 0.917 | 0.012 | n/a | 0.075 | 39.606 | 3.397 | n/a | 0.018 | 2.577 | 0.054 | 0.018 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.932ms; driver.publication.persist-deferred 0.963ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.726ms |
| 88da82624ad85461000000000000164a | 42.511 | 2.575 | n/a | 0.000 | 0.785 | 4.912 | 0.331 | 0.003 | n/a | 0.013 | 33.177 | 0.700 | n/a | 0.015 | 3.360 | 0.079 | 0.015 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.146ms; driver.publication.persist-deferred 0.976ms |
| 88da82624ad85461000000000000105a | 42.369 | 1.777 | n/a | 0.000 | 0.082 | 2.938 | 1.238 | 0.022 | n/a | 0.442 | 35.268 | 0.585 | n/a | 0.017 | 1.858 | 0.044 | 0.017 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.853ms; driver.publication.persist-deferred 0.840ms |
| 88da82624ad85461000000000000105f | 42.025 | 1.455 | n/a | 0.000 | 22.521 | 5.865 | 0.899 | 0.018 | n/a | 1.301 | 8.406 | 1.551 | n/a | 0.010 | 23.976 | 0.571 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.580ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.095ms; driver.publication.persist-deferred 0.954ms; driver.publication.persist-deferred 0.853ms |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.176 | n/a | n/a | n/a | 0.109 | n/a | 0.000 | 0.000 | 1.181 | 200.471 | 0.010 | n/a | 0.031 | 0.000 | n/a | n/a | 0.147 | 0.109 | 0.001 | 0.147 |
| p99 | 376.636 | n/a | n/a | n/a | 19.478 | n/a | 1.467 | 0.000 | 4.436 | 372.199 | 0.100 | n/a | 0.695 | 0.000 | n/a | n/a | 0.294 | 20.135 | 0.340 | 0.294 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3537b0bff99134870000000000000002 | 376.636 | 2.626 | n/a | 0.000 | 0.000 | 1.338 | 372.199 | 0.100 | n/a | 0.080 | 0.000 | n/a | n/a | 0.294 | 2.626 | 0.007 | 0.294 | gw-r/thread-41/gateway.admitted-work | none observed |
| 37cd8c891302942d0000000000000006 | 203.331 | 0.109 | n/a | 0.000 | 0.000 | 1.181 | 201.231 | 0.019 | n/a | 0.695 | 0.000 | n/a | n/a | 0.096 | 0.109 | 0.001 | 0.096 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d0000000000000005 | 202.679 | 0.045 | n/a | 0.000 | 0.000 | 1.006 | 201.227 | 0.013 | n/a | 0.240 | 0.000 | n/a | n/a | 0.147 | 0.045 | 0.000 | 0.147 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d0000000000000f38 | 201.220 | 0.051 | n/a | 0.000 | 0.000 | 0.574 | 200.461 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.098 | 0.051 | 0.000 | 0.098 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d0000000000000f39 | 201.176 | 0.044 | n/a | 0.000 | 0.000 | 0.544 | 200.471 | 0.007 | n/a | 0.025 | 0.000 | n/a | n/a | 0.085 | 0.044 | 0.000 | 0.085 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d0000000000000f3a | 201.006 | 0.025 | n/a | 0.000 | 0.000 | 0.274 | 200.603 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.045 | 0.025 | 0.000 | 0.045 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d0000000000000f3f | 66.471 | 18.932 | n/a | 1.203 | 0.000 | 4.436 | 41.636 | 0.010 | n/a | 0.011 | 0.000 | n/a | n/a | 0.243 | 20.135 | 0.303 | 0.243 | gw-r/thread-41/gateway.admitted-work | none observed |
| 37cd8c891302942d0000000000000f3d | 57.433 | 17.457 | n/a | 1.467 | 0.000 | 4.401 | 33.871 | 0.004 | n/a | 0.003 | 0.000 | n/a | n/a | 0.229 | 18.923 | 0.329 | 0.229 | gw-r/thread-48/gateway.admitted-work | none observed |
| 37cd8c891302942d0000000000000f3e | 57.232 | 19.478 | n/a | 0.000 | 0.000 | 3.284 | 34.308 | 0.006 | n/a | 0.007 | 0.000 | n/a | n/a | 0.148 | 19.478 | 0.340 | 0.148 | gw-r/thread-46/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.840 | n/a | n/a | n/a | 1.694 | n/a | 0.000 | 0.000 | 0.462 | 7.708 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.146 | 1.694 | 0.030 | 0.146 |
| p99 | 1004.318 | n/a | n/a | n/a | 25.931 | n/a | 0.000 | 0.000 | 1.395 | 997.719 | 0.013 | n/a | 3.696 | 0.000 | n/a | n/a | 1.229 | 25.931 | 0.554 | 1.229 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3537b0bff991348700000000000000a4 | 1004.318 | 0.266 | n/a | 0.000 | 0.000 | 1.395 | 997.719 | 0.013 | n/a | 3.696 | 0.000 | n/a | n/a | 1.229 | 0.266 | 0.000 | 1.229 | gw-r/thread-45/journal/page | none observed |
| 3537b0bff991348700000000000000a5 | 860.167 | 25.931 | n/a | 0.000 | 0.000 | 0.960 | 832.806 | 0.007 | n/a | 0.195 | 0.000 | n/a | n/a | 0.269 | 25.931 | 0.030 | 0.269 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff9913487000000000000082c | 13.840 | 5.483 | n/a | 0.000 | 0.000 | 0.462 | 7.708 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.146 | 5.483 | 0.396 | 0.146 | node-14/thread-2/replica.fetch-feed | none observed |
| 3537b0bff99134870000000000000829 | 3.058 | 1.694 | n/a | 0.000 | 0.000 | 0.455 | 0.839 | 0.004 | n/a | 0.008 | 0.000 | n/a | n/a | 0.058 | 1.694 | 0.554 | 0.058 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 468.256 | n/a | n/a | n/a | 2.531 | n/a | 0.000 | 0.000 | 0.717 | 462.756 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 0.080 | 2.531 | 0.006 | 0.080 |
| p99 | 1006.873 | n/a | n/a | n/a | 8.050 | n/a | 0.000 | 0.000 | 3.609 | 1003.809 | 0.021 | n/a | 3.690 | 0.000 | n/a | n/a | 0.194 | 8.050 | 0.105 | 0.194 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3537b0bff991348700000000000000bb | 1006.873 | 2.338 | n/a | 0.000 | 0.000 | 0.560 | 1003.809 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.086 | 2.338 | 0.002 | 0.086 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff991348700000000000000ae | 995.264 | 2.585 | n/a | 0.000 | 0.000 | 0.592 | 991.905 | 0.012 | n/a | 0.095 | 0.000 | n/a | n/a | 0.076 | 2.585 | 0.003 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff991348700000000000000ba | 988.474 | 2.501 | n/a | 0.000 | 0.000 | 0.596 | 985.193 | 0.013 | n/a | 0.090 | 0.000 | n/a | n/a | 0.080 | 2.501 | 0.003 | 0.080 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff991348700000000000000b4 | 987.445 | 4.810 | n/a | 0.000 | 0.000 | 0.647 | 981.320 | 0.013 | n/a | 0.461 | 0.000 | n/a | n/a | 0.194 | 4.810 | 0.005 | 0.194 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff991348700000000000000cf | 984.317 | 4.767 | n/a | 0.000 | 0.000 | 0.790 | 978.527 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 0.156 | 4.767 | 0.005 | 0.156 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff991348700000000000000ab | 941.023 | 2.531 | n/a | 0.000 | 0.000 | 0.629 | 934.023 | 0.012 | n/a | 3.690 | 0.000 | n/a | n/a | 0.138 | 2.531 | 0.003 | 0.138 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff991348700000000000000a8 | 892.400 | 3.323 | n/a | 0.000 | 0.000 | 0.717 | 888.156 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.119 | 3.323 | 0.004 | 0.119 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff991348700000000000000c1 | 891.737 | 8.050 | n/a | 0.000 | 0.000 | 0.814 | 882.700 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.111 | 8.050 | 0.009 | 0.111 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff991348700000000000000ca | 736.140 | 4.224 | n/a | 0.000 | 0.000 | 0.621 | 730.972 | 0.016 | n/a | 0.113 | 0.000 | n/a | n/a | 0.194 | 4.224 | 0.006 | 0.194 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff991348700000000000000b2 | 587.833 | 3.953 | n/a | 0.000 | 0.000 | 0.888 | 582.759 | 0.020 | n/a | 0.138 | 0.000 | n/a | n/a | 0.075 | 3.953 | 0.007 | 0.075 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff991348700000000000000c8 | 527.835 | 3.173 | n/a | 0.000 | 0.000 | 3.609 | 520.900 | 0.012 | n/a | 0.062 | 0.000 | n/a | n/a | 0.079 | 3.173 | 0.006 | 0.079 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff991348700000000000000c4 | 517.521 | 1.811 | n/a | 0.000 | 0.000 | 0.448 | 515.071 | 0.018 | n/a | 0.102 | 0.000 | n/a | n/a | 0.072 | 1.811 | 0.003 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff991348700000000000000bf | 494.842 | 2.375 | n/a | 0.000 | 0.000 | 1.086 | 491.220 | 0.011 | n/a | 0.076 | 0.000 | n/a | n/a | 0.074 | 2.375 | 0.005 | 0.074 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff991348700000000000000c7 | 491.954 | 2.165 | n/a | 0.000 | 0.000 | 1.808 | 487.836 | 0.011 | n/a | 0.066 | 0.000 | n/a | n/a | 0.068 | 2.165 | 0.004 | 0.068 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff991348700000000000000c6 | 468.256 | 2.406 | n/a | 0.000 | 0.000 | 2.958 | 462.756 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.074 | 2.406 | 0.005 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff991348700000000000000b7 | 439.870 | 2.462 | n/a | 0.000 | 0.000 | 0.499 | 436.769 | 0.012 | n/a | 0.058 | 0.000 | n/a | n/a | 0.069 | 2.462 | 0.006 | 0.069 | gw-r/thread-45/journal/page | none observed |
| 3537b0bff991348700000000000000b5 | 328.132 | 5.034 | n/a | 0.000 | 0.000 | 0.465 | 322.406 | 0.020 | n/a | 0.114 | 0.000 | n/a | n/a | 0.093 | 5.034 | 0.015 | 0.093 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff991348700000000000000b1 | 288.511 | 4.619 | n/a | 0.000 | 0.000 | 3.024 | 280.636 | 0.019 | n/a | 0.081 | 0.000 | n/a | n/a | 0.132 | 4.619 | 0.016 | 0.132 | gw-r/thread-45/journal/page | none observed |
| 3537b0bff991348700000000000000a7 | 266.480 | 2.408 | n/a | 0.000 | 0.000 | 0.881 | 262.952 | 0.013 | n/a | 0.122 | 0.000 | n/a | n/a | 0.104 | 2.408 | 0.009 | 0.104 | gw-r/thread-45/journal/page | none observed |
| 3537b0bff991348700000000000000bd | 256.294 | 1.927 | n/a | 0.000 | 0.000 | 0.634 | 253.576 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.076 | 1.927 | 0.008 | 0.076 | gw-r/thread-47/journal/page | none observed |

## P3 / L1 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 475.817 | n/a | n/a | n/a | 3.612 | n/a | 0.471 | 0.000 | 0.719 | 466.753 | 0.012 | n/a | 0.068 | 0.000 | n/a | n/a | 0.075 | 4.096 | 0.010 | 0.075 |
| p99 | 1008.643 | n/a | n/a | n/a | 16.102 | n/a | 1.664 | 0.000 | 4.129 | 1003.398 | 0.040 | n/a | 0.176 | 0.000 | n/a | n/a | 3.510 | 16.970 | 0.305 | 3.510 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3537b0bff9913487000000000000010c | 1008.643 | 4.545 | n/a | 0.000 | 0.000 | 0.590 | 1003.398 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.061 | 4.545 | 0.005 | 0.061 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff991348700000000000000d1 | 1005.378 | 3.829 | n/a | 0.471 | 0.000 | 0.645 | 1000.178 | 0.040 | n/a | 0.126 | 0.000 | n/a | n/a | 0.088 | 4.300 | 0.004 | 0.088 | gw-r/thread-44/journal/page | none observed |
| 3537b0bff991348700000000000000d7 | 1004.590 | 0.114 | n/a | 0.000 | 0.000 | 1.899 | 1001.271 | 0.021 | n/a | 0.176 | 0.000 | n/a | n/a | 1.108 | 0.114 | 0.000 | 1.108 | gw-r/thread-45/journal/page | none observed |
| 3537b0bff991348700000000000000fd | 1001.650 | 2.570 | n/a | 0.567 | 0.000 | 0.555 | 997.813 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.090 | 3.137 | 0.003 | 0.090 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff991348700000000000000de | 1001.212 | 3.126 | n/a | 0.395 | 0.000 | 0.685 | 996.787 | 0.014 | n/a | 0.074 | 0.000 | n/a | n/a | 0.131 | 3.521 | 0.004 | 0.131 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff991348700000000000000d0 | 1001.058 | 8.980 | n/a | 0.743 | 0.000 | 2.976 | 988.159 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.122 | 9.722 | 0.010 | 0.122 | gw-r/thread-45/journal/page | none observed |
| 3537b0bff99134870000000000000104 | 986.800 | 2.881 | n/a | 0.000 | 0.000 | 0.473 | 979.878 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 3.510 | 2.881 | 0.003 | 3.510 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff99134870000000000000100 | 933.866 | 5.794 | n/a | 0.000 | 0.000 | 4.129 | 923.667 | 0.013 | n/a | 0.093 | 0.000 | n/a | n/a | 0.170 | 5.794 | 0.006 | 0.170 | gw-r/thread-44/journal/page | none observed |
| 3537b0bff991348700000000000000dd | 917.189 | 4.365 | n/a | 0.549 | 0.000 | 0.400 | 911.631 | 0.011 | n/a | 0.060 | 0.000 | n/a | n/a | 0.172 | 4.915 | 0.005 | 0.172 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff991348700000000000000df | 899.289 | 3.785 | n/a | 0.458 | 0.000 | 0.479 | 894.414 | 0.012 | n/a | 0.070 | 0.000 | n/a | n/a | 0.071 | 4.243 | 0.005 | 0.071 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff991348700000000000000d9 | 895.678 | 3.612 | n/a | 0.484 | 0.000 | 0.388 | 891.075 | 0.009 | n/a | 0.033 | 0.000 | n/a | n/a | 0.076 | 4.096 | 0.005 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff99134870000000000000101 | 878.196 | 4.544 | n/a | 0.722 | 0.000 | 0.682 | 872.005 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 0.165 | 5.267 | 0.006 | 0.165 | gw-r/thread-45/journal/page | none observed |
| 3537b0bff991348700000000000000e4 | 717.786 | 3.637 | n/a | 0.829 | 0.000 | 0.537 | 712.637 | 0.011 | n/a | 0.060 | 0.000 | n/a | n/a | 0.075 | 4.466 | 0.006 | 0.075 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff991348700000000000000ea | 667.682 | 2.566 | n/a | 0.568 | 0.000 | 1.198 | 663.225 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.070 | 3.134 | 0.005 | 0.070 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff991348700000000000000fa | 664.677 | 5.532 | n/a | 0.000 | 0.000 | 0.719 | 658.280 | 0.014 | n/a | 0.061 | 0.000 | n/a | n/a | 0.072 | 5.532 | 0.008 | 0.072 | gw-r/thread-45/journal/page | none observed |
| 3537b0bff991348700000000000000da | 601.930 | 9.437 | n/a | 1.664 | 0.000 | 1.335 | 589.323 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.088 | 11.101 | 0.018 | 0.088 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff991348700000000000000e7 | 505.552 | 3.054 | n/a | 0.623 | 0.000 | 0.510 | 501.164 | 0.019 | n/a | 0.083 | 0.000 | n/a | n/a | 0.098 | 3.677 | 0.007 | 0.098 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff991348700000000000000dc | 492.813 | 3.106 | n/a | 0.461 | 0.000 | 0.778 | 488.282 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 0.085 | 3.567 | 0.007 | 0.085 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff991348700000000000000e5 | 492.463 | 3.692 | n/a | 0.521 | 0.000 | 0.376 | 487.700 | 0.019 | n/a | 0.083 | 0.000 | n/a | n/a | 0.072 | 4.213 | 0.009 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff991348700000000000000d2 | 490.534 | 4.713 | n/a | 0.495 | 0.000 | 0.788 | 484.399 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.078 | 5.207 | 0.011 | 0.078 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / internal (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 462.575 | n/a | n/a | n/a | 3.944 | n/a | 0.000 | 0.000 | 0.654 | 458.737 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.076 | 3.944 | 0.009 | 0.076 |
| p99 | 1003.587 | n/a | n/a | n/a | 8.936 | n/a | 1.600 | 0.000 | 2.464 | 1000.198 | 0.034 | n/a | 3.701 | 0.000 | n/a | n/a | 0.185 | 10.536 | 0.086 | 0.185 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3537b0bff99134870000000000000113 | 1003.587 | 2.976 | n/a | 0.750 | 0.000 | 0.517 | 999.203 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.089 | 3.726 | 0.004 | 0.089 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff99134870000000000000128 | 1003.354 | 2.479 | n/a | 0.000 | 0.000 | 0.542 | 1000.198 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.067 | 2.479 | 0.002 | 0.067 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff99134870000000000000124 | 1003.014 | 5.091 | n/a | 0.000 | 0.000 | 2.045 | 995.619 | 0.028 | n/a | 0.057 | 0.000 | n/a | n/a | 0.175 | 5.091 | 0.005 | 0.175 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff9913487000000000000011b | 999.074 | 2.551 | n/a | 0.563 | 0.000 | 0.362 | 995.436 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.099 | 3.114 | 0.003 | 0.099 | gw-r/thread-44/journal/page | none observed |
| 3537b0bff99134870000000000000129 | 996.700 | 2.850 | n/a | 0.000 | 0.000 | 0.482 | 993.247 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.069 | 2.850 | 0.003 | 0.069 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff99134870000000000000135 | 992.854 | 4.738 | n/a | 0.000 | 0.000 | 0.727 | 987.179 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.163 | 4.738 | 0.005 | 0.163 | gw-r/thread-44/journal/page | none observed |
| 3537b0bff99134870000000000000110 | 930.437 | 4.608 | n/a | 0.754 | 0.000 | 0.641 | 924.241 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.141 | 5.362 | 0.006 | 0.141 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff9913487000000000000013e | 923.500 | 5.565 | n/a | 0.000 | 0.000 | 0.544 | 917.276 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.065 | 5.565 | 0.006 | 0.065 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff99134870000000000000125 | 847.585 | 4.473 | n/a | 0.704 | 0.000 | 0.484 | 841.761 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.099 | 5.177 | 0.006 | 0.099 | gw-r/thread-45/journal/page | none observed |
| 3537b0bff9913487000000000000011c | 841.215 | 3.944 | n/a | 0.000 | 0.000 | 0.670 | 836.439 | 0.011 | n/a | 0.089 | 0.000 | n/a | n/a | 0.062 | 3.944 | 0.005 | 0.062 | gw-r/thread-45/journal/page | none observed |
| 3537b0bff9913487000000000000010d | 782.722 | 4.563 | n/a | 0.699 | 0.000 | 0.566 | 776.667 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.173 | 5.262 | 0.007 | 0.173 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff99134870000000000000132 | 779.699 | 5.865 | n/a | 1.231 | 0.000 | 0.731 | 771.689 | 0.007 | n/a | 0.084 | 0.000 | n/a | n/a | 0.093 | 7.096 | 0.009 | 0.093 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff99134870000000000000136 | 664.544 | 7.532 | n/a | 0.584 | 0.000 | 0.665 | 655.609 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.100 | 8.116 | 0.012 | 0.100 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff9913487000000000000013f | 660.859 | 4.185 | n/a | 0.591 | 0.000 | 0.391 | 651.888 | 0.034 | n/a | 3.701 | 0.000 | n/a | n/a | 0.068 | 4.776 | 0.007 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff99134870000000000000145 | 659.621 | 5.218 | n/a | 0.000 | 0.000 | 0.448 | 653.735 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.162 | 5.218 | 0.008 | 0.162 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff9913487000000000000013b | 624.513 | 3.597 | n/a | 0.000 | 0.000 | 0.968 | 619.809 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.060 | 3.597 | 0.006 | 0.060 | gw-r/thread-44/journal/page | none observed |
| 3537b0bff99134870000000000000131 | 610.673 | 3.773 | n/a | 0.000 | 0.000 | 0.811 | 605.951 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.084 | 3.773 | 0.006 | 0.084 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff99134870000000000000123 | 571.745 | 4.993 | n/a | 0.000 | 0.000 | 0.868 | 565.631 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.185 | 4.993 | 0.009 | 0.185 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff9913487000000000000012b | 550.065 | 3.472 | n/a | 0.000 | 0.000 | 0.819 | 545.653 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.059 | 3.472 | 0.006 | 0.059 | gw-r/thread-44/journal/page | none observed |
| 3537b0bff9913487000000000000012a | 462.575 | 2.280 | n/a | 0.000 | 0.000 | 1.456 | 458.737 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.061 | 2.280 | 0.005 | 0.061 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 483.897 | n/a | n/a | n/a | 2.746 | n/a | 0.000 | 0.000 | 0.590 | 477.897 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.073 | 2.814 | 0.007 | 0.073 |
| p99 | 1003.920 | n/a | n/a | n/a | 5.677 | n/a | 0.833 | 0.000 | 5.700 | 1000.694 | 4.255 | n/a | 0.986 | 0.000 | n/a | n/a | 1.176 | 5.739 | 0.783 | 1.176 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3537b0bff9913487000000000000017a | 1003.920 | 0.170 | n/a | 0.000 | 0.000 | 1.859 | 1000.694 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 1.136 | 0.170 | 0.000 | 1.136 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff99134870000000000000182 | 1002.663 | 0.181 | n/a | 0.000 | 0.000 | 0.586 | 1000.670 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 1.176 | 0.181 | 0.000 | 1.176 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff99134870000000000000161 | 1001.877 | 2.814 | n/a | 0.000 | 0.000 | 0.456 | 998.513 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.063 | 2.814 | 0.003 | 0.063 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff99134870000000000000151 | 997.245 | 2.452 | n/a | 0.000 | 0.000 | 5.700 | 988.970 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.085 | 2.452 | 0.002 | 0.085 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff9913487000000000000016a | 990.698 | 2.854 | n/a | 0.000 | 0.000 | 2.340 | 985.359 | 0.015 | n/a | 0.067 | 0.000 | n/a | n/a | 0.063 | 2.854 | 0.003 | 0.063 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff99134870000000000000181 | 929.574 | 4.790 | n/a | 0.000 | 0.000 | 0.765 | 923.808 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.146 | 4.790 | 0.005 | 0.146 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff9913487000000000000016f | 861.341 | 2.428 | n/a | 0.000 | 0.000 | 1.095 | 857.692 | 0.014 | n/a | 0.056 | 0.000 | n/a | n/a | 0.056 | 2.428 | 0.003 | 0.056 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff99134870000000000000152 | 838.451 | 3.754 | n/a | 0.000 | 0.000 | 0.796 | 830.261 | 3.468 | n/a | 0.055 | 0.000 | n/a | n/a | 0.117 | 3.754 | 0.004 | 0.117 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff99134870000000000000156 | 740.187 | 2.247 | n/a | 0.000 | 0.000 | 0.392 | 737.220 | 0.251 | n/a | 0.024 | 0.000 | n/a | n/a | 0.054 | 2.247 | 0.003 | 0.054 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff9913487000000000000014c | 700.211 | 4.457 | n/a | 0.000 | 0.000 | 1.688 | 693.853 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.172 | 4.457 | 0.006 | 0.172 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff99134870000000000000175 | 697.024 | 3.693 | n/a | 0.000 | 0.000 | 0.726 | 692.482 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.091 | 3.693 | 0.005 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff99134870000000000000162 | 628.823 | 5.577 | n/a | 0.000 | 0.000 | 0.516 | 622.625 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.071 | 5.577 | 0.009 | 0.071 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff9913487000000000000017f | 615.423 | 2.786 | n/a | 0.000 | 0.000 | 0.548 | 611.982 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.074 | 2.786 | 0.005 | 0.074 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff99134870000000000000169 | 551.434 | 2.149 | n/a | 0.622 | 0.000 | 0.402 | 548.114 | 0.012 | n/a | 0.057 | 0.000 | n/a | n/a | 0.079 | 2.771 | 0.005 | 0.079 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff99134870000000000000177 | 509.455 | 1.616 | n/a | 0.000 | 0.000 | 0.294 | 507.429 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.058 | 1.616 | 0.003 | 0.058 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff9913487000000000000016b | 509.132 | 5.154 | n/a | 0.000 | 0.000 | 0.590 | 503.280 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.062 | 5.154 | 0.010 | 0.062 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff99134870000000000000172 | 502.935 | 4.612 | n/a | 0.000 | 0.000 | 0.631 | 497.518 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.145 | 4.612 | 0.009 | 0.145 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff99134870000000000000184 | 500.471 | 4.906 | n/a | 0.833 | 0.000 | 0.490 | 494.040 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.171 | 5.739 | 0.011 | 0.171 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff99134870000000000000171 | 499.576 | 2.641 | n/a | 0.000 | 0.000 | 0.431 | 496.356 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.114 | 2.641 | 0.005 | 0.114 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff99134870000000000000185 | 496.485 | 2.844 | n/a | 0.000 | 0.000 | 0.527 | 492.983 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.068 | 2.844 | 0.006 | 0.068 | gw-r/thread-44/journal/page | none observed |

## P3 / L64 / internal (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 316.192 | n/a | n/a | n/a | 2.672 | n/a | 0.000 | 0.000 | 0.618 | 312.854 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.063 | 2.672 | 0.011 | 0.063 |
| p99 | 1018.628 | n/a | n/a | n/a | 8.376 | n/a | 1.692 | 0.000 | 5.893 | 1014.275 | 6.101 | n/a | 0.083 | 0.000 | n/a | n/a | 1.106 | 8.376 | 0.345 | 1.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3537b0bff99134870000000000000187 | 1018.628 | 3.261 | n/a | 0.000 | 0.000 | 0.987 | 1014.275 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.057 | 3.261 | 0.003 | 0.057 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff991348700000000000001a3 | 1008.851 | 3.440 | n/a | 0.000 | 0.000 | 1.427 | 1000.515 | 3.358 | n/a | 0.046 | 0.000 | n/a | n/a | 0.064 | 3.440 | 0.003 | 0.064 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff99134870000000000000196 | 1004.215 | 2.226 | n/a | 0.000 | 0.000 | 3.126 | 998.738 | 0.014 | n/a | 0.045 | 0.000 | n/a | n/a | 0.066 | 2.226 | 0.002 | 0.066 | gw-r/thread-44/journal/page | none observed |
| 3537b0bff991348700000000000001bf | 1002.061 | 0.095 | n/a | 0.000 | 0.000 | 0.323 | 1000.501 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 1.106 | 0.095 | 0.000 | 1.106 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff991348700000000000001a2 | 986.933 | 2.302 | n/a | 0.000 | 0.000 | 0.687 | 983.818 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.069 | 2.302 | 0.002 | 0.069 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff991348700000000000001c1 | 984.205 | 2.538 | n/a | 0.000 | 0.000 | 0.288 | 981.277 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.065 | 2.538 | 0.003 | 0.065 | gw-r/thread-44/journal/page | none observed |
| 3537b0bff99134870000000000000199 | 841.737 | 3.911 | n/a | 1.692 | 0.000 | 0.515 | 835.456 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.106 | 5.604 | 0.007 | 0.106 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff991348700000000000001a0 | 836.807 | 2.401 | n/a | 0.000 | 0.000 | 0.473 | 833.830 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.059 | 2.401 | 0.003 | 0.059 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff991348700000000000001d1 | 829.356 | 1.725 | n/a | 0.000 | 0.000 | 0.589 | 826.935 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.060 | 1.725 | 0.002 | 0.060 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff9913487000000000000019c | 729.300 | 5.819 | n/a | 0.000 | 0.000 | 1.509 | 721.870 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.063 | 5.819 | 0.008 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff991348700000000000001c2 | 709.522 | 2.574 | n/a | 0.000 | 0.000 | 0.614 | 706.224 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.069 | 2.574 | 0.004 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff991348700000000000001be | 706.172 | 3.680 | n/a | 0.000 | 0.000 | 0.746 | 701.609 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.063 | 3.680 | 0.005 | 0.063 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff991348700000000000001ab | 677.043 | 7.341 | n/a | 0.000 | 0.000 | 0.420 | 669.152 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.100 | 7.341 | 0.011 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff991348700000000000001a4 | 663.260 | 3.608 | n/a | 0.000 | 0.000 | 0.873 | 658.673 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.068 | 3.608 | 0.005 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff991348700000000000001b2 | 603.051 | 5.236 | n/a | 0.000 | 0.000 | 0.355 | 597.247 | 0.012 | n/a | 0.031 | 0.000 | n/a | n/a | 0.170 | 5.236 | 0.009 | 0.170 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff991348700000000000001ce | 540.329 | 2.662 | n/a | 0.000 | 0.000 | 0.621 | 536.928 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.063 | 2.662 | 0.005 | 0.063 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff991348700000000000001b5 | 503.102 | 5.013 | n/a | 0.000 | 0.000 | 0.397 | 497.495 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.166 | 5.013 | 0.010 | 0.166 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff991348700000000000001cb | 485.707 | 3.826 | n/a | 0.000 | 0.000 | 5.893 | 475.883 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.062 | 3.826 | 0.008 | 0.062 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff991348700000000000001b3 | 473.420 | 8.376 | n/a | 0.000 | 0.000 | 0.821 | 464.092 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.100 | 8.376 | 0.018 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff99134870000000000000195 | 371.787 | 2.391 | n/a | 0.000 | 0.000 | 1.271 | 368.030 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.057 | 2.391 | 0.006 | 0.057 | gw-r/thread-41/journal/page | none observed |

## P3 / L256 / internal (45 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 289.700 | n/a | n/a | n/a | 2.386 | n/a | 0.000 | 0.000 | 0.582 | 285.423 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.062 | 2.386 | 0.008 | 0.062 |
| p99 | 1003.571 | n/a | n/a | n/a | 12.613 | n/a | 0.000 | 0.000 | 3.161 | 1001.466 | 0.012 | n/a | 0.090 | 0.000 | n/a | n/a | 1.123 | 12.613 | 0.357 | 1.123 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3537b0bff991348700000000000001e6 | 1003.571 | 0.132 | n/a | 0.000 | 0.000 | 1.310 | 1000.944 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 1.110 | 0.132 | 0.000 | 1.110 | gw-r/thread-44/journal/page | none observed |
| 3537b0bff9913487000000000000020f | 1003.372 | 0.106 | n/a | 0.000 | 0.000 | 0.605 | 1001.463 | 0.010 | n/a | 0.090 | 0.000 | n/a | n/a | 1.099 | 0.106 | 0.000 | 1.099 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff99134870000000000000214 | 1003.244 | 0.134 | n/a | 0.000 | 0.000 | 0.429 | 1001.466 | 0.009 | n/a | 0.083 | 0.000 | n/a | n/a | 1.123 | 0.134 | 0.000 | 1.123 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff991348700000000000001fb | 1000.002 | 2.229 | n/a | 0.000 | 0.000 | 0.438 | 997.217 | 0.011 | n/a | 0.052 | 0.000 | n/a | n/a | 0.053 | 2.229 | 0.002 | 0.053 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff9913487000000000000020e | 998.603 | 2.201 | n/a | 0.000 | 0.000 | 0.467 | 995.813 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.054 | 2.201 | 0.002 | 0.054 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff99134870000000000000216 | 994.748 | 4.490 | n/a | 0.000 | 0.000 | 0.488 | 989.614 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.121 | 4.490 | 0.005 | 0.121 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff99134870000000000000212 | 893.336 | 2.677 | n/a | 0.000 | 0.000 | 0.452 | 890.088 | 0.009 | n/a | 0.058 | 0.000 | n/a | n/a | 0.052 | 2.677 | 0.003 | 0.052 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff991348700000000000001fc | 885.540 | 2.681 | n/a | 0.000 | 0.000 | 0.582 | 882.176 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.063 | 2.681 | 0.003 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff99134870000000000000203 | 856.459 | 2.208 | n/a | 0.000 | 0.000 | 0.334 | 853.806 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.055 | 2.208 | 0.003 | 0.055 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff991348700000000000001ff | 834.492 | 2.056 | n/a | 0.000 | 0.000 | 0.478 | 831.859 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.057 | 2.056 | 0.002 | 0.057 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff991348700000000000001ed | 813.615 | 1.837 | n/a | 0.000 | 0.000 | 1.612 | 810.056 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.058 | 1.837 | 0.002 | 0.058 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff991348700000000000001d9 | 809.627 | 2.728 | n/a | 0.000 | 0.000 | 2.113 | 804.701 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.053 | 2.728 | 0.003 | 0.053 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff991348700000000000001f5 | 734.167 | 4.674 | n/a | 0.000 | 0.000 | 1.621 | 727.682 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.149 | 4.674 | 0.006 | 0.149 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff991348700000000000001d5 | 614.260 | 3.787 | n/a | 0.000 | 0.000 | 0.990 | 609.350 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.093 | 3.787 | 0.006 | 0.093 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff991348700000000000001f2 | 613.515 | 2.692 | n/a | 0.000 | 0.000 | 0.612 | 610.116 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.062 | 2.692 | 0.004 | 0.062 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff991348700000000000001f6 | 606.986 | 1.924 | n/a | 0.000 | 0.000 | 3.161 | 601.777 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.061 | 1.924 | 0.003 | 0.061 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff991348700000000000001e5 | 575.430 | 2.206 | n/a | 0.000 | 0.000 | 0.587 | 572.529 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.063 | 2.206 | 0.004 | 0.063 | gw-r/thread-44/journal/page | none observed |
| 3537b0bff991348700000000000001dd | 474.746 | 6.641 | n/a | 0.000 | 0.000 | 0.582 | 467.350 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.161 | 6.641 | 0.014 | 0.161 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff9913487000000000000020c | 410.570 | 2.269 | n/a | 0.000 | 0.000 | 3.127 | 405.089 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.053 | 2.269 | 0.006 | 0.053 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff991348700000000000001f0 | 387.493 | 2.020 | n/a | 0.000 | 0.000 | 0.554 | 384.807 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.059 | 2.020 | 0.005 | 0.059 | gw-r/thread-43/journal/page | none observed |

## P3 / L1024 / internal (758 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.015 | n/a | n/a | n/a | 2.915 | n/a | 0.000 | 0.000 | 0.494 | 8.725 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 0.071 | 2.915 | 0.246 | 0.071 |
| p99 | 109.788 | n/a | n/a | n/a | 13.468 | n/a | 1.081 | 0.000 | 3.721 | 102.967 | 0.230 | n/a | 0.066 | 0.000 | n/a | n/a | 0.484 | 14.232 | 0.819 | 0.484 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3537b0bff99134870000000000000222 | 980.018 | 2.180 | n/a | 0.000 | 0.000 | 0.335 | 977.385 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.059 | 2.180 | 0.002 | 0.059 | gw-r/thread-44/journal/page | none observed |
| 3537b0bff99134870000000000000217 | 955.146 | 1.584 | n/a | 0.000 | 0.000 | 0.476 | 952.948 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.057 | 1.584 | 0.002 | 0.057 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff99134870000000000000223 | 925.813 | 4.178 | n/a | 0.000 | 0.000 | 0.741 | 920.725 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.115 | 4.178 | 0.005 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff9913487000000000000021a | 805.514 | 1.921 | n/a | 0.000 | 0.000 | 0.445 | 803.029 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.052 | 1.921 | 0.002 | 0.052 | gw-r/thread-44/journal/page | none observed |
| 3537b0bff9913487000000000000021e | 785.669 | 2.075 | n/a | 0.000 | 0.000 | 0.586 | 782.896 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.064 | 2.075 | 0.003 | 0.064 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff9913487000000000000021c | 202.911 | 2.224 | n/a | 0.000 | 0.000 | 0.594 | 199.859 | 0.145 | n/a | 0.029 | 0.000 | n/a | n/a | 0.060 | 2.224 | 0.011 | 0.060 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff99134870000000000000220 | 200.948 | 2.228 | n/a | 0.000 | 0.000 | 0.431 | 196.515 | 1.681 | n/a | 0.038 | 0.000 | n/a | n/a | 0.055 | 2.228 | 0.011 | 0.055 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff991348700000000000004eb | 109.788 | 5.382 | n/a | 0.988 | 0.000 | 0.286 | 102.967 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.131 | 6.370 | 0.058 | 0.131 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff9913487000000000000066d | 96.787 | 10.227 | n/a | 0.000 | 0.000 | 0.443 | 85.980 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.113 | 10.227 | 0.106 | 0.113 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff991348700000000000002f2 | 96.428 | 7.273 | n/a | 0.000 | 0.000 | 0.455 | 88.605 | 0.004 | n/a | 0.012 | 0.000 | n/a | n/a | 0.080 | 7.273 | 0.075 | 0.080 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff9913487000000000000076a | 95.851 | 6.297 | n/a | 0.000 | 0.000 | 0.847 | 88.542 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.131 | 6.297 | 0.066 | 0.131 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff9913487000000000000075c | 87.327 | 3.047 | n/a | 0.000 | 0.000 | 0.962 | 83.200 | 0.020 | n/a | 0.028 | 0.000 | n/a | n/a | 0.069 | 3.047 | 0.035 | 0.069 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff991348700000000000007a1 | 84.250 | 2.166 | n/a | 0.000 | 0.000 | 0.385 | 81.611 | 0.004 | n/a | 0.016 | 0.000 | n/a | n/a | 0.067 | 2.166 | 0.026 | 0.067 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff991348700000000000004f5 | 82.758 | 2.087 | n/a | 0.000 | 0.000 | 0.369 | 80.186 | 0.003 | n/a | 0.030 | 0.000 | n/a | n/a | 0.083 | 2.087 | 0.025 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff9913487000000000000063c | 81.809 | 6.852 | n/a | 0.000 | 0.000 | 0.532 | 74.252 | 0.010 | n/a | 0.051 | 0.000 | n/a | n/a | 0.111 | 6.852 | 0.084 | 0.111 | gw-r/thread-44/journal/page | none observed |
| 3537b0bff991348700000000000005f3 | 80.912 | 3.520 | n/a | 0.000 | 0.000 | 0.336 | 76.972 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.071 | 3.520 | 0.044 | 0.071 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff9913487000000000000068e | 77.607 | 5.315 | n/a | 0.000 | 0.000 | 0.418 | 71.790 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.073 | 5.315 | 0.068 | 0.073 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff99134870000000000000276 | 77.276 | 3.497 | n/a | 0.000 | 0.000 | 0.471 | 73.139 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.142 | 3.497 | 0.045 | 0.142 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff9913487000000000000063a | 76.597 | 1.777 | n/a | 0.000 | 0.000 | 0.354 | 74.354 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.059 | 1.777 | 0.023 | 0.059 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff991348700000000000005d3 | 74.469 | 7.096 | n/a | 0.000 | 0.000 | 1.158 | 65.992 | 0.002 | n/a | 0.018 | 0.000 | n/a | n/a | 0.202 | 7.096 | 0.095 | 0.202 | gw-r/thread-43/journal/page | none observed |

## P3 / tail / internal (2336 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.833 | n/a | n/a | n/a | 3.617 | n/a | 0.000 | 0.000 | 0.431 | 7.837 | 0.004 | n/a | 0.010 | 0.000 | n/a | n/a | 0.084 | 3.640 | 0.303 | 0.084 |
| p99 | 339.773 | n/a | n/a | n/a | 14.383 | n/a | 1.392 | 0.000 | 3.915 | 337.324 | 0.317 | n/a | 0.051 | 0.000 | n/a | n/a | 1.119 | 15.810 | 0.844 | 1.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3537b0bff99134870000000000001b09 | 1003.288 | 3.082 | n/a | 0.000 | 0.000 | 0.962 | 999.084 | 0.013 | n/a | 0.051 | 0.000 | n/a | n/a | 0.097 | 3.082 | 0.003 | 0.097 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff99134870000000000001ac5 | 1002.947 | 0.202 | n/a | 0.000 | 0.000 | 1.036 | 1000.524 | 0.010 | n/a | 0.041 | 0.000 | n/a | n/a | 1.135 | 0.202 | 0.000 | 1.135 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff99134870000000000001ac0 | 1002.268 | 0.169 | n/a | 0.000 | 0.000 | 0.480 | 1000.361 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 1.227 | 0.169 | 0.000 | 1.227 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff99134870000000000001b0d | 1002.185 | 0.156 | n/a | 0.000 | 0.000 | 0.533 | 1000.350 | 0.006 | n/a | 0.020 | 0.000 | n/a | n/a | 1.119 | 0.156 | 0.000 | 1.119 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff99134870000000000001ac2 | 967.198 | 11.356 | n/a | 0.000 | 0.000 | 0.662 | 954.860 | 0.007 | n/a | 0.025 | 0.000 | n/a | n/a | 0.289 | 11.356 | 0.012 | 0.289 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff99134870000000000001acb | 936.851 | 2.577 | n/a | 0.000 | 0.000 | 0.355 | 933.826 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.068 | 2.577 | 0.003 | 0.068 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff99134870000000000001ae3 | 917.762 | 4.381 | n/a | 0.000 | 0.000 | 0.376 | 912.875 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.094 | 4.381 | 0.005 | 0.094 | gw-r/thread-48/journal/page | none observed |
| 3537b0bff99134870000000000001ad5 | 901.995 | 2.319 | n/a | 0.000 | 0.000 | 0.448 | 899.156 | 0.005 | n/a | 0.013 | 0.000 | n/a | n/a | 0.054 | 2.319 | 0.003 | 0.054 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff99134870000000000001b06 | 866.784 | 2.872 | n/a | 0.000 | 0.000 | 0.693 | 863.109 | 0.002 | n/a | 0.030 | 0.000 | n/a | n/a | 0.077 | 2.872 | 0.003 | 0.077 | gw-r/thread-43/journal/page | none observed |
| 3537b0bff99134870000000000001b04 | 866.105 | 2.213 | n/a | 0.000 | 0.000 | 0.334 | 863.470 | 0.002 | n/a | 0.026 | 0.000 | n/a | n/a | 0.059 | 2.213 | 0.003 | 0.059 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff99134870000000000001abe | 849.827 | 4.394 | n/a | 0.000 | 0.000 | 0.352 | 844.940 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.099 | 4.394 | 0.005 | 0.099 | gw-r/thread-44/journal/page | none observed |
| 3537b0bff99134870000000000001ae7 | 690.084 | 2.455 | n/a | 0.000 | 0.000 | 0.356 | 687.176 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.062 | 2.455 | 0.004 | 0.062 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff99134870000000000001acc | 687.657 | 1.669 | n/a | 0.000 | 0.000 | 0.372 | 685.515 | 0.009 | n/a | 0.028 | 0.000 | n/a | n/a | 0.063 | 1.669 | 0.002 | 0.063 | gw-r/thread-64/journal/page | none observed |
| 3537b0bff99134870000000000001b00 | 683.380 | 3.241 | n/a | 0.000 | 0.000 | 0.424 | 679.638 | 0.004 | n/a | 0.010 | 0.000 | n/a | n/a | 0.062 | 3.241 | 0.005 | 0.062 | gw-r/thread-44/journal/page | none observed |
| 3537b0bff99134870000000000001ae8 | 665.199 | 7.781 | n/a | 1.270 | 0.000 | 0.487 | 655.376 | 0.012 | n/a | 0.050 | 0.000 | n/a | n/a | 0.224 | 9.051 | 0.014 | 0.224 | gw-r/thread-41/journal/page | none observed |
| 3537b0bff99134870000000000001ae0 | 617.812 | 3.301 | n/a | 0.000 | 0.000 | 0.374 | 614.038 | 0.008 | n/a | 0.039 | 0.000 | n/a | n/a | 0.052 | 3.301 | 0.005 | 0.052 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff99134870000000000001af6 | 576.620 | 2.279 | n/a | 0.000 | 0.000 | 0.269 | 573.954 | 0.016 | n/a | 0.042 | 0.000 | n/a | n/a | 0.060 | 2.279 | 0.004 | 0.060 | gw-r/thread-46/journal/page | none observed |
| 3537b0bff99134870000000000001afb | 542.994 | 4.259 | n/a | 0.000 | 0.000 | 0.557 | 538.060 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.067 | 4.259 | 0.008 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 3537b0bff99134870000000000001adb | 513.530 | 2.623 | n/a | 0.000 | 0.000 | 0.465 | 510.336 | 0.008 | n/a | 0.026 | 0.000 | n/a | n/a | 0.072 | 2.623 | 0.005 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 3537b0bff99134870000000000001aff | 422.336 | 2.373 | n/a | 0.000 | 0.000 | 0.278 | 419.561 | 0.004 | n/a | 0.012 | 0.000 | n/a | n/a | 0.108 | 2.373 | 0.006 | 0.108 | gw-r/thread-46/journal/page | none observed |

## P3 / warmup / read (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.121 | n/a | n/a | n/a | 0.036 | n/a | 0.000 | 0.000 | 0.728 | 200.946 | 0.014 | n/a | 0.118 | 0.000 | n/a | n/a | 0.073 | 0.036 | 0.000 | 0.073 |
| p99 | 207.109 | n/a | n/a | n/a | 0.125 | n/a | 0.000 | 0.000 | 4.345 | 206.122 | 6.009 | n/a | 2.956 | 0.000 | n/a | n/a | 0.284 | 0.125 | 0.001 | 0.284 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 37cd8c891302942d000000000000003a | 207.109 | 0.028 | n/a | 0.000 | 0.000 | 0.403 | 206.122 | 0.061 | n/a | 0.430 | 0.000 | n/a | n/a | 0.065 | 0.028 | 0.000 | 0.065 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d000000000000002b | 205.913 | 0.042 | n/a | 0.000 | 0.000 | 4.345 | 201.234 | 0.017 | n/a | 0.193 | 0.000 | n/a | n/a | 0.082 | 0.042 | 0.000 | 0.082 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d000000000000002e | 204.708 | 0.027 | n/a | 0.000 | 0.000 | 3.132 | 201.288 | 0.018 | n/a | 0.179 | 0.000 | n/a | n/a | 0.064 | 0.027 | 0.000 | 0.064 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d000000000000001a | 204.293 | 0.029 | n/a | 0.000 | 0.000 | 0.893 | 203.126 | 0.015 | n/a | 0.162 | 0.000 | n/a | n/a | 0.068 | 0.029 | 0.000 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 37cd8c891302942d000000000000002c | 204.265 | 0.023 | n/a | 0.000 | 0.000 | 0.671 | 203.371 | 0.018 | n/a | 0.126 | 0.000 | n/a | n/a | 0.056 | 0.023 | 0.000 | 0.056 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d0000000000000007 | 203.982 | 0.053 | n/a | 0.000 | 0.000 | 1.069 | 202.401 | 0.041 | n/a | 0.174 | 0.000 | n/a | n/a | 0.245 | 0.053 | 0.000 | 0.245 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d000000000000005a | 203.904 | 0.034 | n/a | 0.000 | 0.000 | 0.376 | 203.317 | 0.019 | n/a | 0.088 | 0.000 | n/a | n/a | 0.070 | 0.034 | 0.000 | 0.070 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d0000000000000031 | 203.844 | 0.033 | n/a | 0.000 | 0.000 | 0.753 | 202.742 | 0.020 | n/a | 0.215 | 0.000 | n/a | n/a | 0.081 | 0.033 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d0000000000000024 | 203.661 | 0.087 | n/a | 0.000 | 0.000 | 1.268 | 202.012 | 0.022 | n/a | 0.107 | 0.000 | n/a | n/a | 0.165 | 0.087 | 0.000 | 0.165 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d0000000000000027 | 203.568 | 0.032 | n/a | 0.000 | 0.000 | 0.553 | 202.526 | 0.030 | n/a | 0.363 | 0.000 | n/a | n/a | 0.065 | 0.032 | 0.000 | 0.065 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d000000000000001b | 203.472 | 0.042 | n/a | 0.000 | 0.000 | 0.689 | 202.452 | 0.022 | n/a | 0.181 | 0.000 | n/a | n/a | 0.085 | 0.042 | 0.000 | 0.085 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d000000000000001c | 203.393 | 0.040 | n/a | 0.000 | 0.000 | 2.224 | 200.946 | 0.016 | n/a | 0.082 | 0.000 | n/a | n/a | 0.086 | 0.040 | 0.000 | 0.086 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d0000000000000043 | 203.332 | 0.052 | n/a | 0.000 | 0.000 | 1.119 | 201.893 | 0.012 | n/a | 0.120 | 0.000 | n/a | n/a | 0.136 | 0.052 | 0.000 | 0.136 | gw-r/thread-45/journal/page | none observed |
| 37cd8c891302942d000000000000005d | 203.212 | 0.078 | n/a | 0.000 | 0.000 | 1.356 | 201.484 | 0.014 | n/a | 0.057 | 0.000 | n/a | n/a | 0.223 | 0.078 | 0.000 | 0.223 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d0000000000000053 | 203.145 | 0.028 | n/a | 0.000 | 0.000 | 1.683 | 200.867 | 0.017 | n/a | 0.470 | 0.000 | n/a | n/a | 0.080 | 0.028 | 0.000 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 37cd8c891302942d0000000000000009 | 203.140 | 0.125 | n/a | 0.000 | 0.000 | 1.635 | 201.007 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 0.284 | 0.125 | 0.001 | 0.284 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d0000000000000030 | 203.085 | 0.042 | n/a | 0.000 | 0.000 | 0.602 | 202.164 | 0.017 | n/a | 0.148 | 0.000 | n/a | n/a | 0.113 | 0.042 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 37cd8c891302942d000000000000004d | 203.040 | 0.041 | n/a | 0.000 | 0.000 | 2.114 | 200.670 | 0.013 | n/a | 0.089 | 0.000 | n/a | n/a | 0.112 | 0.041 | 0.000 | 0.112 | gw-r/thread-45/journal/page | none observed |
| 37cd8c891302942d000000000000001f | 203.023 | 0.031 | n/a | 0.000 | 0.000 | 2.037 | 200.757 | 0.013 | n/a | 0.118 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d0000000000000010 | 202.997 | 0.034 | n/a | 0.000 | 0.000 | 0.550 | 202.000 | 0.021 | n/a | 0.291 | 0.000 | n/a | n/a | 0.101 | 0.034 | 0.000 | 0.101 | gw-r/thread-43/journal/page | none observed |

## P3 / L1 / read (87 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.071 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.757 | 201.024 | 0.013 | n/a | 0.096 | 0.000 | n/a | n/a | 0.077 | 0.039 | 0.000 | 0.077 |
| p99 | 208.758 | n/a | n/a | n/a | 0.300 | n/a | 0.000 | 0.000 | 7.533 | 206.548 | 5.454 | n/a | 3.650 | 0.000 | n/a | n/a | 0.191 | 0.300 | 0.001 | 0.191 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 37cd8c891302942d00000000000000c2 | 208.758 | 0.043 | n/a | 0.000 | 0.000 | 7.533 | 201.016 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.086 | 0.043 | 0.000 | 0.086 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d00000000000000ca | 208.121 | 0.300 | n/a | 0.000 | 0.000 | 1.028 | 206.548 | 0.013 | n/a | 0.147 | 0.000 | n/a | n/a | 0.085 | 0.300 | 0.001 | 0.085 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d00000000000000a5 | 208.007 | 0.033 | n/a | 0.000 | 0.000 | 1.748 | 202.609 | 0.017 | n/a | 3.528 | 0.000 | n/a | n/a | 0.072 | 0.033 | 0.000 | 0.072 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d000000000000007d | 207.334 | 0.038 | n/a | 0.000 | 0.000 | 0.708 | 206.321 | 0.027 | n/a | 0.166 | 0.000 | n/a | n/a | 0.074 | 0.038 | 0.000 | 0.074 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d0000000000000083 | 206.560 | 0.059 | n/a | 0.000 | 0.000 | 4.760 | 201.439 | 0.014 | n/a | 0.131 | 0.000 | n/a | n/a | 0.157 | 0.059 | 0.000 | 0.157 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d000000000000006c | 206.018 | 0.053 | n/a | 0.000 | 0.000 | 1.321 | 200.856 | 0.020 | n/a | 3.650 | 0.000 | n/a | n/a | 0.118 | 0.053 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d000000000000007a | 205.773 | 0.051 | n/a | 0.000 | 0.000 | 1.840 | 203.648 | 0.012 | n/a | 0.111 | 0.000 | n/a | n/a | 0.111 | 0.051 | 0.000 | 0.111 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d0000000000000064 | 205.434 | 0.028 | n/a | 0.000 | 0.000 | 0.504 | 204.728 | 0.013 | n/a | 0.096 | 0.000 | n/a | n/a | 0.064 | 0.028 | 0.000 | 0.064 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d0000000000000081 | 205.421 | 0.029 | n/a | 0.000 | 0.000 | 0.407 | 204.678 | 0.023 | n/a | 0.207 | 0.000 | n/a | n/a | 0.077 | 0.029 | 0.000 | 0.077 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d0000000000000061 | 205.360 | 0.047 | n/a | 0.000 | 0.000 | 1.177 | 203.883 | 0.019 | n/a | 0.091 | 0.000 | n/a | n/a | 0.144 | 0.047 | 0.000 | 0.144 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d00000000000000b5 | 204.959 | 0.032 | n/a | 0.000 | 0.000 | 0.612 | 204.172 | 0.011 | n/a | 0.052 | 0.000 | n/a | n/a | 0.079 | 0.032 | 0.000 | 0.079 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d0000000000000090 | 204.845 | 0.043 | n/a | 0.000 | 0.000 | 3.796 | 200.795 | 0.013 | n/a | 0.067 | 0.000 | n/a | n/a | 0.132 | 0.043 | 0.000 | 0.132 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d0000000000000070 | 203.467 | 0.029 | n/a | 0.000 | 0.000 | 1.799 | 201.418 | 0.018 | n/a | 0.139 | 0.000 | n/a | n/a | 0.064 | 0.029 | 0.000 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d0000000000000094 | 203.221 | 0.023 | n/a | 0.000 | 0.000 | 1.320 | 201.698 | 0.012 | n/a | 0.117 | 0.000 | n/a | n/a | 0.051 | 0.023 | 0.000 | 0.051 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d0000000000000086 | 203.105 | 0.046 | n/a | 0.000 | 0.000 | 1.412 | 201.368 | 0.022 | n/a | 0.159 | 0.000 | n/a | n/a | 0.097 | 0.046 | 0.000 | 0.097 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d000000000000007e | 203.048 | 0.042 | n/a | 0.000 | 0.000 | 1.359 | 201.372 | 0.013 | n/a | 0.148 | 0.000 | n/a | n/a | 0.113 | 0.042 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 37cd8c891302942d0000000000000071 | 202.851 | 0.035 | n/a | 0.000 | 0.000 | 0.808 | 201.832 | 0.012 | n/a | 0.084 | 0.000 | n/a | n/a | 0.081 | 0.035 | 0.000 | 0.081 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d00000000000000a7 | 202.833 | 0.066 | n/a | 0.000 | 0.000 | 1.536 | 200.929 | 0.020 | n/a | 0.092 | 0.000 | n/a | n/a | 0.191 | 0.066 | 0.000 | 0.191 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d0000000000000069 | 202.822 | 0.043 | n/a | 0.000 | 0.000 | 1.244 | 201.245 | 0.021 | n/a | 0.163 | 0.000 | n/a | n/a | 0.106 | 0.043 | 0.000 | 0.106 | gw-r/thread-45/journal/page | none observed |
| 37cd8c891302942d000000000000007b | 202.735 | 0.047 | n/a | 0.000 | 0.000 | 1.074 | 201.331 | 0.015 | n/a | 0.139 | 0.000 | n/a | n/a | 0.130 | 0.047 | 0.000 | 0.130 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.686 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.663 | 200.823 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.071 | 0.037 | 0.000 | 0.071 |
| p99 | 205.958 | n/a | n/a | n/a | 0.169 | n/a | 0.000 | 0.000 | 4.531 | 204.827 | 6.505 | n/a | 0.131 | 0.000 | n/a | n/a | 0.199 | 0.169 | 0.002 | 0.199 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 37cd8c891302942d00000000000000e7 | 205.958 | 0.024 | n/a | 0.000 | 0.000 | 0.960 | 204.827 | 0.007 | n/a | 0.084 | 0.000 | n/a | n/a | 0.056 | 0.024 | 0.000 | 0.056 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d00000000000000cd | 205.659 | 0.042 | n/a | 0.000 | 0.000 | 0.794 | 204.634 | 0.008 | n/a | 0.101 | 0.000 | n/a | n/a | 0.081 | 0.042 | 0.000 | 0.081 | gw-r/thread-45/journal/page | none observed |
| 37cd8c891302942d0000000000000116 | 205.411 | 0.036 | n/a | 0.000 | 0.000 | 0.460 | 204.744 | 0.029 | n/a | 0.068 | 0.000 | n/a | n/a | 0.073 | 0.036 | 0.000 | 0.073 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d0000000000000104 | 205.363 | 0.030 | n/a | 0.000 | 0.000 | 4.048 | 201.113 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 0.067 | 0.030 | 0.000 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d00000000000000ef | 205.136 | 0.033 | n/a | 0.000 | 0.000 | 4.177 | 200.777 | 0.008 | n/a | 0.071 | 0.000 | n/a | n/a | 0.070 | 0.033 | 0.000 | 0.070 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d00000000000000d0 | 205.054 | 0.027 | n/a | 0.000 | 0.000 | 3.501 | 201.362 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.063 | 0.027 | 0.000 | 0.063 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d00000000000000e6 | 205.040 | 0.052 | n/a | 0.000 | 0.000 | 2.713 | 202.061 | 0.012 | n/a | 0.102 | 0.000 | n/a | n/a | 0.100 | 0.052 | 0.000 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d0000000000000114 | 204.239 | 0.049 | n/a | 0.000 | 0.000 | 2.972 | 201.010 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 0.122 | 0.049 | 0.000 | 0.122 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d00000000000000dd | 203.874 | 0.027 | n/a | 0.000 | 0.000 | 0.383 | 203.296 | 0.018 | n/a | 0.080 | 0.000 | n/a | n/a | 0.071 | 0.027 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d00000000000000fa | 203.508 | 0.028 | n/a | 0.000 | 0.000 | 1.997 | 201.305 | 0.011 | n/a | 0.104 | 0.000 | n/a | n/a | 0.063 | 0.028 | 0.000 | 0.063 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d0000000000000118 | 203.037 | 0.043 | n/a | 0.000 | 0.000 | 2.242 | 200.627 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.077 | 0.043 | 0.000 | 0.077 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d00000000000000ce | 203.017 | 0.042 | n/a | 0.000 | 0.000 | 2.250 | 200.574 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.120 | 0.042 | 0.000 | 0.120 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d00000000000000e9 | 202.945 | 0.032 | n/a | 0.000 | 0.000 | 0.663 | 202.119 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.069 | 0.032 | 0.000 | 0.069 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d00000000000000f4 | 202.781 | 0.034 | n/a | 0.000 | 0.000 | 0.907 | 201.656 | 0.008 | n/a | 0.100 | 0.000 | n/a | n/a | 0.075 | 0.034 | 0.000 | 0.075 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d0000000000000105 | 202.727 | 0.069 | n/a | 0.000 | 0.000 | 1.095 | 201.290 | 0.016 | n/a | 0.078 | 0.000 | n/a | n/a | 0.179 | 0.069 | 0.000 | 0.179 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d000000000000011a | 202.626 | 0.023 | n/a | 0.000 | 0.000 | 1.489 | 200.968 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.053 | 0.023 | 0.000 | 0.053 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d00000000000000e5 | 202.610 | 0.059 | n/a | 0.000 | 0.000 | 1.269 | 201.051 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.160 | 0.059 | 0.000 | 0.160 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d000000000000010e | 202.592 | 0.022 | n/a | 0.000 | 0.000 | 0.625 | 201.722 | 0.042 | n/a | 0.131 | 0.000 | n/a | n/a | 0.049 | 0.022 | 0.000 | 0.049 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d00000000000000fb | 202.522 | 0.070 | n/a | 0.000 | 0.000 | 1.153 | 201.075 | 0.008 | n/a | 0.035 | 0.000 | n/a | n/a | 0.181 | 0.070 | 0.000 | 0.181 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d000000000000010b | 202.489 | 0.042 | n/a | 0.000 | 0.000 | 1.312 | 200.937 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.104 | 0.042 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / read (93 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.600 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.634 | 200.798 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.073 | 0.039 | 0.000 | 0.073 |
| p99 | 207.588 | n/a | n/a | n/a | 0.097 | n/a | 0.000 | 0.000 | 3.599 | 205.705 | 2.321 | n/a | 0.298 | 0.000 | n/a | n/a | 0.207 | 0.097 | 0.001 | 0.207 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 37cd8c891302942d0000000000000145 | 207.588 | 0.039 | n/a | 0.000 | 0.000 | 2.354 | 205.031 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.081 | 0.039 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d0000000000000139 | 206.257 | 0.029 | n/a | 0.000 | 0.000 | 0.394 | 205.705 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.066 | 0.029 | 0.000 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d0000000000000191 | 206.135 | 0.042 | n/a | 0.000 | 0.000 | 0.741 | 205.064 | 0.065 | n/a | 0.062 | 0.000 | n/a | n/a | 0.160 | 0.042 | 0.000 | 0.160 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d0000000000000166 | 205.042 | 0.026 | n/a | 0.000 | 0.000 | 2.746 | 202.083 | 0.022 | n/a | 0.104 | 0.000 | n/a | n/a | 0.061 | 0.026 | 0.000 | 0.061 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d0000000000000147 | 205.015 | 0.023 | n/a | 0.000 | 0.000 | 0.424 | 204.445 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 0.051 | 0.023 | 0.000 | 0.051 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d0000000000000140 | 204.812 | 0.042 | n/a | 0.000 | 0.000 | 3.482 | 201.113 | 0.006 | n/a | 0.093 | 0.000 | n/a | n/a | 0.075 | 0.042 | 0.000 | 0.075 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d0000000000000172 | 204.719 | 0.028 | n/a | 0.000 | 0.000 | 3.121 | 201.420 | 0.008 | n/a | 0.073 | 0.000 | n/a | n/a | 0.068 | 0.028 | 0.000 | 0.068 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d0000000000000143 | 203.243 | 0.097 | n/a | 0.000 | 0.000 | 1.338 | 201.481 | 0.010 | n/a | 0.109 | 0.000 | n/a | n/a | 0.207 | 0.097 | 0.000 | 0.207 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d0000000000000158 | 202.971 | 0.023 | n/a | 0.000 | 0.000 | 0.666 | 202.108 | 0.011 | n/a | 0.124 | 0.000 | n/a | n/a | 0.040 | 0.023 | 0.000 | 0.040 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d000000000000018e | 202.817 | 0.036 | n/a | 0.000 | 0.000 | 0.711 | 201.682 | 0.011 | n/a | 0.298 | 0.000 | n/a | n/a | 0.078 | 0.036 | 0.000 | 0.078 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d0000000000000180 | 202.790 | 0.061 | n/a | 0.000 | 0.000 | 0.804 | 201.624 | 0.010 | n/a | 0.135 | 0.000 | n/a | n/a | 0.156 | 0.061 | 0.000 | 0.156 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d000000000000017e | 202.667 | 0.030 | n/a | 0.000 | 0.000 | 0.330 | 202.146 | 0.013 | n/a | 0.078 | 0.000 | n/a | n/a | 0.070 | 0.030 | 0.000 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d0000000000000167 | 202.662 | 0.035 | n/a | 0.000 | 0.000 | 1.089 | 201.363 | 0.006 | n/a | 0.090 | 0.000 | n/a | n/a | 0.078 | 0.035 | 0.000 | 0.078 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d0000000000000196 | 202.643 | 0.039 | n/a | 0.000 | 0.000 | 0.772 | 201.547 | 0.012 | n/a | 0.192 | 0.000 | n/a | n/a | 0.079 | 0.039 | 0.000 | 0.079 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d000000000000016e | 202.637 | 0.080 | n/a | 0.000 | 0.000 | 0.842 | 201.476 | 0.008 | n/a | 0.098 | 0.000 | n/a | n/a | 0.133 | 0.080 | 0.000 | 0.133 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d0000000000000174 | 202.629 | 0.074 | n/a | 0.000 | 0.000 | 1.275 | 201.036 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.186 | 0.074 | 0.000 | 0.186 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d000000000000016c | 202.567 | 0.040 | n/a | 0.000 | 0.000 | 0.643 | 201.682 | 0.010 | n/a | 0.099 | 0.000 | n/a | n/a | 0.093 | 0.040 | 0.000 | 0.093 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d000000000000017c | 202.431 | 0.034 | n/a | 0.000 | 0.000 | 0.335 | 201.883 | 0.034 | n/a | 0.069 | 0.000 | n/a | n/a | 0.076 | 0.034 | 0.000 | 0.076 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d0000000000000142 | 202.427 | 0.043 | n/a | 0.000 | 0.000 | 0.912 | 201.313 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.100 | 0.043 | 0.000 | 0.100 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d0000000000000192 | 202.310 | 0.042 | n/a | 0.000 | 0.000 | 0.937 | 201.132 | 0.019 | n/a | 0.095 | 0.000 | n/a | n/a | 0.086 | 0.042 | 0.000 | 0.086 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / read (106 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.342 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.599 | 200.709 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.070 | 0.037 | 0.000 | 0.070 |
| p99 | 203.615 | n/a | n/a | n/a | 0.075 | n/a | 0.000 | 0.000 | 2.492 | 201.797 | 4.679 | n/a | 0.129 | 0.000 | n/a | n/a | 0.173 | 0.075 | 0.001 | 0.173 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 37cd8c891302942d00000000000001f5 | 204.281 | 0.026 | n/a | 0.000 | 0.000 | 0.362 | 203.803 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.055 | 0.026 | 0.000 | 0.055 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d00000000000001b7 | 203.615 | 0.043 | n/a | 0.000 | 0.000 | 2.492 | 200.913 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.078 | 0.043 | 0.000 | 0.078 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d00000000000001d2 | 203.556 | 0.057 | n/a | 0.000 | 0.000 | 0.670 | 201.300 | 1.410 | n/a | 0.025 | 0.000 | n/a | n/a | 0.095 | 0.057 | 0.000 | 0.095 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d00000000000001b9 | 203.314 | 0.086 | n/a | 0.000 | 0.000 | 1.084 | 201.797 | 0.012 | n/a | 0.122 | 0.000 | n/a | n/a | 0.213 | 0.086 | 0.000 | 0.213 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d00000000000001c7 | 203.018 | 0.033 | n/a | 0.000 | 0.000 | 1.480 | 201.381 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.068 | 0.033 | 0.000 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d00000000000001aa | 202.790 | 0.058 | n/a | 0.000 | 0.000 | 1.760 | 200.765 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.128 | 0.058 | 0.000 | 0.128 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d00000000000001ae | 202.779 | 0.048 | n/a | 0.000 | 0.000 | 0.968 | 201.521 | 0.013 | n/a | 0.120 | 0.000 | n/a | n/a | 0.108 | 0.048 | 0.000 | 0.108 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d00000000000001f9 | 202.514 | 0.037 | n/a | 0.000 | 0.000 | 0.918 | 201.385 | 0.008 | n/a | 0.092 | 0.000 | n/a | n/a | 0.076 | 0.037 | 0.000 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d00000000000001e0 | 202.508 | 0.028 | n/a | 0.000 | 0.000 | 0.475 | 201.766 | 0.016 | n/a | 0.147 | 0.000 | n/a | n/a | 0.076 | 0.028 | 0.000 | 0.076 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d00000000000001c0 | 202.313 | 0.029 | n/a | 0.000 | 0.000 | 0.599 | 201.503 | 0.018 | n/a | 0.103 | 0.000 | n/a | n/a | 0.061 | 0.029 | 0.000 | 0.061 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d00000000000001e9 | 202.280 | 0.040 | n/a | 0.000 | 0.000 | 1.213 | 200.875 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.077 | 0.040 | 0.000 | 0.077 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d00000000000001bf | 202.278 | 0.035 | n/a | 0.000 | 0.000 | 0.685 | 201.376 | 0.011 | n/a | 0.102 | 0.000 | n/a | n/a | 0.070 | 0.035 | 0.000 | 0.070 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d00000000000001b3 | 202.177 | 0.028 | n/a | 0.000 | 0.000 | 0.899 | 201.086 | 0.007 | n/a | 0.093 | 0.000 | n/a | n/a | 0.065 | 0.028 | 0.000 | 0.065 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d000000000000019c | 202.176 | 0.030 | n/a | 0.000 | 0.000 | 0.443 | 201.493 | 0.015 | n/a | 0.129 | 0.000 | n/a | n/a | 0.066 | 0.030 | 0.000 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d0000000000000204 | 202.115 | 0.071 | n/a | 0.000 | 0.000 | 0.769 | 201.054 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.141 | 0.071 | 0.000 | 0.141 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d0000000000000202 | 202.104 | 0.043 | n/a | 0.000 | 0.000 | 0.740 | 201.115 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 0.118 | 0.043 | 0.000 | 0.118 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d00000000000001bb | 202.085 | 0.030 | n/a | 0.000 | 0.000 | 0.808 | 201.103 | 0.026 | n/a | 0.054 | 0.000 | n/a | n/a | 0.064 | 0.030 | 0.000 | 0.064 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d00000000000001b8 | 202.083 | 0.041 | n/a | 0.000 | 0.000 | 0.940 | 200.930 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.101 | 0.041 | 0.000 | 0.101 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d0000000000000206 | 202.056 | 0.049 | n/a | 0.000 | 0.000 | 0.792 | 200.979 | 0.007 | n/a | 0.080 | 0.000 | n/a | n/a | 0.150 | 0.049 | 0.000 | 0.150 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d00000000000001cc | 202.036 | 0.057 | n/a | 0.000 | 0.000 | 0.649 | 201.124 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.121 | 0.057 | 0.000 | 0.121 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / read (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.401 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.592 | 200.684 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.069 | 0.037 | 0.000 | 0.069 |
| p99 | 204.448 | n/a | n/a | n/a | 0.080 | n/a | 0.000 | 0.000 | 2.524 | 203.133 | 2.235 | n/a | 0.104 | 0.000 | n/a | n/a | 0.149 | 0.080 | 0.001 | 0.149 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 37cd8c891302942d0000000000000243 | 205.610 | 0.063 | n/a | 0.000 | 0.000 | 4.500 | 200.817 | 0.006 | n/a | 0.082 | 0.000 | n/a | n/a | 0.141 | 0.063 | 0.000 | 0.141 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d0000000000000264 | 204.448 | 0.027 | n/a | 0.000 | 0.000 | 0.352 | 203.939 | 0.011 | n/a | 0.061 | 0.000 | n/a | n/a | 0.057 | 0.027 | 0.000 | 0.057 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d0000000000000220 | 203.763 | 0.031 | n/a | 0.000 | 0.000 | 0.471 | 203.133 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.070 | 0.031 | 0.000 | 0.070 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d000000000000025b | 203.525 | 0.050 | n/a | 0.000 | 0.000 | 2.524 | 200.769 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.128 | 0.050 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d000000000000025a | 203.365 | 0.049 | n/a | 0.000 | 0.000 | 1.924 | 201.222 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.124 | 0.049 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d000000000000022d | 202.860 | 0.037 | n/a | 0.000 | 0.000 | 1.980 | 200.719 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.063 | 0.037 | 0.000 | 0.063 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d0000000000000229 | 202.820 | 0.029 | n/a | 0.000 | 0.000 | 0.739 | 201.869 | 0.016 | n/a | 0.095 | 0.000 | n/a | n/a | 0.071 | 0.029 | 0.000 | 0.071 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d000000000000022a | 202.471 | 0.035 | n/a | 0.000 | 0.000 | 0.676 | 201.561 | 0.011 | n/a | 0.110 | 0.000 | n/a | n/a | 0.079 | 0.035 | 0.000 | 0.079 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d000000000000024b | 202.398 | 0.048 | n/a | 0.000 | 0.000 | 1.129 | 201.049 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.093 | 0.048 | 0.000 | 0.093 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d000000000000022b | 202.393 | 0.038 | n/a | 0.000 | 0.000 | 0.841 | 201.352 | 0.014 | n/a | 0.075 | 0.000 | n/a | n/a | 0.073 | 0.038 | 0.000 | 0.073 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d000000000000021b | 202.347 | 0.031 | n/a | 0.000 | 0.000 | 0.883 | 201.250 | 0.019 | n/a | 0.100 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d0000000000000271 | 202.303 | 0.049 | n/a | 0.000 | 0.000 | 1.452 | 200.510 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.264 | 0.049 | 0.000 | 0.264 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d000000000000023b | 202.239 | 0.063 | n/a | 0.000 | 0.000 | 0.811 | 201.164 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.149 | 0.063 | 0.000 | 0.149 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d0000000000000228 | 202.233 | 0.027 | n/a | 0.000 | 0.000 | 1.431 | 200.660 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.051 | 0.027 | 0.000 | 0.051 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d0000000000000246 | 202.097 | 0.026 | n/a | 0.000 | 0.000 | 0.523 | 201.426 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.046 | 0.026 | 0.000 | 0.046 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d0000000000000276 | 202.090 | 0.029 | n/a | 0.000 | 0.000 | 0.597 | 201.286 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.066 | 0.029 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d000000000000026b | 202.024 | 0.050 | n/a | 0.000 | 0.000 | 0.547 | 201.218 | 0.011 | n/a | 0.093 | 0.000 | n/a | n/a | 0.105 | 0.050 | 0.000 | 0.105 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d0000000000000274 | 202.011 | 0.026 | n/a | 0.000 | 0.000 | 0.666 | 201.146 | 0.010 | n/a | 0.104 | 0.000 | n/a | n/a | 0.058 | 0.026 | 0.000 | 0.058 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d0000000000000217 | 201.990 | 0.031 | n/a | 0.000 | 0.000 | 0.759 | 201.042 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d0000000000000226 | 201.971 | 0.053 | n/a | 0.000 | 0.000 | 0.900 | 200.828 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.126 | 0.053 | 0.000 | 0.126 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / read (66 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.759 | n/a | n/a | n/a | 0.044 | n/a | 0.000 | 0.000 | 0.508 | 72.253 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.060 | 0.044 | 0.001 | 0.060 |
| p99 | 205.190 | n/a | n/a | n/a | 0.091 | n/a | 0.000 | 0.000 | 2.500 | 204.329 | 1.900 | n/a | 0.451 | 0.000 | n/a | n/a | 0.182 | 0.091 | 0.002 | 0.182 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 37cd8c891302942d0000000000000294 | 205.190 | 0.043 | n/a | 0.000 | 0.000 | 0.650 | 204.329 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.083 | 0.043 | 0.000 | 0.083 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d0000000000000291 | 203.300 | 0.054 | n/a | 0.000 | 0.000 | 2.500 | 200.583 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.123 | 0.054 | 0.000 | 0.123 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d000000000000028e | 202.426 | 0.040 | n/a | 0.000 | 0.000 | 0.829 | 201.342 | 0.011 | n/a | 0.105 | 0.000 | n/a | n/a | 0.099 | 0.040 | 0.000 | 0.099 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d0000000000000283 | 202.136 | 0.088 | n/a | 0.000 | 0.000 | 1.005 | 200.806 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.182 | 0.088 | 0.000 | 0.182 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d0000000000000282 | 201.849 | 0.032 | n/a | 0.000 | 0.000 | 0.479 | 201.178 | 0.032 | n/a | 0.059 | 0.000 | n/a | n/a | 0.069 | 0.032 | 0.000 | 0.069 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d0000000000000293 | 201.802 | 0.029 | n/a | 0.000 | 0.000 | 0.645 | 200.983 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.065 | 0.029 | 0.000 | 0.065 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d0000000000000297 | 201.741 | 0.047 | n/a | 0.000 | 0.000 | 0.726 | 200.770 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.134 | 0.047 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d0000000000000280 | 201.709 | 0.091 | n/a | 0.000 | 0.000 | 0.849 | 200.588 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.146 | 0.091 | 0.000 | 0.146 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d000000000000028c | 201.606 | 0.042 | n/a | 0.000 | 0.000 | 0.674 | 200.745 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.078 | 0.042 | 0.000 | 0.078 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d000000000000028d | 201.594 | 0.034 | n/a | 0.000 | 0.000 | 0.659 | 200.762 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.074 | 0.034 | 0.000 | 0.074 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d0000000000000288 | 201.487 | 0.029 | n/a | 0.000 | 0.000 | 0.733 | 200.615 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.063 | 0.029 | 0.000 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d0000000000000298 | 201.390 | 0.031 | n/a | 0.000 | 0.000 | 0.490 | 200.733 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.063 | 0.031 | 0.000 | 0.063 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d0000000000000286 | 201.367 | 0.025 | n/a | 0.000 | 0.000 | 0.477 | 200.770 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.051 | 0.025 | 0.000 | 0.051 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d0000000000000287 | 201.355 | 0.037 | n/a | 0.000 | 0.000 | 0.613 | 200.578 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.077 | 0.037 | 0.000 | 0.077 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d0000000000000296 | 201.313 | 0.031 | n/a | 0.000 | 0.000 | 0.419 | 200.741 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.062 | 0.031 | 0.000 | 0.062 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d0000000000000299 | 201.131 | 0.029 | n/a | 0.000 | 0.000 | 0.391 | 200.604 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.064 | 0.029 | 0.000 | 0.064 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d0000000000000281 | 201.121 | 0.029 | n/a | 0.000 | 0.000 | 0.441 | 200.549 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.072 | 0.029 | 0.000 | 0.072 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d0000000000000292 | 201.090 | 0.028 | n/a | 0.000 | 0.000 | 0.443 | 200.522 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.064 | 0.028 | 0.000 | 0.064 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d000000000000028a | 200.180 | 0.036 | n/a | 0.000 | 0.000 | 0.571 | 199.482 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.049 | 0.036 | 0.000 | 0.049 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d0000000000000290 | 190.280 | 0.041 | n/a | 0.000 | 0.000 | 0.383 | 189.762 | 0.007 | n/a | 0.015 | 0.000 | n/a | n/a | 0.072 | 0.041 | 0.000 | 0.072 | gw-r/thread-41/journal/page | none observed |

## P3 / tail / read (228 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 80.381 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.444 | 79.726 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.060 | 0.039 | 0.000 | 0.060 |
| p99 | 202.258 | n/a | n/a | n/a | 0.102 | n/a | 0.000 | 0.000 | 3.597 | 201.124 | 1.980 | n/a | 0.094 | 0.000 | n/a | n/a | 0.151 | 0.102 | 0.002 | 0.151 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 37cd8c891302942d0000000000000ee4 | 204.485 | 0.056 | n/a | 0.000 | 0.000 | 3.597 | 200.649 | 0.011 | n/a | 0.041 | 0.000 | n/a | n/a | 0.132 | 0.056 | 0.000 | 0.132 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d0000000000000ece | 202.624 | 0.025 | n/a | 0.000 | 0.000 | 0.365 | 202.127 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.056 | 0.025 | 0.000 | 0.056 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d0000000000000eea | 202.258 | 0.023 | n/a | 0.000 | 0.000 | 1.410 | 200.703 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.057 | 0.023 | 0.000 | 0.057 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d0000000000000ef7 | 201.990 | 0.043 | n/a | 0.000 | 0.000 | 0.634 | 201.124 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.082 | 0.043 | 0.000 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d0000000000000f2f | 201.896 | 0.042 | n/a | 0.000 | 0.000 | 0.753 | 200.942 | 0.007 | n/a | 0.094 | 0.000 | n/a | n/a | 0.058 | 0.042 | 0.000 | 0.058 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d0000000000000eff | 201.852 | 0.060 | n/a | 0.000 | 0.000 | 0.633 | 200.905 | 0.016 | n/a | 0.056 | 0.000 | n/a | n/a | 0.181 | 0.060 | 0.000 | 0.181 | gw-r/thread-48/journal/page | none observed |
| 37cd8c891302942d0000000000000f11 | 201.834 | 0.026 | n/a | 0.000 | 0.000 | 1.293 | 200.434 | 0.007 | n/a | 0.021 | 0.000 | n/a | n/a | 0.054 | 0.026 | 0.000 | 0.054 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d0000000000000ef2 | 201.823 | 0.036 | n/a | 0.000 | 0.000 | 0.527 | 201.059 | 0.013 | n/a | 0.083 | 0.000 | n/a | n/a | 0.104 | 0.036 | 0.000 | 0.104 | gw-r/thread-41/journal/page | none observed |
| 37cd8c891302942d0000000000000ec4 | 201.789 | 0.037 | n/a | 0.000 | 0.000 | 0.411 | 201.124 | 0.020 | n/a | 0.104 | 0.000 | n/a | n/a | 0.093 | 0.037 | 0.000 | 0.093 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d0000000000000ecb | 201.652 | 0.029 | n/a | 0.000 | 0.000 | 0.462 | 201.009 | 0.016 | n/a | 0.070 | 0.000 | n/a | n/a | 0.065 | 0.029 | 0.000 | 0.065 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d0000000000000f26 | 201.650 | 0.051 | n/a | 0.000 | 0.000 | 0.757 | 200.697 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.093 | 0.051 | 0.000 | 0.093 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d0000000000000ec0 | 201.635 | 0.021 | n/a | 0.000 | 0.000 | 0.560 | 200.929 | 0.012 | n/a | 0.069 | 0.000 | n/a | n/a | 0.045 | 0.021 | 0.000 | 0.045 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d0000000000000ef0 | 201.614 | 0.052 | n/a | 0.000 | 0.000 | 0.644 | 200.760 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.120 | 0.052 | 0.000 | 0.120 | gw-r/thread-64/journal/page | none observed |
| 37cd8c891302942d0000000000000f2e | 201.578 | 0.051 | n/a | 0.000 | 0.000 | 0.746 | 200.634 | 0.007 | n/a | 0.030 | 0.000 | n/a | n/a | 0.110 | 0.051 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d0000000000000efe | 201.565 | 0.055 | n/a | 0.000 | 0.000 | 0.703 | 200.637 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.109 | 0.055 | 0.000 | 0.109 | gw-r/thread-46/journal/page | none observed |
| 37cd8c891302942d0000000000000ee3 | 201.549 | 0.029 | n/a | 0.000 | 0.000 | 0.431 | 200.936 | 0.014 | n/a | 0.065 | 0.000 | n/a | n/a | 0.074 | 0.029 | 0.000 | 0.074 | gw-r/thread-44/journal/page | none observed |
| 37cd8c891302942d0000000000000ef8 | 201.540 | 0.042 | n/a | 0.000 | 0.000 | 0.620 | 200.727 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.094 | 0.042 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d0000000000000f01 | 201.535 | 0.041 | n/a | 0.000 | 0.000 | 0.497 | 200.809 | 0.015 | n/a | 0.068 | 0.000 | n/a | n/a | 0.106 | 0.041 | 0.000 | 0.106 | gw-r/thread-43/journal/page | none observed |
| 37cd8c891302942d0000000000000ee5 | 201.501 | 0.031 | n/a | 0.000 | 0.000 | 0.403 | 200.912 | 0.016 | n/a | 0.075 | 0.000 | n/a | n/a | 0.066 | 0.031 | 0.000 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 37cd8c891302942d0000000000000efb | 201.492 | 0.028 | n/a | 0.000 | 0.000 | 1.001 | 200.368 | 0.006 | n/a | 0.018 | 0.000 | n/a | n/a | 0.072 | 0.028 | 0.000 | 0.072 | gw-r/thread-44/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
