# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (310.833 ms, trace `235efacc4d3d0263000000000000005b`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (192.680 ms, trace `235efacc4d3d026300000000000000be`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (115.371 ms, trace `235efacc4d3d026300000000000000f0`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (108.870 ms, trace `235efacc4d3d026300000000000000ef`); `gw-w/thread-62/peer.transact-await (includes order/network/storage)` (101.868 ms, trace `235efacc4d3d026300000000000000ee`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p4-smoke-n`; source `04dd61f7ae9431b4ea3053f191c001a944c8a7d8`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 84/84 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 84/84. Raw trace bytes: 753719.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 98 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1271.744 | 163.108 | 7.048 | 36 |
| baseline | 0 | 1972.394 | 32.928 | 1.388 | 44 |
| L1 | 1 | 1976.106 | 134.768 | 3.203 | 30 |
| L4 | 4 | 1959.579 | 287.359 | 10.039 | 44 |
| L16 | 16 | 1951.592 | 277.870 | 6.991 | 44 |
| L64 | 16 | 1929.984 | 203.225 | 3.891 | 44 |
| L256 | 16 | 1950.852 | 212.119 | 2.787 | 58 |
| L1024 | 16 | 1906.981 | 244.516 | 8.504 | 16 |
| recovery | 16 | 1951.833 | 172.078 | 5.092 | 44 |
| p4mix | 1 | 1991.245 | 41.824 | 0.420 | 43 |
| p4h1 | 1 | 1665.723 | 30.967 | 1.053 | 30 |
| grow3 | 0 | 65.915 | 4.233 | 0.046 | 22 |
| p4h3 | 1 | 1780.878 | 50.583 | 0.822 | 114 |
| grow10 | 0 | 1060.164 | 322.620 | 2.413 | 30 |
| p4h10 | 1 | 2352.838 | 59.657 | 1.927 | 72 |
| presweep | 16 | 1023.859 | 90.360 | 0.722 | 30 |
| sweep | 16 | 156.105 | 37.986 | 10.816 | 131 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 235efacc4d3d0263000000000000005b | driver.queue.scheduler-dispatch | 0.122 | none | 0 / 32 |
| 235efacc4d3d0263000000000000005b | driver.queue.scheduler-late | 0.005 | none | 0 / 32 |

Observed active steps while trace 235efacc4d3d0263000000000000005b waited: []

| 235efacc4d3d026300000000000000be | driver.queue.scheduler-dispatch | 0.115 | none | 0 / 32 |
| 235efacc4d3d026300000000000000be | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 235efacc4d3d026300000000000000be waited: []

| 235efacc4d3d026300000000000000f0 | driver.queue.scheduler-dispatch | 0.010 | none | 9 / 32 |
| 235efacc4d3d026300000000000000f0 | driver.queue.scheduler-late | 0.000 | none | 9 / 32 |

Observed active steps while trace 235efacc4d3d026300000000000000f0 waited: []

| 235efacc4d3d026300000000000000ef | driver.queue.scheduler-dispatch | 0.010 | none | 8 / 32 |
| 235efacc4d3d026300000000000000ef | driver.queue.scheduler-late | 0.000 | none | 8 / 32 |

Observed active steps while trace 235efacc4d3d026300000000000000ef waited: []

| 235efacc4d3d026300000000000000ee | driver.queue.scheduler-dispatch | 0.010 | none | 7 / 32 |
| 235efacc4d3d026300000000000000ee | driver.queue.scheduler-late | 0.000 | none | 7 / 32 |

Observed active steps while trace 235efacc4d3d026300000000000000ee waited: []

## P2 / warmup / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 63.072 | 0.725 | 0.000 | 1.539 | 13.400 | 0.015 | 0.000 | 0.314 | 3.841 | 10.323 | 0.215 | n/a | 0.667 | 13.316 | n/a | n/a | 0.088 | 14.785 | 0.202 | 0.088 |
| p99 | 73.239 | 4.133 | 0.000 | 5.182 | 18.482 | 0.452 | 0.000 | 1.369 | 19.294 | 28.642 | 0.363 | n/a | 4.631 | 22.020 | n/a | n/a | 0.625 | 19.022 | 0.302 | 0.625 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d02630000000000000039 | 73.239 | 13.400 | 0.015 | 0.000 | 1.369 | 2.322 | 28.642 | 0.215 | n/a | 4.631 | 22.020 | n/a | n/a | 0.625 | 14.785 | 0.202 | 0.625 | gw-w/thread-47/commit.prepare-and-validate | none observed |
| 235efacc4d3d0263000000000000003d | 63.072 | 18.482 | 0.452 | 0.000 | 0.089 | 19.294 | 10.323 | 0.363 | n/a | 0.667 | 13.316 | n/a | n/a | 0.088 | 19.022 | 0.302 | 0.088 | node-14/thread-9/socket.wait-first-byte | none observed |
| 235efacc4d3d0263000000000000003f | 21.738 | 3.389 | 0.006 | 0.000 | 0.314 | 3.841 | 4.188 | 0.051 | n/a | 0.288 | 9.611 | n/a | n/a | 0.049 | 3.709 | 0.171 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.493 | n/a | n/a | n/a | 11.721 | 0.493 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 12.481 | 0.998 | 0.015 |
| p99 | 178.815 | n/a | n/a | n/a | 134.536 | 15.672 | 25.541 | 0.000 | 2.664 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 48.935 | 161.933 | 0.999 | 48.935 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d0263000000000000003a | 178.815 | 134.536 | 1.856 | 25.541 | 0.000 | 2.664 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.219 | 161.933 | 0.906 | 14.219 | node-14/thread-3/client.reach-decode-and-cache | driver.worker-message 0.726ms |
| 235efacc4d3d02630000000000000066 | 135.497 | 84.872 | 3.523 | 18.392 | 0.000 | 0.881 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.829 | 106.788 | 0.788 | 27.829 | node-14/thread-3/client.reach-decode-and-cache | none observed |
| 235efacc4d3d02630000000000000082 | 109.214 | 56.088 | 1.468 | 5.759 | 0.000 | 0.791 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 45.108 | 63.315 | 0.580 | 45.108 | node-14/thread-3/socket.wait-first-byte | none observed |
| 235efacc4d3d0263000000000000006f | 64.459 | 13.767 | 1.099 | 0.000 | 0.000 | 0.658 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 48.935 | 14.866 | 0.231 | 48.935 | node-14/thread-3/socket.wait-first-byte | none observed |
| 235efacc4d3d02630000000000000060 | 61.720 | 29.396 | 0.778 | 0.583 | 0.000 | 0.907 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.056 | 30.757 | 0.498 | 30.056 | node-14/thread-3/socket.wait-first-byte | none observed |
| 235efacc4d3d026300000000000000c5 | 34.398 | 16.519 | 15.672 | 0.000 | 0.000 | 0.514 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.693 | 32.191 | 0.936 | 1.693 | node-14/thread-0/rpc.gateway-observer.observe | client.encode 3.325ms |
| 235efacc4d3d026300000000000000d4 | 23.042 | 13.776 | 0.703 | 0.000 | 0.000 | 1.311 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.251 | 14.479 | 0.628 | 7.251 | node-14/thread-2/replica.pull-at | none observed |
| 235efacc4d3d026300000000000000d8 | 21.665 | 21.406 | 0.240 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 21.646 | 0.999 | 0.019 | node-14/thread-2/replica.pull-at | none observed |
| 235efacc4d3d02630000000000000097 | 14.550 | 14.410 | 0.117 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 14.528 | 0.998 | 0.022 | node-14/thread-2/replica.pull-at | none observed |
| 235efacc4d3d02630000000000000078 | 13.013 | 9.699 | 3.302 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 13.001 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| 235efacc4d3d0263000000000000004b | 12.493 | 12.398 | 0.083 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 12.481 | 0.999 | 0.012 | node-14/thread-2/replica.pull-at | none observed |
| 235efacc4d3d0263000000000000006b | 11.866 | 11.721 | 0.129 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 11.850 | 0.999 | 0.017 | node-14/thread-2/replica.pull-at | none observed |
| 235efacc4d3d026300000000000000a3 | 10.530 | 10.467 | 0.048 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 10.516 | 0.999 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| 235efacc4d3d026300000000000000b6 | 10.298 | 10.037 | 0.249 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 10.286 | 0.999 | 0.012 | node-14/thread-2/replica.pull-at | none observed |
| 235efacc4d3d0263000000000000008f | 8.720 | 8.633 | 0.072 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 8.704 | 0.998 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| 235efacc4d3d02630000000000000040 | 8.295 | 7.499 | 0.785 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 8.283 | 0.999 | 0.011 | node-14/thread-2/replica.pull-at | none observed |
| 235efacc4d3d026300000000000000df | 7.740 | 7.660 | 0.066 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 7.725 | 0.998 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| 235efacc4d3d026300000000000000af | 7.638 | 7.572 | 0.055 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 7.627 | 0.999 | 0.011 | node-14/thread-2/replica.pull-at | none observed |
| 235efacc4d3d02630000000000000086 | 6.925 | 6.420 | 0.493 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 6.913 | 0.998 | 0.012 | node-14/thread-2/replica.pull-at | none observed |
| 235efacc4d3d02630000000000000052 | 6.831 | 0.422 | 6.396 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 6.818 | 0.998 | 0.013 | node-14/thread-0/rpc.replica.observe | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.738 | 0.521 | 0.000 | 1.539 | 3.389 | 0.006 | 0.000 | 0.314 | 3.841 | 4.188 | 0.051 | n/a | 0.288 | 9.611 | n/a | n/a | 0.049 | 3.709 | 0.171 | 0.049 |
| p99 | 21.738 | 0.521 | 0.000 | 1.539 | 3.389 | 0.006 | 0.000 | 0.314 | 3.841 | 4.188 | 0.051 | n/a | 0.288 | 9.611 | n/a | n/a | 0.049 | 3.709 | 0.171 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d0263000000000000003f | 21.738 | 3.389 | 0.006 | 0.000 | 0.314 | 3.841 | 4.188 | 0.051 | n/a | 0.288 | 9.611 | n/a | n/a | 0.049 | 3.709 | 0.171 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.993 | 0.452 | 0.000 | 0.579 | 4.689 | 0.204 | 0.000 | 0.108 | 1.856 | 4.463 | 0.065 | n/a | 0.545 | 10.730 | n/a | n/a | 0.053 | 5.491 | 0.214 | 0.053 |
| p99 | 48.902 | 2.922 | 0.330 | 3.621 | 7.591 | 0.333 | 1.250 | 0.806 | 2.718 | 13.679 | 0.196 | n/a | 2.785 | 30.974 | n/a | n/a | 0.081 | 8.924 | 0.317 | 0.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d02630000000000000091 | 48.902 | 3.836 | 0.225 | 0.243 | 0.108 | 1.960 | 11.237 | 0.073 | n/a | 0.193 | 30.974 | n/a | n/a | 0.053 | 4.412 | 0.090 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000d0 | 37.279 | 4.667 | 0.228 | 0.409 | 0.090 | 2.169 | 10.892 | 0.196 | n/a | 0.749 | 17.829 | n/a | n/a | 0.050 | 5.394 | 0.145 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d0263000000000000008e | 34.434 | 7.591 | 0.006 | 0.000 | 0.245 | 1.658 | 2.198 | 0.049 | n/a | 0.709 | 21.928 | n/a | n/a | 0.049 | 7.842 | 0.228 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000cc | 31.367 | 4.694 | 0.333 | 0.331 | 0.087 | 2.581 | 13.679 | 0.065 | n/a | 0.197 | 9.356 | n/a | n/a | 0.045 | 5.445 | 0.174 | 0.045 | gw-w/thread-46/gateway.admitted-work | none observed |
| 235efacc4d3d026300000000000000a1 | 31.188 | 7.389 | 0.204 | 1.250 | 0.081 | 2.703 | 7.592 | 0.173 | n/a | 1.281 | 10.471 | n/a | n/a | 0.043 | 8.924 | 0.286 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000041 | 28.639 | 5.747 | 0.291 | 0.000 | 0.072 | 2.718 | 6.279 | 0.120 | n/a | 0.237 | 13.095 | n/a | n/a | 0.081 | 6.110 | 0.213 | 0.081 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000cd | 27.993 | 6.944 | 0.027 | 0.000 | 0.503 | 1.856 | 3.171 | 0.065 | n/a | 0.154 | 15.200 | n/a | n/a | 0.072 | 7.475 | 0.267 | 0.072 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000d2 | 25.436 | 4.689 | 0.216 | 0.771 | 0.092 | 2.331 | 9.362 | 0.057 | n/a | 0.400 | 7.457 | n/a | n/a | 0.060 | 5.769 | 0.227 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000a2 | 21.756 | 4.674 | 0.011 | 0.000 | 0.806 | 1.075 | 1.563 | 0.059 | n/a | 2.785 | 10.730 | n/a | n/a | 0.053 | 5.491 | 0.252 | 0.053 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000a5 | 21.266 | 6.232 | 0.005 | 0.000 | 0.513 | 0.857 | 1.938 | 0.040 | n/a | 0.683 | 10.937 | n/a | n/a | 0.061 | 6.750 | 0.317 | 0.061 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000a7 | 21.199 | 3.776 | 0.229 | 0.375 | 0.132 | 1.274 | 4.463 | 0.061 | n/a | 0.545 | 10.292 | n/a | n/a | 0.053 | 4.512 | 0.213 | 0.053 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000a8 | 16.214 | 2.776 | 0.005 | 0.000 | 0.692 | 1.265 | 3.894 | 0.102 | n/a | 1.179 | 6.265 | n/a | n/a | 0.035 | 3.474 | 0.214 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.897 | 0.000 | 0.000 | 0.382 | 4.187 | 0.006 | 0.000 | 0.088 | 1.938 | 4.276 | 0.134 | n/a | 0.539 | 11.195 | n/a | n/a | 0.073 | 4.925 | 0.198 | 0.073 |
| p99 | 24.842 | 0.559 | 0.029 | 2.083 | 4.948 | 0.275 | 0.000 | 0.956 | 3.090 | 5.395 | 0.144 | n/a | 2.084 | 11.792 | n/a | n/a | 0.095 | 5.206 | 0.225 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d02630000000000000049 | 24.842 | 4.562 | 0.275 | 0.000 | 0.088 | 3.090 | 4.276 | 0.144 | n/a | 0.539 | 11.792 | n/a | n/a | 0.075 | 4.925 | 0.198 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000045 | 24.534 | 4.948 | 0.179 | 0.000 | 0.079 | 2.292 | 4.998 | 0.134 | n/a | 0.661 | 11.195 | n/a | n/a | 0.050 | 5.206 | 0.212 | 0.050 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000043 | 22.897 | 4.187 | 0.005 | 0.000 | 0.956 | 0.836 | 5.395 | 0.049 | n/a | 0.133 | 11.241 | n/a | n/a | 0.095 | 5.148 | 0.225 | 0.095 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000047 | 21.761 | 3.386 | 0.006 | 0.000 | 0.753 | 1.938 | 4.222 | 0.140 | n/a | 2.084 | 9.158 | n/a | n/a | 0.073 | 4.145 | 0.190 | 0.073 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.761 | 0.410 | 0.000 | 1.729 | 3.386 | 0.005 | 0.000 | 0.753 | 0.836 | 4.222 | 0.049 | n/a | 0.133 | 9.158 | n/a | n/a | 0.073 | 4.145 | 0.190 | 0.073 |
| p99 | 22.897 | 0.559 | 0.029 | 2.083 | 4.187 | 0.006 | 0.000 | 0.956 | 1.938 | 5.395 | 0.140 | n/a | 2.084 | 11.241 | n/a | n/a | 0.095 | 5.148 | 0.225 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d02630000000000000043 | 22.897 | 4.187 | 0.005 | 0.000 | 0.956 | 0.836 | 5.395 | 0.049 | n/a | 0.133 | 11.241 | n/a | n/a | 0.095 | 5.148 | 0.225 | 0.095 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000047 | 21.761 | 3.386 | 0.006 | 0.000 | 0.753 | 1.938 | 4.222 | 0.140 | n/a | 2.084 | 9.158 | n/a | n/a | 0.073 | 4.145 | 0.190 | 0.073 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.490 | 0.409 | 0.000 | 0.681 | 6.238 | 0.204 | 0.000 | 0.091 | 2.183 | 7.508 | 0.073 | n/a | 0.413 | 18.426 | n/a | n/a | 0.050 | 6.532 | 0.197 | 0.050 |
| p99 | 41.119 | 0.562 | 0.000 | 2.043 | 6.914 | 0.282 | 0.000 | 0.832 | 2.275 | 9.110 | 0.129 | n/a | 3.664 | 21.064 | n/a | n/a | 0.069 | 7.283 | 0.211 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d02630000000000000050 | 41.119 | 6.238 | 0.204 | 0.000 | 0.091 | 2.183 | 7.508 | 0.129 | n/a | 3.664 | 21.064 | n/a | n/a | 0.038 | 6.532 | 0.159 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d0263000000000000004d | 34.490 | 6.914 | 0.282 | 0.000 | 0.087 | 2.275 | 5.951 | 0.073 | n/a | 0.413 | 18.426 | n/a | n/a | 0.069 | 7.283 | 0.211 | 0.069 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d0263000000000000004a | 26.542 | 4.398 | 0.005 | 0.000 | 0.832 | 1.489 | 9.110 | 0.068 | n/a | 0.406 | 10.183 | n/a | n/a | 0.050 | 5.235 | 0.197 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.360 | 0.478 | 0.000 | 1.953 | 5.278 | 0.005 | 0.000 | 0.127 | 1.354 | 6.286 | 0.074 | n/a | 0.279 | 13.584 | n/a | n/a | 0.035 | 6.292 | 0.239 | 0.035 |
| p99 | 50.584 | 1.763 | 0.008 | 2.234 | 11.920 | 6.972 | 0.624 | 1.010 | 3.039 | 10.707 | 0.167 | n/a | 1.099 | 24.510 | n/a | n/a | 0.051 | 19.643 | 0.388 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d02630000000000000059 | 50.584 | 11.920 | 6.972 | 0.624 | 0.127 | 2.745 | 6.286 | 0.167 | n/a | 1.099 | 20.595 | n/a | n/a | 0.049 | 19.643 | 0.388 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000056 | 37.320 | 9.275 | 0.188 | 0.000 | 0.071 | 3.039 | 10.707 | 0.144 | n/a | 0.279 | 13.584 | n/a | n/a | 0.034 | 9.534 | 0.255 | 0.034 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000053 | 33.360 | 4.527 | 0.005 | 0.000 | 0.298 | 1.354 | 2.087 | 0.052 | n/a | 0.476 | 24.510 | n/a | n/a | 0.051 | 4.830 | 0.145 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000051 | 26.374 | 5.278 | 0.005 | 0.000 | 1.010 | 0.862 | 6.887 | 0.074 | n/a | 0.135 | 12.089 | n/a | n/a | 0.035 | 6.292 | 0.239 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 71.591 | 0.800 | 0.000 | 1.067 | 5.254 | 0.010 | 0.000 | 0.123 | 3.757 | 20.989 | 0.079 | n/a | 0.302 | 30.761 | n/a | n/a | 0.061 | 6.008 | 0.047 | 0.061 |
| p99 | 408.970 | 1.004 | 0.005 | 2.211 | 12.297 | 0.368 | 2.167 | 0.744 | 7.490 | 40.058 | 0.172 | n/a | 2.068 | 367.471 | n/a | n/a | 0.091 | 14.894 | 0.238 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d0263000000000000005b | 408.970 | 9.542 | 0.368 | 0.693 | 0.127 | 7.490 | 20.989 | 0.136 | n/a | 2.068 | 367.471 | n/a | n/a | 0.086 | 10.730 | 0.026 | 0.086 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.451ms; driver.publication 1.320ms |
| 235efacc4d3d0263000000000000005f | 127.153 | 5.254 | 0.010 | 0.000 | 0.744 | 3.757 | 40.058 | 0.079 | n/a | 0.477 | 76.713 | n/a | n/a | 0.061 | 6.008 | 0.047 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000063 | 71.591 | 12.297 | 0.320 | 2.167 | 0.110 | 3.212 | 22.159 | 0.172 | n/a | 0.302 | 30.761 | n/a | n/a | 0.091 | 14.894 | 0.208 | 0.091 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d0263000000000000005c | 20.638 | 4.788 | 0.009 | 0.000 | 0.123 | 3.772 | 1.345 | 0.025 | n/a | 0.057 | 10.476 | n/a | n/a | 0.044 | 4.920 | 0.238 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.638 | 0.800 | 0.000 | 2.045 | 4.788 | 0.009 | 0.000 | 0.123 | 3.757 | 1.345 | 0.025 | n/a | 0.057 | 10.476 | n/a | n/a | 0.044 | 4.920 | 0.047 | 0.044 |
| p99 | 127.153 | 0.846 | 0.005 | 2.211 | 5.254 | 0.010 | 0.000 | 0.744 | 3.772 | 40.058 | 0.079 | n/a | 0.477 | 76.713 | n/a | n/a | 0.061 | 6.008 | 0.238 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d0263000000000000005f | 127.153 | 5.254 | 0.010 | 0.000 | 0.744 | 3.757 | 40.058 | 0.079 | n/a | 0.477 | 76.713 | n/a | n/a | 0.061 | 6.008 | 0.047 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d0263000000000000005c | 20.638 | 4.788 | 0.009 | 0.000 | 0.123 | 3.772 | 1.345 | 0.025 | n/a | 0.057 | 10.476 | n/a | n/a | 0.044 | 4.920 | 0.238 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 49.155 | 0.000 | 0.000 | 0.374 | 3.973 | 0.005 | 0.435 | 0.069 | 1.178 | 13.377 | 0.120 | n/a | 0.139 | 28.851 | n/a | n/a | 0.034 | 4.695 | 0.101 | 0.034 |
| p99 | 116.632 | 3.421 | 0.000 | 5.045 | 10.305 | 0.245 | 0.789 | 1.098 | 3.033 | 22.029 | 0.134 | n/a | 0.287 | 89.594 | n/a | n/a | 0.046 | 12.197 | 0.128 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d02630000000000000064 | 116.632 | 10.305 | 0.005 | 0.789 | 1.098 | 1.178 | 13.377 | 0.125 | n/a | 0.115 | 89.594 | n/a | n/a | 0.046 | 12.197 | 0.105 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000068 | 70.590 | 6.155 | 0.245 | 0.687 | 0.067 | 3.033 | 22.029 | 0.134 | n/a | 0.179 | 38.028 | n/a | n/a | 0.034 | 7.154 | 0.101 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d0263000000000000006d | 49.155 | 3.973 | 0.172 | 0.435 | 0.069 | 1.653 | 20.965 | 0.120 | n/a | 0.287 | 21.448 | n/a | n/a | 0.033 | 4.649 | 0.095 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d0263000000000000006a | 36.631 | 3.860 | 0.004 | 0.000 | 0.830 | 1.001 | 1.857 | 0.046 | n/a | 0.139 | 28.851 | n/a | n/a | 0.042 | 4.695 | 0.128 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.631 | 0.931 | 0.000 | 1.996 | 3.860 | 0.004 | 0.000 | 0.830 | 1.001 | 1.857 | 0.046 | n/a | 0.139 | 28.851 | n/a | n/a | 0.042 | 4.695 | 0.128 | 0.042 |
| p99 | 36.631 | 0.931 | 0.000 | 1.996 | 3.860 | 0.004 | 0.000 | 0.830 | 1.001 | 1.857 | 0.046 | n/a | 0.139 | 28.851 | n/a | n/a | 0.042 | 4.695 | 0.128 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d0263000000000000006a | 36.631 | 3.860 | 0.004 | 0.000 | 0.830 | 1.001 | 1.857 | 0.046 | n/a | 0.139 | 28.851 | n/a | n/a | 0.042 | 4.695 | 0.128 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 94.327 | 0.537 | 0.000 | 1.613 | 5.488 | 0.010 | 0.000 | 0.782 | 2.235 | 7.716 | 0.065 | n/a | 0.957 | 55.325 | n/a | n/a | 0.050 | 6.279 | 0.140 | 0.050 |
| p99 | 113.983 | 1.004 | 0.005 | 1.781 | 12.965 | 0.234 | 1.595 | 0.871 | 4.767 | 21.215 | 0.219 | n/a | 3.448 | 99.553 | n/a | n/a | 0.128 | 13.627 | 0.221 | 0.128 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d0263000000000000006e | 113.983 | 5.488 | 0.010 | 0.000 | 0.782 | 1.422 | 6.087 | 0.065 | n/a | 0.527 | 99.553 | n/a | n/a | 0.049 | 6.279 | 0.055 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000077 | 95.980 | 3.870 | 0.005 | 0.000 | 0.871 | 2.235 | 7.716 | 0.051 | n/a | 3.330 | 77.853 | n/a | n/a | 0.050 | 4.746 | 0.049 | 0.050 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000079 | 94.327 | 11.301 | 0.234 | 1.595 | 0.066 | 2.355 | 19.830 | 0.123 | n/a | 3.448 | 55.325 | n/a | n/a | 0.050 | 13.196 | 0.140 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000072 | 70.719 | 12.965 | 0.216 | 0.321 | 0.125 | 4.767 | 21.215 | 0.219 | n/a | 0.957 | 29.875 | n/a | n/a | 0.060 | 13.627 | 0.193 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000074 | 22.856 | 4.215 | 0.008 | 0.000 | 0.820 | 1.549 | 1.586 | 0.037 | n/a | 0.152 | 14.361 | n/a | n/a | 0.128 | 5.043 | 0.221 | 0.128 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 95.980 | 0.537 | 0.000 | 1.707 | 4.215 | 0.008 | 0.000 | 0.820 | 1.549 | 6.087 | 0.051 | n/a | 0.527 | 77.853 | n/a | n/a | 0.050 | 5.043 | 0.055 | 0.050 |
| p99 | 113.983 | 0.883 | 0.005 | 1.781 | 5.488 | 0.010 | 0.000 | 0.871 | 2.235 | 7.716 | 0.065 | n/a | 3.330 | 99.553 | n/a | n/a | 0.128 | 6.279 | 0.221 | 0.128 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d0263000000000000006e | 113.983 | 5.488 | 0.010 | 0.000 | 0.782 | 1.422 | 6.087 | 0.065 | n/a | 0.527 | 99.553 | n/a | n/a | 0.049 | 6.279 | 0.055 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000077 | 95.980 | 3.870 | 0.005 | 0.000 | 0.871 | 2.235 | 7.716 | 0.051 | n/a | 3.330 | 77.853 | n/a | n/a | 0.050 | 4.746 | 0.049 | 0.050 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000074 | 22.856 | 4.215 | 0.008 | 0.000 | 0.820 | 1.549 | 1.586 | 0.037 | n/a | 0.152 | 14.361 | n/a | n/a | 0.128 | 5.043 | 0.221 | 0.128 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 48.580 | 0.000 | 0.000 | 0.307 | 4.281 | 0.139 | 0.000 | 0.068 | 2.679 | 17.072 | 0.111 | n/a | 1.561 | 20.738 | n/a | n/a | 0.034 | 4.488 | 0.092 | 0.034 |
| p99 | 55.221 | 0.444 | 0.000 | 1.500 | 7.091 | 0.160 | 0.563 | 0.069 | 3.835 | 20.956 | 0.201 | n/a | 3.254 | 20.942 | n/a | n/a | 0.046 | 7.884 | 0.143 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d0263000000000000007b | 55.221 | 7.091 | 0.160 | 0.563 | 0.069 | 3.835 | 20.956 | 0.201 | n/a | 1.561 | 20.738 | n/a | n/a | 0.046 | 7.884 | 0.143 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d0263000000000000007e | 48.580 | 4.281 | 0.139 | 0.000 | 0.068 | 2.679 | 17.072 | 0.111 | n/a | 3.254 | 20.942 | n/a | n/a | 0.034 | 4.488 | 0.092 | 0.034 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.035 | 0.501 | 0.000 | 0.742 | 4.885 | 0.009 | 0.000 | 0.066 | 1.514 | 2.676 | 0.087 | n/a | 0.563 | 19.244 | n/a | n/a | 0.039 | 5.136 | 0.132 | 0.039 |
| p99 | 103.317 | 1.009 | 0.000 | 2.016 | 6.362 | 0.270 | 0.000 | 0.891 | 1.786 | 20.635 | 3.198 | n/a | 3.911 | 74.403 | n/a | n/a | 0.055 | 7.261 | 0.199 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d02630000000000000080 | 103.317 | 5.856 | 0.270 | 0.000 | 0.066 | 1.632 | 20.635 | 0.087 | n/a | 0.314 | 74.403 | n/a | n/a | 0.054 | 6.192 | 0.060 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000081 | 36.571 | 6.362 | 0.009 | 0.000 | 0.891 | 1.474 | 2.676 | 3.198 | n/a | 3.911 | 17.995 | n/a | n/a | 0.055 | 7.261 | 0.199 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000087 | 33.035 | 4.885 | 0.187 | 0.000 | 0.065 | 1.786 | 6.218 | 0.052 | n/a | 0.563 | 19.244 | n/a | n/a | 0.035 | 5.136 | 0.155 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000084 | 30.411 | 3.847 | 0.006 | 0.000 | 0.170 | 1.514 | 2.646 | 0.090 | n/a | 0.700 | 21.399 | n/a | n/a | 0.039 | 4.023 | 0.132 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.411 | 0.501 | 0.000 | 1.588 | 3.847 | 0.006 | 0.000 | 0.170 | 1.514 | 2.646 | 0.090 | n/a | 0.700 | 21.399 | n/a | n/a | 0.039 | 4.023 | 0.132 | 0.039 |
| p99 | 30.411 | 0.501 | 0.000 | 1.588 | 3.847 | 0.006 | 0.000 | 0.170 | 1.514 | 2.646 | 0.090 | n/a | 0.700 | 21.399 | n/a | n/a | 0.039 | 4.023 | 0.132 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d02630000000000000084 | 30.411 | 3.847 | 0.006 | 0.000 | 0.170 | 1.514 | 2.646 | 0.090 | n/a | 0.700 | 21.399 | n/a | n/a | 0.039 | 4.023 | 0.132 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 47.414 | 0.281 | 0.000 | 0.361 | 5.392 | 0.157 | 0.000 | 0.115 | 2.651 | 17.640 | 0.069 | n/a | 0.713 | 10.833 | n/a | n/a | 0.050 | 6.143 | 0.215 | 0.050 |
| p99 | 71.916 | 0.550 | 0.000 | 0.388 | 9.695 | 0.270 | 0.366 | 0.500 | 6.908 | 21.100 | 0.197 | n/a | 1.670 | 48.531 | n/a | n/a | 0.134 | 10.205 | 0.259 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d0263000000000000008a | 71.916 | 3.772 | 0.157 | 0.000 | 0.059 | 1.530 | 17.640 | 0.062 | n/a | 0.128 | 48.531 | n/a | n/a | 0.036 | 3.988 | 0.055 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000088 | 47.414 | 9.695 | 0.010 | 0.000 | 0.500 | 6.908 | 21.100 | 0.197 | n/a | 1.670 | 7.200 | n/a | n/a | 0.134 | 10.205 | 0.215 | 0.134 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d0263000000000000008c | 23.732 | 5.392 | 0.270 | 0.366 | 0.115 | 2.651 | 3.275 | 0.069 | n/a | 0.713 | 10.833 | n/a | n/a | 0.050 | 6.143 | 0.259 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 47.414 | 0.550 | 0.000 | 0.388 | 9.695 | 0.010 | 0.000 | 0.500 | 6.908 | 21.100 | 0.197 | n/a | 1.670 | 7.200 | n/a | n/a | 0.134 | 10.205 | 0.215 | 0.134 |
| p99 | 47.414 | 0.550 | 0.000 | 0.388 | 9.695 | 0.010 | 0.000 | 0.500 | 6.908 | 21.100 | 0.197 | n/a | 1.670 | 7.200 | n/a | n/a | 0.134 | 10.205 | 0.215 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d02630000000000000088 | 47.414 | 9.695 | 0.010 | 0.000 | 0.500 | 6.908 | 21.100 | 0.197 | n/a | 1.670 | 7.200 | n/a | n/a | 0.134 | 10.205 | 0.215 | 0.134 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.239 | 0.000 | 0.000 | 0.679 | 6.798 | 0.179 | 0.225 | 0.123 | 1.136 | 2.348 | 0.065 | n/a | 0.703 | 23.045 | n/a | n/a | 0.061 | 7.578 | 0.251 | 0.061 |
| p99 | 102.897 | 1.031 | 0.000 | 2.238 | 7.784 | 0.785 | 0.405 | 0.770 | 2.296 | 24.003 | 0.099 | n/a | 3.736 | 66.576 | n/a | n/a | 0.067 | 9.097 | 0.390 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d02630000000000000093 | 102.897 | 5.672 | 0.179 | 0.225 | 0.076 | 2.296 | 24.003 | 0.099 | n/a | 3.736 | 66.576 | n/a | n/a | 0.035 | 6.153 | 0.060 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000095 | 36.239 | 7.784 | 0.785 | 0.405 | 0.123 | 0.921 | 2.348 | 0.065 | n/a | 0.703 | 23.045 | n/a | n/a | 0.061 | 9.097 | 0.251 | 0.061 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d02630000000000000096 | 19.411 | 6.798 | 0.010 | 0.000 | 0.770 | 1.136 | 2.025 | 0.061 | n/a | 0.571 | 7.974 | n/a | n/a | 0.067 | 7.578 | 0.390 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.915 | 0.133 | 0.000 | 0.317 | 3.042 | 0.005 | 0.000 | 0.077 | 0.607 | 1.431 | 0.043 | n/a | 0.091 | 15.709 | n/a | n/a | 0.025 | 3.162 | 0.111 | 0.025 |
| p99 | 41.119 | 0.759 | 0.000 | 1.519 | 3.910 | 0.175 | 0.389 | 0.114 | 5.491 | 2.645 | 7.929 | n/a | 4.758 | 19.557 | n/a | n/a | 0.036 | 4.552 | 0.127 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d0263000000000000009a | 41.119 | 3.910 | 0.175 | 0.389 | 0.077 | 5.491 | 2.645 | 7.929 | n/a | 4.758 | 15.709 | n/a | n/a | 0.036 | 4.552 | 0.111 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d0263000000000000009b | 24.915 | 3.042 | 0.005 | 0.000 | 0.114 | 0.607 | 1.431 | 0.043 | n/a | 0.091 | 19.557 | n/a | n/a | 0.025 | 3.162 | 0.127 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.915 | 0.759 | 0.000 | 1.519 | 3.042 | 0.005 | 0.000 | 0.114 | 0.607 | 1.431 | 0.043 | n/a | 0.091 | 19.557 | n/a | n/a | 0.025 | 3.162 | 0.127 | 0.025 |
| p99 | 24.915 | 0.759 | 0.000 | 1.519 | 3.042 | 0.005 | 0.000 | 0.114 | 0.607 | 1.431 | 0.043 | n/a | 0.091 | 19.557 | n/a | n/a | 0.025 | 3.162 | 0.127 | 0.025 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d0263000000000000009b | 24.915 | 3.042 | 0.005 | 0.000 | 0.114 | 0.607 | 1.431 | 0.043 | n/a | 0.091 | 19.557 | n/a | n/a | 0.025 | 3.162 | 0.127 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.214 | 0.828 | 0.000 | 1.462 | 2.776 | 0.005 | 0.000 | 0.503 | 1.265 | 3.171 | 0.065 | n/a | 0.154 | 6.265 | n/a | n/a | 0.035 | 3.474 | 0.214 | 0.035 |
| p99 | 27.993 | 2.922 | 0.000 | 3.388 | 6.944 | 0.027 | 0.000 | 0.692 | 1.856 | 3.894 | 0.102 | n/a | 1.179 | 15.200 | n/a | n/a | 0.072 | 7.475 | 0.267 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d026300000000000000cd | 27.993 | 6.944 | 0.027 | 0.000 | 0.503 | 1.856 | 3.171 | 0.065 | n/a | 0.154 | 15.200 | n/a | n/a | 0.072 | 7.475 | 0.267 | 0.072 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000a8 | 16.214 | 2.776 | 0.005 | 0.000 | 0.692 | 1.265 | 3.894 | 0.102 | n/a | 1.179 | 6.265 | n/a | n/a | 0.035 | 3.474 | 0.214 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.919 | 0.471 | 0.000 | 1.433 | 3.662 | 0.005 | 0.000 | 0.344 | 1.260 | 2.860 | 0.043 | n/a | 1.286 | 18.842 | n/a | n/a | 0.039 | 4.276 | 0.153 | 0.039 |
| p99 | 97.988 | 1.279 | 0.009 | 4.440 | 5.997 | 0.323 | 0.253 | 0.589 | 3.227 | 10.235 | 0.141 | n/a | 3.618 | 80.216 | n/a | n/a | 0.055 | 6.548 | 0.235 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d026300000000000000aa | 97.988 | 5.997 | 0.005 | 0.000 | 0.546 | 0.861 | 10.155 | 0.056 | n/a | 0.110 | 80.216 | n/a | n/a | 0.042 | 6.548 | 0.067 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000ad | 42.721 | 4.158 | 0.323 | 0.253 | 0.118 | 3.227 | 10.235 | 0.052 | n/a | 0.108 | 24.193 | n/a | n/a | 0.055 | 4.852 | 0.114 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000b3 | 34.144 | 2.700 | 0.005 | 0.000 | 0.589 | 2.908 | 2.860 | 0.043 | n/a | 1.371 | 23.628 | n/a | n/a | 0.040 | 3.294 | 0.096 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.140ms |
| 235efacc4d3d026300000000000000ba | 32.049 | 5.510 | 0.010 | 0.000 | 0.160 | 1.340 | 2.477 | 0.041 | n/a | 3.618 | 18.842 | n/a | n/a | 0.050 | 5.680 | 0.177 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000b0 | 31.919 | 4.401 | 0.005 | 0.000 | 0.589 | 0.752 | 1.632 | 0.037 | n/a | 1.489 | 22.978 | n/a | n/a | 0.036 | 4.995 | 0.157 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000b9 | 27.965 | 3.662 | 0.306 | 0.240 | 0.069 | 1.497 | 9.924 | 0.055 | n/a | 0.162 | 12.012 | n/a | n/a | 0.038 | 4.276 | 0.153 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000b2 | 21.302 | 2.715 | 0.004 | 0.000 | 0.170 | 1.260 | 1.500 | 0.038 | n/a | 2.529 | 13.052 | n/a | n/a | 0.035 | 2.889 | 0.136 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000ae | 15.543 | 3.117 | 0.005 | 0.000 | 0.344 | 1.201 | 1.371 | 0.041 | n/a | 1.286 | 8.140 | n/a | n/a | 0.039 | 3.466 | 0.223 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000b7 | 12.885 | 2.648 | 0.005 | 0.000 | 0.373 | 1.177 | 2.978 | 0.141 | n/a | 0.884 | 4.644 | n/a | n/a | 0.035 | 3.026 | 0.235 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.885 | 0.471 | 0.000 | 1.369 | 2.648 | 0.004 | 0.000 | 0.170 | 1.177 | 1.500 | 0.038 | n/a | 0.884 | 4.644 | n/a | n/a | 0.035 | 2.889 | 0.136 | 0.035 |
| p99 | 21.302 | 0.774 | 0.009 | 1.433 | 2.715 | 0.005 | 0.000 | 0.373 | 1.260 | 2.978 | 0.141 | n/a | 2.529 | 13.052 | n/a | n/a | 0.035 | 3.026 | 0.235 | 0.035 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d026300000000000000b2 | 21.302 | 2.715 | 0.004 | 0.000 | 0.170 | 1.260 | 1.500 | 0.038 | n/a | 2.529 | 13.052 | n/a | n/a | 0.035 | 2.889 | 0.136 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000b7 | 12.885 | 2.648 | 0.005 | 0.000 | 0.373 | 1.177 | 2.978 | 0.141 | n/a | 0.884 | 4.644 | n/a | n/a | 0.035 | 3.026 | 0.235 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 70.963 | 0.000 | 0.000 | 0.545 | 3.881 | 7.697 | 0.330 | 0.119 | 8.000 | 8.912 | 0.131 | n/a | 0.876 | 49.136 | n/a | n/a | 0.049 | 16.986 | 0.076 | 0.049 |
| p99 | 224.457 | 1.100 | 0.000 | 1.721 | 10.007 | 12.656 | 0.620 | 0.368 | 12.684 | 12.624 | 0.152 | n/a | 3.738 | 192.680 | n/a | n/a | 0.055 | 18.393 | 0.305 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d026300000000000000be | 224.457 | 3.881 | 12.656 | 0.330 | 0.119 | 1.789 | 12.624 | 0.152 | n/a | 0.177 | 192.680 | n/a | n/a | 0.049 | 16.986 | 0.076 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000c4 | 70.963 | 3.616 | 0.005 | 0.000 | 0.368 | 12.684 | 1.338 | 0.036 | n/a | 3.738 | 49.136 | n/a | n/a | 0.042 | 3.989 | 0.056 | 0.042 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000c8 | 60.404 | 10.007 | 7.697 | 0.620 | 0.070 | 8.000 | 8.912 | 0.131 | n/a | 0.876 | 24.037 | n/a | n/a | 0.055 | 18.393 | 0.305 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.261 | 0.972 | 0.000 | 1.907 | 4.921 | 0.009 | 0.000 | 0.311 | 1.200 | 3.089 | 0.063 | n/a | 0.195 | 18.652 | n/a | n/a | 0.047 | 5.600 | 0.179 | 0.047 |
| p99 | 123.563 | 1.927 | 0.004 | 6.133 | 9.589 | 0.294 | 0.457 | 11.956 | 4.182 | 9.533 | 0.320 | n/a | 14.432 | 104.423 | n/a | n/a | 0.146 | 21.556 | 0.252 | 0.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d026300000000000000d7 | 123.563 | 9.589 | 0.012 | 0.000 | 11.956 | 4.182 | 2.067 | 0.083 | n/a | 14.432 | 81.166 | n/a | n/a | 0.077 | 21.556 | 0.174 | 0.077 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.279ms; driver.expected-state.bind-receipt 1.146ms |
| 235efacc4d3d026300000000000000d3 | 118.618 | 4.887 | 0.006 | 0.000 | 0.517 | 0.820 | 7.032 | 0.320 | n/a | 0.566 | 104.423 | n/a | n/a | 0.046 | 5.410 | 0.046 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000dd | 35.544 | 5.964 | 0.177 | 0.457 | 0.067 | 1.697 | 8.033 | 0.063 | n/a | 0.391 | 18.652 | n/a | n/a | 0.043 | 6.665 | 0.188 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000db | 31.261 | 4.921 | 0.294 | 0.296 | 0.088 | 2.315 | 9.533 | 0.100 | n/a | 0.195 | 13.371 | n/a | n/a | 0.146 | 5.600 | 0.179 | 0.146 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000d6 | 31.062 | 7.499 | 0.005 | 0.000 | 0.311 | 1.200 | 1.984 | 0.039 | n/a | 0.135 | 19.842 | n/a | n/a | 0.047 | 7.815 | 0.252 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000de | 22.969 | 4.907 | 0.009 | 0.000 | 0.673 | 0.920 | 3.089 | 0.035 | n/a | 0.133 | 13.146 | n/a | n/a | 0.058 | 5.588 | 0.243 | 0.058 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.969 | 0.972 | 0.000 | 1.907 | 4.907 | 0.009 | 0.000 | 0.673 | 0.920 | 2.067 | 0.035 | n/a | 0.133 | 13.146 | n/a | n/a | 0.058 | 5.588 | 0.174 | 0.058 |
| p99 | 123.563 | 1.749 | 0.000 | 6.133 | 9.589 | 0.012 | 0.000 | 11.956 | 4.182 | 3.089 | 0.083 | n/a | 14.432 | 81.166 | n/a | n/a | 0.077 | 21.556 | 0.243 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d026300000000000000d7 | 123.563 | 9.589 | 0.012 | 0.000 | 11.956 | 4.182 | 2.067 | 0.083 | n/a | 14.432 | 81.166 | n/a | n/a | 0.077 | 21.556 | 0.174 | 0.077 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.279ms; driver.expected-state.bind-receipt 1.146ms |
| 235efacc4d3d026300000000000000de | 22.969 | 4.907 | 0.009 | 0.000 | 0.673 | 0.920 | 3.089 | 0.035 | n/a | 0.133 | 13.146 | n/a | n/a | 0.058 | 5.588 | 0.243 | 0.058 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.934 | 0.000 | 0.000 | 0.651 | 4.495 | 0.219 | 0.000 | 0.071 | 1.838 | 2.082 | 0.086 | n/a | 0.156 | 10.264 | n/a | n/a | 0.059 | 5.325 | 0.244 | 0.059 |
| p99 | 27.106 | 0.780 | 0.002 | 1.858 | 5.498 | 0.277 | 0.540 | 0.351 | 4.566 | 6.551 | 0.114 | n/a | 0.226 | 14.209 | n/a | n/a | 0.062 | 5.844 | 0.268 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d026300000000000000e1 | 27.106 | 4.495 | 0.219 | 0.540 | 0.071 | 4.566 | 6.551 | 0.114 | n/a | 0.226 | 10.264 | n/a | n/a | 0.062 | 5.325 | 0.196 | 0.062 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000e5 | 23.934 | 5.498 | 0.277 | 0.000 | 0.070 | 1.521 | 2.082 | 0.086 | n/a | 0.156 | 14.209 | n/a | n/a | 0.036 | 5.844 | 0.244 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 235efacc4d3d026300000000000000e2 | 14.971 | 3.656 | 0.006 | 0.000 | 0.351 | 1.838 | 1.184 | 0.035 | n/a | 0.092 | 7.750 | n/a | n/a | 0.059 | 4.012 | 0.268 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.971 | 0.780 | 0.002 | 1.858 | 3.656 | 0.006 | 0.000 | 0.351 | 1.838 | 1.184 | 0.035 | n/a | 0.092 | 7.750 | n/a | n/a | 0.059 | 4.012 | 0.268 | 0.059 |
| p99 | 14.971 | 0.780 | 0.002 | 1.858 | 3.656 | 0.006 | 0.000 | 0.351 | 1.838 | 1.184 | 0.035 | n/a | 0.092 | 7.750 | n/a | n/a | 0.059 | 4.012 | 0.268 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d026300000000000000e2 | 14.971 | 3.656 | 0.006 | 0.000 | 0.351 | 1.838 | 1.184 | 0.035 | n/a | 0.092 | 7.750 | n/a | n/a | 0.059 | 4.012 | 0.268 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 105.825 | 0.945 | 0.000 | 1.568 | 8.602 | 7.954 | 0.000 | 0.010 | 9.196 | 2.366 | 12.458 | n/a | 0.141 | 62.034 | n/a | n/a | 0.031 | 17.048 | 0.130 | 0.031 |
| p99 | 164.528 | 1.849 | 0.607 | 6.890 | 12.448 | 8.617 | 0.000 | 0.046 | 18.708 | 5.324 | 22.802 | n/a | 1.666 | 115.371 | n/a | n/a | 0.075 | 20.053 | 0.220 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 235efacc4d3d026300000000000000f0 | 164.528 | 12.448 | 7.595 | 0.000 | 0.010 | 18.557 | 1.640 | 7.564 | n/a | 1.268 | 115.371 | n/a | n/a | 0.075 | 20.053 | 0.122 | 0.075 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 6.598ms; driver.publication 3.324ms; driver.publication 1.676ms; driver.publication 1.282ms; driver.publication 1.222ms |
| 235efacc4d3d026300000000000000ef | 155.204 | 11.580 | 7.194 | 0.000 | 0.011 | 13.432 | 2.418 | 10.007 | n/a | 1.666 | 108.870 | n/a | n/a | 0.026 | 18.785 | 0.121 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 6.598ms; driver.publication 3.324ms; driver.publication 1.676ms; driver.publication 1.282ms; driver.publication 1.222ms |
| 235efacc4d3d026300000000000000ee | 147.699 | 10.422 | 8.499 | 0.000 | 0.010 | 11.107 | 2.916 | 12.458 | n/a | 0.385 | 101.868 | n/a | n/a | 0.034 | 18.931 | 0.128 | 0.034 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication 6.598ms; driver.publication 3.324ms; driver.publication 1.676ms; driver.publication 1.282ms; driver.publication 1.219ms |
| 235efacc4d3d026300000000000000ed | 141.607 | 9.109 | 8.498 | 0.000 | 0.008 | 9.196 | 5.324 | 15.242 | n/a | 0.097 | 94.105 | n/a | n/a | 0.028 | 17.615 | 0.124 | 0.028 | gw-w/thread-61/peer.transact-await (includes order/network/storage) | driver.publication 6.598ms; driver.publication 3.324ms; driver.publication 1.676ms; driver.publication 1.282ms; driver.publication 1.219ms |
| 235efacc4d3d026300000000000000ec | 129.553 | 8.200 | 8.617 | 0.000 | 0.006 | 18.708 | 2.001 | 6.233 | n/a | 0.398 | 85.370 | n/a | n/a | 0.020 | 16.823 | 0.130 | 0.020 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 6.598ms; driver.publication 3.324ms; driver.publication 1.676ms; driver.publication 1.282ms; driver.publication 1.219ms |
| 235efacc4d3d026300000000000000eb | 105.825 | 8.602 | 8.439 | 0.000 | 0.007 | 1.368 | 4.956 | 20.263 | n/a | 0.098 | 62.034 | n/a | n/a | 0.058 | 17.048 | 0.161 | 0.058 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 6.598ms; driver.publication 3.324ms; driver.publication 1.282ms; driver.publication 1.219ms |
| 235efacc4d3d026300000000000000ea | 90.036 | 6.920 | 7.954 | 0.000 | 0.013 | 5.178 | 1.110 | 20.631 | n/a | 0.033 | 48.178 | n/a | n/a | 0.019 | 14.887 | 0.165 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 6.598ms; driver.publication 3.324ms; driver.publication 1.219ms |
| 235efacc4d3d026300000000000000e9 | 85.648 | 11.149 | 7.666 | 0.000 | 0.008 | 3.520 | 2.366 | 22.802 | n/a | 0.056 | 38.051 | n/a | n/a | 0.031 | 18.823 | 0.220 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 3.324ms; driver.publication 1.219ms |
| 235efacc4d3d026300000000000000e8 | 63.855 | 4.832 | 8.095 | 0.000 | 0.016 | 2.743 | 4.619 | 21.367 | n/a | 0.141 | 22.011 | n/a | n/a | 0.031 | 12.944 | 0.203 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 3.324ms |
| 235efacc4d3d026300000000000000e7 | 47.778 | 6.333 | 0.020 | 0.000 | 0.046 | 11.285 | 2.018 | 0.098 | n/a | 0.161 | 27.781 | n/a | n/a | 0.037 | 6.399 | 0.134 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (212 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.022 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 318.647 | n/a | n/a | n/a | 46.385 | n/a | 9.656 | 318.571 | 5.362 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 77.691 | 318.642 | 1.000 | 77.691 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab2f2a5ff78fbe5b0000000000000179 | 318.678 | 0.404 | n/a | 0.000 | 318.269 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 318.674 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b000000000000017b | 318.649 | 0.033 | n/a | 0.000 | 318.612 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 318.645 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b000000000000017a | 318.647 | 0.072 | n/a | 0.000 | 318.571 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 318.642 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b000000000000017c | 318.646 | 0.024 | n/a | 0.000 | 318.618 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 318.642 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d0000000000000341 | 318.061 | 0.431 | n/a | 0.000 | 317.623 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 318.054 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d0000000000000344 | 317.999 | 0.023 | n/a | 0.000 | 317.974 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 317.997 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d0000000000000343 | 317.976 | 0.034 | n/a | 0.000 | 317.940 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 317.974 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d0000000000000342 | 317.952 | 0.051 | n/a | 0.000 | 317.899 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 317.949 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b400000000000001d6 | 312.504 | 0.791 | n/a | 0.000 | 311.695 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 312.486 | 1.000 | 0.018 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d000000000000034d | 309.561 | 0.194 | n/a | 0.000 | 309.343 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 309.537 | 1.000 | 0.023 | node-14/thread-5/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b000000000000017f | 307.886 | 0.047 | n/a | 0.000 | 307.836 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 307.883 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b400000000000001f6 | 306.898 | 0.068 | n/a | 0.000 | 306.819 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 306.887 | 1.000 | 0.011 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b40000000000000239 | 298.301 | 0.158 | n/a | 0.000 | 298.133 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 298.291 | 1.000 | 0.010 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b4000000000000023a | 298.021 | 0.040 | n/a | 0.000 | 297.955 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 297.995 | 1.000 | 0.026 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b4000000000000023b | 297.858 | 0.103 | n/a | 0.000 | 297.728 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 297.831 | 1.000 | 0.026 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b4000000000000023c | 294.698 | 0.045 | n/a | 0.000 | 294.646 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 294.691 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b40000000000008846 | 272.423 | 0.013 | n/a | 0.000 | 272.409 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.422 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b40000000000008845 | 272.415 | 0.015 | n/a | 0.000 | 272.399 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.414 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b40000000000008844 | 272.403 | 0.022 | n/a | 0.000 | 272.380 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.402 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b40000000000008843 | 272.387 | 0.092 | n/a | 0.000 | 272.295 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.386 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 275.703 | n/a | n/a | n/a | 4.584 | n/a | 0.000 | 275.469 | 0.706 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.940 | 275.700 | 1.000 | 2.940 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65d5be18fe0cc4b4000000000001eec9 | 275.703 | 0.230 | n/a | 0.000 | 275.469 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.700 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.030ms |
| 65d5be18fe0cc4b4000000000000c97d | 193.041 | 0.102 | n/a | 0.000 | 192.936 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 193.038 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 65d5be18fe0cc4b4000000000000c9ab | 8.230 | 4.584 | n/a | 0.000 | 0.000 | 0.706 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.940 | 4.584 | 0.557 | 2.940 | node-14/thread-4/socket.wait-first-byte | none observed |
| 65d5be18fe0cc4b40000000000010e37 | 0.597 | 0.594 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.594 | 0.995 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b40000000000015094 | 0.526 | 0.524 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.524 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b4000000000000caa2 | 0.424 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.424 | 0.000 | 0.000 | 0.424 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000001c4ca | 0.406 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.406 | 0.000 | 0.000 | 0.406 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000001b0e7 | 0.406 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.406 | 0.000 | 0.000 | 0.406 | uncovered | none observed |
| 65d5be18fe0cc4b40000000000011b2d | 0.399 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.399 | 0.000 | 0.000 | 0.399 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000001beb7 | 0.367 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.367 | 0.000 | 0.000 | 0.367 | uncovered | none observed |
| 65d5be18fe0cc4b40000000000016226 | 0.354 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.354 | 0.000 | 0.000 | 0.354 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000000cf8f | 0.345 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.345 | 0.000 | 0.000 | 0.345 | uncovered | none observed |
| 65d5be18fe0cc4b40000000000017cbc | 0.337 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.337 | 0.000 | 0.000 | 0.337 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000001a8ba | 0.335 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.335 | 0.000 | 0.000 | 0.335 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000192b8 | 0.333 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.333 | 0.000 | 0.000 | 0.333 | uncovered | none observed |
| 65d5be18fe0cc4b40000000000013a7c | 0.313 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.313 | 0.000 | 0.000 | 0.313 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000001b062 | 0.311 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.311 | 0.000 | 0.000 | 0.311 | uncovered | none observed |
| 65d5be18fe0cc4b40000000000016fa6 | 0.309 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.309 | 0.000 | 0.000 | 0.309 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000001e407 | 0.308 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.308 | 0.000 | 0.000 | 0.308 | uncovered | none observed |
| 65d5be18fe0cc4b40000000000014299 | 0.304 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.304 | 0.000 | 0.000 | 0.304 | uncovered | none observed |

## P1 / L4 / read (219 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.017 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 282.266 | n/a | n/a | n/a | 4.213 | n/a | 0.000 | 282.070 | 0.437 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.920 | 282.264 | 1.000 | 1.920 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab2f2a5ff78fbe5b000000000000de0b | 282.297 | 0.222 | n/a | 0.000 | 282.070 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 282.292 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b4000000000002087c | 282.270 | 0.021 | n/a | 0.000 | 282.248 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 282.269 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b4000000000002087b | 282.266 | 0.131 | n/a | 0.000 | 282.133 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 282.264 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d000000000000d28a | 282.085 | 0.199 | n/a | 0.000 | 281.883 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 282.082 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b000000000000cefc | 85.741 | 0.278 | n/a | 0.000 | 85.453 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 85.732 | 1.000 | 0.010 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.025ms |
| 65d5be18fe0cc4b4000000000001eecc | 82.550 | 0.166 | n/a | 0.000 | 82.362 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 82.527 | 1.000 | 0.023 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.030ms |
| 616b080b3f79fc5d000000000000c067 | 81.465 | 0.212 | n/a | 0.000 | 81.249 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 81.461 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| ab2f2a5ff78fbe5b000000000000cf05 | 24.223 | 19.112 | n/a | 2.577 | 0.000 | 0.614 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.920 | 21.689 | 0.895 | 1.920 | node-14/thread-6/reader.execute | replica.apply-delta 0.030ms |
| 616b080b3f79fc5d000000000000c0a1 | 8.494 | 2.862 | n/a | 0.000 | 0.000 | 0.539 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.093 | 2.862 | 0.337 | 5.093 | node-14/thread-5/socket.wait-first-byte | replica.apply-delta 0.020ms |
| 65d5be18fe0cc4b4000000000002a767 | 4.230 | 4.222 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 4.222 | 0.998 | 0.008 | node-14/thread-4/reader.execute | none observed |
| 65d5be18fe0cc4b4000000000002aa06 | 4.216 | 4.213 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.213 | 0.999 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 616b080b3f79fc5d0000000000014e9d | 4.116 | 4.113 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 4.113 | 0.999 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| 65d5be18fe0cc4b4000000000001efc9 | 4.069 | 1.391 | n/a | 0.000 | 0.000 | 0.437 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.240 | 1.391 | 0.342 | 2.240 | node-14/thread-4/socket.wait-first-byte | none observed |
| 65d5be18fe0cc4b4000000000002507b | 3.840 | 3.838 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.838 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| ab2f2a5ff78fbe5b0000000000017227 | 3.162 | 3.159 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.159 | 0.999 | 0.003 | node-14/thread-6/replica.pull-at | none observed |
| 65d5be18fe0cc4b4000000000001f087 | 2.922 | 2.921 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.921 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b4000000000001faa7 | 2.845 | 2.842 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.842 | 0.999 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 65d5be18fe0cc4b40000000000022130 | 2.544 | 2.542 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.542 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 616b080b3f79fc5d0000000000014ea7 | 2.459 | 2.457 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.457 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| ab2f2a5ff78fbe5b00000000000155e5 | 1.874 | 1.857 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 1.857 | 0.991 | 0.017 | node-14/thread-6/replica.pull-at | none observed |

## P1 / L16 / read (191 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.039 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 |
| p99 | 356.975 | n/a | n/a | n/a | 21.853 | n/a | 0.000 | 356.907 | 0.805 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.971 | 356.969 | 1.000 | 12.971 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab2f2a5ff78fbe5b000000000001ef45 | 356.999 | 0.034 | n/a | 0.000 | 356.962 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 356.996 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| ab2f2a5ff78fbe5b000000000001ef44 | 356.975 | 0.068 | n/a | 0.000 | 356.901 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 356.969 | 1.000 | 0.006 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| ab2f2a5ff78fbe5b000000000001ef43 | 356.962 | 0.164 | n/a | 0.000 | 356.790 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 356.954 | 1.000 | 0.009 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| ab2f2a5ff78fbe5b000000000001ef4c | 356.925 | 0.017 | n/a | 0.000 | 356.907 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 356.924 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| ab2f2a5ff78fbe5b000000000001ef4b | 356.903 | 0.019 | n/a | 0.000 | 356.882 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 356.901 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| 616b080b3f79fc5d000000000001d75f | 354.110 | 0.033 | n/a | 0.000 | 354.075 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 354.108 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 616b080b3f79fc5d000000000001d75e | 354.082 | 0.023 | n/a | 0.000 | 354.058 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 354.081 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 616b080b3f79fc5d000000000001d75d | 354.055 | 0.019 | n/a | 0.000 | 354.035 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 354.054 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 616b080b3f79fc5d000000000001d75c | 354.034 | 0.033 | n/a | 0.000 | 354.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 354.033 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 616b080b3f79fc5d000000000001d75b | 353.996 | 0.159 | n/a | 0.000 | 353.833 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 353.992 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 65d5be18fe0cc4b40000000000035720 | 353.964 | 0.060 | n/a | 0.000 | 353.902 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 353.962 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 65d5be18fe0cc4b4000000000003571f | 353.917 | 0.027 | n/a | 0.000 | 353.889 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 353.916 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 65d5be18fe0cc4b4000000000003571e | 353.846 | 0.113 | n/a | 0.000 | 353.728 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 353.842 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 65d5be18fe0cc4b4000000000003573c | 353.480 | 0.025 | n/a | 0.000 | 353.454 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 353.478 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 65d5be18fe0cc4b4000000000003573b | 353.472 | 0.028 | n/a | 0.000 | 353.441 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 353.469 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 65d5be18fe0cc4b4000000000003573d | 353.368 | 0.070 | n/a | 0.000 | 353.285 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 353.355 | 1.000 | 0.013 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 65d5be18fe0cc4b400000000000356de | 269.719 | 0.024 | n/a | 0.000 | 269.694 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.718 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b400000000000356dd | 269.671 | 0.136 | n/a | 0.000 | 269.533 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.669 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b400000000000356f7 | 269.588 | 0.028 | n/a | 0.000 | 269.559 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.587 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b400000000000356f6 | 269.551 | 0.025 | n/a | 0.000 | 269.525 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.550 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L64 / read (206 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.034 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 364.459 | n/a | n/a | n/a | 7.740 | n/a | 0.000 | 364.386 | 0.794 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.235 | 364.458 | 1.000 | 0.235 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 616b080b3f79fc5d0000000000025850 | 364.647 | 0.035 | n/a | 0.000 | 364.611 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 364.646 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d000000000002584f | 364.604 | 0.126 | n/a | 0.000 | 364.475 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 364.602 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d000000000002584e | 364.459 | 0.071 | n/a | 0.000 | 364.386 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 364.458 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d000000000002584d | 364.297 | 0.317 | n/a | 0.000 | 363.976 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 364.294 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b0000000000027769 | 364.204 | 0.226 | n/a | 0.000 | 363.975 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 364.201 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b000000000002776d | 364.164 | 0.015 | n/a | 0.000 | 364.148 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 364.163 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b000000000002776c | 364.151 | 0.019 | n/a | 0.000 | 364.132 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 364.150 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b000000000002776b | 364.136 | 0.018 | n/a | 0.000 | 364.117 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 364.136 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b000000000002776a | 364.136 | 0.032 | n/a | 0.000 | 364.103 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 364.135 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d000000000002f86b | 363.407 | 0.013 | n/a | 0.000 | 363.394 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 363.406 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 616b080b3f79fc5d000000000002f86a | 363.398 | 0.019 | n/a | 0.000 | 363.378 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 363.397 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 616b080b3f79fc5d000000000002f869 | 363.380 | 0.015 | n/a | 0.000 | 363.365 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 363.379 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 616b080b3f79fc5d000000000002f868 | 363.371 | 0.024 | n/a | 0.000 | 363.346 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 363.370 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 616b080b3f79fc5d000000000002f867 | 363.351 | 0.116 | n/a | 0.000 | 363.233 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 363.349 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 616b080b3f79fc5d0000000000025854 | 363.266 | 0.126 | n/a | 0.000 | 363.135 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 363.261 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b0000000000030d02 | 363.166 | 0.125 | n/a | 0.000 | 363.038 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 363.164 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| ab2f2a5ff78fbe5b0000000000030d04 | 363.164 | 0.046 | n/a | 0.000 | 363.116 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 363.162 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| ab2f2a5ff78fbe5b0000000000030d03 | 363.161 | 0.040 | n/a | 0.000 | 363.118 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 363.159 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| 65d5be18fe0cc4b40000000000047029 | 362.973 | 0.156 | n/a | 0.000 | 362.814 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 362.970 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 65d5be18fe0cc4b40000000000047051 | 362.718 | 0.049 | n/a | 0.000 | 362.668 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 362.717 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |

## P1 / L256 / read (187 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.036 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 345.374 | n/a | n/a | n/a | 51.302 | n/a | 5.831 | 345.318 | 1.235 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.591 | 345.373 | 1.000 | 47.591 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 616b080b3f79fc5d00000000000383a3 | 345.522 | 0.158 | n/a | 0.000 | 345.361 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 345.519 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d00000000000383c3 | 345.374 | 0.055 | n/a | 0.000 | 345.318 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 345.373 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d00000000000383c2 | 345.325 | 0.029 | n/a | 0.000 | 345.295 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 345.324 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d00000000000383c1 | 345.284 | 0.050 | n/a | 0.000 | 345.232 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 345.282 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d00000000000383c0 | 345.239 | 0.042 | n/a | 0.000 | 345.196 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 345.238 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b4000000000004fae4 | 344.167 | 0.013 | n/a | 0.000 | 344.154 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.167 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b4000000000004fae3 | 344.164 | 0.013 | n/a | 0.000 | 344.149 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.162 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b4000000000004fae1 | 344.161 | 0.038 | n/a | 0.000 | 344.123 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.161 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b4000000000004fae2 | 344.157 | 0.014 | n/a | 0.000 | 344.142 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.156 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b4000000000004fae0 | 344.137 | 0.020 | n/a | 0.000 | 344.116 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.137 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b4000000000004fadf | 344.098 | 0.111 | n/a | 0.000 | 343.985 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 344.096 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b00000000000395e6 | 337.292 | 0.442 | n/a | 0.000 | 336.835 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 337.276 | 1.000 | 0.016 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b00000000000395fe | 336.093 | 0.065 | n/a | 0.000 | 336.025 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 336.091 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b000000000003960e | 335.742 | 0.319 | n/a | 0.000 | 335.422 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 335.740 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b000000000003960c | 335.661 | 0.065 | n/a | 0.000 | 335.594 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 335.658 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b000000000003960d | 335.652 | 0.031 | n/a | 0.000 | 335.619 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 335.650 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b0000000000039571 | 272.841 | 0.066 | n/a | 0.000 | 272.773 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.839 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b0000000000039570 | 272.729 | 0.421 | n/a | 0.000 | 272.305 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.726 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b4000000000004fa19 | 271.486 | 0.265 | n/a | 0.000 | 271.219 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.484 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b4000000000004fa1a | 271.425 | 0.085 | n/a | 0.000 | 271.339 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.424 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (318 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.022 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 |
| p99 | 8.834 | n/a | n/a | n/a | 8.820 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.255 | 8.820 | 1.000 | 3.255 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 616b080b3f79fc5d0000000000039c4d | 67.176 | 33.039 | n/a | 4.465 | 0.000 | 0.817 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.855 | 37.504 | 0.558 | 28.855 | node-14/thread-5/socket.wait-first-byte | none observed |
| ab2f2a5ff78fbe5b000000000003b03c | 40.176 | 9.012 | n/a | 0.000 | 0.000 | 0.868 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.295 | 9.012 | 0.224 | 30.295 | node-14/thread-6/socket.wait-first-byte | none observed |
| 65d5be18fe0cc4b4000000000005148c | 35.715 | 7.710 | n/a | 0.000 | 0.000 | 0.792 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.213 | 7.710 | 0.216 | 27.213 | node-14/thread-4/socket.wait-first-byte | none observed |
| ab2f2a5ff78fbe5b000000000003b747 | 8.834 | 8.831 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 8.831 | 1.000 | 0.002 | node-14/thread-6/replica.pull-at | replica.apply-delta 0.031ms |
| ab2f2a5ff78fbe5b000000000003b748 | 8.832 | 8.820 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 8.820 | 0.999 | 0.013 | node-14/thread-6/replica.pull-at | replica.apply-delta 0.031ms |
| ab2f2a5ff78fbe5b000000000003b749 | 8.831 | 8.817 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 8.817 | 0.998 | 0.014 | node-14/thread-6/replica.pull-at | replica.apply-delta 0.031ms |
| ab2f2a5ff78fbe5b000000000003b74a | 8.829 | 8.814 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 8.814 | 0.998 | 0.015 | node-14/thread-6/replica.pull-at | replica.apply-delta 0.031ms |
| ab2f2a5ff78fbe5b000000000003b74b | 8.787 | 8.771 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 8.771 | 0.998 | 0.016 | node-14/thread-6/replica.pull-at | replica.apply-delta 0.031ms |
| 65d5be18fe0cc4b40000000000051c12 | 7.758 | 7.755 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 7.755 | 1.000 | 0.002 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.036ms |
| 65d5be18fe0cc4b40000000000051c14 | 7.737 | 7.726 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 7.726 | 0.998 | 0.012 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.036ms |
| 65d5be18fe0cc4b40000000000051c16 | 7.722 | 7.710 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 7.710 | 0.998 | 0.012 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.036ms |
| 65d5be18fe0cc4b40000000000051c1a | 7.558 | 7.545 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 7.545 | 0.998 | 0.013 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.036ms |
| 65d5be18fe0cc4b40000000000051c1d | 7.528 | 7.514 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 7.514 | 0.998 | 0.014 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.036ms |
| 65d5be18fe0cc4b40000000000051c1e | 7.526 | 7.510 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 7.510 | 0.998 | 0.015 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.036ms |
| 616b080b3f79fc5d000000000003a23d | 7.152 | 7.148 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 7.148 | 0.999 | 0.004 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.033ms |
| 616b080b3f79fc5d000000000003a23e | 7.119 | 7.105 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 7.105 | 0.998 | 0.014 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.033ms |
| 616b080b3f79fc5d000000000003a23f | 7.110 | 7.095 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 7.095 | 0.998 | 0.015 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.033ms |
| 616b080b3f79fc5d000000000003a241 | 7.018 | 6.999 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 6.999 | 0.997 | 0.019 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.033ms |
| 616b080b3f79fc5d000000000003a242 | 6.984 | 6.968 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 6.968 | 0.998 | 0.016 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.033ms |
| 65d5be18fe0cc4b4000000000005ca4a | 6.323 | 6.303 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 6.303 | 0.997 | 0.021 | node-14/thread-4/replica.pull-at | none observed |

## P1 / recovery / read (228 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.027 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 287.129 | n/a | n/a | n/a | 35.096 | n/a | 3.534 | 287.109 | 57.585 | 6.920 | 51.686 | n/a | 0.016 | 0.000 | n/a | n/a | 120.066 | 287.128 | 1.000 | 120.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 616b080b3f79fc5d0000000000059c4c | 287.155 | 0.045 | n/a | 0.000 | 287.109 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.154 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 616b080b3f79fc5d0000000000059c4d | 287.147 | 0.014 | n/a | 0.000 | 287.132 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.146 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 616b080b3f79fc5d0000000000059c4b | 287.129 | 0.013 | n/a | 0.000 | 287.115 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.128 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 616b080b3f79fc5d0000000000059c4a | 287.121 | 0.016 | n/a | 0.000 | 287.104 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.120 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 616b080b3f79fc5d0000000000059c49 | 287.109 | 0.119 | n/a | 0.000 | 286.987 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 287.106 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 65d5be18fe0cc4b400000000000718df | 285.935 | 0.021 | n/a | 0.000 | 285.913 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.934 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 65d5be18fe0cc4b400000000000718de | 285.892 | 0.137 | n/a | 0.000 | 285.752 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 285.890 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| ab2f2a5ff78fbe5b000000000005af57 | 285.709 | 0.191 | n/a | 0.000 | 285.516 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.708 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| ab2f2a5ff78fbe5b000000000005af56 | 285.663 | 0.152 | n/a | 0.000 | 285.508 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 285.660 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| ab2f2a5ff78fbe5b000000000005af5a | 285.624 | 0.056 | n/a | 0.000 | 285.567 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.623 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| ab2f2a5ff78fbe5b000000000005af59 | 285.584 | 0.014 | n/a | 0.000 | 285.570 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.584 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| ab2f2a5ff78fbe5b000000000005af58 | 285.574 | 0.019 | n/a | 0.000 | 285.554 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.573 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| 65d5be18fe0cc4b400000000000718f7 | 285.514 | 0.016 | n/a | 0.000 | 285.498 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.514 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 65d5be18fe0cc4b400000000000718f6 | 285.502 | 0.015 | n/a | 0.000 | 285.486 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.501 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 65d5be18fe0cc4b400000000000718f5 | 285.501 | 0.053 | n/a | 0.000 | 285.446 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.499 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 65d5be18fe0cc4b400000000000718f4 | 285.494 | 0.041 | n/a | 0.000 | 285.452 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.493 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 65d5be18fe0cc4b40000000000071b19 | 282.350 | 0.084 | n/a | 0.000 | 282.264 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 282.348 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b40000000000071b17 | 282.316 | 0.021 | n/a | 0.000 | 282.293 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 282.314 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b40000000000071b18 | 282.312 | 0.019 | n/a | 0.000 | 282.290 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 282.309 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b40000000000071b16 | 282.311 | 0.039 | n/a | 0.000 | 282.270 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 282.309 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (163 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.015 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 1.396 | n/a | n/a | n/a | 1.395 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.927 | 1.395 | 0.999 | 0.927 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65d5be18fe0cc4b40000000000074e6b | 4.652 | 2.286 | n/a | 0.000 | 0.000 | 0.308 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.058 | 2.286 | 0.491 | 2.058 | node-14/thread-4/socket.wait-first-byte | replica.apply-delta 0.020ms |
| 65d5be18fe0cc4b400000000000751a5 | 1.396 | 1.395 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.395 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b4000000000007656d | 1.289 | 1.287 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.287 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b40000000000080ff3 | 0.927 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.927 | 0.000 | 0.000 | 0.927 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000816ab | 0.762 | 0.759 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.759 | 0.995 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b40000000000080ffa | 0.692 | 0.691 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.691 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b40000000000074dbd | 0.605 | 0.604 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.604 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000894a3 | 0.592 | 0.591 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.591 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000752a9 | 0.578 | 0.575 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.575 | 0.995 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b40000000000081e76 | 0.536 | 0.535 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.535 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b40000000000081280 | 0.535 | 0.533 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.533 | 0.996 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b40000000000081e80 | 0.514 | 0.511 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.511 | 0.993 | 0.004 | node-14/thread-4/reader.execute | none observed |
| 65d5be18fe0cc4b4000000000008d6f6 | 0.497 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.497 | 0.000 | 0.000 | 0.497 | uncovered | none observed |
| 65d5be18fe0cc4b40000000000093229 | 0.478 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.478 | 0.000 | 0.000 | 0.478 | uncovered | none observed |
| 65d5be18fe0cc4b40000000000087b34 | 0.472 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.472 | 0.000 | 0.000 | 0.472 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000007da2a | 0.465 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.465 | 0.000 | 0.000 | 0.465 | uncovered | none observed |
| 65d5be18fe0cc4b40000000000090481 | 0.462 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.462 | 0.000 | 0.000 | 0.462 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000008133b | 0.461 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.461 | 0.000 | 0.000 | 0.461 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000008c600 | 0.457 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.457 | 0.000 | 0.000 | 0.457 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000008c5e6 | 0.453 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.453 | 0.000 | 0.000 | 0.453 | uncovered | none observed |

## P4 / p4h1 / read (181 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 7.217 | n/a | n/a | n/a | 2.052 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.495 | 2.052 | 0.998 | 0.495 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65d5be18fe0cc4b400000000000952ab | 13.128 | 2.052 | n/a | 0.000 | 0.000 | 0.667 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.409 | 2.052 | 0.156 | 10.409 | node-14/thread-4/socket.wait-first-byte | none observed |
| 65d5be18fe0cc4b400000000000a48bf | 7.217 | 7.212 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 7.212 | 0.999 | 0.004 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.031ms |
| 65d5be18fe0cc4b400000000000979cf | 1.103 | 1.102 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.102 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000bd866 | 0.652 | 0.649 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.649 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000a6e8a | 0.598 | 0.596 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.596 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000b5630 | 0.561 | 0.559 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.559 | 0.996 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 65d5be18fe0cc4b400000000000ac8fb | 0.552 | 0.550 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.550 | 0.996 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b40000000000096670 | 0.495 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.495 | 0.000 | 0.000 | 0.495 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000b8da2 | 0.471 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.471 | 0.000 | 0.000 | 0.471 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000b50ac | 0.453 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.453 | 0.000 | 0.000 | 0.453 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000b6732 | 0.442 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.442 | 0.000 | 0.000 | 0.442 | uncovered | none observed |
| 65d5be18fe0cc4b40000000000096b17 | 0.421 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.421 | 0.000 | 0.000 | 0.421 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000af78c | 0.415 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.415 | 0.000 | 0.000 | 0.415 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000009ccc4 | 0.414 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.414 | 0.000 | 0.000 | 0.414 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000b3a16 | 0.409 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.409 | 0.000 | 0.000 | 0.409 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000965e8 | 0.404 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.404 | 0.000 | 0.000 | 0.404 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000b6d33 | 0.399 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.399 | 0.000 | 0.000 | 0.399 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000b7876 | 0.398 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.398 | 0.000 | 0.000 | 0.398 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000b89eb | 0.390 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.390 | 0.000 | 0.000 | 0.390 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000badeb | 0.384 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.384 | 0.000 | 0.000 | 0.384 | uncovered | none observed |

## P4 / p4h3 / read (145 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 |
| p99 | 3.567 | n/a | n/a | n/a | 3.347 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.822 | 3.347 | 0.999 | 0.822 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65d5be18fe0cc4b400000000000bf0c2 | 22.865 | 1.470 | n/a | 0.000 | 0.000 | 1.092 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.303 | 1.470 | 0.064 | 20.303 | node-14/thread-4/socket.wait-first-byte | none observed |
| 65d5be18fe0cc4b400000000000da70b | 3.567 | 3.565 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.565 | 1.000 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000cc440 | 3.354 | 3.347 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 3.347 | 0.998 | 0.007 | node-14/thread-4/reader.execute | none observed |
| 65d5be18fe0cc4b400000000000da675 | 3.102 | 3.089 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 3.089 | 0.996 | 0.013 | node-14/thread-4/reader.execute | none observed |
| 65d5be18fe0cc4b400000000000c6741 | 2.311 | 2.310 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.310 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000cad7b | 0.822 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.822 | 0.000 | 0.000 | 0.822 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000d6f4e | 0.613 | 0.608 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.608 | 0.993 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000c607d | 0.574 | 0.571 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.571 | 0.994 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000ca711 | 0.563 | 0.561 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.561 | 0.996 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000cb31e | 0.558 | 0.557 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.557 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000d4cad | 0.544 | 0.542 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.542 | 0.996 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000c61ba | 0.520 | 0.517 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.517 | 0.995 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000cfedd | 0.517 | 0.515 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.515 | 0.997 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000da70a | 0.501 | 0.500 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.500 | 0.997 | 0.001 | node-14/thread-4/reader.execute | none observed |
| 65d5be18fe0cc4b400000000000d636a | 0.497 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.497 | 0.000 | 0.000 | 0.497 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000d654b | 0.490 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.490 | 0.000 | 0.000 | 0.490 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000d7499 | 0.488 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.488 | 0.000 | 0.000 | 0.488 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000c5dff | 0.482 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.482 | 0.000 | 0.000 | 0.482 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000c9058 | 0.457 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.457 | 0.000 | 0.000 | 0.457 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000cebe2 | 0.446 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.446 | 0.000 | 0.000 | 0.446 | uncovered | none observed |

## P4 / p4h10 / read (170 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 1.324 | n/a | n/a | n/a | 1.322 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.457 | 1.322 | 0.998 | 0.457 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65d5be18fe0cc4b400000000000dea65 | 12.537 | 2.651 | n/a | 0.000 | 0.000 | 0.497 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.389 | 2.651 | 0.211 | 9.389 | node-14/thread-4/socket.wait-first-byte | none observed |
| 65d5be18fe0cc4b400000000000e4e10 | 1.324 | 1.322 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.322 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000e7178 | 0.981 | 0.972 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.972 | 0.991 | 0.009 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000e6e5a | 0.920 | 0.918 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.918 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000f9874 | 0.687 | 0.685 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.685 | 0.996 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000e3e58 | 0.667 | 0.666 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.666 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000ec0bb | 0.579 | 0.563 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.563 | 0.973 | 0.016 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000ec249 | 0.574 | 0.572 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.572 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000e6838 | 0.540 | 0.530 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.530 | 0.981 | 0.010 | node-14/thread-4/reader.execute | none observed |
| 65d5be18fe0cc4b400000000000e67b7 | 0.525 | 0.524 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.524 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 65d5be18fe0cc4b400000000000e6ff0 | 0.518 | 0.511 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.511 | 0.988 | 0.006 | node-14/thread-4/reader.execute | none observed |
| 65d5be18fe0cc4b400000000000e6e97 | 0.510 | 0.505 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.505 | 0.989 | 0.005 | node-14/thread-4/reader.execute | none observed |
| 65d5be18fe0cc4b400000000000e1aa5 | 0.457 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.457 | 0.000 | 0.000 | 0.457 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000ea3d8 | 0.440 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.440 | 0.000 | 0.000 | 0.440 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000e6bd4 | 0.428 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.428 | 0.000 | 0.000 | 0.428 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000eabb6 | 0.419 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.419 | 0.000 | 0.000 | 0.419 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000e6bd0 | 0.417 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.417 | 0.000 | 0.000 | 0.417 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000eba21 | 0.417 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.417 | 0.000 | 0.000 | 0.417 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000e6e54 | 0.416 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.416 | 0.000 | 0.000 | 0.416 | uncovered | none observed |
| 65d5be18fe0cc4b400000000000e6b38 | 0.410 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.410 | 0.000 | 0.000 | 0.410 | uncovered | none observed |

## P5 / presweep / read (227 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.039 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 0.000 | 0.000 | 0.020 |
| p99 | 266.240 | n/a | n/a | n/a | 12.319 | n/a | 3.137 | 266.217 | 0.796 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.101 | 266.239 | 1.000 | 6.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 616b080b3f79fc5d0000000000060492 | 266.248 | 0.026 | n/a | 0.000 | 266.221 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.247 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d0000000000060493 | 266.248 | 0.015 | n/a | 0.000 | 266.232 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.247 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d0000000000060490 | 266.240 | 0.022 | n/a | 0.000 | 266.217 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.239 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d0000000000060491 | 266.234 | 0.015 | n/a | 0.000 | 266.217 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.233 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d000000000006048f | 266.230 | 0.113 | n/a | 0.000 | 266.115 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.228 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b000000000006154a | 265.035 | 0.090 | n/a | 0.000 | 264.945 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.034 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b0000000000061549 | 264.970 | 0.019 | n/a | 0.000 | 264.950 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.969 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b0000000000061548 | 264.952 | 0.026 | n/a | 0.000 | 264.924 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.950 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b0000000000061547 | 264.924 | 0.104 | n/a | 0.000 | 264.818 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.922 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| ab2f2a5ff78fbe5b000000000006154e | 264.817 | 0.052 | n/a | 0.000 | 264.764 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.815 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b400000000001080f8 | 264.658 | 0.021 | n/a | 0.000 | 264.636 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.657 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b400000000001080f7 | 264.599 | 0.077 | n/a | 0.000 | 264.521 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.597 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b400000000001080f6 | 264.487 | 0.098 | n/a | 0.000 | 264.387 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.485 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b40000000000108111 | 264.380 | 0.043 | n/a | 0.000 | 264.336 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.379 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b40000000000108110 | 264.354 | 0.086 | n/a | 0.000 | 264.267 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.353 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 65d5be18fe0cc4b400000000001080f5 | 264.289 | 0.206 | n/a | 0.000 | 264.079 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 264.285 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 616b080b3f79fc5d000000000005d061 | 44.167 | 19.854 | n/a | 9.473 | 0.000 | 2.294 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.545 | 29.327 | 0.664 | 12.545 | node-14/thread-5/reader.execute | none observed |
| ab2f2a5ff78fbe5b000000000005dddd | 39.106 | 16.014 | n/a | 7.024 | 0.000 | 2.249 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.819 | 23.039 | 0.589 | 13.819 | node-14/thread-6/reader.execute | none observed |
| 616b080b3f79fc5d000000000005d651 | 12.329 | 12.319 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 12.319 | 0.999 | 0.010 | node-14/thread-5/reader.execute | reader.observe 12.033ms |
| 616b080b3f79fc5d000000000005d652 | 12.276 | 12.244 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.033 | 12.244 | 0.997 | 0.033 | node-14/thread-5/reader.execute | reader.observe 12.033ms |

## P5 / sweep / read (84 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 3.481 | n/a | n/a | n/a | 1.092 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.028 | 3.418 | 0.992 | 0.028 |
| p99 | 328.192 | n/a | n/a | n/a | 20.315 | n/a | 5.607 | 327.779 | 0.926 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.244 | 328.180 | 1.000 | 3.244 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 65d5be18fe0cc4b4000000000011201f | 328.192 | 0.401 | n/a | 0.000 | 327.779 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 328.180 | 1.000 | 0.012 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.059ms; replica.apply-delta 0.057ms; replica.apply-delta 0.054ms; replica.apply-delta 0.052ms |
| 65d5be18fe0cc4b40000000000112020 | 328.062 | 0.272 | n/a | 0.000 | 327.736 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.053 | 328.009 | 1.000 | 0.053 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.059ms; replica.apply-delta 0.057ms; replica.apply-delta 0.054ms; replica.apply-delta 0.052ms |
| 65d5be18fe0cc4b40000000000112021 | 328.045 | 0.260 | n/a | 0.000 | 327.722 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.063 | 327.982 | 1.000 | 0.063 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.059ms; replica.apply-delta 0.057ms; replica.apply-delta 0.054ms; replica.apply-delta 0.052ms |
| 65d5be18fe0cc4b40000000000112022 | 328.039 | 0.260 | n/a | 0.000 | 327.708 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.072 | 327.967 | 1.000 | 0.072 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.059ms; replica.apply-delta 0.057ms; replica.apply-delta 0.054ms; replica.apply-delta 0.052ms |
| 65d5be18fe0cc4b40000000000112023 | 328.036 | 0.258 | n/a | 0.000 | 327.697 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.081 | 327.955 | 1.000 | 0.081 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.059ms; replica.apply-delta 0.057ms; replica.apply-delta 0.054ms; replica.apply-delta 0.052ms |
| 65d5be18fe0cc4b40000000000112024 | 328.029 | 0.258 | n/a | 0.000 | 327.683 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.088 | 327.941 | 1.000 | 0.088 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.059ms; replica.apply-delta 0.057ms; replica.apply-delta 0.054ms; replica.apply-delta 0.052ms |
| ab2f2a5ff78fbe5b000000000006bd18 | 327.282 | 0.634 | n/a | 0.000 | 326.630 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 327.264 | 1.000 | 0.018 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.057ms; replica.apply-delta 0.050ms; replica.apply-delta 0.036ms; replica.apply-delta 0.036ms |
| ab2f2a5ff78fbe5b000000000006bd19 | 326.999 | 0.398 | n/a | 0.000 | 326.530 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.070 | 326.928 | 1.000 | 0.070 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.057ms; replica.apply-delta 0.050ms; replica.apply-delta 0.036ms; replica.apply-delta 0.036ms |
| ab2f2a5ff78fbe5b000000000006bd1a | 326.939 | 0.379 | n/a | 0.000 | 326.480 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.080 | 326.859 | 1.000 | 0.080 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.057ms; replica.apply-delta 0.050ms; replica.apply-delta 0.036ms; replica.apply-delta 0.036ms |
| ab2f2a5ff78fbe5b000000000006bd1b | 326.902 | 0.461 | n/a | 0.000 | 326.350 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.092 | 326.811 | 1.000 | 0.092 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.057ms; replica.apply-delta 0.050ms; replica.apply-delta 0.036ms; replica.apply-delta 0.036ms |
| ab2f2a5ff78fbe5b000000000006bd1c | 326.767 | 0.378 | n/a | 0.000 | 326.290 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.099 | 326.668 | 1.000 | 0.099 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.057ms; replica.apply-delta 0.050ms; replica.apply-delta 0.036ms; replica.apply-delta 0.036ms |
| 616b080b3f79fc5d000000000006a5ea | 326.380 | 0.228 | n/a | 0.000 | 326.147 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 326.375 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.057ms; replica.apply-delta 0.052ms; replica.apply-delta 0.037ms; replica.apply-delta 0.036ms; replica.apply-delta 0.033ms |
| 616b080b3f79fc5d000000000006a5eb | 326.297 | 0.145 | n/a | 0.000 | 326.115 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.036 | 326.260 | 1.000 | 0.036 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.057ms; replica.apply-delta 0.052ms; replica.apply-delta 0.037ms; replica.apply-delta 0.036ms; replica.apply-delta 0.033ms |
| 616b080b3f79fc5d000000000006a5ec | 326.278 | 0.136 | n/a | 0.000 | 326.102 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.040 | 326.238 | 1.000 | 0.040 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.057ms; replica.apply-delta 0.052ms; replica.apply-delta 0.037ms; replica.apply-delta 0.036ms; replica.apply-delta 0.033ms |
| 616b080b3f79fc5d000000000006a5ed | 326.270 | 0.135 | n/a | 0.000 | 326.091 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.044 | 326.226 | 1.000 | 0.044 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.057ms; replica.apply-delta 0.052ms; replica.apply-delta 0.037ms; replica.apply-delta 0.036ms; replica.apply-delta 0.033ms |
| 616b080b3f79fc5d000000000006a5ee | 326.260 | 0.135 | n/a | 0.000 | 326.076 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.049 | 326.211 | 1.000 | 0.049 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.057ms; replica.apply-delta 0.052ms; replica.apply-delta 0.037ms; replica.apply-delta 0.036ms; replica.apply-delta 0.033ms |
| 65d5be18fe0cc4b40000000000111d4a | 29.213 | 20.315 | n/a | 5.173 | 0.000 | 0.651 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.073 | 25.489 | 0.873 | 3.073 | node-14/thread-4/reader.execute | none observed |
| ab2f2a5ff78fbe5b000000000006b9fb | 18.163 | 8.569 | n/a | 5.607 | 0.000 | 0.887 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.099 | 14.177 | 0.781 | 3.099 | node-14/thread-6/reader.execute | none observed |
| 9284f50d4d1ab0e70000000000000153 | 10.292 | 10.213 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.078 | 10.213 | 0.992 | 0.078 | node-14/thread-7/replica.pull-at | none observed |
| 9284f50d4d1ab0e70000000000000154 | 10.292 | 10.158 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.134 | 10.158 | 0.987 | 0.134 | node-14/thread-7/replica.pull-at | none observed |

## P1 / baseline / read (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 0.066 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.066 | 0.000 | 0.000 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab2f2a5ff78fbe5b000000000000cef7 | 0.066 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.066 | 0.000 | 0.000 | 0.066 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000000c966 | 0.061 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.061 | 0.000 | 0.000 | 0.061 | uncovered | none observed |
| 616b080b3f79fc5d000000000000c04d | 0.056 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.056 | 0.000 | 0.000 | 0.056 | uncovered | none observed |
| ab2f2a5ff78fbe5b000000000000cef9 | 0.033 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.033 | 0.000 | 0.000 | 0.033 | uncovered | none observed |
| ab2f2a5ff78fbe5b000000000000cefa | 0.031 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.031 | 0.000 | 0.000 | 0.031 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000000c969 | 0.023 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 0.000 | 0.000 | 0.023 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000000c968 | 0.019 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 0.000 | 0.000 | 0.019 | uncovered | none observed |
| ab2f2a5ff78fbe5b000000000000cef8 | 0.013 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 | uncovered | none observed |
| 616b080b3f79fc5d000000000000c04e | 0.013 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000000c967 | 0.012 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000000c96a | 0.010 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 | uncovered | none observed |
| ab2f2a5ff78fbe5b000000000000cefb | 0.009 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 | uncovered | none observed |
| 616b080b3f79fc5d000000000000c04f | 0.007 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 | uncovered | none observed |
| 616b080b3f79fc5d000000000000c051 | 0.007 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 | uncovered | none observed |
| 616b080b3f79fc5d000000000000c050 | 0.006 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.000 | 0.000 | 0.006 | uncovered | none observed |
| 65d5be18fe0cc4b4000000000000c96b | 0.006 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.000 | 0.000 | 0.006 | uncovered | none observed |

## P3 / outside-phases / read (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.215 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.014 | 200.916 | 0.014 | n/a | 0.108 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 |
| p99 | 207.066 | n/a | n/a | n/a | 4.623 | n/a | 0.000 | 0.000 | 5.509 | 204.605 | 5.452 | n/a | 0.276 | 0.000 | n/a | n/a | 0.563 | 4.623 | 0.076 | 0.563 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fba1b91480f2488f0000000000000078 | 207.066 | 0.000 | n/a | 0.000 | 0.000 | 5.509 | 201.150 | 0.030 | n/a | 0.167 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-69/journal/page | none observed |
| fba1b91480f2488f000000000000005b | 206.697 | 0.000 | n/a | 0.000 | 0.000 | 1.732 | 204.605 | 0.019 | n/a | 0.144 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-58/journal/page | none observed |
| fba1b91480f2488f0000000000000007 | 206.260 | 0.000 | n/a | 0.000 | 0.000 | 1.856 | 203.890 | 0.015 | n/a | 0.148 | 0.000 | n/a | n/a | 0.352 | 0.000 | 0.000 | 0.352 | gw-r/thread-45/journal/page | none observed |
| fba1b91480f2488f00000000000000c9 | 205.001 | 0.000 | n/a | 0.000 | 0.000 | 0.877 | 203.829 | 0.018 | n/a | 0.105 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-58/journal/page | none observed |
| fba1b91480f2488f0000000000000006 | 203.766 | 0.000 | n/a | 0.000 | 0.000 | 1.240 | 202.104 | 0.012 | n/a | 0.178 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-46/journal/page | none observed |
| fba1b91480f2488f000000000000009d | 203.756 | 0.000 | n/a | 0.000 | 0.000 | 1.476 | 201.842 | 0.031 | n/a | 0.199 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-70/journal/page | none observed |
| fba1b91480f2488f00000000000000c8 | 203.648 | 0.000 | n/a | 0.000 | 0.000 | 2.565 | 200.847 | 0.010 | n/a | 0.115 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-61/journal/page | none observed |
| fba1b91480f2488f0000000000000074 | 203.036 | 0.000 | n/a | 0.000 | 0.000 | 2.028 | 200.748 | 0.022 | n/a | 0.114 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| fba1b91480f2488f000000000000009a | 203.020 | 0.000 | n/a | 0.000 | 0.000 | 1.979 | 200.771 | 0.012 | n/a | 0.091 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-61/journal/page | none observed |
| fba1b91480f2488f000000000000007b | 202.971 | 0.000 | n/a | 0.000 | 0.000 | 1.176 | 201.447 | 0.030 | n/a | 0.156 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-63/journal/page | none observed |
| fba1b91480f2488f00000000000000cc | 202.939 | 0.000 | n/a | 0.000 | 0.000 | 1.763 | 200.951 | 0.014 | n/a | 0.103 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-70/journal/page | none observed |
| fba1b91480f2488f000000000000009f | 202.889 | 0.000 | n/a | 0.000 | 0.000 | 1.005 | 201.557 | 0.020 | n/a | 0.188 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-71/journal/page | none observed |
| fba1b91480f2488f0000000000000097 | 202.788 | 0.000 | n/a | 0.000 | 0.000 | 0.868 | 201.573 | 0.079 | n/a | 0.094 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-67/journal/page | none observed |
| fba1b91480f2488f0000000000000005 | 202.703 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 201.496 | 0.021 | n/a | 0.165 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-47/journal/page | none observed |
| fba1b91480f2488f00000000000000a2 | 202.545 | 0.000 | n/a | 0.000 | 0.000 | 0.878 | 201.349 | 0.016 | n/a | 0.187 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-72/journal/page | none observed |
| fba1b91480f2488f000000000000005a | 202.539 | 0.000 | n/a | 0.000 | 0.000 | 0.903 | 201.276 | 0.025 | n/a | 0.217 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-74/journal/page | none observed |
| fba1b91480f2488f0000000000000058 | 202.443 | 0.000 | n/a | 0.000 | 0.000 | 0.752 | 201.263 | 0.043 | n/a | 0.276 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-73/journal/page | none observed |
| fba1b91480f2488f0000000000000098 | 202.364 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 201.291 | 0.014 | n/a | 0.125 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-47/journal/page | none observed |
| fba1b91480f2488f0000000000000096 | 202.304 | 0.000 | n/a | 0.000 | 0.000 | 1.113 | 200.916 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-73/journal/page | none observed |
| fba1b91480f2488f000000000000005c | 202.215 | 0.000 | n/a | 0.000 | 0.000 | 1.014 | 200.947 | 0.012 | n/a | 0.108 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-67/journal/page | none observed |

## P3 / outside-phases / internal (19 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 566.672 | n/a | n/a | n/a | 3.037 | n/a | 0.000 | 0.000 | 1.198 | 556.240 | 0.013 | n/a | 0.101 | 0.000 | n/a | n/a | 0.207 | 3.037 | 0.009 | 0.207 |
| p99 | 1023.544 | n/a | n/a | n/a | 97.008 | n/a | 3.383 | 0.000 | 18.421 | 1008.561 | 0.044 | n/a | 0.341 | 0.000 | n/a | n/a | 23.667 | 100.390 | 0.781 | 23.667 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a0000000000000018 | 1023.544 | 0.269 | n/a | 0.000 | 0.000 | 18.421 | 1003.485 | 0.030 | n/a | 0.216 | 0.000 | n/a | n/a | 1.123 | 0.269 | 0.000 | 1.123 | gw-r/thread-47/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000017 | 1012.829 | 0.267 | n/a | 0.000 | 0.000 | 2.281 | 1008.561 | 0.026 | n/a | 0.341 | 0.000 | n/a | n/a | 1.353 | 0.267 | 0.000 | 1.353 | gw-r/thread-47/journal/page | none observed |
| 23d068a2c2db5e2a000000000000001a | 1012.489 | 0.240 | n/a | 0.000 | 0.000 | 6.866 | 1002.661 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 2.643 | 0.240 | 0.000 | 2.643 | gw-r/thread-44/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000019 | 1004.610 | 0.133 | n/a | 0.000 | 0.000 | 0.914 | 1002.133 | 0.025 | n/a | 0.293 | 0.000 | n/a | n/a | 1.112 | 0.133 | 0.000 | 1.112 | gw-r/thread-43/journal/page | none observed |
| 23d068a2c2db5e2a000000000000009d | 1003.013 | 0.130 | n/a | 0.000 | 0.000 | 0.744 | 1000.917 | 0.009 | n/a | 0.103 | 0.000 | n/a | n/a | 1.111 | 0.130 | 0.000 | 1.111 | gw-r/thread-73/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000084 | 986.003 | 4.052 | n/a | 0.000 | 0.000 | 1.098 | 980.680 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.089 | 4.052 | 0.004 | 0.089 | gw-r/thread-41/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000080 | 738.263 | 2.422 | n/a | 0.000 | 0.000 | 0.815 | 734.839 | 0.014 | n/a | 0.074 | 0.000 | n/a | n/a | 0.099 | 2.422 | 0.003 | 0.099 | gw-r/thread-74/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000054 | 686.868 | 2.670 | n/a | 0.000 | 0.000 | 0.888 | 683.048 | 0.021 | n/a | 0.157 | 0.000 | n/a | n/a | 0.085 | 2.670 | 0.004 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000081 | 639.208 | 5.846 | n/a | 0.000 | 0.000 | 3.619 | 629.457 | 0.014 | n/a | 0.083 | 0.000 | n/a | n/a | 0.188 | 5.846 | 0.009 | 0.188 | gw-r/thread-43/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000061 | 566.672 | 8.865 | n/a | 0.000 | 0.000 | 1.223 | 556.240 | 0.013 | n/a | 0.124 | 0.000 | n/a | n/a | 0.207 | 8.865 | 0.016 | 0.207 | gw-r/thread-43/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000064 | 504.924 | 1.852 | n/a | 0.000 | 0.000 | 1.039 | 501.853 | 0.014 | n/a | 0.101 | 0.000 | n/a | n/a | 0.066 | 1.852 | 0.004 | 0.066 | gw-r/thread-44/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000082 | 369.342 | 5.031 | n/a | 0.000 | 0.000 | 2.758 | 361.277 | 0.011 | n/a | 0.108 | 0.000 | n/a | n/a | 0.157 | 5.031 | 0.014 | 0.157 | gw-r/thread-44/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000052 | 351.906 | 5.242 | n/a | 0.000 | 0.000 | 1.198 | 345.094 | 0.036 | n/a | 0.124 | 0.000 | n/a | n/a | 0.211 | 5.242 | 0.015 | 0.211 | gw-r/thread-48/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000085 | 316.670 | 13.326 | n/a | 0.000 | 0.000 | 0.652 | 302.375 | 0.044 | n/a | 0.160 | 0.000 | n/a | n/a | 0.114 | 13.326 | 0.042 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000065 | 252.018 | 3.037 | n/a | 0.000 | 0.000 | 4.809 | 244.015 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.073 | 3.037 | 0.012 | 0.073 | gw-r/thread-68/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000062 | 179.820 | 3.118 | n/a | 0.000 | 0.000 | 0.929 | 175.660 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.083 | 3.118 | 0.017 | 0.083 | gw-r/thread-61/journal/page | none observed |
| 23d068a2c2db5e2a000000000000005e | 128.506 | 97.008 | n/a | 3.383 | 0.000 | 4.448 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.667 | 100.390 | 0.781 | 23.667 | node-14/thread-2/replica.fetch-feed | none observed |
| 23d068a2c2db5e2a000000000000005f | 22.852 | 3.240 | n/a | 0.000 | 0.000 | 1.617 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.994 | 3.240 | 0.142 | 17.994 | node-14/thread-2/socket.wait-first-byte | none observed |
| 23d068a2c2db5e2a000000000000009c | 11.327 | 2.869 | n/a | 0.000 | 0.000 | 0.318 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.141 | 2.869 | 0.253 | 8.141 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 440.900 | n/a | n/a | n/a | 6.175 | n/a | 0.000 | 0.000 | 1.595 | 413.153 | 0.011 | n/a | 0.079 | 0.000 | n/a | n/a | 0.139 | 6.175 | 0.010 | 0.139 |
| p99 | 649.917 | n/a | n/a | n/a | 56.311 | n/a | 2.318 | 0.000 | 21.302 | 641.698 | 0.014 | n/a | 0.102 | 0.000 | n/a | n/a | 3.593 | 58.629 | 0.112 | 3.593 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a000000000000001e | 649.917 | 6.175 | n/a | 0.000 | 0.000 | 1.718 | 641.698 | 0.011 | n/a | 0.097 | 0.000 | n/a | n/a | 0.218 | 6.175 | 0.010 | 0.218 | gw-r/thread-58/journal/page | none observed |
| 23d068a2c2db5e2a000000000000001b | 523.731 | 56.311 | n/a | 2.318 | 0.000 | 1.595 | 459.829 | 0.008 | n/a | 0.078 | 0.000 | n/a | n/a | 3.593 | 58.629 | 0.112 | 3.593 | gw-r/thread-44/journal/page | none observed |
| 23d068a2c2db5e2a000000000000001d | 440.900 | 6.215 | n/a | 0.000 | 0.000 | 21.302 | 413.153 | 0.013 | n/a | 0.079 | 0.000 | n/a | n/a | 0.139 | 6.215 | 0.014 | 0.139 | gw-r/thread-48/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000020 | 322.974 | 2.629 | n/a | 0.000 | 0.000 | 0.908 | 319.207 | 0.014 | n/a | 0.102 | 0.000 | n/a | n/a | 0.113 | 2.629 | 0.008 | 0.113 | gw-r/thread-43/journal/page | none observed |

## P3 / baseline / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 308.302 | n/a | n/a | n/a | 2.440 | n/a | 0.000 | 0.000 | 0.756 | 304.658 | 0.016 | n/a | 0.097 | 0.000 | n/a | n/a | 0.089 | 2.440 | 0.004 | 0.089 |
| p99 | 873.622 | n/a | n/a | n/a | 4.207 | n/a | 0.000 | 0.000 | 10.999 | 871.067 | 0.081 | n/a | 0.125 | 0.000 | n/a | n/a | 0.276 | 4.207 | 0.032 | 0.276 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a0000000000000024 | 873.622 | 1.707 | n/a | 0.000 | 0.000 | 0.644 | 871.067 | 0.018 | n/a | 0.097 | 0.000 | n/a | n/a | 0.089 | 1.707 | 0.002 | 0.089 | gw-r/thread-46/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000021 | 684.712 | 2.440 | n/a | 0.000 | 0.000 | 10.999 | 670.897 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.276 | 2.440 | 0.004 | 0.276 | gw-r/thread-64/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000023 | 308.302 | 2.611 | n/a | 0.000 | 0.000 | 0.756 | 304.658 | 0.081 | n/a | 0.108 | 0.000 | n/a | n/a | 0.089 | 2.611 | 0.008 | 0.089 | gw-r/thread-46/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000025 | 132.249 | 4.207 | n/a | 0.000 | 0.000 | 1.065 | 126.757 | 0.016 | n/a | 0.125 | 0.000 | n/a | n/a | 0.078 | 4.207 | 0.032 | 0.078 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 824.204 | n/a | n/a | n/a | 4.793 | n/a | 0.000 | 0.000 | 0.954 | 818.212 | 0.020 | n/a | 0.106 | 0.000 | n/a | n/a | 0.127 | 4.793 | 0.006 | 0.127 |
| p99 | 1005.586 | n/a | n/a | n/a | 5.454 | n/a | 0.000 | 0.000 | 1.226 | 1001.800 | 1.146 | n/a | 0.147 | 0.000 | n/a | n/a | 1.117 | 5.454 | 0.030 | 1.117 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a000000000000002a | 1005.586 | 0.150 | n/a | 0.000 | 0.000 | 1.226 | 1001.800 | 1.146 | n/a | 0.147 | 0.000 | n/a | n/a | 1.117 | 0.150 | 0.000 | 1.117 | gw-r/thread-47/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000029 | 824.204 | 4.793 | n/a | 0.000 | 0.000 | 0.954 | 818.212 | 0.020 | n/a | 0.097 | 0.000 | n/a | n/a | 0.127 | 4.793 | 0.006 | 0.127 | gw-r/thread-43/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000027 | 179.883 | 5.454 | n/a | 0.000 | 0.000 | 0.777 | 173.438 | 0.016 | n/a | 0.106 | 0.000 | n/a | n/a | 0.092 | 5.454 | 0.030 | 0.092 | gw-r/thread-41/journal/page | none observed |

## P3 / L4 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 447.651 | n/a | n/a | n/a | 2.945 | n/a | 0.000 | 0.000 | 0.923 | 441.740 | 0.023 | n/a | 0.118 | 0.000 | n/a | n/a | 0.146 | 2.945 | 0.010 | 0.146 |
| p99 | 1002.416 | n/a | n/a | n/a | 9.553 | n/a | 0.000 | 0.000 | 2.733 | 997.392 | 0.024 | n/a | 0.172 | 0.000 | n/a | n/a | 39.651 | 9.553 | 0.502 | 39.651 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a0000000000000031 | 1002.416 | 2.439 | n/a | 0.000 | 0.000 | 2.286 | 997.392 | 0.023 | n/a | 0.172 | 0.000 | n/a | n/a | 0.103 | 2.439 | 0.002 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 23d068a2c2db5e2a000000000000002f | 498.063 | 4.927 | n/a | 0.000 | 0.000 | 0.923 | 491.903 | 0.023 | n/a | 0.142 | 0.000 | n/a | n/a | 0.146 | 4.927 | 0.010 | 0.146 | gw-r/thread-58/journal/page | none observed |
| 23d068a2c2db5e2a000000000000002d | 447.651 | 2.945 | n/a | 0.000 | 0.000 | 2.733 | 441.740 | 0.024 | n/a | 0.118 | 0.000 | n/a | n/a | 0.090 | 2.945 | 0.007 | 0.090 | gw-r/thread-61/journal/page | none observed |
| 23d068a2c2db5e2a000000000000002c | 49.464 | 9.553 | n/a | 0.000 | 0.000 | 0.260 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.651 | 9.553 | 0.193 | 39.651 | node-14/thread-2/socket.wait-first-byte | none observed |
| 23d068a2c2db5e2a000000000000002b | 4.688 | 2.355 | n/a | 0.000 | 0.000 | 0.220 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.114 | 2.355 | 0.502 | 2.114 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 369.816 | n/a | n/a | n/a | 2.782 | n/a | 0.000 | 0.000 | 0.750 | 366.857 | 0.019 | n/a | 0.069 | 0.000 | n/a | n/a | 0.088 | 2.782 | 0.005 | 0.088 |
| p99 | 989.627 | n/a | n/a | n/a | 16.161 | n/a | 0.000 | 0.000 | 8.646 | 977.930 | 0.045 | n/a | 0.154 | 0.000 | n/a | n/a | 25.664 | 16.161 | 0.383 | 25.664 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a0000000000000032 | 989.627 | 2.782 | n/a | 0.000 | 0.000 | 8.646 | 977.930 | 0.027 | n/a | 0.154 | 0.000 | n/a | n/a | 0.088 | 2.782 | 0.003 | 0.088 | gw-r/thread-64/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000037 | 653.947 | 14.164 | n/a | 0.000 | 0.000 | 1.453 | 638.008 | 0.045 | n/a | 0.069 | 0.000 | n/a | n/a | 0.208 | 14.164 | 0.022 | 0.208 | gw-r/thread-64/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000034 | 369.816 | 1.973 | n/a | 0.000 | 0.000 | 0.750 | 366.857 | 0.019 | n/a | 0.130 | 0.000 | n/a | n/a | 0.087 | 1.973 | 0.005 | 0.087 | gw-r/thread-62/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000036 | 42.170 | 16.161 | n/a | 0.000 | 0.000 | 0.345 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.664 | 16.161 | 0.383 | 25.664 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 310.075 | n/a | n/a | n/a | 2.409 | n/a | 0.000 | 0.000 | 1.575 | 305.499 | 0.016 | n/a | 0.110 | 0.000 | n/a | n/a | 0.102 | 2.409 | 0.009 | 0.102 |
| p99 | 736.719 | n/a | n/a | n/a | 5.939 | n/a | 0.000 | 0.000 | 8.717 | 733.313 | 0.025 | n/a | 0.166 | 0.000 | n/a | n/a | 0.117 | 5.939 | 0.009 | 0.117 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a000000000000003d | 736.719 | 2.409 | n/a | 0.000 | 0.000 | 0.722 | 733.313 | 0.021 | n/a | 0.166 | 0.000 | n/a | n/a | 0.088 | 2.409 | 0.003 | 0.088 | gw-r/thread-58/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000038 | 677.948 | 5.939 | n/a | 0.000 | 0.000 | 2.525 | 669.241 | 0.016 | n/a | 0.110 | 0.000 | n/a | n/a | 0.117 | 5.939 | 0.009 | 0.117 | gw-r/thread-43/journal/page | none observed |
| 23d068a2c2db5e2a000000000000003a | 310.075 | 2.759 | n/a | 0.000 | 0.000 | 1.575 | 305.499 | 0.025 | n/a | 0.111 | 0.000 | n/a | n/a | 0.107 | 2.759 | 0.009 | 0.107 | gw-r/thread-63/journal/page | none observed |
| 23d068a2c2db5e2a000000000000003b | 238.201 | 2.052 | n/a | 0.000 | 0.000 | 8.717 | 227.263 | 0.014 | n/a | 0.053 | 0.000 | n/a | n/a | 0.102 | 2.052 | 0.009 | 0.102 | gw-r/thread-41/journal/page | none observed |

## P3 / L256 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 359.941 | n/a | n/a | n/a | 3.166 | n/a | 0.000 | 0.000 | 3.939 | 354.249 | 0.018 | n/a | 0.090 | 0.000 | n/a | n/a | 0.096 | 3.166 | 0.005 | 0.096 |
| p99 | 696.041 | n/a | n/a | n/a | 6.723 | n/a | 0.000 | 0.000 | 6.469 | 688.730 | 0.781 | n/a | 0.145 | 0.000 | n/a | n/a | 0.182 | 6.723 | 0.021 | 0.182 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a0000000000000040 | 696.041 | 3.166 | n/a | 0.000 | 0.000 | 3.939 | 688.730 | 0.014 | n/a | 0.084 | 0.000 | n/a | n/a | 0.108 | 3.166 | 0.005 | 0.108 | gw-r/thread-64/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000041 | 448.925 | 2.282 | n/a | 0.000 | 0.000 | 0.845 | 445.576 | 0.012 | n/a | 0.117 | 0.000 | n/a | n/a | 0.092 | 2.282 | 0.005 | 0.092 | gw-r/thread-58/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000042 | 359.941 | 1.932 | n/a | 0.000 | 0.000 | 3.556 | 354.249 | 0.018 | n/a | 0.090 | 0.000 | n/a | n/a | 0.096 | 1.932 | 0.005 | 0.096 | gw-r/thread-63/journal/page | none observed |
| 23d068a2c2db5e2a000000000000003e | 316.089 | 6.723 | n/a | 0.000 | 0.000 | 5.062 | 304.042 | 0.031 | n/a | 0.145 | 0.000 | n/a | n/a | 0.086 | 6.723 | 0.021 | 0.086 | gw-r/thread-58/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000045 | 215.479 | 4.375 | n/a | 0.000 | 0.000 | 6.469 | 203.644 | 0.781 | n/a | 0.027 | 0.000 | n/a | n/a | 0.182 | 4.375 | 0.020 | 0.182 | gw-r/thread-41/journal/page | none observed |

## P3 / L1024 / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 958.717 | n/a | n/a | n/a | 2.402 | n/a | 0.000 | 0.000 | 1.324 | 953.040 | 0.014 | n/a | 0.082 | 0.000 | n/a | n/a | 0.081 | 2.402 | 0.003 | 0.081 |
| p99 | 1005.852 | n/a | n/a | n/a | 6.134 | n/a | 0.000 | 0.000 | 3.098 | 998.141 | 0.043 | n/a | 0.122 | 0.000 | n/a | n/a | 0.087 | 6.134 | 0.006 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a0000000000000047 | 1005.852 | 6.134 | n/a | 0.000 | 0.000 | 1.324 | 998.141 | 0.043 | n/a | 0.122 | 0.000 | n/a | n/a | 0.087 | 6.134 | 0.006 | 0.087 | gw-r/thread-64/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000046 | 958.717 | 2.402 | n/a | 0.000 | 0.000 | 3.098 | 953.040 | 0.014 | n/a | 0.082 | 0.000 | n/a | n/a | 0.081 | 2.402 | 0.003 | 0.081 | gw-r/thread-48/journal/page | none observed |

## P3 / recovery / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 295.951 | n/a | n/a | n/a | 2.478 | n/a | 0.000 | 0.000 | 0.772 | 292.702 | 0.014 | n/a | 0.059 | 0.000 | n/a | n/a | 0.095 | 2.478 | 0.008 | 0.095 |
| p99 | 1003.107 | n/a | n/a | n/a | 2.998 | n/a | 0.000 | 0.000 | 5.249 | 1000.972 | 0.055 | n/a | 0.104 | 0.000 | n/a | n/a | 38.967 | 2.998 | 0.066 | 38.967 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a0000000000000048 | 1003.107 | 0.132 | n/a | 0.000 | 0.000 | 0.772 | 1000.972 | 0.020 | n/a | 0.104 | 0.000 | n/a | n/a | 1.107 | 0.132 | 0.000 | 1.107 | gw-r/thread-63/journal/page | none observed |
| 23d068a2c2db5e2a000000000000004c | 400.582 | 2.478 | n/a | 0.000 | 0.000 | 5.249 | 392.690 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.095 | 2.478 | 0.006 | 0.095 | gw-r/thread-74/journal/page | none observed |
| 23d068a2c2db5e2a000000000000004e | 295.951 | 2.258 | n/a | 0.000 | 0.000 | 0.825 | 292.702 | 0.014 | n/a | 0.077 | 0.000 | n/a | n/a | 0.075 | 2.258 | 0.008 | 0.075 | gw-r/thread-74/journal/page | none observed |
| 23d068a2c2db5e2a000000000000004a | 225.842 | 2.998 | n/a | 0.000 | 0.000 | 0.622 | 222.048 | 0.055 | n/a | 0.040 | 0.000 | n/a | n/a | 0.079 | 2.998 | 0.013 | 0.079 | gw-r/thread-45/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000049 | 42.003 | 2.775 | n/a | 0.000 | 0.000 | 0.261 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.967 | 2.775 | 0.066 | 38.967 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4mix / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 936.823 | n/a | n/a | n/a | 2.210 | n/a | 0.000 | 0.000 | 0.818 | 929.137 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.095 | 2.210 | 0.007 | 0.095 |
| p99 | 1004.010 | n/a | n/a | n/a | 6.672 | n/a | 0.000 | 0.000 | 1.827 | 1000.863 | 0.013 | n/a | 0.094 | 0.000 | n/a | n/a | 1.104 | 6.672 | 0.041 | 1.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a000000000000004f | 1004.010 | 0.111 | n/a | 0.000 | 0.000 | 1.827 | 1000.863 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 1.104 | 0.111 | 0.000 | 1.104 | gw-r/thread-62/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000051 | 936.823 | 6.672 | n/a | 0.000 | 0.000 | 0.818 | 929.137 | 0.013 | n/a | 0.088 | 0.000 | n/a | n/a | 0.095 | 6.672 | 0.007 | 0.095 | gw-r/thread-47/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000050 | 54.299 | 2.210 | n/a | 0.000 | 0.000 | 0.591 | 51.371 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.082 | 2.210 | 0.041 | 0.082 | gw-r/thread-44/journal/page | none observed |

## P3 / p4h1 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 642.270 | n/a | n/a | n/a | 3.007 | n/a | 0.000 | 0.000 | 0.830 | 635.922 | 0.021 | n/a | 0.098 | 0.000 | n/a | n/a | 1.175 | 3.007 | 0.005 | 1.175 |
| p99 | 1007.553 | n/a | n/a | n/a | 3.560 | n/a | 0.000 | 0.000 | 1.404 | 1005.512 | 0.026 | n/a | 0.109 | 0.000 | n/a | n/a | 29.595 | 3.560 | 0.105 | 29.595 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a0000000000000055 | 1007.553 | 0.113 | n/a | 0.000 | 0.000 | 0.643 | 1005.512 | 0.012 | n/a | 0.098 | 0.000 | n/a | n/a | 1.175 | 0.113 | 0.000 | 1.175 | gw-r/thread-45/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000057 | 926.514 | 2.193 | n/a | 0.000 | 0.000 | 0.830 | 923.292 | 0.021 | n/a | 0.097 | 0.000 | n/a | n/a | 0.082 | 2.193 | 0.002 | 0.082 | gw-r/thread-47/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000058 | 642.270 | 3.259 | n/a | 0.000 | 0.000 | 1.404 | 635.922 | 0.026 | n/a | 0.109 | 0.000 | n/a | n/a | 1.549 | 3.259 | 0.005 | 1.549 | gw-r/thread-74/journal/page | none observed |
| 23d068a2c2db5e2a000000000000005a | 367.417 | 3.007 | n/a | 0.000 | 0.000 | 1.091 | 363.075 | 0.024 | n/a | 0.107 | 0.000 | n/a | n/a | 0.112 | 3.007 | 0.008 | 0.112 | gw-r/thread-67/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000056 | 33.785 | 3.560 | n/a | 0.000 | 0.000 | 0.631 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.595 | 3.560 | 0.105 | 29.595 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow3 / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.828 | n/a | n/a | n/a | 1.631 | n/a | 0.000 | 0.000 | 0.243 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.757 | 1.631 | 0.097 | 2.757 |
| p99 | 1058.442 | n/a | n/a | n/a | 114.026 | n/a | 6.153 | 0.000 | 0.932 | 934.433 | 0.017 | n/a | 0.123 | 0.000 | n/a | n/a | 14.954 | 120.179 | 0.114 | 14.954 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a000000000000005c | 1058.442 | 114.026 | n/a | 6.153 | 0.000 | 0.932 | 934.433 | 0.017 | n/a | 0.123 | 0.000 | n/a | n/a | 2.757 | 120.179 | 0.114 | 2.757 | gw-r/thread-64/journal/page | none observed |
| 23d068a2c2db5e2a000000000000005b | 16.828 | 1.631 | n/a | 0.000 | 0.000 | 0.243 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.954 | 1.631 | 0.097 | 14.954 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h3 / internal (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 256.740 | n/a | n/a | n/a | 3.442 | n/a | 0.000 | 0.000 | 0.841 | 253.283 | 0.013 | n/a | 0.072 | 0.000 | n/a | n/a | 0.097 | 3.442 | 0.011 | 0.097 |
| p99 | 1035.921 | n/a | n/a | n/a | 110.620 | n/a | 3.134 | 0.000 | 4.206 | 918.554 | 0.023 | n/a | 0.160 | 0.000 | n/a | n/a | 34.303 | 113.754 | 0.110 | 34.303 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a0000000000000076 | 1035.921 | 110.620 | n/a | 3.134 | 0.000 | 1.079 | 918.554 | 0.014 | n/a | 0.072 | 0.000 | n/a | n/a | 2.448 | 113.754 | 0.110 | 2.448 | gw-r/thread-73/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000074 | 433.695 | 3.948 | n/a | 0.000 | 0.000 | 0.640 | 428.894 | 0.012 | n/a | 0.070 | 0.000 | n/a | n/a | 0.131 | 3.948 | 0.009 | 0.131 | gw-r/thread-45/journal/page | none observed |
| 23d068a2c2db5e2a000000000000006b | 320.828 | 3.442 | n/a | 0.000 | 0.000 | 0.498 | 316.689 | 0.022 | n/a | 0.105 | 0.000 | n/a | n/a | 0.072 | 3.442 | 0.011 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000068 | 271.229 | 2.517 | n/a | 0.000 | 0.000 | 4.206 | 264.334 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.097 | 2.517 | 0.009 | 0.097 | gw-r/thread-64/journal/page | none observed |
| 23d068a2c2db5e2a000000000000006d | 256.740 | 1.872 | n/a | 0.000 | 0.000 | 1.336 | 253.283 | 0.023 | n/a | 0.160 | 0.000 | n/a | n/a | 0.066 | 1.872 | 0.007 | 0.066 | gw-r/thread-66/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000072 | 238.701 | 2.256 | n/a | 0.000 | 0.000 | 0.841 | 235.434 | 0.013 | n/a | 0.090 | 0.000 | n/a | n/a | 0.068 | 2.256 | 0.009 | 0.068 | gw-r/thread-44/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000069 | 98.399 | 3.781 | n/a | 0.000 | 0.000 | 2.193 | 92.254 | 0.015 | n/a | 0.080 | 0.000 | n/a | n/a | 0.076 | 3.781 | 0.038 | 0.076 | gw-r/thread-74/journal/page | none observed |
| 23d068a2c2db5e2a000000000000006e | 38.510 | 3.957 | n/a | 0.000 | 0.000 | 0.251 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.303 | 3.957 | 0.103 | 34.303 | node-14/thread-2/socket.wait-first-byte | none observed |
| 23d068a2c2db5e2a0000000000000071 | 25.006 | 1.746 | n/a | 0.000 | 0.000 | 0.297 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.962 | 1.746 | 0.070 | 22.962 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow10 / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 122.666 | n/a | n/a | n/a | 82.331 | n/a | 2.738 | 0.000 | 0.612 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.070 | 85.818 | 0.684 | 23.070 |
| p99 | 146.163 | n/a | n/a | n/a | 91.849 | n/a | 4.489 | 0.000 | 5.613 | 62.460 | 0.016 | n/a | 0.068 | 0.000 | n/a | n/a | 38.452 | 96.308 | 0.784 | 38.452 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a000000000000007a | 146.163 | 78.345 | n/a | 2.302 | 0.000 | 1.146 | 62.460 | 0.016 | n/a | 0.068 | 0.000 | n/a | n/a | 1.827 | 80.647 | 0.552 | 1.827 | node-14/thread-2/replica.fetch-feed | none observed |
| 23d068a2c2db5e2a000000000000007d | 139.599 | 91.045 | n/a | 4.489 | 0.000 | 5.613 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.452 | 95.534 | 0.684 | 38.452 | node-14/thread-2/replica.fetch-feed | none observed |
| 23d068a2c2db5e2a000000000000007f | 130.351 | 91.849 | n/a | 4.459 | 0.000 | 0.612 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.431 | 96.308 | 0.739 | 33.431 | node-14/thread-2/replica.fetch-feed | none observed |
| 23d068a2c2db5e2a0000000000000077 | 124.462 | 83.563 | n/a | 4.374 | 0.000 | 0.627 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 35.898 | 87.937 | 0.707 | 35.898 | node-14/thread-2/replica.fetch-feed | none observed |
| 23d068a2c2db5e2a0000000000000078 | 122.666 | 88.654 | n/a | 2.738 | 0.000 | 3.663 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.612 | 91.392 | 0.745 | 27.612 | node-14/thread-2/replica.fetch-feed | none observed |
| 23d068a2c2db5e2a0000000000000079 | 109.459 | 82.331 | n/a | 3.488 | 0.000 | 0.571 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.070 | 85.818 | 0.784 | 23.070 | node-14/thread-2/replica.fetch-feed | none observed |
| 23d068a2c2db5e2a000000000000007c | 13.326 | 8.918 | n/a | 0.000 | 0.000 | 0.435 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.974 | 8.918 | 0.669 | 3.974 | node-14/thread-2/replica.fetch-feed | none observed |
| 23d068a2c2db5e2a000000000000007e | 5.705 | 2.221 | n/a | 0.000 | 0.000 | 0.263 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.221 | 2.221 | 0.389 | 3.221 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h10 / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 361.080 | n/a | n/a | n/a | 3.874 | n/a | 0.000 | 0.000 | 0.871 | 344.611 | 0.032 | n/a | 0.089 | 0.000 | n/a | n/a | 0.118 | 3.874 | 0.010 | 0.118 |
| p99 | 1008.994 | n/a | n/a | n/a | 15.312 | n/a | 0.000 | 0.000 | 2.919 | 1002.905 | 0.106 | n/a | 0.147 | 0.000 | n/a | n/a | 0.242 | 15.312 | 0.046 | 0.242 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a000000000000008c | 1008.994 | 3.624 | n/a | 0.000 | 0.000 | 2.206 | 1002.905 | 0.042 | n/a | 0.128 | 0.000 | n/a | n/a | 0.090 | 3.624 | 0.004 | 0.090 | gw-r/thread-70/journal/page | none observed |
| 23d068a2c2db5e2a000000000000008d | 512.859 | 3.320 | n/a | 0.000 | 0.000 | 0.688 | 508.638 | 0.023 | n/a | 0.110 | 0.000 | n/a | n/a | 0.080 | 3.320 | 0.006 | 0.080 | gw-r/thread-73/journal/page | none observed |
| 23d068a2c2db5e2a000000000000008f | 486.992 | 4.892 | n/a | 0.000 | 0.000 | 0.442 | 481.418 | 0.032 | n/a | 0.089 | 0.000 | n/a | n/a | 0.118 | 4.892 | 0.010 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000087 | 361.080 | 15.312 | n/a | 0.000 | 0.000 | 0.884 | 344.611 | 0.032 | n/a | 0.078 | 0.000 | n/a | n/a | 0.164 | 15.312 | 0.042 | 0.164 | gw-r/thread-74/journal/page | none observed |
| 23d068a2c2db5e2a000000000000008a | 236.818 | 3.874 | n/a | 0.000 | 0.000 | 0.871 | 231.855 | 0.014 | n/a | 0.073 | 0.000 | n/a | n/a | 0.131 | 3.874 | 0.016 | 0.131 | gw-r/thread-44/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000089 | 91.888 | 4.219 | n/a | 0.000 | 0.000 | 2.919 | 84.255 | 0.106 | n/a | 0.147 | 0.000 | n/a | n/a | 0.242 | 4.219 | 0.046 | 0.242 | gw-r/thread-61/journal/page | none observed |

## P3 / presweep / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 652.529 | n/a | n/a | n/a | 3.887 | n/a | 0.000 | 0.000 | 2.170 | 647.456 | 0.022 | n/a | 0.106 | 0.000 | n/a | n/a | 0.094 | 3.887 | 0.006 | 0.094 |
| p99 | 820.801 | n/a | n/a | n/a | 6.631 | n/a | 0.000 | 0.000 | 2.993 | 816.147 | 0.031 | n/a | 0.134 | 0.000 | n/a | n/a | 0.113 | 6.631 | 0.019 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a0000000000000093 | 820.801 | 2.264 | n/a | 0.000 | 0.000 | 2.170 | 816.147 | 0.031 | n/a | 0.100 | 0.000 | n/a | n/a | 0.088 | 2.264 | 0.003 | 0.088 | gw-r/thread-67/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000090 | 652.529 | 3.887 | n/a | 0.000 | 0.000 | 0.935 | 647.456 | 0.022 | n/a | 0.134 | 0.000 | n/a | n/a | 0.094 | 3.887 | 0.006 | 0.094 | gw-r/thread-63/journal/page | none observed |
| 23d068a2c2db5e2a0000000000000091 | 343.701 | 6.631 | n/a | 0.000 | 0.000 | 2.993 | 333.840 | 0.017 | n/a | 0.106 | 0.000 | n/a | n/a | 0.113 | 6.631 | 0.019 | 0.113 | gw-r/thread-45/journal/page | none observed |

## P3 / sweep / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.474 | n/a | n/a | n/a | 2.820 | n/a | 0.000 | 0.000 | 0.367 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.865 | 2.820 | 0.271 | 7.865 |
| p99 | 34.546 | n/a | n/a | n/a | 14.141 | n/a | 0.000 | 0.000 | 0.500 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.846 | 14.141 | 0.558 | 22.846 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23d068a2c2db5e2a0000000000000094 | 34.546 | 14.141 | n/a | 0.000 | 0.000 | 0.324 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.081 | 14.141 | 0.409 | 20.081 | node-14/thread-2/socket.wait-first-byte | none observed |
| 23d068a2c2db5e2a0000000000000098 | 26.441 | 3.269 | n/a | 0.000 | 0.000 | 0.327 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.846 | 3.269 | 0.124 | 22.846 | node-14/thread-2/socket.wait-first-byte | none observed |
| 23d068a2c2db5e2a0000000000000096 | 14.647 | 1.931 | n/a | 0.000 | 0.000 | 0.375 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.340 | 1.931 | 0.132 | 12.340 | node-14/thread-2/socket.wait-first-byte | none observed |
| 23d068a2c2db5e2a000000000000009b | 12.980 | 2.379 | n/a | 0.000 | 0.000 | 0.420 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.181 | 2.379 | 0.183 | 10.181 | node-14/thread-2/socket.wait-first-byte | none observed |
| 23d068a2c2db5e2a000000000000009a | 11.474 | 3.109 | n/a | 0.000 | 0.000 | 0.500 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.865 | 3.109 | 0.271 | 7.865 | node-14/thread-2/socket.wait-first-byte | none observed |
| 23d068a2c2db5e2a0000000000000095 | 6.792 | 3.553 | n/a | 0.000 | 0.000 | 0.453 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.787 | 3.553 | 0.523 | 2.787 | node-14/thread-2/socket.wait-first-byte | none observed |
| 23d068a2c2db5e2a0000000000000099 | 5.052 | 2.820 | n/a | 0.000 | 0.000 | 0.301 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.931 | 2.820 | 0.558 | 1.931 | node-14/thread-2/replica.fetch-feed | none observed |
| 23d068a2c2db5e2a0000000000000097 | 4.396 | 2.052 | n/a | 0.000 | 0.000 | 0.367 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.978 | 2.052 | 0.467 | 1.978 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.892 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.557 | 201.161 | 0.024 | n/a | 0.171 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 |
| p99 | 228.336 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 26.683 | 201.685 | 13.156 | n/a | 1.760 | 0.000 | n/a | n/a | 0.909 | 0.000 | 0.000 | 0.909 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fba1b91480f2488f000000000000000a | 228.336 | 0.000 | n/a | 0.000 | 0.000 | 26.683 | 201.315 | 0.024 | n/a | 0.171 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-63/journal/page | none observed |
| fba1b91480f2488f0000000000000008 | 207.113 | 0.000 | n/a | 0.000 | 0.000 | 5.617 | 201.161 | 0.012 | n/a | 0.181 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-58/journal/page | none observed |
| fba1b91480f2488f0000000000000009 | 206.856 | 0.000 | n/a | 0.000 | 0.000 | 2.557 | 190.073 | 13.156 | n/a | 0.161 | 0.000 | n/a | n/a | 0.909 | 0.000 | 0.000 | 0.909 | gw-r/thread-46/journal/page | none observed |
| fba1b91480f2488f000000000000000f | 205.963 | 0.000 | n/a | 0.000 | 0.000 | 3.946 | 201.685 | 0.021 | n/a | 0.209 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-47/journal/page | none observed |
| fba1b91480f2488f000000000000000c | 202.892 | 0.000 | n/a | 0.000 | 0.000 | 0.961 | 201.541 | 0.031 | n/a | 0.202 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-41/journal/page | none observed |
| fba1b91480f2488f000000000000000d | 202.551 | 0.000 | n/a | 0.000 | 0.000 | 0.902 | 201.401 | 0.014 | n/a | 0.135 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-44/journal/page | none observed |
| fba1b91480f2488f000000000000000e | 197.031 | 0.000 | n/a | 0.000 | 0.000 | 4.021 | 189.732 | 3.045 | n/a | 0.049 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-45/journal/page | none observed |
| fba1b91480f2488f000000000000000b | 179.070 | 0.000 | n/a | 0.000 | 0.000 | 1.723 | 175.396 | 0.012 | n/a | 1.760 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-46/journal/page | none observed |
| fba1b91480f2488f0000000000000010 | 84.335 | 0.000 | n/a | 0.000 | 0.000 | 1.198 | 78.605 | 4.182 | n/a | 0.094 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | gw-r/thread-61/journal/page | none observed |

## P3 / baseline / read (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.985 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.153 | 201.889 | 0.025 | n/a | 0.152 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 |
| p99 | 210.570 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 8.353 | 202.517 | 0.033 | n/a | 0.251 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fba1b91480f2488f0000000000000011 | 210.570 | 0.000 | n/a | 0.000 | 0.000 | 8.353 | 201.889 | 0.015 | n/a | 0.133 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-61/journal/page | none observed |
| fba1b91480f2488f0000000000000013 | 203.985 | 0.000 | n/a | 0.000 | 0.000 | 2.153 | 201.384 | 0.025 | n/a | 0.251 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-63/journal/page | none observed |
| fba1b91480f2488f0000000000000012 | 203.921 | 0.000 | n/a | 0.000 | 0.000 | 1.047 | 202.517 | 0.033 | n/a | 0.152 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-62/journal/page | none observed |

## P3 / L16 / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.989 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.422 | 188.580 | 0.052 | n/a | 0.181 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 204.680 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.926 | 201.507 | 20.090 | n/a | 0.204 | 0.000 | n/a | n/a | 1.563 | 0.000 | 0.000 | 1.563 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fba1b91480f2488f0000000000000021 | 204.680 | 0.000 | n/a | 0.000 | 0.000 | 2.926 | 201.417 | 0.050 | n/a | 0.181 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-58/journal/page | none observed |
| fba1b91480f2488f0000000000000020 | 203.282 | 0.000 | n/a | 0.000 | 0.000 | 1.422 | 201.507 | 0.052 | n/a | 0.170 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| fba1b91480f2488f0000000000000022 | 201.989 | 0.000 | n/a | 0.000 | 0.000 | 1.229 | 188.580 | 10.418 | n/a | 0.198 | 0.000 | n/a | n/a | 1.563 | 0.000 | 0.000 | 1.563 | gw-r/thread-41/journal/page | none observed |
| fba1b91480f2488f000000000000001e | 189.395 | 0.000 | n/a | 0.000 | 0.000 | 1.615 | 167.240 | 20.090 | n/a | 0.204 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-61/journal/page | none observed |

## P3 / L64 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 204.227 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.804 | 201.665 | 0.048 | n/a | 0.184 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 |
| p99 | 217.792 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.062 | 204.932 | 42.445 | n/a | 2.120 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fba1b91480f2488f0000000000000025 | 217.792 | 0.000 | n/a | 0.000 | 0.000 | 3.925 | 169.159 | 42.445 | n/a | 2.120 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-47/journal/page | none observed |
| fba1b91480f2488f0000000000000023 | 212.325 | 0.000 | n/a | 0.000 | 0.000 | 7.062 | 204.932 | 0.016 | n/a | 0.147 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-61/journal/page | none observed |
| fba1b91480f2488f0000000000000024 | 205.995 | 0.000 | n/a | 0.000 | 0.000 | 2.183 | 203.495 | 0.019 | n/a | 0.184 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-62/journal/page | none observed |
| fba1b91480f2488f000000000000002a | 205.945 | 0.000 | n/a | 0.000 | 0.000 | 1.804 | 203.719 | 0.067 | n/a | 0.187 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-62/journal/page | none observed |
| fba1b91480f2488f0000000000000026 | 204.558 | 0.000 | n/a | 0.000 | 0.000 | 2.444 | 201.665 | 0.045 | n/a | 0.234 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-48/journal/page | none observed |
| fba1b91480f2488f000000000000002c | 204.227 | 0.000 | n/a | 0.000 | 0.000 | 1.964 | 201.734 | 0.050 | n/a | 0.347 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-43/journal/page | none observed |
| fba1b91480f2488f000000000000002b | 203.162 | 0.000 | n/a | 0.000 | 0.000 | 0.890 | 201.891 | 0.048 | n/a | 0.214 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-44/journal/page | none observed |
| fba1b91480f2488f0000000000000028 | 203.025 | 0.000 | n/a | 0.000 | 0.000 | 1.438 | 201.285 | 0.014 | n/a | 0.131 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-64/journal/page | none observed |
| fba1b91480f2488f0000000000000027 | 66.194 | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 55.735 | 9.345 | n/a | 0.097 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-45/journal/page | none observed |
| fba1b91480f2488f000000000000002d | 60.538 | 0.000 | n/a | 0.000 | 0.000 | 1.089 | 51.473 | 7.561 | n/a | 0.184 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.666 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.148 | 201.249 | 0.021 | n/a | 0.125 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 |
| p99 | 208.943 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.796 | 206.196 | 32.644 | n/a | 0.697 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fba1b91480f2488f000000000000002e | 208.943 | 0.000 | n/a | 0.000 | 0.000 | 2.320 | 206.196 | 0.058 | n/a | 0.183 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-46/journal/page | none observed |
| fba1b91480f2488f0000000000000037 | 205.218 | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 204.206 | 0.012 | n/a | 0.109 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-61/journal/page | none observed |
| fba1b91480f2488f0000000000000034 | 204.018 | 0.000 | n/a | 0.000 | 0.000 | 1.148 | 201.942 | 0.030 | n/a | 0.697 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-46/journal/page | none observed |
| fba1b91480f2488f0000000000000032 | 203.878 | 0.000 | n/a | 0.000 | 0.000 | 0.843 | 202.699 | 0.021 | n/a | 0.197 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-43/journal/page | none observed |
| fba1b91480f2488f0000000000000031 | 203.563 | 0.000 | n/a | 0.000 | 0.000 | 1.849 | 201.355 | 0.016 | n/a | 0.237 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-44/journal/page | none observed |
| fba1b91480f2488f0000000000000035 | 202.666 | 0.000 | n/a | 0.000 | 0.000 | 1.145 | 201.249 | 0.012 | n/a | 0.125 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |
| fba1b91480f2488f0000000000000030 | 201.853 | 0.000 | n/a | 0.000 | 0.000 | 0.405 | 201.181 | 0.017 | n/a | 0.135 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-41/journal/page | none observed |
| fba1b91480f2488f0000000000000039 | 196.975 | 0.000 | n/a | 0.000 | 0.000 | 3.796 | 192.911 | 0.021 | n/a | 0.096 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-44/journal/page | none observed |
| fba1b91480f2488f0000000000000038 | 131.035 | 0.000 | n/a | 0.000 | 0.000 | 2.680 | 116.385 | 11.712 | n/a | 0.038 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-62/journal/page | none observed |
| fba1b91480f2488f000000000000002f | 81.003 | 0.000 | n/a | 0.000 | 0.000 | 2.168 | 45.962 | 32.644 | n/a | 0.114 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.549 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.573 | 201.006 | 0.016 | n/a | 0.117 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 |
| p99 | 205.433 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.294 | 201.444 | 10.127 | n/a | 0.221 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fba1b91480f2488f000000000000003d | 205.433 | 0.000 | n/a | 0.000 | 0.000 | 3.966 | 201.231 | 0.014 | n/a | 0.114 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-63/journal/page | none observed |
| fba1b91480f2488f000000000000003a | 203.370 | 0.000 | n/a | 0.000 | 0.000 | 2.141 | 200.978 | 0.015 | n/a | 0.117 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-46/journal/page | none observed |
| fba1b91480f2488f0000000000000040 | 203.048 | 0.000 | n/a | 0.000 | 0.000 | 1.731 | 201.055 | 0.013 | n/a | 0.131 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-44/journal/page | none observed |
| fba1b91480f2488f000000000000003b | 202.816 | 0.000 | n/a | 0.000 | 0.000 | 1.573 | 201.006 | 0.014 | n/a | 0.120 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-58/journal/page | none observed |
| fba1b91480f2488f0000000000000041 | 202.746 | 0.000 | n/a | 0.000 | 0.000 | 1.037 | 201.444 | 0.016 | n/a | 0.142 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-41/journal/page | none observed |
| fba1b91480f2488f0000000000000042 | 202.549 | 0.000 | n/a | 0.000 | 0.000 | 1.350 | 200.959 | 0.018 | n/a | 0.109 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-58/journal/page | none observed |
| fba1b91480f2488f000000000000003c | 202.487 | 0.000 | n/a | 0.000 | 0.000 | 0.905 | 201.281 | 0.017 | n/a | 0.115 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-45/journal/page | none observed |
| fba1b91480f2488f000000000000003f | 202.218 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 201.054 | 0.025 | n/a | 0.165 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-43/journal/page | none observed |
| fba1b91480f2488f0000000000000043 | 110.693 | 0.000 | n/a | 0.000 | 0.000 | 7.294 | 92.925 | 10.127 | n/a | 0.221 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-61/journal/page | none observed |
| fba1b91480f2488f000000000000003e | 65.870 | 0.000 | n/a | 0.000 | 0.000 | 3.286 | 57.078 | 5.309 | n/a | 0.072 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-62/journal/page | none observed |

## P3 / recovery / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.478 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.131 | 200.976 | 0.031 | n/a | 0.106 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 |
| p99 | 233.268 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 32.074 | 206.601 | 4.919 | n/a | 0.188 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fba1b91480f2488f000000000000004a | 233.268 | 0.000 | n/a | 0.000 | 0.000 | 32.074 | 200.976 | 0.011 | n/a | 0.106 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| fba1b91480f2488f0000000000000047 | 207.943 | 0.000 | n/a | 0.000 | 0.000 | 0.985 | 206.601 | 0.041 | n/a | 0.149 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-47/journal/page | none observed |
| fba1b91480f2488f0000000000000044 | 207.066 | 0.000 | n/a | 0.000 | 0.000 | 1.758 | 204.928 | 0.076 | n/a | 0.188 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-62/journal/page | none observed |
| fba1b91480f2488f0000000000000046 | 206.715 | 0.000 | n/a | 0.000 | 0.000 | 2.422 | 204.061 | 0.015 | n/a | 0.110 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-44/journal/page | none observed |
| fba1b91480f2488f000000000000004c | 202.809 | 0.000 | n/a | 0.000 | 0.000 | 1.131 | 201.344 | 0.038 | n/a | 0.177 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-45/journal/page | none observed |
| fba1b91480f2488f0000000000000045 | 202.478 | 0.000 | n/a | 0.000 | 0.000 | 0.956 | 201.167 | 0.031 | n/a | 0.148 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-43/journal/page | none observed |
| fba1b91480f2488f0000000000000049 | 190.118 | 0.000 | n/a | 0.000 | 0.000 | 0.910 | 188.929 | 0.019 | n/a | 0.081 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-58/journal/page | none observed |
| fba1b91480f2488f000000000000004b | 184.161 | 0.000 | n/a | 0.000 | 0.000 | 2.788 | 180.343 | 0.785 | n/a | 0.076 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-46/journal/page | none observed |
| fba1b91480f2488f0000000000000048 | 123.969 | 0.000 | n/a | 0.000 | 0.000 | 0.982 | 122.761 | 0.014 | n/a | 0.080 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-46/journal/page | none observed |
| fba1b91480f2488f000000000000004d | 66.593 | 0.000 | n/a | 0.000 | 0.000 | 1.747 | 59.707 | 4.919 | n/a | 0.095 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-58/journal/page | none observed |

## P3 / p4mix / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.016 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.034 | 201.315 | 0.013 | n/a | 0.119 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 |
| p99 | 216.860 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 15.199 | 204.582 | 0.062 | n/a | 0.178 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fba1b91480f2488f0000000000000053 | 216.860 | 0.000 | n/a | 0.000 | 0.000 | 15.199 | 201.315 | 0.034 | n/a | 0.178 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-64/journal/page | none observed |
| fba1b91480f2488f0000000000000055 | 205.593 | 0.000 | n/a | 0.000 | 0.000 | 0.770 | 204.582 | 0.018 | n/a | 0.119 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-63/journal/page | none observed |
| fba1b91480f2488f000000000000004e | 205.539 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 204.369 | 0.062 | n/a | 0.112 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-66/journal/page | none observed |
| fba1b91480f2488f000000000000004f | 203.253 | 0.000 | n/a | 0.000 | 0.000 | 1.045 | 201.915 | 0.013 | n/a | 0.172 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-67/journal/page | none observed |
| fba1b91480f2488f0000000000000051 | 203.016 | 0.000 | n/a | 0.000 | 0.000 | 0.921 | 201.823 | 0.012 | n/a | 0.104 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-69/journal/page | none observed |
| fba1b91480f2488f0000000000000054 | 202.944 | 0.000 | n/a | 0.000 | 0.000 | 1.554 | 201.120 | 0.013 | n/a | 0.119 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-70/journal/page | none observed |
| fba1b91480f2488f0000000000000056 | 202.412 | 0.000 | n/a | 0.000 | 0.000 | 1.034 | 201.116 | 0.012 | n/a | 0.124 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-72/journal/page | none observed |
| fba1b91480f2488f0000000000000050 | 201.910 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 200.914 | 0.011 | n/a | 0.108 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-43/journal/page | none observed |
| fba1b91480f2488f0000000000000052 | 137.871 | 0.000 | n/a | 0.000 | 0.000 | 2.152 | 135.502 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-61/journal/page | none observed |

## P3 / p4h1 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.238 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.866 | 201.100 | 0.020 | n/a | 0.121 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 |
| p99 | 212.058 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.157 | 206.658 | 8.840 | n/a | 3.387 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fba1b91480f2488f0000000000000065 | 212.058 | 0.000 | n/a | 0.000 | 0.000 | 5.157 | 206.658 | 0.029 | n/a | 0.109 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-73/journal/page | none observed |
| fba1b91480f2488f0000000000000064 | 204.624 | 0.000 | n/a | 0.000 | 0.000 | 1.940 | 199.154 | 0.012 | n/a | 3.387 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-68/journal/page | none observed |
| fba1b91480f2488f0000000000000066 | 204.315 | 0.000 | n/a | 0.000 | 0.000 | 2.558 | 201.469 | 0.021 | n/a | 0.161 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-46/journal/page | none observed |
| fba1b91480f2488f000000000000005f | 203.031 | 0.000 | n/a | 0.000 | 0.000 | 0.956 | 201.794 | 0.012 | n/a | 0.152 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-64/journal/page | none observed |
| fba1b91480f2488f0000000000000069 | 202.974 | 0.000 | n/a | 0.000 | 0.000 | 1.156 | 201.488 | 0.035 | n/a | 0.172 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-66/journal/page | none observed |
| fba1b91480f2488f0000000000000063 | 202.525 | 0.000 | n/a | 0.000 | 0.000 | 0.728 | 201.549 | 0.013 | n/a | 0.127 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-72/journal/page | none observed |
| fba1b91480f2488f000000000000005e | 202.238 | 0.000 | n/a | 0.000 | 0.000 | 0.849 | 201.100 | 0.011 | n/a | 0.107 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-44/journal/page | none observed |
| fba1b91480f2488f0000000000000060 | 202.153 | 0.000 | n/a | 0.000 | 0.000 | 0.712 | 201.178 | 0.020 | n/a | 0.140 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-70/journal/page | none observed |
| fba1b91480f2488f0000000000000068 | 202.012 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 200.867 | 0.020 | n/a | 0.099 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-43/journal/page | none observed |
| fba1b91480f2488f0000000000000061 | 202.011 | 0.000 | n/a | 0.000 | 0.000 | 0.866 | 200.884 | 0.012 | n/a | 0.121 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-41/journal/page | none observed |
| fba1b91480f2488f000000000000006b | 201.579 | 0.000 | n/a | 0.000 | 0.000 | 0.662 | 200.669 | 0.013 | n/a | 0.089 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-62/journal/page | none observed |
| fba1b91480f2488f000000000000006a | 189.002 | 0.000 | n/a | 0.000 | 0.000 | 0.764 | 179.200 | 8.840 | n/a | 0.073 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-58/journal/page | none observed |
| fba1b91480f2488f0000000000000062 | 120.708 | 0.000 | n/a | 0.000 | 0.000 | 1.226 | 119.257 | 0.024 | n/a | 0.083 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-71/journal/page | none observed |

## P3 / grow3 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.651 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.908 | 200.882 | 0.026 | n/a | 0.111 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 |
| p99 | 255.530 | n/a | n/a | n/a | 0.501 | n/a | 0.000 | 0.000 | 1.629 | 201.193 | 170.941 | n/a | 0.189 | 0.000 | n/a | n/a | 0.178 | 0.501 | 0.002 | 0.178 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fba1b91480f2488f0000000000000071 | 255.530 | 0.501 | n/a | 0.000 | 0.000 | 0.693 | 83.252 | 170.941 | n/a | 0.051 | 0.000 | n/a | n/a | 0.092 | 0.501 | 0.002 | 0.092 | gw-r/thread-71/gateway.admission-wait | none observed |
| fba1b91480f2488f0000000000000070 | 203.193 | 0.000 | n/a | 0.000 | 0.000 | 1.629 | 201.193 | 0.026 | n/a | 0.189 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-45/journal/page | none observed |
| fba1b91480f2488f000000000000006e | 202.651 | 0.000 | n/a | 0.000 | 0.000 | 1.212 | 201.146 | 0.021 | n/a | 0.136 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-70/journal/page | none observed |
| fba1b91480f2488f000000000000006f | 202.092 | 0.000 | n/a | 0.000 | 0.000 | 0.908 | 200.882 | 0.012 | n/a | 0.111 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-41/journal/page | none observed |
| fba1b91480f2488f000000000000006c | 138.153 | 0.000 | n/a | 0.000 | 0.000 | 0.836 | 133.540 | 3.550 | n/a | 0.078 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-61/journal/page | none observed |

## P3 / p4h3 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.647 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.968 | 201.074 | 0.025 | n/a | 0.097 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 |
| p99 | 219.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.190 | 201.599 | 15.678 | n/a | 0.146 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fba1b91480f2488f0000000000000082 | 219.010 | 0.000 | n/a | 0.000 | 0.000 | 1.936 | 201.121 | 15.678 | n/a | 0.145 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-62/journal/page | none observed |
| fba1b91480f2488f0000000000000086 | 204.775 | 0.000 | n/a | 0.000 | 0.000 | 3.190 | 201.221 | 0.027 | n/a | 0.146 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-63/journal/page | none observed |
| fba1b91480f2488f000000000000007d | 203.641 | 0.000 | n/a | 0.000 | 0.000 | 1.881 | 201.441 | 0.047 | n/a | 0.145 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-72/journal/page | none observed |
| fba1b91480f2488f0000000000000089 | 203.196 | 0.000 | n/a | 0.000 | 0.000 | 0.968 | 199.625 | 2.388 | n/a | 0.034 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-68/journal/page | none observed |
| fba1b91480f2488f0000000000000080 | 202.704 | 0.000 | n/a | 0.000 | 0.000 | 1.393 | 201.074 | 0.025 | n/a | 0.084 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-48/journal/page | none observed |
| fba1b91480f2488f000000000000008a | 202.647 | 0.000 | n/a | 0.000 | 0.000 | 0.777 | 201.599 | 0.021 | n/a | 0.146 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-72/journal/page | none observed |
| fba1b91480f2488f0000000000000088 | 202.469 | 0.000 | n/a | 0.000 | 0.000 | 1.080 | 201.094 | 0.016 | n/a | 0.119 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-71/journal/page | none observed |
| fba1b91480f2488f000000000000008b | 202.161 | 0.000 | n/a | 0.000 | 0.000 | 0.776 | 201.069 | 0.015 | n/a | 0.097 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-64/journal/page | none observed |
| fba1b91480f2488f0000000000000081 | 95.307 | 0.000 | n/a | 0.000 | 0.000 | 0.830 | 90.859 | 3.365 | n/a | 0.056 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-67/journal/page | none observed |
| fba1b91480f2488f000000000000007f | 90.816 | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 89.755 | 0.013 | n/a | 0.070 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-46/journal/page | none observed |

## P3 / grow10 / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 94.412 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.401 | 88.177 | 0.015 | n/a | 0.092 | 0.000 | n/a | n/a | 0.556 | 0.000 | 0.000 | 0.556 |
| p99 | 261.463 | n/a | n/a | n/a | 0.699 | n/a | 0.000 | 0.000 | 4.223 | 201.291 | 171.182 | n/a | 0.196 | 0.000 | n/a | n/a | 0.611 | 0.699 | 0.004 | 0.611 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fba1b91480f2488f000000000000008d | 261.463 | 0.000 | n/a | 0.000 | 0.000 | 1.401 | 88.177 | 171.182 | n/a | 0.091 | 0.000 | n/a | n/a | 0.611 | 0.000 | 0.000 | 0.611 | gw-r/thread-74/gateway.admission-wait | none observed |
| fba1b91480f2488f000000000000008c | 205.845 | 0.000 | n/a | 0.000 | 0.000 | 4.223 | 201.291 | 0.033 | n/a | 0.196 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-46/journal/page | none observed |
| fba1b91480f2488f0000000000000091 | 162.822 | 0.699 | n/a | 0.000 | 0.000 | 0.694 | 161.163 | 0.023 | n/a | 0.099 | 0.000 | n/a | n/a | 0.144 | 0.699 | 0.004 | 0.144 | gw-r/thread-61/journal/page | none observed |
| fba1b91480f2488f0000000000000095 | 94.412 | 0.000 | n/a | 0.000 | 0.000 | 0.635 | 93.136 | 0.011 | n/a | 0.065 | 0.000 | n/a | n/a | 0.565 | 0.000 | 0.000 | 0.565 | gw-r/thread-68/journal/page | none observed |
| fba1b91480f2488f0000000000000090 | 82.726 | 0.000 | n/a | 0.000 | 0.000 | 3.170 | 78.894 | 0.015 | n/a | 0.092 | 0.000 | n/a | n/a | 0.556 | 0.000 | 0.000 | 0.556 | gw-r/thread-62/journal/page | none observed |
| fba1b91480f2488f0000000000000093 | 76.789 | 0.000 | n/a | 0.000 | 0.000 | 2.239 | 73.841 | 0.012 | n/a | 0.101 | 0.000 | n/a | n/a | 0.596 | 0.000 | 0.000 | 0.596 | gw-r/thread-41/journal/page | none observed |

## P3 / p4h10 / read (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.328 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.960 | 201.098 | 0.020 | n/a | 0.109 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 |
| p99 | 207.206 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.257 | 205.910 | 9.964 | n/a | 0.195 | 0.000 | n/a | n/a | 0.260 | 0.000 | 0.000 | 0.260 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fba1b91480f2488f00000000000000b4 | 207.206 | 0.000 | n/a | 0.000 | 0.000 | 0.960 | 205.910 | 0.031 | n/a | 0.195 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-74/journal/page | none observed |
| fba1b91480f2488f00000000000000b1 | 205.541 | 0.000 | n/a | 0.000 | 0.000 | 0.910 | 204.356 | 0.012 | n/a | 0.092 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-66/journal/page | none observed |
| fba1b91480f2488f00000000000000ae | 203.621 | 0.000 | n/a | 0.000 | 0.000 | 1.753 | 201.524 | 0.014 | n/a | 0.122 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-72/journal/page | none observed |
| fba1b91480f2488f00000000000000a6 | 203.119 | 0.000 | n/a | 0.000 | 0.000 | 1.262 | 201.581 | 0.020 | n/a | 0.139 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-47/journal/page | none observed |
| fba1b91480f2488f00000000000000b0 | 202.949 | 0.000 | n/a | 0.000 | 0.000 | 1.231 | 201.339 | 0.059 | n/a | 0.132 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-67/journal/page | none observed |
| fba1b91480f2488f00000000000000a9 | 202.732 | 0.000 | n/a | 0.000 | 0.000 | 1.252 | 201.098 | 0.015 | n/a | 0.107 | 0.000 | n/a | n/a | 0.260 | 0.000 | 0.000 | 0.260 | gw-r/thread-58/journal/page | none observed |
| fba1b91480f2488f00000000000000ab | 202.429 | 0.000 | n/a | 0.000 | 0.000 | 0.747 | 201.320 | 0.014 | n/a | 0.114 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 | gw-r/thread-63/journal/page | none observed |
| fba1b91480f2488f00000000000000ac | 202.328 | 0.000 | n/a | 0.000 | 0.000 | 0.999 | 201.083 | 0.020 | n/a | 0.117 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-71/journal/page | none observed |
| fba1b91480f2488f00000000000000ad | 202.124 | 0.000 | n/a | 0.000 | 0.000 | 0.767 | 201.149 | 0.014 | n/a | 0.093 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-45/journal/page | none observed |
| fba1b91480f2488f00000000000000b3 | 201.873 | 0.000 | n/a | 0.000 | 0.000 | 0.556 | 201.093 | 0.016 | n/a | 0.105 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| fba1b91480f2488f00000000000000a7 | 130.356 | 0.000 | n/a | 0.000 | 0.000 | 0.835 | 126.241 | 3.031 | n/a | 0.109 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-69/journal/page | none observed |
| fba1b91480f2488f00000000000000af | 106.288 | 0.000 | n/a | 0.000 | 0.000 | 3.257 | 99.940 | 2.884 | n/a | 0.065 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-41/journal/page | none observed |
| fba1b91480f2488f00000000000000a5 | 76.320 | 0.000 | n/a | 0.000 | 0.000 | 1.170 | 64.876 | 9.964 | n/a | 0.071 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-66/journal/page | none observed |
| fba1b91480f2488f00000000000000b2 | 64.228 | 0.000 | n/a | 0.000 | 0.000 | 0.628 | 58.831 | 4.544 | n/a | 0.112 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-46/journal/page | none observed |

## P3 / presweep / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.623 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.674 | 201.020 | 0.020 | n/a | 0.110 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 |
| p99 | 204.732 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.238 | 202.787 | 4.964 | n/a | 0.216 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fba1b91480f2488f00000000000000bc | 204.732 | 0.000 | n/a | 0.000 | 0.000 | 3.238 | 201.184 | 0.014 | n/a | 0.131 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-66/journal/page | none observed |
| fba1b91480f2488f00000000000000bd | 204.722 | 0.000 | n/a | 0.000 | 0.000 | 1.586 | 202.787 | 0.035 | n/a | 0.135 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-46/journal/page | none observed |
| fba1b91480f2488f00000000000000b6 | 204.095 | 0.000 | n/a | 0.000 | 0.000 | 2.808 | 201.020 | 0.015 | n/a | 0.138 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-64/journal/page | none observed |
| fba1b91480f2488f00000000000000bb | 203.962 | 0.000 | n/a | 0.000 | 0.000 | 2.722 | 201.005 | 0.016 | n/a | 0.102 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-70/journal/page | none observed |
| fba1b91480f2488f00000000000000b7 | 203.623 | 0.000 | n/a | 0.000 | 0.000 | 1.083 | 202.188 | 0.020 | n/a | 0.216 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-71/journal/page | none observed |
| fba1b91480f2488f00000000000000b9 | 203.237 | 0.000 | n/a | 0.000 | 0.000 | 1.953 | 201.023 | 0.016 | n/a | 0.106 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-72/journal/page | none observed |
| fba1b91480f2488f00000000000000b8 | 199.960 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 199.145 | 0.021 | n/a | 0.066 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-68/journal/page | none observed |
| fba1b91480f2488f00000000000000be | 145.676 | 0.000 | n/a | 0.000 | 0.000 | 0.945 | 139.479 | 4.964 | n/a | 0.110 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-73/journal/page | none observed |
| fba1b91480f2488f00000000000000ba | 107.647 | 0.000 | n/a | 0.000 | 0.000 | 1.674 | 100.718 | 4.955 | n/a | 0.080 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-41/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
