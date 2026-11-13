# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (315.592 ms, trace `82c92547d6bdceae00000000000000fb`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (185.878 ms, trace `82c92547d6bdceae00000000000000b5`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (153.646 ms, trace `82c92547d6bdceae00000000000000b6`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (142.115 ms, trace `82c92547d6bdceae000000000000010f`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (145.286 ms, trace `82c92547d6bdceae00000000000000c8`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p2-smoke-d`; source `ada3e449dc2e0e9647e9243a15b89b5c760173ac`; subjects 1000; tracing full.

Recorders: gateway, gw-jfr, native-logs, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 94/94 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 94/94. Raw trace bytes: 2948392.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 109 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1893.639 | 258.092 | 417.628 | 39 |
| baseline | 0 | 1665.963 | 39.684 | 0.179 | 58 |
| L1 | 1 | 1042.155 | 63.470 | 5.608 | 30 |
| L4 | 4 | 1877.512 | 292.336 | 266.638 | 30 |
| L16 | 16 | 1313.383 | 131.139 | 154.071 | 39 |
| L64 | 16 | 1779.095 | 154.167 | 191.459 | 58 |
| L256 | 16 | 1000.029 | 133.172 | 89.280 | 39 |
| L1024 | 16 | 1867.321 | 250.366 | 323.811 | 16 |
| recovery | 16 | 1944.085 | 194.284 | 228.097 | 71 |
| p4mix | 1 | 1049.295 | 20.618 | 20.007 | 30 |
| p4h1 | 1 | 1151.704 | 133.542 | 33.717 | 44 |
| grow3 | 0 | 2535.156 | 503.125 | 28.679 | 119 |
| p4h3 | 1 | 2051.051 | 39.095 | 32.597 | 38 |
| grow10 | 0 | 522.663 | 58.372 | 9.033 | 50 |
| p4h10 | 1 | 2043.967 | 43.826 | 31.547 | 66 |
| presweep | 16 | 1056.166 | 81.284 | 95.267 | 58 |
| sweep | 16 | 117.463 | 37.403 | 41.245 | 140 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 82c92547d6bdceae00000000000000fb | driver.queue.scheduler-dispatch | 0.144 | none | 0 / 32 |
| 82c92547d6bdceae00000000000000fb | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace 82c92547d6bdceae00000000000000fb waited: []

| 82c92547d6bdceae00000000000000b5 | driver.queue.scheduler-late | 0.438 | none | 0 / 32 |
| 82c92547d6bdceae00000000000000b5 | driver.queue.scheduler-dispatch | 0.064 | none | 0 / 32 |

Observed active steps while trace 82c92547d6bdceae00000000000000b5 waited: []

| 82c92547d6bdceae00000000000000b6 | driver.queue.scheduler-dispatch | 0.077 | none | 1 / 32 |
| 82c92547d6bdceae00000000000000b6 | driver.queue.scheduler-late | 0.003 | none | 1 / 32 |

Observed active steps while trace 82c92547d6bdceae00000000000000b6 waited: []

| 82c92547d6bdceae000000000000010f | driver.queue.scheduler-late | 0.762 | none | 0 / 32 |
| 82c92547d6bdceae000000000000010f | driver.queue.scheduler-dispatch | 0.081 | none | 0 / 32 |

Observed active steps while trace 82c92547d6bdceae000000000000010f waited: []

| 82c92547d6bdceae00000000000000c8 | driver.queue.scheduler-dispatch | 0.076 | none | 0 / 32 |
| 82c92547d6bdceae00000000000000c8 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 82c92547d6bdceae00000000000000c8 waited: []

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 44.167 | 0.319 | 0.000 | 0.576 | 11.794 | 0.008 | 0.000 | 0.161 | 2.022 | 5.179 | 0.089 | 0.000 | 1.760 | 18.173 | n/a | n/a | 0.119 | 12.435 | 0.255 | 0.119 |
| p99 | 107.789 | 3.588 | 0.000 | 3.717 | 40.513 | 4.878 | 0.000 | 1.429 | 5.115 | 11.243 | 0.353 | 0.000 | 6.045 | 43.668 | n/a | n/a | 0.545 | 45.552 | 0.423 | 0.545 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae0000000000000095 | 107.789 | 40.513 | 4.878 | 0.000 | 0.161 | 5.115 | 11.243 | 0.353 | 0.000 | 1.760 | 43.668 | n/a | n/a | 0.098 | 45.552 | 0.423 | 0.098 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000092 | 52.156 | 11.877 | 0.005 | 0.000 | 1.429 | 2.022 | 10.204 | 0.197 | 0.000 | 6.045 | 19.831 | n/a | n/a | 0.545 | 13.311 | 0.255 | 0.545 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000099 | 44.167 | 11.794 | 0.519 | 0.000 | 0.123 | 5.038 | 5.179 | 0.089 | 0.000 | 3.135 | 18.173 | n/a | n/a | 0.119 | 12.435 | 0.282 | 0.119 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000096 | 24.408 | 4.040 | 0.008 | 0.000 | 0.786 | 1.589 | 2.443 | 0.083 | 0.000 | 1.166 | 14.126 | n/a | n/a | 0.167 | 4.835 | 0.198 | 0.167 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.408 | 0.732 | 0.000 | 1.730 | 4.040 | 0.008 | 0.000 | 0.786 | 1.589 | 2.443 | 0.083 | 0.000 | 1.166 | 14.126 | n/a | n/a | 0.167 | 4.835 | 0.198 | 0.167 |
| p99 | 24.408 | 0.732 | 0.000 | 1.730 | 4.040 | 0.008 | 0.000 | 0.786 | 1.589 | 2.443 | 0.083 | 0.000 | 1.166 | 14.126 | n/a | n/a | 0.167 | 4.835 | 0.198 | 0.167 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae0000000000000096 | 24.408 | 4.040 | 0.008 | 0.000 | 0.786 | 1.589 | 2.443 | 0.083 | 0.000 | 1.166 | 14.126 | n/a | n/a | 0.167 | 4.835 | 0.198 | 0.167 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.461 | 0.321 | 0.000 | 1.504 | 5.573 | 0.004 | 0.000 | 0.145 | 1.425 | 4.125 | 0.046 | 0.000 | 0.987 | 14.676 | n/a | n/a | 0.085 | 5.928 | 0.210 | 0.085 |
| p99 | 34.825 | 1.012 | 0.000 | 2.053 | 8.417 | 0.307 | 0.000 | 0.931 | 4.187 | 5.696 | 0.177 | 0.000 | 6.631 | 20.708 | n/a | n/a | 0.141 | 8.800 | 0.276 | 0.141 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000a3 | 34.825 | 5.573 | 0.278 | 0.000 | 0.078 | 3.130 | 5.696 | 0.177 | 0.000 | 6.631 | 13.178 | n/a | n/a | 0.085 | 5.928 | 0.170 | 0.085 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae000000000000009d | 34.593 | 8.417 | 0.307 | 0.000 | 0.075 | 4.187 | 4.125 | 0.075 | 0.000 | 0.987 | 16.369 | n/a | n/a | 0.050 | 8.800 | 0.254 | 0.050 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000a1 | 34.461 | 5.844 | 0.004 | 0.000 | 0.145 | 1.425 | 4.926 | 0.046 | 0.000 | 1.269 | 20.708 | n/a | n/a | 0.095 | 5.993 | 0.174 | 0.095 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae000000000000009a | 22.583 | 3.801 | 0.004 | 0.000 | 0.931 | 1.122 | 1.429 | 0.046 | 0.000 | 0.505 | 14.676 | n/a | n/a | 0.072 | 4.735 | 0.210 | 0.072 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae000000000000009f | 13.739 | 3.155 | 0.004 | 0.000 | 0.627 | 0.808 | 1.190 | 0.044 | 0.000 | 0.498 | 7.273 | n/a | n/a | 0.141 | 3.786 | 0.276 | 0.141 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.739 | 0.288 | 0.000 | 1.504 | 3.155 | 0.004 | 0.000 | 0.627 | 0.808 | 1.190 | 0.044 | 0.000 | 0.498 | 7.273 | n/a | n/a | 0.072 | 3.786 | 0.210 | 0.072 |
| p99 | 22.583 | 1.012 | 0.000 | 1.745 | 3.801 | 0.004 | 0.000 | 0.931 | 1.122 | 1.429 | 0.046 | 0.000 | 0.505 | 14.676 | n/a | n/a | 0.141 | 4.735 | 0.276 | 0.141 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae000000000000009a | 22.583 | 3.801 | 0.004 | 0.000 | 0.931 | 1.122 | 1.429 | 0.046 | 0.000 | 0.505 | 14.676 | n/a | n/a | 0.072 | 4.735 | 0.210 | 0.072 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae000000000000009f | 13.739 | 3.155 | 0.004 | 0.000 | 0.627 | 0.808 | 1.190 | 0.044 | 0.000 | 0.498 | 7.273 | n/a | n/a | 0.141 | 3.786 | 0.276 | 0.141 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.894 | 0.179 | 0.000 | 0.414 | 6.528 | 0.232 | 0.000 | 0.091 | 2.243 | 6.252 | 0.140 | 0.000 | 4.210 | 18.093 | n/a | n/a | 0.053 | 7.901 | 0.238 | 0.053 |
| p99 | 42.100 | 2.311 | 0.000 | 3.192 | 11.814 | 0.330 | 0.000 | 1.368 | 2.598 | 8.379 | 0.157 | 0.000 | 4.432 | 19.800 | n/a | n/a | 0.053 | 12.225 | 0.290 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000aa | 42.100 | 11.814 | 0.330 | 0.000 | 0.082 | 2.598 | 6.174 | 0.157 | 0.000 | 1.102 | 19.800 | n/a | n/a | 0.043 | 12.225 | 0.290 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000a5 | 38.894 | 5.262 | 0.232 | 0.000 | 0.091 | 2.243 | 8.379 | 0.107 | 0.000 | 4.432 | 18.093 | n/a | n/a | 0.053 | 5.585 | 0.144 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000a8 | 33.196 | 6.528 | 0.004 | 0.000 | 1.368 | 0.766 | 6.252 | 0.140 | 0.000 | 4.210 | 13.875 | n/a | n/a | 0.053 | 7.901 | 0.238 | 0.053 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 64.685 | 0.000 | 0.000 | 0.478 | 12.709 | 0.392 | 0.000 | 0.094 | 2.181 | 9.292 | 0.137 | 0.000 | 1.062 | 33.671 | n/a | n/a | 0.040 | 13.166 | 0.197 | 0.040 |
| p99 | 67.002 | 1.420 | 0.002 | 2.528 | 15.367 | 0.535 | 1.228 | 0.894 | 3.260 | 11.756 | 0.193 | 0.000 | 3.783 | 35.883 | n/a | n/a | 0.097 | 17.223 | 0.266 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000ae | 67.002 | 12.709 | 0.392 | 0.000 | 0.065 | 2.181 | 11.756 | 0.193 | 0.000 | 3.783 | 35.883 | n/a | n/a | 0.040 | 13.166 | 0.197 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.worker-message 0.690ms |
| 82c92547d6bdceae00000000000000b1 | 64.685 | 15.367 | 0.535 | 1.228 | 0.094 | 3.260 | 9.292 | 0.137 | 0.000 | 1.062 | 33.671 | n/a | n/a | 0.040 | 17.223 | 0.266 | 0.040 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000ab | 40.566 | 6.679 | 0.006 | 0.000 | 0.894 | 1.098 | 5.167 | 0.061 | 0.000 | 0.761 | 25.803 | n/a | n/a | 0.097 | 7.579 | 0.187 | 0.097 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 83.566 | 0.385 | 0.000 | 0.442 | 4.132 | 0.006 | 0.000 | 0.080 | 0.894 | 24.005 | 0.096 | 0.000 | 0.857 | 40.179 | n/a | n/a | 0.040 | 4.845 | 0.047 | 0.040 |
| p99 | 246.024 | 0.959 | 0.017 | 1.864 | 11.974 | 2.176 | 3.845 | 0.708 | 3.818 | 66.424 | 0.259 | 0.000 | 1.337 | 185.878 | n/a | n/a | 0.063 | 16.162 | 0.193 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000b5 | 246.024 | 3.833 | 0.004 | 0.000 | 0.503 | 0.894 | 53.263 | 0.259 | 0.000 | 1.337 | 185.878 | n/a | n/a | 0.053 | 4.340 | 0.018 | 0.053 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000b6 | 235.631 | 8.743 | 2.176 | 0.000 | 0.080 | 3.818 | 66.424 | 0.096 | 0.000 | 0.608 | 153.646 | n/a | n/a | 0.040 | 10.999 | 0.047 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.412ms |
| 82c92547d6bdceae00000000000000bb | 83.566 | 11.974 | 0.286 | 3.845 | 0.056 | 2.212 | 24.005 | 0.114 | 0.000 | 0.857 | 40.179 | n/a | n/a | 0.037 | 16.162 | 0.193 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000b3 | 28.350 | 4.132 | 0.006 | 0.000 | 0.708 | 0.827 | 1.789 | 0.044 | 0.000 | 0.996 | 19.785 | n/a | n/a | 0.063 | 4.845 | 0.171 | 0.063 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.350 | 0.711 | 0.000 | 1.569 | 3.833 | 0.004 | 0.000 | 0.503 | 0.827 | 1.789 | 0.044 | 0.000 | 0.996 | 19.785 | n/a | n/a | 0.053 | 4.340 | 0.018 | 0.053 |
| p99 | 246.024 | 0.959 | 0.017 | 1.864 | 4.132 | 0.006 | 0.000 | 0.708 | 0.894 | 53.263 | 0.259 | 0.000 | 1.337 | 185.878 | n/a | n/a | 0.063 | 4.845 | 0.171 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000b5 | 246.024 | 3.833 | 0.004 | 0.000 | 0.503 | 0.894 | 53.263 | 0.259 | 0.000 | 1.337 | 185.878 | n/a | n/a | 0.053 | 4.340 | 0.018 | 0.053 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000b3 | 28.350 | 4.132 | 0.006 | 0.000 | 0.708 | 0.827 | 1.789 | 0.044 | 0.000 | 0.996 | 19.785 | n/a | n/a | 0.063 | 4.845 | 0.171 | 0.063 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.439 | n/a | n/a | n/a | 12.642 | 4.231 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 13.424 | 0.998 | 0.015 |
| p99 | 282.823 | n/a | n/a | n/a | 111.228 | 121.114 | 8.252 | 0.000 | 51.812 | 201.791 | 0.031 | 0.000 | 0.264 | 0.000 | n/a | n/a | 0.047 | 133.900 | 1.000 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000ef | 282.823 | 51.433 | 28.124 | 0.000 | 0.000 | 1.374 | 201.791 | 0.013 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.037 | 79.557 | 0.281 | 0.037 | gw-w/thread-47/gateway.admitted-work | none observed |
| 82c92547d6bdceae00000000000000fe | 181.465 | 27.466 | 30.330 | 2.198 | 0.000 | 3.832 | 117.580 | 0.010 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.023 | 59.993 | 0.331 | 0.023 | gw-w/thread-49/gateway.admitted-work | client.encode 3.331ms; driver.publication 1.756ms |
| 82c92547d6bdceae0000000000000112 | 133.910 | 12.786 | 121.114 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 133.900 | 1.000 | 0.010 | node-14/thread-0/rpc.replica.observe | driver.publication 2.145ms; driver.publication 1.509ms |
| 82c92547d6bdceae0000000000000113 | 130.855 | 12.642 | 118.200 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 130.842 | 1.000 | 0.013 | node-14/thread-0/rpc.replica.observe | driver.publication 1.509ms |
| 82c92547d6bdceae000000000000012d | 115.445 | 111.228 | 0.154 | 4.046 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 115.427 | 1.000 | 0.017 | node-14/thread-2/replica.pull-at | none observed |
| 82c92547d6bdceae00000000000000b8 | 106.567 | 15.891 | 4.231 | 0.000 | 0.000 | 2.036 | 84.101 | 0.031 | 0.000 | 0.264 | 0.000 | n/a | n/a | 0.014 | 20.122 | 0.189 | 0.014 | gw-w/thread-50/gateway.admitted-work | none observed |
| 82c92547d6bdceae0000000000000101 | 103.658 | 16.842 | 4.663 | 0.000 | 0.000 | 51.812 | 30.246 | 0.019 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.032 | 21.505 | 0.207 | 0.032 | node-14/thread-0/socket.queue-and-write | client.parse 1.201ms |
| 82c92547d6bdceae0000000000000115 | 78.278 | 12.778 | 65.491 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 78.269 | 1.000 | 0.009 | node-14/thread-0/rpc.replica.observe | none observed |
| 82c92547d6bdceae0000000000000093 | 38.740 | 30.081 | 0.359 | 8.252 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.047 | 38.693 | 0.999 | 0.047 | node-14/thread-2/replica.pull-at | none observed |
| 82c92547d6bdceae00000000000000bd | 26.465 | 22.389 | 2.607 | 1.452 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 26.448 | 0.999 | 0.017 | node-14/thread-2/replica.pull-at | none observed |
| 82c92547d6bdceae0000000000000156 | 13.439 | 13.272 | 0.152 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 13.424 | 0.999 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| 82c92547d6bdceae00000000000000f8 | 12.125 | 0.242 | 11.861 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 12.103 | 0.998 | 0.022 | node-14/thread-0/rpc.replica.observe | none observed |
| 82c92547d6bdceae00000000000000c1 | 11.873 | 9.483 | 2.376 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 11.859 | 0.999 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| 82c92547d6bdceae0000000000000141 | 9.301 | 9.166 | 0.120 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 9.286 | 0.998 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| 82c92547d6bdceae0000000000000132 | 8.981 | 0.348 | 8.618 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 8.967 | 0.998 | 0.014 | node-14/thread-0/rpc.replica.observe | none observed |
| 82c92547d6bdceae0000000000000119 | 8.636 | 0.210 | 8.412 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 8.622 | 0.998 | 0.014 | node-14/thread-0/rpc.replica.observe | none observed |
| 82c92547d6bdceae00000000000000c5 | 8.231 | 8.029 | 0.188 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 8.217 | 0.998 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| 82c92547d6bdceae00000000000000da | 7.750 | 6.358 | 1.368 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 7.726 | 0.997 | 0.024 | node-14/thread-2/replica.pull-at | none observed |
| 82c92547d6bdceae0000000000000123 | 7.692 | 6.937 | 0.736 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 7.673 | 0.998 | 0.019 | node-14/thread-2/replica.pull-at | none observed |
| 82c92547d6bdceae00000000000000f5 | 7.640 | 0.641 | 6.981 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 7.623 | 0.998 | 0.018 | node-14/thread-0/rpc.replica.observe | none observed |

## P2 / L64 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 73.853 | 0.839 | 0.000 | 1.819 | 6.096 | 0.009 | 0.000 | 0.168 | 1.550 | 21.223 | 0.126 | 0.000 | 1.995 | 31.834 | n/a | n/a | 0.043 | 6.520 | 0.106 | 0.043 |
| p99 | 90.942 | 2.329 | 0.008 | 3.508 | 17.784 | 0.356 | 0.639 | 0.963 | 2.313 | 30.411 | 0.187 | 0.000 | 6.209 | 59.495 | n/a | n/a | 0.060 | 18.879 | 0.256 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000bc | 90.942 | 7.247 | 0.005 | 0.000 | 0.538 | 1.550 | 30.411 | 0.126 | 0.000 | 3.580 | 47.439 | n/a | n/a | 0.046 | 7.790 | 0.086 | 0.046 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000bf | 79.684 | 3.756 | 0.005 | 0.000 | 0.963 | 0.939 | 12.314 | 0.179 | 0.000 | 1.995 | 59.495 | n/a | n/a | 0.038 | 4.724 | 0.059 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000c6 | 73.853 | 17.784 | 0.356 | 0.639 | 0.100 | 2.313 | 21.223 | 0.187 | 0.000 | 1.171 | 30.042 | n/a | n/a | 0.038 | 18.879 | 0.256 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000c0 | 61.236 | 6.096 | 0.347 | 0.000 | 0.077 | 2.171 | 22.762 | 0.057 | 0.000 | 6.209 | 23.473 | n/a | n/a | 0.043 | 6.520 | 0.106 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.659ms |
| 82c92547d6bdceae00000000000000c4 | 40.052 | 4.514 | 0.009 | 0.000 | 0.168 | 0.963 | 1.443 | 0.041 | 0.000 | 1.020 | 31.834 | n/a | n/a | 0.060 | 4.691 | 0.117 | 0.060 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 40.052 | 0.839 | 0.000 | 1.819 | 3.756 | 0.005 | 0.000 | 0.168 | 0.939 | 1.443 | 0.041 | 0.000 | 1.020 | 31.834 | n/a | n/a | 0.038 | 4.691 | 0.059 | 0.038 |
| p99 | 79.684 | 1.386 | 0.000 | 2.021 | 4.514 | 0.009 | 0.000 | 0.963 | 0.963 | 12.314 | 0.179 | 0.000 | 1.995 | 59.495 | n/a | n/a | 0.060 | 4.724 | 0.117 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000bf | 79.684 | 3.756 | 0.005 | 0.000 | 0.963 | 0.939 | 12.314 | 0.179 | 0.000 | 1.995 | 59.495 | n/a | n/a | 0.038 | 4.724 | 0.059 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000c4 | 40.052 | 4.514 | 0.009 | 0.000 | 0.168 | 0.963 | 1.443 | 0.041 | 0.000 | 1.020 | 31.834 | n/a | n/a | 0.060 | 4.691 | 0.117 | 0.060 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 71.591 | 0.539 | 0.000 | 0.784 | 5.007 | 0.008 | 0.000 | 0.236 | 1.325 | 10.079 | 0.085 | 0.000 | 0.546 | 51.641 | n/a | n/a | 0.058 | 5.326 | 0.074 | 0.058 |
| p99 | 181.936 | 1.083 | 0.003 | 1.976 | 17.154 | 0.407 | 0.419 | 0.494 | 4.294 | 28.000 | 0.218 | 0.000 | 3.810 | 145.286 | n/a | n/a | 0.122 | 18.216 | 0.171 | 0.122 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000c8 | 181.936 | 5.569 | 0.281 | 0.000 | 0.079 | 2.020 | 28.000 | 0.096 | 0.000 | 0.546 | 145.286 | n/a | n/a | 0.060 | 5.929 | 0.033 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000cf | 133.379 | 17.154 | 0.407 | 0.419 | 0.236 | 4.294 | 27.694 | 0.218 | 0.000 | 3.810 | 79.025 | n/a | n/a | 0.122 | 18.216 | 0.137 | 0.122 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000ca | 71.591 | 5.007 | 0.007 | 0.000 | 0.313 | 0.990 | 10.079 | 0.085 | 0.000 | 3.410 | 51.641 | n/a | n/a | 0.058 | 5.326 | 0.074 | 0.058 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000cc | 24.954 | 3.772 | 0.008 | 0.000 | 0.494 | 1.325 | 1.389 | 0.040 | 0.000 | 0.425 | 17.450 | n/a | n/a | 0.052 | 4.274 | 0.171 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.954 | 0.758 | 0.000 | 1.635 | 3.772 | 0.007 | 0.000 | 0.313 | 0.990 | 1.389 | 0.040 | 0.000 | 0.425 | 17.450 | n/a | n/a | 0.052 | 4.274 | 0.074 | 0.052 |
| p99 | 71.591 | 1.083 | 0.003 | 1.976 | 5.007 | 0.008 | 0.000 | 0.494 | 1.325 | 10.079 | 0.085 | 0.000 | 3.410 | 51.641 | n/a | n/a | 0.058 | 5.326 | 0.171 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000ca | 71.591 | 5.007 | 0.007 | 0.000 | 0.313 | 0.990 | 10.079 | 0.085 | 0.000 | 3.410 | 51.641 | n/a | n/a | 0.058 | 5.326 | 0.074 | 0.058 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000cc | 24.954 | 3.772 | 0.008 | 0.000 | 0.494 | 1.325 | 1.389 | 0.040 | 0.000 | 0.425 | 17.450 | n/a | n/a | 0.052 | 4.274 | 0.171 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 73.638 | 0.000 | 0.000 | 0.431 | 7.598 | 0.222 | 0.301 | 0.072 | 2.519 | 15.504 | 0.136 | 0.000 | 1.868 | 39.094 | n/a | n/a | 0.049 | 13.710 | 0.131 | 0.049 |
| p99 | 114.428 | 0.000 | 0.000 | 0.575 | 13.115 | 4.598 | 2.706 | 0.094 | 2.830 | 36.091 | 0.202 | 17.238 | 3.920 | 39.853 | n/a | n/a | 0.058 | 14.996 | 0.186 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000d4 | 114.428 | 7.598 | 4.598 | 2.706 | 0.094 | 2.830 | 36.091 | 0.202 | 17.238 | 3.920 | 39.094 | n/a | n/a | 0.058 | 14.996 | 0.131 | 0.058 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.worker-message 0.682ms |
| 82c92547d6bdceae00000000000000d1 | 73.638 | 13.115 | 0.222 | 0.301 | 0.072 | 2.519 | 15.504 | 0.136 | 0.000 | 1.868 | 39.853 | n/a | n/a | 0.049 | 13.710 | 0.186 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 43.592 | 0.958 | 0.000 | 2.134 | 8.481 | 0.019 | 0.000 | 0.473 | 2.979 | 18.470 | 0.103 | 0.000 | 0.810 | 20.548 | n/a | n/a | 0.056 | 9.021 | 0.183 | 0.056 |
| p99 | 117.346 | 2.301 | 1.477 | 2.884 | 10.179 | 0.431 | 0.589 | 1.338 | 4.404 | 42.545 | 0.180 | 0.000 | 3.236 | 62.042 | n/a | n/a | 0.104 | 11.233 | 0.285 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000d8 | 117.346 | 8.515 | 0.431 | 0.000 | 0.075 | 2.979 | 42.545 | 0.122 | 0.000 | 0.582 | 62.042 | n/a | n/a | 0.057 | 9.021 | 0.077 | 0.057 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.worker-message 0.730ms |
| 82c92547d6bdceae00000000000000dd | 58.249 | 10.179 | 0.370 | 0.589 | 0.095 | 3.012 | 22.416 | 0.180 | 0.000 | 0.810 | 20.548 | n/a | n/a | 0.050 | 11.233 | 0.193 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000d9 | 43.592 | 4.229 | 0.005 | 0.000 | 1.075 | 1.007 | 1.633 | 0.046 | 0.000 | 3.236 | 32.306 | n/a | n/a | 0.056 | 5.308 | 0.122 | 0.056 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000dc | 37.280 | 6.327 | 0.005 | 0.000 | 0.473 | 4.404 | 18.470 | 0.103 | 0.000 | 1.232 | 6.209 | n/a | n/a | 0.056 | 6.805 | 0.183 | 0.056 | gw-w/thread-45/gateway.admitted-work | none observed |
| 82c92547d6bdceae00000000000000d6 | 34.482 | 8.481 | 0.019 | 0.000 | 1.338 | 1.500 | 5.194 | 0.099 | 0.000 | 0.621 | 17.126 | n/a | n/a | 0.104 | 9.838 | 0.285 | 0.104 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.280 | 0.000 | 0.000 | 0.239 | 4.229 | 0.005 | 0.000 | 0.473 | 1.007 | 1.633 | 0.046 | 0.000 | 1.232 | 6.209 | n/a | n/a | 0.056 | 5.308 | 0.122 | 0.056 |
| p99 | 43.592 | 2.301 | 0.025 | 2.181 | 6.327 | 0.005 | 0.000 | 1.075 | 4.404 | 18.470 | 0.103 | 0.000 | 3.236 | 32.306 | n/a | n/a | 0.056 | 6.805 | 0.183 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000d9 | 43.592 | 4.229 | 0.005 | 0.000 | 1.075 | 1.007 | 1.633 | 0.046 | 0.000 | 3.236 | 32.306 | n/a | n/a | 0.056 | 5.308 | 0.122 | 0.056 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000dc | 37.280 | 6.327 | 0.005 | 0.000 | 0.473 | 4.404 | 18.470 | 0.103 | 0.000 | 1.232 | 6.209 | n/a | n/a | 0.056 | 6.805 | 0.183 | 0.056 | gw-w/thread-45/gateway.admitted-work | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.101 | 0.499 | 0.000 | 0.408 | 5.282 | 0.305 | 0.279 | 0.073 | 1.185 | 1.619 | 0.046 | 0.000 | 1.420 | 16.737 | n/a | n/a | 0.042 | 6.291 | 0.202 | 0.042 |
| p99 | 31.698 | 1.149 | 0.000 | 1.957 | 6.379 | 0.319 | 0.386 | 1.003 | 1.712 | 9.254 | 0.063 | 0.000 | 1.875 | 21.518 | n/a | n/a | 0.063 | 7.025 | 0.246 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000df | 31.698 | 4.793 | 0.319 | 0.386 | 0.073 | 1.712 | 9.254 | 0.063 | 0.000 | 1.420 | 13.636 | n/a | n/a | 0.042 | 5.572 | 0.176 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000e2 | 31.101 | 5.282 | 0.005 | 0.000 | 1.003 | 0.713 | 1.483 | 0.046 | 0.000 | 0.989 | 21.518 | n/a | n/a | 0.063 | 6.291 | 0.202 | 0.063 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000e1 | 28.524 | 6.379 | 0.305 | 0.279 | 0.061 | 1.185 | 1.619 | 0.042 | 0.000 | 1.875 | 16.737 | n/a | n/a | 0.041 | 7.025 | 0.246 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.508 | 0.341 | 0.000 | 0.647 | 5.332 | 0.268 | 0.239 | 0.171 | 2.271 | 6.653 | 0.076 | 0.000 | 1.366 | 18.666 | n/a | n/a | 0.060 | 5.943 | 0.158 | 0.060 |
| p99 | 57.251 | 3.169 | 0.005 | 4.148 | 9.341 | 0.384 | 0.450 | 1.191 | 9.353 | 25.702 | 0.191 | 0.000 | 6.213 | 27.038 | n/a | n/a | 0.085 | 10.543 | 0.251 | 0.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000e6 | 57.251 | 6.880 | 0.379 | 0.243 | 0.109 | 2.778 | 21.392 | 0.050 | 0.000 | 0.578 | 24.776 | n/a | n/a | 0.066 | 7.611 | 0.133 | 0.066 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae000000000000011b | 54.477 | 7.151 | 0.384 | 0.000 | 0.189 | 9.353 | 3.874 | 0.191 | 0.000 | 6.213 | 27.038 | n/a | n/a | 0.084 | 7.724 | 0.142 | 0.084 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000e8 | 51.853 | 4.040 | 0.271 | 0.239 | 0.082 | 2.784 | 25.702 | 0.140 | 0.000 | 2.290 | 16.248 | n/a | n/a | 0.057 | 4.632 | 0.089 | 0.057 | gw-w/thread-49/gateway.admitted-work | none observed |
| 82c92547d6bdceae0000000000000118 | 41.940 | 9.341 | 0.011 | 0.000 | 1.191 | 1.697 | 6.653 | 0.130 | 0.000 | 5.065 | 17.768 | n/a | n/a | 0.085 | 10.543 | 0.251 | 0.085 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae000000000000013f | 40.426 | 5.617 | 0.327 | 0.349 | 0.088 | 2.498 | 9.864 | 0.076 | 0.000 | 1.714 | 19.837 | n/a | n/a | 0.054 | 6.382 | 0.158 | 0.054 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000117 | 34.508 | 4.204 | 0.253 | 0.341 | 0.082 | 2.271 | 6.506 | 0.073 | 0.000 | 1.063 | 19.668 | n/a | n/a | 0.047 | 4.880 | 0.141 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae000000000000011c | 33.712 | 4.890 | 0.006 | 0.000 | 0.625 | 1.390 | 8.158 | 0.135 | 0.000 | 1.366 | 17.088 | n/a | n/a | 0.052 | 5.521 | 0.164 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae000000000000013b | 32.162 | 5.592 | 0.268 | 0.450 | 0.171 | 1.787 | 4.691 | 0.042 | 0.000 | 0.427 | 18.666 | n/a | n/a | 0.068 | 6.481 | 0.202 | 0.068 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000138 | 31.533 | 5.332 | 0.276 | 0.287 | 0.049 | 6.143 | 7.656 | 0.078 | 0.000 | 0.803 | 10.841 | n/a | n/a | 0.068 | 5.943 | 0.188 | 0.068 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae000000000000013c | 30.066 | 2.825 | 0.005 | 0.000 | 0.605 | 0.666 | 1.302 | 0.037 | 0.000 | 2.842 | 21.740 | n/a | n/a | 0.045 | 3.435 | 0.114 | 0.045 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000140 | 23.775 | 3.137 | 0.006 | 0.000 | 1.132 | 1.001 | 1.496 | 0.047 | 0.000 | 0.902 | 15.994 | n/a | n/a | 0.060 | 4.274 | 0.180 | 0.060 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 74.226 | 0.000 | 0.000 | 0.763 | 8.550 | 0.014 | 0.000 | 0.146 | 2.270 | 5.310 | 0.143 | 0.000 | 1.126 | 24.222 | n/a | n/a | 0.086 | 11.153 | 0.075 | 0.086 |
| p99 | 149.602 | 5.298 | 0.000 | 41.636 | 44.845 | 1.775 | 0.703 | 1.658 | 3.378 | 33.288 | 35.883 | 40.477 | 2.947 | 95.187 | n/a | n/a | 0.116 | 46.101 | 0.621 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000f1 | 149.602 | 8.550 | 1.775 | 0.703 | 0.125 | 3.378 | 33.288 | 35.883 | 40.477 | 1.126 | 24.222 | n/a | n/a | 0.074 | 11.153 | 0.075 | 0.074 | gw-w/thread--1/jdk.GCPhasePause | client.parse 2.270ms |
| 82c92547d6bdceae00000000000000ee | 123.726 | 16.881 | 0.014 | 0.000 | 1.658 | 2.723 | 4.075 | 0.143 | 0.000 | 2.947 | 95.187 | n/a | n/a | 0.100 | 18.553 | 0.150 | 0.100 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000eb | 74.226 | 44.845 | 0.007 | 0.000 | 1.249 | 2.270 | 5.310 | 0.066 | 0.000 | 0.870 | 19.524 | n/a | n/a | 0.086 | 46.101 | 0.621 | 0.086 | node-14/thread-0/driver.publication | none observed |
| 82c92547d6bdceae00000000000000ea | 63.101 | 3.880 | 0.208 | 0.352 | 0.146 | 0.627 | 5.792 | 0.156 | 0.000 | 1.375 | 50.449 | n/a | n/a | 0.116 | 4.585 | 0.073 | 0.116 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 123.726 | 5.298 | 0.000 | 6.614 | 16.881 | 0.014 | 0.000 | 1.658 | 2.723 | 4.075 | 0.143 | 0.000 | 2.947 | 95.187 | n/a | n/a | 0.100 | 18.553 | 0.150 | 0.100 |
| p99 | 123.726 | 5.298 | 0.000 | 6.614 | 16.881 | 0.014 | 0.000 | 1.658 | 2.723 | 4.075 | 0.143 | 0.000 | 2.947 | 95.187 | n/a | n/a | 0.100 | 18.553 | 0.150 | 0.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000ee | 123.726 | 16.881 | 0.014 | 0.000 | 1.658 | 2.723 | 4.075 | 0.143 | 0.000 | 2.947 | 95.187 | n/a | n/a | 0.100 | 18.553 | 0.150 | 0.100 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 85.825 | 1.085 | 0.000 | 1.962 | 5.368 | 0.006 | 0.000 | 0.772 | 3.929 | 4.455 | 0.075 | 0.000 | 4.384 | 39.777 | n/a | n/a | 0.065 | 8.689 | 0.095 | 0.065 |
| p99 | 360.738 | 2.972 | 0.003 | 6.852 | 14.156 | 53.468 | 0.647 | 116.449 | 26.490 | 20.413 | 16.837 | 15.080 | 9.321 | 315.592 | n/a | n/a | 0.099 | 119.764 | 0.708 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae00000000000000fb | 360.738 | 14.156 | 17.726 | 0.647 | 0.148 | 2.966 | 4.950 | 0.071 | 0.000 | 4.384 | 315.592 | n/a | n/a | 0.098 | 32.677 | 0.091 | 0.098 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae000000000000010f | 190.430 | 4.264 | 0.006 | 0.000 | 0.842 | 25.966 | 7.726 | 0.138 | 0.000 | 9.321 | 142.115 | n/a | n/a | 0.052 | 5.112 | 0.027 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 6.275ms |
| 82c92547d6bdceae00000000000000fc | 175.080 | 5.368 | 0.008 | 0.000 | 0.772 | 22.198 | 3.086 | 0.154 | 0.000 | 5.220 | 138.208 | n/a | n/a | 0.066 | 6.148 | 0.035 | 0.066 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000110 | 170.151 | 9.463 | 0.006 | 0.000 | 1.020 | 26.490 | 3.307 | 0.075 | 0.000 | 1.992 | 127.734 | n/a | n/a | 0.065 | 10.489 | 0.062 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000111 | 169.169 | 3.311 | 0.004 | 0.000 | 116.449 | 1.408 | 4.455 | 0.128 | 0.000 | 0.766 | 42.609 | n/a | n/a | 0.040 | 119.764 | 0.708 | 0.040 | node-14/thread-0/driver.queue.subject | driver.publication 6.275ms; driver.publication 2.145ms |
| 82c92547d6bdceae00000000000000fd | 131.862 | 7.219 | 53.468 | 0.000 | 1.635 | 6.566 | 7.154 | 0.066 | 0.000 | 1.025 | 54.631 | n/a | n/a | 0.099 | 62.322 | 0.473 | 0.099 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | client.encode 3.331ms; driver.publication 1.334ms |
| 82c92547d6bdceae0000000000000105 | 85.825 | 3.947 | 21.451 | 0.000 | 3.668 | 3.919 | 7.765 | 0.109 | 15.080 | 7.653 | 22.184 | n/a | n/a | 0.050 | 29.066 | 0.339 | 0.050 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | client.encode 5.295ms |
| 82c92547d6bdceae00000000000000f6 | 77.470 | 4.770 | 0.390 | 0.000 | 0.097 | 6.618 | 20.413 | 16.837 | 0.000 | 1.152 | 27.139 | n/a | n/a | 0.053 | 5.257 | 0.068 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000f7 | 59.024 | 8.224 | 0.006 | 0.000 | 0.459 | 15.033 | 1.759 | 0.043 | 0.000 | 6.147 | 27.278 | n/a | n/a | 0.075 | 8.689 | 0.147 | 0.075 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | client.parse 1.364ms |
| 82c92547d6bdceae0000000000000109 | 56.459 | 6.024 | 8.397 | 0.000 | 0.100 | 2.167 | 3.586 | 7.718 | 0.000 | 7.269 | 21.155 | n/a | n/a | 0.043 | 14.521 | 0.257 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae00000000000000f4 | 54.090 | 4.775 | 0.004 | 0.000 | 0.362 | 3.929 | 1.263 | 0.041 | 0.000 | 3.871 | 39.777 | n/a | n/a | 0.068 | 5.142 | 0.095 | 0.068 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae000000000000010b | 52.603 | 5.472 | 0.005 | 0.000 | 1.042 | 0.906 | 4.522 | 0.075 | 3.083 | 5.214 | 32.218 | n/a | n/a | 0.065 | 6.519 | 0.124 | 0.065 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 175.080 | 0.947 | 0.000 | 1.940 | 4.264 | 0.006 | 0.000 | 0.842 | 22.198 | 4.455 | 0.138 | 0.000 | 5.220 | 138.208 | n/a | n/a | 0.052 | 6.148 | 0.035 | 0.052 |
| p99 | 190.430 | 2.067 | 0.003 | 2.560 | 5.368 | 0.008 | 0.000 | 116.449 | 25.966 | 7.726 | 0.154 | 0.000 | 9.321 | 142.115 | n/a | n/a | 0.066 | 119.764 | 0.708 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae000000000000010f | 190.430 | 4.264 | 0.006 | 0.000 | 0.842 | 25.966 | 7.726 | 0.138 | 0.000 | 9.321 | 142.115 | n/a | n/a | 0.052 | 5.112 | 0.027 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 6.275ms |
| 82c92547d6bdceae00000000000000fc | 175.080 | 5.368 | 0.008 | 0.000 | 0.772 | 22.198 | 3.086 | 0.154 | 0.000 | 5.220 | 138.208 | n/a | n/a | 0.066 | 6.148 | 0.035 | 0.066 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000111 | 169.169 | 3.311 | 0.004 | 0.000 | 116.449 | 1.408 | 4.455 | 0.128 | 0.000 | 0.766 | 42.609 | n/a | n/a | 0.040 | 119.764 | 0.708 | 0.040 | node-14/thread-0/driver.queue.subject | driver.publication 6.275ms; driver.publication 2.145ms |

## P4 / p4h3 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 50.488 | 0.423 | 0.000 | 0.395 | 5.568 | 0.205 | 0.000 | 0.080 | 2.628 | 19.831 | 0.059 | 0.000 | 0.827 | 19.009 | n/a | n/a | 0.050 | 6.430 | 0.127 | 0.050 |
| p99 | 83.176 | 0.951 | 0.000 | 2.178 | 10.925 | 0.368 | 0.588 | 0.597 | 4.240 | 26.326 | 0.272 | 0.000 | 3.787 | 48.405 | n/a | n/a | 0.072 | 11.346 | 0.185 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae000000000000011f | 83.176 | 6.747 | 0.368 | 0.463 | 0.080 | 2.628 | 23.335 | 0.272 | 0.000 | 0.827 | 48.405 | n/a | n/a | 0.050 | 7.658 | 0.092 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000121 | 76.778 | 10.925 | 0.307 | 0.000 | 0.114 | 2.650 | 26.326 | 0.191 | 0.000 | 3.787 | 32.410 | n/a | n/a | 0.069 | 11.346 | 0.148 | 0.069 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000125 | 50.488 | 5.568 | 0.205 | 0.588 | 0.070 | 4.240 | 19.831 | 0.051 | 0.000 | 0.880 | 19.009 | n/a | n/a | 0.048 | 6.430 | 0.127 | 0.048 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000122 | 31.635 | 5.242 | 0.014 | 0.000 | 0.597 | 1.553 | 5.264 | 0.059 | 0.000 | 0.458 | 18.376 | n/a | n/a | 0.072 | 5.853 | 0.185 | 0.072 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.635 | 0.951 | 0.000 | 2.178 | 5.242 | 0.014 | 0.000 | 0.597 | 1.553 | 5.264 | 0.059 | 0.000 | 0.458 | 18.376 | n/a | n/a | 0.072 | 5.853 | 0.185 | 0.072 |
| p99 | 31.635 | 0.951 | 0.000 | 2.178 | 5.242 | 0.014 | 0.000 | 0.597 | 1.553 | 5.264 | 0.059 | 0.000 | 0.458 | 18.376 | n/a | n/a | 0.072 | 5.853 | 0.185 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae0000000000000122 | 31.635 | 5.242 | 0.014 | 0.000 | 0.597 | 1.553 | 5.264 | 0.059 | 0.000 | 0.458 | 18.376 | n/a | n/a | 0.072 | 5.853 | 0.185 | 0.072 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 47.108 | 1.203 | 0.000 | 1.577 | 4.327 | 0.005 | 0.000 | 0.707 | 1.781 | 1.614 | 0.071 | 0.000 | 3.511 | 20.430 | n/a | n/a | 0.046 | 7.103 | 0.190 | 0.046 |
| p99 | 82.113 | 1.669 | 0.002 | 2.288 | 6.195 | 32.930 | 0.481 | 14.232 | 3.248 | 22.959 | 6.502 | 0.000 | 6.989 | 37.908 | n/a | n/a | 0.071 | 37.963 | 0.543 | 0.071 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae000000000000012f | 82.113 | 6.195 | 0.338 | 0.481 | 0.089 | 2.388 | 22.959 | 6.502 | 0.000 | 5.201 | 37.908 | n/a | n/a | 0.051 | 7.103 | 0.087 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae000000000000012b | 69.949 | 4.327 | 32.930 | 0.000 | 0.707 | 3.248 | 1.614 | 0.040 | 0.000 | 3.511 | 23.527 | n/a | n/a | 0.046 | 37.963 | 0.543 | 0.046 | node-14/thread-0/client.commit-send-queue | client.encode 2.925ms |
| 82c92547d6bdceae0000000000000131 | 47.108 | 2.961 | 0.004 | 0.000 | 14.232 | 1.781 | 1.410 | 0.077 | 0.000 | 6.989 | 19.611 | n/a | n/a | 0.042 | 17.197 | 0.365 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.000ms |
| 82c92547d6bdceae0000000000000130 | 33.325 | 5.370 | 0.005 | 0.000 | 0.973 | 0.963 | 4.884 | 0.071 | 0.000 | 0.559 | 20.430 | n/a | n/a | 0.071 | 6.347 | 0.190 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 47.108 | 1.203 | 0.000 | 1.577 | 2.961 | 0.004 | 0.000 | 14.232 | 1.781 | 1.410 | 0.077 | 0.000 | 6.989 | 19.611 | n/a | n/a | 0.042 | 17.197 | 0.365 | 0.042 |
| p99 | 47.108 | 1.203 | 0.000 | 1.577 | 2.961 | 0.004 | 0.000 | 14.232 | 1.781 | 1.410 | 0.077 | 0.000 | 6.989 | 19.611 | n/a | n/a | 0.042 | 17.197 | 0.365 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae0000000000000131 | 47.108 | 2.961 | 0.004 | 0.000 | 14.232 | 1.781 | 1.410 | 0.077 | 0.000 | 6.989 | 19.611 | n/a | n/a | 0.042 | 17.197 | 0.365 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.000ms |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.775 | 0.285 | 0.000 | 1.325 | 2.825 | 0.005 | 0.000 | 0.605 | 0.666 | 1.302 | 0.037 | 0.000 | 0.902 | 15.994 | n/a | n/a | 0.045 | 3.435 | 0.114 | 0.045 |
| p99 | 30.066 | 0.615 | 0.000 | 1.577 | 3.137 | 0.006 | 0.000 | 1.132 | 1.001 | 1.496 | 0.047 | 0.000 | 2.842 | 21.740 | n/a | n/a | 0.060 | 4.274 | 0.180 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae000000000000013c | 30.066 | 2.825 | 0.005 | 0.000 | 0.605 | 0.666 | 1.302 | 0.037 | 0.000 | 2.842 | 21.740 | n/a | n/a | 0.045 | 3.435 | 0.114 | 0.045 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000140 | 23.775 | 3.137 | 0.006 | 0.000 | 1.132 | 1.001 | 1.496 | 0.047 | 0.000 | 0.902 | 15.994 | n/a | n/a | 0.060 | 4.274 | 0.180 | 0.060 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.085 | 0.142 | 0.000 | 0.559 | 4.079 | 0.006 | 0.000 | 0.107 | 0.864 | 4.707 | 0.060 | 0.000 | 0.718 | 19.621 | n/a | n/a | 0.050 | 4.475 | 0.109 | 0.050 |
| p99 | 65.651 | 0.836 | 0.352 | 2.411 | 4.861 | 0.408 | 0.541 | 0.821 | 4.327 | 14.399 | 0.365 | 0.000 | 0.847 | 51.231 | n/a | n/a | 0.067 | 5.733 | 0.200 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae0000000000000143 | 65.651 | 3.130 | 0.192 | 0.223 | 0.065 | 1.126 | 8.444 | 0.365 | 0.000 | 0.834 | 51.231 | n/a | n/a | 0.039 | 3.610 | 0.055 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000147 | 53.038 | 4.861 | 0.223 | 0.541 | 0.107 | 1.772 | 14.399 | 0.164 | 0.000 | 0.718 | 30.196 | n/a | n/a | 0.057 | 5.733 | 0.108 | 0.057 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae000000000000014d | 44.443 | 4.123 | 0.408 | 0.228 | 0.089 | 4.327 | 14.226 | 0.073 | 0.000 | 0.586 | 20.327 | n/a | n/a | 0.056 | 4.848 | 0.109 | 0.056 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae000000000000014a | 30.085 | 3.852 | 0.004 | 0.000 | 0.821 | 0.758 | 4.707 | 0.042 | 0.000 | 0.802 | 19.051 | n/a | n/a | 0.047 | 4.678 | 0.155 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000145 | 26.951 | 4.079 | 0.006 | 0.000 | 0.237 | 0.799 | 1.272 | 0.040 | 0.000 | 0.847 | 19.621 | n/a | n/a | 0.050 | 4.321 | 0.160 | 0.050 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000148 | 22.352 | 4.293 | 0.005 | 0.000 | 0.177 | 0.864 | 1.923 | 0.060 | 0.000 | 0.562 | 14.401 | n/a | n/a | 0.067 | 4.475 | 0.200 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.085 | 0.690 | 0.352 | 2.273 | 3.852 | 0.004 | 0.000 | 0.821 | 0.758 | 4.707 | 0.042 | 0.000 | 0.802 | 19.051 | n/a | n/a | 0.047 | 4.678 | 0.155 | 0.047 |
| p99 | 30.085 | 0.690 | 0.352 | 2.273 | 3.852 | 0.004 | 0.000 | 0.821 | 0.758 | 4.707 | 0.042 | 0.000 | 0.802 | 19.051 | n/a | n/a | 0.047 | 4.678 | 0.155 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae000000000000014a | 30.085 | 3.852 | 0.004 | 0.000 | 0.821 | 0.758 | 4.707 | 0.042 | 0.000 | 0.802 | 19.051 | n/a | n/a | 0.047 | 4.678 | 0.155 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.764 | 0.650 | 0.000 | 1.637 | 5.515 | 0.006 | 0.000 | 0.429 | 0.989 | 1.907 | 0.048 | 0.000 | 1.600 | 14.361 | n/a | n/a | 0.058 | 6.000 | 0.231 | 0.058 |
| p99 | 56.930 | 2.377 | 0.000 | 2.466 | 11.259 | 0.488 | 4.600 | 0.963 | 4.080 | 18.457 | 0.197 | 0.000 | 2.907 | 21.405 | n/a | n/a | 0.070 | 14.963 | 0.288 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae0000000000000157 | 56.930 | 11.259 | 0.484 | 0.425 | 0.075 | 4.080 | 18.457 | 0.101 | 0.000 | 1.830 | 20.155 | n/a | n/a | 0.063 | 12.243 | 0.215 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae000000000000014f | 51.998 | 9.731 | 0.488 | 4.600 | 0.144 | 2.761 | 9.694 | 0.197 | 0.000 | 2.907 | 21.405 | n/a | n/a | 0.070 | 14.963 | 0.288 | 0.070 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000150 | 23.764 | 4.685 | 0.006 | 0.000 | 0.429 | 0.977 | 1.601 | 0.046 | 0.000 | 1.600 | 14.361 | n/a | n/a | 0.058 | 5.121 | 0.215 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000155 | 20.977 | 5.515 | 0.005 | 0.000 | 0.479 | 0.677 | 1.907 | 0.040 | 0.000 | 0.820 | 11.494 | n/a | n/a | 0.039 | 6.000 | 0.286 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000152 | 18.875 | 3.395 | 0.005 | 0.000 | 0.963 | 0.989 | 1.750 | 0.048 | 0.000 | 0.865 | 10.818 | n/a | n/a | 0.043 | 4.363 | 0.231 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.875 | 0.650 | 0.000 | 1.637 | 3.395 | 0.005 | 0.000 | 0.429 | 0.977 | 1.601 | 0.046 | 0.000 | 0.865 | 10.818 | n/a | n/a | 0.043 | 4.363 | 0.215 | 0.043 |
| p99 | 23.764 | 1.722 | 0.000 | 1.899 | 4.685 | 0.006 | 0.000 | 0.963 | 0.989 | 1.750 | 0.048 | 0.000 | 1.600 | 14.361 | n/a | n/a | 0.058 | 5.121 | 0.231 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae0000000000000150 | 23.764 | 4.685 | 0.006 | 0.000 | 0.429 | 0.977 | 1.601 | 0.046 | 0.000 | 1.600 | 14.361 | n/a | n/a | 0.058 | 5.121 | 0.215 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 82c92547d6bdceae0000000000000152 | 18.875 | 3.395 | 0.005 | 0.000 | 0.963 | 0.989 | 1.750 | 0.048 | 0.000 | 0.865 | 10.818 | n/a | n/a | 0.043 | 4.363 | 0.231 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 82.638 | 0.567 | 0.002 | 1.793 | 7.304 | 9.525 | 0.000 | 0.011 | 7.676 | 1.287 | 3.928 | 0.000 | 0.667 | 47.013 | n/a | n/a | 0.032 | 15.992 | 0.210 | 0.032 |
| p99 | 116.293 | 1.982 | 4.541 | 6.906 | 12.130 | 36.023 | 0.000 | 0.092 | 23.293 | 7.038 | 12.176 | 0.000 | 8.448 | 67.970 | n/a | n/a | 0.065 | 43.013 | 0.370 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82c92547d6bdceae0000000000000161 | 116.293 | 6.980 | 36.023 | 0.000 | 0.010 | 7.482 | 0.917 | 3.928 | 0.000 | 1.087 | 59.801 | n/a | n/a | 0.065 | 43.013 | 0.370 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 6.346ms; driver.publication 5.740ms; driver.publication 3.597ms; driver.publication 3.354ms; driver.publication 1.411ms |
| 82c92547d6bdceae0000000000000160 | 114.557 | 7.304 | 19.134 | 0.000 | 0.011 | 23.293 | 2.052 | 0.044 | 0.000 | 5.784 | 56.897 | n/a | n/a | 0.038 | 26.449 | 0.231 | 0.038 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 6.346ms; driver.publication 5.740ms; driver.publication 3.597ms; driver.publication 3.354ms; driver.publication 1.411ms |
| 82c92547d6bdceae000000000000015f | 112.585 | 6.638 | 17.005 | 0.000 | 0.011 | 15.007 | 1.210 | 4.529 | 0.000 | 0.191 | 67.970 | n/a | n/a | 0.025 | 23.654 | 0.210 | 0.025 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 6.346ms; driver.publication 5.740ms; driver.publication 3.597ms; driver.publication 3.354ms; driver.publication 1.411ms |
| 82c92547d6bdceae000000000000015e | 110.260 | 11.418 | 14.817 | 0.000 | 0.006 | 9.745 | 1.303 | 6.465 | 0.000 | 0.421 | 66.059 | n/a | n/a | 0.027 | 26.241 | 0.238 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 6.346ms; driver.publication 3.597ms; driver.publication 3.354ms; driver.publication 1.411ms; driver.publication 1.349ms |
| 82c92547d6bdceae000000000000015d | 103.333 | 12.130 | 11.129 | 0.000 | 0.009 | 8.968 | 1.165 | 8.266 | 0.000 | 0.391 | 61.240 | n/a | n/a | 0.036 | 23.268 | 0.225 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 3.597ms; driver.publication 3.354ms; driver.publication 1.411ms; driver.publication 1.349ms; client.parse 1.328ms |
| 82c92547d6bdceae000000000000015c | 82.638 | 6.454 | 9.525 | 0.000 | 0.013 | 5.823 | 1.287 | 12.176 | 0.000 | 0.312 | 47.013 | n/a | n/a | 0.035 | 15.992 | 0.194 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 3.597ms; driver.publication 3.354ms; driver.publication 1.411ms; driver.publication 1.349ms; client.parse 1.328ms |
| 82c92547d6bdceae000000000000015b | 77.963 | 7.841 | 7.448 | 0.000 | 0.031 | 6.432 | 7.038 | 9.328 | 0.000 | 0.735 | 39.078 | n/a | n/a | 0.032 | 15.320 | 0.197 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 3.597ms; driver.publication 3.354ms; driver.publication 1.411ms; client.parse 1.328ms |
| 82c92547d6bdceae000000000000015a | 68.323 | 6.324 | 2.759 | 0.000 | 0.012 | 7.676 | 1.245 | 0.052 | 0.000 | 8.448 | 41.782 | n/a | n/a | 0.025 | 9.094 | 0.133 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 3.597ms; driver.publication 3.354ms; client.parse 1.328ms |
| 82c92547d6bdceae0000000000000159 | 55.306 | 9.805 | 2.492 | 0.000 | 0.014 | 0.538 | 1.853 | 0.774 | 0.000 | 0.667 | 39.131 | n/a | n/a | 0.032 | 12.311 | 0.223 | 0.032 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 3.354ms |
| 82c92547d6bdceae0000000000000158 | 41.920 | 7.656 | 0.010 | 0.000 | 0.092 | 9.251 | 1.462 | 0.041 | 0.000 | 0.795 | 22.558 | n/a | n/a | 0.055 | 7.758 | 0.185 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (201 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.028 | n/a | n/a | n/a | 0.025 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.025 | 0.929 | 0.001 |
| p99 | 275.016 | n/a | n/a | n/a | 65.291 | n/a | 9.568 | 274.892 | 100.949 | 2.602 | 0.018 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.021 | 275.014 | 1.000 | 0.021 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 421c744c603276b7000000000000565b | 275.105 | 0.042 | n/a | 0.000 | 275.062 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.104 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 421c744c603276b7000000000000565a | 275.052 | 0.043 | n/a | 0.000 | 275.007 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.050 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 421c744c603276b70000000000005659 | 275.016 | 0.122 | n/a | 0.000 | 274.892 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.014 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 421c744c603276b70000000000005658 | 274.959 | 2.209 | n/a | 0.000 | 272.745 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 274.954 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a67208b356ea39cc0000000000006efe | 273.651 | 0.015 | n/a | 0.000 | 273.634 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.650 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc0000000000006efd | 273.643 | 0.040 | n/a | 0.000 | 273.601 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.642 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc0000000000006efc | 273.591 | 0.025 | n/a | 0.000 | 273.564 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.590 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc0000000000006efb | 273.548 | 0.022 | n/a | 0.000 | 273.524 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.546 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc0000000000006efa | 273.520 | 0.040 | n/a | 0.000 | 273.478 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.518 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc0000000000006ef9 | 273.456 | 0.258 | n/a | 0.000 | 273.193 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 273.451 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 421c744c603276b70000000000005657 | 272.984 | 0.264 | n/a | 0.000 | 272.717 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.981 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7245b6853c0820e900000000000055ce | 272.768 | 0.208 | n/a | 0.000 | 272.558 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.766 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7245b6853c0820e900000000000055cb | 272.663 | 0.471 | n/a | 0.000 | 272.177 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 272.648 | 1.000 | 0.015 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7245b6853c0820e900000000000055cf | 272.663 | 0.053 | n/a | 0.000 | 272.604 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 272.657 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7245b6853c0820e900000000000055cd | 272.550 | 0.057 | n/a | 0.000 | 272.490 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.547 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7245b6853c0820e900000000000055cc | 272.535 | 0.105 | n/a | 0.000 | 272.426 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 272.531 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7245b6853c0820e90000000000000070 | 155.140 | 17.223 | n/a | 0.000 | 0.000 | 130.662 | 7.165 | 0.024 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.010 | 17.223 | 0.111 | 0.010 | node-14/thread-5/socket.wait-first-byte | reader.observe 23.968ms; reader.observe 20.067ms; reader.observe 13.579ms; reader.observe 1.143ms; replica.apply-delta 0.189ms |
| 7245b6853c0820e90000000000000071 | 151.805 | 18.490 | n/a | 0.000 | 0.000 | 132.760 | 0.528 | 0.007 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.006 | 18.490 | 0.122 | 0.006 | node-14/thread-5/socket.wait-first-byte | reader.observe 23.968ms; reader.observe 20.067ms; reader.observe 13.579ms; replica.apply-delta 0.189ms |
| 7245b6853c0820e9000000000000000c | 151.177 | 1.050 | n/a | 0.000 | 150.107 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 151.156 | 1.000 | 0.021 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a67208b356ea39cc0000000000000008 | 150.994 | 0.616 | n/a | 0.000 | 150.348 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 150.964 | 1.000 | 0.030 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P1 / L1 / read (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.014 | n/a | n/a | n/a | 0.013 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.013 | 0.938 | 0.001 |
| p99 | 289.648 | n/a | n/a | n/a | 3.120 | n/a | 0.000 | 289.399 | 1.094 | 1.448 | 0.017 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.007 | 289.643 | 1.000 | 0.007 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a67208b356ea39cc0000000000020401 | 289.648 | 0.245 | n/a | 0.000 | 289.399 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 289.643 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.059ms; replica.apply-delta 0.046ms |
| a67208b356ea39cc000000000001f31c | 281.928 | 0.181 | n/a | 0.000 | 281.744 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 281.925 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc000000000000ec2d | 5.721 | 3.120 | n/a | 0.000 | 0.000 | 1.094 | 1.448 | 0.017 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.003 | 3.120 | 0.545 | 0.003 | node-14/thread-3/reader.execute | none observed |
| a67208b356ea39cc000000000001a022 | 0.844 | 0.841 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.841 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000011cb6 | 0.590 | 0.588 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.588 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000012fa0 | 0.511 | 0.508 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.508 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000001fdd3 | 0.498 | 0.493 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.493 | 0.989 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000001b1b3 | 0.482 | 0.476 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.476 | 0.986 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000001ad56 | 0.475 | 0.473 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.473 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000001fe47 | 0.448 | 0.445 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.445 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000001417a | 0.403 | 0.401 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.401 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000001fdf2 | 0.391 | 0.389 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.389 | 0.993 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000117c9 | 0.386 | 0.384 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.384 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000012fa2 | 0.384 | 0.383 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.383 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000001fe1e | 0.376 | 0.372 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.372 | 0.990 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000001fa50 | 0.356 | 0.355 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.355 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000001fe11 | 0.354 | 0.350 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.350 | 0.988 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000001f81a | 0.345 | 0.343 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.343 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000019f8a | 0.333 | 0.331 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.331 | 0.993 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000001fcb5 | 0.331 | 0.326 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.326 | 0.987 | 0.004 | node-14/thread-3/replica.pull-at | none observed |

## P1 / L4 / read (232 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.016 | n/a | n/a | n/a | 0.014 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.014 | 0.938 | 0.001 |
| p99 | 143.497 | n/a | n/a | n/a | 2.704 | n/a | 0.000 | 143.156 | 0.924 | 0.832 | 0.015 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.076 | 143.489 | 1.000 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7245b6853c0820e9000000000000c27b | 147.778 | 0.510 | n/a | 0.000 | 147.241 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 147.752 | 1.000 | 0.026 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| a67208b356ea39cc0000000000020404 | 147.753 | 0.189 | n/a | 0.000 | 147.560 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 147.749 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| 421c744c603276b7000000000000cfd0 | 143.497 | 0.332 | n/a | 0.000 | 143.156 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 143.489 | 1.000 | 0.008 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.081ms |
| 7245b6853c0820e9000000000000c284 | 18.388 | 12.874 | n/a | 2.851 | 0.000 | 1.197 | 1.417 | 0.015 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.006 | 15.725 | 0.855 | 0.006 | node-14/thread-5/reader.execute | none observed |
| 421c744c603276b7000000000000d00a | 16.106 | 10.538 | n/a | 0.000 | 0.000 | 4.015 | 1.486 | 0.023 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.004 | 10.538 | 0.654 | 0.004 | node-14/thread-4/reader.execute | none observed |
| a67208b356ea39cc0000000000020457 | 3.808 | 1.993 | n/a | 0.000 | 0.000 | 0.924 | 0.832 | 0.022 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.002 | 1.993 | 0.523 | 0.002 | node-14/thread-3/reader.execute | none observed |
| 421c744c603276b70000000000014a52 | 2.706 | 2.704 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.704 | 0.999 | 0.002 | node-14/thread-4/reader.execute | none observed |
| a67208b356ea39cc000000000002f121 | 2.605 | 2.598 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 2.598 | 0.997 | 0.008 | node-14/thread-3/reader.execute | none observed |
| 421c744c603276b7000000000000db92 | 1.967 | 1.965 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.965 | 0.999 | 0.001 | node-14/thread-4/reader.execute | none observed |
| a67208b356ea39cc000000000002b7c3 | 1.757 | 1.754 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.754 | 0.998 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000002b7c4 | 1.724 | 0.089 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.635 | 0.089 | 0.052 | 1.635 | uncovered | none observed |
| 7245b6853c0820e90000000000013606 | 1.617 | 1.615 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.615 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| a67208b356ea39cc000000000002ef0b | 1.420 | 1.411 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 1.411 | 0.994 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000002ef0c | 1.252 | 1.215 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 1.215 | 0.971 | 0.037 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000030c36 | 1.226 | 1.222 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.222 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 7245b6853c0820e90000000000017fbb | 1.103 | 1.100 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.100 | 0.997 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| a67208b356ea39cc000000000003067b | 1.009 | 0.986 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 0.986 | 0.977 | 0.024 | node-14/thread-3/reader.execute | none observed |
| a67208b356ea39cc00000000000240e5 | 1.006 | 1.004 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.004 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 421c744c603276b7000000000000cfbc | 1.005 | 0.986 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 0.986 | 0.981 | 0.019 | node-14/thread-4/replica.pull-at | none observed |
| 7245b6853c0820e90000000000011af1 | 0.963 | 0.962 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.962 | 0.999 | 0.001 | node-14/thread-5/replica.pull-at | none observed |

## P1 / L16 / read (205 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.035 | n/a | n/a | n/a | 0.024 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.034 | 0.957 | 0.001 |
| p99 | 463.753 | n/a | n/a | n/a | 6.103 | n/a | 0.000 | 463.709 | 1.716 | 1.544 | 0.009 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.015 | 463.750 | 1.000 | 0.015 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a67208b356ea39cc0000000000033b59 | 464.392 | 0.128 | n/a | 0.000 | 464.260 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 464.387 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| a67208b356ea39cc0000000000033b6b | 463.807 | 0.117 | n/a | 0.000 | 463.688 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 463.804 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc0000000000033b6c | 463.753 | 0.038 | n/a | 0.000 | 463.712 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 463.750 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc0000000000033b6d | 463.736 | 0.025 | n/a | 0.000 | 463.709 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 463.735 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc0000000000033b6e | 463.721 | 0.027 | n/a | 0.000 | 463.691 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 463.718 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc0000000000033b6f | 463.705 | 0.028 | n/a | 0.000 | 463.675 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 463.703 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 421c744c603276b7000000000001e074 | 462.288 | 0.018 | n/a | 0.000 | 462.269 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 462.287 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.043ms |
| 421c744c603276b7000000000001e072 | 462.282 | 0.195 | n/a | 0.000 | 462.080 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 462.275 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.043ms |
| 421c744c603276b7000000000001e073 | 462.278 | 0.043 | n/a | 0.000 | 462.233 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 462.276 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.043ms |
| 7245b6853c0820e9000000000001c27a | 462.176 | 0.151 | n/a | 0.000 | 462.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 462.173 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7245b6853c0820e9000000000001c27b | 462.175 | 0.037 | n/a | 0.000 | 462.136 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 462.173 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 421c744c603276b7000000000001e07f | 461.675 | 0.023 | n/a | 0.000 | 461.649 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 461.673 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 421c744c603276b7000000000001e080 | 461.667 | 0.041 | n/a | 0.000 | 461.625 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 461.666 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7245b6853c0820e9000000000001c29a | 461.136 | 0.043 | n/a | 0.000 | 461.092 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 461.135 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7245b6853c0820e9000000000001c2b7 | 460.582 | 0.021 | n/a | 0.000 | 460.561 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 460.581 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7245b6853c0820e9000000000001c2b6 | 460.572 | 0.025 | n/a | 0.000 | 460.546 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 460.571 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7245b6853c0820e900000000000245f3 | 339.805 | 0.017 | n/a | 0.000 | 339.788 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 339.804 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 7245b6853c0820e900000000000245f2 | 339.786 | 0.064 | n/a | 0.000 | 339.719 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 339.783 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 7245b6853c0820e9000000000002461f | 338.792 | 0.074 | n/a | 0.000 | 338.716 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 338.790 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 7245b6853c0820e90000000000024626 | 338.470 | 0.033 | n/a | 0.000 | 338.436 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 338.469 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.038ms |

## P1 / L64 / read (188 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.033 | n/a | n/a | n/a | 0.023 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.032 | 0.958 | 0.001 |
| p99 | 330.716 | n/a | n/a | n/a | 10.557 | n/a | 1.702 | 330.666 | 2.270 | 24.907 | 0.032 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.024 | 330.714 | 1.000 | 0.024 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a67208b356ea39cc000000000003ff35 | 331.507 | 0.083 | n/a | 0.000 | 331.421 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 331.504 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc000000000003ff54 | 330.716 | 0.050 | n/a | 0.000 | 330.664 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 330.714 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc000000000003ff55 | 330.688 | 0.021 | n/a | 0.000 | 330.666 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 330.687 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc000000000003ff56 | 330.686 | 0.022 | n/a | 0.000 | 330.663 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 330.685 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc000000000003ff57 | 330.684 | 0.021 | n/a | 0.000 | 330.661 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 330.682 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 421c744c603276b7000000000002a56c | 329.542 | 0.165 | n/a | 0.000 | 329.376 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 329.541 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 421c744c603276b7000000000002a56b | 329.473 | 0.015 | n/a | 0.000 | 329.457 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 329.472 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 421c744c603276b7000000000002a56a | 329.464 | 0.040 | n/a | 0.000 | 329.423 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 329.463 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 421c744c603276b7000000000002a569 | 329.431 | 0.041 | n/a | 0.000 | 329.389 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 329.430 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 421c744c603276b7000000000002a568 | 329.315 | 0.278 | n/a | 0.000 | 329.034 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 329.313 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a67208b356ea39cc000000000003ff34 | 329.221 | 0.118 | n/a | 0.000 | 329.099 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 329.218 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 7245b6853c0820e900000000000277c3 | 329.192 | 0.052 | n/a | 0.000 | 329.138 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 329.191 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7245b6853c0820e900000000000277c2 | 329.119 | 0.316 | n/a | 0.000 | 328.801 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 329.117 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7245b6853c0820e900000000000277e6 | 328.422 | 0.130 | n/a | 0.000 | 328.290 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 328.420 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7245b6853c0820e900000000000277e7 | 328.404 | 0.039 | n/a | 0.000 | 328.364 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 328.403 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7245b6853c0820e900000000000277e8 | 328.403 | 0.017 | n/a | 0.000 | 328.385 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 328.402 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a67208b356ea39cc000000000004682d | 290.816 | 0.026 | n/a | 0.000 | 290.789 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.815 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc000000000004682c | 290.780 | 0.026 | n/a | 0.000 | 290.752 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.779 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc000000000004682b | 290.740 | 0.030 | n/a | 0.000 | 290.709 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.739 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc000000000004682a | 290.698 | 0.038 | n/a | 0.000 | 290.659 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.697 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P1 / L256 / read (222 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.038 | n/a | n/a | n/a | 0.032 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.036 | 0.962 | 0.001 |
| p99 | 322.981 | n/a | n/a | n/a | 6.249 | n/a | 0.000 | 322.934 | 1.460 | 6.539 | 0.012 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.429 | 322.980 | 1.000 | 0.429 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a67208b356ea39cc000000000004fc2a | 323.264 | 0.221 | n/a | 0.000 | 323.040 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 323.261 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.043ms |
| a67208b356ea39cc000000000004fc56 | 323.031 | 0.051 | n/a | 0.000 | 322.979 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 323.030 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.043ms |
| 7245b6853c0820e90000000000036c52 | 322.981 | 0.046 | n/a | 0.000 | 322.934 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.980 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| 7245b6853c0820e90000000000036c51 | 322.972 | 0.118 | n/a | 0.000 | 322.853 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.971 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| a67208b356ea39cc000000000004fc55 | 322.954 | 0.037 | n/a | 0.000 | 322.917 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.953 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.043ms |
| 7245b6853c0820e90000000000036c50 | 322.920 | 0.252 | n/a | 0.000 | 322.667 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.919 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| a67208b356ea39cc000000000004fc54 | 322.895 | 0.039 | n/a | 0.000 | 322.855 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.894 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.043ms |
| a67208b356ea39cc000000000004fc53 | 322.825 | 0.034 | n/a | 0.000 | 322.790 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.824 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.043ms |
| a67208b356ea39cc000000000004fc52 | 322.769 | 0.059 | n/a | 0.000 | 322.709 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.768 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.043ms |
| 7245b6853c0820e90000000000036c4f | 322.704 | 0.027 | n/a | 0.000 | 322.676 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.703 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| 7245b6853c0820e90000000000036c4e | 322.600 | 0.158 | n/a | 0.000 | 322.439 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 322.597 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| 421c744c603276b7000000000003a61d | 320.740 | 0.133 | n/a | 0.000 | 320.605 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 320.739 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| 421c744c603276b7000000000003a64a | 320.292 | 0.038 | n/a | 0.000 | 320.253 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 320.291 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| 421c744c603276b7000000000003a64b | 320.292 | 0.016 | n/a | 0.000 | 320.274 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 320.291 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| 421c744c603276b7000000000003a649 | 320.274 | 0.028 | n/a | 0.000 | 320.246 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 320.274 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| 421c744c603276b7000000000003a648 | 320.262 | 0.052 | n/a | 0.000 | 320.209 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 320.261 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| 421c744c603276b7000000000003a662 | 228.169 | 0.050 | n/a | 0.000 | 228.118 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 228.167 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 421c744c603276b7000000000003a661 | 228.058 | 0.223 | n/a | 0.000 | 227.832 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 228.055 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 421c744c603276b7000000000003a671 | 227.651 | 0.032 | n/a | 0.000 | 227.618 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 227.651 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 421c744c603276b7000000000003a670 | 227.567 | 0.030 | n/a | 0.000 | 227.535 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 227.565 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |

## P1 / L1024 / read (306 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.025 | n/a | n/a | n/a | 0.024 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.024 | 0.954 | 0.001 |
| p99 | 5.694 | n/a | n/a | n/a | 5.621 | n/a | 2.549 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 5.658 | 1.000 | 0.034 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 421c744c603276b7000000000003f3e8 | 99.886 | 15.696 | n/a | 2.549 | 0.000 | 2.290 | 47.440 | 0.043 | 31.830 | 0.036 | 0.000 | n/a | n/a | 0.003 | 18.244 | 0.183 | 0.003 | gw-r/thread-69/gateway.admitted-work | none observed |
| a67208b356ea39cc00000000000544df | 26.687 | 4.984 | n/a | 0.000 | 0.000 | 1.366 | 14.237 | 6.069 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.003 | 4.984 | 0.187 | 0.003 | gw-r/thread-70/gateway.admitted-work | none observed |
| 7245b6853c0820e9000000000003afb8 | 22.812 | 3.208 | n/a | 0.000 | 0.000 | 1.924 | 17.617 | 0.022 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.002 | 3.208 | 0.141 | 0.002 | gw-r/thread-53/gateway.admitted-work | none observed |
| a67208b356ea39cc0000000000054cdc | 5.694 | 2.447 | n/a | 3.244 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 5.691 | 1.000 | 0.003 | node-14/thread-3/node.gc | replica.apply-delta 0.034ms |
| 7245b6853c0820e9000000000003b8bb | 5.679 | 5.677 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 5.677 | 1.000 | 0.003 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.037ms |
| a67208b356ea39cc0000000000054cdd | 5.668 | 2.414 | n/a | 3.244 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 5.658 | 0.998 | 0.010 | node-14/thread-3/node.gc | replica.apply-delta 0.034ms |
| a67208b356ea39cc0000000000054cde | 5.652 | 2.396 | n/a | 3.244 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 5.640 | 0.998 | 0.011 | node-14/thread-3/node.gc | replica.apply-delta 0.034ms |
| 7245b6853c0820e9000000000003b8bd | 5.639 | 5.628 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 5.628 | 0.998 | 0.011 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.037ms |
| 7245b6853c0820e9000000000003b8be | 5.633 | 5.621 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 5.621 | 0.998 | 0.012 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.037ms |
| 7245b6853c0820e9000000000003b8c0 | 5.584 | 5.572 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 5.572 | 0.998 | 0.013 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.037ms |
| a67208b356ea39cc000000000005e45c | 4.100 | 4.099 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 4.099 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000067af1 | 4.080 | 4.077 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 4.077 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000067af2 | 4.018 | 3.998 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.998 | 0.995 | 0.020 | node-14/thread-3/replica.pull-at | none observed |
| 7245b6853c0820e9000000000004812f | 3.997 | 3.994 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.994 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 7245b6853c0820e90000000000048130 | 3.983 | 3.967 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.967 | 0.996 | 0.016 | node-14/thread-5/replica.pull-at | none observed |
| a67208b356ea39cc0000000000067af3 | 3.954 | 3.934 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 3.934 | 0.995 | 0.021 | node-14/thread-3/replica.pull-at | none observed |
| 421c744c603276b7000000000004fd04 | 3.508 | 3.506 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.506 | 1.000 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 421c744c603276b7000000000004fd05 | 3.507 | 3.493 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.493 | 0.996 | 0.015 | node-14/thread-4/replica.pull-at | none observed |
| 421c744c603276b7000000000004fd06 | 3.495 | 3.479 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.479 | 0.996 | 0.016 | node-14/thread-4/replica.pull-at | none observed |
| a67208b356ea39cc000000000005899e | 3.126 | 3.115 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 3.115 | 0.996 | 0.011 | node-14/thread-3/replica.pull-at | none observed |

## P1 / recovery / read (232 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.030 | n/a | n/a | n/a | 0.026 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.029 | 0.956 | 0.001 |
| p99 | 292.230 | n/a | n/a | n/a | 6.370 | n/a | 0.000 | 292.147 | 1.479 | 1.467 | 0.013 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.031 | 292.229 | 1.000 | 0.031 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a67208b356ea39cc000000000006eee7 | 292.475 | 0.063 | n/a | 0.000 | 292.410 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.473 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| a67208b356ea39cc000000000006eee6 | 292.344 | 0.077 | n/a | 0.000 | 292.264 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.341 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| a67208b356ea39cc000000000006eee5 | 292.230 | 0.081 | n/a | 0.000 | 292.147 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.229 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| a67208b356ea39cc000000000006eee4 | 292.107 | 0.078 | n/a | 0.000 | 292.027 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.105 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| a67208b356ea39cc000000000006eee3 | 291.910 | 0.115 | n/a | 0.000 | 291.792 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 291.908 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 421c744c603276b70000000000059d39 | 291.826 | 0.056 | n/a | 0.000 | 291.768 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 291.823 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| 421c744c603276b70000000000059d38 | 291.812 | 0.129 | n/a | 0.000 | 291.682 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.811 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| 7245b6853c0820e90000000000053bfe | 291.727 | 0.020 | n/a | 0.000 | 291.705 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.725 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 7245b6853c0820e90000000000053bfd | 291.708 | 0.024 | n/a | 0.000 | 291.683 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.707 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 421c744c603276b70000000000059d37 | 291.700 | 0.030 | n/a | 0.000 | 291.670 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.699 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| 7245b6853c0820e90000000000053bfc | 291.679 | 0.036 | n/a | 0.000 | 291.642 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.678 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| a67208b356ea39cc000000000006eee2 | 291.675 | 0.216 | n/a | 0.000 | 291.451 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 291.667 | 1.000 | 0.008 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 7245b6853c0820e90000000000053bfb | 291.642 | 0.030 | n/a | 0.000 | 291.611 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.641 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 421c744c603276b70000000000059d36 | 291.611 | 0.024 | n/a | 0.000 | 291.586 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.610 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| 7245b6853c0820e90000000000053bfa | 291.551 | 0.143 | n/a | 0.000 | 291.403 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 291.546 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 421c744c603276b70000000000059d35 | 291.523 | 0.129 | n/a | 0.000 | 291.392 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 291.521 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| a67208b356ea39cc000000000006da4a | 287.301 | 0.573 | n/a | 0.000 | 286.726 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.298 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc000000000006da49 | 286.983 | 0.143 | n/a | 0.000 | 286.837 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 286.981 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc000000000006da48 | 286.590 | 0.034 | n/a | 0.000 | 286.555 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.589 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc000000000006da47 | 286.517 | 0.048 | n/a | 0.000 | 286.468 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 286.515 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (180 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.012 | 0.943 | 0.001 |
| p99 | 2.295 | n/a | n/a | n/a | 2.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.012 | 0.999 | 0.004 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a67208b356ea39cc0000000000074c3f | 7.608 | 2.012 | n/a | 0.000 | 0.000 | 1.003 | 4.536 | 0.017 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.004 | 2.012 | 0.264 | 0.004 | gw-r/thread-51/gateway.admitted-work | none observed |
| a67208b356ea39cc00000000000846ff | 2.295 | 2.293 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.293 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000074faf | 1.761 | 1.760 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.760 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000080af6 | 1.623 | 1.621 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.621 | 0.999 | 0.002 | node-14/thread-3/reader.execute | none observed |
| a67208b356ea39cc0000000000081d78 | 1.082 | 1.080 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.080 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000083945 | 1.002 | 0.999 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.999 | 0.997 | 0.003 | node-14/thread-3/reader.execute | none observed |
| a67208b356ea39cc0000000000095778 | 0.875 | 0.873 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.873 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000092fc9 | 0.798 | 0.795 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.795 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000097739 | 0.689 | 0.686 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.686 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000007d7f9 | 0.684 | 0.683 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.683 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000882fb | 0.577 | 0.561 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.561 | 0.972 | 0.016 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000081e37 | 0.574 | 0.573 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.573 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000751a7 | 0.564 | 0.562 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.562 | 0.997 | 0.001 | node-14/thread-3/reader.execute | none observed |
| a67208b356ea39cc0000000000093cbe | 0.555 | 0.551 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.551 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000009c3d7 | 0.553 | 0.552 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.552 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000088c31 | 0.552 | 0.549 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.549 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000009b123 | 0.550 | 0.549 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.549 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000822e2 | 0.511 | 0.509 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.509 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc000000000008fa2d | 0.502 | 0.501 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.501 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000079125 | 0.498 | 0.496 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.496 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h1 / read (121 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.009 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.009 | 0.921 | 0.001 |
| p99 | 28.013 | n/a | n/a | n/a | 8.245 | n/a | 0.000 | 0.000 | 1.228 | 5.580 | 0.015 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.062 | 8.245 | 0.999 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a67208b356ea39cc00000000000b1c0f | 47.796 | 23.513 | n/a | 0.000 | 0.000 | 11.711 | 12.486 | 0.034 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.009 | 23.513 | 0.492 | 0.009 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.842ms |
| a67208b356ea39cc000000000009d6dd | 28.013 | 7.761 | n/a | 0.000 | 0.000 | 1.228 | 5.580 | 0.015 | 13.370 | 0.056 | 0.000 | n/a | n/a | 0.003 | 7.761 | 0.277 | 0.003 | gw-r/thread--1/jdk.GCPhasePause | none observed |
| a67208b356ea39cc00000000000af6f9 | 8.248 | 8.245 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 8.245 | 1.000 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000af6a5 | 7.465 | 7.461 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 7.461 | 0.999 | 0.004 | node-14/thread-3/reader.execute | none observed |
| a67208b356ea39cc00000000000af984 | 5.249 | 5.180 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.069 | 5.180 | 0.987 | 0.069 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000af71d | 4.719 | 4.714 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 4.714 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000af9de | 4.708 | 4.700 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 4.700 | 0.998 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000af477 | 4.556 | 4.549 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 4.549 | 0.998 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000af9ce | 4.180 | 4.168 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 4.168 | 0.997 | 0.012 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000b1505 | 4.082 | 4.079 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.079 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000af470 | 3.983 | 3.979 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.979 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000af59b | 2.872 | 2.869 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.869 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000af988 | 2.781 | 2.776 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.776 | 0.998 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000af9cd | 2.715 | 2.708 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 2.708 | 0.997 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000b1c29 | 2.594 | 2.586 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 2.586 | 0.997 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000afdaf | 2.504 | 2.500 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.500 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000b04da | 2.418 | 2.416 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.416 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000af9c5 | 2.222 | 2.219 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.219 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000b0f5c | 2.107 | 2.045 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.062 | 2.045 | 0.971 | 0.062 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000afa0e | 1.786 | 1.784 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.784 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h3 / read (148 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.012 | n/a | n/a | n/a | 0.011 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.011 | 0.931 | 0.001 |
| p99 | 1.149 | n/a | n/a | n/a | 1.148 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.043 | 1.148 | 0.998 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a67208b356ea39cc00000000000ba097 | 38.413 | 3.053 | n/a | 0.000 | 0.000 | 1.671 | 15.383 | 0.013 | 18.254 | 0.031 | 0.000 | n/a | n/a | 0.007 | 3.053 | 0.079 | 0.007 | gw-r/thread--1/jdk.GCPhasePause | none observed |
| a67208b356ea39cc00000000000bd2a8 | 1.149 | 1.148 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.148 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000cbab8 | 1.063 | 1.058 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.058 | 0.996 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000cbb76 | 0.971 | 0.928 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.043 | 0.928 | 0.956 | 0.043 | node-14/thread-3/reader.execute | none observed |
| a67208b356ea39cc00000000000c796d | 0.814 | 0.812 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.812 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000cb9ad | 0.735 | 0.665 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.070 | 0.665 | 0.905 | 0.070 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000cb6ff | 0.727 | 0.720 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.720 | 0.990 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000cb7a2 | 0.695 | 0.693 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.693 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000ca875 | 0.620 | 0.618 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.618 | 0.996 | 0.002 | node-14/thread-3/reader.execute | none observed |
| a67208b356ea39cc00000000000bbb31 | 0.593 | 0.591 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.591 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000c9c76 | 0.552 | 0.551 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.551 | 0.998 | 0.001 | node-14/thread-3/reader.execute | none observed |
| a67208b356ea39cc00000000000d8411 | 0.531 | 0.529 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.529 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000c7247 | 0.530 | 0.519 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.519 | 0.980 | 0.011 | node-14/thread-3/reader.execute | none observed |
| a67208b356ea39cc00000000000c42b8 | 0.524 | 0.522 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.522 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000bede7 | 0.514 | 0.507 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.507 | 0.985 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000d5007 | 0.511 | 0.508 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.508 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000ccbb0 | 0.490 | 0.489 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.489 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000d90c0 | 0.489 | 0.487 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.487 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000cb6f8 | 0.486 | 0.484 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.484 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000cba74 | 0.480 | 0.476 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.476 | 0.992 | 0.004 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h10 / read (152 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.933 | 0.001 |
| p99 | 3.170 | n/a | n/a | n/a | 2.278 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 2.278 | 0.999 | 0.016 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a67208b356ea39cc00000000000d97a0 | 11.595 | 2.278 | n/a | 0.000 | 0.000 | 1.008 | 8.261 | 0.018 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.002 | 2.278 | 0.196 | 0.002 | gw-r/thread-51/gateway.admitted-work | none observed |
| a67208b356ea39cc00000000000de738 | 3.170 | 3.169 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.169 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000f5b4c | 1.430 | 1.428 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.428 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000f7aed | 1.153 | 1.142 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 1.142 | 0.991 | 0.010 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000f7aea | 0.989 | 0.973 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.973 | 0.983 | 0.017 | node-14/thread-3/reader.execute | none observed |
| a67208b356ea39cc00000000000f7afd | 0.958 | 0.955 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.955 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000e0be8 | 0.906 | 0.904 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.904 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000da1ac | 0.861 | 0.858 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.858 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000f283d | 0.774 | 0.773 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.773 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000f5adb | 0.696 | 0.693 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.693 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000f7846 | 0.682 | 0.666 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.666 | 0.977 | 0.016 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000f66cf | 0.631 | 0.629 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.629 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000e0bfc | 0.607 | 0.605 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.605 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000de9cf | 0.584 | 0.584 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.584 | 0.999 | 0.001 | node-14/thread-3/reader.execute | none observed |
| a67208b356ea39cc00000000000e0abf | 0.555 | 0.554 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.554 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000faab1 | 0.542 | 0.539 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.539 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000f4db5 | 0.534 | 0.532 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.532 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000e4695 | 0.528 | 0.525 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.525 | 0.994 | 0.003 | node-14/thread-3/reader.execute | none observed |
| a67208b356ea39cc00000000000f4dd6 | 0.523 | 0.521 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.521 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc00000000000e0c35 | 0.521 | 0.520 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.520 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |

## P5 / presweep / read (173 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.073 | n/a | n/a | n/a | 0.036 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.066 | 0.975 | 0.002 |
| p99 | 275.071 | n/a | n/a | n/a | 19.770 | n/a | 2.876 | 275.031 | 1.646 | 4.899 | 0.018 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.026 | 275.069 | 1.000 | 0.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a67208b356ea39cc0000000000103210 | 275.129 | 0.099 | n/a | 0.000 | 275.028 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.127 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| a67208b356ea39cc000000000010320d | 275.071 | 0.062 | n/a | 0.000 | 275.007 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.069 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| a67208b356ea39cc000000000010320f | 275.066 | 0.030 | n/a | 0.000 | 275.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.064 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| a67208b356ea39cc000000000010320e | 275.063 | 0.030 | n/a | 0.000 | 275.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.061 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| a67208b356ea39cc000000000010320c | 275.006 | 0.072 | n/a | 0.000 | 274.932 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.004 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| a67208b356ea39cc000000000010320b | 273.419 | 0.211 | n/a | 0.000 | 273.204 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 273.415 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| 7245b6853c0820e9000000000005f7f0 | 271.880 | 0.243 | n/a | 0.000 | 271.632 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 271.874 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.065ms |
| 421c744c603276b70000000000067793 | 269.841 | 0.029 | n/a | 0.000 | 269.811 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.840 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 421c744c603276b70000000000067792 | 269.787 | 0.031 | n/a | 0.000 | 269.755 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.786 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 421c744c603276b70000000000067791 | 269.731 | 0.043 | n/a | 0.000 | 269.687 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.730 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 421c744c603276b70000000000067790 | 269.578 | 0.097 | n/a | 0.000 | 269.479 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.576 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7245b6853c0820e9000000000005f813 | 269.525 | 0.023 | n/a | 0.000 | 269.500 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.523 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.065ms |
| 7245b6853c0820e9000000000005f812 | 269.499 | 0.033 | n/a | 0.000 | 269.463 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.496 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.065ms |
| 7245b6853c0820e9000000000005f838 | 268.712 | 0.052 | n/a | 0.000 | 268.660 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.711 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.065ms |
| 7245b6853c0820e9000000000005f839 | 268.712 | 0.031 | n/a | 0.000 | 268.680 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.711 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.065ms |
| a67208b356ea39cc00000000001054d4 | 268.061 | 0.166 | n/a | 0.000 | 267.883 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 268.049 | 1.000 | 0.012 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc00000000001054d5 | 268.049 | 0.045 | n/a | 0.000 | 267.977 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 268.023 | 1.000 | 0.026 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc00000000001054d6 | 268.027 | 0.036 | n/a | 0.000 | 267.988 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 268.024 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc00000000001054d8 | 268.026 | 0.121 | n/a | 0.000 | 267.901 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 268.022 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a67208b356ea39cc00000000001054d7 | 268.015 | 0.037 | n/a | 0.000 | 267.975 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 268.012 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P5 / sweep / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 2.418 | n/a | n/a | n/a | 2.339 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 2.339 | 0.996 | 0.011 |
| p99 | 28.109 | n/a | n/a | n/a | 21.189 | n/a | 5.057 | 0.000 | 3.912 | 1.409 | 0.009 | 0.000 | 0.052 | 0.000 | n/a | n/a | 3.038 | 22.750 | 1.000 | 3.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 421c744c603276b70000000000069870 | 28.109 | 21.189 | n/a | 1.561 | 0.000 | 3.912 | 1.409 | 0.008 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.007 | 22.750 | 0.809 | 0.007 | node-14/thread-4/reader.execute | none observed |
| a9ba5d71a4ad07390000000000000183 | 19.580 | 18.071 | n/a | 1.475 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 19.546 | 0.998 | 0.034 | node-14/thread-6/replica.pull-at | none observed |
| a9ba5d71a4ad07390000000000000184 | 18.734 | 17.202 | n/a | 1.475 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.057 | 18.677 | 0.997 | 0.057 | node-14/thread-6/replica.pull-at | none observed |
| a9ba5d71a4ad07390000000000000185 | 18.052 | 16.520 | n/a | 1.475 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.056 | 17.996 | 0.997 | 0.056 | node-14/thread-6/replica.pull-at | none observed |
| a9ba5d71a4ad07390000000000000186 | 17.390 | 15.859 | n/a | 1.475 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.055 | 17.335 | 0.997 | 0.055 | node-14/thread-6/replica.pull-at | none observed |
| a9ba5d71a4ad07390000000000000187 | 16.879 | 15.354 | n/a | 1.475 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.049 | 16.829 | 0.997 | 0.049 | node-14/thread-6/replica.pull-at | none observed |
| a9ba5d71a4ad07390000000000000043 | 10.598 | 9.803 | n/a | 0.733 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.062 | 10.536 | 0.994 | 0.062 | node-14/thread-6/replica.pull-at | none observed |
| a9ba5d71a4ad07390000000000000044 | 10.376 | 9.614 | n/a | 0.733 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 10.347 | 0.997 | 0.029 | node-14/thread-6/replica.pull-at | none observed |
| a9ba5d71a4ad07390000000000000045 | 10.273 | 9.506 | n/a | 0.733 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 10.239 | 0.997 | 0.034 | node-14/thread-6/replica.pull-at | none observed |
| a9ba5d71a4ad07390000000000000046 | 10.193 | 9.425 | n/a | 0.733 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 10.158 | 0.997 | 0.035 | node-14/thread-6/replica.pull-at | none observed |
| a9ba5d71a4ad07390000000000000047 | 10.073 | 9.298 | n/a | 0.733 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.042 | 10.031 | 0.996 | 0.042 | node-14/thread-6/replica.pull-at | none observed |
| a9ba5d71a4ad07390000000000000048 | 9.931 | 9.153 | n/a | 0.733 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.045 | 9.886 | 0.996 | 0.045 | node-14/thread-6/replica.pull-at | none observed |
| a9ba5d71a4ad07390000000000000049 | 9.834 | 9.053 | n/a | 0.733 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.048 | 9.786 | 0.995 | 0.048 | node-14/thread-6/replica.pull-at | none observed |
| a9ba5d71a4ad0739000000000000004a | 9.714 | 8.930 | n/a | 0.733 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.051 | 9.663 | 0.995 | 0.051 | node-14/thread-6/replica.pull-at | none observed |
| a9ba5d71a4ad07390000000000000188 | 9.236 | 7.684 | n/a | 1.475 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.077 | 9.159 | 0.992 | 0.077 | node-14/thread-6/replica.pull-at | none observed |
| a9ba5d71a4ad07390000000000000189 | 8.349 | 6.804 | n/a | 1.475 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.070 | 8.279 | 0.992 | 0.070 | node-14/thread-6/replica.pull-at | none observed |
| a9ba5d71a4ad073900000000000002f3 | 8.170 | 3.103 | n/a | 5.057 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 8.159 | 0.999 | 0.011 | node-14/thread-6/node.gc | none observed |
| a9ba5d71a4ad073900000000000000f3 | 8.041 | 5.950 | n/a | 2.073 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 8.023 | 0.998 | 0.018 | node-14/thread-6/replica.pull-at | none observed |
| a9ba5d71a4ad073900000000000002f4 | 8.003 | 2.928 | n/a | 5.057 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 7.985 | 0.998 | 0.018 | node-14/thread-6/node.gc | none observed |
| a9ba5d71a4ad073900000000000002f5 | 7.897 | 2.820 | n/a | 5.057 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 7.877 | 0.997 | 0.020 | node-14/thread-6/node.gc | none observed |

## P1 / baseline / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.018 | n/a | n/a | n/a | 0.016 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.016 | 0.921 | 0.001 |
| p99 | 0.173 | n/a | n/a | n/a | 0.171 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 0.171 | 0.990 | 0.022 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7245b6853c0820e9000000000000c278 | 0.173 | 0.171 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.171 | 0.990 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| a67208b356ea39cc000000000000ebec | 0.128 | 0.127 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.127 | 0.990 | 0.001 | node-14/thread-3/reader.execute | none observed |
| 7245b6853c0820e9000000000000c276 | 0.121 | 0.099 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 0.099 | 0.818 | 0.022 | node-14/thread-5/reader.execute | none observed |
| 421c744c603276b7000000000000cfb6 | 0.086 | 0.084 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.084 | 0.980 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 7245b6853c0820e9000000000000c27a | 0.043 | 0.042 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.042 | 0.972 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| 7245b6853c0820e9000000000000c279 | 0.036 | 0.034 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.034 | 0.959 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| 7245b6853c0820e9000000000000c277 | 0.018 | 0.015 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.015 | 0.851 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| 421c744c603276b7000000000000cfb7 | 0.017 | 0.016 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.016 | 0.901 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a67208b356ea39cc000000000000ebed | 0.016 | 0.013 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.013 | 0.844 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 421c744c603276b7000000000000cfb9 | 0.010 | 0.009 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.009 | 0.905 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 421c744c603276b7000000000000cfb8 | 0.009 | 0.009 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.009 | 0.921 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 421c744c603276b7000000000000cfba | 0.009 | 0.009 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 0.009 | 0.947 | 0.000 | node-14/thread-4/replica.pull-at | none observed |

## P1 / outside-phases / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.096 | n/a | n/a | n/a | 0.069 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 0.069 | 0.732 | 0.021 |
| p99 | 0.513 | n/a | n/a | n/a | 0.507 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.070 | 0.507 | 0.988 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 421c744c603276b7000000000006a03e | 0.513 | 0.507 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.507 | 0.988 | 0.006 | node-14/thread-4/replica.pull-at | none observed |
| 421c744c603276b7000000000006a03f | 0.499 | 0.434 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.065 | 0.434 | 0.869 | 0.065 | node-14/thread-4/replica.pull-at | none observed |
| 421c744c603276b7000000000006a040 | 0.247 | 0.178 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.069 | 0.178 | 0.721 | 0.069 | node-14/thread-4/replica.pull-at | none observed |
| a67208b356ea39cc0000000000107bae | 0.168 | 0.165 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.165 | 0.984 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 421c744c603276b7000000000006a041 | 0.155 | 0.086 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.070 | 0.086 | 0.552 | 0.070 | uncovered | none observed |
| 421c744c603276b7000000000006a042 | 0.116 | 0.046 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.070 | 0.046 | 0.398 | 0.070 | uncovered | none observed |
| a67208b356ea39cc0000000000107baf | 0.096 | 0.078 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.078 | 0.809 | 0.018 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000107bb0 | 0.090 | 0.069 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 0.069 | 0.769 | 0.021 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000107bb1 | 0.080 | 0.059 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 0.059 | 0.732 | 0.021 | node-14/thread-3/replica.pull-at | none observed |
| a67208b356ea39cc0000000000107bb2 | 0.045 | 0.023 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 0.023 | 0.519 | 0.022 | uncovered | none observed |
| a67208b356ea39cc0000000000107bb3 | 0.037 | 0.015 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 0.015 | 0.395 | 0.022 | uncovered | none observed |
| 7245b6853c0820e90000000000064382 | 0.026 | 0.023 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.023 | 0.906 | 0.002 | node-14/thread-5/reader.execute | none observed |

## P3 / outside-phases / read (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.259 | n/a | n/a | n/a | 0.049 | n/a | 0.000 | 0.000 | 0.965 | 201.002 | 0.020 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.100 | 0.049 | 0.000 | 0.100 |
| p99 | 206.734 | n/a | n/a | n/a | 0.671 | n/a | 0.000 | 0.000 | 3.045 | 203.107 | 3.042 | 18.254 | 0.379 | 0.000 | n/a | n/a | 0.338 | 0.671 | 0.008 | 0.338 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69c2c70021304b090000000000000006 | 206.734 | 0.290 | n/a | 0.000 | 0.000 | 2.624 | 203.107 | 0.113 | 0.000 | 0.325 | 0.000 | n/a | n/a | 0.276 | 0.290 | 0.001 | 0.276 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b090000000000000008 | 205.698 | 0.096 | n/a | 0.000 | 0.000 | 3.045 | 201.923 | 0.033 | 0.000 | 0.337 | 0.000 | n/a | n/a | 0.264 | 0.096 | 0.000 | 0.264 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b090000000000000007 | 204.549 | 0.083 | n/a | 0.000 | 0.000 | 1.542 | 202.243 | 0.029 | 0.000 | 0.379 | 0.000 | n/a | n/a | 0.273 | 0.083 | 0.000 | 0.273 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b090000000000000005 | 203.947 | 0.132 | n/a | 0.000 | 0.000 | 2.159 | 201.091 | 0.026 | 0.000 | 0.201 | 0.000 | n/a | n/a | 0.338 | 0.132 | 0.001 | 0.338 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b09000000000000008e | 203.574 | 0.075 | n/a | 0.000 | 0.000 | 1.193 | 201.843 | 0.060 | 0.000 | 0.289 | 0.000 | n/a | n/a | 0.115 | 0.075 | 0.000 | 0.115 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b090000000000000063 | 203.351 | 0.081 | n/a | 0.000 | 0.000 | 1.248 | 201.666 | 0.032 | 0.000 | 0.228 | 0.000 | n/a | n/a | 0.096 | 0.081 | 0.000 | 0.096 | gw-r/thread-50/journal/page | none observed |
| 69c2c70021304b090000000000000064 | 203.242 | 0.042 | n/a | 0.000 | 0.000 | 1.136 | 201.659 | 0.024 | 0.000 | 0.302 | 0.000 | n/a | n/a | 0.079 | 0.042 | 0.000 | 0.079 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b09000000000000008a | 203.216 | 0.281 | n/a | 0.000 | 0.000 | 1.361 | 201.050 | 0.023 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.335 | 0.281 | 0.001 | 0.335 | gw-r/thread-48/journal/page | none observed |
| 69c2c70021304b0900000000000000ad | 202.895 | 0.034 | n/a | 0.000 | 0.000 | 1.735 | 200.916 | 0.014 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.077 | 0.034 | 0.000 | 0.077 | gw-r/thread-70/journal/page | none observed |
| 69c2c70021304b09000000000000005f | 202.780 | 0.050 | n/a | 0.000 | 0.000 | 1.024 | 201.391 | 0.034 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.090 | 0.050 | 0.000 | 0.090 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b09000000000000008b | 202.643 | 0.063 | n/a | 0.000 | 0.000 | 0.971 | 201.288 | 0.023 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.126 | 0.063 | 0.000 | 0.126 | gw-r/thread-50/journal/page | none observed |
| 69c2c70021304b0900000000000000af | 202.594 | 0.045 | n/a | 0.000 | 0.000 | 0.950 | 201.342 | 0.051 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.115 | 0.045 | 0.000 | 0.115 | gw-r/thread-70/journal/page | none observed |
| 69c2c70021304b0900000000000000dd | 202.575 | 0.045 | n/a | 0.000 | 0.000 | 0.904 | 201.320 | 0.039 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.108 | 0.045 | 0.000 | 0.108 | gw-r/thread-72/journal/page | none observed |
| 69c2c70021304b0900000000000000b9 | 202.477 | 0.033 | n/a | 0.000 | 0.000 | 1.520 | 200.766 | 0.014 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.072 | 0.033 | 0.000 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 69c2c70021304b0900000000000000de | 202.387 | 0.048 | n/a | 0.000 | 0.000 | 0.680 | 201.442 | 0.014 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.088 | 0.048 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 69c2c70021304b090000000000000060 | 202.356 | 0.049 | n/a | 0.000 | 0.000 | 0.855 | 201.199 | 0.014 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.119 | 0.049 | 0.000 | 0.119 | gw-r/thread-48/journal/page | none observed |
| 69c2c70021304b09000000000000008d | 202.343 | 0.050 | n/a | 0.000 | 0.000 | 0.897 | 201.058 | 0.027 | 0.000 | 0.211 | 0.000 | n/a | n/a | 0.100 | 0.050 | 0.000 | 0.100 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b0900000000000000b4 | 202.295 | 0.044 | n/a | 0.000 | 0.000 | 1.033 | 201.002 | 0.013 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.084 | 0.044 | 0.000 | 0.084 | gw-r/thread-55/journal/page | none observed |
| 69c2c70021304b090000000000000088 | 202.292 | 0.042 | n/a | 0.000 | 0.000 | 0.891 | 201.123 | 0.019 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.088 | 0.042 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 69c2c70021304b090000000000000089 | 202.288 | 0.047 | n/a | 0.000 | 0.000 | 1.079 | 200.898 | 0.017 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.125 | 0.047 | 0.000 | 0.125 | gw-r/thread-50/journal/page | none observed |

## P3 / outside-phases / internal (19 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 545.876 | n/a | n/a | n/a | 2.876 | n/a | 0.000 | 0.000 | 1.049 | 520.388 | 0.025 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.112 | 2.876 | 0.006 | 0.112 |
| p99 | 1033.426 | n/a | n/a | n/a | 24.696 | n/a | 8.252 | 0.000 | 29.839 | 1001.704 | 2.744 | 18.254 | 0.324 | 0.000 | n/a | n/a | 1.305 | 32.949 | 0.704 | 1.305 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a0000000000000017 | 1033.426 | 0.231 | n/a | 0.000 | 0.000 | 29.839 | 1001.704 | 0.023 | 0.000 | 0.324 | 0.000 | n/a | n/a | 1.305 | 0.231 | 0.000 | 1.305 | gw-r/thread-55/journal/page | none observed |
| 36593680d7b40f8a0000000000000054 | 1003.742 | 0.285 | n/a | 0.000 | 0.000 | 1.049 | 987.661 | 0.035 | 13.370 | 0.165 | 0.000 | n/a | n/a | 1.177 | 0.285 | 0.000 | 1.177 | gw-r/thread-50/journal/page | none observed |
| 36593680d7b40f8a0000000000000018 | 1003.492 | 0.124 | n/a | 0.000 | 0.000 | 0.803 | 1001.124 | 0.025 | 0.000 | 0.198 | 0.000 | n/a | n/a | 1.219 | 0.124 | 0.000 | 1.219 | gw-r/thread-51/journal/page | none observed |
| 36593680d7b40f8a0000000000000019 | 1003.398 | 0.197 | n/a | 0.000 | 0.000 | 0.790 | 1001.096 | 0.023 | 0.000 | 0.173 | 0.000 | n/a | n/a | 1.120 | 0.197 | 0.000 | 1.120 | gw-r/thread-50/journal/page | none observed |
| 36593680d7b40f8a0000000000000053 | 1003.335 | 2.688 | n/a | 0.000 | 0.000 | 0.775 | 999.565 | 0.016 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.187 | 2.688 | 0.003 | 0.187 | gw-r/thread-48/journal/page | none observed |
| 36593680d7b40f8a0000000000000086 | 933.796 | 2.435 | n/a | 0.000 | 0.000 | 0.500 | 930.704 | 0.015 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.058 | 2.435 | 0.003 | 0.058 | gw-r/thread-48/journal/page | none observed |
| 36593680d7b40f8a0000000000000070 | 899.392 | 2.876 | n/a | 0.000 | 0.000 | 0.999 | 895.314 | 0.022 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.080 | 2.876 | 0.003 | 0.080 | gw-r/thread-52/journal/page | none observed |
| 36593680d7b40f8a0000000000000089 | 803.648 | 3.914 | n/a | 0.000 | 0.000 | 3.225 | 796.175 | 0.141 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.063 | 3.914 | 0.005 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 36593680d7b40f8a000000000000008c | 687.012 | 2.376 | n/a | 0.000 | 0.000 | 0.820 | 683.588 | 0.015 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.062 | 2.376 | 0.003 | 0.062 | gw-r/thread-50/journal/page | none observed |
| 36593680d7b40f8a0000000000000073 | 545.876 | 3.477 | n/a | 0.000 | 0.000 | 0.835 | 520.388 | 2.744 | 18.254 | 0.099 | 0.000 | n/a | n/a | 0.079 | 3.477 | 0.006 | 0.079 | gw-r/thread-52/journal/page | none observed |
| 36593680d7b40f8a0000000000000072 | 492.069 | 6.323 | n/a | 0.000 | 0.000 | 2.673 | 482.499 | 0.326 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.116 | 6.323 | 0.013 | 0.116 | gw-r/thread-50/journal/page | none observed |
| 36593680d7b40f8a000000000000001a | 384.046 | 24.696 | n/a | 8.252 | 0.000 | 0.953 | 349.465 | 0.047 | 0.000 | 0.232 | 0.000 | n/a | n/a | 0.400 | 32.949 | 0.086 | 0.400 | gw-r/thread-52/journal/page | none observed |
| 36593680d7b40f8a000000000000008a | 347.587 | 3.890 | n/a | 0.000 | 0.000 | 2.734 | 334.941 | 0.014 | 5.820 | 0.097 | 0.000 | n/a | n/a | 0.091 | 3.890 | 0.011 | 0.091 | gw-r/thread-50/journal/page | none observed |
| 36593680d7b40f8a0000000000000020 | 345.223 | 2.605 | n/a | 0.000 | 0.000 | 1.603 | 340.768 | 0.014 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.112 | 2.605 | 0.008 | 0.112 | gw-r/thread-50/journal/page | none observed |
| 36593680d7b40f8a000000000000006e | 336.688 | 6.343 | n/a | 0.000 | 0.000 | 1.370 | 328.432 | 0.045 | 0.000 | 0.211 | 0.000 | n/a | n/a | 0.288 | 6.343 | 0.019 | 0.288 | gw-r/thread-70/journal/page | none observed |
| 36593680d7b40f8a0000000000000087 | 205.125 | 2.730 | n/a | 0.000 | 0.000 | 1.333 | 200.728 | 0.154 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.061 | 2.730 | 0.013 | 0.061 | gw-r/thread-69/journal/page | none observed |
| 36593680d7b40f8a000000000000006f | 113.969 | 8.515 | n/a | 0.000 | 0.000 | 3.157 | 102.085 | 0.062 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.111 | 8.515 | 0.075 | 0.111 | gw-r/thread-70/journal/page | none observed |
| 36593680d7b40f8a000000000000006a | 14.929 | 7.779 | n/a | 0.000 | 0.000 | 1.567 | 5.011 | 0.044 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.482 | 7.779 | 0.521 | 0.482 | node-14/thread-2/replica.fetch-feed | none observed |
| 36593680d7b40f8a0000000000000085 | 6.492 | 4.571 | n/a | 0.000 | 0.000 | 0.670 | 1.139 | 0.010 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.087 | 4.571 | 0.704 | 0.087 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 662.763 | n/a | n/a | n/a | 3.054 | n/a | 0.000 | 0.000 | 2.680 | 658.350 | 0.030 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.275 | 3.054 | 0.010 | 0.275 |
| p99 | 908.969 | n/a | n/a | n/a | 9.385 | n/a | 0.000 | 0.000 | 3.930 | 881.313 | 0.117 | 13.887 | 0.166 | 0.000 | n/a | n/a | 0.300 | 9.385 | 0.010 | 0.300 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a000000000000001c | 908.969 | 9.385 | n/a | 0.000 | 0.000 | 3.930 | 881.313 | 0.030 | 13.887 | 0.150 | 0.000 | n/a | n/a | 0.275 | 9.385 | 0.010 | 0.275 | gw-r/thread-55/journal/page | none observed |
| 36593680d7b40f8a000000000000001e | 662.763 | 3.054 | n/a | 0.000 | 0.000 | 0.900 | 658.350 | 0.117 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.177 | 3.054 | 0.005 | 0.177 | gw-r/thread-51/journal/page | none observed |
| 36593680d7b40f8a000000000000001d | 279.261 | 2.917 | n/a | 0.000 | 0.000 | 2.680 | 273.217 | 0.021 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.300 | 2.917 | 0.010 | 0.300 | gw-r/thread-69/journal/page | none observed |

## P3 / baseline / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 533.625 | n/a | n/a | n/a | 3.512 | n/a | 0.000 | 0.000 | 1.005 | 527.759 | 0.020 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.101 | 3.512 | 0.007 | 0.101 |
| p99 | 1000.134 | n/a | n/a | n/a | 4.319 | n/a | 0.000 | 0.000 | 1.562 | 995.920 | 0.046 | 0.000 | 0.225 | 0.000 | n/a | n/a | 0.146 | 4.319 | 0.024 | 0.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a0000000000000028 | 1000.134 | 3.033 | n/a | 0.000 | 0.000 | 0.927 | 995.920 | 0.020 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.098 | 3.033 | 0.003 | 0.098 | gw-r/thread-52/journal/page | none observed |
| 36593680d7b40f8a0000000000000022 | 642.348 | 3.439 | n/a | 0.000 | 0.000 | 0.824 | 637.861 | 0.018 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.094 | 3.439 | 0.005 | 0.094 | gw-r/thread-52/journal/page | none observed |
| 36593680d7b40f8a0000000000000023 | 533.625 | 3.990 | n/a | 0.000 | 0.000 | 1.562 | 527.759 | 0.028 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.139 | 3.990 | 0.007 | 0.139 | gw-r/thread-48/journal/page | none observed |
| 36593680d7b40f8a0000000000000024 | 318.967 | 4.319 | n/a | 0.000 | 0.000 | 1.142 | 313.088 | 0.046 | 0.000 | 0.225 | 0.000 | n/a | n/a | 0.146 | 4.319 | 0.014 | 0.146 | gw-r/thread-52/journal/page | none observed |
| 36593680d7b40f8a0000000000000027 | 145.950 | 3.512 | n/a | 0.000 | 0.000 | 1.005 | 141.205 | 0.017 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.101 | 3.512 | 0.024 | 0.101 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 259.425 | n/a | n/a | n/a | 3.199 | n/a | 0.000 | 0.000 | 0.990 | 255.395 | 0.025 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.104 | 3.199 | 0.011 | 0.104 |
| p99 | 744.083 | n/a | n/a | n/a | 7.220 | n/a | 0.000 | 0.000 | 1.086 | 735.497 | 0.038 | 0.000 | 0.299 | 0.000 | n/a | n/a | 0.156 | 7.220 | 0.017 | 0.156 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a0000000000000029 | 744.083 | 7.220 | n/a | 0.000 | 0.000 | 0.990 | 735.497 | 0.038 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.156 | 7.220 | 0.010 | 0.156 | gw-r/thread-70/journal/page | none observed |
| 36593680d7b40f8a000000000000002a | 259.425 | 2.848 | n/a | 0.000 | 0.000 | 0.947 | 255.395 | 0.018 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.092 | 2.848 | 0.011 | 0.092 | gw-r/thread-48/journal/page | none observed |
| 36593680d7b40f8a000000000000002c | 183.127 | 3.199 | n/a | 0.000 | 0.000 | 1.086 | 178.414 | 0.025 | 0.000 | 0.299 | 0.000 | n/a | n/a | 0.104 | 3.199 | 0.017 | 0.104 | gw-r/thread-53/journal/page | none observed |

## P3 / L4 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 847.015 | n/a | n/a | n/a | 3.101 | n/a | 0.000 | 0.000 | 1.038 | 842.270 | 0.021 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.098 | 3.101 | 0.004 | 0.098 |
| p99 | 989.579 | n/a | n/a | n/a | 4.025 | n/a | 0.000 | 0.000 | 1.361 | 984.147 | 0.022 | 0.000 | 0.236 | 0.000 | n/a | n/a | 0.133 | 4.025 | 0.004 | 0.133 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a000000000000002f | 989.579 | 4.025 | n/a | 0.000 | 0.000 | 1.016 | 984.147 | 0.021 | 0.000 | 0.236 | 0.000 | n/a | n/a | 0.133 | 4.025 | 0.004 | 0.133 | gw-r/thread-69/journal/page | none observed |
| 36593680d7b40f8a000000000000002d | 847.015 | 3.101 | n/a | 0.000 | 0.000 | 1.361 | 842.270 | 0.022 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.085 | 3.101 | 0.004 | 0.085 | gw-r/thread-48/journal/page | none observed |
| 36593680d7b40f8a0000000000000030 | 655.933 | 2.755 | n/a | 0.000 | 0.000 | 1.038 | 651.892 | 0.021 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.098 | 2.755 | 0.004 | 0.098 | gw-r/thread-54/journal/page | none observed |

## P3 / L16 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 477.520 | n/a | n/a | n/a | 2.777 | n/a | 0.000 | 0.000 | 1.042 | 473.662 | 0.051 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.110 | 2.777 | 0.005 | 0.110 |
| p99 | 875.557 | n/a | n/a | n/a | 4.159 | n/a | 0.000 | 0.000 | 3.416 | 866.898 | 3.183 | 0.000 | 0.218 | 0.000 | n/a | n/a | 0.135 | 4.159 | 0.102 | 0.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a0000000000000035 | 875.557 | 4.159 | n/a | 0.000 | 0.000 | 1.042 | 866.898 | 3.183 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.135 | 4.159 | 0.005 | 0.135 | gw-r/thread-52/journal/page | none observed |
| 36593680d7b40f8a0000000000000031 | 477.520 | 2.587 | n/a | 0.000 | 0.000 | 0.892 | 473.662 | 0.051 | 0.000 | 0.218 | 0.000 | n/a | n/a | 0.110 | 2.587 | 0.005 | 0.110 | gw-r/thread-51/journal/page | none observed |
| 36593680d7b40f8a0000000000000034 | 27.112 | 2.777 | n/a | 0.000 | 0.000 | 3.416 | 20.678 | 0.019 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.105 | 2.777 | 0.102 | 0.105 | gw-r/thread-69/journal/page | none observed |

## P3 / L64 / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 311.614 | n/a | n/a | n/a | 4.091 | n/a | 0.000 | 0.000 | 1.118 | 294.682 | 0.033 | 0.000 | 0.198 | 0.000 | n/a | n/a | 0.165 | 4.091 | 0.006 | 0.165 |
| p99 | 1004.967 | n/a | n/a | n/a | 11.218 | n/a | 1.452 | 0.000 | 1.543 | 1001.567 | 2.938 | 0.000 | 0.227 | 0.000 | n/a | n/a | 1.204 | 12.669 | 0.318 | 1.204 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a000000000000003e | 1004.967 | 0.414 | n/a | 0.000 | 0.000 | 1.543 | 1001.567 | 0.039 | 0.000 | 0.200 | 0.000 | n/a | n/a | 1.204 | 0.414 | 0.000 | 1.204 | gw-r/thread-50/journal/page | none observed |
| 36593680d7b40f8a000000000000003b | 881.126 | 2.402 | n/a | 0.000 | 0.000 | 1.160 | 877.228 | 0.033 | 0.000 | 0.198 | 0.000 | n/a | n/a | 0.105 | 2.402 | 0.003 | 0.105 | gw-r/thread-53/journal/page | none observed |
| 36593680d7b40f8a0000000000000038 | 636.931 | 4.091 | n/a | 0.000 | 0.000 | 1.369 | 631.157 | 0.020 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.165 | 4.091 | 0.006 | 0.165 | gw-r/thread-53/journal/page | none observed |
| 36593680d7b40f8a0000000000000036 | 311.614 | 11.218 | n/a | 1.452 | 0.000 | 0.976 | 294.682 | 2.938 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.177 | 12.669 | 0.041 | 0.177 | gw-r/thread-50/journal/page | none observed |
| 36593680d7b40f8a000000000000003d | 113.281 | 7.699 | n/a | 0.000 | 0.000 | 0.879 | 104.329 | 0.033 | 0.000 | 0.212 | 0.000 | n/a | n/a | 0.129 | 7.699 | 0.068 | 0.129 | gw-r/thread-69/journal/page | none observed |
| 36593680d7b40f8a000000000000003a | 25.363 | 8.069 | n/a | 0.000 | 0.000 | 1.118 | 14.427 | 1.335 | 0.000 | 0.227 | 0.000 | n/a | n/a | 0.186 | 8.069 | 0.318 | 0.186 | gw-r/thread-52/gateway.admitted-work | none observed |

## P3 / L256 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 124.043 | n/a | n/a | n/a | 3.484 | n/a | 0.000 | 0.000 | 1.115 | 119.037 | 0.030 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.137 | 3.484 | 0.010 | 0.137 |
| p99 | 707.370 | n/a | n/a | n/a | 3.713 | n/a | 0.000 | 0.000 | 2.594 | 668.948 | 0.206 | 31.830 | 0.611 | 0.000 | n/a | n/a | 0.152 | 3.713 | 0.058 | 0.152 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a0000000000000043 | 707.370 | 3.713 | n/a | 0.000 | 0.000 | 2.594 | 668.948 | 0.030 | 31.830 | 0.111 | 0.000 | n/a | n/a | 0.146 | 3.713 | 0.005 | 0.146 | gw-r/thread-48/journal/page | none observed |
| 36593680d7b40f8a0000000000000042 | 223.734 | 2.330 | n/a | 0.000 | 0.000 | 1.041 | 219.616 | 0.016 | 0.000 | 0.611 | 0.000 | n/a | n/a | 0.120 | 2.330 | 0.010 | 0.120 | gw-r/thread-52/journal/page | none observed |
| 36593680d7b40f8a000000000000003f | 124.043 | 3.484 | n/a | 0.000 | 0.000 | 1.115 | 119.037 | 0.072 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.152 | 3.484 | 0.028 | 0.152 | gw-r/thread-54/journal/page | none observed |
| 36593680d7b40f8a0000000000000040 | 59.903 | 3.484 | n/a | 0.000 | 0.000 | 1.589 | 54.376 | 0.206 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.137 | 3.484 | 0.058 | 0.137 | gw-r/thread-50/journal/page | none observed |

## P3 / L1024 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 886.516 | n/a | n/a | n/a | 2.811 | n/a | 0.000 | 0.000 | 1.240 | 880.978 | 0.023 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.135 | 2.811 | 0.003 | 0.135 |
| p99 | 1004.016 | n/a | n/a | n/a | 2.902 | n/a | 0.000 | 0.000 | 2.392 | 1001.300 | 0.271 | 0.000 | 0.201 | 0.000 | n/a | n/a | 1.130 | 2.902 | 0.079 | 1.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a0000000000000046 | 1004.016 | 0.125 | n/a | 0.000 | 0.000 | 1.240 | 1001.300 | 0.021 | 0.000 | 0.201 | 0.000 | n/a | n/a | 1.130 | 0.125 | 0.000 | 1.130 | gw-r/thread-51/journal/page | none observed |
| 36593680d7b40f8a0000000000000045 | 886.516 | 2.902 | n/a | 0.000 | 0.000 | 2.392 | 880.978 | 0.023 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.096 | 2.902 | 0.003 | 0.096 | gw-r/thread-53/journal/page | none observed |
| 36593680d7b40f8a0000000000000047 | 35.574 | 2.811 | n/a | 0.000 | 0.000 | 0.770 | 31.501 | 0.271 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.135 | 2.811 | 0.079 | 0.135 | gw-r/thread-55/journal/page | none observed |

## P3 / recovery / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 632.487 | n/a | n/a | n/a | 4.109 | n/a | 0.000 | 0.000 | 1.066 | 626.813 | 0.039 | 0.000 | 0.206 | 0.000 | n/a | n/a | 0.153 | 4.109 | 0.006 | 0.153 |
| p99 | 972.806 | n/a | n/a | n/a | 5.973 | n/a | 0.000 | 0.000 | 3.217 | 963.295 | 6.324 | 0.000 | 0.323 | 0.000 | n/a | n/a | 0.168 | 5.973 | 0.023 | 0.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a000000000000004e | 972.806 | 5.973 | n/a | 0.000 | 0.000 | 3.217 | 963.295 | 0.017 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.153 | 5.973 | 0.006 | 0.153 | gw-r/thread-69/journal/page | none observed |
| 36593680d7b40f8a0000000000000048 | 863.629 | 4.697 | n/a | 0.000 | 0.000 | 0.966 | 857.491 | 0.152 | 0.000 | 0.206 | 0.000 | n/a | n/a | 0.116 | 4.697 | 0.005 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 36593680d7b40f8a000000000000004d | 632.487 | 4.020 | n/a | 0.000 | 0.000 | 1.188 | 626.813 | 0.039 | 0.000 | 0.264 | 0.000 | n/a | n/a | 0.162 | 4.020 | 0.006 | 0.162 | gw-r/thread-69/journal/page | none observed |
| 36593680d7b40f8a000000000000004b | 298.782 | 4.109 | n/a | 0.000 | 0.000 | 1.059 | 293.280 | 0.033 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.168 | 4.109 | 0.014 | 0.168 | gw-r/thread-51/journal/page | none observed |
| 36593680d7b40f8a000000000000004a | 150.894 | 3.464 | n/a | 0.000 | 0.000 | 1.066 | 139.585 | 6.324 | 0.000 | 0.323 | 0.000 | n/a | n/a | 0.132 | 3.464 | 0.023 | 0.132 | gw-r/thread-52/journal/page | none observed |

## P3 / p4mix / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 993.046 | n/a | n/a | n/a | 2.875 | n/a | 0.000 | 0.000 | 0.927 | 988.999 | 0.028 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.110 | 2.875 | 0.003 | 0.110 |
| p99 | 996.314 | n/a | n/a | n/a | 5.305 | n/a | 0.000 | 0.000 | 1.003 | 991.535 | 1.120 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.198 | 5.305 | 0.208 | 0.198 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a0000000000000052 | 996.314 | 2.539 | n/a | 0.000 | 0.000 | 0.878 | 991.535 | 1.120 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.091 | 2.539 | 0.003 | 0.091 | gw-r/thread-55/journal/page | none observed |
| 36593680d7b40f8a000000000000004f | 993.046 | 2.875 | n/a | 0.000 | 0.000 | 0.927 | 988.999 | 0.028 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.110 | 2.875 | 0.003 | 0.110 | gw-r/thread-69/journal/page | none observed |
| 36593680d7b40f8a0000000000000050 | 25.531 | 5.305 | n/a | 0.000 | 0.000 | 1.003 | 18.866 | 0.023 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.198 | 5.305 | 0.208 | 0.198 | gw-r/thread-54/journal/page | none observed |

## P3 / p4h1 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 314.371 | n/a | n/a | n/a | 6.356 | n/a | 0.000 | 0.000 | 4.009 | 298.512 | 0.048 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.203 | 6.356 | 0.033 | 0.203 |
| p99 | 823.021 | n/a | n/a | n/a | 17.756 | n/a | 0.000 | 0.000 | 11.811 | 815.211 | 2.189 | 0.000 | 0.227 | 0.000 | n/a | n/a | 1.564 | 17.756 | 0.146 | 1.564 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a000000000000005b | 823.021 | 6.282 | n/a | 0.000 | 0.000 | 1.176 | 815.211 | 0.021 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.208 | 6.282 | 0.008 | 0.208 | gw-r/thread-52/journal/page | none observed |
| 36593680d7b40f8a0000000000000057 | 531.031 | 17.756 | n/a | 0.000 | 0.000 | 4.227 | 507.221 | 0.036 | 0.000 | 0.227 | 0.000 | n/a | n/a | 1.564 | 17.756 | 0.033 | 1.564 | gw-r/thread-50/journal/page | none observed |
| 36593680d7b40f8a0000000000000056 | 314.371 | 11.417 | n/a | 0.000 | 0.000 | 4.009 | 298.512 | 0.051 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.183 | 11.417 | 0.036 | 0.183 | gw-r/thread-51/journal/page | none observed |
| 36593680d7b40f8a000000000000005a | 238.251 | 6.356 | n/a | 0.000 | 0.000 | 11.811 | 219.619 | 0.048 | 0.000 | 0.214 | 0.000 | n/a | n/a | 0.203 | 6.356 | 0.027 | 0.203 | gw-r/thread-69/journal/page | none observed |
| 36593680d7b40f8a0000000000000055 | 15.983 | 2.330 | n/a | 0.000 | 0.000 | 1.148 | 10.181 | 2.189 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.095 | 2.330 | 0.146 | 0.095 | gw-r/thread-53/gateway.admitted-work | none observed |

## P3 / grow3 / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 111.468 | n/a | n/a | n/a | 10.243 | n/a | 0.000 | 0.000 | 1.305 | 107.167 | 0.048 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.240 | 10.243 | 0.045 | 0.240 |
| p99 | 1212.322 | n/a | n/a | n/a | 168.815 | n/a | 13.642 | 0.000 | 2.765 | 982.500 | 0.301 | 42.653 | 2.328 | 0.000 | n/a | n/a | 3.794 | 182.457 | 0.681 | 3.794 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a000000000000005f | 1212.322 | 168.815 | n/a | 13.642 | 0.000 | 0.680 | 982.500 | 0.068 | 42.653 | 0.170 | 0.000 | n/a | n/a | 3.794 | 182.457 | 0.151 | 3.794 | gw-r/thread-48/journal/page | none observed |
| 36593680d7b40f8a0000000000000068 | 530.310 | 126.733 | n/a | 8.759 | 0.000 | 2.344 | 389.747 | 0.027 | 0.000 | 0.131 | 0.000 | n/a | n/a | 2.569 | 135.491 | 0.255 | 2.569 | gw-r/thread-69/journal/page | none observed |
| 36593680d7b40f8a000000000000005e | 479.369 | 13.094 | n/a | 1.636 | 0.000 | 1.165 | 462.437 | 0.301 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.570 | 14.730 | 0.031 | 0.570 | gw-r/thread-55/journal/page | none observed |
| 36593680d7b40f8a0000000000000065 | 172.403 | 5.791 | n/a | 0.000 | 0.000 | 1.542 | 162.443 | 0.101 | 0.000 | 2.328 | 0.000 | n/a | n/a | 0.198 | 5.791 | 0.034 | 0.198 | gw-r/thread-54/journal/page | none observed |
| 36593680d7b40f8a0000000000000067 | 111.468 | 2.859 | n/a | 0.000 | 0.000 | 1.124 | 107.167 | 0.092 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.100 | 2.859 | 0.026 | 0.100 | gw-r/thread-55/journal/page | none observed |
| 36593680d7b40f8a000000000000005c | 97.015 | 4.355 | n/a | 0.000 | 0.000 | 1.426 | 90.867 | 0.018 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.168 | 4.355 | 0.045 | 0.168 | gw-r/thread-55/journal/page | none observed |
| 36593680d7b40f8a0000000000000064 | 72.016 | 10.243 | n/a | 0.000 | 0.000 | 2.765 | 58.685 | 0.015 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.240 | 10.243 | 0.142 | 0.240 | gw-r/thread-52/journal/page | none observed |
| 36593680d7b40f8a0000000000000063 | 30.332 | 20.660 | n/a | 0.000 | 0.000 | 1.305 | 6.547 | 0.048 | 0.000 | 0.034 | 0.000 | n/a | n/a | 1.738 | 20.660 | 0.681 | 1.738 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h3 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 661.929 | n/a | n/a | n/a | 2.601 | n/a | 0.000 | 0.000 | 0.850 | 500.111 | 0.017 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.085 | 2.601 | 0.007 | 0.085 |
| p99 | 990.635 | n/a | n/a | n/a | 103.612 | n/a | 6.680 | 0.000 | 1.117 | 987.039 | 0.021 | 48.762 | 0.127 | 0.000 | n/a | n/a | 1.714 | 110.291 | 0.167 | 1.714 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a0000000000000075 | 990.635 | 2.601 | n/a | 0.000 | 0.000 | 0.778 | 987.039 | 0.021 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.085 | 2.601 | 0.003 | 0.085 | gw-r/thread-54/journal/page | none observed |
| 36593680d7b40f8a0000000000000078 | 699.554 | 4.949 | n/a | 0.000 | 0.000 | 1.117 | 693.233 | 0.016 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.113 | 4.949 | 0.007 | 0.113 | gw-r/thread-54/journal/page | none observed |
| 36593680d7b40f8a0000000000000079 | 661.929 | 103.612 | n/a | 6.680 | 0.000 | 0.938 | 500.111 | 0.017 | 48.762 | 0.094 | 0.000 | n/a | n/a | 1.714 | 110.291 | 0.167 | 1.714 | gw-r/thread-54/journal/page | none observed |
| 36593680d7b40f8a0000000000000076 | 275.139 | 2.477 | n/a | 0.000 | 0.000 | 0.850 | 271.588 | 0.021 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.077 | 2.477 | 0.009 | 0.077 | gw-r/thread-53/journal/page | none observed |

## P3 / grow10 / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 142.114 | n/a | n/a | n/a | 87.753 | n/a | 3.310 | 0.000 | 1.283 | 18.502 | 0.012 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.367 | 91.829 | 0.333 | 1.367 |
| p99 | 366.736 | n/a | n/a | n/a | 178.467 | n/a | 9.492 | 0.000 | 1.906 | 284.340 | 0.860 | 6.765 | 0.170 | 0.000 | n/a | n/a | 3.170 | 187.959 | 0.888 | 3.170 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a0000000000000081 | 366.736 | 113.169 | n/a | 9.092 | 0.000 | 1.073 | 241.560 | 0.057 | 0.000 | 0.170 | 0.000 | n/a | n/a | 1.614 | 122.261 | 0.333 | 1.614 | gw-r/thread-51/journal/page | none observed |
| 36593680d7b40f8a000000000000007e | 295.900 | 8.450 | n/a | 1.462 | 0.000 | 1.398 | 284.340 | 0.013 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.112 | 9.912 | 0.033 | 0.112 | gw-r/thread-55/journal/page | none observed |
| 36593680d7b40f8a000000000000007a | 211.564 | 178.467 | n/a | 9.492 | 0.000 | 1.906 | 18.502 | 0.011 | 0.000 | 0.016 | 0.000 | n/a | n/a | 3.170 | 187.959 | 0.888 | 3.170 | node-14/thread-2/replica.fetch-feed | none observed |
| 36593680d7b40f8a0000000000000083 | 189.910 | 90.913 | n/a | 5.170 | 0.000 | 1.360 | 90.991 | 0.015 | 0.000 | 0.092 | 0.000 | n/a | n/a | 1.367 | 96.083 | 0.506 | 1.367 | gw-r/thread-51/journal/page | none observed |
| 36593680d7b40f8a0000000000000084 | 142.114 | 87.753 | n/a | 4.075 | 0.000 | 1.800 | 45.869 | 0.860 | 0.000 | 0.097 | 0.000 | n/a | n/a | 1.659 | 91.829 | 0.646 | 1.659 | node-14/thread-2/replica.fetch-feed | none observed |
| 36593680d7b40f8a000000000000007b | 125.913 | 99.520 | n/a | 3.310 | 0.000 | 1.283 | 12.667 | 0.007 | 6.765 | 0.010 | 0.000 | n/a | n/a | 2.351 | 102.831 | 0.817 | 2.351 | node-14/thread-2/replica.fetch-feed | none observed |
| 36593680d7b40f8a000000000000007f | 20.497 | 2.647 | n/a | 0.000 | 0.000 | 0.690 | 17.063 | 0.012 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.058 | 2.647 | 0.129 | 0.058 | gw-r/thread-50/journal/page | none observed |
| 36593680d7b40f8a000000000000007d | 17.397 | 3.071 | n/a | 0.000 | 0.000 | 0.961 | 13.194 | 0.007 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.124 | 3.071 | 0.177 | 0.124 | gw-r/thread-69/journal/page | none observed |

## P3 / p4h10 / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.719 | n/a | n/a | n/a | 3.638 | n/a | 0.000 | 0.000 | 0.626 | 199.288 | 0.016 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.085 | 3.638 | 0.006 | 0.085 |
| p99 | 1009.971 | n/a | n/a | n/a | 6.495 | n/a | 0.000 | 0.000 | 1.114 | 1002.197 | 0.150 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.168 | 6.495 | 0.119 | 0.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a0000000000000095 | 1009.971 | 6.495 | n/a | 0.000 | 0.000 | 0.973 | 1002.197 | 0.020 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.168 | 6.495 | 0.006 | 0.168 | gw-r/thread-52/journal/page | none observed |
| 36593680d7b40f8a0000000000000093 | 870.481 | 3.638 | n/a | 0.000 | 0.000 | 0.986 | 865.609 | 0.016 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.133 | 3.638 | 0.004 | 0.133 | gw-r/thread-54/journal/page | none observed |
| 36593680d7b40f8a000000000000008d | 779.382 | 4.146 | n/a | 0.000 | 0.000 | 0.626 | 774.436 | 0.013 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.085 | 4.146 | 0.005 | 0.085 | gw-r/thread-51/journal/page | none observed |
| 36593680d7b40f8a000000000000008f | 203.719 | 3.624 | n/a | 0.000 | 0.000 | 0.617 | 199.288 | 0.022 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.060 | 3.624 | 0.018 | 0.060 | gw-r/thread-51/journal/page | none observed |
| 36593680d7b40f8a0000000000000092 | 89.528 | 4.346 | n/a | 0.000 | 0.000 | 1.114 | 83.909 | 0.011 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.113 | 4.346 | 0.049 | 0.113 | gw-r/thread-55/journal/page | none observed |
| 36593680d7b40f8a0000000000000090 | 26.971 | 3.216 | n/a | 0.000 | 0.000 | 0.567 | 22.846 | 0.150 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.066 | 3.216 | 0.119 | 0.066 | gw-r/thread-51/journal/page | none observed |

## P3 / presweep / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 193.655 | n/a | n/a | n/a | 3.681 | n/a | 0.000 | 0.000 | 1.344 | 189.094 | 0.028 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.077 | 3.681 | 0.018 | 0.077 |
| p99 | 532.407 | n/a | n/a | n/a | 9.796 | n/a | 0.000 | 0.000 | 2.401 | 521.052 | 0.051 | 0.000 | 0.207 | 0.000 | n/a | n/a | 0.138 | 9.796 | 0.147 | 0.138 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a0000000000000099 | 532.407 | 9.796 | n/a | 0.000 | 0.000 | 1.344 | 521.052 | 0.018 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.111 | 9.796 | 0.018 | 0.111 | gw-r/thread-50/journal/page | none observed |
| 36593680d7b40f8a0000000000000096 | 239.441 | 2.489 | n/a | 0.000 | 0.000 | 1.416 | 235.267 | 0.033 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.076 | 2.489 | 0.010 | 0.076 | gw-r/thread-70/journal/page | none observed |
| 36593680d7b40f8a000000000000009c | 193.655 | 3.173 | n/a | 0.000 | 0.000 | 1.076 | 189.094 | 0.028 | 0.000 | 0.207 | 0.000 | n/a | n/a | 0.077 | 3.173 | 0.016 | 0.077 | gw-r/thread-50/journal/page | none observed |
| 36593680d7b40f8a000000000000009d | 123.608 | 3.681 | n/a | 0.000 | 0.000 | 2.401 | 117.326 | 0.051 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.065 | 3.681 | 0.030 | 0.065 | gw-r/thread-69/journal/page | none observed |
| 36593680d7b40f8a0000000000000097 | 39.296 | 5.764 | n/a | 0.000 | 0.000 | 0.965 | 32.376 | 0.010 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.138 | 5.764 | 0.147 | 0.138 | gw-r/thread-70/journal/page | none observed |

## P3 / sweep / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.282 | n/a | n/a | n/a | 3.171 | n/a | 0.000 | 0.000 | 1.250 | 4.491 | 0.020 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.091 | 3.171 | 0.339 | 0.091 |
| p99 | 1002.025 | n/a | n/a | n/a | 12.850 | n/a | 0.000 | 0.000 | 6.980 | 1001.018 | 0.896 | 0.000 | 0.138 | 0.000 | n/a | n/a | 1.599 | 12.850 | 0.489 | 1.599 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36593680d7b40f8a00000000000000a4 | 1002.025 | 0.116 | n/a | 0.000 | 0.000 | 0.679 | 1001.018 | 0.017 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.057 | 0.116 | 0.000 | 0.057 | gw-r/thread-55/journal/page | none observed |
| 36593680d7b40f8a000000000000009f | 26.470 | 2.227 | n/a | 0.000 | 0.000 | 0.669 | 22.476 | 0.896 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.083 | 2.227 | 0.084 | 0.083 | gw-r/thread-51/journal/page | none observed |
| 36593680d7b40f8a00000000000000a2 | 26.273 | 12.850 | n/a | 0.000 | 0.000 | 3.263 | 9.907 | 0.012 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.224 | 12.850 | 0.489 | 0.224 | node-14/thread-2/replica.fetch-feed | none observed |
| 36593680d7b40f8a00000000000000a0 | 19.282 | 7.698 | n/a | 0.000 | 0.000 | 5.834 | 4.339 | 0.054 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.326 | 7.698 | 0.399 | 1.326 | node-14/thread-2/socket.wait-first-byte | none observed |
| 36593680d7b40f8a00000000000000a1 | 15.697 | 3.612 | n/a | 0.000 | 0.000 | 6.980 | 3.474 | 0.013 | 0.000 | 0.019 | 0.000 | n/a | n/a | 1.599 | 3.612 | 0.230 | 1.599 | node-14/thread-2/socket.wait-first-byte | none observed |
| 36593680d7b40f8a00000000000000a3 | 9.048 | 3.171 | n/a | 0.000 | 0.000 | 1.250 | 4.491 | 0.022 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.091 | 3.171 | 0.350 | 0.091 | gw-r/thread-54/gateway.admitted-work | none observed |
| 36593680d7b40f8a000000000000009e | 7.472 | 2.529 | n/a | 0.000 | 0.000 | 0.983 | 3.786 | 0.020 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.081 | 2.529 | 0.339 | 0.081 | gw-r/thread-51/journal/page | none observed |

## P3 / warmup / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.872 | n/a | n/a | n/a | 0.057 | n/a | 0.000 | 0.000 | 1.197 | 201.259 | 0.026 | 0.000 | 0.203 | 0.000 | n/a | n/a | 0.086 | 0.057 | 0.000 | 0.086 |
| p99 | 205.562 | n/a | n/a | n/a | 0.214 | n/a | 0.000 | 0.000 | 2.344 | 204.109 | 2.272 | 13.887 | 0.380 | 0.000 | n/a | n/a | 0.655 | 0.214 | 0.001 | 0.655 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69c2c70021304b09000000000000000d | 205.562 | 0.057 | n/a | 0.000 | 0.000 | 0.985 | 204.109 | 0.057 | 0.000 | 0.234 | 0.000 | n/a | n/a | 0.119 | 0.057 | 0.000 | 0.119 | gw-r/thread-53/journal/page | none observed |
| 69c2c70021304b09000000000000000b | 204.663 | 0.054 | n/a | 0.000 | 0.000 | 2.344 | 201.785 | 0.080 | 0.000 | 0.317 | 0.000 | n/a | n/a | 0.082 | 0.054 | 0.000 | 0.082 | gw-r/thread-70/journal/page | none observed |
| 69c2c70021304b090000000000000012 | 203.755 | 0.043 | n/a | 0.000 | 0.000 | 1.691 | 201.540 | 0.025 | 0.000 | 0.380 | 0.000 | n/a | n/a | 0.076 | 0.043 | 0.000 | 0.076 | gw-r/thread-50/journal/page | none observed |
| 69c2c70021304b09000000000000000a | 203.620 | 0.073 | n/a | 0.000 | 0.000 | 1.367 | 187.711 | 0.026 | 13.887 | 0.320 | 0.000 | n/a | n/a | 0.237 | 0.073 | 0.000 | 0.237 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b090000000000000013 | 202.872 | 0.094 | n/a | 0.000 | 0.000 | 1.139 | 201.256 | 0.022 | 0.000 | 0.203 | 0.000 | n/a | n/a | 0.157 | 0.094 | 0.000 | 0.157 | gw-r/thread-48/journal/page | none observed |
| 69c2c70021304b09000000000000000c | 202.846 | 0.048 | n/a | 0.000 | 0.000 | 1.197 | 201.313 | 0.018 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.086 | 0.048 | 0.000 | 0.086 | gw-r/thread-69/journal/page | none observed |
| 69c2c70021304b09000000000000000f | 202.439 | 0.033 | n/a | 0.000 | 0.000 | 1.105 | 201.032 | 0.022 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.074 | 0.033 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b090000000000000011 | 202.417 | 0.062 | n/a | 0.000 | 0.000 | 0.844 | 201.259 | 0.028 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.074 | 0.062 | 0.000 | 0.074 | gw-r/thread-69/journal/page | none observed |
| 69c2c70021304b090000000000000009 | 158.085 | 0.214 | n/a | 0.000 | 0.000 | 1.967 | 152.830 | 2.272 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.655 | 0.214 | 0.001 | 0.655 | gw-r/thread-50/journal/page | none observed |

## P3 / baseline / read (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 102.150 | n/a | n/a | n/a | 0.038 | n/a | 0.000 | 0.000 | 0.835 | 100.420 | 0.036 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.079 | 0.038 | 0.000 | 0.079 |
| p99 | 203.193 | n/a | n/a | n/a | 0.076 | n/a | 0.000 | 0.000 | 0.908 | 201.825 | 0.547 | 0.000 | 0.379 | 0.000 | n/a | n/a | 0.116 | 0.076 | 0.001 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69c2c70021304b090000000000000015 | 203.193 | 0.038 | n/a | 0.000 | 0.000 | 0.835 | 201.825 | 0.036 | 0.000 | 0.379 | 0.000 | n/a | n/a | 0.079 | 0.038 | 0.000 | 0.079 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b090000000000000016 | 102.150 | 0.076 | n/a | 0.000 | 0.000 | 0.908 | 100.420 | 0.547 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.116 | 0.076 | 0.001 | 0.116 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.952 | n/a | n/a | n/a | 0.056 | n/a | 0.000 | 0.000 | 1.082 | 201.389 | 0.028 | 0.000 | 0.204 | 0.000 | n/a | n/a | 0.094 | 0.056 | 0.000 | 0.094 |
| p99 | 203.590 | n/a | n/a | n/a | 0.068 | n/a | 0.000 | 0.000 | 1.636 | 201.643 | 0.069 | 0.000 | 0.301 | 0.000 | n/a | n/a | 0.173 | 0.068 | 0.000 | 0.173 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69c2c70021304b090000000000000020 | 203.590 | 0.068 | n/a | 0.000 | 0.000 | 1.636 | 201.440 | 0.069 | 0.000 | 0.204 | 0.000 | n/a | n/a | 0.173 | 0.068 | 0.000 | 0.173 | gw-r/thread-69/journal/page | none observed |
| 69c2c70021304b090000000000000023 | 203.014 | 0.056 | n/a | 0.000 | 0.000 | 1.082 | 201.389 | 0.026 | 0.000 | 0.301 | 0.000 | n/a | n/a | 0.160 | 0.056 | 0.000 | 0.160 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b090000000000000025 | 202.952 | 0.051 | n/a | 0.000 | 0.000 | 0.937 | 201.643 | 0.025 | 0.000 | 0.214 | 0.000 | n/a | n/a | 0.084 | 0.051 | 0.000 | 0.084 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b090000000000000024 | 202.592 | 0.057 | n/a | 0.000 | 0.000 | 1.082 | 201.154 | 0.028 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.094 | 0.057 | 0.000 | 0.094 | gw-r/thread-50/journal/page | none observed |
| 69c2c70021304b090000000000000026 | 172.495 | 0.052 | n/a | 0.000 | 0.000 | 1.101 | 171.122 | 0.030 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.070 | 0.052 | 0.000 | 0.070 | gw-r/thread-50/journal/page | none observed |

## P3 / L64 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.005 | n/a | n/a | n/a | 0.064 | n/a | 0.000 | 0.000 | 1.166 | 201.195 | 0.034 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.101 | 0.064 | 0.000 | 0.101 |
| p99 | 207.013 | n/a | n/a | n/a | 0.118 | n/a | 0.000 | 0.000 | 2.927 | 205.110 | 15.001 | 0.000 | 0.385 | 0.000 | n/a | n/a | 0.362 | 0.118 | 0.001 | 0.362 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69c2c70021304b090000000000000033 | 207.013 | 0.115 | n/a | 0.000 | 0.000 | 2.927 | 203.059 | 0.165 | 0.000 | 0.385 | 0.000 | n/a | n/a | 0.362 | 0.115 | 0.001 | 0.362 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b090000000000000027 | 206.753 | 0.067 | n/a | 0.000 | 0.000 | 2.086 | 204.145 | 0.053 | 0.000 | 0.271 | 0.000 | n/a | n/a | 0.130 | 0.067 | 0.000 | 0.130 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b090000000000000029 | 206.626 | 0.043 | n/a | 0.000 | 0.000 | 1.166 | 205.110 | 0.032 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.080 | 0.043 | 0.000 | 0.080 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b09000000000000002b | 204.506 | 0.065 | n/a | 0.000 | 0.000 | 1.671 | 187.583 | 15.001 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.129 | 0.065 | 0.000 | 0.129 | gw-r/thread-70/journal/page | none observed |
| 69c2c70021304b09000000000000002f | 203.020 | 0.042 | n/a | 0.000 | 0.000 | 1.493 | 201.205 | 0.028 | 0.000 | 0.170 | 0.000 | n/a | n/a | 0.082 | 0.042 | 0.000 | 0.082 | gw-r/thread-55/journal/page | none observed |
| 69c2c70021304b09000000000000002a | 203.005 | 0.042 | n/a | 0.000 | 0.000 | 1.128 | 201.518 | 0.024 | 0.000 | 0.213 | 0.000 | n/a | n/a | 0.080 | 0.042 | 0.000 | 0.080 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b09000000000000002e | 202.631 | 0.064 | n/a | 0.000 | 0.000 | 1.056 | 201.188 | 0.021 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.129 | 0.064 | 0.000 | 0.129 | gw-r/thread-69/journal/page | none observed |
| 69c2c70021304b09000000000000002d | 202.417 | 0.042 | n/a | 0.000 | 0.000 | 0.803 | 201.195 | 0.053 | 0.000 | 0.249 | 0.000 | n/a | n/a | 0.075 | 0.042 | 0.000 | 0.075 | gw-r/thread-55/journal/page | none observed |
| 69c2c70021304b090000000000000030 | 201.921 | 0.037 | n/a | 0.000 | 0.000 | 0.577 | 201.044 | 0.022 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.084 | 0.037 | 0.000 | 0.084 | gw-r/thread-50/journal/page | none observed |
| 69c2c70021304b090000000000000032 | 98.001 | 0.118 | n/a | 0.000 | 0.000 | 1.242 | 95.483 | 0.871 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.126 | 0.118 | 0.001 | 0.126 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b090000000000000028 | 68.861 | 0.099 | n/a | 0.000 | 0.000 | 0.801 | 67.746 | 0.034 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.101 | 0.099 | 0.001 | 0.101 | gw-r/thread-52/journal/page | none observed |

## P3 / L256 / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 204.031 | n/a | n/a | n/a | 0.068 | n/a | 0.000 | 0.000 | 1.071 | 201.427 | 0.049 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.128 | 0.068 | 0.000 | 0.128 |
| p99 | 239.435 | n/a | n/a | n/a | 0.126 | n/a | 0.000 | 0.000 | 3.421 | 207.109 | 55.595 | 0.000 | 0.577 | 0.000 | n/a | n/a | 0.333 | 0.126 | 0.001 | 0.333 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69c2c70021304b09000000000000003d | 239.435 | 0.126 | n/a | 0.000 | 0.000 | 1.071 | 182.365 | 55.595 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.189 | 0.126 | 0.001 | 0.189 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b090000000000000037 | 214.339 | 0.096 | n/a | 0.000 | 0.000 | 1.068 | 195.886 | 16.895 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.214 | 0.096 | 0.000 | 0.214 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b090000000000000034 | 211.094 | 0.078 | n/a | 0.000 | 0.000 | 3.421 | 206.724 | 0.140 | 0.000 | 0.577 | 0.000 | n/a | n/a | 0.154 | 0.078 | 0.000 | 0.154 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b09000000000000003b | 210.079 | 0.102 | n/a | 0.000 | 0.000 | 2.263 | 207.109 | 0.056 | 0.000 | 0.217 | 0.000 | n/a | n/a | 0.333 | 0.102 | 0.000 | 0.333 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b09000000000000003c | 204.031 | 0.068 | n/a | 0.000 | 0.000 | 2.177 | 201.427 | 0.032 | 0.000 | 0.199 | 0.000 | n/a | n/a | 0.128 | 0.068 | 0.000 | 0.128 | gw-r/thread-53/journal/page | none observed |
| 69c2c70021304b090000000000000035 | 203.847 | 0.044 | n/a | 0.000 | 0.000 | 1.755 | 201.707 | 0.039 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.116 | 0.044 | 0.000 | 0.116 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b090000000000000036 | 203.570 | 0.041 | n/a | 0.000 | 0.000 | 0.971 | 202.025 | 0.049 | 0.000 | 0.387 | 0.000 | n/a | n/a | 0.096 | 0.041 | 0.000 | 0.096 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b090000000000000039 | 202.114 | 0.039 | n/a | 0.000 | 0.000 | 0.674 | 201.137 | 0.018 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.081 | 0.039 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.949 | n/a | n/a | n/a | 0.054 | n/a | 0.000 | 0.000 | 1.162 | 201.328 | 0.030 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.099 | 0.054 | 0.000 | 0.099 |
| p99 | 204.063 | n/a | n/a | n/a | 0.069 | n/a | 0.000 | 0.000 | 1.720 | 202.204 | 0.085 | 0.000 | 0.287 | 0.000 | n/a | n/a | 0.282 | 0.069 | 0.000 | 0.282 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69c2c70021304b090000000000000045 | 204.063 | 0.059 | n/a | 0.000 | 0.000 | 1.445 | 202.204 | 0.025 | 0.000 | 0.229 | 0.000 | n/a | n/a | 0.100 | 0.059 | 0.000 | 0.100 | gw-r/thread-50/journal/page | none observed |
| 69c2c70021304b09000000000000003e | 203.452 | 0.041 | n/a | 0.000 | 0.000 | 1.256 | 201.754 | 0.032 | 0.000 | 0.268 | 0.000 | n/a | n/a | 0.101 | 0.041 | 0.000 | 0.101 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b090000000000000041 | 203.385 | 0.045 | n/a | 0.000 | 0.000 | 1.720 | 201.349 | 0.030 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.085 | 0.045 | 0.000 | 0.085 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b090000000000000040 | 203.060 | 0.059 | n/a | 0.000 | 0.000 | 0.958 | 201.500 | 0.055 | 0.000 | 0.205 | 0.000 | n/a | n/a | 0.282 | 0.059 | 0.000 | 0.282 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b09000000000000003f | 202.949 | 0.069 | n/a | 0.000 | 0.000 | 1.198 | 201.328 | 0.031 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.126 | 0.069 | 0.000 | 0.126 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b090000000000000046 | 202.375 | 0.054 | n/a | 0.000 | 0.000 | 0.962 | 201.085 | 0.021 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.099 | 0.054 | 0.000 | 0.099 | gw-r/thread-55/journal/page | none observed |
| 69c2c70021304b090000000000000043 | 202.308 | 0.045 | n/a | 0.000 | 0.000 | 0.918 | 201.067 | 0.028 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.097 | 0.045 | 0.000 | 0.097 | gw-r/thread-50/journal/page | none observed |
| 69c2c70021304b090000000000000044 | 202.213 | 0.045 | n/a | 0.000 | 0.000 | 0.841 | 201.066 | 0.018 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.095 | 0.045 | 0.000 | 0.095 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b090000000000000047 | 126.817 | 0.060 | n/a | 0.000 | 0.000 | 1.162 | 125.134 | 0.085 | 0.000 | 0.287 | 0.000 | n/a | n/a | 0.089 | 0.060 | 0.000 | 0.089 | gw-r/thread-54/journal/page | none observed |

## P3 / recovery / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.696 | n/a | n/a | n/a | 0.057 | n/a | 0.000 | 0.000 | 1.323 | 201.045 | 0.025 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.102 | 0.057 | 0.000 | 0.102 |
| p99 | 206.448 | n/a | n/a | n/a | 0.086 | n/a | 0.000 | 0.000 | 4.555 | 202.857 | 2.858 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.145 | 0.086 | 0.001 | 0.145 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69c2c70021304b090000000000000049 | 206.448 | 0.057 | n/a | 0.000 | 0.000 | 4.555 | 201.503 | 0.025 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.127 | 0.057 | 0.000 | 0.127 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b09000000000000004a | 204.708 | 0.076 | n/a | 0.000 | 0.000 | 1.428 | 202.857 | 0.017 | 0.000 | 0.186 | 0.000 | n/a | n/a | 0.145 | 0.076 | 0.000 | 0.145 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b090000000000000050 | 203.405 | 0.076 | n/a | 0.000 | 0.000 | 1.945 | 201.117 | 0.025 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.095 | 0.076 | 0.000 | 0.095 | gw-r/thread-53/journal/page | none observed |
| 69c2c70021304b09000000000000004d | 203.210 | 0.046 | n/a | 0.000 | 0.000 | 1.823 | 201.045 | 0.015 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.090 | 0.046 | 0.000 | 0.090 | gw-r/thread-69/journal/page | none observed |
| 69c2c70021304b090000000000000048 | 202.759 | 0.040 | n/a | 0.000 | 0.000 | 1.323 | 201.114 | 0.020 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.102 | 0.040 | 0.000 | 0.102 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b09000000000000004f | 202.696 | 0.054 | n/a | 0.000 | 0.000 | 1.046 | 201.309 | 0.021 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.107 | 0.054 | 0.000 | 0.107 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b090000000000000052 | 202.091 | 0.040 | n/a | 0.000 | 0.000 | 0.845 | 200.959 | 0.027 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.078 | 0.040 | 0.000 | 0.078 | gw-r/thread-53/journal/page | none observed |
| 69c2c70021304b09000000000000004b | 173.130 | 0.086 | n/a | 0.000 | 0.000 | 0.863 | 171.949 | 0.019 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.115 | 0.086 | 0.000 | 0.115 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b090000000000000051 | 171.644 | 0.069 | n/a | 0.000 | 0.000 | 1.236 | 170.066 | 0.094 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.115 | 0.069 | 0.000 | 0.115 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b09000000000000004c | 144.277 | 0.062 | n/a | 0.000 | 0.000 | 0.748 | 142.952 | 0.234 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.094 | 0.062 | 0.000 | 0.094 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b09000000000000004e | 81.224 | 0.056 | n/a | 0.000 | 0.000 | 1.413 | 76.649 | 2.858 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.091 | 0.056 | 0.001 | 0.091 | gw-r/thread-52/journal/page | none observed |

## P3 / p4mix / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.177 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.877 | 200.969 | 0.016 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.084 | 0.047 | 0.000 | 0.084 |
| p99 | 202.914 | n/a | n/a | n/a | 0.130 | n/a | 0.000 | 0.000 | 1.421 | 201.308 | 3.422 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.249 | 0.130 | 0.002 | 0.249 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69c2c70021304b09000000000000005a | 202.914 | 0.049 | n/a | 0.000 | 0.000 | 1.238 | 201.284 | 0.029 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.159 | 0.049 | 0.000 | 0.159 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b090000000000000058 | 202.624 | 0.039 | n/a | 0.000 | 0.000 | 1.060 | 201.285 | 0.018 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.076 | 0.039 | 0.000 | 0.076 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b090000000000000055 | 202.543 | 0.050 | n/a | 0.000 | 0.000 | 0.877 | 201.308 | 0.019 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.125 | 0.050 | 0.000 | 0.125 | gw-r/thread-70/journal/page | none observed |
| 69c2c70021304b090000000000000054 | 202.290 | 0.039 | n/a | 0.000 | 0.000 | 0.844 | 201.155 | 0.016 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.077 | 0.039 | 0.000 | 0.077 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b090000000000000053 | 202.224 | 0.044 | n/a | 0.000 | 0.000 | 0.993 | 200.969 | 0.014 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.075 | 0.044 | 0.000 | 0.075 | gw-r/thread-70/journal/page | none observed |
| 69c2c70021304b090000000000000059 | 202.177 | 0.047 | n/a | 0.000 | 0.000 | 1.041 | 200.852 | 0.014 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.082 | 0.047 | 0.000 | 0.082 | gw-r/thread-70/journal/page | none observed |
| 69c2c70021304b090000000000000057 | 202.162 | 0.049 | n/a | 0.000 | 0.000 | 0.868 | 200.989 | 0.019 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.117 | 0.049 | 0.000 | 0.117 | gw-r/thread-70/journal/page | none observed |
| 69c2c70021304b09000000000000005d | 201.687 | 0.033 | n/a | 0.000 | 0.000 | 0.790 | 200.670 | 0.013 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.084 | 0.033 | 0.000 | 0.084 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b09000000000000005b | 103.468 | 0.053 | n/a | 0.000 | 0.000 | 0.778 | 99.008 | 3.422 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.100 | 0.053 | 0.001 | 0.100 | gw-r/thread-70/journal/page | none observed |
| 69c2c70021304b090000000000000056 | 74.160 | 0.130 | n/a | 0.000 | 0.000 | 1.421 | 72.271 | 0.011 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.249 | 0.130 | 0.002 | 0.249 | gw-r/thread-51/journal/page | none observed |

## P3 / p4h1 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.237 | n/a | n/a | n/a | 0.058 | n/a | 0.000 | 0.000 | 1.031 | 200.949 | 0.029 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.100 | 0.058 | 0.000 | 0.100 |
| p99 | 229.348 | n/a | n/a | n/a | 0.464 | n/a | 0.000 | 0.000 | 3.137 | 206.505 | 32.933 | 0.000 | 0.632 | 0.000 | n/a | n/a | 0.433 | 0.464 | 0.002 | 0.433 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69c2c70021304b09000000000000006f | 229.348 | 0.188 | n/a | 0.000 | 0.000 | 2.413 | 193.063 | 32.933 | 0.000 | 0.317 | 0.000 | n/a | n/a | 0.433 | 0.188 | 0.001 | 0.433 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b09000000000000006e | 209.216 | 0.071 | n/a | 0.000 | 0.000 | 1.740 | 206.505 | 0.106 | 0.000 | 0.632 | 0.000 | n/a | n/a | 0.161 | 0.071 | 0.000 | 0.161 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b090000000000000070 | 206.628 | 0.464 | n/a | 0.000 | 0.000 | 3.137 | 202.560 | 0.031 | 0.000 | 0.298 | 0.000 | n/a | n/a | 0.138 | 0.464 | 0.002 | 0.138 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b090000000000000074 | 203.193 | 0.093 | n/a | 0.000 | 0.000 | 1.090 | 201.616 | 0.034 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.189 | 0.093 | 0.000 | 0.189 | gw-r/thread-55/journal/page | none observed |
| 69c2c70021304b09000000000000006c | 202.737 | 0.058 | n/a | 0.000 | 0.000 | 0.884 | 201.449 | 0.042 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.132 | 0.058 | 0.000 | 0.132 | gw-r/thread-50/journal/page | none observed |
| 69c2c70021304b090000000000000072 | 202.364 | 0.044 | n/a | 0.000 | 0.000 | 1.104 | 200.954 | 0.019 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.093 | 0.044 | 0.000 | 0.093 | gw-r/thread-55/journal/page | none observed |
| 69c2c70021304b090000000000000073 | 202.237 | 0.046 | n/a | 0.000 | 0.000 | 0.820 | 201.090 | 0.029 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.100 | 0.046 | 0.000 | 0.100 | gw-r/thread-70/journal/page | none observed |
| 69c2c70021304b090000000000000068 | 201.997 | 0.042 | n/a | 0.000 | 0.000 | 0.805 | 200.936 | 0.016 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.079 | 0.042 | 0.000 | 0.079 | gw-r/thread-53/journal/page | none observed |
| 69c2c70021304b090000000000000069 | 201.945 | 0.038 | n/a | 0.000 | 0.000 | 0.740 | 200.949 | 0.013 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.075 | 0.038 | 0.000 | 0.075 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b09000000000000006a | 201.826 | 0.039 | n/a | 0.000 | 0.000 | 0.713 | 200.871 | 0.014 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.076 | 0.039 | 0.000 | 0.076 | gw-r/thread-53/journal/page | none observed |
| 69c2c70021304b09000000000000006b | 119.050 | 0.072 | n/a | 0.000 | 0.000 | 1.031 | 117.780 | 0.012 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.093 | 0.072 | 0.001 | 0.093 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b09000000000000006d | 86.445 | 0.075 | n/a | 0.000 | 0.000 | 2.235 | 65.267 | 18.346 | 0.000 | 0.414 | 0.000 | n/a | n/a | 0.108 | 0.075 | 0.001 | 0.108 | gw-r/thread-53/journal/page | none observed |

## P3 / grow3 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.235 | n/a | n/a | n/a | 0.067 | n/a | 0.000 | 0.000 | 1.431 | 163.034 | 0.038 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.120 | 0.067 | 0.000 | 0.120 |
| p99 | 372.272 | n/a | n/a | n/a | 1.368 | n/a | 0.000 | 0.000 | 5.161 | 201.897 | 210.461 | 0.000 | 0.322 | 0.000 | n/a | n/a | 0.416 | 1.368 | 0.005 | 0.416 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69c2c70021304b09000000000000007d | 372.272 | 1.368 | n/a | 0.000 | 0.000 | 0.902 | 158.970 | 210.461 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.416 | 1.368 | 0.004 | 0.416 | gw-r/thread-50/gateway.admission-wait | none observed |
| 69c2c70021304b09000000000000007a | 203.639 | 0.086 | n/a | 0.000 | 0.000 | 1.683 | 201.451 | 0.029 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.197 | 0.086 | 0.000 | 0.197 | gw-r/thread-53/journal/page | none observed |
| 69c2c70021304b09000000000000007c | 203.440 | 0.054 | n/a | 0.000 | 0.000 | 1.259 | 201.729 | 0.046 | 0.000 | 0.218 | 0.000 | n/a | n/a | 0.134 | 0.054 | 0.000 | 0.134 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b090000000000000077 | 203.426 | 0.040 | n/a | 0.000 | 0.000 | 1.106 | 201.897 | 0.038 | 0.000 | 0.255 | 0.000 | n/a | n/a | 0.089 | 0.040 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 69c2c70021304b090000000000000078 | 203.390 | 0.067 | n/a | 0.000 | 0.000 | 1.527 | 201.304 | 0.045 | 0.000 | 0.322 | 0.000 | n/a | n/a | 0.125 | 0.067 | 0.000 | 0.125 | gw-r/thread-53/journal/page | none observed |
| 69c2c70021304b09000000000000007b | 203.292 | 0.078 | n/a | 0.000 | 0.000 | 1.417 | 201.372 | 0.025 | 0.000 | 0.231 | 0.000 | n/a | n/a | 0.168 | 0.078 | 0.000 | 0.168 | gw-r/thread-50/journal/page | none observed |
| 69c2c70021304b090000000000000082 | 203.235 | 0.044 | n/a | 0.000 | 0.000 | 1.097 | 201.690 | 0.140 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.093 | 0.044 | 0.000 | 0.093 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b09000000000000007f | 164.723 | 0.053 | n/a | 0.000 | 0.000 | 1.431 | 163.034 | 0.015 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.084 | 0.053 | 0.000 | 0.084 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b090000000000000083 | 161.140 | 0.788 | n/a | 0.000 | 0.000 | 1.621 | 138.995 | 19.475 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.101 | 0.788 | 0.005 | 0.101 | gw-r/thread-53/journal/page | none observed |
| 69c2c70021304b090000000000000075 | 146.992 | 0.106 | n/a | 0.000 | 0.000 | 1.554 | 145.128 | 0.012 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.120 | 0.106 | 0.001 | 0.120 | gw-r/thread-70/journal/page | none observed |
| 69c2c70021304b090000000000000080 | 144.566 | 0.126 | n/a | 0.000 | 0.000 | 1.565 | 142.399 | 0.029 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.306 | 0.126 | 0.001 | 0.306 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b090000000000000081 | 103.075 | 0.067 | n/a | 0.000 | 0.000 | 1.011 | 101.787 | 0.014 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.095 | 0.067 | 0.001 | 0.095 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b090000000000000076 | 91.879 | 0.058 | n/a | 0.000 | 0.000 | 5.161 | 83.165 | 3.302 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.094 | 0.058 | 0.001 | 0.094 | gw-r/thread-52/journal/page | none observed |

## P3 / p4h3 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.293 | n/a | n/a | n/a | 0.048 | n/a | 0.000 | 0.000 | 1.046 | 201.197 | 0.028 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.099 | 0.048 | 0.000 | 0.099 |
| p99 | 205.059 | n/a | n/a | n/a | 0.121 | n/a | 0.000 | 0.000 | 2.760 | 201.956 | 3.364 | 0.000 | 0.223 | 0.000 | n/a | n/a | 0.156 | 0.121 | 0.001 | 0.156 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69c2c70021304b090000000000000093 | 205.059 | 0.044 | n/a | 0.000 | 0.000 | 2.760 | 201.956 | 0.024 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.143 | 0.044 | 0.000 | 0.143 | gw-r/thread-55/journal/page | none observed |
| 69c2c70021304b09000000000000009c | 203.064 | 0.051 | n/a | 0.000 | 0.000 | 1.057 | 201.613 | 0.056 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.087 | 0.051 | 0.000 | 0.087 | gw-r/thread-48/journal/page | none observed |
| 69c2c70021304b090000000000000091 | 202.954 | 0.047 | n/a | 0.000 | 0.000 | 1.401 | 201.197 | 0.042 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.101 | 0.047 | 0.000 | 0.101 | gw-r/thread-55/journal/page | none observed |
| 69c2c70021304b090000000000000095 | 202.837 | 0.064 | n/a | 0.000 | 0.000 | 1.056 | 201.367 | 0.040 | 0.000 | 0.223 | 0.000 | n/a | n/a | 0.086 | 0.064 | 0.000 | 0.086 | gw-r/thread-55/journal/page | none observed |
| 69c2c70021304b090000000000000098 | 202.649 | 0.037 | n/a | 0.000 | 0.000 | 0.919 | 201.373 | 0.028 | 0.000 | 0.193 | 0.000 | n/a | n/a | 0.099 | 0.037 | 0.000 | 0.099 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b090000000000000094 | 202.607 | 0.052 | n/a | 0.000 | 0.000 | 0.910 | 201.328 | 0.028 | 0.000 | 0.198 | 0.000 | n/a | n/a | 0.092 | 0.052 | 0.000 | 0.092 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b090000000000000096 | 202.293 | 0.087 | n/a | 0.000 | 0.000 | 1.046 | 200.901 | 0.017 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.121 | 0.087 | 0.000 | 0.121 | gw-r/thread-53/journal/page | none observed |
| 69c2c70021304b09000000000000009a | 202.184 | 0.036 | n/a | 0.000 | 0.000 | 0.592 | 201.241 | 0.031 | 0.000 | 0.212 | 0.000 | n/a | n/a | 0.073 | 0.036 | 0.000 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 69c2c70021304b09000000000000009e | 202.097 | 0.048 | n/a | 0.000 | 0.000 | 0.847 | 200.934 | 0.019 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.118 | 0.048 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 69c2c70021304b09000000000000009b | 202.036 | 0.043 | n/a | 0.000 | 0.000 | 0.608 | 201.152 | 0.018 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.076 | 0.043 | 0.000 | 0.076 | gw-r/thread-53/journal/page | none observed |
| 69c2c70021304b090000000000000097 | 100.889 | 0.121 | n/a | 0.000 | 0.000 | 1.442 | 95.738 | 3.364 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.156 | 0.121 | 0.001 | 0.156 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b090000000000000092 | 92.154 | 0.097 | n/a | 0.000 | 0.000 | 1.245 | 90.604 | 0.015 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.133 | 0.097 | 0.001 | 0.133 | gw-r/thread-54/journal/page | none observed |

## P3 / grow10 / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 127.818 | n/a | n/a | n/a | 0.133 | n/a | 0.000 | 0.000 | 0.911 | 126.580 | 0.026 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.105 | 0.133 | 0.002 | 0.105 |
| p99 | 329.065 | n/a | n/a | n/a | 0.840 | n/a | 0.000 | 0.000 | 1.788 | 201.387 | 190.605 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.206 | 0.840 | 0.010 | 0.206 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69c2c70021304b09000000000000009f | 329.065 | 0.599 | n/a | 0.000 | 0.000 | 1.023 | 136.668 | 190.605 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.091 | 0.599 | 0.002 | 0.091 | gw-r/thread-50/gateway.admission-wait | none observed |
| 69c2c70021304b0900000000000000a5 | 202.584 | 0.044 | n/a | 0.000 | 0.000 | 0.863 | 201.387 | 0.026 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.105 | 0.044 | 0.000 | 0.105 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b0900000000000000a8 | 202.122 | 0.032 | n/a | 0.000 | 0.000 | 0.673 | 201.149 | 0.036 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.076 | 0.032 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b0900000000000000aa | 145.477 | 0.487 | n/a | 0.000 | 0.000 | 1.788 | 128.838 | 14.140 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.094 | 0.487 | 0.003 | 0.094 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b0900000000000000a4 | 127.818 | 0.076 | n/a | 0.000 | 0.000 | 0.911 | 126.580 | 0.022 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.131 | 0.076 | 0.001 | 0.131 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b0900000000000000ab | 82.773 | 0.840 | n/a | 0.000 | 0.000 | 1.199 | 80.402 | 0.015 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.206 | 0.840 | 0.010 | 0.206 | gw-r/thread-70/journal/page | none observed |
| 69c2c70021304b0900000000000000a2 | 69.957 | 0.449 | n/a | 0.000 | 0.000 | 0.887 | 68.396 | 0.016 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.111 | 0.449 | 0.006 | 0.111 | gw-r/thread-55/journal/page | none observed |
| 69c2c70021304b0900000000000000a6 | 54.129 | 0.133 | n/a | 0.000 | 0.000 | 1.222 | 50.585 | 2.025 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.106 | 0.133 | 0.002 | 0.106 | gw-r/thread-50/journal/page | none observed |

## P3 / p4h10 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.957 | n/a | n/a | n/a | 0.053 | n/a | 0.000 | 0.000 | 0.835 | 200.899 | 0.022 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.085 | 0.053 | 0.000 | 0.085 |
| p99 | 206.546 | n/a | n/a | n/a | 0.087 | n/a | 0.000 | 0.000 | 4.611 | 201.593 | 4.870 | 0.000 | 0.195 | 0.000 | n/a | n/a | 0.128 | 0.087 | 0.001 | 0.128 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69c2c70021304b0900000000000000c4 | 206.546 | 0.037 | n/a | 0.000 | 0.000 | 4.611 | 201.593 | 0.026 | 0.000 | 0.195 | 0.000 | n/a | n/a | 0.085 | 0.037 | 0.000 | 0.085 | gw-r/thread-48/journal/page | none observed |
| 69c2c70021304b0900000000000000be | 203.326 | 0.066 | n/a | 0.000 | 0.000 | 1.450 | 201.505 | 0.018 | 0.000 | 0.189 | 0.000 | n/a | n/a | 0.098 | 0.066 | 0.000 | 0.098 | gw-r/thread-69/journal/page | none observed |
| 69c2c70021304b0900000000000000c8 | 202.411 | 0.041 | n/a | 0.000 | 0.000 | 0.780 | 201.299 | 0.033 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.104 | 0.041 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 69c2c70021304b0900000000000000c6 | 202.159 | 0.055 | n/a | 0.000 | 0.000 | 0.827 | 201.038 | 0.021 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.082 | 0.055 | 0.000 | 0.082 | gw-r/thread-48/journal/page | none observed |
| 69c2c70021304b0900000000000000bf | 202.027 | 0.042 | n/a | 0.000 | 0.000 | 0.835 | 200.925 | 0.023 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.076 | 0.042 | 0.000 | 0.076 | gw-r/thread-50/journal/page | none observed |
| 69c2c70021304b0900000000000000bb | 202.003 | 0.042 | n/a | 0.000 | 0.000 | 0.795 | 200.933 | 0.022 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.098 | 0.042 | 0.000 | 0.098 | gw-r/thread-51/journal/page | none observed |
| 69c2c70021304b0900000000000000c5 | 201.957 | 0.051 | n/a | 0.000 | 0.000 | 0.802 | 200.899 | 0.015 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.076 | 0.051 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b0900000000000000ba | 201.952 | 0.050 | n/a | 0.000 | 0.000 | 0.894 | 200.795 | 0.017 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.082 | 0.050 | 0.000 | 0.082 | gw-r/thread-70/journal/page | none observed |
| 69c2c70021304b0900000000000000bd | 201.723 | 0.053 | n/a | 0.000 | 0.000 | 0.649 | 200.773 | 0.020 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.095 | 0.053 | 0.000 | 0.095 | gw-r/thread-50/journal/page | none observed |
| 69c2c70021304b0900000000000000c1 | 200.840 | 0.078 | n/a | 0.000 | 0.000 | 1.039 | 194.615 | 4.870 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.110 | 0.078 | 0.000 | 0.110 | gw-r/thread-50/journal/page | none observed |
| 69c2c70021304b0900000000000000c7 | 193.673 | 0.055 | n/a | 0.000 | 0.000 | 1.027 | 189.846 | 2.549 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.084 | 0.055 | 0.000 | 0.084 | gw-r/thread-52/journal/page | none observed |
| 69c2c70021304b0900000000000000c0 | 107.679 | 0.076 | n/a | 0.000 | 0.000 | 0.797 | 103.316 | 3.375 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.077 | 0.076 | 0.001 | 0.077 | gw-r/thread-69/journal/page | none observed |
| 69c2c70021304b0900000000000000c3 | 87.347 | 0.087 | n/a | 0.000 | 0.000 | 1.433 | 85.586 | 0.014 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.128 | 0.087 | 0.001 | 0.128 | gw-r/thread-48/journal/page | none observed |

## P3 / presweep / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.020 | n/a | n/a | n/a | 0.057 | n/a | 0.000 | 0.000 | 1.114 | 200.964 | 0.022 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.092 | 0.057 | 0.000 | 0.092 |
| p99 | 204.350 | n/a | n/a | n/a | 0.103 | n/a | 0.000 | 0.000 | 3.989 | 201.809 | 4.670 | 0.000 | 0.506 | 0.000 | n/a | n/a | 0.212 | 0.103 | 0.001 | 0.212 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69c2c70021304b0900000000000000d0 | 204.350 | 0.036 | n/a | 0.000 | 0.000 | 2.249 | 201.809 | 0.022 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.092 | 0.036 | 0.000 | 0.092 | gw-r/thread-55/journal/page | none observed |
| 69c2c70021304b0900000000000000cb | 204.198 | 0.069 | n/a | 0.000 | 0.000 | 2.019 | 201.690 | 0.026 | 0.000 | 0.233 | 0.000 | n/a | n/a | 0.162 | 0.069 | 0.000 | 0.162 | gw-r/thread-50/journal/page | none observed |
| 69c2c70021304b0900000000000000cd | 203.231 | 0.055 | n/a | 0.000 | 0.000 | 1.889 | 201.012 | 0.015 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.140 | 0.055 | 0.000 | 0.140 | gw-r/thread-50/journal/page | none observed |
| 69c2c70021304b0900000000000000c9 | 202.939 | 0.061 | n/a | 0.000 | 0.000 | 0.965 | 201.600 | 0.027 | 0.000 | 0.201 | 0.000 | n/a | n/a | 0.085 | 0.061 | 0.000 | 0.085 | gw-r/thread-50/journal/page | none observed |
| 69c2c70021304b0900000000000000ca | 202.909 | 0.056 | n/a | 0.000 | 0.000 | 1.238 | 201.380 | 0.019 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.083 | 0.056 | 0.000 | 0.083 | gw-r/thread-70/journal/page | none observed |
| 69c2c70021304b0900000000000000d1 | 202.020 | 0.042 | n/a | 0.000 | 0.000 | 0.799 | 200.964 | 0.015 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.087 | 0.042 | 0.000 | 0.087 | gw-r/thread-54/journal/page | none observed |
| 69c2c70021304b0900000000000000d3 | 186.252 | 0.087 | n/a | 0.000 | 0.000 | 0.975 | 184.845 | 0.033 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.212 | 0.087 | 0.000 | 0.212 | gw-r/thread-69/journal/page | none observed |
| 69c2c70021304b0900000000000000d4 | 126.339 | 0.057 | n/a | 0.000 | 0.000 | 3.989 | 117.995 | 3.684 | 0.000 | 0.506 | 0.000 | n/a | n/a | 0.108 | 0.057 | 0.000 | 0.108 | gw-r/thread-53/journal/page | none observed |
| 69c2c70021304b0900000000000000cc | 108.636 | 0.103 | n/a | 0.000 | 0.000 | 1.114 | 107.148 | 0.020 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.202 | 0.103 | 0.001 | 0.202 | gw-r/thread-70/journal/page | none observed |
| 69c2c70021304b0900000000000000d2 | 76.190 | 0.074 | n/a | 0.000 | 0.000 | 0.664 | 70.648 | 4.670 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.071 | 0.074 | 0.001 | 0.071 | gw-r/thread-55/journal/page | none observed |

## P3 / sweep / read (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.988 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 1.325 | 201.334 | 0.034 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.085 | 0.037 | 0.000 | 0.085 |
| p99 | 202.988 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 1.325 | 201.334 | 0.034 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.085 | 0.037 | 0.000 | 0.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69c2c70021304b0900000000000000dc | 202.988 | 0.037 | n/a | 0.000 | 0.000 | 1.325 | 201.334 | 0.034 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.085 | 0.037 | 0.000 | 0.085 | gw-r/thread-70/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
