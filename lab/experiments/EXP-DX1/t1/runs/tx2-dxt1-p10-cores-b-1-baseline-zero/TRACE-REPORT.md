# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (85.688 ms, trace `a46e1642d1c6904800000000000001af`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (77.443 ms, trace `a46e1642d1c69048000000000000013f`); `gw-w/thread-64/peer.transact-await (includes order/network/storage)` (90.962 ms, trace `a46e1642d1c690480000000000001c80`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (93.126 ms, trace `a46e1642d1c690480000000000001c81`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (67.947 ms, trace `a46e1642d1c690480000000000000202`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-cores-b-1-baseline-zero`; source `d709fd769d271992b6a87841489c90665585e919`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 4258/4259 (99.977%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 4259/4259. Raw trace bytes: 10720977.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 251 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13422.973 | 529.030 | 8.692 | 454 |
| L1 | 0 | 44199.492 | 837.209 | 28.322 | 1476 |
| L4 | 0 | 44847.943 | 966.946 | 16.655 | 1762 |
| L16 | 0 | 44948.638 | 8529.175 | 58.873 | 34266 |
| L64 | 0 | 44514.070 | 9042.763 | 77.613 | 35836 |
| L256 | 0 | 44730.983 | 936.940 | 19.749 | 1560 |
| L1024 | 0 | 44021.529 | 1133.983 | 23.487 | 1598 |
| tail | 0 | 164320.307 | 3983.986 | 75.097 | 6128 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| a46e1642d1c6904800000000000001af | driver.queue.scheduler-dispatch | 0.063 | none | 0 / 32 |
| a46e1642d1c6904800000000000001af | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace a46e1642d1c6904800000000000001af waited: []

| a46e1642d1c69048000000000000013f | driver.queue.scheduler-dispatch | 0.045 | none | 0 / 32 |
| a46e1642d1c69048000000000000013f | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace a46e1642d1c69048000000000000013f waited: []

| a46e1642d1c690480000000000001c80 | driver.queue.scheduler-late | 0.292 | none | 0 / 32 |
| a46e1642d1c690480000000000001c80 | driver.queue.scheduler-dispatch | 0.056 | none | 0 / 32 |

Observed active steps while trace a46e1642d1c690480000000000001c80 waited: []

| a46e1642d1c690480000000000001c81 | driver.queue.scheduler-dispatch | 0.037 | none | 1 / 32 |
| a46e1642d1c690480000000000001c81 | driver.queue.scheduler-late | 0.002 | none | 1 / 32 |

Observed active steps while trace a46e1642d1c690480000000000001c81 waited: []

| a46e1642d1c690480000000000000202 | driver.queue.scheduler-dispatch | 0.035 | none | 0 / 32 |
| a46e1642d1c690480000000000000202 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace a46e1642d1c690480000000000000202 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.314 | 0.580 | 0.000 | 0.633 | 4.588 | 3.077 | 0.000 | 0.085 | 1.214 | 5.618 | 0.029 | n/a | 0.384 | 14.531 | n/a | n/a | 0.027 | 5.224 | 0.183 | 0.027 |
| p99 | 55.160 | 4.341 | 0.000 | 5.104 | 14.481 | n/a | 2.833 | 2.862 | 5.167 | 18.388 | 0.134 | n/a | 3.335 | 31.871 | n/a | n/a | 0.164 | 14.905 | 0.329 | 0.164 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c6904800000000000000f1 | 55.160 | 13.410 | n/a | 0.000 | 0.279 | 1.010 | 8.293 | 0.022 | n/a | 0.112 | 31.871 | n/a | n/a | 0.164 | 13.689 | 0.248 | 0.164 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000000f5 | 50.629 | 14.481 | 0.372 | 0.000 | 0.052 | 1.969 | 9.868 | 0.134 | n/a | 0.241 | 23.492 | n/a | n/a | 0.021 | 14.905 | 0.294 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000010d | 43.697 | 4.892 | 0.270 | 0.000 | 0.063 | 1.804 | 18.388 | 0.085 | n/a | 0.213 | 17.961 | n/a | n/a | 0.021 | 5.224 | 0.120 | 0.021 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| a46e1642d1c6904800000000000000f9 | 39.333 | 8.236 | 3.077 | 0.000 | 0.100 | 1.811 | 10.719 | 0.075 | n/a | 0.252 | 15.009 | n/a | n/a | 0.054 | 11.413 | 0.290 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.011ms |
| a46e1642d1c69048000000000000011b | 37.331 | 5.343 | 0.328 | 0.401 | 0.043 | 1.214 | 14.115 | 0.073 | n/a | 0.384 | 15.411 | n/a | n/a | 0.018 | 6.115 | 0.164 | 0.018 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| a46e1642d1c690480000000000000105 | 36.247 | 5.979 | 0.295 | 0.000 | 0.076 | 1.462 | 7.775 | 0.117 | n/a | 3.051 | 17.462 | n/a | n/a | 0.030 | 6.351 | 0.175 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| a46e1642d1c690480000000000000107 | 33.937 | 4.723 | 0.227 | 0.000 | 0.130 | 1.095 | 12.141 | 0.029 | n/a | 0.394 | 15.153 | n/a | n/a | 0.046 | 5.080 | 0.150 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| a46e1642d1c690480000000000000117 | 33.646 | 5.152 | 0.241 | 0.294 | 0.048 | 5.167 | 10.977 | 0.086 | n/a | 0.179 | 11.480 | n/a | n/a | 0.021 | 5.735 | 0.170 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.066ms |
| a46e1642d1c6904800000000000000fa | 32.560 | 4.854 | n/a | 2.651 | 0.174 | 0.942 | 4.343 | 0.033 | n/a | 0.713 | 18.781 | n/a | n/a | 0.068 | 7.680 | 0.236 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000118 | 31.983 | 5.476 | n/a | 0.687 | 2.862 | 1.463 | 5.705 | 0.030 | n/a | 0.459 | 15.275 | n/a | n/a | 0.025 | 9.025 | 0.282 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.050ms |
| a46e1642d1c690480000000000000108 | 31.931 | 7.411 | n/a | 2.833 | 0.096 | 0.620 | 5.236 | 0.022 | n/a | 0.084 | 15.600 | n/a | n/a | 0.028 | 10.341 | 0.324 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000123 | 31.782 | 5.194 | 0.155 | 0.415 | 0.051 | 1.165 | 6.675 | 0.028 | n/a | 0.387 | 17.692 | n/a | n/a | 0.020 | 5.814 | 0.183 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| a46e1642d1c6904800000000000000fd | 31.134 | 4.625 | 0.256 | 0.000 | 0.079 | 1.820 | 12.808 | 0.028 | n/a | 0.112 | 11.380 | n/a | n/a | 0.027 | 4.960 | 0.159 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| a46e1642d1c690480000000000000111 | 30.439 | 4.588 | 0.176 | 0.000 | 0.105 | 1.234 | 9.817 | 0.032 | n/a | 0.073 | 14.381 | n/a | n/a | 0.033 | 4.869 | 0.160 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| a46e1642d1c6904800000000000000ff | 30.314 | 4.886 | 0.513 | 0.000 | 0.082 | 3.131 | 7.704 | 0.030 | n/a | 0.114 | 13.821 | n/a | n/a | 0.033 | 5.481 | 0.181 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| a46e1642d1c69048000000000000011f | 29.402 | 4.025 | 0.278 | 0.226 | 0.124 | 1.151 | 6.007 | 0.029 | n/a | 0.418 | 17.097 | n/a | n/a | 0.045 | 4.653 | 0.158 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| a46e1642d1c690480000000000000102 | 28.901 | 4.581 | n/a | 1.940 | 1.309 | 0.650 | 1.791 | 0.022 | n/a | 0.435 | 18.145 | n/a | n/a | 0.028 | 7.830 | 0.271 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000010a | 24.243 | 4.445 | n/a | 1.496 | 0.127 | 1.182 | 2.291 | 0.050 | n/a | 0.834 | 13.771 | n/a | n/a | 0.047 | 6.068 | 0.250 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000114 | 23.974 | 2.666 | n/a | 0.000 | 0.073 | 2.016 | 1.304 | 0.022 | n/a | 3.335 | 14.531 | n/a | n/a | 0.027 | 2.739 | 0.114 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000120 | 22.535 | 2.424 | n/a | 0.000 | 0.085 | 0.887 | 3.820 | 0.020 | n/a | 0.112 | 15.157 | n/a | n/a | 0.031 | 2.509 | 0.111 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.731 | 1.002 | 0.000 | 0.646 | 2.666 | n/a | 0.000 | 0.174 | 1.052 | 1.659 | 0.022 | n/a | 0.713 | 8.876 | n/a | n/a | 0.027 | 3.095 | 0.236 | 0.027 |
| p99 | 32.560 | 2.594 | 0.000 | 2.445 | 4.854 | n/a | 2.651 | 1.984 | 2.016 | 5.618 | 0.045 | n/a | 3.335 | 18.781 | n/a | n/a | 0.113 | 7.680 | 0.329 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c6904800000000000000fa | 32.560 | 4.854 | n/a | 2.651 | 0.174 | 0.942 | 4.343 | 0.033 | n/a | 0.713 | 18.781 | n/a | n/a | 0.068 | 7.680 | 0.236 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000114 | 23.974 | 2.666 | n/a | 0.000 | 0.073 | 2.016 | 1.304 | 0.022 | n/a | 3.335 | 14.531 | n/a | n/a | 0.027 | 2.739 | 0.114 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000120 | 22.535 | 2.424 | n/a | 0.000 | 0.085 | 0.887 | 3.820 | 0.020 | n/a | 0.112 | 15.157 | n/a | n/a | 0.031 | 2.509 | 0.111 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| a46e1642d1c6904800000000000000f6 | 17.923 | 3.915 | n/a | 0.000 | 1.984 | 1.227 | 1.664 | 0.020 | n/a | 0.125 | 8.876 | n/a | n/a | 0.113 | 5.899 | 0.329 | 0.113 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000011c | 17.731 | 2.969 | n/a | 0.000 | 1.891 | 1.231 | 1.659 | 0.027 | n/a | 0.947 | 8.981 | n/a | n/a | 0.025 | 4.860 | 0.274 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000124 | 16.997 | 3.080 | n/a | 0.000 | 0.749 | 1.052 | 1.297 | 0.025 | n/a | 2.114 | 8.657 | n/a | n/a | 0.023 | 3.829 | 0.225 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000126 | 16.358 | 2.300 | n/a | 0.000 | 0.058 | 1.177 | 5.618 | 0.045 | n/a | 1.442 | 5.691 | n/a | n/a | 0.027 | 2.358 | 0.144 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000100 | 10.022 | 2.069 | n/a | 0.000 | 1.026 | 0.746 | 1.376 | 0.020 | n/a | 0.690 | 4.063 | n/a | n/a | 0.032 | 3.095 | 0.309 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000112 | 8.786 | 2.224 | n/a | 0.000 | 0.057 | 0.707 | 1.056 | 0.020 | n/a | 0.382 | 4.319 | n/a | n/a | 0.022 | 2.281 | 0.260 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.607 | 0.262 | 0.000 | 0.485 | 3.821 | n/a | 0.000 | 0.071 | 1.347 | 4.597 | 0.029 | n/a | 0.217 | 11.484 | n/a | n/a | 0.031 | 4.348 | 0.185 | 0.031 |
| p99 | 113.197 | 2.986 | 0.000 | 3.630 | 11.925 | n/a | 2.411 | 18.643 | 5.475 | 21.309 | 0.161 | n/a | 4.495 | 85.688 | n/a | n/a | 0.090 | 20.534 | 0.683 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c6904800000000000001af | 113.197 | 6.333 | 0.379 | 0.597 | 0.066 | 3.193 | 16.675 | 0.068 | n/a | 0.159 | 85.688 | n/a | n/a | 0.038 | 7.376 | 0.065 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.078ms |
| a46e1642d1c69048000000000000013f | 105.993 | 6.675 | 0.227 | 0.000 | 0.047 | 2.187 | 19.213 | 0.062 | n/a | 0.120 | 77.443 | n/a | n/a | 0.020 | 6.949 | 0.066 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| a46e1642d1c69048000000000000014d | 80.313 | 3.570 | n/a | 0.000 | 0.072 | 1.679 | 3.094 | 0.054 | n/a | 1.593 | 70.222 | n/a | n/a | 0.031 | 3.642 | 0.045 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| a46e1642d1c69048000000000000014f | 45.113 | 11.925 | n/a | 2.411 | 0.057 | 2.215 | 1.928 | 0.022 | n/a | 2.870 | 23.654 | n/a | n/a | 0.031 | 14.393 | 0.319 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| a46e1642d1c690480000000000000141 | 44.738 | 4.282 | 0.265 | 0.256 | 0.044 | 1.896 | 9.474 | 0.064 | n/a | 0.744 | 27.690 | n/a | n/a | 0.022 | 4.847 | 0.108 | 0.022 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| a46e1642d1c6904800000000000001d7 | 42.584 | 3.865 | 0.335 | 0.259 | 0.065 | 3.513 | 21.309 | 0.051 | n/a | 1.663 | 11.484 | n/a | n/a | 0.041 | 4.523 | 0.106 | 0.041 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.025ms |
| a46e1642d1c6904800000000000001a5 | 41.314 | 3.821 | 0.197 | 0.000 | 0.054 | 1.752 | 10.242 | 0.161 | n/a | 0.833 | 24.219 | n/a | n/a | 0.037 | 4.071 | 0.099 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| a46e1642d1c690480000000000000130 | 39.388 | 5.449 | 0.226 | 0.492 | 0.032 | 1.640 | 12.652 | 0.066 | n/a | 0.565 | 18.252 | n/a | n/a | 0.014 | 6.199 | 0.157 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| a46e1642d1c690480000000000000187 | 38.618 | 3.630 | 0.211 | 0.333 | 0.174 | 2.292 | 16.067 | 0.083 | n/a | 0.543 | 15.219 | n/a | n/a | 0.064 | 4.348 | 0.113 | 0.064 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| a46e1642d1c69048000000000000018f | 38.267 | 5.236 | 0.155 | 0.448 | 0.046 | 5.475 | 5.914 | 0.036 | n/a | 0.366 | 20.565 | n/a | n/a | 0.026 | 5.885 | 0.154 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| a46e1642d1c690480000000000000173 | 38.110 | 4.886 | 0.187 | 0.488 | 0.071 | 2.221 | 6.692 | 0.036 | n/a | 0.117 | 23.371 | n/a | n/a | 0.041 | 5.632 | 0.148 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| a46e1642d1c6904800000000000001a9 | 37.741 | 3.969 | 0.157 | 0.271 | 0.069 | 3.525 | 6.885 | 0.034 | n/a | 0.328 | 22.463 | n/a | n/a | 0.041 | 4.466 | 0.118 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| a46e1642d1c690480000000000000177 | 37.564 | 9.015 | n/a | 0.000 | 0.085 | 1.048 | 4.373 | 0.042 | n/a | 0.535 | 22.430 | n/a | n/a | 0.036 | 9.101 | 0.242 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| a46e1642d1c6904800000000000001d4 | 37.500 | 7.773 | n/a | 1.892 | 0.073 | 0.673 | 7.218 | 0.079 | n/a | 4.495 | 15.262 | n/a | n/a | 0.034 | 9.738 | 0.260 | 0.034 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.015ms |
| a46e1642d1c690480000000000000148 | 37.394 | 3.285 | 0.152 | 0.319 | 0.034 | 2.922 | 9.909 | 0.093 | n/a | 0.225 | 20.430 | n/a | n/a | 0.026 | 3.790 | 0.101 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| a46e1642d1c690480000000000000151 | 36.771 | 5.017 | 0.217 | 0.237 | 0.023 | 2.429 | 12.261 | 0.041 | n/a | 0.328 | 16.207 | n/a | n/a | 0.011 | 5.493 | 0.149 | 0.011 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.551ms; driver.publication.readback 0.065ms; driver.reader-basis.broadcast 0.042ms; driver.publication.persist-deferred 0.031ms |
| a46e1642d1c69048000000000000012d | 35.302 | 4.957 | 0.164 | 0.000 | 0.051 | 1.462 | 9.867 | 0.044 | n/a | 0.124 | 18.611 | n/a | n/a | 0.023 | 5.172 | 0.147 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| a46e1642d1c690480000000000000137 | 34.930 | 9.173 | n/a | 0.000 | 0.074 | 4.083 | 5.855 | 0.067 | n/a | 0.693 | 14.954 | n/a | n/a | 0.031 | 9.247 | 0.265 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000016d | 34.864 | 3.686 | 0.257 | 0.222 | 0.065 | 1.308 | 14.795 | 0.032 | n/a | 0.217 | 14.254 | n/a | n/a | 0.027 | 4.231 | 0.121 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| a46e1642d1c690480000000000000171 | 33.798 | 6.668 | 0.145 | 0.237 | 0.056 | 1.606 | 9.362 | 0.044 | n/a | 0.124 | 15.525 | n/a | n/a | 0.030 | 7.106 | 0.210 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |

## P2 / L1 / commit / 5-10 facts (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.864 | 0.000 | 0.000 | 0.468 | 2.622 | n/a | 0.000 | 0.085 | 1.002 | 1.301 | 0.024 | n/a | 0.146 | 9.824 | n/a | n/a | 0.031 | 2.787 | 0.158 | 0.031 |
| p99 | 34.930 | 1.005 | 0.000 | 0.973 | 9.173 | n/a | 0.000 | 18.643 | 4.083 | 5.855 | 0.072 | n/a | 1.245 | 21.833 | n/a | n/a | 0.062 | 20.534 | 0.683 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c690480000000000000137 | 34.930 | 9.173 | n/a | 0.000 | 0.074 | 4.083 | 5.855 | 0.067 | n/a | 0.693 | 14.954 | n/a | n/a | 0.031 | 9.247 | 0.265 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000178 | 30.043 | 1.892 | n/a | 0.000 | 18.643 | 1.379 | 1.147 | 0.026 | n/a | 0.121 | 6.796 | n/a | n/a | 0.040 | 20.534 | 0.683 | 0.040 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.532ms; driver.publication.readback 0.113ms; driver.publication.persist-deferred 0.028ms |
| a46e1642d1c690480000000000000133 | 29.483 | 3.144 | n/a | 0.000 | 1.389 | 1.028 | 1.891 | 0.044 | n/a | 0.131 | 21.833 | n/a | n/a | 0.023 | 4.533 | 0.154 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000018d | 22.567 | 2.622 | n/a | 0.000 | 0.047 | 0.893 | 1.320 | 0.027 | n/a | 0.102 | 17.535 | n/a | n/a | 0.021 | 2.669 | 0.118 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000001cd | 21.758 | 3.257 | n/a | 0.000 | 0.138 | 1.128 | 1.617 | 0.024 | n/a | 0.133 | 15.402 | n/a | n/a | 0.058 | 3.395 | 0.156 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000001d3 | 20.739 | 1.860 | n/a | 0.000 | 0.065 | 1.490 | 1.369 | 0.021 | n/a | 0.146 | 15.758 | n/a | n/a | 0.028 | 1.925 | 0.093 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000195 | 20.662 | 2.237 | n/a | 0.000 | 0.743 | 0.851 | 1.825 | 0.072 | n/a | 0.185 | 14.729 | n/a | n/a | 0.020 | 2.980 | 0.144 | 0.020 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000015d | 20.148 | 3.189 | n/a | 0.000 | 0.138 | 1.313 | 3.271 | 0.027 | n/a | 1.245 | 10.913 | n/a | n/a | 0.052 | 3.327 | 0.165 | 0.052 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000001cf | 19.674 | 3.423 | n/a | 0.000 | 0.143 | 1.002 | 1.293 | 0.024 | n/a | 0.459 | 13.272 | n/a | n/a | 0.057 | 3.566 | 0.181 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000183 | 19.597 | 3.985 | n/a | 0.000 | 0.133 | 1.455 | 1.167 | 0.022 | n/a | 0.446 | 12.346 | n/a | n/a | 0.043 | 4.117 | 0.210 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000017f | 19.379 | 2.641 | n/a | 0.000 | 0.061 | 0.691 | 2.755 | 0.060 | n/a | 0.124 | 13.024 | n/a | n/a | 0.023 | 2.702 | 0.139 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000001bf | 16.864 | 2.584 | n/a | 0.000 | 0.086 | 3.501 | 0.742 | 0.020 | n/a | 0.064 | 9.824 | n/a | n/a | 0.043 | 2.671 | 0.158 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000001c7 | 15.996 | 2.359 | n/a | 0.000 | 0.056 | 0.615 | 0.883 | 0.019 | n/a | 0.095 | 11.943 | n/a | n/a | 0.025 | 2.415 | 0.151 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000016f | 15.122 | 2.039 | n/a | 0.000 | 0.071 | 0.579 | 2.758 | 0.021 | n/a | 0.526 | 9.101 | n/a | n/a | 0.027 | 2.110 | 0.140 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| a46e1642d1c6904800000000000001c9 | 14.796 | 2.683 | n/a | 0.000 | 0.104 | 0.826 | 1.004 | 0.021 | n/a | 0.332 | 9.780 | n/a | n/a | 0.046 | 2.787 | 0.188 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000193 | 14.745 | 2.073 | n/a | 0.000 | 0.068 | 1.116 | 2.106 | 0.058 | n/a | 0.293 | 9.003 | n/a | n/a | 0.028 | 2.140 | 0.145 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000149 | 13.720 | 2.154 | n/a | 0.000 | 0.071 | 0.597 | 1.151 | 0.021 | n/a | 0.375 | 9.323 | n/a | n/a | 0.028 | 2.225 | 0.162 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| a46e1642d1c6904800000000000001db | 12.406 | 3.409 | n/a | 0.000 | 0.132 | 1.054 | 1.228 | 0.025 | n/a | 0.783 | 5.714 | n/a | n/a | 0.062 | 3.541 | 0.285 | 0.062 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000153 | 12.098 | 3.780 | n/a | 0.000 | 0.173 | 1.002 | 1.169 | 0.024 | n/a | 0.231 | 5.660 | n/a | n/a | 0.057 | 3.954 | 0.327 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000161 | 12.013 | 1.786 | n/a | 0.000 | 0.085 | 0.620 | 1.686 | 0.021 | n/a | 0.095 | 7.681 | n/a | n/a | 0.039 | 1.871 | 0.156 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (61 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 96.549 | n/a | n/a | n/a | 31.657 | 5.955 | 1.826 | 0.000 | 0.416 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.938 | 52.548 | 0.666 | 14.938 |
| p99 | 270.599 | n/a | n/a | n/a | 107.755 | 140.783 | 14.085 | 0.000 | 77.222 | 113.796 | 81.582 | n/a | 0.032 | 0.000 | n/a | n/a | 199.799 | 245.930 | 1.000 | 199.799 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c6904800000000000011de | 270.599 | 93.581 | 140.783 | 11.567 | 0.000 | 0.418 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.251 | 245.930 | 0.909 | 24.251 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.217ms; driver.reader-basis.broadcast 0.215ms; driver.reader-basis.broadcast 0.191ms; driver.publication.readback 0.134ms; driver.publication.readback 0.085ms |
| a46e1642d1c6904800000000000019b8 | 249.605 | 41.475 | 6.478 | 1.449 | 0.000 | 0.403 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 199.799 | 49.403 | 0.198 | 199.799 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.275ms; driver.publication.readback 0.167ms; driver.publication.readback 0.140ms; driver.publication.readback 0.132ms |
| a46e1642d1c6904800000000000019be | 234.674 | 30.583 | 88.944 | 1.284 | 0.000 | 0.476 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 113.387 | 120.811 | 0.515 | 113.387 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.275ms; driver.publication.readback 0.167ms; driver.publication.readback 0.140ms; driver.publication.readback 0.132ms |
| a46e1642d1c6904800000000000019b6 | 224.954 | 75.431 | 13.867 | 13.259 | 0.000 | 0.737 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 121.660 | 102.557 | 0.456 | 121.660 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.275ms; driver.publication.readback 0.167ms; driver.publication.readback 0.140ms; driver.publication.readback 0.132ms |
| a46e1642d1c6904800000000000019d2 | 207.338 | 98.692 | 91.008 | 8.594 | 0.000 | 0.223 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.821 | 198.294 | 0.956 | 8.821 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.275ms; driver.publication.readback 0.269ms; driver.publication.readback 0.116ms; driver.publication.readback 0.109ms |
| a46e1642d1c6904800000000000019d1 | 206.303 | 42.058 | 97.147 | 3.208 | 0.000 | 0.200 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 63.690 | 142.413 | 0.690 | 63.690 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.275ms; driver.publication.readback 0.269ms; driver.publication.readback 0.116ms; driver.publication.readback 0.109ms |
| a46e1642d1c6904800000000000011d4 | 205.282 | 49.662 | 0.210 | 2.677 | 0.000 | 10.946 | 60.194 | 81.582 | n/a | 0.007 | 0.000 | n/a | n/a | 0.005 | 52.548 | 0.256 | 0.005 | gw-r/thread-46/gateway.admission-wait | driver.reader-basis.broadcast 0.217ms; driver.reader-basis.broadcast 0.215ms; driver.publication.readback 0.156ms; driver.publication.readback 0.134ms; driver.publication.readback 0.085ms |
| a46e1642d1c6904800000000000019d4 | 203.088 | 19.730 | 81.406 | 0.000 | 0.000 | 0.173 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 101.778 | 101.136 | 0.498 | 101.778 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.275ms; driver.publication.readback 0.269ms; driver.publication.readback 0.116ms; driver.publication.readback 0.109ms |
| a46e1642d1c6904800000000000011df | 184.520 | 45.427 | 97.566 | 1.915 | 0.000 | 0.290 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.323 | 144.908 | 0.785 | 39.323 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.217ms; driver.reader-basis.broadcast 0.215ms; driver.publication.readback 0.085ms; driver.publication.readback 0.081ms; driver.publication.readback 0.078ms |
| a46e1642d1c6904800000000000019cf | 178.427 | 52.424 | 84.369 | 7.886 | 0.000 | 0.416 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.333 | 144.679 | 0.811 | 33.333 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.275ms; driver.publication.readback 0.269ms; driver.publication.readback 0.140ms; driver.publication.readback 0.116ms |
| a46e1642d1c69048000000000000216f | 162.553 | 71.708 | 0.465 | 8.280 | 0.000 | 11.887 | 70.190 | 0.005 | n/a | 0.010 | 0.000 | n/a | n/a | 0.009 | 80.452 | 0.495 | 0.009 | gw-r/thread-43/gateway.admitted-work | driver.expected-state.bind-receipt 1.944ms; driver.reader-basis.broadcast 0.345ms; driver.reader-basis.broadcast 0.338ms; driver.publication.readback 0.061ms; driver.publication.readback 0.061ms |
| a46e1642d1c690480000000000002170 | 161.863 | 16.407 | 0.300 | 1.005 | 0.000 | 77.222 | 1.598 | 65.317 | n/a | 0.006 | 0.000 | n/a | n/a | 0.008 | 17.712 | 0.109 | 0.008 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.338ms; driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.018ms |
| a46e1642d1c690480000000000001cb7 | 160.342 | 23.805 | 5.955 | 0.000 | 0.000 | 0.391 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 130.191 | 29.760 | 0.186 | 130.191 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.714ms; driver.reader-basis.broadcast 0.308ms; driver.publication.readback 0.099ms; driver.publication.readback 0.064ms; driver.publication.readback 0.063ms |
| a46e1642d1c690480000000000001cbd | 156.779 | 11.649 | 137.756 | 0.000 | 0.000 | 0.222 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.152 | 149.405 | 0.953 | 7.152 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.714ms; driver.reader-basis.broadcast 0.308ms; driver.publication.readback 0.099ms; driver.publication.readback 0.064ms; driver.publication.readback 0.063ms |
| a46e1642d1c690480000000000001cbf | 151.651 | 15.510 | 71.844 | 0.000 | 0.000 | 0.445 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 63.852 | 87.355 | 0.576 | 63.852 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.714ms; driver.reader-basis.broadcast 0.308ms; driver.publication.readback 0.099ms; driver.publication.readback 0.064ms; driver.publication.readback 0.061ms |
| a46e1642d1c6904800000000000011d7 | 148.960 | 11.943 | 70.705 | 0.000 | 0.000 | 8.122 | 0.856 | 57.318 | n/a | 0.012 | 0.000 | n/a | n/a | 0.003 | 82.649 | 0.555 | 0.003 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.217ms; driver.publication.readback 0.156ms; driver.publication.readback 0.134ms; driver.publication.readback 0.085ms; driver.publication.readback 0.078ms |
| a46e1642d1c6904800000000000019b5 | 146.925 | 107.755 | 0.293 | 14.085 | 0.000 | 1.034 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.758 | 122.133 | 0.831 | 23.758 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.275ms; driver.publication.readback 0.167ms; driver.publication.readback 0.132ms; driver.publication.readback 0.105ms; driver.publication.readback 0.061ms |
| a46e1642d1c6904800000000000011c7 | 143.496 | 22.576 | 0.303 | 3.307 | 0.000 | 3.484 | 113.796 | 0.006 | n/a | 0.014 | 0.000 | n/a | n/a | 0.010 | 26.186 | 0.182 | 0.010 | gw-r/thread-40/gateway.admitted-work | driver.reader-basis.broadcast 0.217ms; driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.156ms; driver.publication.readback 0.146ms; driver.publication.readback 0.134ms |
| a46e1642d1c6904800000000000011da | 143.409 | 28.667 | 58.860 | 1.389 | 0.000 | 0.235 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 54.259 | 88.916 | 0.620 | 54.259 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.217ms; driver.reader-basis.broadcast 0.215ms; driver.publication.readback 0.156ms; driver.publication.readback 0.134ms; driver.publication.readback 0.085ms |
| a46e1642d1c6904800000000000011d9 | 137.847 | 31.976 | 28.956 | 3.197 | 0.000 | 2.161 | 0.993 | 70.550 | n/a | 0.007 | 0.000 | n/a | n/a | 0.006 | 64.129 | 0.465 | 0.006 | gw-r/thread-47/gateway.admission-wait | driver.reader-basis.broadcast 0.217ms; driver.publication.readback 0.156ms; driver.publication.readback 0.134ms; driver.publication.readback 0.085ms; driver.publication.readback 0.078ms |

## P2 / L4 / commit (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.774 | 0.148 | 0.000 | 0.479 | 3.473 | n/a | 0.000 | 0.063 | 1.133 | 2.213 | 0.026 | n/a | 0.239 | 9.011 | n/a | n/a | 0.029 | 3.875 | 0.191 | 0.029 |
| p99 | 78.663 | 1.999 | 0.037 | 1.472 | 7.582 | n/a | 0.511 | 1.804 | 3.836 | 31.361 | 0.080 | n/a | 4.106 | 41.812 | n/a | n/a | 0.108 | 8.043 | 0.361 | 0.108 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c690480000000000000202 | 82.170 | 5.448 | 0.152 | 0.422 | 0.037 | 1.495 | 6.448 | 0.056 | n/a | 0.147 | 67.947 | n/a | n/a | 0.019 | 6.058 | 0.074 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| a46e1642d1c6904800000000000001f0 | 78.663 | 13.046 | n/a | 0.000 | 0.062 | 2.434 | 31.361 | 0.087 | n/a | 0.590 | 31.052 | n/a | n/a | 0.031 | 13.108 | 0.167 | 0.031 | gw-w/thread-45/storage/begin-command! | none observed |
| a46e1642d1c6904800000000000001eb | 68.258 | 3.495 | 0.188 | 0.332 | 0.115 | 1.472 | 50.433 | 0.042 | n/a | 0.362 | 11.761 | n/a | n/a | 0.058 | 4.130 | 0.061 | 0.058 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.034ms |
| a46e1642d1c69048000000000000024f | 50.541 | 2.844 | n/a | 0.000 | 0.063 | 0.707 | 1.355 | 0.017 | n/a | 3.716 | 41.812 | n/a | n/a | 0.028 | 2.907 | 0.058 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000261 | 49.293 | 2.731 | n/a | 0.000 | 1.804 | 0.517 | 1.825 | 0.026 | n/a | 0.803 | 41.572 | n/a | n/a | 0.014 | 4.536 | 0.092 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| a46e1642d1c6904800000000000001f2 | 37.538 | 5.646 | 0.302 | 0.255 | 0.052 | 2.624 | 14.363 | 0.033 | n/a | 0.089 | 14.148 | n/a | n/a | 0.025 | 6.256 | 0.167 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000280 | 36.960 | 4.584 | 0.137 | 0.580 | 0.046 | 1.958 | 11.768 | 0.036 | n/a | 0.115 | 17.710 | n/a | n/a | 0.026 | 5.347 | 0.145 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.049ms |
| a46e1642d1c69048000000000000021e | 35.999 | 4.618 | 0.183 | 0.396 | 0.063 | 1.674 | 13.171 | 0.028 | n/a | 0.108 | 15.724 | n/a | n/a | 0.035 | 5.260 | 0.146 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000290 | 34.852 | 7.582 | 0.343 | 0.000 | 0.118 | 2.321 | 10.769 | 0.023 | n/a | 0.105 | 13.531 | n/a | n/a | 0.061 | 8.043 | 0.231 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000243 | 34.326 | 3.132 | 0.152 | 0.255 | 0.044 | 1.355 | 5.273 | 0.057 | n/a | 3.579 | 20.453 | n/a | n/a | 0.026 | 3.583 | 0.104 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000001ee | 33.985 | 5.464 | 0.166 | 0.399 | 0.039 | 1.422 | 9.250 | 0.052 | n/a | 0.252 | 16.919 | n/a | n/a | 0.021 | 6.069 | 0.179 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000002a6 | 33.676 | 5.080 | 0.328 | 0.291 | 0.060 | 1.982 | 9.470 | 0.050 | n/a | 0.293 | 16.075 | n/a | n/a | 0.046 | 5.759 | 0.171 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000298 | 31.462 | 4.376 | 0.187 | 0.000 | 0.071 | 2.060 | 13.165 | 0.048 | n/a | 0.163 | 11.353 | n/a | n/a | 0.039 | 4.634 | 0.147 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000286 | 31.152 | 3.453 | 0.173 | 0.000 | 0.057 | 1.560 | 12.804 | 0.040 | n/a | 0.239 | 12.794 | n/a | n/a | 0.032 | 3.683 | 0.118 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000276 | 30.815 | 4.388 | 0.298 | 0.511 | 0.068 | 2.459 | 8.487 | 0.034 | n/a | 0.142 | 14.396 | n/a | n/a | 0.032 | 5.264 | 0.171 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000024d | 30.545 | 4.377 | 0.249 | 0.292 | 0.143 | 2.032 | 12.171 | 0.034 | n/a | 0.500 | 10.688 | n/a | n/a | 0.059 | 5.061 | 0.166 | 0.059 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000021a | 29.845 | 3.370 | 0.187 | 0.255 | 0.062 | 1.568 | 11.207 | 0.048 | n/a | 0.144 | 12.971 | n/a | n/a | 0.032 | 3.875 | 0.130 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000296 | 29.404 | 4.048 | 0.289 | 0.000 | 0.127 | 1.522 | 7.499 | 0.033 | n/a | 0.460 | 15.370 | n/a | n/a | 0.057 | 4.464 | 0.152 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000001f8 | 28.781 | 3.589 | 0.193 | 0.287 | 0.068 | 1.428 | 7.425 | 0.037 | n/a | 0.119 | 15.607 | n/a | n/a | 0.030 | 4.136 | 0.144 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000022b | 28.553 | 3.703 | 0.289 | 0.250 | 0.167 | 1.950 | 11.129 | 0.029 | n/a | 0.115 | 10.875 | n/a | n/a | 0.047 | 4.409 | 0.154 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.337 | 0.601 | 0.000 | 0.497 | 2.643 | n/a | 0.000 | 0.067 | 0.914 | 1.287 | 0.021 | n/a | 0.195 | 7.497 | n/a | n/a | 0.029 | 2.885 | 0.199 | 0.029 |
| p99 | 24.578 | 2.003 | 0.000 | 0.964 | 6.339 | n/a | 0.000 | 1.563 | 4.301 | 6.844 | 0.080 | n/a | 5.030 | 18.874 | n/a | n/a | 0.108 | 6.590 | 0.356 | 0.108 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c69048000000000000022d | 24.578 | 3.243 | n/a | 0.000 | 0.097 | 0.959 | 1.182 | 0.021 | n/a | 0.162 | 18.874 | n/a | n/a | 0.040 | 3.340 | 0.136 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000248 | 22.158 | 2.066 | n/a | 0.000 | 0.076 | 0.764 | 0.778 | 0.009 | n/a | 3.719 | 14.736 | n/a | n/a | 0.009 | 2.142 | 0.097 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.020ms |
| a46e1642d1c690480000000000000212 | 21.552 | 3.759 | n/a | 0.000 | 0.113 | 4.301 | 1.066 | 0.039 | n/a | 0.094 | 12.136 | n/a | n/a | 0.044 | 3.872 | 0.180 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000281 | 21.091 | 3.139 | n/a | 0.000 | 0.075 | 0.639 | 0.621 | 0.009 | n/a | 0.064 | 16.510 | n/a | n/a | 0.034 | 3.215 | 0.152 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000208 | 18.774 | 6.339 | n/a | 0.000 | 0.251 | 0.992 | 1.150 | 0.025 | n/a | 0.097 | 9.860 | n/a | n/a | 0.060 | 6.590 | 0.351 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000001e5 | 18.541 | 2.643 | n/a | 0.000 | 1.042 | 0.975 | 1.620 | 0.043 | n/a | 0.679 | 11.518 | n/a | n/a | 0.021 | 3.685 | 0.199 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000029a | 18.347 | 2.509 | n/a | 0.000 | 0.044 | 3.836 | 1.198 | 0.016 | n/a | 2.979 | 7.742 | n/a | n/a | 0.023 | 2.553 | 0.139 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| a46e1642d1c6904800000000000001f6 | 17.867 | 2.728 | n/a | 0.000 | 0.060 | 1.199 | 2.092 | 0.072 | n/a | 5.030 | 6.646 | n/a | n/a | 0.041 | 2.787 | 0.156 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000001e7 | 17.797 | 3.289 | n/a | 0.000 | 0.100 | 1.133 | 1.853 | 0.040 | n/a | 0.522 | 10.813 | n/a | n/a | 0.047 | 3.389 | 0.190 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000029c | 16.628 | 2.272 | n/a | 0.000 | 1.563 | 0.772 | 6.844 | 0.034 | n/a | 0.736 | 4.385 | n/a | n/a | 0.022 | 3.835 | 0.231 | 0.022 | gw-w/thread-46/storage/commit! | none observed |
| a46e1642d1c690480000000000000204 | 16.313 | 2.826 | n/a | 0.000 | 0.059 | 0.972 | 1.864 | 0.024 | n/a | 0.331 | 10.211 | n/a | n/a | 0.026 | 2.885 | 0.177 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000234 | 15.875 | 1.564 | n/a | 0.000 | 0.037 | 1.119 | 1.007 | 0.017 | n/a | 0.370 | 11.732 | n/a | n/a | 0.029 | 1.601 | 0.101 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| a46e1642d1c69048000000000000025e | 15.334 | 2.255 | n/a | 0.000 | 0.030 | 0.641 | 4.356 | 0.017 | n/a | 0.065 | 7.954 | n/a | n/a | 0.016 | 2.285 | 0.149 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000220 | 15.313 | 4.429 | n/a | 0.000 | 0.068 | 2.972 | 4.052 | 0.080 | n/a | 1.375 | 2.303 | n/a | n/a | 0.033 | 4.497 | 0.294 | 0.033 | node-14/thread-0/driver.execute | driver.reader-basis.broadcast 0.023ms |
| a46e1642d1c690480000000000000225 | 14.783 | 2.965 | n/a | 0.000 | 0.088 | 0.868 | 1.177 | 0.020 | n/a | 0.461 | 9.176 | n/a | n/a | 0.027 | 3.053 | 0.207 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000251 | 14.720 | 2.178 | n/a | 0.000 | 0.073 | 1.465 | 2.095 | 0.039 | n/a | 1.429 | 7.400 | n/a | n/a | 0.040 | 2.251 | 0.153 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000001e9 | 14.498 | 2.071 | n/a | 0.000 | 0.065 | 0.648 | 2.907 | 0.021 | n/a | 0.106 | 8.652 | n/a | n/a | 0.029 | 2.136 | 0.147 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000267 | 14.337 | 5.041 | n/a | 0.000 | 0.056 | 2.396 | 4.228 | 0.031 | n/a | 0.195 | 2.359 | n/a | n/a | 0.031 | 5.097 | 0.356 | 0.031 | node-14/thread-0/driver.execute | none observed |
| a46e1642d1c69048000000000000021c | 13.640 | 4.686 | n/a | 0.000 | 0.151 | 1.364 | 1.339 | 0.024 | n/a | 0.134 | 5.835 | n/a | n/a | 0.108 | 4.836 | 0.355 | 0.108 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000027a | 13.558 | 2.052 | n/a | 0.000 | 0.067 | 0.596 | 1.397 | 0.018 | n/a | 0.149 | 9.248 | n/a | n/a | 0.032 | 2.119 | 0.156 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (1702 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.205 | 0.410 | 0.000 | 0.522 | 2.279 | n/a | 0.000 | 0.043 | 0.600 | 1.017 | 0.013 | n/a | 0.108 | 5.422 | n/a | n/a | 0.014 | 2.555 | 0.237 | 0.014 |
| p99 | 38.008 | 2.748 | 0.046 | 2.142 | 7.198 | n/a | 0.000 | 11.161 | 6.335 | 6.913 | 0.051 | n/a | 3.385 | 27.930 | n/a | n/a | 0.048 | 13.123 | 0.606 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c6904800000000000002bf | 71.378 | 4.187 | 0.159 | 0.362 | 0.055 | 1.259 | 17.548 | 0.029 | n/a | 0.094 | 47.656 | n/a | n/a | 0.030 | 4.763 | 0.067 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000c08 | 54.730 | 4.221 | 0.220 | 0.000 | 0.031 | 1.354 | 6.380 | 0.025 | n/a | 0.777 | 41.712 | n/a | n/a | 0.011 | 4.472 | 0.082 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.156ms; driver.publication.readback 0.088ms; driver.publication.persist-deferred 0.015ms |
| a46e1642d1c6904800000000000003fb | 51.036 | 4.386 | n/a | 0.000 | 0.078 | 2.189 | 6.224 | 0.027 | n/a | 0.155 | 37.946 | n/a | n/a | 0.031 | 4.464 | 0.087 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000055a | 49.807 | 14.552 | n/a | 0.000 | 0.104 | 9.517 | 5.493 | 0.061 | n/a | 0.667 | 19.378 | n/a | n/a | 0.037 | 14.656 | 0.294 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.043ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.033ms; driver.publication.persist-deferred 0.013ms |
| a46e1642d1c690480000000000000358 | 48.187 | 2.749 | n/a | 0.000 | 0.057 | 5.654 | 1.417 | 0.019 | n/a | 0.433 | 37.823 | n/a | n/a | 0.035 | 2.806 | 0.058 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.637ms; driver.publication.readback 0.146ms; driver.publication.readback 0.113ms; driver.publication.persist-deferred 0.045ms; driver.publication.persist-deferred 0.044ms |
| a46e1642d1c690480000000000000357 | 47.375 | 2.605 | n/a | 0.000 | 0.059 | 0.710 | 1.781 | 0.021 | n/a | 1.142 | 41.035 | n/a | n/a | 0.022 | 2.664 | 0.056 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.637ms; driver.publication.readback 0.146ms; driver.publication.readback 0.113ms; driver.publication.persist-deferred 0.044ms; driver.reader-basis.broadcast 0.042ms |
| a46e1642d1c69048000000000000051a | 46.585 | 1.727 | n/a | 0.000 | 0.097 | 26.510 | 0.729 | 0.010 | n/a | 2.729 | 14.770 | n/a | n/a | 0.011 | 1.824 | 0.039 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.075ms; driver.publication.readback 0.069ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.015ms |
| a46e1642d1c69048000000000000051d | 44.774 | 4.380 | n/a | 0.000 | 20.730 | 3.691 | 1.543 | 0.021 | n/a | 0.070 | 14.324 | n/a | n/a | 0.016 | 25.110 | 0.561 | 0.016 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.069ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.014ms |
| a46e1642d1c6904800000000000002bb | 43.810 | 4.834 | 0.208 | 0.265 | 0.076 | 1.211 | 25.270 | 0.024 | n/a | 0.315 | 11.564 | n/a | n/a | 0.043 | 5.383 | 0.123 | 0.043 | gw-w/thread-41/storage/begin-command! | none observed |
| a46e1642d1c69048000000000000035b | 43.523 | 3.209 | n/a | 0.000 | 1.495 | 1.538 | 5.792 | 0.050 | n/a | 0.122 | 31.298 | n/a | n/a | 0.019 | 4.705 | 0.108 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 0.845ms; driver.publication.readback 0.146ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.045ms; driver.publication.persist-deferred 0.044ms |
| a46e1642d1c690480000000000000825 | 41.754 | 1.372 | n/a | 0.000 | 27.690 | 0.315 | 0.879 | 0.024 | n/a | 0.088 | 11.377 | n/a | n/a | 0.010 | 29.062 | 0.696 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.134ms; driver.publication.persist-deferred 0.074ms; driver.publication.readback 0.062ms; driver.publication.readback 0.062ms; driver.publication.readback 0.050ms |
| a46e1642d1c690480000000000000415 | 41.491 | 1.429 | n/a | 0.000 | 11.694 | 0.480 | 1.181 | 0.065 | n/a | 0.468 | 26.164 | n/a | n/a | 0.011 | 13.123 | 0.316 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.063ms; driver.reader-basis.broadcast 0.052ms; driver.publication.readback 0.045ms; driver.publication.readback 0.042ms; driver.publication.readback 0.026ms |
| a46e1642d1c6904800000000000002cb | 41.440 | 2.031 | n/a | 0.000 | 0.045 | 6.645 | 32.643 | 0.013 | n/a | 0.040 | 0.000 | n/a | n/a | 0.024 | 2.076 | 0.050 | 0.024 | gw-w/thread-45/gateway.admitted-work | none observed |
| a46e1642d1c69048000000000000042f | 40.079 | 2.301 | n/a | 0.000 | 0.533 | 0.641 | 0.979 | 0.018 | n/a | 0.773 | 34.816 | n/a | n/a | 0.019 | 2.833 | 0.071 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.127ms; driver.publication.readback 0.117ms; driver.reader-basis.broadcast 0.059ms; driver.publication.persist-deferred 0.046ms; driver.publication.persist-deferred 0.020ms |
| a46e1642d1c690480000000000000ad5 | 38.871 | 2.989 | 0.186 | 0.000 | 0.024 | 0.843 | 4.142 | 0.015 | n/a | 0.048 | 30.612 | n/a | n/a | 0.013 | 3.199 | 0.082 | 0.013 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.134ms |
| a46e1642d1c69048000000000000051e | 38.868 | 4.551 | n/a | 0.000 | 18.187 | 2.097 | 0.943 | 0.009 | n/a | 0.020 | 13.053 | n/a | n/a | 0.008 | 22.738 | 0.585 | 0.008 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.069ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.014ms |
| a46e1642d1c690480000000000000d3f | 38.400 | 4.872 | n/a | 0.000 | 0.057 | 0.643 | 2.731 | 0.008 | n/a | 0.523 | 29.543 | n/a | n/a | 0.023 | 4.928 | 0.128 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000035c | 38.008 | 2.296 | n/a | 0.000 | 0.045 | 0.935 | 0.950 | 0.015 | n/a | 0.503 | 33.238 | n/a | n/a | 0.025 | 2.341 | 0.062 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.045ms; driver.publication.readback 0.042ms; driver.publication.readback 0.036ms; driver.publication.persist-deferred 0.017ms |
| a46e1642d1c690480000000000000cf0 | 37.888 | 2.353 | n/a | 0.000 | 7.021 | 1.379 | 2.801 | 0.010 | n/a | 0.040 | 24.277 | n/a | n/a | 0.008 | 9.374 | 0.247 | 0.008 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.015ms |
| a46e1642d1c690480000000000000c09 | 37.284 | 2.348 | n/a | 0.000 | 0.037 | 0.948 | 0.503 | 0.004 | n/a | 0.017 | 33.410 | n/a | n/a | 0.017 | 2.385 | 0.064 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.156ms |

## P2 / L16 / commit / 5-10 facts (990 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.561 | 0.000 | 0.000 | 0.412 | 1.834 | n/a | 0.000 | 0.042 | 0.591 | 0.870 | 0.013 | n/a | 0.111 | 4.905 | n/a | n/a | 0.014 | 2.032 | 0.221 | 0.014 |
| p99 | 37.282 | 2.001 | 0.031 | 1.009 | 4.541 | n/a | 0.000 | 11.353 | 6.357 | 5.064 | 0.051 | n/a | 3.385 | 27.930 | n/a | n/a | 0.049 | 13.056 | 0.619 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c690480000000000000357 | 47.375 | 2.605 | n/a | 0.000 | 0.059 | 0.710 | 1.781 | 0.021 | n/a | 1.142 | 41.035 | n/a | n/a | 0.022 | 2.664 | 0.056 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.637ms; driver.publication.readback 0.146ms; driver.publication.readback 0.113ms; driver.publication.persist-deferred 0.044ms; driver.reader-basis.broadcast 0.042ms |
| a46e1642d1c69048000000000000051a | 46.585 | 1.727 | n/a | 0.000 | 0.097 | 26.510 | 0.729 | 0.010 | n/a | 2.729 | 14.770 | n/a | n/a | 0.011 | 1.824 | 0.039 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.075ms; driver.publication.readback 0.069ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.015ms |
| a46e1642d1c69048000000000000035b | 43.523 | 3.209 | n/a | 0.000 | 1.495 | 1.538 | 5.792 | 0.050 | n/a | 0.122 | 31.298 | n/a | n/a | 0.019 | 4.705 | 0.108 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 0.845ms; driver.publication.readback 0.146ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.045ms; driver.publication.persist-deferred 0.044ms |
| a46e1642d1c690480000000000000825 | 41.754 | 1.372 | n/a | 0.000 | 27.690 | 0.315 | 0.879 | 0.024 | n/a | 0.088 | 11.377 | n/a | n/a | 0.010 | 29.062 | 0.696 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.134ms; driver.publication.persist-deferred 0.074ms; driver.publication.readback 0.062ms; driver.publication.readback 0.062ms; driver.publication.readback 0.050ms |
| a46e1642d1c690480000000000000415 | 41.491 | 1.429 | n/a | 0.000 | 11.694 | 0.480 | 1.181 | 0.065 | n/a | 0.468 | 26.164 | n/a | n/a | 0.011 | 13.123 | 0.316 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.063ms; driver.reader-basis.broadcast 0.052ms; driver.publication.readback 0.045ms; driver.publication.readback 0.042ms; driver.publication.readback 0.026ms |
| a46e1642d1c6904800000000000002cb | 41.440 | 2.031 | n/a | 0.000 | 0.045 | 6.645 | 32.643 | 0.013 | n/a | 0.040 | 0.000 | n/a | n/a | 0.024 | 2.076 | 0.050 | 0.024 | gw-w/thread-45/gateway.admitted-work | none observed |
| a46e1642d1c69048000000000000042f | 40.079 | 2.301 | n/a | 0.000 | 0.533 | 0.641 | 0.979 | 0.018 | n/a | 0.773 | 34.816 | n/a | n/a | 0.019 | 2.833 | 0.071 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.127ms; driver.publication.readback 0.117ms; driver.reader-basis.broadcast 0.059ms; driver.publication.persist-deferred 0.046ms; driver.publication.persist-deferred 0.020ms |
| a46e1642d1c69048000000000000035c | 38.008 | 2.296 | n/a | 0.000 | 0.045 | 0.935 | 0.950 | 0.015 | n/a | 0.503 | 33.238 | n/a | n/a | 0.025 | 2.341 | 0.062 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.045ms; driver.publication.readback 0.042ms; driver.publication.readback 0.036ms; driver.publication.persist-deferred 0.017ms |
| a46e1642d1c690480000000000000c09 | 37.284 | 2.348 | n/a | 0.000 | 0.037 | 0.948 | 0.503 | 0.004 | n/a | 0.017 | 33.410 | n/a | n/a | 0.017 | 2.385 | 0.064 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.156ms |
| a46e1642d1c6904800000000000003fc | 37.282 | 2.001 | n/a | 0.000 | 0.054 | 0.473 | 1.179 | 0.018 | n/a | 3.116 | 30.415 | n/a | n/a | 0.026 | 2.055 | 0.055 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.116ms; driver.publication.readback 0.093ms; driver.publication.persist-deferred 0.032ms; driver.publication.persist-deferred 0.030ms |
| a46e1642d1c690480000000000000d40 | 36.192 | 1.526 | n/a | 0.000 | 1.324 | 1.261 | 0.895 | 0.014 | n/a | 1.313 | 29.847 | n/a | n/a | 0.012 | 2.850 | 0.079 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.019ms |
| a46e1642d1c69048000000000000057c | 35.492 | 1.076 | n/a | 0.000 | 0.624 | 1.373 | 0.552 | 0.016 | n/a | 5.247 | 26.598 | n/a | n/a | 0.007 | 1.700 | 0.048 | 0.007 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.015ms |
| a46e1642d1c690480000000000000492 | 35.453 | 2.742 | n/a | 0.000 | 0.085 | 0.891 | 1.096 | 0.017 | n/a | 0.094 | 30.492 | n/a | n/a | 0.036 | 2.827 | 0.080 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000003fd | 32.714 | 2.159 | n/a | 0.000 | 1.250 | 0.383 | 0.948 | 0.008 | n/a | 0.028 | 27.930 | n/a | n/a | 0.008 | 3.409 | 0.104 | 0.008 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.116ms; driver.publication.persist-deferred 0.032ms |
| a46e1642d1c690480000000000000801 | 32.352 | 4.150 | n/a | 0.000 | 5.181 | 1.506 | 1.380 | 0.023 | n/a | 2.200 | 17.898 | n/a | n/a | 0.013 | 9.331 | 0.288 | 0.013 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.365ms; driver.publication.readback 0.241ms; driver.publication.readback 0.095ms; driver.reader-basis.broadcast 0.087ms; driver.publication.readback 0.042ms |
| a46e1642d1c690480000000000000431 | 32.151 | 1.652 | n/a | 0.000 | 0.062 | 0.496 | 1.139 | 0.017 | n/a | 0.372 | 28.394 | n/a | n/a | 0.019 | 1.714 | 0.053 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.017ms |
| a46e1642d1c690480000000000000409 | 31.401 | 1.752 | n/a | 0.000 | 0.078 | 4.360 | 5.406 | 0.028 | n/a | 0.052 | 19.707 | n/a | n/a | 0.019 | 1.830 | 0.058 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.089ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.024ms; driver.reader-basis.broadcast 0.018ms |
| a46e1642d1c69048000000000000035d | 31.045 | 4.030 | n/a | 0.000 | 0.030 | 8.563 | 0.730 | 0.011 | n/a | 0.081 | 17.587 | n/a | n/a | 0.013 | 4.060 | 0.131 | 0.013 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.045ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.036ms; driver.publication.readback 0.036ms |
| a46e1642d1c6904800000000000002de | 30.676 | 6.539 | n/a | 0.000 | 0.055 | 2.605 | 7.211 | 0.057 | n/a | 0.296 | 13.885 | n/a | n/a | 0.028 | 6.594 | 0.215 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000000800 | 30.210 | 3.051 | n/a | 0.000 | 6.691 | 4.061 | 0.723 | 0.009 | n/a | 0.042 | 15.616 | n/a | n/a | 0.018 | 9.741 | 0.322 | 0.018 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.241ms; driver.reader-basis.broadcast 0.087ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.040ms; driver.publication.readback 0.038ms |

## P2 / L64 / commit (1776 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.309 | 0.267 | 0.000 | 0.503 | 2.220 | n/a | 0.000 | 0.035 | 0.527 | 0.913 | 0.012 | n/a | 0.083 | 5.157 | n/a | n/a | 0.012 | 2.492 | 0.251 | 0.012 |
| p99 | 46.918 | 2.017 | 0.044 | 2.063 | 7.417 | n/a | 0.220 | 13.745 | 6.047 | 7.495 | 0.041 | n/a | 2.433 | 35.851 | n/a | n/a | 0.040 | 16.980 | 0.659 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c690480000000000001c80 | 102.142 | 8.171 | n/a | 0.000 | 0.349 | 0.721 | 1.818 | 0.022 | n/a | 0.070 | 90.962 | n/a | n/a | 0.029 | 8.520 | 0.083 | 0.029 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 26.032ms |
| a46e1642d1c690480000000000001c81 | 102.042 | 5.270 | n/a | 0.000 | 0.039 | 2.276 | 1.242 | 0.020 | n/a | 0.053 | 93.126 | n/a | n/a | 0.017 | 5.309 | 0.052 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 26.032ms; driver.expected-state.bind-receipt 1.723ms; driver.publication.persist-deferred 0.092ms |
| a46e1642d1c690480000000000001c82 | 76.014 | 3.146 | n/a | 0.000 | 1.831 | 2.519 | 1.270 | 0.019 | n/a | 0.077 | 67.114 | n/a | n/a | 0.039 | 4.977 | 0.065 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 26.032ms; driver.expected-state.bind-receipt 1.723ms; driver.publication.persist-deferred 0.092ms |
| a46e1642d1c6904800000000000011cc | 74.134 | 1.432 | n/a | 0.000 | 65.040 | 0.360 | 0.699 | 0.015 | n/a | 1.303 | 5.276 | n/a | n/a | 0.010 | 66.472 | 0.897 | 0.010 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.156ms; driver.publication.readback 0.067ms; driver.publication.readback 0.062ms; driver.publication.readback 0.062ms |
| a46e1642d1c6904800000000000011c9 | 68.307 | 4.671 | n/a | 0.000 | 0.042 | 3.232 | 10.034 | 0.039 | n/a | 1.781 | 48.495 | n/a | n/a | 0.014 | 4.712 | 0.069 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.156ms; driver.publication.readback 0.067ms; driver.publication.readback 0.062ms; driver.publication.readback 0.058ms |
| a46e1642d1c69048000000000000116e | 59.802 | 13.380 | n/a | 0.000 | 19.001 | 5.989 | 6.234 | 0.028 | n/a | 0.117 | 15.038 | n/a | n/a | 0.015 | 32.382 | 0.541 | 0.015 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.203ms; driver.publication.readback 0.051ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.046ms; driver.publication.persist-deferred 0.041ms |
| a46e1642d1c690480000000000001c83 | 59.394 | 4.477 | n/a | 0.000 | 9.624 | 1.522 | 1.429 | 0.030 | n/a | 0.082 | 42.201 | n/a | n/a | 0.029 | 14.101 | 0.237 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 26.032ms; driver.expected-state.bind-receipt 1.723ms; driver.publication.readback 0.120ms; driver.publication.persist-deferred 0.092ms; driver.publication.persist-deferred 0.038ms |
| a46e1642d1c6904800000000000010f0 | 57.411 | 2.466 | n/a | 0.000 | 0.027 | 18.382 | 0.651 | 0.005 | n/a | 0.018 | 35.851 | n/a | n/a | 0.011 | 2.494 | 0.043 | 0.011 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.188ms; driver.publication.readback 0.052ms; driver.publication.readback 0.049ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.038ms |
| a46e1642d1c6904800000000000010ef | 56.786 | 2.956 | n/a | 0.000 | 0.013 | 0.596 | 21.222 | 0.023 | n/a | 0.051 | 31.917 | n/a | n/a | 0.007 | 2.969 | 0.052 | 0.007 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.188ms; driver.publication.readback 0.052ms; driver.publication.readback 0.049ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.038ms |
| a46e1642d1c6904800000000000010eb | 56.774 | 2.522 | n/a | 0.000 | 0.028 | 1.391 | 1.012 | 0.014 | n/a | 0.120 | 51.674 | n/a | n/a | 0.012 | 2.550 | 0.045 | 0.012 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.188ms |
| a46e1642d1c6904800000000000011c2 | 53.097 | 4.313 | 0.852 | 0.000 | 0.056 | 1.115 | 5.972 | 0.041 | n/a | 0.036 | 40.691 | n/a | n/a | 0.019 | 5.221 | 0.098 | 0.019 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.031ms; driver.publication.persist-deferred 0.017ms |
| a46e1642d1c6904800000000000010f1 | 51.112 | 2.827 | n/a | 0.000 | 0.020 | 12.179 | 1.031 | 0.018 | n/a | 0.396 | 34.633 | n/a | n/a | 0.008 | 2.847 | 0.056 | 0.008 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.readback 0.049ms; driver.publication.readback 0.048ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.038ms |
| a46e1642d1c6904800000000000010ec | 50.560 | 5.688 | n/a | 0.000 | 0.065 | 1.726 | 0.956 | 0.010 | n/a | 0.269 | 41.821 | n/a | n/a | 0.024 | 5.754 | 0.114 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.188ms |
| a46e1642d1c6904800000000000010ee | 49.821 | 3.071 | n/a | 0.000 | 0.016 | 0.312 | 1.048 | 0.007 | n/a | 0.057 | 45.302 | n/a | n/a | 0.008 | 3.087 | 0.062 | 0.008 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.188ms; driver.publication.readback 0.052ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.038ms; driver.publication.readback 0.027ms |
| a46e1642d1c6904800000000000011cd | 47.486 | 2.796 | n/a | 0.000 | 0.012 | 0.278 | 1.127 | 0.007 | n/a | 0.050 | 43.208 | n/a | n/a | 0.006 | 2.809 | 0.059 | 0.006 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.067ms; driver.publication.readback 0.062ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.015ms |
| a46e1642d1c6904800000000000010ed | 47.465 | 2.902 | n/a | 0.000 | 0.044 | 0.444 | 0.877 | 0.025 | n/a | 0.086 | 43.071 | n/a | n/a | 0.016 | 2.946 | 0.062 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.188ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.038ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.009ms |
| a46e1642d1c6904800000000000019c7 | 47.133 | 3.364 | n/a | 0.000 | 0.018 | 2.605 | 5.308 | 0.009 | n/a | 0.027 | 35.791 | n/a | n/a | 0.011 | 3.382 | 0.072 | 0.011 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.061ms |
| a46e1642d1c690480000000000001b5c | 46.918 | 2.413 | n/a | 0.000 | 3.342 | 0.961 | 0.888 | 0.014 | n/a | 0.454 | 38.833 | n/a | n/a | 0.012 | 5.755 | 0.123 | 0.012 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.028ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.008ms |
| a46e1642d1c6904800000000000012b8 | 45.640 | 3.126 | 0.477 | 0.000 | 0.026 | 1.440 | 5.359 | 0.017 | n/a | 0.059 | 35.125 | n/a | n/a | 0.011 | 3.628 | 0.079 | 0.011 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.095ms; driver.publication.readback 0.072ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.015ms |
| a46e1642d1c6904800000000000011c4 | 45.539 | 4.493 | n/a | 0.000 | 0.035 | 1.217 | 3.416 | 0.024 | n/a | 0.447 | 35.889 | n/a | n/a | 0.018 | 4.528 | 0.099 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.017ms |

## P2 / L64 / commit / 5-10 facts (1060 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.784 | 0.000 | 0.000 | 0.389 | 1.769 | n/a | 0.000 | 0.035 | 0.502 | 0.789 | 0.012 | n/a | 0.085 | 4.622 | n/a | n/a | 0.012 | 1.957 | 0.235 | 0.012 |
| p99 | 40.630 | 2.002 | 0.038 | 1.100 | 5.467 | n/a | 0.000 | 12.223 | 6.509 | 5.441 | 0.043 | n/a | 2.490 | 30.528 | n/a | n/a | 0.041 | 14.101 | 0.643 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c690480000000000001c82 | 76.014 | 3.146 | n/a | 0.000 | 1.831 | 2.519 | 1.270 | 0.019 | n/a | 0.077 | 67.114 | n/a | n/a | 0.039 | 4.977 | 0.065 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 26.032ms; driver.expected-state.bind-receipt 1.723ms; driver.publication.persist-deferred 0.092ms |
| a46e1642d1c6904800000000000011cc | 74.134 | 1.432 | n/a | 0.000 | 65.040 | 0.360 | 0.699 | 0.015 | n/a | 1.303 | 5.276 | n/a | n/a | 0.010 | 66.472 | 0.897 | 0.010 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.156ms; driver.publication.readback 0.067ms; driver.publication.readback 0.062ms; driver.publication.readback 0.062ms |
| a46e1642d1c6904800000000000011c9 | 68.307 | 4.671 | n/a | 0.000 | 0.042 | 3.232 | 10.034 | 0.039 | n/a | 1.781 | 48.495 | n/a | n/a | 0.014 | 4.712 | 0.069 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.156ms; driver.publication.readback 0.067ms; driver.publication.readback 0.062ms; driver.publication.readback 0.058ms |
| a46e1642d1c690480000000000001c83 | 59.394 | 4.477 | n/a | 0.000 | 9.624 | 1.522 | 1.429 | 0.030 | n/a | 0.082 | 42.201 | n/a | n/a | 0.029 | 14.101 | 0.237 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 26.032ms; driver.expected-state.bind-receipt 1.723ms; driver.publication.readback 0.120ms; driver.publication.persist-deferred 0.092ms; driver.publication.persist-deferred 0.038ms |
| a46e1642d1c6904800000000000010f0 | 57.411 | 2.466 | n/a | 0.000 | 0.027 | 18.382 | 0.651 | 0.005 | n/a | 0.018 | 35.851 | n/a | n/a | 0.011 | 2.494 | 0.043 | 0.011 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.188ms; driver.publication.readback 0.052ms; driver.publication.readback 0.049ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.038ms |
| a46e1642d1c690480000000000001b5d | 45.403 | 2.405 | n/a | 0.000 | 0.249 | 3.215 | 0.360 | 0.004 | n/a | 0.013 | 39.153 | n/a | n/a | 0.004 | 2.654 | 0.058 | 0.004 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.028ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.008ms |
| a46e1642d1c6904800000000000019c8 | 45.354 | 1.262 | n/a | 0.000 | 0.089 | 5.594 | 0.732 | 0.014 | n/a | 0.552 | 37.104 | n/a | n/a | 0.006 | 1.352 | 0.030 | 0.006 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.017ms |
| a46e1642d1c690480000000000001564 | 45.059 | 1.614 | n/a | 0.000 | 36.817 | 1.696 | 1.081 | 0.021 | n/a | 0.057 | 3.760 | n/a | n/a | 0.014 | 38.431 | 0.853 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.057ms; driver.publication.readback 0.053ms; driver.publication.readback 0.053ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.039ms |
| a46e1642d1c6904800000000000012a5 | 44.695 | 2.276 | n/a | 0.000 | 0.021 | 0.622 | 1.260 | 0.018 | n/a | 0.399 | 40.088 | n/a | n/a | 0.011 | 2.297 | 0.051 | 0.011 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000010f2 | 40.703 | 2.191 | n/a | 0.000 | 0.045 | 9.524 | 2.326 | 0.041 | n/a | 0.542 | 26.017 | n/a | n/a | 0.018 | 2.236 | 0.055 | 0.018 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.140ms; driver.publication.readback 0.087ms; driver.publication.readback 0.052ms; driver.publication.readback 0.049ms; driver.publication.readback 0.048ms |
| a46e1642d1c690480000000000001217 | 40.630 | 14.811 | n/a | 0.000 | 2.524 | 3.438 | 3.042 | 0.042 | n/a | 0.874 | 15.879 | n/a | n/a | 0.020 | 17.334 | 0.427 | 0.020 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.065ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.048ms; driver.publication.persist-deferred 0.015ms |
| a46e1642d1c6904800000000000012ba | 38.608 | 2.295 | n/a | 0.000 | 0.065 | 4.779 | 0.880 | 0.008 | n/a | 0.027 | 30.528 | n/a | n/a | 0.027 | 2.360 | 0.061 | 0.027 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.016ms |
| a46e1642d1c690480000000000001571 | 37.521 | 1.802 | n/a | 0.000 | 0.035 | 0.394 | 0.751 | 0.011 | n/a | 0.093 | 34.420 | n/a | n/a | 0.014 | 1.838 | 0.049 | 0.014 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.525ms |
| a46e1642d1c690480000000000001673 | 35.726 | 5.784 | n/a | 0.000 | 0.014 | 15.279 | 2.046 | 0.021 | n/a | 0.333 | 12.242 | n/a | n/a | 0.007 | 5.798 | 0.162 | 0.007 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.255ms; driver.publication.readback 0.131ms; driver.publication.readback 0.064ms; driver.publication.readback 0.049ms; driver.publication.readback 0.047ms |
| a46e1642d1c69048000000000000134a | 35.689 | 2.122 | n/a | 0.000 | 0.141 | 27.661 | 0.872 | 0.014 | n/a | 0.073 | 4.791 | n/a | n/a | 0.016 | 2.263 | 0.063 | 0.016 | node-14/thread-0/socket.wait-first-byte | none observed |
| a46e1642d1c690480000000000001700 | 35.597 | 1.317 | n/a | 0.000 | 0.021 | 1.802 | 0.483 | 0.008 | n/a | 0.146 | 31.812 | n/a | n/a | 0.008 | 1.338 | 0.038 | 0.008 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.019ms |
| a46e1642d1c6904800000000000012b6 | 34.519 | 1.848 | n/a | 0.000 | 0.038 | 0.575 | 1.222 | 0.018 | n/a | 0.095 | 30.706 | n/a | n/a | 0.016 | 1.886 | 0.055 | 0.016 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.427ms; driver.publication.readback 0.095ms; driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.034ms; driver.publication.persist-deferred 0.014ms |
| a46e1642d1c690480000000000001577 | 34.336 | 1.411 | n/a | 0.000 | 10.456 | 7.364 | 0.601 | 0.012 | n/a | 0.062 | 14.419 | n/a | n/a | 0.011 | 11.867 | 0.346 | 0.011 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.058ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.045ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.014ms |
| a46e1642d1c690480000000000001722 | 34.156 | 2.330 | n/a | 0.000 | 4.683 | 0.331 | 0.611 | 0.008 | n/a | 0.058 | 26.122 | n/a | n/a | 0.012 | 7.013 | 0.205 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.224ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.037ms |
| a46e1642d1c69048000000000000179f | 32.425 | 1.622 | n/a | 0.000 | 0.029 | 0.491 | 1.373 | 0.019 | n/a | 0.105 | 28.774 | n/a | n/a | 0.012 | 1.651 | 0.051 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.273ms |

## P2 / L256 / commit (95 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.650 | 0.000 | 0.000 | 0.412 | 3.136 | n/a | 0.000 | 0.048 | 0.795 | 1.625 | 0.018 | n/a | 0.081 | 6.169 | n/a | n/a | 0.019 | 3.423 | 0.249 | 0.019 |
| p99 | 38.898 | 2.006 | 0.025 | 1.320 | 6.125 | n/a | 0.511 | 2.344 | 1.795 | 14.802 | 0.045 | n/a | 0.764 | 28.302 | n/a | n/a | 0.162 | 6.322 | 0.457 | 0.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c690480000000000001e7a | 38.898 | 3.022 | 0.187 | 0.000 | 0.054 | 0.872 | 6.370 | 0.016 | n/a | 0.059 | 28.302 | n/a | n/a | 0.016 | 3.263 | 0.084 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e24 | 27.412 | 3.830 | 0.172 | 0.000 | 0.040 | 1.267 | 14.802 | 0.018 | n/a | 0.059 | 7.209 | n/a | n/a | 0.015 | 4.042 | 0.147 | 0.015 | gw-w/thread-48/gateway.admitted-work | none observed |
| a46e1642d1c690480000000000001e58 | 27.341 | 3.491 | 0.238 | 0.000 | 0.042 | 1.212 | 11.798 | 0.038 | n/a | 0.366 | 10.138 | n/a | n/a | 0.018 | 3.771 | 0.138 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e5e | 26.787 | 3.154 | 0.179 | 0.000 | 0.052 | 1.444 | 10.415 | 0.040 | n/a | 0.111 | 11.376 | n/a | n/a | 0.016 | 3.385 | 0.126 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e64 | 25.615 | 5.158 | 0.213 | 0.000 | 0.088 | 0.954 | 4.508 | 0.016 | n/a | 0.061 | 14.594 | n/a | n/a | 0.022 | 5.460 | 0.213 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e8c | 25.157 | 3.631 | 0.173 | 0.000 | 0.038 | 1.285 | 9.811 | 0.026 | n/a | 0.063 | 10.114 | n/a | n/a | 0.016 | 3.842 | 0.153 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e36 | 23.223 | 3.968 | 0.396 | 0.000 | 0.040 | 1.591 | 6.025 | 0.022 | n/a | 0.088 | 11.077 | n/a | n/a | 0.017 | 4.404 | 0.190 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e88 | 22.829 | 4.558 | 0.240 | 0.000 | 0.118 | 1.492 | 7.433 | 0.026 | n/a | 0.066 | 8.870 | n/a | n/a | 0.027 | 4.916 | 0.215 | 0.027 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e46 | 22.282 | 6.125 | n/a | 0.000 | 0.198 | 1.322 | 2.662 | 0.045 | n/a | 0.764 | 11.106 | n/a | n/a | 0.060 | 6.322 | 0.284 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.882ms |
| a46e1642d1c690480000000000001e54 | 21.633 | 3.222 | n/a | 0.000 | 0.083 | 0.705 | 0.991 | 0.012 | n/a | 0.087 | 16.496 | n/a | n/a | 0.034 | 3.305 | 0.153 | 0.034 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.335ms |
| a46e1642d1c690480000000000001e44 | 20.991 | 3.995 | 0.402 | 0.000 | 0.039 | 1.309 | 7.627 | 0.030 | n/a | 0.342 | 7.229 | n/a | n/a | 0.018 | 4.437 | 0.211 | 0.018 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e32 | 20.825 | 5.175 | n/a | 0.000 | 0.080 | 0.600 | 1.271 | 0.012 | n/a | 0.054 | 13.599 | n/a | n/a | 0.032 | 5.255 | 0.252 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e2c | 20.222 | 5.124 | n/a | 0.000 | 0.039 | 0.652 | 1.346 | 0.013 | n/a | 0.059 | 12.973 | n/a | n/a | 0.016 | 5.163 | 0.255 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e0e | 20.064 | 4.081 | 0.175 | 0.442 | 0.038 | 1.634 | 9.276 | 0.026 | n/a | 0.122 | 4.257 | n/a | n/a | 0.016 | 4.734 | 0.236 | 0.016 | gw-w/thread-45/gateway.admitted-work | none observed |
| a46e1642d1c690480000000000001e3e | 19.990 | 4.482 | 0.299 | 0.000 | 0.103 | 1.249 | 9.668 | 0.015 | n/a | 0.062 | 4.083 | n/a | n/a | 0.029 | 4.884 | 0.244 | 0.029 | gw-w/thread-43/gateway.admitted-work | none observed |
| a46e1642d1c690480000000000001dee | 19.622 | 3.133 | 0.162 | 0.369 | 0.043 | 1.000 | 2.164 | 0.028 | n/a | 0.357 | 12.354 | n/a | n/a | 0.013 | 3.707 | 0.189 | 0.013 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e76 | 19.369 | 2.841 | 0.165 | 0.000 | 0.049 | 0.865 | 4.303 | 0.025 | n/a | 0.102 | 11.002 | n/a | n/a | 0.017 | 3.054 | 0.158 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001df8 | 19.228 | 2.709 | n/a | 0.000 | 0.038 | 0.516 | 2.731 | 0.016 | n/a | 0.057 | 13.141 | n/a | n/a | 0.020 | 2.747 | 0.143 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e14 | 18.939 | 3.510 | 0.311 | 0.000 | 0.042 | 1.491 | 5.234 | 0.024 | n/a | 0.353 | 7.954 | n/a | n/a | 0.019 | 3.864 | 0.204 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001dfa | 18.920 | 3.241 | 0.175 | 0.402 | 0.035 | 1.795 | 5.254 | 0.019 | n/a | 0.062 | 7.919 | n/a | n/a | 0.017 | 3.853 | 0.204 | 0.017 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.873 | 0.000 | 0.000 | 0.428 | 2.538 | n/a | 0.000 | 0.064 | 0.648 | 1.006 | 0.016 | n/a | 0.080 | 4.871 | n/a | n/a | 0.026 | 2.634 | 0.231 | 0.026 |
| p99 | 21.633 | 2.006 | 0.025 | 1.320 | 5.971 | n/a | 0.000 | 2.344 | 1.400 | 2.731 | 0.032 | n/a | 0.567 | 16.496 | n/a | n/a | 0.162 | 6.253 | 0.404 | 0.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c690480000000000001e54 | 21.633 | 3.222 | n/a | 0.000 | 0.083 | 0.705 | 0.991 | 0.012 | n/a | 0.087 | 16.496 | n/a | n/a | 0.034 | 3.305 | 0.153 | 0.034 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.335ms |
| a46e1642d1c690480000000000001df8 | 19.228 | 2.709 | n/a | 0.000 | 0.038 | 0.516 | 2.731 | 0.016 | n/a | 0.057 | 13.141 | n/a | n/a | 0.020 | 2.747 | 0.143 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e12 | 17.547 | 2.965 | n/a | 0.000 | 0.069 | 0.720 | 0.906 | 0.015 | n/a | 0.282 | 12.559 | n/a | n/a | 0.031 | 3.034 | 0.173 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.336ms |
| a46e1642d1c690480000000000001e49 | 16.203 | 5.971 | n/a | 0.000 | 0.281 | 1.400 | 0.842 | 0.014 | n/a | 0.046 | 7.485 | n/a | n/a | 0.162 | 6.253 | 0.386 | 0.162 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001dfb | 15.754 | 4.138 | n/a | 0.000 | 0.083 | 0.891 | 2.032 | 0.032 | n/a | 0.175 | 8.369 | n/a | n/a | 0.035 | 4.221 | 0.268 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e6f | 15.104 | 2.954 | n/a | 0.000 | 2.344 | 0.516 | 0.954 | 0.013 | n/a | 0.041 | 8.265 | n/a | n/a | 0.017 | 5.297 | 0.351 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e80 | 14.271 | 3.460 | n/a | 0.000 | 0.048 | 0.781 | 1.531 | 0.026 | n/a | 0.094 | 8.308 | n/a | n/a | 0.022 | 3.508 | 0.246 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.308ms |
| a46e1642d1c690480000000000001e34 | 12.386 | 3.542 | n/a | 0.000 | 0.082 | 0.828 | 1.508 | 0.032 | n/a | 0.083 | 6.271 | n/a | n/a | 0.039 | 3.625 | 0.293 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e6c | 12.305 | 2.060 | n/a | 0.000 | 0.574 | 0.619 | 1.099 | 0.020 | n/a | 0.078 | 7.830 | n/a | n/a | 0.026 | 2.634 | 0.214 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e08 | 11.706 | 2.167 | n/a | 0.000 | 0.039 | 0.461 | 0.942 | 0.015 | n/a | 0.060 | 8.003 | n/a | n/a | 0.020 | 2.206 | 0.188 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e86 | 11.369 | 3.811 | n/a | 0.000 | 0.083 | 0.862 | 1.625 | 0.022 | n/a | 0.080 | 4.854 | n/a | n/a | 0.032 | 3.894 | 0.343 | 0.032 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e96 | 11.129 | 3.181 | n/a | 0.000 | 0.089 | 0.674 | 0.814 | 0.016 | n/a | 0.083 | 6.236 | n/a | n/a | 0.035 | 3.270 | 0.294 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e60 | 11.038 | 2.004 | n/a | 0.000 | 0.037 | 0.433 | 0.844 | 0.014 | n/a | 0.048 | 7.642 | n/a | n/a | 0.016 | 2.042 | 0.185 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ea2 | 10.881 | 4.217 | n/a | 0.000 | 0.179 | 0.879 | 1.270 | 0.024 | n/a | 0.085 | 4.177 | n/a | n/a | 0.050 | 4.396 | 0.404 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001de7 | 10.349 | 2.223 | n/a | 0.000 | 0.055 | 0.664 | 1.154 | 0.022 | n/a | 0.468 | 5.736 | n/a | n/a | 0.026 | 2.278 | 0.220 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e26 | 10.330 | 3.534 | n/a | 0.000 | 0.081 | 0.594 | 0.943 | 0.016 | n/a | 0.061 | 5.070 | n/a | n/a | 0.031 | 3.615 | 0.350 | 0.031 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e2a | 9.968 | 2.432 | n/a | 0.000 | 0.078 | 0.859 | 1.672 | 0.025 | n/a | 0.094 | 4.769 | n/a | n/a | 0.039 | 2.510 | 0.252 | 0.039 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e4c | 9.873 | 1.876 | n/a | 0.000 | 0.048 | 0.350 | 0.805 | 0.012 | n/a | 0.068 | 6.699 | n/a | n/a | 0.016 | 1.923 | 0.195 | 0.016 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ea0 | 9.744 | 1.783 | n/a | 0.000 | 0.032 | 0.514 | 0.874 | 0.015 | n/a | 0.086 | 6.423 | n/a | n/a | 0.018 | 1.815 | 0.186 | 0.018 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001e3f | 9.362 | 2.781 | n/a | 0.000 | 0.096 | 0.648 | 0.949 | 0.015 | n/a | 0.071 | 4.758 | n/a | n/a | 0.042 | 2.878 | 0.307 | 0.042 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.996 | 0.000 | 0.000 | 0.428 | 3.129 | n/a | 0.000 | 0.046 | 0.792 | 1.450 | 0.016 | n/a | 0.128 | 5.970 | n/a | n/a | 0.023 | 3.407 | 0.244 | 0.023 |
| p99 | 68.698 | 2.000 | 0.000 | 1.168 | 12.325 | n/a | 1.536 | 2.872 | 15.901 | 43.496 | 0.047 | n/a | 3.721 | 29.799 | n/a | n/a | 0.077 | 12.406 | 0.498 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c690480000000000001f4b | 68.698 | 3.446 | 0.260 | 0.000 | 0.040 | 15.901 | 43.496 | 0.018 | n/a | 0.055 | 5.448 | n/a | n/a | 0.034 | 3.746 | 0.055 | 0.034 | gw-w/thread-64/gateway.route | none observed |
| a46e1642d1c690480000000000001ed0 | 44.699 | 6.051 | 0.254 | 0.000 | 0.086 | 6.231 | 2.186 | 0.015 | n/a | 0.051 | 29.799 | n/a | n/a | 0.025 | 6.392 | 0.143 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001eb7 | 43.793 | 12.325 | n/a | 0.000 | 0.081 | 1.575 | 13.673 | 0.017 | n/a | 0.445 | 15.619 | n/a | n/a | 0.059 | 12.406 | 0.283 | 0.059 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.310ms |
| a46e1642d1c690480000000000001eb9 | 34.732 | 3.176 | 0.241 | 0.000 | 0.047 | 4.194 | 10.963 | 0.030 | n/a | 0.107 | 15.958 | n/a | n/a | 0.017 | 3.464 | 0.100 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ebd | 30.532 | 5.035 | n/a | 0.000 | 0.092 | 1.380 | 14.940 | 0.042 | n/a | 0.741 | 8.271 | n/a | n/a | 0.031 | 5.127 | 0.168 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001f1f | 28.982 | 2.970 | 0.198 | 0.000 | 0.105 | 3.266 | 10.054 | 0.025 | n/a | 3.721 | 8.619 | n/a | n/a | 0.025 | 3.272 | 0.113 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ebe | 25.956 | 3.073 | 0.232 | 0.000 | 0.096 | 0.901 | 8.758 | 0.025 | n/a | 0.288 | 12.545 | n/a | n/a | 0.039 | 3.401 | 0.131 | 0.039 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001f3d | 22.469 | 6.932 | 0.217 | 0.000 | 0.083 | 1.698 | 4.294 | 0.016 | n/a | 0.077 | 9.129 | n/a | n/a | 0.024 | 7.232 | 0.322 | 0.024 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ec4 | 22.461 | 3.072 | 0.249 | 0.000 | 0.031 | 0.894 | 12.539 | 0.027 | n/a | 0.312 | 5.324 | n/a | n/a | 0.014 | 3.352 | 0.149 | 0.014 | gw-w/thread-44/gateway.admitted-work | none observed |
| a46e1642d1c690480000000000001f2d | 21.775 | 3.173 | 0.174 | 0.000 | 0.027 | 0.869 | 8.047 | 0.024 | n/a | 0.531 | 8.914 | n/a | n/a | 0.015 | 3.375 | 0.155 | 0.015 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001f63 | 21.643 | 3.073 | 0.165 | 0.000 | 0.037 | 0.976 | 4.387 | 0.016 | n/a | 0.072 | 12.890 | n/a | n/a | 0.028 | 3.274 | 0.151 | 0.028 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ef3 | 21.170 | 3.298 | 0.268 | 0.000 | 0.031 | 1.147 | 8.036 | 0.023 | n/a | 1.919 | 6.432 | n/a | n/a | 0.016 | 3.597 | 0.170 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001eff | 20.521 | 3.954 | 0.223 | 0.000 | 0.027 | 0.762 | 4.347 | 0.016 | n/a | 0.058 | 11.119 | n/a | n/a | 0.016 | 4.204 | 0.205 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001f0b | 19.055 | 3.635 | 0.333 | 0.000 | 0.033 | 1.380 | 7.738 | 0.033 | n/a | 0.077 | 5.811 | n/a | n/a | 0.015 | 4.001 | 0.210 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001eb2 | 18.434 | 1.600 | n/a | 0.000 | 0.046 | 0.792 | 5.960 | 0.027 | n/a | 0.083 | 9.906 | n/a | n/a | 0.020 | 1.646 | 0.089 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ea8 | 18.349 | 3.836 | 0.146 | 0.000 | 0.033 | 1.339 | 9.075 | 0.021 | n/a | 0.061 | 3.819 | n/a | n/a | 0.018 | 4.016 | 0.219 | 0.018 | gw-w/thread-44/gateway.admitted-work | none observed |
| a46e1642d1c690480000000000001f27 | 18.208 | 3.553 | 0.271 | 0.000 | 0.056 | 1.408 | 1.700 | 0.018 | n/a | 0.286 | 10.898 | n/a | n/a | 0.017 | 3.880 | 0.213 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001f1b | 17.892 | 4.082 | 0.167 | 0.000 | 0.044 | 1.089 | 5.154 | 0.019 | n/a | 0.059 | 7.252 | n/a | n/a | 0.025 | 4.293 | 0.240 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ece | 17.654 | 3.749 | n/a | 0.000 | 0.172 | 0.664 | 1.609 | 0.023 | n/a | 0.100 | 11.270 | n/a | n/a | 0.066 | 3.921 | 0.222 | 0.066 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ec8 | 17.509 | 3.986 | 0.244 | 0.000 | 0.042 | 1.611 | 4.767 | 0.033 | n/a | 0.088 | 6.723 | n/a | n/a | 0.015 | 4.272 | 0.244 | 0.015 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.637 | 0.000 | 0.000 | 0.426 | 2.270 | n/a | 0.000 | 0.048 | 0.615 | 0.939 | 0.015 | n/a | 0.128 | 5.783 | n/a | n/a | 0.026 | 2.885 | 0.238 | 0.026 |
| p99 | 30.532 | 2.000 | 0.000 | 1.168 | 5.035 | n/a | 1.536 | 2.872 | 1.681 | 14.940 | 0.042 | n/a | 0.741 | 11.270 | n/a | n/a | 0.077 | 7.426 | 0.498 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c690480000000000001ebd | 30.532 | 5.035 | n/a | 0.000 | 0.092 | 1.380 | 14.940 | 0.042 | n/a | 0.741 | 8.271 | n/a | n/a | 0.031 | 5.127 | 0.168 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001eb2 | 18.434 | 1.600 | n/a | 0.000 | 0.046 | 0.792 | 5.960 | 0.027 | n/a | 0.083 | 9.906 | n/a | n/a | 0.020 | 1.646 | 0.089 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ece | 17.654 | 3.749 | n/a | 0.000 | 0.172 | 0.664 | 1.609 | 0.023 | n/a | 0.100 | 11.270 | n/a | n/a | 0.066 | 3.921 | 0.222 | 0.066 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ef5 | 16.696 | 3.858 | n/a | 0.000 | 0.043 | 0.903 | 1.185 | 0.021 | n/a | 0.124 | 10.536 | n/a | n/a | 0.026 | 3.901 | 0.234 | 0.026 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ee6 | 15.406 | 4.800 | n/a | 0.000 | 0.048 | 1.681 | 6.740 | 0.031 | n/a | 0.380 | 1.699 | n/a | n/a | 0.026 | 4.848 | 0.315 | 0.026 | node-14/thread-0/driver.execute | none observed |
| a46e1642d1c690480000000000001f57 | 14.901 | 4.969 | n/a | 0.000 | 2.456 | 1.342 | 1.233 | 0.021 | n/a | 0.420 | 4.382 | n/a | n/a | 0.077 | 7.426 | 0.498 | 0.077 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001f52 | 14.802 | 2.270 | n/a | 1.536 | 0.023 | 0.516 | 0.998 | 0.013 | n/a | 0.288 | 9.098 | n/a | n/a | 0.061 | 3.829 | 0.259 | 0.061 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001f5b | 13.769 | 2.908 | n/a | 0.000 | 0.042 | 1.076 | 0.982 | 0.015 | n/a | 0.066 | 8.635 | n/a | n/a | 0.044 | 2.950 | 0.214 | 0.044 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ee3 | 13.329 | 3.136 | n/a | 0.000 | 0.030 | 0.615 | 1.279 | 0.017 | n/a | 0.359 | 7.873 | n/a | n/a | 0.021 | 3.166 | 0.238 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ed4 | 13.122 | 1.616 | n/a | 0.000 | 0.034 | 0.399 | 0.921 | 0.015 | n/a | 0.321 | 9.798 | n/a | n/a | 0.018 | 1.650 | 0.126 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001f15 | 12.912 | 2.126 | n/a | 0.000 | 0.049 | 0.593 | 1.369 | 0.024 | n/a | 0.127 | 8.598 | n/a | n/a | 0.026 | 2.175 | 0.168 | 0.026 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ea6 | 11.511 | 3.378 | n/a | 0.000 | 0.073 | 0.643 | 0.840 | 0.015 | n/a | 0.056 | 6.460 | n/a | n/a | 0.045 | 3.452 | 0.300 | 0.045 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ef8 | 11.396 | 1.967 | n/a | 0.000 | 0.041 | 0.387 | 1.370 | 0.036 | n/a | 0.141 | 7.426 | n/a | n/a | 0.028 | 2.009 | 0.176 | 0.028 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ee8 | 11.281 | 3.213 | n/a | 0.000 | 0.095 | 0.777 | 0.843 | 0.017 | n/a | 0.062 | 6.237 | n/a | n/a | 0.037 | 3.308 | 0.293 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ed6 | 10.723 | 2.875 | n/a | 0.000 | 0.066 | 0.624 | 0.897 | 0.013 | n/a | 0.251 | 5.970 | n/a | n/a | 0.028 | 2.941 | 0.274 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001f33 | 10.662 | 2.434 | n/a | 0.000 | 0.050 | 0.599 | 0.810 | 0.013 | n/a | 0.217 | 6.517 | n/a | n/a | 0.021 | 2.484 | 0.233 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001f39 | 10.652 | 1.645 | n/a | 0.000 | 2.872 | 0.885 | 0.572 | 0.007 | n/a | 0.035 | 4.629 | n/a | n/a | 0.006 | 4.517 | 0.424 | 0.006 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.021ms |
| a46e1642d1c690480000000000001f20 | 10.637 | 1.647 | n/a | 0.000 | 0.030 | 0.736 | 1.647 | 0.030 | n/a | 0.622 | 5.908 | n/a | n/a | 0.018 | 1.677 | 0.158 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.104ms |
| a46e1642d1c690480000000000001f4f | 10.625 | 2.116 | n/a | 0.000 | 1.664 | 0.399 | 0.763 | 0.015 | n/a | 0.331 | 5.312 | n/a | n/a | 0.024 | 3.781 | 0.356 | 0.024 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001f40 | 9.999 | 4.280 | n/a | 0.000 | 0.086 | 0.585 | 0.879 | 0.014 | n/a | 0.070 | 4.052 | n/a | n/a | 0.032 | 4.366 | 0.437 | 0.032 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (366 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.231 | 0.169 | 0.000 | 0.435 | 3.243 | n/a | 0.000 | 0.053 | 0.820 | 1.512 | 0.018 | n/a | 0.096 | 5.847 | n/a | n/a | 0.030 | 3.590 | 0.274 | 0.030 |
| p99 | 42.403 | 2.813 | 0.000 | 2.318 | 8.346 | n/a | 2.032 | 2.698 | 4.181 | 8.986 | 0.063 | n/a | 1.699 | 33.672 | n/a | n/a | 0.084 | 10.804 | 0.553 | 0.084 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c690480000000000002221 | 51.098 | 3.234 | 0.184 | 0.000 | 0.053 | 1.024 | 5.641 | 0.038 | n/a | 0.068 | 40.832 | n/a | n/a | 0.025 | 3.470 | 0.068 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001f9b | 46.401 | 2.657 | n/a | 0.000 | 0.038 | 0.817 | 1.578 | 0.028 | n/a | 0.093 | 41.159 | n/a | n/a | 0.032 | 2.695 | 0.058 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.400ms |
| a46e1642d1c69048000000000000205b | 44.680 | 2.966 | n/a | 0.000 | 0.044 | 0.541 | 1.249 | 0.013 | n/a | 0.053 | 39.797 | n/a | n/a | 0.018 | 3.010 | 0.067 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000213f | 42.403 | 3.744 | 0.191 | 0.357 | 0.059 | 1.130 | 2.992 | 0.071 | n/a | 0.149 | 33.672 | n/a | n/a | 0.039 | 4.351 | 0.103 | 0.039 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.389ms |
| a46e1642d1c6904800000000000020f4 | 41.042 | 2.623 | n/a | 0.000 | 0.047 | 0.531 | 31.824 | 0.025 | n/a | 0.058 | 5.907 | n/a | n/a | 0.028 | 2.670 | 0.065 | 0.028 | gw-w/thread-66/commit.prepare-and-validate | none observed |
| a46e1642d1c69048000000000000213b | 37.949 | 4.267 | 0.204 | 0.241 | 0.032 | 0.656 | 1.229 | 0.015 | n/a | 0.053 | 31.228 | n/a | n/a | 0.023 | 4.745 | 0.125 | 0.023 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001fa7 | 34.587 | 3.463 | 0.266 | 0.264 | 0.072 | 1.076 | 16.702 | 0.036 | n/a | 0.129 | 12.530 | n/a | n/a | 0.049 | 4.065 | 0.118 | 0.049 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000002181 | 30.205 | 8.346 | n/a | 2.384 | 0.105 | 0.584 | 2.697 | 0.024 | n/a | 0.727 | 15.281 | n/a | n/a | 0.057 | 10.835 | 0.359 | 0.057 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000020f9 | 29.128 | 3.101 | 0.158 | 0.000 | 0.038 | 1.024 | 8.464 | 0.036 | n/a | 1.699 | 14.586 | n/a | n/a | 0.023 | 3.297 | 0.113 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000002231 | 28.088 | 3.960 | 0.293 | 0.000 | 0.051 | 1.504 | 8.329 | 0.031 | n/a | 0.120 | 13.776 | n/a | n/a | 0.024 | 4.304 | 0.153 | 0.024 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000206f | 26.124 | 3.712 | 0.204 | 0.000 | 0.049 | 1.657 | 8.697 | 0.027 | n/a | 0.083 | 11.663 | n/a | n/a | 0.031 | 3.966 | 0.152 | 0.031 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.951ms |
| a46e1642d1c690480000000000001fa5 | 25.869 | 4.929 | 0.170 | 0.439 | 0.041 | 4.641 | 7.149 | 0.016 | n/a | 0.042 | 8.393 | n/a | n/a | 0.047 | 5.579 | 0.216 | 0.047 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000002191 | 25.457 | 3.397 | 0.214 | 0.000 | 0.029 | 3.425 | 2.355 | 0.028 | n/a | 3.777 | 12.191 | n/a | n/a | 0.041 | 3.640 | 0.143 | 0.041 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000002237 | 25.284 | 4.537 | 0.306 | 0.000 | 0.067 | 1.573 | 5.214 | 0.025 | n/a | 0.074 | 13.460 | n/a | n/a | 0.027 | 4.910 | 0.194 | 0.027 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000020e1 | 24.405 | 4.049 | 0.222 | 0.000 | 0.119 | 1.745 | 7.865 | 0.025 | n/a | 0.254 | 10.071 | n/a | n/a | 0.055 | 4.390 | 0.180 | 0.055 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000002030 | 22.956 | 10.593 | n/a | 2.509 | 0.073 | 4.181 | 3.350 | 0.033 | n/a | 0.100 | 2.075 | n/a | n/a | 0.042 | 13.175 | 0.574 | 0.042 | node-14/thread-0/driver.execute | driver.reader-basis.broadcast 0.863ms |
| a46e1642d1c690480000000000002146 | 22.809 | 9.343 | n/a | 2.958 | 1.026 | 0.774 | 1.574 | 0.015 | n/a | 0.484 | 6.619 | n/a | n/a | 0.017 | 13.327 | 0.584 | 0.017 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000002149 | 22.606 | 3.599 | 0.234 | 0.269 | 0.134 | 1.204 | 6.193 | 0.028 | n/a | 0.341 | 10.542 | n/a | n/a | 0.063 | 4.236 | 0.187 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000002097 | 22.199 | 5.930 | 0.803 | 0.000 | 0.053 | 1.943 | 4.634 | 0.017 | n/a | 0.060 | 8.733 | n/a | n/a | 0.025 | 6.787 | 0.306 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.064ms |
| a46e1642d1c690480000000000001ffc | 22.166 | 5.475 | 0.242 | 0.000 | 0.039 | 1.323 | 7.822 | 0.027 | n/a | 0.100 | 7.111 | n/a | n/a | 0.027 | 5.755 | 0.260 | 0.027 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit / 5-10 facts (109 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.259 | 0.185 | 0.000 | 0.431 | 2.338 | n/a | 0.000 | 0.049 | 0.664 | 1.065 | 0.017 | n/a | 0.095 | 5.075 | n/a | n/a | 0.031 | 2.467 | 0.257 | 0.031 |
| p99 | 41.042 | 1.381 | 0.000 | 0.897 | 5.228 | n/a | 0.000 | 2.884 | 3.204 | 4.306 | 0.044 | n/a | 0.706 | 13.248 | n/a | n/a | 0.084 | 6.119 | 0.488 | 0.084 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a46e1642d1c690480000000000001f9b | 46.401 | 2.657 | n/a | 0.000 | 0.038 | 0.817 | 1.578 | 0.028 | n/a | 0.093 | 41.159 | n/a | n/a | 0.032 | 2.695 | 0.058 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.400ms |
| a46e1642d1c6904800000000000020f4 | 41.042 | 2.623 | n/a | 0.000 | 0.047 | 0.531 | 31.824 | 0.025 | n/a | 0.058 | 5.907 | n/a | n/a | 0.028 | 2.670 | 0.065 | 0.028 | gw-w/thread-66/commit.prepare-and-validate | none observed |
| a46e1642d1c6904800000000000021c9 | 20.873 | 4.182 | n/a | 0.000 | 0.087 | 1.200 | 3.375 | 0.040 | n/a | 0.160 | 11.786 | n/a | n/a | 0.043 | 4.269 | 0.205 | 0.043 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000214c | 17.791 | 2.665 | n/a | 0.000 | 0.040 | 0.650 | 0.804 | 0.015 | n/a | 0.333 | 13.248 | n/a | n/a | 0.035 | 2.705 | 0.152 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.231ms |
| a46e1642d1c69048000000000000209b | 16.887 | 6.078 | n/a | 0.000 | 0.041 | 2.427 | 2.991 | 0.044 | n/a | 0.204 | 5.075 | n/a | n/a | 0.028 | 6.119 | 0.362 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000021ec | 16.240 | 4.303 | n/a | 0.000 | 2.510 | 0.554 | 1.028 | 0.023 | n/a | 0.088 | 7.694 | n/a | n/a | 0.040 | 6.813 | 0.420 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000208d | 15.628 | 2.269 | n/a | 0.000 | 0.033 | 0.595 | 1.097 | 0.022 | n/a | 0.078 | 11.516 | n/a | n/a | 0.018 | 2.302 | 0.147 | 0.018 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000002194 | 15.219 | 2.324 | n/a | 0.000 | 1.301 | 0.764 | 3.821 | 0.014 | n/a | 3.523 | 3.449 | n/a | n/a | 0.024 | 3.625 | 0.238 | 0.024 | gw-w/thread-44/d/transact-async | driver.reader-basis.broadcast 0.367ms |
| a46e1642d1c690480000000000002014 | 15.196 | 4.305 | n/a | 0.000 | 0.115 | 1.310 | 1.982 | 0.037 | n/a | 0.141 | 7.237 | n/a | n/a | 0.069 | 4.419 | 0.291 | 0.069 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c6904800000000000020e3 | 15.000 | 2.067 | n/a | 0.000 | 0.050 | 0.526 | 0.977 | 0.021 | n/a | 0.137 | 11.189 | n/a | n/a | 0.032 | 2.117 | 0.141 | 0.032 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000201e | 14.641 | 2.796 | n/a | 0.000 | 0.061 | 1.185 | 2.271 | 0.038 | n/a | 0.706 | 7.549 | n/a | n/a | 0.035 | 2.857 | 0.195 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000209f | 14.595 | 2.235 | n/a | 0.000 | 0.043 | 2.827 | 1.145 | 0.017 | n/a | 0.079 | 8.219 | n/a | n/a | 0.030 | 2.279 | 0.156 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000221d | 14.554 | 2.687 | n/a | 0.000 | 3.147 | 0.782 | 0.963 | 0.017 | n/a | 0.130 | 6.802 | n/a | n/a | 0.026 | 5.834 | 0.401 | 0.026 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001ffa | 14.522 | 3.041 | n/a | 0.000 | 2.412 | 0.479 | 0.839 | 0.014 | n/a | 0.057 | 7.646 | n/a | n/a | 0.035 | 5.452 | 0.375 | 0.035 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c69048000000000000206c | 14.438 | 1.919 | n/a | 0.000 | 0.048 | 4.239 | 0.812 | 0.013 | n/a | 0.038 | 7.336 | n/a | n/a | 0.033 | 1.967 | 0.136 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001fc5 | 14.079 | 2.042 | n/a | 0.000 | 0.047 | 0.881 | 1.836 | 0.044 | n/a | 0.231 | 8.963 | n/a | n/a | 0.034 | 2.090 | 0.148 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001fc2 | 13.790 | 2.697 | n/a | 0.000 | 0.082 | 0.765 | 1.037 | 0.014 | n/a | 0.211 | 8.936 | n/a | n/a | 0.048 | 2.779 | 0.201 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000002055 | 13.712 | 2.205 | n/a | 0.000 | 0.048 | 3.139 | 0.742 | 0.019 | n/a | 0.060 | 7.463 | n/a | n/a | 0.036 | 2.252 | 0.164 | 0.036 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| a46e1642d1c690480000000000001fd8 | 13.431 | 1.665 | n/a | 0.000 | 0.047 | 0.845 | 1.503 | 0.026 | n/a | 0.096 | 9.215 | n/a | n/a | 0.034 | 1.712 | 0.127 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.446ms |
| a46e1642d1c690480000000000002152 | 13.316 | 3.309 | n/a | 0.000 | 0.080 | 1.490 | 0.921 | 0.015 | n/a | 0.320 | 7.131 | n/a | n/a | 0.051 | 3.388 | 0.254 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.081 | n/a | n/a | n/a | 2.967 | n/a | 0.000 | 0.000 | 1.991 | 200.437 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.326 | 2.967 | 0.008 | 0.326 |
| p99 | 365.965 | n/a | n/a | n/a | 20.930 | n/a | 2.727 | 0.000 | 9.182 | 360.498 | 0.149 | n/a | 0.202 | 0.000 | n/a | n/a | 40.378 | 23.656 | 0.295 | 40.378 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54614779fcaea8010000000000000002 | 365.965 | 2.967 | n/a | 0.000 | 0.000 | 1.938 | 360.498 | 0.149 | n/a | 0.086 | 0.000 | n/a | n/a | 0.326 | 2.967 | 0.008 | 0.326 | gw-r/thread-42/gateway.admitted-work | none observed |
| a3bdc82d9fb5a3510000000000000005 | 204.788 | 0.000 | n/a | 0.000 | 0.000 | 1.991 | 202.303 | 0.033 | n/a | 0.202 | 0.000 | n/a | n/a | 0.258 | 0.000 | 0.000 | 0.258 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000006 | 202.850 | 0.000 | n/a | 0.000 | 0.000 | 1.211 | 201.137 | 0.010 | n/a | 0.140 | 0.000 | n/a | n/a | 0.352 | 0.000 | 0.000 | 0.352 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001464 | 201.108 | 0.000 | n/a | 0.000 | 0.000 | 0.553 | 200.437 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001465 | 201.081 | 0.000 | n/a | 0.000 | 0.000 | 0.461 | 200.502 | 0.003 | n/a | 0.035 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001468 | 80.284 | 20.930 | n/a | 2.727 | 0.000 | 2.379 | 54.038 | 0.003 | n/a | 0.003 | 0.000 | n/a | n/a | 0.206 | 23.656 | 0.295 | 0.206 | gw-r/thread-47/gateway.admitted-work | none observed |
| a3bdc82d9fb5a3510000000000001469 | 64.902 | 16.205 | n/a | 0.000 | 0.000 | 8.318 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.378 | 16.205 | 0.250 | 40.378 | node-14/thread-5/socket.wait-first-byte | none observed |
| a3bdc82d9fb5a351000000000000146a | 58.117 | 14.865 | n/a | 1.427 | 0.000 | 9.182 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 32.644 | 16.292 | 0.280 | 32.644 | node-14/thread-5/socket.wait-first-byte | none observed |
| a3bdc82d9fb5a351000000000000146b | 54.015 | 14.003 | n/a | 1.376 | 0.000 | 7.191 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.445 | 15.379 | 0.285 | 31.445 | node-14/thread-5/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 860.984 | n/a | n/a | n/a | 0.232 | n/a | 0.000 | 0.000 | 1.658 | 828.422 | 0.011 | n/a | 0.126 | 0.000 | n/a | n/a | 0.278 | 0.232 | 0.000 | 0.278 |
| p99 | 1004.838 | n/a | n/a | n/a | 23.110 | n/a | 6.080 | 0.000 | 2.921 | 1001.392 | 0.048 | n/a | 0.271 | 0.000 | n/a | n/a | 1.274 | 29.190 | 0.034 | 1.274 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54614779fcaea80100000000000000a4 | 1004.838 | 0.232 | n/a | 0.000 | 0.000 | 1.658 | 1001.392 | 0.011 | n/a | 0.271 | 0.000 | n/a | n/a | 1.274 | 0.232 | 0.000 | 1.274 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea80100000000000000a5 | 860.984 | 23.110 | n/a | 6.080 | 0.000 | 2.921 | 828.422 | 0.048 | n/a | 0.126 | 0.000 | n/a | n/a | 0.278 | 29.190 | 0.034 | 0.278 | gw-r/thread-44/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 428.567 | n/a | n/a | n/a | 2.663 | n/a | 0.000 | 0.000 | 0.636 | 426.205 | 0.011 | n/a | 0.070 | 0.000 | n/a | n/a | 0.121 | 2.663 | 0.007 | 0.121 |
| p99 | 1005.385 | n/a | n/a | n/a | 9.780 | n/a | 0.000 | 0.000 | 3.802 | 1001.054 | 2.085 | n/a | 0.196 | 0.000 | n/a | n/a | 46.448 | 9.780 | 0.295 | 46.448 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54614779fcaea80100000000000000bb | 1005.385 | 0.172 | n/a | 0.000 | 0.000 | 2.813 | 1001.054 | 0.011 | n/a | 0.196 | 0.000 | n/a | n/a | 1.140 | 0.172 | 0.000 | 1.140 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea80100000000000000d0 | 1002.859 | 0.115 | n/a | 0.000 | 0.000 | 0.843 | 1000.643 | 0.011 | n/a | 0.070 | 0.000 | n/a | n/a | 1.179 | 0.115 | 0.000 | 1.179 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea80100000000000000ae | 997.325 | 2.394 | n/a | 0.000 | 0.000 | 0.539 | 994.169 | 0.022 | n/a | 0.125 | 0.000 | n/a | n/a | 0.075 | 2.394 | 0.002 | 0.075 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea80100000000000000b4 | 994.649 | 2.319 | n/a | 0.000 | 0.000 | 0.595 | 991.553 | 0.012 | n/a | 0.084 | 0.000 | n/a | n/a | 0.087 | 2.319 | 0.002 | 0.087 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea80100000000000000ba | 971.361 | 5.066 | n/a | 0.000 | 0.000 | 0.586 | 965.540 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.090 | 5.066 | 0.005 | 0.090 | gw-r/thread-42/journal/page | none observed |
| 54614779fcaea80100000000000000ab | 856.050 | 2.417 | n/a | 0.000 | 0.000 | 0.562 | 852.876 | 0.011 | n/a | 0.075 | 0.000 | n/a | n/a | 0.109 | 2.417 | 0.003 | 0.109 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea80100000000000000a8 | 818.949 | 2.067 | n/a | 0.000 | 0.000 | 0.513 | 816.173 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 0.094 | 2.067 | 0.003 | 0.094 | gw-r/thread-42/journal/page | none observed |
| 54614779fcaea80100000000000000c2 | 795.752 | 5.808 | n/a | 0.000 | 0.000 | 3.802 | 785.911 | 0.030 | n/a | 0.105 | 0.000 | n/a | n/a | 0.096 | 5.808 | 0.007 | 0.096 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea80100000000000000cb | 659.901 | 2.384 | n/a | 0.000 | 0.000 | 0.476 | 656.912 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.070 | 2.384 | 0.004 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea80100000000000000b3 | 649.562 | 4.733 | n/a | 0.000 | 0.000 | 1.600 | 642.953 | 0.013 | n/a | 0.096 | 0.000 | n/a | n/a | 0.167 | 4.733 | 0.007 | 0.167 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea80100000000000000ca | 601.503 | 2.724 | n/a | 0.000 | 0.000 | 0.681 | 597.944 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.083 | 2.724 | 0.005 | 0.083 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea80100000000000000c1 | 572.419 | 2.350 | n/a | 0.000 | 0.000 | 0.575 | 569.335 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.081 | 2.350 | 0.004 | 0.081 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea80100000000000000c6 | 566.433 | 2.487 | n/a | 0.000 | 0.000 | 0.772 | 560.977 | 2.085 | n/a | 0.037 | 0.000 | n/a | n/a | 0.074 | 2.487 | 0.004 | 0.074 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea80100000000000000b6 | 438.289 | 3.033 | n/a | 0.000 | 0.000 | 1.051 | 434.040 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 0.087 | 3.033 | 0.007 | 0.087 | gw-r/thread-45/journal/page | none observed |
| 54614779fcaea80100000000000000c5 | 428.567 | 1.806 | n/a | 0.000 | 0.000 | 0.438 | 426.205 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.067 | 1.806 | 0.004 | 0.067 | gw-r/thread-45/journal/page | none observed |
| 54614779fcaea80100000000000000c8 | 396.423 | 4.434 | n/a | 0.000 | 0.000 | 0.749 | 390.988 | 0.012 | n/a | 0.070 | 0.000 | n/a | n/a | 0.169 | 4.434 | 0.011 | 0.169 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea80100000000000000b9 | 340.280 | 4.270 | n/a | 0.000 | 0.000 | 0.683 | 335.117 | 0.022 | n/a | 0.101 | 0.000 | n/a | n/a | 0.087 | 4.270 | 0.013 | 0.087 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea80100000000000000a7 | 332.849 | 2.661 | n/a | 0.000 | 0.000 | 0.797 | 329.132 | 0.018 | n/a | 0.120 | 0.000 | n/a | n/a | 0.121 | 2.661 | 0.008 | 0.121 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea80100000000000000b1 | 328.364 | 9.780 | n/a | 0.000 | 0.000 | 0.698 | 317.569 | 0.019 | n/a | 0.111 | 0.000 | n/a | n/a | 0.187 | 9.780 | 0.030 | 0.187 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea80100000000000000cd | 279.052 | 6.958 | n/a | 0.000 | 0.000 | 0.695 | 271.191 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.147 | 6.958 | 0.025 | 0.147 | gw-r/thread-44/journal/page | none observed |

## P3 / L1 / internal (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 397.640 | n/a | n/a | n/a | 3.401 | n/a | 0.000 | 0.000 | 0.572 | 393.538 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.090 | 3.836 | 0.011 | 0.090 |
| p99 | 1025.191 | n/a | n/a | n/a | 14.835 | n/a | 3.026 | 0.000 | 5.243 | 1023.330 | 0.178 | n/a | 0.124 | 0.000 | n/a | n/a | 47.024 | 15.819 | 0.707 | 47.024 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54614779fcaea8010000000000000115 | 1025.191 | 0.148 | n/a | 0.000 | 0.000 | 0.514 | 1023.330 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 1.140 | 0.148 | 0.000 | 1.140 | gw-r/thread-45/journal/page | none observed |
| 54614779fcaea80100000000000000d2 | 1014.239 | 11.656 | n/a | 1.107 | 0.000 | 1.318 | 999.937 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 0.132 | 12.763 | 0.013 | 0.132 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000000139 | 1008.365 | 5.559 | n/a | 0.000 | 0.000 | 2.961 | 999.630 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.153 | 5.559 | 0.006 | 0.153 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea801000000000000012b | 1007.199 | 3.662 | n/a | 0.000 | 0.000 | 0.696 | 1002.689 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.080 | 3.662 | 0.004 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 54614779fcaea8010000000000000101 | 1004.163 | 3.047 | n/a | 0.000 | 0.000 | 0.693 | 1000.278 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.079 | 3.047 | 0.003 | 0.079 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea8010000000000000105 | 1003.657 | 0.188 | n/a | 0.000 | 0.000 | 0.732 | 1001.542 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 1.142 | 0.188 | 0.000 | 1.142 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea801000000000000010e | 1003.575 | 2.929 | n/a | 0.000 | 0.000 | 0.535 | 999.990 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.062 | 2.929 | 0.003 | 0.062 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea801000000000000012c | 1002.519 | 0.180 | n/a | 0.000 | 0.000 | 0.511 | 1000.564 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 1.206 | 0.180 | 0.000 | 1.206 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea80100000000000000fe | 999.329 | 9.546 | n/a | 0.566 | 0.000 | 0.830 | 988.100 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.207 | 10.113 | 0.010 | 0.207 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea801000000000000011e | 998.418 | 3.261 | n/a | 0.605 | 0.000 | 0.393 | 994.040 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.070 | 3.866 | 0.004 | 0.070 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea80100000000000000d3 | 993.672 | 3.874 | n/a | 0.593 | 0.000 | 0.463 | 988.560 | 0.011 | n/a | 0.061 | 0.000 | n/a | n/a | 0.111 | 4.466 | 0.004 | 0.111 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea80100000000000000da | 991.495 | 3.662 | n/a | 0.459 | 0.000 | 0.353 | 986.886 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.069 | 4.121 | 0.004 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea8010000000000000127 | 990.385 | 2.682 | n/a | 0.000 | 0.000 | 0.554 | 986.975 | 0.008 | n/a | 0.082 | 0.000 | n/a | n/a | 0.083 | 2.682 | 0.003 | 0.083 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea8010000000000000155 | 990.002 | 2.887 | n/a | 0.000 | 0.000 | 0.429 | 986.580 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.068 | 2.887 | 0.003 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 54614779fcaea80100000000000000d9 | 987.250 | 3.401 | n/a | 0.523 | 0.000 | 3.305 | 979.863 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.080 | 3.924 | 0.004 | 0.080 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea80100000000000000df | 983.264 | 3.643 | n/a | 0.462 | 0.000 | 0.883 | 977.990 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.198 | 4.105 | 0.004 | 0.198 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea8010000000000000142 | 951.472 | 3.516 | n/a | 0.000 | 0.000 | 0.424 | 947.406 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.061 | 3.516 | 0.004 | 0.061 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea80100000000000000de | 940.109 | 3.981 | n/a | 0.448 | 0.000 | 0.598 | 934.917 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.101 | 4.429 | 0.005 | 0.101 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea8010000000000000112 | 846.770 | 3.090 | n/a | 0.746 | 0.000 | 0.571 | 842.136 | 0.012 | n/a | 0.114 | 0.000 | n/a | n/a | 0.101 | 3.836 | 0.005 | 0.101 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea80100000000000000e0 | 834.455 | 3.811 | n/a | 0.502 | 0.000 | 0.407 | 829.592 | 0.012 | n/a | 0.053 | 0.000 | n/a | n/a | 0.078 | 4.313 | 0.005 | 0.078 | gw-r/thread-62/journal/page | none observed |

## P3 / L4 / internal (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 357.352 | n/a | n/a | n/a | 2.764 | n/a | 0.000 | 0.000 | 0.508 | 352.104 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.066 | 2.764 | 0.008 | 0.066 |
| p99 | 1005.644 | n/a | n/a | n/a | 9.645 | n/a | 0.786 | 0.000 | 4.637 | 1001.588 | 0.021 | n/a | 0.070 | 0.000 | n/a | n/a | 49.571 | 9.645 | 0.523 | 49.571 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54614779fcaea80100000000000001e9 | 1008.923 | 2.259 | n/a | 0.000 | 0.000 | 0.358 | 1006.200 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.057 | 2.259 | 0.002 | 0.057 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea801000000000000017f | 1005.644 | 4.998 | n/a | 0.000 | 0.000 | 0.642 | 999.837 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.104 | 4.998 | 0.005 | 0.104 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea80100000000000001a6 | 1003.073 | 2.585 | n/a | 0.000 | 0.000 | 0.481 | 999.896 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.064 | 2.585 | 0.003 | 0.064 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea8010000000000000173 | 1002.845 | 0.106 | n/a | 0.000 | 0.000 | 0.734 | 1001.588 | 0.006 | n/a | 0.361 | 0.000 | n/a | n/a | 0.049 | 0.106 | 0.000 | 0.049 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea8010000000000000186 | 1002.319 | 0.115 | n/a | 0.000 | 0.000 | 0.428 | 1000.629 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 1.106 | 0.115 | 0.000 | 1.106 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea80100000000000001c3 | 1000.415 | 2.572 | n/a | 0.000 | 0.000 | 0.769 | 996.904 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.115 | 2.572 | 0.003 | 0.115 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea801000000000000019a | 998.767 | 2.808 | n/a | 0.000 | 0.000 | 0.718 | 995.136 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.078 | 2.808 | 0.003 | 0.078 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea8010000000000000185 | 997.340 | 2.789 | n/a | 0.000 | 0.000 | 0.804 | 993.627 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.059 | 2.789 | 0.003 | 0.059 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea801000000000000016e | 994.921 | 2.237 | n/a | 0.000 | 0.000 | 0.447 | 992.164 | 0.002 | n/a | 0.015 | 0.000 | n/a | n/a | 0.055 | 2.237 | 0.002 | 0.055 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea80100000000000001c4 | 990.306 | 5.630 | n/a | 0.000 | 0.000 | 1.162 | 983.319 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.151 | 5.630 | 0.006 | 0.151 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea801000000000000018b | 989.965 | 2.888 | n/a | 0.000 | 0.000 | 1.241 | 985.726 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.061 | 2.888 | 0.003 | 0.061 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea80100000000000001a7 | 988.564 | 3.328 | n/a | 0.000 | 0.000 | 0.561 | 984.578 | 0.003 | n/a | 0.038 | 0.000 | n/a | n/a | 0.057 | 3.328 | 0.003 | 0.057 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000000165 | 963.442 | 4.127 | n/a | 0.000 | 0.000 | 0.503 | 958.630 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.147 | 4.127 | 0.004 | 0.147 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea80100000000000001a5 | 928.521 | 5.507 | n/a | 0.000 | 0.000 | 0.468 | 922.372 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.148 | 5.507 | 0.006 | 0.148 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea801000000000000019d | 830.681 | 3.860 | n/a | 0.000 | 0.000 | 0.401 | 826.344 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.060 | 3.860 | 0.005 | 0.060 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea80100000000000001f7 | 818.875 | 4.043 | n/a | 0.000 | 0.000 | 0.688 | 814.028 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.062 | 4.043 | 0.005 | 0.062 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea80100000000000001c2 | 796.553 | 2.221 | n/a | 0.000 | 0.000 | 0.400 | 793.812 | 0.013 | n/a | 0.052 | 0.000 | n/a | n/a | 0.056 | 2.221 | 0.003 | 0.056 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea801000000000000017a | 776.239 | 2.762 | n/a | 0.000 | 0.000 | 0.570 | 772.781 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.057 | 2.762 | 0.004 | 0.057 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea80100000000000001d4 | 756.551 | 2.648 | n/a | 0.000 | 0.000 | 0.796 | 753.000 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.063 | 2.648 | 0.004 | 0.063 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea80100000000000001ef | 716.631 | 2.460 | n/a | 0.000 | 0.000 | 0.626 | 713.454 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.059 | 2.460 | 0.003 | 0.059 | gw-r/thread-44/journal/page | none observed |

## P3 / L16 / internal (1518 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.366 | n/a | n/a | n/a | 3.271 | n/a | 0.000 | 0.000 | 0.214 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.266 | 3.271 | 0.263 | 7.266 |
| p99 | 287.802 | n/a | n/a | n/a | 13.094 | n/a | 0.981 | 0.000 | 1.411 | 279.160 | 0.008 | n/a | 0.039 | 0.000 | n/a | n/a | 48.062 | 13.276 | 0.846 | 48.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54614779fcaea8010000000000000210 | 1003.547 | 4.516 | n/a | 0.000 | 0.000 | 0.673 | 998.183 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.141 | 4.516 | 0.004 | 0.141 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea8010000000000000216 | 1002.761 | 0.171 | n/a | 0.000 | 0.000 | 0.601 | 1000.786 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 1.144 | 0.171 | 0.000 | 1.144 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000000211 | 1002.528 | 0.115 | n/a | 0.000 | 0.000 | 0.472 | 1000.787 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 1.107 | 0.115 | 0.000 | 1.107 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea8010000000000000224 | 999.858 | 2.206 | n/a | 0.000 | 0.000 | 0.467 | 997.080 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.064 | 2.206 | 0.002 | 0.064 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea80100000000000001fd | 995.835 | 2.460 | n/a | 0.000 | 0.000 | 0.701 | 992.562 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.077 | 2.460 | 0.002 | 0.077 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000000218 | 995.563 | 2.464 | n/a | 0.000 | 0.000 | 0.426 | 992.545 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.088 | 2.464 | 0.002 | 0.088 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000000205 | 978.941 | 2.454 | n/a | 0.000 | 0.000 | 0.548 | 975.842 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.068 | 2.454 | 0.003 | 0.068 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000000214 | 963.443 | 3.018 | n/a | 0.000 | 0.000 | 0.545 | 959.782 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.063 | 3.018 | 0.003 | 0.063 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000000219 | 869.317 | 1.614 | n/a | 0.000 | 0.000 | 0.500 | 867.089 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.069 | 1.614 | 0.002 | 0.069 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea8010000000000000225 | 858.169 | 3.304 | n/a | 0.000 | 0.000 | 2.557 | 852.166 | 0.006 | n/a | 0.075 | 0.000 | n/a | n/a | 0.062 | 3.304 | 0.004 | 0.062 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea80100000000000001fe | 802.739 | 5.592 | n/a | 0.000 | 0.000 | 1.487 | 795.507 | 0.003 | n/a | 0.034 | 0.000 | n/a | n/a | 0.115 | 5.592 | 0.007 | 0.115 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea8010000000000000221 | 743.646 | 3.113 | n/a | 0.000 | 0.000 | 1.062 | 739.376 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.061 | 3.113 | 0.004 | 0.061 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea8010000000000000201 | 735.809 | 2.471 | n/a | 0.000 | 0.000 | 1.411 | 731.826 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.065 | 2.471 | 0.003 | 0.065 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea801000000000000021c | 713.475 | 2.195 | n/a | 0.000 | 0.000 | 0.360 | 710.804 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.059 | 2.195 | 0.003 | 0.059 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea801000000000000020e | 492.917 | 2.289 | n/a | 0.000 | 0.000 | 0.690 | 489.839 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 0.059 | 2.289 | 0.005 | 0.059 | gw-r/thread-45/journal/page | none observed |
| 54614779fcaea8010000000000000202 | 287.802 | 3.132 | n/a | 0.000 | 0.000 | 2.546 | 279.160 | 0.005 | n/a | 2.901 | 0.000 | n/a | n/a | 0.059 | 3.132 | 0.011 | 0.059 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea8010000000000000223 | 256.064 | 2.205 | n/a | 0.000 | 0.000 | 1.063 | 252.712 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.059 | 2.205 | 0.009 | 0.059 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea801000000000000021e | 248.670 | 2.228 | n/a | 0.000 | 0.000 | 0.372 | 245.958 | 0.009 | n/a | 0.040 | 0.000 | n/a | n/a | 0.064 | 2.228 | 0.009 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 54614779fcaea801000000000000020d | 243.800 | 3.211 | n/a | 0.000 | 0.000 | 0.624 | 239.874 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.064 | 3.211 | 0.013 | 0.064 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea8010000000000000200 | 193.344 | 2.822 | n/a | 0.000 | 0.000 | 0.517 | 189.581 | 0.326 | n/a | 0.009 | 0.000 | n/a | n/a | 0.089 | 2.822 | 0.015 | 0.089 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / internal (1559 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.309 | n/a | n/a | n/a | 3.987 | n/a | 0.000 | 0.000 | 0.201 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.052 | 4.005 | 0.334 | 6.052 |
| p99 | 423.623 | n/a | n/a | n/a | 17.326 | n/a | 1.389 | 0.000 | 1.269 | 418.629 | 0.011 | n/a | 0.029 | 0.000 | n/a | n/a | 46.882 | 18.219 | 0.851 | 46.882 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54614779fcaea8010000000000001aa7 | 999.215 | 2.136 | n/a | 0.000 | 0.000 | 0.337 | 996.662 | 0.007 | n/a | 0.019 | 0.000 | n/a | n/a | 0.053 | 2.136 | 0.002 | 0.053 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea8010000000000001ab0 | 994.923 | 2.498 | n/a | 0.000 | 0.000 | 0.293 | 992.037 | 0.009 | n/a | 0.025 | 0.000 | n/a | n/a | 0.063 | 2.498 | 0.003 | 0.063 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000001ac9 | 992.916 | 2.148 | n/a | 0.000 | 0.000 | 0.662 | 990.025 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.053 | 2.148 | 0.002 | 0.053 | gw-r/thread-45/journal/page | none observed |
| 54614779fcaea8010000000000001aba | 971.474 | 4.957 | n/a | 0.000 | 0.000 | 0.203 | 966.132 | 0.011 | n/a | 0.037 | 0.000 | n/a | n/a | 0.134 | 4.957 | 0.005 | 0.134 | gw-r/thread-45/journal/page | none observed |
| 54614779fcaea8010000000000001aab | 963.340 | 3.452 | n/a | 0.000 | 0.000 | 0.429 | 959.317 | 0.021 | n/a | 0.018 | 0.000 | n/a | n/a | 0.103 | 3.452 | 0.004 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001aa5 | 931.386 | 2.160 | n/a | 0.000 | 0.000 | 0.343 | 928.797 | 0.007 | n/a | 0.023 | 0.000 | n/a | n/a | 0.056 | 2.160 | 0.002 | 0.056 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea8010000000000001aa8 | 887.536 | 11.149 | n/a | 1.389 | 0.000 | 0.366 | 874.156 | 0.005 | n/a | 0.014 | 0.000 | n/a | n/a | 0.457 | 12.538 | 0.014 | 0.457 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea8010000000000001acb | 772.565 | 4.241 | n/a | 0.000 | 0.000 | 0.464 | 767.728 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.100 | 4.241 | 0.005 | 0.100 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001ac6 | 691.630 | 2.324 | n/a | 0.000 | 0.000 | 0.311 | 688.898 | 0.011 | n/a | 0.031 | 0.000 | n/a | n/a | 0.054 | 2.324 | 0.003 | 0.054 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea8010000000000001ab1 | 622.909 | 1.568 | n/a | 0.000 | 0.000 | 0.322 | 620.910 | 0.011 | n/a | 0.037 | 0.000 | n/a | n/a | 0.061 | 1.568 | 0.003 | 0.061 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001ac0 | 601.562 | 4.248 | n/a | 0.000 | 0.000 | 0.447 | 596.737 | 0.008 | n/a | 0.029 | 0.000 | n/a | n/a | 0.093 | 4.248 | 0.007 | 0.093 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001acd | 589.263 | 7.503 | n/a | 0.000 | 0.000 | 0.459 | 581.058 | 0.006 | n/a | 0.019 | 0.000 | n/a | n/a | 0.218 | 7.503 | 0.013 | 0.218 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000001ae3 | 504.281 | 4.334 | n/a | 0.000 | 0.000 | 0.487 | 499.340 | 0.006 | n/a | 0.014 | 0.000 | n/a | n/a | 0.100 | 4.334 | 0.009 | 0.100 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000001adb | 498.305 | 2.562 | n/a | 0.000 | 0.000 | 0.448 | 495.185 | 0.006 | n/a | 0.014 | 0.000 | n/a | n/a | 0.091 | 2.562 | 0.005 | 0.091 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea8010000000000001ae0 | 462.030 | 4.380 | n/a | 0.000 | 0.000 | 0.393 | 457.120 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.104 | 4.380 | 0.009 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001ad9 | 423.623 | 4.328 | n/a | 0.000 | 0.000 | 0.528 | 418.629 | 0.008 | n/a | 0.018 | 0.000 | n/a | n/a | 0.113 | 4.328 | 0.010 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 54614779fcaea8010000000000001abf | 369.990 | 1.503 | n/a | 0.000 | 0.000 | 0.505 | 367.867 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.065 | 1.503 | 0.004 | 0.065 | gw-r/thread-66/journal/page | none observed |
| 54614779fcaea8010000000000001adc | 340.550 | 2.210 | n/a | 0.000 | 0.000 | 1.071 | 337.190 | 0.002 | n/a | 0.011 | 0.000 | n/a | n/a | 0.065 | 2.210 | 0.006 | 0.065 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000001ad7 | 306.285 | 5.184 | n/a | 0.000 | 0.000 | 0.253 | 300.689 | 0.005 | n/a | 0.011 | 0.000 | n/a | n/a | 0.143 | 5.184 | 0.017 | 0.143 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea8010000000000001ace | 295.568 | 1.976 | n/a | 0.000 | 0.000 | 0.396 | 293.084 | 0.011 | n/a | 0.038 | 0.000 | n/a | n/a | 0.063 | 1.976 | 0.007 | 0.063 | gw-r/thread-45/journal/page | none observed |

## P3 / L256 / internal (98 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 345.028 | n/a | n/a | n/a | 3.341 | n/a | 0.000 | 0.000 | 0.446 | 328.066 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.088 | 3.606 | 0.011 | 0.088 |
| p99 | 1010.184 | n/a | n/a | n/a | 18.504 | n/a | 2.974 | 0.000 | 3.829 | 1000.985 | 0.178 | n/a | 0.308 | 0.000 | n/a | n/a | 43.256 | 21.059 | 0.541 | 43.256 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54614779fcaea8010000000000001b2f | 1010.184 | 7.640 | n/a | 0.975 | 0.000 | 0.366 | 1000.985 | 0.010 | n/a | 0.041 | 0.000 | n/a | n/a | 0.167 | 8.615 | 0.009 | 0.167 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001b39 | 1003.757 | 5.046 | n/a | 0.960 | 0.000 | 0.344 | 997.322 | 0.003 | n/a | 0.016 | 0.000 | n/a | n/a | 0.066 | 6.006 | 0.006 | 0.066 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000001b38 | 1003.455 | 3.240 | n/a | 0.000 | 0.000 | 0.411 | 999.690 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.077 | 3.240 | 0.003 | 0.077 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea8010000000000001b46 | 1002.635 | 0.135 | n/a | 0.000 | 0.000 | 0.719 | 1000.624 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 1.109 | 0.135 | 0.000 | 1.109 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea8010000000000001b3d | 1001.854 | 0.084 | n/a | 0.000 | 0.000 | 0.299 | 1000.359 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 1.087 | 0.084 | 0.000 | 1.087 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001b2a | 1001.842 | 0.099 | n/a | 0.000 | 0.000 | 0.301 | 1000.322 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 1.097 | 0.099 | 0.000 | 1.097 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000001aee | 1000.181 | 2.408 | n/a | 0.000 | 0.000 | 0.328 | 997.323 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.052 | 2.408 | 0.002 | 0.052 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000001b6b | 1000.094 | 2.502 | n/a | 0.000 | 0.000 | 0.493 | 997.008 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.064 | 2.502 | 0.003 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea8010000000000001b6c | 996.760 | 6.776 | n/a | 0.937 | 0.000 | 0.516 | 988.248 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 0.262 | 7.713 | 0.008 | 0.262 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001afd | 995.419 | 4.475 | n/a | 0.000 | 0.000 | 0.402 | 990.410 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.094 | 4.475 | 0.004 | 0.094 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000001b3f | 986.159 | 5.239 | n/a | 0.000 | 0.000 | 0.426 | 980.409 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.063 | 5.239 | 0.005 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea8010000000000001b69 | 983.442 | 3.737 | n/a | 0.000 | 0.000 | 0.628 | 978.989 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.063 | 3.737 | 0.004 | 0.063 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea8010000000000001b67 | 982.429 | 2.492 | n/a | 0.000 | 0.000 | 0.608 | 979.244 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.063 | 2.492 | 0.003 | 0.063 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea8010000000000001b51 | 973.755 | 4.115 | n/a | 0.000 | 0.000 | 0.349 | 969.190 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.075 | 4.115 | 0.004 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001b59 | 970.668 | 2.938 | n/a | 0.000 | 0.000 | 0.509 | 967.101 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.073 | 2.938 | 0.003 | 0.073 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001aea | 948.194 | 4.517 | n/a | 0.000 | 0.000 | 0.348 | 943.215 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.088 | 4.517 | 0.005 | 0.088 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea8010000000000001b56 | 878.980 | 2.599 | n/a | 0.000 | 0.000 | 0.451 | 875.814 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.089 | 2.599 | 0.003 | 0.089 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea8010000000000001b43 | 859.377 | 3.680 | n/a | 0.776 | 0.000 | 0.795 | 854.010 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.087 | 4.456 | 0.005 | 0.087 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea8010000000000001b3a | 846.281 | 2.369 | n/a | 0.000 | 0.000 | 0.361 | 843.344 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.185 | 2.369 | 0.003 | 0.185 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea8010000000000001b64 | 839.440 | 3.662 | n/a | 0.853 | 0.000 | 0.500 | 834.291 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.104 | 4.515 | 0.005 | 0.104 | gw-r/thread-45/journal/page | none observed |

## P3 / L1024 / internal (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 368.196 | n/a | n/a | n/a | 2.907 | n/a | 0.000 | 0.000 | 0.498 | 365.419 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.080 | 2.907 | 0.009 | 0.080 |
| p99 | 1002.276 | n/a | n/a | n/a | 11.128 | n/a | 1.162 | 0.000 | 3.149 | 1000.491 | 6.019 | n/a | 0.048 | 0.000 | n/a | n/a | 40.061 | 11.128 | 0.721 | 40.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54614779fcaea8010000000000001bc5 | 1002.276 | 0.156 | n/a | 0.000 | 0.000 | 0.548 | 1000.414 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 1.124 | 0.156 | 0.000 | 1.124 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea8010000000000001bd6 | 1002.198 | 0.099 | n/a | 0.000 | 0.000 | 0.476 | 1000.491 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 1.095 | 0.099 | 0.000 | 1.095 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001bdd | 1001.270 | 2.609 | n/a | 0.000 | 0.000 | 0.715 | 997.827 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.086 | 2.609 | 0.003 | 0.086 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea8010000000000001bf3 | 1000.406 | 2.219 | n/a | 0.000 | 0.000 | 0.339 | 997.752 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.066 | 2.219 | 0.002 | 0.066 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea8010000000000001bde | 1000.237 | 4.527 | n/a | 0.000 | 0.000 | 0.757 | 994.807 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.102 | 4.527 | 0.005 | 0.102 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000001ba8 | 999.014 | 2.582 | n/a | 0.000 | 0.000 | 0.465 | 995.865 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 0.086 | 2.582 | 0.003 | 0.086 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001bd5 | 998.899 | 2.456 | n/a | 0.000 | 0.000 | 0.327 | 996.015 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.062 | 2.456 | 0.002 | 0.062 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000001c0b | 998.013 | 4.601 | n/a | 0.000 | 0.000 | 0.541 | 992.721 | 0.003 | n/a | 0.035 | 0.000 | n/a | n/a | 0.113 | 4.601 | 0.005 | 0.113 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea8010000000000001bce | 997.087 | 2.816 | n/a | 0.000 | 0.000 | 1.024 | 993.154 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.072 | 2.816 | 0.003 | 0.072 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea8010000000000001bcd | 996.518 | 4.752 | n/a | 0.000 | 0.000 | 0.554 | 991.082 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.107 | 4.752 | 0.005 | 0.107 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea8010000000000001bef | 996.080 | 2.907 | n/a | 0.000 | 0.000 | 0.366 | 992.695 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.068 | 2.907 | 0.003 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 54614779fcaea8010000000000001be3 | 967.084 | 2.442 | n/a | 0.000 | 0.000 | 0.242 | 964.290 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.071 | 2.442 | 0.003 | 0.071 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea8010000000000001bfe | 962.691 | 2.924 | n/a | 0.000 | 0.000 | 0.613 | 959.074 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 0.058 | 2.924 | 0.003 | 0.058 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001bf9 | 943.148 | 2.279 | n/a | 0.000 | 0.000 | 0.276 | 940.493 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.077 | 2.279 | 0.002 | 0.077 | gw-r/thread-45/journal/page | none observed |
| 54614779fcaea8010000000000001c0a | 911.836 | 2.192 | n/a | 0.000 | 0.000 | 0.521 | 909.031 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.059 | 2.192 | 0.002 | 0.059 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001bca | 909.416 | 8.673 | n/a | 0.000 | 0.000 | 2.996 | 897.443 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.282 | 8.673 | 0.010 | 0.282 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001ba5 | 904.935 | 3.336 | n/a | 0.000 | 0.000 | 0.416 | 901.097 | 0.003 | n/a | 0.013 | 0.000 | n/a | n/a | 0.071 | 3.336 | 0.004 | 0.071 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea8010000000000001bd4 | 857.029 | 2.900 | n/a | 0.000 | 0.000 | 0.498 | 853.520 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.063 | 2.900 | 0.003 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea8010000000000001be0 | 792.191 | 2.357 | n/a | 0.000 | 0.000 | 0.586 | 789.148 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.065 | 2.357 | 0.003 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 54614779fcaea8010000000000001bab | 792.098 | 2.431 | n/a | 0.000 | 0.000 | 0.374 | 789.217 | 0.002 | n/a | 0.012 | 0.000 | n/a | n/a | 0.063 | 2.431 | 0.003 | 0.063 | gw-r/thread-43/journal/page | none observed |

## P3 / tail / internal (367 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 328.095 | n/a | n/a | n/a | 3.168 | n/a | 0.000 | 0.000 | 0.440 | 324.800 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.092 | 3.168 | 0.011 | 0.092 |
| p99 | 1003.848 | n/a | n/a | n/a | 13.326 | n/a | 1.116 | 0.000 | 4.162 | 1000.697 | 0.170 | n/a | 0.059 | 0.000 | n/a | n/a | 46.682 | 14.338 | 0.742 | 46.682 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54614779fcaea8010000000000001c95 | 1007.079 | 2.631 | n/a | 0.000 | 0.000 | 0.404 | 1003.929 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.080 | 2.631 | 0.003 | 0.080 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea8010000000000001cb9 | 1004.894 | 4.563 | n/a | 0.000 | 0.000 | 1.824 | 998.319 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.146 | 4.563 | 0.005 | 0.146 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001ce0 | 1004.014 | 3.999 | n/a | 0.000 | 0.000 | 1.070 | 998.826 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.085 | 3.999 | 0.004 | 0.085 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001e39 | 1003.848 | 0.126 | n/a | 0.000 | 0.000 | 2.217 | 1000.347 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 1.128 | 0.126 | 0.000 | 1.128 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea8010000000000001cd0 | 1003.574 | 5.325 | n/a | 0.000 | 0.000 | 0.722 | 997.354 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.149 | 5.325 | 0.005 | 0.149 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea8010000000000001d72 | 1003.159 | 0.111 | n/a | 0.000 | 0.000 | 1.205 | 1000.697 | 0.010 | n/a | 0.039 | 0.000 | n/a | n/a | 1.096 | 0.111 | 0.000 | 1.096 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea8010000000000001d01 | 1003.053 | 5.890 | n/a | 0.000 | 0.000 | 0.629 | 996.374 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.136 | 5.890 | 0.006 | 0.136 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea8010000000000001c5d | 1002.853 | 0.081 | n/a | 0.000 | 0.000 | 1.011 | 1000.626 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 1.089 | 0.081 | 0.000 | 1.089 | gw-r/thread-45/journal/page | none observed |
| 54614779fcaea8010000000000001e36 | 1002.772 | 0.107 | n/a | 0.000 | 0.000 | 1.137 | 1000.398 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 1.096 | 0.107 | 0.000 | 1.096 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000001e26 | 1002.760 | 0.171 | n/a | 0.000 | 0.000 | 0.703 | 1000.714 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 1.119 | 0.171 | 0.000 | 1.119 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea8010000000000001c30 | 1002.681 | 2.480 | n/a | 0.000 | 0.000 | 0.416 | 999.679 | 0.007 | n/a | 0.030 | 0.000 | n/a | n/a | 0.069 | 2.480 | 0.002 | 0.069 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea8010000000000001d84 | 1002.655 | 0.163 | n/a | 0.000 | 0.000 | 0.621 | 1000.714 | 0.003 | n/a | 0.030 | 0.000 | n/a | n/a | 1.124 | 0.163 | 0.000 | 1.124 | gw-r/thread-40/journal/page | none observed |
| 54614779fcaea8010000000000001d64 | 1002.648 | 2.908 | n/a | 0.000 | 0.000 | 0.603 | 999.038 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.073 | 2.908 | 0.003 | 0.073 | gw-r/thread-62/journal/page | none observed |
| 54614779fcaea8010000000000001e07 | 1002.549 | 0.103 | n/a | 0.000 | 0.000 | 0.883 | 1000.438 | 0.003 | n/a | 0.029 | 0.000 | n/a | n/a | 1.092 | 0.103 | 0.000 | 1.092 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000001c10 | 1002.497 | 0.136 | n/a | 0.000 | 0.000 | 0.599 | 1000.597 | 0.003 | n/a | 0.035 | 0.000 | n/a | n/a | 1.128 | 0.136 | 0.000 | 1.128 | gw-r/thread-44/journal/page | none observed |
| 54614779fcaea8010000000000001c3c | 1002.387 | 0.134 | n/a | 0.000 | 0.000 | 0.587 | 1000.505 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 1.112 | 0.134 | 0.000 | 1.112 | gw-r/thread-43/journal/page | none observed |
| 54614779fcaea8010000000000001c3a | 1002.214 | 0.089 | n/a | 0.000 | 0.000 | 0.343 | 1000.650 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 1.084 | 0.089 | 0.000 | 1.084 | gw-r/thread-47/journal/page | none observed |
| 54614779fcaea8010000000000001ca1 | 1002.052 | 2.373 | n/a | 0.000 | 0.000 | 0.286 | 999.305 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.062 | 2.373 | 0.002 | 0.062 | gw-r/thread-46/journal/page | none observed |
| 54614779fcaea8010000000000001d75 | 1002.019 | 0.119 | n/a | 0.000 | 0.000 | 0.419 | 1000.354 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 1.099 | 0.119 | 0.000 | 1.099 | gw-r/thread-45/journal/page | none observed |
| 54614779fcaea8010000000000001c97 | 1001.737 | 2.591 | n/a | 0.000 | 0.000 | 0.488 | 998.564 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.064 | 2.591 | 0.003 | 0.064 | gw-r/thread-43/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.310 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 201.072 | 0.013 | n/a | 0.117 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 |
| p99 | 226.900 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.892 | 211.011 | 16.779 | n/a | 0.600 | 0.000 | n/a | n/a | 0.631 | 0.000 | 0.000 | 0.631 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3bdc82d9fb5a3510000000000000009 | 226.900 | 0.000 | n/a | 0.000 | 0.000 | 3.732 | 205.692 | 16.779 | n/a | 0.065 | 0.000 | n/a | n/a | 0.631 | 0.000 | 0.000 | 0.631 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a351000000000000000e | 211.786 | 0.000 | n/a | 0.000 | 0.000 | 0.576 | 211.011 | 0.014 | n/a | 0.083 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000050 | 209.534 | 0.000 | n/a | 0.000 | 0.000 | 1.099 | 207.868 | 0.272 | n/a | 0.129 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a351000000000000000d | 206.433 | 0.000 | n/a | 0.000 | 0.000 | 2.002 | 204.162 | 0.020 | n/a | 0.146 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a351000000000000002f | 206.303 | 0.000 | n/a | 0.000 | 0.000 | 4.483 | 201.610 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000057 | 206.090 | 0.000 | n/a | 0.000 | 0.000 | 4.499 | 201.318 | 0.013 | n/a | 0.143 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-42/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000036 | 206.003 | 0.000 | n/a | 0.000 | 0.000 | 1.152 | 204.609 | 0.018 | n/a | 0.135 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-42/journal/page | none observed |
| a3bdc82d9fb5a351000000000000002a | 205.825 | 0.000 | n/a | 0.000 | 0.000 | 0.655 | 204.893 | 0.029 | n/a | 0.154 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000033 | 205.764 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 204.579 | 0.013 | n/a | 0.178 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000031 | 204.922 | 0.000 | n/a | 0.000 | 0.000 | 0.558 | 204.150 | 0.011 | n/a | 0.107 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000022 | 204.303 | 0.000 | n/a | 0.000 | 0.000 | 0.517 | 203.600 | 0.019 | n/a | 0.071 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000046 | 204.249 | 0.000 | n/a | 0.000 | 0.000 | 2.099 | 201.826 | 0.010 | n/a | 0.102 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000043 | 204.058 | 0.000 | n/a | 0.000 | 0.000 | 2.135 | 201.593 | 0.031 | n/a | 0.210 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000039 | 203.943 | 0.000 | n/a | 0.000 | 0.000 | 2.304 | 201.249 | 0.014 | n/a | 0.117 | 0.000 | n/a | n/a | 0.259 | 0.000 | 0.000 | 0.259 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000049 | 203.935 | 0.000 | n/a | 0.000 | 0.000 | 0.800 | 202.369 | 0.362 | n/a | 0.252 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000020 | 203.877 | 0.000 | n/a | 0.000 | 0.000 | 1.861 | 201.596 | 0.024 | n/a | 0.163 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000047 | 203.729 | 0.000 | n/a | 0.000 | 0.000 | 2.180 | 201.212 | 0.015 | n/a | 0.149 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000016 | 203.634 | 0.000 | n/a | 0.000 | 0.000 | 1.452 | 201.949 | 0.013 | n/a | 0.119 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000024 | 203.477 | 0.000 | n/a | 0.000 | 0.000 | 1.162 | 201.893 | 0.028 | n/a | 0.204 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-42/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000030 | 203.440 | 0.000 | n/a | 0.000 | 0.000 | 1.167 | 201.943 | 0.012 | n/a | 0.142 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / read (230 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.797 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 200.786 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 |
| p99 | 206.592 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.379 | 204.613 | 3.875 | n/a | 0.230 | 0.000 | n/a | n/a | 0.336 | 0.000 | 0.000 | 0.336 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3bdc82d9fb5a35100000000000000a4 | 208.273 | 0.000 | n/a | 0.000 | 0.000 | 4.039 | 204.031 | 0.019 | n/a | 0.083 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000082 | 208.160 | 0.000 | n/a | 0.000 | 0.000 | 3.730 | 204.076 | 0.021 | n/a | 0.214 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000077 | 206.592 | 0.000 | n/a | 0.000 | 0.000 | 0.777 | 205.553 | 0.021 | n/a | 0.135 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-42/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000086 | 206.458 | 0.000 | n/a | 0.000 | 0.000 | 0.875 | 205.240 | 0.019 | n/a | 0.170 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a351000000000000011d | 206.387 | 0.000 | n/a | 0.000 | 0.000 | 1.897 | 204.292 | 0.010 | n/a | 0.096 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a35100000000000000e6 | 206.299 | 0.000 | n/a | 0.000 | 0.000 | 5.117 | 200.927 | 0.021 | n/a | 0.075 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a35100000000000000ca | 205.692 | 0.000 | n/a | 0.000 | 0.000 | 0.820 | 204.613 | 0.037 | n/a | 0.097 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000120 | 205.688 | 0.000 | n/a | 0.000 | 0.000 | 4.972 | 200.555 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a35100000000000000b2 | 205.533 | 0.000 | n/a | 0.000 | 0.000 | 0.986 | 204.277 | 0.014 | n/a | 0.143 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a35100000000000000b5 | 205.310 | 0.000 | n/a | 0.000 | 0.000 | 4.140 | 200.847 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a351000000000000008c | 205.244 | 0.000 | n/a | 0.000 | 0.000 | 3.963 | 200.978 | 0.012 | n/a | 0.113 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a351000000000000012a | 204.958 | 0.000 | n/a | 0.000 | 0.000 | 3.608 | 201.135 | 0.011 | n/a | 0.104 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000074 | 204.867 | 0.000 | n/a | 0.000 | 0.000 | 3.518 | 201.125 | 0.011 | n/a | 0.095 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000097 | 204.860 | 0.000 | n/a | 0.000 | 0.000 | 0.515 | 204.081 | 0.044 | n/a | 0.133 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000139 | 204.789 | 0.000 | n/a | 0.000 | 0.000 | 0.464 | 204.178 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a351000000000000012b | 204.772 | 0.000 | n/a | 0.000 | 0.000 | 3.413 | 201.165 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a351000000000000008e | 204.228 | 0.000 | n/a | 0.000 | 0.000 | 0.459 | 203.439 | 0.047 | n/a | 0.178 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a35100000000000000a9 | 204.205 | 0.000 | n/a | 0.000 | 0.000 | 0.704 | 200.933 | 2.321 | n/a | 0.090 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000119 | 204.166 | 0.000 | n/a | 0.000 | 0.000 | 0.802 | 203.051 | 0.015 | n/a | 0.163 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a351000000000000008a | 204.017 | 0.000 | n/a | 0.000 | 0.000 | 2.108 | 201.692 | 0.010 | n/a | 0.106 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-44/journal/page | none observed |

## P3 / L4 / read (223 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.490 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.624 | 200.746 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 |
| p99 | 205.015 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.760 | 203.157 | 3.732 | n/a | 0.214 | 0.000 | n/a | n/a | 0.329 | 0.000 | 0.000 | 0.329 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3bdc82d9fb5a351000000000000019e | 206.697 | 0.000 | n/a | 0.000 | 0.000 | 1.401 | 205.068 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000184 | 206.313 | 0.000 | n/a | 0.000 | 0.000 | 3.760 | 202.223 | 0.016 | n/a | 0.125 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a35100000000000001c9 | 205.015 | 0.000 | n/a | 0.000 | 0.000 | 0.419 | 204.460 | 0.009 | n/a | 0.045 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a351000000000000022d | 204.009 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 203.157 | 0.035 | n/a | 0.078 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000177 | 203.767 | 0.000 | n/a | 0.000 | 0.000 | 2.840 | 200.774 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000197 | 203.645 | 0.000 | n/a | 0.000 | 0.000 | 1.039 | 202.339 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000169 | 203.405 | 0.000 | n/a | 0.000 | 0.000 | 0.583 | 202.651 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000164 | 203.309 | 0.000 | n/a | 0.000 | 0.000 | 0.824 | 202.242 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a35100000000000001af | 203.088 | 0.000 | n/a | 0.000 | 0.000 | 1.786 | 201.073 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000171 | 203.033 | 0.000 | n/a | 0.000 | 0.000 | 0.369 | 202.347 | 0.012 | n/a | 0.214 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000215 | 202.910 | 0.000 | n/a | 0.000 | 0.000 | 0.797 | 201.817 | 0.015 | n/a | 0.132 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a351000000000000018c | 202.894 | 0.000 | n/a | 0.000 | 0.000 | 0.732 | 201.942 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a35100000000000001e4 | 202.845 | 0.000 | n/a | 0.000 | 0.000 | 1.250 | 201.210 | 0.015 | n/a | 0.153 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a35100000000000001e7 | 202.740 | 0.000 | n/a | 0.000 | 0.000 | 1.356 | 201.152 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a35100000000000001a1 | 202.724 | 0.000 | n/a | 0.000 | 0.000 | 1.330 | 201.171 | 0.008 | n/a | 0.084 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a351000000000000019c | 202.719 | 0.000 | n/a | 0.000 | 0.000 | 0.613 | 201.845 | 0.014 | n/a | 0.133 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000229 | 202.664 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 201.438 | 0.010 | n/a | 0.129 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a351000000000000015a | 202.642 | 0.000 | n/a | 0.000 | 0.000 | 1.573 | 200.808 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000161 | 202.590 | 0.000 | n/a | 0.000 | 0.000 | 1.286 | 200.802 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.423 | 0.000 | 0.000 | 0.423 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a35100000000000001b3 | 202.465 | 0.000 | n/a | 0.000 | 0.000 | 1.135 | 201.080 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-62/journal/page | none observed |

## P3 / L16 / read (154 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 79.393 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.496 | 78.252 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 |
| p99 | 205.114 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.968 | 203.291 | 1.013 | n/a | 0.325 | 0.000 | n/a | n/a | 50.167 | 0.000 | 0.000 | 50.167 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3bdc82d9fb5a351000000000000025c | 205.669 | 0.000 | n/a | 0.000 | 0.000 | 2.208 | 203.291 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000277 | 205.114 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 204.211 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a351000000000000028d | 202.818 | 0.000 | n/a | 0.000 | 0.000 | 1.125 | 201.399 | 0.006 | n/a | 0.087 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a351000000000000026d | 202.755 | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 201.463 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a351000000000000028f | 202.689 | 0.000 | n/a | 0.000 | 0.000 | 0.592 | 201.825 | 0.011 | n/a | 0.137 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a351000000000000028b | 202.606 | 0.000 | n/a | 0.000 | 0.000 | 0.282 | 202.061 | 0.012 | n/a | 0.170 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a351000000000000028c | 202.513 | 0.000 | n/a | 0.000 | 0.000 | 0.831 | 201.353 | 0.029 | n/a | 0.086 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000253 | 202.375 | 0.000 | n/a | 0.000 | 0.000 | 0.681 | 201.189 | 0.017 | n/a | 0.325 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a351000000000000026a | 202.367 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 201.468 | 0.016 | n/a | 0.105 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000288 | 202.304 | 0.000 | n/a | 0.000 | 0.000 | 1.312 | 200.844 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a351000000000000024f | 202.234 | 0.000 | n/a | 0.000 | 0.000 | 0.915 | 200.998 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000280 | 202.200 | 0.000 | n/a | 0.000 | 0.000 | 0.460 | 201.505 | 0.015 | n/a | 0.099 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000296 | 202.142 | 0.000 | n/a | 0.000 | 0.000 | 0.643 | 200.872 | 0.017 | n/a | 0.442 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000279 | 202.094 | 0.000 | n/a | 0.000 | 0.000 | 0.800 | 201.088 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000281 | 202.061 | 0.000 | n/a | 0.000 | 0.000 | 0.961 | 200.959 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a351000000000000025a | 202.055 | 0.000 | n/a | 0.000 | 0.000 | 0.793 | 201.050 | 0.004 | n/a | 0.058 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a351000000000000026f | 202.054 | 0.000 | n/a | 0.000 | 0.000 | 0.720 | 201.141 | 0.007 | n/a | 0.079 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000262 | 201.940 | 0.000 | n/a | 0.000 | 0.000 | 0.666 | 201.029 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000258 | 201.928 | 0.000 | n/a | 0.000 | 0.000 | 1.021 | 200.701 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000273 | 201.859 | 0.000 | n/a | 0.000 | 0.000 | 0.659 | 201.033 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / read (153 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 88.072 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.422 | 86.585 | 0.008 | n/a | 0.025 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 |
| p99 | 202.275 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.998 | 201.272 | 35.141 | n/a | 0.086 | 0.000 | n/a | n/a | 50.066 | 0.000 | 0.000 | 50.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3bdc82d9fb5a3510000000000000e79 | 202.538 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 201.509 | 0.023 | n/a | 0.086 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e52 | 202.275 | 0.000 | n/a | 0.000 | 0.000 | 0.805 | 201.200 | 0.017 | n/a | 0.073 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e70 | 201.950 | 0.000 | n/a | 0.000 | 0.000 | 1.174 | 200.643 | 0.008 | n/a | 0.033 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e80 | 201.930 | 0.000 | n/a | 0.000 | 0.000 | 0.850 | 200.877 | 0.010 | n/a | 0.045 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-66/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e78 | 201.712 | 0.000 | n/a | 0.000 | 0.000 | 0.293 | 201.272 | 0.016 | n/a | 0.063 | 0.000 | n/a | n/a | 0.068 | 0.000 | 0.000 | 0.068 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e89 | 201.708 | 0.000 | n/a | 0.000 | 0.000 | 0.379 | 201.159 | 0.017 | n/a | 0.071 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e86 | 201.680 | 0.000 | n/a | 0.000 | 0.000 | 1.063 | 200.492 | 0.010 | n/a | 0.034 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e57 | 201.631 | 0.000 | n/a | 0.000 | 0.000 | 0.322 | 201.136 | 0.016 | n/a | 0.105 | 0.000 | n/a | n/a | 0.053 | 0.000 | 0.000 | 0.053 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e48 | 201.597 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 200.630 | 0.010 | n/a | 0.037 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e73 | 201.550 | 0.000 | n/a | 0.000 | 0.000 | 0.441 | 200.978 | 0.012 | n/a | 0.056 | 0.000 | n/a | n/a | 0.064 | 0.000 | 0.000 | 0.064 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e7e | 201.503 | 0.000 | n/a | 0.000 | 0.000 | 0.535 | 200.757 | 0.011 | n/a | 0.067 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e8b | 201.498 | 0.000 | n/a | 0.000 | 0.000 | 0.449 | 200.847 | 0.014 | n/a | 0.048 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-66/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e58 | 201.337 | 0.000 | n/a | 0.000 | 0.000 | 0.379 | 200.799 | 0.017 | n/a | 0.060 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e51 | 201.333 | 0.000 | n/a | 0.000 | 0.000 | 0.644 | 200.475 | 0.008 | n/a | 0.030 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e61 | 201.310 | 0.000 | n/a | 0.000 | 0.000 | 0.413 | 200.750 | 0.015 | n/a | 0.039 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e72 | 201.279 | 0.000 | n/a | 0.000 | 0.000 | 0.426 | 200.698 | 0.015 | n/a | 0.041 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e4d | 201.254 | 0.000 | n/a | 0.000 | 0.000 | 0.307 | 200.803 | 0.015 | n/a | 0.053 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-66/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e50 | 201.168 | 0.000 | n/a | 0.000 | 0.000 | 0.490 | 200.530 | 0.011 | n/a | 0.035 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e7a | 201.167 | 0.000 | n/a | 0.000 | 0.000 | 0.486 | 200.558 | 0.009 | n/a | 0.038 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000e7f | 201.164 | 0.000 | n/a | 0.000 | 0.000 | 0.383 | 200.605 | 0.013 | n/a | 0.050 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / read (232 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.047 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.436 | 200.492 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 |
| p99 | 203.456 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.875 | 201.507 | 1.471 | n/a | 0.113 | 0.000 | n/a | n/a | 0.255 | 0.000 | 0.000 | 0.255 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3bdc82d9fb5a3510000000000000ebb | 209.199 | 0.000 | n/a | 0.000 | 0.000 | 1.875 | 207.210 | 0.020 | n/a | 0.028 | 0.000 | n/a | n/a | 0.066 | 0.000 | 0.000 | 0.066 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000f04 | 204.406 | 0.000 | n/a | 0.000 | 0.000 | 3.677 | 200.594 | 0.012 | n/a | 0.045 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000ecc | 203.456 | 0.000 | n/a | 0.000 | 0.000 | 0.251 | 202.980 | 0.074 | n/a | 0.085 | 0.000 | n/a | n/a | 0.066 | 0.000 | 0.000 | 0.066 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000eb2 | 203.319 | 0.000 | n/a | 0.000 | 0.000 | 2.768 | 200.409 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.069 | 0.000 | 0.000 | 0.069 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000f64 | 202.941 | 0.000 | n/a | 0.000 | 0.000 | 1.317 | 201.446 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000f5d | 202.463 | 0.000 | n/a | 0.000 | 0.000 | 1.447 | 200.792 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000eaa | 202.301 | 0.000 | n/a | 0.000 | 0.000 | 0.635 | 201.339 | 0.040 | n/a | 0.093 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000ed2 | 202.293 | 0.000 | n/a | 0.000 | 0.000 | 1.758 | 200.314 | 0.008 | n/a | 0.018 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000ea4 | 202.181 | 0.000 | n/a | 0.000 | 0.000 | 0.606 | 201.323 | 0.022 | n/a | 0.094 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-66/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000f3b | 202.152 | 0.000 | n/a | 0.000 | 0.000 | 1.095 | 200.841 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000ee7 | 202.146 | 0.000 | n/a | 0.000 | 0.000 | 0.737 | 201.105 | 0.019 | n/a | 0.096 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000f93 | 202.088 | 0.000 | n/a | 0.000 | 0.000 | 1.161 | 200.380 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.519 | 0.000 | 0.000 | 0.519 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000ec7 | 202.087 | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 201.088 | 0.027 | n/a | 0.043 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000f25 | 202.079 | 0.000 | n/a | 0.000 | 0.000 | 0.943 | 200.829 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000f51 | 202.009 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 201.289 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000ea3 | 201.999 | 0.000 | n/a | 0.000 | 0.000 | 0.828 | 200.930 | 0.017 | n/a | 0.058 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000f8e | 201.986 | 0.000 | n/a | 0.000 | 0.000 | 0.217 | 201.507 | 0.063 | n/a | 0.128 | 0.000 | n/a | n/a | 0.072 | 0.000 | 0.000 | 0.072 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000ec2 | 201.895 | 0.000 | n/a | 0.000 | 0.000 | 0.712 | 200.945 | 0.015 | n/a | 0.043 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000f58 | 201.879 | 0.000 | n/a | 0.000 | 0.000 | 1.143 | 200.614 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000ee6 | 201.839 | 0.000 | n/a | 0.000 | 0.000 | 0.925 | 200.601 | 0.011 | n/a | 0.043 | 0.000 | n/a | n/a | 0.258 | 0.000 | 0.000 | 0.258 | gw-r/thread-43/journal/page | none observed |

## P3 / L1024 / read (233 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.021 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.448 | 200.478 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 |
| p99 | 203.461 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.500 | 201.606 | 3.357 | n/a | 0.098 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3bdc82d9fb5a3510000000000000fba | 207.033 | 0.000 | n/a | 0.000 | 0.000 | 0.385 | 206.493 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000fce | 203.663 | 0.000 | n/a | 0.000 | 0.000 | 2.245 | 201.187 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a35100000000000010a1 | 203.461 | 0.000 | n/a | 0.000 | 0.000 | 2.500 | 200.809 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a35100000000000010a0 | 203.060 | 0.000 | n/a | 0.000 | 0.000 | 0.487 | 202.375 | 0.007 | n/a | 0.085 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a351000000000000106b | 202.534 | 0.000 | n/a | 0.000 | 0.000 | 1.451 | 200.936 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a351000000000000107a | 202.268 | 0.000 | n/a | 0.000 | 0.000 | 1.021 | 200.925 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000fee | 202.250 | 0.000 | n/a | 0.000 | 0.000 | 0.424 | 201.606 | 0.039 | n/a | 0.102 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a351000000000000101f | 202.150 | 0.000 | n/a | 0.000 | 0.000 | 1.426 | 200.534 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000ffe | 202.070 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 200.947 | 0.005 | n/a | 0.070 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001060 | 202.054 | 0.000 | n/a | 0.000 | 0.000 | 0.436 | 201.379 | 0.012 | n/a | 0.119 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000fd4 | 202.006 | 0.000 | n/a | 0.000 | 0.000 | 1.322 | 200.535 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001038 | 201.986 | 0.000 | n/a | 0.000 | 0.000 | 0.556 | 201.249 | 0.007 | n/a | 0.098 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a351000000000000104d | 201.985 | 0.000 | n/a | 0.000 | 0.000 | 0.902 | 200.747 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.281 | 0.000 | 0.000 | 0.281 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000fcd | 201.950 | 0.000 | n/a | 0.000 | 0.000 | 0.944 | 200.742 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000ff0 | 201.864 | 0.000 | n/a | 0.000 | 0.000 | 0.474 | 201.201 | 0.009 | n/a | 0.078 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000fb6 | 201.808 | 0.000 | n/a | 0.000 | 0.000 | 0.538 | 200.645 | 0.496 | n/a | 0.017 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001031 | 201.780 | 0.000 | n/a | 0.000 | 0.000 | 0.429 | 201.203 | 0.007 | n/a | 0.085 | 0.000 | n/a | n/a | 0.056 | 0.000 | 0.000 | 0.056 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001025 | 201.759 | 0.000 | n/a | 0.000 | 0.000 | 0.693 | 200.928 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.067 | 0.000 | 0.000 | 0.067 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001040 | 201.695 | 0.000 | n/a | 0.000 | 0.000 | 0.593 | 200.862 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a3510000000000000ff6 | 201.692 | 0.000 | n/a | 0.000 | 0.000 | 0.439 | 201.101 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-43/journal/page | none observed |

## P3 / tail / read (845 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.071 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.462 | 200.481 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 |
| p99 | 203.632 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.962 | 201.260 | 0.897 | n/a | 0.096 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3bdc82d9fb5a3510000000000001125 | 219.156 | 0.000 | n/a | 0.000 | 0.000 | 18.604 | 200.450 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-46/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001324 | 204.945 | 0.000 | n/a | 0.000 | 0.000 | 0.538 | 204.242 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001377 | 204.637 | 0.000 | n/a | 0.000 | 0.000 | 3.465 | 200.949 | 0.005 | n/a | 0.071 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a35100000000000011b3 | 204.484 | 0.000 | n/a | 0.000 | 0.000 | 0.468 | 203.878 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-45/journal/page | none observed |
| a3bdc82d9fb5a35100000000000011d7 | 204.353 | 0.000 | n/a | 0.000 | 0.000 | 3.330 | 200.897 | 0.003 | n/a | 0.039 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-62/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001210 | 204.065 | 0.000 | n/a | 0.000 | 0.000 | 3.227 | 200.697 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a35100000000000011ac | 203.700 | 0.000 | n/a | 0.000 | 0.000 | 3.085 | 200.469 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a35100000000000013aa | 203.683 | 0.000 | n/a | 0.000 | 0.000 | 3.078 | 200.489 | 0.003 | n/a | 0.035 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001316 | 203.632 | 0.000 | n/a | 0.000 | 0.000 | 2.962 | 200.504 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a35100000000000012e0 | 203.121 | 0.000 | n/a | 0.000 | 0.000 | 1.182 | 201.784 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a35100000000000011fb | 203.022 | 0.000 | n/a | 0.000 | 0.000 | 1.854 | 201.008 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001200 | 202.998 | 0.000 | n/a | 0.000 | 0.000 | 0.265 | 202.569 | 0.022 | n/a | 0.055 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001461 | 202.694 | 0.000 | n/a | 0.000 | 0.000 | 2.048 | 200.531 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a35100000000000013fa | 202.567 | 0.000 | n/a | 0.000 | 0.000 | 1.952 | 200.446 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001304 | 202.370 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 201.312 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-40/journal/page | none observed |
| a3bdc82d9fb5a35100000000000012ad | 202.366 | 0.000 | n/a | 0.000 | 0.000 | 1.699 | 200.509 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-44/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001408 | 202.361 | 0.000 | n/a | 0.000 | 0.000 | 0.869 | 201.209 | 0.009 | n/a | 0.092 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-47/journal/page | none observed |
| a3bdc82d9fb5a351000000000000113e | 202.298 | 0.000 | n/a | 0.000 | 0.000 | 0.842 | 201.094 | 0.010 | n/a | 0.081 | 0.000 | n/a | n/a | 0.270 | 0.000 | 0.000 | 0.270 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001305 | 202.293 | 0.000 | n/a | 0.000 | 0.000 | 0.858 | 201.115 | 0.010 | n/a | 0.081 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-43/journal/page | none observed |
| a3bdc82d9fb5a3510000000000001187 | 202.262 | 0.000 | n/a | 0.000 | 0.000 | 1.237 | 200.880 | 0.004 | n/a | 0.055 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-40/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3707 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/3.786 ms; post-ACK p50/p99: 0.382/1.869 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.810 | 10.349 | 10.032 | reported |
| All-primary p99 ms | 43.523 | 42.722 | 41.625 | <=50 |
| L256 5-10 p50Ms | 9.919 | 9.599 | 9.599 | <=10 |
| L256 5-10 p99Ms | 21.633 | 21.195 | 21.194 | <=50 |
| L256 11-25 p50Ms | 12.031 | 11.647 | 11.583 | <=10 |
| L256 11-25 p99Ms | 22.282 | 21.730 | 21.704 | <=50 |
| L256 26-50 p50Ms | 14.015 | 13.055 | 13.055 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 20.825 | 20.133 | 20.130 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 9.151 | 8.831 | 8.639 | <=10 |
| Burst 11-25 p50 ms | 11.711 | 11.135 | 10.815 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 22.282 | 21.730 | 21.704 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 43.793 | 43.074 | 43.071 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 54.881/54.881 | 53.371 | 31.988 | 84.344 | 1.220/0.107 |
| 5-10 | 250-1000 | 132 | 11.667/32.386 | 11.344 | 6.370 | 14.914 | 0.078/0.021 |
| 5-10 | 0-50 | 1105 | 8.214/25.458 | 7.850 | 4.446 | 10.984 | 0.040/0.018 |
| 11-25 | 250-1000 | 82 | 14.275/80.242 | 13.778 | 7.903 | 18.550 | 0.079/0.020 |
| 26-50 | 100-250 | 14 | 14.676/31.835 | 13.383 | 5.698 | 16.423 | 0.093/0.022 |
| 5-10 | 100-250 | 64 | 9.946/30.621 | 9.642 | 5.657 | 12.981 | 0.063/0.018 |
| 26-50 | 250-1000 | 22 | 15.976/78.601 | 14.994 | 8.539 | 19.924 | 0.098/0.021 |
| 11-25 | 100-250 | 28 | 11.988/20.384 | 11.512 | 6.165 | 16.693 | 0.069/0.018 |
| 11-25 | overlap | 400 | 12.531/48.130 | 11.940 | 7.219 | 16.695 | 0.037/0.018 |
| 5-10 | 50-100 | 80 | 9.088/40.995 | 8.751 | 4.966 | 12.195 | 0.055/0.018 |
| 11-25 | 0-50 | 520 | 10.561/30.450 | 9.969 | 5.423 | 13.484 | 0.047/0.019 |
| 26-50 | overlap | 152 | 16.993/49.805 | 15.650 | 9.351 | 21.216 | 0.047/0.019 |
| 11-25 | 50-100 | 46 | 11.400/47.489 | 10.879 | 5.291 | 13.501 | 0.059/0.019 |
| 5-10 | overlap | 851 | 10.031/42.028 | 9.680 | 5.967 | 13.417 | 0.033/0.017 |
| 26-50 | 0-50 | 195 | 14.375/49.704 | 13.328 | 6.717 | 17.425 | 0.058/0.020 |
| 26-50 | 50-100 | 15 | 16.136/21.783 | 14.734 | 7.779 | 18.656 | 0.065/0.019 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1845 | 14 | 949.953 |
| burst | 1862 | 3 | 180.240 |

## Writer heap, GC and scheduler stalls

Source d709fd769d271992b6a87841489c90665585e919; 3707 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 482.007 / 588.286 |
| GC events / total duration / maximum ms | 868 / 1990.366 / 49.019 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":850,"4":9,"8":9} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 43.523 / 17 / 1130.192 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.
