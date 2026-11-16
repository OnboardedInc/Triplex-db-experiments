# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (38.882 ms, trace `6f0a8b5e40b4d9a5000000000000033d`); `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (36.755 ms, trace `6f0a8b5e40b4d9a5000000000000033e`); `node-14/thread-0/socket.wait-first-byte` (21.823 ms, trace `6f0a8b5e40b4d9a50000000000000340`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (36.607 ms, trace `6f0a8b5e40b4d9a5000000000000033f`); `node-14/thread-0/socket.wait-first-byte` (48.253 ms, trace `6f0a8b5e40b4d9a50000000000000337`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-idle-b-8-tcp`; source `a0785bcf96f7afea3965b3028db2e27f4fbef6a9`; subjects 10000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 1250/1250 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 1250/1250. Raw trace bytes: 18459255.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 4055 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 6000.732 | 1121.678 | 8.114 | 4049 |
| idle-10 | 0 | 2491.204 | 790.693 | 28.010 | 3032 |
| idle-25 | 0 | 4750.329 | 783.491 | 6.373 | 3049 |
| idle-50 | 0 | 8461.182 | 825.462 | 7.422 | 3034 |
| idle-100 | 0 | 15912.319 | 933.760 | 9.346 | 3034 |
| idle-250 | 0 | 38265.769 | 1204.869 | 17.172 | 3030 |
| idle-500 | 0 | 75512.627 | 1895.088 | 48.974 | 3034 |
| idle-1000 | 0 | 148008.694 | 2772.170 | 87.708 | 3012 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 6f0a8b5e40b4d9a5000000000000033d | driver.queue.scheduler-late | 36.778 | none | 2 / 32 |
| 6f0a8b5e40b4d9a5000000000000033d | driver.queue.scheduler-dispatch | 0.034 | none | 2 / 32 |

Observed active steps while trace 6f0a8b5e40b4d9a5000000000000033d waited: []

| 6f0a8b5e40b4d9a5000000000000033e | driver.queue.scheduler-late | 27.173 | none | 3 / 32 |
| 6f0a8b5e40b4d9a5000000000000033e | driver.queue.scheduler-dispatch | 0.012 | none | 3 / 32 |

Observed active steps while trace 6f0a8b5e40b4d9a5000000000000033e waited: []

| 6f0a8b5e40b4d9a50000000000000340 | driver.queue.scheduler-late | 7.355 | none | 5 / 32 |
| 6f0a8b5e40b4d9a50000000000000340 | driver.queue.scheduler-dispatch | 0.006 | none | 5 / 32 |

Observed active steps while trace 6f0a8b5e40b4d9a50000000000000340 waited: []

| 6f0a8b5e40b4d9a5000000000000033f | driver.queue.scheduler-late | 17.275 | none | 4 / 32 |
| 6f0a8b5e40b4d9a5000000000000033f | driver.queue.scheduler-dispatch | 0.007 | none | 4 / 32 |

Observed active steps while trace 6f0a8b5e40b4d9a5000000000000033f waited: []

| 6f0a8b5e40b4d9a50000000000000337 | driver.queue.scheduler-late | 0.179 | none | 1 / 32 |
| 6f0a8b5e40b4d9a50000000000000337 | driver.queue.scheduler-dispatch | 0.069 | none | 1 / 32 |

Observed active steps while trace 6f0a8b5e40b4d9a50000000000000337 waited: []

## P2 / warmup / commit (201 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.347 | 0.587 | 0.000 | 0.516 | 2.380 | n/a | 0.000 | 0.059 | 0.775 | 1.491 | 0.021 | 0.000 | 0.199 | 5.727 | 0.583 | n/a | 0.021 | 2.452 | 0.188 | 0.021 |
| p99 | 31.875 | 2.008 | 0.000 | 1.177 | 4.052 | n/a | 0.000 | 2.355 | 4.167 | 5.546 | 0.226 | 0.000 | 5.185 | 15.190 | 6.107 | n/a | 0.055 | 5.295 | 0.340 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a5000000000000026c | 46.551 | 2.299 | n/a | 0.000 | 0.039 | 0.649 | 4.340 | 0.019 | 0.000 | 0.056 | 38.590 | 0.541 | n/a | 0.017 | 2.338 | 0.050 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.087ms |
| 6f0a8b5e40b4d9a500000000000000f0 | 44.185 | 8.458 | n/a | 0.000 | 0.938 | 1.607 | 1.888 | 0.022 | 0.000 | 3.831 | 22.091 | 5.090 | n/a | 0.260 | 9.396 | 0.213 | 0.260 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 6f0a8b5e40b4d9a500000000000000f1 | 31.875 | 5.106 | n/a | 0.000 | 0.155 | 6.202 | 1.370 | 0.020 | 0.000 | 5.185 | 9.333 | 4.452 | n/a | 0.052 | 5.260 | 0.165 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 3.327ms; driver.publication.persist-deferred 0.069ms |
| 6f0a8b5e40b4d9a5000000000000010c | 25.147 | 3.358 | n/a | 0.000 | 0.924 | 3.742 | 4.455 | 0.062 | 0.000 | 0.123 | 11.566 | 0.895 | n/a | 0.022 | 4.282 | 0.170 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.197ms |
| 6f0a8b5e40b4d9a50000000000000231 | 24.309 | 2.570 | n/a | 0.000 | 0.068 | 4.281 | 1.798 | 0.043 | 0.000 | 0.119 | 8.955 | 6.449 | n/a | 0.025 | 2.638 | 0.109 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000014a | 23.720 | 3.023 | n/a | 0.000 | 0.069 | 0.785 | 3.423 | 0.020 | 0.000 | 3.028 | 11.342 | 2.006 | n/a | 0.025 | 3.092 | 0.130 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 6f0a8b5e40b4d9a5000000000000027e | 23.613 | 1.844 | n/a | 0.000 | 0.043 | 0.617 | 5.005 | 0.021 | 0.000 | 0.063 | 12.024 | 3.982 | n/a | 0.015 | 1.887 | 0.080 | 0.015 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.083ms |
| 6f0a8b5e40b4d9a50000000000000148 | 23.465 | 2.718 | n/a | 0.000 | 0.051 | 0.768 | 5.251 | 3.325 | 0.000 | 0.069 | 10.237 | 1.028 | n/a | 0.018 | 2.769 | 0.118 | 0.018 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000000f3 | 23.060 | 3.607 | n/a | 0.000 | 1.688 | 0.707 | 5.063 | 0.044 | 0.000 | 0.137 | 10.555 | 1.204 | n/a | 0.055 | 5.295 | 0.230 | 0.055 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 1.480ms; driver.publication.readback 0.143ms; driver.publication.persist-deferred 0.040ms |
| 6f0a8b5e40b4d9a5000000000000026d | 22.978 | 2.892 | n/a | 0.000 | 0.123 | 0.889 | 1.836 | 0.021 | 0.000 | 1.458 | 15.190 | 0.519 | n/a | 0.050 | 3.015 | 0.131 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.087ms; driver.publication.persist-deferred 0.029ms |
| 6f0a8b5e40b4d9a50000000000000140 | 22.515 | 3.868 | n/a | 0.000 | 0.093 | 1.026 | 6.006 | 0.045 | 0.000 | 0.134 | 7.195 | 4.121 | n/a | 0.029 | 3.960 | 0.176 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000010a | 21.980 | 2.893 | n/a | 0.000 | 0.063 | 0.980 | 4.758 | 0.040 | 0.000 | 0.133 | 7.386 | 5.705 | n/a | 0.021 | 2.957 | 0.135 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000001f0 | 20.207 | 1.974 | n/a | 0.000 | 0.065 | 0.651 | 1.501 | 0.021 | 0.000 | 6.310 | 8.669 | 0.992 | n/a | 0.023 | 2.040 | 0.101 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000001d4 | 19.242 | 3.412 | n/a | 0.000 | 0.065 | 0.978 | 1.067 | 0.019 | 0.000 | 0.082 | 12.691 | 0.905 | n/a | 0.023 | 3.477 | 0.181 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| 6f0a8b5e40b4d9a500000000000001a5 | 18.989 | 3.461 | n/a | 0.000 | 0.087 | 0.793 | 1.435 | 0.030 | 0.000 | 1.783 | 10.146 | 1.219 | n/a | 0.036 | 3.548 | 0.187 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000128 | 18.955 | 3.006 | n/a | 0.000 | 0.559 | 0.947 | 1.178 | 0.020 | 0.000 | 0.336 | 11.504 | 1.386 | n/a | 0.019 | 3.564 | 0.188 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000015e | 18.794 | 1.994 | n/a | 0.000 | 0.059 | 0.655 | 1.450 | 0.020 | 0.000 | 0.103 | 6.964 | 7.531 | n/a | 0.019 | 2.053 | 0.109 | 0.019 | tx/thread-83/transactor.triplex-function | none observed |
| 6f0a8b5e40b4d9a50000000000000209 | 18.537 | 2.623 | n/a | 0.000 | 1.442 | 0.745 | 1.081 | 0.022 | 0.000 | 0.091 | 11.493 | 1.023 | n/a | 0.018 | 4.065 | 0.219 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000000f8 | 18.457 | 2.994 | n/a | 0.000 | 0.069 | 3.958 | 5.546 | 0.084 | 0.000 | 0.920 | 4.134 | 0.725 | n/a | 0.026 | 3.063 | 0.166 | 0.026 | gw-w/thread-46/commit.prepare-and-validate | driver.reader-basis.broadcast 0.023ms |
| 6f0a8b5e40b4d9a50000000000000204 | 18.051 | 2.318 | n/a | 0.000 | 0.052 | 0.636 | 1.388 | 0.018 | 0.000 | 0.090 | 8.829 | 4.698 | n/a | 0.021 | 2.369 | 0.131 | 0.021 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.061ms |

## P2 / warmup / commit / 5-10 facts (201 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.347 | 0.587 | 0.000 | 0.516 | 2.380 | n/a | 0.000 | 0.059 | 0.775 | 1.491 | 0.021 | 0.000 | 0.199 | 5.727 | 0.583 | n/a | 0.021 | 2.452 | 0.188 | 0.021 |
| p99 | 31.875 | 2.008 | 0.000 | 1.177 | 4.052 | n/a | 0.000 | 2.355 | 4.167 | 5.546 | 0.226 | 0.000 | 5.185 | 15.190 | 6.107 | n/a | 0.055 | 5.295 | 0.340 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a5000000000000026c | 46.551 | 2.299 | n/a | 0.000 | 0.039 | 0.649 | 4.340 | 0.019 | 0.000 | 0.056 | 38.590 | 0.541 | n/a | 0.017 | 2.338 | 0.050 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.087ms |
| 6f0a8b5e40b4d9a500000000000000f0 | 44.185 | 8.458 | n/a | 0.000 | 0.938 | 1.607 | 1.888 | 0.022 | 0.000 | 3.831 | 22.091 | 5.090 | n/a | 0.260 | 9.396 | 0.213 | 0.260 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 6f0a8b5e40b4d9a500000000000000f1 | 31.875 | 5.106 | n/a | 0.000 | 0.155 | 6.202 | 1.370 | 0.020 | 0.000 | 5.185 | 9.333 | 4.452 | n/a | 0.052 | 5.260 | 0.165 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 3.327ms; driver.publication.persist-deferred 0.069ms |
| 6f0a8b5e40b4d9a5000000000000010c | 25.147 | 3.358 | n/a | 0.000 | 0.924 | 3.742 | 4.455 | 0.062 | 0.000 | 0.123 | 11.566 | 0.895 | n/a | 0.022 | 4.282 | 0.170 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.197ms |
| 6f0a8b5e40b4d9a50000000000000231 | 24.309 | 2.570 | n/a | 0.000 | 0.068 | 4.281 | 1.798 | 0.043 | 0.000 | 0.119 | 8.955 | 6.449 | n/a | 0.025 | 2.638 | 0.109 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000014a | 23.720 | 3.023 | n/a | 0.000 | 0.069 | 0.785 | 3.423 | 0.020 | 0.000 | 3.028 | 11.342 | 2.006 | n/a | 0.025 | 3.092 | 0.130 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 6f0a8b5e40b4d9a5000000000000027e | 23.613 | 1.844 | n/a | 0.000 | 0.043 | 0.617 | 5.005 | 0.021 | 0.000 | 0.063 | 12.024 | 3.982 | n/a | 0.015 | 1.887 | 0.080 | 0.015 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.083ms |
| 6f0a8b5e40b4d9a50000000000000148 | 23.465 | 2.718 | n/a | 0.000 | 0.051 | 0.768 | 5.251 | 3.325 | 0.000 | 0.069 | 10.237 | 1.028 | n/a | 0.018 | 2.769 | 0.118 | 0.018 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000000f3 | 23.060 | 3.607 | n/a | 0.000 | 1.688 | 0.707 | 5.063 | 0.044 | 0.000 | 0.137 | 10.555 | 1.204 | n/a | 0.055 | 5.295 | 0.230 | 0.055 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 1.480ms; driver.publication.readback 0.143ms; driver.publication.persist-deferred 0.040ms |
| 6f0a8b5e40b4d9a5000000000000026d | 22.978 | 2.892 | n/a | 0.000 | 0.123 | 0.889 | 1.836 | 0.021 | 0.000 | 1.458 | 15.190 | 0.519 | n/a | 0.050 | 3.015 | 0.131 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.087ms; driver.publication.persist-deferred 0.029ms |
| 6f0a8b5e40b4d9a50000000000000140 | 22.515 | 3.868 | n/a | 0.000 | 0.093 | 1.026 | 6.006 | 0.045 | 0.000 | 0.134 | 7.195 | 4.121 | n/a | 0.029 | 3.960 | 0.176 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000010a | 21.980 | 2.893 | n/a | 0.000 | 0.063 | 0.980 | 4.758 | 0.040 | 0.000 | 0.133 | 7.386 | 5.705 | n/a | 0.021 | 2.957 | 0.135 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000001f0 | 20.207 | 1.974 | n/a | 0.000 | 0.065 | 0.651 | 1.501 | 0.021 | 0.000 | 6.310 | 8.669 | 0.992 | n/a | 0.023 | 2.040 | 0.101 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000001d4 | 19.242 | 3.412 | n/a | 0.000 | 0.065 | 0.978 | 1.067 | 0.019 | 0.000 | 0.082 | 12.691 | 0.905 | n/a | 0.023 | 3.477 | 0.181 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| 6f0a8b5e40b4d9a500000000000001a5 | 18.989 | 3.461 | n/a | 0.000 | 0.087 | 0.793 | 1.435 | 0.030 | 0.000 | 1.783 | 10.146 | 1.219 | n/a | 0.036 | 3.548 | 0.187 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000128 | 18.955 | 3.006 | n/a | 0.000 | 0.559 | 0.947 | 1.178 | 0.020 | 0.000 | 0.336 | 11.504 | 1.386 | n/a | 0.019 | 3.564 | 0.188 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000015e | 18.794 | 1.994 | n/a | 0.000 | 0.059 | 0.655 | 1.450 | 0.020 | 0.000 | 0.103 | 6.964 | 7.531 | n/a | 0.019 | 2.053 | 0.109 | 0.019 | tx/thread-83/transactor.triplex-function | none observed |
| 6f0a8b5e40b4d9a50000000000000209 | 18.537 | 2.623 | n/a | 0.000 | 1.442 | 0.745 | 1.081 | 0.022 | 0.000 | 0.091 | 11.493 | 1.023 | n/a | 0.018 | 4.065 | 0.219 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000000f8 | 18.457 | 2.994 | n/a | 0.000 | 0.069 | 3.958 | 5.546 | 0.084 | 0.000 | 0.920 | 4.134 | 0.725 | n/a | 0.026 | 3.063 | 0.166 | 0.026 | gw-w/thread-46/commit.prepare-and-validate | driver.reader-basis.broadcast 0.023ms |
| 6f0a8b5e40b4d9a50000000000000204 | 18.051 | 2.318 | n/a | 0.000 | 0.052 | 0.636 | 1.388 | 0.018 | 0.000 | 0.090 | 8.829 | 4.698 | n/a | 0.021 | 2.369 | 0.131 | 0.021 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.061ms |

## P2 / idle-10 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.635 | 0.481 | 0.000 | 0.503 | 2.166 | n/a | 0.000 | 0.064 | 0.891 | 1.396 | 0.021 | 0.000 | 0.231 | 7.039 | 0.545 | n/a | 0.019 | 2.328 | 0.169 | 0.019 |
| p99 | 84.385 | 2.005 | 0.223 | 1.070 | 6.532 | n/a | 0.000 | 27.185 | 39.581 | 7.981 | 0.075 | 0.000 | 7.995 | 36.755 | 5.776 | n/a | 0.062 | 29.874 | 0.405 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a5000000000000033d | 95.854 | 2.007 | n/a | 0.000 | 36.812 | 7.172 | 6.856 | 0.061 | 0.000 | 0.065 | 38.882 | 3.984 | n/a | 0.016 | 38.819 | 0.405 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.081ms; driver.publication.readback 0.062ms; driver.publication.readback 0.052ms; driver.publication.readback 0.037ms; driver.publication.persist-deferred 0.018ms |
| 6f0a8b5e40b4d9a5000000000000033e | 84.385 | 2.689 | n/a | 0.000 | 27.185 | 5.114 | 1.208 | 0.020 | 0.000 | 10.945 | 36.755 | 0.464 | n/a | 0.007 | 29.874 | 0.354 | 0.007 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.081ms; driver.publication.readback 0.062ms; driver.publication.readback 0.052ms; driver.publication.readback 0.037ms; driver.publication.persist-deferred 0.018ms |
| 6f0a8b5e40b4d9a50000000000000340 | 81.230 | 6.532 | n/a | 0.000 | 7.361 | 25.747 | 8.651 | 0.028 | 15.841 | 7.249 | 9.457 | 0.361 | n/a | 0.005 | 13.893 | 0.171 | 0.005 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.223ms; driver.publication.readback 0.110ms; driver.publication.persist-deferred 0.098ms; driver.reader-basis.broadcast 0.081ms; driver.publication.readback 0.064ms |
| 6f0a8b5e40b4d9a5000000000000033f | 76.401 | 2.954 | n/a | 0.000 | 17.282 | 17.453 | 1.613 | 0.031 | 0.000 | 0.098 | 36.607 | 0.358 | n/a | 0.006 | 20.236 | 0.265 | 0.006 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.081ms; driver.publication.readback 0.062ms; driver.publication.readback 0.052ms; driver.publication.readback 0.037ms; driver.publication.persist-deferred 0.018ms |
| 6f0a8b5e40b4d9a50000000000000337 | 65.153 | 3.624 | n/a | 0.000 | 0.247 | 48.824 | 2.547 | 0.021 | 0.000 | 1.067 | 7.974 | 0.813 | n/a | 0.035 | 3.872 | 0.059 | 0.035 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.151ms; driver.reader-basis.broadcast 0.081ms; driver.publication.persist-deferred 0.023ms |
| 6f0a8b5e40b4d9a50000000000000344 | 60.543 | 1.315 | n/a | 0.000 | 0.026 | 39.581 | 7.684 | 0.008 | 0.000 | 0.032 | 11.159 | 0.726 | n/a | 0.012 | 1.341 | 0.022 | 0.012 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.223ms; driver.publication.readback 0.110ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.064ms; driver.publication.readback 0.062ms |
| 6f0a8b5e40b4d9a50000000000000339 | 55.802 | 2.329 | n/a | 0.000 | 0.120 | 35.710 | 2.213 | 0.045 | 0.000 | 3.120 | 11.567 | 0.671 | n/a | 0.028 | 2.448 | 0.044 | 0.028 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.151ms; driver.reader-basis.broadcast 0.081ms |
| 6f0a8b5e40b4d9a50000000000000343 | 45.363 | 1.735 | n/a | 0.000 | 5.915 | 2.457 | 1.669 | 0.045 | 0.000 | 7.995 | 24.464 | 1.074 | n/a | 0.010 | 7.649 | 0.169 | 0.010 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.081ms; driver.publication.readback 0.062ms; driver.publication.readback 0.037ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.004ms |
| 6f0a8b5e40b4d9a50000000000000346 | 39.373 | 2.371 | n/a | 0.000 | 0.772 | 23.656 | 1.536 | 0.023 | 0.000 | 0.063 | 10.467 | 0.447 | n/a | 0.038 | 3.143 | 0.080 | 0.038 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.223ms; driver.publication.readback 0.110ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.064ms; driver.publication.readback 0.052ms |
| 6f0a8b5e40b4d9a50000000000000322 | 38.287 | 2.471 | n/a | 0.000 | 8.777 | 2.622 | 1.437 | 0.025 | 0.000 | 2.155 | 15.007 | 5.776 | n/a | 0.017 | 11.248 | 0.294 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.020ms; driver.publication.readback 0.018ms |
| 6f0a8b5e40b4d9a50000000000000345 | 35.296 | 1.519 | n/a | 0.000 | 0.049 | 22.465 | 0.642 | 0.023 | 0.000 | 0.067 | 10.118 | 0.394 | n/a | 0.019 | 1.568 | 0.044 | 0.019 | node-14/thread-0/socket.queue-and-write | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.018ms |
| 6f0a8b5e40b4d9a500000000000002a5 | 32.275 | 3.101 | n/a | 0.000 | 0.099 | 11.689 | 1.108 | 0.010 | 0.000 | 0.029 | 12.740 | 3.458 | n/a | 0.040 | 3.200 | 0.099 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.034ms; driver.publication.readback 0.030ms; driver.publication.persist-deferred 0.025ms |
| 6f0a8b5e40b4d9a50000000000000347 | 30.020 | 1.487 | n/a | 0.000 | 0.056 | 11.795 | 5.549 | 0.016 | 0.000 | 0.075 | 10.665 | 0.356 | n/a | 0.021 | 1.543 | 0.051 | 0.021 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.223ms; driver.publication.readback 0.110ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.064ms; driver.publication.readback 0.052ms |
| 6f0a8b5e40b4d9a50000000000000324 | 29.388 | 2.267 | n/a | 0.000 | 2.132 | 1.453 | 1.077 | 0.019 | 0.000 | 0.343 | 21.684 | 0.403 | n/a | 0.011 | 4.399 | 0.150 | 0.011 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.019ms |
| 6f0a8b5e40b4d9a50000000000000356 | 28.077 | 1.956 | n/a | 0.000 | 0.055 | 0.485 | 7.981 | 0.016 | 0.000 | 0.286 | 16.347 | 0.925 | n/a | 0.026 | 2.011 | 0.072 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.086ms; driver.publication.readback 0.076ms; driver.publication.persist-deferred 0.016ms |
| 6f0a8b5e40b4d9a500000000000002dc | 27.717 | 1.630 | n/a | 0.000 | 0.042 | 1.291 | 0.782 | 0.018 | 0.000 | 0.066 | 16.856 | 7.015 | n/a | 0.017 | 1.672 | 0.060 | 0.017 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.122ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.013ms |
| 6f0a8b5e40b4d9a50000000000000315 | 27.470 | 3.506 | n/a | 0.000 | 0.128 | 1.078 | 1.039 | 0.028 | 0.000 | 1.065 | 18.465 | 2.135 | n/a | 0.026 | 3.634 | 0.132 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.100ms; driver.publication.readback 0.075ms; driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.014ms |
| 6f0a8b5e40b4d9a5000000000000032a | 26.381 | 3.067 | n/a | 0.000 | 0.059 | 8.942 | 1.590 | 0.022 | 0.000 | 2.395 | 9.626 | 0.654 | n/a | 0.025 | 3.126 | 0.119 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.138ms; driver.publication.readback 0.067ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.026ms; driver.publication.persist-deferred 0.019ms |
| 6f0a8b5e40b4d9a50000000000000314 | 26.361 | 2.203 | n/a | 0.000 | 0.484 | 0.766 | 2.262 | 0.026 | 0.000 | 0.114 | 19.313 | 1.167 | n/a | 0.025 | 2.687 | 0.102 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.014ms |
| 6f0a8b5e40b4d9a50000000000000349 | 25.631 | 2.168 | n/a | 0.000 | 0.054 | 7.393 | 2.776 | 0.015 | 0.000 | 0.487 | 11.595 | 1.116 | n/a | 0.027 | 2.222 | 0.087 | 0.027 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.390ms; driver.publication.readback 0.223ms; driver.publication.readback 0.110ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.064ms |

## P2 / idle-10 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.635 | 0.481 | 0.000 | 0.503 | 2.166 | n/a | 0.000 | 0.064 | 0.891 | 1.396 | 0.021 | 0.000 | 0.231 | 7.039 | 0.545 | n/a | 0.019 | 2.328 | 0.169 | 0.019 |
| p99 | 84.385 | 2.005 | 0.223 | 1.070 | 6.532 | n/a | 0.000 | 27.185 | 39.581 | 7.981 | 0.075 | 0.000 | 7.995 | 36.755 | 5.776 | n/a | 0.062 | 29.874 | 0.405 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a5000000000000033d | 95.854 | 2.007 | n/a | 0.000 | 36.812 | 7.172 | 6.856 | 0.061 | 0.000 | 0.065 | 38.882 | 3.984 | n/a | 0.016 | 38.819 | 0.405 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.081ms; driver.publication.readback 0.062ms; driver.publication.readback 0.052ms; driver.publication.readback 0.037ms; driver.publication.persist-deferred 0.018ms |
| 6f0a8b5e40b4d9a5000000000000033e | 84.385 | 2.689 | n/a | 0.000 | 27.185 | 5.114 | 1.208 | 0.020 | 0.000 | 10.945 | 36.755 | 0.464 | n/a | 0.007 | 29.874 | 0.354 | 0.007 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.081ms; driver.publication.readback 0.062ms; driver.publication.readback 0.052ms; driver.publication.readback 0.037ms; driver.publication.persist-deferred 0.018ms |
| 6f0a8b5e40b4d9a50000000000000340 | 81.230 | 6.532 | n/a | 0.000 | 7.361 | 25.747 | 8.651 | 0.028 | 15.841 | 7.249 | 9.457 | 0.361 | n/a | 0.005 | 13.893 | 0.171 | 0.005 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.223ms; driver.publication.readback 0.110ms; driver.publication.persist-deferred 0.098ms; driver.reader-basis.broadcast 0.081ms; driver.publication.readback 0.064ms |
| 6f0a8b5e40b4d9a5000000000000033f | 76.401 | 2.954 | n/a | 0.000 | 17.282 | 17.453 | 1.613 | 0.031 | 0.000 | 0.098 | 36.607 | 0.358 | n/a | 0.006 | 20.236 | 0.265 | 0.006 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.081ms; driver.publication.readback 0.062ms; driver.publication.readback 0.052ms; driver.publication.readback 0.037ms; driver.publication.persist-deferred 0.018ms |
| 6f0a8b5e40b4d9a50000000000000337 | 65.153 | 3.624 | n/a | 0.000 | 0.247 | 48.824 | 2.547 | 0.021 | 0.000 | 1.067 | 7.974 | 0.813 | n/a | 0.035 | 3.872 | 0.059 | 0.035 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.151ms; driver.reader-basis.broadcast 0.081ms; driver.publication.persist-deferred 0.023ms |
| 6f0a8b5e40b4d9a50000000000000344 | 60.543 | 1.315 | n/a | 0.000 | 0.026 | 39.581 | 7.684 | 0.008 | 0.000 | 0.032 | 11.159 | 0.726 | n/a | 0.012 | 1.341 | 0.022 | 0.012 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.223ms; driver.publication.readback 0.110ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.064ms; driver.publication.readback 0.062ms |
| 6f0a8b5e40b4d9a50000000000000339 | 55.802 | 2.329 | n/a | 0.000 | 0.120 | 35.710 | 2.213 | 0.045 | 0.000 | 3.120 | 11.567 | 0.671 | n/a | 0.028 | 2.448 | 0.044 | 0.028 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.151ms; driver.reader-basis.broadcast 0.081ms |
| 6f0a8b5e40b4d9a50000000000000343 | 45.363 | 1.735 | n/a | 0.000 | 5.915 | 2.457 | 1.669 | 0.045 | 0.000 | 7.995 | 24.464 | 1.074 | n/a | 0.010 | 7.649 | 0.169 | 0.010 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.081ms; driver.publication.readback 0.062ms; driver.publication.readback 0.037ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.004ms |
| 6f0a8b5e40b4d9a50000000000000346 | 39.373 | 2.371 | n/a | 0.000 | 0.772 | 23.656 | 1.536 | 0.023 | 0.000 | 0.063 | 10.467 | 0.447 | n/a | 0.038 | 3.143 | 0.080 | 0.038 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.223ms; driver.publication.readback 0.110ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.064ms; driver.publication.readback 0.052ms |
| 6f0a8b5e40b4d9a50000000000000322 | 38.287 | 2.471 | n/a | 0.000 | 8.777 | 2.622 | 1.437 | 0.025 | 0.000 | 2.155 | 15.007 | 5.776 | n/a | 0.017 | 11.248 | 0.294 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.020ms; driver.publication.readback 0.018ms |
| 6f0a8b5e40b4d9a50000000000000345 | 35.296 | 1.519 | n/a | 0.000 | 0.049 | 22.465 | 0.642 | 0.023 | 0.000 | 0.067 | 10.118 | 0.394 | n/a | 0.019 | 1.568 | 0.044 | 0.019 | node-14/thread-0/socket.queue-and-write | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.018ms |
| 6f0a8b5e40b4d9a500000000000002a5 | 32.275 | 3.101 | n/a | 0.000 | 0.099 | 11.689 | 1.108 | 0.010 | 0.000 | 0.029 | 12.740 | 3.458 | n/a | 0.040 | 3.200 | 0.099 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.034ms; driver.publication.readback 0.030ms; driver.publication.persist-deferred 0.025ms |
| 6f0a8b5e40b4d9a50000000000000347 | 30.020 | 1.487 | n/a | 0.000 | 0.056 | 11.795 | 5.549 | 0.016 | 0.000 | 0.075 | 10.665 | 0.356 | n/a | 0.021 | 1.543 | 0.051 | 0.021 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.223ms; driver.publication.readback 0.110ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.064ms; driver.publication.readback 0.052ms |
| 6f0a8b5e40b4d9a50000000000000324 | 29.388 | 2.267 | n/a | 0.000 | 2.132 | 1.453 | 1.077 | 0.019 | 0.000 | 0.343 | 21.684 | 0.403 | n/a | 0.011 | 4.399 | 0.150 | 0.011 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.019ms |
| 6f0a8b5e40b4d9a50000000000000356 | 28.077 | 1.956 | n/a | 0.000 | 0.055 | 0.485 | 7.981 | 0.016 | 0.000 | 0.286 | 16.347 | 0.925 | n/a | 0.026 | 2.011 | 0.072 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.086ms; driver.publication.readback 0.076ms; driver.publication.persist-deferred 0.016ms |
| 6f0a8b5e40b4d9a500000000000002dc | 27.717 | 1.630 | n/a | 0.000 | 0.042 | 1.291 | 0.782 | 0.018 | 0.000 | 0.066 | 16.856 | 7.015 | n/a | 0.017 | 1.672 | 0.060 | 0.017 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.122ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.013ms |
| 6f0a8b5e40b4d9a50000000000000315 | 27.470 | 3.506 | n/a | 0.000 | 0.128 | 1.078 | 1.039 | 0.028 | 0.000 | 1.065 | 18.465 | 2.135 | n/a | 0.026 | 3.634 | 0.132 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.100ms; driver.publication.readback 0.075ms; driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.014ms |
| 6f0a8b5e40b4d9a5000000000000032a | 26.381 | 3.067 | n/a | 0.000 | 0.059 | 8.942 | 1.590 | 0.022 | 0.000 | 2.395 | 9.626 | 0.654 | n/a | 0.025 | 3.126 | 0.119 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.138ms; driver.publication.readback 0.067ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.026ms; driver.publication.persist-deferred 0.019ms |
| 6f0a8b5e40b4d9a50000000000000314 | 26.361 | 2.203 | n/a | 0.000 | 0.484 | 0.766 | 2.262 | 0.026 | 0.000 | 0.114 | 19.313 | 1.167 | n/a | 0.025 | 2.687 | 0.102 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.014ms |
| 6f0a8b5e40b4d9a50000000000000349 | 25.631 | 2.168 | n/a | 0.000 | 0.054 | 7.393 | 2.776 | 0.015 | 0.000 | 0.487 | 11.595 | 1.116 | n/a | 0.027 | 2.222 | 0.087 | 0.027 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.390ms; driver.publication.readback 0.223ms; driver.publication.readback 0.110ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.064ms |

## P2/P4 / read-your-own-write / read (25 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 88.408 | n/a | n/a | n/a | 25.036 | 44.178 | 0.000 | 0.000 | 7.781 | 0.936 | 0.004 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.010 | 74.784 | 0.879 | 0.010 |
| p99 | 140.261 | n/a | n/a | n/a | 39.064 | 102.092 | 7.864 | 0.000 | 65.276 | 11.096 | 7.419 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.024 | 125.208 | 1.000 | 0.024 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a50000000000000318 | 140.261 | 23.115 | 102.092 | 0.000 | 0.000 | 14.066 | 0.961 | 0.005 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.010 | 125.208 | 0.893 | 0.010 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.readback 0.151ms; driver.publication.readback 0.138ms; driver.reader-basis.broadcast 0.100ms; driver.publication.readback 0.085ms; driver.publication.readback 0.075ms |
| 6f0a8b5e40b4d9a5000000000000030f | 139.306 | 27.844 | 44.178 | 0.000 | 0.000 | 65.276 | 1.948 | 0.015 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.012 | 72.022 | 0.517 | 0.012 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.138ms; driver.reader-basis.broadcast 0.100ms; driver.publication.readback 0.085ms; driver.publication.readback 0.075ms; driver.publication.readback 0.073ms |
| 6f0a8b5e40b4d9a5000000000000031a | 129.208 | 22.635 | 61.876 | 0.000 | 0.000 | 43.206 | 1.466 | 0.004 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.014 | 84.511 | 0.654 | 0.014 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.readback 0.151ms; driver.publication.readback 0.138ms; driver.publication.readback 0.085ms; driver.publication.readback 0.067ms; driver.publication.readback 0.066ms |
| 6f0a8b5e40b4d9a50000000000000323 | 114.634 | 19.080 | 86.807 | 2.620 | 0.000 | 5.268 | 0.825 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.008 | 108.507 | 0.947 | 0.008 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.readback 0.151ms; driver.publication.readback 0.138ms; driver.publication.readback 0.085ms; driver.publication.readback 0.067ms; driver.publication.readback 0.066ms |
| 6f0a8b5e40b4d9a50000000000000311 | 110.001 | 32.571 | 42.213 | 0.000 | 0.000 | 34.341 | 0.849 | 0.003 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.009 | 74.784 | 0.680 | 0.009 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.100ms; driver.publication.readback 0.075ms; driver.publication.readback 0.073ms; driver.publication.readback 0.067ms; driver.publication.readback 0.066ms |
| 6f0a8b5e40b4d9a50000000000000316 | 109.970 | 30.974 | 43.082 | 1.740 | 0.000 | 23.044 | 11.096 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.010 | 75.796 | 0.689 | 0.010 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.151ms; driver.publication.readback 0.138ms; driver.reader-basis.broadcast 0.100ms; driver.publication.readback 0.085ms; driver.publication.readback 0.075ms |
| 6f0a8b5e40b4d9a50000000000000306 | 106.959 | 31.291 | 70.889 | 0.000 | 0.000 | 3.984 | 0.767 | 0.004 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.010 | 102.181 | 0.955 | 0.010 | node-14/thread-0/rpc.replica.observe | driver.reader-basis.broadcast 0.100ms; driver.publication.readback 0.075ms; driver.publication.readback 0.073ms; driver.publication.readback 0.071ms; driver.publication.readback 0.069ms |
| 6f0a8b5e40b4d9a5000000000000030e | 105.738 | 31.455 | 44.791 | 5.913 | 0.000 | 22.847 | 0.707 | 0.004 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.014 | 82.158 | 0.777 | 0.014 | node-14/thread-0/rpc.replica.observe | driver.reader-basis.broadcast 0.100ms; driver.publication.readback 0.075ms; driver.publication.readback 0.073ms; driver.publication.readback 0.071ms; driver.publication.readback 0.066ms |
| 6f0a8b5e40b4d9a5000000000000030c | 102.014 | 33.163 | 51.633 | 0.000 | 0.000 | 16.293 | 0.896 | 0.004 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.011 | 84.796 | 0.831 | 0.011 | node-14/thread-0/rpc.replica.observe | driver.reader-basis.broadcast 0.100ms; driver.publication.readback 0.075ms; driver.publication.readback 0.073ms; driver.publication.readback 0.071ms; driver.publication.readback 0.066ms |
| 6f0a8b5e40b4d9a50000000000000304 | 96.750 | 25.036 | 71.705 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 96.740 | 1.000 | 0.010 | node-14/thread-0/rpc.replica.observe | driver.reader-basis.broadcast 0.100ms; driver.publication.readback 0.075ms; driver.publication.readback 0.073ms; driver.publication.readback 0.071ms; driver.publication.readback 0.069ms |
| 6f0a8b5e40b4d9a50000000000000313 | 92.671 | 27.559 | 48.894 | 0.739 | 0.000 | 13.694 | 1.746 | 0.007 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.010 | 77.191 | 0.833 | 0.010 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.100ms; driver.publication.readback 0.075ms; driver.publication.readback 0.073ms; driver.publication.readback 0.067ms; driver.publication.readback 0.066ms |
| 6f0a8b5e40b4d9a50000000000000303 | 89.122 | 34.045 | 7.963 | 1.278 | 0.000 | 36.475 | 2.832 | 6.507 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.009 | 43.287 | 0.486 | 0.009 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.122ms; driver.publication.readback 0.073ms; driver.publication.readback 0.071ms; driver.publication.readback 0.069ms; driver.publication.readback 0.065ms |
| 6f0a8b5e40b4d9a5000000000000032b | 88.408 | 12.458 | 60.458 | 3.663 | 0.000 | 6.205 | 0.707 | 4.897 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.009 | 76.579 | 0.866 | 0.009 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.readback 0.151ms; driver.publication.readback 0.138ms; driver.publication.readback 0.085ms; driver.publication.readback 0.067ms; driver.publication.readback 0.058ms |
| 6f0a8b5e40b4d9a5000000000000032c | 87.300 | 12.226 | 66.536 | 0.000 | 0.000 | 7.781 | 0.730 | 0.004 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.007 | 78.762 | 0.902 | 0.007 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.readback 0.151ms; driver.publication.readback 0.138ms; driver.publication.readback 0.085ms; driver.publication.readback 0.067ms; driver.publication.readback 0.058ms |
| 6f0a8b5e40b4d9a500000000000002fd | 84.149 | 35.390 | 38.955 | 1.764 | 0.000 | 0.863 | 7.148 | 0.004 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.011 | 76.109 | 0.904 | 0.011 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.344ms; driver.publication.readback 0.122ms; driver.publication.readback 0.107ms; driver.reader-basis.broadcast 0.089ms; driver.publication.readback 0.071ms |
| 6f0a8b5e40b4d9a5000000000000032d | 81.891 | 39.064 | 12.893 | 6.087 | 0.000 | 16.385 | 7.439 | 0.003 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.010 | 58.043 | 0.709 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.151ms; driver.publication.readback 0.138ms; driver.publication.readback 0.085ms; driver.publication.readback 0.058ms; driver.publication.readback 0.057ms |
| 6f0a8b5e40b4d9a50000000000000336 | 78.523 | 25.287 | 43.786 | 0.000 | 0.000 | 4.063 | 5.355 | 0.010 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.009 | 69.073 | 0.880 | 0.009 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.151ms; driver.reader-basis.broadcast 0.081ms; driver.publication.readback 0.057ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.023ms |
| 6f0a8b5e40b4d9a50000000000000321 | 70.608 | 27.860 | 26.345 | 7.864 | 0.000 | 5.480 | 3.024 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.009 | 62.070 | 0.879 | 0.009 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.readback 0.138ms; driver.publication.readback 0.085ms; driver.publication.readback 0.067ms; driver.publication.readback 0.066ms; driver.publication.readback 0.059ms |
| 6f0a8b5e40b4d9a50000000000000301 | 70.232 | 21.732 | 14.303 | 0.932 | 0.000 | 24.593 | 1.233 | 7.419 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.010 | 36.967 | 0.526 | 0.010 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.122ms; driver.reader-basis.broadcast 0.089ms; driver.publication.readback 0.071ms; driver.publication.readback 0.069ms; driver.publication.readback 0.064ms |
| 6f0a8b5e40b4d9a50000000000000333 | 69.910 | 19.464 | 50.424 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 69.888 | 1.000 | 0.022 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.151ms; driver.publication.readback 0.085ms; driver.publication.readback 0.057ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.034ms |

## P2 / idle-25 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.247 | 0.597 | 0.000 | 0.490 | 2.121 | n/a | 0.000 | 0.049 | 0.665 | 1.122 | 0.016 | 0.000 | 0.256 | 4.391 | 0.452 | n/a | 0.019 | 2.243 | 0.219 | 0.019 |
| p99 | 19.679 | 2.282 | 0.064 | 0.938 | 3.785 | n/a | 0.000 | 2.037 | 4.181 | 5.439 | 0.050 | 0.000 | 3.727 | 13.018 | 3.454 | n/a | 0.044 | 5.314 | 0.413 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a5000000000000046d | 29.822 | 1.990 | n/a | 0.000 | 0.052 | 0.910 | 1.526 | 0.028 | 0.000 | 0.629 | 24.220 | 0.449 | n/a | 0.019 | 2.042 | 0.068 | 0.019 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000403 | 19.679 | 2.120 | n/a | 0.000 | 0.306 | 0.841 | 1.981 | 0.036 | 0.000 | 1.451 | 12.023 | 0.901 | n/a | 0.019 | 2.426 | 0.123 | 0.019 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000004e4 | 18.485 | 2.448 | n/a | 0.000 | 0.048 | 0.690 | 1.032 | 0.015 | 0.000 | 0.327 | 13.018 | 0.886 | n/a | 0.022 | 2.496 | 0.135 | 0.022 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000044a | 16.771 | 2.936 | n/a | 0.000 | 0.080 | 0.689 | 4.963 | 0.031 | 0.000 | 0.162 | 7.406 | 0.476 | n/a | 0.028 | 3.016 | 0.180 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000003f9 | 16.304 | 2.055 | n/a | 0.000 | 0.049 | 0.659 | 1.007 | 0.015 | 0.000 | 0.051 | 11.983 | 0.467 | n/a | 0.018 | 2.104 | 0.129 | 0.018 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000004de | 16.115 | 1.720 | n/a | 0.000 | 0.035 | 0.662 | 3.508 | 0.027 | 0.000 | 0.095 | 9.174 | 0.878 | n/a | 0.016 | 1.755 | 0.109 | 0.016 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000442 | 16.058 | 2.330 | n/a | 0.000 | 0.095 | 0.574 | 1.087 | 0.015 | 0.000 | 0.367 | 10.969 | 0.588 | n/a | 0.032 | 2.425 | 0.151 | 0.032 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000003e3 | 15.873 | 3.052 | n/a | 0.000 | 0.084 | 4.181 | 1.747 | 0.031 | 0.000 | 0.106 | 6.186 | 0.453 | n/a | 0.033 | 3.136 | 0.198 | 0.033 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000487 | 15.653 | 2.563 | n/a | 0.000 | 0.084 | 0.747 | 1.644 | 0.015 | 0.000 | 0.329 | 9.324 | 0.918 | n/a | 0.029 | 2.647 | 0.169 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000454 | 15.384 | 2.046 | n/a | 0.000 | 1.763 | 0.594 | 4.909 | 0.014 | 0.000 | 0.052 | 5.041 | 0.952 | n/a | 0.013 | 3.809 | 0.248 | 0.013 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000004ce | 15.196 | 1.731 | n/a | 0.000 | 0.043 | 0.506 | 4.372 | 0.021 | 0.000 | 3.533 | 4.552 | 0.424 | n/a | 0.016 | 1.773 | 0.117 | 0.016 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000004c2 | 14.769 | 2.145 | n/a | 0.000 | 2.451 | 0.818 | 1.825 | 0.041 | 0.000 | 0.719 | 6.263 | 0.486 | n/a | 0.022 | 4.596 | 0.311 | 0.022 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000004cc | 14.553 | 2.321 | n/a | 0.000 | 0.036 | 0.513 | 1.183 | 0.014 | 0.000 | 0.333 | 9.098 | 1.042 | n/a | 0.013 | 2.356 | 0.162 | 0.013 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000040b | 14.473 | 1.766 | n/a | 0.000 | 0.048 | 0.562 | 1.945 | 0.015 | 0.000 | 3.709 | 5.544 | 0.866 | n/a | 0.019 | 1.814 | 0.125 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000004e6 | 14.458 | 1.715 | n/a | 0.000 | 0.044 | 0.407 | 1.104 | 0.015 | 0.000 | 0.343 | 9.965 | 0.849 | n/a | 0.016 | 1.759 | 0.122 | 0.016 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000424 | 14.439 | 1.810 | n/a | 0.000 | 0.047 | 0.540 | 5.528 | 0.029 | 0.000 | 0.092 | 5.488 | 0.885 | n/a | 0.020 | 1.857 | 0.129 | 0.020 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000483 | 14.426 | 2.448 | n/a | 0.000 | 0.052 | 0.751 | 1.143 | 0.017 | 0.000 | 0.127 | 9.031 | 0.838 | n/a | 0.020 | 2.500 | 0.173 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000467 | 14.319 | 2.072 | n/a | 0.000 | 0.032 | 0.499 | 3.290 | 0.040 | 0.000 | 0.090 | 7.806 | 0.476 | n/a | 0.014 | 2.104 | 0.147 | 0.014 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000045a | 14.243 | 2.641 | n/a | 0.000 | 0.075 | 0.810 | 5.439 | 0.031 | 0.000 | 0.094 | 4.742 | 0.382 | n/a | 0.030 | 2.716 | 0.191 | 0.030 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000477 | 14.237 | 2.628 | n/a | 0.000 | 0.088 | 0.695 | 4.031 | 0.036 | 0.000 | 0.532 | 5.327 | 0.866 | n/a | 0.033 | 2.717 | 0.191 | 0.033 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-25 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.247 | 0.597 | 0.000 | 0.490 | 2.121 | n/a | 0.000 | 0.049 | 0.665 | 1.122 | 0.016 | 0.000 | 0.256 | 4.391 | 0.452 | n/a | 0.019 | 2.243 | 0.219 | 0.019 |
| p99 | 19.679 | 2.282 | 0.064 | 0.938 | 3.785 | n/a | 0.000 | 2.037 | 4.181 | 5.439 | 0.050 | 0.000 | 3.727 | 13.018 | 3.454 | n/a | 0.044 | 5.314 | 0.413 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a5000000000000046d | 29.822 | 1.990 | n/a | 0.000 | 0.052 | 0.910 | 1.526 | 0.028 | 0.000 | 0.629 | 24.220 | 0.449 | n/a | 0.019 | 2.042 | 0.068 | 0.019 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000403 | 19.679 | 2.120 | n/a | 0.000 | 0.306 | 0.841 | 1.981 | 0.036 | 0.000 | 1.451 | 12.023 | 0.901 | n/a | 0.019 | 2.426 | 0.123 | 0.019 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000004e4 | 18.485 | 2.448 | n/a | 0.000 | 0.048 | 0.690 | 1.032 | 0.015 | 0.000 | 0.327 | 13.018 | 0.886 | n/a | 0.022 | 2.496 | 0.135 | 0.022 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000044a | 16.771 | 2.936 | n/a | 0.000 | 0.080 | 0.689 | 4.963 | 0.031 | 0.000 | 0.162 | 7.406 | 0.476 | n/a | 0.028 | 3.016 | 0.180 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000003f9 | 16.304 | 2.055 | n/a | 0.000 | 0.049 | 0.659 | 1.007 | 0.015 | 0.000 | 0.051 | 11.983 | 0.467 | n/a | 0.018 | 2.104 | 0.129 | 0.018 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000004de | 16.115 | 1.720 | n/a | 0.000 | 0.035 | 0.662 | 3.508 | 0.027 | 0.000 | 0.095 | 9.174 | 0.878 | n/a | 0.016 | 1.755 | 0.109 | 0.016 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000442 | 16.058 | 2.330 | n/a | 0.000 | 0.095 | 0.574 | 1.087 | 0.015 | 0.000 | 0.367 | 10.969 | 0.588 | n/a | 0.032 | 2.425 | 0.151 | 0.032 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000003e3 | 15.873 | 3.052 | n/a | 0.000 | 0.084 | 4.181 | 1.747 | 0.031 | 0.000 | 0.106 | 6.186 | 0.453 | n/a | 0.033 | 3.136 | 0.198 | 0.033 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000487 | 15.653 | 2.563 | n/a | 0.000 | 0.084 | 0.747 | 1.644 | 0.015 | 0.000 | 0.329 | 9.324 | 0.918 | n/a | 0.029 | 2.647 | 0.169 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000454 | 15.384 | 2.046 | n/a | 0.000 | 1.763 | 0.594 | 4.909 | 0.014 | 0.000 | 0.052 | 5.041 | 0.952 | n/a | 0.013 | 3.809 | 0.248 | 0.013 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000004ce | 15.196 | 1.731 | n/a | 0.000 | 0.043 | 0.506 | 4.372 | 0.021 | 0.000 | 3.533 | 4.552 | 0.424 | n/a | 0.016 | 1.773 | 0.117 | 0.016 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000004c2 | 14.769 | 2.145 | n/a | 0.000 | 2.451 | 0.818 | 1.825 | 0.041 | 0.000 | 0.719 | 6.263 | 0.486 | n/a | 0.022 | 4.596 | 0.311 | 0.022 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000004cc | 14.553 | 2.321 | n/a | 0.000 | 0.036 | 0.513 | 1.183 | 0.014 | 0.000 | 0.333 | 9.098 | 1.042 | n/a | 0.013 | 2.356 | 0.162 | 0.013 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000040b | 14.473 | 1.766 | n/a | 0.000 | 0.048 | 0.562 | 1.945 | 0.015 | 0.000 | 3.709 | 5.544 | 0.866 | n/a | 0.019 | 1.814 | 0.125 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000004e6 | 14.458 | 1.715 | n/a | 0.000 | 0.044 | 0.407 | 1.104 | 0.015 | 0.000 | 0.343 | 9.965 | 0.849 | n/a | 0.016 | 1.759 | 0.122 | 0.016 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000424 | 14.439 | 1.810 | n/a | 0.000 | 0.047 | 0.540 | 5.528 | 0.029 | 0.000 | 0.092 | 5.488 | 0.885 | n/a | 0.020 | 1.857 | 0.129 | 0.020 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000483 | 14.426 | 2.448 | n/a | 0.000 | 0.052 | 0.751 | 1.143 | 0.017 | 0.000 | 0.127 | 9.031 | 0.838 | n/a | 0.020 | 2.500 | 0.173 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000467 | 14.319 | 2.072 | n/a | 0.000 | 0.032 | 0.499 | 3.290 | 0.040 | 0.000 | 0.090 | 7.806 | 0.476 | n/a | 0.014 | 2.104 | 0.147 | 0.014 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000045a | 14.243 | 2.641 | n/a | 0.000 | 0.075 | 0.810 | 5.439 | 0.031 | 0.000 | 0.094 | 4.742 | 0.382 | n/a | 0.030 | 2.716 | 0.191 | 0.030 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000477 | 14.237 | 2.628 | n/a | 0.000 | 0.088 | 0.695 | 4.031 | 0.036 | 0.000 | 0.532 | 5.327 | 0.866 | n/a | 0.033 | 2.717 | 0.191 | 0.033 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-50 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.629 | 0.000 | 0.000 | 0.516 | 2.145 | n/a | 0.000 | 0.052 | 0.641 | 1.060 | 0.015 | 0.000 | 0.138 | 4.125 | 0.444 | n/a | 0.021 | 2.219 | 0.242 | 0.021 |
| p99 | 15.878 | 2.004 | 0.000 | 1.354 | 3.929 | n/a | 0.000 | 1.883 | 4.033 | 5.039 | 0.048 | 0.000 | 3.639 | 8.780 | 1.035 | n/a | 0.052 | 4.573 | 0.435 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a500000000000005e3 | 17.321 | 2.749 | n/a | 0.000 | 0.094 | 4.158 | 1.567 | 0.023 | 0.000 | 0.169 | 8.081 | 0.446 | n/a | 0.034 | 2.842 | 0.164 | 0.034 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000050e | 15.878 | 1.812 | n/a | 0.000 | 0.058 | 0.552 | 1.225 | 0.016 | 0.000 | 3.639 | 4.633 | 3.923 | n/a | 0.020 | 1.870 | 0.118 | 0.020 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000005d5 | 15.731 | 3.303 | n/a | 0.000 | 0.095 | 0.890 | 4.679 | 0.021 | 0.000 | 0.083 | 6.189 | 0.436 | n/a | 0.034 | 3.398 | 0.216 | 0.034 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000595 | 15.667 | 2.635 | n/a | 0.000 | 0.082 | 0.643 | 1.135 | 0.011 | 0.000 | 0.101 | 10.164 | 0.865 | n/a | 0.031 | 2.718 | 0.173 | 0.031 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000005e9 | 15.445 | 1.758 | n/a | 0.000 | 0.050 | 0.529 | 4.924 | 0.022 | 0.000 | 0.160 | 7.274 | 0.711 | n/a | 0.018 | 1.807 | 0.117 | 0.018 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000005aa | 14.898 | 2.789 | n/a | 0.000 | 0.898 | 0.862 | 0.970 | 0.011 | 0.000 | 0.084 | 8.780 | 0.487 | n/a | 0.017 | 3.687 | 0.247 | 0.017 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000057f | 14.477 | 2.558 | n/a | 0.000 | 1.053 | 0.662 | 1.069 | 0.011 | 0.000 | 0.360 | 7.953 | 0.794 | n/a | 0.017 | 3.611 | 0.249 | 0.017 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000056c | 13.927 | 1.774 | n/a | 0.000 | 0.042 | 0.468 | 4.093 | 0.045 | 0.000 | 0.089 | 6.979 | 0.418 | n/a | 0.019 | 1.815 | 0.130 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000005df | 13.783 | 2.175 | n/a | 0.000 | 0.111 | 2.081 | 1.619 | 0.022 | 0.000 | 0.529 | 6.745 | 0.433 | n/a | 0.069 | 2.286 | 0.166 | 0.069 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000005c4 | 13.586 | 2.577 | n/a | 0.000 | 0.826 | 0.843 | 5.227 | 0.020 | 0.000 | 0.106 | 3.507 | 0.465 | n/a | 0.015 | 3.403 | 0.250 | 0.015 | gw-w/thread-51/commit.prepare-and-validate | none observed |
| 6f0a8b5e40b4d9a5000000000000057a | 13.561 | 1.697 | n/a | 0.000 | 0.050 | 3.225 | 1.061 | 0.012 | 0.000 | 0.069 | 6.954 | 0.472 | n/a | 0.021 | 1.747 | 0.129 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000005db | 13.361 | 1.821 | n/a | 0.000 | 0.046 | 0.502 | 1.202 | 0.012 | 0.000 | 2.364 | 6.946 | 0.448 | n/a | 0.020 | 1.868 | 0.140 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000005fe | 13.337 | 3.027 | n/a | 0.000 | 0.143 | 0.890 | 1.548 | 0.021 | 0.000 | 0.166 | 7.021 | 0.470 | n/a | 0.051 | 3.170 | 0.238 | 0.051 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000005b8 | 13.206 | 2.456 | n/a | 0.000 | 0.053 | 0.842 | 1.603 | 0.020 | 0.000 | 3.417 | 4.362 | 0.432 | n/a | 0.021 | 2.510 | 0.190 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000531 | 13.155 | 1.934 | n/a | 0.000 | 0.072 | 0.666 | 2.012 | 0.031 | 0.000 | 0.216 | 7.159 | 1.035 | n/a | 0.029 | 2.006 | 0.153 | 0.029 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000059b | 13.035 | 3.032 | n/a | 0.000 | 0.100 | 0.612 | 5.039 | 0.011 | 0.000 | 0.068 | 3.684 | 0.450 | n/a | 0.038 | 3.133 | 0.240 | 0.038 | gw-w/thread-50/storage/commit! | none observed |
| 6f0a8b5e40b4d9a500000000000005dd | 13.029 | 2.364 | n/a | 0.000 | 0.047 | 0.709 | 1.626 | 0.021 | 0.000 | 0.617 | 7.199 | 0.430 | n/a | 0.018 | 2.410 | 0.185 | 0.018 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000052d | 13.002 | 3.663 | n/a | 0.000 | 0.862 | 0.717 | 1.394 | 0.015 | 0.000 | 0.094 | 5.779 | 0.461 | n/a | 0.016 | 4.525 | 0.348 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000514 | 13.000 | 1.966 | n/a | 0.000 | 0.048 | 0.490 | 0.993 | 0.015 | 0.000 | 3.763 | 4.853 | 0.853 | n/a | 0.019 | 2.014 | 0.155 | 0.019 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000583 | 12.617 | 1.764 | n/a | 0.000 | 0.049 | 0.629 | 1.499 | 0.019 | 0.000 | 2.434 | 5.766 | 0.439 | n/a | 0.019 | 1.814 | 0.144 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-50 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.629 | 0.000 | 0.000 | 0.516 | 2.145 | n/a | 0.000 | 0.052 | 0.641 | 1.060 | 0.015 | 0.000 | 0.138 | 4.125 | 0.444 | n/a | 0.021 | 2.219 | 0.242 | 0.021 |
| p99 | 15.878 | 2.004 | 0.000 | 1.354 | 3.929 | n/a | 0.000 | 1.883 | 4.033 | 5.039 | 0.048 | 0.000 | 3.639 | 8.780 | 1.035 | n/a | 0.052 | 4.573 | 0.435 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a500000000000005e3 | 17.321 | 2.749 | n/a | 0.000 | 0.094 | 4.158 | 1.567 | 0.023 | 0.000 | 0.169 | 8.081 | 0.446 | n/a | 0.034 | 2.842 | 0.164 | 0.034 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000050e | 15.878 | 1.812 | n/a | 0.000 | 0.058 | 0.552 | 1.225 | 0.016 | 0.000 | 3.639 | 4.633 | 3.923 | n/a | 0.020 | 1.870 | 0.118 | 0.020 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000005d5 | 15.731 | 3.303 | n/a | 0.000 | 0.095 | 0.890 | 4.679 | 0.021 | 0.000 | 0.083 | 6.189 | 0.436 | n/a | 0.034 | 3.398 | 0.216 | 0.034 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000595 | 15.667 | 2.635 | n/a | 0.000 | 0.082 | 0.643 | 1.135 | 0.011 | 0.000 | 0.101 | 10.164 | 0.865 | n/a | 0.031 | 2.718 | 0.173 | 0.031 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000005e9 | 15.445 | 1.758 | n/a | 0.000 | 0.050 | 0.529 | 4.924 | 0.022 | 0.000 | 0.160 | 7.274 | 0.711 | n/a | 0.018 | 1.807 | 0.117 | 0.018 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000005aa | 14.898 | 2.789 | n/a | 0.000 | 0.898 | 0.862 | 0.970 | 0.011 | 0.000 | 0.084 | 8.780 | 0.487 | n/a | 0.017 | 3.687 | 0.247 | 0.017 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000057f | 14.477 | 2.558 | n/a | 0.000 | 1.053 | 0.662 | 1.069 | 0.011 | 0.000 | 0.360 | 7.953 | 0.794 | n/a | 0.017 | 3.611 | 0.249 | 0.017 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000056c | 13.927 | 1.774 | n/a | 0.000 | 0.042 | 0.468 | 4.093 | 0.045 | 0.000 | 0.089 | 6.979 | 0.418 | n/a | 0.019 | 1.815 | 0.130 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000005df | 13.783 | 2.175 | n/a | 0.000 | 0.111 | 2.081 | 1.619 | 0.022 | 0.000 | 0.529 | 6.745 | 0.433 | n/a | 0.069 | 2.286 | 0.166 | 0.069 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000005c4 | 13.586 | 2.577 | n/a | 0.000 | 0.826 | 0.843 | 5.227 | 0.020 | 0.000 | 0.106 | 3.507 | 0.465 | n/a | 0.015 | 3.403 | 0.250 | 0.015 | gw-w/thread-51/commit.prepare-and-validate | none observed |
| 6f0a8b5e40b4d9a5000000000000057a | 13.561 | 1.697 | n/a | 0.000 | 0.050 | 3.225 | 1.061 | 0.012 | 0.000 | 0.069 | 6.954 | 0.472 | n/a | 0.021 | 1.747 | 0.129 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000005db | 13.361 | 1.821 | n/a | 0.000 | 0.046 | 0.502 | 1.202 | 0.012 | 0.000 | 2.364 | 6.946 | 0.448 | n/a | 0.020 | 1.868 | 0.140 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000005fe | 13.337 | 3.027 | n/a | 0.000 | 0.143 | 0.890 | 1.548 | 0.021 | 0.000 | 0.166 | 7.021 | 0.470 | n/a | 0.051 | 3.170 | 0.238 | 0.051 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000005b8 | 13.206 | 2.456 | n/a | 0.000 | 0.053 | 0.842 | 1.603 | 0.020 | 0.000 | 3.417 | 4.362 | 0.432 | n/a | 0.021 | 2.510 | 0.190 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000531 | 13.155 | 1.934 | n/a | 0.000 | 0.072 | 0.666 | 2.012 | 0.031 | 0.000 | 0.216 | 7.159 | 1.035 | n/a | 0.029 | 2.006 | 0.153 | 0.029 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000059b | 13.035 | 3.032 | n/a | 0.000 | 0.100 | 0.612 | 5.039 | 0.011 | 0.000 | 0.068 | 3.684 | 0.450 | n/a | 0.038 | 3.133 | 0.240 | 0.038 | gw-w/thread-50/storage/commit! | none observed |
| 6f0a8b5e40b4d9a500000000000005dd | 13.029 | 2.364 | n/a | 0.000 | 0.047 | 0.709 | 1.626 | 0.021 | 0.000 | 0.617 | 7.199 | 0.430 | n/a | 0.018 | 2.410 | 0.185 | 0.018 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000052d | 13.002 | 3.663 | n/a | 0.000 | 0.862 | 0.717 | 1.394 | 0.015 | 0.000 | 0.094 | 5.779 | 0.461 | n/a | 0.016 | 4.525 | 0.348 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000514 | 13.000 | 1.966 | n/a | 0.000 | 0.048 | 0.490 | 0.993 | 0.015 | 0.000 | 3.763 | 4.853 | 0.853 | n/a | 0.019 | 2.014 | 0.155 | 0.019 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000583 | 12.617 | 1.764 | n/a | 0.000 | 0.049 | 0.629 | 1.499 | 0.019 | 0.000 | 2.434 | 5.766 | 0.439 | n/a | 0.019 | 1.814 | 0.144 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-100 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.662 | 0.000 | 0.000 | 0.522 | 2.189 | n/a | 0.000 | 0.063 | 0.660 | 1.164 | 0.013 | 0.000 | 0.132 | 5.193 | 0.498 | n/a | 0.026 | 2.308 | 0.216 | 0.026 |
| p99 | 30.164 | 1.692 | 0.000 | 1.067 | 4.429 | n/a | 0.000 | 2.410 | 1.739 | 4.633 | 0.036 | 0.000 | 0.877 | 10.684 | 1.177 | n/a | 0.056 | 5.555 | 0.437 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a5000000000000069d | 35.461 | 2.189 | n/a | 0.000 | 0.455 | 0.958 | 1.773 | 0.021 | 0.000 | 0.136 | 8.403 | 21.506 | n/a | 0.021 | 2.644 | 0.075 | 0.021 | tx/thread-83/transactor.triplex-function | driver.reader-basis.broadcast 0.089ms |
| 6f0a8b5e40b4d9a50000000000000699 | 30.164 | 1.808 | n/a | 0.000 | 0.066 | 0.501 | 4.440 | 0.012 | 16.698 | 0.068 | 6.075 | 0.469 | n/a | 0.028 | 1.874 | 0.062 | 0.028 | gw-w/thread--1/jdk.GCPhasePause | driver.reader-basis.broadcast 0.086ms |
| 6f0a8b5e40b4d9a500000000000006bd | 17.703 | 2.469 | n/a | 0.000 | 0.067 | 0.708 | 0.973 | 0.013 | 0.000 | 0.094 | 12.889 | 0.462 | n/a | 0.028 | 2.536 | 0.143 | 0.028 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000664 | 17.281 | 2.333 | n/a | 0.000 | 0.057 | 0.688 | 2.510 | 0.012 | 0.000 | 0.092 | 10.684 | 0.878 | n/a | 0.026 | 2.391 | 0.138 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000006c3 | 16.953 | 2.995 | n/a | 0.000 | 0.130 | 1.019 | 1.622 | 0.026 | 0.000 | 0.129 | 10.542 | 0.443 | n/a | 0.049 | 3.124 | 0.184 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000673 | 16.071 | 2.633 | n/a | 0.000 | 0.189 | 0.802 | 1.313 | 0.012 | 0.000 | 0.476 | 9.411 | 1.132 | n/a | 0.103 | 2.822 | 0.176 | 0.103 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000006c7 | 15.567 | 4.429 | n/a | 0.000 | 2.168 | 1.534 | 1.287 | 0.020 | 0.000 | 0.109 | 5.481 | 0.521 | n/a | 0.020 | 6.597 | 0.424 | 0.020 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000636 | 15.298 | 2.382 | n/a | 0.000 | 0.063 | 0.810 | 4.498 | 0.036 | 0.000 | 0.124 | 6.913 | 0.447 | n/a | 0.027 | 2.445 | 0.160 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000068a | 14.998 | 3.114 | n/a | 0.000 | 0.131 | 0.872 | 2.065 | 0.027 | 0.000 | 0.676 | 7.564 | 0.499 | n/a | 0.050 | 3.245 | 0.216 | 0.050 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000006b2 | 14.989 | 2.483 | n/a | 0.000 | 0.066 | 4.157 | 0.942 | 0.011 | 0.000 | 0.063 | 6.764 | 0.476 | n/a | 0.027 | 2.549 | 0.170 | 0.027 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000064f | 14.829 | 3.451 | n/a | 0.000 | 0.117 | 0.810 | 1.883 | 0.026 | 0.000 | 0.877 | 6.614 | 1.000 | n/a | 0.052 | 3.568 | 0.241 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000066f | 14.786 | 2.849 | n/a | 0.000 | 0.124 | 0.657 | 1.005 | 0.011 | 0.000 | 3.270 | 5.941 | 0.882 | n/a | 0.048 | 2.973 | 0.201 | 0.048 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000006fc | 14.756 | 2.479 | n/a | 0.000 | 0.063 | 1.739 | 1.786 | 0.024 | 0.000 | 0.177 | 7.964 | 0.498 | n/a | 0.028 | 2.541 | 0.172 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000738 | 14.718 | 2.496 | n/a | 0.000 | 0.046 | 0.838 | 1.399 | 0.013 | 0.000 | 0.288 | 9.030 | 0.584 | n/a | 0.024 | 2.542 | 0.173 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000006f3 | 14.492 | 2.033 | n/a | 0.000 | 0.064 | 0.542 | 1.268 | 0.014 | 0.000 | 0.399 | 9.609 | 0.532 | n/a | 0.029 | 2.098 | 0.145 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000074d | 14.161 | 1.831 | n/a | 0.000 | 0.054 | 0.614 | 1.837 | 0.023 | 0.000 | 0.103 | 8.853 | 0.822 | n/a | 0.023 | 1.885 | 0.133 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000645 | 13.702 | 1.835 | n/a | 0.000 | 0.064 | 0.705 | 1.548 | 0.020 | 0.000 | 0.613 | 8.453 | 0.437 | n/a | 0.027 | 1.900 | 0.139 | 0.027 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000006d2 | 13.683 | 2.771 | n/a | 0.000 | 0.061 | 0.851 | 1.768 | 0.023 | 0.000 | 0.092 | 7.629 | 0.465 | n/a | 0.023 | 2.832 | 0.207 | 0.023 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000708 | 13.657 | 2.015 | n/a | 0.000 | 0.047 | 0.508 | 4.460 | 0.013 | 0.000 | 0.070 | 5.506 | 1.021 | n/a | 0.017 | 2.061 | 0.151 | 0.017 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000066d | 13.439 | 2.966 | n/a | 0.000 | 2.141 | 0.752 | 0.917 | 0.011 | 0.000 | 0.090 | 5.524 | 0.991 | n/a | 0.047 | 5.107 | 0.380 | 0.047 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-100 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.662 | 0.000 | 0.000 | 0.522 | 2.189 | n/a | 0.000 | 0.063 | 0.660 | 1.164 | 0.013 | 0.000 | 0.132 | 5.193 | 0.498 | n/a | 0.026 | 2.308 | 0.216 | 0.026 |
| p99 | 30.164 | 1.692 | 0.000 | 1.067 | 4.429 | n/a | 0.000 | 2.410 | 1.739 | 4.633 | 0.036 | 0.000 | 0.877 | 10.684 | 1.177 | n/a | 0.056 | 5.555 | 0.437 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a5000000000000069d | 35.461 | 2.189 | n/a | 0.000 | 0.455 | 0.958 | 1.773 | 0.021 | 0.000 | 0.136 | 8.403 | 21.506 | n/a | 0.021 | 2.644 | 0.075 | 0.021 | tx/thread-83/transactor.triplex-function | driver.reader-basis.broadcast 0.089ms |
| 6f0a8b5e40b4d9a50000000000000699 | 30.164 | 1.808 | n/a | 0.000 | 0.066 | 0.501 | 4.440 | 0.012 | 16.698 | 0.068 | 6.075 | 0.469 | n/a | 0.028 | 1.874 | 0.062 | 0.028 | gw-w/thread--1/jdk.GCPhasePause | driver.reader-basis.broadcast 0.086ms |
| 6f0a8b5e40b4d9a500000000000006bd | 17.703 | 2.469 | n/a | 0.000 | 0.067 | 0.708 | 0.973 | 0.013 | 0.000 | 0.094 | 12.889 | 0.462 | n/a | 0.028 | 2.536 | 0.143 | 0.028 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000664 | 17.281 | 2.333 | n/a | 0.000 | 0.057 | 0.688 | 2.510 | 0.012 | 0.000 | 0.092 | 10.684 | 0.878 | n/a | 0.026 | 2.391 | 0.138 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000006c3 | 16.953 | 2.995 | n/a | 0.000 | 0.130 | 1.019 | 1.622 | 0.026 | 0.000 | 0.129 | 10.542 | 0.443 | n/a | 0.049 | 3.124 | 0.184 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000673 | 16.071 | 2.633 | n/a | 0.000 | 0.189 | 0.802 | 1.313 | 0.012 | 0.000 | 0.476 | 9.411 | 1.132 | n/a | 0.103 | 2.822 | 0.176 | 0.103 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000006c7 | 15.567 | 4.429 | n/a | 0.000 | 2.168 | 1.534 | 1.287 | 0.020 | 0.000 | 0.109 | 5.481 | 0.521 | n/a | 0.020 | 6.597 | 0.424 | 0.020 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000636 | 15.298 | 2.382 | n/a | 0.000 | 0.063 | 0.810 | 4.498 | 0.036 | 0.000 | 0.124 | 6.913 | 0.447 | n/a | 0.027 | 2.445 | 0.160 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000068a | 14.998 | 3.114 | n/a | 0.000 | 0.131 | 0.872 | 2.065 | 0.027 | 0.000 | 0.676 | 7.564 | 0.499 | n/a | 0.050 | 3.245 | 0.216 | 0.050 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000006b2 | 14.989 | 2.483 | n/a | 0.000 | 0.066 | 4.157 | 0.942 | 0.011 | 0.000 | 0.063 | 6.764 | 0.476 | n/a | 0.027 | 2.549 | 0.170 | 0.027 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000064f | 14.829 | 3.451 | n/a | 0.000 | 0.117 | 0.810 | 1.883 | 0.026 | 0.000 | 0.877 | 6.614 | 1.000 | n/a | 0.052 | 3.568 | 0.241 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000066f | 14.786 | 2.849 | n/a | 0.000 | 0.124 | 0.657 | 1.005 | 0.011 | 0.000 | 3.270 | 5.941 | 0.882 | n/a | 0.048 | 2.973 | 0.201 | 0.048 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000006fc | 14.756 | 2.479 | n/a | 0.000 | 0.063 | 1.739 | 1.786 | 0.024 | 0.000 | 0.177 | 7.964 | 0.498 | n/a | 0.028 | 2.541 | 0.172 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000738 | 14.718 | 2.496 | n/a | 0.000 | 0.046 | 0.838 | 1.399 | 0.013 | 0.000 | 0.288 | 9.030 | 0.584 | n/a | 0.024 | 2.542 | 0.173 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000006f3 | 14.492 | 2.033 | n/a | 0.000 | 0.064 | 0.542 | 1.268 | 0.014 | 0.000 | 0.399 | 9.609 | 0.532 | n/a | 0.029 | 2.098 | 0.145 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000074d | 14.161 | 1.831 | n/a | 0.000 | 0.054 | 0.614 | 1.837 | 0.023 | 0.000 | 0.103 | 8.853 | 0.822 | n/a | 0.023 | 1.885 | 0.133 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000645 | 13.702 | 1.835 | n/a | 0.000 | 0.064 | 0.705 | 1.548 | 0.020 | 0.000 | 0.613 | 8.453 | 0.437 | n/a | 0.027 | 1.900 | 0.139 | 0.027 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000006d2 | 13.683 | 2.771 | n/a | 0.000 | 0.061 | 0.851 | 1.768 | 0.023 | 0.000 | 0.092 | 7.629 | 0.465 | n/a | 0.023 | 2.832 | 0.207 | 0.023 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000708 | 13.657 | 2.015 | n/a | 0.000 | 0.047 | 0.508 | 4.460 | 0.013 | 0.000 | 0.070 | 5.506 | 1.021 | n/a | 0.017 | 2.061 | 0.151 | 0.017 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000066d | 13.439 | 2.966 | n/a | 0.000 | 2.141 | 0.752 | 0.917 | 0.011 | 0.000 | 0.090 | 5.524 | 0.991 | n/a | 0.047 | 5.107 | 0.380 | 0.047 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.050 | 0.200 | 0.000 | 0.553 | 2.305 | n/a | 0.000 | 0.064 | 0.693 | 1.236 | 0.014 | 0.000 | 0.141 | 5.173 | 0.565 | n/a | 0.028 | 2.531 | 0.230 | 0.028 |
| p99 | 17.702 | 1.829 | 0.000 | 1.116 | 4.344 | n/a | 0.000 | 3.070 | 1.585 | 5.158 | 0.043 | 0.000 | 1.303 | 10.442 | 3.737 | n/a | 0.065 | 7.303 | 0.477 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a500000000000007c8 | 25.129 | 4.637 | n/a | 0.000 | 2.026 | 1.037 | 7.687 | 0.026 | 0.000 | 0.529 | 8.245 | 0.887 | n/a | 0.055 | 6.663 | 0.265 | 0.055 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000812 | 17.702 | 1.989 | n/a | 0.000 | 0.058 | 0.822 | 2.620 | 0.032 | 0.000 | 0.346 | 9.682 | 2.125 | n/a | 0.029 | 2.047 | 0.116 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000008ae | 16.809 | 2.981 | n/a | 0.000 | 0.055 | 0.790 | 1.629 | 0.025 | 0.000 | 0.248 | 10.522 | 0.525 | n/a | 0.032 | 3.037 | 0.181 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000792 | 16.291 | 3.989 | n/a | 0.000 | 0.145 | 1.038 | 2.070 | 0.032 | 0.000 | 0.348 | 7.454 | 1.153 | n/a | 0.061 | 4.134 | 0.254 | 0.061 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000008b4 | 16.163 | 2.084 | n/a | 0.000 | 0.070 | 0.710 | 2.860 | 0.015 | 0.000 | 0.121 | 6.537 | 3.737 | n/a | 0.031 | 2.153 | 0.133 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.112ms |
| 6f0a8b5e40b4d9a5000000000000085a | 16.019 | 3.338 | n/a | 0.000 | 0.141 | 1.122 | 1.102 | 0.014 | 0.000 | 0.109 | 9.616 | 0.526 | n/a | 0.051 | 3.479 | 0.217 | 0.051 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.214ms |
| 6f0a8b5e40b4d9a5000000000000083f | 16.005 | 2.732 | n/a | 0.000 | 0.066 | 0.850 | 4.808 | 0.015 | 0.000 | 0.085 | 6.429 | 0.989 | n/a | 0.030 | 2.798 | 0.175 | 0.030 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.082ms |
| 6f0a8b5e40b4d9a500000000000008bc | 15.788 | 4.344 | n/a | 0.000 | 3.566 | 1.027 | 1.234 | 0.014 | 0.000 | 0.084 | 4.958 | 0.510 | n/a | 0.051 | 7.910 | 0.501 | 0.051 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000008a9 | 15.430 | 3.517 | n/a | 0.000 | 0.152 | 1.202 | 2.042 | 0.028 | 0.000 | 0.240 | 7.021 | 1.164 | n/a | 0.064 | 3.668 | 0.238 | 0.064 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000885 | 15.369 | 3.977 | n/a | 0.000 | 0.140 | 1.168 | 2.305 | 0.044 | 0.000 | 0.169 | 6.998 | 0.520 | n/a | 0.049 | 4.117 | 0.268 | 0.049 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000086a | 15.314 | 4.232 | n/a | 0.000 | 3.070 | 1.317 | 1.824 | 0.024 | 0.000 | 0.178 | 4.067 | 0.557 | n/a | 0.045 | 7.303 | 0.477 | 0.045 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000081b | 15.141 | 3.015 | n/a | 0.000 | 0.187 | 0.585 | 1.751 | 0.015 | 0.000 | 0.157 | 8.094 | 1.271 | n/a | 0.065 | 3.202 | 0.211 | 0.065 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000799 | 14.957 | 2.011 | n/a | 0.000 | 0.070 | 0.576 | 1.230 | 0.012 | 0.000 | 0.150 | 9.785 | 1.084 | n/a | 0.039 | 2.082 | 0.139 | 0.039 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000007d8 | 14.814 | 4.025 | n/a | 0.000 | 0.126 | 0.897 | 1.008 | 0.012 | 0.000 | 0.352 | 7.410 | 0.927 | n/a | 0.057 | 4.150 | 0.280 | 0.057 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000787 | 14.810 | 2.534 | n/a | 0.000 | 0.060 | 0.797 | 1.765 | 0.026 | 0.000 | 0.208 | 8.723 | 0.672 | n/a | 0.024 | 2.594 | 0.175 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000846 | 14.705 | 2.113 | n/a | 0.000 | 0.075 | 0.802 | 1.956 | 0.027 | 0.000 | 0.917 | 8.244 | 0.535 | n/a | 0.036 | 2.188 | 0.149 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000007f5 | 14.613 | 3.703 | n/a | 0.000 | 0.149 | 0.954 | 1.543 | 0.016 | 0.000 | 0.484 | 6.686 | 1.017 | n/a | 0.061 | 3.852 | 0.264 | 0.061 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000844 | 14.564 | 3.124 | n/a | 0.000 | 0.130 | 0.702 | 4.830 | 0.014 | 0.000 | 0.297 | 4.963 | 0.457 | n/a | 0.048 | 3.254 | 0.223 | 0.048 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.204ms |
| 6f0a8b5e40b4d9a50000000000000893 | 14.466 | 1.839 | n/a | 0.000 | 0.048 | 0.486 | 1.009 | 0.012 | 0.000 | 0.108 | 10.442 | 0.498 | n/a | 0.025 | 1.887 | 0.130 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000007ea | 14.296 | 1.916 | n/a | 0.000 | 0.054 | 0.704 | 5.158 | 0.021 | 0.000 | 0.084 | 5.299 | 1.039 | n/a | 0.022 | 1.969 | 0.138 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.050 | 0.200 | 0.000 | 0.553 | 2.305 | n/a | 0.000 | 0.064 | 0.693 | 1.236 | 0.014 | 0.000 | 0.141 | 5.173 | 0.565 | n/a | 0.028 | 2.531 | 0.230 | 0.028 |
| p99 | 17.702 | 1.829 | 0.000 | 1.116 | 4.344 | n/a | 0.000 | 3.070 | 1.585 | 5.158 | 0.043 | 0.000 | 1.303 | 10.442 | 3.737 | n/a | 0.065 | 7.303 | 0.477 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a500000000000007c8 | 25.129 | 4.637 | n/a | 0.000 | 2.026 | 1.037 | 7.687 | 0.026 | 0.000 | 0.529 | 8.245 | 0.887 | n/a | 0.055 | 6.663 | 0.265 | 0.055 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000812 | 17.702 | 1.989 | n/a | 0.000 | 0.058 | 0.822 | 2.620 | 0.032 | 0.000 | 0.346 | 9.682 | 2.125 | n/a | 0.029 | 2.047 | 0.116 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000008ae | 16.809 | 2.981 | n/a | 0.000 | 0.055 | 0.790 | 1.629 | 0.025 | 0.000 | 0.248 | 10.522 | 0.525 | n/a | 0.032 | 3.037 | 0.181 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000792 | 16.291 | 3.989 | n/a | 0.000 | 0.145 | 1.038 | 2.070 | 0.032 | 0.000 | 0.348 | 7.454 | 1.153 | n/a | 0.061 | 4.134 | 0.254 | 0.061 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000008b4 | 16.163 | 2.084 | n/a | 0.000 | 0.070 | 0.710 | 2.860 | 0.015 | 0.000 | 0.121 | 6.537 | 3.737 | n/a | 0.031 | 2.153 | 0.133 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.112ms |
| 6f0a8b5e40b4d9a5000000000000085a | 16.019 | 3.338 | n/a | 0.000 | 0.141 | 1.122 | 1.102 | 0.014 | 0.000 | 0.109 | 9.616 | 0.526 | n/a | 0.051 | 3.479 | 0.217 | 0.051 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.214ms |
| 6f0a8b5e40b4d9a5000000000000083f | 16.005 | 2.732 | n/a | 0.000 | 0.066 | 0.850 | 4.808 | 0.015 | 0.000 | 0.085 | 6.429 | 0.989 | n/a | 0.030 | 2.798 | 0.175 | 0.030 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.082ms |
| 6f0a8b5e40b4d9a500000000000008bc | 15.788 | 4.344 | n/a | 0.000 | 3.566 | 1.027 | 1.234 | 0.014 | 0.000 | 0.084 | 4.958 | 0.510 | n/a | 0.051 | 7.910 | 0.501 | 0.051 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000008a9 | 15.430 | 3.517 | n/a | 0.000 | 0.152 | 1.202 | 2.042 | 0.028 | 0.000 | 0.240 | 7.021 | 1.164 | n/a | 0.064 | 3.668 | 0.238 | 0.064 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000885 | 15.369 | 3.977 | n/a | 0.000 | 0.140 | 1.168 | 2.305 | 0.044 | 0.000 | 0.169 | 6.998 | 0.520 | n/a | 0.049 | 4.117 | 0.268 | 0.049 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000086a | 15.314 | 4.232 | n/a | 0.000 | 3.070 | 1.317 | 1.824 | 0.024 | 0.000 | 0.178 | 4.067 | 0.557 | n/a | 0.045 | 7.303 | 0.477 | 0.045 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000081b | 15.141 | 3.015 | n/a | 0.000 | 0.187 | 0.585 | 1.751 | 0.015 | 0.000 | 0.157 | 8.094 | 1.271 | n/a | 0.065 | 3.202 | 0.211 | 0.065 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000799 | 14.957 | 2.011 | n/a | 0.000 | 0.070 | 0.576 | 1.230 | 0.012 | 0.000 | 0.150 | 9.785 | 1.084 | n/a | 0.039 | 2.082 | 0.139 | 0.039 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000007d8 | 14.814 | 4.025 | n/a | 0.000 | 0.126 | 0.897 | 1.008 | 0.012 | 0.000 | 0.352 | 7.410 | 0.927 | n/a | 0.057 | 4.150 | 0.280 | 0.057 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000787 | 14.810 | 2.534 | n/a | 0.000 | 0.060 | 0.797 | 1.765 | 0.026 | 0.000 | 0.208 | 8.723 | 0.672 | n/a | 0.024 | 2.594 | 0.175 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000846 | 14.705 | 2.113 | n/a | 0.000 | 0.075 | 0.802 | 1.956 | 0.027 | 0.000 | 0.917 | 8.244 | 0.535 | n/a | 0.036 | 2.188 | 0.149 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000007f5 | 14.613 | 3.703 | n/a | 0.000 | 0.149 | 0.954 | 1.543 | 0.016 | 0.000 | 0.484 | 6.686 | 1.017 | n/a | 0.061 | 3.852 | 0.264 | 0.061 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000844 | 14.564 | 3.124 | n/a | 0.000 | 0.130 | 0.702 | 4.830 | 0.014 | 0.000 | 0.297 | 4.963 | 0.457 | n/a | 0.048 | 3.254 | 0.223 | 0.048 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.204ms |
| 6f0a8b5e40b4d9a50000000000000893 | 14.466 | 1.839 | n/a | 0.000 | 0.048 | 0.486 | 1.009 | 0.012 | 0.000 | 0.108 | 10.442 | 0.498 | n/a | 0.025 | 1.887 | 0.130 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000007ea | 14.296 | 1.916 | n/a | 0.000 | 0.054 | 0.704 | 5.158 | 0.021 | 0.000 | 0.084 | 5.299 | 1.039 | n/a | 0.022 | 1.969 | 0.138 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-500 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.188 | 0.592 | 0.000 | 0.596 | 2.543 | n/a | 0.000 | 0.072 | 0.700 | 1.228 | 0.015 | 0.000 | 0.137 | 5.089 | 0.538 | n/a | 0.031 | 2.742 | 0.251 | 0.031 |
| p99 | 18.642 | 1.629 | 0.000 | 1.364 | 4.307 | n/a | 1.615 | 2.220 | 1.459 | 5.112 | 0.037 | 0.000 | 1.292 | 9.383 | 1.328 | n/a | 0.077 | 5.670 | 0.410 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a5000000000000096e | 33.200 | 2.877 | n/a | 0.000 | 0.121 | 0.754 | 7.451 | 0.013 | 16.899 | 0.074 | 4.439 | 0.510 | n/a | 0.063 | 2.998 | 0.090 | 0.063 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 6f0a8b5e40b4d9a500000000000009c1 | 18.642 | 2.413 | n/a | 0.000 | 0.071 | 0.696 | 4.868 | 0.014 | 0.000 | 0.086 | 9.366 | 1.097 | n/a | 0.031 | 2.484 | 0.133 | 0.031 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000009da | 15.830 | 4.922 | n/a | 0.000 | 0.144 | 1.459 | 4.504 | 0.026 | 0.000 | 0.455 | 3.720 | 0.535 | n/a | 0.065 | 5.066 | 0.320 | 0.065 | gw-w/thread-48/commit.prepare-and-validate | none observed |
| 6f0a8b5e40b4d9a5000000000000097f | 15.716 | 2.719 | n/a | 0.000 | 1.244 | 0.823 | 5.112 | 0.038 | 0.000 | 0.225 | 4.979 | 0.548 | n/a | 0.028 | 3.963 | 0.252 | 0.028 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000009d0 | 15.321 | 3.870 | n/a | 0.000 | 0.138 | 0.850 | 1.605 | 0.015 | 0.000 | 0.148 | 7.557 | 1.082 | n/a | 0.056 | 4.008 | 0.262 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000a0f | 15.042 | 3.655 | n/a | 0.000 | 0.118 | 1.003 | 1.028 | 0.012 | 0.000 | 0.068 | 8.606 | 0.500 | n/a | 0.051 | 3.772 | 0.251 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000970 | 14.952 | 4.195 | n/a | 0.000 | 1.592 | 1.053 | 1.154 | 0.012 | 0.000 | 0.427 | 6.037 | 0.450 | n/a | 0.032 | 5.787 | 0.387 | 0.032 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.229ms |
| 6f0a8b5e40b4d9a50000000000000920 | 14.929 | 3.678 | n/a | 0.000 | 0.072 | 1.128 | 2.401 | 0.037 | 0.000 | 0.279 | 6.716 | 0.587 | n/a | 0.030 | 3.750 | 0.251 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000009ba | 14.895 | 2.180 | n/a | 0.000 | 0.063 | 0.499 | 1.422 | 0.016 | 0.000 | 0.110 | 10.021 | 0.552 | n/a | 0.031 | 2.243 | 0.151 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000a1e | 14.752 | 2.189 | n/a | 0.000 | 1.026 | 0.565 | 1.157 | 0.014 | 0.000 | 0.094 | 8.801 | 0.884 | n/a | 0.021 | 3.215 | 0.218 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000975 | 14.707 | 3.882 | n/a | 0.000 | 1.788 | 0.846 | 1.276 | 0.031 | 0.000 | 0.446 | 5.399 | 1.009 | n/a | 0.031 | 5.670 | 0.386 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.191ms |
| 6f0a8b5e40b4d9a500000000000009c6 | 14.669 | 2.826 | n/a | 0.000 | 0.085 | 1.196 | 1.729 | 0.012 | 0.000 | 0.446 | 7.556 | 0.783 | n/a | 0.036 | 2.911 | 0.198 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000916 | 14.606 | 2.418 | n/a | 0.000 | 0.068 | 0.773 | 1.413 | 0.016 | 0.000 | 0.125 | 8.361 | 1.400 | n/a | 0.031 | 2.487 | 0.170 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000008ee | 14.365 | 2.179 | n/a | 0.000 | 0.069 | 0.794 | 1.306 | 0.015 | 0.000 | 0.360 | 8.445 | 1.158 | n/a | 0.039 | 2.248 | 0.157 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000009b2 | 14.310 | 2.387 | n/a | 0.000 | 2.158 | 0.841 | 2.019 | 0.030 | 0.000 | 0.147 | 6.225 | 0.477 | n/a | 0.026 | 4.545 | 0.318 | 0.026 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000009bc | 14.271 | 2.139 | n/a | 0.000 | 2.220 | 0.669 | 1.277 | 0.015 | 0.000 | 0.081 | 6.681 | 1.162 | n/a | 0.026 | 4.359 | 0.305 | 0.026 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000091b | 14.143 | 3.290 | n/a | 0.000 | 0.064 | 0.875 | 1.601 | 0.015 | 0.000 | 0.121 | 6.821 | 1.328 | n/a | 0.029 | 3.354 | 0.237 | 0.029 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000009b7 | 14.125 | 3.459 | n/a | 0.000 | 0.090 | 0.987 | 1.146 | 0.013 | 0.000 | 0.076 | 7.335 | 0.987 | n/a | 0.031 | 3.549 | 0.251 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000a19 | 14.063 | 2.017 | n/a | 0.000 | 0.067 | 0.607 | 1.728 | 0.031 | 0.000 | 0.125 | 8.990 | 0.469 | n/a | 0.029 | 2.084 | 0.148 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000a1b | 13.984 | 2.752 | n/a | 0.000 | 0.060 | 1.191 | 1.755 | 0.025 | 0.000 | 0.456 | 6.748 | 0.962 | n/a | 0.034 | 2.812 | 0.201 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-500 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.188 | 0.592 | 0.000 | 0.596 | 2.543 | n/a | 0.000 | 0.072 | 0.700 | 1.228 | 0.015 | 0.000 | 0.137 | 5.089 | 0.538 | n/a | 0.031 | 2.742 | 0.251 | 0.031 |
| p99 | 18.642 | 1.629 | 0.000 | 1.364 | 4.307 | n/a | 1.615 | 2.220 | 1.459 | 5.112 | 0.037 | 0.000 | 1.292 | 9.383 | 1.328 | n/a | 0.077 | 5.670 | 0.410 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a5000000000000096e | 33.200 | 2.877 | n/a | 0.000 | 0.121 | 0.754 | 7.451 | 0.013 | 16.899 | 0.074 | 4.439 | 0.510 | n/a | 0.063 | 2.998 | 0.090 | 0.063 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 6f0a8b5e40b4d9a500000000000009c1 | 18.642 | 2.413 | n/a | 0.000 | 0.071 | 0.696 | 4.868 | 0.014 | 0.000 | 0.086 | 9.366 | 1.097 | n/a | 0.031 | 2.484 | 0.133 | 0.031 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000009da | 15.830 | 4.922 | n/a | 0.000 | 0.144 | 1.459 | 4.504 | 0.026 | 0.000 | 0.455 | 3.720 | 0.535 | n/a | 0.065 | 5.066 | 0.320 | 0.065 | gw-w/thread-48/commit.prepare-and-validate | none observed |
| 6f0a8b5e40b4d9a5000000000000097f | 15.716 | 2.719 | n/a | 0.000 | 1.244 | 0.823 | 5.112 | 0.038 | 0.000 | 0.225 | 4.979 | 0.548 | n/a | 0.028 | 3.963 | 0.252 | 0.028 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000009d0 | 15.321 | 3.870 | n/a | 0.000 | 0.138 | 0.850 | 1.605 | 0.015 | 0.000 | 0.148 | 7.557 | 1.082 | n/a | 0.056 | 4.008 | 0.262 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000a0f | 15.042 | 3.655 | n/a | 0.000 | 0.118 | 1.003 | 1.028 | 0.012 | 0.000 | 0.068 | 8.606 | 0.500 | n/a | 0.051 | 3.772 | 0.251 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000970 | 14.952 | 4.195 | n/a | 0.000 | 1.592 | 1.053 | 1.154 | 0.012 | 0.000 | 0.427 | 6.037 | 0.450 | n/a | 0.032 | 5.787 | 0.387 | 0.032 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.229ms |
| 6f0a8b5e40b4d9a50000000000000920 | 14.929 | 3.678 | n/a | 0.000 | 0.072 | 1.128 | 2.401 | 0.037 | 0.000 | 0.279 | 6.716 | 0.587 | n/a | 0.030 | 3.750 | 0.251 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000009ba | 14.895 | 2.180 | n/a | 0.000 | 0.063 | 0.499 | 1.422 | 0.016 | 0.000 | 0.110 | 10.021 | 0.552 | n/a | 0.031 | 2.243 | 0.151 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000a1e | 14.752 | 2.189 | n/a | 0.000 | 1.026 | 0.565 | 1.157 | 0.014 | 0.000 | 0.094 | 8.801 | 0.884 | n/a | 0.021 | 3.215 | 0.218 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000975 | 14.707 | 3.882 | n/a | 0.000 | 1.788 | 0.846 | 1.276 | 0.031 | 0.000 | 0.446 | 5.399 | 1.009 | n/a | 0.031 | 5.670 | 0.386 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.191ms |
| 6f0a8b5e40b4d9a500000000000009c6 | 14.669 | 2.826 | n/a | 0.000 | 0.085 | 1.196 | 1.729 | 0.012 | 0.000 | 0.446 | 7.556 | 0.783 | n/a | 0.036 | 2.911 | 0.198 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000916 | 14.606 | 2.418 | n/a | 0.000 | 0.068 | 0.773 | 1.413 | 0.016 | 0.000 | 0.125 | 8.361 | 1.400 | n/a | 0.031 | 2.487 | 0.170 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000008ee | 14.365 | 2.179 | n/a | 0.000 | 0.069 | 0.794 | 1.306 | 0.015 | 0.000 | 0.360 | 8.445 | 1.158 | n/a | 0.039 | 2.248 | 0.157 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000009b2 | 14.310 | 2.387 | n/a | 0.000 | 2.158 | 0.841 | 2.019 | 0.030 | 0.000 | 0.147 | 6.225 | 0.477 | n/a | 0.026 | 4.545 | 0.318 | 0.026 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000009bc | 14.271 | 2.139 | n/a | 0.000 | 2.220 | 0.669 | 1.277 | 0.015 | 0.000 | 0.081 | 6.681 | 1.162 | n/a | 0.026 | 4.359 | 0.305 | 0.026 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a5000000000000091b | 14.143 | 3.290 | n/a | 0.000 | 0.064 | 0.875 | 1.601 | 0.015 | 0.000 | 0.121 | 6.821 | 1.328 | n/a | 0.029 | 3.354 | 0.237 | 0.029 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a500000000000009b7 | 14.125 | 3.459 | n/a | 0.000 | 0.090 | 0.987 | 1.146 | 0.013 | 0.000 | 0.076 | 7.335 | 0.987 | n/a | 0.031 | 3.549 | 0.251 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000a19 | 14.063 | 2.017 | n/a | 0.000 | 0.067 | 0.607 | 1.728 | 0.031 | 0.000 | 0.125 | 8.990 | 0.469 | n/a | 0.029 | 2.084 | 0.148 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000a1b | 13.984 | 2.752 | n/a | 0.000 | 0.060 | 1.191 | 1.755 | 0.025 | 0.000 | 0.456 | 6.748 | 0.962 | n/a | 0.034 | 2.812 | 0.201 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.659 | 0.673 | 0.000 | 0.620 | 2.826 | n/a | 0.000 | 0.078 | 0.756 | 1.281 | 0.015 | 0.000 | 0.152 | 5.194 | 0.617 | n/a | 0.032 | 2.997 | 0.262 | 0.032 |
| p99 | 20.492 | 2.004 | 0.000 | 2.242 | 5.603 | n/a | 1.636 | 2.323 | 1.461 | 4.021 | 0.041 | 0.000 | 1.559 | 10.666 | 1.702 | n/a | 0.078 | 6.003 | 0.413 | 0.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a50000000000000bbb | 37.429 | 4.031 | n/a | 0.000 | 0.124 | 0.805 | 1.431 | 0.013 | 0.000 | 0.305 | 29.993 | 0.684 | n/a | 0.043 | 4.156 | 0.111 | 0.043 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000bb2 | 20.492 | 4.553 | n/a | 0.000 | 0.132 | 1.461 | 1.560 | 0.014 | 0.000 | 0.466 | 10.666 | 1.594 | n/a | 0.047 | 4.684 | 0.229 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000beb | 19.266 | 4.603 | n/a | 0.000 | 0.164 | 1.377 | 2.793 | 0.145 | 0.000 | 0.276 | 8.359 | 1.486 | n/a | 0.063 | 4.766 | 0.247 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000aa4 | 18.418 | 6.187 | n/a | 0.000 | 0.134 | 1.031 | 1.169 | 0.015 | 0.000 | 0.445 | 8.750 | 0.622 | n/a | 0.066 | 6.320 | 0.343 | 0.066 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000bee | 18.133 | 5.603 | n/a | 0.000 | 0.167 | 1.334 | 2.796 | 0.041 | 0.000 | 0.422 | 7.011 | 0.694 | n/a | 0.064 | 5.770 | 0.318 | 0.064 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000bd6 | 17.448 | 4.193 | n/a | 0.000 | 0.156 | 0.966 | 1.710 | 0.021 | 0.000 | 0.151 | 8.481 | 1.702 | n/a | 0.067 | 4.349 | 0.249 | 0.067 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000b10 | 16.688 | 2.917 | n/a | 1.395 | 0.061 | 0.698 | 1.080 | 0.013 | 0.000 | 0.122 | 8.947 | 1.426 | n/a | 0.030 | 4.373 | 0.262 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000b7c | 16.652 | 3.635 | n/a | 0.000 | 0.073 | 3.941 | 1.465 | 0.016 | 0.000 | 0.113 | 6.874 | 0.502 | n/a | 0.032 | 3.709 | 0.223 | 0.032 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000be8 | 16.554 | 2.826 | n/a | 0.000 | 0.073 | 1.013 | 2.614 | 0.040 | 0.000 | 0.386 | 8.816 | 0.741 | n/a | 0.043 | 2.900 | 0.175 | 0.043 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000b07 | 16.540 | 4.039 | n/a | 1.806 | 0.158 | 0.796 | 3.636 | 0.014 | 0.000 | 0.353 | 5.018 | 0.667 | n/a | 0.053 | 6.003 | 0.363 | 0.053 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000ae9 | 16.436 | 3.468 | n/a | 0.000 | 0.133 | 0.820 | 1.186 | 0.015 | 0.000 | 0.154 | 9.246 | 1.364 | n/a | 0.049 | 3.601 | 0.219 | 0.049 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000a53 | 16.272 | 4.757 | n/a | 0.000 | 0.073 | 1.216 | 1.800 | 0.024 | 0.000 | 0.589 | 7.141 | 0.626 | n/a | 0.046 | 4.830 | 0.297 | 0.046 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000aef | 15.941 | 3.209 | n/a | 0.000 | 0.063 | 0.827 | 1.735 | 0.021 | 0.000 | 0.108 | 9.403 | 0.545 | n/a | 0.029 | 3.271 | 0.205 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000bd0 | 15.149 | 3.176 | n/a | 0.000 | 1.439 | 0.759 | 1.482 | 0.013 | 0.000 | 0.140 | 6.832 | 1.283 | n/a | 0.024 | 4.615 | 0.305 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000bbe | 15.053 | 4.263 | n/a | 0.000 | 0.068 | 0.949 | 1.286 | 0.017 | 0.000 | 0.100 | 7.281 | 1.049 | n/a | 0.040 | 4.331 | 0.288 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000a62 | 14.798 | 2.731 | n/a | 0.000 | 1.550 | 0.820 | 1.260 | 0.015 | 0.000 | 0.354 | 7.508 | 0.529 | n/a | 0.031 | 4.281 | 0.289 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000a38 | 14.759 | 3.731 | n/a | 0.000 | 0.149 | 0.851 | 1.107 | 0.016 | 0.000 | 0.103 | 7.061 | 1.691 | n/a | 0.049 | 3.880 | 0.263 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000b64 | 14.732 | 2.661 | n/a | 0.000 | 0.119 | 0.903 | 1.669 | 0.021 | 0.000 | 0.112 | 8.656 | 0.537 | n/a | 0.055 | 2.780 | 0.189 | 0.055 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000a74 | 14.683 | 2.789 | n/a | 0.000 | 0.063 | 0.847 | 1.235 | 0.016 | 0.000 | 1.559 | 7.682 | 0.457 | n/a | 0.034 | 2.852 | 0.194 | 0.034 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000be2 | 14.652 | 2.511 | n/a | 0.000 | 0.081 | 0.770 | 1.868 | 0.022 | 0.000 | 0.249 | 7.796 | 1.314 | n/a | 0.039 | 2.592 | 0.177 | 0.039 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit / 5-10 facts (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.659 | 0.673 | 0.000 | 0.620 | 2.826 | n/a | 0.000 | 0.078 | 0.756 | 1.281 | 0.015 | 0.000 | 0.152 | 5.194 | 0.617 | n/a | 0.032 | 2.997 | 0.262 | 0.032 |
| p99 | 20.492 | 2.004 | 0.000 | 2.242 | 5.603 | n/a | 1.636 | 2.323 | 1.461 | 4.021 | 0.041 | 0.000 | 1.559 | 10.666 | 1.702 | n/a | 0.078 | 6.003 | 0.413 | 0.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f0a8b5e40b4d9a50000000000000bbb | 37.429 | 4.031 | n/a | 0.000 | 0.124 | 0.805 | 1.431 | 0.013 | 0.000 | 0.305 | 29.993 | 0.684 | n/a | 0.043 | 4.156 | 0.111 | 0.043 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000bb2 | 20.492 | 4.553 | n/a | 0.000 | 0.132 | 1.461 | 1.560 | 0.014 | 0.000 | 0.466 | 10.666 | 1.594 | n/a | 0.047 | 4.684 | 0.229 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000beb | 19.266 | 4.603 | n/a | 0.000 | 0.164 | 1.377 | 2.793 | 0.145 | 0.000 | 0.276 | 8.359 | 1.486 | n/a | 0.063 | 4.766 | 0.247 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000aa4 | 18.418 | 6.187 | n/a | 0.000 | 0.134 | 1.031 | 1.169 | 0.015 | 0.000 | 0.445 | 8.750 | 0.622 | n/a | 0.066 | 6.320 | 0.343 | 0.066 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000bee | 18.133 | 5.603 | n/a | 0.000 | 0.167 | 1.334 | 2.796 | 0.041 | 0.000 | 0.422 | 7.011 | 0.694 | n/a | 0.064 | 5.770 | 0.318 | 0.064 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000bd6 | 17.448 | 4.193 | n/a | 0.000 | 0.156 | 0.966 | 1.710 | 0.021 | 0.000 | 0.151 | 8.481 | 1.702 | n/a | 0.067 | 4.349 | 0.249 | 0.067 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000b10 | 16.688 | 2.917 | n/a | 1.395 | 0.061 | 0.698 | 1.080 | 0.013 | 0.000 | 0.122 | 8.947 | 1.426 | n/a | 0.030 | 4.373 | 0.262 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000b7c | 16.652 | 3.635 | n/a | 0.000 | 0.073 | 3.941 | 1.465 | 0.016 | 0.000 | 0.113 | 6.874 | 0.502 | n/a | 0.032 | 3.709 | 0.223 | 0.032 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000be8 | 16.554 | 2.826 | n/a | 0.000 | 0.073 | 1.013 | 2.614 | 0.040 | 0.000 | 0.386 | 8.816 | 0.741 | n/a | 0.043 | 2.900 | 0.175 | 0.043 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000b07 | 16.540 | 4.039 | n/a | 1.806 | 0.158 | 0.796 | 3.636 | 0.014 | 0.000 | 0.353 | 5.018 | 0.667 | n/a | 0.053 | 6.003 | 0.363 | 0.053 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000ae9 | 16.436 | 3.468 | n/a | 0.000 | 0.133 | 0.820 | 1.186 | 0.015 | 0.000 | 0.154 | 9.246 | 1.364 | n/a | 0.049 | 3.601 | 0.219 | 0.049 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000a53 | 16.272 | 4.757 | n/a | 0.000 | 0.073 | 1.216 | 1.800 | 0.024 | 0.000 | 0.589 | 7.141 | 0.626 | n/a | 0.046 | 4.830 | 0.297 | 0.046 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000aef | 15.941 | 3.209 | n/a | 0.000 | 0.063 | 0.827 | 1.735 | 0.021 | 0.000 | 0.108 | 9.403 | 0.545 | n/a | 0.029 | 3.271 | 0.205 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000bd0 | 15.149 | 3.176 | n/a | 0.000 | 1.439 | 0.759 | 1.482 | 0.013 | 0.000 | 0.140 | 6.832 | 1.283 | n/a | 0.024 | 4.615 | 0.305 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000bbe | 15.053 | 4.263 | n/a | 0.000 | 0.068 | 0.949 | 1.286 | 0.017 | 0.000 | 0.100 | 7.281 | 1.049 | n/a | 0.040 | 4.331 | 0.288 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000a62 | 14.798 | 2.731 | n/a | 0.000 | 1.550 | 0.820 | 1.260 | 0.015 | 0.000 | 0.354 | 7.508 | 0.529 | n/a | 0.031 | 4.281 | 0.289 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000a38 | 14.759 | 3.731 | n/a | 0.000 | 0.149 | 0.851 | 1.107 | 0.016 | 0.000 | 0.103 | 7.061 | 1.691 | n/a | 0.049 | 3.880 | 0.263 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000b64 | 14.732 | 2.661 | n/a | 0.000 | 0.119 | 0.903 | 1.669 | 0.021 | 0.000 | 0.112 | 8.656 | 0.537 | n/a | 0.055 | 2.780 | 0.189 | 0.055 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000a74 | 14.683 | 2.789 | n/a | 0.000 | 0.063 | 0.847 | 1.235 | 0.016 | 0.000 | 1.559 | 7.682 | 0.457 | n/a | 0.034 | 2.852 | 0.194 | 0.034 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 6f0a8b5e40b4d9a50000000000000be2 | 14.652 | 2.511 | n/a | 0.000 | 0.081 | 0.770 | 1.868 | 0.022 | 0.000 | 0.249 | 7.796 | 1.314 | n/a | 0.039 | 2.592 | 0.177 | 0.039 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.514 | n/a | n/a | n/a | 0.048 | n/a | 0.000 | 0.000 | 0.757 | 200.732 | 0.009 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.095 | 0.048 | 0.000 | 0.095 |
| p99 | 404.092 | n/a | n/a | n/a | 20.411 | n/a | 2.934 | 0.000 | 3.783 | 389.553 | 0.206 | 10.140 | 0.293 | 0.000 | n/a | n/a | 0.320 | 23.345 | 0.265 | 0.320 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af26a32af45c53bd0000000000000002 | 404.092 | 2.501 | n/a | 0.000 | 0.000 | 1.079 | 389.553 | 0.206 | 10.140 | 0.293 | 0.000 | n/a | n/a | 0.320 | 2.501 | 0.006 | 0.320 | gw-r/thread-49/gateway.admitted-work | none observed |
| 2065e6fc38c5bcc60000000000000005 | 205.951 | 0.048 | n/a | 0.000 | 0.000 | 0.935 | 204.684 | 0.048 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.089 | 0.048 | 0.000 | 0.089 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000915 | 201.781 | 0.044 | n/a | 0.000 | 0.000 | 0.954 | 200.643 | 0.009 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.099 | 0.044 | 0.000 | 0.099 | gw-r/thread-50/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000914 | 201.734 | 0.052 | n/a | 0.000 | 0.000 | 0.691 | 200.813 | 0.008 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.112 | 0.052 | 0.000 | 0.112 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000916 | 201.514 | 0.027 | n/a | 0.000 | 0.000 | 0.382 | 200.965 | 0.011 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.068 | 0.027 | 0.000 | 0.068 | gw-r/thread-52/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000917 | 201.346 | 0.022 | n/a | 0.000 | 0.000 | 0.497 | 200.732 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.053 | 0.022 | 0.000 | 0.053 | gw-r/thread-51/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000006 | 191.368 | 0.145 | n/a | 0.000 | 0.000 | 0.757 | 190.269 | 0.012 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.095 | 0.145 | 0.001 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000091a | 88.072 | 20.411 | n/a | 2.934 | 0.000 | 3.783 | 60.757 | 0.006 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.176 | 23.345 | 0.265 | 0.176 | gw-r/thread-49/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 48.036 | n/a | n/a | n/a | 0.212 | n/a | 0.000 | 0.000 | 1.313 | 44.187 | 0.008 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.057 | 0.212 | 0.000 | 0.057 |
| p99 | 1009.455 | n/a | n/a | n/a | 2.414 | n/a | 0.000 | 0.000 | 1.888 | 1003.797 | 1.578 | 0.000 | 0.743 | 0.000 | n/a | n/a | 1.236 | 2.414 | 0.050 | 1.236 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af26a32af45c53bd00000000000000a4 | 1009.455 | 0.212 | n/a | 0.000 | 0.000 | 1.888 | 1003.797 | 1.578 | 0.000 | 0.743 | 0.000 | n/a | n/a | 1.236 | 0.212 | 0.000 | 1.236 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd0000000000000476 | 48.036 | 2.414 | n/a | 0.000 | 0.000 | 1.313 | 44.187 | 0.008 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.057 | 2.414 | 0.050 | 0.057 | gw-r/thread-51/journal/page | none observed |

## P3 / warmup / internal (202 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.599 | n/a | n/a | n/a | 2.631 | n/a | 0.000 | 0.000 | 0.643 | 20.058 | 0.009 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.066 | 2.631 | 0.114 | 0.066 |
| p99 | 47.215 | n/a | n/a | n/a | 5.719 | n/a | 0.000 | 0.000 | 6.542 | 39.736 | 0.551 | 0.000 | 0.209 | 0.000 | n/a | n/a | 0.211 | 5.719 | 0.361 | 0.211 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af26a32af45c53bd0000000000000235 | 1005.630 | 0.186 | n/a | 0.000 | 0.000 | 3.619 | 1000.599 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 1.184 | 0.186 | 0.000 | 1.184 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd000000000000021b | 62.122 | 2.653 | n/a | 0.000 | 0.000 | 1.308 | 58.081 | 0.003 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.067 | 2.653 | 0.043 | 0.067 | gw-r/thread-52/journal/page | none observed |
| af26a32af45c53bd00000000000000a5 | 47.215 | 5.719 | n/a | 0.000 | 0.000 | 0.604 | 39.736 | 0.785 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.217 | 5.719 | 0.121 | 0.217 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd0000000000000184 | 38.756 | 2.632 | n/a | 0.000 | 0.000 | 0.740 | 35.134 | 0.029 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.062 | 2.632 | 0.068 | 0.062 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd00000000000001b8 | 36.966 | 4.647 | n/a | 0.000 | 0.000 | 1.802 | 30.289 | 0.009 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.139 | 4.647 | 0.126 | 0.139 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd0000000000000102 | 36.363 | 4.301 | n/a | 0.000 | 0.000 | 0.622 | 31.233 | 0.018 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.089 | 4.301 | 0.118 | 0.089 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd00000000000000db | 36.143 | 2.701 | n/a | 0.000 | 0.000 | 0.619 | 32.705 | 0.007 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.079 | 2.701 | 0.075 | 0.079 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd000000000000022d | 34.950 | 2.424 | n/a | 0.000 | 0.000 | 0.590 | 31.862 | 0.003 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.057 | 2.424 | 0.069 | 0.057 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd00000000000001d5 | 34.847 | 2.495 | n/a | 0.000 | 0.000 | 2.873 | 29.372 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.076 | 2.495 | 0.072 | 0.076 | gw-r/thread-50/journal/page | none observed |
| af26a32af45c53bd0000000000000121 | 34.634 | 4.636 | n/a | 0.000 | 0.000 | 0.521 | 29.195 | 0.008 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.144 | 4.636 | 0.134 | 0.144 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd0000000000000192 | 34.288 | 2.555 | n/a | 0.000 | 0.000 | 3.510 | 28.106 | 0.043 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.057 | 2.555 | 0.075 | 0.057 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd00000000000000bb | 34.082 | 4.628 | n/a | 0.000 | 0.000 | 0.704 | 28.503 | 0.021 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.080 | 4.628 | 0.136 | 0.080 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd00000000000001e1 | 34.065 | 4.699 | n/a | 0.000 | 0.000 | 0.522 | 28.652 | 0.021 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.138 | 4.699 | 0.138 | 0.138 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd0000000000000116 | 33.272 | 2.204 | n/a | 0.000 | 0.000 | 0.544 | 30.440 | 0.006 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.057 | 2.204 | 0.066 | 0.057 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd00000000000001de | 33.258 | 2.321 | n/a | 0.000 | 0.000 | 2.671 | 28.152 | 0.012 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.056 | 2.321 | 0.070 | 0.056 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd00000000000001e9 | 32.941 | 4.691 | n/a | 0.000 | 0.000 | 0.415 | 27.660 | 0.012 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.125 | 4.691 | 0.142 | 0.125 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd00000000000000f3 | 32.712 | 2.343 | n/a | 0.000 | 0.000 | 0.843 | 29.406 | 0.008 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.078 | 2.343 | 0.072 | 0.078 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd0000000000000142 | 32.695 | 2.121 | n/a | 0.000 | 0.000 | 0.515 | 29.973 | 0.005 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.058 | 2.121 | 0.065 | 0.058 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd000000000000019a | 32.361 | 2.297 | n/a | 0.000 | 0.000 | 0.435 | 29.516 | 0.010 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.065 | 2.297 | 0.071 | 0.065 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd0000000000000207 | 32.307 | 4.989 | n/a | 0.000 | 0.000 | 0.823 | 26.321 | 0.005 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.158 | 4.989 | 0.154 | 0.158 | gw-r/thread-45/journal/page | none observed |

## P3 / idle-10 / internal (124 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.337 | n/a | n/a | n/a | 2.472 | n/a | 0.000 | 0.000 | 0.635 | 5.539 | 0.005 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.070 | 2.472 | 0.283 | 0.070 |
| p99 | 89.706 | n/a | n/a | n/a | 20.840 | n/a | 0.000 | 0.000 | 36.239 | 46.147 | 1.760 | 0.000 | 0.086 | 0.000 | n/a | n/a | 1.940 | 20.840 | 0.765 | 1.940 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af26a32af45c53bd0000000000000348 | 1009.229 | 3.842 | n/a | 0.000 | 0.000 | 0.550 | 1004.676 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.112 | 3.842 | 0.004 | 0.112 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd00000000000002ab | 89.706 | 23.703 | n/a | 0.000 | 0.000 | 61.681 | 4.115 | 0.008 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.195 | 23.703 | 0.264 | 0.195 | node-14/thread-2/socket.wait-first-byte | none observed |
| af26a32af45c53bd00000000000002a5 | 59.103 | 11.356 | n/a | 0.000 | 0.000 | 36.239 | 11.361 | 0.012 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.084 | 11.356 | 0.192 | 0.084 | node-14/thread-2/socket.wait-first-byte | none observed |
| af26a32af45c53bd00000000000002c4 | 49.915 | 2.723 | n/a | 0.000 | 0.000 | 0.920 | 46.147 | 0.007 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.081 | 2.723 | 0.055 | 0.081 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd00000000000002ba | 37.796 | 20.840 | n/a | 0.000 | 0.000 | 5.155 | 11.606 | 0.010 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.175 | 20.840 | 0.551 | 0.175 | node-14/thread-2/replica.fetch-feed | none observed |
| af26a32af45c53bd000000000000028b | 32.859 | 8.498 | n/a | 0.000 | 0.000 | 0.790 | 23.328 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.186 | 8.498 | 0.259 | 0.186 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd00000000000002be | 24.569 | 15.517 | n/a | 0.000 | 0.000 | 3.829 | 1.858 | 0.005 | 0.000 | 0.009 | 0.000 | n/a | n/a | 3.351 | 15.517 | 0.632 | 3.351 | node-14/thread-2/replica.fetch-feed | none observed |
| af26a32af45c53bd00000000000002b8 | 22.851 | 14.477 | n/a | 0.000 | 0.000 | 5.910 | 2.142 | 0.005 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.303 | 14.477 | 0.634 | 0.303 | node-14/thread-2/replica.fetch-feed | none observed |
| af26a32af45c53bd00000000000002b3 | 21.134 | 17.526 | n/a | 0.000 | 0.000 | 1.022 | 1.917 | 0.317 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.340 | 17.526 | 0.829 | 0.340 | node-14/thread-2/replica.fetch-feed | none observed |
| af26a32af45c53bd0000000000000285 | 19.709 | 2.202 | n/a | 0.000 | 0.000 | 0.746 | 16.618 | 0.009 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.077 | 2.202 | 0.112 | 0.077 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd0000000000000325 | 19.628 | 2.393 | n/a | 0.000 | 0.000 | 0.747 | 16.390 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.056 | 2.393 | 0.122 | 0.056 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd000000000000023b | 19.386 | 5.227 | n/a | 0.000 | 0.000 | 0.946 | 13.031 | 0.010 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.123 | 5.227 | 0.270 | 0.123 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd00000000000002eb | 18.820 | 4.422 | n/a | 0.000 | 0.000 | 1.972 | 12.286 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.102 | 4.422 | 0.235 | 0.102 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd0000000000000254 | 18.489 | 2.997 | n/a | 0.000 | 0.000 | 0.635 | 14.716 | 0.008 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.074 | 2.997 | 0.162 | 0.074 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd00000000000002cf | 18.368 | 8.754 | n/a | 0.000 | 0.000 | 1.241 | 6.419 | 0.004 | 0.000 | 0.009 | 0.000 | n/a | n/a | 1.940 | 8.754 | 0.477 | 1.940 | node-14/thread-2/replica.fetch-feed | none observed |
| af26a32af45c53bd0000000000000245 | 17.706 | 2.588 | n/a | 0.000 | 0.000 | 2.907 | 12.096 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.068 | 2.588 | 0.146 | 0.068 | gw-r/thread-52/journal/page | none observed |
| af26a32af45c53bd00000000000002dd | 17.143 | 4.519 | n/a | 0.000 | 0.000 | 2.417 | 10.018 | 0.009 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.094 | 4.519 | 0.264 | 0.094 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd000000000000032d | 16.979 | 3.108 | n/a | 0.000 | 0.000 | 0.418 | 13.299 | 0.005 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.127 | 3.108 | 0.183 | 0.127 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd0000000000000331 | 16.690 | 2.301 | n/a | 0.000 | 0.000 | 2.460 | 11.807 | 0.009 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.063 | 2.301 | 0.138 | 0.063 | gw-r/thread-50/journal/page | none observed |
| af26a32af45c53bd0000000000000305 | 16.080 | 2.164 | n/a | 0.000 | 0.000 | 0.462 | 13.362 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.062 | 2.164 | 0.135 | 0.062 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-25 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.152 | n/a | n/a | n/a | 2.272 | n/a | 0.000 | 0.000 | 0.508 | 21.534 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.059 | 2.272 | 0.095 | 0.059 |
| p99 | 46.906 | n/a | n/a | n/a | 4.966 | n/a | 0.000 | 0.000 | 2.548 | 44.148 | 0.039 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.175 | 4.966 | 0.192 | 0.175 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af26a32af45c53bd0000000000000474 | 1002.718 | 0.153 | n/a | 0.000 | 0.000 | 0.552 | 1000.852 | 0.008 | 0.000 | 0.039 | 0.000 | n/a | n/a | 1.114 | 0.153 | 0.000 | 1.114 | gw-r/thread-52/journal/page | none observed |
| af26a32af45c53bd00000000000003e9 | 46.906 | 2.202 | n/a | 0.000 | 0.000 | 0.463 | 44.148 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.053 | 2.202 | 0.047 | 0.053 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd0000000000000382 | 38.498 | 5.419 | n/a | 0.000 | 0.000 | 0.749 | 32.144 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.175 | 5.419 | 0.141 | 0.175 | gw-r/thread-50/journal/page | none observed |
| af26a32af45c53bd00000000000003b9 | 34.152 | 2.095 | n/a | 0.000 | 0.000 | 0.352 | 31.594 | 0.008 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.055 | 2.095 | 0.061 | 0.055 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd000000000000038a | 33.758 | 2.099 | n/a | 0.000 | 0.000 | 0.371 | 31.204 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.052 | 2.099 | 0.062 | 0.052 | gw-r/thread-52/journal/page | none observed |
| af26a32af45c53bd00000000000003c0 | 33.116 | 2.411 | n/a | 0.000 | 0.000 | 0.548 | 30.075 | 0.003 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.069 | 2.411 | 0.073 | 0.069 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd000000000000045f | 32.381 | 2.111 | n/a | 0.000 | 0.000 | 0.420 | 29.761 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.054 | 2.111 | 0.065 | 0.054 | gw-r/thread-52/journal/page | none observed |
| af26a32af45c53bd0000000000000471 | 31.779 | 3.805 | n/a | 0.000 | 0.000 | 0.533 | 27.335 | 0.002 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.091 | 3.805 | 0.120 | 0.091 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd00000000000003c7 | 30.752 | 2.727 | n/a | 0.000 | 0.000 | 0.361 | 27.505 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.116 | 2.727 | 0.089 | 0.116 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd000000000000043b | 30.305 | 3.217 | n/a | 0.000 | 0.000 | 0.352 | 26.646 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.066 | 3.217 | 0.106 | 0.066 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd0000000000000435 | 29.957 | 2.209 | n/a | 0.000 | 0.000 | 0.396 | 27.250 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.060 | 2.209 | 0.074 | 0.060 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd0000000000000446 | 29.631 | 1.931 | n/a | 0.000 | 0.000 | 0.351 | 27.237 | 0.014 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.051 | 1.931 | 0.065 | 0.051 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd000000000000045a | 29.631 | 4.966 | n/a | 0.000 | 0.000 | 0.601 | 23.955 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.099 | 4.966 | 0.168 | 0.099 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd0000000000000370 | 29.613 | 2.043 | n/a | 0.000 | 0.000 | 0.321 | 27.160 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.057 | 2.043 | 0.069 | 0.057 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd0000000000000354 | 29.535 | 2.576 | n/a | 0.000 | 0.000 | 0.690 | 26.156 | 0.004 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.056 | 2.576 | 0.087 | 0.056 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd00000000000003d8 | 29.226 | 2.039 | n/a | 0.000 | 0.000 | 0.433 | 26.660 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.061 | 2.039 | 0.070 | 0.061 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd0000000000000360 | 28.980 | 4.430 | n/a | 0.000 | 0.000 | 0.781 | 23.566 | 0.008 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.117 | 4.430 | 0.153 | 0.117 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd00000000000003a1 | 28.776 | 4.251 | n/a | 0.000 | 0.000 | 0.508 | 23.873 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.115 | 4.251 | 0.148 | 0.115 | gw-r/thread-50/journal/page | none observed |
| af26a32af45c53bd000000000000037e | 28.725 | 4.181 | n/a | 0.000 | 0.000 | 0.559 | 23.869 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.086 | 4.181 | 0.146 | 0.086 | gw-r/thread-50/journal/page | none observed |
| af26a32af45c53bd00000000000003ff | 28.716 | 2.975 | n/a | 0.000 | 0.000 | 0.589 | 25.046 | 0.015 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.074 | 2.975 | 0.104 | 0.074 | gw-r/thread-52/journal/page | none observed |

## P3 / idle-50 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 49.965 | n/a | n/a | n/a | 2.379 | n/a | 0.000 | 0.000 | 0.517 | 46.379 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.059 | 2.379 | 0.048 | 0.059 |
| p99 | 103.824 | n/a | n/a | n/a | 5.198 | n/a | 0.000 | 0.000 | 3.743 | 100.263 | 0.079 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.154 | 5.198 | 0.108 | 0.154 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af26a32af45c53bd00000000000005a1 | 1003.722 | 0.104 | n/a | 0.000 | 0.000 | 0.892 | 1001.564 | 0.007 | 0.000 | 0.055 | 0.000 | n/a | n/a | 1.100 | 0.104 | 0.000 | 1.100 | gw-r/thread-50/journal/page | none observed |
| af26a32af45c53bd00000000000005a3 | 103.824 | 3.006 | n/a | 0.000 | 0.000 | 0.344 | 100.263 | 0.012 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.139 | 3.006 | 0.029 | 0.139 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd00000000000004e4 | 59.038 | 2.005 | n/a | 0.000 | 0.000 | 0.370 | 56.580 | 0.005 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.059 | 2.005 | 0.034 | 0.059 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd0000000000000558 | 58.408 | 2.297 | n/a | 0.000 | 0.000 | 0.318 | 55.681 | 0.010 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.071 | 2.297 | 0.039 | 0.071 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd0000000000000521 | 57.783 | 4.826 | n/a | 0.000 | 0.000 | 0.402 | 52.368 | 0.011 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.094 | 4.826 | 0.084 | 0.094 | gw-r/thread-52/journal/page | none observed |
| af26a32af45c53bd0000000000000488 | 57.597 | 2.432 | n/a | 0.000 | 0.000 | 0.623 | 54.414 | 0.005 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.066 | 2.432 | 0.042 | 0.066 | gw-r/thread-52/journal/page | none observed |
| af26a32af45c53bd0000000000000568 | 56.773 | 2.311 | n/a | 0.000 | 0.000 | 0.569 | 53.777 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.071 | 2.311 | 0.041 | 0.071 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd00000000000004ca | 55.362 | 4.494 | n/a | 0.000 | 0.000 | 0.466 | 50.293 | 0.008 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.057 | 4.494 | 0.081 | 0.057 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd0000000000000509 | 55.134 | 1.946 | n/a | 0.000 | 0.000 | 0.371 | 52.700 | 0.012 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.052 | 1.946 | 0.035 | 0.052 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd0000000000000563 | 54.931 | 1.920 | n/a | 0.000 | 0.000 | 0.459 | 52.459 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.059 | 1.920 | 0.035 | 0.059 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd000000000000055c | 54.526 | 3.785 | n/a | 0.000 | 0.000 | 0.721 | 49.897 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.071 | 3.785 | 0.069 | 0.071 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd0000000000000498 | 54.415 | 3.558 | n/a | 0.000 | 0.000 | 0.824 | 49.960 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.062 | 3.558 | 0.065 | 0.062 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd00000000000004b6 | 54.344 | 4.199 | n/a | 0.000 | 0.000 | 0.488 | 49.515 | 0.007 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.095 | 4.199 | 0.077 | 0.095 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd00000000000004d4 | 54.283 | 3.591 | n/a | 0.000 | 0.000 | 0.913 | 49.618 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.109 | 3.591 | 0.066 | 0.109 | gw-r/thread-50/journal/page | none observed |
| af26a32af45c53bd000000000000055f | 54.248 | 2.114 | n/a | 0.000 | 0.000 | 0.564 | 51.476 | 0.014 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.053 | 2.114 | 0.039 | 0.053 | gw-r/thread-52/journal/page | none observed |
| af26a32af45c53bd000000000000047c | 53.880 | 4.168 | n/a | 0.000 | 0.000 | 0.519 | 49.051 | 0.007 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.096 | 4.168 | 0.077 | 0.096 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd0000000000000512 | 53.874 | 2.234 | n/a | 0.000 | 0.000 | 0.436 | 51.106 | 0.009 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.054 | 2.234 | 0.041 | 0.054 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd00000000000004fe | 53.760 | 1.917 | n/a | 0.000 | 0.000 | 3.743 | 47.997 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.052 | 1.917 | 0.036 | 0.052 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd000000000000053a | 53.753 | 4.565 | n/a | 0.000 | 0.000 | 0.566 | 48.529 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.066 | 4.565 | 0.085 | 0.066 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd0000000000000544 | 53.607 | 2.213 | n/a | 0.000 | 0.000 | 0.442 | 50.817 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.082 | 2.213 | 0.041 | 0.082 | gw-r/thread-52/journal/page | none observed |

## P3 / idle-100 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 99.842 | n/a | n/a | n/a | 2.390 | n/a | 0.000 | 0.000 | 0.536 | 96.516 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.066 | 2.390 | 0.024 | 0.066 |
| p99 | 250.189 | n/a | n/a | n/a | 5.279 | n/a | 0.000 | 0.000 | 2.912 | 244.954 | 0.118 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.167 | 5.279 | 0.052 | 0.167 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af26a32af45c53bd00000000000006ce | 1002.727 | 0.142 | n/a | 0.000 | 0.000 | 0.573 | 1000.832 | 0.005 | 0.000 | 0.063 | 0.000 | n/a | n/a | 1.112 | 0.142 | 0.000 | 1.112 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd00000000000006d0 | 250.189 | 4.294 | n/a | 0.000 | 0.000 | 0.752 | 244.954 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.151 | 4.294 | 0.017 | 0.151 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd000000000000060c | 124.243 | 2.342 | n/a | 0.000 | 0.000 | 0.598 | 121.167 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.075 | 2.342 | 0.019 | 0.075 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd0000000000000633 | 110.066 | 6.735 | n/a | 0.000 | 0.000 | 0.631 | 102.501 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.150 | 6.735 | 0.061 | 0.150 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd0000000000000629 | 109.264 | 2.450 | n/a | 0.000 | 0.000 | 1.102 | 105.637 | 0.003 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.057 | 2.450 | 0.022 | 0.057 | gw-r/thread-52/journal/page | none observed |
| af26a32af45c53bd00000000000005d6 | 107.975 | 2.904 | n/a | 0.000 | 0.000 | 1.181 | 103.692 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.150 | 2.904 | 0.027 | 0.150 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd000000000000062f | 106.587 | 2.019 | n/a | 0.000 | 0.000 | 0.379 | 104.072 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.058 | 2.019 | 0.019 | 0.058 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd00000000000005fa | 105.536 | 2.171 | n/a | 0.000 | 0.000 | 0.461 | 102.807 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.056 | 2.171 | 0.021 | 0.056 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd0000000000000617 | 105.453 | 4.281 | n/a | 0.000 | 0.000 | 1.066 | 99.940 | 0.009 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.116 | 4.281 | 0.041 | 0.116 | gw-r/thread-52/journal/page | none observed |
| af26a32af45c53bd0000000000000671 | 104.603 | 3.887 | n/a | 0.000 | 0.000 | 0.389 | 100.174 | 0.003 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.133 | 3.887 | 0.037 | 0.133 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd0000000000000687 | 104.385 | 4.400 | n/a | 0.000 | 0.000 | 0.534 | 99.252 | 0.011 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.097 | 4.400 | 0.042 | 0.097 | gw-r/thread-50/journal/page | none observed |
| af26a32af45c53bd00000000000005e3 | 104.117 | 2.907 | n/a | 0.000 | 0.000 | 0.762 | 100.355 | 0.003 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.068 | 2.907 | 0.028 | 0.068 | gw-r/thread-50/journal/page | none observed |
| af26a32af45c53bd00000000000005d1 | 103.663 | 4.170 | n/a | 0.000 | 0.000 | 0.622 | 98.729 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.103 | 4.170 | 0.040 | 0.103 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd00000000000005b5 | 103.653 | 1.969 | n/a | 0.000 | 0.000 | 0.442 | 101.146 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.054 | 1.969 | 0.019 | 0.054 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd00000000000005f3 | 103.600 | 5.040 | n/a | 0.000 | 0.000 | 0.639 | 97.722 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.146 | 5.040 | 0.049 | 0.146 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd0000000000000603 | 103.584 | 2.700 | n/a | 0.000 | 0.000 | 0.529 | 100.196 | 0.009 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.100 | 2.700 | 0.026 | 0.100 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd00000000000005c1 | 103.545 | 2.009 | n/a | 0.000 | 0.000 | 0.536 | 100.883 | 0.005 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.055 | 2.009 | 0.019 | 0.055 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd00000000000006ab | 103.462 | 4.420 | n/a | 0.000 | 0.000 | 0.560 | 98.347 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.095 | 4.420 | 0.043 | 0.095 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd00000000000006c5 | 103.246 | 2.283 | n/a | 0.000 | 0.000 | 0.299 | 100.549 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.056 | 2.283 | 0.022 | 0.056 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd00000000000005de | 103.174 | 4.176 | n/a | 0.000 | 0.000 | 0.576 | 98.298 | 0.008 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.102 | 4.176 | 0.040 | 0.102 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-250 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 249.885 | n/a | n/a | n/a | 2.514 | n/a | 0.000 | 0.000 | 0.601 | 245.974 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.072 | 2.514 | 0.010 | 0.072 |
| p99 | 495.132 | n/a | n/a | n/a | 5.910 | n/a | 0.000 | 0.000 | 2.634 | 491.571 | 0.034 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.159 | 5.910 | 0.023 | 0.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af26a32af45c53bd00000000000007fb | 1002.246 | 0.100 | n/a | 0.000 | 0.000 | 0.394 | 1000.599 | 0.004 | 0.000 | 0.050 | 0.000 | n/a | n/a | 1.098 | 0.100 | 0.000 | 1.098 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd00000000000007fd | 495.132 | 2.057 | n/a | 0.000 | 0.000 | 1.395 | 491.571 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.055 | 2.057 | 0.004 | 0.055 | gw-r/thread-52/journal/page | none observed |
| af26a32af45c53bd0000000000000722 | 264.795 | 2.511 | n/a | 0.000 | 0.000 | 0.422 | 261.754 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.069 | 2.511 | 0.009 | 0.069 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd00000000000007a5 | 260.929 | 10.561 | n/a | 0.000 | 0.000 | 1.608 | 248.640 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.094 | 10.561 | 0.040 | 0.094 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd00000000000006e8 | 259.101 | 4.588 | n/a | 0.000 | 0.000 | 0.371 | 253.931 | 0.034 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.124 | 4.588 | 0.018 | 0.124 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd000000000000078c | 258.554 | 2.180 | n/a | 0.000 | 0.000 | 0.455 | 255.818 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.059 | 2.180 | 0.008 | 0.059 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd00000000000007b3 | 257.600 | 4.986 | n/a | 0.000 | 0.000 | 0.736 | 251.684 | 0.008 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.125 | 4.986 | 0.019 | 0.125 | gw-r/thread-50/journal/page | none observed |
| af26a32af45c53bd00000000000006f2 | 256.775 | 2.359 | n/a | 0.000 | 0.000 | 0.607 | 253.664 | 0.017 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.059 | 2.359 | 0.009 | 0.059 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd0000000000000765 | 256.662 | 3.463 | n/a | 0.000 | 0.000 | 0.710 | 252.364 | 0.004 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.076 | 3.463 | 0.013 | 0.076 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd00000000000007d6 | 256.641 | 3.456 | n/a | 0.000 | 0.000 | 0.877 | 252.105 | 0.010 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.072 | 3.456 | 0.013 | 0.072 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd00000000000007f4 | 256.475 | 4.240 | n/a | 0.000 | 0.000 | 0.724 | 251.358 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.105 | 4.240 | 0.017 | 0.105 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd0000000000000762 | 255.736 | 2.314 | n/a | 0.000 | 0.000 | 0.754 | 252.513 | 0.008 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.080 | 2.314 | 0.009 | 0.080 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd00000000000007ca | 255.695 | 2.503 | n/a | 0.000 | 0.000 | 0.583 | 252.448 | 0.017 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.063 | 2.503 | 0.010 | 0.063 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd0000000000000772 | 255.484 | 4.736 | n/a | 0.000 | 0.000 | 0.794 | 249.750 | 0.010 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.122 | 4.736 | 0.019 | 0.122 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd00000000000006f8 | 255.152 | 2.151 | n/a | 0.000 | 0.000 | 0.479 | 252.409 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.076 | 2.151 | 0.008 | 0.076 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd0000000000000782 | 254.590 | 2.036 | n/a | 0.000 | 0.000 | 1.040 | 251.421 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.058 | 2.036 | 0.008 | 0.058 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd000000000000073a | 254.511 | 4.666 | n/a | 0.000 | 0.000 | 1.890 | 247.781 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.119 | 4.666 | 0.018 | 0.119 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd0000000000000792 | 254.423 | 2.247 | n/a | 0.000 | 0.000 | 1.579 | 250.499 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.063 | 2.247 | 0.009 | 0.063 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd00000000000007a3 | 254.418 | 5.100 | n/a | 0.000 | 0.000 | 0.671 | 248.494 | 0.011 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.089 | 5.100 | 0.020 | 0.089 | gw-r/thread-50/journal/page | none observed |
| af26a32af45c53bd0000000000000704 | 254.285 | 2.112 | n/a | 0.000 | 0.000 | 0.320 | 251.738 | 0.007 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.062 | 2.112 | 0.008 | 0.062 | gw-r/thread-51/journal/page | none observed |

## P3 / idle-500 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 500.352 | n/a | n/a | n/a | 2.590 | n/a | 0.000 | 0.000 | 0.544 | 496.251 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.068 | 2.590 | 0.005 | 0.068 |
| p99 | 1000.625 | n/a | n/a | n/a | 5.357 | n/a | 0.000 | 0.000 | 2.635 | 997.648 | 0.024 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.183 | 5.357 | 0.011 | 0.183 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af26a32af45c53bd0000000000000928 | 1002.828 | 0.096 | n/a | 0.000 | 0.000 | 0.546 | 1001.033 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 1.122 | 0.096 | 0.000 | 1.122 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd000000000000092a | 1000.625 | 2.311 | n/a | 0.000 | 0.000 | 0.556 | 997.648 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.081 | 2.311 | 0.002 | 0.081 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd000000000000089c | 563.969 | 4.411 | n/a | 0.000 | 0.000 | 0.634 | 514.058 | 0.010 | 44.684 | 0.057 | 0.000 | n/a | n/a | 0.115 | 4.411 | 0.008 | 0.115 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd000000000000088a | 523.144 | 4.676 | n/a | 0.000 | 0.000 | 0.725 | 517.598 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.099 | 4.676 | 0.009 | 0.099 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd0000000000000903 | 506.809 | 3.882 | n/a | 0.000 | 0.000 | 0.423 | 502.388 | 0.005 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.097 | 3.882 | 0.008 | 0.097 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd000000000000086f | 505.643 | 4.397 | n/a | 0.000 | 0.000 | 0.541 | 500.539 | 0.016 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.101 | 4.397 | 0.009 | 0.101 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd0000000000000853 | 505.525 | 2.217 | n/a | 0.000 | 0.000 | 0.386 | 502.777 | 0.016 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.074 | 2.217 | 0.004 | 0.074 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd00000000000008af | 505.446 | 4.486 | n/a | 0.000 | 0.000 | 0.396 | 500.443 | 0.008 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.072 | 4.486 | 0.009 | 0.072 | gw-r/thread-52/journal/page | none observed |
| af26a32af45c53bd00000000000008bf | 504.767 | 2.512 | n/a | 0.000 | 0.000 | 0.432 | 501.726 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.067 | 2.512 | 0.005 | 0.067 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd00000000000008bb | 504.637 | 5.823 | n/a | 0.000 | 0.000 | 0.546 | 498.073 | 0.008 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.149 | 5.823 | 0.012 | 0.149 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd0000000000000911 | 504.635 | 3.186 | n/a | 0.000 | 0.000 | 0.580 | 500.781 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.057 | 3.186 | 0.006 | 0.057 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd0000000000000817 | 504.368 | 2.500 | n/a | 0.000 | 0.000 | 0.373 | 501.346 | 0.024 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.064 | 2.500 | 0.005 | 0.064 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd00000000000008dd | 503.943 | 4.386 | n/a | 0.000 | 0.000 | 0.705 | 498.719 | 0.008 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.108 | 4.386 | 0.009 | 0.108 | gw-r/thread-50/journal/page | none observed |
| af26a32af45c53bd00000000000008fb | 503.573 | 2.466 | n/a | 0.000 | 0.000 | 0.628 | 500.373 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.063 | 2.466 | 0.005 | 0.063 | gw-r/thread-50/journal/page | none observed |
| af26a32af45c53bd0000000000000884 | 503.541 | 2.670 | n/a | 0.000 | 0.000 | 2.204 | 498.561 | 0.004 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.058 | 2.670 | 0.005 | 0.058 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd0000000000000803 | 503.523 | 4.498 | n/a | 0.000 | 0.000 | 0.665 | 498.191 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.124 | 4.498 | 0.009 | 0.124 | gw-r/thread-50/journal/page | none observed |
| af26a32af45c53bd0000000000000820 | 503.515 | 3.760 | n/a | 0.000 | 0.000 | 0.802 | 498.850 | 0.007 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.058 | 3.760 | 0.007 | 0.058 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd0000000000000873 | 503.491 | 4.308 | n/a | 0.000 | 0.000 | 0.642 | 498.403 | 0.006 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.100 | 4.308 | 0.009 | 0.100 | gw-r/thread-52/journal/page | none observed |
| af26a32af45c53bd0000000000000828 | 503.277 | 2.201 | n/a | 0.000 | 0.000 | 0.959 | 500.007 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.068 | 2.201 | 0.004 | 0.068 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd0000000000000858 | 503.225 | 5.157 | n/a | 0.000 | 0.000 | 1.319 | 496.593 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.112 | 5.157 | 0.010 | 0.112 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-1000 / internal (155 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1000.085 | n/a | n/a | n/a | 3.073 | n/a | 0.000 | 0.000 | 0.621 | 995.135 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.077 | 3.351 | 0.003 | 0.077 |
| p99 | 1005.668 | n/a | n/a | n/a | 6.728 | n/a | 1.455 | 0.000 | 3.193 | 1001.263 | 0.021 | 0.000 | 0.099 | 0.000 | n/a | n/a | 1.167 | 7.714 | 0.831 | 1.167 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af26a32af45c53bd0000000000000a41 | 1007.208 | 5.676 | n/a | 0.831 | 0.000 | 0.721 | 999.765 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.176 | 6.507 | 0.006 | 0.176 | gw-r/thread-50/journal/page | none observed |
| af26a32af45c53bd0000000000000979 | 1005.668 | 6.131 | n/a | 0.579 | 0.000 | 0.804 | 997.966 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.154 | 6.710 | 0.007 | 0.154 | gw-r/thread-52/journal/page | none observed |
| af26a32af45c53bd00000000000009d8 | 1005.406 | 4.654 | n/a | 0.000 | 0.000 | 0.660 | 999.979 | 0.009 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.078 | 4.654 | 0.005 | 0.078 | gw-r/thread-52/journal/page | none observed |
| af26a32af45c53bd00000000000009c0 | 1005.152 | 2.805 | n/a | 0.553 | 0.000 | 0.765 | 1000.911 | 0.003 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.096 | 3.358 | 0.003 | 0.096 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd000000000000097f | 1005.033 | 5.389 | n/a | 0.910 | 0.000 | 0.471 | 998.099 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.134 | 6.299 | 0.006 | 0.134 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd00000000000009bc | 1004.873 | 5.242 | n/a | 0.000 | 0.000 | 0.763 | 998.747 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.084 | 5.242 | 0.005 | 0.084 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd0000000000000a28 | 1004.627 | 2.435 | n/a | 0.000 | 0.000 | 0.621 | 1001.429 | 0.011 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.076 | 2.435 | 0.002 | 0.076 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd00000000000009ec | 1004.508 | 2.878 | n/a | 0.771 | 0.000 | 0.493 | 1000.161 | 0.021 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.130 | 3.650 | 0.004 | 0.130 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd0000000000000a04 | 1004.395 | 2.647 | n/a | 0.000 | 0.000 | 0.463 | 1001.069 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.176 | 2.647 | 0.003 | 0.176 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd0000000000000a58 | 1004.260 | 0.158 | n/a | 0.000 | 0.000 | 1.616 | 1001.263 | 0.011 | 0.000 | 0.102 | 0.000 | n/a | n/a | 1.108 | 0.158 | 0.000 | 1.108 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd0000000000000a50 | 1004.189 | 4.706 | n/a | 0.000 | 0.000 | 0.681 | 997.817 | 0.009 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.952 | 4.706 | 0.005 | 0.952 | gw-r/thread-51/journal/page | none observed |
| af26a32af45c53bd00000000000009af | 1003.965 | 5.701 | n/a | 0.000 | 0.000 | 0.405 | 997.748 | 0.009 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.074 | 5.701 | 0.006 | 0.074 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd000000000000094a | 1003.887 | 6.357 | n/a | 1.338 | 0.000 | 1.774 | 994.300 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.089 | 7.695 | 0.008 | 0.089 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd00000000000009c8 | 1003.840 | 6.728 | n/a | 0.684 | 0.000 | 2.883 | 993.339 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.166 | 7.411 | 0.007 | 0.166 | gw-r/thread-49/journal/page | none observed |
| af26a32af45c53bd0000000000000958 | 1003.800 | 4.691 | n/a | 0.455 | 0.000 | 0.759 | 997.725 | 0.007 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.127 | 5.146 | 0.005 | 0.127 | gw-r/thread-47/journal/page | none observed |
| af26a32af45c53bd0000000000000a0f | 1003.741 | 6.529 | n/a | 0.000 | 0.000 | 0.428 | 996.625 | 0.008 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.115 | 6.529 | 0.007 | 0.115 | gw-r/thread-50/journal/page | none observed |
| af26a32af45c53bd00000000000009a5 | 1003.677 | 2.897 | n/a | 0.000 | 0.000 | 0.461 | 1000.226 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.058 | 2.897 | 0.003 | 0.058 | gw-r/thread-48/journal/page | none observed |
| af26a32af45c53bd0000000000000a5a | 1003.428 | 0.255 | n/a | 0.000 | 0.000 | 1.072 | 1000.867 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 1.206 | 0.255 | 0.000 | 1.206 | gw-r/thread-45/journal/page | none observed |
| af26a32af45c53bd00000000000009c4 | 1003.326 | 6.671 | n/a | 0.668 | 0.000 | 1.179 | 994.541 | 0.010 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.235 | 7.339 | 0.007 | 0.235 | gw-r/thread-52/journal/page | none observed |
| af26a32af45c53bd0000000000000a1e | 1003.255 | 4.136 | n/a | 0.000 | 0.000 | 0.441 | 998.563 | 0.009 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.064 | 4.136 | 0.004 | 0.064 | gw-r/thread-49/journal/page | none observed |

## P3 / warmup / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.473 | n/a | n/a | n/a | 0.033 | n/a | 0.000 | 0.000 | 0.873 | 200.647 | 0.007 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.081 | 0.033 | 0.000 | 0.081 |
| p99 | 205.101 | n/a | n/a | n/a | 0.073 | n/a | 0.000 | 0.000 | 4.275 | 201.077 | 0.010 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.127 | 0.073 | 0.001 | 0.127 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2065e6fc38c5bcc600000000000000ce | 205.101 | 0.033 | n/a | 0.000 | 0.000 | 4.275 | 200.647 | 0.008 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.081 | 0.033 | 0.000 | 0.081 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc600000000000000d1 | 202.724 | 0.048 | n/a | 0.000 | 0.000 | 1.517 | 200.992 | 0.006 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.090 | 0.048 | 0.000 | 0.090 | gw-r/thread-51/journal/page | none observed |
| 2065e6fc38c5bcc600000000000000cf | 201.891 | 0.028 | n/a | 0.000 | 0.000 | 0.625 | 201.077 | 0.010 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.067 | 0.028 | 0.000 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc600000000000000d0 | 201.473 | 0.031 | n/a | 0.000 | 0.000 | 0.529 | 200.746 | 0.007 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.080 | 0.031 | 0.000 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc600000000000000d2 | 133.075 | 0.073 | n/a | 0.000 | 0.000 | 0.873 | 131.950 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.127 | 0.073 | 0.001 | 0.127 | gw-r/thread-52/journal/page | none observed |
| 2065e6fc38c5bcc600000000000000c1 | 58.245 | 0.056 | n/a | 0.000 | 0.000 | 1.211 | 56.857 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.085 | 0.056 | 0.001 | 0.085 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-10 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.524 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.774 | 200.993 | 0.010 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.089 | 0.041 | 0.000 | 0.089 |
| p99 | 203.813 | n/a | n/a | n/a | 0.044 | n/a | 0.000 | 0.000 | 2.605 | 202.321 | 4.597 | 0.000 | 0.210 | 0.000 | n/a | n/a | 0.109 | 0.044 | 0.000 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2065e6fc38c5bcc6000000000000015a | 203.813 | 0.041 | n/a | 0.000 | 0.000 | 2.605 | 200.993 | 0.006 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.101 | 0.041 | 0.000 | 0.101 | gw-r/thread-49/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000157 | 203.229 | 0.031 | n/a | 0.000 | 0.000 | 0.584 | 202.321 | 0.013 | 0.000 | 0.210 | 0.000 | n/a | n/a | 0.071 | 0.031 | 0.000 | 0.071 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000158 | 202.524 | 0.041 | n/a | 0.000 | 0.000 | 0.890 | 201.397 | 0.010 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.089 | 0.041 | 0.000 | 0.089 | gw-r/thread-52/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000159 | 201.995 | 0.044 | n/a | 0.000 | 0.000 | 0.774 | 200.984 | 0.008 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.109 | 0.044 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000015b | 113.081 | 0.043 | n/a | 0.000 | 0.000 | 0.641 | 107.716 | 4.597 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.062 | 0.043 | 0.000 | 0.062 | gw-r/thread-50/journal/page | none observed |

## P3 / idle-25 / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.113 | n/a | n/a | n/a | 0.038 | n/a | 0.000 | 0.000 | 0.559 | 200.628 | 0.006 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.065 | 0.038 | 0.000 | 0.065 |
| p99 | 208.664 | n/a | n/a | n/a | 0.065 | n/a | 0.000 | 0.000 | 6.968 | 201.380 | 0.013 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.156 | 0.065 | 0.003 | 0.156 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2065e6fc38c5bcc600000000000001f4 | 208.664 | 0.053 | n/a | 0.000 | 0.000 | 6.968 | 201.380 | 0.013 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.156 | 0.053 | 0.000 | 0.156 | gw-r/thread-49/journal/page | none observed |
| 2065e6fc38c5bcc600000000000001f3 | 205.539 | 0.038 | n/a | 0.000 | 0.000 | 4.651 | 200.708 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.087 | 0.038 | 0.000 | 0.087 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc600000000000001f2 | 201.327 | 0.030 | n/a | 0.000 | 0.000 | 0.402 | 200.759 | 0.007 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.065 | 0.030 | 0.000 | 0.065 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc600000000000001f1 | 201.113 | 0.025 | n/a | 0.000 | 0.000 | 0.359 | 200.628 | 0.006 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.052 | 0.025 | 0.000 | 0.052 | gw-r/thread-51/journal/page | none observed |
| 2065e6fc38c5bcc600000000000001f5 | 122.994 | 0.045 | n/a | 0.000 | 0.000 | 0.681 | 122.169 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.065 | 0.045 | 0.000 | 0.065 | gw-r/thread-50/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000175 | 24.174 | 0.065 | n/a | 0.000 | 0.000 | 0.559 | 23.386 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.118 | 0.065 | 0.003 | 0.118 | gw-r/thread-51/journal/page | none observed |

## P3 / idle-50 / read (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.643 | n/a | n/a | n/a | 0.046 | n/a | 0.000 | 0.000 | 0.525 | 50.861 | 0.008 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.062 | 0.046 | 0.001 | 0.062 |
| p99 | 202.686 | n/a | n/a | n/a | 0.073 | n/a | 0.000 | 0.000 | 1.447 | 201.444 | 0.021 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.146 | 0.073 | 0.001 | 0.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2065e6fc38c5bcc6000000000000028e | 202.686 | 0.042 | n/a | 0.000 | 0.000 | 0.988 | 201.444 | 0.014 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.091 | 0.042 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000028d | 202.625 | 0.073 | n/a | 0.000 | 0.000 | 1.447 | 200.917 | 0.009 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.125 | 0.073 | 0.000 | 0.125 | gw-r/thread-49/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000028b | 202.508 | 0.055 | n/a | 0.000 | 0.000 | 0.986 | 201.210 | 0.015 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.146 | 0.055 | 0.000 | 0.146 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000028c | 201.937 | 0.055 | n/a | 0.000 | 0.000 | 0.774 | 200.887 | 0.010 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.144 | 0.055 | 0.000 | 0.144 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000028f | 154.861 | 0.057 | n/a | 0.000 | 0.000 | 0.849 | 153.819 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.081 | 0.057 | 0.000 | 0.081 | gw-r/thread-52/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000290 | 99.144 | 0.048 | n/a | 0.000 | 0.000 | 0.558 | 98.412 | 0.008 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.063 | 0.048 | 0.000 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000267 | 55.587 | 0.041 | n/a | 0.000 | 0.000 | 0.400 | 54.998 | 0.020 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.056 | 0.041 | 0.001 | 0.056 | gw-r/thread-51/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000024b | 55.037 | 0.035 | n/a | 0.000 | 0.000 | 0.554 | 54.331 | 0.013 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.048 | 0.035 | 0.001 | 0.048 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000022d | 54.147 | 0.063 | n/a | 0.000 | 0.000 | 0.488 | 53.453 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.088 | 0.063 | 0.001 | 0.088 | gw-r/thread-49/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000241 | 54.101 | 0.041 | n/a | 0.000 | 0.000 | 0.525 | 53.460 | 0.004 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.053 | 0.041 | 0.001 | 0.053 | gw-r/thread-52/journal/page | none observed |
| 2065e6fc38c5bcc600000000000001ff | 53.603 | 0.039 | n/a | 0.000 | 0.000 | 0.411 | 53.080 | 0.003 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.051 | 0.039 | 0.001 | 0.051 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000023f | 53.484 | 0.067 | n/a | 0.000 | 0.000 | 0.534 | 52.762 | 0.008 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.094 | 0.067 | 0.001 | 0.094 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000026f | 53.311 | 0.038 | n/a | 0.000 | 0.000 | 0.853 | 52.273 | 0.021 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.056 | 0.038 | 0.001 | 0.056 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000254 | 51.854 | 0.043 | n/a | 0.000 | 0.000 | 0.330 | 51.387 | 0.009 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.053 | 0.043 | 0.001 | 0.053 | gw-r/thread-51/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000284 | 51.753 | 0.041 | n/a | 0.000 | 0.000 | 0.444 | 51.171 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.053 | 0.041 | 0.001 | 0.053 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000027e | 51.643 | 0.067 | n/a | 0.000 | 0.000 | 0.551 | 50.861 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.121 | 0.067 | 0.001 | 0.121 | gw-r/thread-49/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000025d | 51.499 | 0.038 | n/a | 0.000 | 0.000 | 0.535 | 50.859 | 0.004 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.047 | 0.038 | 0.001 | 0.047 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000022f | 51.349 | 0.038 | n/a | 0.000 | 0.000 | 0.430 | 50.818 | 0.003 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.049 | 0.038 | 0.001 | 0.049 | gw-r/thread-51/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000026a | 50.796 | 0.048 | n/a | 0.000 | 0.000 | 0.485 | 50.139 | 0.010 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.062 | 0.048 | 0.001 | 0.062 | gw-r/thread-50/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000027c | 50.599 | 0.047 | n/a | 0.000 | 0.000 | 0.808 | 49.620 | 0.017 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.061 | 0.047 | 0.001 | 0.061 | gw-r/thread-50/journal/page | none observed |

## P3 / idle-100 / read (153 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 96.671 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.521 | 95.895 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.061 | 0.047 | 0.000 | 0.061 |
| p99 | 202.286 | n/a | n/a | n/a | 0.102 | n/a | 0.000 | 0.000 | 4.486 | 201.448 | 1.151 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.135 | 0.102 | 0.001 | 0.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2065e6fc38c5bcc60000000000000327 | 202.753 | 0.055 | n/a | 0.000 | 0.000 | 0.748 | 201.729 | 0.010 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.080 | 0.055 | 0.000 | 0.080 | gw-r/thread-51/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000326 | 202.286 | 0.048 | n/a | 0.000 | 0.000 | 0.595 | 201.448 | 0.004 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.135 | 0.048 | 0.000 | 0.135 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000329 | 201.611 | 0.025 | n/a | 0.000 | 0.000 | 0.684 | 200.791 | 0.004 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.056 | 0.025 | 0.000 | 0.056 | gw-r/thread-49/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000328 | 201.608 | 0.028 | n/a | 0.000 | 0.000 | 0.651 | 200.817 | 0.004 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.059 | 0.028 | 0.000 | 0.059 | gw-r/thread-50/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000325 | 201.312 | 0.033 | n/a | 0.000 | 0.000 | 0.614 | 200.556 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.061 | 0.033 | 0.000 | 0.061 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc600000000000002c4 | 120.478 | 0.059 | n/a | 0.000 | 0.000 | 0.540 | 119.780 | 0.007 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.062 | 0.059 | 0.000 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc600000000000002d3 | 105.338 | 0.057 | n/a | 0.000 | 0.000 | 0.396 | 104.746 | 0.008 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.091 | 0.057 | 0.001 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc600000000000002d6 | 103.975 | 0.078 | n/a | 0.000 | 0.000 | 0.689 | 103.046 | 0.009 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.102 | 0.078 | 0.001 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc600000000000002a9 | 102.973 | 0.044 | n/a | 0.000 | 0.000 | 0.512 | 102.293 | 0.009 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.059 | 0.044 | 0.000 | 0.059 | gw-r/thread-50/journal/page | none observed |
| 2065e6fc38c5bcc600000000000002c0 | 102.002 | 0.038 | n/a | 0.000 | 0.000 | 0.470 | 101.399 | 0.008 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.049 | 0.038 | 0.000 | 0.049 | gw-r/thread-52/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000293 | 101.793 | 0.047 | n/a | 0.000 | 0.000 | 0.439 | 99.281 | 0.033 | 0.000 | 1.937 | 0.000 | n/a | n/a | 0.057 | 0.047 | 0.000 | 0.057 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc600000000000002ad | 101.352 | 0.052 | n/a | 0.000 | 0.000 | 0.414 | 100.794 | 0.006 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.053 | 0.052 | 0.001 | 0.053 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000029f | 101.299 | 0.047 | n/a | 0.000 | 0.000 | 0.651 | 100.517 | 0.003 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.060 | 0.047 | 0.000 | 0.060 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc600000000000002f7 | 101.262 | 0.043 | n/a | 0.000 | 0.000 | 0.660 | 100.449 | 0.004 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.060 | 0.043 | 0.000 | 0.060 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc600000000000002d8 | 100.704 | 0.083 | n/a | 0.000 | 0.000 | 0.626 | 99.091 | 0.646 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.243 | 0.083 | 0.001 | 0.243 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000299 | 100.529 | 0.034 | n/a | 0.000 | 0.000 | 0.291 | 100.144 | 0.003 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.043 | 0.034 | 0.000 | 0.043 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc600000000000002bb | 100.519 | 0.061 | n/a | 0.000 | 0.000 | 0.541 | 99.819 | 0.004 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.074 | 0.061 | 0.001 | 0.074 | gw-r/thread-49/journal/page | none observed |
| 2065e6fc38c5bcc600000000000002ca | 100.360 | 0.062 | n/a | 0.000 | 0.000 | 0.568 | 99.612 | 0.009 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.087 | 0.062 | 0.001 | 0.087 | gw-r/thread-51/journal/page | none observed |
| 2065e6fc38c5bcc600000000000002e6 | 99.949 | 0.054 | n/a | 0.000 | 0.000 | 1.923 | 93.903 | 3.991 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.061 | 0.054 | 0.001 | 0.061 | gw-r/thread-51/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000315 | 99.919 | 0.039 | n/a | 0.000 | 0.000 | 0.343 | 99.432 | 0.009 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.048 | 0.039 | 0.000 | 0.048 | gw-r/thread-47/journal/page | none observed |

## P3 / idle-250 / read (156 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.520 | n/a | n/a | n/a | 0.036 | n/a | 0.000 | 0.000 | 0.512 | 200.750 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.068 | 0.036 | 0.000 | 0.068 |
| p99 | 203.800 | n/a | n/a | n/a | 0.077 | n/a | 0.000 | 0.000 | 2.708 | 202.305 | 0.037 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.180 | 0.077 | 0.000 | 0.180 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2065e6fc38c5bcc6000000000000041d | 204.485 | 0.034 | n/a | 0.000 | 0.000 | 3.066 | 201.169 | 0.037 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.066 | 0.034 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc600000000000003c5 | 203.800 | 0.031 | n/a | 0.000 | 0.000 | 2.708 | 200.877 | 0.070 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000039b | 203.681 | 0.030 | n/a | 0.000 | 0.000 | 2.646 | 200.872 | 0.007 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.061 | 0.030 | 0.000 | 0.061 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000038b | 203.498 | 0.030 | n/a | 0.000 | 0.000 | 2.518 | 200.825 | 0.023 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.056 | 0.030 | 0.000 | 0.056 | gw-r/thread-50/journal/page | none observed |
| 2065e6fc38c5bcc600000000000003c3 | 203.379 | 0.063 | n/a | 0.000 | 0.000 | 2.622 | 200.538 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.103 | 0.063 | 0.000 | 0.103 | gw-r/thread-52/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000040d | 203.229 | 0.032 | n/a | 0.000 | 0.000 | 2.136 | 200.930 | 0.007 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.063 | 0.032 | 0.000 | 0.063 | gw-r/thread-52/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000043d | 203.223 | 0.047 | n/a | 0.000 | 0.000 | 1.936 | 201.018 | 0.022 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.078 | 0.047 | 0.000 | 0.078 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000443 | 203.146 | 0.039 | n/a | 0.000 | 0.000 | 0.683 | 202.231 | 0.008 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.066 | 0.039 | 0.000 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000373 | 203.139 | 0.044 | n/a | 0.000 | 0.000 | 2.274 | 200.668 | 0.004 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.098 | 0.044 | 0.000 | 0.098 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000037b | 203.117 | 0.029 | n/a | 0.000 | 0.000 | 2.387 | 200.591 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.058 | 0.029 | 0.000 | 0.058 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc600000000000003ad | 203.052 | 0.032 | n/a | 0.000 | 0.000 | 0.535 | 202.337 | 0.004 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.068 | 0.032 | 0.000 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 2065e6fc38c5bcc600000000000003b9 | 202.913 | 0.030 | n/a | 0.000 | 0.000 | 0.437 | 202.305 | 0.009 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.068 | 0.030 | 0.000 | 0.068 | gw-r/thread-51/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000349 | 202.854 | 0.031 | n/a | 0.000 | 0.000 | 2.118 | 200.586 | 0.005 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.057 | 0.031 | 0.000 | 0.057 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000401 | 202.751 | 0.044 | n/a | 0.000 | 0.000 | 1.684 | 200.871 | 0.007 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.083 | 0.044 | 0.000 | 0.083 | gw-r/thread-52/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000385 | 202.700 | 0.042 | n/a | 0.000 | 0.000 | 0.684 | 201.839 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.082 | 0.042 | 0.000 | 0.082 | gw-r/thread-52/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000032d | 202.693 | 0.031 | n/a | 0.000 | 0.000 | 0.538 | 201.975 | 0.005 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000457 | 202.686 | 0.110 | n/a | 0.000 | 0.000 | 0.531 | 201.724 | 0.013 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.180 | 0.110 | 0.001 | 0.180 | gw-r/thread-50/journal/page | none observed |
| 2065e6fc38c5bcc600000000000003d5 | 202.600 | 0.039 | n/a | 0.000 | 0.000 | 0.700 | 201.696 | 0.006 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.083 | 0.039 | 0.000 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000042f | 202.578 | 0.037 | n/a | 0.000 | 0.000 | 1.406 | 200.988 | 0.012 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.066 | 0.037 | 0.000 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 2065e6fc38c5bcc600000000000003a1 | 202.500 | 0.049 | n/a | 0.000 | 0.000 | 1.448 | 200.632 | 0.005 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.316 | 0.049 | 0.000 | 0.316 | gw-r/thread-47/journal/page | none observed |

## P3 / idle-500 / read (419 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.450 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.588 | 200.729 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.072 | 0.041 | 0.000 | 0.072 |
| p99 | 204.309 | n/a | n/a | n/a | 0.081 | n/a | 0.000 | 0.000 | 3.278 | 201.978 | 0.033 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.162 | 0.081 | 0.002 | 0.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2065e6fc38c5bcc60000000000000563 | 205.185 | 0.037 | n/a | 0.000 | 0.000 | 1.954 | 203.087 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.072 | 0.037 | 0.000 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc600000000000005b4 | 205.109 | 0.032 | n/a | 0.000 | 0.000 | 3.760 | 201.123 | 0.016 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.071 | 0.032 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000057c | 205.069 | 0.030 | n/a | 0.000 | 0.000 | 4.229 | 200.697 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.071 | 0.030 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000054f | 204.739 | 0.035 | n/a | 0.000 | 0.000 | 3.278 | 201.267 | 0.008 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.079 | 0.035 | 0.000 | 0.079 | gw-r/thread-50/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000054c | 204.309 | 0.041 | n/a | 0.000 | 0.000 | 3.449 | 200.666 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.108 | 0.041 | 0.000 | 0.108 | gw-r/thread-49/journal/page | none observed |
| 2065e6fc38c5bcc600000000000004a6 | 204.072 | 0.033 | n/a | 0.000 | 0.000 | 3.225 | 200.691 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.076 | 0.033 | 0.000 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000055e | 203.799 | 0.028 | n/a | 0.000 | 0.000 | 0.691 | 200.956 | 0.007 | 0.000 | 2.056 | 0.000 | n/a | n/a | 0.061 | 0.028 | 0.000 | 0.061 | gw-r/thread-51/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000545 | 203.682 | 0.037 | n/a | 0.000 | 0.000 | 2.203 | 201.217 | 0.020 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.099 | 0.037 | 0.000 | 0.099 | gw-r/thread-49/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000050a | 203.604 | 0.064 | n/a | 0.000 | 0.000 | 0.842 | 202.480 | 0.006 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.152 | 0.064 | 0.000 | 0.152 | gw-r/thread-49/journal/page | none observed |
| 2065e6fc38c5bcc600000000000005e1 | 203.480 | 0.042 | n/a | 0.000 | 0.000 | 2.396 | 200.919 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.065 | 0.042 | 0.000 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000510 | 203.260 | 0.065 | n/a | 0.000 | 0.000 | 0.745 | 202.242 | 0.019 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.110 | 0.065 | 0.000 | 0.110 | gw-r/thread-50/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000509 | 203.100 | 0.027 | n/a | 0.000 | 0.000 | 2.282 | 200.660 | 0.013 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.063 | 0.027 | 0.000 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc600000000000004fa | 203.043 | 0.045 | n/a | 0.000 | 0.000 | 2.110 | 200.742 | 0.016 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.074 | 0.045 | 0.000 | 0.074 | gw-r/thread-50/journal/page | none observed |
| 2065e6fc38c5bcc600000000000004e5 | 203.038 | 0.034 | n/a | 0.000 | 0.000 | 2.219 | 200.662 | 0.005 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.067 | 0.034 | 0.000 | 0.067 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000615 | 202.932 | 0.031 | n/a | 0.000 | 0.000 | 1.850 | 200.925 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.068 | 0.031 | 0.000 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc600000000000005cd | 202.883 | 0.043 | n/a | 0.000 | 0.000 | 1.240 | 201.435 | 0.009 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.078 | 0.043 | 0.000 | 0.078 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc600000000000004a9 | 202.601 | 0.033 | n/a | 0.000 | 0.000 | 0.395 | 202.042 | 0.006 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.064 | 0.033 | 0.000 | 0.064 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000516 | 202.584 | 0.029 | n/a | 0.000 | 0.000 | 0.659 | 201.688 | 0.016 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.068 | 0.029 | 0.000 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc600000000000004ac | 202.583 | 0.053 | n/a | 0.000 | 0.000 | 0.806 | 201.507 | 0.015 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.104 | 0.053 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000564 | 202.582 | 0.028 | n/a | 0.000 | 0.000 | 0.444 | 201.978 | 0.010 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.062 | 0.028 | 0.000 | 0.062 | gw-r/thread-45/journal/page | none observed |

## P3 / idle-1000 / read (754 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.619 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.636 | 200.771 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.078 | 0.039 | 0.000 | 0.078 |
| p99 | 203.989 | n/a | n/a | n/a | 0.094 | n/a | 0.000 | 0.000 | 2.457 | 202.098 | 0.041 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.209 | 0.098 | 0.001 | 0.209 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2065e6fc38c5bcc60000000000000624 | 205.368 | 0.038 | n/a | 0.000 | 0.000 | 0.762 | 204.419 | 0.007 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.075 | 0.038 | 0.000 | 0.075 | gw-r/thread-49/journal/page | none observed |
| 2065e6fc38c5bcc600000000000006c8 | 204.931 | 0.031 | n/a | 0.000 | 0.000 | 0.728 | 204.056 | 0.008 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.068 | 0.031 | 0.000 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000871 | 204.400 | 0.059 | n/a | 0.000 | 0.000 | 1.721 | 202.388 | 0.047 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.093 | 0.059 | 0.000 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000694 | 204.348 | 0.032 | n/a | 0.000 | 0.000 | 0.375 | 203.756 | 0.006 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.066 | 0.032 | 0.000 | 0.066 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000088e | 204.332 | 0.026 | n/a | 0.000 | 0.000 | 0.456 | 203.732 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.069 | 0.026 | 0.000 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 2065e6fc38c5bcc600000000000006ee | 204.170 | 0.029 | n/a | 0.000 | 0.000 | 3.525 | 200.508 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.063 | 0.029 | 0.000 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 2065e6fc38c5bcc600000000000006c3 | 204.113 | 0.029 | n/a | 0.000 | 0.000 | 3.300 | 200.674 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.065 | 0.029 | 0.000 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 2065e6fc38c5bcc600000000000007e3 | 203.989 | 0.032 | n/a | 0.000 | 0.000 | 2.677 | 201.132 | 0.010 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.070 | 0.032 | 0.000 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 2065e6fc38c5bcc600000000000007e8 | 203.892 | 0.037 | n/a | 0.000 | 0.000 | 2.778 | 200.891 | 0.010 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.099 | 0.037 | 0.000 | 0.099 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc600000000000007bb | 203.804 | 0.026 | n/a | 0.000 | 0.000 | 2.979 | 200.685 | 0.013 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.058 | 0.026 | 0.000 | 0.058 | gw-r/thread-51/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000079a | 203.718 | 0.035 | n/a | 0.000 | 0.000 | 1.287 | 202.244 | 0.006 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.071 | 0.035 | 0.000 | 0.071 | gw-r/thread-50/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000072c | 203.695 | 0.118 | n/a | 0.000 | 0.000 | 0.876 | 202.407 | 0.010 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.193 | 0.118 | 0.001 | 0.193 | gw-r/thread-51/journal/page | none observed |
| 2065e6fc38c5bcc60000000000000835 | 203.658 | 0.046 | n/a | 0.000 | 0.000 | 1.450 | 201.917 | 0.005 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.120 | 0.046 | 0.000 | 0.120 | gw-r/thread-51/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000065d | 203.637 | 0.039 | n/a | 0.000 | 0.000 | 2.457 | 200.990 | 0.020 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.069 | 0.039 | 0.000 | 0.069 | gw-r/thread-51/journal/page | none observed |
| 2065e6fc38c5bcc600000000000007a7 | 203.535 | 0.025 | n/a | 0.000 | 0.000 | 2.922 | 200.490 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.056 | 0.025 | 0.000 | 0.056 | gw-r/thread-50/journal/page | none observed |
| 2065e6fc38c5bcc600000000000007e5 | 203.506 | 0.087 | n/a | 0.000 | 0.000 | 1.740 | 201.443 | 0.009 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.154 | 0.087 | 0.000 | 0.154 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000077f | 203.469 | 0.029 | n/a | 0.000 | 0.000 | 1.212 | 202.098 | 0.005 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.066 | 0.029 | 0.000 | 0.066 | gw-r/thread-49/journal/page | none observed |
| 2065e6fc38c5bcc600000000000008ac | 203.448 | 0.049 | n/a | 0.000 | 0.000 | 1.192 | 201.968 | 0.013 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.108 | 0.049 | 0.000 | 0.108 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc600000000000008d0 | 203.360 | 0.030 | n/a | 0.000 | 0.000 | 1.309 | 201.781 | 0.012 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.074 | 0.030 | 0.000 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 2065e6fc38c5bcc6000000000000089d | 203.357 | 0.070 | n/a | 0.000 | 0.000 | 1.825 | 201.157 | 0.007 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.220 | 0.070 | 0.000 | 0.220 | gw-r/thread-52/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 1250 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/2.515 ms; post-ACK p50/p99: 0.369/0.958 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 11.201 | 10.749 | 10.602 | reported |
| All-primary p99 ms | 37.429 | 37.098 | 35.023 | <=50 |
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
| 5-10 | >=1000 | 7 | 12.280/43.247 | 11.907 | 7.252 | 19.068 | 0.102/0.027 |
| 5-10 | overlap | 121 | 14.926/64.905 | 14.571 | 9.347 | 23.069 | 0.058/0.016 |
| 5-10 | 0-50 | 525 | 10.618/23.651 | 10.218 | 5.952 | 15.322 | 0.055/0.018 |
| 5-10 | 250-1000 | 299 | 11.260/20.360 | 10.825 | 6.070 | 15.194 | 0.076/0.020 |
| 5-10 | 50-100 | 149 | 10.370/30.098 | 9.985 | 5.881 | 14.814 | 0.064/0.019 |
| 5-10 | 100-250 | 149 | 10.873/17.644 | 10.443 | 6.090 | 15.480 | 0.070/0.020 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1250 | 7 | 519.369 |

## Writer heap, GC and scheduler stalls

Source a0785bcf96f7afea3965b3028db2e27f4fbef6a9; 1250 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 363.796 / 603.081 |
| GC events / total duration / maximum ms | 296 / 785.166 / 54.039 |
| GC events >50 ms / total duration ms | 1 / 54.039 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":290,"4":3,"8":3} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 37.429 / 7 / 519.369 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.
