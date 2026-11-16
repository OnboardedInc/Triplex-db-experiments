# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-53/peer.transact-await (includes order/network/storage)` (31.638 ms, trace `6fb6d8d1d8937b2d00000000000000f1`); `node-14/thread-0/driver.queue.scheduler-late` (39.523 ms, trace `6fb6d8d1d8937b2d0000000000000955`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (41.378 ms, trace `6fb6d8d1d8937b2d0000000000000192`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (17.559 ms, trace `6fb6d8d1d8937b2d00000000000000f2`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (10.079 ms, trace `6fb6d8d1d8937b2d00000000000000f3`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-idle-b-4-http`; source `a0785bcf96f7afea3965b3028db2e27f4fbef6a9`; subjects 10000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 1250/1250 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 1250/1250. Raw trace bytes: 26653806.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 4060 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 6000.809 | 1069.945 | 10.930 | 4049 |
| idle-10 | 0 | 2495.104 | 775.164 | 11.323 | 3032 |
| idle-25 | 0 | 4742.744 | 766.096 | 8.816 | 3049 |
| idle-50 | 0 | 8461.971 | 804.873 | 6.970 | 3034 |
| idle-100 | 0 | 15911.674 | 865.263 | 10.960 | 3034 |
| idle-250 | 0 | 38258.108 | 1177.820 | 29.720 | 3030 |
| idle-500 | 0 | 75512.928 | 1844.604 | 67.622 | 3034 |
| idle-1000 | 0 | 148010.348 | 2732.229 | 82.631 | 3012 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 6fb6d8d1d8937b2d00000000000000f1 | driver.queue.scheduler-late | 0.453 | none | 0 / 32 |
| 6fb6d8d1d8937b2d00000000000000f1 | driver.queue.scheduler-dispatch | 0.143 | none | 0 / 32 |

Observed active steps while trace 6fb6d8d1d8937b2d00000000000000f1 waited: []

| 6fb6d8d1d8937b2d0000000000000955 | driver.queue.scheduler-late | 39.523 | none | 0 / 32 |
| 6fb6d8d1d8937b2d0000000000000955 | driver.queue.scheduler-dispatch | 0.039 | none | 0 / 32 |

Observed active steps while trace 6fb6d8d1d8937b2d0000000000000955 waited: []

| 6fb6d8d1d8937b2d0000000000000192 | driver.queue.scheduler-dispatch | 0.044 | none | 0 / 32 |
| 6fb6d8d1d8937b2d0000000000000192 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 6fb6d8d1d8937b2d0000000000000192 waited: []

| 6fb6d8d1d8937b2d00000000000000f2 | driver.queue.scheduler-dispatch | 0.057 | none | 1 / 32 |
| 6fb6d8d1d8937b2d00000000000000f2 | driver.queue.scheduler-late | 0.005 | none | 1 / 32 |

Observed active steps while trace 6fb6d8d1d8937b2d00000000000000f2 waited: []

| 6fb6d8d1d8937b2d00000000000000f3 | driver.queue.scheduler-dispatch | 0.104 | none | 2 / 32 |
| 6fb6d8d1d8937b2d00000000000000f3 | driver.queue.scheduler-late | 0.004 | none | 2 / 32 |

Observed active steps while trace 6fb6d8d1d8937b2d00000000000000f3 waited: []

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 57.798 | 2.006 | 0.043 | 2.537 | 6.283 | n/a | 0.000 | 0.595 | 0.620 | 4.160 | 0.019 | 0.000 | 3.550 | 31.638 | 10.771 | n/a | 0.161 | 6.878 | 0.119 | 0.161 |
| p99 | 57.798 | 2.006 | 0.043 | 2.537 | 6.283 | n/a | 0.000 | 0.595 | 0.620 | 4.160 | 0.019 | 0.000 | 3.550 | 31.638 | 10.771 | n/a | 0.161 | 6.878 | 0.119 | 0.161 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d00000000000000f1 | 57.798 | 6.283 | n/a | 0.000 | 0.595 | 0.620 | 4.160 | 0.019 | 0.000 | 3.550 | 31.638 | 10.771 | n/a | 0.161 | 6.878 | 0.119 | 0.161 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 57.798 | 2.006 | 0.043 | 2.537 | 6.283 | n/a | 0.000 | 0.595 | 0.620 | 4.160 | 0.019 | 0.000 | 3.550 | 31.638 | 10.771 | n/a | 0.161 | 6.878 | 0.119 | 0.161 |
| p99 | 57.798 | 2.006 | 0.043 | 2.537 | 6.283 | n/a | 0.000 | 0.595 | 0.620 | 4.160 | 0.019 | 0.000 | 3.550 | 31.638 | 10.771 | n/a | 0.161 | 6.878 | 0.119 | 0.161 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d00000000000000f1 | 57.798 | 6.283 | n/a | 0.000 | 0.595 | 0.620 | 4.160 | 0.019 | 0.000 | 3.550 | 31.638 | 10.771 | n/a | 0.161 | 6.878 | 0.119 | 0.161 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |

## P2 / warmup / commit (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.279 | 0.156 | 0.000 | 0.487 | 2.127 | n/a | 0.000 | 0.042 | 0.534 | 1.178 | 0.017 | 0.000 | 0.317 | 5.347 | 0.525 | n/a | 0.020 | 2.225 | 0.201 | 0.020 |
| p99 | 30.326 | 1.432 | 0.034 | 0.977 | 3.820 | n/a | 0.000 | 2.094 | 2.872 | 5.835 | 0.045 | 0.000 | 3.624 | 17.559 | 6.840 | n/a | 0.044 | 4.273 | 0.382 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d0000000000000192 | 47.616 | 1.827 | n/a | 0.000 | 0.046 | 0.405 | 0.928 | 0.017 | 0.000 | 0.421 | 41.378 | 2.575 | n/a | 0.020 | 1.873 | 0.039 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000000f2 | 34.629 | 2.163 | n/a | 0.000 | 0.063 | 4.269 | 5.000 | 0.048 | 0.000 | 0.994 | 17.559 | 4.510 | n/a | 0.024 | 2.225 | 0.064 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.083ms |
| 6fb6d8d1d8937b2d00000000000000f3 | 30.326 | 3.733 | n/a | 0.000 | 0.108 | 7.108 | 4.338 | 0.019 | 0.000 | 0.345 | 10.079 | 4.398 | n/a | 0.198 | 3.841 | 0.127 | 0.198 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.413ms; driver.publication.persist-deferred 0.083ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.015ms |
| 6fb6d8d1d8937b2d0000000000000193 | 23.311 | 1.652 | n/a | 0.000 | 0.046 | 0.873 | 1.078 | 0.045 | 0.000 | 0.769 | 18.324 | 0.487 | n/a | 0.037 | 1.698 | 0.073 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.015ms |
| 6fb6d8d1d8937b2d0000000000000256 | 21.907 | 2.376 | n/a | 0.000 | 1.768 | 0.488 | 5.880 | 0.015 | 0.000 | 0.065 | 10.289 | 1.011 | n/a | 0.016 | 4.144 | 0.189 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.068ms |
| 6fb6d8d1d8937b2d00000000000001d2 | 21.194 | 2.997 | n/a | 0.000 | 0.053 | 0.450 | 1.040 | 0.016 | 0.000 | 0.342 | 15.772 | 0.496 | n/a | 0.027 | 3.050 | 0.144 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.088ms |
| 6fb6d8d1d8937b2d000000000000011e | 20.927 | 1.925 | n/a | 0.000 | 0.036 | 0.538 | 6.289 | 0.043 | 0.000 | 0.808 | 7.149 | 4.124 | n/a | 0.016 | 1.961 | 0.094 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000239 | 20.628 | 2.384 | n/a | 0.000 | 0.042 | 0.612 | 1.248 | 0.015 | 0.000 | 0.131 | 13.632 | 2.543 | n/a | 0.022 | 2.426 | 0.118 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000014e | 20.074 | 2.899 | n/a | 0.000 | 0.084 | 0.643 | 4.052 | 0.018 | 0.000 | 0.094 | 11.209 | 1.045 | n/a | 0.030 | 2.983 | 0.149 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| 6fb6d8d1d8937b2d0000000000000150 | 19.661 | 2.973 | n/a | 0.000 | 0.079 | 0.712 | 1.192 | 0.016 | 0.000 | 3.624 | 10.433 | 0.597 | n/a | 0.034 | 3.052 | 0.155 | 0.034 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000163 | 19.260 | 1.752 | n/a | 0.000 | 0.038 | 0.449 | 2.145 | 0.035 | 0.000 | 0.130 | 7.048 | 7.646 | n/a | 0.017 | 1.790 | 0.093 | 0.017 | tx/thread-88/transactor.triplex-function | none observed |
| 6fb6d8d1d8937b2d0000000000000140 | 19.086 | 3.320 | n/a | 0.000 | 0.033 | 0.697 | 0.990 | 0.015 | 0.000 | 0.375 | 6.785 | 6.840 | n/a | 0.032 | 3.353 | 0.176 | 0.032 | tx/thread-88/transactor.triplex-function | none observed |
| 6fb6d8d1d8937b2d0000000000000120 | 18.891 | 1.874 | n/a | 0.000 | 0.034 | 0.597 | 1.172 | 0.025 | 0.000 | 4.321 | 10.041 | 0.809 | n/a | 0.018 | 1.908 | 0.101 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000126 | 18.395 | 2.930 | n/a | 0.000 | 0.084 | 0.513 | 1.158 | 0.015 | 0.000 | 0.380 | 12.247 | 1.036 | n/a | 0.032 | 3.014 | 0.164 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000028c | 17.902 | 2.250 | n/a | 0.000 | 0.036 | 0.760 | 4.904 | 0.014 | 0.000 | 0.317 | 9.118 | 0.482 | n/a | 0.021 | 2.286 | 0.128 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000000f7 | 17.743 | 3.700 | n/a | 0.000 | 0.079 | 0.642 | 1.052 | 0.015 | 0.000 | 0.301 | 11.147 | 0.767 | n/a | 0.041 | 3.779 | 0.213 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.016ms |
| 6fb6d8d1d8937b2d00000000000001d0 | 17.689 | 2.317 | n/a | 0.000 | 0.036 | 0.489 | 0.900 | 0.016 | 0.000 | 0.088 | 7.800 | 6.025 | n/a | 0.018 | 2.354 | 0.133 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000001f9 | 17.666 | 2.508 | n/a | 0.000 | 0.031 | 0.410 | 1.062 | 0.016 | 0.000 | 0.114 | 5.201 | 8.307 | n/a | 0.019 | 2.538 | 0.144 | 0.019 | tx/thread-88/transactor.triplex-function | none observed |
| 6fb6d8d1d8937b2d000000000000013e | 17.611 | 2.325 | n/a | 0.000 | 1.948 | 0.587 | 3.396 | 0.017 | 0.000 | 0.345 | 8.456 | 0.519 | n/a | 0.018 | 4.273 | 0.243 | 0.018 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 6fb6d8d1d8937b2d0000000000000148 | 17.537 | 2.309 | n/a | 0.000 | 0.096 | 0.814 | 1.354 | 0.016 | 0.000 | 0.970 | 11.414 | 0.530 | n/a | 0.033 | 2.405 | 0.137 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.279 | 0.156 | 0.000 | 0.487 | 2.127 | n/a | 0.000 | 0.042 | 0.534 | 1.178 | 0.017 | 0.000 | 0.317 | 5.347 | 0.525 | n/a | 0.020 | 2.225 | 0.201 | 0.020 |
| p99 | 30.326 | 1.432 | 0.034 | 0.977 | 3.820 | n/a | 0.000 | 2.094 | 2.872 | 5.835 | 0.045 | 0.000 | 3.624 | 17.559 | 6.840 | n/a | 0.044 | 4.273 | 0.382 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d0000000000000192 | 47.616 | 1.827 | n/a | 0.000 | 0.046 | 0.405 | 0.928 | 0.017 | 0.000 | 0.421 | 41.378 | 2.575 | n/a | 0.020 | 1.873 | 0.039 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000000f2 | 34.629 | 2.163 | n/a | 0.000 | 0.063 | 4.269 | 5.000 | 0.048 | 0.000 | 0.994 | 17.559 | 4.510 | n/a | 0.024 | 2.225 | 0.064 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.083ms |
| 6fb6d8d1d8937b2d00000000000000f3 | 30.326 | 3.733 | n/a | 0.000 | 0.108 | 7.108 | 4.338 | 0.019 | 0.000 | 0.345 | 10.079 | 4.398 | n/a | 0.198 | 3.841 | 0.127 | 0.198 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.413ms; driver.publication.persist-deferred 0.083ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.015ms |
| 6fb6d8d1d8937b2d0000000000000193 | 23.311 | 1.652 | n/a | 0.000 | 0.046 | 0.873 | 1.078 | 0.045 | 0.000 | 0.769 | 18.324 | 0.487 | n/a | 0.037 | 1.698 | 0.073 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.015ms |
| 6fb6d8d1d8937b2d0000000000000256 | 21.907 | 2.376 | n/a | 0.000 | 1.768 | 0.488 | 5.880 | 0.015 | 0.000 | 0.065 | 10.289 | 1.011 | n/a | 0.016 | 4.144 | 0.189 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.068ms |
| 6fb6d8d1d8937b2d00000000000001d2 | 21.194 | 2.997 | n/a | 0.000 | 0.053 | 0.450 | 1.040 | 0.016 | 0.000 | 0.342 | 15.772 | 0.496 | n/a | 0.027 | 3.050 | 0.144 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.088ms |
| 6fb6d8d1d8937b2d000000000000011e | 20.927 | 1.925 | n/a | 0.000 | 0.036 | 0.538 | 6.289 | 0.043 | 0.000 | 0.808 | 7.149 | 4.124 | n/a | 0.016 | 1.961 | 0.094 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000239 | 20.628 | 2.384 | n/a | 0.000 | 0.042 | 0.612 | 1.248 | 0.015 | 0.000 | 0.131 | 13.632 | 2.543 | n/a | 0.022 | 2.426 | 0.118 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000014e | 20.074 | 2.899 | n/a | 0.000 | 0.084 | 0.643 | 4.052 | 0.018 | 0.000 | 0.094 | 11.209 | 1.045 | n/a | 0.030 | 2.983 | 0.149 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| 6fb6d8d1d8937b2d0000000000000150 | 19.661 | 2.973 | n/a | 0.000 | 0.079 | 0.712 | 1.192 | 0.016 | 0.000 | 3.624 | 10.433 | 0.597 | n/a | 0.034 | 3.052 | 0.155 | 0.034 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000163 | 19.260 | 1.752 | n/a | 0.000 | 0.038 | 0.449 | 2.145 | 0.035 | 0.000 | 0.130 | 7.048 | 7.646 | n/a | 0.017 | 1.790 | 0.093 | 0.017 | tx/thread-88/transactor.triplex-function | none observed |
| 6fb6d8d1d8937b2d0000000000000140 | 19.086 | 3.320 | n/a | 0.000 | 0.033 | 0.697 | 0.990 | 0.015 | 0.000 | 0.375 | 6.785 | 6.840 | n/a | 0.032 | 3.353 | 0.176 | 0.032 | tx/thread-88/transactor.triplex-function | none observed |
| 6fb6d8d1d8937b2d0000000000000120 | 18.891 | 1.874 | n/a | 0.000 | 0.034 | 0.597 | 1.172 | 0.025 | 0.000 | 4.321 | 10.041 | 0.809 | n/a | 0.018 | 1.908 | 0.101 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000126 | 18.395 | 2.930 | n/a | 0.000 | 0.084 | 0.513 | 1.158 | 0.015 | 0.000 | 0.380 | 12.247 | 1.036 | n/a | 0.032 | 3.014 | 0.164 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000028c | 17.902 | 2.250 | n/a | 0.000 | 0.036 | 0.760 | 4.904 | 0.014 | 0.000 | 0.317 | 9.118 | 0.482 | n/a | 0.021 | 2.286 | 0.128 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000000f7 | 17.743 | 3.700 | n/a | 0.000 | 0.079 | 0.642 | 1.052 | 0.015 | 0.000 | 0.301 | 11.147 | 0.767 | n/a | 0.041 | 3.779 | 0.213 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.016ms |
| 6fb6d8d1d8937b2d00000000000001d0 | 17.689 | 2.317 | n/a | 0.000 | 0.036 | 0.489 | 0.900 | 0.016 | 0.000 | 0.088 | 7.800 | 6.025 | n/a | 0.018 | 2.354 | 0.133 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000001f9 | 17.666 | 2.508 | n/a | 0.000 | 0.031 | 0.410 | 1.062 | 0.016 | 0.000 | 0.114 | 5.201 | 8.307 | n/a | 0.019 | 2.538 | 0.144 | 0.019 | tx/thread-88/transactor.triplex-function | none observed |
| 6fb6d8d1d8937b2d000000000000013e | 17.611 | 2.325 | n/a | 0.000 | 1.948 | 0.587 | 3.396 | 0.017 | 0.000 | 0.345 | 8.456 | 0.519 | n/a | 0.018 | 4.273 | 0.243 | 0.018 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 6fb6d8d1d8937b2d0000000000000148 | 17.537 | 2.309 | n/a | 0.000 | 0.096 | 0.814 | 1.354 | 0.016 | 0.000 | 0.970 | 11.414 | 0.530 | n/a | 0.033 | 2.405 | 0.137 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.261 | n/a | n/a | n/a | 13.808 | 1.361 | 0.000 | 0.000 | 0.361 | 0.634 | 0.002 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.009 | 18.552 | 0.917 | 0.009 |
| p99 | 52.940 | n/a | n/a | n/a | 30.666 | 38.271 | 3.273 | 0.000 | 22.435 | 15.165 | 0.014 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.018 | 52.079 | 1.000 | 0.018 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d00000000000000f5 | 52.940 | 30.666 | 1.361 | 2.377 | 0.000 | 3.319 | 15.165 | 0.013 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.008 | 34.405 | 0.650 | 0.008 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.413ms; driver.publication.readback 0.164ms; driver.publication.readback 0.057ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.021ms |
| 6fb6d8d1d8937b2d0000000000000221 | 52.094 | 13.808 | 38.271 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 52.079 | 1.000 | 0.016 | node-14/thread-0/rpc.replica.observe | driver.reader-basis.broadcast 0.118ms; driver.publication.readback 0.108ms; driver.publication.readback 0.069ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.037ms |
| 6fb6d8d1d8937b2d00000000000003bc | 45.114 | 8.731 | 36.366 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 45.097 | 1.000 | 0.017 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.100ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.015ms |
| 6fb6d8d1d8937b2d000000000000012b | 40.568 | 16.034 | 0.314 | 0.885 | 0.000 | 22.435 | 0.870 | 0.004 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.014 | 17.233 | 0.425 | 0.014 | node-14/thread-4/socket.wait-first-byte | driver.publication.readback 0.062ms; driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.026ms; driver.reader-basis.broadcast 0.018ms; driver.publication.persist-deferred 0.014ms |
| 6fb6d8d1d8937b2d00000000000000f8 | 37.864 | 12.738 | 0.419 | 0.194 | 0.000 | 22.139 | 2.318 | 0.014 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.007 | 13.351 | 0.353 | 0.007 | node-14/thread-4/socket.queue-and-write | driver.publication.readback 0.164ms; driver.publication.readback 0.110ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.018ms |
| 6fb6d8d1d8937b2d0000000000000223 | 36.278 | 17.854 | 15.406 | 0.000 | 0.000 | 1.728 | 1.262 | 0.009 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.012 | 33.260 | 0.917 | 0.012 | node-14/thread-0/rpc.replica.observe | driver.reader-basis.broadcast 0.118ms; driver.publication.readback 0.108ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.037ms; driver.publication.persist-deferred 0.016ms |
| 6fb6d8d1d8937b2d00000000000003be | 32.558 | 3.501 | 29.049 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 32.550 | 1.000 | 0.008 | node-14/thread-0/rpc.replica.observe | driver.publication.persist-deferred 0.015ms |
| 6fb6d8d1d8937b2d00000000000001be | 29.880 | 22.722 | 0.244 | 1.622 | 0.000 | 4.349 | 0.925 | 0.004 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.006 | 24.587 | 0.823 | 0.006 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.055ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.014ms |
| 6fb6d8d1d8937b2d0000000000000174 | 25.167 | 18.190 | 0.252 | 1.461 | 0.000 | 4.578 | 0.664 | 0.006 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.008 | 19.903 | 0.791 | 0.008 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.100ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.015ms |
| 6fb6d8d1d8937b2d00000000000009ba | 24.370 | 17.067 | 0.377 | 1.108 | 0.000 | 4.635 | 1.157 | 0.003 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.013 | 18.552 | 0.761 | 0.013 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.077ms; driver.publication.persist-deferred 0.025ms |
| 6fb6d8d1d8937b2d000000000000021e | 23.768 | 20.562 | 0.326 | 0.383 | 0.000 | 1.073 | 1.393 | 0.005 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.009 | 21.271 | 0.895 | 0.009 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.014ms |
| 6fb6d8d1d8937b2d000000000000034a | 22.261 | 14.315 | 0.770 | 0.000 | 0.000 | 6.409 | 0.741 | 0.003 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.010 | 15.086 | 0.678 | 0.010 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.119ms; driver.publication.readback 0.109ms; driver.publication.readback 0.101ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.023ms |
| 6fb6d8d1d8937b2d0000000000000878 | 22.120 | 15.201 | 0.245 | 0.857 | 0.000 | 4.064 | 1.732 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.009 | 16.303 | 0.737 | 0.009 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.016ms |
| 6fb6d8d1d8937b2d000000000000012e | 22.104 | 14.885 | 5.989 | 0.000 | 0.000 | 0.573 | 0.634 | 0.007 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.009 | 20.875 | 0.944 | 0.009 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.014ms |
| 6fb6d8d1d8937b2d00000000000000fa | 20.245 | 12.884 | 7.354 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 20.238 | 1.000 | 0.007 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.164ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.018ms; driver.reader-basis.broadcast 0.015ms |
| 6fb6d8d1d8937b2d00000000000003b1 | 19.427 | 10.325 | 9.094 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 19.419 | 1.000 | 0.008 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.121ms; driver.publication.readback 0.066ms; driver.publication.readback 0.033ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.015ms |
| 6fb6d8d1d8937b2d000000000000034e | 18.127 | 12.066 | 6.043 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 18.109 | 0.999 | 0.018 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.101ms; driver.publication.readback 0.098ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.020ms |
| 6fb6d8d1d8937b2d00000000000002a3 | 17.975 | 12.998 | 3.737 | 1.233 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 17.967 | 1.000 | 0.008 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.052ms; driver.publication.readback 0.040ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.013ms |
| 6fb6d8d1d8937b2d000000000000011b | 17.565 | 15.145 | 2.410 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 17.554 | 0.999 | 0.011 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.015ms |
| 6fb6d8d1d8937b2d000000000000034d | 17.412 | 11.335 | 1.076 | 3.273 | 0.000 | 0.361 | 1.350 | 0.004 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.006 | 15.684 | 0.901 | 0.006 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.109ms; driver.publication.readback 0.101ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.017ms |

## P2 / idle-10 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.643 | 0.000 | 0.000 | 0.466 | 1.901 | n/a | 0.000 | 0.040 | 0.587 | 1.110 | 0.016 | 0.000 | 0.147 | 4.943 | 0.483 | n/a | 0.017 | 2.082 | 0.193 | 0.017 |
| p99 | 24.211 | 1.492 | 0.067 | 0.958 | 3.350 | n/a | 0.000 | 2.460 | 5.389 | 4.237 | 0.048 | 0.000 | 3.720 | 16.267 | 4.213 | n/a | 0.069 | 6.264 | 0.446 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d00000000000002e4 | 26.604 | 1.659 | n/a | 0.000 | 0.023 | 0.488 | 1.479 | 0.026 | 0.000 | 2.159 | 19.832 | 0.923 | n/a | 0.015 | 1.682 | 0.063 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000029e | 24.211 | 3.068 | n/a | 0.000 | 0.082 | 1.721 | 1.497 | 0.027 | 0.000 | 3.191 | 10.438 | 4.132 | n/a | 0.054 | 3.150 | 0.130 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.015ms |
| 6fb6d8d1d8937b2d00000000000003ac | 22.547 | 2.181 | n/a | 0.000 | 0.172 | 5.389 | 2.458 | 0.045 | 0.000 | 0.165 | 11.639 | 0.479 | n/a | 0.020 | 2.353 | 0.104 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.013ms |
| 6fb6d8d1d8937b2d0000000000000359 | 22.347 | 2.289 | n/a | 0.000 | 0.762 | 1.574 | 2.579 | 0.048 | 0.000 | 3.071 | 11.528 | 0.476 | n/a | 0.020 | 3.051 | 0.137 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.090ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.015ms |
| 6fb6d8d1d8937b2d00000000000002f7 | 22.084 | 1.636 | n/a | 0.000 | 0.049 | 0.835 | 1.884 | 0.027 | 0.000 | 0.355 | 16.267 | 1.009 | n/a | 0.023 | 1.685 | 0.076 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.106ms; driver.publication.persist-deferred 0.032ms |
| 6fb6d8d1d8937b2d00000000000002e5 | 19.434 | 1.469 | n/a | 0.000 | 0.024 | 0.391 | 0.981 | 0.013 | 0.000 | 1.817 | 10.149 | 4.577 | n/a | 0.013 | 1.493 | 0.077 | 0.013 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.019ms |
| 6fb6d8d1d8937b2d000000000000029c | 19.368 | 1.830 | n/a | 0.000 | 0.032 | 0.616 | 1.872 | 0.034 | 0.000 | 0.120 | 12.632 | 2.215 | n/a | 0.017 | 1.862 | 0.096 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.018ms |
| 6fb6d8d1d8937b2d00000000000002fd | 19.080 | 1.903 | n/a | 0.000 | 0.047 | 0.641 | 3.182 | 0.036 | 0.000 | 0.169 | 12.307 | 0.774 | n/a | 0.021 | 1.950 | 0.102 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.032ms |
| 6fb6d8d1d8937b2d0000000000000335 | 18.386 | 1.812 | n/a | 0.000 | 0.038 | 0.607 | 1.303 | 0.022 | 0.000 | 0.426 | 13.078 | 1.078 | n/a | 0.021 | 1.850 | 0.101 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.014ms |
| 6fb6d8d1d8937b2d0000000000000307 | 18.281 | 1.622 | n/a | 0.000 | 0.027 | 0.458 | 3.034 | 0.035 | 0.000 | 0.604 | 11.354 | 1.131 | n/a | 0.016 | 1.649 | 0.090 | 0.016 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.084ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.017ms |
| 6fb6d8d1d8937b2d00000000000002fa | 17.736 | 1.773 | n/a | 0.000 | 0.065 | 1.335 | 1.797 | 0.018 | 0.000 | 0.070 | 12.154 | 0.496 | n/a | 0.029 | 1.838 | 0.104 | 0.029 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.149ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.007ms |
| 6fb6d8d1d8937b2d00000000000003c0 | 17.564 | 6.322 | n/a | 0.000 | 0.156 | 0.841 | 1.636 | 0.027 | 0.000 | 0.184 | 7.776 | 0.553 | n/a | 0.069 | 6.478 | 0.369 | 0.069 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000002a0 | 17.297 | 1.568 | n/a | 0.000 | 0.013 | 0.425 | 1.032 | 0.014 | 0.000 | 0.118 | 13.688 | 0.427 | n/a | 0.012 | 1.581 | 0.091 | 0.012 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.084ms; driver.publication.readback 0.055ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.017ms |
| 6fb6d8d1d8937b2d00000000000003a4 | 16.878 | 1.764 | n/a | 0.000 | 0.031 | 4.219 | 1.421 | 0.029 | 0.000 | 0.928 | 5.750 | 2.720 | n/a | 0.015 | 1.795 | 0.106 | 0.015 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.102ms; driver.publication.persist-deferred 0.031ms |
| 6fb6d8d1d8937b2d000000000000037d | 16.808 | 1.621 | n/a | 0.000 | 0.015 | 0.531 | 3.841 | 0.023 | 0.000 | 3.720 | 6.186 | 0.858 | n/a | 0.012 | 1.636 | 0.097 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000003a2 | 16.798 | 2.499 | n/a | 0.000 | 0.034 | 1.401 | 1.497 | 0.026 | 0.000 | 0.092 | 10.803 | 0.428 | n/a | 0.018 | 2.533 | 0.151 | 0.018 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.031ms |
| 6fb6d8d1d8937b2d0000000000000312 | 16.789 | 1.801 | n/a | 0.000 | 0.580 | 0.425 | 1.083 | 0.015 | 0.000 | 0.095 | 12.297 | 0.481 | n/a | 0.011 | 2.381 | 0.142 | 0.011 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.021ms |
| 6fb6d8d1d8937b2d0000000000000298 | 16.632 | 2.191 | n/a | 0.000 | 4.073 | 0.554 | 0.949 | 0.016 | 0.000 | 0.091 | 7.666 | 1.076 | n/a | 0.017 | 6.264 | 0.377 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.013ms |
| 6fb6d8d1d8937b2d00000000000002f6 | 16.487 | 2.426 | n/a | 0.000 | 0.010 | 0.708 | 3.268 | 0.043 | 0.000 | 4.403 | 5.157 | 0.462 | n/a | 0.010 | 2.437 | 0.148 | 0.010 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.044ms |
| 6fb6d8d1d8937b2d0000000000000296 | 16.466 | 1.824 | n/a | 0.000 | 0.061 | 5.819 | 1.635 | 0.031 | 0.000 | 0.147 | 6.337 | 0.588 | n/a | 0.023 | 1.885 | 0.114 | 0.023 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.015ms |

## P2 / idle-10 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.643 | 0.000 | 0.000 | 0.466 | 1.901 | n/a | 0.000 | 0.040 | 0.587 | 1.110 | 0.016 | 0.000 | 0.147 | 4.943 | 0.483 | n/a | 0.017 | 2.082 | 0.193 | 0.017 |
| p99 | 24.211 | 1.492 | 0.067 | 0.958 | 3.350 | n/a | 0.000 | 2.460 | 5.389 | 4.237 | 0.048 | 0.000 | 3.720 | 16.267 | 4.213 | n/a | 0.069 | 6.264 | 0.446 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d00000000000002e4 | 26.604 | 1.659 | n/a | 0.000 | 0.023 | 0.488 | 1.479 | 0.026 | 0.000 | 2.159 | 19.832 | 0.923 | n/a | 0.015 | 1.682 | 0.063 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000029e | 24.211 | 3.068 | n/a | 0.000 | 0.082 | 1.721 | 1.497 | 0.027 | 0.000 | 3.191 | 10.438 | 4.132 | n/a | 0.054 | 3.150 | 0.130 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.015ms |
| 6fb6d8d1d8937b2d00000000000003ac | 22.547 | 2.181 | n/a | 0.000 | 0.172 | 5.389 | 2.458 | 0.045 | 0.000 | 0.165 | 11.639 | 0.479 | n/a | 0.020 | 2.353 | 0.104 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.013ms |
| 6fb6d8d1d8937b2d0000000000000359 | 22.347 | 2.289 | n/a | 0.000 | 0.762 | 1.574 | 2.579 | 0.048 | 0.000 | 3.071 | 11.528 | 0.476 | n/a | 0.020 | 3.051 | 0.137 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.090ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.015ms |
| 6fb6d8d1d8937b2d00000000000002f7 | 22.084 | 1.636 | n/a | 0.000 | 0.049 | 0.835 | 1.884 | 0.027 | 0.000 | 0.355 | 16.267 | 1.009 | n/a | 0.023 | 1.685 | 0.076 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.106ms; driver.publication.persist-deferred 0.032ms |
| 6fb6d8d1d8937b2d00000000000002e5 | 19.434 | 1.469 | n/a | 0.000 | 0.024 | 0.391 | 0.981 | 0.013 | 0.000 | 1.817 | 10.149 | 4.577 | n/a | 0.013 | 1.493 | 0.077 | 0.013 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.019ms |
| 6fb6d8d1d8937b2d000000000000029c | 19.368 | 1.830 | n/a | 0.000 | 0.032 | 0.616 | 1.872 | 0.034 | 0.000 | 0.120 | 12.632 | 2.215 | n/a | 0.017 | 1.862 | 0.096 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.018ms |
| 6fb6d8d1d8937b2d00000000000002fd | 19.080 | 1.903 | n/a | 0.000 | 0.047 | 0.641 | 3.182 | 0.036 | 0.000 | 0.169 | 12.307 | 0.774 | n/a | 0.021 | 1.950 | 0.102 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.032ms |
| 6fb6d8d1d8937b2d0000000000000335 | 18.386 | 1.812 | n/a | 0.000 | 0.038 | 0.607 | 1.303 | 0.022 | 0.000 | 0.426 | 13.078 | 1.078 | n/a | 0.021 | 1.850 | 0.101 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.014ms |
| 6fb6d8d1d8937b2d0000000000000307 | 18.281 | 1.622 | n/a | 0.000 | 0.027 | 0.458 | 3.034 | 0.035 | 0.000 | 0.604 | 11.354 | 1.131 | n/a | 0.016 | 1.649 | 0.090 | 0.016 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.084ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.017ms |
| 6fb6d8d1d8937b2d00000000000002fa | 17.736 | 1.773 | n/a | 0.000 | 0.065 | 1.335 | 1.797 | 0.018 | 0.000 | 0.070 | 12.154 | 0.496 | n/a | 0.029 | 1.838 | 0.104 | 0.029 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.149ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.007ms |
| 6fb6d8d1d8937b2d00000000000003c0 | 17.564 | 6.322 | n/a | 0.000 | 0.156 | 0.841 | 1.636 | 0.027 | 0.000 | 0.184 | 7.776 | 0.553 | n/a | 0.069 | 6.478 | 0.369 | 0.069 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000002a0 | 17.297 | 1.568 | n/a | 0.000 | 0.013 | 0.425 | 1.032 | 0.014 | 0.000 | 0.118 | 13.688 | 0.427 | n/a | 0.012 | 1.581 | 0.091 | 0.012 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.084ms; driver.publication.readback 0.055ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.017ms |
| 6fb6d8d1d8937b2d00000000000003a4 | 16.878 | 1.764 | n/a | 0.000 | 0.031 | 4.219 | 1.421 | 0.029 | 0.000 | 0.928 | 5.750 | 2.720 | n/a | 0.015 | 1.795 | 0.106 | 0.015 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.102ms; driver.publication.persist-deferred 0.031ms |
| 6fb6d8d1d8937b2d000000000000037d | 16.808 | 1.621 | n/a | 0.000 | 0.015 | 0.531 | 3.841 | 0.023 | 0.000 | 3.720 | 6.186 | 0.858 | n/a | 0.012 | 1.636 | 0.097 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000003a2 | 16.798 | 2.499 | n/a | 0.000 | 0.034 | 1.401 | 1.497 | 0.026 | 0.000 | 0.092 | 10.803 | 0.428 | n/a | 0.018 | 2.533 | 0.151 | 0.018 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.031ms |
| 6fb6d8d1d8937b2d0000000000000312 | 16.789 | 1.801 | n/a | 0.000 | 0.580 | 0.425 | 1.083 | 0.015 | 0.000 | 0.095 | 12.297 | 0.481 | n/a | 0.011 | 2.381 | 0.142 | 0.011 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.021ms |
| 6fb6d8d1d8937b2d0000000000000298 | 16.632 | 2.191 | n/a | 0.000 | 4.073 | 0.554 | 0.949 | 0.016 | 0.000 | 0.091 | 7.666 | 1.076 | n/a | 0.017 | 6.264 | 0.377 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.013ms |
| 6fb6d8d1d8937b2d00000000000002f6 | 16.487 | 2.426 | n/a | 0.000 | 0.010 | 0.708 | 3.268 | 0.043 | 0.000 | 4.403 | 5.157 | 0.462 | n/a | 0.010 | 2.437 | 0.148 | 0.010 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.044ms |
| 6fb6d8d1d8937b2d0000000000000296 | 16.466 | 1.824 | n/a | 0.000 | 0.061 | 5.819 | 1.635 | 0.031 | 0.000 | 0.147 | 6.337 | 0.588 | n/a | 0.023 | 1.885 | 0.114 | 0.023 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.015ms |

## P2 / idle-25 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.427 | 0.000 | 0.000 | 0.475 | 1.894 | n/a | 0.000 | 0.039 | 0.516 | 1.051 | 0.015 | 0.000 | 0.110 | 4.335 | 0.448 | n/a | 0.019 | 1.951 | 0.227 | 0.019 |
| p99 | 29.559 | 1.115 | 0.098 | 0.890 | 3.575 | n/a | 0.000 | 2.081 | 2.068 | 6.717 | 0.044 | 0.000 | 3.484 | 16.319 | 3.353 | n/a | 0.038 | 4.951 | 0.460 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d0000000000000486 | 29.976 | 2.511 | n/a | 0.000 | 0.040 | 0.806 | 6.802 | 0.016 | 13.505 | 0.068 | 5.780 | 0.426 | n/a | 0.022 | 2.551 | 0.085 | 0.022 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 6fb6d8d1d8937b2d00000000000003fd | 29.559 | 1.678 | n/a | 0.000 | 0.061 | 0.448 | 1.137 | 0.034 | 0.000 | 0.104 | 25.487 | 0.585 | n/a | 0.025 | 1.739 | 0.059 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000405 | 21.233 | 1.995 | n/a | 0.000 | 0.026 | 0.614 | 1.415 | 0.015 | 0.000 | 0.404 | 16.319 | 0.432 | n/a | 0.014 | 2.021 | 0.095 | 0.014 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000004ee | 18.878 | 2.236 | n/a | 0.000 | 0.025 | 0.602 | 1.417 | 0.021 | 0.000 | 0.103 | 13.982 | 0.476 | n/a | 0.017 | 2.261 | 0.120 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.117ms |
| 6fb6d8d1d8937b2d0000000000000403 | 18.688 | 2.899 | n/a | 0.000 | 0.071 | 0.580 | 5.337 | 0.024 | 0.000 | 0.064 | 8.448 | 1.231 | n/a | 0.035 | 2.970 | 0.159 | 0.035 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 6fb6d8d1d8937b2d00000000000004c3 | 16.511 | 1.828 | n/a | 0.000 | 0.041 | 0.392 | 1.034 | 0.018 | 0.000 | 2.737 | 10.056 | 0.384 | n/a | 0.022 | 1.869 | 0.113 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000004a9 | 16.185 | 2.353 | n/a | 0.000 | 0.032 | 1.305 | 1.669 | 0.024 | 0.000 | 0.501 | 9.874 | 0.408 | n/a | 0.018 | 2.385 | 0.147 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000049d | 14.897 | 3.307 | n/a | 0.000 | 0.085 | 0.610 | 1.913 | 0.014 | 0.000 | 0.084 | 8.415 | 0.435 | n/a | 0.035 | 3.392 | 0.228 | 0.035 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000407 | 14.680 | 3.547 | n/a | 0.000 | 0.083 | 0.727 | 4.469 | 0.044 | 0.000 | 0.751 | 4.594 | 0.427 | n/a | 0.037 | 3.630 | 0.247 | 0.037 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000046c | 14.420 | 1.646 | n/a | 0.000 | 0.035 | 0.465 | 0.993 | 0.012 | 0.000 | 0.719 | 7.181 | 3.353 | n/a | 0.016 | 1.681 | 0.117 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.060ms |
| 6fb6d8d1d8937b2d000000000000048c | 14.307 | 3.565 | n/a | 0.000 | 0.035 | 0.659 | 1.025 | 0.025 | 0.000 | 0.414 | 7.914 | 0.649 | n/a | 0.021 | 3.600 | 0.252 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000460 | 14.199 | 2.634 | n/a | 0.000 | 2.081 | 0.348 | 1.456 | 0.064 | 0.000 | 0.768 | 6.355 | 0.469 | n/a | 0.025 | 4.714 | 0.332 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000004c5 | 13.751 | 2.315 | n/a | 0.000 | 0.045 | 0.796 | 1.540 | 0.029 | 0.000 | 3.740 | 4.812 | 0.452 | n/a | 0.022 | 2.360 | 0.172 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000047e | 13.667 | 1.687 | n/a | 0.000 | 0.029 | 0.386 | 1.487 | 0.012 | 0.000 | 0.079 | 9.554 | 0.420 | n/a | 0.013 | 1.716 | 0.126 | 0.013 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000003f2 | 13.664 | 1.852 | n/a | 0.000 | 1.808 | 0.343 | 1.084 | 0.015 | 0.000 | 0.110 | 8.001 | 0.438 | n/a | 0.013 | 3.660 | 0.268 | 0.013 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| 6fb6d8d1d8937b2d000000000000040d | 13.656 | 1.789 | n/a | 0.000 | 0.058 | 0.613 | 1.336 | 0.016 | 0.000 | 0.393 | 8.424 | 1.002 | n/a | 0.025 | 1.847 | 0.135 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000004b9 | 13.591 | 1.681 | n/a | 0.000 | 0.036 | 0.341 | 4.194 | 0.016 | 0.000 | 0.061 | 6.792 | 0.450 | n/a | 0.019 | 1.718 | 0.126 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000413 | 13.494 | 2.340 | n/a | 0.000 | 0.035 | 0.500 | 4.059 | 0.017 | 0.000 | 0.106 | 6.016 | 0.401 | n/a | 0.021 | 2.374 | 0.176 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.107ms |
| 6fb6d8d1d8937b2d000000000000043f | 13.385 | 2.301 | n/a | 0.000 | 0.038 | 0.584 | 1.492 | 0.026 | 0.000 | 0.095 | 5.277 | 3.552 | n/a | 0.019 | 2.340 | 0.175 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000046e | 13.384 | 2.747 | n/a | 0.000 | 1.518 | 0.547 | 1.179 | 0.013 | 0.000 | 0.329 | 6.596 | 0.438 | n/a | 0.016 | 4.265 | 0.319 | 0.016 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-25 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.427 | 0.000 | 0.000 | 0.475 | 1.894 | n/a | 0.000 | 0.039 | 0.516 | 1.051 | 0.015 | 0.000 | 0.110 | 4.335 | 0.448 | n/a | 0.019 | 1.951 | 0.227 | 0.019 |
| p99 | 29.559 | 1.115 | 0.098 | 0.890 | 3.575 | n/a | 0.000 | 2.081 | 2.068 | 6.717 | 0.044 | 0.000 | 3.484 | 16.319 | 3.353 | n/a | 0.038 | 4.951 | 0.460 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d0000000000000486 | 29.976 | 2.511 | n/a | 0.000 | 0.040 | 0.806 | 6.802 | 0.016 | 13.505 | 0.068 | 5.780 | 0.426 | n/a | 0.022 | 2.551 | 0.085 | 0.022 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 6fb6d8d1d8937b2d00000000000003fd | 29.559 | 1.678 | n/a | 0.000 | 0.061 | 0.448 | 1.137 | 0.034 | 0.000 | 0.104 | 25.487 | 0.585 | n/a | 0.025 | 1.739 | 0.059 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000405 | 21.233 | 1.995 | n/a | 0.000 | 0.026 | 0.614 | 1.415 | 0.015 | 0.000 | 0.404 | 16.319 | 0.432 | n/a | 0.014 | 2.021 | 0.095 | 0.014 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000004ee | 18.878 | 2.236 | n/a | 0.000 | 0.025 | 0.602 | 1.417 | 0.021 | 0.000 | 0.103 | 13.982 | 0.476 | n/a | 0.017 | 2.261 | 0.120 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.117ms |
| 6fb6d8d1d8937b2d0000000000000403 | 18.688 | 2.899 | n/a | 0.000 | 0.071 | 0.580 | 5.337 | 0.024 | 0.000 | 0.064 | 8.448 | 1.231 | n/a | 0.035 | 2.970 | 0.159 | 0.035 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 6fb6d8d1d8937b2d00000000000004c3 | 16.511 | 1.828 | n/a | 0.000 | 0.041 | 0.392 | 1.034 | 0.018 | 0.000 | 2.737 | 10.056 | 0.384 | n/a | 0.022 | 1.869 | 0.113 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000004a9 | 16.185 | 2.353 | n/a | 0.000 | 0.032 | 1.305 | 1.669 | 0.024 | 0.000 | 0.501 | 9.874 | 0.408 | n/a | 0.018 | 2.385 | 0.147 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000049d | 14.897 | 3.307 | n/a | 0.000 | 0.085 | 0.610 | 1.913 | 0.014 | 0.000 | 0.084 | 8.415 | 0.435 | n/a | 0.035 | 3.392 | 0.228 | 0.035 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000407 | 14.680 | 3.547 | n/a | 0.000 | 0.083 | 0.727 | 4.469 | 0.044 | 0.000 | 0.751 | 4.594 | 0.427 | n/a | 0.037 | 3.630 | 0.247 | 0.037 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000046c | 14.420 | 1.646 | n/a | 0.000 | 0.035 | 0.465 | 0.993 | 0.012 | 0.000 | 0.719 | 7.181 | 3.353 | n/a | 0.016 | 1.681 | 0.117 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.060ms |
| 6fb6d8d1d8937b2d000000000000048c | 14.307 | 3.565 | n/a | 0.000 | 0.035 | 0.659 | 1.025 | 0.025 | 0.000 | 0.414 | 7.914 | 0.649 | n/a | 0.021 | 3.600 | 0.252 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000460 | 14.199 | 2.634 | n/a | 0.000 | 2.081 | 0.348 | 1.456 | 0.064 | 0.000 | 0.768 | 6.355 | 0.469 | n/a | 0.025 | 4.714 | 0.332 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000004c5 | 13.751 | 2.315 | n/a | 0.000 | 0.045 | 0.796 | 1.540 | 0.029 | 0.000 | 3.740 | 4.812 | 0.452 | n/a | 0.022 | 2.360 | 0.172 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000047e | 13.667 | 1.687 | n/a | 0.000 | 0.029 | 0.386 | 1.487 | 0.012 | 0.000 | 0.079 | 9.554 | 0.420 | n/a | 0.013 | 1.716 | 0.126 | 0.013 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000003f2 | 13.664 | 1.852 | n/a | 0.000 | 1.808 | 0.343 | 1.084 | 0.015 | 0.000 | 0.110 | 8.001 | 0.438 | n/a | 0.013 | 3.660 | 0.268 | 0.013 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| 6fb6d8d1d8937b2d000000000000040d | 13.656 | 1.789 | n/a | 0.000 | 0.058 | 0.613 | 1.336 | 0.016 | 0.000 | 0.393 | 8.424 | 1.002 | n/a | 0.025 | 1.847 | 0.135 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000004b9 | 13.591 | 1.681 | n/a | 0.000 | 0.036 | 0.341 | 4.194 | 0.016 | 0.000 | 0.061 | 6.792 | 0.450 | n/a | 0.019 | 1.718 | 0.126 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000413 | 13.494 | 2.340 | n/a | 0.000 | 0.035 | 0.500 | 4.059 | 0.017 | 0.000 | 0.106 | 6.016 | 0.401 | n/a | 0.021 | 2.374 | 0.176 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.107ms |
| 6fb6d8d1d8937b2d000000000000043f | 13.385 | 2.301 | n/a | 0.000 | 0.038 | 0.584 | 1.492 | 0.026 | 0.000 | 0.095 | 5.277 | 3.552 | n/a | 0.019 | 2.340 | 0.175 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000046e | 13.384 | 2.747 | n/a | 0.000 | 1.518 | 0.547 | 1.179 | 0.013 | 0.000 | 0.329 | 6.596 | 0.438 | n/a | 0.016 | 4.265 | 0.319 | 0.016 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-50 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.663 | 0.000 | 0.000 | 0.472 | 2.084 | n/a | 0.000 | 0.038 | 0.466 | 0.882 | 0.012 | 0.000 | 0.112 | 3.828 | 0.440 | n/a | 0.021 | 2.207 | 0.245 | 0.021 |
| p99 | 15.503 | 1.269 | 0.036 | 0.979 | 3.776 | n/a | 0.000 | 1.834 | 2.042 | 4.882 | 0.058 | 0.000 | 1.298 | 9.218 | 0.957 | n/a | 0.044 | 4.769 | 0.412 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d00000000000005d8 | 16.768 | 1.677 | n/a | 0.000 | 0.035 | 0.323 | 4.215 | 0.027 | 0.000 | 0.149 | 9.872 | 0.450 | n/a | 0.021 | 1.712 | 0.102 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000555 | 15.503 | 3.776 | n/a | 0.000 | 0.090 | 0.696 | 0.880 | 0.012 | 0.000 | 0.379 | 9.218 | 0.411 | n/a | 0.040 | 3.866 | 0.249 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000005c0 | 14.002 | 3.730 | n/a | 0.000 | 1.038 | 0.664 | 4.359 | 0.013 | 0.000 | 0.058 | 3.672 | 0.439 | n/a | 0.030 | 4.769 | 0.341 | 0.030 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| 6fb6d8d1d8937b2d000000000000054f | 13.855 | 3.233 | n/a | 0.000 | 0.099 | 0.780 | 4.882 | 0.014 | 0.000 | 0.094 | 4.273 | 0.437 | n/a | 0.043 | 3.333 | 0.241 | 0.043 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000565 | 13.639 | 1.768 | n/a | 0.000 | 0.041 | 0.466 | 4.492 | 0.058 | 0.000 | 1.266 | 4.671 | 0.856 | n/a | 0.021 | 1.809 | 0.133 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000553 | 13.615 | 2.087 | n/a | 0.000 | 1.908 | 0.471 | 1.678 | 0.028 | 0.000 | 0.131 | 6.826 | 0.466 | n/a | 0.020 | 3.995 | 0.293 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000603 | 13.550 | 2.239 | n/a | 0.000 | 0.039 | 2.276 | 1.331 | 0.021 | 0.000 | 0.237 | 6.482 | 0.904 | n/a | 0.022 | 2.277 | 0.168 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000505 | 13.352 | 2.223 | n/a | 0.000 | 0.034 | 0.549 | 1.571 | 0.031 | 0.000 | 0.115 | 8.367 | 0.443 | n/a | 0.018 | 2.257 | 0.169 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000005c8 | 13.021 | 1.826 | n/a | 0.000 | 0.063 | 0.553 | 1.180 | 0.012 | 0.000 | 0.365 | 8.179 | 0.818 | n/a | 0.026 | 1.889 | 0.145 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000005da | 12.980 | 3.526 | n/a | 0.000 | 1.602 | 0.717 | 0.905 | 0.012 | 0.000 | 0.140 | 5.188 | 0.862 | n/a | 0.029 | 5.128 | 0.395 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000538 | 12.876 | 2.650 | n/a | 0.000 | 0.082 | 0.543 | 0.839 | 0.013 | 0.000 | 0.091 | 7.773 | 0.847 | n/a | 0.038 | 2.731 | 0.212 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000625 | 12.494 | 3.228 | n/a | 0.000 | 0.050 | 0.798 | 1.961 | 0.037 | 0.000 | 0.150 | 5.743 | 0.494 | n/a | 0.033 | 3.278 | 0.262 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000563 | 12.446 | 1.983 | n/a | 0.000 | 0.035 | 0.358 | 0.888 | 0.510 | 0.000 | 0.072 | 8.134 | 0.443 | n/a | 0.022 | 2.019 | 0.162 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000584 | 12.293 | 2.668 | n/a | 0.000 | 0.085 | 0.485 | 1.035 | 0.011 | 0.000 | 0.087 | 7.001 | 0.888 | n/a | 0.033 | 2.753 | 0.224 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000058e | 12.178 | 3.810 | n/a | 0.000 | 0.070 | 0.723 | 0.957 | 0.011 | 0.000 | 0.118 | 5.610 | 0.843 | n/a | 0.036 | 3.880 | 0.319 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000050d | 12.060 | 2.163 | n/a | 0.000 | 0.044 | 2.042 | 0.998 | 0.014 | 0.000 | 0.131 | 5.688 | 0.957 | n/a | 0.024 | 2.207 | 0.183 | 0.024 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000618 | 11.795 | 1.683 | n/a | 0.000 | 0.032 | 0.454 | 1.387 | 0.020 | 0.000 | 0.722 | 6.619 | 0.855 | n/a | 0.022 | 1.715 | 0.145 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000582 | 11.451 | 2.240 | n/a | 0.000 | 0.039 | 0.504 | 0.970 | 0.012 | 0.000 | 0.112 | 7.124 | 0.427 | n/a | 0.023 | 2.279 | 0.199 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000622 | 11.322 | 2.583 | n/a | 0.000 | 0.037 | 0.508 | 0.861 | 0.012 | 0.000 | 0.097 | 6.780 | 0.423 | n/a | 0.020 | 2.620 | 0.231 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000574 | 11.220 | 1.740 | n/a | 0.000 | 0.035 | 0.496 | 4.938 | 0.014 | 0.000 | 0.067 | 3.460 | 0.451 | n/a | 0.019 | 1.775 | 0.158 | 0.019 | gw-w/thread-52/commit.prepare-and-validate | none observed |

## P2 / idle-50 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.663 | 0.000 | 0.000 | 0.472 | 2.084 | n/a | 0.000 | 0.038 | 0.466 | 0.882 | 0.012 | 0.000 | 0.112 | 3.828 | 0.440 | n/a | 0.021 | 2.207 | 0.245 | 0.021 |
| p99 | 15.503 | 1.269 | 0.036 | 0.979 | 3.776 | n/a | 0.000 | 1.834 | 2.042 | 4.882 | 0.058 | 0.000 | 1.298 | 9.218 | 0.957 | n/a | 0.044 | 4.769 | 0.412 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d00000000000005d8 | 16.768 | 1.677 | n/a | 0.000 | 0.035 | 0.323 | 4.215 | 0.027 | 0.000 | 0.149 | 9.872 | 0.450 | n/a | 0.021 | 1.712 | 0.102 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000555 | 15.503 | 3.776 | n/a | 0.000 | 0.090 | 0.696 | 0.880 | 0.012 | 0.000 | 0.379 | 9.218 | 0.411 | n/a | 0.040 | 3.866 | 0.249 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000005c0 | 14.002 | 3.730 | n/a | 0.000 | 1.038 | 0.664 | 4.359 | 0.013 | 0.000 | 0.058 | 3.672 | 0.439 | n/a | 0.030 | 4.769 | 0.341 | 0.030 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| 6fb6d8d1d8937b2d000000000000054f | 13.855 | 3.233 | n/a | 0.000 | 0.099 | 0.780 | 4.882 | 0.014 | 0.000 | 0.094 | 4.273 | 0.437 | n/a | 0.043 | 3.333 | 0.241 | 0.043 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000565 | 13.639 | 1.768 | n/a | 0.000 | 0.041 | 0.466 | 4.492 | 0.058 | 0.000 | 1.266 | 4.671 | 0.856 | n/a | 0.021 | 1.809 | 0.133 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000553 | 13.615 | 2.087 | n/a | 0.000 | 1.908 | 0.471 | 1.678 | 0.028 | 0.000 | 0.131 | 6.826 | 0.466 | n/a | 0.020 | 3.995 | 0.293 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000603 | 13.550 | 2.239 | n/a | 0.000 | 0.039 | 2.276 | 1.331 | 0.021 | 0.000 | 0.237 | 6.482 | 0.904 | n/a | 0.022 | 2.277 | 0.168 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000505 | 13.352 | 2.223 | n/a | 0.000 | 0.034 | 0.549 | 1.571 | 0.031 | 0.000 | 0.115 | 8.367 | 0.443 | n/a | 0.018 | 2.257 | 0.169 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000005c8 | 13.021 | 1.826 | n/a | 0.000 | 0.063 | 0.553 | 1.180 | 0.012 | 0.000 | 0.365 | 8.179 | 0.818 | n/a | 0.026 | 1.889 | 0.145 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000005da | 12.980 | 3.526 | n/a | 0.000 | 1.602 | 0.717 | 0.905 | 0.012 | 0.000 | 0.140 | 5.188 | 0.862 | n/a | 0.029 | 5.128 | 0.395 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000538 | 12.876 | 2.650 | n/a | 0.000 | 0.082 | 0.543 | 0.839 | 0.013 | 0.000 | 0.091 | 7.773 | 0.847 | n/a | 0.038 | 2.731 | 0.212 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000625 | 12.494 | 3.228 | n/a | 0.000 | 0.050 | 0.798 | 1.961 | 0.037 | 0.000 | 0.150 | 5.743 | 0.494 | n/a | 0.033 | 3.278 | 0.262 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000563 | 12.446 | 1.983 | n/a | 0.000 | 0.035 | 0.358 | 0.888 | 0.510 | 0.000 | 0.072 | 8.134 | 0.443 | n/a | 0.022 | 2.019 | 0.162 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000584 | 12.293 | 2.668 | n/a | 0.000 | 0.085 | 0.485 | 1.035 | 0.011 | 0.000 | 0.087 | 7.001 | 0.888 | n/a | 0.033 | 2.753 | 0.224 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000058e | 12.178 | 3.810 | n/a | 0.000 | 0.070 | 0.723 | 0.957 | 0.011 | 0.000 | 0.118 | 5.610 | 0.843 | n/a | 0.036 | 3.880 | 0.319 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000050d | 12.060 | 2.163 | n/a | 0.000 | 0.044 | 2.042 | 0.998 | 0.014 | 0.000 | 0.131 | 5.688 | 0.957 | n/a | 0.024 | 2.207 | 0.183 | 0.024 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000618 | 11.795 | 1.683 | n/a | 0.000 | 0.032 | 0.454 | 1.387 | 0.020 | 0.000 | 0.722 | 6.619 | 0.855 | n/a | 0.022 | 1.715 | 0.145 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000582 | 11.451 | 2.240 | n/a | 0.000 | 0.039 | 0.504 | 0.970 | 0.012 | 0.000 | 0.112 | 7.124 | 0.427 | n/a | 0.023 | 2.279 | 0.199 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000622 | 11.322 | 2.583 | n/a | 0.000 | 0.037 | 0.508 | 0.861 | 0.012 | 0.000 | 0.097 | 6.780 | 0.423 | n/a | 0.020 | 2.620 | 0.231 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000574 | 11.220 | 1.740 | n/a | 0.000 | 0.035 | 0.496 | 4.938 | 0.014 | 0.000 | 0.067 | 3.460 | 0.451 | n/a | 0.019 | 1.775 | 0.158 | 0.019 | gw-w/thread-52/commit.prepare-and-validate | none observed |

## P2 / idle-100 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.612 | 0.000 | 0.000 | 0.487 | 2.008 | n/a | 0.000 | 0.038 | 0.510 | 0.944 | 0.013 | 0.000 | 0.119 | 4.509 | 0.455 | n/a | 0.022 | 2.047 | 0.227 | 0.022 |
| p99 | 18.397 | 1.519 | 0.000 | 0.907 | 3.911 | n/a | 0.000 | 1.768 | 1.240 | 4.505 | 0.043 | 0.000 | 0.661 | 10.934 | 3.657 | n/a | 0.090 | 5.417 | 0.398 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d0000000000000649 | 30.005 | 2.372 | n/a | 0.000 | 0.038 | 0.405 | 0.983 | 0.015 | 0.000 | 0.093 | 3.691 | 22.387 | n/a | 0.021 | 2.410 | 0.080 | 0.021 | tx/thread-88/transactor.triplex-function | none observed |
| 6fb6d8d1d8937b2d000000000000072f | 18.397 | 3.514 | n/a | 0.000 | 1.903 | 0.553 | 0.892 | 0.012 | 0.000 | 0.122 | 10.934 | 0.439 | n/a | 0.028 | 5.417 | 0.294 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000731 | 15.662 | 1.749 | n/a | 0.000 | 0.037 | 0.594 | 1.470 | 0.020 | 0.000 | 0.141 | 11.202 | 0.427 | n/a | 0.021 | 1.787 | 0.114 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000006aa | 15.164 | 2.728 | n/a | 0.000 | 0.314 | 0.757 | 1.399 | 0.024 | 0.000 | 0.112 | 9.354 | 0.458 | n/a | 0.019 | 3.042 | 0.201 | 0.019 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000006bb | 14.264 | 2.245 | n/a | 0.000 | 0.038 | 0.487 | 0.800 | 0.012 | 0.000 | 0.052 | 10.181 | 0.427 | n/a | 0.022 | 2.282 | 0.160 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000651 | 13.592 | 2.257 | n/a | 0.000 | 0.034 | 0.397 | 4.274 | 0.012 | 0.000 | 0.080 | 5.553 | 0.967 | n/a | 0.020 | 2.291 | 0.169 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000069c | 13.457 | 1.669 | n/a | 0.000 | 0.046 | 1.240 | 4.505 | 0.021 | 0.000 | 0.125 | 5.382 | 0.444 | n/a | 0.025 | 1.715 | 0.127 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000627 | 13.392 | 1.878 | n/a | 0.000 | 0.052 | 0.519 | 0.942 | 0.013 | 0.000 | 0.060 | 9.475 | 0.430 | n/a | 0.025 | 1.929 | 0.144 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000664 | 13.274 | 2.790 | n/a | 0.000 | 0.036 | 0.562 | 0.898 | 0.012 | 0.000 | 0.121 | 8.339 | 0.495 | n/a | 0.022 | 2.826 | 0.213 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000655 | 13.242 | 2.594 | n/a | 0.000 | 1.768 | 0.705 | 1.466 | 0.044 | 0.000 | 0.154 | 5.634 | 0.860 | n/a | 0.018 | 4.362 | 0.329 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000006b9 | 13.154 | 3.811 | n/a | 0.000 | 0.074 | 0.932 | 2.232 | 0.028 | 0.000 | 0.116 | 5.488 | 0.433 | n/a | 0.040 | 3.885 | 0.295 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000063c | 12.951 | 1.895 | n/a | 0.000 | 0.043 | 0.355 | 1.117 | 0.013 | 0.000 | 0.100 | 8.964 | 0.440 | n/a | 0.025 | 1.937 | 0.150 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000744 | 12.916 | 1.806 | n/a | 0.000 | 0.036 | 0.540 | 5.902 | 0.018 | 0.000 | 0.064 | 4.057 | 0.473 | n/a | 0.019 | 1.842 | 0.143 | 0.019 | gw-w/thread-52/commit.prepare-and-validate | none observed |
| 6fb6d8d1d8937b2d0000000000000680 | 12.888 | 2.686 | n/a | 0.000 | 1.016 | 0.603 | 0.871 | 0.013 | 0.000 | 0.125 | 7.089 | 0.468 | n/a | 0.019 | 3.703 | 0.287 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000671 | 12.768 | 3.911 | n/a | 0.000 | 1.546 | 0.595 | 0.880 | 0.012 | 0.000 | 0.372 | 4.530 | 0.905 | n/a | 0.018 | 5.457 | 0.427 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000062d | 12.687 | 1.846 | n/a | 0.000 | 0.035 | 0.487 | 1.674 | 0.021 | 0.000 | 0.201 | 7.545 | 0.855 | n/a | 0.022 | 1.881 | 0.148 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000733 | 12.653 | 1.856 | n/a | 0.000 | 0.043 | 0.338 | 0.792 | 0.011 | 0.000 | 0.100 | 8.583 | 0.905 | n/a | 0.024 | 1.899 | 0.150 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000006a8 | 12.598 | 1.716 | n/a | 0.000 | 0.036 | 0.674 | 1.644 | 0.026 | 0.000 | 0.115 | 4.708 | 3.657 | n/a | 0.021 | 1.752 | 0.139 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000065c | 12.516 | 2.008 | n/a | 0.000 | 0.039 | 0.766 | 1.645 | 0.025 | 0.000 | 0.134 | 7.436 | 0.440 | n/a | 0.024 | 2.047 | 0.164 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000677 | 12.438 | 1.952 | n/a | 0.000 | 0.035 | 0.786 | 1.731 | 0.023 | 0.000 | 0.243 | 7.199 | 0.449 | n/a | 0.019 | 1.987 | 0.160 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-100 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.612 | 0.000 | 0.000 | 0.487 | 2.008 | n/a | 0.000 | 0.038 | 0.510 | 0.944 | 0.013 | 0.000 | 0.119 | 4.509 | 0.455 | n/a | 0.022 | 2.047 | 0.227 | 0.022 |
| p99 | 18.397 | 1.519 | 0.000 | 0.907 | 3.911 | n/a | 0.000 | 1.768 | 1.240 | 4.505 | 0.043 | 0.000 | 0.661 | 10.934 | 3.657 | n/a | 0.090 | 5.417 | 0.398 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d0000000000000649 | 30.005 | 2.372 | n/a | 0.000 | 0.038 | 0.405 | 0.983 | 0.015 | 0.000 | 0.093 | 3.691 | 22.387 | n/a | 0.021 | 2.410 | 0.080 | 0.021 | tx/thread-88/transactor.triplex-function | none observed |
| 6fb6d8d1d8937b2d000000000000072f | 18.397 | 3.514 | n/a | 0.000 | 1.903 | 0.553 | 0.892 | 0.012 | 0.000 | 0.122 | 10.934 | 0.439 | n/a | 0.028 | 5.417 | 0.294 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000731 | 15.662 | 1.749 | n/a | 0.000 | 0.037 | 0.594 | 1.470 | 0.020 | 0.000 | 0.141 | 11.202 | 0.427 | n/a | 0.021 | 1.787 | 0.114 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000006aa | 15.164 | 2.728 | n/a | 0.000 | 0.314 | 0.757 | 1.399 | 0.024 | 0.000 | 0.112 | 9.354 | 0.458 | n/a | 0.019 | 3.042 | 0.201 | 0.019 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000006bb | 14.264 | 2.245 | n/a | 0.000 | 0.038 | 0.487 | 0.800 | 0.012 | 0.000 | 0.052 | 10.181 | 0.427 | n/a | 0.022 | 2.282 | 0.160 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000651 | 13.592 | 2.257 | n/a | 0.000 | 0.034 | 0.397 | 4.274 | 0.012 | 0.000 | 0.080 | 5.553 | 0.967 | n/a | 0.020 | 2.291 | 0.169 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000069c | 13.457 | 1.669 | n/a | 0.000 | 0.046 | 1.240 | 4.505 | 0.021 | 0.000 | 0.125 | 5.382 | 0.444 | n/a | 0.025 | 1.715 | 0.127 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000627 | 13.392 | 1.878 | n/a | 0.000 | 0.052 | 0.519 | 0.942 | 0.013 | 0.000 | 0.060 | 9.475 | 0.430 | n/a | 0.025 | 1.929 | 0.144 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000664 | 13.274 | 2.790 | n/a | 0.000 | 0.036 | 0.562 | 0.898 | 0.012 | 0.000 | 0.121 | 8.339 | 0.495 | n/a | 0.022 | 2.826 | 0.213 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000655 | 13.242 | 2.594 | n/a | 0.000 | 1.768 | 0.705 | 1.466 | 0.044 | 0.000 | 0.154 | 5.634 | 0.860 | n/a | 0.018 | 4.362 | 0.329 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000006b9 | 13.154 | 3.811 | n/a | 0.000 | 0.074 | 0.932 | 2.232 | 0.028 | 0.000 | 0.116 | 5.488 | 0.433 | n/a | 0.040 | 3.885 | 0.295 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000063c | 12.951 | 1.895 | n/a | 0.000 | 0.043 | 0.355 | 1.117 | 0.013 | 0.000 | 0.100 | 8.964 | 0.440 | n/a | 0.025 | 1.937 | 0.150 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000744 | 12.916 | 1.806 | n/a | 0.000 | 0.036 | 0.540 | 5.902 | 0.018 | 0.000 | 0.064 | 4.057 | 0.473 | n/a | 0.019 | 1.842 | 0.143 | 0.019 | gw-w/thread-52/commit.prepare-and-validate | none observed |
| 6fb6d8d1d8937b2d0000000000000680 | 12.888 | 2.686 | n/a | 0.000 | 1.016 | 0.603 | 0.871 | 0.013 | 0.000 | 0.125 | 7.089 | 0.468 | n/a | 0.019 | 3.703 | 0.287 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000671 | 12.768 | 3.911 | n/a | 0.000 | 1.546 | 0.595 | 0.880 | 0.012 | 0.000 | 0.372 | 4.530 | 0.905 | n/a | 0.018 | 5.457 | 0.427 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000062d | 12.687 | 1.846 | n/a | 0.000 | 0.035 | 0.487 | 1.674 | 0.021 | 0.000 | 0.201 | 7.545 | 0.855 | n/a | 0.022 | 1.881 | 0.148 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000733 | 12.653 | 1.856 | n/a | 0.000 | 0.043 | 0.338 | 0.792 | 0.011 | 0.000 | 0.100 | 8.583 | 0.905 | n/a | 0.024 | 1.899 | 0.150 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000006a8 | 12.598 | 1.716 | n/a | 0.000 | 0.036 | 0.674 | 1.644 | 0.026 | 0.000 | 0.115 | 4.708 | 3.657 | n/a | 0.021 | 1.752 | 0.139 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000065c | 12.516 | 2.008 | n/a | 0.000 | 0.039 | 0.766 | 1.645 | 0.025 | 0.000 | 0.134 | 7.436 | 0.440 | n/a | 0.024 | 2.047 | 0.164 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000677 | 12.438 | 1.952 | n/a | 0.000 | 0.035 | 0.786 | 1.731 | 0.023 | 0.000 | 0.243 | 7.199 | 0.449 | n/a | 0.019 | 1.987 | 0.160 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.673 | 0.290 | 0.000 | 0.486 | 2.114 | n/a | 0.000 | 0.048 | 0.489 | 0.951 | 0.014 | 0.000 | 0.128 | 4.590 | 0.478 | n/a | 0.026 | 2.283 | 0.237 | 0.026 |
| p99 | 17.044 | 1.345 | 0.000 | 0.924 | 3.842 | n/a | 0.000 | 2.307 | 1.518 | 5.042 | 0.044 | 0.000 | 2.416 | 9.642 | 2.722 | n/a | 0.062 | 6.129 | 0.412 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d000000000000076b | 17.936 | 2.650 | n/a | 0.000 | 0.052 | 0.497 | 4.393 | 0.013 | 0.000 | 0.087 | 8.719 | 1.501 | n/a | 0.025 | 2.702 | 0.151 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000085e | 17.044 | 4.155 | n/a | 0.000 | 1.974 | 0.767 | 0.851 | 0.014 | 0.000 | 0.128 | 8.227 | 0.896 | n/a | 0.032 | 6.129 | 0.360 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000007de | 15.594 | 3.020 | n/a | 0.000 | 0.120 | 0.515 | 2.674 | 0.020 | 0.000 | 0.334 | 7.961 | 0.899 | n/a | 0.052 | 3.140 | 0.201 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000809 | 15.125 | 2.800 | n/a | 0.000 | 0.104 | 0.391 | 0.818 | 0.011 | 0.000 | 0.063 | 8.175 | 2.722 | n/a | 0.041 | 2.905 | 0.192 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000083f | 14.717 | 1.930 | n/a | 0.000 | 0.043 | 0.354 | 0.891 | 0.015 | 0.000 | 0.071 | 10.903 | 0.486 | n/a | 0.023 | 1.973 | 0.134 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000079f | 14.558 | 3.019 | n/a | 0.000 | 0.086 | 1.334 | 1.626 | 0.029 | 0.000 | 0.989 | 6.420 | 1.007 | n/a | 0.049 | 3.104 | 0.213 | 0.049 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000085a | 14.496 | 2.968 | n/a | 0.000 | 0.110 | 0.456 | 1.097 | 0.013 | 0.000 | 0.359 | 9.022 | 0.430 | n/a | 0.041 | 3.078 | 0.212 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000869 | 14.232 | 2.452 | n/a | 0.000 | 0.075 | 0.677 | 5.042 | 0.027 | 0.000 | 0.110 | 5.386 | 0.429 | n/a | 0.033 | 2.527 | 0.178 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000086c | 14.201 | 2.753 | n/a | 0.000 | 2.307 | 0.484 | 1.049 | 0.014 | 0.000 | 0.411 | 6.711 | 0.451 | n/a | 0.021 | 5.060 | 0.356 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000084a | 13.833 | 3.487 | n/a | 0.000 | 0.120 | 0.649 | 1.626 | 0.026 | 0.000 | 0.246 | 6.598 | 1.022 | n/a | 0.059 | 3.606 | 0.261 | 0.059 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000078b | 13.464 | 1.794 | n/a | 0.000 | 0.040 | 0.326 | 0.826 | 0.012 | 0.000 | 0.365 | 9.642 | 0.436 | n/a | 0.023 | 1.834 | 0.136 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.080ms |
| 6fb6d8d1d8937b2d00000000000007dc | 13.451 | 1.860 | n/a | 0.000 | 0.047 | 0.319 | 0.817 | 0.012 | 0.000 | 0.064 | 9.288 | 1.020 | n/a | 0.025 | 1.907 | 0.142 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.076ms |
| 6fb6d8d1d8937b2d0000000000000865 | 13.441 | 2.462 | n/a | 0.000 | 0.043 | 0.857 | 1.611 | 0.028 | 0.000 | 0.131 | 7.214 | 1.068 | n/a | 0.027 | 2.505 | 0.186 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000784 | 13.424 | 3.842 | n/a | 0.000 | 3.034 | 0.658 | 0.949 | 0.014 | 0.000 | 0.371 | 4.011 | 0.503 | n/a | 0.042 | 6.876 | 0.512 | 0.042 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000007f2 | 13.419 | 1.980 | n/a | 0.000 | 0.043 | 0.585 | 4.808 | 0.019 | 0.000 | 0.107 | 5.412 | 0.440 | n/a | 0.026 | 2.023 | 0.151 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000082a | 13.214 | 2.945 | n/a | 0.000 | 0.079 | 0.505 | 0.802 | 0.011 | 0.000 | 0.093 | 8.310 | 0.435 | n/a | 0.033 | 3.024 | 0.229 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000081b | 13.109 | 2.725 | n/a | 0.000 | 0.082 | 0.624 | 1.383 | 0.023 | 0.000 | 0.218 | 5.486 | 2.532 | n/a | 0.036 | 2.808 | 0.214 | 0.036 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000872 | 13.052 | 3.119 | n/a | 0.000 | 0.119 | 0.754 | 1.560 | 0.025 | 0.000 | 0.128 | 6.813 | 0.487 | n/a | 0.048 | 3.238 | 0.248 | 0.048 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000814 | 13.036 | 1.913 | n/a | 0.000 | 0.048 | 0.596 | 1.543 | 0.024 | 0.000 | 0.128 | 8.281 | 0.478 | n/a | 0.024 | 1.961 | 0.150 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000081f | 12.905 | 1.910 | n/a | 0.000 | 0.044 | 0.364 | 0.848 | 0.012 | 0.000 | 3.266 | 5.356 | 1.080 | n/a | 0.026 | 1.954 | 0.151 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.673 | 0.290 | 0.000 | 0.486 | 2.114 | n/a | 0.000 | 0.048 | 0.489 | 0.951 | 0.014 | 0.000 | 0.128 | 4.590 | 0.478 | n/a | 0.026 | 2.283 | 0.237 | 0.026 |
| p99 | 17.044 | 1.345 | 0.000 | 0.924 | 3.842 | n/a | 0.000 | 2.307 | 1.518 | 5.042 | 0.044 | 0.000 | 2.416 | 9.642 | 2.722 | n/a | 0.062 | 6.129 | 0.412 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d000000000000076b | 17.936 | 2.650 | n/a | 0.000 | 0.052 | 0.497 | 4.393 | 0.013 | 0.000 | 0.087 | 8.719 | 1.501 | n/a | 0.025 | 2.702 | 0.151 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000085e | 17.044 | 4.155 | n/a | 0.000 | 1.974 | 0.767 | 0.851 | 0.014 | 0.000 | 0.128 | 8.227 | 0.896 | n/a | 0.032 | 6.129 | 0.360 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000007de | 15.594 | 3.020 | n/a | 0.000 | 0.120 | 0.515 | 2.674 | 0.020 | 0.000 | 0.334 | 7.961 | 0.899 | n/a | 0.052 | 3.140 | 0.201 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000809 | 15.125 | 2.800 | n/a | 0.000 | 0.104 | 0.391 | 0.818 | 0.011 | 0.000 | 0.063 | 8.175 | 2.722 | n/a | 0.041 | 2.905 | 0.192 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000083f | 14.717 | 1.930 | n/a | 0.000 | 0.043 | 0.354 | 0.891 | 0.015 | 0.000 | 0.071 | 10.903 | 0.486 | n/a | 0.023 | 1.973 | 0.134 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000079f | 14.558 | 3.019 | n/a | 0.000 | 0.086 | 1.334 | 1.626 | 0.029 | 0.000 | 0.989 | 6.420 | 1.007 | n/a | 0.049 | 3.104 | 0.213 | 0.049 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000085a | 14.496 | 2.968 | n/a | 0.000 | 0.110 | 0.456 | 1.097 | 0.013 | 0.000 | 0.359 | 9.022 | 0.430 | n/a | 0.041 | 3.078 | 0.212 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000869 | 14.232 | 2.452 | n/a | 0.000 | 0.075 | 0.677 | 5.042 | 0.027 | 0.000 | 0.110 | 5.386 | 0.429 | n/a | 0.033 | 2.527 | 0.178 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000086c | 14.201 | 2.753 | n/a | 0.000 | 2.307 | 0.484 | 1.049 | 0.014 | 0.000 | 0.411 | 6.711 | 0.451 | n/a | 0.021 | 5.060 | 0.356 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000084a | 13.833 | 3.487 | n/a | 0.000 | 0.120 | 0.649 | 1.626 | 0.026 | 0.000 | 0.246 | 6.598 | 1.022 | n/a | 0.059 | 3.606 | 0.261 | 0.059 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000078b | 13.464 | 1.794 | n/a | 0.000 | 0.040 | 0.326 | 0.826 | 0.012 | 0.000 | 0.365 | 9.642 | 0.436 | n/a | 0.023 | 1.834 | 0.136 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.080ms |
| 6fb6d8d1d8937b2d00000000000007dc | 13.451 | 1.860 | n/a | 0.000 | 0.047 | 0.319 | 0.817 | 0.012 | 0.000 | 0.064 | 9.288 | 1.020 | n/a | 0.025 | 1.907 | 0.142 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.076ms |
| 6fb6d8d1d8937b2d0000000000000865 | 13.441 | 2.462 | n/a | 0.000 | 0.043 | 0.857 | 1.611 | 0.028 | 0.000 | 0.131 | 7.214 | 1.068 | n/a | 0.027 | 2.505 | 0.186 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000784 | 13.424 | 3.842 | n/a | 0.000 | 3.034 | 0.658 | 0.949 | 0.014 | 0.000 | 0.371 | 4.011 | 0.503 | n/a | 0.042 | 6.876 | 0.512 | 0.042 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000007f2 | 13.419 | 1.980 | n/a | 0.000 | 0.043 | 0.585 | 4.808 | 0.019 | 0.000 | 0.107 | 5.412 | 0.440 | n/a | 0.026 | 2.023 | 0.151 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000082a | 13.214 | 2.945 | n/a | 0.000 | 0.079 | 0.505 | 0.802 | 0.011 | 0.000 | 0.093 | 8.310 | 0.435 | n/a | 0.033 | 3.024 | 0.229 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000081b | 13.109 | 2.725 | n/a | 0.000 | 0.082 | 0.624 | 1.383 | 0.023 | 0.000 | 0.218 | 5.486 | 2.532 | n/a | 0.036 | 2.808 | 0.214 | 0.036 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000872 | 13.052 | 3.119 | n/a | 0.000 | 0.119 | 0.754 | 1.560 | 0.025 | 0.000 | 0.128 | 6.813 | 0.487 | n/a | 0.048 | 3.238 | 0.248 | 0.048 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000814 | 13.036 | 1.913 | n/a | 0.000 | 0.048 | 0.596 | 1.543 | 0.024 | 0.000 | 0.128 | 8.281 | 0.478 | n/a | 0.024 | 1.961 | 0.150 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000081f | 12.905 | 1.910 | n/a | 0.000 | 0.044 | 0.364 | 0.848 | 0.012 | 0.000 | 3.266 | 5.356 | 1.080 | n/a | 0.026 | 1.954 | 0.151 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-500 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.321 | 0.555 | 0.000 | 0.550 | 2.475 | n/a | 0.000 | 0.051 | 0.481 | 0.992 | 0.014 | 0.000 | 0.128 | 4.655 | 0.493 | n/a | 0.028 | 2.639 | 0.264 | 0.028 |
| p99 | 23.867 | 1.832 | 0.012 | 2.034 | 5.176 | n/a | 2.223 | 4.117 | 1.465 | 4.619 | 0.034 | 0.000 | 3.581 | 14.698 | 1.123 | n/a | 0.096 | 7.727 | 0.488 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d0000000000000955 | 53.733 | 5.176 | n/a | 0.000 | 39.563 | 1.169 | 1.643 | 0.028 | 0.000 | 0.811 | 4.765 | 0.541 | n/a | 0.037 | 44.738 | 0.833 | 0.037 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 6fb6d8d1d8937b2d00000000000008d6 | 23.867 | 1.839 | n/a | 0.000 | 0.049 | 0.375 | 0.815 | 0.012 | 0.000 | 0.064 | 20.250 | 0.436 | n/a | 0.026 | 1.888 | 0.079 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000a12 | 22.808 | 2.802 | n/a | 0.000 | 2.109 | 0.541 | 1.596 | 0.037 | 0.000 | 0.127 | 14.698 | 0.873 | n/a | 0.024 | 4.911 | 0.215 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000009b2 | 18.165 | 2.227 | n/a | 0.000 | 0.051 | 0.642 | 4.871 | 0.029 | 0.000 | 0.154 | 9.203 | 0.956 | n/a | 0.033 | 2.278 | 0.125 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000969 | 17.470 | 2.213 | n/a | 1.433 | 0.034 | 0.324 | 4.253 | 0.012 | 0.000 | 0.067 | 8.054 | 1.057 | n/a | 0.023 | 3.680 | 0.211 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000944 | 17.273 | 3.524 | n/a | 0.000 | 0.044 | 0.589 | 4.561 | 0.015 | 0.000 | 0.079 | 7.988 | 0.444 | n/a | 0.028 | 3.568 | 0.207 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000009ef | 16.238 | 3.611 | n/a | 0.000 | 4.117 | 0.393 | 0.834 | 0.014 | 0.000 | 0.105 | 6.192 | 0.861 | n/a | 0.111 | 7.727 | 0.476 | 0.111 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000009b7 | 14.409 | 1.992 | n/a | 0.000 | 0.043 | 0.653 | 1.391 | 0.024 | 0.000 | 0.104 | 9.173 | 1.001 | n/a | 0.028 | 2.036 | 0.141 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000a23 | 14.380 | 1.890 | n/a | 0.000 | 0.041 | 0.359 | 1.082 | 0.014 | 0.000 | 3.725 | 6.309 | 0.939 | n/a | 0.023 | 1.931 | 0.134 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000009d3 | 14.330 | 2.641 | n/a | 0.000 | 0.081 | 0.635 | 1.756 | 0.025 | 0.000 | 3.581 | 5.146 | 0.439 | n/a | 0.026 | 2.722 | 0.190 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000009ad | 14.255 | 2.740 | n/a | 0.000 | 2.124 | 0.603 | 1.659 | 0.029 | 0.000 | 0.131 | 6.068 | 0.859 | n/a | 0.042 | 4.864 | 0.341 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000097b | 14.169 | 4.649 | n/a | 0.000 | 0.104 | 0.848 | 1.716 | 0.029 | 0.000 | 0.142 | 6.146 | 0.472 | n/a | 0.063 | 4.753 | 0.335 | 0.063 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000009a3 | 13.908 | 5.745 | n/a | 0.000 | 0.165 | 0.363 | 1.067 | 0.014 | 0.000 | 0.379 | 5.391 | 0.724 | n/a | 0.060 | 5.910 | 0.425 | 0.060 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000095f | 13.325 | 3.040 | n/a | 1.440 | 0.038 | 0.694 | 1.660 | 0.030 | 0.000 | 0.127 | 5.663 | 0.607 | n/a | 0.026 | 4.519 | 0.339 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000a19 | 13.321 | 1.959 | n/a | 0.000 | 0.039 | 0.542 | 1.407 | 0.023 | 0.000 | 0.156 | 8.306 | 0.865 | n/a | 0.025 | 1.998 | 0.150 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000964 | 13.312 | 2.505 | n/a | 1.436 | 0.041 | 0.556 | 1.483 | 0.026 | 0.000 | 0.151 | 6.152 | 0.938 | n/a | 0.024 | 3.982 | 0.299 | 0.024 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000090d | 13.266 | 4.788 | n/a | 0.000 | 0.145 | 0.950 | 0.894 | 0.017 | 0.000 | 0.369 | 5.534 | 0.503 | n/a | 0.065 | 4.933 | 0.372 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000a28 | 13.264 | 2.007 | n/a | 0.000 | 0.040 | 0.496 | 1.484 | 0.021 | 0.000 | 0.736 | 7.999 | 0.461 | n/a | 0.022 | 2.046 | 0.154 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000958 | 12.980 | 3.702 | n/a | 2.534 | 0.101 | 0.497 | 1.073 | 0.013 | 0.000 | 0.120 | 4.361 | 0.526 | n/a | 0.052 | 6.338 | 0.488 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000a2e | 12.939 | 3.019 | n/a | 0.000 | 0.039 | 2.115 | 0.939 | 0.013 | 0.000 | 0.113 | 5.788 | 0.889 | n/a | 0.024 | 3.058 | 0.236 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-500 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.321 | 0.555 | 0.000 | 0.550 | 2.475 | n/a | 0.000 | 0.051 | 0.481 | 0.992 | 0.014 | 0.000 | 0.128 | 4.655 | 0.493 | n/a | 0.028 | 2.639 | 0.264 | 0.028 |
| p99 | 23.867 | 1.832 | 0.012 | 2.034 | 5.176 | n/a | 2.223 | 4.117 | 1.465 | 4.619 | 0.034 | 0.000 | 3.581 | 14.698 | 1.123 | n/a | 0.096 | 7.727 | 0.488 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d0000000000000955 | 53.733 | 5.176 | n/a | 0.000 | 39.563 | 1.169 | 1.643 | 0.028 | 0.000 | 0.811 | 4.765 | 0.541 | n/a | 0.037 | 44.738 | 0.833 | 0.037 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 6fb6d8d1d8937b2d00000000000008d6 | 23.867 | 1.839 | n/a | 0.000 | 0.049 | 0.375 | 0.815 | 0.012 | 0.000 | 0.064 | 20.250 | 0.436 | n/a | 0.026 | 1.888 | 0.079 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000a12 | 22.808 | 2.802 | n/a | 0.000 | 2.109 | 0.541 | 1.596 | 0.037 | 0.000 | 0.127 | 14.698 | 0.873 | n/a | 0.024 | 4.911 | 0.215 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000009b2 | 18.165 | 2.227 | n/a | 0.000 | 0.051 | 0.642 | 4.871 | 0.029 | 0.000 | 0.154 | 9.203 | 0.956 | n/a | 0.033 | 2.278 | 0.125 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000969 | 17.470 | 2.213 | n/a | 1.433 | 0.034 | 0.324 | 4.253 | 0.012 | 0.000 | 0.067 | 8.054 | 1.057 | n/a | 0.023 | 3.680 | 0.211 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000944 | 17.273 | 3.524 | n/a | 0.000 | 0.044 | 0.589 | 4.561 | 0.015 | 0.000 | 0.079 | 7.988 | 0.444 | n/a | 0.028 | 3.568 | 0.207 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000009ef | 16.238 | 3.611 | n/a | 0.000 | 4.117 | 0.393 | 0.834 | 0.014 | 0.000 | 0.105 | 6.192 | 0.861 | n/a | 0.111 | 7.727 | 0.476 | 0.111 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000009b7 | 14.409 | 1.992 | n/a | 0.000 | 0.043 | 0.653 | 1.391 | 0.024 | 0.000 | 0.104 | 9.173 | 1.001 | n/a | 0.028 | 2.036 | 0.141 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000a23 | 14.380 | 1.890 | n/a | 0.000 | 0.041 | 0.359 | 1.082 | 0.014 | 0.000 | 3.725 | 6.309 | 0.939 | n/a | 0.023 | 1.931 | 0.134 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000009d3 | 14.330 | 2.641 | n/a | 0.000 | 0.081 | 0.635 | 1.756 | 0.025 | 0.000 | 3.581 | 5.146 | 0.439 | n/a | 0.026 | 2.722 | 0.190 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000009ad | 14.255 | 2.740 | n/a | 0.000 | 2.124 | 0.603 | 1.659 | 0.029 | 0.000 | 0.131 | 6.068 | 0.859 | n/a | 0.042 | 4.864 | 0.341 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000097b | 14.169 | 4.649 | n/a | 0.000 | 0.104 | 0.848 | 1.716 | 0.029 | 0.000 | 0.142 | 6.146 | 0.472 | n/a | 0.063 | 4.753 | 0.335 | 0.063 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d00000000000009a3 | 13.908 | 5.745 | n/a | 0.000 | 0.165 | 0.363 | 1.067 | 0.014 | 0.000 | 0.379 | 5.391 | 0.724 | n/a | 0.060 | 5.910 | 0.425 | 0.060 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000095f | 13.325 | 3.040 | n/a | 1.440 | 0.038 | 0.694 | 1.660 | 0.030 | 0.000 | 0.127 | 5.663 | 0.607 | n/a | 0.026 | 4.519 | 0.339 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000a19 | 13.321 | 1.959 | n/a | 0.000 | 0.039 | 0.542 | 1.407 | 0.023 | 0.000 | 0.156 | 8.306 | 0.865 | n/a | 0.025 | 1.998 | 0.150 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000964 | 13.312 | 2.505 | n/a | 1.436 | 0.041 | 0.556 | 1.483 | 0.026 | 0.000 | 0.151 | 6.152 | 0.938 | n/a | 0.024 | 3.982 | 0.299 | 0.024 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d000000000000090d | 13.266 | 4.788 | n/a | 0.000 | 0.145 | 0.950 | 0.894 | 0.017 | 0.000 | 0.369 | 5.534 | 0.503 | n/a | 0.065 | 4.933 | 0.372 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000a28 | 13.264 | 2.007 | n/a | 0.000 | 0.040 | 0.496 | 1.484 | 0.021 | 0.000 | 0.736 | 7.999 | 0.461 | n/a | 0.022 | 2.046 | 0.154 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000958 | 12.980 | 3.702 | n/a | 2.534 | 0.101 | 0.497 | 1.073 | 0.013 | 0.000 | 0.120 | 4.361 | 0.526 | n/a | 0.052 | 6.338 | 0.488 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000a2e | 12.939 | 3.019 | n/a | 0.000 | 0.039 | 2.115 | 0.939 | 0.013 | 0.000 | 0.113 | 5.788 | 0.889 | n/a | 0.024 | 3.058 | 0.236 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.884 | 0.227 | 0.000 | 0.552 | 2.593 | n/a | 0.000 | 0.063 | 0.565 | 1.073 | 0.018 | 0.000 | 0.146 | 5.103 | 0.564 | n/a | 0.033 | 2.972 | 0.268 | 0.033 |
| p99 | 17.415 | 2.077 | 0.044 | 2.113 | 5.503 | n/a | 1.766 | 2.677 | 1.454 | 2.677 | 0.048 | 0.000 | 1.502 | 10.322 | 1.558 | n/a | 0.102 | 6.134 | 0.469 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d0000000000000adc | 18.255 | 4.961 | n/a | 0.000 | 0.213 | 1.277 | 1.974 | 0.025 | 0.000 | 1.568 | 7.414 | 0.725 | n/a | 0.099 | 5.174 | 0.283 | 0.099 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000adf | 17.415 | 5.069 | n/a | 0.000 | 0.284 | 0.889 | 1.401 | 0.023 | 0.000 | 1.502 | 7.367 | 0.777 | n/a | 0.102 | 5.353 | 0.307 | 0.102 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000bdf | 16.612 | 5.035 | n/a | 0.000 | 0.163 | 1.454 | 2.424 | 0.048 | 0.000 | 0.903 | 5.629 | 0.881 | n/a | 0.076 | 5.197 | 0.313 | 0.076 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000afa | 16.376 | 3.987 | n/a | 0.000 | 2.147 | 0.961 | 1.196 | 0.024 | 0.000 | 0.202 | 6.244 | 1.558 | n/a | 0.058 | 6.134 | 0.375 | 0.058 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000bba | 16.342 | 2.587 | n/a | 0.000 | 2.706 | 0.403 | 0.939 | 0.018 | 0.000 | 0.159 | 8.438 | 1.065 | n/a | 0.027 | 5.293 | 0.324 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000b9f | 16.293 | 4.205 | n/a | 0.000 | 0.176 | 0.700 | 2.128 | 0.043 | 0.000 | 0.183 | 8.146 | 0.625 | n/a | 0.086 | 4.381 | 0.269 | 0.086 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000b4b | 16.268 | 2.130 | n/a | 0.000 | 0.052 | 0.406 | 1.073 | 0.017 | 0.000 | 0.093 | 11.349 | 1.118 | n/a | 0.030 | 2.182 | 0.134 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000bdc | 15.630 | 5.831 | n/a | 0.000 | 0.116 | 0.706 | 1.366 | 0.022 | 0.000 | 0.535 | 6.128 | 0.815 | n/a | 0.110 | 5.947 | 0.380 | 0.110 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000be2 | 15.575 | 4.574 | n/a | 0.000 | 0.109 | 0.668 | 1.364 | 0.018 | 0.000 | 0.420 | 7.063 | 1.297 | n/a | 0.062 | 4.683 | 0.301 | 0.062 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000a64 | 15.512 | 3.005 | n/a | 0.000 | 0.082 | 0.486 | 0.927 | 0.019 | 0.000 | 0.113 | 10.322 | 0.511 | n/a | 0.048 | 3.087 | 0.199 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000af1 | 15.480 | 5.503 | n/a | 0.000 | 1.764 | 0.658 | 0.986 | 0.018 | 0.000 | 0.145 | 5.854 | 0.510 | n/a | 0.042 | 7.268 | 0.469 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000acd | 15.426 | 3.116 | n/a | 0.000 | 0.066 | 1.016 | 2.097 | 0.047 | 0.000 | 0.218 | 8.291 | 0.525 | n/a | 0.049 | 3.183 | 0.206 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000b06 | 14.581 | 2.278 | n/a | 0.000 | 0.061 | 0.874 | 1.957 | 0.039 | 0.000 | 0.197 | 8.073 | 1.064 | n/a | 0.038 | 2.339 | 0.160 | 0.038 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000b0c | 14.527 | 2.559 | n/a | 0.000 | 2.677 | 0.477 | 1.176 | 0.022 | 0.000 | 0.222 | 6.259 | 1.105 | n/a | 0.029 | 5.236 | 0.360 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000afd | 14.342 | 3.748 | n/a | 1.445 | 0.118 | 0.774 | 1.658 | 0.030 | 0.000 | 0.584 | 5.379 | 0.536 | n/a | 0.068 | 5.312 | 0.370 | 0.068 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000bcf | 14.271 | 4.125 | n/a | 0.000 | 0.140 | 1.276 | 1.171 | 0.024 | 0.000 | 0.500 | 6.308 | 0.667 | n/a | 0.062 | 4.264 | 0.299 | 0.062 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000b0f | 14.022 | 3.099 | n/a | 0.000 | 0.083 | 0.815 | 0.803 | 0.013 | 0.000 | 0.113 | 8.475 | 0.583 | n/a | 0.040 | 3.181 | 0.227 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000b2d | 13.938 | 2.311 | n/a | 0.000 | 0.429 | 0.430 | 0.989 | 0.017 | 0.000 | 0.303 | 8.360 | 1.044 | n/a | 0.055 | 2.740 | 0.197 | 0.055 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000b24 | 13.506 | 3.168 | n/a | 0.000 | 0.066 | 0.871 | 2.188 | 0.035 | 0.000 | 0.163 | 6.418 | 0.557 | n/a | 0.040 | 3.235 | 0.239 | 0.040 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000bb4 | 13.489 | 3.061 | n/a | 0.000 | 0.063 | 0.984 | 2.097 | 0.045 | 0.000 | 0.205 | 6.436 | 0.554 | n/a | 0.045 | 3.124 | 0.232 | 0.045 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit / 5-10 facts (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.884 | 0.227 | 0.000 | 0.552 | 2.593 | n/a | 0.000 | 0.063 | 0.565 | 1.073 | 0.018 | 0.000 | 0.146 | 5.103 | 0.564 | n/a | 0.033 | 2.972 | 0.268 | 0.033 |
| p99 | 17.415 | 2.077 | 0.044 | 2.113 | 5.503 | n/a | 1.766 | 2.677 | 1.454 | 2.677 | 0.048 | 0.000 | 1.502 | 10.322 | 1.558 | n/a | 0.102 | 6.134 | 0.469 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6fb6d8d1d8937b2d0000000000000adc | 18.255 | 4.961 | n/a | 0.000 | 0.213 | 1.277 | 1.974 | 0.025 | 0.000 | 1.568 | 7.414 | 0.725 | n/a | 0.099 | 5.174 | 0.283 | 0.099 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000adf | 17.415 | 5.069 | n/a | 0.000 | 0.284 | 0.889 | 1.401 | 0.023 | 0.000 | 1.502 | 7.367 | 0.777 | n/a | 0.102 | 5.353 | 0.307 | 0.102 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000bdf | 16.612 | 5.035 | n/a | 0.000 | 0.163 | 1.454 | 2.424 | 0.048 | 0.000 | 0.903 | 5.629 | 0.881 | n/a | 0.076 | 5.197 | 0.313 | 0.076 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000afa | 16.376 | 3.987 | n/a | 0.000 | 2.147 | 0.961 | 1.196 | 0.024 | 0.000 | 0.202 | 6.244 | 1.558 | n/a | 0.058 | 6.134 | 0.375 | 0.058 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000bba | 16.342 | 2.587 | n/a | 0.000 | 2.706 | 0.403 | 0.939 | 0.018 | 0.000 | 0.159 | 8.438 | 1.065 | n/a | 0.027 | 5.293 | 0.324 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000b9f | 16.293 | 4.205 | n/a | 0.000 | 0.176 | 0.700 | 2.128 | 0.043 | 0.000 | 0.183 | 8.146 | 0.625 | n/a | 0.086 | 4.381 | 0.269 | 0.086 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000b4b | 16.268 | 2.130 | n/a | 0.000 | 0.052 | 0.406 | 1.073 | 0.017 | 0.000 | 0.093 | 11.349 | 1.118 | n/a | 0.030 | 2.182 | 0.134 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000bdc | 15.630 | 5.831 | n/a | 0.000 | 0.116 | 0.706 | 1.366 | 0.022 | 0.000 | 0.535 | 6.128 | 0.815 | n/a | 0.110 | 5.947 | 0.380 | 0.110 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000be2 | 15.575 | 4.574 | n/a | 0.000 | 0.109 | 0.668 | 1.364 | 0.018 | 0.000 | 0.420 | 7.063 | 1.297 | n/a | 0.062 | 4.683 | 0.301 | 0.062 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000a64 | 15.512 | 3.005 | n/a | 0.000 | 0.082 | 0.486 | 0.927 | 0.019 | 0.000 | 0.113 | 10.322 | 0.511 | n/a | 0.048 | 3.087 | 0.199 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000af1 | 15.480 | 5.503 | n/a | 0.000 | 1.764 | 0.658 | 0.986 | 0.018 | 0.000 | 0.145 | 5.854 | 0.510 | n/a | 0.042 | 7.268 | 0.469 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000acd | 15.426 | 3.116 | n/a | 0.000 | 0.066 | 1.016 | 2.097 | 0.047 | 0.000 | 0.218 | 8.291 | 0.525 | n/a | 0.049 | 3.183 | 0.206 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000b06 | 14.581 | 2.278 | n/a | 0.000 | 0.061 | 0.874 | 1.957 | 0.039 | 0.000 | 0.197 | 8.073 | 1.064 | n/a | 0.038 | 2.339 | 0.160 | 0.038 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000b0c | 14.527 | 2.559 | n/a | 0.000 | 2.677 | 0.477 | 1.176 | 0.022 | 0.000 | 0.222 | 6.259 | 1.105 | n/a | 0.029 | 5.236 | 0.360 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000afd | 14.342 | 3.748 | n/a | 1.445 | 0.118 | 0.774 | 1.658 | 0.030 | 0.000 | 0.584 | 5.379 | 0.536 | n/a | 0.068 | 5.312 | 0.370 | 0.068 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000bcf | 14.271 | 4.125 | n/a | 0.000 | 0.140 | 1.276 | 1.171 | 0.024 | 0.000 | 0.500 | 6.308 | 0.667 | n/a | 0.062 | 4.264 | 0.299 | 0.062 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000b0f | 14.022 | 3.099 | n/a | 0.000 | 0.083 | 0.815 | 0.803 | 0.013 | 0.000 | 0.113 | 8.475 | 0.583 | n/a | 0.040 | 3.181 | 0.227 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000b2d | 13.938 | 2.311 | n/a | 0.000 | 0.429 | 0.430 | 0.989 | 0.017 | 0.000 | 0.303 | 8.360 | 1.044 | n/a | 0.055 | 2.740 | 0.197 | 0.055 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000b24 | 13.506 | 3.168 | n/a | 0.000 | 0.066 | 0.871 | 2.188 | 0.035 | 0.000 | 0.163 | 6.418 | 0.557 | n/a | 0.040 | 3.235 | 0.239 | 0.040 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6fb6d8d1d8937b2d0000000000000bb4 | 13.489 | 3.061 | n/a | 0.000 | 0.063 | 0.984 | 2.097 | 0.045 | 0.000 | 0.205 | 6.436 | 0.554 | n/a | 0.045 | 3.124 | 0.232 | 0.045 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.600 | n/a | n/a | n/a | 0.065 | n/a | 0.000 | 0.000 | 0.848 | 200.627 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.115 | 0.065 | 0.000 | 0.115 |
| p99 | 399.646 | n/a | n/a | n/a | 16.363 | n/a | 2.841 | 0.000 | 3.628 | 387.913 | 0.101 | 7.660 | 0.128 | 0.000 | n/a | n/a | 0.369 | 19.204 | 0.146 | 0.369 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68ae41d0e446fa780000000000000002 | 399.646 | 3.771 | n/a | 0.000 | 0.000 | 1.785 | 387.913 | 0.101 | 5.620 | 0.087 | 0.000 | n/a | n/a | 0.369 | 3.771 | 0.009 | 0.369 | gw-r/thread-52/gateway.admitted-work | none observed |
| 20a39cc23fb3737a0000000000000005 | 202.669 | 0.075 | n/a | 0.000 | 0.000 | 1.243 | 201.010 | 0.013 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.226 | 0.075 | 0.000 | 0.226 | gw-r/thread-47/journal/page | none observed |
| 20a39cc23fb3737a000000000000091e | 201.946 | 0.034 | n/a | 0.000 | 0.000 | 0.972 | 200.791 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.102 | 0.034 | 0.000 | 0.102 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a0000000000000920 | 201.660 | 0.042 | n/a | 0.000 | 0.000 | 0.848 | 200.627 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.100 | 0.042 | 0.000 | 0.100 | gw-r/thread-49/journal/page | none observed |
| 20a39cc23fb3737a000000000000091f | 201.600 | 0.065 | n/a | 0.000 | 0.000 | 0.724 | 200.640 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.131 | 0.065 | 0.000 | 0.131 | gw-r/thread-47/journal/page | none observed |
| 20a39cc23fb3737a000000000000091d | 201.473 | 0.041 | n/a | 0.000 | 0.000 | 0.698 | 200.578 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.115 | 0.041 | 0.000 | 0.115 | gw-r/thread-50/journal/page | none observed |
| 20a39cc23fb3737a0000000000000006 | 184.806 | 0.115 | n/a | 0.000 | 0.000 | 0.819 | 183.638 | 0.021 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.085 | 0.115 | 0.001 | 0.085 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a0000000000000923 | 131.608 | 16.363 | n/a | 2.841 | 0.000 | 3.628 | 100.919 | 0.003 | 7.660 | 0.003 | 0.000 | n/a | n/a | 0.192 | 19.204 | 0.146 | 0.192 | gw-r/thread-49/gateway.admitted-work | none observed |
| 20a39cc23fb3737a0000000000000299 | 97.192 | 0.042 | n/a | 0.000 | 0.000 | 0.395 | 96.686 | 0.002 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.055 | 0.042 | 0.000 | 0.055 | gw-r/thread-51/journal/page | none observed |

## P3 / outside-phases / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.839 | n/a | n/a | n/a | 2.294 | n/a | 0.000 | 0.000 | 1.186 | 46.244 | 0.003 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.100 | 2.294 | 0.059 | 0.100 |
| p99 | 1006.855 | n/a | n/a | n/a | 6.263 | n/a | 0.000 | 0.000 | 2.894 | 1000.879 | 0.013 | 0.000 | 1.483 | 0.000 | n/a | n/a | 1.301 | 6.263 | 0.209 | 1.301 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68ae41d0e446fa7800000000000000a4 | 1006.855 | 0.287 | n/a | 0.000 | 0.000 | 2.894 | 1000.879 | 0.013 | 0.000 | 1.483 | 0.000 | n/a | n/a | 1.301 | 0.287 | 0.000 | 1.301 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa7800000000000005b8 | 105.633 | 6.263 | n/a | 0.000 | 0.000 | 1.635 | 97.582 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.100 | 6.263 | 0.059 | 0.100 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa78000000000000048c | 51.839 | 4.289 | n/a | 0.000 | 0.000 | 1.186 | 46.244 | 0.003 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.102 | 4.289 | 0.083 | 0.102 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa78000000000000035d | 10.994 | 2.294 | n/a | 0.000 | 0.000 | 0.479 | 8.132 | 0.002 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.069 | 2.294 | 0.209 | 0.069 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / internal (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.424 | n/a | n/a | n/a | 2.461 | n/a | 0.000 | 0.000 | 0.649 | 20.466 | 0.009 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.066 | 2.461 | 0.106 | 0.066 |
| p99 | 62.875 | n/a | n/a | n/a | 8.123 | n/a | 0.000 | 0.000 | 4.891 | 56.426 | 0.723 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.301 | 8.123 | 0.563 | 0.301 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68ae41d0e446fa780000000000000232 | 1002.479 | 0.103 | n/a | 0.000 | 0.000 | 0.462 | 1000.755 | 0.007 | 0.000 | 0.055 | 0.000 | n/a | n/a | 1.099 | 0.103 | 0.000 | 1.099 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa7800000000000000a5 | 67.704 | 4.728 | n/a | 0.000 | 0.000 | 0.725 | 61.785 | 0.013 | 0.000 | 0.254 | 0.000 | n/a | n/a | 0.199 | 4.728 | 0.070 | 0.199 | gw-r/thread-48/journal/page | none observed |
| 68ae41d0e446fa78000000000000013f | 62.875 | 4.139 | n/a | 0.000 | 0.000 | 0.581 | 56.426 | 1.483 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.220 | 4.139 | 0.066 | 0.220 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa7800000000000001c8 | 58.922 | 13.280 | n/a | 0.000 | 0.000 | 36.094 | 9.394 | 0.006 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.104 | 13.280 | 0.225 | 0.104 | node-14/thread-3/socket.wait-first-byte | none observed |
| 68ae41d0e446fa7800000000000000db | 56.703 | 5.346 | n/a | 0.000 | 0.000 | 0.450 | 31.328 | 0.006 | 19.381 | 0.024 | 0.000 | n/a | n/a | 0.169 | 5.346 | 0.094 | 0.169 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa780000000000000168 | 45.728 | 2.250 | n/a | 0.000 | 0.000 | 0.430 | 26.911 | 1.617 | 14.385 | 0.072 | 0.000 | n/a | n/a | 0.063 | 2.250 | 0.049 | 0.063 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa78000000000000017a | 40.154 | 4.417 | n/a | 0.000 | 0.000 | 0.709 | 34.808 | 0.016 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.111 | 4.417 | 0.110 | 0.111 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa7800000000000001c5 | 39.769 | 8.123 | n/a | 0.000 | 0.000 | 6.235 | 25.201 | 0.031 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.096 | 8.123 | 0.204 | 0.096 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa7800000000000000cb | 34.570 | 5.537 | n/a | 0.000 | 0.000 | 1.062 | 27.729 | 0.011 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.152 | 5.537 | 0.160 | 0.152 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa780000000000000111 | 34.401 | 2.648 | n/a | 0.000 | 0.000 | 0.459 | 31.193 | 0.010 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.061 | 2.648 | 0.077 | 0.061 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa7800000000000000b3 | 33.756 | 5.574 | n/a | 0.000 | 0.000 | 2.058 | 25.730 | 0.010 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.301 | 5.574 | 0.165 | 0.301 | gw-r/thread-48/journal/page | none observed |
| 68ae41d0e446fa780000000000000227 | 33.362 | 2.139 | n/a | 0.000 | 0.000 | 0.369 | 30.756 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.054 | 2.139 | 0.064 | 0.054 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa7800000000000000d7 | 32.960 | 3.338 | n/a | 0.000 | 0.000 | 1.436 | 28.066 | 0.007 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.072 | 3.338 | 0.101 | 0.072 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa780000000000000121 | 32.851 | 2.573 | n/a | 0.000 | 0.000 | 0.573 | 29.556 | 0.016 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.071 | 2.573 | 0.078 | 0.071 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa78000000000000021d | 32.816 | 2.586 | n/a | 0.000 | 0.000 | 0.499 | 29.557 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.117 | 2.586 | 0.079 | 0.117 | gw-r/thread-52/journal/page | none observed |
| 68ae41d0e446fa7800000000000000e6 | 32.760 | 2.454 | n/a | 0.000 | 0.000 | 1.699 | 28.415 | 0.013 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.074 | 2.454 | 0.075 | 0.074 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa7800000000000001be | 32.482 | 2.224 | n/a | 0.000 | 0.000 | 0.497 | 29.583 | 0.019 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.053 | 2.224 | 0.068 | 0.053 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa7800000000000001b9 | 32.401 | 2.483 | n/a | 0.000 | 0.000 | 0.617 | 29.158 | 0.007 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.073 | 2.483 | 0.077 | 0.073 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa78000000000000014e | 32.272 | 2.139 | n/a | 0.000 | 0.000 | 0.418 | 29.622 | 0.007 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.058 | 2.139 | 0.066 | 0.058 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa7800000000000000ed | 32.219 | 2.135 | n/a | 0.000 | 0.000 | 0.362 | 29.104 | 0.497 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.063 | 2.135 | 0.066 | 0.063 | gw-r/thread-45/journal/page | none observed |

## P3 / idle-10 / internal (146 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.514 | n/a | n/a | n/a | 2.256 | n/a | 0.000 | 0.000 | 0.620 | 5.492 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.066 | 2.256 | 0.276 | 0.066 |
| p99 | 29.799 | n/a | n/a | n/a | 8.563 | n/a | 0.000 | 0.000 | 7.190 | 23.813 | 0.260 | 0.000 | 0.068 | 0.000 | n/a | n/a | 1.107 | 8.563 | 0.733 | 1.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68ae41d0e446fa78000000000000035c | 1002.528 | 0.112 | n/a | 0.000 | 0.000 | 0.482 | 1000.771 | 0.008 | 0.000 | 0.048 | 0.000 | n/a | n/a | 1.107 | 0.112 | 0.000 | 1.107 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa7800000000000002ea | 29.799 | 4.240 | n/a | 0.000 | 0.000 | 0.740 | 14.865 | 0.008 | 9.759 | 0.056 | 0.000 | n/a | n/a | 0.130 | 4.240 | 0.142 | 0.130 | gw-r/thread--1/jdk.GCPhasePause | none observed |
| 68ae41d0e446fa780000000000000287 | 26.386 | 2.142 | n/a | 0.000 | 0.000 | 0.346 | 23.813 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.075 | 2.142 | 0.081 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa780000000000000243 | 25.376 | 1.990 | n/a | 0.000 | 0.000 | 0.406 | 22.866 | 0.009 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.057 | 1.990 | 0.078 | 0.057 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa7800000000000002b5 | 22.708 | 4.802 | n/a | 0.000 | 0.000 | 1.762 | 15.925 | 0.002 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.199 | 4.802 | 0.211 | 0.199 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa78000000000000031b | 21.968 | 4.193 | n/a | 0.000 | 0.000 | 0.575 | 17.037 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.127 | 4.193 | 0.191 | 0.127 | gw-r/thread-52/journal/page | none observed |
| 68ae41d0e446fa78000000000000034b | 20.927 | 4.599 | n/a | 0.000 | 0.000 | 0.781 | 15.350 | 0.005 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.122 | 4.599 | 0.220 | 0.122 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa7800000000000002aa | 19.022 | 2.319 | n/a | 0.000 | 0.000 | 3.085 | 13.508 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.071 | 2.319 | 0.122 | 0.071 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa78000000000000029a | 18.788 | 2.256 | n/a | 0.000 | 0.000 | 0.654 | 15.752 | 0.008 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.073 | 2.256 | 0.120 | 0.073 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa780000000000000276 | 17.726 | 2.090 | n/a | 0.000 | 0.000 | 1.710 | 13.785 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.087 | 2.090 | 0.118 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa78000000000000023d | 17.199 | 2.347 | n/a | 0.000 | 0.000 | 4.414 | 10.320 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.070 | 2.347 | 0.136 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa7800000000000002f8 | 16.830 | 2.420 | n/a | 0.000 | 0.000 | 0.630 | 13.677 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.057 | 2.420 | 0.144 | 0.057 | gw-r/thread-52/journal/page | none observed |
| 68ae41d0e446fa7800000000000002c2 | 16.741 | 2.380 | n/a | 0.000 | 0.000 | 1.706 | 12.556 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.061 | 2.380 | 0.142 | 0.061 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa780000000000000331 | 15.829 | 2.525 | n/a | 0.000 | 0.000 | 1.580 | 11.512 | 0.136 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.064 | 2.525 | 0.160 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa78000000000000034c | 15.758 | 5.967 | n/a | 0.000 | 0.000 | 4.166 | 5.409 | 0.008 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.189 | 5.967 | 0.379 | 0.189 | node-14/thread-3/replica.fetch-feed | none observed |
| 68ae41d0e446fa7800000000000002ed | 15.582 | 9.403 | n/a | 0.000 | 0.000 | 5.244 | 0.741 | 0.002 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.187 | 9.403 | 0.603 | 0.187 | node-14/thread-3/replica.fetch-feed | none observed |
| 68ae41d0e446fa780000000000000358 | 15.300 | 5.576 | n/a | 0.000 | 0.000 | 4.066 | 3.167 | 0.004 | 0.000 | 0.012 | 0.000 | n/a | n/a | 2.474 | 5.576 | 0.364 | 2.474 | node-14/thread-3/replica.fetch-feed | none observed |
| 68ae41d0e446fa780000000000000342 | 15.108 | 2.086 | n/a | 0.000 | 0.000 | 1.238 | 11.666 | 0.028 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.063 | 2.086 | 0.138 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa7800000000000002a0 | 14.667 | 2.218 | n/a | 0.000 | 0.000 | 0.398 | 11.909 | 0.005 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.062 | 2.218 | 0.151 | 0.062 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa780000000000000322 | 14.645 | 2.215 | n/a | 0.000 | 0.000 | 1.066 | 11.247 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.054 | 2.215 | 0.151 | 0.054 | gw-r/thread-50/journal/page | none observed |

## P3 / idle-25 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.855 | n/a | n/a | n/a | 2.146 | n/a | 0.000 | 0.000 | 0.514 | 21.375 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.058 | 2.146 | 0.093 | 0.058 |
| p99 | 45.138 | n/a | n/a | n/a | 4.770 | n/a | 0.000 | 0.000 | 4.332 | 41.667 | 0.014 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.129 | 4.770 | 0.231 | 0.129 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68ae41d0e446fa780000000000000488 | 1002.370 | 0.097 | n/a | 0.000 | 0.000 | 0.417 | 1000.696 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 1.099 | 0.097 | 0.000 | 1.099 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa780000000000000421 | 45.138 | 2.459 | n/a | 0.000 | 0.000 | 0.928 | 41.667 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.055 | 2.459 | 0.054 | 0.055 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa780000000000000398 | 43.004 | 2.303 | n/a | 0.000 | 0.000 | 0.499 | 40.111 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.055 | 2.303 | 0.054 | 0.055 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa780000000000000395 | 37.286 | 3.365 | n/a | 0.000 | 0.000 | 1.376 | 32.453 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.066 | 3.365 | 0.090 | 0.066 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa7800000000000003bf | 34.413 | 2.522 | n/a | 0.000 | 0.000 | 0.716 | 31.033 | 0.010 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.066 | 2.522 | 0.073 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa780000000000000442 | 33.339 | 2.806 | n/a | 0.000 | 0.000 | 0.646 | 29.792 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.058 | 2.806 | 0.084 | 0.058 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa780000000000000452 | 33.269 | 4.177 | n/a | 0.000 | 0.000 | 1.177 | 27.779 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.104 | 4.177 | 0.126 | 0.104 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa780000000000000486 | 32.093 | 2.001 | n/a | 0.000 | 0.000 | 0.431 | 29.587 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.064 | 2.001 | 0.062 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa7800000000000003b5 | 32.021 | 3.311 | n/a | 0.000 | 0.000 | 1.742 | 26.858 | 0.005 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.057 | 3.311 | 0.103 | 0.057 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa780000000000000366 | 31.766 | 4.307 | n/a | 0.000 | 0.000 | 0.649 | 26.663 | 0.002 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.129 | 4.307 | 0.136 | 0.129 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa780000000000000404 | 31.150 | 4.662 | n/a | 0.000 | 0.000 | 2.002 | 24.327 | 0.008 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.106 | 4.662 | 0.150 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa78000000000000045d | 30.666 | 1.888 | n/a | 0.000 | 0.000 | 2.139 | 26.547 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.050 | 1.888 | 0.062 | 0.050 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa7800000000000003f6 | 30.352 | 4.691 | n/a | 0.000 | 0.000 | 1.013 | 24.500 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.101 | 4.691 | 0.155 | 0.101 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa780000000000000436 | 30.215 | 2.048 | n/a | 0.000 | 0.000 | 0.430 | 27.649 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.054 | 2.048 | 0.068 | 0.054 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa7800000000000003a1 | 29.941 | 3.137 | n/a | 0.000 | 0.000 | 1.606 | 25.004 | 0.014 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.118 | 3.137 | 0.105 | 0.118 | gw-r/thread-52/journal/page | none observed |
| 68ae41d0e446fa780000000000000374 | 29.805 | 3.128 | n/a | 0.000 | 0.000 | 0.489 | 26.080 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.055 | 3.128 | 0.105 | 0.055 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa7800000000000003db | 29.625 | 2.514 | n/a | 0.000 | 0.000 | 0.906 | 26.111 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.063 | 2.514 | 0.085 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa78000000000000040a | 29.250 | 2.273 | n/a | 0.000 | 0.000 | 0.408 | 26.479 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.056 | 2.273 | 0.078 | 0.056 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa78000000000000039d | 29.216 | 3.371 | n/a | 0.000 | 0.000 | 0.589 | 25.145 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.075 | 3.371 | 0.115 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 68ae41d0e446fa78000000000000042a | 29.164 | 2.122 | n/a | 0.000 | 0.000 | 0.396 | 26.542 | 0.008 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.053 | 2.122 | 0.073 | 0.053 | gw-r/thread-45/journal/page | none observed |

## P3 / idle-50 / internal (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 49.845 | n/a | n/a | n/a | 2.270 | n/a | 0.000 | 0.000 | 0.520 | 46.471 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.059 | 2.270 | 0.046 | 0.059 |
| p99 | 58.738 | n/a | n/a | n/a | 5.062 | n/a | 0.000 | 0.000 | 1.946 | 54.124 | 0.069 | 0.000 | 0.086 | 0.000 | n/a | n/a | 1.183 | 5.062 | 0.096 | 1.183 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68ae41d0e446fa7800000000000005b5 | 1003.130 | 0.271 | n/a | 0.000 | 0.000 | 0.858 | 1000.755 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 1.183 | 0.271 | 0.000 | 1.183 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa78000000000000056c | 58.738 | 4.004 | n/a | 0.000 | 0.000 | 0.501 | 54.124 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.097 | 4.004 | 0.068 | 0.097 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa780000000000000491 | 57.224 | 5.062 | n/a | 0.000 | 0.000 | 1.052 | 50.978 | 0.003 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.091 | 5.062 | 0.088 | 0.091 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa7800000000000005a9 | 57.217 | 4.952 | n/a | 0.000 | 0.000 | 0.454 | 51.667 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.097 | 4.952 | 0.087 | 0.097 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa78000000000000055c | 56.470 | 2.219 | n/a | 0.000 | 0.000 | 0.454 | 53.696 | 0.006 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.072 | 2.219 | 0.039 | 0.072 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa7800000000000004e5 | 56.007 | 4.591 | n/a | 0.000 | 0.000 | 0.792 | 50.473 | 0.009 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.060 | 4.591 | 0.082 | 0.060 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa780000000000000553 | 55.482 | 2.332 | n/a | 0.000 | 0.000 | 0.520 | 52.510 | 0.005 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.059 | 2.332 | 0.042 | 0.059 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa7800000000000004ea | 55.316 | 3.097 | n/a | 0.000 | 0.000 | 0.810 | 51.292 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.058 | 3.097 | 0.056 | 0.058 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa780000000000000499 | 55.248 | 3.901 | n/a | 0.000 | 0.000 | 1.009 | 50.210 | 0.003 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.097 | 3.901 | 0.071 | 0.097 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa780000000000000595 | 54.467 | 2.019 | n/a | 0.000 | 0.000 | 0.388 | 51.967 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.058 | 2.019 | 0.037 | 0.058 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa78000000000000049e | 54.136 | 1.988 | n/a | 0.000 | 0.000 | 0.537 | 51.512 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.050 | 1.988 | 0.037 | 0.050 | gw-r/thread-48/journal/page | none observed |
| 68ae41d0e446fa7800000000000005b4 | 54.078 | 4.169 | n/a | 0.000 | 0.000 | 1.104 | 48.681 | 0.002 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.105 | 4.169 | 0.077 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa78000000000000051e | 54.019 | 5.640 | n/a | 0.000 | 0.000 | 1.929 | 46.294 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.116 | 5.640 | 0.104 | 0.116 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa78000000000000050a | 53.419 | 2.062 | n/a | 0.000 | 0.000 | 0.440 | 50.794 | 0.010 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.056 | 2.062 | 0.039 | 0.056 | gw-r/thread-48/journal/page | none observed |
| 68ae41d0e446fa7800000000000004b6 | 53.294 | 3.953 | n/a | 0.000 | 0.000 | 0.611 | 48.555 | 0.009 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.114 | 3.953 | 0.074 | 0.114 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa780000000000000503 | 53.259 | 2.884 | n/a | 0.000 | 0.000 | 0.456 | 49.808 | 0.008 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.054 | 2.884 | 0.054 | 0.054 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa780000000000000564 | 53.187 | 4.441 | n/a | 0.000 | 0.000 | 1.028 | 47.588 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.088 | 4.441 | 0.084 | 0.088 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa7800000000000004d7 | 53.102 | 2.340 | n/a | 0.000 | 0.000 | 0.258 | 50.384 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.070 | 2.340 | 0.044 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa78000000000000057a | 52.797 | 3.291 | n/a | 0.000 | 0.000 | 1.130 | 46.886 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 1.451 | 3.291 | 0.062 | 1.451 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa780000000000000523 | 52.709 | 2.273 | n/a | 0.000 | 0.000 | 0.310 | 50.032 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.055 | 2.273 | 0.043 | 0.055 | gw-r/thread-66/journal/page | none observed |

## P3 / idle-100 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 100.109 | n/a | n/a | n/a | 2.309 | n/a | 0.000 | 0.000 | 0.529 | 96.491 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.062 | 2.309 | 0.023 | 0.062 |
| p99 | 250.510 | n/a | n/a | n/a | 5.390 | n/a | 0.000 | 0.000 | 3.206 | 247.724 | 0.075 | 6.944 | 0.059 | 0.000 | n/a | n/a | 0.140 | 5.390 | 0.052 | 0.140 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68ae41d0e446fa7800000000000006e2 | 1002.583 | 0.168 | n/a | 0.000 | 0.000 | 0.594 | 1000.620 | 0.003 | 0.000 | 0.043 | 0.000 | n/a | n/a | 1.155 | 0.168 | 0.000 | 1.155 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa7800000000000006e6 | 250.510 | 2.046 | n/a | 0.000 | 0.000 | 0.652 | 247.724 | 0.002 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.059 | 2.046 | 0.008 | 0.059 | gw-r/thread-48/journal/page | none observed |
| 68ae41d0e446fa7800000000000005d9 | 117.185 | 2.134 | n/a | 0.000 | 0.000 | 1.011 | 113.968 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.062 | 2.134 | 0.018 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 68ae41d0e446fa7800000000000006b3 | 108.018 | 4.312 | n/a | 0.000 | 0.000 | 0.596 | 102.959 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.105 | 4.312 | 0.040 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa7800000000000005bd | 107.788 | 3.346 | n/a | 0.000 | 0.000 | 0.967 | 103.338 | 0.002 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.121 | 3.346 | 0.031 | 0.121 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa780000000000000608 | 107.112 | 2.057 | n/a | 0.000 | 0.000 | 0.448 | 96.062 | 0.003 | 8.472 | 0.013 | 0.000 | n/a | n/a | 0.057 | 2.057 | 0.019 | 0.057 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa780000000000000653 | 105.764 | 4.670 | n/a | 0.000 | 0.000 | 2.699 | 98.262 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.096 | 4.670 | 0.044 | 0.096 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa780000000000000632 | 105.649 | 2.000 | n/a | 0.000 | 0.000 | 0.571 | 102.964 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.060 | 2.000 | 0.019 | 0.060 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa7800000000000006c6 | 105.546 | 2.645 | n/a | 0.000 | 0.000 | 0.603 | 102.204 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.058 | 2.645 | 0.025 | 0.058 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa78000000000000064d | 105.540 | 4.050 | n/a | 0.000 | 0.000 | 0.418 | 100.971 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.088 | 4.050 | 0.038 | 0.088 | gw-r/thread-51/journal/page | none observed |
| 68ae41d0e446fa7800000000000005ea | 105.093 | 3.300 | n/a | 0.000 | 0.000 | 0.388 | 101.282 | 0.002 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.097 | 3.300 | 0.031 | 0.097 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa78000000000000068c | 104.312 | 2.282 | n/a | 0.000 | 0.000 | 0.390 | 101.565 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.065 | 2.282 | 0.022 | 0.065 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa7800000000000006ae | 103.931 | 2.741 | n/a | 0.000 | 0.000 | 0.403 | 100.669 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.063 | 2.741 | 0.026 | 0.063 | gw-r/thread-52/journal/page | none observed |
| 68ae41d0e446fa780000000000000635 | 103.644 | 4.481 | n/a | 0.000 | 0.000 | 0.728 | 98.307 | 0.002 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.097 | 4.481 | 0.043 | 0.097 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa7800000000000005e2 | 103.633 | 5.454 | n/a | 0.000 | 0.000 | 0.542 | 97.484 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.116 | 5.454 | 0.053 | 0.116 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa7800000000000005c6 | 103.580 | 5.390 | n/a | 0.000 | 0.000 | 0.648 | 97.397 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.110 | 5.390 | 0.052 | 0.110 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa7800000000000005fe | 103.460 | 3.160 | n/a | 0.000 | 0.000 | 0.431 | 99.772 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.056 | 3.160 | 0.031 | 0.056 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa7800000000000005f0 | 103.108 | 2.761 | n/a | 0.000 | 0.000 | 0.599 | 99.632 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.070 | 2.761 | 0.027 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa780000000000000604 | 103.019 | 2.131 | n/a | 0.000 | 0.000 | 0.535 | 100.257 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.057 | 2.131 | 0.021 | 0.057 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa780000000000000678 | 102.814 | 4.092 | n/a | 0.000 | 0.000 | 0.544 | 97.989 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.138 | 4.092 | 0.040 | 0.138 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-250 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 249.779 | n/a | n/a | n/a | 2.430 | n/a | 0.000 | 0.000 | 0.572 | 246.394 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.064 | 2.430 | 0.010 | 0.064 |
| p99 | 500.942 | n/a | n/a | n/a | 5.265 | n/a | 0.000 | 0.000 | 2.527 | 498.291 | 0.013 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.286 | 5.265 | 0.021 | 0.286 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68ae41d0e446fa780000000000000810 | 1002.495 | 0.113 | n/a | 0.000 | 0.000 | 0.464 | 1000.769 | 0.004 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.104 | 0.113 | 0.000 | 1.104 | gw-r/thread-48/journal/page | none observed |
| 68ae41d0e446fa780000000000000813 | 500.942 | 2.054 | n/a | 0.000 | 0.000 | 0.505 | 498.291 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.065 | 2.054 | 0.004 | 0.065 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa7800000000000007d9 | 266.993 | 3.225 | n/a | 0.000 | 0.000 | 0.604 | 247.516 | 0.004 | 15.467 | 0.027 | 0.000 | n/a | n/a | 0.150 | 3.225 | 0.012 | 0.150 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa7800000000000007c4 | 258.616 | 2.316 | n/a | 0.000 | 0.000 | 0.377 | 255.823 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.056 | 2.316 | 0.009 | 0.056 | gw-r/thread-48/journal/page | none observed |
| 68ae41d0e446fa7800000000000006eb | 257.452 | 2.274 | n/a | 0.000 | 0.000 | 0.492 | 254.594 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.058 | 2.274 | 0.009 | 0.058 | gw-r/thread-52/journal/page | none observed |
| 68ae41d0e446fa7800000000000007e5 | 256.893 | 3.824 | n/a | 0.000 | 0.000 | 0.576 | 252.357 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.105 | 3.824 | 0.015 | 0.105 | gw-r/thread-52/journal/page | none observed |
| 68ae41d0e446fa78000000000000075d | 256.805 | 4.665 | n/a | 0.000 | 0.000 | 1.128 | 250.863 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.115 | 4.665 | 0.018 | 0.115 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa7800000000000007cd | 256.326 | 3.078 | n/a | 0.000 | 0.000 | 1.200 | 251.947 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.069 | 3.078 | 0.012 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 68ae41d0e446fa780000000000000795 | 256.265 | 3.409 | n/a | 0.000 | 0.000 | 1.836 | 250.914 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.071 | 3.409 | 0.013 | 0.071 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa78000000000000078b | 256.244 | 3.364 | n/a | 0.000 | 0.000 | 0.619 | 252.138 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.094 | 3.364 | 0.013 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa7800000000000007a7 | 256.078 | 2.395 | n/a | 0.000 | 0.000 | 0.449 | 253.140 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.065 | 2.395 | 0.009 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa780000000000000759 | 255.557 | 4.140 | n/a | 0.000 | 0.000 | 1.292 | 249.976 | 0.003 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.119 | 4.140 | 0.016 | 0.119 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa7800000000000007d6 | 255.471 | 4.268 | n/a | 0.000 | 0.000 | 0.423 | 250.609 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.141 | 4.268 | 0.017 | 0.141 | gw-r/thread-52/journal/page | none observed |
| 68ae41d0e446fa78000000000000076d | 255.086 | 3.517 | n/a | 0.000 | 0.000 | 0.666 | 250.781 | 0.007 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.072 | 3.517 | 0.014 | 0.072 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa780000000000000725 | 254.997 | 3.899 | n/a | 0.000 | 0.000 | 0.464 | 250.517 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.062 | 3.899 | 0.015 | 0.062 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa780000000000000805 | 254.840 | 4.394 | n/a | 0.000 | 0.000 | 0.958 | 249.396 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.067 | 4.394 | 0.017 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 68ae41d0e446fa780000000000000719 | 254.837 | 2.431 | n/a | 0.000 | 0.000 | 0.458 | 251.849 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.060 | 2.431 | 0.010 | 0.060 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa780000000000000764 | 254.837 | 3.420 | n/a | 0.000 | 0.000 | 0.968 | 250.344 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.074 | 3.420 | 0.013 | 0.074 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa78000000000000074f | 254.638 | 2.590 | n/a | 0.000 | 0.000 | 0.717 | 251.226 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.065 | 2.590 | 0.010 | 0.065 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa7800000000000007b1 | 254.395 | 2.770 | n/a | 0.000 | 0.000 | 0.602 | 250.923 | 0.008 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.055 | 2.770 | 0.011 | 0.055 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-500 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 499.698 | n/a | n/a | n/a | 2.539 | n/a | 0.000 | 0.000 | 0.551 | 496.416 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.066 | 2.539 | 0.005 | 0.066 |
| p99 | 1000.493 | n/a | n/a | n/a | 5.860 | n/a | 0.000 | 0.000 | 2.938 | 997.966 | 0.272 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.181 | 5.860 | 0.012 | 0.181 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68ae41d0e446fa78000000000000093c | 1002.232 | 0.083 | n/a | 0.000 | 0.000 | 0.402 | 1000.611 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 1.100 | 0.083 | 0.000 | 1.100 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa78000000000000093f | 1000.493 | 2.035 | n/a | 0.000 | 0.000 | 0.406 | 997.966 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.057 | 2.035 | 0.002 | 0.057 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa780000000000000891 | 541.841 | 2.377 | n/a | 0.000 | 0.000 | 0.707 | 538.659 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.057 | 2.377 | 0.004 | 0.057 | gw-r/thread-52/journal/page | none observed |
| 68ae41d0e446fa7800000000000008ae | 511.229 | 6.133 | n/a | 0.000 | 0.000 | 0.890 | 504.021 | 0.004 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.125 | 6.133 | 0.012 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa78000000000000082a | 511.015 | 2.760 | n/a | 0.000 | 0.000 | 0.494 | 507.662 | 0.003 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.073 | 2.760 | 0.005 | 0.073 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa7800000000000008d6 | 510.711 | 5.372 | n/a | 0.000 | 0.000 | 1.542 | 503.592 | 0.007 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.157 | 5.372 | 0.011 | 0.157 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa780000000000000927 | 510.393 | 2.240 | n/a | 0.000 | 0.000 | 2.180 | 505.862 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.066 | 2.240 | 0.004 | 0.066 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa7800000000000008da | 509.146 | 2.926 | n/a | 0.000 | 0.000 | 1.267 | 504.821 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.093 | 2.926 | 0.006 | 0.093 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa7800000000000008df | 507.754 | 2.389 | n/a | 0.000 | 0.000 | 0.438 | 504.782 | 0.002 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.131 | 2.389 | 0.005 | 0.131 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa7800000000000008e1 | 507.552 | 2.270 | n/a | 0.000 | 0.000 | 0.529 | 487.598 | 0.004 | 17.066 | 0.022 | 0.000 | n/a | n/a | 0.062 | 2.270 | 0.004 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 68ae41d0e446fa7800000000000008a0 | 506.946 | 2.647 | n/a | 0.000 | 0.000 | 0.386 | 503.805 | 0.007 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.057 | 2.647 | 0.005 | 0.057 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa78000000000000083f | 506.431 | 5.039 | n/a | 0.000 | 0.000 | 2.057 | 499.204 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.103 | 5.039 | 0.010 | 0.103 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa78000000000000090b | 506.431 | 2.253 | n/a | 0.000 | 0.000 | 0.336 | 503.763 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.054 | 2.253 | 0.004 | 0.054 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa7800000000000008f4 | 506.336 | 2.399 | n/a | 0.000 | 0.000 | 0.365 | 503.482 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.060 | 2.399 | 0.005 | 0.060 | gw-r/thread-48/journal/page | none observed |
| 68ae41d0e446fa7800000000000008f1 | 506.094 | 4.428 | n/a | 0.000 | 0.000 | 3.894 | 497.653 | 0.002 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.096 | 4.428 | 0.009 | 0.096 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa780000000000000882 | 505.956 | 2.196 | n/a | 0.000 | 0.000 | 0.388 | 503.257 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.070 | 2.196 | 0.004 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa780000000000000833 | 505.324 | 5.860 | n/a | 0.000 | 0.000 | 0.530 | 498.818 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.086 | 5.860 | 0.012 | 0.086 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa780000000000000938 | 505.109 | 3.607 | n/a | 0.000 | 0.000 | 0.763 | 500.647 | 0.003 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.062 | 3.607 | 0.007 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 68ae41d0e446fa78000000000000088a | 505.036 | 3.855 | n/a | 0.000 | 0.000 | 0.453 | 500.582 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.116 | 3.855 | 0.008 | 0.116 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa78000000000000089c | 504.490 | 5.853 | n/a | 0.000 | 0.000 | 0.812 | 497.741 | 0.003 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.065 | 5.853 | 0.012 | 0.065 | gw-r/thread-45/journal/page | none observed |

## P3 / idle-1000 / internal (153 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 999.830 | n/a | n/a | n/a | 3.357 | n/a | 0.000 | 0.000 | 0.594 | 994.808 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.085 | 3.604 | 0.004 | 0.085 |
| p99 | 1008.875 | n/a | n/a | n/a | 7.490 | n/a | 1.485 | 0.000 | 3.824 | 1000.976 | 0.026 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.207 | 8.964 | 0.741 | 1.207 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68ae41d0e446fa7800000000000009a7 | 1010.058 | 7.490 | n/a | 0.652 | 0.000 | 0.926 | 1000.761 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.196 | 8.142 | 0.008 | 0.196 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa7800000000000009e9 | 1008.875 | 6.689 | n/a | 0.661 | 0.000 | 0.765 | 1000.563 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.163 | 7.350 | 0.007 | 0.163 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa780000000000000985 | 1007.302 | 6.126 | n/a | 0.580 | 0.000 | 0.804 | 999.548 | 0.008 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.182 | 6.706 | 0.007 | 0.182 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa7800000000000009d3 | 1006.647 | 4.525 | n/a | 0.604 | 0.000 | 3.824 | 997.513 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.147 | 5.129 | 0.005 | 0.147 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa780000000000000955 | 1006.286 | 4.933 | n/a | 0.000 | 0.000 | 1.374 | 999.793 | 0.003 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.152 | 4.933 | 0.005 | 0.152 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa7800000000000009ed | 1005.947 | 9.501 | n/a | 0.613 | 0.000 | 0.975 | 994.683 | 0.011 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.105 | 10.114 | 0.010 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa780000000000000a57 | 1005.926 | 2.418 | n/a | 0.000 | 0.000 | 0.321 | 993.336 | 0.004 | 9.766 | 0.021 | 0.000 | n/a | n/a | 0.058 | 2.418 | 0.002 | 0.058 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa780000000000000961 | 1005.730 | 3.904 | n/a | 0.778 | 0.000 | 1.104 | 999.834 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.083 | 4.682 | 0.005 | 0.083 | gw-r/thread-52/journal/page | none observed |
| 68ae41d0e446fa780000000000000a2f | 1005.438 | 4.837 | n/a | 0.000 | 0.000 | 0.684 | 999.753 | 0.008 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.120 | 4.837 | 0.005 | 0.120 | gw-r/thread-47/journal/page | none observed |
| 68ae41d0e446fa7800000000000009b2 | 1004.790 | 4.201 | n/a | 0.458 | 0.000 | 0.686 | 999.337 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.074 | 4.660 | 0.005 | 0.074 | gw-r/thread-52/journal/page | none observed |
| 68ae41d0e446fa780000000000000a35 | 1004.552 | 2.537 | n/a | 0.000 | 0.000 | 0.439 | 1001.452 | 0.008 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.079 | 2.537 | 0.003 | 0.079 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa780000000000000a11 | 1004.535 | 5.130 | n/a | 0.000 | 0.000 | 0.683 | 998.566 | 0.008 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.113 | 5.130 | 0.005 | 0.113 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa7800000000000009e1 | 1004.106 | 5.644 | n/a | 0.000 | 0.000 | 0.734 | 997.573 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.124 | 5.644 | 0.006 | 0.124 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa7800000000000009db | 1003.929 | 7.141 | n/a | 0.625 | 0.000 | 0.728 | 995.216 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.187 | 7.767 | 0.008 | 0.187 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa7800000000000009bf | 1003.817 | 0.340 | n/a | 0.000 | 0.000 | 0.511 | 1000.976 | 0.029 | 0.000 | 0.046 | 0.000 | n/a | n/a | 1.915 | 0.340 | 0.000 | 1.915 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa780000000000000a43 | 1003.669 | 2.615 | n/a | 0.000 | 0.000 | 0.498 | 1000.438 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.081 | 2.615 | 0.003 | 0.081 | gw-r/thread-49/journal/page | none observed |
| 68ae41d0e446fa780000000000000992 | 1003.658 | 4.878 | n/a | 0.584 | 0.000 | 0.545 | 997.534 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.089 | 5.462 | 0.005 | 0.089 | gw-r/thread-45/journal/page | none observed |
| 68ae41d0e446fa780000000000000a3a | 1003.572 | 5.627 | n/a | 0.000 | 0.000 | 2.410 | 995.369 | 0.004 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.120 | 5.627 | 0.006 | 0.120 | gw-r/thread-66/journal/page | none observed |
| 68ae41d0e446fa7800000000000009fb | 1003.521 | 2.793 | n/a | 0.000 | 0.000 | 0.463 | 1000.133 | 0.009 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.073 | 2.793 | 0.003 | 0.073 | gw-r/thread-50/journal/page | none observed |
| 68ae41d0e446fa78000000000000095c | 1003.512 | 2.087 | n/a | 0.000 | 0.000 | 0.452 | 1000.869 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.055 | 2.087 | 0.002 | 0.055 | gw-r/thread-45/journal/page | none observed |

## P3 / warmup / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.481 | n/a | n/a | n/a | 0.029 | n/a | 0.000 | 0.000 | 0.484 | 200.945 | 0.010 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.063 | 0.029 | 0.000 | 0.063 |
| p99 | 203.244 | n/a | n/a | n/a | 0.048 | n/a | 0.000 | 0.000 | 1.042 | 201.912 | 0.063 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.116 | 0.048 | 0.001 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 20a39cc23fb3737a00000000000000ce | 203.244 | 0.028 | n/a | 0.000 | 0.000 | 1.042 | 201.912 | 0.059 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.063 | 0.028 | 0.000 | 0.063 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a00000000000000cd | 202.633 | 0.028 | n/a | 0.000 | 0.000 | 0.484 | 201.849 | 0.063 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.064 | 0.028 | 0.000 | 0.064 | gw-r/thread-48/journal/page | none observed |
| 20a39cc23fb3737a00000000000000cf | 202.102 | 0.039 | n/a | 0.000 | 0.000 | 0.894 | 200.973 | 0.008 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.116 | 0.039 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |
| 20a39cc23fb3737a00000000000000cc | 201.481 | 0.029 | n/a | 0.000 | 0.000 | 0.366 | 200.945 | 0.010 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.060 | 0.029 | 0.000 | 0.060 | gw-r/thread-50/journal/page | none observed |
| 20a39cc23fb3737a00000000000000d0 | 123.750 | 0.042 | n/a | 0.000 | 0.000 | 0.482 | 123.112 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.065 | 0.042 | 0.000 | 0.065 | gw-r/thread-51/journal/page | none observed |
| 20a39cc23fb3737a0000000000000052 | 60.673 | 0.048 | n/a | 0.000 | 0.000 | 0.777 | 59.670 | 0.021 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.061 | 0.048 | 0.001 | 0.061 | gw-r/thread-51/journal/page | none observed |

## P3 / idle-10 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.982 | n/a | n/a | n/a | 0.032 | n/a | 0.000 | 0.000 | 0.742 | 201.177 | 0.009 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.065 | 0.032 | 0.000 | 0.065 |
| p99 | 202.183 | n/a | n/a | n/a | 0.058 | n/a | 0.000 | 0.000 | 0.803 | 201.330 | 0.012 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.085 | 0.058 | 0.000 | 0.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 20a39cc23fb3737a0000000000000162 | 202.183 | 0.036 | n/a | 0.000 | 0.000 | 0.783 | 201.177 | 0.010 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.075 | 0.036 | 0.000 | 0.075 | gw-r/thread-51/journal/page | none observed |
| 20a39cc23fb3737a0000000000000161 | 202.161 | 0.030 | n/a | 0.000 | 0.000 | 0.742 | 201.221 | 0.009 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.064 | 0.030 | 0.000 | 0.064 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a0000000000000163 | 201.982 | 0.028 | n/a | 0.000 | 0.000 | 0.451 | 201.330 | 0.012 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.065 | 0.028 | 0.000 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 20a39cc23fb3737a0000000000000160 | 201.646 | 0.032 | n/a | 0.000 | 0.000 | 0.536 | 200.953 | 0.006 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.056 | 0.032 | 0.000 | 0.056 | gw-r/thread-48/journal/page | none observed |
| 20a39cc23fb3737a0000000000000164 | 121.803 | 0.058 | n/a | 0.000 | 0.000 | 0.803 | 120.824 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.085 | 0.058 | 0.000 | 0.085 | gw-r/thread-50/journal/page | none observed |

## P3 / idle-25 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.253 | n/a | n/a | n/a | 0.029 | n/a | 0.000 | 0.000 | 0.523 | 200.684 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.055 | 0.029 | 0.000 | 0.055 |
| p99 | 202.078 | n/a | n/a | n/a | 0.054 | n/a | 0.000 | 0.000 | 0.865 | 201.352 | 0.010 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.124 | 0.054 | 0.000 | 0.124 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 20a39cc23fb3737a00000000000001fb | 202.078 | 0.023 | n/a | 0.000 | 0.000 | 0.560 | 201.352 | 0.010 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.048 | 0.023 | 0.000 | 0.048 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a00000000000001fc | 201.907 | 0.054 | n/a | 0.000 | 0.000 | 0.865 | 200.788 | 0.007 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.124 | 0.054 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| 20a39cc23fb3737a00000000000001fd | 201.253 | 0.028 | n/a | 0.000 | 0.000 | 0.435 | 200.684 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.052 | 0.028 | 0.000 | 0.052 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a00000000000001fa | 201.107 | 0.029 | n/a | 0.000 | 0.000 | 0.330 | 200.639 | 0.007 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.055 | 0.029 | 0.000 | 0.055 | gw-r/thread-51/journal/page | none observed |
| 20a39cc23fb3737a00000000000001fe | 125.952 | 0.045 | n/a | 0.000 | 0.000 | 0.523 | 125.253 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.076 | 0.045 | 0.000 | 0.076 | gw-r/thread-45/journal/page | none observed |

## P3 / idle-50 / read (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.949 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.484 | 51.122 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.056 | 0.040 | 0.001 | 0.056 |
| p99 | 201.971 | n/a | n/a | n/a | 0.063 | n/a | 0.000 | 0.000 | 4.235 | 201.162 | 1.193 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.098 | 0.063 | 0.001 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 20a39cc23fb3737a0000000000000297 | 201.971 | 0.031 | n/a | 0.000 | 0.000 | 0.634 | 201.162 | 0.005 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.063 | 0.031 | 0.000 | 0.063 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a0000000000000295 | 201.682 | 0.037 | n/a | 0.000 | 0.000 | 0.693 | 200.815 | 0.005 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.072 | 0.037 | 0.000 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 20a39cc23fb3737a0000000000000296 | 201.656 | 0.038 | n/a | 0.000 | 0.000 | 0.713 | 200.768 | 0.004 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.074 | 0.038 | 0.000 | 0.074 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a0000000000000294 | 201.457 | 0.029 | n/a | 0.000 | 0.000 | 0.410 | 200.894 | 0.007 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.053 | 0.029 | 0.000 | 0.053 | gw-r/thread-51/journal/page | none observed |
| 20a39cc23fb3737a0000000000000298 | 159.115 | 0.056 | n/a | 0.000 | 0.000 | 0.759 | 158.184 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.076 | 0.056 | 0.000 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 20a39cc23fb3737a000000000000026f | 56.954 | 0.040 | n/a | 0.000 | 0.000 | 0.379 | 56.448 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.050 | 0.040 | 0.001 | 0.050 | gw-r/thread-47/journal/page | none observed |
| 20a39cc23fb3737a0000000000000267 | 53.687 | 0.049 | n/a | 0.000 | 0.000 | 0.441 | 53.082 | 0.008 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.056 | 0.049 | 0.001 | 0.056 | gw-r/thread-47/journal/page | none observed |
| 20a39cc23fb3737a0000000000000263 | 52.855 | 0.046 | n/a | 0.000 | 0.000 | 4.235 | 48.507 | 0.003 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.049 | 0.046 | 0.001 | 0.049 | gw-r/thread-47/journal/page | none observed |
| 20a39cc23fb3737a0000000000000284 | 51.949 | 0.063 | n/a | 0.000 | 0.000 | 0.641 | 51.122 | 0.003 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.096 | 0.063 | 0.001 | 0.096 | gw-r/thread-51/journal/page | none observed |
| 20a39cc23fb3737a0000000000000265 | 51.945 | 0.040 | n/a | 0.000 | 0.000 | 0.484 | 51.319 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.051 | 0.040 | 0.001 | 0.051 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a0000000000000208 | 51.724 | 0.043 | n/a | 0.000 | 0.000 | 0.493 | 50.305 | 0.815 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.059 | 0.043 | 0.001 | 0.059 | gw-r/thread-49/journal/page | none observed |
| 20a39cc23fb3737a0000000000000225 | 51.633 | 0.041 | n/a | 0.000 | 0.000 | 0.417 | 49.915 | 1.193 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.051 | 0.041 | 0.001 | 0.051 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a000000000000028e | 51.260 | 0.061 | n/a | 0.000 | 0.000 | 0.416 | 50.292 | 0.386 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.098 | 0.061 | 0.001 | 0.098 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a000000000000024b | 50.865 | 0.039 | n/a | 0.000 | 0.000 | 0.646 | 50.122 | 0.003 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.047 | 0.039 | 0.001 | 0.047 | gw-r/thread-48/journal/page | none observed |
| 20a39cc23fb3737a0000000000000236 | 50.522 | 0.042 | n/a | 0.000 | 0.000 | 0.424 | 49.983 | 0.003 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.059 | 0.042 | 0.001 | 0.059 | gw-r/thread-51/journal/page | none observed |
| 20a39cc23fb3737a000000000000023d | 50.122 | 0.038 | n/a | 0.000 | 0.000 | 0.435 | 49.565 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.047 | 0.038 | 0.001 | 0.047 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-100 / read (153 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 96.985 | n/a | n/a | n/a | 0.044 | n/a | 0.000 | 0.000 | 0.487 | 96.067 | 0.003 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.057 | 0.044 | 0.000 | 0.057 |
| p99 | 201.793 | n/a | n/a | n/a | 0.099 | n/a | 0.000 | 0.000 | 3.262 | 200.842 | 2.088 | 0.139 | 0.067 | 0.000 | n/a | n/a | 0.137 | 0.099 | 0.001 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 20a39cc23fb3737a0000000000000332 | 205.447 | 0.053 | n/a | 0.000 | 0.000 | 3.262 | 201.971 | 0.004 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.106 | 0.053 | 0.000 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 20a39cc23fb3737a000000000000032f | 201.793 | 0.036 | n/a | 0.000 | 0.000 | 0.744 | 200.842 | 0.004 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.108 | 0.036 | 0.000 | 0.108 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a000000000000032e | 201.652 | 0.062 | n/a | 0.000 | 0.000 | 0.623 | 200.788 | 0.004 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.113 | 0.062 | 0.000 | 0.113 | gw-r/thread-49/journal/page | none observed |
| 20a39cc23fb3737a0000000000000331 | 201.643 | 0.026 | n/a | 0.000 | 0.000 | 0.589 | 200.830 | 0.004 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.137 | 0.026 | 0.000 | 0.137 | gw-r/thread-51/journal/page | none observed |
| 20a39cc23fb3737a0000000000000330 | 201.614 | 0.040 | n/a | 0.000 | 0.000 | 0.696 | 200.731 | 0.003 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.092 | 0.040 | 0.000 | 0.092 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a00000000000002a9 | 114.266 | 0.040 | n/a | 0.000 | 0.000 | 0.518 | 113.620 | 0.003 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.051 | 0.040 | 0.000 | 0.051 | gw-r/thread-49/journal/page | none observed |
| 20a39cc23fb3737a00000000000002c1 | 107.286 | 0.060 | n/a | 0.000 | 0.000 | 0.694 | 93.414 | 12.990 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.084 | 0.060 | 0.001 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 20a39cc23fb3737a000000000000029b | 104.027 | 0.041 | n/a | 0.000 | 0.000 | 0.586 | 103.289 | 0.004 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.056 | 0.041 | 0.000 | 0.056 | gw-r/thread-49/journal/page | none observed |
| 20a39cc23fb3737a0000000000000303 | 103.497 | 0.040 | n/a | 0.000 | 0.000 | 0.333 | 103.043 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.046 | 0.040 | 0.000 | 0.046 | gw-r/thread-51/journal/page | none observed |
| 20a39cc23fb3737a0000000000000316 | 103.279 | 0.056 | n/a | 0.000 | 0.000 | 0.539 | 102.583 | 0.013 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.072 | 0.056 | 0.001 | 0.072 | gw-r/thread-51/journal/page | none observed |
| 20a39cc23fb3737a00000000000002d6 | 102.230 | 0.046 | n/a | 0.000 | 0.000 | 0.448 | 101.637 | 0.015 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.056 | 0.046 | 0.000 | 0.056 | gw-r/thread-48/journal/page | none observed |
| 20a39cc23fb3737a0000000000000320 | 101.667 | 0.046 | n/a | 0.000 | 0.000 | 2.283 | 99.270 | 0.003 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.054 | 0.046 | 0.000 | 0.054 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a00000000000002e3 | 101.294 | 0.037 | n/a | 0.000 | 0.000 | 0.409 | 100.760 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.049 | 0.037 | 0.000 | 0.049 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a00000000000002af | 100.517 | 0.042 | n/a | 0.000 | 0.000 | 0.592 | 99.780 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.053 | 0.042 | 0.000 | 0.053 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a00000000000002b5 | 100.136 | 0.065 | n/a | 0.000 | 0.000 | 0.534 | 99.415 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.089 | 0.065 | 0.001 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 20a39cc23fb3737a0000000000000314 | 100.118 | 0.039 | n/a | 0.000 | 0.000 | 0.432 | 99.547 | 0.008 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.055 | 0.039 | 0.000 | 0.055 | gw-r/thread-47/journal/page | none observed |
| 20a39cc23fb3737a000000000000030f | 99.916 | 0.042 | n/a | 0.000 | 0.000 | 0.516 | 97.184 | 2.088 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.054 | 0.042 | 0.000 | 0.054 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a00000000000002b2 | 99.650 | 0.099 | n/a | 0.000 | 0.000 | 0.550 | 98.863 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.106 | 0.099 | 0.001 | 0.106 | gw-r/thread-51/journal/page | none observed |
| 20a39cc23fb3737a00000000000002bc | 99.600 | 0.047 | n/a | 0.000 | 0.000 | 0.282 | 98.843 | 0.369 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.051 | 0.047 | 0.000 | 0.051 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a00000000000002a1 | 99.510 | 0.039 | n/a | 0.000 | 0.000 | 0.950 | 98.402 | 0.006 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.052 | 0.039 | 0.000 | 0.052 | gw-r/thread-51/journal/page | none observed |

## P3 / idle-250 / read (157 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.375 | n/a | n/a | n/a | 0.034 | n/a | 0.000 | 0.000 | 0.477 | 200.693 | 0.004 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.059 | 0.034 | 0.000 | 0.059 |
| p99 | 205.375 | n/a | n/a | n/a | 0.068 | n/a | 0.000 | 0.000 | 1.674 | 203.151 | 0.013 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.146 | 0.068 | 0.000 | 0.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 20a39cc23fb3737a0000000000000404 | 206.072 | 0.045 | n/a | 0.000 | 0.000 | 4.884 | 201.002 | 0.009 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.068 | 0.045 | 0.000 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 20a39cc23fb3737a00000000000003f4 | 205.375 | 0.039 | n/a | 0.000 | 0.000 | 0.499 | 204.704 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.065 | 0.039 | 0.000 | 0.065 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a0000000000000402 | 204.600 | 0.044 | n/a | 0.000 | 0.000 | 1.254 | 203.151 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.093 | 0.044 | 0.000 | 0.093 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a00000000000003b8 | 204.579 | 0.057 | n/a | 0.000 | 0.000 | 0.605 | 200.616 | 0.009 | 0.000 | 3.174 | 0.000 | n/a | n/a | 0.119 | 0.057 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| 20a39cc23fb3737a00000000000003bc | 203.413 | 0.051 | n/a | 0.000 | 0.000 | 0.613 | 202.555 | 0.008 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.117 | 0.051 | 0.000 | 0.117 | gw-r/thread-50/journal/page | none observed |
| 20a39cc23fb3737a0000000000000380 | 202.657 | 0.027 | n/a | 0.000 | 0.000 | 1.588 | 200.909 | 0.007 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.051 | 0.027 | 0.000 | 0.051 | gw-r/thread-50/journal/page | none observed |
| 20a39cc23fb3737a000000000000037e | 202.624 | 0.028 | n/a | 0.000 | 0.000 | 1.674 | 200.808 | 0.006 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.051 | 0.028 | 0.000 | 0.051 | gw-r/thread-48/journal/page | none observed |
| 20a39cc23fb3737a0000000000000442 | 202.459 | 0.034 | n/a | 0.000 | 0.000 | 0.570 | 201.743 | 0.004 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.054 | 0.034 | 0.000 | 0.054 | gw-r/thread-50/journal/page | none observed |
| 20a39cc23fb3737a000000000000039a | 202.446 | 0.064 | n/a | 0.000 | 0.000 | 1.651 | 200.552 | 0.003 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.136 | 0.064 | 0.000 | 0.136 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a000000000000033c | 202.263 | 0.030 | n/a | 0.000 | 0.000 | 1.562 | 200.563 | 0.004 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.055 | 0.030 | 0.000 | 0.055 | gw-r/thread-49/journal/page | none observed |
| 20a39cc23fb3737a0000000000000338 | 202.185 | 0.027 | n/a | 0.000 | 0.000 | 1.008 | 201.015 | 0.007 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.049 | 0.027 | 0.000 | 0.049 | gw-r/thread-47/journal/page | none observed |
| 20a39cc23fb3737a00000000000003e6 | 202.083 | 0.055 | n/a | 0.000 | 0.000 | 1.241 | 200.641 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.106 | 0.055 | 0.000 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 20a39cc23fb3737a000000000000039e | 202.024 | 0.029 | n/a | 0.000 | 0.000 | 0.310 | 201.588 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.052 | 0.029 | 0.000 | 0.052 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a0000000000000378 | 201.963 | 0.040 | n/a | 0.000 | 0.000 | 0.707 | 201.072 | 0.005 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.077 | 0.040 | 0.000 | 0.077 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a0000000000000390 | 201.939 | 0.049 | n/a | 0.000 | 0.000 | 0.821 | 200.881 | 0.005 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.118 | 0.049 | 0.000 | 0.118 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a0000000000000384 | 201.929 | 0.029 | n/a | 0.000 | 0.000 | 1.119 | 200.649 | 0.010 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.049 | 0.029 | 0.000 | 0.049 | gw-r/thread-50/journal/page | none observed |
| 20a39cc23fb3737a0000000000000432 | 201.904 | 0.054 | n/a | 0.000 | 0.000 | 0.559 | 201.077 | 0.008 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.139 | 0.054 | 0.000 | 0.139 | gw-r/thread-49/journal/page | none observed |
| 20a39cc23fb3737a0000000000000386 | 201.880 | 0.045 | n/a | 0.000 | 0.000 | 0.646 | 200.964 | 0.008 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.074 | 0.045 | 0.000 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 20a39cc23fb3737a000000000000042a | 201.852 | 0.040 | n/a | 0.000 | 0.000 | 0.499 | 201.184 | 0.008 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.061 | 0.040 | 0.000 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 20a39cc23fb3737a0000000000000362 | 201.838 | 0.027 | n/a | 0.000 | 0.000 | 0.510 | 201.153 | 0.008 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.049 | 0.027 | 0.000 | 0.049 | gw-r/thread-48/journal/page | none observed |

## P3 / idle-500 / read (416 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.403 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.551 | 200.679 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.064 | 0.041 | 0.000 | 0.064 |
| p99 | 204.395 | n/a | n/a | n/a | 0.076 | n/a | 0.000 | 0.000 | 3.357 | 203.200 | 0.040 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.146 | 0.076 | 0.001 | 0.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 20a39cc23fb3737a000000000000056d | 205.691 | 0.053 | n/a | 0.000 | 0.000 | 0.639 | 204.859 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.073 | 0.053 | 0.000 | 0.073 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a000000000000049e | 205.239 | 0.039 | n/a | 0.000 | 0.000 | 0.711 | 204.382 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.067 | 0.039 | 0.000 | 0.067 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a0000000000000497 | 204.960 | 0.056 | n/a | 0.000 | 0.000 | 0.592 | 204.141 | 0.004 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.119 | 0.056 | 0.000 | 0.119 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a0000000000000531 | 204.408 | 0.030 | n/a | 0.000 | 0.000 | 3.357 | 200.911 | 0.004 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.057 | 0.030 | 0.000 | 0.057 | gw-r/thread-48/journal/page | none observed |
| 20a39cc23fb3737a00000000000004aa | 204.395 | 0.030 | n/a | 0.000 | 0.000 | 0.421 | 203.854 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.049 | 0.030 | 0.000 | 0.049 | gw-r/thread-49/journal/page | none observed |
| 20a39cc23fb3737a00000000000005e2 | 204.311 | 0.059 | n/a | 0.000 | 0.000 | 3.265 | 200.884 | 0.004 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.051 | 0.059 | 0.000 | 0.051 | gw-r/thread-48/journal/page | none observed |
| 20a39cc23fb3737a00000000000004e2 | 204.248 | 0.062 | n/a | 0.000 | 0.000 | 3.500 | 200.519 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.128 | 0.062 | 0.000 | 0.128 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a000000000000058a | 203.957 | 0.051 | n/a | 0.000 | 0.000 | 2.571 | 201.165 | 0.009 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.095 | 0.051 | 0.000 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 20a39cc23fb3737a000000000000050f | 203.832 | 0.032 | n/a | 0.000 | 0.000 | 0.487 | 203.200 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.059 | 0.032 | 0.000 | 0.059 | gw-r/thread-48/journal/page | none observed |
| 20a39cc23fb3737a00000000000004e5 | 203.754 | 0.036 | n/a | 0.000 | 0.000 | 2.452 | 201.135 | 0.007 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.060 | 0.036 | 0.000 | 0.060 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a00000000000005b1 | 203.510 | 0.029 | n/a | 0.000 | 0.000 | 2.648 | 200.718 | 0.004 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.052 | 0.029 | 0.000 | 0.052 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a0000000000000512 | 203.122 | 0.043 | n/a | 0.000 | 0.000 | 2.454 | 200.528 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.054 | 0.043 | 0.000 | 0.054 | gw-r/thread-48/journal/page | none observed |
| 20a39cc23fb3737a00000000000005eb | 202.813 | 0.039 | n/a | 0.000 | 0.000 | 0.524 | 201.972 | 0.027 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.066 | 0.039 | 0.000 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 20a39cc23fb3737a0000000000000539 | 202.777 | 0.031 | n/a | 0.000 | 0.000 | 1.828 | 200.805 | 0.004 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.060 | 0.031 | 0.000 | 0.060 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a000000000000048e | 202.672 | 0.064 | n/a | 0.000 | 0.000 | 1.710 | 200.725 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.125 | 0.064 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 20a39cc23fb3737a00000000000004a6 | 202.639 | 0.034 | n/a | 0.000 | 0.000 | 1.815 | 200.684 | 0.004 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.052 | 0.034 | 0.000 | 0.052 | gw-r/thread-49/journal/page | none observed |
| 20a39cc23fb3737a0000000000000590 | 202.635 | 0.062 | n/a | 0.000 | 0.000 | 1.572 | 200.825 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.128 | 0.062 | 0.000 | 0.128 | gw-r/thread-45/journal/page | none observed |
| 20a39cc23fb3737a00000000000004e3 | 202.634 | 0.091 | n/a | 0.000 | 0.000 | 1.060 | 201.222 | 0.006 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.169 | 0.091 | 0.000 | 0.169 | gw-r/thread-49/journal/page | none observed |
| 20a39cc23fb3737a00000000000005bd | 202.534 | 0.028 | n/a | 0.000 | 0.000 | 1.715 | 200.687 | 0.004 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.051 | 0.028 | 0.000 | 0.051 | gw-r/thread-50/journal/page | none observed |
| 20a39cc23fb3737a000000000000053f | 202.522 | 0.028 | n/a | 0.000 | 0.000 | 1.396 | 200.972 | 0.008 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.056 | 0.028 | 0.000 | 0.056 | gw-r/thread-50/journal/page | none observed |

## P3 / idle-1000 / read (754 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.474 | n/a | n/a | n/a | 0.033 | n/a | 0.000 | 0.000 | 0.570 | 200.739 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.065 | 0.034 | 0.000 | 0.065 |
| p99 | 204.936 | n/a | n/a | n/a | 0.084 | n/a | 0.000 | 0.000 | 2.329 | 202.221 | 0.032 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.172 | 0.086 | 0.001 | 0.172 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 20a39cc23fb3737a0000000000000690 | 205.458 | 0.049 | n/a | 0.000 | 0.000 | 0.751 | 204.506 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.103 | 0.049 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 20a39cc23fb3737a0000000000000672 | 205.364 | 0.024 | n/a | 0.000 | 0.000 | 0.697 | 200.924 | 0.007 | 0.000 | 3.666 | 0.000 | n/a | n/a | 0.046 | 0.024 | 0.000 | 0.046 | gw-r/thread-49/journal/page | none observed |
| 20a39cc23fb3737a0000000000000718 | 205.065 | 0.031 | n/a | 0.000 | 0.000 | 0.431 | 204.490 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a00000000000007d8 | 205.018 | 0.026 | n/a | 0.000 | 0.000 | 3.810 | 201.057 | 0.008 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.056 | 0.026 | 0.000 | 0.056 | gw-r/thread-50/journal/page | none observed |
| 20a39cc23fb3737a0000000000000763 | 204.983 | 0.036 | n/a | 0.000 | 0.000 | 3.784 | 201.027 | 0.009 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.068 | 0.036 | 0.000 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 20a39cc23fb3737a00000000000006c6 | 204.953 | 0.042 | n/a | 0.000 | 0.000 | 4.060 | 200.715 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.088 | 0.042 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 20a39cc23fb3737a0000000000000844 | 204.938 | 0.024 | n/a | 0.000 | 0.000 | 0.624 | 204.156 | 0.009 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.055 | 0.024 | 0.000 | 0.055 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a0000000000000752 | 204.936 | 0.050 | n/a | 0.000 | 0.000 | 0.642 | 204.079 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.119 | 0.050 | 0.000 | 0.119 | gw-r/thread-50/journal/page | none observed |
| 20a39cc23fb3737a00000000000006a7 | 204.608 | 0.032 | n/a | 0.000 | 0.000 | 0.480 | 203.994 | 0.008 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.056 | 0.032 | 0.000 | 0.056 | gw-r/thread-49/journal/page | none observed |
| 20a39cc23fb3737a000000000000074c | 204.438 | 0.072 | n/a | 0.000 | 0.000 | 3.735 | 200.490 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.102 | 0.072 | 0.000 | 0.102 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a00000000000008fb | 203.972 | 0.118 | n/a | 0.000 | 0.000 | 1.090 | 202.384 | 0.027 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.193 | 0.118 | 0.001 | 0.193 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a0000000000000862 | 203.872 | 0.022 | n/a | 0.000 | 0.000 | 2.203 | 201.524 | 0.009 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.052 | 0.022 | 0.000 | 0.052 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a0000000000000689 | 203.866 | 0.031 | n/a | 0.000 | 0.000 | 2.788 | 200.935 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.054 | 0.031 | 0.000 | 0.054 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a00000000000007a4 | 203.640 | 0.041 | n/a | 0.000 | 0.000 | 2.482 | 200.996 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.076 | 0.041 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a000000000000068c | 203.547 | 0.073 | n/a | 0.000 | 0.000 | 2.279 | 200.941 | 0.007 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.185 | 0.073 | 0.000 | 0.185 | gw-r/thread-50/journal/page | none observed |
| 20a39cc23fb3737a0000000000000706 | 203.215 | 0.054 | n/a | 0.000 | 0.000 | 1.226 | 201.752 | 0.006 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.120 | 0.054 | 0.000 | 0.120 | gw-r/thread-48/journal/page | none observed |
| 20a39cc23fb3737a00000000000007e2 | 203.094 | 0.023 | n/a | 0.000 | 0.000 | 0.375 | 202.545 | 0.010 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.052 | 0.023 | 0.000 | 0.052 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a00000000000006d7 | 203.087 | 0.048 | n/a | 0.000 | 0.000 | 0.903 | 201.969 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.101 | 0.048 | 0.000 | 0.101 | gw-r/thread-66/journal/page | none observed |
| 20a39cc23fb3737a0000000000000729 | 203.021 | 0.030 | n/a | 0.000 | 0.000 | 1.541 | 201.285 | 0.012 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.057 | 0.030 | 0.000 | 0.057 | gw-r/thread-52/journal/page | none observed |
| 20a39cc23fb3737a000000000000085f | 202.975 | 0.020 | n/a | 0.000 | 0.000 | 2.329 | 200.541 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.047 | 0.020 | 0.000 | 0.047 | gw-r/thread-45/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 1250 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/2.271 ms; post-ACK p50/p99: 0.332/0.913 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.072 | 9.629 | 9.556 | reported |
| All-primary p99 ms | 22.808 | 22.176 | 21.768 | <=50 |
| L256 5-10 p50Ms | unavailable | unavailable | unavailable | <=10 |
| L256 5-10 p99Ms | unavailable | unavailable | unavailable | <=50 |
| L256 11-25 p50Ms | unavailable | unavailable | unavailable | <=10 |
| L256 11-25 p99Ms | unavailable | unavailable | unavailable | <=50 |
| L256 26-50 p50Ms | unavailable | unavailable | unavailable | p99<=100; p50 reported |
| L256 26-50 p99Ms | unavailable | unavailable | unavailable | p99<=100; p50 reported |
| Burst 5-10 p50 ms | unavailable | unavailable | unavailable | <=10 |
| Burst 11-25 p50 ms | unavailable | unavailable | unavailable | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | unavailable | unavailable | unavailable | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | unavailable | unavailable | unavailable | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5-10 | >=1000 | 7 | 12.443/57.202 | 12.070 | 6.798 | 17.465 | 0.062/0.017 |
| 5-10 | overlap | 77 | 12.559/34.567 | 12.225 | 7.952 | 18.658 | 0.058/0.016 |
| 5-10 | 0-50 | 569 | 9.562/21.141 | 9.175 | 5.429 | 14.025 | 0.053/0.017 |
| 5-10 | 250-1000 | 299 | 10.416/18.115 | 9.945 | 5.720 | 14.501 | 0.076/0.019 |
| 5-10 | 50-100 | 149 | 9.491/16.494 | 9.056 | 5.164 | 13.722 | 0.055/0.017 |
| 5-10 | 100-250 | 149 | 9.627/15.475 | 9.075 | 5.322 | 13.507 | 0.066/0.017 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1250 | 2 | 111.531 |

## Writer heap, GC and scheduler stalls

Source a0785bcf96f7afea3965b3028db2e27f4fbef6a9; 1250 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 363.369 / 449.701 |
| GC events / total duration / maximum ms | 299 / 753.570 / 50.021 |
| GC events >50 ms / total duration ms | 1 / 50.021 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":293,"4":3,"8":3} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 22.808 / 2 / 111.531 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.
