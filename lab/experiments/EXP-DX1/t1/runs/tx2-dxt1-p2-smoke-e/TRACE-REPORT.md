# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (269.421 ms, trace `2f5733cfb082861c000000000000010e`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (256.870 ms, trace `2f5733cfb082861c000000000000010f`); `node-14/thread-0/driver.queue.subject` (203.686 ms, trace `2f5733cfb082861c0000000000000110`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (93.490 ms, trace `2f5733cfb082861c00000000000000bb`); `gw-w/thread-65/peer.transact-await (includes order/network/storage)` (128.331 ms, trace `2f5733cfb082861c000000000000014b`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p2-smoke-e`; source `79dd8d09cc47ab974da6387945512767732c892c`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 84/84 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 84/84. Raw trace bytes: 788679.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 105 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: 231 spans have a missing local parent (context or retention bug). Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1277.178 | 153.691 | 20.409 | 36 |
| baseline | 0 | 1939.189 | 41.885 | 0.779 | 44 |
| L1 | 1 | 1964.692 | 138.243 | 2.052 | 30 |
| L4 | 4 | 1967.693 | 262.114 | 9.888 | 44 |
| L16 | 16 | 1915.674 | 226.166 | 8.398 | 44 |
| L64 | 16 | 1814.940 | 208.870 | 4.292 | 44 |
| L256 | 16 | 1895.917 | 252.961 | 3.919 | 58 |
| L1024 | 16 | 1942.218 | 281.947 | 4.995 | 16 |
| recovery | 16 | 1946.465 | 193.227 | 4.574 | 44 |
| p4mix | 1 | 1972.036 | 38.741 | 3.444 | 43 |
| p4h1 | 1 | 1031.643 | 15.898 | 0.485 | 16 |
| grow3 | 0 | 468.474 | 70.069 | 0.115 | 36 |
| p4h3 | 1 | 2356.896 | 83.378 | 6.351 | 122 |
| grow10 | 0 | 266.671 | 96.806 | 1.041 | 22 |
| p4h10 | 1 | 2346.908 | 95.570 | 1.500 | 72 |
| presweep | 16 | 1027.553 | 92.105 | 1.696 | 30 |
| sweep | 16 | 183.125 | 55.435 | 21.924 | 140 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 2f5733cfb082861c000000000000010e | driver.queue.scheduler-late | 0.433 | none | 0 / 32 |
| 2f5733cfb082861c000000000000010e | driver.queue.scheduler-dispatch | 0.061 | none | 0 / 32 |

Observed active steps while trace 2f5733cfb082861c000000000000010e waited: []

| 2f5733cfb082861c000000000000010f | driver.queue.scheduler-late | 0.405 | none | 1 / 32 |
| 2f5733cfb082861c000000000000010f | driver.queue.scheduler-dispatch | 0.047 | none | 1 / 32 |

Observed active steps while trace 2f5733cfb082861c000000000000010f waited: []

| 2f5733cfb082861c0000000000000110 | driver.queue.subject | 203.686 | 2f5733cfb082861c000000000000010e | 2 / 32 |
| 2f5733cfb082861c0000000000000110 | driver.queue.scheduler-late | 0.816 | none | 2 / 32 |
| 2f5733cfb082861c0000000000000110 | driver.queue.scheduler-dispatch | 0.097 | none | 2 / 32 |

Observed active steps while trace 2f5733cfb082861c0000000000000110 waited: [{"at":1794551533480.421,"inFlight":2,"capacity":32,"active":[{"traceId":"2f5733cfb082861c000000000000010e","step":"client.http"},{"traceId":"2f5733cfb082861c000000000000010f","step":"client.http"}]},{"at":1794551533500.9026,"inFlight":2,"capacity":32,"active":[{"traceId":"2f5733cfb082861c000000000000010e","step":"client.http"},{"traceId":"2f5733cfb082861c000000000000010f","step":"client.http"}]},{"at":1794551533520.4077,"inFlight":2,"capacity":32,"active":[{"traceId":"2f5733cfb082861c000000000000010e","step":"client.http"},{"traceId":"2f5733cfb082861c000000000000010f","step":"client.http"}]},{"at":1794551533540.234,"inFlight":2,"capacity":32,"active":[{"traceId":"2f5733cfb082861c000000000000010e","step":"client.http"},{"traceId":"2f5733cfb082861c000000000000010f","step":"client.http"}]},{"at":1794551533560.8174,"inFlight":2,"capacity":32,"active":[{"traceId":"2f5733cfb082861c000000000000010e","step":"client.http"},{"traceId":"2f5733cfb082861c000000000000010f","step":"client.http"}]},{"at":1794551533580.1433,"inFlight":2,"capacity":32,"active":[{"traceId":"2f5733cfb082861c000000000000010e","step":"client.http"},{"traceId":"2f5733cfb082861c000000000000010f","step":"client.http"}]},{"at":1794551533600.497,"inFlight":2,"capacity":32,"active":[{"traceId":"2f5733cfb082861c000000000000010e","step":"client.http"},{"traceId":"2f5733cfb082861c000000000000010f","step":"client.http"}]},{"at":1794551533619.954,"inFlight":2,"capacity":32,"active":[{"traceId":"2f5733cfb082861c000000000000010e","step":"client.http"},{"traceId":"2f5733cfb082861c000000000000010f","step":"client.http"}]},{"at":1794551533640.3564,"inFlight":2,"capacity":32,"active":[{"traceId":"2f5733cfb082861c000000000000010e","step":"client.http"},{"traceId":"2f5733cfb082861c000000000000010f","step":"client.http"}]},{"at":1794551533660.1616,"inFlight":3,"capacity":32,"active":[{"traceId":"2f5733cfb082861c000000000000010e","step":"client.http"},{"traceId":"2f5733cfb082861c000000000000010f","step":"client.http"},{"traceId":"2f5733cfb082861c0000000000000111","step":"rpc.probe.transact"}]}]

| 2f5733cfb082861c00000000000000bb | driver.queue.scheduler-dispatch | 0.069 | none | 0 / 32 |
| 2f5733cfb082861c00000000000000bb | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 2f5733cfb082861c00000000000000bb waited: []

| 2f5733cfb082861c000000000000014b | driver.queue.scheduler-dispatch | 0.083 | none | 9 / 32 |
| 2f5733cfb082861c000000000000014b | driver.queue.scheduler-late | 0.001 | none | 9 / 32 |

Observed active steps while trace 2f5733cfb082861c000000000000014b waited: []

## P2 / warmup / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 52.777 | 1.355 | 0.000 | 1.659 | 12.180 | 0.010 | 0.000 | 0.663 | 1.801 | 7.733 | 0.167 | n/a | 0.835 | 24.591 | n/a | n/a | 0.060 | 12.853 | 0.244 | 0.060 |
| p99 | 66.392 | 3.604 | 0.166 | 4.647 | 27.109 | 0.708 | 0.000 | 1.130 | 4.624 | 8.228 | 0.310 | n/a | 3.858 | 28.830 | n/a | n/a | 0.558 | 27.903 | 0.420 | 0.558 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c0000000000000096 | 66.392 | 27.109 | 0.708 | 0.000 | 0.086 | 4.624 | 8.228 | 0.310 | n/a | 0.683 | 24.591 | n/a | n/a | 0.053 | 27.903 | 0.420 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c0000000000000094 | 52.777 | 12.180 | 0.010 | 0.000 | 0.663 | 1.801 | 7.733 | 0.167 | n/a | 0.835 | 28.830 | n/a | n/a | 0.558 | 12.853 | 0.244 | 0.558 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c0000000000000098 | 26.535 | 3.517 | 0.006 | 0.000 | 1.130 | 0.813 | 1.627 | 0.043 | n/a | 3.858 | 15.482 | n/a | n/a | 0.060 | 4.652 | 0.175 | 0.060 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.535 | 1.355 | 0.000 | 1.659 | 3.517 | 0.006 | 0.000 | 1.130 | 0.813 | 1.627 | 0.043 | n/a | 3.858 | 15.482 | n/a | n/a | 0.060 | 4.652 | 0.175 | 0.060 |
| p99 | 26.535 | 1.355 | 0.000 | 1.659 | 3.517 | 0.006 | 0.000 | 1.130 | 0.813 | 1.627 | 0.043 | n/a | 3.858 | 15.482 | n/a | n/a | 0.060 | 4.652 | 0.175 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c0000000000000098 | 26.535 | 3.517 | 0.006 | 0.000 | 1.130 | 0.813 | 1.627 | 0.043 | n/a | 3.858 | 15.482 | n/a | n/a | 0.060 | 4.652 | 0.175 | 0.060 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.256 | 0.292 | 0.000 | 0.904 | 5.685 | 0.272 | 0.000 | 0.128 | 2.536 | 6.723 | 0.071 | n/a | 0.500 | 13.731 | n/a | n/a | 0.061 | 6.369 | 0.182 | 0.061 |
| p99 | 66.141 | 2.740 | 0.003 | 3.399 | 7.574 | 0.597 | 0.490 | 1.023 | 5.383 | 25.891 | 0.189 | n/a | 7.676 | 47.284 | n/a | n/a | 0.148 | 8.177 | 0.342 | 0.148 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000ff | 66.141 | 6.699 | 0.006 | 0.000 | 0.702 | 1.013 | 2.657 | 0.040 | n/a | 7.676 | 47.284 | n/a | n/a | 0.063 | 7.408 | 0.112 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c000000000000009a | 62.646 | 7.574 | 0.367 | 0.000 | 0.128 | 2.814 | 6.723 | 0.081 | n/a | 0.865 | 43.975 | n/a | n/a | 0.118 | 8.069 | 0.129 | 0.118 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c000000000000012b | 51.959 | 5.357 | 0.443 | 0.331 | 0.131 | 5.383 | 25.891 | 0.079 | n/a | 0.555 | 13.731 | n/a | n/a | 0.059 | 6.261 | 0.121 | 0.059 | gw-w/thread-45/gateway.admitted-work | none observed |
| 2f5733cfb082861c00000000000000e8 | 47.374 | 5.685 | 0.597 | 0.000 | 0.087 | 3.530 | 18.454 | 0.118 | n/a | 0.259 | 18.574 | n/a | n/a | 0.070 | 6.369 | 0.134 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000f9 | 46.428 | 5.703 | 0.353 | 0.000 | 0.050 | 4.323 | 8.570 | 0.106 | n/a | 4.368 | 22.904 | n/a | n/a | 0.051 | 6.106 | 0.132 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c0000000000000127 | 37.524 | 5.972 | 0.276 | 0.490 | 0.086 | 3.078 | 15.206 | 0.082 | n/a | 0.306 | 11.880 | n/a | n/a | 0.148 | 6.824 | 0.182 | 0.148 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c000000000000012d | 36.256 | 5.559 | 0.568 | 0.448 | 0.092 | 2.030 | 15.606 | 0.189 | n/a | 0.500 | 11.219 | n/a | n/a | 0.044 | 6.667 | 0.184 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000e6 | 31.883 | 7.240 | 0.011 | 0.000 | 0.927 | 1.352 | 1.738 | 0.049 | n/a | 0.326 | 20.200 | n/a | n/a | 0.040 | 8.177 | 0.256 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000fb | 30.987 | 5.290 | 0.010 | 0.000 | 0.607 | 0.975 | 7.258 | 0.060 | n/a | 0.278 | 16.441 | n/a | n/a | 0.068 | 5.908 | 0.191 | 0.068 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c0000000000000103 | 22.107 | 4.556 | 0.012 | 0.000 | 1.023 | 5.201 | 1.675 | 0.071 | n/a | 0.282 | 9.227 | n/a | n/a | 0.061 | 5.591 | 0.253 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c0000000000000129 | 21.639 | 4.411 | 0.012 | 0.000 | 0.810 | 0.946 | 2.767 | 0.041 | n/a | 0.686 | 11.912 | n/a | n/a | 0.056 | 5.233 | 0.242 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c0000000000000101 | 21.616 | 7.033 | 0.272 | 0.000 | 0.084 | 2.536 | 2.839 | 0.056 | n/a | 0.695 | 8.041 | n/a | n/a | 0.061 | 7.388 | 0.342 | 0.061 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.008 | 0.455 | 0.000 | 0.833 | 5.265 | 0.009 | 0.000 | 0.134 | 2.256 | 4.004 | 0.117 | n/a | 0.526 | 7.322 | n/a | n/a | 0.113 | 5.672 | 0.193 | 0.113 |
| p99 | 36.197 | 1.332 | 0.000 | 2.159 | 7.604 | 0.329 | 0.000 | 0.401 | 8.530 | 15.050 | 0.128 | n/a | 1.263 | 14.603 | n/a | n/a | 0.195 | 7.920 | 0.311 | 0.195 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000a2 | 36.197 | 6.506 | 0.329 | 0.000 | 0.134 | 3.723 | 15.050 | 0.117 | n/a | 0.467 | 9.676 | n/a | n/a | 0.195 | 6.969 | 0.193 | 0.195 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c000000000000009c | 30.044 | 5.265 | 0.006 | 0.000 | 0.401 | 2.256 | 6.099 | 0.124 | n/a | 1.177 | 14.603 | n/a | n/a | 0.113 | 5.672 | 0.189 | 0.113 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c000000000000009e | 28.008 | 7.604 | 0.235 | 0.000 | 0.080 | 8.530 | 4.004 | 0.128 | n/a | 1.263 | 6.110 | n/a | n/a | 0.052 | 7.920 | 0.283 | 0.052 | node-14/thread-8/socket.wait-first-byte | none observed |
| 2f5733cfb082861c00000000000000a0 | 17.273 | 4.987 | 0.009 | 0.000 | 0.376 | 1.478 | 2.376 | 0.046 | n/a | 0.526 | 7.322 | n/a | n/a | 0.153 | 5.372 | 0.311 | 0.153 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.273 | 0.665 | 0.000 | 2.087 | 4.987 | 0.006 | 0.000 | 0.376 | 1.478 | 2.376 | 0.046 | n/a | 0.526 | 7.322 | n/a | n/a | 0.113 | 5.372 | 0.189 | 0.113 |
| p99 | 30.044 | 1.332 | 0.000 | 2.159 | 5.265 | 0.009 | 0.000 | 0.401 | 2.256 | 6.099 | 0.124 | n/a | 1.177 | 14.603 | n/a | n/a | 0.153 | 5.672 | 0.311 | 0.153 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c000000000000009c | 30.044 | 5.265 | 0.006 | 0.000 | 0.401 | 2.256 | 6.099 | 0.124 | n/a | 1.177 | 14.603 | n/a | n/a | 0.113 | 5.672 | 0.189 | 0.113 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000a0 | 17.273 | 4.987 | 0.009 | 0.000 | 0.376 | 1.478 | 2.376 | 0.046 | n/a | 0.526 | 7.322 | n/a | n/a | 0.153 | 5.372 | 0.311 | 0.153 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.746 | 0.000 | 0.000 | 0.419 | 7.572 | 0.182 | 0.000 | 0.093 | 1.943 | 3.110 | 0.066 | n/a | 0.512 | 18.371 | n/a | n/a | 0.071 | 7.874 | 0.240 | 0.071 |
| p99 | 33.426 | 2.879 | 0.000 | 3.213 | 8.416 | 0.215 | 0.000 | 0.575 | 2.199 | 6.182 | 0.083 | n/a | 1.299 | 19.181 | n/a | n/a | 0.080 | 8.691 | 0.260 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000a6 | 33.426 | 8.416 | 0.182 | 0.000 | 0.093 | 2.199 | 2.749 | 0.066 | n/a | 1.299 | 18.371 | n/a | n/a | 0.051 | 8.691 | 0.260 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000a9 | 32.746 | 7.572 | 0.215 | 0.000 | 0.087 | 1.943 | 3.110 | 0.056 | n/a | 0.512 | 19.181 | n/a | n/a | 0.071 | 7.874 | 0.240 | 0.071 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000a3 | 30.116 | 6.483 | 0.005 | 0.000 | 0.575 | 1.376 | 6.182 | 0.083 | n/a | 0.341 | 14.991 | n/a | n/a | 0.080 | 7.063 | 0.235 | 0.080 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.865 | 0.454 | 0.000 | 0.460 | 7.237 | 0.007 | 0.000 | 0.078 | 1.257 | 3.709 | 0.057 | n/a | 0.904 | 17.892 | n/a | n/a | 0.043 | 7.907 | 0.220 | 0.043 |
| p99 | 84.890 | 1.564 | 0.000 | 2.459 | 18.389 | 0.178 | 0.000 | 0.663 | 3.917 | 13.307 | 0.422 | n/a | 6.512 | 47.640 | n/a | n/a | 0.063 | 18.642 | 0.345 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000b2 | 84.890 | 18.389 | 0.178 | 0.000 | 0.074 | 3.917 | 13.307 | 0.422 | n/a | 0.904 | 47.640 | n/a | n/a | 0.059 | 18.642 | 0.220 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000af | 43.173 | 14.680 | 0.145 | 0.000 | 0.078 | 1.986 | 5.991 | 0.083 | n/a | 2.281 | 17.892 | n/a | n/a | 0.037 | 14.903 | 0.345 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000aa | 32.865 | 7.237 | 0.007 | 0.000 | 0.663 | 0.981 | 3.709 | 0.050 | n/a | 0.871 | 19.286 | n/a | n/a | 0.063 | 7.907 | 0.241 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000ad | 30.863 | 3.781 | 0.006 | 0.000 | 0.257 | 1.257 | 1.714 | 0.057 | n/a | 6.512 | 17.237 | n/a | n/a | 0.043 | 4.043 | 0.131 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 61.341 | 0.741 | 0.000 | 1.003 | 7.547 | 0.014 | 0.000 | 0.135 | 2.663 | 5.707 | 0.119 | n/a | 1.222 | 35.584 | n/a | n/a | 0.053 | 8.008 | 0.130 | 0.053 |
| p99 | 186.103 | 1.917 | 0.000 | 2.638 | 9.388 | 0.481 | 0.000 | 0.614 | 6.428 | 78.779 | 0.222 | n/a | 5.947 | 93.490 | n/a | n/a | 0.068 | 9.680 | 0.216 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000bb | 186.103 | 9.388 | 0.220 | 0.000 | 0.072 | 2.663 | 78.779 | 0.222 | n/a | 1.222 | 93.490 | n/a | n/a | 0.046 | 9.680 | 0.052 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000b4 | 72.548 | 8.827 | 0.481 | 0.000 | 0.135 | 6.428 | 4.722 | 0.119 | n/a | 1.899 | 49.876 | n/a | n/a | 0.060 | 9.444 | 0.130 | 0.060 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000b6 | 61.341 | 7.547 | 0.014 | 0.000 | 0.447 | 1.786 | 9.770 | 0.178 | n/a | 5.947 | 35.584 | n/a | n/a | 0.068 | 8.008 | 0.131 | 0.068 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000b8 | 31.268 | 6.123 | 0.012 | 0.000 | 0.614 | 2.989 | 5.707 | 0.057 | n/a | 0.345 | 15.368 | n/a | n/a | 0.053 | 6.749 | 0.216 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.268 | 1.580 | 0.000 | 2.251 | 6.123 | 0.012 | 0.000 | 0.447 | 1.786 | 5.707 | 0.057 | n/a | 0.345 | 15.368 | n/a | n/a | 0.053 | 6.749 | 0.131 | 0.053 |
| p99 | 61.341 | 1.917 | 0.000 | 2.638 | 7.547 | 0.014 | 0.000 | 0.614 | 2.989 | 9.770 | 0.178 | n/a | 5.947 | 35.584 | n/a | n/a | 0.068 | 8.008 | 0.216 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000b6 | 61.341 | 7.547 | 0.014 | 0.000 | 0.447 | 1.786 | 9.770 | 0.178 | n/a | 5.947 | 35.584 | n/a | n/a | 0.068 | 8.008 | 0.131 | 0.068 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000b8 | 31.268 | 6.123 | 0.012 | 0.000 | 0.614 | 2.989 | 5.707 | 0.057 | n/a | 0.345 | 15.368 | n/a | n/a | 0.053 | 6.749 | 0.216 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 93.192 | 0.776 | 0.000 | 0.977 | 5.874 | 0.005 | 0.000 | 0.117 | 1.140 | 14.041 | 0.149 | n/a | 0.700 | 26.581 | n/a | n/a | 0.050 | 6.273 | 0.058 | 0.050 |
| p99 | 118.150 | 1.638 | 0.004 | 2.248 | 6.380 | 0.345 | 0.550 | 0.770 | 2.768 | 55.463 | 0.224 | n/a | 1.481 | 96.439 | n/a | n/a | 0.077 | 7.379 | 0.180 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000bd | 118.150 | 5.874 | 0.005 | 0.000 | 0.394 | 1.066 | 14.041 | 0.053 | n/a | 0.241 | 96.439 | n/a | n/a | 0.037 | 6.273 | 0.053 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000c5 | 112.534 | 6.110 | 0.271 | 0.000 | 0.117 | 2.688 | 28.700 | 0.149 | n/a | 1.481 | 72.969 | n/a | n/a | 0.050 | 6.498 | 0.058 | 0.050 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000c0 | 93.192 | 6.380 | 0.345 | 0.550 | 0.103 | 2.768 | 55.463 | 0.224 | n/a | 0.700 | 26.581 | n/a | n/a | 0.077 | 7.379 | 0.079 | 0.077 | gw-w/thread-48/gateway.admitted-work | none observed |
| 2f5733cfb082861c00000000000000c2 | 24.706 | 3.673 | 0.005 | 0.000 | 0.770 | 1.140 | 3.924 | 0.188 | n/a | 1.322 | 13.636 | n/a | n/a | 0.050 | 4.447 | 0.180 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.171 | n/a | n/a | n/a | 12.877 | 0.120 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 14.977 | 0.998 | 0.020 |
| p99 | 162.521 | n/a | n/a | n/a | 35.925 | 24.845 | 2.767 | 0.000 | 1.250 | 109.938 | 3.483 | n/a | 0.292 | 0.000 | n/a | n/a | 42.085 | 51.437 | 0.999 | 42.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000be | 162.521 | 33.076 | 17.147 | 1.213 | 0.000 | 0.824 | 109.938 | 0.015 | n/a | 0.292 | 0.000 | n/a | n/a | 0.016 | 51.437 | 0.316 | 0.016 | gw-w/thread-47/gateway.admitted-work | none observed |
| 2f5733cfb082861c00000000000000cf | 122.679 | 28.447 | 15.430 | 0.000 | 0.000 | 1.250 | 73.999 | 3.483 | n/a | 0.046 | 0.000 | n/a | n/a | 0.024 | 43.876 | 0.358 | 0.024 | gw-w/thread-46/gateway.admitted-work | none observed |
| 2f5733cfb082861c00000000000000fc | 68.332 | 18.380 | 6.856 | 0.000 | 0.000 | 1.012 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.085 | 25.235 | 0.369 | 42.085 | node-14/thread-0/socket.wait-first-byte | none observed |
| 2f5733cfb082861c000000000000010c | 50.158 | 14.101 | 1.282 | 0.000 | 0.000 | 0.693 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.083 | 15.383 | 0.307 | 34.083 | node-14/thread-0/socket.wait-first-byte | none observed |
| 2f5733cfb082861c000000000000011e | 47.841 | 12.185 | 24.845 | 0.000 | 0.000 | 0.434 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.377 | 37.030 | 0.774 | 10.377 | node-14/thread-0/rpc.replica.observe | client.encode 3.818ms |
| 2f5733cfb082861c0000000000000095 | 39.792 | 35.925 | 1.014 | 2.767 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.085 | 39.707 | 0.998 | 0.085 | node-14/thread-2/replica.pull-at | none observed |
| 2f5733cfb082861c000000000000012f | 36.184 | 13.143 | 1.834 | 0.000 | 0.000 | 0.389 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.818 | 14.977 | 0.414 | 20.818 | node-14/thread-0/socket.wait-first-byte | none observed |
| 2f5733cfb082861c0000000000000100 | 21.265 | 19.307 | 0.092 | 1.845 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 21.245 | 0.999 | 0.020 | node-14/thread-2/replica.pull-at | none observed |
| 2f5733cfb082861c00000000000000dd | 17.567 | 17.412 | 0.124 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.031 | 17.536 | 0.998 | 0.031 | node-14/thread-2/replica.pull-at | none observed |
| 2f5733cfb082861c0000000000000134 | 16.980 | 16.904 | 0.060 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 16.965 | 0.999 | 0.016 | node-14/thread-2/replica.pull-at | none observed |
| 2f5733cfb082861c0000000000000117 | 16.171 | 16.094 | 0.060 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 16.153 | 0.999 | 0.018 | node-14/thread-2/replica.pull-at | none observed |
| 2f5733cfb082861c00000000000000e7 | 12.963 | 12.877 | 0.073 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 12.949 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| 2f5733cfb082861c00000000000000da | 12.918 | 12.787 | 0.119 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 12.905 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| 2f5733cfb082861c0000000000000106 | 12.837 | 12.705 | 0.110 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 12.814 | 0.998 | 0.023 | node-14/thread-2/replica.pull-at | none observed |
| 2f5733cfb082861c00000000000000f0 | 11.866 | 11.708 | 0.144 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 11.852 | 0.999 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| 2f5733cfb082861c000000000000013b | 11.725 | 11.658 | 0.052 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 11.710 | 0.999 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| 2f5733cfb082861c00000000000000a4 | 9.212 | 9.098 | 0.096 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 9.194 | 0.998 | 0.018 | node-14/thread-2/replica.pull-at | none observed |
| 2f5733cfb082861c00000000000000c4 | 8.268 | 8.146 | 0.102 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 8.248 | 0.998 | 0.021 | node-14/thread-2/replica.pull-at | none observed |
| 2f5733cfb082861c0000000000000109 | 6.704 | 6.548 | 0.142 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 6.690 | 0.998 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| 2f5733cfb082861c00000000000000c7 | 6.454 | 6.310 | 0.120 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 6.430 | 0.996 | 0.023 | node-14/thread-2/replica.pull-at | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.706 | 1.009 | 0.000 | 1.816 | 3.673 | 0.005 | 0.000 | 0.770 | 1.140 | 3.924 | 0.188 | n/a | 1.322 | 13.636 | n/a | n/a | 0.050 | 4.447 | 0.180 | 0.050 |
| p99 | 24.706 | 1.009 | 0.000 | 1.816 | 3.673 | 0.005 | 0.000 | 0.770 | 1.140 | 3.924 | 0.188 | n/a | 1.322 | 13.636 | n/a | n/a | 0.050 | 4.447 | 0.180 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000c2 | 24.706 | 3.673 | 0.005 | 0.000 | 0.770 | 1.140 | 3.924 | 0.188 | n/a | 1.322 | 13.636 | n/a | n/a | 0.050 | 4.447 | 0.180 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 57.480 | 0.992 | 0.000 | 1.717 | 5.890 | 0.014 | 0.000 | 0.112 | 2.112 | 12.137 | 0.099 | n/a | 0.560 | 19.174 | n/a | n/a | 0.052 | 6.510 | 0.157 | 0.052 |
| p99 | 73.076 | 1.078 | 0.001 | 2.488 | 10.308 | 0.323 | 0.721 | 0.676 | 3.527 | 31.720 | 0.323 | n/a | 0.866 | 49.134 | n/a | n/a | 0.085 | 11.462 | 0.162 | 0.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000c9 | 73.076 | 10.308 | 0.323 | 0.721 | 0.110 | 2.112 | 31.720 | 0.130 | n/a | 0.866 | 26.732 | n/a | n/a | 0.052 | 11.462 | 0.157 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000ce | 69.455 | 5.890 | 0.014 | 0.000 | 0.606 | 1.070 | 12.137 | 0.088 | n/a | 0.432 | 49.134 | n/a | n/a | 0.085 | 6.510 | 0.094 | 0.085 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000d1 | 57.480 | 7.188 | 0.197 | 0.000 | 0.110 | 3.527 | 26.353 | 0.323 | n/a | 0.560 | 19.174 | n/a | n/a | 0.046 | 7.495 | 0.130 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000c6 | 27.985 | 3.847 | 0.005 | 0.000 | 0.676 | 1.250 | 3.402 | 0.099 | n/a | 0.474 | 18.177 | n/a | n/a | 0.055 | 4.528 | 0.162 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000cc | 24.110 | 3.661 | 0.011 | 0.000 | 0.112 | 2.488 | 2.021 | 0.054 | n/a | 0.586 | 15.126 | n/a | n/a | 0.052 | 3.784 | 0.157 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.985 | 1.042 | 0.000 | 1.910 | 3.847 | 0.011 | 0.000 | 0.606 | 1.250 | 3.402 | 0.088 | n/a | 0.474 | 18.177 | n/a | n/a | 0.055 | 4.528 | 0.157 | 0.055 |
| p99 | 69.455 | 1.078 | 0.001 | 2.488 | 5.890 | 0.014 | 0.000 | 0.676 | 2.488 | 12.137 | 0.099 | n/a | 0.586 | 49.134 | n/a | n/a | 0.085 | 6.510 | 0.162 | 0.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000ce | 69.455 | 5.890 | 0.014 | 0.000 | 0.606 | 1.070 | 12.137 | 0.088 | n/a | 0.432 | 49.134 | n/a | n/a | 0.085 | 6.510 | 0.094 | 0.085 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000c6 | 27.985 | 3.847 | 0.005 | 0.000 | 0.676 | 1.250 | 3.402 | 0.099 | n/a | 0.474 | 18.177 | n/a | n/a | 0.055 | 4.528 | 0.162 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000cc | 24.110 | 3.661 | 0.011 | 0.000 | 0.112 | 2.488 | 2.021 | 0.054 | n/a | 0.586 | 15.126 | n/a | n/a | 0.052 | 3.784 | 0.157 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 54.222 | 0.416 | 0.000 | 0.548 | 8.712 | 0.318 | 0.494 | 0.071 | 2.125 | 12.890 | 0.122 | n/a | 2.122 | 27.306 | n/a | n/a | 0.062 | 9.594 | 0.140 | 0.062 |
| p99 | 108.006 | 0.769 | 0.000 | 1.415 | 12.913 | 0.342 | 1.733 | 0.170 | 2.199 | 15.717 | 0.156 | n/a | 6.643 | 68.038 | n/a | n/a | 0.097 | 15.157 | 0.177 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000d3 | 108.006 | 12.913 | 0.342 | 1.733 | 0.170 | 2.199 | 15.717 | 0.156 | n/a | 6.643 | 68.038 | n/a | n/a | 0.097 | 15.157 | 0.140 | 0.097 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000d6 | 54.222 | 8.712 | 0.318 | 0.494 | 0.071 | 2.125 | 12.890 | 0.122 | n/a | 2.122 | 27.306 | n/a | n/a | 0.062 | 9.594 | 0.177 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.216 | 0.184 | 0.000 | 0.718 | 6.299 | 0.012 | 0.000 | 0.110 | 1.461 | 1.955 | 0.054 | n/a | 0.438 | 20.964 | n/a | n/a | 0.063 | 7.417 | 0.116 | 0.063 |
| p99 | 117.657 | 2.429 | 0.000 | 2.243 | 8.151 | 0.265 | 0.597 | 1.220 | 6.163 | 34.571 | 0.209 | n/a | 1.176 | 67.217 | n/a | n/a | 0.125 | 8.997 | 0.334 | 0.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000d8 | 117.657 | 8.151 | 0.180 | 0.597 | 0.069 | 6.163 | 34.571 | 0.209 | n/a | 0.438 | 67.217 | n/a | n/a | 0.063 | 8.997 | 0.076 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000de | 50.504 | 5.149 | 0.265 | 0.327 | 0.110 | 3.407 | 19.812 | 0.101 | n/a | 0.319 | 20.964 | n/a | n/a | 0.050 | 5.851 | 0.116 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000dc | 33.216 | 6.379 | 0.012 | 0.000 | 1.026 | 1.461 | 1.955 | 0.054 | n/a | 1.176 | 21.063 | n/a | n/a | 0.091 | 7.417 | 0.223 | 0.091 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000d9 | 22.531 | 6.299 | 0.012 | 0.000 | 1.220 | 1.160 | 1.479 | 0.044 | n/a | 0.778 | 11.414 | n/a | n/a | 0.125 | 7.531 | 0.334 | 0.125 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.216 | 1.614 | 0.000 | 2.243 | 6.379 | 0.012 | 0.000 | 1.026 | 1.461 | 1.955 | 0.054 | n/a | 1.176 | 21.063 | n/a | n/a | 0.091 | 7.417 | 0.223 | 0.091 |
| p99 | 33.216 | 1.614 | 0.000 | 2.243 | 6.379 | 0.012 | 0.000 | 1.026 | 1.461 | 1.955 | 0.054 | n/a | 1.176 | 21.063 | n/a | n/a | 0.091 | 7.417 | 0.223 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000dc | 33.216 | 6.379 | 0.012 | 0.000 | 1.026 | 1.461 | 1.955 | 0.054 | n/a | 1.176 | 21.063 | n/a | n/a | 0.091 | 7.417 | 0.223 | 0.091 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.636 | 0.350 | 0.000 | 0.636 | 5.217 | 0.252 | 0.000 | 0.070 | 1.932 | 11.980 | 0.150 | n/a | 1.454 | 9.636 | n/a | n/a | 0.080 | 5.537 | 0.247 | 0.080 |
| p99 | 44.704 | 0.695 | 0.000 | 0.654 | 7.833 | 0.253 | 0.347 | 0.257 | 2.880 | 12.283 | 0.345 | n/a | 1.574 | 24.328 | n/a | n/a | 0.095 | 8.096 | 0.273 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000e1 | 44.704 | 5.217 | 0.252 | 0.000 | 0.068 | 1.932 | 12.283 | 0.096 | n/a | 0.448 | 24.328 | n/a | n/a | 0.080 | 5.537 | 0.124 | 0.080 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000df | 29.636 | 7.833 | 0.005 | 0.000 | 0.257 | 2.880 | 11.980 | 0.150 | n/a | 1.574 | 4.861 | n/a | n/a | 0.095 | 8.096 | 0.273 | 0.095 | node-14/thread-0/driver.execute | none observed |
| 2f5733cfb082861c00000000000000e3 | 21.195 | 4.562 | 0.253 | 0.347 | 0.070 | 1.574 | 2.901 | 0.345 | n/a | 1.454 | 9.636 | n/a | n/a | 0.052 | 5.232 | 0.247 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.636 | 0.350 | 0.000 | 0.290 | 7.833 | 0.005 | 0.000 | 0.257 | 2.880 | 11.980 | 0.150 | n/a | 1.574 | 4.861 | n/a | n/a | 0.095 | 8.096 | 0.273 | 0.095 |
| p99 | 29.636 | 0.350 | 0.000 | 0.290 | 7.833 | 0.005 | 0.000 | 0.257 | 2.880 | 11.980 | 0.150 | n/a | 1.574 | 4.861 | n/a | n/a | 0.095 | 8.096 | 0.273 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000df | 29.636 | 7.833 | 0.005 | 0.000 | 0.257 | 2.880 | 11.980 | 0.150 | n/a | 1.574 | 4.861 | n/a | n/a | 0.095 | 8.096 | 0.273 | 0.095 | node-14/thread-0/driver.execute | none observed |

## P4 / p4h1 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.726 | 0.143 | 0.000 | 0.368 | 4.339 | 0.269 | 0.000 | 0.068 | 1.905 | 2.856 | 0.072 | n/a | 0.310 | 19.307 | n/a | n/a | 0.057 | 4.741 | 0.062 | 0.057 |
| p99 | 75.926 | 0.353 | 0.000 | 0.436 | 6.417 | 0.296 | 0.000 | 0.132 | 2.343 | 15.985 | 0.129 | n/a | 0.356 | 52.725 | n/a | n/a | 0.084 | 6.781 | 0.214 | 0.084 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000ea | 75.926 | 4.339 | 0.269 | 0.000 | 0.132 | 1.905 | 15.985 | 0.129 | n/a | 0.356 | 52.725 | n/a | n/a | 0.084 | 4.741 | 0.062 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000ec | 31.726 | 6.417 | 0.296 | 0.000 | 0.068 | 2.343 | 2.856 | 0.072 | n/a | 0.310 | 19.307 | n/a | n/a | 0.057 | 6.781 | 0.214 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.307 | 0.652 | 0.000 | 2.110 | 3.891 | 0.243 | 0.000 | 0.783 | 0.763 | 1.580 | 0.049 | n/a | 2.140 | 18.603 | n/a | n/a | 0.050 | 5.775 | 0.236 | 0.050 |
| p99 | 75.268 | 0.980 | 0.000 | 2.150 | 4.986 | 47.207 | 0.000 | 1.205 | 2.307 | 2.687 | 0.228 | n/a | 4.110 | 18.788 | n/a | n/a | 0.064 | 52.069 | 0.692 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000f2 | 75.268 | 3.657 | 47.207 | 0.000 | 1.205 | 0.763 | 1.426 | 0.049 | n/a | 2.140 | 18.788 | n/a | n/a | 0.032 | 52.069 | 0.692 | 0.032 | node-14/thread-0/client.commit-send-queue | client.encode 3.150ms |
| 2f5733cfb082861c00000000000000f1 | 32.307 | 3.891 | 0.243 | 0.000 | 0.175 | 2.307 | 2.687 | 0.228 | n/a | 4.110 | 18.603 | n/a | n/a | 0.064 | 4.308 | 0.133 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c00000000000000ef | 24.453 | 4.986 | 0.005 | 0.000 | 0.783 | 0.694 | 1.580 | 0.036 | n/a | 0.242 | 16.076 | n/a | n/a | 0.050 | 5.775 | 0.236 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 75.268 | 0.980 | 0.000 | 2.150 | 3.657 | 47.207 | 0.000 | 1.205 | 0.763 | 1.426 | 0.049 | n/a | 2.140 | 18.788 | n/a | n/a | 0.032 | 52.069 | 0.692 | 0.032 |
| p99 | 75.268 | 0.980 | 0.000 | 2.150 | 3.657 | 47.207 | 0.000 | 1.205 | 0.763 | 1.426 | 0.049 | n/a | 2.140 | 18.788 | n/a | n/a | 0.032 | 52.069 | 0.692 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c00000000000000f2 | 75.268 | 3.657 | 47.207 | 0.000 | 1.205 | 0.763 | 1.426 | 0.049 | n/a | 2.140 | 18.788 | n/a | n/a | 0.032 | 52.069 | 0.692 | 0.032 | node-14/thread-0/client.commit-send-queue | client.encode 3.150ms |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.639 | 0.892 | 0.000 | 1.592 | 4.411 | 0.012 | 0.000 | 0.810 | 0.946 | 1.675 | 0.041 | n/a | 0.282 | 9.227 | n/a | n/a | 0.056 | 5.233 | 0.242 | 0.056 |
| p99 | 22.107 | 1.317 | 0.000 | 1.731 | 4.556 | 0.012 | 0.000 | 1.023 | 5.201 | 2.767 | 0.071 | n/a | 0.686 | 11.912 | n/a | n/a | 0.061 | 5.591 | 0.253 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c0000000000000103 | 22.107 | 4.556 | 0.012 | 0.000 | 1.023 | 5.201 | 1.675 | 0.071 | n/a | 0.282 | 9.227 | n/a | n/a | 0.061 | 5.591 | 0.253 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c0000000000000129 | 21.639 | 4.411 | 0.012 | 0.000 | 0.810 | 0.946 | 2.767 | 0.041 | n/a | 0.686 | 11.912 | n/a | n/a | 0.056 | 5.233 | 0.242 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 61.104 | 0.689 | 0.000 | 1.944 | 4.663 | 0.006 | 0.000 | 0.452 | 1.646 | 2.665 | 0.067 | n/a | 0.434 | 32.789 | n/a | n/a | 0.056 | 5.415 | 0.092 | 0.056 |
| p99 | 278.562 | 1.844 | 0.060 | 3.147 | 9.938 | 0.242 | 0.359 | 204.598 | 2.952 | 26.347 | 0.271 | n/a | 2.559 | 269.421 | n/a | n/a | 0.091 | 209.130 | 0.885 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c000000000000010e | 278.562 | 4.856 | 0.005 | 0.000 | 0.493 | 0.857 | 2.316 | 0.132 | n/a | 0.434 | 269.421 | n/a | n/a | 0.048 | 5.354 | 0.019 | 0.048 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c000000000000010f | 266.931 | 4.663 | 0.006 | 0.000 | 0.452 | 2.341 | 2.239 | 0.064 | n/a | 0.227 | 256.870 | n/a | n/a | 0.069 | 5.120 | 0.019 | 0.069 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.609ms |
| 2f5733cfb082861c0000000000000110 | 236.262 | 4.523 | 0.009 | 0.000 | 204.598 | 1.896 | 3.746 | 0.067 | n/a | 0.284 | 21.048 | n/a | n/a | 0.091 | 209.130 | 0.885 | 0.091 | node-14/thread-0/driver.queue.subject | driver.publication 2.609ms; driver.publication 1.748ms |
| 2f5733cfb082861c0000000000000111 | 70.773 | 4.739 | 0.242 | 0.359 | 0.075 | 1.737 | 26.347 | 0.243 | n/a | 0.320 | 36.663 | n/a | n/a | 0.048 | 5.415 | 0.077 | 0.048 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 2.609ms; driver.publication 1.748ms; driver.publication 1.489ms |
| 2f5733cfb082861c0000000000000107 | 66.473 | 9.938 | 0.225 | 0.000 | 0.083 | 2.952 | 18.182 | 0.200 | n/a | 2.559 | 32.292 | n/a | n/a | 0.041 | 10.247 | 0.154 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c0000000000000118 | 61.104 | 5.006 | 0.233 | 0.266 | 0.120 | 2.353 | 18.629 | 0.271 | n/a | 1.369 | 32.789 | n/a | n/a | 0.067 | 5.625 | 0.092 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c0000000000000116 | 54.491 | 4.535 | 0.006 | 0.000 | 0.150 | 1.230 | 2.221 | 0.069 | n/a | 0.312 | 45.926 | n/a | n/a | 0.040 | 4.692 | 0.086 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c0000000000000105 | 52.639 | 4.489 | 0.006 | 0.000 | 1.050 | 1.329 | 5.158 | 0.044 | n/a | 0.935 | 39.556 | n/a | n/a | 0.072 | 5.544 | 0.105 | 0.072 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c0000000000000108 | 22.747 | 5.520 | 0.011 | 0.000 | 0.617 | 1.581 | 2.665 | 0.067 | n/a | 1.153 | 11.072 | n/a | n/a | 0.062 | 6.148 | 0.270 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c000000000000010b | 21.884 | 3.716 | 0.005 | 0.000 | 0.930 | 1.646 | 2.106 | 0.047 | n/a | 0.671 | 12.707 | n/a | n/a | 0.056 | 4.651 | 0.213 | 0.056 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 236.262 | 0.808 | 0.000 | 2.083 | 4.523 | 0.005 | 0.000 | 0.493 | 0.857 | 2.316 | 0.067 | n/a | 0.284 | 21.048 | n/a | n/a | 0.048 | 5.354 | 0.019 | 0.048 |
| p99 | 278.562 | 1.584 | 0.060 | 3.147 | 4.856 | 0.009 | 0.000 | 204.598 | 1.896 | 3.746 | 0.132 | n/a | 0.434 | 269.421 | n/a | n/a | 0.091 | 209.130 | 0.885 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c000000000000010e | 278.562 | 4.856 | 0.005 | 0.000 | 0.493 | 0.857 | 2.316 | 0.132 | n/a | 0.434 | 269.421 | n/a | n/a | 0.048 | 5.354 | 0.019 | 0.048 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c0000000000000110 | 236.262 | 4.523 | 0.009 | 0.000 | 204.598 | 1.896 | 3.746 | 0.067 | n/a | 0.284 | 21.048 | n/a | n/a | 0.091 | 209.130 | 0.885 | 0.091 | node-14/thread-0/driver.queue.subject | driver.publication 2.609ms; driver.publication 1.748ms |

## P2 / grow10 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 40.784 | 0.000 | 0.000 | 0.316 | 4.493 | 0.019 | 0.000 | 0.117 | 10.531 | 1.737 | 0.066 | n/a | 0.338 | 16.468 | n/a | n/a | 0.053 | 5.646 | 0.138 | 0.053 |
| p99 | 125.670 | 0.239 | 0.000 | 1.731 | 14.469 | 6.053 | 1.349 | 1.135 | 16.476 | 25.384 | 0.249 | n/a | 1.774 | 65.690 | n/a | n/a | 0.053 | 21.989 | 0.175 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c0000000000000121 | 125.670 | 14.469 | 6.053 | 1.349 | 0.117 | 10.531 | 25.384 | 0.249 | n/a | 1.774 | 65.690 | n/a | n/a | 0.053 | 21.989 | 0.175 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c000000000000011d | 40.784 | 4.493 | 0.019 | 0.000 | 1.135 | 16.476 | 1.737 | 0.066 | n/a | 0.338 | 16.468 | n/a | n/a | 0.053 | 5.646 | 0.138 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.352 | 0.558 | 0.000 | 1.514 | 5.012 | 0.012 | 0.000 | 0.571 | 0.854 | 2.314 | 0.049 | n/a | 0.407 | 15.175 | n/a | n/a | 0.056 | 5.680 | 0.178 | 0.056 |
| p99 | 54.868 | 1.652 | 0.060 | 2.717 | 6.091 | 0.407 | 0.291 | 6.469 | 2.217 | 7.361 | 0.147 | n/a | 1.197 | 43.122 | n/a | n/a | 0.066 | 9.433 | 0.358 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c000000000000012e | 54.868 | 5.118 | 0.013 | 0.000 | 0.571 | 0.961 | 4.750 | 0.049 | n/a | 0.221 | 43.122 | n/a | n/a | 0.062 | 5.702 | 0.104 | 0.062 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c0000000000000136 | 32.731 | 5.012 | 0.267 | 0.291 | 0.110 | 2.217 | 6.215 | 0.054 | n/a | 0.682 | 17.824 | n/a | n/a | 0.058 | 5.680 | 0.174 | 0.058 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c0000000000000138 | 31.538 | 5.085 | 0.407 | 0.000 | 0.112 | 1.988 | 7.361 | 0.147 | n/a | 1.197 | 15.175 | n/a | n/a | 0.066 | 5.604 | 0.178 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c0000000000000133 | 26.352 | 2.959 | 0.005 | 0.000 | 6.469 | 0.661 | 1.190 | 0.040 | n/a | 0.189 | 14.800 | n/a | n/a | 0.040 | 9.433 | 0.358 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.222ms; driver.expected-state.bind-receipt 1.100ms |
| 2f5733cfb082861c0000000000000132 | 25.547 | 6.091 | 0.012 | 0.000 | 0.687 | 0.854 | 1.662 | 0.045 | n/a | 0.407 | 15.733 | n/a | n/a | 0.056 | 6.790 | 0.266 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c000000000000013a | 17.084 | 3.252 | 0.005 | 0.000 | 0.644 | 0.744 | 2.314 | 0.104 | n/a | 0.776 | 9.203 | n/a | n/a | 0.042 | 3.901 | 0.228 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.084 | 0.968 | 0.000 | 1.514 | 2.959 | 0.005 | 0.000 | 0.644 | 0.661 | 1.190 | 0.040 | n/a | 0.189 | 9.203 | n/a | n/a | 0.040 | 3.901 | 0.228 | 0.040 |
| p99 | 26.352 | 1.147 | 0.060 | 1.709 | 3.252 | 0.005 | 0.000 | 6.469 | 0.744 | 2.314 | 0.104 | n/a | 0.776 | 14.800 | n/a | n/a | 0.042 | 9.433 | 0.358 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c0000000000000133 | 26.352 | 2.959 | 0.005 | 0.000 | 6.469 | 0.661 | 1.190 | 0.040 | n/a | 0.189 | 14.800 | n/a | n/a | 0.040 | 9.433 | 0.358 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.222ms; driver.expected-state.bind-receipt 1.100ms |
| 2f5733cfb082861c000000000000013a | 17.084 | 3.252 | 0.005 | 0.000 | 0.644 | 0.744 | 2.314 | 0.104 | n/a | 0.776 | 9.203 | n/a | n/a | 0.042 | 3.901 | 0.228 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.157 | 0.228 | 0.000 | 0.309 | 3.926 | 0.194 | 0.000 | 0.072 | 0.912 | 4.501 | 0.063 | n/a | 0.270 | 14.825 | n/a | n/a | 0.043 | 4.191 | 0.275 | 0.043 |
| p99 | 37.017 | 0.644 | 0.000 | 1.707 | 11.429 | 0.217 | 0.575 | 0.308 | 4.760 | 5.161 | 0.064 | n/a | 0.539 | 16.517 | n/a | n/a | 0.048 | 12.292 | 0.332 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c000000000000013c | 37.017 | 11.429 | 0.217 | 0.575 | 0.070 | 4.760 | 4.501 | 0.064 | n/a | 0.539 | 14.825 | n/a | n/a | 0.036 | 12.292 | 0.332 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c0000000000000140 | 27.157 | 3.926 | 0.194 | 0.000 | 0.072 | 0.912 | 5.161 | 0.063 | n/a | 0.270 | 16.517 | n/a | n/a | 0.043 | 4.191 | 0.154 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 2f5733cfb082861c000000000000013e | 13.158 | 3.308 | 0.005 | 0.000 | 0.308 | 0.822 | 1.067 | 0.039 | n/a | 0.263 | 7.298 | n/a | n/a | 0.048 | 3.621 | 0.275 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.158 | 0.644 | 0.000 | 1.707 | 3.308 | 0.005 | 0.000 | 0.308 | 0.822 | 1.067 | 0.039 | n/a | 0.263 | 7.298 | n/a | n/a | 0.048 | 3.621 | 0.275 | 0.048 |
| p99 | 13.158 | 0.644 | 0.000 | 1.707 | 3.308 | 0.005 | 0.000 | 0.308 | 0.822 | 1.067 | 0.039 | n/a | 0.263 | 7.298 | n/a | n/a | 0.048 | 3.621 | 0.275 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c000000000000013e | 13.158 | 3.308 | 0.005 | 0.000 | 0.308 | 0.822 | 1.067 | 0.039 | n/a | 0.263 | 7.298 | n/a | n/a | 0.048 | 3.621 | 0.275 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 103.437 | 0.763 | 0.018 | 4.203 | 15.407 | 13.593 | 0.000 | 0.012 | 7.472 | 1.270 | 7.616 | n/a | 0.249 | 56.985 | n/a | n/a | 0.031 | 26.584 | 0.238 | 0.031 |
| p99 | 181.623 | 2.563 | 4.510 | 8.308 | 22.071 | 14.706 | 0.000 | 0.084 | 10.101 | 5.676 | 12.310 | n/a | 4.034 | 128.331 | n/a | n/a | 0.099 | 36.425 | 0.283 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f5733cfb082861c000000000000014b | 181.623 | 20.709 | 14.706 | 0.000 | 0.084 | 7.761 | 1.043 | 8.767 | n/a | 0.123 | 128.331 | n/a | n/a | 0.099 | 35.499 | 0.195 | 0.099 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 7.845ms; driver.publication 5.916ms; driver.publication 4.575ms; driver.publication 4.488ms; driver.publication 3.818ms |
| 2f5733cfb082861c000000000000014a | 174.321 | 22.071 | 14.341 | 0.000 | 0.012 | 9.323 | 0.866 | 7.616 | n/a | 0.057 | 120.006 | n/a | n/a | 0.027 | 36.425 | 0.209 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 5.916ms; driver.publication 4.575ms; driver.publication 4.488ms; driver.publication 3.818ms; driver.publication 2.223ms |
| 2f5733cfb082861c0000000000000149 | 155.469 | 16.611 | 13.593 | 0.000 | 0.010 | 7.876 | 0.974 | 7.997 | n/a | 0.054 | 108.323 | n/a | n/a | 0.031 | 30.214 | 0.194 | 0.031 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 5.916ms; driver.publication 4.575ms; driver.publication 4.488ms; driver.publication 3.818ms; driver.publication 2.158ms |
| 2f5733cfb082861c0000000000000148 | 142.411 | 15.585 | 13.975 | 0.000 | 0.010 | 7.760 | 1.270 | 9.207 | n/a | 0.069 | 94.512 | n/a | n/a | 0.024 | 29.569 | 0.208 | 0.024 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication 5.916ms; driver.publication 4.575ms; driver.publication 4.488ms; driver.publication 2.158ms; driver.publication 1.812ms |
| 2f5733cfb082861c0000000000000147 | 129.896 | 16.880 | 14.085 | 0.000 | 0.013 | 7.472 | 4.956 | 6.349 | n/a | 0.249 | 79.852 | n/a | n/a | 0.040 | 30.979 | 0.238 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 5.916ms; driver.publication 4.488ms; driver.publication 2.158ms; driver.publication 1.812ms; driver.publication 1.699ms |
| 2f5733cfb082861c0000000000000146 | 103.437 | 12.877 | 13.695 | 0.000 | 0.011 | 1.484 | 1.965 | 12.310 | n/a | 4.034 | 56.985 | n/a | n/a | 0.076 | 26.584 | 0.257 | 0.076 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 5.916ms; driver.publication 4.488ms; driver.publication 2.158ms; driver.publication 1.699ms |
| 2f5733cfb082861c0000000000000145 | 92.994 | 15.407 | 10.396 | 0.000 | 0.012 | 3.458 | 5.676 | 8.795 | n/a | 1.066 | 48.158 | n/a | n/a | 0.025 | 25.815 | 0.278 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 5.916ms; driver.publication 2.158ms; driver.publication 1.699ms |
| 2f5733cfb082861c0000000000000144 | 74.231 | 11.644 | 7.756 | 0.000 | 0.012 | 3.301 | 4.341 | 0.690 | n/a | 0.654 | 45.795 | n/a | n/a | 0.038 | 19.411 | 0.261 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 5.916ms; driver.publication 2.158ms |
| 2f5733cfb082861c0000000000000143 | 64.466 | 10.533 | 7.681 | 0.000 | 0.015 | 1.435 | 1.168 | 1.518 | n/a | 2.115 | 39.977 | n/a | n/a | 0.023 | 18.229 | 0.283 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 5.916ms |
| 2f5733cfb082861c0000000000000142 | 57.798 | 14.307 | 0.022 | 0.000 | 0.070 | 10.101 | 1.856 | 0.109 | n/a | 2.209 | 29.072 | n/a | n/a | 0.051 | 14.399 | 0.249 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (202 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.027 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 292.078 | n/a | n/a | n/a | 77.138 | n/a | 15.924 | 292.026 | 5.166 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.001 | 292.059 | 1.000 | 38.001 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbf7b6ba20dfbfd20000000000000279 | 293.194 | 0.482 | n/a | 0.000 | 292.707 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 293.189 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000000067e | 292.223 | 0.409 | n/a | 0.000 | 291.799 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 292.208 | 1.000 | 0.015 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000000067f | 292.078 | 0.052 | n/a | 0.000 | 292.008 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 292.059 | 1.000 | 0.019 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e30000000000000680 | 292.053 | 0.024 | n/a | 0.000 | 292.026 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.051 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e30000000000000681 | 292.053 | 0.020 | n/a | 0.000 | 292.030 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.051 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000000027f | 291.299 | 0.081 | n/a | 0.000 | 291.206 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 291.287 | 1.000 | 0.012 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd20000000000000280 | 291.256 | 0.028 | n/a | 0.000 | 291.225 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 291.252 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd20000000000000286 | 290.980 | 0.050 | n/a | 0.000 | 290.926 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 290.976 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000000423 | 289.788 | 0.507 | n/a | 0.000 | 289.277 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 289.784 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f000000000000044d | 288.395 | 0.050 | n/a | 0.000 | 288.342 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 288.392 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000000450 | 288.393 | 0.018 | n/a | 0.000 | 288.373 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 288.391 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f000000000000044f | 288.390 | 0.019 | n/a | 0.000 | 288.368 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 288.387 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f000000000000044e | 288.386 | 0.024 | n/a | 0.000 | 288.359 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 288.383 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000000469 | 286.584 | 0.054 | n/a | 0.000 | 286.523 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 286.578 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000000028f | 279.432 | 0.069 | n/a | 0.000 | 279.346 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 279.415 | 1.000 | 0.017 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e30000000000000692 | 275.504 | 0.111 | n/a | 0.000 | 275.375 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 275.486 | 1.000 | 0.019 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000009691 | 275.432 | 0.028 | n/a | 0.000 | 275.402 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.430 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000009690 | 275.420 | 0.028 | n/a | 0.000 | 275.390 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.418 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f000000000000968f | 275.403 | 0.034 | n/a | 0.000 | 275.367 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.401 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f000000000000968e | 275.372 | 0.186 | n/a | 0.000 | 275.184 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.370 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P1 / L1 / read (110 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 231.212 | n/a | n/a | n/a | 4.178 | n/a | 0.000 | 231.060 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.468 | 231.208 | 1.000 | 0.468 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c2c00f647818400f000000000001eeda | 281.752 | 0.173 | n/a | 0.000 | 281.576 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 281.749 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| c2c00f647818400f000000000000c13e | 231.212 | 0.148 | n/a | 0.000 | 231.060 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 231.208 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.072ms |
| c2c00f647818400f000000000000c16c | 8.533 | 4.178 | n/a | 0.000 | 0.000 | 0.785 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.571 | 4.178 | 0.490 | 3.571 | node-14/thread-3/socket.wait-first-byte | none observed |
| c2c00f647818400f000000000000c13f | 8.169 | 8.165 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 8.165 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.114ms |
| c2c00f647818400f0000000000015ffc | 0.674 | 0.672 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.672 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000001339e | 0.563 | 0.562 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.562 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f0000000000017990 | 0.468 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.468 | 0.000 | 0.000 | 0.468 | uncovered | none observed |
| c2c00f647818400f000000000000f704 | 0.467 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.467 | 0.000 | 0.000 | 0.467 | uncovered | none observed |
| c2c00f647818400f000000000001a3fd | 0.427 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.427 | 0.000 | 0.000 | 0.427 | uncovered | none observed |
| c2c00f647818400f0000000000011e6d | 0.369 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.369 | 0.000 | 0.000 | 0.369 | uncovered | none observed |
| c2c00f647818400f000000000000d776 | 0.367 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.367 | 0.000 | 0.000 | 0.367 | uncovered | none observed |
| c2c00f647818400f0000000000014cfd | 0.366 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.366 | 0.000 | 0.000 | 0.366 | uncovered | none observed |
| c2c00f647818400f0000000000012579 | 0.362 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.362 | 0.000 | 0.000 | 0.362 | uncovered | none observed |
| c2c00f647818400f0000000000011cd0 | 0.359 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.359 | 0.000 | 0.000 | 0.359 | uncovered | none observed |
| c2c00f647818400f00000000000149fb | 0.331 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.331 | 0.000 | 0.000 | 0.331 | uncovered | none observed |
| c2c00f647818400f0000000000014da6 | 0.331 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.331 | 0.000 | 0.000 | 0.331 | uncovered | none observed |
| c2c00f647818400f0000000000014d62 | 0.329 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.329 | 0.000 | 0.000 | 0.329 | uncovered | none observed |
| c2c00f647818400f0000000000017be0 | 0.323 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.323 | 0.000 | 0.000 | 0.323 | uncovered | none observed |
| c2c00f647818400f000000000000edb6 | 0.319 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.319 | 0.000 | 0.000 | 0.319 | uncovered | none observed |
| c2c00f647818400f000000000000fb21 | 0.317 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.317 | 0.000 | 0.000 | 0.317 | uncovered | none observed |

## P1 / L4 / read (224 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.016 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 279.965 | n/a | n/a | n/a | 4.165 | n/a | 0.000 | 279.829 | 0.615 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.910 | 279.962 | 1.000 | 1.910 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c2c00f647818400f000000000001fac8 | 281.204 | 0.079 | n/a | 0.000 | 281.122 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 281.200 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f000000000001fac7 | 280.571 | 0.178 | n/a | 0.000 | 280.390 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 280.568 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000000e441 | 279.965 | 0.133 | n/a | 0.000 | 279.829 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 279.962 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000000da67 | 279.192 | 0.190 | n/a | 0.000 | 278.998 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 279.188 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000000d61b | 124.866 | 0.425 | n/a | 0.000 | 124.431 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 124.856 | 1.000 | 0.010 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| c2c00f647818400f000000000001eedd | 124.103 | 0.141 | n/a | 0.000 | 123.955 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 124.096 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| fbf7b6ba20dfbfd2000000000000ccf8 | 123.667 | 0.229 | n/a | 0.000 | 123.434 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 123.663 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.039ms |
| c2c00f647818400f000000000001ef59 | 73.803 | 60.278 | n/a | 5.898 | 0.000 | 0.791 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.836 | 66.176 | 0.897 | 6.836 | node-14/thread-3/reader.execute | none observed |
| 4b0a77412ffa78e3000000000000d624 | 24.678 | 19.333 | n/a | 2.063 | 0.000 | 1.290 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.992 | 21.396 | 0.867 | 1.992 | node-14/thread-5/reader.execute | none observed |
| fbf7b6ba20dfbfd2000000000000cd32 | 6.108 | 3.836 | n/a | 0.000 | 0.000 | 0.615 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.657 | 3.836 | 0.628 | 1.657 | node-14/thread-4/reader.execute | none observed |
| 4b0a77412ffa78e3000000000001093f | 4.166 | 4.165 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 4.165 | 1.000 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| c2c00f647818400f000000000002d943 | 4.121 | 4.120 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 4.120 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| fbf7b6ba20dfbfd20000000000018c77 | 3.722 | 3.721 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.721 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| c2c00f647818400f000000000002d87c | 3.320 | 3.316 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.316 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000002d87d | 3.246 | 3.226 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.226 | 0.994 | 0.019 | node-14/thread-3/replica.pull-at | none observed |
| fbf7b6ba20dfbfd200000000000150b1 | 3.155 | 3.154 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.154 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 4b0a77412ffa78e30000000000017ce0 | 3.149 | 3.146 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.146 | 0.999 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| 4b0a77412ffa78e30000000000015572 | 1.910 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.910 | 0.000 | 0.000 | 1.910 | uncovered | none observed |
| 4b0a77412ffa78e30000000000015ef8 | 1.877 | 1.875 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.875 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| c2c00f647818400f0000000000028fb1 | 1.756 | 1.754 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.754 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P1 / L16 / read (228 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.034 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 |
| p99 | 310.574 | n/a | n/a | n/a | 6.365 | n/a | 2.304 | 310.397 | 0.692 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.722 | 310.572 | 1.000 | 12.722 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4b0a77412ffa78e30000000000021f0a | 310.923 | 0.523 | n/a | 0.000 | 310.397 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 310.919 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.053ms; replica.apply-delta 0.032ms |
| 4b0a77412ffa78e30000000000021f0b | 310.601 | 0.280 | n/a | 0.000 | 310.313 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 310.593 | 1.000 | 0.008 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.053ms; replica.apply-delta 0.032ms |
| fbf7b6ba20dfbfd2000000000002093b | 310.574 | 0.187 | n/a | 0.000 | 310.384 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 310.572 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.125ms; replica.apply-delta 0.074ms |
| c2c00f647818400f0000000000036403 | 310.506 | 0.023 | n/a | 0.000 | 310.482 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 310.505 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.144ms; replica.apply-delta 0.038ms |
| c2c00f647818400f0000000000036402 | 310.482 | 0.037 | n/a | 0.000 | 310.443 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 310.480 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.144ms; replica.apply-delta 0.038ms |
| c2c00f647818400f0000000000036401 | 310.459 | 0.196 | n/a | 0.000 | 310.259 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 310.455 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.144ms; replica.apply-delta 0.038ms |
| fbf7b6ba20dfbfd2000000000002093a | 310.416 | 0.436 | n/a | 0.000 | 309.975 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 310.410 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.125ms; replica.apply-delta 0.074ms |
| 4b0a77412ffa78e30000000000021f0c | 310.347 | 0.071 | n/a | 0.000 | 310.270 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 310.340 | 1.000 | 0.007 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.053ms; replica.apply-delta 0.032ms |
| c2c00f647818400f0000000000036419 | 310.048 | 0.044 | n/a | 0.000 | 310.002 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 310.046 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.144ms; replica.apply-delta 0.038ms |
| c2c00f647818400f000000000003641a | 310.030 | 0.024 | n/a | 0.000 | 310.005 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 310.029 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.144ms; replica.apply-delta 0.038ms |
| c2c00f647818400f000000000003641b | 310.025 | 0.017 | n/a | 0.000 | 310.007 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 310.023 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.144ms; replica.apply-delta 0.038ms |
| fbf7b6ba20dfbfd20000000000020950 | 309.339 | 0.206 | n/a | 0.000 | 309.125 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 309.331 | 1.000 | 0.008 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.125ms; replica.apply-delta 0.074ms |
| 4b0a77412ffa78e30000000000021f15 | 309.237 | 0.085 | n/a | 0.000 | 309.148 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 309.233 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.053ms; replica.apply-delta 0.032ms |
| fbf7b6ba20dfbfd20000000000020951 | 309.231 | 0.063 | n/a | 0.000 | 309.163 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 309.226 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.125ms; replica.apply-delta 0.074ms |
| 4b0a77412ffa78e30000000000021f21 | 308.465 | 0.170 | n/a | 0.000 | 308.289 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 308.460 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.053ms; replica.apply-delta 0.032ms |
| fbf7b6ba20dfbfd2000000000002095f | 308.234 | 0.082 | n/a | 0.000 | 308.147 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 308.230 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.125ms; replica.apply-delta 0.074ms |
| fbf7b6ba20dfbfd20000000000020974 | 218.521 | 0.192 | n/a | 0.000 | 218.324 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 218.516 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd20000000000020975 | 218.458 | 0.048 | n/a | 0.000 | 218.408 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 218.455 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000002098f | 217.737 | 0.014 | n/a | 0.000 | 217.722 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 217.736 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000002098e | 217.731 | 0.026 | n/a | 0.000 | 217.704 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 217.730 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L64 / read (213 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.036 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 371.208 | n/a | n/a | n/a | 9.665 | n/a | 0.000 | 371.181 | 0.735 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.303 | 371.206 | 1.000 | 0.303 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4b0a77412ffa78e3000000000002bdbf | 371.237 | 0.041 | n/a | 0.000 | 371.181 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 371.222 | 1.000 | 0.015 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000002bdbe | 371.227 | 0.148 | n/a | 0.000 | 371.077 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 371.225 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000002bdc0 | 371.208 | 0.014 | n/a | 0.000 | 371.192 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 371.206 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000002bdc1 | 371.207 | 0.016 | n/a | 0.000 | 371.190 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 371.206 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c2c00f647818400f00000000000406be | 367.633 | 0.119 | n/a | 0.000 | 367.510 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 367.630 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f00000000000406bf | 367.608 | 0.040 | n/a | 0.000 | 367.567 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 367.606 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f00000000000406c0 | 367.600 | 0.019 | n/a | 0.000 | 367.581 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 367.599 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000002bdbd | 366.862 | 0.372 | n/a | 0.000 | 366.488 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 366.859 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c2c00f647818400f00000000000406bd | 366.706 | 0.258 | n/a | 0.000 | 366.445 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 366.703 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f00000000000406d5 | 365.593 | 0.095 | n/a | 0.000 | 365.488 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 365.583 | 1.000 | 0.010 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f00000000000406d6 | 365.509 | 0.265 | n/a | 0.000 | 365.242 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 365.507 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000002a570 | 365.358 | 0.154 | n/a | 0.000 | 365.204 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 365.358 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000002a573 | 365.323 | 0.020 | n/a | 0.000 | 365.302 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 365.322 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000002a572 | 365.303 | 0.021 | n/a | 0.000 | 365.280 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 365.302 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000002a56f | 365.293 | 0.155 | n/a | 0.000 | 365.135 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 365.291 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000002a571 | 365.276 | 0.023 | n/a | 0.000 | 365.252 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 365.275 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c2c00f647818400f00000000000495f7 | 275.476 | 0.190 | n/a | 0.000 | 275.276 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 275.466 | 1.000 | 0.010 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| c2c00f647818400f00000000000495fa | 275.471 | 0.071 | n/a | 0.000 | 275.397 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.468 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| c2c00f647818400f00000000000495f8 | 275.466 | 0.047 | n/a | 0.000 | 275.416 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.463 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| c2c00f647818400f00000000000495f9 | 275.459 | 0.027 | n/a | 0.000 | 275.430 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.457 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.057ms |

## P1 / L256 / read (185 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.027 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 318.099 | n/a | n/a | n/a | 6.075 | n/a | 0.000 | 318.067 | 0.599 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.975 | 318.097 | 1.000 | 11.975 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4b0a77412ffa78e3000000000003f458 | 318.106 | 0.029 | n/a | 0.000 | 318.074 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 318.103 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000003f457 | 318.099 | 0.034 | n/a | 0.000 | 318.063 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 318.097 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000003f459 | 318.098 | 0.028 | n/a | 0.000 | 318.067 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 318.095 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000003f45a | 318.076 | 0.030 | n/a | 0.000 | 318.042 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 318.073 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000003f456 | 318.042 | 0.163 | n/a | 0.000 | 317.873 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 318.037 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000053ee9 | 317.757 | 0.018 | n/a | 0.000 | 317.738 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.756 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000053ee8 | 317.741 | 0.020 | n/a | 0.000 | 317.720 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.740 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000053ee7 | 317.718 | 0.021 | n/a | 0.000 | 317.695 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.717 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000053ee6 | 317.716 | 0.043 | n/a | 0.000 | 317.671 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 317.714 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000053ee5 | 317.709 | 0.051 | n/a | 0.000 | 317.656 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 317.707 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000053ee4 | 317.703 | 0.205 | n/a | 0.000 | 317.495 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 317.700 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000003e342 | 317.219 | 0.037 | n/a | 0.000 | 317.180 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.218 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000003e341 | 317.157 | 0.058 | n/a | 0.000 | 317.096 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 317.155 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000003e340 | 317.063 | 0.037 | n/a | 0.000 | 317.025 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.062 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000003e33f | 317.005 | 0.136 | n/a | 0.000 | 316.863 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 317.000 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000003e328 | 316.885 | 0.190 | n/a | 0.000 | 316.692 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 316.881 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000003e300 | 275.334 | 0.021 | n/a | 0.000 | 275.313 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.333 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000003e2ff | 275.312 | 0.018 | n/a | 0.000 | 275.293 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.311 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000003e2fc | 275.310 | 0.286 | n/a | 0.000 | 275.021 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.307 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000003e2fe | 275.288 | 0.027 | n/a | 0.000 | 275.259 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.286 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (284 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.025 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.000 | 0.000 | 0.018 |
| p99 | 13.521 | n/a | n/a | n/a | 10.195 | n/a | 0.000 | 0.000 | 0.464 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.681 | 10.195 | 1.000 | 9.681 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbf7b6ba20dfbfd2000000000003eed5 | 22.395 | 5.545 | n/a | 1.610 | 0.000 | 0.794 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.446 | 7.155 | 0.319 | 14.446 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4b0a77412ffa78e30000000000040209 | 13.953 | 3.712 | n/a | 0.000 | 0.000 | 0.560 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.681 | 3.712 | 0.266 | 9.681 | node-14/thread-5/socket.wait-first-byte | none observed |
| c2c00f647818400f0000000000054bd4 | 13.521 | 2.592 | n/a | 0.000 | 0.000 | 0.464 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.465 | 2.592 | 0.192 | 10.465 | node-14/thread-3/socket.wait-first-byte | none observed |
| 4b0a77412ffa78e300000000000493fd | 12.278 | 12.276 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 12.276 | 1.000 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| c2c00f647818400f000000000005e14c | 10.330 | 10.308 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 10.308 | 0.998 | 0.022 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000005e14d | 10.224 | 10.195 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.028 | 10.195 | 0.997 | 0.028 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000005e14e | 10.203 | 10.174 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.029 | 10.174 | 0.997 | 0.029 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000005e1f6 | 8.723 | 8.707 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 8.707 | 0.998 | 0.015 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000005e1f5 | 8.718 | 8.714 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 8.714 | 1.000 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000005e1f7 | 8.692 | 8.673 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 8.673 | 0.998 | 0.019 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000005e1f8 | 8.681 | 8.661 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 8.661 | 0.998 | 0.021 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000005e1f9 | 8.676 | 8.654 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 8.654 | 0.998 | 0.021 | node-14/thread-3/replica.pull-at | none observed |
| 4b0a77412ffa78e3000000000004944c | 6.771 | 6.767 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 6.767 | 0.999 | 0.004 | node-14/thread-5/replica.pull-at | none observed |
| 4b0a77412ffa78e30000000000043ce5 | 6.583 | 6.577 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 6.577 | 0.999 | 0.006 | node-14/thread-5/replica.pull-at | none observed |
| c2c00f647818400f00000000000587fd | 6.158 | 6.085 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.073 | 6.085 | 0.988 | 0.073 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000587fe | 6.132 | 6.058 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.073 | 6.058 | 0.988 | 0.073 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000587fc | 6.120 | 6.109 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 6.109 | 0.998 | 0.011 | node-14/thread-3/replica.pull-at | none observed |
| 4b0a77412ffa78e30000000000051e82 | 6.108 | 6.082 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 6.082 | 0.996 | 0.026 | node-14/thread-5/replica.pull-at | none observed |
| 4b0a77412ffa78e30000000000051e81 | 6.099 | 6.096 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 6.096 | 0.999 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| 4b0a77412ffa78e30000000000051e83 | 6.067 | 6.038 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.029 | 6.038 | 0.995 | 0.029 | node-14/thread-5/replica.pull-at | none observed |

## P1 / recovery / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.033 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 |
| p99 | 283.113 | n/a | n/a | n/a | 6.385 | n/a | 0.000 | 283.099 | 0.817 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.719 | 283.112 | 1.000 | 4.719 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c2c00f647818400f0000000000073975 | 283.147 | 0.048 | n/a | 0.000 | 283.099 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 283.147 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000073974 | 283.126 | 0.022 | n/a | 0.000 | 283.104 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 283.126 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000073973 | 283.113 | 0.013 | n/a | 0.000 | 283.099 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 283.112 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000073972 | 283.102 | 0.015 | n/a | 0.000 | 283.086 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 283.101 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000073971 | 283.078 | 0.035 | n/a | 0.000 | 283.042 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 283.078 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000073970 | 282.208 | 0.141 | n/a | 0.000 | 282.065 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 282.206 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000005c825 | 281.455 | 0.014 | n/a | 0.000 | 281.440 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.454 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000005c824 | 281.437 | 0.020 | n/a | 0.000 | 281.416 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.436 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000005c823 | 281.416 | 0.015 | n/a | 0.000 | 281.399 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.415 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000005c822 | 281.404 | 0.021 | n/a | 0.000 | 281.382 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.402 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000005c821 | 281.332 | 0.100 | n/a | 0.000 | 281.230 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 281.330 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000005e882 | 281.162 | 0.035 | n/a | 0.000 | 281.126 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.162 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000005e881 | 281.142 | 0.025 | n/a | 0.000 | 281.116 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.141 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000005e880 | 281.139 | 0.108 | n/a | 0.000 | 281.031 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.138 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000005e886 | 281.044 | 0.020 | n/a | 0.000 | 281.023 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.043 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000005e87f | 281.018 | 0.094 | n/a | 0.000 | 280.923 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 281.016 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c2c00f647818400f0000000000071dc0 | 271.851 | 0.183 | n/a | 0.000 | 271.666 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.848 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| fbf7b6ba20dfbfd2000000000005af3d | 270.983 | 0.042 | n/a | 0.000 | 270.939 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.981 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.063ms |
| fbf7b6ba20dfbfd2000000000005af3c | 270.960 | 0.045 | n/a | 0.000 | 270.913 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.958 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.063ms |
| 4b0a77412ffa78e3000000000005cac7 | 270.955 | 0.142 | n/a | 0.000 | 270.811 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.953 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |

## P4 / p4mix / read (152 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 11.224 | n/a | n/a | n/a | 1.767 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.121 | 1.767 | 0.999 | 1.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c2c00f647818400f0000000000076679 | 13.282 | 1.767 | n/a | 0.000 | 0.000 | 0.535 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.979 | 1.767 | 0.133 | 10.979 | node-14/thread-3/socket.wait-first-byte | none observed |
| c2c00f647818400f00000000000770f9 | 11.224 | 11.221 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 11.221 | 1.000 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f0000000000076a11 | 1.581 | 1.580 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.580 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000770af | 1.367 | 1.364 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.364 | 0.998 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f0000000000080ea6 | 1.121 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.121 | 0.000 | 0.000 | 1.121 | uncovered | none observed |
| c2c00f647818400f0000000000096546 | 0.979 | 0.975 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.975 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000770fa | 0.878 | 0.836 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.042 | 0.836 | 0.952 | 0.042 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f0000000000078cc0 | 0.659 | 0.655 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.655 | 0.994 | 0.004 | node-14/thread-3/reader.execute | none observed |
| c2c00f647818400f0000000000096200 | 0.644 | 0.639 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.639 | 0.992 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000008c031 | 0.620 | 0.578 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.042 | 0.578 | 0.932 | 0.042 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000009652f | 0.619 | 0.612 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.612 | 0.989 | 0.007 | node-14/thread-3/reader.execute | none observed |
| c2c00f647818400f0000000000080118 | 0.618 | 0.616 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.616 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000007a50d | 0.611 | 0.609 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.609 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f0000000000086430 | 0.596 | 0.593 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.593 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000007710a | 0.593 | 0.589 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.589 | 0.993 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f0000000000079562 | 0.584 | 0.582 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.582 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000009621d | 0.529 | 0.525 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.525 | 0.993 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000009620d | 0.528 | 0.524 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.524 | 0.991 | 0.005 | node-14/thread-3/reader.execute | none observed |
| c2c00f647818400f000000000007cafa | 0.527 | 0.525 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.525 | 0.995 | 0.002 | node-14/thread-3/reader.execute | none observed |
| c2c00f647818400f0000000000094144 | 0.525 | 0.523 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.523 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h1 / read (139 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 |
| p99 | 3.742 | n/a | n/a | n/a | 3.740 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.014 | 3.740 | 0.998 | 1.014 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c2c00f647818400f0000000000096784 | 57.463 | 34.131 | n/a | 1.739 | 0.000 | 0.923 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.670 | 35.870 | 0.624 | 20.670 | node-14/thread-3/reader.execute | none observed |
| c2c00f647818400f000000000009a2b0 | 3.742 | 3.740 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.740 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000009a5a9 | 1.566 | 1.562 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.562 | 0.997 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000009b68a | 1.014 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.014 | 0.000 | 0.000 | 1.014 | uncovered | none observed |
| c2c00f647818400f000000000009b8bf | 0.933 | 0.927 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.927 | 0.993 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000009a3b5 | 0.881 | 0.875 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.875 | 0.993 | 0.006 | node-14/thread-3/reader.execute | none observed |
| c2c00f647818400f000000000009b709 | 0.857 | 0.853 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.853 | 0.995 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000b1df2 | 0.797 | 0.796 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.796 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000009ae2e | 0.771 | 0.766 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.766 | 0.993 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000a1d65 | 0.731 | 0.719 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.719 | 0.984 | 0.012 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000009c76a | 0.730 | 0.728 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.728 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f0000000000098619 | 0.638 | 0.636 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.636 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000968cb | 0.588 | 0.583 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.583 | 0.992 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000009b4c8 | 0.573 | 0.567 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.567 | 0.990 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000a50d7 | 0.550 | 0.549 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.549 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000009f6c2 | 0.550 | 0.547 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.547 | 0.995 | 0.003 | node-14/thread-3/reader.execute | none observed |
| c2c00f647818400f00000000000b1df0 | 0.538 | 0.536 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.536 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f000000000009a7da | 0.520 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.520 | 0.000 | 0.000 | 0.520 | uncovered | none observed |
| c2c00f647818400f00000000000b0e7e | 0.520 | 0.517 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.517 | 0.993 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000abf55 | 0.519 | 0.514 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.514 | 0.991 | 0.005 | node-14/thread-3/reader.execute | none observed |

## P4 / p4h3 / read (148 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 2.518 | n/a | n/a | n/a | 1.586 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.112 | 1.586 | 0.998 | 0.112 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c2c00f647818400f00000000000b8b3d | 15.593 | 1.586 | n/a | 0.000 | 0.000 | 0.490 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.518 | 1.586 | 0.102 | 13.518 | node-14/thread-3/socket.wait-first-byte | none observed |
| c2c00f647818400f00000000000c383b | 2.518 | 2.515 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.515 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000cc32a | 1.119 | 1.117 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.117 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000c1695 | 0.875 | 0.874 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.874 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000cc047 | 0.753 | 0.749 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.749 | 0.995 | 0.004 | node-14/thread-3/reader.execute | none observed |
| c2c00f647818400f00000000000cf0a3 | 0.749 | 0.748 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.748 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000c2608 | 0.740 | 0.733 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.733 | 0.991 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000d7db0 | 0.736 | 0.733 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.733 | 0.996 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000c2348 | 0.707 | 0.694 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.694 | 0.981 | 0.013 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000ca578 | 0.657 | 0.654 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.654 | 0.996 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000c25ff | 0.654 | 0.651 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.651 | 0.996 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000c22de | 0.650 | 0.647 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.647 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000c232e | 0.647 | 0.637 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.637 | 0.985 | 0.010 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000cafdf | 0.642 | 0.639 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.639 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000c548f | 0.610 | 0.606 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.606 | 0.993 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000c50b6 | 0.600 | 0.598 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.598 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000beeba | 0.599 | 0.581 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.581 | 0.970 | 0.018 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000cc4b5 | 0.594 | 0.591 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.591 | 0.995 | 0.003 | node-14/thread-3/reader.execute | none observed |
| c2c00f647818400f00000000000c270f | 0.583 | 0.580 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.580 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000c22d2 | 0.572 | 0.569 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.569 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h10 / read (152 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 0.894 | n/a | n/a | n/a | 0.891 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.460 | 0.891 | 0.997 | 0.460 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c2c00f647818400f00000000000d80aa | 25.887 | 2.741 | n/a | 0.000 | 0.000 | 0.774 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.371 | 2.741 | 0.106 | 22.371 | node-14/thread-3/socket.wait-first-byte | none observed |
| c2c00f647818400f00000000000d8965 | 0.894 | 0.891 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.891 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000e1cbf | 0.716 | 0.713 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.713 | 0.996 | 0.003 | node-14/thread-3/reader.execute | none observed |
| c2c00f647818400f00000000000ddb28 | 0.702 | 0.694 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.694 | 0.989 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000e7ffb | 0.586 | 0.584 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.584 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000eed1c | 0.558 | 0.555 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.555 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000f0855 | 0.548 | 0.546 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.546 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000dd7ff | 0.533 | 0.531 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.531 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000d944f | 0.533 | 0.531 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.531 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| c2c00f647818400f00000000000f0757 | 0.521 | 0.511 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.511 | 0.980 | 0.010 | node-14/thread-3/reader.execute | none observed |
| c2c00f647818400f00000000000d8883 | 0.513 | 0.508 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.508 | 0.990 | 0.005 | node-14/thread-3/reader.execute | none observed |
| c2c00f647818400f00000000000df82f | 0.505 | 0.500 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.500 | 0.991 | 0.005 | node-14/thread-3/reader.execute | none observed |
| c2c00f647818400f00000000000d8063 | 0.460 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.460 | 0.000 | 0.000 | 0.460 | uncovered | none observed |
| c2c00f647818400f00000000000daadd | 0.456 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.456 | 0.000 | 0.000 | 0.456 | uncovered | none observed |
| c2c00f647818400f00000000000f142a | 0.444 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.444 | 0.000 | 0.000 | 0.444 | uncovered | none observed |
| c2c00f647818400f00000000000e4919 | 0.401 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.401 | 0.000 | 0.000 | 0.401 | uncovered | none observed |
| c2c00f647818400f00000000000d8060 | 0.394 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.394 | 0.000 | 0.000 | 0.394 | uncovered | none observed |
| c2c00f647818400f00000000000e4486 | 0.390 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.390 | 0.000 | 0.000 | 0.390 | uncovered | none observed |
| c2c00f647818400f00000000000e041c | 0.387 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.387 | 0.000 | 0.000 | 0.387 | uncovered | none observed |
| c2c00f647818400f00000000000d8aa1 | 0.378 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.378 | 0.000 | 0.000 | 0.378 | uncovered | none observed |

## P5 / presweep / read (199 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.073 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 0.000 | 0.000 | 0.023 |
| p99 | 264.397 | n/a | n/a | n/a | 16.925 | n/a | 1.712 | 264.272 | 0.960 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.263 | 264.394 | 1.000 | 5.263 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c2c00f647818400f00000000000ff5a3 | 264.530 | 0.092 | n/a | 0.000 | 264.436 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.528 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f00000000000ff5a2 | 264.397 | 0.122 | n/a | 0.000 | 264.272 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.394 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd200000000000651a7 | 262.696 | 0.110 | n/a | 0.000 | 262.585 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.695 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd200000000000651a8 | 262.687 | 0.053 | n/a | 0.000 | 262.632 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 262.685 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd200000000000651a6 | 262.640 | 0.052 | n/a | 0.000 | 262.586 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 262.638 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd200000000000651a9 | 262.629 | 0.054 | n/a | 0.000 | 262.573 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 262.627 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd200000000000651a5 | 262.583 | 0.238 | n/a | 0.000 | 262.341 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 262.579 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c2c00f647818400f00000000000ff5c2 | 262.444 | 0.078 | n/a | 0.000 | 262.358 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 262.436 | 1.000 | 0.008 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f00000000000ff5c4 | 262.385 | 0.020 | n/a | 0.000 | 262.363 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 262.383 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f00000000000ff5c3 | 262.384 | 0.024 | n/a | 0.000 | 262.358 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 262.383 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c2c00f647818400f00000000000ff5c5 | 262.379 | 0.086 | n/a | 0.000 | 262.292 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 262.377 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e30000000000067588 | 261.369 | 0.104 | n/a | 0.000 | 261.264 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 261.367 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e30000000000067587 | 261.340 | 0.130 | n/a | 0.000 | 261.206 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 261.337 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e3000000000006758a | 261.331 | 0.050 | n/a | 0.000 | 261.279 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 261.328 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e30000000000067589 | 261.328 | 0.030 | n/a | 0.000 | 261.297 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 261.326 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4b0a77412ffa78e30000000000067591 | 259.292 | 0.053 | n/a | 0.000 | 259.233 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 259.286 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | none observed |
| fbf7b6ba20dfbfd2000000000005f0ed | 30.621 | 21.217 | n/a | 4.221 | 0.000 | 0.960 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.223 | 25.438 | 0.831 | 4.223 | node-14/thread-4/reader.execute | none observed |
| c2c00f647818400f00000000000f8985 | 26.893 | 16.925 | n/a | 1.712 | 0.000 | 0.916 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.340 | 18.637 | 0.693 | 7.340 | node-14/thread-3/reader.execute | none observed |
| 4b0a77412ffa78e30000000000061214 | 20.737 | 10.497 | n/a | 0.949 | 0.000 | 4.028 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.263 | 11.446 | 0.552 | 5.263 | node-14/thread-5/reader.execute | none observed |
| c2c00f647818400f0000000000104e86 | 9.444 | 9.382 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.062 | 9.382 | 0.993 | 0.062 | node-14/thread-3/replica.pull-at | none observed |

## P5 / sweep / read (84 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.234 | n/a | n/a | n/a | 5.670 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 12.868 | 0.994 | 0.014 |
| p99 | 320.596 | n/a | n/a | n/a | 50.679 | n/a | 15.230 | 13.577 | 78.449 | 111.710 | 212.000 | n/a | 0.069 | 0.000 | n/a | n/a | 17.134 | 60.369 | 1.000 | 17.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4b0a77412ffa78e3000000000006e318 | 320.596 | 50.679 | n/a | 7.964 | 0.000 | 18.969 | 35.307 | 207.658 | n/a | 0.014 | 0.000 | n/a | n/a | 0.005 | 58.643 | 0.183 | 0.005 | gw-r/thread-47/gateway.admission-wait | reader.observe 17.281ms; reader.observe 1.682ms; replica.apply-delta 0.124ms; replica.apply-delta 0.049ms; replica.apply-delta 0.045ms |
| c2c00f647818400f0000000000105dc9 | 297.533 | 14.241 | n/a | 0.000 | 0.000 | 72.119 | 0.715 | 210.400 | n/a | 0.011 | 0.000 | n/a | n/a | 0.047 | 14.241 | 0.048 | 0.047 | gw-r/thread-70/gateway.admission-wait | reader.observe 20.247ms; reader.observe 2.061ms; reader.observe 1.757ms; reader.observe 1.700ms; client.parse 1.320ms |
| c2c00f647818400f0000000000105dc7 | 296.334 | 49.598 | n/a | 10.771 | 0.000 | 20.183 | 3.786 | 211.966 | n/a | 0.025 | 0.000 | n/a | n/a | 0.005 | 60.369 | 0.204 | 0.005 | gw-r/thread-48/gateway.admission-wait | reader.observe 2.061ms; reader.observe 1.757ms; reader.observe 1.700ms; reader.observe 1.219ms; replica.apply-delta 0.152ms |
| fbf7b6ba20dfbfd2000000000006b241 | 290.741 | 25.142 | n/a | 0.000 | 0.000 | 78.449 | 2.721 | 184.400 | n/a | 0.023 | 0.000 | n/a | n/a | 0.005 | 25.142 | 0.086 | 0.005 | gw-r/thread-71/gateway.admission-wait | reader.observe 4.308ms; reader.observe 2.085ms; reader.observe 1.017ms; replica.apply-delta 0.150ms; replica.apply-delta 0.098ms |
| fbf7b6ba20dfbfd2000000000006b23d | 277.550 | 13.283 | n/a | 0.000 | 0.000 | 68.500 | 0.900 | 194.841 | n/a | 0.022 | 0.000 | n/a | n/a | 0.003 | 13.283 | 0.048 | 0.003 | gw-r/thread-44/gateway.admission-wait | reader.observe 4.308ms; reader.observe 2.085ms; replica.apply-delta 0.150ms; replica.apply-delta 0.098ms; replica.apply-delta 0.068ms |
| fbf7b6ba20dfbfd2000000000006b240 | 275.279 | 14.997 | n/a | 0.000 | 0.000 | 34.732 | 13.575 | 211.945 | n/a | 0.028 | 0.000 | n/a | n/a | 0.002 | 14.997 | 0.054 | 0.002 | gw-r/thread-67/gateway.admission-wait | reader.observe 4.308ms; reader.observe 2.085ms; replica.apply-delta 0.150ms; replica.apply-delta 0.098ms; replica.apply-delta 0.068ms |
| fbf7b6ba20dfbfd2000000000006b23e | 273.261 | 24.045 | n/a | 0.000 | 0.000 | 29.717 | 10.252 | 209.213 | n/a | 0.030 | 0.000 | n/a | n/a | 0.004 | 24.045 | 0.088 | 0.004 | gw-r/thread-42/gateway.admission-wait | reader.observe 4.308ms; replica.apply-delta 0.150ms; replica.apply-delta 0.098ms; replica.apply-delta 0.068ms; replica.apply-delta 0.059ms |
| 4b0a77412ffa78e3000000000006e31c | 271.698 | 14.348 | n/a | 0.000 | 0.000 | 45.463 | 1.229 | 210.629 | n/a | 0.027 | 0.000 | n/a | n/a | 0.003 | 14.348 | 0.053 | 0.003 | gw-r/thread-45/gateway.admission-wait | reader.observe 17.281ms; reader.observe 1.682ms; replica.apply-delta 0.124ms; replica.apply-delta 0.049ms; replica.apply-delta 0.045ms |
| 4b0a77412ffa78e3000000000006e31b | 267.895 | 39.829 | n/a | 1.900 | 0.000 | 14.841 | 21.379 | 189.933 | n/a | 0.007 | 0.000 | n/a | n/a | 0.005 | 41.729 | 0.156 | 0.005 | gw-r/thread-62/gateway.admission-wait | reader.observe 1.682ms; replica.apply-delta 0.124ms; replica.apply-delta 0.049ms; replica.apply-delta 0.045ms; replica.apply-delta 0.039ms |
| fbf7b6ba20dfbfd2000000000006b23f | 260.558 | 18.992 | n/a | 0.000 | 0.000 | 28.664 | 0.874 | 212.000 | n/a | 0.024 | 0.000 | n/a | n/a | 0.004 | 18.992 | 0.073 | 0.004 | gw-r/thread-68/gateway.admission-wait | replica.apply-delta 0.150ms; replica.apply-delta 0.098ms; replica.apply-delta 0.068ms; replica.apply-delta 0.059ms; replica.apply-delta 0.058ms |
| c2c00f647818400f0000000000105dc8 | 247.427 | 14.844 | n/a | 0.000 | 0.000 | 15.675 | 5.147 | 211.743 | n/a | 0.014 | 0.000 | n/a | n/a | 0.003 | 14.844 | 0.060 | 0.003 | gw-r/thread-60/gateway.admission-wait | reader.observe 2.061ms; reader.observe 1.757ms; reader.observe 1.700ms; replica.apply-delta 0.152ms; replica.apply-delta 0.073ms |
| 4b0a77412ffa78e3000000000006e3dc | 228.995 | 12.868 | n/a | 0.000 | 0.000 | 62.355 | 0.574 | 153.183 | n/a | 0.011 | 0.000 | n/a | n/a | 0.003 | 12.868 | 0.056 | 0.003 | gw-r/thread-59/gateway.admission-wait | reader.observe 17.281ms; reader.observe 11.676ms; replica.apply-delta 0.039ms; replica.apply-delta 0.023ms; replica.apply-delta 0.018ms |
| 4b0a77412ffa78e3000000000006e3db | 227.246 | 15.068 | n/a | 0.000 | 0.000 | 58.515 | 7.371 | 146.270 | n/a | 0.020 | 0.000 | n/a | n/a | 0.003 | 15.068 | 0.066 | 0.003 | gw-r/thread-61/gateway.admission-wait | reader.observe 17.281ms; reader.observe 11.676ms; replica.apply-delta 0.039ms; replica.apply-delta 0.023ms; replica.apply-delta 0.018ms |
| c2c00f647818400f0000000000105dc5 | 223.552 | 15.644 | n/a | 0.000 | 0.000 | 15.561 | 111.710 | 80.591 | n/a | 0.040 | 0.000 | n/a | n/a | 0.005 | 15.644 | 0.070 | 0.005 | gw-r/thread-66/gateway.admitted-work | reader.observe 2.061ms; reader.observe 1.700ms; replica.apply-delta 0.152ms; replica.apply-delta 0.073ms; replica.apply-delta 0.065ms |
| c2c00f647818400f0000000000105de1 | 201.692 | 13.980 | n/a | 0.000 | 0.000 | 29.250 | 1.395 | 157.042 | n/a | 0.021 | 0.000 | n/a | n/a | 0.004 | 13.980 | 0.069 | 0.004 | gw-r/thread-72/gateway.admission-wait | reader.observe 20.247ms; reader.observe 2.061ms; reader.observe 1.757ms; client.parse 1.320ms; reader.observe 1.219ms |
| c2c00f647818400f0000000000105de2 | 176.540 | 13.810 | n/a | 0.000 | 0.000 | 75.777 | 0.803 | 86.122 | n/a | 0.021 | 0.000 | n/a | n/a | 0.006 | 13.810 | 0.078 | 0.006 | gw-r/thread-73/gateway.admission-wait | reader.observe 20.247ms; reader.observe 2.113ms; reader.observe 1.757ms; client.parse 1.320ms; reader.observe 1.219ms |
| c2c00f647818400f0000000000105dc6 | 127.845 | 15.858 | n/a | 0.000 | 0.000 | 12.342 | 26.159 | 73.412 | n/a | 0.069 | 0.000 | n/a | n/a | 0.005 | 15.858 | 0.124 | 0.005 | gw-r/thread-61/gateway.admission-wait | reader.observe 1.700ms; replica.apply-delta 0.073ms; replica.apply-delta 0.048ms; replica.apply-delta 0.047ms |
| c2c00f647818400f0000000000105dc4 | 96.678 | 15.626 | n/a | 0.000 | 0.000 | 3.292 | 35.040 | 42.556 | n/a | 0.059 | 0.000 | n/a | n/a | 0.105 | 15.626 | 0.162 | 0.105 | gw-r/thread-46/gateway.admission-wait | replica.apply-delta 0.073ms; replica.apply-delta 0.048ms; replica.apply-delta 0.047ms |
| 4b0a77412ffa78e3000000000006e31a | 93.145 | 12.979 | n/a | 0.000 | 0.000 | 16.264 | 2.392 | 61.475 | n/a | 0.025 | 0.000 | n/a | n/a | 0.010 | 12.979 | 0.139 | 0.010 | gw-r/thread-59/gateway.admission-wait | reader.observe 1.682ms; replica.apply-delta 0.124ms; replica.apply-delta 0.049ms; replica.apply-delta 0.045ms |
| 4b0a77412ffa78e3000000000006e317 | 62.177 | 15.547 | n/a | 0.000 | 0.000 | 0.883 | 45.683 | 0.016 | n/a | 0.023 | 0.000 | n/a | n/a | 0.026 | 15.547 | 0.250 | 0.026 | gw-r/thread-49/gateway.admitted-work | replica.apply-delta 0.124ms; replica.apply-delta 0.049ms; replica.apply-delta 0.045ms |

## P3 / outside-phases / read (36 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.385 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.165 | 201.015 | 0.024 | n/a | 0.119 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 |
| p99 | 208.293 | n/a | n/a | n/a | 8.610 | n/a | 0.000 | 0.000 | 9.699 | 206.645 | 11.647 | n/a | 1.355 | 0.000 | n/a | n/a | 39.203 | 8.610 | 0.150 | 39.203 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77eb862a914b8ed80000000000000007 | 208.293 | 0.000 | n/a | 0.000 | 0.000 | 1.219 | 206.645 | 0.034 | n/a | 0.212 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-44/journal/page | none observed |
| 77eb862a914b8ed8000000000000005f | 205.986 | 0.000 | n/a | 0.000 | 0.000 | 1.199 | 204.299 | 0.037 | n/a | 0.240 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-46/journal/page | none observed |
| 77eb862a914b8ed8000000000000005c | 205.925 | 0.000 | n/a | 0.000 | 0.000 | 4.123 | 201.478 | 0.029 | n/a | 0.177 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-61/journal/page | none observed |
| 77eb862a914b8ed800000000000000cb | 205.620 | 0.000 | n/a | 0.000 | 0.000 | 4.321 | 201.031 | 0.016 | n/a | 0.123 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-60/journal/page | none observed |
| 77eb862a914b8ed80000000000000006 | 205.461 | 0.991 | n/a | 0.000 | 0.000 | 2.837 | 201.164 | 0.054 | n/a | 0.276 | 0.000 | n/a | n/a | 0.139 | 0.991 | 0.005 | 0.139 | gw-r/thread-45/journal/page | none observed |
| 77eb862a914b8ed8000000000000009c | 204.907 | 0.000 | n/a | 0.000 | 0.000 | 0.933 | 203.627 | 0.028 | n/a | 0.147 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-59/journal/page | none observed |
| 77eb862a914b8ed8000000000000007d | 204.821 | 0.000 | n/a | 0.000 | 0.000 | 2.563 | 189.112 | 11.647 | n/a | 1.355 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-44/journal/page | none observed |
| 77eb862a914b8ed8000000000000009b | 203.927 | 0.000 | n/a | 0.000 | 0.000 | 1.297 | 202.233 | 0.039 | n/a | 0.152 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-60/journal/page | none observed |
| 77eb862a914b8ed800000000000000ca | 203.920 | 0.000 | n/a | 0.000 | 0.000 | 1.269 | 202.160 | 0.051 | n/a | 0.227 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-62/journal/page | none observed |
| 77eb862a914b8ed80000000000000076 | 203.479 | 0.000 | n/a | 0.000 | 0.000 | 2.207 | 201.035 | 0.014 | n/a | 0.110 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 77eb862a914b8ed8000000000000007a | 203.284 | 0.000 | n/a | 0.000 | 0.000 | 1.775 | 201.174 | 0.021 | n/a | 0.113 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-46/journal/page | none observed |
| 77eb862a914b8ed800000000000000a5 | 203.169 | 0.000 | n/a | 0.000 | 0.000 | 2.011 | 200.862 | 0.021 | n/a | 0.111 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-48/journal/page | none observed |
| 77eb862a914b8ed80000000000000005 | 202.978 | 0.000 | n/a | 0.000 | 0.000 | 1.168 | 201.010 | 0.028 | n/a | 0.195 | 0.000 | n/a | n/a | 0.577 | 0.000 | 0.000 | 0.577 | gw-r/thread-42/journal/page | none observed |
| 77eb862a914b8ed80000000000000098 | 202.874 | 0.000 | n/a | 0.000 | 0.000 | 1.122 | 201.440 | 0.024 | n/a | 0.160 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-42/journal/page | none observed |
| 77eb862a914b8ed800000000000000c9 | 202.793 | 0.000 | n/a | 0.000 | 0.000 | 1.069 | 201.389 | 0.010 | n/a | 0.158 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-47/journal/page | none observed |
| 77eb862a914b8ed8000000000000005d | 202.641 | 0.000 | n/a | 0.000 | 0.000 | 1.053 | 201.277 | 0.026 | n/a | 0.119 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-60/journal/page | none observed |
| 77eb862a914b8ed8000000000000007b | 202.506 | 0.000 | n/a | 0.000 | 0.000 | 1.044 | 201.115 | 0.030 | n/a | 0.116 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-60/journal/page | none observed |
| 77eb862a914b8ed8000000000000005a | 202.396 | 0.000 | n/a | 0.000 | 0.000 | 1.165 | 200.920 | 0.020 | n/a | 0.119 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-44/journal/page | none observed |
| 77eb862a914b8ed800000000000000a3 | 202.385 | 0.000 | n/a | 0.000 | 0.000 | 1.031 | 201.022 | 0.018 | n/a | 0.141 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-49/journal/page | none observed |
| 77eb862a914b8ed80000000000000099 | 202.361 | 0.000 | n/a | 0.000 | 0.000 | 0.925 | 201.177 | 0.017 | n/a | 0.117 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-45/journal/page | none observed |

## P3 / outside-phases / internal (18 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 506.807 | n/a | n/a | n/a | 3.064 | n/a | 0.000 | 0.000 | 1.122 | 493.678 | 0.021 | n/a | 0.115 | 0.000 | n/a | n/a | 0.119 | 3.064 | 0.008 | 0.119 |
| p99 | 1007.752 | n/a | n/a | n/a | 84.618 | n/a | 3.178 | 0.000 | 2.102 | 1001.785 | 1.865 | n/a | 0.501 | 0.000 | n/a | n/a | 42.306 | 87.797 | 0.665 | 42.306 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca80000000000000017 | 1007.752 | 0.413 | n/a | 0.000 | 0.000 | 2.102 | 1001.415 | 1.865 | n/a | 0.501 | 0.000 | n/a | n/a | 1.456 | 0.413 | 0.000 | 1.456 | gw-r/thread-46/journal/page | none observed |
| ec74de1beb264ca80000000000000054 | 1004.827 | 0.159 | n/a | 0.000 | 0.000 | 1.538 | 1001.785 | 0.018 | n/a | 0.156 | 0.000 | n/a | n/a | 1.172 | 0.159 | 0.000 | 1.172 | gw-r/thread-59/journal/page | none observed |
| ec74de1beb264ca80000000000000018 | 1004.692 | 0.183 | n/a | 0.000 | 0.000 | 1.518 | 1001.548 | 0.028 | n/a | 0.112 | 0.000 | n/a | n/a | 1.303 | 0.183 | 0.000 | 1.303 | gw-r/thread-46/journal/page | none observed |
| ec74de1beb264ca80000000000000019 | 1003.831 | 0.146 | n/a | 0.000 | 0.000 | 0.663 | 1001.611 | 0.024 | n/a | 0.245 | 0.000 | n/a | n/a | 1.142 | 0.146 | 0.000 | 1.142 | gw-r/thread-49/journal/page | none observed |
| ec74de1beb264ca80000000000000081 | 987.024 | 3.671 | n/a | 0.000 | 0.000 | 1.764 | 981.269 | 0.057 | n/a | 0.146 | 0.000 | n/a | n/a | 0.118 | 3.671 | 0.004 | 0.118 | gw-r/thread-46/journal/page | none observed |
| ec74de1beb264ca8000000000000001a | 825.573 | 25.806 | n/a | 2.767 | 0.000 | 1.382 | 794.791 | 0.021 | n/a | 0.120 | 0.000 | n/a | n/a | 0.686 | 28.573 | 0.035 | 0.686 | gw-r/thread-47/journal/page | none observed |
| ec74de1beb264ca8000000000000007e | 653.480 | 3.032 | n/a | 0.000 | 0.000 | 0.841 | 649.442 | 0.015 | n/a | 0.075 | 0.000 | n/a | n/a | 0.076 | 3.032 | 0.005 | 0.076 | gw-r/thread-62/journal/page | none observed |
| ec74de1beb264ca80000000000000053 | 630.009 | 3.025 | n/a | 0.000 | 0.000 | 1.122 | 625.611 | 0.033 | n/a | 0.115 | 0.000 | n/a | n/a | 0.103 | 3.025 | 0.005 | 0.103 | gw-r/thread-47/journal/page | none observed |
| ec74de1beb264ca80000000000000063 | 535.036 | 2.245 | n/a | 0.000 | 0.000 | 0.775 | 531.795 | 0.023 | n/a | 0.120 | 0.000 | n/a | n/a | 0.078 | 2.245 | 0.004 | 0.078 | gw-r/thread-47/journal/page | none observed |
| ec74de1beb264ca80000000000000060 | 506.807 | 10.165 | n/a | 1.845 | 0.000 | 0.845 | 493.678 | 0.018 | n/a | 0.116 | 0.000 | n/a | n/a | 0.139 | 12.010 | 0.024 | 0.139 | gw-r/thread-62/journal/page | none observed |
| ec74de1beb264ca8000000000000007d | 417.557 | 3.231 | n/a | 0.000 | 0.000 | 1.112 | 412.903 | 0.028 | n/a | 0.216 | 0.000 | n/a | n/a | 0.066 | 3.231 | 0.008 | 0.066 | gw-r/thread-44/journal/page | none observed |
| ec74de1beb264ca80000000000000051 | 383.517 | 5.585 | n/a | 0.000 | 0.000 | 1.002 | 376.627 | 0.021 | n/a | 0.107 | 0.000 | n/a | n/a | 0.175 | 5.585 | 0.015 | 0.175 | gw-r/thread-62/journal/page | none observed |
| ec74de1beb264ca8000000000000007f | 366.458 | 5.277 | n/a | 0.000 | 0.000 | 1.237 | 359.733 | 0.015 | n/a | 0.076 | 0.000 | n/a | n/a | 0.119 | 5.277 | 0.014 | 0.119 | gw-r/thread-48/journal/page | none observed |
| ec74de1beb264ca80000000000000082 | 249.210 | 4.248 | n/a | 0.000 | 0.000 | 1.295 | 243.482 | 0.011 | n/a | 0.097 | 0.000 | n/a | n/a | 0.077 | 4.248 | 0.017 | 0.077 | gw-r/thread-62/journal/page | none observed |
| ec74de1beb264ca80000000000000064 | 209.497 | 2.760 | n/a | 0.000 | 0.000 | 1.280 | 205.211 | 0.023 | n/a | 0.135 | 0.000 | n/a | n/a | 0.087 | 2.760 | 0.013 | 0.087 | gw-r/thread-42/journal/page | none observed |
| ec74de1beb264ca8000000000000005d | 132.108 | 84.618 | n/a | 3.178 | 0.000 | 2.005 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.306 | 87.797 | 0.665 | 42.306 | node-14/thread-2/replica.fetch-feed | none observed |
| ec74de1beb264ca80000000000000062 | 94.772 | 3.064 | n/a | 0.000 | 0.000 | 1.063 | 90.511 | 0.011 | n/a | 0.043 | 0.000 | n/a | n/a | 0.079 | 3.064 | 0.032 | 0.079 | gw-r/thread-45/journal/page | none observed |
| ec74de1beb264ca8000000000000005f | 5.269 | 3.292 | n/a | 0.000 | 0.000 | 0.353 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.625 | 3.292 | 0.625 | 1.625 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 511.163 | n/a | n/a | n/a | 3.159 | n/a | 0.000 | 0.000 | 1.167 | 494.653 | 0.018 | n/a | 0.106 | 0.000 | n/a | n/a | 0.165 | 3.159 | 0.009 | 0.165 |
| p99 | 680.909 | n/a | n/a | n/a | 14.109 | n/a | 0.000 | 0.000 | 2.120 | 677.380 | 0.024 | n/a | 0.119 | 0.000 | n/a | n/a | 0.297 | 14.109 | 0.028 | 0.297 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca8000000000000001d | 680.909 | 2.194 | n/a | 0.000 | 0.000 | 1.047 | 677.380 | 0.018 | n/a | 0.106 | 0.000 | n/a | n/a | 0.165 | 2.194 | 0.003 | 0.165 | gw-r/thread-45/journal/page | none observed |
| ec74de1beb264ca8000000000000001c | 511.163 | 14.109 | n/a | 0.000 | 0.000 | 2.120 | 494.653 | 0.024 | n/a | 0.119 | 0.000 | n/a | n/a | 0.138 | 14.109 | 0.028 | 0.138 | gw-r/thread-48/journal/page | none observed |
| ec74de1beb264ca8000000000000001f | 339.651 | 3.159 | n/a | 0.000 | 0.000 | 1.167 | 334.920 | 0.013 | n/a | 0.096 | 0.000 | n/a | n/a | 0.297 | 3.159 | 0.009 | 0.297 | gw-r/thread-62/journal/page | none observed |

## P3 / baseline / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 281.008 | n/a | n/a | n/a | 3.692 | n/a | 0.000 | 0.000 | 0.997 | 274.809 | 0.018 | n/a | 0.094 | 0.000 | n/a | n/a | 0.212 | 3.692 | 0.004 | 0.212 |
| p99 | 894.348 | n/a | n/a | n/a | 5.031 | n/a | 0.000 | 0.000 | 5.415 | 884.666 | 0.065 | n/a | 0.299 | 0.000 | n/a | n/a | 0.310 | 5.031 | 0.038 | 0.310 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca80000000000000023 | 894.348 | 3.692 | n/a | 0.000 | 0.000 | 5.415 | 884.666 | 0.065 | n/a | 0.299 | 0.000 | n/a | n/a | 0.212 | 3.692 | 0.004 | 0.212 | gw-r/thread-61/journal/page | none observed |
| ec74de1beb264ca80000000000000020 | 669.453 | 2.461 | n/a | 0.000 | 0.000 | 1.282 | 665.435 | 0.014 | n/a | 0.094 | 0.000 | n/a | n/a | 0.166 | 2.461 | 0.004 | 0.166 | gw-r/thread-44/journal/page | none observed |
| ec74de1beb264ca80000000000000021 | 281.008 | 5.031 | n/a | 0.000 | 0.000 | 0.808 | 274.809 | 0.018 | n/a | 0.120 | 0.000 | n/a | n/a | 0.221 | 5.031 | 0.018 | 0.221 | gw-r/thread-60/journal/page | none observed |
| ec74de1beb264ca80000000000000024 | 110.088 | 4.228 | n/a | 0.000 | 0.000 | 0.997 | 104.445 | 0.018 | n/a | 0.091 | 0.000 | n/a | n/a | 0.310 | 4.228 | 0.038 | 0.310 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 776.416 | n/a | n/a | n/a | 3.920 | n/a | 0.000 | 0.000 | 1.582 | 772.823 | 0.027 | n/a | 0.104 | 0.000 | n/a | n/a | 0.167 | 3.920 | 0.004 | 0.167 |
| p99 | 1010.707 | n/a | n/a | n/a | 6.254 | n/a | 0.000 | 0.000 | 3.295 | 1003.007 | 0.028 | n/a | 0.291 | 0.000 | n/a | n/a | 0.215 | 6.254 | 0.030 | 0.215 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca80000000000000029 | 1010.707 | 3.920 | n/a | 0.000 | 0.000 | 3.295 | 1003.007 | 0.027 | n/a | 0.291 | 0.000 | n/a | n/a | 0.167 | 3.920 | 0.004 | 0.167 | gw-r/thread-47/journal/page | none observed |
| ec74de1beb264ca80000000000000028 | 776.416 | 2.512 | n/a | 0.000 | 0.000 | 0.860 | 772.823 | 0.028 | n/a | 0.104 | 0.000 | n/a | n/a | 0.090 | 2.512 | 0.003 | 0.090 | gw-r/thread-46/journal/page | none observed |
| ec74de1beb264ca80000000000000026 | 205.162 | 6.254 | n/a | 0.000 | 0.000 | 1.582 | 196.993 | 0.018 | n/a | 0.100 | 0.000 | n/a | n/a | 0.215 | 6.254 | 0.030 | 0.215 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 444.659 | n/a | n/a | n/a | 5.187 | n/a | 0.000 | 0.000 | 1.692 | 437.012 | 0.020 | n/a | 0.159 | 0.000 | n/a | n/a | 0.123 | 5.187 | 0.011 | 0.123 |
| p99 | 1006.843 | n/a | n/a | n/a | 6.156 | n/a | 0.000 | 0.000 | 2.123 | 1003.275 | 0.050 | n/a | 0.783 | 0.000 | n/a | n/a | 1.249 | 6.156 | 0.062 | 1.249 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca8000000000000002f | 1006.843 | 0.388 | n/a | 0.000 | 0.000 | 1.692 | 1003.275 | 0.050 | n/a | 0.189 | 0.000 | n/a | n/a | 1.249 | 0.388 | 0.000 | 1.249 | gw-r/thread-60/journal/page | none observed |
| ec74de1beb264ca8000000000000002d | 458.240 | 5.187 | n/a | 0.000 | 0.000 | 1.175 | 450.942 | 0.020 | n/a | 0.783 | 0.000 | n/a | n/a | 0.135 | 5.187 | 0.011 | 0.135 | gw-r/thread-45/journal/page | none observed |
| ec74de1beb264ca8000000000000002b | 444.659 | 5.273 | n/a | 0.000 | 0.000 | 2.123 | 437.012 | 0.028 | n/a | 0.102 | 0.000 | n/a | n/a | 0.122 | 5.273 | 0.012 | 0.122 | gw-r/thread-62/journal/page | none observed |
| ec74de1beb264ca8000000000000002a | 98.904 | 6.156 | n/a | 0.000 | 0.000 | 1.749 | 90.702 | 0.015 | n/a | 0.159 | 0.000 | n/a | n/a | 0.123 | 6.156 | 0.062 | 0.123 | gw-r/thread-42/journal/page | none observed |

## P3 / L16 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 217.940 | n/a | n/a | n/a | 3.979 | n/a | 0.000 | 0.000 | 1.098 | 213.187 | 0.020 | n/a | 0.119 | 0.000 | n/a | n/a | 0.348 | 3.979 | 0.015 | 0.348 |
| p99 | 994.963 | n/a | n/a | n/a | 9.986 | n/a | 0.000 | 0.000 | 2.354 | 988.346 | 0.034 | n/a | 0.311 | 0.000 | n/a | n/a | 26.242 | 9.986 | 0.273 | 26.242 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca80000000000000031 | 994.963 | 3.979 | n/a | 0.000 | 0.000 | 2.354 | 988.346 | 0.020 | n/a | 0.122 | 0.000 | n/a | n/a | 0.141 | 3.979 | 0.004 | 0.141 | gw-r/thread-61/journal/page | none observed |
| ec74de1beb264ca80000000000000035 | 884.049 | 6.198 | n/a | 0.000 | 0.000 | 1.533 | 875.673 | 0.034 | n/a | 0.311 | 0.000 | n/a | n/a | 0.301 | 6.198 | 0.007 | 0.301 | gw-r/thread-62/journal/page | none observed |
| ec74de1beb264ca80000000000000033 | 217.940 | 3.168 | n/a | 0.000 | 0.000 | 1.098 | 213.187 | 0.021 | n/a | 0.119 | 0.000 | n/a | n/a | 0.348 | 3.168 | 0.015 | 0.348 | gw-r/thread-47/journal/page | none observed |
| ec74de1beb264ca80000000000000030 | 36.615 | 9.986 | n/a | 0.000 | 0.000 | 0.386 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.242 | 9.986 | 0.273 | 26.242 | node-14/thread-2/socket.wait-first-byte | none observed |
| ec74de1beb264ca80000000000000032 | 28.178 | 2.779 | n/a | 0.000 | 0.000 | 0.459 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.941 | 2.779 | 0.099 | 24.941 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 298.169 | n/a | n/a | n/a | 3.252 | n/a | 0.000 | 0.000 | 0.876 | 292.708 | 0.020 | n/a | 0.094 | 0.000 | n/a | n/a | 0.109 | 3.252 | 0.009 | 0.109 |
| p99 | 784.562 | n/a | n/a | n/a | 11.337 | n/a | 4.091 | 0.000 | 1.881 | 778.719 | 0.037 | n/a | 0.197 | 0.000 | n/a | n/a | 3.953 | 15.428 | 0.026 | 3.953 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca8000000000000003c | 784.562 | 4.158 | n/a | 0.000 | 0.000 | 1.471 | 778.719 | 0.016 | n/a | 0.078 | 0.000 | n/a | n/a | 0.119 | 4.158 | 0.005 | 0.119 | gw-r/thread-47/journal/page | none observed |
| ec74de1beb264ca80000000000000037 | 595.016 | 11.337 | n/a | 4.091 | 0.000 | 0.876 | 574.582 | 0.037 | n/a | 0.140 | 0.000 | n/a | n/a | 3.953 | 15.428 | 0.026 | 3.953 | gw-r/thread-44/journal/page | none observed |
| ec74de1beb264ca80000000000000039 | 298.169 | 3.252 | n/a | 0.000 | 0.000 | 1.881 | 292.708 | 0.021 | n/a | 0.197 | 0.000 | n/a | n/a | 0.109 | 3.252 | 0.011 | 0.109 | gw-r/thread-48/journal/page | none observed |
| ec74de1beb264ca8000000000000003a | 248.283 | 2.315 | n/a | 0.000 | 0.000 | 0.657 | 245.110 | 0.020 | n/a | 0.094 | 0.000 | n/a | n/a | 0.088 | 2.315 | 0.009 | 0.088 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 349.990 | n/a | n/a | n/a | 3.039 | n/a | 0.000 | 0.000 | 2.418 | 346.335 | 0.023 | n/a | 0.109 | 0.000 | n/a | n/a | 0.142 | 3.039 | 0.009 | 0.142 |
| p99 | 776.152 | n/a | n/a | n/a | 7.171 | n/a | 0.000 | 0.000 | 3.652 | 765.748 | 0.027 | n/a | 0.111 | 0.000 | n/a | n/a | 1.047 | 7.171 | 0.025 | 1.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca8000000000000003f | 776.152 | 7.171 | n/a | 0.000 | 0.000 | 2.926 | 765.748 | 0.023 | n/a | 0.109 | 0.000 | n/a | n/a | 0.176 | 7.171 | 0.009 | 0.176 | gw-r/thread-62/journal/page | none observed |
| ec74de1beb264ca80000000000000040 | 486.767 | 3.039 | n/a | 0.000 | 0.000 | 2.418 | 481.057 | 0.018 | n/a | 0.092 | 0.000 | n/a | n/a | 0.142 | 3.039 | 0.006 | 0.142 | gw-r/thread-60/journal/page | none observed |
| ec74de1beb264ca80000000000000041 | 349.990 | 2.515 | n/a | 0.000 | 0.000 | 0.924 | 346.335 | 0.025 | n/a | 0.093 | 0.000 | n/a | n/a | 0.099 | 2.515 | 0.007 | 0.099 | gw-r/thread-42/journal/page | none observed |
| ec74de1beb264ca8000000000000003d | 165.194 | 3.018 | n/a | 0.000 | 0.000 | 1.097 | 160.855 | 0.019 | n/a | 0.111 | 0.000 | n/a | n/a | 0.094 | 3.018 | 0.018 | 0.094 | gw-r/thread-46/journal/page | none observed |
| ec74de1beb264ca80000000000000044 | 156.622 | 3.901 | n/a | 0.000 | 0.000 | 3.652 | 147.885 | 0.027 | n/a | 0.110 | 0.000 | n/a | n/a | 1.047 | 3.901 | 0.025 | 1.047 | gw-r/thread-61/journal/page | none observed |

## P3 / L1024 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 933.314 | n/a | n/a | n/a | 3.664 | n/a | 0.000 | 0.000 | 1.076 | 927.349 | 0.024 | n/a | 0.116 | 0.000 | n/a | n/a | 1.187 | 3.664 | 0.004 | 1.187 |
| p99 | 1015.385 | n/a | n/a | n/a | 5.489 | n/a | 0.000 | 0.000 | 2.049 | 1012.245 | 0.071 | n/a | 0.574 | 0.000 | n/a | n/a | 45.821 | 5.489 | 0.106 | 45.821 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca80000000000000045 | 1015.385 | 0.232 | n/a | 0.000 | 0.000 | 1.076 | 1012.245 | 0.071 | n/a | 0.574 | 0.000 | n/a | n/a | 1.187 | 0.232 | 0.000 | 1.187 | gw-r/thread-59/journal/page | none observed |
| ec74de1beb264ca80000000000000047 | 933.314 | 3.664 | n/a | 0.000 | 0.000 | 2.049 | 927.349 | 0.024 | n/a | 0.116 | 0.000 | n/a | n/a | 0.112 | 3.664 | 0.004 | 0.112 | gw-r/thread-47/journal/page | none observed |
| ec74de1beb264ca80000000000000046 | 51.758 | 5.489 | n/a | 0.000 | 0.000 | 0.448 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 45.821 | 5.489 | 0.106 | 45.821 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / recovery / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 279.602 | n/a | n/a | n/a | 4.012 | n/a | 0.000 | 0.000 | 2.003 | 271.690 | 0.015 | n/a | 0.071 | 0.000 | n/a | n/a | 0.190 | 4.012 | 0.017 | 0.190 |
| p99 | 1003.998 | n/a | n/a | n/a | 7.516 | n/a | 0.000 | 0.000 | 2.843 | 1001.696 | 2.584 | n/a | 0.119 | 0.000 | n/a | n/a | 1.120 | 7.516 | 0.054 | 1.120 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca80000000000000048 | 1003.998 | 0.160 | n/a | 0.000 | 0.000 | 0.887 | 1001.696 | 0.015 | n/a | 0.119 | 0.000 | n/a | n/a | 1.120 | 0.160 | 0.000 | 1.120 | gw-r/thread-60/journal/page | none observed |
| ec74de1beb264ca8000000000000004c | 455.685 | 7.516 | n/a | 0.000 | 0.000 | 2.003 | 445.891 | 0.013 | n/a | 0.071 | 0.000 | n/a | n/a | 0.190 | 7.516 | 0.016 | 0.190 | gw-r/thread-47/journal/page | none observed |
| ec74de1beb264ca8000000000000004e | 279.602 | 4.829 | n/a | 0.000 | 0.000 | 2.843 | 271.690 | 0.022 | n/a | 0.087 | 0.000 | n/a | n/a | 0.131 | 4.829 | 0.017 | 0.131 | gw-r/thread-48/journal/page | none observed |
| ec74de1beb264ca8000000000000004a | 197.361 | 4.012 | n/a | 0.000 | 0.000 | 2.835 | 190.262 | 0.007 | n/a | 0.021 | 0.000 | n/a | n/a | 0.224 | 4.012 | 0.020 | 0.224 | gw-r/thread-62/journal/page | none observed |
| ec74de1beb264ca80000000000000049 | 59.944 | 3.258 | n/a | 0.000 | 0.000 | 0.945 | 53.047 | 2.584 | n/a | 0.023 | 0.000 | n/a | n/a | 0.087 | 3.258 | 0.054 | 0.087 | gw-r/thread-62/journal/page | none observed |

## P3 / p4mix / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 982.881 | n/a | n/a | n/a | 2.958 | n/a | 0.000 | 0.000 | 0.398 | 979.069 | 0.014 | n/a | 0.102 | 0.000 | n/a | n/a | 0.094 | 2.958 | 0.003 | 0.094 |
| p99 | 985.176 | n/a | n/a | n/a | 3.132 | n/a | 0.000 | 0.000 | 1.170 | 980.838 | 0.022 | n/a | 0.137 | 0.000 | n/a | n/a | 0.123 | 3.132 | 0.003 | 0.123 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca8000000000000004f | 985.176 | 2.958 | n/a | 0.000 | 0.000 | 1.170 | 980.838 | 0.014 | n/a | 0.102 | 0.000 | n/a | n/a | 0.094 | 2.958 | 0.003 | 0.094 | gw-r/thread-61/journal/page | none observed |
| ec74de1beb264ca80000000000000050 | 982.881 | 3.132 | n/a | 0.000 | 0.000 | 0.398 | 979.069 | 0.022 | n/a | 0.137 | 0.000 | n/a | n/a | 0.123 | 3.132 | 0.003 | 0.123 | gw-r/thread-59/journal/page | none observed |

## P3 / p4h1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 674.829 | n/a | n/a | n/a | 3.774 | n/a | 0.000 | 0.000 | 1.398 | 667.900 | 0.023 | n/a | 0.110 | 0.000 | n/a | n/a | 0.105 | 3.774 | 0.006 | 0.105 |
| p99 | 931.295 | n/a | n/a | n/a | 5.156 | n/a | 0.000 | 0.000 | 2.934 | 924.862 | 9.080 | n/a | 3.307 | 0.000 | n/a | n/a | 0.272 | 5.156 | 0.048 | 0.272 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca80000000000000056 | 931.295 | 5.156 | n/a | 0.000 | 0.000 | 0.884 | 924.862 | 0.020 | n/a | 0.102 | 0.000 | n/a | n/a | 0.272 | 5.156 | 0.006 | 0.272 | gw-r/thread-44/journal/page | none observed |
| ec74de1beb264ca80000000000000057 | 674.829 | 3.774 | n/a | 0.000 | 0.000 | 2.934 | 667.900 | 0.023 | n/a | 0.110 | 0.000 | n/a | n/a | 0.088 | 3.774 | 0.006 | 0.088 | gw-r/thread-45/journal/page | none observed |
| ec74de1beb264ca80000000000000055 | 56.916 | 2.758 | n/a | 0.000 | 0.000 | 1.398 | 40.268 | 9.080 | n/a | 3.307 | 0.000 | n/a | n/a | 0.105 | 2.758 | 0.048 | 0.105 | gw-r/thread-48/journal/page | none observed |

## P3 / grow3 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 325.873 | n/a | n/a | n/a | 3.892 | n/a | 0.000 | 0.000 | 0.908 | 320.412 | 0.015 | n/a | 0.080 | 0.000 | n/a | n/a | 0.165 | 3.892 | 0.035 | 0.165 |
| p99 | 1138.786 | n/a | n/a | n/a | 117.484 | n/a | 4.790 | 0.000 | 2.574 | 1012.747 | 0.029 | n/a | 0.105 | 0.000 | n/a | n/a | 3.063 | 122.274 | 0.107 | 3.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca8000000000000005b | 1138.786 | 117.484 | n/a | 4.790 | 0.000 | 0.618 | 1012.747 | 0.013 | n/a | 0.072 | 0.000 | n/a | n/a | 3.063 | 122.274 | 0.107 | 3.063 | gw-r/thread-44/journal/page | none observed |
| ec74de1beb264ca80000000000000059 | 325.873 | 2.664 | n/a | 0.000 | 0.000 | 2.574 | 320.412 | 0.029 | n/a | 0.105 | 0.000 | n/a | n/a | 0.089 | 2.664 | 0.008 | 0.089 | gw-r/thread-48/journal/page | none observed |
| ec74de1beb264ca8000000000000005a | 110.379 | 3.892 | n/a | 0.000 | 0.000 | 0.908 | 105.319 | 0.015 | n/a | 0.080 | 0.000 | n/a | n/a | 0.165 | 3.892 | 0.035 | 0.165 | gw-r/thread-62/journal/page | none observed |

## P3 / p4h3 / internal (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 302.401 | n/a | n/a | n/a | 4.911 | n/a | 0.000 | 0.000 | 0.722 | 296.917 | 0.019 | n/a | 0.079 | 0.000 | n/a | n/a | 0.192 | 4.911 | 0.016 | 0.192 |
| p99 | 844.608 | n/a | n/a | n/a | 144.971 | n/a | 6.071 | 0.000 | 1.886 | 687.823 | 0.062 | n/a | 4.616 | 0.000 | n/a | n/a | 32.064 | 151.042 | 0.428 | 32.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca80000000000000076 | 844.608 | 144.971 | n/a | 6.071 | 0.000 | 1.886 | 687.823 | 0.015 | n/a | 0.079 | 0.000 | n/a | n/a | 3.763 | 151.042 | 0.179 | 3.763 | gw-r/thread-47/journal/page | none observed |
| ec74de1beb264ca80000000000000075 | 540.961 | 5.176 | n/a | 0.000 | 0.000 | 1.690 | 533.879 | 0.019 | n/a | 0.097 | 0.000 | n/a | n/a | 0.100 | 5.176 | 0.010 | 0.100 | gw-r/thread-62/journal/page | none observed |
| ec74de1beb264ca8000000000000006c | 498.663 | 4.344 | n/a | 0.000 | 0.000 | 1.744 | 492.273 | 0.021 | n/a | 0.089 | 0.000 | n/a | n/a | 0.192 | 4.344 | 0.009 | 0.192 | gw-r/thread-45/journal/page | none observed |
| ec74de1beb264ca80000000000000073 | 448.900 | 6.801 | n/a | 0.000 | 0.000 | 0.686 | 436.423 | 0.029 | n/a | 4.616 | 0.000 | n/a | n/a | 0.345 | 6.801 | 0.015 | 0.345 | gw-r/thread-44/journal/page | none observed |
| ec74de1beb264ca8000000000000006a | 326.391 | 5.264 | n/a | 0.000 | 0.000 | 0.722 | 320.174 | 0.021 | n/a | 0.077 | 0.000 | n/a | n/a | 0.133 | 5.264 | 0.016 | 0.133 | gw-r/thread-48/journal/page | none observed |
| ec74de1beb264ca80000000000000067 | 302.401 | 4.237 | n/a | 0.000 | 0.000 | 0.932 | 296.917 | 0.062 | n/a | 0.129 | 0.000 | n/a | n/a | 0.125 | 4.237 | 0.014 | 0.125 | gw-r/thread-61/journal/page | none observed |
| ec74de1beb264ca80000000000000068 | 110.379 | 5.540 | n/a | 0.000 | 0.000 | 0.996 | 103.654 | 0.019 | n/a | 0.100 | 0.000 | n/a | n/a | 0.071 | 5.540 | 0.050 | 0.071 | gw-r/thread-60/journal/page | none observed |
| ec74de1beb264ca80000000000000071 | 37.303 | 4.911 | n/a | 0.000 | 0.000 | 0.328 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 32.064 | 4.911 | 0.132 | 32.064 | node-14/thread-2/socket.wait-first-byte | none observed |
| ec74de1beb264ca8000000000000006f | 19.530 | 3.068 | n/a | 0.000 | 0.000 | 0.407 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.054 | 3.068 | 0.157 | 16.054 | node-14/thread-2/socket.wait-first-byte | none observed |
| ec74de1beb264ca8000000000000006d | 9.817 | 4.202 | n/a | 0.000 | 0.000 | 0.499 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.116 | 4.202 | 0.428 | 5.116 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow10 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 116.383 | n/a | n/a | n/a | 86.628 | n/a | 3.843 | 0.000 | 1.179 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.820 | 90.364 | 0.792 | 17.820 |
| p99 | 267.413 | n/a | n/a | n/a | 187.693 | n/a | 11.314 | 0.000 | 5.996 | 64.001 | 0.028 | n/a | 0.000 | 0.000 | n/a | n/a | 36.919 | 199.008 | 0.858 | 36.919 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca80000000000000077 | 267.413 | 187.693 | n/a | 11.314 | 0.000 | 1.204 | 64.001 | 0.028 | n/a | 0.000 | 0.000 | n/a | n/a | 3.173 | 199.008 | 0.744 | 3.173 | node-14/thread-2/replica.fetch-feed | none observed |
| ec74de1beb264ca8000000000000007a | 117.125 | 88.930 | n/a | 3.843 | 0.000 | 0.691 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.661 | 92.773 | 0.792 | 23.661 | node-14/thread-2/replica.fetch-feed | none observed |
| ec74de1beb264ca8000000000000007b | 116.383 | 70.033 | n/a | 3.435 | 0.000 | 5.996 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.919 | 73.468 | 0.631 | 36.919 | node-14/thread-2/replica.fetch-feed | none observed |
| ec74de1beb264ca80000000000000079 | 109.363 | 86.628 | n/a | 3.737 | 0.000 | 1.179 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.820 | 90.364 | 0.826 | 17.820 | node-14/thread-2/replica.fetch-feed | none observed |
| ec74de1beb264ca8000000000000007c | 96.908 | 78.769 | n/a | 4.362 | 0.000 | 0.667 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.110 | 83.131 | 0.858 | 13.110 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 428.387 | n/a | n/a | n/a | 2.678 | n/a | 0.000 | 0.000 | 0.787 | 415.895 | 0.017 | n/a | 0.081 | 0.000 | n/a | n/a | 0.069 | 2.678 | 0.013 | 0.069 |
| p99 | 998.107 | n/a | n/a | n/a | 10.964 | n/a | 0.000 | 0.000 | 1.529 | 993.981 | 0.047 | n/a | 0.106 | 0.000 | n/a | n/a | 2.769 | 10.964 | 0.403 | 2.769 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca80000000000000089 | 998.107 | 2.437 | n/a | 0.000 | 0.000 | 1.529 | 993.981 | 0.016 | n/a | 0.081 | 0.000 | n/a | n/a | 0.063 | 2.437 | 0.002 | 0.063 | gw-r/thread-62/journal/page | none observed |
| ec74de1beb264ca8000000000000008a | 544.424 | 6.905 | n/a | 0.000 | 0.000 | 0.787 | 536.513 | 0.047 | n/a | 0.103 | 0.000 | n/a | n/a | 0.069 | 6.905 | 0.013 | 0.069 | gw-r/thread-59/journal/page | none observed |
| ec74de1beb264ca80000000000000084 | 428.387 | 10.964 | n/a | 0.000 | 0.000 | 1.268 | 415.895 | 0.017 | n/a | 0.077 | 0.000 | n/a | n/a | 0.166 | 10.964 | 0.026 | 0.166 | gw-r/thread-45/journal/page | none observed |
| ec74de1beb264ca80000000000000087 | 311.380 | 2.678 | n/a | 0.000 | 0.000 | 0.757 | 307.762 | 0.020 | n/a | 0.106 | 0.000 | n/a | n/a | 0.057 | 2.678 | 0.009 | 0.057 | gw-r/thread-46/journal/page | none observed |
| ec74de1beb264ca80000000000000086 | 5.233 | 2.106 | n/a | 0.000 | 0.000 | 0.357 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.769 | 2.106 | 0.403 | 2.769 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / presweep / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 453.831 | n/a | n/a | n/a | 2.350 | n/a | 0.000 | 0.000 | 1.751 | 447.508 | 0.017 | n/a | 0.093 | 0.000 | n/a | n/a | 0.063 | 2.350 | 0.005 | 0.063 |
| p99 | 685.206 | n/a | n/a | n/a | 3.583 | n/a | 0.000 | 0.000 | 4.060 | 677.654 | 0.066 | n/a | 0.116 | 0.000 | n/a | n/a | 0.066 | 3.583 | 0.007 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca8000000000000008d | 685.206 | 3.349 | n/a | 0.000 | 0.000 | 4.060 | 677.654 | 0.011 | n/a | 0.065 | 0.000 | n/a | n/a | 0.066 | 3.349 | 0.005 | 0.066 | gw-r/thread-42/journal/page | none observed |
| ec74de1beb264ca80000000000000090 | 583.833 | 3.583 | n/a | 0.000 | 0.000 | 1.751 | 578.277 | 0.066 | n/a | 0.093 | 0.000 | n/a | n/a | 0.063 | 3.583 | 0.006 | 0.063 | gw-r/thread-48/journal/page | none observed |
| ec74de1beb264ca8000000000000008c | 453.831 | 2.350 | n/a | 0.000 | 0.000 | 3.801 | 447.508 | 0.019 | n/a | 0.094 | 0.000 | n/a | n/a | 0.059 | 2.350 | 0.005 | 0.059 | gw-r/thread-48/journal/page | none observed |
| ec74de1beb264ca8000000000000008e | 335.922 | 2.336 | n/a | 0.000 | 0.000 | 0.944 | 332.447 | 0.017 | n/a | 0.116 | 0.000 | n/a | n/a | 0.063 | 2.336 | 0.007 | 0.063 | gw-r/thread-46/journal/page | none observed |

## P3 / sweep / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.878 | n/a | n/a | n/a | 6.355 | n/a | 0.000 | 0.000 | 0.885 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.985 | 6.355 | 0.206 | 13.985 |
| p99 | 1003.801 | n/a | n/a | n/a | 14.389 | n/a | 0.000 | 0.000 | 37.486 | 1000.969 | 0.060 | n/a | 0.100 | 0.000 | n/a | n/a | 20.557 | 14.389 | 0.487 | 20.557 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ec74de1beb264ca80000000000000097 | 1003.801 | 0.212 | n/a | 0.000 | 0.000 | 1.288 | 1000.969 | 0.016 | n/a | 0.100 | 0.000 | n/a | n/a | 1.217 | 0.212 | 0.000 | 1.217 | gw-r/thread-69/journal/page | none observed |
| ec74de1beb264ca80000000000000096 | 183.196 | 12.123 | n/a | 0.000 | 0.000 | 37.486 | 133.322 | 0.060 | n/a | 0.000 | 0.000 | n/a | n/a | 0.206 | 12.123 | 0.066 | 0.206 | gw-r/thread-69/gateway.admitted-work | none observed |
| ec74de1beb264ca80000000000000093 | 35.262 | 14.389 | n/a | 0.000 | 0.000 | 0.885 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.989 | 14.389 | 0.408 | 19.989 | node-14/thread-2/socket.wait-first-byte | none observed |
| ec74de1beb264ca80000000000000094 | 30.878 | 6.355 | n/a | 0.000 | 0.000 | 3.966 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.557 | 6.355 | 0.206 | 20.557 | node-14/thread-2/socket.wait-first-byte | none observed |
| ec74de1beb264ca80000000000000095 | 29.021 | 14.135 | n/a | 0.000 | 0.000 | 0.813 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.072 | 14.135 | 0.487 | 14.072 | node-14/thread-2/socket.wait-first-byte | none observed |
| ec74de1beb264ca80000000000000092 | 17.877 | 3.485 | n/a | 0.000 | 0.000 | 0.407 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.985 | 3.485 | 0.195 | 13.985 | node-14/thread-2/socket.wait-first-byte | none observed |
| ec74de1beb264ca80000000000000091 | 6.750 | 1.897 | n/a | 0.000 | 0.000 | 0.369 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.483 | 1.897 | 0.281 | 4.483 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.593 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.164 | 201.321 | 0.031 | n/a | 0.188 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 |
| p99 | 207.591 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.246 | 202.023 | 27.719 | n/a | 0.349 | 0.000 | n/a | n/a | 0.352 | 0.000 | 0.000 | 0.352 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77eb862a914b8ed8000000000000000b | 207.591 | 0.000 | n/a | 0.000 | 0.000 | 6.246 | 201.041 | 0.018 | n/a | 0.135 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-47/journal/page | none observed |
| 77eb862a914b8ed8000000000000000f | 205.645 | 0.000 | n/a | 0.000 | 0.000 | 3.438 | 201.842 | 0.043 | n/a | 0.215 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-61/journal/page | none observed |
| 77eb862a914b8ed8000000000000000a | 205.601 | 0.000 | n/a | 0.000 | 0.000 | 3.788 | 201.478 | 0.024 | n/a | 0.154 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-60/journal/page | none observed |
| 77eb862a914b8ed80000000000000008 | 204.135 | 0.000 | n/a | 0.000 | 0.000 | 2.164 | 201.390 | 0.033 | n/a | 0.237 | 0.000 | n/a | n/a | 0.310 | 0.000 | 0.000 | 0.310 | gw-r/thread-48/journal/page | none observed |
| 77eb862a914b8ed80000000000000011 | 203.593 | 0.000 | n/a | 0.000 | 0.000 | 1.250 | 202.023 | 0.031 | n/a | 0.153 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-47/journal/page | none observed |
| 77eb862a914b8ed8000000000000000d | 203.006 | 0.000 | n/a | 0.000 | 0.000 | 1.362 | 201.321 | 0.018 | n/a | 0.188 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-46/journal/page | none observed |
| 77eb862a914b8ed8000000000000000e | 202.537 | 0.000 | n/a | 0.000 | 0.000 | 0.912 | 201.130 | 0.020 | n/a | 0.349 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-59/journal/page | none observed |
| 77eb862a914b8ed80000000000000009 | 185.375 | 0.000 | n/a | 0.000 | 0.000 | 2.328 | 173.111 | 9.517 | n/a | 0.066 | 0.000 | n/a | n/a | 0.352 | 0.000 | 0.000 | 0.352 | gw-r/thread-44/journal/page | none observed |
| 77eb862a914b8ed80000000000000012 | 109.410 | 0.000 | n/a | 0.000 | 0.000 | 1.404 | 79.916 | 27.719 | n/a | 0.212 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-48/journal/page | none observed |

## P3 / baseline / read (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.939 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.259 | 201.333 | 0.021 | n/a | 0.173 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 |
| p99 | 204.890 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.503 | 201.867 | 0.038 | n/a | 0.293 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77eb862a914b8ed80000000000000015 | 204.890 | 0.000 | n/a | 0.000 | 0.000 | 2.503 | 201.867 | 0.038 | n/a | 0.293 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-42/journal/page | none observed |
| 77eb862a914b8ed80000000000000014 | 202.939 | 0.000 | n/a | 0.000 | 0.000 | 1.259 | 201.333 | 0.018 | n/a | 0.162 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-59/journal/page | none observed |
| 77eb862a914b8ed80000000000000013 | 202.507 | 0.000 | n/a | 0.000 | 0.000 | 1.098 | 201.114 | 0.021 | n/a | 0.173 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 204.054 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.190 | 202.259 | 0.078 | n/a | 0.167 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 |
| p99 | 217.497 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.264 | 216.064 | 0.350 | n/a | 0.294 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77eb862a914b8ed80000000000000021 | 217.497 | 0.000 | n/a | 0.000 | 0.000 | 1.044 | 216.064 | 0.078 | n/a | 0.167 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-61/journal/page | none observed |
| 77eb862a914b8ed80000000000000023 | 204.866 | 0.000 | n/a | 0.000 | 0.000 | 1.190 | 203.159 | 0.099 | n/a | 0.259 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-48/journal/page | none observed |
| 77eb862a914b8ed80000000000000022 | 204.054 | 0.000 | n/a | 0.000 | 0.000 | 1.206 | 202.259 | 0.070 | n/a | 0.294 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-59/journal/page | none observed |
| 77eb862a914b8ed80000000000000020 | 134.102 | 0.000 | n/a | 0.000 | 0.000 | 1.264 | 132.264 | 0.350 | n/a | 0.041 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.701 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.143 | 201.532 | 0.028 | n/a | 0.172 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 |
| p99 | 209.813 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 8.657 | 207.933 | 17.800 | n/a | 0.511 | 0.000 | n/a | n/a | 0.271 | 0.000 | 0.000 | 0.271 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77eb862a914b8ed8000000000000002c | 209.813 | 0.000 | n/a | 0.000 | 0.000 | 1.528 | 207.933 | 0.025 | n/a | 0.172 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-42/journal/page | none observed |
| 77eb862a914b8ed80000000000000025 | 208.075 | 0.000 | n/a | 0.000 | 0.000 | 3.246 | 204.532 | 0.025 | n/a | 0.156 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-47/journal/page | none observed |
| 77eb862a914b8ed80000000000000026 | 204.750 | 0.000 | n/a | 0.000 | 0.000 | 0.827 | 203.619 | 0.028 | n/a | 0.161 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-49/journal/page | none observed |
| 77eb862a914b8ed80000000000000028 | 203.992 | 0.000 | n/a | 0.000 | 0.000 | 0.973 | 202.390 | 0.146 | n/a | 0.356 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-45/journal/page | none observed |
| 77eb862a914b8ed8000000000000002e | 203.143 | 0.000 | n/a | 0.000 | 0.000 | 1.143 | 201.532 | 0.038 | n/a | 0.159 | 0.000 | n/a | n/a | 0.271 | 0.000 | 0.000 | 0.271 | gw-r/thread-49/journal/page | none observed |
| 77eb862a914b8ed8000000000000002a | 202.701 | 0.000 | n/a | 0.000 | 0.000 | 0.646 | 201.737 | 0.023 | n/a | 0.180 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 77eb862a914b8ed8000000000000002d | 202.521 | 0.000 | n/a | 0.000 | 0.000 | 0.918 | 201.331 | 0.021 | n/a | 0.128 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-61/journal/page | none observed |
| 77eb862a914b8ed80000000000000024 | 183.720 | 0.000 | n/a | 0.000 | 0.000 | 8.657 | 156.842 | 17.800 | n/a | 0.217 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-46/journal/page | none observed |
| 77eb862a914b8ed80000000000000027 | 118.531 | 0.000 | n/a | 0.000 | 0.000 | 2.657 | 98.361 | 16.833 | n/a | 0.511 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-59/journal/page | none observed |
| 77eb862a914b8ed80000000000000029 | 73.862 | 0.000 | n/a | 0.000 | 0.000 | 1.590 | 61.818 | 10.060 | n/a | 0.212 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-60/journal/page | none observed |

## P3 / L256 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.915 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.397 | 201.213 | 0.066 | n/a | 0.153 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 |
| p99 | 206.688 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.299 | 204.548 | 29.452 | n/a | 0.271 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77eb862a914b8ed80000000000000031 | 206.688 | 0.000 | n/a | 0.000 | 0.000 | 1.733 | 204.548 | 0.027 | n/a | 0.193 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-61/journal/page | none observed |
| 77eb862a914b8ed80000000000000038 | 206.125 | 0.000 | n/a | 0.000 | 0.000 | 1.193 | 204.530 | 0.024 | n/a | 0.242 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-44/journal/page | none observed |
| 77eb862a914b8ed80000000000000035 | 205.271 | 0.000 | n/a | 0.000 | 0.000 | 2.961 | 201.730 | 0.066 | n/a | 0.271 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 | gw-r/thread-48/journal/page | none observed |
| 77eb862a914b8ed80000000000000032 | 205.045 | 0.000 | n/a | 0.000 | 0.000 | 3.299 | 201.407 | 0.031 | n/a | 0.181 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-44/journal/page | none observed |
| 77eb862a914b8ed80000000000000033 | 203.846 | 0.000 | n/a | 0.000 | 0.000 | 1.397 | 202.142 | 0.025 | n/a | 0.153 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-45/journal/page | none observed |
| 77eb862a914b8ed80000000000000036 | 202.915 | 0.000 | n/a | 0.000 | 0.000 | 1.272 | 201.213 | 0.017 | n/a | 0.206 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-47/journal/page | none observed |
| 77eb862a914b8ed80000000000000030 | 162.390 | 0.000 | n/a | 0.000 | 0.000 | 1.479 | 153.075 | 7.632 | n/a | 0.034 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-48/journal/page | none observed |
| 77eb862a914b8ed8000000000000003a | 145.518 | 0.000 | n/a | 0.000 | 0.000 | 0.898 | 141.032 | 3.407 | n/a | 0.040 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-45/journal/page | none observed |
| 77eb862a914b8ed80000000000000039 | 119.569 | 0.000 | n/a | 0.000 | 0.000 | 0.697 | 89.267 | 29.452 | n/a | 0.031 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-49/journal/page | none observed |
| 77eb862a914b8ed8000000000000002f | 97.522 | 0.000 | n/a | 0.000 | 0.000 | 1.638 | 83.479 | 12.159 | n/a | 0.056 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-60/journal/page | none observed |
| 77eb862a914b8ed80000000000000034 | 88.488 | 0.000 | n/a | 0.000 | 0.000 | 1.051 | 83.129 | 4.099 | n/a | 0.032 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-59/journal/page | none observed |

## P3 / L1024 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.414 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.173 | 201.480 | 0.026 | n/a | 0.137 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 |
| p99 | 208.049 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.631 | 204.715 | 0.084 | n/a | 0.454 | 0.000 | n/a | n/a | 52.450 | 0.000 | 0.000 | 52.450 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77eb862a914b8ed8000000000000003c | 208.049 | 0.000 | n/a | 0.000 | 0.000 | 3.631 | 203.256 | 0.084 | n/a | 0.454 | 0.000 | n/a | n/a | 0.625 | 0.000 | 0.000 | 0.625 | gw-r/thread-46/journal/page | none observed |
| 77eb862a914b8ed80000000000000041 | 206.128 | 0.000 | n/a | 0.000 | 0.000 | 0.995 | 204.715 | 0.069 | n/a | 0.137 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-61/journal/page | none observed |
| 77eb862a914b8ed8000000000000003e | 203.713 | 0.000 | n/a | 0.000 | 0.000 | 1.919 | 201.480 | 0.027 | n/a | 0.164 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-49/journal/page | none observed |
| 77eb862a914b8ed8000000000000003d | 203.657 | 0.000 | n/a | 0.000 | 0.000 | 1.812 | 201.558 | 0.019 | n/a | 0.131 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-44/journal/page | none observed |
| 77eb862a914b8ed80000000000000043 | 203.440 | 0.000 | n/a | 0.000 | 0.000 | 1.216 | 201.235 | 0.026 | n/a | 0.165 | 0.000 | n/a | n/a | 0.799 | 0.000 | 0.000 | 0.799 | gw-r/thread-48/journal/page | none observed |
| 77eb862a914b8ed8000000000000003b | 203.414 | 0.000 | n/a | 0.000 | 0.000 | 1.085 | 202.014 | 0.025 | n/a | 0.157 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-48/journal/page | none observed |
| 77eb862a914b8ed80000000000000040 | 203.268 | 0.000 | n/a | 0.000 | 0.000 | 1.173 | 201.597 | 0.063 | n/a | 0.265 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-60/journal/page | none observed |
| 77eb862a914b8ed80000000000000042 | 202.371 | 0.000 | n/a | 0.000 | 0.000 | 1.041 | 201.034 | 0.020 | n/a | 0.131 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-45/journal/page | none observed |
| 77eb862a914b8ed8000000000000003f | 134.673 | 0.000 | n/a | 0.000 | 0.000 | 1.297 | 132.983 | 0.027 | n/a | 0.118 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-42/journal/page | none observed |
| 77eb862a914b8ed80000000000000044 | 52.909 | 0.000 | n/a | 0.000 | 0.000 | 0.459 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 52.450 | 0.000 | 0.000 | 52.450 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / recovery / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.215 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.960 | 201.003 | 0.021 | n/a | 0.127 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 |
| p99 | 205.814 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.928 | 204.580 | 0.079 | n/a | 0.206 | 0.000 | n/a | n/a | 51.115 | 0.000 | 0.000 | 51.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77eb862a914b8ed80000000000000045 | 205.814 | 0.000 | n/a | 0.000 | 0.000 | 0.908 | 204.580 | 0.021 | n/a | 0.127 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-61/journal/page | none observed |
| 77eb862a914b8ed8000000000000004e | 203.760 | 0.000 | n/a | 0.000 | 0.000 | 1.928 | 201.385 | 0.046 | n/a | 0.179 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-59/journal/page | none observed |
| 77eb862a914b8ed80000000000000048 | 203.021 | 0.000 | n/a | 0.000 | 0.000 | 1.035 | 201.567 | 0.021 | n/a | 0.206 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-45/journal/page | none observed |
| 77eb862a914b8ed80000000000000046 | 202.961 | 0.000 | n/a | 0.000 | 0.000 | 1.263 | 201.372 | 0.021 | n/a | 0.141 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-44/journal/page | none observed |
| 77eb862a914b8ed8000000000000004c | 202.905 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 201.759 | 0.079 | n/a | 0.179 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-42/journal/page | none observed |
| 77eb862a914b8ed8000000000000004b | 202.215 | 0.000 | n/a | 0.000 | 0.000 | 0.960 | 200.961 | 0.018 | n/a | 0.153 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-44/journal/page | none observed |
| 77eb862a914b8ed80000000000000047 | 202.175 | 0.000 | n/a | 0.000 | 0.000 | 0.893 | 201.003 | 0.019 | n/a | 0.121 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-49/journal/page | none observed |
| 77eb862a914b8ed8000000000000004a | 199.598 | 0.000 | n/a | 0.000 | 0.000 | 1.718 | 197.474 | 0.024 | n/a | 0.102 | 0.000 | n/a | n/a | 0.281 | 0.000 | 0.000 | 0.281 | gw-r/thread-46/journal/page | none observed |
| 77eb862a914b8ed80000000000000049 | 138.539 | 0.000 | n/a | 0.000 | 0.000 | 1.416 | 136.820 | 0.024 | n/a | 0.095 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-59/journal/page | none observed |
| 77eb862a914b8ed8000000000000004f | 51.491 | 0.000 | n/a | 0.000 | 0.000 | 0.377 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.115 | 0.000 | 0.000 | 51.115 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / p4mix / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.754 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.022 | 201.186 | 0.023 | n/a | 0.123 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 |
| p99 | 215.167 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.289 | 214.173 | 6.171 | n/a | 0.225 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77eb862a914b8ed80000000000000052 | 215.167 | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 214.173 | 0.016 | n/a | 0.115 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-44/journal/page | none observed |
| 77eb862a914b8ed80000000000000057 | 205.112 | 0.000 | n/a | 0.000 | 0.000 | 1.195 | 203.379 | 0.085 | n/a | 0.225 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-48/journal/page | none observed |
| 77eb862a914b8ed80000000000000053 | 204.189 | 0.000 | n/a | 0.000 | 0.000 | 2.289 | 201.565 | 0.047 | n/a | 0.189 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-42/journal/page | none observed |
| 77eb862a914b8ed80000000000000050 | 204.083 | 0.000 | n/a | 0.000 | 0.000 | 0.899 | 202.808 | 0.062 | n/a | 0.177 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-46/journal/page | none observed |
| 77eb862a914b8ed80000000000000055 | 202.772 | 0.000 | n/a | 0.000 | 0.000 | 1.286 | 201.138 | 0.033 | n/a | 0.123 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-45/journal/page | none observed |
| 77eb862a914b8ed80000000000000056 | 202.754 | 0.000 | n/a | 0.000 | 0.000 | 1.276 | 201.237 | 0.015 | n/a | 0.105 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-60/journal/page | none observed |
| 77eb862a914b8ed80000000000000058 | 202.474 | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 201.186 | 0.023 | n/a | 0.140 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-49/journal/page | none observed |
| 77eb862a914b8ed80000000000000051 | 202.387 | 0.000 | n/a | 0.000 | 0.000 | 1.006 | 201.093 | 0.021 | n/a | 0.123 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-62/journal/page | none observed |
| 77eb862a914b8ed80000000000000059 | 88.810 | 0.000 | n/a | 0.000 | 0.000 | 1.022 | 81.262 | 6.171 | n/a | 0.223 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-46/journal/page | none observed |
| 77eb862a914b8ed80000000000000054 | 69.945 | 0.000 | n/a | 0.000 | 0.000 | 1.156 | 68.528 | 0.012 | n/a | 0.023 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-47/journal/page | none observed |

## P3 / p4h1 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.372 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.493 | 201.136 | 0.017 | n/a | 0.126 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 |
| p99 | 207.391 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.293 | 205.184 | 0.069 | n/a | 0.206 | 0.000 | n/a | n/a | 0.260 | 0.000 | 0.000 | 0.260 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77eb862a914b8ed8000000000000006b | 207.391 | 0.000 | n/a | 0.000 | 0.000 | 2.337 | 204.776 | 0.019 | n/a | 0.112 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-59/journal/page | none observed |
| 77eb862a914b8ed8000000000000006a | 207.077 | 0.000 | n/a | 0.000 | 0.000 | 4.293 | 202.388 | 0.024 | n/a | 0.160 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-61/journal/page | none observed |
| 77eb862a914b8ed80000000000000061 | 206.852 | 0.000 | n/a | 0.000 | 0.000 | 1.374 | 205.184 | 0.014 | n/a | 0.154 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-42/journal/page | none observed |
| 77eb862a914b8ed80000000000000064 | 205.556 | 0.000 | n/a | 0.000 | 0.000 | 4.055 | 201.144 | 0.016 | n/a | 0.126 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-47/journal/page | none observed |
| 77eb862a914b8ed80000000000000069 | 203.598 | 0.000 | n/a | 0.000 | 0.000 | 1.735 | 201.605 | 0.014 | n/a | 0.136 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-42/journal/page | none observed |
| 77eb862a914b8ed80000000000000060 | 203.372 | 0.000 | n/a | 0.000 | 0.000 | 1.820 | 201.136 | 0.026 | n/a | 0.130 | 0.000 | n/a | n/a | 0.260 | 0.000 | 0.000 | 0.260 | gw-r/thread-62/journal/page | none observed |
| 77eb862a914b8ed80000000000000066 | 202.911 | 0.000 | n/a | 0.000 | 0.000 | 1.467 | 201.130 | 0.013 | n/a | 0.102 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-62/journal/page | none observed |
| 77eb862a914b8ed80000000000000062 | 202.849 | 0.000 | n/a | 0.000 | 0.000 | 1.493 | 201.081 | 0.014 | n/a | 0.117 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-61/journal/page | none observed |
| 77eb862a914b8ed80000000000000065 | 202.438 | 0.000 | n/a | 0.000 | 0.000 | 1.186 | 200.952 | 0.017 | n/a | 0.111 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-46/journal/page | none observed |
| 77eb862a914b8ed80000000000000067 | 202.244 | 0.000 | n/a | 0.000 | 0.000 | 1.067 | 200.867 | 0.018 | n/a | 0.111 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-60/journal/page | none observed |
| 77eb862a914b8ed80000000000000063 | 138.123 | 0.000 | n/a | 0.000 | 0.000 | 0.926 | 136.720 | 0.069 | n/a | 0.206 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-45/journal/page | none observed |

## P3 / grow3 / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.181 | 200.952 | 0.043 | n/a | 0.109 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 |
| p99 | 344.198 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.332 | 201.294 | 256.028 | n/a | 0.176 | 0.000 | n/a | n/a | 0.642 | 0.000 | 0.000 | 0.642 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77eb862a914b8ed80000000000000073 | 344.198 | 0.000 | n/a | 0.000 | 0.000 | 0.906 | 86.582 | 256.028 | n/a | 0.040 | 0.000 | n/a | n/a | 0.642 | 0.000 | 0.000 | 0.642 | gw-r/thread-59/gateway.admission-wait | none observed |
| 77eb862a914b8ed80000000000000072 | 203.710 | 0.000 | n/a | 0.000 | 0.000 | 2.332 | 201.089 | 0.016 | n/a | 0.124 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-61/journal/page | none observed |
| 77eb862a914b8ed80000000000000071 | 203.273 | 0.000 | n/a | 0.000 | 0.000 | 1.610 | 201.294 | 0.043 | n/a | 0.176 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-42/journal/page | none observed |
| 77eb862a914b8ed8000000000000006d | 203.010 | 0.000 | n/a | 0.000 | 0.000 | 1.479 | 201.231 | 0.015 | n/a | 0.174 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |
| 77eb862a914b8ed80000000000000070 | 202.382 | 0.000 | n/a | 0.000 | 0.000 | 1.178 | 200.952 | 0.016 | n/a | 0.109 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-60/journal/page | none observed |
| 77eb862a914b8ed8000000000000006f | 103.921 | 0.000 | n/a | 0.000 | 0.000 | 0.649 | 101.237 | 1.864 | n/a | 0.039 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-49/journal/page | none observed |
| 77eb862a914b8ed8000000000000006e | 94.147 | 0.000 | n/a | 0.000 | 0.000 | 1.181 | 88.498 | 4.184 | n/a | 0.073 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-46/journal/page | none observed |

## P3 / p4h3 / read (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.643 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.060 | 201.097 | 0.031 | n/a | 0.114 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 |
| p99 | 206.900 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.024 | 205.277 | 6.345 | n/a | 0.183 | 0.000 | n/a | n/a | 49.820 | 0.000 | 0.000 | 49.820 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77eb862a914b8ed8000000000000008f | 206.900 | 0.000 | n/a | 0.000 | 0.000 | 1.299 | 205.277 | 0.043 | n/a | 0.156 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-60/journal/page | none observed |
| 77eb862a914b8ed80000000000000089 | 204.019 | 0.000 | n/a | 0.000 | 0.000 | 2.024 | 201.527 | 0.043 | n/a | 0.181 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-48/journal/page | none observed |
| 77eb862a914b8ed8000000000000008c | 203.521 | 0.000 | n/a | 0.000 | 0.000 | 0.634 | 202.645 | 0.027 | n/a | 0.109 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 77eb862a914b8ed8000000000000007e | 203.383 | 0.000 | n/a | 0.000 | 0.000 | 0.610 | 202.504 | 0.030 | n/a | 0.131 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-62/journal/page | none observed |
| 77eb862a914b8ed80000000000000083 | 203.152 | 0.000 | n/a | 0.000 | 0.000 | 1.674 | 201.085 | 0.031 | n/a | 0.183 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-44/journal/page | none observed |
| 77eb862a914b8ed8000000000000008d | 202.939 | 0.000 | n/a | 0.000 | 0.000 | 1.294 | 201.284 | 0.031 | n/a | 0.140 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-61/journal/page | none observed |
| 77eb862a914b8ed8000000000000008a | 202.768 | 0.000 | n/a | 0.000 | 0.000 | 0.972 | 201.440 | 0.057 | n/a | 0.181 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-42/journal/page | none observed |
| 77eb862a914b8ed80000000000000081 | 202.643 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 201.521 | 0.024 | n/a | 0.122 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-47/journal/page | none observed |
| 77eb862a914b8ed80000000000000084 | 201.958 | 0.000 | n/a | 0.000 | 0.000 | 0.596 | 201.097 | 0.017 | n/a | 0.114 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-42/journal/page | none observed |
| 77eb862a914b8ed80000000000000080 | 104.930 | 0.000 | n/a | 0.000 | 0.000 | 1.252 | 103.377 | 0.043 | n/a | 0.031 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-49/journal/page | none observed |
| 77eb862a914b8ed80000000000000082 | 99.136 | 0.000 | n/a | 0.000 | 0.000 | 1.948 | 90.478 | 6.345 | n/a | 0.081 | 0.000 | n/a | n/a | 0.284 | 0.000 | 0.000 | 0.284 | gw-r/thread-59/journal/page | none observed |
| 77eb862a914b8ed8000000000000008e | 83.079 | 0.000 | n/a | 0.000 | 0.000 | 1.060 | 81.800 | 0.012 | n/a | 0.055 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-49/journal/page | none observed |
| 77eb862a914b8ed8000000000000007f | 72.440 | 0.000 | n/a | 0.000 | 0.000 | 1.204 | 67.227 | 3.639 | n/a | 0.106 | 0.000 | n/a | n/a | 0.265 | 0.000 | 0.000 | 0.265 | gw-r/thread-46/journal/page | none observed |
| 77eb862a914b8ed80000000000000085 | 50.427 | 0.000 | n/a | 0.000 | 0.000 | 0.607 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 49.820 | 0.000 | 0.000 | 49.820 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / grow10 / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 106.994 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.973 | 105.250 | 0.016 | n/a | 0.076 | 0.000 | n/a | n/a | 0.325 | 0.000 | 0.000 | 0.325 |
| p99 | 463.971 | n/a | n/a | n/a | 0.874 | n/a | 0.000 | 0.000 | 1.943 | 178.924 | 281.889 | n/a | 0.145 | 0.000 | n/a | n/a | 0.601 | 0.874 | 0.008 | 0.601 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77eb862a914b8ed80000000000000090 | 463.971 | 0.855 | n/a | 0.000 | 0.000 | 1.943 | 178.924 | 281.889 | n/a | 0.034 | 0.000 | n/a | n/a | 0.325 | 0.855 | 0.002 | 0.325 | gw-r/thread-59/gateway.admission-wait | none observed |
| 77eb862a914b8ed80000000000000095 | 111.590 | 0.874 | n/a | 0.000 | 0.000 | 1.267 | 109.195 | 0.016 | n/a | 0.076 | 0.000 | n/a | n/a | 0.160 | 0.874 | 0.008 | 0.160 | gw-r/thread-61/journal/page | none observed |
| 77eb862a914b8ed80000000000000096 | 106.994 | 0.000 | n/a | 0.000 | 0.000 | 0.973 | 105.250 | 0.024 | n/a | 0.145 | 0.000 | n/a | n/a | 0.601 | 0.000 | 0.000 | 0.601 | gw-r/thread-60/journal/page | none observed |
| 77eb862a914b8ed80000000000000097 | 55.411 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 53.802 | 0.013 | n/a | 0.078 | 0.000 | n/a | n/a | 0.549 | 0.000 | 0.000 | 0.549 | gw-r/thread-47/journal/page | none observed |

## P3 / p4h10 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.946 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.032 | 200.865 | 0.022 | n/a | 0.101 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 205.573 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.666 | 204.295 | 2.123 | n/a | 2.292 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77eb862a914b8ed800000000000000b1 | 205.573 | 0.000 | n/a | 0.000 | 0.000 | 1.032 | 204.295 | 0.015 | n/a | 0.101 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-42/journal/page | none observed |
| 77eb862a914b8ed800000000000000aa | 202.570 | 0.000 | n/a | 0.000 | 0.000 | 0.862 | 201.395 | 0.037 | n/a | 0.166 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-49/journal/page | none observed |
| 77eb862a914b8ed800000000000000a7 | 202.291 | 0.000 | n/a | 0.000 | 0.000 | 1.116 | 200.886 | 0.017 | n/a | 0.107 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-44/journal/page | none observed |
| 77eb862a914b8ed800000000000000ad | 202.170 | 0.000 | n/a | 0.000 | 0.000 | 1.058 | 200.865 | 0.014 | n/a | 0.099 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-61/journal/page | none observed |
| 77eb862a914b8ed800000000000000af | 202.163 | 0.000 | n/a | 0.000 | 0.000 | 0.631 | 201.219 | 0.041 | n/a | 0.141 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-60/journal/page | none observed |
| 77eb862a914b8ed800000000000000b2 | 202.122 | 0.000 | n/a | 0.000 | 0.000 | 0.895 | 201.006 | 0.019 | n/a | 0.085 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-49/journal/page | none observed |
| 77eb862a914b8ed800000000000000ac | 201.946 | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 200.865 | 0.014 | n/a | 0.113 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-48/journal/page | none observed |
| 77eb862a914b8ed800000000000000ae | 201.908 | 0.000 | n/a | 0.000 | 0.000 | 0.782 | 200.897 | 0.022 | n/a | 0.089 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-44/journal/page | none observed |
| 77eb862a914b8ed800000000000000a8 | 191.022 | 0.000 | n/a | 0.000 | 0.000 | 2.666 | 186.002 | 2.123 | n/a | 0.065 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-60/journal/page | none observed |
| 77eb862a914b8ed800000000000000b0 | 107.327 | 0.000 | n/a | 0.000 | 0.000 | 1.162 | 103.730 | 2.112 | n/a | 0.096 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-45/journal/page | none observed |
| 77eb862a914b8ed800000000000000ab | 87.012 | 0.000 | n/a | 0.000 | 0.000 | 1.162 | 83.199 | 0.190 | n/a | 2.292 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-47/journal/page | none observed |
| 77eb862a914b8ed800000000000000b3 | 85.713 | 0.000 | n/a | 0.000 | 0.000 | 1.116 | 82.182 | 0.296 | n/a | 1.954 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-47/journal/page | none observed |

## P3 / presweep / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.371 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.158 | 201.170 | 0.035 | n/a | 0.123 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 |
| p99 | 207.026 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.091 | 205.224 | 27.269 | n/a | 0.163 | 0.000 | n/a | n/a | 0.385 | 0.000 | 0.000 | 0.385 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77eb862a914b8ed800000000000000b4 | 207.026 | 0.000 | n/a | 0.000 | 0.000 | 1.464 | 205.224 | 0.035 | n/a | 0.163 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-46/journal/page | none observed |
| 77eb862a914b8ed800000000000000be | 205.277 | 0.000 | n/a | 0.000 | 0.000 | 1.444 | 203.268 | 0.031 | n/a | 0.149 | 0.000 | n/a | n/a | 0.385 | 0.000 | 0.000 | 0.385 | gw-r/thread-61/journal/page | none observed |
| 77eb862a914b8ed800000000000000bd | 204.433 | 0.000 | n/a | 0.000 | 0.000 | 2.042 | 201.956 | 0.043 | n/a | 0.140 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 | gw-r/thread-47/journal/page | none observed |
| 77eb862a914b8ed800000000000000b5 | 203.246 | 0.000 | n/a | 0.000 | 0.000 | 1.568 | 201.297 | 0.043 | n/a | 0.153 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-62/journal/page | none observed |
| 77eb862a914b8ed800000000000000b7 | 203.027 | 0.000 | n/a | 0.000 | 0.000 | 1.158 | 201.505 | 0.063 | n/a | 0.120 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-47/journal/page | none observed |
| 77eb862a914b8ed800000000000000b8 | 202.371 | 0.000 | n/a | 0.000 | 0.000 | 0.943 | 201.170 | 0.014 | n/a | 0.104 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-61/journal/page | none observed |
| 77eb862a914b8ed800000000000000b9 | 202.238 | 0.000 | n/a | 0.000 | 0.000 | 0.803 | 201.132 | 0.012 | n/a | 0.117 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-44/journal/page | none observed |
| 77eb862a914b8ed800000000000000bb | 202.162 | 0.000 | n/a | 0.000 | 0.000 | 0.884 | 200.919 | 0.025 | n/a | 0.119 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-62/journal/page | none observed |
| 77eb862a914b8ed800000000000000bf | 122.792 | 0.000 | n/a | 0.000 | 0.000 | 1.054 | 117.222 | 4.248 | n/a | 0.123 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-49/journal/page | none observed |
| 77eb862a914b8ed800000000000000bc | 108.219 | 0.000 | n/a | 0.000 | 0.000 | 3.091 | 77.563 | 27.269 | n/a | 0.160 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-59/journal/page | none observed |

## P3 / sweep / read (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 168.396 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 9.536 | 0.872 | 0.050 | n/a | 0.000 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 |
| p99 | 215.157 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 35.645 | 205.307 | 131.488 | n/a | 0.116 | 0.000 | n/a | n/a | 0.391 | 0.000 | 0.000 | 0.391 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77eb862a914b8ed800000000000000c7 | 215.157 | 0.000 | n/a | 0.000 | 0.000 | 9.536 | 205.307 | 0.050 | n/a | 0.116 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-46/journal/page | none observed |
| 77eb862a914b8ed800000000000000c6 | 168.396 | 0.000 | n/a | 0.000 | 0.000 | 35.645 | 0.872 | 131.488 | n/a | 0.000 | 0.000 | n/a | n/a | 0.391 | 0.000 | 0.000 | 0.391 | gw-r/thread-49/gateway.admission-wait | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
