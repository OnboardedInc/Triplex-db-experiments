# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (107.937 ms, trace `65ebe0af47c4843d0000000000001df7`); `gw-w/thread-40/peer.transact-await (includes order/network/storage)` (96.438 ms, trace `65ebe0af47c4843d000000000000013e`); `gw-w/thread-43/gateway.admitted-work` (66.858 ms, trace `65ebe0af47c4843d0000000000000115`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (96.119 ms, trace `65ebe0af47c4843d00000000000001fa`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (62.162 ms, trace `65ebe0af47c4843d00000000000004aa`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p5-defer-a-3-deferred`; source `5c315e43102d54fcc193e8baaab318166f8b6c12`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3706/3711 (99.865%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 7419095.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 237 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: Deferred witness order: Deferred witness content/freshness/binding/order mismatch. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14491.508 | 633.663 | 12.924 | 457 |
| L1 | 0 | 19972.031 | 429.299 | 8.009 | 668 |
| L4 | 0 | 19978.992 | 393.265 | 11.249 | 628 |
| L16 | 0 | 19982.040 | 413.965 | 21.434 | 686 |
| L64 | 0 | 19980.989 | 432.870 | 9.977 | 870 |
| L256 | 0 | 19981.936 | 553.866 | 19.557 | 688 |
| L1024 | 0 | 19977.458 | 3749.446 | 30.767 | 17146 |
| tail | 0 | 64489.792 | 11354.023 | 101.393 | 52824 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 65ebe0af47c4843d0000000000001df7 | driver.queue.scheduler-dispatch | 0.049 | none | 0 / 32 |
| 65ebe0af47c4843d0000000000001df7 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 65ebe0af47c4843d0000000000001df7 waited: []

| 65ebe0af47c4843d000000000000013e | driver.queue.scheduler-dispatch | 0.075 | none | 0 / 32 |
| 65ebe0af47c4843d000000000000013e | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 65ebe0af47c4843d000000000000013e waited: []

| 65ebe0af47c4843d0000000000000115 | driver.queue.scheduler-dispatch | 0.509 | none | 0 / 32 |
| 65ebe0af47c4843d0000000000000115 | driver.queue.scheduler-late | 0.010 | none | 0 / 32 |

Observed active steps while trace 65ebe0af47c4843d0000000000000115 waited: []

| 65ebe0af47c4843d00000000000001fa | driver.queue.scheduler-dispatch | 0.050 | none | 0 / 32 |
| 65ebe0af47c4843d00000000000001fa | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 65ebe0af47c4843d00000000000001fa waited: []

| 65ebe0af47c4843d00000000000004aa | driver.queue.scheduler-late | 27.915 | none | 2 / 32 |
| 65ebe0af47c4843d00000000000004aa | driver.queue.scheduler-dispatch | 0.331 | none | 2 / 32 |

Observed active steps while trace 65ebe0af47c4843d00000000000004aa waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.675 | 0.514 | 0.000 | 0.706 | 4.639 | 0.191 | 0.000 | 0.328 | 1.594 | 9.391 | 0.063 | n/a | 0.485 | 18.763 | n/a | n/a | 0.082 | 5.591 | 0.168 | 0.082 |
| p99 | 117.044 | 6.195 | 0.000 | 6.363 | 15.759 | 0.888 | 8.852 | 1.299 | 4.444 | 74.296 | 3.037 | n/a | 6.363 | 37.008 | n/a | n/a | 0.603 | 22.785 | 0.408 | 0.603 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d0000000000000115 | 117.044 | 10.415 | 0.888 | 4.983 | 0.519 | 3.082 | 74.296 | 0.571 | n/a | 0.281 | 21.848 | n/a | n/a | 0.163 | 16.805 | 0.144 | 0.163 | gw-w/thread-43/gateway.admitted-work | none observed |
| 65ebe0af47c4843d00000000000000f3 | 72.908 | 13.145 | 0.510 | 0.000 | 0.084 | 2.130 | 23.205 | 0.238 | n/a | 0.291 | 33.227 | n/a | n/a | 0.077 | 13.739 | 0.188 | 0.077 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000000f0 | 71.562 | 12.665 | 0.015 | 8.852 | 1.253 | 1.250 | 3.480 | 0.071 | n/a | 6.363 | 37.008 | n/a | n/a | 0.603 | 22.785 | 0.318 | 0.603 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000116 | 59.043 | 15.759 | 0.013 | 4.271 | 1.299 | 3.292 | 7.950 | 0.093 | n/a | 0.417 | 25.825 | n/a | n/a | 0.125 | 21.342 | 0.361 | 0.125 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000122 | 52.237 | 4.883 | 0.234 | 0.369 | 0.105 | 1.639 | 25.349 | 0.063 | n/a | 0.667 | 18.882 | n/a | n/a | 0.046 | 5.591 | 0.107 | 0.046 | gw-w/thread-42/gateway.admitted-work | none observed |
| 65ebe0af47c4843d00000000000000f7 | 48.788 | 5.625 | 0.338 | 0.000 | 0.185 | 2.259 | 17.331 | 3.037 | n/a | 0.179 | 19.733 | n/a | n/a | 0.101 | 6.148 | 0.126 | 0.101 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000103 | 46.545 | 4.639 | 0.297 | 0.000 | 0.107 | 4.444 | 9.391 | 0.085 | n/a | 0.209 | 27.278 | n/a | n/a | 0.094 | 5.043 | 0.108 | 0.094 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000011a | 45.642 | 3.948 | 0.244 | 0.287 | 0.094 | 2.016 | 19.974 | 0.107 | n/a | 0.166 | 18.760 | n/a | n/a | 0.045 | 4.574 | 0.100 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000000fb | 44.624 | 5.684 | 0.339 | 0.000 | 0.086 | 2.619 | 19.448 | 0.119 | n/a | 5.038 | 11.232 | n/a | n/a | 0.058 | 6.110 | 0.137 | 0.058 | gw-w/thread-42/gateway.admitted-work | none observed |
| 65ebe0af47c4843d0000000000000128 | 44.539 | 6.180 | 0.292 | 0.259 | 0.084 | 1.731 | 11.483 | 0.048 | n/a | 0.521 | 23.888 | n/a | n/a | 0.053 | 6.815 | 0.153 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000000ff | 42.668 | 5.756 | 0.303 | 0.000 | 0.061 | 4.216 | 12.697 | 0.055 | n/a | 0.118 | 19.365 | n/a | n/a | 0.099 | 6.120 | 0.143 | 0.099 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000105 | 42.024 | 4.507 | 0.285 | 0.000 | 0.164 | 1.594 | 10.534 | 0.097 | n/a | 1.169 | 23.592 | n/a | n/a | 0.082 | 4.956 | 0.118 | 0.082 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000010b | 41.017 | 5.118 | 0.310 | 0.000 | 0.117 | 1.291 | 14.595 | 0.098 | n/a | 0.641 | 18.763 | n/a | n/a | 0.083 | 5.545 | 0.135 | 0.083 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000000f8 | 40.245 | 6.022 | 0.020 | 3.268 | 1.083 | 1.543 | 2.789 | 0.052 | n/a | 2.644 | 22.719 | n/a | n/a | 0.104 | 10.394 | 0.258 | 0.104 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000100 | 39.675 | 6.030 | 0.004 | 3.124 | 0.868 | 0.903 | 3.482 | 0.038 | n/a | 0.130 | 24.962 | n/a | n/a | 0.132 | 10.027 | 0.253 | 0.132 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000010d | 38.016 | 5.313 | 0.417 | 0.811 | 0.080 | 1.743 | 16.115 | 0.084 | n/a | 0.165 | 13.227 | n/a | n/a | 0.062 | 6.620 | 0.174 | 0.062 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000000f4 | 35.402 | 4.544 | 0.012 | 2.247 | 0.405 | 0.888 | 5.520 | 0.218 | n/a | 0.933 | 20.505 | n/a | n/a | 0.130 | 7.208 | 0.204 | 0.130 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000012a | 32.868 | 4.393 | 0.191 | 0.000 | 0.083 | 1.327 | 14.768 | 0.055 | n/a | 0.543 | 11.463 | n/a | n/a | 0.044 | 4.667 | 0.142 | 0.044 | gw-w/thread-46/gateway.admitted-work | none observed |
| 65ebe0af47c4843d000000000000011e | 30.144 | 3.844 | 0.222 | 0.317 | 0.083 | 1.608 | 11.209 | 0.091 | n/a | 0.164 | 12.562 | n/a | n/a | 0.044 | 4.466 | 0.148 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000108 | 28.779 | 3.093 | 0.006 | 0.000 | 0.717 | 1.167 | 1.973 | 0.041 | n/a | 0.527 | 21.182 | n/a | n/a | 0.075 | 3.815 | 0.133 | 0.075 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.280 | 0.995 | 0.000 | 0.948 | 3.351 | 0.007 | 0.000 | 0.795 | 1.085 | 1.976 | 0.050 | n/a | 0.933 | 11.609 | n/a | n/a | 0.088 | 4.741 | 0.215 | 0.088 |
| p99 | 40.245 | 3.978 | 0.000 | 4.462 | 6.022 | 0.031 | 3.268 | 1.276 | 1.543 | 5.520 | 0.218 | n/a | 3.605 | 22.719 | n/a | n/a | 0.145 | 10.394 | 0.408 | 0.145 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d00000000000000f8 | 40.245 | 6.022 | 0.020 | 3.268 | 1.083 | 1.543 | 2.789 | 0.052 | n/a | 2.644 | 22.719 | n/a | n/a | 0.104 | 10.394 | 0.258 | 0.104 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000000f4 | 35.402 | 4.544 | 0.012 | 2.247 | 0.405 | 0.888 | 5.520 | 0.218 | n/a | 0.933 | 20.505 | n/a | n/a | 0.130 | 7.208 | 0.204 | 0.130 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000112 | 23.664 | 4.027 | 0.011 | 0.000 | 1.276 | 0.838 | 1.255 | 0.050 | n/a | 0.135 | 15.926 | n/a | n/a | 0.145 | 5.315 | 0.225 | 0.145 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000011f | 22.080 | 3.961 | 0.007 | 0.000 | 0.773 | 1.310 | 1.976 | 0.044 | n/a | 1.298 | 12.601 | n/a | n/a | 0.111 | 4.741 | 0.215 | 0.111 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000011b | 21.280 | 2.773 | 0.005 | 0.000 | 0.795 | 1.364 | 4.371 | 0.050 | n/a | 0.478 | 11.356 | n/a | n/a | 0.088 | 3.573 | 0.168 | 0.088 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000125 | 20.600 | 3.201 | 0.031 | 0.000 | 0.800 | 0.968 | 1.207 | 0.039 | n/a | 3.605 | 10.676 | n/a | n/a | 0.074 | 4.033 | 0.196 | 0.074 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000000fd | 19.331 | 2.237 | 0.005 | 0.000 | 0.328 | 1.518 | 2.552 | 0.123 | n/a | 0.879 | 11.609 | n/a | n/a | 0.081 | 2.570 | 0.133 | 0.081 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000123 | 14.548 | 3.351 | 0.006 | 2.070 | 0.515 | 1.085 | 1.417 | 0.051 | n/a | 1.096 | 4.869 | n/a | n/a | 0.087 | 5.942 | 0.408 | 0.087 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000110 | 11.956 | 2.440 | 0.006 | 0.000 | 0.965 | 0.924 | 1.355 | 0.045 | n/a | 0.407 | 5.758 | n/a | n/a | 0.057 | 3.410 | 0.285 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.081 | 0.453 | 0.000 | 0.703 | 4.470 | 0.018 | 0.000 | 0.246 | 1.588 | 4.823 | 0.055 | n/a | 0.495 | 12.981 | n/a | n/a | 0.064 | 5.107 | 0.205 | 0.064 |
| p99 | 117.705 | 5.985 | 0.000 | 5.883 | 8.673 | 0.513 | 1.688 | 7.158 | 11.533 | 40.048 | 0.124 | n/a | 4.107 | 96.438 | n/a | n/a | 0.214 | 10.722 | 0.428 | 0.214 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d000000000000013e | 117.705 | 5.448 | 0.202 | 0.347 | 0.077 | 2.038 | 12.936 | 0.057 | n/a | 0.113 | 96.438 | n/a | n/a | 0.048 | 6.075 | 0.052 | 0.048 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000135 | 66.535 | 5.711 | 0.209 | 0.418 | 0.115 | 5.371 | 17.316 | 0.119 | n/a | 1.800 | 35.427 | n/a | n/a | 0.048 | 6.454 | 0.097 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000166 | 60.349 | 3.850 | 0.255 | 0.378 | 0.182 | 2.499 | 40.048 | 0.047 | n/a | 0.400 | 12.617 | n/a | n/a | 0.074 | 4.664 | 0.077 | 0.074 | gw-w/thread-46/gateway.admitted-work | none observed |
| 65ebe0af47c4843d0000000000000170 | 53.831 | 4.808 | 0.223 | 0.000 | 0.108 | 1.573 | 17.686 | 0.047 | n/a | 1.917 | 27.408 | n/a | n/a | 0.062 | 5.139 | 0.095 | 0.062 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000014a | 47.740 | 6.678 | 0.298 | 0.293 | 0.151 | 2.049 | 9.057 | 0.098 | n/a | 4.107 | 24.920 | n/a | n/a | 0.090 | 7.420 | 0.155 | 0.090 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000140 | 47.143 | 4.741 | 0.236 | 0.000 | 0.082 | 1.941 | 12.865 | 0.083 | n/a | 0.157 | 26.982 | n/a | n/a | 0.057 | 5.059 | 0.107 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000146 | 42.789 | 4.000 | 0.247 | 0.000 | 0.063 | 1.560 | 10.915 | 0.048 | n/a | 1.903 | 24.010 | n/a | n/a | 0.045 | 4.309 | 0.101 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000012e | 42.094 | 5.884 | 0.193 | 0.273 | 0.081 | 1.931 | 17.195 | 0.104 | n/a | 0.168 | 16.220 | n/a | n/a | 0.045 | 6.430 | 0.153 | 0.045 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000136 | 41.462 | 8.604 | 0.006 | 0.000 | 0.738 | 11.533 | 5.774 | 0.108 | n/a | 3.835 | 10.734 | n/a | n/a | 0.130 | 9.348 | 0.225 | 0.130 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000172 | 38.793 | 4.786 | 0.243 | 0.470 | 0.146 | 1.564 | 12.262 | 0.055 | n/a | 0.150 | 19.054 | n/a | n/a | 0.063 | 5.645 | 0.146 | 0.063 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000142 | 37.511 | 5.315 | 0.444 | 0.481 | 0.163 | 1.602 | 16.057 | 0.113 | n/a | 0.145 | 13.081 | n/a | n/a | 0.111 | 6.402 | 0.171 | 0.111 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000138 | 37.219 | 4.453 | 0.254 | 0.242 | 0.083 | 1.853 | 11.244 | 0.096 | n/a | 0.534 | 18.401 | n/a | n/a | 0.060 | 5.032 | 0.135 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000012c | 36.532 | 4.663 | 0.261 | 0.235 | 0.125 | 1.665 | 12.453 | 0.063 | n/a | 0.525 | 16.483 | n/a | n/a | 0.059 | 5.284 | 0.145 | 0.059 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000162 | 35.056 | 3.837 | 0.238 | 0.000 | 0.136 | 1.259 | 14.237 | 0.103 | n/a | 0.137 | 15.024 | n/a | n/a | 0.085 | 4.211 | 0.120 | 0.085 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000013b | 33.081 | 3.975 | 0.005 | 0.000 | 0.255 | 1.102 | 4.823 | 0.039 | n/a | 0.435 | 22.370 | n/a | n/a | 0.076 | 4.235 | 0.128 | 0.076 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000132 | 31.254 | 5.086 | 0.011 | 0.000 | 0.264 | 1.588 | 1.774 | 0.042 | n/a | 0.495 | 21.917 | n/a | n/a | 0.078 | 5.361 | 0.172 | 0.078 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000016a | 30.373 | 6.902 | 0.236 | 0.000 | 0.134 | 1.781 | 6.384 | 0.056 | n/a | 0.411 | 14.386 | n/a | n/a | 0.082 | 7.272 | 0.239 | 0.082 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000156 | 30.356 | 4.324 | 0.313 | 0.385 | 0.086 | 1.844 | 8.796 | 0.088 | n/a | 0.234 | 14.220 | n/a | n/a | 0.066 | 5.107 | 0.168 | 0.066 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000143 | 28.779 | 5.510 | 0.006 | 0.000 | 0.378 | 1.156 | 2.520 | 0.039 | n/a | 1.445 | 17.510 | n/a | n/a | 0.214 | 5.894 | 0.205 | 0.214 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000175 | 26.261 | 7.076 | 0.008 | 0.000 | 0.246 | 2.023 | 2.942 | 0.060 | n/a | 0.839 | 12.981 | n/a | n/a | 0.086 | 7.330 | 0.279 | 0.086 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.807 | 0.688 | 0.000 | 0.539 | 2.762 | 0.006 | 0.000 | 0.825 | 1.242 | 1.774 | 0.053 | n/a | 0.495 | 8.572 | n/a | n/a | 0.078 | 4.586 | 0.258 | 0.078 |
| p99 | 41.462 | 1.003 | 0.000 | 0.860 | 8.604 | 0.018 | 0.000 | 7.158 | 11.533 | 5.774 | 0.108 | n/a | 3.835 | 21.917 | n/a | n/a | 0.130 | 9.348 | 0.366 | 0.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d0000000000000136 | 41.462 | 8.604 | 0.006 | 0.000 | 0.738 | 11.533 | 5.774 | 0.108 | n/a | 3.835 | 10.734 | n/a | n/a | 0.130 | 9.348 | 0.225 | 0.130 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000132 | 31.254 | 5.086 | 0.011 | 0.000 | 0.264 | 1.588 | 1.774 | 0.042 | n/a | 0.495 | 21.917 | n/a | n/a | 0.078 | 5.361 | 0.172 | 0.078 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000176 | 24.646 | 1.846 | 0.004 | 0.000 | 7.158 | 4.155 | 2.081 | 0.083 | n/a | 0.684 | 8.572 | n/a | n/a | 0.063 | 9.008 | 0.366 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.288ms; driver.expected-state.bind-receipt 1.064ms |
| 65ebe0af47c4843d000000000000016d | 18.726 | 4.719 | 0.018 | 0.000 | 0.957 | 1.596 | 2.012 | 0.062 | n/a | 3.498 | 5.733 | n/a | n/a | 0.130 | 5.694 | 0.304 | 0.130 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000015b | 17.807 | 3.496 | 0.007 | 0.000 | 1.083 | 0.967 | 1.391 | 0.050 | n/a | 0.120 | 10.596 | n/a | n/a | 0.097 | 4.586 | 0.258 | 0.097 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000147 | 16.279 | 2.220 | 0.005 | 0.000 | 0.810 | 1.242 | 1.550 | 0.040 | n/a | 0.609 | 9.745 | n/a | n/a | 0.057 | 3.035 | 0.186 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000151 | 12.250 | 2.333 | 0.006 | 0.000 | 1.115 | 0.880 | 1.437 | 0.053 | n/a | 0.115 | 6.249 | n/a | n/a | 0.064 | 3.453 | 0.282 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000015f | 11.562 | 2.762 | 0.005 | 0.000 | 0.825 | 1.135 | 1.967 | 0.085 | n/a | 0.191 | 4.500 | n/a | n/a | 0.091 | 3.593 | 0.311 | 0.091 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.072 | 0.573 | 0.000 | 0.755 | 4.314 | 0.195 | 0.236 | 0.206 | 1.351 | 5.069 | 0.051 | n/a | 0.163 | 13.053 | n/a | n/a | 0.078 | 5.003 | 0.182 | 0.078 |
| p99 | 86.863 | 4.758 | 0.054 | 4.525 | 9.977 | 0.462 | 2.404 | 1.156 | 4.927 | 26.628 | 0.154 | n/a | 3.463 | 71.750 | n/a | n/a | 0.255 | 11.356 | 0.434 | 0.255 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d0000000000000191 | 86.863 | 3.790 | 0.206 | 0.269 | 0.078 | 1.443 | 9.094 | 0.060 | n/a | 0.119 | 71.750 | n/a | n/a | 0.054 | 4.343 | 0.050 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001b3 | 54.187 | 6.742 | 0.323 | 0.243 | 0.085 | 1.657 | 26.628 | 0.041 | n/a | 0.104 | 18.303 | n/a | n/a | 0.060 | 7.394 | 0.136 | 0.060 | gw-w/thread-44/gateway.admitted-work | none observed |
| 65ebe0af47c4843d0000000000000184 | 44.369 | 4.376 | 0.309 | 0.404 | 0.206 | 3.000 | 17.529 | 0.057 | n/a | 0.183 | 18.198 | n/a | n/a | 0.107 | 5.296 | 0.119 | 0.107 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000197 | 38.825 | 4.725 | 0.329 | 0.267 | 0.084 | 3.278 | 16.233 | 0.110 | n/a | 0.215 | 13.527 | n/a | n/a | 0.057 | 5.405 | 0.139 | 0.057 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000180 | 38.030 | 4.246 | 0.257 | 0.266 | 0.151 | 1.206 | 13.635 | 0.093 | n/a | 0.405 | 17.688 | n/a | n/a | 0.083 | 4.920 | 0.129 | 0.083 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000198 | 35.901 | 7.943 | 0.006 | 0.000 | 0.155 | 2.726 | 2.605 | 0.059 | n/a | 0.172 | 22.142 | n/a | n/a | 0.093 | 8.104 | 0.226 | 0.093 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000187 | 35.074 | 4.314 | 0.271 | 0.333 | 0.138 | 1.351 | 10.203 | 0.049 | n/a | 0.342 | 17.966 | n/a | n/a | 0.107 | 5.057 | 0.144 | 0.107 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000194 | 34.787 | 5.571 | 0.008 | 0.000 | 0.429 | 1.084 | 2.376 | 0.075 | n/a | 0.201 | 24.788 | n/a | n/a | 0.255 | 6.008 | 0.173 | 0.255 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000018f | 34.644 | 3.974 | 0.340 | 0.278 | 0.080 | 4.927 | 16.069 | 0.048 | n/a | 0.337 | 8.545 | n/a | n/a | 0.047 | 4.672 | 0.135 | 0.047 | gw-w/thread-44/gateway.admitted-work | none observed |
| 65ebe0af47c4843d00000000000001bf | 34.432 | 4.599 | 0.266 | 0.260 | 0.060 | 1.635 | 16.875 | 0.072 | n/a | 0.157 | 10.466 | n/a | n/a | 0.042 | 5.184 | 0.151 | 0.042 | gw-w/thread-44/gateway.admitted-work | none observed |
| 65ebe0af47c4843d00000000000001b9 | 33.122 | 6.097 | 0.275 | 0.256 | 0.265 | 1.266 | 7.872 | 0.053 | n/a | 0.094 | 16.793 | n/a | n/a | 0.152 | 6.893 | 0.208 | 0.152 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000019b | 33.046 | 4.559 | 0.438 | 0.240 | 0.109 | 1.380 | 8.784 | 0.045 | n/a | 0.118 | 17.294 | n/a | n/a | 0.078 | 5.347 | 0.162 | 0.078 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001b6 | 32.188 | 8.351 | 0.009 | 2.404 | 0.593 | 2.275 | 1.971 | 0.042 | n/a | 0.094 | 16.358 | n/a | n/a | 0.092 | 11.356 | 0.353 | 0.092 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000017d | 31.599 | 3.031 | 0.008 | 0.000 | 0.603 | 0.931 | 15.629 | 0.154 | n/a | 0.163 | 10.999 | n/a | n/a | 0.084 | 3.641 | 0.115 | 0.084 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| 65ebe0af47c4843d00000000000001a5 | 31.270 | 4.408 | 0.214 | 0.311 | 0.070 | 1.342 | 9.843 | 0.041 | n/a | 0.113 | 14.883 | n/a | n/a | 0.046 | 5.003 | 0.160 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000188 | 30.967 | 3.029 | 0.006 | 0.000 | 0.206 | 1.127 | 6.822 | 0.041 | n/a | 0.110 | 19.562 | n/a | n/a | 0.065 | 3.241 | 0.105 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001aa | 30.877 | 7.069 | 0.007 | 0.000 | 0.753 | 2.792 | 1.816 | 0.044 | n/a | 3.463 | 14.837 | n/a | n/a | 0.096 | 7.829 | 0.254 | 0.096 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001c1 | 29.318 | 4.349 | 0.371 | 0.229 | 0.100 | 1.606 | 5.770 | 0.049 | n/a | 3.126 | 13.666 | n/a | n/a | 0.052 | 5.050 | 0.172 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001b5 | 29.289 | 3.978 | 0.209 | 0.236 | 0.062 | 1.568 | 10.098 | 0.072 | n/a | 0.361 | 12.647 | n/a | n/a | 0.058 | 4.485 | 0.153 | 0.058 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001a9 | 29.072 | 5.366 | 0.414 | 0.542 | 0.126 | 1.959 | 9.470 | 0.073 | n/a | 0.133 | 10.918 | n/a | n/a | 0.072 | 6.447 | 0.222 | 0.072 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.759 | 0.187 | 0.000 | 0.791 | 3.000 | 0.007 | 0.000 | 0.603 | 0.891 | 1.923 | 0.046 | n/a | 0.201 | 10.999 | n/a | n/a | 0.084 | 3.641 | 0.173 | 0.084 |
| p99 | 34.787 | 1.001 | 0.000 | 1.283 | 5.571 | 0.021 | 0.000 | 1.156 | 1.465 | 15.629 | 0.154 | n/a | 0.999 | 24.788 | n/a | n/a | 0.255 | 6.008 | 0.337 | 0.255 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d0000000000000194 | 34.787 | 5.571 | 0.008 | 0.000 | 0.429 | 1.084 | 2.376 | 0.075 | n/a | 0.201 | 24.788 | n/a | n/a | 0.255 | 6.008 | 0.173 | 0.255 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000017d | 31.599 | 3.031 | 0.008 | 0.000 | 0.603 | 0.931 | 15.629 | 0.154 | n/a | 0.163 | 10.999 | n/a | n/a | 0.084 | 3.641 | 0.115 | 0.084 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| 65ebe0af47c4843d00000000000001c5 | 23.013 | 3.151 | 0.008 | 0.000 | 1.032 | 0.755 | 0.970 | 0.035 | n/a | 0.713 | 16.270 | n/a | n/a | 0.079 | 4.191 | 0.182 | 0.079 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000018c | 20.012 | 2.252 | 0.005 | 0.000 | 0.072 | 0.689 | 1.098 | 0.035 | n/a | 0.112 | 15.691 | n/a | n/a | 0.058 | 2.328 | 0.116 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000192 | 20.002 | 4.413 | 0.021 | 0.000 | 1.101 | 1.465 | 1.923 | 0.079 | n/a | 0.220 | 10.676 | n/a | n/a | 0.104 | 5.535 | 0.277 | 0.104 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000181 | 19.759 | 2.781 | 0.005 | 0.000 | 0.208 | 1.020 | 2.030 | 0.086 | n/a | 0.999 | 12.569 | n/a | n/a | 0.063 | 2.994 | 0.152 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001c8 | 19.164 | 2.060 | 0.006 | 0.000 | 0.910 | 0.789 | 2.325 | 0.099 | n/a | 0.965 | 11.908 | n/a | n/a | 0.103 | 2.976 | 0.155 | 0.103 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001bd | 14.038 | 2.433 | 0.004 | 0.000 | 0.413 | 0.531 | 1.214 | 0.046 | n/a | 0.487 | 8.817 | n/a | n/a | 0.094 | 2.850 | 0.203 | 0.094 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001a6 | 13.935 | 3.529 | 0.009 | 0.000 | 1.156 | 0.937 | 3.567 | 0.035 | n/a | 0.110 | 4.510 | n/a | n/a | 0.082 | 4.695 | 0.337 | 0.082 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001b0 | 13.433 | 3.000 | 0.007 | 0.000 | 0.930 | 0.891 | 1.245 | 0.044 | n/a | 0.130 | 7.086 | n/a | n/a | 0.100 | 3.937 | 0.293 | 0.100 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.572 | 0.371 | 0.000 | 0.615 | 3.752 | 0.015 | 0.000 | 0.121 | 1.210 | 4.191 | 0.045 | n/a | 0.377 | 12.183 | n/a | n/a | 0.063 | 4.312 | 0.193 | 0.063 |
| p99 | 110.383 | 1.998 | 0.000 | 1.801 | 13.641 | 0.464 | 0.517 | 1.073 | 4.983 | 25.813 | 0.619 | n/a | 3.795 | 96.119 | n/a | n/a | 0.170 | 13.759 | 0.361 | 0.170 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d00000000000001fa | 110.383 | 3.831 | 0.218 | 0.000 | 0.052 | 1.129 | 8.521 | 0.041 | n/a | 0.407 | 96.119 | n/a | n/a | 0.064 | 4.101 | 0.037 | 0.064 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001ef | 51.915 | 13.641 | 0.012 | 0.000 | 0.106 | 4.948 | 15.745 | 0.116 | n/a | 0.223 | 17.065 | n/a | n/a | 0.059 | 13.759 | 0.265 | 0.059 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001ee | 47.132 | 4.344 | 0.312 | 0.430 | 0.057 | 1.549 | 25.813 | 0.072 | n/a | 0.135 | 14.367 | n/a | n/a | 0.054 | 5.142 | 0.109 | 0.054 | gw-w/thread-47/gateway.admitted-work | none observed |
| 65ebe0af47c4843d00000000000001e1 | 39.345 | 6.953 | 0.010 | 0.000 | 1.062 | 1.123 | 1.366 | 0.159 | n/a | 0.871 | 27.669 | n/a | n/a | 0.133 | 8.024 | 0.204 | 0.133 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001d7 | 35.691 | 4.170 | 0.308 | 0.255 | 0.060 | 1.641 | 12.500 | 0.051 | n/a | 1.236 | 15.418 | n/a | n/a | 0.051 | 4.793 | 0.134 | 0.051 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001d3 | 34.274 | 4.695 | 0.004 | 0.000 | 0.136 | 1.288 | 1.900 | 0.094 | n/a | 1.150 | 24.934 | n/a | n/a | 0.073 | 4.836 | 0.141 | 0.073 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.208ms |
| 65ebe0af47c4843d00000000000001f3 | 34.207 | 4.179 | 0.233 | 0.000 | 0.085 | 1.396 | 15.784 | 0.092 | n/a | 3.795 | 8.587 | n/a | n/a | 0.055 | 4.497 | 0.131 | 0.055 | gw-w/thread-45/gateway.admitted-work | driver.publication.persist-deferred 2.193ms |
| 65ebe0af47c4843d0000000000000210 | 32.656 | 6.930 | 0.398 | 0.488 | 0.100 | 1.517 | 8.096 | 0.619 | n/a | 0.861 | 13.569 | n/a | n/a | 0.077 | 7.916 | 0.242 | 0.077 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001e4 | 32.032 | 5.185 | 0.294 | 0.267 | 0.080 | 2.381 | 14.582 | 0.078 | n/a | 0.648 | 8.452 | n/a | n/a | 0.066 | 5.826 | 0.182 | 0.066 | gw-w/thread-46/gateway.admitted-work | none observed |
| 65ebe0af47c4843d0000000000000206 | 31.171 | 4.047 | 0.295 | 0.000 | 0.087 | 3.154 | 10.101 | 0.083 | n/a | 0.465 | 12.889 | n/a | n/a | 0.051 | 4.429 | 0.142 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000218 | 30.723 | 5.037 | 0.281 | 0.386 | 0.073 | 4.983 | 14.175 | 0.088 | n/a | 0.230 | 5.404 | n/a | n/a | 0.067 | 5.776 | 0.188 | 0.067 | gw-w/thread-47/gateway.admitted-work | none observed |
| 65ebe0af47c4843d00000000000001df | 29.422 | 3.628 | 0.006 | 0.000 | 0.253 | 0.757 | 4.460 | 0.040 | n/a | 0.074 | 20.148 | n/a | n/a | 0.055 | 3.887 | 0.132 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000020a | 28.854 | 3.626 | 0.262 | 0.000 | 0.078 | 1.423 | 10.921 | 0.117 | n/a | 0.134 | 12.246 | n/a | n/a | 0.047 | 3.967 | 0.137 | 0.047 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000216 | 27.573 | 4.694 | 0.223 | 0.320 | 0.089 | 1.485 | 6.669 | 0.046 | n/a | 0.400 | 13.594 | n/a | n/a | 0.054 | 5.325 | 0.193 | 0.054 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001da | 26.554 | 4.510 | 0.296 | 0.304 | 0.071 | 1.665 | 6.168 | 0.043 | n/a | 0.377 | 13.045 | n/a | n/a | 0.075 | 5.181 | 0.195 | 0.075 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000021a | 25.968 | 3.752 | 0.239 | 0.265 | 0.070 | 1.345 | 5.825 | 0.042 | n/a | 0.331 | 14.047 | n/a | n/a | 0.051 | 4.327 | 0.167 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001f8 | 25.523 | 5.379 | 0.336 | 0.517 | 0.056 | 1.372 | 5.517 | 0.043 | n/a | 0.076 | 12.183 | n/a | n/a | 0.042 | 6.288 | 0.246 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001de | 24.096 | 3.218 | 0.211 | 0.323 | 0.064 | 1.017 | 7.025 | 0.040 | n/a | 0.095 | 12.050 | n/a | n/a | 0.052 | 3.817 | 0.158 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001e5 | 23.992 | 2.811 | 0.007 | 0.000 | 0.209 | 0.853 | 5.174 | 0.066 | n/a | 0.638 | 14.144 | n/a | n/a | 0.090 | 3.028 | 0.126 | 0.090 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000021e | 22.582 | 4.025 | 0.216 | 0.219 | 0.049 | 1.159 | 5.750 | 0.046 | n/a | 0.380 | 10.683 | n/a | n/a | 0.056 | 4.508 | 0.200 | 0.056 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.889 | 0.589 | 0.000 | 0.677 | 2.852 | 0.007 | 0.000 | 0.539 | 0.888 | 1.366 | 0.043 | n/a | 0.160 | 12.394 | n/a | n/a | 0.083 | 3.400 | 0.204 | 0.083 |
| p99 | 39.345 | 1.473 | 0.000 | 1.187 | 6.953 | 0.015 | 0.000 | 1.062 | 3.935 | 5.174 | 0.159 | n/a | 0.871 | 27.669 | n/a | n/a | 0.133 | 8.024 | 0.299 | 0.133 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d00000000000001e1 | 39.345 | 6.953 | 0.010 | 0.000 | 1.062 | 1.123 | 1.366 | 0.159 | n/a | 0.871 | 27.669 | n/a | n/a | 0.133 | 8.024 | 0.204 | 0.133 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001e5 | 23.992 | 2.811 | 0.007 | 0.000 | 0.209 | 0.853 | 5.174 | 0.066 | n/a | 0.638 | 14.144 | n/a | n/a | 0.090 | 3.028 | 0.126 | 0.090 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000203 | 22.572 | 2.728 | 0.005 | 0.000 | 0.819 | 1.108 | 1.624 | 0.097 | n/a | 0.160 | 15.951 | n/a | n/a | 0.080 | 3.552 | 0.157 | 0.080 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000207 | 22.065 | 3.624 | 0.011 | 0.000 | 0.296 | 0.691 | 1.412 | 0.035 | n/a | 0.153 | 15.766 | n/a | n/a | 0.077 | 3.930 | 0.178 | 0.077 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001ce | 21.745 | 2.629 | 0.006 | 0.000 | 0.515 | 0.870 | 1.429 | 0.042 | n/a | 0.128 | 16.055 | n/a | n/a | 0.070 | 3.150 | 0.145 | 0.070 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001cc | 20.651 | 3.751 | 0.015 | 0.000 | 0.779 | 1.860 | 1.268 | 0.046 | n/a | 0.418 | 12.394 | n/a | n/a | 0.120 | 4.544 | 0.220 | 0.120 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001d2 | 20.186 | 2.855 | 0.006 | 0.000 | 0.539 | 0.888 | 1.117 | 0.035 | n/a | 0.790 | 13.857 | n/a | n/a | 0.099 | 3.400 | 0.168 | 0.099 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001e9 | 19.889 | 2.277 | 0.006 | 0.000 | 0.875 | 0.854 | 1.223 | 0.044 | n/a | 0.128 | 14.420 | n/a | n/a | 0.062 | 3.158 | 0.159 | 0.062 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000211 | 19.708 | 2.852 | 0.006 | 0.000 | 0.533 | 3.935 | 1.092 | 0.042 | n/a | 0.084 | 11.081 | n/a | n/a | 0.084 | 3.391 | 0.172 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001db | 19.139 | 3.792 | 0.014 | 0.000 | 0.294 | 1.210 | 4.191 | 0.043 | n/a | 0.083 | 9.409 | n/a | n/a | 0.104 | 4.099 | 0.214 | 0.104 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001e7 | 17.702 | 4.157 | 0.013 | 0.000 | 0.407 | 1.280 | 1.248 | 0.043 | n/a | 0.124 | 10.323 | n/a | n/a | 0.108 | 4.576 | 0.259 | 0.108 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001f5 | 15.234 | 2.279 | 0.006 | 0.000 | 0.882 | 0.676 | 1.501 | 0.041 | n/a | 0.837 | 8.930 | n/a | n/a | 0.083 | 3.166 | 0.208 | 0.083 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000020b | 14.651 | 2.754 | 0.009 | 0.000 | 0.911 | 1.096 | 1.587 | 0.092 | n/a | 0.133 | 8.001 | n/a | n/a | 0.068 | 3.674 | 0.251 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000001fd | 14.289 | 2.035 | 0.007 | 0.000 | 0.890 | 0.694 | 1.059 | 0.036 | n/a | 0.166 | 9.343 | n/a | n/a | 0.060 | 2.932 | 0.205 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000021b | 11.064 | 2.873 | 0.006 | 0.000 | 0.427 | 0.856 | 1.220 | 0.039 | n/a | 0.694 | 4.878 | n/a | n/a | 0.072 | 3.306 | 0.299 | 0.072 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.015 | 0.349 | 0.000 | 0.676 | 3.507 | 0.010 | 0.000 | 0.345 | 1.091 | 3.800 | 0.042 | n/a | 0.308 | 9.967 | n/a | n/a | 0.068 | 3.968 | 0.191 | 0.068 |
| p99 | 80.460 | 3.009 | 0.045 | 2.731 | 8.198 | 0.389 | 0.408 | 1.241 | 3.843 | 31.783 | 0.092 | n/a | 3.850 | 68.335 | n/a | n/a | 0.239 | 9.090 | 0.448 | 0.239 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d0000000000000259 | 80.460 | 8.198 | 0.011 | 0.000 | 0.880 | 1.043 | 1.748 | 0.034 | n/a | 0.126 | 68.335 | n/a | n/a | 0.084 | 9.090 | 0.113 | 0.084 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000226 | 55.473 | 3.305 | 0.006 | 0.000 | 0.431 | 1.091 | 31.783 | 0.071 | n/a | 0.128 | 18.612 | n/a | n/a | 0.048 | 3.741 | 0.067 | 0.048 | gw-w/thread-40/commit.prepare-and-validate | none observed |
| 65ebe0af47c4843d0000000000000231 | 50.994 | 4.248 | 0.389 | 0.000 | 0.107 | 1.845 | 27.807 | 0.087 | n/a | 0.140 | 16.279 | n/a | n/a | 0.093 | 4.744 | 0.093 | 0.093 | gw-w/thread-45/gateway.admitted-work | none observed |
| 65ebe0af47c4843d0000000000000235 | 45.944 | 6.065 | 0.218 | 0.000 | 0.077 | 1.866 | 17.441 | 0.042 | n/a | 0.130 | 20.056 | n/a | n/a | 0.048 | 6.360 | 0.138 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000025f | 42.400 | 3.934 | 0.204 | 0.000 | 0.082 | 1.346 | 25.454 | 0.047 | n/a | 0.119 | 11.129 | n/a | n/a | 0.085 | 4.219 | 0.100 | 0.085 | gw-w/thread-44/gateway.admitted-work | none observed |
| 65ebe0af47c4843d000000000000024d | 35.768 | 3.617 | 0.258 | 0.000 | 0.090 | 1.726 | 13.531 | 0.071 | n/a | 0.507 | 15.913 | n/a | n/a | 0.056 | 3.965 | 0.111 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000270 | 31.327 | 3.403 | 0.276 | 0.000 | 0.037 | 1.002 | 11.756 | 0.055 | n/a | 0.099 | 14.642 | n/a | n/a | 0.057 | 3.715 | 0.119 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000248 | 29.444 | 1.994 | 0.004 | 0.000 | 0.535 | 3.843 | 1.692 | 0.038 | n/a | 3.850 | 17.438 | n/a | n/a | 0.051 | 2.532 | 0.086 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.088ms |
| 65ebe0af47c4843d0000000000000241 | 29.240 | 5.090 | 0.213 | 0.000 | 0.067 | 1.813 | 10.651 | 0.080 | n/a | 1.038 | 10.231 | n/a | n/a | 0.057 | 5.370 | 0.184 | 0.057 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000022a | 28.022 | 4.655 | 0.197 | 0.408 | 0.057 | 1.378 | 7.450 | 0.043 | n/a | 0.898 | 12.894 | n/a | n/a | 0.042 | 5.317 | 0.190 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000276 | 27.425 | 3.974 | 0.244 | 0.000 | 0.046 | 1.294 | 11.454 | 0.042 | n/a | 0.362 | 9.946 | n/a | n/a | 0.062 | 4.265 | 0.156 | 0.062 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000221 | 27.092 | 3.503 | 0.192 | 0.230 | 0.042 | 1.000 | 8.688 | 0.047 | n/a | 0.069 | 13.263 | n/a | n/a | 0.058 | 3.968 | 0.146 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000268 | 27.039 | 3.936 | 0.245 | 0.000 | 0.058 | 1.007 | 8.597 | 0.036 | n/a | 0.389 | 12.705 | n/a | n/a | 0.066 | 4.238 | 0.157 | 0.066 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000022d | 25.842 | 2.800 | 0.007 | 0.000 | 1.051 | 0.890 | 1.119 | 0.040 | n/a | 1.004 | 18.840 | n/a | n/a | 0.091 | 3.858 | 0.149 | 0.091 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000023e | 25.687 | 3.800 | 0.339 | 0.000 | 0.077 | 1.563 | 9.705 | 0.042 | n/a | 0.141 | 9.967 | n/a | n/a | 0.054 | 4.215 | 0.164 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.287ms |
| 65ebe0af47c4843d0000000000000272 | 23.885 | 2.589 | 0.006 | 0.000 | 1.006 | 2.103 | 2.048 | 0.069 | n/a | 0.164 | 15.827 | n/a | n/a | 0.073 | 3.601 | 0.151 | 0.073 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000022f | 23.598 | 5.495 | 0.006 | 0.000 | 0.742 | 0.851 | 4.651 | 0.032 | n/a | 0.345 | 11.377 | n/a | n/a | 0.099 | 6.243 | 0.265 | 0.099 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000243 | 22.804 | 3.259 | 0.235 | 0.000 | 0.061 | 1.172 | 4.535 | 0.037 | n/a | 0.376 | 13.067 | n/a | n/a | 0.063 | 3.555 | 0.156 | 0.063 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000027c | 22.685 | 3.117 | 0.205 | 0.000 | 0.045 | 1.196 | 7.279 | 0.067 | n/a | 0.099 | 10.614 | n/a | n/a | 0.063 | 3.367 | 0.148 | 0.063 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000257 | 22.624 | 3.116 | 0.218 | 0.000 | 0.104 | 1.331 | 8.047 | 0.041 | n/a | 0.308 | 9.408 | n/a | n/a | 0.051 | 3.438 | 0.152 | 0.051 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.697 | 0.678 | 0.000 | 0.595 | 2.741 | 0.006 | 0.000 | 0.830 | 0.944 | 1.692 | 0.043 | n/a | 0.358 | 8.255 | n/a | n/a | 0.071 | 3.349 | 0.230 | 0.071 |
| p99 | 29.444 | 1.825 | 0.000 | 1.041 | 5.912 | 0.016 | 0.000 | 1.241 | 3.843 | 6.270 | 0.092 | n/a | 3.850 | 18.840 | n/a | n/a | 0.112 | 7.021 | 0.364 | 0.112 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d0000000000000248 | 29.444 | 1.994 | 0.004 | 0.000 | 0.535 | 3.843 | 1.692 | 0.038 | n/a | 3.850 | 17.438 | n/a | n/a | 0.051 | 2.532 | 0.086 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.088ms |
| 65ebe0af47c4843d000000000000022d | 25.842 | 2.800 | 0.007 | 0.000 | 1.051 | 0.890 | 1.119 | 0.040 | n/a | 1.004 | 18.840 | n/a | n/a | 0.091 | 3.858 | 0.149 | 0.091 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000228 | 21.246 | 3.661 | 0.010 | 0.000 | 0.364 | 1.089 | 1.985 | 0.086 | n/a | 0.901 | 13.073 | n/a | n/a | 0.078 | 4.034 | 0.190 | 0.078 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000267 | 19.297 | 5.912 | 0.012 | 0.000 | 1.096 | 1.891 | 6.270 | 0.058 | n/a | 0.507 | 3.457 | n/a | n/a | 0.094 | 7.021 | 0.364 | 0.094 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000026c | 18.005 | 4.570 | 0.016 | 0.000 | 1.241 | 1.337 | 1.491 | 0.043 | n/a | 0.110 | 9.088 | n/a | n/a | 0.110 | 5.827 | 0.324 | 0.110 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000021f | 17.251 | 5.142 | 0.005 | 0.000 | 0.321 | 3.818 | 4.782 | 0.092 | n/a | 0.176 | 2.855 | n/a | n/a | 0.059 | 5.469 | 0.317 | 0.059 | node-14/thread-0/socket.wait-first-byte | none observed |
| 65ebe0af47c4843d0000000000000274 | 17.144 | 3.507 | 0.009 | 0.000 | 0.830 | 0.878 | 4.984 | 0.038 | n/a | 0.106 | 6.722 | n/a | n/a | 0.071 | 4.345 | 0.253 | 0.071 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000025d | 17.087 | 2.776 | 0.005 | 0.000 | 0.567 | 1.170 | 1.692 | 0.055 | n/a | 0.165 | 10.584 | n/a | n/a | 0.071 | 3.349 | 0.196 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000027e | 15.697 | 3.093 | 0.012 | 0.000 | 1.150 | 0.970 | 4.856 | 0.037 | n/a | 0.358 | 5.134 | n/a | n/a | 0.088 | 4.255 | 0.271 | 0.088 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000025b | 15.662 | 2.271 | 0.005 | 0.000 | 0.376 | 0.647 | 1.395 | 0.031 | n/a | 0.133 | 10.736 | n/a | n/a | 0.068 | 2.652 | 0.169 | 0.068 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000280 | 15.453 | 2.145 | 0.005 | 0.000 | 0.982 | 0.689 | 1.900 | 0.061 | n/a | 0.231 | 9.329 | n/a | n/a | 0.112 | 3.131 | 0.203 | 0.112 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000023d | 14.552 | 1.936 | 0.006 | 0.000 | 0.831 | 0.718 | 1.180 | 0.049 | n/a | 0.467 | 9.314 | n/a | n/a | 0.050 | 2.774 | 0.191 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000233 | 14.156 | 2.741 | 0.006 | 0.000 | 0.791 | 0.944 | 1.185 | 0.041 | n/a | 0.116 | 8.255 | n/a | n/a | 0.078 | 3.537 | 0.250 | 0.078 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000224 | 13.872 | 2.224 | 0.006 | 0.000 | 1.010 | 0.982 | 1.967 | 0.078 | n/a | 0.607 | 6.952 | n/a | n/a | 0.047 | 3.239 | 0.234 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000027a | 13.645 | 2.091 | 0.006 | 0.000 | 0.986 | 0.843 | 1.475 | 0.032 | n/a | 0.104 | 8.051 | n/a | n/a | 0.056 | 3.083 | 0.226 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000263 | 12.527 | 2.222 | 0.005 | 0.000 | 0.649 | 0.772 | 0.924 | 0.030 | n/a | 3.663 | 4.194 | n/a | n/a | 0.066 | 2.876 | 0.230 | 0.066 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000251 | 10.135 | 1.985 | 0.006 | 0.000 | 0.727 | 0.687 | 1.957 | 0.066 | n/a | 0.584 | 4.066 | n/a | n/a | 0.056 | 2.717 | 0.268 | 0.056 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.019 | 0.415 | 0.000 | 0.584 | 3.571 | 0.023 | 0.000 | 0.165 | 1.172 | 2.963 | 0.052 | n/a | 0.170 | 9.559 | n/a | n/a | 0.059 | 4.311 | 0.211 | 0.059 |
| p99 | 86.052 | 3.997 | 0.046 | 4.069 | 20.044 | n/a | 0.000 | 1.199 | 8.174 | 61.860 | 0.109 | n/a | 3.404 | 65.066 | n/a | n/a | 0.136 | 20.305 | 0.408 | 0.136 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d00000000000002b3 | 86.052 | 5.387 | 6.108 | 0.000 | 0.074 | 1.605 | 7.588 | 0.057 | n/a | 0.113 | 65.066 | n/a | n/a | 0.054 | 11.569 | 0.134 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002a7 | 77.623 | 3.831 | 0.250 | 0.000 | 0.080 | 1.417 | 61.860 | 0.053 | n/a | 0.079 | 9.990 | n/a | n/a | 0.064 | 4.161 | 0.054 | 0.064 | gw-w/thread-47/gateway.admitted-work | none observed |
| 65ebe0af47c4843d00000000000002ab | 61.312 | 20.044 | 0.186 | 0.000 | 0.075 | 2.707 | 12.382 | 0.080 | n/a | 0.585 | 25.199 | n/a | n/a | 0.054 | 20.305 | 0.331 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002a3 | 43.742 | 8.200 | 0.376 | 0.000 | 0.165 | 2.236 | 12.899 | 0.081 | n/a | 0.671 | 19.013 | n/a | n/a | 0.101 | 8.741 | 0.200 | 0.101 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000291 | 42.655 | 3.367 | 0.228 | 0.000 | 0.116 | 1.042 | 12.643 | 0.066 | n/a | 0.095 | 25.032 | n/a | n/a | 0.065 | 3.712 | 0.087 | 0.065 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002c9 | 37.594 | 3.076 | 0.185 | 0.000 | 0.075 | 1.051 | 3.935 | 0.037 | n/a | 0.347 | 28.841 | n/a | n/a | 0.048 | 3.336 | 0.089 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000286 | 36.676 | 3.233 | 0.210 | 0.000 | 0.066 | 1.172 | 12.512 | 0.041 | n/a | 0.084 | 19.283 | n/a | n/a | 0.075 | 3.509 | 0.096 | 0.075 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000299 | 33.716 | 4.843 | 0.199 | 0.000 | 0.075 | 5.110 | 11.757 | 0.056 | n/a | 0.156 | 11.472 | n/a | n/a | 0.047 | 5.117 | 0.152 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000028a | 30.884 | 7.864 | 0.271 | 0.000 | 0.069 | 1.440 | 9.568 | 0.049 | n/a | 1.233 | 10.340 | n/a | n/a | 0.051 | 8.203 | 0.266 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002af | 29.105 | 6.689 | 0.014 | 0.000 | 0.967 | 1.448 | 3.553 | 0.039 | n/a | 0.153 | 16.150 | n/a | n/a | 0.093 | 7.670 | 0.264 | 0.093 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002d6 | 28.586 | 2.918 | 0.163 | 0.000 | 0.077 | 0.935 | 3.557 | 0.033 | n/a | 0.100 | 20.752 | n/a | n/a | 0.054 | 3.157 | 0.110 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002bf | 28.450 | 4.335 | 0.210 | 0.000 | 0.078 | 1.216 | 6.781 | 0.037 | n/a | 0.177 | 15.565 | n/a | n/a | 0.051 | 4.623 | 0.162 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002d4 | 28.091 | 3.571 | 0.238 | 0.000 | 0.098 | 1.460 | 8.114 | 0.082 | n/a | 0.259 | 14.203 | n/a | n/a | 0.066 | 3.906 | 0.139 | 0.066 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002b1 | 27.541 | 4.881 | 0.193 | 0.000 | 0.063 | 1.563 | 7.169 | 0.052 | n/a | 0.090 | 13.472 | n/a | n/a | 0.058 | 5.137 | 0.187 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000297 | 25.520 | 4.751 | 0.292 | 0.000 | 0.067 | 1.956 | 7.883 | 0.066 | n/a | 0.631 | 9.826 | n/a | n/a | 0.047 | 5.111 | 0.200 | 0.047 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000029f | 25.349 | 4.041 | 0.280 | 0.000 | 0.119 | 1.654 | 6.455 | 0.063 | n/a | 0.170 | 12.471 | n/a | n/a | 0.097 | 4.440 | 0.175 | 0.097 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002d0 | 23.833 | 3.290 | 0.220 | 0.000 | 0.103 | 1.559 | 9.243 | 0.054 | n/a | 0.484 | 8.823 | n/a | n/a | 0.057 | 3.613 | 0.152 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002bd | 22.644 | 3.558 | 0.241 | 0.000 | 0.038 | 1.302 | 7.313 | 0.097 | n/a | 0.726 | 9.323 | n/a | n/a | 0.046 | 3.837 | 0.169 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002a5 | 22.221 | 5.641 | 0.013 | 0.000 | 0.832 | 1.865 | 2.719 | 0.109 | n/a | 0.478 | 10.427 | n/a | n/a | 0.136 | 6.486 | 0.292 | 0.136 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002b7 | 21.462 | 3.305 | 0.210 | 0.000 | 0.081 | 1.207 | 8.901 | 0.065 | n/a | 0.094 | 7.554 | n/a | n/a | 0.046 | 3.596 | 0.168 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.740 | 0.776 | 0.000 | 0.619 | 2.760 | 0.008 | 0.000 | 0.756 | 0.953 | 1.813 | 0.042 | n/a | 0.145 | 6.848 | n/a | n/a | 0.076 | 3.408 | 0.277 | 0.076 |
| p99 | 22.221 | 2.001 | 0.000 | 1.194 | 5.641 | n/a | 0.000 | 1.199 | 8.174 | 6.338 | 0.109 | n/a | 3.404 | 14.214 | n/a | n/a | 0.136 | 6.486 | 0.381 | 0.136 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d00000000000002a5 | 22.221 | 5.641 | 0.013 | 0.000 | 0.832 | 1.865 | 2.719 | 0.109 | n/a | 0.478 | 10.427 | n/a | n/a | 0.136 | 6.486 | 0.292 | 0.136 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002a1 | 20.989 | 2.760 | 0.009 | 0.000 | 0.639 | 1.114 | 1.813 | 0.065 | n/a | 0.283 | 14.214 | n/a | n/a | 0.092 | 3.408 | 0.162 | 0.092 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002ad | 17.703 | 4.237 | 0.012 | 0.000 | 0.657 | 1.073 | 1.606 | 0.057 | n/a | 0.408 | 9.559 | n/a | n/a | 0.092 | 4.907 | 0.277 | 0.092 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000029d | 17.333 | 3.516 | 0.008 | 0.000 | 1.054 | 2.046 | 2.070 | 0.042 | n/a | 0.157 | 8.341 | n/a | n/a | 0.099 | 4.578 | 0.264 | 0.099 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002cb | 17.007 | 2.263 | n/a | 0.000 | 0.110 | 8.174 | 6.338 | 0.019 | n/a | 0.045 | 0.000 | n/a | n/a | 0.059 | 2.373 | 0.140 | 0.059 | node-14/thread-0/socket.wait-first-byte | none observed |
| 65ebe0af47c4843d00000000000002b9 | 16.707 | 2.569 | 0.006 | 0.000 | 0.756 | 0.869 | 2.142 | 0.060 | n/a | 3.404 | 6.848 | n/a | n/a | 0.055 | 3.330 | 0.199 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002bb | 15.777 | 4.121 | 0.009 | 0.000 | 0.314 | 0.953 | 1.328 | 0.034 | n/a | 0.455 | 8.459 | n/a | n/a | 0.106 | 4.444 | 0.282 | 0.106 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002b5 | 15.740 | 4.776 | 0.023 | 0.000 | 1.199 | 1.374 | 2.506 | 0.058 | n/a | 0.135 | 5.547 | n/a | n/a | 0.120 | 5.999 | 0.381 | 0.120 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000293 | 14.618 | 2.062 | 0.006 | 0.000 | 1.010 | 0.868 | 1.627 | 0.061 | n/a | 0.200 | 8.728 | n/a | n/a | 0.055 | 3.078 | 0.211 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002c7 | 13.490 | 3.518 | 0.014 | 0.000 | 0.544 | 0.727 | 1.334 | 0.040 | n/a | 0.099 | 7.133 | n/a | n/a | 0.082 | 4.075 | 0.302 | 0.082 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000284 | 13.248 | 3.377 | 0.008 | 0.000 | 0.976 | 1.138 | 1.965 | 0.047 | n/a | 0.144 | 5.517 | n/a | n/a | 0.076 | 4.362 | 0.329 | 0.076 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002c5 | 12.167 | 2.387 | 0.004 | 0.000 | 0.210 | 0.800 | 2.963 | 0.036 | n/a | 0.109 | 5.599 | n/a | n/a | 0.059 | 2.602 | 0.214 | 0.059 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d000000000000029b | 10.620 | 2.133 | 0.007 | 0.000 | 0.894 | 0.759 | 1.197 | 0.038 | n/a | 0.145 | 5.388 | n/a | n/a | 0.060 | 3.033 | 0.286 | 0.060 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000002c0 | 9.819 | 1.969 | 0.005 | 0.000 | 0.825 | 0.643 | 0.944 | 0.030 | n/a | 0.096 | 5.257 | n/a | n/a | 0.050 | 2.800 | 0.285 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (851 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.927 | 0.575 | 0.000 | 0.627 | 2.534 | 0.005 | 0.000 | 0.752 | 0.777 | 1.233 | 0.034 | n/a | 0.149 | 7.109 | n/a | n/a | 0.054 | 3.586 | 0.255 | 0.054 |
| p99 | 76.081 | 2.971 | 0.022 | 2.583 | 8.791 | 2.121 | 0.000 | 19.096 | 10.537 | 12.188 | 3.262 | n/a | 3.723 | 60.794 | n/a | n/a | 0.144 | 25.568 | 0.620 | 0.144 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d00000000000004aa | 97.515 | 2.610 | 0.007 | 0.000 | 28.247 | 2.962 | 1.259 | 0.046 | n/a | 0.113 | 62.162 | n/a | n/a | 0.109 | 30.864 | 0.317 | 0.109 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 27.112ms; driver.publication.persist-deferred 1.124ms; driver.publication.persist-deferred 1.029ms; driver.publication.capture 1.017ms |
| 65ebe0af47c4843d00000000000004ac | 91.535 | 3.719 | 3.395 | 0.000 | 18.454 | 3.590 | 0.503 | 0.013 | n/a | 1.052 | 60.794 | n/a | n/a | 0.016 | 25.568 | 0.279 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 17.164ms; driver.publication.persist-deferred 1.227ms; driver.publication.persist-deferred 1.124ms; driver.publication.persist-deferred 1.029ms; driver.publication.capture 1.017ms |
| 65ebe0af47c4843d00000000000004ae | 90.161 | 3.361 | 0.004 | 0.000 | 76.225 | 0.624 | 1.044 | 0.034 | n/a | 0.488 | 8.303 | n/a | n/a | 0.076 | 79.590 | 0.883 | 0.076 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.932ms; driver.publication.persist-deferred 1.227ms; driver.publication.persist-deferred 1.124ms; driver.publication.persist-deferred 1.029ms; driver.publication.capture 1.017ms |
| 65ebe0af47c4843d00000000000004ab | 90.136 | 5.069 | 1.568 | 0.000 | 18.981 | 1.992 | 1.133 | 0.023 | n/a | 0.103 | 61.241 | n/a | n/a | 0.026 | 25.618 | 0.284 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 17.879ms; driver.publication.persist-deferred 1.227ms; driver.publication.persist-deferred 1.124ms; driver.publication.persist-deferred 1.029ms; driver.publication.capture 1.017ms |
| 65ebe0af47c4843d00000000000004a8 | 86.664 | 10.781 | 0.239 | 0.000 | 1.777 | 3.600 | 0.735 | 0.015 | n/a | 0.043 | 69.426 | n/a | n/a | 0.048 | 12.797 | 0.148 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 27.112ms; driver.publication.persist-deferred 1.100ms; driver.publication.persist-deferred 1.029ms |
| 65ebe0af47c4843d00000000000004ad | 83.715 | 5.160 | 3.398 | 0.000 | 7.619 | 7.138 | 0.536 | 0.022 | n/a | 0.262 | 59.548 | n/a | n/a | 0.031 | 16.177 | 0.193 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 6.238ms; driver.publication.persist-deferred 1.227ms; driver.publication.persist-deferred 1.124ms; driver.publication.persist-deferred 1.029ms; driver.publication.capture 1.017ms |
| 65ebe0af47c4843d00000000000004a7 | 81.077 | 6.380 | 0.015 | 0.000 | 3.267 | 2.303 | 1.410 | 0.033 | n/a | 0.099 | 67.507 | n/a | n/a | 0.063 | 9.662 | 0.119 | 0.063 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 27.112ms; driver.publication.persist-deferred 1.229ms |
| 65ebe0af47c4843d000000000000069a | 76.467 | 6.031 | 0.010 | 0.000 | 4.471 | 1.148 | 1.859 | 0.033 | n/a | 2.509 | 60.279 | n/a | n/a | 0.126 | 10.512 | 0.137 | 0.126 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.435ms |
| 65ebe0af47c4843d0000000000000779 | 76.081 | 2.723 | 0.523 | 0.000 | 1.415 | 1.593 | 0.741 | 2.972 | n/a | 0.061 | 66.031 | n/a | n/a | 0.022 | 4.661 | 0.061 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 9.265ms; driver.publication.persist-deferred 6.178ms; driver.publication.persist-deferred 0.684ms |
| 65ebe0af47c4843d0000000000000699 | 74.803 | 4.254 | 0.008 | 0.000 | 2.400 | 1.982 | 2.019 | 0.081 | n/a | 0.355 | 63.600 | n/a | n/a | 0.105 | 6.662 | 0.089 | 0.105 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.260ms |
| 65ebe0af47c4843d000000000000077a | 73.606 | 2.962 | 0.004 | 0.000 | 0.666 | 1.415 | 2.120 | 0.063 | n/a | 0.105 | 66.218 | n/a | n/a | 0.052 | 3.632 | 0.049 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 9.265ms; driver.publication.persist-deferred 6.178ms; driver.publication.persist-deferred 1.462ms |
| 65ebe0af47c4843d000000000000077b | 73.420 | 2.114 | 0.004 | 0.000 | 1.167 | 1.086 | 2.733 | 0.067 | n/a | 2.550 | 63.642 | n/a | n/a | 0.056 | 3.285 | 0.045 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 9.265ms; driver.publication.persist-deferred 6.178ms; driver.publication.persist-deferred 1.669ms; driver.publication.persist-deferred 1.462ms |
| 65ebe0af47c4843d000000000000077c | 69.050 | 3.787 | 0.008 | 0.000 | 1.025 | 0.994 | 2.887 | 0.067 | n/a | 0.182 | 59.978 | n/a | n/a | 0.121 | 4.820 | 0.070 | 0.121 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 9.265ms; driver.publication.persist-deferred 6.178ms; driver.publication.persist-deferred 1.669ms; driver.publication.persist-deferred 1.462ms; driver.publication.persist-deferred 1.139ms |
| 65ebe0af47c4843d0000000000000752 | 64.469 | 3.905 | 0.003 | 0.000 | 19.799 | 0.507 | 1.094 | 0.022 | n/a | 0.079 | 38.991 | n/a | n/a | 0.070 | 23.707 | 0.368 | 0.070 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 6.856ms; driver.publication.persist-deferred 1.558ms; driver.publication.persist-deferred 1.541ms; driver.publication.persist-deferred 1.386ms; driver.publication.persist-deferred 1.019ms |
| 65ebe0af47c4843d0000000000000786 | 63.490 | 4.438 | 0.006 | 0.000 | 0.556 | 1.006 | 2.949 | 0.099 | n/a | 0.310 | 54.036 | n/a | n/a | 0.090 | 5.000 | 0.079 | 0.090 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000777 | 62.572 | 3.296 | 0.006 | 0.000 | 6.925 | 3.084 | 1.466 | 0.036 | n/a | 0.084 | 47.585 | n/a | n/a | 0.090 | 10.226 | 0.163 | 0.090 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 6.885ms |
| 65ebe0af47c4843d000000000000082c | 60.371 | 12.366 | 0.007 | 3.358 | 2.633 | 24.237 | 4.153 | 0.070 | n/a | 0.721 | 12.780 | n/a | n/a | 0.047 | 18.364 | 0.304 | 0.047 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 6.094ms; driver.expected-state.bind-receipt 1.827ms; driver.expected-state.bind-receipt 1.685ms; driver.publication.persist-deferred 1.372ms; driver.publication.persist-deferred 1.285ms |
| 65ebe0af47c4843d00000000000003f6 | 56.165 | 5.661 | 0.021 | 0.000 | 0.172 | 0.744 | 2.800 | 0.078 | n/a | 0.244 | 46.358 | n/a | n/a | 0.086 | 5.854 | 0.104 | 0.086 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 4.137ms; driver.publication.persist-deferred 1.623ms |
| 65ebe0af47c4843d00000000000003f5 | 55.587 | 4.680 | 0.269 | 0.000 | 0.045 | 2.158 | 8.307 | 0.069 | n/a | 0.192 | 39.824 | n/a | n/a | 0.042 | 4.994 | 0.090 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 4.137ms; driver.publication.persist-deferred 1.623ms |
| 65ebe0af47c4843d0000000000000778 | 55.326 | 3.661 | 0.295 | 0.000 | 2.041 | 3.545 | 2.010 | 0.058 | n/a | 0.118 | 43.546 | n/a | n/a | 0.051 | 5.998 | 0.108 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.532ms |

## P2 / L1024 / commit / 5-10 facts (493 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.884 | 0.313 | 0.000 | 0.500 | 2.128 | 0.004 | 0.000 | 0.788 | 0.771 | 1.025 | 0.032 | n/a | 0.131 | 6.260 | n/a | n/a | 0.055 | 3.074 | 0.244 | 0.055 |
| p99 | 73.420 | 2.004 | 0.000 | 1.173 | 6.725 | 1.264 | 0.000 | 18.454 | 9.964 | 5.519 | 4.085 | n/a | 4.526 | 59.978 | n/a | n/a | 0.144 | 22.409 | 0.623 | 0.144 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d00000000000004ac | 91.535 | 3.719 | 3.395 | 0.000 | 18.454 | 3.590 | 0.503 | 0.013 | n/a | 1.052 | 60.794 | n/a | n/a | 0.016 | 25.568 | 0.279 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 17.164ms; driver.publication.persist-deferred 1.227ms; driver.publication.persist-deferred 1.124ms; driver.publication.persist-deferred 1.029ms; driver.publication.capture 1.017ms |
| 65ebe0af47c4843d00000000000004ad | 83.715 | 5.160 | 3.398 | 0.000 | 7.619 | 7.138 | 0.536 | 0.022 | n/a | 0.262 | 59.548 | n/a | n/a | 0.031 | 16.177 | 0.193 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 6.238ms; driver.publication.persist-deferred 1.227ms; driver.publication.persist-deferred 1.124ms; driver.publication.persist-deferred 1.029ms; driver.publication.capture 1.017ms |
| 65ebe0af47c4843d0000000000000779 | 76.081 | 2.723 | 0.523 | 0.000 | 1.415 | 1.593 | 0.741 | 2.972 | n/a | 0.061 | 66.031 | n/a | n/a | 0.022 | 4.661 | 0.061 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 9.265ms; driver.publication.persist-deferred 6.178ms; driver.publication.persist-deferred 0.684ms |
| 65ebe0af47c4843d0000000000000699 | 74.803 | 4.254 | 0.008 | 0.000 | 2.400 | 1.982 | 2.019 | 0.081 | n/a | 0.355 | 63.600 | n/a | n/a | 0.105 | 6.662 | 0.089 | 0.105 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.260ms |
| 65ebe0af47c4843d000000000000077b | 73.420 | 2.114 | 0.004 | 0.000 | 1.167 | 1.086 | 2.733 | 0.067 | n/a | 2.550 | 63.642 | n/a | n/a | 0.056 | 3.285 | 0.045 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 9.265ms; driver.publication.persist-deferred 6.178ms; driver.publication.persist-deferred 1.669ms; driver.publication.persist-deferred 1.462ms |
| 65ebe0af47c4843d000000000000077c | 69.050 | 3.787 | 0.008 | 0.000 | 1.025 | 0.994 | 2.887 | 0.067 | n/a | 0.182 | 59.978 | n/a | n/a | 0.121 | 4.820 | 0.070 | 0.121 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 9.265ms; driver.publication.persist-deferred 6.178ms; driver.publication.persist-deferred 1.669ms; driver.publication.persist-deferred 1.462ms; driver.publication.persist-deferred 1.139ms |
| 65ebe0af47c4843d0000000000000777 | 62.572 | 3.296 | 0.006 | 0.000 | 6.925 | 3.084 | 1.466 | 0.036 | n/a | 0.084 | 47.585 | n/a | n/a | 0.090 | 10.226 | 0.163 | 0.090 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 6.885ms |
| 65ebe0af47c4843d0000000000000778 | 55.326 | 3.661 | 0.295 | 0.000 | 2.041 | 3.545 | 2.010 | 0.058 | n/a | 0.118 | 43.546 | n/a | n/a | 0.051 | 5.998 | 0.108 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.532ms |
| 65ebe0af47c4843d00000000000006e4 | 53.290 | 2.897 | 0.003 | 0.000 | 23.354 | 8.259 | 0.835 | 0.018 | n/a | 0.083 | 17.777 | n/a | n/a | 0.065 | 26.253 | 0.493 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 13.023ms; driver.publication.persist-deferred 2.957ms; driver.publication.persist-deferred 2.511ms; driver.expected-state.bind-receipt 1.237ms |
| 65ebe0af47c4843d00000000000006cf | 51.390 | 2.881 | 0.007 | 0.000 | 4.577 | 0.754 | 1.936 | 0.022 | n/a | 0.091 | 41.052 | n/a | n/a | 0.070 | 7.465 | 0.145 | 0.070 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.157ms; driver.publication.persist-deferred 1.010ms; driver.publication.persist-deferred 0.978ms |
| 65ebe0af47c4843d0000000000000827 | 50.513 | 3.474 | 0.007 | 0.000 | 28.640 | 7.782 | 0.743 | 0.020 | n/a | 0.283 | 9.488 | n/a | n/a | 0.076 | 32.121 | 0.636 | 0.076 | node-14/thread-0/driver.queue.subject | client.encode 3.524ms; driver.expected-state.bind-receipt 1.827ms; driver.publication.persist-deferred 1.285ms; driver.publication.persist-deferred 1.267ms; driver.publication.persist-deferred 1.132ms |
| 65ebe0af47c4843d0000000000000412 | 49.754 | 2.106 | 0.004 | 0.000 | 27.472 | 1.275 | 0.846 | 0.030 | n/a | 0.203 | 17.749 | n/a | n/a | 0.068 | 29.583 | 0.595 | 0.068 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.821ms; driver.expected-state.bind-receipt 1.965ms; driver.publication.persist-deferred 1.298ms; driver.publication.persist-deferred 1.182ms; driver.publication.persist-deferred 1.158ms |
| 65ebe0af47c4843d0000000000000755 | 49.683 | 3.271 | 0.085 | 0.000 | 4.100 | 0.529 | 1.382 | 1.484 | n/a | 0.036 | 38.766 | n/a | n/a | 0.031 | 7.456 | 0.150 | 0.031 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.708ms; driver.publication.persist-deferred 1.558ms; driver.publication.persist-deferred 1.541ms; driver.publication.persist-deferred 1.386ms; driver.publication.persist-deferred 1.019ms |
| 65ebe0af47c4843d000000000000059d | 49.425 | 2.935 | 0.006 | 0.000 | 0.743 | 0.772 | 0.772 | 0.023 | n/a | 0.275 | 43.834 | n/a | n/a | 0.064 | 3.684 | 0.075 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.648ms |
| 65ebe0af47c4843d000000000000036e | 48.647 | 3.210 | 0.110 | 0.000 | 2.819 | 7.837 | 1.372 | 0.073 | n/a | 0.108 | 33.037 | n/a | n/a | 0.081 | 6.139 | 0.126 | 0.081 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.621ms; driver.publication.persist-deferred 1.442ms; driver.publication.persist-deferred 1.288ms; driver.expected-state.bind-receipt 1.282ms |
| 65ebe0af47c4843d000000000000059e | 47.673 | 2.271 | 0.005 | 0.000 | 0.703 | 1.180 | 0.627 | 0.011 | n/a | 0.045 | 42.786 | n/a | n/a | 0.044 | 2.979 | 0.062 | 0.044 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.098ms |
| 65ebe0af47c4843d0000000000000759 | 47.158 | 1.447 | 0.003 | 0.000 | 3.941 | 2.118 | 0.575 | 0.012 | n/a | 0.228 | 38.798 | n/a | n/a | 0.036 | 5.390 | 0.114 | 0.036 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.541ms; driver.publication.persist-deferred 1.386ms; driver.publication.persist-deferred 1.192ms; driver.expected-state.bind-receipt 1.099ms; driver.publication.persist-deferred 0.990ms |
| 65ebe0af47c4843d00000000000008da | 46.603 | 3.536 | 0.008 | 0.000 | 1.022 | 0.763 | 1.134 | 0.033 | n/a | 0.079 | 39.948 | n/a | n/a | 0.079 | 4.566 | 0.098 | 0.079 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.174ms |
| 65ebe0af47c4843d00000000000003fa | 45.477 | 2.754 | 0.115 | 0.000 | 5.305 | 1.339 | 4.614 | 0.050 | n/a | 1.324 | 29.953 | n/a | n/a | 0.025 | 8.173 | 0.180 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 4.137ms; driver.publication.persist-deferred 1.773ms; driver.publication.persist-deferred 1.305ms |
| 65ebe0af47c4843d000000000000036d | 41.063 | 3.128 | 0.007 | 0.000 | 2.623 | 1.059 | 1.786 | 0.055 | n/a | 0.093 | 32.199 | n/a | n/a | 0.113 | 5.759 | 0.140 | 0.113 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.621ms; driver.publication.persist-deferred 1.442ms; driver.expected-state.bind-receipt 1.282ms |

## P2/P4 / read-your-own-write / read (57 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 80.919 | n/a | n/a | n/a | 35.836 | 5.710 | 2.828 | 0.000 | 0.411 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.131 | 53.893 | 0.655 | 20.131 |
| p99 | 210.128 | n/a | n/a | n/a | 83.120 | 80.647 | 14.181 | 0.000 | 43.135 | 54.468 | 44.057 | n/a | 0.072 | 0.000 | n/a | n/a | 96.339 | 136.550 | 1.000 | 96.339 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d000000000000036c | 210.128 | 67.744 | 59.056 | 4.380 | 0.000 | 3.419 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 75.530 | 131.179 | 0.624 | 75.530 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.829ms; driver.publication.persist-deferred 1.621ms; driver.publication.persist-deferred 1.442ms; driver.publication.persist-deferred 1.432ms; driver.publication.persist-deferred 1.420ms |
| 65ebe0af47c4843d0000000000000367 | 164.945 | 49.696 | 6.481 | 4.726 | 0.000 | 23.892 | 54.468 | 25.603 | n/a | 0.072 | 0.000 | n/a | n/a | 0.008 | 60.903 | 0.369 | 0.008 | gw-r/thread-63/gateway.response-write | driver.publication.persist-deferred 6.447ms; driver.publication.persist-deferred 1.829ms; driver.publication.persist-deferred 1.621ms; driver.publication.persist-deferred 1.442ms; driver.publication.persist-deferred 1.432ms |
| 65ebe0af47c4843d00000000000019dc | 141.078 | 83.120 | 49.220 | 4.210 | 0.000 | 0.401 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.127 | 136.550 | 0.968 | 4.127 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 5.194ms; driver.publication.persist-deferred 2.023ms; driver.publication.persist-deferred 1.214ms; driver.publication.persist-deferred 1.201ms; driver.publication.persist-deferred 1.157ms |
| 65ebe0af47c4843d00000000000019d6 | 139.523 | 45.969 | 25.246 | 8.167 | 0.000 | 0.401 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 59.740 | 79.382 | 0.569 | 59.740 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 5.194ms; driver.publication.persist-deferred 2.023ms; driver.publication.persist-deferred 1.439ms; driver.ryow-dispatch 1.431ms; driver.publication.persist-deferred 1.214ms |
| 65ebe0af47c4843d0000000000000364 | 125.349 | 20.752 | 7.746 | 1.077 | 0.000 | 43.135 | 8.560 | 44.057 | n/a | 0.013 | 0.000 | n/a | n/a | 0.008 | 29.575 | 0.236 | 0.008 | gw-r/thread-48/gateway.admission-wait | driver.publication.persist-deferred 6.447ms; driver.publication.persist-deferred 1.829ms; driver.publication.persist-deferred 1.621ms; driver.publication.persist-deferred 1.442ms; driver.publication.persist-deferred 1.432ms |
| 65ebe0af47c4843d0000000000000e49 | 119.126 | 17.548 | 22.154 | 0.000 | 0.000 | 0.307 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 79.117 | 39.702 | 0.333 | 79.117 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.273ms; driver.publication.persist-deferred 1.812ms; driver.publication.persist-deferred 1.755ms; driver.publication.persist-deferred 1.572ms; driver.publication.persist-deferred 1.396ms |
| 65ebe0af47c4843d0000000000000e47 | 116.497 | 14.896 | 4.958 | 0.000 | 0.000 | 0.303 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 96.339 | 19.855 | 0.170 | 96.339 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.563ms; driver.publication.persist-deferred 2.273ms; driver.publication.persist-deferred 1.812ms; driver.publication.persist-deferred 1.755ms; driver.publication.persist-deferred 1.572ms |
| 65ebe0af47c4843d0000000000000365 | 114.887 | 23.897 | 12.071 | 2.640 | 0.000 | 1.788 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 74.491 | 38.608 | 0.336 | 74.491 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 6.447ms; driver.publication.persist-deferred 1.829ms; driver.publication.persist-deferred 1.621ms; driver.publication.persist-deferred 1.442ms; driver.publication.persist-deferred 1.432ms |
| 65ebe0af47c4843d00000000000012e6 | 111.371 | 37.315 | 32.323 | 3.326 | 0.000 | 3.766 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.641 | 72.964 | 0.655 | 34.641 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.962ms; driver.publication.persist-deferred 1.563ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.085ms; driver.publication.persist-deferred 1.078ms |
| 65ebe0af47c4843d0000000000001bb2 | 110.370 | 56.930 | 0.481 | 6.894 | 0.000 | 12.402 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.663 | 64.306 | 0.583 | 33.663 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.832ms; client.encode 1.418ms; driver.publication.persist-deferred 1.286ms; driver.publication.persist-deferred 1.123ms; driver.publication.persist-deferred 1.018ms |
| 65ebe0af47c4843d0000000000000e48 | 109.960 | 50.290 | 4.204 | 8.793 | 0.000 | 0.310 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 46.364 | 63.286 | 0.576 | 46.364 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.273ms; driver.publication.persist-deferred 1.812ms; driver.publication.persist-deferred 1.755ms; driver.publication.persist-deferred 1.572ms; driver.publication.persist-deferred 1.396ms |
| 65ebe0af47c4843d0000000000000783 | 107.274 | 62.312 | 6.993 | 6.331 | 0.000 | 0.929 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.708 | 75.637 | 0.705 | 30.708 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.553ms; driver.publication.persist-deferred 1.441ms; driver.publication.persist-deferred 1.254ms; driver.publication.persist-deferred 1.111ms; driver.expected-state.bind-receipt 1.110ms |
| 65ebe0af47c4843d0000000000001cc5 | 99.985 | 32.323 | 13.356 | 3.082 | 0.000 | 0.410 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 50.814 | 48.761 | 0.488 | 50.814 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.521ms; driver.publication.persist-deferred 1.416ms; driver.publication.persist-deferred 1.096ms; driver.publication.persist-deferred 1.065ms |
| 65ebe0af47c4843d0000000000000362 | 99.945 | 42.165 | 5.077 | 10.439 | 0.000 | 2.918 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.347 | 57.680 | 0.577 | 39.347 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 6.447ms; driver.publication.persist-deferred 1.829ms; driver.publication.persist-deferred 1.621ms; driver.publication.persist-deferred 1.442ms; driver.publication.persist-deferred 1.432ms |
| 65ebe0af47c4843d0000000000001cc1 | 98.634 | 57.461 | 2.368 | 3.739 | 0.000 | 3.138 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.927 | 63.568 | 0.644 | 31.927 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.999ms; driver.publication.persist-deferred 1.565ms; driver.expected-state.bind-receipt 1.521ms; driver.publication.persist-deferred 1.416ms; driver.publication.persist-deferred 1.165ms |
| 65ebe0af47c4843d0000000000000546 | 96.779 | 55.177 | 31.573 | 7.115 | 0.000 | 0.550 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.365 | 93.864 | 0.970 | 2.365 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 0.980ms; driver.publication.persist-deferred 0.898ms; driver.publication.persist-deferred 0.521ms |
| 65ebe0af47c4843d00000000000018be | 95.748 | 69.998 | 0.274 | 9.036 | 0.000 | 0.608 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.831 | 79.309 | 0.828 | 15.831 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 2.657ms; driver.publication.persist-deferred 1.534ms; driver.publication.persist-deferred 1.192ms; driver.publication.persist-deferred 1.190ms; driver.publication.persist-deferred 1.153ms |
| 65ebe0af47c4843d00000000000012e4 | 95.259 | 35.023 | 2.257 | 2.828 | 0.000 | 0.316 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 54.835 | 40.109 | 0.421 | 54.835 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.962ms; driver.publication.persist-deferred 1.563ms; driver.publication.persist-deferred 1.085ms; driver.publication.persist-deferred 1.078ms; driver.publication.persist-deferred 0.943ms |
| 65ebe0af47c4843d0000000000000e51 | 95.017 | 13.020 | 80.647 | 0.000 | 0.000 | 0.278 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.072 | 93.667 | 0.986 | 1.072 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 3.121ms; driver.publication.persist-deferred 1.812ms; driver.publication.persist-deferred 1.755ms; driver.publication.persist-deferred 1.572ms; driver.publication.persist-deferred 1.396ms |
| 65ebe0af47c4843d00000000000016b3 | 94.213 | 56.574 | 23.511 | 6.192 | 0.000 | 0.583 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.354 | 86.277 | 0.916 | 7.354 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.075ms; driver.publication.persist-deferred 0.925ms; driver.publication.persist-deferred 0.890ms |

## P2 / outside-phases / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.607 | 0.000 | 0.000 | 0.379 | 1.863 | 0.005 | 0.000 | 0.287 | 0.396 | 0.665 | 0.016 | n/a | 0.033 | 7.806 | n/a | n/a | 0.048 | 2.375 | 0.132 | 0.048 |
| p99 | 18.051 | 0.674 | 0.000 | 0.497 | 2.080 | 0.008 | 0.000 | 0.776 | 2.296 | 0.844 | 0.019 | n/a | 0.069 | 14.339 | n/a | n/a | 0.108 | 2.645 | 0.194 | 0.108 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d0000000000000986 | 18.051 | 2.080 | 0.008 | 0.000 | 0.287 | 0.396 | 0.844 | 0.016 | n/a | 0.033 | 14.339 | n/a | n/a | 0.048 | 2.375 | 0.132 | 0.048 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000987 | 13.607 | 1.863 | 0.005 | 0.000 | 0.776 | 2.296 | 0.665 | 0.019 | n/a | 0.069 | 7.806 | n/a | n/a | 0.108 | 2.645 | 0.194 | 0.108 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.565ms |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.607 | 0.000 | 0.000 | 0.379 | 1.863 | 0.005 | 0.000 | 0.287 | 0.396 | 0.665 | 0.016 | n/a | 0.033 | 7.806 | n/a | n/a | 0.048 | 2.375 | 0.132 | 0.048 |
| p99 | 18.051 | 0.674 | 0.000 | 0.497 | 2.080 | 0.008 | 0.000 | 0.776 | 2.296 | 0.844 | 0.019 | n/a | 0.069 | 14.339 | n/a | n/a | 0.108 | 2.645 | 0.194 | 0.108 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d0000000000000986 | 18.051 | 2.080 | 0.008 | 0.000 | 0.287 | 0.396 | 0.844 | 0.016 | n/a | 0.033 | 14.339 | n/a | n/a | 0.048 | 2.375 | 0.132 | 0.048 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000987 | 13.607 | 1.863 | 0.005 | 0.000 | 0.776 | 2.296 | 0.665 | 0.019 | n/a | 0.069 | 7.806 | n/a | n/a | 0.108 | 2.645 | 0.194 | 0.108 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.565ms |

## P2 / tail / commit (2615 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.086 | 0.467 | 0.000 | 0.568 | 2.439 | 0.005 | 0.000 | 0.721 | 0.707 | 1.050 | 0.027 | n/a | 0.103 | 5.223 | n/a | n/a | 0.048 | 3.423 | 0.295 | 0.048 |
| p99 | 45.487 | 2.973 | 0.040 | 2.333 | 8.088 | 0.549 | 0.000 | 15.791 | 9.659 | 8.140 | 1.313 | n/a | 2.932 | 27.965 | n/a | n/a | 0.142 | 19.191 | 0.685 | 0.142 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d0000000000001df7 | 125.727 | 5.193 | 0.229 | 0.000 | 0.050 | 1.780 | 10.073 | 0.034 | n/a | 0.375 | 107.937 | n/a | n/a | 0.056 | 5.472 | 0.044 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d0000000000000cbc | 82.656 | 4.501 | 0.009 | 0.000 | 62.873 | 1.907 | 1.167 | 0.034 | n/a | 0.083 | 11.996 | n/a | n/a | 0.086 | 67.383 | 0.815 | 0.086 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 12.954ms; driver.publication.persist-deferred 12.636ms; driver.publication.persist-deferred 10.208ms; driver.publication.capture 0.025ms |
| 65ebe0af47c4843d0000000000001dd1 | 75.430 | 4.673 | 0.005 | 0.000 | 0.838 | 0.871 | 62.733 | 0.089 | n/a | 0.142 | 5.999 | n/a | n/a | 0.080 | 5.516 | 0.073 | 0.080 | gw-w/thread-42/commit.prepare-and-validate | none observed |
| 65ebe0af47c4843d0000000000000cba | 71.153 | 2.991 | 0.006 | 0.000 | 26.395 | 28.475 | 2.056 | 0.054 | n/a | 0.230 | 10.860 | n/a | n/a | 0.086 | 29.392 | 0.413 | 0.086 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 12.954ms; driver.publication.persist-deferred 12.636ms; driver.publication.capture 1.150ms |
| 65ebe0af47c4843d0000000000001671 | 64.100 | 3.864 | 0.004 | 0.000 | 0.868 | 11.048 | 4.077 | 0.091 | n/a | 0.198 | 43.912 | n/a | n/a | 0.038 | 4.736 | 0.074 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.302ms; driver.publication.persist-deferred 1.132ms; driver.publication.persist-deferred 1.093ms; driver.publication.persist-deferred 1.075ms; driver.publication.persist-deferred 0.811ms |
| 65ebe0af47c4843d0000000000000cca | 61.937 | 7.172 | 0.128 | 0.000 | 0.835 | 2.309 | 0.856 | 1.000 | n/a | 0.335 | 49.239 | n/a | n/a | 0.063 | 8.135 | 0.131 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 4.613ms; driver.expected-state.bind-receipt 1.036ms |
| 65ebe0af47c4843d000000000000189b | 60.179 | 1.677 | 0.005 | 0.000 | 0.786 | 0.418 | 0.675 | 0.024 | n/a | 0.059 | 56.479 | n/a | n/a | 0.055 | 2.468 | 0.041 | 0.055 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.189ms; driver.publication.persist-deferred 1.175ms |
| 65ebe0af47c4843d0000000000000c0e | 59.838 | 1.709 | 0.006 | 0.000 | 51.567 | 0.402 | 0.807 | 0.025 | n/a | 0.303 | 4.981 | n/a | n/a | 0.039 | 53.281 | 0.890 | 0.039 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.693ms; driver.publication.persist-deferred 1.359ms; driver.publication.persist-deferred 1.052ms; driver.publication.persist-deferred 1.038ms |
| 65ebe0af47c4843d0000000000001437 | 58.976 | 2.456 | 0.004 | 0.000 | 37.346 | 0.810 | 0.899 | 0.022 | n/a | 0.380 | 17.000 | n/a | n/a | 0.059 | 39.806 | 0.675 | 0.059 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.513ms; driver.publication.persist-deferred 2.054ms; driver.publication.persist-deferred 1.618ms; driver.publication.persist-deferred 0.882ms |
| 65ebe0af47c4843d0000000000000c0d | 58.140 | 2.541 | 0.002 | 0.000 | 0.482 | 26.317 | 7.152 | 0.031 | n/a | 2.780 | 18.780 | n/a | n/a | 0.056 | 3.024 | 0.052 | 0.056 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.359ms |
| 65ebe0af47c4843d00000000000012ff | 55.914 | 6.738 | 0.007 | 0.000 | 4.555 | 3.987 | 2.629 | 0.072 | n/a | 1.077 | 36.781 | n/a | n/a | 0.067 | 11.300 | 0.202 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.090ms; driver.publication.persist-deferred 1.058ms; driver.publication.persist-deferred 0.989ms |
| 65ebe0af47c4843d0000000000000a22 | 55.900 | 1.852 | 0.004 | 0.000 | 0.339 | 1.160 | 1.367 | 0.037 | n/a | 0.541 | 50.549 | n/a | n/a | 0.051 | 2.195 | 0.039 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000011d1 | 54.264 | 2.268 | 0.007 | 0.000 | 40.965 | 1.025 | 0.924 | 0.049 | n/a | 3.134 | 5.845 | n/a | n/a | 0.045 | 43.241 | 0.797 | 0.045 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.291ms; driver.publication.persist-deferred 1.221ms; driver.publication.persist-deferred 1.076ms; driver.publication.persist-deferred 1.067ms; driver.publication.persist-deferred 0.981ms |
| 65ebe0af47c4843d0000000000001676 | 53.194 | 2.136 | 0.003 | 0.000 | 42.439 | 0.363 | 1.347 | 0.026 | n/a | 0.294 | 6.551 | n/a | n/a | 0.035 | 44.578 | 0.838 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.302ms; driver.publication.persist-deferred 1.132ms; driver.publication.persist-deferred 1.093ms; driver.publication.persist-deferred 1.075ms; driver.publication.persist-deferred 1.014ms |
| 65ebe0af47c4843d0000000000000c0c | 50.729 | 2.336 | 0.004 | 0.000 | 0.375 | 0.862 | 28.738 | 0.049 | n/a | 0.213 | 18.075 | n/a | n/a | 0.076 | 2.716 | 0.054 | 0.076 | gw-w/thread-42/gateway.route | none observed |
| 65ebe0af47c4843d0000000000000e38 | 50.718 | 2.010 | 0.005 | 0.000 | 20.850 | 4.746 | 1.951 | 0.024 | n/a | 0.055 | 21.001 | n/a | n/a | 0.074 | 22.865 | 0.451 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 20.721ms; driver.publication.persist-deferred 10.566ms; driver.publication.persist-deferred 4.176ms |
| 65ebe0af47c4843d0000000000001674 | 50.337 | 1.758 | 0.003 | 0.000 | 38.164 | 0.497 | 1.516 | 0.046 | n/a | 0.693 | 7.617 | n/a | n/a | 0.043 | 39.925 | 0.793 | 0.043 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.302ms; driver.publication.persist-deferred 1.132ms; driver.publication.persist-deferred 1.093ms; driver.publication.persist-deferred 0.811ms; driver.publication.persist-deferred 0.805ms |
| 65ebe0af47c4843d0000000000001a8b | 49.150 | 4.730 | 0.004 | 0.000 | 27.672 | 3.438 | 4.157 | 0.017 | n/a | 0.682 | 8.407 | n/a | n/a | 0.042 | 32.407 | 0.659 | 0.042 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.029ms; driver.publication.persist-deferred 1.136ms; driver.publication.persist-deferred 0.806ms |
| 65ebe0af47c4843d0000000000001368 | 48.918 | 6.148 | 0.005 | 0.000 | 0.373 | 0.626 | 29.671 | 0.048 | n/a | 0.082 | 11.906 | n/a | n/a | 0.058 | 6.527 | 0.133 | 0.058 | gw-w/thread-44/commit.prepare-and-validate | driver.publication.persist-deferred 1.455ms; driver.publication.persist-deferred 1.343ms |
| 65ebe0af47c4843d0000000000000e35 | 48.876 | 3.034 | 0.154 | 0.000 | 0.719 | 1.449 | 0.746 | 0.525 | n/a | 0.119 | 42.098 | n/a | n/a | 0.032 | 3.906 | 0.080 | 0.032 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 25.360ms; driver.publication.persist-deferred 0.250ms |

## P2 / tail / commit / 5-10 facts (1553 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.706 | 0.000 | 0.000 | 0.437 | 1.932 | 0.004 | 0.000 | 0.735 | 0.675 | 0.900 | 0.026 | n/a | 0.102 | 4.744 | n/a | n/a | 0.048 | 2.888 | 0.281 | 0.048 |
| p99 | 46.012 | 1.980 | 0.000 | 1.167 | 6.107 | 0.159 | 0.000 | 15.791 | 10.132 | 4.906 | 1.400 | n/a | 2.219 | 30.383 | n/a | n/a | 0.132 | 18.312 | 0.698 | 0.132 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65ebe0af47c4843d0000000000000cbc | 82.656 | 4.501 | 0.009 | 0.000 | 62.873 | 1.907 | 1.167 | 0.034 | n/a | 0.083 | 11.996 | n/a | n/a | 0.086 | 67.383 | 0.815 | 0.086 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 12.954ms; driver.publication.persist-deferred 12.636ms; driver.publication.persist-deferred 10.208ms; driver.publication.capture 0.025ms |
| 65ebe0af47c4843d0000000000000cba | 71.153 | 2.991 | 0.006 | 0.000 | 26.395 | 28.475 | 2.056 | 0.054 | n/a | 0.230 | 10.860 | n/a | n/a | 0.086 | 29.392 | 0.413 | 0.086 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 12.954ms; driver.publication.persist-deferred 12.636ms; driver.publication.capture 1.150ms |
| 65ebe0af47c4843d0000000000001671 | 64.100 | 3.864 | 0.004 | 0.000 | 0.868 | 11.048 | 4.077 | 0.091 | n/a | 0.198 | 43.912 | n/a | n/a | 0.038 | 4.736 | 0.074 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.302ms; driver.publication.persist-deferred 1.132ms; driver.publication.persist-deferred 1.093ms; driver.publication.persist-deferred 1.075ms; driver.publication.persist-deferred 0.811ms |
| 65ebe0af47c4843d0000000000000cca | 61.937 | 7.172 | 0.128 | 0.000 | 0.835 | 2.309 | 0.856 | 1.000 | n/a | 0.335 | 49.239 | n/a | n/a | 0.063 | 8.135 | 0.131 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 4.613ms; driver.expected-state.bind-receipt 1.036ms |
| 65ebe0af47c4843d000000000000189b | 60.179 | 1.677 | 0.005 | 0.000 | 0.786 | 0.418 | 0.675 | 0.024 | n/a | 0.059 | 56.479 | n/a | n/a | 0.055 | 2.468 | 0.041 | 0.055 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.189ms; driver.publication.persist-deferred 1.175ms |
| 65ebe0af47c4843d0000000000000c0e | 59.838 | 1.709 | 0.006 | 0.000 | 51.567 | 0.402 | 0.807 | 0.025 | n/a | 0.303 | 4.981 | n/a | n/a | 0.039 | 53.281 | 0.890 | 0.039 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.693ms; driver.publication.persist-deferred 1.359ms; driver.publication.persist-deferred 1.052ms; driver.publication.persist-deferred 1.038ms |
| 65ebe0af47c4843d00000000000012ff | 55.914 | 6.738 | 0.007 | 0.000 | 4.555 | 3.987 | 2.629 | 0.072 | n/a | 1.077 | 36.781 | n/a | n/a | 0.067 | 11.300 | 0.202 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.090ms; driver.publication.persist-deferred 1.058ms; driver.publication.persist-deferred 0.989ms |
| 65ebe0af47c4843d0000000000000a22 | 55.900 | 1.852 | 0.004 | 0.000 | 0.339 | 1.160 | 1.367 | 0.037 | n/a | 0.541 | 50.549 | n/a | n/a | 0.051 | 2.195 | 0.039 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 65ebe0af47c4843d00000000000011d1 | 54.264 | 2.268 | 0.007 | 0.000 | 40.965 | 1.025 | 0.924 | 0.049 | n/a | 3.134 | 5.845 | n/a | n/a | 0.045 | 43.241 | 0.797 | 0.045 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.291ms; driver.publication.persist-deferred 1.221ms; driver.publication.persist-deferred 1.076ms; driver.publication.persist-deferred 1.067ms; driver.publication.persist-deferred 0.981ms |
| 65ebe0af47c4843d0000000000000c0c | 50.729 | 2.336 | 0.004 | 0.000 | 0.375 | 0.862 | 28.738 | 0.049 | n/a | 0.213 | 18.075 | n/a | n/a | 0.076 | 2.716 | 0.054 | 0.076 | gw-w/thread-42/gateway.route | none observed |
| 65ebe0af47c4843d0000000000000e38 | 50.718 | 2.010 | 0.005 | 0.000 | 20.850 | 4.746 | 1.951 | 0.024 | n/a | 0.055 | 21.001 | n/a | n/a | 0.074 | 22.865 | 0.451 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 20.721ms; driver.publication.persist-deferred 10.566ms; driver.publication.persist-deferred 4.176ms |
| 65ebe0af47c4843d0000000000000e35 | 48.876 | 3.034 | 0.154 | 0.000 | 0.719 | 1.449 | 0.746 | 0.525 | n/a | 0.119 | 42.098 | n/a | n/a | 0.032 | 3.906 | 0.080 | 0.032 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 25.360ms; driver.publication.persist-deferred 0.250ms |
| 65ebe0af47c4843d0000000000001435 | 48.637 | 2.632 | 0.006 | 0.000 | 20.698 | 6.102 | 1.540 | 0.051 | n/a | 4.759 | 12.800 | n/a | n/a | 0.049 | 23.336 | 0.480 | 0.049 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 65ebe0af47c4843d00000000000011f7 | 47.055 | 8.082 | 0.010 | 0.000 | 0.091 | 12.188 | 2.769 | 0.116 | n/a | 0.258 | 23.485 | n/a | n/a | 0.055 | 8.183 | 0.174 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.028ms; driver.publication.persist-deferred 1.022ms |
| 65ebe0af47c4843d0000000000000e36 | 46.365 | 1.854 | 0.005 | 0.000 | 0.351 | 2.316 | 1.347 | 0.050 | n/a | 0.152 | 40.248 | n/a | n/a | 0.042 | 2.210 | 0.048 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 25.360ms; driver.publication.persist-deferred 10.566ms |
| 65ebe0af47c4843d0000000000001898 | 46.012 | 2.631 | 0.005 | 0.000 | 2.820 | 0.314 | 1.267 | 0.010 | n/a | 0.039 | 38.887 | n/a | n/a | 0.039 | 5.455 | 0.119 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.260ms; driver.publication.persist-deferred 1.175ms; driver.publication.persist-deferred 1.149ms |
| 65ebe0af47c4843d0000000000000ccc | 44.493 | 5.268 | 0.010 | 0.000 | 3.057 | 9.962 | 0.951 | 0.027 | n/a | 0.402 | 24.703 | n/a | n/a | 0.113 | 8.335 | 0.187 | 0.113 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.884ms; driver.publication.persist-deferred 2.838ms |
| 65ebe0af47c4843d00000000000011ce | 44.215 | 7.536 | 0.010 | 1.909 | 0.464 | 10.417 | 5.801 | 0.121 | n/a | 1.625 | 16.259 | n/a | n/a | 0.074 | 9.919 | 0.224 | 0.074 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.076ms; driver.publication.persist-deferred 1.067ms; driver.publication.persist-deferred 0.981ms |
| 65ebe0af47c4843d0000000000001366 | 43.710 | 2.753 | 0.007 | 0.000 | 0.463 | 0.844 | 31.492 | 0.041 | n/a | 0.561 | 7.486 | n/a | n/a | 0.063 | 3.223 | 0.074 | 0.063 | gw-w/thread-40/storage/commit! | none observed |
| 65ebe0af47c4843d00000000000012fd | 43.187 | 2.813 | 0.006 | 0.000 | 1.385 | 0.503 | 0.769 | 0.021 | n/a | 0.043 | 37.594 | n/a | n/a | 0.054 | 4.203 | 0.097 | 0.054 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.058ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.558 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.804 | 200.901 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 |
| p99 | 420.236 | n/a | n/a | n/a | 24.199 | n/a | 2.071 | 0.000 | 8.770 | 408.521 | 0.124 | n/a | 0.190 | 0.000 | n/a | n/a | 0.329 | 26.270 | 0.279 | 0.329 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b6ef8893c29baf5a0000000000000002 | 420.236 | 2.726 | n/a | 0.000 | 0.000 | 8.420 | 408.521 | 0.124 | n/a | 0.116 | 0.000 | n/a | n/a | 0.329 | 2.726 | 0.006 | 0.329 | gw-r/thread-48/gateway.admitted-work | none observed |
| d99208fe46d419c60000000000000005 | 203.671 | 0.000 | n/a | 0.000 | 0.000 | 0.804 | 202.538 | 0.014 | n/a | 0.117 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c60000000000000007 | 203.215 | 0.000 | n/a | 0.000 | 0.000 | 1.350 | 201.346 | 0.011 | n/a | 0.182 | 0.000 | n/a | n/a | 0.326 | 0.000 | 0.000 | 0.326 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c60000000000000006 | 202.886 | 0.000 | n/a | 0.000 | 0.000 | 0.939 | 201.481 | 0.042 | n/a | 0.190 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c60000000000000ef3 | 201.676 | 0.000 | n/a | 0.000 | 0.000 | 0.638 | 200.901 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c60000000000000ef2 | 201.558 | 0.000 | n/a | 0.000 | 0.000 | 0.411 | 200.967 | 0.009 | n/a | 0.072 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c60000000000000ef1 | 201.511 | 0.000 | n/a | 0.000 | 0.000 | 0.572 | 200.785 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-66/journal/page | none observed |
| d99208fe46d419c60000000000000ef6 | 94.066 | 24.199 | n/a | 2.071 | 0.000 | 8.770 | 58.840 | 0.004 | n/a | 0.005 | 0.000 | n/a | n/a | 0.177 | 26.270 | 0.279 | 0.177 | gw-r/thread-42/gateway.admitted-work | none observed |
| d99208fe46d419c60000000000000ef7 | 78.645 | 20.667 | n/a | 0.000 | 0.000 | 0.630 | 57.080 | 0.004 | n/a | 0.010 | 0.000 | n/a | n/a | 0.253 | 20.667 | 0.263 | 0.253 | gw-r/thread-63/gateway.admitted-work | none observed |
| d99208fe46d419c60000000000000ef8 | 75.979 | 14.662 | n/a | 1.707 | 0.000 | 3.954 | 55.461 | 0.004 | n/a | 0.008 | 0.000 | n/a | n/a | 0.185 | 16.369 | 0.215 | 0.185 | gw-r/thread-66/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 820.468 | n/a | n/a | n/a | 0.315 | n/a | 0.000 | 0.000 | 1.336 | 805.557 | 0.025 | n/a | 0.144 | 0.000 | n/a | n/a | 0.346 | 0.315 | 0.000 | 0.346 |
| p99 | 1006.229 | n/a | n/a | n/a | 13.059 | n/a | 0.000 | 0.000 | 1.688 | 1002.458 | 0.049 | n/a | 0.368 | 0.000 | n/a | n/a | 1.351 | 13.059 | 0.016 | 1.351 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b6ef8893c29baf5a00000000000000a4 | 1006.229 | 0.315 | n/a | 0.000 | 0.000 | 1.688 | 1002.458 | 0.049 | n/a | 0.368 | 0.000 | n/a | n/a | 1.351 | 0.315 | 0.000 | 1.351 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a00000000000000a5 | 820.468 | 13.059 | n/a | 0.000 | 0.000 | 1.336 | 805.557 | 0.025 | n/a | 0.144 | 0.000 | n/a | n/a | 0.346 | 13.059 | 0.016 | 0.346 | gw-r/thread-44/journal/page | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 446.779 | n/a | n/a | n/a | 3.015 | n/a | 0.000 | 0.000 | 0.986 | 437.600 | 0.013 | n/a | 0.101 | 0.000 | n/a | n/a | 0.091 | 3.015 | 0.009 | 0.091 |
| p99 | 1086.431 | n/a | n/a | n/a | 17.773 | n/a | 0.888 | 0.000 | 84.086 | 989.288 | 0.055 | n/a | 3.075 | 0.000 | n/a | n/a | 0.259 | 18.661 | 0.051 | 0.259 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b6ef8893c29baf5a00000000000000cf | 1086.431 | 17.773 | n/a | 0.888 | 0.000 | 84.086 | 983.302 | 0.033 | n/a | 0.121 | 0.000 | n/a | n/a | 0.228 | 18.661 | 0.017 | 0.228 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a00000000000000b4 | 993.448 | 6.262 | n/a | 0.000 | 0.000 | 0.742 | 986.129 | 0.010 | n/a | 0.106 | 0.000 | n/a | n/a | 0.198 | 6.262 | 0.006 | 0.198 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a00000000000000bb | 993.018 | 2.408 | n/a | 0.000 | 0.000 | 1.104 | 989.288 | 0.030 | n/a | 0.108 | 0.000 | n/a | n/a | 0.080 | 2.408 | 0.002 | 0.080 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a00000000000000ba | 991.978 | 2.941 | n/a | 0.000 | 0.000 | 2.264 | 986.540 | 0.013 | n/a | 0.078 | 0.000 | n/a | n/a | 0.142 | 2.941 | 0.003 | 0.142 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a00000000000000ae | 933.142 | 1.712 | n/a | 0.000 | 0.000 | 0.592 | 930.658 | 0.011 | n/a | 0.099 | 0.000 | n/a | n/a | 0.070 | 1.712 | 0.002 | 0.070 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a00000000000000ab | 768.687 | 2.790 | n/a | 0.000 | 0.000 | 4.353 | 761.236 | 0.051 | n/a | 0.137 | 0.000 | n/a | n/a | 0.119 | 2.790 | 0.004 | 0.119 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a00000000000000b2 | 758.249 | 2.851 | n/a | 0.000 | 0.000 | 0.634 | 754.587 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.074 | 2.851 | 0.004 | 0.074 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a00000000000000c0 | 751.057 | 6.411 | n/a | 0.000 | 0.000 | 1.315 | 742.943 | 0.045 | n/a | 0.084 | 0.000 | n/a | n/a | 0.259 | 6.411 | 0.009 | 0.259 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a00000000000000a8 | 722.345 | 4.855 | n/a | 0.000 | 0.000 | 2.338 | 714.822 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.231 | 4.855 | 0.007 | 0.231 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a00000000000000c9 | 714.369 | 2.391 | n/a | 0.000 | 0.000 | 0.967 | 710.756 | 0.028 | n/a | 0.139 | 0.000 | n/a | n/a | 0.088 | 2.391 | 0.003 | 0.088 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a00000000000000c1 | 684.526 | 12.042 | n/a | 0.000 | 0.000 | 1.675 | 670.574 | 0.012 | n/a | 0.060 | 0.000 | n/a | n/a | 0.162 | 12.042 | 0.018 | 0.162 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a00000000000000c5 | 656.103 | 4.461 | n/a | 0.000 | 0.000 | 3.513 | 647.870 | 0.052 | n/a | 0.122 | 0.000 | n/a | n/a | 0.083 | 4.461 | 0.007 | 0.083 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a00000000000000ca | 545.014 | 2.257 | n/a | 0.000 | 0.000 | 3.138 | 539.440 | 0.031 | n/a | 0.076 | 0.000 | n/a | n/a | 0.072 | 2.257 | 0.004 | 0.072 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a00000000000000a6 | 487.852 | 3.009 | n/a | 0.000 | 0.000 | 4.365 | 480.197 | 0.010 | n/a | 0.150 | 0.000 | n/a | n/a | 0.120 | 3.009 | 0.006 | 0.120 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a00000000000000b7 | 446.779 | 5.235 | n/a | 0.000 | 0.000 | 0.648 | 437.600 | 0.055 | n/a | 3.075 | 0.000 | n/a | n/a | 0.166 | 5.235 | 0.012 | 0.166 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a00000000000000b9 | 419.066 | 5.632 | n/a | 0.000 | 0.000 | 0.940 | 412.198 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 0.199 | 5.632 | 0.013 | 0.199 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a00000000000000c4 | 331.685 | 2.273 | n/a | 0.000 | 0.000 | 0.572 | 328.726 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.065 | 2.273 | 0.007 | 0.065 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a00000000000000c7 | 302.090 | 5.930 | n/a | 0.000 | 0.000 | 1.286 | 294.536 | 0.013 | n/a | 0.081 | 0.000 | n/a | n/a | 0.244 | 5.930 | 0.020 | 0.244 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a00000000000000cb | 284.275 | 1.819 | n/a | 0.000 | 0.000 | 0.657 | 281.642 | 0.013 | n/a | 0.074 | 0.000 | n/a | n/a | 0.070 | 1.819 | 0.006 | 0.070 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a00000000000000bd | 262.805 | 3.328 | n/a | 0.000 | 0.000 | 0.867 | 258.392 | 0.012 | n/a | 0.121 | 0.000 | n/a | n/a | 0.085 | 3.328 | 0.013 | 0.085 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 434.473 | n/a | n/a | n/a | 4.712 | n/a | 0.697 | 0.000 | 0.829 | 425.577 | 0.014 | n/a | 0.066 | 0.000 | n/a | n/a | 0.116 | 5.169 | 0.014 | 0.116 |
| p99 | 1011.491 | n/a | n/a | n/a | 16.427 | n/a | 2.758 | 0.000 | 4.641 | 1004.001 | 2.400 | n/a | 0.128 | 0.000 | n/a | n/a | 32.275 | 17.510 | 0.423 | 32.275 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b6ef8893c29baf5a00000000000000d1 | 1011.491 | 5.225 | n/a | 1.208 | 0.000 | 0.793 | 1004.001 | 0.014 | n/a | 0.124 | 0.000 | n/a | n/a | 0.125 | 6.433 | 0.006 | 0.125 | gw-r/thread-44/journal/page | none observed |
| b6ef8893c29baf5a00000000000000dd | 999.156 | 5.995 | n/a | 1.086 | 0.000 | 3.661 | 988.033 | 0.057 | n/a | 0.127 | 0.000 | n/a | n/a | 0.197 | 7.081 | 0.007 | 0.197 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a000000000000010b | 998.117 | 4.712 | n/a | 0.000 | 0.000 | 0.793 | 992.488 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.068 | 4.712 | 0.005 | 0.068 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a0000000000000103 | 988.926 | 3.075 | n/a | 1.386 | 0.000 | 0.833 | 983.448 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.116 | 4.461 | 0.005 | 0.116 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a00000000000000d8 | 988.205 | 5.003 | n/a | 0.598 | 0.000 | 1.644 | 980.776 | 0.016 | n/a | 0.087 | 0.000 | n/a | n/a | 0.082 | 5.600 | 0.006 | 0.082 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a00000000000000ff | 987.145 | 3.298 | n/a | 0.000 | 0.000 | 1.177 | 982.474 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.124 | 3.298 | 0.003 | 0.124 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a00000000000000d7 | 967.914 | 3.611 | n/a | 1.052 | 0.000 | 0.548 | 962.541 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.096 | 4.663 | 0.005 | 0.096 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a00000000000000dc | 926.287 | 3.406 | n/a | 0.658 | 0.000 | 0.759 | 921.268 | 0.019 | n/a | 0.073 | 0.000 | n/a | n/a | 0.105 | 4.064 | 0.004 | 0.105 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a00000000000000e2 | 909.779 | 3.564 | n/a | 0.833 | 0.000 | 2.141 | 903.082 | 0.014 | n/a | 0.062 | 0.000 | n/a | n/a | 0.084 | 4.396 | 0.005 | 0.084 | gw-r/thread-44/journal/page | none observed |
| b6ef8893c29baf5a00000000000000d0 | 907.174 | 6.369 | n/a | 0.960 | 0.000 | 2.072 | 896.881 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.781 | 7.329 | 0.008 | 0.781 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a00000000000000fc | 861.828 | 6.813 | n/a | 0.661 | 0.000 | 0.696 | 853.452 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 0.134 | 7.474 | 0.009 | 0.134 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a0000000000000100 | 719.854 | 2.595 | n/a | 0.834 | 0.000 | 0.512 | 715.709 | 0.026 | n/a | 0.067 | 0.000 | n/a | n/a | 0.111 | 3.429 | 0.005 | 0.111 | gw-r/thread-44/journal/page | none observed |
| b6ef8893c29baf5a00000000000000de | 716.134 | 5.658 | n/a | 0.697 | 0.000 | 0.829 | 708.658 | 0.021 | n/a | 0.113 | 0.000 | n/a | n/a | 0.157 | 6.355 | 0.009 | 0.157 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a00000000000000db | 661.302 | 2.896 | n/a | 0.667 | 0.000 | 0.633 | 656.914 | 0.016 | n/a | 0.098 | 0.000 | n/a | n/a | 0.077 | 3.563 | 0.005 | 0.077 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a00000000000000e9 | 580.789 | 5.387 | n/a | 2.758 | 0.000 | 0.708 | 571.724 | 0.015 | n/a | 0.051 | 0.000 | n/a | n/a | 0.145 | 8.145 | 0.014 | 0.145 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a00000000000000e6 | 577.266 | 10.227 | n/a | 1.176 | 0.000 | 1.118 | 564.558 | 0.017 | n/a | 0.051 | 0.000 | n/a | n/a | 0.119 | 11.403 | 0.020 | 0.119 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a00000000000000fa | 534.362 | 3.243 | n/a | 0.000 | 0.000 | 1.311 | 529.665 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.083 | 3.243 | 0.006 | 0.083 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a00000000000000f9 | 489.009 | 5.195 | n/a | 0.000 | 0.000 | 0.549 | 483.086 | 0.041 | n/a | 0.050 | 0.000 | n/a | n/a | 0.087 | 5.195 | 0.011 | 0.087 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a0000000000000106 | 476.233 | 16.427 | n/a | 1.083 | 0.000 | 1.235 | 457.200 | 0.020 | n/a | 0.090 | 0.000 | n/a | n/a | 0.179 | 17.510 | 0.037 | 0.179 | gw-r/thread-44/journal/page | none observed |
| b6ef8893c29baf5a00000000000000d4 | 455.247 | 4.902 | n/a | 1.032 | 0.000 | 0.643 | 448.365 | 0.022 | n/a | 0.105 | 0.000 | n/a | n/a | 0.179 | 5.933 | 0.013 | 0.179 | gw-r/thread-42/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 457.652 | n/a | n/a | n/a | 3.958 | n/a | 0.000 | 0.000 | 0.773 | 451.303 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.125 | 4.217 | 0.011 | 0.125 |
| p99 | 1005.766 | n/a | n/a | n/a | 11.147 | n/a | 1.737 | 0.000 | 3.073 | 1000.904 | 0.365 | n/a | 0.099 | 0.000 | n/a | n/a | 51.018 | 11.147 | 0.356 | 51.018 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b6ef8893c29baf5a0000000000000129 | 1005.766 | 3.481 | n/a | 0.000 | 0.000 | 1.973 | 1000.160 | 0.010 | n/a | 0.046 | 0.000 | n/a | n/a | 0.095 | 3.481 | 0.003 | 0.095 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a0000000000000128 | 1005.680 | 3.958 | n/a | 1.105 | 0.000 | 0.732 | 999.684 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.129 | 5.063 | 0.005 | 0.129 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a000000000000011a | 1003.121 | 0.254 | n/a | 0.000 | 0.000 | 0.732 | 1000.904 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 1.160 | 0.254 | 0.000 | 1.160 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a0000000000000124 | 999.331 | 3.019 | n/a | 1.102 | 0.000 | 0.414 | 994.604 | 0.014 | n/a | 0.055 | 0.000 | n/a | n/a | 0.123 | 4.121 | 0.004 | 0.123 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a0000000000000112 | 995.073 | 7.494 | n/a | 1.737 | 0.000 | 0.971 | 984.676 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.129 | 9.231 | 0.009 | 0.129 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a000000000000013e | 992.585 | 3.024 | n/a | 0.000 | 0.000 | 0.601 | 988.772 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.098 | 3.024 | 0.003 | 0.098 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a0000000000000135 | 974.000 | 2.842 | n/a | 0.000 | 0.000 | 2.108 | 968.907 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.091 | 2.842 | 0.003 | 0.091 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a0000000000000145 | 815.737 | 2.861 | n/a | 0.000 | 0.000 | 1.040 | 811.669 | 0.012 | n/a | 0.047 | 0.000 | n/a | n/a | 0.108 | 2.861 | 0.004 | 0.108 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a0000000000000131 | 783.337 | 6.053 | n/a | 0.000 | 0.000 | 0.761 | 776.362 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.099 | 6.053 | 0.008 | 0.099 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a000000000000013b | 764.898 | 3.369 | n/a | 0.000 | 0.000 | 0.921 | 760.397 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.143 | 3.369 | 0.004 | 0.143 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a0000000000000123 | 747.479 | 2.873 | n/a | 0.000 | 0.000 | 0.757 | 743.568 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.197 | 2.873 | 0.004 | 0.197 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a000000000000012b | 742.653 | 10.405 | n/a | 0.000 | 0.000 | 0.569 | 731.324 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.299 | 10.405 | 0.014 | 0.299 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a000000000000010f | 741.286 | 2.467 | n/a | 0.736 | 0.000 | 1.166 | 736.736 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.098 | 3.202 | 0.004 | 0.098 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a0000000000000125 | 664.640 | 5.933 | n/a | 0.000 | 0.000 | 0.824 | 657.702 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.108 | 5.933 | 0.009 | 0.108 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a000000000000010c | 615.838 | 6.811 | n/a | 0.739 | 0.000 | 3.073 | 604.966 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.188 | 7.550 | 0.012 | 0.188 | gw-r/thread-44/journal/page | none observed |
| b6ef8893c29baf5a000000000000011c | 608.554 | 3.864 | n/a | 0.000 | 0.000 | 1.625 | 602.836 | 0.021 | n/a | 0.071 | 0.000 | n/a | n/a | 0.136 | 3.864 | 0.006 | 0.136 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a0000000000000132 | 602.603 | 5.297 | n/a | 0.000 | 0.000 | 0.773 | 596.288 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.199 | 5.297 | 0.009 | 0.199 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a000000000000013f | 536.391 | 4.217 | n/a | 0.000 | 0.000 | 0.971 | 530.936 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.181 | 4.217 | 0.008 | 0.181 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a0000000000000138 | 520.358 | 4.373 | n/a | 0.000 | 0.000 | 0.751 | 515.062 | 0.014 | n/a | 0.063 | 0.000 | n/a | n/a | 0.095 | 4.373 | 0.008 | 0.095 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a0000000000000136 | 487.782 | 10.092 | n/a | 0.696 | 0.000 | 0.645 | 476.126 | 0.012 | n/a | 0.086 | 0.000 | n/a | n/a | 0.126 | 10.787 | 0.022 | 0.126 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / internal (46 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 334.239 | n/a | n/a | n/a | 3.123 | n/a | 0.000 | 0.000 | 0.672 | 328.539 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.116 | 3.123 | 0.009 | 0.116 |
| p99 | 1005.813 | n/a | n/a | n/a | 7.529 | n/a | 0.815 | 0.000 | 3.779 | 1001.701 | 1.297 | n/a | 0.124 | 0.000 | n/a | n/a | 45.337 | 7.529 | 0.615 | 45.337 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b6ef8893c29baf5a0000000000000172 | 1005.813 | 0.172 | n/a | 0.000 | 0.000 | 3.779 | 1000.670 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 1.143 | 0.172 | 0.000 | 1.143 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a000000000000016b | 1004.246 | 0.207 | n/a | 0.000 | 0.000 | 1.063 | 1001.701 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 1.205 | 0.207 | 0.000 | 1.205 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a0000000000000184 | 1003.846 | 0.111 | n/a | 0.000 | 0.000 | 1.839 | 1000.714 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 1.112 | 0.111 | 0.000 | 1.112 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a000000000000017d | 1003.337 | 0.177 | n/a | 0.000 | 0.000 | 0.872 | 1001.071 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 1.142 | 0.177 | 0.000 | 1.142 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a0000000000000161 | 1003.149 | 0.115 | n/a | 0.000 | 0.000 | 0.740 | 1001.125 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 1.105 | 0.115 | 0.000 | 1.105 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a0000000000000186 | 996.034 | 6.456 | n/a | 0.000 | 0.000 | 0.711 | 988.617 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.185 | 6.456 | 0.006 | 0.185 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a0000000000000151 | 985.552 | 3.466 | n/a | 0.000 | 0.000 | 1.412 | 980.483 | 0.011 | n/a | 0.042 | 0.000 | n/a | n/a | 0.137 | 3.466 | 0.004 | 0.137 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a0000000000000156 | 874.119 | 7.529 | n/a | 0.000 | 0.000 | 0.877 | 864.217 | 1.297 | n/a | 0.020 | 0.000 | n/a | n/a | 0.178 | 7.529 | 0.009 | 0.178 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a0000000000000178 | 874.070 | 3.221 | n/a | 0.000 | 0.000 | 0.480 | 870.184 | 0.005 | n/a | 0.086 | 0.000 | n/a | n/a | 0.094 | 3.221 | 0.004 | 0.094 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a0000000000000182 | 721.552 | 2.436 | n/a | 0.000 | 0.000 | 0.829 | 718.159 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.076 | 2.436 | 0.003 | 0.076 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a000000000000016a | 721.476 | 3.912 | n/a | 0.000 | 0.000 | 0.602 | 716.837 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.079 | 3.912 | 0.005 | 0.079 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a0000000000000189 | 677.734 | 5.414 | n/a | 0.815 | 0.000 | 0.652 | 670.653 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.169 | 6.228 | 0.009 | 0.169 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a0000000000000175 | 674.780 | 3.222 | n/a | 0.000 | 0.000 | 0.581 | 670.846 | 0.006 | n/a | 0.013 | 0.000 | n/a | n/a | 0.111 | 3.222 | 0.005 | 0.111 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a0000000000000152 | 656.995 | 2.259 | n/a | 0.000 | 0.000 | 0.598 | 654.014 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.084 | 2.259 | 0.003 | 0.084 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a000000000000017c | 654.059 | 2.747 | n/a | 0.000 | 0.000 | 0.646 | 650.499 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.140 | 2.747 | 0.004 | 0.140 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a000000000000016e | 627.927 | 1.930 | n/a | 0.000 | 0.000 | 0.371 | 625.521 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.069 | 1.930 | 0.003 | 0.069 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a0000000000000164 | 521.078 | 3.720 | n/a | 0.000 | 0.000 | 1.058 | 516.123 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.104 | 3.720 | 0.007 | 0.104 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a0000000000000150 | 482.559 | 5.896 | n/a | 0.000 | 0.000 | 0.822 | 475.539 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.246 | 5.896 | 0.012 | 0.246 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a000000000000014c | 481.349 | 3.739 | n/a | 0.000 | 0.000 | 0.780 | 476.599 | 0.021 | n/a | 0.094 | 0.000 | n/a | n/a | 0.116 | 3.739 | 0.008 | 0.116 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a0000000000000163 | 433.149 | 6.691 | n/a | 0.000 | 0.000 | 1.916 | 424.372 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.111 | 6.691 | 0.015 | 0.111 | gw-r/thread-42/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 361.689 | n/a | n/a | n/a | 3.143 | n/a | 0.000 | 0.000 | 0.610 | 354.198 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.089 | 3.181 | 0.010 | 0.089 |
| p99 | 1004.271 | n/a | n/a | n/a | 9.266 | n/a | 0.742 | 0.000 | 4.141 | 1001.016 | 0.037 | n/a | 0.091 | 0.000 | n/a | n/a | 43.417 | 9.266 | 0.630 | 43.417 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b6ef8893c29baf5a00000000000001c2 | 1004.271 | 0.126 | n/a | 0.000 | 0.000 | 1.944 | 1001.016 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 1.113 | 0.126 | 0.000 | 1.113 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a00000000000001a4 | 1001.883 | 2.934 | n/a | 0.000 | 0.000 | 0.381 | 998.467 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.069 | 2.934 | 0.003 | 0.069 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a000000000000018a | 1001.396 | 5.099 | n/a | 0.000 | 0.000 | 0.404 | 995.782 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.075 | 5.099 | 0.005 | 0.075 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a00000000000001a6 | 997.646 | 2.498 | n/a | 0.742 | 0.000 | 0.610 | 993.638 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.110 | 3.241 | 0.003 | 0.110 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a00000000000001c4 | 996.802 | 3.308 | n/a | 0.000 | 0.000 | 0.677 | 992.697 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.078 | 3.308 | 0.003 | 0.078 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a00000000000001a5 | 995.044 | 2.406 | n/a | 0.000 | 0.000 | 0.790 | 991.699 | 0.021 | n/a | 0.056 | 0.000 | n/a | n/a | 0.072 | 2.406 | 0.002 | 0.072 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a0000000000000199 | 924.115 | 1.673 | n/a | 0.000 | 0.000 | 1.937 | 920.362 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.078 | 1.673 | 0.002 | 0.078 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a00000000000001c0 | 874.760 | 3.333 | n/a | 0.000 | 0.000 | 0.594 | 870.729 | 0.004 | n/a | 0.018 | 0.000 | n/a | n/a | 0.083 | 3.333 | 0.004 | 0.083 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a000000000000019c | 768.063 | 5.002 | n/a | 0.000 | 0.000 | 0.516 | 762.360 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.121 | 5.002 | 0.007 | 0.121 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a00000000000001b5 | 758.226 | 4.013 | n/a | 0.000 | 0.000 | 0.792 | 753.291 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.079 | 4.013 | 0.005 | 0.079 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a00000000000001d4 | 664.123 | 1.709 | n/a | 0.000 | 0.000 | 2.850 | 659.418 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 0.068 | 1.709 | 0.003 | 0.068 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a00000000000001ce | 652.603 | 2.532 | n/a | 0.000 | 0.000 | 0.680 | 649.260 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.084 | 2.532 | 0.004 | 0.084 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a0000000000000198 | 579.059 | 2.451 | n/a | 0.000 | 0.000 | 0.376 | 576.142 | 0.003 | n/a | 0.011 | 0.000 | n/a | n/a | 0.076 | 2.451 | 0.004 | 0.076 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a00000000000001d0 | 547.058 | 3.995 | n/a | 0.000 | 0.000 | 2.428 | 540.496 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.091 | 3.995 | 0.007 | 0.091 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a000000000000019f | 541.217 | 3.792 | n/a | 0.000 | 0.000 | 0.576 | 536.700 | 0.012 | n/a | 0.048 | 0.000 | n/a | n/a | 0.088 | 3.792 | 0.007 | 0.088 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a00000000000001b8 | 538.914 | 4.039 | n/a | 0.000 | 0.000 | 1.074 | 533.531 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.206 | 4.039 | 0.007 | 0.206 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a00000000000001c5 | 528.113 | 2.632 | n/a | 0.000 | 0.000 | 0.419 | 524.952 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.080 | 2.632 | 0.005 | 0.080 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a00000000000001a7 | 487.758 | 3.518 | n/a | 0.000 | 0.000 | 1.740 | 482.375 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.092 | 3.518 | 0.007 | 0.092 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a00000000000001ae | 486.719 | 5.311 | n/a | 0.000 | 0.000 | 0.415 | 480.851 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.100 | 5.311 | 0.011 | 0.100 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a00000000000001a1 | 440.287 | 1.899 | n/a | 0.000 | 0.000 | 1.034 | 437.224 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.073 | 1.899 | 0.004 | 0.073 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 394.006 | n/a | n/a | n/a | 2.883 | n/a | 0.000 | 0.000 | 0.557 | 388.851 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.094 | 2.883 | 0.008 | 0.094 |
| p99 | 1006.151 | n/a | n/a | n/a | 7.211 | n/a | 0.000 | 0.000 | 3.770 | 1003.036 | 0.024 | n/a | 0.183 | 0.000 | n/a | n/a | 42.057 | 7.211 | 0.674 | 42.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b6ef8893c29baf5a00000000000001e9 | 1006.151 | 2.512 | n/a | 0.000 | 0.000 | 0.507 | 1003.036 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.068 | 2.512 | 0.002 | 0.068 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a0000000000000207 | 1004.230 | 0.104 | n/a | 0.000 | 0.000 | 2.205 | 1000.705 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 1.161 | 0.104 | 0.000 | 1.161 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a0000000000000217 | 1003.230 | 0.204 | n/a | 0.000 | 0.000 | 0.705 | 1001.061 | 0.018 | n/a | 0.089 | 0.000 | n/a | n/a | 1.153 | 0.204 | 0.000 | 1.153 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a00000000000001fd | 1002.719 | 0.163 | n/a | 0.000 | 0.000 | 0.618 | 1000.732 | 0.008 | n/a | 0.049 | 0.000 | n/a | n/a | 1.149 | 0.163 | 0.000 | 1.149 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a0000000000000212 | 994.972 | 4.706 | n/a | 0.000 | 0.000 | 2.561 | 987.469 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.175 | 4.706 | 0.005 | 0.175 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a0000000000000216 | 986.851 | 2.358 | n/a | 0.000 | 0.000 | 0.589 | 983.776 | 0.013 | n/a | 0.051 | 0.000 | n/a | n/a | 0.064 | 2.358 | 0.002 | 0.064 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a0000000000000219 | 982.265 | 2.620 | n/a | 0.000 | 0.000 | 2.630 | 976.856 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.102 | 2.620 | 0.003 | 0.102 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a00000000000001f6 | 948.975 | 2.518 | n/a | 0.000 | 0.000 | 0.434 | 945.871 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.096 | 2.518 | 0.003 | 0.096 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a0000000000000213 | 926.297 | 7.211 | n/a | 0.000 | 0.000 | 0.654 | 918.243 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.154 | 7.211 | 0.008 | 0.154 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a00000000000001f4 | 838.985 | 3.687 | n/a | 0.000 | 0.000 | 0.508 | 834.657 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.085 | 3.687 | 0.004 | 0.085 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a00000000000001e7 | 765.198 | 4.356 | n/a | 0.000 | 0.000 | 0.561 | 760.001 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.226 | 4.356 | 0.006 | 0.226 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a0000000000000202 | 652.376 | 4.438 | n/a | 0.000 | 0.000 | 0.582 | 647.191 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.131 | 4.438 | 0.007 | 0.131 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a00000000000001ff | 648.618 | 2.707 | n/a | 0.000 | 0.000 | 0.539 | 645.260 | 0.003 | n/a | 0.016 | 0.000 | n/a | n/a | 0.093 | 2.707 | 0.004 | 0.093 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a00000000000001ef | 622.265 | 2.044 | n/a | 0.000 | 0.000 | 0.396 | 619.682 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.077 | 2.044 | 0.003 | 0.077 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a00000000000001dc | 618.929 | 2.883 | n/a | 0.000 | 0.000 | 0.435 | 615.448 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.073 | 2.883 | 0.005 | 0.073 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a0000000000000211 | 593.442 | 3.190 | n/a | 0.000 | 0.000 | 0.432 | 589.663 | 0.007 | n/a | 0.028 | 0.000 | n/a | n/a | 0.121 | 3.190 | 0.005 | 0.121 | gw-r/thread-49/journal/page | none observed |
| b6ef8893c29baf5a00000000000001ed | 576.167 | 2.363 | n/a | 0.000 | 0.000 | 0.494 | 573.205 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.060 | 2.363 | 0.004 | 0.060 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a00000000000001d9 | 528.021 | 2.134 | n/a | 0.000 | 0.000 | 0.471 | 525.245 | 0.019 | n/a | 0.079 | 0.000 | n/a | n/a | 0.073 | 2.134 | 0.004 | 0.073 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a00000000000001db | 487.393 | 2.579 | n/a | 0.000 | 0.000 | 0.862 | 483.726 | 0.009 | n/a | 0.147 | 0.000 | n/a | n/a | 0.071 | 2.579 | 0.005 | 0.071 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a00000000000001e1 | 464.458 | 6.823 | n/a | 0.000 | 0.000 | 0.747 | 456.780 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.074 | 6.823 | 0.015 | 0.074 | gw-r/thread-45/journal/page | none observed |

## P3 / L1024 / internal (744 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.316 | n/a | n/a | n/a | 3.331 | n/a | 0.000 | 0.000 | 0.248 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.317 | 3.331 | 0.260 | 7.317 |
| p99 | 233.432 | n/a | n/a | n/a | 17.012 | n/a | 1.190 | 0.000 | 2.524 | 226.204 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 47.152 | 18.239 | 0.818 | 47.152 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b6ef8893c29baf5a0000000000000225 | 1008.568 | 5.645 | n/a | 0.000 | 0.000 | 2.895 | 998.204 | 1.588 | n/a | 0.056 | 0.000 | n/a | n/a | 0.180 | 5.645 | 0.006 | 0.180 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a000000000000021a | 773.755 | 4.489 | n/a | 0.000 | 0.000 | 0.614 | 768.464 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.128 | 4.489 | 0.006 | 0.128 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a0000000000000226 | 733.825 | 5.123 | n/a | 0.000 | 0.000 | 0.888 | 727.588 | 0.010 | n/a | 0.033 | 0.000 | n/a | n/a | 0.182 | 5.123 | 0.007 | 0.182 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a0000000000000222 | 660.994 | 6.124 | n/a | 0.000 | 0.000 | 1.387 | 653.066 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.383 | 6.124 | 0.009 | 0.383 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a000000000000021d | 608.421 | 4.177 | n/a | 0.000 | 0.000 | 0.594 | 603.522 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.075 | 4.177 | 0.007 | 0.075 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a0000000000000223 | 355.552 | 7.812 | n/a | 0.000 | 0.000 | 3.901 | 343.525 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.250 | 7.812 | 0.022 | 0.250 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a000000000000021e | 248.528 | 2.204 | n/a | 0.000 | 0.000 | 0.379 | 245.823 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.065 | 2.204 | 0.009 | 0.065 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a000000000000021c | 233.432 | 3.213 | n/a | 0.000 | 0.000 | 3.847 | 226.204 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 0.128 | 3.213 | 0.014 | 0.128 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a0000000000000220 | 134.331 | 3.665 | n/a | 0.000 | 0.000 | 0.697 | 129.830 | 0.008 | n/a | 0.035 | 0.000 | n/a | n/a | 0.098 | 3.665 | 0.027 | 0.098 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a00000000000004e3 | 119.092 | 7.861 | n/a | 0.000 | 0.000 | 0.223 | 110.802 | 0.012 | n/a | 0.050 | 0.000 | n/a | n/a | 0.144 | 7.861 | 0.066 | 0.144 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a0000000000000311 | 101.417 | 2.260 | n/a | 0.000 | 0.000 | 0.542 | 98.489 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.065 | 2.260 | 0.022 | 0.065 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a00000000000002f6 | 101.192 | 6.693 | n/a | 0.000 | 0.000 | 0.581 | 93.806 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.068 | 6.693 | 0.066 | 0.068 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a00000000000005de | 95.661 | 4.789 | n/a | 0.000 | 0.000 | 0.505 | 90.230 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.075 | 4.789 | 0.050 | 0.075 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a0000000000000749 | 92.995 | 3.234 | n/a | 0.000 | 0.000 | 0.289 | 89.166 | 0.228 | n/a | 0.010 | 0.000 | n/a | n/a | 0.069 | 3.234 | 0.035 | 0.069 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a000000000000077c | 90.744 | 7.155 | n/a | 0.000 | 0.000 | 0.619 | 82.638 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.317 | 7.155 | 0.079 | 0.317 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a000000000000057f | 85.840 | 10.797 | n/a | 0.000 | 0.000 | 0.530 | 73.844 | 0.010 | n/a | 0.032 | 0.000 | n/a | n/a | 0.626 | 10.797 | 0.126 | 0.626 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a0000000000000628 | 84.946 | 3.249 | n/a | 0.000 | 0.000 | 0.711 | 80.842 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.082 | 3.249 | 0.038 | 0.082 | gw-r/thread-66/journal/page | none observed |
| b6ef8893c29baf5a0000000000000469 | 84.421 | 3.027 | n/a | 0.000 | 0.000 | 0.256 | 81.021 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.064 | 3.027 | 0.036 | 0.064 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a000000000000078d | 83.548 | 2.233 | n/a | 0.000 | 0.000 | 1.243 | 79.954 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.084 | 2.233 | 0.027 | 0.084 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a00000000000004ec | 81.278 | 2.284 | n/a | 0.000 | 0.000 | 2.524 | 76.355 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.091 | 2.284 | 0.028 | 0.091 | gw-r/thread-45/journal/page | none observed |

## P3 / tail / internal (2289 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.313 | n/a | n/a | n/a | 4.060 | n/a | 0.000 | 0.000 | 0.234 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.149 | 4.088 | 0.336 | 6.149 |
| p99 | 340.568 | n/a | n/a | n/a | 17.888 | n/a | 1.661 | 0.000 | 1.771 | 334.664 | 0.009 | n/a | 0.037 | 0.000 | n/a | n/a | 46.941 | 18.990 | 0.844 | 46.941 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b6ef8893c29baf5a0000000000001a85 | 1003.075 | 0.156 | n/a | 0.000 | 0.000 | 0.625 | 1001.117 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 1.125 | 0.156 | 0.000 | 1.125 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a0000000000001ad1 | 1002.437 | 0.162 | n/a | 0.000 | 0.000 | 0.539 | 1000.561 | 0.010 | n/a | 0.028 | 0.000 | n/a | n/a | 1.137 | 0.162 | 0.000 | 1.137 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a0000000000001a8f | 1000.772 | 3.556 | n/a | 0.000 | 0.000 | 0.609 | 996.505 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.072 | 3.556 | 0.004 | 0.072 | gw-r/thread-66/journal/page | none observed |
| b6ef8893c29baf5a0000000000001ac9 | 997.536 | 8.367 | n/a | 0.000 | 0.000 | 1.105 | 987.883 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.145 | 8.367 | 0.008 | 0.145 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a0000000000001aa8 | 996.815 | 4.183 | n/a | 0.000 | 0.000 | 0.691 | 991.815 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.074 | 4.183 | 0.004 | 0.074 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a0000000000001a84 | 994.983 | 2.219 | n/a | 0.000 | 0.000 | 0.427 | 992.234 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.052 | 2.219 | 0.002 | 0.052 | gw-r/thread-48/journal/page | none observed |
| b6ef8893c29baf5a0000000000001acd | 897.166 | 3.102 | n/a | 0.000 | 0.000 | 0.618 | 893.300 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.098 | 3.102 | 0.003 | 0.098 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a0000000000001a99 | 866.212 | 5.971 | n/a | 0.000 | 0.000 | 0.470 | 859.524 | 0.017 | n/a | 0.032 | 0.000 | n/a | n/a | 0.197 | 5.971 | 0.007 | 0.197 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a0000000000001aab | 860.479 | 6.814 | n/a | 0.000 | 0.000 | 0.685 | 852.798 | 0.012 | n/a | 0.046 | 0.000 | n/a | n/a | 0.124 | 6.814 | 0.008 | 0.124 | gw-r/thread-66/journal/page | none observed |
| b6ef8893c29baf5a0000000000001a8a | 833.339 | 6.783 | n/a | 0.000 | 0.000 | 0.644 | 825.633 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.247 | 6.783 | 0.008 | 0.247 | gw-r/thread-66/journal/page | none observed |
| b6ef8893c29baf5a0000000000001a87 | 763.148 | 10.771 | n/a | 1.787 | 0.000 | 0.410 | 749.702 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.447 | 12.558 | 0.016 | 0.447 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a0000000000001aa4 | 707.387 | 2.493 | n/a | 0.000 | 0.000 | 0.632 | 704.151 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.076 | 2.493 | 0.004 | 0.076 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a0000000000001a9f | 689.737 | 10.446 | n/a | 0.000 | 0.000 | 0.334 | 678.587 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.325 | 10.446 | 0.015 | 0.325 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a0000000000001aca | 661.220 | 4.255 | n/a | 0.000 | 0.000 | 0.703 | 656.105 | 0.013 | n/a | 0.044 | 0.000 | n/a | n/a | 0.100 | 4.255 | 0.006 | 0.100 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a0000000000001ac3 | 626.585 | 2.611 | n/a | 0.000 | 0.000 | 0.318 | 623.518 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.099 | 2.611 | 0.004 | 0.099 | gw-r/thread-45/journal/page | none observed |
| b6ef8893c29baf5a0000000000001ab8 | 547.525 | 3.701 | n/a | 0.000 | 0.000 | 0.748 | 542.902 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.143 | 3.701 | 0.007 | 0.143 | gw-r/thread-47/journal/page | none observed |
| b6ef8893c29baf5a0000000000001aac | 525.609 | 10.683 | n/a | 1.931 | 0.000 | 0.471 | 512.042 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.438 | 12.614 | 0.024 | 0.438 | gw-r/thread-42/journal/page | none observed |
| b6ef8893c29baf5a0000000000001a90 | 493.664 | 1.993 | n/a | 0.000 | 0.000 | 0.418 | 491.103 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.100 | 1.993 | 0.004 | 0.100 | gw-r/thread-46/journal/page | none observed |
| b6ef8893c29baf5a0000000000001ac4 | 491.850 | 5.145 | n/a | 0.000 | 0.000 | 0.661 | 485.891 | 0.009 | n/a | 0.028 | 0.000 | n/a | n/a | 0.118 | 5.145 | 0.010 | 0.118 | gw-r/thread-63/journal/page | none observed |
| b6ef8893c29baf5a0000000000001ac5 | 447.936 | 4.856 | n/a | 0.000 | 0.000 | 0.750 | 442.136 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.153 | 4.856 | 0.011 | 0.153 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.628 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.859 | 201.216 | 0.018 | n/a | 0.131 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 |
| p99 | 225.262 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.085 | 210.337 | 13.146 | n/a | 3.857 | 0.000 | n/a | n/a | 0.598 | 0.000 | 0.000 | 0.598 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d99208fe46d419c60000000000000044 | 225.262 | 0.000 | n/a | 0.000 | 0.000 | 1.300 | 210.337 | 13.146 | n/a | 0.217 | 0.000 | n/a | n/a | 0.263 | 0.000 | 0.000 | 0.263 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c6000000000000001d | 209.188 | 0.000 | n/a | 0.000 | 0.000 | 1.111 | 207.639 | 0.065 | n/a | 0.263 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c60000000000000014 | 207.557 | 0.000 | n/a | 0.000 | 0.000 | 1.691 | 205.503 | 0.022 | n/a | 0.214 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c60000000000000045 | 207.030 | 0.000 | n/a | 0.000 | 0.000 | 5.085 | 201.589 | 0.024 | n/a | 0.200 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c60000000000000010 | 206.192 | 0.000 | n/a | 0.000 | 0.000 | 1.595 | 204.285 | 0.023 | n/a | 0.175 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-44/journal/page | none observed |
| d99208fe46d419c60000000000000032 | 206.119 | 0.000 | n/a | 0.000 | 0.000 | 0.805 | 205.000 | 0.019 | n/a | 0.144 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c60000000000000028 | 205.919 | 0.000 | n/a | 0.000 | 0.000 | 1.088 | 204.437 | 0.016 | n/a | 0.194 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c60000000000000047 | 205.385 | 0.000 | n/a | 0.000 | 0.000 | 0.543 | 204.473 | 0.019 | n/a | 0.167 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c60000000000000022 | 205.309 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 204.189 | 0.017 | n/a | 0.122 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c6000000000000004c | 205.115 | 0.000 | n/a | 0.000 | 0.000 | 1.014 | 203.908 | 0.013 | n/a | 0.079 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-44/journal/page | none observed |
| d99208fe46d419c60000000000000053 | 204.986 | 0.000 | n/a | 0.000 | 0.000 | 3.029 | 201.321 | 0.020 | n/a | 0.465 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c60000000000000009 | 204.702 | 0.000 | n/a | 0.000 | 0.000 | 2.743 | 201.149 | 0.047 | n/a | 0.166 | 0.000 | n/a | n/a | 0.598 | 0.000 | 0.000 | 0.598 | gw-r/thread-63/journal/page | none observed |
| d99208fe46d419c60000000000000043 | 204.579 | 0.000 | n/a | 0.000 | 0.000 | 1.290 | 202.723 | 0.030 | n/a | 0.266 | 0.000 | n/a | n/a | 0.270 | 0.000 | 0.000 | 0.270 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c60000000000000039 | 204.538 | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 203.741 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c60000000000000020 | 204.532 | 0.000 | n/a | 0.000 | 0.000 | 1.326 | 202.894 | 0.034 | n/a | 0.161 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c60000000000000040 | 204.382 | 0.000 | n/a | 0.000 | 0.000 | 1.735 | 202.071 | 0.060 | n/a | 0.160 | 0.000 | n/a | n/a | 0.356 | 0.000 | 0.000 | 0.356 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c6000000000000000f | 204.133 | 0.000 | n/a | 0.000 | 0.000 | 1.039 | 198.937 | 0.073 | n/a | 3.857 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c60000000000000012 | 204.097 | 0.000 | n/a | 0.000 | 0.000 | 2.219 | 201.291 | 0.014 | n/a | 0.364 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c6000000000000002c | 203.988 | 0.000 | n/a | 0.000 | 0.000 | 0.728 | 203.010 | 0.014 | n/a | 0.120 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c6000000000000003f | 203.838 | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 202.608 | 0.029 | n/a | 0.314 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-44/journal/page | none observed |

## P3 / L1 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.363 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 201.047 | 0.016 | n/a | 0.109 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 208.688 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.878 | 205.761 | 5.231 | n/a | 0.429 | 0.000 | n/a | n/a | 0.254 | 0.000 | 0.000 | 0.254 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d99208fe46d419c6000000000000006c | 208.688 | 0.000 | n/a | 0.000 | 0.000 | 6.878 | 201.504 | 0.049 | n/a | 0.159 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-44/journal/page | none observed |
| d99208fe46d419c60000000000000096 | 207.247 | 0.000 | n/a | 0.000 | 0.000 | 1.370 | 205.472 | 0.024 | n/a | 0.157 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c60000000000000064 | 207.129 | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 205.761 | 0.030 | n/a | 0.268 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c600000000000000a1 | 206.958 | 0.000 | n/a | 0.000 | 0.000 | 1.966 | 204.723 | 0.039 | n/a | 0.114 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c6000000000000007a | 206.567 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 205.409 | 0.026 | n/a | 0.135 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c60000000000000086 | 206.442 | 0.000 | n/a | 0.000 | 0.000 | 1.432 | 204.689 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c6000000000000005d | 205.809 | 0.000 | n/a | 0.000 | 0.000 | 0.691 | 204.874 | 0.013 | n/a | 0.127 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c60000000000000083 | 205.210 | 0.000 | n/a | 0.000 | 0.000 | 4.296 | 200.710 | 0.014 | n/a | 0.083 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c6000000000000008f | 205.015 | 0.000 | n/a | 0.000 | 0.000 | 3.811 | 200.865 | 0.016 | n/a | 0.116 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-63/journal/page | none observed |
| d99208fe46d419c60000000000000097 | 204.996 | 0.000 | n/a | 0.000 | 0.000 | 3.150 | 201.571 | 0.026 | n/a | 0.126 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c600000000000000ae | 204.916 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 203.837 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c600000000000000bb | 204.861 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 203.669 | 0.025 | n/a | 0.092 | 0.000 | n/a | n/a | 0.254 | 0.000 | 0.000 | 0.254 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c60000000000000085 | 204.425 | 0.000 | n/a | 0.000 | 0.000 | 1.563 | 202.442 | 0.027 | n/a | 0.207 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c600000000000000a8 | 204.406 | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 200.948 | 2.427 | n/a | 0.123 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-44/journal/page | none observed |
| d99208fe46d419c6000000000000008a | 204.215 | 0.000 | n/a | 0.000 | 0.000 | 0.959 | 202.915 | 0.017 | n/a | 0.157 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-44/journal/page | none observed |
| d99208fe46d419c600000000000000c5 | 203.783 | 0.000 | n/a | 0.000 | 0.000 | 1.322 | 202.141 | 0.012 | n/a | 0.166 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c60000000000000079 | 203.780 | 0.000 | n/a | 0.000 | 0.000 | 0.918 | 202.575 | 0.022 | n/a | 0.122 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c60000000000000081 | 203.712 | 0.000 | n/a | 0.000 | 0.000 | 1.140 | 202.263 | 0.058 | n/a | 0.110 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c600000000000000c4 | 203.479 | 0.000 | n/a | 0.000 | 0.000 | 1.140 | 202.007 | 0.022 | n/a | 0.162 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-44/journal/page | none observed |
| d99208fe46d419c600000000000000c3 | 203.420 | 0.000 | n/a | 0.000 | 0.000 | 1.834 | 201.255 | 0.024 | n/a | 0.165 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.053 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.827 | 200.949 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 |
| p99 | 206.946 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.615 | 205.192 | 3.777 | n/a | 0.597 | 0.000 | n/a | n/a | 50.787 | 0.000 | 0.000 | 50.787 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d99208fe46d419c60000000000000100 | 206.946 | 0.000 | n/a | 0.000 | 0.000 | 1.519 | 205.192 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-63/journal/page | none observed |
| d99208fe46d419c600000000000000d8 | 205.806 | 0.000 | n/a | 0.000 | 0.000 | 2.503 | 202.427 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.803 | 0.000 | 0.000 | 0.803 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c6000000000000012d | 205.185 | 0.000 | n/a | 0.000 | 0.000 | 0.754 | 204.248 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c60000000000000105 | 205.095 | 0.000 | n/a | 0.000 | 0.000 | 4.086 | 200.801 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c6000000000000011a | 205.043 | 0.000 | n/a | 0.000 | 0.000 | 3.968 | 200.856 | 0.007 | n/a | 0.084 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c600000000000000e8 | 204.804 | 0.000 | n/a | 0.000 | 0.000 | 3.024 | 201.489 | 0.016 | n/a | 0.116 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c60000000000000127 | 204.731 | 0.000 | n/a | 0.000 | 0.000 | 1.411 | 202.621 | 0.019 | n/a | 0.425 | 0.000 | n/a | n/a | 0.255 | 0.000 | 0.000 | 0.255 | gw-r/thread-63/journal/page | none observed |
| d99208fe46d419c600000000000000e5 | 204.026 | 0.000 | n/a | 0.000 | 0.000 | 1.228 | 202.440 | 0.019 | n/a | 0.139 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c600000000000000ce | 203.998 | 0.000 | n/a | 0.000 | 0.000 | 2.297 | 201.466 | 0.014 | n/a | 0.100 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c6000000000000011f | 203.903 | 0.000 | n/a | 0.000 | 0.000 | 0.591 | 203.060 | 0.018 | n/a | 0.112 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c600000000000000ee | 203.784 | 0.000 | n/a | 0.000 | 0.000 | 1.506 | 202.018 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-44/journal/page | none observed |
| d99208fe46d419c600000000000000dc | 203.774 | 0.000 | n/a | 0.000 | 0.000 | 2.288 | 201.121 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.293 | 0.000 | 0.000 | 0.293 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c60000000000000108 | 203.697 | 0.000 | n/a | 0.000 | 0.000 | 1.579 | 201.534 | 0.016 | n/a | 0.150 | 0.000 | n/a | n/a | 0.418 | 0.000 | 0.000 | 0.418 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c60000000000000101 | 203.352 | 0.000 | n/a | 0.000 | 0.000 | 2.155 | 200.992 | 0.013 | n/a | 0.064 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c60000000000000107 | 203.175 | 0.000 | n/a | 0.000 | 0.000 | 2.156 | 200.774 | 0.011 | n/a | 0.061 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c600000000000000cb | 203.069 | 0.000 | n/a | 0.000 | 0.000 | 1.205 | 201.515 | 0.007 | n/a | 0.154 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c600000000000000ec | 202.996 | 0.000 | n/a | 0.000 | 0.000 | 1.347 | 201.274 | 0.009 | n/a | 0.128 | 0.000 | n/a | n/a | 0.238 | 0.000 | 0.000 | 0.238 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c60000000000000103 | 202.996 | 0.000 | n/a | 0.000 | 0.000 | 1.502 | 201.221 | 0.010 | n/a | 0.096 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c600000000000000d4 | 202.992 | 0.000 | n/a | 0.000 | 0.000 | 1.259 | 201.457 | 0.007 | n/a | 0.098 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c600000000000000ed | 202.938 | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 201.784 | 0.023 | n/a | 0.157 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.889 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.796 | 200.889 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 207.404 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.909 | 204.536 | 6.369 | n/a | 0.368 | 0.000 | n/a | n/a | 50.279 | 0.000 | 0.000 | 50.279 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d99208fe46d419c60000000000000141 | 207.404 | 0.000 | n/a | 0.000 | 0.000 | 3.733 | 203.477 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-63/journal/page | none observed |
| d99208fe46d419c60000000000000154 | 206.211 | 0.000 | n/a | 0.000 | 0.000 | 0.837 | 204.536 | 0.194 | n/a | 0.368 | 0.000 | n/a | n/a | 0.276 | 0.000 | 0.000 | 0.276 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c60000000000000168 | 204.652 | 0.000 | n/a | 0.000 | 0.000 | 3.725 | 200.737 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c60000000000000143 | 204.439 | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 200.052 | 3.529 | n/a | 0.021 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c60000000000000176 | 204.091 | 0.000 | n/a | 0.000 | 0.000 | 0.690 | 203.195 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c6000000000000012f | 203.813 | 0.000 | n/a | 0.000 | 0.000 | 0.459 | 203.120 | 0.017 | n/a | 0.127 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c60000000000000191 | 203.634 | 0.000 | n/a | 0.000 | 0.000 | 1.192 | 202.140 | 0.013 | n/a | 0.115 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c60000000000000164 | 203.289 | 0.000 | n/a | 0.000 | 0.000 | 0.932 | 202.016 | 0.015 | n/a | 0.177 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c60000000000000182 | 202.995 | 0.000 | n/a | 0.000 | 0.000 | 1.228 | 201.410 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.275 | 0.000 | 0.000 | 0.275 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c60000000000000187 | 202.882 | 0.000 | n/a | 0.000 | 0.000 | 0.946 | 201.598 | 0.019 | n/a | 0.098 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c6000000000000013a | 202.869 | 0.000 | n/a | 0.000 | 0.000 | 1.511 | 201.159 | 0.006 | n/a | 0.088 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c6000000000000015f | 202.837 | 0.000 | n/a | 0.000 | 0.000 | 1.653 | 200.973 | 0.015 | n/a | 0.063 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-63/journal/page | none observed |
| d99208fe46d419c60000000000000150 | 202.808 | 0.000 | n/a | 0.000 | 0.000 | 1.420 | 201.113 | 0.013 | n/a | 0.080 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c60000000000000155 | 202.704 | 0.000 | n/a | 0.000 | 0.000 | 0.946 | 201.509 | 0.017 | n/a | 0.076 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c6000000000000017c | 202.694 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 201.611 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c60000000000000147 | 202.600 | 0.000 | n/a | 0.000 | 0.000 | 0.712 | 201.620 | 0.018 | n/a | 0.152 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c6000000000000017e | 202.583 | 0.000 | n/a | 0.000 | 0.000 | 0.810 | 201.532 | 0.013 | n/a | 0.099 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c6000000000000016f | 202.569 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 201.419 | 0.010 | n/a | 0.118 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c6000000000000015d | 202.517 | 0.000 | n/a | 0.000 | 0.000 | 1.083 | 201.255 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c60000000000000170 | 202.447 | 0.000 | n/a | 0.000 | 0.000 | 0.862 | 201.348 | 0.021 | n/a | 0.083 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / read (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.572 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.698 | 200.759 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 205.720 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.045 | 202.506 | 3.146 | n/a | 0.160 | 0.000 | n/a | n/a | 0.326 | 0.000 | 0.000 | 0.326 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d99208fe46d419c6000000000000019a | 223.502 | 0.000 | n/a | 0.000 | 0.000 | 0.494 | 222.847 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-63/journal/page | none observed |
| d99208fe46d419c600000000000001dd | 205.720 | 0.000 | n/a | 0.000 | 0.000 | 4.670 | 200.863 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c600000000000001fb | 205.115 | 0.000 | n/a | 0.000 | 0.000 | 4.045 | 200.606 | 0.007 | n/a | 0.021 | 0.000 | n/a | n/a | 0.435 | 0.000 | 0.000 | 0.435 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c600000000000001d7 | 203.789 | 0.000 | n/a | 0.000 | 0.000 | 2.773 | 200.763 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c60000000000000209 | 203.666 | 0.000 | n/a | 0.000 | 0.000 | 0.804 | 202.408 | 0.014 | n/a | 0.160 | 0.000 | n/a | n/a | 0.280 | 0.000 | 0.000 | 0.280 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c600000000000001e0 | 203.542 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 202.506 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c600000000000001e8 | 203.351 | 0.000 | n/a | 0.000 | 0.000 | 1.508 | 201.547 | 0.008 | n/a | 0.098 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c6000000000000020a | 202.465 | 0.000 | n/a | 0.000 | 0.000 | 1.069 | 201.133 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c600000000000001c3 | 202.465 | 0.000 | n/a | 0.000 | 0.000 | 1.068 | 201.170 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c600000000000001b0 | 202.275 | 0.000 | n/a | 0.000 | 0.000 | 1.080 | 200.941 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c600000000000001b3 | 202.271 | 0.000 | n/a | 0.000 | 0.000 | 0.813 | 201.286 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c600000000000001f2 | 202.253 | 0.000 | n/a | 0.000 | 0.000 | 1.149 | 200.906 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c600000000000001ac | 202.176 | 0.000 | n/a | 0.000 | 0.000 | 0.900 | 201.028 | 0.006 | n/a | 0.083 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c60000000000000203 | 202.170 | 0.000 | n/a | 0.000 | 0.000 | 0.580 | 200.400 | 0.006 | n/a | 1.073 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c600000000000001a6 | 202.164 | 0.000 | n/a | 0.000 | 0.000 | 0.378 | 201.600 | 0.030 | n/a | 0.068 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c600000000000001b8 | 202.139 | 0.000 | n/a | 0.000 | 0.000 | 0.955 | 200.937 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c600000000000001c0 | 202.138 | 0.000 | n/a | 0.000 | 0.000 | 0.984 | 200.947 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c600000000000001c2 | 202.134 | 0.000 | n/a | 0.000 | 0.000 | 0.709 | 201.228 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c600000000000001aa | 202.113 | 0.000 | n/a | 0.000 | 0.000 | 0.569 | 201.373 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c600000000000001f6 | 202.106 | 0.000 | n/a | 0.000 | 0.000 | 0.849 | 200.932 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.256 | 0.000 | 0.000 | 0.256 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / read (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.745 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.744 | 200.805 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 |
| p99 | 210.229 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.947 | 204.888 | 1.672 | n/a | 0.145 | 0.000 | n/a | n/a | 0.285 | 0.000 | 0.000 | 0.285 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d99208fe46d419c6000000000000021e | 212.278 | 0.000 | n/a | 0.000 | 0.000 | 7.517 | 204.481 | 0.021 | n/a | 0.108 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c6000000000000027c | 210.229 | 0.000 | n/a | 0.000 | 0.000 | 0.848 | 209.190 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c60000000000000244 | 206.980 | 0.000 | n/a | 0.000 | 0.000 | 2.121 | 204.692 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c60000000000000273 | 206.030 | 0.000 | n/a | 0.000 | 0.000 | 0.910 | 204.888 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-63/journal/page | none observed |
| d99208fe46d419c60000000000000240 | 204.779 | 0.000 | n/a | 0.000 | 0.000 | 1.371 | 203.122 | 0.016 | n/a | 0.060 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c60000000000000278 | 204.599 | 0.000 | n/a | 0.000 | 0.000 | 3.853 | 200.588 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-63/journal/page | none observed |
| d99208fe46d419c6000000000000025b | 204.016 | 0.000 | n/a | 0.000 | 0.000 | 2.546 | 201.250 | 0.028 | n/a | 0.064 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c60000000000000213 | 203.356 | 0.000 | n/a | 0.000 | 0.000 | 0.947 | 202.115 | 0.009 | n/a | 0.174 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c6000000000000021b | 203.142 | 0.000 | n/a | 0.000 | 0.000 | 2.049 | 200.921 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c60000000000000238 | 202.772 | 0.000 | n/a | 0.000 | 0.000 | 0.495 | 202.011 | 0.019 | n/a | 0.143 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c6000000000000027d | 202.733 | 0.000 | n/a | 0.000 | 0.000 | 0.910 | 201.526 | 0.028 | n/a | 0.118 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c6000000000000024a | 202.686 | 0.000 | n/a | 0.000 | 0.000 | 0.470 | 202.063 | 0.010 | n/a | 0.051 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c60000000000000233 | 202.668 | 0.000 | n/a | 0.000 | 0.000 | 0.716 | 201.673 | 0.009 | n/a | 0.145 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c60000000000000216 | 202.624 | 0.000 | n/a | 0.000 | 0.000 | 1.022 | 201.350 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c60000000000000265 | 202.572 | 0.000 | n/a | 0.000 | 0.000 | 1.177 | 201.177 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c6000000000000023f | 202.559 | 0.000 | n/a | 0.000 | 0.000 | 0.893 | 201.395 | 0.022 | n/a | 0.092 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c60000000000000254 | 202.531 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 201.462 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c60000000000000255 | 202.457 | 0.000 | n/a | 0.000 | 0.000 | 0.676 | 201.488 | 0.030 | n/a | 0.102 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c60000000000000249 | 202.440 | 0.000 | n/a | 0.000 | 0.000 | 0.976 | 201.256 | 0.006 | n/a | 0.075 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c60000000000000248 | 202.333 | 0.000 | n/a | 0.000 | 0.000 | 0.999 | 201.125 | 0.014 | n/a | 0.079 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-46/journal/page | none observed |

## P3 / L1024 / read (65 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 77.605 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.744 | 76.140 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 |
| p99 | 205.052 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.396 | 204.464 | 26.490 | n/a | 2.960 | 0.000 | n/a | n/a | 50.012 | 0.000 | 0.000 | 50.012 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d99208fe46d419c60000000000000281 | 205.052 | 0.000 | n/a | 0.000 | 0.000 | 0.388 | 204.464 | 0.017 | n/a | 0.079 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c60000000000000293 | 204.772 | 0.000 | n/a | 0.000 | 0.000 | 0.565 | 203.986 | 0.013 | n/a | 0.082 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c60000000000000295 | 203.227 | 0.000 | n/a | 0.000 | 0.000 | 1.556 | 201.272 | 0.008 | n/a | 0.078 | 0.000 | n/a | n/a | 0.313 | 0.000 | 0.000 | 0.313 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c60000000000000294 | 203.151 | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 201.985 | 0.013 | n/a | 0.113 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c60000000000000296 | 202.960 | 0.000 | n/a | 0.000 | 0.000 | 1.428 | 201.263 | 0.010 | n/a | 0.087 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c60000000000000283 | 202.912 | 0.000 | n/a | 0.000 | 0.000 | 0.856 | 201.692 | 0.059 | n/a | 0.093 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c60000000000000288 | 202.837 | 0.000 | n/a | 0.000 | 0.000 | 1.234 | 201.243 | 0.008 | n/a | 0.086 | 0.000 | n/a | n/a | 0.265 | 0.000 | 0.000 | 0.265 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c6000000000000028e | 202.379 | 0.000 | n/a | 0.000 | 0.000 | 0.905 | 201.258 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c6000000000000028d | 202.336 | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 201.322 | 0.012 | n/a | 0.109 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c60000000000000299 | 202.180 | 0.000 | n/a | 0.000 | 0.000 | 0.867 | 201.111 | 0.006 | n/a | 0.079 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c60000000000000282 | 202.153 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 201.185 | 0.008 | n/a | 0.088 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c6000000000000028f | 202.100 | 0.000 | n/a | 0.000 | 0.000 | 0.943 | 200.988 | 0.005 | n/a | 0.062 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-63/journal/page | none observed |
| d99208fe46d419c60000000000000287 | 202.095 | 0.000 | n/a | 0.000 | 0.000 | 0.771 | 201.043 | 0.007 | n/a | 0.077 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c6000000000000029a | 202.083 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 201.122 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c60000000000000298 | 201.914 | 0.000 | n/a | 0.000 | 0.000 | 0.541 | 201.132 | 0.014 | n/a | 0.094 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c60000000000000285 | 201.890 | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 200.721 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c60000000000000291 | 201.560 | 0.000 | n/a | 0.000 | 0.000 | 0.412 | 200.979 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c6000000000000028a | 201.459 | 0.000 | n/a | 0.000 | 0.000 | 0.481 | 200.811 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-49/journal/page | none observed |
| d99208fe46d419c60000000000000289 | 159.666 | 0.000 | n/a | 0.000 | 0.000 | 0.779 | 158.728 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c60000000000000297 | 113.397 | 0.000 | n/a | 0.000 | 0.000 | 0.800 | 112.357 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-45/journal/page | none observed |

## P3 / tail / read (218 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 88.952 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.517 | 87.263 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 |
| p99 | 204.998 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.551 | 201.747 | 1.090 | n/a | 0.140 | 0.000 | n/a | n/a | 51.066 | 0.000 | 0.000 | 51.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d99208fe46d419c60000000000000eb1 | 205.467 | 0.000 | n/a | 0.000 | 0.000 | 1.975 | 203.310 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-63/journal/page | none observed |
| d99208fe46d419c60000000000000ee4 | 205.101 | 0.000 | n/a | 0.000 | 0.000 | 4.107 | 200.823 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c60000000000000eb7 | 204.998 | 0.000 | n/a | 0.000 | 0.000 | 1.003 | 203.778 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c60000000000000eb5 | 202.933 | 0.000 | n/a | 0.000 | 0.000 | 1.062 | 201.604 | 0.009 | n/a | 0.121 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-63/journal/page | none observed |
| d99208fe46d419c60000000000000e89 | 202.859 | 0.000 | n/a | 0.000 | 0.000 | 1.394 | 201.203 | 0.005 | n/a | 0.090 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c60000000000000ee1 | 202.754 | 0.000 | n/a | 0.000 | 0.000 | 0.744 | 201.747 | 0.014 | n/a | 0.123 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c60000000000000ea4 | 202.749 | 0.000 | n/a | 0.000 | 0.000 | 0.736 | 201.715 | 0.016 | n/a | 0.194 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c60000000000000eb6 | 202.600 | 0.000 | n/a | 0.000 | 0.000 | 0.791 | 201.596 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c60000000000000e8a | 202.598 | 0.000 | n/a | 0.000 | 0.000 | 0.951 | 201.155 | 0.032 | n/a | 0.093 | 0.000 | n/a | n/a | 0.367 | 0.000 | 0.000 | 0.367 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c60000000000000e82 | 202.445 | 0.000 | n/a | 0.000 | 0.000 | 1.781 | 200.489 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-46/journal/page | none observed |
| d99208fe46d419c60000000000000ec6 | 202.361 | 0.000 | n/a | 0.000 | 0.000 | 1.142 | 201.002 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-45/journal/page | none observed |
| d99208fe46d419c60000000000000ef0 | 202.344 | 0.000 | n/a | 0.000 | 0.000 | 0.928 | 201.209 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-63/journal/page | none observed |
| d99208fe46d419c60000000000000ede | 202.283 | 0.000 | n/a | 0.000 | 0.000 | 0.815 | 201.217 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-66/journal/page | none observed |
| d99208fe46d419c60000000000000e96 | 202.157 | 0.000 | n/a | 0.000 | 0.000 | 0.443 | 201.508 | 0.013 | n/a | 0.107 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-47/journal/page | none observed |
| d99208fe46d419c60000000000000ea5 | 202.054 | 0.000 | n/a | 0.000 | 0.000 | 0.573 | 201.265 | 0.013 | n/a | 0.074 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c60000000000000ee0 | 202.020 | 0.000 | n/a | 0.000 | 0.000 | 0.676 | 201.146 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c60000000000000ee2 | 202.002 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 200.968 | 0.019 | n/a | 0.071 | 0.000 | n/a | n/a | 0.074 | 0.000 | 0.000 | 0.074 | gw-r/thread-48/journal/page | none observed |
| d99208fe46d419c60000000000000ecc | 201.957 | 0.000 | n/a | 0.000 | 0.000 | 0.828 | 200.935 | 0.005 | n/a | 0.095 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-42/journal/page | none observed |
| d99208fe46d419c60000000000000e86 | 201.930 | 0.000 | n/a | 0.000 | 0.000 | 0.721 | 201.023 | 0.011 | n/a | 0.072 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-63/journal/page | none observed |
| d99208fe46d419c60000000000000ec3 | 201.921 | 0.000 | n/a | 0.000 | 0.000 | 0.526 | 201.201 | 0.014 | n/a | 0.081 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-48/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
