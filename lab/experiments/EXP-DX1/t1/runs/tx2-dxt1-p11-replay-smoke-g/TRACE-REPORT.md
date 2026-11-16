# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (89.254 ms, trace `0d8786f241672eba000000000000006e`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (83.220 ms, trace `0d8786f241672eba0000000000000136`); `node-14/thread-0/driver.queue.subject` (83.685 ms, trace `0d8786f241672eba00000000000001c7`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (76.597 ms, trace `0d8786f241672eba00000000000000b2`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (79.637 ms, trace `0d8786f241672eba00000000000000f0`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p11-replay-smoke-g`; source `d62b4e952e5d2b0c5570225ff6e612eabee2f38b`; subjects 1000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3511/3512 (99.972%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3512/3512. Raw trace bytes: 20931978.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 231 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13366.461 | 297.817 | 10.145 | 280 |
| L1 | 0 | 16424.792 | 296.256 | 8.087 | 422 |
| L4 | 0 | 18599.769 | 326.834 | 9.209 | 382 |
| L16 | 0 | 19064.959 | 316.342 | 13.590 | 442 |
| L64 | 0 | 18841.773 | 382.493 | 7.650 | 604 |
| L256 | 0 | 17025.663 | 281.673 | 7.583 | 462 |
| L1024 | 0 | 18991.463 | 3876.732 | 32.517 | 16528 |
| tail | 0 | 64684.373 | 11961.379 | 111.726 | 52110 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 0d8786f241672eba000000000000006e | driver.queue.scheduler-late | 0.581 | none | 0 / 32 |
| 0d8786f241672eba000000000000006e | driver.queue.scheduler-dispatch | 0.080 | none | 0 / 32 |

Observed active steps while trace 0d8786f241672eba000000000000006e waited: []

| 0d8786f241672eba0000000000000136 | driver.queue.scheduler-dispatch | 0.195 | none | 0 / 32 |
| 0d8786f241672eba0000000000000136 | driver.queue.scheduler-late | 0.025 | none | 0 / 32 |

Observed active steps while trace 0d8786f241672eba0000000000000136 waited: []

| 0d8786f241672eba00000000000001c7 | driver.queue.subject | 83.685 | 0d8786f241672eba00000000000001c6 | 1 / 32 |
| 0d8786f241672eba00000000000001c7 | driver.queue.scheduler-dispatch | 0.172 | none | 2 / 32 |
| 0d8786f241672eba00000000000001c7 | driver.queue.scheduler-late | 0.003 | none | 1 / 32 |

Observed active steps while trace 0d8786f241672eba00000000000001c7 waited: [{"at":1794825849661.9036,"inFlight":2,"capacity":32,"active":[{"traceId":"0d8786f241672eba00000000000001c6","step":"client.http"},{"traceId":"0d8786f241672eba00000000000001c8","step":"client.http"}]},{"at":1794825849681.5095,"inFlight":2,"capacity":32,"active":[{"traceId":"0d8786f241672eba00000000000001c6","step":"client.http"},{"traceId":"0d8786f241672eba00000000000001c8","step":"client.http"}]},{"at":1794825849702.8835,"inFlight":2,"capacity":32,"active":[{"traceId":"0d8786f241672eba00000000000001c6","step":"client.http"},{"traceId":"0d8786f241672eba00000000000001c8","step":"client.http"}]}]

| 0d8786f241672eba00000000000000b2 | driver.queue.scheduler-dispatch | 0.048 | none | 0 / 32 |
| 0d8786f241672eba00000000000000b2 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 0d8786f241672eba00000000000000b2 waited: []

| 0d8786f241672eba00000000000000f0 | driver.queue.scheduler-late | 0.402 | none | 0 / 32 |
| 0d8786f241672eba00000000000000f0 | driver.queue.scheduler-dispatch | 0.049 | none | 0 / 32 |

Observed active steps while trace 0d8786f241672eba00000000000000f0 waited: []

## P2 / warmup / commit (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.197 | 0.981 | 0.000 | 0.657 | 2.561 | n/a | 0.000 | 0.108 | 1.029 | 2.072 | 0.025 | 0.000 | 0.238 | 10.475 | 0.893 | n/a | 0.030 | 3.023 | 0.176 | 0.030 |
| p99 | 50.839 | 2.238 | 0.000 | 2.316 | 9.184 | n/a | 0.947 | 2.704 | 2.793 | 10.985 | 0.061 | 0.000 | 1.926 | 25.588 | 4.995 | n/a | 0.344 | 9.869 | 0.321 | 0.344 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba0000000000000036 | 50.839 | 9.184 | n/a | 0.000 | 0.684 | 1.304 | 10.985 | 0.027 | 0.000 | 0.181 | 25.588 | 2.594 | n/a | 0.290 | 9.869 | 0.194 | 0.290 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000054 | 33.350 | 3.932 | n/a | 0.000 | 0.102 | 1.029 | 5.438 | 0.030 | 0.000 | 0.161 | 18.425 | 4.202 | n/a | 0.032 | 4.034 | 0.121 | 0.032 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000004a | 28.311 | 4.806 | n/a | 0.000 | 0.180 | 1.410 | 3.221 | 0.025 | 0.000 | 1.065 | 15.841 | 1.418 | n/a | 0.344 | 4.986 | 0.176 | 0.344 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000057 | 26.053 | 2.472 | n/a | 0.947 | 0.108 | 0.938 | 6.129 | 0.022 | 0.000 | 0.148 | 14.751 | 0.509 | n/a | 0.030 | 3.527 | 0.135 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| 0d8786f241672eba000000000000003e | 25.266 | 2.139 | n/a | 0.000 | 0.061 | 2.126 | 4.035 | 0.048 | 0.000 | 1.103 | 11.098 | 4.629 | n/a | 0.027 | 2.199 | 0.087 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000044 | 25.184 | 5.388 | n/a | 0.000 | 0.135 | 2.793 | 1.805 | 0.021 | 0.000 | 0.238 | 13.970 | 0.779 | n/a | 0.053 | 5.524 | 0.219 | 0.053 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| 0d8786f241672eba0000000000000048 | 24.911 | 5.294 | n/a | 0.000 | 2.704 | 0.928 | 1.791 | 0.021 | 0.000 | 0.146 | 11.872 | 2.111 | n/a | 0.045 | 7.998 | 0.321 | 0.045 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000003a | 20.197 | 2.875 | n/a | 0.000 | 0.148 | 0.994 | 1.767 | 0.031 | 0.000 | 1.926 | 7.417 | 4.995 | n/a | 0.044 | 3.023 | 0.150 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |
| 0d8786f241672eba0000000000000042 | 19.792 | 1.685 | n/a | 0.000 | 0.055 | 0.987 | 2.072 | 0.052 | 0.000 | 0.231 | 10.475 | 4.207 | n/a | 0.028 | 1.740 | 0.088 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 0d8786f241672eba000000000000005a | 18.677 | 3.880 | n/a | 0.546 | 0.240 | 1.344 | 4.605 | 0.034 | 0.000 | 0.805 | 6.642 | 0.550 | n/a | 0.030 | 4.665 | 0.250 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000005d | 14.960 | 2.322 | n/a | 0.249 | 0.054 | 1.646 | 1.620 | 0.022 | 0.000 | 0.698 | 7.874 | 0.458 | n/a | 0.018 | 2.625 | 0.175 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000005f | 14.941 | 2.050 | n/a | 0.000 | 0.595 | 0.987 | 1.955 | 0.025 | 0.000 | 0.521 | 7.894 | 0.893 | n/a | 0.021 | 2.645 | 0.177 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000004f | 13.371 | 2.561 | n/a | 0.000 | 0.067 | 1.313 | 2.363 | 0.061 | 0.000 | 0.333 | 6.130 | 0.510 | n/a | 0.034 | 2.628 | 0.197 | 0.034 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000051 | 12.943 | 2.507 | n/a | 0.000 | 0.081 | 0.897 | 1.516 | 0.024 | 0.000 | 0.169 | 7.213 | 0.509 | n/a | 0.027 | 2.588 | 0.200 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 67.484 | n/a | n/a | n/a | 44.038 | 2.505 | 2.734 | 0.000 | 1.886 | 3.659 | 0.003 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.006 | 55.031 | 0.837 | 0.006 |
| p99 | 269.457 | n/a | n/a | n/a | 94.292 | 61.625 | 10.232 | 0.000 | 147.999 | 42.610 | 27.673 | 24.348 | 0.053 | 0.000 | n/a | n/a | 0.032 | 114.731 | 1.000 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba0000000000001bfd | 269.457 | 57.514 | 51.367 | 5.850 | 0.000 | 147.999 | 6.701 | 0.004 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.011 | 114.731 | 0.426 | 0.011 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 1.018ms; driver.reader-basis.broadcast 0.859ms; driver.reader-basis.broadcast 0.524ms; driver.publication.readback 0.128ms; driver.publication.readback 0.110ms |
| 0d8786f241672eba0000000000001bfa | 229.779 | 59.304 | 9.524 | 4.668 | 0.000 | 138.724 | 4.311 | 13.227 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.004 | 73.496 | 0.320 | 0.004 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 1.018ms; driver.reader-basis.broadcast 0.524ms; driver.publication.readback 0.128ms; driver.publication.readback 0.110ms; driver.publication.readback 0.110ms |
| 0d8786f241672eba0000000000001bfb | 205.508 | 52.302 | 3.568 | 4.869 | 0.000 | 127.497 | 10.312 | 6.948 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.008 | 60.739 | 0.296 | 0.008 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 1.018ms; driver.reader-basis.broadcast 0.524ms; driver.publication.readback 0.128ms; driver.publication.readback 0.110ms; driver.publication.readback 0.110ms |
| 0d8786f241672eba0000000000001c10 | 171.546 | 33.468 | 61.625 | 5.001 | 0.000 | 68.511 | 2.921 | 0.004 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.005 | 100.094 | 0.583 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 1.018ms; driver.reader-basis.broadcast 0.859ms; driver.publication.readback 0.318ms; driver.publication.readback 0.110ms; driver.publication.readback 0.110ms |
| 0d8786f241672eba0000000000000b57 | 147.140 | 79.411 | 7.692 | 10.232 | 0.000 | 46.778 | 3.006 | 0.001 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.014 | 97.335 | 0.662 | 0.014 | node-14/thread-3/client.reach-decode-and-cache | driver.expected-state.bind-receipt 1.301ms; driver.publication.readback 0.115ms; driver.reader-basis.broadcast 0.110ms; driver.publication.readback 0.084ms; driver.publication.readback 0.084ms |
| 0d8786f241672eba000000000000183a | 140.160 | 54.164 | 0.286 | 2.625 | 0.000 | 58.193 | 9.514 | 15.368 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.005 | 57.075 | 0.407 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.219ms; driver.publication.readback 0.115ms; driver.publication.readback 0.072ms; driver.publication.readback 0.067ms; driver.publication.readback 0.054ms |
| 0d8786f241672eba0000000000000b5a | 140.104 | 18.971 | 40.008 | 0.000 | 0.000 | 79.572 | 1.535 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.008 | 58.980 | 0.421 | 0.008 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.301ms; driver.publication.readback 0.115ms; driver.reader-basis.broadcast 0.110ms; driver.publication.readback 0.084ms; driver.publication.readback 0.084ms |
| 0d8786f241672eba00000000000016f8 | 138.729 | 55.405 | 0.184 | 3.601 | 0.000 | 67.898 | 11.602 | 0.031 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.004 | 59.190 | 0.427 | 0.004 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.187ms; driver.reader-basis.broadcast 0.187ms; driver.publication.readback 0.138ms; driver.publication.readback 0.125ms; driver.publication.readback 0.120ms |
| 0d8786f241672eba0000000000001bf7 | 135.101 | 57.732 | 15.901 | 4.957 | 0.000 | 44.153 | 9.039 | 3.304 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.007 | 78.590 | 0.582 | 0.007 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.524ms; driver.publication.readback 0.128ms; driver.publication.readback 0.106ms; driver.publication.readback 0.098ms; driver.publication.readback 0.058ms |
| 0d8786f241672eba0000000000001969 | 130.820 | 65.078 | 1.080 | 5.938 | 0.000 | 48.201 | 10.510 | 0.002 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.007 | 72.096 | 0.551 | 0.007 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.203ms; driver.publication.readback 0.099ms; driver.publication.readback 0.086ms; driver.publication.readback 0.066ms; driver.publication.readback 0.065ms |
| 0d8786f241672eba0000000000000f14 | 129.001 | 39.207 | 37.191 | 2.665 | 0.000 | 37.105 | 2.816 | 10.007 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.004 | 79.063 | 0.613 | 0.004 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.304ms; driver.reader-basis.broadcast 0.148ms; driver.publication.readback 0.104ms; driver.publication.readback 0.100ms; driver.publication.readback 0.059ms |
| 0d8786f241672eba0000000000001835 | 118.635 | 57.337 | 10.452 | 6.068 | 0.000 | 25.854 | 18.915 | 0.002 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.004 | 73.856 | 0.623 | 0.004 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.219ms; driver.reader-basis.broadcast 0.183ms; driver.publication.readback 0.115ms; driver.publication.readback 0.107ms; driver.publication.readback 0.072ms |
| 0d8786f241672eba0000000000001342 | 114.715 | 64.610 | 40.153 | 4.340 | 0.000 | 0.594 | 4.997 | 0.006 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.006 | 109.104 | 0.951 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.207ms; driver.publication.readback 0.117ms; driver.publication.readback 0.115ms; driver.publication.readback 0.109ms; driver.publication.readback 0.106ms |
| 0d8786f241672eba0000000000001ab1 | 113.395 | 93.284 | 5.854 | 6.791 | 0.000 | 0.354 | 7.087 | 0.007 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.009 | 105.928 | 0.934 | 0.009 | node-14/thread-2/replica.pull-at | driver.reader-basis.broadcast 0.249ms; driver.publication.readback 0.138ms; driver.publication.readback 0.120ms; driver.publication.readback 0.060ms; driver.publication.readback 0.058ms |
| 0d8786f241672eba0000000000001550 | 109.352 | 51.066 | 0.188 | 3.074 | 0.000 | 35.847 | 19.161 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.004 | 54.329 | 0.497 | 0.004 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.183ms; driver.publication.readback 0.150ms; driver.publication.readback 0.080ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.032ms |
| 0d8786f241672eba0000000000001bc0 | 108.548 | 94.292 | 0.649 | 7.023 | 0.000 | 1.525 | 5.039 | 0.003 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.010 | 101.965 | 0.939 | 0.010 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.630ms; driver.publication.readback 0.116ms; driver.publication.readback 0.066ms; driver.publication.readback 0.063ms; driver.publication.readback 0.048ms |
| 0d8786f241672eba0000000000000da2 | 106.486 | 20.791 | 0.510 | 1.124 | 0.000 | 75.341 | 3.507 | 5.196 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.005 | 22.425 | 0.211 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.120ms; driver.publication.readback 0.098ms; driver.publication.readback 0.061ms; driver.publication.readback 0.052ms; driver.publication.readback 0.046ms |
| 0d8786f241672eba0000000000001a64 | 105.754 | 57.935 | 0.205 | 3.507 | 0.000 | 13.286 | 30.801 | 0.005 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.004 | 61.646 | 0.583 | 0.004 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.249ms; driver.reader-basis.broadcast 0.246ms; driver.publication.readback 0.053ms; driver.publication.readback 0.049ms; driver.publication.readback 0.047ms |
| 0d8786f241672eba000000000000006f | 103.436 | 50.848 | 0.724 | 6.093 | 0.000 | 3.093 | 42.610 | 0.032 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.010 | 57.665 | 0.557 | 0.010 | gw-r/thread-45/gateway.admitted-work | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.019ms; driver.reader-basis.broadcast 0.018ms |
| 0d8786f241672eba0000000000000f12 | 100.367 | 46.575 | 39.114 | 4.206 | 0.000 | 0.942 | 9.498 | 0.006 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.010 | 89.895 | 0.896 | 0.010 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.148ms; driver.publication.readback 0.100ms; driver.publication.readback 0.077ms; driver.publication.readback 0.059ms; driver.publication.readback 0.054ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.677 | 0.898 | 0.000 | 0.643 | 2.472 | n/a | 0.000 | 0.081 | 0.994 | 2.072 | 0.031 | 0.000 | 0.521 | 7.874 | 0.550 | n/a | 0.028 | 2.628 | 0.175 | 0.028 |
| p99 | 26.053 | 1.161 | 0.000 | 1.722 | 3.880 | n/a | 0.947 | 0.595 | 2.126 | 6.129 | 0.061 | 0.000 | 1.926 | 14.751 | 4.995 | n/a | 0.044 | 4.665 | 0.250 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba0000000000000057 | 26.053 | 2.472 | n/a | 0.947 | 0.108 | 0.938 | 6.129 | 0.022 | 0.000 | 0.148 | 14.751 | 0.509 | n/a | 0.030 | 3.527 | 0.135 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| 0d8786f241672eba000000000000003e | 25.266 | 2.139 | n/a | 0.000 | 0.061 | 2.126 | 4.035 | 0.048 | 0.000 | 1.103 | 11.098 | 4.629 | n/a | 0.027 | 2.199 | 0.087 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000003a | 20.197 | 2.875 | n/a | 0.000 | 0.148 | 0.994 | 1.767 | 0.031 | 0.000 | 1.926 | 7.417 | 4.995 | n/a | 0.044 | 3.023 | 0.150 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |
| 0d8786f241672eba0000000000000042 | 19.792 | 1.685 | n/a | 0.000 | 0.055 | 0.987 | 2.072 | 0.052 | 0.000 | 0.231 | 10.475 | 4.207 | n/a | 0.028 | 1.740 | 0.088 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 0d8786f241672eba000000000000005a | 18.677 | 3.880 | n/a | 0.546 | 0.240 | 1.344 | 4.605 | 0.034 | 0.000 | 0.805 | 6.642 | 0.550 | n/a | 0.030 | 4.665 | 0.250 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000005d | 14.960 | 2.322 | n/a | 0.249 | 0.054 | 1.646 | 1.620 | 0.022 | 0.000 | 0.698 | 7.874 | 0.458 | n/a | 0.018 | 2.625 | 0.175 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000005f | 14.941 | 2.050 | n/a | 0.000 | 0.595 | 0.987 | 1.955 | 0.025 | 0.000 | 0.521 | 7.894 | 0.893 | n/a | 0.021 | 2.645 | 0.177 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000004f | 13.371 | 2.561 | n/a | 0.000 | 0.067 | 1.313 | 2.363 | 0.061 | 0.000 | 0.333 | 6.130 | 0.510 | n/a | 0.034 | 2.628 | 0.197 | 0.034 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000051 | 12.943 | 2.507 | n/a | 0.000 | 0.081 | 0.897 | 1.516 | 0.024 | 0.000 | 0.169 | 7.213 | 0.509 | n/a | 0.027 | 2.588 | 0.200 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.955 | 0.691 | 0.000 | 0.722 | 3.308 | n/a | 0.000 | 0.089 | 1.334 | 3.348 | 0.027 | 0.000 | 0.599 | 10.301 | 1.642 | n/a | 0.024 | 3.682 | 0.141 | 0.024 |
| p99 | 139.839 | 2.868 | 0.000 | 2.040 | 8.644 | n/a | 1.063 | 1.458 | 7.717 | 11.107 | 0.366 | 0.000 | 3.760 | 89.254 | 33.122 | n/a | 0.072 | 9.116 | 0.268 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba000000000000006e | 139.839 | 4.079 | n/a | 0.000 | 0.661 | 0.966 | 11.107 | 0.026 | 0.000 | 0.599 | 89.254 | 33.122 | n/a | 0.026 | 4.740 | 0.034 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 0d8786f241672eba000000000000007e | 50.385 | 7.909 | n/a | 1.063 | 0.145 | 1.505 | 8.961 | 0.025 | 0.000 | 3.760 | 20.009 | 6.948 | n/a | 0.062 | 9.116 | 0.181 | 0.062 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000078 | 39.873 | 2.186 | n/a | 0.000 | 0.067 | 2.450 | 2.220 | 0.028 | 0.000 | 0.197 | 24.809 | 7.892 | n/a | 0.024 | 2.253 | 0.056 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000006b | 38.405 | 8.644 | n/a | 0.000 | 0.088 | 7.717 | 10.124 | 0.242 | 0.000 | 1.512 | 6.674 | 3.365 | n/a | 0.039 | 8.732 | 0.227 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000066 | 37.455 | 2.556 | n/a | 0.000 | 0.486 | 0.728 | 5.731 | 0.027 | 0.000 | 0.130 | 26.570 | 1.207 | n/a | 0.021 | 3.041 | 0.081 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000074 | 32.568 | 3.878 | n/a | 0.000 | 0.499 | 4.820 | 2.687 | 0.060 | 0.000 | 0.281 | 12.943 | 7.378 | n/a | 0.022 | 4.377 | 0.134 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000007c | 29.845 | 2.599 | n/a | 0.000 | 0.435 | 0.918 | 1.687 | 0.022 | 0.000 | 0.992 | 13.522 | 9.649 | n/a | 0.019 | 3.034 | 0.102 | 0.019 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000099 | 27.269 | 3.637 | n/a | 0.000 | 0.149 | 0.986 | 6.309 | 0.022 | 0.000 | 3.558 | 11.816 | 0.720 | n/a | 0.072 | 3.786 | 0.139 | 0.072 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000087 | 25.727 | 3.392 | n/a | 0.561 | 0.074 | 1.723 | 5.929 | 0.070 | 0.000 | 2.707 | 8.187 | 3.059 | n/a | 0.025 | 4.027 | 0.157 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000009d | 25.657 | 4.499 | n/a | 0.000 | 0.128 | 0.976 | 2.489 | 0.022 | 0.000 | 0.831 | 14.819 | 1.854 | n/a | 0.040 | 4.627 | 0.180 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 0d8786f241672eba0000000000000092 | 23.955 | 3.308 | n/a | 0.000 | 0.059 | 1.605 | 3.348 | 0.021 | 0.000 | 0.162 | 9.586 | 5.842 | n/a | 0.024 | 3.366 | 0.141 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000008b | 23.626 | 1.780 | n/a | 0.000 | 0.046 | 6.352 | 3.080 | 0.066 | 0.000 | 0.752 | 10.751 | 0.775 | n/a | 0.024 | 1.826 | 0.077 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 0d8786f241672eba000000000000008c | 21.778 | 2.373 | n/a | 0.000 | 0.059 | 5.587 | 1.462 | 0.020 | 0.000 | 0.104 | 8.738 | 3.413 | n/a | 0.022 | 2.431 | 0.112 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.025ms |
| 0d8786f241672eba0000000000000089 | 21.315 | 3.170 | n/a | 0.000 | 0.058 | 1.813 | 3.573 | 0.366 | 0.000 | 0.393 | 10.301 | 1.616 | n/a | 0.025 | 3.229 | 0.151 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000009f | 20.424 | 4.970 | n/a | 0.464 | 0.042 | 1.218 | 3.554 | 0.020 | 0.000 | 0.661 | 7.834 | 1.642 | n/a | 0.019 | 5.476 | 0.268 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000082 | 20.402 | 2.465 | n/a | 0.000 | 0.089 | 1.334 | 5.354 | 0.028 | 0.000 | 0.201 | 10.258 | 0.640 | n/a | 0.032 | 2.555 | 0.125 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000068 | 20.152 | 3.308 | n/a | 0.000 | 0.373 | 1.240 | 2.266 | 0.052 | 0.000 | 0.216 | 12.004 | 0.674 | n/a | 0.019 | 3.682 | 0.183 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000095 | 19.718 | 3.518 | n/a | 0.664 | 0.058 | 1.108 | 4.810 | 0.027 | 0.000 | 0.187 | 8.312 | 1.003 | n/a | 0.029 | 4.241 | 0.215 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000084 | 18.400 | 3.573 | n/a | 0.000 | 0.674 | 1.403 | 2.607 | 0.055 | 0.000 | 1.915 | 7.318 | 0.833 | n/a | 0.022 | 4.247 | 0.231 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000a1 | 14.833 | 1.609 | n/a | 0.000 | 1.458 | 0.731 | 1.292 | 0.021 | 0.000 | 0.250 | 8.296 | 1.165 | n/a | 0.012 | 3.067 | 0.207 | 0.012 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 0.907ms; driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.018ms |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.402 | 0.000 | 0.000 | 0.442 | 2.186 | n/a | 0.000 | 0.088 | 1.240 | 2.266 | 0.028 | 0.000 | 0.250 | 10.258 | 0.720 | n/a | 0.024 | 2.555 | 0.125 | 0.024 |
| p99 | 39.873 | 1.003 | 0.000 | 1.272 | 8.644 | n/a | 0.000 | 1.458 | 7.717 | 10.124 | 0.242 | 0.000 | 3.558 | 24.809 | 7.892 | n/a | 0.072 | 8.732 | 0.227 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba0000000000000078 | 39.873 | 2.186 | n/a | 0.000 | 0.067 | 2.450 | 2.220 | 0.028 | 0.000 | 0.197 | 24.809 | 7.892 | n/a | 0.024 | 2.253 | 0.056 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000006b | 38.405 | 8.644 | n/a | 0.000 | 0.088 | 7.717 | 10.124 | 0.242 | 0.000 | 1.512 | 6.674 | 3.365 | n/a | 0.039 | 8.732 | 0.227 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000099 | 27.269 | 3.637 | n/a | 0.000 | 0.149 | 0.986 | 6.309 | 0.022 | 0.000 | 3.558 | 11.816 | 0.720 | n/a | 0.072 | 3.786 | 0.139 | 0.072 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000008b | 23.626 | 1.780 | n/a | 0.000 | 0.046 | 6.352 | 3.080 | 0.066 | 0.000 | 0.752 | 10.751 | 0.775 | n/a | 0.024 | 1.826 | 0.077 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 0d8786f241672eba0000000000000082 | 20.402 | 2.465 | n/a | 0.000 | 0.089 | 1.334 | 5.354 | 0.028 | 0.000 | 0.201 | 10.258 | 0.640 | n/a | 0.032 | 2.555 | 0.125 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000068 | 20.152 | 3.308 | n/a | 0.000 | 0.373 | 1.240 | 2.266 | 0.052 | 0.000 | 0.216 | 12.004 | 0.674 | n/a | 0.019 | 3.682 | 0.183 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000a1 | 14.833 | 1.609 | n/a | 0.000 | 1.458 | 0.731 | 1.292 | 0.021 | 0.000 | 0.250 | 8.296 | 1.165 | n/a | 0.012 | 3.067 | 0.207 | 0.012 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 0.907ms; driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.018ms |
| 0d8786f241672eba000000000000008f | 14.257 | 1.653 | n/a | 0.000 | 0.050 | 1.002 | 2.156 | 0.043 | 0.000 | 0.685 | 8.095 | 0.552 | n/a | 0.019 | 1.703 | 0.119 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (19 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.098 | 0.963 | 0.000 | 0.706 | 2.935 | n/a | 0.000 | 0.070 | 1.177 | 2.167 | 0.025 | 0.000 | 0.383 | 12.516 | 7.076 | n/a | 0.026 | 3.007 | 0.132 | 0.026 |
| p99 | 114.448 | 2.812 | 0.012 | 2.916 | 7.157 | n/a | 0.763 | 0.182 | 2.977 | 18.213 | 0.106 | 0.000 | 1.595 | 76.597 | 15.954 | n/a | 0.072 | 7.314 | 0.252 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba00000000000000b2 | 114.448 | 2.484 | n/a | 0.000 | 0.050 | 0.941 | 18.213 | 0.055 | 0.000 | 0.133 | 76.597 | 15.954 | n/a | 0.021 | 2.534 | 0.022 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 0d8786f241672eba00000000000000c8 | 56.421 | 7.157 | n/a | 0.000 | 0.157 | 1.579 | 5.169 | 0.106 | 0.000 | 0.343 | 32.322 | 9.537 | n/a | 0.051 | 7.314 | 0.130 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.069ms |
| 0d8786f241672eba00000000000000ad | 41.886 | 4.699 | n/a | 0.763 | 0.063 | 1.056 | 4.243 | 0.060 | 0.000 | 0.383 | 18.988 | 11.607 | n/a | 0.026 | 5.525 | 0.132 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000de | 35.804 | 2.040 | n/a | 0.000 | 0.068 | 1.665 | 3.107 | 0.095 | 0.000 | 0.527 | 16.132 | 12.143 | n/a | 0.027 | 2.108 | 0.059 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.138ms |
| 0d8786f241672eba00000000000000d2 | 35.349 | 6.636 | n/a | 0.000 | 0.101 | 1.905 | 2.251 | 0.024 | 0.000 | 0.219 | 16.810 | 7.363 | n/a | 0.041 | 6.737 | 0.191 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000af | 34.747 | 2.281 | n/a | 0.000 | 0.070 | 1.000 | 2.901 | 0.099 | 0.000 | 1.595 | 16.964 | 9.810 | n/a | 0.027 | 2.351 | 0.068 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000b7 | 31.675 | 1.986 | n/a | 0.000 | 0.066 | 1.427 | 6.412 | 0.059 | 0.000 | 1.024 | 12.516 | 8.158 | n/a | 0.026 | 2.052 | 0.065 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 0d8786f241672eba00000000000000bc | 31.298 | 6.587 | n/a | 0.000 | 0.049 | 1.177 | 2.022 | 0.023 | 0.000 | 0.138 | 14.639 | 6.643 | n/a | 0.021 | 6.635 | 0.212 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000c0 | 30.925 | 3.723 | n/a | 0.000 | 0.078 | 1.009 | 1.809 | 0.023 | 0.000 | 0.819 | 16.348 | 7.076 | n/a | 0.040 | 3.801 | 0.123 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000d5 | 29.098 | 2.251 | n/a | 0.000 | 0.063 | 1.080 | 3.904 | 0.023 | 0.000 | 0.460 | 13.268 | 8.022 | n/a | 0.026 | 2.314 | 0.080 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| 0d8786f241672eba00000000000000d7 | 26.792 | 3.384 | n/a | 0.000 | 0.182 | 1.122 | 2.029 | 0.025 | 0.000 | 0.201 | 10.140 | 9.637 | n/a | 0.072 | 3.566 | 0.133 | 0.072 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000cd | 22.773 | 2.119 | n/a | 0.000 | 0.054 | 2.977 | 2.167 | 0.052 | 0.000 | 0.771 | 8.294 | 6.317 | n/a | 0.022 | 2.173 | 0.095 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000b9 | 21.507 | 2.512 | n/a | 0.000 | 0.044 | 1.375 | 8.689 | 0.021 | 0.000 | 0.791 | 7.059 | 1.000 | n/a | 0.018 | 2.556 | 0.119 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000a5 | 20.942 | 3.180 | n/a | 0.000 | 0.070 | 0.950 | 1.902 | 0.021 | 0.000 | 0.157 | 10.052 | 4.580 | n/a | 0.030 | 3.250 | 0.155 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000ca | 18.632 | 2.935 | n/a | 0.000 | 0.073 | 1.186 | 1.918 | 0.041 | 0.000 | 0.151 | 11.446 | 0.861 | n/a | 0.024 | 3.007 | 0.161 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000db | 17.952 | 4.002 | n/a | 0.000 | 0.075 | 1.191 | 1.677 | 0.023 | 0.000 | 0.186 | 7.578 | 3.192 | n/a | 0.027 | 4.078 | 0.227 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000e1 | 16.512 | 2.145 | n/a | 0.000 | 0.164 | 0.935 | 1.409 | 0.020 | 0.000 | 0.115 | 11.153 | 0.554 | n/a | 0.016 | 2.309 | 0.140 | 0.016 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000c5 | 15.915 | 3.842 | n/a | 0.000 | 0.162 | 1.672 | 1.730 | 0.025 | 0.000 | 0.503 | 7.032 | 0.892 | n/a | 0.058 | 4.003 | 0.252 | 0.058 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000a8 | 14.858 | 2.028 | n/a | 0.000 | 0.077 | 1.055 | 1.432 | 0.020 | 0.000 | 0.790 | 8.528 | 0.901 | n/a | 0.026 | 2.105 | 0.142 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.507 | 0.000 | 0.000 | 0.555 | 2.145 | n/a | 0.000 | 0.068 | 1.122 | 2.029 | 0.025 | 0.000 | 0.503 | 10.052 | 4.580 | n/a | 0.026 | 2.309 | 0.119 | 0.026 |
| p99 | 114.448 | 0.997 | 0.000 | 0.744 | 3.842 | n/a | 0.000 | 0.182 | 2.977 | 18.213 | 0.095 | 0.000 | 1.024 | 76.597 | 15.954 | n/a | 0.072 | 4.003 | 0.252 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba00000000000000b2 | 114.448 | 2.484 | n/a | 0.000 | 0.050 | 0.941 | 18.213 | 0.055 | 0.000 | 0.133 | 76.597 | 15.954 | n/a | 0.021 | 2.534 | 0.022 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 0d8786f241672eba00000000000000de | 35.804 | 2.040 | n/a | 0.000 | 0.068 | 1.665 | 3.107 | 0.095 | 0.000 | 0.527 | 16.132 | 12.143 | n/a | 0.027 | 2.108 | 0.059 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.138ms |
| 0d8786f241672eba00000000000000b7 | 31.675 | 1.986 | n/a | 0.000 | 0.066 | 1.427 | 6.412 | 0.059 | 0.000 | 1.024 | 12.516 | 8.158 | n/a | 0.026 | 2.052 | 0.065 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 0d8786f241672eba00000000000000d7 | 26.792 | 3.384 | n/a | 0.000 | 0.182 | 1.122 | 2.029 | 0.025 | 0.000 | 0.201 | 10.140 | 9.637 | n/a | 0.072 | 3.566 | 0.133 | 0.072 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000cd | 22.773 | 2.119 | n/a | 0.000 | 0.054 | 2.977 | 2.167 | 0.052 | 0.000 | 0.771 | 8.294 | 6.317 | n/a | 0.022 | 2.173 | 0.095 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000b9 | 21.507 | 2.512 | n/a | 0.000 | 0.044 | 1.375 | 8.689 | 0.021 | 0.000 | 0.791 | 7.059 | 1.000 | n/a | 0.018 | 2.556 | 0.119 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000a5 | 20.942 | 3.180 | n/a | 0.000 | 0.070 | 0.950 | 1.902 | 0.021 | 0.000 | 0.157 | 10.052 | 4.580 | n/a | 0.030 | 3.250 | 0.155 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000e1 | 16.512 | 2.145 | n/a | 0.000 | 0.164 | 0.935 | 1.409 | 0.020 | 0.000 | 0.115 | 11.153 | 0.554 | n/a | 0.016 | 2.309 | 0.140 | 0.016 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000c5 | 15.915 | 3.842 | n/a | 0.000 | 0.162 | 1.672 | 1.730 | 0.025 | 0.000 | 0.503 | 7.032 | 0.892 | n/a | 0.058 | 4.003 | 0.252 | 0.058 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000a8 | 14.858 | 2.028 | n/a | 0.000 | 0.077 | 1.055 | 1.432 | 0.020 | 0.000 | 0.790 | 8.528 | 0.901 | n/a | 0.026 | 2.105 | 0.142 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.060 | 0.820 | 0.000 | 0.688 | 2.847 | n/a | 0.000 | 0.083 | 1.120 | 1.767 | 0.023 | 0.000 | 0.274 | 9.383 | 4.000 | n/a | 0.026 | 2.898 | 0.137 | 0.026 |
| p99 | 107.465 | 1.997 | 0.000 | 2.253 | 12.640 | n/a | 0.751 | 0.451 | 6.007 | 21.726 | 0.507 | 0.000 | 3.953 | 79.637 | 13.912 | n/a | 0.081 | 13.552 | 0.237 | 0.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba00000000000000f0 | 107.465 | 1.771 | n/a | 0.000 | 0.451 | 1.059 | 10.431 | 0.025 | 0.000 | 0.159 | 79.637 | 13.912 | n/a | 0.020 | 2.222 | 0.021 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 0d8786f241672eba0000000000000101 | 57.290 | 12.640 | n/a | 0.751 | 0.160 | 6.007 | 21.726 | 0.123 | 0.000 | 0.649 | 11.210 | 4.000 | n/a | 0.023 | 13.552 | 0.237 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000f6 | 35.370 | 2.815 | n/a | 0.000 | 0.072 | 1.703 | 1.555 | 0.023 | 0.000 | 0.482 | 22.232 | 6.453 | n/a | 0.033 | 2.887 | 0.082 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000fd | 29.271 | 4.153 | n/a | 0.000 | 0.137 | 1.242 | 1.784 | 0.021 | 0.000 | 0.614 | 16.016 | 5.223 | n/a | 0.081 | 4.290 | 0.147 | 0.081 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000010a | 28.352 | 2.850 | n/a | 0.000 | 0.048 | 1.120 | 3.490 | 0.066 | 0.000 | 0.888 | 9.383 | 10.486 | n/a | 0.022 | 2.898 | 0.102 | 0.022 | tx/thread-87/transactor.triplex-function | none observed |
| 0d8786f241672eba00000000000000f3 | 27.474 | 3.293 | n/a | 0.000 | 0.083 | 1.008 | 3.502 | 0.073 | 0.000 | 1.006 | 13.950 | 4.532 | n/a | 0.029 | 3.375 | 0.123 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000011d | 26.505 | 2.481 | n/a | 0.000 | 0.055 | 0.829 | 1.739 | 0.021 | 0.000 | 0.434 | 11.907 | 9.016 | n/a | 0.023 | 2.536 | 0.096 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000ea | 24.804 | 3.415 | n/a | 0.000 | 0.020 | 0.544 | 5.977 | 0.052 | 0.000 | 1.312 | 12.310 | 1.163 | n/a | 0.011 | 3.435 | 0.138 | 0.011 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.015ms |
| 0d8786f241672eba000000000000010c | 24.661 | 3.289 | n/a | 0.000 | 0.108 | 1.048 | 1.646 | 0.066 | 0.000 | 0.274 | 13.904 | 4.277 | n/a | 0.049 | 3.397 | 0.138 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000111 | 23.236 | 3.078 | n/a | 0.000 | 0.104 | 0.816 | 5.467 | 0.020 | 0.000 | 0.184 | 8.695 | 4.831 | n/a | 0.040 | 3.183 | 0.137 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000f8 | 23.060 | 2.059 | n/a | 0.000 | 0.065 | 4.696 | 1.285 | 0.019 | 0.000 | 0.110 | 12.240 | 2.561 | n/a | 0.026 | 2.124 | 0.092 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000113 | 21.982 | 2.535 | n/a | 0.000 | 0.062 | 1.118 | 3.177 | 0.093 | 0.000 | 0.376 | 9.653 | 4.938 | n/a | 0.030 | 2.597 | 0.118 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000fb | 20.748 | 3.191 | n/a | 0.000 | 0.129 | 1.157 | 1.767 | 0.023 | 0.000 | 0.611 | 8.391 | 5.424 | n/a | 0.053 | 3.320 | 0.160 | 0.053 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000122 | 18.932 | 4.008 | n/a | 0.000 | 0.126 | 1.380 | 1.281 | 0.029 | 0.000 | 3.953 | 7.009 | 1.097 | n/a | 0.049 | 4.134 | 0.218 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000106 | 16.405 | 2.847 | n/a | 0.000 | 0.112 | 1.869 | 1.247 | 0.020 | 0.000 | 0.099 | 7.794 | 2.374 | n/a | 0.044 | 2.958 | 0.180 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000117 | 15.901 | 3.248 | n/a | 0.000 | 0.160 | 2.888 | 1.333 | 0.021 | 0.000 | 0.169 | 7.501 | 0.517 | n/a | 0.062 | 3.408 | 0.214 | 0.062 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000e9 | 15.077 | 1.668 | n/a | 0.000 | 0.312 | 0.591 | 4.311 | 0.027 | 0.000 | 0.104 | 7.460 | 0.584 | n/a | 0.021 | 1.981 | 0.131 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 0d8786f241672eba00000000000000e6 | 14.932 | 2.529 | n/a | 0.000 | 0.078 | 1.227 | 2.065 | 0.507 | 0.000 | 0.268 | 7.619 | 0.615 | n/a | 0.024 | 2.607 | 0.175 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000103 | 14.791 | 1.912 | n/a | 0.000 | 0.052 | 1.031 | 1.474 | 0.020 | 0.000 | 0.140 | 7.623 | 2.519 | n/a | 0.020 | 1.964 | 0.133 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000e4 | 13.660 | 1.783 | n/a | 0.000 | 0.056 | 1.437 | 1.703 | 0.021 | 0.000 | 0.128 | 7.885 | 0.624 | n/a | 0.024 | 1.839 | 0.135 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.748 | 0.000 | 0.000 | 0.502 | 2.815 | n/a | 0.000 | 0.108 | 1.227 | 1.703 | 0.023 | 0.000 | 0.184 | 8.391 | 2.561 | n/a | 0.033 | 2.887 | 0.138 | 0.033 |
| p99 | 107.465 | 1.729 | 0.000 | 0.928 | 4.153 | n/a | 0.000 | 0.451 | 4.696 | 10.431 | 0.507 | 0.000 | 3.953 | 79.637 | 13.912 | n/a | 0.081 | 4.290 | 0.218 | 0.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba00000000000000f0 | 107.465 | 1.771 | n/a | 0.000 | 0.451 | 1.059 | 10.431 | 0.025 | 0.000 | 0.159 | 79.637 | 13.912 | n/a | 0.020 | 2.222 | 0.021 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 0d8786f241672eba00000000000000f6 | 35.370 | 2.815 | n/a | 0.000 | 0.072 | 1.703 | 1.555 | 0.023 | 0.000 | 0.482 | 22.232 | 6.453 | n/a | 0.033 | 2.887 | 0.082 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000fd | 29.271 | 4.153 | n/a | 0.000 | 0.137 | 1.242 | 1.784 | 0.021 | 0.000 | 0.614 | 16.016 | 5.223 | n/a | 0.081 | 4.290 | 0.147 | 0.081 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000010c | 24.661 | 3.289 | n/a | 0.000 | 0.108 | 1.048 | 1.646 | 0.066 | 0.000 | 0.274 | 13.904 | 4.277 | n/a | 0.049 | 3.397 | 0.138 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000111 | 23.236 | 3.078 | n/a | 0.000 | 0.104 | 0.816 | 5.467 | 0.020 | 0.000 | 0.184 | 8.695 | 4.831 | n/a | 0.040 | 3.183 | 0.137 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000f8 | 23.060 | 2.059 | n/a | 0.000 | 0.065 | 4.696 | 1.285 | 0.019 | 0.000 | 0.110 | 12.240 | 2.561 | n/a | 0.026 | 2.124 | 0.092 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000113 | 21.982 | 2.535 | n/a | 0.000 | 0.062 | 1.118 | 3.177 | 0.093 | 0.000 | 0.376 | 9.653 | 4.938 | n/a | 0.030 | 2.597 | 0.118 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000fb | 20.748 | 3.191 | n/a | 0.000 | 0.129 | 1.157 | 1.767 | 0.023 | 0.000 | 0.611 | 8.391 | 5.424 | n/a | 0.053 | 3.320 | 0.160 | 0.053 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000122 | 18.932 | 4.008 | n/a | 0.000 | 0.126 | 1.380 | 1.281 | 0.029 | 0.000 | 3.953 | 7.009 | 1.097 | n/a | 0.049 | 4.134 | 0.218 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000106 | 16.405 | 2.847 | n/a | 0.000 | 0.112 | 1.869 | 1.247 | 0.020 | 0.000 | 0.099 | 7.794 | 2.374 | n/a | 0.044 | 2.958 | 0.180 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000117 | 15.901 | 3.248 | n/a | 0.000 | 0.160 | 2.888 | 1.333 | 0.021 | 0.000 | 0.169 | 7.501 | 0.517 | n/a | 0.062 | 3.408 | 0.214 | 0.062 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000e9 | 15.077 | 1.668 | n/a | 0.000 | 0.312 | 0.591 | 4.311 | 0.027 | 0.000 | 0.104 | 7.460 | 0.584 | n/a | 0.021 | 1.981 | 0.131 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 0d8786f241672eba00000000000000e6 | 14.932 | 2.529 | n/a | 0.000 | 0.078 | 1.227 | 2.065 | 0.507 | 0.000 | 0.268 | 7.619 | 0.615 | n/a | 0.024 | 2.607 | 0.175 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000000e4 | 13.660 | 1.783 | n/a | 0.000 | 0.056 | 1.437 | 1.703 | 0.021 | 0.000 | 0.128 | 7.885 | 0.624 | n/a | 0.024 | 1.839 | 0.135 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000011b | 10.959 | 2.188 | n/a | 0.000 | 0.042 | 0.610 | 1.146 | 0.019 | 0.000 | 0.130 | 6.338 | 0.468 | n/a | 0.019 | 2.229 | 0.203 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.726 | 0.980 | 0.000 | 0.651 | 2.689 | n/a | 0.000 | 0.071 | 1.147 | 2.118 | 0.022 | 0.000 | 0.551 | 7.919 | 1.606 | n/a | 0.027 | 2.752 | 0.145 | 0.027 |
| p99 | 118.826 | 3.011 | 0.000 | 3.026 | 10.032 | n/a | 0.000 | 1.071 | 5.751 | 11.429 | 0.085 | 0.000 | 6.179 | 83.220 | 17.821 | n/a | 0.182 | 10.280 | 0.414 | 0.182 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba0000000000000136 | 118.826 | 3.935 | n/a | 0.000 | 0.220 | 2.081 | 10.862 | 0.049 | 0.000 | 0.551 | 83.220 | 17.821 | n/a | 0.088 | 4.155 | 0.035 | 0.088 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 0d8786f241672eba0000000000000153 | 39.561 | 7.048 | n/a | 0.000 | 0.054 | 0.803 | 10.719 | 0.068 | 0.000 | 1.089 | 14.747 | 5.009 | n/a | 0.023 | 7.103 | 0.180 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.054ms |
| 0d8786f241672eba0000000000000145 | 35.133 | 1.587 | n/a | 0.000 | 0.045 | 2.715 | 2.118 | 0.058 | 0.000 | 0.503 | 16.773 | 11.324 | n/a | 0.011 | 1.632 | 0.046 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.102ms; driver.publication.persist-deferred 0.032ms |
| 0d8786f241672eba0000000000000155 | 32.680 | 2.337 | n/a | 0.000 | 0.085 | 1.956 | 2.394 | 0.028 | 0.000 | 0.904 | 8.118 | 16.816 | n/a | 0.043 | 2.422 | 0.074 | 0.043 | tx/thread-87/transactor.triplex-function | driver.reader-basis.broadcast 0.065ms |
| 0d8786f241672eba0000000000000144 | 29.905 | 3.285 | n/a | 0.000 | 0.088 | 1.147 | 2.497 | 0.085 | 0.000 | 6.179 | 12.385 | 4.204 | n/a | 0.036 | 3.373 | 0.113 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000139 | 27.666 | 3.414 | n/a | 0.000 | 0.058 | 4.594 | 3.234 | 0.022 | 0.000 | 0.380 | 11.325 | 4.607 | n/a | 0.031 | 3.472 | 0.125 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000161 | 27.377 | 5.657 | n/a | 0.000 | 0.076 | 5.751 | 11.429 | 0.085 | 0.000 | 0.153 | 3.799 | 0.396 | n/a | 0.031 | 5.732 | 0.209 | 0.031 | gw-w/thread-47/storage/begin-command! | driver.reader-basis.broadcast 0.038ms |
| 0d8786f241672eba0000000000000133 | 26.588 | 2.694 | n/a | 0.000 | 0.070 | 0.625 | 5.421 | 0.020 | 0.000 | 0.589 | 15.548 | 1.594 | n/a | 0.026 | 2.764 | 0.104 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.011ms |
| 0d8786f241672eba0000000000000166 | 24.811 | 10.032 | n/a | 0.000 | 0.248 | 1.823 | 2.243 | 0.031 | 0.000 | 0.842 | 8.296 | 1.113 | n/a | 0.182 | 10.280 | 0.414 | 0.182 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000013c | 24.263 | 2.631 | n/a | 0.000 | 0.074 | 1.677 | 4.155 | 0.071 | 0.000 | 0.501 | 9.192 | 5.935 | n/a | 0.028 | 2.706 | 0.112 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000126 | 22.516 | 3.130 | n/a | 0.000 | 0.056 | 1.408 | 2.016 | 0.022 | 0.000 | 3.664 | 6.443 | 5.753 | n/a | 0.023 | 3.187 | 0.142 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.009ms |
| 0d8786f241672eba0000000000000148 | 21.087 | 2.734 | n/a | 0.000 | 0.068 | 1.289 | 3.063 | 0.053 | 0.000 | 0.881 | 10.175 | 2.798 | n/a | 0.026 | 2.802 | 0.133 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000164 | 20.875 | 2.339 | n/a | 0.000 | 0.071 | 1.178 | 1.890 | 0.022 | 0.000 | 0.155 | 14.174 | 1.016 | n/a | 0.031 | 2.409 | 0.115 | 0.031 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000016d | 20.214 | 2.434 | n/a | 0.000 | 0.071 | 0.720 | 1.747 | 0.021 | 0.000 | 3.609 | 10.080 | 1.503 | n/a | 0.027 | 2.505 | 0.124 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000125 | 20.119 | 3.935 | n/a | 0.000 | 0.079 | 2.521 | 4.633 | 0.048 | 0.000 | 0.844 | 7.272 | 0.750 | n/a | 0.038 | 4.013 | 0.199 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000014b | 18.726 | 3.037 | n/a | 0.000 | 0.065 | 1.345 | 1.751 | 0.020 | 0.000 | 0.680 | 9.802 | 2.000 | n/a | 0.025 | 3.102 | 0.166 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000015b | 18.195 | 2.689 | n/a | 0.000 | 0.063 | 0.656 | 3.348 | 0.022 | 0.000 | 0.137 | 6.707 | 4.552 | n/a | 0.021 | 2.752 | 0.151 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000013e | 17.744 | 2.378 | n/a | 0.000 | 0.083 | 1.577 | 2.663 | 0.075 | 0.000 | 0.917 | 6.766 | 3.234 | n/a | 0.051 | 2.461 | 0.139 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000012b | 17.480 | 4.331 | n/a | 0.000 | 0.127 | 0.978 | 3.610 | 0.020 | 0.000 | 3.349 | 4.280 | 0.739 | n/a | 0.046 | 4.458 | 0.255 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 0d8786f241672eba0000000000000170 | 16.184 | 3.124 | n/a | 0.000 | 0.181 | 1.048 | 1.348 | 0.023 | 0.000 | 0.976 | 6.856 | 2.561 | n/a | 0.067 | 3.305 | 0.204 | 0.067 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.162 | 0.569 | 0.000 | 0.511 | 2.287 | n/a | 0.000 | 0.076 | 1.178 | 1.890 | 0.023 | 0.000 | 0.503 | 6.881 | 1.016 | n/a | 0.027 | 2.409 | 0.145 | 0.027 |
| p99 | 118.826 | 1.815 | 0.000 | 0.859 | 5.657 | n/a | 0.000 | 1.071 | 5.751 | 11.429 | 0.085 | 0.000 | 2.810 | 83.220 | 17.821 | n/a | 0.088 | 5.732 | 0.212 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba0000000000000136 | 118.826 | 3.935 | n/a | 0.000 | 0.220 | 2.081 | 10.862 | 0.049 | 0.000 | 0.551 | 83.220 | 17.821 | n/a | 0.088 | 4.155 | 0.035 | 0.088 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 0d8786f241672eba0000000000000145 | 35.133 | 1.587 | n/a | 0.000 | 0.045 | 2.715 | 2.118 | 0.058 | 0.000 | 0.503 | 16.773 | 11.324 | n/a | 0.011 | 1.632 | 0.046 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.102ms; driver.publication.persist-deferred 0.032ms |
| 0d8786f241672eba0000000000000155 | 32.680 | 2.337 | n/a | 0.000 | 0.085 | 1.956 | 2.394 | 0.028 | 0.000 | 0.904 | 8.118 | 16.816 | n/a | 0.043 | 2.422 | 0.074 | 0.043 | tx/thread-87/transactor.triplex-function | driver.reader-basis.broadcast 0.065ms |
| 0d8786f241672eba0000000000000161 | 27.377 | 5.657 | n/a | 0.000 | 0.076 | 5.751 | 11.429 | 0.085 | 0.000 | 0.153 | 3.799 | 0.396 | n/a | 0.031 | 5.732 | 0.209 | 0.031 | gw-w/thread-47/storage/begin-command! | driver.reader-basis.broadcast 0.038ms |
| 0d8786f241672eba0000000000000164 | 20.875 | 2.339 | n/a | 0.000 | 0.071 | 1.178 | 1.890 | 0.022 | 0.000 | 0.155 | 14.174 | 1.016 | n/a | 0.031 | 2.409 | 0.115 | 0.031 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000125 | 20.119 | 3.935 | n/a | 0.000 | 0.079 | 2.521 | 4.633 | 0.048 | 0.000 | 0.844 | 7.272 | 0.750 | n/a | 0.038 | 4.013 | 0.199 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000013e | 17.744 | 2.378 | n/a | 0.000 | 0.083 | 1.577 | 2.663 | 0.075 | 0.000 | 0.917 | 6.766 | 3.234 | n/a | 0.051 | 2.461 | 0.139 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000170 | 16.184 | 3.124 | n/a | 0.000 | 0.181 | 1.048 | 1.348 | 0.023 | 0.000 | 0.976 | 6.856 | 2.561 | n/a | 0.067 | 3.305 | 0.204 | 0.067 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000131 | 16.162 | 2.286 | n/a | 0.000 | 0.051 | 0.775 | 1.098 | 0.020 | 0.000 | 0.526 | 8.676 | 2.705 | n/a | 0.027 | 2.336 | 0.145 | 0.027 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000129 | 15.855 | 2.247 | n/a | 0.000 | 0.049 | 1.078 | 2.104 | 0.050 | 0.000 | 2.810 | 6.881 | 0.617 | n/a | 0.018 | 2.296 | 0.145 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000173 | 14.467 | 1.603 | n/a | 0.000 | 1.071 | 1.947 | 2.196 | 0.055 | 0.000 | 0.268 | 6.395 | 0.908 | n/a | 0.023 | 2.674 | 0.185 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000156 | 13.917 | 1.700 | n/a | 0.000 | 0.049 | 0.765 | 1.376 | 0.019 | 0.000 | 0.128 | 9.376 | 0.481 | n/a | 0.022 | 1.749 | 0.126 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.079ms; driver.publication.persist-deferred 0.015ms |
| 0d8786f241672eba000000000000016b | 13.753 | 2.422 | n/a | 0.000 | 0.064 | 0.741 | 1.758 | 0.019 | 0.000 | 0.317 | 6.545 | 1.862 | n/a | 0.024 | 2.486 | 0.181 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 0d8786f241672eba000000000000012d | 12.771 | 1.732 | n/a | 0.000 | 0.229 | 0.713 | 1.130 | 0.018 | 0.000 | 0.494 | 7.365 | 1.067 | n/a | 0.022 | 1.961 | 0.154 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000014d | 11.243 | 2.286 | n/a | 0.000 | 0.077 | 1.221 | 1.428 | 0.022 | 0.000 | 0.633 | 4.815 | 0.727 | n/a | 0.034 | 2.364 | 0.210 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000015d | 10.999 | 2.287 | n/a | 0.000 | 0.049 | 0.775 | 0.961 | 0.018 | 0.000 | 0.130 | 5.781 | 0.975 | n/a | 0.023 | 2.336 | 0.212 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.069 | 0.393 | 0.000 | 0.553 | 2.267 | n/a | 0.000 | 0.063 | 0.901 | 1.558 | 0.022 | 0.000 | 0.176 | 9.894 | 2.542 | n/a | 0.028 | 2.337 | 0.113 | 0.028 |
| p99 | 89.718 | 1.735 | 0.000 | 1.159 | 4.590 | n/a | 0.000 | 0.118 | 2.133 | 13.143 | 3.068 | 0.000 | 3.622 | 68.225 | 13.684 | n/a | 0.045 | 4.708 | 0.243 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba0000000000000183 | 89.718 | 2.193 | n/a | 0.000 | 0.061 | 0.951 | 4.487 | 0.016 | 0.000 | 0.071 | 68.225 | 13.684 | n/a | 0.029 | 2.254 | 0.025 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| 0d8786f241672eba0000000000000181 | 36.761 | 2.452 | n/a | 0.000 | 0.058 | 0.988 | 1.450 | 0.019 | 0.000 | 0.092 | 27.622 | 4.057 | n/a | 0.023 | 2.510 | 0.068 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000017b | 26.529 | 2.087 | n/a | 0.000 | 0.071 | 0.662 | 1.558 | 0.019 | 0.000 | 0.165 | 15.770 | 6.171 | n/a | 0.028 | 2.158 | 0.081 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000001b3 | 26.422 | 4.157 | n/a | 0.000 | 0.068 | 0.969 | 7.747 | 0.031 | 0.000 | 0.164 | 12.057 | 1.198 | n/a | 0.031 | 4.225 | 0.160 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000018a | 25.788 | 2.267 | n/a | 0.000 | 0.070 | 1.167 | 3.742 | 0.026 | 0.000 | 0.674 | 12.254 | 5.553 | n/a | 0.036 | 2.337 | 0.091 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000001b1 | 23.615 | 4.590 | n/a | 0.000 | 0.118 | 2.133 | 13.143 | 0.054 | 0.000 | 0.142 | 3.163 | 0.228 | n/a | 0.045 | 4.708 | 0.199 | 0.045 | gw-w/thread-52/storage/begin-command! | none observed |
| 0d8786f241672eba0000000000000187 | 23.434 | 2.440 | n/a | 0.000 | 0.045 | 0.599 | 5.417 | 0.070 | 0.000 | 0.165 | 10.317 | 4.363 | n/a | 0.018 | 2.485 | 0.106 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 0d8786f241672eba000000000000019b | 22.821 | 2.196 | n/a | 0.000 | 0.050 | 0.867 | 2.007 | 0.022 | 0.000 | 0.616 | 9.923 | 7.116 | n/a | 0.024 | 2.246 | 0.098 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000195 | 22.203 | 3.032 | n/a | 0.000 | 0.060 | 0.964 | 1.691 | 0.022 | 0.000 | 0.120 | 10.124 | 6.158 | n/a | 0.032 | 3.092 | 0.139 | 0.032 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000192 | 21.941 | 2.405 | n/a | 0.000 | 0.081 | 1.676 | 2.690 | 0.068 | 0.000 | 1.315 | 9.894 | 3.776 | n/a | 0.036 | 2.485 | 0.113 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000018d | 21.904 | 1.764 | n/a | 0.000 | 0.070 | 1.308 | 4.915 | 0.026 | 0.000 | 0.474 | 10.777 | 2.542 | n/a | 0.028 | 1.834 | 0.084 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000190 | 20.069 | 2.199 | n/a | 0.000 | 0.063 | 0.907 | 1.531 | 0.022 | 0.000 | 0.529 | 10.203 | 4.588 | n/a | 0.028 | 2.261 | 0.113 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000175 | 19.748 | 2.036 | n/a | 0.000 | 0.073 | 0.851 | 1.364 | 0.022 | 0.000 | 0.482 | 10.861 | 4.032 | n/a | 0.027 | 2.109 | 0.107 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000019f | 18.176 | 2.687 | n/a | 0.000 | 0.069 | 1.677 | 1.340 | 3.068 | 0.000 | 0.114 | 8.597 | 0.597 | n/a | 0.028 | 2.755 | 0.152 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000178 | 16.644 | 1.711 | n/a | 0.000 | 0.070 | 0.654 | 1.552 | 0.021 | 0.000 | 0.176 | 9.276 | 3.156 | n/a | 0.029 | 1.781 | 0.107 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000199 | 15.882 | 1.858 | n/a | 0.000 | 0.060 | 0.883 | 1.448 | 0.023 | 0.000 | 3.622 | 6.893 | 1.067 | n/a | 0.027 | 1.918 | 0.121 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000017e | 15.218 | 3.081 | n/a | 0.000 | 0.078 | 1.162 | 2.352 | 0.029 | 0.000 | 0.879 | 6.607 | 0.991 | n/a | 0.038 | 3.159 | 0.208 | 0.038 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000001ab | 15.116 | 1.388 | n/a | 0.000 | 0.025 | 0.534 | 1.358 | 0.018 | 0.000 | 0.132 | 9.599 | 2.051 | n/a | 0.011 | 1.413 | 0.093 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| 0d8786f241672eba00000000000001a4 | 14.177 | 1.957 | n/a | 0.000 | 0.066 | 0.901 | 1.212 | 0.019 | 0.000 | 1.443 | 6.387 | 2.161 | n/a | 0.031 | 2.023 | 0.143 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000001a2 | 13.769 | 2.346 | n/a | 0.000 | 0.063 | 0.748 | 1.445 | 0.036 | 0.000 | 0.522 | 6.091 | 2.493 | n/a | 0.025 | 2.409 | 0.175 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.176 | 0.393 | 0.000 | 0.484 | 2.193 | n/a | 0.000 | 0.066 | 0.901 | 1.448 | 0.022 | 0.000 | 0.474 | 9.276 | 2.493 | n/a | 0.028 | 2.254 | 0.113 | 0.028 |
| p99 | 89.718 | 1.003 | 0.000 | 0.828 | 4.590 | n/a | 0.000 | 0.118 | 2.133 | 13.143 | 3.068 | 0.000 | 3.622 | 68.225 | 13.684 | n/a | 0.045 | 4.708 | 0.212 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba0000000000000183 | 89.718 | 2.193 | n/a | 0.000 | 0.061 | 0.951 | 4.487 | 0.016 | 0.000 | 0.071 | 68.225 | 13.684 | n/a | 0.029 | 2.254 | 0.025 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| 0d8786f241672eba000000000000018a | 25.788 | 2.267 | n/a | 0.000 | 0.070 | 1.167 | 3.742 | 0.026 | 0.000 | 0.674 | 12.254 | 5.553 | n/a | 0.036 | 2.337 | 0.091 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000001b1 | 23.615 | 4.590 | n/a | 0.000 | 0.118 | 2.133 | 13.143 | 0.054 | 0.000 | 0.142 | 3.163 | 0.228 | n/a | 0.045 | 4.708 | 0.199 | 0.045 | gw-w/thread-52/storage/begin-command! | none observed |
| 0d8786f241672eba0000000000000192 | 21.941 | 2.405 | n/a | 0.000 | 0.081 | 1.676 | 2.690 | 0.068 | 0.000 | 1.315 | 9.894 | 3.776 | n/a | 0.036 | 2.485 | 0.113 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000018d | 21.904 | 1.764 | n/a | 0.000 | 0.070 | 1.308 | 4.915 | 0.026 | 0.000 | 0.474 | 10.777 | 2.542 | n/a | 0.028 | 1.834 | 0.084 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000190 | 20.069 | 2.199 | n/a | 0.000 | 0.063 | 0.907 | 1.531 | 0.022 | 0.000 | 0.529 | 10.203 | 4.588 | n/a | 0.028 | 2.261 | 0.113 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000175 | 19.748 | 2.036 | n/a | 0.000 | 0.073 | 0.851 | 1.364 | 0.022 | 0.000 | 0.482 | 10.861 | 4.032 | n/a | 0.027 | 2.109 | 0.107 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba000000000000019f | 18.176 | 2.687 | n/a | 0.000 | 0.069 | 1.677 | 1.340 | 3.068 | 0.000 | 0.114 | 8.597 | 0.597 | n/a | 0.028 | 2.755 | 0.152 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000178 | 16.644 | 1.711 | n/a | 0.000 | 0.070 | 0.654 | 1.552 | 0.021 | 0.000 | 0.176 | 9.276 | 3.156 | n/a | 0.029 | 1.781 | 0.107 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000199 | 15.882 | 1.858 | n/a | 0.000 | 0.060 | 0.883 | 1.448 | 0.023 | 0.000 | 3.622 | 6.893 | 1.067 | n/a | 0.027 | 1.918 | 0.121 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000001ab | 15.116 | 1.388 | n/a | 0.000 | 0.025 | 0.534 | 1.358 | 0.018 | 0.000 | 0.132 | 9.599 | 2.051 | n/a | 0.011 | 1.413 | 0.093 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| 0d8786f241672eba00000000000001a4 | 14.177 | 1.957 | n/a | 0.000 | 0.066 | 0.901 | 1.212 | 0.019 | 0.000 | 1.443 | 6.387 | 2.161 | n/a | 0.031 | 2.023 | 0.143 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000001a2 | 13.769 | 2.346 | n/a | 0.000 | 0.063 | 0.748 | 1.445 | 0.036 | 0.000 | 0.522 | 6.091 | 2.493 | n/a | 0.025 | 2.409 | 0.175 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000001a7 | 13.750 | 1.748 | n/a | 0.000 | 0.053 | 0.719 | 1.132 | 0.021 | 0.000 | 0.094 | 7.574 | 2.389 | n/a | 0.022 | 1.801 | 0.131 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba00000000000001ae | 12.744 | 2.644 | n/a | 0.000 | 0.053 | 0.769 | 1.381 | 0.021 | 0.000 | 0.108 | 6.783 | 0.962 | n/a | 0.022 | 2.698 | 0.212 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (817 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.563 | 0.375 | 0.000 | 0.519 | 2.184 | n/a | 0.000 | 0.053 | 0.673 | 1.261 | 0.017 | 0.000 | 0.159 | 7.072 | 0.614 | n/a | 0.016 | 2.525 | 0.191 | 0.016 |
| p99 | 58.092 | 2.226 | 0.044 | 2.197 | 7.008 | n/a | 0.000 | 29.449 | 8.496 | 6.919 | 0.085 | 0.000 | 3.870 | 32.588 | 11.491 | n/a | 0.050 | 31.398 | 0.697 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba00000000000001c7 | 116.567 | 3.222 | n/a | 0.000 | 83.860 | 0.780 | 1.410 | 0.066 | 0.000 | 0.584 | 21.831 | 4.785 | n/a | 0.029 | 87.082 | 0.747 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.113ms; driver.publication.readback 0.069ms; driver.publication.readback 0.065ms; driver.reader-basis.broadcast 0.053ms; driver.publication.persist-deferred 0.043ms |
| 0d8786f241672eba00000000000001c9 | 95.067 | 3.177 | n/a | 0.000 | 81.240 | 1.312 | 2.118 | 0.029 | 0.000 | 0.118 | 6.231 | 0.813 | n/a | 0.028 | 84.417 | 0.888 | 0.028 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.113ms; driver.publication.readback 0.069ms; driver.publication.readback 0.065ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.043ms |
| 0d8786f241672eba00000000000001c8 | 92.873 | 2.419 | n/a | 0.000 | 0.026 | 1.077 | 2.290 | 0.043 | 0.000 | 0.122 | 84.800 | 2.071 | n/a | 0.022 | 2.445 | 0.026 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.reader-basis.broadcast 0.053ms; driver.publication.persist-deferred 0.043ms |
| 0d8786f241672eba00000000000001c6 | 89.441 | 3.802 | n/a | 0.000 | 0.131 | 1.102 | 3.150 | 0.020 | 0.000 | 0.330 | 67.146 | 13.693 | n/a | 0.066 | 3.933 | 0.044 | 0.066 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.053ms |
| 0d8786f241672eba0000000000000371 | 63.946 | 3.022 | n/a | 0.000 | 34.875 | 0.864 | 1.229 | 0.016 | 0.000 | 0.258 | 19.656 | 4.006 | n/a | 0.019 | 37.897 | 0.593 | 0.019 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.110ms; driver.publication.readback 0.103ms; driver.publication.readback 0.076ms; driver.publication.readback 0.043ms; driver.publication.readback 0.043ms |
| 0d8786f241672eba00000000000001cf | 61.588 | 1.374 | n/a | 0.000 | 39.483 | 0.399 | 0.889 | 0.017 | 0.000 | 0.071 | 18.669 | 0.675 | n/a | 0.011 | 40.857 | 0.663 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.120ms; driver.publication.readback 0.113ms; driver.publication.readback 0.099ms; driver.publication.readback 0.064ms; driver.publication.readback 0.053ms |
| 0d8786f241672eba00000000000002dd | 61.321 | 2.240 | n/a | 0.000 | 0.087 | 23.053 | 10.218 | 0.010 | 0.000 | 0.031 | 13.288 | 12.379 | n/a | 0.016 | 2.327 | 0.038 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.110ms; driver.publication.persist-deferred 0.051ms; driver.publication.readback 0.047ms; driver.publication.readback 0.041ms; driver.publication.readback 0.037ms |
| 0d8786f241672eba00000000000002ed | 60.636 | 2.403 | n/a | 0.000 | 39.035 | 0.647 | 1.306 | 0.020 | 0.000 | 0.075 | 16.783 | 0.344 | n/a | 0.023 | 41.438 | 0.683 | 0.023 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.347ms; driver.publication.readback 0.141ms; driver.publication.readback 0.107ms; driver.publication.readback 0.104ms; driver.publication.readback 0.076ms |
| 0d8786f241672eba00000000000006f4 | 58.092 | 4.727 | n/a | 0.000 | 40.548 | 0.415 | 3.049 | 0.020 | 0.000 | 1.434 | 4.898 | 2.989 | n/a | 0.014 | 45.274 | 0.779 | 0.014 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 3.060ms; driver.expected-state.bind-receipt 1.058ms; driver.publication.readback 0.095ms; driver.publication.readback 0.059ms; driver.publication.readback 0.057ms |
| 0d8786f241672eba00000000000001cd | 51.917 | 1.679 | n/a | 0.000 | 31.824 | 1.853 | 1.089 | 0.018 | 0.000 | 0.067 | 14.914 | 0.462 | n/a | 0.011 | 33.503 | 0.645 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.113ms; driver.publication.readback 0.099ms; driver.publication.readback 0.053ms; driver.reader-basis.broadcast 0.033ms; driver.publication.persist-deferred 0.032ms |
| 0d8786f241672eba00000000000002df | 49.775 | 5.240 | n/a | 0.000 | 1.289 | 13.438 | 1.490 | 0.018 | 0.000 | 1.130 | 25.190 | 1.972 | n/a | 0.009 | 6.528 | 0.131 | 0.009 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.110ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.051ms; driver.publication.readback 0.047ms; driver.publication.readback 0.041ms |
| 0d8786f241672eba0000000000000717 | 49.281 | 2.142 | n/a | 0.000 | 8.392 | 0.646 | 1.358 | 0.014 | 0.000 | 0.094 | 8.601 | 28.021 | n/a | 0.013 | 10.534 | 0.214 | 0.013 | tx/thread-87/transactor.triplex-function | driver.publication.readback 0.044ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.014ms |
| 0d8786f241672eba00000000000001bf | 48.999 | 5.428 | n/a | 0.000 | 0.067 | 3.653 | 3.448 | 0.056 | 0.000 | 0.994 | 22.217 | 13.108 | n/a | 0.027 | 5.495 | 0.112 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 0d8786f241672eba00000000000003c4 | 48.941 | 1.936 | n/a | 0.000 | 0.070 | 0.549 | 1.070 | 0.017 | 0.000 | 0.400 | 25.498 | 19.376 | n/a | 0.025 | 2.006 | 0.041 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.080ms; driver.publication.readback 0.075ms; driver.publication.readback 0.040ms; driver.publication.persist-deferred 0.039ms; driver.publication.persist-deferred 0.019ms |
| 0d8786f241672eba00000000000003c6 | 48.345 | 1.802 | n/a | 0.000 | 0.042 | 0.410 | 0.944 | 0.013 | 0.000 | 0.348 | 43.480 | 1.293 | n/a | 0.014 | 1.844 | 0.038 | 0.014 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.075ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.039ms; driver.publication.persist-deferred 0.015ms |
| 0d8786f241672eba00000000000001d4 | 47.100 | 2.452 | n/a | 0.000 | 28.429 | 0.536 | 1.397 | 0.031 | 0.000 | 0.503 | 12.884 | 0.856 | n/a | 0.011 | 30.881 | 0.656 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.121ms; driver.publication.readback 0.120ms; driver.publication.readback 0.064ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.023ms |
| 0d8786f241672eba00000000000006f1 | 46.535 | 1.752 | n/a | 0.000 | 33.565 | 0.551 | 1.639 | 0.026 | 0.000 | 0.109 | 8.474 | 0.409 | n/a | 0.010 | 35.317 | 0.759 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 3.060ms; driver.expected-state.bind-receipt 1.058ms; driver.publication.readback 0.095ms; driver.publication.readback 0.057ms; driver.reader-basis.broadcast 0.051ms |
| 0d8786f241672eba0000000000000727 | 46.253 | 3.375 | n/a | 0.000 | 0.078 | 1.126 | 1.262 | 0.012 | 0.000 | 0.423 | 39.322 | 0.621 | n/a | 0.035 | 3.452 | 0.075 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0d8786f241672eba0000000000000564 | 46.244 | 2.909 | n/a | 0.000 | 0.034 | 0.653 | 1.863 | 0.007 | 0.000 | 0.238 | 29.701 | 10.823 | n/a | 0.016 | 2.944 | 0.064 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.017ms |
| 0d8786f241672eba00000000000002dc | 45.140 | 1.803 | n/a | 0.000 | 0.167 | 0.830 | 6.327 | 0.022 | 25.340 | 0.071 | 10.105 | 0.465 | n/a | 0.010 | 1.970 | 0.044 | 0.010 | gw-w/thread--1/jdk.GCPhasePause | driver.publication.readback 0.110ms; driver.publication.persist-deferred 0.029ms |

## P2 / L1024 / commit / 5-10 facts (487 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.147 | 0.000 | 0.000 | 0.409 | 1.741 | n/a | 0.000 | 0.059 | 0.671 | 1.095 | 0.016 | 0.000 | 0.148 | 6.500 | 0.466 | n/a | 0.016 | 2.134 | 0.174 | 0.016 |
| p99 | 60.636 | 1.978 | 0.044 | 0.875 | 5.379 | n/a | 0.000 | 33.565 | 7.999 | 6.651 | 0.083 | 0.000 | 5.095 | 29.536 | 11.174 | n/a | 0.050 | 35.317 | 0.712 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba00000000000001c7 | 116.567 | 3.222 | n/a | 0.000 | 83.860 | 0.780 | 1.410 | 0.066 | 0.000 | 0.584 | 21.831 | 4.785 | n/a | 0.029 | 87.082 | 0.747 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.113ms; driver.publication.readback 0.069ms; driver.publication.readback 0.065ms; driver.reader-basis.broadcast 0.053ms; driver.publication.persist-deferred 0.043ms |
| 0d8786f241672eba00000000000001c6 | 89.441 | 3.802 | n/a | 0.000 | 0.131 | 1.102 | 3.150 | 0.020 | 0.000 | 0.330 | 67.146 | 13.693 | n/a | 0.066 | 3.933 | 0.044 | 0.066 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.053ms |
| 0d8786f241672eba0000000000000371 | 63.946 | 3.022 | n/a | 0.000 | 34.875 | 0.864 | 1.229 | 0.016 | 0.000 | 0.258 | 19.656 | 4.006 | n/a | 0.019 | 37.897 | 0.593 | 0.019 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.110ms; driver.publication.readback 0.103ms; driver.publication.readback 0.076ms; driver.publication.readback 0.043ms; driver.publication.readback 0.043ms |
| 0d8786f241672eba00000000000001cf | 61.588 | 1.374 | n/a | 0.000 | 39.483 | 0.399 | 0.889 | 0.017 | 0.000 | 0.071 | 18.669 | 0.675 | n/a | 0.011 | 40.857 | 0.663 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.120ms; driver.publication.readback 0.113ms; driver.publication.readback 0.099ms; driver.publication.readback 0.064ms; driver.publication.readback 0.053ms |
| 0d8786f241672eba00000000000002ed | 60.636 | 2.403 | n/a | 0.000 | 39.035 | 0.647 | 1.306 | 0.020 | 0.000 | 0.075 | 16.783 | 0.344 | n/a | 0.023 | 41.438 | 0.683 | 0.023 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.347ms; driver.publication.readback 0.141ms; driver.publication.readback 0.107ms; driver.publication.readback 0.104ms; driver.publication.readback 0.076ms |
| 0d8786f241672eba00000000000001cd | 51.917 | 1.679 | n/a | 0.000 | 31.824 | 1.853 | 1.089 | 0.018 | 0.000 | 0.067 | 14.914 | 0.462 | n/a | 0.011 | 33.503 | 0.645 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.113ms; driver.publication.readback 0.099ms; driver.publication.readback 0.053ms; driver.reader-basis.broadcast 0.033ms; driver.publication.persist-deferred 0.032ms |
| 0d8786f241672eba0000000000000717 | 49.281 | 2.142 | n/a | 0.000 | 8.392 | 0.646 | 1.358 | 0.014 | 0.000 | 0.094 | 8.601 | 28.021 | n/a | 0.013 | 10.534 | 0.214 | 0.013 | tx/thread-87/transactor.triplex-function | driver.publication.readback 0.044ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.014ms |
| 0d8786f241672eba00000000000001bf | 48.999 | 5.428 | n/a | 0.000 | 0.067 | 3.653 | 3.448 | 0.056 | 0.000 | 0.994 | 22.217 | 13.108 | n/a | 0.027 | 5.495 | 0.112 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 0d8786f241672eba00000000000003c4 | 48.941 | 1.936 | n/a | 0.000 | 0.070 | 0.549 | 1.070 | 0.017 | 0.000 | 0.400 | 25.498 | 19.376 | n/a | 0.025 | 2.006 | 0.041 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.080ms; driver.publication.readback 0.075ms; driver.publication.readback 0.040ms; driver.publication.persist-deferred 0.039ms; driver.publication.persist-deferred 0.019ms |
| 0d8786f241672eba00000000000006f1 | 46.535 | 1.752 | n/a | 0.000 | 33.565 | 0.551 | 1.639 | 0.026 | 0.000 | 0.109 | 8.474 | 0.409 | n/a | 0.010 | 35.317 | 0.759 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 3.060ms; driver.expected-state.bind-receipt 1.058ms; driver.publication.readback 0.095ms; driver.publication.readback 0.057ms; driver.reader-basis.broadcast 0.051ms |
| 0d8786f241672eba00000000000002dc | 45.140 | 1.803 | n/a | 0.000 | 0.167 | 0.830 | 6.327 | 0.022 | 25.340 | 0.071 | 10.105 | 0.465 | n/a | 0.010 | 1.970 | 0.044 | 0.010 | gw-w/thread--1/jdk.GCPhasePause | driver.publication.readback 0.110ms; driver.publication.persist-deferred 0.029ms |
| 0d8786f241672eba00000000000002bb | 44.989 | 6.722 | n/a | 0.000 | 0.038 | 3.992 | 19.997 | 0.083 | 0.000 | 0.464 | 12.360 | 1.314 | n/a | 0.020 | 6.760 | 0.150 | 0.020 | gw-w/thread-49/gateway.admitted-work | driver.publication.readback 0.096ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.034ms; driver.publication.persist-deferred 0.015ms |
| 0d8786f241672eba000000000000036f | 44.272 | 1.637 | n/a | 0.000 | 0.010 | 6.047 | 1.270 | 0.020 | 0.000 | 0.132 | 34.317 | 0.833 | n/a | 0.007 | 1.646 | 0.037 | 0.007 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.110ms; driver.publication.readback 0.076ms; driver.reader-basis.broadcast 0.060ms; driver.publication.persist-deferred 0.027ms; driver.publication.persist-deferred 0.016ms |
| 0d8786f241672eba00000000000001e9 | 43.400 | 1.505 | n/a | 0.000 | 8.934 | 0.487 | 1.072 | 0.018 | 0.000 | 0.057 | 28.393 | 2.921 | n/a | 0.013 | 10.439 | 0.241 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.165ms; driver.publication.readback 0.079ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.023ms; driver.reader-basis.broadcast 0.018ms |
| 0d8786f241672eba00000000000001ca | 43.348 | 2.742 | n/a | 0.000 | 0.059 | 2.937 | 1.173 | 0.019 | 0.000 | 0.079 | 25.941 | 10.375 | n/a | 0.024 | 2.801 | 0.065 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.publication.readback 0.065ms; driver.publication.persist-deferred 0.043ms; driver.publication.persist-deferred 0.015ms |
| 0d8786f241672eba0000000000000504 | 42.776 | 1.015 | n/a | 0.000 | 21.808 | 4.214 | 1.025 | 0.014 | 0.000 | 0.055 | 13.329 | 1.308 | n/a | 0.008 | 22.823 | 0.534 | 0.008 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.569ms; driver.publication.readback 0.118ms; driver.publication.readback 0.066ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.045ms |
| 0d8786f241672eba00000000000003c8 | 41.987 | 2.785 | n/a | 0.000 | 0.084 | 0.695 | 1.354 | 0.015 | 0.000 | 0.406 | 36.058 | 0.556 | n/a | 0.034 | 2.869 | 0.068 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.014ms |
| 0d8786f241672eba0000000000000377 | 41.930 | 2.202 | n/a | 0.000 | 13.584 | 4.636 | 0.908 | 0.016 | 0.000 | 0.050 | 20.103 | 0.412 | n/a | 0.019 | 15.787 | 0.377 | 0.019 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.110ms; driver.publication.readback 0.103ms; driver.publication.readback 0.043ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.033ms |
| 0d8786f241672eba0000000000000372 | 41.558 | 1.966 | n/a | 0.000 | 20.241 | 1.590 | 1.777 | 0.107 | 0.000 | 0.492 | 12.404 | 2.965 | n/a | 0.016 | 22.208 | 0.534 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.110ms; driver.publication.readback 0.103ms; driver.publication.readback 0.076ms; driver.publication.persist-deferred 0.033ms; driver.publication.persist-deferred 0.028ms |
| 0d8786f241672eba00000000000003c1 | 41.042 | 2.212 | n/a | 0.000 | 0.076 | 1.719 | 1.218 | 0.018 | 0.000 | 0.303 | 32.588 | 2.877 | n/a | 0.031 | 2.288 | 0.056 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.025ms |

## P2 / tail / commit (2567 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.248 | 0.342 | 0.000 | 0.499 | 2.094 | n/a | 0.000 | 0.038 | 0.541 | 0.953 | 0.012 | 0.000 | 0.099 | 4.470 | 0.572 | n/a | 0.013 | 2.377 | 0.243 | 0.013 |
| p99 | 33.214 | 2.002 | 0.039 | 2.158 | 6.431 | n/a | 0.000 | 13.939 | 6.448 | 4.566 | 0.043 | 0.000 | 2.990 | 20.390 | 4.604 | n/a | 0.043 | 16.881 | 0.686 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba0000000000001080 | 54.491 | 1.534 | n/a | 0.000 | 30.586 | 2.119 | 0.630 | 0.011 | 0.000 | 0.088 | 19.035 | 0.475 | n/a | 0.014 | 32.120 | 0.589 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.140ms; driver.publication.readback 0.060ms; driver.publication.readback 0.049ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.029ms |
| 0d8786f241672eba0000000000001021 | 52.427 | 11.244 | n/a | 0.000 | 7.007 | 2.942 | 7.892 | 0.060 | 12.065 | 0.782 | 8.105 | 2.318 | n/a | 0.012 | 18.251 | 0.348 | 0.012 | gw-w/thread--1/jdk.GCPhasePause | driver.publication.readback 0.079ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.026ms; driver.publication.persist-deferred 0.018ms |
| 0d8786f241672eba0000000000000903 | 47.185 | 2.448 | n/a | 0.000 | 28.596 | 0.604 | 2.595 | 0.014 | 0.000 | 0.097 | 11.606 | 1.212 | n/a | 0.011 | 31.044 | 0.658 | 0.011 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.217ms; driver.publication.readback 0.110ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.016ms |
| 0d8786f241672eba0000000000000fb8 | 45.115 | 2.907 | n/a | 0.000 | 1.172 | 0.828 | 1.553 | 0.026 | 0.000 | 2.764 | 35.317 | 0.541 | n/a | 0.008 | 4.079 | 0.090 | 0.008 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.018ms |
| 0d8786f241672eba0000000000001232 | 44.711 | 4.428 | n/a | 0.000 | 0.306 | 0.829 | 2.682 | 0.032 | 0.000 | 1.046 | 34.453 | 0.928 | n/a | 0.007 | 4.734 | 0.106 | 0.007 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.197ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.020ms |
| 0d8786f241672eba0000000000001763 | 44.676 | 1.143 | n/a | 0.000 | 0.435 | 12.012 | 0.641 | 0.003 | 0.000 | 0.051 | 27.432 | 2.953 | n/a | 0.005 | 1.578 | 0.035 | 0.005 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.050ms; driver.publication.readback 0.050ms; driver.publication.readback 0.047ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.029ms |
| 0d8786f241672eba0000000000000fb9 | 43.070 | 1.199 | n/a | 0.000 | 0.012 | 3.101 | 0.933 | 0.025 | 0.000 | 0.093 | 37.154 | 0.547 | n/a | 0.006 | 1.211 | 0.028 | 0.006 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.020ms |
| 0d8786f241672eba0000000000000fba | 42.630 | 1.207 | n/a | 0.000 | 0.010 | 3.905 | 0.585 | 0.008 | 0.000 | 0.033 | 34.435 | 2.441 | n/a | 0.006 | 1.217 | 0.029 | 0.006 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.020ms |
| 0d8786f241672eba000000000000155e | 40.940 | 4.882 | n/a | 0.000 | 0.052 | 5.654 | 3.061 | 0.062 | 0.000 | 2.632 | 23.597 | 0.979 | n/a | 0.020 | 4.934 | 0.121 | 0.020 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.183ms; driver.publication.readback 0.158ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.014ms |
| 0d8786f241672eba0000000000001762 | 40.075 | 1.790 | n/a | 0.000 | 0.255 | 11.110 | 0.690 | 0.005 | 0.000 | 0.604 | 20.863 | 4.753 | n/a | 0.006 | 2.044 | 0.051 | 0.006 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.050ms; driver.publication.readback 0.047ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.019ms |
| 0d8786f241672eba00000000000011f3 | 40.066 | 2.779 | n/a | 0.000 | 0.066 | 0.974 | 7.424 | 0.022 | 19.234 | 0.059 | 9.087 | 0.395 | n/a | 0.027 | 2.845 | 0.071 | 0.027 | gw-w/thread--1/jdk.GCPhasePause | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.016ms |
| 0d8786f241672eba0000000000001935 | 39.231 | 2.777 | n/a | 0.000 | 0.319 | 2.542 | 1.252 | 0.027 | 0.000 | 0.081 | 30.838 | 1.367 | n/a | 0.029 | 3.096 | 0.079 | 0.029 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.160ms; driver.publication.persist-deferred 0.026ms |
| 0d8786f241672eba00000000000011f5 | 38.985 | 2.162 | n/a | 0.000 | 1.434 | 25.349 | 0.788 | 0.007 | 0.000 | 0.066 | 8.883 | 0.291 | n/a | 0.004 | 3.596 | 0.092 | 0.004 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.008ms |
| 0d8786f241672eba0000000000001760 | 38.710 | 1.761 | n/a | 0.000 | 0.033 | 0.524 | 5.399 | 0.016 | 19.658 | 0.056 | 10.152 | 1.097 | n/a | 0.013 | 1.794 | 0.046 | 0.013 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 0d8786f241672eba00000000000009b7 | 37.667 | 3.990 | n/a | 0.000 | 14.504 | 0.538 | 2.852 | 0.030 | 0.000 | 0.677 | 14.022 | 1.043 | n/a | 0.013 | 18.493 | 0.491 | 0.013 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.108ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.007ms |
| 0d8786f241672eba00000000000011f4 | 37.570 | 2.135 | n/a | 0.000 | 1.789 | 19.840 | 2.010 | 0.027 | 0.000 | 3.538 | 7.731 | 0.485 | n/a | 0.014 | 3.924 | 0.104 | 0.014 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.047ms |
| 0d8786f241672eba000000000000166d | 36.435 | 2.205 | n/a | 0.000 | 27.656 | 0.544 | 1.630 | 0.023 | 0.000 | 0.106 | 3.562 | 0.693 | n/a | 0.016 | 29.861 | 0.820 | 0.016 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.330ms; driver.publication.readback 0.040ms; driver.publication.readback 0.032ms; driver.publication.readback 0.024ms; driver.publication.persist-deferred 0.020ms |
| 0d8786f241672eba0000000000001515 | 36.304 | 2.103 | n/a | 0.000 | 18.284 | 0.812 | 0.913 | 0.009 | 0.000 | 0.274 | 13.323 | 0.580 | n/a | 0.007 | 20.386 | 0.562 | 0.007 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.073ms; driver.publication.readback 0.069ms; driver.publication.readback 0.068ms; driver.publication.readback 0.059ms; driver.publication.readback 0.054ms |
| 0d8786f241672eba0000000000001a31 | 35.528 | 2.380 | n/a | 0.000 | 8.059 | 0.690 | 1.041 | 0.014 | 0.000 | 0.077 | 22.550 | 0.700 | n/a | 0.016 | 10.439 | 0.294 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.032ms; driver.publication.readback 0.060ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.038ms; driver.publication.persist-deferred 0.038ms |
| 0d8786f241672eba0000000000000878 | 34.951 | 3.673 | n/a | 0.000 | 3.609 | 0.346 | 1.260 | 0.008 | 0.000 | 0.061 | 25.124 | 0.861 | n/a | 0.009 | 7.281 | 0.208 | 0.009 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.118ms; driver.reader-basis.broadcast 0.061ms; driver.publication.readback 0.042ms; driver.publication.readback 0.024ms; driver.publication.persist-deferred 0.018ms |

## P2 / tail / commit / 5-10 facts (1561 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.994 | 0.000 | 0.000 | 0.383 | 1.670 | n/a | 0.000 | 0.038 | 0.533 | 0.819 | 0.012 | 0.000 | 0.098 | 4.164 | 0.450 | n/a | 0.013 | 1.908 | 0.221 | 0.013 |
| p99 | 32.660 | 1.967 | 0.018 | 0.893 | 4.882 | n/a | 0.000 | 15.213 | 5.705 | 4.427 | 0.044 | 0.000 | 2.370 | 20.100 | 3.726 | n/a | 0.042 | 17.164 | 0.695 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d8786f241672eba0000000000001080 | 54.491 | 1.534 | n/a | 0.000 | 30.586 | 2.119 | 0.630 | 0.011 | 0.000 | 0.088 | 19.035 | 0.475 | n/a | 0.014 | 32.120 | 0.589 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.140ms; driver.publication.readback 0.060ms; driver.publication.readback 0.049ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.029ms |
| 0d8786f241672eba0000000000000fb8 | 45.115 | 2.907 | n/a | 0.000 | 1.172 | 0.828 | 1.553 | 0.026 | 0.000 | 2.764 | 35.317 | 0.541 | n/a | 0.008 | 4.079 | 0.090 | 0.008 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.018ms |
| 0d8786f241672eba0000000000001763 | 44.676 | 1.143 | n/a | 0.000 | 0.435 | 12.012 | 0.641 | 0.003 | 0.000 | 0.051 | 27.432 | 2.953 | n/a | 0.005 | 1.578 | 0.035 | 0.005 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.050ms; driver.publication.readback 0.050ms; driver.publication.readback 0.047ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.029ms |
| 0d8786f241672eba0000000000000fb9 | 43.070 | 1.199 | n/a | 0.000 | 0.012 | 3.101 | 0.933 | 0.025 | 0.000 | 0.093 | 37.154 | 0.547 | n/a | 0.006 | 1.211 | 0.028 | 0.006 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.020ms |
| 0d8786f241672eba0000000000000fba | 42.630 | 1.207 | n/a | 0.000 | 0.010 | 3.905 | 0.585 | 0.008 | 0.000 | 0.033 | 34.435 | 2.441 | n/a | 0.006 | 1.217 | 0.029 | 0.006 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.020ms |
| 0d8786f241672eba000000000000155e | 40.940 | 4.882 | n/a | 0.000 | 0.052 | 5.654 | 3.061 | 0.062 | 0.000 | 2.632 | 23.597 | 0.979 | n/a | 0.020 | 4.934 | 0.121 | 0.020 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.183ms; driver.publication.readback 0.158ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.014ms |
| 0d8786f241672eba00000000000011f3 | 40.066 | 2.779 | n/a | 0.000 | 0.066 | 0.974 | 7.424 | 0.022 | 19.234 | 0.059 | 9.087 | 0.395 | n/a | 0.027 | 2.845 | 0.071 | 0.027 | gw-w/thread--1/jdk.GCPhasePause | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.016ms |
| 0d8786f241672eba0000000000001935 | 39.231 | 2.777 | n/a | 0.000 | 0.319 | 2.542 | 1.252 | 0.027 | 0.000 | 0.081 | 30.838 | 1.367 | n/a | 0.029 | 3.096 | 0.079 | 0.029 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.160ms; driver.publication.persist-deferred 0.026ms |
| 0d8786f241672eba00000000000011f5 | 38.985 | 2.162 | n/a | 0.000 | 1.434 | 25.349 | 0.788 | 0.007 | 0.000 | 0.066 | 8.883 | 0.291 | n/a | 0.004 | 3.596 | 0.092 | 0.004 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.008ms |
| 0d8786f241672eba0000000000001760 | 38.710 | 1.761 | n/a | 0.000 | 0.033 | 0.524 | 5.399 | 0.016 | 19.658 | 0.056 | 10.152 | 1.097 | n/a | 0.013 | 1.794 | 0.046 | 0.013 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 0d8786f241672eba0000000000001a31 | 35.528 | 2.380 | n/a | 0.000 | 8.059 | 0.690 | 1.041 | 0.014 | 0.000 | 0.077 | 22.550 | 0.700 | n/a | 0.016 | 10.439 | 0.294 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.032ms; driver.publication.readback 0.060ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.038ms; driver.publication.persist-deferred 0.038ms |
| 0d8786f241672eba000000000000150f | 34.078 | 4.731 | n/a | 0.000 | 0.016 | 10.469 | 2.369 | 0.035 | 0.000 | 0.265 | 15.710 | 0.476 | n/a | 0.008 | 4.747 | 0.139 | 0.008 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.073ms; driver.publication.readback 0.069ms; driver.publication.readback 0.054ms; driver.publication.readback 0.040ms; driver.publication.persist-deferred 0.035ms |
| 0d8786f241672eba0000000000001416 | 34.054 | 1.592 | n/a | 0.000 | 20.974 | 0.341 | 1.176 | 0.017 | 0.000 | 0.329 | 9.238 | 0.375 | n/a | 0.012 | 22.566 | 0.663 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.869ms; driver.publication.readback 0.069ms; driver.publication.readback 0.063ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.017ms |
| 0d8786f241672eba0000000000000a9d | 33.214 | 1.295 | n/a | 0.000 | 24.282 | 0.443 | 0.589 | 0.008 | 0.000 | 0.050 | 6.158 | 0.378 | n/a | 0.010 | 25.577 | 0.770 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.248ms; driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.012ms |
| 0d8786f241672eba000000000000159a | 33.129 | 1.716 | n/a | 0.000 | 0.321 | 0.337 | 0.845 | 0.010 | 0.000 | 0.046 | 9.304 | 20.537 | n/a | 0.012 | 2.037 | 0.061 | 0.012 | tx/thread-87/transactor.triplex-function | driver.reader-basis.broadcast 0.161ms; driver.publication.readback 0.137ms; driver.publication.persist-deferred 0.020ms |
| 0d8786f241672eba0000000000001bd8 | 32.660 | 2.856 | n/a | 0.000 | 16.749 | 0.580 | 0.625 | 0.008 | 0.000 | 0.152 | 10.958 | 0.715 | n/a | 0.017 | 19.605 | 0.600 | 0.017 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.758ms; driver.publication.readback 0.376ms; driver.publication.readback 0.124ms; driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.018ms |
| 0d8786f241672eba0000000000000850 | 32.494 | 1.942 | n/a | 0.000 | 0.034 | 18.167 | 1.956 | 0.010 | 0.000 | 0.058 | 8.632 | 1.679 | n/a | 0.016 | 1.977 | 0.061 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.125ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.016ms |
| 0d8786f241672eba0000000000000b39 | 32.176 | 1.497 | n/a | 0.000 | 9.229 | 0.395 | 0.620 | 0.006 | 0.000 | 0.014 | 17.020 | 3.387 | n/a | 0.007 | 10.726 | 0.333 | 0.007 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.156ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms |
| 0d8786f241672eba0000000000001961 | 31.761 | 2.256 | n/a | 0.000 | 0.037 | 19.771 | 0.886 | 0.010 | 0.000 | 0.046 | 8.341 | 0.398 | n/a | 0.015 | 2.293 | 0.072 | 0.015 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.170ms; driver.publication.readback 0.372ms; driver.publication.persist-deferred 0.045ms |
| 0d8786f241672eba0000000000001831 | 31.314 | 1.259 | n/a | 0.000 | 0.012 | 0.226 | 0.492 | 0.006 | 0.000 | 0.042 | 28.906 | 0.365 | n/a | 0.006 | 1.271 | 0.041 | 0.006 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.018ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 200.956 | n/a | n/a | n/a | 0.098 | n/a | 0.000 | 0.000 | 0.788 | 200.543 | 0.008 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.108 | 0.098 | 0.000 | 0.108 |
| p99 | 207.412 | n/a | n/a | n/a | 20.156 | n/a | 1.078 | 0.000 | 1.690 | 205.575 | 0.103 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.412 | 21.234 | 0.339 | 0.412 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e9f2f10b8c1a9f0000000000000005 | 207.412 | 0.098 | n/a | 0.000 | 0.000 | 1.259 | 205.575 | 0.018 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.336 | 0.098 | 0.000 | 0.336 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000006 | 202.343 | 0.171 | n/a | 0.000 | 0.000 | 0.936 | 200.975 | 0.014 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.103 | 0.171 | 0.001 | 0.103 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000053 | 202.109 | 0.041 | n/a | 0.000 | 0.000 | 0.788 | 201.030 | 0.012 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.108 | 0.041 | 0.000 | 0.108 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000eb5 | 201.250 | 0.023 | n/a | 0.000 | 0.000 | 0.403 | 200.712 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.054 | 0.023 | 0.000 | 0.054 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000eb6 | 201.140 | 0.022 | n/a | 0.000 | 0.000 | 0.451 | 200.590 | 0.006 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.040 | 0.022 | 0.000 | 0.040 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000eb7 | 200.956 | 0.020 | n/a | 0.000 | 0.000 | 0.322 | 200.543 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.040 | 0.020 | 0.000 | 0.040 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000eba | 62.576 | 20.156 | n/a | 1.078 | 0.000 | 0.745 | 40.452 | 0.008 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.129 | 21.234 | 0.339 | 0.129 | gw-r/thread-51/gateway.admitted-work | none observed |
| 54e9f2f10b8c1a9f0000000000000ebc | 58.026 | 15.704 | n/a | 0.000 | 0.000 | 1.576 | 40.450 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.264 | 15.704 | 0.271 | 0.264 | gw-r/thread-47/gateway.admitted-work | none observed |
| 54e9f2f10b8c1a9f0000000000000ebb | 56.572 | 16.166 | n/a | 0.000 | 0.000 | 1.690 | 38.403 | 0.014 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.285 | 16.166 | 0.286 | 0.285 | gw-r/thread-48/gateway.admitted-work | none observed |
| 3f8ba3e2c0bf12a00000000000000002 | 51.144 | 0.277 | n/a | 0.000 | 0.000 | 1.290 | 48.980 | 0.103 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.412 | 0.277 | 0.005 | 0.412 | gw-r/thread-45/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1005.913 | n/a | n/a | n/a | 0.296 | n/a | 0.000 | 0.000 | 2.014 | 1001.795 | 0.013 | 0.000 | 0.413 | 0.000 | n/a | n/a | 1.383 | 0.296 | 0.000 | 1.383 |
| p99 | 1005.913 | n/a | n/a | n/a | 0.296 | n/a | 0.000 | 0.000 | 2.014 | 1001.795 | 0.013 | 0.000 | 0.413 | 0.000 | n/a | n/a | 1.383 | 0.296 | 0.000 | 1.383 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f8ba3e2c0bf12a00000000000000017 | 1005.913 | 0.296 | n/a | 0.000 | 0.000 | 2.014 | 1001.795 | 0.013 | 0.000 | 0.413 | 0.000 | n/a | n/a | 1.383 | 0.296 | 0.000 | 1.383 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / internal (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 835.037 | n/a | n/a | n/a | 2.142 | n/a | 0.000 | 0.000 | 0.924 | 810.296 | 0.012 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.180 | 2.142 | 0.005 | 0.180 |
| p99 | 1007.219 | n/a | n/a | n/a | 21.377 | n/a | 0.660 | 0.000 | 4.684 | 1001.603 | 0.027 | 9.000 | 0.160 | 0.000 | n/a | n/a | 1.338 | 21.377 | 0.026 | 1.338 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f8ba3e2c0bf12a0000000000000002f | 1007.219 | 0.129 | n/a | 0.000 | 0.000 | 4.684 | 1001.149 | 0.012 | 0.000 | 0.135 | 0.000 | n/a | n/a | 1.109 | 0.129 | 0.000 | 1.109 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000024 | 1006.868 | 0.140 | n/a | 0.000 | 0.000 | 4.641 | 1000.828 | 0.019 | 0.000 | 0.130 | 0.000 | n/a | n/a | 1.110 | 0.140 | 0.000 | 1.110 | gw-r/thread-45/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000003a | 1005.656 | 0.172 | n/a | 0.000 | 0.000 | 2.631 | 1001.603 | 0.022 | 0.000 | 0.115 | 0.000 | n/a | n/a | 1.113 | 0.172 | 0.000 | 1.113 | gw-r/thread-45/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000001f | 1005.380 | 0.233 | n/a | 0.000 | 0.000 | 2.462 | 1001.167 | 0.019 | 0.000 | 0.160 | 0.000 | n/a | n/a | 1.338 | 0.233 | 0.000 | 1.338 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000001a | 1004.839 | 0.154 | n/a | 0.000 | 0.000 | 2.033 | 1001.414 | 0.012 | 0.000 | 0.110 | 0.000 | n/a | n/a | 1.115 | 0.154 | 0.000 | 1.115 | gw-r/thread-45/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000036 | 1003.469 | 0.187 | n/a | 0.000 | 0.000 | 0.664 | 1001.361 | 0.008 | 0.000 | 0.104 | 0.000 | n/a | n/a | 1.144 | 0.187 | 0.000 | 1.144 | gw-r/thread-45/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000002a | 1003.455 | 0.235 | n/a | 0.000 | 0.000 | 1.270 | 1000.599 | 0.008 | 0.000 | 0.116 | 0.000 | n/a | n/a | 1.228 | 0.235 | 0.000 | 1.228 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000028 | 1002.292 | 0.153 | n/a | 0.000 | 0.000 | 0.811 | 1001.197 | 0.015 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.069 | 0.153 | 0.000 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000001d | 1001.673 | 2.556 | n/a | 0.000 | 0.000 | 0.586 | 998.347 | 0.011 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.091 | 2.556 | 0.003 | 0.091 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000033 | 950.342 | 3.831 | n/a | 0.660 | 0.000 | 0.996 | 944.651 | 0.009 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.112 | 4.491 | 0.005 | 0.112 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000025 | 882.477 | 5.219 | n/a | 0.000 | 0.000 | 0.531 | 876.535 | 0.011 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.102 | 5.219 | 0.006 | 0.102 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000018 | 835.037 | 21.377 | n/a | 0.000 | 0.000 | 2.206 | 810.296 | 0.022 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.976 | 21.377 | 0.026 | 0.976 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000032 | 646.266 | 3.110 | n/a | 0.438 | 0.000 | 0.741 | 641.766 | 0.011 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.124 | 3.548 | 0.005 | 0.124 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000002b | 476.500 | 3.082 | n/a | 0.000 | 0.000 | 0.890 | 472.212 | 0.011 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.224 | 3.082 | 0.006 | 0.224 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000027 | 445.300 | 5.574 | n/a | 0.000 | 0.000 | 0.758 | 438.682 | 0.011 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.207 | 5.574 | 0.013 | 0.207 | gw-r/thread-45/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000030 | 377.148 | 7.426 | n/a | 0.000 | 0.000 | 0.585 | 368.901 | 0.011 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.156 | 7.426 | 0.020 | 0.156 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000022 | 304.516 | 4.026 | n/a | 0.000 | 0.000 | 0.924 | 299.075 | 0.027 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.307 | 4.026 | 0.013 | 0.307 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000039 | 270.949 | 2.460 | n/a | 0.246 | 0.000 | 0.964 | 267.114 | 0.013 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.088 | 2.706 | 0.010 | 0.088 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000037 | 265.981 | 4.286 | n/a | 0.627 | 0.000 | 0.613 | 260.229 | 0.017 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.105 | 4.913 | 0.018 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000002c | 249.735 | 2.142 | n/a | 0.000 | 0.000 | 0.969 | 246.438 | 0.012 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.089 | 2.142 | 0.009 | 0.089 | gw-r/thread-51/journal/page | none observed |

## P3 / L1 / internal (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 608.856 | n/a | n/a | n/a | 2.675 | n/a | 0.244 | 0.000 | 0.731 | 598.675 | 0.012 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.110 | 3.111 | 0.007 | 0.110 |
| p99 | 1006.450 | n/a | n/a | n/a | 10.672 | n/a | 3.897 | 0.000 | 4.412 | 1004.204 | 0.067 | 0.000 | 3.192 | 0.000 | n/a | n/a | 1.730 | 10.971 | 0.268 | 1.730 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f8ba3e2c0bf12a0000000000000006f | 1006.450 | 0.189 | n/a | 0.000 | 0.000 | 0.773 | 1004.204 | 0.041 | 0.000 | 0.117 | 0.000 | n/a | n/a | 1.126 | 0.189 | 0.000 | 1.126 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000004d | 1006.363 | 0.193 | n/a | 0.000 | 0.000 | 1.073 | 1003.251 | 0.014 | 0.000 | 0.102 | 0.000 | n/a | n/a | 1.730 | 0.193 | 0.000 | 1.730 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000042 | 1006.186 | 0.123 | n/a | 0.000 | 0.000 | 0.942 | 1000.798 | 0.020 | 0.000 | 3.192 | 0.000 | n/a | n/a | 1.112 | 0.123 | 0.000 | 1.112 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000048 | 1004.338 | 0.130 | n/a | 0.000 | 0.000 | 1.232 | 1001.711 | 0.012 | 0.000 | 0.144 | 0.000 | n/a | n/a | 1.108 | 0.130 | 0.000 | 1.108 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000046 | 1004.017 | 0.135 | n/a | 0.000 | 0.000 | 0.792 | 1001.864 | 0.014 | 0.000 | 0.103 | 0.000 | n/a | n/a | 1.109 | 0.135 | 0.000 | 1.109 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000003d | 1003.535 | 0.193 | n/a | 0.000 | 0.000 | 1.183 | 1000.876 | 0.012 | 0.000 | 0.134 | 0.000 | n/a | n/a | 1.137 | 0.193 | 0.000 | 1.137 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000043 | 1003.337 | 0.121 | n/a | 0.000 | 0.000 | 0.731 | 1001.328 | 0.008 | 0.000 | 0.054 | 0.000 | n/a | n/a | 1.095 | 0.121 | 0.000 | 1.095 | gw-r/thread-51/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000067 | 1003.184 | 0.164 | n/a | 0.000 | 0.000 | 0.942 | 1000.893 | 0.012 | 0.000 | 0.056 | 0.000 | n/a | n/a | 1.117 | 0.164 | 0.000 | 1.117 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000064 | 1002.932 | 0.143 | n/a | 0.000 | 0.000 | 0.551 | 1000.973 | 0.012 | 0.000 | 0.135 | 0.000 | n/a | n/a | 1.117 | 0.143 | 0.000 | 1.117 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000003c | 1002.913 | 0.152 | n/a | 0.000 | 0.000 | 0.554 | 1000.934 | 0.018 | 0.000 | 0.133 | 0.000 | n/a | n/a | 1.123 | 0.152 | 0.000 | 1.123 | gw-r/thread-51/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000062 | 1002.571 | 0.171 | n/a | 0.000 | 0.000 | 0.604 | 1000.622 | 0.011 | 0.000 | 0.039 | 0.000 | n/a | n/a | 1.124 | 0.171 | 0.000 | 1.124 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000047 | 1002.570 | 0.154 | n/a | 0.000 | 0.000 | 0.699 | 1000.560 | 0.009 | 0.000 | 0.033 | 0.000 | n/a | n/a | 1.115 | 0.154 | 0.000 | 1.115 | gw-r/thread-45/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000066 | 807.305 | 2.943 | n/a | 0.294 | 0.000 | 1.062 | 802.828 | 0.010 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.084 | 3.238 | 0.004 | 0.084 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000044 | 760.530 | 8.475 | n/a | 1.126 | 0.000 | 0.424 | 750.309 | 0.012 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.110 | 9.602 | 0.013 | 0.110 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000005f | 663.874 | 4.391 | n/a | 0.260 | 0.000 | 0.528 | 658.425 | 0.067 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.083 | 4.651 | 0.007 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000052 | 639.036 | 3.375 | n/a | 0.273 | 0.000 | 0.782 | 634.429 | 0.010 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.086 | 3.648 | 0.006 | 0.086 | gw-r/thread-45/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000050 | 608.856 | 8.595 | n/a | 0.802 | 0.000 | 0.554 | 598.675 | 0.031 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.091 | 9.397 | 0.015 | 0.091 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000069 | 549.349 | 5.376 | n/a | 0.000 | 0.000 | 0.862 | 542.935 | 0.011 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.091 | 5.376 | 0.010 | 0.091 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000003e | 494.840 | 3.704 | n/a | 0.403 | 0.000 | 0.682 | 489.871 | 0.011 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.089 | 4.107 | 0.008 | 0.089 | gw-r/thread-51/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000056 | 460.296 | 8.206 | n/a | 2.011 | 0.000 | 0.678 | 449.226 | 0.011 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.098 | 10.218 | 0.022 | 0.098 | gw-r/thread-51/journal/page | none observed |

## P3 / L4 / internal (31 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 765.594 | n/a | n/a | n/a | 2.141 | n/a | 0.000 | 0.000 | 0.665 | 763.245 | 0.009 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.124 | 2.141 | 0.004 | 0.124 |
| p99 | 1006.742 | n/a | n/a | n/a | 10.844 | n/a | 1.729 | 0.000 | 2.459 | 1004.733 | 4.879 | 15.761 | 0.235 | 0.000 | n/a | n/a | 1.146 | 12.404 | 0.256 | 1.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f8ba3e2c0bf12a000000000000000a0 | 1006.742 | 0.140 | n/a | 0.000 | 0.000 | 0.604 | 1004.733 | 0.010 | 0.000 | 0.136 | 0.000 | n/a | n/a | 1.119 | 0.140 | 0.000 | 1.119 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000074 | 1003.933 | 0.184 | n/a | 0.000 | 0.000 | 1.785 | 1000.748 | 0.008 | 0.000 | 0.073 | 0.000 | n/a | n/a | 1.136 | 0.184 | 0.000 | 1.136 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000093 | 1003.801 | 0.117 | n/a | 0.000 | 0.000 | 1.637 | 1000.847 | 0.009 | 0.000 | 0.095 | 0.000 | n/a | n/a | 1.097 | 0.117 | 0.000 | 1.097 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000007c | 1003.285 | 0.134 | n/a | 0.000 | 0.000 | 1.365 | 1000.606 | 0.009 | 0.000 | 0.055 | 0.000 | n/a | n/a | 1.116 | 0.134 | 0.000 | 1.116 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000009a | 1003.241 | 0.146 | n/a | 0.000 | 0.000 | 0.618 | 1001.117 | 0.020 | 0.000 | 0.235 | 0.000 | n/a | n/a | 1.106 | 0.146 | 0.000 | 1.106 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000072 | 1002.633 | 0.132 | n/a | 0.000 | 0.000 | 0.563 | 1000.770 | 0.008 | 0.000 | 0.063 | 0.000 | n/a | n/a | 1.096 | 0.132 | 0.000 | 1.096 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000084 | 1002.605 | 0.121 | n/a | 0.000 | 0.000 | 0.598 | 1000.708 | 0.009 | 0.000 | 0.069 | 0.000 | n/a | n/a | 1.100 | 0.121 | 0.000 | 1.100 | gw-r/thread-45/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000007d | 1002.573 | 0.193 | n/a | 0.000 | 0.000 | 0.690 | 1000.516 | 0.007 | 0.000 | 0.021 | 0.000 | n/a | n/a | 1.146 | 0.193 | 0.000 | 1.146 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000087 | 1002.563 | 0.151 | n/a | 0.000 | 0.000 | 0.783 | 1000.480 | 0.008 | 0.000 | 0.033 | 0.000 | n/a | n/a | 1.108 | 0.151 | 0.000 | 1.108 | gw-r/thread-51/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000090 | 1002.560 | 0.132 | n/a | 0.000 | 0.000 | 0.521 | 1000.702 | 0.016 | 0.000 | 0.073 | 0.000 | n/a | n/a | 1.116 | 0.132 | 0.000 | 1.116 | gw-r/thread-51/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000089 | 1002.517 | 0.109 | n/a | 0.000 | 0.000 | 0.420 | 1000.795 | 0.013 | 0.000 | 0.078 | 0.000 | n/a | n/a | 1.103 | 0.109 | 0.000 | 1.103 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000085 | 1002.468 | 0.109 | n/a | 0.000 | 0.000 | 0.492 | 1000.675 | 0.009 | 0.000 | 0.079 | 0.000 | n/a | n/a | 1.104 | 0.109 | 0.000 | 1.104 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000008c | 924.491 | 8.792 | n/a | 1.517 | 0.000 | 0.891 | 912.902 | 0.017 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.209 | 10.309 | 0.011 | 0.209 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000094 | 876.679 | 10.844 | n/a | 1.560 | 0.000 | 0.817 | 863.041 | 0.031 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.225 | 12.404 | 0.014 | 0.225 | gw-r/thread-45/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000070 | 853.418 | 2.238 | n/a | 0.000 | 0.000 | 2.459 | 848.523 | 0.037 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.077 | 2.238 | 0.003 | 0.077 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000098 | 765.594 | 1.586 | n/a | 0.000 | 0.000 | 0.612 | 763.245 | 0.009 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.070 | 1.586 | 0.002 | 0.070 | gw-r/thread-51/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000096 | 702.394 | 2.606 | n/a | 0.000 | 0.000 | 0.686 | 698.869 | 0.018 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.073 | 2.606 | 0.004 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000008a | 594.513 | 2.253 | n/a | 0.000 | 0.000 | 0.443 | 591.567 | 0.103 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.070 | 2.253 | 0.004 | 0.070 | gw-r/thread-45/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000009b | 580.890 | 3.735 | n/a | 0.000 | 0.000 | 0.665 | 560.603 | 0.007 | 15.761 | 0.050 | 0.000 | n/a | n/a | 0.068 | 3.735 | 0.006 | 0.068 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000082 | 532.319 | 7.617 | n/a | 0.311 | 0.000 | 0.540 | 523.702 | 0.009 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.077 | 7.928 | 0.015 | 0.077 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / internal (33 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 796.615 | n/a | n/a | n/a | 1.951 | n/a | 0.000 | 0.000 | 0.668 | 790.198 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.117 | 2.110 | 0.005 | 0.117 |
| p99 | 1007.532 | n/a | n/a | n/a | 6.074 | n/a | 0.397 | 0.000 | 4.356 | 1004.818 | 0.077 | 8.706 | 0.103 | 0.000 | n/a | n/a | 2.200 | 6.398 | 0.330 | 2.200 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f8ba3e2c0bf12a000000000000000bf | 1007.532 | 0.296 | n/a | 0.000 | 0.000 | 1.135 | 1004.818 | 0.009 | 0.000 | 0.087 | 0.000 | n/a | n/a | 1.187 | 0.296 | 0.000 | 1.187 | gw-r/thread-51/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000ab | 1005.162 | 0.118 | n/a | 0.000 | 0.000 | 0.701 | 1003.099 | 0.049 | 0.000 | 0.086 | 0.000 | n/a | n/a | 1.109 | 0.118 | 0.000 | 1.109 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000c9 | 1003.397 | 0.135 | n/a | 0.000 | 0.000 | 0.511 | 1000.521 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 2.200 | 0.135 | 0.000 | 2.200 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000d2 | 1003.379 | 0.120 | n/a | 0.000 | 0.000 | 0.685 | 1001.290 | 0.009 | 0.000 | 0.099 | 0.000 | n/a | n/a | 1.176 | 0.120 | 0.000 | 1.176 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000d3 | 1003.226 | 0.196 | n/a | 0.000 | 0.000 | 1.046 | 1000.791 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.147 | 0.196 | 0.000 | 1.147 | gw-r/thread-51/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000c5 | 1003.169 | 0.137 | n/a | 0.000 | 0.000 | 0.527 | 1001.366 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 1.096 | 0.137 | 0.000 | 1.096 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000d4 | 1002.905 | 0.127 | n/a | 0.000 | 0.000 | 0.505 | 1001.085 | 0.010 | 0.000 | 0.068 | 0.000 | n/a | n/a | 1.110 | 0.127 | 0.000 | 1.110 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000a9 | 1002.822 | 0.110 | n/a | 0.000 | 0.000 | 0.427 | 1001.105 | 0.008 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.105 | 0.110 | 0.000 | 1.105 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000b8 | 1002.700 | 0.156 | n/a | 0.000 | 0.000 | 0.727 | 1000.648 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 1.116 | 0.156 | 0.000 | 1.116 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000c0 | 1002.670 | 0.121 | n/a | 0.000 | 0.000 | 0.668 | 1000.723 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 1.103 | 0.121 | 0.000 | 1.103 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000d6 | 1002.379 | 0.163 | n/a | 0.000 | 0.000 | 0.592 | 1000.483 | 0.006 | 0.000 | 0.020 | 0.000 | n/a | n/a | 1.114 | 0.163 | 0.000 | 1.114 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000cc | 1002.040 | 0.254 | n/a | 0.000 | 0.000 | 0.941 | 1000.622 | 0.015 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.141 | 0.254 | 0.000 | 0.141 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000a5 | 887.905 | 1.708 | n/a | 0.000 | 0.000 | 0.545 | 885.477 | 0.008 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.108 | 1.708 | 0.002 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000b0 | 864.704 | 2.463 | n/a | 0.000 | 0.000 | 0.440 | 861.657 | 0.020 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.062 | 2.463 | 0.003 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000ce | 854.835 | 4.127 | n/a | 0.000 | 0.000 | 1.252 | 849.260 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.147 | 4.127 | 0.005 | 0.147 | gw-r/thread-51/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000b9 | 831.639 | 6.074 | n/a | 0.324 | 0.000 | 3.056 | 822.094 | 0.002 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.075 | 6.398 | 0.008 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000c8 | 796.615 | 1.951 | n/a | 0.000 | 0.000 | 4.356 | 790.198 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.069 | 1.951 | 0.002 | 0.069 | gw-r/thread-45/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000c3 | 634.001 | 1.895 | n/a | 0.000 | 0.000 | 0.407 | 622.870 | 0.010 | 8.706 | 0.052 | 0.000 | n/a | n/a | 0.062 | 1.895 | 0.003 | 0.062 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000ba | 516.223 | 2.563 | n/a | 0.000 | 0.000 | 0.546 | 512.961 | 0.008 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.073 | 2.563 | 0.005 | 0.073 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000c6 | 354.087 | 5.105 | n/a | 0.000 | 0.000 | 0.569 | 348.276 | 0.003 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.119 | 5.105 | 0.014 | 0.119 | gw-r/thread-51/journal/page | none observed |

## P3 / L64 / internal (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 427.173 | n/a | n/a | n/a | 2.228 | n/a | 0.000 | 0.000 | 0.605 | 424.266 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.074 | 2.228 | 0.006 | 0.074 |
| p99 | 1004.901 | n/a | n/a | n/a | 7.303 | n/a | 0.549 | 0.000 | 3.082 | 1002.700 | 0.013 | 9.602 | 0.112 | 0.000 | n/a | n/a | 1.165 | 7.729 | 0.297 | 1.165 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f8ba3e2c0bf12a000000000000000e3 | 1004.901 | 0.123 | n/a | 0.000 | 0.000 | 0.858 | 1002.700 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 1.165 | 0.123 | 0.000 | 1.165 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000107 | 1002.956 | 0.124 | n/a | 0.000 | 0.000 | 1.011 | 1000.671 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 1.112 | 0.124 | 0.000 | 1.112 | gw-r/thread-51/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000ef | 1002.887 | 0.133 | n/a | 0.000 | 0.000 | 0.607 | 1001.007 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 1.108 | 0.133 | 0.000 | 1.108 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000116 | 1002.601 | 0.106 | n/a | 0.000 | 0.000 | 0.365 | 1000.949 | 0.008 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.105 | 0.106 | 0.000 | 1.105 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000ec | 1002.583 | 0.145 | n/a | 0.000 | 0.000 | 0.535 | 1000.762 | 0.007 | 0.000 | 0.027 | 0.000 | n/a | n/a | 1.107 | 0.145 | 0.000 | 1.107 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000fc | 1002.567 | 0.119 | n/a | 0.000 | 0.000 | 0.552 | 1000.745 | 0.005 | 0.000 | 0.051 | 0.000 | n/a | n/a | 1.094 | 0.119 | 0.000 | 1.094 | gw-r/thread-51/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000109 | 1002.515 | 0.116 | n/a | 0.000 | 0.000 | 0.373 | 1000.859 | 0.008 | 0.000 | 0.060 | 0.000 | n/a | n/a | 1.098 | 0.116 | 0.000 | 1.098 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000ee | 1002.400 | 0.110 | n/a | 0.000 | 0.000 | 0.531 | 1000.612 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 1.103 | 0.110 | 0.000 | 1.103 | gw-r/thread-51/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000108 | 1002.117 | 0.137 | n/a | 0.000 | 0.000 | 0.467 | 1000.385 | 0.005 | 0.000 | 0.010 | 0.000 | n/a | n/a | 1.113 | 0.137 | 0.000 | 1.113 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000f6 | 881.228 | 6.678 | n/a | 0.000 | 0.000 | 0.602 | 873.838 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.078 | 6.678 | 0.008 | 0.078 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000d8 | 793.955 | 3.953 | n/a | 0.549 | 0.000 | 0.535 | 788.814 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.071 | 4.502 | 0.006 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000e8 | 761.480 | 5.176 | n/a | 0.000 | 0.000 | 0.631 | 755.547 | 0.010 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.070 | 5.176 | 0.007 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000e7 | 740.305 | 4.039 | n/a | 0.000 | 0.000 | 0.608 | 735.554 | 0.002 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.077 | 4.039 | 0.005 | 0.077 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000111 | 733.806 | 3.852 | n/a | 0.394 | 0.000 | 0.610 | 728.791 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.113 | 4.246 | 0.006 | 0.113 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000e5 | 615.058 | 1.620 | n/a | 0.000 | 0.000 | 0.620 | 612.664 | 0.009 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.080 | 1.620 | 0.003 | 0.080 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000fe | 614.029 | 2.399 | n/a | 0.000 | 0.000 | 0.597 | 610.918 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.061 | 2.399 | 0.004 | 0.061 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000e0 | 563.139 | 1.896 | n/a | 0.000 | 0.000 | 1.168 | 559.931 | 0.008 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.088 | 1.896 | 0.003 | 0.088 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000113 | 550.259 | 2.228 | n/a | 0.000 | 0.000 | 0.570 | 547.348 | 0.008 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.057 | 2.228 | 0.004 | 0.057 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000f0 | 502.038 | 3.071 | n/a | 0.000 | 0.000 | 0.468 | 498.368 | 0.007 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.075 | 3.071 | 0.006 | 0.075 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000000eb | 427.173 | 2.161 | n/a | 0.000 | 0.000 | 0.635 | 424.266 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.068 | 2.161 | 0.005 | 0.068 | gw-r/thread-50/journal/page | none observed |

## P3 / L256 / internal (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 594.676 | n/a | n/a | n/a | 1.933 | n/a | 0.000 | 0.000 | 0.510 | 591.897 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.076 | 1.933 | 0.004 | 0.076 |
| p99 | 1005.796 | n/a | n/a | n/a | 6.859 | n/a | 1.913 | 0.000 | 5.969 | 1000.958 | 4.054 | 18.650 | 0.075 | 0.000 | n/a | n/a | 1.247 | 6.859 | 0.057 | 1.247 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f8ba3e2c0bf12a00000000000000139 | 1005.796 | 0.120 | n/a | 0.000 | 0.000 | 3.578 | 1000.934 | 0.008 | 0.000 | 0.059 | 0.000 | n/a | n/a | 1.098 | 0.120 | 0.000 | 1.098 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000014d | 1003.594 | 0.221 | n/a | 0.000 | 0.000 | 1.472 | 1000.709 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 1.148 | 0.221 | 0.000 | 1.148 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000134 | 1003.161 | 0.112 | n/a | 0.000 | 0.000 | 1.288 | 1000.620 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 1.097 | 0.112 | 0.000 | 1.097 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000012d | 1002.917 | 0.189 | n/a | 0.000 | 0.000 | 0.806 | 1000.749 | 0.008 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.124 | 0.189 | 0.000 | 1.124 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000014e | 1002.739 | 0.129 | n/a | 0.000 | 0.000 | 0.465 | 1000.958 | 0.009 | 0.000 | 0.074 | 0.000 | n/a | n/a | 1.104 | 0.129 | 0.000 | 1.104 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000011c | 1002.709 | 0.103 | n/a | 0.000 | 0.000 | 0.477 | 1000.944 | 0.008 | 0.000 | 0.075 | 0.000 | n/a | n/a | 1.102 | 0.103 | 0.000 | 1.102 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000014f | 1002.574 | 0.174 | n/a | 0.000 | 0.000 | 0.659 | 1000.585 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 1.119 | 0.174 | 0.000 | 1.119 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000128 | 1002.443 | 0.113 | n/a | 0.000 | 0.000 | 0.379 | 1000.649 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 1.247 | 0.113 | 0.000 | 1.247 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000148 | 1002.334 | 0.114 | n/a | 0.000 | 0.000 | 0.484 | 981.963 | 0.004 | 18.650 | 0.027 | 0.000 | n/a | n/a | 1.093 | 0.114 | 0.000 | 1.093 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000014a | 1002.069 | 0.142 | n/a | 0.000 | 0.000 | 0.471 | 1000.336 | 0.002 | 0.000 | 0.013 | 0.000 | n/a | n/a | 1.104 | 0.142 | 0.000 | 1.104 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000140 | 1001.442 | 0.111 | n/a | 0.000 | 0.000 | 0.344 | 1000.882 | 0.009 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.044 | 0.111 | 0.000 | 0.044 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000013a | 965.267 | 2.846 | n/a | 0.000 | 0.000 | 5.969 | 956.249 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.162 | 2.846 | 0.003 | 0.162 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000013b | 938.516 | 2.081 | n/a | 0.000 | 0.000 | 0.608 | 935.725 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.067 | 2.081 | 0.002 | 0.067 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000129 | 930.126 | 3.628 | n/a | 0.000 | 0.000 | 0.935 | 925.415 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.089 | 3.628 | 0.004 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000132 | 864.693 | 4.451 | n/a | 0.000 | 0.000 | 0.531 | 859.597 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.074 | 4.451 | 0.005 | 0.074 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000011b | 605.974 | 1.933 | n/a | 0.000 | 0.000 | 0.414 | 603.524 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.069 | 1.933 | 0.003 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000130 | 594.676 | 2.199 | n/a | 0.000 | 0.000 | 0.473 | 591.897 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.068 | 2.199 | 0.004 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000123 | 583.010 | 2.371 | n/a | 0.000 | 0.000 | 0.507 | 580.022 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.057 | 2.371 | 0.004 | 0.057 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000014b | 525.405 | 6.859 | n/a | 0.000 | 0.000 | 0.563 | 517.852 | 0.019 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.076 | 6.859 | 0.013 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000122 | 491.284 | 4.010 | n/a | 0.346 | 0.000 | 0.708 | 486.076 | 0.004 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.093 | 4.356 | 0.009 | 0.093 | gw-r/thread-50/journal/page | none observed |

## P3 / L1024 / internal (754 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.149 | n/a | n/a | n/a | 3.228 | n/a | 0.000 | 0.000 | 0.540 | 8.793 | 0.003 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.085 | 3.228 | 0.256 | 0.085 |
| p99 | 110.311 | n/a | n/a | n/a | 12.508 | n/a | 0.723 | 0.000 | 4.442 | 103.816 | 0.016 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.574 | 13.067 | 0.806 | 0.574 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f8ba3e2c0bf12a00000000000000157 | 1003.293 | 0.146 | n/a | 0.000 | 0.000 | 0.679 | 1001.245 | 0.010 | 0.000 | 0.079 | 0.000 | n/a | n/a | 1.135 | 0.146 | 0.000 | 1.135 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000159 | 1002.507 | 0.159 | n/a | 0.000 | 0.000 | 0.744 | 1000.462 | 0.003 | 0.000 | 0.020 | 0.000 | n/a | n/a | 1.120 | 0.159 | 0.000 | 1.120 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000152 | 849.774 | 2.017 | n/a | 0.000 | 0.000 | 0.351 | 847.311 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.061 | 2.017 | 0.002 | 0.061 | gw-r/thread-45/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000150 | 837.865 | 3.679 | n/a | 0.000 | 0.000 | 0.718 | 833.324 | 0.008 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.092 | 3.679 | 0.004 | 0.092 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000155 | 771.751 | 2.272 | n/a | 0.000 | 0.000 | 0.581 | 768.768 | 0.008 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.070 | 2.272 | 0.003 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000154 | 257.286 | 1.887 | n/a | 0.000 | 0.000 | 0.437 | 254.845 | 0.008 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.061 | 1.887 | 0.007 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000015a | 175.059 | 2.295 | n/a | 0.000 | 0.000 | 0.584 | 172.067 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.077 | 2.295 | 0.013 | 0.077 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000228 | 110.311 | 5.906 | n/a | 0.000 | 0.000 | 0.437 | 103.816 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.127 | 5.906 | 0.054 | 0.127 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000422 | 107.475 | 5.529 | n/a | 0.000 | 0.000 | 0.352 | 101.447 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.115 | 5.529 | 0.051 | 0.115 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000243 | 105.972 | 2.675 | n/a | 0.000 | 0.000 | 0.471 | 102.702 | 0.004 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.100 | 2.675 | 0.025 | 0.100 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000005a3 | 95.211 | 4.766 | n/a | 0.509 | 0.000 | 0.777 | 88.953 | 0.003 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.161 | 5.275 | 0.055 | 0.161 | gw-r/thread-51/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000006d9 | 93.942 | 3.228 | n/a | 0.000 | 0.000 | 0.353 | 90.243 | 0.002 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.108 | 3.228 | 0.034 | 0.108 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000695 | 92.468 | 3.416 | n/a | 0.000 | 0.000 | 0.531 | 88.432 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.078 | 3.416 | 0.037 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000003a4 | 91.536 | 3.138 | n/a | 0.000 | 0.000 | 0.383 | 87.934 | 0.006 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.062 | 3.138 | 0.034 | 0.062 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000571 | 83.381 | 5.918 | n/a | 0.000 | 0.000 | 0.464 | 76.838 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.115 | 5.918 | 0.071 | 0.115 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000042b | 80.664 | 2.349 | n/a | 0.000 | 0.000 | 2.296 | 75.866 | 0.004 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.093 | 2.349 | 0.029 | 0.093 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000006c6 | 79.218 | 7.646 | n/a | 0.000 | 0.000 | 1.374 | 69.965 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.200 | 7.646 | 0.097 | 0.200 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000527 | 78.952 | 5.269 | n/a | 0.000 | 0.000 | 0.536 | 70.240 | 0.003 | 0.000 | 2.755 | 0.000 | n/a | n/a | 0.148 | 5.269 | 0.067 | 0.148 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000006a2 | 75.485 | 3.661 | n/a | 0.000 | 0.000 | 0.400 | 71.333 | 0.002 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.084 | 3.661 | 0.048 | 0.084 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000000668 | 74.036 | 3.614 | n/a | 0.000 | 0.000 | 0.486 | 69.810 | 0.003 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.089 | 3.614 | 0.049 | 0.089 | gw-r/thread-50/journal/page | none observed |

## P3 / tail / internal (2213 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.314 | n/a | n/a | n/a | 4.551 | n/a | 0.000 | 0.000 | 0.473 | 7.304 | 0.003 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.130 | 4.576 | 0.361 | 0.130 |
| p99 | 345.722 | n/a | n/a | n/a | 17.563 | n/a | 1.549 | 0.000 | 4.598 | 340.014 | 0.017 | 0.000 | 0.043 | 0.000 | n/a | n/a | 1.823 | 18.462 | 0.848 | 1.823 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f8ba3e2c0bf12a00000000000001986 | 1002.486 | 0.099 | n/a | 0.000 | 0.000 | 0.397 | 1000.845 | 0.017 | 0.000 | 0.052 | 0.000 | n/a | n/a | 1.076 | 0.099 | 0.000 | 1.076 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000019c0 | 1002.367 | 0.141 | n/a | 0.000 | 0.000 | 0.572 | 1000.522 | 0.010 | 0.000 | 0.030 | 0.000 | n/a | n/a | 1.093 | 0.141 | 0.000 | 1.093 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000198c | 1002.144 | 0.088 | n/a | 0.000 | 0.000 | 0.394 | 1000.536 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 1.093 | 0.088 | 0.000 | 1.093 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000001983 | 1002.127 | 0.114 | n/a | 0.000 | 0.000 | 0.356 | 1000.529 | 0.006 | 0.000 | 0.033 | 0.000 | n/a | n/a | 1.090 | 0.114 | 0.000 | 1.090 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000019a3 | 1002.072 | 0.106 | n/a | 0.000 | 0.000 | 0.339 | 1000.483 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 1.087 | 0.106 | 0.000 | 1.087 | gw-r/thread-52/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000019bd | 1001.959 | 0.160 | n/a | 0.000 | 0.000 | 0.380 | 1000.283 | 0.011 | 0.000 | 0.013 | 0.000 | n/a | n/a | 1.112 | 0.160 | 0.000 | 1.112 | gw-r/thread-48/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000019b8 | 1001.926 | 0.115 | n/a | 0.000 | 0.000 | 0.319 | 1000.376 | 0.006 | 0.000 | 0.021 | 0.000 | n/a | n/a | 1.089 | 0.115 | 0.000 | 1.089 | gw-r/thread-51/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000019c5 | 1001.884 | 0.101 | n/a | 0.000 | 0.000 | 0.315 | 1000.362 | 0.006 | 0.000 | 0.018 | 0.000 | n/a | n/a | 1.082 | 0.101 | 0.000 | 1.082 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000001984 | 1001.856 | 0.100 | n/a | 0.000 | 0.000 | 0.347 | 1000.308 | 0.004 | 0.000 | 0.009 | 0.000 | n/a | n/a | 1.088 | 0.100 | 0.000 | 1.088 | gw-r/thread-45/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000019a1 | 1001.848 | 0.102 | n/a | 0.000 | 0.000 | 0.286 | 1000.357 | 0.004 | 0.000 | 0.018 | 0.000 | n/a | n/a | 1.082 | 0.102 | 0.000 | 1.082 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000001994 | 970.824 | 8.835 | n/a | 0.000 | 0.000 | 0.561 | 961.084 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.310 | 8.835 | 0.009 | 0.310 | gw-r/thread-45/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000019b0 | 918.842 | 2.375 | n/a | 0.000 | 0.000 | 0.236 | 916.147 | 0.008 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.051 | 2.375 | 0.003 | 0.051 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a00000000000001985 | 811.251 | 9.691 | n/a | 0.000 | 0.000 | 0.323 | 800.868 | 0.005 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.345 | 9.691 | 0.012 | 0.345 | gw-r/thread-47/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000019bf | 732.272 | 3.302 | n/a | 0.000 | 0.000 | 0.503 | 728.336 | 0.008 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.098 | 3.302 | 0.005 | 0.098 | gw-r/thread-51/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000199e | 716.214 | 6.099 | n/a | 0.000 | 0.000 | 0.600 | 709.232 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.224 | 6.099 | 0.009 | 0.224 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000199a | 696.362 | 9.981 | n/a | 0.883 | 0.000 | 0.282 | 684.683 | 0.010 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.488 | 10.864 | 0.016 | 0.488 | gw-r/thread-45/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000019b5 | 634.960 | 3.616 | n/a | 0.000 | 0.000 | 0.259 | 630.910 | 0.016 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.094 | 3.616 | 0.006 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 3f8ba3e2c0bf12a0000000000000198d | 628.759 | 5.719 | n/a | 0.000 | 0.000 | 0.797 | 621.979 | 0.009 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.222 | 5.719 | 0.009 | 0.222 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000019bb | 453.182 | 3.473 | n/a | 0.000 | 0.000 | 0.439 | 449.174 | 0.004 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.081 | 3.473 | 0.008 | 0.081 | gw-r/thread-50/journal/page | none observed |
| 3f8ba3e2c0bf12a000000000000019c2 | 443.942 | 2.668 | n/a | 0.000 | 0.000 | 0.453 | 440.694 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.084 | 2.668 | 0.006 | 0.084 | gw-r/thread-45/journal/page | none observed |

## P3 / warmup / read (70 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.680 | n/a | n/a | n/a | 0.036 | n/a | 0.000 | 0.000 | 0.966 | 201.291 | 0.013 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.081 | 0.036 | 0.000 | 0.081 |
| p99 | 208.202 | n/a | n/a | n/a | 0.087 | n/a | 0.000 | 0.000 | 5.050 | 204.975 | 21.481 | 0.000 | 1.268 | 0.000 | n/a | n/a | 0.330 | 0.087 | 0.001 | 0.330 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e9f2f10b8c1a9f0000000000000014 | 208.202 | 0.026 | n/a | 0.000 | 0.000 | 3.489 | 204.499 | 0.012 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.057 | 0.026 | 0.000 | 0.057 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000003b | 206.707 | 0.031 | n/a | 0.000 | 0.000 | 5.050 | 201.343 | 0.019 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.068 | 0.031 | 0.000 | 0.068 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000048 | 206.137 | 0.031 | n/a | 0.000 | 0.000 | 4.367 | 201.463 | 0.022 | 0.000 | 0.198 | 0.000 | n/a | n/a | 0.057 | 0.031 | 0.000 | 0.057 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000001e | 206.052 | 0.033 | n/a | 0.000 | 0.000 | 0.792 | 204.975 | 0.013 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.076 | 0.033 | 0.000 | 0.076 | gw-r/thread-50/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000000f | 205.981 | 0.048 | n/a | 0.000 | 0.000 | 0.968 | 204.704 | 0.012 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.101 | 0.048 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000000b | 205.659 | 0.032 | n/a | 0.000 | 0.000 | 3.828 | 201.551 | 0.012 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.096 | 0.032 | 0.000 | 0.096 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000009 | 205.165 | 0.054 | n/a | 0.000 | 0.000 | 3.276 | 201.307 | 0.020 | 0.000 | 0.178 | 0.000 | n/a | n/a | 0.330 | 0.054 | 0.000 | 0.330 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000002a | 205.025 | 0.042 | n/a | 0.000 | 0.000 | 0.646 | 204.163 | 0.009 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.086 | 0.042 | 0.000 | 0.086 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000003a | 204.879 | 0.032 | n/a | 0.000 | 0.000 | 0.807 | 203.799 | 0.012 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.088 | 0.032 | 0.000 | 0.088 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000001c | 204.873 | 0.046 | n/a | 0.000 | 0.000 | 1.568 | 203.002 | 0.024 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.108 | 0.046 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000034 | 204.792 | 0.035 | n/a | 0.000 | 0.000 | 1.331 | 203.148 | 0.012 | 0.000 | 0.186 | 0.000 | n/a | n/a | 0.079 | 0.035 | 0.000 | 0.079 | gw-r/thread-50/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000003d | 204.036 | 0.041 | n/a | 0.000 | 0.000 | 1.926 | 201.861 | 0.013 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.091 | 0.041 | 0.000 | 0.091 | gw-r/thread-50/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000008 | 203.826 | 0.044 | n/a | 0.000 | 0.000 | 1.561 | 201.961 | 0.012 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.107 | 0.044 | 0.000 | 0.107 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000028 | 203.804 | 0.049 | n/a | 0.000 | 0.000 | 0.957 | 202.538 | 0.012 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.125 | 0.049 | 0.000 | 0.125 | gw-r/thread-50/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000047 | 203.782 | 0.031 | n/a | 0.000 | 0.000 | 2.704 | 200.834 | 0.012 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000018 | 203.760 | 0.040 | n/a | 0.000 | 0.000 | 2.181 | 201.326 | 0.010 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.088 | 0.040 | 0.000 | 0.088 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000000d | 203.487 | 0.031 | n/a | 0.000 | 0.000 | 0.626 | 202.443 | 0.030 | 0.000 | 0.279 | 0.000 | n/a | n/a | 0.078 | 0.031 | 0.000 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000033 | 203.480 | 0.059 | n/a | 0.000 | 0.000 | 1.559 | 201.503 | 0.019 | 0.000 | 0.199 | 0.000 | n/a | n/a | 0.143 | 0.059 | 0.000 | 0.143 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000023 | 203.458 | 0.042 | n/a | 0.000 | 0.000 | 1.670 | 201.255 | 0.286 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.093 | 0.042 | 0.000 | 0.093 | gw-r/thread-50/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000013 | 203.340 | 0.034 | n/a | 0.000 | 0.000 | 0.667 | 201.551 | 0.013 | 0.000 | 0.993 | 0.000 | n/a | n/a | 0.082 | 0.034 | 0.000 | 0.082 | gw-r/thread-47/journal/page | none observed |

## P3 / L1 / read (83 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.428 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.829 | 201.033 | 0.014 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.078 | 0.037 | 0.000 | 0.078 |
| p99 | 209.928 | n/a | n/a | n/a | 0.099 | n/a | 0.000 | 0.000 | 4.752 | 209.158 | 19.869 | 0.000 | 3.514 | 0.000 | n/a | n/a | 0.200 | 0.099 | 0.001 | 0.200 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e9f2f10b8c1a9f0000000000000067 | 209.928 | 0.027 | n/a | 0.000 | 0.000 | 0.535 | 209.158 | 0.031 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.067 | 0.027 | 0.000 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000006f | 209.392 | 0.027 | n/a | 0.000 | 0.000 | 3.102 | 206.012 | 0.016 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.063 | 0.027 | 0.000 | 0.063 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000083 | 206.680 | 0.039 | n/a | 0.000 | 0.000 | 1.042 | 205.296 | 0.022 | 0.000 | 0.206 | 0.000 | n/a | n/a | 0.075 | 0.039 | 0.000 | 0.075 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000008d | 206.090 | 0.035 | n/a | 0.000 | 0.000 | 4.752 | 201.082 | 0.011 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.076 | 0.035 | 0.000 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000068 | 205.729 | 0.032 | n/a | 0.000 | 0.000 | 0.661 | 204.680 | 0.045 | 0.000 | 0.237 | 0.000 | n/a | n/a | 0.074 | 0.032 | 0.000 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000006e | 205.640 | 0.038 | n/a | 0.000 | 0.000 | 3.953 | 201.442 | 0.017 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.079 | 0.038 | 0.000 | 0.079 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000000a5 | 205.566 | 0.048 | n/a | 0.000 | 0.000 | 0.988 | 204.225 | 0.012 | 0.000 | 0.193 | 0.000 | n/a | n/a | 0.101 | 0.048 | 0.000 | 0.101 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000080 | 205.376 | 0.082 | n/a | 0.000 | 0.000 | 1.982 | 202.933 | 0.025 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.200 | 0.082 | 0.000 | 0.200 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000096 | 205.368 | 0.036 | n/a | 0.000 | 0.000 | 0.622 | 204.588 | 0.010 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.077 | 0.036 | 0.000 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000091 | 204.974 | 0.047 | n/a | 0.000 | 0.000 | 0.898 | 200.816 | 2.928 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.182 | 0.047 | 0.000 | 0.182 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000059 | 204.754 | 0.030 | n/a | 0.000 | 0.000 | 3.712 | 200.804 | 0.012 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.078 | 0.030 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000009d | 204.187 | 0.030 | n/a | 0.000 | 0.000 | 0.416 | 203.375 | 0.051 | 0.000 | 0.247 | 0.000 | n/a | n/a | 0.069 | 0.030 | 0.000 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000069 | 204.182 | 0.032 | n/a | 0.000 | 0.000 | 1.691 | 202.166 | 0.036 | 0.000 | 0.184 | 0.000 | n/a | n/a | 0.073 | 0.032 | 0.000 | 0.073 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000076 | 204.090 | 0.042 | n/a | 0.000 | 0.000 | 2.372 | 201.418 | 0.018 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.089 | 0.042 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000079 | 203.978 | 0.034 | n/a | 0.000 | 0.000 | 1.020 | 202.753 | 0.022 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.064 | 0.034 | 0.000 | 0.064 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000058 | 203.958 | 0.035 | n/a | 0.000 | 0.000 | 2.505 | 201.144 | 0.012 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.085 | 0.035 | 0.000 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000075 | 203.920 | 0.031 | n/a | 0.000 | 0.000 | 2.301 | 201.397 | 0.014 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000074 | 203.817 | 0.066 | n/a | 0.000 | 0.000 | 1.181 | 202.239 | 0.020 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.147 | 0.066 | 0.000 | 0.147 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000064 | 203.779 | 0.038 | n/a | 0.000 | 0.000 | 2.371 | 201.126 | 0.018 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.082 | 0.038 | 0.000 | 0.082 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000077 | 203.617 | 0.047 | n/a | 0.000 | 0.000 | 2.095 | 201.202 | 0.017 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.102 | 0.047 | 0.000 | 0.102 | gw-r/thread-51/journal/page | none observed |

## P3 / L4 / read (84 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.172 | n/a | n/a | n/a | 0.038 | n/a | 0.000 | 0.000 | 0.792 | 201.075 | 0.011 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.078 | 0.038 | 0.000 | 0.078 |
| p99 | 206.356 | n/a | n/a | n/a | 0.139 | n/a | 0.000 | 0.000 | 4.946 | 204.511 | 18.643 | 0.000 | 0.227 | 0.000 | n/a | n/a | 0.171 | 0.139 | 0.001 | 0.171 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e9f2f10b8c1a9f00000000000000b4 | 206.356 | 0.042 | n/a | 0.000 | 0.000 | 0.980 | 201.748 | 3.329 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.127 | 0.042 | 0.000 | 0.127 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000010e | 206.138 | 0.043 | n/a | 0.000 | 0.000 | 4.946 | 200.946 | 0.010 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.107 | 0.043 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000000c1 | 205.555 | 0.031 | n/a | 0.000 | 0.000 | 0.808 | 204.511 | 0.017 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.073 | 0.031 | 0.000 | 0.073 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000000d8 | 205.292 | 0.028 | n/a | 0.000 | 0.000 | 0.799 | 204.272 | 0.014 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.054 | 0.028 | 0.000 | 0.054 | gw-r/thread-50/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000104 | 205.143 | 0.060 | n/a | 0.000 | 0.000 | 1.318 | 203.459 | 0.009 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.166 | 0.060 | 0.000 | 0.166 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000000f5 | 204.846 | 0.027 | n/a | 0.000 | 0.000 | 0.510 | 204.154 | 0.019 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.093 | 0.027 | 0.000 | 0.093 | gw-r/thread-50/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000000cd | 204.221 | 0.031 | n/a | 0.000 | 0.000 | 2.076 | 201.855 | 0.021 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.076 | 0.031 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000106 | 204.003 | 0.047 | n/a | 0.000 | 0.000 | 1.556 | 202.113 | 0.016 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.119 | 0.047 | 0.000 | 0.119 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000000d7 | 203.947 | 0.029 | n/a | 0.000 | 0.000 | 0.540 | 203.196 | 0.010 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.067 | 0.029 | 0.000 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000000f8 | 203.872 | 0.033 | n/a | 0.000 | 0.000 | 1.921 | 201.646 | 0.073 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.068 | 0.033 | 0.000 | 0.068 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000010a | 203.850 | 0.040 | n/a | 0.000 | 0.000 | 0.651 | 202.823 | 0.021 | 0.000 | 0.227 | 0.000 | n/a | n/a | 0.090 | 0.040 | 0.000 | 0.090 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000000bd | 203.738 | 0.031 | n/a | 0.000 | 0.000 | 0.507 | 202.875 | 0.045 | 0.000 | 0.203 | 0.000 | n/a | n/a | 0.077 | 0.031 | 0.000 | 0.077 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000000c6 | 203.520 | 0.046 | n/a | 0.000 | 0.000 | 0.829 | 202.419 | 0.010 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.101 | 0.046 | 0.000 | 0.101 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000000eb | 203.436 | 0.050 | n/a | 0.000 | 0.000 | 0.672 | 202.480 | 0.017 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.083 | 0.050 | 0.000 | 0.083 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000000dd | 203.415 | 0.040 | n/a | 0.000 | 0.000 | 2.281 | 200.908 | 0.011 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.088 | 0.040 | 0.000 | 0.088 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000000c9 | 203.392 | 0.035 | n/a | 0.000 | 0.000 | 2.299 | 200.860 | 0.011 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.087 | 0.035 | 0.000 | 0.087 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000000e7 | 203.127 | 0.061 | n/a | 0.000 | 0.000 | 1.072 | 201.765 | 0.009 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.140 | 0.061 | 0.000 | 0.140 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000109 | 203.122 | 0.045 | n/a | 0.000 | 0.000 | 2.191 | 200.706 | 0.010 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.079 | 0.045 | 0.000 | 0.079 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000000b9 | 202.978 | 0.032 | n/a | 0.000 | 0.000 | 1.040 | 201.643 | 0.017 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.077 | 0.032 | 0.000 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000000b3 | 202.961 | 0.032 | n/a | 0.000 | 0.000 | 0.576 | 202.135 | 0.018 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.076 | 0.032 | 0.000 | 0.076 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / read (84 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.880 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.745 | 200.820 | 0.008 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.078 | 0.039 | 0.000 | 0.078 |
| p99 | 212.101 | n/a | n/a | n/a | 0.096 | n/a | 0.000 | 0.000 | 4.505 | 207.404 | 17.232 | 0.000 | 2.911 | 0.000 | n/a | n/a | 0.218 | 0.096 | 0.001 | 0.218 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e9f2f10b8c1a9f0000000000000144 | 212.101 | 0.031 | n/a | 0.000 | 0.000 | 4.505 | 207.404 | 0.031 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000131 | 206.417 | 0.034 | n/a | 0.000 | 0.000 | 4.338 | 201.754 | 0.021 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.075 | 0.034 | 0.000 | 0.075 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000130 | 205.658 | 0.055 | n/a | 0.000 | 0.000 | 1.756 | 203.599 | 0.024 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.123 | 0.055 | 0.000 | 0.123 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000145 | 205.597 | 0.034 | n/a | 0.000 | 0.000 | 0.840 | 204.550 | 0.030 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.071 | 0.034 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000015f | 205.546 | 0.031 | n/a | 0.000 | 0.000 | 0.728 | 204.636 | 0.006 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.071 | 0.031 | 0.000 | 0.071 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000011e | 205.321 | 0.033 | n/a | 0.000 | 0.000 | 0.682 | 204.325 | 0.078 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.071 | 0.033 | 0.000 | 0.071 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000133 | 205.179 | 0.042 | n/a | 0.000 | 0.000 | 0.582 | 204.392 | 0.010 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.100 | 0.042 | 0.000 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000012d | 204.750 | 0.036 | n/a | 0.000 | 0.000 | 0.432 | 204.119 | 0.006 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.084 | 0.036 | 0.000 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000013f | 204.177 | 0.030 | n/a | 0.000 | 0.000 | 0.520 | 200.630 | 0.022 | 0.000 | 2.911 | 0.000 | n/a | n/a | 0.063 | 0.030 | 0.000 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000160 | 203.684 | 0.043 | n/a | 0.000 | 0.000 | 2.600 | 200.833 | 0.020 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.105 | 0.043 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000154 | 203.499 | 0.033 | n/a | 0.000 | 0.000 | 0.969 | 202.359 | 0.006 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.068 | 0.033 | 0.000 | 0.068 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000124 | 203.493 | 0.040 | n/a | 0.000 | 0.000 | 0.661 | 202.568 | 0.029 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.083 | 0.040 | 0.000 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000014d | 203.411 | 0.096 | n/a | 0.000 | 0.000 | 1.571 | 201.426 | 0.013 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.218 | 0.096 | 0.000 | 0.218 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000157 | 203.389 | 0.063 | n/a | 0.000 | 0.000 | 0.880 | 202.230 | 0.006 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.147 | 0.063 | 0.000 | 0.147 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000014b | 203.346 | 0.045 | n/a | 0.000 | 0.000 | 2.371 | 200.764 | 0.006 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.104 | 0.045 | 0.000 | 0.104 | gw-r/thread-50/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000161 | 203.269 | 0.068 | n/a | 0.000 | 0.000 | 1.935 | 201.022 | 0.030 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.141 | 0.068 | 0.000 | 0.141 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000148 | 203.206 | 0.038 | n/a | 0.000 | 0.000 | 1.524 | 201.510 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.076 | 0.038 | 0.000 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000013c | 203.023 | 0.027 | n/a | 0.000 | 0.000 | 0.368 | 202.477 | 0.006 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.083 | 0.027 | 0.000 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000143 | 202.989 | 0.051 | n/a | 0.000 | 0.000 | 0.865 | 201.872 | 0.010 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.095 | 0.051 | 0.000 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000120 | 202.805 | 0.036 | n/a | 0.000 | 0.000 | 0.970 | 201.456 | 0.014 | 0.000 | 0.257 | 0.000 | n/a | n/a | 0.073 | 0.036 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |

## P3 / L64 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.542 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.671 | 200.762 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.076 | 0.040 | 0.000 | 0.076 |
| p99 | 205.749 | n/a | n/a | n/a | 0.093 | n/a | 0.000 | 0.000 | 3.382 | 204.809 | 6.992 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.167 | 0.093 | 0.001 | 0.167 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e9f2f10b8c1a9f000000000000018e | 206.218 | 0.038 | n/a | 0.000 | 0.000 | 1.160 | 204.809 | 0.015 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.072 | 0.038 | 0.000 | 0.072 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000019b | 205.749 | 0.031 | n/a | 0.000 | 0.000 | 0.754 | 204.816 | 0.008 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000182 | 205.706 | 0.052 | n/a | 0.000 | 0.000 | 0.819 | 204.664 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.119 | 0.052 | 0.000 | 0.119 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000001ae | 204.465 | 0.039 | n/a | 0.000 | 0.000 | 0.475 | 203.799 | 0.008 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.094 | 0.039 | 0.000 | 0.094 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000188 | 204.392 | 0.050 | n/a | 0.000 | 0.000 | 0.660 | 203.538 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.092 | 0.050 | 0.000 | 0.092 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000001c8 | 203.933 | 0.043 | n/a | 0.000 | 0.000 | 3.249 | 200.533 | 0.006 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.078 | 0.043 | 0.000 | 0.078 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000001a4 | 203.411 | 0.058 | n/a | 0.000 | 0.000 | 2.375 | 200.801 | 0.004 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.123 | 0.058 | 0.000 | 0.123 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000001cc | 202.883 | 0.031 | n/a | 0.000 | 0.000 | 0.895 | 201.740 | 0.045 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.079 | 0.031 | 0.000 | 0.079 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000197 | 202.793 | 0.033 | n/a | 0.000 | 0.000 | 1.345 | 201.253 | 0.010 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.070 | 0.033 | 0.000 | 0.070 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000001be | 202.704 | 0.023 | n/a | 0.000 | 0.000 | 0.812 | 201.654 | 0.049 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.054 | 0.023 | 0.000 | 0.054 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000017f | 202.431 | 0.032 | n/a | 0.000 | 0.000 | 0.813 | 201.409 | 0.009 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.080 | 0.032 | 0.000 | 0.080 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000001cd | 202.346 | 0.055 | n/a | 0.000 | 0.000 | 0.728 | 201.364 | 0.013 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.122 | 0.055 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000172 | 202.302 | 0.069 | n/a | 0.000 | 0.000 | 0.739 | 201.290 | 0.007 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.167 | 0.069 | 0.000 | 0.167 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000019d | 202.272 | 0.069 | n/a | 0.000 | 0.000 | 0.894 | 201.061 | 0.010 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.178 | 0.069 | 0.000 | 0.178 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000192 | 202.262 | 0.045 | n/a | 0.000 | 0.000 | 1.025 | 201.014 | 0.005 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.107 | 0.045 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000019c | 202.256 | 0.046 | n/a | 0.000 | 0.000 | 0.957 | 201.065 | 0.008 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.101 | 0.046 | 0.000 | 0.101 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000001d5 | 202.253 | 0.035 | n/a | 0.000 | 0.000 | 1.053 | 201.021 | 0.005 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.080 | 0.035 | 0.000 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000001ac | 202.241 | 0.044 | n/a | 0.000 | 0.000 | 1.013 | 201.012 | 0.006 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.094 | 0.044 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000001d0 | 202.209 | 0.075 | n/a | 0.000 | 0.000 | 1.043 | 200.893 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.140 | 0.075 | 0.000 | 0.140 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000001d4 | 202.151 | 0.054 | n/a | 0.000 | 0.000 | 0.771 | 201.058 | 0.017 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.165 | 0.054 | 0.000 | 0.165 | gw-r/thread-52/journal/page | none observed |

## P3 / L256 / read (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.601 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.688 | 200.733 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.074 | 0.043 | 0.000 | 0.074 |
| p99 | 206.175 | n/a | n/a | n/a | 0.084 | n/a | 0.000 | 0.000 | 4.419 | 204.865 | 13.242 | 0.000 | 1.477 | 0.000 | n/a | n/a | 0.207 | 0.084 | 0.001 | 0.207 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e9f2f10b8c1a9f0000000000000229 | 206.175 | 0.055 | n/a | 0.000 | 0.000 | 1.027 | 204.865 | 0.018 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.125 | 0.055 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000001f3 | 205.866 | 0.039 | n/a | 0.000 | 0.000 | 1.121 | 204.536 | 0.007 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.079 | 0.039 | 0.000 | 0.079 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000001f9 | 204.907 | 0.050 | n/a | 0.000 | 0.000 | 0.948 | 203.730 | 0.005 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.109 | 0.050 | 0.000 | 0.109 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000022f | 204.614 | 0.031 | n/a | 0.000 | 0.000 | 0.602 | 203.860 | 0.004 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000001e8 | 204.467 | 0.034 | n/a | 0.000 | 0.000 | 0.444 | 203.875 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.065 | 0.034 | 0.000 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000233 | 204.391 | 0.053 | n/a | 0.000 | 0.000 | 0.793 | 201.929 | 0.019 | 0.000 | 1.477 | 0.000 | n/a | n/a | 0.121 | 0.053 | 0.000 | 0.121 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000218 | 203.199 | 0.064 | n/a | 0.000 | 0.000 | 1.066 | 201.762 | 0.013 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.163 | 0.064 | 0.000 | 0.163 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000228 | 202.918 | 0.084 | n/a | 0.000 | 0.000 | 0.933 | 201.552 | 0.013 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.207 | 0.084 | 0.000 | 0.207 | gw-r/thread-50/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000207 | 202.820 | 0.066 | n/a | 0.000 | 0.000 | 0.997 | 201.565 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.146 | 0.066 | 0.000 | 0.146 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000001f1 | 202.718 | 0.048 | n/a | 0.000 | 0.000 | 1.195 | 201.248 | 0.006 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.105 | 0.048 | 0.000 | 0.105 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000202 | 202.706 | 0.038 | n/a | 0.000 | 0.000 | 1.083 | 201.372 | 0.008 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.071 | 0.038 | 0.000 | 0.071 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000239 | 202.617 | 0.063 | n/a | 0.000 | 0.000 | 1.259 | 201.076 | 0.006 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.138 | 0.063 | 0.000 | 0.138 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000238 | 202.527 | 0.051 | n/a | 0.000 | 0.000 | 0.864 | 201.367 | 0.010 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.145 | 0.051 | 0.000 | 0.145 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000210 | 202.297 | 0.043 | n/a | 0.000 | 0.000 | 1.204 | 200.920 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.082 | 0.043 | 0.000 | 0.082 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000023b | 202.272 | 0.057 | n/a | 0.000 | 0.000 | 1.161 | 200.878 | 0.006 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.111 | 0.057 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000209 | 202.177 | 0.038 | n/a | 0.000 | 0.000 | 0.564 | 201.338 | 0.014 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.085 | 0.038 | 0.000 | 0.085 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000001f0 | 202.101 | 0.062 | n/a | 0.000 | 0.000 | 1.029 | 200.820 | 0.007 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.120 | 0.062 | 0.000 | 0.120 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f00000000000001f5 | 202.073 | 0.054 | n/a | 0.000 | 0.000 | 0.952 | 200.872 | 0.006 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.120 | 0.054 | 0.000 | 0.120 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000219 | 202.056 | 0.047 | n/a | 0.000 | 0.000 | 0.955 | 200.881 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.117 | 0.047 | 0.000 | 0.117 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000021d | 202.033 | 0.062 | n/a | 0.000 | 0.000 | 1.098 | 200.704 | 0.005 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.113 | 0.062 | 0.000 | 0.113 | gw-r/thread-51/journal/page | none observed |

## P3 / L1024 / read (67 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 71.775 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.532 | 71.308 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.063 | 0.047 | 0.001 | 0.063 |
| p99 | 209.350 | n/a | n/a | n/a | 0.090 | n/a | 0.000 | 0.000 | 3.318 | 208.593 | 19.798 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.145 | 0.090 | 0.009 | 0.145 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e9f2f10b8c1a9f000000000000024e | 209.350 | 0.033 | n/a | 0.000 | 0.000 | 0.556 | 208.593 | 0.013 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.066 | 0.033 | 0.000 | 0.066 | gw-r/thread-50/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000251 | 203.101 | 0.034 | n/a | 0.000 | 0.000 | 0.366 | 202.561 | 0.007 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.067 | 0.034 | 0.000 | 0.067 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000254 | 202.633 | 0.043 | n/a | 0.000 | 0.000 | 0.441 | 202.044 | 0.007 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.073 | 0.043 | 0.000 | 0.073 | gw-r/thread-50/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000245 | 202.356 | 0.049 | n/a | 0.000 | 0.000 | 0.778 | 201.332 | 0.012 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.105 | 0.049 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000241 | 202.100 | 0.030 | n/a | 0.000 | 0.000 | 0.744 | 201.179 | 0.008 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.061 | 0.030 | 0.000 | 0.061 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000255 | 202.041 | 0.090 | n/a | 0.000 | 0.000 | 1.087 | 200.671 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.145 | 0.090 | 0.000 | 0.145 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000246 | 201.962 | 0.068 | n/a | 0.000 | 0.000 | 0.961 | 200.764 | 0.006 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.093 | 0.068 | 0.000 | 0.093 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000024a | 201.896 | 0.037 | n/a | 0.000 | 0.000 | 0.596 | 201.116 | 0.008 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.066 | 0.037 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000024f | 201.879 | 0.036 | n/a | 0.000 | 0.000 | 0.522 | 201.158 | 0.014 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.072 | 0.036 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000023f | 201.756 | 0.041 | n/a | 0.000 | 0.000 | 0.652 | 200.916 | 0.009 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.076 | 0.041 | 0.000 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000240 | 201.689 | 0.025 | n/a | 0.000 | 0.000 | 0.397 | 201.185 | 0.007 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.054 | 0.025 | 0.000 | 0.054 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000244 | 201.384 | 0.056 | n/a | 0.000 | 0.000 | 0.588 | 200.578 | 0.006 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.124 | 0.056 | 0.000 | 0.124 | gw-r/thread-50/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000248 | 201.371 | 0.055 | n/a | 0.000 | 0.000 | 0.646 | 200.501 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.123 | 0.055 | 0.000 | 0.123 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000024c | 201.347 | 0.029 | n/a | 0.000 | 0.000 | 0.382 | 200.812 | 0.008 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.059 | 0.029 | 0.000 | 0.059 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000242 | 201.335 | 0.032 | n/a | 0.000 | 0.000 | 0.537 | 200.653 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.063 | 0.032 | 0.000 | 0.063 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000252 | 201.327 | 0.030 | n/a | 0.000 | 0.000 | 0.496 | 200.694 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.061 | 0.030 | 0.000 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f000000000000024b | 201.200 | 0.030 | n/a | 0.000 | 0.000 | 0.489 | 200.576 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.064 | 0.030 | 0.000 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000250 | 201.175 | 0.028 | n/a | 0.000 | 0.000 | 0.532 | 200.522 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.061 | 0.028 | 0.000 | 0.061 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000253 | 201.155 | 0.025 | n/a | 0.000 | 0.000 | 0.438 | 200.598 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.051 | 0.025 | 0.000 | 0.051 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000256 | 201.126 | 0.032 | n/a | 0.000 | 0.000 | 0.455 | 200.531 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.066 | 0.032 | 0.000 | 0.066 | gw-r/thread-52/journal/page | none observed |

## P3 / tail / read (212 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 83.653 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.453 | 83.150 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.059 | 0.040 | 0.000 | 0.059 |
| p99 | 202.119 | n/a | n/a | n/a | 0.097 | n/a | 0.000 | 0.000 | 4.663 | 201.186 | 0.016 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.165 | 0.097 | 0.002 | 0.165 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e9f2f10b8c1a9f0000000000000e69 | 203.179 | 0.068 | n/a | 0.000 | 0.000 | 1.956 | 200.912 | 0.010 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.159 | 0.068 | 0.000 | 0.159 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000e84 | 202.138 | 0.095 | n/a | 0.000 | 0.000 | 0.666 | 201.186 | 0.018 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.079 | 0.095 | 0.000 | 0.079 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000e81 | 202.119 | 0.045 | n/a | 0.000 | 0.000 | 0.537 | 201.342 | 0.016 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.089 | 0.045 | 0.000 | 0.089 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000e56 | 202.080 | 0.062 | n/a | 0.000 | 0.000 | 0.796 | 201.015 | 0.011 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.134 | 0.062 | 0.000 | 0.134 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000e76 | 201.975 | 0.052 | n/a | 0.000 | 0.000 | 0.520 | 201.195 | 0.016 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.100 | 0.052 | 0.000 | 0.100 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000e61 | 201.969 | 0.057 | n/a | 0.000 | 0.000 | 0.556 | 201.160 | 0.015 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.098 | 0.057 | 0.000 | 0.098 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000eaf | 201.911 | 0.052 | n/a | 0.000 | 0.000 | 0.787 | 200.852 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.171 | 0.052 | 0.000 | 0.171 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000e77 | 201.911 | 0.066 | n/a | 0.000 | 0.000 | 0.888 | 200.836 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.068 | 0.066 | 0.000 | 0.068 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000e73 | 201.869 | 0.046 | n/a | 0.000 | 0.000 | 0.547 | 201.126 | 0.009 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.085 | 0.046 | 0.000 | 0.085 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000e46 | 201.861 | 0.025 | n/a | 0.000 | 0.000 | 1.213 | 200.528 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.054 | 0.025 | 0.000 | 0.054 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000ea5 | 201.789 | 0.043 | n/a | 0.000 | 0.000 | 0.596 | 200.987 | 0.010 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.094 | 0.043 | 0.000 | 0.094 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000e93 | 201.731 | 0.045 | n/a | 0.000 | 0.000 | 0.635 | 200.861 | 0.012 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.118 | 0.045 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000e83 | 201.711 | 0.028 | n/a | 0.000 | 0.000 | 0.516 | 201.044 | 0.010 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.057 | 0.028 | 0.000 | 0.057 | gw-r/thread-48/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000e63 | 201.700 | 0.056 | n/a | 0.000 | 0.000 | 0.519 | 200.915 | 0.013 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.134 | 0.056 | 0.000 | 0.134 | gw-r/thread-45/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000e80 | 201.638 | 0.031 | n/a | 0.000 | 0.000 | 0.315 | 201.118 | 0.016 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-51/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000ea3 | 201.625 | 0.034 | n/a | 0.000 | 0.000 | 0.539 | 200.918 | 0.009 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.068 | 0.034 | 0.000 | 0.068 | gw-r/thread-52/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000e9d | 201.577 | 0.079 | n/a | 0.000 | 0.000 | 0.906 | 200.403 | 0.004 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.168 | 0.079 | 0.000 | 0.168 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000ea4 | 201.569 | 0.058 | n/a | 0.000 | 0.000 | 0.610 | 200.716 | 0.009 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.128 | 0.058 | 0.000 | 0.128 | gw-r/thread-49/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000e5d | 201.521 | 0.060 | n/a | 0.000 | 0.000 | 0.634 | 200.627 | 0.009 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.143 | 0.060 | 0.000 | 0.143 | gw-r/thread-47/journal/page | none observed |
| 54e9f2f10b8c1a9f0000000000000ea8 | 201.505 | 0.039 | n/a | 0.000 | 0.000 | 0.736 | 200.606 | 0.008 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.077 | 0.039 | 0.000 | 0.077 | gw-r/thread-52/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/3.229 ms; post-ACK p50/p99: 0.382/1.942 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 11.344 | 10.877 | 10.647 | reported |
| All-primary p99 ms | 44.989 | 44.430 | 43.802 | <=50 |
| L256 5-10 p50Ms | 15.935 | 15.615 | 15.615 | <=10 |
| L256 5-10 p99Ms | 89.718 | 89.354 | 89.351 | <=50 |
| L256 11-25 p50Ms | 22.911 | 22.527 | 22.527 | <=10 |
| L256 11-25 p99Ms | 36.761 | 36.253 | 36.252 | <=50 |
| L256 26-50 p50Ms | 22.271 | 21.631 | 21.631 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 26.422 | 25.532 | 25.530 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 9.727 | 9.407 | 9.215 | <=10 |
| Burst 11-25 p50 ms | 11.967 | 11.327 | 11.135 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 89.718 | 89.354 | 89.351 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 116.567 | 115.945 | 115.943 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 8 | 33.248/57.130 | 32.408 | 14.126 | 32.240 | 0.104/0.040 |
| 5-10 | >=1000 | 31 | 15.821/118.606 | 15.541 | 11.584 | 26.297 | 0.072/0.023 |
| 5-10 | 250-1000 | 35 | 16.574/89.656 | 16.297 | 10.954 | 27.427 | 0.081/0.021 |
| 11-25 | 250-1000 | 23 | 20.143/36.703 | 19.669 | 12.620 | 33.590 | 0.083/0.022 |
| 5-10 | 100-250 | 15 | 15.806/48.932 | 15.487 | 10.301 | 18.945 | 0.067/0.025 |
| 11-25 | >=1000 | 13 | 29.410/139.178 | 28.961 | 22.110 | 50.147 | 0.076/0.022 |
| 26-50 | 250-1000 | 8 | 24.562/56.264 | 23.824 | 16.401 | 36.625 | 0.088/0.021 |
| 11-25 | 100-250 | 6 | 9.536/34.677 | 8.938 | 5.083 | 12.465 | 0.067/0.019 |
| 11-25 | overlap | 363 | 13.337/44.003 | 12.753 | 8.269 | 18.898 | 0.042/0.016 |
| 5-10 | 0-50 | 1130 | 8.486/27.520 | 8.146 | 4.783 | 11.650 | 0.041/0.016 |
| 5-10 | 50-100 | 59 | 8.910/114.397 | 8.601 | 4.847 | 12.335 | 0.048/0.016 |
| 11-25 | 0-50 | 543 | 10.346/29.960 | 9.793 | 5.459 | 13.632 | 0.047/0.017 |
| 26-50 | overlap | 139 | 17.545/41.556 | 16.272 | 10.077 | 24.117 | 0.051/0.017 |
| 11-25 | 50-100 | 38 | 12.007/26.450 | 11.437 | 6.621 | 16.905 | 0.062/0.017 |
| 5-10 | overlap | 795 | 11.116/41.903 | 10.757 | 6.854 | 15.465 | 0.035/0.016 |
| 26-50 | 0-50 | 202 | 14.244/41.031 | 13.244 | 7.112 | 18.359 | 0.057/0.017 |
| 26-50 | 50-100 | 12 | 14.144/36.968 | 13.277 | 7.528 | 18.205 | 0.070/0.019 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 880 | 15 | 1201.053 |
| burst | 2540 | 6 | 442.542 |

## Writer heap, GC and scheduler stalls

Source d62b4e952e5d2b0c5570225ff6e612eabee2f38b; 3420 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 100.336 / 261.306 |
| GC events / total duration / maximum ms | 646 / 828.506 / 22.091 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":622,"4":12,"8":12} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 44.989 / 21 / 1643.595 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.
