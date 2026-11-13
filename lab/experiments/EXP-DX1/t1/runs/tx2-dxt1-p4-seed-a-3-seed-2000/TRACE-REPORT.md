# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (26.602 ms, trace `c0ab384c91453869000000000000182f`); `gw-w/thread-64/peer.transact-await (includes order/network/storage)` (31.722 ms, trace `c0ab384c9145386900000000000003f8`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (54.992 ms, trace `c0ab384c9145386900000000000009d6`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (41.353 ms, trace `c0ab384c9145386900000000000009d5`); `node-14/thread-0/socket.wait-first-byte` (39.580 ms, trace `c0ab384c91453869000000000000171a`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-seed-a-3-seed-2000`; source `647da7a8545c6ff0acd545de48fde57601c3de71`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 6649117.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 211 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13597.658 | 485.996 | 26.480 | 308 |
| L1 | 0 | 19969.667 | 382.478 | 15.809 | 462 |
| L4 | 0 | 19981.306 | 390.243 | 27.101 | 426 |
| L16 | 0 | 19983.071 | 398.429 | 6.648 | 474 |
| L64 | 0 | 19974.801 | 438.626 | 12.755 | 610 |
| L256 | 0 | 19968.301 | 559.336 | 101.670 | 472 |
| L1024 | 0 | 19997.832 | 3750.159 | 174.794 | 12219 |
| tail | 0 | 64401.088 | 11108.996 | 632.922 | 37208 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| c0ab384c91453869000000000000182f | driver.queue.scheduler-late | 0.307 | none | 0 / 32 |
| c0ab384c91453869000000000000182f | driver.queue.scheduler-dispatch | 0.072 | none | 0 / 32 |

Observed active steps while trace c0ab384c91453869000000000000182f waited: []

| c0ab384c9145386900000000000003f8 | driver.queue.scheduler-dispatch | 0.068 | none | 2 / 32 |
| c0ab384c9145386900000000000003f8 | driver.queue.scheduler-late | 0.002 | none | 2 / 32 |

Observed active steps while trace c0ab384c9145386900000000000003f8 waited: []

| c0ab384c9145386900000000000009d6 | driver.queue.scheduler-late | 0.843 | none | 6 / 32 |
| c0ab384c9145386900000000000009d6 | driver.queue.scheduler-dispatch | 0.076 | none | 6 / 32 |

Observed active steps while trace c0ab384c9145386900000000000009d6 waited: []

| c0ab384c9145386900000000000009d5 | driver.queue.scheduler-late | 0.586 | none | 5 / 32 |
| c0ab384c9145386900000000000009d5 | driver.queue.scheduler-dispatch | 0.106 | none | 5 / 32 |

Observed active steps while trace c0ab384c9145386900000000000009d5 waited: []

| c0ab384c91453869000000000000171a | driver.queue.subject | 13.759 | c0ab384c914538690000000000001718 | 1 / 32 |
| c0ab384c91453869000000000000171a | driver.queue.scheduler-late | 12.506 | none | 1 / 32 |
| c0ab384c91453869000000000000171a | driver.queue.scheduler-dispatch | 0.065 | none | 1 / 32 |

Observed active steps while trace c0ab384c91453869000000000000171a waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.749 | 0.535 | 0.000 | 1.711 | 5.123 | 0.019 | 0.000 | 0.213 | 1.527 | 7.582 | 0.064 | n/a | 0.501 | 14.965 | n/a | n/a | 0.059 | 5.765 | 0.179 | 0.059 |
| p99 | 64.604 | 6.363 | 0.000 | 7.850 | 13.731 | 1.184 | 6.037 | 0.957 | 4.669 | 23.559 | 5.149 | n/a | 1.733 | 49.063 | n/a | n/a | 0.483 | 18.847 | 0.348 | 0.483 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c9145386900000000000000f0 | 64.604 | 13.731 | 0.873 | 0.000 | 0.146 | 2.411 | 23.559 | 0.175 | n/a | 0.730 | 22.889 | n/a | n/a | 0.090 | 14.750 | 0.228 | 0.090 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000000ed | 62.896 | 12.015 | 0.019 | 6.037 | 0.776 | 1.095 | 12.660 | 0.216 | n/a | 1.733 | 27.861 | n/a | n/a | 0.483 | 18.847 | 0.300 | 0.483 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000000fd | 62.846 | 5.476 | 0.006 | 2.324 | 0.957 | 1.114 | 3.045 | 0.067 | n/a | 0.724 | 49.063 | n/a | n/a | 0.070 | 8.764 | 0.139 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000100 | 54.493 | 5.487 | 0.237 | 0.000 | 0.128 | 1.456 | 21.892 | 5.149 | n/a | 0.310 | 19.758 | n/a | n/a | 0.076 | 5.852 | 0.107 | 0.076 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000010c | 45.887 | 4.842 | 0.336 | 0.000 | 0.087 | 2.608 | 15.367 | 0.104 | n/a | 0.274 | 22.218 | n/a | n/a | 0.052 | 5.265 | 0.115 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000000f4 | 43.475 | 6.709 | 0.408 | 0.000 | 0.080 | 1.846 | 15.634 | 0.080 | n/a | 1.042 | 17.604 | n/a | n/a | 0.071 | 7.198 | 0.166 | 0.071 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000000f8 | 42.654 | 5.862 | 0.298 | 0.000 | 0.073 | 2.678 | 18.633 | 0.058 | n/a | 0.243 | 14.742 | n/a | n/a | 0.068 | 6.233 | 0.146 | 0.068 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000010d | 39.942 | 5.123 | 0.007 | 0.000 | 0.711 | 4.100 | 1.584 | 0.027 | n/a | 0.084 | 28.238 | n/a | n/a | 0.067 | 5.841 | 0.146 | 0.067 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000108 | 39.421 | 6.649 | 0.286 | 0.000 | 0.109 | 1.563 | 10.413 | 0.082 | n/a | 0.608 | 19.644 | n/a | n/a | 0.067 | 7.045 | 0.179 | 0.067 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000000f6 | 35.897 | 5.330 | 0.005 | 0.000 | 0.608 | 0.938 | 5.204 | 0.064 | n/a | 0.280 | 23.370 | n/a | n/a | 0.098 | 5.943 | 0.166 | 0.098 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000102 | 34.489 | 4.214 | 0.192 | 0.000 | 0.248 | 2.434 | 12.082 | 0.068 | n/a | 0.561 | 14.644 | n/a | n/a | 0.048 | 4.654 | 0.135 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000112 | 33.402 | 4.785 | 0.282 | 0.300 | 0.064 | 4.669 | 9.588 | 0.207 | n/a | 0.501 | 12.956 | n/a | n/a | 0.050 | 5.431 | 0.163 | 0.050 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000113 | 32.539 | 6.467 | 0.006 | 1.659 | 0.918 | 0.982 | 3.356 | 0.062 | n/a | 0.696 | 18.348 | n/a | n/a | 0.043 | 9.051 | 0.278 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000011f | 32.038 | 4.998 | 0.226 | 0.000 | 0.090 | 1.496 | 7.362 | 0.056 | n/a | 0.464 | 17.301 | n/a | n/a | 0.046 | 5.314 | 0.166 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000011b | 31.749 | 5.050 | 0.188 | 0.464 | 0.063 | 1.527 | 9.916 | 0.054 | n/a | 0.252 | 14.195 | n/a | n/a | 0.040 | 5.765 | 0.182 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000117 | 31.632 | 4.285 | 0.262 | 0.000 | 0.069 | 2.873 | 7.898 | 0.412 | n/a | 0.822 | 14.965 | n/a | n/a | 0.046 | 4.616 | 0.146 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000103 | 31.102 | 7.281 | 0.010 | 1.552 | 0.454 | 1.468 | 7.582 | 0.063 | n/a | 0.205 | 12.432 | n/a | n/a | 0.055 | 9.296 | 0.299 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000000fc | 30.308 | 4.341 | 0.297 | 0.000 | 0.076 | 2.482 | 8.688 | 0.119 | n/a | 1.435 | 12.802 | n/a | n/a | 0.069 | 4.714 | 0.156 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000125 | 29.364 | 5.646 | 0.847 | 0.501 | 0.078 | 1.671 | 8.004 | 0.054 | n/a | 0.193 | 12.318 | n/a | n/a | 0.052 | 7.072 | 0.241 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000010f | 27.541 | 3.545 | 0.006 | 0.000 | 0.592 | 2.852 | 5.174 | 0.052 | n/a | 0.240 | 15.044 | n/a | n/a | 0.036 | 4.143 | 0.150 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.026 | 1.040 | 0.000 | 2.010 | 4.712 | 0.007 | 0.000 | 0.354 | 1.136 | 1.517 | 0.050 | n/a | 0.280 | 12.594 | n/a | n/a | 0.063 | 5.164 | 0.214 | 0.063 |
| p99 | 39.942 | 2.271 | 0.000 | 2.648 | 5.330 | 0.010 | 0.000 | 0.711 | 4.100 | 5.204 | 0.142 | n/a | 0.904 | 28.238 | n/a | n/a | 0.169 | 5.943 | 0.348 | 0.169 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c91453869000000000000010d | 39.942 | 5.123 | 0.007 | 0.000 | 0.711 | 4.100 | 1.584 | 0.027 | n/a | 0.084 | 28.238 | n/a | n/a | 0.067 | 5.841 | 0.146 | 0.067 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000000f6 | 35.897 | 5.330 | 0.005 | 0.000 | 0.608 | 0.938 | 5.204 | 0.064 | n/a | 0.280 | 23.370 | n/a | n/a | 0.098 | 5.943 | 0.166 | 0.098 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000010f | 27.541 | 3.545 | 0.006 | 0.000 | 0.592 | 2.852 | 5.174 | 0.052 | n/a | 0.240 | 15.044 | n/a | n/a | 0.036 | 4.143 | 0.150 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000011c | 22.681 | 4.493 | 0.007 | 0.000 | 0.354 | 1.007 | 1.337 | 0.050 | n/a | 0.254 | 15.120 | n/a | n/a | 0.059 | 4.854 | 0.214 | 0.059 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000120 | 20.026 | 3.992 | 0.006 | 0.000 | 0.311 | 1.317 | 1.517 | 0.046 | n/a | 0.904 | 11.890 | n/a | n/a | 0.043 | 4.309 | 0.215 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000000fa | 19.910 | 3.732 | 0.006 | 0.000 | 0.267 | 0.841 | 1.466 | 0.052 | n/a | 0.901 | 12.594 | n/a | n/a | 0.052 | 4.004 | 0.201 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000118 | 19.190 | 4.891 | 0.010 | 0.000 | 0.263 | 1.136 | 4.786 | 0.142 | n/a | 0.351 | 7.532 | n/a | n/a | 0.079 | 5.164 | 0.269 | 0.079 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000123 | 16.321 | 4.712 | 0.010 | 0.000 | 0.520 | 1.012 | 1.136 | 0.038 | n/a | 0.798 | 8.033 | n/a | n/a | 0.063 | 5.241 | 0.321 | 0.063 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000000f1 | 15.467 | 5.164 | 0.010 | 0.000 | 0.213 | 2.138 | 1.177 | 0.043 | n/a | 0.249 | 6.305 | n/a | n/a | 0.169 | 5.387 | 0.348 | 0.169 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.321 | 1.024 | 0.000 | 0.601 | 3.998 | 0.269 | 0.000 | 0.115 | 1.158 | 9.554 | 0.050 | n/a | 0.472 | 16.632 | n/a | n/a | 0.074 | 4.382 | 0.136 | 0.074 |
| p99 | 32.321 | 1.024 | 0.000 | 0.601 | 3.998 | 0.269 | 0.000 | 0.115 | 1.158 | 9.554 | 0.050 | n/a | 0.472 | 16.632 | n/a | n/a | 0.074 | 4.382 | 0.136 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c914538690000000000000127 | 32.321 | 3.998 | 0.269 | 0.000 | 0.115 | 1.158 | 9.554 | 0.050 | n/a | 0.472 | 16.632 | n/a | n/a | 0.074 | 4.382 | 0.136 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.229 | 0.574 | 0.000 | 0.654 | 4.037 | 0.021 | 0.217 | 0.128 | 1.323 | 5.177 | 0.057 | n/a | 0.406 | 11.955 | n/a | n/a | 0.048 | 4.802 | 0.181 | 0.048 |
| p99 | 66.920 | 4.512 | 0.578 | 7.438 | 8.573 | 0.421 | 4.548 | 3.910 | 16.728 | 16.916 | 1.636 | n/a | 3.747 | 45.340 | n/a | n/a | 0.110 | 12.161 | 0.465 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c914538690000000000000138 | 66.920 | 8.573 | 0.015 | 2.163 | 1.047 | 0.979 | 8.222 | 0.115 | n/a | 0.375 | 45.340 | n/a | n/a | 0.091 | 11.799 | 0.176 | 0.091 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000135 | 53.864 | 6.264 | 0.352 | 0.548 | 0.128 | 16.728 | 6.836 | 0.052 | n/a | 0.500 | 22.369 | n/a | n/a | 0.086 | 7.292 | 0.135 | 0.086 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000133 | 51.776 | 6.681 | 0.006 | 0.000 | 0.789 | 8.838 | 5.070 | 0.071 | n/a | 3.747 | 26.464 | n/a | n/a | 0.110 | 7.476 | 0.144 | 0.110 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000132 | 50.335 | 5.229 | 0.193 | 0.000 | 0.081 | 4.900 | 15.418 | 0.046 | n/a | 0.197 | 24.227 | n/a | n/a | 0.043 | 5.504 | 0.109 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000147 | 48.952 | 4.541 | 0.226 | 0.391 | 0.070 | 1.571 | 11.752 | 0.105 | n/a | 0.742 | 29.509 | n/a | n/a | 0.046 | 5.228 | 0.107 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000013b | 48.250 | 3.557 | 0.178 | 0.258 | 0.071 | 1.390 | 15.148 | 0.105 | n/a | 1.020 | 26.477 | n/a | n/a | 0.046 | 4.064 | 0.084 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000012b | 47.084 | 3.878 | 0.208 | 0.268 | 0.082 | 2.171 | 10.319 | 0.102 | n/a | 0.417 | 29.595 | n/a | n/a | 0.044 | 4.436 | 0.094 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000143 | 37.642 | 4.491 | 0.360 | 0.271 | 0.072 | 1.409 | 9.168 | 0.052 | n/a | 0.572 | 21.188 | n/a | n/a | 0.058 | 5.193 | 0.138 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000169 | 36.300 | 3.870 | 0.210 | 0.243 | 0.128 | 1.346 | 7.779 | 0.088 | n/a | 0.375 | 22.200 | n/a | n/a | 0.061 | 4.451 | 0.123 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000129 | 33.606 | 4.222 | 0.261 | 0.249 | 0.070 | 1.661 | 11.465 | 0.064 | n/a | 0.248 | 15.323 | n/a | n/a | 0.043 | 4.802 | 0.143 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000163 | 32.830 | 4.156 | 0.342 | 0.221 | 0.087 | 2.029 | 16.916 | 0.125 | n/a | 0.415 | 8.495 | n/a | n/a | 0.043 | 4.807 | 0.146 | 0.043 | gw-w/thread-40/gateway.admitted-work | none observed |
| c0ab384c914538690000000000000177 | 32.237 | 3.929 | 0.349 | 0.217 | 0.066 | 4.444 | 8.452 | 0.069 | n/a | 0.207 | 14.455 | n/a | n/a | 0.049 | 4.561 | 0.141 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000012f | 31.883 | 4.020 | 0.006 | 0.000 | 0.571 | 1.037 | 1.655 | 0.057 | n/a | 0.213 | 24.284 | n/a | n/a | 0.041 | 4.596 | 0.144 | 0.041 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000013d | 30.149 | 3.910 | 0.219 | 0.331 | 0.121 | 2.324 | 9.359 | 0.098 | n/a | 0.489 | 13.235 | n/a | n/a | 0.063 | 4.581 | 0.152 | 0.063 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000140 | 29.550 | 4.895 | 0.021 | 0.000 | 1.931 | 1.446 | 1.841 | 0.050 | n/a | 1.507 | 17.800 | n/a | n/a | 0.060 | 6.847 | 0.232 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000015f | 29.083 | 3.108 | 0.176 | 0.333 | 0.058 | 2.888 | 11.803 | 0.103 | n/a | 0.315 | 10.263 | n/a | n/a | 0.034 | 3.675 | 0.126 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000014d | 26.924 | 4.265 | 0.314 | 0.208 | 0.064 | 1.526 | 8.206 | 0.066 | n/a | 0.267 | 11.955 | n/a | n/a | 0.052 | 4.853 | 0.180 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000170 | 26.193 | 3.771 | 0.006 | 0.000 | 0.159 | 0.920 | 2.983 | 0.109 | n/a | 1.115 | 17.088 | n/a | n/a | 0.042 | 3.936 | 0.150 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000014b | 26.136 | 7.471 | 0.006 | 4.548 | 0.136 | 1.064 | 2.067 | 0.045 | n/a | 0.289 | 10.453 | n/a | n/a | 0.057 | 12.161 | 0.465 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000016d | 25.319 | 3.958 | 0.231 | 0.265 | 0.061 | 2.785 | 7.772 | 0.051 | n/a | 0.234 | 9.918 | n/a | n/a | 0.043 | 4.515 | 0.178 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.362 | 0.894 | 0.000 | 1.574 | 3.577 | 0.006 | 0.000 | 0.573 | 0.842 | 1.346 | 0.044 | n/a | 0.249 | 8.269 | n/a | n/a | 0.041 | 4.596 | 0.277 | 0.041 |
| p99 | 51.776 | 1.281 | 0.578 | 4.875 | 6.681 | 0.010 | 0.000 | 3.910 | 8.838 | 5.177 | 1.636 | n/a | 3.747 | 26.464 | n/a | n/a | 0.110 | 7.476 | 0.396 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c914538690000000000000133 | 51.776 | 6.681 | 0.006 | 0.000 | 0.789 | 8.838 | 5.070 | 0.071 | n/a | 3.747 | 26.464 | n/a | n/a | 0.110 | 7.476 | 0.144 | 0.110 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000012f | 31.883 | 4.020 | 0.006 | 0.000 | 0.571 | 1.037 | 1.655 | 0.057 | n/a | 0.213 | 24.284 | n/a | n/a | 0.041 | 4.596 | 0.144 | 0.041 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000144 | 21.924 | 3.465 | 0.006 | 0.000 | 0.245 | 0.626 | 5.177 | 0.044 | n/a | 1.308 | 11.017 | n/a | n/a | 0.036 | 3.716 | 0.169 | 0.036 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000174 | 18.822 | 3.073 | 0.004 | 0.000 | 3.910 | 0.871 | 2.180 | 0.081 | n/a | 0.406 | 8.269 | n/a | n/a | 0.028 | 6.987 | 0.371 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.420ms |
| c0ab384c91453869000000000000014e | 18.362 | 6.529 | 0.006 | 0.000 | 0.573 | 0.841 | 1.346 | 1.636 | n/a | 0.235 | 7.154 | n/a | n/a | 0.042 | 7.108 | 0.387 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000158 | 14.703 | 3.577 | 0.006 | 0.000 | 0.497 | 0.842 | 0.980 | 0.038 | n/a | 0.249 | 8.473 | n/a | n/a | 0.042 | 4.080 | 0.277 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000016a | 14.272 | 4.391 | 0.010 | 0.000 | 1.060 | 0.968 | 1.233 | 0.040 | n/a | 0.536 | 5.977 | n/a | n/a | 0.057 | 5.461 | 0.383 | 0.057 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000015d | 9.759 | 2.925 | 0.006 | 0.000 | 0.934 | 0.706 | 0.985 | 0.038 | n/a | 0.220 | 3.906 | n/a | n/a | 0.039 | 3.865 | 0.396 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.845 | 0.546 | 0.000 | 0.729 | 3.992 | 0.163 | 0.000 | 0.204 | 1.391 | 5.927 | 0.065 | n/a | 0.538 | 10.994 | n/a | n/a | 0.050 | 4.826 | 0.193 | 0.050 |
| p99 | 79.138 | 3.497 | 0.000 | 3.960 | 8.459 | 1.841 | 0.571 | 1.183 | 6.122 | 38.192 | 0.472 | n/a | 3.872 | 60.077 | n/a | n/a | 0.111 | 9.639 | 0.439 | 0.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c9145386900000000000001ac | 79.138 | 3.424 | 0.163 | 0.220 | 0.074 | 1.039 | 13.846 | 0.043 | n/a | 0.207 | 60.077 | n/a | n/a | 0.045 | 3.881 | 0.049 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000194 | 62.938 | 5.365 | 0.302 | 0.318 | 0.095 | 2.195 | 38.192 | 0.129 | n/a | 0.870 | 15.427 | n/a | n/a | 0.045 | 6.080 | 0.097 | 0.045 | gw-w/thread-45/gateway.admitted-work | none observed |
| c0ab384c9145386900000000000001b2 | 44.399 | 3.865 | 0.192 | 0.235 | 0.082 | 1.512 | 10.371 | 0.114 | n/a | 0.996 | 26.978 | n/a | n/a | 0.054 | 4.373 | 0.099 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000198 | 38.028 | 6.005 | 0.302 | 0.479 | 0.204 | 4.151 | 9.346 | 0.121 | n/a | 0.628 | 16.704 | n/a | n/a | 0.087 | 6.991 | 0.184 | 0.087 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001bc | 37.679 | 3.405 | 0.175 | 0.352 | 0.074 | 2.643 | 16.520 | 0.087 | n/a | 0.295 | 14.085 | n/a | n/a | 0.042 | 4.006 | 0.106 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000017d | 37.189 | 5.166 | 0.294 | 0.262 | 0.073 | 2.206 | 12.685 | 0.088 | n/a | 3.872 | 12.482 | n/a | n/a | 0.061 | 5.794 | 0.156 | 0.061 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000181 | 36.204 | 4.717 | 0.339 | 0.571 | 0.081 | 1.652 | 14.807 | 0.058 | n/a | 1.267 | 12.645 | n/a | n/a | 0.069 | 5.707 | 0.158 | 0.069 | gw-w/thread-43/gateway.admitted-work | none observed |
| c0ab384c914538690000000000000185 | 35.555 | 4.592 | 0.006 | 0.000 | 0.830 | 1.204 | 15.340 | 0.108 | n/a | 1.054 | 12.357 | n/a | n/a | 0.063 | 5.428 | 0.153 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000184 | 32.846 | 5.027 | 0.235 | 0.434 | 0.134 | 1.603 | 9.935 | 0.047 | n/a | 0.521 | 14.856 | n/a | n/a | 0.054 | 5.830 | 0.177 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001b3 | 31.197 | 8.459 | 0.008 | 0.000 | 1.172 | 1.070 | 3.175 | 0.050 | n/a | 0.761 | 16.433 | n/a | n/a | 0.068 | 9.639 | 0.309 | 0.068 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001b6 | 30.852 | 3.627 | 0.183 | 0.327 | 0.083 | 1.528 | 7.824 | 0.066 | n/a | 0.515 | 16.646 | n/a | n/a | 0.054 | 4.219 | 0.137 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001ad | 30.343 | 8.112 | 0.011 | 0.000 | 0.666 | 1.246 | 5.214 | 0.065 | n/a | 0.281 | 14.635 | n/a | n/a | 0.111 | 8.789 | 0.290 | 0.111 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001b0 | 30.251 | 3.514 | 0.196 | 0.238 | 0.071 | 1.490 | 14.899 | 0.149 | n/a | 0.913 | 8.733 | n/a | n/a | 0.048 | 4.019 | 0.133 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001c4 | 29.225 | 3.733 | 1.841 | 0.235 | 0.068 | 6.122 | 4.844 | 0.065 | n/a | 0.169 | 12.108 | n/a | n/a | 0.042 | 5.876 | 0.201 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000018c | 28.966 | 3.926 | 0.246 | 0.354 | 0.072 | 1.398 | 9.626 | 0.472 | n/a | 0.504 | 12.318 | n/a | n/a | 0.050 | 4.597 | 0.159 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001a2 | 28.818 | 3.459 | 0.206 | 0.356 | 0.070 | 1.360 | 6.670 | 0.101 | n/a | 0.761 | 15.793 | n/a | n/a | 0.043 | 4.090 | 0.142 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001a0 | 28.564 | 4.951 | 0.234 | 0.256 | 0.079 | 1.605 | 7.629 | 0.085 | n/a | 0.383 | 13.292 | n/a | n/a | 0.050 | 5.520 | 0.193 | 0.050 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001bf | 28.211 | 4.521 | 0.017 | 0.000 | 0.368 | 0.769 | 1.736 | 0.041 | n/a | 2.944 | 17.772 | n/a | n/a | 0.044 | 4.906 | 0.174 | 0.044 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000019b | 27.286 | 4.772 | 0.007 | 0.000 | 0.923 | 0.969 | 2.510 | 0.093 | n/a | 2.322 | 15.645 | n/a | n/a | 0.046 | 5.702 | 0.209 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000019e | 26.845 | 4.126 | 0.284 | 0.317 | 0.099 | 1.511 | 9.767 | 0.045 | n/a | 0.202 | 10.433 | n/a | n/a | 0.060 | 4.826 | 0.180 | 0.060 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.663 | 0.743 | 0.000 | 1.510 | 3.600 | 0.006 | 0.000 | 0.747 | 1.246 | 1.528 | 0.046 | n/a | 0.525 | 8.592 | n/a | n/a | 0.051 | 4.411 | 0.273 | 0.051 |
| p99 | 30.343 | 2.115 | 0.000 | 3.960 | 8.112 | 0.015 | 0.000 | 1.153 | 4.639 | 5.927 | 0.107 | n/a | 0.837 | 14.635 | n/a | n/a | 0.111 | 8.789 | 0.328 | 0.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c9145386900000000000001ad | 30.343 | 8.112 | 0.011 | 0.000 | 0.666 | 1.246 | 5.214 | 0.065 | n/a | 0.281 | 14.635 | n/a | n/a | 0.111 | 8.789 | 0.290 | 0.111 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001a3 | 21.756 | 3.881 | 0.006 | 0.000 | 1.104 | 1.909 | 5.927 | 0.107 | n/a | 0.363 | 8.416 | n/a | n/a | 0.043 | 4.992 | 0.229 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001c2 | 20.885 | 3.600 | 0.007 | 0.000 | 0.466 | 1.878 | 1.528 | 0.043 | n/a | 0.512 | 12.787 | n/a | n/a | 0.063 | 4.073 | 0.195 | 0.063 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000017e | 19.348 | 3.587 | 0.006 | 0.000 | 0.818 | 4.639 | 1.080 | 0.040 | n/a | 0.541 | 8.592 | n/a | n/a | 0.045 | 4.411 | 0.228 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000189 | 18.741 | 3.597 | 0.005 | 0.000 | 1.061 | 1.096 | 1.857 | 0.074 | n/a | 0.714 | 10.297 | n/a | n/a | 0.040 | 4.663 | 0.249 | 0.040 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001ba | 17.663 | 4.196 | 0.015 | 0.000 | 0.747 | 1.243 | 1.809 | 0.088 | n/a | 0.837 | 8.660 | n/a | n/a | 0.069 | 4.958 | 0.281 | 0.069 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000017a | 17.208 | 4.421 | 0.010 | 0.000 | 1.153 | 0.985 | 1.130 | 0.038 | n/a | 0.495 | 8.908 | n/a | n/a | 0.067 | 5.584 | 0.324 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000191 | 15.547 | 3.639 | 0.005 | 0.000 | 0.599 | 1.043 | 1.433 | 0.042 | n/a | 0.548 | 8.186 | n/a | n/a | 0.051 | 4.244 | 0.273 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001c5 | 12.477 | 2.771 | 0.005 | 0.000 | 0.667 | 2.072 | 1.879 | 0.067 | n/a | 0.525 | 4.438 | n/a | n/a | 0.053 | 3.443 | 0.276 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000018f | 11.495 | 2.980 | 0.006 | 0.000 | 0.783 | 1.564 | 1.355 | 0.046 | n/a | 0.538 | 4.187 | n/a | n/a | 0.036 | 3.769 | 0.328 | 0.036 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.187 | 0.506 | 0.000 | 1.260 | 3.989 | 0.018 | 0.000 | 0.148 | 1.286 | 5.339 | 0.058 | n/a | 0.325 | 12.009 | n/a | n/a | 0.057 | 4.778 | 0.216 | 0.057 |
| p99 | 65.891 | 2.480 | 0.015 | 5.611 | 15.173 | 2.216 | 0.623 | 1.249 | 4.725 | 21.387 | 4.034 | n/a | 5.302 | 50.780 | n/a | n/a | 0.174 | 15.940 | 0.464 | 0.174 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c9145386900000000000001ec | 65.891 | 15.173 | 0.012 | 0.000 | 0.755 | 4.725 | 21.387 | 0.241 | n/a | 0.882 | 22.658 | n/a | n/a | 0.057 | 15.940 | 0.242 | 0.057 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001fb | 57.257 | 3.119 | 0.006 | 0.000 | 1.093 | 0.704 | 1.267 | 0.041 | n/a | 0.199 | 50.780 | n/a | n/a | 0.049 | 4.218 | 0.074 | 0.049 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000217 | 47.447 | 4.947 | 0.260 | 0.000 | 0.080 | 1.575 | 16.717 | 3.836 | n/a | 1.119 | 18.853 | n/a | n/a | 0.061 | 5.286 | 0.111 | 0.061 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001f5 | 45.315 | 8.269 | 0.354 | 0.623 | 0.154 | 1.860 | 12.129 | 0.106 | n/a | 0.325 | 21.436 | n/a | n/a | 0.059 | 9.400 | 0.207 | 0.059 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001db | 40.182 | 5.644 | 1.467 | 0.000 | 0.107 | 1.842 | 12.246 | 0.132 | n/a | 0.308 | 18.384 | n/a | n/a | 0.053 | 7.218 | 0.180 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.760ms; driver.expected-state.bind-receipt 1.419ms |
| c0ab384c9145386900000000000001ff | 40.032 | 5.831 | 0.835 | 0.366 | 0.122 | 3.302 | 12.754 | 0.164 | n/a | 0.319 | 16.166 | n/a | n/a | 0.174 | 7.154 | 0.179 | 0.174 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001dc | 38.342 | 8.543 | 0.013 | 0.000 | 0.059 | 1.656 | 1.447 | 0.036 | n/a | 0.160 | 26.376 | n/a | n/a | 0.052 | 8.615 | 0.225 | 0.052 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001d7 | 38.026 | 3.989 | 0.223 | 0.000 | 0.077 | 3.156 | 8.347 | 0.058 | n/a | 2.328 | 19.805 | n/a | n/a | 0.042 | 4.289 | 0.113 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001d0 | 37.555 | 6.536 | 0.004 | 0.000 | 1.249 | 4.690 | 2.318 | 4.034 | n/a | 1.236 | 17.450 | n/a | n/a | 0.037 | 7.789 | 0.207 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001cf | 36.304 | 3.580 | 0.007 | 0.000 | 0.711 | 1.286 | 5.735 | 0.088 | n/a | 5.302 | 19.521 | n/a | n/a | 0.075 | 4.297 | 0.118 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001d4 | 33.954 | 3.713 | 0.301 | 0.000 | 0.146 | 1.516 | 8.259 | 0.052 | n/a | 0.530 | 19.345 | n/a | n/a | 0.092 | 4.160 | 0.123 | 0.092 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001f7 | 33.728 | 4.662 | 0.279 | 0.340 | 0.072 | 1.871 | 13.882 | 0.065 | n/a | 0.222 | 12.284 | n/a | n/a | 0.051 | 5.353 | 0.159 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000207 | 32.162 | 4.915 | 0.345 | 0.000 | 0.148 | 2.357 | 7.171 | 0.047 | n/a | 0.420 | 16.691 | n/a | n/a | 0.068 | 5.407 | 0.168 | 0.068 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000203 | 30.654 | 4.103 | 0.222 | 0.377 | 0.076 | 1.026 | 9.686 | 0.058 | n/a | 0.188 | 14.878 | n/a | n/a | 0.041 | 4.778 | 0.156 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001d8 | 26.928 | 4.632 | 0.010 | 0.000 | 0.550 | 1.004 | 8.213 | 0.126 | n/a | 0.887 | 11.454 | n/a | n/a | 0.052 | 5.192 | 0.193 | 0.052 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000021b | 26.614 | 3.780 | 0.255 | 0.000 | 0.109 | 1.612 | 8.281 | 0.103 | n/a | 0.406 | 12.009 | n/a | n/a | 0.060 | 4.144 | 0.156 | 0.060 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000215 | 26.542 | 3.722 | 0.256 | 0.000 | 0.065 | 4.558 | 9.997 | 0.079 | n/a | 0.213 | 7.598 | n/a | n/a | 0.053 | 4.044 | 0.152 | 0.053 | gw-w/thread-42/gateway.admitted-work | none observed |
| c0ab384c914538690000000000000213 | 26.464 | 3.510 | 0.228 | 0.000 | 0.179 | 1.387 | 6.980 | 0.058 | n/a | 0.283 | 13.775 | n/a | n/a | 0.064 | 3.916 | 0.148 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001f8 | 26.444 | 6.471 | 0.007 | 0.000 | 0.841 | 0.612 | 1.961 | 0.041 | n/a | 0.224 | 16.214 | n/a | n/a | 0.073 | 7.318 | 0.277 | 0.073 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001eb | 26.073 | 3.423 | 0.206 | 0.261 | 0.086 | 1.186 | 8.966 | 0.046 | n/a | 1.997 | 9.850 | n/a | n/a | 0.053 | 3.976 | 0.153 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.282 | 0.516 | 0.000 | 1.566 | 3.576 | 0.007 | 0.000 | 0.594 | 0.950 | 1.899 | 0.052 | n/a | 0.342 | 11.437 | n/a | n/a | 0.052 | 4.218 | 0.233 | 0.052 |
| p99 | 57.257 | 1.623 | 0.015 | 3.428 | 6.009 | 0.018 | 0.000 | 1.093 | 1.580 | 8.213 | 0.126 | n/a | 5.302 | 50.780 | n/a | n/a | 0.164 | 6.254 | 0.405 | 0.164 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c9145386900000000000001fb | 57.257 | 3.119 | 0.006 | 0.000 | 1.093 | 0.704 | 1.267 | 0.041 | n/a | 0.199 | 50.780 | n/a | n/a | 0.049 | 4.218 | 0.074 | 0.049 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001cf | 36.304 | 3.580 | 0.007 | 0.000 | 0.711 | 1.286 | 5.735 | 0.088 | n/a | 5.302 | 19.521 | n/a | n/a | 0.075 | 4.297 | 0.118 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001d8 | 26.928 | 4.632 | 0.010 | 0.000 | 0.550 | 1.004 | 8.213 | 0.126 | n/a | 0.887 | 11.454 | n/a | n/a | 0.052 | 5.192 | 0.193 | 0.052 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001cb | 25.187 | 3.576 | 0.007 | 0.000 | 0.106 | 1.035 | 1.651 | 0.040 | n/a | 0.227 | 18.498 | n/a | n/a | 0.046 | 3.688 | 0.146 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000020e | 22.760 | 3.716 | 0.018 | 0.000 | 0.327 | 0.868 | 1.339 | 0.040 | n/a | 0.239 | 16.152 | n/a | n/a | 0.062 | 4.061 | 0.178 | 0.062 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000200 | 22.516 | 4.270 | 0.010 | 0.000 | 0.594 | 1.562 | 1.917 | 0.052 | n/a | 0.228 | 13.719 | n/a | n/a | 0.164 | 4.874 | 0.216 | 0.164 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001df | 22.506 | 5.522 | 0.006 | 0.000 | 0.207 | 0.987 | 1.638 | 0.052 | n/a | 0.291 | 13.740 | n/a | n/a | 0.062 | 5.735 | 0.255 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001e6 | 21.282 | 6.009 | 0.010 | 0.000 | 0.235 | 0.857 | 2.121 | 0.105 | n/a | 0.428 | 11.437 | n/a | n/a | 0.080 | 6.254 | 0.294 | 0.080 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001f2 | 19.377 | 3.652 | 0.005 | 0.000 | 0.885 | 0.716 | 3.490 | 0.087 | n/a | 0.743 | 9.737 | n/a | n/a | 0.061 | 4.543 | 0.234 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001c9 | 18.492 | 3.470 | 0.007 | 0.000 | 0.688 | 0.950 | 1.951 | 0.126 | n/a | 0.342 | 10.915 | n/a | n/a | 0.042 | 4.165 | 0.225 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001e2 | 15.578 | 3.495 | 0.006 | 0.000 | 0.621 | 0.837 | 1.209 | 0.044 | n/a | 0.189 | 9.137 | n/a | n/a | 0.039 | 4.122 | 0.265 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000204 | 15.193 | 2.944 | 0.006 | 0.000 | 0.920 | 0.539 | 1.351 | 0.037 | n/a | 0.524 | 8.839 | n/a | n/a | 0.033 | 3.870 | 0.255 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000208 | 12.480 | 2.785 | 0.011 | 0.000 | 0.203 | 1.580 | 1.899 | 0.109 | n/a | 0.411 | 5.442 | n/a | n/a | 0.040 | 2.999 | 0.240 | 0.040 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000001e4 | 11.872 | 2.675 | 0.006 | 0.000 | 0.090 | 1.485 | 2.059 | 0.099 | n/a | 0.516 | 4.905 | n/a | n/a | 0.037 | 2.771 | 0.233 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000218 | 11.511 | 3.575 | 0.007 | 0.000 | 1.083 | 0.686 | 1.246 | 0.035 | n/a | 0.244 | 4.560 | n/a | n/a | 0.076 | 4.665 | 0.405 | 0.076 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.503 | 0.603 | 0.000 | 1.637 | 4.166 | 0.011 | 0.000 | 0.345 | 1.218 | 3.132 | 0.050 | n/a | 0.475 | 9.910 | n/a | n/a | 0.048 | 4.547 | 0.224 | 0.048 |
| p99 | 67.656 | 4.009 | 0.010 | 6.780 | 13.450 | 0.348 | 0.000 | 1.275 | 4.708 | 55.136 | 3.875 | n/a | 5.358 | 35.880 | n/a | n/a | 0.176 | 14.303 | 0.477 | 0.176 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c91453869000000000000021c | 67.656 | 4.906 | 0.006 | 0.000 | 0.123 | 3.599 | 55.136 | 0.122 | n/a | 0.285 | 3.419 | n/a | n/a | 0.059 | 5.035 | 0.074 | 0.059 | gw-w/thread-43/commit.prepare-and-validate | none observed |
| c0ab384c914538690000000000000241 | 52.856 | 5.201 | 0.194 | 0.000 | 0.069 | 1.763 | 9.439 | 0.048 | n/a | 0.219 | 35.880 | n/a | n/a | 0.043 | 5.464 | 0.103 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000230 | 41.649 | 13.450 | 0.013 | 0.000 | 0.840 | 2.384 | 3.132 | 0.071 | n/a | 0.567 | 21.017 | n/a | n/a | 0.176 | 14.303 | 0.343 | 0.176 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000280 | 35.659 | 3.590 | 0.258 | 0.000 | 0.104 | 1.845 | 13.281 | 0.063 | n/a | 0.664 | 15.800 | n/a | n/a | 0.054 | 3.952 | 0.111 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000245 | 34.912 | 4.705 | 0.011 | 0.000 | 0.865 | 0.792 | 2.101 | 0.064 | n/a | 0.244 | 26.026 | n/a | n/a | 0.105 | 5.581 | 0.160 | 0.105 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.496ms |
| c0ab384c914538690000000000000274 | 34.805 | 3.621 | 0.237 | 0.000 | 0.113 | 3.665 | 11.848 | 0.047 | n/a | 0.231 | 14.991 | n/a | n/a | 0.054 | 3.970 | 0.114 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.022ms |
| c0ab384c914538690000000000000233 | 32.530 | 3.941 | 0.255 | 0.000 | 0.065 | 1.218 | 12.492 | 0.129 | n/a | 0.312 | 14.075 | n/a | n/a | 0.043 | 4.261 | 0.131 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000025f | 32.447 | 4.155 | 0.348 | 0.000 | 0.044 | 1.651 | 8.726 | 0.058 | n/a | 0.291 | 17.125 | n/a | n/a | 0.049 | 4.547 | 0.140 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000021e | 31.951 | 4.166 | 0.253 | 0.000 | 0.061 | 1.341 | 15.048 | 0.094 | n/a | 0.482 | 10.453 | n/a | n/a | 0.053 | 4.480 | 0.140 | 0.053 | gw-w/thread-45/gateway.admitted-work | none observed |
| c0ab384c91453869000000000000023f | 31.515 | 3.596 | 0.238 | 0.000 | 0.110 | 1.329 | 7.605 | 0.051 | n/a | 0.564 | 17.963 | n/a | n/a | 0.059 | 3.944 | 0.125 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000264 | 30.901 | 6.258 | 0.006 | 0.000 | 0.304 | 2.975 | 18.938 | 0.074 | n/a | 0.228 | 2.043 | n/a | n/a | 0.075 | 6.568 | 0.213 | 0.075 | gw-w/thread-40/gateway.admitted-work | none observed |
| c0ab384c914538690000000000000228 | 30.730 | 3.678 | 0.278 | 0.000 | 0.074 | 1.813 | 9.694 | 0.050 | n/a | 0.514 | 14.588 | n/a | n/a | 0.041 | 4.030 | 0.131 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000024b | 30.448 | 3.690 | 0.192 | 0.000 | 0.066 | 1.538 | 12.674 | 0.042 | n/a | 0.472 | 11.725 | n/a | n/a | 0.049 | 3.948 | 0.130 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000023d | 29.936 | 3.731 | 0.274 | 0.000 | 0.057 | 1.633 | 8.102 | 3.875 | n/a | 0.210 | 12.006 | n/a | n/a | 0.048 | 4.063 | 0.136 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000024c | 29.482 | 4.990 | 0.007 | 0.000 | 0.604 | 1.283 | 1.712 | 0.035 | n/a | 5.358 | 15.435 | n/a | n/a | 0.058 | 5.601 | 0.190 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000022f | 28.323 | 3.494 | 0.216 | 0.000 | 0.086 | 1.363 | 9.355 | 0.051 | n/a | 0.505 | 13.216 | n/a | n/a | 0.038 | 3.796 | 0.134 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000223 | 27.113 | 6.892 | 0.011 | 0.000 | 0.345 | 0.992 | 1.270 | 0.037 | n/a | 0.450 | 17.073 | n/a | n/a | 0.042 | 7.248 | 0.267 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000225 | 26.960 | 3.157 | 0.007 | 0.000 | 0.900 | 0.607 | 4.629 | 0.046 | n/a | 0.227 | 17.348 | n/a | n/a | 0.040 | 4.064 | 0.151 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000243 | 26.677 | 4.086 | 0.294 | 0.000 | 0.068 | 2.207 | 8.659 | 0.055 | n/a | 1.355 | 9.910 | n/a | n/a | 0.042 | 4.449 | 0.167 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000256 | 26.633 | 6.051 | 0.006 | 0.000 | 0.928 | 0.666 | 1.928 | 0.105 | n/a | 0.314 | 16.598 | n/a | n/a | 0.036 | 6.986 | 0.262 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.033 | 0.678 | 0.000 | 1.719 | 3.761 | 0.006 | 0.000 | 0.615 | 0.838 | 1.655 | 0.041 | n/a | 0.464 | 5.636 | n/a | n/a | 0.053 | 4.375 | 0.314 | 0.053 |
| p99 | 67.656 | 1.731 | 0.010 | 6.780 | 13.450 | 0.013 | 0.000 | 1.275 | 4.708 | 55.136 | 0.122 | n/a | 3.747 | 26.026 | n/a | n/a | 0.176 | 14.303 | 0.477 | 0.176 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c91453869000000000000021c | 67.656 | 4.906 | 0.006 | 0.000 | 0.123 | 3.599 | 55.136 | 0.122 | n/a | 0.285 | 3.419 | n/a | n/a | 0.059 | 5.035 | 0.074 | 0.059 | gw-w/thread-43/commit.prepare-and-validate | none observed |
| c0ab384c914538690000000000000230 | 41.649 | 13.450 | 0.013 | 0.000 | 0.840 | 2.384 | 3.132 | 0.071 | n/a | 0.567 | 21.017 | n/a | n/a | 0.176 | 14.303 | 0.343 | 0.176 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000245 | 34.912 | 4.705 | 0.011 | 0.000 | 0.865 | 0.792 | 2.101 | 0.064 | n/a | 0.244 | 26.026 | n/a | n/a | 0.105 | 5.581 | 0.160 | 0.105 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.496ms |
| c0ab384c914538690000000000000264 | 30.901 | 6.258 | 0.006 | 0.000 | 0.304 | 2.975 | 18.938 | 0.074 | n/a | 0.228 | 2.043 | n/a | n/a | 0.075 | 6.568 | 0.213 | 0.075 | gw-w/thread-40/gateway.admitted-work | none observed |
| c0ab384c914538690000000000000225 | 26.960 | 3.157 | 0.007 | 0.000 | 0.900 | 0.607 | 4.629 | 0.046 | n/a | 0.227 | 17.348 | n/a | n/a | 0.040 | 4.064 | 0.151 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000023b | 20.979 | 3.732 | 0.005 | 0.000 | 0.615 | 4.708 | 2.688 | 0.071 | n/a | 1.388 | 7.710 | n/a | n/a | 0.062 | 4.352 | 0.207 | 0.062 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000269 | 20.080 | 8.620 | 0.008 | 0.000 | 0.950 | 0.958 | 1.248 | 0.041 | n/a | 0.241 | 7.971 | n/a | n/a | 0.043 | 9.578 | 0.477 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000022a | 19.059 | 3.141 | 0.006 | 0.000 | 0.392 | 0.977 | 1.717 | 0.054 | n/a | 0.907 | 11.821 | n/a | n/a | 0.044 | 3.538 | 0.186 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000258 | 16.033 | 5.522 | 0.010 | 0.000 | 0.553 | 1.167 | 2.448 | 0.039 | n/a | 0.239 | 5.968 | n/a | n/a | 0.087 | 6.086 | 0.380 | 0.087 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000260 | 14.151 | 3.559 | 0.005 | 0.000 | 0.811 | 0.760 | 1.041 | 0.034 | n/a | 3.747 | 4.147 | n/a | n/a | 0.046 | 4.375 | 0.309 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000277 | 13.311 | 3.761 | 0.007 | 0.000 | 0.408 | 1.729 | 1.061 | 0.033 | n/a | 0.638 | 5.636 | n/a | n/a | 0.039 | 4.176 | 0.314 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000221 | 12.940 | 3.068 | 0.006 | 0.000 | 1.078 | 0.625 | 1.019 | 0.032 | n/a | 0.498 | 6.582 | n/a | n/a | 0.034 | 4.151 | 0.321 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000027b | 12.891 | 4.292 | 0.011 | 0.000 | 1.275 | 0.771 | 1.302 | 0.038 | n/a | 0.475 | 4.648 | n/a | n/a | 0.080 | 5.577 | 0.433 | 0.080 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000025a | 12.484 | 4.368 | 0.005 | 0.000 | 0.610 | 0.633 | 1.655 | 0.034 | n/a | 0.376 | 4.740 | n/a | n/a | 0.063 | 4.983 | 0.399 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000027d | 10.689 | 3.168 | 0.006 | 0.000 | 0.172 | 0.838 | 1.605 | 0.055 | n/a | 0.599 | 4.208 | n/a | n/a | 0.038 | 3.346 | 0.313 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000271 | 9.933 | 3.470 | 0.006 | 0.000 | 0.658 | 0.601 | 0.980 | 0.035 | n/a | 0.238 | 3.908 | n/a | n/a | 0.037 | 4.134 | 0.416 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000024e | 9.274 | 3.315 | 0.006 | 0.000 | 0.195 | 0.736 | 0.984 | 0.035 | n/a | 0.464 | 3.486 | n/a | n/a | 0.053 | 3.516 | 0.379 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.527 | 0.541 | 0.000 | 1.343 | 4.086 | 0.012 | 0.000 | 0.113 | 1.117 | 3.081 | 0.043 | n/a | 0.300 | 9.217 | n/a | n/a | 0.056 | 4.570 | 0.272 | 0.056 |
| p99 | 68.160 | 4.611 | 0.000 | 8.551 | 12.036 | n/a | 5.622 | 1.155 | 6.751 | 32.480 | 3.928 | n/a | 3.320 | 53.464 | n/a | n/a | 0.186 | 15.630 | 0.449 | 0.186 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c914538690000000000000295 | 68.160 | 4.043 | 0.303 | 0.000 | 0.074 | 1.636 | 7.780 | 0.076 | n/a | 0.745 | 53.464 | n/a | n/a | 0.040 | 4.420 | 0.065 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002cb | 56.682 | 9.383 | 0.012 | 5.622 | 0.613 | 0.840 | 32.480 | 0.038 | n/a | 0.236 | 7.387 | n/a | n/a | 0.070 | 15.630 | 0.276 | 0.070 | gw-w/thread-40/gateway.route | none observed |
| c0ab384c91453869000000000000028f | 51.824 | 4.199 | 2.562 | 0.000 | 0.112 | 1.587 | 10.084 | 3.928 | n/a | 0.077 | 29.232 | n/a | n/a | 0.043 | 6.873 | 0.133 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000290 | 38.279 | 2.845 | 0.006 | 0.000 | 0.086 | 2.892 | 1.077 | 0.043 | n/a | 0.311 | 30.984 | n/a | n/a | 0.034 | 2.937 | 0.077 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002af | 32.015 | 5.433 | 0.472 | 0.000 | 0.082 | 2.073 | 9.442 | 0.048 | n/a | 0.248 | 14.135 | n/a | n/a | 0.083 | 5.987 | 0.187 | 0.083 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002b1 | 30.670 | 3.789 | 0.330 | 0.000 | 0.064 | 1.645 | 9.492 | 0.046 | n/a | 0.207 | 15.056 | n/a | n/a | 0.040 | 4.184 | 0.136 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002c8 | 30.033 | 12.036 | n/a | 0.000 | 0.180 | 5.260 | 12.263 | 0.033 | n/a | 0.075 | 0.000 | n/a | n/a | 0.186 | 12.216 | 0.407 | 0.186 | node-14/thread-0/driver.execute | none observed |
| c0ab384c9145386900000000000002ca | 28.871 | 6.902 | 0.278 | 2.165 | 0.113 | 6.751 | 3.081 | 0.089 | n/a | 0.329 | 9.106 | n/a | n/a | 0.059 | 9.457 | 0.328 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000297 | 28.255 | 3.900 | 0.208 | 0.000 | 0.062 | 1.780 | 8.522 | 0.113 | n/a | 0.468 | 13.139 | n/a | n/a | 0.063 | 4.170 | 0.148 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002bf | 26.848 | 4.037 | 0.277 | 0.000 | 0.062 | 1.277 | 10.751 | 0.073 | n/a | 0.804 | 9.510 | n/a | n/a | 0.058 | 4.375 | 0.163 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002a9 | 26.242 | 4.145 | 0.231 | 0.000 | 0.071 | 2.865 | 9.288 | 0.042 | n/a | 0.222 | 9.339 | n/a | n/a | 0.039 | 4.447 | 0.169 | 0.039 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002ac | 26.057 | 6.614 | 0.008 | 0.000 | 1.009 | 1.236 | 2.462 | 0.142 | n/a | 3.018 | 11.484 | n/a | n/a | 0.085 | 7.631 | 0.293 | 0.085 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002a5 | 25.789 | 3.872 | 0.307 | 0.000 | 0.075 | 1.172 | 8.781 | 0.037 | n/a | 0.338 | 11.156 | n/a | n/a | 0.051 | 4.254 | 0.165 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.187ms |
| c0ab384c9145386900000000000002b5 | 25.746 | 4.816 | 0.302 | 0.000 | 0.083 | 1.236 | 9.864 | 0.071 | n/a | 0.402 | 8.898 | n/a | n/a | 0.074 | 5.201 | 0.202 | 0.074 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000028a | 24.275 | 5.136 | 0.007 | 0.000 | 0.905 | 0.764 | 3.197 | 0.036 | n/a | 0.421 | 13.750 | n/a | n/a | 0.059 | 6.048 | 0.249 | 0.059 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002c7 | 24.161 | 3.278 | 0.237 | 0.000 | 0.106 | 1.039 | 9.581 | 0.078 | n/a | 0.713 | 9.072 | n/a | n/a | 0.058 | 3.621 | 0.150 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002d4 | 23.944 | 3.354 | 0.239 | 0.000 | 0.102 | 1.013 | 6.708 | 0.079 | n/a | 0.346 | 12.022 | n/a | n/a | 0.081 | 3.695 | 0.154 | 0.081 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000028c | 23.859 | 7.343 | 0.012 | 0.000 | 1.099 | 1.004 | 1.278 | 0.034 | n/a | 0.194 | 12.766 | n/a | n/a | 0.129 | 8.454 | 0.354 | 0.129 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002a1 | 21.284 | 3.593 | 0.254 | 0.000 | 0.053 | 1.425 | 5.339 | 0.037 | n/a | 0.185 | 10.360 | n/a | n/a | 0.038 | 3.899 | 0.183 | 0.038 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000285 | 21.015 | 6.103 | 0.011 | 0.000 | 0.819 | 0.938 | 1.307 | 0.039 | n/a | 0.219 | 11.503 | n/a | n/a | 0.075 | 6.933 | 0.330 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.008 | 0.967 | 0.000 | 1.800 | 4.023 | 0.006 | 0.000 | 0.613 | 0.870 | 1.209 | 0.036 | n/a | 0.311 | 5.735 | n/a | n/a | 0.055 | 4.646 | 0.358 | 0.055 |
| p99 | 38.279 | 1.844 | 0.000 | 2.147 | 12.036 | n/a | 0.000 | 1.155 | 5.260 | 12.263 | 0.130 | n/a | 3.320 | 30.984 | n/a | n/a | 0.186 | 12.216 | 0.449 | 0.186 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c914538690000000000000290 | 38.279 | 2.845 | 0.006 | 0.000 | 0.086 | 2.892 | 1.077 | 0.043 | n/a | 0.311 | 30.984 | n/a | n/a | 0.034 | 2.937 | 0.077 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002c8 | 30.033 | 12.036 | n/a | 0.000 | 0.180 | 5.260 | 12.263 | 0.033 | n/a | 0.075 | 0.000 | n/a | n/a | 0.186 | 12.216 | 0.407 | 0.186 | node-14/thread-0/driver.execute | none observed |
| c0ab384c9145386900000000000002b8 | 20.042 | 3.392 | 0.006 | 0.000 | 0.095 | 0.897 | 1.949 | 0.059 | n/a | 0.355 | 13.225 | n/a | n/a | 0.063 | 3.493 | 0.174 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002aa | 17.446 | 3.433 | 0.006 | 0.000 | 1.005 | 1.032 | 2.841 | 0.130 | n/a | 3.320 | 5.636 | n/a | n/a | 0.043 | 4.444 | 0.255 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002bd | 17.345 | 4.106 | 0.006 | 0.000 | 0.603 | 0.740 | 1.259 | 0.053 | n/a | 0.267 | 10.243 | n/a | n/a | 0.067 | 4.716 | 0.272 | 0.067 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002a2 | 15.082 | 4.023 | 0.010 | 0.000 | 0.613 | 0.709 | 1.203 | 0.032 | n/a | 1.013 | 7.423 | n/a | n/a | 0.055 | 4.646 | 0.308 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000029a | 14.989 | 4.393 | 0.010 | 0.000 | 1.155 | 1.117 | 1.538 | 0.069 | n/a | 0.417 | 6.222 | n/a | n/a | 0.068 | 5.557 | 0.371 | 0.068 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000029e | 14.008 | 3.409 | 0.006 | 0.000 | 0.611 | 0.725 | 0.936 | 0.035 | n/a | 0.196 | 8.003 | n/a | n/a | 0.086 | 4.027 | 0.287 | 0.086 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002b2 | 14.008 | 5.208 | 0.010 | 0.000 | 1.060 | 0.870 | 1.057 | 0.034 | n/a | 0.478 | 5.221 | n/a | n/a | 0.070 | 6.278 | 0.448 | 0.070 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000281 | 13.428 | 3.961 | 0.008 | 0.000 | 0.837 | 1.131 | 1.209 | 0.043 | n/a | 0.300 | 5.897 | n/a | n/a | 0.043 | 4.805 | 0.358 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000298 | 13.102 | 4.182 | 0.006 | 0.000 | 1.006 | 0.620 | 1.258 | 0.033 | n/a | 0.213 | 5.735 | n/a | n/a | 0.048 | 5.194 | 0.396 | 0.048 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002b6 | 12.362 | 4.102 | 0.006 | 0.000 | 0.383 | 0.765 | 1.531 | 0.046 | n/a | 0.225 | 5.248 | n/a | n/a | 0.056 | 4.491 | 0.363 | 0.056 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002c4 | 10.847 | 3.435 | 0.005 | 0.000 | 1.078 | 0.664 | 0.990 | 0.036 | n/a | 0.861 | 3.741 | n/a | n/a | 0.039 | 4.518 | 0.416 | 0.039 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000002c2 | 10.603 | 4.086 | 0.008 | 0.000 | 0.671 | 1.067 | 1.075 | 0.035 | n/a | 0.441 | 3.171 | n/a | n/a | 0.050 | 4.764 | 0.449 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (862 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.575 | 0.790 | 0.000 | 1.638 | 3.716 | 0.005 | 0.000 | 0.773 | 0.872 | 1.230 | 0.040 | n/a | 0.331 | 7.714 | n/a | n/a | 0.038 | 4.775 | 0.297 | 0.038 |
| p99 | 55.685 | 3.256 | 3.147 | 6.495 | 11.020 | 1.817 | 0.000 | 29.825 | 11.548 | 12.397 | 4.188 | n/a | 5.868 | 35.585 | n/a | n/a | 0.110 | 32.420 | 0.705 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c9145386900000000000003f8 | 95.999 | 9.586 | 5.243 | 0.000 | 0.070 | 3.856 | 18.147 | 0.093 | n/a | 2.843 | 56.117 | n/a | n/a | 0.042 | 14.900 | 0.155 | 0.042 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 5.548ms; driver.expected-state.bind-receipt 1.867ms; driver.publication 1.713ms; driver.publication 1.221ms; driver.publication 1.137ms |
| c0ab384c914538690000000000000352 | 69.501 | 9.665 | 0.006 | 0.000 | 0.104 | 9.230 | 2.721 | 0.088 | n/a | 0.338 | 47.305 | n/a | n/a | 0.043 | 9.775 | 0.141 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 2.281ms; driver.publication 1.319ms; driver.publication 1.285ms; driver.publication 1.153ms |
| c0ab384c91453869000000000000040b | 64.086 | 2.136 | 0.005 | 0.000 | 31.063 | 9.779 | 1.109 | 0.044 | n/a | 0.400 | 19.523 | n/a | n/a | 0.026 | 33.204 | 0.518 | 0.026 | node-14/thread-0/driver.queue.subject | driver.publication 2.151ms; driver.publication 1.349ms; driver.publication 1.322ms; driver.publication 1.233ms; driver.publication 1.200ms |
| c0ab384c9145386900000000000003cf | 62.072 | 2.281 | 0.003 | 0.000 | 30.252 | 3.344 | 0.910 | 0.034 | n/a | 1.297 | 23.926 | n/a | n/a | 0.025 | 32.536 | 0.524 | 0.025 | node-14/thread-0/driver.queue.subject | driver.publication 1.676ms; driver.publication 1.167ms; driver.publication 1.050ms; driver.publication 1.026ms; driver.publication 1.009ms |
| c0ab384c91453869000000000000097f | 61.045 | 12.848 | 1.817 | 0.000 | 0.093 | 3.137 | 14.696 | 0.060 | n/a | 0.170 | 28.151 | n/a | n/a | 0.073 | 14.759 | 0.242 | 0.073 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.734ms; driver.publication 2.323ms; driver.publication 1.902ms; driver.publication 1.281ms; driver.publication 1.211ms |
| c0ab384c9145386900000000000002de | 60.173 | 3.708 | 0.235 | 0.000 | 0.102 | 4.632 | 27.668 | 0.080 | n/a | 0.388 | 23.287 | n/a | n/a | 0.073 | 4.044 | 0.067 | 0.073 | gw-w/thread-47/gateway.admitted-work | none observed |
| c0ab384c914538690000000000000360 | 58.038 | 4.484 | 4.513 | 0.000 | 18.768 | 4.687 | 2.014 | 4.674 | n/a | 0.807 | 18.064 | n/a | n/a | 0.027 | 27.765 | 0.478 | 0.027 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 4.328ms; driver.publication 1.922ms; driver.publication 1.245ms; driver.publication 1.153ms; driver.publication 1.059ms |
| c0ab384c914538690000000000000462 | 56.861 | 4.061 | 0.006 | 0.000 | 15.935 | 6.768 | 0.879 | 0.048 | n/a | 0.393 | 28.740 | n/a | n/a | 0.031 | 20.001 | 0.352 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 4.419ms; driver.publication 2.863ms; driver.publication 1.482ms; driver.publication 1.451ms |
| c0ab384c914538690000000000000813 | 55.685 | 6.501 | 0.010 | 0.000 | 0.851 | 15.820 | 2.710 | 0.101 | n/a | 0.172 | 29.485 | n/a | n/a | 0.035 | 7.362 | 0.132 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.153ms; driver.publication 1.120ms; driver.publication 1.101ms; driver.publication 1.093ms; driver.publication 1.010ms |
| c0ab384c91453869000000000000044d | 55.397 | 4.920 | 0.011 | 0.000 | 1.098 | 2.356 | 10.312 | 0.036 | n/a | 0.201 | 36.428 | n/a | n/a | 0.034 | 6.029 | 0.109 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000080f | 54.711 | 4.184 | 0.004 | 0.000 | 31.356 | 8.333 | 1.221 | 2.577 | n/a | 0.672 | 6.333 | n/a | n/a | 0.031 | 35.544 | 0.650 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication 1.153ms; driver.publication 1.101ms; driver.publication 1.093ms; driver.publication 1.010ms |
| c0ab384c9145386900000000000008fe | 54.035 | 6.580 | 0.114 | 0.000 | 4.393 | 4.231 | 1.530 | 0.627 | n/a | 0.071 | 36.465 | n/a | n/a | 0.025 | 11.086 | 0.205 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.506ms; driver.expected-state.bind-receipt 1.368ms; driver.publication 1.004ms |
| c0ab384c914538690000000000000470 | 53.423 | 11.173 | 0.010 | 0.000 | 8.289 | 23.336 | 2.802 | 0.178 | n/a | 0.336 | 7.256 | n/a | n/a | 0.043 | 19.472 | 0.364 | 0.043 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.070ms |
| c0ab384c914538690000000000000400 | 52.866 | 12.257 | 0.127 | 0.000 | 0.525 | 3.270 | 1.521 | 0.027 | n/a | 2.975 | 32.127 | n/a | n/a | 0.037 | 12.909 | 0.244 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.221ms; driver.publication 1.137ms |
| c0ab384c9145386900000000000002e8 | 52.480 | 10.984 | 0.016 | 0.000 | 1.092 | 7.237 | 1.585 | 0.078 | n/a | 1.222 | 30.214 | n/a | n/a | 0.052 | 12.092 | 0.230 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.180ms; driver.publication 1.676ms |
| c0ab384c914538690000000000000812 | 52.208 | 4.825 | 0.005 | 0.000 | 29.951 | 2.740 | 3.389 | 0.041 | n/a | 1.541 | 9.685 | n/a | n/a | 0.032 | 34.781 | 0.666 | 0.032 | node-14/thread-0/driver.queue.subject | driver.publication 1.153ms; driver.publication 1.120ms; driver.publication 1.101ms; driver.publication 1.093ms; driver.publication 1.010ms |
| c0ab384c9145386900000000000006f3 | 51.684 | 2.737 | 0.003 | 0.000 | 1.816 | 1.377 | 1.151 | 0.032 | n/a | 0.627 | 43.915 | n/a | n/a | 0.025 | 4.557 | 0.088 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000901 | 51.431 | 3.052 | 0.004 | 0.000 | 33.563 | 4.861 | 1.269 | 0.129 | n/a | 1.413 | 7.113 | n/a | n/a | 0.028 | 36.619 | 0.712 | 0.028 | node-14/thread-0/driver.queue.subject | driver.publication 1.506ms; driver.expected-state.bind-receipt 1.368ms; driver.publication 1.320ms; driver.publication 1.103ms; driver.publication 1.033ms |
| c0ab384c91453869000000000000044e | 51.271 | 3.152 | 0.007 | 0.000 | 0.718 | 1.202 | 1.852 | 0.060 | n/a | 1.679 | 42.550 | n/a | n/a | 0.052 | 3.876 | 0.076 | 0.052 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.381ms |
| c0ab384c914538690000000000000465 | 50.149 | 11.740 | 0.014 | 0.000 | 2.587 | 1.613 | 0.775 | 0.032 | n/a | 0.121 | 33.220 | n/a | n/a | 0.048 | 14.341 | 0.286 | 0.048 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 2.863ms; driver.publication 1.482ms; driver.publication 1.451ms |

## P2 / L1024 / commit / 5-10 facts (503 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.842 | 0.706 | 0.000 | 1.515 | 3.281 | 0.005 | 0.000 | 0.824 | 0.917 | 1.063 | 0.039 | n/a | 0.304 | 7.113 | n/a | n/a | 0.038 | 4.317 | 0.287 | 0.038 |
| p99 | 51.431 | 2.294 | 3.147 | 5.575 | 8.865 | 0.235 | 0.000 | 29.825 | 11.225 | 7.816 | 3.741 | n/a | 5.928 | 34.487 | n/a | n/a | 0.137 | 32.420 | 0.679 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c91453869000000000000040b | 64.086 | 2.136 | 0.005 | 0.000 | 31.063 | 9.779 | 1.109 | 0.044 | n/a | 0.400 | 19.523 | n/a | n/a | 0.026 | 33.204 | 0.518 | 0.026 | node-14/thread-0/driver.queue.subject | driver.publication 2.151ms; driver.publication 1.349ms; driver.publication 1.322ms; driver.publication 1.233ms; driver.publication 1.200ms |
| c0ab384c9145386900000000000003cf | 62.072 | 2.281 | 0.003 | 0.000 | 30.252 | 3.344 | 0.910 | 0.034 | n/a | 1.297 | 23.926 | n/a | n/a | 0.025 | 32.536 | 0.524 | 0.025 | node-14/thread-0/driver.queue.subject | driver.publication 1.676ms; driver.publication 1.167ms; driver.publication 1.050ms; driver.publication 1.026ms; driver.publication 1.009ms |
| c0ab384c914538690000000000000462 | 56.861 | 4.061 | 0.006 | 0.000 | 15.935 | 6.768 | 0.879 | 0.048 | n/a | 0.393 | 28.740 | n/a | n/a | 0.031 | 20.001 | 0.352 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 4.419ms; driver.publication 2.863ms; driver.publication 1.482ms; driver.publication 1.451ms |
| c0ab384c91453869000000000000080f | 54.711 | 4.184 | 0.004 | 0.000 | 31.356 | 8.333 | 1.221 | 2.577 | n/a | 0.672 | 6.333 | n/a | n/a | 0.031 | 35.544 | 0.650 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication 1.153ms; driver.publication 1.101ms; driver.publication 1.093ms; driver.publication 1.010ms |
| c0ab384c9145386900000000000006f3 | 51.684 | 2.737 | 0.003 | 0.000 | 1.816 | 1.377 | 1.151 | 0.032 | n/a | 0.627 | 43.915 | n/a | n/a | 0.025 | 4.557 | 0.088 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c914538690000000000000901 | 51.431 | 3.052 | 0.004 | 0.000 | 33.563 | 4.861 | 1.269 | 0.129 | n/a | 1.413 | 7.113 | n/a | n/a | 0.028 | 36.619 | 0.712 | 0.028 | node-14/thread-0/driver.queue.subject | driver.publication 1.506ms; driver.expected-state.bind-receipt 1.368ms; driver.publication 1.320ms; driver.publication 1.103ms; driver.publication 1.033ms |
| c0ab384c91453869000000000000044e | 51.271 | 3.152 | 0.007 | 0.000 | 0.718 | 1.202 | 1.852 | 0.060 | n/a | 1.679 | 42.550 | n/a | n/a | 0.052 | 3.876 | 0.076 | 0.052 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.381ms |
| c0ab384c914538690000000000000465 | 50.149 | 11.740 | 0.014 | 0.000 | 2.587 | 1.613 | 0.775 | 0.032 | n/a | 0.121 | 33.220 | n/a | n/a | 0.048 | 14.341 | 0.286 | 0.048 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 2.863ms; driver.publication 1.482ms; driver.publication 1.451ms |
| c0ab384c91453869000000000000040c | 50.017 | 2.979 | 0.007 | 0.000 | 22.433 | 5.044 | 1.434 | 2.979 | n/a | 0.581 | 14.512 | n/a | n/a | 0.048 | 25.418 | 0.508 | 0.048 | node-14/thread-0/driver.queue.subject | driver.publication 1.349ms; driver.publication 1.322ms; driver.publication 1.233ms; driver.publication 1.200ms; driver.publication 1.196ms |
| c0ab384c914538690000000000000351 | 49.455 | 4.469 | 0.010 | 0.000 | 0.281 | 2.968 | 0.899 | 0.035 | n/a | 1.624 | 39.125 | n/a | n/a | 0.044 | 4.761 | 0.096 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 2.281ms |
| c0ab384c914538690000000000000354 | 49.131 | 3.232 | 0.045 | 0.000 | 0.282 | 7.439 | 0.967 | 0.037 | n/a | 0.182 | 36.915 | n/a | n/a | 0.031 | 3.560 | 0.072 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.319ms; driver.publication 1.285ms |
| c0ab384c91453869000000000000060f | 48.984 | 2.592 | 0.002 | 0.000 | 29.825 | 0.497 | 1.012 | 0.034 | n/a | 5.264 | 9.723 | n/a | n/a | 0.034 | 32.420 | 0.662 | 0.034 | node-14/thread-0/driver.queue.subject | driver.publication 1.253ms; driver.publication 1.045ms |
| c0ab384c914538690000000000000357 | 47.817 | 6.217 | 0.011 | 0.000 | 0.334 | 20.208 | 8.434 | 0.064 | n/a | 0.216 | 12.303 | n/a | n/a | 0.029 | 6.562 | 0.137 | 0.029 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.328ms; driver.publication 1.319ms; driver.publication 1.285ms; driver.publication 1.153ms |
| c0ab384c9145386900000000000003cd | 46.911 | 3.843 | 0.005 | 0.000 | 6.279 | 0.726 | 1.221 | 0.036 | n/a | 0.286 | 34.487 | n/a | n/a | 0.029 | 10.126 | 0.216 | 0.029 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.514ms; driver.publication 1.430ms; driver.publication 1.167ms |
| c0ab384c91453869000000000000057b | 46.769 | 3.291 | 0.006 | 0.000 | 12.473 | 0.782 | 22.336 | 0.083 | n/a | 0.325 | 7.436 | n/a | n/a | 0.037 | 15.770 | 0.337 | 0.037 | gw-w/thread-64/commit.prepare-and-validate | driver.publication 1.138ms |
| c0ab384c9145386900000000000005f8 | 46.102 | 3.417 | 0.005 | 0.000 | 0.573 | 2.029 | 5.529 | 0.049 | n/a | 0.086 | 34.346 | n/a | n/a | 0.068 | 3.995 | 0.087 | 0.068 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.073ms |
| c0ab384c91453869000000000000034c | 45.695 | 3.842 | 0.013 | 0.000 | 0.612 | 4.912 | 2.303 | 0.098 | n/a | 0.187 | 33.669 | n/a | n/a | 0.060 | 4.468 | 0.098 | 0.060 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.514ms |
| c0ab384c91453869000000000000036e | 44.959 | 3.360 | 0.010 | 0.000 | 29.881 | 0.947 | 1.011 | 0.037 | n/a | 3.877 | 5.789 | n/a | n/a | 0.047 | 33.251 | 0.740 | 0.047 | node-14/thread-0/driver.queue.subject | driver.publication 1.096ms; driver.publication 1.092ms; driver.publication 1.072ms |
| c0ab384c9145386900000000000004e5 | 44.896 | 4.509 | 0.011 | 0.000 | 0.697 | 2.443 | 12.917 | 0.103 | n/a | 7.568 | 16.626 | n/a | n/a | 0.021 | 5.216 | 0.116 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c9145386900000000000003d2 | 44.684 | 2.740 | 0.005 | 0.000 | 9.588 | 0.969 | 1.110 | 0.039 | n/a | 0.204 | 29.995 | n/a | n/a | 0.034 | 12.333 | 0.276 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.676ms; driver.publication 1.167ms; driver.publication 1.026ms |

## P2/P4 / read-your-own-write / read (33 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 67.708 | n/a | n/a | n/a | 40.544 | 7.425 | 3.791 | 0.000 | 0.468 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.521 | 52.767 | 0.930 | 4.521 |
| p99 | 249.434 | n/a | n/a | n/a | 194.589 | 120.275 | 21.969 | 0.000 | 42.820 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 118.650 | 232.051 | 1.000 | 118.650 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c91453869000000000000169c | 249.434 | 194.589 | 15.493 | 21.969 | 0.000 | 1.433 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.949 | 232.051 | 0.930 | 15.949 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 4.913ms; driver.publication 1.928ms; driver.publication 1.399ms; driver.publication 1.377ms; driver.publication 1.359ms |
| c0ab384c91453869000000000000081d | 179.568 | 113.603 | 6.075 | 13.932 | 0.000 | 2.181 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.777 | 133.610 | 0.744 | 43.777 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.484ms; driver.publication 1.378ms; driver.publication 1.355ms; driver.publication 1.306ms; driver.publication 1.244ms |
| c0ab384c91453869000000000000081e | 177.206 | 36.157 | 20.552 | 0.940 | 0.000 | 0.907 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 118.650 | 57.649 | 0.325 | 118.650 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.484ms; driver.publication 1.378ms; driver.publication 1.355ms; driver.publication 1.306ms; driver.publication 1.244ms |
| c0ab384c91453869000000000000082b | 176.891 | 49.630 | 120.275 | 4.059 | 0.000 | 0.695 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.232 | 173.964 | 0.983 | 2.232 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.914ms; driver.publication 1.484ms; driver.publication 1.378ms; driver.publication 1.355ms; driver.publication 1.242ms |
| c0ab384c914538690000000000001bd9 | 133.265 | 55.182 | 12.317 | 4.904 | 0.000 | 0.577 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 60.284 | 72.403 | 0.543 | 60.284 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.362ms; driver.publication 1.263ms; driver.publication 1.205ms; driver.publication 1.161ms; driver.publication 1.084ms |
| c0ab384c91453869000000000000031e | 108.944 | 24.557 | 67.450 | 6.718 | 0.000 | 0.770 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.448 | 98.725 | 0.906 | 9.448 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 4.667ms; driver.publication 4.332ms; driver.publication 1.813ms; driver.publication 1.447ms; driver.publication 1.147ms |
| c0ab384c914538690000000000001a01 | 102.513 | 77.304 | 0.471 | 8.974 | 0.000 | 1.144 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.621 | 86.749 | 0.846 | 14.621 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.535ms; driver.publication 1.294ms; driver.publication 1.198ms; driver.publication 1.067ms |
| c0ab384c914538690000000000000981 | 98.321 | 55.125 | 35.038 | 2.499 | 0.000 | 0.468 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.191 | 92.662 | 0.942 | 5.191 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.974ms; driver.publication 2.734ms; driver.publication 2.323ms; driver.publication 1.902ms; driver.publication 1.580ms |
| c0ab384c914538690000000000000974 | 96.282 | 26.755 | 4.552 | 2.608 | 0.000 | 0.677 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 61.689 | 33.916 | 0.352 | 61.689 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.734ms; driver.publication 2.323ms; driver.publication 1.902ms; driver.publication 1.902ms; driver.publication 1.355ms |
| c0ab384c914538690000000000000319 | 94.397 | 40.476 | 2.847 | 3.791 | 0.000 | 0.984 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 46.301 | 47.113 | 0.499 | 46.301 | node-14/thread-3/socket.wait-first-byte | driver.publication 4.332ms; driver.publication 1.447ms; driver.publication 1.194ms; driver.publication 1.147ms; driver.expected-state.bind-receipt 1.002ms |
| c0ab384c914538690000000000001452 | 83.268 | 67.765 | 0.913 | 10.744 | 0.000 | 0.799 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.047 | 79.422 | 0.954 | 3.047 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.586ms; driver.publication 1.085ms; driver.publication 1.046ms |
| c0ab384c9145386900000000000016c9 | 81.627 | 47.717 | 1.007 | 4.277 | 0.000 | 0.889 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.737 | 53.001 | 0.649 | 27.737 | node-14/thread-3/socket.wait-first-byte | driver.publication 4.409ms; driver.publication 1.502ms; driver.publication 1.238ms; driver.publication 1.224ms |
| c0ab384c914538690000000000001bda | 78.518 | 56.576 | 7.425 | 4.066 | 0.000 | 0.428 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.023 | 68.067 | 0.867 | 10.023 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.263ms; driver.publication 1.084ms; driver.publication 1.037ms |
| c0ab384c914538690000000000001ba6 | 77.795 | 54.283 | 16.537 | 6.964 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 77.783 | 1.000 | 0.012 | node-14/thread-2/replica.pull-at | driver.publication 3.256ms; driver.publication 2.648ms |
| c0ab384c914538690000000000001ba7 | 72.058 | 55.122 | 9.962 | 6.964 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 72.048 | 1.000 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication 3.256ms |
| c0ab384c914538690000000000000c70 | 70.174 | 25.045 | 0.392 | 1.030 | 0.000 | 0.673 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.035 | 26.466 | 0.377 | 43.035 | node-14/thread-3/socket.wait-first-byte | driver.publication 3.559ms; driver.publication 1.186ms; driver.publication 1.038ms |
| c0ab384c914538690000000000001ba8 | 67.708 | 55.114 | 5.620 | 6.964 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 67.698 | 1.000 | 0.010 | node-14/thread-2/replica.pull-at | none observed |
| c0ab384c91453869000000000000097d | 67.415 | 13.311 | 9.582 | 0.000 | 0.000 | 42.820 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.701 | 22.894 | 0.340 | 1.701 | node-14/thread-3/socket.queue-and-write | driver.publication 2.734ms; driver.publication 2.323ms; driver.publication 1.902ms; driver.publication 1.281ms; driver.publication 1.211ms |
| c0ab384c914538690000000000000318 | 66.973 | 33.324 | 10.107 | 6.201 | 0.000 | 1.204 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.136 | 49.633 | 0.741 | 16.136 | node-14/thread-3/socket.wait-first-byte | driver.publication 4.332ms; driver.publication 1.447ms; driver.publication 1.323ms; driver.publication 1.194ms; driver.expected-state.bind-receipt 1.002ms |
| c0ab384c914538690000000000001ba9 | 66.191 | 55.233 | 3.986 | 6.964 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 66.183 | 1.000 | 0.007 | node-14/thread-2/replica.pull-at | none observed |

## P2 / tail / commit (2606 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.084 | 0.765 | 0.000 | 1.621 | 3.610 | 0.005 | 0.000 | 0.742 | 0.725 | 1.090 | 0.030 | n/a | 0.221 | 5.719 | n/a | n/a | 0.033 | 4.591 | 0.347 | 0.033 |
| p99 | 57.580 | 2.877 | 2.581 | 5.370 | 11.029 | 0.387 | 0.000 | 18.235 | 12.937 | 8.784 | 2.414 | n/a | 3.858 | 32.509 | n/a | n/a | 0.097 | 24.431 | 0.710 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c91453869000000000000182f | 98.273 | 21.973 | 0.019 | 0.000 | 0.379 | 28.774 | 8.472 | 2.809 | n/a | 4.339 | 31.447 | n/a | n/a | 0.060 | 22.372 | 0.228 | 0.060 | node-14/thread-0/socket.wait-first-byte | driver.publication 10.101ms; driver.publication 7.345ms; driver.publication 1.998ms; driver.publication 1.659ms; driver.publication 1.512ms |
| c0ab384c9145386900000000000009d6 | 95.815 | 5.655 | 0.009 | 0.000 | 0.919 | 21.656 | 10.585 | 1.895 | n/a | 0.034 | 54.992 | n/a | n/a | 0.071 | 6.583 | 0.069 | 0.071 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.015ms; driver.publication 1.392ms; driver.expected-state.bind-receipt 1.352ms; driver.expected-state.bind-receipt 1.325ms; driver.publication 1.322ms |
| c0ab384c9145386900000000000009d5 | 92.889 | 11.345 | 0.009 | 0.000 | 0.692 | 10.275 | 14.312 | 14.662 | n/a | 0.162 | 41.353 | n/a | n/a | 0.078 | 12.047 | 0.130 | 0.078 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.015ms; driver.expected-state.bind-receipt 1.325ms; driver.publication 1.322ms; driver.publication 1.114ms; driver.publication 1.050ms |
| c0ab384c91453869000000000000171a | 92.323 | 13.050 | 0.004 | 3.855 | 26.330 | 40.320 | 2.295 | 0.045 | n/a | 2.670 | 3.722 | n/a | n/a | 0.031 | 43.240 | 0.468 | 0.031 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.182ms; driver.publication 2.908ms; client.encode 1.478ms; driver.publication 1.377ms; driver.publication 1.280ms |
| c0ab384c9145386900000000000009d7 | 86.076 | 3.651 | 0.005 | 0.000 | 0.708 | 18.135 | 6.007 | 1.417 | n/a | 0.021 | 56.083 | n/a | n/a | 0.050 | 4.363 | 0.051 | 0.050 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 2.015ms; driver.publication 1.392ms; driver.expected-state.bind-receipt 1.352ms; driver.expected-state.bind-receipt 1.325ms; driver.publication 1.322ms |
| c0ab384c9145386900000000000009d8 | 83.471 | 4.570 | 0.009 | 0.000 | 0.445 | 5.592 | 0.912 | 12.611 | n/a | 0.089 | 59.205 | n/a | n/a | 0.037 | 5.025 | 0.060 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 2.015ms; driver.publication 1.392ms; driver.expected-state.bind-receipt 1.352ms; driver.expected-state.bind-receipt 1.325ms; driver.publication 1.322ms |
| c0ab384c9145386900000000000009d4 | 81.843 | 7.782 | 0.146 | 0.000 | 1.640 | 0.336 | 1.910 | 39.614 | n/a | 2.247 | 28.118 | n/a | n/a | 0.051 | 9.567 | 0.117 | 0.051 | gw-w/thread-43/gateway.commit-order-wait | driver.publication 2.015ms; driver.expected-state.bind-receipt 1.325ms; driver.publication 1.322ms; driver.publication 1.114ms; driver.publication 1.050ms |
| c0ab384c9145386900000000000009da | 77.232 | 2.728 | 0.004 | 0.000 | 1.004 | 0.804 | 1.312 | 10.212 | n/a | 0.042 | 61.097 | n/a | n/a | 0.029 | 3.736 | 0.048 | 0.029 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 2.015ms; driver.publication 1.392ms; driver.expected-state.bind-receipt 1.352ms; driver.expected-state.bind-receipt 1.325ms; driver.publication 1.114ms |
| c0ab384c9145386900000000000011ab | 76.054 | 2.799 | 0.003 | 0.000 | 65.651 | 1.486 | 1.177 | 0.053 | n/a | 0.766 | 4.093 | n/a | n/a | 0.026 | 68.453 | 0.900 | 0.026 | node-14/thread-0/driver.queue.subject | driver.publication 2.371ms; driver.publication 2.027ms; driver.publication 1.680ms; driver.publication 1.339ms; driver.expected-state.bind-receipt 1.339ms |
| c0ab384c9145386900000000000009d2 | 75.953 | 7.705 | 0.010 | 0.000 | 0.230 | 4.902 | 2.401 | 0.039 | n/a | 0.178 | 60.443 | n/a | n/a | 0.044 | 7.945 | 0.105 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.015ms; driver.publication 1.322ms; driver.publication 1.050ms |
| c0ab384c9145386900000000000009dc | 71.796 | 3.952 | 0.006 | 0.000 | 0.863 | 0.801 | 0.786 | 0.025 | n/a | 0.948 | 64.349 | n/a | n/a | 0.066 | 4.821 | 0.067 | 0.066 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 2.015ms; driver.publication 1.392ms; driver.expected-state.bind-receipt 1.352ms; driver.expected-state.bind-receipt 1.325ms; driver.publication 1.176ms |
| c0ab384c9145386900000000000009d3 | 71.398 | 5.254 | 0.007 | 0.000 | 4.224 | 5.196 | 0.868 | 0.016 | n/a | 26.006 | 29.795 | n/a | n/a | 0.031 | 9.485 | 0.133 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.322ms; driver.publication 1.050ms |
| c0ab384c9145386900000000000011a9 | 68.969 | 12.334 | 0.014 | 0.000 | 0.217 | 17.570 | 3.451 | 0.163 | n/a | 4.281 | 30.915 | n/a | n/a | 0.024 | 12.565 | 0.182 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.680ms; driver.publication 1.339ms; driver.expected-state.bind-receipt 1.339ms; driver.publication 1.270ms; driver.publication 1.257ms |
| c0ab384c9145386900000000000009ec | 68.715 | 3.983 | 0.005 | 0.000 | 0.777 | 18.653 | 1.708 | 0.045 | n/a | 3.750 | 39.717 | n/a | n/a | 0.077 | 4.765 | 0.069 | 0.077 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000098b | 67.906 | 11.973 | 0.083 | 0.000 | 3.711 | 11.531 | 5.478 | 0.046 | n/a | 2.917 | 32.141 | n/a | n/a | 0.027 | 15.767 | 0.232 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.734ms; driver.publication 2.206ms; driver.publication 1.902ms; driver.publication 1.580ms; driver.publication 1.518ms |
| c0ab384c914538690000000000001816 | 66.871 | 5.618 | 0.229 | 0.000 | 0.039 | 15.344 | 18.801 | 0.107 | n/a | 2.688 | 24.013 | n/a | n/a | 0.031 | 5.887 | 0.088 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.301ms; driver.publication 1.163ms; driver.publication 1.120ms |
| c0ab384c9145386900000000000009ed | 63.115 | 4.714 | 0.005 | 0.000 | 0.710 | 12.201 | 0.631 | 6.213 | n/a | 0.129 | 38.454 | n/a | n/a | 0.058 | 5.428 | 0.086 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.092ms |
| c0ab384c9145386900000000000012b4 | 62.993 | 2.149 | 0.002 | 0.000 | 1.533 | 8.064 | 1.274 | 0.046 | n/a | 0.166 | 49.739 | n/a | n/a | 0.019 | 3.684 | 0.058 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.281ms |
| c0ab384c914538690000000000001166 | 61.943 | 3.200 | 0.007 | 0.000 | 41.967 | 4.633 | 1.614 | 0.069 | n/a | 0.317 | 10.087 | n/a | n/a | 0.050 | 45.175 | 0.729 | 0.050 | node-14/thread-0/driver.queue.subject | driver.publication 3.358ms; driver.expected-state.bind-receipt 1.791ms; driver.publication 1.674ms; driver.publication 1.511ms; driver.publication 1.506ms |
| c0ab384c9145386900000000000009d0 | 61.762 | 4.557 | 0.010 | 0.000 | 3.277 | 0.712 | 14.618 | 0.037 | n/a | 0.227 | 38.296 | n/a | n/a | 0.027 | 7.844 | 0.127 | 0.027 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 2.486ms |

## P2 / tail / commit / 5-10 facts (1545 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.717 | 0.636 | 0.000 | 1.496 | 3.136 | 0.005 | 0.000 | 0.758 | 0.712 | 0.936 | 0.029 | n/a | 0.221 | 5.288 | n/a | n/a | 0.032 | 4.043 | 0.336 | 0.032 |
| p99 | 60.658 | 2.141 | 2.811 | 5.408 | 9.568 | 0.158 | 0.000 | 19.309 | 15.026 | 5.983 | 2.687 | n/a | 3.958 | 32.862 | n/a | n/a | 0.098 | 24.348 | 0.720 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c0ab384c91453869000000000000182f | 98.273 | 21.973 | 0.019 | 0.000 | 0.379 | 28.774 | 8.472 | 2.809 | n/a | 4.339 | 31.447 | n/a | n/a | 0.060 | 22.372 | 0.228 | 0.060 | node-14/thread-0/socket.wait-first-byte | driver.publication 10.101ms; driver.publication 7.345ms; driver.publication 1.998ms; driver.publication 1.659ms; driver.publication 1.512ms |
| c0ab384c9145386900000000000009d6 | 95.815 | 5.655 | 0.009 | 0.000 | 0.919 | 21.656 | 10.585 | 1.895 | n/a | 0.034 | 54.992 | n/a | n/a | 0.071 | 6.583 | 0.069 | 0.071 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.015ms; driver.publication 1.392ms; driver.expected-state.bind-receipt 1.352ms; driver.expected-state.bind-receipt 1.325ms; driver.publication 1.322ms |
| c0ab384c9145386900000000000009d7 | 86.076 | 3.651 | 0.005 | 0.000 | 0.708 | 18.135 | 6.007 | 1.417 | n/a | 0.021 | 56.083 | n/a | n/a | 0.050 | 4.363 | 0.051 | 0.050 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 2.015ms; driver.publication 1.392ms; driver.expected-state.bind-receipt 1.352ms; driver.expected-state.bind-receipt 1.325ms; driver.publication 1.322ms |
| c0ab384c9145386900000000000009da | 77.232 | 2.728 | 0.004 | 0.000 | 1.004 | 0.804 | 1.312 | 10.212 | n/a | 0.042 | 61.097 | n/a | n/a | 0.029 | 3.736 | 0.048 | 0.029 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 2.015ms; driver.publication 1.392ms; driver.expected-state.bind-receipt 1.352ms; driver.expected-state.bind-receipt 1.325ms; driver.publication 1.114ms |
| c0ab384c9145386900000000000011ab | 76.054 | 2.799 | 0.003 | 0.000 | 65.651 | 1.486 | 1.177 | 0.053 | n/a | 0.766 | 4.093 | n/a | n/a | 0.026 | 68.453 | 0.900 | 0.026 | node-14/thread-0/driver.queue.subject | driver.publication 2.371ms; driver.publication 2.027ms; driver.publication 1.680ms; driver.publication 1.339ms; driver.expected-state.bind-receipt 1.339ms |
| c0ab384c9145386900000000000009dc | 71.796 | 3.952 | 0.006 | 0.000 | 0.863 | 0.801 | 0.786 | 0.025 | n/a | 0.948 | 64.349 | n/a | n/a | 0.066 | 4.821 | 0.067 | 0.066 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 2.015ms; driver.publication 1.392ms; driver.expected-state.bind-receipt 1.352ms; driver.expected-state.bind-receipt 1.325ms; driver.publication 1.176ms |
| c0ab384c9145386900000000000009d3 | 71.398 | 5.254 | 0.007 | 0.000 | 4.224 | 5.196 | 0.868 | 0.016 | n/a | 26.006 | 29.795 | n/a | n/a | 0.031 | 9.485 | 0.133 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.322ms; driver.publication 1.050ms |
| c0ab384c9145386900000000000011a9 | 68.969 | 12.334 | 0.014 | 0.000 | 0.217 | 17.570 | 3.451 | 0.163 | n/a | 4.281 | 30.915 | n/a | n/a | 0.024 | 12.565 | 0.182 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.680ms; driver.publication 1.339ms; driver.expected-state.bind-receipt 1.339ms; driver.publication 1.270ms; driver.publication 1.257ms |
| c0ab384c9145386900000000000009ec | 68.715 | 3.983 | 0.005 | 0.000 | 0.777 | 18.653 | 1.708 | 0.045 | n/a | 3.750 | 39.717 | n/a | n/a | 0.077 | 4.765 | 0.069 | 0.077 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c0ab384c91453869000000000000098b | 67.906 | 11.973 | 0.083 | 0.000 | 3.711 | 11.531 | 5.478 | 0.046 | n/a | 2.917 | 32.141 | n/a | n/a | 0.027 | 15.767 | 0.232 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.734ms; driver.publication 2.206ms; driver.publication 1.902ms; driver.publication 1.580ms; driver.publication 1.518ms |
| c0ab384c9145386900000000000009ed | 63.115 | 4.714 | 0.005 | 0.000 | 0.710 | 12.201 | 0.631 | 6.213 | n/a | 0.129 | 38.454 | n/a | n/a | 0.058 | 5.428 | 0.086 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.092ms |
| c0ab384c9145386900000000000012b4 | 62.993 | 2.149 | 0.002 | 0.000 | 1.533 | 8.064 | 1.274 | 0.046 | n/a | 0.166 | 49.739 | n/a | n/a | 0.019 | 3.684 | 0.058 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.281ms |
| c0ab384c914538690000000000001166 | 61.943 | 3.200 | 0.007 | 0.000 | 41.967 | 4.633 | 1.614 | 0.069 | n/a | 0.317 | 10.087 | n/a | n/a | 0.050 | 45.175 | 0.729 | 0.050 | node-14/thread-0/driver.queue.subject | driver.publication 3.358ms; driver.expected-state.bind-receipt 1.791ms; driver.publication 1.674ms; driver.publication 1.511ms; driver.publication 1.506ms |
| c0ab384c9145386900000000000009d0 | 61.762 | 4.557 | 0.010 | 0.000 | 3.277 | 0.712 | 14.618 | 0.037 | n/a | 0.227 | 38.296 | n/a | n/a | 0.027 | 7.844 | 0.127 | 0.027 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 2.486ms |
| c0ab384c914538690000000000001721 | 60.874 | 3.463 | 0.009 | 0.000 | 38.110 | 6.688 | 1.521 | 0.047 | n/a | 0.151 | 10.851 | n/a | n/a | 0.035 | 41.582 | 0.683 | 0.035 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.908ms; client.encode 1.478ms; driver.publication 1.377ms; driver.publication 1.280ms; driver.publication 1.249ms |
| c0ab384c914538690000000000000f02 | 60.658 | 4.026 | 0.001 | 0.000 | 0.483 | 1.111 | 1.656 | 0.931 | n/a | 0.283 | 52.147 | n/a | n/a | 0.020 | 4.510 | 0.074 | 0.020 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.103ms; driver.publication 1.033ms |
| c0ab384c914538690000000000001831 | 60.272 | 9.568 | 0.004 | 0.000 | 7.080 | 5.240 | 1.906 | 6.280 | n/a | 0.313 | 29.834 | n/a | n/a | 0.047 | 16.652 | 0.276 | 0.047 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 10.101ms; driver.publication 1.307ms |
| c0ab384c9145386900000000000009d1 | 60.047 | 3.617 | 0.005 | 0.000 | 0.400 | 0.927 | 1.115 | 0.028 | n/a | 1.240 | 52.664 | n/a | n/a | 0.051 | 4.022 | 0.067 | 0.051 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.322ms |
| c0ab384c914538690000000000001830 | 54.646 | 14.203 | 0.010 | 0.000 | 1.071 | 4.988 | 2.489 | 0.058 | n/a | 4.593 | 27.195 | n/a | n/a | 0.039 | 15.284 | 0.280 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.307ms |
| c0ab384c914538690000000000000ced | 54.354 | 3.823 | 0.007 | 0.000 | 31.421 | 0.654 | 1.629 | 0.043 | n/a | 0.177 | 16.575 | n/a | n/a | 0.026 | 35.251 | 0.649 | 0.026 | node-14/thread-0/driver.queue.subject | driver.publication 1.325ms; driver.publication 1.207ms; driver.publication 1.072ms |

## P3 / outside-phases / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.935 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.590 | 201.048 | 0.012 | n/a | 0.075 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 |
| p99 | 207.340 | n/a | n/a | n/a | 23.085 | n/a | 1.592 | 0.000 | 5.733 | 202.187 | 0.105 | n/a | 0.266 | 0.000 | n/a | n/a | 0.335 | 24.676 | 0.271 | 0.335 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6c8640c03ce098f0000000000000002 | 207.340 | 2.666 | n/a | 0.000 | 0.000 | 3.085 | 201.052 | 0.105 | n/a | 0.108 | 0.000 | n/a | n/a | 0.324 | 2.666 | 0.013 | 0.324 | gw-r/thread-47/gateway.admitted-work | none observed |
| 7447723b896198580000000000000007 | 206.897 | 0.000 | n/a | 0.000 | 0.000 | 4.722 | 201.651 | 0.018 | n/a | 0.171 | 0.000 | n/a | n/a | 0.335 | 0.000 | 0.000 | 0.335 | gw-r/thread-46/journal/page | none observed |
| 7447723b896198580000000000000005 | 204.533 | 0.000 | n/a | 0.000 | 0.000 | 1.893 | 202.187 | 0.060 | n/a | 0.201 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-48/journal/page | none observed |
| 7447723b896198580000000000000006 | 203.684 | 0.000 | n/a | 0.000 | 0.000 | 1.375 | 201.720 | 0.022 | n/a | 0.266 | 0.000 | n/a | n/a | 0.300 | 0.000 | 0.000 | 0.300 | gw-r/thread-44/journal/page | none observed |
| 7447723b896198580000000000000008 | 203.204 | 0.000 | n/a | 0.000 | 0.000 | 1.590 | 201.275 | 0.012 | n/a | 0.176 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-44/journal/page | none observed |
| 7447723b896198580000000000000f1d | 202.271 | 0.000 | n/a | 0.000 | 0.000 | 0.531 | 201.433 | 0.015 | n/a | 0.088 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-49/journal/page | none observed |
| 7447723b896198580000000000000f1e | 201.935 | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 201.048 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000f1f | 201.670 | 0.000 | n/a | 0.000 | 0.000 | 0.682 | 200.813 | 0.004 | n/a | 0.063 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-46/journal/page | none observed |
| 7447723b896198580000000000000f1c | 201.201 | 0.000 | n/a | 0.000 | 0.000 | 0.458 | 200.601 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000f22 | 91.077 | 23.085 | n/a | 1.591 | 0.000 | 5.733 | 60.483 | 0.004 | n/a | 0.007 | 0.000 | n/a | n/a | 0.174 | 24.676 | 0.271 | 0.174 | gw-r/thread-68/gateway.admitted-work | none observed |
| 7447723b896198580000000000000f23 | 79.362 | 20.527 | n/a | 0.000 | 0.000 | 4.634 | 53.891 | 0.010 | n/a | 0.015 | 0.000 | n/a | n/a | 0.284 | 20.527 | 0.259 | 0.284 | gw-r/thread-48/gateway.admitted-work | none observed |
| 7447723b896198580000000000000f24 | 73.315 | 15.526 | n/a | 1.592 | 0.000 | 2.504 | 53.498 | 0.013 | n/a | 0.007 | 0.000 | n/a | n/a | 0.177 | 17.117 | 0.233 | 0.177 | gw-r/thread-68/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 814.915 | n/a | n/a | n/a | 0.458 | n/a | 0.000 | 0.000 | 1.204 | 796.320 | 0.036 | n/a | 0.142 | 0.000 | n/a | n/a | 1.433 | 0.458 | 0.000 | 1.433 |
| p99 | 1006.668 | n/a | n/a | n/a | 15.458 | n/a | 0.000 | 0.000 | 2.006 | 1002.303 | 0.230 | n/a | 0.432 | 0.000 | n/a | n/a | 1.561 | 15.458 | 0.019 | 1.561 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6c8640c03ce098f00000000000000a4 | 1006.668 | 0.458 | n/a | 0.000 | 0.000 | 2.006 | 1002.303 | 0.036 | n/a | 0.432 | 0.000 | n/a | n/a | 1.433 | 0.458 | 0.000 | 1.433 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f00000000000000a5 | 814.915 | 15.458 | n/a | 0.000 | 0.000 | 1.204 | 796.320 | 0.230 | n/a | 0.142 | 0.000 | n/a | n/a | 1.561 | 15.458 | 0.019 | 1.561 | gw-r/thread-50/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 497.229 | n/a | n/a | n/a | 3.052 | n/a | 0.000 | 0.000 | 0.765 | 493.293 | 0.017 | n/a | 0.092 | 0.000 | n/a | n/a | 0.118 | 3.052 | 0.007 | 0.118 |
| p99 | 1003.883 | n/a | n/a | n/a | 10.444 | n/a | 0.000 | 0.000 | 4.030 | 1000.837 | 0.160 | n/a | 0.250 | 0.000 | n/a | n/a | 4.254 | 10.444 | 0.614 | 4.254 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6c8640c03ce098f00000000000000bb | 1003.883 | 0.220 | n/a | 0.000 | 0.000 | 0.737 | 1000.837 | 0.012 | n/a | 0.092 | 0.000 | n/a | n/a | 1.985 | 0.220 | 0.000 | 1.985 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f00000000000000d0 | 1003.703 | 0.126 | n/a | 0.000 | 0.000 | 1.606 | 1000.774 | 0.015 | n/a | 0.078 | 0.000 | n/a | n/a | 1.104 | 0.126 | 0.000 | 1.104 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f00000000000000ba | 993.042 | 4.995 | n/a | 0.000 | 0.000 | 1.975 | 985.872 | 0.015 | n/a | 0.094 | 0.000 | n/a | n/a | 0.091 | 4.995 | 0.005 | 0.091 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f00000000000000b4 | 986.786 | 3.052 | n/a | 0.000 | 0.000 | 0.753 | 982.612 | 0.157 | n/a | 0.101 | 0.000 | n/a | n/a | 0.111 | 3.052 | 0.003 | 0.111 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f00000000000000ae | 854.302 | 4.102 | n/a | 0.000 | 0.000 | 1.090 | 848.578 | 0.047 | n/a | 0.250 | 0.000 | n/a | n/a | 0.236 | 4.102 | 0.005 | 0.236 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f00000000000000b2 | 811.042 | 4.409 | n/a | 0.000 | 0.000 | 0.765 | 805.579 | 0.011 | n/a | 0.076 | 0.000 | n/a | n/a | 0.201 | 4.409 | 0.005 | 0.201 | gw-r/thread-44/journal/page | none observed |
| f6c8640c03ce098f00000000000000c9 | 772.264 | 2.564 | n/a | 0.000 | 0.000 | 4.030 | 765.488 | 0.016 | n/a | 0.083 | 0.000 | n/a | n/a | 0.083 | 2.564 | 0.003 | 0.083 | gw-r/thread-50/journal/page | none observed |
| f6c8640c03ce098f00000000000000c0 | 747.356 | 2.334 | n/a | 0.000 | 0.000 | 0.536 | 744.259 | 0.025 | n/a | 0.117 | 0.000 | n/a | n/a | 0.085 | 2.334 | 0.003 | 0.085 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f00000000000000c6 | 728.621 | 2.597 | n/a | 0.000 | 0.000 | 0.679 | 725.022 | 0.111 | n/a | 0.130 | 0.000 | n/a | n/a | 0.082 | 2.597 | 0.004 | 0.082 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f00000000000000ab | 685.977 | 3.271 | n/a | 0.000 | 0.000 | 0.710 | 681.708 | 0.012 | n/a | 0.167 | 0.000 | n/a | n/a | 0.109 | 3.271 | 0.005 | 0.109 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f00000000000000c2 | 647.796 | 7.349 | n/a | 0.000 | 0.000 | 0.579 | 639.703 | 0.009 | n/a | 0.029 | 0.000 | n/a | n/a | 0.126 | 7.349 | 0.011 | 0.126 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f00000000000000a8 | 635.273 | 2.401 | n/a | 0.000 | 0.000 | 0.553 | 632.103 | 0.022 | n/a | 0.082 | 0.000 | n/a | n/a | 0.112 | 2.401 | 0.004 | 0.112 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f00000000000000a6 | 555.112 | 3.107 | n/a | 0.000 | 0.000 | 0.913 | 550.862 | 0.012 | n/a | 0.090 | 0.000 | n/a | n/a | 0.128 | 3.107 | 0.006 | 0.128 | gw-r/thread-44/journal/page | none observed |
| f6c8640c03ce098f00000000000000cb | 497.604 | 2.401 | n/a | 0.000 | 0.000 | 0.605 | 494.409 | 0.019 | n/a | 0.088 | 0.000 | n/a | n/a | 0.082 | 2.401 | 0.005 | 0.082 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f00000000000000b8 | 497.229 | 2.998 | n/a | 0.000 | 0.000 | 0.757 | 493.293 | 0.014 | n/a | 0.085 | 0.000 | n/a | n/a | 0.082 | 2.998 | 0.006 | 0.082 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f00000000000000b6 | 433.440 | 2.847 | n/a | 0.000 | 0.000 | 0.852 | 429.504 | 0.020 | n/a | 0.124 | 0.000 | n/a | n/a | 0.094 | 2.847 | 0.007 | 0.094 | gw-r/thread-50/journal/page | none observed |
| f6c8640c03ce098f00000000000000c4 | 351.198 | 2.697 | n/a | 0.000 | 0.000 | 3.085 | 345.213 | 0.021 | n/a | 0.092 | 0.000 | n/a | n/a | 0.091 | 2.697 | 0.008 | 0.091 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f00000000000000a9 | 343.212 | 3.535 | n/a | 0.000 | 0.000 | 0.768 | 338.611 | 0.014 | n/a | 0.116 | 0.000 | n/a | n/a | 0.168 | 3.535 | 0.010 | 0.168 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f00000000000000ac | 314.802 | 3.477 | n/a | 0.000 | 0.000 | 0.819 | 310.122 | 0.024 | n/a | 0.145 | 0.000 | n/a | n/a | 0.215 | 3.477 | 0.011 | 0.215 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f00000000000000c5 | 273.669 | 4.114 | n/a | 0.000 | 0.000 | 0.645 | 268.704 | 0.017 | n/a | 0.059 | 0.000 | n/a | n/a | 0.130 | 4.114 | 0.015 | 0.130 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 362.390 | n/a | n/a | n/a | 4.332 | n/a | 0.522 | 0.000 | 0.729 | 358.225 | 0.015 | n/a | 0.083 | 0.000 | n/a | n/a | 0.116 | 4.906 | 0.012 | 0.116 |
| p99 | 1003.829 | n/a | n/a | n/a | 12.793 | n/a | 1.955 | 0.000 | 2.214 | 1001.292 | 1.378 | n/a | 0.143 | 0.000 | n/a | n/a | 37.428 | 14.531 | 0.806 | 37.428 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6c8640c03ce098f0000000000000102 | 1003.829 | 0.279 | n/a | 0.000 | 0.000 | 0.910 | 1001.292 | 0.014 | n/a | 0.143 | 0.000 | n/a | n/a | 1.192 | 0.279 | 0.000 | 1.192 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f00000000000000d3 | 1003.186 | 0.132 | n/a | 0.000 | 0.000 | 0.733 | 1001.052 | 0.017 | n/a | 0.141 | 0.000 | n/a | n/a | 1.111 | 0.132 | 0.000 | 1.111 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f0000000000000107 | 1000.364 | 3.621 | n/a | 0.533 | 0.000 | 0.629 | 995.388 | 0.013 | n/a | 0.072 | 0.000 | n/a | n/a | 0.107 | 4.154 | 0.004 | 0.107 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f00000000000000da | 999.410 | 5.303 | n/a | 0.977 | 0.000 | 0.954 | 991.966 | 0.014 | n/a | 0.090 | 0.000 | n/a | n/a | 0.107 | 6.280 | 0.006 | 0.107 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f000000000000010f | 992.584 | 2.725 | n/a | 0.000 | 0.000 | 2.214 | 987.513 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.076 | 2.725 | 0.003 | 0.076 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f00000000000000e0 | 991.499 | 5.313 | n/a | 0.606 | 0.000 | 0.608 | 983.326 | 1.378 | n/a | 0.059 | 0.000 | n/a | n/a | 0.208 | 5.918 | 0.006 | 0.208 | gw-r/thread-44/journal/page | none observed |
| f6c8640c03ce098f00000000000000df | 989.016 | 6.517 | n/a | 0.743 | 0.000 | 0.801 | 980.562 | 0.102 | n/a | 0.092 | 0.000 | n/a | n/a | 0.199 | 7.260 | 0.007 | 0.199 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f00000000000000d2 | 987.504 | 5.713 | n/a | 0.990 | 0.000 | 1.432 | 978.816 | 0.366 | n/a | 0.078 | 0.000 | n/a | n/a | 0.109 | 6.702 | 0.007 | 0.109 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f00000000000000e5 | 986.379 | 3.347 | n/a | 0.472 | 0.000 | 0.872 | 981.088 | 0.425 | n/a | 0.074 | 0.000 | n/a | n/a | 0.102 | 3.819 | 0.004 | 0.102 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f00000000000000db | 968.070 | 4.332 | n/a | 0.575 | 0.000 | 0.686 | 962.167 | 0.020 | n/a | 0.108 | 0.000 | n/a | n/a | 0.182 | 4.906 | 0.005 | 0.182 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f00000000000000ff | 819.194 | 5.743 | n/a | 0.638 | 0.000 | 0.837 | 811.264 | 0.490 | n/a | 0.101 | 0.000 | n/a | n/a | 0.121 | 6.381 | 0.008 | 0.121 | gw-r/thread-44/journal/page | none observed |
| f6c8640c03ce098f00000000000000e1 | 653.607 | 7.538 | n/a | 0.649 | 0.000 | 0.925 | 644.252 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.170 | 8.187 | 0.013 | 0.170 | gw-r/thread-50/journal/page | none observed |
| f6c8640c03ce098f00000000000000de | 631.255 | 3.093 | n/a | 0.477 | 0.000 | 0.542 | 626.989 | 0.018 | n/a | 0.060 | 0.000 | n/a | n/a | 0.077 | 3.570 | 0.006 | 0.077 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f0000000000000104 | 625.583 | 2.671 | n/a | 0.533 | 0.000 | 0.667 | 621.478 | 0.033 | n/a | 0.094 | 0.000 | n/a | n/a | 0.105 | 3.204 | 0.005 | 0.105 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f00000000000000fd | 582.889 | 2.974 | n/a | 0.000 | 0.000 | 0.729 | 578.992 | 0.015 | n/a | 0.110 | 0.000 | n/a | n/a | 0.070 | 2.974 | 0.005 | 0.070 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f00000000000000e8 | 576.359 | 12.496 | n/a | 1.955 | 0.000 | 0.911 | 560.774 | 0.013 | n/a | 0.087 | 0.000 | n/a | n/a | 0.123 | 14.451 | 0.025 | 0.123 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f00000000000000ec | 501.523 | 4.375 | n/a | 0.000 | 0.000 | 0.613 | 496.363 | 0.014 | n/a | 0.070 | 0.000 | n/a | n/a | 0.089 | 4.375 | 0.009 | 0.089 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f0000000000000109 | 456.212 | 10.365 | n/a | 0.522 | 0.000 | 0.487 | 444.649 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.121 | 10.887 | 0.024 | 0.121 | gw-r/thread-44/journal/page | none observed |
| f6c8640c03ce098f00000000000000d6 | 446.651 | 4.317 | n/a | 0.851 | 0.000 | 0.892 | 440.376 | 0.013 | n/a | 0.110 | 0.000 | n/a | n/a | 0.092 | 5.167 | 0.012 | 0.092 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f00000000000000fc | 418.962 | 5.016 | n/a | 0.000 | 0.000 | 1.625 | 412.107 | 0.009 | n/a | 0.125 | 0.000 | n/a | n/a | 0.079 | 5.016 | 0.012 | 0.079 | gw-r/thread-49/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 473.205 | n/a | n/a | n/a | 3.978 | n/a | 0.000 | 0.000 | 0.714 | 466.867 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.108 | 4.237 | 0.011 | 0.108 |
| p99 | 1006.980 | n/a | n/a | n/a | 13.072 | n/a | 1.004 | 0.000 | 8.749 | 1001.885 | 1.991 | n/a | 0.216 | 0.000 | n/a | n/a | 48.510 | 13.817 | 0.399 | 48.510 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6c8640c03ce098f000000000000012b | 1006.980 | 4.060 | n/a | 0.000 | 0.000 | 0.734 | 1001.885 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.243 | 4.060 | 0.004 | 0.243 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f0000000000000138 | 1002.881 | 0.204 | n/a | 0.000 | 0.000 | 0.715 | 1000.788 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 1.112 | 0.204 | 0.000 | 1.112 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f0000000000000116 | 994.756 | 3.204 | n/a | 0.734 | 0.000 | 0.812 | 989.849 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.107 | 3.938 | 0.004 | 0.107 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f000000000000012c | 993.164 | 3.692 | n/a | 0.000 | 0.000 | 0.647 | 988.699 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.083 | 3.692 | 0.004 | 0.083 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f000000000000011e | 992.120 | 3.978 | n/a | 0.693 | 0.000 | 0.891 | 986.393 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.122 | 4.670 | 0.005 | 0.122 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f0000000000000142 | 990.779 | 3.458 | n/a | 0.000 | 0.000 | 0.590 | 986.601 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.079 | 3.458 | 0.003 | 0.079 | gw-r/thread-50/journal/page | none observed |
| f6c8640c03ce098f0000000000000127 | 990.568 | 4.335 | n/a | 0.000 | 0.000 | 0.603 | 984.885 | 0.608 | n/a | 0.055 | 0.000 | n/a | n/a | 0.081 | 4.335 | 0.004 | 0.081 | gw-r/thread-44/journal/page | none observed |
| f6c8640c03ce098f0000000000000133 | 920.245 | 2.972 | n/a | 0.000 | 0.000 | 0.669 | 916.481 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.085 | 2.972 | 0.003 | 0.085 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f0000000000000149 | 897.174 | 3.509 | n/a | 0.676 | 0.000 | 0.534 | 892.281 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.129 | 4.184 | 0.005 | 0.129 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f0000000000000125 | 854.174 | 4.426 | n/a | 0.000 | 0.000 | 1.188 | 848.322 | 0.051 | n/a | 0.082 | 0.000 | n/a | n/a | 0.105 | 4.426 | 0.005 | 0.105 | gw-r/thread-44/journal/page | none observed |
| f6c8640c03ce098f000000000000012e | 790.147 | 2.959 | n/a | 0.000 | 0.000 | 0.636 | 786.419 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.081 | 2.959 | 0.004 | 0.081 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f000000000000013e | 775.329 | 3.971 | n/a | 0.000 | 0.000 | 0.617 | 770.558 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.116 | 3.971 | 0.005 | 0.116 | gw-r/thread-50/journal/page | none observed |
| f6c8640c03ce098f0000000000000113 | 664.875 | 2.534 | n/a | 0.567 | 0.000 | 8.749 | 652.853 | 0.012 | n/a | 0.053 | 0.000 | n/a | n/a | 0.106 | 3.100 | 0.005 | 0.106 | gw-r/thread-44/journal/page | none observed |
| f6c8640c03ce098f0000000000000128 | 601.149 | 10.831 | n/a | 0.688 | 0.000 | 0.868 | 588.509 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.172 | 11.519 | 0.019 | 0.172 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f000000000000013b | 592.874 | 5.010 | n/a | 0.000 | 0.000 | 1.075 | 586.632 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.070 | 5.010 | 0.008 | 0.070 | gw-r/thread-50/journal/page | none observed |
| f6c8640c03ce098f000000000000011f | 586.162 | 4.702 | n/a | 0.000 | 0.000 | 0.837 | 580.089 | 0.364 | n/a | 0.046 | 0.000 | n/a | n/a | 0.124 | 4.702 | 0.008 | 0.124 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f000000000000011c | 542.123 | 6.529 | n/a | 0.000 | 0.000 | 0.760 | 534.558 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.204 | 6.529 | 0.012 | 0.204 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f0000000000000110 | 530.379 | 5.595 | n/a | 0.628 | 0.000 | 0.556 | 523.242 | 0.097 | n/a | 0.043 | 0.000 | n/a | n/a | 0.218 | 6.223 | 0.012 | 0.218 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f0000000000000112 | 487.146 | 5.373 | n/a | 0.000 | 0.000 | 0.753 | 479.812 | 0.872 | n/a | 0.071 | 0.000 | n/a | n/a | 0.265 | 5.373 | 0.011 | 0.265 | gw-r/thread-44/journal/page | none observed |
| f6c8640c03ce098f0000000000000135 | 486.571 | 7.928 | n/a | 1.004 | 0.000 | 1.344 | 475.906 | 0.168 | n/a | 0.066 | 0.000 | n/a | n/a | 0.154 | 8.932 | 0.018 | 0.154 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 384.533 | n/a | n/a | n/a | 3.516 | n/a | 0.000 | 0.000 | 0.715 | 375.969 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.119 | 3.516 | 0.010 | 0.119 |
| p99 | 1004.791 | n/a | n/a | n/a | 6.988 | n/a | 0.904 | 0.000 | 4.850 | 1001.102 | 1.800 | n/a | 0.086 | 0.000 | n/a | n/a | 42.359 | 7.007 | 0.731 | 42.359 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6c8640c03ce098f0000000000000175 | 1004.791 | 0.136 | n/a | 0.000 | 0.000 | 2.322 | 1001.102 | 0.012 | n/a | 0.086 | 0.000 | n/a | n/a | 1.133 | 0.136 | 0.000 | 1.133 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f0000000000000187 | 1002.777 | 0.143 | n/a | 0.000 | 0.000 | 0.723 | 1000.737 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 1.114 | 0.143 | 0.000 | 1.114 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f0000000000000165 | 1002.625 | 0.119 | n/a | 0.000 | 0.000 | 0.583 | 1000.758 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 1.109 | 0.119 | 0.000 | 1.109 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f0000000000000186 | 1002.290 | 3.877 | n/a | 0.000 | 0.000 | 2.975 | 995.165 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.215 | 3.877 | 0.004 | 0.215 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f0000000000000180 | 1000.715 | 2.855 | n/a | 0.000 | 0.000 | 0.520 | 997.230 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.070 | 2.855 | 0.003 | 0.070 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f0000000000000155 | 998.322 | 3.411 | n/a | 0.000 | 0.000 | 3.809 | 990.930 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.078 | 3.411 | 0.003 | 0.078 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f000000000000016f | 986.984 | 3.899 | n/a | 0.000 | 0.000 | 0.620 | 982.319 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.101 | 3.899 | 0.004 | 0.101 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f000000000000017b | 957.518 | 3.516 | n/a | 0.000 | 0.000 | 0.630 | 953.089 | 0.136 | n/a | 0.031 | 0.000 | n/a | n/a | 0.116 | 3.516 | 0.004 | 0.116 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f000000000000015b | 838.849 | 4.157 | n/a | 0.000 | 0.000 | 0.557 | 833.986 | 0.010 | n/a | 0.051 | 0.000 | n/a | n/a | 0.089 | 4.157 | 0.005 | 0.089 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f000000000000016e | 818.256 | 6.986 | n/a | 0.000 | 0.000 | 1.557 | 809.414 | 0.018 | n/a | 0.054 | 0.000 | n/a | n/a | 0.227 | 6.986 | 0.009 | 0.227 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f0000000000000184 | 796.683 | 4.487 | n/a | 0.000 | 0.000 | 0.763 | 791.208 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.173 | 4.487 | 0.006 | 0.173 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f0000000000000178 | 756.487 | 3.176 | n/a | 0.000 | 0.000 | 0.477 | 752.561 | 0.152 | n/a | 0.035 | 0.000 | n/a | n/a | 0.085 | 3.176 | 0.004 | 0.085 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f000000000000018a | 755.459 | 6.103 | n/a | 0.904 | 0.000 | 0.445 | 747.798 | 0.012 | n/a | 0.049 | 0.000 | n/a | n/a | 0.147 | 7.007 | 0.009 | 0.147 | gw-r/thread-50/journal/page | none observed |
| f6c8640c03ce098f000000000000017e | 739.298 | 3.056 | n/a | 0.000 | 0.000 | 0.572 | 735.488 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.141 | 3.056 | 0.004 | 0.141 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f0000000000000171 | 659.456 | 2.493 | n/a | 0.000 | 0.000 | 0.509 | 656.347 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.071 | 2.493 | 0.004 | 0.071 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f0000000000000156 | 588.013 | 4.456 | n/a | 0.000 | 0.000 | 0.722 | 582.622 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.150 | 4.456 | 0.008 | 0.150 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f0000000000000154 | 544.570 | 3.041 | n/a | 0.000 | 0.000 | 0.599 | 540.786 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.102 | 3.041 | 0.006 | 0.102 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f0000000000000168 | 519.797 | 4.146 | n/a | 0.000 | 0.000 | 1.271 | 512.357 | 1.800 | n/a | 0.080 | 0.000 | n/a | n/a | 0.143 | 4.146 | 0.008 | 0.143 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f0000000000000163 | 451.314 | 3.669 | n/a | 0.000 | 0.000 | 0.640 | 446.854 | 0.014 | n/a | 0.057 | 0.000 | n/a | n/a | 0.081 | 3.669 | 0.008 | 0.081 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f000000000000014e | 451.186 | 4.745 | n/a | 0.000 | 0.000 | 3.940 | 442.276 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.184 | 4.745 | 0.011 | 0.184 | gw-r/thread-50/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 341.630 | n/a | n/a | n/a | 3.955 | n/a | 0.000 | 0.000 | 0.617 | 332.778 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 0.094 | 4.051 | 0.014 | 0.094 |
| p99 | 1006.249 | n/a | n/a | n/a | 13.506 | n/a | 1.103 | 0.000 | 4.625 | 1000.955 | 4.005 | n/a | 0.076 | 0.000 | n/a | n/a | 43.047 | 14.608 | 0.691 | 43.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6c8640c03ce098f00000000000001c5 | 1006.249 | 5.654 | n/a | 0.000 | 0.000 | 0.813 | 999.525 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.171 | 5.654 | 0.006 | 0.171 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f00000000000001a7 | 1002.869 | 0.145 | n/a | 0.000 | 0.000 | 0.569 | 1000.955 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 1.134 | 0.145 | 0.000 | 1.134 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f000000000000018c | 999.274 | 3.432 | n/a | 0.000 | 0.000 | 0.952 | 994.640 | 0.111 | n/a | 0.036 | 0.000 | n/a | n/a | 0.103 | 3.432 | 0.003 | 0.103 | gw-r/thread-50/journal/page | none observed |
| f6c8640c03ce098f00000000000001c6 | 995.910 | 5.396 | n/a | 0.000 | 0.000 | 0.636 | 989.610 | 0.133 | n/a | 0.039 | 0.000 | n/a | n/a | 0.096 | 5.396 | 0.005 | 0.096 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f00000000000001a6 | 995.393 | 2.850 | n/a | 0.000 | 0.000 | 0.865 | 991.531 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.093 | 2.850 | 0.003 | 0.093 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f00000000000001a9 | 976.279 | 3.269 | n/a | 1.082 | 0.000 | 0.523 | 971.209 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.143 | 4.351 | 0.004 | 0.143 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f00000000000001c3 | 949.309 | 2.961 | n/a | 0.000 | 0.000 | 0.773 | 945.447 | 0.011 | n/a | 0.045 | 0.000 | n/a | n/a | 0.072 | 2.961 | 0.003 | 0.072 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f000000000000019b | 893.676 | 3.269 | n/a | 0.000 | 0.000 | 3.652 | 886.582 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.119 | 3.269 | 0.004 | 0.119 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f00000000000001b7 | 830.233 | 2.846 | n/a | 0.000 | 0.000 | 0.572 | 826.689 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.075 | 2.846 | 0.003 | 0.075 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f00000000000001cf | 744.128 | 6.756 | n/a | 0.000 | 0.000 | 0.678 | 736.570 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.087 | 6.756 | 0.009 | 0.087 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f000000000000019e | 705.494 | 5.503 | n/a | 0.000 | 0.000 | 0.655 | 699.139 | 0.013 | n/a | 0.063 | 0.000 | n/a | n/a | 0.122 | 5.503 | 0.008 | 0.122 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f000000000000019a | 640.309 | 2.831 | n/a | 0.000 | 0.000 | 0.702 | 636.631 | 0.017 | n/a | 0.063 | 0.000 | n/a | n/a | 0.065 | 2.831 | 0.004 | 0.065 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f00000000000001bb | 591.506 | 3.955 | n/a | 0.000 | 0.000 | 0.754 | 586.447 | 0.165 | n/a | 0.063 | 0.000 | n/a | n/a | 0.122 | 3.955 | 0.007 | 0.122 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f00000000000001d6 | 584.190 | 4.509 | n/a | 0.000 | 0.000 | 0.697 | 578.803 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.137 | 4.509 | 0.008 | 0.137 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f00000000000001d3 | 526.394 | 3.329 | n/a | 0.000 | 0.000 | 0.754 | 522.165 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.085 | 3.329 | 0.006 | 0.085 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f00000000000001a1 | 487.571 | 6.280 | n/a | 0.000 | 0.000 | 0.509 | 480.643 | 0.011 | n/a | 0.032 | 0.000 | n/a | n/a | 0.097 | 6.280 | 0.013 | 0.097 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f00000000000001af | 465.311 | 4.764 | n/a | 0.000 | 0.000 | 1.130 | 459.262 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.084 | 4.764 | 0.010 | 0.084 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f00000000000001d4 | 460.851 | 6.435 | n/a | 0.000 | 0.000 | 1.359 | 452.813 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.195 | 6.435 | 0.014 | 0.195 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f00000000000001c7 | 454.716 | 4.318 | n/a | 0.000 | 0.000 | 0.938 | 449.327 | 0.010 | n/a | 0.039 | 0.000 | n/a | n/a | 0.083 | 4.318 | 0.009 | 0.083 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f00000000000001a2 | 440.086 | 2.978 | n/a | 0.000 | 0.000 | 0.976 | 435.975 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.088 | 2.978 | 0.007 | 0.088 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 441.639 | n/a | n/a | n/a | 3.338 | n/a | 0.000 | 0.000 | 0.605 | 436.166 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.114 | 3.338 | 0.009 | 0.114 |
| p99 | 1003.849 | n/a | n/a | n/a | 12.840 | n/a | 0.000 | 0.000 | 2.906 | 1000.550 | 1.981 | n/a | 0.083 | 0.000 | n/a | n/a | 32.063 | 12.840 | 0.632 | 32.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6c8640c03ce098f0000000000000217 | 1003.849 | 0.165 | n/a | 0.000 | 0.000 | 1.943 | 1000.550 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 1.136 | 0.165 | 0.000 | 1.136 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f0000000000000219 | 1000.785 | 2.659 | n/a | 0.000 | 0.000 | 0.416 | 997.448 | 0.017 | n/a | 0.076 | 0.000 | n/a | n/a | 0.168 | 2.659 | 0.003 | 0.168 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f00000000000001ff | 997.129 | 3.338 | n/a | 0.000 | 0.000 | 0.446 | 993.064 | 0.116 | n/a | 0.055 | 0.000 | n/a | n/a | 0.109 | 3.338 | 0.003 | 0.109 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f00000000000001f9 | 997.000 | 2.795 | n/a | 0.000 | 0.000 | 0.400 | 993.696 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.071 | 2.795 | 0.003 | 0.071 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f0000000000000212 | 992.815 | 2.982 | n/a | 0.000 | 0.000 | 0.560 | 989.108 | 0.011 | n/a | 0.040 | 0.000 | n/a | n/a | 0.114 | 2.982 | 0.003 | 0.114 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f0000000000000216 | 992.547 | 5.173 | n/a | 0.000 | 0.000 | 0.817 | 986.164 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.315 | 5.173 | 0.005 | 0.315 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f0000000000000208 | 972.252 | 3.318 | n/a | 0.000 | 0.000 | 0.469 | 968.293 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.125 | 3.318 | 0.003 | 0.125 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f00000000000001eb | 960.571 | 4.602 | n/a | 0.000 | 0.000 | 0.802 | 955.015 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.081 | 4.602 | 0.005 | 0.081 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f0000000000000213 | 881.838 | 12.840 | n/a | 0.000 | 0.000 | 0.708 | 868.092 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.152 | 12.840 | 0.015 | 0.152 | gw-r/thread-50/journal/page | none observed |
| f6c8640c03ce098f00000000000001e9 | 876.627 | 3.240 | n/a | 0.000 | 0.000 | 0.614 | 872.624 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.083 | 3.240 | 0.004 | 0.083 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f00000000000001f5 | 868.319 | 7.780 | n/a | 0.000 | 0.000 | 0.797 | 859.613 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 0.076 | 7.780 | 0.009 | 0.076 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f0000000000000210 | 681.475 | 3.367 | n/a | 0.000 | 0.000 | 0.975 | 676.873 | 0.139 | n/a | 0.040 | 0.000 | n/a | n/a | 0.081 | 3.367 | 0.005 | 0.081 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f00000000000001ef | 643.294 | 2.254 | n/a | 0.000 | 0.000 | 0.469 | 640.448 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.060 | 2.254 | 0.004 | 0.060 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f0000000000000200 | 626.545 | 4.973 | n/a | 0.000 | 0.000 | 0.574 | 620.807 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.137 | 4.973 | 0.008 | 0.137 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f0000000000000203 | 565.252 | 2.840 | n/a | 0.000 | 0.000 | 0.492 | 561.767 | 0.010 | n/a | 0.040 | 0.000 | n/a | n/a | 0.104 | 2.840 | 0.005 | 0.104 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f00000000000001de | 559.365 | 4.487 | n/a | 0.000 | 0.000 | 0.916 | 553.382 | 0.442 | n/a | 0.055 | 0.000 | n/a | n/a | 0.083 | 4.487 | 0.008 | 0.083 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f00000000000001f1 | 548.411 | 3.354 | n/a | 0.000 | 0.000 | 0.618 | 544.309 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.084 | 3.354 | 0.006 | 0.084 | gw-r/thread-50/journal/page | none observed |
| f6c8640c03ce098f00000000000001dc | 544.922 | 2.972 | n/a | 0.000 | 0.000 | 0.562 | 541.194 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.125 | 2.972 | 0.005 | 0.125 | gw-r/thread-50/journal/page | none observed |
| f6c8640c03ce098f00000000000001e4 | 527.084 | 2.303 | n/a | 0.000 | 0.000 | 0.695 | 523.957 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.065 | 2.303 | 0.004 | 0.065 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f00000000000001e2 | 475.731 | 10.747 | n/a | 0.000 | 0.000 | 0.640 | 461.957 | 1.981 | n/a | 0.083 | 0.000 | n/a | n/a | 0.323 | 10.747 | 0.023 | 0.323 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / internal (759 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.543 | n/a | n/a | n/a | 3.321 | n/a | 0.000 | 0.000 | 0.265 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.214 | 3.321 | 0.255 | 8.214 |
| p99 | 252.946 | n/a | n/a | n/a | 14.673 | n/a | 1.160 | 0.000 | 0.885 | 247.111 | 0.116 | n/a | 0.052 | 0.000 | n/a | n/a | 46.980 | 14.901 | 0.809 | 46.980 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6c8640c03ce098f0000000000000225 | 990.536 | 2.683 | n/a | 0.000 | 0.000 | 0.567 | 987.141 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.094 | 2.683 | 0.003 | 0.094 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f0000000000000226 | 699.304 | 3.167 | n/a | 0.000 | 0.000 | 0.558 | 695.430 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.097 | 3.167 | 0.005 | 0.097 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f000000000000021a | 692.525 | 2.385 | n/a | 0.000 | 0.000 | 0.589 | 689.404 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.108 | 2.385 | 0.003 | 0.108 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f0000000000000222 | 544.905 | 3.150 | n/a | 0.000 | 0.000 | 3.073 | 538.361 | 0.159 | n/a | 0.075 | 0.000 | n/a | n/a | 0.087 | 3.150 | 0.006 | 0.087 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f000000000000021d | 542.229 | 2.154 | n/a | 0.000 | 0.000 | 0.476 | 539.472 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 0.073 | 2.154 | 0.004 | 0.073 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f0000000000000223 | 430.688 | 2.767 | n/a | 0.000 | 0.000 | 0.612 | 427.165 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.084 | 2.767 | 0.006 | 0.084 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f000000000000021b | 297.698 | 2.678 | n/a | 0.000 | 0.000 | 0.629 | 294.199 | 0.010 | n/a | 0.053 | 0.000 | n/a | n/a | 0.130 | 2.678 | 0.009 | 0.130 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f000000000000021e | 252.946 | 4.949 | n/a | 0.000 | 0.000 | 0.650 | 247.111 | 0.015 | n/a | 0.050 | 0.000 | n/a | n/a | 0.172 | 4.949 | 0.020 | 0.172 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f0000000000000220 | 247.506 | 2.831 | n/a | 0.000 | 0.000 | 0.625 | 243.893 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.119 | 2.831 | 0.011 | 0.119 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f00000000000004e6 | 110.473 | 7.801 | n/a | 0.000 | 0.000 | 0.479 | 101.986 | 0.008 | n/a | 0.038 | 0.000 | n/a | n/a | 0.162 | 7.801 | 0.071 | 0.162 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f000000000000030e | 105.923 | 2.448 | n/a | 0.000 | 0.000 | 0.885 | 102.432 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 0.086 | 2.448 | 0.023 | 0.086 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f00000000000002f3 | 103.400 | 11.361 | n/a | 0.000 | 0.000 | 2.732 | 89.069 | 0.013 | n/a | 0.032 | 0.000 | n/a | n/a | 0.192 | 11.361 | 0.110 | 0.192 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f0000000000000753 | 92.364 | 2.866 | n/a | 0.000 | 0.000 | 1.315 | 87.984 | 0.072 | n/a | 0.042 | 0.000 | n/a | n/a | 0.085 | 2.866 | 0.031 | 0.085 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f0000000000000797 | 84.002 | 2.498 | n/a | 0.000 | 0.000 | 0.448 | 80.820 | 0.106 | n/a | 0.052 | 0.000 | n/a | n/a | 0.079 | 2.498 | 0.030 | 0.079 | gw-r/thread-50/journal/page | none observed |
| f6c8640c03ce098f00000000000004ef | 79.544 | 2.415 | n/a | 0.000 | 0.000 | 0.490 | 76.480 | 0.011 | n/a | 0.047 | 0.000 | n/a | n/a | 0.101 | 2.415 | 0.030 | 0.101 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f0000000000000785 | 79.035 | 8.730 | n/a | 0.000 | 0.000 | 0.477 | 69.595 | 0.005 | n/a | 0.064 | 0.000 | n/a | n/a | 0.164 | 8.730 | 0.110 | 0.164 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f000000000000046a | 77.960 | 6.329 | n/a | 0.000 | 0.000 | 0.749 | 70.737 | 0.003 | n/a | 0.036 | 0.000 | n/a | n/a | 0.106 | 6.329 | 0.081 | 0.106 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f000000000000081d | 76.980 | 5.868 | n/a | 0.000 | 0.000 | 0.551 | 70.220 | 0.146 | n/a | 0.027 | 0.000 | n/a | n/a | 0.168 | 5.868 | 0.076 | 0.168 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f0000000000000634 | 76.776 | 6.394 | n/a | 0.000 | 0.000 | 0.478 | 69.754 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.096 | 6.394 | 0.083 | 0.096 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f00000000000005ea | 76.365 | 3.894 | n/a | 0.000 | 0.000 | 0.776 | 71.323 | 0.181 | n/a | 0.042 | 0.000 | n/a | n/a | 0.149 | 3.894 | 0.051 | 0.149 | gw-r/thread-49/journal/page | none observed |

## P3 / tail / internal (2290 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.821 | n/a | n/a | n/a | 4.201 | n/a | 0.000 | 0.000 | 0.248 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.383 | 4.231 | 0.354 | 6.383 |
| p99 | 340.044 | n/a | n/a | n/a | 17.873 | n/a | 1.571 | 0.000 | 1.276 | 336.698 | 0.113 | n/a | 0.037 | 0.000 | n/a | n/a | 46.756 | 18.021 | 0.849 | 46.756 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6c8640c03ce098f0000000000001add | 1003.518 | 3.115 | n/a | 0.000 | 0.000 | 0.402 | 999.837 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.120 | 3.115 | 0.003 | 0.120 | gw-r/thread-47/journal/page | none observed |
| f6c8640c03ce098f0000000000001a95 | 1002.826 | 0.152 | n/a | 0.000 | 0.000 | 0.618 | 1000.884 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 1.101 | 0.152 | 0.000 | 1.101 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f0000000000001ae1 | 1002.633 | 0.146 | n/a | 0.000 | 0.000 | 0.580 | 1000.723 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 1.125 | 0.146 | 0.000 | 1.125 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f0000000000001a9f | 1002.127 | 2.907 | n/a | 0.000 | 0.000 | 0.449 | 998.589 | 0.090 | n/a | 0.040 | 0.000 | n/a | n/a | 0.053 | 2.907 | 0.003 | 0.053 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f0000000000001ab8 | 998.677 | 2.177 | n/a | 0.000 | 0.000 | 0.604 | 995.780 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.070 | 2.177 | 0.002 | 0.070 | gw-r/thread-68/journal/page | none observed |
| f6c8640c03ce098f0000000000001ad9 | 992.652 | 3.528 | n/a | 0.000 | 0.000 | 0.554 | 988.336 | 0.115 | n/a | 0.029 | 0.000 | n/a | n/a | 0.090 | 3.528 | 0.004 | 0.090 | gw-r/thread-68/journal/page | none observed |
| f6c8640c03ce098f0000000000001a94 | 991.749 | 4.063 | n/a | 0.000 | 0.000 | 0.502 | 987.017 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.140 | 4.063 | 0.004 | 0.140 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f0000000000001aba | 948.927 | 4.702 | n/a | 0.000 | 0.000 | 0.761 | 943.148 | 0.127 | n/a | 0.048 | 0.000 | n/a | n/a | 0.141 | 4.702 | 0.005 | 0.141 | gw-r/thread-68/journal/page | none observed |
| f6c8640c03ce098f0000000000001aa9 | 805.094 | 5.342 | n/a | 0.000 | 0.000 | 0.543 | 799.000 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.176 | 5.342 | 0.007 | 0.176 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f0000000000001a9a | 780.926 | 3.707 | n/a | 0.000 | 0.000 | 0.362 | 776.627 | 0.116 | n/a | 0.017 | 0.000 | n/a | n/a | 0.098 | 3.707 | 0.005 | 0.098 | gw-r/thread-65/journal/page | none observed |
| f6c8640c03ce098f0000000000001ab4 | 706.149 | 2.110 | n/a | 0.000 | 0.000 | 0.340 | 703.467 | 0.107 | n/a | 0.029 | 0.000 | n/a | n/a | 0.097 | 2.110 | 0.003 | 0.097 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f0000000000001a97 | 703.362 | 10.329 | n/a | 1.183 | 0.000 | 0.633 | 690.241 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.946 | 11.512 | 0.016 | 0.946 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f0000000000001ad2 | 693.401 | 2.890 | n/a | 0.000 | 0.000 | 0.594 | 689.748 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.134 | 2.890 | 0.004 | 0.134 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f0000000000001aaf | 681.580 | 5.018 | n/a | 0.000 | 0.000 | 0.387 | 675.924 | 0.012 | n/a | 0.024 | 0.000 | n/a | n/a | 0.214 | 5.018 | 0.007 | 0.214 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f0000000000001ac8 | 612.410 | 3.057 | n/a | 0.000 | 0.000 | 0.560 | 608.653 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.100 | 3.057 | 0.005 | 0.100 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f0000000000001ada | 602.569 | 2.208 | n/a | 0.000 | 0.000 | 0.384 | 599.732 | 0.117 | n/a | 0.029 | 0.000 | n/a | n/a | 0.100 | 2.208 | 0.004 | 0.100 | gw-r/thread-48/journal/page | none observed |
| f6c8640c03ce098f0000000000001ad5 | 461.079 | 5.088 | n/a | 0.000 | 0.000 | 0.994 | 454.827 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.124 | 5.088 | 0.011 | 0.124 | gw-r/thread-46/journal/page | none observed |
| f6c8640c03ce098f0000000000001aa0 | 433.642 | 1.682 | n/a | 0.000 | 0.000 | 0.642 | 431.194 | 0.009 | n/a | 0.043 | 0.000 | n/a | n/a | 0.071 | 1.682 | 0.004 | 0.071 | gw-r/thread-49/journal/page | none observed |
| f6c8640c03ce098f0000000000001ad4 | 416.292 | 1.946 | n/a | 0.000 | 0.000 | 0.472 | 413.682 | 0.081 | n/a | 0.033 | 0.000 | n/a | n/a | 0.078 | 1.946 | 0.005 | 0.078 | gw-r/thread-51/journal/page | none observed |
| f6c8640c03ce098f0000000000001abc | 411.827 | 8.382 | n/a | 0.000 | 0.000 | 2.706 | 400.361 | 0.102 | n/a | 0.041 | 0.000 | n/a | n/a | 0.235 | 8.382 | 0.020 | 0.235 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.057 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.788 | 200.962 | 0.017 | n/a | 0.122 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 207.593 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.812 | 206.724 | 2.357 | n/a | 0.258 | 0.000 | n/a | n/a | 0.301 | 0.000 | 0.000 | 0.301 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7447723b89619858000000000000001e | 207.593 | 0.000 | n/a | 0.000 | 0.000 | 0.560 | 206.724 | 0.026 | n/a | 0.130 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-51/journal/page | none observed |
| 7447723b896198580000000000000043 | 204.104 | 0.000 | n/a | 0.000 | 0.000 | 2.812 | 200.951 | 0.031 | n/a | 0.134 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-51/journal/page | none observed |
| 7447723b89619858000000000000000f | 203.508 | 0.000 | n/a | 0.000 | 0.000 | 1.305 | 201.626 | 0.087 | n/a | 0.252 | 0.000 | n/a | n/a | 0.238 | 0.000 | 0.000 | 0.238 | gw-r/thread-51/journal/page | none observed |
| 7447723b896198580000000000000048 | 203.454 | 0.000 | n/a | 0.000 | 0.000 | 1.662 | 201.379 | 0.053 | n/a | 0.190 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000052 | 203.081 | 0.000 | n/a | 0.000 | 0.000 | 1.163 | 201.522 | 0.059 | n/a | 0.194 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-49/journal/page | none observed |
| 7447723b896198580000000000000009 | 203.068 | 0.000 | n/a | 0.000 | 0.000 | 1.375 | 201.218 | 0.018 | n/a | 0.156 | 0.000 | n/a | n/a | 0.301 | 0.000 | 0.000 | 0.301 | gw-r/thread-46/journal/page | none observed |
| 7447723b89619858000000000000000c | 202.966 | 0.000 | n/a | 0.000 | 0.000 | 0.942 | 201.635 | 0.020 | n/a | 0.258 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 7447723b896198580000000000000021 | 202.905 | 0.000 | n/a | 0.000 | 0.000 | 1.278 | 201.348 | 0.012 | n/a | 0.140 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000014 | 202.833 | 0.000 | n/a | 0.000 | 0.000 | 0.765 | 201.775 | 0.018 | n/a | 0.150 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-49/journal/page | none observed |
| 7447723b896198580000000000000049 | 202.813 | 0.000 | n/a | 0.000 | 0.000 | 0.830 | 201.543 | 0.077 | n/a | 0.223 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-51/journal/page | none observed |
| 7447723b896198580000000000000054 | 202.801 | 0.000 | n/a | 0.000 | 0.000 | 1.267 | 201.245 | 0.014 | n/a | 0.145 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-50/journal/page | none observed |
| 7447723b896198580000000000000023 | 202.652 | 0.000 | n/a | 0.000 | 0.000 | 0.955 | 201.335 | 0.049 | n/a | 0.180 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-44/journal/page | none observed |
| 7447723b89619858000000000000001a | 202.642 | 0.000 | n/a | 0.000 | 0.000 | 0.858 | 201.465 | 0.017 | n/a | 0.169 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-50/journal/page | none observed |
| 7447723b896198580000000000000025 | 202.641 | 0.000 | n/a | 0.000 | 0.000 | 0.945 | 201.370 | 0.023 | n/a | 0.173 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-50/journal/page | none observed |
| 7447723b89619858000000000000003e | 202.598 | 0.000 | n/a | 0.000 | 0.000 | 1.184 | 201.070 | 0.012 | n/a | 0.140 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-46/journal/page | none observed |
| 7447723b89619858000000000000001b | 202.563 | 0.000 | n/a | 0.000 | 0.000 | 1.064 | 201.156 | 0.015 | n/a | 0.116 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-51/journal/page | none observed |
| 7447723b896198580000000000000030 | 202.507 | 0.000 | n/a | 0.000 | 0.000 | 1.187 | 201.022 | 0.013 | n/a | 0.116 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-47/journal/page | none observed |
| 7447723b89619858000000000000004d | 202.447 | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 201.485 | 0.078 | n/a | 0.122 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |
| 7447723b896198580000000000000051 | 202.412 | 0.000 | n/a | 0.000 | 0.000 | 0.788 | 201.246 | 0.021 | n/a | 0.179 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-50/journal/page | none observed |
| 7447723b896198580000000000000031 | 202.408 | 0.000 | n/a | 0.000 | 0.000 | 0.977 | 201.171 | 0.012 | n/a | 0.137 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.941 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.797 | 200.914 | 0.015 | n/a | 0.101 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 |
| p99 | 205.356 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.813 | 203.724 | 6.156 | n/a | 0.196 | 0.000 | n/a | n/a | 0.292 | 0.000 | 0.000 | 0.292 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7447723b896198580000000000000078 | 205.356 | 0.000 | n/a | 0.000 | 0.000 | 1.266 | 203.724 | 0.021 | n/a | 0.122 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-44/journal/page | none observed |
| 7447723b89619858000000000000005d | 203.537 | 0.000 | n/a | 0.000 | 0.000 | 1.813 | 201.426 | 0.022 | n/a | 0.172 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 7447723b896198580000000000000063 | 203.076 | 0.000 | n/a | 0.000 | 0.000 | 1.591 | 201.219 | 0.020 | n/a | 0.113 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-46/journal/page | none observed |
| 7447723b89619858000000000000006a | 202.815 | 0.000 | n/a | 0.000 | 0.000 | 0.874 | 201.627 | 0.022 | n/a | 0.185 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 7447723b89619858000000000000007e | 202.787 | 0.000 | n/a | 0.000 | 0.000 | 1.155 | 201.266 | 0.018 | n/a | 0.156 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-50/journal/page | none observed |
| 7447723b89619858000000000000005f | 202.706 | 0.000 | n/a | 0.000 | 0.000 | 0.948 | 201.458 | 0.020 | n/a | 0.155 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-49/journal/page | none observed |
| 7447723b896198580000000000000093 | 202.609 | 0.000 | n/a | 0.000 | 0.000 | 0.778 | 201.494 | 0.031 | n/a | 0.196 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 7447723b896198580000000000000070 | 202.570 | 0.000 | n/a | 0.000 | 0.000 | 0.866 | 201.423 | 0.028 | n/a | 0.142 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 7447723b8961985800000000000000aa | 202.561 | 0.000 | n/a | 0.000 | 0.000 | 1.228 | 201.050 | 0.011 | n/a | 0.109 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-49/journal/page | none observed |
| 7447723b89619858000000000000006f | 202.554 | 0.000 | n/a | 0.000 | 0.000 | 0.898 | 201.315 | 0.036 | n/a | 0.170 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-44/journal/page | none observed |
| 7447723b896198580000000000000074 | 202.510 | 0.000 | n/a | 0.000 | 0.000 | 1.031 | 201.176 | 0.021 | n/a | 0.122 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-50/journal/page | none observed |
| 7447723b8961985800000000000000a8 | 202.466 | 0.000 | n/a | 0.000 | 0.000 | 0.728 | 201.412 | 0.016 | n/a | 0.176 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-51/journal/page | none observed |
| 7447723b89619858000000000000007f | 202.462 | 0.000 | n/a | 0.000 | 0.000 | 1.370 | 200.849 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-44/journal/page | none observed |
| 7447723b896198580000000000000095 | 202.427 | 0.000 | n/a | 0.000 | 0.000 | 1.133 | 201.024 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-48/journal/page | none observed |
| 7447723b8961985800000000000000c4 | 202.426 | 0.000 | n/a | 0.000 | 0.000 | 0.976 | 201.071 | 0.006 | n/a | 0.081 | 0.000 | n/a | n/a | 0.292 | 0.000 | 0.000 | 0.292 | gw-r/thread-46/journal/page | none observed |
| 7447723b896198580000000000000076 | 202.417 | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 201.311 | 0.042 | n/a | 0.187 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-44/journal/page | none observed |
| 7447723b896198580000000000000073 | 202.379 | 0.000 | n/a | 0.000 | 0.000 | 0.943 | 201.167 | 0.025 | n/a | 0.131 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 7447723b896198580000000000000096 | 202.336 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 201.228 | 0.013 | n/a | 0.106 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-65/journal/page | none observed |
| 7447723b8961985800000000000000a2 | 202.317 | 0.000 | n/a | 0.000 | 0.000 | 1.006 | 201.034 | 0.012 | n/a | 0.119 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-48/journal/page | none observed |
| 7447723b896198580000000000000090 | 202.314 | 0.000 | n/a | 0.000 | 0.000 | 0.813 | 201.168 | 0.020 | n/a | 0.134 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.744 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.772 | 200.824 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 |
| p99 | 208.551 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.342 | 201.710 | 2.517 | n/a | 0.240 | 0.000 | n/a | n/a | 0.432 | 0.000 | 0.000 | 0.432 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7447723b8961985800000000000000cc | 208.551 | 0.000 | n/a | 0.000 | 0.000 | 7.342 | 200.972 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-48/journal/page | none observed |
| 7447723b8961985800000000000000e7 | 204.173 | 0.000 | n/a | 0.000 | 0.000 | 2.654 | 201.290 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-44/journal/page | none observed |
| 7447723b896198580000000000000117 | 203.336 | 0.000 | n/a | 0.000 | 0.000 | 1.275 | 201.710 | 0.007 | n/a | 0.107 | 0.000 | n/a | n/a | 0.238 | 0.000 | 0.000 | 0.238 | gw-r/thread-51/journal/page | none observed |
| 7447723b8961985800000000000000ee | 203.182 | 0.000 | n/a | 0.000 | 0.000 | 1.613 | 201.268 | 0.006 | n/a | 0.107 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-46/journal/page | none observed |
| 7447723b8961985800000000000000f4 | 203.151 | 0.000 | n/a | 0.000 | 0.000 | 1.135 | 201.469 | 0.019 | n/a | 0.240 | 0.000 | n/a | n/a | 0.288 | 0.000 | 0.000 | 0.288 | gw-r/thread-50/journal/page | none observed |
| 7447723b89619858000000000000010f | 203.020 | 0.000 | n/a | 0.000 | 0.000 | 1.335 | 201.356 | 0.007 | n/a | 0.103 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-46/journal/page | none observed |
| 7447723b8961985800000000000000c9 | 202.808 | 0.000 | n/a | 0.000 | 0.000 | 1.201 | 201.087 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.432 | 0.000 | 0.000 | 0.432 | gw-r/thread-46/journal/page | none observed |
| 7447723b8961985800000000000000ea | 202.499 | 0.000 | n/a | 0.000 | 0.000 | 0.914 | 201.273 | 0.010 | n/a | 0.146 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-46/journal/page | none observed |
| 7447723b8961985800000000000000df | 202.496 | 0.000 | n/a | 0.000 | 0.000 | 1.191 | 201.060 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 7447723b8961985800000000000000d8 | 202.455 | 0.000 | n/a | 0.000 | 0.000 | 1.083 | 201.098 | 0.008 | n/a | 0.074 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-49/journal/page | none observed |
| 7447723b8961985800000000000000d3 | 202.433 | 0.000 | n/a | 0.000 | 0.000 | 1.141 | 200.994 | 0.007 | n/a | 0.079 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-50/journal/page | none observed |
| 7447723b89619858000000000000010c | 202.374 | 0.000 | n/a | 0.000 | 0.000 | 0.904 | 201.197 | 0.030 | n/a | 0.105 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-49/journal/page | none observed |
| 7447723b896198580000000000000100 | 202.345 | 0.000 | n/a | 0.000 | 0.000 | 0.785 | 201.345 | 0.009 | n/a | 0.097 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-51/journal/page | none observed |
| 7447723b8961985800000000000000db | 202.321 | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 201.271 | 0.011 | n/a | 0.089 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-49/journal/page | none observed |
| 7447723b89619858000000000000012a | 202.280 | 0.000 | n/a | 0.000 | 0.000 | 0.684 | 201.347 | 0.014 | n/a | 0.092 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-47/journal/page | none observed |
| 7447723b8961985800000000000000e3 | 202.238 | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 201.248 | 0.011 | n/a | 0.095 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-44/journal/page | none observed |
| 7447723b8961985800000000000000fb | 202.203 | 0.000 | n/a | 0.000 | 0.000 | 0.874 | 201.110 | 0.008 | n/a | 0.087 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-51/journal/page | none observed |
| 7447723b8961985800000000000000ce | 202.199 | 0.000 | n/a | 0.000 | 0.000 | 0.858 | 201.059 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-48/journal/page | none observed |
| 7447723b8961985800000000000000ca | 202.182 | 0.000 | n/a | 0.000 | 0.000 | 1.006 | 200.927 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-48/journal/page | none observed |
| 7447723b8961985800000000000000c6 | 202.168 | 0.000 | n/a | 0.000 | 0.000 | 0.561 | 201.319 | 0.025 | n/a | 0.145 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.737 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.735 | 200.790 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 |
| p99 | 204.970 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.952 | 203.747 | 5.725 | n/a | 0.131 | 0.000 | n/a | n/a | 0.431 | 0.000 | 0.000 | 0.431 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7447723b896198580000000000000190 | 204.970 | 0.000 | n/a | 0.000 | 0.000 | 0.956 | 203.747 | 0.006 | n/a | 0.081 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-46/journal/page | none observed |
| 7447723b896198580000000000000141 | 204.256 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 202.980 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-65/journal/page | none observed |
| 7447723b89619858000000000000017e | 203.082 | 0.000 | n/a | 0.000 | 0.000 | 1.562 | 201.228 | 0.005 | n/a | 0.069 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-49/journal/page | none observed |
| 7447723b89619858000000000000015f | 202.995 | 0.000 | n/a | 0.000 | 0.000 | 1.952 | 200.844 | 0.006 | n/a | 0.081 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 7447723b89619858000000000000018d | 202.995 | 0.000 | n/a | 0.000 | 0.000 | 1.518 | 201.256 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-47/journal/page | none observed |
| 7447723b896198580000000000000167 | 202.904 | 0.000 | n/a | 0.000 | 0.000 | 1.070 | 201.614 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-49/journal/page | none observed |
| 7447723b896198580000000000000165 | 202.841 | 0.000 | n/a | 0.000 | 0.000 | 1.061 | 201.484 | 0.014 | n/a | 0.131 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-49/journal/page | none observed |
| 7447723b89619858000000000000016d | 202.718 | 0.000 | n/a | 0.000 | 0.000 | 1.484 | 200.825 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.349 | 0.000 | 0.000 | 0.349 | gw-r/thread-50/journal/page | none observed |
| 7447723b896198580000000000000191 | 202.701 | 0.000 | n/a | 0.000 | 0.000 | 1.030 | 201.406 | 0.009 | n/a | 0.096 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000186 | 202.618 | 0.000 | n/a | 0.000 | 0.000 | 1.350 | 201.053 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-51/journal/page | none observed |
| 7447723b896198580000000000000176 | 202.614 | 0.000 | n/a | 0.000 | 0.000 | 1.226 | 201.126 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-51/journal/page | none observed |
| 7447723b896198580000000000000154 | 202.575 | 0.000 | n/a | 0.000 | 0.000 | 1.309 | 200.931 | 0.016 | n/a | 0.093 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-46/journal/page | none observed |
| 7447723b896198580000000000000178 | 202.505 | 0.000 | n/a | 0.000 | 0.000 | 0.911 | 201.417 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 7447723b896198580000000000000159 | 202.364 | 0.000 | n/a | 0.000 | 0.000 | 1.075 | 200.946 | 0.007 | n/a | 0.127 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-47/journal/page | none observed |
| 7447723b896198580000000000000157 | 202.364 | 0.000 | n/a | 0.000 | 0.000 | 0.868 | 201.172 | 0.009 | n/a | 0.124 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-51/journal/page | none observed |
| 7447723b896198580000000000000161 | 202.281 | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 201.378 | 0.021 | n/a | 0.121 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-49/journal/page | none observed |
| 7447723b89619858000000000000016a | 202.264 | 0.000 | n/a | 0.000 | 0.000 | 1.224 | 200.833 | 0.005 | n/a | 0.072 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-65/journal/page | none observed |
| 7447723b89619858000000000000014f | 202.208 | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 201.137 | 0.011 | n/a | 0.131 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-50/journal/page | none observed |
| 7447723b89619858000000000000013c | 202.201 | 0.000 | n/a | 0.000 | 0.000 | 1.055 | 200.894 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000173 | 202.143 | 0.000 | n/a | 0.000 | 0.000 | 0.880 | 201.065 | 0.006 | n/a | 0.081 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-50/journal/page | none observed |

## P3 / L64 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.658 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.715 | 200.781 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 203.112 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.284 | 201.781 | 3.082 | n/a | 0.141 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7447723b8961985800000000000001af | 203.644 | 0.000 | n/a | 0.000 | 0.000 | 0.707 | 202.463 | 0.020 | n/a | 0.210 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-46/journal/page | none observed |
| 7447723b8961985800000000000001e2 | 203.112 | 0.000 | n/a | 0.000 | 0.000 | 1.284 | 201.616 | 0.015 | n/a | 0.088 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 7447723b896198580000000000000200 | 202.935 | 0.000 | n/a | 0.000 | 0.000 | 1.276 | 201.388 | 0.010 | n/a | 0.109 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-46/journal/page | none observed |
| 7447723b8961985800000000000001ad | 202.570 | 0.000 | n/a | 0.000 | 0.000 | 1.262 | 201.112 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 7447723b8961985800000000000001d7 | 202.531 | 0.000 | n/a | 0.000 | 0.000 | 1.158 | 201.170 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 7447723b8961985800000000000001ca | 202.511 | 0.000 | n/a | 0.000 | 0.000 | 1.016 | 201.203 | 0.007 | n/a | 0.082 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-65/journal/page | none observed |
| 7447723b8961985800000000000001b4 | 202.458 | 0.000 | n/a | 0.000 | 0.000 | 1.060 | 201.164 | 0.019 | n/a | 0.077 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-65/journal/page | none observed |
| 7447723b8961985800000000000001bb | 202.454 | 0.000 | n/a | 0.000 | 0.000 | 0.448 | 201.781 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-49/journal/page | none observed |
| 7447723b8961985800000000000001db | 202.433 | 0.000 | n/a | 0.000 | 0.000 | 0.531 | 201.656 | 0.012 | n/a | 0.116 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 7447723b8961985800000000000001f4 | 202.385 | 0.000 | n/a | 0.000 | 0.000 | 0.728 | 201.441 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-51/journal/page | none observed |
| 7447723b8961985800000000000001eb | 202.245 | 0.000 | n/a | 0.000 | 0.000 | 0.884 | 201.085 | 0.007 | n/a | 0.093 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-46/journal/page | none observed |
| 7447723b8961985800000000000001f3 | 202.217 | 0.000 | n/a | 0.000 | 0.000 | 0.715 | 201.240 | 0.016 | n/a | 0.141 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-49/journal/page | none observed |
| 7447723b8961985800000000000001f0 | 202.208 | 0.000 | n/a | 0.000 | 0.000 | 0.971 | 201.010 | 0.005 | n/a | 0.092 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-51/journal/page | none observed |
| 7447723b89619858000000000000019e | 202.188 | 0.000 | n/a | 0.000 | 0.000 | 0.846 | 201.109 | 0.011 | n/a | 0.066 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-49/journal/page | none observed |
| 7447723b8961985800000000000001a5 | 202.166 | 0.000 | n/a | 0.000 | 0.000 | 0.793 | 201.143 | 0.015 | n/a | 0.090 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000204 | 202.151 | 0.000 | n/a | 0.000 | 0.000 | 1.051 | 200.921 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-65/journal/page | none observed |
| 7447723b8961985800000000000001e1 | 202.145 | 0.000 | n/a | 0.000 | 0.000 | 0.979 | 200.918 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-51/journal/page | none observed |
| 7447723b8961985800000000000001c2 | 202.090 | 0.000 | n/a | 0.000 | 0.000 | 0.742 | 201.051 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-50/journal/page | none observed |
| 7447723b8961985800000000000001c5 | 202.023 | 0.000 | n/a | 0.000 | 0.000 | 0.838 | 200.953 | 0.007 | n/a | 0.082 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-48/journal/page | none observed |
| 7447723b89619858000000000000020d | 201.997 | 0.000 | n/a | 0.000 | 0.000 | 0.784 | 200.982 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / read (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.653 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.681 | 200.814 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 203.446 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.464 | 201.930 | 3.459 | n/a | 0.121 | 0.000 | n/a | n/a | 0.293 | 0.000 | 0.000 | 0.293 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7447723b896198580000000000000220 | 203.599 | 0.000 | n/a | 0.000 | 0.000 | 1.196 | 202.169 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-47/journal/page | none observed |
| 7447723b89619858000000000000026b | 203.446 | 0.000 | n/a | 0.000 | 0.000 | 1.607 | 201.508 | 0.012 | n/a | 0.106 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-46/journal/page | none observed |
| 7447723b89619858000000000000025c | 203.285 | 0.000 | n/a | 0.000 | 0.000 | 1.029 | 201.930 | 0.017 | n/a | 0.157 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-50/journal/page | none observed |
| 7447723b896198580000000000000247 | 202.558 | 0.000 | n/a | 0.000 | 0.000 | 1.013 | 201.213 | 0.012 | n/a | 0.086 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000221 | 202.546 | 0.000 | n/a | 0.000 | 0.000 | 1.095 | 201.237 | 0.012 | n/a | 0.088 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000241 | 202.337 | 0.000 | n/a | 0.000 | 0.000 | 0.914 | 201.122 | 0.010 | n/a | 0.087 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000249 | 202.296 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 201.296 | 0.010 | n/a | 0.115 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-51/journal/page | none observed |
| 7447723b89619858000000000000027b | 202.269 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 201.046 | 0.021 | n/a | 0.121 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-46/journal/page | none observed |
| 7447723b89619858000000000000024e | 202.242 | 0.000 | n/a | 0.000 | 0.000 | 0.730 | 201.296 | 0.009 | n/a | 0.085 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-49/journal/page | none observed |
| 7447723b89619858000000000000025e | 202.220 | 0.000 | n/a | 0.000 | 0.000 | 0.809 | 201.109 | 0.018 | n/a | 0.081 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-50/journal/page | none observed |
| 7447723b89619858000000000000021e | 202.209 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 201.111 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-47/journal/page | none observed |
| 7447723b896198580000000000000271 | 202.204 | 0.000 | n/a | 0.000 | 0.000 | 0.515 | 201.515 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000256 | 202.198 | 0.000 | n/a | 0.000 | 0.000 | 0.598 | 201.354 | 0.038 | n/a | 0.100 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000276 | 202.195 | 0.000 | n/a | 0.000 | 0.000 | 0.785 | 201.088 | 0.020 | n/a | 0.088 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-48/journal/page | none observed |
| 7447723b89619858000000000000025b | 202.185 | 0.000 | n/a | 0.000 | 0.000 | 0.855 | 201.121 | 0.011 | n/a | 0.070 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 7447723b89619858000000000000025d | 202.169 | 0.000 | n/a | 0.000 | 0.000 | 1.055 | 200.866 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-46/journal/page | none observed |
| 7447723b896198580000000000000237 | 202.144 | 0.000 | n/a | 0.000 | 0.000 | 0.696 | 201.176 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-51/journal/page | none observed |
| 7447723b896198580000000000000232 | 202.105 | 0.000 | n/a | 0.000 | 0.000 | 0.861 | 200.978 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-50/journal/page | none observed |
| 7447723b89619858000000000000026a | 202.071 | 0.000 | n/a | 0.000 | 0.000 | 0.941 | 200.859 | 0.006 | n/a | 0.102 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-50/journal/page | none observed |
| 7447723b896198580000000000000211 | 202.038 | 0.000 | n/a | 0.000 | 0.000 | 0.962 | 200.771 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-65/journal/page | none observed |

## P3 / L1024 / read (64 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 71.890 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.575 | 71.287 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 207.316 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.757 | 206.412 | 7.022 | n/a | 0.126 | 0.000 | n/a | n/a | 50.333 | 0.000 | 0.000 | 50.333 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7447723b896198580000000000000292 | 207.316 | 0.000 | n/a | 0.000 | 0.000 | 0.674 | 206.412 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-46/journal/page | none observed |
| 7447723b896198580000000000000293 | 203.590 | 0.000 | n/a | 0.000 | 0.000 | 0.620 | 195.812 | 7.022 | n/a | 0.024 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-50/journal/page | none observed |
| 7447723b89619858000000000000028f | 202.819 | 0.000 | n/a | 0.000 | 0.000 | 1.196 | 201.336 | 0.016 | n/a | 0.090 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-65/journal/page | none observed |
| 7447723b89619858000000000000029b | 202.787 | 0.000 | n/a | 0.000 | 0.000 | 1.035 | 201.433 | 0.010 | n/a | 0.089 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-46/journal/page | none observed |
| 7447723b896198580000000000000297 | 202.387 | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 201.435 | 0.015 | n/a | 0.093 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-49/journal/page | none observed |
| 7447723b89619858000000000000029a | 202.173 | 0.000 | n/a | 0.000 | 0.000 | 0.656 | 201.226 | 0.010 | n/a | 0.126 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-47/journal/page | none observed |
| 7447723b89619858000000000000028d | 202.161 | 0.000 | n/a | 0.000 | 0.000 | 0.877 | 201.083 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 7447723b896198580000000000000290 | 202.054 | 0.000 | n/a | 0.000 | 0.000 | 0.898 | 200.846 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 | gw-r/thread-46/journal/page | none observed |
| 7447723b896198580000000000000289 | 201.925 | 0.000 | n/a | 0.000 | 0.000 | 0.736 | 200.937 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000299 | 201.875 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 200.835 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-46/journal/page | none observed |
| 7447723b896198580000000000000283 | 201.824 | 0.000 | n/a | 0.000 | 0.000 | 0.471 | 201.144 | 0.011 | n/a | 0.088 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-50/journal/page | none observed |
| 7447723b896198580000000000000296 | 201.669 | 0.000 | n/a | 0.000 | 0.000 | 0.669 | 200.750 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000284 | 201.653 | 0.000 | n/a | 0.000 | 0.000 | 0.501 | 200.952 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-51/journal/page | none observed |
| 7447723b896198580000000000000294 | 201.598 | 0.000 | n/a | 0.000 | 0.000 | 0.571 | 200.783 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-65/journal/page | none observed |
| 7447723b89619858000000000000028b | 201.522 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 200.761 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-48/journal/page | none observed |
| 7447723b896198580000000000000288 | 201.423 | 0.000 | n/a | 0.000 | 0.000 | 0.573 | 200.644 | 0.011 | n/a | 0.052 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-49/journal/page | none observed |
| 7447723b896198580000000000000295 | 201.346 | 0.000 | n/a | 0.000 | 0.000 | 0.517 | 200.661 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-49/journal/page | none observed |
| 7447723b896198580000000000000282 | 201.262 | 0.000 | n/a | 0.000 | 0.000 | 0.418 | 200.680 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-51/journal/page | none observed |
| 7447723b896198580000000000000286 | 201.134 | 0.000 | n/a | 0.000 | 0.000 | 0.426 | 200.562 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 7447723b8961985800000000000003ef | 103.008 | 0.000 | n/a | 0.000 | 0.000 | 0.724 | 102.055 | 0.006 | n/a | 0.014 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-65/journal/page | none observed |

## P3 / tail / read (217 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 92.770 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.502 | 92.158 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 |
| p99 | 202.000 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.173 | 200.991 | 1.466 | n/a | 0.075 | 0.000 | n/a | n/a | 49.691 | 0.000 | 0.000 | 49.691 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7447723b896198580000000000000ef5 | 202.095 | 0.000 | n/a | 0.000 | 0.000 | 1.300 | 200.585 | 0.007 | n/a | 0.100 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-48/journal/page | none observed |
| 7447723b896198580000000000000eb6 | 202.027 | 0.000 | n/a | 0.000 | 0.000 | 1.299 | 200.598 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-50/journal/page | none observed |
| 7447723b896198580000000000000ee2 | 202.000 | 0.000 | n/a | 0.000 | 0.000 | 0.916 | 200.858 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-46/journal/page | none observed |
| 7447723b896198580000000000000ebf | 201.922 | 0.000 | n/a | 0.000 | 0.000 | 0.771 | 200.975 | 0.004 | n/a | 0.062 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 7447723b896198580000000000000ebc | 201.793 | 0.000 | n/a | 0.000 | 0.000 | 0.873 | 200.702 | 0.003 | n/a | 0.037 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-68/journal/page | none observed |
| 7447723b896198580000000000000ed7 | 201.739 | 0.000 | n/a | 0.000 | 0.000 | 0.562 | 200.972 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000ee4 | 201.714 | 0.000 | n/a | 0.000 | 0.000 | 0.857 | 200.655 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-46/journal/page | none observed |
| 7447723b896198580000000000000ef9 | 201.707 | 0.000 | n/a | 0.000 | 0.000 | 0.502 | 200.991 | 0.015 | n/a | 0.055 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-48/journal/page | none observed |
| 7447723b896198580000000000000f09 | 201.664 | 0.000 | n/a | 0.000 | 0.000 | 0.461 | 201.043 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-51/journal/page | none observed |
| 7447723b896198580000000000000eca | 201.617 | 0.000 | n/a | 0.000 | 0.000 | 0.619 | 200.776 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000ef3 | 201.617 | 0.000 | n/a | 0.000 | 0.000 | 0.622 | 200.819 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-51/journal/page | none observed |
| 7447723b896198580000000000000f0a | 201.615 | 0.000 | n/a | 0.000 | 0.000 | 0.616 | 200.814 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-48/journal/page | none observed |
| 7447723b896198580000000000000f0d | 201.609 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 200.699 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-51/journal/page | none observed |
| 7447723b896198580000000000000ed9 | 201.587 | 0.000 | n/a | 0.000 | 0.000 | 0.409 | 200.967 | 0.017 | n/a | 0.075 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000ee9 | 201.586 | 0.000 | n/a | 0.000 | 0.000 | 0.591 | 200.820 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-50/journal/page | none observed |
| 7447723b896198580000000000000eb8 | 201.584 | 0.000 | n/a | 0.000 | 0.000 | 0.704 | 200.726 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-50/journal/page | none observed |
| 7447723b896198580000000000000eb7 | 201.576 | 0.000 | n/a | 0.000 | 0.000 | 0.365 | 201.017 | 0.021 | n/a | 0.064 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-51/journal/page | none observed |
| 7447723b896198580000000000000f00 | 201.572 | 0.000 | n/a | 0.000 | 0.000 | 0.629 | 200.679 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-51/journal/page | none observed |
| 7447723b896198580000000000000f0e | 201.564 | 0.000 | n/a | 0.000 | 0.000 | 0.550 | 200.799 | 0.013 | n/a | 0.050 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-65/journal/page | none observed |
| 7447723b896198580000000000000f14 | 201.556 | 0.000 | n/a | 0.000 | 0.000 | 0.553 | 200.824 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-65/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
