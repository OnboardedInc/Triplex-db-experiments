# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.scheduler-late` (1778.453 ms, trace `d87a9f279d731ddc0000000000000099`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (858.156 ms, trace `d87a9f279d731ddc0000000000000112`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (657.336 ms, trace `d87a9f279d731ddc0000000000000113`); `node-14/thread-0/driver.queue.scheduler-late` (531.086 ms, trace `d87a9f279d731ddc000000000000009a`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (457.530 ms, trace `d87a9f279d731ddc0000000000000138`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-smoke-g`; source `0c2208b123903ee6df7f958e1355a586a23f3c49`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 101/102 (99.020%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 102/102. Raw trace bytes: 2534000.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 141 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1994.020 | 304.064 | 393.600 | 66 |
| baseline | 0 | 1979.448 | 92.575 | 18.545 | 39 |
| L1 | 1 | 1950.505 | 246.290 | 69.773 | 30 |
| L4 | 4 | 1928.025 | 368.697 | 285.861 | 44 |
| L16 | 16 | 1830.502 | 219.053 | 292.280 | 49 |
| L64 | 16 | 1924.196 | 267.592 | 346.421 | 53 |
| L256 | 16 | 1845.544 | 322.895 | 549.198 | 16 |
| L1024 | 16 | 1763.149 | 319.560 | 301.789 | 59 |
| recovery | 16 | 1960.637 | 336.839 | 552.935 | 28 |
| p4mix | 1 | 1950.503 | 90.583 | 58.244 | 30 |
| p4h1 | 1 | 2497.286 | 150.099 | 131.214 | 80 |
| grow3 | 0 | 2188.862 | 435.638 | 46.528 | 108 |
| p4h3 | 1 | 2724.197 | 171.578 | 115.541 | 71 |
| grow10 | 0 | 2647.980 | 811.930 | 117.310 | 80 |
| p4h10 | 1 | 2061.115 | 96.644 | 97.381 | 38 |
| presweep | 16 | 1096.277 | 139.036 | 209.577 | 58 |
| sweep | 16 | 300.856 | 91.687 | 81.372 | 140 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| d87a9f279d731ddc0000000000000099 | driver.queue.scheduler-late | 1778.453 | none | 0 / 32 |
| d87a9f279d731ddc0000000000000099 | driver.queue.scheduler-dispatch | 0.293 | none | 0 / 32 |

Observed active steps while trace d87a9f279d731ddc0000000000000099 waited: []

| d87a9f279d731ddc0000000000000112 | driver.queue.scheduler-dispatch | 0.098 | none | 0 / 32 |
| d87a9f279d731ddc0000000000000112 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace d87a9f279d731ddc0000000000000112 waited: []

| d87a9f279d731ddc0000000000000113 | driver.queue.scheduler-late | 0.417 | none | 1 / 32 |
| d87a9f279d731ddc0000000000000113 | driver.queue.scheduler-dispatch | 0.130 | none | 1 / 32 |

Observed active steps while trace d87a9f279d731ddc0000000000000113 waited: []

| d87a9f279d731ddc000000000000009a | driver.queue.scheduler-late | 531.086 | none | 1 / 32 |
| d87a9f279d731ddc000000000000009a | driver.queue.scheduler-dispatch | 0.156 | none | 1 / 32 |

Observed active steps while trace d87a9f279d731ddc000000000000009a waited: []

| d87a9f279d731ddc0000000000000138 | driver.queue.scheduler-late | 0.797 | none | 0 / 32 |
| d87a9f279d731ddc0000000000000138 | driver.queue.scheduler-dispatch | 0.218 | none | 0 / 32 |

Observed active steps while trace d87a9f279d731ddc0000000000000138 waited: []

## Writer stacks during late scheduler offers

Sample points are verified against two guest boot-clock brackets. Counts are samples, not continuous CPU time. Gaps over 3 ms are unknown execution state; they are not charged to the sampled function.

| trace | phase | late ms | samples | top sampled functions | long gaps |
| --- | --- | ---: | ---: | --- | ---: |
| d87a9f279d731ddc0000000000000099 | outside-phases | 1778.453 | 1350 | (idle) (1306); (program) (17); (anonymous) (5); snapshot (4); processTimers (3); peek (2); validateTagged (1); listOnTimeout (1) | 43 |
| d87a9f279d731ddc000000000000009a | outside-phases | 531.086 | 438 | (idle) (413); (program) (7); (anonymous) (5); peek (2); postMessage (1); engineSampler (1); promiseInitHook (1); normalize (1) | 8 |

## P2 / outside-phases / commit (18 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 57.308 | 0.947 | 0.000 | 2.334 | 8.510 | 0.065 | 0.000 | 0.413 | 2.346 | 8.985 | 0.204 | n/a | 1.388 | 31.229 | n/a | n/a | 0.090 | 10.653 | 0.164 | 0.090 |
| p99 | 1880.011 | 5.623 | 0.910 | 7.738 | 20.014 | 19.150 | 1.018 | 1778.746 | 21.172 | 31.030 | 12.895 | n/a | 12.233 | 294.584 | n/a | n/a | 1.118 | 1798.806 | 0.957 | 1.118 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc0000000000000099 | 1880.011 | 20.014 | 0.046 | 0.000 | 1778.746 | 2.613 | 21.173 | 5.651 | n/a | 0.924 | 49.725 | n/a | n/a | 1.118 | 1798.806 | 0.957 | 1.118 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| d87a9f279d731ddc000000000000009a | 641.991 | 14.179 | 0.238 | 0.000 | 531.242 | 12.930 | 10.891 | 12.895 | n/a | 2.903 | 56.598 | n/a | n/a | 0.117 | 545.659 | 0.850 | 0.117 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 4.177ms; driver.expected-state.bind-receipt 2.089ms |
| d87a9f279d731ddc0000000000000128 | 342.586 | 12.299 | 0.527 | 0.869 | 0.289 | 5.316 | 12.216 | 4.194 | n/a | 12.233 | 294.584 | n/a | n/a | 0.059 | 13.984 | 0.041 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.107ms |
| d87a9f279d731ddc0000000000000127 | 183.406 | 10.421 | 0.008 | 0.000 | 0.956 | 1.477 | 11.010 | 0.239 | n/a | 1.530 | 157.642 | n/a | n/a | 0.124 | 11.385 | 0.062 | 0.124 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000ef | 112.776 | 9.912 | 0.389 | 0.932 | 0.101 | 2.939 | 31.030 | 0.229 | n/a | 0.523 | 66.644 | n/a | n/a | 0.076 | 11.334 | 0.101 | 0.076 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc000000000000015d | 94.946 | 7.777 | 19.150 | 0.000 | 3.611 | 4.249 | 21.147 | 0.204 | n/a | 3.638 | 35.026 | n/a | n/a | 0.144 | 30.538 | 0.322 | 0.144 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000121 | 77.681 | 8.207 | 0.326 | 1.018 | 0.087 | 21.172 | 8.985 | 0.347 | n/a | 0.689 | 36.759 | n/a | n/a | 0.090 | 9.638 | 0.124 | 0.090 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000155 | 77.592 | 17.019 | 0.519 | 0.000 | 0.413 | 6.707 | 9.887 | 3.557 | n/a | 5.936 | 33.450 | n/a | n/a | 0.104 | 17.951 | 0.231 | 0.104 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000f0 | 59.240 | 8.510 | 0.006 | 0.000 | 1.172 | 1.576 | 11.145 | 0.840 | n/a | 1.737 | 34.158 | n/a | n/a | 0.096 | 9.687 | 0.164 | 0.096 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc000000000000015b | 57.308 | 11.451 | 0.065 | 0.000 | 0.554 | 1.631 | 6.814 | 0.167 | n/a | 5.264 | 31.229 | n/a | n/a | 0.134 | 12.070 | 0.211 | 0.134 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc000000000000015f | 48.438 | 6.010 | 0.419 | 0.000 | 0.093 | 2.984 | 18.718 | 0.090 | n/a | 1.196 | 18.860 | n/a | n/a | 0.067 | 6.522 | 0.135 | 0.067 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc000000000000011c | 46.250 | 10.344 | 0.011 | 0.000 | 0.705 | 1.182 | 5.386 | 0.092 | n/a | 1.051 | 27.288 | n/a | n/a | 0.192 | 11.060 | 0.239 | 0.192 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000125 | 43.493 | 6.380 | 0.326 | 0.000 | 0.119 | 2.745 | 3.237 | 0.079 | n/a | 7.664 | 22.836 | n/a | n/a | 0.105 | 6.825 | 0.157 | 0.105 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000122 | 42.850 | 4.996 | 0.007 | 0.000 | 0.762 | 1.615 | 2.772 | 3.917 | n/a | 0.881 | 27.842 | n/a | n/a | 0.059 | 5.764 | 0.135 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc000000000000011f | 40.389 | 10.251 | 0.305 | 0.000 | 0.097 | 2.346 | 7.671 | 0.143 | n/a | 1.388 | 18.131 | n/a | n/a | 0.058 | 10.653 | 0.264 | 0.058 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000f4 | 34.566 | 5.527 | 0.007 | 0.000 | 0.366 | 1.496 | 6.586 | 0.064 | n/a | 0.417 | 20.014 | n/a | n/a | 0.089 | 5.900 | 0.171 | 0.089 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000156 | 34.530 | 7.210 | 0.016 | 0.000 | 0.968 | 1.331 | 1.578 | 0.051 | n/a | 3.142 | 20.157 | n/a | n/a | 0.076 | 8.194 | 0.237 | 0.076 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000158 | 27.955 | 4.266 | 0.009 | 0.000 | 0.121 | 1.420 | 1.770 | 0.047 | n/a | 0.265 | 20.007 | n/a | n/a | 0.050 | 4.396 | 0.157 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.566 | 1.557 | 0.000 | 2.751 | 5.527 | 0.009 | 0.000 | 0.762 | 1.496 | 2.772 | 0.064 | n/a | 0.881 | 20.157 | n/a | n/a | 0.076 | 5.900 | 0.171 | 0.076 |
| p99 | 641.991 | 2.118 | 0.018 | 2.881 | 14.179 | 0.238 | 0.000 | 531.242 | 12.930 | 10.891 | 12.895 | n/a | 3.142 | 56.598 | n/a | n/a | 0.117 | 545.659 | 0.850 | 0.117 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc000000000000009a | 641.991 | 14.179 | 0.238 | 0.000 | 531.242 | 12.930 | 10.891 | 12.895 | n/a | 2.903 | 56.598 | n/a | n/a | 0.117 | 545.659 | 0.850 | 0.117 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 4.177ms; driver.expected-state.bind-receipt 2.089ms |
| d87a9f279d731ddc0000000000000122 | 42.850 | 4.996 | 0.007 | 0.000 | 0.762 | 1.615 | 2.772 | 3.917 | n/a | 0.881 | 27.842 | n/a | n/a | 0.059 | 5.764 | 0.135 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000f4 | 34.566 | 5.527 | 0.007 | 0.000 | 0.366 | 1.496 | 6.586 | 0.064 | n/a | 0.417 | 20.014 | n/a | n/a | 0.089 | 5.900 | 0.171 | 0.089 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000156 | 34.530 | 7.210 | 0.016 | 0.000 | 0.968 | 1.331 | 1.578 | 0.051 | n/a | 3.142 | 20.157 | n/a | n/a | 0.076 | 8.194 | 0.237 | 0.076 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000158 | 27.955 | 4.266 | 0.009 | 0.000 | 0.121 | 1.420 | 1.770 | 0.047 | n/a | 0.265 | 20.007 | n/a | n/a | 0.050 | 4.396 | 0.157 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.150 | n/a | n/a | n/a | 18.744 | 6.581 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.028 | 23.134 | 0.998 | 0.028 |
| p99 | 279.621 | n/a | n/a | n/a | 73.998 | 153.234 | 6.698 | 0.000 | 6.046 | 177.774 | 0.136 | n/a | 0.305 | 0.000 | n/a | n/a | 60.533 | 165.367 | 1.000 | 60.533 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000dc | 279.621 | 56.135 | 36.930 | 6.698 | 0.000 | 1.861 | 177.774 | 0.017 | n/a | 0.128 | 0.000 | n/a | n/a | 0.079 | 99.763 | 0.357 | 0.079 | gw-w/thread-48/gateway.admitted-work | none observed |
| d87a9f279d731ddc000000000000009b | 183.500 | 73.998 | 37.215 | 0.000 | 0.000 | 5.469 | 66.331 | 0.136 | n/a | 0.305 | 0.000 | n/a | n/a | 0.047 | 111.213 | 0.606 | 0.047 | gw-w/thread-45/gateway.admitted-work | driver.publication 1.697ms |
| d87a9f279d731ddc000000000000011e | 165.393 | 12.133 | 153.234 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 165.367 | 1.000 | 0.026 | node-14/thread-0/rpc.replica.observe | none observed |
| d87a9f279d731ddc00000000000000cf | 147.028 | 20.308 | 3.892 | 0.000 | 0.000 | 6.046 | 116.709 | 0.016 | n/a | 0.043 | 0.000 | n/a | n/a | 0.014 | 24.200 | 0.165 | 0.014 | gw-w/thread-49/gateway.admitted-work | driver.publication 2.365ms |
| d87a9f279d731ddc0000000000000129 | 135.425 | 23.821 | 6.581 | 0.000 | 0.000 | 1.389 | 103.524 | 0.012 | n/a | 0.038 | 0.000 | n/a | n/a | 0.061 | 30.401 | 0.224 | 0.061 | gw-w/thread-44/gateway.admitted-work | none observed |
| d87a9f279d731ddc0000000000000115 | 97.844 | 25.734 | 7.806 | 3.224 | 0.000 | 0.546 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 60.533 | 36.765 | 0.376 | 60.533 | node-14/thread-0/socket.wait-first-byte | client.encode 3.470ms |
| d87a9f279d731ddc00000000000000f1 | 62.868 | 18.744 | 2.063 | 0.000 | 0.000 | 1.058 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.003 | 20.807 | 0.331 | 41.003 | node-14/thread-0/socket.wait-first-byte | none observed |
| d87a9f279d731ddc000000000000015c | 56.171 | 3.578 | 52.571 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 56.149 | 1.000 | 0.022 | node-14/thread-0/rpc.replica.observe | none observed |
| d87a9f279d731ddc000000000000009c | 46.945 | 44.483 | 2.424 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.038 | 46.907 | 0.999 | 0.038 | node-14/thread-2/replica.pull-at | none observed |
| d87a9f279d731ddc000000000000013a | 30.350 | 11.836 | 13.547 | 0.000 | 0.000 | 0.438 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.530 | 25.383 | 0.836 | 4.530 | node-14/thread-0/rpc.replica.observe | none observed |
| d87a9f279d731ddc00000000000000fd | 25.150 | 24.677 | 0.457 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 25.134 | 0.999 | 0.017 | node-14/thread-2/replica.pull-at | none observed |
| d87a9f279d731ddc0000000000000144 | 23.151 | 17.922 | 5.212 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 23.134 | 0.999 | 0.017 | node-14/thread-2/replica.pull-at | none observed |
| d87a9f279d731ddc000000000000012d | 21.813 | 0.509 | 21.281 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 21.790 | 0.999 | 0.023 | node-14/thread-0/rpc.replica.observe | none observed |
| d87a9f279d731ddc000000000000016e | 21.689 | 19.034 | 2.636 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 21.670 | 0.999 | 0.019 | node-14/thread-2/replica.pull-at | driver.worker-message 1.029ms |
| d87a9f279d731ddc00000000000000e8 | 20.864 | 19.755 | 0.140 | 0.934 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.036 | 20.829 | 0.998 | 0.036 | node-14/thread-2/replica.pull-at | none observed |
| d87a9f279d731ddc00000000000000a7 | 20.694 | 19.914 | 0.747 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.033 | 20.661 | 0.998 | 0.033 | node-14/thread-2/replica.pull-at | none observed |
| d87a9f279d731ddc00000000000000a4 | 20.166 | 2.513 | 17.625 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.028 | 20.138 | 0.999 | 0.028 | node-14/thread-0/rpc.replica.observe | none observed |
| d87a9f279d731ddc0000000000000170 | 18.006 | 0.735 | 17.240 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.031 | 17.975 | 0.998 | 0.031 | node-14/thread-0/rpc.replica.observe | none observed |
| d87a9f279d731ddc000000000000016a | 15.557 | 0.244 | 15.292 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 15.536 | 0.999 | 0.021 | node-14/thread-0/rpc.replica.observe | none observed |
| d87a9f279d731ddc00000000000000f5 | 15.497 | 14.341 | 1.140 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 15.481 | 0.999 | 0.016 | node-14/thread-2/replica.pull-at | none observed |

## P2 / warmup / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 56.916 | 1.390 | 0.000 | 2.775 | 12.762 | 0.053 | 0.000 | 0.717 | 2.101 | 10.334 | 0.182 | n/a | 1.159 | 21.452 | n/a | n/a | 0.121 | 13.799 | 0.254 | 0.121 |
| p99 | 88.392 | 2.639 | 0.008 | 4.025 | 51.198 | 1.986 | 0.000 | 1.132 | 6.509 | 12.863 | 0.279 | n/a | 6.083 | 32.153 | n/a | n/a | 0.430 | 53.407 | 0.604 | 0.430 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000a1 | 88.392 | 51.198 | 1.986 | 0.000 | 0.223 | 6.509 | 12.863 | 0.132 | n/a | 1.635 | 13.742 | n/a | n/a | 0.103 | 53.407 | 0.604 | 0.103 | node-14/thread-8/client.validation-and-staging | driver.worker-message 3.741ms |
| d87a9f279d731ddc00000000000000a5 | 63.823 | 12.762 | 0.009 | 0.000 | 1.027 | 2.101 | 9.202 | 0.257 | n/a | 6.083 | 32.153 | n/a | n/a | 0.228 | 13.799 | 0.216 | 0.228 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000a6 | 56.916 | 13.276 | 0.867 | 0.000 | 0.296 | 4.410 | 11.477 | 0.279 | n/a | 0.336 | 25.854 | n/a | n/a | 0.121 | 14.440 | 0.254 | 0.121 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.682ms; driver.expected-state.bind-receipt 1.033ms |
| d87a9f279d731ddc00000000000000a3 | 37.406 | 9.584 | 0.008 | 0.000 | 0.717 | 1.301 | 2.654 | 0.099 | n/a | 1.159 | 21.452 | n/a | n/a | 0.430 | 10.310 | 0.276 | 0.430 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc000000000000009f | 35.635 | 6.044 | 0.053 | 0.000 | 1.132 | 1.780 | 10.334 | 0.182 | n/a | 0.505 | 15.548 | n/a | n/a | 0.057 | 7.229 | 0.203 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.635 | 1.390 | 0.000 | 2.775 | 6.044 | 0.008 | 0.000 | 0.717 | 1.301 | 2.654 | 0.099 | n/a | 0.505 | 15.548 | n/a | n/a | 0.057 | 7.229 | 0.203 | 0.057 |
| p99 | 37.406 | 1.459 | 0.000 | 2.959 | 9.584 | 0.053 | 0.000 | 1.132 | 1.780 | 10.334 | 0.182 | n/a | 1.159 | 21.452 | n/a | n/a | 0.430 | 10.310 | 0.276 | 0.430 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000a3 | 37.406 | 9.584 | 0.008 | 0.000 | 0.717 | 1.301 | 2.654 | 0.099 | n/a | 1.159 | 21.452 | n/a | n/a | 0.430 | 10.310 | 0.276 | 0.430 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc000000000000009f | 35.635 | 6.044 | 0.053 | 0.000 | 1.132 | 1.780 | 10.334 | 0.182 | n/a | 0.505 | 15.548 | n/a | n/a | 0.057 | 7.229 | 0.203 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 42.062 | 0.387 | 0.000 | 0.975 | 11.804 | 0.439 | 0.000 | 0.192 | 3.745 | 3.399 | 0.072 | n/a | 1.703 | 16.641 | n/a | n/a | 0.069 | 12.443 | 0.295 | 0.069 |
| p99 | 50.856 | 2.587 | 0.020 | 4.019 | 12.166 | 2.656 | 0.000 | 0.624 | 4.852 | 8.337 | 0.269 | n/a | 5.608 | 23.030 | n/a | n/a | 0.136 | 15.014 | 0.296 | 0.136 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000ad | 50.856 | 12.166 | 2.656 | 0.000 | 0.192 | 4.852 | 8.337 | 0.269 | n/a | 5.608 | 16.641 | n/a | n/a | 0.136 | 15.014 | 0.295 | 0.136 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000ab | 42.062 | 11.804 | 0.015 | 0.000 | 0.624 | 1.371 | 3.399 | 0.051 | n/a | 1.703 | 23.030 | n/a | n/a | 0.065 | 12.443 | 0.296 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000a9 | 22.720 | 6.083 | 0.439 | 0.000 | 0.090 | 3.745 | 3.055 | 0.072 | n/a | 1.057 | 8.110 | n/a | n/a | 0.069 | 6.612 | 0.291 | 0.069 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 48.226 | 1.511 | 0.000 | 1.706 | 16.890 | 0.344 | 0.000 | 0.079 | 3.483 | 4.088 | 0.125 | n/a | 1.031 | 18.855 | n/a | n/a | 0.077 | 17.951 | 0.295 | 0.077 |
| p99 | 74.502 | 3.846 | 1.782 | 6.710 | 21.172 | 0.376 | 0.000 | 1.035 | 4.813 | 4.925 | 0.144 | n/a | 3.791 | 41.919 | n/a | n/a | 0.115 | 21.593 | 0.372 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000b4 | 74.502 | 21.172 | 0.344 | 0.000 | 0.077 | 4.813 | 4.925 | 0.144 | n/a | 1.031 | 41.919 | n/a | n/a | 0.077 | 21.593 | 0.290 | 0.077 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000ae | 48.226 | 16.890 | 0.026 | 0.000 | 1.035 | 3.483 | 4.088 | 0.125 | n/a | 3.791 | 18.672 | n/a | n/a | 0.115 | 17.951 | 0.372 | 0.115 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000b1 | 36.535 | 10.311 | 0.376 | 0.000 | 0.079 | 2.418 | 3.378 | 0.065 | n/a | 1.002 | 18.855 | n/a | n/a | 0.050 | 10.766 | 0.295 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 115.759 | 0.814 | 0.000 | 1.006 | 12.397 | 0.020 | 0.000 | 0.150 | 4.591 | 11.970 | 0.194 | n/a | 4.064 | 84.417 | n/a | n/a | 0.084 | 14.484 | 0.110 | 0.084 |
| p99 | 193.870 | 3.372 | 0.004 | 6.952 | 15.127 | 0.445 | 1.661 | 0.991 | 9.404 | 16.370 | 1.437 | n/a | 12.781 | 155.012 | n/a | n/a | 0.227 | 15.650 | 0.132 | 0.227 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000bd | 193.870 | 14.130 | 0.445 | 0.000 | 0.150 | 4.707 | 16.370 | 1.437 | n/a | 1.534 | 155.012 | n/a | n/a | 0.084 | 14.726 | 0.076 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.worker-message 0.979ms; driver.worker-message 0.846ms; driver.worker-message 0.531ms |
| d87a9f279d731ddc00000000000000b8 | 142.706 | 15.127 | 0.418 | 0.000 | 0.104 | 9.404 | 13.146 | 0.197 | n/a | 12.781 | 91.482 | n/a | n/a | 0.047 | 15.650 | 0.110 | 0.047 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | client.encode 2.216ms |
| d87a9f279d731ddc00000000000000ba | 115.759 | 12.397 | 0.010 | 1.661 | 0.416 | 2.255 | 10.119 | 0.193 | n/a | 4.064 | 84.417 | n/a | n/a | 0.227 | 14.484 | 0.125 | 0.227 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000b6 | 74.702 | 8.841 | 0.020 | 0.000 | 0.991 | 4.591 | 11.970 | 0.194 | n/a | 6.382 | 41.617 | n/a | n/a | 0.096 | 9.852 | 0.132 | 0.096 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 74.702 | 1.477 | 0.000 | 3.374 | 8.841 | 0.010 | 0.000 | 0.416 | 2.255 | 10.119 | 0.193 | n/a | 4.064 | 41.617 | n/a | n/a | 0.096 | 9.852 | 0.125 | 0.096 |
| p99 | 115.759 | 3.372 | 0.004 | 6.952 | 12.397 | 0.020 | 1.661 | 0.991 | 4.591 | 11.970 | 0.194 | n/a | 6.382 | 84.417 | n/a | n/a | 0.227 | 14.484 | 0.132 | 0.227 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000ba | 115.759 | 12.397 | 0.010 | 1.661 | 0.416 | 2.255 | 10.119 | 0.193 | n/a | 4.064 | 84.417 | n/a | n/a | 0.227 | 14.484 | 0.125 | 0.227 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000b6 | 74.702 | 8.841 | 0.020 | 0.000 | 0.991 | 4.591 | 11.970 | 0.194 | n/a | 6.382 | 41.617 | n/a | n/a | 0.096 | 9.852 | 0.132 | 0.096 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 67.757 | 1.466 | 0.034 | 2.692 | 11.180 | 0.014 | 0.818 | 0.337 | 3.724 | 5.398 | 0.122 | n/a | 1.772 | 40.834 | n/a | n/a | 0.082 | 15.453 | 0.228 | 0.082 |
| p99 | 79.530 | 4.112 | 1.612 | 7.776 | 15.795 | 0.837 | 4.530 | 1.716 | 6.086 | 18.177 | 0.286 | n/a | 2.389 | 45.774 | n/a | n/a | 0.452 | 17.794 | 0.289 | 0.452 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000c7 | 79.530 | 11.180 | 0.014 | 0.000 | 0.343 | 5.561 | 18.177 | 0.258 | n/a | 1.831 | 42.085 | n/a | n/a | 0.079 | 11.538 | 0.145 | 0.079 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000c6 | 77.966 | 15.795 | 0.837 | 0.991 | 0.171 | 6.086 | 7.267 | 0.286 | n/a | 0.678 | 45.774 | n/a | n/a | 0.082 | 17.794 | 0.228 | 0.082 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000c1 | 67.757 | 14.218 | 0.247 | 0.818 | 0.169 | 3.724 | 4.821 | 0.084 | n/a | 2.389 | 40.834 | n/a | n/a | 0.452 | 15.453 | 0.228 | 0.452 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000be | 55.160 | 11.073 | 0.010 | 4.530 | 0.337 | 1.972 | 5.398 | 0.055 | n/a | 1.180 | 30.514 | n/a | n/a | 0.093 | 15.949 | 0.289 | 0.093 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000c3 | 44.354 | 9.947 | 0.012 | 0.000 | 1.716 | 0.935 | 1.894 | 0.122 | n/a | 1.772 | 27.905 | n/a | n/a | 0.051 | 11.676 | 0.263 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 44.354 | 1.466 | 0.034 | 2.692 | 9.947 | 0.012 | 0.000 | 0.343 | 0.935 | 1.894 | 0.122 | n/a | 1.772 | 27.905 | n/a | n/a | 0.051 | 11.538 | 0.145 | 0.051 |
| p99 | 79.530 | 1.613 | 0.710 | 6.069 | 11.180 | 0.014 | 0.000 | 1.716 | 5.561 | 18.177 | 0.258 | n/a | 1.831 | 42.085 | n/a | n/a | 0.079 | 11.676 | 0.263 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000c7 | 79.530 | 11.180 | 0.014 | 0.000 | 0.343 | 5.561 | 18.177 | 0.258 | n/a | 1.831 | 42.085 | n/a | n/a | 0.079 | 11.538 | 0.145 | 0.079 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000c3 | 44.354 | 9.947 | 0.012 | 0.000 | 1.716 | 0.935 | 1.894 | 0.122 | n/a | 1.772 | 27.905 | n/a | n/a | 0.051 | 11.676 | 0.263 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 156.188 | 0.514 | 0.000 | 0.857 | 6.925 | 0.016 | 0.000 | 0.141 | 2.651 | 5.517 | 0.138 | n/a | 4.161 | 66.913 | n/a | n/a | 0.046 | 11.388 | 0.181 | 0.046 |
| p99 | 464.379 | 2.054 | 0.000 | 3.600 | 27.528 | 0.261 | 0.563 | 189.046 | 6.781 | 70.093 | 0.234 | n/a | 8.719 | 381.337 | n/a | n/a | 0.092 | 195.713 | 0.689 | 0.092 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000cc | 464.379 | 6.925 | 0.016 | 0.000 | 0.462 | 1.258 | 70.093 | 0.081 | n/a | 4.161 | 381.337 | n/a | n/a | 0.046 | 7.403 | 0.016 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000ce | 283.903 | 6.659 | 0.007 | 0.000 | 189.046 | 6.781 | 5.517 | 0.138 | n/a | 7.841 | 67.864 | n/a | n/a | 0.050 | 195.713 | 0.689 | 0.050 | node-14/thread-0/driver.queue.subject | driver.publication 1.585ms |
| d87a9f279d731ddc00000000000000d2 | 156.188 | 27.528 | 0.261 | 0.381 | 0.141 | 4.350 | 47.568 | 0.234 | n/a | 8.719 | 66.913 | n/a | n/a | 0.092 | 28.312 | 0.181 | 0.092 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000ca | 34.148 | 10.547 | 0.185 | 0.563 | 0.093 | 2.651 | 3.559 | 0.150 | n/a | 0.546 | 15.810 | n/a | n/a | 0.043 | 11.388 | 0.333 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.worker-message 1.358ms; driver.worker-message 0.648ms |

## P2 / L64 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 283.903 | 0.766 | 0.000 | 2.148 | 6.659 | 0.007 | 0.000 | 0.462 | 1.258 | 5.517 | 0.081 | n/a | 4.161 | 67.864 | n/a | n/a | 0.046 | 7.403 | 0.016 | 0.046 |
| p99 | 464.379 | 2.054 | 0.000 | 3.600 | 6.925 | 0.016 | 0.000 | 189.046 | 6.781 | 70.093 | 0.138 | n/a | 7.841 | 381.337 | n/a | n/a | 0.050 | 195.713 | 0.689 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000cc | 464.379 | 6.925 | 0.016 | 0.000 | 0.462 | 1.258 | 70.093 | 0.081 | n/a | 4.161 | 381.337 | n/a | n/a | 0.046 | 7.403 | 0.016 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000ce | 283.903 | 6.659 | 0.007 | 0.000 | 189.046 | 6.781 | 5.517 | 0.138 | n/a | 7.841 | 67.864 | n/a | n/a | 0.050 | 195.713 | 0.689 | 0.050 | node-14/thread-0/driver.queue.subject | driver.publication 1.585ms |

## P2 / L256 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 325.571 | 0.000 | 0.000 | 0.421 | 17.510 | 1.143 | 4.044 | 0.163 | 4.515 | 59.952 | 0.310 | n/a | 1.057 | 208.011 | n/a | n/a | 0.057 | 22.888 | 0.070 | 0.057 |
| p99 | 327.443 | 0.868 | 0.000 | 0.771 | 20.517 | 5.751 | 4.072 | 0.166 | 6.339 | 81.142 | 0.694 | n/a | 13.261 | 224.192 | n/a | n/a | 0.116 | 30.478 | 0.094 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000d7 | 327.443 | 17.510 | 1.143 | 4.072 | 0.163 | 6.339 | 59.952 | 0.694 | n/a | 13.261 | 224.192 | n/a | n/a | 0.116 | 22.888 | 0.070 | 0.116 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.worker-message 2.205ms; driver.worker-message 1.188ms; driver.worker-message 1.019ms; driver.worker-message 0.566ms |
| d87a9f279d731ddc00000000000000d4 | 325.571 | 20.517 | 5.751 | 4.044 | 0.166 | 4.515 | 81.142 | 0.310 | n/a | 1.057 | 208.011 | n/a | n/a | 0.057 | 30.478 | 0.094 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.worker-message 2.004ms |

## P2 / L1024 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 239.809 | 1.052 | 0.000 | 0.897 | 18.200 | 0.082 | 0.000 | 0.377 | 4.787 | 32.529 | 0.226 | n/a | 1.351 | 164.807 | n/a | n/a | 0.102 | 19.066 | 0.144 | 0.102 |
| p99 | 283.826 | 3.900 | 2.032 | 10.498 | 26.816 | 4.362 | 5.868 | 0.803 | 21.524 | 67.841 | 8.743 | n/a | 7.333 | 219.048 | n/a | n/a | 0.601 | 34.603 | 0.191 | 0.601 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000d9 | 283.826 | 12.184 | 0.420 | 0.000 | 0.123 | 2.750 | 45.333 | 3.394 | n/a | 1.275 | 218.247 | n/a | n/a | 0.102 | 12.726 | 0.045 | 0.102 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000da | 255.034 | 10.815 | 0.009 | 0.000 | 0.377 | 1.304 | 13.593 | 8.743 | n/a | 0.985 | 219.048 | n/a | n/a | 0.160 | 11.201 | 0.044 | 0.160 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000e2 | 239.809 | 24.295 | 4.362 | 5.868 | 0.078 | 4.787 | 32.529 | 0.185 | n/a | 2.831 | 164.807 | n/a | n/a | 0.067 | 34.603 | 0.144 | 0.067 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | client.encode 2.879ms; driver.worker-message 1.844ms; driver.worker-message 0.543ms |
| d87a9f279d731ddc00000000000000e1 | 144.563 | 26.816 | 0.020 | 0.000 | 0.803 | 21.524 | 67.841 | 0.226 | n/a | 1.351 | 25.381 | n/a | n/a | 0.601 | 27.639 | 0.191 | 0.601 | gw-w/thread-47/gateway.admitted-work | driver.worker-message 1.844ms |
| d87a9f279d731ddc00000000000000de | 123.076 | 18.200 | 0.082 | 0.000 | 0.784 | 7.145 | 4.490 | 0.178 | n/a | 7.333 | 84.779 | n/a | n/a | 0.084 | 19.066 | 0.155 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | client.parse 1.078ms |

## P2 / L1024 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 123.076 | 1.052 | 0.585 | 0.614 | 18.200 | 0.020 | 0.000 | 0.784 | 7.145 | 4.490 | 0.178 | n/a | 1.351 | 25.381 | n/a | n/a | 0.084 | 19.066 | 0.155 | 0.084 |
| p99 | 144.563 | 3.900 | 2.032 | 10.498 | 26.816 | 0.082 | 0.000 | 0.803 | 21.524 | 67.841 | 0.226 | n/a | 7.333 | 84.779 | n/a | n/a | 0.601 | 27.639 | 0.191 | 0.601 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000e1 | 144.563 | 26.816 | 0.020 | 0.000 | 0.803 | 21.524 | 67.841 | 0.226 | n/a | 1.351 | 25.381 | n/a | n/a | 0.601 | 27.639 | 0.191 | 0.601 | gw-w/thread-47/gateway.admitted-work | driver.worker-message 1.844ms |
| d87a9f279d731ddc00000000000000de | 123.076 | 18.200 | 0.082 | 0.000 | 0.784 | 7.145 | 4.490 | 0.178 | n/a | 7.333 | 84.779 | n/a | n/a | 0.084 | 19.066 | 0.155 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | client.parse 1.078ms |

## P2 / recovery / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 78.475 | 1.002 | 0.000 | 1.121 | 10.827 | 0.111 | 0.000 | 0.108 | 2.557 | 22.016 | 0.236 | n/a | 2.173 | 39.006 | n/a | n/a | 0.082 | 12.405 | 0.158 | 0.082 |
| p99 | 128.364 | 1.930 | 0.000 | 2.000 | 24.296 | 0.589 | 0.882 | 0.167 | 2.946 | 43.409 | 0.241 | n/a | 3.267 | 53.797 | n/a | n/a | 0.130 | 24.574 | 0.191 | 0.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000e4 | 128.364 | 24.296 | 0.111 | 0.000 | 0.167 | 2.946 | 43.409 | 0.241 | n/a | 3.267 | 53.797 | n/a | n/a | 0.130 | 24.574 | 0.191 | 0.130 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.worker-message 1.552ms; driver.worker-message 0.583ms |
| d87a9f279d731ddc00000000000000e6 | 78.475 | 10.827 | 0.589 | 0.882 | 0.108 | 2.557 | 22.016 | 0.236 | n/a | 2.173 | 39.006 | n/a | n/a | 0.082 | 12.405 | 0.158 | 0.082 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 69.997 | 1.412 | 0.000 | 3.426 | 15.858 | 0.261 | 0.000 | 0.144 | 3.451 | 14.451 | 0.078 | n/a | 1.290 | 29.843 | n/a | n/a | 0.083 | 17.129 | 0.226 | 0.083 |
| p99 | 75.663 | 2.120 | 1.972 | 6.521 | 19.159 | 0.387 | 0.866 | 0.306 | 8.006 | 16.057 | 0.092 | n/a | 1.621 | 51.189 | n/a | n/a | 0.107 | 19.480 | 0.278 | 0.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000ec | 75.663 | 15.858 | 0.261 | 0.866 | 0.144 | 1.809 | 4.085 | 0.078 | n/a | 1.290 | 51.189 | n/a | n/a | 0.083 | 17.129 | 0.226 | 0.083 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000e7 | 69.997 | 19.159 | 0.015 | 0.000 | 0.306 | 3.451 | 16.057 | 0.092 | n/a | 0.966 | 29.843 | n/a | n/a | 0.107 | 19.480 | 0.278 | 0.107 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000ea | 50.562 | 5.818 | 0.387 | 0.000 | 0.137 | 8.006 | 14.451 | 0.067 | n/a | 1.621 | 20.002 | n/a | n/a | 0.072 | 6.343 | 0.125 | 0.072 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 69.199 | 1.383 | 0.008 | 2.547 | 10.863 | 0.020 | 0.000 | 0.213 | 3.113 | 4.786 | 0.161 | n/a | 0.525 | 29.658 | n/a | n/a | 0.084 | 12.476 | 0.232 | 0.084 |
| p99 | 167.080 | 5.093 | 2.846 | 9.616 | 19.133 | 1.928 | 0.927 | 2.187 | 5.836 | 47.271 | 0.285 | n/a | 1.636 | 105.915 | n/a | n/a | 0.292 | 20.537 | 0.409 | 0.292 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000f6 | 167.080 | 7.897 | 0.285 | 0.927 | 0.094 | 3.832 | 47.271 | 0.285 | n/a | 0.525 | 105.915 | n/a | n/a | 0.050 | 9.202 | 0.055 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000f9 | 72.279 | 17.736 | 0.020 | 0.000 | 2.187 | 1.766 | 7.201 | 0.161 | n/a | 1.267 | 41.649 | n/a | n/a | 0.292 | 19.943 | 0.276 | 0.292 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000fb | 72.045 | 19.133 | 0.015 | 0.000 | 1.390 | 2.534 | 3.796 | 0.087 | n/a | 1.636 | 43.379 | n/a | n/a | 0.075 | 20.537 | 0.285 | 0.075 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000fe | 69.199 | 10.863 | 1.150 | 0.343 | 0.121 | 5.836 | 20.564 | 0.163 | n/a | 0.333 | 29.658 | n/a | n/a | 0.168 | 12.476 | 0.180 | 0.168 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000f8 | 40.762 | 13.961 | 1.928 | 0.562 | 0.213 | 3.113 | 4.786 | 0.166 | n/a | 0.845 | 15.104 | n/a | n/a | 0.084 | 16.664 | 0.409 | 0.084 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000101 | 34.293 | 7.054 | 0.007 | 0.000 | 0.884 | 4.804 | 2.073 | 0.079 | n/a | 0.521 | 18.798 | n/a | n/a | 0.074 | 7.944 | 0.232 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc00000000000000ff | 31.503 | 6.193 | 0.011 | 0.000 | 0.184 | 1.455 | 3.756 | 0.073 | n/a | 0.316 | 19.429 | n/a | n/a | 0.086 | 6.388 | 0.203 | 0.086 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.503 | 1.160 | 0.023 | 2.547 | 6.193 | 0.011 | 0.000 | 0.184 | 1.455 | 3.756 | 0.073 | n/a | 0.316 | 19.429 | n/a | n/a | 0.086 | 6.388 | 0.203 | 0.086 |
| p99 | 31.503 | 1.160 | 0.023 | 2.547 | 6.193 | 0.011 | 0.000 | 0.184 | 1.455 | 3.756 | 0.073 | n/a | 0.316 | 19.429 | n/a | n/a | 0.086 | 6.388 | 0.203 | 0.086 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc00000000000000ff | 31.503 | 6.193 | 0.011 | 0.000 | 0.184 | 1.455 | 3.756 | 0.073 | n/a | 0.316 | 19.429 | n/a | n/a | 0.086 | 6.388 | 0.203 | 0.086 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 88.107 | 1.327 | 0.000 | 2.576 | 8.296 | 0.018 | 0.000 | 0.896 | 3.400 | 4.671 | 0.135 | n/a | 0.558 | 42.031 | n/a | n/a | 0.082 | 9.398 | 0.110 | 0.082 |
| p99 | 937.454 | 2.647 | 0.122 | 4.175 | 9.971 | 34.962 | 0.614 | 2.183 | 77.121 | 22.881 | 10.058 | n/a | 7.663 | 858.156 | n/a | n/a | 0.237 | 45.035 | 0.253 | 0.237 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc0000000000000112 | 937.454 | 9.971 | 34.962 | 0.000 | 0.101 | 3.400 | 22.881 | 0.264 | n/a | 7.663 | 858.156 | n/a | n/a | 0.056 | 45.035 | 0.048 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.654ms |
| d87a9f279d731ddc0000000000000113 | 725.126 | 9.778 | 0.028 | 0.000 | 0.547 | 41.365 | 11.149 | 0.405 | n/a | 4.440 | 657.336 | n/a | n/a | 0.077 | 10.353 | 0.014 | 0.077 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000107 | 184.042 | 7.393 | 0.491 | 0.614 | 0.211 | 77.121 | 18.591 | 10.058 | n/a | 0.278 | 69.206 | n/a | n/a | 0.079 | 8.709 | 0.047 | 0.079 | node-14/thread-8/socket.wait-first-byte | none observed |
| d87a9f279d731ddc0000000000000108 | 101.274 | 6.288 | 0.007 | 0.000 | 2.183 | 62.846 | 1.560 | 0.068 | n/a | 0.286 | 27.948 | n/a | n/a | 0.088 | 8.478 | 0.084 | 0.088 | node-14/thread-0/socket.wait-first-byte | none observed |
| d87a9f279d731ddc0000000000000118 | 88.107 | 8.296 | 0.724 | 0.582 | 0.085 | 19.993 | 15.378 | 0.388 | n/a | 0.538 | 42.031 | n/a | n/a | 0.092 | 9.688 | 0.110 | 0.092 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc000000000000010e | 64.101 | 8.037 | 0.008 | 0.000 | 1.040 | 1.129 | 2.763 | 0.135 | n/a | 0.558 | 50.194 | n/a | n/a | 0.237 | 9.084 | 0.142 | 0.237 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc000000000000010b | 43.172 | 8.485 | 0.018 | 0.000 | 0.896 | 0.874 | 1.674 | 0.070 | n/a | 0.286 | 30.816 | n/a | n/a | 0.054 | 9.398 | 0.218 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.477ms |
| d87a9f279d731ddc0000000000000105 | 37.819 | 8.572 | 0.010 | 0.000 | 0.982 | 0.907 | 4.671 | 0.036 | n/a | 4.962 | 17.572 | n/a | n/a | 0.107 | 9.564 | 0.253 | 0.107 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc000000000000010a | 31.140 | 3.826 | 0.007 | 0.000 | 1.001 | 1.088 | 2.192 | 0.102 | n/a | 5.407 | 17.435 | n/a | n/a | 0.082 | 4.834 | 0.155 | 0.082 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.140 | 1.500 | 0.013 | 2.135 | 3.826 | 0.007 | 0.000 | 1.001 | 1.088 | 2.192 | 0.102 | n/a | 0.558 | 17.435 | n/a | n/a | 0.082 | 4.834 | 0.142 | 0.082 |
| p99 | 64.101 | 1.595 | 0.122 | 4.027 | 8.037 | 0.008 | 0.000 | 1.040 | 1.129 | 2.763 | 0.135 | n/a | 5.407 | 50.194 | n/a | n/a | 0.237 | 9.084 | 0.155 | 0.237 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc000000000000010e | 64.101 | 8.037 | 0.008 | 0.000 | 1.040 | 1.129 | 2.763 | 0.135 | n/a | 0.558 | 50.194 | n/a | n/a | 0.237 | 9.084 | 0.142 | 0.237 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc000000000000010a | 31.140 | 3.826 | 0.007 | 0.000 | 1.001 | 1.088 | 2.192 | 0.102 | n/a | 5.407 | 17.435 | n/a | n/a | 0.082 | 4.834 | 0.155 | 0.082 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 73.204 | 0.714 | 0.000 | 1.211 | 11.288 | 0.014 | 0.000 | 0.315 | 2.873 | 6.357 | 0.149 | n/a | 3.501 | 31.037 | n/a | n/a | 0.079 | 15.670 | 0.164 | 0.079 |
| p99 | 111.597 | 4.136 | 0.837 | 9.368 | 20.724 | 3.313 | 0.755 | 54.152 | 6.667 | 47.095 | 0.295 | n/a | 5.706 | 52.477 | n/a | n/a | 0.099 | 63.626 | 0.661 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc0000000000000132 | 111.597 | 11.288 | 3.313 | 0.755 | 0.315 | 4.639 | 47.095 | 0.091 | n/a | 3.626 | 40.396 | n/a | n/a | 0.079 | 15.670 | 0.140 | 0.079 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc000000000000012c | 96.197 | 9.464 | 0.010 | 0.000 | 54.152 | 6.667 | 6.091 | 0.200 | n/a | 4.302 | 15.237 | n/a | n/a | 0.074 | 63.626 | 0.661 | 0.074 | node-14/thread-0/driver.queue.subject | driver.publication 5.460ms; driver.expected-state.bind-receipt 3.209ms |
| d87a9f279d731ddc0000000000000130 | 95.872 | 15.270 | 0.292 | 0.000 | 0.151 | 3.066 | 22.487 | 0.295 | n/a | 1.754 | 52.477 | n/a | n/a | 0.081 | 15.712 | 0.164 | 0.081 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc000000000000012b | 73.204 | 20.724 | 0.012 | 0.000 | 0.974 | 2.652 | 6.357 | 0.162 | n/a | 3.501 | 38.736 | n/a | n/a | 0.087 | 21.710 | 0.297 | 0.087 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000136 | 63.800 | 8.404 | 0.671 | 0.000 | 0.129 | 2.873 | 14.731 | 0.149 | n/a | 5.706 | 31.037 | n/a | n/a | 0.099 | 9.204 | 0.144 | 0.099 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000133 | 45.072 | 12.249 | 0.014 | 0.000 | 0.928 | 2.460 | 2.976 | 0.098 | n/a | 3.306 | 22.993 | n/a | n/a | 0.048 | 13.191 | 0.293 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 45.072 | 1.780 | 0.000 | 4.439 | 9.464 | 0.010 | 0.000 | 0.928 | 2.460 | 2.976 | 0.098 | n/a | 3.306 | 15.237 | n/a | n/a | 0.048 | 13.191 | 0.293 | 0.048 |
| p99 | 96.197 | 2.780 | 0.082 | 7.305 | 12.249 | 0.014 | 0.000 | 54.152 | 6.667 | 6.091 | 0.200 | n/a | 4.302 | 22.993 | n/a | n/a | 0.074 | 63.626 | 0.661 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc000000000000012c | 96.197 | 9.464 | 0.010 | 0.000 | 54.152 | 6.667 | 6.091 | 0.200 | n/a | 4.302 | 15.237 | n/a | n/a | 0.074 | 63.626 | 0.661 | 0.074 | node-14/thread-0/driver.queue.subject | driver.publication 5.460ms; driver.expected-state.bind-receipt 3.209ms |
| d87a9f279d731ddc0000000000000133 | 45.072 | 12.249 | 0.014 | 0.000 | 0.928 | 2.460 | 2.976 | 0.098 | n/a | 3.306 | 22.993 | n/a | n/a | 0.048 | 13.191 | 0.293 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 95.545 | 0.723 | 0.000 | 2.103 | 9.320 | 1.060 | 0.000 | 0.551 | 4.036 | 2.957 | 0.097 | n/a | 3.288 | 35.510 | n/a | n/a | 0.074 | 21.668 | 0.216 | 0.074 |
| p99 | 470.728 | 2.648 | 0.053 | 5.837 | 20.393 | 70.589 | 1.738 | 5.191 | 15.995 | 36.926 | 0.149 | n/a | 8.453 | 457.530 | n/a | n/a | 0.111 | 84.793 | 0.694 | 0.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc0000000000000138 | 470.728 | 5.601 | 0.027 | 0.000 | 1.015 | 1.938 | 2.957 | 0.149 | n/a | 1.399 | 457.530 | n/a | n/a | 0.111 | 6.643 | 0.014 | 0.111 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000141 | 157.829 | 9.013 | 70.589 | 0.000 | 5.191 | 6.485 | 2.431 | 0.044 | n/a | 5.786 | 58.218 | n/a | n/a | 0.073 | 84.793 | 0.537 | 0.073 | node-14/thread-0/client.commit-send-queue | client.encode 6.043ms |
| d87a9f279d731ddc000000000000013d | 110.489 | 20.393 | 0.469 | 0.676 | 0.130 | 15.995 | 36.926 | 0.073 | n/a | 3.288 | 32.459 | n/a | n/a | 0.082 | 21.668 | 0.196 | 0.082 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc000000000000014f | 95.545 | 18.729 | 22.729 | 1.738 | 0.097 | 4.036 | 11.104 | 0.102 | n/a | 0.333 | 36.577 | n/a | n/a | 0.101 | 43.292 | 0.453 | 0.101 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000143 | 91.379 | 11.714 | 1.060 | 0.000 | 0.085 | 9.466 | 24.931 | 0.109 | n/a | 8.453 | 35.510 | n/a | n/a | 0.051 | 12.859 | 0.141 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.201ms; driver.expected-state.bind-receipt 1.060ms |
| d87a9f279d731ddc0000000000000148 | 79.784 | 5.824 | 48.724 | 0.000 | 0.793 | 0.935 | 2.125 | 0.097 | n/a | 3.382 | 17.864 | n/a | n/a | 0.040 | 55.342 | 0.694 | 0.040 | node-14/thread-0/client.commit-send-queue | client.encode 5.871ms |
| d87a9f279d731ddc0000000000000146 | 45.883 | 9.320 | 0.023 | 0.000 | 0.551 | 1.134 | 2.204 | 0.055 | n/a | 0.392 | 32.130 | n/a | n/a | 0.074 | 9.894 | 0.216 | 0.074 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 79.784 | 0.598 | 0.000 | 2.103 | 5.601 | 0.027 | 0.000 | 0.793 | 0.935 | 2.125 | 0.097 | n/a | 1.399 | 17.864 | n/a | n/a | 0.040 | 6.643 | 0.014 | 0.040 |
| p99 | 470.728 | 0.723 | 0.053 | 2.333 | 5.824 | 48.724 | 0.000 | 1.015 | 1.938 | 2.957 | 0.149 | n/a | 3.382 | 457.530 | n/a | n/a | 0.111 | 55.342 | 0.694 | 0.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc0000000000000138 | 470.728 | 5.601 | 0.027 | 0.000 | 1.015 | 1.938 | 2.957 | 0.149 | n/a | 1.399 | 457.530 | n/a | n/a | 0.111 | 6.643 | 0.014 | 0.111 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000148 | 79.784 | 5.824 | 48.724 | 0.000 | 0.793 | 0.935 | 2.125 | 0.097 | n/a | 3.382 | 17.864 | n/a | n/a | 0.040 | 55.342 | 0.694 | 0.040 | node-14/thread-0/client.commit-send-queue | client.encode 5.871ms |

## P4 / p4h10 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 54.148 | 0.597 | 0.000 | 0.593 | 6.646 | 0.269 | 0.000 | 0.096 | 2.361 | 12.238 | 0.125 | n/a | 0.593 | 29.667 | n/a | n/a | 0.061 | 7.291 | 0.168 | 0.061 |
| p99 | 145.644 | 2.425 | 0.000 | 3.246 | 9.732 | 0.553 | 0.000 | 0.632 | 3.411 | 16.945 | 0.182 | n/a | 3.750 | 116.653 | n/a | n/a | 0.080 | 10.262 | 0.189 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc0000000000000161 | 145.644 | 6.544 | 0.269 | 0.000 | 0.073 | 2.361 | 15.752 | 0.180 | n/a | 3.750 | 116.653 | n/a | n/a | 0.061 | 6.886 | 0.047 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000167 | 60.969 | 9.732 | 0.434 | 0.000 | 0.096 | 3.411 | 16.945 | 0.125 | n/a | 0.500 | 29.667 | n/a | n/a | 0.059 | 10.262 | 0.168 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000165 | 54.148 | 9.567 | 0.553 | 0.000 | 0.111 | 2.396 | 12.238 | 0.182 | n/a | 0.593 | 28.429 | n/a | n/a | 0.080 | 10.231 | 0.189 | 0.080 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000162 | 40.909 | 6.646 | 0.012 | 0.000 | 0.632 | 0.956 | 1.383 | 0.045 | n/a | 0.649 | 30.514 | n/a | n/a | 0.071 | 7.291 | 0.178 | 0.071 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 62.707 | 1.679 | 0.000 | 2.791 | 13.304 | 0.017 | 0.000 | 0.954 | 1.910 | 6.030 | 0.142 | n/a | 0.681 | 26.492 | n/a | n/a | 0.094 | 15.439 | 0.225 | 0.094 |
| p99 | 106.549 | 1.952 | 0.311 | 10.391 | 21.407 | 2.531 | 0.000 | 1.303 | 20.899 | 25.843 | 1.421 | n/a | 2.013 | 43.638 | n/a | n/a | 7.186 | 24.068 | 0.346 | 7.186 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc000000000000016b | 106.549 | 13.304 | 0.832 | 0.000 | 1.303 | 20.899 | 25.843 | 0.129 | n/a | 0.508 | 43.638 | n/a | n/a | 0.094 | 15.439 | 0.145 | 0.094 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc0000000000000171 | 69.633 | 21.407 | 2.531 | 0.000 | 0.130 | 3.145 | 14.526 | 0.142 | n/a | 1.106 | 26.492 | n/a | n/a | 0.154 | 24.068 | 0.346 | 0.154 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc000000000000016d | 62.707 | 17.104 | 0.017 | 0.000 | 0.954 | 1.910 | 5.963 | 1.421 | n/a | 2.013 | 33.260 | n/a | n/a | 0.065 | 18.075 | 0.288 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d87a9f279d731ddc000000000000016f | 44.723 | 8.456 | 0.016 | 0.000 | 0.072 | 1.894 | 6.030 | 0.158 | n/a | 0.681 | 20.230 | n/a | n/a | 7.186 | 8.544 | 0.191 | 7.186 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.worker-message 1.029ms |
| d87a9f279d731ddc0000000000000169 | 28.482 | 5.220 | 0.007 | 0.000 | 1.178 | 1.148 | 2.386 | 0.136 | n/a | 0.440 | 17.889 | n/a | n/a | 0.077 | 6.406 | 0.225 | 0.077 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.482 | 1.679 | 0.000 | 2.791 | 5.220 | 0.007 | 0.000 | 1.178 | 1.148 | 2.386 | 0.136 | n/a | 0.440 | 17.889 | n/a | n/a | 0.077 | 6.406 | 0.225 | 0.077 |
| p99 | 28.482 | 1.679 | 0.000 | 2.791 | 5.220 | 0.007 | 0.000 | 1.178 | 1.148 | 2.386 | 0.136 | n/a | 0.440 | 17.889 | n/a | n/a | 0.077 | 6.406 | 0.225 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc0000000000000169 | 28.482 | 5.220 | 0.007 | 0.000 | 1.178 | 1.148 | 2.386 | 0.136 | n/a | 0.440 | 17.889 | n/a | n/a | 0.077 | 6.406 | 0.225 | 0.077 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 229.026 | 1.242 | 0.773 | 4.925 | 21.294 | 16.667 | 0.000 | 0.028 | 18.628 | 3.469 | 9.346 | n/a | 0.537 | 130.584 | n/a | n/a | 0.076 | 37.537 | 0.179 | 0.076 |
| p99 | 295.858 | 2.813 | 3.053 | 7.834 | 29.119 | 45.244 | 0.000 | 0.139 | 47.979 | 37.823 | 18.167 | n/a | 12.228 | 177.349 | n/a | n/a | 0.183 | 74.383 | 0.251 | 0.183 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d87a9f279d731ddc000000000000017b | 295.858 | 29.119 | 45.244 | 0.000 | 0.020 | 21.863 | 3.469 | 18.167 | n/a | 0.444 | 177.349 | n/a | n/a | 0.183 | 74.383 | 0.251 | 0.183 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 7.379ms; driver.publication 6.644ms; driver.publication 4.889ms; driver.publication 3.519ms; driver.expected-state.add-commit 3.451ms |
| d87a9f279d731ddc000000000000017a | 287.081 | 23.094 | 41.312 | 0.000 | 0.028 | 32.958 | 3.426 | 13.135 | n/a | 0.664 | 172.350 | n/a | n/a | 0.113 | 64.435 | 0.224 | 0.113 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 7.379ms; driver.publication 6.644ms; driver.publication 4.889ms; driver.publication 3.519ms; driver.expected-state.add-commit 3.451ms |
| d87a9f279d731ddc0000000000000179 | 275.249 | 25.992 | 33.396 | 0.000 | 0.091 | 43.272 | 2.541 | 9.815 | n/a | 0.698 | 159.391 | n/a | n/a | 0.053 | 59.479 | 0.216 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 7.379ms; driver.publication 6.644ms; driver.publication 4.889ms; driver.publication 3.519ms; driver.expected-state.add-commit 3.451ms |
| d87a9f279d731ddc0000000000000178 | 260.802 | 28.057 | 27.092 | 0.000 | 0.023 | 40.921 | 3.981 | 16.013 | n/a | 0.312 | 144.356 | n/a | n/a | 0.045 | 55.173 | 0.212 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 7.379ms; driver.publication 4.889ms; driver.publication 3.519ms; driver.expected-state.add-commit 3.451ms; driver.publication 3.405ms |
| d87a9f279d731ddc0000000000000177 | 246.284 | 27.182 | 19.521 | 0.000 | 0.023 | 47.979 | 16.974 | 3.440 | n/a | 0.537 | 130.584 | n/a | n/a | 0.042 | 46.727 | 0.190 | 0.042 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 4.889ms; driver.publication 3.519ms; driver.expected-state.add-commit 3.451ms; driver.publication 3.405ms; driver.publication 2.651ms |
| d87a9f279d731ddc0000000000000176 | 229.026 | 20.843 | 16.667 | 0.000 | 0.027 | 8.830 | 30.083 | 12.186 | n/a | 0.654 | 139.703 | n/a | n/a | 0.034 | 37.537 | 0.164 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 4.889ms; driver.publication 3.519ms; driver.expected-state.add-commit 3.451ms; driver.publication 2.651ms; driver.publication 2.377ms |
| d87a9f279d731ddc0000000000000175 | 219.300 | 21.294 | 15.155 | 0.000 | 0.044 | 14.235 | 34.968 | 0.078 | n/a | 5.520 | 127.839 | n/a | n/a | 0.168 | 36.493 | 0.166 | 0.168 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 3.519ms; driver.expected-state.add-commit 3.451ms; driver.publication 2.651ms; driver.publication 2.377ms; driver.worker-message 1.954ms |
| d87a9f279d731ddc0000000000000174 | 196.337 | 20.490 | 12.138 | 0.000 | 0.047 | 9.932 | 37.823 | 0.050 | n/a | 0.359 | 115.382 | n/a | n/a | 0.116 | 32.675 | 0.166 | 0.116 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 3.519ms; driver.publication 2.651ms; driver.worker-message 1.954ms; driver.expected-state.bind-receipt 1.911ms; client.encode 1.587ms |
| d87a9f279d731ddc0000000000000173 | 162.884 | 16.251 | 12.696 | 0.000 | 0.139 | 3.320 | 2.816 | 9.346 | n/a | 0.282 | 117.876 | n/a | n/a | 0.158 | 29.086 | 0.179 | 0.158 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 3.519ms; driver.worker-message 1.954ms; driver.expected-state.bind-receipt 1.911ms; client.encode 1.587ms |
| d87a9f279d731ddc0000000000000172 | 142.190 | 17.307 | 0.033 | 0.000 | 0.126 | 18.628 | 1.743 | 1.176 | n/a | 12.228 | 90.871 | n/a | n/a | 0.076 | 17.467 | 0.123 | 0.076 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.worker-message 1.954ms; client.encode 1.587ms |

## P1 / warmup / read (107 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 148.392 | n/a | n/a | n/a | 0.146 | n/a | 0.000 | 57.431 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 84.524 | 1.000 | 0.016 |
| p99 | 310.530 | n/a | n/a | n/a | 118.983 | n/a | 13.308 | 310.434 | 132.363 | 3.393 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 134.476 | 310.521 | 1.000 | 134.476 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 67bb63daf1d38a980000000000002d5b | 310.575 | 0.140 | n/a | 0.000 | 310.434 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 310.573 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000002d5c | 310.530 | 0.216 | n/a | 0.000 | 310.276 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.039 | 310.491 | 1.000 | 0.039 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000002d5a | 310.526 | 0.071 | n/a | 0.000 | 310.450 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 310.521 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000002d5d | 310.464 | 0.177 | n/a | 0.000 | 310.281 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 310.458 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000002d59 | 310.445 | 0.250 | n/a | 0.000 | 310.186 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 310.436 | 1.000 | 0.009 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c0000000000002803 | 308.932 | 0.395 | n/a | 0.000 | 308.512 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 308.906 | 1.000 | 0.026 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c0000000000002807 | 308.782 | 0.087 | n/a | 0.000 | 308.692 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 308.779 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c0000000000002806 | 308.751 | 0.021 | n/a | 0.000 | 308.729 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 308.750 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c0000000000002805 | 308.734 | 0.049 | n/a | 0.000 | 308.683 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 308.732 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c0000000000002804 | 308.693 | 0.097 | n/a | 0.000 | 308.590 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 308.688 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000002d65 | 305.917 | 0.148 | n/a | 0.000 | 305.761 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 305.909 | 1.000 | 0.008 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c036f94f6b9599e300000000000021d1 | 305.599 | 0.040 | n/a | 0.000 | 305.558 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 305.598 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e300000000000021d0 | 305.583 | 0.019 | n/a | 0.000 | 305.564 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 305.583 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e300000000000021cf | 305.573 | 0.021 | n/a | 0.000 | 305.551 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 305.572 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e300000000000021ce | 305.553 | 0.038 | n/a | 0.000 | 305.514 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 305.551 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e300000000000021cd | 305.423 | 0.156 | n/a | 0.000 | 305.252 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 305.408 | 1.000 | 0.015 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000002d09 | 283.337 | 0.046 | n/a | 0.000 | 283.289 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 283.334 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000002d08 | 283.273 | 0.100 | n/a | 0.000 | 283.170 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 283.270 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000002d07 | 283.117 | 0.341 | n/a | 0.000 | 282.749 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.027 | 283.090 | 1.000 | 0.027 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c000000000000278f | 282.712 | 0.049 | n/a | 0.000 | 282.661 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 282.710 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.055 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 293.440 | n/a | n/a | n/a | 3.334 | n/a | 0.000 | 293.017 | 0.629 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.599 | 293.429 | 1.000 | 2.599 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 67bb63daf1d38a980000000000002df4 | 293.440 | 0.412 | n/a | 0.000 | 293.017 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 293.429 | 1.000 | 0.011 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 67bb63daf1d38a980000000000002da5 | 5.699 | 3.334 | n/a | 0.000 | 0.000 | 0.629 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.736 | 3.334 | 0.585 | 1.736 | node-14/thread-3/reader.execute | none observed |
| 67bb63daf1d38a980000000000002ed6 | 2.959 | 2.954 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 2.954 | 0.998 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a9800000000000056f1 | 2.888 | 2.884 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.884 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000000903b | 2.797 | 2.789 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 2.789 | 0.997 | 0.009 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000000407d | 2.740 | 2.737 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.737 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000006462 | 2.599 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.599 | 0.000 | 0.000 | 2.599 | uncovered | none observed |
| 67bb63daf1d38a9800000000000030a2 | 2.232 | 2.223 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 2.223 | 0.996 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000003151 | 2.176 | 2.172 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.172 | 0.998 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a9800000000000055ac | 2.132 | 2.129 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.129 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000006e20 | 2.120 | 2.118 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.118 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a9800000000000038ea | 1.954 | 1.950 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.950 | 0.998 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000004317 | 1.882 | 1.879 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.879 | 0.998 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a9800000000000030e7 | 1.872 | 1.868 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.868 | 0.998 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000003523 | 1.845 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.845 | 0.000 | 0.000 | 1.845 | uncovered | none observed |
| 67bb63daf1d38a98000000000000306b | 1.722 | 1.720 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.720 | 0.998 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000009915 | 1.704 | 1.702 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.702 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000003407 | 1.680 | 1.677 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.677 | 0.998 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000000355d | 1.661 | 1.658 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.658 | 0.998 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000002ecb | 1.618 | 1.612 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.612 | 0.997 | 0.005 | node-14/thread-3/replica.pull-at | none observed |

## P1 / L4 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 2.571 | n/a | n/a | n/a | 1.827 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 2.514 | 0.994 | 0.010 |
| p99 | 323.854 | n/a | n/a | n/a | 10.198 | n/a | 0.000 | 323.518 | 0.778 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.885 | 323.850 | 1.000 | 8.885 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 67bb63daf1d38a98000000000000babc | 323.984 | 0.053 | n/a | 0.000 | 323.929 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 323.983 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a98000000000000babb | 323.854 | 0.332 | n/a | 0.000 | 323.518 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 323.850 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c036f94f6b9599e300000000000030ed | 323.760 | 0.375 | n/a | 0.000 | 323.382 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 323.757 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c00000000000035df | 321.583 | 0.429 | n/a | 0.000 | 321.143 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 321.572 | 1.000 | 0.011 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c036f94f6b9599e300000000000030f8 | 290.306 | 0.279 | n/a | 0.000 | 290.016 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 290.295 | 1.000 | 0.010 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.111ms; replica.apply-delta 0.056ms; replica.apply-delta 0.044ms |
| 67bb63daf1d38a98000000000000bac5 | 290.196 | 0.261 | n/a | 0.000 | 289.926 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 290.187 | 1.000 | 0.009 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.053ms; replica.apply-delta 0.049ms; replica.apply-delta 0.039ms |
| 67bb63daf1d38a98000000000000bac6 | 290.170 | 0.069 | n/a | 0.000 | 290.097 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 290.166 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.053ms; replica.apply-delta 0.049ms; replica.apply-delta 0.039ms |
| a2d6551deefc6a6c00000000000035e3 | 287.533 | 0.316 | n/a | 0.000 | 287.206 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 287.521 | 1.000 | 0.011 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.074ms; replica.apply-delta 0.047ms; replica.apply-delta 0.033ms |
| c036f94f6b9599e300000000000021db | 61.886 | 48.494 | n/a | 3.854 | 0.000 | 0.654 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.885 | 52.347 | 0.846 | 8.885 | node-14/thread-5/reader.execute | none observed |
| a2d6551deefc6a6c0000000000002857 | 20.874 | 10.198 | n/a | 0.000 | 0.000 | 0.778 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.897 | 10.198 | 0.489 | 9.897 | node-14/thread-4/socket.wait-first-byte | none observed |
| c036f94f6b9599e30000000000003d07 | 8.919 | 8.910 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 8.910 | 0.999 | 0.009 | node-14/thread-5/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000000d627 | 6.332 | 6.329 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 6.329 | 1.000 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000000a2fa | 6.315 | 3.128 | n/a | 0.000 | 0.000 | 0.806 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.381 | 3.128 | 0.495 | 2.381 | node-14/thread-3/socket.wait-first-byte | none observed |
| 67bb63daf1d38a98000000000000d628 | 5.807 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.807 | 0.000 | 0.000 | 5.807 | uncovered | none observed |
| a2d6551deefc6a6c000000000000285b | 5.583 | 5.576 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 5.576 | 0.999 | 0.007 | node-14/thread-4/replica.pull-at | none observed |
| a2d6551deefc6a6c000000000000374c | 5.262 | 5.258 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 5.258 | 0.999 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| a2d6551deefc6a6c000000000000285c | 4.900 | 4.871 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 4.871 | 0.994 | 0.030 | node-14/thread-4/replica.pull-at | none observed |
| c036f94f6b9599e30000000000003c95 | 4.766 | 4.755 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 4.755 | 0.998 | 0.010 | node-14/thread-5/reader.execute | none observed |
| 67bb63daf1d38a98000000000000bd74 | 4.693 | 4.683 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 4.683 | 0.998 | 0.010 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000000a40d | 4.639 | 4.627 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 4.627 | 0.997 | 0.012 | node-14/thread-3/replica.pull-at | none observed |

## P1 / L16 / read (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.520 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 9.460 | 0.999 | 0.007 |
| p99 | 331.908 | n/a | n/a | n/a | 50.007 | n/a | 3.084 | 331.774 | 1.221 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.612 | 331.905 | 1.000 | 7.612 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c036f94f6b9599e30000000000008628 | 331.946 | 0.076 | n/a | 0.000 | 331.867 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 331.944 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.056ms |
| c036f94f6b9599e30000000000008627 | 331.908 | 0.131 | n/a | 0.000 | 331.774 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 331.905 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.056ms |
| c036f94f6b9599e30000000000008626 | 331.769 | 0.279 | n/a | 0.000 | 331.486 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 331.764 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.056ms |
| c036f94f6b9599e30000000000008638 | 330.909 | 0.043 | n/a | 0.000 | 330.863 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 330.906 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.056ms |
| c036f94f6b9599e30000000000008639 | 330.890 | 0.048 | n/a | 0.000 | 330.840 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 330.888 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.056ms |
| a2d6551deefc6a6c00000000000085ee | 328.921 | 0.060 | n/a | 0.000 | 328.858 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 328.918 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.145ms |
| 67bb63daf1d38a980000000000011f89 | 328.890 | 0.041 | n/a | 0.000 | 328.847 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 328.887 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.065ms |
| 67bb63daf1d38a980000000000011f88 | 328.840 | 0.153 | n/a | 0.000 | 328.683 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 328.836 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.065ms |
| a2d6551deefc6a6c00000000000085ed | 328.829 | 0.431 | n/a | 0.000 | 328.395 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 328.826 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.145ms |
| a2d6551deefc6a6c00000000000085ea | 328.469 | 0.313 | n/a | 0.000 | 328.131 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 328.444 | 1.000 | 0.026 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.145ms |
| a2d6551deefc6a6c00000000000085eb | 328.429 | 0.083 | n/a | 0.000 | 328.341 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 328.425 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.145ms |
| a2d6551deefc6a6c00000000000085ec | 328.420 | 0.045 | n/a | 0.000 | 328.373 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 328.418 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.145ms |
| 67bb63daf1d38a980000000000011fb4 | 326.636 | 0.047 | n/a | 0.000 | 326.585 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 326.632 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.065ms |
| 67bb63daf1d38a980000000000011fb5 | 326.610 | 0.052 | n/a | 0.000 | 326.555 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 326.607 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.065ms |
| 67bb63daf1d38a980000000000011fc7 | 325.586 | 0.069 | n/a | 0.000 | 325.516 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 325.585 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.065ms |
| 67bb63daf1d38a980000000000011fcf | 325.362 | 0.037 | n/a | 0.000 | 325.322 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 325.359 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.065ms |
| 67bb63daf1d38a98000000000000e438 | 297.669 | 0.100 | n/a | 0.000 | 297.568 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.668 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 67bb63daf1d38a98000000000000e437 | 297.634 | 0.031 | n/a | 0.000 | 297.601 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.632 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 67bb63daf1d38a98000000000000e433 | 297.626 | 0.351 | n/a | 0.000 | 297.272 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 297.623 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 67bb63daf1d38a98000000000000e436 | 297.565 | 0.065 | n/a | 0.000 | 297.499 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 297.563 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |

## P1 / L64 / read (113 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 3.225 | n/a | n/a | n/a | 0.022 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.198 | 0.979 | 0.019 |
| p99 | 710.886 | n/a | n/a | n/a | 6.126 | n/a | 0.000 | 710.872 | 0.963 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.789 | 710.885 | 1.000 | 5.789 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c036f94f6b9599e3000000000000c5d9 | 710.899 | 0.015 | n/a | 0.000 | 710.883 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 710.898 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e3000000000000c5d8 | 710.886 | 0.014 | n/a | 0.000 | 710.872 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 710.885 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e3000000000000c5d7 | 710.872 | 0.019 | n/a | 0.000 | 710.852 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 710.871 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e3000000000000c5d6 | 710.852 | 0.063 | n/a | 0.000 | 710.787 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 710.850 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e3000000000000c5d5 | 710.776 | 0.124 | n/a | 0.000 | 710.649 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 710.772 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c000000000000c1b9 | 709.552 | 0.158 | n/a | 0.000 | 709.391 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 709.549 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c000000000000c1d9 | 708.805 | 0.022 | n/a | 0.000 | 708.781 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 708.804 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c000000000000c1d8 | 708.794 | 0.104 | n/a | 0.000 | 708.689 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 708.792 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c000000000000c1d6 | 708.717 | 0.060 | n/a | 0.000 | 708.655 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 708.715 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c000000000000c1d7 | 708.713 | 0.019 | n/a | 0.000 | 708.694 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 708.713 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000015e5b | 708.437 | 0.137 | n/a | 0.000 | 708.298 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 708.435 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000015e5a | 708.389 | 0.326 | n/a | 0.000 | 708.060 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 708.386 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000015e59 | 708.384 | 0.937 | n/a | 0.000 | 707.433 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 708.370 | 1.000 | 0.014 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000015e58 | 707.963 | 0.632 | n/a | 0.000 | 707.328 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 707.959 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000015e57 | 707.487 | 0.081 | n/a | 0.000 | 707.404 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 707.485 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000015e56 | 707.339 | 0.268 | n/a | 0.000 | 707.065 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 707.333 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c000000000000c20e | 89.737 | 0.038 | n/a | 0.000 | 89.697 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 89.735 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| a2d6551deefc6a6c000000000000c20d | 89.706 | 0.036 | n/a | 0.000 | 89.668 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 89.705 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| a2d6551deefc6a6c000000000000c20a | 89.666 | 0.285 | n/a | 0.000 | 89.366 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 89.651 | 1.000 | 0.015 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| a2d6551deefc6a6c000000000000c20c | 89.662 | 0.035 | n/a | 0.000 | 89.625 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 89.660 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |

## P1 / L256 / read (124 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.395 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.031 | 0.000 | 0.000 | 0.031 |
| p99 | 73.020 | n/a | n/a | n/a | 31.715 | n/a | 0.000 | 0.000 | 3.403 | 53.677 | 0.012 | n/a | 0.021 | 0.000 | n/a | n/a | 5.366 | 31.715 | 1.000 | 5.366 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a2d6551deefc6a6c000000000000cac8 | 114.822 | 35.304 | n/a | 6.040 | 0.000 | 3.403 | 69.977 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.009 | 41.343 | 0.360 | 0.009 | gw-r/thread-46/gateway.admitted-work | none observed |
| c036f94f6b9599e3000000000000cee3 | 73.020 | 10.005 | n/a | 0.000 | 0.000 | 9.296 | 53.677 | 0.010 | n/a | 0.018 | 0.000 | n/a | n/a | 0.015 | 10.005 | 0.137 | 0.015 | gw-r/thread-70/gateway.admitted-work | none observed |
| 67bb63daf1d38a9800000000000167f2 | 66.271 | 3.868 | n/a | 0.000 | 0.000 | 2.478 | 24.646 | 35.255 | n/a | 0.021 | 0.000 | n/a | n/a | 0.005 | 3.868 | 0.058 | 0.005 | gw-r/thread-49/gateway.admission-wait | none observed |
| a2d6551deefc6a6c0000000000010560 | 31.725 | 31.715 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 31.715 | 1.000 | 0.010 | node-14/thread-4/replica.pull-at | none observed |
| a2d6551deefc6a6c0000000000010561 | 31.712 | 31.683 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 31.683 | 0.999 | 0.030 | node-14/thread-4/replica.pull-at | none observed |
| a2d6551deefc6a6c0000000000010562 | 31.701 | 31.670 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.031 | 31.670 | 0.999 | 0.031 | node-14/thread-4/replica.pull-at | none observed |
| a2d6551deefc6a6c0000000000010563 | 31.165 | 31.128 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.036 | 31.128 | 0.999 | 0.036 | node-14/thread-4/reader.execute | none observed |
| 67bb63daf1d38a980000000000019fd9 | 17.560 | 17.557 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 17.557 | 1.000 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000019ff5 | 14.591 | 14.588 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 14.588 | 1.000 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000019ff6 | 14.280 | 14.257 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 14.257 | 0.998 | 0.023 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000019ff7 | 13.126 | 13.093 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.033 | 13.093 | 0.997 | 0.033 | node-14/thread-3/replica.pull-at | none observed |
| a2d6551deefc6a6c00000000000104d6 | 12.812 | 12.789 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 12.789 | 0.998 | 0.023 | node-14/thread-4/replica.pull-at | none observed |
| a2d6551deefc6a6c00000000000104d5 | 12.810 | 12.806 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 12.806 | 1.000 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| a2d6551deefc6a6c00000000000104d7 | 12.761 | 12.737 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 12.737 | 0.998 | 0.024 | node-14/thread-4/replica.pull-at | none observed |
| a2d6551deefc6a6c00000000000104d8 | 12.746 | 12.721 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 12.721 | 0.998 | 0.024 | node-14/thread-4/replica.pull-at | none observed |
| a2d6551deefc6a6c00000000000104d9 | 12.676 | 12.650 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 12.650 | 0.998 | 0.026 | node-14/thread-4/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000019ff8 | 12.582 | 11.234 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.348 | 11.234 | 0.893 | 1.348 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000001a37e | 11.646 | 6.293 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.352 | 6.293 | 0.540 | 5.352 | node-14/thread-3/replica.pull-at | none observed |
| c036f94f6b9599e30000000000010b8f | 11.605 | 11.600 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 11.600 | 1.000 | 0.006 | node-14/thread-5/replica.pull-at | none observed |
| a2d6551deefc6a6c0000000000010f5b | 10.361 | 10.357 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 10.357 | 1.000 | 0.004 | node-14/thread-4/replica.pull-at | none observed |

## P1 / L1024 / read (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 5.541 | n/a | n/a | n/a | 0.049 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 5.499 | 0.996 | 0.017 |
| p99 | 508.325 | n/a | n/a | n/a | 24.252 | n/a | 1.826 | 508.169 | 3.285 | 57.012 | 0.017 | n/a | 0.033 | 0.000 | n/a | n/a | 15.046 | 508.323 | 1.000 | 15.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 67bb63daf1d38a98000000000001e1b0 | 509.029 | 5.389 | n/a | 0.000 | 503.635 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 509.024 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a98000000000001e1c9 | 508.325 | 0.049 | n/a | 0.000 | 508.275 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 508.323 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a98000000000001e1c8 | 508.273 | 0.172 | n/a | 0.000 | 508.099 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 508.271 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a98000000000001e1df | 508.239 | 0.069 | n/a | 0.000 | 508.169 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 508.238 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a98000000000001e1de | 508.133 | 0.108 | n/a | 0.000 | 508.008 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 508.116 | 1.000 | 0.017 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a98000000000001e1dd | 507.979 | 0.043 | n/a | 0.000 | 507.934 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 507.977 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c036f94f6b9599e3000000000001532a | 506.996 | 0.075 | n/a | 0.000 | 506.919 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 506.994 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e30000000000015345 | 506.743 | 0.047 | n/a | 0.000 | 506.695 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 506.742 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e30000000000015344 | 506.699 | 0.019 | n/a | 0.000 | 506.679 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 506.698 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e30000000000015329 | 506.698 | 0.396 | n/a | 0.000 | 506.299 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 506.695 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e30000000000015343 | 506.671 | 0.043 | n/a | 0.000 | 506.626 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 506.669 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c00000000000145b2 | 502.886 | 0.287 | n/a | 0.000 | 502.596 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 502.883 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c00000000000145cd | 502.848 | 0.149 | n/a | 0.000 | 502.698 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 502.846 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c00000000000145cc | 502.791 | 0.131 | n/a | 0.000 | 502.658 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 502.789 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c00000000000145cb | 502.668 | 0.035 | n/a | 0.000 | 502.632 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 502.667 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c00000000000145ca | 502.648 | 0.080 | n/a | 0.000 | 502.567 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 502.646 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c036f94f6b9599e30000000000015357 | 306.670 | 0.188 | n/a | 0.000 | 306.410 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.072 | 306.597 | 1.000 | 0.072 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.100ms; replica.apply-delta 0.040ms |
| c036f94f6b9599e30000000000015358 | 306.587 | 0.038 | n/a | 0.000 | 306.542 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 306.580 | 1.000 | 0.007 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.100ms; replica.apply-delta 0.040ms |
| c036f94f6b9599e30000000000015359 | 306.545 | 0.042 | n/a | 0.000 | 306.496 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 306.538 | 1.000 | 0.007 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.100ms; replica.apply-delta 0.040ms |
| c036f94f6b9599e3000000000001536a | 304.027 | 0.138 | n/a | 0.000 | 303.882 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 304.020 | 1.000 | 0.007 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.100ms; replica.apply-delta 0.040ms |

## P1 / recovery / read (135 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.269 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 0.000 | 0.000 | 0.026 |
| p99 | 316.285 | n/a | n/a | n/a | 10.035 | n/a | 0.000 | 316.266 | 0.933 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.297 | 316.283 | 1.000 | 33.297 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c036f94f6b9599e3000000000001c158 | 317.647 | 0.675 | n/a | 0.000 | 316.968 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 317.643 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.054ms |
| c036f94f6b9599e3000000000001c16b | 316.285 | 0.018 | n/a | 0.000 | 316.266 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 316.283 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.054ms |
| c036f94f6b9599e3000000000001c16a | 316.281 | 0.064 | n/a | 0.000 | 316.213 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 316.278 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.054ms |
| a2d6551deefc6a6c000000000001bc79 | 315.960 | 0.097 | n/a | 0.000 | 315.854 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 315.951 | 1.000 | 0.009 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| a2d6551deefc6a6c000000000001bc78 | 315.866 | 0.044 | n/a | 0.000 | 315.820 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 315.864 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| a2d6551deefc6a6c000000000001bc77 | 315.786 | 0.284 | n/a | 0.000 | 315.497 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 315.781 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| c036f94f6b9599e3000000000001c17b | 315.723 | 0.047 | n/a | 0.000 | 315.674 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 315.721 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.054ms |
| c036f94f6b9599e3000000000001c17c | 315.720 | 0.038 | n/a | 0.000 | 315.680 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 315.718 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.054ms |
| 67bb63daf1d38a980000000000025a18 | 315.420 | 0.174 | n/a | 0.000 | 315.245 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 315.418 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| 67bb63daf1d38a980000000000025a19 | 315.406 | 0.529 | n/a | 0.000 | 314.875 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 315.404 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| 67bb63daf1d38a980000000000025a17 | 315.377 | 0.336 | n/a | 0.000 | 315.036 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 315.372 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| 67bb63daf1d38a980000000000025a1b | 315.131 | 0.031 | n/a | 0.000 | 315.098 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 315.130 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| 67bb63daf1d38a980000000000025a1a | 315.109 | 0.087 | n/a | 0.000 | 315.019 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 315.106 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| a2d6551deefc6a6c000000000001bc88 | 314.976 | 0.506 | n/a | 0.000 | 314.468 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 314.973 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 67bb63daf1d38a980000000000025a24 | 314.771 | 0.089 | n/a | 0.000 | 314.675 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 314.764 | 1.000 | 0.007 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| a2d6551deefc6a6c000000000001bc89 | 314.520 | 0.074 | n/a | 0.000 | 314.441 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 314.515 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| c036f94f6b9599e3000000000001665c | 43.514 | 9.285 | n/a | 0.000 | 0.000 | 0.933 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.297 | 9.285 | 0.213 | 33.297 | node-14/thread-5/socket.wait-first-byte | none observed |
| a2d6551deefc6a6c0000000000015b6c | 36.466 | 1.687 | n/a | 0.000 | 0.000 | 1.166 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.613 | 1.687 | 0.046 | 33.613 | node-14/thread-4/socket.wait-first-byte | none observed |
| 67bb63daf1d38a98000000000001f80b | 26.847 | 6.143 | n/a | 0.000 | 0.000 | 0.635 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.069 | 6.143 | 0.229 | 20.069 | node-14/thread-3/socket.wait-first-byte | none observed |
| c036f94f6b9599e30000000000019ccb | 17.924 | 17.914 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 17.914 | 0.999 | 0.009 | node-14/thread-5/replica.pull-at | none observed |

## P4 / p4mix / read (80 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.025 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 |
| p99 | 37.319 | n/a | n/a | n/a | 18.729 | n/a | 0.000 | 0.000 | 0.561 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.030 | 18.729 | 0.999 | 18.030 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 67bb63daf1d38a9800000000000347bd | 37.319 | 18.729 | n/a | 0.000 | 0.000 | 0.561 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.030 | 18.729 | 0.502 | 18.030 | node-14/thread-3/socket.wait-first-byte | replica.apply-delta 0.065ms |
| 67bb63daf1d38a980000000000025a33 | 22.895 | 13.566 | n/a | 0.000 | 0.000 | 0.549 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.780 | 13.566 | 0.593 | 8.780 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.049ms |
| 67bb63daf1d38a980000000000025b5a | 6.789 | 4.244 | n/a | 0.000 | 0.000 | 0.392 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.154 | 4.244 | 0.625 | 2.154 | node-14/thread-3/reader.execute | none observed |
| 67bb63daf1d38a98000000000002ec13 | 5.982 | 5.977 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 5.977 | 0.999 | 0.006 | node-14/thread-3/reader.execute | none observed |
| 67bb63daf1d38a9800000000000314bd | 4.958 | 4.941 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.941 | 0.997 | 0.017 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000029dba | 4.479 | 4.477 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 4.477 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000031be6 | 4.203 | 4.193 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 4.193 | 0.998 | 0.010 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000035cc9 | 3.920 | 3.916 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.916 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000002f76e | 3.889 | 3.887 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.887 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000002f706 | 3.686 | 3.683 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.683 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000002f4de | 3.396 | 3.394 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.394 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000031bc4 | 3.002 | 3.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.000 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000025d8e | 2.997 | 2.976 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 2.976 | 0.993 | 0.021 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000035be6 | 2.994 | 2.990 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.990 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000027a4f | 2.890 | 2.878 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 2.878 | 0.996 | 0.011 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000002782e | 2.837 | 2.834 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.834 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000002ee6e | 2.648 | 2.644 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.644 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000002fcb6 | 2.437 | 2.434 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.434 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000002fc22 | 2.377 | 2.375 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.375 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000026720 | 2.299 | 2.295 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.295 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h1 / read (80 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.024 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 38.141 | n/a | n/a | n/a | 19.929 | n/a | 0.000 | 0.000 | 0.802 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.876 | 19.929 | 1.000 | 28.876 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 67bb63daf1d38a980000000000035d16 | 38.141 | 8.462 | n/a | 0.000 | 0.000 | 0.802 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.876 | 8.462 | 0.222 | 28.876 | node-14/thread-3/socket.wait-first-byte | none observed |
| 67bb63daf1d38a9800000000000369f0 | 19.938 | 19.929 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 19.929 | 1.000 | 0.010 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a9800000000000369f4 | 11.774 | 11.768 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 11.768 | 0.999 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000036a8f | 7.946 | 7.943 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 7.943 | 1.000 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000003c182 | 6.266 | 6.264 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 6.264 | 1.000 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000035ddf | 3.506 | 3.490 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.490 | 0.995 | 0.017 | node-14/thread-3/reader.observe | none observed |
| 67bb63daf1d38a980000000000037124 | 3.436 | 3.434 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.434 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000003d8c4 | 2.949 | 2.947 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.947 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a9800000000000378a0 | 2.790 | 2.788 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.788 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000003c7c1 | 2.756 | 2.752 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.752 | 0.998 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000038fc1 | 2.628 | 2.619 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 2.619 | 0.997 | 0.009 | node-14/thread-3/reader.execute | none observed |
| 67bb63daf1d38a980000000000036a84 | 2.534 | 2.531 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.531 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a9800000000000369ea | 2.507 | 2.501 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 2.501 | 0.998 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000042d95 | 2.477 | 2.450 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.027 | 2.450 | 0.989 | 0.027 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000003b195 | 2.476 | 2.469 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 2.469 | 0.997 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000036d91 | 2.348 | 2.345 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.345 | 0.999 | 0.003 | node-14/thread-3/reader.execute | none observed |
| 67bb63daf1d38a980000000000036b23 | 2.311 | 2.301 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 2.301 | 0.996 | 0.010 | node-14/thread-3/reader.observe | none observed |
| 67bb63daf1d38a98000000000003ab45 | 2.294 | 2.283 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 2.283 | 0.995 | 0.011 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000035ff1 | 2.227 | 2.224 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.224 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000036e13 | 2.077 | 2.070 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 2.070 | 0.997 | 0.007 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h3 / read (77 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.042 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 18.277 | n/a | n/a | n/a | 10.855 | n/a | 0.000 | 0.000 | 0.839 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.678 | 10.855 | 1.000 | 12.678 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 67bb63daf1d38a980000000000044442 | 18.277 | 4.760 | n/a | 0.000 | 0.000 | 0.839 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.678 | 4.760 | 0.260 | 12.678 | node-14/thread-3/socket.wait-first-byte | none observed |
| 67bb63daf1d38a98000000000004f206 | 10.858 | 10.855 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 10.855 | 1.000 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a9800000000000514d2 | 5.546 | 5.542 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 5.542 | 0.999 | 0.004 | node-14/thread-3/reader.execute | none observed |
| 67bb63daf1d38a9800000000000461fe | 4.056 | 4.045 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 4.045 | 0.997 | 0.011 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000004b129 | 3.942 | 3.938 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.938 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000004f305 | 3.890 | 3.888 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.888 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000044b2f | 3.725 | 3.721 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.721 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.076ms |
| 67bb63daf1d38a98000000000004cf4e | 3.419 | 3.414 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 3.414 | 0.999 | 0.005 | node-14/thread-3/reader.observe | none observed |
| 67bb63daf1d38a980000000000050578 | 3.334 | 3.332 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.332 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000004c898 | 3.227 | 3.224 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.224 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000048892 | 3.118 | 3.114 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.114 | 0.999 | 0.004 | node-14/thread-3/reader.execute | none observed |
| 67bb63daf1d38a980000000000051ccc | 3.025 | 3.017 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 3.017 | 0.997 | 0.008 | node-14/thread-3/reader.execute | none observed |
| 67bb63daf1d38a9800000000000520fc | 2.893 | 2.887 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 2.887 | 0.998 | 0.006 | node-14/thread-3/reader.observe | none observed |
| 67bb63daf1d38a980000000000050f46 | 2.744 | 2.739 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 2.739 | 0.998 | 0.005 | node-14/thread-3/reader.execute | none observed |
| 67bb63daf1d38a9800000000000465c1 | 2.710 | 2.708 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.708 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000047fad | 2.699 | 2.695 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.695 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000050dcf | 2.650 | 2.647 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.647 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000005123a | 2.510 | 2.507 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.507 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a9800000000000486c7 | 2.489 | 2.480 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 2.480 | 0.997 | 0.009 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000046b70 | 2.446 | 2.435 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 2.435 | 0.995 | 0.011 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h10 / read (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.024 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 16.700 | n/a | n/a | n/a | 8.757 | n/a | 0.000 | 0.000 | 0.640 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.454 | 8.757 | 1.000 | 12.454 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 67bb63daf1d38a980000000000052570 | 16.700 | 3.606 | n/a | 0.000 | 0.000 | 0.640 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.454 | 3.606 | 0.216 | 12.454 | node-14/thread-3/socket.wait-first-byte | none observed |
| 67bb63daf1d38a980000000000052dae | 8.760 | 8.757 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 8.757 | 1.000 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000006029d | 4.137 | 4.134 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 4.134 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a9800000000000604f6 | 4.012 | 4.009 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 4.009 | 0.999 | 0.003 | node-14/thread-3/reader.execute | none observed |
| 67bb63daf1d38a980000000000060592 | 2.979 | 2.975 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.975 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000052f5d | 2.965 | 2.960 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 2.960 | 0.998 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a9800000000000615cc | 2.965 | 2.959 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 2.959 | 0.998 | 0.005 | node-14/thread-3/reader.execute | none observed |
| 67bb63daf1d38a9800000000000554e6 | 2.921 | 2.918 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.918 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a9800000000000538cf | 2.615 | 2.611 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 2.611 | 0.998 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a9800000000000551bb | 2.447 | 2.443 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.443 | 0.998 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000005e193 | 2.402 | 2.399 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.399 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000058ae4 | 2.354 | 2.352 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.352 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000005f61c | 2.250 | 2.243 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 2.243 | 0.997 | 0.006 | node-14/thread-3/reader.execute | none observed |
| 67bb63daf1d38a980000000000060dad | 2.228 | 2.226 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.226 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000005cd17 | 2.227 | 2.224 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.224 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000005324f | 2.207 | 2.204 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.204 | 0.998 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000005bdfb | 2.161 | 2.158 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.158 | 0.998 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a98000000000005b8e0 | 2.130 | 2.127 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.127 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 67bb63daf1d38a980000000000055972 | 2.093 | 2.066 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 2.066 | 0.988 | 0.026 | node-14/thread-3/reader.execute | none observed |
| 67bb63daf1d38a98000000000005373b | 2.077 | 2.073 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.073 | 0.998 | 0.004 | node-14/thread-3/replica.pull-at | none observed |

## P5 / presweep / read (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.234 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 24.230 | 1.000 | 0.014 |
| p99 | 310.809 | n/a | n/a | n/a | 46.636 | n/a | 7.717 | 310.354 | 0.913 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.715 | 310.804 | 1.000 | 15.715 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a2d6551deefc6a6c000000000001e985 | 310.809 | 0.450 | n/a | 0.000 | 310.354 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 310.804 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000065674 | 310.069 | 0.246 | n/a | 0.000 | 309.816 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 310.063 | 1.000 | 0.007 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c000000000001e9a7 | 309.917 | 0.056 | n/a | 0.000 | 309.859 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 309.915 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c000000000001e9a6 | 309.820 | 0.116 | n/a | 0.000 | 309.700 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 309.816 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a98000000000006569b | 309.680 | 0.111 | n/a | 0.000 | 309.569 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 309.679 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a98000000000006569a | 309.574 | 0.048 | n/a | 0.000 | 309.525 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 309.573 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000065699 | 309.470 | 0.027 | n/a | 0.000 | 309.442 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 309.469 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000065698 | 309.464 | 0.035 | n/a | 0.000 | 309.427 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 309.463 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 67bb63daf1d38a980000000000065697 | 309.398 | 0.107 | n/a | 0.000 | 309.289 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 309.397 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c000000000001e9c1 | 309.313 | 0.069 | n/a | 0.000 | 309.242 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 309.311 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c000000000001e9c0 | 309.227 | 0.027 | n/a | 0.000 | 309.199 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 309.226 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c036f94f6b9599e3000000000001ed8e | 307.864 | 0.027 | n/a | 0.000 | 307.835 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 307.863 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e3000000000001ed8d | 307.834 | 0.049 | n/a | 0.000 | 307.783 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 307.832 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e3000000000001ed8c | 307.775 | 0.192 | n/a | 0.000 | 307.557 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 307.749 | 1.000 | 0.026 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e3000000000001eda1 | 305.661 | 0.091 | n/a | 0.000 | 305.542 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.027 | 305.634 | 1.000 | 0.027 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e3000000000001edb6 | 303.933 | 0.180 | n/a | 0.000 | 303.750 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 303.929 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e3000000000001d50f | 284.794 | 0.455 | n/a | 0.000 | 284.336 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 284.791 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c036f94f6b9599e3000000000001d50e | 284.321 | 7.520 | n/a | 0.000 | 276.790 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 284.310 | 1.000 | 0.011 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c000000000001d002 | 278.632 | 0.045 | n/a | 0.000 | 278.585 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.630 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a2d6551deefc6a6c000000000001d001 | 278.549 | 0.400 | n/a | 0.000 | 278.147 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.548 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P5 / sweep / read (83 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 6.593 | n/a | n/a | n/a | 6.487 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.039 | 6.487 | 0.992 | 0.039 |
| p99 | 273.980 | n/a | n/a | n/a | 82.615 | n/a | 6.969 | 0.000 | 104.720 | 58.488 | 40.492 | n/a | 0.022 | 0.000 | n/a | n/a | 189.225 | 89.583 | 1.000 | 189.225 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c036f94f6b9599e3000000000001f489 | 273.980 | 76.734 | n/a | 4.889 | 0.000 | 3.131 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 189.225 | 81.624 | 0.298 | 189.225 | node-14/thread-5/socket.wait-first-byte | reader.observe 28.446ms; reader.observe 11.577ms; reader.observe 2.721ms; reader.observe 2.296ms; replica.apply-delta 0.092ms |
| c036f94f6b9599e3000000000001f48b | 203.936 | 21.550 | n/a | 0.000 | 0.000 | 104.720 | 37.157 | 40.492 | n/a | 0.011 | 0.000 | n/a | n/a | 0.006 | 21.550 | 0.106 | 0.006 | node-14/thread-5/socket.wait-first-byte | reader.observe 28.446ms; reader.observe 11.577ms; reader.observe 2.296ms; replica.apply-delta 0.092ms; replica.apply-delta 0.083ms |
| c036f94f6b9599e3000000000001f48a | 195.685 | 82.615 | n/a | 6.969 | 0.000 | 19.019 | 58.488 | 28.566 | n/a | 0.022 | 0.000 | n/a | n/a | 0.006 | 89.583 | 0.458 | 0.006 | node-14/thread-5/client.reach | reader.observe 11.577ms; reader.observe 2.296ms; replica.apply-delta 0.092ms; replica.apply-delta 0.083ms; replica.apply-delta 0.057ms |
| c036f94f6b9599e3000000000001f486 | 117.315 | 18.487 | n/a | 0.000 | 0.000 | 0.437 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 98.392 | 18.487 | 0.158 | 98.392 | node-14/thread-5/socket.wait-first-byte | reader.observe 11.577ms; replica.apply-delta 0.092ms; replica.apply-delta 0.083ms; replica.apply-delta 0.057ms; replica.apply-delta 0.042ms |
| c036f94f6b9599e3000000000001f487 | 111.193 | 45.002 | n/a | 1.868 | 0.000 | 9.217 | 29.997 | 25.094 | n/a | 0.011 | 0.000 | n/a | n/a | 0.004 | 46.869 | 0.422 | 0.004 | gw-r/thread-46/gateway.admission-wait | replica.apply-delta 0.092ms; replica.apply-delta 0.083ms; replica.apply-delta 0.057ms; replica.apply-delta 0.042ms; replica.apply-delta 0.042ms |
| a2d6551deefc6a6c000000000001f28b | 81.235 | 16.173 | n/a | 0.000 | 0.000 | 0.440 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 64.622 | 16.173 | 0.199 | 64.622 | node-14/thread-4/socket.wait-first-byte | reader.observe 3.787ms; reader.observe 2.095ms; reader.observe 1.524ms; reader.observe 1.495ms; replica.apply-delta 0.076ms |
| a2d6551deefc6a6c000000000001f28c | 75.119 | 15.031 | n/a | 0.000 | 0.000 | 0.199 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 59.889 | 15.031 | 0.200 | 59.889 | node-14/thread-4/socket.wait-first-byte | reader.observe 3.787ms; reader.observe 1.524ms; reader.observe 1.495ms; replica.apply-delta 0.076ms; replica.apply-delta 0.068ms |
| 67bb63daf1d38a980000000000065eb3 | 70.610 | 15.467 | n/a | 0.000 | 0.000 | 0.567 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 54.576 | 15.467 | 0.219 | 54.576 | node-14/thread-3/socket.wait-first-byte | reader.observe 2.021ms; reader.observe 1.578ms; reader.observe 1.428ms; replica.apply-delta 0.059ms; replica.apply-delta 0.056ms |
| a2d6551deefc6a6c000000000001f287 | 69.165 | 21.043 | n/a | 0.000 | 0.000 | 0.361 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.761 | 21.043 | 0.304 | 47.761 | node-14/thread-4/socket.wait-first-byte | reader.observe 3.787ms; reader.observe 1.495ms; replica.apply-delta 0.076ms; replica.apply-delta 0.068ms; replica.apply-delta 0.056ms |
| 67bb63daf1d38a980000000000065eb2 | 63.260 | 19.269 | n/a | 0.000 | 0.000 | 0.340 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.652 | 19.269 | 0.305 | 43.652 | node-14/thread-3/socket.wait-first-byte | reader.observe 2.021ms; reader.observe 1.578ms; replica.apply-delta 0.059ms; replica.apply-delta 0.056ms; replica.apply-delta 0.028ms |
| a2d6551deefc6a6c000000000001f289 | 58.909 | 18.862 | n/a | 0.000 | 0.000 | 0.177 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.870 | 18.862 | 0.320 | 39.870 | node-14/thread-4/socket.wait-first-byte | reader.observe 1.495ms; replica.apply-delta 0.076ms; replica.apply-delta 0.068ms; replica.apply-delta 0.056ms; replica.apply-delta 0.056ms |
| 67bb63daf1d38a980000000000065eb4 | 53.615 | 16.348 | n/a | 0.000 | 0.000 | 0.373 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.894 | 16.348 | 0.305 | 36.894 | node-14/thread-3/socket.wait-first-byte | reader.observe 2.021ms; reader.observe 1.578ms; replica.apply-delta 0.059ms; replica.apply-delta 0.056ms; replica.apply-delta 0.028ms |
| 67bb63daf1d38a980000000000065eaf | 53.144 | 11.034 | n/a | 0.000 | 0.000 | 0.532 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.577 | 11.034 | 0.208 | 41.577 | node-14/thread-3/socket.wait-first-byte | reader.observe 2.021ms; reader.observe 1.578ms; replica.apply-delta 0.059ms; replica.apply-delta 0.056ms |
| 67bb63daf1d38a980000000000065eb1 | 52.411 | 19.268 | n/a | 0.000 | 0.000 | 0.343 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 32.800 | 19.268 | 0.368 | 32.800 | node-14/thread-3/socket.wait-first-byte | reader.observe 2.021ms; replica.apply-delta 0.059ms; replica.apply-delta 0.056ms |
| 67bb63daf1d38a980000000000065eb5 | 49.959 | 10.123 | n/a | 0.000 | 0.000 | 0.591 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.245 | 10.123 | 0.203 | 39.245 | node-14/thread-3/socket.wait-first-byte | reader.observe 1.578ms; reader.observe 1.428ms; reader.observe 1.227ms; replica.apply-delta 0.028ms; replica.apply-delta 0.025ms |
| a2d6551deefc6a6c000000000001f288 | 48.948 | 16.094 | n/a | 0.000 | 0.000 | 0.425 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 32.429 | 16.094 | 0.329 | 32.429 | node-14/thread-4/socket.wait-first-byte | replica.apply-delta 0.076ms; replica.apply-delta 0.068ms |
| a2d6551deefc6a6c000000000001ee02 | 40.050 | 25.473 | n/a | 3.306 | 0.000 | 1.287 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.983 | 28.779 | 0.719 | 9.983 | node-14/thread-4/reader.execute | none observed |
| 67bb63daf1d38a980000000000065eb0 | 35.117 | 20.606 | n/a | 0.000 | 0.000 | 0.742 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.768 | 20.606 | 0.587 | 13.768 | node-14/thread-3/socket.wait-first-byte | replica.apply-delta 0.059ms; replica.apply-delta 0.056ms |
| 67bb63daf1d38a980000000000065979 | 28.346 | 6.029 | n/a | 0.000 | 0.000 | 2.900 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.417 | 6.029 | 0.213 | 19.417 | node-14/thread-3/socket.wait-first-byte | none observed |
| 86d39338bcabdef900000000000001e3 | 23.706 | 23.504 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.201 | 23.504 | 0.992 | 0.201 | node-14/thread-6/replica.pull-at | none observed |

## P1 / outside-phases / read (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.076 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 |
| p99 | 0.076 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a2d6551deefc6a6c000000000001f29c | 0.076 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | uncovered | none observed |

## P3 / outside-phases / read (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.855 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.558 | 201.621 | 0.059 | n/a | 0.200 | 0.000 | n/a | n/a | 0.300 | 0.000 | 0.000 | 0.300 |
| p99 | 215.890 | n/a | n/a | n/a | 1.618 | n/a | 0.000 | 0.000 | 10.661 | 205.517 | 25.619 | n/a | 3.129 | 0.000 | n/a | n/a | 49.986 | 1.618 | 0.011 | 49.986 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e3c3bfafca350d0000000000000068 | 215.890 | 0.000 | n/a | 0.000 | 0.000 | 10.661 | 204.711 | 0.073 | n/a | 0.198 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-66/journal/page | none observed |
| 54e3c3bfafca350d0000000000000009 | 212.375 | 0.000 | n/a | 0.000 | 0.000 | 7.824 | 202.828 | 0.096 | n/a | 0.617 | 0.000 | n/a | n/a | 1.010 | 0.000 | 0.000 | 1.010 | gw-r/thread-45/journal/page | none observed |
| 54e3c3bfafca350d0000000000000008 | 212.243 | 0.000 | n/a | 0.000 | 0.000 | 6.645 | 203.932 | 0.134 | n/a | 0.511 | 0.000 | n/a | n/a | 1.021 | 0.000 | 0.000 | 1.021 | gw-r/thread-50/journal/page | none observed |
| 54e3c3bfafca350d000000000000000a | 210.551 | 0.000 | n/a | 0.000 | 0.000 | 2.233 | 204.660 | 0.161 | n/a | 3.129 | 0.000 | n/a | n/a | 0.368 | 0.000 | 0.000 | 0.368 | gw-r/thread-46/journal/page | none observed |
| 54e3c3bfafca350d0000000000000006 | 209.047 | 0.000 | n/a | 0.000 | 0.000 | 2.367 | 205.517 | 0.087 | n/a | 0.265 | 0.000 | n/a | n/a | 0.812 | 0.000 | 0.000 | 0.812 | gw-r/thread-50/journal/page | none observed |
| 54e3c3bfafca350d0000000000000098 | 208.760 | 0.000 | n/a | 0.000 | 0.000 | 1.280 | 205.346 | 0.089 | n/a | 1.702 | 0.000 | n/a | n/a | 0.343 | 0.000 | 0.000 | 0.343 | gw-r/thread-49/journal/page | none observed |
| 54e3c3bfafca350d000000000000008d | 207.430 | 0.000 | n/a | 0.000 | 0.000 | 1.010 | 205.504 | 0.230 | n/a | 0.386 | 0.000 | n/a | n/a | 0.300 | 0.000 | 0.000 | 0.300 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d0000000000000007 | 207.132 | 0.000 | n/a | 0.000 | 0.000 | 2.117 | 203.562 | 0.092 | n/a | 0.609 | 0.000 | n/a | n/a | 0.751 | 0.000 | 0.000 | 0.751 | gw-r/thread-47/journal/page | none observed |
| 54e3c3bfafca350d000000000000000b | 205.824 | 0.000 | n/a | 0.000 | 0.000 | 1.618 | 203.192 | 0.125 | n/a | 0.492 | 0.000 | n/a | n/a | 0.396 | 0.000 | 0.000 | 0.396 | gw-r/thread-50/journal/page | none observed |
| 54e3c3bfafca350d00000000000000c9 | 205.404 | 0.000 | n/a | 0.000 | 0.000 | 2.329 | 202.152 | 0.121 | n/a | 0.435 | 0.000 | n/a | n/a | 0.367 | 0.000 | 0.000 | 0.367 | gw-r/thread-66/journal/page | none observed |
| 54e3c3bfafca350d0000000000000061 | 205.019 | 0.000 | n/a | 0.000 | 0.000 | 2.000 | 202.250 | 0.059 | n/a | 0.567 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-45/journal/page | none observed |
| 54e3c3bfafca350d000000000000008e | 205.014 | 0.000 | n/a | 0.000 | 0.000 | 1.701 | 202.838 | 0.059 | n/a | 0.177 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-69/journal/page | none observed |
| 54e3c3bfafca350d000000000000000c | 205.002 | 0.000 | n/a | 0.000 | 0.000 | 2.480 | 201.878 | 0.073 | n/a | 0.247 | 0.000 | n/a | n/a | 0.325 | 0.000 | 0.000 | 0.325 | gw-r/thread-46/journal/page | none observed |
| 54e3c3bfafca350d0000000000000093 | 204.890 | 0.000 | n/a | 0.000 | 0.000 | 1.983 | 202.491 | 0.018 | n/a | 0.186 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-68/journal/page | none observed |
| 54e3c3bfafca350d0000000000000089 | 204.885 | 0.000 | n/a | 0.000 | 0.000 | 2.409 | 200.931 | 0.054 | n/a | 0.929 | 0.000 | n/a | n/a | 0.563 | 0.000 | 0.000 | 0.563 | gw-r/thread-47/journal/page | none observed |
| 54e3c3bfafca350d0000000000000060 | 204.836 | 0.000 | n/a | 0.000 | 0.000 | 2.143 | 202.071 | 0.060 | n/a | 0.277 | 0.000 | n/a | n/a | 0.286 | 0.000 | 0.000 | 0.286 | gw-r/thread-44/journal/page | none observed |
| 54e3c3bfafca350d00000000000000c8 | 204.690 | 0.000 | n/a | 0.000 | 0.000 | 2.115 | 201.983 | 0.026 | n/a | 0.234 | 0.000 | n/a | n/a | 0.333 | 0.000 | 0.000 | 0.333 | gw-r/thread-49/journal/page | none observed |
| 54e3c3bfafca350d00000000000000f3 | 204.516 | 0.000 | n/a | 0.000 | 0.000 | 1.317 | 202.450 | 0.053 | n/a | 0.535 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-81/journal/page | none observed |
| 54e3c3bfafca350d00000000000000f0 | 204.221 | 0.000 | n/a | 0.000 | 0.000 | 1.127 | 201.311 | 0.036 | n/a | 1.352 | 0.000 | n/a | n/a | 0.395 | 0.000 | 0.000 | 0.395 | gw-r/thread-48/journal/page | none observed |
| 54e3c3bfafca350d0000000000000066 | 204.110 | 0.000 | n/a | 0.000 | 0.000 | 1.436 | 201.931 | 0.016 | n/a | 0.228 | 0.000 | n/a | n/a | 0.499 | 0.000 | 0.000 | 0.499 | gw-r/thread-45/journal/page | none observed |

## P3 / outside-phases / internal (26 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 398.496 | n/a | n/a | n/a | 3.572 | n/a | 0.000 | 0.000 | 1.383 | 385.178 | 0.029 | n/a | 0.152 | 0.000 | n/a | n/a | 0.930 | 3.572 | 0.027 | 0.930 |
| p99 | 1052.872 | n/a | n/a | n/a | 44.973 | n/a | 7.872 | 0.000 | 44.217 | 1014.019 | 16.274 | n/a | 0.942 | 0.000 | n/a | n/a | 38.279 | 52.845 | 0.672 | 38.279 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d50000000000000018 | 1052.872 | 0.243 | n/a | 0.000 | 0.000 | 44.217 | 1004.748 | 0.163 | n/a | 0.474 | 0.000 | n/a | n/a | 3.026 | 0.243 | 0.000 | 3.026 | gw-r/thread-45/journal/page | none observed |
| c57e6a339dee12d5000000000000001d | 1034.870 | 34.559 | n/a | 0.000 | 0.000 | 6.901 | 990.823 | 0.026 | n/a | 0.312 | 0.000 | n/a | n/a | 2.249 | 34.559 | 0.033 | 2.249 | gw-r/thread-47/journal/page | none observed |
| c57e6a339dee12d5000000000000001c | 1017.699 | 0.271 | n/a | 0.000 | 0.000 | 0.979 | 1014.019 | 0.179 | n/a | 0.531 | 0.000 | n/a | n/a | 1.719 | 0.271 | 0.000 | 1.719 | gw-r/thread-45/journal/page | none observed |
| c57e6a339dee12d50000000000000019 | 1012.833 | 0.410 | n/a | 0.000 | 0.000 | 3.434 | 1006.608 | 0.094 | n/a | 0.552 | 0.000 | n/a | n/a | 1.734 | 0.410 | 0.000 | 1.734 | gw-r/thread-46/journal/page | none observed |
| c57e6a339dee12d50000000000000017 | 1011.145 | 0.287 | n/a | 0.000 | 0.000 | 3.063 | 1005.079 | 0.202 | n/a | 0.942 | 0.000 | n/a | n/a | 1.573 | 0.287 | 0.000 | 1.573 | gw-r/thread-46/journal/page | none observed |
| c57e6a339dee12d5000000000000001b | 1010.622 | 0.302 | n/a | 0.000 | 0.000 | 2.060 | 1007.414 | 0.018 | n/a | 0.184 | 0.000 | n/a | n/a | 0.645 | 0.302 | 0.000 | 0.645 | gw-r/thread-48/journal/page | none observed |
| c57e6a339dee12d5000000000000001a | 1008.331 | 0.178 | n/a | 0.000 | 0.000 | 2.145 | 1003.433 | 0.147 | n/a | 0.438 | 0.000 | n/a | n/a | 1.988 | 0.178 | 0.000 | 1.988 | gw-r/thread-44/journal/page | none observed |
| c57e6a339dee12d5000000000000007f | 1007.946 | 0.317 | n/a | 0.000 | 0.000 | 1.289 | 1002.501 | 0.126 | n/a | 0.643 | 0.000 | n/a | n/a | 3.069 | 0.317 | 0.000 | 3.069 | gw-r/thread-68/journal/page | none observed |
| c57e6a339dee12d500000000000000a6 | 1004.936 | 0.143 | n/a | 0.000 | 0.000 | 1.289 | 1002.037 | 0.137 | n/a | 0.166 | 0.000 | n/a | n/a | 1.163 | 0.143 | 0.000 | 1.163 | gw-r/thread-71/journal/page | none observed |
| c57e6a339dee12d5000000000000007a | 1004.284 | 0.160 | n/a | 0.000 | 0.000 | 0.894 | 1002.049 | 0.047 | n/a | 0.205 | 0.000 | n/a | n/a | 0.930 | 0.160 | 0.000 | 0.930 | gw-r/thread-47/journal/page | none observed |
| c57e6a339dee12d500000000000000a5 | 956.176 | 3.461 | n/a | 0.000 | 0.000 | 1.203 | 951.354 | 0.014 | n/a | 0.080 | 0.000 | n/a | n/a | 0.063 | 3.461 | 0.004 | 0.063 | gw-r/thread-71/journal/page | none observed |
| c57e6a339dee12d500000000000000a1 | 600.456 | 44.973 | n/a | 7.872 | 0.000 | 1.066 | 546.233 | 0.029 | n/a | 0.126 | 0.000 | n/a | n/a | 0.157 | 52.845 | 0.088 | 0.157 | gw-r/thread-44/journal/page | none observed |
| c57e6a339dee12d5000000000000007d | 576.501 | 3.186 | n/a | 0.000 | 0.000 | 1.150 | 571.089 | 0.871 | n/a | 0.080 | 0.000 | n/a | n/a | 0.125 | 3.186 | 0.006 | 0.125 | gw-r/thread-66/journal/page | none observed |
| c57e6a339dee12d50000000000000058 | 398.496 | 10.577 | n/a | 0.000 | 0.000 | 2.389 | 385.178 | 0.016 | n/a | 0.166 | 0.000 | n/a | n/a | 0.169 | 10.577 | 0.027 | 0.169 | gw-r/thread-44/journal/page | none observed |
| c57e6a339dee12d5000000000000007c | 397.917 | 13.402 | n/a | 0.000 | 0.000 | 2.772 | 381.345 | 0.041 | n/a | 0.134 | 0.000 | n/a | n/a | 0.222 | 13.402 | 0.034 | 0.222 | gw-r/thread-47/journal/page | none observed |
| c57e6a339dee12d5000000000000005a | 349.206 | 3.995 | n/a | 0.000 | 0.000 | 3.435 | 341.071 | 0.017 | n/a | 0.094 | 0.000 | n/a | n/a | 0.595 | 3.995 | 0.011 | 0.595 | gw-r/thread-50/journal/page | none observed |
| c57e6a339dee12d5000000000000005c | 310.135 | 9.982 | n/a | 0.000 | 0.000 | 3.671 | 296.020 | 0.016 | n/a | 0.152 | 0.000 | n/a | n/a | 0.294 | 9.982 | 0.032 | 0.294 | gw-r/thread-70/journal/page | none observed |
| c57e6a339dee12d50000000000000079 | 228.060 | 6.297 | n/a | 0.000 | 0.000 | 2.972 | 218.423 | 0.115 | n/a | 0.104 | 0.000 | n/a | n/a | 0.148 | 6.297 | 0.028 | 0.148 | gw-r/thread-48/journal/page | none observed |
| c57e6a339dee12d5000000000000009e | 204.415 | 5.512 | n/a | 0.000 | 0.000 | 1.383 | 197.186 | 0.015 | n/a | 0.121 | 0.000 | n/a | n/a | 0.198 | 5.512 | 0.027 | 0.198 | gw-r/thread-44/journal/page | none observed |
| c57e6a339dee12d50000000000000080 | 123.571 | 15.753 | n/a | 0.000 | 0.000 | 2.868 | 88.230 | 16.274 | n/a | 0.152 | 0.000 | n/a | n/a | 0.293 | 15.753 | 0.127 | 0.293 | gw-r/thread-49/journal/page | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 369.407 | n/a | n/a | n/a | 8.828 | n/a | 0.000 | 0.000 | 1.523 | 358.423 | 0.043 | n/a | 0.267 | 0.000 | n/a | n/a | 0.392 | 8.828 | 0.019 | 0.392 |
| p99 | 618.284 | n/a | n/a | n/a | 16.355 | n/a | 0.000 | 0.000 | 4.058 | 603.639 | 0.055 | n/a | 2.152 | 0.000 | n/a | n/a | 3.243 | 16.355 | 0.049 | 3.243 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d50000000000000023 | 618.284 | 6.974 | n/a | 0.000 | 0.000 | 4.058 | 603.639 | 0.055 | n/a | 0.314 | 0.000 | n/a | n/a | 3.243 | 6.974 | 0.011 | 3.243 | gw-r/thread-67/journal/page | none observed |
| c57e6a339dee12d50000000000000021 | 570.689 | 10.687 | n/a | 0.000 | 0.000 | 1.523 | 556.124 | 0.042 | n/a | 2.152 | 0.000 | n/a | n/a | 0.162 | 10.687 | 0.019 | 0.162 | gw-r/thread-69/journal/page | none observed |
| c57e6a339dee12d50000000000000020 | 369.407 | 8.828 | n/a | 0.000 | 0.000 | 1.344 | 358.423 | 0.050 | n/a | 0.134 | 0.000 | n/a | n/a | 0.628 | 8.828 | 0.024 | 0.628 | gw-r/thread-44/journal/page | none observed |
| c57e6a339dee12d50000000000000024 | 331.271 | 16.355 | n/a | 0.000 | 0.000 | 2.495 | 311.718 | 0.043 | n/a | 0.267 | 0.000 | n/a | n/a | 0.392 | 16.355 | 0.049 | 0.392 | gw-r/thread-70/journal/page | none observed |

## P3 / baseline / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 149.623 | n/a | n/a | n/a | 4.796 | n/a | 0.000 | 0.000 | 1.546 | 141.853 | 0.024 | n/a | 0.191 | 0.000 | n/a | n/a | 0.281 | 4.796 | 0.009 | 0.281 |
| p99 | 971.832 | n/a | n/a | n/a | 8.135 | n/a | 0.000 | 0.000 | 3.439 | 965.448 | 0.104 | n/a | 0.260 | 0.000 | n/a | n/a | 6.169 | 8.135 | 0.418 | 6.169 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d50000000000000028 | 971.832 | 4.066 | n/a | 0.000 | 0.000 | 1.641 | 965.448 | 0.035 | n/a | 0.260 | 0.000 | n/a | n/a | 0.381 | 4.066 | 0.004 | 0.381 | gw-r/thread-70/journal/page | none observed |
| c57e6a339dee12d50000000000000029 | 873.045 | 8.135 | n/a | 0.000 | 0.000 | 3.439 | 861.077 | 0.024 | n/a | 0.191 | 0.000 | n/a | n/a | 0.178 | 8.135 | 0.009 | 0.178 | gw-r/thread-46/journal/page | none observed |
| c57e6a339dee12d5000000000000002a | 149.623 | 5.628 | n/a | 0.000 | 0.000 | 1.546 | 141.853 | 0.104 | n/a | 0.210 | 0.000 | n/a | n/a | 0.281 | 5.628 | 0.038 | 0.281 | gw-r/thread-67/journal/page | none observed |
| c57e6a339dee12d50000000000000027 | 11.480 | 4.796 | n/a | 0.000 | 0.000 | 0.514 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.169 | 4.796 | 0.418 | 6.169 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 689.771 | n/a | n/a | n/a | 4.182 | n/a | 0.000 | 0.000 | 1.506 | 682.476 | 0.037 | n/a | 0.229 | 0.000 | n/a | n/a | 0.315 | 4.182 | 0.006 | 0.315 |
| p99 | 1005.167 | n/a | n/a | n/a | 11.044 | n/a | 0.000 | 0.000 | 2.466 | 1001.714 | 0.060 | n/a | 0.413 | 0.000 | n/a | n/a | 1.449 | 11.044 | 0.037 | 1.449 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d5000000000000002f | 1005.167 | 0.241 | n/a | 0.000 | 0.000 | 1.506 | 1001.714 | 0.027 | n/a | 0.229 | 0.000 | n/a | n/a | 1.449 | 0.241 | 0.000 | 1.449 | gw-r/thread-71/journal/page | none observed |
| c57e6a339dee12d5000000000000002d | 689.771 | 4.182 | n/a | 0.000 | 0.000 | 2.466 | 682.476 | 0.037 | n/a | 0.413 | 0.000 | n/a | n/a | 0.197 | 4.182 | 0.006 | 0.197 | gw-r/thread-68/journal/page | none observed |
| c57e6a339dee12d5000000000000002c | 295.360 | 11.044 | n/a | 0.000 | 0.000 | 1.243 | 282.513 | 0.060 | n/a | 0.185 | 0.000 | n/a | n/a | 0.315 | 11.044 | 0.037 | 0.315 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 260.984 | n/a | n/a | n/a | 8.111 | n/a | 0.000 | 0.000 | 1.518 | 247.327 | 0.099 | n/a | 0.248 | 0.000 | n/a | n/a | 2.743 | 8.111 | 0.031 | 2.743 |
| p99 | 1005.858 | n/a | n/a | n/a | 27.374 | n/a | 0.000 | 0.000 | 2.437 | 1002.488 | 0.135 | n/a | 0.427 | 0.000 | n/a | n/a | 22.717 | 27.374 | 0.534 | 22.717 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d50000000000000035 | 1005.858 | 0.280 | n/a | 0.000 | 0.000 | 1.518 | 1002.488 | 0.099 | n/a | 0.418 | 0.000 | n/a | n/a | 1.054 | 0.280 | 0.000 | 1.054 | gw-r/thread-70/journal/page | none observed |
| c57e6a339dee12d50000000000000031 | 783.272 | 9.493 | n/a | 0.000 | 0.000 | 1.625 | 771.052 | 0.135 | n/a | 0.427 | 0.000 | n/a | n/a | 0.539 | 9.493 | 0.012 | 0.539 | gw-r/thread-46/journal/page | none observed |
| c57e6a339dee12d50000000000000032 | 260.984 | 8.111 | n/a | 0.000 | 0.000 | 2.437 | 247.327 | 0.118 | n/a | 0.248 | 0.000 | n/a | n/a | 2.743 | 8.111 | 0.031 | 2.743 | gw-r/thread-70/journal/page | none observed |
| c57e6a339dee12d50000000000000030 | 51.283 | 27.374 | n/a | 0.000 | 0.000 | 1.193 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.717 | 27.374 | 0.534 | 22.717 | node-14/thread-2/replica.fetch-feed | none observed |
| c57e6a339dee12d50000000000000034 | 14.328 | 2.793 | n/a | 0.000 | 0.000 | 0.769 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.766 | 2.793 | 0.195 | 10.766 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L16 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 247.044 | n/a | n/a | n/a | 8.487 | n/a | 0.000 | 0.000 | 1.142 | 236.504 | 0.030 | n/a | 0.127 | 0.000 | n/a | n/a | 0.694 | 8.487 | 0.036 | 0.694 |
| p99 | 970.857 | n/a | n/a | n/a | 10.283 | n/a | 0.000 | 0.000 | 1.362 | 960.090 | 0.046 | n/a | 0.259 | 0.000 | n/a | n/a | 40.125 | 10.283 | 0.202 | 40.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d5000000000000003c | 970.857 | 8.487 | n/a | 0.000 | 0.000 | 1.316 | 960.090 | 0.040 | n/a | 0.127 | 0.000 | n/a | n/a | 0.796 | 8.487 | 0.009 | 0.796 | gw-r/thread-71/journal/page | none observed |
| c57e6a339dee12d50000000000000039 | 592.103 | 4.071 | n/a | 0.000 | 0.000 | 0.816 | 586.838 | 0.046 | n/a | 0.108 | 0.000 | n/a | n/a | 0.224 | 4.071 | 0.007 | 0.224 | gw-r/thread-70/journal/page | none observed |
| c57e6a339dee12d50000000000000038 | 247.044 | 8.958 | n/a | 0.000 | 0.000 | 1.142 | 236.504 | 0.030 | n/a | 0.259 | 0.000 | n/a | n/a | 0.151 | 8.958 | 0.036 | 0.151 | gw-r/thread-45/journal/page | none observed |
| c57e6a339dee12d5000000000000003b | 60.189 | 6.371 | n/a | 0.000 | 0.000 | 1.362 | 51.574 | 0.012 | n/a | 0.177 | 0.000 | n/a | n/a | 0.694 | 6.371 | 0.106 | 0.694 | gw-r/thread-50/journal/page | none observed |
| c57e6a339dee12d50000000000000037 | 51.024 | 10.283 | n/a | 0.000 | 0.000 | 0.616 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.125 | 10.283 | 0.202 | 40.125 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L64 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 326.571 | n/a | n/a | n/a | 6.241 | n/a | 0.000 | 0.000 | 1.439 | 310.232 | 0.075 | n/a | 0.243 | 0.000 | n/a | n/a | 0.187 | 6.241 | 0.039 | 0.187 |
| p99 | 935.953 | n/a | n/a | n/a | 12.753 | n/a | 0.000 | 0.000 | 8.381 | 931.707 | 4.035 | n/a | 0.728 | 0.000 | n/a | n/a | 10.712 | 12.753 | 0.327 | 10.712 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d5000000000000003f | 935.953 | 2.674 | n/a | 0.000 | 0.000 | 0.816 | 931.707 | 0.374 | n/a | 0.285 | 0.000 | n/a | n/a | 0.097 | 2.674 | 0.003 | 0.097 | gw-r/thread-66/journal/page | none observed |
| c57e6a339dee12d50000000000000041 | 749.385 | 8.325 | n/a | 0.000 | 0.000 | 8.381 | 728.326 | 4.035 | n/a | 0.131 | 0.000 | n/a | n/a | 0.187 | 8.325 | 0.011 | 0.187 | gw-r/thread-67/journal/page | none observed |
| c57e6a339dee12d50000000000000044 | 326.571 | 12.753 | n/a | 0.000 | 0.000 | 1.439 | 310.232 | 0.043 | n/a | 0.728 | 0.000 | n/a | n/a | 1.376 | 12.753 | 0.039 | 1.376 | gw-r/thread-67/journal/page | none observed |
| c57e6a339dee12d50000000000000043 | 64.302 | 4.260 | n/a | 0.000 | 0.000 | 1.183 | 58.411 | 0.075 | n/a | 0.243 | 0.000 | n/a | n/a | 0.130 | 4.260 | 0.066 | 0.130 | gw-r/thread-68/journal/page | none observed |
| c57e6a339dee12d5000000000000003e | 19.107 | 6.241 | n/a | 0.000 | 0.000 | 2.154 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.712 | 6.241 | 0.327 | 10.712 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L256 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 993.200 | n/a | n/a | n/a | 7.373 | n/a | 0.000 | 0.000 | 1.500 | 975.701 | 0.129 | n/a | 0.483 | 0.000 | n/a | n/a | 0.285 | 7.373 | 0.013 | 0.285 |
| p99 | 1009.931 | n/a | n/a | n/a | 13.204 | n/a | 0.000 | 0.000 | 3.448 | 1003.284 | 8.789 | n/a | 2.293 | 0.000 | n/a | n/a | 4.869 | 13.204 | 0.041 | 4.869 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d50000000000000046 | 1009.931 | 0.191 | n/a | 0.000 | 0.000 | 1.197 | 1003.284 | 0.129 | n/a | 0.261 | 0.000 | n/a | n/a | 4.869 | 0.191 | 0.000 | 4.869 | gw-r/thread-71/journal/page | none observed |
| c57e6a339dee12d50000000000000048 | 993.200 | 13.204 | n/a | 0.000 | 0.000 | 3.448 | 975.701 | 0.079 | n/a | 0.483 | 0.000 | n/a | n/a | 0.285 | 13.204 | 0.013 | 0.285 | gw-r/thread-70/journal/page | none observed |
| c57e6a339dee12d50000000000000047 | 182.020 | 7.373 | n/a | 0.000 | 0.000 | 1.500 | 161.887 | 8.789 | n/a | 2.293 | 0.000 | n/a | n/a | 0.178 | 7.373 | 0.041 | 0.178 | gw-r/thread-50/journal/page | none observed |

## P3 / L1024 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 275.713 | n/a | n/a | n/a | 6.569 | n/a | 0.000 | 0.000 | 1.478 | 264.363 | 0.087 | n/a | 0.187 | 0.000 | n/a | n/a | 0.203 | 6.569 | 0.014 | 0.203 |
| p99 | 959.979 | n/a | n/a | n/a | 13.664 | n/a | 0.000 | 0.000 | 2.188 | 935.454 | 8.283 | n/a | 0.284 | 0.000 | n/a | n/a | 9.278 | 13.664 | 0.401 | 9.278 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d50000000000000049 | 959.979 | 13.664 | n/a | 0.000 | 0.000 | 2.188 | 935.454 | 8.283 | n/a | 0.187 | 0.000 | n/a | n/a | 0.203 | 13.664 | 0.014 | 0.203 | gw-r/thread-45/journal/page | none observed |
| c57e6a339dee12d5000000000000004d | 633.226 | 6.518 | n/a | 0.000 | 0.000 | 1.478 | 624.778 | 0.087 | n/a | 0.193 | 0.000 | n/a | n/a | 0.172 | 6.518 | 0.010 | 0.172 | gw-r/thread-69/journal/page | none observed |
| c57e6a339dee12d5000000000000004c | 275.713 | 8.882 | n/a | 0.000 | 0.000 | 1.531 | 264.363 | 0.099 | n/a | 0.284 | 0.000 | n/a | n/a | 0.554 | 8.882 | 0.032 | 0.554 | gw-r/thread-67/journal/page | none observed |
| c57e6a339dee12d5000000000000004b | 16.375 | 6.569 | n/a | 0.000 | 0.000 | 0.528 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.278 | 6.569 | 0.401 | 9.278 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / recovery / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 905.145 | n/a | n/a | n/a | 15.865 | n/a | 0.000 | 0.000 | 2.190 | 884.886 | 0.043 | n/a | 0.240 | 0.000 | n/a | n/a | 0.299 | 15.865 | 0.018 | 0.299 |
| p99 | 946.437 | n/a | n/a | n/a | 16.780 | n/a | 0.934 | 0.000 | 3.745 | 936.265 | 0.231 | n/a | 0.266 | 0.000 | n/a | n/a | 0.326 | 17.714 | 0.148 | 0.326 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d50000000000000050 | 946.437 | 8.184 | n/a | 0.000 | 0.000 | 1.441 | 936.265 | 0.043 | n/a | 0.240 | 0.000 | n/a | n/a | 0.263 | 8.184 | 0.009 | 0.263 | gw-r/thread-66/journal/page | none observed |
| c57e6a339dee12d5000000000000004f | 905.145 | 15.865 | n/a | 0.000 | 0.000 | 3.745 | 884.886 | 0.231 | n/a | 0.119 | 0.000 | n/a | n/a | 0.299 | 15.865 | 0.018 | 0.299 | gw-r/thread-50/journal/page | none observed |
| c57e6a339dee12d50000000000000051 | 119.333 | 16.780 | n/a | 0.934 | 0.000 | 2.190 | 98.813 | 0.024 | n/a | 0.266 | 0.000 | n/a | n/a | 0.326 | 17.714 | 0.148 | 0.326 | gw-r/thread-46/journal/page | none observed |

## P3 / p4mix / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 835.718 | n/a | n/a | n/a | 0.325 | n/a | 0.000 | 0.000 | 1.025 | 826.794 | 0.019 | n/a | 0.181 | 0.000 | n/a | n/a | 1.249 | 0.325 | 0.000 | 1.249 |
| p99 | 1005.823 | n/a | n/a | n/a | 5.170 | n/a | 0.000 | 0.000 | 3.174 | 1002.503 | 0.096 | n/a | 0.258 | 0.000 | n/a | n/a | 17.594 | 5.170 | 0.205 | 17.594 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d50000000000000056 | 1005.823 | 0.325 | n/a | 0.000 | 0.000 | 1.413 | 1002.503 | 0.075 | n/a | 0.258 | 0.000 | n/a | n/a | 1.249 | 0.325 | 0.000 | 1.249 | gw-r/thread-68/journal/page | none observed |
| c57e6a339dee12d50000000000000054 | 1004.260 | 0.149 | n/a | 0.000 | 0.000 | 1.025 | 1001.542 | 0.019 | n/a | 0.189 | 0.000 | n/a | n/a | 1.334 | 0.149 | 0.000 | 1.334 | gw-r/thread-68/journal/page | none observed |
| c57e6a339dee12d50000000000000053 | 835.718 | 5.170 | n/a | 0.000 | 0.000 | 3.174 | 826.794 | 0.096 | n/a | 0.181 | 0.000 | n/a | n/a | 0.303 | 5.170 | 0.006 | 0.303 | gw-r/thread-46/journal/page | none observed |
| c57e6a339dee12d50000000000000055 | 23.332 | 4.792 | n/a | 0.000 | 0.000 | 0.946 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.594 | 4.792 | 0.205 | 17.594 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h1 / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 373.354 | n/a | n/a | n/a | 10.764 | n/a | 0.000 | 0.000 | 1.550 | 365.088 | 0.028 | n/a | 0.166 | 0.000 | n/a | n/a | 0.251 | 10.764 | 0.024 | 0.251 |
| p99 | 874.301 | n/a | n/a | n/a | 18.853 | n/a | 0.000 | 0.000 | 2.083 | 861.963 | 0.160 | n/a | 0.270 | 0.000 | n/a | n/a | 33.373 | 18.853 | 0.255 | 33.373 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d5000000000000005d | 874.301 | 10.764 | n/a | 0.000 | 0.000 | 1.046 | 861.963 | 0.138 | n/a | 0.166 | 0.000 | n/a | n/a | 0.222 | 10.764 | 0.012 | 0.222 | gw-r/thread-68/journal/page | none observed |
| c57e6a339dee12d5000000000000005f | 592.366 | 18.853 | n/a | 0.000 | 0.000 | 2.083 | 570.881 | 0.023 | n/a | 0.204 | 0.000 | n/a | n/a | 0.323 | 18.853 | 0.032 | 0.323 | gw-r/thread-48/journal/page | none observed |
| c57e6a339dee12d50000000000000066 | 447.727 | 10.877 | n/a | 0.000 | 0.000 | 1.550 | 434.788 | 0.056 | n/a | 0.205 | 0.000 | n/a | n/a | 0.251 | 10.877 | 0.024 | 0.251 | gw-r/thread-69/journal/page | none observed |
| c57e6a339dee12d50000000000000062 | 373.354 | 6.297 | n/a | 0.000 | 0.000 | 1.585 | 365.088 | 0.020 | n/a | 0.096 | 0.000 | n/a | n/a | 0.268 | 6.297 | 0.017 | 0.268 | gw-r/thread-71/journal/page | none observed |
| c57e6a339dee12d50000000000000063 | 257.086 | 3.869 | n/a | 0.000 | 0.000 | 1.098 | 251.583 | 0.028 | n/a | 0.270 | 0.000 | n/a | n/a | 0.239 | 3.869 | 0.015 | 0.239 | gw-r/thread-48/journal/page | none observed |
| c57e6a339dee12d50000000000000064 | 173.367 | 7.898 | n/a | 0.000 | 0.000 | 1.678 | 163.381 | 0.160 | n/a | 0.135 | 0.000 | n/a | n/a | 0.116 | 7.898 | 0.046 | 0.116 | gw-r/thread-69/journal/page | none observed |
| c57e6a339dee12d5000000000000005e | 45.977 | 11.727 | n/a | 0.000 | 0.000 | 0.878 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.373 | 11.727 | 0.255 | 33.373 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow3 / internal (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 205.878 | n/a | n/a | n/a | 6.209 | n/a | 0.000 | 0.000 | 1.483 | 195.903 | 0.091 | n/a | 0.094 | 0.000 | n/a | n/a | 0.945 | 6.209 | 0.047 | 0.945 |
| p99 | 1007.992 | n/a | n/a | n/a | 212.033 | n/a | 7.586 | 0.000 | 3.796 | 1004.938 | 0.821 | n/a | 0.238 | 0.000 | n/a | n/a | 22.915 | 219.619 | 0.612 | 22.915 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d50000000000000071 | 1007.992 | 0.208 | n/a | 0.000 | 0.000 | 1.403 | 1004.938 | 0.378 | n/a | 0.121 | 0.000 | n/a | n/a | 0.945 | 0.208 | 0.000 | 0.945 | gw-r/thread-45/journal/page | none observed |
| c57e6a339dee12d50000000000000073 | 760.947 | 212.033 | n/a | 7.586 | 0.000 | 2.010 | 529.823 | 0.032 | n/a | 0.094 | 0.000 | n/a | n/a | 9.369 | 219.619 | 0.289 | 9.369 | gw-r/thread-71/journal/page | none observed |
| c57e6a339dee12d50000000000000076 | 393.715 | 165.405 | n/a | 6.258 | 0.000 | 1.302 | 215.150 | 0.126 | n/a | 0.238 | 0.000 | n/a | n/a | 5.237 | 171.662 | 0.436 | 5.237 | gw-r/thread-47/journal/page | none observed |
| c57e6a339dee12d50000000000000068 | 215.700 | 6.292 | n/a | 0.000 | 0.000 | 1.513 | 207.520 | 0.051 | n/a | 0.086 | 0.000 | n/a | n/a | 0.238 | 6.292 | 0.029 | 0.238 | gw-r/thread-50/journal/page | none observed |
| c57e6a339dee12d5000000000000006b | 205.878 | 5.404 | n/a | 0.000 | 0.000 | 3.796 | 195.903 | 0.297 | n/a | 0.149 | 0.000 | n/a | n/a | 0.330 | 5.404 | 0.026 | 0.330 | gw-r/thread-49/journal/page | none observed |
| c57e6a339dee12d5000000000000006a | 153.195 | 4.430 | n/a | 0.000 | 0.000 | 1.508 | 146.048 | 0.821 | n/a | 0.196 | 0.000 | n/a | n/a | 0.192 | 4.430 | 0.029 | 0.192 | gw-r/thread-44/journal/page | none observed |
| c57e6a339dee12d5000000000000006f | 72.001 | 3.372 | n/a | 0.000 | 0.000 | 1.483 | 66.701 | 0.091 | n/a | 0.042 | 0.000 | n/a | n/a | 0.313 | 3.372 | 0.047 | 0.313 | gw-r/thread-46/journal/page | none observed |
| c57e6a339dee12d5000000000000006d | 29.485 | 6.209 | n/a | 0.000 | 0.000 | 0.361 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.915 | 6.209 | 0.211 | 22.915 | node-14/thread-2/socket.wait-first-byte | none observed |
| c57e6a339dee12d50000000000000075 | 24.834 | 15.200 | n/a | 0.000 | 0.000 | 0.778 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.856 | 15.200 | 0.612 | 8.856 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h3 / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 231.661 | n/a | n/a | n/a | 7.019 | n/a | 0.000 | 0.000 | 1.500 | 224.649 | 0.079 | n/a | 0.195 | 0.000 | n/a | n/a | 0.181 | 7.019 | 0.020 | 0.181 |
| p99 | 1270.763 | n/a | n/a | n/a | 156.946 | n/a | 10.035 | 0.000 | 1.990 | 1095.949 | 0.428 | n/a | 0.874 | 0.000 | n/a | n/a | 18.130 | 166.981 | 0.315 | 18.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d5000000000000008c | 1270.763 | 156.946 | n/a | 10.035 | 0.000 | 1.653 | 1095.949 | 0.044 | n/a | 0.199 | 0.000 | n/a | n/a | 5.936 | 166.981 | 0.131 | 5.936 | gw-r/thread-69/journal/page | none observed |
| c57e6a339dee12d50000000000000088 | 1001.401 | 6.744 | n/a | 0.000 | 0.000 | 1.721 | 991.517 | 0.364 | n/a | 0.874 | 0.000 | n/a | n/a | 0.181 | 6.744 | 0.007 | 0.181 | gw-r/thread-69/journal/page | none observed |
| c57e6a339dee12d5000000000000008a | 742.410 | 7.093 | n/a | 0.000 | 0.000 | 1.421 | 733.178 | 0.422 | n/a | 0.185 | 0.000 | n/a | n/a | 0.112 | 7.093 | 0.010 | 0.112 | gw-r/thread-69/journal/page | none observed |
| c57e6a339dee12d50000000000000086 | 568.550 | 2.660 | n/a | 0.000 | 0.000 | 0.859 | 564.753 | 0.017 | n/a | 0.195 | 0.000 | n/a | n/a | 0.066 | 2.660 | 0.005 | 0.066 | gw-r/thread-67/journal/page | none observed |
| c57e6a339dee12d50000000000000089 | 231.661 | 4.662 | n/a | 0.000 | 0.000 | 1.990 | 224.649 | 0.079 | n/a | 0.150 | 0.000 | n/a | n/a | 0.132 | 4.662 | 0.020 | 0.132 | gw-r/thread-50/journal/page | none observed |
| c57e6a339dee12d50000000000000082 | 176.005 | 7.019 | n/a | 0.000 | 0.000 | 1.566 | 166.771 | 0.185 | n/a | 0.279 | 0.000 | n/a | n/a | 0.186 | 7.019 | 0.040 | 0.186 | gw-r/thread-47/journal/page | none observed |
| c57e6a339dee12d50000000000000083 | 164.335 | 27.099 | n/a | 2.346 | 0.000 | 1.500 | 132.175 | 0.428 | n/a | 0.561 | 0.000 | n/a | n/a | 0.224 | 29.446 | 0.179 | 0.224 | gw-r/thread-46/journal/page | none observed |
| c57e6a339dee12d50000000000000084 | 27.742 | 8.740 | n/a | 0.000 | 0.000 | 0.871 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.130 | 8.740 | 0.315 | 18.130 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow10 / internal (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 141.101 | n/a | n/a | n/a | 10.893 | n/a | 0.000 | 0.000 | 0.972 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.958 | 10.893 | 0.452 | 3.958 |
| p99 | 708.771 | n/a | n/a | n/a | 226.763 | n/a | 17.802 | 0.000 | 2.630 | 539.609 | 0.101 | n/a | 0.520 | 0.000 | n/a | n/a | 52.917 | 244.565 | 0.866 | 52.917 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d5000000000000008f | 708.771 | 155.780 | n/a | 9.678 | 0.000 | 0.931 | 539.609 | 0.101 | n/a | 0.159 | 0.000 | n/a | n/a | 2.514 | 165.458 | 0.233 | 2.514 | gw-r/thread-70/journal/page | none observed |
| c57e6a339dee12d50000000000000096 | 706.965 | 226.763 | n/a | 17.802 | 0.000 | 1.929 | 455.125 | 0.033 | n/a | 0.187 | 0.000 | n/a | n/a | 5.125 | 244.565 | 0.346 | 5.125 | gw-r/thread-46/journal/page | none observed |
| c57e6a339dee12d5000000000000009b | 386.219 | 163.304 | n/a | 11.299 | 0.000 | 2.630 | 205.679 | 0.016 | n/a | 0.290 | 0.000 | n/a | n/a | 3.002 | 174.603 | 0.452 | 3.002 | gw-r/thread-68/journal/page | none observed |
| c57e6a339dee12d5000000000000009a | 265.396 | 177.691 | n/a | 7.762 | 0.000 | 2.183 | 72.115 | 0.017 | n/a | 0.130 | 0.000 | n/a | n/a | 5.498 | 185.453 | 0.699 | 5.498 | node-14/thread-2/replica.fetch-feed | none observed |
| c57e6a339dee12d50000000000000098 | 261.452 | 191.614 | n/a | 15.312 | 0.000 | 1.609 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 52.917 | 206.926 | 0.791 | 52.917 | node-14/thread-2/replica.fetch-feed | none observed |
| c57e6a339dee12d5000000000000009c | 228.953 | 188.636 | n/a | 9.736 | 0.000 | 0.972 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.610 | 198.371 | 0.866 | 29.610 | node-14/thread-2/replica.fetch-feed | none observed |
| c57e6a339dee12d50000000000000094 | 141.101 | 3.006 | n/a | 0.000 | 0.000 | 1.202 | 136.158 | 0.023 | n/a | 0.520 | 0.000 | n/a | n/a | 0.192 | 3.006 | 0.021 | 0.192 | gw-r/thread-68/journal/page | none observed |
| c57e6a339dee12d50000000000000093 | 72.787 | 4.840 | n/a | 0.000 | 0.000 | 1.100 | 66.514 | 0.005 | n/a | 0.110 | 0.000 | n/a | n/a | 0.218 | 4.840 | 0.066 | 0.218 | gw-r/thread-47/journal/page | none observed |
| c57e6a339dee12d50000000000000090 | 18.128 | 10.893 | n/a | 0.000 | 0.000 | 0.642 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.593 | 10.893 | 0.601 | 6.593 | node-14/thread-2/replica.fetch-feed | none observed |
| c57e6a339dee12d50000000000000099 | 14.547 | 6.191 | n/a | 0.000 | 0.000 | 0.647 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.709 | 6.191 | 0.426 | 7.709 | node-14/thread-2/socket.wait-first-byte | none observed |
| c57e6a339dee12d5000000000000008e | 9.219 | 4.381 | n/a | 0.000 | 0.000 | 0.881 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.958 | 4.381 | 0.475 | 3.958 | node-14/thread-2/socket.wait-first-byte | none observed |
| c57e6a339dee12d50000000000000092 | 7.986 | 4.050 | n/a | 0.000 | 0.000 | 0.353 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.583 | 4.050 | 0.507 | 3.583 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h10 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 653.664 | n/a | n/a | n/a | 9.007 | n/a | 0.000 | 0.000 | 1.095 | 643.132 | 0.093 | n/a | 0.138 | 0.000 | n/a | n/a | 0.246 | 9.007 | 0.014 | 0.246 |
| p99 | 1009.196 | n/a | n/a | n/a | 13.173 | n/a | 0.000 | 0.000 | 7.868 | 994.208 | 3.114 | n/a | 0.305 | 0.000 | n/a | n/a | 0.735 | 13.173 | 0.060 | 0.735 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d500000000000000ab | 1009.196 | 13.173 | n/a | 0.000 | 0.000 | 1.095 | 994.208 | 0.197 | n/a | 0.161 | 0.000 | n/a | n/a | 0.362 | 13.173 | 0.013 | 0.362 | gw-r/thread-45/journal/page | none observed |
| c57e6a339dee12d500000000000000ac | 942.925 | 7.622 | n/a | 0.000 | 0.000 | 7.868 | 927.186 | 0.015 | n/a | 0.124 | 0.000 | n/a | n/a | 0.110 | 7.622 | 0.008 | 0.110 | gw-r/thread-47/journal/page | none observed |
| c57e6a339dee12d500000000000000aa | 653.664 | 9.007 | n/a | 0.000 | 0.000 | 1.047 | 643.132 | 0.093 | n/a | 0.138 | 0.000 | n/a | n/a | 0.246 | 9.007 | 0.014 | 0.246 | gw-r/thread-71/journal/page | none observed |
| c57e6a339dee12d500000000000000a8 | 243.775 | 9.530 | n/a | 0.000 | 0.000 | 1.491 | 232.275 | 0.042 | n/a | 0.305 | 0.000 | n/a | n/a | 0.132 | 9.530 | 0.039 | 0.132 | gw-r/thread-47/journal/page | none observed |
| c57e6a339dee12d500000000000000a7 | 109.478 | 6.531 | n/a | 0.000 | 0.000 | 1.037 | 97.992 | 3.114 | n/a | 0.070 | 0.000 | n/a | n/a | 0.735 | 6.531 | 0.060 | 0.735 | gw-r/thread-68/journal/page | none observed |

## P3 / presweep / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 120.063 | n/a | n/a | n/a | 13.067 | n/a | 0.000 | 0.000 | 1.604 | 106.702 | 0.016 | n/a | 0.078 | 0.000 | n/a | n/a | 0.696 | 13.067 | 0.094 | 0.696 |
| p99 | 817.052 | n/a | n/a | n/a | 17.680 | n/a | 0.000 | 0.000 | 3.520 | 795.572 | 0.078 | n/a | 0.359 | 0.000 | n/a | n/a | 22.114 | 17.680 | 0.400 | 22.114 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d500000000000000af | 817.052 | 17.680 | n/a | 0.000 | 0.000 | 2.729 | 795.572 | 0.016 | n/a | 0.359 | 0.000 | n/a | n/a | 0.696 | 17.680 | 0.022 | 0.696 | gw-r/thread-69/journal/page | none observed |
| c57e6a339dee12d500000000000000b4 | 167.510 | 12.545 | n/a | 0.000 | 0.000 | 3.520 | 149.571 | 0.078 | n/a | 0.078 | 0.000 | n/a | n/a | 1.717 | 12.545 | 0.075 | 1.717 | gw-r/thread-66/journal/page | none observed |
| c57e6a339dee12d500000000000000b2 | 120.063 | 11.344 | n/a | 0.000 | 0.000 | 1.604 | 106.702 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.308 | 11.344 | 0.094 | 0.308 | gw-r/thread-70/journal/page | none observed |
| c57e6a339dee12d500000000000000ad | 92.978 | 13.067 | n/a | 0.000 | 0.000 | 1.182 | 78.482 | 0.046 | n/a | 0.073 | 0.000 | n/a | n/a | 0.127 | 13.067 | 0.141 | 0.127 | gw-r/thread-47/journal/page | none observed |
| c57e6a339dee12d500000000000000b1 | 39.350 | 15.722 | n/a | 0.000 | 0.000 | 1.514 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.114 | 15.722 | 0.400 | 22.114 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / sweep / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.595 | n/a | n/a | n/a | 8.832 | n/a | 0.000 | 0.000 | 1.112 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.490 | 8.832 | 0.245 | 15.490 |
| p99 | 1003.322 | n/a | n/a | n/a | 16.235 | n/a | 0.000 | 0.000 | 2.095 | 1000.869 | 0.025 | n/a | 0.096 | 0.000 | n/a | n/a | 30.945 | 16.235 | 0.638 | 30.945 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c57e6a339dee12d500000000000000bb | 1003.322 | 0.255 | n/a | 0.000 | 0.000 | 0.814 | 1000.869 | 0.025 | n/a | 0.096 | 0.000 | n/a | n/a | 1.263 | 0.255 | 0.000 | 1.263 | gw-r/thread-45/journal/page | none observed |
| c57e6a339dee12d500000000000000b9 | 41.889 | 9.833 | n/a | 0.000 | 0.000 | 1.112 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.945 | 9.833 | 0.235 | 30.945 | node-14/thread-2/socket.wait-first-byte | none observed |
| c57e6a339dee12d500000000000000ba | 41.174 | 9.672 | n/a | 0.000 | 0.000 | 0.789 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.713 | 9.672 | 0.235 | 30.713 | node-14/thread-2/socket.wait-first-byte | none observed |
| c57e6a339dee12d500000000000000b6 | 30.595 | 7.506 | n/a | 0.000 | 0.000 | 2.095 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.993 | 7.506 | 0.245 | 20.993 | node-14/thread-2/socket.wait-first-byte | none observed |
| c57e6a339dee12d500000000000000b5 | 25.535 | 8.832 | n/a | 0.000 | 0.000 | 1.213 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.490 | 8.832 | 0.346 | 15.490 | node-14/thread-2/socket.wait-first-byte | none observed |
| c57e6a339dee12d500000000000000b8 | 25.461 | 16.235 | n/a | 0.000 | 0.000 | 0.311 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.916 | 16.235 | 0.638 | 8.916 | node-14/thread-2/socket.wait-first-byte | none observed |
| c57e6a339dee12d500000000000000b7 | 23.504 | 7.144 | n/a | 0.000 | 0.000 | 2.033 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.327 | 7.144 | 0.304 | 14.327 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / read (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 89.001 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.257 | 86.942 | 0.016 | n/a | 0.155 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 |
| p99 | 203.838 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.258 | 202.178 | 0.405 | n/a | 0.246 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e3c3bfafca350d000000000000000f | 203.838 | 0.000 | n/a | 0.000 | 0.000 | 1.258 | 202.178 | 0.016 | n/a | 0.246 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-47/journal/page | none observed |
| 54e3c3bfafca350d0000000000000010 | 89.001 | 0.000 | n/a | 0.000 | 0.000 | 1.257 | 86.942 | 0.405 | n/a | 0.155 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 205.468 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.685 | 202.485 | 0.112 | n/a | 0.322 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 |
| p99 | 209.802 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.756 | 203.940 | 0.210 | n/a | 0.849 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e3c3bfafca350d000000000000001a | 209.802 | 0.000 | n/a | 0.000 | 0.000 | 4.756 | 203.837 | 0.119 | n/a | 0.849 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 | gw-r/thread-46/journal/page | none observed |
| 54e3c3bfafca350d000000000000001d | 206.290 | 0.000 | n/a | 0.000 | 0.000 | 1.685 | 203.940 | 0.210 | n/a | 0.322 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-67/journal/page | none observed |
| 54e3c3bfafca350d000000000000001b | 205.468 | 0.000 | n/a | 0.000 | 0.000 | 2.378 | 202.411 | 0.112 | n/a | 0.396 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-67/journal/page | none observed |
| 54e3c3bfafca350d000000000000001c | 204.440 | 0.000 | n/a | 0.000 | 0.000 | 1.503 | 202.485 | 0.019 | n/a | 0.275 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 204.504 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.711 | 201.810 | 0.061 | n/a | 0.258 | 0.000 | n/a | n/a | 0.278 | 0.000 | 0.000 | 0.278 |
| p99 | 208.365 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.958 | 203.814 | 0.246 | n/a | 0.399 | 0.000 | n/a | n/a | 0.455 | 0.000 | 0.000 | 0.455 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e3c3bfafca350d0000000000000028 | 208.365 | 0.000 | n/a | 0.000 | 0.000 | 5.958 | 201.810 | 0.061 | n/a | 0.258 | 0.000 | n/a | n/a | 0.278 | 0.000 | 0.000 | 0.278 | gw-r/thread-44/journal/page | none observed |
| 54e3c3bfafca350d0000000000000025 | 206.729 | 0.000 | n/a | 0.000 | 0.000 | 2.246 | 203.814 | 0.088 | n/a | 0.217 | 0.000 | n/a | n/a | 0.365 | 0.000 | 0.000 | 0.365 | gw-r/thread-50/journal/page | none observed |
| 54e3c3bfafca350d0000000000000021 | 204.700 | 0.000 | n/a | 0.000 | 0.000 | 1.469 | 202.371 | 0.095 | n/a | 0.311 | 0.000 | n/a | n/a | 0.455 | 0.000 | 0.000 | 0.455 | gw-r/thread-45/journal/page | none observed |
| 54e3c3bfafca350d0000000000000027 | 204.590 | 0.000 | n/a | 0.000 | 0.000 | 1.711 | 202.381 | 0.062 | n/a | 0.240 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-69/journal/page | none observed |
| 54e3c3bfafca350d0000000000000026 | 204.504 | 0.000 | n/a | 0.000 | 0.000 | 1.636 | 201.814 | 0.246 | n/a | 0.399 | 0.000 | n/a | n/a | 0.408 | 0.000 | 0.000 | 0.408 | gw-r/thread-44/journal/page | none observed |
| 54e3c3bfafca350d000000000000001f | 204.371 | 0.000 | n/a | 0.000 | 0.000 | 2.425 | 201.536 | 0.013 | n/a | 0.263 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-70/journal/page | none observed |
| 54e3c3bfafca350d0000000000000022 | 203.417 | 0.000 | n/a | 0.000 | 0.000 | 1.600 | 201.397 | 0.011 | n/a | 0.272 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-50/journal/page | none observed |
| 54e3c3bfafca350d0000000000000023 | 136.295 | 0.000 | n/a | 0.000 | 0.000 | 0.861 | 134.969 | 0.016 | n/a | 0.180 | 0.000 | n/a | n/a | 0.270 | 0.000 | 0.000 | 0.270 | gw-r/thread-45/journal/page | none observed |
| 54e3c3bfafca350d000000000000001e | 55.521 | 0.000 | n/a | 0.000 | 0.000 | 1.726 | 53.252 | 0.035 | n/a | 0.169 | 0.000 | n/a | n/a | 0.337 | 0.000 | 0.000 | 0.337 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 204.927 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.645 | 202.543 | 0.087 | n/a | 0.238 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 |
| p99 | 224.054 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.367 | 221.823 | 0.312 | n/a | 0.534 | 0.000 | n/a | n/a | 0.357 | 0.000 | 0.000 | 0.357 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e3c3bfafca350d0000000000000030 | 224.054 | 0.000 | n/a | 0.000 | 0.000 | 1.645 | 221.823 | 0.106 | n/a | 0.171 | 0.000 | n/a | n/a | 0.310 | 0.000 | 0.000 | 0.310 | gw-r/thread-46/journal/page | none observed |
| 54e3c3bfafca350d0000000000000031 | 207.132 | 0.000 | n/a | 0.000 | 0.000 | 2.150 | 203.962 | 0.312 | n/a | 0.534 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-68/journal/page | none observed |
| 54e3c3bfafca350d000000000000002b | 207.052 | 0.000 | n/a | 0.000 | 0.000 | 3.367 | 203.187 | 0.087 | n/a | 0.212 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-69/journal/page | none observed |
| 54e3c3bfafca350d000000000000002e | 205.389 | 0.000 | n/a | 0.000 | 0.000 | 2.532 | 202.168 | 0.093 | n/a | 0.238 | 0.000 | n/a | n/a | 0.357 | 0.000 | 0.000 | 0.357 | gw-r/thread-46/journal/page | none observed |
| 54e3c3bfafca350d000000000000002d | 204.927 | 0.000 | n/a | 0.000 | 0.000 | 1.610 | 202.393 | 0.050 | n/a | 0.531 | 0.000 | n/a | n/a | 0.344 | 0.000 | 0.000 | 0.344 | gw-r/thread-67/journal/page | none observed |
| 54e3c3bfafca350d0000000000000032 | 204.543 | 0.000 | n/a | 0.000 | 0.000 | 1.386 | 202.567 | 0.092 | n/a | 0.241 | 0.000 | n/a | n/a | 0.258 | 0.000 | 0.000 | 0.258 | gw-r/thread-46/journal/page | none observed |
| 54e3c3bfafca350d000000000000002c | 204.230 | 0.000 | n/a | 0.000 | 0.000 | 1.219 | 202.543 | 0.032 | n/a | 0.246 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-46/journal/page | none observed |
| 54e3c3bfafca350d0000000000000035 | 203.302 | 0.000 | n/a | 0.000 | 0.000 | 1.297 | 201.602 | 0.055 | n/a | 0.162 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-46/journal/page | none observed |
| 54e3c3bfafca350d0000000000000034 | 76.715 | 0.000 | n/a | 0.000 | 0.000 | 2.151 | 74.233 | 0.018 | n/a | 0.105 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 207.842 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.593 | 203.573 | 0.080 | n/a | 0.303 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 |
| p99 | 228.249 | n/a | n/a | n/a | 0.616 | n/a | 0.000 | 0.000 | 13.989 | 214.400 | 27.679 | n/a | 0.895 | 0.000 | n/a | n/a | 0.995 | 0.616 | 0.003 | 0.995 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e3c3bfafca350d000000000000003c | 228.249 | 0.000 | n/a | 0.000 | 0.000 | 13.989 | 213.673 | 0.122 | n/a | 0.197 | 0.000 | n/a | n/a | 0.268 | 0.000 | 0.000 | 0.268 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d0000000000000037 | 221.525 | 0.000 | n/a | 0.000 | 0.000 | 6.264 | 214.400 | 0.092 | n/a | 0.613 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-70/journal/page | none observed |
| 54e3c3bfafca350d0000000000000039 | 210.543 | 0.616 | n/a | 0.000 | 0.000 | 3.545 | 204.887 | 0.125 | n/a | 0.375 | 0.000 | n/a | n/a | 0.995 | 0.616 | 0.003 | 0.995 | gw-r/thread-70/journal/page | none observed |
| 54e3c3bfafca350d000000000000003f | 208.187 | 0.000 | n/a | 0.000 | 0.000 | 3.823 | 203.734 | 0.037 | n/a | 0.303 | 0.000 | n/a | n/a | 0.290 | 0.000 | 0.000 | 0.290 | gw-r/thread-50/journal/page | none observed |
| 54e3c3bfafca350d000000000000003d | 208.033 | 0.000 | n/a | 0.000 | 0.000 | 3.852 | 203.573 | 0.150 | n/a | 0.322 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-50/journal/page | none observed |
| 54e3c3bfafca350d000000000000003a | 207.842 | 0.000 | n/a | 0.000 | 0.000 | 4.833 | 202.387 | 0.051 | n/a | 0.342 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-50/journal/page | none observed |
| 54e3c3bfafca350d0000000000000038 | 207.807 | 0.000 | n/a | 0.000 | 0.000 | 4.593 | 202.648 | 0.077 | n/a | 0.260 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-50/journal/page | none observed |
| 54e3c3bfafca350d000000000000003e | 207.045 | 0.000 | n/a | 0.000 | 0.000 | 1.703 | 204.895 | 0.080 | n/a | 0.188 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d000000000000003b | 173.457 | 0.000 | n/a | 0.000 | 0.000 | 8.977 | 164.065 | 0.021 | n/a | 0.178 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-70/journal/page | none observed |
| 54e3c3bfafca350d0000000000000036 | 85.316 | 0.000 | n/a | 0.000 | 0.000 | 4.677 | 51.498 | 27.679 | n/a | 0.895 | 0.000 | n/a | n/a | 0.567 | 0.000 | 0.000 | 0.567 | gw-r/thread-44/journal/page | none observed |

## P3 / L1024 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.621 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.737 | 201.567 | 0.070 | n/a | 0.202 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 |
| p99 | 213.458 | n/a | n/a | n/a | 1.001 | n/a | 0.000 | 0.000 | 6.139 | 207.962 | 18.240 | n/a | 0.645 | 0.000 | n/a | n/a | 0.615 | 1.001 | 0.015 | 0.615 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e3c3bfafca350d0000000000000041 | 213.458 | 0.000 | n/a | 0.000 | 0.000 | 5.073 | 207.962 | 0.043 | n/a | 0.163 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-69/journal/page | none observed |
| 54e3c3bfafca350d0000000000000044 | 207.184 | 0.000 | n/a | 0.000 | 0.000 | 1.927 | 204.762 | 0.149 | n/a | 0.136 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d0000000000000047 | 205.844 | 0.000 | n/a | 0.000 | 0.000 | 2.006 | 203.138 | 0.022 | n/a | 0.400 | 0.000 | n/a | n/a | 0.278 | 0.000 | 0.000 | 0.278 | gw-r/thread-45/journal/page | none observed |
| 54e3c3bfafca350d0000000000000042 | 204.366 | 0.000 | n/a | 0.000 | 0.000 | 1.277 | 202.141 | 0.076 | n/a | 0.645 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d000000000000004a | 204.327 | 0.000 | n/a | 0.000 | 0.000 | 1.525 | 202.164 | 0.055 | n/a | 0.202 | 0.000 | n/a | n/a | 0.381 | 0.000 | 0.000 | 0.381 | gw-r/thread-48/journal/page | none observed |
| 54e3c3bfafca350d0000000000000049 | 203.621 | 0.000 | n/a | 0.000 | 0.000 | 1.737 | 201.567 | 0.028 | n/a | 0.163 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-44/journal/page | none observed |
| 54e3c3bfafca350d0000000000000043 | 203.323 | 0.000 | n/a | 0.000 | 0.000 | 1.325 | 201.474 | 0.070 | n/a | 0.226 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-69/journal/page | none observed |
| 54e3c3bfafca350d000000000000004b | 176.885 | 0.000 | n/a | 0.000 | 0.000 | 6.139 | 156.114 | 13.726 | n/a | 0.565 | 0.000 | n/a | n/a | 0.342 | 0.000 | 0.000 | 0.342 | gw-r/thread-44/journal/page | none observed |
| 54e3c3bfafca350d0000000000000040 | 68.281 | 1.001 | n/a | 0.000 | 0.000 | 2.617 | 45.657 | 18.240 | n/a | 0.151 | 0.000 | n/a | n/a | 0.615 | 1.001 | 0.015 | 0.615 | gw-r/thread-69/journal/page | none observed |
| 54e3c3bfafca350d0000000000000048 | 55.334 | 0.000 | n/a | 0.000 | 0.000 | 1.466 | 53.391 | 0.097 | n/a | 0.208 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-44/journal/page | none observed |

## P3 / recovery / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 205.097 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.767 | 202.322 | 0.104 | n/a | 0.317 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 |
| p99 | 208.779 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.432 | 204.609 | 7.437 | n/a | 1.272 | 0.000 | n/a | n/a | 0.417 | 0.000 | 0.000 | 0.417 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e3c3bfafca350d0000000000000052 | 208.779 | 0.000 | n/a | 0.000 | 0.000 | 2.432 | 204.609 | 0.052 | n/a | 1.272 | 0.000 | n/a | n/a | 0.414 | 0.000 | 0.000 | 0.414 | gw-r/thread-70/journal/page | none observed |
| 54e3c3bfafca350d0000000000000053 | 206.786 | 0.000 | n/a | 0.000 | 0.000 | 1.510 | 204.472 | 0.071 | n/a | 0.317 | 0.000 | n/a | n/a | 0.417 | 0.000 | 0.000 | 0.417 | gw-r/thread-46/journal/page | none observed |
| 54e3c3bfafca350d000000000000004d | 205.772 | 0.000 | n/a | 0.000 | 0.000 | 1.552 | 203.268 | 0.167 | n/a | 0.477 | 0.000 | n/a | n/a | 0.308 | 0.000 | 0.000 | 0.308 | gw-r/thread-70/journal/page | none observed |
| 54e3c3bfafca350d000000000000004f | 205.201 | 0.000 | n/a | 0.000 | 0.000 | 1.767 | 195.537 | 7.437 | n/a | 0.245 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-70/journal/page | none observed |
| 54e3c3bfafca350d0000000000000051 | 205.097 | 0.000 | n/a | 0.000 | 0.000 | 2.078 | 202.484 | 0.105 | n/a | 0.201 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-46/journal/page | none observed |
| 54e3c3bfafca350d000000000000004e | 204.525 | 0.000 | n/a | 0.000 | 0.000 | 1.481 | 202.322 | 0.070 | n/a | 0.492 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-66/journal/page | none observed |
| 54e3c3bfafca350d0000000000000050 | 204.409 | 0.000 | n/a | 0.000 | 0.000 | 1.847 | 201.936 | 0.052 | n/a | 0.385 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-70/journal/page | none observed |
| 54e3c3bfafca350d000000000000004c | 202.999 | 0.000 | n/a | 0.000 | 0.000 | 1.011 | 201.525 | 0.104 | n/a | 0.186 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-66/journal/page | none observed |
| 54e3c3bfafca350d0000000000000055 | 98.532 | 0.000 | n/a | 0.000 | 0.000 | 2.249 | 88.652 | 7.168 | n/a | 0.133 | 0.000 | n/a | n/a | 0.330 | 0.000 | 0.000 | 0.330 | gw-r/thread-66/journal/page | none observed |

## P3 / p4mix / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.089 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.319 | 201.424 | 0.029 | n/a | 0.185 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 |
| p99 | 205.753 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.655 | 202.232 | 0.428 | n/a | 0.353 | 0.000 | n/a | n/a | 0.556 | 0.000 | 0.000 | 0.556 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e3c3bfafca350d000000000000005c | 205.753 | 0.000 | n/a | 0.000 | 0.000 | 2.811 | 202.232 | 0.165 | n/a | 0.353 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-47/journal/page | none observed |
| 54e3c3bfafca350d000000000000005f | 204.495 | 0.000 | n/a | 0.000 | 0.000 | 2.009 | 201.859 | 0.066 | n/a | 0.310 | 0.000 | n/a | n/a | 0.251 | 0.000 | 0.000 | 0.251 | gw-r/thread-47/journal/page | none observed |
| 54e3c3bfafca350d000000000000005d | 203.793 | 0.000 | n/a | 0.000 | 0.000 | 1.266 | 202.010 | 0.061 | n/a | 0.192 | 0.000 | n/a | n/a | 0.264 | 0.000 | 0.000 | 0.264 | gw-r/thread-67/journal/page | none observed |
| 54e3c3bfafca350d0000000000000056 | 203.723 | 0.000 | n/a | 0.000 | 0.000 | 1.756 | 201.514 | 0.029 | n/a | 0.179 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-49/journal/page | none observed |
| 54e3c3bfafca350d0000000000000057 | 203.369 | 0.000 | n/a | 0.000 | 0.000 | 0.952 | 201.974 | 0.099 | n/a | 0.185 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d0000000000000058 | 203.089 | 0.000 | n/a | 0.000 | 0.000 | 1.667 | 201.146 | 0.015 | n/a | 0.143 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-68/journal/page | none observed |
| 54e3c3bfafca350d000000000000005a | 202.959 | 0.000 | n/a | 0.000 | 0.000 | 1.107 | 201.424 | 0.027 | n/a | 0.151 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d000000000000005b | 202.853 | 0.000 | n/a | 0.000 | 0.000 | 1.319 | 201.223 | 0.014 | n/a | 0.128 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-67/journal/page | none observed |
| 54e3c3bfafca350d0000000000000059 | 158.618 | 0.000 | n/a | 0.000 | 0.000 | 1.273 | 156.265 | 0.428 | n/a | 0.244 | 0.000 | n/a | n/a | 0.408 | 0.000 | 0.000 | 0.408 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d000000000000005e | 113.395 | 0.000 | n/a | 0.000 | 0.000 | 3.655 | 108.838 | 0.011 | n/a | 0.335 | 0.000 | n/a | n/a | 0.556 | 0.000 | 0.000 | 0.556 | gw-r/thread-47/journal/page | none observed |

## P3 / p4h1 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.524 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.517 | 201.639 | 0.085 | n/a | 0.220 | 0.000 | n/a | n/a | 0.252 | 0.000 | 0.000 | 0.252 |
| p99 | 207.509 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.414 | 204.973 | 16.926 | n/a | 0.501 | 0.000 | n/a | n/a | 0.870 | 0.000 | 0.000 | 0.870 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e3c3bfafca350d000000000000006a | 207.509 | 0.000 | n/a | 0.000 | 0.000 | 1.832 | 204.973 | 0.095 | n/a | 0.384 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-70/journal/page | none observed |
| 54e3c3bfafca350d0000000000000074 | 206.918 | 0.000 | n/a | 0.000 | 0.000 | 1.868 | 204.432 | 0.065 | n/a | 0.301 | 0.000 | n/a | n/a | 0.252 | 0.000 | 0.000 | 0.252 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d000000000000006f | 204.734 | 0.000 | n/a | 0.000 | 0.000 | 1.517 | 202.442 | 0.059 | n/a | 0.403 | 0.000 | n/a | n/a | 0.313 | 0.000 | 0.000 | 0.313 | gw-r/thread-70/journal/page | none observed |
| 54e3c3bfafca350d0000000000000070 | 204.656 | 0.000 | n/a | 0.000 | 0.000 | 1.385 | 202.720 | 0.085 | n/a | 0.220 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d0000000000000077 | 204.383 | 0.000 | n/a | 0.000 | 0.000 | 1.385 | 202.079 | 0.113 | n/a | 0.501 | 0.000 | n/a | n/a | 0.305 | 0.000 | 0.000 | 0.305 | gw-r/thread-44/journal/page | none observed |
| 54e3c3bfafca350d000000000000006b | 203.542 | 0.000 | n/a | 0.000 | 0.000 | 1.781 | 201.419 | 0.029 | n/a | 0.117 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-46/journal/page | none observed |
| 54e3c3bfafca350d0000000000000072 | 203.524 | 0.000 | n/a | 0.000 | 0.000 | 1.502 | 201.639 | 0.030 | n/a | 0.140 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-48/journal/page | none observed |
| 54e3c3bfafca350d000000000000006c | 203.249 | 0.000 | n/a | 0.000 | 0.000 | 1.023 | 201.708 | 0.055 | n/a | 0.273 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-70/journal/page | none observed |
| 54e3c3bfafca350d000000000000006d | 182.278 | 0.000 | n/a | 0.000 | 0.000 | 1.823 | 169.113 | 10.821 | n/a | 0.247 | 0.000 | n/a | n/a | 0.275 | 0.000 | 0.000 | 0.275 | gw-r/thread-46/journal/page | none observed |
| 54e3c3bfafca350d0000000000000076 | 163.630 | 0.000 | n/a | 0.000 | 0.000 | 0.747 | 162.536 | 0.018 | n/a | 0.120 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-48/journal/page | none observed |
| 54e3c3bfafca350d0000000000000073 | 140.663 | 0.000 | n/a | 0.000 | 0.000 | 1.165 | 135.209 | 3.965 | n/a | 0.058 | 0.000 | n/a | n/a | 0.266 | 0.000 | 0.000 | 0.266 | gw-r/thread-67/journal/page | none observed |
| 54e3c3bfafca350d0000000000000071 | 119.594 | 0.000 | n/a | 0.000 | 0.000 | 3.414 | 108.033 | 7.190 | n/a | 0.086 | 0.000 | n/a | n/a | 0.870 | 0.000 | 0.000 | 0.870 | gw-r/thread-70/journal/page | none observed |
| 54e3c3bfafca350d0000000000000069 | 69.619 | 0.000 | n/a | 0.000 | 0.000 | 2.088 | 50.034 | 16.926 | n/a | 0.197 | 0.000 | n/a | n/a | 0.374 | 0.000 | 0.000 | 0.374 | gw-r/thread-49/journal/page | none observed |

## P3 / grow3 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 204.347 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.534 | 201.405 | 0.079 | n/a | 0.167 | 0.000 | n/a | n/a | 0.338 | 0.000 | 0.000 | 0.338 |
| p99 | 405.413 | n/a | n/a | n/a | 0.566 | n/a | 0.000 | 0.000 | 7.195 | 206.017 | 222.241 | n/a | 0.489 | 0.000 | n/a | n/a | 0.619 | 0.566 | 0.005 | 0.619 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e3c3bfafca350d0000000000000084 | 405.413 | 0.000 | n/a | 0.000 | 0.000 | 7.195 | 175.197 | 222.241 | n/a | 0.162 | 0.000 | n/a | n/a | 0.619 | 0.000 | 0.000 | 0.619 | gw-r/thread-45/gateway.admission-wait | none observed |
| 54e3c3bfafca350d0000000000000083 | 208.693 | 0.000 | n/a | 0.000 | 0.000 | 1.550 | 206.017 | 0.085 | n/a | 0.489 | 0.000 | n/a | n/a | 0.552 | 0.000 | 0.000 | 0.552 | gw-r/thread-67/journal/page | none observed |
| 54e3c3bfafca350d0000000000000086 | 205.521 | 0.000 | n/a | 0.000 | 0.000 | 1.896 | 203.066 | 0.031 | n/a | 0.304 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d0000000000000082 | 205.153 | 0.000 | n/a | 0.000 | 0.000 | 2.808 | 201.838 | 0.029 | n/a | 0.195 | 0.000 | n/a | n/a | 0.284 | 0.000 | 0.000 | 0.284 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d000000000000007f | 204.956 | 0.000 | n/a | 0.000 | 0.000 | 1.063 | 203.211 | 0.088 | n/a | 0.212 | 0.000 | n/a | n/a | 0.382 | 0.000 | 0.000 | 0.382 | gw-r/thread-67/journal/page | none observed |
| 54e3c3bfafca350d0000000000000081 | 204.688 | 0.000 | n/a | 0.000 | 0.000 | 3.127 | 201.166 | 0.019 | n/a | 0.167 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-67/journal/page | none observed |
| 54e3c3bfafca350d0000000000000080 | 204.347 | 0.000 | n/a | 0.000 | 0.000 | 1.376 | 202.110 | 0.079 | n/a | 0.436 | 0.000 | n/a | n/a | 0.346 | 0.000 | 0.000 | 0.346 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d000000000000007a | 203.618 | 0.000 | n/a | 0.000 | 0.000 | 0.857 | 202.443 | 0.024 | n/a | 0.107 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-66/journal/page | none observed |
| 54e3c3bfafca350d0000000000000078 | 203.509 | 0.000 | n/a | 0.000 | 0.000 | 1.373 | 201.405 | 0.110 | n/a | 0.192 | 0.000 | n/a | n/a | 0.428 | 0.000 | 0.000 | 0.428 | gw-r/thread-50/journal/page | none observed |
| 54e3c3bfafca350d000000000000007c | 194.506 | 0.000 | n/a | 0.000 | 0.000 | 0.909 | 193.279 | 0.031 | n/a | 0.126 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-70/journal/page | none observed |
| 54e3c3bfafca350d000000000000007b | 123.855 | 0.000 | n/a | 0.000 | 0.000 | 1.448 | 121.919 | 0.122 | n/a | 0.124 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | gw-r/thread-50/journal/page | none observed |
| 54e3c3bfafca350d0000000000000087 | 111.060 | 0.566 | n/a | 0.000 | 0.000 | 1.534 | 76.074 | 32.432 | n/a | 0.104 | 0.000 | n/a | n/a | 0.350 | 0.566 | 0.005 | 0.350 | gw-r/thread-67/journal/page | none observed |
| 54e3c3bfafca350d000000000000007e | 67.989 | 0.000 | n/a | 0.000 | 0.000 | 1.631 | 65.834 | 0.020 | n/a | 0.165 | 0.000 | n/a | n/a | 0.338 | 0.000 | 0.000 | 0.338 | gw-r/thread-67/journal/page | none observed |

## P3 / p4h3 / read (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.483 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.490 | 201.889 | 0.042 | n/a | 0.192 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 |
| p99 | 205.892 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.890 | 203.401 | 24.694 | n/a | 0.380 | 0.000 | n/a | n/a | 0.465 | 0.000 | 0.000 | 0.465 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e3c3bfafca350d00000000000000a8 | 205.892 | 0.000 | n/a | 0.000 | 0.000 | 1.912 | 203.148 | 0.073 | n/a | 0.380 | 0.000 | n/a | n/a | 0.378 | 0.000 | 0.000 | 0.378 | gw-r/thread-66/journal/page | none observed |
| 54e3c3bfafca350d000000000000009e | 205.289 | 0.000 | n/a | 0.000 | 0.000 | 1.240 | 203.373 | 0.053 | n/a | 0.288 | 0.000 | n/a | n/a | 0.336 | 0.000 | 0.000 | 0.336 | gw-r/thread-69/journal/page | none observed |
| 54e3c3bfafca350d00000000000000a3 | 205.105 | 0.000 | n/a | 0.000 | 0.000 | 1.975 | 202.679 | 0.013 | n/a | 0.192 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-r/thread-50/journal/page | none observed |
| 54e3c3bfafca350d00000000000000a9 | 204.990 | 0.000 | n/a | 0.000 | 0.000 | 1.158 | 203.401 | 0.024 | n/a | 0.197 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d00000000000000a5 | 204.510 | 0.000 | n/a | 0.000 | 0.000 | 1.777 | 202.290 | 0.042 | n/a | 0.197 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-69/journal/page | none observed |
| 54e3c3bfafca350d00000000000000a1 | 204.179 | 0.000 | n/a | 0.000 | 0.000 | 1.570 | 202.040 | 0.028 | n/a | 0.264 | 0.000 | n/a | n/a | 0.276 | 0.000 | 0.000 | 0.276 | gw-r/thread-50/journal/page | none observed |
| 54e3c3bfafca350d000000000000009d | 204.004 | 0.000 | n/a | 0.000 | 0.000 | 1.217 | 202.263 | 0.082 | n/a | 0.219 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-48/journal/page | none observed |
| 54e3c3bfafca350d00000000000000ab | 203.483 | 0.000 | n/a | 0.000 | 0.000 | 1.477 | 201.322 | 0.046 | n/a | 0.175 | 0.000 | n/a | n/a | 0.465 | 0.000 | 0.000 | 0.465 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d00000000000000a2 | 203.480 | 0.000 | n/a | 0.000 | 0.000 | 1.155 | 201.889 | 0.048 | n/a | 0.248 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-48/journal/page | none observed |
| 54e3c3bfafca350d00000000000000a7 | 203.412 | 0.000 | n/a | 0.000 | 0.000 | 1.490 | 201.337 | 0.015 | n/a | 0.125 | 0.000 | n/a | n/a | 0.445 | 0.000 | 0.000 | 0.445 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d00000000000000a0 | 202.576 | 0.000 | n/a | 0.000 | 0.000 | 1.071 | 201.057 | 0.027 | n/a | 0.130 | 0.000 | n/a | n/a | 0.291 | 0.000 | 0.000 | 0.291 | gw-r/thread-48/journal/page | none observed |
| 54e3c3bfafca350d000000000000009b | 134.897 | 0.000 | n/a | 0.000 | 0.000 | 3.890 | 130.525 | 0.029 | n/a | 0.146 | 0.000 | n/a | n/a | 0.309 | 0.000 | 0.000 | 0.309 | gw-r/thread-45/journal/page | none observed |
| 54e3c3bfafca350d000000000000009f | 116.986 | 0.000 | n/a | 0.000 | 0.000 | 1.638 | 90.281 | 24.694 | n/a | 0.183 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-48/journal/page | none observed |
| 54e3c3bfafca350d00000000000000a4 | 92.528 | 0.000 | n/a | 0.000 | 0.000 | 1.997 | 85.627 | 4.604 | n/a | 0.118 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-48/journal/page | none observed |

## P3 / grow10 / read (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.416 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.740 | 193.112 | 0.048 | n/a | 0.144 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 |
| p99 | 425.048 | n/a | n/a | n/a | 3.095 | n/a | 0.000 | 0.000 | 4.189 | 207.443 | 255.720 | n/a | 0.238 | 0.000 | n/a | n/a | 0.624 | 3.095 | 0.032 | 0.624 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e3c3bfafca350d00000000000000ae | 425.048 | 0.637 | n/a | 0.000 | 0.000 | 1.208 | 167.185 | 255.720 | n/a | 0.154 | 0.000 | n/a | n/a | 0.145 | 0.637 | 0.001 | 0.145 | gw-r/thread-66/gateway.admission-wait | none observed |
| 54e3c3bfafca350d00000000000000b8 | 231.443 | 1.162 | n/a | 0.000 | 0.000 | 1.750 | 207.443 | 20.351 | n/a | 0.113 | 0.000 | n/a | n/a | 0.624 | 1.162 | 0.005 | 0.624 | gw-r/thread-45/journal/page | none observed |
| 54e3c3bfafca350d00000000000000ac | 207.412 | 0.000 | n/a | 0.000 | 0.000 | 4.189 | 202.686 | 0.049 | n/a | 0.235 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 | gw-r/thread-66/journal/page | none observed |
| 54e3c3bfafca350d00000000000000ad | 206.114 | 0.000 | n/a | 0.000 | 0.000 | 3.577 | 202.039 | 0.062 | n/a | 0.196 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d00000000000000b7 | 203.591 | 0.000 | n/a | 0.000 | 0.000 | 1.662 | 201.493 | 0.052 | n/a | 0.122 | 0.000 | n/a | n/a | 0.260 | 0.000 | 0.000 | 0.260 | gw-r/thread-68/journal/page | none observed |
| 54e3c3bfafca350d00000000000000bc | 203.334 | 0.000 | n/a | 0.000 | 0.000 | 1.678 | 201.273 | 0.012 | n/a | 0.140 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-67/journal/page | none observed |
| 54e3c3bfafca350d00000000000000b1 | 202.903 | 0.000 | n/a | 0.000 | 0.000 | 1.107 | 201.275 | 0.048 | n/a | 0.189 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 | gw-r/thread-66/journal/page | none observed |
| 54e3c3bfafca350d00000000000000b0 | 202.416 | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 201.308 | 0.040 | n/a | 0.173 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d00000000000000bb | 197.143 | 0.931 | n/a | 0.000 | 0.000 | 2.360 | 193.112 | 0.048 | n/a | 0.144 | 0.000 | n/a | n/a | 0.549 | 0.931 | 0.005 | 0.549 | gw-r/thread-68/journal/page | none observed |
| 54e3c3bfafca350d00000000000000b2 | 150.885 | 0.886 | n/a | 0.000 | 0.000 | 4.095 | 133.771 | 11.685 | n/a | 0.099 | 0.000 | n/a | n/a | 0.349 | 0.886 | 0.006 | 0.349 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d00000000000000b6 | 118.370 | 0.000 | n/a | 0.000 | 0.000 | 1.726 | 116.404 | 0.035 | n/a | 0.068 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-70/journal/page | none observed |
| 54e3c3bfafca350d00000000000000bd | 96.476 | 3.095 | n/a | 0.000 | 0.000 | 2.290 | 37.916 | 52.534 | n/a | 0.122 | 0.000 | n/a | n/a | 0.519 | 3.095 | 0.032 | 0.519 | gw-r/thread-50/gateway.admission-wait | none observed |
| 54e3c3bfafca350d00000000000000b9 | 91.191 | 0.689 | n/a | 0.000 | 0.000 | 2.060 | 87.917 | 0.016 | n/a | 0.238 | 0.000 | n/a | n/a | 0.272 | 0.689 | 0.008 | 0.272 | gw-r/thread-68/journal/page | none observed |
| 54e3c3bfafca350d00000000000000b5 | 75.201 | 0.000 | n/a | 0.000 | 0.000 | 0.999 | 73.833 | 0.011 | n/a | 0.134 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-70/journal/page | none observed |
| 54e3c3bfafca350d00000000000000be | 58.198 | 0.918 | n/a | 0.000 | 0.000 | 1.740 | 55.179 | 0.027 | n/a | 0.187 | 0.000 | n/a | n/a | 0.147 | 0.918 | 0.016 | 0.147 | gw-r/thread-67/journal/page | none observed |

## P3 / p4h10 / read (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.974 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.771 | 201.508 | 0.032 | n/a | 0.176 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 |
| p99 | 208.268 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.499 | 204.238 | 8.267 | n/a | 0.333 | 0.000 | n/a | n/a | 1.302 | 0.000 | 0.000 | 1.302 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e3c3bfafca350d00000000000000d1 | 208.268 | 0.000 | n/a | 0.000 | 0.000 | 6.499 | 201.433 | 0.013 | n/a | 0.126 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-71/journal/page | none observed |
| 54e3c3bfafca350d00000000000000d8 | 206.335 | 0.000 | n/a | 0.000 | 0.000 | 1.643 | 204.238 | 0.022 | n/a | 0.217 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-47/journal/page | none observed |
| 54e3c3bfafca350d00000000000000d6 | 205.996 | 0.000 | n/a | 0.000 | 0.000 | 3.255 | 201.250 | 0.013 | n/a | 0.176 | 0.000 | n/a | n/a | 1.302 | 0.000 | 0.000 | 1.302 | gw-r/thread-47/journal/page | none observed |
| 54e3c3bfafca350d00000000000000ce | 205.446 | 0.000 | n/a | 0.000 | 0.000 | 2.678 | 202.090 | 0.145 | n/a | 0.165 | 0.000 | n/a | n/a | 0.368 | 0.000 | 0.000 | 0.368 | gw-r/thread-47/journal/page | none observed |
| 54e3c3bfafca350d00000000000000cd | 205.066 | 0.000 | n/a | 0.000 | 0.000 | 2.279 | 202.162 | 0.037 | n/a | 0.333 | 0.000 | n/a | n/a | 0.254 | 0.000 | 0.000 | 0.254 | gw-r/thread-46/journal/page | none observed |
| 54e3c3bfafca350d00000000000000db | 204.867 | 0.000 | n/a | 0.000 | 0.000 | 1.925 | 202.425 | 0.032 | n/a | 0.251 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-67/journal/page | none observed |
| 54e3c3bfafca350d00000000000000d7 | 204.063 | 0.000 | n/a | 0.000 | 0.000 | 1.771 | 201.798 | 0.077 | n/a | 0.265 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-67/journal/page | none observed |
| 54e3c3bfafca350d00000000000000d4 | 203.974 | 0.000 | n/a | 0.000 | 0.000 | 1.839 | 201.508 | 0.014 | n/a | 0.138 | 0.000 | n/a | n/a | 0.476 | 0.000 | 0.000 | 0.476 | gw-r/thread-45/journal/page | none observed |
| 54e3c3bfafca350d00000000000000d9 | 203.623 | 0.000 | n/a | 0.000 | 0.000 | 1.064 | 202.005 | 0.069 | n/a | 0.199 | 0.000 | n/a | n/a | 0.285 | 0.000 | 0.000 | 0.285 | gw-r/thread-67/journal/page | none observed |
| 54e3c3bfafca350d00000000000000cf | 203.217 | 0.000 | n/a | 0.000 | 0.000 | 1.043 | 201.682 | 0.050 | n/a | 0.242 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-68/journal/page | none observed |
| 54e3c3bfafca350d00000000000000d3 | 202.622 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 201.191 | 0.026 | n/a | 0.145 | 0.000 | n/a | n/a | 0.390 | 0.000 | 0.000 | 0.390 | gw-r/thread-47/journal/page | none observed |
| 54e3c3bfafca350d00000000000000d5 | 196.463 | 0.000 | n/a | 0.000 | 0.000 | 2.950 | 184.753 | 8.267 | n/a | 0.296 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-47/journal/page | none observed |
| 54e3c3bfafca350d00000000000000d0 | 192.765 | 0.000 | n/a | 0.000 | 0.000 | 1.093 | 191.295 | 0.072 | n/a | 0.150 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-47/journal/page | none observed |
| 54e3c3bfafca350d00000000000000da | 90.861 | 0.000 | n/a | 0.000 | 0.000 | 1.115 | 89.430 | 0.017 | n/a | 0.131 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-47/journal/page | none observed |

## P3 / presweep / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.005 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.427 | 201.382 | 0.043 | n/a | 0.155 | 0.000 | n/a | n/a | 0.252 | 0.000 | 0.000 | 0.252 |
| p99 | 204.187 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.188 | 202.244 | 0.148 | n/a | 0.226 | 0.000 | n/a | n/a | 0.573 | 0.000 | 0.000 | 0.573 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e3c3bfafca350d00000000000000dd | 204.187 | 0.000 | n/a | 0.000 | 0.000 | 1.655 | 201.996 | 0.059 | n/a | 0.183 | 0.000 | n/a | n/a | 0.294 | 0.000 | 0.000 | 0.294 | gw-r/thread-50/journal/page | none observed |
| 54e3c3bfafca350d00000000000000de | 203.854 | 0.000 | n/a | 0.000 | 0.000 | 1.227 | 202.244 | 0.043 | n/a | 0.184 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-44/journal/page | none observed |
| 54e3c3bfafca350d00000000000000dc | 203.750 | 0.000 | n/a | 0.000 | 0.000 | 1.583 | 201.695 | 0.063 | n/a | 0.155 | 0.000 | n/a | n/a | 0.254 | 0.000 | 0.000 | 0.254 | gw-r/thread-44/journal/page | none observed |
| 54e3c3bfafca350d00000000000000e3 | 203.642 | 0.000 | n/a | 0.000 | 0.000 | 1.663 | 201.633 | 0.018 | n/a | 0.154 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-70/journal/page | none observed |
| 54e3c3bfafca350d00000000000000e2 | 203.554 | 0.000 | n/a | 0.000 | 0.000 | 1.436 | 201.596 | 0.044 | n/a | 0.226 | 0.000 | n/a | n/a | 0.252 | 0.000 | 0.000 | 0.252 | gw-r/thread-44/journal/page | none observed |
| 54e3c3bfafca350d00000000000000e1 | 203.005 | 0.000 | n/a | 0.000 | 0.000 | 1.316 | 201.382 | 0.013 | n/a | 0.168 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-44/journal/page | none observed |
| 54e3c3bfafca350d00000000000000e7 | 159.016 | 0.000 | n/a | 0.000 | 0.000 | 1.308 | 157.280 | 0.013 | n/a | 0.115 | 0.000 | n/a | n/a | 0.300 | 0.000 | 0.000 | 0.300 | gw-r/thread-48/journal/page | none observed |
| 54e3c3bfafca350d00000000000000e4 | 112.098 | 0.000 | n/a | 0.000 | 0.000 | 1.427 | 109.926 | 0.049 | n/a | 0.123 | 0.000 | n/a | n/a | 0.573 | 0.000 | 0.000 | 0.573 | gw-r/thread-44/journal/page | none observed |
| 54e3c3bfafca350d00000000000000e6 | 104.093 | 0.000 | n/a | 0.000 | 0.000 | 2.188 | 101.185 | 0.148 | n/a | 0.166 | 0.000 | n/a | n/a | 0.406 | 0.000 | 0.000 | 0.406 | gw-r/thread-66/journal/page | none observed |
| 54e3c3bfafca350d00000000000000e0 | 80.233 | 0.000 | n/a | 0.000 | 0.000 | 1.170 | 78.800 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-44/journal/page | none observed |

## P3 / sweep / read (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 222.337 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 20.886 | 201.208 | 0.012 | n/a | 0.111 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 |
| p99 | 222.337 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 20.886 | 201.208 | 0.012 | n/a | 0.111 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54e3c3bfafca350d00000000000000ef | 222.337 | 0.000 | n/a | 0.000 | 0.000 | 20.886 | 201.208 | 0.012 | n/a | 0.111 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-69/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
