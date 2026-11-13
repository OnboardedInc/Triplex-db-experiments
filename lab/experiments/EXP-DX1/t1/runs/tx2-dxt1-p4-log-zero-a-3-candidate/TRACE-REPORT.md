# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (180.944 ms, trace `e6eb72f3c6e8377d00000000000011d3`); `node-14/thread-0/socket.wait-first-byte` (192.176 ms, trace `e6eb72f3c6e8377d00000000000011cf`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (95.278 ms, trace `e6eb72f3c6e8377d00000000000011d5`); `gw-w/thread-65/peer.transact-await (includes order/network/storage)` (167.323 ms, trace `e6eb72f3c6e8377d00000000000011d1`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (170.256 ms, trace `e6eb72f3c6e8377d00000000000011d2`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-log-zero-a-3-candidate`; source `ef7473361c138176ead9c0222b2ccc53e33dde11`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3709/3711 (99.946%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 6686621.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 223 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13421.008 | 541.937 | 69.401 | 308 |
| L1 | 0 | 19035.381 | 423.214 | 25.645 | 470 |
| L4 | 0 | 19309.781 | 382.687 | 15.413 | 426 |
| L16 | 0 | 19460.425 | 372.867 | 4.714 | 474 |
| L64 | 0 | 19794.527 | 478.584 | 16.852 | 596 |
| L256 | 0 | 19031.517 | 384.731 | 13.190 | 486 |
| L1024 | 0 | 19977.542 | 3825.545 | 136.787 | 11997 |
| tail | 0 | 64605.997 | 12073.191 | 670.736 | 37436 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| e6eb72f3c6e8377d00000000000011d3 | driver.queue.scheduler-late | 7.354 | none | 4 / 32 |
| e6eb72f3c6e8377d00000000000011d3 | driver.queue.scheduler-dispatch | 0.028 | none | 4 / 32 |

Observed active steps while trace e6eb72f3c6e8377d00000000000011d3 waited: []

| e6eb72f3c6e8377d00000000000011cf | driver.queue.scheduler-late | 4.272 | none | 2 / 32 |
| e6eb72f3c6e8377d00000000000011cf | driver.queue.scheduler-dispatch | 0.150 | none | 2 / 32 |

Observed active steps while trace e6eb72f3c6e8377d00000000000011cf waited: []

| e6eb72f3c6e8377d00000000000011d5 | driver.queue.scheduler-late | 91.682 | none | 4 / 32 |
| e6eb72f3c6e8377d00000000000011d5 | driver.queue.scheduler-dispatch | 0.025 | none | 4 / 32 |

Observed active steps while trace e6eb72f3c6e8377d00000000000011d5 waited: []

| e6eb72f3c6e8377d00000000000011d1 | driver.queue.scheduler-late | 30.738 | none | 2 / 32 |
| e6eb72f3c6e8377d00000000000011d1 | driver.queue.scheduler-dispatch | 0.036 | none | 2 / 32 |

Observed active steps while trace e6eb72f3c6e8377d00000000000011d1 waited: []

| e6eb72f3c6e8377d00000000000011d2 | driver.queue.scheduler-late | 18.747 | none | 3 / 32 |
| e6eb72f3c6e8377d00000000000011d2 | driver.queue.scheduler-dispatch | 0.025 | none | 3 / 32 |

Observed active steps while trace e6eb72f3c6e8377d00000000000011d2 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.328 | 0.726 | 0.000 | 0.825 | 5.323 | 0.028 | 0.000 | 0.247 | 1.586 | 5.696 | 0.055 | n/a | 0.429 | 14.988 | n/a | n/a | 0.062 | 6.640 | 0.207 | 0.062 |
| p99 | 83.266 | 4.092 | 0.018 | 4.191 | 22.804 | 0.987 | 3.686 | 29.274 | 5.462 | 30.027 | 0.279 | n/a | 3.776 | 62.537 | n/a | n/a | 0.403 | 38.507 | 0.558 | 0.403 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d00000000000000f1 | 83.266 | 22.804 | 0.829 | 0.000 | 0.086 | 3.531 | 30.027 | 0.279 | n/a | 1.046 | 24.611 | n/a | n/a | 0.053 | 23.719 | 0.285 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000000fe | 73.753 | 6.321 | 0.005 | 0.000 | 1.132 | 0.979 | 1.913 | 0.037 | n/a | 0.735 | 62.537 | n/a | n/a | 0.093 | 7.458 | 0.101 | 0.093 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000000f5 | 72.459 | 9.879 | 0.987 | 0.000 | 0.367 | 2.406 | 26.539 | 0.061 | n/a | 1.451 | 30.639 | n/a | n/a | 0.129 | 11.234 | 0.155 | 0.129 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000107 | 70.249 | 9.221 | 0.012 | 0.000 | 29.274 | 1.410 | 5.548 | 0.095 | n/a | 3.776 | 20.844 | n/a | n/a | 0.069 | 38.507 | 0.548 | 0.069 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| e6eb72f3c6e8377d0000000000000109 | 51.045 | 7.747 | 0.822 | 0.000 | 0.143 | 1.911 | 16.530 | 0.091 | n/a | 0.130 | 23.622 | n/a | n/a | 0.050 | 8.711 | 0.171 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000000f9 | 50.712 | 5.713 | 0.305 | 0.000 | 0.124 | 2.431 | 21.694 | 0.053 | n/a | 0.426 | 19.874 | n/a | n/a | 0.093 | 6.142 | 0.121 | 0.093 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000000ee | 50.488 | 12.790 | 0.028 | 0.000 | 0.669 | 1.136 | 12.512 | 0.091 | n/a | 3.494 | 19.364 | n/a | n/a | 0.403 | 13.488 | 0.267 | 0.403 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000117 | 48.473 | 3.879 | 0.269 | 0.402 | 0.142 | 2.527 | 11.233 | 0.060 | n/a | 1.218 | 28.689 | n/a | n/a | 0.054 | 4.692 | 0.097 | 0.054 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000103 | 45.958 | 6.369 | 0.266 | 0.000 | 1.031 | 1.617 | 14.800 | 0.055 | n/a | 0.121 | 21.613 | n/a | n/a | 0.087 | 7.666 | 0.167 | 0.087 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000011f | 45.018 | 5.288 | 0.271 | 0.350 | 0.077 | 1.956 | 22.500 | 0.098 | n/a | 0.100 | 14.310 | n/a | n/a | 0.067 | 5.986 | 0.133 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000113 | 41.168 | 4.834 | 0.416 | 0.323 | 0.080 | 5.462 | 13.184 | 0.102 | n/a | 0.168 | 16.555 | n/a | n/a | 0.045 | 5.652 | 0.137 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000101 | 39.653 | 6.171 | 0.291 | 0.000 | 0.092 | 3.252 | 17.365 | 0.066 | n/a | 0.270 | 12.076 | n/a | n/a | 0.070 | 6.554 | 0.165 | 0.070 | gw-w/thread-48/gateway.admitted-work | none observed |
| e6eb72f3c6e8377d000000000000011b | 36.728 | 6.157 | 0.307 | 0.331 | 0.097 | 2.154 | 13.094 | 0.062 | n/a | 0.213 | 14.268 | n/a | n/a | 0.046 | 6.892 | 0.188 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000010d | 35.681 | 7.479 | 0.382 | 0.377 | 0.142 | 3.211 | 9.207 | 0.059 | n/a | 0.449 | 14.311 | n/a | n/a | 0.064 | 8.380 | 0.235 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000125 | 35.328 | 4.876 | 0.225 | 0.290 | 0.247 | 1.809 | 10.320 | 0.058 | n/a | 0.148 | 17.276 | n/a | n/a | 0.080 | 5.637 | 0.160 | 0.080 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000000fb | 35.300 | 6.171 | 0.309 | 0.000 | 0.236 | 3.788 | 9.574 | 0.064 | n/a | 1.895 | 13.020 | n/a | n/a | 0.244 | 6.715 | 0.190 | 0.244 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000115 | 35.285 | 7.994 | 0.007 | 3.140 | 0.796 | 1.141 | 2.046 | 0.048 | n/a | 0.603 | 19.462 | n/a | n/a | 0.048 | 11.937 | 0.338 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000000f7 | 28.773 | 3.973 | 0.006 | 0.000 | 0.977 | 1.471 | 4.522 | 0.049 | n/a | 0.202 | 17.515 | n/a | n/a | 0.059 | 4.956 | 0.172 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000110 | 27.717 | 4.875 | 0.005 | 1.766 | 0.153 | 0.800 | 1.344 | 0.036 | n/a | 0.414 | 18.263 | n/a | n/a | 0.062 | 6.799 | 0.245 | 0.062 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000104 | 24.421 | 9.534 | 0.019 | 3.686 | 0.379 | 1.586 | 1.764 | 0.041 | n/a | 0.561 | 6.789 | n/a | n/a | 0.062 | 13.618 | 0.558 | 0.062 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.820 | 0.952 | 0.000 | 1.775 | 4.007 | 0.006 | 0.000 | 0.626 | 1.063 | 1.344 | 0.042 | n/a | 0.414 | 7.889 | n/a | n/a | 0.061 | 4.956 | 0.278 | 0.061 |
| p99 | 28.773 | 3.522 | 0.018 | 4.191 | 4.875 | 0.007 | 1.766 | 1.091 | 1.471 | 5.601 | 0.129 | n/a | 0.500 | 18.263 | n/a | n/a | 0.255 | 6.799 | 0.422 | 0.255 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d00000000000000f7 | 28.773 | 3.973 | 0.006 | 0.000 | 0.977 | 1.471 | 4.522 | 0.049 | n/a | 0.202 | 17.515 | n/a | n/a | 0.059 | 4.956 | 0.172 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000110 | 27.717 | 4.875 | 0.005 | 1.766 | 0.153 | 0.800 | 1.344 | 0.036 | n/a | 0.414 | 18.263 | n/a | n/a | 0.062 | 6.799 | 0.245 | 0.062 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000011c | 21.856 | 3.437 | 0.007 | 0.000 | 1.091 | 0.894 | 1.229 | 0.042 | n/a | 0.096 | 14.988 | n/a | n/a | 0.073 | 4.534 | 0.207 | 0.073 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000123 | 21.277 | 4.291 | 0.005 | 1.611 | 0.732 | 1.399 | 1.241 | 0.036 | n/a | 0.115 | 11.789 | n/a | n/a | 0.058 | 6.640 | 0.312 | 0.058 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000118 | 17.820 | 4.007 | 0.006 | 0.000 | 1.056 | 1.063 | 5.046 | 0.048 | n/a | 0.450 | 6.084 | n/a | n/a | 0.061 | 5.069 | 0.284 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000000fc | 16.909 | 4.048 | 0.006 | 0.000 | 0.377 | 1.046 | 5.601 | 0.055 | n/a | 0.500 | 5.182 | n/a | n/a | 0.094 | 4.431 | 0.262 | 0.094 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000121 | 15.938 | 3.794 | 0.007 | 0.000 | 0.626 | 1.263 | 2.385 | 0.129 | n/a | 0.363 | 7.331 | n/a | n/a | 0.041 | 4.427 | 0.278 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000000f3 | 15.258 | 4.205 | 0.007 | 0.000 | 0.178 | 0.945 | 1.314 | 0.036 | n/a | 0.429 | 7.889 | n/a | n/a | 0.255 | 4.389 | 0.288 | 0.255 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000010e | 12.489 | 3.429 | 0.005 | 1.256 | 0.585 | 1.112 | 1.287 | 0.041 | n/a | 0.478 | 4.244 | n/a | n/a | 0.051 | 5.275 | 0.422 | 0.051 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.830 | 0.494 | 0.000 | 1.335 | 4.795 | 0.028 | 0.000 | 0.235 | 1.794 | 6.469 | 0.069 | n/a | 0.461 | 12.300 | n/a | n/a | 0.053 | 5.859 | 0.204 | 0.053 |
| p99 | 72.380 | 4.111 | 0.727 | 6.280 | 16.143 | 4.003 | 3.330 | 9.935 | 9.806 | 19.797 | 0.323 | n/a | 5.015 | 48.396 | n/a | n/a | 0.178 | 18.070 | 0.572 | 0.178 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d0000000000000135 | 72.380 | 3.830 | 0.219 | 0.396 | 0.140 | 1.674 | 17.172 | 0.063 | n/a | 0.437 | 48.396 | n/a | n/a | 0.052 | 4.586 | 0.063 | 0.052 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000014c | 70.080 | 16.143 | 0.017 | 1.685 | 0.225 | 2.778 | 19.797 | 0.095 | n/a | 3.366 | 25.932 | n/a | n/a | 0.042 | 18.070 | 0.258 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000132 | 68.301 | 4.125 | 0.296 | 1.430 | 0.082 | 3.886 | 13.057 | 0.089 | n/a | 3.516 | 41.766 | n/a | n/a | 0.053 | 5.934 | 0.087 | 0.053 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000139 | 64.699 | 5.145 | 0.006 | 2.756 | 0.933 | 0.754 | 11.686 | 0.045 | n/a | 0.099 | 43.235 | n/a | n/a | 0.040 | 8.840 | 0.137 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000012c | 54.476 | 4.795 | 0.345 | 0.322 | 0.094 | 2.044 | 9.198 | 0.071 | n/a | 4.226 | 33.334 | n/a | n/a | 0.047 | 5.555 | 0.102 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000169 | 48.629 | 4.222 | 0.280 | 0.461 | 0.129 | 1.893 | 15.126 | 0.159 | n/a | 0.588 | 25.717 | n/a | n/a | 0.053 | 5.092 | 0.105 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000165 | 45.916 | 5.167 | 4.003 | 0.504 | 0.235 | 2.604 | 14.790 | 0.189 | n/a | 0.379 | 17.934 | n/a | n/a | 0.113 | 9.908 | 0.216 | 0.113 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.277ms |
| e6eb72f3c6e8377d0000000000000129 | 42.756 | 7.195 | 0.291 | 0.000 | 0.175 | 2.048 | 15.529 | 0.140 | n/a | 5.015 | 12.300 | n/a | n/a | 0.064 | 7.660 | 0.179 | 0.064 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000147 | 39.584 | 3.840 | 0.281 | 0.314 | 0.347 | 1.496 | 11.445 | 0.111 | n/a | 0.380 | 21.192 | n/a | n/a | 0.178 | 4.781 | 0.121 | 0.178 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000014b | 37.573 | 6.518 | 0.309 | 0.333 | 0.078 | 2.743 | 8.197 | 0.085 | n/a | 0.166 | 19.099 | n/a | n/a | 0.044 | 7.239 | 0.193 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000015f | 35.476 | 5.801 | 0.236 | 0.389 | 0.067 | 1.794 | 10.553 | 0.098 | n/a | 0.240 | 16.258 | n/a | n/a | 0.041 | 6.493 | 0.183 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000143 | 35.368 | 3.899 | 0.217 | 0.350 | 0.089 | 1.324 | 5.974 | 0.046 | n/a | 0.461 | 22.966 | n/a | n/a | 0.042 | 4.555 | 0.129 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000013d | 34.520 | 5.146 | 0.489 | 0.000 | 0.094 | 2.431 | 11.899 | 0.053 | n/a | 0.428 | 13.918 | n/a | n/a | 0.061 | 5.729 | 0.166 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000177 | 34.410 | 5.402 | 0.221 | 0.461 | 0.127 | 2.175 | 15.017 | 0.111 | n/a | 0.836 | 10.000 | n/a | n/a | 0.059 | 6.211 | 0.181 | 0.059 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000016d | 32.705 | 5.775 | 0.243 | 0.378 | 0.125 | 1.965 | 6.490 | 0.084 | n/a | 0.785 | 16.808 | n/a | n/a | 0.052 | 6.521 | 0.199 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000137 | 32.084 | 5.775 | 0.390 | 0.000 | 0.134 | 2.716 | 6.469 | 0.069 | n/a | 0.611 | 15.819 | n/a | n/a | 0.100 | 6.299 | 0.196 | 0.100 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000153 | 31.575 | 6.468 | 0.285 | 0.476 | 0.084 | 1.887 | 9.307 | 0.095 | n/a | 0.767 | 12.155 | n/a | n/a | 0.051 | 7.312 | 0.232 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000013b | 31.151 | 4.282 | 0.324 | 0.000 | 0.089 | 1.836 | 12.258 | 0.132 | n/a | 1.742 | 10.435 | n/a | n/a | 0.053 | 4.695 | 0.151 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000127 | 29.344 | 4.292 | 0.326 | 0.000 | 0.120 | 1.446 | 11.000 | 0.051 | n/a | 0.391 | 11.653 | n/a | n/a | 0.067 | 4.737 | 0.161 | 0.067 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000133 | 28.921 | 6.020 | 0.006 | 0.000 | 0.202 | 9.806 | 6.281 | 0.089 | n/a | 0.849 | 5.619 | n/a | n/a | 0.050 | 6.227 | 0.215 | 0.050 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.732 | 0.868 | 0.000 | 1.790 | 4.348 | 0.006 | 0.000 | 0.563 | 1.094 | 1.501 | 0.042 | n/a | 0.434 | 5.675 | n/a | n/a | 0.050 | 4.996 | 0.215 | 0.050 |
| p99 | 28.921 | 2.160 | 0.573 | 2.274 | 6.020 | 0.011 | 0.000 | 9.935 | 9.806 | 6.281 | 0.323 | n/a | 2.793 | 12.973 | n/a | n/a | 0.068 | 14.289 | 0.572 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d0000000000000133 | 28.921 | 6.020 | 0.006 | 0.000 | 0.202 | 9.806 | 6.281 | 0.089 | n/a | 0.849 | 5.619 | n/a | n/a | 0.050 | 6.227 | 0.215 | 0.050 | node-14/thread-0/socket.wait-first-byte | none observed |
| e6eb72f3c6e8377d0000000000000174 | 24.994 | 4.348 | 0.006 | 0.000 | 9.935 | 1.293 | 1.501 | 0.042 | n/a | 0.125 | 7.680 | n/a | n/a | 0.064 | 14.289 | 0.572 | 0.064 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 4.661ms; driver.publication 1.188ms |
| e6eb72f3c6e8377d0000000000000159 | 24.513 | 4.346 | 0.010 | 0.000 | 0.639 | 4.177 | 1.606 | 0.095 | n/a | 2.793 | 10.778 | n/a | n/a | 0.068 | 4.996 | 0.204 | 0.068 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000144 | 23.745 | 4.462 | 0.010 | 0.000 | 0.466 | 0.898 | 5.235 | 0.323 | n/a | 0.325 | 11.989 | n/a | n/a | 0.037 | 4.938 | 0.208 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000130 | 19.732 | 3.703 | 0.005 | 0.000 | 0.265 | 0.654 | 1.500 | 0.035 | n/a | 0.559 | 12.973 | n/a | n/a | 0.038 | 3.973 | 0.201 | 0.038 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000016b | 16.162 | 4.716 | 0.006 | 0.000 | 0.563 | 3.462 | 1.183 | 0.036 | n/a | 0.468 | 5.675 | n/a | n/a | 0.054 | 5.285 | 0.327 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000015d | 15.425 | 3.347 | 0.005 | 0.000 | 0.656 | 0.830 | 5.054 | 0.060 | n/a | 0.203 | 5.230 | n/a | n/a | 0.039 | 4.009 | 0.260 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000014f | 14.298 | 5.204 | 0.011 | 0.000 | 0.996 | 1.094 | 1.185 | 0.039 | n/a | 0.434 | 5.279 | n/a | n/a | 0.056 | 6.211 | 0.434 | 0.056 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.281 | 0.507 | 0.000 | 1.269 | 4.977 | 0.183 | 0.000 | 0.145 | 1.602 | 6.385 | 0.055 | n/a | 0.154 | 12.809 | n/a | n/a | 0.058 | 5.719 | 0.209 | 0.058 |
| p99 | 81.432 | 3.863 | 0.000 | 5.629 | 12.826 | 1.495 | 0.631 | 1.158 | 5.786 | 56.832 | 0.251 | n/a | 3.384 | 55.469 | n/a | n/a | 0.183 | 14.001 | 0.453 | 0.183 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d00000000000001ba | 81.432 | 7.699 | 0.359 | 0.476 | 0.122 | 1.813 | 56.832 | 0.059 | n/a | 0.179 | 13.775 | n/a | n/a | 0.116 | 8.656 | 0.106 | 0.116 | gw-w/thread-48/gateway.admitted-work | none observed |
| e6eb72f3c6e8377d0000000000000185 | 74.355 | 5.021 | 0.008 | 0.000 | 1.158 | 1.016 | 11.466 | 0.055 | n/a | 0.105 | 55.469 | n/a | n/a | 0.056 | 6.188 | 0.083 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001a0 | 70.674 | 12.826 | 0.432 | 0.617 | 0.126 | 3.008 | 12.887 | 0.091 | n/a | 0.139 | 40.365 | n/a | n/a | 0.183 | 14.001 | 0.198 | 0.183 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000195 | 60.178 | 9.503 | 0.010 | 0.000 | 0.423 | 0.897 | 1.604 | 0.041 | n/a | 0.154 | 47.470 | n/a | n/a | 0.077 | 9.936 | 0.165 | 0.077 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001ac | 55.427 | 3.940 | 0.317 | 0.395 | 0.072 | 1.741 | 13.644 | 0.068 | n/a | 0.191 | 34.980 | n/a | n/a | 0.079 | 4.724 | 0.085 | 0.079 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000182 | 46.741 | 5.397 | 0.183 | 0.486 | 0.057 | 1.804 | 14.891 | 0.047 | n/a | 0.104 | 23.724 | n/a | n/a | 0.048 | 6.123 | 0.131 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001a2 | 45.195 | 8.544 | 0.358 | 0.446 | 0.077 | 2.134 | 13.090 | 0.122 | n/a | 0.127 | 20.228 | n/a | n/a | 0.069 | 9.425 | 0.209 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000184 | 39.460 | 6.257 | 1.495 | 0.394 | 0.129 | 1.743 | 7.793 | 0.251 | n/a | 3.264 | 18.075 | n/a | n/a | 0.058 | 8.275 | 0.210 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001b2 | 38.101 | 5.899 | 0.605 | 0.344 | 0.267 | 2.607 | 10.834 | 0.121 | n/a | 0.177 | 17.140 | n/a | n/a | 0.107 | 7.115 | 0.187 | 0.107 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001a6 | 37.174 | 6.173 | 0.355 | 0.391 | 0.152 | 2.174 | 14.608 | 0.125 | n/a | 0.965 | 12.167 | n/a | n/a | 0.064 | 7.071 | 0.190 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000198 | 36.852 | 5.101 | 0.294 | 0.239 | 0.092 | 1.602 | 16.013 | 0.086 | n/a | 0.151 | 13.217 | n/a | n/a | 0.056 | 5.726 | 0.155 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001b6 | 35.440 | 4.977 | 0.337 | 0.328 | 0.126 | 5.786 | 10.575 | 0.132 | n/a | 3.068 | 10.032 | n/a | n/a | 0.078 | 5.768 | 0.163 | 0.078 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000018a | 34.312 | 7.767 | 0.010 | 0.000 | 0.911 | 1.015 | 4.816 | 0.041 | n/a | 0.088 | 19.608 | n/a | n/a | 0.056 | 8.688 | 0.253 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001be | 33.941 | 4.018 | 0.208 | 0.000 | 0.074 | 5.553 | 10.213 | 0.048 | n/a | 0.128 | 13.650 | n/a | n/a | 0.048 | 4.301 | 0.127 | 0.048 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000194 | 33.933 | 5.749 | 0.250 | 0.378 | 0.132 | 1.676 | 8.942 | 0.057 | n/a | 0.124 | 16.567 | n/a | n/a | 0.058 | 6.510 | 0.192 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000019e | 33.895 | 5.786 | 0.235 | 0.464 | 0.086 | 1.657 | 12.090 | 0.055 | n/a | 0.154 | 13.288 | n/a | n/a | 0.079 | 6.571 | 0.194 | 0.079 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000018c | 33.638 | 4.953 | 0.407 | 0.412 | 0.140 | 2.024 | 11.726 | 0.087 | n/a | 3.384 | 10.403 | n/a | n/a | 0.101 | 5.912 | 0.176 | 0.101 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000018e | 32.667 | 6.081 | 0.358 | 0.435 | 0.087 | 4.288 | 8.092 | 0.124 | n/a | 0.581 | 12.564 | n/a | n/a | 0.058 | 6.961 | 0.213 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000017d | 32.636 | 3.982 | 0.317 | 0.239 | 0.079 | 1.749 | 16.049 | 0.106 | n/a | 0.144 | 9.931 | n/a | n/a | 0.041 | 4.616 | 0.141 | 0.041 | gw-w/thread-45/gateway.admitted-work | none observed |
| e6eb72f3c6e8377d000000000000019a | 31.281 | 4.264 | 0.390 | 0.631 | 0.120 | 1.798 | 10.693 | 0.065 | n/a | 0.445 | 12.809 | n/a | n/a | 0.064 | 5.406 | 0.173 | 0.064 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.382 | 0.923 | 0.000 | 1.570 | 3.740 | 0.006 | 0.000 | 0.543 | 0.944 | 1.323 | 0.041 | n/a | 0.140 | 7.448 | n/a | n/a | 0.056 | 4.384 | 0.253 | 0.056 |
| p99 | 34.312 | 2.046 | 0.000 | 5.629 | 7.767 | 0.010 | 0.000 | 1.127 | 1.515 | 4.816 | 0.111 | n/a | 0.880 | 19.608 | n/a | n/a | 0.113 | 8.688 | 0.347 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d000000000000018a | 34.312 | 7.767 | 0.010 | 0.000 | 0.911 | 1.015 | 4.816 | 0.041 | n/a | 0.088 | 19.608 | n/a | n/a | 0.056 | 8.688 | 0.253 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000017f | 21.979 | 3.425 | 0.007 | 0.000 | 0.837 | 0.865 | 1.262 | 0.044 | n/a | 0.220 | 15.271 | n/a | n/a | 0.046 | 4.269 | 0.194 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001bb | 21.698 | 4.948 | 0.008 | 0.000 | 0.186 | 1.515 | 1.323 | 0.046 | n/a | 0.140 | 13.442 | n/a | n/a | 0.090 | 5.142 | 0.237 | 0.090 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000017b | 20.795 | 3.541 | 0.006 | 0.000 | 0.126 | 0.714 | 1.054 | 0.036 | n/a | 0.177 | 15.094 | n/a | n/a | 0.047 | 3.673 | 0.177 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001ae | 16.222 | 4.714 | 0.005 | 0.000 | 0.659 | 1.261 | 1.853 | 0.061 | n/a | 0.149 | 7.448 | n/a | n/a | 0.074 | 5.378 | 0.332 | 0.074 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001a3 | 14.382 | 3.908 | 0.006 | 0.000 | 0.362 | 1.405 | 2.035 | 0.111 | n/a | 0.880 | 5.627 | n/a | n/a | 0.048 | 4.277 | 0.297 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001c3 | 14.338 | 3.378 | 0.006 | 0.000 | 0.145 | 0.640 | 1.505 | 0.037 | n/a | 0.102 | 8.479 | n/a | n/a | 0.046 | 3.530 | 0.246 | 0.046 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001c5 | 14.185 | 3.447 | 0.006 | 0.000 | 1.127 | 0.949 | 1.593 | 0.040 | n/a | 0.138 | 6.819 | n/a | n/a | 0.067 | 4.579 | 0.323 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000190 | 13.927 | 4.250 | 0.007 | 0.000 | 0.543 | 0.944 | 1.311 | 0.054 | n/a | 0.179 | 6.569 | n/a | n/a | 0.070 | 4.800 | 0.345 | 0.070 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000192 | 12.618 | 3.740 | 0.005 | 0.000 | 0.639 | 0.668 | 1.080 | 0.034 | n/a | 0.095 | 6.243 | n/a | n/a | 0.113 | 4.384 | 0.347 | 0.113 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.092 | 0.637 | 0.000 | 1.427 | 4.253 | 0.029 | 0.000 | 0.131 | 1.554 | 3.409 | 0.067 | n/a | 0.224 | 11.224 | n/a | n/a | 0.063 | 4.698 | 0.201 | 0.063 |
| p99 | 79.027 | 4.065 | 0.085 | 5.663 | 16.342 | 0.387 | 0.000 | 0.957 | 5.541 | 35.407 | 0.765 | n/a | 3.267 | 55.439 | n/a | n/a | 0.132 | 16.720 | 0.439 | 0.132 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d00000000000001db | 79.027 | 7.924 | 0.333 | 0.000 | 0.073 | 1.979 | 12.798 | 0.064 | n/a | 0.368 | 55.439 | n/a | n/a | 0.048 | 8.330 | 0.105 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000203 | 58.211 | 5.210 | 0.228 | 0.000 | 0.143 | 2.041 | 35.407 | 0.114 | n/a | 0.183 | 14.814 | n/a | n/a | 0.072 | 5.581 | 0.096 | 0.072 | gw-w/thread-43/gateway.admitted-work | none observed |
| e6eb72f3c6e8377d00000000000001ec | 47.535 | 16.342 | 0.029 | 0.000 | 0.349 | 5.094 | 15.195 | 0.219 | n/a | 0.817 | 9.401 | n/a | n/a | 0.090 | 16.720 | 0.352 | 0.090 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000207 | 44.935 | 4.400 | 0.305 | 0.000 | 0.110 | 2.609 | 6.237 | 0.049 | n/a | 0.118 | 31.041 | n/a | n/a | 0.067 | 4.815 | 0.107 | 0.067 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001d5 | 42.755 | 6.092 | 0.354 | 0.000 | 0.064 | 3.221 | 19.314 | 0.122 | n/a | 0.244 | 13.287 | n/a | n/a | 0.056 | 6.510 | 0.152 | 0.056 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000213 | 40.447 | 4.150 | 0.219 | 0.000 | 0.076 | 5.541 | 13.818 | 0.141 | n/a | 0.224 | 16.224 | n/a | n/a | 0.054 | 4.445 | 0.110 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000217 | 38.866 | 7.988 | 0.274 | 0.000 | 0.117 | 2.146 | 13.603 | 0.158 | n/a | 0.223 | 14.263 | n/a | n/a | 0.095 | 8.379 | 0.216 | 0.095 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001c8 | 34.902 | 4.910 | 0.255 | 0.000 | 0.167 | 2.085 | 11.794 | 0.066 | n/a | 0.096 | 15.420 | n/a | n/a | 0.108 | 5.332 | 0.153 | 0.108 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001f5 | 34.027 | 3.788 | 0.211 | 0.000 | 0.102 | 1.705 | 8.518 | 0.139 | n/a | 1.021 | 18.495 | n/a | n/a | 0.048 | 4.101 | 0.121 | 0.048 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001d7 | 32.945 | 4.127 | 0.252 | 0.000 | 0.070 | 1.445 | 11.830 | 0.046 | n/a | 2.407 | 12.719 | n/a | n/a | 0.050 | 4.449 | 0.135 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001ef | 32.814 | 4.147 | 0.259 | 0.000 | 0.120 | 1.959 | 16.671 | 0.127 | n/a | 0.620 | 8.853 | n/a | n/a | 0.058 | 4.526 | 0.138 | 0.058 | gw-w/thread-41/gateway.admitted-work | none observed |
| e6eb72f3c6e8377d00000000000001d1 | 30.490 | 5.137 | 0.005 | 0.000 | 0.031 | 0.508 | 1.421 | 0.026 | n/a | 0.073 | 23.256 | n/a | n/a | 0.032 | 5.173 | 0.170 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.988ms |
| e6eb72f3c6e8377d000000000000020d | 29.739 | 4.049 | 0.252 | 0.000 | 0.069 | 1.692 | 9.283 | 0.765 | n/a | 0.199 | 13.296 | n/a | n/a | 0.132 | 4.370 | 0.147 | 0.132 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001ff | 29.569 | 4.102 | 0.208 | 0.000 | 0.108 | 1.458 | 10.205 | 0.088 | n/a | 3.267 | 10.070 | n/a | n/a | 0.063 | 4.418 | 0.149 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001f7 | 29.110 | 4.193 | 0.237 | 0.000 | 0.073 | 2.173 | 10.997 | 0.057 | n/a | 0.114 | 11.224 | n/a | n/a | 0.043 | 4.502 | 0.155 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001ce | 26.564 | 4.152 | 0.258 | 0.000 | 0.105 | 1.882 | 7.415 | 0.117 | n/a | 0.884 | 11.672 | n/a | n/a | 0.080 | 4.515 | 0.170 | 0.080 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001eb | 26.543 | 4.094 | 0.302 | 0.000 | 0.109 | 1.522 | 10.198 | 0.094 | n/a | 0.130 | 10.024 | n/a | n/a | 0.069 | 4.505 | 0.170 | 0.069 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000020b | 25.839 | 4.124 | 0.272 | 0.000 | 0.119 | 2.011 | 7.939 | 0.085 | n/a | 0.234 | 10.976 | n/a | n/a | 0.079 | 4.514 | 0.175 | 0.079 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001d0 | 24.779 | 4.825 | 0.005 | 0.000 | 0.532 | 0.640 | 2.966 | 0.047 | n/a | 0.116 | 15.590 | n/a | n/a | 0.057 | 5.362 | 0.216 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001fb | 23.348 | 5.426 | 0.300 | 0.000 | 0.119 | 1.936 | 2.833 | 0.067 | n/a | 0.183 | 12.407 | n/a | n/a | 0.076 | 5.845 | 0.250 | 0.076 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.307 | 0.867 | 0.000 | 1.801 | 3.847 | 0.006 | 0.000 | 0.517 | 0.975 | 1.506 | 0.048 | n/a | 0.444 | 9.889 | n/a | n/a | 0.063 | 4.357 | 0.244 | 0.063 |
| p99 | 24.779 | 1.670 | 0.000 | 3.286 | 5.358 | 0.016 | 0.000 | 0.957 | 2.686 | 6.476 | 0.131 | n/a | 1.446 | 15.590 | n/a | n/a | 0.111 | 6.179 | 0.439 | 0.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d00000000000001d0 | 24.779 | 4.825 | 0.005 | 0.000 | 0.532 | 0.640 | 2.966 | 0.047 | n/a | 0.116 | 15.590 | n/a | n/a | 0.057 | 5.362 | 0.216 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000200 | 23.092 | 4.075 | 0.006 | 0.000 | 0.435 | 2.686 | 1.477 | 0.048 | n/a | 0.444 | 13.811 | n/a | n/a | 0.111 | 4.516 | 0.196 | 0.111 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001e2 | 22.196 | 2.961 | 0.006 | 0.000 | 0.517 | 0.611 | 2.458 | 0.049 | n/a | 0.121 | 15.426 | n/a | n/a | 0.048 | 3.484 | 0.157 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001d9 | 21.801 | 3.166 | 0.006 | 0.000 | 0.425 | 1.083 | 6.476 | 0.131 | n/a | 0.827 | 9.637 | n/a | n/a | 0.050 | 3.596 | 0.165 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001e7 | 20.033 | 3.769 | 0.006 | 0.000 | 0.428 | 0.659 | 1.364 | 0.036 | n/a | 0.432 | 13.296 | n/a | n/a | 0.043 | 4.203 | 0.210 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001cc | 19.397 | 5.358 | 0.013 | 0.000 | 0.807 | 1.244 | 1.506 | 0.045 | n/a | 0.587 | 9.766 | n/a | n/a | 0.072 | 6.179 | 0.319 | 0.072 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001fc | 18.796 | 4.720 | 0.013 | 0.000 | 0.647 | 0.912 | 1.142 | 0.036 | n/a | 1.354 | 9.889 | n/a | n/a | 0.083 | 5.380 | 0.286 | 0.083 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001e0 | 18.307 | 3.847 | 0.005 | 0.000 | 0.846 | 0.724 | 1.141 | 0.042 | n/a | 0.151 | 11.485 | n/a | n/a | 0.065 | 4.698 | 0.257 | 0.065 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001c9 | 17.889 | 2.907 | 0.005 | 0.000 | 0.541 | 1.006 | 1.788 | 0.075 | n/a | 0.716 | 10.809 | n/a | n/a | 0.043 | 3.453 | 0.193 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000208 | 17.304 | 3.660 | 0.008 | 0.000 | 0.210 | 1.554 | 1.708 | 0.078 | n/a | 0.627 | 9.386 | n/a | n/a | 0.074 | 3.877 | 0.224 | 0.074 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000020e | 16.958 | 4.043 | 0.011 | 0.000 | 0.303 | 0.911 | 1.099 | 0.059 | n/a | 0.118 | 10.351 | n/a | n/a | 0.063 | 4.357 | 0.257 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001f2 | 15.570 | 2.854 | 0.006 | 0.000 | 0.938 | 0.961 | 1.689 | 0.079 | n/a | 1.446 | 7.556 | n/a | n/a | 0.041 | 3.799 | 0.244 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000001e4 | 15.117 | 3.608 | 0.005 | 0.000 | 0.131 | 2.171 | 2.555 | 0.072 | n/a | 0.125 | 6.395 | n/a | n/a | 0.054 | 3.744 | 0.248 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000204 | 14.032 | 5.192 | 0.016 | 0.000 | 0.957 | 1.003 | 1.023 | 0.034 | n/a | 0.102 | 5.632 | n/a | n/a | 0.072 | 6.166 | 0.439 | 0.072 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000218 | 13.199 | 5.183 | 0.011 | 0.000 | 0.303 | 0.975 | 1.500 | 0.039 | n/a | 0.695 | 4.405 | n/a | n/a | 0.088 | 5.497 | 0.416 | 0.088 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.422 | 0.734 | 0.000 | 1.611 | 4.793 | 0.008 | 0.000 | 0.279 | 1.454 | 4.722 | 0.066 | n/a | 0.155 | 10.573 | n/a | n/a | 0.060 | 5.331 | 0.213 | 0.060 |
| p99 | 72.767 | 3.325 | 0.000 | 5.610 | 11.068 | 0.470 | 1.136 | 1.184 | 6.612 | 46.602 | 2.687 | n/a | 2.987 | 58.644 | n/a | n/a | 0.160 | 12.201 | 0.525 | 0.160 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d0000000000000264 | 72.767 | 4.348 | 0.313 | 0.303 | 0.129 | 1.885 | 6.851 | 0.064 | n/a | 0.146 | 58.644 | n/a | n/a | 0.085 | 5.092 | 0.070 | 0.085 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000024b | 66.464 | 4.135 | 0.284 | 0.000 | 0.115 | 1.564 | 46.602 | 0.124 | n/a | 0.197 | 13.354 | n/a | n/a | 0.089 | 4.535 | 0.068 | 0.089 | gw-w/thread-47/commit.prepare-and-validate | none observed |
| e6eb72f3c6e8377d000000000000023f | 47.074 | 5.670 | 0.325 | 0.000 | 0.077 | 1.807 | 20.797 | 0.158 | n/a | 0.147 | 18.032 | n/a | n/a | 0.060 | 6.072 | 0.129 | 0.060 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000275 | 42.366 | 7.405 | 0.335 | 0.000 | 0.073 | 1.975 | 17.892 | 0.085 | n/a | 0.247 | 14.299 | n/a | n/a | 0.054 | 7.813 | 0.184 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000221 | 39.590 | 3.483 | 0.006 | 0.000 | 0.551 | 0.796 | 1.219 | 0.032 | n/a | 0.075 | 33.375 | n/a | n/a | 0.054 | 4.040 | 0.102 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000021f | 39.568 | 11.068 | 0.012 | 0.000 | 1.121 | 1.337 | 9.167 | 0.102 | n/a | 0.187 | 16.489 | n/a | n/a | 0.086 | 12.201 | 0.308 | 0.086 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000027b | 37.894 | 7.590 | 0.396 | 0.000 | 0.110 | 2.345 | 16.450 | 0.136 | n/a | 0.221 | 10.573 | n/a | n/a | 0.071 | 8.096 | 0.214 | 0.071 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000023b | 37.749 | 3.902 | 0.196 | 0.000 | 0.073 | 1.365 | 13.897 | 0.042 | n/a | 0.145 | 18.083 | n/a | n/a | 0.044 | 4.171 | 0.111 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000021b | 37.324 | 4.819 | 0.288 | 0.000 | 0.098 | 1.514 | 16.315 | 0.070 | n/a | 0.410 | 13.720 | n/a | n/a | 0.088 | 5.205 | 0.139 | 0.088 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000021e | 35.918 | 7.165 | 0.419 | 0.000 | 0.109 | 2.103 | 12.431 | 0.377 | n/a | 0.277 | 12.911 | n/a | n/a | 0.125 | 7.693 | 0.214 | 0.125 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000255 | 35.504 | 3.949 | 0.319 | 0.366 | 0.073 | 1.574 | 20.767 | 0.099 | n/a | 0.121 | 8.180 | n/a | n/a | 0.055 | 4.708 | 0.133 | 0.055 | gw-w/thread-43/gateway.admitted-work | none observed |
| e6eb72f3c6e8377d000000000000022f | 34.706 | 5.054 | 0.205 | 0.000 | 0.073 | 1.528 | 13.836 | 0.046 | n/a | 0.122 | 13.793 | n/a | n/a | 0.051 | 5.331 | 0.154 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000229 | 34.688 | 6.241 | 0.470 | 0.000 | 0.108 | 2.170 | 11.256 | 0.066 | n/a | 0.090 | 14.167 | n/a | n/a | 0.120 | 6.818 | 0.197 | 0.120 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000224 | 33.809 | 6.206 | 0.008 | 0.000 | 0.244 | 1.166 | 5.993 | 0.051 | n/a | 0.114 | 19.976 | n/a | n/a | 0.051 | 6.458 | 0.191 | 0.051 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000259 | 32.458 | 4.945 | 0.329 | 0.378 | 0.123 | 2.217 | 8.135 | 0.198 | n/a | 0.867 | 15.182 | n/a | n/a | 0.085 | 5.775 | 0.178 | 0.085 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000026d | 31.328 | 7.411 | 0.279 | 1.136 | 0.153 | 1.998 | 10.493 | 0.042 | n/a | 0.107 | 9.641 | n/a | n/a | 0.068 | 8.979 | 0.287 | 0.068 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000231 | 30.734 | 4.376 | 0.246 | 0.000 | 0.122 | 1.996 | 8.888 | 0.083 | n/a | 0.130 | 14.831 | n/a | n/a | 0.063 | 4.744 | 0.154 | 0.063 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000245 | 30.695 | 3.465 | 0.005 | 0.000 | 0.799 | 0.717 | 5.996 | 2.687 | n/a | 0.112 | 16.864 | n/a | n/a | 0.050 | 4.270 | 0.139 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.366ms |
| e6eb72f3c6e8377d000000000000022c | 29.513 | 6.311 | 0.006 | 0.000 | 0.139 | 1.625 | 9.470 | 0.060 | n/a | 0.136 | 11.719 | n/a | n/a | 0.048 | 6.456 | 0.219 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000256 | 28.144 | 9.245 | 0.010 | 0.000 | 0.948 | 0.924 | 2.511 | 0.060 | n/a | 0.958 | 13.414 | n/a | n/a | 0.074 | 10.203 | 0.363 | 0.074 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.474 | 1.020 | 0.000 | 1.667 | 4.189 | 0.006 | 0.000 | 0.551 | 0.945 | 1.921 | 0.072 | n/a | 0.183 | 7.315 | n/a | n/a | 0.058 | 4.547 | 0.270 | 0.058 |
| p99 | 39.590 | 2.054 | 0.000 | 2.456 | 6.899 | 0.014 | 0.000 | 1.182 | 6.612 | 9.817 | 2.687 | n/a | 2.987 | 33.375 | n/a | n/a | 0.160 | 7.535 | 0.369 | 0.160 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d0000000000000221 | 39.590 | 3.483 | 0.006 | 0.000 | 0.551 | 0.796 | 1.219 | 0.032 | n/a | 0.075 | 33.375 | n/a | n/a | 0.054 | 4.040 | 0.102 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000245 | 30.695 | 3.465 | 0.005 | 0.000 | 0.799 | 0.717 | 5.996 | 2.687 | n/a | 0.112 | 16.864 | n/a | n/a | 0.050 | 4.270 | 0.139 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.366ms |
| e6eb72f3c6e8377d000000000000021d | 26.281 | 6.899 | 0.014 | 0.000 | 0.622 | 6.612 | 5.686 | 0.121 | n/a | 0.293 | 5.917 | n/a | n/a | 0.117 | 7.535 | 0.287 | 0.117 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000265 | 23.106 | 6.871 | 0.007 | 0.000 | 0.153 | 2.405 | 9.817 | 0.090 | n/a | 0.193 | 3.475 | n/a | n/a | 0.094 | 7.031 | 0.304 | 0.094 | gw-w/thread-41/gateway.admitted-work | none observed |
| e6eb72f3c6e8377d0000000000000226 | 22.599 | 4.005 | 0.005 | 0.000 | 0.422 | 0.907 | 2.055 | 0.074 | n/a | 0.531 | 14.543 | n/a | n/a | 0.057 | 4.432 | 0.196 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000022a | 22.286 | 3.391 | 0.007 | 0.000 | 0.949 | 0.887 | 1.921 | 0.041 | n/a | 0.126 | 14.906 | n/a | n/a | 0.058 | 4.347 | 0.195 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000261 | 21.851 | 5.399 | 0.006 | 0.000 | 0.506 | 0.970 | 1.427 | 0.042 | n/a | 0.183 | 13.227 | n/a | n/a | 0.091 | 5.911 | 0.270 | 0.091 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000025a | 20.435 | 4.189 | 0.006 | 0.000 | 1.002 | 1.039 | 4.722 | 0.076 | n/a | 0.107 | 9.243 | n/a | n/a | 0.051 | 5.197 | 0.254 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000024f | 19.474 | 4.817 | 0.007 | 0.000 | 1.182 | 1.554 | 1.825 | 2.323 | n/a | 0.373 | 7.315 | n/a | n/a | 0.077 | 6.006 | 0.308 | 0.077 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000025c | 18.627 | 4.742 | 0.007 | 0.000 | 0.731 | 1.284 | 3.488 | 0.831 | n/a | 0.682 | 6.808 | n/a | n/a | 0.053 | 5.480 | 0.294 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000023c | 17.428 | 2.632 | 0.006 | 0.000 | 1.067 | 1.708 | 3.687 | 0.072 | n/a | 0.172 | 8.044 | n/a | n/a | 0.041 | 3.705 | 0.213 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000232 | 16.893 | 3.163 | 0.006 | 0.000 | 0.306 | 1.864 | 1.843 | 0.070 | n/a | 0.733 | 8.864 | n/a | n/a | 0.044 | 3.475 | 0.206 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000272 | 16.878 | 4.545 | 0.007 | 0.000 | 0.919 | 0.945 | 1.964 | 0.101 | n/a | 2.987 | 5.316 | n/a | n/a | 0.095 | 5.471 | 0.324 | 0.095 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000026a | 14.075 | 4.766 | 0.007 | 0.000 | 0.383 | 0.699 | 1.085 | 0.036 | n/a | 0.132 | 6.870 | n/a | n/a | 0.096 | 5.157 | 0.366 | 0.096 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000027d | 13.573 | 4.261 | 0.007 | 0.000 | 0.279 | 0.723 | 1.050 | 0.039 | n/a | 1.964 | 5.090 | n/a | n/a | 0.160 | 4.547 | 0.335 | 0.160 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000279 | 11.492 | 3.807 | 0.006 | 0.000 | 0.427 | 0.573 | 1.262 | 0.042 | n/a | 0.137 | 5.168 | n/a | n/a | 0.071 | 4.240 | 0.369 | 0.071 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (46 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 64.511 | n/a | n/a | n/a | 37.695 | 11.290 | 2.133 | 0.000 | 0.345 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.112 | 60.490 | 0.978 | 2.112 |
| p99 | 272.228 | n/a | n/a | n/a | 169.371 | 188.873 | 19.003 | 0.000 | 4.117 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 109.155 | 227.590 | 1.000 | 109.155 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d0000000000000af3 | 272.228 | 169.371 | 5.383 | 19.003 | 0.000 | 1.035 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 77.436 | 193.757 | 0.712 | 77.436 | node-14/thread-3/client.reach-decode-and-cache | driver.expected-state.bind-receipt 11.464ms; driver.publication 6.714ms; driver.expected-state.bind-receipt 3.219ms; driver.publication 3.153ms; driver.publication 2.890ms |
| e6eb72f3c6e8377d0000000000000af8 | 235.902 | 38.717 | 188.873 | 0.000 | 0.000 | 0.405 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.907 | 227.590 | 0.965 | 7.907 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 3.219ms; driver.publication 3.153ms; driver.publication 2.890ms; driver.publication 2.792ms; driver.publication 2.587ms |
| e6eb72f3c6e8377d0000000000000af9 | 225.662 | 37.695 | 185.551 | 0.000 | 0.000 | 0.304 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.112 | 223.246 | 0.989 | 2.112 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.153ms; driver.publication 2.890ms; driver.publication 2.792ms; driver.publication 2.587ms; driver.publication 1.832ms |
| e6eb72f3c6e8377d0000000000001449 | 199.916 | 64.056 | 21.681 | 3.834 | 0.000 | 1.189 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 109.155 | 89.572 | 0.448 | 109.155 | node-14/thread-3/socket.wait-first-byte | driver.publication 3.370ms; client.encode 3.044ms; driver.publication 3.033ms; driver.publication 2.725ms; driver.expected-state.bind-receipt 2.175ms |
| e6eb72f3c6e8377d0000000000001450 | 191.193 | 66.276 | 119.292 | 2.867 | 0.000 | 0.345 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.413 | 188.435 | 0.986 | 2.413 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.156ms; driver.publication 3.033ms; driver.publication 2.725ms; driver.publication 1.944ms; driver.publication 1.385ms |
| e6eb72f3c6e8377d0000000000001261 | 155.413 | 54.667 | 2.780 | 1.371 | 0.000 | 0.783 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 95.812 | 58.817 | 0.378 | 95.812 | node-14/thread-3/socket.wait-first-byte | driver.publication 4.868ms; driver.publication 1.860ms; driver.publication 1.807ms; driver.publication 1.762ms; driver.publication 1.592ms |
| e6eb72f3c6e8377d000000000000144a | 147.784 | 112.316 | 21.717 | 8.171 | 0.000 | 0.734 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.846 | 142.204 | 0.962 | 4.846 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 3.370ms; client.encode 3.044ms; driver.publication 2.725ms; driver.expected-state.bind-receipt 2.175ms; driver.publication 1.944ms |
| e6eb72f3c6e8377d000000000000125e | 141.712 | 95.119 | 2.479 | 7.953 | 0.000 | 1.433 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.729 | 105.551 | 0.745 | 34.729 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 4.868ms; driver.publication 1.860ms; driver.publication 1.807ms; driver.publication 1.524ms; driver.publication 1.335ms |
| e6eb72f3c6e8377d0000000000001025 | 126.529 | 82.352 | 0.374 | 17.816 | 0.000 | 0.650 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.337 | 100.542 | 0.795 | 25.337 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.578ms; driver.publication 1.348ms; driver.publication 1.294ms; driver.publication 1.165ms; driver.publication 1.087ms |
| e6eb72f3c6e8377d0000000000001ce8 | 125.086 | 94.580 | 3.512 | 10.279 | 0.000 | 0.701 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.014 | 108.372 | 0.866 | 16.014 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.193ms; driver.publication 1.143ms |
| e6eb72f3c6e8377d0000000000000af2 | 105.025 | 76.880 | 13.364 | 1.273 | 0.000 | 1.750 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.758 | 91.517 | 0.871 | 11.758 | node-14/thread-3/client.reach-decode-and-cache | driver.expected-state.bind-receipt 11.464ms; driver.publication 6.714ms; driver.expected-state.bind-receipt 3.219ms; driver.publication 1.838ms; driver.publication 1.415ms |
| e6eb72f3c6e8377d000000000000089f | 94.227 | 25.385 | 0.958 | 2.368 | 0.000 | 0.695 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 64.821 | 28.710 | 0.305 | 64.821 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.109ms; driver.publication 1.072ms; driver.publication 1.010ms; driver.publication 1.006ms |
| e6eb72f3c6e8377d000000000000025d | 87.458 | 43.928 | 1.640 | 6.730 | 0.000 | 1.967 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.192 | 52.299 | 0.598 | 33.192 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.277ms |
| e6eb72f3c6e8377d00000000000014f7 | 86.675 | 40.491 | 26.564 | 10.414 | 0.000 | 0.662 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.545 | 77.469 | 0.894 | 8.545 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.683ms; driver.expected-state.bind-receipt 1.659ms; driver.publication 1.547ms; driver.expected-state.bind-receipt 1.413ms; driver.publication 1.395ms |
| e6eb72f3c6e8377d000000000000105a | 85.077 | 65.197 | 1.649 | 8.375 | 0.000 | 0.896 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.960 | 75.221 | 0.884 | 8.960 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 9.168ms; driver.publication 3.994ms; driver.publication 3.910ms; driver.publication 2.344ms; driver.publication 1.586ms |
| e6eb72f3c6e8377d000000000000105c | 79.651 | 14.636 | 63.300 | 0.000 | 0.000 | 0.429 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.285 | 77.937 | 0.978 | 1.285 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 9.168ms; driver.publication 3.994ms; driver.publication 3.910ms; driver.publication 1.586ms; driver.publication 1.552ms |
| e6eb72f3c6e8377d0000000000001183 | 78.407 | 32.931 | 43.450 | 2.015 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 78.396 | 1.000 | 0.010 | node-14/thread-0/rpc.replica.observe | driver.expected-state.bind-receipt 2.955ms; driver.publication 2.297ms; driver.publication 1.661ms; driver.publication 1.409ms |
| e6eb72f3c6e8377d0000000000001184 | 76.724 | 32.906 | 41.790 | 2.015 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 76.712 | 1.000 | 0.012 | node-14/thread-0/rpc.replica.observe | driver.expected-state.bind-receipt 2.955ms; driver.publication 2.297ms; driver.publication 1.661ms; driver.publication 1.409ms |
| e6eb72f3c6e8377d00000000000017c0 | 69.562 | 55.014 | 0.568 | 4.908 | 0.000 | 0.938 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.135 | 60.490 | 0.870 | 8.135 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.160ms; driver.publication 1.113ms |
| e6eb72f3c6e8377d00000000000008a1 | 69.347 | 44.367 | 0.901 | 6.625 | 0.000 | 1.432 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.021 | 51.893 | 0.748 | 16.021 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.109ms; driver.publication 1.006ms |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.808 | 0.609 | 0.000 | 1.345 | 4.365 | 0.013 | 0.000 | 0.146 | 1.511 | 3.800 | 0.050 | n/a | 0.152 | 9.690 | n/a | n/a | 0.058 | 5.041 | 0.261 | 0.058 |
| p99 | 63.067 | 3.040 | 0.005 | 3.207 | 8.606 | n/a | 0.000 | 1.966 | 9.581 | 47.568 | 1.423 | n/a | 1.497 | 48.213 | n/a | n/a | 0.108 | 9.664 | 0.528 | 0.108 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d00000000000002a2 | 63.067 | 4.854 | 0.275 | 0.000 | 0.115 | 1.567 | 7.853 | 0.046 | n/a | 0.079 | 48.213 | n/a | n/a | 0.065 | 5.245 | 0.083 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000289 | 62.427 | 3.855 | 0.329 | 0.000 | 0.057 | 1.539 | 47.568 | 0.050 | n/a | 0.305 | 8.684 | n/a | n/a | 0.041 | 4.241 | 0.068 | 0.041 | gw-w/thread-47/gateway.admitted-work | none observed |
| e6eb72f3c6e8377d00000000000002be | 57.629 | 5.339 | 0.346 | 0.000 | 0.120 | 3.210 | 39.071 | 0.054 | n/a | 0.128 | 9.254 | n/a | n/a | 0.108 | 5.805 | 0.101 | 0.108 | gw-w/thread-43/gateway.admitted-work | none observed |
| e6eb72f3c6e8377d000000000000027f | 44.542 | 4.631 | 0.218 | 0.000 | 0.042 | 2.589 | 9.306 | 0.135 | n/a | 0.307 | 27.264 | n/a | n/a | 0.050 | 4.890 | 0.110 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000028e | 44.262 | 6.307 | 0.009 | 0.000 | 0.470 | 2.258 | 3.980 | 0.054 | n/a | 0.068 | 31.045 | n/a | n/a | 0.072 | 6.785 | 0.153 | 0.072 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000002aa | 31.209 | 3.909 | 0.272 | 0.000 | 0.087 | 1.115 | 9.750 | 0.040 | n/a | 0.066 | 15.919 | n/a | n/a | 0.051 | 4.268 | 0.137 | 0.051 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000002a6 | 30.412 | 3.704 | 0.212 | 0.000 | 0.111 | 1.318 | 10.982 | 1.423 | n/a | 0.585 | 12.016 | n/a | n/a | 0.061 | 4.027 | 0.132 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000002d3 | 29.422 | 5.329 | 0.332 | 0.000 | 0.124 | 1.703 | 6.396 | 0.068 | n/a | 0.203 | 15.205 | n/a | n/a | 0.063 | 5.785 | 0.197 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000002b0 | 29.369 | 4.455 | 0.320 | 0.000 | 0.138 | 2.084 | 8.392 | 0.127 | n/a | 0.230 | 13.544 | n/a | n/a | 0.077 | 4.914 | 0.167 | 0.077 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000290 | 28.800 | 3.939 | 0.202 | 0.000 | 0.075 | 2.053 | 9.408 | 0.053 | n/a | 0.154 | 12.868 | n/a | n/a | 0.047 | 4.216 | 0.146 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000002c8 | 28.287 | 4.605 | 0.383 | 0.000 | 0.113 | 1.511 | 9.151 | 0.042 | n/a | 0.447 | 11.962 | n/a | n/a | 0.073 | 5.101 | 0.180 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000002cd | 28.086 | 4.164 | 0.295 | 0.000 | 0.131 | 3.692 | 8.068 | 0.055 | n/a | 0.364 | 11.235 | n/a | n/a | 0.083 | 4.590 | 0.163 | 0.083 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000002b2 | 27.747 | 4.094 | 3.168 | 0.000 | 0.146 | 1.779 | 7.433 | 0.075 | n/a | 0.572 | 10.397 | n/a | n/a | 0.083 | 7.408 | 0.267 | 0.083 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000298 | 27.282 | 4.900 | 0.366 | 0.000 | 0.095 | 1.595 | 6.547 | 0.046 | n/a | 0.123 | 13.511 | n/a | n/a | 0.099 | 5.361 | 0.197 | 0.099 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000296 | 26.660 | 5.048 | 0.306 | 0.000 | 0.079 | 1.980 | 7.893 | 0.088 | n/a | 0.139 | 11.082 | n/a | n/a | 0.044 | 5.434 | 0.204 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000029e | 24.520 | 5.993 | 0.282 | 0.000 | 0.121 | 2.231 | 5.448 | 0.071 | n/a | 0.625 | 9.690 | n/a | n/a | 0.060 | 6.395 | 0.261 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000285 | 23.737 | 4.728 | 0.345 | 0.000 | 0.139 | 1.623 | 6.803 | 0.050 | n/a | 0.105 | 9.867 | n/a | n/a | 0.077 | 5.212 | 0.220 | 0.077 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000002ba | 23.562 | 4.269 | 0.284 | 0.000 | 0.079 | 1.768 | 7.702 | 0.052 | n/a | 0.147 | 9.212 | n/a | n/a | 0.049 | 4.632 | 0.197 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000028b | 23.510 | 5.650 | 0.006 | 0.000 | 0.973 | 0.800 | 1.574 | 0.048 | n/a | 0.437 | 13.952 | n/a | n/a | 0.070 | 6.629 | 0.282 | 0.070 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000287 | 23.296 | 4.164 | 0.011 | 0.000 | 1.966 | 2.599 | 1.124 | 0.043 | n/a | 0.169 | 13.177 | n/a | n/a | 0.043 | 6.141 | 0.264 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.147 | 0.658 | 0.000 | 1.769 | 3.951 | 0.006 | 0.000 | 0.494 | 0.823 | 1.360 | 0.038 | n/a | 0.129 | 7.830 | n/a | n/a | 0.058 | 4.619 | 0.285 | 0.058 |
| p99 | 22.477 | 2.257 | 0.000 | 2.813 | 5.376 | n/a | 0.000 | 1.149 | 9.581 | 9.586 | 0.082 | n/a | 1.497 | 12.391 | n/a | n/a | 0.090 | 6.002 | 0.393 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d00000000000002ca | 22.477 | 2.531 | n/a | 0.000 | 0.630 | 9.581 | 9.586 | 0.018 | n/a | 0.041 | 0.000 | n/a | n/a | 0.090 | 3.161 | 0.141 | 0.090 | node-14/thread-0/socket.wait-first-byte | none observed |
| e6eb72f3c6e8377d00000000000002c5 | 20.551 | 5.376 | 0.013 | 0.000 | 0.314 | 0.886 | 1.065 | 0.037 | n/a | 0.381 | 12.391 | n/a | n/a | 0.088 | 5.703 | 0.277 | 0.088 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000002bf | 19.168 | 4.844 | 0.009 | 0.000 | 1.149 | 0.853 | 1.336 | 0.038 | n/a | 0.077 | 10.798 | n/a | n/a | 0.065 | 6.002 | 0.313 | 0.065 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000299 | 18.356 | 4.125 | 0.006 | 0.000 | 0.794 | 0.683 | 1.360 | 0.042 | n/a | 0.072 | 11.226 | n/a | n/a | 0.046 | 4.926 | 0.268 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000280 | 16.928 | 4.365 | 0.007 | 0.000 | 0.446 | 1.887 | 1.705 | 0.064 | n/a | 0.152 | 8.248 | n/a | n/a | 0.053 | 4.819 | 0.285 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000282 | 16.903 | 4.640 | 0.006 | 0.000 | 1.059 | 0.709 | 1.372 | 0.036 | n/a | 0.113 | 8.911 | n/a | n/a | 0.058 | 5.705 | 0.337 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000002a0 | 16.243 | 3.566 | 0.006 | 0.000 | 0.494 | 0.638 | 1.114 | 0.052 | n/a | 0.414 | 9.899 | n/a | n/a | 0.060 | 4.066 | 0.250 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000002b8 | 16.147 | 4.235 | 0.008 | 0.000 | 0.476 | 1.001 | 1.758 | 0.082 | n/a | 0.684 | 7.830 | n/a | n/a | 0.073 | 4.719 | 0.292 | 0.073 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000002b4 | 16.046 | 3.771 | 0.006 | 0.000 | 0.310 | 0.902 | 3.800 | 0.038 | n/a | 0.129 | 7.043 | n/a | n/a | 0.048 | 4.087 | 0.255 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000002bb | 15.536 | 4.341 | 0.007 | 0.000 | 1.034 | 0.758 | 1.187 | 0.038 | n/a | 0.104 | 8.005 | n/a | n/a | 0.063 | 5.382 | 0.346 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000002c3 | 12.512 | 2.733 | 0.005 | 0.000 | 0.482 | 0.429 | 1.104 | 0.033 | n/a | 1.497 | 6.189 | n/a | n/a | 0.040 | 3.220 | 0.257 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d000000000000029b | 12.474 | 3.156 | 0.006 | 0.000 | 0.169 | 1.486 | 1.456 | 0.054 | n/a | 0.510 | 5.584 | n/a | n/a | 0.053 | 3.331 | 0.267 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000002a3 | 11.946 | 3.951 | 0.006 | 0.000 | 0.662 | 0.607 | 1.333 | 0.035 | n/a | 0.076 | 5.215 | n/a | n/a | 0.061 | 4.619 | 0.387 | 0.061 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d0000000000000291 | 11.787 | 3.442 | 0.006 | 0.000 | 0.290 | 0.823 | 1.493 | 0.048 | n/a | 0.181 | 5.452 | n/a | n/a | 0.052 | 3.739 | 0.317 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e6eb72f3c6e8377d00000000000002ab | 11.107 | 3.473 | 0.006 | 0.000 | 0.885 | 0.789 | 0.947 | 0.034 | n/a | 0.092 | 4.833 | n/a | n/a | 0.051 | 4.364 | 0.393 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.790 | 0.000 | 0.000 | 0.295 | 4.733 | 0.307 | 0.000 | 0.022 | 1.717 | 4.439 | 0.041 | n/a | 0.443 | 8.903 | n/a | n/a | 0.033 | 5.185 | 0.159 | 0.033 |
| p99 | 42.168 | 0.236 | 0.000 | 0.514 | 4.775 | 1.949 | 0.000 | 0.103 | 2.501 | 16.085 | 0.072 | n/a | 0.732 | 16.041 | n/a | n/a | 0.063 | 6.705 | 0.249 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d0000000000000962 | 42.168 | 4.733 | 1.949 | 0.000 | 0.022 | 2.501 | 16.085 | 0.072 | n/a | 0.732 | 16.041 | n/a | n/a | 0.033 | 6.705 | 0.159 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.562ms |
| e6eb72f3c6e8377d00000000000002d5 | 20.790 | 4.775 | 0.307 | 0.000 | 0.103 | 1.717 | 4.439 | 0.041 | n/a | 0.443 | 8.903 | n/a | n/a | 0.063 | 5.185 | 0.249 | 0.063 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (845 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.622 | 0.768 | 0.000 | 1.629 | 3.622 | 0.005 | 0.000 | 0.781 | 0.825 | 1.295 | 0.036 | n/a | 0.172 | 7.196 | n/a | n/a | 0.040 | 4.667 | 0.310 | 0.040 |
| p99 | 101.342 | 3.142 | 1.566 | 5.111 | 11.505 | 2.931 | 0.000 | 26.739 | 13.415 | 13.801 | 4.784 | n/a | 3.843 | 61.118 | n/a | n/a | 0.109 | 32.716 | 0.718 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d0000000000000368 | 224.899 | 2.352 | 0.004 | 0.000 | 197.317 | 6.396 | 1.280 | 0.027 | n/a | 0.321 | 17.175 | n/a | n/a | 0.027 | 199.673 | 0.888 | 0.027 | node-14/thread-0/driver.queue.subject | driver.publication 2.636ms; driver.publication 1.603ms; driver.publication 1.481ms; driver.publication 1.351ms; driver.publication 1.270ms |
| e6eb72f3c6e8377d0000000000000366 | 199.016 | 2.898 | 0.006 | 0.000 | 137.041 | 7.104 | 0.951 | 0.036 | n/a | 0.078 | 50.874 | n/a | n/a | 0.028 | 139.944 | 0.703 | 0.028 | node-14/thread-0/driver.queue.subject | driver.publication 1.603ms; driver.publication 1.481ms; driver.publication 1.351ms; driver.publication 1.270ms; driver.publication 1.225ms |
| e6eb72f3c6e8377d000000000000035f | 171.171 | 3.426 | 0.004 | 0.000 | 61.348 | 3.792 | 1.085 | 0.052 | n/a | 2.065 | 99.361 | n/a | n/a | 0.040 | 64.778 | 0.378 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.603ms; driver.publication 1.481ms; driver.publication 1.454ms; driver.publication 1.270ms; driver.expected-state.bind-receipt 1.198ms |
| e6eb72f3c6e8377d0000000000000372 | 152.129 | 2.327 | 0.004 | 0.000 | 141.492 | 1.628 | 1.315 | 0.068 | n/a | 0.118 | 5.117 | n/a | n/a | 0.060 | 143.823 | 0.945 | 0.060 | node-14/thread-0/driver.queue.subject | driver.publication 2.636ms; driver.publication 1.603ms; driver.publication 1.351ms; driver.publication 1.225ms; driver.publication 1.073ms |
| e6eb72f3c6e8377d000000000000036e | 134.032 | 4.261 | 0.006 | 0.000 | 1.028 | 2.745 | 10.704 | 0.042 | n/a | 0.092 | 115.095 | n/a | n/a | 0.059 | 5.295 | 0.040 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.603ms; driver.publication 1.481ms; driver.publication 1.351ms; driver.publication 1.225ms; driver.publication 1.170ms |
| e6eb72f3c6e8377d000000000000036a | 123.709 | 4.247 | 0.005 | 0.000 | 0.310 | 0.630 | 1.050 | 0.041 | n/a | 0.111 | 117.268 | n/a | n/a | 0.048 | 4.562 | 0.037 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.481ms; driver.publication 1.270ms; driver.publication 1.170ms; driver.publication 1.053ms; driver.publication 1.044ms |
| e6eb72f3c6e8377d0000000000000373 | 116.801 | 4.880 | 5.944 | 0.000 | 0.078 | 2.025 | 66.741 | 0.047 | n/a | 0.089 | 36.954 | n/a | n/a | 0.042 | 10.902 | 0.093 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.636ms; driver.publication 1.603ms; driver.publication 1.351ms; driver.publication 1.225ms; driver.publication 1.073ms |
| e6eb72f3c6e8377d0000000000000371 | 113.922 | 3.821 | 0.004 | 0.000 | 0.927 | 5.033 | 1.492 | 0.034 | n/a | 0.176 | 102.406 | n/a | n/a | 0.029 | 4.752 | 0.042 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.603ms; driver.publication 1.225ms; driver.publication 0.459ms |
| e6eb72f3c6e8377d0000000000000363 | 101.342 | 4.277 | 0.118 | 0.000 | 1.730 | 8.826 | 1.309 | 3.490 | n/a | 0.027 | 81.536 | n/a | n/a | 0.029 | 6.126 | 0.060 | 0.029 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 1.454ms; driver.publication 1.270ms; driver.publication 1.170ms; driver.publication 1.066ms; driver.publication 1.053ms |
| e6eb72f3c6e8377d0000000000000466 | 101.156 | 6.126 | 0.008 | 0.000 | 1.672 | 15.585 | 10.111 | 3.926 | n/a | 3.502 | 60.198 | n/a | n/a | 0.030 | 7.805 | 0.077 | 0.030 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 1.592ms; driver.publication 1.524ms; driver.publication 1.381ms; driver.publication 1.170ms |
| e6eb72f3c6e8377d0000000000000362 | 99.285 | 4.237 | 0.010 | 0.000 | 1.509 | 2.362 | 4.256 | 5.660 | n/a | 0.145 | 81.055 | n/a | n/a | 0.050 | 5.757 | 0.058 | 0.050 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.454ms; driver.publication 1.270ms; driver.publication 1.066ms; driver.publication 1.053ms; driver.publication 1.044ms |
| e6eb72f3c6e8377d000000000000035b | 98.596 | 4.264 | 0.005 | 0.000 | 33.623 | 0.694 | 8.862 | 0.043 | n/a | 7.353 | 43.723 | n/a | n/a | 0.030 | 37.892 | 0.384 | 0.030 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 1.454ms; driver.publication 1.315ms; driver.expected-state.bind-receipt 1.198ms; driver.publication 1.135ms; driver.publication 1.066ms |
| e6eb72f3c6e8377d0000000000000378 | 90.491 | 3.609 | 0.005 | 0.000 | 70.628 | 0.605 | 1.227 | 0.035 | n/a | 0.201 | 14.138 | n/a | n/a | 0.043 | 74.242 | 0.820 | 0.043 | node-14/thread-0/driver.queue.subject | driver.publication 2.636ms; driver.publication 1.351ms; driver.publication 1.073ms; driver.publication 1.066ms; driver.publication 1.037ms |
| e6eb72f3c6e8377d0000000000000374 | 83.529 | 4.780 | 0.013 | 0.000 | 1.210 | 8.910 | 0.928 | 0.040 | n/a | 0.084 | 67.498 | n/a | n/a | 0.065 | 6.003 | 0.072 | 0.065 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.603ms; driver.publication 1.351ms; driver.publication 1.225ms; driver.publication 1.073ms |
| e6eb72f3c6e8377d0000000000000356 | 78.398 | 5.679 | 0.009 | 0.000 | 0.816 | 3.388 | 8.015 | 0.083 | n/a | 0.486 | 59.882 | n/a | n/a | 0.041 | 6.504 | 0.083 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.315ms; driver.publication 1.290ms; driver.expected-state.bind-receipt 1.198ms; driver.publication 1.135ms; driver.publication 1.020ms |
| e6eb72f3c6e8377d0000000000000377 | 78.359 | 2.600 | 0.004 | 0.000 | 68.230 | 0.479 | 1.897 | 0.039 | n/a | 0.095 | 4.987 | n/a | n/a | 0.027 | 70.834 | 0.904 | 0.027 | node-14/thread-0/driver.queue.subject | driver.publication 2.636ms; driver.publication 1.351ms; driver.publication 1.073ms; driver.publication 1.066ms; driver.publication 1.037ms |
| e6eb72f3c6e8377d0000000000000354 | 78.179 | 6.270 | 0.009 | 0.000 | 0.406 | 13.662 | 4.269 | 0.035 | n/a | 0.247 | 53.221 | n/a | n/a | 0.061 | 6.685 | 0.086 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 4.029ms; driver.publication 1.315ms; driver.publication 1.290ms; driver.publication 1.020ms |
| e6eb72f3c6e8377d0000000000000353 | 75.910 | 3.010 | 0.006 | 0.000 | 1.008 | 0.580 | 5.775 | 0.055 | n/a | 1.003 | 64.432 | n/a | n/a | 0.041 | 4.024 | 0.053 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 4.029ms; driver.publication 1.315ms; driver.publication 1.290ms |
| e6eb72f3c6e8377d0000000000000351 | 73.483 | 5.463 | 0.007 | 0.000 | 0.643 | 1.128 | 4.801 | 0.083 | n/a | 0.189 | 61.118 | n/a | n/a | 0.050 | 6.113 | 0.083 | 0.050 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 4.029ms; driver.publication 1.546ms; driver.publication 1.290ms |
| e6eb72f3c6e8377d000000000000035a | 71.425 | 8.459 | 0.318 | 0.000 | 2.473 | 10.135 | 2.319 | 0.110 | n/a | 0.127 | 47.455 | n/a | n/a | 0.028 | 11.251 | 0.158 | 0.028 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.454ms; driver.publication 1.315ms; driver.expected-state.bind-receipt 1.198ms; driver.publication 1.135ms; driver.publication 1.066ms |

## P2 / L1024 / commit / 5-10 facts (491 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.026 | 0.640 | 0.000 | 1.482 | 3.213 | 0.005 | 0.000 | 0.801 | 0.798 | 1.107 | 0.034 | n/a | 0.164 | 6.710 | n/a | n/a | 0.039 | 4.140 | 0.303 | 0.039 |
| p99 | 101.156 | 2.158 | 0.781 | 4.302 | 11.231 | 0.227 | 0.000 | 24.658 | 13.415 | 7.920 | 5.660 | n/a | 3.621 | 60.198 | n/a | n/a | 0.118 | 28.507 | 0.771 | 0.118 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d0000000000000368 | 224.899 | 2.352 | 0.004 | 0.000 | 197.317 | 6.396 | 1.280 | 0.027 | n/a | 0.321 | 17.175 | n/a | n/a | 0.027 | 199.673 | 0.888 | 0.027 | node-14/thread-0/driver.queue.subject | driver.publication 2.636ms; driver.publication 1.603ms; driver.publication 1.481ms; driver.publication 1.351ms; driver.publication 1.270ms |
| e6eb72f3c6e8377d0000000000000372 | 152.129 | 2.327 | 0.004 | 0.000 | 141.492 | 1.628 | 1.315 | 0.068 | n/a | 0.118 | 5.117 | n/a | n/a | 0.060 | 143.823 | 0.945 | 0.060 | node-14/thread-0/driver.queue.subject | driver.publication 2.636ms; driver.publication 1.603ms; driver.publication 1.351ms; driver.publication 1.225ms; driver.publication 1.073ms |
| e6eb72f3c6e8377d000000000000036a | 123.709 | 4.247 | 0.005 | 0.000 | 0.310 | 0.630 | 1.050 | 0.041 | n/a | 0.111 | 117.268 | n/a | n/a | 0.048 | 4.562 | 0.037 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.481ms; driver.publication 1.270ms; driver.publication 1.170ms; driver.publication 1.053ms; driver.publication 1.044ms |
| e6eb72f3c6e8377d0000000000000363 | 101.342 | 4.277 | 0.118 | 0.000 | 1.730 | 8.826 | 1.309 | 3.490 | n/a | 0.027 | 81.536 | n/a | n/a | 0.029 | 6.126 | 0.060 | 0.029 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 1.454ms; driver.publication 1.270ms; driver.publication 1.170ms; driver.publication 1.066ms; driver.publication 1.053ms |
| e6eb72f3c6e8377d0000000000000466 | 101.156 | 6.126 | 0.008 | 0.000 | 1.672 | 15.585 | 10.111 | 3.926 | n/a | 3.502 | 60.198 | n/a | n/a | 0.030 | 7.805 | 0.077 | 0.030 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 1.592ms; driver.publication 1.524ms; driver.publication 1.381ms; driver.publication 1.170ms |
| e6eb72f3c6e8377d0000000000000362 | 99.285 | 4.237 | 0.010 | 0.000 | 1.509 | 2.362 | 4.256 | 5.660 | n/a | 0.145 | 81.055 | n/a | n/a | 0.050 | 5.757 | 0.058 | 0.050 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.454ms; driver.publication 1.270ms; driver.publication 1.066ms; driver.publication 1.053ms; driver.publication 1.044ms |
| e6eb72f3c6e8377d0000000000000356 | 78.398 | 5.679 | 0.009 | 0.000 | 0.816 | 3.388 | 8.015 | 0.083 | n/a | 0.486 | 59.882 | n/a | n/a | 0.041 | 6.504 | 0.083 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.315ms; driver.publication 1.290ms; driver.expected-state.bind-receipt 1.198ms; driver.publication 1.135ms; driver.publication 1.020ms |
| e6eb72f3c6e8377d0000000000000353 | 75.910 | 3.010 | 0.006 | 0.000 | 1.008 | 0.580 | 5.775 | 0.055 | n/a | 1.003 | 64.432 | n/a | n/a | 0.041 | 4.024 | 0.053 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 4.029ms; driver.publication 1.315ms; driver.publication 1.290ms |
| e6eb72f3c6e8377d0000000000000357 | 68.756 | 4.260 | 0.012 | 0.000 | 0.194 | 4.048 | 1.107 | 0.454 | n/a | 0.092 | 58.520 | n/a | n/a | 0.069 | 4.466 | 0.065 | 0.069 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.454ms; driver.publication 1.315ms; driver.publication 1.290ms; driver.expected-state.bind-receipt 1.198ms; driver.publication 1.135ms |
| e6eb72f3c6e8377d0000000000000463 | 67.837 | 3.126 | 0.005 | 0.000 | 14.838 | 4.821 | 1.137 | 4.657 | n/a | 0.119 | 39.105 | n/a | n/a | 0.029 | 17.969 | 0.265 | 0.029 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 1.592ms; driver.publication 1.524ms; driver.publication 1.381ms |
| e6eb72f3c6e8377d00000000000002dd | 67.192 | 14.363 | 0.021 | 0.000 | 0.469 | 11.016 | 18.350 | 10.973 | n/a | 1.624 | 10.300 | n/a | n/a | 0.075 | 14.853 | 0.221 | 0.075 | gw-w/thread-45/gateway.admission-wait | none observed |
| e6eb72f3c6e8377d0000000000000359 | 65.809 | 4.831 | 0.015 | 0.000 | 2.101 | 2.998 | 0.968 | 0.035 | n/a | 6.506 | 48.319 | n/a | n/a | 0.035 | 6.948 | 0.106 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.454ms; driver.publication 1.315ms; driver.expected-state.bind-receipt 1.198ms; driver.publication 1.135ms; driver.publication 1.020ms |
| e6eb72f3c6e8377d000000000000035e | 63.985 | 2.484 | 0.006 | 0.000 | 0.356 | 6.251 | 3.115 | 6.162 | n/a | 0.148 | 45.425 | n/a | n/a | 0.037 | 2.846 | 0.044 | 0.037 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.454ms; driver.expected-state.bind-receipt 1.198ms; driver.publication 1.135ms; driver.publication 1.066ms; driver.publication 1.053ms |
| e6eb72f3c6e8377d0000000000000350 | 62.205 | 3.502 | 0.004 | 0.000 | 0.411 | 0.602 | 1.066 | 0.029 | n/a | 0.478 | 56.067 | n/a | n/a | 0.047 | 3.916 | 0.063 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 4.029ms; driver.publication 1.546ms |
| e6eb72f3c6e8377d00000000000005c9 | 58.228 | 3.312 | 0.003 | 0.000 | 27.018 | 8.810 | 5.798 | 0.019 | n/a | 0.085 | 13.149 | n/a | n/a | 0.035 | 30.332 | 0.521 | 0.035 | node-14/thread-0/driver.queue.subject | client.encode 2.537ms; driver.publication 1.977ms; driver.publication 1.583ms; driver.publication 1.448ms; driver.publication 1.382ms |
| e6eb72f3c6e8377d0000000000000812 | 52.370 | 3.983 | 0.009 | 0.000 | 22.316 | 13.923 | 1.508 | 0.047 | n/a | 0.085 | 10.441 | n/a | n/a | 0.058 | 26.308 | 0.502 | 0.058 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.769ms; client.encode 1.608ms; driver.publication 1.370ms; driver.publication 1.233ms; driver.publication 1.101ms |
| e6eb72f3c6e8377d00000000000003bb | 50.928 | 2.809 | 0.003 | 0.000 | 0.465 | 0.498 | 3.377 | 0.029 | n/a | 1.489 | 42.223 | n/a | n/a | 0.035 | 3.278 | 0.064 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.407ms; driver.publication 1.107ms |
| e6eb72f3c6e8377d0000000000000379 | 48.225 | 2.454 | 0.004 | 0.000 | 20.318 | 7.695 | 1.598 | 0.073 | n/a | 1.446 | 14.597 | n/a | n/a | 0.039 | 22.776 | 0.472 | 0.039 | node-14/thread-0/driver.queue.subject | driver.publication 2.636ms; driver.publication 1.351ms; driver.publication 1.073ms; driver.publication 1.037ms |
| e6eb72f3c6e8377d00000000000004a1 | 44.688 | 7.320 | 0.014 | 0.000 | 5.690 | 10.211 | 2.011 | 0.043 | n/a | 0.306 | 19.018 | n/a | n/a | 0.075 | 13.024 | 0.291 | 0.075 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 4.323ms; driver.publication 2.300ms; driver.publication 1.492ms; driver.publication 1.063ms |
| e6eb72f3c6e8377d000000000000040b | 43.284 | 3.841 | 0.008 | 0.000 | 24.658 | 5.135 | 0.946 | 0.052 | n/a | 0.158 | 8.432 | n/a | n/a | 0.055 | 28.507 | 0.659 | 0.055 | node-14/thread-0/driver.queue.subject | driver.publication 1.656ms; driver.publication 1.565ms; driver.expected-state.bind-receipt 1.483ms; driver.publication 1.310ms; driver.publication 1.299ms |

## P2 / tail / commit (2622 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.667 | 0.805 | 0.000 | 1.661 | 3.770 | 0.005 | 0.000 | 0.759 | 0.810 | 1.181 | 0.029 | n/a | 0.122 | 5.703 | n/a | n/a | 0.037 | 4.835 | 0.353 | 0.037 |
| p99 | 103.691 | 3.460 | 2.565 | 7.620 | 15.216 | 1.489 | 0.000 | 33.863 | 22.131 | 12.361 | 2.943 | n/a | 3.534 | 51.227 | n/a | n/a | 0.132 | 45.020 | 0.752 | 0.132 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d00000000000011d3 | 373.391 | 33.029 | 3.672 | 0.000 | 7.382 | 73.850 | 17.016 | 19.696 | n/a | 0.115 | 218.595 | n/a | n/a | 0.034 | 44.083 | 0.118 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 57.755ms; driver.publication 11.911ms; driver.publication 7.830ms; client.encode 5.685ms; driver.publication 4.866ms |
| e6eb72f3c6e8377d00000000000011cf | 369.982 | 47.222 | 0.023 | 0.000 | 4.422 | 195.947 | 8.294 | 0.145 | n/a | 4.109 | 109.735 | n/a | n/a | 0.084 | 51.667 | 0.140 | 0.084 | node-14/thread-0/socket.wait-first-byte | driver.publication 57.755ms; driver.publication 19.134ms; driver.publication 7.830ms; client.encode 5.685ms; driver.publication 3.752ms |
| e6eb72f3c6e8377d00000000000011d5 | 250.138 | 12.784 | 0.019 | 0.000 | 91.707 | 24.142 | 25.618 | 0.073 | n/a | 0.470 | 95.278 | n/a | n/a | 0.047 | 104.510 | 0.418 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 57.755ms; driver.publication 11.911ms; driver.publication 7.830ms; client.encode 5.685ms; driver.publication 3.752ms |
| e6eb72f3c6e8377d00000000000011d1 | 249.002 | 15.316 | 0.016 | 0.000 | 30.773 | 5.045 | 16.576 | 13.436 | n/a | 0.462 | 167.323 | n/a | n/a | 0.055 | 46.105 | 0.185 | 0.055 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 57.755ms; driver.publication 19.134ms; driver.publication 11.911ms; client.encode 5.685ms; driver.expected-state.bind-receipt 3.026ms |
| e6eb72f3c6e8377d00000000000011d2 | 245.816 | 15.216 | 1.598 | 0.000 | 18.771 | 16.853 | 7.310 | 15.638 | n/a | 0.030 | 170.256 | n/a | n/a | 0.144 | 35.585 | 0.145 | 0.144 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 57.755ms; driver.publication 16.848ms; driver.publication 11.911ms; driver.publication 7.830ms; client.encode 5.685ms |
| e6eb72f3c6e8377d00000000000011d6 | 204.041 | 12.442 | 5.813 | 0.000 | 52.100 | 2.490 | 4.922 | 34.451 | n/a | 0.084 | 91.667 | n/a | n/a | 0.073 | 70.356 | 0.345 | 0.073 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 44.097ms; driver.publication 11.911ms; driver.publication 7.830ms; client.encode 5.685ms; driver.publication 3.752ms |
| e6eb72f3c6e8377d00000000000011d7 | 201.564 | 16.651 | 3.227 | 0.000 | 43.908 | 7.419 | 42.073 | 0.207 | n/a | 0.632 | 87.396 | n/a | n/a | 0.052 | 63.786 | 0.316 | 0.052 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 35.010ms; driver.publication 11.911ms; driver.publication 7.830ms; client.encode 5.685ms; driver.publication 3.752ms |
| e6eb72f3c6e8377d00000000000011d9 | 189.944 | 6.496 | 0.009 | 0.000 | 125.394 | 10.463 | 1.879 | 0.094 | n/a | 0.172 | 45.354 | n/a | n/a | 0.083 | 131.899 | 0.694 | 0.083 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 11.911ms; driver.publication 7.830ms; client.encode 5.685ms; driver.publication 3.752ms; driver.publication 2.399ms |
| e6eb72f3c6e8377d00000000000011cd | 183.947 | 67.765 | 0.009 | 0.000 | 2.764 | 32.777 | 12.362 | 11.116 | n/a | 0.244 | 56.834 | n/a | n/a | 0.076 | 70.538 | 0.383 | 0.076 | node-14/thread-0/driver.publication | driver.publication 24.173ms; driver.publication 19.134ms; driver.expected-state.bind-receipt 6.158ms |
| e6eb72f3c6e8377d00000000000011d8 | 169.015 | 31.853 | 5.106 | 0.000 | 8.605 | 21.196 | 10.756 | 0.203 | n/a | 2.549 | 88.711 | n/a | n/a | 0.037 | 45.563 | 0.270 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 11.911ms; driver.publication 7.830ms; driver.publication 3.752ms; driver.expected-state.bind-receipt 3.026ms; driver.publication 2.399ms |
| e6eb72f3c6e8377d0000000000001310 | 152.811 | 5.888 | 0.008 | 0.000 | 119.561 | 0.720 | 1.082 | 0.029 | n/a | 1.085 | 24.394 | n/a | n/a | 0.044 | 125.457 | 0.821 | 0.044 | node-14/thread-0/driver.queue.subject | driver.publication 4.740ms; driver.publication 1.615ms; driver.publication 1.472ms; driver.publication 1.457ms; driver.publication 1.350ms |
| e6eb72f3c6e8377d000000000000130c | 141.792 | 4.015 | 0.005 | 0.000 | 40.060 | 0.889 | 4.844 | 0.033 | n/a | 0.113 | 91.782 | n/a | n/a | 0.051 | 44.080 | 0.311 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 4.740ms; driver.publication 1.806ms; driver.publication 1.803ms; driver.publication 1.457ms; driver.publication 1.313ms |
| e6eb72f3c6e8377d00000000000011e1 | 136.569 | 15.712 | 0.012 | 0.000 | 31.515 | 45.890 | 8.887 | 3.641 | n/a | 0.292 | 30.587 | n/a | n/a | 0.033 | 47.240 | 0.346 | 0.033 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.487ms; driver.publication 2.970ms; driver.publication 2.506ms; driver.publication 2.399ms; driver.publication 2.206ms |
| e6eb72f3c6e8377d0000000000001314 | 134.174 | 3.010 | 0.006 | 0.000 | 96.852 | 0.433 | 1.394 | 4.283 | n/a | 0.080 | 28.087 | n/a | n/a | 0.030 | 99.867 | 0.744 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 4.740ms; driver.publication 2.563ms; driver.publication 1.775ms; driver.publication 1.615ms; driver.publication 1.521ms |
| e6eb72f3c6e8377d00000000000011c9 | 130.876 | 22.641 | 0.010 | 0.000 | 19.539 | 2.154 | 6.095 | 0.036 | n/a | 0.067 | 80.259 | n/a | n/a | 0.075 | 42.190 | 0.322 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 24.173ms; driver.publication 16.311ms; driver.expected-state.bind-receipt 6.158ms; driver.publication 2.016ms |
| e6eb72f3c6e8377d0000000000001176 | 127.356 | 37.418 | 0.305 | 0.000 | 7.443 | 13.893 | 1.220 | 0.027 | n/a | 0.068 | 66.944 | n/a | n/a | 0.037 | 45.166 | 0.355 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 6.331ms; driver.publication 6.313ms; driver.publication 4.141ms; driver.publication 2.256ms; driver.publication 1.773ms |
| e6eb72f3c6e8377d00000000000011e3 | 126.540 | 3.337 | 0.005 | 0.000 | 112.966 | 4.646 | 1.348 | 0.030 | n/a | 0.155 | 4.022 | n/a | n/a | 0.031 | 116.308 | 0.919 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication 3.487ms; driver.publication 2.970ms; driver.publication 2.506ms; driver.publication 2.399ms; driver.publication 2.206ms |
| e6eb72f3c6e8377d0000000000001175 | 118.198 | 33.071 | 0.023 | 0.000 | 12.240 | 9.208 | 1.494 | 0.031 | n/a | 0.104 | 61.969 | n/a | n/a | 0.058 | 45.334 | 0.384 | 0.058 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 6.331ms; driver.publication 6.313ms; driver.publication 1.773ms; driver.expected-state.bind-receipt 1.198ms; driver.expected-state.bind-receipt 1.150ms |
| e6eb72f3c6e8377d00000000000011ab | 117.974 | 4.278 | 0.005 | 0.000 | 100.425 | 1.230 | 1.359 | 0.034 | n/a | 0.357 | 10.222 | n/a | n/a | 0.063 | 104.708 | 0.888 | 0.063 | node-14/thread-0/driver.queue.subject | driver.publication 7.284ms; driver.publication 4.560ms; driver.publication 3.346ms; driver.publication 2.545ms; driver.expected-state.bind-receipt 2.362ms |
| e6eb72f3c6e8377d00000000000011da | 117.593 | 7.596 | 0.009 | 0.000 | 25.134 | 7.445 | 5.929 | 0.051 | n/a | 4.010 | 67.374 | n/a | n/a | 0.046 | 32.739 | 0.278 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 11.911ms; driver.publication 7.830ms; driver.publication 3.752ms; driver.publication 2.399ms; driver.publication 1.580ms |

## P2 / tail / commit / 5-10 facts (1557 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.220 | 0.688 | 0.000 | 1.510 | 3.298 | 0.005 | 0.000 | 0.788 | 0.796 | 0.993 | 0.028 | n/a | 0.125 | 5.128 | n/a | n/a | 0.036 | 4.266 | 0.345 | 0.036 |
| p99 | 117.974 | 2.588 | 2.308 | 7.481 | 12.784 | 0.200 | 0.000 | 42.134 | 26.611 | 8.757 | 3.659 | n/a | 3.663 | 56.834 | n/a | n/a | 0.134 | 47.582 | 0.758 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e6eb72f3c6e8377d00000000000011d3 | 373.391 | 33.029 | 3.672 | 0.000 | 7.382 | 73.850 | 17.016 | 19.696 | n/a | 0.115 | 218.595 | n/a | n/a | 0.034 | 44.083 | 0.118 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 57.755ms; driver.publication 11.911ms; driver.publication 7.830ms; client.encode 5.685ms; driver.publication 4.866ms |
| e6eb72f3c6e8377d00000000000011cf | 369.982 | 47.222 | 0.023 | 0.000 | 4.422 | 195.947 | 8.294 | 0.145 | n/a | 4.109 | 109.735 | n/a | n/a | 0.084 | 51.667 | 0.140 | 0.084 | node-14/thread-0/socket.wait-first-byte | driver.publication 57.755ms; driver.publication 19.134ms; driver.publication 7.830ms; client.encode 5.685ms; driver.publication 3.752ms |
| e6eb72f3c6e8377d00000000000011d5 | 250.138 | 12.784 | 0.019 | 0.000 | 91.707 | 24.142 | 25.618 | 0.073 | n/a | 0.470 | 95.278 | n/a | n/a | 0.047 | 104.510 | 0.418 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 57.755ms; driver.publication 11.911ms; driver.publication 7.830ms; client.encode 5.685ms; driver.publication 3.752ms |
| e6eb72f3c6e8377d00000000000011d1 | 249.002 | 15.316 | 0.016 | 0.000 | 30.773 | 5.045 | 16.576 | 13.436 | n/a | 0.462 | 167.323 | n/a | n/a | 0.055 | 46.105 | 0.185 | 0.055 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 57.755ms; driver.publication 19.134ms; driver.publication 11.911ms; client.encode 5.685ms; driver.expected-state.bind-receipt 3.026ms |
| e6eb72f3c6e8377d00000000000011d2 | 245.816 | 15.216 | 1.598 | 0.000 | 18.771 | 16.853 | 7.310 | 15.638 | n/a | 0.030 | 170.256 | n/a | n/a | 0.144 | 35.585 | 0.145 | 0.144 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 57.755ms; driver.publication 16.848ms; driver.publication 11.911ms; driver.publication 7.830ms; client.encode 5.685ms |
| e6eb72f3c6e8377d00000000000011d6 | 204.041 | 12.442 | 5.813 | 0.000 | 52.100 | 2.490 | 4.922 | 34.451 | n/a | 0.084 | 91.667 | n/a | n/a | 0.073 | 70.356 | 0.345 | 0.073 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 44.097ms; driver.publication 11.911ms; driver.publication 7.830ms; client.encode 5.685ms; driver.publication 3.752ms |
| e6eb72f3c6e8377d00000000000011d9 | 189.944 | 6.496 | 0.009 | 0.000 | 125.394 | 10.463 | 1.879 | 0.094 | n/a | 0.172 | 45.354 | n/a | n/a | 0.083 | 131.899 | 0.694 | 0.083 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 11.911ms; driver.publication 7.830ms; client.encode 5.685ms; driver.publication 3.752ms; driver.publication 2.399ms |
| e6eb72f3c6e8377d00000000000011cd | 183.947 | 67.765 | 0.009 | 0.000 | 2.764 | 32.777 | 12.362 | 11.116 | n/a | 0.244 | 56.834 | n/a | n/a | 0.076 | 70.538 | 0.383 | 0.076 | node-14/thread-0/driver.publication | driver.publication 24.173ms; driver.publication 19.134ms; driver.expected-state.bind-receipt 6.158ms |
| e6eb72f3c6e8377d00000000000011d8 | 169.015 | 31.853 | 5.106 | 0.000 | 8.605 | 21.196 | 10.756 | 0.203 | n/a | 2.549 | 88.711 | n/a | n/a | 0.037 | 45.563 | 0.270 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 11.911ms; driver.publication 7.830ms; driver.publication 3.752ms; driver.expected-state.bind-receipt 3.026ms; driver.publication 2.399ms |
| e6eb72f3c6e8377d0000000000001310 | 152.811 | 5.888 | 0.008 | 0.000 | 119.561 | 0.720 | 1.082 | 0.029 | n/a | 1.085 | 24.394 | n/a | n/a | 0.044 | 125.457 | 0.821 | 0.044 | node-14/thread-0/driver.queue.subject | driver.publication 4.740ms; driver.publication 1.615ms; driver.publication 1.472ms; driver.publication 1.457ms; driver.publication 1.350ms |
| e6eb72f3c6e8377d000000000000130c | 141.792 | 4.015 | 0.005 | 0.000 | 40.060 | 0.889 | 4.844 | 0.033 | n/a | 0.113 | 91.782 | n/a | n/a | 0.051 | 44.080 | 0.311 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 4.740ms; driver.publication 1.806ms; driver.publication 1.803ms; driver.publication 1.457ms; driver.publication 1.313ms |
| e6eb72f3c6e8377d00000000000011e1 | 136.569 | 15.712 | 0.012 | 0.000 | 31.515 | 45.890 | 8.887 | 3.641 | n/a | 0.292 | 30.587 | n/a | n/a | 0.033 | 47.240 | 0.346 | 0.033 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.487ms; driver.publication 2.970ms; driver.publication 2.506ms; driver.publication 2.399ms; driver.publication 2.206ms |
| e6eb72f3c6e8377d0000000000001314 | 134.174 | 3.010 | 0.006 | 0.000 | 96.852 | 0.433 | 1.394 | 4.283 | n/a | 0.080 | 28.087 | n/a | n/a | 0.030 | 99.867 | 0.744 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 4.740ms; driver.publication 2.563ms; driver.publication 1.775ms; driver.publication 1.615ms; driver.publication 1.521ms |
| e6eb72f3c6e8377d00000000000011c9 | 130.876 | 22.641 | 0.010 | 0.000 | 19.539 | 2.154 | 6.095 | 0.036 | n/a | 0.067 | 80.259 | n/a | n/a | 0.075 | 42.190 | 0.322 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 24.173ms; driver.publication 16.311ms; driver.expected-state.bind-receipt 6.158ms; driver.publication 2.016ms |
| e6eb72f3c6e8377d0000000000001175 | 118.198 | 33.071 | 0.023 | 0.000 | 12.240 | 9.208 | 1.494 | 0.031 | n/a | 0.104 | 61.969 | n/a | n/a | 0.058 | 45.334 | 0.384 | 0.058 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 6.331ms; driver.publication 6.313ms; driver.publication 1.773ms; driver.expected-state.bind-receipt 1.198ms; driver.expected-state.bind-receipt 1.150ms |
| e6eb72f3c6e8377d00000000000011ab | 117.974 | 4.278 | 0.005 | 0.000 | 100.425 | 1.230 | 1.359 | 0.034 | n/a | 0.357 | 10.222 | n/a | n/a | 0.063 | 104.708 | 0.888 | 0.063 | node-14/thread-0/driver.queue.subject | driver.publication 7.284ms; driver.publication 4.560ms; driver.publication 3.346ms; driver.publication 2.545ms; driver.expected-state.bind-receipt 2.362ms |
| e6eb72f3c6e8377d00000000000011da | 117.593 | 7.596 | 0.009 | 0.000 | 25.134 | 7.445 | 5.929 | 0.051 | n/a | 4.010 | 67.374 | n/a | n/a | 0.046 | 32.739 | 0.278 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 11.911ms; driver.publication 7.830ms; driver.publication 3.752ms; driver.publication 2.399ms; driver.publication 1.580ms |
| e6eb72f3c6e8377d00000000000011db | 116.618 | 9.061 | 0.580 | 0.000 | 21.958 | 32.651 | 1.741 | 0.035 | n/a | 1.650 | 48.900 | n/a | n/a | 0.042 | 31.599 | 0.271 | 0.042 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 11.911ms; driver.publication 7.830ms; driver.publication 3.752ms; driver.publication 2.399ms; driver.publication 2.206ms |
| e6eb72f3c6e8377d00000000000011e2 | 113.675 | 3.390 | 0.006 | 0.000 | 91.292 | 7.403 | 2.967 | 0.035 | n/a | 0.055 | 8.498 | n/a | n/a | 0.030 | 94.688 | 0.833 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 3.487ms; driver.publication 2.970ms; driver.publication 2.506ms; driver.publication 2.399ms; driver.publication 2.206ms |
| e6eb72f3c6e8377d00000000000012b5 | 113.196 | 9.502 | 0.014 | 0.000 | 6.806 | 70.130 | 2.087 | 0.034 | n/a | 0.564 | 23.767 | n/a | n/a | 0.293 | 16.322 | 0.144 | 0.293 | node-14/thread-0/socket.wait-first-byte | driver.publication 7.344ms; driver.publication 4.504ms; driver.publication 2.995ms; driver.publication 1.470ms; driver.publication 1.370ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.297 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.057 | 200.563 | 0.012 | n/a | 0.045 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 |
| p99 | 202.862 | n/a | n/a | n/a | 38.187 | n/a | 2.570 | 0.000 | 9.428 | 201.285 | 0.100 | n/a | 0.163 | 0.000 | n/a | n/a | 0.343 | 40.757 | 0.351 | 0.343 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9be5dde169bda2100000000000000005 | 202.862 | 0.000 | n/a | 0.000 | 0.000 | 1.454 | 201.095 | 0.019 | n/a | 0.116 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-46/journal/page | none observed |
| 9be5dde169bda2100000000000000006 | 202.735 | 0.000 | n/a | 0.000 | 0.000 | 1.057 | 201.285 | 0.017 | n/a | 0.163 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda2100000000000000007 | 202.505 | 0.000 | n/a | 0.000 | 0.000 | 1.008 | 201.016 | 0.012 | n/a | 0.126 | 0.000 | n/a | n/a | 0.343 | 0.000 | 0.000 | 0.343 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda2100000000000000efc | 201.577 | 0.000 | n/a | 0.000 | 0.000 | 0.526 | 200.857 | 0.017 | n/a | 0.077 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda2100000000000000efa | 201.540 | 0.000 | n/a | 0.000 | 0.000 | 0.558 | 200.820 | 0.011 | n/a | 0.045 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda2100000000000000efb | 201.297 | 0.000 | n/a | 0.000 | 0.000 | 0.440 | 200.563 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.252 | 0.000 | 0.000 | 0.252 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000002 | 196.829 | 2.299 | n/a | 0.000 | 0.000 | 2.998 | 191.085 | 0.100 | n/a | 0.100 | 0.000 | n/a | n/a | 0.247 | 2.299 | 0.012 | 0.247 | gw-r/thread-48/gateway.admitted-work | none observed |
| 9be5dde169bda2100000000000000eff | 116.162 | 38.187 | n/a | 2.570 | 0.000 | 9.428 | 65.760 | 0.006 | n/a | 0.013 | 0.000 | n/a | n/a | 0.198 | 40.757 | 0.351 | 0.198 | gw-r/thread-48/gateway.admitted-work | none observed |
| 9be5dde169bda2100000000000000f01 | 115.528 | 18.049 | n/a | 1.323 | 0.000 | 4.874 | 91.067 | 0.006 | n/a | 0.015 | 0.000 | n/a | n/a | 0.194 | 19.372 | 0.168 | 0.194 | gw-r/thread-48/gateway.admitted-work | none observed |
| 9be5dde169bda2100000000000000f00 | 100.441 | 17.501 | n/a | 0.000 | 0.000 | 2.188 | 80.410 | 0.046 | n/a | 0.007 | 0.000 | n/a | n/a | 0.288 | 17.501 | 0.174 | 0.288 | gw-r/thread-50/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 814.118 | n/a | n/a | n/a | 0.203 | n/a | 0.000 | 0.000 | 0.756 | 803.053 | 0.011 | n/a | 0.176 | 0.000 | n/a | n/a | 0.237 | 0.203 | 0.000 | 0.237 |
| p99 | 1004.637 | n/a | n/a | n/a | 9.884 | n/a | 0.000 | 0.000 | 1.354 | 1001.517 | 0.014 | n/a | 0.320 | 0.000 | n/a | n/a | 1.230 | 9.884 | 0.012 | 1.230 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0acc6d7a70d7091a00000000000000a4 | 1004.637 | 0.203 | n/a | 0.000 | 0.000 | 1.354 | 1001.517 | 0.014 | n/a | 0.320 | 0.000 | n/a | n/a | 1.230 | 0.203 | 0.000 | 1.230 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000a5 | 814.118 | 9.884 | n/a | 0.000 | 0.000 | 0.756 | 803.053 | 0.011 | n/a | 0.176 | 0.000 | n/a | n/a | 0.237 | 9.884 | 0.012 | 0.237 | gw-r/thread-46/journal/page | none observed |

## P3 / warmup / internal (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 398.987 | n/a | n/a | n/a | 2.747 | n/a | 0.000 | 0.000 | 0.772 | 395.479 | 0.016 | n/a | 0.101 | 0.000 | n/a | n/a | 0.126 | 2.747 | 0.007 | 0.126 |
| p99 | 1004.755 | n/a | n/a | n/a | 7.819 | n/a | 0.000 | 0.000 | 1.504 | 1001.638 | 2.299 | n/a | 0.302 | 0.000 | n/a | n/a | 12.148 | 7.819 | 0.453 | 12.148 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0acc6d7a70d7091a00000000000000b4 | 1004.755 | 0.122 | n/a | 0.000 | 0.000 | 1.440 | 1001.638 | 0.067 | n/a | 0.302 | 0.000 | n/a | n/a | 1.185 | 0.122 | 0.000 | 1.185 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000bc | 1002.917 | 0.119 | n/a | 0.000 | 0.000 | 0.654 | 1000.862 | 0.016 | n/a | 0.112 | 0.000 | n/a | n/a | 1.154 | 0.119 | 0.000 | 1.154 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000d1 | 995.888 | 6.054 | n/a | 0.000 | 0.000 | 0.829 | 988.506 | 0.123 | n/a | 0.206 | 0.000 | n/a | n/a | 0.171 | 6.054 | 0.006 | 0.171 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000ae | 988.336 | 2.554 | n/a | 0.000 | 0.000 | 1.227 | 983.526 | 0.694 | n/a | 0.233 | 0.000 | n/a | n/a | 0.102 | 2.554 | 0.003 | 0.102 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000bb | 971.104 | 2.485 | n/a | 0.000 | 0.000 | 1.504 | 966.899 | 0.012 | n/a | 0.112 | 0.000 | n/a | n/a | 0.092 | 2.485 | 0.003 | 0.092 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000ab | 858.328 | 4.569 | n/a | 0.000 | 0.000 | 1.165 | 852.149 | 0.013 | n/a | 0.165 | 0.000 | n/a | n/a | 0.268 | 4.569 | 0.005 | 0.268 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000a8 | 815.895 | 4.213 | n/a | 0.000 | 0.000 | 0.791 | 808.316 | 2.299 | n/a | 0.104 | 0.000 | n/a | n/a | 0.172 | 4.213 | 0.005 | 0.172 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000c3 | 796.912 | 7.149 | n/a | 0.000 | 0.000 | 0.501 | 789.046 | 0.010 | n/a | 0.053 | 0.000 | n/a | n/a | 0.152 | 7.149 | 0.009 | 0.152 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000cc | 667.074 | 2.165 | n/a | 0.000 | 0.000 | 0.745 | 663.865 | 0.104 | n/a | 0.125 | 0.000 | n/a | n/a | 0.070 | 2.165 | 0.003 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000ca | 601.541 | 2.470 | n/a | 0.000 | 0.000 | 0.839 | 597.726 | 0.327 | n/a | 0.093 | 0.000 | n/a | n/a | 0.086 | 2.470 | 0.004 | 0.086 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000b2 | 593.807 | 2.828 | n/a | 0.000 | 0.000 | 0.985 | 589.786 | 0.018 | n/a | 0.110 | 0.000 | n/a | n/a | 0.080 | 2.828 | 0.005 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000c1 | 571.263 | 4.458 | n/a | 0.000 | 0.000 | 0.832 | 565.784 | 0.014 | n/a | 0.081 | 0.000 | n/a | n/a | 0.094 | 4.458 | 0.008 | 0.094 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000c7 | 555.845 | 6.093 | n/a | 0.000 | 0.000 | 0.740 | 548.662 | 0.024 | n/a | 0.080 | 0.000 | n/a | n/a | 0.246 | 6.093 | 0.011 | 0.246 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000b8 | 476.034 | 2.535 | n/a | 0.000 | 0.000 | 0.556 | 472.566 | 0.184 | n/a | 0.101 | 0.000 | n/a | n/a | 0.092 | 2.535 | 0.005 | 0.092 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000c6 | 435.714 | 2.472 | n/a | 0.000 | 0.000 | 1.065 | 432.000 | 0.012 | n/a | 0.059 | 0.000 | n/a | n/a | 0.106 | 2.472 | 0.006 | 0.106 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000c9 | 398.987 | 2.448 | n/a | 0.000 | 0.000 | 0.878 | 395.479 | 0.012 | n/a | 0.077 | 0.000 | n/a | n/a | 0.092 | 2.448 | 0.006 | 0.092 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000a7 | 380.929 | 2.911 | n/a | 0.000 | 0.000 | 1.038 | 376.000 | 0.670 | n/a | 0.190 | 0.000 | n/a | n/a | 0.121 | 2.911 | 0.008 | 0.121 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000b1 | 349.419 | 5.840 | n/a | 0.000 | 0.000 | 0.638 | 342.702 | 0.015 | n/a | 0.084 | 0.000 | n/a | n/a | 0.140 | 5.840 | 0.017 | 0.140 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000b9 | 290.460 | 5.027 | n/a | 0.000 | 0.000 | 0.746 | 284.435 | 0.016 | n/a | 0.091 | 0.000 | n/a | n/a | 0.144 | 5.027 | 0.017 | 0.144 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000cd | 272.971 | 1.889 | n/a | 0.000 | 0.000 | 0.861 | 269.964 | 0.011 | n/a | 0.123 | 0.000 | n/a | n/a | 0.122 | 1.889 | 0.007 | 0.122 | gw-r/thread-47/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 411.582 | n/a | n/a | n/a | 5.473 | n/a | 0.634 | 0.000 | 0.866 | 401.553 | 0.015 | n/a | 0.076 | 0.000 | n/a | n/a | 0.170 | 5.963 | 0.016 | 0.170 |
| p99 | 1005.613 | n/a | n/a | n/a | 21.124 | n/a | 1.710 | 0.000 | 1.576 | 1001.276 | 0.221 | n/a | 0.171 | 0.000 | n/a | n/a | 41.403 | 22.834 | 0.826 | 41.403 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0acc6d7a70d7091a00000000000000d4 | 1005.613 | 5.156 | n/a | 0.591 | 0.000 | 1.375 | 998.214 | 0.013 | n/a | 0.078 | 0.000 | n/a | n/a | 0.186 | 5.747 | 0.006 | 0.186 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000d2 | 1004.011 | 0.279 | n/a | 0.000 | 0.000 | 1.448 | 1000.986 | 0.013 | n/a | 0.121 | 0.000 | n/a | n/a | 1.165 | 0.279 | 0.000 | 1.165 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000ff | 1003.844 | 0.261 | n/a | 0.000 | 0.000 | 0.972 | 1001.276 | 0.019 | n/a | 0.171 | 0.000 | n/a | n/a | 1.144 | 0.261 | 0.000 | 1.144 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000107 | 1002.427 | 6.625 | n/a | 1.367 | 0.000 | 0.908 | 993.221 | 0.044 | n/a | 0.152 | 0.000 | n/a | n/a | 0.110 | 7.992 | 0.008 | 0.110 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000da | 1001.598 | 3.419 | n/a | 0.483 | 0.000 | 0.713 | 996.638 | 0.157 | n/a | 0.062 | 0.000 | n/a | n/a | 0.126 | 3.902 | 0.004 | 0.126 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000df | 1001.262 | 5.266 | n/a | 0.697 | 0.000 | 0.695 | 994.382 | 0.013 | n/a | 0.067 | 0.000 | n/a | n/a | 0.142 | 5.963 | 0.006 | 0.142 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000e0 | 996.835 | 7.467 | n/a | 0.654 | 0.000 | 1.117 | 987.107 | 0.172 | n/a | 0.100 | 0.000 | n/a | n/a | 0.218 | 8.121 | 0.008 | 0.218 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a000000000000010f | 988.212 | 3.162 | n/a | 0.000 | 0.000 | 1.130 | 983.751 | 0.008 | n/a | 0.094 | 0.000 | n/a | n/a | 0.066 | 3.162 | 0.003 | 0.066 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000103 | 985.545 | 3.360 | n/a | 0.000 | 0.000 | 1.158 | 980.809 | 0.011 | n/a | 0.126 | 0.000 | n/a | n/a | 0.082 | 3.360 | 0.003 | 0.082 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000db | 962.846 | 8.446 | n/a | 0.746 | 0.000 | 0.730 | 952.445 | 0.059 | n/a | 0.123 | 0.000 | n/a | n/a | 0.297 | 9.192 | 0.010 | 0.297 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000e1 | 832.865 | 7.004 | n/a | 0.773 | 0.000 | 1.576 | 823.255 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 0.170 | 7.777 | 0.009 | 0.170 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000104 | 804.842 | 4.213 | n/a | 0.634 | 0.000 | 0.814 | 798.877 | 0.015 | n/a | 0.150 | 0.000 | n/a | n/a | 0.139 | 4.847 | 0.006 | 0.139 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000e5 | 792.838 | 5.532 | n/a | 0.940 | 0.000 | 0.706 | 785.252 | 0.146 | n/a | 0.066 | 0.000 | n/a | n/a | 0.195 | 6.473 | 0.008 | 0.195 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000eb | 621.442 | 5.389 | n/a | 0.000 | 0.000 | 1.108 | 614.644 | 0.019 | n/a | 0.104 | 0.000 | n/a | n/a | 0.179 | 5.389 | 0.009 | 0.179 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000fc | 605.067 | 6.685 | n/a | 0.634 | 0.000 | 1.054 | 596.257 | 0.023 | n/a | 0.111 | 0.000 | n/a | n/a | 0.302 | 7.318 | 0.012 | 0.302 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000e9 | 580.823 | 6.341 | n/a | 0.561 | 0.000 | 1.263 | 572.339 | 0.029 | n/a | 0.068 | 0.000 | n/a | n/a | 0.223 | 6.901 | 0.012 | 0.223 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000dc | 566.857 | 11.390 | n/a | 1.474 | 0.000 | 0.898 | 552.722 | 0.018 | n/a | 0.099 | 0.000 | n/a | n/a | 0.257 | 12.864 | 0.023 | 0.257 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000109 | 476.765 | 16.081 | n/a | 0.736 | 0.000 | 1.209 | 458.305 | 0.169 | n/a | 0.113 | 0.000 | n/a | n/a | 0.152 | 16.818 | 0.035 | 0.152 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000d6 | 438.169 | 4.301 | n/a | 0.865 | 0.000 | 0.631 | 432.175 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.123 | 5.166 | 0.012 | 0.123 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a00000000000000dd | 434.133 | 6.675 | n/a | 0.807 | 0.000 | 0.904 | 425.459 | 0.014 | n/a | 0.074 | 0.000 | n/a | n/a | 0.200 | 7.483 | 0.017 | 0.200 | gw-r/thread-46/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 384.369 | n/a | n/a | n/a | 3.677 | n/a | 0.000 | 0.000 | 0.807 | 368.958 | 0.012 | n/a | 0.092 | 0.000 | n/a | n/a | 0.172 | 4.369 | 0.010 | 0.172 |
| p99 | 1006.208 | n/a | n/a | n/a | 13.682 | n/a | 1.996 | 0.000 | 3.735 | 1001.039 | 0.406 | n/a | 0.170 | 0.000 | n/a | n/a | 48.103 | 14.507 | 0.232 | 48.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0acc6d7a70d7091a0000000000000139 | 1006.208 | 5.670 | n/a | 0.000 | 0.000 | 1.173 | 998.679 | 0.406 | n/a | 0.120 | 0.000 | n/a | n/a | 0.160 | 5.670 | 0.006 | 0.160 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a000000000000012b | 1004.001 | 0.235 | n/a | 0.000 | 0.000 | 1.015 | 1001.039 | 0.016 | n/a | 0.141 | 0.000 | n/a | n/a | 1.554 | 0.235 | 0.000 | 1.554 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a000000000000011e | 1001.910 | 2.955 | n/a | 0.594 | 0.000 | 0.656 | 997.387 | 0.022 | n/a | 0.112 | 0.000 | n/a | n/a | 0.184 | 3.549 | 0.004 | 0.184 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000127 | 991.656 | 2.834 | n/a | 0.000 | 0.000 | 1.166 | 987.424 | 0.011 | n/a | 0.149 | 0.000 | n/a | n/a | 0.073 | 2.834 | 0.003 | 0.073 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000116 | 990.970 | 3.279 | n/a | 0.615 | 0.000 | 1.073 | 985.690 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.194 | 3.894 | 0.004 | 0.194 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a000000000000012d | 975.592 | 5.042 | n/a | 0.000 | 0.000 | 0.954 | 969.262 | 0.020 | n/a | 0.094 | 0.000 | n/a | n/a | 0.220 | 5.042 | 0.005 | 0.220 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000141 | 941.031 | 3.677 | n/a | 0.000 | 0.000 | 0.631 | 936.534 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 0.089 | 3.677 | 0.004 | 0.089 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000113 | 853.448 | 2.353 | n/a | 0.603 | 0.000 | 2.700 | 847.578 | 0.016 | n/a | 0.112 | 0.000 | n/a | n/a | 0.086 | 2.956 | 0.003 | 0.086 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000128 | 776.626 | 5.707 | n/a | 0.000 | 0.000 | 0.845 | 769.866 | 0.007 | n/a | 0.084 | 0.000 | n/a | n/a | 0.117 | 5.707 | 0.007 | 0.117 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a000000000000013e | 762.338 | 5.464 | n/a | 0.000 | 0.000 | 0.898 | 755.642 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.228 | 5.464 | 0.007 | 0.228 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a000000000000011f | 758.471 | 2.811 | n/a | 0.000 | 0.000 | 1.038 | 754.374 | 0.013 | n/a | 0.149 | 0.000 | n/a | n/a | 0.086 | 2.811 | 0.004 | 0.086 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000149 | 730.024 | 4.563 | n/a | 0.000 | 0.000 | 0.764 | 724.295 | 0.007 | n/a | 0.095 | 0.000 | n/a | n/a | 0.300 | 4.563 | 0.006 | 0.300 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000110 | 717.713 | 3.448 | n/a | 1.996 | 0.000 | 0.573 | 711.395 | 0.038 | n/a | 0.134 | 0.000 | n/a | n/a | 0.128 | 5.444 | 0.008 | 0.128 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000134 | 707.358 | 2.665 | n/a | 0.000 | 0.000 | 0.523 | 704.040 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.065 | 2.665 | 0.004 | 0.065 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000136 | 682.677 | 3.063 | n/a | 0.000 | 0.000 | 0.633 | 678.829 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.075 | 3.063 | 0.004 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000143 | 643.013 | 7.445 | n/a | 1.045 | 0.000 | 1.211 | 632.913 | 0.012 | n/a | 0.170 | 0.000 | n/a | n/a | 0.218 | 8.490 | 0.013 | 0.218 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a000000000000012f | 628.518 | 4.767 | n/a | 0.000 | 0.000 | 0.752 | 622.747 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.179 | 4.767 | 0.008 | 0.179 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000125 | 620.310 | 5.566 | n/a | 0.000 | 0.000 | 0.792 | 613.611 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.256 | 5.566 | 0.009 | 0.256 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a000000000000013a | 582.833 | 12.167 | n/a | 1.010 | 0.000 | 0.676 | 568.688 | 0.011 | n/a | 0.083 | 0.000 | n/a | n/a | 0.199 | 13.177 | 0.023 | 0.199 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a000000000000013b | 410.547 | 3.570 | n/a | 0.000 | 0.000 | 1.019 | 405.742 | 0.009 | n/a | 0.121 | 0.000 | n/a | n/a | 0.087 | 3.570 | 0.009 | 0.087 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 421.222 | n/a | n/a | n/a | 2.821 | n/a | 0.000 | 0.000 | 0.671 | 417.980 | 0.014 | n/a | 0.052 | 0.000 | n/a | n/a | 0.094 | 2.821 | 0.007 | 0.094 |
| p99 | 1003.235 | n/a | n/a | n/a | 9.665 | n/a | 1.122 | 0.000 | 3.760 | 1001.136 | 1.590 | n/a | 0.115 | 0.000 | n/a | n/a | 37.871 | 9.665 | 0.714 | 37.871 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0acc6d7a70d7091a0000000000000165 | 1003.235 | 0.134 | n/a | 0.000 | 0.000 | 0.703 | 1001.136 | 0.006 | n/a | 0.081 | 0.000 | n/a | n/a | 1.174 | 0.134 | 0.000 | 1.174 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000186 | 1003.112 | 0.129 | n/a | 0.000 | 0.000 | 0.700 | 1001.072 | 0.013 | n/a | 0.086 | 0.000 | n/a | n/a | 1.111 | 0.129 | 0.000 | 1.111 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a000000000000017f | 1002.395 | 2.568 | n/a | 0.000 | 0.000 | 0.554 | 999.142 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.071 | 2.568 | 0.003 | 0.071 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a000000000000016f | 994.287 | 2.532 | n/a | 0.000 | 0.000 | 1.573 | 989.451 | 0.557 | n/a | 0.085 | 0.000 | n/a | n/a | 0.089 | 2.532 | 0.003 | 0.089 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000155 | 986.462 | 4.314 | n/a | 0.000 | 0.000 | 2.465 | 979.510 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.108 | 4.314 | 0.004 | 0.108 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000185 | 982.955 | 3.187 | n/a | 0.000 | 0.000 | 0.790 | 978.841 | 0.015 | n/a | 0.052 | 0.000 | n/a | n/a | 0.070 | 3.187 | 0.003 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000174 | 940.571 | 2.793 | n/a | 0.000 | 0.000 | 0.942 | 936.718 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.063 | 2.793 | 0.003 | 0.063 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a000000000000015b | 809.840 | 3.200 | n/a | 0.000 | 0.000 | 0.662 | 805.738 | 0.127 | n/a | 0.048 | 0.000 | n/a | n/a | 0.064 | 3.200 | 0.004 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a000000000000017b | 791.387 | 4.982 | n/a | 0.000 | 0.000 | 2.295 | 783.934 | 0.033 | n/a | 0.055 | 0.000 | n/a | n/a | 0.088 | 4.982 | 0.006 | 0.088 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000156 | 760.185 | 2.686 | n/a | 0.000 | 0.000 | 0.876 | 754.810 | 1.590 | n/a | 0.068 | 0.000 | n/a | n/a | 0.156 | 2.686 | 0.004 | 0.156 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a000000000000016e | 620.468 | 3.492 | n/a | 0.000 | 0.000 | 0.528 | 616.252 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.139 | 3.492 | 0.006 | 0.139 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000184 | 618.319 | 3.280 | n/a | 0.000 | 0.000 | 0.787 | 614.103 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.094 | 3.280 | 0.005 | 0.094 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000150 | 616.844 | 2.012 | n/a | 0.000 | 0.000 | 0.544 | 614.018 | 0.125 | n/a | 0.045 | 0.000 | n/a | n/a | 0.100 | 2.012 | 0.003 | 0.100 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000177 | 596.690 | 2.819 | n/a | 0.000 | 0.000 | 0.695 | 592.417 | 0.635 | n/a | 0.053 | 0.000 | n/a | n/a | 0.071 | 2.819 | 0.005 | 0.071 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000189 | 583.215 | 8.370 | n/a | 1.122 | 0.000 | 1.047 | 572.165 | 0.175 | n/a | 0.052 | 0.000 | n/a | n/a | 0.282 | 9.492 | 0.016 | 0.282 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000167 | 562.070 | 8.435 | n/a | 0.000 | 0.000 | 0.560 | 552.559 | 0.192 | n/a | 0.049 | 0.000 | n/a | n/a | 0.276 | 8.435 | 0.015 | 0.276 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000171 | 560.586 | 2.574 | n/a | 0.000 | 0.000 | 0.616 | 557.279 | 0.012 | n/a | 0.034 | 0.000 | n/a | n/a | 0.072 | 2.574 | 0.005 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a000000000000017d | 557.865 | 2.821 | n/a | 0.000 | 0.000 | 0.551 | 554.288 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.118 | 2.821 | 0.005 | 0.118 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000168 | 445.783 | 5.889 | n/a | 0.000 | 0.000 | 0.972 | 438.569 | 0.014 | n/a | 0.071 | 0.000 | n/a | n/a | 0.269 | 5.889 | 0.013 | 0.269 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000170 | 433.060 | 9.665 | n/a | 0.000 | 0.000 | 1.853 | 421.059 | 0.180 | n/a | 0.115 | 0.000 | n/a | n/a | 0.188 | 9.665 | 0.022 | 0.188 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / internal (48 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 344.172 | n/a | n/a | n/a | 4.197 | n/a | 0.000 | 0.000 | 0.684 | 338.501 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.128 | 4.197 | 0.014 | 0.128 |
| p99 | 1000.173 | n/a | n/a | n/a | 12.552 | n/a | 0.000 | 0.000 | 3.408 | 995.811 | 3.028 | n/a | 0.102 | 0.000 | n/a | n/a | 43.730 | 12.552 | 0.415 | 43.730 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0acc6d7a70d7091a00000000000001a7 | 1000.173 | 3.338 | n/a | 0.000 | 0.000 | 0.821 | 995.811 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.130 | 3.338 | 0.003 | 0.130 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a000000000000018b | 998.296 | 12.552 | n/a | 0.000 | 0.000 | 0.830 | 984.528 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.332 | 12.552 | 0.013 | 0.332 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a000000000000019a | 993.866 | 4.279 | n/a | 0.000 | 0.000 | 2.237 | 986.232 | 0.925 | n/a | 0.066 | 0.000 | n/a | n/a | 0.128 | 4.279 | 0.004 | 0.128 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001c4 | 992.910 | 3.727 | n/a | 0.000 | 0.000 | 0.544 | 988.473 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.107 | 3.727 | 0.004 | 0.107 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001a6 | 977.962 | 3.689 | n/a | 0.000 | 0.000 | 0.469 | 973.571 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.184 | 3.689 | 0.004 | 0.184 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001c3 | 947.534 | 2.701 | n/a | 0.000 | 0.000 | 0.555 | 944.126 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.102 | 2.701 | 0.003 | 0.102 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001a4 | 928.789 | 2.954 | n/a | 0.000 | 0.000 | 0.835 | 924.694 | 0.154 | n/a | 0.053 | 0.000 | n/a | n/a | 0.099 | 2.954 | 0.003 | 0.099 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a000000000000019c | 837.853 | 3.778 | n/a | 0.000 | 0.000 | 0.661 | 833.070 | 0.196 | n/a | 0.060 | 0.000 | n/a | n/a | 0.088 | 3.778 | 0.005 | 0.088 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001c1 | 821.250 | 5.054 | n/a | 0.000 | 0.000 | 0.724 | 815.165 | 0.156 | n/a | 0.046 | 0.000 | n/a | n/a | 0.106 | 5.054 | 0.006 | 0.106 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001d4 | 757.219 | 3.251 | n/a | 0.000 | 0.000 | 0.897 | 752.635 | 0.251 | n/a | 0.073 | 0.000 | n/a | n/a | 0.112 | 3.251 | 0.004 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001b5 | 661.862 | 4.083 | n/a | 0.000 | 0.000 | 0.588 | 657.049 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.085 | 4.083 | 0.006 | 0.085 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001a0 | 653.110 | 4.590 | n/a | 0.000 | 0.000 | 0.618 | 647.772 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.085 | 4.590 | 0.007 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001c5 | 640.276 | 6.567 | n/a | 0.000 | 0.000 | 0.560 | 632.752 | 0.137 | n/a | 0.048 | 0.000 | n/a | n/a | 0.214 | 6.567 | 0.010 | 0.214 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001a8 | 602.259 | 3.717 | n/a | 0.000 | 0.000 | 1.995 | 596.390 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.105 | 3.717 | 0.006 | 0.105 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001b9 | 572.884 | 4.959 | n/a | 0.000 | 0.000 | 0.620 | 566.821 | 0.131 | n/a | 0.052 | 0.000 | n/a | n/a | 0.302 | 4.959 | 0.009 | 0.302 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001cd | 564.969 | 2.825 | n/a | 0.000 | 0.000 | 0.609 | 561.408 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.072 | 2.825 | 0.005 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001af | 563.013 | 8.770 | n/a | 0.000 | 0.000 | 0.672 | 553.244 | 0.016 | n/a | 0.052 | 0.000 | n/a | n/a | 0.258 | 8.770 | 0.016 | 0.258 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001d0 | 544.406 | 4.104 | n/a | 0.000 | 0.000 | 0.789 | 539.348 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.123 | 4.104 | 0.008 | 0.123 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000198 | 464.631 | 4.625 | n/a | 0.000 | 0.000 | 0.716 | 458.792 | 0.166 | n/a | 0.063 | 0.000 | n/a | n/a | 0.270 | 4.625 | 0.010 | 0.270 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001b7 | 424.497 | 10.618 | n/a | 0.000 | 0.000 | 1.319 | 412.273 | 0.008 | n/a | 0.102 | 0.000 | n/a | n/a | 0.176 | 10.618 | 0.025 | 0.176 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 309.228 | n/a | n/a | n/a | 3.192 | n/a | 0.000 | 0.000 | 0.589 | 304.236 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 0.103 | 3.192 | 0.009 | 0.103 |
| p99 | 1011.426 | n/a | n/a | n/a | 8.410 | n/a | 0.000 | 0.000 | 2.993 | 1008.313 | 0.395 | n/a | 0.080 | 0.000 | n/a | n/a | 13.078 | 8.410 | 0.705 | 13.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0acc6d7a70d7091a0000000000000218 | 1011.426 | 2.242 | n/a | 0.000 | 0.000 | 0.599 | 1008.313 | 0.112 | n/a | 0.042 | 0.000 | n/a | n/a | 0.118 | 2.242 | 0.002 | 0.118 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000216 | 1003.164 | 0.130 | n/a | 0.000 | 0.000 | 0.672 | 1001.134 | 0.029 | n/a | 0.080 | 0.000 | n/a | n/a | 1.118 | 0.130 | 0.000 | 1.118 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000211 | 1002.687 | 0.141 | n/a | 0.000 | 0.000 | 0.576 | 1000.767 | 0.011 | n/a | 0.067 | 0.000 | n/a | n/a | 1.125 | 0.141 | 0.000 | 1.125 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001e9 | 1000.786 | 3.340 | n/a | 0.000 | 0.000 | 1.005 | 996.128 | 0.148 | n/a | 0.056 | 0.000 | n/a | n/a | 0.109 | 3.340 | 0.003 | 0.109 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001fd | 998.068 | 4.722 | n/a | 0.000 | 0.000 | 1.000 | 992.205 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.087 | 4.722 | 0.005 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000210 | 988.645 | 6.183 | n/a | 0.000 | 0.000 | 0.593 | 981.614 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.215 | 6.183 | 0.006 | 0.215 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000215 | 960.462 | 2.905 | n/a | 0.000 | 0.000 | 0.488 | 956.823 | 0.131 | n/a | 0.035 | 0.000 | n/a | n/a | 0.081 | 2.905 | 0.003 | 0.081 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000205 | 956.254 | 3.607 | n/a | 0.000 | 0.000 | 0.605 | 951.759 | 0.158 | n/a | 0.031 | 0.000 | n/a | n/a | 0.095 | 3.607 | 0.004 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001f6 | 824.451 | 4.505 | n/a | 0.000 | 0.000 | 0.578 | 818.958 | 0.153 | n/a | 0.049 | 0.000 | n/a | n/a | 0.209 | 4.505 | 0.005 | 0.209 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001fe | 809.764 | 2.564 | n/a | 0.000 | 0.000 | 0.678 | 806.373 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.101 | 2.564 | 0.003 | 0.101 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000201 | 757.479 | 2.369 | n/a | 0.000 | 0.000 | 0.520 | 754.060 | 0.395 | n/a | 0.047 | 0.000 | n/a | n/a | 0.087 | 2.369 | 0.003 | 0.087 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001dc | 739.673 | 3.606 | n/a | 0.000 | 0.000 | 2.911 | 733.011 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.097 | 3.606 | 0.005 | 0.097 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001ef | 726.702 | 2.153 | n/a | 0.000 | 0.000 | 2.407 | 722.001 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.084 | 2.153 | 0.003 | 0.084 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001f3 | 695.981 | 2.711 | n/a | 0.000 | 0.000 | 0.589 | 692.431 | 0.110 | n/a | 0.047 | 0.000 | n/a | n/a | 0.092 | 2.711 | 0.004 | 0.092 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001e8 | 660.783 | 5.497 | n/a | 0.000 | 0.000 | 0.693 | 654.264 | 0.009 | n/a | 0.058 | 0.000 | n/a | n/a | 0.261 | 5.497 | 0.008 | 0.261 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001d9 | 606.673 | 2.038 | n/a | 0.000 | 0.000 | 0.613 | 603.759 | 0.143 | n/a | 0.049 | 0.000 | n/a | n/a | 0.072 | 2.038 | 0.003 | 0.072 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001f8 | 528.785 | 2.080 | n/a | 0.000 | 0.000 | 2.993 | 523.603 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.076 | 2.080 | 0.004 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001e0 | 494.519 | 3.525 | n/a | 0.000 | 0.000 | 2.798 | 488.071 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.066 | 3.525 | 0.007 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a000000000000020e | 488.396 | 4.560 | n/a | 0.000 | 0.000 | 0.737 | 482.841 | 0.110 | n/a | 0.044 | 0.000 | n/a | n/a | 0.104 | 4.560 | 0.009 | 0.104 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a00000000000001ed | 470.864 | 2.910 | n/a | 0.000 | 0.000 | 0.459 | 467.355 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.093 | 2.910 | 0.006 | 0.093 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / internal (754 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.798 | n/a | n/a | n/a | 3.281 | n/a | 0.000 | 0.000 | 0.259 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.364 | 3.281 | 0.257 | 8.364 |
| p99 | 127.699 | n/a | n/a | n/a | 14.107 | n/a | 1.004 | 0.000 | 0.792 | 121.499 | 0.116 | n/a | 0.052 | 0.000 | n/a | n/a | 47.591 | 14.164 | 0.854 | 47.591 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0acc6d7a70d7091a0000000000000224 | 971.421 | 2.863 | n/a | 0.000 | 0.000 | 0.329 | 967.770 | 0.266 | n/a | 0.052 | 0.000 | n/a | n/a | 0.141 | 2.863 | 0.003 | 0.141 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000225 | 868.401 | 3.733 | n/a | 0.000 | 0.000 | 0.814 | 863.475 | 0.212 | n/a | 0.068 | 0.000 | n/a | n/a | 0.099 | 3.733 | 0.004 | 0.099 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000219 | 855.228 | 1.739 | n/a | 0.000 | 0.000 | 0.484 | 852.755 | 0.125 | n/a | 0.037 | 0.000 | n/a | n/a | 0.087 | 1.739 | 0.002 | 0.087 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000220 | 739.198 | 2.231 | n/a | 0.000 | 0.000 | 0.829 | 736.020 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.070 | 2.231 | 0.003 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a000000000000021c | 715.318 | 2.172 | n/a | 0.000 | 0.000 | 0.664 | 712.354 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 0.074 | 2.172 | 0.003 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000223 | 270.007 | 2.549 | n/a | 0.000 | 0.000 | 0.499 | 266.512 | 0.339 | n/a | 0.036 | 0.000 | n/a | n/a | 0.073 | 2.549 | 0.009 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a000000000000021d | 255.175 | 2.567 | n/a | 0.000 | 0.000 | 0.495 | 251.972 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.073 | 2.567 | 0.010 | 0.073 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a000000000000021a | 127.699 | 5.292 | n/a | 0.000 | 0.000 | 0.637 | 121.499 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.218 | 5.292 | 0.041 | 0.218 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a000000000000030e | 110.264 | 3.221 | n/a | 0.000 | 0.000 | 0.724 | 106.077 | 0.113 | n/a | 0.057 | 0.000 | n/a | n/a | 0.073 | 3.221 | 0.029 | 0.073 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a00000000000005e8 | 92.571 | 6.822 | n/a | 0.000 | 0.000 | 0.770 | 84.835 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.106 | 6.822 | 0.074 | 0.106 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000758 | 90.352 | 2.780 | n/a | 0.000 | 0.000 | 0.327 | 87.047 | 0.093 | n/a | 0.019 | 0.000 | n/a | n/a | 0.086 | 2.780 | 0.031 | 0.086 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000580 | 89.797 | 8.433 | n/a | 0.000 | 0.000 | 0.707 | 80.318 | 0.116 | n/a | 0.015 | 0.000 | n/a | n/a | 0.209 | 8.433 | 0.094 | 0.209 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000663 | 88.211 | 4.354 | n/a | 0.000 | 0.000 | 0.413 | 83.247 | 0.099 | n/a | 0.027 | 0.000 | n/a | n/a | 0.072 | 4.354 | 0.049 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a00000000000002f1 | 87.448 | 7.053 | n/a | 0.000 | 0.000 | 0.802 | 79.479 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.074 | 7.053 | 0.081 | 0.074 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a00000000000004e3 | 86.254 | 6.475 | n/a | 0.000 | 0.000 | 0.774 | 78.851 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.096 | 6.475 | 0.075 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a000000000000048e | 85.636 | 4.181 | n/a | 0.890 | 0.000 | 0.525 | 79.771 | 0.115 | n/a | 0.040 | 0.000 | n/a | n/a | 0.115 | 5.071 | 0.059 | 0.115 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a000000000000079b | 84.636 | 2.564 | n/a | 0.000 | 0.000 | 0.501 | 81.344 | 0.110 | n/a | 0.015 | 0.000 | n/a | n/a | 0.101 | 2.564 | 0.030 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000641 | 80.172 | 3.485 | n/a | 0.000 | 0.000 | 0.291 | 76.309 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.072 | 3.485 | 0.043 | 0.072 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a0000000000000632 | 78.654 | 5.984 | n/a | 0.000 | 0.000 | 0.394 | 71.990 | 0.002 | n/a | 0.037 | 0.000 | n/a | n/a | 0.248 | 5.984 | 0.076 | 0.248 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a00000000000007e8 | 78.192 | 1.649 | n/a | 0.000 | 0.000 | 0.432 | 76.025 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.061 | 1.649 | 0.021 | 0.061 | gw-r/thread-45/journal/page | none observed |

## P3 / tail / internal (2257 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.984 | n/a | n/a | n/a | 4.256 | n/a | 0.000 | 0.000 | 0.256 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.430 | 4.274 | 0.359 | 6.430 |
| p99 | 365.997 | n/a | n/a | n/a | 20.811 | n/a | 1.930 | 0.000 | 1.163 | 363.995 | 0.122 | n/a | 0.039 | 0.000 | n/a | n/a | 47.914 | 22.317 | 0.844 | 47.914 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0acc6d7a70d7091a0000000000001a90 | 1002.940 | 0.078 | n/a | 0.000 | 0.000 | 0.322 | 1001.386 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 1.090 | 0.078 | 0.000 | 1.090 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001a6d | 1002.746 | 0.104 | n/a | 0.000 | 0.000 | 0.280 | 1001.149 | 0.019 | n/a | 0.060 | 0.000 | n/a | n/a | 1.135 | 0.104 | 0.000 | 1.135 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001aba | 1002.249 | 0.144 | n/a | 0.000 | 0.000 | 0.466 | 1000.482 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 1.110 | 0.144 | 0.000 | 1.110 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001a77 | 1001.002 | 3.032 | n/a | 0.000 | 0.000 | 0.449 | 997.315 | 0.116 | n/a | 0.034 | 0.000 | n/a | n/a | 0.055 | 3.032 | 0.003 | 0.055 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001ab6 | 997.851 | 3.339 | n/a | 0.000 | 0.000 | 0.531 | 993.893 | 0.011 | n/a | 0.029 | 0.000 | n/a | n/a | 0.049 | 3.339 | 0.003 | 0.049 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001ab1 | 967.230 | 2.480 | n/a | 0.000 | 0.000 | 0.326 | 964.330 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.058 | 2.480 | 0.003 | 0.058 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001a81 | 959.516 | 5.717 | n/a | 0.000 | 0.000 | 0.437 | 953.156 | 0.011 | n/a | 0.039 | 0.000 | n/a | n/a | 0.157 | 5.717 | 0.006 | 0.157 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001a6b | 956.014 | 4.672 | n/a | 0.000 | 0.000 | 0.689 | 950.396 | 0.105 | n/a | 0.054 | 0.000 | n/a | n/a | 0.098 | 4.672 | 0.005 | 0.098 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001a72 | 935.373 | 4.825 | n/a | 0.000 | 0.000 | 0.635 | 929.674 | 0.114 | n/a | 0.024 | 0.000 | n/a | n/a | 0.100 | 4.825 | 0.005 | 0.100 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001a6f | 858.658 | 12.289 | n/a | 1.379 | 0.000 | 0.689 | 843.740 | 0.020 | n/a | 0.052 | 0.000 | n/a | n/a | 0.489 | 13.668 | 0.016 | 0.489 | gw-r/thread-46/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001a93 | 795.473 | 2.112 | n/a | 0.000 | 0.000 | 0.524 | 792.715 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.073 | 2.112 | 0.003 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001ab3 | 758.426 | 2.077 | n/a | 0.000 | 0.000 | 0.502 | 755.670 | 0.088 | n/a | 0.029 | 0.000 | n/a | n/a | 0.059 | 2.077 | 0.003 | 0.059 | gw-r/thread-43/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001a8c | 712.696 | 3.278 | n/a | 0.000 | 0.000 | 0.518 | 708.703 | 0.107 | n/a | 0.025 | 0.000 | n/a | n/a | 0.065 | 3.278 | 0.005 | 0.065 | gw-r/thread-50/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001a87 | 628.771 | 2.463 | n/a | 0.000 | 0.000 | 0.364 | 625.770 | 0.082 | n/a | 0.034 | 0.000 | n/a | n/a | 0.057 | 2.463 | 0.004 | 0.057 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001a78 | 597.063 | 3.953 | n/a | 0.000 | 0.000 | 0.632 | 592.179 | 0.094 | n/a | 0.031 | 0.000 | n/a | n/a | 0.173 | 3.953 | 0.007 | 0.173 | gw-r/thread-49/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001aad | 575.525 | 2.185 | n/a | 0.000 | 0.000 | 1.853 | 571.290 | 0.102 | n/a | 0.046 | 0.000 | n/a | n/a | 0.049 | 2.185 | 0.004 | 0.049 | gw-r/thread-48/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001a95 | 570.178 | 15.180 | n/a | 0.000 | 0.000 | 0.501 | 554.010 | 0.010 | n/a | 0.035 | 0.000 | n/a | n/a | 0.442 | 15.180 | 0.027 | 0.442 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001aab | 530.608 | 2.318 | n/a | 0.000 | 0.000 | 0.409 | 527.665 | 0.104 | n/a | 0.047 | 0.000 | n/a | n/a | 0.065 | 2.318 | 0.004 | 0.065 | gw-r/thread-47/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001aa3 | 468.187 | 3.164 | n/a | 0.000 | 0.000 | 0.608 | 464.322 | 0.009 | n/a | 0.020 | 0.000 | n/a | n/a | 0.064 | 3.164 | 0.007 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 0acc6d7a70d7091a0000000000001aa1 | 454.021 | 2.407 | n/a | 0.000 | 0.000 | 0.486 | 451.054 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.046 | 2.407 | 0.005 | 0.046 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / read (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.021 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 200.953 | 0.014 | n/a | 0.133 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 206.598 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.367 | 201.618 | 3.754 | n/a | 0.300 | 0.000 | n/a | n/a | 0.657 | 0.000 | 0.000 | 0.657 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9be5dde169bda2100000000000000009 | 206.598 | 0.000 | n/a | 0.000 | 0.000 | 4.367 | 201.349 | 0.015 | n/a | 0.210 | 0.000 | n/a | n/a | 0.657 | 0.000 | 0.000 | 0.657 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda2100000000000000022 | 203.459 | 0.000 | n/a | 0.000 | 0.000 | 2.126 | 200.953 | 0.012 | n/a | 0.135 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda2100000000000000008 | 203.218 | 0.000 | n/a | 0.000 | 0.000 | 1.540 | 201.365 | 0.013 | n/a | 0.166 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda210000000000000001f | 203.157 | 0.000 | n/a | 0.000 | 0.000 | 1.457 | 201.297 | 0.047 | n/a | 0.176 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda2100000000000000057 | 203.088 | 0.000 | n/a | 0.000 | 0.000 | 1.097 | 201.553 | 0.019 | n/a | 0.224 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda2100000000000000014 | 203.029 | 0.000 | n/a | 0.000 | 0.000 | 1.296 | 201.339 | 0.016 | n/a | 0.177 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda2100000000000000046 | 203.010 | 0.000 | n/a | 0.000 | 0.000 | 0.905 | 201.598 | 0.048 | n/a | 0.300 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda210000000000000000e | 202.987 | 0.000 | n/a | 0.000 | 0.000 | 0.963 | 201.602 | 0.014 | n/a | 0.270 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda2100000000000000020 | 202.949 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 201.618 | 0.022 | n/a | 0.260 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda210000000000000004b | 202.742 | 0.000 | n/a | 0.000 | 0.000 | 1.623 | 200.804 | 0.013 | n/a | 0.113 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-46/journal/page | none observed |
| 9be5dde169bda2100000000000000036 | 202.706 | 0.000 | n/a | 0.000 | 0.000 | 0.770 | 201.588 | 0.035 | n/a | 0.211 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda210000000000000002e | 202.668 | 0.000 | n/a | 0.000 | 0.000 | 0.767 | 201.490 | 0.025 | n/a | 0.269 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda2100000000000000023 | 202.574 | 0.000 | n/a | 0.000 | 0.000 | 0.682 | 201.547 | 0.043 | n/a | 0.192 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda2100000000000000017 | 202.520 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 201.213 | 0.061 | n/a | 0.193 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda2100000000000000047 | 202.508 | 0.000 | n/a | 0.000 | 0.000 | 0.921 | 201.320 | 0.012 | n/a | 0.141 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 9be5dde169bda210000000000000002c | 202.489 | 0.000 | n/a | 0.000 | 0.000 | 0.850 | 201.207 | 0.042 | n/a | 0.219 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda2100000000000000056 | 202.474 | 0.000 | n/a | 0.000 | 0.000 | 1.108 | 201.045 | 0.013 | n/a | 0.117 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-46/journal/page | none observed |
| 9be5dde169bda210000000000000003b | 202.471 | 0.000 | n/a | 0.000 | 0.000 | 0.631 | 201.510 | 0.018 | n/a | 0.148 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda210000000000000002a | 202.448 | 0.000 | n/a | 0.000 | 0.000 | 0.666 | 201.406 | 0.030 | n/a | 0.221 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-46/journal/page | none observed |
| 9be5dde169bda2100000000000000035 | 202.443 | 0.000 | n/a | 0.000 | 0.000 | 0.996 | 201.061 | 0.012 | n/a | 0.171 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.825 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.774 | 200.841 | 0.014 | n/a | 0.101 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 206.729 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.350 | 205.060 | 4.034 | n/a | 3.317 | 0.000 | n/a | n/a | 0.337 | 0.000 | 0.000 | 0.337 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9be5dde169bda2100000000000000074 | 206.729 | 0.000 | n/a | 0.000 | 0.000 | 1.350 | 205.060 | 0.020 | n/a | 0.144 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda2100000000000000086 | 203.278 | 0.000 | n/a | 0.000 | 0.000 | 1.070 | 201.816 | 0.037 | n/a | 0.217 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda21000000000000000b3 | 203.188 | 0.000 | n/a | 0.000 | 0.000 | 0.537 | 202.324 | 0.080 | n/a | 0.143 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda21000000000000000b5 | 202.989 | 0.000 | n/a | 0.000 | 0.000 | 1.097 | 201.606 | 0.022 | n/a | 0.129 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 9be5dde169bda2100000000000000077 | 202.941 | 0.000 | n/a | 0.000 | 0.000 | 1.177 | 201.335 | 0.014 | n/a | 0.216 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda210000000000000006b | 202.921 | 0.000 | n/a | 0.000 | 0.000 | 1.302 | 201.240 | 0.013 | n/a | 0.121 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda21000000000000000a3 | 202.653 | 0.000 | n/a | 0.000 | 0.000 | 0.923 | 201.391 | 0.023 | n/a | 0.162 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda2100000000000000066 | 202.606 | 0.000 | n/a | 0.000 | 0.000 | 1.223 | 201.125 | 0.020 | n/a | 0.134 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda21000000000000000b2 | 202.606 | 0.000 | n/a | 0.000 | 0.000 | 1.055 | 201.248 | 0.010 | n/a | 0.133 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda210000000000000006d | 202.504 | 0.000 | n/a | 0.000 | 0.000 | 0.905 | 201.317 | 0.054 | n/a | 0.116 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda21000000000000000be | 202.493 | 0.000 | n/a | 0.000 | 0.000 | 0.978 | 201.229 | 0.012 | n/a | 0.148 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda2100000000000000080 | 202.488 | 0.000 | n/a | 0.000 | 0.000 | 0.544 | 201.622 | 0.071 | n/a | 0.146 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda21000000000000000bd | 202.485 | 0.000 | n/a | 0.000 | 0.000 | 0.820 | 201.392 | 0.018 | n/a | 0.116 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda210000000000000006f | 202.454 | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 201.375 | 0.046 | n/a | 0.162 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda210000000000000007f | 202.415 | 0.000 | n/a | 0.000 | 0.000 | 0.863 | 201.245 | 0.020 | n/a | 0.147 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda21000000000000000b0 | 202.407 | 0.000 | n/a | 0.000 | 0.000 | 0.841 | 201.162 | 0.018 | n/a | 0.143 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda2100000000000000062 | 202.391 | 0.000 | n/a | 0.000 | 0.000 | 0.862 | 201.250 | 0.014 | n/a | 0.115 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda21000000000000000b8 | 202.380 | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 201.274 | 0.017 | n/a | 0.152 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda210000000000000009e | 202.313 | 0.000 | n/a | 0.000 | 0.000 | 1.094 | 200.839 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.268 | 0.000 | 0.000 | 0.268 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda210000000000000005d | 202.311 | 0.000 | n/a | 0.000 | 0.000 | 0.988 | 200.964 | 0.037 | n/a | 0.128 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / read (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.837 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 200.800 | 0.012 | n/a | 0.101 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 |
| p99 | 204.532 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.845 | 203.214 | 18.264 | n/a | 0.306 | 0.000 | n/a | n/a | 49.698 | 0.000 | 0.000 | 49.698 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9be5dde169bda21000000000000000d1 | 204.532 | 0.000 | n/a | 0.000 | 0.000 | 1.007 | 203.214 | 0.033 | n/a | 0.142 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda21000000000000000e4 | 204.018 | 0.000 | n/a | 0.000 | 0.000 | 0.898 | 202.825 | 0.015 | n/a | 0.162 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda2100000000000000122 | 203.730 | 0.000 | n/a | 0.000 | 0.000 | 2.845 | 200.686 | 0.009 | n/a | 0.087 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda21000000000000000f5 | 202.958 | 0.000 | n/a | 0.000 | 0.000 | 1.051 | 201.442 | 0.065 | n/a | 0.140 | 0.000 | n/a | n/a | 0.260 | 0.000 | 0.000 | 0.260 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda21000000000000000f9 | 202.942 | 0.000 | n/a | 0.000 | 0.000 | 0.911 | 201.620 | 0.020 | n/a | 0.266 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda210000000000000010e | 202.902 | 0.000 | n/a | 0.000 | 0.000 | 1.165 | 201.370 | 0.018 | n/a | 0.163 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda21000000000000000e2 | 202.900 | 0.000 | n/a | 0.000 | 0.000 | 1.071 | 201.431 | 0.031 | n/a | 0.188 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda21000000000000000ce | 202.896 | 0.000 | n/a | 0.000 | 0.000 | 1.151 | 201.328 | 0.041 | n/a | 0.177 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda21000000000000000d5 | 202.763 | 0.000 | n/a | 0.000 | 0.000 | 1.066 | 201.254 | 0.016 | n/a | 0.112 | 0.000 | n/a | n/a | 0.315 | 0.000 | 0.000 | 0.315 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda2100000000000000111 | 202.742 | 0.000 | n/a | 0.000 | 0.000 | 1.212 | 201.167 | 0.012 | n/a | 0.124 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda21000000000000000e5 | 202.683 | 0.000 | n/a | 0.000 | 0.000 | 0.649 | 201.693 | 0.010 | n/a | 0.103 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda21000000000000000e7 | 202.666 | 0.000 | n/a | 0.000 | 0.000 | 0.687 | 201.590 | 0.042 | n/a | 0.235 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda21000000000000000f0 | 202.661 | 0.000 | n/a | 0.000 | 0.000 | 0.752 | 201.547 | 0.043 | n/a | 0.177 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda2100000000000000124 | 202.641 | 0.000 | n/a | 0.000 | 0.000 | 0.583 | 201.654 | 0.077 | n/a | 0.210 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda21000000000000000da | 202.597 | 0.000 | n/a | 0.000 | 0.000 | 0.697 | 201.414 | 0.052 | n/a | 0.306 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda21000000000000000cd | 202.555 | 0.000 | n/a | 0.000 | 0.000 | 0.914 | 201.299 | 0.018 | n/a | 0.147 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda21000000000000000f7 | 202.549 | 0.000 | n/a | 0.000 | 0.000 | 1.271 | 200.995 | 0.008 | n/a | 0.099 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda21000000000000000d7 | 202.522 | 0.000 | n/a | 0.000 | 0.000 | 0.989 | 201.210 | 0.009 | n/a | 0.183 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda210000000000000011b | 202.521 | 0.000 | n/a | 0.000 | 0.000 | 0.522 | 201.727 | 0.017 | n/a | 0.139 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda21000000000000000c7 | 202.511 | 0.000 | n/a | 0.000 | 0.000 | 1.084 | 201.133 | 0.010 | n/a | 0.144 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-43/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.740 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.678 | 200.846 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 204.192 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.257 | 202.908 | 1.236 | n/a | 0.248 | 0.000 | n/a | n/a | 0.288 | 0.000 | 0.000 | 0.288 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9be5dde169bda2100000000000000137 | 204.192 | 0.000 | n/a | 0.000 | 0.000 | 1.042 | 202.908 | 0.018 | n/a | 0.061 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-46/journal/page | none observed |
| 9be5dde169bda2100000000000000158 | 203.255 | 0.000 | n/a | 0.000 | 0.000 | 0.739 | 202.047 | 0.019 | n/a | 0.248 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda2100000000000000184 | 202.809 | 0.000 | n/a | 0.000 | 0.000 | 1.013 | 201.563 | 0.010 | n/a | 0.117 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 9be5dde169bda2100000000000000151 | 202.749 | 0.000 | n/a | 0.000 | 0.000 | 0.452 | 202.028 | 0.068 | n/a | 0.085 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda210000000000000016e | 202.677 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 201.531 | 0.013 | n/a | 0.113 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda2100000000000000138 | 202.515 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 201.552 | 0.020 | n/a | 0.131 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda2100000000000000180 | 202.513 | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 201.537 | 0.015 | n/a | 0.101 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda2100000000000000157 | 202.458 | 0.000 | n/a | 0.000 | 0.000 | 0.892 | 201.213 | 0.008 | n/a | 0.088 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda210000000000000015d | 202.448 | 0.000 | n/a | 0.000 | 0.000 | 0.745 | 201.396 | 0.013 | n/a | 0.101 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda2100000000000000126 | 202.318 | 0.000 | n/a | 0.000 | 0.000 | 1.133 | 200.906 | 0.006 | n/a | 0.075 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda2100000000000000167 | 202.306 | 0.000 | n/a | 0.000 | 0.000 | 0.810 | 201.251 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda2100000000000000149 | 202.292 | 0.000 | n/a | 0.000 | 0.000 | 1.046 | 200.932 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda210000000000000016d | 202.240 | 0.000 | n/a | 0.000 | 0.000 | 0.595 | 201.430 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda2100000000000000185 | 202.214 | 0.000 | n/a | 0.000 | 0.000 | 0.585 | 201.403 | 0.013 | n/a | 0.103 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda2100000000000000178 | 202.200 | 0.000 | n/a | 0.000 | 0.000 | 0.886 | 201.110 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda210000000000000015c | 202.132 | 0.000 | n/a | 0.000 | 0.000 | 0.590 | 201.320 | 0.016 | n/a | 0.094 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda210000000000000012c | 202.120 | 0.000 | n/a | 0.000 | 0.000 | 0.712 | 201.031 | 0.012 | n/a | 0.163 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda2100000000000000140 | 202.116 | 0.000 | n/a | 0.000 | 0.000 | 0.788 | 201.119 | 0.009 | n/a | 0.092 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda2100000000000000152 | 202.111 | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 201.282 | 0.037 | n/a | 0.082 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda210000000000000015a | 202.101 | 0.000 | n/a | 0.000 | 0.000 | 0.730 | 201.150 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-47/journal/page | none observed |

## P3 / L64 / read (106 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.647 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.718 | 200.815 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 |
| p99 | 202.778 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.554 | 201.498 | 3.603 | n/a | 0.113 | 0.000 | n/a | n/a | 0.370 | 0.000 | 0.000 | 0.370 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9be5dde169bda21000000000000001db | 202.861 | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 201.719 | 0.013 | n/a | 0.107 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda2100000000000000191 | 202.778 | 0.000 | n/a | 0.000 | 0.000 | 1.359 | 200.797 | 0.007 | n/a | 0.076 | 0.000 | n/a | n/a | 0.539 | 0.000 | 0.000 | 0.539 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda21000000000000001c9 | 202.709 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 201.339 | 0.016 | n/a | 0.064 | 0.000 | n/a | n/a | 0.370 | 0.000 | 0.000 | 0.370 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda21000000000000001d2 | 202.634 | 0.000 | n/a | 0.000 | 0.000 | 0.912 | 201.446 | 0.014 | n/a | 0.098 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda210000000000000018f | 202.452 | 0.000 | n/a | 0.000 | 0.000 | 0.695 | 201.498 | 0.013 | n/a | 0.101 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda21000000000000001ef | 202.398 | 0.000 | n/a | 0.000 | 0.000 | 1.272 | 200.855 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda21000000000000001ff | 202.370 | 0.000 | n/a | 0.000 | 0.000 | 0.584 | 201.451 | 0.014 | n/a | 0.113 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda2100000000000000198 | 202.368 | 0.000 | n/a | 0.000 | 0.000 | 0.991 | 201.098 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda210000000000000018e | 202.361 | 0.000 | n/a | 0.000 | 0.000 | 1.054 | 201.038 | 0.020 | n/a | 0.064 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda21000000000000001e1 | 202.351 | 0.000 | n/a | 0.000 | 0.000 | 0.847 | 201.234 | 0.010 | n/a | 0.111 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda21000000000000001a4 | 202.337 | 0.000 | n/a | 0.000 | 0.000 | 1.332 | 200.776 | 0.013 | n/a | 0.089 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda21000000000000001a6 | 202.325 | 0.000 | n/a | 0.000 | 0.000 | 0.983 | 201.036 | 0.007 | n/a | 0.101 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda21000000000000001f7 | 202.273 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 201.143 | 0.018 | n/a | 0.099 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda210000000000000018c | 202.190 | 0.000 | n/a | 0.000 | 0.000 | 1.054 | 200.875 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda21000000000000001f9 | 202.180 | 0.000 | n/a | 0.000 | 0.000 | 0.959 | 201.016 | 0.017 | n/a | 0.073 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda21000000000000001fd | 202.156 | 0.000 | n/a | 0.000 | 0.000 | 0.831 | 201.022 | 0.017 | n/a | 0.076 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda21000000000000001b7 | 202.142 | 0.000 | n/a | 0.000 | 0.000 | 0.842 | 201.098 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda210000000000000019e | 202.132 | 0.000 | n/a | 0.000 | 0.000 | 0.764 | 201.140 | 0.023 | n/a | 0.065 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda21000000000000001dc | 202.106 | 0.000 | n/a | 0.000 | 0.000 | 0.900 | 200.968 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda21000000000000001c4 | 202.102 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 200.927 | 0.011 | n/a | 0.068 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / read (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.646 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.663 | 200.759 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 |
| p99 | 203.818 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.267 | 202.820 | 0.642 | n/a | 0.134 | 0.000 | n/a | n/a | 0.324 | 0.000 | 0.000 | 0.324 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9be5dde169bda2100000000000000219 | 220.088 | 0.000 | n/a | 0.000 | 0.000 | 1.267 | 218.432 | 0.032 | n/a | 0.057 | 0.000 | n/a | n/a | 0.301 | 0.000 | 0.000 | 0.301 | gw-r/thread-46/journal/page | none observed |
| 9be5dde169bda210000000000000020e | 203.818 | 0.000 | n/a | 0.000 | 0.000 | 0.790 | 202.820 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-46/journal/page | none observed |
| 9be5dde169bda210000000000000020b | 202.701 | 0.000 | n/a | 0.000 | 0.000 | 0.804 | 201.610 | 0.012 | n/a | 0.137 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda2100000000000000247 | 202.692 | 0.000 | n/a | 0.000 | 0.000 | 1.189 | 201.213 | 0.008 | n/a | 0.087 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda2100000000000000209 | 202.459 | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 201.462 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda2100000000000000225 | 202.411 | 0.000 | n/a | 0.000 | 0.000 | 1.003 | 201.174 | 0.014 | n/a | 0.081 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda2100000000000000208 | 202.394 | 0.000 | n/a | 0.000 | 0.000 | 0.857 | 201.260 | 0.043 | n/a | 0.102 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda210000000000000022b | 202.316 | 0.000 | n/a | 0.000 | 0.000 | 0.654 | 201.388 | 0.012 | n/a | 0.134 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda210000000000000021a | 202.299 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 201.259 | 0.017 | n/a | 0.090 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda2100000000000000241 | 202.240 | 0.000 | n/a | 0.000 | 0.000 | 1.416 | 200.602 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda2100000000000000257 | 202.233 | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 201.200 | 0.011 | n/a | 0.112 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda2100000000000000233 | 202.194 | 0.000 | n/a | 0.000 | 0.000 | 0.872 | 201.136 | 0.006 | n/a | 0.078 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda210000000000000023f | 202.190 | 0.000 | n/a | 0.000 | 0.000 | 0.718 | 201.151 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda2100000000000000243 | 202.186 | 0.000 | n/a | 0.000 | 0.000 | 1.003 | 200.927 | 0.006 | n/a | 0.089 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda2100000000000000227 | 202.182 | 0.000 | n/a | 0.000 | 0.000 | 0.779 | 201.201 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda210000000000000024f | 202.175 | 0.000 | n/a | 0.000 | 0.000 | 0.477 | 201.403 | 0.020 | n/a | 0.132 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda2100000000000000232 | 202.154 | 0.000 | n/a | 0.000 | 0.000 | 0.721 | 201.187 | 0.010 | n/a | 0.112 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda210000000000000023e | 202.099 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 201.178 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-46/journal/page | none observed |
| 9be5dde169bda210000000000000023d | 202.082 | 0.000 | n/a | 0.000 | 0.000 | 0.744 | 201.055 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda2100000000000000250 | 202.069 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 200.985 | 0.016 | n/a | 0.073 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-50/journal/page | none observed |

## P3 / L1024 / read (61 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 78.109 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 77.518 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 219.953 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 19.049 | 201.361 | 2.637 | n/a | 0.131 | 0.000 | n/a | n/a | 50.527 | 0.000 | 0.000 | 50.527 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9be5dde169bda2100000000000000274 | 219.953 | 0.000 | n/a | 0.000 | 0.000 | 19.049 | 200.740 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda210000000000000028d | 202.372 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 201.361 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda2100000000000000280 | 202.360 | 0.000 | n/a | 0.000 | 0.000 | 0.940 | 201.179 | 0.011 | n/a | 0.080 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda2100000000000000276 | 202.245 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 201.094 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda2100000000000000287 | 202.237 | 0.000 | n/a | 0.000 | 0.000 | 0.728 | 201.287 | 0.015 | n/a | 0.086 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda2100000000000000281 | 202.150 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 201.292 | 0.015 | n/a | 0.096 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda210000000000000027a | 202.138 | 0.000 | n/a | 0.000 | 0.000 | 0.864 | 201.051 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-46/journal/page | none observed |
| 9be5dde169bda2100000000000000279 | 202.001 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 200.950 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda2100000000000000284 | 201.986 | 0.000 | n/a | 0.000 | 0.000 | 0.669 | 201.059 | 0.020 | n/a | 0.075 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda210000000000000027b | 201.863 | 0.000 | n/a | 0.000 | 0.000 | 0.772 | 200.886 | 0.006 | n/a | 0.091 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda2100000000000000282 | 201.796 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 200.823 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda2100000000000000275 | 201.703 | 0.000 | n/a | 0.000 | 0.000 | 0.438 | 201.086 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda2100000000000000288 | 201.651 | 0.000 | n/a | 0.000 | 0.000 | 0.674 | 200.806 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda2100000000000000289 | 201.597 | 0.000 | n/a | 0.000 | 0.000 | 0.510 | 200.913 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda2100000000000000286 | 201.450 | 0.000 | n/a | 0.000 | 0.000 | 0.430 | 200.855 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda210000000000000028c | 201.386 | 0.000 | n/a | 0.000 | 0.000 | 0.520 | 200.686 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda210000000000000028b | 201.223 | 0.000 | n/a | 0.000 | 0.000 | 0.429 | 200.637 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda210000000000000027d | 201.120 | 0.000 | n/a | 0.000 | 0.000 | 0.344 | 200.615 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda210000000000000028e | 197.021 | 0.000 | n/a | 0.000 | 0.000 | 0.700 | 196.111 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda2100000000000000277 | 190.248 | 0.000 | n/a | 0.000 | 0.000 | 0.501 | 189.578 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-43/journal/page | none observed |

## P3 / tail / read (220 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 83.800 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.496 | 82.694 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 |
| p99 | 202.328 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.490 | 201.093 | 2.823 | n/a | 0.109 | 0.000 | n/a | n/a | 50.207 | 0.000 | 0.000 | 50.207 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9be5dde169bda2100000000000000ec6 | 202.631 | 0.000 | n/a | 0.000 | 0.000 | 0.585 | 200.782 | 0.004 | n/a | 0.056 | 0.000 | n/a | n/a | 1.204 | 0.000 | 0.000 | 1.204 | gw-r/thread-46/journal/page | none observed |
| 9be5dde169bda2100000000000000ea7 | 202.404 | 0.000 | n/a | 0.000 | 0.000 | 0.849 | 201.266 | 0.017 | n/a | 0.129 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda2100000000000000ef1 | 202.328 | 0.000 | n/a | 0.000 | 0.000 | 1.490 | 200.656 | 0.010 | n/a | 0.041 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda2100000000000000eb5 | 202.122 | 0.000 | n/a | 0.000 | 0.000 | 0.837 | 200.992 | 0.007 | n/a | 0.084 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-48/journal/page | none observed |
| 9be5dde169bda2100000000000000ee6 | 202.043 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 200.917 | 0.018 | n/a | 0.054 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-46/journal/page | none observed |
| 9be5dde169bda2100000000000000eeb | 202.028 | 0.000 | n/a | 0.000 | 0.000 | 0.817 | 200.934 | 0.004 | n/a | 0.100 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda2100000000000000ede | 201.956 | 0.000 | n/a | 0.000 | 0.000 | 0.638 | 201.076 | 0.007 | n/a | 0.102 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda2100000000000000eb4 | 201.910 | 0.000 | n/a | 0.000 | 0.000 | 0.447 | 201.206 | 0.019 | n/a | 0.110 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda2100000000000000ea8 | 201.900 | 0.000 | n/a | 0.000 | 0.000 | 0.642 | 201.025 | 0.009 | n/a | 0.093 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda2100000000000000ee2 | 201.880 | 0.000 | n/a | 0.000 | 0.000 | 0.629 | 201.093 | 0.009 | n/a | 0.017 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda2100000000000000e88 | 201.841 | 0.000 | n/a | 0.000 | 0.000 | 0.539 | 201.085 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| 9be5dde169bda2100000000000000e89 | 201.834 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 201.057 | 0.019 | n/a | 0.070 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda2100000000000000ebf | 201.825 | 0.000 | n/a | 0.000 | 0.000 | 1.058 | 200.604 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 9be5dde169bda2100000000000000e99 | 201.817 | 0.000 | n/a | 0.000 | 0.000 | 0.493 | 201.082 | 0.021 | n/a | 0.100 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda2100000000000000e7f | 201.803 | 0.000 | n/a | 0.000 | 0.000 | 0.544 | 200.997 | 0.012 | n/a | 0.059 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda2100000000000000ecf | 201.737 | 0.000 | n/a | 0.000 | 0.000 | 0.613 | 200.835 | 0.027 | n/a | 0.062 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-50/journal/page | none observed |
| 9be5dde169bda2100000000000000ee4 | 201.695 | 0.000 | n/a | 0.000 | 0.000 | 0.689 | 200.686 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.267 | 0.000 | 0.000 | 0.267 | gw-r/thread-46/journal/page | none observed |
| 9be5dde169bda2100000000000000ee5 | 201.691 | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 200.794 | 0.015 | n/a | 0.064 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-43/journal/page | none observed |
| 9be5dde169bda2100000000000000eaf | 201.659 | 0.000 | n/a | 0.000 | 0.000 | 0.610 | 200.885 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-45/journal/page | none observed |
| 9be5dde169bda2100000000000000e8d | 201.653 | 0.000 | n/a | 0.000 | 0.000 | 0.620 | 200.809 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-48/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
