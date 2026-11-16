# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (83.956 ms, trace `fe798025e5e6911b0000000000000139`); `gw-w/thread-47/gateway.admitted-work` (37.130 ms, trace `fe798025e5e6911b0000000000000230`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (55.138 ms, trace `fe798025e5e6911b0000000000000179`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (38.175 ms, trace `fe798025e5e6911b00000000000000f2`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (57.368 ms, trace `fe798025e5e6911b000000000000012c`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-scheduler-a-1-baseline`; source `236dd70bf8077ee0a91acba63376db723e078306`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 8284167.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 202 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14382.071 | 285.457 | 4.494 | 457 |
| L1 | 0 | 19960.671 | 359.973 | 10.518 | 668 |
| L4 | 0 | 19981.748 | 319.440 | 15.453 | 628 |
| L16 | 0 | 19984.094 | 323.118 | 7.673 | 686 |
| L64 | 0 | 19967.701 | 341.881 | 6.436 | 850 |
| L256 | 0 | 19970.268 | 426.210 | 6.457 | 708 |
| L1024 | 0 | 19989.462 | 3279.847 | 29.946 | 17002 |
| tail | 0 | 64604.909 | 9919.860 | 90.976 | 52942 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| fe798025e5e6911b0000000000000139 | driver.queue.scheduler-dispatch | 0.208 | none | 0 / 32 |
| fe798025e5e6911b0000000000000139 | driver.queue.scheduler-late | 0.123 | none | 0 / 32 |

Observed active steps while trace fe798025e5e6911b0000000000000139 waited: []

| fe798025e5e6911b0000000000000230 | driver.queue.scheduler-dispatch | 0.063 | none | 0 / 32 |
| fe798025e5e6911b0000000000000230 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace fe798025e5e6911b0000000000000230 waited: []

| fe798025e5e6911b0000000000000179 | driver.queue.scheduler-dispatch | 0.044 | none | 0 / 32 |
| fe798025e5e6911b0000000000000179 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace fe798025e5e6911b0000000000000179 waited: []

| fe798025e5e6911b00000000000000f2 | driver.queue.scheduler-dispatch | 0.070 | none | 0 / 32 |
| fe798025e5e6911b00000000000000f2 | driver.queue.scheduler-late | 0.011 | none | 0 / 32 |

Observed active steps while trace fe798025e5e6911b00000000000000f2 waited: []

| fe798025e5e6911b000000000000012c | driver.queue.scheduler-dispatch | 0.136 | none | 0 / 32 |
| fe798025e5e6911b000000000000012c | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace fe798025e5e6911b000000000000012c waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.184 | 0.358 | 0.000 | 0.575 | 4.751 | 0.689 | 0.000 | 0.143 | 1.537 | 5.820 | 0.034 | n/a | 0.375 | 13.990 | n/a | n/a | 0.027 | 5.408 | 0.214 | 0.027 |
| p99 | 74.138 | 5.973 | 0.000 | 6.820 | 16.678 | n/a | 4.605 | 1.143 | 4.343 | 22.506 | 0.222 | n/a | 3.531 | 38.175 | n/a | n/a | 0.177 | 20.213 | 0.361 | 0.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b00000000000000f2 | 74.138 | 16.678 | 0.689 | 0.000 | 0.081 | 2.258 | 12.583 | 0.120 | n/a | 3.531 | 38.175 | n/a | n/a | 0.024 | 17.448 | 0.235 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| fe798025e5e6911b00000000000000ef | 56.029 | 14.706 | n/a | 4.605 | 0.903 | 1.347 | 5.820 | 0.034 | n/a | 2.584 | 25.854 | n/a | n/a | 0.177 | 20.213 | 0.361 | 0.177 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000000fc | 52.273 | 4.751 | 0.195 | 0.000 | 0.070 | 2.930 | 22.506 | 0.090 | n/a | 1.267 | 20.437 | n/a | n/a | 0.027 | 5.016 | 0.096 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| fe798025e5e6911b000000000000010e | 51.923 | 6.023 | 0.556 | 0.374 | 0.143 | 3.019 | 18.756 | 0.130 | n/a | 0.488 | 22.391 | n/a | n/a | 0.043 | 7.096 | 0.137 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.082ms |
| fe798025e5e6911b0000000000000102 | 46.601 | 5.056 | 0.256 | 0.000 | 0.097 | 2.449 | 15.229 | 0.073 | n/a | 1.342 | 22.062 | n/a | n/a | 0.039 | 5.408 | 0.116 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| fe798025e5e6911b0000000000000128 | 40.982 | 8.692 | 0.200 | 0.000 | 0.077 | 2.020 | 11.180 | 0.030 | n/a | 0.099 | 18.657 | n/a | n/a | 0.027 | 8.969 | 0.219 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| fe798025e5e6911b000000000000010a | 38.333 | 5.280 | 0.264 | 0.000 | 0.073 | 4.343 | 15.556 | 0.034 | n/a | 0.105 | 12.650 | n/a | n/a | 0.027 | 5.617 | 0.147 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| fe798025e5e6911b00000000000000f8 | 36.927 | 4.041 | n/a | 1.472 | 0.619 | 0.740 | 3.821 | 0.019 | n/a | 0.438 | 25.756 | n/a | n/a | 0.022 | 6.131 | 0.166 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000000ff | 36.379 | 4.259 | n/a | 0.000 | 1.092 | 1.537 | 3.066 | 0.045 | n/a | 0.439 | 25.915 | n/a | n/a | 0.026 | 5.351 | 0.147 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000114 | 34.177 | 7.119 | 0.310 | 0.000 | 0.079 | 2.640 | 12.943 | 0.035 | n/a | 0.507 | 10.521 | n/a | n/a | 0.024 | 7.508 | 0.220 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| fe798025e5e6911b000000000000011c | 33.394 | 3.835 | 0.183 | 0.000 | 0.070 | 1.173 | 6.623 | 0.030 | n/a | 0.328 | 21.127 | n/a | n/a | 0.026 | 4.088 | 0.122 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| fe798025e5e6911b0000000000000115 | 33.254 | 5.094 | n/a | 1.770 | 0.263 | 1.568 | 3.721 | 0.073 | n/a | 0.872 | 19.871 | n/a | n/a | 0.022 | 7.126 | 0.214 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| fe798025e5e6911b00000000000000fa | 32.788 | 4.588 | 0.219 | 0.000 | 0.116 | 1.771 | 12.650 | 0.030 | n/a | 0.386 | 12.987 | n/a | n/a | 0.041 | 4.922 | 0.150 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| fe798025e5e6911b0000000000000104 | 31.381 | 7.378 | 0.201 | 0.000 | 0.065 | 1.359 | 7.367 | 0.027 | n/a | 0.111 | 14.847 | n/a | n/a | 0.025 | 7.644 | 0.244 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| fe798025e5e6911b0000000000000118 | 31.184 | 5.804 | 0.296 | 0.479 | 0.104 | 1.798 | 7.308 | 0.026 | n/a | 0.101 | 15.231 | n/a | n/a | 0.036 | 6.683 | 0.214 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| fe798025e5e6911b0000000000000105 | 30.669 | 6.853 | n/a | 3.431 | 0.324 | 1.220 | 1.716 | 0.037 | n/a | 3.055 | 13.990 | n/a | n/a | 0.044 | 10.608 | 0.346 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000107 | 28.802 | 6.275 | n/a | 0.000 | 1.143 | 2.997 | 5.615 | 0.028 | n/a | 0.125 | 12.558 | n/a | n/a | 0.061 | 7.418 | 0.258 | 0.061 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| fe798025e5e6911b0000000000000120 | 28.384 | 7.191 | 0.326 | 0.000 | 0.046 | 1.578 | 7.906 | 0.222 | n/a | 0.094 | 11.002 | n/a | n/a | 0.019 | 7.563 | 0.266 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms |
| fe798025e5e6911b00000000000000f6 | 26.981 | 5.316 | 0.440 | 0.000 | 0.064 | 1.825 | 10.030 | 0.028 | n/a | 0.114 | 9.125 | n/a | n/a | 0.039 | 5.820 | 0.216 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| fe798025e5e6911b0000000000000126 | 24.522 | 3.709 | 0.222 | 0.000 | 0.039 | 1.166 | 6.259 | 0.028 | n/a | 0.387 | 12.696 | n/a | n/a | 0.016 | 3.971 | 0.162 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.932 | 0.507 | 0.000 | 0.575 | 3.354 | n/a | 0.000 | 0.546 | 0.940 | 2.057 | 0.034 | n/a | 0.202 | 10.260 | n/a | n/a | 0.031 | 3.984 | 0.218 | 0.031 |
| p99 | 36.927 | 1.001 | 0.000 | 1.566 | 4.315 | n/a | 1.472 | 1.018 | 1.422 | 5.279 | 0.069 | n/a | 3.173 | 25.756 | n/a | n/a | 0.113 | 6.131 | 0.288 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b00000000000000f8 | 36.927 | 4.041 | n/a | 1.472 | 0.619 | 0.740 | 3.821 | 0.019 | n/a | 0.438 | 25.756 | n/a | n/a | 0.022 | 6.131 | 0.166 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000111 | 23.904 | 2.306 | n/a | 0.000 | 0.462 | 1.048 | 1.732 | 0.040 | n/a | 3.173 | 15.121 | n/a | n/a | 0.022 | 2.768 | 0.116 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000011d | 22.341 | 2.207 | n/a | 0.000 | 0.255 | 0.711 | 5.279 | 0.069 | n/a | 0.202 | 13.588 | n/a | n/a | 0.030 | 2.462 | 0.110 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| fe798025e5e6911b0000000000000119 | 22.052 | 4.315 | n/a | 0.000 | 0.496 | 1.364 | 1.682 | 0.034 | n/a | 0.135 | 13.991 | n/a | n/a | 0.036 | 4.810 | 0.218 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000121 | 17.932 | 3.511 | n/a | 0.000 | 1.018 | 1.422 | 1.643 | 0.052 | n/a | 0.131 | 10.112 | n/a | n/a | 0.044 | 4.529 | 0.253 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000000f4 | 17.075 | 3.805 | n/a | 0.000 | 0.179 | 0.940 | 1.411 | 0.018 | n/a | 0.349 | 10.260 | n/a | n/a | 0.113 | 3.984 | 0.233 | 0.113 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000124 | 13.929 | 3.354 | n/a | 0.000 | 0.663 | 0.866 | 3.548 | 0.028 | n/a | 0.106 | 5.294 | n/a | n/a | 0.070 | 4.016 | 0.288 | 0.070 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000010f | 13.914 | 2.167 | n/a | 0.000 | 0.965 | 1.162 | 2.057 | 0.043 | n/a | 0.143 | 7.351 | n/a | n/a | 0.026 | 3.132 | 0.225 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000000fd | 13.392 | 1.792 | n/a | 0.000 | 0.546 | 0.648 | 5.033 | 0.020 | n/a | 0.375 | 4.948 | n/a | n/a | 0.031 | 2.338 | 0.175 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.692 | 0.224 | 0.000 | 0.592 | 3.994 | n/a | 0.000 | 0.116 | 1.440 | 4.726 | 0.032 | n/a | 0.416 | 13.716 | n/a | n/a | 0.026 | 4.578 | 0.167 | 0.026 |
| p99 | 106.539 | 1.819 | 0.000 | 1.621 | 7.537 | n/a | 2.396 | 1.856 | 5.596 | 14.695 | 0.087 | n/a | 3.552 | 83.956 | n/a | n/a | 0.079 | 8.986 | 0.376 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b0000000000000139 | 106.539 | 7.153 | n/a | 0.000 | 0.331 | 1.492 | 13.360 | 0.042 | n/a | 0.126 | 83.956 | n/a | n/a | 0.079 | 7.484 | 0.070 | 0.079 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| fe798025e5e6911b0000000000000179 | 75.572 | 4.871 | 0.336 | 0.000 | 0.045 | 1.744 | 13.231 | 0.053 | n/a | 0.135 | 55.138 | n/a | n/a | 0.019 | 5.252 | 0.069 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| fe798025e5e6911b000000000000012c | 73.345 | 5.459 | 0.235 | 0.000 | 0.140 | 1.679 | 7.877 | 0.028 | n/a | 0.520 | 57.368 | n/a | n/a | 0.040 | 5.834 | 0.080 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| fe798025e5e6911b0000000000000140 | 46.902 | 5.590 | 0.197 | 0.516 | 0.082 | 1.704 | 14.695 | 0.037 | n/a | 0.427 | 23.627 | n/a | n/a | 0.028 | 6.384 | 0.136 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| fe798025e5e6911b0000000000000144 | 40.691 | 3.670 | 0.206 | 0.000 | 0.038 | 1.135 | 13.326 | 0.071 | n/a | 3.138 | 19.088 | n/a | n/a | 0.020 | 3.914 | 0.096 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000014c | 37.452 | 4.219 | 0.289 | 0.000 | 0.062 | 1.290 | 5.459 | 0.034 | n/a | 2.735 | 23.340 | n/a | n/a | 0.023 | 4.570 | 0.122 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000133 | 37.067 | 5.283 | 0.246 | 0.000 | 0.087 | 1.572 | 12.854 | 0.027 | n/a | 0.110 | 16.838 | n/a | n/a | 0.051 | 5.615 | 0.151 | 0.051 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| fe798025e5e6911b000000000000016b | 36.476 | 4.323 | 0.309 | 0.268 | 0.059 | 1.485 | 13.253 | 0.083 | n/a | 0.519 | 16.155 | n/a | n/a | 0.023 | 4.959 | 0.136 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000155 | 36.437 | 2.972 | n/a | 0.000 | 0.599 | 0.668 | 1.750 | 0.071 | n/a | 3.552 | 26.804 | n/a | n/a | 0.021 | 3.571 | 0.098 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.077ms |
| fe798025e5e6911b000000000000016f | 36.012 | 4.100 | 0.178 | 0.000 | 0.042 | 1.150 | 9.532 | 0.053 | n/a | 0.448 | 20.493 | n/a | n/a | 0.015 | 4.320 | 0.120 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000014d | 35.825 | 6.155 | n/a | 1.823 | 1.007 | 0.536 | 1.725 | 0.018 | n/a | 0.057 | 24.489 | n/a | n/a | 0.015 | 8.986 | 0.251 | 0.015 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000013e | 34.026 | 3.915 | 0.171 | 0.000 | 0.050 | 0.883 | 11.389 | 0.032 | n/a | 0.297 | 17.272 | n/a | n/a | 0.019 | 4.135 | 0.122 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000134 | 33.358 | 7.537 | n/a | 0.000 | 0.503 | 5.596 | 4.726 | 0.056 | n/a | 0.606 | 14.299 | n/a | n/a | 0.035 | 8.039 | 0.241 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000159 | 31.864 | 3.994 | n/a | 0.000 | 1.156 | 3.591 | 1.739 | 0.086 | n/a | 0.888 | 20.346 | n/a | n/a | 0.063 | 5.150 | 0.162 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000171 | 31.259 | 3.576 | 0.198 | 0.000 | 0.061 | 1.679 | 11.766 | 0.057 | n/a | 0.186 | 13.716 | n/a | n/a | 0.022 | 3.834 | 0.123 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000013c | 28.661 | 4.586 | 0.679 | 0.524 | 0.049 | 1.899 | 6.255 | 0.030 | n/a | 0.408 | 14.213 | n/a | n/a | 0.019 | 5.838 | 0.204 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000136 | 28.245 | 3.947 | 0.325 | 0.000 | 0.072 | 1.419 | 9.632 | 0.064 | n/a | 0.130 | 12.629 | n/a | n/a | 0.026 | 4.344 | 0.154 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000165 | 27.800 | 3.840 | 0.192 | 0.280 | 0.050 | 1.086 | 10.543 | 0.034 | n/a | 0.441 | 11.316 | n/a | n/a | 0.018 | 4.362 | 0.157 | 0.018 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000167 | 27.701 | 3.608 | 1.090 | 0.260 | 0.056 | 0.933 | 5.484 | 0.031 | n/a | 0.414 | 15.804 | n/a | n/a | 0.020 | 5.015 | 0.181 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000154 | 27.661 | 3.566 | 0.190 | 0.356 | 0.067 | 1.170 | 6.113 | 0.044 | n/a | 0.100 | 16.032 | n/a | n/a | 0.023 | 4.178 | 0.151 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.799 | 0.175 | 0.000 | 0.593 | 2.354 | n/a | 0.000 | 0.433 | 1.113 | 1.739 | 0.030 | n/a | 0.448 | 10.382 | n/a | n/a | 0.027 | 2.792 | 0.162 | 0.027 |
| p99 | 33.358 | 0.982 | 0.000 | 0.973 | 7.537 | n/a | 0.000 | 1.856 | 5.596 | 4.726 | 0.086 | n/a | 1.189 | 20.346 | n/a | n/a | 0.077 | 8.039 | 0.312 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b0000000000000134 | 33.358 | 7.537 | n/a | 0.000 | 0.503 | 5.596 | 4.726 | 0.056 | n/a | 0.606 | 14.299 | n/a | n/a | 0.035 | 8.039 | 0.241 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000159 | 31.864 | 3.994 | n/a | 0.000 | 1.156 | 3.591 | 1.739 | 0.086 | n/a | 0.888 | 20.346 | n/a | n/a | 0.063 | 5.150 | 0.162 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000130 | 26.319 | 2.354 | n/a | 0.000 | 0.433 | 1.383 | 1.890 | 0.019 | n/a | 0.448 | 19.765 | n/a | n/a | 0.027 | 2.787 | 0.106 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000014f | 19.124 | 5.055 | n/a | 0.000 | 0.907 | 1.283 | 1.621 | 0.030 | n/a | 0.574 | 9.576 | n/a | n/a | 0.077 | 5.962 | 0.312 | 0.077 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000145 | 17.799 | 2.713 | n/a | 0.000 | 0.079 | 1.113 | 2.241 | 0.057 | n/a | 1.189 | 10.382 | n/a | n/a | 0.024 | 2.792 | 0.157 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| fe798025e5e6911b000000000000016c | 17.123 | 2.296 | n/a | 0.000 | 0.115 | 0.994 | 2.155 | 0.073 | n/a | 0.249 | 11.212 | n/a | n/a | 0.029 | 2.411 | 0.141 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000176 | 13.274 | 1.597 | n/a | 0.000 | 1.856 | 0.563 | 1.686 | 0.023 | n/a | 0.103 | 7.430 | n/a | n/a | 0.016 | 3.452 | 0.260 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.015ms |
| fe798025e5e6911b000000000000015f | 9.567 | 2.130 | n/a | 0.000 | 0.265 | 0.724 | 1.737 | 0.020 | n/a | 0.360 | 4.309 | n/a | n/a | 0.021 | 2.395 | 0.250 | 0.021 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (37 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.151 | n/a | n/a | n/a | 30.453 | 2.320 | 1.616 | 0.000 | 0.358 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.042 | 45.357 | 0.744 | 17.042 |
| p99 | 121.412 | n/a | n/a | n/a | 96.610 | 83.871 | 11.187 | 0.000 | 5.933 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 76.071 | 119.695 | 0.999 | 76.071 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b0000000000001b81 | 121.412 | 31.674 | 83.871 | 4.150 | 0.000 | 0.517 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.200 | 119.695 | 0.986 | 1.200 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.263ms; driver.publication.readback 0.126ms; driver.publication.readback 0.114ms; driver.publication.readback 0.098ms; driver.publication.readback 0.092ms |
| fe798025e5e6911b0000000000001bb3 | 117.403 | 96.610 | 0.199 | 11.187 | 0.000 | 0.752 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.656 | 107.996 | 0.920 | 8.656 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.288ms; driver.reader-basis.broadcast 0.273ms; driver.publication.readback 0.128ms; driver.publication.readback 0.118ms; driver.publication.readback 0.107ms |
| fe798025e5e6911b0000000000001b7e | 112.823 | 38.627 | 2.320 | 2.683 | 0.000 | 0.358 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 68.836 | 43.629 | 0.387 | 68.836 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.263ms; driver.publication.readback 0.060ms; driver.publication.readback 0.059ms; driver.publication.readback 0.058ms; driver.publication.readback 0.053ms |
| fe798025e5e6911b00000000000007fc | 106.389 | 24.934 | 3.043 | 1.568 | 0.000 | 0.775 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 76.071 | 29.544 | 0.278 | 76.071 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.196ms; driver.publication.readback 0.126ms; driver.publication.readback 0.103ms; driver.publication.readback 0.065ms; driver.publication.readback 0.060ms |
| fe798025e5e6911b0000000000000d4c | 104.855 | 45.275 | 35.413 | 0.000 | 0.000 | 0.141 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.026 | 80.687 | 0.770 | 24.026 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.261ms; driver.publication.readback 0.149ms; driver.publication.readback 0.128ms; driver.publication.readback 0.119ms; driver.publication.readback 0.091ms |
| fe798025e5e6911b0000000000001b7b | 96.587 | 60.199 | 1.392 | 4.942 | 0.000 | 0.544 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.509 | 66.533 | 0.689 | 29.509 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.263ms; driver.publication.readback 0.060ms; driver.publication.readback 0.058ms; driver.publication.readback 0.053ms; driver.publication.readback 0.052ms |
| fe798025e5e6911b0000000000000fb0 | 92.149 | 28.271 | 0.355 | 1.616 | 0.000 | 0.376 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 61.531 | 30.242 | 0.328 | 61.531 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.263ms; driver.reader-basis.broadcast 0.166ms; driver.publication.readback 0.071ms; driver.publication.readback 0.061ms; driver.publication.readback 0.060ms |
| fe798025e5e6911b0000000000000807 | 88.361 | 14.634 | 71.863 | 0.000 | 0.000 | 0.295 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.569 | 86.497 | 0.979 | 1.569 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.196ms; driver.publication.readback 0.126ms; driver.publication.readback 0.103ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.041ms |
| fe798025e5e6911b000000000000140e | 84.917 | 33.909 | 17.875 | 10.157 | 0.000 | 5.933 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.042 | 61.942 | 0.729 | 17.042 | node-14/thread-0/rpc.replica.observe | driver.reader-basis.broadcast 0.385ms; driver.publication.readback 0.100ms; driver.publication.readback 0.071ms; driver.publication.readback 0.069ms; driver.publication.readback 0.069ms |
| fe798025e5e6911b00000000000007fe | 83.166 | 18.959 | 27.422 | 0.000 | 0.000 | 0.257 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.528 | 46.381 | 0.558 | 36.528 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.196ms; driver.publication.readback 0.103ms; driver.publication.readback 0.060ms; driver.publication.readback 0.055ms; driver.publication.readback 0.055ms |
| fe798025e5e6911b0000000000000803 | 82.866 | 14.293 | 58.607 | 0.000 | 0.000 | 0.412 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.554 | 72.900 | 0.880 | 9.554 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.196ms; driver.publication.readback 0.126ms; driver.publication.readback 0.103ms; driver.publication.readback 0.055ms; driver.publication.readback 0.049ms |
| fe798025e5e6911b0000000000000d49 | 79.812 | 25.677 | 34.999 | 0.000 | 0.000 | 0.281 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.856 | 60.676 | 0.760 | 18.856 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.261ms; driver.publication.readback 0.149ms; driver.publication.readback 0.128ms; driver.publication.readback 0.119ms; driver.publication.readback 0.091ms |
| fe798025e5e6911b0000000000001c34 | 79.371 | 41.525 | 14.468 | 2.745 | 0.000 | 0.227 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.406 | 58.738 | 0.740 | 20.406 | node-14/thread-3/client.reach-decode-and-cache | driver.expected-state.bind-receipt 1.049ms; driver.reader-basis.broadcast 0.642ms; driver.publication.readback 0.107ms; driver.publication.readback 0.104ms; driver.publication.readback 0.104ms |
| fe798025e5e6911b00000000000007fb | 77.094 | 33.107 | 1.436 | 4.764 | 0.000 | 0.569 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.218 | 39.307 | 0.510 | 37.218 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.103ms; driver.publication.readback 0.065ms; driver.publication.readback 0.060ms; driver.publication.readback 0.055ms; driver.publication.readback 0.055ms |
| fe798025e5e6911b000000000000073a | 75.229 | 19.370 | 14.367 | 0.000 | 0.000 | 0.186 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.306 | 33.737 | 0.448 | 41.306 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.127ms; driver.publication.readback 0.072ms; driver.publication.readback 0.056ms; driver.publication.readback 0.054ms; driver.publication.readback 0.036ms |
| fe798025e5e6911b0000000000000d4a | 74.075 | 25.105 | 35.243 | 1.281 | 0.000 | 0.142 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.304 | 61.629 | 0.832 | 12.304 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.261ms; driver.publication.readback 0.149ms; driver.publication.readback 0.128ms; driver.publication.readback 0.119ms; driver.publication.readback 0.091ms |
| fe798025e5e6911b0000000000000739 | 73.600 | 12.877 | 21.056 | 0.000 | 0.000 | 0.183 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.485 | 33.933 | 0.461 | 39.485 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.127ms; driver.publication.readback 0.072ms; driver.publication.readback 0.061ms; driver.publication.readback 0.056ms; driver.publication.readback 0.054ms |
| fe798025e5e6911b0000000000000d47 | 72.765 | 21.061 | 3.007 | 0.985 | 0.000 | 0.129 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.582 | 25.053 | 0.344 | 47.582 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.149ms; driver.publication.readback 0.119ms; driver.publication.readback 0.050ms; driver.publication.readback 0.044ms; driver.publication.readback 0.031ms |
| fe798025e5e6911b0000000000001360 | 72.151 | 60.023 | 0.321 | 9.346 | 0.000 | 0.417 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.044 | 69.690 | 0.966 | 2.044 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.534ms; driver.publication.readback 0.147ms; driver.publication.readback 0.083ms; driver.publication.readback 0.069ms; driver.publication.readback 0.065ms |
| fe798025e5e6911b0000000000000bd1 | 70.294 | 42.905 | 0.411 | 6.431 | 0.000 | 0.794 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.753 | 49.747 | 0.708 | 19.753 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.078ms; driver.publication.readback 0.063ms; driver.publication.readback 0.039ms; driver.publication.readback 0.034ms; driver.publication.persist-deferred 0.014ms |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.473 | 0.251 | 0.000 | 0.507 | 3.845 | 0.381 | 0.000 | 0.164 | 1.219 | 3.527 | 0.031 | n/a | 0.333 | 10.298 | n/a | n/a | 0.027 | 4.276 | 0.203 | 0.027 |
| p99 | 64.865 | 4.717 | 0.000 | 4.482 | 7.197 | n/a | 3.116 | 1.096 | 5.371 | 41.832 | 0.626 | n/a | 3.184 | 18.689 | n/a | n/a | 0.079 | 10.066 | 0.354 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b0000000000000183 | 64.865 | 4.249 | 0.381 | 0.239 | 0.064 | 5.083 | 41.832 | 0.040 | n/a | 0.577 | 12.379 | n/a | n/a | 0.021 | 4.933 | 0.076 | 0.021 | gw-w/thread-41/gateway.admitted-work | driver.reader-basis.broadcast 0.020ms |
| fe798025e5e6911b000000000000018e | 42.035 | 3.510 | 0.246 | 0.000 | 0.149 | 1.347 | 24.182 | 0.042 | n/a | 3.184 | 9.325 | n/a | n/a | 0.051 | 3.905 | 0.093 | 0.051 | gw-w/thread-43/gateway.admitted-work | none observed |
| fe798025e5e6911b00000000000001c0 | 32.287 | 4.263 | 0.222 | 0.000 | 0.052 | 1.459 | 6.147 | 0.032 | n/a | 1.400 | 18.689 | n/a | n/a | 0.023 | 4.536 | 0.141 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001a2 | 31.042 | 4.541 | 0.279 | 0.261 | 0.051 | 1.763 | 14.147 | 0.097 | n/a | 0.282 | 9.602 | n/a | n/a | 0.019 | 5.132 | 0.165 | 0.019 | gw-w/thread-48/gateway.admitted-work | none observed |
| fe798025e5e6911b00000000000001bc | 30.690 | 4.156 | 0.318 | 0.471 | 0.045 | 1.520 | 14.616 | 0.077 | n/a | 0.149 | 9.316 | n/a | n/a | 0.022 | 4.990 | 0.163 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001b4 | 30.406 | 3.576 | 0.182 | 0.261 | 0.064 | 1.368 | 15.191 | 0.054 | n/a | 0.607 | 9.077 | n/a | n/a | 0.025 | 4.084 | 0.134 | 0.025 | gw-w/thread-46/gateway.admitted-work | none observed |
| fe798025e5e6911b0000000000000186 | 28.823 | 3.253 | 0.189 | 0.400 | 0.063 | 0.942 | 10.184 | 0.033 | n/a | 0.726 | 12.991 | n/a | n/a | 0.041 | 3.905 | 0.135 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000196 | 28.729 | 4.131 | 0.270 | 0.280 | 0.164 | 1.295 | 9.994 | 0.063 | n/a | 0.168 | 12.327 | n/a | n/a | 0.037 | 4.845 | 0.169 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000197 | 28.473 | 7.197 | n/a | 2.052 | 0.817 | 1.219 | 3.131 | 0.091 | n/a | 0.971 | 12.971 | n/a | n/a | 0.024 | 10.066 | 0.354 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| fe798025e5e6911b000000000000019c | 28.390 | 4.992 | 0.192 | 0.485 | 0.048 | 1.757 | 10.190 | 0.043 | n/a | 0.333 | 10.330 | n/a | n/a | 0.021 | 5.717 | 0.201 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000190 | 28.360 | 5.297 | 0.185 | 0.499 | 0.043 | 1.260 | 9.592 | 0.626 | n/a | 0.544 | 10.298 | n/a | n/a | 0.017 | 6.023 | 0.212 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000017f | 27.872 | 4.943 | 0.187 | 0.377 | 0.128 | 1.538 | 9.037 | 0.028 | n/a | 0.072 | 11.527 | n/a | n/a | 0.034 | 5.635 | 0.202 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000019a | 27.814 | 5.181 | 0.262 | 0.505 | 0.220 | 1.464 | 9.796 | 0.187 | n/a | 0.095 | 10.025 | n/a | n/a | 0.079 | 6.169 | 0.222 | 0.079 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001b2 | 27.148 | 5.529 | 0.302 | 0.207 | 0.155 | 1.325 | 5.821 | 0.029 | n/a | 0.063 | 13.666 | n/a | n/a | 0.052 | 6.193 | 0.228 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001b5 | 26.993 | 5.365 | n/a | 3.116 | 0.398 | 2.052 | 1.991 | 0.024 | n/a | 0.094 | 13.913 | n/a | n/a | 0.040 | 8.879 | 0.329 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001a0 | 25.814 | 3.403 | 0.267 | 0.243 | 0.115 | 1.118 | 8.398 | 0.026 | n/a | 0.121 | 12.071 | n/a | n/a | 0.051 | 4.028 | 0.156 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001c4 | 25.560 | 4.277 | 0.309 | 0.326 | 0.069 | 1.557 | 2.490 | 0.063 | n/a | 0.178 | 16.261 | n/a | n/a | 0.030 | 4.980 | 0.195 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000187 | 24.668 | 4.110 | n/a | 0.000 | 0.167 | 0.896 | 4.348 | 0.021 | n/a | 0.439 | 14.667 | n/a | n/a | 0.022 | 4.276 | 0.173 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| fe798025e5e6911b00000000000001b8 | 23.481 | 4.492 | 0.235 | 0.292 | 0.050 | 1.152 | 6.320 | 0.025 | n/a | 0.098 | 10.796 | n/a | n/a | 0.021 | 5.069 | 0.216 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001a4 | 23.473 | 3.883 | 0.162 | 0.227 | 0.045 | 1.596 | 8.503 | 0.073 | n/a | 0.206 | 8.759 | n/a | n/a | 0.019 | 4.317 | 0.184 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.251 | 0.343 | 0.000 | 0.507 | 2.283 | n/a | 0.000 | 0.646 | 0.853 | 1.481 | 0.023 | n/a | 0.409 | 9.323 | n/a | n/a | 0.027 | 3.094 | 0.203 | 0.027 |
| p99 | 22.020 | 1.988 | 0.000 | 0.932 | 3.251 | n/a | 0.000 | 0.996 | 4.001 | 1.879 | 0.056 | n/a | 2.325 | 15.854 | n/a | n/a | 0.042 | 3.740 | 0.321 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b00000000000001c5 | 22.020 | 3.093 | n/a | 0.000 | 0.646 | 0.905 | 1.119 | 0.021 | n/a | 0.354 | 15.854 | n/a | n/a | 0.027 | 3.740 | 0.170 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000018b | 21.944 | 1.812 | n/a | 0.000 | 0.898 | 0.853 | 1.852 | 0.056 | n/a | 0.876 | 15.578 | n/a | n/a | 0.019 | 2.710 | 0.123 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001bd | 20.612 | 2.041 | n/a | 0.000 | 0.224 | 4.001 | 1.588 | 0.043 | n/a | 0.111 | 12.577 | n/a | n/a | 0.027 | 2.265 | 0.110 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000180 | 16.603 | 3.102 | n/a | 0.000 | 0.583 | 0.940 | 1.245 | 0.020 | n/a | 0.409 | 10.263 | n/a | n/a | 0.042 | 3.684 | 0.222 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001af | 16.500 | 3.251 | n/a | 0.000 | 0.262 | 1.232 | 1.545 | 0.025 | n/a | 2.325 | 7.820 | n/a | n/a | 0.039 | 3.513 | 0.213 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000017c | 15.251 | 2.348 | n/a | 0.000 | 0.748 | 0.838 | 1.481 | 0.021 | n/a | 0.431 | 9.357 | n/a | n/a | 0.027 | 3.096 | 0.203 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001a5 | 15.210 | 2.419 | n/a | 0.000 | 0.204 | 0.734 | 1.879 | 0.024 | n/a | 0.640 | 9.279 | n/a | n/a | 0.030 | 2.623 | 0.172 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000191 | 14.706 | 2.283 | n/a | 0.000 | 0.811 | 0.805 | 1.042 | 0.020 | n/a | 0.392 | 9.323 | n/a | n/a | 0.029 | 3.094 | 0.210 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000193 | 13.353 | 1.981 | n/a | 0.000 | 0.733 | 0.830 | 1.819 | 0.052 | n/a | 0.792 | 7.125 | n/a | n/a | 0.020 | 2.715 | 0.203 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001c7 | 10.097 | 2.243 | n/a | 0.000 | 0.996 | 0.904 | 1.116 | 0.023 | n/a | 0.160 | 4.626 | n/a | n/a | 0.029 | 3.239 | 0.321 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.759 | 0.368 | 0.000 | 0.450 | 3.717 | n/a | 0.000 | 0.205 | 1.401 | 5.179 | 0.034 | n/a | 0.255 | 11.235 | n/a | n/a | 0.026 | 4.385 | 0.179 | 0.026 |
| p99 | 72.095 | 2.188 | 0.000 | 1.364 | 12.563 | n/a | 0.570 | 1.586 | 5.525 | 32.707 | 8.159 | n/a | 3.597 | 54.295 | n/a | n/a | 0.147 | 12.782 | 0.269 | 0.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b00000000000001d1 | 72.095 | 4.704 | n/a | 0.000 | 0.667 | 5.090 | 3.400 | 8.159 | n/a | 0.176 | 49.811 | n/a | n/a | 0.089 | 5.370 | 0.074 | 0.089 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.154ms; driver.reader-basis.broadcast 0.051ms; driver.publication.persist-deferred 0.019ms |
| fe798025e5e6911b00000000000001d2 | 59.653 | 3.929 | n/a | 0.000 | 1.586 | 4.566 | 2.716 | 0.065 | n/a | 3.597 | 43.178 | n/a | n/a | 0.016 | 5.515 | 0.092 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms |
| fe798025e5e6911b00000000000001cb | 59.079 | 1.843 | n/a | 0.000 | 0.422 | 0.715 | 1.223 | 0.022 | n/a | 0.533 | 54.295 | n/a | n/a | 0.026 | 2.265 | 0.038 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| fe798025e5e6911b00000000000001d6 | 57.658 | 3.717 | 0.181 | 0.000 | 0.038 | 0.771 | 32.707 | 0.026 | n/a | 1.140 | 19.051 | n/a | n/a | 0.026 | 3.937 | 0.068 | 0.026 | gw-w/thread-41/gateway.admitted-work | none observed |
| fe798025e5e6911b0000000000000212 | 51.100 | 4.796 | n/a | 0.000 | 0.538 | 4.056 | 1.509 | 0.021 | n/a | 0.095 | 40.063 | n/a | n/a | 0.023 | 5.334 | 0.104 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001ee | 47.573 | 12.563 | n/a | 0.000 | 0.220 | 2.952 | 19.802 | 0.119 | n/a | 0.760 | 11.127 | n/a | n/a | 0.031 | 12.782 | 0.269 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000218 | 40.680 | 3.910 | 0.185 | 0.416 | 0.066 | 5.525 | 15.897 | 0.038 | n/a | 0.146 | 14.466 | n/a | n/a | 0.031 | 4.577 | 0.113 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001f8 | 39.256 | 4.150 | 0.350 | 0.326 | 0.198 | 3.975 | 18.157 | 0.090 | n/a | 1.492 | 10.371 | n/a | n/a | 0.147 | 5.024 | 0.128 | 0.147 | gw-w/thread-45/gateway.admitted-work | none observed |
| fe798025e5e6911b000000000000020e | 36.398 | 3.684 | 0.218 | 0.228 | 0.113 | 1.131 | 12.842 | 0.073 | n/a | 2.444 | 15.624 | n/a | n/a | 0.042 | 4.243 | 0.117 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001dd | 35.895 | 6.116 | 0.257 | 0.000 | 0.035 | 2.158 | 11.676 | 0.027 | n/a | 0.354 | 15.254 | n/a | n/a | 0.017 | 6.408 | 0.179 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000021c | 34.217 | 3.434 | 0.173 | 0.264 | 0.063 | 2.750 | 8.420 | 0.026 | n/a | 0.080 | 18.980 | n/a | n/a | 0.025 | 3.934 | 0.115 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001da | 30.615 | 4.101 | n/a | 0.000 | 0.474 | 1.401 | 14.458 | 0.072 | n/a | 0.111 | 9.917 | n/a | n/a | 0.081 | 4.575 | 0.149 | 0.081 | gw-w/thread-43/commit.prepare-and-validate | none observed |
| fe798025e5e6911b0000000000000200 | 30.517 | 5.261 | 0.195 | 0.485 | 0.054 | 1.956 | 6.061 | 0.042 | n/a | 0.374 | 16.065 | n/a | n/a | 0.025 | 5.996 | 0.196 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000208 | 29.703 | 5.353 | 0.326 | 0.325 | 0.076 | 1.623 | 6.305 | 0.028 | n/a | 0.357 | 15.284 | n/a | n/a | 0.025 | 6.080 | 0.205 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000204 | 27.895 | 3.551 | 0.281 | 0.215 | 0.099 | 1.298 | 10.525 | 0.036 | n/a | 0.103 | 11.752 | n/a | n/a | 0.036 | 4.146 | 0.149 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000214 | 27.555 | 4.157 | 0.328 | 0.310 | 0.068 | 1.687 | 6.269 | 0.034 | n/a | 0.423 | 14.248 | n/a | n/a | 0.032 | 4.862 | 0.176 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001f0 | 26.686 | 3.730 | 0.142 | 0.557 | 0.044 | 1.575 | 11.864 | 0.063 | n/a | 0.497 | 8.193 | n/a | n/a | 0.020 | 4.474 | 0.168 | 0.020 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001f6 | 26.561 | 4.719 | 0.291 | 0.284 | 0.073 | 1.699 | 7.457 | 0.036 | n/a | 0.127 | 11.848 | n/a | n/a | 0.026 | 5.366 | 0.202 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001d0 | 26.380 | 4.110 | 0.191 | 0.294 | 0.033 | 1.074 | 3.037 | 0.062 | n/a | 0.139 | 17.421 | n/a | n/a | 0.019 | 4.628 | 0.175 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001e4 | 26.180 | 3.780 | n/a | 0.000 | 0.606 | 1.046 | 1.125 | 0.020 | n/a | 0.150 | 19.406 | n/a | n/a | 0.047 | 4.386 | 0.168 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.598 | 0.707 | 0.000 | 0.486 | 2.499 | n/a | 0.000 | 0.606 | 0.853 | 1.448 | 0.022 | n/a | 0.176 | 10.812 | n/a | n/a | 0.031 | 3.221 | 0.183 | 0.031 |
| p99 | 72.095 | 1.340 | 0.000 | 0.997 | 4.704 | n/a | 0.000 | 1.125 | 5.090 | 14.458 | 8.159 | n/a | 2.689 | 54.295 | n/a | n/a | 0.089 | 5.370 | 0.250 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b00000000000001d1 | 72.095 | 4.704 | n/a | 0.000 | 0.667 | 5.090 | 3.400 | 8.159 | n/a | 0.176 | 49.811 | n/a | n/a | 0.089 | 5.370 | 0.074 | 0.089 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.154ms; driver.reader-basis.broadcast 0.051ms; driver.publication.persist-deferred 0.019ms |
| fe798025e5e6911b00000000000001cb | 59.079 | 1.843 | n/a | 0.000 | 0.422 | 0.715 | 1.223 | 0.022 | n/a | 0.533 | 54.295 | n/a | n/a | 0.026 | 2.265 | 0.038 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| fe798025e5e6911b00000000000001da | 30.615 | 4.101 | n/a | 0.000 | 0.474 | 1.401 | 14.458 | 0.072 | n/a | 0.111 | 9.917 | n/a | n/a | 0.081 | 4.575 | 0.149 | 0.081 | gw-w/thread-43/commit.prepare-and-validate | none observed |
| fe798025e5e6911b00000000000001e4 | 26.180 | 3.780 | n/a | 0.000 | 0.606 | 1.046 | 1.125 | 0.020 | n/a | 0.150 | 19.406 | n/a | n/a | 0.047 | 4.386 | 0.168 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000210 | 21.784 | 2.882 | n/a | 0.000 | 0.693 | 0.833 | 2.007 | 0.020 | n/a | 0.367 | 14.942 | n/a | n/a | 0.039 | 3.575 | 0.164 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000202 | 19.057 | 2.499 | n/a | 0.000 | 0.352 | 0.853 | 1.147 | 0.020 | n/a | 0.128 | 14.035 | n/a | n/a | 0.023 | 2.851 | 0.150 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001cd | 17.683 | 2.783 | n/a | 0.000 | 1.125 | 0.883 | 1.332 | 0.021 | n/a | 0.378 | 11.138 | n/a | n/a | 0.024 | 3.908 | 0.221 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001f4 | 17.598 | 2.371 | n/a | 0.000 | 0.849 | 0.963 | 2.104 | 0.065 | n/a | 0.374 | 10.812 | n/a | n/a | 0.059 | 3.221 | 0.183 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001fe | 16.577 | 2.172 | n/a | 0.000 | 0.403 | 0.612 | 2.012 | 0.022 | n/a | 0.104 | 11.235 | n/a | n/a | 0.017 | 2.575 | 0.155 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001e8 | 15.726 | 2.063 | n/a | 0.000 | 0.975 | 1.254 | 1.448 | 0.027 | n/a | 0.124 | 9.811 | n/a | n/a | 0.024 | 3.038 | 0.193 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000206 | 14.621 | 2.855 | n/a | 0.000 | 0.477 | 0.702 | 1.305 | 0.019 | n/a | 0.402 | 8.827 | n/a | n/a | 0.034 | 3.332 | 0.228 | 0.034 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001e2 | 13.494 | 2.617 | n/a | 0.000 | 0.762 | 0.751 | 1.121 | 0.021 | n/a | 0.094 | 8.110 | n/a | n/a | 0.019 | 3.380 | 0.250 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000020a | 12.497 | 1.732 | n/a | 0.000 | 0.988 | 0.936 | 1.932 | 0.051 | n/a | 2.689 | 4.144 | n/a | n/a | 0.025 | 2.720 | 0.218 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000021a | 11.415 | 1.931 | n/a | 0.000 | 0.318 | 0.623 | 1.119 | 0.051 | n/a | 0.152 | 7.181 | n/a | n/a | 0.041 | 2.249 | 0.197 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000001e6 | 10.174 | 1.883 | n/a | 0.000 | 0.566 | 0.726 | 1.510 | 0.024 | n/a | 0.347 | 5.087 | n/a | n/a | 0.031 | 2.449 | 0.241 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.179 | 0.000 | 0.000 | 0.480 | 3.481 | n/a | 0.000 | 0.233 | 1.040 | 3.699 | 0.023 | n/a | 0.178 | 9.123 | n/a | n/a | 0.027 | 3.994 | 0.205 | 0.027 |
| p99 | 78.099 | 2.261 | 0.000 | 1.869 | 5.771 | n/a | 0.451 | 1.043 | 5.415 | 44.901 | 3.437 | n/a | 9.886 | 52.772 | n/a | n/a | 0.073 | 6.518 | 0.363 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b0000000000000230 | 78.099 | 5.771 | 0.186 | 0.375 | 0.065 | 1.641 | 44.901 | 0.056 | n/a | 0.119 | 24.953 | n/a | n/a | 0.032 | 6.397 | 0.082 | 0.032 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.037ms |
| fe798025e5e6911b0000000000000258 | 64.479 | 4.326 | n/a | 0.000 | 0.236 | 0.785 | 6.063 | 0.064 | n/a | 0.210 | 52.772 | n/a | n/a | 0.024 | 4.561 | 0.071 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| fe798025e5e6911b000000000000023c | 39.642 | 3.481 | 0.205 | 0.231 | 0.112 | 1.282 | 14.978 | 3.437 | n/a | 0.132 | 15.745 | n/a | n/a | 0.041 | 4.028 | 0.102 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000027f | 38.705 | 5.419 | 0.163 | 0.000 | 0.041 | 1.466 | 10.964 | 0.024 | n/a | 0.090 | 20.519 | n/a | n/a | 0.020 | 5.624 | 0.145 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000247 | 33.164 | 1.527 | n/a | 0.000 | 0.875 | 2.328 | 8.807 | 0.037 | n/a | 0.091 | 19.489 | n/a | n/a | 0.009 | 2.403 | 0.072 | 0.009 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.016ms |
| fe798025e5e6911b0000000000000240 | 31.873 | 4.673 | 0.275 | 0.413 | 0.061 | 1.662 | 9.025 | 0.025 | n/a | 0.113 | 15.596 | n/a | n/a | 0.031 | 5.422 | 0.170 | 0.031 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000026d | 29.107 | 3.633 | 0.437 | 0.000 | 0.151 | 1.747 | 8.848 | 0.046 | n/a | 0.158 | 14.042 | n/a | n/a | 0.046 | 4.220 | 0.145 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000246 | 28.525 | 2.800 | n/a | 0.000 | 0.222 | 1.368 | 2.621 | 0.048 | n/a | 9.886 | 11.547 | n/a | n/a | 0.033 | 3.022 | 0.106 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000229 | 26.781 | 3.634 | 0.207 | 0.451 | 0.134 | 1.182 | 6.874 | 0.024 | n/a | 0.444 | 13.789 | n/a | n/a | 0.041 | 4.427 | 0.165 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000275 | 26.639 | 3.811 | 0.157 | 0.000 | 0.055 | 2.152 | 8.142 | 0.037 | n/a | 0.565 | 11.699 | n/a | n/a | 0.022 | 4.022 | 0.151 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000024c | 24.499 | 4.222 | 0.253 | 0.253 | 0.046 | 1.190 | 5.084 | 0.020 | n/a | 0.407 | 13.003 | n/a | n/a | 0.021 | 4.774 | 0.195 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000251 | 24.257 | 5.309 | 0.278 | 0.253 | 0.034 | 5.415 | 5.104 | 0.023 | n/a | 0.162 | 7.660 | n/a | n/a | 0.018 | 5.875 | 0.242 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.017ms |
| fe798025e5e6911b000000000000027b | 23.764 | 5.007 | 0.302 | 0.000 | 0.057 | 1.887 | 9.416 | 0.031 | n/a | 0.195 | 6.845 | n/a | n/a | 0.024 | 5.366 | 0.226 | 0.024 | gw-w/thread-41/gateway.admitted-work | none observed |
| fe798025e5e6911b000000000000022e | 23.609 | 2.781 | n/a | 0.000 | 0.648 | 0.760 | 6.961 | 0.016 | n/a | 0.079 | 12.343 | n/a | n/a | 0.022 | 3.429 | 0.145 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| fe798025e5e6911b000000000000021f | 23.272 | 4.113 | 0.253 | 0.277 | 0.077 | 0.992 | 6.102 | 0.025 | n/a | 0.346 | 11.063 | n/a | n/a | 0.026 | 4.719 | 0.203 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000267 | 23.214 | 3.384 | 0.229 | 0.000 | 0.062 | 4.757 | 7.149 | 0.028 | n/a | 0.118 | 7.461 | n/a | n/a | 0.025 | 3.675 | 0.158 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000242 | 22.812 | 4.179 | 0.370 | 0.323 | 0.056 | 2.446 | 4.533 | 0.076 | n/a | 1.676 | 9.123 | n/a | n/a | 0.029 | 4.929 | 0.216 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000023a | 22.632 | 2.993 | n/a | 0.000 | 0.894 | 0.985 | 6.421 | 0.057 | n/a | 0.227 | 11.025 | n/a | n/a | 0.031 | 3.886 | 0.172 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| fe798025e5e6911b000000000000025a | 22.075 | 4.270 | 0.358 | 0.357 | 0.049 | 1.392 | 5.528 | 0.023 | n/a | 0.115 | 9.964 | n/a | n/a | 0.020 | 5.034 | 0.228 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000227 | 21.473 | 4.036 | n/a | 0.000 | 0.737 | 2.831 | 1.068 | 0.015 | n/a | 0.359 | 12.386 | n/a | n/a | 0.041 | 4.773 | 0.222 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.063 | 0.000 | 0.000 | 0.436 | 2.149 | n/a | 0.000 | 0.394 | 0.878 | 1.257 | 0.016 | n/a | 0.180 | 6.391 | n/a | n/a | 0.025 | 2.587 | 0.222 | 0.025 |
| p99 | 33.164 | 0.700 | 0.000 | 0.781 | 5.115 | n/a | 0.000 | 1.043 | 2.831 | 8.807 | 0.037 | n/a | 0.533 | 19.489 | n/a | n/a | 0.041 | 5.468 | 0.343 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b0000000000000247 | 33.164 | 1.527 | n/a | 0.000 | 0.875 | 2.328 | 8.807 | 0.037 | n/a | 0.091 | 19.489 | n/a | n/a | 0.009 | 2.403 | 0.072 | 0.009 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.016ms |
| fe798025e5e6911b0000000000000227 | 21.473 | 4.036 | n/a | 0.000 | 0.737 | 2.831 | 1.068 | 0.015 | n/a | 0.359 | 12.386 | n/a | n/a | 0.041 | 4.773 | 0.222 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000273 | 20.739 | 2.973 | n/a | 0.000 | 1.019 | 0.830 | 1.029 | 0.015 | n/a | 0.367 | 14.466 | n/a | n/a | 0.041 | 3.992 | 0.192 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.055ms |
| fe798025e5e6911b000000000000022c | 20.400 | 1.895 | n/a | 0.000 | 0.266 | 0.730 | 1.273 | 0.019 | n/a | 0.360 | 15.836 | n/a | n/a | 0.022 | 2.160 | 0.106 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000223 | 19.458 | 2.205 | n/a | 0.000 | 0.382 | 0.592 | 4.830 | 0.016 | n/a | 0.075 | 11.330 | n/a | n/a | 0.028 | 2.587 | 0.133 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000266 | 17.049 | 5.115 | n/a | 0.000 | 0.354 | 1.853 | 5.491 | 0.026 | n/a | 0.105 | 4.075 | n/a | n/a | 0.031 | 5.468 | 0.321 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000026b | 14.666 | 2.329 | n/a | 0.000 | 1.043 | 0.905 | 1.481 | 0.024 | n/a | 0.136 | 8.713 | n/a | n/a | 0.035 | 3.372 | 0.230 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000279 | 14.095 | 2.364 | n/a | 0.000 | 0.913 | 0.942 | 1.319 | 0.023 | n/a | 0.180 | 8.312 | n/a | n/a | 0.041 | 3.277 | 0.232 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000250 | 12.063 | 2.281 | n/a | 0.000 | 0.643 | 0.905 | 1.257 | 0.025 | n/a | 0.533 | 6.391 | n/a | n/a | 0.027 | 2.924 | 0.242 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000021e | 11.634 | 3.600 | n/a | 0.000 | 0.394 | 2.246 | 2.950 | 0.035 | n/a | 0.207 | 2.181 | n/a | n/a | 0.022 | 3.994 | 0.343 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000262 | 11.453 | 1.659 | n/a | 0.000 | 0.313 | 1.469 | 0.906 | 0.014 | n/a | 0.082 | 6.984 | n/a | n/a | 0.025 | 1.972 | 0.172 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000027d | 10.436 | 2.149 | n/a | 0.000 | 1.016 | 0.878 | 1.361 | 0.020 | n/a | 0.422 | 4.552 | n/a | n/a | 0.038 | 3.165 | 0.303 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000025b | 9.852 | 1.747 | n/a | 0.000 | 0.245 | 0.645 | 0.944 | 0.015 | n/a | 0.088 | 6.147 | n/a | n/a | 0.020 | 1.992 | 0.202 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000023e | 9.211 | 1.597 | n/a | 0.000 | 0.397 | 0.399 | 1.160 | 0.015 | n/a | 0.381 | 5.246 | n/a | n/a | 0.017 | 1.994 | 0.217 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000234 | 7.951 | 1.909 | n/a | 0.000 | 0.082 | 0.566 | 0.763 | 0.014 | n/a | 0.330 | 4.273 | n/a | n/a | 0.014 | 1.991 | 0.250 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000025e | 7.562 | 1.633 | n/a | 0.000 | 0.313 | 0.339 | 0.838 | 0.015 | n/a | 0.095 | 4.315 | n/a | n/a | 0.014 | 1.946 | 0.257 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.731 | 0.419 | 0.000 | 0.476 | 3.389 | n/a | 0.000 | 0.188 | 1.039 | 3.532 | 0.020 | n/a | 0.186 | 8.529 | n/a | n/a | 0.029 | 3.935 | 0.222 | 0.029 |
| p99 | 60.384 | 2.823 | 0.000 | 2.066 | 6.891 | n/a | 0.949 | 1.137 | 6.439 | 23.559 | 0.072 | n/a | 2.019 | 39.070 | n/a | n/a | 0.113 | 7.764 | 0.354 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b00000000000002a6 | 60.384 | 6.891 | 0.267 | 0.402 | 0.204 | 1.687 | 11.489 | 0.047 | n/a | 0.227 | 39.070 | n/a | n/a | 0.100 | 7.764 | 0.129 | 0.100 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000290 | 43.337 | 3.696 | 0.184 | 0.000 | 0.055 | 1.459 | 15.104 | 0.034 | n/a | 0.119 | 22.665 | n/a | n/a | 0.021 | 3.935 | 0.091 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000298 | 37.965 | 5.850 | 0.307 | 0.949 | 0.065 | 5.687 | 11.130 | 0.054 | n/a | 0.169 | 13.717 | n/a | n/a | 0.036 | 7.172 | 0.189 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000029e | 35.167 | 3.793 | 0.282 | 0.324 | 0.081 | 1.140 | 23.559 | 0.028 | n/a | 0.086 | 5.841 | n/a | n/a | 0.033 | 4.479 | 0.127 | 0.033 | gw-w/thread-47/commit.prepare-and-validate | none observed |
| fe798025e5e6911b00000000000002b6 | 32.094 | 4.076 | 0.154 | 0.468 | 0.049 | 1.688 | 10.895 | 0.029 | n/a | 0.425 | 14.288 | n/a | n/a | 0.021 | 4.747 | 0.148 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002b2 | 31.197 | 3.140 | 0.241 | 0.353 | 0.067 | 1.771 | 12.361 | 0.038 | n/a | 0.186 | 13.008 | n/a | n/a | 0.032 | 3.801 | 0.122 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002d3 | 30.825 | 3.445 | 0.182 | 0.378 | 0.073 | 1.649 | 12.025 | 0.041 | n/a | 0.206 | 12.791 | n/a | n/a | 0.035 | 4.078 | 0.132 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002aa | 28.895 | 3.922 | 0.299 | 0.338 | 0.052 | 1.762 | 13.148 | 0.023 | n/a | 0.094 | 9.233 | n/a | n/a | 0.024 | 4.610 | 0.160 | 0.024 | gw-w/thread-48/gateway.admitted-work | none observed |
| fe798025e5e6911b0000000000000296 | 28.180 | 3.761 | 0.201 | 0.000 | 0.067 | 1.452 | 6.315 | 0.028 | n/a | 1.143 | 15.184 | n/a | n/a | 0.028 | 4.030 | 0.143 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002cd | 28.073 | 3.396 | 0.165 | 0.322 | 0.061 | 2.163 | 7.358 | 0.046 | n/a | 0.308 | 14.221 | n/a | n/a | 0.033 | 3.944 | 0.140 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000285 | 26.217 | 5.399 | 0.172 | 0.000 | 0.062 | 2.116 | 7.383 | 0.035 | n/a | 0.142 | 10.879 | n/a | n/a | 0.029 | 5.633 | 0.215 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002ba | 26.136 | 4.757 | 0.158 | 0.532 | 0.048 | 2.013 | 8.752 | 0.044 | n/a | 0.248 | 9.562 | n/a | n/a | 0.022 | 5.495 | 0.210 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002ae | 25.240 | 3.223 | n/a | 0.000 | 0.519 | 0.791 | 1.246 | 0.018 | n/a | 0.102 | 19.312 | n/a | n/a | 0.029 | 3.742 | 0.148 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000287 | 25.118 | 2.686 | n/a | 0.000 | 1.042 | 1.532 | 3.532 | 0.051 | n/a | 0.766 | 15.475 | n/a | n/a | 0.033 | 3.729 | 0.148 | 0.033 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000289 | 23.909 | 3.354 | 0.231 | 0.000 | 0.043 | 0.993 | 7.866 | 0.044 | n/a | 0.608 | 10.751 | n/a | n/a | 0.019 | 3.628 | 0.152 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002be | 21.888 | 3.354 | 0.166 | 0.263 | 0.052 | 1.134 | 4.984 | 0.019 | n/a | 0.087 | 11.803 | n/a | n/a | 0.026 | 3.834 | 0.175 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002a2 | 21.698 | 3.184 | 0.168 | 0.293 | 0.052 | 1.022 | 8.557 | 0.020 | n/a | 0.646 | 7.728 | n/a | n/a | 0.027 | 3.697 | 0.170 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002ce | 19.900 | 5.531 | n/a | 0.000 | 0.663 | 0.899 | 2.723 | 0.034 | n/a | 0.163 | 9.868 | n/a | n/a | 0.019 | 6.194 | 0.311 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002a0 | 19.436 | 3.693 | n/a | 0.000 | 0.521 | 4.829 | 1.331 | 0.019 | n/a | 0.366 | 8.595 | n/a | n/a | 0.082 | 4.214 | 0.217 | 0.082 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002d1 | 19.389 | 3.890 | 0.401 | 0.332 | 0.079 | 2.090 | 4.278 | 0.072 | n/a | 0.321 | 7.889 | n/a | n/a | 0.038 | 4.702 | 0.243 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.570 | 0.595 | 0.000 | 0.489 | 3.053 | n/a | 0.000 | 0.521 | 0.861 | 1.284 | 0.018 | n/a | 0.163 | 6.848 | n/a | n/a | 0.044 | 3.555 | 0.270 | 0.044 |
| p99 | 19.436 | 2.003 | 0.000 | 0.850 | 4.415 | n/a | 0.000 | 1.137 | 6.439 | 4.852 | 0.020 | n/a | 2.019 | 9.502 | n/a | n/a | 0.113 | 5.552 | 0.329 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b00000000000002a0 | 19.436 | 3.693 | n/a | 0.000 | 0.521 | 4.829 | 1.331 | 0.019 | n/a | 0.366 | 8.595 | n/a | n/a | 0.082 | 4.214 | 0.217 | 0.082 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002b4 | 19.027 | 4.415 | n/a | 0.000 | 1.137 | 0.945 | 4.218 | 0.018 | n/a | 0.089 | 8.131 | n/a | n/a | 0.075 | 5.552 | 0.292 | 0.075 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002b8 | 16.576 | 4.300 | n/a | 0.000 | 0.455 | 1.497 | 1.550 | 0.020 | n/a | 0.114 | 8.529 | n/a | n/a | 0.113 | 4.755 | 0.287 | 0.113 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| fe798025e5e6911b00000000000002c0 | 15.137 | 3.214 | n/a | 0.000 | 0.648 | 0.687 | 0.922 | 0.016 | n/a | 0.103 | 9.502 | n/a | n/a | 0.043 | 3.863 | 0.255 | 0.043 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| fe798025e5e6911b00000000000002ca | 14.881 | 3.022 | n/a | 0.000 | 0.474 | 6.439 | 4.852 | 0.015 | n/a | 0.042 | 0.000 | n/a | n/a | 0.037 | 3.496 | 0.235 | 0.037 | node-14/thread-0/socket.wait-first-byte | none observed |
| fe798025e5e6911b0000000000000292 | 14.268 | 2.097 | n/a | 0.000 | 0.643 | 0.628 | 1.369 | 0.015 | n/a | 0.332 | 9.156 | n/a | n/a | 0.028 | 2.740 | 0.192 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002c6 | 13.940 | 3.385 | n/a | 0.000 | 0.443 | 0.861 | 1.064 | 0.019 | n/a | 0.163 | 7.957 | n/a | n/a | 0.049 | 3.828 | 0.275 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002bb | 13.570 | 2.212 | n/a | 0.000 | 1.056 | 0.681 | 0.964 | 0.015 | n/a | 0.466 | 8.155 | n/a | n/a | 0.020 | 3.268 | 0.241 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002ac | 13.550 | 3.326 | n/a | 0.000 | 0.970 | 0.987 | 1.224 | 0.020 | n/a | 0.122 | 6.822 | n/a | n/a | 0.079 | 4.296 | 0.317 | 0.079 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000280 | 13.496 | 3.053 | n/a | 0.000 | 0.157 | 0.598 | 1.396 | 0.015 | n/a | 1.385 | 6.848 | n/a | n/a | 0.044 | 3.210 | 0.238 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000283 | 12.891 | 4.048 | n/a | 0.000 | 0.194 | 1.093 | 1.533 | 0.018 | n/a | 0.158 | 5.776 | n/a | n/a | 0.071 | 4.242 | 0.329 | 0.071 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002a4 | 11.508 | 3.034 | n/a | 0.000 | 0.521 | 0.689 | 1.070 | 0.018 | n/a | 0.385 | 5.739 | n/a | n/a | 0.053 | 3.555 | 0.309 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000029a | 9.688 | 1.908 | n/a | 0.000 | 0.729 | 1.088 | 1.089 | 0.016 | n/a | 2.019 | 2.819 | n/a | n/a | 0.021 | 2.636 | 0.272 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b000000000000029c | 8.947 | 1.833 | n/a | 0.000 | 0.243 | 0.551 | 1.284 | 0.018 | n/a | 0.144 | 4.847 | n/a | n/a | 0.026 | 2.076 | 0.232 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b00000000000002c4 | 6.482 | 1.562 | n/a | 0.000 | 0.188 | 0.565 | 0.900 | 0.014 | n/a | 0.295 | 2.944 | n/a | n/a | 0.013 | 1.750 | 0.270 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (846 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.395 | 0.405 | 0.000 | 0.519 | 2.266 | n/a | 0.000 | 0.673 | 0.650 | 1.071 | 0.014 | n/a | 0.119 | 6.242 | n/a | n/a | 0.017 | 3.117 | 0.256 | 0.017 |
| p99 | 42.095 | 2.210 | 0.043 | 2.260 | 6.852 | n/a | 0.276 | 12.004 | 7.566 | 10.391 | 0.064 | n/a | 3.451 | 35.049 | n/a | n/a | 0.052 | 14.290 | 0.580 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b0000000000000352 | 58.370 | 1.697 | n/a | 0.000 | 0.938 | 1.345 | 0.640 | 0.008 | n/a | 0.153 | 53.572 | n/a | n/a | 0.017 | 2.635 | 0.045 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.344ms; driver.publication.readback 0.074ms; driver.reader-basis.broadcast 0.049ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms |
| fe798025e5e6911b0000000000000353 | 55.430 | 3.127 | n/a | 0.000 | 0.188 | 4.584 | 1.190 | 0.016 | n/a | 0.097 | 46.217 | n/a | n/a | 0.011 | 3.315 | 0.060 | 0.011 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.344ms; driver.publication.readback 0.074ms; driver.reader-basis.broadcast 0.049ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms |
| fe798025e5e6911b000000000000037c | 55.220 | 4.896 | 0.135 | 0.232 | 0.014 | 3.990 | 6.673 | 0.034 | n/a | 0.428 | 38.805 | n/a | n/a | 0.013 | 5.277 | 0.096 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.097ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.016ms |
| fe798025e5e6911b0000000000000354 | 46.881 | 1.755 | n/a | 0.000 | 0.081 | 1.306 | 1.045 | 0.018 | n/a | 2.926 | 39.733 | n/a | n/a | 0.018 | 1.836 | 0.039 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.344ms; driver.publication.readback 0.074ms; driver.publication.readback 0.048ms; driver.publication.readback 0.036ms; driver.publication.persist-deferred 0.017ms |
| fe798025e5e6911b0000000000000355 | 46.426 | 2.029 | n/a | 0.000 | 0.795 | 2.146 | 0.948 | 0.014 | n/a | 0.879 | 39.602 | n/a | n/a | 0.012 | 2.824 | 0.061 | 0.012 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.344ms; driver.publication.readback 0.074ms; driver.publication.readback 0.048ms; driver.publication.readback 0.036ms; driver.publication.persist-deferred 0.025ms |
| fe798025e5e6911b0000000000000351 | 45.529 | 1.981 | n/a | 0.000 | 1.116 | 0.413 | 0.541 | 0.007 | n/a | 0.171 | 41.288 | n/a | n/a | 0.013 | 3.098 | 0.068 | 0.013 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.074ms; driver.reader-basis.broadcast 0.049ms; driver.publication.persist-deferred 0.017ms |
| fe798025e5e6911b0000000000000443 | 45.295 | 1.379 | n/a | 0.000 | 2.846 | 3.867 | 0.626 | 0.007 | n/a | 0.024 | 36.536 | n/a | n/a | 0.010 | 4.225 | 0.093 | 0.010 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.008ms; driver.publication.readback 0.132ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.068ms; driver.publication.readback 0.057ms |
| fe798025e5e6911b0000000000000969 | 42.687 | 4.046 | n/a | 0.000 | 9.463 | 0.445 | 1.433 | 0.003 | n/a | 0.029 | 27.243 | n/a | n/a | 0.024 | 13.509 | 0.316 | 0.024 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.108ms; driver.publication.readback 0.107ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.031ms; driver.publication.persist-deferred 0.023ms |
| fe798025e5e6911b00000000000003a2 | 42.095 | 3.149 | n/a | 0.000 | 0.868 | 2.132 | 1.562 | 0.037 | n/a | 0.698 | 33.613 | n/a | n/a | 0.037 | 4.017 | 0.095 | 0.037 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.098ms; driver.publication.persist-deferred 0.020ms |
| fe798025e5e6911b000000000000096e | 41.448 | 6.629 | n/a | 0.000 | 0.483 | 8.894 | 5.554 | 1.675 | n/a | 0.521 | 17.673 | n/a | n/a | 0.019 | 7.111 | 0.172 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.076ms; driver.publication.readback 0.054ms; driver.publication.readback 0.047ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.016ms |
| fe798025e5e6911b00000000000004d1 | 41.419 | 4.018 | n/a | 0.000 | 0.563 | 0.514 | 2.953 | 0.013 | n/a | 0.256 | 33.087 | n/a | n/a | 0.017 | 4.581 | 0.111 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.100ms; driver.publication.persist-deferred 0.017ms |
| fe798025e5e6911b000000000000037e | 41.199 | 2.224 | n/a | 0.000 | 0.726 | 0.581 | 0.941 | 0.011 | n/a | 0.312 | 36.390 | n/a | n/a | 0.015 | 2.949 | 0.072 | 0.015 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000357 | 41.090 | 2.044 | n/a | 0.000 | 0.865 | 0.871 | 3.302 | 0.036 | n/a | 0.335 | 33.618 | n/a | n/a | 0.018 | 2.909 | 0.071 | 0.018 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.344ms; driver.publication.readback 0.048ms; driver.publication.readback 0.048ms; driver.publication.readback 0.044ms; driver.publication.readback 0.036ms |
| fe798025e5e6911b0000000000000365 | 40.800 | 2.993 | n/a | 0.000 | 22.612 | 0.631 | 1.926 | 0.042 | n/a | 0.124 | 12.449 | n/a | n/a | 0.023 | 25.606 | 0.628 | 0.023 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.643ms; driver.publication.readback 0.309ms; driver.publication.readback 0.207ms; driver.reader-basis.broadcast 0.086ms; driver.publication.readback 0.077ms |
| fe798025e5e6911b0000000000000370 | 40.634 | 1.098 | n/a | 0.000 | 14.009 | 1.010 | 0.902 | 0.036 | n/a | 2.632 | 20.935 | n/a | n/a | 0.013 | 15.107 | 0.372 | 0.013 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.068ms; driver.publication.readback 0.058ms; driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.018ms |
| fe798025e5e6911b000000000000054f | 40.219 | 9.641 | n/a | 0.000 | 0.539 | 7.165 | 6.930 | 0.064 | n/a | 0.237 | 15.621 | n/a | n/a | 0.022 | 10.179 | 0.253 | 0.022 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.014ms |
| fe798025e5e6911b0000000000000824 | 40.173 | 1.497 | n/a | 0.000 | 23.044 | 4.057 | 0.556 | 0.005 | n/a | 0.018 | 10.984 | n/a | n/a | 0.012 | 24.541 | 0.611 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.784ms; driver.publication.persist-deferred 0.186ms; driver.publication.readback 0.055ms; driver.publication.readback 0.054ms; driver.publication.readback 0.046ms |
| fe798025e5e6911b000000000000064c | 39.924 | 1.666 | n/a | 0.000 | 0.406 | 0.859 | 0.848 | 0.010 | n/a | 1.071 | 35.049 | n/a | n/a | 0.016 | 2.072 | 0.052 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.135ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms |
| fe798025e5e6911b000000000000082a | 39.466 | 5.896 | n/a | 1.844 | 2.895 | 7.566 | 2.235 | 0.030 | n/a | 0.102 | 18.869 | n/a | n/a | 0.028 | 10.635 | 0.269 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.784ms; driver.publication.persist-deferred 0.186ms; driver.publication.readback 0.115ms; driver.publication.readback 0.114ms; driver.publication.readback 0.055ms |
| fe798025e5e6911b000000000000075a | 39.308 | 1.949 | n/a | 0.000 | 2.410 | 0.320 | 0.682 | 0.008 | n/a | 0.057 | 33.871 | n/a | n/a | 0.011 | 4.359 | 0.111 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.118ms; driver.publication.readback 0.111ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.020ms |

## P2 / L1024 / commit / 5-10 facts (491 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.037 | 0.000 | 0.000 | 0.410 | 1.877 | n/a | 0.000 | 0.692 | 0.648 | 0.896 | 0.013 | n/a | 0.111 | 5.550 | n/a | n/a | 0.017 | 2.663 | 0.250 | 0.017 |
| p99 | 42.095 | 1.999 | 0.031 | 0.919 | 4.750 | n/a | 0.000 | 12.004 | 9.676 | 8.101 | 0.071 | n/a | 2.926 | 35.049 | n/a | n/a | 0.059 | 13.735 | 0.611 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b0000000000000352 | 58.370 | 1.697 | n/a | 0.000 | 0.938 | 1.345 | 0.640 | 0.008 | n/a | 0.153 | 53.572 | n/a | n/a | 0.017 | 2.635 | 0.045 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.344ms; driver.publication.readback 0.074ms; driver.reader-basis.broadcast 0.049ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms |
| fe798025e5e6911b0000000000000354 | 46.881 | 1.755 | n/a | 0.000 | 0.081 | 1.306 | 1.045 | 0.018 | n/a | 2.926 | 39.733 | n/a | n/a | 0.018 | 1.836 | 0.039 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.344ms; driver.publication.readback 0.074ms; driver.publication.readback 0.048ms; driver.publication.readback 0.036ms; driver.publication.persist-deferred 0.017ms |
| fe798025e5e6911b0000000000000351 | 45.529 | 1.981 | n/a | 0.000 | 1.116 | 0.413 | 0.541 | 0.007 | n/a | 0.171 | 41.288 | n/a | n/a | 0.013 | 3.098 | 0.068 | 0.013 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.074ms; driver.reader-basis.broadcast 0.049ms; driver.publication.persist-deferred 0.017ms |
| fe798025e5e6911b0000000000000443 | 45.295 | 1.379 | n/a | 0.000 | 2.846 | 3.867 | 0.626 | 0.007 | n/a | 0.024 | 36.536 | n/a | n/a | 0.010 | 4.225 | 0.093 | 0.010 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.008ms; driver.publication.readback 0.132ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.068ms; driver.publication.readback 0.057ms |
| fe798025e5e6911b00000000000003a2 | 42.095 | 3.149 | n/a | 0.000 | 0.868 | 2.132 | 1.562 | 0.037 | n/a | 0.698 | 33.613 | n/a | n/a | 0.037 | 4.017 | 0.095 | 0.037 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.098ms; driver.publication.persist-deferred 0.020ms |
| fe798025e5e6911b0000000000000357 | 41.090 | 2.044 | n/a | 0.000 | 0.865 | 0.871 | 3.302 | 0.036 | n/a | 0.335 | 33.618 | n/a | n/a | 0.018 | 2.909 | 0.071 | 0.018 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.344ms; driver.publication.readback 0.048ms; driver.publication.readback 0.048ms; driver.publication.readback 0.044ms; driver.publication.readback 0.036ms |
| fe798025e5e6911b0000000000000370 | 40.634 | 1.098 | n/a | 0.000 | 14.009 | 1.010 | 0.902 | 0.036 | n/a | 2.632 | 20.935 | n/a | n/a | 0.013 | 15.107 | 0.372 | 0.013 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.068ms; driver.publication.readback 0.058ms; driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.018ms |
| fe798025e5e6911b0000000000000824 | 40.173 | 1.497 | n/a | 0.000 | 23.044 | 4.057 | 0.556 | 0.005 | n/a | 0.018 | 10.984 | n/a | n/a | 0.012 | 24.541 | 0.611 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.784ms; driver.publication.persist-deferred 0.186ms; driver.publication.readback 0.055ms; driver.publication.readback 0.054ms; driver.publication.readback 0.046ms |
| fe798025e5e6911b000000000000064c | 39.924 | 1.666 | n/a | 0.000 | 0.406 | 0.859 | 0.848 | 0.010 | n/a | 1.071 | 35.049 | n/a | n/a | 0.016 | 2.072 | 0.052 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.135ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms |
| fe798025e5e6911b000000000000075a | 39.308 | 1.949 | n/a | 0.000 | 2.410 | 0.320 | 0.682 | 0.008 | n/a | 0.057 | 33.871 | n/a | n/a | 0.011 | 4.359 | 0.111 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.118ms; driver.publication.readback 0.111ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.020ms |
| fe798025e5e6911b000000000000035c | 39.154 | 1.953 | n/a | 0.000 | 0.531 | 4.395 | 2.024 | 0.007 | n/a | 0.029 | 30.202 | n/a | n/a | 0.013 | 2.484 | 0.063 | 0.013 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.049ms; driver.publication.readback 0.048ms; driver.publication.readback 0.044ms; driver.publication.readback 0.043ms; driver.publication.readback 0.036ms |
| fe798025e5e6911b0000000000000359 | 34.178 | 2.039 | n/a | 0.000 | 0.383 | 0.729 | 1.500 | 0.055 | n/a | 0.708 | 28.739 | n/a | n/a | 0.026 | 2.422 | 0.071 | 0.026 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.048ms; driver.publication.readback 0.048ms; driver.publication.readback 0.044ms; driver.publication.readback 0.043ms; driver.publication.readback 0.036ms |
| fe798025e5e6911b00000000000003ea | 33.946 | 5.385 | n/a | 0.000 | 0.973 | 9.676 | 10.703 | 0.061 | n/a | 0.426 | 6.706 | n/a | n/a | 0.017 | 6.358 | 0.187 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.102ms; driver.publication.persist-deferred 0.028ms |
| fe798025e5e6911b0000000000000350 | 33.133 | 2.296 | n/a | 0.000 | 0.221 | 0.638 | 1.002 | 0.016 | n/a | 0.298 | 28.635 | n/a | n/a | 0.028 | 2.517 | 0.076 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.049ms |
| fe798025e5e6911b000000000000096c | 32.839 | 1.454 | n/a | 0.000 | 4.321 | 0.277 | 0.465 | 0.012 | n/a | 0.354 | 25.942 | n/a | n/a | 0.014 | 5.774 | 0.176 | 0.014 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.023ms |
| fe798025e5e6911b00000000000002dd | 32.619 | 5.948 | n/a | 0.000 | 0.276 | 1.764 | 13.317 | 0.570 | n/a | 0.285 | 10.434 | n/a | n/a | 0.025 | 6.224 | 0.191 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| fe798025e5e6911b0000000000000410 | 32.317 | 2.057 | n/a | 0.000 | 8.381 | 16.782 | 1.084 | 0.020 | n/a | 0.072 | 3.906 | n/a | n/a | 0.014 | 10.438 | 0.323 | 0.014 | node-14/thread-0/socket.wait-first-byte | client.encode 3.498ms; driver.expected-state.bind-receipt 1.288ms; driver.publication.readback 0.123ms; driver.reader-basis.broadcast 0.107ms; driver.publication.readback 0.077ms |
| fe798025e5e6911b000000000000040e | 31.523 | 3.886 | n/a | 0.000 | 16.206 | 2.849 | 0.880 | 0.016 | n/a | 0.310 | 7.352 | n/a | n/a | 0.024 | 20.092 | 0.637 | 0.024 | node-14/thread-0/driver.queue.subject | client.encode 3.498ms; driver.expected-state.bind-receipt 1.288ms; driver.reader-basis.broadcast 0.107ms; driver.publication.readback 0.077ms; driver.publication.readback 0.061ms |
| fe798025e5e6911b00000000000004d2 | 31.339 | 1.448 | n/a | 0.000 | 1.194 | 0.336 | 0.640 | 0.016 | n/a | 0.446 | 27.252 | n/a | n/a | 0.008 | 2.642 | 0.084 | 0.008 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000372 | 30.934 | 2.141 | n/a | 0.000 | 0.755 | 2.488 | 4.210 | 0.062 | n/a | 0.999 | 20.246 | n/a | n/a | 0.033 | 2.896 | 0.094 | 0.033 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.020ms |

## P2 / tail / commit (2622 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.206 | 0.148 | 0.000 | 0.491 | 2.211 | n/a | 0.000 | 0.624 | 0.546 | 0.926 | 0.013 | n/a | 0.089 | 4.665 | n/a | n/a | 0.012 | 2.965 | 0.301 | 0.012 |
| p99 | 36.298 | 2.059 | 0.039 | 1.949 | 6.617 | n/a | 0.219 | 11.330 | 6.531 | 6.087 | 0.046 | n/a | 2.190 | 26.563 | n/a | n/a | 0.038 | 14.091 | 0.690 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b0000000000000d39 | 55.749 | 2.583 | n/a | 0.000 | 0.489 | 0.392 | 0.928 | 0.010 | n/a | 0.309 | 51.030 | n/a | n/a | 0.008 | 3.072 | 0.055 | 0.008 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.164ms; driver.publication.readback 0.103ms |
| fe798025e5e6911b0000000000000d3a | 53.543 | 2.008 | n/a | 0.000 | 2.125 | 1.294 | 1.198 | 0.019 | n/a | 0.546 | 46.339 | n/a | n/a | 0.015 | 4.133 | 0.077 | 0.015 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.164ms; driver.publication.readback 0.103ms; driver.publication.persist-deferred 0.015ms |
| fe798025e5e6911b00000000000011d8 | 47.988 | 1.529 | n/a | 0.000 | 0.453 | 0.388 | 1.611 | 0.005 | n/a | 0.162 | 43.831 | n/a | n/a | 0.010 | 1.982 | 0.041 | 0.010 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.214ms; driver.publication.persist-deferred 0.015ms |
| fe798025e5e6911b0000000000001c2c | 46.740 | 1.153 | n/a | 0.000 | 39.342 | 2.174 | 0.788 | 0.046 | n/a | 0.320 | 2.907 | n/a | n/a | 0.010 | 40.495 | 0.866 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.124ms; driver.publication.readback 0.108ms; driver.publication.persist-deferred 0.074ms; driver.publication.readback 0.052ms; driver.publication.readback 0.048ms |
| fe798025e5e6911b00000000000011d9 | 45.252 | 1.125 | n/a | 0.000 | 0.432 | 0.246 | 0.574 | 0.014 | n/a | 0.261 | 42.594 | n/a | n/a | 0.005 | 1.557 | 0.034 | 0.005 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.214ms |
| fe798025e5e6911b0000000000000d3b | 44.752 | 1.336 | n/a | 0.000 | 0.100 | 1.538 | 0.724 | 0.012 | n/a | 0.253 | 40.780 | n/a | n/a | 0.009 | 1.437 | 0.032 | 0.009 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.164ms; driver.publication.persist-deferred 0.015ms |
| fe798025e5e6911b0000000000001dcf | 44.652 | 5.221 | 0.190 | 0.532 | 0.046 | 1.491 | 6.529 | 0.024 | n/a | 0.084 | 30.520 | n/a | n/a | 0.014 | 5.990 | 0.134 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000001a19 | 44.044 | 6.082 | n/a | 0.000 | 0.344 | 1.368 | 1.153 | 0.012 | n/a | 0.334 | 34.732 | n/a | n/a | 0.019 | 6.426 | 0.146 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| fe798025e5e6911b0000000000000a8a | 43.206 | 2.322 | n/a | 0.000 | 0.781 | 1.476 | 1.592 | 0.023 | n/a | 0.141 | 36.862 | n/a | n/a | 0.011 | 3.103 | 0.072 | 0.011 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.106ms; driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.015ms |
| fe798025e5e6911b0000000000001551 | 42.868 | 2.486 | n/a | 0.000 | 36.343 | 0.507 | 0.545 | 0.008 | n/a | 0.190 | 2.772 | n/a | n/a | 0.017 | 38.829 | 0.906 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.145ms; driver.publication.readback 0.073ms; driver.publication.readback 0.056ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.042ms |
| fe798025e5e6911b0000000000000979 | 42.372 | 4.711 | n/a | 0.000 | 0.708 | 0.466 | 1.303 | 0.011 | n/a | 0.797 | 34.369 | n/a | n/a | 0.006 | 5.419 | 0.128 | 0.006 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.132ms; driver.publication.persist-deferred 0.017ms |
| fe798025e5e6911b0000000000000d3c | 41.313 | 3.421 | n/a | 0.000 | 0.815 | 2.766 | 0.791 | 0.010 | n/a | 0.245 | 33.248 | n/a | n/a | 0.016 | 4.236 | 0.103 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.164ms; driver.publication.persist-deferred 0.015ms |
| fe798025e5e6911b00000000000012b6 | 41.243 | 1.530 | n/a | 0.000 | 0.497 | 22.240 | 1.018 | 0.017 | n/a | 0.051 | 15.882 | n/a | n/a | 0.009 | 2.027 | 0.049 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.063ms; driver.publication.readback 0.097ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.026ms |
| fe798025e5e6911b0000000000000ec6 | 41.025 | 1.983 | n/a | 0.000 | 29.513 | 0.326 | 0.804 | 0.010 | n/a | 0.059 | 8.317 | n/a | n/a | 0.011 | 31.497 | 0.768 | 0.011 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.174ms; driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.017ms |
| fe798025e5e6911b00000000000018ad | 40.776 | 1.930 | n/a | 0.000 | 0.918 | 3.772 | 0.748 | 0.011 | n/a | 0.021 | 33.373 | n/a | n/a | 0.003 | 2.848 | 0.070 | 0.003 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.262ms; driver.publication.readback 0.059ms; driver.publication.readback 0.028ms; driver.publication.readback 0.026ms; driver.publication.persist-deferred 0.016ms |
| fe798025e5e6911b0000000000001c2b | 39.864 | 3.405 | n/a | 0.000 | 2.424 | 0.383 | 21.124 | 0.026 | n/a | 0.042 | 12.445 | n/a | n/a | 0.016 | 5.829 | 0.146 | 0.016 | gw-w/thread-64/commit.prepare-and-validate | driver.publication.readback 0.108ms; driver.publication.persist-deferred 0.074ms; driver.publication.readback 0.052ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.016ms |
| fe798025e5e6911b000000000000170d | 39.845 | 1.829 | n/a | 0.000 | 1.605 | 2.004 | 0.588 | 0.004 | n/a | 0.081 | 33.729 | n/a | n/a | 0.006 | 3.434 | 0.086 | 0.006 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.240ms; driver.publication.persist-deferred 0.058ms |
| fe798025e5e6911b00000000000012b7 | 39.837 | 1.031 | n/a | 0.000 | 0.492 | 21.927 | 0.422 | 0.005 | n/a | 0.319 | 15.636 | n/a | n/a | 0.005 | 1.523 | 0.038 | 0.005 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.063ms; driver.publication.readback 0.097ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.026ms |
| fe798025e5e6911b000000000000170c | 39.219 | 3.711 | n/a | 0.000 | 0.787 | 0.444 | 1.121 | 0.010 | n/a | 0.076 | 33.054 | n/a | n/a | 0.016 | 4.498 | 0.115 | 0.016 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.240ms |
| fe798025e5e6911b00000000000018ab | 38.412 | 2.552 | n/a | 0.000 | 0.892 | 1.900 | 1.384 | 0.020 | n/a | 0.060 | 31.589 | n/a | n/a | 0.013 | 3.444 | 0.090 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.262ms; driver.publication.persist-deferred 0.016ms |

## P2 / tail / commit / 5-10 facts (1557 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.932 | 0.000 | 0.000 | 0.387 | 1.710 | n/a | 0.000 | 0.639 | 0.532 | 0.781 | 0.012 | n/a | 0.089 | 4.170 | n/a | n/a | 0.012 | 2.463 | 0.285 | 0.012 |
| p99 | 34.284 | 1.988 | 0.033 | 0.905 | 5.184 | n/a | 0.000 | 11.436 | 6.531 | 3.677 | 0.044 | n/a | 1.941 | 21.207 | n/a | n/a | 0.039 | 13.935 | 0.696 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe798025e5e6911b0000000000000d3a | 53.543 | 2.008 | n/a | 0.000 | 2.125 | 1.294 | 1.198 | 0.019 | n/a | 0.546 | 46.339 | n/a | n/a | 0.015 | 4.133 | 0.077 | 0.015 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.164ms; driver.publication.readback 0.103ms; driver.publication.persist-deferred 0.015ms |
| fe798025e5e6911b00000000000011d8 | 47.988 | 1.529 | n/a | 0.000 | 0.453 | 0.388 | 1.611 | 0.005 | n/a | 0.162 | 43.831 | n/a | n/a | 0.010 | 1.982 | 0.041 | 0.010 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.214ms; driver.publication.persist-deferred 0.015ms |
| fe798025e5e6911b0000000000001c2c | 46.740 | 1.153 | n/a | 0.000 | 39.342 | 2.174 | 0.788 | 0.046 | n/a | 0.320 | 2.907 | n/a | n/a | 0.010 | 40.495 | 0.866 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.124ms; driver.publication.readback 0.108ms; driver.publication.persist-deferred 0.074ms; driver.publication.readback 0.052ms; driver.publication.readback 0.048ms |
| fe798025e5e6911b00000000000011d9 | 45.252 | 1.125 | n/a | 0.000 | 0.432 | 0.246 | 0.574 | 0.014 | n/a | 0.261 | 42.594 | n/a | n/a | 0.005 | 1.557 | 0.034 | 0.005 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.214ms |
| fe798025e5e6911b0000000000000d3b | 44.752 | 1.336 | n/a | 0.000 | 0.100 | 1.538 | 0.724 | 0.012 | n/a | 0.253 | 40.780 | n/a | n/a | 0.009 | 1.437 | 0.032 | 0.009 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.164ms; driver.publication.persist-deferred 0.015ms |
| fe798025e5e6911b0000000000001551 | 42.868 | 2.486 | n/a | 0.000 | 36.343 | 0.507 | 0.545 | 0.008 | n/a | 0.190 | 2.772 | n/a | n/a | 0.017 | 38.829 | 0.906 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.145ms; driver.publication.readback 0.073ms; driver.publication.readback 0.056ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.042ms |
| fe798025e5e6911b00000000000012b6 | 41.243 | 1.530 | n/a | 0.000 | 0.497 | 22.240 | 1.018 | 0.017 | n/a | 0.051 | 15.882 | n/a | n/a | 0.009 | 2.027 | 0.049 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.063ms; driver.publication.readback 0.097ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.026ms |
| fe798025e5e6911b00000000000018ad | 40.776 | 1.930 | n/a | 0.000 | 0.918 | 3.772 | 0.748 | 0.011 | n/a | 0.021 | 33.373 | n/a | n/a | 0.003 | 2.848 | 0.070 | 0.003 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.262ms; driver.publication.readback 0.059ms; driver.publication.readback 0.028ms; driver.publication.readback 0.026ms; driver.publication.persist-deferred 0.016ms |
| fe798025e5e6911b000000000000170d | 39.845 | 1.829 | n/a | 0.000 | 1.605 | 2.004 | 0.588 | 0.004 | n/a | 0.081 | 33.729 | n/a | n/a | 0.006 | 3.434 | 0.086 | 0.006 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.240ms; driver.publication.persist-deferred 0.058ms |
| fe798025e5e6911b00000000000012b7 | 39.837 | 1.031 | n/a | 0.000 | 0.492 | 21.927 | 0.422 | 0.005 | n/a | 0.319 | 15.636 | n/a | n/a | 0.005 | 1.523 | 0.038 | 0.005 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.063ms; driver.publication.readback 0.097ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.026ms |
| fe798025e5e6911b000000000000097a | 37.479 | 1.075 | n/a | 0.000 | 0.714 | 1.476 | 0.386 | 0.004 | n/a | 0.026 | 33.789 | n/a | n/a | 0.007 | 1.790 | 0.048 | 0.007 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.132ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms |
| fe798025e5e6911b00000000000018bb | 36.949 | 2.938 | n/a | 0.000 | 0.300 | 1.680 | 0.643 | 0.010 | n/a | 0.045 | 31.309 | n/a | n/a | 0.025 | 3.238 | 0.088 | 0.025 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.302ms |
| fe798025e5e6911b0000000000000d3d | 36.479 | 1.320 | n/a | 0.000 | 29.507 | 0.313 | 0.729 | 0.011 | n/a | 0.081 | 4.510 | n/a | n/a | 0.007 | 30.827 | 0.845 | 0.007 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.164ms; driver.publication.readback 0.101ms; driver.publication.readback 0.031ms; driver.publication.readback 0.023ms; driver.publication.readback 0.019ms |
| fe798025e5e6911b0000000000001c2e | 36.182 | 1.645 | n/a | 0.000 | 0.415 | 16.527 | 0.497 | 0.005 | n/a | 0.015 | 17.074 | n/a | n/a | 0.005 | 2.060 | 0.057 | 0.005 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.124ms; driver.publication.readback 0.052ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.016ms |
| fe798025e5e6911b0000000000000aef | 35.218 | 1.824 | n/a | 0.000 | 22.680 | 0.413 | 0.854 | 0.012 | n/a | 0.330 | 9.094 | n/a | n/a | 0.010 | 24.505 | 0.696 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.127ms; driver.publication.readback 0.103ms; driver.publication.readback 0.058ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.021ms |
| fe798025e5e6911b0000000000001039 | 34.284 | 2.711 | n/a | 0.000 | 0.955 | 0.343 | 0.662 | 0.006 | n/a | 0.354 | 29.238 | n/a | n/a | 0.015 | 3.666 | 0.107 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.348ms; driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.016ms |
| fe798025e5e6911b000000000000152f | 33.791 | 1.948 | n/a | 0.000 | 0.510 | 2.919 | 1.025 | 0.012 | n/a | 0.056 | 27.302 | n/a | n/a | 0.018 | 2.458 | 0.073 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.248ms |
| fe798025e5e6911b00000000000011c5 | 33.232 | 1.108 | n/a | 0.000 | 26.480 | 1.012 | 0.601 | 0.032 | n/a | 0.400 | 3.590 | n/a | n/a | 0.009 | 27.589 | 0.830 | 0.009 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.446ms; driver.publication.readback 0.123ms; driver.publication.readback 0.120ms; driver.publication.readback 0.047ms; driver.publication.readback 0.041ms |
| fe798025e5e6911b0000000000001c2d | 32.960 | 1.442 | n/a | 0.000 | 0.371 | 18.296 | 0.521 | 0.005 | n/a | 0.014 | 12.298 | n/a | n/a | 0.012 | 1.813 | 0.055 | 0.012 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.016ms |
| fe798025e5e6911b00000000000018cb | 32.628 | 1.626 | n/a | 0.000 | 0.424 | 0.456 | 0.974 | 0.013 | n/a | 0.845 | 28.270 | n/a | n/a | 0.020 | 2.050 | 0.063 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.018ms |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.298 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.985 | 200.482 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.293 | 0.000 | 0.000 | 0.293 |
| p99 | 408.465 | n/a | n/a | n/a | 21.497 | n/a | 1.103 | 0.000 | 12.373 | 390.918 | 0.109 | n/a | 10.212 | 0.000 | n/a | n/a | 33.860 | 21.497 | 0.334 | 33.860 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c52349efe20c5940000000000000002 | 408.465 | 2.443 | n/a | 0.000 | 0.000 | 4.489 | 390.918 | 0.109 | n/a | 10.212 | 0.000 | n/a | n/a | 0.293 | 2.443 | 0.006 | 0.293 | gw-r/thread-44/gateway.admitted-work | none observed |
| 821bc75ab68f66930000000000000f2d | 207.688 | 0.000 | n/a | 0.000 | 0.000 | 3.451 | 204.074 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f66930000000000000005 | 205.723 | 0.000 | n/a | 0.000 | 0.000 | 3.985 | 201.274 | 0.014 | n/a | 0.122 | 0.000 | n/a | n/a | 0.327 | 0.000 | 0.000 | 0.327 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f66930000000000000006 | 202.732 | 0.000 | n/a | 0.000 | 0.000 | 0.955 | 201.431 | 0.014 | n/a | 0.122 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f66930000000000000f2c | 201.298 | 0.000 | n/a | 0.000 | 0.000 | 0.641 | 200.482 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000f2b | 200.949 | 0.000 | n/a | 0.000 | 0.000 | 0.501 | 200.341 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f66930000000000000f31 | 66.698 | 21.497 | n/a | 0.000 | 0.000 | 11.341 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.860 | 21.497 | 0.322 | 33.860 | node-14/thread-5/socket.wait-first-byte | none observed |
| 821bc75ab68f66930000000000000f32 | 57.011 | 19.024 | n/a | 0.000 | 0.000 | 12.373 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.614 | 19.024 | 0.334 | 25.614 | node-14/thread-5/socket.wait-first-byte | none observed |
| 821bc75ab68f66930000000000000f30 | 54.627 | 16.311 | n/a | 1.103 | 0.000 | 10.088 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.125 | 17.414 | 0.319 | 27.125 | node-14/thread-5/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 809.948 | n/a | n/a | n/a | 3.046 | n/a | 0.000 | 0.000 | 0.648 | 792.137 | 0.014 | n/a | 0.189 | 0.000 | n/a | n/a | 1.237 | 3.046 | 0.021 | 1.237 |
| p99 | 1005.485 | n/a | n/a | n/a | 16.701 | n/a | 0.000 | 0.000 | 1.801 | 1001.852 | 0.015 | n/a | 0.406 | 0.000 | n/a | n/a | 2.245 | 16.701 | 0.548 | 2.245 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c52349efe20c59400000000000000a4 | 1005.485 | 0.175 | n/a | 0.000 | 0.000 | 1.801 | 1001.852 | 0.015 | n/a | 0.406 | 0.000 | n/a | n/a | 1.237 | 0.175 | 0.000 | 1.237 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c59400000000000000a5 | 809.948 | 16.701 | n/a | 0.000 | 0.000 | 0.648 | 792.137 | 0.014 | n/a | 0.189 | 0.000 | n/a | n/a | 0.259 | 16.701 | 0.021 | 0.259 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c594000000000000083f | 5.561 | 3.046 | n/a | 0.000 | 0.000 | 0.271 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.245 | 3.046 | 0.548 | 2.245 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / internal (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 405.703 | n/a | n/a | n/a | 2.617 | n/a | 0.000 | 0.000 | 0.787 | 402.113 | 0.013 | n/a | 0.077 | 0.000 | n/a | n/a | 0.126 | 2.617 | 0.006 | 0.126 |
| p99 | 1004.493 | n/a | n/a | n/a | 6.208 | n/a | 0.000 | 0.000 | 5.420 | 1001.597 | 0.115 | n/a | 0.211 | 0.000 | n/a | n/a | 32.770 | 6.208 | 0.318 | 32.770 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c52349efe20c59400000000000000ae | 1004.493 | 0.216 | n/a | 0.000 | 0.000 | 1.408 | 1001.597 | 0.014 | n/a | 0.157 | 0.000 | n/a | n/a | 1.102 | 0.216 | 0.000 | 1.102 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c59400000000000000d1 | 1004.143 | 0.110 | n/a | 0.000 | 0.000 | 2.391 | 1001.485 | 0.014 | n/a | 0.093 | 0.000 | n/a | n/a | 0.050 | 0.110 | 0.000 | 0.050 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c59400000000000000bc | 1003.922 | 0.203 | n/a | 0.000 | 0.000 | 0.942 | 1001.296 | 0.041 | n/a | 0.211 | 0.000 | n/a | n/a | 1.229 | 0.203 | 0.000 | 1.229 | gw-r/thread-47/journal/page | none observed |
| 7c52349efe20c59400000000000000bb | 994.553 | 2.776 | n/a | 0.000 | 0.000 | 0.513 | 991.071 | 0.010 | n/a | 0.099 | 0.000 | n/a | n/a | 0.084 | 2.776 | 0.003 | 0.084 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c59400000000000000b5 | 981.797 | 5.625 | n/a | 0.000 | 0.000 | 2.097 | 973.609 | 0.052 | n/a | 0.168 | 0.000 | n/a | n/a | 0.246 | 5.625 | 0.006 | 0.246 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c59400000000000000ab | 891.257 | 3.893 | n/a | 0.000 | 0.000 | 0.919 | 886.100 | 0.021 | n/a | 0.117 | 0.000 | n/a | n/a | 0.207 | 3.893 | 0.004 | 0.207 | gw-r/thread-45/journal/page | none observed |
| 7c52349efe20c59400000000000000c3 | 813.763 | 5.760 | n/a | 0.000 | 0.000 | 1.987 | 805.797 | 0.048 | n/a | 0.059 | 0.000 | n/a | n/a | 0.112 | 5.760 | 0.007 | 0.112 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c59400000000000000a8 | 809.946 | 2.186 | n/a | 0.000 | 0.000 | 1.247 | 806.327 | 0.012 | n/a | 0.077 | 0.000 | n/a | n/a | 0.096 | 2.186 | 0.003 | 0.096 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c59400000000000000cc | 687.989 | 4.437 | n/a | 0.000 | 0.000 | 0.940 | 682.409 | 0.011 | n/a | 0.045 | 0.000 | n/a | n/a | 0.147 | 4.437 | 0.006 | 0.147 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c59400000000000000b4 | 646.371 | 5.875 | n/a | 0.000 | 0.000 | 0.656 | 639.458 | 0.115 | n/a | 0.068 | 0.000 | n/a | n/a | 0.199 | 5.875 | 0.009 | 0.199 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c59400000000000000cb | 581.339 | 2.936 | n/a | 0.000 | 0.000 | 0.846 | 577.320 | 0.013 | n/a | 0.068 | 0.000 | n/a | n/a | 0.156 | 2.936 | 0.005 | 0.156 | gw-r/thread-45/journal/page | none observed |
| 7c52349efe20c59400000000000000c2 | 559.836 | 2.432 | n/a | 0.000 | 0.000 | 0.994 | 556.268 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.075 | 2.432 | 0.004 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 7c52349efe20c59400000000000000c8 | 544.059 | 2.293 | n/a | 0.000 | 0.000 | 0.787 | 540.799 | 0.014 | n/a | 0.095 | 0.000 | n/a | n/a | 0.071 | 2.293 | 0.004 | 0.071 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c59400000000000000c6 | 461.526 | 1.722 | n/a | 0.000 | 0.000 | 0.483 | 459.136 | 0.025 | n/a | 0.094 | 0.000 | n/a | n/a | 0.065 | 1.722 | 0.004 | 0.065 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c59400000000000000b7 | 438.902 | 2.617 | n/a | 0.000 | 0.000 | 0.739 | 435.396 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.074 | 2.617 | 0.006 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c59400000000000000c9 | 405.703 | 2.571 | n/a | 0.000 | 0.000 | 0.787 | 402.113 | 0.054 | n/a | 0.101 | 0.000 | n/a | n/a | 0.077 | 2.571 | 0.006 | 0.077 | gw-r/thread-47/journal/page | none observed |
| 7c52349efe20c59400000000000000a6 | 390.434 | 2.494 | n/a | 0.000 | 0.000 | 0.591 | 386.988 | 0.021 | n/a | 0.150 | 0.000 | n/a | n/a | 0.190 | 2.494 | 0.006 | 0.190 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c59400000000000000b1 | 327.606 | 6.208 | n/a | 0.000 | 0.000 | 0.832 | 320.267 | 0.011 | n/a | 0.109 | 0.000 | n/a | n/a | 0.179 | 6.208 | 0.019 | 0.179 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c59400000000000000b9 | 313.295 | 2.924 | n/a | 0.000 | 0.000 | 5.420 | 304.077 | 0.014 | n/a | 0.101 | 0.000 | n/a | n/a | 0.760 | 2.924 | 0.009 | 0.760 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c59400000000000000cd | 273.483 | 3.720 | n/a | 0.000 | 0.000 | 0.613 | 268.880 | 0.025 | n/a | 0.118 | 0.000 | n/a | n/a | 0.126 | 3.720 | 0.014 | 0.126 | gw-r/thread-42/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 382.857 | n/a | n/a | n/a | 3.985 | n/a | 0.478 | 0.000 | 0.678 | 379.267 | 0.011 | n/a | 0.068 | 0.000 | n/a | n/a | 0.108 | 4.463 | 0.011 | 0.108 |
| p99 | 1014.354 | n/a | n/a | n/a | 12.108 | n/a | 1.356 | 0.000 | 8.113 | 1009.926 | 0.225 | n/a | 1.540 | 0.000 | n/a | n/a | 41.449 | 12.696 | 0.688 | 41.449 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c52349efe20c59400000000000000e0 | 1014.354 | 3.064 | n/a | 0.485 | 0.000 | 0.694 | 1009.926 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.102 | 3.549 | 0.003 | 0.102 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c59400000000000000e1 | 1013.973 | 5.765 | n/a | 0.536 | 0.000 | 0.396 | 1007.026 | 0.031 | n/a | 0.090 | 0.000 | n/a | n/a | 0.129 | 6.302 | 0.006 | 0.129 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c59400000000000000d4 | 1002.930 | 0.126 | n/a | 0.000 | 0.000 | 0.595 | 1000.992 | 0.013 | n/a | 0.103 | 0.000 | n/a | n/a | 1.101 | 0.126 | 0.000 | 1.101 | gw-r/thread-47/journal/page | none observed |
| 7c52349efe20c5940000000000000100 | 1000.223 | 2.609 | n/a | 0.603 | 0.000 | 0.575 | 996.241 | 0.011 | n/a | 0.076 | 0.000 | n/a | n/a | 0.108 | 3.212 | 0.003 | 0.108 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c5940000000000000102 | 998.418 | 2.751 | n/a | 0.000 | 0.000 | 0.541 | 994.978 | 0.008 | n/a | 0.074 | 0.000 | n/a | n/a | 0.066 | 2.751 | 0.003 | 0.066 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c59400000000000000d3 | 994.743 | 10.391 | n/a | 1.356 | 0.000 | 1.435 | 981.299 | 0.026 | n/a | 0.102 | 0.000 | n/a | n/a | 0.135 | 11.747 | 0.012 | 0.135 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c5940000000000000107 | 993.891 | 2.531 | n/a | 0.536 | 0.000 | 6.062 | 984.564 | 0.009 | n/a | 0.100 | 0.000 | n/a | n/a | 0.090 | 3.067 | 0.003 | 0.090 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c59400000000000000dc | 992.438 | 10.368 | n/a | 0.582 | 0.000 | 0.531 | 980.710 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.176 | 10.950 | 0.011 | 0.176 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c59400000000000000db | 989.313 | 3.081 | n/a | 0.459 | 0.000 | 3.263 | 982.328 | 0.019 | n/a | 0.084 | 0.000 | n/a | n/a | 0.079 | 3.540 | 0.004 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c594000000000000010f | 951.378 | 5.970 | n/a | 0.000 | 0.000 | 0.865 | 944.271 | 0.011 | n/a | 0.089 | 0.000 | n/a | n/a | 0.172 | 5.970 | 0.006 | 0.172 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c5940000000000000104 | 816.837 | 5.514 | n/a | 0.755 | 0.000 | 1.124 | 809.157 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.213 | 6.269 | 0.008 | 0.213 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c59400000000000000e2 | 808.923 | 4.578 | n/a | 0.454 | 0.000 | 0.891 | 802.794 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.094 | 5.032 | 0.006 | 0.094 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c59400000000000000e6 | 775.486 | 4.386 | n/a | 0.740 | 0.000 | 0.645 | 769.535 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 0.092 | 5.126 | 0.007 | 0.092 | gw-r/thread-47/journal/page | none observed |
| 7c52349efe20c59400000000000000ed | 667.551 | 2.748 | n/a | 0.581 | 0.000 | 8.113 | 655.922 | 0.019 | n/a | 0.096 | 0.000 | n/a | n/a | 0.072 | 3.329 | 0.005 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c59400000000000000dd | 624.971 | 5.768 | n/a | 0.818 | 0.000 | 0.974 | 617.210 | 0.011 | n/a | 0.068 | 0.000 | n/a | n/a | 0.123 | 6.586 | 0.011 | 0.123 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c59400000000000000fd | 620.333 | 4.730 | n/a | 0.000 | 0.000 | 0.906 | 614.567 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.075 | 4.730 | 0.008 | 0.075 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c59400000000000000ea | 584.524 | 3.995 | n/a | 0.728 | 0.000 | 3.185 | 574.941 | 0.022 | n/a | 1.540 | 0.000 | n/a | n/a | 0.113 | 4.723 | 0.008 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c5940000000000000109 | 463.162 | 12.108 | n/a | 0.588 | 0.000 | 1.016 | 449.244 | 0.007 | n/a | 0.077 | 0.000 | n/a | n/a | 0.121 | 12.696 | 0.027 | 0.121 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c59400000000000000d8 | 448.943 | 3.893 | n/a | 0.824 | 0.000 | 0.664 | 443.380 | 0.011 | n/a | 0.051 | 0.000 | n/a | n/a | 0.118 | 4.718 | 0.011 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c59400000000000000e8 | 430.829 | 4.309 | n/a | 0.717 | 0.000 | 0.602 | 425.093 | 0.008 | n/a | 0.023 | 0.000 | n/a | n/a | 0.077 | 5.026 | 0.012 | 0.077 | gw-r/thread-42/journal/page | none observed |

## P3 / L4 / internal (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 405.433 | n/a | n/a | n/a | 2.981 | n/a | 0.000 | 0.000 | 0.732 | 401.376 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.081 | 3.106 | 0.008 | 0.081 |
| p99 | 1008.932 | n/a | n/a | n/a | 10.185 | n/a | 0.913 | 0.000 | 4.804 | 1005.657 | 0.026 | n/a | 0.279 | 0.000 | n/a | n/a | 43.611 | 10.185 | 0.138 | 43.611 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c52349efe20c5940000000000000138 | 1008.932 | 2.470 | n/a | 0.000 | 0.000 | 0.642 | 1005.657 | 0.011 | n/a | 0.093 | 0.000 | n/a | n/a | 0.059 | 2.470 | 0.002 | 0.059 | gw-r/thread-47/journal/page | none observed |
| 7c52349efe20c594000000000000012b | 1004.512 | 2.587 | n/a | 0.000 | 0.000 | 0.629 | 1001.173 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.071 | 2.587 | 0.003 | 0.071 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c5940000000000000127 | 1003.793 | 2.886 | n/a | 0.000 | 0.000 | 0.526 | 1000.029 | 0.006 | n/a | 0.279 | 0.000 | n/a | n/a | 0.066 | 2.886 | 0.003 | 0.066 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c594000000000000012c | 990.064 | 3.244 | n/a | 0.000 | 0.000 | 1.284 | 985.379 | 0.017 | n/a | 0.066 | 0.000 | n/a | n/a | 0.073 | 3.244 | 0.003 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 7c52349efe20c594000000000000011e | 987.720 | 2.574 | n/a | 0.596 | 0.000 | 0.427 | 983.943 | 0.009 | n/a | 0.088 | 0.000 | n/a | n/a | 0.083 | 3.170 | 0.003 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 7c52349efe20c5940000000000000116 | 965.556 | 2.699 | n/a | 0.557 | 0.000 | 1.054 | 961.065 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 0.102 | 3.257 | 0.003 | 0.102 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c5940000000000000141 | 929.331 | 3.094 | n/a | 0.000 | 0.000 | 1.096 | 924.995 | 0.017 | n/a | 0.048 | 0.000 | n/a | n/a | 0.081 | 3.094 | 0.003 | 0.081 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c5940000000000000113 | 869.845 | 3.211 | n/a | 0.913 | 0.000 | 0.770 | 864.761 | 0.016 | n/a | 0.083 | 0.000 | n/a | n/a | 0.089 | 4.125 | 0.005 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c5940000000000000128 | 773.645 | 5.345 | n/a | 0.583 | 0.000 | 0.788 | 766.725 | 0.026 | n/a | 0.051 | 0.000 | n/a | n/a | 0.129 | 5.927 | 0.008 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c594000000000000011f | 769.179 | 2.525 | n/a | 0.000 | 0.000 | 0.657 | 765.862 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.073 | 2.525 | 0.003 | 0.073 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c5940000000000000148 | 718.029 | 2.387 | n/a | 0.557 | 0.000 | 4.071 | 710.852 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.101 | 2.944 | 0.004 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 7c52349efe20c5940000000000000135 | 716.532 | 2.344 | n/a | 0.000 | 0.000 | 2.585 | 711.492 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.066 | 2.344 | 0.003 | 0.066 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c594000000000000013d | 711.538 | 2.981 | n/a | 0.000 | 0.000 | 0.573 | 707.833 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 0.072 | 2.981 | 0.004 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 7c52349efe20c5940000000000000110 | 706.953 | 3.295 | n/a | 0.586 | 0.000 | 0.732 | 702.206 | 0.009 | n/a | 0.018 | 0.000 | n/a | n/a | 0.107 | 3.881 | 0.005 | 0.107 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c5940000000000000134 | 671.334 | 2.506 | n/a | 0.000 | 0.000 | 2.542 | 666.165 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.071 | 2.506 | 0.004 | 0.071 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c5940000000000000125 | 646.360 | 2.839 | n/a | 0.000 | 0.000 | 0.558 | 642.815 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.064 | 2.839 | 0.004 | 0.064 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c5940000000000000142 | 646.303 | 4.051 | n/a | 0.781 | 0.000 | 0.581 | 640.710 | 0.013 | n/a | 0.050 | 0.000 | n/a | n/a | 0.118 | 4.832 | 0.007 | 0.118 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c594000000000000012e | 610.717 | 3.106 | n/a | 0.000 | 0.000 | 4.804 | 602.694 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.066 | 3.106 | 0.005 | 0.066 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c5940000000000000139 | 584.917 | 7.627 | n/a | 0.585 | 0.000 | 0.656 | 575.865 | 0.006 | n/a | 0.074 | 0.000 | n/a | n/a | 0.103 | 8.213 | 0.014 | 0.103 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c594000000000000013a | 405.433 | 3.228 | n/a | 0.000 | 0.000 | 0.691 | 401.376 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.073 | 3.228 | 0.008 | 0.073 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 419.353 | n/a | n/a | n/a | 2.368 | n/a | 0.000 | 0.000 | 0.545 | 416.440 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.074 | 2.376 | 0.008 | 0.074 |
| p99 | 1003.482 | n/a | n/a | n/a | 7.629 | n/a | 0.869 | 0.000 | 4.139 | 1001.742 | 0.581 | n/a | 0.078 | 0.000 | n/a | n/a | 28.419 | 7.629 | 0.481 | 28.419 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c52349efe20c5940000000000000186 | 1003.482 | 0.096 | n/a | 0.000 | 0.000 | 0.517 | 1001.742 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 1.063 | 0.096 | 0.000 | 1.063 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c594000000000000016d | 1003.365 | 0.131 | n/a | 0.000 | 0.000 | 1.028 | 1001.027 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 1.104 | 0.131 | 0.000 | 1.104 | gw-r/thread-45/journal/page | none observed |
| 7c52349efe20c594000000000000017e | 1002.517 | 0.114 | n/a | 0.000 | 0.000 | 0.320 | 1000.901 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 1.108 | 0.114 | 0.000 | 1.108 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c5940000000000000185 | 1002.276 | 2.670 | n/a | 0.000 | 0.000 | 0.494 | 999.012 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.054 | 2.670 | 0.003 | 0.054 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c5940000000000000164 | 995.958 | 2.611 | n/a | 0.000 | 0.000 | 0.432 | 992.796 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.075 | 2.611 | 0.003 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c5940000000000000154 | 965.774 | 2.816 | n/a | 0.000 | 0.000 | 0.527 | 962.280 | 0.012 | n/a | 0.059 | 0.000 | n/a | n/a | 0.080 | 2.816 | 0.003 | 0.080 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c5940000000000000173 | 943.015 | 3.119 | n/a | 0.000 | 0.000 | 0.454 | 939.338 | 0.003 | n/a | 0.041 | 0.000 | n/a | n/a | 0.060 | 3.119 | 0.003 | 0.060 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c5940000000000000159 | 823.841 | 5.600 | n/a | 0.000 | 0.000 | 0.677 | 816.803 | 0.581 | n/a | 0.053 | 0.000 | n/a | n/a | 0.126 | 5.600 | 0.007 | 0.126 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c5940000000000000155 | 779.675 | 2.004 | n/a | 0.000 | 0.000 | 0.533 | 777.021 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.073 | 2.004 | 0.003 | 0.073 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c5940000000000000179 | 776.661 | 5.406 | n/a | 0.000 | 0.000 | 0.632 | 770.394 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 0.155 | 5.406 | 0.007 | 0.155 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c594000000000000014f | 669.462 | 6.225 | n/a | 0.595 | 0.000 | 2.028 | 660.440 | 0.015 | n/a | 0.058 | 0.000 | n/a | n/a | 0.103 | 6.820 | 0.010 | 0.103 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c594000000000000016c | 608.645 | 2.300 | n/a | 0.000 | 0.000 | 0.442 | 605.800 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.062 | 2.300 | 0.004 | 0.062 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c5940000000000000183 | 580.637 | 2.287 | n/a | 0.000 | 0.000 | 0.684 | 577.563 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.064 | 2.287 | 0.004 | 0.064 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c5940000000000000189 | 577.308 | 2.297 | n/a | 0.607 | 0.000 | 0.601 | 573.613 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.135 | 2.904 | 0.005 | 0.135 | gw-r/thread-45/journal/page | none observed |
| 7c52349efe20c5940000000000000176 | 576.899 | 2.257 | n/a | 0.000 | 0.000 | 0.651 | 573.890 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.056 | 2.257 | 0.004 | 0.056 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c5940000000000000165 | 573.935 | 7.629 | n/a | 0.000 | 0.000 | 2.469 | 563.703 | 0.017 | n/a | 0.043 | 0.000 | n/a | n/a | 0.074 | 7.629 | 0.013 | 0.074 | gw-r/thread-45/journal/page | none observed |
| 7c52349efe20c594000000000000017c | 560.774 | 2.289 | n/a | 0.000 | 0.000 | 0.532 | 557.788 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.101 | 2.289 | 0.004 | 0.101 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c5940000000000000170 | 557.063 | 2.376 | n/a | 0.000 | 0.000 | 0.495 | 554.088 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.059 | 2.376 | 0.004 | 0.059 | gw-r/thread-45/journal/page | none observed |
| 7c52349efe20c594000000000000014a | 444.247 | 1.925 | n/a | 0.000 | 0.000 | 1.178 | 440.993 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 0.064 | 1.925 | 0.004 | 0.064 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c5940000000000000166 | 432.322 | 4.372 | n/a | 0.000 | 0.000 | 0.567 | 427.153 | 0.015 | n/a | 0.059 | 0.000 | n/a | n/a | 0.156 | 4.372 | 0.010 | 0.156 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / internal (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 356.503 | n/a | n/a | n/a | 2.783 | n/a | 0.000 | 0.000 | 0.459 | 349.555 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.067 | 2.783 | 0.010 | 0.067 |
| p99 | 1003.008 | n/a | n/a | n/a | 9.113 | n/a | 0.000 | 0.000 | 3.798 | 1001.054 | 6.691 | n/a | 0.779 | 0.000 | n/a | n/a | 28.114 | 9.113 | 0.647 | 28.114 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c52349efe20c59400000000000001c3 | 1003.008 | 0.173 | n/a | 0.000 | 0.000 | 0.596 | 1001.054 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 1.137 | 0.173 | 0.000 | 1.137 | gw-r/thread-47/journal/page | none observed |
| 7c52349efe20c59400000000000001a7 | 996.269 | 2.562 | n/a | 0.000 | 0.000 | 0.372 | 993.227 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.075 | 2.562 | 0.003 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 7c52349efe20c59400000000000001a6 | 991.939 | 2.271 | n/a | 0.000 | 0.000 | 0.495 | 989.077 | 0.003 | n/a | 0.030 | 0.000 | n/a | n/a | 0.064 | 2.271 | 0.002 | 0.064 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c594000000000000018b | 987.017 | 2.801 | n/a | 0.000 | 0.000 | 0.333 | 983.786 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.057 | 2.801 | 0.003 | 0.057 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c59400000000000001c5 | 985.629 | 3.149 | n/a | 0.000 | 0.000 | 0.627 | 981.757 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.065 | 3.149 | 0.003 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c594000000000000019a | 939.892 | 2.865 | n/a | 0.000 | 0.000 | 0.636 | 936.273 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.064 | 2.865 | 0.003 | 0.064 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c59400000000000001a4 | 916.580 | 3.253 | n/a | 0.000 | 0.000 | 3.798 | 909.341 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.119 | 3.253 | 0.004 | 0.119 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c594000000000000019d | 843.216 | 3.314 | n/a | 0.000 | 0.000 | 0.396 | 839.378 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.060 | 3.314 | 0.004 | 0.060 | gw-r/thread-47/journal/page | none observed |
| 7c52349efe20c59400000000000001d5 | 769.015 | 1.537 | n/a | 0.000 | 0.000 | 0.410 | 766.931 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.069 | 1.537 | 0.002 | 0.069 | gw-r/thread-45/journal/page | none observed |
| 7c52349efe20c59400000000000001c1 | 768.628 | 2.296 | n/a | 0.000 | 0.000 | 0.456 | 765.776 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.059 | 2.296 | 0.003 | 0.059 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c59400000000000001a0 | 664.215 | 3.478 | n/a | 0.000 | 0.000 | 0.446 | 660.177 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.080 | 3.478 | 0.005 | 0.080 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c59400000000000001c6 | 646.329 | 2.601 | n/a | 0.000 | 0.000 | 2.530 | 641.087 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.065 | 2.601 | 0.004 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c59400000000000001b6 | 640.386 | 2.254 | n/a | 0.000 | 0.000 | 0.425 | 637.609 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.058 | 2.254 | 0.004 | 0.058 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c59400000000000001a8 | 611.618 | 3.049 | n/a | 0.000 | 0.000 | 1.717 | 606.708 | 0.012 | n/a | 0.056 | 0.000 | n/a | n/a | 0.077 | 3.049 | 0.005 | 0.077 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c59400000000000001af | 603.724 | 5.544 | n/a | 0.000 | 0.000 | 0.762 | 597.307 | 0.003 | n/a | 0.038 | 0.000 | n/a | n/a | 0.069 | 5.544 | 0.009 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c59400000000000001d1 | 549.160 | 2.097 | n/a | 0.000 | 0.000 | 2.906 | 544.026 | 0.011 | n/a | 0.060 | 0.000 | n/a | n/a | 0.061 | 2.097 | 0.004 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c59400000000000001cf | 541.444 | 2.448 | n/a | 0.000 | 0.000 | 0.546 | 538.344 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.057 | 2.448 | 0.005 | 0.057 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c59400000000000001b9 | 524.712 | 2.394 | n/a | 0.000 | 0.000 | 0.531 | 521.683 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.061 | 2.394 | 0.005 | 0.061 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c5940000000000000199 | 498.872 | 2.329 | n/a | 0.000 | 0.000 | 0.368 | 496.026 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.092 | 2.329 | 0.005 | 0.092 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c59400000000000001b7 | 473.928 | 7.164 | n/a | 0.000 | 0.000 | 0.429 | 466.198 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.096 | 7.164 | 0.015 | 0.096 | gw-r/thread-42/journal/page | none observed |

## P3 / L256 / internal (47 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 307.991 | n/a | n/a | n/a | 2.344 | n/a | 0.000 | 0.000 | 0.500 | 304.148 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.072 | 2.344 | 0.008 | 0.072 |
| p99 | 1003.434 | n/a | n/a | n/a | 7.696 | n/a | 0.000 | 0.000 | 1.610 | 1001.541 | 0.727 | n/a | 0.080 | 0.000 | n/a | n/a | 15.640 | 7.696 | 0.417 | 15.640 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c52349efe20c5940000000000000215 | 1003.434 | 0.099 | n/a | 0.000 | 0.000 | 0.435 | 1001.007 | 0.727 | n/a | 0.071 | 0.000 | n/a | n/a | 1.095 | 0.099 | 0.000 | 1.095 | gw-r/thread-45/journal/page | none observed |
| 7c52349efe20c59400000000000001ff | 1003.338 | 0.128 | n/a | 0.000 | 0.000 | 0.489 | 1001.541 | 0.029 | n/a | 0.045 | 0.000 | n/a | n/a | 1.105 | 0.128 | 0.000 | 1.105 | gw-r/thread-47/journal/page | none observed |
| 7c52349efe20c59400000000000001ea | 1002.790 | 0.121 | n/a | 0.000 | 0.000 | 0.436 | 1000.992 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 1.160 | 0.121 | 0.000 | 1.160 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c5940000000000000213 | 1002.746 | 0.154 | n/a | 0.000 | 0.000 | 0.338 | 1001.036 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 1.143 | 0.154 | 0.000 | 1.143 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c594000000000000021a | 1001.706 | 0.207 | n/a | 0.000 | 0.000 | 0.577 | 1000.735 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.122 | 0.207 | 0.000 | 0.122 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c594000000000000021c | 986.789 | 2.398 | n/a | 0.000 | 0.000 | 0.303 | 983.954 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.072 | 2.398 | 0.002 | 0.072 | gw-r/thread-45/journal/page | none observed |
| 7c52349efe20c5940000000000000218 | 966.924 | 3.763 | n/a | 0.000 | 0.000 | 0.752 | 962.287 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.068 | 3.763 | 0.004 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c5940000000000000209 | 918.718 | 2.237 | n/a | 0.000 | 0.000 | 0.479 | 915.885 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.056 | 2.237 | 0.002 | 0.056 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c59400000000000001f9 | 819.336 | 3.796 | n/a | 0.000 | 0.000 | 0.796 | 814.529 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.178 | 3.796 | 0.005 | 0.178 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c5940000000000000201 | 806.781 | 2.352 | n/a | 0.000 | 0.000 | 0.402 | 803.901 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.090 | 2.352 | 0.003 | 0.090 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c5940000000000000204 | 749.319 | 2.118 | n/a | 0.000 | 0.000 | 0.691 | 746.384 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.077 | 2.118 | 0.003 | 0.077 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c59400000000000001dd | 742.756 | 2.590 | n/a | 0.000 | 0.000 | 0.664 | 739.369 | 0.015 | n/a | 0.047 | 0.000 | n/a | n/a | 0.070 | 2.590 | 0.003 | 0.070 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c59400000000000001f1 | 723.254 | 3.697 | n/a | 0.000 | 0.000 | 0.804 | 718.615 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.102 | 3.697 | 0.005 | 0.102 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c59400000000000001f6 | 715.754 | 2.191 | n/a | 0.000 | 0.000 | 0.390 | 713.063 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.073 | 2.191 | 0.003 | 0.073 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c59400000000000001e9 | 652.110 | 3.020 | n/a | 0.000 | 0.000 | 0.552 | 648.448 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.067 | 3.020 | 0.005 | 0.067 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c59400000000000001d9 | 612.470 | 2.371 | n/a | 0.000 | 0.000 | 0.574 | 609.425 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.058 | 2.371 | 0.004 | 0.058 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c59400000000000001fa | 533.569 | 2.014 | n/a | 0.000 | 0.000 | 0.623 | 530.792 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.066 | 2.014 | 0.004 | 0.066 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c59400000000000001ef | 480.297 | 2.682 | n/a | 0.000 | 0.000 | 0.474 | 477.032 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.067 | 2.682 | 0.006 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 7c52349efe20c5940000000000000212 | 475.423 | 2.716 | n/a | 0.000 | 0.000 | 0.619 | 471.974 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.077 | 2.716 | 0.006 | 0.077 | gw-r/thread-45/journal/page | none observed |
| 7c52349efe20c59400000000000001e2 | 466.559 | 3.734 | n/a | 0.000 | 0.000 | 0.613 | 462.096 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.066 | 3.734 | 0.008 | 0.066 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / internal (767 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.198 | n/a | n/a | n/a | 2.932 | n/a | 0.000 | 0.000 | 0.229 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.951 | 2.932 | 0.241 | 7.951 |
| p99 | 117.072 | n/a | n/a | n/a | 11.667 | n/a | 0.950 | 0.000 | 0.900 | 108.162 | 0.009 | n/a | 0.045 | 0.000 | n/a | n/a | 47.851 | 12.300 | 0.816 | 47.851 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c52349efe20c5940000000000000228 | 979.183 | 2.569 | n/a | 0.000 | 0.000 | 0.891 | 974.453 | 1.179 | n/a | 0.030 | 0.000 | n/a | n/a | 0.061 | 2.569 | 0.003 | 0.061 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c594000000000000021d | 885.329 | 1.995 | n/a | 0.000 | 0.000 | 0.470 | 882.742 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.075 | 1.995 | 0.002 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c5940000000000000229 | 861.101 | 2.123 | n/a | 0.000 | 0.000 | 0.967 | 857.894 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.075 | 2.123 | 0.002 | 0.075 | gw-r/thread-47/journal/page | none observed |
| 7c52349efe20c5940000000000000225 | 756.598 | 1.955 | n/a | 0.000 | 0.000 | 1.353 | 753.174 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.060 | 1.955 | 0.003 | 0.060 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c5940000000000000220 | 732.500 | 3.656 | n/a | 0.000 | 0.000 | 0.366 | 728.340 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.110 | 3.656 | 0.005 | 0.110 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c5940000000000000226 | 268.277 | 2.185 | n/a | 0.000 | 0.000 | 0.727 | 265.092 | 0.005 | n/a | 0.212 | 0.000 | n/a | n/a | 0.056 | 2.185 | 0.008 | 0.056 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c5940000000000000222 | 246.467 | 1.979 | n/a | 0.000 | 0.000 | 0.432 | 243.963 | 0.013 | n/a | 0.026 | 0.000 | n/a | n/a | 0.053 | 1.979 | 0.008 | 0.053 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c59400000000000004f8 | 117.072 | 7.831 | n/a | 2.439 | 0.000 | 0.395 | 106.228 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.125 | 10.271 | 0.088 | 0.125 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c594000000000000021f | 111.282 | 2.206 | n/a | 0.000 | 0.000 | 0.806 | 108.162 | 0.003 | n/a | 0.037 | 0.000 | n/a | n/a | 0.067 | 2.206 | 0.020 | 0.067 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c5940000000000000316 | 108.369 | 2.849 | n/a | 0.000 | 0.000 | 0.707 | 104.701 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.073 | 2.849 | 0.026 | 0.073 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c59400000000000006e5 | 103.411 | 5.021 | n/a | 0.000 | 0.000 | 0.718 | 97.554 | 0.003 | n/a | 0.046 | 0.000 | n/a | n/a | 0.070 | 5.021 | 0.049 | 0.070 | gw-r/thread-45/gateway.response-write | none observed |
| 7c52349efe20c5940000000000000675 | 95.716 | 8.940 | n/a | 0.000 | 0.000 | 0.900 | 85.458 | 0.198 | n/a | 0.032 | 0.000 | n/a | n/a | 0.187 | 8.940 | 0.093 | 0.187 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c59400000000000002f9 | 94.504 | 5.623 | n/a | 0.000 | 0.000 | 0.375 | 88.414 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.078 | 5.623 | 0.059 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c5940000000000000765 | 90.653 | 2.741 | n/a | 0.000 | 0.000 | 0.455 | 87.323 | 0.008 | n/a | 0.030 | 0.000 | n/a | n/a | 0.096 | 2.741 | 0.030 | 0.096 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c59400000000000007a9 | 86.347 | 2.129 | n/a | 0.000 | 0.000 | 0.369 | 83.739 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.073 | 2.129 | 0.025 | 0.073 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c59400000000000005fb | 84.209 | 3.379 | n/a | 0.000 | 0.000 | 0.377 | 80.377 | 0.002 | n/a | 0.015 | 0.000 | n/a | n/a | 0.058 | 3.379 | 0.040 | 0.058 | gw-r/thread-47/journal/page | none observed |
| 7c52349efe20c5940000000000000500 | 82.477 | 2.156 | n/a | 0.000 | 0.000 | 0.553 | 79.652 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.075 | 2.156 | 0.026 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c5940000000000000772 | 78.442 | 5.754 | n/a | 0.000 | 0.000 | 0.496 | 71.981 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.130 | 5.754 | 0.073 | 0.130 | gw-r/thread-46/journal/page | none observed |
| 7c52349efe20c59400000000000005dd | 76.921 | 7.625 | n/a | 0.000 | 0.000 | 0.622 | 68.540 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.097 | 7.625 | 0.099 | 0.097 | gw-r/thread-45/journal/page | none observed |
| 7c52349efe20c5940000000000000418 | 76.896 | 9.106 | n/a | 0.924 | 0.000 | 0.298 | 66.423 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.095 | 10.030 | 0.130 | 0.095 | gw-r/thread-46/journal/page | none observed |

## P3 / tail / internal (2344 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.955 | n/a | n/a | n/a | 3.648 | n/a | 0.000 | 0.000 | 0.205 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.745 | 3.668 | 0.309 | 6.745 |
| p99 | 344.973 | n/a | n/a | n/a | 14.355 | n/a | 1.265 | 0.000 | 0.976 | 342.333 | 0.010 | n/a | 0.034 | 0.000 | n/a | n/a | 47.392 | 15.065 | 0.847 | 47.392 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c52349efe20c5940000000000001ad7 | 1003.006 | 0.105 | n/a | 0.000 | 0.000 | 0.495 | 1001.190 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 1.146 | 0.105 | 0.000 | 1.146 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c5940000000000001b1f | 1002.141 | 2.475 | n/a | 0.000 | 0.000 | 0.382 | 999.192 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.056 | 2.475 | 0.002 | 0.056 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c5940000000000001b23 | 1002.054 | 0.084 | n/a | 0.000 | 0.000 | 0.372 | 1000.478 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 1.081 | 0.084 | 0.000 | 1.081 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c5940000000000001ae1 | 992.666 | 2.149 | n/a | 0.000 | 0.000 | 0.309 | 990.120 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.057 | 2.149 | 0.002 | 0.057 | gw-r/thread-45/journal/page | none observed |
| 7c52349efe20c5940000000000001adc | 978.220 | 3.143 | n/a | 0.000 | 0.000 | 0.409 | 974.511 | 0.018 | n/a | 0.034 | 0.000 | n/a | n/a | 0.105 | 3.143 | 0.003 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c5940000000000001afa | 970.887 | 3.302 | n/a | 0.000 | 0.000 | 0.750 | 966.730 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.058 | 3.302 | 0.003 | 0.058 | gw-r/thread-45/journal/page | none observed |
| 7c52349efe20c5940000000000001aea | 965.894 | 3.069 | n/a | 0.000 | 0.000 | 0.349 | 962.373 | 0.010 | n/a | 0.037 | 0.000 | n/a | n/a | 0.056 | 3.069 | 0.003 | 0.056 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c5940000000000001b1b | 922.473 | 2.074 | n/a | 0.000 | 0.000 | 0.418 | 919.876 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.060 | 2.074 | 0.002 | 0.060 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c5940000000000001ad5 | 916.993 | 2.176 | n/a | 0.000 | 0.000 | 0.426 | 914.305 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.062 | 2.176 | 0.002 | 0.062 | gw-r/thread-65/journal/page | none observed |
| 7c52349efe20c5940000000000001ad9 | 892.152 | 11.499 | n/a | 0.000 | 0.000 | 0.510 | 879.906 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.212 | 11.499 | 0.013 | 0.212 | gw-r/thread-45/journal/page | none observed |
| 7c52349efe20c5940000000000001b1c | 806.286 | 1.862 | n/a | 0.000 | 0.000 | 0.288 | 804.031 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.060 | 1.862 | 0.002 | 0.060 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c5940000000000001afd | 746.559 | 4.811 | n/a | 0.000 | 0.000 | 0.674 | 740.977 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.058 | 4.811 | 0.006 | 0.058 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c5940000000000001af6 | 678.313 | 3.037 | n/a | 0.000 | 0.000 | 0.476 | 674.728 | 0.002 | n/a | 0.012 | 0.000 | n/a | n/a | 0.058 | 3.037 | 0.004 | 0.058 | gw-r/thread-65/journal/page | none observed |
| 7c52349efe20c5940000000000001ae2 | 628.564 | 1.767 | n/a | 0.000 | 0.000 | 0.392 | 626.283 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.088 | 1.767 | 0.003 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 7c52349efe20c5940000000000001b16 | 619.142 | 2.817 | n/a | 0.000 | 0.000 | 0.381 | 615.858 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.058 | 2.817 | 0.005 | 0.058 | gw-r/thread-44/journal/page | none observed |
| 7c52349efe20c5940000000000001afe | 607.441 | 7.661 | n/a | 0.839 | 0.000 | 0.438 | 598.235 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 0.214 | 8.500 | 0.014 | 0.214 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c5940000000000001af2 | 588.533 | 2.626 | n/a | 0.000 | 0.000 | 0.496 | 585.310 | 0.003 | n/a | 0.037 | 0.000 | n/a | n/a | 0.062 | 2.626 | 0.004 | 0.062 | gw-r/thread-49/journal/page | none observed |
| 7c52349efe20c5940000000000001b0c | 496.335 | 2.909 | n/a | 0.000 | 0.000 | 0.551 | 492.792 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.059 | 2.909 | 0.006 | 0.059 | gw-r/thread-65/journal/page | none observed |
| 7c52349efe20c5940000000000001b14 | 491.280 | 2.955 | n/a | 0.000 | 0.000 | 0.360 | 487.870 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.057 | 2.955 | 0.006 | 0.057 | gw-r/thread-42/journal/page | none observed |
| 7c52349efe20c5940000000000001b11 | 478.735 | 3.500 | n/a | 0.000 | 0.000 | 0.500 | 474.646 | 0.002 | n/a | 0.020 | 0.000 | n/a | n/a | 0.067 | 3.500 | 0.007 | 0.067 | gw-r/thread-65/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.398 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 200.975 | 0.014 | n/a | 0.120 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 |
| p99 | 207.654 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.788 | 205.191 | 4.194 | n/a | 0.750 | 0.000 | n/a | n/a | 0.530 | 0.000 | 0.000 | 0.530 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 821bc75ab68f6693000000000000002f | 207.654 | 0.000 | n/a | 0.000 | 0.000 | 5.788 | 201.473 | 0.024 | n/a | 0.215 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f6693000000000000001b | 206.745 | 0.000 | n/a | 0.000 | 0.000 | 1.076 | 205.095 | 0.029 | n/a | 0.447 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f66930000000000000034 | 206.494 | 0.000 | n/a | 0.000 | 0.000 | 5.089 | 201.036 | 0.016 | n/a | 0.138 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f66930000000000000015 | 206.375 | 0.000 | n/a | 0.000 | 0.000 | 1.261 | 204.685 | 0.026 | n/a | 0.194 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000058 | 206.176 | 0.000 | n/a | 0.000 | 0.000 | 1.067 | 204.788 | 0.021 | n/a | 0.194 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f66930000000000000047 | 206.053 | 0.000 | n/a | 0.000 | 0.000 | 0.452 | 205.191 | 0.073 | n/a | 0.227 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f66930000000000000048 | 205.990 | 0.000 | n/a | 0.000 | 0.000 | 3.891 | 201.857 | 0.014 | n/a | 0.133 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f6693000000000000004a | 205.738 | 0.000 | n/a | 0.000 | 0.000 | 0.747 | 204.736 | 0.014 | n/a | 0.127 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f66930000000000000057 | 205.657 | 0.000 | n/a | 0.000 | 0.000 | 4.606 | 200.813 | 0.016 | n/a | 0.099 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f66930000000000000030 | 205.541 | 0.000 | n/a | 0.000 | 0.000 | 1.124 | 204.143 | 0.014 | n/a | 0.164 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f66930000000000000059 | 204.555 | 0.000 | n/a | 0.000 | 0.000 | 1.484 | 202.723 | 0.014 | n/a | 0.122 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f66930000000000000051 | 204.350 | 0.000 | n/a | 0.000 | 0.000 | 1.212 | 202.782 | 0.021 | n/a | 0.164 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f66930000000000000050 | 203.894 | 0.000 | n/a | 0.000 | 0.000 | 2.645 | 200.992 | 0.017 | n/a | 0.136 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f66930000000000000018 | 203.774 | 0.000 | n/a | 0.000 | 0.000 | 2.520 | 200.953 | 0.013 | n/a | 0.115 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f66930000000000000012 | 203.693 | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 202.042 | 0.026 | n/a | 0.750 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f66930000000000000041 | 203.684 | 0.000 | n/a | 0.000 | 0.000 | 1.423 | 201.872 | 0.012 | n/a | 0.130 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f66930000000000000035 | 203.623 | 0.000 | n/a | 0.000 | 0.000 | 1.642 | 201.654 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f66930000000000000009 | 203.492 | 0.000 | n/a | 0.000 | 0.000 | 1.882 | 200.937 | 0.011 | n/a | 0.131 | 0.000 | n/a | n/a | 0.530 | 0.000 | 0.000 | 0.530 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f6693000000000000000e | 203.446 | 0.000 | n/a | 0.000 | 0.000 | 1.156 | 201.841 | 0.039 | n/a | 0.220 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f66930000000000000056 | 203.164 | 0.000 | n/a | 0.000 | 0.000 | 1.972 | 200.841 | 0.016 | n/a | 0.146 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-44/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.029 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 200.982 | 0.014 | n/a | 0.091 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 |
| p99 | 218.384 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.310 | 217.427 | 10.845 | n/a | 0.229 | 0.000 | n/a | n/a | 50.031 | 0.000 | 0.000 | 50.031 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 821bc75ab68f66930000000000000096 | 218.384 | 0.000 | n/a | 0.000 | 0.000 | 0.668 | 217.427 | 0.023 | n/a | 0.157 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f66930000000000000075 | 208.517 | 0.000 | n/a | 0.000 | 0.000 | 1.812 | 206.362 | 0.023 | n/a | 0.158 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f66930000000000000061 | 207.043 | 0.000 | n/a | 0.000 | 0.000 | 1.067 | 205.625 | 0.020 | n/a | 0.210 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f66930000000000000084 | 206.418 | 0.000 | n/a | 0.000 | 0.000 | 2.186 | 203.941 | 0.013 | n/a | 0.138 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f669300000000000000c0 | 206.395 | 0.000 | n/a | 0.000 | 0.000 | 1.064 | 201.270 | 3.729 | n/a | 0.157 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f6693000000000000008d | 205.818 | 0.000 | n/a | 0.000 | 0.000 | 1.012 | 204.535 | 0.013 | n/a | 0.050 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000060 | 205.363 | 0.000 | n/a | 0.000 | 0.000 | 0.659 | 204.440 | 0.017 | n/a | 0.144 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f669300000000000000ba | 205.135 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 203.860 | 0.031 | n/a | 0.185 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f669300000000000000aa | 205.042 | 0.000 | n/a | 0.000 | 0.000 | 0.583 | 204.199 | 0.018 | n/a | 0.115 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000082 | 204.389 | 0.000 | n/a | 0.000 | 0.000 | 0.572 | 203.570 | 0.016 | n/a | 0.120 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f669300000000000000be | 204.373 | 0.000 | n/a | 0.000 | 0.000 | 1.890 | 202.153 | 0.016 | n/a | 0.209 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f6693000000000000006b | 203.878 | 0.000 | n/a | 0.000 | 0.000 | 2.554 | 201.106 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f66930000000000000073 | 203.711 | 0.000 | n/a | 0.000 | 0.000 | 1.790 | 201.645 | 0.022 | n/a | 0.162 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f669300000000000000c1 | 203.649 | 0.000 | n/a | 0.000 | 0.000 | 0.690 | 202.729 | 0.012 | n/a | 0.124 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000078 | 203.640 | 0.000 | n/a | 0.000 | 0.000 | 1.589 | 201.768 | 0.014 | n/a | 0.111 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f66930000000000000076 | 203.421 | 0.000 | n/a | 0.000 | 0.000 | 2.212 | 200.975 | 0.014 | n/a | 0.104 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f669300000000000000b4 | 203.204 | 0.000 | n/a | 0.000 | 0.000 | 1.504 | 201.290 | 0.013 | n/a | 0.141 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f6693000000000000007d | 203.170 | 0.000 | n/a | 0.000 | 0.000 | 1.453 | 201.412 | 0.017 | n/a | 0.139 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f669300000000000000ab | 203.137 | 0.000 | n/a | 0.000 | 0.000 | 1.186 | 201.637 | 0.016 | n/a | 0.152 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f669300000000000000b7 | 203.001 | 0.000 | n/a | 0.000 | 0.000 | 1.997 | 200.767 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-42/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.821 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 200.836 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 |
| p99 | 209.771 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.901 | 204.809 | 5.409 | n/a | 0.336 | 0.000 | n/a | n/a | 0.280 | 0.000 | 0.000 | 0.280 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 821bc75ab68f669300000000000000d3 | 209.771 | 0.000 | n/a | 0.000 | 0.000 | 4.901 | 204.606 | 0.010 | n/a | 0.081 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f6693000000000000011b | 206.036 | 0.000 | n/a | 0.000 | 0.000 | 1.063 | 204.592 | 0.009 | n/a | 0.092 | 0.000 | n/a | n/a | 0.280 | 0.000 | 0.000 | 0.280 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f669300000000000000c5 | 205.784 | 0.000 | n/a | 0.000 | 0.000 | 0.898 | 204.626 | 0.014 | n/a | 0.103 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f669300000000000000e9 | 205.774 | 0.000 | n/a | 0.000 | 0.000 | 1.547 | 203.924 | 0.033 | n/a | 0.062 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f669300000000000000c4 | 205.471 | 0.000 | n/a | 0.000 | 0.000 | 1.289 | 203.901 | 0.007 | n/a | 0.079 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f66930000000000000121 | 205.456 | 0.000 | n/a | 0.000 | 0.000 | 0.881 | 204.401 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f669300000000000000db | 205.398 | 0.000 | n/a | 0.000 | 0.000 | 0.544 | 204.668 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f669300000000000000e1 | 205.349 | 0.000 | n/a | 0.000 | 0.000 | 0.379 | 204.809 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f6693000000000000010c | 204.927 | 0.000 | n/a | 0.000 | 0.000 | 3.852 | 200.901 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f669300000000000000cb | 204.810 | 0.000 | n/a | 0.000 | 0.000 | 3.519 | 201.064 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000126 | 204.500 | 0.000 | n/a | 0.000 | 0.000 | 1.073 | 203.110 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f66930000000000000125 | 203.715 | 0.000 | n/a | 0.000 | 0.000 | 2.370 | 201.015 | 0.021 | n/a | 0.136 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f669300000000000000c3 | 203.565 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 202.310 | 0.011 | n/a | 0.336 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f66930000000000000101 | 203.527 | 0.000 | n/a | 0.000 | 0.000 | 2.323 | 200.999 | 0.008 | n/a | 0.103 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000107 | 203.464 | 0.000 | n/a | 0.000 | 0.000 | 2.660 | 200.561 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000114 | 202.941 | 0.000 | n/a | 0.000 | 0.000 | 0.637 | 202.065 | 0.016 | n/a | 0.101 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f669300000000000000c7 | 202.911 | 0.000 | n/a | 0.000 | 0.000 | 1.024 | 201.612 | 0.007 | n/a | 0.087 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f66930000000000000104 | 202.730 | 0.000 | n/a | 0.000 | 0.000 | 1.059 | 201.379 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f66930000000000000108 | 202.699 | 0.000 | n/a | 0.000 | 0.000 | 0.705 | 201.742 | 0.034 | n/a | 0.124 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f66930000000000000109 | 202.675 | 0.000 | n/a | 0.000 | 0.000 | 1.058 | 201.381 | 0.007 | n/a | 0.130 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.637 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.686 | 200.761 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 |
| p99 | 205.979 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.110 | 204.650 | 2.590 | n/a | 2.271 | 0.000 | n/a | n/a | 52.159 | 0.000 | 0.000 | 52.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 821bc75ab68f6693000000000000013c | 205.979 | 0.000 | n/a | 0.000 | 0.000 | 5.110 | 200.706 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f66930000000000000154 | 205.716 | 0.000 | n/a | 0.000 | 0.000 | 0.807 | 204.650 | 0.014 | n/a | 0.087 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f66930000000000000173 | 205.050 | 0.000 | n/a | 0.000 | 0.000 | 4.394 | 200.523 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f6693000000000000013b | 204.927 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 203.926 | 0.016 | n/a | 0.071 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f66930000000000000153 | 204.903 | 0.000 | n/a | 0.000 | 0.000 | 3.929 | 200.805 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f6693000000000000014a | 204.680 | 0.000 | n/a | 0.000 | 0.000 | 0.478 | 203.995 | 0.010 | n/a | 0.118 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f66930000000000000184 | 204.630 | 0.000 | n/a | 0.000 | 0.000 | 3.735 | 200.728 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f66930000000000000175 | 204.549 | 0.000 | n/a | 0.000 | 0.000 | 3.208 | 201.186 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f66930000000000000169 | 204.063 | 0.000 | n/a | 0.000 | 0.000 | 0.383 | 203.505 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f6693000000000000015c | 204.052 | 0.000 | n/a | 0.000 | 0.000 | 1.162 | 202.586 | 0.035 | n/a | 0.185 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f66930000000000000139 | 203.428 | 0.000 | n/a | 0.000 | 0.000 | 1.319 | 201.809 | 0.007 | n/a | 0.118 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f6693000000000000016b | 203.130 | 0.000 | n/a | 0.000 | 0.000 | 1.024 | 201.659 | 0.015 | n/a | 0.150 | 0.000 | n/a | n/a | 0.281 | 0.000 | 0.000 | 0.281 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f66930000000000000156 | 202.981 | 0.000 | n/a | 0.000 | 0.000 | 1.769 | 201.032 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f66930000000000000132 | 202.935 | 0.000 | n/a | 0.000 | 0.000 | 1.206 | 201.175 | 0.298 | n/a | 0.088 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f6693000000000000012c | 202.918 | 0.000 | n/a | 0.000 | 0.000 | 1.619 | 201.066 | 0.013 | n/a | 0.075 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f6693000000000000013d | 202.656 | 0.000 | n/a | 0.000 | 0.000 | 0.956 | 201.580 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.072 | 0.000 | 0.000 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f66930000000000000177 | 202.577 | 0.000 | n/a | 0.000 | 0.000 | 0.431 | 201.864 | 0.015 | n/a | 0.119 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f66930000000000000187 | 202.445 | 0.000 | n/a | 0.000 | 0.000 | 1.225 | 201.000 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f66930000000000000143 | 202.430 | 0.000 | n/a | 0.000 | 0.000 | 1.391 | 200.769 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f66930000000000000161 | 202.397 | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 201.449 | 0.018 | n/a | 0.042 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-42/journal/page | none observed |

## P3 / L64 / read (106 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.324 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.570 | 200.598 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |
| p99 | 204.986 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.475 | 204.351 | 3.794 | n/a | 0.092 | 0.000 | n/a | n/a | 0.427 | 0.000 | 0.000 | 0.427 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 821bc75ab68f669300000000000001b5 | 216.235 | 0.000 | n/a | 0.000 | 0.000 | 0.435 | 215.616 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f669300000000000001cc | 204.986 | 0.000 | n/a | 0.000 | 0.000 | 4.071 | 200.760 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f669300000000000001b2 | 204.921 | 0.000 | n/a | 0.000 | 0.000 | 0.417 | 204.351 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f669300000000000001c2 | 204.202 | 0.000 | n/a | 0.000 | 0.000 | 2.475 | 201.390 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f669300000000000001ee | 203.687 | 0.000 | n/a | 0.000 | 0.000 | 0.843 | 202.371 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.427 | 0.000 | 0.000 | 0.427 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f669300000000000001fb | 203.118 | 0.000 | n/a | 0.000 | 0.000 | 1.915 | 201.022 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f669300000000000001b0 | 202.578 | 0.000 | n/a | 0.000 | 0.000 | 0.997 | 201.281 | 0.007 | n/a | 0.092 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f669300000000000001b8 | 202.531 | 0.000 | n/a | 0.000 | 0.000 | 0.419 | 201.883 | 0.008 | n/a | 0.102 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f669300000000000001af | 202.481 | 0.000 | n/a | 0.000 | 0.000 | 1.366 | 200.971 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f669300000000000001d1 | 202.331 | 0.000 | n/a | 0.000 | 0.000 | 1.018 | 201.149 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f669300000000000001b7 | 202.240 | 0.000 | n/a | 0.000 | 0.000 | 1.098 | 200.915 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f669300000000000001e7 | 202.232 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 201.169 | 0.013 | n/a | 0.057 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f669300000000000001e6 | 202.133 | 0.000 | n/a | 0.000 | 0.000 | 0.806 | 201.073 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f669300000000000001ec | 202.111 | 0.000 | n/a | 0.000 | 0.000 | 0.848 | 201.089 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f669300000000000001d9 | 202.088 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 201.165 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f669300000000000001f8 | 202.016 | 0.000 | n/a | 0.000 | 0.000 | 0.588 | 201.093 | 0.014 | n/a | 0.081 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f669300000000000001f4 | 201.994 | 0.000 | n/a | 0.000 | 0.000 | 0.946 | 200.879 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f66930000000000000194 | 201.985 | 0.000 | n/a | 0.000 | 0.000 | 1.123 | 200.588 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.237 | 0.000 | 0.000 | 0.237 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f669300000000000001f1 | 201.802 | 0.000 | n/a | 0.000 | 0.000 | 1.010 | 200.542 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f669300000000000001d4 | 201.788 | 0.000 | n/a | 0.000 | 0.000 | 0.522 | 201.099 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-44/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.463 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.630 | 200.663 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 204.967 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.278 | 204.261 | 4.188 | n/a | 0.124 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 821bc75ab68f66930000000000000260 | 205.257 | 0.000 | n/a | 0.000 | 0.000 | 0.718 | 204.261 | 0.006 | n/a | 0.087 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f66930000000000000216 | 204.967 | 0.000 | n/a | 0.000 | 0.000 | 0.505 | 204.265 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f66930000000000000223 | 203.874 | 0.000 | n/a | 0.000 | 0.000 | 0.703 | 202.954 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f66930000000000000220 | 203.137 | 0.000 | n/a | 0.000 | 0.000 | 0.911 | 201.887 | 0.019 | n/a | 0.143 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f6693000000000000021f | 203.134 | 0.000 | n/a | 0.000 | 0.000 | 0.427 | 202.547 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f6693000000000000022c | 203.131 | 0.000 | n/a | 0.000 | 0.000 | 2.074 | 200.893 | 0.009 | n/a | 0.039 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000228 | 202.904 | 0.000 | n/a | 0.000 | 0.000 | 1.062 | 201.567 | 0.013 | n/a | 0.062 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f66930000000000000255 | 202.622 | 0.000 | n/a | 0.000 | 0.000 | 1.053 | 201.378 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f66930000000000000272 | 202.360 | 0.000 | n/a | 0.000 | 0.000 | 0.482 | 201.601 | 0.016 | n/a | 0.124 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000214 | 202.182 | 0.000 | n/a | 0.000 | 0.000 | 1.024 | 200.943 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f66930000000000000254 | 202.173 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 201.057 | 0.009 | n/a | 0.058 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f66930000000000000230 | 202.124 | 0.000 | n/a | 0.000 | 0.000 | 1.277 | 200.633 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f66930000000000000238 | 202.107 | 0.000 | n/a | 0.000 | 0.000 | 0.949 | 200.940 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f66930000000000000252 | 202.079 | 0.000 | n/a | 0.000 | 0.000 | 0.433 | 201.523 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f66930000000000000221 | 202.047 | 0.000 | n/a | 0.000 | 0.000 | 0.970 | 200.791 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000234 | 201.976 | 0.000 | n/a | 0.000 | 0.000 | 0.496 | 201.259 | 0.015 | n/a | 0.090 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f6693000000000000025f | 201.914 | 0.000 | n/a | 0.000 | 0.000 | 0.778 | 200.900 | 0.015 | n/a | 0.070 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f66930000000000000248 | 201.874 | 0.000 | n/a | 0.000 | 0.000 | 0.564 | 201.149 | 0.007 | n/a | 0.091 | 0.000 | n/a | n/a | 0.063 | 0.000 | 0.000 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f66930000000000000239 | 201.867 | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 200.698 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f66930000000000000242 | 201.839 | 0.000 | n/a | 0.000 | 0.000 | 0.656 | 201.002 | 0.016 | n/a | 0.063 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-44/journal/page | none observed |

## P3 / L1024 / read (67 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 70.601 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.484 | 69.454 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |
| p99 | 205.249 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.789 | 204.560 | 1.872 | n/a | 0.093 | 0.000 | n/a | n/a | 65.225 | 0.000 | 0.000 | 65.225 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 821bc75ab68f6693000000000000028c | 205.249 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 204.436 | 0.016 | n/a | 0.063 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f6693000000000000028f | 205.231 | 0.000 | n/a | 0.000 | 0.000 | 0.501 | 204.560 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000293 | 202.049 | 0.000 | n/a | 0.000 | 0.000 | 0.611 | 201.233 | 0.012 | n/a | 0.069 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f6693000000000000028e | 201.970 | 0.000 | n/a | 0.000 | 0.000 | 0.820 | 200.968 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f66930000000000000292 | 201.951 | 0.000 | n/a | 0.000 | 0.000 | 0.813 | 200.946 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f66930000000000000281 | 201.767 | 0.000 | n/a | 0.000 | 0.000 | 0.471 | 201.098 | 0.011 | n/a | 0.093 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f66930000000000000291 | 201.673 | 0.000 | n/a | 0.000 | 0.000 | 0.617 | 200.859 | 0.007 | n/a | 0.076 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f6693000000000000027f | 201.592 | 0.000 | n/a | 0.000 | 0.000 | 0.500 | 200.908 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f66930000000000000279 | 201.574 | 0.000 | n/a | 0.000 | 0.000 | 0.773 | 200.592 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000280 | 201.509 | 0.000 | n/a | 0.000 | 0.000 | 0.484 | 200.863 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f6693000000000000027a | 201.480 | 0.000 | n/a | 0.000 | 0.000 | 0.662 | 200.630 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f66930000000000000287 | 201.407 | 0.000 | n/a | 0.000 | 0.000 | 0.421 | 200.813 | 0.006 | n/a | 0.079 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f66930000000000000283 | 201.366 | 0.000 | n/a | 0.000 | 0.000 | 0.360 | 200.846 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f6693000000000000028a | 201.345 | 0.000 | n/a | 0.000 | 0.000 | 0.414 | 200.776 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000286 | 201.344 | 0.000 | n/a | 0.000 | 0.000 | 0.417 | 200.763 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f6693000000000000028d | 201.289 | 0.000 | n/a | 0.000 | 0.000 | 0.418 | 200.711 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f66930000000000000288 | 201.177 | 0.000 | n/a | 0.000 | 0.000 | 0.544 | 200.493 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f6693000000000000027b | 201.177 | 0.000 | n/a | 0.000 | 0.000 | 0.524 | 200.540 | 0.007 | n/a | 0.022 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f6693000000000000027c | 201.091 | 0.000 | n/a | 0.000 | 0.000 | 0.412 | 200.536 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 821bc75ab68f66930000000000000294 | 192.776 | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 191.820 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-49/journal/page | none observed |

## P3 / tail / read (220 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.321 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.426 | 84.244 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 |
| p99 | 202.279 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.278 | 201.044 | 2.095 | n/a | 0.077 | 0.000 | n/a | n/a | 50.217 | 0.000 | 0.000 | 50.217 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 821bc75ab68f66930000000000000f23 | 202.796 | 0.000 | n/a | 0.000 | 0.000 | 1.604 | 201.064 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000ef3 | 202.501 | 0.000 | n/a | 0.000 | 0.000 | 1.885 | 200.506 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f66930000000000000f17 | 202.279 | 0.000 | n/a | 0.000 | 0.000 | 0.756 | 201.255 | 0.009 | n/a | 0.087 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-65/journal/page | none observed |
| 821bc75ab68f66930000000000000edd | 202.128 | 0.000 | n/a | 0.000 | 0.000 | 1.437 | 200.549 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f66930000000000000f18 | 201.970 | 0.000 | n/a | 0.000 | 0.000 | 0.779 | 200.889 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000eba | 201.917 | 0.000 | n/a | 0.000 | 0.000 | 0.990 | 200.707 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f66930000000000000ee3 | 201.859 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 201.044 | 0.013 | n/a | 0.064 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f66930000000000000ed9 | 201.749 | 0.000 | n/a | 0.000 | 0.000 | 0.949 | 200.651 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-46/journal/page | none observed |
| 821bc75ab68f66930000000000000edf | 201.736 | 0.000 | n/a | 0.000 | 0.000 | 0.533 | 201.019 | 0.014 | n/a | 0.076 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f66930000000000000ecb | 201.718 | 0.000 | n/a | 0.000 | 0.000 | 0.682 | 200.794 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f66930000000000000ee6 | 201.691 | 0.000 | n/a | 0.000 | 0.000 | 0.536 | 200.907 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000eb5 | 201.651 | 0.000 | n/a | 0.000 | 0.000 | 0.480 | 201.007 | 0.013 | n/a | 0.068 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f66930000000000000ecc | 201.634 | 0.000 | n/a | 0.000 | 0.000 | 0.787 | 200.598 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-47/journal/page | none observed |
| 821bc75ab68f66930000000000000f1c | 201.608 | 0.000 | n/a | 0.000 | 0.000 | 0.693 | 200.773 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f66930000000000000f03 | 201.602 | 0.000 | n/a | 0.000 | 0.000 | 0.800 | 200.662 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-42/journal/page | none observed |
| 821bc75ab68f66930000000000000ec5 | 201.583 | 0.000 | n/a | 0.000 | 0.000 | 0.420 | 200.958 | 0.056 | n/a | 0.048 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-45/journal/page | none observed |
| 821bc75ab68f66930000000000000eb8 | 201.580 | 0.000 | n/a | 0.000 | 0.000 | 0.653 | 200.773 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f66930000000000000f1b | 201.573 | 0.000 | n/a | 0.000 | 0.000 | 0.386 | 201.011 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-44/journal/page | none observed |
| 821bc75ab68f66930000000000000eca | 201.565 | 0.000 | n/a | 0.000 | 0.000 | 0.613 | 200.768 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-49/journal/page | none observed |
| 821bc75ab68f66930000000000000eec | 201.514 | 0.000 | n/a | 0.000 | 0.000 | 0.343 | 200.984 | 0.016 | n/a | 0.062 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.597/3.942 ms; post-ACK p50/p99: 0.375/1.792 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.659 | 10.175 | 9.544 | reported |
| All-primary p99 ms | 40.776 | 40.474 | 39.324 | <=50 |
| L256 5-10 p50Ms | 13.631 | 13.311 | 12.415 | <=10 |
| L256 5-10 p99Ms | 19.436 | 19.192 | 18.842 | <=50 |
| L256 11-25 p50Ms | 14.335 | 13.759 | 12.991 | <=10 |
| L256 11-25 p99Ms | 25.240 | 24.321 | 23.862 | <=50 |
| L256 26-50 p50Ms | 18.047 | 17.279 | 16.895 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 19.900 | 18.104 | 17.475 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 9.343 | 9.023 | 8.383 | <=10 |
| Burst 11-25 p50 ms | 11.583 | 10.943 | 10.303 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 25.240 | 24.321 | 23.862 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 58.370 | 58.086 | 57.188 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 55.126/55.126 | 49.499 | 28.454 | 72.954 | 0.736/0.229 |
| 5-10 | 250-1000 | 48 | 14.143/71.428 | 13.774 | 8.844 | 20.912 | 0.087/0.021 |
| 5-10 | 0-50 | 1140 | 7.835/21.776 | 7.477 | 4.180 | 10.370 | 0.041/0.018 |
| 11-25 | 250-1000 | 28 | 20.103/106.208 | 19.411 | 11.868 | 30.273 | 0.086/0.021 |
| 26-50 | 100-250 | 6 | 16.729/30.345 | 15.749 | 9.296 | 22.281 | 0.113/0.019 |
| 5-10 | 100-250 | 21 | 13.625/32.344 | 13.290 | 8.121 | 18.363 | 0.066/0.019 |
| 26-50 | 250-1000 | 6 | 27.656/64.244 | 26.096 | 14.002 | 24.077 | 0.096/0.021 |
| 26-50 | overlap | 146 | 15.768/55.242 | 14.807 | 8.095 | 20.001 | 0.050/0.019 |
| 11-25 | 100-250 | 10 | 13.971/22.961 | 13.383 | 7.570 | 17.944 | 0.068/0.021 |
| 11-25 | overlap | 384 | 11.925/40.966 | 11.295 | 6.841 | 16.051 | 0.037/0.018 |
| 5-10 | 50-100 | 59 | 8.476/32.204 | 8.212 | 4.750 | 11.774 | 0.050/0.018 |
| 11-25 | 0-50 | 524 | 9.953/31.964 | 9.400 | 4.793 | 12.516 | 0.047/0.019 |
| 11-25 | 50-100 | 40 | 10.346/50.562 | 9.524 | 5.207 | 12.863 | 0.058/0.019 |
| 5-10 | overlap | 797 | 9.918/41.228 | 9.586 | 5.860 | 13.314 | 0.034/0.017 |
| 26-50 | 0-50 | 196 | 13.719/40.857 | 12.513 | 6.493 | 17.159 | 0.060/0.019 |
| 26-50 | 50-100 | 14 | 13.784/20.701 | 12.669 | 5.964 | 18.222 | 0.071/0.018 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 889 | 5 | 340.847 |
| burst | 2531 | 6 | 351.220 |

## Writer heap, GC and scheduler stalls

Source 236dd70bf8077ee0a91acba63376db723e078306; 3420 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 343.642 / 533.471 |
| GC events / total duration / maximum ms | 475 / 1149.760 / 29.813 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":465,"4":5,"8":5} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 40.776 / 11 / 692.066 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.
