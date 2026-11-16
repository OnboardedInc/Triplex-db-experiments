# Trace report

The slowest observed commits spent their largest exclusive interval in `tx/thread-87/transactor.triplex-function` (47.933 ms, trace `c57f7c4a0083103b00000000000001f7`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (31.082 ms, trace `c57f7c4a0083103b00000000000000f1`); `gw-w/thread-53/peer.transact-await (includes order/network/storage)` (39.791 ms, trace `c57f7c4a0083103b000000000000058a`); `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (36.424 ms, trace `c57f7c4a0083103b00000000000001f8`); `tx/thread-87/transactor.triplex-function` (27.862 ms, trace `c57f7c4a0083103b00000000000007f9`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-idle-b-5-plain`; source `a0785bcf96f7afea3965b3028db2e27f4fbef6a9`; subjects 10000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 1250/1250 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 1250/1250. Raw trace bytes: 18677182.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 4049 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 5996.354 | 1221.327 | 9.061 | 4046 |
| idle-10 | 0 | 2497.870 | 697.611 | 7.737 | 3047 |
| idle-25 | 0 | 4737.287 | 780.118 | 6.563 | 3034 |
| idle-50 | 0 | 8461.302 | 804.951 | 6.319 | 3034 |
| idle-100 | 0 | 15912.382 | 910.363 | 11.863 | 3034 |
| idle-250 | 0 | 38260.680 | 1193.750 | 25.878 | 3030 |
| idle-500 | 0 | 75512.342 | 1762.873 | 43.709 | 3034 |
| idle-1000 | 0 | 148016.143 | 2534.520 | 89.597 | 3012 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| c57f7c4a0083103b00000000000001f7 | driver.queue.scheduler-dispatch | 0.043 | none | 0 / 32 |
| c57f7c4a0083103b00000000000001f7 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace c57f7c4a0083103b00000000000001f7 waited: []

| c57f7c4a0083103b00000000000000f1 | driver.queue.scheduler-dispatch | 0.186 | none | 0 / 32 |
| c57f7c4a0083103b00000000000000f1 | driver.queue.scheduler-late | 0.046 | none | 0 / 32 |

Observed active steps while trace c57f7c4a0083103b00000000000000f1 waited: []

| c57f7c4a0083103b000000000000058a | driver.queue.scheduler-dispatch | 0.042 | none | 0 / 32 |
| c57f7c4a0083103b000000000000058a | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace c57f7c4a0083103b000000000000058a waited: []

| c57f7c4a0083103b00000000000001f8 | driver.queue.scheduler-dispatch | 0.043 | none | 1 / 32 |
| c57f7c4a0083103b00000000000001f8 | driver.queue.scheduler-late | 0.002 | none | 1 / 32 |

Observed active steps while trace c57f7c4a0083103b00000000000001f8 waited: []

| c57f7c4a0083103b00000000000007f9 | driver.queue.scheduler-dispatch | 0.045 | none | 0 / 32 |
| c57f7c4a0083103b00000000000007f9 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace c57f7c4a0083103b00000000000007f9 waited: []

## P2 / outside-phases / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.090 | 1.998 | 0.000 | 0.402 | 1.838 | n/a | 0.000 | 0.232 | 1.536 | 1.007 | 0.016 | 0.000 | 0.116 | 8.472 | 2.459 | n/a | 0.019 | 5.465 | 0.181 | 0.019 |
| p99 | 58.316 | 2.599 | 0.000 | 2.282 | 8.095 | n/a | 2.233 | 3.627 | 1.600 | 2.048 | 0.021 | 0.000 | 3.605 | 31.082 | 9.234 | n/a | 0.168 | 10.559 | 0.286 | 0.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b00000000000000f1 | 58.316 | 8.095 | n/a | 2.233 | 0.232 | 1.600 | 2.048 | 0.021 | 0.000 | 3.605 | 31.082 | 9.234 | n/a | 0.168 | 10.559 | 0.181 | 0.168 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |
| c57f7c4a0083103b000000000000028e | 19.090 | 1.838 | n/a | 0.000 | 3.627 | 1.536 | 1.007 | 0.016 | 0.000 | 0.116 | 8.472 | 2.459 | n/a | 0.019 | 5.465 | 0.286 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.105ms; driver.publication.persist-deferred 0.019ms |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.090 | 1.998 | 0.000 | 0.402 | 1.838 | n/a | 0.000 | 0.232 | 1.536 | 1.007 | 0.016 | 0.000 | 0.116 | 8.472 | 2.459 | n/a | 0.019 | 5.465 | 0.181 | 0.019 |
| p99 | 58.316 | 2.599 | 0.000 | 2.282 | 8.095 | n/a | 2.233 | 3.627 | 1.600 | 2.048 | 0.021 | 0.000 | 3.605 | 31.082 | 9.234 | n/a | 0.168 | 10.559 | 0.286 | 0.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b00000000000000f1 | 58.316 | 8.095 | n/a | 2.233 | 0.232 | 1.600 | 2.048 | 0.021 | 0.000 | 3.605 | 31.082 | 9.234 | n/a | 0.168 | 10.559 | 0.181 | 0.168 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |
| c57f7c4a0083103b000000000000028e | 19.090 | 1.838 | n/a | 0.000 | 3.627 | 1.536 | 1.007 | 0.016 | 0.000 | 0.116 | 8.472 | 2.459 | n/a | 0.019 | 5.465 | 0.286 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.105ms; driver.publication.persist-deferred 0.019ms |

## P2 / warmup / commit (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.164 | 0.124 | 0.000 | 0.512 | 2.374 | n/a | 0.000 | 0.050 | 0.747 | 1.408 | 0.020 | 0.000 | 0.161 | 5.304 | 0.519 | n/a | 0.021 | 2.489 | 0.208 | 0.021 |
| p99 | 36.721 | 1.997 | 0.000 | 1.225 | 4.190 | n/a | 1.420 | 2.144 | 7.853 | 5.632 | 0.088 | 0.000 | 3.284 | 18.225 | 4.843 | n/a | 0.062 | 5.690 | 0.359 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b00000000000001f7 | 61.855 | 2.983 | n/a | 0.000 | 0.045 | 0.712 | 1.212 | 0.019 | 0.000 | 0.846 | 8.077 | 47.933 | n/a | 0.028 | 3.028 | 0.049 | 0.028 | tx/thread-87/transactor.triplex-function | driver.reader-basis.broadcast 0.097ms |
| c57f7c4a0083103b00000000000001f8 | 43.590 | 3.129 | n/a | 0.000 | 0.045 | 1.103 | 2.038 | 0.055 | 0.000 | 0.305 | 36.424 | 0.467 | n/a | 0.025 | 3.174 | 0.073 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.097ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.015ms |
| c57f7c4a0083103b00000000000000f3 | 36.721 | 4.274 | n/a | 1.552 | 0.072 | 11.427 | 1.437 | 0.020 | 0.000 | 0.364 | 16.420 | 1.029 | n/a | 0.127 | 5.898 | 0.161 | 0.127 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.577ms; driver.publication.persist-deferred 0.080ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.016ms |
| c57f7c4a0083103b00000000000000f2 | 36.544 | 3.402 | n/a | 0.000 | 0.918 | 7.853 | 1.351 | 0.019 | 0.000 | 3.048 | 19.001 | 0.930 | n/a | 0.023 | 4.320 | 0.118 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.080ms |
| c57f7c4a0083103b0000000000000263 | 31.640 | 3.834 | n/a | 0.000 | 0.293 | 20.312 | 2.065 | 0.040 | 0.000 | 0.751 | 3.888 | 0.417 | n/a | 0.040 | 4.127 | 0.130 | 0.040 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.094ms |
| c57f7c4a0083103b000000000000028d | 28.220 | 3.963 | n/a | 0.000 | 0.135 | 1.406 | 2.615 | 0.050 | 0.000 | 0.163 | 18.225 | 1.602 | n/a | 0.062 | 4.098 | 0.145 | 0.062 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000000fe | 23.425 | 2.529 | n/a | 0.000 | 0.049 | 0.696 | 1.993 | 0.022 | 0.000 | 0.448 | 14.544 | 3.123 | n/a | 0.022 | 2.578 | 0.110 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000149 | 22.555 | 1.809 | n/a | 0.000 | 0.041 | 0.643 | 2.671 | 0.021 | 0.000 | 1.000 | 15.831 | 0.521 | n/a | 0.017 | 1.850 | 0.082 | 0.017 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000000f8 | 22.258 | 2.691 | n/a | 1.420 | 0.102 | 0.761 | 5.104 | 0.056 | 0.000 | 0.103 | 10.072 | 1.924 | n/a | 0.026 | 4.213 | 0.189 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.042ms |
| c57f7c4a0083103b00000000000001db | 21.349 | 1.980 | n/a | 0.000 | 0.036 | 1.426 | 3.434 | 0.019 | 0.000 | 0.067 | 13.872 | 0.496 | n/a | 0.019 | 2.016 | 0.094 | 0.019 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000264 | 20.939 | 2.875 | n/a | 0.000 | 2.815 | 0.916 | 4.581 | 0.086 | 0.000 | 1.212 | 7.828 | 0.605 | n/a | 0.021 | 5.690 | 0.272 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.094ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.036ms |
| c57f7c4a0083103b0000000000000118 | 20.104 | 2.866 | n/a | 0.000 | 0.070 | 1.009 | 3.004 | 0.040 | 0.000 | 0.646 | 7.594 | 4.843 | n/a | 0.034 | 2.936 | 0.146 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000141 | 19.960 | 1.829 | n/a | 0.000 | 0.031 | 0.578 | 3.924 | 0.021 | 0.000 | 0.111 | 7.067 | 6.381 | n/a | 0.018 | 1.860 | 0.093 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000000fb | 19.682 | 4.190 | n/a | 0.000 | 0.086 | 0.817 | 1.229 | 0.020 | 0.000 | 3.284 | 9.380 | 0.642 | n/a | 0.033 | 4.276 | 0.217 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.132ms; driver.reader-basis.broadcast 0.024ms |
| c57f7c4a0083103b00000000000001f9 | 19.539 | 2.111 | n/a | 0.000 | 1.544 | 0.668 | 1.130 | 0.021 | 0.000 | 0.297 | 12.383 | 1.368 | n/a | 0.016 | 3.655 | 0.187 | 0.016 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.015ms |
| c57f7c4a0083103b00000000000001b0 | 19.044 | 3.438 | n/a | 0.000 | 0.083 | 0.992 | 5.632 | 0.039 | 0.000 | 0.210 | 8.098 | 0.509 | n/a | 0.042 | 3.521 | 0.185 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.094ms |
| c57f7c4a0083103b0000000000000241 | 18.606 | 3.713 | n/a | 0.000 | 1.300 | 0.933 | 1.707 | 0.040 | 0.000 | 0.226 | 9.638 | 1.019 | n/a | 0.031 | 5.013 | 0.269 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000110 | 18.232 | 2.394 | n/a | 0.000 | 1.490 | 0.883 | 2.340 | 0.050 | 0.000 | 0.739 | 9.784 | 0.531 | n/a | 0.021 | 3.884 | 0.213 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000001ed | 18.194 | 1.980 | n/a | 0.000 | 0.037 | 0.656 | 1.447 | 0.019 | 0.000 | 3.405 | 9.581 | 1.048 | n/a | 0.022 | 2.017 | 0.111 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000024b | 17.946 | 2.231 | n/a | 0.000 | 0.028 | 0.817 | 2.800 | 0.033 | 0.000 | 0.335 | 8.606 | 3.078 | n/a | 0.017 | 2.259 | 0.126 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.161ms |

## P2 / warmup / commit / 5-10 facts (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.164 | 0.124 | 0.000 | 0.512 | 2.374 | n/a | 0.000 | 0.050 | 0.747 | 1.408 | 0.020 | 0.000 | 0.161 | 5.304 | 0.519 | n/a | 0.021 | 2.489 | 0.208 | 0.021 |
| p99 | 36.721 | 1.997 | 0.000 | 1.225 | 4.190 | n/a | 1.420 | 2.144 | 7.853 | 5.632 | 0.088 | 0.000 | 3.284 | 18.225 | 4.843 | n/a | 0.062 | 5.690 | 0.359 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b00000000000001f7 | 61.855 | 2.983 | n/a | 0.000 | 0.045 | 0.712 | 1.212 | 0.019 | 0.000 | 0.846 | 8.077 | 47.933 | n/a | 0.028 | 3.028 | 0.049 | 0.028 | tx/thread-87/transactor.triplex-function | driver.reader-basis.broadcast 0.097ms |
| c57f7c4a0083103b00000000000001f8 | 43.590 | 3.129 | n/a | 0.000 | 0.045 | 1.103 | 2.038 | 0.055 | 0.000 | 0.305 | 36.424 | 0.467 | n/a | 0.025 | 3.174 | 0.073 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.097ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.015ms |
| c57f7c4a0083103b00000000000000f3 | 36.721 | 4.274 | n/a | 1.552 | 0.072 | 11.427 | 1.437 | 0.020 | 0.000 | 0.364 | 16.420 | 1.029 | n/a | 0.127 | 5.898 | 0.161 | 0.127 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.577ms; driver.publication.persist-deferred 0.080ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.016ms |
| c57f7c4a0083103b00000000000000f2 | 36.544 | 3.402 | n/a | 0.000 | 0.918 | 7.853 | 1.351 | 0.019 | 0.000 | 3.048 | 19.001 | 0.930 | n/a | 0.023 | 4.320 | 0.118 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.080ms |
| c57f7c4a0083103b0000000000000263 | 31.640 | 3.834 | n/a | 0.000 | 0.293 | 20.312 | 2.065 | 0.040 | 0.000 | 0.751 | 3.888 | 0.417 | n/a | 0.040 | 4.127 | 0.130 | 0.040 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.094ms |
| c57f7c4a0083103b000000000000028d | 28.220 | 3.963 | n/a | 0.000 | 0.135 | 1.406 | 2.615 | 0.050 | 0.000 | 0.163 | 18.225 | 1.602 | n/a | 0.062 | 4.098 | 0.145 | 0.062 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000000fe | 23.425 | 2.529 | n/a | 0.000 | 0.049 | 0.696 | 1.993 | 0.022 | 0.000 | 0.448 | 14.544 | 3.123 | n/a | 0.022 | 2.578 | 0.110 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000149 | 22.555 | 1.809 | n/a | 0.000 | 0.041 | 0.643 | 2.671 | 0.021 | 0.000 | 1.000 | 15.831 | 0.521 | n/a | 0.017 | 1.850 | 0.082 | 0.017 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000000f8 | 22.258 | 2.691 | n/a | 1.420 | 0.102 | 0.761 | 5.104 | 0.056 | 0.000 | 0.103 | 10.072 | 1.924 | n/a | 0.026 | 4.213 | 0.189 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.042ms |
| c57f7c4a0083103b00000000000001db | 21.349 | 1.980 | n/a | 0.000 | 0.036 | 1.426 | 3.434 | 0.019 | 0.000 | 0.067 | 13.872 | 0.496 | n/a | 0.019 | 2.016 | 0.094 | 0.019 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000264 | 20.939 | 2.875 | n/a | 0.000 | 2.815 | 0.916 | 4.581 | 0.086 | 0.000 | 1.212 | 7.828 | 0.605 | n/a | 0.021 | 5.690 | 0.272 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.094ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.036ms |
| c57f7c4a0083103b0000000000000118 | 20.104 | 2.866 | n/a | 0.000 | 0.070 | 1.009 | 3.004 | 0.040 | 0.000 | 0.646 | 7.594 | 4.843 | n/a | 0.034 | 2.936 | 0.146 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000141 | 19.960 | 1.829 | n/a | 0.000 | 0.031 | 0.578 | 3.924 | 0.021 | 0.000 | 0.111 | 7.067 | 6.381 | n/a | 0.018 | 1.860 | 0.093 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000000fb | 19.682 | 4.190 | n/a | 0.000 | 0.086 | 0.817 | 1.229 | 0.020 | 0.000 | 3.284 | 9.380 | 0.642 | n/a | 0.033 | 4.276 | 0.217 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.132ms; driver.reader-basis.broadcast 0.024ms |
| c57f7c4a0083103b00000000000001f9 | 19.539 | 2.111 | n/a | 0.000 | 1.544 | 0.668 | 1.130 | 0.021 | 0.000 | 0.297 | 12.383 | 1.368 | n/a | 0.016 | 3.655 | 0.187 | 0.016 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.015ms |
| c57f7c4a0083103b00000000000001b0 | 19.044 | 3.438 | n/a | 0.000 | 0.083 | 0.992 | 5.632 | 0.039 | 0.000 | 0.210 | 8.098 | 0.509 | n/a | 0.042 | 3.521 | 0.185 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.094ms |
| c57f7c4a0083103b0000000000000241 | 18.606 | 3.713 | n/a | 0.000 | 1.300 | 0.933 | 1.707 | 0.040 | 0.000 | 0.226 | 9.638 | 1.019 | n/a | 0.031 | 5.013 | 0.269 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000110 | 18.232 | 2.394 | n/a | 0.000 | 1.490 | 0.883 | 2.340 | 0.050 | 0.000 | 0.739 | 9.784 | 0.531 | n/a | 0.021 | 3.884 | 0.213 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000001ed | 18.194 | 1.980 | n/a | 0.000 | 0.037 | 0.656 | 1.447 | 0.019 | 0.000 | 3.405 | 9.581 | 1.048 | n/a | 0.022 | 2.017 | 0.111 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000024b | 17.946 | 2.231 | n/a | 0.000 | 0.028 | 0.817 | 2.800 | 0.033 | 0.000 | 0.335 | 8.606 | 3.078 | n/a | 0.017 | 2.259 | 0.126 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.161ms |

## P2/P4 / read-your-own-write / read (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.709 | n/a | n/a | n/a | 12.055 | 0.374 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 12.699 | 0.998 | 0.010 |
| p99 | 56.394 | n/a | n/a | n/a | 26.098 | 12.745 | 2.259 | 0.000 | 29.377 | 14.028 | 0.015 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.038 | 29.866 | 1.000 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b0000000000000123 | 56.394 | 12.368 | 0.255 | 0.281 | 0.000 | 29.377 | 14.028 | 0.004 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.008 | 12.904 | 0.229 | 0.008 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.138ms; driver.publication.readback 0.110ms; driver.publication.readback 0.107ms; driver.reader-basis.broadcast 0.041ms; driver.publication.persist-deferred 0.034ms |
| c57f7c4a0083103b00000000000000f5 | 42.620 | 13.131 | 4.351 | 0.295 | 0.000 | 23.707 | 1.090 | 0.007 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.010 | 17.778 | 0.417 | 0.010 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.add-commit 1.504ms; driver.publication.readback 0.577ms; driver.publication.readback 0.132ms; driver.publication.readback 0.074ms; driver.publication.readback 0.043ms |
| c57f7c4a0083103b00000000000000f4 | 39.724 | 26.098 | 2.126 | 1.642 | 0.000 | 3.914 | 5.831 | 0.015 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.038 | 29.866 | 0.752 | 0.038 | node-14/thread-2/replica.pull-at | driver.expected-state.add-commit 1.504ms; driver.publication.readback 0.577ms; driver.publication.persist-deferred 0.080ms; driver.publication.readback 0.074ms; driver.publication.readback 0.043ms |
| c57f7c4a0083103b0000000000000126 | 31.869 | 21.653 | 0.613 | 2.259 | 0.000 | 6.715 | 0.604 | 0.005 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.010 | 24.525 | 0.770 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.110ms; driver.publication.readback 0.107ms; driver.publication.persist-deferred 0.034ms; driver.publication.persist-deferred 0.021ms |
| c57f7c4a0083103b0000000000000bc6 | 27.499 | 15.549 | 0.574 | 0.804 | 0.000 | 9.872 | 0.682 | 0.002 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.008 | 16.927 | 0.616 | 0.008 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.119ms; driver.publication.persist-deferred 0.017ms |
| c57f7c4a0083103b00000000000000fa | 26.199 | 13.230 | 2.431 | 0.344 | 0.000 | 2.269 | 7.873 | 0.012 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.009 | 16.006 | 0.611 | 0.009 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.132ms; driver.publication.readback 0.120ms; driver.reader-basis.broadcast 0.024ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.019ms |
| c57f7c4a0083103b00000000000007f0 | 22.293 | 17.533 | 0.374 | 1.204 | 0.000 | 0.823 | 2.327 | 0.002 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.009 | 19.111 | 0.857 | 0.009 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.111ms; driver.publication.persist-deferred 0.015ms |
| c57f7c4a0083103b00000000000000f9 | 21.948 | 9.183 | 12.745 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 21.928 | 0.999 | 0.020 | node-14/thread-0/rpc.replica.observe | driver.expected-state.add-commit 1.504ms; driver.publication.readback 0.132ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.042ms; driver.reader-basis.broadcast 0.024ms |
| c57f7c4a0083103b000000000000023b | 20.212 | 13.594 | 0.375 | 0.313 | 0.000 | 4.042 | 1.860 | 0.002 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.008 | 14.282 | 0.707 | 0.008 | node-14/thread-2/replica.pull-at | driver.reader-basis.broadcast 0.142ms; driver.publication.readback 0.115ms; driver.publication.persist-deferred 0.014ms |
| c57f7c4a0083103b0000000000000186 | 13.744 | 13.671 | 0.063 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 13.733 | 0.999 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.014ms |
| c57f7c4a0083103b000000000000017a | 12.709 | 12.643 | 0.056 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 12.699 | 0.999 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.014ms |
| c57f7c4a0083103b0000000000000331 | 12.197 | 12.055 | 0.135 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 12.189 | 0.999 | 0.007 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.115ms; driver.reader-basis.broadcast 0.099ms; driver.publication.readback 0.051ms; driver.publication.readback 0.032ms; driver.publication.persist-deferred 0.015ms |
| c57f7c4a0083103b0000000000000aa1 | 11.603 | 10.708 | 0.100 | 0.785 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 11.593 | 0.999 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.015ms |
| c57f7c4a0083103b0000000000000298 | 11.250 | 11.144 | 0.091 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 11.235 | 0.999 | 0.015 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.056ms; driver.publication.readback 0.036ms; driver.publication.persist-deferred 0.025ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.004ms |
| c57f7c4a0083103b00000000000001b7 | 10.996 | 10.929 | 0.058 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 10.986 | 0.999 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.103ms; driver.publication.persist-deferred 0.014ms |
| c57f7c4a0083103b00000000000001fb | 10.763 | 7.000 | 3.748 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 10.748 | 0.999 | 0.015 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.154ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.010ms |
| c57f7c4a0083103b0000000000000152 | 10.719 | 10.605 | 0.103 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 10.708 | 0.999 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.014ms |
| c57f7c4a0083103b0000000000000332 | 10.714 | 10.689 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 10.710 | 1.000 | 0.004 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.115ms; driver.reader-basis.broadcast 0.099ms; driver.publication.readback 0.051ms; driver.publication.readback 0.032ms; driver.publication.persist-deferred 0.013ms |
| c57f7c4a0083103b000000000000032a | 10.693 | 10.636 | 0.038 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 10.673 | 0.998 | 0.020 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.138ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.047ms |
| c57f7c4a0083103b000000000000093f | 10.686 | 0.193 | 10.474 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 10.667 | 0.998 | 0.019 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.139ms; driver.publication.persist-deferred 0.038ms |

## P2 / idle-10 / commit (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.629 | 0.256 | 0.000 | 0.465 | 2.046 | n/a | 0.000 | 0.043 | 0.716 | 1.217 | 0.018 | 0.000 | 0.178 | 6.506 | 0.490 | n/a | 0.019 | 2.200 | 0.174 | 0.019 |
| p99 | 26.636 | 2.003 | 0.149 | 1.030 | 3.563 | n/a | 0.000 | 2.452 | 5.098 | 5.682 | 3.503 | 0.000 | 4.634 | 17.246 | 4.214 | n/a | 0.050 | 5.677 | 0.398 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b00000000000002e6 | 26.969 | 1.593 | n/a | 0.000 | 0.016 | 1.258 | 0.925 | 0.017 | 0.000 | 0.386 | 16.973 | 5.790 | n/a | 0.012 | 1.609 | 0.060 | 0.012 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.105ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.016ms |
| c57f7c4a0083103b00000000000002e4 | 26.636 | 3.179 | n/a | 0.000 | 0.086 | 0.822 | 1.914 | 0.042 | 0.000 | 0.138 | 19.330 | 1.089 | n/a | 0.036 | 3.266 | 0.123 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.111ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.016ms |
| c57f7c4a0083103b0000000000000294 | 23.959 | 2.061 | n/a | 0.000 | 0.025 | 2.612 | 1.083 | 0.019 | 0.000 | 0.618 | 16.966 | 0.561 | n/a | 0.015 | 2.086 | 0.087 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.026ms |
| c57f7c4a0083103b00000000000002dc | 23.805 | 2.059 | n/a | 0.000 | 0.028 | 2.321 | 1.124 | 0.017 | 0.000 | 0.059 | 17.246 | 0.934 | n/a | 0.017 | 2.087 | 0.088 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.017ms |
| c57f7c4a0083103b0000000000000357 | 22.979 | 1.944 | n/a | 0.000 | 0.042 | 4.888 | 1.413 | 0.041 | 0.000 | 0.065 | 13.606 | 0.959 | n/a | 0.022 | 1.985 | 0.086 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.195ms; driver.publication.readback 0.108ms; driver.publication.persist-deferred 0.015ms |
| c57f7c4a0083103b000000000000032d | 21.897 | 1.598 | n/a | 0.000 | 0.040 | 0.591 | 1.190 | 0.014 | 0.000 | 0.053 | 17.214 | 1.177 | n/a | 0.019 | 1.639 | 0.075 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.016ms |
| c57f7c4a0083103b00000000000002aa | 20.461 | 2.380 | n/a | 0.000 | 0.019 | 0.815 | 1.861 | 0.054 | 0.000 | 2.679 | 12.018 | 0.619 | n/a | 0.016 | 2.398 | 0.117 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.062ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.016ms |
| c57f7c4a0083103b00000000000002bc | 20.418 | 3.563 | n/a | 0.000 | 0.031 | 0.884 | 2.083 | 0.042 | 0.000 | 5.287 | 7.602 | 0.909 | n/a | 0.018 | 3.594 | 0.176 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.104ms; driver.publication.persist-deferred 0.016ms |
| c57f7c4a0083103b0000000000000326 | 19.780 | 1.792 | n/a | 0.000 | 0.068 | 0.746 | 4.453 | 0.070 | 0.000 | 3.912 | 8.247 | 0.461 | n/a | 0.032 | 1.860 | 0.094 | 0.032 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.074ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.016ms |
| c57f7c4a0083103b000000000000032b | 19.688 | 2.710 | n/a | 0.000 | 1.185 | 0.890 | 5.110 | 0.019 | 0.000 | 0.109 | 8.780 | 0.867 | n/a | 0.018 | 3.895 | 0.198 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.138ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.047ms |
| c57f7c4a0083103b0000000000000347 | 19.101 | 2.271 | n/a | 0.000 | 0.025 | 0.531 | 4.381 | 0.016 | 0.000 | 0.059 | 11.327 | 0.477 | n/a | 0.015 | 2.296 | 0.120 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.106ms; driver.publication.persist-deferred 0.045ms |
| c57f7c4a0083103b0000000000000323 | 18.739 | 1.650 | n/a | 0.000 | 0.647 | 0.662 | 5.682 | 0.043 | 0.000 | 0.123 | 9.492 | 0.428 | n/a | 0.011 | 2.298 | 0.123 | 0.011 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.019ms |
| c57f7c4a0083103b00000000000002a7 | 18.477 | 1.708 | n/a | 0.000 | 0.557 | 0.430 | 4.852 | 0.045 | 0.000 | 0.075 | 9.741 | 1.057 | n/a | 0.012 | 2.265 | 0.123 | 0.012 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.065ms; driver.publication.persist-deferred 0.020ms |
| c57f7c4a0083103b00000000000002b6 | 18.329 | 2.968 | n/a | 0.000 | 0.081 | 0.603 | 7.218 | 0.020 | 0.000 | 0.344 | 6.567 | 0.494 | n/a | 0.036 | 3.049 | 0.166 | 0.036 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.131ms; driver.publication.persist-deferred 0.032ms |
| c57f7c4a0083103b00000000000002a8 | 18.165 | 2.475 | n/a | 0.000 | 0.090 | 0.563 | 1.575 | 0.016 | 0.000 | 1.663 | 11.292 | 0.451 | n/a | 0.041 | 2.564 | 0.141 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.017ms |
| c57f7c4a0083103b000000000000029a | 18.028 | 3.107 | n/a | 0.000 | 0.034 | 5.098 | 1.127 | 0.019 | 0.000 | 0.061 | 7.605 | 0.957 | n/a | 0.020 | 3.141 | 0.174 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.115ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.015ms |
| c57f7c4a0083103b00000000000002fa | 17.935 | 1.823 | n/a | 0.000 | 0.034 | 0.648 | 1.903 | 0.050 | 0.000 | 0.117 | 12.879 | 0.442 | n/a | 0.038 | 1.857 | 0.104 | 0.038 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.017ms |
| c57f7c4a0083103b00000000000002e9 | 17.798 | 3.198 | n/a | 0.000 | 0.048 | 0.952 | 1.159 | 0.030 | 0.000 | 0.121 | 11.809 | 0.455 | n/a | 0.026 | 3.246 | 0.182 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.097ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.011ms |
| c57f7c4a0083103b00000000000002e2 | 17.685 | 3.368 | n/a | 0.000 | 1.483 | 0.721 | 1.330 | 0.023 | 0.000 | 0.085 | 7.453 | 3.190 | n/a | 0.030 | 4.852 | 0.274 | 0.030 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.111ms; driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.037ms |
| c57f7c4a0083103b00000000000002d1 | 17.460 | 2.922 | n/a | 0.000 | 0.461 | 4.514 | 0.969 | 0.017 | 0.000 | 0.057 | 8.036 | 0.463 | n/a | 0.021 | 3.383 | 0.194 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.153ms; driver.publication.persist-deferred 0.050ms |

## P2 / idle-10 / commit / 5-10 facts (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.629 | 0.256 | 0.000 | 0.465 | 2.046 | n/a | 0.000 | 0.043 | 0.716 | 1.217 | 0.018 | 0.000 | 0.178 | 6.506 | 0.490 | n/a | 0.019 | 2.200 | 0.174 | 0.019 |
| p99 | 26.636 | 2.003 | 0.149 | 1.030 | 3.563 | n/a | 0.000 | 2.452 | 5.098 | 5.682 | 3.503 | 0.000 | 4.634 | 17.246 | 4.214 | n/a | 0.050 | 5.677 | 0.398 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b00000000000002e6 | 26.969 | 1.593 | n/a | 0.000 | 0.016 | 1.258 | 0.925 | 0.017 | 0.000 | 0.386 | 16.973 | 5.790 | n/a | 0.012 | 1.609 | 0.060 | 0.012 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.105ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.016ms |
| c57f7c4a0083103b00000000000002e4 | 26.636 | 3.179 | n/a | 0.000 | 0.086 | 0.822 | 1.914 | 0.042 | 0.000 | 0.138 | 19.330 | 1.089 | n/a | 0.036 | 3.266 | 0.123 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.111ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.016ms |
| c57f7c4a0083103b0000000000000294 | 23.959 | 2.061 | n/a | 0.000 | 0.025 | 2.612 | 1.083 | 0.019 | 0.000 | 0.618 | 16.966 | 0.561 | n/a | 0.015 | 2.086 | 0.087 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.026ms |
| c57f7c4a0083103b00000000000002dc | 23.805 | 2.059 | n/a | 0.000 | 0.028 | 2.321 | 1.124 | 0.017 | 0.000 | 0.059 | 17.246 | 0.934 | n/a | 0.017 | 2.087 | 0.088 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.017ms |
| c57f7c4a0083103b0000000000000357 | 22.979 | 1.944 | n/a | 0.000 | 0.042 | 4.888 | 1.413 | 0.041 | 0.000 | 0.065 | 13.606 | 0.959 | n/a | 0.022 | 1.985 | 0.086 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.195ms; driver.publication.readback 0.108ms; driver.publication.persist-deferred 0.015ms |
| c57f7c4a0083103b000000000000032d | 21.897 | 1.598 | n/a | 0.000 | 0.040 | 0.591 | 1.190 | 0.014 | 0.000 | 0.053 | 17.214 | 1.177 | n/a | 0.019 | 1.639 | 0.075 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.016ms |
| c57f7c4a0083103b00000000000002aa | 20.461 | 2.380 | n/a | 0.000 | 0.019 | 0.815 | 1.861 | 0.054 | 0.000 | 2.679 | 12.018 | 0.619 | n/a | 0.016 | 2.398 | 0.117 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.062ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.016ms |
| c57f7c4a0083103b00000000000002bc | 20.418 | 3.563 | n/a | 0.000 | 0.031 | 0.884 | 2.083 | 0.042 | 0.000 | 5.287 | 7.602 | 0.909 | n/a | 0.018 | 3.594 | 0.176 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.104ms; driver.publication.persist-deferred 0.016ms |
| c57f7c4a0083103b0000000000000326 | 19.780 | 1.792 | n/a | 0.000 | 0.068 | 0.746 | 4.453 | 0.070 | 0.000 | 3.912 | 8.247 | 0.461 | n/a | 0.032 | 1.860 | 0.094 | 0.032 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.074ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.016ms |
| c57f7c4a0083103b000000000000032b | 19.688 | 2.710 | n/a | 0.000 | 1.185 | 0.890 | 5.110 | 0.019 | 0.000 | 0.109 | 8.780 | 0.867 | n/a | 0.018 | 3.895 | 0.198 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.138ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.047ms |
| c57f7c4a0083103b0000000000000347 | 19.101 | 2.271 | n/a | 0.000 | 0.025 | 0.531 | 4.381 | 0.016 | 0.000 | 0.059 | 11.327 | 0.477 | n/a | 0.015 | 2.296 | 0.120 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.106ms; driver.publication.persist-deferred 0.045ms |
| c57f7c4a0083103b0000000000000323 | 18.739 | 1.650 | n/a | 0.000 | 0.647 | 0.662 | 5.682 | 0.043 | 0.000 | 0.123 | 9.492 | 0.428 | n/a | 0.011 | 2.298 | 0.123 | 0.011 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.019ms |
| c57f7c4a0083103b00000000000002a7 | 18.477 | 1.708 | n/a | 0.000 | 0.557 | 0.430 | 4.852 | 0.045 | 0.000 | 0.075 | 9.741 | 1.057 | n/a | 0.012 | 2.265 | 0.123 | 0.012 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.065ms; driver.publication.persist-deferred 0.020ms |
| c57f7c4a0083103b00000000000002b6 | 18.329 | 2.968 | n/a | 0.000 | 0.081 | 0.603 | 7.218 | 0.020 | 0.000 | 0.344 | 6.567 | 0.494 | n/a | 0.036 | 3.049 | 0.166 | 0.036 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.131ms; driver.publication.persist-deferred 0.032ms |
| c57f7c4a0083103b00000000000002a8 | 18.165 | 2.475 | n/a | 0.000 | 0.090 | 0.563 | 1.575 | 0.016 | 0.000 | 1.663 | 11.292 | 0.451 | n/a | 0.041 | 2.564 | 0.141 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.017ms |
| c57f7c4a0083103b000000000000029a | 18.028 | 3.107 | n/a | 0.000 | 0.034 | 5.098 | 1.127 | 0.019 | 0.000 | 0.061 | 7.605 | 0.957 | n/a | 0.020 | 3.141 | 0.174 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.115ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.015ms |
| c57f7c4a0083103b00000000000002fa | 17.935 | 1.823 | n/a | 0.000 | 0.034 | 0.648 | 1.903 | 0.050 | 0.000 | 0.117 | 12.879 | 0.442 | n/a | 0.038 | 1.857 | 0.104 | 0.038 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.017ms |
| c57f7c4a0083103b00000000000002e9 | 17.798 | 3.198 | n/a | 0.000 | 0.048 | 0.952 | 1.159 | 0.030 | 0.000 | 0.121 | 11.809 | 0.455 | n/a | 0.026 | 3.246 | 0.182 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.097ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.011ms |
| c57f7c4a0083103b00000000000002e2 | 17.685 | 3.368 | n/a | 0.000 | 1.483 | 0.721 | 1.330 | 0.023 | 0.000 | 0.085 | 7.453 | 3.190 | n/a | 0.030 | 4.852 | 0.274 | 0.030 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.111ms; driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.037ms |
| c57f7c4a0083103b00000000000002d1 | 17.460 | 2.922 | n/a | 0.000 | 0.461 | 4.514 | 0.969 | 0.017 | 0.000 | 0.057 | 8.036 | 0.463 | n/a | 0.021 | 3.383 | 0.194 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.153ms; driver.publication.persist-deferred 0.050ms |

## P2 / idle-25 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.782 | 0.000 | 0.000 | 0.479 | 2.124 | n/a | 0.000 | 0.042 | 0.667 | 1.213 | 0.014 | 0.000 | 0.139 | 4.148 | 0.436 | n/a | 0.020 | 2.188 | 0.215 | 0.020 |
| p99 | 16.726 | 2.009 | 0.055 | 1.080 | 4.373 | n/a | 0.000 | 1.078 | 4.093 | 5.454 | 0.063 | 0.000 | 3.507 | 10.516 | 1.035 | n/a | 0.046 | 4.551 | 0.410 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b0000000000000492 | 19.060 | 1.905 | n/a | 0.000 | 0.042 | 0.781 | 9.009 | 0.020 | 0.000 | 0.633 | 6.225 | 0.425 | n/a | 0.020 | 1.947 | 0.102 | 0.020 | gw-w/thread-52/storage/commit! | none observed |
| c57f7c4a0083103b0000000000000439 | 16.726 | 3.041 | n/a | 0.000 | 0.087 | 0.829 | 1.065 | 0.024 | 0.000 | 0.085 | 10.633 | 0.931 | n/a | 0.032 | 3.127 | 0.187 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000459 | 16.687 | 2.813 | n/a | 0.000 | 0.032 | 0.750 | 4.351 | 1.510 | 0.000 | 0.067 | 6.303 | 0.843 | n/a | 0.017 | 2.845 | 0.171 | 0.017 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000437 | 16.382 | 3.072 | n/a | 0.000 | 0.052 | 0.743 | 1.425 | 0.035 | 0.000 | 0.116 | 10.503 | 0.413 | n/a | 0.024 | 3.124 | 0.191 | 0.024 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms |
| c57f7c4a0083103b00000000000004ba | 16.041 | 3.947 | n/a | 0.000 | 0.086 | 0.829 | 1.281 | 0.012 | 0.000 | 0.407 | 8.404 | 1.035 | n/a | 0.039 | 4.033 | 0.251 | 0.039 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000004cf | 15.781 | 2.264 | n/a | 0.000 | 0.038 | 1.375 | 3.000 | 0.012 | 0.000 | 2.907 | 5.308 | 0.855 | n/a | 0.022 | 2.302 | 0.146 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000004be | 15.723 | 3.708 | n/a | 0.000 | 0.083 | 0.783 | 1.295 | 0.013 | 0.000 | 0.433 | 8.557 | 0.812 | n/a | 0.039 | 3.792 | 0.241 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000475 | 15.259 | 1.993 | n/a | 0.000 | 0.502 | 0.766 | 2.314 | 0.020 | 0.000 | 0.114 | 9.091 | 0.447 | n/a | 0.011 | 2.495 | 0.164 | 0.011 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000046f | 15.202 | 2.332 | n/a | 0.000 | 0.028 | 0.513 | 1.313 | 0.012 | 0.000 | 0.057 | 10.516 | 0.413 | n/a | 0.017 | 2.360 | 0.155 | 0.017 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms |
| c57f7c4a0083103b00000000000004db | 14.791 | 1.751 | n/a | 0.000 | 0.055 | 0.622 | 1.053 | 0.012 | 0.000 | 3.507 | 7.083 | 0.685 | n/a | 0.024 | 1.806 | 0.122 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000004a0 | 14.341 | 3.707 | n/a | 0.000 | 0.095 | 1.100 | 2.228 | 0.022 | 0.000 | 0.154 | 6.108 | 0.888 | n/a | 0.038 | 3.802 | 0.265 | 0.038 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.126ms |
| c57f7c4a0083103b0000000000000451 | 14.264 | 2.129 | n/a | 0.000 | 0.039 | 0.692 | 3.467 | 0.016 | 0.000 | 0.095 | 7.374 | 0.432 | n/a | 0.020 | 2.167 | 0.152 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000003d8 | 14.188 | 2.865 | n/a | 0.000 | 0.070 | 4.093 | 1.718 | 0.025 | 0.000 | 1.363 | 3.608 | 0.414 | n/a | 0.032 | 2.935 | 0.207 | 0.032 | node-14/thread-0/socket.wait-first-byte | none observed |
| c57f7c4a0083103b000000000000048e | 14.183 | 2.078 | n/a | 0.000 | 0.022 | 0.742 | 1.599 | 0.020 | 0.000 | 0.240 | 8.608 | 0.858 | n/a | 0.015 | 2.100 | 0.148 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000003fe | 14.107 | 1.867 | n/a | 0.000 | 0.037 | 0.476 | 2.526 | 0.014 | 0.000 | 0.076 | 8.221 | 0.873 | n/a | 0.018 | 1.904 | 0.135 | 0.018 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| c57f7c4a0083103b00000000000003de | 14.054 | 2.426 | n/a | 0.000 | 0.051 | 0.619 | 1.050 | 0.014 | 0.000 | 3.828 | 5.606 | 0.436 | n/a | 0.024 | 2.476 | 0.176 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| c57f7c4a0083103b000000000000046d | 13.876 | 2.917 | n/a | 0.000 | 0.082 | 0.780 | 1.625 | 0.022 | 0.000 | 0.109 | 7.867 | 0.440 | n/a | 0.035 | 2.999 | 0.216 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000004b2 | 13.726 | 1.744 | n/a | 0.000 | 0.048 | 0.904 | 1.794 | 0.028 | 0.000 | 0.156 | 8.637 | 0.394 | n/a | 0.022 | 1.792 | 0.131 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000004c6 | 13.692 | 2.789 | n/a | 0.000 | 0.068 | 0.679 | 5.454 | 0.012 | 0.000 | 0.068 | 4.146 | 0.445 | n/a | 0.031 | 2.856 | 0.209 | 0.031 | gw-w/thread-50/commit.prepare-and-validate | none observed |
| c57f7c4a0083103b0000000000000484 | 13.674 | 2.142 | n/a | 0.000 | 1.378 | 0.637 | 3.929 | 0.013 | 0.000 | 0.148 | 4.543 | 0.868 | n/a | 0.015 | 3.520 | 0.257 | 0.015 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-25 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.782 | 0.000 | 0.000 | 0.479 | 2.124 | n/a | 0.000 | 0.042 | 0.667 | 1.213 | 0.014 | 0.000 | 0.139 | 4.148 | 0.436 | n/a | 0.020 | 2.188 | 0.215 | 0.020 |
| p99 | 16.726 | 2.009 | 0.055 | 1.080 | 4.373 | n/a | 0.000 | 1.078 | 4.093 | 5.454 | 0.063 | 0.000 | 3.507 | 10.516 | 1.035 | n/a | 0.046 | 4.551 | 0.410 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b0000000000000492 | 19.060 | 1.905 | n/a | 0.000 | 0.042 | 0.781 | 9.009 | 0.020 | 0.000 | 0.633 | 6.225 | 0.425 | n/a | 0.020 | 1.947 | 0.102 | 0.020 | gw-w/thread-52/storage/commit! | none observed |
| c57f7c4a0083103b0000000000000439 | 16.726 | 3.041 | n/a | 0.000 | 0.087 | 0.829 | 1.065 | 0.024 | 0.000 | 0.085 | 10.633 | 0.931 | n/a | 0.032 | 3.127 | 0.187 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000459 | 16.687 | 2.813 | n/a | 0.000 | 0.032 | 0.750 | 4.351 | 1.510 | 0.000 | 0.067 | 6.303 | 0.843 | n/a | 0.017 | 2.845 | 0.171 | 0.017 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000437 | 16.382 | 3.072 | n/a | 0.000 | 0.052 | 0.743 | 1.425 | 0.035 | 0.000 | 0.116 | 10.503 | 0.413 | n/a | 0.024 | 3.124 | 0.191 | 0.024 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms |
| c57f7c4a0083103b00000000000004ba | 16.041 | 3.947 | n/a | 0.000 | 0.086 | 0.829 | 1.281 | 0.012 | 0.000 | 0.407 | 8.404 | 1.035 | n/a | 0.039 | 4.033 | 0.251 | 0.039 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000004cf | 15.781 | 2.264 | n/a | 0.000 | 0.038 | 1.375 | 3.000 | 0.012 | 0.000 | 2.907 | 5.308 | 0.855 | n/a | 0.022 | 2.302 | 0.146 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000004be | 15.723 | 3.708 | n/a | 0.000 | 0.083 | 0.783 | 1.295 | 0.013 | 0.000 | 0.433 | 8.557 | 0.812 | n/a | 0.039 | 3.792 | 0.241 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000475 | 15.259 | 1.993 | n/a | 0.000 | 0.502 | 0.766 | 2.314 | 0.020 | 0.000 | 0.114 | 9.091 | 0.447 | n/a | 0.011 | 2.495 | 0.164 | 0.011 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000046f | 15.202 | 2.332 | n/a | 0.000 | 0.028 | 0.513 | 1.313 | 0.012 | 0.000 | 0.057 | 10.516 | 0.413 | n/a | 0.017 | 2.360 | 0.155 | 0.017 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms |
| c57f7c4a0083103b00000000000004db | 14.791 | 1.751 | n/a | 0.000 | 0.055 | 0.622 | 1.053 | 0.012 | 0.000 | 3.507 | 7.083 | 0.685 | n/a | 0.024 | 1.806 | 0.122 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000004a0 | 14.341 | 3.707 | n/a | 0.000 | 0.095 | 1.100 | 2.228 | 0.022 | 0.000 | 0.154 | 6.108 | 0.888 | n/a | 0.038 | 3.802 | 0.265 | 0.038 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.126ms |
| c57f7c4a0083103b0000000000000451 | 14.264 | 2.129 | n/a | 0.000 | 0.039 | 0.692 | 3.467 | 0.016 | 0.000 | 0.095 | 7.374 | 0.432 | n/a | 0.020 | 2.167 | 0.152 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000003d8 | 14.188 | 2.865 | n/a | 0.000 | 0.070 | 4.093 | 1.718 | 0.025 | 0.000 | 1.363 | 3.608 | 0.414 | n/a | 0.032 | 2.935 | 0.207 | 0.032 | node-14/thread-0/socket.wait-first-byte | none observed |
| c57f7c4a0083103b000000000000048e | 14.183 | 2.078 | n/a | 0.000 | 0.022 | 0.742 | 1.599 | 0.020 | 0.000 | 0.240 | 8.608 | 0.858 | n/a | 0.015 | 2.100 | 0.148 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000003fe | 14.107 | 1.867 | n/a | 0.000 | 0.037 | 0.476 | 2.526 | 0.014 | 0.000 | 0.076 | 8.221 | 0.873 | n/a | 0.018 | 1.904 | 0.135 | 0.018 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| c57f7c4a0083103b00000000000003de | 14.054 | 2.426 | n/a | 0.000 | 0.051 | 0.619 | 1.050 | 0.014 | 0.000 | 3.828 | 5.606 | 0.436 | n/a | 0.024 | 2.476 | 0.176 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| c57f7c4a0083103b000000000000046d | 13.876 | 2.917 | n/a | 0.000 | 0.082 | 0.780 | 1.625 | 0.022 | 0.000 | 0.109 | 7.867 | 0.440 | n/a | 0.035 | 2.999 | 0.216 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000004b2 | 13.726 | 1.744 | n/a | 0.000 | 0.048 | 0.904 | 1.794 | 0.028 | 0.000 | 0.156 | 8.637 | 0.394 | n/a | 0.022 | 1.792 | 0.131 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000004c6 | 13.692 | 2.789 | n/a | 0.000 | 0.068 | 0.679 | 5.454 | 0.012 | 0.000 | 0.068 | 4.146 | 0.445 | n/a | 0.031 | 2.856 | 0.209 | 0.031 | gw-w/thread-50/commit.prepare-and-validate | none observed |
| c57f7c4a0083103b0000000000000484 | 13.674 | 2.142 | n/a | 0.000 | 1.378 | 0.637 | 3.929 | 0.013 | 0.000 | 0.148 | 4.543 | 0.868 | n/a | 0.015 | 3.520 | 0.257 | 0.015 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-50 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.135 | 0.000 | 0.000 | 0.476 | 1.929 | n/a | 0.000 | 0.043 | 0.583 | 1.033 | 0.011 | 0.000 | 0.148 | 4.258 | 0.432 | n/a | 0.022 | 1.989 | 0.226 | 0.022 |
| p99 | 25.215 | 1.581 | 0.000 | 1.056 | 3.706 | n/a | 0.000 | 1.415 | 3.716 | 8.029 | 0.046 | 0.000 | 1.708 | 21.242 | 1.117 | n/a | 0.051 | 4.029 | 0.381 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b000000000000058a | 44.975 | 1.871 | n/a | 0.000 | 0.044 | 0.621 | 1.898 | 0.019 | 0.000 | 0.110 | 39.791 | 0.601 | n/a | 0.021 | 1.915 | 0.043 | 0.021 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.088ms |
| c57f7c4a0083103b0000000000000536 | 25.215 | 1.855 | n/a | 0.000 | 0.043 | 0.497 | 1.060 | 0.011 | 0.000 | 0.053 | 21.242 | 0.433 | n/a | 0.022 | 1.897 | 0.075 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000005bf | 18.063 | 1.743 | n/a | 0.000 | 0.035 | 0.691 | 10.943 | 0.019 | 0.000 | 0.115 | 4.138 | 0.356 | n/a | 0.022 | 1.778 | 0.098 | 0.022 | gw-w/thread-49/commit.prepare-and-validate | none observed |
| c57f7c4a0083103b00000000000005d4 | 17.111 | 2.240 | n/a | 0.000 | 0.047 | 4.056 | 1.350 | 0.028 | 0.000 | 0.149 | 8.793 | 0.425 | n/a | 0.024 | 2.287 | 0.134 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000005b9 | 16.782 | 2.234 | n/a | 0.000 | 0.035 | 0.616 | 8.029 | 0.026 | 0.000 | 0.148 | 5.243 | 0.432 | n/a | 0.018 | 2.269 | 0.135 | 0.018 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| c57f7c4a0083103b00000000000005cd | 16.233 | 2.381 | n/a | 0.000 | 0.045 | 2.939 | 0.927 | 0.011 | 0.000 | 0.291 | 8.767 | 0.847 | n/a | 0.024 | 2.427 | 0.149 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000513 | 15.965 | 1.697 | n/a | 0.000 | 0.034 | 0.656 | 5.496 | 0.021 | 0.000 | 0.132 | 7.492 | 0.419 | n/a | 0.018 | 1.731 | 0.108 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000569 | 15.160 | 1.702 | n/a | 0.000 | 0.034 | 0.424 | 0.979 | 0.010 | 0.000 | 0.157 | 11.406 | 0.428 | n/a | 0.020 | 1.736 | 0.115 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000005a4 | 15.053 | 2.929 | n/a | 0.000 | 0.067 | 3.716 | 1.569 | 0.019 | 0.000 | 1.708 | 4.188 | 0.824 | n/a | 0.033 | 2.996 | 0.199 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000515 | 14.689 | 4.422 | n/a | 0.000 | 0.125 | 3.477 | 1.364 | 0.023 | 0.000 | 0.951 | 3.858 | 0.420 | n/a | 0.048 | 4.548 | 0.310 | 0.048 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000594 | 14.284 | 1.737 | n/a | 0.000 | 0.057 | 1.624 | 1.017 | 0.011 | 0.000 | 0.366 | 9.005 | 0.443 | n/a | 0.023 | 1.794 | 0.126 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000058e | 13.842 | 1.675 | n/a | 0.000 | 0.049 | 0.559 | 1.733 | 0.025 | 0.000 | 0.684 | 8.060 | 1.032 | n/a | 0.024 | 1.723 | 0.125 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000050d | 13.699 | 1.881 | n/a | 0.000 | 0.049 | 1.241 | 1.271 | 0.012 | 0.000 | 0.090 | 8.270 | 0.863 | n/a | 0.024 | 1.929 | 0.141 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000592 | 13.398 | 2.417 | n/a | 0.000 | 0.030 | 0.594 | 1.675 | 0.012 | 0.000 | 0.350 | 7.868 | 0.433 | n/a | 0.019 | 2.447 | 0.183 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000004f6 | 13.150 | 3.308 | n/a | 0.000 | 0.078 | 0.573 | 1.760 | 0.021 | 0.000 | 0.533 | 6.421 | 0.418 | n/a | 0.037 | 3.386 | 0.257 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000005e4 | 13.147 | 1.632 | n/a | 0.000 | 0.042 | 1.657 | 4.759 | 0.019 | 0.000 | 0.161 | 4.418 | 0.438 | n/a | 0.021 | 1.674 | 0.127 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000005b7 | 13.093 | 1.770 | n/a | 0.000 | 0.046 | 0.595 | 1.559 | 0.028 | 0.000 | 0.080 | 8.172 | 0.815 | n/a | 0.029 | 1.816 | 0.139 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000517 | 13.077 | 2.457 | n/a | 0.000 | 0.062 | 0.765 | 1.072 | 0.020 | 0.000 | 0.334 | 7.727 | 0.613 | n/a | 0.028 | 2.519 | 0.193 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000005d8 | 12.558 | 1.843 | n/a | 0.000 | 0.037 | 3.490 | 1.083 | 0.010 | 0.000 | 0.341 | 4.895 | 0.841 | n/a | 0.019 | 1.879 | 0.150 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000005e0 | 12.535 | 2.403 | n/a | 0.000 | 0.041 | 0.791 | 2.658 | 0.016 | 0.000 | 0.108 | 6.072 | 0.425 | n/a | 0.021 | 2.444 | 0.195 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-50 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.135 | 0.000 | 0.000 | 0.476 | 1.929 | n/a | 0.000 | 0.043 | 0.583 | 1.033 | 0.011 | 0.000 | 0.148 | 4.258 | 0.432 | n/a | 0.022 | 1.989 | 0.226 | 0.022 |
| p99 | 25.215 | 1.581 | 0.000 | 1.056 | 3.706 | n/a | 0.000 | 1.415 | 3.716 | 8.029 | 0.046 | 0.000 | 1.708 | 21.242 | 1.117 | n/a | 0.051 | 4.029 | 0.381 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b000000000000058a | 44.975 | 1.871 | n/a | 0.000 | 0.044 | 0.621 | 1.898 | 0.019 | 0.000 | 0.110 | 39.791 | 0.601 | n/a | 0.021 | 1.915 | 0.043 | 0.021 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.088ms |
| c57f7c4a0083103b0000000000000536 | 25.215 | 1.855 | n/a | 0.000 | 0.043 | 0.497 | 1.060 | 0.011 | 0.000 | 0.053 | 21.242 | 0.433 | n/a | 0.022 | 1.897 | 0.075 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000005bf | 18.063 | 1.743 | n/a | 0.000 | 0.035 | 0.691 | 10.943 | 0.019 | 0.000 | 0.115 | 4.138 | 0.356 | n/a | 0.022 | 1.778 | 0.098 | 0.022 | gw-w/thread-49/commit.prepare-and-validate | none observed |
| c57f7c4a0083103b00000000000005d4 | 17.111 | 2.240 | n/a | 0.000 | 0.047 | 4.056 | 1.350 | 0.028 | 0.000 | 0.149 | 8.793 | 0.425 | n/a | 0.024 | 2.287 | 0.134 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000005b9 | 16.782 | 2.234 | n/a | 0.000 | 0.035 | 0.616 | 8.029 | 0.026 | 0.000 | 0.148 | 5.243 | 0.432 | n/a | 0.018 | 2.269 | 0.135 | 0.018 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| c57f7c4a0083103b00000000000005cd | 16.233 | 2.381 | n/a | 0.000 | 0.045 | 2.939 | 0.927 | 0.011 | 0.000 | 0.291 | 8.767 | 0.847 | n/a | 0.024 | 2.427 | 0.149 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000513 | 15.965 | 1.697 | n/a | 0.000 | 0.034 | 0.656 | 5.496 | 0.021 | 0.000 | 0.132 | 7.492 | 0.419 | n/a | 0.018 | 1.731 | 0.108 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000569 | 15.160 | 1.702 | n/a | 0.000 | 0.034 | 0.424 | 0.979 | 0.010 | 0.000 | 0.157 | 11.406 | 0.428 | n/a | 0.020 | 1.736 | 0.115 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000005a4 | 15.053 | 2.929 | n/a | 0.000 | 0.067 | 3.716 | 1.569 | 0.019 | 0.000 | 1.708 | 4.188 | 0.824 | n/a | 0.033 | 2.996 | 0.199 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000515 | 14.689 | 4.422 | n/a | 0.000 | 0.125 | 3.477 | 1.364 | 0.023 | 0.000 | 0.951 | 3.858 | 0.420 | n/a | 0.048 | 4.548 | 0.310 | 0.048 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000594 | 14.284 | 1.737 | n/a | 0.000 | 0.057 | 1.624 | 1.017 | 0.011 | 0.000 | 0.366 | 9.005 | 0.443 | n/a | 0.023 | 1.794 | 0.126 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000058e | 13.842 | 1.675 | n/a | 0.000 | 0.049 | 0.559 | 1.733 | 0.025 | 0.000 | 0.684 | 8.060 | 1.032 | n/a | 0.024 | 1.723 | 0.125 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000050d | 13.699 | 1.881 | n/a | 0.000 | 0.049 | 1.241 | 1.271 | 0.012 | 0.000 | 0.090 | 8.270 | 0.863 | n/a | 0.024 | 1.929 | 0.141 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000592 | 13.398 | 2.417 | n/a | 0.000 | 0.030 | 0.594 | 1.675 | 0.012 | 0.000 | 0.350 | 7.868 | 0.433 | n/a | 0.019 | 2.447 | 0.183 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000004f6 | 13.150 | 3.308 | n/a | 0.000 | 0.078 | 0.573 | 1.760 | 0.021 | 0.000 | 0.533 | 6.421 | 0.418 | n/a | 0.037 | 3.386 | 0.257 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000005e4 | 13.147 | 1.632 | n/a | 0.000 | 0.042 | 1.657 | 4.759 | 0.019 | 0.000 | 0.161 | 4.418 | 0.438 | n/a | 0.021 | 1.674 | 0.127 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000005b7 | 13.093 | 1.770 | n/a | 0.000 | 0.046 | 0.595 | 1.559 | 0.028 | 0.000 | 0.080 | 8.172 | 0.815 | n/a | 0.029 | 1.816 | 0.139 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000517 | 13.077 | 2.457 | n/a | 0.000 | 0.062 | 0.765 | 1.072 | 0.020 | 0.000 | 0.334 | 7.727 | 0.613 | n/a | 0.028 | 2.519 | 0.193 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000005d8 | 12.558 | 1.843 | n/a | 0.000 | 0.037 | 3.490 | 1.083 | 0.010 | 0.000 | 0.341 | 4.895 | 0.841 | n/a | 0.019 | 1.879 | 0.150 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000005e0 | 12.535 | 2.403 | n/a | 0.000 | 0.041 | 0.791 | 2.658 | 0.016 | 0.000 | 0.108 | 6.072 | 0.425 | n/a | 0.021 | 2.444 | 0.195 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-100 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.809 | 0.000 | 0.000 | 0.504 | 2.238 | n/a | 0.000 | 0.053 | 0.669 | 1.067 | 0.012 | 0.000 | 0.142 | 4.696 | 0.448 | n/a | 0.026 | 2.355 | 0.227 | 0.026 |
| p99 | 17.154 | 1.335 | 0.000 | 0.929 | 3.752 | n/a | 0.000 | 1.290 | 3.899 | 4.921 | 0.031 | 0.000 | 1.116 | 10.109 | 1.185 | n/a | 0.057 | 3.881 | 0.380 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b0000000000000674 | 17.587 | 3.568 | n/a | 0.000 | 0.085 | 0.845 | 3.889 | 0.011 | 0.000 | 0.286 | 7.865 | 1.000 | n/a | 0.039 | 3.653 | 0.208 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000731 | 17.154 | 2.556 | n/a | 0.000 | 0.053 | 1.029 | 1.787 | 0.023 | 0.000 | 0.199 | 11.016 | 0.462 | n/a | 0.030 | 2.609 | 0.152 | 0.030 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000657 | 16.620 | 2.609 | n/a | 0.000 | 0.057 | 0.943 | 1.742 | 0.026 | 0.000 | 0.656 | 10.109 | 0.451 | n/a | 0.028 | 2.666 | 0.160 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000006f9 | 15.076 | 2.291 | n/a | 0.000 | 0.487 | 3.970 | 1.024 | 0.012 | 0.000 | 0.075 | 6.737 | 0.460 | n/a | 0.020 | 2.778 | 0.184 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000664 | 14.760 | 2.238 | n/a | 0.000 | 0.032 | 0.860 | 1.676 | 0.026 | 0.000 | 0.695 | 8.252 | 0.963 | n/a | 0.019 | 2.270 | 0.154 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000006e4 | 14.344 | 3.271 | n/a | 0.000 | 0.133 | 1.051 | 2.001 | 0.026 | 0.000 | 0.104 | 6.628 | 1.078 | n/a | 0.051 | 3.404 | 0.237 | 0.051 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000725 | 14.335 | 2.331 | n/a | 0.000 | 1.216 | 0.813 | 1.639 | 0.025 | 0.000 | 0.187 | 7.678 | 0.427 | n/a | 0.021 | 3.546 | 0.247 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000638 | 14.160 | 2.195 | n/a | 0.000 | 1.618 | 0.496 | 4.921 | 0.011 | 0.000 | 0.075 | 4.392 | 0.437 | n/a | 0.016 | 3.813 | 0.269 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000065d | 14.046 | 3.078 | n/a | 0.000 | 0.105 | 0.744 | 1.518 | 0.013 | 0.000 | 0.115 | 7.968 | 0.450 | n/a | 0.056 | 3.183 | 0.227 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000694 | 13.580 | 2.401 | n/a | 0.000 | 0.048 | 0.582 | 0.963 | 0.011 | 0.000 | 0.137 | 8.986 | 0.429 | n/a | 0.023 | 2.449 | 0.180 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000006c0 | 13.563 | 2.562 | n/a | 0.000 | 0.052 | 0.758 | 3.467 | 0.014 | 0.000 | 0.087 | 6.109 | 0.487 | n/a | 0.027 | 2.614 | 0.193 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000696 | 13.382 | 1.880 | n/a | 0.000 | 0.058 | 0.874 | 2.128 | 0.024 | 0.000 | 0.568 | 7.426 | 0.398 | n/a | 0.025 | 1.938 | 0.145 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000072f | 13.282 | 3.590 | n/a | 0.000 | 0.112 | 0.754 | 1.814 | 0.014 | 0.000 | 0.118 | 5.902 | 0.921 | n/a | 0.057 | 3.702 | 0.279 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000064a | 13.254 | 3.119 | n/a | 0.000 | 0.098 | 0.760 | 1.216 | 0.012 | 0.000 | 0.105 | 7.422 | 0.481 | n/a | 0.042 | 3.217 | 0.243 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000662 | 13.143 | 2.665 | n/a | 0.000 | 1.201 | 0.569 | 1.067 | 0.011 | 0.000 | 3.176 | 3.998 | 0.438 | n/a | 0.018 | 3.866 | 0.294 | 0.018 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000625 | 13.126 | 2.598 | n/a | 0.000 | 0.042 | 0.963 | 1.801 | 0.021 | 0.000 | 0.129 | 7.094 | 0.455 | n/a | 0.024 | 2.639 | 0.201 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000742 | 13.014 | 2.592 | n/a | 0.000 | 0.047 | 0.702 | 5.386 | 0.018 | 0.000 | 0.082 | 3.686 | 0.477 | n/a | 0.025 | 2.639 | 0.203 | 0.025 | gw-w/thread-50/commit.prepare-and-validate | none observed |
| c57f7c4a0083103b0000000000000683 | 12.939 | 1.841 | n/a | 0.000 | 0.049 | 3.899 | 0.947 | 0.011 | 0.000 | 0.071 | 5.227 | 0.869 | n/a | 0.024 | 1.889 | 0.146 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000006ff | 12.830 | 2.858 | n/a | 0.000 | 0.056 | 0.754 | 4.754 | 0.022 | 0.000 | 0.082 | 3.828 | 0.451 | n/a | 0.025 | 2.913 | 0.227 | 0.025 | gw-w/thread-52/commit.prepare-and-validate | none observed |
| c57f7c4a0083103b0000000000000672 | 12.637 | 3.588 | n/a | 0.000 | 0.093 | 0.825 | 1.088 | 0.013 | 0.000 | 0.084 | 6.455 | 0.448 | n/a | 0.044 | 3.680 | 0.291 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-100 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.809 | 0.000 | 0.000 | 0.504 | 2.238 | n/a | 0.000 | 0.053 | 0.669 | 1.067 | 0.012 | 0.000 | 0.142 | 4.696 | 0.448 | n/a | 0.026 | 2.355 | 0.227 | 0.026 |
| p99 | 17.154 | 1.335 | 0.000 | 0.929 | 3.752 | n/a | 0.000 | 1.290 | 3.899 | 4.921 | 0.031 | 0.000 | 1.116 | 10.109 | 1.185 | n/a | 0.057 | 3.881 | 0.380 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b0000000000000674 | 17.587 | 3.568 | n/a | 0.000 | 0.085 | 0.845 | 3.889 | 0.011 | 0.000 | 0.286 | 7.865 | 1.000 | n/a | 0.039 | 3.653 | 0.208 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000731 | 17.154 | 2.556 | n/a | 0.000 | 0.053 | 1.029 | 1.787 | 0.023 | 0.000 | 0.199 | 11.016 | 0.462 | n/a | 0.030 | 2.609 | 0.152 | 0.030 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000657 | 16.620 | 2.609 | n/a | 0.000 | 0.057 | 0.943 | 1.742 | 0.026 | 0.000 | 0.656 | 10.109 | 0.451 | n/a | 0.028 | 2.666 | 0.160 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000006f9 | 15.076 | 2.291 | n/a | 0.000 | 0.487 | 3.970 | 1.024 | 0.012 | 0.000 | 0.075 | 6.737 | 0.460 | n/a | 0.020 | 2.778 | 0.184 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000664 | 14.760 | 2.238 | n/a | 0.000 | 0.032 | 0.860 | 1.676 | 0.026 | 0.000 | 0.695 | 8.252 | 0.963 | n/a | 0.019 | 2.270 | 0.154 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000006e4 | 14.344 | 3.271 | n/a | 0.000 | 0.133 | 1.051 | 2.001 | 0.026 | 0.000 | 0.104 | 6.628 | 1.078 | n/a | 0.051 | 3.404 | 0.237 | 0.051 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000725 | 14.335 | 2.331 | n/a | 0.000 | 1.216 | 0.813 | 1.639 | 0.025 | 0.000 | 0.187 | 7.678 | 0.427 | n/a | 0.021 | 3.546 | 0.247 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000638 | 14.160 | 2.195 | n/a | 0.000 | 1.618 | 0.496 | 4.921 | 0.011 | 0.000 | 0.075 | 4.392 | 0.437 | n/a | 0.016 | 3.813 | 0.269 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000065d | 14.046 | 3.078 | n/a | 0.000 | 0.105 | 0.744 | 1.518 | 0.013 | 0.000 | 0.115 | 7.968 | 0.450 | n/a | 0.056 | 3.183 | 0.227 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000694 | 13.580 | 2.401 | n/a | 0.000 | 0.048 | 0.582 | 0.963 | 0.011 | 0.000 | 0.137 | 8.986 | 0.429 | n/a | 0.023 | 2.449 | 0.180 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000006c0 | 13.563 | 2.562 | n/a | 0.000 | 0.052 | 0.758 | 3.467 | 0.014 | 0.000 | 0.087 | 6.109 | 0.487 | n/a | 0.027 | 2.614 | 0.193 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000696 | 13.382 | 1.880 | n/a | 0.000 | 0.058 | 0.874 | 2.128 | 0.024 | 0.000 | 0.568 | 7.426 | 0.398 | n/a | 0.025 | 1.938 | 0.145 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000072f | 13.282 | 3.590 | n/a | 0.000 | 0.112 | 0.754 | 1.814 | 0.014 | 0.000 | 0.118 | 5.902 | 0.921 | n/a | 0.057 | 3.702 | 0.279 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000064a | 13.254 | 3.119 | n/a | 0.000 | 0.098 | 0.760 | 1.216 | 0.012 | 0.000 | 0.105 | 7.422 | 0.481 | n/a | 0.042 | 3.217 | 0.243 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000662 | 13.143 | 2.665 | n/a | 0.000 | 1.201 | 0.569 | 1.067 | 0.011 | 0.000 | 3.176 | 3.998 | 0.438 | n/a | 0.018 | 3.866 | 0.294 | 0.018 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000625 | 13.126 | 2.598 | n/a | 0.000 | 0.042 | 0.963 | 1.801 | 0.021 | 0.000 | 0.129 | 7.094 | 0.455 | n/a | 0.024 | 2.639 | 0.201 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000742 | 13.014 | 2.592 | n/a | 0.000 | 0.047 | 0.702 | 5.386 | 0.018 | 0.000 | 0.082 | 3.686 | 0.477 | n/a | 0.025 | 2.639 | 0.203 | 0.025 | gw-w/thread-50/commit.prepare-and-validate | none observed |
| c57f7c4a0083103b0000000000000683 | 12.939 | 1.841 | n/a | 0.000 | 0.049 | 3.899 | 0.947 | 0.011 | 0.000 | 0.071 | 5.227 | 0.869 | n/a | 0.024 | 1.889 | 0.146 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000006ff | 12.830 | 2.858 | n/a | 0.000 | 0.056 | 0.754 | 4.754 | 0.022 | 0.000 | 0.082 | 3.828 | 0.451 | n/a | 0.025 | 2.913 | 0.227 | 0.025 | gw-w/thread-52/commit.prepare-and-validate | none observed |
| c57f7c4a0083103b0000000000000672 | 12.637 | 3.588 | n/a | 0.000 | 0.093 | 0.825 | 1.088 | 0.013 | 0.000 | 0.084 | 6.455 | 0.448 | n/a | 0.044 | 3.680 | 0.291 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.511 | 0.000 | 0.000 | 0.511 | 2.263 | n/a | 0.000 | 0.059 | 0.680 | 1.099 | 0.013 | 0.000 | 0.146 | 4.888 | 0.481 | n/a | 0.029 | 2.351 | 0.239 | 0.029 |
| p99 | 20.536 | 1.780 | 0.000 | 1.071 | 6.878 | n/a | 0.000 | 2.262 | 1.838 | 5.080 | 0.044 | 0.000 | 1.593 | 13.194 | 1.914 | n/a | 0.074 | 6.970 | 0.513 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b00000000000007f9 | 40.513 | 3.574 | n/a | 0.000 | 0.048 | 1.074 | 1.299 | 0.010 | 0.000 | 0.065 | 6.550 | 27.862 | n/a | 0.028 | 3.622 | 0.089 | 0.028 | tx/thread-87/transactor.triplex-function | none observed |
| c57f7c4a0083103b0000000000000850 | 20.536 | 3.736 | n/a | 0.000 | 0.111 | 0.887 | 1.367 | 0.014 | 0.000 | 0.127 | 13.194 | 1.043 | n/a | 0.056 | 3.847 | 0.187 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000080f | 18.656 | 1.810 | n/a | 0.000 | 0.046 | 0.627 | 1.615 | 0.020 | 0.000 | 0.172 | 13.484 | 0.859 | n/a | 0.023 | 1.856 | 0.099 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000083a | 18.189 | 1.982 | n/a | 0.000 | 0.065 | 1.838 | 1.184 | 0.016 | 0.000 | 0.072 | 11.983 | 1.021 | n/a | 0.029 | 2.047 | 0.113 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000838 | 17.500 | 3.914 | n/a | 0.000 | 0.115 | 1.058 | 1.323 | 0.013 | 0.000 | 0.085 | 10.432 | 0.508 | n/a | 0.052 | 4.029 | 0.230 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000865 | 16.442 | 3.384 | n/a | 0.000 | 0.092 | 0.893 | 5.383 | 0.024 | 0.000 | 0.114 | 6.028 | 0.478 | n/a | 0.045 | 3.476 | 0.211 | 0.045 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000007e8 | 15.906 | 3.949 | n/a | 0.000 | 0.132 | 2.218 | 2.350 | 0.017 | 0.000 | 0.147 | 6.167 | 0.873 | n/a | 0.052 | 4.081 | 0.257 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000007b9 | 15.512 | 3.236 | n/a | 0.000 | 0.115 | 0.777 | 1.072 | 0.014 | 0.000 | 0.167 | 9.537 | 0.545 | n/a | 0.049 | 3.351 | 0.216 | 0.049 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000792 | 15.066 | 2.039 | n/a | 0.000 | 0.062 | 0.955 | 2.067 | 0.038 | 0.000 | 0.252 | 8.597 | 1.021 | n/a | 0.035 | 2.101 | 0.139 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.092ms |
| c57f7c4a0083103b000000000000075f | 15.000 | 3.731 | n/a | 0.000 | 0.138 | 0.763 | 1.091 | 0.014 | 0.000 | 0.176 | 8.032 | 0.997 | n/a | 0.057 | 3.869 | 0.258 | 0.057 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000007bd | 14.972 | 2.821 | n/a | 0.000 | 0.086 | 0.659 | 1.093 | 0.012 | 0.000 | 0.101 | 9.262 | 0.887 | n/a | 0.052 | 2.907 | 0.194 | 0.052 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000882 | 14.498 | 2.481 | n/a | 0.000 | 0.059 | 0.800 | 1.696 | 0.020 | 0.000 | 0.131 | 8.055 | 1.231 | n/a | 0.026 | 2.541 | 0.175 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000078e | 14.477 | 7.364 | n/a | 0.000 | 0.064 | 0.784 | 1.185 | 0.011 | 0.000 | 0.100 | 4.503 | 0.432 | n/a | 0.033 | 7.428 | 0.513 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.197ms |
| c57f7c4a0083103b00000000000008a4 | 13.878 | 1.989 | n/a | 0.000 | 0.048 | 0.823 | 1.881 | 0.031 | 0.000 | 0.190 | 8.387 | 0.504 | n/a | 0.025 | 2.037 | 0.147 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000763 | 13.799 | 1.883 | n/a | 0.000 | 0.049 | 0.765 | 5.080 | 0.028 | 0.000 | 0.319 | 5.205 | 0.443 | n/a | 0.027 | 1.931 | 0.140 | 0.027 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000007ec | 13.735 | 2.173 | n/a | 0.000 | 0.063 | 0.599 | 4.301 | 0.015 | 0.000 | 0.118 | 5.952 | 0.475 | n/a | 0.039 | 2.236 | 0.163 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000007d6 | 13.699 | 3.263 | n/a | 0.000 | 0.125 | 0.901 | 1.709 | 0.024 | 0.000 | 0.235 | 6.875 | 0.511 | n/a | 0.055 | 3.389 | 0.247 | 0.055 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000860 | 13.369 | 2.509 | n/a | 0.000 | 0.048 | 0.587 | 0.909 | 0.011 | 0.000 | 0.335 | 8.144 | 0.796 | n/a | 0.031 | 2.556 | 0.191 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000080d | 13.249 | 3.312 | n/a | 0.000 | 0.133 | 0.969 | 1.824 | 0.030 | 0.000 | 0.311 | 5.706 | 0.910 | n/a | 0.054 | 3.445 | 0.260 | 0.054 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000076c | 13.214 | 3.063 | n/a | 0.000 | 2.382 | 0.839 | 1.672 | 0.020 | 0.000 | 0.120 | 4.656 | 0.433 | n/a | 0.029 | 5.446 | 0.412 | 0.029 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.511 | 0.000 | 0.000 | 0.511 | 2.263 | n/a | 0.000 | 0.059 | 0.680 | 1.099 | 0.013 | 0.000 | 0.146 | 4.888 | 0.481 | n/a | 0.029 | 2.351 | 0.239 | 0.029 |
| p99 | 20.536 | 1.780 | 0.000 | 1.071 | 6.878 | n/a | 0.000 | 2.262 | 1.838 | 5.080 | 0.044 | 0.000 | 1.593 | 13.194 | 1.914 | n/a | 0.074 | 6.970 | 0.513 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b00000000000007f9 | 40.513 | 3.574 | n/a | 0.000 | 0.048 | 1.074 | 1.299 | 0.010 | 0.000 | 0.065 | 6.550 | 27.862 | n/a | 0.028 | 3.622 | 0.089 | 0.028 | tx/thread-87/transactor.triplex-function | none observed |
| c57f7c4a0083103b0000000000000850 | 20.536 | 3.736 | n/a | 0.000 | 0.111 | 0.887 | 1.367 | 0.014 | 0.000 | 0.127 | 13.194 | 1.043 | n/a | 0.056 | 3.847 | 0.187 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000080f | 18.656 | 1.810 | n/a | 0.000 | 0.046 | 0.627 | 1.615 | 0.020 | 0.000 | 0.172 | 13.484 | 0.859 | n/a | 0.023 | 1.856 | 0.099 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000083a | 18.189 | 1.982 | n/a | 0.000 | 0.065 | 1.838 | 1.184 | 0.016 | 0.000 | 0.072 | 11.983 | 1.021 | n/a | 0.029 | 2.047 | 0.113 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000838 | 17.500 | 3.914 | n/a | 0.000 | 0.115 | 1.058 | 1.323 | 0.013 | 0.000 | 0.085 | 10.432 | 0.508 | n/a | 0.052 | 4.029 | 0.230 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000865 | 16.442 | 3.384 | n/a | 0.000 | 0.092 | 0.893 | 5.383 | 0.024 | 0.000 | 0.114 | 6.028 | 0.478 | n/a | 0.045 | 3.476 | 0.211 | 0.045 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000007e8 | 15.906 | 3.949 | n/a | 0.000 | 0.132 | 2.218 | 2.350 | 0.017 | 0.000 | 0.147 | 6.167 | 0.873 | n/a | 0.052 | 4.081 | 0.257 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000007b9 | 15.512 | 3.236 | n/a | 0.000 | 0.115 | 0.777 | 1.072 | 0.014 | 0.000 | 0.167 | 9.537 | 0.545 | n/a | 0.049 | 3.351 | 0.216 | 0.049 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000792 | 15.066 | 2.039 | n/a | 0.000 | 0.062 | 0.955 | 2.067 | 0.038 | 0.000 | 0.252 | 8.597 | 1.021 | n/a | 0.035 | 2.101 | 0.139 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.092ms |
| c57f7c4a0083103b000000000000075f | 15.000 | 3.731 | n/a | 0.000 | 0.138 | 0.763 | 1.091 | 0.014 | 0.000 | 0.176 | 8.032 | 0.997 | n/a | 0.057 | 3.869 | 0.258 | 0.057 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000007bd | 14.972 | 2.821 | n/a | 0.000 | 0.086 | 0.659 | 1.093 | 0.012 | 0.000 | 0.101 | 9.262 | 0.887 | n/a | 0.052 | 2.907 | 0.194 | 0.052 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000882 | 14.498 | 2.481 | n/a | 0.000 | 0.059 | 0.800 | 1.696 | 0.020 | 0.000 | 0.131 | 8.055 | 1.231 | n/a | 0.026 | 2.541 | 0.175 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000078e | 14.477 | 7.364 | n/a | 0.000 | 0.064 | 0.784 | 1.185 | 0.011 | 0.000 | 0.100 | 4.503 | 0.432 | n/a | 0.033 | 7.428 | 0.513 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.197ms |
| c57f7c4a0083103b00000000000008a4 | 13.878 | 1.989 | n/a | 0.000 | 0.048 | 0.823 | 1.881 | 0.031 | 0.000 | 0.190 | 8.387 | 0.504 | n/a | 0.025 | 2.037 | 0.147 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000763 | 13.799 | 1.883 | n/a | 0.000 | 0.049 | 0.765 | 5.080 | 0.028 | 0.000 | 0.319 | 5.205 | 0.443 | n/a | 0.027 | 1.931 | 0.140 | 0.027 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000007ec | 13.735 | 2.173 | n/a | 0.000 | 0.063 | 0.599 | 4.301 | 0.015 | 0.000 | 0.118 | 5.952 | 0.475 | n/a | 0.039 | 2.236 | 0.163 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000007d6 | 13.699 | 3.263 | n/a | 0.000 | 0.125 | 0.901 | 1.709 | 0.024 | 0.000 | 0.235 | 6.875 | 0.511 | n/a | 0.055 | 3.389 | 0.247 | 0.055 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000860 | 13.369 | 2.509 | n/a | 0.000 | 0.048 | 0.587 | 0.909 | 0.011 | 0.000 | 0.335 | 8.144 | 0.796 | n/a | 0.031 | 2.556 | 0.191 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000080d | 13.249 | 3.312 | n/a | 0.000 | 0.133 | 0.969 | 1.824 | 0.030 | 0.000 | 0.311 | 5.706 | 0.910 | n/a | 0.054 | 3.445 | 0.260 | 0.054 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b000000000000076c | 13.214 | 3.063 | n/a | 0.000 | 2.382 | 0.839 | 1.672 | 0.020 | 0.000 | 0.120 | 4.656 | 0.433 | n/a | 0.029 | 5.446 | 0.412 | 0.029 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-500 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.050 | 0.337 | 0.000 | 0.514 | 2.382 | n/a | 0.000 | 0.065 | 0.771 | 1.152 | 0.014 | 0.000 | 0.144 | 5.023 | 0.491 | n/a | 0.034 | 2.539 | 0.233 | 0.034 |
| p99 | 22.225 | 1.790 | 0.000 | 1.053 | 7.431 | n/a | 0.000 | 2.357 | 2.336 | 4.886 | 0.053 | 0.000 | 3.349 | 10.966 | 2.768 | n/a | 0.194 | 8.085 | 0.563 | 0.194 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b0000000000000991 | 23.576 | 4.578 | n/a | 0.000 | 0.232 | 1.081 | 2.016 | 0.025 | 0.000 | 3.484 | 10.955 | 1.068 | n/a | 0.137 | 4.810 | 0.204 | 0.137 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000008c4 | 22.225 | 3.343 | n/a | 0.000 | 0.172 | 1.948 | 1.973 | 0.029 | 0.000 | 0.129 | 10.505 | 4.046 | n/a | 0.080 | 3.515 | 0.158 | 0.080 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a13 | 22.111 | 1.993 | n/a | 0.000 | 0.058 | 0.544 | 1.294 | 0.015 | 0.000 | 0.831 | 16.838 | 0.514 | n/a | 0.025 | 2.051 | 0.093 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000964 | 18.166 | 1.950 | n/a | 0.000 | 0.060 | 0.761 | 1.676 | 0.036 | 0.000 | 0.360 | 10.816 | 2.478 | n/a | 0.030 | 2.010 | 0.111 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000009e6 | 18.132 | 1.987 | n/a | 0.000 | 0.059 | 0.489 | 5.224 | 0.016 | 0.000 | 0.177 | 9.134 | 1.017 | n/a | 0.030 | 2.046 | 0.113 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a0e | 17.464 | 4.841 | n/a | 0.000 | 0.459 | 1.545 | 1.854 | 0.028 | 0.000 | 0.226 | 7.887 | 0.506 | n/a | 0.117 | 5.300 | 0.303 | 0.117 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000009b6 | 16.970 | 2.729 | n/a | 0.000 | 1.175 | 0.731 | 4.422 | 0.014 | 0.000 | 0.078 | 7.331 | 0.468 | n/a | 0.022 | 3.904 | 0.230 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000008ba | 16.592 | 5.708 | n/a | 0.000 | 0.519 | 0.980 | 1.344 | 0.015 | 0.000 | 0.196 | 6.579 | 1.051 | n/a | 0.201 | 6.226 | 0.375 | 0.201 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000950 | 16.170 | 1.945 | n/a | 0.000 | 0.070 | 0.976 | 2.202 | 0.030 | 0.000 | 0.655 | 9.237 | 1.023 | n/a | 0.031 | 2.014 | 0.125 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000900 | 16.100 | 7.431 | n/a | 0.000 | 0.208 | 2.240 | 1.085 | 0.015 | 0.000 | 0.090 | 4.373 | 0.465 | n/a | 0.194 | 7.639 | 0.474 | 0.194 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000009a2 | 16.006 | 1.903 | n/a | 0.000 | 0.051 | 0.763 | 1.659 | 0.038 | 0.000 | 0.119 | 10.966 | 0.476 | n/a | 0.031 | 1.953 | 0.122 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000937 | 15.983 | 7.105 | n/a | 0.000 | 1.899 | 0.804 | 0.933 | 0.012 | 0.000 | 0.098 | 4.661 | 0.443 | n/a | 0.028 | 9.005 | 0.563 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000952 | 15.121 | 2.222 | n/a | 0.000 | 2.357 | 0.615 | 1.171 | 0.015 | 0.000 | 0.189 | 8.072 | 0.455 | n/a | 0.023 | 4.580 | 0.303 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000008fd | 14.930 | 4.671 | n/a | 0.000 | 3.414 | 0.863 | 1.074 | 0.014 | 0.000 | 0.173 | 4.164 | 0.516 | n/a | 0.042 | 8.085 | 0.542 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000008d5 | 14.767 | 3.885 | n/a | 0.000 | 0.061 | 0.870 | 1.376 | 0.030 | 0.000 | 0.110 | 7.389 | 1.011 | n/a | 0.034 | 3.945 | 0.267 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000008b7 | 14.737 | 3.058 | n/a | 0.000 | 0.069 | 3.801 | 1.911 | 0.050 | 0.000 | 0.382 | 4.917 | 0.507 | n/a | 0.042 | 3.127 | 0.212 | 0.042 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000009cd | 14.586 | 2.406 | n/a | 0.000 | 0.089 | 1.071 | 2.083 | 0.033 | 0.000 | 3.349 | 5.054 | 0.462 | n/a | 0.038 | 2.495 | 0.171 | 0.038 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000009b4 | 14.582 | 2.501 | n/a | 0.000 | 0.068 | 1.229 | 1.854 | 0.028 | 0.000 | 0.177 | 5.927 | 2.768 | n/a | 0.031 | 2.568 | 0.176 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000009b1 | 14.434 | 2.547 | n/a | 0.000 | 0.119 | 0.904 | 1.916 | 0.033 | 0.000 | 0.211 | 8.172 | 0.474 | n/a | 0.057 | 2.667 | 0.185 | 0.057 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000946 | 14.410 | 1.994 | n/a | 0.000 | 0.065 | 0.831 | 1.713 | 0.026 | 0.000 | 0.136 | 9.162 | 0.455 | n/a | 0.029 | 2.059 | 0.143 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-500 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.050 | 0.337 | 0.000 | 0.514 | 2.382 | n/a | 0.000 | 0.065 | 0.771 | 1.152 | 0.014 | 0.000 | 0.144 | 5.023 | 0.491 | n/a | 0.034 | 2.539 | 0.233 | 0.034 |
| p99 | 22.225 | 1.790 | 0.000 | 1.053 | 7.431 | n/a | 0.000 | 2.357 | 2.336 | 4.886 | 0.053 | 0.000 | 3.349 | 10.966 | 2.768 | n/a | 0.194 | 8.085 | 0.563 | 0.194 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b0000000000000991 | 23.576 | 4.578 | n/a | 0.000 | 0.232 | 1.081 | 2.016 | 0.025 | 0.000 | 3.484 | 10.955 | 1.068 | n/a | 0.137 | 4.810 | 0.204 | 0.137 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000008c4 | 22.225 | 3.343 | n/a | 0.000 | 0.172 | 1.948 | 1.973 | 0.029 | 0.000 | 0.129 | 10.505 | 4.046 | n/a | 0.080 | 3.515 | 0.158 | 0.080 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a13 | 22.111 | 1.993 | n/a | 0.000 | 0.058 | 0.544 | 1.294 | 0.015 | 0.000 | 0.831 | 16.838 | 0.514 | n/a | 0.025 | 2.051 | 0.093 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000964 | 18.166 | 1.950 | n/a | 0.000 | 0.060 | 0.761 | 1.676 | 0.036 | 0.000 | 0.360 | 10.816 | 2.478 | n/a | 0.030 | 2.010 | 0.111 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000009e6 | 18.132 | 1.987 | n/a | 0.000 | 0.059 | 0.489 | 5.224 | 0.016 | 0.000 | 0.177 | 9.134 | 1.017 | n/a | 0.030 | 2.046 | 0.113 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a0e | 17.464 | 4.841 | n/a | 0.000 | 0.459 | 1.545 | 1.854 | 0.028 | 0.000 | 0.226 | 7.887 | 0.506 | n/a | 0.117 | 5.300 | 0.303 | 0.117 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000009b6 | 16.970 | 2.729 | n/a | 0.000 | 1.175 | 0.731 | 4.422 | 0.014 | 0.000 | 0.078 | 7.331 | 0.468 | n/a | 0.022 | 3.904 | 0.230 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000008ba | 16.592 | 5.708 | n/a | 0.000 | 0.519 | 0.980 | 1.344 | 0.015 | 0.000 | 0.196 | 6.579 | 1.051 | n/a | 0.201 | 6.226 | 0.375 | 0.201 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000950 | 16.170 | 1.945 | n/a | 0.000 | 0.070 | 0.976 | 2.202 | 0.030 | 0.000 | 0.655 | 9.237 | 1.023 | n/a | 0.031 | 2.014 | 0.125 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000900 | 16.100 | 7.431 | n/a | 0.000 | 0.208 | 2.240 | 1.085 | 0.015 | 0.000 | 0.090 | 4.373 | 0.465 | n/a | 0.194 | 7.639 | 0.474 | 0.194 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000009a2 | 16.006 | 1.903 | n/a | 0.000 | 0.051 | 0.763 | 1.659 | 0.038 | 0.000 | 0.119 | 10.966 | 0.476 | n/a | 0.031 | 1.953 | 0.122 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000937 | 15.983 | 7.105 | n/a | 0.000 | 1.899 | 0.804 | 0.933 | 0.012 | 0.000 | 0.098 | 4.661 | 0.443 | n/a | 0.028 | 9.005 | 0.563 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000952 | 15.121 | 2.222 | n/a | 0.000 | 2.357 | 0.615 | 1.171 | 0.015 | 0.000 | 0.189 | 8.072 | 0.455 | n/a | 0.023 | 4.580 | 0.303 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000008fd | 14.930 | 4.671 | n/a | 0.000 | 3.414 | 0.863 | 1.074 | 0.014 | 0.000 | 0.173 | 4.164 | 0.516 | n/a | 0.042 | 8.085 | 0.542 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000008d5 | 14.767 | 3.885 | n/a | 0.000 | 0.061 | 0.870 | 1.376 | 0.030 | 0.000 | 0.110 | 7.389 | 1.011 | n/a | 0.034 | 3.945 | 0.267 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000008b7 | 14.737 | 3.058 | n/a | 0.000 | 0.069 | 3.801 | 1.911 | 0.050 | 0.000 | 0.382 | 4.917 | 0.507 | n/a | 0.042 | 3.127 | 0.212 | 0.042 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000009cd | 14.586 | 2.406 | n/a | 0.000 | 0.089 | 1.071 | 2.083 | 0.033 | 0.000 | 3.349 | 5.054 | 0.462 | n/a | 0.038 | 2.495 | 0.171 | 0.038 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000009b4 | 14.582 | 2.501 | n/a | 0.000 | 0.068 | 1.229 | 1.854 | 0.028 | 0.000 | 0.177 | 5.927 | 2.768 | n/a | 0.031 | 2.568 | 0.176 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b00000000000009b1 | 14.434 | 2.547 | n/a | 0.000 | 0.119 | 0.904 | 1.916 | 0.033 | 0.000 | 0.211 | 8.172 | 0.474 | n/a | 0.057 | 2.667 | 0.185 | 0.057 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000946 | 14.410 | 1.994 | n/a | 0.000 | 0.065 | 0.831 | 1.713 | 0.026 | 0.000 | 0.136 | 9.162 | 0.455 | n/a | 0.029 | 2.059 | 0.143 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.118 | 0.244 | 0.000 | 0.521 | 2.592 | n/a | 0.000 | 0.080 | 0.825 | 1.185 | 0.015 | 0.000 | 0.177 | 5.613 | 0.508 | n/a | 0.038 | 2.688 | 0.239 | 0.038 |
| p99 | 18.756 | 1.808 | 0.000 | 1.054 | 6.862 | n/a | 0.000 | 4.227 | 2.323 | 4.410 | 0.100 | 0.000 | 3.478 | 12.865 | 2.981 | n/a | 0.181 | 7.983 | 0.520 | 0.181 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b0000000000000b21 | 31.815 | 3.860 | n/a | 0.000 | 0.208 | 1.972 | 1.386 | 0.015 | 0.000 | 0.155 | 23.668 | 0.470 | n/a | 0.081 | 4.068 | 0.128 | 0.081 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.297ms |
| c57f7c4a0083103b0000000000000abe | 18.756 | 6.766 | n/a | 0.000 | 0.254 | 0.487 | 1.059 | 0.014 | 0.000 | 0.442 | 8.714 | 0.934 | n/a | 0.087 | 7.020 | 0.374 | 0.087 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.139ms |
| c57f7c4a0083103b0000000000000b98 | 18.478 | 4.855 | n/a | 0.000 | 4.293 | 0.807 | 1.123 | 0.015 | 0.000 | 0.116 | 6.266 | 0.961 | n/a | 0.043 | 9.148 | 0.495 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a55 | 18.207 | 3.870 | n/a | 0.000 | 0.159 | 2.446 | 2.004 | 0.029 | 0.000 | 0.275 | 8.821 | 0.446 | n/a | 0.157 | 4.030 | 0.221 | 0.157 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000b92 | 18.117 | 3.684 | n/a | 0.000 | 0.164 | 0.708 | 1.184 | 0.020 | 0.000 | 0.127 | 11.054 | 1.110 | n/a | 0.065 | 3.848 | 0.212 | 0.065 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a7c | 17.879 | 2.308 | n/a | 0.000 | 0.083 | 1.270 | 5.670 | 0.034 | 0.000 | 0.149 | 7.849 | 0.482 | n/a | 0.035 | 2.391 | 0.134 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000bad | 17.871 | 3.184 | n/a | 0.000 | 0.072 | 2.042 | 3.771 | 0.100 | 0.000 | 0.578 | 7.194 | 0.895 | n/a | 0.036 | 3.256 | 0.182 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a67 | 17.784 | 2.129 | n/a | 0.000 | 0.060 | 0.653 | 1.051 | 0.011 | 0.000 | 0.105 | 12.865 | 0.879 | n/a | 0.030 | 2.189 | 0.123 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a2b | 17.521 | 5.679 | n/a | 0.000 | 0.254 | 1.510 | 1.761 | 0.027 | 0.000 | 0.641 | 6.538 | 0.961 | n/a | 0.150 | 5.934 | 0.339 | 0.150 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a46 | 17.432 | 3.589 | n/a | 0.000 | 0.086 | 2.323 | 2.479 | 0.052 | 0.000 | 1.832 | 6.435 | 0.595 | n/a | 0.042 | 3.675 | 0.211 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000bc5 | 17.420 | 4.891 | n/a | 0.000 | 0.356 | 1.512 | 1.154 | 0.015 | 0.000 | 0.143 | 8.167 | 1.013 | n/a | 0.171 | 5.247 | 0.301 | 0.171 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000b59 | 17.070 | 1.986 | n/a | 0.000 | 0.065 | 1.582 | 3.272 | 0.038 | 0.000 | 0.698 | 8.926 | 0.474 | n/a | 0.029 | 2.051 | 0.120 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a76 | 16.927 | 4.042 | n/a | 0.000 | 0.193 | 1.106 | 2.281 | 0.033 | 0.000 | 1.170 | 7.531 | 0.490 | n/a | 0.081 | 4.235 | 0.250 | 0.081 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000ad0 | 16.446 | 2.682 | n/a | 0.000 | 0.061 | 0.756 | 1.099 | 0.015 | 0.000 | 0.368 | 9.710 | 1.725 | n/a | 0.030 | 2.743 | 0.167 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.109ms |
| c57f7c4a0083103b0000000000000b74 | 16.429 | 6.244 | n/a | 0.000 | 0.236 | 1.135 | 1.134 | 0.016 | 0.000 | 0.123 | 6.353 | 1.098 | n/a | 0.090 | 6.480 | 0.394 | 0.090 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000be7 | 16.303 | 2.433 | n/a | 0.000 | 0.062 | 1.032 | 2.472 | 0.029 | 0.000 | 0.871 | 8.856 | 0.518 | n/a | 0.031 | 2.495 | 0.153 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000aac | 15.821 | 3.491 | n/a | 0.000 | 0.110 | 1.726 | 1.253 | 0.013 | 0.000 | 3.478 | 5.250 | 0.454 | n/a | 0.047 | 3.602 | 0.228 | 0.047 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000bb0 | 15.762 | 6.150 | n/a | 0.000 | 0.340 | 0.954 | 1.381 | 0.016 | 0.000 | 0.120 | 6.205 | 0.501 | n/a | 0.096 | 6.490 | 0.412 | 0.096 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000b65 | 15.729 | 2.277 | n/a | 0.000 | 0.075 | 2.046 | 3.659 | 0.041 | 0.000 | 0.349 | 6.707 | 0.535 | n/a | 0.040 | 2.352 | 0.150 | 0.040 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a85 | 15.728 | 3.379 | n/a | 0.000 | 0.179 | 0.659 | 1.099 | 0.014 | 0.000 | 0.111 | 9.591 | 0.516 | n/a | 0.181 | 3.558 | 0.226 | 0.181 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit / 5-10 facts (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.118 | 0.244 | 0.000 | 0.521 | 2.592 | n/a | 0.000 | 0.080 | 0.825 | 1.185 | 0.015 | 0.000 | 0.177 | 5.613 | 0.508 | n/a | 0.038 | 2.688 | 0.239 | 0.038 |
| p99 | 18.756 | 1.808 | 0.000 | 1.054 | 6.862 | n/a | 0.000 | 4.227 | 2.323 | 4.410 | 0.100 | 0.000 | 3.478 | 12.865 | 2.981 | n/a | 0.181 | 7.983 | 0.520 | 0.181 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57f7c4a0083103b0000000000000b21 | 31.815 | 3.860 | n/a | 0.000 | 0.208 | 1.972 | 1.386 | 0.015 | 0.000 | 0.155 | 23.668 | 0.470 | n/a | 0.081 | 4.068 | 0.128 | 0.081 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.297ms |
| c57f7c4a0083103b0000000000000abe | 18.756 | 6.766 | n/a | 0.000 | 0.254 | 0.487 | 1.059 | 0.014 | 0.000 | 0.442 | 8.714 | 0.934 | n/a | 0.087 | 7.020 | 0.374 | 0.087 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.139ms |
| c57f7c4a0083103b0000000000000b98 | 18.478 | 4.855 | n/a | 0.000 | 4.293 | 0.807 | 1.123 | 0.015 | 0.000 | 0.116 | 6.266 | 0.961 | n/a | 0.043 | 9.148 | 0.495 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a55 | 18.207 | 3.870 | n/a | 0.000 | 0.159 | 2.446 | 2.004 | 0.029 | 0.000 | 0.275 | 8.821 | 0.446 | n/a | 0.157 | 4.030 | 0.221 | 0.157 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000b92 | 18.117 | 3.684 | n/a | 0.000 | 0.164 | 0.708 | 1.184 | 0.020 | 0.000 | 0.127 | 11.054 | 1.110 | n/a | 0.065 | 3.848 | 0.212 | 0.065 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a7c | 17.879 | 2.308 | n/a | 0.000 | 0.083 | 1.270 | 5.670 | 0.034 | 0.000 | 0.149 | 7.849 | 0.482 | n/a | 0.035 | 2.391 | 0.134 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000bad | 17.871 | 3.184 | n/a | 0.000 | 0.072 | 2.042 | 3.771 | 0.100 | 0.000 | 0.578 | 7.194 | 0.895 | n/a | 0.036 | 3.256 | 0.182 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a67 | 17.784 | 2.129 | n/a | 0.000 | 0.060 | 0.653 | 1.051 | 0.011 | 0.000 | 0.105 | 12.865 | 0.879 | n/a | 0.030 | 2.189 | 0.123 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a2b | 17.521 | 5.679 | n/a | 0.000 | 0.254 | 1.510 | 1.761 | 0.027 | 0.000 | 0.641 | 6.538 | 0.961 | n/a | 0.150 | 5.934 | 0.339 | 0.150 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a46 | 17.432 | 3.589 | n/a | 0.000 | 0.086 | 2.323 | 2.479 | 0.052 | 0.000 | 1.832 | 6.435 | 0.595 | n/a | 0.042 | 3.675 | 0.211 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000bc5 | 17.420 | 4.891 | n/a | 0.000 | 0.356 | 1.512 | 1.154 | 0.015 | 0.000 | 0.143 | 8.167 | 1.013 | n/a | 0.171 | 5.247 | 0.301 | 0.171 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000b59 | 17.070 | 1.986 | n/a | 0.000 | 0.065 | 1.582 | 3.272 | 0.038 | 0.000 | 0.698 | 8.926 | 0.474 | n/a | 0.029 | 2.051 | 0.120 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a76 | 16.927 | 4.042 | n/a | 0.000 | 0.193 | 1.106 | 2.281 | 0.033 | 0.000 | 1.170 | 7.531 | 0.490 | n/a | 0.081 | 4.235 | 0.250 | 0.081 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000ad0 | 16.446 | 2.682 | n/a | 0.000 | 0.061 | 0.756 | 1.099 | 0.015 | 0.000 | 0.368 | 9.710 | 1.725 | n/a | 0.030 | 2.743 | 0.167 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.109ms |
| c57f7c4a0083103b0000000000000b74 | 16.429 | 6.244 | n/a | 0.000 | 0.236 | 1.135 | 1.134 | 0.016 | 0.000 | 0.123 | 6.353 | 1.098 | n/a | 0.090 | 6.480 | 0.394 | 0.090 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000be7 | 16.303 | 2.433 | n/a | 0.000 | 0.062 | 1.032 | 2.472 | 0.029 | 0.000 | 0.871 | 8.856 | 0.518 | n/a | 0.031 | 2.495 | 0.153 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000aac | 15.821 | 3.491 | n/a | 0.000 | 0.110 | 1.726 | 1.253 | 0.013 | 0.000 | 3.478 | 5.250 | 0.454 | n/a | 0.047 | 3.602 | 0.228 | 0.047 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000bb0 | 15.762 | 6.150 | n/a | 0.000 | 0.340 | 0.954 | 1.381 | 0.016 | 0.000 | 0.120 | 6.205 | 0.501 | n/a | 0.096 | 6.490 | 0.412 | 0.096 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000b65 | 15.729 | 2.277 | n/a | 0.000 | 0.075 | 2.046 | 3.659 | 0.041 | 0.000 | 0.349 | 6.707 | 0.535 | n/a | 0.040 | 2.352 | 0.150 | 0.040 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| c57f7c4a0083103b0000000000000a85 | 15.728 | 3.379 | n/a | 0.000 | 0.179 | 0.659 | 1.099 | 0.014 | 0.000 | 0.111 | 9.591 | 0.516 | n/a | 0.181 | 3.558 | 0.226 | 0.181 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.485 | n/a | n/a | n/a | 0.044 | n/a | 0.000 | 0.000 | 0.743 | 200.610 | 0.005 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.094 | 0.044 | 0.000 | 0.094 |
| p99 | 398.663 | n/a | n/a | n/a | 13.814 | n/a | 2.815 | 0.000 | 3.031 | 394.299 | 0.100 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.337 | 16.629 | 0.184 | 0.337 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c74efd5ea0d3c6a80000000000000002 | 398.663 | 2.712 | n/a | 0.000 | 0.000 | 1.135 | 394.299 | 0.100 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.337 | 2.712 | 0.007 | 0.337 | gw-r/thread-49/gateway.admitted-work | none observed |
| dc70aa84be01a3f70000000000000005 | 203.734 | 0.059 | n/a | 0.000 | 0.000 | 2.258 | 201.153 | 0.016 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.094 | 0.059 | 0.000 | 0.094 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f7000000000000091c | 201.683 | 0.036 | n/a | 0.000 | 0.000 | 0.743 | 200.765 | 0.008 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.083 | 0.036 | 0.000 | 0.083 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f70000000000000919 | 201.532 | 0.044 | n/a | 0.000 | 0.000 | 0.735 | 200.610 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.099 | 0.044 | 0.000 | 0.099 | gw-r/thread-51/journal/page | none observed |
| dc70aa84be01a3f7000000000000091b | 201.485 | 0.031 | n/a | 0.000 | 0.000 | 0.555 | 200.756 | 0.005 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.076 | 0.031 | 0.000 | 0.076 | gw-r/thread-66/journal/page | none observed |
| dc70aa84be01a3f7000000000000091a | 201.327 | 0.037 | n/a | 0.000 | 0.000 | 0.549 | 200.604 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.094 | 0.037 | 0.000 | 0.094 | gw-r/thread-50/journal/page | none observed |
| dc70aa84be01a3f70000000000000006 | 152.337 | 0.128 | n/a | 0.000 | 0.000 | 3.031 | 148.921 | 0.012 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.106 | 0.128 | 0.001 | 0.106 | gw-r/thread-47/journal/page | none observed |
| dc70aa84be01a3f7000000000000091f | 90.220 | 13.814 | n/a | 2.815 | 0.000 | 2.514 | 70.889 | 0.003 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.182 | 16.629 | 0.184 | 0.182 | gw-r/thread-45/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.710 | n/a | n/a | n/a | 0.389 | n/a | 0.000 | 0.000 | 1.296 | 14.338 | 0.002 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.079 | 0.389 | 0.000 | 0.079 |
| p99 | 1009.778 | n/a | n/a | n/a | 3.977 | n/a | 0.000 | 0.000 | 5.833 | 1001.652 | 0.018 | 0.000 | 0.553 | 0.000 | n/a | n/a | 1.333 | 3.977 | 0.202 | 1.333 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c74efd5ea0d3c6a800000000000000a4 | 1009.778 | 0.389 | n/a | 0.000 | 0.000 | 5.833 | 1001.652 | 0.018 | 0.000 | 0.553 | 0.000 | n/a | n/a | 1.333 | 0.389 | 0.000 | 1.333 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000360 | 19.710 | 3.977 | n/a | 0.000 | 0.000 | 1.296 | 14.338 | 0.002 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.079 | 3.977 | 0.202 | 0.079 | gw-r/thread-50/journal/page | none observed |

## P3 / warmup / internal (199 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.676 | n/a | n/a | n/a | 2.486 | n/a | 0.000 | 0.000 | 0.625 | 20.543 | 0.008 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.069 | 2.486 | 0.115 | 0.069 |
| p99 | 94.481 | n/a | n/a | n/a | 7.155 | n/a | 0.000 | 0.000 | 4.748 | 73.157 | 0.571 | 14.693 | 0.574 | 0.000 | n/a | n/a | 0.318 | 7.155 | 0.583 | 0.318 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c74efd5ea0d3c6a80000000000000231 | 1003.503 | 0.197 | n/a | 0.000 | 0.000 | 0.574 | 1001.496 | 0.031 | 0.000 | 0.075 | 0.000 | n/a | n/a | 1.131 | 0.197 | 0.000 | 1.131 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a800000000000000a5 | 94.481 | 19.009 | n/a | 0.000 | 0.000 | 1.940 | 73.157 | 0.016 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.257 | 19.009 | 0.201 | 0.257 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a800000000000001a0 | 74.113 | 2.248 | n/a | 0.000 | 0.000 | 0.522 | 71.171 | 0.020 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.064 | 2.248 | 0.030 | 0.064 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a800000000000000d2 | 59.296 | 4.304 | n/a | 2.778 | 0.000 | 0.719 | 21.702 | 0.010 | 29.568 | 0.084 | 0.000 | n/a | n/a | 0.131 | 7.082 | 0.119 | 0.131 | gw-r/thread--1/jdk.GCPhasePause | none observed |
| c74efd5ea0d3c6a80000000000000233 | 37.533 | 2.840 | n/a | 0.000 | 0.000 | 0.574 | 34.005 | 0.008 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.068 | 2.840 | 0.076 | 0.068 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a800000000000001e1 | 36.465 | 2.194 | n/a | 0.000 | 0.000 | 0.463 | 19.028 | 0.005 | 14.693 | 0.021 | 0.000 | n/a | n/a | 0.062 | 2.194 | 0.060 | 0.062 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000125 | 36.415 | 2.215 | n/a | 0.000 | 0.000 | 7.459 | 25.459 | 0.023 | 0.000 | 1.199 | 0.000 | n/a | n/a | 0.060 | 2.215 | 0.061 | 0.060 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a800000000000000f4 | 35.827 | 4.734 | n/a | 0.000 | 0.000 | 0.888 | 29.975 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.170 | 4.734 | 0.132 | 0.170 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a800000000000000f1 | 35.500 | 4.832 | n/a | 0.000 | 0.000 | 0.574 | 29.874 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.170 | 4.832 | 0.136 | 0.170 | gw-r/thread-45/journal/page | none observed |
| c74efd5ea0d3c6a800000000000001f1 | 34.415 | 4.564 | n/a | 0.000 | 0.000 | 0.550 | 29.103 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.152 | 4.564 | 0.133 | 0.152 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000020b | 33.994 | 6.811 | n/a | 0.000 | 0.000 | 0.500 | 26.506 | 0.005 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.150 | 6.811 | 0.200 | 0.150 | gw-r/thread-47/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000016e | 33.909 | 3.241 | n/a | 0.000 | 0.000 | 2.372 | 28.082 | 0.011 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.119 | 3.241 | 0.096 | 0.119 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a800000000000001dc | 33.862 | 3.815 | n/a | 0.000 | 0.000 | 0.798 | 29.082 | 0.006 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.129 | 3.815 | 0.113 | 0.129 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a800000000000001f7 | 33.687 | 3.524 | n/a | 0.000 | 0.000 | 0.577 | 29.466 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.061 | 3.524 | 0.105 | 0.061 | gw-r/thread-51/journal/page | none observed |
| c74efd5ea0d3c6a800000000000000ec | 33.653 | 2.345 | n/a | 0.000 | 0.000 | 0.373 | 30.812 | 0.014 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.067 | 2.345 | 0.070 | 0.067 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000017c | 33.253 | 2.340 | n/a | 0.000 | 0.000 | 1.384 | 29.415 | 0.017 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.056 | 2.340 | 0.070 | 0.056 | gw-r/thread-51/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000161 | 32.828 | 6.883 | n/a | 0.000 | 0.000 | 0.464 | 25.225 | 0.019 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.154 | 6.883 | 0.210 | 0.154 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a800000000000000e2 | 32.786 | 5.722 | n/a | 0.000 | 0.000 | 3.917 | 22.927 | 0.014 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.172 | 5.722 | 0.175 | 0.172 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000131 | 32.270 | 3.865 | n/a | 0.000 | 0.000 | 0.685 | 27.578 | 0.011 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.065 | 3.865 | 0.120 | 0.065 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a800000000000001e7 | 32.177 | 2.238 | n/a | 0.000 | 0.000 | 0.464 | 29.380 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.058 | 2.238 | 0.070 | 0.058 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-10 / internal (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.959 | n/a | n/a | n/a | 2.572 | n/a | 0.000 | 0.000 | 0.618 | 5.322 | 0.005 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.069 | 2.572 | 0.318 | 0.069 |
| p99 | 27.258 | n/a | n/a | n/a | 6.122 | n/a | 0.000 | 0.000 | 6.721 | 19.606 | 0.198 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.417 | 6.122 | 0.720 | 0.417 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c74efd5ea0d3c6a8000000000000035c | 1002.660 | 0.137 | n/a | 0.000 | 0.000 | 0.613 | 1000.746 | 0.006 | 0.000 | 0.044 | 0.000 | n/a | n/a | 1.113 | 0.137 | 0.000 | 1.113 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000023b | 27.258 | 8.556 | n/a | 0.000 | 0.000 | 0.664 | 17.563 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.417 | 8.556 | 0.314 | 0.417 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000289 | 22.324 | 2.195 | n/a | 0.000 | 0.000 | 0.422 | 19.606 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.064 | 2.195 | 0.098 | 0.064 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a800000000000002cb | 20.889 | 2.727 | n/a | 0.000 | 0.000 | 5.929 | 12.131 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.057 | 2.727 | 0.131 | 0.057 | gw-r/thread-47/journal/page | none observed |
| c74efd5ea0d3c6a800000000000002d1 | 20.726 | 5.565 | n/a | 0.000 | 0.000 | 1.274 | 13.652 | 0.005 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.173 | 5.565 | 0.268 | 0.173 | gw-r/thread-51/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000276 | 18.574 | 4.491 | n/a | 0.000 | 0.000 | 1.663 | 12.222 | 0.007 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.126 | 4.491 | 0.242 | 0.126 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000024c | 17.011 | 2.445 | n/a | 0.000 | 0.000 | 0.477 | 13.875 | 0.016 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.164 | 2.445 | 0.144 | 0.164 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000330 | 16.483 | 4.458 | n/a | 0.000 | 0.000 | 0.642 | 11.215 | 0.008 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.119 | 4.458 | 0.270 | 0.119 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000326 | 15.288 | 4.504 | n/a | 0.000 | 0.000 | 0.690 | 9.996 | 0.005 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.080 | 4.504 | 0.295 | 0.080 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a800000000000002e7 | 15.246 | 6.122 | n/a | 0.000 | 0.000 | 2.383 | 6.636 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.075 | 6.122 | 0.402 | 0.075 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000293 | 14.910 | 2.217 | n/a | 0.000 | 0.000 | 5.615 | 6.940 | 0.004 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.081 | 2.217 | 0.149 | 0.081 | gw-r/thread-47/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000026f | 14.702 | 5.167 | n/a | 0.000 | 0.000 | 0.466 | 8.956 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.088 | 5.167 | 0.351 | 0.088 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000029c | 14.623 | 2.274 | n/a | 0.000 | 0.000 | 0.483 | 11.741 | 0.016 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.053 | 2.274 | 0.156 | 0.053 | gw-r/thread-47/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000035b | 14.613 | 3.379 | n/a | 0.000 | 0.000 | 0.421 | 10.680 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.095 | 3.379 | 0.231 | 0.095 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000261 | 14.583 | 2.109 | n/a | 0.000 | 0.000 | 0.442 | 11.940 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.064 | 2.109 | 0.145 | 0.064 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a800000000000002dd | 14.325 | 2.541 | n/a | 0.000 | 0.000 | 0.458 | 11.245 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.048 | 2.541 | 0.177 | 0.048 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a800000000000002a5 | 14.091 | 5.993 | n/a | 0.000 | 0.000 | 3.556 | 4.410 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.090 | 5.993 | 0.425 | 0.090 | node-14/thread-2/replica.publish | none observed |
| c74efd5ea0d3c6a800000000000002fe | 13.875 | 2.143 | n/a | 0.000 | 0.000 | 0.362 | 11.276 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.050 | 2.143 | 0.154 | 0.050 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a800000000000002c5 | 13.837 | 4.441 | n/a | 0.000 | 0.000 | 1.942 | 7.345 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.080 | 4.441 | 0.321 | 0.080 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a800000000000002fa | 13.689 | 1.961 | n/a | 0.000 | 0.000 | 0.670 | 10.992 | 0.004 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.044 | 1.961 | 0.143 | 0.044 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-25 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.784 | n/a | n/a | n/a | 2.350 | n/a | 0.000 | 0.000 | 0.527 | 21.114 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.057 | 2.350 | 0.099 | 0.057 |
| p99 | 47.088 | n/a | n/a | n/a | 5.063 | n/a | 0.000 | 0.000 | 5.518 | 41.152 | 0.155 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.161 | 5.063 | 0.199 | 0.161 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c74efd5ea0d3c6a80000000000000489 | 1003.078 | 0.206 | n/a | 0.000 | 0.000 | 0.758 | 1000.866 | 0.007 | 0.000 | 0.072 | 0.000 | n/a | n/a | 1.169 | 0.206 | 0.000 | 1.169 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000048c | 47.088 | 5.100 | n/a | 0.000 | 0.000 | 0.707 | 41.152 | 0.002 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.096 | 5.100 | 0.108 | 0.096 | gw-r/thread-45/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000416 | 34.098 | 3.893 | n/a | 0.000 | 0.000 | 0.586 | 29.448 | 0.011 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.097 | 3.893 | 0.114 | 0.097 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a800000000000003d7 | 32.160 | 4.499 | n/a | 0.000 | 0.000 | 4.235 | 23.321 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.061 | 4.499 | 0.140 | 0.061 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000045d | 32.086 | 2.427 | n/a | 0.000 | 0.000 | 0.484 | 29.010 | 0.009 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.093 | 2.427 | 0.076 | 0.093 | gw-r/thread-45/journal/page | none observed |
| c74efd5ea0d3c6a800000000000003fa | 32.077 | 2.221 | n/a | 0.000 | 0.000 | 1.237 | 28.512 | 0.009 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.055 | 2.221 | 0.069 | 0.055 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000365 | 32.052 | 2.560 | n/a | 0.000 | 0.000 | 2.415 | 26.981 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.056 | 2.560 | 0.080 | 0.056 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000043f | 31.980 | 1.947 | n/a | 0.000 | 0.000 | 0.677 | 29.219 | 0.012 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.063 | 1.947 | 0.061 | 0.063 | gw-r/thread-51/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000438 | 31.727 | 2.794 | n/a | 0.000 | 0.000 | 0.523 | 28.298 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.067 | 2.794 | 0.088 | 0.067 | gw-r/thread-51/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000042d | 31.534 | 4.180 | n/a | 0.000 | 0.000 | 0.509 | 26.736 | 0.002 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.092 | 4.180 | 0.133 | 0.092 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000037a | 31.442 | 4.434 | n/a | 0.000 | 0.000 | 0.469 | 26.437 | 0.003 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.090 | 4.434 | 0.141 | 0.090 | gw-r/thread-47/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000479 | 31.205 | 1.927 | n/a | 0.000 | 0.000 | 0.423 | 28.742 | 0.008 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.057 | 1.927 | 0.062 | 0.057 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a800000000000003bf | 30.575 | 4.513 | n/a | 0.000 | 0.000 | 0.619 | 25.295 | 0.008 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.082 | 4.513 | 0.148 | 0.082 | gw-r/thread-47/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000043b | 30.528 | 2.927 | n/a | 0.000 | 0.000 | 0.411 | 27.032 | 0.010 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.099 | 2.927 | 0.096 | 0.099 | gw-r/thread-45/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000387 | 30.399 | 2.045 | n/a | 0.000 | 0.000 | 0.689 | 27.545 | 0.008 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.048 | 2.045 | 0.067 | 0.048 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a800000000000003f1 | 30.228 | 4.296 | n/a | 0.000 | 0.000 | 0.613 | 25.229 | 0.008 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.063 | 4.296 | 0.142 | 0.063 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000376 | 30.210 | 4.939 | n/a | 0.000 | 0.000 | 0.530 | 24.635 | 0.002 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.092 | 4.939 | 0.164 | 0.092 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a800000000000003a0 | 29.999 | 4.427 | n/a | 0.000 | 0.000 | 0.694 | 23.633 | 0.002 | 0.000 | 1.182 | 0.000 | n/a | n/a | 0.061 | 4.427 | 0.148 | 0.061 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000380 | 29.756 | 4.204 | n/a | 0.000 | 0.000 | 0.474 | 24.985 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.081 | 4.204 | 0.141 | 0.081 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000423 | 29.538 | 2.115 | n/a | 0.000 | 0.000 | 0.305 | 27.039 | 0.005 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.056 | 2.115 | 0.072 | 0.056 | gw-r/thread-50/journal/page | none observed |

## P3 / idle-50 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 49.987 | n/a | n/a | n/a | 2.394 | n/a | 0.000 | 0.000 | 0.492 | 46.506 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.060 | 2.394 | 0.048 | 0.060 |
| p99 | 100.429 | n/a | n/a | n/a | 4.982 | n/a | 0.000 | 0.000 | 2.692 | 95.685 | 0.134 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.183 | 4.982 | 0.097 | 0.183 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c74efd5ea0d3c6a800000000000005b6 | 1002.784 | 0.171 | n/a | 0.000 | 0.000 | 0.681 | 1000.721 | 0.021 | 0.000 | 0.035 | 0.000 | n/a | n/a | 1.156 | 0.171 | 0.000 | 1.156 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a800000000000005ba | 100.429 | 4.053 | n/a | 0.000 | 0.000 | 0.517 | 95.685 | 0.020 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.100 | 4.053 | 0.040 | 0.100 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000525 | 85.152 | 2.283 | n/a | 0.000 | 0.000 | 0.443 | 82.312 | 0.009 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.061 | 2.283 | 0.027 | 0.061 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000559 | 58.371 | 4.223 | n/a | 0.000 | 0.000 | 0.492 | 53.545 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.100 | 4.223 | 0.072 | 0.100 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000053e | 57.824 | 3.933 | n/a | 0.000 | 0.000 | 0.675 | 53.068 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.098 | 3.933 | 0.068 | 0.098 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000596 | 56.543 | 5.009 | n/a | 0.000 | 0.000 | 0.306 | 51.085 | 0.010 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.088 | 5.009 | 0.089 | 0.088 | gw-r/thread-47/journal/page | none observed |
| c74efd5ea0d3c6a800000000000004b0 | 56.409 | 4.356 | n/a | 0.000 | 0.000 | 0.588 | 51.287 | 0.005 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.155 | 4.356 | 0.077 | 0.155 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000550 | 56.087 | 2.781 | n/a | 0.000 | 0.000 | 0.400 | 52.813 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.056 | 2.781 | 0.050 | 0.056 | gw-r/thread-45/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000500 | 55.226 | 4.733 | n/a | 0.000 | 0.000 | 0.450 | 49.845 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.159 | 4.733 | 0.086 | 0.159 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000056c | 55.103 | 3.839 | n/a | 0.000 | 0.000 | 0.540 | 50.624 | 0.003 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.058 | 3.839 | 0.070 | 0.058 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a800000000000004a8 | 54.779 | 4.982 | n/a | 0.000 | 0.000 | 0.458 | 49.183 | 0.013 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.099 | 4.982 | 0.091 | 0.099 | gw-r/thread-47/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000560 | 54.701 | 4.379 | n/a | 0.000 | 0.000 | 0.719 | 49.482 | 0.009 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.096 | 4.379 | 0.080 | 0.096 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000053a | 54.664 | 2.194 | n/a | 0.000 | 0.000 | 0.392 | 51.989 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.052 | 2.194 | 0.040 | 0.052 | gw-r/thread-45/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000504 | 54.347 | 2.014 | n/a | 0.000 | 0.000 | 0.429 | 51.833 | 0.002 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.054 | 2.014 | 0.037 | 0.054 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a800000000000004f8 | 54.182 | 1.972 | n/a | 0.000 | 0.000 | 0.395 | 51.719 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.052 | 1.972 | 0.036 | 0.052 | gw-r/thread-47/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000052d | 53.820 | 1.990 | n/a | 0.000 | 0.000 | 0.374 | 51.373 | 0.006 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.058 | 1.990 | 0.037 | 0.058 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000057d | 53.759 | 3.656 | n/a | 0.000 | 0.000 | 0.532 | 49.508 | 0.002 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.049 | 3.656 | 0.068 | 0.049 | gw-r/thread-47/journal/page | none observed |
| c74efd5ea0d3c6a800000000000005a5 | 53.708 | 2.589 | n/a | 0.000 | 0.000 | 0.306 | 50.738 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.064 | 2.589 | 0.048 | 0.064 | gw-r/thread-51/journal/page | none observed |
| c74efd5ea0d3c6a800000000000004c5 | 53.456 | 3.154 | n/a | 0.000 | 0.000 | 0.420 | 49.766 | 0.010 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.056 | 3.154 | 0.059 | 0.056 | gw-r/thread-47/journal/page | none observed |
| c74efd5ea0d3c6a800000000000004b6 | 53.454 | 3.170 | n/a | 0.000 | 0.000 | 0.645 | 49.468 | 0.005 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.116 | 3.170 | 0.059 | 0.116 | gw-r/thread-52/journal/page | none observed |

## P3 / idle-100 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 100.191 | n/a | n/a | n/a | 2.365 | n/a | 0.000 | 0.000 | 0.495 | 96.846 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.061 | 2.365 | 0.024 | 0.061 |
| p99 | 255.312 | n/a | n/a | n/a | 4.985 | n/a | 0.000 | 0.000 | 3.415 | 250.308 | 0.637 | 6.486 | 0.085 | 0.000 | n/a | n/a | 0.167 | 4.985 | 0.051 | 0.167 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c74efd5ea0d3c6a800000000000006e4 | 1002.698 | 0.111 | n/a | 0.000 | 0.000 | 0.858 | 1000.584 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 1.105 | 0.111 | 0.000 | 1.105 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a800000000000006e6 | 255.312 | 4.217 | n/a | 0.000 | 0.000 | 0.644 | 250.308 | 0.004 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.121 | 4.217 | 0.017 | 0.121 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a800000000000005cd | 113.094 | 2.148 | n/a | 0.000 | 0.000 | 0.406 | 102.379 | 0.004 | 8.076 | 0.020 | 0.000 | n/a | n/a | 0.061 | 2.148 | 0.019 | 0.061 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a800000000000005eb | 106.982 | 2.645 | n/a | 0.000 | 0.000 | 0.406 | 103.834 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.055 | 2.645 | 0.025 | 0.055 | gw-r/thread-51/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000650 | 106.800 | 4.914 | n/a | 0.000 | 0.000 | 0.302 | 101.445 | 0.005 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.112 | 4.914 | 0.046 | 0.112 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000677 | 106.166 | 2.379 | n/a | 0.000 | 0.000 | 1.124 | 102.548 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.056 | 2.379 | 0.022 | 0.056 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000693 | 105.417 | 4.645 | n/a | 0.000 | 0.000 | 0.697 | 100.000 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.064 | 4.645 | 0.044 | 0.064 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000625 | 105.392 | 2.381 | n/a | 0.000 | 0.000 | 3.415 | 99.475 | 0.007 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.061 | 2.381 | 0.023 | 0.061 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000061a | 105.045 | 4.607 | n/a | 0.000 | 0.000 | 0.469 | 99.832 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.125 | 4.607 | 0.044 | 0.125 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a800000000000005f2 | 104.872 | 3.282 | n/a | 0.000 | 0.000 | 0.585 | 100.281 | 0.637 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.068 | 3.282 | 0.031 | 0.068 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a800000000000006db | 104.664 | 5.022 | n/a | 0.000 | 0.000 | 1.057 | 98.396 | 0.006 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.122 | 5.022 | 0.048 | 0.122 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a800000000000006ab | 104.592 | 2.067 | n/a | 0.000 | 0.000 | 0.379 | 102.028 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.061 | 2.067 | 0.020 | 0.061 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000672 | 104.264 | 3.402 | n/a | 0.000 | 0.000 | 0.571 | 100.101 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.138 | 3.402 | 0.033 | 0.138 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000683 | 104.046 | 1.961 | n/a | 0.000 | 0.000 | 0.413 | 101.563 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.054 | 1.961 | 0.019 | 0.054 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a800000000000005d5 | 104.029 | 2.847 | n/a | 0.000 | 0.000 | 0.614 | 100.482 | 0.002 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.058 | 2.847 | 0.027 | 0.058 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a800000000000006e2 | 103.760 | 3.009 | n/a | 0.000 | 0.000 | 0.284 | 100.101 | 0.299 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.054 | 3.009 | 0.029 | 0.054 | gw-r/thread-51/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000639 | 103.662 | 4.200 | n/a | 0.000 | 0.000 | 0.602 | 98.721 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.096 | 4.200 | 0.041 | 0.096 | gw-r/thread-45/journal/page | none observed |
| c74efd5ea0d3c6a800000000000005dc | 103.658 | 3.442 | n/a | 0.000 | 0.000 | 0.577 | 99.506 | 0.009 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.067 | 3.442 | 0.033 | 0.067 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a800000000000006b9 | 103.366 | 1.979 | n/a | 0.000 | 0.000 | 0.400 | 100.877 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.063 | 1.979 | 0.019 | 0.063 | gw-r/thread-47/journal/page | none observed |
| c74efd5ea0d3c6a800000000000006af | 103.003 | 2.530 | n/a | 0.000 | 0.000 | 1.096 | 99.273 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.062 | 2.530 | 0.025 | 0.062 | gw-r/thread-47/journal/page | none observed |

## P3 / idle-250 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 250.326 | n/a | n/a | n/a | 2.473 | n/a | 0.000 | 0.000 | 0.564 | 246.656 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.068 | 2.473 | 0.010 | 0.068 |
| p99 | 500.743 | n/a | n/a | n/a | 4.516 | n/a | 0.000 | 0.000 | 3.588 | 497.842 | 0.014 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.199 | 4.516 | 0.018 | 0.199 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c74efd5ea0d3c6a80000000000000810 | 1005.791 | 0.228 | n/a | 0.000 | 0.000 | 3.868 | 1000.435 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 1.235 | 0.228 | 0.000 | 1.235 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000813 | 500.743 | 2.257 | n/a | 0.000 | 0.000 | 0.513 | 497.842 | 0.008 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.063 | 2.257 | 0.005 | 0.063 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000076e | 276.298 | 1.990 | n/a | 0.000 | 0.000 | 0.571 | 273.615 | 0.006 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.060 | 1.990 | 0.007 | 0.060 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000715 | 257.828 | 2.431 | n/a | 0.000 | 0.000 | 0.391 | 254.795 | 0.006 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.180 | 2.431 | 0.009 | 0.180 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000767 | 257.231 | 2.534 | n/a | 0.000 | 0.000 | 0.899 | 243.196 | 0.003 | 10.521 | 0.011 | 0.000 | n/a | n/a | 0.066 | 2.534 | 0.010 | 0.066 | gw-r/thread-45/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000760 | 256.305 | 3.720 | n/a | 0.000 | 0.000 | 0.612 | 251.800 | 0.014 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.135 | 3.720 | 0.015 | 0.135 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a800000000000006f8 | 255.770 | 4.219 | n/a | 0.000 | 0.000 | 0.483 | 250.924 | 0.007 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.078 | 4.219 | 0.016 | 0.078 | gw-r/thread-45/journal/page | none observed |
| c74efd5ea0d3c6a800000000000007ca | 255.642 | 4.223 | n/a | 0.000 | 0.000 | 0.705 | 250.606 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.071 | 4.223 | 0.017 | 0.071 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a800000000000007bd | 255.369 | 2.594 | n/a | 0.000 | 0.000 | 2.301 | 250.347 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.076 | 2.594 | 0.010 | 0.076 | gw-r/thread-45/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000754 | 254.270 | 4.323 | n/a | 0.000 | 0.000 | 0.858 | 248.931 | 0.003 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.117 | 4.323 | 0.017 | 0.117 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000744 | 254.228 | 4.183 | n/a | 0.000 | 0.000 | 0.561 | 249.343 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.102 | 4.183 | 0.016 | 0.102 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000806 | 254.031 | 2.613 | n/a | 0.000 | 0.000 | 0.435 | 250.885 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.068 | 2.613 | 0.010 | 0.068 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a800000000000007a5 | 253.879 | 3.849 | n/a | 0.000 | 0.000 | 0.454 | 249.449 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.064 | 3.849 | 0.015 | 0.064 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000711 | 253.745 | 4.377 | n/a | 0.000 | 0.000 | 0.836 | 248.307 | 0.002 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.199 | 4.377 | 0.017 | 0.199 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000800 | 253.739 | 5.479 | n/a | 0.000 | 0.000 | 0.495 | 247.612 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.100 | 5.479 | 0.022 | 0.100 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a800000000000007b4 | 253.647 | 4.214 | n/a | 0.000 | 0.000 | 0.560 | 248.725 | 0.007 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.101 | 4.214 | 0.017 | 0.101 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000737 | 253.625 | 3.637 | n/a | 0.000 | 0.000 | 0.550 | 249.320 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.064 | 3.637 | 0.014 | 0.064 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000781 | 253.568 | 2.090 | n/a | 0.000 | 0.000 | 0.554 | 250.803 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.073 | 2.090 | 0.008 | 0.073 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000724 | 253.508 | 3.297 | n/a | 0.000 | 0.000 | 0.860 | 249.254 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.056 | 3.297 | 0.013 | 0.056 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000708 | 253.420 | 2.569 | n/a | 0.000 | 0.000 | 0.763 | 249.985 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.066 | 2.569 | 0.010 | 0.066 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-500 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 500.107 | n/a | n/a | n/a | 2.898 | n/a | 0.000 | 0.000 | 0.565 | 495.651 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.074 | 3.135 | 0.006 | 0.074 |
| p99 | 1002.290 | n/a | n/a | n/a | 7.381 | n/a | 1.450 | 0.000 | 4.214 | 1000.626 | 0.022 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.103 | 7.476 | 0.015 | 1.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c74efd5ea0d3c6a80000000000000940 | 1003.965 | 2.313 | n/a | 0.000 | 0.000 | 0.472 | 1001.090 | 0.003 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.067 | 2.313 | 0.002 | 0.067 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000093e | 1002.290 | 0.119 | n/a | 0.000 | 0.000 | 0.416 | 1000.626 | 0.003 | 0.000 | 0.022 | 0.000 | n/a | n/a | 1.103 | 0.119 | 0.000 | 1.103 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a800000000000008c5 | 515.209 | 3.443 | n/a | 0.850 | 0.000 | 0.494 | 510.290 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.101 | 4.292 | 0.008 | 0.101 | gw-r/thread-51/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000821 | 509.682 | 2.505 | n/a | 0.000 | 0.000 | 0.455 | 506.623 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.068 | 2.505 | 0.005 | 0.068 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a800000000000008a2 | 509.480 | 3.639 | n/a | 0.763 | 0.000 | 0.558 | 504.417 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.073 | 4.402 | 0.009 | 0.073 | gw-r/thread-51/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000929 | 507.954 | 2.738 | n/a | 0.000 | 0.000 | 0.592 | 504.530 | 0.003 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.066 | 2.738 | 0.005 | 0.066 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000087e | 507.829 | 3.479 | n/a | 0.000 | 0.000 | 1.855 | 502.342 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.119 | 3.479 | 0.007 | 0.119 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000084f | 507.398 | 3.439 | n/a | 0.000 | 0.000 | 0.492 | 503.381 | 0.004 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.065 | 3.439 | 0.007 | 0.065 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a800000000000008df | 506.881 | 5.235 | n/a | 1.207 | 0.000 | 0.599 | 499.696 | 0.003 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.118 | 6.441 | 0.013 | 0.118 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000815 | 506.865 | 2.186 | n/a | 0.000 | 0.000 | 0.451 | 504.092 | 0.008 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.071 | 2.186 | 0.004 | 0.071 | gw-r/thread-51/journal/page | none observed |
| c74efd5ea0d3c6a800000000000008f5 | 506.501 | 4.372 | n/a | 0.799 | 0.000 | 0.803 | 500.411 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.075 | 5.171 | 0.010 | 0.075 | gw-r/thread-45/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000883 | 506.075 | 7.958 | n/a | 1.268 | 0.000 | 2.345 | 494.351 | 0.003 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.131 | 9.225 | 0.018 | 0.131 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000091b | 505.784 | 2.680 | n/a | 0.000 | 0.000 | 0.459 | 502.518 | 0.010 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.080 | 2.680 | 0.005 | 0.080 | gw-r/thread-51/journal/page | none observed |
| c74efd5ea0d3c6a800000000000008af | 504.865 | 3.983 | n/a | 0.820 | 0.000 | 0.615 | 499.353 | 0.003 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.067 | 4.803 | 0.010 | 0.067 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000937 | 504.749 | 4.289 | n/a | 0.000 | 0.000 | 0.565 | 499.738 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.115 | 4.289 | 0.008 | 0.115 | gw-r/thread-45/journal/page | none observed |
| c74efd5ea0d3c6a800000000000008e7 | 504.692 | 5.698 | n/a | 0.000 | 0.000 | 3.505 | 495.323 | 0.008 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.123 | 5.698 | 0.011 | 0.123 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a800000000000008b9 | 504.521 | 2.530 | n/a | 0.894 | 0.000 | 0.554 | 500.401 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.085 | 3.424 | 0.007 | 0.085 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000926 | 504.493 | 2.702 | n/a | 0.000 | 0.000 | 0.635 | 501.057 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.064 | 2.702 | 0.005 | 0.064 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000089c | 504.247 | 6.765 | n/a | 0.711 | 0.000 | 0.463 | 496.185 | 0.003 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.091 | 7.476 | 0.015 | 0.091 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a800000000000008db | 504.225 | 3.481 | n/a | 3.024 | 0.000 | 0.464 | 497.151 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.076 | 6.506 | 0.013 | 0.076 | gw-r/thread-50/journal/page | none observed |

## P3 / idle-1000 / internal (160 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 999.635 | n/a | n/a | n/a | 2.912 | n/a | 0.000 | 0.000 | 0.571 | 995.064 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.072 | 3.100 | 0.003 | 0.072 |
| p99 | 1007.313 | n/a | n/a | n/a | 5.950 | n/a | 1.032 | 0.000 | 5.068 | 1001.326 | 0.009 | 12.488 | 0.063 | 0.000 | n/a | n/a | 1.172 | 6.690 | 0.712 | 1.172 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c74efd5ea0d3c6a80000000000000a5b | 1019.473 | 2.930 | n/a | 0.000 | 0.000 | 0.591 | 1004.106 | 0.005 | 11.743 | 0.034 | 0.000 | n/a | n/a | 0.064 | 2.930 | 0.003 | 0.064 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a800000000000009a9 | 1007.313 | 3.354 | n/a | 0.596 | 0.000 | 3.249 | 1000.010 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.072 | 3.950 | 0.004 | 0.072 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a800000000000009fb | 1005.879 | 5.621 | n/a | 0.769 | 0.000 | 0.659 | 998.623 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.181 | 6.390 | 0.006 | 0.181 | gw-r/thread-51/journal/page | none observed |
| c74efd5ea0d3c6a800000000000009ce | 1005.873 | 5.593 | n/a | 0.826 | 0.000 | 1.084 | 998.264 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.074 | 6.418 | 0.006 | 0.074 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000a11 | 1005.735 | 5.633 | n/a | 0.000 | 0.000 | 0.616 | 999.354 | 0.003 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.108 | 5.633 | 0.006 | 0.108 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000a17 | 1004.635 | 5.481 | n/a | 0.000 | 0.000 | 0.747 | 998.294 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.062 | 5.481 | 0.005 | 0.062 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a8000000000000097e | 1004.552 | 2.682 | n/a | 0.000 | 0.000 | 0.516 | 1001.234 | 0.009 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.064 | 2.682 | 0.003 | 0.064 | gw-r/thread-45/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000a42 | 1004.489 | 2.668 | n/a | 0.000 | 0.000 | 0.398 | 1001.326 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.066 | 2.668 | 0.003 | 0.066 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000a21 | 1004.362 | 2.802 | n/a | 0.000 | 0.000 | 0.666 | 1000.789 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.073 | 2.802 | 0.003 | 0.073 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000a6f | 1004.275 | 5.808 | n/a | 0.730 | 0.000 | 0.491 | 997.030 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.188 | 6.538 | 0.007 | 0.188 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a800000000000009b0 | 1004.220 | 5.721 | n/a | 0.735 | 0.000 | 0.584 | 997.012 | 0.009 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.118 | 6.456 | 0.006 | 0.118 | gw-r/thread-51/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000a28 | 1004.188 | 3.317 | n/a | 0.594 | 0.000 | 0.743 | 999.438 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.069 | 3.912 | 0.004 | 0.069 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000974 | 1003.961 | 2.846 | n/a | 0.000 | 0.000 | 5.068 | 995.950 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.066 | 2.846 | 0.003 | 0.066 | gw-r/thread-52/journal/page | none observed |
| c74efd5ea0d3c6a800000000000009e2 | 1003.844 | 5.557 | n/a | 0.000 | 0.000 | 0.740 | 997.392 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.127 | 5.557 | 0.006 | 0.127 | gw-r/thread-51/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000a05 | 1003.553 | 2.797 | n/a | 0.797 | 0.000 | 0.524 | 999.343 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.063 | 3.594 | 0.004 | 0.063 | gw-r/thread-48/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000a51 | 1003.526 | 3.865 | n/a | 0.000 | 0.000 | 0.417 | 999.063 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.154 | 3.865 | 0.004 | 0.154 | gw-r/thread-66/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000994 | 1003.418 | 0.156 | n/a | 0.000 | 0.000 | 0.720 | 1001.231 | 0.008 | 0.000 | 0.047 | 0.000 | n/a | n/a | 1.256 | 0.156 | 0.000 | 1.256 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000a38 | 1003.377 | 3.141 | n/a | 0.000 | 0.000 | 0.423 | 999.716 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.071 | 3.141 | 0.003 | 0.071 | gw-r/thread-49/journal/page | none observed |
| c74efd5ea0d3c6a80000000000000a1a | 1003.170 | 4.146 | n/a | 0.000 | 0.000 | 0.642 | 998.246 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.106 | 4.146 | 0.004 | 0.106 | gw-r/thread-50/journal/page | none observed |
| c74efd5ea0d3c6a800000000000009d6 | 1003.029 | 3.145 | n/a | 0.594 | 0.000 | 0.630 | 998.533 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.072 | 3.739 | 0.004 | 0.072 | gw-r/thread-66/journal/page | none observed |

## P3 / warmup / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.486 | n/a | n/a | n/a | 0.050 | n/a | 0.000 | 0.000 | 0.650 | 200.763 | 0.008 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.082 | 0.050 | 0.000 | 0.082 |
| p99 | 205.469 | n/a | n/a | n/a | 0.059 | n/a | 0.000 | 0.000 | 1.551 | 204.521 | 0.020 | 29.568 | 0.136 | 0.000 | n/a | n/a | 0.146 | 0.059 | 0.001 | 0.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dc70aa84be01a3f700000000000000ce | 205.469 | 0.050 | n/a | 0.000 | 0.000 | 0.693 | 204.521 | 0.008 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.146 | 0.050 | 0.000 | 0.146 | gw-r/thread-47/journal/page | none observed |
| dc70aa84be01a3f700000000000000cd | 202.913 | 0.029 | n/a | 0.000 | 0.000 | 1.551 | 201.113 | 0.007 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.078 | 0.029 | 0.000 | 0.078 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f700000000000000cf | 201.899 | 0.051 | n/a | 0.000 | 0.000 | 0.763 | 200.832 | 0.017 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.144 | 0.051 | 0.000 | 0.144 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f700000000000000cc | 201.486 | 0.037 | n/a | 0.000 | 0.000 | 0.507 | 200.763 | 0.007 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.104 | 0.037 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f700000000000000d0 | 141.860 | 0.043 | n/a | 0.000 | 0.000 | 0.557 | 141.103 | 0.020 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.072 | 0.043 | 0.000 | 0.072 | gw-r/thread-66/journal/page | none observed |
| dc70aa84be01a3f70000000000000084 | 65.363 | 0.050 | n/a | 0.000 | 0.000 | 0.560 | 64.608 | 0.014 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.075 | 0.050 | 0.001 | 0.075 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f7000000000000001d | 51.373 | 0.059 | n/a | 0.000 | 0.000 | 0.650 | 20.939 | 0.008 | 29.568 | 0.067 | 0.000 | n/a | n/a | 0.082 | 0.059 | 0.001 | 0.082 | gw-r/thread--1/jdk.GCPhasePause | none observed |

## P3 / idle-10 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.462 | n/a | n/a | n/a | 0.034 | n/a | 0.000 | 0.000 | 0.616 | 200.738 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.074 | 0.034 | 0.000 | 0.074 |
| p99 | 202.183 | n/a | n/a | n/a | 0.049 | n/a | 0.000 | 0.000 | 0.793 | 201.161 | 0.011 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.092 | 0.049 | 0.000 | 0.092 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dc70aa84be01a3f7000000000000015e | 202.183 | 0.049 | n/a | 0.000 | 0.000 | 0.793 | 201.161 | 0.011 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.092 | 0.049 | 0.000 | 0.092 | gw-r/thread-50/journal/page | none observed |
| dc70aa84be01a3f7000000000000015f | 201.502 | 0.032 | n/a | 0.000 | 0.000 | 0.617 | 200.738 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.072 | 0.032 | 0.000 | 0.072 | gw-r/thread-51/journal/page | none observed |
| dc70aa84be01a3f7000000000000015d | 201.462 | 0.032 | n/a | 0.000 | 0.000 | 0.494 | 200.804 | 0.008 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.071 | 0.032 | 0.000 | 0.071 | gw-r/thread-49/journal/page | none observed |
| dc70aa84be01a3f7000000000000015c | 201.162 | 0.034 | n/a | 0.000 | 0.000 | 0.346 | 200.650 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.077 | 0.034 | 0.000 | 0.077 | gw-r/thread-66/journal/page | none observed |
| dc70aa84be01a3f70000000000000160 | 115.696 | 0.049 | n/a | 0.000 | 0.000 | 0.616 | 114.939 | 0.003 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.074 | 0.049 | 0.000 | 0.074 | gw-r/thread-47/journal/page | none observed |

## P3 / idle-25 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.776 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.693 | 201.042 | 0.009 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.091 | 0.041 | 0.000 | 0.091 |
| p99 | 202.883 | n/a | n/a | n/a | 0.054 | n/a | 0.000 | 0.000 | 1.346 | 201.886 | 0.021 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.137 | 0.054 | 0.000 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dc70aa84be01a3f700000000000001f7 | 202.883 | 0.054 | n/a | 0.000 | 0.000 | 0.693 | 201.886 | 0.021 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.137 | 0.054 | 0.000 | 0.137 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f700000000000001f8 | 202.619 | 0.041 | n/a | 0.000 | 0.000 | 1.346 | 201.042 | 0.010 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.098 | 0.041 | 0.000 | 0.098 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f700000000000001f9 | 201.776 | 0.031 | n/a | 0.000 | 0.000 | 0.709 | 200.902 | 0.006 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 | gw-r/thread-50/journal/page | none observed |
| dc70aa84be01a3f700000000000001f6 | 201.692 | 0.032 | n/a | 0.000 | 0.000 | 0.446 | 201.045 | 0.009 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.091 | 0.032 | 0.000 | 0.091 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f700000000000001fa | 132.029 | 0.042 | n/a | 0.000 | 0.000 | 0.554 | 131.331 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.063 | 0.042 | 0.000 | 0.063 | gw-r/thread-66/journal/page | none observed |

## P3 / idle-50 / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 52.096 | n/a | n/a | n/a | 0.045 | n/a | 0.000 | 0.000 | 0.517 | 51.599 | 0.006 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.063 | 0.045 | 0.001 | 0.063 |
| p99 | 202.240 | n/a | n/a | n/a | 0.068 | n/a | 0.000 | 0.000 | 1.701 | 201.337 | 0.012 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.116 | 0.068 | 0.001 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dc70aa84be01a3f70000000000000291 | 202.240 | 0.052 | n/a | 0.000 | 0.000 | 0.858 | 201.128 | 0.009 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.116 | 0.052 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f70000000000000290 | 202.057 | 0.031 | n/a | 0.000 | 0.000 | 0.517 | 201.337 | 0.012 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.063 | 0.031 | 0.000 | 0.063 | gw-r/thread-47/journal/page | none observed |
| dc70aa84be01a3f70000000000000292 | 201.930 | 0.049 | n/a | 0.000 | 0.000 | 0.999 | 200.744 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.090 | 0.049 | 0.000 | 0.090 | gw-r/thread-66/journal/page | none observed |
| dc70aa84be01a3f70000000000000293 | 201.331 | 0.032 | n/a | 0.000 | 0.000 | 0.458 | 200.706 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.076 | 0.032 | 0.000 | 0.076 | gw-r/thread-51/journal/page | none observed |
| dc70aa84be01a3f70000000000000294 | 159.911 | 0.052 | n/a | 0.000 | 0.000 | 0.526 | 159.208 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.077 | 0.052 | 0.000 | 0.077 | gw-r/thread-49/journal/page | none observed |
| dc70aa84be01a3f70000000000000295 | 96.447 | 0.068 | n/a | 0.000 | 0.000 | 0.577 | 95.683 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.094 | 0.068 | 0.001 | 0.094 | gw-r/thread-47/journal/page | none observed |
| dc70aa84be01a3f70000000000000247 | 85.306 | 0.041 | n/a | 0.000 | 0.000 | 0.380 | 84.801 | 0.006 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.054 | 0.041 | 0.000 | 0.054 | gw-r/thread-51/journal/page | none observed |
| dc70aa84be01a3f70000000000000261 | 55.418 | 0.045 | n/a | 0.000 | 0.000 | 0.552 | 54.720 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.062 | 0.045 | 0.001 | 0.062 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f70000000000000254 | 53.315 | 0.056 | n/a | 0.000 | 0.000 | 0.456 | 52.707 | 0.002 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.077 | 0.056 | 0.001 | 0.077 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f70000000000000231 | 52.907 | 0.058 | n/a | 0.000 | 0.000 | 0.724 | 52.010 | 0.011 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.085 | 0.058 | 0.001 | 0.085 | gw-r/thread-50/journal/page | none observed |
| dc70aa84be01a3f7000000000000020d | 52.096 | 0.063 | n/a | 0.000 | 0.000 | 0.397 | 51.522 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.063 | 0.063 | 0.001 | 0.063 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f70000000000000267 | 52.083 | 0.036 | n/a | 0.000 | 0.000 | 0.773 | 51.187 | 0.007 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.059 | 0.036 | 0.001 | 0.059 | gw-r/thread-51/journal/page | none observed |
| dc70aa84be01a3f70000000000000252 | 51.953 | 0.034 | n/a | 0.000 | 0.000 | 0.262 | 51.599 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.045 | 0.034 | 0.001 | 0.045 | gw-r/thread-47/journal/page | none observed |
| dc70aa84be01a3f7000000000000024b | 51.866 | 0.047 | n/a | 0.000 | 0.000 | 0.365 | 51.349 | 0.009 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.052 | 0.047 | 0.001 | 0.052 | gw-r/thread-51/journal/page | none observed |
| dc70aa84be01a3f70000000000000287 | 51.538 | 0.037 | n/a | 0.000 | 0.000 | 0.368 | 51.039 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.054 | 0.037 | 0.001 | 0.054 | gw-r/thread-50/journal/page | none observed |
| dc70aa84be01a3f70000000000000284 | 51.364 | 0.057 | n/a | 0.000 | 0.000 | 0.443 | 50.728 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.086 | 0.057 | 0.001 | 0.086 | gw-r/thread-47/journal/page | none observed |
| dc70aa84be01a3f7000000000000026a | 51.331 | 0.042 | n/a | 0.000 | 0.000 | 0.442 | 50.746 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.063 | 0.042 | 0.001 | 0.063 | gw-r/thread-49/journal/page | none observed |
| dc70aa84be01a3f70000000000000237 | 50.784 | 0.041 | n/a | 0.000 | 0.000 | 1.701 | 48.953 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.053 | 0.041 | 0.001 | 0.053 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f7000000000000025e | 50.494 | 0.043 | n/a | 0.000 | 0.000 | 0.536 | 49.843 | 0.003 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.059 | 0.043 | 0.001 | 0.059 | gw-r/thread-47/journal/page | none observed |
| dc70aa84be01a3f70000000000000217 | 50.177 | 0.047 | n/a | 0.000 | 0.000 | 0.591 | 49.446 | 0.007 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.063 | 0.047 | 0.001 | 0.063 | gw-r/thread-45/journal/page | none observed |

## P3 / idle-100 / read (153 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 96.801 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.509 | 95.984 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.062 | 0.043 | 0.000 | 0.062 |
| p99 | 201.784 | n/a | n/a | n/a | 0.097 | n/a | 0.000 | 0.000 | 2.725 | 201.024 | 3.506 | 6.486 | 0.087 | 0.000 | n/a | n/a | 0.148 | 0.097 | 0.001 | 0.148 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dc70aa84be01a3f7000000000000032a | 202.021 | 0.041 | n/a | 0.000 | 0.000 | 0.613 | 201.203 | 0.009 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.069 | 0.041 | 0.000 | 0.069 | gw-r/thread-49/journal/page | none observed |
| dc70aa84be01a3f7000000000000032b | 201.784 | 0.045 | n/a | 0.000 | 0.000 | 0.541 | 201.024 | 0.005 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.094 | 0.045 | 0.000 | 0.094 | gw-r/thread-50/journal/page | none observed |
| dc70aa84be01a3f7000000000000032d | 201.609 | 0.031 | n/a | 0.000 | 0.000 | 0.622 | 200.821 | 0.005 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.073 | 0.031 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f7000000000000032c | 201.382 | 0.034 | n/a | 0.000 | 0.000 | 0.580 | 200.654 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.071 | 0.034 | 0.000 | 0.071 | gw-r/thread-47/journal/page | none observed |
| dc70aa84be01a3f7000000000000032e | 201.314 | 0.034 | n/a | 0.000 | 0.000 | 0.476 | 200.663 | 0.004 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.086 | 0.034 | 0.000 | 0.086 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f7000000000000029f | 109.682 | 0.039 | n/a | 0.000 | 0.000 | 0.286 | 98.383 | 2.779 | 8.076 | 0.071 | 0.000 | n/a | n/a | 0.048 | 0.039 | 0.000 | 0.048 | gw-r/thread-51/journal/page | none observed |
| dc70aa84be01a3f70000000000000329 | 104.012 | 0.039 | n/a | 0.000 | 0.000 | 0.440 | 103.422 | 0.007 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.049 | 0.039 | 0.000 | 0.049 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f700000000000002f4 | 103.521 | 0.041 | n/a | 0.000 | 0.000 | 0.429 | 99.136 | 3.781 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.055 | 0.041 | 0.000 | 0.055 | gw-r/thread-49/journal/page | none observed |
| dc70aa84be01a3f700000000000002b1 | 102.632 | 0.050 | n/a | 0.000 | 0.000 | 0.417 | 102.047 | 0.009 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.055 | 0.050 | 0.000 | 0.055 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f700000000000002ae | 102.364 | 0.052 | n/a | 0.000 | 0.000 | 0.619 | 101.608 | 0.002 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.071 | 0.052 | 0.001 | 0.071 | gw-r/thread-47/journal/page | none observed |
| dc70aa84be01a3f700000000000002dd | 102.167 | 0.063 | n/a | 0.000 | 0.000 | 0.553 | 101.420 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.092 | 0.063 | 0.001 | 0.092 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f700000000000002cb | 101.868 | 0.049 | n/a | 0.000 | 0.000 | 2.448 | 99.292 | 0.003 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.061 | 0.049 | 0.000 | 0.061 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f700000000000002e0 | 101.389 | 0.056 | n/a | 0.000 | 0.000 | 0.612 | 100.589 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.076 | 0.056 | 0.001 | 0.076 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f70000000000000315 | 101.222 | 0.054 | n/a | 0.000 | 0.000 | 0.671 | 100.050 | 0.366 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.065 | 0.054 | 0.001 | 0.065 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f700000000000002f1 | 101.045 | 0.041 | n/a | 0.000 | 0.000 | 1.007 | 99.912 | 0.002 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.067 | 0.041 | 0.000 | 0.067 | gw-r/thread-49/journal/page | none observed |
| dc70aa84be01a3f7000000000000030e | 101.020 | 0.051 | n/a | 0.000 | 0.000 | 0.683 | 96.703 | 3.479 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.068 | 0.051 | 0.001 | 0.068 | gw-r/thread-51/journal/page | none observed |
| dc70aa84be01a3f700000000000002fa | 100.699 | 0.039 | n/a | 0.000 | 0.000 | 0.487 | 96.589 | 3.506 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.058 | 0.039 | 0.000 | 0.058 | gw-r/thread-51/journal/page | none observed |
| dc70aa84be01a3f700000000000002bc | 100.336 | 0.039 | n/a | 0.000 | 0.000 | 0.450 | 99.758 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.060 | 0.039 | 0.000 | 0.060 | gw-r/thread-50/journal/page | none observed |
| dc70aa84be01a3f700000000000002c5 | 100.148 | 0.043 | n/a | 0.000 | 0.000 | 0.409 | 99.594 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.068 | 0.043 | 0.000 | 0.068 | gw-r/thread-49/journal/page | none observed |
| dc70aa84be01a3f700000000000002b6 | 100.085 | 0.036 | n/a | 0.000 | 0.000 | 3.982 | 95.984 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.052 | 0.036 | 0.000 | 0.052 | gw-r/thread-51/journal/page | none observed |

## P3 / idle-250 / read (157 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.488 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.529 | 200.698 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.074 | 0.040 | 0.000 | 0.074 |
| p99 | 204.725 | n/a | n/a | n/a | 0.085 | n/a | 0.000 | 0.000 | 3.411 | 203.986 | 0.025 | 0.000 | 0.516 | 0.000 | n/a | n/a | 0.159 | 0.085 | 0.001 | 0.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dc70aa84be01a3f700000000000003b6 | 205.403 | 0.046 | n/a | 0.000 | 0.000 | 0.467 | 204.732 | 0.009 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.083 | 0.046 | 0.000 | 0.083 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f70000000000000390 | 204.725 | 0.033 | n/a | 0.000 | 0.000 | 3.656 | 200.902 | 0.005 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.067 | 0.033 | 0.000 | 0.067 | gw-r/thread-49/journal/page | none observed |
| dc70aa84be01a3f700000000000003b2 | 204.597 | 0.034 | n/a | 0.000 | 0.000 | 0.438 | 203.986 | 0.008 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.070 | 0.034 | 0.000 | 0.070 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f7000000000000045a | 204.336 | 0.049 | n/a | 0.000 | 0.000 | 3.411 | 200.746 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.080 | 0.049 | 0.000 | 0.080 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f700000000000003ae | 203.692 | 0.053 | n/a | 0.000 | 0.000 | 2.380 | 201.087 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.122 | 0.053 | 0.000 | 0.122 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f700000000000003c6 | 203.488 | 0.036 | n/a | 0.000 | 0.000 | 2.561 | 200.764 | 0.005 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.072 | 0.036 | 0.000 | 0.072 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f7000000000000041c | 203.160 | 0.033 | n/a | 0.000 | 0.000 | 0.282 | 202.725 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.062 | 0.033 | 0.000 | 0.062 | gw-r/thread-51/journal/page | none observed |
| dc70aa84be01a3f700000000000003a0 | 202.708 | 0.034 | n/a | 0.000 | 0.000 | 1.293 | 201.220 | 0.008 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.071 | 0.034 | 0.000 | 0.071 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f70000000000000342 | 202.684 | 0.064 | n/a | 0.000 | 0.000 | 1.693 | 200.724 | 0.004 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.142 | 0.064 | 0.000 | 0.142 | gw-r/thread-47/journal/page | none observed |
| dc70aa84be01a3f700000000000003be | 202.636 | 0.055 | n/a | 0.000 | 0.000 | 1.407 | 200.986 | 0.004 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.131 | 0.055 | 0.000 | 0.131 | gw-r/thread-50/journal/page | none observed |
| dc70aa84be01a3f70000000000000366 | 202.358 | 0.036 | n/a | 0.000 | 0.000 | 0.993 | 201.147 | 0.025 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.074 | 0.036 | 0.000 | 0.074 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f700000000000003a8 | 202.356 | 0.050 | n/a | 0.000 | 0.000 | 0.641 | 201.470 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.144 | 0.050 | 0.000 | 0.144 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f700000000000003ce | 202.340 | 0.050 | n/a | 0.000 | 0.000 | 0.524 | 201.152 | 0.015 | 0.000 | 0.516 | 0.000 | n/a | n/a | 0.084 | 0.050 | 0.000 | 0.084 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f70000000000000374 | 202.283 | 0.045 | n/a | 0.000 | 0.000 | 0.594 | 201.494 | 0.003 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.107 | 0.045 | 0.000 | 0.107 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f70000000000000354 | 202.247 | 0.042 | n/a | 0.000 | 0.000 | 1.325 | 200.728 | 0.003 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.099 | 0.042 | 0.000 | 0.099 | gw-r/thread-66/journal/page | none observed |
| dc70aa84be01a3f70000000000000384 | 202.179 | 0.040 | n/a | 0.000 | 0.000 | 1.249 | 200.752 | 0.007 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.073 | 0.040 | 0.000 | 0.073 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f700000000000003e4 | 202.115 | 0.040 | n/a | 0.000 | 0.000 | 1.065 | 200.875 | 0.007 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.074 | 0.040 | 0.000 | 0.074 | gw-r/thread-66/journal/page | none observed |
| dc70aa84be01a3f70000000000000352 | 202.113 | 0.065 | n/a | 0.000 | 0.000 | 0.793 | 201.022 | 0.009 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.141 | 0.065 | 0.000 | 0.141 | gw-r/thread-47/journal/page | none observed |
| dc70aa84be01a3f700000000000003a2 | 202.094 | 0.036 | n/a | 0.000 | 0.000 | 1.167 | 200.744 | 0.005 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.078 | 0.036 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f70000000000000432 | 202.070 | 0.046 | n/a | 0.000 | 0.000 | 0.609 | 201.236 | 0.007 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.098 | 0.046 | 0.000 | 0.098 | gw-r/thread-48/journal/page | none observed |

## P3 / idle-500 / read (408 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.493 | n/a | n/a | n/a | 0.044 | n/a | 0.000 | 0.000 | 0.638 | 200.686 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.076 | 0.044 | 0.000 | 0.076 |
| p99 | 205.293 | n/a | n/a | n/a | 0.082 | n/a | 0.000 | 0.000 | 3.840 | 202.072 | 0.398 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.178 | 0.082 | 0.001 | 0.178 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dc70aa84be01a3f700000000000005b9 | 206.923 | 0.104 | n/a | 0.000 | 0.000 | 4.219 | 202.072 | 0.024 | 0.000 | 0.288 | 0.000 | n/a | n/a | 0.215 | 0.104 | 0.001 | 0.215 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f700000000000004a0 | 205.991 | 0.033 | n/a | 0.000 | 0.000 | 0.746 | 205.083 | 0.005 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.064 | 0.033 | 0.000 | 0.064 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f70000000000000517 | 205.390 | 0.046 | n/a | 0.000 | 0.000 | 3.539 | 201.641 | 0.009 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.084 | 0.046 | 0.000 | 0.084 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f7000000000000056f | 205.340 | 0.073 | n/a | 0.000 | 0.000 | 0.719 | 204.384 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.124 | 0.073 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| dc70aa84be01a3f70000000000000616 | 205.293 | 0.054 | n/a | 0.000 | 0.000 | 0.605 | 204.488 | 0.007 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.109 | 0.054 | 0.000 | 0.109 | gw-r/thread-50/journal/page | none observed |
| dc70aa84be01a3f7000000000000057b | 205.022 | 0.035 | n/a | 0.000 | 0.000 | 3.904 | 200.956 | 0.005 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.074 | 0.035 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| dc70aa84be01a3f700000000000004e4 | 204.916 | 0.049 | n/a | 0.000 | 0.000 | 4.251 | 200.501 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.083 | 0.049 | 0.000 | 0.083 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f70000000000000518 | 204.763 | 0.031 | n/a | 0.000 | 0.000 | 3.840 | 200.775 | 0.004 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.068 | 0.031 | 0.000 | 0.068 | gw-r/thread-66/journal/page | none observed |
| dc70aa84be01a3f700000000000005dd | 204.525 | 0.038 | n/a | 0.000 | 0.000 | 3.356 | 201.000 | 0.008 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.066 | 0.038 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f70000000000000556 | 204.519 | 0.037 | n/a | 0.000 | 0.000 | 3.242 | 201.072 | 0.009 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.073 | 0.037 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f700000000000005f2 | 204.342 | 0.052 | n/a | 0.000 | 0.000 | 3.319 | 200.843 | 0.004 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.079 | 0.052 | 0.000 | 0.079 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f70000000000000499 | 204.325 | 0.035 | n/a | 0.000 | 0.000 | 0.489 | 203.689 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.061 | 0.035 | 0.000 | 0.061 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f700000000000005d1 | 204.319 | 0.038 | n/a | 0.000 | 0.000 | 3.245 | 200.904 | 0.005 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.073 | 0.038 | 0.000 | 0.073 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f70000000000000586 | 203.519 | 0.031 | n/a | 0.000 | 0.000 | 2.802 | 200.588 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-49/journal/page | none observed |
| dc70aa84be01a3f700000000000005ad | 203.287 | 0.047 | n/a | 0.000 | 0.000 | 2.516 | 200.608 | 0.003 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.075 | 0.047 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f7000000000000051d | 203.072 | 0.034 | n/a | 0.000 | 0.000 | 1.750 | 201.121 | 0.009 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.077 | 0.034 | 0.000 | 0.077 | gw-r/thread-66/journal/page | none observed |
| dc70aa84be01a3f7000000000000058f | 203.050 | 0.039 | n/a | 0.000 | 0.000 | 2.033 | 200.852 | 0.004 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.071 | 0.039 | 0.000 | 0.071 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f7000000000000059e | 202.973 | 0.035 | n/a | 0.000 | 0.000 | 1.632 | 201.194 | 0.004 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.065 | 0.035 | 0.000 | 0.065 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f70000000000000523 | 202.962 | 0.035 | n/a | 0.000 | 0.000 | 2.161 | 200.661 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.059 | 0.035 | 0.000 | 0.059 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f70000000000000595 | 202.956 | 0.039 | n/a | 0.000 | 0.000 | 0.907 | 201.890 | 0.005 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.066 | 0.039 | 0.000 | 0.066 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-1000 / read (754 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.521 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.635 | 200.711 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.078 | 0.039 | 0.000 | 0.078 |
| p99 | 204.333 | n/a | n/a | n/a | 0.088 | n/a | 0.000 | 0.000 | 2.924 | 201.800 | 0.032 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.187 | 0.088 | 0.001 | 0.187 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dc70aa84be01a3f700000000000006b4 | 217.405 | 0.027 | n/a | 0.000 | 0.000 | 0.527 | 200.770 | 15.973 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.065 | 0.027 | 0.000 | 0.065 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f70000000000000709 | 205.128 | 0.088 | n/a | 0.000 | 0.000 | 4.056 | 200.801 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.139 | 0.088 | 0.000 | 0.139 | gw-r/thread-66/journal/page | none observed |
| dc70aa84be01a3f700000000000006ba | 205.109 | 0.044 | n/a | 0.000 | 0.000 | 3.876 | 201.022 | 0.006 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.088 | 0.044 | 0.000 | 0.088 | gw-r/thread-51/journal/page | none observed |
| dc70aa84be01a3f7000000000000071b | 204.954 | 0.038 | n/a | 0.000 | 0.000 | 0.726 | 204.089 | 0.006 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.068 | 0.038 | 0.000 | 0.068 | gw-r/thread-51/journal/page | none observed |
| dc70aa84be01a3f7000000000000076b | 204.919 | 0.034 | n/a | 0.000 | 0.000 | 4.140 | 200.628 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.069 | 0.034 | 0.000 | 0.069 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f70000000000000789 | 204.615 | 0.110 | n/a | 0.000 | 0.000 | 3.701 | 200.622 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.137 | 0.110 | 0.001 | 0.137 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f700000000000006a8 | 204.437 | 0.032 | n/a | 0.000 | 0.000 | 3.398 | 200.879 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.069 | 0.032 | 0.000 | 0.069 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f7000000000000081a | 204.333 | 0.054 | n/a | 0.000 | 0.000 | 2.924 | 201.151 | 0.009 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.130 | 0.054 | 0.000 | 0.130 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f70000000000000677 | 204.202 | 0.027 | n/a | 0.000 | 0.000 | 0.429 | 203.643 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.057 | 0.027 | 0.000 | 0.057 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f700000000000007c2 | 203.811 | 0.051 | n/a | 0.000 | 0.000 | 0.938 | 202.604 | 0.009 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.133 | 0.051 | 0.000 | 0.133 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f700000000000007da | 203.810 | 0.039 | n/a | 0.000 | 0.000 | 0.749 | 202.819 | 0.013 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.093 | 0.039 | 0.000 | 0.093 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f700000000000007b6 | 203.742 | 0.040 | n/a | 0.000 | 0.000 | 2.384 | 201.161 | 0.011 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.083 | 0.040 | 0.000 | 0.083 | gw-r/thread-52/journal/page | none observed |
| dc70aa84be01a3f7000000000000070f | 203.740 | 0.043 | n/a | 0.000 | 0.000 | 0.702 | 202.609 | 0.034 | 0.000 | 0.256 | 0.000 | n/a | n/a | 0.096 | 0.043 | 0.000 | 0.096 | gw-r/thread-49/journal/page | none observed |
| dc70aa84be01a3f70000000000000745 | 203.737 | 0.049 | n/a | 0.000 | 0.000 | 2.760 | 200.788 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.085 | 0.049 | 0.000 | 0.085 | gw-r/thread-51/journal/page | none observed |
| dc70aa84be01a3f700000000000008d8 | 203.665 | 0.026 | n/a | 0.000 | 0.000 | 2.750 | 188.248 | 0.008 | 12.497 | 0.071 | 0.000 | n/a | n/a | 0.066 | 0.026 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f700000000000008ec | 203.613 | 0.033 | n/a | 0.000 | 0.000 | 3.070 | 200.408 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.073 | 0.033 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |
| dc70aa84be01a3f700000000000008d6 | 203.434 | 0.057 | n/a | 0.000 | 0.000 | 0.862 | 202.224 | 0.013 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.181 | 0.057 | 0.000 | 0.181 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f700000000000008fb | 203.355 | 0.027 | n/a | 0.000 | 0.000 | 2.308 | 200.900 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.060 | 0.027 | 0.000 | 0.060 | gw-r/thread-51/journal/page | none observed |
| dc70aa84be01a3f700000000000007ff | 203.020 | 0.056 | n/a | 0.000 | 0.000 | 0.872 | 201.800 | 0.012 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.157 | 0.056 | 0.000 | 0.157 | gw-r/thread-45/journal/page | none observed |
| dc70aa84be01a3f7000000000000062c | 202.924 | 0.036 | n/a | 0.000 | 0.000 | 0.500 | 202.288 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.062 | 0.036 | 0.000 | 0.062 | gw-r/thread-48/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 1250 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.003/2.180 ms; post-ACK p50/p99: 0.331/0.884 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.964 | 10.528 | 10.447 | reported |
| All-primary p99 ms | 25.215 | 24.900 | 24.897 | <=50 |
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
| 5-10 | >=1000 | 7 | 12.212/58.084 | 11.869 | 5.486 | 13.275 | 0.152/0.018 |
| 5-10 | overlap | 114 | 14.414/36.649 | 14.090 | 8.711 | 20.341 | 0.054/0.015 |
| 5-10 | 0-50 | 532 | 10.336/22.514 | 9.934 | 5.555 | 14.525 | 0.055/0.016 |
| 5-10 | 250-1000 | 299 | 11.516/22.053 | 11.136 | 6.303 | 15.436 | 0.086/0.017 |
| 5-10 | 50-100 | 149 | 9.752/17.101 | 9.315 | 5.380 | 13.619 | 0.063/0.017 |
| 5-10 | 100-250 | 149 | 10.332/20.424 | 9.897 | 5.616 | 14.332 | 0.071/0.017 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1250 | 2 | 120.171 |

## Writer heap, GC and scheduler stalls

Source a0785bcf96f7afea3965b3028db2e27f4fbef6a9; 1250 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 370.429 / 396.805 |
| GC events / total duration / maximum ms | 242 / 517.236 / 23.657 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":238,"4":2,"8":2} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 25.215 / 2 / 120.171 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.
