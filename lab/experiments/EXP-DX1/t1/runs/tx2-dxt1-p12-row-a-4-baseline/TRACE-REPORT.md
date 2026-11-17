# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (102.014 ms, trace `2916fa03b9c0f9b100000000000017e4`); `node-14/thread-0/socket.wait-first-byte` (92.201 ms, trace `2916fa03b9c0f9b100000000000017e3`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (34.293 ms, trace `2916fa03b9c0f9b100000000000017e6`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (111.691 ms, trace `2916fa03b9c0f9b10000000000000141`); `gw-w/thread-45/commit.prepare-and-validate` (107.608 ms, trace `2916fa03b9c0f9b10000000000001105`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p12-row-a-4-baseline`; source `2409bdada6be6cb7f17d1aa71f31da90a72f01af`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 8807221.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 220 source calibrations, offsets preserved in raw traces and trace-summary.json. 0 JFR events without continuous-anchor proof are retained raw but not overlaid; Mac wall samples are whole-run context, not per-commit overlap evidence.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13570.433 | 311.530 | 5.005 | 454 |
| L1 | 0 | 19959.998 | 407.630 | 9.882 | 668 |
| L4 | 0 | 19969.845 | 412.742 | 6.479 | 628 |
| L16 | 0 | 19276.685 | 541.293 | 14.285 | 683 |
| L64 | 0 | 19867.206 | 454.574 | 10.788 | 870 |
| L256 | 0 | 19031.616 | 385.252 | 15.324 | 688 |
| L1024 | 0 | 19980.096 | 4525.960 | 42.054 | 17231 |
| tail | 0 | 64447.545 | 14167.299 | 122.260 | 52675 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 2916fa03b9c0f9b100000000000017e4 | driver.queue.scheduler-dispatch | 0.128 | none | 2 / 32 |
| 2916fa03b9c0f9b100000000000017e4 | driver.queue.scheduler-late | 0.005 | none | 2 / 32 |

Observed active steps while trace 2916fa03b9c0f9b100000000000017e4 waited: []

| 2916fa03b9c0f9b100000000000017e3 | driver.queue.scheduler-dispatch | 0.122 | none | 1 / 32 |
| 2916fa03b9c0f9b100000000000017e3 | driver.queue.scheduler-late | 0.009 | none | 1 / 32 |

Observed active steps while trace 2916fa03b9c0f9b100000000000017e3 waited: []

| 2916fa03b9c0f9b100000000000017e6 | driver.queue.scheduler-dispatch | 4.141 | none | 2 / 32 |
| 2916fa03b9c0f9b100000000000017e6 | driver.queue.scheduler-late | 2.319 | none | 2 / 32 |

Observed active steps while trace 2916fa03b9c0f9b100000000000017e6 waited: []

| 2916fa03b9c0f9b10000000000000141 | driver.queue.scheduler-dispatch | 0.085 | none | 0 / 32 |
| 2916fa03b9c0f9b10000000000000141 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 2916fa03b9c0f9b10000000000000141 waited: []

| 2916fa03b9c0f9b10000000000001105 | driver.queue.scheduler-dispatch | 0.036 | none | 0 / 32 |
| 2916fa03b9c0f9b10000000000001105 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 2916fa03b9c0f9b10000000000001105 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.604 | 0.217 | 0.000 | 0.667 | 5.058 | 0.499 | 0.000 | 0.068 | 1.301 | 7.820 | 0.026 | n/a | 0.507 | 16.879 | n/a | n/a | 0.029 | 5.476 | 0.160 | 0.029 |
| p99 | 103.317 | 4.989 | 0.000 | 5.351 | 17.370 | n/a | 5.106 | 1.363 | 5.157 | 34.340 | 0.198 | n/a | 3.722 | 62.076 | n/a | n/a | 0.315 | 20.654 | 0.358 | 0.315 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b100000000000000f4 | 103.317 | 14.985 | n/a | 5.106 | 0.563 | 1.157 | 17.448 | 0.100 | n/a | 1.566 | 62.076 | n/a | n/a | 0.315 | 20.654 | 0.200 | 0.315 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| 2916fa03b9c0f9b100000000000000f7 | 92.961 | 17.370 | 0.476 | 0.000 | 0.129 | 5.157 | 33.956 | 0.198 | n/a | 0.222 | 35.420 | n/a | n/a | 0.033 | 17.976 | 0.193 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 2916fa03b9c0f9b10000000000000111 | 80.458 | 8.710 | 0.499 | 0.614 | 0.059 | 1.802 | 4.550 | 0.035 | n/a | 3.269 | 60.895 | n/a | n/a | 0.025 | 9.882 | 0.123 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 2916fa03b9c0f9b100000000000000ff | 71.594 | 5.429 | 0.278 | 0.000 | 0.063 | 1.954 | 34.340 | 0.049 | n/a | 3.722 | 25.724 | n/a | n/a | 0.035 | 5.769 | 0.081 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| 2916fa03b9c0f9b1000000000000010f | 65.578 | 13.016 | 0.279 | 0.000 | 0.078 | 2.359 | 15.536 | 0.031 | n/a | 0.105 | 34.144 | n/a | n/a | 0.030 | 13.373 | 0.204 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| 2916fa03b9c0f9b10000000000000107 | 58.138 | 6.406 | 0.348 | 0.000 | 0.076 | 1.918 | 14.799 | 0.041 | n/a | 0.082 | 34.433 | n/a | n/a | 0.035 | 6.830 | 0.117 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 2916fa03b9c0f9b10000000000000109 | 47.698 | 4.244 | 0.165 | 0.000 | 0.177 | 3.111 | 14.127 | 0.048 | n/a | 1.401 | 24.400 | n/a | n/a | 0.026 | 4.586 | 0.096 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 2916fa03b9c0f9b10000000000000119 | 45.383 | 5.707 | 0.356 | 0.380 | 0.053 | 1.301 | 20.025 | 0.030 | n/a | 0.376 | 17.135 | n/a | n/a | 0.023 | 6.495 | 0.143 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 2916fa03b9c0f9b10000000000000103 | 42.732 | 4.472 | 0.158 | 0.000 | 0.052 | 2.098 | 14.869 | 0.020 | n/a | 1.007 | 20.020 | n/a | n/a | 0.036 | 4.682 | 0.110 | 0.036 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 2916fa03b9c0f9b1000000000000010a | 37.610 | 9.521 | n/a | 1.450 | 1.363 | 0.986 | 7.820 | 0.047 | n/a | 0.964 | 15.407 | n/a | n/a | 0.051 | 12.334 | 0.328 | 0.051 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| 2916fa03b9c0f9b100000000000000fd | 36.547 | 3.427 | n/a | 0.000 | 0.104 | 1.000 | 4.678 | 0.028 | n/a | 1.076 | 26.195 | n/a | n/a | 0.038 | 3.532 | 0.097 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000000fb | 36.190 | 5.508 | 0.203 | 0.000 | 0.063 | 1.417 | 17.448 | 0.023 | n/a | 3.713 | 7.781 | n/a | n/a | 0.032 | 5.775 | 0.160 | 0.032 | gw-w/thread-46/gateway.admitted-work | driver.reader-basis.broadcast 0.020ms |
| 2916fa03b9c0f9b1000000000000011d | 35.810 | 7.578 | 0.163 | 0.373 | 0.057 | 1.471 | 9.174 | 0.026 | n/a | 0.066 | 16.879 | n/a | n/a | 0.024 | 8.171 | 0.228 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 2916fa03b9c0f9b10000000000000125 | 35.778 | 4.807 | 0.270 | 0.330 | 0.068 | 1.668 | 11.116 | 0.025 | n/a | 0.366 | 17.096 | n/a | n/a | 0.031 | 5.476 | 0.153 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 2916fa03b9c0f9b10000000000000121 | 34.604 | 4.202 | 0.243 | 0.341 | 0.055 | 1.197 | 14.731 | 0.027 | n/a | 1.624 | 12.158 | n/a | n/a | 0.026 | 4.841 | 0.140 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 2916fa03b9c0f9b10000000000000116 | 32.500 | 2.718 | n/a | 0.000 | 0.060 | 0.644 | 4.912 | 0.021 | n/a | 0.084 | 24.032 | n/a | n/a | 0.029 | 2.778 | 0.085 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000113 | 31.835 | 5.827 | 0.222 | 0.312 | 0.046 | 1.831 | 11.271 | 0.028 | n/a | 0.075 | 12.200 | n/a | n/a | 0.023 | 6.408 | 0.201 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 2916fa03b9c0f9b1000000000000010d | 31.233 | 3.079 | n/a | 0.000 | 0.066 | 0.840 | 1.320 | 0.014 | n/a | 2.479 | 23.411 | n/a | n/a | 0.025 | 3.145 | 0.101 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000011b | 29.458 | 6.766 | n/a | 1.666 | 0.052 | 0.735 | 1.877 | 0.014 | n/a | 0.558 | 17.767 | n/a | n/a | 0.022 | 8.484 | 0.288 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000012b | 26.733 | 5.562 | 0.232 | 0.387 | 0.054 | 1.733 | 10.123 | 0.040 | n/a | 0.116 | 8.460 | n/a | n/a | 0.024 | 6.236 | 0.233 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.684 | 0.000 | 0.000 | 0.727 | 2.885 | n/a | 0.000 | 0.104 | 1.000 | 1.729 | 0.021 | n/a | 0.386 | 10.007 | n/a | n/a | 0.029 | 3.532 | 0.170 | 0.029 |
| p99 | 36.547 | 1.318 | 0.000 | 1.128 | 5.058 | n/a | 0.000 | 0.967 | 3.961 | 6.750 | 0.029 | n/a | 3.266 | 26.195 | n/a | n/a | 0.140 | 5.262 | 0.358 | 0.140 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b100000000000000fd | 36.547 | 3.427 | n/a | 0.000 | 0.104 | 1.000 | 4.678 | 0.028 | n/a | 1.076 | 26.195 | n/a | n/a | 0.038 | 3.532 | 0.097 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000116 | 32.500 | 2.718 | n/a | 0.000 | 0.060 | 0.644 | 4.912 | 0.021 | n/a | 0.084 | 24.032 | n/a | n/a | 0.029 | 2.778 | 0.085 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000000f9 | 23.827 | 4.885 | n/a | 0.000 | 0.078 | 1.230 | 1.487 | 0.016 | n/a | 1.915 | 14.075 | n/a | n/a | 0.140 | 4.963 | 0.208 | 0.140 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 2916fa03b9c0f9b10000000000000122 | 22.140 | 2.494 | n/a | 0.000 | 0.055 | 0.974 | 6.750 | 0.016 | n/a | 0.100 | 11.723 | n/a | n/a | 0.027 | 2.549 | 0.115 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000114 | 21.684 | 2.137 | n/a | 0.000 | 0.967 | 3.961 | 1.718 | 0.029 | n/a | 3.266 | 9.590 | n/a | n/a | 0.016 | 3.103 | 0.143 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000011f | 19.245 | 2.885 | n/a | 0.000 | 0.664 | 3.473 | 4.438 | 0.013 | n/a | 0.082 | 7.675 | n/a | n/a | 0.015 | 3.549 | 0.184 | 0.015 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 2916fa03b9c0f9b10000000000000101 | 17.223 | 3.930 | n/a | 0.000 | 0.157 | 0.995 | 1.295 | 0.021 | n/a | 0.758 | 10.007 | n/a | n/a | 0.061 | 4.087 | 0.237 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 2916fa03b9c0f9b10000000000000127 | 14.839 | 2.445 | n/a | 0.000 | 0.071 | 0.639 | 1.729 | 0.014 | n/a | 0.386 | 9.529 | n/a | n/a | 0.025 | 2.516 | 0.170 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000129 | 14.692 | 5.058 | n/a | 0.000 | 0.204 | 1.113 | 1.371 | 0.025 | n/a | 0.331 | 6.522 | n/a | n/a | 0.067 | 5.262 | 0.358 | 0.067 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 7.134 | 0.000 | 0.000 | 0.473 | 2.184 | 0.273 | 0.000 | 0.081 | 0.580 | 0.769 | 0.009 | n/a | 0.046 | 3.054 | n/a | n/a | 0.023 | 2.653 | 0.135 | 0.023 |
| p99 | 39.879 | 0.425 | 0.000 | 0.495 | 4.648 | n/a | 0.386 | 0.469 | 1.460 | 12.299 | 0.031 | n/a | 3.663 | 17.000 | n/a | n/a | 0.039 | 5.388 | 0.372 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b1000000000000012d | 39.879 | 4.648 | 0.273 | 0.386 | 0.081 | 1.460 | 12.299 | 0.031 | n/a | 3.663 | 17.000 | n/a | n/a | 0.039 | 5.388 | 0.135 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms |
| 2916fa03b9c0f9b1000000000000098a | 7.134 | 2.184 | n/a | 0.000 | 0.469 | 0.580 | 0.769 | 0.009 | n/a | 0.046 | 3.054 | n/a | n/a | 0.023 | 2.653 | 0.372 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.018ms |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.493 | 0.254 | 0.000 | 0.580 | 4.050 | n/a | 0.000 | 0.065 | 1.033 | 5.255 | 0.024 | n/a | 0.171 | 12.100 | n/a | n/a | 0.032 | 4.558 | 0.189 | 0.032 |
| p99 | 139.218 | 2.998 | 0.067 | 3.253 | 9.288 | n/a | 2.072 | 2.690 | 7.162 | 18.883 | 2.232 | n/a | 4.745 | 111.691 | n/a | n/a | 0.089 | 11.033 | 0.448 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b10000000000000141 | 139.218 | 4.920 | 0.196 | 0.000 | 0.087 | 1.096 | 18.883 | 2.232 | n/a | 0.060 | 111.691 | n/a | n/a | 0.052 | 5.203 | 0.037 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms; driver.reader-basis.broadcast 0.037ms |
| 2916fa03b9c0f9b10000000000000131 | 56.984 | 4.877 | 0.319 | 0.000 | 0.106 | 1.729 | 18.277 | 0.024 | n/a | 0.229 | 31.381 | n/a | n/a | 0.043 | 5.302 | 0.093 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.074ms |
| 2916fa03b9c0f9b1000000000000016f | 50.858 | 3.594 | 0.181 | 0.000 | 0.055 | 0.911 | 15.071 | 0.028 | n/a | 0.098 | 30.893 | n/a | n/a | 0.025 | 3.831 | 0.075 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 2916fa03b9c0f9b1000000000000014d | 41.761 | 3.654 | 0.156 | 0.000 | 0.049 | 0.940 | 17.519 | 0.023 | n/a | 0.117 | 19.277 | n/a | n/a | 0.026 | 3.860 | 0.092 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.067ms |
| 2916fa03b9c0f9b10000000000000143 | 41.241 | 4.152 | 0.240 | 0.414 | 0.054 | 6.265 | 9.360 | 0.050 | n/a | 0.318 | 20.358 | n/a | n/a | 0.029 | 4.860 | 0.118 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 2916fa03b9c0f9b1000000000000012f | 37.615 | 7.389 | 0.227 | 0.000 | 0.049 | 1.827 | 6.531 | 0.027 | n/a | 2.521 | 19.021 | n/a | n/a | 0.024 | 7.664 | 0.204 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.056ms |
| 2916fa03b9c0f9b10000000000000159 | 36.045 | 5.687 | 0.170 | 0.000 | 0.131 | 2.306 | 8.028 | 0.025 | n/a | 0.064 | 19.579 | n/a | n/a | 0.055 | 5.988 | 0.166 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000013f | 34.746 | 7.239 | n/a | 0.000 | 0.051 | 0.649 | 5.255 | 0.021 | n/a | 0.076 | 21.434 | n/a | n/a | 0.021 | 7.290 | 0.210 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000017f | 33.331 | 4.050 | 0.149 | 0.000 | 0.055 | 1.240 | 10.575 | 0.044 | n/a | 0.678 | 16.510 | n/a | n/a | 0.029 | 4.254 | 0.128 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000017d | 33.116 | 4.742 | 0.223 | 0.316 | 0.044 | 1.140 | 13.604 | 0.030 | n/a | 0.069 | 12.915 | n/a | n/a | 0.033 | 5.325 | 0.161 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000145 | 32.892 | 4.112 | 0.177 | 0.000 | 0.047 | 1.276 | 13.784 | 0.020 | n/a | 0.092 | 13.352 | n/a | n/a | 0.032 | 4.335 | 0.132 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000013b | 31.625 | 3.779 | 0.258 | 0.000 | 0.080 | 1.297 | 7.250 | 0.030 | n/a | 0.198 | 18.697 | n/a | n/a | 0.035 | 4.117 | 0.130 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 2916fa03b9c0f9b10000000000000149 | 31.317 | 4.690 | 0.242 | 0.373 | 0.053 | 1.102 | 10.081 | 0.024 | n/a | 0.401 | 14.312 | n/a | n/a | 0.038 | 5.359 | 0.171 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000138 | 30.821 | 4.509 | 0.429 | 0.000 | 0.065 | 1.645 | 10.179 | 0.040 | n/a | 1.304 | 12.618 | n/a | n/a | 0.031 | 5.003 | 0.162 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000153 | 30.394 | 7.607 | 0.153 | 0.435 | 0.057 | 1.246 | 9.301 | 0.022 | n/a | 0.331 | 11.213 | n/a | n/a | 0.029 | 8.252 | 0.271 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000169 | 29.840 | 4.174 | 0.180 | 0.000 | 0.104 | 1.316 | 11.208 | 0.031 | n/a | 0.680 | 12.100 | n/a | n/a | 0.046 | 4.458 | 0.149 | 0.046 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000175 | 28.623 | 4.587 | 0.285 | 0.000 | 0.147 | 1.033 | 10.190 | 0.019 | n/a | 0.083 | 12.223 | n/a | n/a | 0.055 | 5.019 | 0.175 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000016d | 28.402 | 3.825 | 0.165 | 0.000 | 0.054 | 1.246 | 8.312 | 0.104 | n/a | 4.237 | 10.428 | n/a | n/a | 0.031 | 4.044 | 0.142 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000139 | 27.622 | 7.704 | n/a | 0.000 | 0.064 | 7.162 | 5.260 | 0.044 | n/a | 0.360 | 6.999 | n/a | n/a | 0.030 | 7.768 | 0.281 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000167 | 27.186 | 4.883 | n/a | 0.000 | 2.690 | 0.734 | 5.238 | 0.019 | n/a | 0.081 | 13.502 | n/a | n/a | 0.040 | 7.573 | 0.279 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.894 | 0.000 | 0.000 | 0.520 | 2.833 | n/a | 0.000 | 0.068 | 0.769 | 1.269 | 0.019 | n/a | 0.111 | 6.999 | n/a | n/a | 0.029 | 3.239 | 0.222 | 0.029 |
| p99 | 27.622 | 1.900 | 0.067 | 2.092 | 7.704 | n/a | 2.072 | 1.676 | 7.162 | 5.260 | 0.045 | n/a | 0.519 | 14.955 | n/a | n/a | 0.060 | 7.768 | 0.369 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b10000000000000139 | 27.622 | 7.704 | n/a | 0.000 | 0.064 | 7.162 | 5.260 | 0.044 | n/a | 0.360 | 6.999 | n/a | n/a | 0.030 | 7.768 | 0.281 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000136 | 22.031 | 4.820 | n/a | 0.000 | 0.068 | 0.769 | 1.269 | 0.017 | n/a | 0.104 | 14.955 | n/a | n/a | 0.029 | 4.888 | 0.222 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000171 | 16.432 | 2.409 | n/a | 0.000 | 0.060 | 0.926 | 2.142 | 0.045 | n/a | 0.171 | 10.648 | n/a | n/a | 0.030 | 2.469 | 0.150 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000014a | 16.190 | 2.833 | n/a | 0.000 | 0.406 | 0.680 | 1.034 | 0.014 | n/a | 0.103 | 11.100 | n/a | n/a | 0.020 | 3.239 | 0.200 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000017b | 15.894 | 2.110 | n/a | 2.072 | 1.676 | 0.572 | 1.020 | 0.019 | n/a | 0.058 | 8.353 | n/a | n/a | 0.015 | 5.858 | 0.369 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.158ms; driver.publication.persist-deferred 0.396ms; driver.publication.readback 0.073ms |
| 2916fa03b9c0f9b10000000000000155 | 13.098 | 4.506 | n/a | 0.000 | 0.129 | 0.911 | 1.587 | 0.029 | n/a | 0.519 | 5.370 | n/a | n/a | 0.047 | 4.636 | 0.354 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000015f | 12.284 | 2.836 | n/a | 0.000 | 0.105 | 0.707 | 1.725 | 0.028 | n/a | 0.111 | 6.713 | n/a | n/a | 0.060 | 2.940 | 0.239 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| 2916fa03b9c0f9b10000000000000163 | 10.725 | 2.152 | n/a | 0.000 | 0.041 | 0.941 | 1.117 | 0.019 | n/a | 0.364 | 6.069 | n/a | n/a | 0.021 | 2.194 | 0.205 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.301 | 0.293 | 0.000 | 0.635 | 4.215 | 0.412 | 0.000 | 0.063 | 1.139 | 5.685 | 0.024 | n/a | 0.326 | 11.118 | n/a | n/a | 0.036 | 4.761 | 0.197 | 0.036 |
| p99 | 112.433 | 3.015 | 0.049 | 2.545 | 8.117 | n/a | 0.731 | 3.215 | 2.215 | 56.854 | 0.080 | n/a | 3.238 | 93.406 | n/a | n/a | 0.075 | 8.920 | 0.395 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b100000000000001a0 | 112.433 | 8.117 | 0.274 | 0.431 | 0.098 | 1.831 | 8.082 | 0.044 | n/a | 0.099 | 93.406 | n/a | n/a | 0.050 | 8.920 | 0.079 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.053ms |
| 2916fa03b9c0f9b1000000000000019e | 80.918 | 5.352 | 0.157 | 0.731 | 0.050 | 2.059 | 56.854 | 0.043 | n/a | 0.586 | 15.059 | n/a | n/a | 0.025 | 6.291 | 0.078 | 0.025 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.023ms |
| 2916fa03b9c0f9b10000000000000187 | 41.130 | 4.075 | 0.216 | 0.000 | 0.100 | 1.077 | 10.670 | 0.023 | n/a | 0.106 | 24.820 | n/a | n/a | 0.042 | 4.391 | 0.107 | 0.042 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000192 | 39.346 | 3.337 | 0.170 | 0.308 | 0.067 | 1.203 | 20.767 | 0.080 | n/a | 0.635 | 12.748 | n/a | n/a | 0.031 | 3.881 | 0.099 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001ba | 36.553 | 7.960 | n/a | 0.000 | 0.052 | 0.667 | 1.668 | 0.013 | n/a | 0.547 | 25.622 | n/a | n/a | 0.023 | 8.013 | 0.219 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| 2916fa03b9c0f9b100000000000001a6 | 34.225 | 4.568 | 0.218 | 0.277 | 0.115 | 1.591 | 18.909 | 0.035 | n/a | 0.405 | 8.050 | n/a | n/a | 0.057 | 5.177 | 0.151 | 0.057 | gw-w/thread-48/gateway.admitted-work | none observed |
| 2916fa03b9c0f9b100000000000001ad | 31.672 | 7.877 | n/a | 0.000 | 0.100 | 0.987 | 2.613 | 0.024 | n/a | 0.144 | 19.881 | n/a | n/a | 0.047 | 7.977 | 0.252 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001c4 | 31.263 | 4.192 | 0.218 | 0.243 | 0.108 | 1.500 | 6.486 | 0.024 | n/a | 0.479 | 17.965 | n/a | n/a | 0.047 | 4.761 | 0.152 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000019a | 30.605 | 5.162 | 0.209 | 0.376 | 0.093 | 1.455 | 10.527 | 0.032 | n/a | 0.339 | 12.367 | n/a | n/a | 0.043 | 5.841 | 0.191 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001a4 | 30.420 | 4.841 | 0.306 | 0.290 | 0.136 | 1.706 | 10.577 | 0.025 | n/a | 0.082 | 12.390 | n/a | n/a | 0.067 | 5.573 | 0.183 | 0.067 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000194 | 30.141 | 7.975 | 0.231 | 0.429 | 0.053 | 1.599 | 7.247 | 0.028 | n/a | 0.290 | 12.252 | n/a | n/a | 0.036 | 8.688 | 0.288 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001c2 | 29.512 | 7.563 | 0.189 | 0.462 | 0.060 | 1.608 | 6.705 | 0.028 | n/a | 0.105 | 12.728 | n/a | n/a | 0.066 | 8.273 | 0.280 | 0.066 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001bc | 29.072 | 5.087 | 0.412 | 0.468 | 0.090 | 1.227 | 10.842 | 0.021 | n/a | 0.057 | 10.804 | n/a | n/a | 0.064 | 6.057 | 0.208 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000183 | 27.928 | 3.455 | 0.184 | 0.387 | 0.055 | 1.139 | 10.242 | 0.025 | n/a | 0.420 | 11.997 | n/a | n/a | 0.025 | 4.080 | 0.146 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001b2 | 27.760 | 4.215 | 0.313 | 0.377 | 0.076 | 1.488 | 12.462 | 0.019 | n/a | 2.392 | 6.372 | n/a | n/a | 0.046 | 4.982 | 0.179 | 0.046 | gw-w/thread-48/gateway.admitted-work | none observed |
| 2916fa03b9c0f9b1000000000000018a | 27.724 | 5.275 | 0.356 | 0.504 | 0.055 | 1.679 | 9.983 | 0.057 | n/a | 0.557 | 9.215 | n/a | n/a | 0.042 | 6.190 | 0.223 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001a8 | 27.254 | 4.635 | 0.332 | 0.000 | 0.056 | 2.215 | 8.318 | 0.025 | n/a | 0.364 | 11.277 | n/a | n/a | 0.031 | 5.024 | 0.184 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000185 | 26.195 | 4.535 | n/a | 0.000 | 3.215 | 1.248 | 5.685 | 0.031 | n/a | 0.154 | 11.276 | n/a | n/a | 0.051 | 7.750 | 0.296 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000018b | 26.167 | 3.276 | n/a | 0.000 | 0.062 | 0.598 | 8.373 | 0.017 | n/a | 0.082 | 13.734 | n/a | n/a | 0.026 | 3.338 | 0.128 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001a2 | 25.301 | 5.633 | n/a | 0.000 | 0.089 | 1.008 | 2.357 | 0.014 | n/a | 0.081 | 16.080 | n/a | n/a | 0.039 | 5.721 | 0.226 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.051 | 0.000 | 0.000 | 0.635 | 2.794 | n/a | 0.000 | 0.058 | 0.724 | 1.432 | 0.018 | n/a | 0.321 | 9.654 | n/a | n/a | 0.028 | 2.869 | 0.197 | 0.028 |
| p99 | 26.195 | 1.540 | 0.000 | 1.034 | 4.535 | n/a | 0.000 | 3.215 | 1.530 | 5.685 | 0.031 | n/a | 3.238 | 16.804 | n/a | n/a | 0.051 | 7.750 | 0.317 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b10000000000000185 | 26.195 | 4.535 | n/a | 0.000 | 3.215 | 1.248 | 5.685 | 0.031 | n/a | 0.154 | 11.276 | n/a | n/a | 0.051 | 7.750 | 0.296 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001b4 | 22.969 | 3.465 | n/a | 0.000 | 0.059 | 0.997 | 5.490 | 0.031 | n/a | 3.238 | 9.654 | n/a | n/a | 0.036 | 3.524 | 0.153 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000181 | 22.504 | 2.794 | n/a | 0.000 | 0.075 | 0.697 | 1.519 | 0.025 | n/a | 0.563 | 16.804 | n/a | n/a | 0.028 | 2.869 | 0.127 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001c0 | 17.080 | 3.300 | n/a | 0.000 | 0.067 | 1.012 | 1.393 | 0.019 | n/a | 0.478 | 10.775 | n/a | n/a | 0.036 | 3.367 | 0.197 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000198 | 15.598 | 2.172 | n/a | 0.000 | 0.058 | 0.720 | 1.438 | 0.018 | n/a | 0.048 | 11.118 | n/a | n/a | 0.025 | 2.230 | 0.143 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000196 | 15.051 | 2.680 | n/a | 0.000 | 0.056 | 1.530 | 5.289 | 0.024 | n/a | 0.203 | 5.241 | n/a | n/a | 0.028 | 2.736 | 0.182 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001c8 | 14.991 | 2.948 | n/a | 0.000 | 0.057 | 0.724 | 0.881 | 0.015 | n/a | 0.113 | 10.213 | n/a | n/a | 0.040 | 3.006 | 0.201 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| 2916fa03b9c0f9b10000000000000190 | 13.367 | 2.633 | n/a | 0.000 | 0.063 | 0.565 | 1.086 | 0.018 | n/a | 0.347 | 8.627 | n/a | n/a | 0.028 | 2.696 | 0.202 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001a9 | 10.031 | 2.918 | n/a | 0.000 | 0.054 | 0.823 | 1.432 | 0.018 | n/a | 0.387 | 4.365 | n/a | n/a | 0.034 | 2.972 | 0.296 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001cb | 8.174 | 2.533 | n/a | 0.000 | 0.056 | 0.686 | 0.744 | 0.013 | n/a | 0.321 | 3.797 | n/a | n/a | 0.024 | 2.589 | 0.317 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.538 | 0.403 | 0.000 | 0.553 | 3.837 | n/a | 0.000 | 0.069 | 1.155 | 2.540 | 0.020 | n/a | 0.344 | 11.355 | n/a | n/a | 0.034 | 4.398 | 0.203 | 0.034 |
| p99 | 77.948 | 2.000 | 0.000 | 2.277 | 12.441 | n/a | 0.643 | 2.381 | 7.203 | 16.550 | 0.054 | n/a | 3.809 | 69.072 | n/a | n/a | 0.171 | 12.501 | 0.407 | 0.171 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b100000000000001dd | 77.948 | 4.987 | 0.371 | 0.284 | 0.057 | 1.590 | 5.620 | 0.031 | n/a | 0.131 | 64.850 | n/a | n/a | 0.026 | 5.699 | 0.073 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.093ms |
| 2916fa03b9c0f9b100000000000001e8 | 74.052 | 3.158 | n/a | 0.000 | 0.056 | 0.617 | 0.799 | 0.013 | n/a | 0.313 | 69.072 | n/a | n/a | 0.024 | 3.215 | 0.043 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001da | 71.695 | 4.974 | 0.253 | 0.304 | 0.168 | 2.102 | 16.550 | 0.020 | n/a | 0.304 | 46.849 | n/a | n/a | 0.171 | 5.699 | 0.079 | 0.171 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| 2916fa03b9c0f9b100000000000001f2 | 43.119 | 12.441 | n/a | 0.000 | 0.060 | 7.203 | 9.917 | 0.054 | n/a | 3.774 | 9.643 | n/a | n/a | 0.029 | 12.501 | 0.290 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000205 | 39.882 | 5.538 | 3.336 | 0.494 | 0.094 | 1.949 | 12.666 | 0.035 | n/a | 0.089 | 15.636 | n/a | n/a | 0.044 | 9.463 | 0.237 | 0.044 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 2916fa03b9c0f9b10000000000000213 | 34.379 | 4.003 | 0.266 | 0.643 | 0.128 | 1.368 | 13.947 | 0.016 | n/a | 0.291 | 13.669 | n/a | n/a | 0.049 | 5.040 | 0.147 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000020d | 33.707 | 3.832 | 0.227 | 0.313 | 0.111 | 1.441 | 5.134 | 0.019 | n/a | 0.299 | 22.284 | n/a | n/a | 0.047 | 4.482 | 0.133 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000021a | 33.685 | 4.790 | 0.276 | 0.000 | 0.115 | 2.242 | 12.183 | 0.030 | n/a | 0.595 | 13.416 | n/a | n/a | 0.039 | 5.181 | 0.154 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000021e | 30.220 | 4.044 | 0.279 | 0.313 | 0.104 | 1.259 | 7.931 | 0.030 | n/a | 0.329 | 15.879 | n/a | n/a | 0.049 | 4.741 | 0.157 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001fb | 28.719 | 3.773 | 0.189 | 0.000 | 0.064 | 1.155 | 8.710 | 0.038 | n/a | 3.393 | 11.355 | n/a | n/a | 0.043 | 4.025 | 0.140 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000209 | 28.351 | 4.683 | 0.251 | 0.000 | 0.117 | 1.708 | 7.283 | 0.021 | n/a | 2.125 | 12.093 | n/a | n/a | 0.070 | 5.052 | 0.178 | 0.070 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001fd | 27.438 | 3.801 | 0.217 | 0.386 | 0.068 | 1.426 | 13.510 | 0.029 | n/a | 0.332 | 7.628 | n/a | n/a | 0.042 | 4.472 | 0.163 | 0.042 | gw-w/thread-47/gateway.admitted-work | none observed |
| 2916fa03b9c0f9b1000000000000021c | 26.868 | 10.236 | 0.274 | 0.365 | 0.069 | 1.646 | 9.408 | 0.026 | n/a | 0.365 | 4.448 | n/a | n/a | 0.031 | 10.943 | 0.407 | 0.031 | gw-w/thread-46/gateway.admitted-work | none observed |
| 2916fa03b9c0f9b100000000000001e2 | 26.712 | 5.604 | n/a | 0.000 | 0.063 | 0.503 | 1.630 | 0.031 | n/a | 3.470 | 15.351 | n/a | n/a | 0.059 | 5.667 | 0.212 | 0.059 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000216 | 25.922 | 3.393 | n/a | 0.000 | 0.043 | 4.362 | 1.243 | 0.016 | n/a | 3.809 | 13.034 | n/a | n/a | 0.023 | 3.436 | 0.133 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001d7 | 25.707 | 6.730 | n/a | 0.000 | 0.032 | 1.351 | 1.182 | 0.010 | n/a | 0.159 | 16.229 | n/a | n/a | 0.014 | 6.762 | 0.263 | 0.014 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.133ms; driver.publication.persist-deferred 0.046ms |
| 2916fa03b9c0f9b100000000000001f1 | 25.689 | 5.086 | 0.176 | 0.000 | 0.063 | 1.520 | 11.119 | 0.016 | n/a | 0.050 | 7.635 | n/a | n/a | 0.024 | 5.324 | 0.207 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001fe | 25.495 | 6.962 | n/a | 0.000 | 0.115 | 0.927 | 1.253 | 0.016 | n/a | 0.458 | 15.711 | n/a | n/a | 0.053 | 7.077 | 0.278 | 0.053 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001e1 | 24.300 | 4.079 | 0.366 | 0.349 | 0.129 | 1.175 | 8.627 | 0.028 | n/a | 0.315 | 9.180 | n/a | n/a | 0.051 | 4.924 | 0.203 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001df | 24.096 | 2.807 | n/a | 0.000 | 0.073 | 0.718 | 4.537 | 0.015 | n/a | 0.350 | 15.568 | n/a | n/a | 0.030 | 2.880 | 0.120 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.955 | 0.732 | 0.000 | 0.583 | 3.110 | n/a | 0.000 | 0.059 | 0.696 | 1.163 | 0.017 | n/a | 0.357 | 10.989 | n/a | n/a | 0.030 | 3.215 | 0.189 | 0.030 |
| p99 | 74.052 | 1.646 | 0.000 | 1.436 | 4.095 | n/a | 0.000 | 2.381 | 1.250 | 4.537 | 0.029 | n/a | 3.177 | 69.072 | n/a | n/a | 0.069 | 4.507 | 0.368 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b100000000000001e8 | 74.052 | 3.158 | n/a | 0.000 | 0.056 | 0.617 | 0.799 | 0.013 | n/a | 0.313 | 69.072 | n/a | n/a | 0.024 | 3.215 | 0.043 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001df | 24.096 | 2.807 | n/a | 0.000 | 0.073 | 0.718 | 4.537 | 0.015 | n/a | 0.350 | 15.568 | n/a | n/a | 0.030 | 2.880 | 0.120 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000206 | 23.538 | 2.602 | n/a | 0.000 | 0.057 | 0.734 | 0.975 | 0.016 | n/a | 1.290 | 17.838 | n/a | n/a | 0.026 | 2.660 | 0.113 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001d6 | 22.692 | 3.110 | n/a | 0.000 | 0.055 | 0.693 | 0.782 | 0.016 | n/a | 0.102 | 17.904 | n/a | n/a | 0.029 | 3.166 | 0.140 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001ed | 18.746 | 3.897 | n/a | 0.000 | 0.042 | 0.918 | 1.743 | 0.029 | n/a | 1.785 | 10.306 | n/a | n/a | 0.026 | 3.939 | 0.210 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001e5 | 18.376 | 2.556 | n/a | 0.000 | 0.053 | 0.584 | 0.967 | 0.021 | n/a | 3.177 | 10.989 | n/a | n/a | 0.028 | 2.609 | 0.142 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000201 | 18.011 | 3.337 | n/a | 0.000 | 0.072 | 1.166 | 1.146 | 0.021 | n/a | 0.528 | 11.708 | n/a | n/a | 0.034 | 3.409 | 0.189 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001d2 | 17.955 | 2.785 | n/a | 0.000 | 0.059 | 0.696 | 1.163 | 0.016 | n/a | 0.106 | 13.100 | n/a | n/a | 0.030 | 2.844 | 0.158 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001cf | 17.636 | 2.126 | n/a | 0.000 | 2.381 | 0.535 | 0.845 | 0.015 | n/a | 0.124 | 11.592 | n/a | n/a | 0.019 | 4.507 | 0.256 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.012ms |
| 2916fa03b9c0f9b1000000000000020e | 12.916 | 3.837 | n/a | 0.000 | 0.137 | 1.250 | 3.282 | 0.018 | n/a | 0.344 | 3.990 | n/a | n/a | 0.058 | 3.974 | 0.308 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000001ea | 12.720 | 4.095 | n/a | 0.000 | 0.137 | 0.910 | 1.075 | 0.017 | n/a | 0.405 | 6.013 | n/a | n/a | 0.069 | 4.232 | 0.333 | 0.069 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000214 | 12.331 | 3.189 | n/a | 0.000 | 0.096 | 0.815 | 1.192 | 0.020 | n/a | 0.505 | 6.452 | n/a | n/a | 0.062 | 3.285 | 0.266 | 0.062 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 2916fa03b9c0f9b100000000000001f8 | 11.719 | 1.983 | n/a | 0.000 | 0.050 | 0.646 | 1.699 | 0.021 | n/a | 0.534 | 6.761 | n/a | n/a | 0.025 | 2.033 | 0.173 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000021f | 11.352 | 2.465 | n/a | 0.000 | 0.056 | 0.618 | 1.274 | 0.017 | n/a | 0.357 | 6.529 | n/a | n/a | 0.037 | 2.521 | 0.222 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000020a | 8.742 | 3.124 | n/a | 0.000 | 0.091 | 0.666 | 1.203 | 0.012 | n/a | 0.293 | 3.298 | n/a | n/a | 0.056 | 3.215 | 0.368 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 98.491 | n/a | n/a | n/a | 47.844 | 18.584 | 4.103 | 0.000 | 0.722 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.268 | 79.158 | 0.811 | 29.268 |
| p99 | 2034.252 | n/a | n/a | n/a | 272.591 | 1713.169 | 53.412 | 0.000 | 43.735 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 559.264 | 1892.570 | 1.000 | 559.264 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b10000000000001c5c | 2044.029 | 96.118 | 1677.828 | 6.154 | 0.000 | 169.793 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 94.135 | 1780.100 | 0.871 | 94.135 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.974ms; driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms |
| 2916fa03b9c0f9b10000000000001c63 | 2034.252 | 57.919 | 1838.420 | 3.413 | 0.000 | 0.448 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 134.053 | 1899.752 | 0.934 | 134.053 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.974ms; driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms |
| 2916fa03b9c0f9b10000000000001c8b | 1960.085 | 88.042 | 1713.169 | 35.097 | 0.000 | 1.018 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 122.760 | 1836.308 | 0.937 | 122.760 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.989ms; driver.expected-state.bind-receipt 1.974ms; driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms |
| 2916fa03b9c0f9b10000000000001c54 | 1957.644 | 192.892 | 1498.765 | 23.379 | 0.000 | 1.481 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 241.128 | 1715.035 | 0.876 | 241.128 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.974ms; driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms |
| 2916fa03b9c0f9b10000000000001c6b | 1910.230 | 251.191 | 1611.891 | 29.488 | 0.000 | 1.206 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.454 | 1892.570 | 0.991 | 16.454 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.974ms; driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms |
| 2916fa03b9c0f9b10000000000001c87 | 1891.789 | 79.347 | 1701.533 | 36.955 | 0.000 | 0.838 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 73.115 | 1817.836 | 0.961 | 73.115 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.974ms; driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms |
| 2916fa03b9c0f9b10000000000001c89 | 1777.513 | 35.357 | 1380.327 | 25.951 | 0.000 | 0.655 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 335.222 | 1441.635 | 0.811 | 335.222 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.974ms; driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms |
| 2916fa03b9c0f9b10000000000001c51 | 1757.339 | 53.743 | 1543.344 | 3.782 | 0.000 | 1.033 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 155.436 | 1600.870 | 0.911 | 155.436 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms; driver.expected-state.bind-receipt 1.172ms |
| 2916fa03b9c0f9b10000000000001c56 | 1748.269 | 32.660 | 1679.386 | 3.815 | 0.000 | 0.724 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.684 | 1715.861 | 0.981 | 31.684 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms; driver.expected-state.bind-receipt 1.172ms |
| 2916fa03b9c0f9b10000000000001c5d | 1730.507 | 45.200 | 1651.127 | 2.166 | 0.000 | 0.442 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.572 | 1698.493 | 0.982 | 31.572 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms; driver.expected-state.bind-receipt 1.172ms |
| 2916fa03b9c0f9b10000000000001c53 | 1729.804 | 66.701 | 1427.664 | 5.343 | 0.000 | 0.715 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 229.381 | 1499.708 | 0.867 | 229.381 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms; driver.expected-state.bind-receipt 1.172ms |
| 2916fa03b9c0f9b10000000000001c4d | 1716.813 | 148.017 | 1272.489 | 17.341 | 0.000 | 1.640 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 277.326 | 1437.847 | 0.838 | 277.326 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms; driver.expected-state.bind-receipt 1.172ms |
| 2916fa03b9c0f9b10000000000001c44 | 1619.051 | 58.189 | 1135.284 | 6.067 | 0.000 | 0.659 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 418.853 | 1199.539 | 0.741 | 418.853 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms; driver.expected-state.bind-receipt 1.202ms |
| 2916fa03b9c0f9b10000000000001c49 | 1563.178 | 46.115 | 960.898 | 4.618 | 0.000 | 0.716 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 550.831 | 1011.631 | 0.647 | 550.831 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms; driver.expected-state.bind-receipt 1.202ms |
| 2916fa03b9c0f9b10000000000001c46 | 1498.681 | 202.104 | 769.623 | 18.789 | 0.000 | 1.877 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 506.288 | 990.516 | 0.661 | 506.288 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms; driver.expected-state.bind-receipt 1.202ms |
| 2916fa03b9c0f9b10000000000001c3f | 1332.488 | 212.075 | 666.571 | 19.715 | 0.000 | 1.259 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 432.868 | 898.361 | 0.674 | 432.868 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms; driver.expected-state.bind-receipt 1.202ms; driver.expected-state.bind-receipt 1.172ms |
| 2916fa03b9c0f9b10000000000001c35 | 1208.807 | 121.954 | 523.141 | 14.979 | 0.000 | 1.259 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 547.474 | 660.074 | 0.546 | 547.474 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.582ms; driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms; driver.expected-state.bind-receipt 1.202ms |
| 2916fa03b9c0f9b10000000000001c3c | 1023.641 | 188.225 | 125.873 | 53.412 | 0.000 | 2.536 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 653.595 | 367.510 | 0.359 | 653.595 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.512ms; driver.expected-state.bind-receipt 1.428ms; driver.expected-state.bind-receipt 1.233ms; driver.expected-state.bind-receipt 1.202ms; driver.expected-state.bind-receipt 1.172ms |
| 2916fa03b9c0f9b10000000000001c3a | 831.795 | 125.393 | 134.944 | 11.152 | 0.000 | 1.042 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 559.264 | 271.489 | 0.326 | 559.264 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.233ms; driver.expected-state.bind-receipt 1.202ms; driver.expected-state.bind-receipt 1.172ms; driver.expected-state.bind-receipt 1.163ms; driver.expected-state.bind-receipt 1.111ms |
| 2916fa03b9c0f9b10000000000001c32 | 774.290 | 143.688 | 115.730 | 48.429 | 0.000 | 1.478 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 464.965 | 307.847 | 0.398 | 464.965 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.582ms; driver.expected-state.bind-receipt 1.202ms; driver.expected-state.bind-receipt 1.172ms; driver.expected-state.bind-receipt 1.163ms; driver.expected-state.bind-receipt 1.111ms |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.621 | 0.123 | 0.000 | 0.604 | 3.964 | n/a | 0.000 | 0.056 | 0.993 | 3.442 | 0.018 | n/a | 0.237 | 9.691 | n/a | n/a | 0.028 | 4.333 | 0.218 | 0.028 |
| p99 | 66.778 | 2.999 | 0.000 | 1.925 | 8.942 | n/a | 0.495 | 1.827 | 4.814 | 43.304 | 0.053 | n/a | 3.575 | 47.621 | n/a | n/a | 0.170 | 9.665 | 0.441 | 0.170 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b1000000000000027b | 66.778 | 3.964 | 0.312 | 0.000 | 0.058 | 1.606 | 13.062 | 0.037 | n/a | 0.076 | 47.621 | n/a | n/a | 0.043 | 4.333 | 0.065 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.088ms; driver.publication.persist-deferred 0.026ms |
| 2916fa03b9c0f9b10000000000000236 | 62.778 | 3.443 | 0.198 | 0.441 | 0.072 | 1.104 | 43.304 | 0.017 | n/a | 0.100 | 14.067 | n/a | n/a | 0.032 | 4.154 | 0.066 | 0.032 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.032ms |
| 2916fa03b9c0f9b10000000000000231 | 52.782 | 3.175 | n/a | 0.000 | 0.099 | 0.940 | 4.478 | 0.017 | n/a | 0.060 | 43.974 | n/a | n/a | 0.040 | 3.274 | 0.062 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000246 | 46.902 | 4.531 | 0.368 | 0.296 | 0.086 | 1.492 | 13.493 | 0.018 | n/a | 1.698 | 24.886 | n/a | n/a | 0.034 | 5.281 | 0.113 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000026f | 38.063 | 4.112 | 0.369 | 0.000 | 0.065 | 1.855 | 7.125 | 0.028 | n/a | 0.421 | 24.055 | n/a | n/a | 0.034 | 4.545 | 0.119 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000222 | 34.672 | 5.983 | 0.384 | 0.495 | 0.063 | 1.922 | 13.344 | 0.053 | n/a | 3.462 | 8.938 | n/a | n/a | 0.028 | 6.925 | 0.200 | 0.028 | gw-w/thread-43/gateway.admitted-work | none observed |
| 2916fa03b9c0f9b10000000000000248 | 33.329 | 4.404 | 0.338 | 0.282 | 0.051 | 1.680 | 10.899 | 0.038 | n/a | 0.694 | 14.914 | n/a | n/a | 0.028 | 5.075 | 0.152 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000244 | 30.965 | 6.432 | 0.151 | 0.432 | 0.035 | 1.491 | 8.344 | 0.029 | n/a | 0.114 | 13.914 | n/a | n/a | 0.023 | 7.051 | 0.228 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000023a | 30.897 | 4.936 | 0.290 | 0.346 | 0.070 | 1.372 | 8.369 | 0.038 | n/a | 0.083 | 15.359 | n/a | n/a | 0.034 | 5.641 | 0.183 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000230 | 30.803 | 3.998 | 0.204 | 0.399 | 0.071 | 4.814 | 5.456 | 0.016 | n/a | 1.203 | 14.616 | n/a | n/a | 0.026 | 4.672 | 0.152 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000275 | 30.534 | 3.572 | 0.175 | 0.000 | 0.049 | 0.929 | 13.285 | 0.019 | n/a | 0.632 | 11.845 | n/a | n/a | 0.028 | 3.796 | 0.124 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000266 | 29.210 | 3.542 | 0.251 | 0.000 | 0.036 | 1.291 | 11.506 | 0.018 | n/a | 0.276 | 12.271 | n/a | n/a | 0.020 | 3.829 | 0.131 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000025c | 28.854 | 3.333 | 0.225 | 0.401 | 0.056 | 1.265 | 10.967 | 0.025 | n/a | 0.101 | 12.445 | n/a | n/a | 0.037 | 4.015 | 0.139 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000238 | 28.587 | 5.819 | n/a | 0.000 | 0.163 | 2.598 | 1.834 | 0.052 | n/a | 1.025 | 17.039 | n/a | n/a | 0.057 | 5.982 | 0.209 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000026d | 28.292 | 5.229 | 0.199 | 0.000 | 0.075 | 4.602 | 7.216 | 0.033 | n/a | 0.072 | 10.831 | n/a | n/a | 0.036 | 5.503 | 0.195 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000252 | 28.233 | 4.043 | 0.300 | 0.319 | 0.112 | 1.280 | 10.112 | 0.024 | n/a | 0.323 | 11.669 | n/a | n/a | 0.051 | 4.774 | 0.169 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000233 | 26.041 | 3.930 | n/a | 0.000 | 0.055 | 0.708 | 12.001 | 0.023 | n/a | 0.054 | 9.248 | n/a | n/a | 0.022 | 3.985 | 0.153 | 0.022 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| 2916fa03b9c0f9b10000000000000281 | 25.985 | 3.777 | 0.304 | 0.000 | 0.186 | 1.201 | 7.034 | 0.021 | n/a | 0.249 | 13.107 | n/a | n/a | 0.105 | 4.267 | 0.164 | 0.105 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000024a | 23.972 | 4.306 | 0.209 | 0.288 | 0.076 | 1.535 | 4.681 | 0.020 | n/a | 3.123 | 9.691 | n/a | n/a | 0.043 | 4.879 | 0.204 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000273 | 23.187 | 5.003 | n/a | 0.000 | 0.052 | 3.400 | 4.314 | 0.014 | n/a | 3.575 | 6.802 | n/a | n/a | 0.026 | 5.055 | 0.218 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.077ms |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.794 | 0.313 | 0.000 | 0.514 | 2.553 | n/a | 0.000 | 0.055 | 0.682 | 1.270 | 0.017 | n/a | 0.153 | 5.474 | n/a | n/a | 0.028 | 2.594 | 0.263 | 0.028 |
| p99 | 52.782 | 2.016 | 0.000 | 1.087 | 5.819 | n/a | 0.000 | 0.163 | 2.598 | 7.175 | 0.052 | n/a | 1.063 | 43.974 | n/a | n/a | 0.057 | 5.982 | 0.403 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b10000000000000231 | 52.782 | 3.175 | n/a | 0.000 | 0.099 | 0.940 | 4.478 | 0.017 | n/a | 0.060 | 43.974 | n/a | n/a | 0.040 | 3.274 | 0.062 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000238 | 28.587 | 5.819 | n/a | 0.000 | 0.163 | 2.598 | 1.834 | 0.052 | n/a | 1.025 | 17.039 | n/a | n/a | 0.057 | 5.982 | 0.209 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000024c | 22.876 | 2.774 | n/a | 0.000 | 0.017 | 0.306 | 0.682 | 0.008 | n/a | 0.237 | 18.841 | n/a | n/a | 0.011 | 2.791 | 0.122 | 0.011 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.020ms |
| 2916fa03b9c0f9b1000000000000026b | 20.338 | 5.054 | n/a | 0.000 | 0.054 | 2.360 | 7.175 | 0.042 | n/a | 0.153 | 5.474 | n/a | n/a | 0.027 | 5.108 | 0.251 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| 2916fa03b9c0f9b1000000000000027f | 19.188 | 2.423 | n/a | 0.000 | 0.100 | 0.576 | 1.018 | 0.013 | n/a | 0.321 | 14.694 | n/a | n/a | 0.044 | 2.523 | 0.131 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| 2916fa03b9c0f9b10000000000000256 | 15.869 | 1.960 | n/a | 0.000 | 0.059 | 0.883 | 2.002 | 0.044 | n/a | 0.149 | 10.743 | n/a | n/a | 0.029 | 2.020 | 0.127 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000224 | 14.058 | 5.406 | n/a | 0.000 | 0.120 | 1.686 | 2.989 | 0.033 | n/a | 1.063 | 2.718 | n/a | n/a | 0.043 | 5.526 | 0.393 | 0.043 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000285 | 13.927 | 3.802 | n/a | 0.000 | 0.103 | 0.682 | 2.900 | 0.017 | n/a | 0.114 | 6.262 | n/a | n/a | 0.046 | 3.906 | 0.280 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000283 | 13.794 | 4.827 | n/a | 0.000 | 0.100 | 0.771 | 0.829 | 0.013 | n/a | 0.078 | 7.130 | n/a | n/a | 0.046 | 4.927 | 0.357 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000022d | 10.187 | 2.369 | n/a | 0.000 | 0.054 | 0.535 | 0.787 | 0.013 | n/a | 0.294 | 6.106 | n/a | n/a | 0.028 | 2.424 | 0.238 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000260 | 9.891 | 3.889 | n/a | 0.000 | 0.100 | 0.752 | 1.034 | 0.014 | n/a | 0.096 | 3.961 | n/a | n/a | 0.045 | 3.989 | 0.403 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| 2916fa03b9c0f9b10000000000000228 | 9.330 | 2.536 | n/a | 0.000 | 0.047 | 0.601 | 0.920 | 0.015 | n/a | 0.390 | 4.799 | n/a | n/a | 0.023 | 2.583 | 0.277 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000270 | 9.271 | 1.992 | n/a | 0.000 | 0.045 | 0.953 | 1.648 | 0.019 | n/a | 0.353 | 4.238 | n/a | n/a | 0.022 | 2.038 | 0.220 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 2916fa03b9c0f9b10000000000000278 | 8.535 | 2.194 | n/a | 0.000 | 0.054 | 0.417 | 1.270 | 0.016 | n/a | 0.112 | 4.447 | n/a | n/a | 0.026 | 2.248 | 0.263 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000262 | 8.003 | 2.553 | n/a | 0.000 | 0.040 | 0.595 | 1.069 | 0.018 | n/a | 0.354 | 3.353 | n/a | n/a | 0.020 | 2.594 | 0.324 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000242 | 7.722 | 2.048 | n/a | 0.000 | 0.055 | 0.585 | 1.315 | 0.014 | n/a | 0.085 | 3.595 | n/a | n/a | 0.025 | 2.103 | 0.272 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000267 | 6.210 | 1.682 | n/a | 0.000 | 0.034 | 0.472 | 0.916 | 0.018 | n/a | 0.059 | 3.009 | n/a | n/a | 0.020 | 1.716 | 0.276 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.112 | 0.448 | 0.000 | 0.621 | 3.668 | n/a | 0.000 | 0.064 | 0.907 | 2.301 | 0.021 | n/a | 0.150 | 9.824 | n/a | n/a | 0.035 | 4.424 | 0.209 | 0.035 |
| p99 | 106.051 | 2.006 | 0.000 | 1.905 | 7.120 | n/a | 0.600 | 5.644 | 4.305 | 45.450 | 0.048 | n/a | 4.237 | 51.834 | n/a | n/a | 0.094 | 11.712 | 0.535 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b1000000000000028b | 106.051 | 5.636 | 0.193 | 0.302 | 0.064 | 2.422 | 45.450 | 0.029 | n/a | 0.078 | 51.834 | n/a | n/a | 0.042 | 6.195 | 0.058 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 2916fa03b9c0f9b100000000000002c6 | 49.656 | 3.583 | 0.183 | 0.314 | 0.030 | 0.907 | 36.621 | 0.016 | n/a | 0.073 | 7.913 | n/a | n/a | 0.016 | 4.111 | 0.083 | 0.016 | gw-w/thread-48/gateway.admitted-work | none observed |
| 2916fa03b9c0f9b100000000000002c2 | 48.703 | 3.646 | 0.154 | 0.000 | 0.034 | 0.889 | 5.598 | 0.017 | n/a | 0.073 | 38.272 | n/a | n/a | 0.020 | 3.834 | 0.079 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002b0 | 43.929 | 6.239 | 0.312 | 0.000 | 0.081 | 1.835 | 15.074 | 0.036 | n/a | 0.418 | 19.893 | n/a | n/a | 0.043 | 6.631 | 0.151 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000296 | 40.469 | 4.648 | 1.356 | 0.288 | 0.180 | 1.290 | 11.800 | 0.020 | n/a | 0.292 | 20.502 | n/a | n/a | 0.094 | 6.471 | 0.160 | 0.094 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.034ms |
| 2916fa03b9c0f9b1000000000000029c | 33.469 | 5.855 | 0.168 | 0.600 | 0.058 | 2.389 | 12.829 | 0.035 | n/a | 0.466 | 11.037 | n/a | n/a | 0.032 | 6.681 | 0.200 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002ac | 32.354 | 4.544 | 0.307 | 0.299 | 0.177 | 1.864 | 6.130 | 0.027 | n/a | 4.237 | 14.708 | n/a | n/a | 0.060 | 5.328 | 0.165 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.174ms; driver.publication.persist-deferred 0.029ms |
| 2916fa03b9c0f9b100000000000002d9 | 30.396 | 3.668 | 0.188 | 0.454 | 0.059 | 1.502 | 14.743 | 0.048 | n/a | 0.156 | 9.547 | n/a | n/a | 0.032 | 4.369 | 0.144 | 0.032 | gw-w/thread-48/gateway.admitted-work | none observed |
| 2916fa03b9c0f9b10000000000000287 | 27.648 | 3.935 | 0.297 | 0.352 | 0.147 | 0.967 | 9.343 | 0.028 | n/a | 0.085 | 12.444 | n/a | n/a | 0.051 | 4.730 | 0.171 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002b4 | 27.590 | 6.068 | n/a | 0.000 | 5.644 | 0.573 | 3.187 | 0.017 | n/a | 0.407 | 11.640 | n/a | n/a | 0.055 | 11.712 | 0.425 | 0.055 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| 2916fa03b9c0f9b1000000000000028d | 26.746 | 3.543 | n/a | 0.000 | 0.089 | 0.561 | 1.109 | 0.014 | n/a | 0.343 | 21.047 | n/a | n/a | 0.041 | 3.632 | 0.136 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 2916fa03b9c0f9b10000000000000297 | 25.184 | 4.307 | n/a | 0.000 | 0.117 | 0.737 | 0.612 | 0.005 | n/a | 0.261 | 19.090 | n/a | n/a | 0.055 | 4.424 | 0.176 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002d5 | 24.946 | 3.266 | 0.209 | 0.347 | 0.098 | 1.703 | 7.356 | 0.027 | n/a | 0.058 | 11.831 | n/a | n/a | 0.052 | 3.920 | 0.157 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002b8 | 23.821 | 4.874 | 0.261 | 0.000 | 0.041 | 1.295 | 4.606 | 0.018 | n/a | 0.051 | 12.637 | n/a | n/a | 0.037 | 5.177 | 0.217 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002b6 | 23.644 | 5.694 | 0.228 | 0.306 | 0.053 | 0.844 | 4.672 | 0.017 | n/a | 0.308 | 11.435 | n/a | n/a | 0.087 | 6.281 | 0.266 | 0.087 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002ad | 23.554 | 3.972 | n/a | 0.000 | 0.044 | 0.931 | 6.231 | 0.021 | n/a | 0.056 | 12.277 | n/a | n/a | 0.021 | 4.016 | 0.171 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002a8 | 23.460 | 3.077 | 0.210 | 0.339 | 0.127 | 0.868 | 6.504 | 0.017 | n/a | 0.302 | 11.960 | n/a | n/a | 0.055 | 3.754 | 0.160 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000290 | 21.474 | 4.044 | 0.251 | 0.363 | 0.072 | 1.653 | 4.327 | 0.017 | n/a | 0.249 | 10.469 | n/a | n/a | 0.029 | 4.730 | 0.220 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b1000000000000029e | 21.037 | 3.879 | 0.266 | 0.282 | 0.069 | 0.940 | 5.237 | 0.024 | n/a | 0.357 | 9.952 | n/a | n/a | 0.033 | 4.495 | 0.214 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002bc | 20.912 | 4.467 | 0.419 | 0.379 | 0.137 | 1.478 | 6.371 | 0.023 | n/a | 0.106 | 7.469 | n/a | n/a | 0.062 | 5.403 | 0.258 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.512 | 0.642 | 0.000 | 0.550 | 2.306 | n/a | 0.000 | 0.060 | 0.568 | 1.009 | 0.014 | n/a | 0.132 | 7.239 | n/a | n/a | 0.034 | 2.371 | 0.198 | 0.034 |
| p99 | 25.184 | 1.003 | 0.000 | 1.196 | 6.295 | n/a | 0.000 | 4.291 | 4.305 | 2.334 | 0.037 | n/a | 0.428 | 19.090 | n/a | n/a | 0.076 | 7.762 | 0.535 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b10000000000000297 | 25.184 | 4.307 | n/a | 0.000 | 0.117 | 0.737 | 0.612 | 0.005 | n/a | 0.261 | 19.090 | n/a | n/a | 0.055 | 4.424 | 0.176 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002c0 | 19.816 | 2.717 | n/a | 0.000 | 0.057 | 0.668 | 1.363 | 0.021 | n/a | 0.174 | 14.781 | n/a | n/a | 0.035 | 2.774 | 0.140 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002a6 | 19.112 | 1.867 | n/a | 0.000 | 0.057 | 3.847 | 1.009 | 0.013 | n/a | 0.056 | 12.238 | n/a | n/a | 0.026 | 1.924 | 0.101 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002b1 | 17.686 | 6.295 | n/a | 0.000 | 0.179 | 2.433 | 1.239 | 0.021 | n/a | 0.428 | 7.015 | n/a | n/a | 0.076 | 6.474 | 0.366 | 0.076 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.084ms |
| 2916fa03b9c0f9b100000000000002ba | 16.105 | 3.112 | n/a | 0.000 | 0.071 | 0.568 | 0.984 | 0.021 | n/a | 0.150 | 11.163 | n/a | n/a | 0.035 | 3.183 | 0.198 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000288 | 15.131 | 2.306 | n/a | 0.000 | 0.065 | 4.305 | 1.063 | 0.023 | n/a | 0.095 | 7.239 | n/a | n/a | 0.034 | 2.371 | 0.157 | 0.034 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 2916fa03b9c0f9b100000000000002cb | 14.962 | 2.575 | n/a | 0.000 | 0.064 | 0.497 | 1.210 | 0.037 | n/a | 0.084 | 10.456 | n/a | n/a | 0.038 | 2.639 | 0.176 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002c4 | 14.512 | 3.471 | n/a | 0.000 | 4.291 | 0.835 | 1.042 | 0.014 | n/a | 0.117 | 4.698 | n/a | n/a | 0.043 | 7.762 | 0.535 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002be | 13.500 | 3.088 | n/a | 0.000 | 0.091 | 0.524 | 1.202 | 0.022 | n/a | 0.132 | 8.403 | n/a | n/a | 0.038 | 3.179 | 0.235 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002c9 | 11.656 | 1.869 | n/a | 0.000 | 0.044 | 0.456 | 0.774 | 0.013 | n/a | 0.071 | 8.407 | n/a | n/a | 0.022 | 1.914 | 0.164 | 0.022 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.076ms |
| 2916fa03b9c0f9b1000000000000029f | 7.863 | 2.029 | n/a | 0.000 | 0.042 | 0.482 | 0.827 | 0.012 | n/a | 0.334 | 4.115 | n/a | n/a | 0.021 | 2.071 | 0.263 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002a9 | 7.109 | 2.013 | n/a | 0.000 | 0.052 | 0.500 | 0.869 | 0.013 | n/a | 0.319 | 3.319 | n/a | n/a | 0.024 | 2.066 | 0.291 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002a1 | 6.860 | 1.750 | n/a | 0.000 | 0.055 | 0.444 | 0.790 | 0.012 | n/a | 0.301 | 3.484 | n/a | n/a | 0.024 | 1.805 | 0.263 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b100000000000002d0 | 5.460 | 2.050 | n/a | 0.000 | 0.060 | 0.938 | 2.334 | 0.018 | n/a | 0.031 | 0.000 | n/a | n/a | 0.029 | 2.110 | 0.386 | 0.029 | node-14/thread-0/driver.execute | none observed |

## P2 / L1024 / commit (856 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.705 | 0.529 | 0.000 | 0.572 | 2.461 | n/a | 0.000 | 0.052 | 0.599 | 0.935 | 0.010 | n/a | 0.072 | 5.766 | n/a | n/a | 0.018 | 2.812 | 0.246 | 0.018 |
| p99 | 80.737 | 2.671 | 0.053 | 2.253 | 7.635 | n/a | 0.303 | 19.690 | 7.958 | 13.944 | 0.064 | n/a | 3.603 | 74.498 | n/a | n/a | 0.057 | 23.619 | 0.696 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b1000000000000055b | 109.056 | 14.792 | n/a | 0.000 | 0.084 | 2.347 | 4.771 | 0.026 | n/a | 0.130 | 86.867 | n/a | n/a | 0.039 | 14.876 | 0.136 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.098ms; driver.reader-basis.broadcast 0.052ms; driver.publication.readback 0.032ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.003ms |
| 2916fa03b9c0f9b1000000000000040b | 108.302 | 6.064 | n/a | 0.000 | 2.205 | 10.002 | 1.838 | 0.012 | n/a | 3.089 | 85.080 | n/a | n/a | 0.012 | 8.269 | 0.076 | 0.012 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.223ms; driver.publication.readback 0.148ms; driver.publication.readback 0.116ms; driver.reader-basis.broadcast 0.069ms; driver.publication.readback 0.066ms |
| 2916fa03b9c0f9b10000000000000404 | 95.539 | 5.267 | 0.348 | 0.690 | 0.083 | 1.626 | 6.825 | 0.015 | n/a | 0.058 | 80.590 | n/a | n/a | 0.038 | 6.387 | 0.067 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.072ms; driver.publication.readback 0.059ms; driver.publication.readback 0.033ms; driver.publication.persist-deferred 0.021ms |
| 2916fa03b9c0f9b10000000000000409 | 93.868 | 5.723 | n/a | 0.000 | 0.070 | 0.750 | 1.449 | 0.017 | n/a | 0.048 | 85.779 | n/a | n/a | 0.032 | 5.793 | 0.062 | 0.032 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.223ms; driver.reader-basis.broadcast 0.069ms; driver.publication.readback 0.066ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.031ms |
| 2916fa03b9c0f9b10000000000000408 | 87.211 | 3.498 | n/a | 0.000 | 0.097 | 0.594 | 1.485 | 0.029 | n/a | 0.155 | 81.323 | n/a | n/a | 0.031 | 3.595 | 0.041 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.069ms; driver.publication.readback 0.066ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.031ms; driver.publication.persist-deferred 0.021ms |
| 2916fa03b9c0f9b10000000000000407 | 84.664 | 2.156 | n/a | 0.000 | 0.045 | 2.353 | 1.308 | 0.023 | n/a | 0.412 | 78.343 | n/a | n/a | 0.025 | 2.201 | 0.026 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.069ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.021ms |
| 2916fa03b9c0f9b10000000000000403 | 81.393 | 5.264 | n/a | 0.000 | 0.098 | 0.692 | 11.693 | 0.018 | n/a | 0.244 | 63.345 | n/a | n/a | 0.039 | 5.362 | 0.066 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.096ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.072ms; driver.publication.readback 0.033ms; driver.publication.persist-deferred 0.017ms |
| 2916fa03b9c0f9b10000000000000398 | 81.242 | 2.792 | n/a | 0.000 | 0.041 | 1.716 | 1.102 | 0.011 | n/a | 0.343 | 75.217 | n/a | n/a | 0.021 | 2.832 | 0.035 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.329ms; driver.publication.readback 0.109ms; driver.reader-basis.broadcast 0.050ms; driver.publication.persist-deferred 0.049ms; driver.publication.readback 0.041ms |
| 2916fa03b9c0f9b1000000000000040a | 80.737 | 2.852 | n/a | 0.000 | 0.072 | 0.711 | 1.445 | 0.022 | n/a | 0.134 | 75.467 | n/a | n/a | 0.034 | 2.924 | 0.036 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.223ms; driver.reader-basis.broadcast 0.069ms; driver.publication.readback 0.066ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.054ms |
| 2916fa03b9c0f9b1000000000000040e | 79.286 | 2.843 | n/a | 0.000 | 52.727 | 0.617 | 0.998 | 0.013 | n/a | 0.078 | 22.000 | n/a | n/a | 0.010 | 55.570 | 0.701 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.063ms; driver.publication.readback 0.223ms; driver.publication.readback 0.148ms; driver.publication.readback 0.118ms; driver.publication.readback 0.116ms |
| 2916fa03b9c0f9b1000000000000040c | 79.037 | 4.036 | n/a | 0.000 | 0.753 | 3.344 | 0.979 | 0.007 | n/a | 0.019 | 69.868 | n/a | n/a | 0.032 | 4.789 | 0.061 | 0.032 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.223ms; driver.publication.readback 0.148ms; driver.reader-basis.broadcast 0.069ms; driver.publication.readback 0.066ms; driver.publication.readback 0.059ms |
| 2916fa03b9c0f9b1000000000000055d | 78.402 | 1.498 | n/a | 0.000 | 0.030 | 1.908 | 0.431 | 0.005 | n/a | 0.014 | 74.498 | n/a | n/a | 0.019 | 1.528 | 0.019 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 2916fa03b9c0f9b10000000000000414 | 74.947 | 1.615 | n/a | 0.000 | 43.741 | 2.850 | 0.667 | 0.009 | n/a | 0.081 | 25.974 | n/a | n/a | 0.011 | 45.355 | 0.605 | 0.011 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.509ms; driver.expected-state.bind-receipt 1.063ms; driver.publication.readback 0.223ms; driver.publication.readback 0.159ms; driver.publication.readback 0.148ms |
| 2916fa03b9c0f9b1000000000000055f | 74.761 | 5.840 | n/a | 0.000 | 1.420 | 3.060 | 3.948 | 0.021 | n/a | 0.049 | 60.408 | n/a | n/a | 0.016 | 7.260 | 0.097 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.023ms; driver.publication.readback 0.098ms; driver.publication.persist-deferred 0.065ms; driver.publication.readback 0.032ms; driver.publication.persist-deferred 0.016ms |
| 2916fa03b9c0f9b10000000000000392 | 73.304 | 3.283 | n/a | 0.000 | 1.159 | 0.432 | 2.716 | 0.009 | n/a | 2.203 | 63.492 | n/a | n/a | 0.010 | 4.442 | 0.061 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.059ms; driver.reader-basis.broadcast 0.058ms; driver.publication.persist-deferred 0.017ms |
| 2916fa03b9c0f9b10000000000000415 | 72.750 | 1.552 | n/a | 0.000 | 37.779 | 7.997 | 0.684 | 0.009 | n/a | 0.023 | 24.697 | n/a | n/a | 0.010 | 39.331 | 0.541 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.509ms; driver.expected-state.bind-receipt 1.063ms; driver.publication.readback 0.159ms; driver.publication.readback 0.148ms; driver.publication.readback 0.118ms |
| 2916fa03b9c0f9b1000000000000055c | 72.076 | 3.787 | 0.304 | 0.247 | 0.046 | 0.846 | 4.201 | 0.011 | n/a | 0.031 | 62.580 | n/a | n/a | 0.022 | 4.384 | 0.061 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 2916fa03b9c0f9b1000000000000055e | 70.875 | 2.382 | n/a | 0.000 | 0.028 | 1.844 | 0.804 | 0.008 | n/a | 0.019 | 65.774 | n/a | n/a | 0.015 | 2.410 | 0.034 | 0.015 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000394 | 66.895 | 2.671 | n/a | 0.000 | 0.033 | 0.657 | 0.982 | 0.011 | n/a | 2.852 | 59.672 | n/a | n/a | 0.018 | 2.704 | 0.040 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.109ms; driver.reader-basis.broadcast 0.058ms; driver.publication.persist-deferred 0.035ms |
| 2916fa03b9c0f9b10000000000000396 | 65.409 | 3.299 | 0.150 | 0.231 | 0.031 | 0.944 | 11.326 | 0.024 | n/a | 0.137 | 49.251 | n/a | n/a | 0.015 | 3.712 | 0.057 | 0.015 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.329ms; driver.publication.readback 0.109ms; driver.publication.persist-deferred 0.049ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.035ms |

## P2 / L1024 / commit / 5-10 facts (498 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.830 | 0.000 | 0.000 | 0.433 | 1.955 | n/a | 0.000 | 0.052 | 0.596 | 0.760 | 0.010 | n/a | 0.071 | 4.596 | n/a | n/a | 0.019 | 2.242 | 0.232 | 0.019 |
| p99 | 72.750 | 2.003 | 0.023 | 1.323 | 5.188 | n/a | 0.000 | 18.273 | 8.260 | 6.171 | 0.064 | n/a | 3.707 | 54.282 | n/a | n/a | 0.059 | 22.244 | 0.708 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b10000000000000408 | 87.211 | 3.498 | n/a | 0.000 | 0.097 | 0.594 | 1.485 | 0.029 | n/a | 0.155 | 81.323 | n/a | n/a | 0.031 | 3.595 | 0.041 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.069ms; driver.publication.readback 0.066ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.031ms; driver.publication.persist-deferred 0.021ms |
| 2916fa03b9c0f9b10000000000000407 | 84.664 | 2.156 | n/a | 0.000 | 0.045 | 2.353 | 1.308 | 0.023 | n/a | 0.412 | 78.343 | n/a | n/a | 0.025 | 2.201 | 0.026 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.069ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.021ms |
| 2916fa03b9c0f9b1000000000000040a | 80.737 | 2.852 | n/a | 0.000 | 0.072 | 0.711 | 1.445 | 0.022 | n/a | 0.134 | 75.467 | n/a | n/a | 0.034 | 2.924 | 0.036 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.223ms; driver.reader-basis.broadcast 0.069ms; driver.publication.readback 0.066ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.054ms |
| 2916fa03b9c0f9b10000000000000414 | 74.947 | 1.615 | n/a | 0.000 | 43.741 | 2.850 | 0.667 | 0.009 | n/a | 0.081 | 25.974 | n/a | n/a | 0.011 | 45.355 | 0.605 | 0.011 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.509ms; driver.expected-state.bind-receipt 1.063ms; driver.publication.readback 0.223ms; driver.publication.readback 0.159ms; driver.publication.readback 0.148ms |
| 2916fa03b9c0f9b10000000000000415 | 72.750 | 1.552 | n/a | 0.000 | 37.779 | 7.997 | 0.684 | 0.009 | n/a | 0.023 | 24.697 | n/a | n/a | 0.010 | 39.331 | 0.541 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.509ms; driver.expected-state.bind-receipt 1.063ms; driver.publication.readback 0.159ms; driver.publication.readback 0.148ms; driver.publication.readback 0.118ms |
| 2916fa03b9c0f9b10000000000000394 | 66.895 | 2.671 | n/a | 0.000 | 0.033 | 0.657 | 0.982 | 0.011 | n/a | 2.852 | 59.672 | n/a | n/a | 0.018 | 2.704 | 0.040 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.109ms; driver.reader-basis.broadcast 0.058ms; driver.publication.persist-deferred 0.035ms |
| 2916fa03b9c0f9b10000000000000560 | 63.245 | 3.128 | n/a | 0.000 | 0.070 | 4.698 | 0.838 | 0.009 | n/a | 0.188 | 54.282 | n/a | n/a | 0.033 | 3.198 | 0.051 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.582ms; driver.expected-state.bind-receipt 1.023ms; driver.publication.readback 0.106ms; driver.publication.readback 0.098ms; driver.publication.persist-deferred 0.065ms |
| 2916fa03b9c0f9b10000000000000395 | 55.159 | 2.530 | n/a | 0.000 | 0.053 | 1.767 | 0.783 | 0.009 | n/a | 0.277 | 49.715 | n/a | n/a | 0.025 | 2.584 | 0.047 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.109ms; driver.publication.persist-deferred 0.049ms; driver.publication.persist-deferred 0.035ms |
| 2916fa03b9c0f9b10000000000000411 | 54.993 | 2.107 | n/a | 0.000 | 5.313 | 2.638 | 0.981 | 0.013 | n/a | 0.829 | 43.101 | n/a | n/a | 0.010 | 7.420 | 0.135 | 0.010 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.063ms; driver.publication.readback 0.223ms; driver.publication.readback 0.148ms; driver.publication.readback 0.116ms; driver.reader-basis.broadcast 0.069ms |
| 2916fa03b9c0f9b10000000000000397 | 50.319 | 2.307 | n/a | 0.000 | 0.011 | 6.112 | 0.568 | 0.010 | n/a | 0.030 | 41.272 | n/a | n/a | 0.008 | 2.318 | 0.046 | 0.008 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.109ms; driver.publication.persist-deferred 0.049ms; driver.publication.persist-deferred 0.035ms |
| 2916fa03b9c0f9b10000000000000320 | 46.781 | 2.077 | n/a | 0.000 | 0.026 | 0.541 | 0.645 | 0.010 | n/a | 0.052 | 43.416 | n/a | n/a | 0.015 | 2.103 | 0.045 | 0.015 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2916fa03b9c0f9b10000000000000515 | 46.705 | 2.428 | n/a | 0.000 | 3.930 | 0.654 | 1.648 | 0.030 | n/a | 0.090 | 37.912 | n/a | n/a | 0.013 | 6.359 | 0.136 | 0.013 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.018ms |
| 2916fa03b9c0f9b100000000000003c7 | 46.476 | 3.417 | n/a | 0.000 | 0.271 | 0.755 | 0.761 | 0.013 | n/a | 0.059 | 41.160 | n/a | n/a | 0.039 | 3.688 | 0.079 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.093ms; driver.publication.readback 0.069ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.034ms; driver.publication.persist-deferred 0.027ms |
| 2916fa03b9c0f9b100000000000004ad | 43.538 | 1.369 | n/a | 0.000 | 2.940 | 4.992 | 3.642 | 0.012 | n/a | 0.019 | 30.536 | n/a | n/a | 0.028 | 4.309 | 0.099 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.467ms; driver.reader-basis.broadcast 0.115ms; driver.publication.readback 0.055ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.025ms |
| 2916fa03b9c0f9b10000000000000544 | 43.026 | 1.333 | n/a | 0.000 | 1.106 | 2.877 | 0.721 | 0.020 | n/a | 0.203 | 36.759 | n/a | n/a | 0.007 | 2.439 | 0.057 | 0.007 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.115ms; driver.publication.persist-deferred 0.042ms; driver.publication.persist-deferred 0.030ms |
| 2916fa03b9c0f9b100000000000003a7 | 41.138 | 1.935 | n/a | 0.000 | 4.727 | 2.623 | 3.080 | 0.009 | n/a | 0.031 | 28.707 | n/a | n/a | 0.027 | 6.661 | 0.162 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.337ms; driver.publication.readback 0.084ms; driver.publication.persist-deferred 0.070ms; driver.publication.readback 0.048ms; driver.publication.readback 0.045ms |
| 2916fa03b9c0f9b10000000000000495 | 40.914 | 3.766 | n/a | 0.000 | 18.479 | 3.388 | 1.471 | 0.098 | n/a | 1.967 | 11.706 | n/a | n/a | 0.039 | 22.245 | 0.544 | 0.039 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.143ms; driver.publication.persist-deferred 0.032ms; driver.publication.persist-deferred 0.031ms |
| 2916fa03b9c0f9b100000000000003a2 | 40.842 | 3.241 | n/a | 0.000 | 0.714 | 0.941 | 0.875 | 0.026 | n/a | 0.291 | 34.727 | n/a | n/a | 0.027 | 3.955 | 0.097 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.113ms; driver.publication.persist-deferred 0.060ms; driver.publication.readback 0.055ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.038ms |
| 2916fa03b9c0f9b10000000000000402 | 40.277 | 3.860 | n/a | 0.000 | 1.889 | 1.498 | 1.015 | 0.020 | n/a | 0.053 | 31.924 | n/a | n/a | 0.018 | 5.749 | 0.143 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.096ms; driver.publication.persist-deferred 0.072ms |
| 2916fa03b9c0f9b100000000000003f5 | 39.242 | 5.733 | n/a | 0.000 | 0.073 | 4.420 | 5.609 | 0.029 | n/a | 0.351 | 22.994 | n/a | n/a | 0.033 | 5.806 | 0.148 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.015ms |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 7.134 | 0.425 | 0.000 | 0.495 | 2.184 | n/a | 0.000 | 0.469 | 0.580 | 0.769 | 0.009 | n/a | 0.046 | 3.054 | n/a | n/a | 0.023 | 2.653 | 0.372 | 0.023 |
| p99 | 7.134 | 0.425 | 0.000 | 0.495 | 2.184 | n/a | 0.000 | 0.469 | 0.580 | 0.769 | 0.009 | n/a | 0.046 | 3.054 | n/a | n/a | 0.023 | 2.653 | 0.372 | 0.023 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b1000000000000098a | 7.134 | 2.184 | n/a | 0.000 | 0.469 | 0.580 | 0.769 | 0.009 | n/a | 0.046 | 3.054 | n/a | n/a | 0.023 | 2.653 | 0.372 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.018ms |

## P2 / tail / commit (2612 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.970 | 0.445 | 0.000 | 0.545 | 2.431 | n/a | 0.000 | 0.043 | 0.545 | 0.904 | 0.008 | n/a | 0.057 | 4.603 | n/a | n/a | 0.014 | 2.809 | 0.282 | 0.014 |
| p99 | 70.356 | 2.995 | 0.050 | 2.478 | 8.782 | n/a | 0.346 | 20.511 | 12.904 | 9.104 | 0.047 | n/a | 2.610 | 30.678 | n/a | n/a | 0.049 | 27.385 | 0.710 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b100000000000017e4 | 152.435 | 4.060 | n/a | 0.000 | 0.134 | 102.303 | 14.815 | 0.215 | n/a | 1.323 | 29.522 | n/a | n/a | 0.063 | 4.194 | 0.028 | 0.063 | node-14/thread-0/socket.wait-first-byte | client.encode 2.015ms; client.parse 1.486ms; driver.reader-basis.broadcast 1.374ms; driver.publication.capture 1.229ms; driver.plan-and-encode-command 1.172ms |
| 2916fa03b9c0f9b100000000000017e3 | 150.252 | 11.600 | n/a | 0.000 | 0.131 | 93.423 | 20.822 | 0.031 | n/a | 3.324 | 20.853 | n/a | n/a | 0.068 | 11.731 | 0.078 | 0.068 | node-14/thread-0/socket.wait-first-byte | client.encode 2.015ms; driver.reader-basis.broadcast 1.374ms; driver.plan-and-encode-command 1.172ms; driver.expected-state.bind-receipt 1.014ms; driver.publication.readback 0.494ms |
| 2916fa03b9c0f9b100000000000017e6 | 145.964 | 76.943 | n/a | 0.000 | 6.460 | 6.459 | 20.814 | 0.039 | n/a | 0.649 | 34.293 | n/a | n/a | 0.307 | 83.403 | 0.571 | 0.307 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | client.encode 2.015ms; driver.reader-basis.broadcast 1.924ms; client.parse 1.486ms; driver.publication.capture 1.229ms; driver.expected-state.bind-receipt 1.119ms |
| 2916fa03b9c0f9b10000000000001105 | 125.864 | 4.061 | n/a | 0.000 | 0.037 | 1.913 | 109.627 | 0.008 | n/a | 0.304 | 9.890 | n/a | n/a | 0.022 | 4.099 | 0.033 | 0.022 | gw-w/thread-45/commit.prepare-and-validate | client.encode 1.171ms; driver.reader-basis.broadcast 0.281ms |
| 2916fa03b9c0f9b10000000000001107 | 124.840 | 3.789 | n/a | 0.000 | 0.129 | 104.234 | 0.610 | 0.004 | n/a | 0.016 | 16.019 | n/a | n/a | 0.040 | 3.918 | 0.031 | 0.040 | node-14/thread-0/socket.wait-first-byte | client.encode 1.171ms; driver.reader-basis.broadcast 0.288ms; driver.reader-basis.broadcast 0.281ms; driver.publication.readback 0.146ms; driver.publication.readback 0.079ms |
| 2916fa03b9c0f9b10000000000001dab | 119.511 | 4.938 | 0.286 | 0.424 | 0.048 | 1.685 | 8.745 | 0.013 | n/a | 0.040 | 103.313 | n/a | n/a | 0.018 | 5.696 | 0.048 | 0.018 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.782ms; driver.reader-basis.broadcast 0.357ms |
| 2916fa03b9c0f9b10000000000001106 | 118.554 | 3.759 | n/a | 0.000 | 0.093 | 98.424 | 1.474 | 0.017 | n/a | 0.056 | 14.698 | n/a | n/a | 0.033 | 3.852 | 0.032 | 0.033 | node-14/thread-0/socket.wait-first-byte | client.encode 1.171ms; driver.reader-basis.broadcast 0.281ms; driver.publication.persist-deferred 0.018ms |
| 2916fa03b9c0f9b10000000000001108 | 109.033 | 5.186 | n/a | 0.000 | 0.960 | 90.725 | 2.099 | 0.030 | n/a | 0.795 | 9.215 | n/a | n/a | 0.021 | 6.146 | 0.056 | 0.021 | node-14/thread-0/socket.wait-first-byte | client.encode 1.171ms; driver.reader-basis.broadcast 0.281ms; driver.publication.readback 0.146ms; driver.publication.readback 0.079ms; driver.publication.persist-deferred 0.018ms |
| 2916fa03b9c0f9b100000000000019a1 | 108.665 | 3.970 | n/a | 0.000 | 78.476 | 4.803 | 1.539 | 0.021 | n/a | 1.867 | 17.963 | n/a | n/a | 0.026 | 82.445 | 0.759 | 0.026 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.648ms; driver.publication.readback 0.088ms; driver.publication.readback 0.064ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.051ms |
| 2916fa03b9c0f9b1000000000000199f | 107.813 | 2.329 | n/a | 0.000 | 0.069 | 0.522 | 2.002 | 0.021 | n/a | 0.054 | 102.797 | n/a | n/a | 0.019 | 2.398 | 0.022 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.648ms |
| 2916fa03b9c0f9b100000000000017e7 | 105.742 | 10.926 | n/a | 0.000 | 44.979 | 15.478 | 11.690 | 0.016 | n/a | 0.020 | 22.578 | n/a | n/a | 0.056 | 55.905 | 0.529 | 0.056 | node-14/thread-0/driver.queue.scheduler-late | client.encode 2.015ms; driver.reader-basis.broadcast 1.924ms; client.parse 1.486ms; driver.publication.capture 1.229ms; driver.expected-state.bind-receipt 1.119ms |
| 2916fa03b9c0f9b100000000000015f7 | 103.879 | 4.978 | n/a | 0.000 | 60.189 | 2.294 | 1.970 | 0.024 | n/a | 0.073 | 34.333 | n/a | n/a | 0.018 | 65.167 | 0.627 | 0.018 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.541ms; driver.publication.readback 1.355ms; driver.publication.readback 0.423ms; driver.reader-basis.broadcast 0.318ms; driver.publication.readback 0.159ms |
| 2916fa03b9c0f9b100000000000019af | 93.029 | 2.465 | n/a | 0.000 | 53.175 | 0.567 | 1.978 | 0.023 | n/a | 0.062 | 34.746 | n/a | n/a | 0.013 | 55.639 | 0.598 | 0.013 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.024ms; driver.expected-state.bind-receipt 1.170ms; driver.reader-basis.broadcast 0.493ms; driver.publication.readback 0.230ms; driver.publication.readback 0.187ms |
| 2916fa03b9c0f9b100000000000017e8 | 91.133 | 11.956 | n/a | 0.000 | 52.032 | 0.993 | 5.026 | 0.022 | n/a | 0.127 | 20.943 | n/a | n/a | 0.033 | 63.989 | 0.702 | 0.033 | node-14/thread-0/driver.queue.subject | client.encode 2.015ms; driver.reader-basis.broadcast 1.924ms; client.parse 1.486ms; driver.publication.capture 1.229ms; driver.expected-state.bind-receipt 1.119ms |
| 2916fa03b9c0f9b10000000000001845 | 89.641 | 7.650 | n/a | 0.000 | 0.089 | 0.655 | 68.894 | 0.012 | n/a | 0.021 | 12.288 | n/a | n/a | 0.031 | 7.739 | 0.086 | 0.031 | gw-w/thread-48/commit.prepare-and-validate | driver.reader-basis.broadcast 0.647ms; driver.publication.readback 0.119ms; driver.publication.readback 0.082ms; driver.publication.persist-deferred 0.053ms; driver.publication.persist-deferred 0.026ms |
| 2916fa03b9c0f9b100000000000019a0 | 88.838 | 3.030 | n/a | 0.000 | 0.037 | 0.537 | 1.193 | 0.013 | n/a | 0.051 | 83.955 | n/a | n/a | 0.022 | 3.066 | 0.035 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.648ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.021ms |
| 2916fa03b9c0f9b1000000000000110a | 85.589 | 18.398 | n/a | 0.000 | 1.298 | 49.971 | 0.575 | 0.003 | n/a | 0.006 | 15.331 | n/a | n/a | 0.007 | 19.696 | 0.230 | 0.007 | node-14/thread-0/socket.wait-first-byte | client.encode 1.171ms; driver.reader-basis.broadcast 0.288ms; driver.publication.readback 0.146ms; driver.publication.readback 0.079ms; driver.publication.persist-deferred 0.018ms |
| 2916fa03b9c0f9b100000000000019a8 | 83.231 | 4.807 | n/a | 0.000 | 49.216 | 1.550 | 3.064 | 0.022 | n/a | 0.364 | 24.191 | n/a | n/a | 0.017 | 54.023 | 0.649 | 0.017 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.170ms; driver.reader-basis.broadcast 0.493ms; driver.publication.readback 0.230ms; driver.publication.persist-deferred 0.094ms; driver.publication.readback 0.092ms |
| 2916fa03b9c0f9b100000000000017e9 | 80.997 | 19.793 | n/a | 0.000 | 17.158 | 12.510 | 7.261 | 0.013 | n/a | 0.053 | 24.192 | n/a | n/a | 0.017 | 36.951 | 0.456 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.924ms; client.parse 1.486ms; driver.publication.capture 1.229ms; driver.expected-state.bind-receipt 1.119ms; driver.publication.readback 0.227ms |
| 2916fa03b9c0f9b100000000000019a2 | 80.707 | 2.833 | n/a | 0.000 | 0.018 | 5.469 | 2.737 | 0.020 | n/a | 0.048 | 69.565 | n/a | n/a | 0.017 | 2.851 | 0.035 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.648ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.034ms; driver.publication.persist-deferred 0.021ms |

## P2 / tail / commit / 5-10 facts (1549 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.565 | 0.000 | 0.000 | 0.422 | 1.901 | n/a | 0.000 | 0.042 | 0.529 | 0.742 | 0.008 | n/a | 0.056 | 4.192 | n/a | n/a | 0.014 | 2.161 | 0.263 | 0.014 |
| p99 | 70.356 | 2.005 | 0.036 | 1.275 | 6.823 | n/a | 0.000 | 20.226 | 16.352 | 5.852 | 0.047 | n/a | 2.625 | 29.522 | n/a | n/a | 0.048 | 24.989 | 0.731 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2916fa03b9c0f9b100000000000017e4 | 152.435 | 4.060 | n/a | 0.000 | 0.134 | 102.303 | 14.815 | 0.215 | n/a | 1.323 | 29.522 | n/a | n/a | 0.063 | 4.194 | 0.028 | 0.063 | node-14/thread-0/socket.wait-first-byte | client.encode 2.015ms; client.parse 1.486ms; driver.reader-basis.broadcast 1.374ms; driver.publication.capture 1.229ms; driver.plan-and-encode-command 1.172ms |
| 2916fa03b9c0f9b100000000000017e3 | 150.252 | 11.600 | n/a | 0.000 | 0.131 | 93.423 | 20.822 | 0.031 | n/a | 3.324 | 20.853 | n/a | n/a | 0.068 | 11.731 | 0.078 | 0.068 | node-14/thread-0/socket.wait-first-byte | client.encode 2.015ms; driver.reader-basis.broadcast 1.374ms; driver.plan-and-encode-command 1.172ms; driver.expected-state.bind-receipt 1.014ms; driver.publication.readback 0.494ms |
| 2916fa03b9c0f9b10000000000001105 | 125.864 | 4.061 | n/a | 0.000 | 0.037 | 1.913 | 109.627 | 0.008 | n/a | 0.304 | 9.890 | n/a | n/a | 0.022 | 4.099 | 0.033 | 0.022 | gw-w/thread-45/commit.prepare-and-validate | client.encode 1.171ms; driver.reader-basis.broadcast 0.281ms |
| 2916fa03b9c0f9b10000000000001107 | 124.840 | 3.789 | n/a | 0.000 | 0.129 | 104.234 | 0.610 | 0.004 | n/a | 0.016 | 16.019 | n/a | n/a | 0.040 | 3.918 | 0.031 | 0.040 | node-14/thread-0/socket.wait-first-byte | client.encode 1.171ms; driver.reader-basis.broadcast 0.288ms; driver.reader-basis.broadcast 0.281ms; driver.publication.readback 0.146ms; driver.publication.readback 0.079ms |
| 2916fa03b9c0f9b10000000000001106 | 118.554 | 3.759 | n/a | 0.000 | 0.093 | 98.424 | 1.474 | 0.017 | n/a | 0.056 | 14.698 | n/a | n/a | 0.033 | 3.852 | 0.032 | 0.033 | node-14/thread-0/socket.wait-first-byte | client.encode 1.171ms; driver.reader-basis.broadcast 0.281ms; driver.publication.persist-deferred 0.018ms |
| 2916fa03b9c0f9b10000000000001108 | 109.033 | 5.186 | n/a | 0.000 | 0.960 | 90.725 | 2.099 | 0.030 | n/a | 0.795 | 9.215 | n/a | n/a | 0.021 | 6.146 | 0.056 | 0.021 | node-14/thread-0/socket.wait-first-byte | client.encode 1.171ms; driver.reader-basis.broadcast 0.281ms; driver.publication.readback 0.146ms; driver.publication.readback 0.079ms; driver.publication.persist-deferred 0.018ms |
| 2916fa03b9c0f9b100000000000019a1 | 108.665 | 3.970 | n/a | 0.000 | 78.476 | 4.803 | 1.539 | 0.021 | n/a | 1.867 | 17.963 | n/a | n/a | 0.026 | 82.445 | 0.759 | 0.026 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.648ms; driver.publication.readback 0.088ms; driver.publication.readback 0.064ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.051ms |
| 2916fa03b9c0f9b100000000000017e7 | 105.742 | 10.926 | n/a | 0.000 | 44.979 | 15.478 | 11.690 | 0.016 | n/a | 0.020 | 22.578 | n/a | n/a | 0.056 | 55.905 | 0.529 | 0.056 | node-14/thread-0/driver.queue.scheduler-late | client.encode 2.015ms; driver.reader-basis.broadcast 1.924ms; client.parse 1.486ms; driver.publication.capture 1.229ms; driver.expected-state.bind-receipt 1.119ms |
| 2916fa03b9c0f9b100000000000019af | 93.029 | 2.465 | n/a | 0.000 | 53.175 | 0.567 | 1.978 | 0.023 | n/a | 0.062 | 34.746 | n/a | n/a | 0.013 | 55.639 | 0.598 | 0.013 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.024ms; driver.expected-state.bind-receipt 1.170ms; driver.reader-basis.broadcast 0.493ms; driver.publication.readback 0.230ms; driver.publication.readback 0.187ms |
| 2916fa03b9c0f9b100000000000019a0 | 88.838 | 3.030 | n/a | 0.000 | 0.037 | 0.537 | 1.193 | 0.013 | n/a | 0.051 | 83.955 | n/a | n/a | 0.022 | 3.066 | 0.035 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.648ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.021ms |
| 2916fa03b9c0f9b1000000000000110a | 85.589 | 18.398 | n/a | 0.000 | 1.298 | 49.971 | 0.575 | 0.003 | n/a | 0.006 | 15.331 | n/a | n/a | 0.007 | 19.696 | 0.230 | 0.007 | node-14/thread-0/socket.wait-first-byte | client.encode 1.171ms; driver.reader-basis.broadcast 0.288ms; driver.publication.readback 0.146ms; driver.publication.readback 0.079ms; driver.publication.persist-deferred 0.018ms |
| 2916fa03b9c0f9b100000000000017e9 | 80.997 | 19.793 | n/a | 0.000 | 17.158 | 12.510 | 7.261 | 0.013 | n/a | 0.053 | 24.192 | n/a | n/a | 0.017 | 36.951 | 0.456 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.924ms; client.parse 1.486ms; driver.publication.capture 1.229ms; driver.expected-state.bind-receipt 1.119ms; driver.publication.readback 0.227ms |
| 2916fa03b9c0f9b100000000000017ea | 73.163 | 20.508 | n/a | 0.000 | 11.830 | 12.904 | 1.670 | 0.014 | n/a | 0.023 | 26.199 | n/a | n/a | 0.014 | 32.338 | 0.442 | 0.014 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | client.encode 2.015ms; driver.reader-basis.broadcast 1.924ms; client.parse 1.486ms; driver.publication.capture 1.229ms; driver.expected-state.bind-receipt 1.119ms |
| 2916fa03b9c0f9b100000000000011c1 | 73.046 | 1.303 | n/a | 0.000 | 67.848 | 0.360 | 0.505 | 0.007 | n/a | 0.020 | 2.990 | n/a | n/a | 0.012 | 69.152 | 0.947 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.438ms; driver.publication.readback 0.283ms; driver.reader-basis.broadcast 0.211ms; driver.publication.readback 0.120ms; driver.publication.readback 0.070ms |
| 2916fa03b9c0f9b100000000000011bf | 71.108 | 8.782 | n/a | 0.000 | 16.001 | 10.656 | 4.720 | 0.030 | n/a | 0.895 | 30.019 | n/a | n/a | 0.005 | 24.783 | 0.349 | 0.005 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.438ms; driver.publication.readback 0.283ms; driver.reader-basis.broadcast 0.211ms; driver.publication.readback 0.120ms; driver.publication.readback 0.070ms |
| 2916fa03b9c0f9b10000000000001847 | 70.356 | 3.380 | n/a | 0.000 | 0.078 | 54.093 | 1.102 | 0.010 | n/a | 0.077 | 11.588 | n/a | n/a | 0.028 | 3.458 | 0.049 | 0.028 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.647ms |
| 2916fa03b9c0f9b10000000000001848 | 69.741 | 4.134 | n/a | 0.000 | 0.093 | 45.320 | 1.296 | 0.008 | n/a | 0.019 | 18.833 | n/a | n/a | 0.038 | 4.227 | 0.061 | 0.038 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.089ms; driver.publication.readback 0.119ms; driver.publication.readback 0.082ms; driver.publication.persist-deferred 0.026ms; driver.publication.persist-deferred 0.019ms |
| 2916fa03b9c0f9b10000000000001d6b | 66.325 | 2.757 | n/a | 0.000 | 58.136 | 0.509 | 0.732 | 0.009 | n/a | 0.448 | 3.719 | n/a | n/a | 0.014 | 60.893 | 0.918 | 0.014 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.930ms; driver.publication.readback 0.117ms; driver.publication.readback 0.085ms; driver.publication.readback 0.065ms; driver.publication.persist-deferred 0.026ms |
| 2916fa03b9c0f9b1000000000000184b | 60.594 | 13.986 | n/a | 0.000 | 0.053 | 18.552 | 4.005 | 0.047 | n/a | 0.097 | 23.828 | n/a | n/a | 0.025 | 14.040 | 0.232 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.089ms; driver.expected-state.bind-receipt 1.066ms; driver.publication.readback 0.348ms; driver.reader-basis.broadcast 0.287ms; driver.publication.readback 0.172ms |
| 2916fa03b9c0f9b10000000000001d6a | 60.463 | 2.725 | n/a | 0.000 | 17.043 | 0.550 | 0.610 | 0.006 | n/a | 0.174 | 39.345 | n/a | n/a | 0.011 | 19.768 | 0.327 | 0.011 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.930ms; driver.publication.readback 0.117ms; driver.publication.readback 0.085ms; driver.publication.readback 0.072ms; driver.publication.readback 0.065ms |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.579 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.904 | 200.775 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.237 | 0.000 | 0.000 | 0.237 |
| p99 | 472.176 | n/a | n/a | n/a | 24.119 | n/a | 1.576 | 0.000 | 19.178 | 449.919 | 0.116 | n/a | 0.109 | 0.000 | n/a | n/a | 46.735 | 25.695 | 0.323 | 46.735 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 57919d49fbe7269e0000000000000002 | 472.176 | 2.552 | n/a | 0.000 | 0.000 | 19.178 | 449.919 | 0.116 | n/a | 0.109 | 0.000 | n/a | n/a | 0.302 | 2.552 | 0.005 | 0.302 | gw-r/thread-44/gateway.admitted-work | none observed |
| 5990af423b3f804a0000000000000005 | 208.063 | 0.000 | n/a | 0.000 | 0.000 | 0.904 | 206.783 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.311 | 0.000 | 0.000 | 0.311 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a0000000000000006 | 206.255 | 0.000 | n/a | 0.000 | 0.000 | 1.338 | 204.622 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.237 | 0.000 | 0.000 | 0.237 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a0000000000000007 | 204.037 | 0.000 | n/a | 0.000 | 0.000 | 0.881 | 202.657 | 0.005 | n/a | 0.077 | 0.000 | n/a | n/a | 0.416 | 0.000 | 0.000 | 0.416 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000ede | 201.611 | 0.000 | n/a | 0.000 | 0.000 | 0.451 | 200.944 | 0.009 | n/a | 0.100 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a0000000000000edd | 201.579 | 0.000 | n/a | 0.000 | 0.000 | 0.632 | 200.775 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a0000000000000edb | 201.574 | 0.000 | n/a | 0.000 | 0.000 | 0.561 | 200.771 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a0000000000000edc | 201.245 | 0.000 | n/a | 0.000 | 0.000 | 0.326 | 200.766 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000ee1 | 79.495 | 24.119 | n/a | 1.576 | 0.000 | 2.395 | 51.272 | 0.003 | n/a | 0.003 | 0.000 | n/a | n/a | 0.127 | 25.695 | 0.323 | 0.127 | gw-r/thread-40/gateway.admitted-work | none observed |
| 5990af423b3f804a0000000000000ee3 | 69.951 | 17.487 | n/a | 0.000 | 0.000 | 5.729 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 46.735 | 17.487 | 0.250 | 46.735 | node-14/thread-5/socket.wait-first-byte | none observed |
| 5990af423b3f804a0000000000000ee2 | 66.370 | 15.376 | n/a | 0.000 | 0.000 | 7.789 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.205 | 15.376 | 0.232 | 43.205 | node-14/thread-5/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 894.111 | n/a | n/a | n/a | 0.224 | n/a | 0.000 | 0.000 | 0.969 | 871.771 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.298 | 0.224 | 0.000 | 0.298 |
| p99 | 1008.204 | n/a | n/a | n/a | 21.035 | n/a | 0.000 | 0.000 | 1.399 | 1005.089 | 0.006 | n/a | 0.225 | 0.000 | n/a | n/a | 1.263 | 21.035 | 0.024 | 1.263 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 57919d49fbe7269e00000000000000a4 | 1008.204 | 0.224 | n/a | 0.000 | 0.000 | 1.399 | 1005.089 | 0.003 | n/a | 0.225 | 0.000 | n/a | n/a | 1.263 | 0.224 | 0.000 | 1.263 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e00000000000000a5 | 894.111 | 21.035 | n/a | 0.000 | 0.000 | 0.969 | 871.771 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.298 | 21.035 | 0.024 | 0.298 | gw-r/thread-61/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 478.889 | n/a | n/a | n/a | 2.420 | n/a | 0.000 | 0.000 | 0.649 | 475.070 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.093 | 2.420 | 0.006 | 0.093 |
| p99 | 1006.165 | n/a | n/a | n/a | 8.122 | n/a | 0.000 | 0.000 | 5.134 | 1004.142 | 0.018 | n/a | 0.107 | 0.000 | n/a | n/a | 22.738 | 8.122 | 0.310 | 22.738 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 57919d49fbe7269e00000000000000ba | 1006.165 | 0.124 | n/a | 0.000 | 0.000 | 0.701 | 1004.142 | 0.006 | n/a | 0.091 | 0.000 | n/a | n/a | 1.102 | 0.124 | 0.000 | 1.102 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e00000000000000d0 | 1005.265 | 0.259 | n/a | 0.000 | 0.000 | 3.205 | 1000.566 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 1.176 | 0.259 | 0.000 | 1.176 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e00000000000000b4 | 989.512 | 2.412 | n/a | 0.000 | 0.000 | 0.369 | 986.590 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.090 | 2.412 | 0.002 | 0.090 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e00000000000000bc | 954.080 | 2.275 | n/a | 0.000 | 0.000 | 0.589 | 951.082 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.093 | 2.275 | 0.002 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e00000000000000ae | 855.572 | 1.974 | n/a | 0.000 | 0.000 | 0.474 | 852.985 | 0.005 | n/a | 0.063 | 0.000 | n/a | n/a | 0.072 | 1.974 | 0.002 | 0.072 | gw-r/thread-43/journal/page | none observed |
| 57919d49fbe7269e00000000000000b3 | 827.532 | 5.228 | n/a | 0.000 | 0.000 | 0.572 | 821.600 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.084 | 5.228 | 0.006 | 0.084 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e00000000000000c9 | 756.155 | 4.691 | n/a | 0.000 | 0.000 | 0.776 | 750.438 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.202 | 4.691 | 0.006 | 0.202 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e00000000000000c1 | 729.893 | 2.238 | n/a | 0.000 | 0.000 | 1.711 | 725.800 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.072 | 2.238 | 0.003 | 0.072 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e00000000000000ab | 722.124 | 2.420 | n/a | 0.000 | 0.000 | 0.405 | 719.111 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.126 | 2.420 | 0.003 | 0.126 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e00000000000000c6 | 706.868 | 2.295 | n/a | 0.000 | 0.000 | 0.866 | 703.602 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.068 | 2.295 | 0.003 | 0.068 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e00000000000000a8 | 649.433 | 2.242 | n/a | 0.000 | 0.000 | 1.146 | 645.893 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.108 | 2.242 | 0.003 | 0.108 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e00000000000000c2 | 634.693 | 8.122 | n/a | 0.000 | 0.000 | 0.507 | 625.904 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.108 | 8.122 | 0.013 | 0.108 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e00000000000000cb | 511.240 | 2.464 | n/a | 0.000 | 0.000 | 0.633 | 508.025 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.076 | 2.464 | 0.005 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e00000000000000b9 | 489.936 | 5.479 | n/a | 0.000 | 0.000 | 0.837 | 483.412 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.151 | 5.479 | 0.011 | 0.151 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e00000000000000a7 | 478.889 | 3.015 | n/a | 0.000 | 0.000 | 0.568 | 475.070 | 0.018 | n/a | 0.094 | 0.000 | n/a | n/a | 0.125 | 3.015 | 0.006 | 0.125 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e00000000000000b6 | 441.727 | 2.486 | n/a | 0.000 | 0.000 | 1.986 | 437.105 | 0.008 | n/a | 0.073 | 0.000 | n/a | n/a | 0.070 | 2.486 | 0.006 | 0.070 | gw-r/thread-43/journal/page | none observed |
| 57919d49fbe7269e00000000000000c4 | 354.354 | 2.678 | n/a | 0.000 | 0.000 | 0.375 | 351.166 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.067 | 2.678 | 0.008 | 0.067 | gw-r/thread-43/journal/page | none observed |
| 57919d49fbe7269e00000000000000ad | 309.893 | 2.483 | n/a | 0.000 | 0.000 | 0.775 | 306.510 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.084 | 2.483 | 0.008 | 0.084 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e00000000000000aa | 295.778 | 2.886 | n/a | 0.000 | 0.000 | 0.497 | 292.158 | 0.005 | n/a | 0.076 | 0.000 | n/a | n/a | 0.156 | 2.886 | 0.010 | 0.156 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e00000000000000c5 | 289.854 | 1.831 | n/a | 0.000 | 0.000 | 0.558 | 287.330 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.063 | 1.831 | 0.006 | 0.063 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 335.898 | n/a | n/a | n/a | 4.514 | n/a | 0.655 | 0.000 | 0.589 | 329.201 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.122 | 4.757 | 0.014 | 0.122 |
| p99 | 1004.598 | n/a | n/a | n/a | 16.183 | n/a | 2.289 | 0.000 | 4.586 | 1001.016 | 0.059 | n/a | 0.094 | 0.000 | n/a | n/a | 49.503 | 17.381 | 0.646 | 49.503 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 57919d49fbe7269e0000000000000102 | 1004.598 | 0.141 | n/a | 0.000 | 0.000 | 2.227 | 1001.016 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 1.109 | 0.141 | 0.000 | 1.109 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e00000000000000d3 | 1002.628 | 0.119 | n/a | 0.000 | 0.000 | 0.501 | 1000.848 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 1.105 | 0.119 | 0.000 | 1.105 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e0000000000000107 | 1002.292 | 5.628 | n/a | 0.000 | 0.000 | 0.737 | 995.671 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.220 | 5.628 | 0.006 | 0.220 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e000000000000010f | 999.395 | 2.957 | n/a | 0.000 | 0.000 | 0.377 | 995.959 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.076 | 2.957 | 0.003 | 0.076 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e00000000000000da | 991.789 | 6.975 | n/a | 0.834 | 0.000 | 4.586 | 979.246 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.112 | 7.809 | 0.008 | 0.112 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e00000000000000db | 987.267 | 3.831 | n/a | 0.575 | 0.000 | 2.327 | 980.422 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.068 | 4.407 | 0.004 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e00000000000000e0 | 985.509 | 3.023 | n/a | 0.509 | 0.000 | 0.438 | 981.369 | 0.059 | n/a | 0.038 | 0.000 | n/a | n/a | 0.073 | 3.531 | 0.004 | 0.073 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e00000000000000d2 | 962.028 | 4.728 | n/a | 1.203 | 0.000 | 0.634 | 955.324 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.096 | 5.931 | 0.006 | 0.096 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e00000000000000e6 | 954.326 | 6.174 | n/a | 0.742 | 0.000 | 0.653 | 946.499 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.224 | 6.917 | 0.007 | 0.224 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e00000000000000df | 902.822 | 2.767 | n/a | 1.264 | 0.000 | 0.431 | 898.249 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.079 | 4.031 | 0.004 | 0.079 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e00000000000000ff | 851.116 | 4.757 | n/a | 0.000 | 0.000 | 0.581 | 845.604 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.116 | 4.757 | 0.006 | 0.116 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e00000000000000de | 730.785 | 6.329 | n/a | 0.761 | 0.000 | 1.811 | 721.650 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.189 | 7.090 | 0.010 | 0.189 | gw-r/thread-43/journal/page | none observed |
| 57919d49fbe7269e00000000000000e1 | 663.791 | 4.514 | n/a | 0.539 | 0.000 | 2.769 | 655.758 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.185 | 5.053 | 0.008 | 0.185 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e0000000000000104 | 637.139 | 2.824 | n/a | 0.000 | 0.000 | 1.168 | 633.008 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.065 | 2.824 | 0.004 | 0.065 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e00000000000000e9 | 573.245 | 10.308 | n/a | 1.183 | 0.000 | 0.716 | 560.886 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.118 | 11.491 | 0.020 | 0.118 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e00000000000000fd | 545.130 | 2.952 | n/a | 0.000 | 0.000 | 1.223 | 540.833 | 0.012 | n/a | 0.051 | 0.000 | n/a | n/a | 0.060 | 2.952 | 0.005 | 0.060 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e00000000000000ec | 518.432 | 2.818 | n/a | 0.600 | 0.000 | 0.445 | 514.446 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.089 | 3.418 | 0.007 | 0.089 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e000000000000010a | 466.474 | 12.049 | n/a | 1.398 | 0.000 | 0.485 | 452.315 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.178 | 13.447 | 0.029 | 0.178 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e00000000000000fc | 459.102 | 4.563 | n/a | 0.684 | 0.000 | 0.446 | 453.287 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.085 | 5.247 | 0.011 | 0.085 | gw-r/thread-43/journal/page | none observed |
| 57919d49fbe7269e00000000000000d7 | 442.170 | 6.079 | n/a | 1.666 | 0.000 | 0.660 | 433.586 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.121 | 7.745 | 0.018 | 0.121 | gw-r/thread-44/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 453.560 | n/a | n/a | n/a | 3.686 | n/a | 0.000 | 0.000 | 0.592 | 446.529 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.090 | 3.721 | 0.009 | 0.090 |
| p99 | 1004.765 | n/a | n/a | n/a | 10.690 | n/a | 1.202 | 0.000 | 9.556 | 1000.683 | 0.637 | n/a | 0.067 | 0.000 | n/a | n/a | 47.813 | 10.690 | 0.218 | 47.813 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 57919d49fbe7269e000000000000012c | 1004.765 | 6.590 | n/a | 0.000 | 0.000 | 0.304 | 997.642 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.195 | 6.590 | 0.007 | 0.195 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e0000000000000127 | 1003.348 | 0.259 | n/a | 0.000 | 0.000 | 1.173 | 1000.683 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 1.172 | 0.259 | 0.000 | 1.172 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e0000000000000142 | 1002.914 | 3.447 | n/a | 0.000 | 0.000 | 0.515 | 998.842 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.072 | 3.447 | 0.003 | 0.072 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e0000000000000139 | 998.301 | 4.973 | n/a | 0.000 | 0.000 | 1.672 | 991.556 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.073 | 4.973 | 0.005 | 0.073 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e000000000000011e | 988.580 | 5.816 | n/a | 0.000 | 0.000 | 1.444 | 981.129 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.161 | 5.816 | 0.006 | 0.161 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e000000000000012d | 986.939 | 3.400 | n/a | 0.000 | 0.000 | 0.695 | 982.740 | 0.006 | n/a | 0.022 | 0.000 | n/a | n/a | 0.076 | 3.400 | 0.003 | 0.076 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e0000000000000116 | 985.771 | 3.394 | n/a | 0.000 | 0.000 | 0.556 | 981.693 | 0.010 | n/a | 0.046 | 0.000 | n/a | n/a | 0.071 | 3.394 | 0.003 | 0.071 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e0000000000000149 | 878.761 | 2.637 | n/a | 0.000 | 0.000 | 0.559 | 875.433 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.088 | 2.637 | 0.003 | 0.088 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e0000000000000125 | 869.535 | 3.062 | n/a | 0.000 | 0.000 | 0.396 | 865.995 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.068 | 3.062 | 0.004 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e0000000000000135 | 840.106 | 3.657 | n/a | 0.000 | 0.000 | 9.556 | 826.773 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.076 | 3.657 | 0.004 | 0.076 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e000000000000012f | 779.486 | 5.255 | n/a | 0.791 | 0.000 | 1.183 | 772.161 | 0.006 | n/a | 0.019 | 0.000 | n/a | n/a | 0.071 | 6.046 | 0.008 | 0.071 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e000000000000013e | 772.442 | 1.707 | n/a | 0.000 | 0.000 | 0.566 | 770.057 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.066 | 1.707 | 0.002 | 0.066 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e0000000000000113 | 708.816 | 3.959 | n/a | 0.000 | 0.000 | 0.482 | 704.268 | 0.008 | n/a | 0.033 | 0.000 | n/a | n/a | 0.066 | 3.959 | 0.006 | 0.066 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e000000000000011f | 607.625 | 4.598 | n/a | 0.832 | 0.000 | 0.754 | 601.249 | 0.005 | n/a | 0.018 | 0.000 | n/a | n/a | 0.169 | 5.429 | 0.009 | 0.169 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e000000000000013b | 565.307 | 5.977 | n/a | 0.000 | 0.000 | 0.556 | 558.580 | 0.016 | n/a | 0.059 | 0.000 | n/a | n/a | 0.119 | 5.977 | 0.011 | 0.119 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e0000000000000136 | 552.353 | 4.717 | n/a | 0.000 | 0.000 | 0.590 | 546.935 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.083 | 4.717 | 0.009 | 0.083 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e0000000000000129 | 545.356 | 10.690 | n/a | 0.000 | 0.000 | 2.085 | 532.276 | 0.067 | n/a | 0.057 | 0.000 | n/a | n/a | 0.181 | 10.690 | 0.020 | 0.181 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e0000000000000110 | 542.892 | 2.619 | n/a | 0.000 | 0.000 | 1.443 | 538.704 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.103 | 2.619 | 0.005 | 0.103 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e000000000000011c | 529.216 | 3.694 | n/a | 1.202 | 0.000 | 0.454 | 523.686 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.144 | 4.896 | 0.009 | 0.144 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e0000000000000143 | 485.958 | 4.465 | n/a | 0.000 | 0.000 | 1.207 | 480.170 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.090 | 4.465 | 0.009 | 0.090 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / internal (45 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 385.584 | n/a | n/a | n/a | 3.394 | n/a | 0.000 | 0.000 | 0.560 | 382.602 | 0.008 | n/a | 0.031 | 0.000 | n/a | n/a | 0.150 | 3.394 | 0.010 | 0.150 |
| p99 | 1004.406 | n/a | n/a | n/a | 10.605 | n/a | 0.886 | 0.000 | 4.333 | 1000.977 | 0.023 | n/a | 0.077 | 0.000 | n/a | n/a | 47.701 | 10.605 | 0.565 | 47.701 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 57919d49fbe7269e0000000000000180 | 1004.406 | 0.206 | n/a | 0.000 | 0.000 | 2.003 | 1000.961 | 0.012 | n/a | 0.052 | 0.000 | n/a | n/a | 1.173 | 0.206 | 0.000 | 1.173 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e0000000000000175 | 1003.149 | 0.224 | n/a | 0.000 | 0.000 | 0.724 | 1000.977 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 1.154 | 0.224 | 0.000 | 1.154 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e0000000000000165 | 1002.641 | 0.120 | n/a | 0.000 | 0.000 | 0.881 | 1000.485 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 1.111 | 0.120 | 0.000 | 1.111 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e0000000000000188 | 1002.610 | 0.109 | n/a | 0.000 | 0.000 | 0.417 | 1000.886 | 0.016 | n/a | 0.077 | 0.000 | n/a | n/a | 1.105 | 0.109 | 0.000 | 1.105 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e0000000000000155 | 1001.238 | 3.729 | n/a | 0.000 | 0.000 | 0.560 | 996.796 | 0.005 | n/a | 0.019 | 0.000 | n/a | n/a | 0.129 | 3.729 | 0.004 | 0.129 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e000000000000016f | 997.881 | 2.895 | n/a | 0.000 | 0.000 | 0.534 | 994.235 | 0.016 | n/a | 0.062 | 0.000 | n/a | n/a | 0.139 | 2.895 | 0.003 | 0.139 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e0000000000000187 | 985.021 | 5.758 | n/a | 0.000 | 0.000 | 3.748 | 975.355 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.107 | 5.758 | 0.006 | 0.107 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e000000000000017b | 960.167 | 3.227 | n/a | 0.000 | 0.000 | 0.391 | 956.413 | 0.006 | n/a | 0.018 | 0.000 | n/a | n/a | 0.112 | 3.227 | 0.003 | 0.112 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e000000000000015b | 842.837 | 3.734 | n/a | 0.000 | 0.000 | 0.440 | 838.469 | 0.011 | n/a | 0.030 | 0.000 | n/a | n/a | 0.153 | 3.734 | 0.004 | 0.153 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e000000000000016e | 776.189 | 4.001 | n/a | 0.000 | 0.000 | 0.511 | 771.531 | 0.012 | n/a | 0.038 | 0.000 | n/a | n/a | 0.096 | 4.001 | 0.005 | 0.096 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e0000000000000186 | 758.816 | 7.214 | n/a | 0.000 | 0.000 | 2.222 | 749.037 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.287 | 7.214 | 0.010 | 0.287 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e000000000000018c | 754.184 | 5.471 | n/a | 0.886 | 0.000 | 4.333 | 743.259 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.204 | 6.357 | 0.008 | 0.204 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e0000000000000179 | 744.025 | 2.398 | n/a | 0.000 | 0.000 | 0.618 | 740.892 | 0.010 | n/a | 0.030 | 0.000 | n/a | n/a | 0.076 | 2.398 | 0.003 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e000000000000017e | 735.802 | 5.774 | n/a | 0.000 | 0.000 | 0.693 | 728.945 | 0.020 | n/a | 0.052 | 0.000 | n/a | n/a | 0.318 | 5.774 | 0.008 | 0.318 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e0000000000000172 | 621.741 | 1.944 | n/a | 0.000 | 0.000 | 0.393 | 619.302 | 0.008 | n/a | 0.029 | 0.000 | n/a | n/a | 0.065 | 1.944 | 0.003 | 0.065 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e0000000000000154 | 572.208 | 7.500 | n/a | 0.000 | 0.000 | 0.640 | 563.757 | 0.011 | n/a | 0.035 | 0.000 | n/a | n/a | 0.265 | 7.500 | 0.013 | 0.265 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e0000000000000156 | 563.006 | 2.212 | n/a | 0.000 | 0.000 | 0.395 | 560.245 | 0.019 | n/a | 0.037 | 0.000 | n/a | n/a | 0.098 | 2.212 | 0.004 | 0.098 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e0000000000000168 | 515.424 | 2.679 | n/a | 0.000 | 0.000 | 0.580 | 512.048 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.067 | 2.679 | 0.005 | 0.067 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e0000000000000150 | 452.520 | 2.287 | n/a | 0.000 | 0.000 | 0.618 | 449.486 | 0.009 | n/a | 0.031 | 0.000 | n/a | n/a | 0.090 | 2.287 | 0.005 | 0.090 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e000000000000014e | 442.179 | 4.856 | n/a | 0.000 | 0.000 | 0.667 | 436.461 | 0.008 | n/a | 0.027 | 0.000 | n/a | n/a | 0.160 | 4.856 | 0.011 | 0.160 | gw-r/thread-44/journal/page | none observed |

## P3 / L64 / internal (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 342.417 | n/a | n/a | n/a | 3.844 | n/a | 0.000 | 0.000 | 0.552 | 332.014 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.105 | 3.844 | 0.016 | 0.105 |
| p99 | 1005.968 | n/a | n/a | n/a | 11.071 | n/a | 0.758 | 0.000 | 4.004 | 1000.987 | 9.903 | n/a | 0.130 | 0.000 | n/a | n/a | 49.020 | 11.071 | 0.523 | 49.020 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 57919d49fbe7269e00000000000001a7 | 1005.968 | 0.170 | n/a | 0.000 | 0.000 | 4.004 | 1000.537 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 1.214 | 0.170 | 0.000 | 1.214 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e00000000000001c6 | 1004.441 | 3.014 | n/a | 0.000 | 0.000 | 0.643 | 1000.640 | 0.012 | n/a | 0.052 | 0.000 | n/a | n/a | 0.080 | 3.014 | 0.003 | 0.080 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e00000000000001c7 | 1003.271 | 0.188 | n/a | 0.000 | 0.000 | 0.896 | 1000.987 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 1.146 | 0.188 | 0.000 | 1.146 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e000000000000018d | 989.713 | 6.595 | n/a | 0.000 | 0.000 | 0.770 | 982.167 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.149 | 6.595 | 0.007 | 0.149 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e00000000000001aa | 987.807 | 2.657 | n/a | 0.758 | 0.000 | 0.497 | 983.752 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.115 | 3.415 | 0.003 | 0.115 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e00000000000001a9 | 986.001 | 3.198 | n/a | 0.000 | 0.000 | 0.881 | 981.789 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.089 | 3.198 | 0.003 | 0.089 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e00000000000001c5 | 957.822 | 6.535 | n/a | 0.000 | 0.000 | 2.281 | 948.847 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.127 | 6.535 | 0.007 | 0.127 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e000000000000019c | 851.699 | 3.133 | n/a | 0.000 | 0.000 | 0.496 | 847.979 | 0.004 | n/a | 0.012 | 0.000 | n/a | n/a | 0.075 | 3.133 | 0.004 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e00000000000001b8 | 838.162 | 2.777 | n/a | 0.000 | 0.000 | 0.604 | 834.676 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.071 | 2.777 | 0.003 | 0.071 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e00000000000001d2 | 738.440 | 4.384 | n/a | 0.000 | 0.000 | 0.454 | 733.499 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.075 | 4.384 | 0.006 | 0.075 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e000000000000019f | 700.505 | 4.886 | n/a | 0.000 | 0.000 | 0.635 | 694.870 | 0.007 | n/a | 0.019 | 0.000 | n/a | n/a | 0.087 | 4.886 | 0.007 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e000000000000019b | 660.834 | 2.360 | n/a | 0.000 | 0.000 | 0.501 | 657.854 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.085 | 2.360 | 0.004 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e00000000000001bc | 594.568 | 3.693 | n/a | 0.000 | 0.000 | 0.546 | 590.212 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.105 | 3.693 | 0.006 | 0.105 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e00000000000001d8 | 592.231 | 1.614 | n/a | 0.000 | 0.000 | 0.394 | 590.105 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.070 | 1.614 | 0.003 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e00000000000001d5 | 511.679 | 2.404 | n/a | 0.000 | 0.000 | 0.509 | 508.559 | 0.035 | n/a | 0.081 | 0.000 | n/a | n/a | 0.091 | 2.404 | 0.005 | 0.091 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e00000000000001a2 | 473.908 | 4.991 | n/a | 0.000 | 0.000 | 0.344 | 468.436 | 0.010 | n/a | 0.037 | 0.000 | n/a | n/a | 0.091 | 4.991 | 0.011 | 0.091 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e00000000000001b0 | 457.208 | 3.549 | n/a | 0.000 | 0.000 | 3.323 | 450.230 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.081 | 3.549 | 0.008 | 0.081 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e00000000000001d7 | 448.648 | 2.250 | n/a | 0.000 | 0.000 | 0.538 | 445.757 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.076 | 2.250 | 0.005 | 0.076 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e00000000000001a4 | 438.322 | 2.302 | n/a | 0.000 | 0.000 | 0.984 | 434.908 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.091 | 2.302 | 0.005 | 0.091 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e00000000000001c9 | 429.997 | 2.810 | n/a | 0.000 | 0.000 | 0.519 | 426.552 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.085 | 2.810 | 0.007 | 0.085 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 450.443 | n/a | n/a | n/a | 3.166 | n/a | 0.000 | 0.000 | 0.525 | 445.095 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.098 | 3.166 | 0.008 | 0.098 |
| p99 | 1003.020 | n/a | n/a | n/a | 10.653 | n/a | 0.829 | 0.000 | 3.511 | 1001.086 | 0.033 | n/a | 0.055 | 0.000 | n/a | n/a | 40.079 | 10.653 | 0.747 | 40.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 57919d49fbe7269e0000000000000219 | 1003.020 | 0.139 | n/a | 0.000 | 0.000 | 0.491 | 1001.086 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 1.248 | 0.139 | 0.000 | 1.248 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e00000000000001fb | 1000.511 | 5.518 | n/a | 0.000 | 0.000 | 0.721 | 994.111 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.124 | 5.518 | 0.006 | 0.124 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e0000000000000214 | 998.094 | 5.155 | n/a | 0.000 | 0.000 | 0.532 | 992.189 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.188 | 5.155 | 0.005 | 0.188 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e0000000000000201 | 996.652 | 3.000 | n/a | 0.000 | 0.000 | 0.623 | 992.917 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.090 | 3.000 | 0.003 | 0.090 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e000000000000021b | 996.292 | 4.971 | n/a | 0.000 | 0.000 | 0.525 | 990.519 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.241 | 4.971 | 0.005 | 0.241 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e00000000000001ed | 994.550 | 2.360 | n/a | 0.000 | 0.000 | 0.541 | 991.512 | 0.033 | n/a | 0.042 | 0.000 | n/a | n/a | 0.062 | 2.360 | 0.002 | 0.062 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e0000000000000218 | 983.643 | 3.016 | n/a | 0.000 | 0.000 | 0.422 | 980.078 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.083 | 3.016 | 0.003 | 0.083 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e000000000000020a | 943.177 | 2.423 | n/a | 0.000 | 0.000 | 0.364 | 940.291 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.080 | 2.423 | 0.003 | 0.080 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e00000000000001f7 | 882.043 | 5.063 | n/a | 0.000 | 0.000 | 0.591 | 876.231 | 0.014 | n/a | 0.046 | 0.000 | n/a | n/a | 0.099 | 5.063 | 0.006 | 0.099 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e0000000000000215 | 858.899 | 10.653 | n/a | 0.000 | 0.000 | 0.675 | 847.397 | 0.007 | n/a | 0.021 | 0.000 | n/a | n/a | 0.148 | 10.653 | 0.012 | 0.148 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e00000000000001ec | 842.138 | 2.387 | n/a | 0.000 | 0.000 | 0.415 | 839.146 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.128 | 2.387 | 0.003 | 0.128 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e0000000000000213 | 656.381 | 3.140 | n/a | 0.000 | 0.000 | 0.517 | 652.616 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.067 | 3.140 | 0.005 | 0.067 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e00000000000001f2 | 639.838 | 3.099 | n/a | 0.000 | 0.000 | 0.556 | 636.060 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.088 | 3.099 | 0.005 | 0.088 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e0000000000000202 | 636.997 | 5.368 | n/a | 0.000 | 0.000 | 1.157 | 630.265 | 0.009 | n/a | 0.031 | 0.000 | n/a | n/a | 0.166 | 5.368 | 0.008 | 0.166 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e00000000000001df | 627.815 | 3.401 | n/a | 0.000 | 0.000 | 0.392 | 623.894 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.067 | 3.401 | 0.005 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e0000000000000205 | 571.754 | 3.553 | n/a | 0.000 | 0.000 | 0.521 | 567.550 | 0.010 | n/a | 0.034 | 0.000 | n/a | n/a | 0.087 | 3.553 | 0.006 | 0.087 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e00000000000001f3 | 557.907 | 2.942 | n/a | 0.000 | 0.000 | 0.630 | 554.195 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.098 | 2.942 | 0.005 | 0.098 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e00000000000001e7 | 532.687 | 2.513 | n/a | 0.000 | 0.000 | 0.538 | 529.528 | 0.010 | n/a | 0.028 | 0.000 | n/a | n/a | 0.069 | 2.513 | 0.005 | 0.069 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e00000000000001e0 | 483.409 | 2.693 | n/a | 0.000 | 0.000 | 0.406 | 480.211 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.074 | 2.693 | 0.006 | 0.074 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e00000000000001e5 | 461.081 | 5.974 | n/a | 0.000 | 0.000 | 0.504 | 454.474 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.092 | 5.974 | 0.013 | 0.092 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / internal (770 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.600 | n/a | n/a | n/a | 3.245 | n/a | 0.000 | 0.000 | 0.232 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.433 | 3.245 | 0.268 | 7.433 |
| p99 | 249.309 | n/a | n/a | n/a | 14.166 | n/a | 0.960 | 0.000 | 1.182 | 246.281 | 0.010 | n/a | 0.033 | 0.000 | n/a | n/a | 47.668 | 14.215 | 0.811 | 47.668 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 57919d49fbe7269e0000000000000227 | 976.518 | 2.724 | n/a | 0.000 | 0.000 | 0.418 | 973.249 | 0.010 | n/a | 0.020 | 0.000 | n/a | n/a | 0.096 | 2.724 | 0.003 | 0.096 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e000000000000021c | 691.593 | 3.640 | n/a | 0.000 | 0.000 | 0.692 | 687.062 | 0.008 | n/a | 0.028 | 0.000 | n/a | n/a | 0.163 | 3.640 | 0.005 | 0.163 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e0000000000000228 | 683.463 | 2.250 | n/a | 0.000 | 0.000 | 0.450 | 680.651 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.074 | 2.250 | 0.003 | 0.074 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e0000000000000224 | 576.864 | 2.109 | n/a | 0.000 | 0.000 | 0.516 | 574.093 | 0.017 | n/a | 0.055 | 0.000 | n/a | n/a | 0.075 | 2.109 | 0.004 | 0.075 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e000000000000021f | 547.630 | 2.979 | n/a | 0.000 | 0.000 | 0.541 | 543.985 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 0.065 | 2.979 | 0.005 | 0.065 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e0000000000000226 | 443.791 | 2.216 | n/a | 0.000 | 0.000 | 2.489 | 438.988 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.077 | 2.216 | 0.005 | 0.077 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e000000000000021d | 297.187 | 2.355 | n/a | 0.000 | 0.000 | 1.182 | 293.481 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.112 | 2.355 | 0.008 | 0.112 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e0000000000000221 | 249.309 | 2.458 | n/a | 0.000 | 0.000 | 0.443 | 246.281 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.092 | 2.458 | 0.010 | 0.092 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e0000000000000222 | 210.106 | 4.026 | n/a | 0.000 | 0.000 | 0.427 | 205.515 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.109 | 4.026 | 0.019 | 0.109 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e00000000000004ea | 123.129 | 3.446 | n/a | 0.000 | 0.000 | 0.303 | 119.252 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.101 | 3.446 | 0.028 | 0.101 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e00000000000007a4 | 110.409 | 4.205 | n/a | 0.000 | 0.000 | 0.468 | 105.547 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.159 | 4.205 | 0.038 | 0.159 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e000000000000075f | 90.459 | 2.769 | n/a | 0.000 | 0.000 | 0.535 | 87.006 | 0.003 | n/a | 0.034 | 0.000 | n/a | n/a | 0.112 | 2.769 | 0.031 | 0.112 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e00000000000005f0 | 86.653 | 4.123 | n/a | 0.000 | 0.000 | 0.338 | 82.019 | 0.105 | n/a | 0.006 | 0.000 | n/a | n/a | 0.063 | 4.123 | 0.048 | 0.063 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e000000000000083e | 84.662 | 23.607 | n/a | 0.909 | 0.000 | 0.535 | 59.245 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.334 | 24.516 | 0.290 | 0.334 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e000000000000066e | 83.596 | 6.178 | n/a | 0.000 | 0.000 | 0.437 | 76.890 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.065 | 6.178 | 0.074 | 0.065 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e000000000000063b | 81.186 | 3.793 | n/a | 0.000 | 0.000 | 0.462 | 76.848 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.051 | 3.793 | 0.047 | 0.051 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e0000000000000312 | 76.886 | 2.678 | n/a | 0.000 | 0.000 | 1.243 | 72.865 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.063 | 2.678 | 0.035 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e000000000000082b | 75.484 | 4.678 | n/a | 0.000 | 0.000 | 0.316 | 70.301 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.181 | 4.678 | 0.062 | 0.181 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e00000000000005d0 | 74.294 | 4.705 | n/a | 0.000 | 0.000 | 0.616 | 68.822 | 0.011 | n/a | 0.038 | 0.000 | n/a | n/a | 0.103 | 4.705 | 0.063 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e000000000000077d | 74.120 | 7.935 | n/a | 0.760 | 0.000 | 0.321 | 65.004 | 0.001 | n/a | 0.010 | 0.000 | n/a | n/a | 0.088 | 8.695 | 0.117 | 0.088 | gw-r/thread-42/journal/page | none observed |

## P3 / tail / internal (2232 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.631 | n/a | n/a | n/a | 3.899 | n/a | 0.000 | 0.000 | 0.210 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.335 | 3.907 | 0.334 | 6.335 |
| p99 | 339.216 | n/a | n/a | n/a | 20.482 | n/a | 1.636 | 0.000 | 1.228 | 335.804 | 0.013 | n/a | 0.037 | 0.000 | n/a | n/a | 48.063 | 20.741 | 0.853 | 48.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 57919d49fbe7269e0000000000001ab0 | 1004.417 | 5.047 | n/a | 0.000 | 0.000 | 0.532 | 998.740 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.070 | 5.047 | 0.005 | 0.070 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e0000000000001ab4 | 1002.630 | 0.201 | n/a | 0.000 | 0.000 | 0.744 | 1000.549 | 0.004 | n/a | 0.011 | 0.000 | n/a | n/a | 1.120 | 0.201 | 0.000 | 1.120 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e0000000000001a68 | 1002.402 | 0.108 | n/a | 0.000 | 0.000 | 0.364 | 1000.775 | 0.013 | n/a | 0.055 | 0.000 | n/a | n/a | 1.087 | 0.108 | 0.000 | 1.087 | gw-r/thread-42/journal/page | none observed |
| 57919d49fbe7269e0000000000001a72 | 1000.559 | 2.775 | n/a | 0.000 | 0.000 | 0.562 | 997.119 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.076 | 2.775 | 0.003 | 0.076 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e0000000000001a8b | 998.059 | 4.438 | n/a | 0.000 | 0.000 | 0.655 | 992.834 | 0.002 | n/a | 0.027 | 0.000 | n/a | n/a | 0.103 | 4.438 | 0.004 | 0.103 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e0000000000001a67 | 992.271 | 3.086 | n/a | 0.000 | 0.000 | 0.320 | 988.771 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.066 | 3.086 | 0.003 | 0.066 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e0000000000001aac | 987.863 | 3.792 | n/a | 0.000 | 0.000 | 0.327 | 983.651 | 0.002 | n/a | 0.025 | 0.000 | n/a | n/a | 0.066 | 3.792 | 0.004 | 0.066 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e0000000000001a8d | 923.173 | 5.175 | n/a | 0.000 | 0.000 | 0.490 | 917.370 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.107 | 5.175 | 0.006 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e0000000000001a7c | 830.108 | 5.453 | n/a | 0.000 | 0.000 | 0.264 | 824.181 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.162 | 5.453 | 0.007 | 0.162 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e0000000000001a6d | 799.836 | 3.062 | n/a | 0.000 | 0.000 | 0.452 | 796.147 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.095 | 3.062 | 0.004 | 0.095 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e0000000000001a88 | 704.878 | 2.098 | n/a | 0.000 | 0.000 | 0.395 | 702.262 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.076 | 2.098 | 0.003 | 0.076 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e0000000000001a82 | 687.811 | 6.559 | n/a | 0.000 | 0.000 | 0.531 | 680.537 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 0.163 | 6.559 | 0.010 | 0.163 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e0000000000001aa6 | 657.009 | 3.074 | n/a | 0.000 | 0.000 | 2.492 | 651.336 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.068 | 3.074 | 0.005 | 0.068 | gw-r/thread-61/journal/page | none observed |
| 57919d49fbe7269e0000000000001a6a | 628.266 | 12.910 | n/a | 0.000 | 0.000 | 0.461 | 614.473 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.395 | 12.910 | 0.021 | 0.395 | gw-r/thread-46/journal/page | none observed |
| 57919d49fbe7269e0000000000001aad | 625.221 | 2.461 | n/a | 0.000 | 0.000 | 0.261 | 622.389 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.084 | 2.461 | 0.004 | 0.084 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e0000000000001a9b | 584.710 | 3.007 | n/a | 0.000 | 0.000 | 0.342 | 581.280 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.049 | 3.007 | 0.005 | 0.049 | gw-r/thread-40/journal/page | none observed |
| 57919d49fbe7269e0000000000001a73 | 462.599 | 2.603 | n/a | 0.000 | 0.000 | 0.618 | 459.281 | 0.004 | n/a | 0.016 | 0.000 | n/a | n/a | 0.078 | 2.603 | 0.006 | 0.078 | gw-r/thread-47/journal/page | none observed |
| 57919d49fbe7269e0000000000001aa8 | 456.988 | 2.287 | n/a | 0.000 | 0.000 | 0.334 | 454.287 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.055 | 2.287 | 0.005 | 0.055 | gw-r/thread-45/journal/page | none observed |
| 57919d49fbe7269e0000000000001aa7 | 441.303 | 2.188 | n/a | 0.000 | 0.000 | 0.373 | 438.647 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.071 | 2.188 | 0.005 | 0.071 | gw-r/thread-44/journal/page | none observed |
| 57919d49fbe7269e0000000000001a8f | 430.735 | 8.540 | n/a | 1.172 | 0.000 | 0.635 | 419.835 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.521 | 9.712 | 0.023 | 0.521 | gw-r/thread-42/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.964 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 200.783 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 |
| p99 | 210.976 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.146 | 208.055 | 12.876 | n/a | 2.454 | 0.000 | n/a | n/a | 49.275 | 0.000 | 0.000 | 49.275 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5990af423b3f804a000000000000004a | 210.976 | 0.000 | n/a | 0.000 | 0.000 | 3.854 | 206.911 | 0.060 | n/a | 0.048 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000009 | 210.364 | 0.000 | n/a | 0.000 | 0.000 | 2.309 | 194.727 | 12.876 | n/a | 0.088 | 0.000 | n/a | n/a | 0.364 | 0.000 | 0.000 | 0.364 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a000000000000001a | 209.210 | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 208.055 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a000000000000003c | 207.970 | 0.000 | n/a | 0.000 | 0.000 | 2.379 | 205.335 | 0.011 | n/a | 0.110 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a000000000000000b | 207.457 | 0.000 | n/a | 0.000 | 0.000 | 0.478 | 206.751 | 0.008 | n/a | 0.107 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a0000000000000029 | 206.812 | 0.000 | n/a | 0.000 | 0.000 | 1.038 | 205.552 | 0.008 | n/a | 0.074 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a000000000000003b | 205.613 | 0.000 | n/a | 0.000 | 0.000 | 4.146 | 201.272 | 0.005 | n/a | 0.072 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a000000000000002c | 205.276 | 0.000 | n/a | 0.000 | 0.000 | 3.727 | 201.280 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a0000000000000050 | 205.260 | 0.000 | n/a | 0.000 | 0.000 | 0.689 | 204.350 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000051 | 205.161 | 0.000 | n/a | 0.000 | 0.000 | 0.435 | 204.545 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a0000000000000010 | 205.133 | 0.000 | n/a | 0.000 | 0.000 | 4.127 | 200.758 | 0.005 | n/a | 0.078 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a000000000000002b | 204.789 | 0.000 | n/a | 0.000 | 0.000 | 0.375 | 204.236 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000014 | 204.551 | 0.000 | n/a | 0.000 | 0.000 | 3.403 | 200.956 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000048 | 204.371 | 0.000 | n/a | 0.000 | 0.000 | 1.774 | 202.330 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000012 | 204.313 | 0.000 | n/a | 0.000 | 0.000 | 0.654 | 203.410 | 0.005 | n/a | 0.063 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-43/journal/page | none observed |
| 5990af423b3f804a0000000000000018 | 204.254 | 0.000 | n/a | 0.000 | 0.000 | 0.315 | 203.774 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a000000000000000a | 204.016 | 0.000 | n/a | 0.000 | 0.000 | 3.117 | 200.566 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.270 | 0.000 | 0.000 | 0.270 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a0000000000000059 | 203.795 | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 202.816 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-43/journal/page | none observed |
| 5990af423b3f804a0000000000000033 | 203.542 | 0.000 | n/a | 0.000 | 0.000 | 0.469 | 200.506 | 0.005 | n/a | 2.454 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000002e | 203.333 | 0.000 | n/a | 0.000 | 0.000 | 1.631 | 201.439 | 0.005 | n/a | 0.071 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.475 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.620 | 200.734 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 |
| p99 | 208.233 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.820 | 207.332 | 4.301 | n/a | 2.454 | 0.000 | n/a | n/a | 49.665 | 0.000 | 0.000 | 49.665 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5990af423b3f804a0000000000000078 | 208.233 | 0.000 | n/a | 0.000 | 0.000 | 0.664 | 207.332 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a00000000000000b7 | 205.860 | 0.000 | n/a | 0.000 | 0.000 | 1.820 | 203.886 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000063 | 205.615 | 0.000 | n/a | 0.000 | 0.000 | 0.917 | 204.365 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.304 | 0.000 | 0.000 | 0.304 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000086 | 205.551 | 0.000 | n/a | 0.000 | 0.000 | 0.931 | 204.345 | 0.005 | n/a | 0.076 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a00000000000000a1 | 205.411 | 0.000 | n/a | 0.000 | 0.000 | 0.700 | 204.542 | 0.005 | n/a | 0.066 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a00000000000000b6 | 205.055 | 0.000 | n/a | 0.000 | 0.000 | 0.605 | 204.280 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000006f | 204.927 | 0.000 | n/a | 0.000 | 0.000 | 0.745 | 203.995 | 0.004 | n/a | 0.059 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-43/journal/page | none observed |
| 5990af423b3f804a00000000000000c1 | 204.734 | 0.000 | n/a | 0.000 | 0.000 | 0.663 | 203.826 | 0.009 | n/a | 0.045 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a000000000000005c | 204.711 | 0.000 | n/a | 0.000 | 0.000 | 0.432 | 204.109 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a00000000000000a5 | 204.600 | 0.000 | n/a | 0.000 | 0.000 | 0.385 | 202.366 | 0.003 | n/a | 1.740 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a0000000000000071 | 204.576 | 0.000 | n/a | 0.000 | 0.000 | 0.549 | 203.807 | 0.006 | n/a | 0.111 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a000000000000005d | 204.400 | 0.000 | n/a | 0.000 | 0.000 | 0.450 | 203.837 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a00000000000000b9 | 204.389 | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 203.636 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a0000000000000072 | 204.193 | 0.000 | n/a | 0.000 | 0.000 | 0.565 | 203.462 | 0.004 | n/a | 0.053 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a000000000000007a | 203.941 | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 203.156 | 0.004 | n/a | 0.069 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000007f | 203.082 | 0.000 | n/a | 0.000 | 0.000 | 0.521 | 202.410 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a00000000000000c3 | 203.010 | 0.000 | n/a | 0.000 | 0.000 | 0.426 | 202.480 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a000000000000006c | 202.632 | 0.000 | n/a | 0.000 | 0.000 | 1.731 | 200.735 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a0000000000000074 | 202.503 | 0.000 | n/a | 0.000 | 0.000 | 0.892 | 201.337 | 0.004 | n/a | 0.072 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000061 | 202.477 | 0.000 | n/a | 0.000 | 0.000 | 0.859 | 201.242 | 0.011 | n/a | 0.119 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-r/thread-46/journal/page | none observed |

## P3 / L4 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.384 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 200.629 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 |
| p99 | 217.906 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.820 | 217.255 | 6.564 | n/a | 3.407 | 0.000 | n/a | n/a | 0.313 | 0.000 | 0.000 | 0.313 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5990af423b3f804a000000000000010b | 217.906 | 0.000 | n/a | 0.000 | 0.000 | 0.495 | 217.255 | 0.009 | n/a | 0.038 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a000000000000010c | 207.089 | 0.000 | n/a | 0.000 | 0.000 | 5.820 | 200.948 | 0.011 | n/a | 0.061 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a00000000000000f5 | 206.565 | 0.000 | n/a | 0.000 | 0.000 | 0.813 | 205.402 | 0.012 | n/a | 0.059 | 0.000 | n/a | n/a | 0.280 | 0.000 | 0.000 | 0.280 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a00000000000000de | 205.813 | 0.000 | n/a | 0.000 | 0.000 | 0.623 | 205.029 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a00000000000000e3 | 205.783 | 0.000 | n/a | 0.000 | 0.000 | 0.716 | 204.829 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a00000000000000ca | 205.427 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 204.631 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000126 | 205.055 | 0.000 | n/a | 0.000 | 0.000 | 0.668 | 204.223 | 0.006 | n/a | 0.017 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a00000000000000e7 | 203.374 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 202.453 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a00000000000000f4 | 203.101 | 0.000 | n/a | 0.000 | 0.000 | 2.094 | 197.494 | 0.006 | n/a | 3.407 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a00000000000000c7 | 202.998 | 0.000 | n/a | 0.000 | 0.000 | 1.936 | 200.867 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a000000000000012d | 202.975 | 0.000 | n/a | 0.000 | 0.000 | 0.526 | 202.209 | 0.014 | n/a | 0.055 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a00000000000000f7 | 202.929 | 0.000 | n/a | 0.000 | 0.000 | 1.214 | 201.360 | 0.025 | n/a | 0.154 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a0000000000000122 | 202.776 | 0.000 | n/a | 0.000 | 0.000 | 1.166 | 201.404 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a00000000000000f9 | 202.719 | 0.000 | n/a | 0.000 | 0.000 | 2.126 | 200.414 | 0.008 | n/a | 0.029 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a0000000000000125 | 202.660 | 0.000 | n/a | 0.000 | 0.000 | 1.161 | 201.338 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a00000000000000df | 202.657 | 0.000 | n/a | 0.000 | 0.000 | 0.759 | 201.686 | 0.011 | n/a | 0.114 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a000000000000010d | 202.541 | 0.000 | n/a | 0.000 | 0.000 | 0.872 | 201.398 | 0.015 | n/a | 0.107 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a00000000000000fe | 202.516 | 0.000 | n/a | 0.000 | 0.000 | 0.506 | 201.858 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a00000000000000c9 | 202.429 | 0.000 | n/a | 0.000 | 0.000 | 1.421 | 200.853 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-43/journal/page | none observed |
| 5990af423b3f804a0000000000000117 | 202.356 | 0.000 | n/a | 0.000 | 0.000 | 0.642 | 201.503 | 0.015 | n/a | 0.116 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.551 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 200.713 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 |
| p99 | 206.407 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.148 | 205.724 | 3.440 | n/a | 0.214 | 0.000 | n/a | n/a | 50.243 | 0.000 | 0.000 | 50.243 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5990af423b3f804a0000000000000142 | 206.407 | 0.000 | n/a | 0.000 | 0.000 | 0.488 | 205.724 | 0.011 | n/a | 0.037 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a000000000000018f | 205.513 | 0.000 | n/a | 0.000 | 0.000 | 3.951 | 201.271 | 0.022 | n/a | 0.102 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a000000000000018a | 205.409 | 0.000 | n/a | 0.000 | 0.000 | 0.465 | 204.635 | 0.020 | n/a | 0.144 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a000000000000018e | 204.950 | 0.000 | n/a | 0.000 | 0.000 | 4.148 | 200.624 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a000000000000015e | 204.604 | 0.000 | n/a | 0.000 | 0.000 | 0.691 | 203.652 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000013b | 204.418 | 0.000 | n/a | 0.000 | 0.000 | 3.532 | 200.717 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000018b | 203.476 | 0.000 | n/a | 0.000 | 0.000 | 0.765 | 202.524 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000018c | 202.664 | 0.000 | n/a | 0.000 | 0.000 | 1.100 | 201.228 | 0.012 | n/a | 0.079 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a000000000000017e | 202.660 | 0.000 | n/a | 0.000 | 0.000 | 1.213 | 201.059 | 0.013 | n/a | 0.068 | 0.000 | n/a | n/a | 0.306 | 0.000 | 0.000 | 0.306 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000156 | 202.471 | 0.000 | n/a | 0.000 | 0.000 | 1.172 | 201.056 | 0.009 | n/a | 0.116 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a000000000000017d | 202.454 | 0.000 | n/a | 0.000 | 0.000 | 0.855 | 201.337 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a0000000000000155 | 202.365 | 0.000 | n/a | 0.000 | 0.000 | 1.031 | 200.971 | 0.013 | n/a | 0.065 | 0.000 | n/a | n/a | 0.284 | 0.000 | 0.000 | 0.284 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000195 | 202.276 | 0.000 | n/a | 0.000 | 0.000 | 0.504 | 201.560 | 0.014 | n/a | 0.093 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a0000000000000196 | 202.271 | 0.000 | n/a | 0.000 | 0.000 | 0.811 | 201.226 | 0.015 | n/a | 0.070 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000184 | 202.208 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 201.166 | 0.016 | n/a | 0.089 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000191 | 202.158 | 0.000 | n/a | 0.000 | 0.000 | 0.516 | 201.277 | 0.019 | n/a | 0.214 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a000000000000015a | 202.156 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 201.118 | 0.014 | n/a | 0.067 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000016f | 202.147 | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 201.261 | 0.067 | n/a | 0.080 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000167 | 202.126 | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 201.052 | 0.013 | n/a | 0.072 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a0000000000000190 | 202.086 | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 201.169 | 0.013 | n/a | 0.098 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / read (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.373 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.629 | 200.557 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 |
| p99 | 205.730 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.352 | 204.213 | 4.838 | n/a | 0.102 | 0.000 | n/a | n/a | 0.286 | 0.000 | 0.000 | 0.286 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5990af423b3f804a00000000000001ea | 214.251 | 0.000 | n/a | 0.000 | 0.000 | 9.857 | 204.213 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a00000000000001ba | 205.730 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 204.867 | 0.048 | n/a | 0.048 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a00000000000001e9 | 205.505 | 0.000 | n/a | 0.000 | 0.000 | 4.352 | 200.946 | 0.019 | n/a | 0.057 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a000000000000019b | 204.967 | 0.000 | n/a | 0.000 | 0.000 | 0.629 | 204.142 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a00000000000001aa | 204.886 | 0.000 | n/a | 0.000 | 0.000 | 0.671 | 204.004 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a00000000000001cd | 204.703 | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 203.925 | 0.008 | n/a | 0.027 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a00000000000001ff | 204.682 | 0.000 | n/a | 0.000 | 0.000 | 0.469 | 204.081 | 0.012 | n/a | 0.023 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a00000000000001b8 | 204.607 | 0.000 | n/a | 0.000 | 0.000 | 0.688 | 203.709 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a00000000000001be | 204.596 | 0.000 | n/a | 0.000 | 0.000 | 1.036 | 203.392 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a00000000000001d1 | 204.398 | 0.000 | n/a | 0.000 | 0.000 | 0.495 | 203.766 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a00000000000001ca | 204.379 | 0.000 | n/a | 0.000 | 0.000 | 0.797 | 203.367 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a00000000000001ad | 204.296 | 0.000 | n/a | 0.000 | 0.000 | 1.655 | 202.198 | 0.018 | n/a | 0.141 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a00000000000001a0 | 203.844 | 0.000 | n/a | 0.000 | 0.000 | 2.849 | 200.833 | 0.015 | n/a | 0.058 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a00000000000001c0 | 203.681 | 0.000 | n/a | 0.000 | 0.000 | 0.653 | 202.808 | 0.014 | n/a | 0.065 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000020c | 202.775 | 0.000 | n/a | 0.000 | 0.000 | 1.687 | 200.906 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a00000000000001ef | 202.519 | 0.000 | n/a | 0.000 | 0.000 | 0.540 | 201.842 | 0.008 | n/a | 0.029 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a00000000000001e8 | 202.515 | 0.000 | n/a | 0.000 | 0.000 | 0.995 | 201.197 | 0.010 | n/a | 0.102 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a00000000000001a9 | 202.503 | 0.000 | n/a | 0.000 | 0.000 | 0.541 | 201.779 | 0.013 | n/a | 0.055 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a00000000000001c6 | 202.319 | 0.000 | n/a | 0.000 | 0.000 | 1.145 | 200.951 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a00000000000001c1 | 202.230 | 0.000 | n/a | 0.000 | 0.000 | 0.898 | 201.144 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-40/journal/page | none observed |

## P3 / L256 / read (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.346 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.600 | 200.552 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 |
| p99 | 204.248 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.015 | 203.656 | 6.228 | n/a | 0.106 | 0.000 | n/a | n/a | 0.281 | 0.000 | 0.000 | 0.281 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5990af423b3f804a000000000000020f | 204.800 | 0.000 | n/a | 0.000 | 0.000 | 0.409 | 204.240 | 0.014 | n/a | 0.046 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a0000000000000216 | 204.248 | 0.000 | n/a | 0.000 | 0.000 | 0.434 | 203.656 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000021f | 203.463 | 0.000 | n/a | 0.000 | 0.000 | 1.217 | 202.069 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000025b | 203.419 | 0.000 | n/a | 0.000 | 0.000 | 2.015 | 201.200 | 0.009 | n/a | 0.106 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000213 | 202.395 | 0.000 | n/a | 0.000 | 0.000 | 0.603 | 201.591 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a000000000000025c | 202.370 | 0.000 | n/a | 0.000 | 0.000 | 1.232 | 200.714 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.364 | 0.000 | 0.000 | 0.364 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a0000000000000241 | 202.338 | 0.000 | n/a | 0.000 | 0.000 | 1.068 | 200.915 | 0.005 | n/a | 0.086 | 0.000 | n/a | n/a | 0.265 | 0.000 | 0.000 | 0.265 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000229 | 202.317 | 0.000 | n/a | 0.000 | 0.000 | 0.880 | 201.200 | 0.007 | n/a | 0.082 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a0000000000000242 | 202.164 | 0.000 | n/a | 0.000 | 0.000 | 0.800 | 201.073 | 0.009 | n/a | 0.099 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a0000000000000250 | 202.041 | 0.000 | n/a | 0.000 | 0.000 | 0.767 | 200.977 | 0.010 | n/a | 0.087 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000264 | 202.006 | 0.000 | n/a | 0.000 | 0.000 | 0.915 | 200.800 | 0.005 | n/a | 0.062 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a000000000000023c | 201.997 | 0.000 | n/a | 0.000 | 0.000 | 0.684 | 201.118 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000023d | 201.959 | 0.000 | n/a | 0.000 | 0.000 | 0.975 | 200.783 | 0.005 | n/a | 0.071 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000240 | 201.921 | 0.000 | n/a | 0.000 | 0.000 | 0.603 | 200.978 | 0.009 | n/a | 0.088 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000026f | 201.907 | 0.000 | n/a | 0.000 | 0.000 | 0.421 | 201.272 | 0.020 | n/a | 0.094 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000024c | 201.903 | 0.000 | n/a | 0.000 | 0.000 | 1.053 | 200.520 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.281 | 0.000 | 0.000 | 0.281 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a000000000000025d | 201.878 | 0.000 | n/a | 0.000 | 0.000 | 1.225 | 200.444 | 0.005 | n/a | 0.019 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a0000000000000255 | 201.861 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 200.863 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a0000000000000265 | 201.837 | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 201.065 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000024b | 201.810 | 0.000 | n/a | 0.000 | 0.000 | 0.606 | 200.956 | 0.046 | n/a | 0.052 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-42/journal/page | none observed |

## P3 / L1024 / read (73 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 67.931 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.440 | 67.034 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 |
| p99 | 207.242 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.965 | 204.019 | 27.509 | n/a | 0.091 | 0.000 | n/a | n/a | 51.251 | 0.000 | 0.000 | 51.251 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5990af423b3f804a0000000000000290 | 207.242 | 0.000 | n/a | 0.000 | 0.000 | 2.965 | 204.019 | 0.012 | n/a | 0.046 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a000000000000029a | 202.024 | 0.000 | n/a | 0.000 | 0.000 | 0.877 | 200.817 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a000000000000028d | 201.872 | 0.000 | n/a | 0.000 | 0.000 | 0.562 | 201.167 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a0000000000000288 | 201.769 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 200.773 | 0.005 | n/a | 0.068 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000028a | 201.650 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 200.771 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000291 | 201.416 | 0.000 | n/a | 0.000 | 0.000 | 0.656 | 200.511 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a0000000000000282 | 201.364 | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 200.404 | 0.003 | n/a | 0.030 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a0000000000000285 | 201.313 | 0.000 | n/a | 0.000 | 0.000 | 0.574 | 200.522 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000287 | 201.313 | 0.000 | n/a | 0.000 | 0.000 | 0.650 | 200.436 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a0000000000000296 | 201.305 | 0.000 | n/a | 0.000 | 0.000 | 0.617 | 200.488 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a0000000000000298 | 201.249 | 0.000 | n/a | 0.000 | 0.000 | 0.368 | 200.686 | 0.023 | n/a | 0.083 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000294 | 201.242 | 0.000 | n/a | 0.000 | 0.000 | 0.435 | 200.657 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000293 | 201.180 | 0.000 | n/a | 0.000 | 0.000 | 0.290 | 200.694 | 0.008 | n/a | 0.091 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000299 | 201.106 | 0.000 | n/a | 0.000 | 0.000 | 0.392 | 200.565 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000295 | 201.084 | 0.000 | n/a | 0.000 | 0.000 | 0.395 | 200.544 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a0000000000000283 | 201.022 | 0.000 | n/a | 0.000 | 0.000 | 0.347 | 200.523 | 0.004 | n/a | 0.061 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000028e | 201.017 | 0.000 | n/a | 0.000 | 0.000 | 0.506 | 200.375 | 0.011 | n/a | 0.019 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000281 | 200.931 | 0.000 | n/a | 0.000 | 0.000 | 0.333 | 200.455 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a000000000000028c | 182.901 | 0.000 | n/a | 0.000 | 0.000 | 0.521 | 182.194 | 0.025 | n/a | 0.019 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a000000000000028f | 129.458 | 0.000 | n/a | 0.000 | 0.000 | 0.433 | 128.882 | 0.009 | n/a | 0.025 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-44/journal/page | none observed |

## P3 / tail / read (225 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 84.690 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.457 | 84.256 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 |
| p99 | 202.809 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.352 | 201.639 | 1.488 | n/a | 0.094 | 0.000 | n/a | n/a | 56.889 | 0.000 | 0.000 | 56.889 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5990af423b3f804a0000000000000e97 | 232.833 | 0.000 | n/a | 0.000 | 0.000 | 31.898 | 200.724 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a0000000000000eb3 | 204.611 | 0.000 | n/a | 0.000 | 0.000 | 3.374 | 201.090 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a0000000000000e6c | 202.809 | 0.000 | n/a | 0.000 | 0.000 | 0.555 | 202.012 | 0.021 | n/a | 0.060 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a0000000000000ea6 | 202.677 | 0.000 | n/a | 0.000 | 0.000 | 0.569 | 200.722 | 1.198 | n/a | 0.086 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000e6d | 202.305 | 0.000 | n/a | 0.000 | 0.000 | 1.229 | 200.908 | 0.004 | n/a | 0.058 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 5990af423b3f804a0000000000000e76 | 202.267 | 0.000 | n/a | 0.000 | 0.000 | 0.959 | 201.048 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a0000000000000e7f | 202.243 | 0.000 | n/a | 0.000 | 0.000 | 0.358 | 201.726 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000e9d | 202.206 | 0.000 | n/a | 0.000 | 0.000 | 1.039 | 200.920 | 0.003 | n/a | 0.047 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a0000000000000ec4 | 202.159 | 0.000 | n/a | 0.000 | 0.000 | 0.349 | 201.639 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-40/journal/page | none observed |
| 5990af423b3f804a0000000000000eca | 201.814 | 0.000 | n/a | 0.000 | 0.000 | 0.650 | 201.005 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-42/journal/page | none observed |
| 5990af423b3f804a0000000000000e95 | 201.777 | 0.000 | n/a | 0.000 | 0.000 | 0.648 | 200.965 | 0.008 | n/a | 0.071 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000ea0 | 201.644 | 0.000 | n/a | 0.000 | 0.000 | 0.850 | 200.667 | 0.003 | n/a | 0.049 | 0.000 | n/a | n/a | 0.075 | 0.000 | 0.000 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 5990af423b3f804a0000000000000e9c | 201.643 | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 200.682 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a0000000000000ed7 | 201.616 | 0.000 | n/a | 0.000 | 0.000 | 0.565 | 200.776 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000ed3 | 201.558 | 0.000 | n/a | 0.000 | 0.000 | 0.815 | 200.508 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000eb0 | 201.529 | 0.000 | n/a | 0.000 | 0.000 | 0.485 | 200.800 | 0.024 | n/a | 0.106 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000ed4 | 201.525 | 0.000 | n/a | 0.000 | 0.000 | 0.794 | 200.483 | 0.014 | n/a | 0.034 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-61/journal/page | none observed |
| 5990af423b3f804a0000000000000ea1 | 201.517 | 0.000 | n/a | 0.000 | 0.000 | 0.648 | 200.676 | 0.003 | n/a | 0.034 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-45/journal/page | none observed |
| 5990af423b3f804a0000000000000eda | 201.466 | 0.000 | n/a | 0.000 | 0.000 | 0.647 | 200.612 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-44/journal/page | none observed |
| 5990af423b3f804a0000000000000ea3 | 201.462 | 0.000 | n/a | 0.000 | 0.000 | 0.536 | 200.772 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-44/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions

Verdict: scheduled offer to the final receipt handed to the caller (ack/1, Sam 2026-11-16). Actual scheduler lateness counts. Legacy finish is reported, never judged. Corrected removes observed offer lateness, including GC/event-loop stalls, and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged. Commit-based bars need at least 500 primary commits, including both sides of a ratio.

Timer lateness p50/p99: 0.002/6.317 ms; post-ACK p50/p99: 0.414/2.119 ms.

| Measurement | verdict (ACK) | legacy finish | corrected diagnostic | bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 9.795 | 10.336 | 9.549 | reported |
| All-primary p99 ms | 72.759 | 73.304 | 69.369 | <=50 |
| L256 5-10 p50Ms | 13.631 | 14.527 | 12.927 | <=10 |
| L256 5-10 p99Ms | 24.547 | 25.184 | 24.543 | <=50 |
| L256 11-25 p50Ms | 14.911 | 16.639 | 14.911 | <=10 |
| L256 11-25 p99Ms | 26.993 | 27.590 | 21.506 | <=50 |
| L256 26-50 p50Ms | 15.423 | 16.895 | 15.423 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 22.721 | 23.554 | 22.720 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 8.383 | 8.767 | 8.159 | <=10 |
| Burst 11-25 p50 ms | 10.559 | 11.327 | 10.367 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 26.993 | 27.590 | 24.543 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 107.609 | 109.056 | 107.607 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 102.755/102.755 | 98.652 | 63.718 | 173.136 | 1.540/0.153 |
| 5-10 | 250-1000 | 50 | 14.768/36.443 | 14.283 | 7.455 | 17.493 | 0.096/0.025 |
| 11-25 | 100-250 | 18 | 14.309/26.106 | 13.805 | 9.267 | 21.620 | 0.080/0.024 |
| 26-50 | 0-50 | 196 | 13.996/57.264 | 12.698 | 6.707 | 17.077 | 0.060/0.022 |
| 11-25 | 250-1000 | 23 | 17.920/34.695 | 17.196 | 9.913 | 25.452 | 0.093/0.023 |
| 5-10 | 0-50 | 1110 | 7.670/31.845 | 7.313 | 3.937 | 9.640 | 0.042/0.020 |
| 5-10 | 100-250 | 22 | 12.583/52.683 | 11.671 | 6.422 | 15.121 | 0.071/0.024 |
| 26-50 | 250-1000 | 7 | 24.537/43.059 | 21.812 | 7.343 | 18.799 | 0.097/0.044 |
| 11-25 | 0-50 | 528 | 9.849/37.023 | 9.303 | 4.775 | 12.185 | 0.050/0.021 |
| 5-10 | 50-100 | 66 | 7.813/73.995 | 7.481 | 3.911 | 10.342 | 0.054/0.020 |
| 26-50 | 100-250 | 2 | 17.549/20.569 | 15.800 | 9.214 | 22.998 | 0.091/0.021 |
| 26-50 | 50-100 | 14 | 14.873/33.781 | 12.646 | 6.744 | 16.886 | 0.063/0.024 |
| 26-50 | overlap | 149 | 17.120/89.552 | 15.560 | 8.790 | 21.502 | 0.053/0.023 |
| 11-25 | 50-100 | 35 | 10.234/27.612 | 9.778 | 5.103 | 13.530 | 0.063/0.021 |
| 5-10 | overlap | 817 | 10.207/80.665 | 9.931 | 5.945 | 13.284 | 0.037/0.019 |
| 11-25 | overlap | 382 | 12.933/81.201 | 12.286 | 6.774 | 16.138 | 0.043/0.021 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 900 | 29 | 2086.155 |
| burst | 2520 | 44 | 3476.859 |

## Writer heap, GC and scheduler stalls

Source 2409bdada6be6cb7f17d1aa71f31da90a72f01af; 3420 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 330.792 / 479.215 |
| GC events / total duration / maximum ms | 609 / 1474.776 / 30.913 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":597,"4":6,"8":6} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 73.304 / 77 / 5824.527 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.
