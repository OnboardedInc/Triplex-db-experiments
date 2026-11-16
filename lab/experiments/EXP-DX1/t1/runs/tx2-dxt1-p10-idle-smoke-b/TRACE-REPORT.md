# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-53/peer.transact-await (includes order/network/storage)` (17.944 ms, trace `0fdfbf4456e8fb700000000000000038`); `gw-w/thread-53/peer.transact-await (includes order/network/storage)` (28.916 ms, trace `0fdfbf4456e8fb700000000000000147`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (25.120 ms, trace `0fdfbf4456e8fb700000000000000134`); `node-14/thread-0/socket.wait-first-byte` (15.330 ms, trace `0fdfbf4456e8fb7000000000000000f0`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (21.801 ms, trace `0fdfbf4456e8fb700000000000000092`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-idle-smoke-b`; source `8f78697818777469336fe3fcc35cad73b8bff95e`; subjects 1000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 210/210 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 210/210. Raw trace bytes: 4806066.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 1535 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 5998.403 | 1084.062 | 11.733 | 4038 |
| idle-10 | 0 | 1041.122 | 32.186 | 0.494 | 102 |
| idle-1000 | 0 | 3998.931 | 61.297 | 2.660 | 97 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 0fdfbf4456e8fb700000000000000038 | driver.queue.scheduler-late | 0.540 | none | 0 / 32 |
| 0fdfbf4456e8fb700000000000000038 | driver.queue.scheduler-dispatch | 0.032 | none | 0 / 32 |

Observed active steps while trace 0fdfbf4456e8fb700000000000000038 waited: []

| 0fdfbf4456e8fb700000000000000147 | driver.queue.scheduler-dispatch | 0.065 | none | 0 / 32 |
| 0fdfbf4456e8fb700000000000000147 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 0fdfbf4456e8fb700000000000000147 waited: []

| 0fdfbf4456e8fb700000000000000134 | driver.queue.scheduler-dispatch | 0.044 | none | 0 / 32 |
| 0fdfbf4456e8fb700000000000000134 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 0fdfbf4456e8fb700000000000000134 waited: []

| 0fdfbf4456e8fb7000000000000000f0 | driver.queue.scheduler-dispatch | 0.098 | none | 0 / 32 |
| 0fdfbf4456e8fb7000000000000000f0 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace 0fdfbf4456e8fb7000000000000000f0 waited: []

| 0fdfbf4456e8fb700000000000000092 | driver.queue.scheduler-dispatch | 0.035 | none | 0 / 32 |
| 0fdfbf4456e8fb700000000000000092 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 0fdfbf4456e8fb700000000000000092 waited: []

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.901 | 1.484 | 0.000 | 1.335 | 4.306 | n/a | 0.000 | 0.454 | 0.575 | 2.178 | 0.025 | 0.000 | 1.680 | 11.847 | 1.676 | n/a | 0.160 | 4.760 | 0.208 | 0.160 |
| p99 | 22.901 | 1.484 | 0.000 | 1.335 | 4.306 | n/a | 0.000 | 0.454 | 0.575 | 2.178 | 0.025 | 0.000 | 1.680 | 11.847 | 1.676 | n/a | 0.160 | 4.760 | 0.208 | 0.160 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fdfbf4456e8fb700000000000000036 | 22.901 | 4.306 | n/a | 0.000 | 0.454 | 0.575 | 2.178 | 0.025 | 0.000 | 1.680 | 11.847 | 1.676 | n/a | 0.160 | 4.760 | 0.208 | 0.160 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.901 | 1.484 | 0.000 | 1.335 | 4.306 | n/a | 0.000 | 0.454 | 0.575 | 2.178 | 0.025 | 0.000 | 1.680 | 11.847 | 1.676 | n/a | 0.160 | 4.760 | 0.208 | 0.160 |
| p99 | 22.901 | 1.484 | 0.000 | 1.335 | 4.306 | n/a | 0.000 | 0.454 | 0.575 | 2.178 | 0.025 | 0.000 | 1.680 | 11.847 | 1.676 | n/a | 0.160 | 4.760 | 0.208 | 0.160 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fdfbf4456e8fb700000000000000036 | 22.901 | 4.306 | n/a | 0.000 | 0.454 | 0.575 | 2.178 | 0.025 | 0.000 | 1.680 | 11.847 | 1.676 | n/a | 0.160 | 4.760 | 0.208 | 0.160 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |

## P2 / warmup / commit (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.765 | 0.502 | 0.000 | 0.500 | 2.278 | n/a | 0.000 | 0.052 | 0.666 | 1.530 | 0.020 | 0.000 | 0.321 | 6.063 | 0.489 | n/a | 0.023 | 2.396 | 0.187 | 0.023 |
| p99 | 32.667 | 1.699 | 0.042 | 1.080 | 4.282 | n/a | 0.000 | 1.121 | 6.094 | 6.737 | 0.075 | 0.000 | 3.675 | 21.801 | 3.901 | n/a | 0.075 | 4.432 | 0.360 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fdfbf4456e8fb700000000000000038 | 35.694 | 3.033 | n/a | 0.000 | 0.572 | 6.094 | 5.673 | 0.021 | 0.000 | 0.812 | 17.944 | 1.525 | n/a | 0.020 | 3.605 | 0.101 | 0.020 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.370ms |
| 0fdfbf4456e8fb700000000000000147 | 33.898 | 2.750 | n/a | 0.000 | 0.068 | 0.801 | 0.845 | 0.010 | 0.000 | 0.055 | 28.916 | 0.420 | n/a | 0.033 | 2.817 | 0.083 | 0.033 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb700000000000000134 | 32.667 | 1.892 | n/a | 0.000 | 0.047 | 0.537 | 4.474 | 0.007 | 0.000 | 0.152 | 25.120 | 0.418 | n/a | 0.022 | 1.939 | 0.059 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb7000000000000000f0 | 30.602 | 3.644 | n/a | 0.000 | 0.102 | 15.725 | 1.111 | 0.015 | 0.000 | 0.063 | 9.504 | 0.401 | n/a | 0.038 | 3.746 | 0.122 | 0.038 | node-14/thread-0/socket.wait-first-byte | none observed |
| 0fdfbf4456e8fb700000000000000092 | 28.379 | 1.808 | n/a | 0.000 | 0.037 | 2.073 | 2.007 | 0.038 | 0.000 | 0.108 | 21.801 | 0.491 | n/a | 0.015 | 1.845 | 0.065 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb700000000000000039 | 27.602 | 4.978 | n/a | 0.000 | 0.064 | 8.204 | 2.039 | 0.031 | 0.000 | 0.092 | 10.980 | 1.138 | n/a | 0.075 | 5.042 | 0.183 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.182ms; driver.publication.persist-deferred 0.041ms |
| 0fdfbf4456e8fb700000000000000141 | 24.518 | 2.474 | n/a | 0.000 | 0.048 | 0.706 | 11.833 | 0.025 | 0.000 | 0.092 | 8.839 | 0.480 | n/a | 0.021 | 2.522 | 0.103 | 0.021 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb700000000000000064 | 24.149 | 2.725 | n/a | 0.000 | 0.088 | 3.768 | 1.446 | 0.028 | 0.000 | 0.117 | 14.961 | 0.991 | n/a | 0.025 | 2.813 | 0.116 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb700000000000000076 | 24.019 | 3.870 | n/a | 0.000 | 0.107 | 1.105 | 3.884 | 0.049 | 0.000 | 0.104 | 13.866 | 0.992 | n/a | 0.042 | 3.977 | 0.166 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms |
| 0fdfbf4456e8fb700000000000000049 | 23.026 | 3.352 | n/a | 0.000 | 0.136 | 1.926 | 5.682 | 0.022 | 0.000 | 0.667 | 7.750 | 3.454 | n/a | 0.038 | 3.488 | 0.151 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb700000000000000074 | 21.807 | 3.431 | n/a | 0.000 | 0.095 | 0.814 | 6.628 | 0.067 | 0.000 | 0.978 | 8.648 | 1.108 | n/a | 0.037 | 3.526 | 0.162 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb70000000000000005a | 21.022 | 2.849 | n/a | 0.000 | 0.063 | 0.859 | 3.316 | 0.021 | 0.000 | 0.510 | 9.479 | 3.901 | n/a | 0.024 | 2.911 | 0.138 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb700000000000000072 | 20.491 | 4.046 | n/a | 0.000 | 0.089 | 0.909 | 6.737 | 0.072 | 0.000 | 0.114 | 8.035 | 0.455 | n/a | 0.034 | 4.135 | 0.202 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb7000000000000000ad | 20.210 | 2.986 | n/a | 0.000 | 0.103 | 0.808 | 2.760 | 0.047 | 0.000 | 0.168 | 12.848 | 0.454 | n/a | 0.035 | 3.089 | 0.153 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb7000000000000000d9 | 20.116 | 2.925 | n/a | 0.000 | 0.091 | 1.675 | 2.667 | 0.061 | 0.000 | 0.142 | 12.100 | 0.422 | n/a | 0.033 | 3.016 | 0.150 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.078ms |
| 0fdfbf4456e8fb700000000000000057 | 19.825 | 2.661 | n/a | 0.000 | 0.050 | 0.610 | 4.095 | 0.067 | 0.000 | 0.152 | 11.650 | 0.520 | n/a | 0.021 | 2.711 | 0.137 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| 0fdfbf4456e8fb700000000000000161 | 19.638 | 3.237 | n/a | 0.000 | 0.078 | 0.802 | 1.862 | 0.021 | 0.000 | 0.184 | 12.380 | 1.044 | n/a | 0.029 | 3.315 | 0.169 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb7000000000000000f8 | 19.582 | 2.597 | n/a | 0.000 | 0.052 | 0.651 | 4.884 | 0.014 | 0.000 | 0.380 | 6.814 | 4.162 | n/a | 0.027 | 2.649 | 0.135 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb700000000000000088 | 19.483 | 3.661 | n/a | 0.000 | 0.096 | 1.127 | 1.814 | 0.021 | 0.000 | 0.510 | 11.023 | 1.195 | n/a | 0.036 | 3.757 | 0.193 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 0fdfbf4456e8fb700000000000000169 | 19.460 | 2.043 | n/a | 0.000 | 0.076 | 0.760 | 1.718 | 0.028 | 0.000 | 0.720 | 13.176 | 0.912 | n/a | 0.027 | 2.119 | 0.109 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.765 | 0.502 | 0.000 | 0.500 | 2.278 | n/a | 0.000 | 0.052 | 0.666 | 1.530 | 0.020 | 0.000 | 0.321 | 6.063 | 0.489 | n/a | 0.023 | 2.396 | 0.187 | 0.023 |
| p99 | 32.667 | 1.699 | 0.042 | 1.080 | 4.282 | n/a | 0.000 | 1.121 | 6.094 | 6.737 | 0.075 | 0.000 | 3.675 | 21.801 | 3.901 | n/a | 0.075 | 4.432 | 0.360 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fdfbf4456e8fb700000000000000038 | 35.694 | 3.033 | n/a | 0.000 | 0.572 | 6.094 | 5.673 | 0.021 | 0.000 | 0.812 | 17.944 | 1.525 | n/a | 0.020 | 3.605 | 0.101 | 0.020 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.370ms |
| 0fdfbf4456e8fb700000000000000147 | 33.898 | 2.750 | n/a | 0.000 | 0.068 | 0.801 | 0.845 | 0.010 | 0.000 | 0.055 | 28.916 | 0.420 | n/a | 0.033 | 2.817 | 0.083 | 0.033 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb700000000000000134 | 32.667 | 1.892 | n/a | 0.000 | 0.047 | 0.537 | 4.474 | 0.007 | 0.000 | 0.152 | 25.120 | 0.418 | n/a | 0.022 | 1.939 | 0.059 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb7000000000000000f0 | 30.602 | 3.644 | n/a | 0.000 | 0.102 | 15.725 | 1.111 | 0.015 | 0.000 | 0.063 | 9.504 | 0.401 | n/a | 0.038 | 3.746 | 0.122 | 0.038 | node-14/thread-0/socket.wait-first-byte | none observed |
| 0fdfbf4456e8fb700000000000000092 | 28.379 | 1.808 | n/a | 0.000 | 0.037 | 2.073 | 2.007 | 0.038 | 0.000 | 0.108 | 21.801 | 0.491 | n/a | 0.015 | 1.845 | 0.065 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb700000000000000039 | 27.602 | 4.978 | n/a | 0.000 | 0.064 | 8.204 | 2.039 | 0.031 | 0.000 | 0.092 | 10.980 | 1.138 | n/a | 0.075 | 5.042 | 0.183 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.182ms; driver.publication.persist-deferred 0.041ms |
| 0fdfbf4456e8fb700000000000000141 | 24.518 | 2.474 | n/a | 0.000 | 0.048 | 0.706 | 11.833 | 0.025 | 0.000 | 0.092 | 8.839 | 0.480 | n/a | 0.021 | 2.522 | 0.103 | 0.021 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb700000000000000064 | 24.149 | 2.725 | n/a | 0.000 | 0.088 | 3.768 | 1.446 | 0.028 | 0.000 | 0.117 | 14.961 | 0.991 | n/a | 0.025 | 2.813 | 0.116 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb700000000000000076 | 24.019 | 3.870 | n/a | 0.000 | 0.107 | 1.105 | 3.884 | 0.049 | 0.000 | 0.104 | 13.866 | 0.992 | n/a | 0.042 | 3.977 | 0.166 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms |
| 0fdfbf4456e8fb700000000000000049 | 23.026 | 3.352 | n/a | 0.000 | 0.136 | 1.926 | 5.682 | 0.022 | 0.000 | 0.667 | 7.750 | 3.454 | n/a | 0.038 | 3.488 | 0.151 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb700000000000000074 | 21.807 | 3.431 | n/a | 0.000 | 0.095 | 0.814 | 6.628 | 0.067 | 0.000 | 0.978 | 8.648 | 1.108 | n/a | 0.037 | 3.526 | 0.162 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb70000000000000005a | 21.022 | 2.849 | n/a | 0.000 | 0.063 | 0.859 | 3.316 | 0.021 | 0.000 | 0.510 | 9.479 | 3.901 | n/a | 0.024 | 2.911 | 0.138 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb700000000000000072 | 20.491 | 4.046 | n/a | 0.000 | 0.089 | 0.909 | 6.737 | 0.072 | 0.000 | 0.114 | 8.035 | 0.455 | n/a | 0.034 | 4.135 | 0.202 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb7000000000000000ad | 20.210 | 2.986 | n/a | 0.000 | 0.103 | 0.808 | 2.760 | 0.047 | 0.000 | 0.168 | 12.848 | 0.454 | n/a | 0.035 | 3.089 | 0.153 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb7000000000000000d9 | 20.116 | 2.925 | n/a | 0.000 | 0.091 | 1.675 | 2.667 | 0.061 | 0.000 | 0.142 | 12.100 | 0.422 | n/a | 0.033 | 3.016 | 0.150 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.078ms |
| 0fdfbf4456e8fb700000000000000057 | 19.825 | 2.661 | n/a | 0.000 | 0.050 | 0.610 | 4.095 | 0.067 | 0.000 | 0.152 | 11.650 | 0.520 | n/a | 0.021 | 2.711 | 0.137 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| 0fdfbf4456e8fb700000000000000161 | 19.638 | 3.237 | n/a | 0.000 | 0.078 | 0.802 | 1.862 | 0.021 | 0.000 | 0.184 | 12.380 | 1.044 | n/a | 0.029 | 3.315 | 0.169 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb7000000000000000f8 | 19.582 | 2.597 | n/a | 0.000 | 0.052 | 0.651 | 4.884 | 0.014 | 0.000 | 0.380 | 6.814 | 4.162 | n/a | 0.027 | 2.649 | 0.135 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb700000000000000088 | 19.483 | 3.661 | n/a | 0.000 | 0.096 | 1.127 | 1.814 | 0.021 | 0.000 | 0.510 | 11.023 | 1.195 | n/a | 0.036 | 3.757 | 0.193 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 0fdfbf4456e8fb700000000000000169 | 19.460 | 2.043 | n/a | 0.000 | 0.076 | 0.760 | 1.718 | 0.028 | 0.000 | 0.720 | 13.176 | 0.912 | n/a | 0.027 | 2.119 | 0.109 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.343 | n/a | n/a | n/a | 8.807 | 0.135 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 9.327 | 0.999 | 0.009 |
| p99 | 45.706 | n/a | n/a | n/a | 27.995 | 8.222 | 0.000 | 0.000 | 1.381 | 15.406 | 0.021 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.028 | 28.839 | 0.999 | 0.028 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fdfbf4456e8fb700000000000000056 | 45.706 | 27.995 | 0.844 | 0.000 | 0.000 | 1.381 | 15.406 | 0.021 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.008 | 28.839 | 0.631 | 0.008 | gw-r/thread-45/gateway.response-write | driver.publication.readback 0.107ms; driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.040ms; driver.publication.persist-deferred 0.018ms; driver.reader-basis.broadcast 0.014ms |
| 0fdfbf4456e8fb700000000000000037 | 12.944 | 12.438 | 0.479 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 12.917 | 0.998 | 0.028 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.370ms; driver.publication.persist-deferred 0.070ms |
| 0fdfbf4456e8fb70000000000000015e | 12.723 | 10.534 | 2.178 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 12.712 | 0.999 | 0.011 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.601ms; driver.publication.persist-deferred 0.016ms |
| 0fdfbf4456e8fb700000000000000041 | 12.415 | 9.294 | 3.112 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 12.406 | 0.999 | 0.009 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.079ms; driver.publication.persist-deferred 0.019ms |
| 0fdfbf4456e8fb700000000000000111 | 12.195 | 12.096 | 0.078 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 12.174 | 0.998 | 0.020 | node-14/thread-3/replica.pull-at | driver.publication.persist-deferred 0.120ms; driver.publication.readback 0.062ms |
| 0fdfbf4456e8fb700000000000000079 | 11.411 | 10.233 | 1.169 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 11.402 | 0.999 | 0.009 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.014ms |
| 0fdfbf4456e8fb7000000000000001d3 | 11.343 | 11.284 | 0.052 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 11.335 | 0.999 | 0.007 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.069ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.013ms |
| 0fdfbf4456e8fb7000000000000000e9 | 10.750 | 10.679 | 0.063 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 10.742 | 0.999 | 0.008 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.013ms |
| 0fdfbf4456e8fb7000000000000001d4 | 10.259 | 5.495 | 4.756 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 10.251 | 0.999 | 0.008 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.013ms |
| 0fdfbf4456e8fb70000000000000006b | 9.840 | 9.696 | 0.135 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 9.831 | 0.999 | 0.010 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.016ms |
| 0fdfbf4456e8fb700000000000000089 | 9.343 | 1.105 | 8.222 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 9.327 | 0.998 | 0.016 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.084ms; driver.publication.persist-deferred 0.037ms |
| 0fdfbf4456e8fb700000000000000193 | 9.098 | 9.004 | 0.085 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 9.089 | 0.999 | 0.009 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.016ms |
| 0fdfbf4456e8fb70000000000000009c | 8.882 | 8.807 | 0.066 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 8.873 | 0.999 | 0.010 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.017ms |
| 0fdfbf4456e8fb7000000000000001c7 | 8.855 | 6.711 | 2.128 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 8.840 | 0.998 | 0.015 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.106ms; driver.publication.persist-deferred 0.019ms |
| 0fdfbf4456e8fb700000000000000077 | 8.700 | 8.598 | 0.093 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 8.691 | 0.999 | 0.009 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.070ms; driver.reader-basis.broadcast 0.021ms; driver.publication.persist-deferred 0.013ms |
| 0fdfbf4456e8fb7000000000000000ac | 8.512 | 8.442 | 0.061 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 8.504 | 0.999 | 0.009 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.015ms |
| 0fdfbf4456e8fb70000000000000008b | 8.507 | 8.395 | 0.103 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 8.498 | 0.999 | 0.009 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.015ms |
| 0fdfbf4456e8fb7000000000000001af | 8.419 | 8.330 | 0.065 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 8.395 | 0.997 | 0.024 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.080ms; driver.publication.persist-deferred 0.035ms |
| 0fdfbf4456e8fb70000000000000004a | 8.245 | 8.077 | 0.158 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 8.235 | 0.999 | 0.010 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.083ms; driver.publication.persist-deferred 0.021ms |
| 0fdfbf4456e8fb700000000000000083 | 8.135 | 7.964 | 0.163 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 8.127 | 0.999 | 0.008 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.014ms |

## P2 / idle-10 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.464 | 0.000 | 0.000 | 0.441 | 1.897 | n/a | 0.000 | 0.037 | 0.490 | 3.804 | 0.018 | 0.000 | 0.090 | 4.913 | 0.437 | n/a | 0.017 | 1.930 | 0.175 | 0.017 |
| p99 | 16.323 | 0.689 | 0.000 | 0.545 | 2.901 | n/a | 0.000 | 0.063 | 1.224 | 4.432 | 0.032 | 0.000 | 1.506 | 6.809 | 2.515 | n/a | 0.028 | 2.964 | 0.244 | 0.028 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fdfbf4456e8fb7000000000000001ce | 16.323 | 1.893 | n/a | 0.000 | 0.037 | 0.590 | 3.804 | 0.032 | 0.000 | 0.627 | 6.809 | 2.515 | n/a | 0.016 | 1.930 | 0.118 | 0.016 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.persist-deferred 0.032ms |
| 0fdfbf4456e8fb7000000000000001d8 | 12.927 | 1.815 | n/a | 0.000 | 0.043 | 0.490 | 3.911 | 0.015 | 0.000 | 0.090 | 6.106 | 0.437 | n/a | 0.021 | 1.858 | 0.144 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb7000000000000001d5 | 12.464 | 2.148 | n/a | 0.000 | 0.030 | 0.460 | 4.432 | 0.018 | 0.000 | 0.055 | 4.913 | 0.391 | n/a | 0.017 | 2.177 | 0.175 | 0.017 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms |
| 0fdfbf4456e8fb7000000000000001d0 | 12.145 | 2.901 | n/a | 0.000 | 0.063 | 1.224 | 1.586 | 0.024 | 0.000 | 1.506 | 4.125 | 0.689 | n/a | 0.028 | 2.964 | 0.244 | 0.028 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.016ms |
| 0fdfbf4456e8fb7000000000000001d2 | 8.959 | 1.897 | n/a | 0.000 | 0.032 | 0.382 | 1.636 | 0.013 | 0.000 | 0.087 | 4.466 | 0.430 | n/a | 0.016 | 1.929 | 0.215 | 0.016 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.015ms |

## P2 / idle-10 / commit / 5-10 facts (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.464 | 0.000 | 0.000 | 0.441 | 1.897 | n/a | 0.000 | 0.037 | 0.490 | 3.804 | 0.018 | 0.000 | 0.090 | 4.913 | 0.437 | n/a | 0.017 | 1.930 | 0.175 | 0.017 |
| p99 | 16.323 | 0.689 | 0.000 | 0.545 | 2.901 | n/a | 0.000 | 0.063 | 1.224 | 4.432 | 0.032 | 0.000 | 1.506 | 6.809 | 2.515 | n/a | 0.028 | 2.964 | 0.244 | 0.028 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fdfbf4456e8fb7000000000000001ce | 16.323 | 1.893 | n/a | 0.000 | 0.037 | 0.590 | 3.804 | 0.032 | 0.000 | 0.627 | 6.809 | 2.515 | n/a | 0.016 | 1.930 | 0.118 | 0.016 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.persist-deferred 0.032ms |
| 0fdfbf4456e8fb7000000000000001d8 | 12.927 | 1.815 | n/a | 0.000 | 0.043 | 0.490 | 3.911 | 0.015 | 0.000 | 0.090 | 6.106 | 0.437 | n/a | 0.021 | 1.858 | 0.144 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb7000000000000001d5 | 12.464 | 2.148 | n/a | 0.000 | 0.030 | 0.460 | 4.432 | 0.018 | 0.000 | 0.055 | 4.913 | 0.391 | n/a | 0.017 | 2.177 | 0.175 | 0.017 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms |
| 0fdfbf4456e8fb7000000000000001d0 | 12.145 | 2.901 | n/a | 0.000 | 0.063 | 1.224 | 1.586 | 0.024 | 0.000 | 1.506 | 4.125 | 0.689 | n/a | 0.028 | 2.964 | 0.244 | 0.028 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.016ms |
| 0fdfbf4456e8fb7000000000000001d2 | 8.959 | 1.897 | n/a | 0.000 | 0.032 | 0.382 | 1.636 | 0.013 | 0.000 | 0.087 | 4.466 | 0.430 | n/a | 0.016 | 1.929 | 0.215 | 0.016 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.015ms |

## P2 / idle-1000 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.128 | 0.000 | 0.000 | 0.469 | 2.091 | n/a | 0.000 | 0.049 | 0.604 | 0.881 | 0.011 | 0.000 | 0.118 | 5.308 | 0.441 | n/a | 0.025 | 2.148 | 0.164 | 0.025 |
| p99 | 15.542 | 0.833 | 0.000 | 0.695 | 2.934 | n/a | 0.000 | 0.078 | 0.689 | 5.525 | 0.021 | 0.000 | 0.812 | 11.079 | 0.840 | n/a | 0.037 | 3.012 | 0.282 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fdfbf4456e8fb7000000000000001db | 15.542 | 2.312 | n/a | 0.000 | 0.034 | 0.689 | 0.881 | 0.011 | 0.000 | 0.058 | 11.079 | 0.441 | n/a | 0.037 | 2.346 | 0.151 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb7000000000000001de | 13.103 | 2.091 | n/a | 0.000 | 0.057 | 0.608 | 5.525 | 0.021 | 0.000 | 0.812 | 3.516 | 0.452 | n/a | 0.022 | 2.148 | 0.164 | 0.022 | gw-w/thread-53/storage/commit! | none observed |
| 0fdfbf4456e8fb7000000000000001e4 | 11.128 | 1.838 | n/a | 0.000 | 0.049 | 0.375 | 1.638 | 0.020 | 0.000 | 0.118 | 6.227 | 0.840 | n/a | 0.025 | 1.887 | 0.170 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb7000000000000001e1 | 10.688 | 2.934 | n/a | 0.000 | 0.078 | 0.604 | 0.861 | 0.011 | 0.000 | 0.465 | 5.308 | 0.392 | n/a | 0.035 | 3.012 | 0.282 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit / 5-10 facts (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.128 | 0.000 | 0.000 | 0.469 | 2.091 | n/a | 0.000 | 0.049 | 0.604 | 0.881 | 0.011 | 0.000 | 0.118 | 5.308 | 0.441 | n/a | 0.025 | 2.148 | 0.164 | 0.025 |
| p99 | 15.542 | 0.833 | 0.000 | 0.695 | 2.934 | n/a | 0.000 | 0.078 | 0.689 | 5.525 | 0.021 | 0.000 | 0.812 | 11.079 | 0.840 | n/a | 0.037 | 3.012 | 0.282 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0fdfbf4456e8fb7000000000000001db | 15.542 | 2.312 | n/a | 0.000 | 0.034 | 0.689 | 0.881 | 0.011 | 0.000 | 0.058 | 11.079 | 0.441 | n/a | 0.037 | 2.346 | 0.151 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb7000000000000001de | 13.103 | 2.091 | n/a | 0.000 | 0.057 | 0.608 | 5.525 | 0.021 | 0.000 | 0.812 | 3.516 | 0.452 | n/a | 0.022 | 2.148 | 0.164 | 0.022 | gw-w/thread-53/storage/commit! | none observed |
| 0fdfbf4456e8fb7000000000000001e4 | 11.128 | 1.838 | n/a | 0.000 | 0.049 | 0.375 | 1.638 | 0.020 | 0.000 | 0.118 | 6.227 | 0.840 | n/a | 0.025 | 1.887 | 0.170 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0fdfbf4456e8fb7000000000000001e1 | 10.688 | 2.934 | n/a | 0.000 | 0.078 | 0.604 | 0.861 | 0.011 | 0.000 | 0.465 | 5.308 | 0.392 | n/a | 0.035 | 3.012 | 0.282 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.623 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.844 | 200.723 | 0.008 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.086 | 0.040 | 0.000 | 0.086 |
| p99 | 203.936 | n/a | n/a | n/a | 0.303 | n/a | 0.000 | 0.000 | 3.994 | 201.867 | 0.104 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.496 | 0.303 | 0.005 | 0.496 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 021a32c65ac3684b0000000000000005 | 203.936 | 0.050 | n/a | 0.000 | 0.000 | 1.697 | 201.867 | 0.016 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.171 | 0.050 | 0.000 | 0.171 | gw-r/thread-51/journal/page | none observed |
| 021a32c65ac3684b00000000000000fc | 202.510 | 0.045 | n/a | 0.000 | 0.000 | 1.142 | 201.123 | 0.008 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.108 | 0.045 | 0.000 | 0.108 | gw-r/thread-49/journal/page | none observed |
| 021a32c65ac3684b00000000000000fb | 202.262 | 0.031 | n/a | 0.000 | 0.000 | 0.601 | 201.453 | 0.011 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.076 | 0.031 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 021a32c65ac3684b00000000000000fa | 201.756 | 0.040 | n/a | 0.000 | 0.000 | 0.844 | 200.723 | 0.007 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.086 | 0.040 | 0.000 | 0.086 | gw-r/thread-45/journal/page | none observed |
| 021a32c65ac3684b00000000000000fd | 201.623 | 0.025 | n/a | 0.000 | 0.000 | 0.650 | 200.814 | 0.006 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.058 | 0.025 | 0.000 | 0.058 | gw-r/thread-50/journal/page | none observed |
| 021a32c65ac3684b00000000000000f9 | 201.441 | 0.033 | n/a | 0.000 | 0.000 | 0.568 | 200.704 | 0.007 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.073 | 0.033 | 0.000 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 021a32c65ac3684b0000000000000006 | 75.597 | 0.187 | n/a | 0.000 | 0.000 | 3.994 | 71.128 | 0.015 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.149 | 0.187 | 0.002 | 0.149 | gw-r/thread-48/journal/page | none observed |
| d621949815c2ea100000000000000002 | 56.623 | 0.303 | n/a | 0.000 | 0.000 | 1.844 | 53.788 | 0.104 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.496 | 0.303 | 0.005 | 0.496 | gw-r/thread-48/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1002.083 | n/a | n/a | n/a | 0.106 | n/a | 0.000 | 0.000 | 0.329 | 1000.507 | 0.008 | 0.000 | 0.043 | 0.000 | n/a | n/a | 1.090 | 0.106 | 0.000 | 1.090 |
| p99 | 1006.971 | n/a | n/a | n/a | 0.186 | n/a | 0.000 | 0.000 | 1.976 | 1003.229 | 0.014 | 0.000 | 0.280 | 0.000 | n/a | n/a | 1.286 | 0.186 | 0.000 | 1.286 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d621949815c2ea100000000000000017 | 1006.971 | 0.186 | n/a | 0.000 | 0.000 | 1.976 | 1003.229 | 0.014 | 0.000 | 0.280 | 0.000 | n/a | n/a | 1.286 | 0.186 | 0.000 | 1.286 | gw-r/thread-50/journal/page | none observed |
| d621949815c2ea1000000000000001c0 | 1002.083 | 0.106 | n/a | 0.000 | 0.000 | 0.329 | 1000.507 | 0.008 | 0.000 | 0.043 | 0.000 | n/a | n/a | 1.090 | 0.106 | 0.000 | 1.090 | gw-r/thread-51/journal/page | none observed |

## P3 / warmup / internal (202 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.705 | n/a | n/a | n/a | 2.272 | n/a | 0.000 | 0.000 | 0.834 | 20.005 | 0.012 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.072 | 2.272 | 0.102 | 0.072 |
| p99 | 51.316 | n/a | n/a | n/a | 6.646 | n/a | 0.000 | 0.000 | 5.735 | 46.334 | 0.096 | 0.000 | 1.002 | 0.000 | n/a | n/a | 0.324 | 6.646 | 0.378 | 0.324 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d621949815c2ea1000000000000001a8 | 1005.587 | 0.190 | n/a | 0.000 | 0.000 | 3.048 | 1001.113 | 0.010 | 0.000 | 0.094 | 0.000 | n/a | n/a | 1.131 | 0.190 | 0.000 | 1.131 | gw-r/thread-48/journal/page | none observed |
| d621949815c2ea100000000000000035 | 54.341 | 2.319 | n/a | 0.000 | 0.000 | 3.796 | 39.256 | 0.013 | 8.756 | 0.116 | 0.000 | n/a | n/a | 0.084 | 2.319 | 0.043 | 0.084 | gw-r/thread-51/journal/page | none observed |
| d621949815c2ea100000000000000124 | 51.316 | 2.171 | n/a | 0.000 | 0.000 | 0.487 | 48.508 | 0.015 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.064 | 2.171 | 0.042 | 0.064 | gw-r/thread-52/journal/page | none observed |
| d621949815c2ea100000000000000112 | 49.448 | 2.573 | n/a | 0.000 | 0.000 | 0.392 | 46.334 | 0.026 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.073 | 2.573 | 0.052 | 0.073 | gw-r/thread-47/journal/page | none observed |
| d621949815c2ea1000000000000000cd | 38.562 | 2.101 | n/a | 0.000 | 0.000 | 0.600 | 35.715 | 0.010 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.057 | 2.101 | 0.054 | 0.057 | gw-r/thread-50/journal/page | none observed |
| d621949815c2ea1000000000000000d5 | 38.557 | 2.154 | n/a | 0.000 | 0.000 | 0.520 | 34.772 | 0.041 | 0.000 | 1.002 | 0.000 | n/a | n/a | 0.068 | 2.154 | 0.056 | 0.068 | gw-r/thread-52/journal/page | none observed |
| d621949815c2ea100000000000000067 | 36.934 | 6.646 | n/a | 0.000 | 0.000 | 0.799 | 29.223 | 0.011 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.149 | 6.646 | 0.180 | 0.149 | gw-r/thread-51/journal/page | none observed |
| d621949815c2ea100000000000000052 | 36.087 | 2.297 | n/a | 0.000 | 0.000 | 1.142 | 32.380 | 0.028 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.082 | 2.297 | 0.064 | 0.082 | gw-r/thread-48/journal/page | none observed |
| d621949815c2ea1000000000000001a2 | 35.640 | 2.233 | n/a | 0.000 | 0.000 | 0.377 | 32.902 | 0.008 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.073 | 2.233 | 0.063 | 0.073 | gw-r/thread-50/journal/page | none observed |
| d621949815c2ea10000000000000002a | 35.301 | 2.169 | n/a | 0.000 | 0.000 | 0.549 | 32.430 | 0.011 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.097 | 2.169 | 0.061 | 0.097 | gw-r/thread-47/journal/page | none observed |
| d621949815c2ea10000000000000007f | 35.234 | 4.273 | n/a | 0.000 | 0.000 | 1.979 | 28.721 | 0.019 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.119 | 4.273 | 0.121 | 0.119 | gw-r/thread-51/journal/page | none observed |
| d621949815c2ea100000000000000145 | 35.085 | 2.863 | n/a | 0.000 | 0.000 | 2.341 | 29.682 | 0.035 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.117 | 2.863 | 0.082 | 0.117 | gw-r/thread-47/journal/page | none observed |
| d621949815c2ea1000000000000000c3 | 34.026 | 2.063 | n/a | 0.000 | 0.000 | 0.489 | 31.269 | 0.031 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.056 | 2.063 | 0.061 | 0.056 | gw-r/thread-49/journal/page | none observed |
| d621949815c2ea1000000000000000bd | 33.890 | 3.907 | n/a | 0.000 | 0.000 | 1.134 | 28.682 | 0.012 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.068 | 3.907 | 0.115 | 0.068 | gw-r/thread-48/journal/page | none observed |
| d621949815c2ea10000000000000011e | 33.785 | 2.065 | n/a | 0.000 | 0.000 | 0.432 | 31.176 | 0.012 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.061 | 2.065 | 0.061 | 0.061 | gw-r/thread-50/journal/page | none observed |
| d621949815c2ea100000000000000098 | 33.212 | 2.103 | n/a | 0.000 | 0.000 | 0.467 | 30.392 | 0.072 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.071 | 2.103 | 0.063 | 0.071 | gw-r/thread-47/journal/page | none observed |
| d621949815c2ea100000000000000062 | 32.834 | 2.292 | n/a | 0.000 | 0.000 | 1.650 | 28.587 | 0.018 | 0.000 | 0.205 | 0.000 | n/a | n/a | 0.083 | 2.292 | 0.070 | 0.083 | gw-r/thread-48/journal/page | none observed |
| d621949815c2ea10000000000000017f | 32.406 | 2.254 | n/a | 0.000 | 0.000 | 2.240 | 27.771 | 0.030 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.063 | 2.254 | 0.070 | 0.063 | gw-r/thread-51/journal/page | none observed |
| d621949815c2ea100000000000000139 | 31.937 | 8.400 | n/a | 0.000 | 0.000 | 1.586 | 21.820 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.090 | 8.400 | 0.263 | 0.090 | gw-r/thread-47/journal/page | none observed |
| d621949815c2ea100000000000000089 | 31.687 | 3.301 | n/a | 0.000 | 0.000 | 3.845 | 24.413 | 0.016 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.064 | 3.301 | 0.104 | 0.064 | gw-r/thread-48/journal/page | none observed |

## P3 / idle-10 / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.763 | n/a | n/a | n/a | 2.029 | n/a | 0.000 | 0.000 | 0.564 | 5.656 | 0.012 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.072 | 2.029 | 0.277 | 0.072 |
| p99 | 1003.602 | n/a | n/a | n/a | 4.874 | n/a | 0.000 | 0.000 | 2.798 | 1000.938 | 0.071 | 0.000 | 0.090 | 0.000 | n/a | n/a | 1.103 | 4.874 | 0.359 | 1.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d621949815c2ea1000000000000001b3 | 1003.602 | 0.099 | n/a | 0.000 | 0.000 | 1.359 | 1000.938 | 0.012 | 0.000 | 0.090 | 0.000 | n/a | n/a | 1.103 | 0.099 | 0.000 | 1.103 | gw-r/thread-50/journal/page | none observed |
| d621949815c2ea1000000000000001ac | 15.649 | 4.874 | n/a | 0.000 | 0.000 | 2.798 | 7.755 | 0.021 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.126 | 4.874 | 0.311 | 0.126 | gw-r/thread-52/journal/page | none observed |
| d621949815c2ea1000000000000001b4 | 10.253 | 2.341 | n/a | 0.000 | 0.000 | 0.533 | 7.195 | 0.071 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.073 | 2.341 | 0.228 | 0.073 | gw-r/thread-52/gateway.admitted-work | none observed |
| d621949815c2ea1000000000000001ab | 8.763 | 2.425 | n/a | 0.000 | 0.000 | 0.564 | 5.656 | 0.012 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.070 | 2.425 | 0.277 | 0.070 | gw-r/thread-50/gateway.route | none observed |
| d621949815c2ea1000000000000001af | 5.646 | 2.029 | n/a | 0.000 | 0.000 | 0.502 | 3.024 | 0.006 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.067 | 2.029 | 0.359 | 0.067 | gw-r/thread-48/gateway.admitted-work | none observed |
| d621949815c2ea1000000000000001b1 | 5.490 | 1.943 | n/a | 0.000 | 0.000 | 0.685 | 2.749 | 0.011 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.072 | 1.943 | 0.354 | 0.072 | gw-r/thread-47/journal/page | none observed |

## P3 / idle-1000 / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 997.948 | n/a | n/a | n/a | 2.199 | n/a | 0.000 | 0.000 | 0.575 | 993.779 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.103 | 2.199 | 0.002 | 0.103 |
| p99 | 1002.649 | n/a | n/a | n/a | 4.315 | n/a | 0.000 | 0.000 | 3.878 | 1001.017 | 0.015 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.098 | 4.315 | 0.004 | 1.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d621949815c2ea1000000000000001bd | 1002.649 | 0.085 | n/a | 0.000 | 0.000 | 0.375 | 1001.017 | 0.015 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.090 | 0.085 | 0.000 | 1.090 | gw-r/thread-45/journal/page | none observed |
| d621949815c2ea1000000000000001bf | 1002.637 | 0.086 | n/a | 0.000 | 0.000 | 0.532 | 1000.889 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 1.098 | 0.086 | 0.000 | 1.098 | gw-r/thread-48/journal/page | none observed |
| d621949815c2ea1000000000000001bb | 1001.443 | 2.804 | n/a | 0.000 | 0.000 | 0.575 | 997.944 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.065 | 2.804 | 0.003 | 0.065 | gw-r/thread-51/journal/page | none observed |
| d621949815c2ea1000000000000001b7 | 997.948 | 4.315 | n/a | 0.000 | 0.000 | 0.925 | 992.474 | 0.008 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.168 | 4.315 | 0.004 | 0.168 | gw-r/thread-45/journal/page | none observed |
| d621949815c2ea1000000000000001b6 | 997.632 | 3.783 | n/a | 0.000 | 0.000 | 3.878 | 989.807 | 0.010 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.103 | 3.783 | 0.004 | 0.103 | gw-r/thread-51/journal/page | none observed |
| d621949815c2ea1000000000000001b9 | 996.761 | 2.199 | n/a | 0.000 | 0.000 | 0.652 | 993.779 | 0.007 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.077 | 2.199 | 0.002 | 0.077 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.760 | n/a | n/a | n/a | 0.033 | n/a | 0.000 | 0.000 | 0.711 | 200.924 | 0.010 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.071 | 0.033 | 0.000 | 0.071 |
| p99 | 202.717 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.832 | 202.073 | 0.012 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.074 | 0.042 | 0.000 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 021a32c65ac3684b00000000000000ce | 202.717 | 0.029 | n/a | 0.000 | 0.000 | 0.472 | 202.073 | 0.007 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.068 | 0.029 | 0.000 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 021a32c65ac3684b00000000000000d1 | 201.874 | 0.035 | n/a | 0.000 | 0.000 | 0.751 | 200.924 | 0.010 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.074 | 0.035 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 021a32c65ac3684b00000000000000d0 | 201.760 | 0.026 | n/a | 0.000 | 0.000 | 0.535 | 201.039 | 0.012 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.059 | 0.026 | 0.000 | 0.059 | gw-r/thread-52/journal/page | none observed |
| 021a32c65ac3684b00000000000000cf | 201.572 | 0.033 | n/a | 0.000 | 0.000 | 0.711 | 200.670 | 0.012 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.072 | 0.033 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 021a32c65ac3684b00000000000000d2 | 130.976 | 0.042 | n/a | 0.000 | 0.000 | 0.832 | 129.941 | 0.010 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.071 | 0.042 | 0.000 | 0.071 | gw-r/thread-47/journal/page | none observed |

## P3 / idle-10 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.804 | n/a | n/a | n/a | 0.033 | n/a | 0.000 | 0.000 | 0.863 | 200.736 | 0.010 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.072 | 0.033 | 0.000 | 0.072 |
| p99 | 205.240 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 4.337 | 200.855 | 0.017 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.098 | 0.043 | 0.000 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 021a32c65ac3684b00000000000000da | 205.240 | 0.032 | n/a | 0.000 | 0.000 | 4.337 | 200.735 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.072 | 0.032 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 021a32c65ac3684b00000000000000d8 | 201.949 | 0.033 | n/a | 0.000 | 0.000 | 0.863 | 200.855 | 0.012 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.098 | 0.033 | 0.000 | 0.098 | gw-r/thread-52/journal/page | none observed |
| 021a32c65ac3684b00000000000000d9 | 201.804 | 0.036 | n/a | 0.000 | 0.000 | 0.874 | 200.736 | 0.010 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.079 | 0.036 | 0.000 | 0.079 | gw-r/thread-45/journal/page | none observed |
| 021a32c65ac3684b00000000000000d7 | 201.799 | 0.030 | n/a | 0.000 | 0.000 | 0.805 | 200.804 | 0.008 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.069 | 0.030 | 0.000 | 0.069 | gw-r/thread-51/journal/page | none observed |
| 021a32c65ac3684b00000000000000db | 114.066 | 0.043 | n/a | 0.000 | 0.000 | 0.592 | 113.308 | 0.017 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.065 | 0.043 | 0.000 | 0.065 | gw-r/thread-47/journal/page | none observed |

## P3 / idle-1000 / read (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.652 | n/a | n/a | n/a | 0.031 | n/a | 0.000 | 0.000 | 0.718 | 200.688 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 |
| p99 | 204.574 | n/a | n/a | n/a | 0.085 | n/a | 0.000 | 0.000 | 3.542 | 203.495 | 0.034 | 0.000 | 0.336 | 0.000 | n/a | n/a | 0.143 | 0.085 | 0.001 | 0.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 021a32c65ac3684b00000000000000dd | 204.574 | 0.029 | n/a | 0.000 | 0.000 | 0.881 | 203.495 | 0.007 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.068 | 0.029 | 0.000 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 021a32c65ac3684b00000000000000f7 | 204.372 | 0.024 | n/a | 0.000 | 0.000 | 3.542 | 200.682 | 0.006 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.058 | 0.024 | 0.000 | 0.058 | gw-r/thread-49/journal/page | none observed |
| 021a32c65ac3684b00000000000000f3 | 203.932 | 0.065 | n/a | 0.000 | 0.000 | 0.478 | 203.272 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.062 | 0.065 | 0.000 | 0.062 | gw-r/thread-50/journal/page | none observed |
| 021a32c65ac3684b00000000000000de | 203.675 | 0.025 | n/a | 0.000 | 0.000 | 0.514 | 202.906 | 0.034 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.067 | 0.025 | 0.000 | 0.067 | gw-r/thread-49/journal/page | none observed |
| 021a32c65ac3684b00000000000000f2 | 203.033 | 0.025 | n/a | 0.000 | 0.000 | 1.776 | 201.086 | 0.011 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.063 | 0.025 | 0.000 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 021a32c65ac3684b00000000000000e8 | 202.356 | 0.034 | n/a | 0.000 | 0.000 | 1.309 | 200.851 | 0.008 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.091 | 0.034 | 0.000 | 0.091 | gw-r/thread-49/journal/page | none observed |
| 021a32c65ac3684b00000000000000df | 202.297 | 0.046 | n/a | 0.000 | 0.000 | 1.270 | 200.756 | 0.023 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.143 | 0.046 | 0.000 | 0.143 | gw-r/thread-50/journal/page | none observed |
| 021a32c65ac3684b00000000000000e4 | 202.209 | 0.031 | n/a | 0.000 | 0.000 | 1.003 | 200.998 | 0.007 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.070 | 0.031 | 0.000 | 0.070 | gw-r/thread-50/journal/page | none observed |
| 021a32c65ac3684b00000000000000e9 | 202.109 | 0.045 | n/a | 0.000 | 0.000 | 0.786 | 201.055 | 0.017 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.114 | 0.045 | 0.000 | 0.114 | gw-r/thread-50/journal/page | none observed |
| 021a32c65ac3684b00000000000000f1 | 201.773 | 0.028 | n/a | 0.000 | 0.000 | 0.704 | 200.895 | 0.009 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.067 | 0.028 | 0.000 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 021a32c65ac3684b00000000000000e2 | 201.761 | 0.027 | n/a | 0.000 | 0.000 | 0.731 | 200.870 | 0.007 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.062 | 0.027 | 0.000 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 021a32c65ac3684b00000000000000f5 | 201.724 | 0.023 | n/a | 0.000 | 0.000 | 0.784 | 200.787 | 0.006 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.056 | 0.023 | 0.000 | 0.056 | gw-r/thread-47/journal/page | none observed |
| 021a32c65ac3684b00000000000000e1 | 201.698 | 0.037 | n/a | 0.000 | 0.000 | 0.718 | 200.791 | 0.008 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.066 | 0.037 | 0.000 | 0.066 | gw-r/thread-52/journal/page | none observed |
| 021a32c65ac3684b00000000000000e6 | 201.655 | 0.029 | n/a | 0.000 | 0.000 | 0.600 | 200.891 | 0.025 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.068 | 0.029 | 0.000 | 0.068 | gw-r/thread-52/journal/page | none observed |
| 021a32c65ac3684b00000000000000e7 | 201.652 | 0.028 | n/a | 0.000 | 0.000 | 0.542 | 200.674 | 0.010 | 0.000 | 0.336 | 0.000 | n/a | n/a | 0.062 | 0.028 | 0.000 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 021a32c65ac3684b00000000000000e3 | 201.643 | 0.038 | n/a | 0.000 | 0.000 | 0.732 | 200.688 | 0.012 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.104 | 0.038 | 0.000 | 0.104 | gw-r/thread-49/journal/page | none observed |
| 021a32c65ac3684b00000000000000dc | 201.562 | 0.050 | n/a | 0.000 | 0.000 | 0.735 | 200.607 | 0.012 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.109 | 0.050 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 021a32c65ac3684b00000000000000ee | 201.492 | 0.037 | n/a | 0.000 | 0.000 | 0.678 | 200.625 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.098 | 0.037 | 0.000 | 0.098 | gw-r/thread-50/journal/page | none observed |
| 021a32c65ac3684b00000000000000ed | 201.466 | 0.036 | n/a | 0.000 | 0.000 | 0.620 | 200.650 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.098 | 0.036 | 0.000 | 0.098 | gw-r/thread-49/journal/page | none observed |
| 021a32c65ac3684b00000000000000eb | 201.415 | 0.025 | n/a | 0.000 | 0.000 | 0.731 | 200.544 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.055 | 0.025 | 0.000 | 0.055 | gw-r/thread-52/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 210 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/1.081 ms; post-ACK p50/p99: 0.332/0.848 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 12.765 | 12.383 | 12.351 | reported |
| All-primary p99 ms | 32.667 | 32.241 | 32.239 | <=50 |
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
| 5-10 | >=1000 | 2 | 16.250/22.447 | 15.331 | 7.326 | 29.412 | 0.060/0.061 |
| 5-10 | 0-50 | 194 | 12.620/33.830 | 12.078 | 7.476 | 18.850 | 0.060/0.019 |
| 5-10 | overlap | 9 | 16.104/27.538 | 15.800 | 10.457 | 26.821 | 0.080/0.017 |
| 5-10 | 250-1000 | 5 | 12.884/15.507 | 12.567 | 6.634 | 21.123 | 0.060/0.017 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 210 | 0 | 0.000 |

## Writer heap, GC and scheduler stalls

Source 8f78697818777469336fe3fcc35cad73b8bff95e; 210 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 207.358 / 214.666 |
| GC events / total duration / maximum ms | 32 / 43.208 / 3.687 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":32} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 32.667 / 0 / 0.000 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.
