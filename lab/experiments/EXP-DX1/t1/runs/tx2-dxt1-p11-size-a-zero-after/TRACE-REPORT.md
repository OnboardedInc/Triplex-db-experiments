# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.subject` (87.426 ms, trace `35a94b370f22d0800000000000001122`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (69.193 ms, trace `35a94b370f22d0800000000000000129`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (27.425 ms, trace `35a94b370f22d08000000000000001b3`); `tx/thread-86/transactor.triplex-function` (23.263 ms, trace `35a94b370f22d080000000000000111f`); `node-14/thread-0/driver.queue.subject` (37.835 ms, trace `35a94b370f22d08000000000000010c3`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p11-size-a-zero-after`; source `f9a84dcb52993e2ceff0210533d12e885ceb6d0d`; subjects 10000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3623/3625 (99.945%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3625/3625. Raw trace bytes: 32364965.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 14015 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13367.532 | 260.252 | 7.683 | 282 |
| L1 | 0 | 41760.780 | 758.842 | 29.707 | 924 |
| L4 | 0 | 44817.140 | 919.034 | 24.464 | 1214 |
| L16 | 0 | 43047.566 | 8661.856 | 77.107 | 33621 |
| L64 | 0 | 44653.836 | 8848.541 | 94.363 | 35373 |
| L256 | 0 | 44121.815 | 931.690 | 19.419 | 1010 |
| L1024 | 0 | 42325.120 | 1100.040 | 30.828 | 1050 |
| tail | 0 | 13478.567 | 346.683 | 4.654 | 322 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 35a94b370f22d0800000000000001122 | driver.queue.subject | 87.426 | 35a94b370f22d080000000000000111f | 3 / 32 |
| 35a94b370f22d0800000000000001122 | driver.queue.scheduler-late | 1.001 | none | 3 / 32 |
| 35a94b370f22d0800000000000001122 | driver.queue.scheduler-dispatch | 0.118 | none | 1 / 32 |

Observed active steps while trace 35a94b370f22d0800000000000001122 waited: [{"at":1794828866938.7473,"inFlight":3,"capacity":32,"active":[{"traceId":"35a94b370f22d080000000000000111f","step":"client.http"},{"traceId":"35a94b370f22d0800000000000001126","step":"client.http"},{"traceId":"35a94b370f22d0800000000000001128","step":"client.http"}]},{"at":1794828866959.0625,"inFlight":4,"capacity":32,"active":[{"traceId":"35a94b370f22d080000000000000111f","step":"triplex.transact"},{"traceId":"35a94b370f22d0800000000000001126","step":"client.http"},{"traceId":"35a94b370f22d0800000000000001128","step":"client.http"},{"traceId":"35a94b370f22d0800000000000001129","step":"client.http"}]},{"at":1794828866978.95,"inFlight":2,"capacity":32,"active":[{"traceId":"35a94b370f22d080000000000000111f","step":"client.http"},{"traceId":"35a94b370f22d0800000000000001129","step":"client.http"}]}]

| 35a94b370f22d0800000000000000129 | driver.queue.scheduler-dispatch | 0.065 | none | 0 / 32 |
| 35a94b370f22d0800000000000000129 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 35a94b370f22d0800000000000000129 waited: []

| 35a94b370f22d08000000000000001b3 | driver.queue.scheduler-dispatch | 0.076 | none | 0 / 32 |
| 35a94b370f22d08000000000000001b3 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 35a94b370f22d08000000000000001b3 waited: []

| 35a94b370f22d080000000000000111f | driver.queue.scheduler-dispatch | 0.035 | none | 2 / 32 |
| 35a94b370f22d080000000000000111f | driver.queue.scheduler-late | 0.001 | none | 2 / 32 |

Observed active steps while trace 35a94b370f22d080000000000000111f waited: []

| 35a94b370f22d08000000000000010c3 | driver.queue.subject | 37.835 | 35a94b370f22d08000000000000010c2 | 1 / 32 |
| 35a94b370f22d08000000000000010c3 | driver.queue.scheduler-dispatch | 0.142 | none | 0 / 32 |
| 35a94b370f22d08000000000000010c3 | driver.queue.scheduler-late | 0.001 | none | 1 / 32 |

Observed active steps while trace 35a94b370f22d08000000000000010c3 waited: [{"at":1794828866108.9236,"inFlight":1,"capacity":32,"active":[{"traceId":"35a94b370f22d08000000000000010c2","step":"client.http"}]}]

## P2 / warmup / commit (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.656 | 0.997 | 0.000 | 0.876 | 2.928 | n/a | 0.000 | 0.086 | 0.965 | 2.056 | 0.022 | 0.000 | 0.486 | 9.662 | 4.485 | n/a | 0.032 | 3.423 | 0.170 | 0.032 |
| p99 | 72.298 | 5.543 | 0.000 | 5.278 | 14.712 | n/a | 2.202 | 3.074 | 4.297 | 8.532 | 0.076 | 0.000 | 2.162 | 30.647 | 13.327 | n/a | 0.242 | 19.249 | 0.348 | 0.242 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d08000000000000000f1 | 72.298 | 14.712 | n/a | 1.462 | 3.074 | 4.297 | 4.281 | 0.054 | 0.000 | 0.201 | 30.647 | 13.327 | n/a | 0.242 | 19.249 | 0.266 | 0.242 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| 35a94b370f22d08000000000000000f8 | 40.808 | 3.336 | n/a | 0.000 | 0.086 | 0.911 | 3.520 | 0.025 | 0.000 | 0.535 | 23.393 | 8.963 | n/a | 0.040 | 3.423 | 0.084 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000000fe | 37.325 | 7.684 | n/a | 1.809 | 0.129 | 1.896 | 8.532 | 0.048 | 0.000 | 0.862 | 9.662 | 6.635 | n/a | 0.069 | 9.622 | 0.258 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 35a94b370f22d080000000000000010e | 30.885 | 8.403 | n/a | 2.202 | 0.148 | 1.293 | 1.821 | 0.020 | 0.000 | 0.631 | 11.365 | 4.949 | n/a | 0.053 | 10.752 | 0.348 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000114 | 29.716 | 2.259 | n/a | 0.000 | 1.310 | 0.911 | 2.013 | 0.018 | 0.000 | 0.124 | 12.146 | 10.916 | n/a | 0.019 | 3.569 | 0.120 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000104 | 24.311 | 2.928 | n/a | 0.000 | 1.173 | 0.723 | 1.351 | 0.019 | 0.000 | 0.486 | 10.734 | 6.864 | n/a | 0.034 | 4.101 | 0.169 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000000f5 | 22.958 | 3.019 | n/a | 0.000 | 0.085 | 0.887 | 1.626 | 0.020 | 0.000 | 0.100 | 14.318 | 2.870 | n/a | 0.032 | 3.104 | 0.135 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| 35a94b370f22d0800000000000000102 | 21.656 | 4.745 | n/a | 1.661 | 0.081 | 0.879 | 6.088 | 0.022 | 0.000 | 0.582 | 6.357 | 1.211 | n/a | 0.029 | 6.487 | 0.300 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000000fc | 21.256 | 2.380 | n/a | 0.000 | 0.075 | 0.965 | 2.048 | 0.041 | 0.000 | 1.214 | 10.010 | 4.485 | n/a | 0.038 | 2.455 | 0.116 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 35a94b370f22d0800000000000000109 | 18.752 | 3.007 | n/a | 0.000 | 1.279 | 4.146 | 3.901 | 0.018 | 0.000 | 0.384 | 5.370 | 0.603 | n/a | 0.043 | 4.286 | 0.229 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d080000000000000011a | 18.460 | 2.577 | n/a | 0.000 | 0.061 | 0.983 | 2.056 | 0.056 | 0.000 | 0.320 | 7.609 | 4.771 | n/a | 0.027 | 2.638 | 0.143 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d080000000000000010b | 17.157 | 2.838 | n/a | 0.000 | 0.086 | 0.912 | 2.271 | 0.026 | 0.000 | 0.506 | 6.709 | 3.779 | n/a | 0.029 | 2.924 | 0.170 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000117 | 14.365 | 2.654 | n/a | 0.000 | 0.072 | 1.068 | 3.521 | 0.076 | 0.000 | 0.259 | 6.072 | 0.611 | n/a | 0.032 | 2.726 | 0.190 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000111 | 13.735 | 2.906 | n/a | 0.000 | 0.095 | 1.063 | 1.387 | 0.022 | 0.000 | 2.162 | 5.441 | 0.627 | n/a | 0.032 | 3.001 | 0.218 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.752 | 0.993 | 0.000 | 0.811 | 2.838 | n/a | 0.000 | 0.086 | 0.965 | 2.056 | 0.025 | 0.000 | 0.384 | 7.609 | 3.779 | n/a | 0.032 | 3.001 | 0.143 | 0.032 |
| p99 | 40.808 | 2.007 | 0.000 | 1.021 | 3.336 | n/a | 0.000 | 1.310 | 4.146 | 3.901 | 0.076 | 0.000 | 2.162 | 23.393 | 10.916 | n/a | 0.043 | 4.286 | 0.229 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d08000000000000000f8 | 40.808 | 3.336 | n/a | 0.000 | 0.086 | 0.911 | 3.520 | 0.025 | 0.000 | 0.535 | 23.393 | 8.963 | n/a | 0.040 | 3.423 | 0.084 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000114 | 29.716 | 2.259 | n/a | 0.000 | 1.310 | 0.911 | 2.013 | 0.018 | 0.000 | 0.124 | 12.146 | 10.916 | n/a | 0.019 | 3.569 | 0.120 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000000f5 | 22.958 | 3.019 | n/a | 0.000 | 0.085 | 0.887 | 1.626 | 0.020 | 0.000 | 0.100 | 14.318 | 2.870 | n/a | 0.032 | 3.104 | 0.135 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| 35a94b370f22d08000000000000000fc | 21.256 | 2.380 | n/a | 0.000 | 0.075 | 0.965 | 2.048 | 0.041 | 0.000 | 1.214 | 10.010 | 4.485 | n/a | 0.038 | 2.455 | 0.116 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 35a94b370f22d0800000000000000109 | 18.752 | 3.007 | n/a | 0.000 | 1.279 | 4.146 | 3.901 | 0.018 | 0.000 | 0.384 | 5.370 | 0.603 | n/a | 0.043 | 4.286 | 0.229 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d080000000000000011a | 18.460 | 2.577 | n/a | 0.000 | 0.061 | 0.983 | 2.056 | 0.056 | 0.000 | 0.320 | 7.609 | 4.771 | n/a | 0.027 | 2.638 | 0.143 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d080000000000000010b | 17.157 | 2.838 | n/a | 0.000 | 0.086 | 0.912 | 2.271 | 0.026 | 0.000 | 0.506 | 6.709 | 3.779 | n/a | 0.029 | 2.924 | 0.170 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000117 | 14.365 | 2.654 | n/a | 0.000 | 0.072 | 1.068 | 3.521 | 0.076 | 0.000 | 0.259 | 6.072 | 0.611 | n/a | 0.032 | 2.726 | 0.190 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000111 | 13.735 | 2.906 | n/a | 0.000 | 0.095 | 1.063 | 1.387 | 0.022 | 0.000 | 2.162 | 5.441 | 0.627 | n/a | 0.032 | 3.001 | 0.218 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (56 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 74.892 | n/a | n/a | n/a | 29.623 | 1.553 | 2.424 | 0.000 | 9.333 | 3.945 | 0.005 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.006 | 47.175 | 0.587 | 0.006 |
| p99 | 231.728 | n/a | n/a | n/a | 90.024 | 71.723 | 12.638 | 0.000 | 85.540 | 128.700 | 101.112 | 24.198 | 0.114 | 0.000 | n/a | n/a | 0.018 | 119.019 | 0.998 | 0.018 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d080000000000000112d | 231.728 | 37.497 | 7.598 | 2.270 | 0.000 | 10.087 | 128.700 | 45.559 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.010 | 47.364 | 0.204 | 0.010 | gw-r/thread-50/gateway.admitted-work | driver.reader-basis.broadcast 0.428ms; driver.reader-basis.broadcast 0.208ms; driver.publication.readback 0.190ms; driver.publication.readback 0.133ms; driver.publication.readback 0.111ms |
| 35a94b370f22d0800000000000001132 | 211.947 | 90.024 | 8.127 | 7.871 | 0.000 | 2.431 | 2.369 | 101.112 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.006 | 106.022 | 0.500 | 0.006 | gw-r/thread-45/gateway.admission-wait | driver.reader-basis.broadcast 0.428ms; driver.reader-basis.broadcast 0.208ms; driver.publication.readback 0.133ms; driver.publication.readback 0.111ms; driver.publication.readback 0.106ms |
| 35a94b370f22d0800000000000001133 | 175.334 | 43.074 | 71.723 | 4.223 | 0.000 | 9.276 | 2.144 | 44.883 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.005 | 119.019 | 0.679 | 0.005 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.428ms; driver.reader-basis.broadcast 0.208ms; driver.publication.readback 0.133ms; driver.publication.readback 0.111ms; driver.publication.readback 0.101ms |
| 35a94b370f22d080000000000000112c | 118.103 | 14.934 | 0.110 | 0.000 | 0.000 | 41.559 | 15.666 | 45.824 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.005 | 15.043 | 0.127 | 0.005 | gw-r/thread-47/gateway.admission-wait | driver.reader-basis.broadcast 0.208ms; driver.publication.readback 0.190ms; driver.publication.readback 0.088ms; driver.publication.readback 0.070ms; driver.publication.readback 0.068ms |
| 35a94b370f22d0800000000000001a65 | 116.761 | 23.842 | 0.281 | 2.195 | 0.000 | 81.102 | 9.315 | 0.004 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.010 | 26.318 | 0.225 | 0.010 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.675ms; driver.publication.readback 0.790ms; driver.reader-basis.broadcast 0.273ms; driver.reader-basis.broadcast 0.270ms; driver.publication.readback 0.088ms |
| 35a94b370f22d080000000000000112b | 114.032 | 59.159 | 0.302 | 6.875 | 0.000 | 0.682 | 46.988 | 0.005 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.006 | 66.337 | 0.582 | 0.006 | gw-r/thread-51/gateway.admitted-work | driver.reader-basis.broadcast 0.208ms; driver.publication.readback 0.190ms; driver.publication.readback 0.088ms; driver.publication.readback 0.070ms; driver.publication.readback 0.068ms |
| 35a94b370f22d08000000000000011b9 | 112.067 | 32.997 | 0.354 | 0.864 | 0.000 | 68.188 | 2.647 | 6.991 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.007 | 34.216 | 0.305 | 0.007 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.239ms; driver.publication.readback 0.238ms; driver.publication.readback 0.103ms; driver.publication.readback 0.065ms; driver.publication.readback 0.063ms |
| 35a94b370f22d08000000000000019ff | 108.637 | 27.959 | 4.504 | 2.424 | 0.000 | 58.441 | 3.592 | 11.698 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.010 | 34.887 | 0.321 | 0.010 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.428ms; driver.publication.readback 0.145ms; driver.publication.readback 0.097ms; driver.publication.readback 0.067ms; driver.publication.readback 0.054ms |
| 35a94b370f22d08000000000000019d6 | 106.096 | 72.230 | 21.632 | 7.251 | 0.000 | 0.872 | 4.083 | 0.005 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.004 | 101.114 | 0.953 | 0.004 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.286ms; driver.publication.readback 0.142ms; driver.publication.readback 0.081ms; driver.publication.readback 0.046ms; driver.publication.readback 0.046ms |
| 35a94b370f22d0800000000000001a61 | 104.522 | 46.120 | 0.288 | 5.285 | 0.000 | 49.591 | 3.226 | 0.002 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.007 | 51.693 | 0.495 | 0.007 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.675ms; driver.publication.readback 0.790ms; driver.reader-basis.broadcast 0.270ms; driver.publication.readback 0.121ms; driver.publication.readback 0.088ms |
| 35a94b370f22d0800000000000001178 | 103.693 | 16.590 | 0.633 | 0.000 | 0.000 | 85.540 | 0.920 | 0.002 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.006 | 17.223 | 0.166 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.184ms; driver.publication.readback 0.154ms; driver.publication.persist-deferred 0.119ms; driver.publication.readback 0.064ms; driver.publication.readback 0.055ms |
| 35a94b370f22d080000000000000117b | 100.263 | 16.231 | 0.081 | 0.000 | 0.000 | 83.235 | 0.708 | 0.002 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.002 | 16.312 | 0.163 | 0.002 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.184ms; driver.publication.readback 0.154ms; driver.publication.persist-deferred 0.119ms; driver.publication.readback 0.064ms; driver.publication.readback 0.055ms |
| 35a94b370f22d0800000000000001d31 | 99.838 | 32.280 | 0.462 | 5.755 | 0.000 | 3.502 | 57.818 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.011 | 38.496 | 0.386 | 0.011 | gw-r/thread-49/gateway.admitted-work | driver.reader-basis.broadcast 0.777ms; driver.publication.readback 0.077ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.031ms; driver.publication.persist-deferred 0.016ms |
| 35a94b370f22d0800000000000001a66 | 98.690 | 23.899 | 0.942 | 0.000 | 0.000 | 64.168 | 9.281 | 0.373 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.010 | 24.841 | 0.252 | 0.010 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.675ms; driver.publication.readback 0.790ms; driver.reader-basis.broadcast 0.270ms; driver.publication.readback 0.088ms; driver.publication.readback 0.068ms |
| 35a94b370f22d08000000000000019fe | 95.265 | 65.434 | 3.439 | 7.586 | 0.000 | 1.977 | 16.770 | 0.019 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.014 | 76.460 | 0.803 | 0.014 | node-14/thread-3/worker.gateway-observer.observe | driver.reader-basis.broadcast 0.428ms; driver.publication.readback 0.145ms; driver.publication.readback 0.067ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.041ms |
| 35a94b370f22d0800000000000000118 | 92.734 | 45.266 | 0.502 | 4.679 | 0.000 | 13.864 | 28.291 | 0.007 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.011 | 50.447 | 0.544 | 0.011 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.readback 0.153ms; driver.publication.persist-deferred 0.034ms; driver.reader-basis.broadcast 0.027ms |
| 35a94b370f22d080000000000000117a | 88.570 | 46.817 | 0.229 | 4.204 | 0.000 | 35.944 | 1.363 | 0.003 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.008 | 51.250 | 0.579 | 0.008 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.184ms; driver.publication.readback 0.154ms; driver.publication.persist-deferred 0.119ms; driver.publication.readback 0.064ms; driver.publication.readback 0.055ms |
| 35a94b370f22d0800000000000001181 | 88.312 | 15.989 | 69.297 | 0.000 | 0.000 | 0.595 | 2.353 | 0.010 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.006 | 85.286 | 0.966 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.184ms; driver.publication.readback 0.154ms; driver.publication.persist-deferred 0.119ms; driver.publication.readback 0.064ms; driver.publication.readback 0.044ms |
| 35a94b370f22d08000000000000011bd | 87.817 | 32.875 | 0.255 | 2.444 | 0.000 | 33.108 | 19.059 | 0.065 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.006 | 35.574 | 0.405 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.239ms; driver.publication.readback 0.238ms; driver.publication.readback 0.103ms; driver.publication.readback 0.065ms; driver.publication.readback 0.056ms |
| 35a94b370f22d080000000000000198e | 86.485 | 66.622 | 0.143 | 7.136 | 0.000 | 0.439 | 12.127 | 0.007 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.004 | 73.901 | 0.855 | 0.004 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.271ms; driver.publication.readback 0.148ms; driver.publication.readback 0.080ms; driver.publication.readback 0.061ms; driver.publication.readback 0.060ms |

## P2 / L1 / commit (46 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.241 | 0.702 | 0.000 | 0.687 | 3.128 | n/a | 0.000 | 0.073 | 1.008 | 2.089 | 0.023 | 0.000 | 0.410 | 9.033 | 4.081 | n/a | 0.031 | 3.386 | 0.163 | 0.031 |
| p99 | 97.202 | 2.303 | 0.013 | 3.438 | 11.121 | n/a | 2.673 | 12.122 | 4.892 | 31.919 | 0.161 | 0.000 | 4.041 | 69.193 | 14.682 | n/a | 0.070 | 14.952 | 0.539 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d0800000000000000129 | 97.202 | 4.284 | n/a | 0.000 | 0.067 | 0.848 | 7.714 | 0.022 | 0.000 | 0.364 | 69.193 | 14.682 | n/a | 0.027 | 4.351 | 0.045 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 35a94b370f22d0800000000000000126 | 48.725 | 5.898 | n/a | 0.000 | 0.050 | 4.892 | 31.919 | 0.161 | 0.000 | 0.692 | 2.850 | 2.235 | n/a | 0.028 | 5.947 | 0.122 | 0.028 | gw-w/thread-48/gateway.admitted-work | none observed |
| 35a94b370f22d0800000000000000171 | 33.658 | 6.487 | n/a | 0.000 | 0.104 | 0.802 | 1.848 | 0.019 | 0.000 | 0.120 | 16.252 | 7.968 | n/a | 0.057 | 6.591 | 0.196 | 0.057 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d080000000000000012f | 32.659 | 6.095 | n/a | 0.000 | 0.173 | 1.479 | 4.890 | 0.123 | 0.000 | 1.691 | 10.342 | 7.797 | n/a | 0.070 | 6.268 | 0.192 | 0.070 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d080000000000000017d | 31.723 | 4.359 | n/a | 2.178 | 0.075 | 1.516 | 2.599 | 0.019 | 0.000 | 1.011 | 8.039 | 11.899 | n/a | 0.028 | 6.612 | 0.208 | 0.028 | tx/thread-86/transactor.triplex-function | none observed |
| 35a94b370f22d0800000000000000123 | 31.291 | 2.394 | n/a | 0.000 | 0.054 | 0.738 | 8.352 | 0.029 | 0.000 | 0.094 | 14.892 | 4.713 | n/a | 0.025 | 2.448 | 0.078 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000157 | 31.048 | 11.121 | n/a | 2.673 | 0.141 | 1.113 | 8.251 | 0.023 | 0.000 | 0.097 | 6.188 | 1.375 | n/a | 0.066 | 13.935 | 0.449 | 0.066 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000135 | 29.867 | 4.845 | n/a | 0.000 | 0.142 | 1.525 | 1.410 | 0.024 | 0.000 | 0.137 | 12.266 | 9.451 | n/a | 0.066 | 4.988 | 0.167 | 0.066 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000155 | 29.576 | 2.719 | n/a | 0.000 | 0.068 | 1.135 | 7.680 | 0.048 | 0.000 | 0.585 | 10.155 | 7.153 | n/a | 0.032 | 2.788 | 0.094 | 0.032 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| 35a94b370f22d0800000000000000186 | 29.076 | 4.944 | n/a | 0.000 | 0.058 | 0.863 | 2.896 | 0.034 | 0.000 | 1.070 | 11.852 | 7.330 | n/a | 0.029 | 5.003 | 0.172 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 35a94b370f22d0800000000000000143 | 28.962 | 3.197 | n/a | 0.000 | 0.062 | 1.016 | 3.921 | 0.021 | 0.000 | 0.381 | 11.698 | 8.634 | n/a | 0.031 | 3.259 | 0.113 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d080000000000000014a | 28.649 | 3.457 | n/a | 0.000 | 0.375 | 0.860 | 1.376 | 0.019 | 0.000 | 0.414 | 15.261 | 6.867 | n/a | 0.021 | 3.832 | 0.134 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d080000000000000018b | 28.078 | 1.703 | n/a | 0.000 | 0.073 | 2.420 | 8.529 | 0.019 | 0.000 | 0.084 | 8.839 | 6.377 | n/a | 0.033 | 1.776 | 0.063 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000158 | 27.720 | 2.831 | n/a | 0.000 | 12.122 | 0.789 | 1.540 | 0.019 | 0.000 | 3.271 | 6.559 | 0.550 | n/a | 0.040 | 14.952 | 0.539 | 0.040 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.098ms; driver.publication.persist-deferred 0.048ms |
| 35a94b370f22d0800000000000000151 | 27.570 | 4.343 | n/a | 0.000 | 0.168 | 4.280 | 1.774 | 0.024 | 0.000 | 3.729 | 12.612 | 0.574 | n/a | 0.064 | 4.511 | 0.164 | 0.064 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000189 | 27.409 | 3.074 | n/a | 0.000 | 2.071 | 0.533 | 1.652 | 0.019 | 0.000 | 0.506 | 10.819 | 8.713 | n/a | 0.022 | 5.145 | 0.188 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| 35a94b370f22d080000000000000019d | 26.787 | 3.759 | n/a | 0.000 | 0.022 | 0.501 | 2.209 | 0.018 | 0.000 | 0.084 | 15.725 | 4.458 | n/a | 0.011 | 3.781 | 0.141 | 0.011 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.193ms; driver.publication.persist-deferred 0.016ms |
| 35a94b370f22d0800000000000000137 | 26.724 | 6.449 | n/a | 0.000 | 0.079 | 0.971 | 2.091 | 0.024 | 0.000 | 0.155 | 12.686 | 4.229 | n/a | 0.042 | 6.528 | 0.244 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000121 | 26.523 | 2.368 | n/a | 0.000 | 0.080 | 0.958 | 8.880 | 0.025 | 0.000 | 0.113 | 13.384 | 0.690 | n/a | 0.025 | 2.448 | 0.092 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000168 | 26.254 | 2.537 | n/a | 0.000 | 0.050 | 0.752 | 1.351 | 0.017 | 0.000 | 0.107 | 9.033 | 12.380 | n/a | 0.027 | 2.587 | 0.099 | 0.027 | tx/thread-86/transactor.triplex-function | none observed |

## P2 / L1 / commit / 5-10 facts (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.371 | 0.305 | 0.000 | 0.510 | 2.464 | n/a | 0.000 | 0.065 | 1.008 | 1.930 | 0.021 | 0.000 | 0.462 | 8.839 | 3.420 | n/a | 0.032 | 2.542 | 0.113 | 0.032 |
| p99 | 48.725 | 1.992 | 0.013 | 1.288 | 5.898 | n/a | 0.000 | 12.122 | 4.892 | 31.919 | 0.161 | 0.000 | 4.041 | 14.892 | 12.380 | n/a | 0.064 | 14.952 | 0.539 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d0800000000000000126 | 48.725 | 5.898 | n/a | 0.000 | 0.050 | 4.892 | 31.919 | 0.161 | 0.000 | 0.692 | 2.850 | 2.235 | n/a | 0.028 | 5.947 | 0.122 | 0.028 | gw-w/thread-48/gateway.admitted-work | none observed |
| 35a94b370f22d0800000000000000123 | 31.291 | 2.394 | n/a | 0.000 | 0.054 | 0.738 | 8.352 | 0.029 | 0.000 | 0.094 | 14.892 | 4.713 | n/a | 0.025 | 2.448 | 0.078 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000143 | 28.962 | 3.197 | n/a | 0.000 | 0.062 | 1.016 | 3.921 | 0.021 | 0.000 | 0.381 | 11.698 | 8.634 | n/a | 0.031 | 3.259 | 0.113 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d080000000000000018b | 28.078 | 1.703 | n/a | 0.000 | 0.073 | 2.420 | 8.529 | 0.019 | 0.000 | 0.084 | 8.839 | 6.377 | n/a | 0.033 | 1.776 | 0.063 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000158 | 27.720 | 2.831 | n/a | 0.000 | 12.122 | 0.789 | 1.540 | 0.019 | 0.000 | 3.271 | 6.559 | 0.550 | n/a | 0.040 | 14.952 | 0.539 | 0.040 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.098ms; driver.publication.persist-deferred 0.048ms |
| 35a94b370f22d0800000000000000151 | 27.570 | 4.343 | n/a | 0.000 | 0.168 | 4.280 | 1.774 | 0.024 | 0.000 | 3.729 | 12.612 | 0.574 | n/a | 0.064 | 4.511 | 0.164 | 0.064 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000168 | 26.254 | 2.537 | n/a | 0.000 | 0.050 | 0.752 | 1.351 | 0.017 | 0.000 | 0.107 | 9.033 | 12.380 | n/a | 0.027 | 2.587 | 0.099 | 0.027 | tx/thread-86/transactor.triplex-function | none observed |
| 35a94b370f22d0800000000000000132 | 24.241 | 2.433 | n/a | 0.000 | 0.108 | 1.156 | 2.089 | 0.060 | 0.000 | 0.196 | 14.751 | 3.420 | n/a | 0.028 | 2.542 | 0.105 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000191 | 23.979 | 2.563 | n/a | 0.000 | 0.114 | 1.058 | 7.830 | 0.035 | 0.000 | 0.652 | 8.172 | 3.508 | n/a | 0.048 | 2.677 | 0.112 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| 35a94b370f22d080000000000000015d | 23.151 | 2.234 | n/a | 0.000 | 0.065 | 1.985 | 1.659 | 0.019 | 0.000 | 1.947 | 10.908 | 4.300 | n/a | 0.033 | 2.300 | 0.099 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d080000000000000016e | 22.631 | 2.119 | n/a | 0.000 | 0.386 | 0.967 | 2.463 | 0.041 | 0.000 | 1.281 | 6.830 | 8.527 | n/a | 0.017 | 2.505 | 0.111 | 0.017 | tx/thread-86/transactor.triplex-function | none observed |
| 35a94b370f22d080000000000000013a | 21.371 | 2.572 | n/a | 0.000 | 0.053 | 1.008 | 1.780 | 0.062 | 0.000 | 4.041 | 10.334 | 1.495 | n/a | 0.027 | 2.625 | 0.123 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d080000000000000019c | 20.424 | 2.000 | n/a | 0.000 | 0.065 | 0.820 | 1.351 | 0.024 | 0.000 | 0.183 | 8.882 | 7.068 | n/a | 0.031 | 2.065 | 0.101 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000160 | 20.340 | 2.083 | n/a | 0.000 | 0.061 | 0.723 | 1.161 | 0.018 | 0.000 | 0.734 | 13.221 | 2.310 | n/a | 0.029 | 2.144 | 0.105 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d080000000000000016c | 20.142 | 2.024 | n/a | 0.000 | 0.073 | 1.267 | 2.526 | 0.057 | 0.000 | 1.372 | 12.170 | 0.616 | n/a | 0.038 | 2.098 | 0.104 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| 35a94b370f22d0800000000000000182 | 19.967 | 2.598 | n/a | 0.000 | 0.102 | 0.603 | 4.496 | 0.020 | 0.000 | 0.085 | 8.423 | 3.589 | n/a | 0.051 | 2.700 | 0.135 | 0.051 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d080000000000000017a | 19.623 | 3.128 | n/a | 0.000 | 0.133 | 1.126 | 2.288 | 0.048 | 0.000 | 3.452 | 8.796 | 0.608 | n/a | 0.045 | 3.261 | 0.166 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms |
| 35a94b370f22d0800000000000000197 | 19.077 | 3.025 | n/a | 0.000 | 0.063 | 1.133 | 1.216 | 0.020 | 0.000 | 0.480 | 9.621 | 3.481 | n/a | 0.039 | 3.088 | 0.162 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 35a94b370f22d0800000000000000199 | 15.276 | 2.096 | n/a | 0.000 | 0.055 | 0.939 | 1.961 | 0.049 | 0.000 | 0.220 | 6.338 | 3.590 | n/a | 0.028 | 2.151 | 0.141 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000194 | 12.325 | 2.464 | n/a | 0.000 | 0.067 | 0.821 | 1.815 | 0.021 | 0.000 | 0.462 | 6.150 | 0.495 | n/a | 0.032 | 2.531 | 0.205 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (59 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.953 | 0.573 | 0.000 | 0.570 | 2.635 | n/a | 0.000 | 0.063 | 0.962 | 1.836 | 0.025 | 0.000 | 0.408 | 7.453 | 1.624 | n/a | 0.028 | 2.678 | 0.166 | 0.028 |
| p99 | 94.091 | 2.002 | 0.000 | 2.570 | 18.388 | n/a | 0.000 | 11.005 | 9.733 | 27.822 | 0.098 | 0.000 | 3.238 | 35.081 | 55.610 | n/a | 0.072 | 18.465 | 0.438 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d08000000000000001b3 | 94.091 | 18.388 | n/a | 0.000 | 0.077 | 9.733 | 27.822 | 0.098 | 0.000 | 1.269 | 35.081 | 1.575 | n/a | 0.049 | 18.465 | 0.196 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 35a94b370f22d08000000000000001aa | 75.342 | 2.641 | n/a | 0.000 | 0.068 | 4.172 | 1.365 | 0.020 | 0.000 | 0.114 | 11.318 | 55.610 | n/a | 0.033 | 2.709 | 0.036 | 0.033 | tx/thread-86/transactor.triplex-function | none observed |
| 35a94b370f22d08000000000000001be | 36.258 | 2.672 | n/a | 0.000 | 4.133 | 0.874 | 1.928 | 0.021 | 0.000 | 0.120 | 20.597 | 5.887 | n/a | 0.027 | 6.805 | 0.188 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d080000000000000020a | 31.819 | 2.943 | n/a | 0.000 | 11.005 | 1.028 | 2.476 | 0.050 | 0.000 | 0.738 | 7.905 | 5.638 | n/a | 0.037 | 13.948 | 0.438 | 0.037 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.047ms |
| 35a94b370f22d080000000000000022c | 27.844 | 3.203 | n/a | 0.000 | 0.078 | 1.452 | 6.017 | 0.090 | 0.000 | 3.238 | 10.358 | 3.373 | n/a | 0.035 | 3.281 | 0.118 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000001bc | 26.712 | 4.588 | n/a | 0.000 | 0.048 | 0.856 | 1.569 | 0.022 | 0.000 | 0.113 | 15.390 | 4.099 | n/a | 0.027 | 4.636 | 0.174 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000201 | 26.620 | 3.973 | n/a | 0.000 | 0.058 | 3.936 | 1.889 | 0.023 | 0.000 | 0.105 | 14.925 | 1.684 | n/a | 0.027 | 4.031 | 0.151 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000001d7 | 25.711 | 4.745 | n/a | 0.000 | 0.073 | 5.172 | 10.829 | 0.097 | 0.000 | 0.200 | 4.332 | 0.224 | n/a | 0.040 | 4.818 | 0.187 | 0.040 | gw-w/thread-44/storage/begin-command! | none observed |
| 35a94b370f22d08000000000000001f6 | 25.492 | 2.730 | n/a | 0.000 | 0.037 | 0.510 | 1.378 | 0.020 | 0.000 | 0.122 | 15.466 | 5.215 | n/a | 0.014 | 2.767 | 0.109 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.058ms; driver.reader-basis.broadcast 0.041ms; driver.publication.persist-deferred 0.020ms |
| 35a94b370f22d0800000000000000213 | 25.135 | 2.052 | n/a | 0.000 | 0.051 | 0.828 | 1.737 | 0.025 | 0.000 | 0.161 | 16.708 | 3.543 | n/a | 0.030 | 2.103 | 0.084 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.066ms |
| 35a94b370f22d0800000000000000204 | 23.853 | 4.635 | n/a | 0.000 | 0.062 | 0.767 | 2.085 | 0.021 | 0.000 | 0.600 | 11.378 | 4.280 | n/a | 0.025 | 4.697 | 0.197 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| 35a94b370f22d080000000000000023e | 22.839 | 1.613 | n/a | 0.000 | 0.051 | 0.822 | 1.490 | 0.018 | 0.000 | 0.086 | 15.074 | 3.661 | n/a | 0.025 | 1.663 | 0.073 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 35a94b370f22d0800000000000000231 | 22.794 | 2.292 | n/a | 0.000 | 0.082 | 6.614 | 2.395 | 0.045 | 0.000 | 0.208 | 8.862 | 2.261 | n/a | 0.037 | 2.374 | 0.104 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000001b5 | 21.649 | 2.843 | n/a | 0.000 | 0.087 | 0.893 | 3.747 | 0.089 | 0.000 | 1.188 | 7.479 | 5.279 | n/a | 0.045 | 2.930 | 0.135 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| 35a94b370f22d08000000000000001a7 | 20.376 | 3.097 | n/a | 0.000 | 0.094 | 0.870 | 1.809 | 0.028 | 0.000 | 0.770 | 8.676 | 4.987 | n/a | 0.045 | 3.191 | 0.157 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d080000000000000022f | 20.065 | 2.635 | n/a | 0.000 | 0.043 | 3.104 | 5.279 | 0.021 | 0.000 | 1.094 | 4.153 | 3.709 | n/a | 0.026 | 2.678 | 0.133 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000001df | 19.730 | 2.046 | n/a | 0.000 | 0.052 | 0.595 | 4.861 | 0.025 | 0.000 | 0.083 | 6.086 | 5.960 | n/a | 0.023 | 2.098 | 0.106 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| 35a94b370f22d080000000000000021f | 19.465 | 1.863 | n/a | 0.000 | 0.054 | 1.097 | 2.397 | 0.044 | 0.000 | 1.254 | 10.397 | 2.332 | n/a | 0.028 | 1.917 | 0.098 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| 35a94b370f22d0800000000000000243 | 19.435 | 4.956 | n/a | 0.000 | 0.083 | 1.426 | 2.025 | 0.046 | 0.000 | 2.025 | 7.811 | 1.019 | n/a | 0.044 | 5.039 | 0.259 | 0.044 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000001e2 | 19.270 | 3.635 | n/a | 0.000 | 0.191 | 1.065 | 1.311 | 0.024 | 0.000 | 1.201 | 6.806 | 4.964 | n/a | 0.072 | 3.827 | 0.199 | 0.072 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.003 | 0.000 | 0.000 | 0.465 | 2.145 | n/a | 0.000 | 0.061 | 0.874 | 1.809 | 0.025 | 0.000 | 0.219 | 7.329 | 1.098 | n/a | 0.028 | 2.219 | 0.158 | 0.028 |
| p99 | 75.342 | 1.004 | 0.000 | 0.951 | 4.857 | n/a | 0.000 | 4.133 | 6.614 | 10.829 | 0.097 | 0.000 | 1.379 | 20.597 | 55.610 | n/a | 0.072 | 6.805 | 0.367 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d08000000000000001aa | 75.342 | 2.641 | n/a | 0.000 | 0.068 | 4.172 | 1.365 | 0.020 | 0.000 | 0.114 | 11.318 | 55.610 | n/a | 0.033 | 2.709 | 0.036 | 0.033 | tx/thread-86/transactor.triplex-function | none observed |
| 35a94b370f22d08000000000000001be | 36.258 | 2.672 | n/a | 0.000 | 4.133 | 0.874 | 1.928 | 0.021 | 0.000 | 0.120 | 20.597 | 5.887 | n/a | 0.027 | 6.805 | 0.188 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000001d7 | 25.711 | 4.745 | n/a | 0.000 | 0.073 | 5.172 | 10.829 | 0.097 | 0.000 | 0.200 | 4.332 | 0.224 | n/a | 0.040 | 4.818 | 0.187 | 0.040 | gw-w/thread-44/storage/begin-command! | none observed |
| 35a94b370f22d08000000000000001f6 | 25.492 | 2.730 | n/a | 0.000 | 0.037 | 0.510 | 1.378 | 0.020 | 0.000 | 0.122 | 15.466 | 5.215 | n/a | 0.014 | 2.767 | 0.109 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.058ms; driver.reader-basis.broadcast 0.041ms; driver.publication.persist-deferred 0.020ms |
| 35a94b370f22d0800000000000000213 | 25.135 | 2.052 | n/a | 0.000 | 0.051 | 0.828 | 1.737 | 0.025 | 0.000 | 0.161 | 16.708 | 3.543 | n/a | 0.030 | 2.103 | 0.084 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.066ms |
| 35a94b370f22d080000000000000023e | 22.839 | 1.613 | n/a | 0.000 | 0.051 | 0.822 | 1.490 | 0.018 | 0.000 | 0.086 | 15.074 | 3.661 | n/a | 0.025 | 1.663 | 0.073 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 35a94b370f22d0800000000000000231 | 22.794 | 2.292 | n/a | 0.000 | 0.082 | 6.614 | 2.395 | 0.045 | 0.000 | 0.208 | 8.862 | 2.261 | n/a | 0.037 | 2.374 | 0.104 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000001a7 | 20.376 | 3.097 | n/a | 0.000 | 0.094 | 0.870 | 1.809 | 0.028 | 0.000 | 0.770 | 8.676 | 4.987 | n/a | 0.045 | 3.191 | 0.157 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000001df | 19.730 | 2.046 | n/a | 0.000 | 0.052 | 0.595 | 4.861 | 0.025 | 0.000 | 0.083 | 6.086 | 5.960 | n/a | 0.023 | 2.098 | 0.106 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| 35a94b370f22d080000000000000021f | 19.465 | 1.863 | n/a | 0.000 | 0.054 | 1.097 | 2.397 | 0.044 | 0.000 | 1.254 | 10.397 | 2.332 | n/a | 0.028 | 1.917 | 0.098 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| 35a94b370f22d08000000000000001e2 | 19.270 | 3.635 | n/a | 0.000 | 0.191 | 1.065 | 1.311 | 0.024 | 0.000 | 1.201 | 6.806 | 4.964 | n/a | 0.072 | 3.827 | 0.199 | 0.072 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000001b8 | 18.778 | 1.945 | n/a | 0.000 | 0.059 | 0.675 | 3.624 | 0.040 | 0.000 | 0.095 | 7.927 | 4.385 | n/a | 0.027 | 2.004 | 0.107 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000001e7 | 18.483 | 2.260 | n/a | 0.000 | 0.116 | 1.021 | 2.039 | 0.074 | 0.000 | 0.170 | 11.768 | 0.984 | n/a | 0.052 | 2.376 | 0.129 | 0.052 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000001c2 | 18.379 | 2.534 | n/a | 0.000 | 0.049 | 1.047 | 5.199 | 0.040 | 0.000 | 0.146 | 6.029 | 3.313 | n/a | 0.024 | 2.583 | 0.141 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000001c5 | 18.107 | 1.909 | n/a | 0.000 | 0.053 | 0.816 | 1.836 | 0.042 | 0.000 | 0.219 | 10.894 | 2.315 | n/a | 0.023 | 1.963 | 0.108 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000001ae | 17.862 | 2.265 | n/a | 0.000 | 0.052 | 0.560 | 1.462 | 0.018 | 0.000 | 0.417 | 8.657 | 4.400 | n/a | 0.030 | 2.317 | 0.130 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000001cd | 17.623 | 1.734 | n/a | 0.000 | 0.057 | 0.602 | 4.406 | 0.023 | 0.000 | 0.109 | 7.006 | 3.649 | n/a | 0.037 | 1.791 | 0.102 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| 35a94b370f22d0800000000000000247 | 17.003 | 1.874 | n/a | 0.000 | 0.061 | 4.523 | 1.122 | 0.018 | 0.000 | 0.094 | 8.754 | 0.529 | n/a | 0.028 | 1.935 | 0.114 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.050ms |
| 35a94b370f22d0800000000000000239 | 16.832 | 2.432 | n/a | 0.000 | 0.069 | 1.532 | 3.087 | 0.083 | 0.000 | 0.408 | 8.425 | 0.768 | n/a | 0.028 | 2.501 | 0.149 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000000206 | 16.493 | 3.021 | n/a | 0.000 | 0.112 | 1.416 | 2.661 | 0.065 | 0.000 | 1.108 | 7.329 | 0.733 | n/a | 0.047 | 3.133 | 0.190 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (1653 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.089 | 0.499 | 0.000 | 0.552 | 2.287 | n/a | 0.000 | 0.047 | 0.639 | 1.129 | 0.013 | 0.000 | 0.118 | 5.635 | 0.823 | n/a | 0.017 | 2.591 | 0.217 | 0.017 |
| p99 | 50.639 | 2.967 | 0.036 | 2.140 | 7.802 | n/a | 0.000 | 12.772 | 7.626 | 7.198 | 0.069 | 0.000 | 3.654 | 30.922 | 15.422 | n/a | 0.064 | 17.675 | 0.621 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d08000000000000002f8 | 74.932 | 1.876 | n/a | 0.000 | 46.661 | 2.333 | 1.432 | 0.021 | 0.000 | 0.874 | 20.839 | 0.882 | n/a | 0.014 | 48.537 | 0.648 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.198ms; driver.reader-basis.broadcast 0.082ms; driver.publication.readback 0.055ms; driver.publication.readback 0.049ms; driver.publication.readback 0.046ms |
| 35a94b370f22d080000000000000092e | 71.081 | 3.334 | n/a | 0.000 | 1.454 | 1.540 | 1.545 | 0.018 | 0.000 | 0.074 | 59.744 | 3.361 | n/a | 0.012 | 4.788 | 0.067 | 0.012 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.410ms; driver.publication.readback 0.181ms; driver.publication.persist-deferred 0.146ms; driver.publication.readback 0.087ms; driver.publication.readback 0.087ms |
| 35a94b370f22d080000000000000095b | 68.287 | 2.915 | n/a | 0.000 | 0.997 | 1.065 | 0.803 | 0.009 | 0.000 | 0.278 | 47.917 | 14.272 | n/a | 0.031 | 3.912 | 0.057 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.208ms; driver.publication.readback 0.143ms; driver.reader-basis.broadcast 0.123ms; driver.publication.readback 0.080ms; driver.publication.readback 0.055ms |
| 35a94b370f22d080000000000000095e | 65.591 | 2.810 | n/a | 0.000 | 0.055 | 1.095 | 1.891 | 0.031 | 0.000 | 0.586 | 30.710 | 28.385 | n/a | 0.028 | 2.865 | 0.044 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.208ms; driver.reader-basis.broadcast 0.123ms; driver.publication.readback 0.080ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.037ms |
| 35a94b370f22d080000000000000092b | 62.217 | 2.407 | n/a | 0.000 | 0.240 | 1.317 | 0.669 | 0.006 | 0.000 | 2.314 | 52.719 | 2.539 | n/a | 0.006 | 2.647 | 0.043 | 0.006 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.410ms; driver.publication.readback 0.181ms; driver.publication.persist-deferred 0.146ms; driver.reader-basis.broadcast 0.093ms; driver.publication.readback 0.087ms |
| 35a94b370f22d0800000000000000933 | 61.375 | 2.045 | n/a | 0.000 | 2.750 | 0.979 | 1.846 | 0.013 | 0.000 | 0.069 | 51.436 | 2.216 | n/a | 0.020 | 4.795 | 0.078 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.500ms; driver.publication.readback 0.410ms; driver.publication.readback 0.181ms; driver.publication.persist-deferred 0.146ms; driver.publication.readback 0.087ms |
| 35a94b370f22d080000000000000095f | 60.864 | 4.054 | n/a | 0.000 | 0.120 | 1.115 | 1.880 | 0.048 | 0.000 | 0.277 | 52.682 | 0.644 | n/a | 0.043 | 4.175 | 0.069 | 0.043 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.208ms; driver.reader-basis.broadcast 0.123ms; driver.publication.readback 0.080ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.039ms |
| 35a94b370f22d080000000000000092f | 57.608 | 2.210 | n/a | 0.000 | 0.073 | 1.983 | 1.029 | 0.013 | 0.000 | 0.060 | 49.859 | 2.352 | n/a | 0.029 | 2.283 | 0.040 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.410ms; driver.publication.readback 0.181ms; driver.publication.persist-deferred 0.146ms; driver.publication.readback 0.087ms; driver.publication.readback 0.087ms |
| 35a94b370f22d0800000000000000256 | 56.188 | 1.849 | n/a | 0.000 | 0.044 | 0.939 | 3.418 | 0.074 | 0.000 | 0.197 | 11.794 | 37.850 | n/a | 0.023 | 1.893 | 0.034 | 0.023 | tx/thread-86/transactor.triplex-function | none observed |
| 35a94b370f22d08000000000000008e1 | 55.639 | 7.964 | n/a | 0.000 | 0.030 | 2.396 | 5.358 | 0.063 | 0.000 | 0.521 | 30.922 | 8.368 | n/a | 0.017 | 7.994 | 0.144 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.175ms; driver.publication.readback 0.134ms; driver.reader-basis.broadcast 0.092ms; driver.publication.readback 0.060ms; driver.publication.readback 0.052ms |
| 35a94b370f22d08000000000000008da | 55.083 | 2.827 | n/a | 0.000 | 28.106 | 0.702 | 1.392 | 0.016 | 0.000 | 0.103 | 20.120 | 1.806 | n/a | 0.012 | 30.933 | 0.562 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.175ms; driver.publication.readback 0.134ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.049ms; driver.publication.readback 0.049ms |
| 35a94b370f22d0800000000000000495 | 54.169 | 1.777 | n/a | 0.000 | 0.029 | 1.331 | 0.905 | 0.011 | 0.000 | 0.049 | 42.312 | 7.743 | n/a | 0.014 | 1.806 | 0.033 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.117ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.017ms |
| 35a94b370f22d080000000000000079e | 54.127 | 6.376 | n/a | 0.000 | 0.153 | 13.497 | 2.986 | 0.297 | 0.000 | 0.523 | 29.717 | 0.560 | n/a | 0.017 | 6.530 | 0.121 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.166ms; driver.publication.readback 0.133ms; driver.publication.readback 0.109ms; driver.publication.readback 0.096ms; driver.publication.readback 0.091ms |
| 35a94b370f22d0800000000000000961 | 53.576 | 1.512 | n/a | 0.000 | 0.041 | 1.274 | 1.308 | 0.029 | 0.000 | 0.205 | 48.895 | 0.295 | n/a | 0.018 | 1.552 | 0.029 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.302ms; driver.publication.readback 0.208ms; driver.reader-basis.broadcast 0.123ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.039ms |
| 35a94b370f22d080000000000000092c | 51.989 | 3.251 | n/a | 0.000 | 0.046 | 0.404 | 1.004 | 0.007 | 0.000 | 0.030 | 28.840 | 18.383 | n/a | 0.024 | 3.297 | 0.063 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.410ms; driver.publication.readback 0.181ms; driver.publication.persist-deferred 0.146ms; driver.publication.readback 0.064ms; driver.publication.readback 0.037ms |
| 35a94b370f22d08000000000000006fd | 51.347 | 3.122 | n/a | 0.000 | 0.019 | 0.468 | 6.068 | 0.019 | 18.568 | 0.082 | 20.781 | 2.208 | n/a | 0.012 | 3.141 | 0.061 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.073ms |
| 35a94b370f22d0800000000000000395 | 50.639 | 4.208 | n/a | 0.000 | 23.387 | 1.619 | 0.985 | 0.017 | 0.000 | 0.349 | 16.840 | 3.203 | n/a | 0.031 | 27.595 | 0.545 | 0.031 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.258ms; driver.publication.readback 0.244ms; driver.publication.readback 0.116ms; driver.publication.readback 0.076ms; driver.publication.readback 0.051ms |
| 35a94b370f22d08000000000000002fb | 50.581 | 1.534 | n/a | 0.000 | 0.020 | 2.367 | 1.200 | 0.020 | 0.000 | 0.442 | 32.160 | 12.822 | n/a | 0.015 | 1.554 | 0.031 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.017ms |
| 35a94b370f22d08000000000000004d4 | 49.465 | 16.180 | n/a | 0.000 | 1.947 | 8.214 | 10.595 | 0.052 | 0.000 | 3.531 | 7.692 | 1.238 | n/a | 0.017 | 18.127 | 0.366 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.108ms; driver.reader-basis.broadcast 0.049ms; driver.publication.persist-deferred 0.037ms |
| 35a94b370f22d080000000000000037f | 49.366 | 2.355 | n/a | 0.000 | 1.147 | 1.016 | 1.007 | 0.012 | 0.000 | 0.727 | 35.461 | 7.632 | n/a | 0.009 | 3.503 | 0.071 | 0.009 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.068ms; driver.reader-basis.broadcast 0.033ms; driver.publication.persist-deferred 0.015ms |

## P2 / L16 / commit / 5-10 facts (986 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.638 | 0.000 | 0.000 | 0.428 | 1.902 | n/a | 0.000 | 0.047 | 0.631 | 0.984 | 0.013 | 0.000 | 0.117 | 5.356 | 0.639 | n/a | 0.017 | 2.131 | 0.196 | 0.017 |
| p99 | 51.989 | 1.988 | 0.017 | 0.994 | 5.836 | n/a | 0.000 | 11.974 | 6.710 | 7.073 | 0.063 | 0.000 | 3.354 | 32.160 | 15.601 | n/a | 0.064 | 17.251 | 0.648 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d08000000000000002f8 | 74.932 | 1.876 | n/a | 0.000 | 46.661 | 2.333 | 1.432 | 0.021 | 0.000 | 0.874 | 20.839 | 0.882 | n/a | 0.014 | 48.537 | 0.648 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.198ms; driver.reader-basis.broadcast 0.082ms; driver.publication.readback 0.055ms; driver.publication.readback 0.049ms; driver.publication.readback 0.046ms |
| 35a94b370f22d080000000000000095b | 68.287 | 2.915 | n/a | 0.000 | 0.997 | 1.065 | 0.803 | 0.009 | 0.000 | 0.278 | 47.917 | 14.272 | n/a | 0.031 | 3.912 | 0.057 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.208ms; driver.publication.readback 0.143ms; driver.reader-basis.broadcast 0.123ms; driver.publication.readback 0.080ms; driver.publication.readback 0.055ms |
| 35a94b370f22d080000000000000095e | 65.591 | 2.810 | n/a | 0.000 | 0.055 | 1.095 | 1.891 | 0.031 | 0.000 | 0.586 | 30.710 | 28.385 | n/a | 0.028 | 2.865 | 0.044 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.208ms; driver.reader-basis.broadcast 0.123ms; driver.publication.readback 0.080ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.037ms |
| 35a94b370f22d080000000000000092b | 62.217 | 2.407 | n/a | 0.000 | 0.240 | 1.317 | 0.669 | 0.006 | 0.000 | 2.314 | 52.719 | 2.539 | n/a | 0.006 | 2.647 | 0.043 | 0.006 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.410ms; driver.publication.readback 0.181ms; driver.publication.persist-deferred 0.146ms; driver.reader-basis.broadcast 0.093ms; driver.publication.readback 0.087ms |
| 35a94b370f22d0800000000000000933 | 61.375 | 2.045 | n/a | 0.000 | 2.750 | 0.979 | 1.846 | 0.013 | 0.000 | 0.069 | 51.436 | 2.216 | n/a | 0.020 | 4.795 | 0.078 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.500ms; driver.publication.readback 0.410ms; driver.publication.readback 0.181ms; driver.publication.persist-deferred 0.146ms; driver.publication.readback 0.087ms |
| 35a94b370f22d080000000000000092f | 57.608 | 2.210 | n/a | 0.000 | 0.073 | 1.983 | 1.029 | 0.013 | 0.000 | 0.060 | 49.859 | 2.352 | n/a | 0.029 | 2.283 | 0.040 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.410ms; driver.publication.readback 0.181ms; driver.publication.persist-deferred 0.146ms; driver.publication.readback 0.087ms; driver.publication.readback 0.087ms |
| 35a94b370f22d0800000000000000256 | 56.188 | 1.849 | n/a | 0.000 | 0.044 | 0.939 | 3.418 | 0.074 | 0.000 | 0.197 | 11.794 | 37.850 | n/a | 0.023 | 1.893 | 0.034 | 0.023 | tx/thread-86/transactor.triplex-function | none observed |
| 35a94b370f22d0800000000000000495 | 54.169 | 1.777 | n/a | 0.000 | 0.029 | 1.331 | 0.905 | 0.011 | 0.000 | 0.049 | 42.312 | 7.743 | n/a | 0.014 | 1.806 | 0.033 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.117ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.017ms |
| 35a94b370f22d0800000000000000961 | 53.576 | 1.512 | n/a | 0.000 | 0.041 | 1.274 | 1.308 | 0.029 | 0.000 | 0.205 | 48.895 | 0.295 | n/a | 0.018 | 1.552 | 0.029 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.302ms; driver.publication.readback 0.208ms; driver.reader-basis.broadcast 0.123ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.039ms |
| 35a94b370f22d080000000000000092c | 51.989 | 3.251 | n/a | 0.000 | 0.046 | 0.404 | 1.004 | 0.007 | 0.000 | 0.030 | 28.840 | 18.383 | n/a | 0.024 | 3.297 | 0.063 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.410ms; driver.publication.readback 0.181ms; driver.publication.persist-deferred 0.146ms; driver.publication.readback 0.064ms; driver.publication.readback 0.037ms |
| 35a94b370f22d0800000000000000395 | 50.639 | 4.208 | n/a | 0.000 | 23.387 | 1.619 | 0.985 | 0.017 | 0.000 | 0.349 | 16.840 | 3.203 | n/a | 0.031 | 27.595 | 0.545 | 0.031 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.258ms; driver.publication.readback 0.244ms; driver.publication.readback 0.116ms; driver.publication.readback 0.076ms; driver.publication.readback 0.051ms |
| 35a94b370f22d08000000000000002fb | 50.581 | 1.534 | n/a | 0.000 | 0.020 | 2.367 | 1.200 | 0.020 | 0.000 | 0.442 | 32.160 | 12.822 | n/a | 0.015 | 1.554 | 0.031 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.017ms |
| 35a94b370f22d080000000000000037f | 49.366 | 2.355 | n/a | 0.000 | 1.147 | 1.016 | 1.007 | 0.012 | 0.000 | 0.727 | 35.461 | 7.632 | n/a | 0.009 | 3.503 | 0.071 | 0.009 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.068ms; driver.reader-basis.broadcast 0.033ms; driver.publication.persist-deferred 0.015ms |
| 35a94b370f22d0800000000000000957 | 47.829 | 2.223 | n/a | 0.000 | 2.130 | 3.553 | 2.183 | 0.037 | 0.000 | 4.311 | 24.491 | 8.866 | n/a | 0.035 | 4.353 | 0.091 | 0.035 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.798ms; driver.publication.readback 0.143ms; driver.publication.readback 0.073ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.026ms |
| 35a94b370f22d080000000000000026d | 45.046 | 6.535 | n/a | 0.000 | 0.063 | 4.629 | 12.656 | 0.119 | 11.643 | 0.691 | 7.904 | 0.779 | n/a | 0.029 | 6.597 | 0.146 | 0.029 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 35a94b370f22d0800000000000000963 | 43.328 | 1.769 | n/a | 0.000 | 2.592 | 1.598 | 0.811 | 0.014 | 0.000 | 0.095 | 36.029 | 0.407 | n/a | 0.013 | 4.361 | 0.101 | 0.013 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.302ms; driver.publication.readback 0.208ms; driver.reader-basis.broadcast 0.123ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.039ms |
| 35a94b370f22d08000000000000002da | 42.232 | 1.198 | n/a | 0.000 | 0.677 | 6.254 | 0.899 | 0.009 | 0.000 | 0.019 | 19.398 | 13.768 | n/a | 0.010 | 1.875 | 0.044 | 0.010 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.104ms; driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.017ms |
| 35a94b370f22d0800000000000000412 | 42.148 | 1.583 | n/a | 0.000 | 0.028 | 0.783 | 1.271 | 0.015 | 0.000 | 0.342 | 33.951 | 4.159 | n/a | 0.015 | 1.612 | 0.038 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d08000000000000005a2 | 41.702 | 2.247 | n/a | 0.000 | 10.932 | 0.560 | 4.868 | 0.062 | 0.000 | 5.950 | 16.639 | 0.419 | n/a | 0.025 | 13.179 | 0.316 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.133ms; driver.publication.readback 0.068ms; driver.reader-basis.broadcast 0.066ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.042ms |
| 35a94b370f22d0800000000000000312 | 40.357 | 1.378 | n/a | 0.000 | 0.034 | 0.536 | 1.041 | 0.016 | 0.000 | 1.437 | 27.491 | 8.405 | n/a | 0.018 | 1.412 | 0.035 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.reader-basis.broadcast 0.027ms; driver.publication.persist-deferred 0.018ms |

## P2 / L64 / commit (1735 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.587 | 0.457 | 0.000 | 0.514 | 2.207 | n/a | 0.000 | 0.037 | 0.540 | 0.945 | 0.012 | 0.000 | 0.090 | 4.416 | 0.776 | n/a | 0.013 | 2.512 | 0.244 | 0.013 |
| p99 | 41.895 | 2.217 | 0.031 | 2.131 | 6.916 | n/a | 0.000 | 12.046 | 6.150 | 4.802 | 0.045 | 0.000 | 2.043 | 24.795 | 7.671 | n/a | 0.036 | 14.899 | 0.625 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d0800000000000001122 | 104.355 | 1.333 | n/a | 0.000 | 88.544 | 1.667 | 6.704 | 0.020 | 0.000 | 0.386 | 4.073 | 1.616 | n/a | 0.011 | 89.878 | 0.861 | 0.011 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.148ms; driver.reader-basis.broadcast 0.191ms; driver.publication.readback 0.190ms; driver.publication.readback 0.126ms; driver.publication.readback 0.111ms |
| 35a94b370f22d080000000000000111f | 91.812 | 4.870 | n/a | 0.000 | 0.036 | 12.671 | 23.151 | 0.039 | 0.000 | 0.371 | 27.394 | 23.263 | n/a | 0.017 | 4.906 | 0.053 | 0.017 | tx/thread-86/transactor.triplex-function | driver.expected-state.bind-receipt 1.148ms; driver.reader-basis.broadcast 0.191ms; driver.publication.readback 0.126ms; driver.publication.readback 0.111ms; driver.publication.readback 0.088ms |
| 35a94b370f22d08000000000000010c3 | 83.889 | 11.975 | n/a | 0.000 | 37.978 | 5.151 | 4.095 | 0.033 | 0.000 | 0.345 | 17.275 | 7.022 | n/a | 0.017 | 49.953 | 0.595 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.146ms; driver.publication.readback 0.088ms; driver.publication.readback 0.068ms; driver.publication.readback 0.051ms; driver.publication.readback 0.048ms |
| 35a94b370f22d08000000000000010dd | 56.769 | 1.160 | n/a | 0.000 | 27.409 | 1.031 | 1.105 | 0.024 | 0.000 | 0.100 | 24.927 | 1.001 | n/a | 0.012 | 28.569 | 0.503 | 0.012 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.179ms; driver.publication.readback 0.072ms; driver.publication.readback 0.061ms; driver.publication.readback 0.057ms; driver.publication.readback 0.031ms |
| 35a94b370f22d08000000000000010cb | 54.737 | 2.740 | n/a | 0.000 | 14.882 | 0.442 | 0.771 | 0.007 | 0.000 | 0.042 | 29.873 | 5.971 | n/a | 0.008 | 17.622 | 0.322 | 0.008 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.200ms; driver.reader-basis.broadcast 0.139ms; driver.publication.readback 0.068ms; driver.publication.readback 0.058ms; driver.publication.readback 0.049ms |
| 35a94b370f22d080000000000000112a | 54.543 | 4.294 | n/a | 0.000 | 28.616 | 0.750 | 14.095 | 0.033 | 0.000 | 1.409 | 4.322 | 1.001 | n/a | 0.022 | 32.910 | 0.603 | 0.022 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.191ms; driver.publication.readback 0.190ms; driver.publication.readback 0.088ms; driver.publication.readback 0.060ms; driver.publication.readback 0.059ms |
| 35a94b370f22d0800000000000001270 | 51.125 | 7.743 | n/a | 0.000 | 0.058 | 5.388 | 5.313 | 0.034 | 0.000 | 0.424 | 5.909 | 26.234 | n/a | 0.022 | 7.801 | 0.153 | 0.022 | tx/thread-86/transactor.triplex-function | driver.publication.persist-deferred 0.449ms; driver.publication.persist-deferred 0.165ms; driver.publication.readback 0.049ms; driver.publication.readback 0.030ms |
| 35a94b370f22d08000000000000016ac | 49.259 | 2.071 | n/a | 0.000 | 11.762 | 0.490 | 1.619 | 0.024 | 0.000 | 0.115 | 30.765 | 2.401 | n/a | 0.012 | 13.833 | 0.281 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.139ms; driver.publication.readback 0.112ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.008ms |
| 35a94b370f22d0800000000000001126 | 48.605 | 4.829 | n/a | 0.000 | 0.069 | 0.623 | 1.046 | 0.012 | 0.000 | 0.073 | 35.372 | 6.553 | n/a | 0.029 | 4.898 | 0.101 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.148ms; driver.reader-basis.broadcast 0.191ms; driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.025ms |
| 35a94b370f22d080000000000000109e | 47.005 | 1.709 | n/a | 0.000 | 1.029 | 0.543 | 1.580 | 0.034 | 0.000 | 0.144 | 13.400 | 28.558 | n/a | 0.008 | 2.738 | 0.058 | 0.008 | tx/thread-86/transactor.triplex-function | driver.reader-basis.broadcast 0.182ms; driver.publication.readback 0.121ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.014ms |
| 35a94b370f22d08000000000000013ca | 46.463 | 5.708 | n/a | 0.000 | 0.024 | 0.684 | 2.550 | 0.031 | 0.000 | 0.117 | 36.323 | 1.010 | n/a | 0.017 | 5.731 | 0.123 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.224ms |
| 35a94b370f22d08000000000000010c1 | 45.974 | 2.481 | n/a | 0.000 | 26.261 | 0.587 | 1.018 | 0.014 | 0.000 | 0.082 | 14.829 | 0.686 | n/a | 0.016 | 28.742 | 0.625 | 0.016 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.187ms; driver.publication.readback 0.088ms; driver.publication.persist-deferred 0.022ms |
| 35a94b370f22d08000000000000010de | 45.072 | 1.745 | n/a | 0.000 | 1.993 | 1.677 | 0.323 | 0.004 | 0.000 | 0.018 | 35.876 | 3.415 | n/a | 0.018 | 3.738 | 0.083 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.179ms; driver.publication.readback 0.072ms; driver.publication.readback 0.061ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.029ms |
| 35a94b370f22d0800000000000001128 | 44.767 | 2.739 | n/a | 0.000 | 1.719 | 1.543 | 4.264 | 0.020 | 0.000 | 0.284 | 31.262 | 2.927 | n/a | 0.009 | 4.458 | 0.100 | 0.009 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.148ms; driver.reader-basis.broadcast 0.191ms; driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.025ms; driver.publication.persist-deferred 0.015ms |
| 35a94b370f22d08000000000000010a0 | 42.177 | 2.198 | n/a | 0.000 | 0.025 | 0.748 | 1.055 | 0.012 | 0.000 | 0.065 | 37.403 | 0.659 | n/a | 0.011 | 2.223 | 0.053 | 0.011 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.182ms; driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.016ms |
| 35a94b370f22d08000000000000010c2 | 42.162 | 2.829 | n/a | 0.000 | 30.133 | 1.485 | 1.368 | 0.024 | 0.000 | 0.264 | 5.465 | 0.576 | n/a | 0.019 | 32.962 | 0.782 | 0.019 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.146ms; driver.publication.readback 0.088ms; driver.publication.persist-deferred 0.039ms; driver.publication.persist-deferred 0.022ms |
| 35a94b370f22d08000000000000014a3 | 42.049 | 5.645 | n/a | 0.000 | 2.274 | 23.678 | 1.263 | 0.012 | 0.000 | 0.404 | 5.649 | 3.069 | n/a | 0.055 | 7.919 | 0.188 | 0.055 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.149ms; driver.publication.readback 0.081ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.016ms |
| 35a94b370f22d080000000000000183c | 41.895 | 5.633 | n/a | 0.000 | 0.033 | 0.613 | 1.378 | 0.014 | 0.000 | 0.136 | 13.181 | 20.889 | n/a | 0.020 | 5.666 | 0.135 | 0.020 | tx/thread-86/transactor.triplex-function | driver.reader-basis.broadcast 0.304ms; driver.publication.readback 0.115ms |
| 35a94b370f22d08000000000000013cb | 41.272 | 4.706 | n/a | 0.000 | 0.089 | 7.773 | 1.281 | 0.026 | 0.000 | 0.469 | 26.174 | 0.726 | n/a | 0.028 | 4.794 | 0.116 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.529ms; driver.reader-basis.broadcast 0.224ms; driver.publication.persist-deferred 0.038ms |
| 35a94b370f22d0800000000000001b30 | 41.036 | 5.574 | n/a | 0.000 | 0.156 | 27.626 | 2.293 | 0.025 | 0.000 | 0.096 | 4.128 | 1.123 | n/a | 0.016 | 5.730 | 0.140 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.232ms; driver.publication.readback 0.097ms; driver.publication.persist-deferred 0.021ms |

## P2 / L64 / commit / 5-10 facts (1064 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.436 | 0.000 | 0.000 | 0.402 | 1.788 | n/a | 0.000 | 0.036 | 0.537 | 0.827 | 0.012 | 0.000 | 0.092 | 4.131 | 0.610 | n/a | 0.013 | 1.993 | 0.223 | 0.013 |
| p99 | 38.117 | 2.000 | 0.008 | 0.942 | 4.960 | n/a | 0.000 | 10.904 | 6.212 | 4.802 | 0.045 | 0.000 | 1.914 | 24.350 | 7.233 | n/a | 0.035 | 12.481 | 0.616 | 0.035 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d0800000000000001122 | 104.355 | 1.333 | n/a | 0.000 | 88.544 | 1.667 | 6.704 | 0.020 | 0.000 | 0.386 | 4.073 | 1.616 | n/a | 0.011 | 89.878 | 0.861 | 0.011 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.148ms; driver.reader-basis.broadcast 0.191ms; driver.publication.readback 0.190ms; driver.publication.readback 0.126ms; driver.publication.readback 0.111ms |
| 35a94b370f22d080000000000000111f | 91.812 | 4.870 | n/a | 0.000 | 0.036 | 12.671 | 23.151 | 0.039 | 0.000 | 0.371 | 27.394 | 23.263 | n/a | 0.017 | 4.906 | 0.053 | 0.017 | tx/thread-86/transactor.triplex-function | driver.expected-state.bind-receipt 1.148ms; driver.reader-basis.broadcast 0.191ms; driver.publication.readback 0.126ms; driver.publication.readback 0.111ms; driver.publication.readback 0.088ms |
| 35a94b370f22d08000000000000010dd | 56.769 | 1.160 | n/a | 0.000 | 27.409 | 1.031 | 1.105 | 0.024 | 0.000 | 0.100 | 24.927 | 1.001 | n/a | 0.012 | 28.569 | 0.503 | 0.012 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.179ms; driver.publication.readback 0.072ms; driver.publication.readback 0.061ms; driver.publication.readback 0.057ms; driver.publication.readback 0.031ms |
| 35a94b370f22d08000000000000010de | 45.072 | 1.745 | n/a | 0.000 | 1.993 | 1.677 | 0.323 | 0.004 | 0.000 | 0.018 | 35.876 | 3.415 | n/a | 0.018 | 3.738 | 0.083 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.179ms; driver.publication.readback 0.072ms; driver.publication.readback 0.061ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.029ms |
| 35a94b370f22d08000000000000010c2 | 42.162 | 2.829 | n/a | 0.000 | 30.133 | 1.485 | 1.368 | 0.024 | 0.000 | 0.264 | 5.465 | 0.576 | n/a | 0.019 | 32.962 | 0.782 | 0.019 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.146ms; driver.publication.readback 0.088ms; driver.publication.persist-deferred 0.039ms; driver.publication.persist-deferred 0.022ms |
| 35a94b370f22d08000000000000013cb | 41.272 | 4.706 | n/a | 0.000 | 0.089 | 7.773 | 1.281 | 0.026 | 0.000 | 0.469 | 26.174 | 0.726 | n/a | 0.028 | 4.794 | 0.116 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.529ms; driver.reader-basis.broadcast 0.224ms; driver.publication.persist-deferred 0.038ms |
| 35a94b370f22d08000000000000015ba | 39.986 | 12.878 | n/a | 2.118 | 0.010 | 5.870 | 1.904 | 0.030 | 0.000 | 0.199 | 16.000 | 0.969 | n/a | 0.007 | 15.007 | 0.375 | 0.007 | node-14/thread-0/triplex.transact | driver.reader-basis.broadcast 0.206ms; driver.publication.readback 0.079ms; driver.publication.readback 0.054ms; driver.publication.readback 0.053ms; driver.publication.readback 0.038ms |
| 35a94b370f22d08000000000000014b1 | 39.697 | 1.283 | n/a | 0.000 | 26.451 | 0.433 | 0.903 | 0.012 | 0.000 | 0.060 | 9.446 | 1.098 | n/a | 0.011 | 27.734 | 0.699 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.393ms; driver.publication.readback 0.112ms; driver.publication.readback 0.079ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.022ms |
| 35a94b370f22d08000000000000019f6 | 39.471 | 4.526 | n/a | 0.000 | 22.266 | 2.624 | 1.568 | 0.023 | 0.000 | 0.092 | 5.180 | 3.178 | n/a | 0.015 | 26.792 | 0.679 | 0.015 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.639ms; driver.expected-state.bind-receipt 1.293ms; driver.publication.readback 0.252ms; driver.publication.readback 0.201ms; driver.publication.readback 0.100ms |
| 35a94b370f22d08000000000000019f2 | 39.048 | 1.892 | n/a | 0.000 | 5.567 | 6.389 | 1.002 | 0.008 | 0.000 | 0.024 | 16.206 | 7.949 | n/a | 0.012 | 7.459 | 0.191 | 0.012 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.639ms; driver.expected-state.bind-receipt 1.293ms; driver.publication.readback 0.201ms; driver.publication.readback 0.099ms; driver.publication.persist-deferred 0.069ms |
| 35a94b370f22d08000000000000014a5 | 38.117 | 1.669 | n/a | 0.000 | 3.411 | 24.510 | 0.458 | 0.007 | 0.000 | 0.207 | 6.005 | 1.843 | n/a | 0.008 | 5.080 | 0.133 | 0.008 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.149ms; driver.publication.readback 0.081ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.016ms |
| 35a94b370f22d080000000000000167d | 37.688 | 2.089 | n/a | 0.000 | 0.038 | 0.472 | 0.760 | 0.010 | 0.000 | 0.049 | 32.441 | 1.815 | n/a | 0.014 | 2.126 | 0.056 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.140ms; driver.publication.readback 0.093ms; driver.publication.persist-deferred 0.029ms |
| 35a94b370f22d080000000000000137a | 37.481 | 1.329 | n/a | 0.000 | 0.024 | 0.288 | 0.653 | 0.011 | 0.000 | 0.062 | 34.703 | 0.399 | n/a | 0.012 | 1.353 | 0.036 | 0.012 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001448 | 36.037 | 3.702 | n/a | 0.000 | 1.972 | 3.487 | 1.681 | 0.029 | 0.000 | 0.108 | 23.816 | 1.208 | n/a | 0.035 | 5.673 | 0.157 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.025ms; driver.publication.persist-deferred 0.017ms |
| 35a94b370f22d0800000000000001129 | 35.566 | 3.535 | n/a | 0.000 | 0.094 | 3.756 | 0.732 | 0.011 | 0.000 | 0.047 | 24.795 | 2.567 | n/a | 0.030 | 3.629 | 0.102 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.191ms; driver.publication.readback 0.088ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.011ms |
| 35a94b370f22d080000000000000137b | 35.277 | 1.012 | n/a | 0.000 | 0.013 | 0.167 | 0.473 | 0.006 | 0.000 | 0.155 | 33.053 | 0.392 | n/a | 0.006 | 1.025 | 0.029 | 0.006 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.021ms |
| 35a94b370f22d0800000000000001449 | 34.597 | 5.569 | n/a | 0.000 | 1.770 | 3.604 | 1.446 | 0.029 | 0.000 | 0.087 | 21.387 | 0.683 | n/a | 0.022 | 7.340 | 0.212 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.017ms |
| 35a94b370f22d08000000000000010df | 33.747 | 2.082 | n/a | 0.000 | 0.026 | 0.377 | 0.531 | 0.005 | 0.000 | 0.033 | 30.077 | 0.602 | n/a | 0.013 | 2.108 | 0.062 | 0.013 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.179ms; driver.publication.readback 0.072ms; driver.publication.readback 0.061ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.021ms |
| 35a94b370f22d0800000000000001447 | 33.308 | 3.864 | n/a | 0.000 | 0.073 | 1.177 | 0.926 | 0.014 | 0.000 | 0.319 | 9.760 | 17.149 | n/a | 0.028 | 3.936 | 0.118 | 0.028 | tx/thread-86/transactor.triplex-function | none observed |
| 35a94b370f22d0800000000000000f95 | 31.971 | 1.323 | n/a | 0.000 | 0.014 | 0.395 | 1.139 | 0.015 | 0.000 | 0.061 | 21.345 | 7.671 | n/a | 0.008 | 1.336 | 0.042 | 0.008 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.019ms |

## P2 / L256 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.954 | 0.163 | 0.000 | 0.488 | 2.609 | n/a | 0.000 | 0.049 | 0.682 | 1.103 | 0.017 | 0.000 | 0.135 | 4.988 | 0.857 | n/a | 0.026 | 2.668 | 0.230 | 0.026 |
| p99 | 34.874 | 2.994 | 0.000 | 1.952 | 5.926 | n/a | 0.000 | 1.892 | 1.471 | 21.006 | 0.055 | 0.000 | 0.930 | 12.073 | 6.199 | n/a | 0.065 | 6.006 | 0.472 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d0800000000000001d2e | 34.874 | 1.906 | n/a | 0.000 | 0.042 | 0.469 | 21.006 | 0.021 | 0.000 | 0.044 | 7.396 | 3.971 | n/a | 0.019 | 1.948 | 0.056 | 0.019 | gw-w/thread-68/commit.prepare-and-validate | none observed |
| 35a94b370f22d0800000000000001d41 | 22.358 | 5.631 | n/a | 0.000 | 0.131 | 1.124 | 1.600 | 0.055 | 0.000 | 0.266 | 9.048 | 4.452 | n/a | 0.051 | 5.762 | 0.258 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d36 | 18.076 | 3.479 | n/a | 0.000 | 0.051 | 0.775 | 1.863 | 0.028 | 0.000 | 0.867 | 4.795 | 6.199 | n/a | 0.020 | 3.530 | 0.195 | 0.020 | tx/thread-86/transactor.triplex-function | none observed |
| 35a94b370f22d0800000000000001d8a | 17.807 | 2.695 | n/a | 0.000 | 0.114 | 0.691 | 0.943 | 0.017 | 0.000 | 0.100 | 7.267 | 5.941 | n/a | 0.040 | 2.808 | 0.158 | 0.040 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.371ms |
| 35a94b370f22d0800000000000001d3c | 17.410 | 2.554 | n/a | 0.000 | 0.049 | 0.457 | 0.972 | 0.012 | 0.000 | 0.305 | 10.353 | 2.685 | n/a | 0.023 | 2.603 | 0.150 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d38 | 17.224 | 2.147 | n/a | 0.000 | 0.039 | 0.763 | 1.550 | 0.027 | 0.000 | 0.440 | 8.417 | 3.814 | n/a | 0.026 | 2.186 | 0.127 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d99 | 16.866 | 4.840 | n/a | 0.000 | 0.042 | 0.793 | 1.661 | 0.018 | 0.000 | 0.477 | 7.652 | 1.351 | n/a | 0.033 | 4.881 | 0.289 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d28 | 16.768 | 2.427 | n/a | 0.000 | 0.077 | 0.499 | 0.839 | 0.015 | 0.000 | 0.050 | 12.073 | 0.759 | n/a | 0.030 | 2.504 | 0.149 | 0.030 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d53 | 16.646 | 2.609 | n/a | 0.000 | 0.059 | 0.789 | 1.270 | 0.021 | 0.000 | 0.135 | 8.005 | 3.729 | n/a | 0.031 | 2.668 | 0.160 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d59 | 16.478 | 5.233 | n/a | 0.000 | 0.036 | 0.763 | 2.401 | 0.023 | 0.000 | 0.205 | 5.563 | 2.235 | n/a | 0.018 | 5.270 | 0.320 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d9f | 15.903 | 3.963 | n/a | 0.000 | 0.081 | 1.437 | 0.987 | 0.013 | 0.000 | 0.067 | 5.085 | 4.241 | n/a | 0.030 | 4.044 | 0.254 | 0.030 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d8e | 15.843 | 5.926 | n/a | 0.000 | 0.080 | 0.735 | 1.207 | 0.016 | 0.000 | 0.135 | 4.832 | 2.868 | n/a | 0.043 | 6.006 | 0.379 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d65 | 15.365 | 3.272 | n/a | 0.000 | 1.687 | 0.457 | 1.146 | 0.013 | 0.000 | 0.109 | 4.285 | 4.382 | n/a | 0.014 | 4.959 | 0.323 | 0.014 | tx/thread-86/transactor.triplex-function | none observed |
| 35a94b370f22d0800000000000001d94 | 15.236 | 1.813 | n/a | 0.000 | 0.042 | 0.684 | 1.800 | 0.031 | 0.000 | 0.150 | 10.066 | 0.631 | n/a | 0.020 | 1.855 | 0.122 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d7b | 14.730 | 3.062 | n/a | 0.000 | 0.073 | 0.861 | 1.378 | 0.023 | 0.000 | 0.129 | 6.523 | 2.651 | n/a | 0.030 | 3.135 | 0.213 | 0.030 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.578ms |
| 35a94b370f22d0800000000000001d3e | 14.541 | 4.338 | n/a | 0.000 | 0.083 | 1.344 | 1.577 | 0.018 | 0.000 | 0.121 | 4.826 | 2.195 | n/a | 0.039 | 4.422 | 0.304 | 0.039 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d6d | 13.922 | 4.526 | n/a | 0.000 | 0.049 | 0.748 | 1.541 | 0.023 | 0.000 | 0.176 | 5.980 | 0.851 | n/a | 0.028 | 4.574 | 0.329 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d7f | 13.697 | 1.980 | n/a | 0.000 | 0.040 | 0.423 | 1.088 | 0.013 | 0.000 | 0.105 | 6.638 | 3.389 | n/a | 0.020 | 2.021 | 0.148 | 0.020 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001da9 | 13.383 | 3.178 | n/a | 0.000 | 1.892 | 0.676 | 1.086 | 0.014 | 0.000 | 0.080 | 5.897 | 0.533 | n/a | 0.026 | 5.070 | 0.379 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.593ms |
| 35a94b370f22d0800000000000001d43 | 13.349 | 1.475 | n/a | 0.000 | 0.031 | 0.425 | 0.741 | 0.013 | 0.000 | 0.072 | 5.400 | 5.173 | n/a | 0.020 | 1.506 | 0.113 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.297 | 0.000 | 0.000 | 0.440 | 2.499 | n/a | 0.000 | 0.049 | 0.649 | 1.055 | 0.016 | 0.000 | 0.129 | 5.020 | 0.759 | n/a | 0.025 | 2.578 | 0.217 | 0.025 |
| p99 | 34.874 | 1.007 | 0.000 | 0.867 | 3.465 | n/a | 0.000 | 1.892 | 1.471 | 21.006 | 0.032 | 0.000 | 0.930 | 12.073 | 5.941 | n/a | 0.065 | 5.070 | 0.429 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d0800000000000001d2e | 34.874 | 1.906 | n/a | 0.000 | 0.042 | 0.469 | 21.006 | 0.021 | 0.000 | 0.044 | 7.396 | 3.971 | n/a | 0.019 | 1.948 | 0.056 | 0.019 | gw-w/thread-68/commit.prepare-and-validate | none observed |
| 35a94b370f22d0800000000000001d8a | 17.807 | 2.695 | n/a | 0.000 | 0.114 | 0.691 | 0.943 | 0.017 | 0.000 | 0.100 | 7.267 | 5.941 | n/a | 0.040 | 2.808 | 0.158 | 0.040 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.371ms |
| 35a94b370f22d0800000000000001d3c | 17.410 | 2.554 | n/a | 0.000 | 0.049 | 0.457 | 0.972 | 0.012 | 0.000 | 0.305 | 10.353 | 2.685 | n/a | 0.023 | 2.603 | 0.150 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d28 | 16.768 | 2.427 | n/a | 0.000 | 0.077 | 0.499 | 0.839 | 0.015 | 0.000 | 0.050 | 12.073 | 0.759 | n/a | 0.030 | 2.504 | 0.149 | 0.030 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d53 | 16.646 | 2.609 | n/a | 0.000 | 0.059 | 0.789 | 1.270 | 0.021 | 0.000 | 0.135 | 8.005 | 3.729 | n/a | 0.031 | 2.668 | 0.160 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d94 | 15.236 | 1.813 | n/a | 0.000 | 0.042 | 0.684 | 1.800 | 0.031 | 0.000 | 0.150 | 10.066 | 0.631 | n/a | 0.020 | 1.855 | 0.122 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d7f | 13.697 | 1.980 | n/a | 0.000 | 0.040 | 0.423 | 1.088 | 0.013 | 0.000 | 0.105 | 6.638 | 3.389 | n/a | 0.020 | 2.021 | 0.148 | 0.020 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001da9 | 13.383 | 3.178 | n/a | 0.000 | 1.892 | 0.676 | 1.086 | 0.014 | 0.000 | 0.080 | 5.897 | 0.533 | n/a | 0.026 | 5.070 | 0.379 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.593ms |
| 35a94b370f22d0800000000000001d43 | 13.349 | 1.475 | n/a | 0.000 | 0.031 | 0.425 | 0.741 | 0.013 | 0.000 | 0.072 | 5.400 | 5.173 | n/a | 0.020 | 1.506 | 0.113 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d88 | 12.863 | 2.692 | n/a | 0.000 | 0.063 | 0.706 | 1.055 | 0.021 | 0.000 | 0.172 | 5.206 | 2.919 | n/a | 0.028 | 2.754 | 0.214 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d6f | 12.144 | 2.553 | n/a | 0.000 | 0.042 | 0.907 | 1.687 | 0.027 | 0.000 | 0.129 | 4.873 | 1.903 | n/a | 0.023 | 2.595 | 0.214 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d30 | 12.134 | 3.358 | n/a | 0.000 | 0.049 | 0.667 | 1.311 | 0.019 | 0.000 | 0.451 | 4.278 | 1.969 | n/a | 0.031 | 3.407 | 0.281 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d33 | 12.132 | 2.510 | n/a | 0.000 | 0.068 | 0.649 | 0.808 | 0.014 | 0.000 | 0.281 | 5.020 | 2.737 | n/a | 0.044 | 2.578 | 0.213 | 0.044 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.777ms |
| 35a94b370f22d0800000000000001d77 | 11.954 | 1.998 | n/a | 0.000 | 0.067 | 0.524 | 1.025 | 0.014 | 0.000 | 0.076 | 7.373 | 0.857 | n/a | 0.020 | 2.065 | 0.173 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d96 | 11.501 | 2.499 | n/a | 0.000 | 0.090 | 1.471 | 1.704 | 0.031 | 0.000 | 0.124 | 4.962 | 0.584 | n/a | 0.036 | 2.589 | 0.225 | 0.036 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d21 | 11.455 | 2.753 | n/a | 0.000 | 0.101 | 0.682 | 1.473 | 0.027 | 0.000 | 0.930 | 4.932 | 0.522 | n/a | 0.035 | 2.854 | 0.249 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.356ms |
| 35a94b370f22d0800000000000001dab | 11.408 | 2.829 | n/a | 0.000 | 0.043 | 0.905 | 1.685 | 0.029 | 0.000 | 0.125 | 5.175 | 0.595 | n/a | 0.022 | 2.872 | 0.252 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d68 | 11.297 | 3.446 | n/a | 0.000 | 0.130 | 1.046 | 1.271 | 0.023 | 0.000 | 0.422 | 4.386 | 0.527 | n/a | 0.047 | 3.575 | 0.316 | 0.047 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.922ms |
| 35a94b370f22d0800000000000001d4b | 11.067 | 2.966 | n/a | 0.000 | 0.104 | 0.752 | 0.914 | 0.015 | 0.000 | 0.089 | 5.031 | 1.160 | n/a | 0.036 | 3.070 | 0.277 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001d4e | 10.962 | 3.465 | n/a | 0.000 | 0.039 | 0.791 | 0.802 | 0.012 | 0.000 | 0.262 | 4.570 | 1.001 | n/a | 0.020 | 3.504 | 0.320 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (52 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.009 | 0.000 | 0.000 | 0.559 | 2.593 | n/a | 0.000 | 0.047 | 0.639 | 1.089 | 0.016 | 0.000 | 0.123 | 4.787 | 1.466 | n/a | 0.022 | 2.808 | 0.229 | 0.022 |
| p99 | 28.166 | 2.765 | 0.000 | 2.536 | 5.578 | n/a | 3.063 | 3.217 | 5.027 | 14.049 | 0.061 | 0.000 | 0.973 | 10.485 | 8.492 | n/a | 0.057 | 8.681 | 0.462 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d0800000000000001de8 | 28.166 | 4.663 | n/a | 0.000 | 0.038 | 5.027 | 14.049 | 0.061 | 0.000 | 0.375 | 1.800 | 2.132 | n/a | 0.021 | 4.701 | 0.167 | 0.021 | gw-w/thread-46/gateway.admitted-work | none observed |
| 35a94b370f22d0800000000000001dc8 | 25.822 | 4.573 | n/a | 0.000 | 0.077 | 1.599 | 13.485 | 0.047 | 0.000 | 0.132 | 3.360 | 2.517 | n/a | 0.031 | 4.650 | 0.180 | 0.031 | gw-w/thread-68/storage/begin-command! | none observed |
| 35a94b370f22d0800000000000001dc3 | 21.619 | 4.746 | n/a | 0.000 | 0.044 | 0.677 | 2.373 | 0.024 | 0.000 | 0.093 | 9.338 | 4.303 | n/a | 0.021 | 4.790 | 0.222 | 0.021 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001dc0 | 19.756 | 2.985 | n/a | 0.000 | 0.048 | 0.617 | 1.047 | 0.014 | 0.000 | 0.081 | 6.453 | 8.492 | n/a | 0.019 | 3.033 | 0.154 | 0.019 | tx/thread-86/transactor.triplex-function | none observed |
| 35a94b370f22d0800000000000001e43 | 18.777 | 5.578 | n/a | 3.063 | 0.041 | 0.695 | 1.090 | 0.013 | 0.000 | 0.054 | 6.067 | 2.142 | n/a | 0.035 | 8.681 | 0.462 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001de5 | 18.595 | 3.392 | n/a | 0.000 | 0.057 | 0.992 | 1.281 | 0.033 | 0.000 | 0.124 | 6.708 | 5.977 | n/a | 0.031 | 3.449 | 0.185 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001dc5 | 18.513 | 2.739 | n/a | 0.000 | 0.039 | 0.678 | 1.473 | 0.021 | 0.000 | 0.084 | 10.485 | 2.974 | n/a | 0.020 | 2.778 | 0.150 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.280ms |
| 35a94b370f22d0800000000000001dc9 | 18.430 | 1.962 | n/a | 0.000 | 0.039 | 2.066 | 2.431 | 0.015 | 0.000 | 0.085 | 7.720 | 4.091 | n/a | 0.020 | 2.001 | 0.109 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001db4 | 18.220 | 2.215 | n/a | 0.000 | 0.040 | 1.615 | 0.923 | 0.014 | 0.000 | 0.898 | 8.698 | 3.795 | n/a | 0.022 | 2.255 | 0.124 | 0.022 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001de9 | 17.551 | 3.964 | n/a | 0.000 | 2.970 | 0.658 | 1.088 | 0.017 | 0.000 | 0.093 | 6.971 | 1.763 | n/a | 0.028 | 6.934 | 0.395 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001dd1 | 16.285 | 2.997 | n/a | 0.000 | 0.052 | 0.537 | 1.125 | 0.015 | 0.000 | 0.314 | 5.299 | 5.926 | n/a | 0.021 | 3.048 | 0.187 | 0.021 | tx/thread-86/transactor.triplex-function | none observed |
| 35a94b370f22d0800000000000001e23 | 15.778 | 3.548 | n/a | 0.000 | 0.042 | 0.677 | 1.210 | 0.013 | 0.000 | 0.080 | 8.567 | 1.613 | n/a | 0.028 | 3.590 | 0.228 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.351ms |
| 35a94b370f22d0800000000000001e21 | 15.526 | 2.642 | n/a | 0.000 | 0.075 | 0.828 | 1.254 | 0.023 | 0.000 | 0.123 | 8.981 | 1.567 | n/a | 0.033 | 2.717 | 0.175 | 0.033 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001ddf | 15.314 | 1.725 | n/a | 0.000 | 0.044 | 0.703 | 1.619 | 0.030 | 0.000 | 0.619 | 5.879 | 4.666 | n/a | 0.029 | 1.769 | 0.116 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e13 | 15.055 | 1.716 | n/a | 0.000 | 1.667 | 0.498 | 0.917 | 0.013 | 0.000 | 0.262 | 9.017 | 0.951 | n/a | 0.015 | 3.382 | 0.225 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.224ms |
| 35a94b370f22d0800000000000001db9 | 14.938 | 3.819 | n/a | 0.000 | 0.154 | 0.978 | 1.197 | 0.022 | 0.000 | 0.175 | 5.080 | 3.457 | n/a | 0.057 | 3.973 | 0.266 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001de2 | 14.854 | 3.590 | n/a | 0.000 | 0.065 | 0.607 | 1.474 | 0.023 | 0.000 | 0.124 | 5.794 | 3.147 | n/a | 0.030 | 3.655 | 0.246 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001dfd | 14.770 | 5.389 | n/a | 0.000 | 0.128 | 1.052 | 1.459 | 0.023 | 0.000 | 0.120 | 5.494 | 1.056 | n/a | 0.048 | 5.517 | 0.374 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e26 | 13.732 | 2.500 | n/a | 0.000 | 3.217 | 2.786 | 0.604 | 0.008 | 0.000 | 0.077 | 4.160 | 0.366 | n/a | 0.013 | 5.717 | 0.416 | 0.013 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.055ms |
| 35a94b370f22d0800000000000001dce | 13.584 | 1.872 | n/a | 0.000 | 0.045 | 0.574 | 1.730 | 0.024 | 0.000 | 0.220 | 6.168 | 2.931 | n/a | 0.021 | 1.917 | 0.141 | 0.021 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.279 | 0.000 | 0.000 | 0.443 | 2.320 | n/a | 0.000 | 0.047 | 0.638 | 1.017 | 0.016 | 0.000 | 0.132 | 4.161 | 1.107 | n/a | 0.022 | 2.455 | 0.229 | 0.022 |
| p99 | 28.166 | 2.001 | 0.000 | 2.464 | 4.663 | n/a | 1.372 | 3.217 | 5.027 | 14.049 | 0.061 | 0.000 | 0.898 | 9.017 | 5.977 | n/a | 0.057 | 6.934 | 0.462 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d0800000000000001de8 | 28.166 | 4.663 | n/a | 0.000 | 0.038 | 5.027 | 14.049 | 0.061 | 0.000 | 0.375 | 1.800 | 2.132 | n/a | 0.021 | 4.701 | 0.167 | 0.021 | gw-w/thread-46/gateway.admitted-work | none observed |
| 35a94b370f22d0800000000000001dc8 | 25.822 | 4.573 | n/a | 0.000 | 0.077 | 1.599 | 13.485 | 0.047 | 0.000 | 0.132 | 3.360 | 2.517 | n/a | 0.031 | 4.650 | 0.180 | 0.031 | gw-w/thread-68/storage/begin-command! | none observed |
| 35a94b370f22d0800000000000001de5 | 18.595 | 3.392 | n/a | 0.000 | 0.057 | 0.992 | 1.281 | 0.033 | 0.000 | 0.124 | 6.708 | 5.977 | n/a | 0.031 | 3.449 | 0.185 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001db4 | 18.220 | 2.215 | n/a | 0.000 | 0.040 | 1.615 | 0.923 | 0.014 | 0.000 | 0.898 | 8.698 | 3.795 | n/a | 0.022 | 2.255 | 0.124 | 0.022 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001de9 | 17.551 | 3.964 | n/a | 0.000 | 2.970 | 0.658 | 1.088 | 0.017 | 0.000 | 0.093 | 6.971 | 1.763 | n/a | 0.028 | 6.934 | 0.395 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e21 | 15.526 | 2.642 | n/a | 0.000 | 0.075 | 0.828 | 1.254 | 0.023 | 0.000 | 0.123 | 8.981 | 1.567 | n/a | 0.033 | 2.717 | 0.175 | 0.033 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001ddf | 15.314 | 1.725 | n/a | 0.000 | 0.044 | 0.703 | 1.619 | 0.030 | 0.000 | 0.619 | 5.879 | 4.666 | n/a | 0.029 | 1.769 | 0.116 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e13 | 15.055 | 1.716 | n/a | 0.000 | 1.667 | 0.498 | 0.917 | 0.013 | 0.000 | 0.262 | 9.017 | 0.951 | n/a | 0.015 | 3.382 | 0.225 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.224ms |
| 35a94b370f22d0800000000000001db9 | 14.938 | 3.819 | n/a | 0.000 | 0.154 | 0.978 | 1.197 | 0.022 | 0.000 | 0.175 | 5.080 | 3.457 | n/a | 0.057 | 3.973 | 0.266 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e26 | 13.732 | 2.500 | n/a | 0.000 | 3.217 | 2.786 | 0.604 | 0.008 | 0.000 | 0.077 | 4.160 | 0.366 | n/a | 0.013 | 5.717 | 0.416 | 0.013 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.055ms |
| 35a94b370f22d0800000000000001dce | 13.584 | 1.872 | n/a | 0.000 | 0.045 | 0.574 | 1.730 | 0.024 | 0.000 | 0.220 | 6.168 | 2.931 | n/a | 0.021 | 1.917 | 0.141 | 0.021 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001df6 | 12.641 | 2.508 | n/a | 0.000 | 1.422 | 0.429 | 0.832 | 0.012 | 0.000 | 0.309 | 3.680 | 3.434 | n/a | 0.015 | 3.931 | 0.311 | 0.015 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001dd5 | 11.357 | 2.762 | n/a | 0.000 | 0.049 | 0.639 | 1.016 | 0.017 | 0.000 | 0.135 | 4.787 | 1.927 | n/a | 0.026 | 2.810 | 0.247 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001df4 | 11.188 | 2.805 | n/a | 0.000 | 0.081 | 0.682 | 0.928 | 0.016 | 0.000 | 0.348 | 4.434 | 1.864 | n/a | 0.030 | 2.886 | 0.258 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e3f | 11.052 | 3.692 | n/a | 1.372 | 0.046 | 0.638 | 1.070 | 0.013 | 0.000 | 0.104 | 3.489 | 0.586 | n/a | 0.042 | 5.110 | 0.462 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001db6 | 10.532 | 1.984 | n/a | 0.000 | 0.042 | 0.452 | 1.163 | 0.016 | 0.000 | 0.098 | 5.845 | 0.912 | n/a | 0.019 | 2.027 | 0.192 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e2b | 10.336 | 2.169 | n/a | 0.000 | 0.055 | 0.596 | 1.070 | 0.017 | 0.000 | 0.139 | 5.568 | 0.692 | n/a | 0.028 | 2.225 | 0.215 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e15 | 10.279 | 2.320 | n/a | 0.000 | 0.050 | 0.721 | 1.374 | 0.022 | 0.000 | 0.118 | 4.644 | 1.010 | n/a | 0.020 | 2.370 | 0.231 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e0c | 10.206 | 2.593 | n/a | 0.000 | 0.070 | 0.663 | 0.856 | 0.013 | 0.000 | 0.087 | 4.787 | 1.107 | n/a | 0.031 | 2.663 | 0.261 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001ddc | 10.069 | 3.554 | n/a | 0.000 | 0.071 | 0.627 | 0.800 | 0.012 | 0.000 | 0.095 | 3.055 | 1.823 | n/a | 0.031 | 3.625 | 0.360 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.590 | 0.610 | 0.000 | 0.534 | 3.963 | n/a | 0.000 | 0.088 | 0.773 | 1.105 | 0.018 | 0.000 | 0.128 | 5.114 | 1.139 | n/a | 0.040 | 4.283 | 0.350 | 0.040 |
| p99 | 22.062 | 4.063 | 0.000 | 4.616 | 7.126 | n/a | 2.484 | 1.279 | 1.228 | 3.030 | 0.047 | 0.000 | 0.521 | 6.549 | 2.554 | n/a | 0.075 | 10.696 | 0.485 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d0800000000000001e5c | 22.062 | 7.126 | n/a | 2.484 | 1.085 | 0.923 | 3.030 | 0.045 | 0.000 | 0.255 | 5.574 | 1.484 | n/a | 0.055 | 10.696 | 0.485 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e4f | 17.166 | 5.136 | n/a | 1.723 | 0.797 | 0.675 | 1.105 | 0.012 | 0.000 | 0.087 | 5.280 | 2.323 | n/a | 0.027 | 7.656 | 0.446 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e68 | 17.120 | 5.013 | n/a | 2.272 | 0.065 | 0.719 | 1.788 | 0.018 | 0.000 | 0.521 | 5.176 | 1.485 | n/a | 0.062 | 7.351 | 0.429 | 0.062 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e60 | 14.820 | 4.042 | n/a | 0.000 | 0.127 | 1.228 | 1.261 | 0.019 | 0.000 | 0.128 | 5.386 | 2.554 | n/a | 0.075 | 4.169 | 0.281 | 0.075 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e6d | 14.671 | 3.963 | n/a | 0.000 | 0.801 | 1.169 | 1.589 | 0.047 | 0.000 | 0.173 | 4.800 | 2.099 | n/a | 0.031 | 4.764 | 0.325 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e72 | 14.480 | 5.046 | n/a | 0.000 | 0.049 | 1.161 | 1.390 | 0.025 | 0.000 | 0.083 | 5.505 | 1.178 | n/a | 0.043 | 5.095 | 0.352 | 0.043 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e55 | 13.502 | 5.134 | n/a | 0.000 | 0.057 | 0.645 | 0.958 | 0.018 | 0.000 | 0.095 | 5.724 | 0.830 | n/a | 0.042 | 5.192 | 0.385 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e51 | 12.235 | 2.639 | n/a | 1.602 | 0.042 | 0.637 | 1.045 | 0.016 | 0.000 | 0.426 | 5.114 | 0.667 | n/a | 0.046 | 4.283 | 0.350 | 0.046 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e70 | 11.590 | 4.327 | n/a | 0.000 | 0.101 | 0.605 | 1.037 | 0.017 | 0.000 | 0.130 | 4.591 | 0.719 | n/a | 0.063 | 4.428 | 0.382 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e59 | 11.583 | 2.893 | n/a | 0.000 | 0.042 | 0.956 | 1.866 | 0.033 | 0.000 | 0.505 | 4.460 | 0.788 | n/a | 0.040 | 2.935 | 0.253 | 0.040 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e48 | 11.456 | 1.942 | n/a | 0.000 | 0.052 | 0.784 | 1.494 | 0.025 | 0.000 | 0.093 | 6.549 | 0.483 | n/a | 0.034 | 1.994 | 0.174 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e4c | 11.205 | 2.356 | n/a | 0.000 | 1.279 | 0.845 | 1.024 | 0.017 | 0.000 | 0.326 | 3.372 | 1.952 | n/a | 0.035 | 3.635 | 0.324 | 0.035 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e57 | 10.157 | 1.888 | n/a | 0.000 | 0.099 | 0.551 | 0.866 | 0.014 | 0.000 | 0.074 | 5.144 | 1.496 | n/a | 0.025 | 1.987 | 0.196 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e65 | 9.817 | 2.990 | n/a | 0.000 | 1.052 | 0.773 | 0.875 | 0.013 | 0.000 | 0.065 | 3.434 | 0.575 | n/a | 0.040 | 4.042 | 0.412 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e63 | 9.324 | 2.225 | n/a | 0.000 | 0.088 | 0.443 | 0.860 | 0.014 | 0.000 | 0.331 | 4.170 | 1.139 | n/a | 0.054 | 2.312 | 0.248 | 0.054 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e6c | 8.858 | 4.240 | n/a | 0.000 | 0.045 | 1.155 | 1.616 | 0.021 | 0.000 | 0.114 | 1.445 | 0.182 | n/a | 0.039 | 4.286 | 0.484 | 0.039 | node-14/thread-0/driver.execute | driver.reader-basis.broadcast 0.309ms |

## P2 / tail / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.205 | 0.000 | 0.000 | 0.461 | 2.893 | n/a | 0.000 | 0.099 | 0.784 | 1.037 | 0.017 | 0.000 | 0.128 | 4.460 | 0.788 | n/a | 0.039 | 3.635 | 0.281 | 0.039 |
| p99 | 14.820 | 1.315 | 0.000 | 0.871 | 4.327 | n/a | 0.000 | 1.279 | 1.228 | 1.866 | 0.047 | 0.000 | 0.505 | 6.549 | 2.554 | n/a | 0.075 | 4.764 | 0.484 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 35a94b370f22d0800000000000001e60 | 14.820 | 4.042 | n/a | 0.000 | 0.127 | 1.228 | 1.261 | 0.019 | 0.000 | 0.128 | 5.386 | 2.554 | n/a | 0.075 | 4.169 | 0.281 | 0.075 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e6d | 14.671 | 3.963 | n/a | 0.000 | 0.801 | 1.169 | 1.589 | 0.047 | 0.000 | 0.173 | 4.800 | 2.099 | n/a | 0.031 | 4.764 | 0.325 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e70 | 11.590 | 4.327 | n/a | 0.000 | 0.101 | 0.605 | 1.037 | 0.017 | 0.000 | 0.130 | 4.591 | 0.719 | n/a | 0.063 | 4.428 | 0.382 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e59 | 11.583 | 2.893 | n/a | 0.000 | 0.042 | 0.956 | 1.866 | 0.033 | 0.000 | 0.505 | 4.460 | 0.788 | n/a | 0.040 | 2.935 | 0.253 | 0.040 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e48 | 11.456 | 1.942 | n/a | 0.000 | 0.052 | 0.784 | 1.494 | 0.025 | 0.000 | 0.093 | 6.549 | 0.483 | n/a | 0.034 | 1.994 | 0.174 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e4c | 11.205 | 2.356 | n/a | 0.000 | 1.279 | 0.845 | 1.024 | 0.017 | 0.000 | 0.326 | 3.372 | 1.952 | n/a | 0.035 | 3.635 | 0.324 | 0.035 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e57 | 10.157 | 1.888 | n/a | 0.000 | 0.099 | 0.551 | 0.866 | 0.014 | 0.000 | 0.074 | 5.144 | 1.496 | n/a | 0.025 | 1.987 | 0.196 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e65 | 9.817 | 2.990 | n/a | 0.000 | 1.052 | 0.773 | 0.875 | 0.013 | 0.000 | 0.065 | 3.434 | 0.575 | n/a | 0.040 | 4.042 | 0.412 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e63 | 9.324 | 2.225 | n/a | 0.000 | 0.088 | 0.443 | 0.860 | 0.014 | 0.000 | 0.331 | 4.170 | 1.139 | n/a | 0.054 | 2.312 | 0.248 | 0.054 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 35a94b370f22d0800000000000001e6c | 8.858 | 4.240 | n/a | 0.000 | 0.045 | 1.155 | 1.616 | 0.021 | 0.000 | 0.114 | 1.445 | 0.182 | n/a | 0.039 | 4.286 | 0.484 | 0.039 | node-14/thread-0/driver.execute | driver.reader-basis.broadcast 0.309ms |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 200.945 | n/a | n/a | n/a | 2.506 | n/a | 0.000 | 0.000 | 1.733 | 200.517 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.143 | 2.506 | 0.006 | 0.143 |
| p99 | 407.522 | n/a | n/a | n/a | 19.806 | n/a | 4.734 | 0.000 | 3.447 | 393.422 | 0.200 | 15.000 | 0.178 | 0.000 | n/a | n/a | 0.336 | 24.245 | 0.306 | 0.336 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 17d3f915c4efb4770000000000000002 | 407.522 | 2.506 | n/a | 0.000 | 0.000 | 2.430 | 393.422 | 0.200 | 8.450 | 0.178 | 0.000 | n/a | n/a | 0.336 | 2.506 | 0.006 | 0.336 | gw-r/thread-52/gateway.admitted-work | none observed |
| 61bfd503864eb7040000000000000005 | 203.559 | 0.101 | n/a | 0.000 | 0.000 | 1.733 | 201.392 | 0.016 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.177 | 0.101 | 0.000 | 0.177 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000006 | 202.486 | 0.200 | n/a | 0.000 | 0.000 | 1.020 | 200.980 | 0.015 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.151 | 0.200 | 0.001 | 0.151 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb7040000000000001043 | 201.645 | 0.024 | n/a | 0.000 | 0.000 | 0.476 | 201.010 | 0.008 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.063 | 0.024 | 0.000 | 0.063 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000001044 | 200.945 | 0.018 | n/a | 0.000 | 0.000 | 0.332 | 200.517 | 0.003 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.045 | 0.018 | 0.000 | 0.045 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb7040000000000001049 | 99.487 | 19.511 | n/a | 4.734 | 0.000 | 3.128 | 71.968 | 0.004 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.138 | 24.245 | 0.244 | 0.138 | gw-r/thread-47/gateway.admitted-work | none observed |
| 61bfd503864eb7040000000000001048 | 64.698 | 19.806 | n/a | 0.000 | 0.000 | 3.197 | 41.529 | 0.003 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.158 | 19.806 | 0.306 | 0.158 | gw-r/thread-45/gateway.admitted-work | none observed |
| 61bfd503864eb7040000000000001047 | 63.257 | 17.643 | n/a | 0.857 | 0.000 | 3.447 | 41.178 | 0.003 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.125 | 18.499 | 0.292 | 0.125 | gw-r/thread-50/gateway.admitted-work | none observed |
| 61bfd503864eb704000000000000104a | 52.199 | 6.761 | n/a | 1.465 | 0.000 | 1.684 | 27.138 | 0.004 | 15.000 | 0.004 | 0.000 | n/a | n/a | 0.143 | 8.226 | 0.158 | 0.143 | gw-r/thread-70/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1005.073 | n/a | n/a | n/a | 0.315 | n/a | 0.000 | 0.000 | 1.616 | 1001.585 | 0.015 | 0.000 | 0.295 | 0.000 | n/a | n/a | 1.247 | 0.315 | 0.000 | 1.247 |
| p99 | 1005.073 | n/a | n/a | n/a | 0.315 | n/a | 0.000 | 0.000 | 1.616 | 1001.585 | 0.015 | 0.000 | 0.295 | 0.000 | n/a | n/a | 1.247 | 0.315 | 0.000 | 1.247 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 17d3f915c4efb47700000000000000a4 | 1005.073 | 0.315 | n/a | 0.000 | 0.000 | 1.616 | 1001.585 | 0.015 | 0.000 | 0.295 | 0.000 | n/a | n/a | 1.247 | 0.315 | 0.000 | 1.247 | gw-r/thread-51/journal/page | none observed |

## P3 / warmup / internal (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 849.851 | n/a | n/a | n/a | 2.194 | n/a | 0.000 | 0.000 | 0.710 | 833.813 | 0.012 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.157 | 2.194 | 0.005 | 0.157 |
| p99 | 1006.879 | n/a | n/a | n/a | 14.665 | n/a | 0.000 | 0.000 | 4.276 | 1002.250 | 0.040 | 28.361 | 0.323 | 0.000 | n/a | n/a | 1.156 | 14.665 | 0.243 | 1.156 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 17d3f915c4efb47700000000000000a7 | 1006.879 | 0.137 | n/a | 0.000 | 0.000 | 4.276 | 1001.217 | 0.013 | 0.000 | 0.133 | 0.000 | n/a | n/a | 1.102 | 0.137 | 0.000 | 1.102 | gw-r/thread-51/journal/page | none observed |
| 17d3f915c4efb47700000000000000b8 | 1004.444 | 0.188 | n/a | 0.000 | 0.000 | 0.690 | 1002.250 | 0.040 | 0.000 | 0.121 | 0.000 | n/a | n/a | 1.156 | 0.188 | 0.000 | 1.156 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb47700000000000000b1 | 1004.231 | 0.144 | n/a | 0.000 | 0.000 | 1.991 | 1000.888 | 0.025 | 0.000 | 0.077 | 0.000 | n/a | n/a | 1.105 | 0.144 | 0.000 | 1.105 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb47700000000000000ad | 1003.883 | 0.140 | n/a | 0.000 | 0.000 | 1.634 | 1000.903 | 0.013 | 0.000 | 0.095 | 0.000 | n/a | n/a | 1.098 | 0.140 | 0.000 | 1.098 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb47700000000000000bd | 1003.819 | 0.121 | n/a | 0.000 | 0.000 | 0.452 | 1001.993 | 0.027 | 0.000 | 0.121 | 0.000 | n/a | n/a | 1.104 | 0.121 | 0.000 | 1.104 | gw-r/thread-52/journal/page | none observed |
| 17d3f915c4efb47700000000000000aa | 1003.456 | 0.131 | n/a | 0.000 | 0.000 | 1.125 | 1000.988 | 0.013 | 0.000 | 0.101 | 0.000 | n/a | n/a | 1.099 | 0.131 | 0.000 | 1.099 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb47700000000000000c4 | 1003.413 | 0.119 | n/a | 0.000 | 0.000 | 0.563 | 1001.483 | 0.020 | 0.000 | 0.122 | 0.000 | n/a | n/a | 1.105 | 0.119 | 0.000 | 1.105 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb47700000000000000c9 | 1003.122 | 0.106 | n/a | 0.000 | 0.000 | 0.520 | 1001.272 | 0.023 | 0.000 | 0.106 | 0.000 | n/a | n/a | 1.095 | 0.106 | 0.000 | 1.095 | gw-r/thread-51/journal/page | none observed |
| 17d3f915c4efb47700000000000000b7 | 1002.971 | 0.123 | n/a | 0.000 | 0.000 | 0.503 | 1001.178 | 0.012 | 0.000 | 0.052 | 0.000 | n/a | n/a | 1.103 | 0.123 | 0.000 | 1.103 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb47700000000000000c1 | 968.520 | 2.254 | n/a | 0.000 | 0.000 | 0.577 | 965.586 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.071 | 2.254 | 0.002 | 0.071 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb47700000000000000b3 | 874.575 | 5.637 | n/a | 0.000 | 0.000 | 0.710 | 868.060 | 0.010 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.090 | 5.637 | 0.006 | 0.090 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb47700000000000000a5 | 849.851 | 14.665 | n/a | 0.000 | 0.000 | 0.835 | 833.813 | 0.010 | 0.000 | 0.323 | 0.000 | n/a | n/a | 0.205 | 14.665 | 0.017 | 0.205 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb47700000000000000bf | 646.244 | 1.893 | n/a | 0.000 | 0.000 | 0.642 | 643.558 | 0.010 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.074 | 1.893 | 0.003 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 17d3f915c4efb47700000000000000b9 | 481.982 | 2.588 | n/a | 0.000 | 0.000 | 0.936 | 478.225 | 0.011 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.149 | 2.588 | 0.005 | 0.149 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb47700000000000000b4 | 451.561 | 5.421 | n/a | 0.000 | 0.000 | 0.694 | 445.203 | 0.011 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.157 | 5.421 | 0.012 | 0.157 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb47700000000000000be | 360.978 | 5.923 | n/a | 0.000 | 0.000 | 0.699 | 354.126 | 0.013 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.126 | 5.923 | 0.016 | 0.126 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb47700000000000000b0 | 305.704 | 4.297 | n/a | 0.000 | 0.000 | 0.750 | 300.448 | 0.011 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.132 | 4.297 | 0.014 | 0.132 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb47700000000000000c5 | 285.522 | 2.382 | n/a | 0.000 | 0.000 | 2.350 | 252.290 | 0.009 | 28.361 | 0.055 | 0.000 | n/a | n/a | 0.074 | 2.382 | 0.008 | 0.074 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb47700000000000000bb | 255.103 | 3.773 | n/a | 0.000 | 0.000 | 2.148 | 248.957 | 0.018 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.081 | 3.773 | 0.015 | 0.081 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb47700000000000000c7 | 247.487 | 2.194 | n/a | 0.000 | 0.000 | 1.403 | 243.740 | 0.011 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.069 | 2.194 | 0.009 | 0.069 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (72 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 670.280 | n/a | n/a | n/a | 2.671 | n/a | 0.000 | 0.000 | 0.684 | 662.390 | 0.010 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.121 | 2.821 | 0.009 | 0.121 |
| p99 | 1008.510 | n/a | n/a | n/a | 11.755 | n/a | 2.430 | 0.000 | 4.185 | 1005.369 | 0.034 | 0.000 | 0.313 | 0.000 | n/a | n/a | 1.235 | 12.351 | 0.555 | 1.235 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 17d3f915c4efb4770000000000000117 | 1008.510 | 0.185 | n/a | 0.000 | 0.000 | 1.787 | 1005.369 | 0.008 | 0.000 | 0.014 | 0.000 | n/a | n/a | 1.148 | 0.185 | 0.000 | 1.148 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb4770000000000000139 | 1004.706 | 0.649 | n/a | 0.000 | 0.000 | 1.221 | 1001.542 | 0.005 | 0.000 | 0.054 | 0.000 | n/a | n/a | 1.235 | 0.649 | 0.001 | 1.235 | gw-r/thread-52/journal/page | none observed |
| 17d3f915c4efb47700000000000000d6 | 1004.396 | 0.113 | n/a | 0.000 | 0.000 | 2.365 | 1000.716 | 0.014 | 0.000 | 0.091 | 0.000 | n/a | n/a | 1.097 | 0.113 | 0.000 | 1.097 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb47700000000000000ff | 1003.937 | 0.161 | n/a | 0.000 | 0.000 | 0.607 | 1003.061 | 0.008 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.063 | 0.161 | 0.000 | 0.063 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb4770000000000000138 | 1003.802 | 0.127 | n/a | 0.000 | 0.000 | 0.754 | 1001.654 | 0.016 | 0.000 | 0.143 | 0.000 | n/a | n/a | 1.108 | 0.127 | 0.000 | 1.108 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb4770000000000000128 | 1003.654 | 0.251 | n/a | 0.000 | 0.000 | 0.920 | 1001.195 | 0.009 | 0.000 | 0.069 | 0.000 | n/a | n/a | 1.209 | 0.251 | 0.000 | 1.209 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb47700000000000000d0 | 1003.613 | 0.114 | n/a | 0.000 | 0.000 | 1.452 | 1000.847 | 0.014 | 0.000 | 0.091 | 0.000 | n/a | n/a | 1.094 | 0.114 | 0.000 | 1.094 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb4770000000000000103 | 1003.425 | 0.143 | n/a | 0.000 | 0.000 | 0.563 | 1001.451 | 0.015 | 0.000 | 0.125 | 0.000 | n/a | n/a | 1.127 | 0.143 | 0.000 | 1.127 | gw-r/thread-51/journal/page | none observed |
| 17d3f915c4efb47700000000000000d4 | 1003.361 | 0.121 | n/a | 0.000 | 0.000 | 0.493 | 1001.522 | 0.021 | 0.000 | 0.104 | 0.000 | n/a | n/a | 1.100 | 0.121 | 0.000 | 1.100 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb4770000000000000116 | 1003.227 | 0.245 | n/a | 0.000 | 0.000 | 1.203 | 1000.625 | 0.007 | 0.000 | 0.036 | 0.000 | n/a | n/a | 1.111 | 0.245 | 0.000 | 1.111 | gw-r/thread-51/journal/page | none observed |
| 17d3f915c4efb47700000000000000fc | 1003.213 | 0.117 | n/a | 0.000 | 0.000 | 0.790 | 1001.131 | 0.011 | 0.000 | 0.071 | 0.000 | n/a | n/a | 1.092 | 0.117 | 0.000 | 1.092 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb477000000000000012e | 1003.186 | 0.152 | n/a | 0.000 | 0.000 | 0.568 | 1001.226 | 0.031 | 0.000 | 0.064 | 0.000 | n/a | n/a | 1.146 | 0.152 | 0.000 | 1.146 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb47700000000000000cb | 1003.171 | 0.124 | n/a | 0.000 | 0.000 | 0.822 | 1000.957 | 0.015 | 0.000 | 0.140 | 0.000 | n/a | n/a | 1.113 | 0.124 | 0.000 | 1.113 | gw-r/thread-52/journal/page | none observed |
| 17d3f915c4efb4770000000000000109 | 1003.147 | 0.209 | n/a | 0.000 | 0.000 | 0.772 | 1000.938 | 0.009 | 0.000 | 0.074 | 0.000 | n/a | n/a | 1.145 | 0.209 | 0.000 | 1.145 | gw-r/thread-52/journal/page | none observed |
| 17d3f915c4efb477000000000000010b | 1003.138 | 0.145 | n/a | 0.000 | 0.000 | 0.698 | 1001.105 | 0.010 | 0.000 | 0.066 | 0.000 | n/a | n/a | 1.113 | 0.145 | 0.000 | 1.113 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb47700000000000000d5 | 1003.106 | 0.126 | n/a | 0.000 | 0.000 | 0.760 | 1001.016 | 0.012 | 0.000 | 0.091 | 0.000 | n/a | n/a | 1.102 | 0.126 | 0.000 | 1.102 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb4770000000000000113 | 1002.935 | 0.115 | n/a | 0.000 | 0.000 | 0.586 | 1001.035 | 0.019 | 0.000 | 0.078 | 0.000 | n/a | n/a | 1.102 | 0.115 | 0.000 | 1.102 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb47700000000000000f2 | 1002.765 | 0.180 | n/a | 0.000 | 0.000 | 0.542 | 1000.784 | 0.016 | 0.000 | 0.083 | 0.000 | n/a | n/a | 1.160 | 0.180 | 0.000 | 1.160 | gw-r/thread-51/journal/page | none observed |
| 17d3f915c4efb47700000000000000ca | 1002.753 | 0.127 | n/a | 0.000 | 0.000 | 0.719 | 1000.760 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 1.093 | 0.127 | 0.000 | 1.093 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb47700000000000000d1 | 1002.627 | 0.128 | n/a | 0.000 | 0.000 | 0.435 | 1000.870 | 0.015 | 0.000 | 0.087 | 0.000 | n/a | n/a | 1.093 | 0.128 | 0.000 | 1.093 | gw-r/thread-49/journal/page | none observed |

## P3 / L4 / internal (80 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 538.681 | n/a | n/a | n/a | 2.344 | n/a | 0.000 | 0.000 | 0.560 | 522.740 | 0.007 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.093 | 2.344 | 0.007 | 0.093 |
| p99 | 1006.224 | n/a | n/a | n/a | 8.083 | n/a | 0.906 | 0.000 | 5.562 | 1004.486 | 0.029 | 19.880 | 0.146 | 0.000 | n/a | n/a | 1.160 | 8.587 | 0.287 | 1.160 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 17d3f915c4efb47700000000000001ba | 1006.224 | 0.119 | n/a | 0.000 | 0.000 | 0.445 | 1004.486 | 0.007 | 0.000 | 0.054 | 0.000 | n/a | n/a | 1.113 | 0.119 | 0.000 | 1.113 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb47700000000000001ab | 1005.651 | 0.201 | n/a | 0.000 | 0.000 | 0.529 | 1003.742 | 0.007 | 0.000 | 0.044 | 0.000 | n/a | n/a | 1.128 | 0.201 | 0.000 | 1.128 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb4770000000000000189 | 1003.927 | 0.140 | n/a | 0.000 | 0.000 | 0.829 | 1001.759 | 0.010 | 0.000 | 0.086 | 0.000 | n/a | n/a | 1.103 | 0.140 | 0.000 | 1.103 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb4770000000000000146 | 1003.815 | 0.173 | n/a | 0.000 | 0.000 | 0.964 | 1001.471 | 0.021 | 0.000 | 0.081 | 0.000 | n/a | n/a | 1.105 | 0.173 | 0.000 | 1.105 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb4770000000000000153 | 1003.601 | 0.143 | n/a | 0.000 | 0.000 | 0.656 | 1001.554 | 0.016 | 0.000 | 0.129 | 0.000 | n/a | n/a | 1.104 | 0.143 | 0.000 | 1.104 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb47700000000000001a3 | 1003.578 | 0.119 | n/a | 0.000 | 0.000 | 0.732 | 1001.469 | 0.011 | 0.000 | 0.146 | 0.000 | n/a | n/a | 1.101 | 0.119 | 0.000 | 1.101 | gw-r/thread-52/journal/page | none observed |
| 17d3f915c4efb47700000000000001c6 | 1003.566 | 0.242 | n/a | 0.000 | 0.000 | 0.886 | 1001.197 | 0.012 | 0.000 | 0.068 | 0.000 | n/a | n/a | 1.160 | 0.242 | 0.000 | 1.160 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb4770000000000000195 | 1003.401 | 0.117 | n/a | 0.000 | 0.000 | 0.633 | 1001.476 | 0.007 | 0.000 | 0.064 | 0.000 | n/a | n/a | 1.103 | 0.117 | 0.000 | 1.103 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb477000000000000014d | 1003.305 | 0.147 | n/a | 0.000 | 0.000 | 0.511 | 1001.409 | 0.029 | 0.000 | 0.074 | 0.000 | n/a | n/a | 1.134 | 0.147 | 0.000 | 1.134 | gw-r/thread-51/journal/page | none observed |
| 17d3f915c4efb4770000000000000157 | 1003.254 | 0.155 | n/a | 0.000 | 0.000 | 0.540 | 1001.315 | 0.024 | 0.000 | 0.099 | 0.000 | n/a | n/a | 1.120 | 0.155 | 0.000 | 1.120 | gw-r/thread-51/journal/page | none observed |
| 17d3f915c4efb47700000000000001b5 | 1003.229 | 0.155 | n/a | 0.000 | 0.000 | 0.887 | 1001.005 | 0.008 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.116 | 0.155 | 0.000 | 1.116 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb4770000000000000196 | 1002.912 | 0.201 | n/a | 0.000 | 0.000 | 0.686 | 1000.851 | 0.005 | 0.000 | 0.018 | 0.000 | n/a | n/a | 1.150 | 0.201 | 0.000 | 1.150 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb477000000000000015f | 1002.853 | 0.169 | n/a | 0.000 | 0.000 | 0.551 | 1000.930 | 0.010 | 0.000 | 0.066 | 0.000 | n/a | n/a | 1.127 | 0.169 | 0.000 | 1.127 | gw-r/thread-52/journal/page | none observed |
| 17d3f915c4efb47700000000000001c1 | 1002.844 | 0.181 | n/a | 0.000 | 0.000 | 0.491 | 1000.948 | 0.010 | 0.000 | 0.100 | 0.000 | n/a | n/a | 1.114 | 0.181 | 0.000 | 1.114 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb477000000000000017d | 1002.735 | 0.148 | n/a | 0.000 | 0.000 | 0.564 | 1000.859 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 1.104 | 0.148 | 0.000 | 1.104 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb477000000000000017a | 1002.626 | 0.113 | n/a | 0.000 | 0.000 | 0.476 | 1000.867 | 0.006 | 0.000 | 0.068 | 0.000 | n/a | n/a | 1.096 | 0.113 | 0.000 | 1.096 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb4770000000000000162 | 1002.623 | 0.111 | n/a | 0.000 | 0.000 | 0.360 | 1000.967 | 0.017 | 0.000 | 0.071 | 0.000 | n/a | n/a | 1.097 | 0.111 | 0.000 | 1.097 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb477000000000000015b | 1002.615 | 0.107 | n/a | 0.000 | 0.000 | 0.428 | 1000.946 | 0.010 | 0.000 | 0.027 | 0.000 | n/a | n/a | 1.098 | 0.107 | 0.000 | 1.098 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb4770000000000000171 | 1002.562 | 0.119 | n/a | 0.000 | 0.000 | 0.388 | 1000.885 | 0.012 | 0.000 | 0.058 | 0.000 | n/a | n/a | 1.100 | 0.119 | 0.000 | 1.100 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb477000000000000014e | 1002.489 | 0.104 | n/a | 0.000 | 0.000 | 0.597 | 1000.651 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 1.097 | 0.104 | 0.000 | 1.097 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / internal (1488 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.522 | n/a | n/a | n/a | 3.319 | n/a | 0.000 | 0.000 | 0.524 | 8.786 | 0.004 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.078 | 3.319 | 0.272 | 0.078 |
| p99 | 323.550 | n/a | n/a | n/a | 14.391 | n/a | 1.172 | 0.000 | 4.420 | 320.233 | 0.327 | 0.000 | 0.072 | 0.000 | n/a | n/a | 1.094 | 14.810 | 0.841 | 1.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 17d3f915c4efb47700000000000001da | 1004.418 | 0.333 | n/a | 0.000 | 0.000 | 1.153 | 1001.608 | 0.014 | 0.000 | 0.110 | 0.000 | n/a | n/a | 1.199 | 0.333 | 0.000 | 1.199 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb47700000000000001cd | 1003.881 | 0.175 | n/a | 0.000 | 0.000 | 0.719 | 1001.731 | 0.016 | 0.000 | 0.124 | 0.000 | n/a | n/a | 1.117 | 0.175 | 0.000 | 1.117 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb47700000000000001d7 | 1003.495 | 0.108 | n/a | 0.000 | 0.000 | 1.723 | 1000.529 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 1.094 | 0.108 | 0.000 | 1.094 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb47700000000000001e5 | 1003.328 | 0.208 | n/a | 0.000 | 0.000 | 0.683 | 1001.202 | 0.011 | 0.000 | 0.083 | 0.000 | n/a | n/a | 1.140 | 0.208 | 0.000 | 1.140 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb47700000000000001dc | 1002.796 | 0.177 | n/a | 0.000 | 0.000 | 0.795 | 1000.683 | 0.003 | 0.000 | 0.024 | 0.000 | n/a | n/a | 1.114 | 0.177 | 0.000 | 1.114 | gw-r/thread-51/journal/page | none observed |
| 17d3f915c4efb47700000000000001e7 | 1002.698 | 0.141 | n/a | 0.000 | 0.000 | 0.777 | 1000.640 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 1.109 | 0.141 | 0.000 | 1.109 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb47700000000000001dd | 1002.203 | 0.115 | n/a | 0.000 | 0.000 | 0.326 | 1000.618 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 1.103 | 0.115 | 0.000 | 1.103 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb47700000000000001d8 | 1002.075 | 0.107 | n/a | 0.000 | 0.000 | 0.404 | 1000.454 | 0.004 | 0.000 | 0.012 | 0.000 | n/a | n/a | 1.094 | 0.107 | 0.000 | 1.094 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb47700000000000001c8 | 969.888 | 3.028 | n/a | 0.000 | 0.000 | 0.959 | 965.743 | 0.005 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.105 | 3.028 | 0.003 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb47700000000000001ca | 940.825 | 3.444 | n/a | 0.000 | 0.000 | 0.603 | 936.670 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.070 | 3.444 | 0.004 | 0.070 | gw-r/thread-51/journal/page | none observed |
| 17d3f915c4efb47700000000000001e0 | 843.459 | 2.162 | n/a | 0.000 | 0.000 | 0.509 | 840.660 | 0.009 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.054 | 2.162 | 0.003 | 0.054 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb47700000000000001de | 838.244 | 2.304 | n/a | 0.000 | 0.000 | 0.326 | 835.514 | 0.007 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.064 | 2.304 | 0.003 | 0.064 | gw-r/thread-51/journal/page | none observed |
| 17d3f915c4efb47700000000000001e3 | 787.291 | 2.856 | n/a | 0.000 | 0.000 | 0.619 | 783.686 | 0.006 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.068 | 2.856 | 0.004 | 0.068 | gw-r/thread-52/journal/page | none observed |
| 17d3f915c4efb47700000000000001d9 | 515.504 | 6.633 | n/a | 0.554 | 0.000 | 0.419 | 507.766 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.099 | 7.188 | 0.014 | 0.099 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb47700000000000001cb | 323.550 | 2.616 | n/a | 0.000 | 0.000 | 0.586 | 320.233 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.065 | 2.616 | 0.008 | 0.065 | gw-r/thread-52/journal/page | none observed |
| 17d3f915c4efb47700000000000001d4 | 249.505 | 2.527 | n/a | 0.000 | 0.000 | 0.389 | 246.499 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.062 | 2.527 | 0.010 | 0.062 | gw-r/thread-52/journal/page | none observed |
| 17d3f915c4efb47700000000000001e2 | 249.277 | 3.059 | n/a | 0.000 | 0.000 | 0.677 | 245.410 | 0.007 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.081 | 3.059 | 0.012 | 0.081 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb47700000000000008dd | 124.372 | 2.500 | n/a | 0.000 | 0.000 | 0.372 | 121.361 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.110 | 2.500 | 0.020 | 0.110 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb47700000000000004ac | 117.673 | 4.884 | n/a | 0.000 | 0.000 | 0.423 | 112.218 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.090 | 4.884 | 0.042 | 0.090 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb47700000000000001cf | 116.349 | 2.623 | n/a | 0.000 | 0.000 | 0.757 | 112.829 | 0.009 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.061 | 2.623 | 0.023 | 0.061 | gw-r/thread-48/journal/page | none observed |

## P3 / L64 / internal (1523 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.474 | n/a | n/a | n/a | 4.000 | n/a | 0.000 | 0.000 | 0.474 | 7.470 | 0.004 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.101 | 4.009 | 0.318 | 0.101 |
| p99 | 358.192 | n/a | n/a | n/a | 16.463 | n/a | 1.380 | 0.000 | 5.049 | 348.305 | 0.280 | 0.000 | 0.051 | 0.000 | n/a | n/a | 1.417 | 16.667 | 0.853 | 1.417 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 17d3f915c4efb4770000000000001a57 | 1002.992 | 0.167 | n/a | 0.000 | 0.000 | 0.571 | 1001.075 | 0.008 | 0.000 | 0.068 | 0.000 | n/a | n/a | 1.104 | 0.167 | 0.000 | 1.104 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb4770000000000001a36 | 1002.967 | 0.176 | n/a | 0.000 | 0.000 | 0.753 | 1000.876 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 1.116 | 0.176 | 0.000 | 1.116 | gw-r/thread-70/journal/page | none observed |
| 17d3f915c4efb4770000000000001a3b | 1002.627 | 0.110 | n/a | 0.000 | 0.000 | 0.407 | 1000.945 | 0.008 | 0.000 | 0.062 | 0.000 | n/a | n/a | 1.095 | 0.110 | 0.000 | 1.095 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb4770000000000001a38 | 1002.498 | 0.293 | n/a | 0.000 | 0.000 | 0.692 | 1000.339 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 1.161 | 0.293 | 0.000 | 1.161 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb4770000000000001a54 | 1002.495 | 0.132 | n/a | 0.000 | 0.000 | 0.461 | 1000.753 | 0.008 | 0.000 | 0.049 | 0.000 | n/a | n/a | 1.092 | 0.132 | 0.000 | 1.092 | gw-r/thread-52/journal/page | none observed |
| 17d3f915c4efb4770000000000001a6d | 1002.314 | 0.127 | n/a | 0.000 | 0.000 | 0.400 | 1000.635 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 1.094 | 0.127 | 0.000 | 1.094 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb4770000000000001a3f | 1002.278 | 0.104 | n/a | 0.000 | 0.000 | 0.339 | 1000.691 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 1.093 | 0.104 | 0.000 | 1.093 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb4770000000000001a48 | 970.939 | 5.830 | n/a | 0.000 | 0.000 | 0.630 | 964.316 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.133 | 5.830 | 0.006 | 0.133 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb4770000000000001a64 | 925.674 | 2.943 | n/a | 0.000 | 0.000 | 0.467 | 922.178 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.059 | 2.943 | 0.003 | 0.059 | gw-r/thread-70/journal/page | none observed |
| 17d3f915c4efb4770000000000001a39 | 799.692 | 8.907 | n/a | 1.380 | 0.000 | 1.861 | 787.186 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.318 | 10.287 | 0.013 | 0.318 | gw-r/thread-70/journal/page | none observed |
| 17d3f915c4efb4770000000000001a52 | 706.570 | 2.894 | n/a | 0.000 | 0.000 | 0.315 | 703.202 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.132 | 2.894 | 0.004 | 0.132 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb4770000000000001a4e | 689.724 | 8.294 | n/a | 0.000 | 0.000 | 1.453 | 679.663 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.279 | 8.294 | 0.012 | 0.279 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb4770000000000001a41 | 636.489 | 2.645 | n/a | 0.000 | 0.000 | 0.317 | 633.394 | 0.008 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.085 | 2.645 | 0.004 | 0.085 | gw-r/thread-51/journal/page | none observed |
| 17d3f915c4efb4770000000000001a68 | 630.463 | 2.558 | n/a | 0.000 | 0.000 | 0.344 | 627.471 | 0.005 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.062 | 2.558 | 0.004 | 0.062 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb4770000000000001a4c | 377.466 | 2.144 | n/a | 0.000 | 0.000 | 0.719 | 374.507 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.056 | 2.144 | 0.006 | 0.056 | gw-r/thread-70/journal/page | none observed |
| 17d3f915c4efb4770000000000001a59 | 358.192 | 7.880 | n/a | 1.068 | 0.000 | 0.667 | 348.305 | 0.004 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.224 | 8.947 | 0.025 | 0.224 | gw-r/thread-51/journal/page | none observed |
| 17d3f915c4efb4770000000000001a5c | 348.518 | 10.225 | n/a | 0.000 | 0.000 | 0.511 | 337.661 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.093 | 10.225 | 0.029 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb4770000000000001a66 | 339.121 | 2.168 | n/a | 0.000 | 0.000 | 0.386 | 336.461 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.074 | 2.168 | 0.006 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb4770000000000001a62 | 306.433 | 3.013 | n/a | 0.000 | 0.000 | 0.360 | 302.962 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.068 | 3.013 | 0.010 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb4770000000000001a5a | 294.538 | 2.689 | n/a | 0.000 | 0.000 | 0.337 | 291.417 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.070 | 2.689 | 0.009 | 0.070 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / internal (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 578.110 | n/a | n/a | n/a | 3.563 | n/a | 0.000 | 0.000 | 0.522 | 564.054 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.172 | 3.975 | 0.008 | 0.172 |
| p99 | 1004.719 | n/a | n/a | n/a | 11.161 | n/a | 3.169 | 0.000 | 2.812 | 1001.106 | 0.137 | 20.084 | 0.079 | 0.000 | n/a | n/a | 1.139 | 12.680 | 0.479 | 1.139 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 17d3f915c4efb4770000000000001aaa | 1004.719 | 0.159 | n/a | 0.000 | 0.000 | 2.812 | 1000.616 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 1.099 | 0.159 | 0.000 | 1.099 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb4770000000000001a71 | 1002.870 | 0.115 | n/a | 0.000 | 0.000 | 0.473 | 1001.106 | 0.008 | 0.000 | 0.072 | 0.000 | n/a | n/a | 1.096 | 0.115 | 0.000 | 1.096 | gw-r/thread-51/journal/page | none observed |
| 17d3f915c4efb4770000000000001adc | 1002.778 | 0.156 | n/a | 0.000 | 0.000 | 0.935 | 1000.510 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 1.137 | 0.156 | 0.000 | 1.137 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb4770000000000001ad7 | 1002.773 | 0.149 | n/a | 0.000 | 0.000 | 0.645 | 1000.830 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 1.097 | 0.149 | 0.000 | 1.097 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb4770000000000001aa7 | 1002.647 | 0.148 | n/a | 0.000 | 0.000 | 0.543 | 1000.812 | 0.007 | 0.000 | 0.048 | 0.000 | n/a | n/a | 1.090 | 0.148 | 0.000 | 1.090 | gw-r/thread-52/journal/page | none observed |
| 17d3f915c4efb4770000000000001ae9 | 1002.600 | 0.175 | n/a | 0.000 | 0.000 | 0.537 | 1000.716 | 0.005 | 0.000 | 0.065 | 0.000 | n/a | n/a | 1.102 | 0.175 | 0.000 | 1.102 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb4770000000000001abd | 1002.555 | 0.105 | n/a | 0.000 | 0.000 | 0.615 | 1000.699 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 1.089 | 0.105 | 0.000 | 1.089 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb4770000000000001ae4 | 1002.501 | 0.182 | n/a | 0.000 | 0.000 | 0.631 | 1000.508 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 1.139 | 0.182 | 0.000 | 1.139 | gw-r/thread-70/journal/page | none observed |
| 17d3f915c4efb4770000000000001ade | 1002.484 | 0.114 | n/a | 0.000 | 0.000 | 0.522 | 1000.734 | 0.007 | 0.000 | 0.017 | 0.000 | n/a | n/a | 1.090 | 0.114 | 0.000 | 1.090 | gw-r/thread-52/journal/page | none observed |
| 17d3f915c4efb4770000000000001ab2 | 1002.416 | 0.102 | n/a | 0.000 | 0.000 | 0.630 | 1000.547 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 1.093 | 0.102 | 0.000 | 1.093 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb4770000000000001ac7 | 1002.413 | 0.133 | n/a | 0.000 | 0.000 | 0.643 | 1000.506 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 1.100 | 0.133 | 0.000 | 1.100 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb4770000000000001ab4 | 1002.408 | 0.152 | n/a | 0.000 | 0.000 | 0.593 | 1000.500 | 0.004 | 0.000 | 0.059 | 0.000 | n/a | n/a | 1.100 | 0.152 | 0.000 | 1.100 | gw-r/thread-70/journal/page | none observed |
| 17d3f915c4efb4770000000000001aba | 1002.391 | 0.152 | n/a | 0.000 | 0.000 | 0.469 | 1000.610 | 0.005 | 0.000 | 0.055 | 0.000 | n/a | n/a | 1.100 | 0.152 | 0.000 | 1.100 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb4770000000000001a91 | 1002.335 | 0.144 | n/a | 0.000 | 0.000 | 0.512 | 1000.539 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 1.109 | 0.144 | 0.000 | 1.109 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb4770000000000001ad9 | 1002.289 | 0.121 | n/a | 0.000 | 0.000 | 0.388 | 1000.655 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 1.086 | 0.121 | 0.000 | 1.086 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb4770000000000001ab3 | 1002.285 | 0.194 | n/a | 0.000 | 0.000 | 0.626 | 1000.331 | 0.003 | 0.000 | 0.008 | 0.000 | n/a | n/a | 1.123 | 0.194 | 0.000 | 1.123 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb4770000000000001ad4 | 1002.274 | 0.102 | n/a | 0.000 | 0.000 | 0.529 | 1000.521 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.087 | 0.102 | 0.000 | 1.087 | gw-r/thread-70/journal/page | none observed |
| 17d3f915c4efb4770000000000001a82 | 1002.271 | 0.156 | n/a | 0.000 | 0.000 | 0.467 | 1000.484 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 1.114 | 0.156 | 0.000 | 1.114 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb4770000000000001acd | 1002.270 | 0.114 | n/a | 0.000 | 0.000 | 0.469 | 1000.558 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 1.090 | 0.114 | 0.000 | 1.090 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb4770000000000001a75 | 1002.254 | 0.098 | n/a | 0.000 | 0.000 | 0.447 | 1000.573 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 1.092 | 0.098 | 0.000 | 1.092 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / internal (73 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 584.594 | n/a | n/a | n/a | 2.844 | n/a | 0.000 | 0.000 | 0.577 | 581.863 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.177 | 2.844 | 0.006 | 0.177 |
| p99 | 1004.099 | n/a | n/a | n/a | 9.456 | n/a | 1.371 | 0.000 | 5.309 | 1001.188 | 0.113 | 11.908 | 0.074 | 0.000 | n/a | n/a | 1.174 | 10.500 | 0.617 | 1.174 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 17d3f915c4efb4770000000000001b31 | 1004.099 | 0.106 | n/a | 0.000 | 0.000 | 2.303 | 1000.588 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 1.060 | 0.106 | 0.000 | 1.060 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb4770000000000001b63 | 1003.983 | 0.124 | n/a | 0.000 | 0.000 | 1.509 | 1001.188 | 0.008 | 0.000 | 0.059 | 0.000 | n/a | n/a | 1.096 | 0.124 | 0.000 | 1.096 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb4770000000000001b11 | 1003.267 | 0.108 | n/a | 0.000 | 0.000 | 1.617 | 1000.419 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 1.083 | 0.108 | 0.000 | 1.083 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb4770000000000001b37 | 1003.026 | 0.125 | n/a | 0.000 | 0.000 | 0.593 | 1001.133 | 0.010 | 0.000 | 0.068 | 0.000 | n/a | n/a | 1.099 | 0.125 | 0.000 | 1.099 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb4770000000000001b2a | 1003.000 | 0.252 | n/a | 0.000 | 0.000 | 0.785 | 1000.766 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 1.147 | 0.252 | 0.000 | 1.147 | gw-r/thread-52/journal/page | none observed |
| 17d3f915c4efb4770000000000001b1d | 1002.945 | 0.176 | n/a | 0.000 | 0.000 | 0.621 | 1000.965 | 0.007 | 0.000 | 0.074 | 0.000 | n/a | n/a | 1.102 | 0.176 | 0.000 | 1.102 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb4770000000000001b14 | 1002.923 | 0.121 | n/a | 0.000 | 0.000 | 1.712 | 1000.978 | 0.009 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.050 | 0.121 | 0.000 | 0.050 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb4770000000000001b4d | 1002.788 | 0.153 | n/a | 0.000 | 0.000 | 0.708 | 1000.708 | 0.004 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.174 | 0.153 | 0.000 | 1.174 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb4770000000000001b43 | 1002.661 | 0.108 | n/a | 0.000 | 0.000 | 0.440 | 1000.962 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 1.093 | 0.108 | 0.000 | 1.093 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb4770000000000001b0e | 1002.587 | 0.113 | n/a | 0.000 | 0.000 | 0.841 | 1000.505 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 1.086 | 0.113 | 0.000 | 1.086 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb4770000000000001b3e | 1002.512 | 0.151 | n/a | 0.000 | 0.000 | 0.640 | 1000.563 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 1.122 | 0.151 | 0.000 | 1.122 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb4770000000000001b65 | 1002.501 | 0.105 | n/a | 0.000 | 0.000 | 0.485 | 1000.785 | 0.007 | 0.000 | 0.030 | 0.000 | n/a | n/a | 1.089 | 0.105 | 0.000 | 1.089 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb4770000000000001b38 | 1002.468 | 0.156 | n/a | 0.000 | 0.000 | 0.577 | 1000.579 | 0.003 | 0.000 | 0.026 | 0.000 | n/a | n/a | 1.127 | 0.156 | 0.000 | 1.127 | gw-r/thread-70/journal/page | none observed |
| 17d3f915c4efb4770000000000001b59 | 1002.421 | 0.156 | n/a | 0.000 | 0.000 | 0.583 | 1000.522 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.114 | 0.156 | 0.000 | 1.114 | gw-r/thread-70/journal/page | none observed |
| 17d3f915c4efb4770000000000001b3f | 1002.350 | 0.146 | n/a | 0.000 | 0.000 | 0.475 | 1000.582 | 0.006 | 0.000 | 0.024 | 0.000 | n/a | n/a | 1.117 | 0.146 | 0.000 | 1.117 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb4770000000000001b39 | 1002.338 | 0.115 | n/a | 0.000 | 0.000 | 0.398 | 1000.680 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 1.093 | 0.115 | 0.000 | 1.093 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb4770000000000001b2e | 1002.302 | 0.161 | n/a | 0.000 | 0.000 | 0.542 | 1000.433 | 0.003 | 0.000 | 0.036 | 0.000 | n/a | n/a | 1.126 | 0.161 | 0.000 | 1.126 | gw-r/thread-70/journal/page | none observed |
| 17d3f915c4efb4770000000000001b03 | 1002.209 | 0.143 | n/a | 0.000 | 0.000 | 0.432 | 1000.495 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 1.108 | 0.143 | 0.000 | 1.108 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb4770000000000001b5c | 1002.200 | 0.125 | n/a | 0.000 | 0.000 | 0.417 | 1000.513 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.099 | 0.125 | 0.000 | 1.099 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb4770000000000001b2b | 1002.165 | 0.132 | n/a | 0.000 | 0.000 | 0.537 | 1000.381 | 0.003 | 0.000 | 0.011 | 0.000 | n/a | n/a | 1.100 | 0.132 | 0.000 | 1.100 | gw-r/thread-48/journal/page | none observed |

## P3 / tail / internal (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 709.504 | n/a | n/a | n/a | 3.327 | n/a | 0.000 | 0.000 | 0.548 | 696.452 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.244 | 3.327 | 0.007 | 0.244 |
| p99 | 1002.872 | n/a | n/a | n/a | 13.228 | n/a | 0.804 | 0.000 | 2.128 | 1000.827 | 0.026 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.166 | 13.228 | 0.098 | 1.166 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 17d3f915c4efb4770000000000001b7a | 1002.872 | 0.250 | n/a | 0.000 | 0.000 | 0.767 | 1000.698 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 1.145 | 0.250 | 0.000 | 1.145 | gw-r/thread-70/journal/page | none observed |
| 17d3f915c4efb4770000000000001b67 | 1002.837 | 0.178 | n/a | 0.000 | 0.000 | 0.712 | 1000.767 | 0.006 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.116 | 0.178 | 0.000 | 1.116 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb4770000000000001b82 | 1002.803 | 0.125 | n/a | 0.000 | 0.000 | 0.747 | 1000.709 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 1.166 | 0.125 | 0.000 | 1.166 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb4770000000000001b84 | 1002.736 | 0.153 | n/a | 0.000 | 0.000 | 0.596 | 1000.827 | 0.010 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.109 | 0.153 | 0.000 | 1.109 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb4770000000000001b8a | 1002.421 | 0.180 | n/a | 0.000 | 0.000 | 0.545 | 1000.507 | 0.004 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.144 | 0.180 | 0.000 | 1.144 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb4770000000000001b69 | 1002.204 | 0.157 | n/a | 0.000 | 0.000 | 0.554 | 1000.375 | 0.003 | 0.000 | 0.009 | 0.000 | n/a | n/a | 1.106 | 0.157 | 0.000 | 1.106 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb4770000000000001b78 | 1002.120 | 0.098 | n/a | 0.000 | 0.000 | 0.399 | 1000.497 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 1.089 | 0.098 | 0.000 | 1.089 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb4770000000000001b6f | 1002.066 | 0.120 | n/a | 0.000 | 0.000 | 0.445 | 1000.382 | 0.003 | 0.000 | 0.017 | 0.000 | n/a | n/a | 1.098 | 0.120 | 0.000 | 1.098 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb4770000000000001b6c | 897.649 | 8.221 | n/a | 0.000 | 0.000 | 0.604 | 888.533 | 0.009 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.245 | 8.221 | 0.009 | 0.245 | gw-r/thread-47/journal/page | none observed |
| 17d3f915c4efb4770000000000001b7c | 812.749 | 2.570 | n/a | 0.000 | 0.000 | 0.480 | 809.582 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.087 | 2.570 | 0.003 | 0.087 | gw-r/thread-45/journal/page | none observed |
| 17d3f915c4efb4770000000000001b75 | 739.596 | 5.732 | n/a | 0.000 | 0.000 | 0.585 | 732.979 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.263 | 5.732 | 0.008 | 0.263 | gw-r/thread-52/journal/page | none observed |
| 17d3f915c4efb4770000000000001b81 | 709.504 | 13.228 | n/a | 0.000 | 0.000 | 0.472 | 695.531 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.244 | 13.228 | 0.019 | 0.244 | gw-r/thread-52/journal/page | none observed |
| 17d3f915c4efb4770000000000001b66 | 701.043 | 3.834 | n/a | 0.000 | 0.000 | 0.548 | 696.452 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.171 | 3.834 | 0.005 | 0.171 | gw-r/thread-70/journal/page | none observed |
| 17d3f915c4efb4770000000000001b85 | 682.699 | 2.524 | n/a | 0.000 | 0.000 | 0.419 | 679.611 | 0.026 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.080 | 2.524 | 0.004 | 0.080 | gw-r/thread-49/journal/page | none observed |
| 17d3f915c4efb4770000000000001b7b | 549.514 | 3.626 | n/a | 0.000 | 0.000 | 1.000 | 544.743 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.104 | 3.626 | 0.007 | 0.104 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb4770000000000001b6a | 434.387 | 4.328 | n/a | 0.000 | 0.000 | 0.497 | 429.395 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.136 | 4.328 | 0.010 | 0.136 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb4770000000000001b89 | 424.238 | 5.728 | n/a | 0.000 | 0.000 | 0.403 | 417.986 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.093 | 5.728 | 0.014 | 0.093 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb4770000000000001b71 | 355.823 | 9.433 | n/a | 0.804 | 0.000 | 0.620 | 344.761 | 0.007 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.163 | 10.238 | 0.029 | 0.163 | gw-r/thread-48/journal/page | none observed |
| 17d3f915c4efb4770000000000001b76 | 291.843 | 8.727 | n/a | 0.000 | 0.000 | 0.382 | 282.532 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.171 | 8.727 | 0.030 | 0.171 | gw-r/thread-50/journal/page | none observed |
| 17d3f915c4efb4770000000000001b86 | 270.703 | 3.327 | n/a | 0.000 | 0.000 | 0.546 | 266.570 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.203 | 3.327 | 0.012 | 0.203 | gw-r/thread-45/journal/page | none observed |

## P3 / warmup / read (70 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.528 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.866 | 201.248 | 0.015 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.088 | 0.041 | 0.000 | 0.088 |
| p99 | 211.818 | n/a | n/a | n/a | 0.104 | n/a | 0.000 | 0.000 | 4.885 | 207.493 | 0.074 | 28.361 | 3.242 | 0.000 | n/a | n/a | 0.277 | 0.104 | 0.001 | 0.277 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 61bfd503864eb704000000000000002d | 211.818 | 0.053 | n/a | 0.000 | 0.000 | 3.959 | 207.493 | 0.020 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.112 | 0.053 | 0.000 | 0.112 | gw-r/thread-51/journal/page | none observed |
| 61bfd503864eb7040000000000000008 | 207.914 | 0.063 | n/a | 0.000 | 0.000 | 1.295 | 206.107 | 0.059 | 0.000 | 0.218 | 0.000 | n/a | n/a | 0.172 | 0.063 | 0.000 | 0.172 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000025 | 207.676 | 0.029 | n/a | 0.000 | 0.000 | 3.287 | 201.010 | 0.034 | 0.000 | 3.242 | 0.000 | n/a | n/a | 0.073 | 0.029 | 0.000 | 0.073 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb704000000000000001c | 206.339 | 0.045 | n/a | 0.000 | 0.000 | 4.885 | 201.128 | 0.062 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.112 | 0.045 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb704000000000000004d | 205.834 | 0.042 | n/a | 0.000 | 0.000 | 1.327 | 204.195 | 0.074 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.076 | 0.042 | 0.000 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb704000000000000001e | 205.730 | 0.030 | n/a | 0.000 | 0.000 | 0.772 | 204.672 | 0.019 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.066 | 0.030 | 0.000 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 61bfd503864eb7040000000000000036 | 205.091 | 0.029 | n/a | 0.000 | 0.000 | 3.795 | 201.048 | 0.014 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.071 | 0.029 | 0.000 | 0.071 | gw-r/thread-51/journal/page | none observed |
| 61bfd503864eb7040000000000000052 | 205.063 | 0.030 | n/a | 0.000 | 0.000 | 0.628 | 204.223 | 0.013 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.076 | 0.030 | 0.000 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb7040000000000000014 | 204.885 | 0.050 | n/a | 0.000 | 0.000 | 0.812 | 203.654 | 0.069 | 0.000 | 0.201 | 0.000 | n/a | n/a | 0.100 | 0.050 | 0.000 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb704000000000000004a | 204.859 | 0.035 | n/a | 0.000 | 0.000 | 2.528 | 202.077 | 0.012 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.087 | 0.035 | 0.000 | 0.087 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000050 | 204.522 | 0.052 | n/a | 0.000 | 0.000 | 0.930 | 203.281 | 0.014 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.146 | 0.052 | 0.000 | 0.146 | gw-r/thread-50/journal/page | none observed |
| 61bfd503864eb704000000000000002f | 204.329 | 0.060 | n/a | 0.000 | 0.000 | 1.216 | 202.679 | 0.047 | 0.000 | 0.179 | 0.000 | n/a | n/a | 0.148 | 0.060 | 0.000 | 0.148 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb704000000000000000c | 204.246 | 0.034 | n/a | 0.000 | 0.000 | 0.866 | 202.954 | 0.056 | 0.000 | 0.236 | 0.000 | n/a | n/a | 0.099 | 0.034 | 0.000 | 0.099 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000000013 | 204.013 | 0.043 | n/a | 0.000 | 0.000 | 1.396 | 202.236 | 0.041 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.102 | 0.043 | 0.000 | 0.102 | gw-r/thread-51/journal/page | none observed |
| 61bfd503864eb704000000000000000e | 203.833 | 0.031 | n/a | 0.000 | 0.000 | 1.111 | 202.363 | 0.022 | 0.000 | 0.226 | 0.000 | n/a | n/a | 0.081 | 0.031 | 0.000 | 0.081 | gw-r/thread-50/journal/page | none observed |
| 61bfd503864eb7040000000000000043 | 203.695 | 0.063 | n/a | 0.000 | 0.000 | 1.486 | 201.791 | 0.017 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.169 | 0.063 | 0.000 | 0.169 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb704000000000000002c | 203.656 | 0.035 | n/a | 0.000 | 0.000 | 1.115 | 202.167 | 0.027 | 0.000 | 0.224 | 0.000 | n/a | n/a | 0.089 | 0.035 | 0.000 | 0.089 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb7040000000000000009 | 203.440 | 0.104 | n/a | 0.000 | 0.000 | 1.375 | 201.522 | 0.022 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.277 | 0.104 | 0.001 | 0.277 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb7040000000000000034 | 203.208 | 0.040 | n/a | 0.000 | 0.000 | 1.381 | 201.203 | 0.015 | 0.000 | 0.486 | 0.000 | n/a | n/a | 0.084 | 0.040 | 0.000 | 0.084 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000021 | 203.189 | 0.030 | n/a | 0.000 | 0.000 | 0.863 | 202.007 | 0.020 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.075 | 0.030 | 0.000 | 0.075 | gw-r/thread-47/journal/page | none observed |

## P3 / L1 / read (210 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.269 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.828 | 201.075 | 0.012 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.088 | 0.041 | 0.000 | 0.088 |
| p99 | 207.004 | n/a | n/a | n/a | 0.090 | n/a | 0.000 | 0.000 | 4.707 | 204.760 | 3.319 | 0.000 | 0.193 | 0.000 | n/a | n/a | 0.202 | 0.090 | 0.001 | 0.202 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 61bfd503864eb704000000000000006d | 209.081 | 0.046 | n/a | 0.000 | 0.000 | 0.735 | 208.047 | 0.031 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.113 | 0.046 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb704000000000000008f | 207.155 | 0.028 | n/a | 0.000 | 0.000 | 2.183 | 204.760 | 0.013 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.083 | 0.028 | 0.000 | 0.083 | gw-r/thread-51/journal/page | none observed |
| 61bfd503864eb70400000000000000df | 207.004 | 0.041 | n/a | 0.000 | 0.000 | 5.197 | 201.561 | 0.008 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.096 | 0.041 | 0.000 | 0.096 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb7040000000000000079 | 206.674 | 0.057 | n/a | 0.000 | 0.000 | 1.329 | 204.917 | 0.027 | 0.000 | 0.193 | 0.000 | n/a | n/a | 0.151 | 0.057 | 0.000 | 0.151 | gw-r/thread-51/journal/page | none observed |
| 61bfd503864eb70400000000000000d8 | 206.414 | 0.038 | n/a | 0.000 | 0.000 | 4.885 | 201.276 | 0.009 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.095 | 0.038 | 0.000 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb7040000000000000053 | 206.232 | 0.041 | n/a | 0.000 | 0.000 | 2.633 | 203.349 | 0.021 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.086 | 0.041 | 0.000 | 0.086 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000110 | 206.190 | 0.060 | n/a | 0.000 | 0.000 | 1.192 | 204.499 | 0.212 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.136 | 0.060 | 0.000 | 0.136 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb70400000000000000d4 | 206.033 | 0.031 | n/a | 0.000 | 0.000 | 4.532 | 201.276 | 0.011 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.076 | 0.031 | 0.000 | 0.076 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb70400000000000000ca | 205.950 | 0.032 | n/a | 0.000 | 0.000 | 2.696 | 203.071 | 0.008 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.075 | 0.032 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb70400000000000000e6 | 205.887 | 0.069 | n/a | 0.000 | 0.000 | 1.107 | 204.468 | 0.008 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.149 | 0.069 | 0.000 | 0.149 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000000114 | 205.474 | 0.066 | n/a | 0.000 | 0.000 | 1.013 | 204.167 | 0.010 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.152 | 0.066 | 0.000 | 0.152 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb70400000000000000ad | 205.271 | 0.038 | n/a | 0.000 | 0.000 | 0.682 | 204.325 | 0.027 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.115 | 0.038 | 0.000 | 0.115 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb70400000000000000f1 | 205.189 | 0.044 | n/a | 0.000 | 0.000 | 0.887 | 204.062 | 0.012 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.106 | 0.044 | 0.000 | 0.106 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb7040000000000000067 | 205.072 | 0.033 | n/a | 0.000 | 0.000 | 0.633 | 204.217 | 0.013 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.080 | 0.033 | 0.000 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb704000000000000005b | 205.064 | 0.033 | n/a | 0.000 | 0.000 | 3.848 | 200.990 | 0.019 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.073 | 0.033 | 0.000 | 0.073 | gw-r/thread-51/journal/page | none observed |
| 61bfd503864eb70400000000000000e3 | 205.036 | 0.063 | n/a | 0.000 | 0.000 | 3.896 | 200.838 | 0.009 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.156 | 0.063 | 0.000 | 0.156 | gw-r/thread-50/journal/page | none observed |
| 61bfd503864eb70400000000000000c7 | 204.792 | 0.044 | n/a | 0.000 | 0.000 | 0.686 | 203.808 | 0.009 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.138 | 0.044 | 0.000 | 0.138 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb70400000000000000e0 | 204.769 | 0.045 | n/a | 0.000 | 0.000 | 1.183 | 203.252 | 0.017 | 0.000 | 0.178 | 0.000 | n/a | n/a | 0.094 | 0.045 | 0.000 | 0.094 | gw-r/thread-51/journal/page | none observed |
| 61bfd503864eb7040000000000000123 | 204.719 | 0.044 | n/a | 0.000 | 0.000 | 3.602 | 200.874 | 0.009 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.125 | 0.044 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb70400000000000000b3 | 204.563 | 0.060 | n/a | 0.000 | 0.000 | 3.079 | 201.107 | 0.009 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.187 | 0.060 | 0.000 | 0.187 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / read (208 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.819 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.705 | 200.854 | 0.008 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.090 | 0.043 | 0.000 | 0.090 |
| p99 | 206.138 | n/a | n/a | n/a | 0.092 | n/a | 0.000 | 0.000 | 3.963 | 204.743 | 4.950 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.195 | 0.092 | 0.001 | 0.195 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 61bfd503864eb704000000000000014c | 207.605 | 0.048 | n/a | 0.000 | 0.000 | 2.503 | 204.843 | 0.015 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.101 | 0.048 | 0.000 | 0.101 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb70400000000000001fb | 206.492 | 0.066 | n/a | 0.000 | 0.000 | 1.085 | 205.037 | 0.016 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.134 | 0.066 | 0.000 | 0.134 | gw-r/thread-51/journal/page | none observed |
| 61bfd503864eb7040000000000000209 | 206.138 | 0.064 | n/a | 0.000 | 0.000 | 4.052 | 201.838 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.132 | 0.064 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb704000000000000014e | 206.101 | 0.039 | n/a | 0.000 | 0.000 | 2.997 | 202.900 | 0.010 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.076 | 0.039 | 0.000 | 0.076 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb7040000000000000157 | 205.530 | 0.039 | n/a | 0.000 | 0.000 | 0.559 | 204.743 | 0.011 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.085 | 0.039 | 0.000 | 0.085 | gw-r/thread-50/journal/page | none observed |
| 61bfd503864eb70400000000000001f0 | 204.796 | 0.042 | n/a | 0.000 | 0.000 | 3.066 | 201.472 | 0.013 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.080 | 0.042 | 0.000 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb70400000000000001d8 | 204.777 | 0.054 | n/a | 0.000 | 0.000 | 3.649 | 200.888 | 0.007 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.125 | 0.054 | 0.000 | 0.125 | gw-r/thread-51/journal/page | none observed |
| 61bfd503864eb704000000000000013d | 204.758 | 0.049 | n/a | 0.000 | 0.000 | 0.658 | 203.823 | 0.016 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.106 | 0.049 | 0.000 | 0.106 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb70400000000000001f1 | 204.720 | 0.045 | n/a | 0.000 | 0.000 | 0.812 | 203.702 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.094 | 0.045 | 0.000 | 0.094 | gw-r/thread-50/journal/page | none observed |
| 61bfd503864eb7040000000000000189 | 204.578 | 0.037 | n/a | 0.000 | 0.000 | 2.974 | 201.359 | 0.012 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.088 | 0.037 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb70400000000000001af | 204.391 | 0.040 | n/a | 0.000 | 0.000 | 2.639 | 201.503 | 0.010 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.109 | 0.040 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb70400000000000001cf | 203.818 | 0.056 | n/a | 0.000 | 0.000 | 2.758 | 200.793 | 0.008 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.140 | 0.056 | 0.000 | 0.140 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000000150 | 203.767 | 0.045 | n/a | 0.000 | 0.000 | 2.689 | 200.883 | 0.008 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.081 | 0.045 | 0.000 | 0.081 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb7040000000000000158 | 203.715 | 0.058 | n/a | 0.000 | 0.000 | 0.856 | 202.578 | 0.009 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.135 | 0.058 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb70400000000000001b4 | 203.685 | 0.035 | n/a | 0.000 | 0.000 | 2.158 | 201.344 | 0.007 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.076 | 0.035 | 0.000 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb7040000000000000141 | 203.563 | 0.048 | n/a | 0.000 | 0.000 | 3.963 | 199.361 | 0.010 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.105 | 0.048 | 0.000 | 0.105 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000000195 | 203.538 | 0.040 | n/a | 0.000 | 0.000 | 1.545 | 201.689 | 0.012 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.087 | 0.040 | 0.000 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb70400000000000001d0 | 203.485 | 0.061 | n/a | 0.000 | 0.000 | 1.240 | 201.882 | 0.012 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.149 | 0.061 | 0.000 | 0.149 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb7040000000000000183 | 203.345 | 0.034 | n/a | 0.000 | 0.000 | 0.695 | 202.458 | 0.010 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.076 | 0.034 | 0.000 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb704000000000000021a | 203.253 | 0.035 | n/a | 0.000 | 0.000 | 1.136 | 201.875 | 0.012 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.069 | 0.035 | 0.000 | 0.069 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / read (147 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 81.227 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.546 | 78.824 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.074 | 0.047 | 0.001 | 0.074 |
| p99 | 204.933 | n/a | n/a | n/a | 0.117 | n/a | 0.000 | 0.000 | 3.809 | 203.729 | 2.375 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.146 | 0.117 | 0.005 | 0.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 61bfd503864eb704000000000000022f | 205.802 | 0.054 | n/a | 0.000 | 0.000 | 1.092 | 204.496 | 0.016 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.085 | 0.054 | 0.000 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb704000000000000025c | 204.933 | 0.036 | n/a | 0.000 | 0.000 | 3.809 | 200.939 | 0.008 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.076 | 0.036 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000237 | 204.587 | 0.073 | n/a | 0.000 | 0.000 | 0.608 | 203.729 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.122 | 0.073 | 0.000 | 0.122 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb7040000000000000247 | 203.410 | 0.033 | n/a | 0.000 | 0.000 | 0.650 | 202.537 | 0.011 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.079 | 0.033 | 0.000 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb704000000000000023c | 203.267 | 0.052 | n/a | 0.000 | 0.000 | 1.433 | 201.550 | 0.010 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.094 | 0.052 | 0.000 | 0.094 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb704000000000000025b | 202.950 | 0.032 | n/a | 0.000 | 0.000 | 1.612 | 201.105 | 0.011 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.075 | 0.032 | 0.000 | 0.075 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb704000000000000022a | 202.868 | 0.044 | n/a | 0.000 | 0.000 | 0.844 | 201.761 | 0.010 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.115 | 0.044 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb7040000000000000248 | 202.836 | 0.053 | n/a | 0.000 | 0.000 | 0.897 | 201.687 | 0.010 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.118 | 0.053 | 0.000 | 0.118 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb7040000000000000253 | 202.486 | 0.049 | n/a | 0.000 | 0.000 | 1.255 | 200.980 | 0.009 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.122 | 0.049 | 0.000 | 0.122 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb704000000000000025d | 202.486 | 0.035 | n/a | 0.000 | 0.000 | 0.779 | 201.519 | 0.010 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.077 | 0.035 | 0.000 | 0.077 | gw-r/thread-51/journal/page | none observed |
| 61bfd503864eb704000000000000023b | 202.372 | 0.042 | n/a | 0.000 | 0.000 | 0.539 | 201.559 | 0.015 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.099 | 0.042 | 0.000 | 0.099 | gw-r/thread-50/journal/page | none observed |
| 61bfd503864eb7040000000000000245 | 202.235 | 0.044 | n/a | 0.000 | 0.000 | 1.361 | 200.681 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.101 | 0.044 | 0.000 | 0.101 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000254 | 202.185 | 0.037 | n/a | 0.000 | 0.000 | 0.610 | 201.365 | 0.011 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.075 | 0.037 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb7040000000000000226 | 202.152 | 0.035 | n/a | 0.000 | 0.000 | 0.893 | 201.077 | 0.006 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.074 | 0.035 | 0.000 | 0.074 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb704000000000000024e | 202.128 | 0.036 | n/a | 0.000 | 0.000 | 0.552 | 201.347 | 0.012 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.084 | 0.036 | 0.000 | 0.084 | gw-r/thread-50/journal/page | none observed |
| 61bfd503864eb704000000000000024a | 202.039 | 0.035 | n/a | 0.000 | 0.000 | 0.892 | 200.960 | 0.008 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.086 | 0.035 | 0.000 | 0.086 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000251 | 202.024 | 0.056 | n/a | 0.000 | 0.000 | 0.841 | 200.927 | 0.007 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.137 | 0.056 | 0.000 | 0.137 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb704000000000000023e | 201.993 | 0.062 | n/a | 0.000 | 0.000 | 0.944 | 200.802 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.138 | 0.062 | 0.000 | 0.138 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000233 | 201.938 | 0.070 | n/a | 0.000 | 0.000 | 0.896 | 200.800 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.120 | 0.070 | 0.000 | 0.120 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb704000000000000025e | 201.925 | 0.080 | n/a | 0.000 | 0.000 | 0.809 | 200.788 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.180 | 0.080 | 0.000 | 0.180 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / read (137 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 114.198 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.502 | 113.202 | 0.006 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.075 | 0.043 | 0.000 | 0.075 |
| p99 | 203.965 | n/a | n/a | n/a | 0.123 | n/a | 0.000 | 0.000 | 5.021 | 201.406 | 5.201 | 0.252 | 0.102 | 0.000 | n/a | n/a | 0.177 | 0.123 | 0.002 | 0.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 61bfd503864eb7040000000000000df2 | 204.714 | 0.045 | n/a | 0.000 | 0.000 | 3.965 | 200.581 | 0.004 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.078 | 0.045 | 0.000 | 0.078 | gw-r/thread-70/journal/page | none observed |
| 61bfd503864eb7040000000000000e1a | 203.965 | 0.067 | n/a | 0.000 | 0.000 | 2.218 | 201.360 | 0.026 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.205 | 0.067 | 0.000 | 0.205 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000000de0 | 202.569 | 0.073 | n/a | 0.000 | 0.000 | 0.800 | 201.406 | 0.011 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.177 | 0.073 | 0.000 | 0.177 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb7040000000000000dd2 | 202.558 | 0.057 | n/a | 0.000 | 0.000 | 1.340 | 200.969 | 0.005 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.126 | 0.057 | 0.000 | 0.126 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb7040000000000000deb | 202.543 | 0.047 | n/a | 0.000 | 0.000 | 0.717 | 201.539 | 0.012 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.109 | 0.047 | 0.000 | 0.109 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb7040000000000000e0e | 202.493 | 0.040 | n/a | 0.000 | 0.000 | 0.992 | 201.306 | 0.009 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.071 | 0.040 | 0.000 | 0.071 | gw-r/thread-70/journal/page | none observed |
| 61bfd503864eb7040000000000000e1b | 202.253 | 0.046 | n/a | 0.000 | 0.000 | 0.858 | 201.170 | 0.006 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.092 | 0.046 | 0.000 | 0.092 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000dfd | 202.212 | 0.049 | n/a | 0.000 | 0.000 | 1.442 | 200.551 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.129 | 0.049 | 0.000 | 0.129 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000dd3 | 202.166 | 0.066 | n/a | 0.000 | 0.000 | 0.577 | 201.252 | 0.012 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.166 | 0.066 | 0.000 | 0.166 | gw-r/thread-50/journal/page | none observed |
| 61bfd503864eb7040000000000000dfb | 202.135 | 0.054 | n/a | 0.000 | 0.000 | 0.902 | 200.999 | 0.006 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.110 | 0.054 | 0.000 | 0.110 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb7040000000000000de5 | 202.133 | 0.039 | n/a | 0.000 | 0.000 | 0.947 | 201.016 | 0.007 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.068 | 0.039 | 0.000 | 0.068 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb7040000000000000e04 | 202.106 | 0.036 | n/a | 0.000 | 0.000 | 0.672 | 201.243 | 0.009 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.067 | 0.036 | 0.000 | 0.067 | gw-r/thread-70/journal/page | none observed |
| 61bfd503864eb7040000000000000de1 | 202.014 | 0.050 | n/a | 0.000 | 0.000 | 0.655 | 201.127 | 0.007 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.096 | 0.050 | 0.000 | 0.096 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb7040000000000000e0d | 202.007 | 0.035 | n/a | 0.000 | 0.000 | 0.557 | 201.254 | 0.009 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.064 | 0.035 | 0.000 | 0.064 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb7040000000000000de8 | 201.965 | 0.043 | n/a | 0.000 | 0.000 | 0.764 | 201.016 | 0.007 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.076 | 0.043 | 0.000 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000000e23 | 201.963 | 0.031 | n/a | 0.000 | 0.000 | 0.531 | 201.237 | 0.012 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.068 | 0.031 | 0.000 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb7040000000000000de2 | 201.865 | 0.044 | n/a | 0.000 | 0.000 | 0.813 | 200.853 | 0.004 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.096 | 0.044 | 0.000 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb7040000000000000dfa | 201.829 | 0.033 | n/a | 0.000 | 0.000 | 0.604 | 201.052 | 0.007 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.064 | 0.033 | 0.000 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000000e0a | 201.812 | 0.039 | n/a | 0.000 | 0.000 | 0.558 | 201.019 | 0.014 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.084 | 0.039 | 0.000 | 0.084 | gw-r/thread-70/journal/page | none observed |
| 61bfd503864eb7040000000000000df7 | 201.766 | 0.043 | n/a | 0.000 | 0.000 | 0.626 | 200.898 | 0.005 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.135 | 0.043 | 0.000 | 0.135 | gw-r/thread-52/journal/page | none observed |

## P3 / L256 / read (216 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.419 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.533 | 200.663 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.074 | 0.041 | 0.000 | 0.074 |
| p99 | 204.080 | n/a | n/a | n/a | 0.085 | n/a | 0.000 | 0.000 | 1.856 | 202.432 | 2.942 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.214 | 0.085 | 0.001 | 0.214 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 61bfd503864eb7040000000000000e74 | 221.883 | 0.033 | n/a | 0.000 | 0.000 | 0.513 | 201.090 | 0.009 | 20.084 | 0.071 | 0.000 | n/a | n/a | 0.083 | 0.033 | 0.000 | 0.083 | gw-r/thread-70/journal/page | none observed |
| 61bfd503864eb7040000000000000e3b | 208.493 | 0.032 | n/a | 0.000 | 0.000 | 0.275 | 208.065 | 0.014 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.060 | 0.032 | 0.000 | 0.060 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000ebf | 204.080 | 0.033 | n/a | 0.000 | 0.000 | 3.422 | 200.527 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.059 | 0.033 | 0.000 | 0.059 | gw-r/thread-70/journal/page | none observed |
| 61bfd503864eb7040000000000000ef4 | 204.061 | 0.025 | n/a | 0.000 | 0.000 | 0.442 | 203.472 | 0.007 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.059 | 0.025 | 0.000 | 0.059 | gw-r/thread-70/journal/page | none observed |
| 61bfd503864eb7040000000000000efb | 203.889 | 0.085 | n/a | 0.000 | 0.000 | 1.104 | 202.432 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.214 | 0.085 | 0.000 | 0.214 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000000eee | 203.842 | 0.037 | n/a | 0.000 | 0.000 | 3.176 | 200.513 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.075 | 0.037 | 0.000 | 0.075 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb7040000000000000ed3 | 203.553 | 1.744 | n/a | 0.000 | 0.000 | 0.669 | 200.812 | 0.008 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.269 | 1.744 | 0.009 | 0.269 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000ee4 | 202.864 | 0.045 | n/a | 0.000 | 0.000 | 1.856 | 200.803 | 0.010 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.099 | 0.045 | 0.000 | 0.099 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000000e42 | 202.450 | 0.064 | n/a | 0.000 | 0.000 | 0.705 | 201.381 | 0.011 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.161 | 0.064 | 0.000 | 0.161 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000e93 | 202.396 | 0.026 | n/a | 0.000 | 0.000 | 1.475 | 200.778 | 0.010 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.058 | 0.026 | 0.000 | 0.058 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb7040000000000000e8c | 202.346 | 0.070 | n/a | 0.000 | 0.000 | 0.768 | 201.208 | 0.010 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.199 | 0.070 | 0.000 | 0.199 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb7040000000000000e99 | 202.270 | 0.038 | n/a | 0.000 | 0.000 | 0.798 | 201.276 | 0.008 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.074 | 0.038 | 0.000 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb7040000000000000ebe | 202.267 | 0.035 | n/a | 0.000 | 0.000 | 0.745 | 201.323 | 0.008 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.064 | 0.035 | 0.000 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000000e8d | 202.229 | 0.047 | n/a | 0.000 | 0.000 | 0.569 | 201.406 | 0.011 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.103 | 0.047 | 0.000 | 0.103 | gw-r/thread-50/journal/page | none observed |
| 61bfd503864eb7040000000000000e47 | 202.224 | 0.074 | n/a | 0.000 | 0.000 | 0.717 | 201.174 | 0.011 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.160 | 0.074 | 0.000 | 0.160 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000f08 | 202.138 | 0.052 | n/a | 0.000 | 0.000 | 0.848 | 200.832 | 0.003 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.360 | 0.052 | 0.000 | 0.360 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb7040000000000000ec3 | 202.136 | 0.064 | n/a | 0.000 | 0.000 | 0.854 | 200.956 | 0.007 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.181 | 0.064 | 0.000 | 0.181 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000ebd | 202.133 | 0.055 | n/a | 0.000 | 0.000 | 0.728 | 201.124 | 0.011 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.097 | 0.055 | 0.000 | 0.097 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb7040000000000000efd | 202.120 | 0.062 | n/a | 0.000 | 0.000 | 0.878 | 200.960 | 0.005 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.155 | 0.062 | 0.000 | 0.155 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb7040000000000000efc | 202.110 | 0.040 | n/a | 0.000 | 0.000 | 0.682 | 201.226 | 0.009 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.080 | 0.040 | 0.000 | 0.080 | gw-r/thread-50/journal/page | none observed |

## P3 / L1024 / read (216 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.382 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.523 | 200.689 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.076 | 0.037 | 0.000 | 0.076 |
| p99 | 204.280 | n/a | n/a | n/a | 0.081 | n/a | 0.000 | 0.000 | 2.270 | 203.401 | 4.626 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.177 | 0.081 | 0.001 | 0.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 61bfd503864eb7040000000000000f22 | 213.704 | 0.036 | n/a | 0.000 | 0.000 | 0.646 | 200.983 | 0.004 | 11.908 | 0.053 | 0.000 | n/a | n/a | 0.073 | 0.036 | 0.000 | 0.073 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000f20 | 206.573 | 0.038 | n/a | 0.000 | 0.000 | 0.486 | 205.938 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.067 | 0.038 | 0.000 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb7040000000000000fb3 | 204.280 | 0.059 | n/a | 0.000 | 0.000 | 3.086 | 200.964 | 0.010 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.094 | 0.059 | 0.000 | 0.094 | gw-r/thread-70/journal/page | none observed |
| 61bfd503864eb7040000000000000fe4 | 204.088 | 0.039 | n/a | 0.000 | 0.000 | 0.510 | 203.401 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.096 | 0.039 | 0.000 | 0.096 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000000fb6 | 204.064 | 0.029 | n/a | 0.000 | 0.000 | 0.398 | 203.540 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.064 | 0.029 | 0.000 | 0.064 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb7040000000000000f1b | 203.861 | 0.036 | n/a | 0.000 | 0.000 | 0.507 | 203.183 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.096 | 0.036 | 0.000 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb7040000000000000f47 | 203.282 | 0.026 | n/a | 0.000 | 0.000 | 2.638 | 200.526 | 0.004 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.070 | 0.026 | 0.000 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb7040000000000000f4d | 202.839 | 0.027 | n/a | 0.000 | 0.000 | 1.698 | 200.979 | 0.005 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.066 | 0.027 | 0.000 | 0.066 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000000f0e | 202.770 | 0.060 | n/a | 0.000 | 0.000 | 1.076 | 201.420 | 0.008 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.122 | 0.060 | 0.000 | 0.122 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000000f92 | 202.624 | 0.094 | n/a | 0.000 | 0.000 | 1.088 | 201.184 | 0.007 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.172 | 0.094 | 0.000 | 0.172 | gw-r/thread-50/journal/page | none observed |
| 61bfd503864eb7040000000000000fa7 | 202.551 | 0.047 | n/a | 0.000 | 0.000 | 0.790 | 201.497 | 0.010 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.101 | 0.047 | 0.000 | 0.101 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000000f94 | 202.492 | 0.054 | n/a | 0.000 | 0.000 | 1.623 | 200.626 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.149 | 0.054 | 0.000 | 0.149 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb7040000000000000f4a | 202.443 | 0.047 | n/a | 0.000 | 0.000 | 0.748 | 201.461 | 0.013 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.088 | 0.047 | 0.000 | 0.088 | gw-r/thread-50/journal/page | none observed |
| 61bfd503864eb7040000000000000fd7 | 202.443 | 0.051 | n/a | 0.000 | 0.000 | 0.788 | 201.317 | 0.011 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.177 | 0.051 | 0.000 | 0.177 | gw-r/thread-70/journal/page | none observed |
| 61bfd503864eb7040000000000000fb4 | 202.443 | 0.052 | n/a | 0.000 | 0.000 | 0.846 | 201.313 | 0.006 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.149 | 0.052 | 0.000 | 0.149 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb7040000000000000f74 | 202.399 | 0.036 | n/a | 0.000 | 0.000 | 0.543 | 201.628 | 0.011 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.081 | 0.036 | 0.000 | 0.081 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb7040000000000000fac | 202.399 | 0.039 | n/a | 0.000 | 0.000 | 0.758 | 201.365 | 0.012 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.107 | 0.039 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb7040000000000000f61 | 202.345 | 0.041 | n/a | 0.000 | 0.000 | 1.247 | 200.883 | 0.008 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.107 | 0.041 | 0.000 | 0.107 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000fd4 | 202.272 | 0.038 | n/a | 0.000 | 0.000 | 0.809 | 201.240 | 0.009 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.101 | 0.038 | 0.000 | 0.101 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000000f80 | 202.228 | 0.063 | n/a | 0.000 | 0.000 | 0.865 | 201.057 | 0.026 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.132 | 0.063 | 0.000 | 0.132 | gw-r/thread-52/journal/page | none observed |

## P3 / tail / read (70 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.338 | n/a | n/a | n/a | 0.032 | n/a | 0.000 | 0.000 | 0.494 | 200.662 | 0.005 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.076 | 0.032 | 0.000 | 0.076 |
| p99 | 202.305 | n/a | n/a | n/a | 0.087 | n/a | 0.000 | 0.000 | 1.165 | 201.260 | 0.955 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.185 | 0.087 | 0.001 | 0.185 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 61bfd503864eb7040000000000000ffc | 202.305 | 0.060 | n/a | 0.000 | 0.000 | 0.746 | 201.219 | 0.012 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.172 | 0.060 | 0.000 | 0.172 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000001001 | 202.240 | 0.059 | n/a | 0.000 | 0.000 | 1.165 | 200.794 | 0.005 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.161 | 0.059 | 0.000 | 0.161 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000001011 | 202.238 | 0.035 | n/a | 0.000 | 0.000 | 0.813 | 201.193 | 0.015 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.077 | 0.035 | 0.000 | 0.077 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb7040000000000000ffd | 202.072 | 0.054 | n/a | 0.000 | 0.000 | 0.610 | 201.133 | 0.010 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.185 | 0.054 | 0.000 | 0.185 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000001004 | 201.970 | 0.029 | n/a | 0.000 | 0.000 | 0.528 | 201.260 | 0.010 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.065 | 0.029 | 0.000 | 0.065 | gw-r/thread-70/journal/page | none observed |
| 61bfd503864eb7040000000000001022 | 201.936 | 0.075 | n/a | 0.000 | 0.000 | 0.782 | 200.888 | 0.006 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.120 | 0.075 | 0.000 | 0.120 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb7040000000000001028 | 201.879 | 0.025 | n/a | 0.000 | 0.000 | 0.721 | 201.000 | 0.007 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.065 | 0.025 | 0.000 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb704000000000000102b | 201.847 | 0.037 | n/a | 0.000 | 0.000 | 0.518 | 201.112 | 0.009 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.096 | 0.037 | 0.000 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb7040000000000001042 | 201.812 | 0.028 | n/a | 0.000 | 0.000 | 0.682 | 200.969 | 0.008 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.064 | 0.028 | 0.000 | 0.064 | gw-r/thread-50/journal/page | none observed |
| 61bfd503864eb704000000000000102c | 201.799 | 0.043 | n/a | 0.000 | 0.000 | 0.430 | 201.138 | 0.013 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.082 | 0.043 | 0.000 | 0.082 | gw-r/thread-70/journal/page | none observed |
| 61bfd503864eb7040000000000001003 | 201.797 | 0.037 | n/a | 0.000 | 0.000 | 0.683 | 200.884 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.132 | 0.037 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 61bfd503864eb704000000000000100e | 201.790 | 0.028 | n/a | 0.000 | 0.000 | 0.550 | 201.047 | 0.009 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.076 | 0.028 | 0.000 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb7040000000000001032 | 201.782 | 0.050 | n/a | 0.000 | 0.000 | 0.785 | 200.771 | 0.006 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.111 | 0.050 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000001037 | 201.775 | 0.032 | n/a | 0.000 | 0.000 | 0.488 | 201.062 | 0.011 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.096 | 0.032 | 0.000 | 0.096 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb7040000000000001027 | 201.771 | 0.046 | n/a | 0.000 | 0.000 | 0.722 | 200.815 | 0.006 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.107 | 0.046 | 0.000 | 0.107 | gw-r/thread-70/journal/page | none observed |
| 61bfd503864eb704000000000000102d | 201.703 | 0.050 | n/a | 0.000 | 0.000 | 0.650 | 200.765 | 0.006 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.156 | 0.050 | 0.000 | 0.156 | gw-r/thread-45/journal/page | none observed |
| 61bfd503864eb704000000000000101a | 201.670 | 0.042 | n/a | 0.000 | 0.000 | 0.727 | 200.754 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.097 | 0.042 | 0.000 | 0.097 | gw-r/thread-47/journal/page | none observed |
| 61bfd503864eb704000000000000101b | 201.669 | 0.035 | n/a | 0.000 | 0.000 | 0.764 | 200.749 | 0.004 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.072 | 0.035 | 0.000 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 61bfd503864eb7040000000000001033 | 201.662 | 0.034 | n/a | 0.000 | 0.000 | 0.718 | 200.772 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.084 | 0.034 | 0.000 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 61bfd503864eb7040000000000001034 | 201.656 | 0.023 | n/a | 0.000 | 0.000 | 0.551 | 200.942 | 0.009 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.067 | 0.023 | 0.000 | 0.067 | gw-r/thread-52/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3530 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/4.266 ms; post-ACK p50/p99: 0.390/1.920 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 11.943 | 11.427 | 11.158 | reported |
| All-primary p99 ms | 48.326 | 47.529 | 45.637 | <=50 |
| L256 5-10 p50Ms | 11.327 | 10.815 | 10.815 | <=10 |
| L256 5-10 p99Ms | 34.874 | 34.549 | 34.548 | <=50 |
| L256 11-25 p50Ms | 14.783 | 14.335 | 14.335 | <=10 |
| L256 11-25 p99Ms | 22.358 | 21.711 | 21.705 | <=50 |
| L256 26-50 p50Ms | 15.423 | 14.719 | 13.119 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 16.866 | 15.911 | 15.908 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 10.367 | 10.047 | 9.791 | <=10 |
| Burst 11-25 p50 ms | 12.799 | 12.159 | 11.839 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 34.874 | 34.549 | 34.548 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 21.619 | 20.174 | 20.173 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 8 | 23.893/94.014 | 23.013 | 16.262 | 32.909 | 0.116/0.025 |
| 5-10 | >=1000 | 57 | 13.388/56.144 | 13.143 | 8.075 | 19.099 | 0.077/0.019 |
| 5-10 | 250-1000 | 65 | 12.586/40.722 | 12.155 | 8.115 | 18.859 | 0.071/0.019 |
| 11-25 | 250-1000 | 35 | 16.369/37.196 | 15.320 | 9.900 | 22.858 | 0.081/0.023 |
| 5-10 | 100-250 | 22 | 11.314/75.274 | 10.716 | 6.283 | 15.270 | 0.070/0.020 |
| 11-25 | >=1000 | 24 | 15.763/97.135 | 15.250 | 9.399 | 21.747 | 0.089/0.020 |
| 26-50 | 250-1000 | 14 | 19.352/33.553 | 16.816 | 9.478 | 25.771 | 0.108/0.021 |
| 11-25 | 100-250 | 14 | 12.541/24.549 | 11.926 | 7.698 | 17.985 | 0.071/0.020 |
| 11-25 | overlap | 422 | 14.206/46.032 | 13.544 | 8.732 | 19.506 | 0.043/0.018 |
| 5-10 | 0-50 | 1054 | 8.906/30.761 | 8.604 | 4.895 | 12.019 | 0.045/0.017 |
| 5-10 | 50-100 | 63 | 9.254/33.981 | 8.920 | 5.337 | 12.704 | 0.052/0.018 |
| 11-25 | 0-50 | 488 | 11.098/37.674 | 10.476 | 5.997 | 14.568 | 0.050/0.018 |
| 26-50 | overlap | 153 | 18.077/48.573 | 17.034 | 9.456 | 23.615 | 0.057/0.018 |
| 11-25 | 50-100 | 33 | 12.452/20.814 | 11.864 | 6.319 | 16.817 | 0.070/0.019 |
| 5-10 | overlap | 876 | 11.778/51.943 | 11.386 | 7.632 | 16.934 | 0.037/0.016 |
| 26-50 | 0-50 | 188 | 15.087/47.518 | 13.872 | 7.397 | 19.433 | 0.065/0.020 |
| 26-50 | 50-100 | 14 | 15.053/24.024 | 14.197 | 8.012 | 20.969 | 0.082/0.019 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1849 | 9 | 666.730 |
| burst | 1681 | 20 | 1224.725 |

## Writer heap, GC and scheduler stalls

Source f9a84dcb52993e2ceff0210533d12e885ceb6d0d; 3530 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 438.887 / 538.650 |
| GC events / total duration / maximum ms | 670 / 1519.313 / 46.023 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":658,"4":6,"8":6} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 48.326 / 29 / 1891.455 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.
