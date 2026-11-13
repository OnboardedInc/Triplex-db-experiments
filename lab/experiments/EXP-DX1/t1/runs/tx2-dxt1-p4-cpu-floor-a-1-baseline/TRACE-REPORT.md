# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (135.786 ms, trace `ac2e7c0c04516ba3000000000000186a`); `node-14/thread-0/driver.queue.scheduler-late` (98.830 ms, trace `ac2e7c0c04516ba3000000000000186e`); `node-14/thread-0/driver.queue.scheduler-late` (101.286 ms, trace `ac2e7c0c04516ba3000000000000186c`); `node-14/thread-0/socket.wait-first-byte` (145.706 ms, trace `ac2e7c0c04516ba3000000000000186b`); `node-14/thread-0/driver.queue.scheduler-late` (67.732 ms, trace `ac2e7c0c04516ba30000000000001f72`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-cpu-floor-a-1-baseline`; source `04f9aa93ffa8297049405cedb99839753b8aeb3f`; subjects 10000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3709/3711 (99.946%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 38630551.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 199 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13420.131 | 483.253 | 93.362 | 308 |
| L1 | 0 | 19017.906 | 400.767 | 17.646 | 459 |
| L4 | 0 | 19290.003 | 325.972 | 11.363 | 426 |
| L16 | 0 | 19422.327 | 346.736 | 4.523 | 471 |
| L64 | 0 | 19976.892 | 380.619 | 13.541 | 596 |
| L256 | 0 | 19985.265 | 491.174 | 18.174 | 486 |
| L1024 | 0 | 19976.709 | 3627.549 | 100.090 | 12032 |
| tail | 0 | 64576.632 | 11165.850 | 445.926 | 37381 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| ac2e7c0c04516ba3000000000000186a | driver.queue.scheduler-late | 0.095 | none | 0 / 32 |
| ac2e7c0c04516ba3000000000000186a | driver.queue.scheduler-dispatch | 0.019 | none | 0 / 32 |

Observed active steps while trace ac2e7c0c04516ba3000000000000186a waited: []

| ac2e7c0c04516ba3000000000000186e | driver.queue.scheduler-late | 98.830 | none | 3 / 32 |
| ac2e7c0c04516ba3000000000000186e | driver.queue.subject | 23.918 | ac2e7c0c04516ba3000000000000186d | 3 / 32 |
| ac2e7c0c04516ba3000000000000186e | driver.queue.scheduler-dispatch | 0.068 | none | 8 / 32 |

Observed active steps while trace ac2e7c0c04516ba3000000000000186e waited: [{"at":1794584297370.9663,"inFlight":9,"capacity":32,"active":[{"traceId":"ac2e7c0c04516ba3000000000000186d","step":"client.http"},{"traceId":"ac2e7c0c04516ba3000000000000186f","step":"client.http"},{"traceId":"ac2e7c0c04516ba30000000000001870","step":"client.http"},{"traceId":"ac2e7c0c04516ba30000000000001871","step":"client.http"},{"traceId":"ac2e7c0c04516ba30000000000001872","step":"client.http"},{"traceId":"ac2e7c0c04516ba30000000000001873","step":"client.http"},{"traceId":"ac2e7c0c04516ba30000000000001874","step":"client.http"},{"traceId":"ac2e7c0c04516ba3000000000000186c","step":"client.http"},{"traceId":"ac2e7c0c04516ba30000000000001878","step":"client.http"}]}]

| ac2e7c0c04516ba3000000000000186c | driver.queue.scheduler-late | 101.286 | none | 2 / 32 |
| ac2e7c0c04516ba3000000000000186c | driver.queue.subject | 13.068 | ac2e7c0c04516ba3000000000000186b | 2 / 32 |
| ac2e7c0c04516ba3000000000000186c | driver.queue.scheduler-dispatch | 0.095 | none | 7 / 32 |

Observed active steps while trace ac2e7c0c04516ba3000000000000186c waited: []

| ac2e7c0c04516ba3000000000000186b | driver.queue.scheduler-late | 0.383 | none | 1 / 32 |
| ac2e7c0c04516ba3000000000000186b | driver.queue.scheduler-dispatch | 0.046 | none | 1 / 32 |

Observed active steps while trace ac2e7c0c04516ba3000000000000186b waited: []

| ac2e7c0c04516ba30000000000001f72 | driver.queue.scheduler-late | 67.732 | none | 1 / 32 |
| ac2e7c0c04516ba30000000000001f72 | driver.queue.scheduler-dispatch | 0.035 | none | 1 / 32 |

Observed active steps while trace ac2e7c0c04516ba30000000000001f72 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.885 | 0.386 | 0.000 | 1.447 | 4.626 | 0.041 | 0.000 | 0.124 | 1.214 | 3.624 | 0.033 | 0.000 | 0.443 | 12.822 | n/a | n/a | 0.050 | 5.194 | 0.234 | 0.050 |
| p99 | 69.204 | 3.875 | 3.066 | 4.541 | 17.931 | 3.511 | 2.965 | 4.195 | 35.441 | 17.544 | 0.085 | 0.000 | 5.841 | 35.176 | n/a | n/a | 0.277 | 18.541 | 0.450 | 0.277 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba3000000000000042b | 69.204 | 9.393 | 0.012 | 2.678 | 4.195 | 35.441 | 1.245 | 0.035 | 0.000 | 0.363 | 15.720 | n/a | n/a | 0.122 | 16.278 | 0.235 | 0.122 | node-14/thread-0/socket.wait-first-byte | none observed |
| ac2e7c0c04516ba30000000000000425 | 58.765 | 17.931 | 0.522 | 0.000 | 0.088 | 2.974 | 17.544 | 0.085 | 0.000 | 2.630 | 16.941 | n/a | n/a | 0.050 | 18.541 | 0.316 | 0.050 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000043d | 51.808 | 4.626 | 0.243 | 0.000 | 0.117 | 1.323 | 10.068 | 0.029 | 0.000 | 0.172 | 35.176 | n/a | n/a | 0.054 | 4.987 | 0.096 | 0.054 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000042f | 43.031 | 6.542 | 0.259 | 0.000 | 0.124 | 2.231 | 15.311 | 0.041 | 0.000 | 0.852 | 17.604 | n/a | n/a | 0.067 | 6.925 | 0.161 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000437 | 41.030 | 4.430 | 0.259 | 0.000 | 0.358 | 4.102 | 13.014 | 0.062 | 0.000 | 0.289 | 18.462 | n/a | n/a | 0.055 | 5.047 | 0.123 | 0.055 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000422 | 37.615 | 12.212 | 0.041 | 0.000 | 1.188 | 1.356 | 2.675 | 0.025 | 0.000 | 5.841 | 13.999 | n/a | n/a | 0.277 | 13.441 | 0.357 | 0.277 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000435 | 36.865 | 5.171 | 0.402 | 0.000 | 0.195 | 2.309 | 15.292 | 0.059 | 0.000 | 0.314 | 13.044 | n/a | n/a | 0.079 | 5.768 | 0.156 | 0.079 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000441 | 34.613 | 6.915 | 3.511 | 0.373 | 0.082 | 2.308 | 9.692 | 0.045 | 0.000 | 0.210 | 11.433 | n/a | n/a | 0.045 | 10.880 | 0.314 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000042d | 34.191 | 4.146 | 0.268 | 0.000 | 0.107 | 1.735 | 17.134 | 0.048 | 0.000 | 0.407 | 10.283 | n/a | n/a | 0.065 | 4.520 | 0.132 | 0.065 | gw-w/thread-52/gateway.admitted-work | none observed |
| ac2e7c0c04516ba30000000000000449 | 32.735 | 5.638 | 0.005 | 1.317 | 0.285 | 0.927 | 5.867 | 0.047 | 0.000 | 0.243 | 18.369 | n/a | n/a | 0.035 | 7.246 | 0.221 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000044b | 30.205 | 3.908 | 0.330 | 0.282 | 0.100 | 1.450 | 7.115 | 0.034 | 0.000 | 0.443 | 16.496 | n/a | n/a | 0.048 | 4.619 | 0.153 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000453 | 29.639 | 3.683 | 0.314 | 0.327 | 0.060 | 1.440 | 12.202 | 0.048 | 0.000 | 0.260 | 11.267 | n/a | n/a | 0.038 | 4.384 | 0.148 | 0.038 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000429 | 29.530 | 7.918 | 0.322 | 0.000 | 0.070 | 4.726 | 8.606 | 0.069 | 0.000 | 0.682 | 7.076 | n/a | n/a | 0.062 | 8.310 | 0.281 | 0.062 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000432 | 28.767 | 5.501 | 0.005 | 0.000 | 0.113 | 1.100 | 2.370 | 0.026 | 0.000 | 0.456 | 19.146 | n/a | n/a | 0.050 | 5.620 | 0.195 | 0.050 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000450 | 27.885 | 4.398 | 0.004 | 0.000 | 0.792 | 0.683 | 2.014 | 0.025 | 0.000 | 0.659 | 19.268 | n/a | n/a | 0.041 | 5.194 | 0.186 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000444 | 27.414 | 5.369 | 0.010 | 0.000 | 1.030 | 1.214 | 0.948 | 0.024 | 0.000 | 0.396 | 18.376 | n/a | n/a | 0.047 | 6.409 | 0.234 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000043b | 27.163 | 3.447 | 0.005 | 0.000 | 0.966 | 0.991 | 2.426 | 0.043 | 0.000 | 1.208 | 18.032 | n/a | n/a | 0.045 | 4.417 | 0.163 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000044f | 26.916 | 3.639 | 0.261 | 0.000 | 0.062 | 0.997 | 8.687 | 0.032 | 0.000 | 0.368 | 12.822 | n/a | n/a | 0.048 | 3.962 | 0.147 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000459 | 23.585 | 3.874 | 0.269 | 0.000 | 0.050 | 1.040 | 5.051 | 0.029 | 0.000 | 0.345 | 12.875 | n/a | n/a | 0.052 | 4.193 | 0.178 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000447 | 23.373 | 5.298 | 0.527 | 0.000 | 0.054 | 1.446 | 5.650 | 0.033 | 0.000 | 0.237 | 10.095 | n/a | n/a | 0.032 | 5.880 | 0.252 | 0.032 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (26 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 66.043 | n/a | n/a | n/a | 20.008 | 18.540 | 0.000 | 0.000 | 0.425 | 2.125 | 0.003 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.008 | 50.342 | 0.872 | 0.008 |
| p99 | 187.679 | n/a | n/a | n/a | 81.103 | 68.065 | 7.420 | 0.000 | 82.075 | 59.890 | 33.750 | 16.952 | 0.293 | 0.000 | n/a | n/a | 0.033 | 144.309 | 1.000 | 0.033 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba30000000000001863 | 187.679 | 81.103 | 55.786 | 7.420 | 0.000 | 0.425 | 30.417 | 0.007 | 12.501 | 0.013 | 0.000 | n/a | n/a | 0.008 | 144.309 | 0.769 | 0.008 | node-14/thread-0/client.reach | driver.expected-state.bind-receipt 1.237ms; driver.publication 1.066ms |
| ac2e7c0c04516ba30000000000001f6f | 173.953 | 46.106 | 30.029 | 2.582 | 0.000 | 82.075 | 13.145 | 0.003 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.008 | 78.717 | 0.453 | 0.008 | node-14/thread-0/socket.wait-first-byte | client.parse 3.841ms; driver.publication 2.580ms |
| ac2e7c0c04516ba30000000000000cb6 | 142.646 | 20.055 | 9.404 | 0.000 | 0.000 | 43.421 | 35.985 | 33.750 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.008 | 29.459 | 0.207 | 0.008 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.969ms; driver.publication 1.469ms; driver.publication 1.428ms; driver.publication 1.253ms; client.parse 1.176ms |
| ac2e7c0c04516ba30000000000000cb3 | 132.621 | 16.293 | 4.643 | 0.000 | 0.000 | 66.558 | 26.585 | 18.519 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.008 | 20.936 | 0.158 | 0.008 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.969ms; driver.publication 1.469ms; driver.publication 1.428ms; driver.publication 1.253ms; client.parse 1.176ms |
| ac2e7c0c04516ba30000000000001f6c | 112.979 | 57.414 | 32.568 | 5.680 | 0.000 | 1.789 | 15.499 | 0.004 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.014 | 95.662 | 0.847 | 0.014 | node-14/thread-0/client.reach | driver.publication 1.066ms |
| ac2e7c0c04516ba30000000000000cb2 | 110.679 | 38.295 | 27.804 | 2.442 | 0.000 | 8.124 | 33.972 | 0.011 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.008 | 68.541 | 0.619 | 0.008 | gw-w/thread-51/gateway.admitted-work | driver.publication 1.428ms; driver.publication 1.425ms; driver.publication 1.253ms; driver.publication 1.096ms |
| ac2e7c0c04516ba30000000000000476 | 90.712 | 24.287 | 8.879 | 2.989 | 0.000 | 0.635 | 36.937 | 0.007 | 16.952 | 0.017 | 0.000 | n/a | n/a | 0.010 | 36.155 | 0.399 | 0.010 | gw-w/thread-53/gateway.admitted-work | none observed |
| ac2e7c0c04516ba30000000000000423 | 79.449 | 14.947 | 3.256 | 0.000 | 0.000 | 0.924 | 59.890 | 0.106 | 0.000 | 0.293 | 0.000 | n/a | n/a | 0.032 | 18.203 | 0.229 | 0.032 | gw-w/thread-49/gateway.admitted-work | none observed |
| ac2e7c0c04516ba30000000000001054 | 78.608 | 31.524 | 18.540 | 4.236 | 0.000 | 4.887 | 8.250 | 11.141 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.008 | 54.300 | 0.691 | 0.008 | node-14/thread-0/client.reach | driver.publication 1.169ms |
| ac2e7c0c04516ba30000000000001b23 | 74.864 | 40.105 | 21.954 | 3.236 | 0.000 | 3.451 | 6.095 | 0.004 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.009 | 65.294 | 0.872 | 0.009 | node-14/thread-0/client.reach | driver.publication 1.289ms |
| ac2e7c0c04516ba30000000000001b27 | 74.809 | 15.416 | 52.850 | 3.702 | 0.000 | 0.698 | 2.125 | 0.004 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.010 | 71.967 | 0.962 | 0.010 | node-14/thread-0/rpc.replica.observe | client.parse 3.294ms; driver.publication 1.289ms |
| ac2e7c0c04516ba30000000000001f75 | 68.260 | 0.185 | 68.065 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 68.250 | 1.000 | 0.010 | node-14/thread-0/rpc.replica.observe | client.parse 4.216ms |
| ac2e7c0c04516ba30000000000000cdf | 66.173 | 22.149 | 15.527 | 0.000 | 0.000 | 2.980 | 25.486 | 0.007 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.009 | 37.675 | 0.569 | 0.009 | gw-w/thread-52/gateway.admitted-work | driver.publication 2.816ms; driver.publication 1.920ms; driver.publication 1.501ms; driver.publication 1.249ms |
| ac2e7c0c04516ba30000000000000ce1 | 66.043 | 13.724 | 1.268 | 0.878 | 0.000 | 17.379 | 17.399 | 15.369 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.008 | 15.870 | 0.240 | 0.008 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.920ms; driver.publication 1.386ms; driver.publication 1.249ms |
| ac2e7c0c04516ba300000000000007ae | 61.275 | 21.145 | 13.862 | 0.000 | 0.000 | 0.613 | 25.616 | 0.013 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.011 | 35.007 | 0.571 | 0.011 | gw-w/thread-52/gateway.admitted-work | none observed |
| ac2e7c0c04516ba30000000000001898 | 60.231 | 30.567 | 28.288 | 1.370 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 60.226 | 1.000 | 0.006 | node-14/thread-2/replica.pull-at | client.encode 3.581ms; driver.publication 3.522ms; driver.expected-state.bind-receipt 1.462ms; driver.publication 1.315ms; driver.publication 1.076ms |
| ac2e7c0c04516ba30000000000001b28 | 58.181 | 15.665 | 42.510 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 58.175 | 1.000 | 0.006 | node-14/thread-0/rpc.replica.observe | client.parse 3.294ms |
| ac2e7c0c04516ba30000000000000ce2 | 54.714 | 19.898 | 34.783 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 54.681 | 0.999 | 0.033 | node-14/thread-0/rpc.replica.observe | driver.publication 1.920ms |
| ac2e7c0c04516ba30000000000001899 | 54.558 | 31.183 | 21.998 | 1.370 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 54.552 | 1.000 | 0.007 | node-14/thread-2/replica.pull-at | client.encode 3.581ms; driver.publication 3.522ms; driver.expected-state.bind-receipt 1.462ms; driver.publication 1.076ms; driver.publication 1.045ms |
| ac2e7c0c04516ba30000000000000ce4 | 50.988 | 20.008 | 30.975 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 50.983 | 1.000 | 0.004 | node-14/thread-0/rpc.replica.observe | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.176 | 0.807 | 0.000 | 1.731 | 4.398 | 0.005 | 0.000 | 0.820 | 0.711 | 1.459 | 0.027 | 0.000 | 0.498 | 7.787 | n/a | n/a | 0.047 | 5.194 | 0.283 | 0.047 |
| p99 | 69.204 | 1.863 | 1.119 | 3.782 | 9.393 | 0.012 | 2.678 | 4.195 | 35.441 | 3.624 | 0.063 | 0.000 | 0.966 | 19.268 | n/a | n/a | 0.147 | 16.278 | 0.409 | 0.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba3000000000000042b | 69.204 | 9.393 | 0.012 | 2.678 | 4.195 | 35.441 | 1.245 | 0.035 | 0.000 | 0.363 | 15.720 | n/a | n/a | 0.122 | 16.278 | 0.235 | 0.122 | node-14/thread-0/socket.wait-first-byte | none observed |
| ac2e7c0c04516ba30000000000000450 | 27.885 | 4.398 | 0.004 | 0.000 | 0.792 | 0.683 | 2.014 | 0.025 | 0.000 | 0.659 | 19.268 | n/a | n/a | 0.041 | 5.194 | 0.186 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000444 | 27.414 | 5.369 | 0.010 | 0.000 | 1.030 | 1.214 | 0.948 | 0.024 | 0.000 | 0.396 | 18.376 | n/a | n/a | 0.047 | 6.409 | 0.234 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000044c | 19.756 | 6.293 | 0.010 | 0.000 | 0.373 | 0.790 | 1.678 | 0.061 | 0.000 | 0.773 | 9.631 | n/a | n/a | 0.147 | 6.676 | 0.338 | 0.147 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000430 | 16.176 | 2.996 | 0.005 | 0.000 | 0.785 | 0.717 | 3.624 | 0.031 | 0.000 | 0.178 | 7.787 | n/a | n/a | 0.053 | 3.786 | 0.234 | 0.053 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000457 | 15.605 | 5.558 | 0.005 | 0.000 | 0.820 | 0.633 | 0.939 | 0.023 | 0.000 | 0.510 | 7.074 | n/a | n/a | 0.043 | 6.383 | 0.409 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000442 | 13.936 | 3.271 | 0.005 | 0.000 | 0.896 | 0.669 | 1.459 | 0.027 | 0.000 | 0.498 | 7.073 | n/a | n/a | 0.037 | 4.173 | 0.299 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000427 | 13.757 | 3.271 | 0.006 | 0.000 | 0.621 | 0.711 | 1.927 | 0.063 | 0.000 | 0.966 | 6.138 | n/a | n/a | 0.054 | 3.898 | 0.283 | 0.054 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000455 | 11.017 | 3.034 | 0.005 | 0.000 | 0.975 | 0.570 | 0.927 | 0.022 | 0.000 | 0.457 | 4.992 | n/a | n/a | 0.034 | 4.014 | 0.364 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.628 | 0.000 | 0.000 | 0.339 | 3.830 | 0.167 | 0.000 | 0.050 | 1.537 | 6.802 | 0.053 | 0.000 | 1.564 | 9.821 | n/a | n/a | 0.037 | 4.179 | 0.157 | 0.037 |
| p99 | 27.810 | 0.296 | 0.000 | 0.546 | 4.910 | 0.209 | 0.000 | 0.139 | 1.688 | 11.361 | 0.054 | 0.000 | 2.190 | 15.683 | n/a | n/a | 0.077 | 5.118 | 0.205 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba3000000000000045b | 27.810 | 3.647 | 0.167 | 0.000 | 0.048 | 1.410 | 11.361 | 0.053 | 0.000 | 2.190 | 8.898 | n/a | n/a | 0.036 | 3.862 | 0.139 | 0.036 | gw-w/thread-51/gateway.admitted-work | none observed |
| ac2e7c0c04516ba300000000000004fd | 26.628 | 3.830 | 0.209 | 0.000 | 0.139 | 1.688 | 4.647 | 0.044 | 0.000 | 0.309 | 15.683 | n/a | n/a | 0.077 | 4.179 | 0.157 | 0.077 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000550 | 24.933 | 4.910 | 0.158 | 0.000 | 0.050 | 1.537 | 6.802 | 0.054 | 0.000 | 1.564 | 9.821 | n/a | n/a | 0.037 | 5.118 | 0.205 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.620 | 0.403 | 0.000 | 0.595 | 4.017 | 0.011 | 0.000 | 0.190 | 1.153 | 4.491 | 0.032 | 0.000 | 0.372 | 10.824 | n/a | n/a | 0.042 | 4.688 | 0.192 | 0.042 |
| p99 | 54.361 | 3.175 | 0.265 | 4.226 | 12.236 | 1.206 | 0.427 | 1.193 | 4.969 | 20.528 | 0.250 | 15.261 | 2.027 | 41.418 | n/a | n/a | 0.167 | 12.747 | 0.479 | 0.167 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba3000000000000046c | 54.361 | 4.504 | 0.005 | 0.000 | 0.667 | 2.241 | 5.019 | 0.024 | 0.000 | 0.446 | 41.418 | n/a | n/a | 0.036 | 5.177 | 0.095 | 0.036 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000049a | 45.369 | 3.696 | 0.230 | 0.229 | 0.067 | 1.562 | 20.528 | 0.052 | 0.000 | 1.611 | 17.354 | n/a | n/a | 0.040 | 4.221 | 0.093 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.675ms; driver.publication 1.298ms |
| ac2e7c0c04516ba3000000000000045f | 42.479 | 6.907 | 0.239 | 0.277 | 0.138 | 1.587 | 10.440 | 0.037 | 0.000 | 0.230 | 22.554 | n/a | n/a | 0.071 | 7.560 | 0.178 | 0.071 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004ac | 41.825 | 3.428 | 0.283 | 0.375 | 0.053 | 1.397 | 11.062 | 0.028 | 15.261 | 0.384 | 9.504 | n/a | n/a | 0.050 | 4.140 | 0.099 | 0.050 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| ac2e7c0c04516ba3000000000000047d | 39.850 | 6.154 | 0.006 | 0.000 | 0.190 | 0.967 | 1.688 | 0.038 | 0.000 | 0.866 | 29.900 | n/a | n/a | 0.042 | 6.349 | 0.159 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000466 | 39.031 | 3.375 | 0.231 | 0.292 | 0.203 | 3.956 | 13.829 | 0.034 | 0.000 | 0.237 | 16.813 | n/a | n/a | 0.061 | 4.102 | 0.105 | 0.061 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000046f | 37.138 | 3.682 | 0.178 | 0.000 | 0.069 | 1.455 | 10.664 | 0.032 | 0.000 | 0.197 | 20.818 | n/a | n/a | 0.043 | 3.928 | 0.106 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000047c | 36.079 | 3.545 | 0.243 | 0.225 | 0.062 | 1.323 | 18.111 | 0.047 | 0.000 | 0.163 | 12.323 | n/a | n/a | 0.038 | 4.074 | 0.113 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000467 | 34.368 | 8.218 | 0.005 | 0.000 | 0.426 | 4.969 | 7.787 | 0.063 | 0.000 | 0.532 | 12.203 | n/a | n/a | 0.167 | 8.648 | 0.252 | 0.167 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000469 | 32.598 | 4.316 | 0.294 | 0.000 | 0.071 | 1.379 | 9.142 | 0.047 | 0.000 | 1.016 | 16.281 | n/a | n/a | 0.050 | 4.681 | 0.144 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000049e | 30.364 | 4.045 | 0.318 | 0.266 | 0.059 | 1.336 | 8.365 | 0.046 | 0.000 | 0.538 | 15.338 | n/a | n/a | 0.052 | 4.688 | 0.154 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000498 | 29.289 | 4.641 | 0.177 | 0.426 | 0.067 | 1.393 | 8.566 | 0.029 | 0.000 | 0.182 | 13.765 | n/a | n/a | 0.042 | 5.311 | 0.181 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000478 | 28.794 | 4.724 | 0.267 | 0.427 | 0.058 | 1.538 | 5.511 | 0.029 | 0.000 | 0.239 | 15.968 | n/a | n/a | 0.033 | 5.476 | 0.190 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000049b | 28.492 | 6.466 | 0.005 | 0.000 | 0.245 | 0.758 | 2.043 | 0.050 | 0.000 | 0.283 | 18.614 | n/a | n/a | 0.028 | 6.717 | 0.236 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000481 | 27.784 | 3.489 | 1.075 | 0.255 | 0.051 | 1.153 | 10.889 | 0.040 | 0.000 | 0.459 | 10.332 | n/a | n/a | 0.040 | 4.869 | 0.175 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.619ms; driver.publication 1.070ms |
| ac2e7c0c04516ba30000000000000473 | 26.607 | 3.315 | 0.184 | 0.302 | 0.063 | 1.489 | 9.138 | 0.054 | 0.000 | 0.314 | 11.705 | n/a | n/a | 0.042 | 3.865 | 0.145 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000480 | 26.594 | 12.236 | 0.013 | 0.000 | 0.499 | 0.974 | 1.573 | 0.025 | 0.000 | 0.650 | 10.541 | n/a | n/a | 0.085 | 12.747 | 0.479 | 0.085 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000489 | 26.370 | 5.331 | 0.005 | 0.000 | 0.375 | 2.062 | 2.239 | 0.066 | 0.000 | 0.456 | 15.793 | n/a | n/a | 0.043 | 5.711 | 0.217 | 0.043 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000488 | 25.761 | 3.795 | 0.264 | 0.228 | 0.055 | 1.215 | 8.289 | 0.032 | 0.000 | 0.224 | 11.618 | n/a | n/a | 0.042 | 4.341 | 0.169 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004a2 | 25.521 | 3.524 | 0.183 | 0.209 | 0.059 | 1.005 | 7.389 | 0.029 | 0.000 | 0.411 | 12.675 | n/a | n/a | 0.037 | 3.975 | 0.156 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.163 | 0.405 | 0.000 | 1.673 | 4.017 | 0.005 | 0.000 | 0.446 | 0.777 | 0.883 | 0.023 | 0.000 | 0.406 | 6.302 | n/a | n/a | 0.044 | 4.360 | 0.304 | 0.044 |
| p99 | 34.368 | 1.840 | 0.003 | 2.111 | 8.218 | 0.011 | 0.000 | 1.193 | 4.969 | 7.787 | 0.063 | 0.000 | 0.532 | 15.109 | n/a | n/a | 0.167 | 8.648 | 0.407 | 0.167 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba30000000000000467 | 34.368 | 8.218 | 0.005 | 0.000 | 0.426 | 4.969 | 7.787 | 0.063 | 0.000 | 0.532 | 12.203 | n/a | n/a | 0.167 | 8.648 | 0.252 | 0.167 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000464 | 21.638 | 4.035 | 0.005 | 0.000 | 0.320 | 0.711 | 0.994 | 0.022 | 0.000 | 0.406 | 15.109 | n/a | n/a | 0.036 | 4.360 | 0.201 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000479 | 18.267 | 4.355 | 0.011 | 0.000 | 1.193 | 0.946 | 0.883 | 0.024 | 0.000 | 0.475 | 10.326 | n/a | n/a | 0.054 | 5.559 | 0.304 | 0.054 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004aa | 14.137 | 3.143 | 0.005 | 0.000 | 0.579 | 0.962 | 1.431 | 0.046 | 0.000 | 0.405 | 7.522 | n/a | n/a | 0.044 | 3.727 | 0.264 | 0.044 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000048e | 13.163 | 4.017 | 0.009 | 0.000 | 0.775 | 0.737 | 0.870 | 0.024 | 0.000 | 0.380 | 6.302 | n/a | n/a | 0.049 | 4.801 | 0.365 | 0.049 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000484 | 12.198 | 4.510 | 0.010 | 0.000 | 0.446 | 0.777 | 0.864 | 0.022 | 0.000 | 0.372 | 5.142 | n/a | n/a | 0.056 | 4.966 | 0.407 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004a0 | 11.260 | 3.329 | 0.005 | 0.000 | 0.316 | 0.792 | 0.907 | 0.022 | 0.000 | 0.443 | 5.410 | n/a | n/a | 0.037 | 3.649 | 0.324 | 0.037 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000492 | 9.621 | 2.936 | 0.004 | 0.000 | 0.568 | 0.525 | 0.818 | 0.023 | 0.000 | 0.413 | 4.302 | n/a | n/a | 0.031 | 3.509 | 0.365 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.013 | 0.397 | 0.000 | 0.601 | 3.962 | 0.171 | 0.000 | 0.128 | 1.452 | 5.507 | 0.037 | 0.000 | 0.334 | 11.182 | n/a | n/a | 0.047 | 4.681 | 0.207 | 0.047 |
| p99 | 67.313 | 2.164 | 1.042 | 2.457 | 8.218 | 0.387 | 0.515 | 1.145 | 4.674 | 13.969 | 0.910 | 0.000 | 3.948 | 47.966 | n/a | n/a | 0.104 | 9.265 | 0.399 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba300000000000004d7 | 67.313 | 3.605 | 0.220 | 0.000 | 0.070 | 4.674 | 10.373 | 0.071 | 0.000 | 0.290 | 47.966 | n/a | n/a | 0.045 | 3.895 | 0.058 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004c1 | 36.268 | 4.544 | 0.359 | 0.000 | 0.118 | 1.648 | 13.969 | 0.045 | 0.000 | 0.201 | 15.279 | n/a | n/a | 0.104 | 5.021 | 0.138 | 0.104 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004b2 | 32.838 | 4.053 | 0.387 | 0.280 | 0.083 | 1.511 | 13.719 | 0.031 | 0.000 | 0.170 | 12.553 | n/a | n/a | 0.051 | 4.803 | 0.146 | 0.051 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004e7 | 29.570 | 6.004 | 0.171 | 0.000 | 0.083 | 1.830 | 10.395 | 0.057 | 0.000 | 0.279 | 10.701 | n/a | n/a | 0.050 | 6.259 | 0.212 | 0.050 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004ba | 29.388 | 5.374 | 0.010 | 0.000 | 0.409 | 0.875 | 2.202 | 0.033 | 0.000 | 0.298 | 20.110 | n/a | n/a | 0.077 | 5.793 | 0.197 | 0.077 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004db | 29.246 | 3.423 | 0.229 | 0.000 | 0.128 | 1.143 | 9.384 | 0.042 | 0.000 | 0.280 | 14.545 | n/a | n/a | 0.071 | 3.780 | 0.129 | 0.071 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004c9 | 28.789 | 5.162 | 0.250 | 0.426 | 0.107 | 1.563 | 6.385 | 0.044 | 0.000 | 0.188 | 14.583 | n/a | n/a | 0.080 | 5.945 | 0.207 | 0.080 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004e1 | 28.390 | 3.376 | 0.308 | 0.000 | 0.115 | 1.635 | 6.184 | 0.031 | 0.000 | 0.423 | 16.252 | n/a | n/a | 0.065 | 3.800 | 0.134 | 0.065 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004bc | 28.099 | 4.399 | 0.009 | 0.000 | 0.273 | 0.843 | 7.083 | 0.048 | 0.000 | 0.438 | 14.949 | n/a | n/a | 0.057 | 4.681 | 0.167 | 0.057 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004b9 | 27.944 | 3.447 | 0.276 | 0.359 | 0.106 | 1.273 | 5.507 | 0.040 | 0.000 | 0.371 | 16.488 | n/a | n/a | 0.078 | 4.187 | 0.150 | 0.078 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004ae | 27.168 | 5.953 | 0.342 | 0.000 | 0.063 | 1.954 | 6.837 | 0.037 | 0.000 | 0.216 | 11.709 | n/a | n/a | 0.057 | 6.357 | 0.234 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004d3 | 26.345 | 5.030 | 0.239 | 0.515 | 0.067 | 1.797 | 9.016 | 0.046 | 0.000 | 0.262 | 9.315 | n/a | n/a | 0.058 | 5.850 | 0.222 | 0.058 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004f7 | 25.977 | 4.703 | 0.201 | 0.000 | 0.064 | 1.782 | 7.299 | 0.076 | 0.000 | 0.629 | 11.182 | n/a | n/a | 0.042 | 4.968 | 0.191 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004f3 | 25.762 | 3.326 | 0.199 | 0.000 | 0.071 | 1.427 | 9.445 | 0.056 | 0.000 | 0.177 | 11.014 | n/a | n/a | 0.047 | 3.596 | 0.140 | 0.047 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004e8 | 25.758 | 8.218 | 0.011 | 0.000 | 1.036 | 1.619 | 2.312 | 0.044 | 0.000 | 0.260 | 12.219 | n/a | n/a | 0.040 | 9.265 | 0.360 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004d5 | 25.702 | 3.374 | 0.183 | 0.244 | 0.055 | 1.452 | 7.697 | 0.083 | 0.000 | 0.201 | 12.375 | n/a | n/a | 0.039 | 3.855 | 0.150 | 0.039 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004dc | 24.204 | 4.393 | 0.006 | 0.000 | 0.500 | 0.594 | 1.349 | 0.024 | 0.000 | 3.948 | 13.355 | n/a | n/a | 0.036 | 4.899 | 0.202 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004c3 | 23.745 | 3.310 | 0.269 | 0.000 | 0.116 | 1.748 | 7.196 | 0.031 | 0.000 | 0.484 | 10.525 | n/a | n/a | 0.065 | 3.696 | 0.156 | 0.065 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004eb | 23.627 | 4.935 | 0.303 | 0.000 | 0.052 | 1.804 | 7.071 | 0.036 | 0.000 | 0.370 | 9.016 | n/a | n/a | 0.041 | 5.290 | 0.224 | 0.041 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004cf | 23.013 | 4.186 | 0.317 | 0.293 | 0.071 | 1.556 | 5.759 | 0.034 | 0.000 | 0.534 | 10.220 | n/a | n/a | 0.044 | 4.866 | 0.211 | 0.044 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.661 | 0.566 | 0.000 | 1.502 | 3.523 | 0.005 | 0.000 | 0.710 | 0.731 | 1.063 | 0.025 | 0.000 | 0.422 | 10.600 | n/a | n/a | 0.040 | 3.844 | 0.232 | 0.040 |
| p99 | 23.005 | 2.164 | 1.042 | 2.457 | 6.725 | 0.013 | 0.000 | 1.145 | 2.185 | 1.539 | 0.053 | 0.000 | 0.789 | 15.055 | n/a | n/a | 0.055 | 7.881 | 0.399 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba300000000000004bf | 23.005 | 2.713 | 0.005 | 0.000 | 1.125 | 2.185 | 1.535 | 0.046 | 0.000 | 0.300 | 15.055 | n/a | n/a | 0.040 | 3.844 | 0.167 | 0.040 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004e3 | 21.420 | 3.796 | 0.005 | 0.000 | 0.383 | 0.958 | 1.290 | 0.034 | 0.000 | 0.789 | 14.114 | n/a | n/a | 0.051 | 4.184 | 0.195 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004d8 | 20.344 | 6.725 | 0.011 | 0.000 | 1.145 | 1.555 | 0.952 | 0.024 | 0.000 | 0.469 | 9.423 | n/a | n/a | 0.040 | 7.881 | 0.387 | 0.040 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004b4 | 20.239 | 3.547 | 0.005 | 0.000 | 0.208 | 0.718 | 1.443 | 0.040 | 0.000 | 0.334 | 13.892 | n/a | n/a | 0.053 | 3.759 | 0.186 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004f8 | 20.161 | 3.962 | 0.010 | 0.000 | 0.710 | 0.904 | 1.403 | 0.037 | 0.000 | 0.648 | 12.438 | n/a | n/a | 0.050 | 4.682 | 0.232 | 0.050 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004b0 | 17.661 | 3.958 | 0.005 | 0.000 | 0.463 | 0.644 | 1.056 | 0.024 | 0.000 | 0.230 | 11.243 | n/a | n/a | 0.037 | 4.427 | 0.251 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004f0 | 16.297 | 2.674 | 0.005 | 0.000 | 0.928 | 0.639 | 0.844 | 0.024 | 0.000 | 0.546 | 10.600 | n/a | n/a | 0.037 | 3.607 | 0.221 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004c7 | 13.628 | 2.713 | 0.005 | 0.000 | 0.714 | 0.731 | 1.539 | 0.053 | 0.000 | 0.248 | 7.591 | n/a | n/a | 0.033 | 3.432 | 0.252 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004c5 | 12.322 | 2.777 | 0.005 | 0.000 | 0.796 | 0.553 | 1.063 | 0.024 | 0.000 | 0.666 | 6.404 | n/a | n/a | 0.035 | 3.577 | 0.290 | 0.035 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004fa | 9.887 | 3.523 | 0.013 | 0.000 | 0.408 | 0.751 | 0.871 | 0.025 | 0.000 | 0.422 | 3.818 | n/a | n/a | 0.055 | 3.944 | 0.399 | 0.055 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.764 | 0.454 | 0.000 | 1.267 | 3.802 | 0.011 | 0.000 | 0.170 | 1.148 | 4.248 | 0.031 | 0.000 | 0.471 | 10.386 | n/a | n/a | 0.052 | 4.325 | 0.196 | 0.052 |
| p99 | 68.576 | 2.830 | 0.012 | 2.834 | 12.275 | 1.194 | 0.000 | 1.193 | 3.271 | 19.210 | 0.079 | 19.778 | 3.690 | 37.436 | n/a | n/a | 0.121 | 13.010 | 0.436 | 0.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba30000000000000521 | 68.576 | 12.275 | 0.011 | 0.000 | 0.724 | 3.271 | 19.210 | 0.064 | 19.778 | 1.883 | 11.317 | n/a | n/a | 0.043 | 13.010 | 0.190 | 0.043 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| ac2e7c0c04516ba30000000000000517 | 45.245 | 3.802 | 0.006 | 0.000 | 0.343 | 0.914 | 1.749 | 0.079 | 0.000 | 0.876 | 37.436 | n/a | n/a | 0.041 | 4.150 | 0.092 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000509 | 41.147 | 3.886 | 0.190 | 0.000 | 0.057 | 1.448 | 11.974 | 0.052 | 0.000 | 0.149 | 23.346 | n/a | n/a | 0.043 | 4.134 | 0.100 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000542 | 35.954 | 3.473 | 0.195 | 0.000 | 0.060 | 1.361 | 10.224 | 0.055 | 0.000 | 0.803 | 19.719 | n/a | n/a | 0.063 | 3.729 | 0.104 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000506 | 32.605 | 5.095 | 0.004 | 0.000 | 1.193 | 1.605 | 1.556 | 0.025 | 0.000 | 0.164 | 22.933 | n/a | n/a | 0.030 | 6.292 | 0.193 | 0.030 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.019ms |
| ac2e7c0c04516ba30000000000000510 | 32.558 | 3.786 | 0.303 | 0.000 | 0.069 | 1.256 | 15.761 | 0.037 | 0.000 | 0.897 | 10.386 | n/a | n/a | 0.063 | 4.158 | 0.128 | 0.063 | gw-w/thread-48/gateway.admitted-work | none observed |
| ac2e7c0c04516ba3000000000000050c | 31.256 | 3.597 | 1.194 | 0.000 | 0.071 | 1.222 | 6.909 | 0.051 | 0.000 | 0.431 | 17.706 | n/a | n/a | 0.076 | 4.862 | 0.156 | 0.076 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000520 | 29.421 | 4.745 | 0.207 | 0.000 | 0.082 | 1.656 | 7.584 | 0.048 | 0.000 | 2.048 | 13.003 | n/a | n/a | 0.048 | 5.033 | 0.171 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000511 | 28.306 | 6.360 | 0.007 | 0.000 | 0.520 | 0.781 | 2.532 | 0.024 | 0.000 | 3.690 | 14.325 | n/a | n/a | 0.065 | 6.887 | 0.243 | 0.065 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000052d | 27.669 | 7.402 | 0.010 | 0.000 | 1.094 | 0.802 | 1.209 | 0.023 | 0.000 | 0.247 | 16.821 | n/a | n/a | 0.061 | 8.506 | 0.307 | 0.061 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000534 | 27.282 | 4.727 | 0.256 | 0.000 | 0.059 | 1.597 | 6.532 | 0.047 | 0.000 | 0.501 | 13.504 | n/a | n/a | 0.058 | 5.042 | 0.185 | 0.058 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000052c | 27.107 | 3.611 | 0.339 | 0.000 | 0.101 | 1.635 | 9.835 | 0.046 | 0.000 | 0.719 | 10.750 | n/a | n/a | 0.071 | 4.052 | 0.149 | 0.071 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000524 | 26.742 | 5.314 | 0.351 | 0.000 | 0.104 | 1.711 | 6.867 | 0.034 | 0.000 | 0.498 | 11.775 | n/a | n/a | 0.088 | 5.769 | 0.216 | 0.088 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000054c | 26.312 | 4.778 | 0.278 | 0.000 | 0.067 | 2.133 | 5.939 | 0.031 | 0.000 | 0.471 | 12.556 | n/a | n/a | 0.059 | 5.123 | 0.195 | 0.059 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000545 | 24.587 | 4.771 | 0.006 | 0.000 | 0.502 | 0.691 | 4.698 | 0.027 | 0.000 | 0.168 | 13.676 | n/a | n/a | 0.047 | 5.280 | 0.215 | 0.047 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000054a | 24.312 | 4.592 | 0.242 | 0.000 | 0.107 | 1.789 | 9.538 | 0.027 | 0.000 | 0.446 | 7.513 | n/a | n/a | 0.059 | 4.940 | 0.203 | 0.059 | gw-w/thread-46/gateway.admitted-work | none observed |
| ac2e7c0c04516ba30000000000000503 | 23.799 | 4.671 | 0.185 | 0.000 | 0.057 | 1.604 | 7.128 | 0.032 | 0.000 | 0.370 | 9.709 | n/a | n/a | 0.043 | 4.913 | 0.206 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000504 | 23.483 | 2.819 | 0.005 | 0.000 | 0.713 | 1.148 | 1.023 | 0.022 | 0.000 | 1.722 | 15.985 | n/a | n/a | 0.044 | 3.537 | 0.151 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000543 | 22.979 | 4.172 | 0.005 | 0.000 | 0.333 | 0.670 | 0.845 | 0.023 | 0.000 | 0.201 | 16.685 | n/a | n/a | 0.045 | 4.510 | 0.196 | 0.045 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004fe | 22.175 | 3.453 | 0.005 | 0.000 | 0.529 | 0.934 | 0.864 | 0.023 | 0.000 | 0.216 | 16.084 | n/a | n/a | 0.066 | 3.986 | 0.180 | 0.066 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.455 | 0.599 | 0.000 | 1.748 | 3.672 | 0.006 | 0.000 | 0.529 | 0.901 | 1.101 | 0.024 | 0.000 | 0.518 | 9.840 | n/a | n/a | 0.052 | 4.217 | 0.250 | 0.052 |
| p99 | 45.245 | 1.958 | 0.000 | 2.301 | 4.561 | 0.015 | 0.000 | 1.073 | 2.385 | 2.855 | 0.079 | 0.000 | 1.722 | 37.436 | n/a | n/a | 0.121 | 5.644 | 0.436 | 0.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba30000000000000517 | 45.245 | 3.802 | 0.006 | 0.000 | 0.343 | 0.914 | 1.749 | 0.079 | 0.000 | 0.876 | 37.436 | n/a | n/a | 0.041 | 4.150 | 0.092 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000504 | 23.483 | 2.819 | 0.005 | 0.000 | 0.713 | 1.148 | 1.023 | 0.022 | 0.000 | 1.722 | 15.985 | n/a | n/a | 0.044 | 3.537 | 0.151 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000543 | 22.979 | 4.172 | 0.005 | 0.000 | 0.333 | 0.670 | 0.845 | 0.023 | 0.000 | 0.201 | 16.685 | n/a | n/a | 0.045 | 4.510 | 0.196 | 0.045 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000004fe | 22.175 | 3.453 | 0.005 | 0.000 | 0.529 | 0.934 | 0.864 | 0.023 | 0.000 | 0.216 | 16.084 | n/a | n/a | 0.066 | 3.986 | 0.180 | 0.066 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000050e | 21.764 | 3.490 | 0.005 | 0.000 | 0.722 | 0.598 | 1.729 | 0.021 | 0.000 | 0.392 | 14.764 | n/a | n/a | 0.042 | 4.217 | 0.194 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000527 | 20.770 | 4.378 | 0.006 | 0.000 | 0.877 | 2.385 | 1.579 | 0.067 | 0.000 | 1.576 | 9.840 | n/a | n/a | 0.062 | 5.261 | 0.253 | 0.062 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000535 | 19.982 | 4.133 | 0.015 | 0.000 | 0.839 | 0.898 | 1.393 | 0.041 | 0.000 | 0.864 | 11.753 | n/a | n/a | 0.046 | 4.987 | 0.250 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000054d | 17.455 | 4.561 | 0.010 | 0.000 | 1.073 | 0.901 | 1.101 | 0.037 | 0.000 | 0.651 | 8.999 | n/a | n/a | 0.121 | 5.644 | 0.323 | 0.121 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000051c | 16.063 | 4.227 | 0.009 | 0.000 | 0.170 | 0.667 | 1.107 | 0.023 | 0.000 | 0.220 | 9.577 | n/a | n/a | 0.063 | 4.406 | 0.274 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000531 | 15.953 | 2.593 | 0.005 | 0.000 | 0.246 | 0.334 | 1.057 | 0.021 | 0.000 | 0.143 | 11.517 | n/a | n/a | 0.038 | 2.843 | 0.178 | 0.038 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000519 | 13.837 | 3.560 | 0.009 | 0.000 | 0.756 | 0.932 | 2.855 | 0.036 | 0.000 | 0.740 | 4.881 | n/a | n/a | 0.066 | 4.325 | 0.313 | 0.066 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000501 | 13.531 | 2.599 | 0.005 | 0.000 | 0.331 | 1.200 | 0.863 | 0.023 | 0.000 | 0.196 | 8.262 | n/a | n/a | 0.052 | 2.935 | 0.217 | 0.052 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000515 | 13.177 | 3.433 | 0.005 | 0.000 | 0.665 | 0.616 | 0.937 | 0.028 | 0.000 | 0.518 | 6.927 | n/a | n/a | 0.046 | 4.104 | 0.311 | 0.046 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000053d | 12.599 | 3.672 | 0.006 | 0.000 | 0.424 | 0.930 | 1.372 | 0.039 | 0.000 | 0.649 | 5.452 | n/a | n/a | 0.054 | 4.102 | 0.326 | 0.054 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000539 | 11.328 | 4.412 | 0.011 | 0.000 | 0.513 | 0.733 | 1.004 | 0.024 | 0.000 | 0.222 | 4.348 | n/a | n/a | 0.062 | 4.936 | 0.436 | 0.062 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.355 | 0.436 | 0.000 | 1.413 | 3.633 | 0.010 | 0.000 | 0.347 | 1.042 | 2.858 | 0.031 | 0.000 | 0.355 | 9.210 | n/a | n/a | 0.047 | 4.067 | 0.229 | 0.047 |
| p99 | 50.843 | 2.194 | 0.258 | 3.471 | 7.100 | 2.769 | 0.000 | 1.086 | 8.603 | 17.604 | 0.093 | 17.848 | 2.383 | 35.581 | n/a | n/a | 0.097 | 7.857 | 0.487 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba3000000000000058e | 50.843 | 4.032 | 2.769 | 0.000 | 0.128 | 1.453 | 6.302 | 0.036 | 0.000 | 0.471 | 35.581 | n/a | n/a | 0.072 | 6.928 | 0.136 | 0.072 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 1.007ms |
| ac2e7c0c04516ba3000000000000055d | 39.280 | 4.436 | 0.361 | 0.000 | 0.056 | 3.456 | 10.740 | 0.045 | 0.000 | 1.507 | 18.625 | n/a | n/a | 0.055 | 4.853 | 0.124 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000574 | 38.553 | 3.366 | 0.277 | 0.000 | 0.052 | 1.313 | 6.327 | 0.029 | 17.848 | 0.368 | 8.930 | n/a | n/a | 0.042 | 3.696 | 0.096 | 0.042 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| ac2e7c0c04516ba300000000000005af | 37.004 | 2.982 | 0.194 | 0.000 | 0.064 | 1.234 | 14.922 | 0.093 | 0.000 | 1.436 | 16.038 | n/a | n/a | 0.042 | 3.240 | 0.088 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000055b | 35.930 | 3.323 | 0.004 | 0.000 | 0.631 | 0.554 | 0.926 | 0.023 | 0.000 | 0.453 | 29.969 | n/a | n/a | 0.048 | 3.959 | 0.110 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000058b | 34.277 | 7.100 | 0.006 | 0.000 | 0.752 | 1.042 | 2.858 | 0.034 | 0.000 | 2.383 | 20.037 | n/a | n/a | 0.064 | 7.857 | 0.229 | 0.064 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000059b | 33.253 | 3.379 | 0.230 | 0.000 | 0.120 | 1.776 | 13.770 | 0.054 | 0.000 | 0.614 | 13.242 | n/a | n/a | 0.067 | 3.729 | 0.112 | 0.067 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000561 | 32.473 | 4.406 | 0.006 | 0.000 | 0.740 | 0.716 | 13.213 | 0.035 | 0.000 | 0.657 | 12.642 | n/a | n/a | 0.058 | 5.152 | 0.159 | 0.058 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000056c | 31.633 | 3.430 | 0.176 | 0.000 | 0.055 | 1.284 | 17.604 | 0.045 | 0.000 | 0.752 | 8.246 | n/a | n/a | 0.041 | 3.661 | 0.116 | 0.041 | gw-w/thread-51/gateway.admitted-work | none observed |
| ac2e7c0c04516ba300000000000005a1 | 28.662 | 3.643 | 0.227 | 0.000 | 0.175 | 1.680 | 6.210 | 0.046 | 0.000 | 0.268 | 16.336 | n/a | n/a | 0.079 | 4.044 | 0.141 | 0.079 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005a9 | 28.305 | 3.621 | 0.284 | 0.000 | 0.099 | 1.273 | 10.989 | 0.033 | 0.000 | 0.195 | 11.752 | n/a | n/a | 0.059 | 4.004 | 0.141 | 0.059 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000566 | 26.702 | 4.470 | 0.197 | 0.000 | 0.058 | 1.456 | 6.444 | 0.040 | 0.000 | 0.671 | 13.323 | n/a | n/a | 0.043 | 4.724 | 0.177 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000058f | 26.441 | 3.698 | 0.007 | 0.000 | 0.188 | 0.698 | 0.998 | 0.027 | 0.000 | 0.516 | 20.250 | n/a | n/a | 0.060 | 3.893 | 0.147 | 0.060 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000553 | 25.308 | 3.385 | 0.241 | 0.000 | 0.048 | 1.263 | 10.928 | 0.051 | 0.000 | 0.334 | 9.011 | n/a | n/a | 0.046 | 3.674 | 0.145 | 0.046 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000059d | 24.789 | 3.139 | 0.200 | 0.000 | 0.060 | 1.621 | 7.562 | 0.040 | 0.000 | 0.210 | 11.916 | n/a | n/a | 0.041 | 3.399 | 0.137 | 0.041 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000564 | 24.665 | 3.521 | 0.191 | 0.000 | 0.048 | 1.234 | 7.329 | 0.032 | 0.000 | 0.256 | 12.015 | n/a | n/a | 0.040 | 3.760 | 0.152 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000598 | 24.329 | 6.099 | 0.375 | 0.000 | 0.104 | 1.319 | 5.181 | 0.028 | 0.000 | 0.364 | 10.808 | n/a | n/a | 0.052 | 6.577 | 0.270 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000599 | 23.746 | 4.986 | 0.006 | 0.000 | 0.856 | 8.603 | 6.427 | 0.050 | 0.000 | 0.261 | 2.503 | n/a | n/a | 0.054 | 5.848 | 0.246 | 0.054 | node-14/thread-0/socket.wait-first-byte | none observed |
| ac2e7c0c04516ba30000000000000570 | 22.536 | 4.574 | 0.178 | 0.000 | 0.062 | 1.920 | 6.004 | 0.038 | 0.000 | 0.288 | 9.430 | n/a | n/a | 0.042 | 4.814 | 0.214 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005b3 | 22.215 | 3.845 | 0.280 | 0.000 | 0.114 | 1.386 | 5.234 | 0.032 | 0.000 | 0.486 | 10.742 | n/a | n/a | 0.097 | 4.239 | 0.191 | 0.097 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.203 | 0.493 | 0.000 | 1.553 | 3.373 | 0.005 | 0.000 | 0.570 | 0.688 | 0.899 | 0.025 | 0.000 | 0.400 | 6.102 | n/a | n/a | 0.047 | 3.893 | 0.283 | 0.047 |
| p99 | 35.930 | 1.540 | 0.258 | 2.734 | 4.986 | 0.012 | 0.000 | 0.856 | 8.603 | 6.427 | 0.083 | 0.000 | 0.910 | 29.969 | n/a | n/a | 0.095 | 5.848 | 0.390 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba3000000000000055b | 35.930 | 3.323 | 0.004 | 0.000 | 0.631 | 0.554 | 0.926 | 0.023 | 0.000 | 0.453 | 29.969 | n/a | n/a | 0.048 | 3.959 | 0.110 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000058f | 26.441 | 3.698 | 0.007 | 0.000 | 0.188 | 0.698 | 0.998 | 0.027 | 0.000 | 0.516 | 20.250 | n/a | n/a | 0.060 | 3.893 | 0.147 | 0.060 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000599 | 23.746 | 4.986 | 0.006 | 0.000 | 0.856 | 8.603 | 6.427 | 0.050 | 0.000 | 0.261 | 2.503 | n/a | n/a | 0.054 | 5.848 | 0.246 | 0.054 | node-14/thread-0/socket.wait-first-byte | none observed |
| ac2e7c0c04516ba30000000000000556 | 18.606 | 4.645 | 0.010 | 0.000 | 0.615 | 0.793 | 4.015 | 0.042 | 0.000 | 0.257 | 8.135 | n/a | n/a | 0.095 | 5.270 | 0.283 | 0.095 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000055f | 18.311 | 4.342 | 0.006 | 0.000 | 0.804 | 0.818 | 0.899 | 0.033 | 0.000 | 0.465 | 10.896 | n/a | n/a | 0.047 | 5.152 | 0.281 | 0.047 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000057a | 16.940 | 3.373 | 0.005 | 0.000 | 0.689 | 0.474 | 1.014 | 0.020 | 0.000 | 0.134 | 11.196 | n/a | n/a | 0.035 | 4.067 | 0.240 | 0.035 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 1.149ms |
| ac2e7c0c04516ba30000000000000552 | 16.579 | 4.903 | 0.012 | 0.000 | 0.521 | 1.763 | 2.113 | 0.037 | 0.000 | 0.234 | 6.918 | n/a | n/a | 0.077 | 5.435 | 0.328 | 0.077 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005b1 | 13.190 | 3.529 | 0.010 | 0.000 | 0.349 | 0.779 | 0.811 | 0.023 | 0.000 | 0.418 | 7.215 | n/a | n/a | 0.057 | 3.887 | 0.295 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000059e | 12.203 | 2.875 | 0.005 | 0.000 | 0.269 | 0.688 | 1.424 | 0.083 | 0.000 | 0.717 | 6.102 | n/a | n/a | 0.040 | 3.149 | 0.258 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000595 | 12.068 | 3.211 | 0.005 | 0.000 | 0.570 | 0.610 | 0.839 | 0.024 | 0.000 | 0.275 | 6.486 | n/a | n/a | 0.047 | 3.786 | 0.314 | 0.047 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000590 | 11.466 | 2.605 | 0.006 | 0.000 | 0.476 | 0.472 | 0.891 | 0.031 | 0.000 | 0.910 | 6.029 | n/a | n/a | 0.045 | 3.087 | 0.269 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.007ms |
| ac2e7c0c04516ba30000000000000584 | 10.631 | 3.594 | 0.005 | 0.000 | 0.524 | 0.669 | 0.976 | 0.025 | 0.000 | 0.443 | 4.344 | n/a | n/a | 0.051 | 4.123 | 0.388 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000567 | 10.334 | 2.857 | 0.005 | 0.000 | 0.842 | 0.702 | 0.800 | 0.023 | 0.000 | 0.188 | 4.877 | n/a | n/a | 0.040 | 3.704 | 0.358 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005ad | 10.219 | 3.379 | 0.005 | 0.000 | 0.605 | 0.623 | 0.869 | 0.024 | 0.000 | 0.419 | 4.241 | n/a | n/a | 0.053 | 3.989 | 0.390 | 0.053 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005a6 | 9.730 | 3.150 | 0.005 | 0.000 | 0.187 | 0.740 | 0.896 | 0.026 | 0.000 | 0.355 | 4.327 | n/a | n/a | 0.045 | 3.342 | 0.343 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000571 | 8.505 | 2.554 | 0.005 | 0.000 | 0.656 | 0.556 | 0.809 | 0.021 | 0.000 | 0.400 | 3.469 | n/a | n/a | 0.036 | 3.215 | 0.378 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.213 | 0.300 | 0.000 | 1.206 | 3.758 | 0.021 | 0.000 | 0.140 | 1.159 | 2.629 | 0.030 | 0.000 | 0.356 | 8.496 | n/a | n/a | 0.052 | 4.198 | 0.239 | 0.052 |
| p99 | 52.381 | 1.451 | 0.000 | 14.659 | 18.025 | n/a | 0.000 | 2.194 | 3.687 | 18.489 | 0.068 | 20.325 | 1.339 | 29.126 | n/a | n/a | 0.144 | 18.957 | 0.472 | 0.144 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba300000000000005d5 | 52.381 | 18.025 | 0.011 | 0.000 | 0.921 | 1.827 | 1.157 | 0.026 | 0.000 | 1.195 | 29.126 | n/a | n/a | 0.094 | 18.957 | 0.362 | 0.094 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005db | 46.446 | 3.193 | 0.191 | 0.000 | 0.053 | 1.283 | 11.411 | 0.045 | 20.325 | 0.686 | 9.219 | n/a | n/a | 0.039 | 3.437 | 0.074 | 0.039 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| ac2e7c0c04516ba30000000000000602 | 42.339 | 4.177 | 3.510 | 0.000 | 0.069 | 1.377 | 6.021 | 0.034 | 0.000 | 0.493 | 26.620 | n/a | n/a | 0.038 | 7.755 | 0.183 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 2.603ms |
| ac2e7c0c04516ba300000000000005e5 | 34.643 | 3.512 | 0.241 | 0.000 | 0.141 | 1.753 | 12.564 | 0.031 | 0.000 | 0.161 | 16.153 | n/a | n/a | 0.087 | 3.895 | 0.112 | 0.087 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005cd | 32.050 | 7.017 | 0.496 | 0.000 | 0.084 | 3.507 | 9.168 | 0.037 | 0.000 | 0.502 | 11.181 | n/a | n/a | 0.057 | 7.598 | 0.237 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005f3 | 30.550 | 2.964 | 0.202 | 0.000 | 0.057 | 1.085 | 10.776 | 0.066 | 0.000 | 0.442 | 14.915 | n/a | n/a | 0.044 | 3.223 | 0.106 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005fd | 29.775 | 3.758 | 0.377 | 0.000 | 0.063 | 1.565 | 8.830 | 0.039 | 0.000 | 0.476 | 14.605 | n/a | n/a | 0.060 | 4.198 | 0.141 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005bd | 29.755 | 2.870 | 0.226 | 0.000 | 0.122 | 1.219 | 18.489 | 0.034 | 0.000 | 0.155 | 6.568 | n/a | n/a | 0.073 | 3.218 | 0.108 | 0.073 | gw-w/thread-53/gateway.admitted-work | none observed |
| ac2e7c0c04516ba3000000000000060a | 29.514 | 3.438 | 0.249 | 0.000 | 0.068 | 1.464 | 8.900 | 0.031 | 0.000 | 0.334 | 14.968 | n/a | n/a | 0.062 | 3.755 | 0.127 | 0.062 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005c5 | 29.303 | 4.993 | 0.278 | 0.000 | 0.062 | 1.512 | 8.825 | 0.030 | 0.000 | 0.174 | 13.373 | n/a | n/a | 0.057 | 5.333 | 0.182 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005b9 | 29.247 | 3.340 | 0.207 | 0.000 | 0.077 | 1.453 | 9.958 | 0.030 | 0.000 | 0.217 | 13.919 | n/a | n/a | 0.046 | 3.623 | 0.124 | 0.046 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000603 | 28.722 | 7.561 | 0.008 | 0.000 | 2.194 | 0.924 | 1.489 | 0.029 | 0.000 | 0.597 | 15.870 | n/a | n/a | 0.051 | 9.763 | 0.340 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005cb | 28.337 | 4.175 | 0.265 | 0.000 | 0.064 | 1.636 | 12.578 | 0.042 | 0.000 | 0.194 | 9.333 | n/a | n/a | 0.052 | 4.504 | 0.159 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba30000000000000608 | 25.275 | 3.257 | 0.187 | 0.000 | 0.068 | 1.003 | 4.773 | 0.029 | 0.000 | 0.165 | 15.749 | n/a | n/a | 0.045 | 3.512 | 0.139 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005ef | 23.945 | 3.897 | 0.285 | 0.000 | 0.055 | 1.752 | 7.947 | 0.039 | 0.000 | 0.280 | 9.643 | n/a | n/a | 0.047 | 4.238 | 0.177 | 0.047 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005df | 22.423 | 5.035 | 0.252 | 0.000 | 0.140 | 1.676 | 6.304 | 0.031 | 0.000 | 0.408 | 8.496 | n/a | n/a | 0.079 | 5.428 | 0.242 | 0.079 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005d7 | 21.324 | 3.453 | 0.223 | 0.000 | 0.092 | 1.159 | 4.896 | 0.028 | 0.000 | 0.185 | 11.229 | n/a | n/a | 0.060 | 3.767 | 0.177 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005e7 | 19.446 | 3.328 | 0.213 | 0.000 | 0.074 | 1.315 | 5.092 | 0.032 | 0.000 | 0.194 | 9.150 | n/a | n/a | 0.048 | 3.615 | 0.186 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005e3 | 19.299 | 4.952 | 0.010 | 0.000 | 0.317 | 0.762 | 0.944 | 0.024 | 0.000 | 0.210 | 11.936 | n/a | n/a | 0.144 | 5.279 | 0.274 | 0.144 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005f0 | 18.432 | 3.999 | 0.008 | 0.000 | 1.218 | 0.714 | 1.083 | 0.029 | 0.000 | 0.178 | 11.130 | n/a | n/a | 0.073 | 5.225 | 0.283 | 0.073 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.334 | 0.445 | 0.000 | 1.483 | 3.477 | 0.006 | 0.000 | 0.404 | 0.792 | 1.157 | 0.025 | 0.000 | 0.382 | 6.507 | n/a | n/a | 0.053 | 3.887 | 0.331 | 0.053 |
| p99 | 52.381 | 0.936 | 0.000 | 14.659 | 18.025 | n/a | 0.000 | 1.218 | 3.687 | 8.486 | 0.047 | 0.000 | 1.339 | 29.126 | n/a | n/a | 0.094 | 18.957 | 0.472 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba300000000000005d5 | 52.381 | 18.025 | 0.011 | 0.000 | 0.921 | 1.827 | 1.157 | 0.026 | 0.000 | 1.195 | 29.126 | n/a | n/a | 0.094 | 18.957 | 0.362 | 0.094 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005f0 | 18.432 | 3.999 | 0.008 | 0.000 | 1.218 | 0.714 | 1.083 | 0.029 | 0.000 | 0.178 | 11.130 | n/a | n/a | 0.073 | 5.225 | 0.283 | 0.073 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005f4 | 18.164 | 2.801 | 0.005 | 0.000 | 0.256 | 0.630 | 4.500 | 0.029 | 0.000 | 0.175 | 9.729 | n/a | n/a | 0.040 | 3.062 | 0.169 | 0.040 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005fa | 15.491 | 2.714 | 0.005 | 0.000 | 0.251 | 3.687 | 1.448 | 0.047 | 0.000 | 1.159 | 6.142 | n/a | n/a | 0.038 | 2.970 | 0.192 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005d8 | 15.023 | 3.477 | 0.006 | 0.000 | 0.404 | 0.792 | 1.002 | 0.025 | 0.000 | 1.339 | 7.925 | n/a | n/a | 0.053 | 3.887 | 0.259 | 0.053 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005ce | 14.658 | 6.032 | 0.021 | 0.000 | 0.864 | 0.774 | 1.195 | 0.023 | 0.000 | 0.474 | 5.209 | n/a | n/a | 0.066 | 6.917 | 0.472 | 0.066 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005d0 | 14.374 | 4.046 | 0.009 | 0.000 | 0.875 | 0.820 | 0.898 | 0.026 | 0.000 | 0.433 | 7.220 | n/a | n/a | 0.048 | 4.930 | 0.343 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005b6 | 14.334 | 2.735 | 0.005 | 0.000 | 0.500 | 0.952 | 1.515 | 0.041 | 0.000 | 0.679 | 7.869 | n/a | n/a | 0.037 | 3.241 | 0.226 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005e0 | 13.837 | 3.187 | 0.005 | 0.000 | 0.119 | 1.848 | 0.921 | 0.024 | 0.000 | 0.198 | 7.478 | n/a | n/a | 0.057 | 3.311 | 0.239 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005b4 | 12.937 | 4.001 | 0.009 | 0.000 | 0.329 | 0.708 | 0.874 | 0.021 | 0.000 | 0.434 | 6.507 | n/a | n/a | 0.053 | 4.339 | 0.335 | 0.053 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005ff | 11.935 | 1.787 | n/a | 0.000 | 0.057 | 1.485 | 8.486 | 0.022 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.047 | 1.844 | 0.155 | 0.047 | gw-w/thread-46/gateway.admitted-work | none observed |
| ac2e7c0c04516ba300000000000005e9 | 11.372 | 4.138 | 0.009 | 0.000 | 0.849 | 0.818 | 0.905 | 0.024 | 0.000 | 0.185 | 4.384 | n/a | n/a | 0.059 | 4.997 | 0.439 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005ed | 10.141 | 3.812 | 0.006 | 0.000 | 0.299 | 0.625 | 0.899 | 0.023 | 0.000 | 0.166 | 4.249 | n/a | n/a | 0.063 | 4.117 | 0.406 | 0.063 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005f8 | 10.048 | 2.737 | 0.004 | 0.000 | 0.583 | 0.531 | 1.463 | 0.025 | 0.000 | 0.382 | 4.294 | n/a | n/a | 0.030 | 3.324 | 0.331 | 0.030 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba300000000000005c6 | 9.105 | 2.955 | 0.005 | 0.000 | 0.072 | 0.596 | 1.408 | 0.047 | 0.000 | 0.267 | 3.712 | n/a | n/a | 0.043 | 3.032 | 0.333 | 0.043 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (846 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.751 | 0.785 | 0.000 | 1.636 | 3.610 | 0.006 | 0.000 | 0.786 | 0.773 | 1.248 | 0.030 | 0.000 | 0.260 | 7.393 | n/a | n/a | 0.038 | 4.676 | 0.296 | 0.038 |
| p99 | 68.739 | 2.967 | 1.604 | 4.745 | 9.263 | 1.590 | 0.000 | 20.372 | 11.089 | 11.579 | 4.577 | 0.000 | 4.216 | 46.592 | n/a | n/a | 0.115 | 24.836 | 0.720 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba30000000000000b49 | 79.607 | 14.441 | 0.010 | 0.000 | 2.755 | 30.462 | 5.802 | 0.078 | 0.000 | 2.126 | 23.895 | n/a | n/a | 0.038 | 17.206 | 0.216 | 0.038 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.319ms; driver.publication 2.030ms; driver.publication 1.936ms; driver.publication 1.352ms; driver.publication 1.311ms |
| ac2e7c0c04516ba30000000000000777 | 77.042 | 11.704 | 0.317 | 0.000 | 1.222 | 2.492 | 12.048 | 0.042 | 20.694 | 0.090 | 28.388 | n/a | n/a | 0.045 | 13.243 | 0.172 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.644ms; driver.publication 1.447ms; driver.expected-state.bind-receipt 1.212ms; driver.publication 1.202ms |
| ac2e7c0c04516ba30000000000000776 | 75.613 | 6.631 | 0.020 | 0.000 | 2.750 | 3.543 | 1.451 | 0.031 | 0.000 | 5.469 | 55.676 | n/a | n/a | 0.043 | 9.401 | 0.124 | 0.043 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 1.644ms; driver.publication 1.436ms; driver.expected-state.bind-receipt 1.212ms; driver.publication 1.202ms |
| ac2e7c0c04516ba300000000000007d5 | 74.164 | 3.509 | 0.005 | 0.000 | 2.039 | 0.653 | 1.606 | 9.989 | 0.000 | 0.064 | 56.255 | n/a | n/a | 0.043 | 5.553 | 0.075 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.245ms; driver.expected-state.bind-receipt 1.124ms; driver.publication 1.093ms; driver.publication 1.052ms |
| ac2e7c0c04516ba30000000000000686 | 72.839 | 7.299 | 0.005 | 0.000 | 0.023 | 1.197 | 1.367 | 2.271 | 0.000 | 0.560 | 60.090 | n/a | n/a | 0.027 | 7.327 | 0.101 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.915ms; driver.publication 1.442ms; driver.publication 1.148ms |
| ac2e7c0c04516ba30000000000000696 | 72.566 | 3.640 | 0.005 | 0.000 | 44.379 | 1.510 | 7.764 | 0.067 | 0.000 | 0.274 | 14.895 | n/a | n/a | 0.031 | 48.024 | 0.662 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication 4.026ms; driver.publication 1.631ms; driver.publication 1.616ms; driver.publication 1.485ms; driver.publication 1.285ms |
| ac2e7c0c04516ba30000000000000689 | 69.200 | 4.781 | 0.260 | 0.000 | 1.037 | 0.961 | 1.111 | 3.944 | 0.000 | 1.126 | 55.938 | n/a | n/a | 0.041 | 6.078 | 0.088 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 3.754ms; driver.publication 1.915ms; client.encode 1.471ms; driver.publication 1.442ms; driver.publication 0.481ms |
| ac2e7c0c04516ba300000000000007d7 | 69.170 | 3.951 | 0.010 | 0.000 | 3.038 | 2.776 | 1.517 | 0.024 | 0.000 | 0.113 | 57.702 | n/a | n/a | 0.038 | 6.999 | 0.101 | 0.038 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.169ms; driver.expected-state.bind-receipt 1.124ms; driver.publication 1.093ms; driver.publication 1.052ms; driver.publication 1.005ms |
| ac2e7c0c04516ba300000000000007d8 | 68.739 | 3.582 | 0.007 | 0.000 | 33.394 | 2.736 | 1.006 | 0.040 | 0.000 | 3.773 | 24.160 | n/a | n/a | 0.042 | 36.983 | 0.538 | 0.042 | node-14/thread-0/driver.queue.subject | driver.publication 1.472ms; driver.publication 1.169ms; driver.publication 1.093ms; driver.publication 1.052ms; driver.expected-state.bind-receipt 0.284ms |
| ac2e7c0c04516ba3000000000000065d | 68.083 | 3.225 | 0.007 | 0.000 | 47.583 | 0.946 | 0.929 | 0.026 | 0.000 | 0.196 | 15.107 | n/a | n/a | 0.065 | 50.814 | 0.746 | 0.065 | node-14/thread-0/driver.queue.subject | driver.publication 1.329ms; driver.publication 1.295ms; driver.publication 1.284ms; driver.publication 1.149ms; driver.publication 1.037ms |
| ac2e7c0c04516ba3000000000000068a | 65.538 | 4.232 | 0.007 | 0.000 | 1.051 | 3.048 | 12.596 | 0.052 | 0.000 | 0.409 | 44.094 | n/a | n/a | 0.049 | 5.291 | 0.081 | 0.049 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 3.754ms; driver.publication 1.915ms; driver.publication 1.543ms; client.encode 1.471ms; driver.publication 1.442ms |
| ac2e7c0c04516ba30000000000000690 | 65.039 | 6.242 | 0.007 | 0.000 | 20.311 | 4.627 | 1.269 | 0.033 | 0.000 | 1.105 | 31.413 | n/a | n/a | 0.031 | 26.560 | 0.408 | 0.031 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 3.754ms; driver.publication 1.915ms; driver.publication 1.631ms; driver.publication 1.616ms; driver.publication 1.543ms |
| ac2e7c0c04516ba30000000000000685 | 63.681 | 3.878 | 0.007 | 0.000 | 2.727 | 1.162 | 5.538 | 0.017 | 0.000 | 0.792 | 49.515 | n/a | n/a | 0.046 | 6.612 | 0.104 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.442ms; driver.publication 1.148ms |
| ac2e7c0c04516ba30000000000000687 | 62.586 | 2.754 | 0.006 | 0.000 | 0.912 | 9.886 | 0.814 | 1.230 | 0.000 | 0.181 | 46.748 | n/a | n/a | 0.055 | 3.672 | 0.059 | 0.055 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 3.754ms; driver.publication 1.915ms; driver.publication 1.442ms; driver.publication 1.148ms |
| ac2e7c0c04516ba3000000000000068f | 61.962 | 5.952 | 0.095 | 0.000 | 3.654 | 2.042 | 1.303 | 2.908 | 0.000 | 0.098 | 45.868 | n/a | n/a | 0.042 | 9.701 | 0.157 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 3.754ms; driver.publication 1.915ms; driver.publication 1.631ms; driver.publication 1.616ms; driver.publication 1.543ms |
| ac2e7c0c04516ba3000000000000069f | 61.653 | 2.543 | 0.006 | 0.000 | 53.715 | 0.440 | 0.999 | 0.027 | 0.000 | 0.176 | 3.724 | n/a | n/a | 0.024 | 56.264 | 0.913 | 0.024 | node-14/thread-0/driver.queue.subject | driver.publication 4.026ms; driver.publication 1.294ms; driver.publication 1.268ms; driver.publication 1.246ms; driver.publication 1.015ms |
| ac2e7c0c04516ba3000000000000062f | 61.189 | 5.883 | 0.009 | 0.000 | 0.388 | 4.973 | 13.618 | 0.047 | 0.000 | 0.479 | 35.765 | n/a | n/a | 0.027 | 6.280 | 0.103 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.964ms; driver.publication 1.204ms; driver.expected-state.bind-receipt 1.057ms |
| ac2e7c0c04516ba30000000000000773 | 61.000 | 2.618 | 0.003 | 0.000 | 1.934 | 0.474 | 1.334 | 7.972 | 0.000 | 0.045 | 46.592 | n/a | n/a | 0.028 | 4.555 | 0.075 | 0.028 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 1.644ms; driver.publication 1.436ms; driver.expected-state.bind-receipt 1.212ms; driver.publication 1.011ms |
| ac2e7c0c04516ba3000000000000065a | 57.137 | 3.547 | 0.007 | 0.000 | 0.579 | 2.490 | 1.268 | 0.049 | 0.000 | 0.408 | 48.751 | n/a | n/a | 0.037 | 4.134 | 0.072 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000065b | 56.303 | 5.369 | 0.013 | 0.000 | 1.200 | 1.660 | 2.954 | 0.067 | 0.000 | 1.338 | 43.631 | n/a | n/a | 0.070 | 6.583 | 0.117 | 0.070 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.284ms |

## P2 / L1024 / commit / 5-10 facts (491 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.854 | 0.669 | 0.000 | 1.496 | 3.149 | 0.006 | 0.000 | 0.779 | 0.770 | 1.056 | 0.029 | 0.000 | 0.281 | 6.773 | n/a | n/a | 0.038 | 4.096 | 0.290 | 0.038 |
| p99 | 63.681 | 2.356 | 1.604 | 4.549 | 7.487 | 0.205 | 0.000 | 20.372 | 10.065 | 6.596 | 5.603 | 0.000 | 4.216 | 46.748 | n/a | n/a | 0.126 | 22.658 | 0.701 | 0.126 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba300000000000007d5 | 74.164 | 3.509 | 0.005 | 0.000 | 2.039 | 0.653 | 1.606 | 9.989 | 0.000 | 0.064 | 56.255 | n/a | n/a | 0.043 | 5.553 | 0.075 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.245ms; driver.expected-state.bind-receipt 1.124ms; driver.publication 1.093ms; driver.publication 1.052ms |
| ac2e7c0c04516ba300000000000007d7 | 69.170 | 3.951 | 0.010 | 0.000 | 3.038 | 2.776 | 1.517 | 0.024 | 0.000 | 0.113 | 57.702 | n/a | n/a | 0.038 | 6.999 | 0.101 | 0.038 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.169ms; driver.expected-state.bind-receipt 1.124ms; driver.publication 1.093ms; driver.publication 1.052ms; driver.publication 1.005ms |
| ac2e7c0c04516ba3000000000000065d | 68.083 | 3.225 | 0.007 | 0.000 | 47.583 | 0.946 | 0.929 | 0.026 | 0.000 | 0.196 | 15.107 | n/a | n/a | 0.065 | 50.814 | 0.746 | 0.065 | node-14/thread-0/driver.queue.subject | driver.publication 1.329ms; driver.publication 1.295ms; driver.publication 1.284ms; driver.publication 1.149ms; driver.publication 1.037ms |
| ac2e7c0c04516ba3000000000000068a | 65.538 | 4.232 | 0.007 | 0.000 | 1.051 | 3.048 | 12.596 | 0.052 | 0.000 | 0.409 | 44.094 | n/a | n/a | 0.049 | 5.291 | 0.081 | 0.049 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 3.754ms; driver.publication 1.915ms; driver.publication 1.543ms; client.encode 1.471ms; driver.publication 1.442ms |
| ac2e7c0c04516ba30000000000000685 | 63.681 | 3.878 | 0.007 | 0.000 | 2.727 | 1.162 | 5.538 | 0.017 | 0.000 | 0.792 | 49.515 | n/a | n/a | 0.046 | 6.612 | 0.104 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.442ms; driver.publication 1.148ms |
| ac2e7c0c04516ba30000000000000687 | 62.586 | 2.754 | 0.006 | 0.000 | 0.912 | 9.886 | 0.814 | 1.230 | 0.000 | 0.181 | 46.748 | n/a | n/a | 0.055 | 3.672 | 0.059 | 0.055 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 3.754ms; driver.publication 1.915ms; driver.publication 1.442ms; driver.publication 1.148ms |
| ac2e7c0c04516ba3000000000000069f | 61.653 | 2.543 | 0.006 | 0.000 | 53.715 | 0.440 | 0.999 | 0.027 | 0.000 | 0.176 | 3.724 | n/a | n/a | 0.024 | 56.264 | 0.913 | 0.024 | node-14/thread-0/driver.queue.subject | driver.publication 4.026ms; driver.publication 1.294ms; driver.publication 1.268ms; driver.publication 1.246ms; driver.publication 1.015ms |
| ac2e7c0c04516ba30000000000000773 | 61.000 | 2.618 | 0.003 | 0.000 | 1.934 | 0.474 | 1.334 | 7.972 | 0.000 | 0.045 | 46.592 | n/a | n/a | 0.028 | 4.555 | 0.075 | 0.028 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 1.644ms; driver.publication 1.436ms; driver.expected-state.bind-receipt 1.212ms; driver.publication 1.011ms |
| ac2e7c0c04516ba3000000000000065a | 57.137 | 3.547 | 0.007 | 0.000 | 0.579 | 2.490 | 1.268 | 0.049 | 0.000 | 0.408 | 48.751 | n/a | n/a | 0.037 | 4.134 | 0.072 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac2e7c0c04516ba3000000000000065b | 56.303 | 5.369 | 0.013 | 0.000 | 1.200 | 1.660 | 2.954 | 0.067 | 0.000 | 1.338 | 43.631 | n/a | n/a | 0.070 | 6.583 | 0.117 | 0.070 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.284ms |
| ac2e7c0c04516ba30000000000000699 | 56.104 | 3.881 | 0.106 | 0.000 | 0.826 | 3.689 | 1.072 | 0.033 | 0.000 | 0.516 | 45.958 | n/a | n/a | 0.023 | 4.813 | 0.086 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 4.026ms; driver.publication 1.631ms; driver.publication 1.485ms; driver.publication 1.285ms; driver.publication 1.246ms |
| ac2e7c0c04516ba3000000000000068c | 53.442 | 4.140 | 0.007 | 0.000 | 1.103 | 1.576 | 1.895 | 0.081 | 0.000 | 2.981 | 41.596 | n/a | n/a | 0.064 | 5.250 | 0.098 | 0.064 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 3.754ms; driver.publication 1.915ms; driver.publication 1.616ms; driver.publication 1.543ms; client.encode 1.471ms |
| ac2e7c0c04516ba30000000000000740 | 52.742 | 2.281 | 0.005 | 0.000 | 20.372 | 1.323 | 8.231 | 5.603 | 0.000 | 0.391 | 14.513 | n/a | n/a | 0.024 | 22.658 | 0.430 | 0.024 | node-14/thread-0/driver.queue.subject | driver.publication 4.232ms; driver.publication 1.225ms; driver.publication 1.158ms; driver.publication 1.034ms |
| ac2e7c0c04516ba30000000000000b44 | 51.667 | 4.050 | 0.010 | 0.000 | 28.320 | 2.919 | 0.812 | 0.025 | 0.000 | 2.874 | 12.629 | n/a | n/a | 0.030 | 32.380 | 0.627 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 2.030ms; driver.publication 1.936ms; driver.publication 1.430ms; driver.publication 1.352ms; driver.publication 1.311ms |
| ac2e7c0c04516ba3000000000000068e | 51.061 | 3.952 | 0.007 | 0.000 | 3.519 | 1.205 | 5.385 | 0.037 | 0.000 | 0.929 | 36.002 | n/a | n/a | 0.025 | 7.477 | 0.146 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 3.754ms; driver.publication 1.915ms; driver.publication 1.616ms; driver.publication 1.543ms; client.encode 1.471ms |
| ac2e7c0c04516ba30000000000000698 | 51.034 | 3.470 | 0.009 | 0.000 | 0.694 | 1.112 | 0.845 | 0.024 | 0.000 | 1.836 | 43.001 | n/a | n/a | 0.042 | 4.173 | 0.082 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 4.026ms; driver.publication 1.631ms; driver.publication 1.485ms; driver.publication 1.285ms; driver.expected-state.bind-receipt 1.235ms |
| ac2e7c0c04516ba3000000000000099c | 50.522 | 3.726 | 0.005 | 0.000 | 5.021 | 0.744 | 1.331 | 0.039 | 0.000 | 0.380 | 39.221 | n/a | n/a | 0.055 | 8.752 | 0.173 | 0.055 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.740ms; driver.publication 1.223ms |
| ac2e7c0c04516ba3000000000000071c | 47.367 | 10.550 | 0.014 | 0.000 | 0.619 | 5.516 | 14.175 | 0.158 | 0.000 | 1.590 | 14.694 | n/a | n/a | 0.050 | 11.184 | 0.236 | 0.050 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.publication 1.163ms |
| ac2e7c0c04516ba30000000000000695 | 47.014 | 2.552 | 0.006 | 0.000 | 5.283 | 3.982 | 3.112 | 0.028 | 0.000 | 2.820 | 29.206 | n/a | n/a | 0.025 | 7.841 | 0.167 | 0.025 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.publication 4.026ms; driver.publication 1.631ms; driver.publication 1.616ms; driver.publication 1.543ms; driver.publication 1.485ms |
| ac2e7c0c04516ba3000000000000064e | 46.454 | 2.407 | 0.005 | 0.000 | 0.885 | 0.578 | 0.780 | 0.024 | 0.000 | 0.179 | 41.566 | n/a | n/a | 0.031 | 3.296 | 0.071 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (2622 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.339 | 0.710 | 0.000 | 1.580 | 3.492 | 0.005 | 0.000 | 0.742 | 0.655 | 1.098 | 0.027 | 0.000 | 0.188 | 6.069 | n/a | n/a | 0.032 | 4.521 | 0.341 | 0.032 |
| p99 | 72.269 | 2.871 | 2.224 | 5.304 | 9.884 | 1.328 | 0.000 | 29.727 | 14.141 | 7.312 | 2.894 | 0.000 | 3.361 | 28.468 | n/a | n/a | 0.094 | 35.750 | 0.738 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba3000000000000186a | 173.700 | 4.673 | 0.007 | 0.000 | 0.114 | 136.077 | 0.986 | 0.024 | 0.000 | 0.113 | 31.631 | n/a | n/a | 0.074 | 4.794 | 0.028 | 0.074 | node-14/thread-0/socket.wait-first-byte | client.parse 6.601ms |
| ac2e7c0c04516ba3000000000000186e | 164.084 | 2.181 | 0.004 | 0.000 | 122.815 | 2.286 | 0.604 | 0.018 | 0.000 | 1.953 | 34.199 | n/a | n/a | 0.022 | 125.000 | 0.762 | 0.022 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 2.159ms; driver.publication 1.672ms; driver.publication 1.203ms; driver.publication 1.107ms; driver.publication 1.079ms |
| ac2e7c0c04516ba3000000000000186c | 162.273 | 3.970 | 1.328 | 0.000 | 114.449 | 1.295 | 0.670 | 1.249 | 0.000 | 0.057 | 39.222 | n/a | n/a | 0.033 | 119.747 | 0.738 | 0.033 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 2.159ms; driver.publication 1.672ms; driver.publication 1.203ms; driver.publication 1.107ms; driver.publication 1.079ms |
| ac2e7c0c04516ba3000000000000186b | 158.461 | 3.028 | 0.005 | 0.000 | 0.429 | 145.961 | 1.437 | 0.040 | 0.000 | 0.167 | 7.341 | n/a | n/a | 0.053 | 3.462 | 0.022 | 0.053 | node-14/thread-0/socket.wait-first-byte | client.parse 6.601ms; driver.publication 1.672ms |
| ac2e7c0c04516ba30000000000001f72 | 147.523 | 3.420 | 0.006 | 0.000 | 67.768 | 64.514 | 3.949 | 0.061 | 0.000 | 1.727 | 6.052 | n/a | n/a | 0.027 | 71.194 | 0.483 | 0.027 | node-14/thread-0/driver.queue.scheduler-late | client.parse 4.216ms; driver.publication 2.580ms |
| ac2e7c0c04516ba30000000000001870 | 125.106 | 4.429 | 1.723 | 0.000 | 92.570 | 10.023 | 1.277 | 5.096 | 0.000 | 0.033 | 9.943 | n/a | n/a | 0.013 | 98.722 | 0.789 | 0.013 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 2.159ms; driver.publication 1.672ms; driver.publication 1.107ms; driver.publication 1.015ms |
| ac2e7c0c04516ba3000000000000186d | 124.872 | 4.476 | 0.007 | 0.000 | 100.716 | 2.394 | 1.513 | 1.864 | 0.000 | 1.478 | 12.393 | n/a | n/a | 0.033 | 105.198 | 0.842 | 0.033 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.672ms; driver.publication 1.015ms |
| ac2e7c0c04516ba3000000000000186f | 123.369 | 4.812 | 1.568 | 1.895 | 93.235 | 7.848 | 0.379 | 3.973 | 0.000 | 0.163 | 9.475 | n/a | n/a | 0.020 | 101.510 | 0.823 | 0.020 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.672ms; driver.publication 1.015ms |
| ac2e7c0c04516ba30000000000001872 | 121.037 | 7.608 | 1.504 | 0.000 | 72.726 | 2.658 | 3.457 | 0.958 | 0.000 | 0.028 | 32.056 | n/a | n/a | 0.042 | 81.838 | 0.676 | 0.042 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 2.159ms; driver.publication 1.672ms; driver.publication 1.107ms; driver.publication 1.044ms; driver.publication 1.015ms |
| ac2e7c0c04516ba30000000000000cc0 | 111.818 | 5.346 | 0.008 | 0.000 | 60.026 | 35.501 | 2.173 | 0.012 | 0.000 | 0.422 | 8.299 | n/a | n/a | 0.031 | 65.381 | 0.585 | 0.031 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 6.969ms; driver.publication 1.469ms; client.parse 1.176ms; driver.expected-state.bind-receipt 1.115ms |
| ac2e7c0c04516ba30000000000001871 | 111.171 | 4.473 | 1.729 | 0.000 | 76.505 | 6.494 | 0.622 | 4.576 | 0.000 | 0.029 | 16.725 | n/a | n/a | 0.018 | 82.708 | 0.744 | 0.018 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 2.159ms; driver.publication 1.672ms; driver.publication 1.107ms; driver.publication 1.044ms; driver.publication 1.015ms |
| ac2e7c0c04516ba30000000000000cc1 | 110.598 | 3.555 | 0.744 | 0.000 | 57.343 | 36.420 | 0.667 | 1.750 | 0.000 | 0.207 | 9.894 | n/a | n/a | 0.018 | 61.642 | 0.557 | 0.018 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 6.969ms; driver.publication 2.927ms; driver.publication 1.469ms; driver.expected-state.bind-receipt 1.115ms; client.parse 0.059ms |
| ac2e7c0c04516ba30000000000001f74 | 109.103 | 4.403 | 1.081 | 0.000 | 25.024 | 64.338 | 1.287 | 2.548 | 0.000 | 0.107 | 10.302 | n/a | n/a | 0.013 | 30.508 | 0.280 | 0.013 | node-14/thread-0/socket.wait-first-byte | client.parse 4.216ms; driver.publication 2.580ms; driver.publication 2.530ms; driver.publication 1.865ms |
| ac2e7c0c04516ba30000000000001f73 | 107.905 | 5.346 | 0.635 | 0.000 | 25.205 | 63.567 | 1.141 | 3.948 | 0.000 | 0.237 | 7.807 | n/a | n/a | 0.019 | 31.186 | 0.289 | 0.019 | node-14/thread-0/socket.wait-first-byte | client.parse 4.216ms; driver.publication 2.580ms; driver.publication 1.865ms |
| ac2e7c0c04516ba30000000000000cba | 107.643 | 11.249 | 0.009 | 0.000 | 29.727 | 56.033 | 1.823 | 0.094 | 0.000 | 1.004 | 7.664 | n/a | n/a | 0.042 | 40.984 | 0.381 | 0.042 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.428ms; driver.publication 1.253ms; client.parse 1.176ms; driver.publication 1.096ms |
| ac2e7c0c04516ba30000000000001873 | 98.825 | 6.040 | 2.445 | 0.000 | 48.386 | 2.113 | 0.510 | 5.501 | 0.000 | 0.023 | 33.779 | n/a | n/a | 0.028 | 56.871 | 0.575 | 0.028 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 2.159ms; driver.publication 1.672ms; driver.publication 1.203ms; driver.publication 1.107ms; driver.publication 1.044ms |
| ac2e7c0c04516ba30000000000001f70 | 97.756 | 5.796 | 0.008 | 0.000 | 0.304 | 79.068 | 0.841 | 0.025 | 0.000 | 0.102 | 11.575 | n/a | n/a | 0.037 | 6.109 | 0.062 | 0.037 | node-14/thread-0/socket.wait-first-byte | client.parse 3.841ms |
| ac2e7c0c04516ba30000000000000cc2 | 94.674 | 3.387 | 0.844 | 0.000 | 40.051 | 38.140 | 0.336 | 1.587 | 0.000 | 0.390 | 9.922 | n/a | n/a | 0.017 | 44.282 | 0.468 | 0.017 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 6.969ms; driver.publication 2.927ms; driver.publication 1.469ms; driver.expected-state.bind-receipt 1.115ms; driver.publication 1.088ms |
| ac2e7c0c04516ba30000000000001874 | 86.571 | 5.462 | 2.749 | 0.000 | 23.217 | 12.100 | 0.865 | 0.026 | 0.000 | 1.277 | 40.860 | n/a | n/a | 0.014 | 31.428 | 0.363 | 0.014 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.159ms; driver.publication 1.672ms; driver.publication 1.203ms; driver.publication 1.107ms; driver.publication 1.079ms |
| ac2e7c0c04516ba30000000000001055 | 83.598 | 4.324 | 0.005 | 0.000 | 0.286 | 48.120 | 2.954 | 0.081 | 0.000 | 0.152 | 27.636 | n/a | n/a | 0.041 | 4.615 | 0.055 | 0.041 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.169ms; client.parse 1.154ms; driver.publication 1.130ms |

## P2 / tail / commit / 5-10 facts (1557 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.998 | 0.605 | 0.000 | 1.446 | 3.101 | 0.005 | 0.000 | 0.777 | 0.640 | 0.914 | 0.026 | 0.000 | 0.188 | 5.637 | n/a | n/a | 0.032 | 4.004 | 0.334 | 0.032 |
| p99 | 67.885 | 2.147 | 2.143 | 4.931 | 8.568 | 0.556 | 0.000 | 35.456 | 14.910 | 4.791 | 3.948 | 0.000 | 3.361 | 30.206 | n/a | n/a | 0.099 | 37.949 | 0.766 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac2e7c0c04516ba3000000000000186a | 173.700 | 4.673 | 0.007 | 0.000 | 0.114 | 136.077 | 0.986 | 0.024 | 0.000 | 0.113 | 31.631 | n/a | n/a | 0.074 | 4.794 | 0.028 | 0.074 | node-14/thread-0/socket.wait-first-byte | client.parse 6.601ms |
| ac2e7c0c04516ba3000000000000186e | 164.084 | 2.181 | 0.004 | 0.000 | 122.815 | 2.286 | 0.604 | 0.018 | 0.000 | 1.953 | 34.199 | n/a | n/a | 0.022 | 125.000 | 0.762 | 0.022 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 2.159ms; driver.publication 1.672ms; driver.publication 1.203ms; driver.publication 1.107ms; driver.publication 1.079ms |
| ac2e7c0c04516ba3000000000000186b | 158.461 | 3.028 | 0.005 | 0.000 | 0.429 | 145.961 | 1.437 | 0.040 | 0.000 | 0.167 | 7.341 | n/a | n/a | 0.053 | 3.462 | 0.022 | 0.053 | node-14/thread-0/socket.wait-first-byte | client.parse 6.601ms; driver.publication 1.672ms |
| ac2e7c0c04516ba30000000000001f72 | 147.523 | 3.420 | 0.006 | 0.000 | 67.768 | 64.514 | 3.949 | 0.061 | 0.000 | 1.727 | 6.052 | n/a | n/a | 0.027 | 71.194 | 0.483 | 0.027 | node-14/thread-0/driver.queue.scheduler-late | client.parse 4.216ms; driver.publication 2.580ms |
| ac2e7c0c04516ba30000000000001870 | 125.106 | 4.429 | 1.723 | 0.000 | 92.570 | 10.023 | 1.277 | 5.096 | 0.000 | 0.033 | 9.943 | n/a | n/a | 0.013 | 98.722 | 0.789 | 0.013 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 2.159ms; driver.publication 1.672ms; driver.publication 1.107ms; driver.publication 1.015ms |
| ac2e7c0c04516ba3000000000000186f | 123.369 | 4.812 | 1.568 | 1.895 | 93.235 | 7.848 | 0.379 | 3.973 | 0.000 | 0.163 | 9.475 | n/a | n/a | 0.020 | 101.510 | 0.823 | 0.020 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.672ms; driver.publication 1.015ms |
| ac2e7c0c04516ba30000000000001871 | 111.171 | 4.473 | 1.729 | 0.000 | 76.505 | 6.494 | 0.622 | 4.576 | 0.000 | 0.029 | 16.725 | n/a | n/a | 0.018 | 82.708 | 0.744 | 0.018 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 2.159ms; driver.publication 1.672ms; driver.publication 1.107ms; driver.publication 1.044ms; driver.publication 1.015ms |
| ac2e7c0c04516ba30000000000000cc1 | 110.598 | 3.555 | 0.744 | 0.000 | 57.343 | 36.420 | 0.667 | 1.750 | 0.000 | 0.207 | 9.894 | n/a | n/a | 0.018 | 61.642 | 0.557 | 0.018 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 6.969ms; driver.publication 2.927ms; driver.publication 1.469ms; driver.expected-state.bind-receipt 1.115ms; client.parse 0.059ms |
| ac2e7c0c04516ba30000000000001f73 | 107.905 | 5.346 | 0.635 | 0.000 | 25.205 | 63.567 | 1.141 | 3.948 | 0.000 | 0.237 | 7.807 | n/a | n/a | 0.019 | 31.186 | 0.289 | 0.019 | node-14/thread-0/socket.wait-first-byte | client.parse 4.216ms; driver.publication 2.580ms; driver.publication 1.865ms |
| ac2e7c0c04516ba30000000000001873 | 98.825 | 6.040 | 2.445 | 0.000 | 48.386 | 2.113 | 0.510 | 5.501 | 0.000 | 0.023 | 33.779 | n/a | n/a | 0.028 | 56.871 | 0.575 | 0.028 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 2.159ms; driver.publication 1.672ms; driver.publication 1.203ms; driver.publication 1.107ms; driver.publication 1.044ms |
| ac2e7c0c04516ba30000000000001f70 | 97.756 | 5.796 | 0.008 | 0.000 | 0.304 | 79.068 | 0.841 | 0.025 | 0.000 | 0.102 | 11.575 | n/a | n/a | 0.037 | 6.109 | 0.062 | 0.037 | node-14/thread-0/socket.wait-first-byte | client.parse 3.841ms |
| ac2e7c0c04516ba30000000000000cc2 | 94.674 | 3.387 | 0.844 | 0.000 | 40.051 | 38.140 | 0.336 | 1.587 | 0.000 | 0.390 | 9.922 | n/a | n/a | 0.017 | 44.282 | 0.468 | 0.017 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 6.969ms; driver.publication 2.927ms; driver.publication 1.469ms; driver.expected-state.bind-receipt 1.115ms; driver.publication 1.088ms |
| ac2e7c0c04516ba30000000000001b2b | 75.052 | 2.486 | 0.004 | 0.000 | 64.973 | 0.492 | 2.330 | 0.014 | 0.000 | 0.140 | 4.579 | n/a | n/a | 0.034 | 67.464 | 0.899 | 0.034 | node-14/thread-0/driver.queue.subject | driver.publication 1.044ms |
| ac2e7c0c04516ba30000000000001b29 | 69.138 | 2.072 | 0.003 | 0.000 | 54.866 | 5.924 | 0.634 | 0.038 | 0.000 | 1.543 | 4.041 | n/a | n/a | 0.018 | 56.941 | 0.824 | 0.018 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.044ms; client.parse 0.419ms |
| ac2e7c0c04516ba30000000000001969 | 68.111 | 9.054 | 0.011 | 0.000 | 0.083 | 20.024 | 12.611 | 0.564 | 0.000 | 3.331 | 22.413 | n/a | n/a | 0.020 | 9.148 | 0.134 | 0.020 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.742ms; driver.publication 1.779ms; driver.publication 1.718ms; driver.publication 1.640ms; driver.publication 1.514ms |
| ac2e7c0c04516ba30000000000001877 | 67.885 | 2.317 | 3.896 | 0.000 | 29.537 | 2.529 | 6.479 | 1.993 | 0.000 | 0.113 | 21.002 | n/a | n/a | 0.020 | 35.750 | 0.527 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.159ms; driver.publication 1.672ms; driver.publication 1.203ms; driver.publication 1.182ms; driver.publication 1.107ms |
| ac2e7c0c04516ba30000000000001059 | 67.624 | 2.839 | 0.006 | 0.000 | 0.330 | 45.165 | 0.652 | 0.021 | 0.000 | 1.198 | 17.382 | n/a | n/a | 0.031 | 3.175 | 0.047 | 0.031 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.169ms; client.parse 1.154ms |
| ac2e7c0c04516ba30000000000001060 | 65.489 | 3.457 | 0.007 | 0.000 | 37.425 | 5.398 | 0.579 | 0.026 | 0.000 | 0.553 | 18.004 | n/a | n/a | 0.040 | 40.889 | 0.624 | 0.040 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.195ms; driver.publication 1.182ms; driver.publication 1.141ms; driver.publication 1.130ms |
| ac2e7c0c04516ba3000000000000105b | 62.374 | 2.849 | 0.003 | 0.000 | 52.375 | 1.776 | 1.140 | 0.040 | 0.000 | 0.196 | 3.961 | n/a | n/a | 0.035 | 55.227 | 0.885 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication 1.169ms; client.parse 1.154ms; driver.publication 1.130ms |
| ac2e7c0c04516ba30000000000002007 | 61.084 | 6.509 | 0.009 | 0.000 | 19.196 | 0.615 | 0.676 | 0.023 | 0.000 | 0.810 | 33.202 | n/a | n/a | 0.044 | 25.713 | 0.421 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.607ms; driver.publication 1.327ms; driver.publication 1.092ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.007 | n/a | n/a | n/a | 0.063 | n/a | 0.000 | 0.000 | 0.826 | 200.496 | 0.007 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.148 | 0.063 | 0.000 | 0.148 |
| p99 | 202.332 | n/a | n/a | n/a | 18.800 | n/a | 1.595 | 0.000 | 3.634 | 201.066 | 0.110 | 20.036 | 0.107 | 0.000 | n/a | n/a | 0.267 | 18.800 | 0.309 | 0.267 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ed710ae2c499e5f0000000000000005 | 202.332 | 0.063 | n/a | 0.000 | 0.000 | 0.864 | 201.066 | 0.012 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.219 | 0.063 | 0.000 | 0.219 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000006 | 202.239 | 0.136 | n/a | 0.000 | 0.000 | 0.924 | 200.951 | 0.012 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.109 | 0.136 | 0.001 | 0.109 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000007 | 201.977 | 0.041 | n/a | 0.000 | 0.000 | 0.776 | 200.897 | 0.010 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.148 | 0.041 | 0.000 | 0.148 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000f44 | 201.457 | 0.034 | n/a | 0.000 | 0.000 | 0.551 | 200.739 | 0.007 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.079 | 0.034 | 0.000 | 0.079 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000f43 | 201.249 | 0.044 | n/a | 0.000 | 0.000 | 0.564 | 200.496 | 0.004 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.078 | 0.044 | 0.000 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000f45 | 201.007 | 0.026 | n/a | 0.000 | 0.000 | 0.371 | 200.500 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.065 | 0.026 | 0.000 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d00000000000000002 | 140.783 | 1.312 | n/a | 0.000 | 0.000 | 0.826 | 118.143 | 0.110 | 20.036 | 0.090 | 0.000 | n/a | n/a | 0.267 | 1.312 | 0.009 | 0.267 | gw-r/thread-49/gateway.admitted-work | none observed |
| 3ed710ae2c499e5f0000000000000f48 | 69.275 | 18.800 | n/a | 0.000 | 0.000 | 3.634 | 46.645 | 0.003 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.190 | 18.800 | 0.271 | 0.190 | gw-r/thread-53/gateway.admitted-work | none observed |
| 3ed710ae2c499e5f0000000000000f4a | 61.845 | 15.207 | n/a | 1.595 | 0.000 | 2.581 | 42.222 | 0.018 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.218 | 16.802 | 0.272 | 0.218 | gw-r/thread-53/gateway.admitted-work | none observed |
| 3ed710ae2c499e5f0000000000000f49 | 53.619 | 16.585 | n/a | 0.000 | 0.000 | 3.154 | 33.684 | 0.004 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.185 | 16.585 | 0.309 | 0.185 | gw-r/thread-53/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 797.345 | n/a | n/a | n/a | 0.177 | n/a | 0.000 | 0.000 | 1.343 | 785.423 | 0.011 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.328 | 0.177 | 0.000 | 0.328 |
| p99 | 1004.220 | n/a | n/a | n/a | 9.980 | n/a | 0.000 | 0.000 | 1.505 | 1000.869 | 0.015 | 0.000 | 0.596 | 0.000 | n/a | n/a | 1.219 | 9.980 | 0.013 | 1.219 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f9d96733764a8d000000000000000a4 | 1004.220 | 0.177 | n/a | 0.000 | 0.000 | 1.343 | 1000.869 | 0.015 | 0.000 | 0.596 | 0.000 | n/a | n/a | 1.219 | 0.177 | 0.000 | 1.219 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d000000000000000a5 | 797.345 | 9.980 | n/a | 0.000 | 0.000 | 1.505 | 785.423 | 0.011 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.328 | 9.980 | 0.013 | 0.328 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 435.950 | n/a | n/a | n/a | 2.797 | n/a | 0.000 | 0.000 | 0.789 | 432.137 | 0.013 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.096 | 2.797 | 0.007 | 0.096 |
| p99 | 1009.542 | n/a | n/a | n/a | 10.878 | n/a | 0.000 | 0.000 | 5.288 | 1005.702 | 3.382 | 0.000 | 0.671 | 0.000 | n/a | n/a | 1.170 | 10.878 | 0.421 | 1.170 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f9d96733764a8d000000000000000d0 | 1009.542 | 2.709 | n/a | 0.000 | 0.000 | 0.819 | 1005.702 | 0.144 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.081 | 2.709 | 0.003 | 0.081 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d000000000000000bc | 1006.303 | 5.941 | n/a | 0.000 | 0.000 | 3.264 | 996.702 | 0.012 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.288 | 5.941 | 0.006 | 0.288 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d000000000000000b5 | 1005.624 | 5.608 | n/a | 0.000 | 0.000 | 0.962 | 998.735 | 0.014 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.198 | 5.608 | 0.006 | 0.198 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d000000000000000ae | 1003.050 | 0.228 | n/a | 0.000 | 0.000 | 0.506 | 1001.001 | 0.018 | 0.000 | 0.127 | 0.000 | n/a | n/a | 1.170 | 0.228 | 0.000 | 1.170 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d000000000000000bb | 975.855 | 3.174 | n/a | 0.000 | 0.000 | 5.288 | 967.183 | 0.013 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.121 | 3.174 | 0.003 | 0.121 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d000000000000000ab | 863.364 | 2.688 | n/a | 0.000 | 0.000 | 0.752 | 859.703 | 0.012 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.107 | 2.688 | 0.003 | 0.107 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d000000000000000a8 | 810.274 | 3.938 | n/a | 0.000 | 0.000 | 0.662 | 805.269 | 0.162 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.122 | 3.938 | 0.005 | 0.122 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d000000000000000c2 | 807.852 | 10.878 | n/a | 0.000 | 0.000 | 0.789 | 795.976 | 0.012 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.129 | 10.878 | 0.013 | 0.129 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d000000000000000cb | 659.481 | 2.119 | n/a | 0.000 | 0.000 | 1.029 | 656.188 | 0.010 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.069 | 2.119 | 0.003 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d000000000000000b4 | 656.263 | 2.907 | n/a | 0.000 | 0.000 | 1.248 | 651.950 | 0.011 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.082 | 2.907 | 0.004 | 0.082 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d000000000000000c9 | 595.670 | 2.369 | n/a | 0.000 | 0.000 | 0.993 | 592.115 | 0.009 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.087 | 2.369 | 0.004 | 0.087 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d000000000000000c0 | 564.886 | 2.481 | n/a | 0.000 | 0.000 | 0.700 | 560.942 | 0.019 | 0.000 | 0.671 | 0.000 | n/a | n/a | 0.073 | 2.481 | 0.004 | 0.073 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d000000000000000c6 | 554.850 | 2.679 | n/a | 0.000 | 0.000 | 0.688 | 551.308 | 0.013 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.072 | 2.679 | 0.005 | 0.072 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d000000000000000b7 | 449.698 | 3.485 | n/a | 0.000 | 0.000 | 0.824 | 445.209 | 0.011 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.094 | 3.485 | 0.008 | 0.094 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d000000000000000c5 | 435.950 | 2.451 | n/a | 0.000 | 0.000 | 1.196 | 432.137 | 0.010 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.081 | 2.451 | 0.006 | 0.081 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d000000000000000c8 | 406.858 | 3.137 | n/a | 0.000 | 0.000 | 0.864 | 402.395 | 0.285 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.096 | 3.137 | 0.008 | 0.096 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d000000000000000a7 | 401.573 | 2.422 | n/a | 0.000 | 0.000 | 0.708 | 398.238 | 0.011 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.108 | 2.422 | 0.006 | 0.108 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d000000000000000b9 | 340.937 | 2.394 | n/a | 0.000 | 0.000 | 0.641 | 337.652 | 0.035 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.084 | 2.394 | 0.007 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d000000000000000b2 | 312.731 | 5.492 | n/a | 0.000 | 0.000 | 0.552 | 306.490 | 0.011 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.124 | 5.492 | 0.018 | 0.124 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d000000000000000cc | 276.976 | 2.027 | n/a | 0.000 | 0.000 | 0.538 | 274.255 | 0.012 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.073 | 2.027 | 0.007 | 0.073 | gw-r/thread-53/journal/page | none observed |

## P3 / L1 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 426.447 | n/a | n/a | n/a | 3.645 | n/a | 0.553 | 0.000 | 0.726 | 417.952 | 0.010 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.094 | 4.183 | 0.015 | 0.094 |
| p99 | 1006.495 | n/a | n/a | n/a | 15.498 | n/a | 1.538 | 0.000 | 2.048 | 999.615 | 0.392 | 11.730 | 0.137 | 0.000 | n/a | n/a | 0.643 | 16.375 | 0.634 | 0.643 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f9d96733764a8d000000000000000fd | 1006.495 | 5.862 | n/a | 0.000 | 0.000 | 0.764 | 999.615 | 0.014 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.102 | 5.862 | 0.006 | 0.102 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d000000000000000d1 | 1005.969 | 15.498 | n/a | 0.877 | 0.000 | 1.002 | 988.275 | 0.022 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.190 | 16.375 | 0.016 | 0.190 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d000000000000000de | 1002.943 | 2.995 | n/a | 0.578 | 0.000 | 0.503 | 998.628 | 0.017 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.119 | 3.573 | 0.004 | 0.119 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d000000000000000d2 | 1001.331 | 4.026 | n/a | 0.606 | 0.000 | 0.758 | 995.681 | 0.017 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.132 | 4.632 | 0.005 | 0.132 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d00000000000000104 | 997.570 | 2.769 | n/a | 0.000 | 0.000 | 0.693 | 993.567 | 0.392 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.074 | 2.769 | 0.003 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d000000000000000d8 | 997.446 | 3.491 | n/a | 0.601 | 0.000 | 0.739 | 992.447 | 0.008 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.089 | 4.092 | 0.004 | 0.089 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d0000000000000010c | 986.783 | 3.053 | n/a | 0.000 | 0.000 | 0.504 | 983.094 | 0.009 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.068 | 3.053 | 0.003 | 0.068 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d00000000000000100 | 984.057 | 2.676 | n/a | 0.549 | 0.000 | 0.539 | 980.074 | 0.058 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.093 | 3.224 | 0.003 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d000000000000000dd | 982.866 | 2.981 | n/a | 0.488 | 0.000 | 0.732 | 978.482 | 0.010 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.098 | 3.469 | 0.004 | 0.098 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d000000000000000d9 | 980.320 | 5.213 | n/a | 0.582 | 0.000 | 0.689 | 973.483 | 0.010 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.211 | 5.794 | 0.006 | 0.211 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d000000000000000df | 836.037 | 6.204 | n/a | 0.629 | 0.000 | 0.615 | 816.680 | 0.015 | 11.730 | 0.075 | 0.000 | n/a | n/a | 0.088 | 6.833 | 0.008 | 0.088 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d000000000000000e3 | 802.840 | 4.041 | n/a | 0.587 | 0.000 | 0.476 | 797.437 | 0.141 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.080 | 4.627 | 0.006 | 0.080 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d00000000000000101 | 794.387 | 2.487 | n/a | 0.000 | 0.000 | 2.026 | 789.717 | 0.009 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.056 | 2.487 | 0.003 | 0.056 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d000000000000000ea | 662.526 | 2.778 | n/a | 0.000 | 0.000 | 0.644 | 658.944 | 0.010 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.087 | 2.778 | 0.004 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d000000000000000fa | 603.587 | 6.841 | n/a | 0.669 | 0.000 | 0.759 | 595.052 | 0.069 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.124 | 7.510 | 0.012 | 0.124 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d000000000000000da | 566.787 | 9.910 | n/a | 1.343 | 0.000 | 1.119 | 554.237 | 0.009 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.102 | 11.252 | 0.020 | 0.102 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d000000000000000e6 | 560.746 | 8.368 | n/a | 1.233 | 0.000 | 0.665 | 550.283 | 0.009 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.129 | 9.601 | 0.017 | 0.129 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d000000000000000dc | 453.557 | 2.889 | n/a | 0.566 | 0.000 | 1.071 | 448.684 | 0.155 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.104 | 3.455 | 0.008 | 0.104 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d00000000000000107 | 453.370 | 12.917 | n/a | 1.538 | 0.000 | 1.169 | 437.377 | 0.010 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.291 | 14.454 | 0.032 | 0.291 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d000000000000000d4 | 443.285 | 5.901 | n/a | 0.594 | 0.000 | 1.260 | 435.279 | 0.011 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.173 | 6.495 | 0.015 | 0.173 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 368.487 | n/a | n/a | n/a | 3.247 | n/a | 0.000 | 0.000 | 0.608 | 365.024 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.079 | 3.433 | 0.010 | 0.079 |
| p99 | 1004.476 | n/a | n/a | n/a | 12.549 | n/a | 1.015 | 0.000 | 2.538 | 1001.382 | 0.442 | 0.000 | 0.629 | 0.000 | n/a | n/a | 1.111 | 13.195 | 0.640 | 1.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f9d96733764a8d00000000000000125 | 1004.476 | 2.692 | n/a | 0.000 | 0.000 | 0.640 | 1000.914 | 0.126 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.061 | 2.692 | 0.003 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d0000000000000012a | 1003.277 | 0.124 | n/a | 0.000 | 0.000 | 0.536 | 1001.382 | 0.041 | 0.000 | 0.084 | 0.000 | n/a | n/a | 1.111 | 0.124 | 0.000 | 1.111 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d00000000000000129 | 1002.934 | 2.763 | n/a | 0.000 | 0.000 | 0.504 | 999.454 | 0.021 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.156 | 2.763 | 0.003 | 0.156 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d00000000000000137 | 1002.683 | 0.106 | n/a | 0.000 | 0.000 | 0.382 | 1001.005 | 0.012 | 0.000 | 0.075 | 0.000 | n/a | n/a | 1.103 | 0.106 | 0.000 | 1.103 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d00000000000000113 | 1002.321 | 0.115 | n/a | 0.000 | 0.000 | 0.461 | 1000.592 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 1.100 | 0.115 | 0.000 | 1.100 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d0000000000000011c | 986.204 | 4.305 | n/a | 0.000 | 0.000 | 0.649 | 980.988 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.226 | 4.305 | 0.004 | 0.226 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d00000000000000141 | 954.433 | 4.126 | n/a | 0.000 | 0.000 | 0.443 | 949.764 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.065 | 4.126 | 0.004 | 0.065 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d00000000000000110 | 845.003 | 3.433 | n/a | 0.000 | 0.000 | 0.953 | 840.477 | 0.006 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.067 | 3.433 | 0.004 | 0.067 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d00000000000000126 | 758.892 | 4.887 | n/a | 0.798 | 0.000 | 0.438 | 752.188 | 0.415 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.098 | 5.685 | 0.007 | 0.098 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d0000000000000011d | 752.754 | 4.365 | n/a | 0.000 | 0.000 | 0.957 | 747.100 | 0.155 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.139 | 4.365 | 0.006 | 0.139 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d00000000000000148 | 736.623 | 2.637 | n/a | 0.000 | 0.000 | 0.488 | 733.382 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.072 | 2.637 | 0.004 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d0000000000000013d | 720.246 | 3.700 | n/a | 0.000 | 0.000 | 1.273 | 715.143 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.071 | 3.700 | 0.005 | 0.071 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d00000000000000132 | 696.694 | 3.855 | n/a | 0.000 | 0.000 | 0.625 | 692.090 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.071 | 3.855 | 0.006 | 0.071 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d00000000000000134 | 692.124 | 2.451 | n/a | 0.000 | 0.000 | 0.397 | 688.557 | 0.020 | 0.000 | 0.629 | 0.000 | n/a | n/a | 0.069 | 2.451 | 0.004 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d0000000000000010d | 686.212 | 5.452 | n/a | 0.623 | 0.000 | 0.458 | 679.550 | 0.008 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.064 | 6.075 | 0.009 | 0.064 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d00000000000000123 | 667.696 | 3.128 | n/a | 0.000 | 0.000 | 0.988 | 663.423 | 0.011 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.066 | 3.128 | 0.005 | 0.066 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d00000000000000142 | 629.620 | 5.381 | n/a | 0.711 | 0.000 | 0.449 | 622.754 | 0.172 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.121 | 6.092 | 0.010 | 0.121 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d0000000000000012d | 628.914 | 2.872 | n/a | 0.000 | 0.000 | 0.834 | 624.665 | 0.442 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.064 | 2.872 | 0.005 | 0.064 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d00000000000000139 | 576.614 | 12.549 | n/a | 0.646 | 0.000 | 0.950 | 562.214 | 0.007 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.195 | 13.195 | 0.023 | 0.195 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d0000000000000013a | 420.960 | 2.870 | n/a | 0.000 | 0.000 | 2.538 | 415.438 | 0.007 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.059 | 2.870 | 0.007 | 0.059 | gw-r/thread-53/journal/page | none observed |

## P3 / L16 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 420.151 | n/a | n/a | n/a | 2.724 | n/a | 0.000 | 0.000 | 0.644 | 416.483 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.071 | 2.754 | 0.008 | 0.071 |
| p99 | 1008.355 | n/a | n/a | n/a | 9.713 | n/a | 0.965 | 0.000 | 5.658 | 1001.169 | 2.461 | 0.000 | 0.959 | 0.000 | n/a | n/a | 1.166 | 9.713 | 0.711 | 1.166 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f9d96733764a8d00000000000000185 | 1008.355 | 5.317 | n/a | 0.000 | 0.000 | 2.572 | 1000.289 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.143 | 5.317 | 0.005 | 0.143 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d0000000000000016e | 1005.129 | 3.449 | n/a | 0.000 | 0.000 | 0.553 | 1001.024 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.068 | 3.449 | 0.003 | 0.068 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d0000000000000017e | 1003.256 | 0.115 | n/a | 0.000 | 0.000 | 0.710 | 1001.169 | 0.016 | 0.000 | 0.081 | 0.000 | n/a | n/a | 1.166 | 0.115 | 0.000 | 1.166 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d00000000000000164 | 1002.501 | 0.118 | n/a | 0.000 | 0.000 | 0.498 | 1000.727 | 0.005 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.095 | 0.118 | 0.000 | 1.095 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d00000000000000186 | 996.842 | 2.724 | n/a | 0.000 | 0.000 | 0.554 | 993.456 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.065 | 2.724 | 0.003 | 0.065 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d00000000000000154 | 994.135 | 3.509 | n/a | 0.000 | 0.000 | 1.762 | 988.165 | 0.488 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.175 | 3.509 | 0.004 | 0.175 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d00000000000000173 | 957.635 | 3.138 | n/a | 0.000 | 0.000 | 0.704 | 953.654 | 0.006 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.063 | 3.138 | 0.003 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d00000000000000159 | 813.865 | 2.754 | n/a | 0.000 | 0.000 | 0.805 | 810.185 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.063 | 2.754 | 0.003 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d00000000000000179 | 784.000 | 3.002 | n/a | 0.000 | 0.000 | 0.833 | 780.060 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.064 | 3.002 | 0.004 | 0.064 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d00000000000000155 | 748.849 | 4.472 | n/a | 0.000 | 0.000 | 1.816 | 739.905 | 2.461 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.132 | 4.472 | 0.006 | 0.132 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d0000000000000016c | 623.118 | 5.325 | n/a | 0.000 | 0.000 | 0.628 | 616.999 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.121 | 5.325 | 0.009 | 0.121 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d00000000000000183 | 614.858 | 2.480 | n/a | 0.000 | 0.000 | 0.657 | 611.614 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.057 | 2.480 | 0.004 | 0.057 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d0000000000000014f | 597.814 | 2.444 | n/a | 0.000 | 0.000 | 0.744 | 594.490 | 0.005 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.073 | 2.444 | 0.004 | 0.073 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d00000000000000176 | 582.816 | 4.605 | n/a | 0.000 | 0.000 | 0.417 | 577.077 | 0.484 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.177 | 4.605 | 0.008 | 0.177 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d0000000000000017c | 578.541 | 4.858 | n/a | 0.000 | 0.000 | 0.686 | 572.836 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.112 | 4.858 | 0.008 | 0.112 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d00000000000000188 | 578.415 | 2.440 | n/a | 0.965 | 0.000 | 0.387 | 574.500 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.085 | 3.406 | 0.006 | 0.085 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d00000000000000170 | 565.697 | 2.565 | n/a | 0.000 | 0.000 | 0.642 | 562.366 | 0.005 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.069 | 2.565 | 0.005 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d00000000000000166 | 549.935 | 9.713 | n/a | 0.000 | 0.000 | 1.265 | 538.804 | 0.024 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.088 | 9.713 | 0.018 | 0.088 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d00000000000000167 | 444.269 | 2.883 | n/a | 0.000 | 0.000 | 0.644 | 440.648 | 0.006 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.064 | 2.883 | 0.006 | 0.064 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d0000000000000016f | 429.329 | 5.431 | n/a | 0.816 | 0.000 | 5.658 | 417.314 | 0.007 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.070 | 6.247 | 0.015 | 0.070 | gw-r/thread-54/journal/page | none observed |

## P3 / L64 / internal (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 332.080 | n/a | n/a | n/a | 3.051 | n/a | 0.000 | 0.000 | 0.709 | 326.027 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.072 | 3.051 | 0.010 | 0.072 |
| p99 | 1002.674 | n/a | n/a | n/a | 9.258 | n/a | 0.000 | 0.000 | 4.354 | 1000.717 | 0.439 | 0.000 | 0.122 | 0.000 | n/a | n/a | 1.145 | 9.258 | 0.565 | 1.145 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f9d96733764a8d000000000000001c2 | 1002.674 | 0.162 | n/a | 0.000 | 0.000 | 0.594 | 1000.717 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 1.145 | 0.162 | 0.000 | 1.145 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d00000000000000199 | 1001.412 | 3.342 | n/a | 0.000 | 0.000 | 2.103 | 995.414 | 0.439 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.061 | 3.342 | 0.003 | 0.061 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d0000000000000018a | 1001.253 | 2.580 | n/a | 0.000 | 0.000 | 2.034 | 996.411 | 0.123 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.060 | 2.580 | 0.003 | 0.060 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d000000000000001a6 | 998.179 | 2.692 | n/a | 0.000 | 0.000 | 0.518 | 994.861 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.063 | 2.692 | 0.003 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d000000000000001c4 | 995.709 | 2.519 | n/a | 0.000 | 0.000 | 0.471 | 992.616 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.062 | 2.519 | 0.003 | 0.062 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d000000000000001a5 | 981.155 | 2.978 | n/a | 0.000 | 0.000 | 0.653 | 977.416 | 0.009 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.059 | 2.978 | 0.003 | 0.059 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d000000000000001a4 | 938.100 | 2.582 | n/a | 0.000 | 0.000 | 0.457 | 934.959 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.063 | 2.582 | 0.003 | 0.063 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d0000000000000019b | 846.784 | 7.861 | n/a | 0.000 | 0.000 | 0.719 | 837.911 | 0.173 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.091 | 7.861 | 0.009 | 0.091 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d000000000000001c0 | 791.687 | 4.807 | n/a | 0.000 | 0.000 | 0.787 | 785.987 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.061 | 4.807 | 0.006 | 0.061 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d000000000000001d4 | 738.885 | 2.382 | n/a | 0.000 | 0.000 | 0.816 | 735.429 | 0.009 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.126 | 2.382 | 0.003 | 0.126 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d000000000000001b4 | 661.898 | 2.918 | n/a | 0.000 | 0.000 | 0.679 | 658.197 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.068 | 2.918 | 0.004 | 0.068 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d0000000000000019f | 626.269 | 4.609 | n/a | 0.000 | 0.000 | 0.509 | 620.906 | 0.125 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.072 | 4.609 | 0.007 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d000000000000001c5 | 609.347 | 2.902 | n/a | 0.000 | 0.000 | 0.558 | 605.768 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.073 | 2.902 | 0.005 | 0.073 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d000000000000001b7 | 601.087 | 3.051 | n/a | 0.000 | 0.000 | 0.682 | 597.203 | 0.037 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.070 | 3.051 | 0.005 | 0.070 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d000000000000001ae | 595.000 | 4.593 | n/a | 0.000 | 0.000 | 0.710 | 589.470 | 0.129 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.067 | 4.593 | 0.008 | 0.067 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d000000000000001a7 | 583.050 | 3.866 | n/a | 0.000 | 0.000 | 4.354 | 574.707 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.075 | 3.866 | 0.007 | 0.075 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d000000000000001cd | 572.267 | 2.396 | n/a | 0.000 | 0.000 | 1.091 | 568.671 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.072 | 2.396 | 0.004 | 0.072 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d000000000000001d0 | 536.341 | 2.801 | n/a | 0.000 | 0.000 | 0.709 | 532.717 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.065 | 2.801 | 0.005 | 0.065 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d00000000000000198 | 454.929 | 2.418 | n/a | 0.000 | 0.000 | 0.836 | 451.551 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.065 | 2.418 | 0.005 | 0.065 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d000000000000001b6 | 426.631 | 9.258 | n/a | 0.000 | 0.000 | 0.732 | 416.488 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.112 | 9.258 | 0.022 | 0.112 | gw-r/thread-49/journal/page | none observed |

## P3 / L256 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 302.220 | n/a | n/a | n/a | 2.710 | n/a | 0.000 | 0.000 | 0.521 | 298.999 | 0.008 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.072 | 2.710 | 0.008 | 0.072 |
| p99 | 1003.958 | n/a | n/a | n/a | 8.865 | n/a | 0.000 | 0.000 | 11.855 | 1000.853 | 0.840 | 11.656 | 0.067 | 0.000 | n/a | n/a | 1.201 | 8.865 | 0.799 | 1.201 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f9d96733764a8d00000000000000211 | 1003.958 | 0.117 | n/a | 0.000 | 0.000 | 1.744 | 1000.853 | 0.007 | 0.000 | 0.037 | 0.000 | n/a | n/a | 1.201 | 0.117 | 0.000 | 1.201 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d00000000000000218 | 1003.830 | 3.408 | n/a | 0.000 | 0.000 | 0.355 | 999.598 | 0.116 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.323 | 3.408 | 0.003 | 0.323 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d00000000000000216 | 1002.494 | 0.160 | n/a | 0.000 | 0.000 | 0.536 | 1000.595 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.154 | 0.160 | 0.000 | 1.154 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d000000000000001e9 | 1000.552 | 2.259 | n/a | 0.000 | 0.000 | 2.167 | 995.993 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.078 | 2.259 | 0.002 | 0.078 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d000000000000001fd | 989.184 | 4.243 | n/a | 0.000 | 0.000 | 0.723 | 984.114 | 0.007 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.059 | 4.243 | 0.004 | 0.059 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d00000000000000210 | 983.050 | 2.684 | n/a | 0.000 | 0.000 | 0.436 | 979.597 | 0.208 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.087 | 2.684 | 0.003 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d00000000000000215 | 964.589 | 2.996 | n/a | 0.000 | 0.000 | 0.492 | 960.768 | 0.206 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.068 | 2.996 | 0.003 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d00000000000000205 | 942.861 | 2.928 | n/a | 0.000 | 0.000 | 0.502 | 939.315 | 0.006 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.066 | 2.928 | 0.003 | 0.066 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d000000000000001f6 | 835.133 | 2.536 | n/a | 0.000 | 0.000 | 0.536 | 831.710 | 0.219 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.089 | 2.536 | 0.003 | 0.089 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d000000000000001fe | 796.621 | 2.326 | n/a | 0.000 | 0.000 | 0.448 | 793.740 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.068 | 2.326 | 0.003 | 0.068 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d000000000000001ef | 756.808 | 4.090 | n/a | 0.000 | 0.000 | 11.855 | 740.698 | 0.026 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.080 | 4.090 | 0.005 | 0.080 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d00000000000000201 | 741.009 | 3.091 | n/a | 0.000 | 0.000 | 0.421 | 737.391 | 0.008 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.059 | 3.091 | 0.004 | 0.059 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d000000000000001f3 | 723.107 | 2.511 | n/a | 0.000 | 0.000 | 0.407 | 720.068 | 0.010 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.069 | 2.511 | 0.003 | 0.069 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d000000000000001dc | 719.548 | 2.816 | n/a | 0.000 | 0.000 | 3.205 | 713.312 | 0.095 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.054 | 2.816 | 0.004 | 0.054 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d000000000000001e8 | 674.226 | 4.583 | n/a | 0.000 | 0.000 | 0.395 | 668.490 | 0.580 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.159 | 4.583 | 0.007 | 0.159 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d000000000000001d8 | 611.210 | 2.083 | n/a | 0.000 | 0.000 | 0.671 | 608.323 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.094 | 2.083 | 0.003 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d000000000000001f8 | 523.959 | 4.277 | n/a | 0.000 | 0.000 | 2.622 | 516.928 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.097 | 4.277 | 0.008 | 0.097 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d0000000000000020e | 509.271 | 2.544 | n/a | 0.000 | 0.000 | 0.411 | 505.845 | 0.360 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.059 | 2.544 | 0.005 | 0.059 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d000000000000001e0 | 489.358 | 3.540 | n/a | 0.000 | 0.000 | 0.489 | 473.568 | 0.004 | 11.656 | 0.029 | 0.000 | n/a | n/a | 0.072 | 3.540 | 0.007 | 0.072 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d000000000000001ed | 477.090 | 2.234 | n/a | 0.000 | 0.000 | 0.543 | 474.152 | 0.009 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.091 | 2.234 | 0.005 | 0.091 | gw-r/thread-52/journal/page | none observed |

## P3 / L1024 / internal (763 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.118 | n/a | n/a | n/a | 3.393 | n/a | 0.000 | 0.000 | 0.580 | 8.729 | 0.006 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.085 | 3.393 | 0.276 | 0.085 |
| p99 | 141.044 | n/a | n/a | n/a | 13.492 | n/a | 1.013 | 0.000 | 4.648 | 137.683 | 0.525 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.581 | 14.348 | 0.843 | 0.581 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f9d96733764a8d00000000000000224 | 984.564 | 2.610 | n/a | 0.000 | 0.000 | 0.518 | 981.323 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.072 | 2.610 | 0.003 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d00000000000000219 | 854.445 | 1.709 | n/a | 0.000 | 0.000 | 0.563 | 852.071 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.068 | 1.709 | 0.002 | 0.068 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d00000000000000225 | 846.633 | 4.222 | n/a | 0.000 | 0.000 | 0.692 | 841.517 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.160 | 4.222 | 0.005 | 0.160 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d00000000000000221 | 745.223 | 2.275 | n/a | 0.000 | 0.000 | 0.554 | 742.290 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.073 | 2.275 | 0.003 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d0000000000000021c | 702.383 | 1.985 | n/a | 0.000 | 0.000 | 0.450 | 699.739 | 0.108 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.065 | 1.985 | 0.003 | 0.065 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d00000000000000222 | 271.858 | 5.054 | n/a | 0.000 | 0.000 | 0.606 | 265.208 | 0.866 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.097 | 5.054 | 0.019 | 0.097 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d0000000000000021d | 247.832 | 2.312 | n/a | 0.000 | 0.000 | 0.459 | 244.968 | 0.005 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.064 | 2.312 | 0.009 | 0.064 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d0000000000000021a | 141.044 | 2.617 | n/a | 0.000 | 0.000 | 0.428 | 137.683 | 0.183 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.076 | 2.617 | 0.019 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d00000000000000641 | 112.569 | 11.125 | n/a | 1.289 | 0.000 | 0.507 | 99.418 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.218 | 12.414 | 0.110 | 0.218 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d00000000000000315 | 112.359 | 2.838 | n/a | 0.000 | 0.000 | 0.376 | 108.637 | 0.411 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.073 | 2.838 | 0.025 | 0.073 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d000000000000004f0 | 110.634 | 5.712 | n/a | 1.013 | 0.000 | 0.613 | 103.117 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.139 | 6.725 | 0.061 | 0.139 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d0000000000000066e | 109.757 | 12.967 | n/a | 0.693 | 0.000 | 0.646 | 95.227 | 0.002 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.209 | 13.660 | 0.124 | 0.209 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d000000000000002f7 | 96.600 | 5.870 | n/a | 0.000 | 0.000 | 0.595 | 89.990 | 0.017 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.087 | 5.870 | 0.061 | 0.087 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d00000000000000476 | 93.002 | 10.945 | n/a | 0.000 | 0.000 | 0.667 | 81.043 | 0.262 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.071 | 10.945 | 0.118 | 0.071 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d000000000000005f8 | 86.234 | 4.996 | n/a | 0.000 | 0.000 | 0.552 | 80.584 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.067 | 4.996 | 0.058 | 0.067 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d000000000000007a3 | 80.805 | 2.397 | n/a | 0.000 | 0.000 | 0.640 | 77.554 | 0.103 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.093 | 2.397 | 0.030 | 0.093 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d00000000000000791 | 79.698 | 9.642 | n/a | 0.000 | 0.000 | 0.762 | 69.118 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.150 | 9.642 | 0.121 | 0.150 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d000000000000005da | 77.572 | 10.348 | n/a | 0.000 | 0.000 | 0.783 | 66.120 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.275 | 10.348 | 0.133 | 0.275 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d0000000000000076c | 74.433 | 2.953 | n/a | 0.000 | 0.000 | 0.587 | 70.785 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.069 | 2.953 | 0.040 | 0.069 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d0000000000000077d | 72.788 | 11.469 | n/a | 0.717 | 0.000 | 0.934 | 59.202 | 0.124 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.320 | 12.187 | 0.167 | 0.320 | gw-r/thread-52/journal/page | none observed |

## P3 / tail / internal (2362 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.979 | n/a | n/a | n/a | 4.024 | n/a | 0.000 | 0.000 | 0.499 | 7.030 | 0.005 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.095 | 4.044 | 0.347 | 0.095 |
| p99 | 346.308 | n/a | n/a | n/a | 14.944 | n/a | 1.325 | 0.000 | 4.211 | 342.048 | 0.313 | 0.000 | 0.082 | 0.000 | n/a | n/a | 1.147 | 15.947 | 0.846 | 1.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f9d96733764a8d00000000000001ae0 | 1004.650 | 0.111 | n/a | 0.000 | 0.000 | 2.003 | 1000.435 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 2.067 | 0.111 | 0.000 | 2.067 | gw-r/thread-51/journal/page | none observed |
| 6f9d96733764a8d00000000000001b2c | 1002.304 | 0.092 | n/a | 0.000 | 0.000 | 0.391 | 1000.674 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 1.104 | 0.092 | 0.000 | 1.104 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d00000000000001aea | 998.376 | 2.180 | n/a | 0.000 | 0.000 | 0.291 | 995.761 | 0.044 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.063 | 2.180 | 0.002 | 0.063 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d00000000000001b28 | 992.174 | 2.251 | n/a | 0.000 | 0.000 | 0.401 | 989.337 | 0.090 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.060 | 2.251 | 0.002 | 0.060 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d00000000000001b03 | 989.159 | 3.696 | n/a | 0.000 | 0.000 | 0.430 | 984.829 | 0.090 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.091 | 3.696 | 0.004 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d00000000000001af3 | 969.926 | 7.770 | n/a | 0.000 | 0.000 | 0.387 | 961.525 | 0.004 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.199 | 7.770 | 0.008 | 0.199 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d00000000000001ae5 | 954.688 | 4.497 | n/a | 0.000 | 0.000 | 1.486 | 948.540 | 0.010 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.112 | 4.497 | 0.005 | 0.112 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d00000000000001b23 | 952.934 | 2.952 | n/a | 0.000 | 0.000 | 0.334 | 949.554 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.070 | 2.952 | 0.003 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d00000000000001ade | 945.034 | 2.388 | n/a | 0.000 | 0.000 | 0.281 | 942.266 | 0.015 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.062 | 2.388 | 0.003 | 0.062 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d00000000000001ae2 | 861.088 | 8.403 | n/a | 0.000 | 0.000 | 0.469 | 851.688 | 0.244 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.250 | 8.403 | 0.010 | 0.250 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d00000000000001b05 | 783.977 | 2.940 | n/a | 0.000 | 0.000 | 0.380 | 780.443 | 0.133 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.058 | 2.940 | 0.004 | 0.058 | gw-r/thread-53/journal/page | none observed |
| 6f9d96733764a8d00000000000001b25 | 770.214 | 2.126 | n/a | 0.000 | 0.000 | 0.365 | 767.631 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.066 | 2.126 | 0.003 | 0.066 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d00000000000001aff | 710.321 | 2.142 | n/a | 0.000 | 0.000 | 0.362 | 707.738 | 0.006 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.052 | 2.142 | 0.003 | 0.052 | gw-r/thread-50/journal/page | none observed |
| 6f9d96733764a8d00000000000001afa | 612.632 | 5.356 | n/a | 0.000 | 0.000 | 0.316 | 606.770 | 0.072 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.088 | 5.356 | 0.009 | 0.088 | gw-r/thread-54/journal/page | none observed |
| 6f9d96733764a8d00000000000001aeb | 606.113 | 2.259 | n/a | 0.000 | 0.000 | 1.098 | 602.617 | 0.007 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.104 | 2.259 | 0.004 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d00000000000001b1f | 595.495 | 2.054 | n/a | 0.000 | 0.000 | 0.354 | 592.891 | 0.043 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.064 | 2.054 | 0.003 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d00000000000001b07 | 579.093 | 9.040 | n/a | 0.000 | 0.000 | 0.394 | 569.326 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.304 | 9.040 | 0.016 | 0.304 | gw-r/thread-52/journal/page | none observed |
| 6f9d96733764a8d00000000000001b1d | 509.814 | 2.272 | n/a | 0.000 | 0.000 | 0.343 | 507.103 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.055 | 2.272 | 0.004 | 0.055 | gw-r/thread-49/journal/page | none observed |
| 6f9d96733764a8d00000000000001b15 | 479.942 | 2.438 | n/a | 0.000 | 0.000 | 0.513 | 476.891 | 0.003 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.074 | 2.438 | 0.005 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 6f9d96733764a8d00000000000001b1a | 444.083 | 2.797 | n/a | 0.000 | 0.000 | 0.449 | 440.737 | 0.007 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.063 | 2.797 | 0.006 | 0.063 | gw-r/thread-51/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.978 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.802 | 200.978 | 0.013 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.079 | 0.042 | 0.000 | 0.079 |
| p99 | 205.832 | n/a | n/a | n/a | 0.113 | n/a | 0.000 | 0.000 | 4.917 | 202.729 | 2.118 | 0.000 | 0.278 | 0.000 | n/a | n/a | 0.483 | 0.113 | 0.001 | 0.483 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ed710ae2c499e5f0000000000000030 | 205.832 | 0.049 | n/a | 0.000 | 0.000 | 4.426 | 201.097 | 0.012 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.131 | 0.049 | 0.000 | 0.131 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f000000000000000d | 203.906 | 0.034 | n/a | 0.000 | 0.000 | 0.865 | 202.729 | 0.065 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.082 | 0.034 | 0.000 | 0.082 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000009 | 203.751 | 0.055 | n/a | 0.000 | 0.000 | 1.911 | 200.995 | 0.030 | 0.000 | 0.278 | 0.000 | n/a | n/a | 0.483 | 0.055 | 0.000 | 0.483 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000021 | 203.510 | 0.042 | n/a | 0.000 | 0.000 | 0.862 | 202.294 | 0.012 | 0.000 | 0.229 | 0.000 | n/a | n/a | 0.073 | 0.042 | 0.000 | 0.073 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000034 | 203.199 | 0.113 | n/a | 0.000 | 0.000 | 1.432 | 201.314 | 0.010 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.178 | 0.113 | 0.001 | 0.178 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f000000000000000f | 203.111 | 0.039 | n/a | 0.000 | 0.000 | 0.946 | 201.807 | 0.019 | 0.000 | 0.227 | 0.000 | n/a | n/a | 0.073 | 0.039 | 0.000 | 0.073 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000036 | 202.986 | 0.043 | n/a | 0.000 | 0.000 | 0.789 | 201.610 | 0.251 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.122 | 0.043 | 0.000 | 0.122 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000035 | 202.953 | 0.059 | n/a | 0.000 | 0.000 | 1.085 | 201.528 | 0.013 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.146 | 0.059 | 0.000 | 0.146 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000013 | 202.905 | 0.033 | n/a | 0.000 | 0.000 | 0.820 | 201.713 | 0.041 | 0.000 | 0.224 | 0.000 | n/a | n/a | 0.075 | 0.033 | 0.000 | 0.075 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f000000000000004d | 202.822 | 0.047 | n/a | 0.000 | 0.000 | 1.048 | 201.334 | 0.150 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.108 | 0.047 | 0.000 | 0.108 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000014 | 202.813 | 0.054 | n/a | 0.000 | 0.000 | 0.754 | 201.655 | 0.027 | 0.000 | 0.243 | 0.000 | n/a | n/a | 0.080 | 0.054 | 0.000 | 0.080 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000037 | 202.807 | 0.047 | n/a | 0.000 | 0.000 | 1.268 | 201.185 | 0.012 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.150 | 0.047 | 0.000 | 0.150 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000041 | 202.794 | 0.031 | n/a | 0.000 | 0.000 | 0.931 | 201.565 | 0.038 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.076 | 0.031 | 0.000 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000008 | 202.721 | 0.032 | n/a | 0.000 | 0.000 | 1.244 | 201.209 | 0.012 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.087 | 0.032 | 0.000 | 0.087 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f000000000000003d | 202.484 | 0.046 | n/a | 0.000 | 0.000 | 0.818 | 201.280 | 0.091 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.092 | 0.046 | 0.000 | 0.092 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000032 | 202.484 | 0.036 | n/a | 0.000 | 0.000 | 0.584 | 201.672 | 0.012 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.077 | 0.036 | 0.000 | 0.077 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000051 | 202.467 | 0.029 | n/a | 0.000 | 0.000 | 0.764 | 201.446 | 0.015 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.070 | 0.029 | 0.000 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f000000000000000b | 202.425 | 0.047 | n/a | 0.000 | 0.000 | 1.067 | 201.071 | 0.011 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.121 | 0.047 | 0.000 | 0.121 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f000000000000003f | 202.417 | 0.043 | n/a | 0.000 | 0.000 | 0.856 | 201.254 | 0.045 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.083 | 0.043 | 0.000 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000058 | 202.392 | 0.032 | n/a | 0.000 | 0.000 | 0.878 | 201.276 | 0.010 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.073 | 0.032 | 0.000 | 0.073 | gw-r/thread-52/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.797 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.751 | 200.876 | 0.010 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.080 | 0.040 | 0.000 | 0.080 |
| p99 | 213.217 | n/a | n/a | n/a | 0.185 | n/a | 0.000 | 0.000 | 5.043 | 212.342 | 20.328 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.317 | 0.185 | 0.002 | 0.317 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ed710ae2c499e5f0000000000000075 | 213.217 | 0.038 | n/a | 0.000 | 0.000 | 0.590 | 212.342 | 0.044 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.080 | 0.038 | 0.000 | 0.080 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000096 | 206.555 | 0.185 | n/a | 0.000 | 0.000 | 5.043 | 200.894 | 0.019 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.317 | 0.185 | 0.001 | 0.317 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000097 | 202.696 | 0.032 | n/a | 0.000 | 0.000 | 0.728 | 201.647 | 0.017 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.139 | 0.032 | 0.000 | 0.139 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000060 | 202.686 | 0.040 | n/a | 0.000 | 0.000 | 0.858 | 201.531 | 0.023 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.080 | 0.040 | 0.000 | 0.080 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f000000000000005b | 202.590 | 0.045 | n/a | 0.000 | 0.000 | 0.849 | 201.379 | 0.042 | 0.000 | 0.187 | 0.000 | n/a | n/a | 0.088 | 0.045 | 0.000 | 0.088 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f000000000000005e | 202.523 | 0.030 | n/a | 0.000 | 0.000 | 0.789 | 201.462 | 0.016 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.070 | 0.030 | 0.000 | 0.070 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000083 | 202.514 | 0.081 | n/a | 0.000 | 0.000 | 0.961 | 201.212 | 0.010 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.138 | 0.081 | 0.000 | 0.138 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f00000000000000ac | 202.502 | 0.067 | n/a | 0.000 | 0.000 | 1.109 | 201.091 | 0.009 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.126 | 0.067 | 0.000 | 0.126 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000079 | 202.491 | 0.049 | n/a | 0.000 | 0.000 | 0.845 | 201.385 | 0.016 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.097 | 0.049 | 0.000 | 0.097 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000068 | 202.425 | 0.037 | n/a | 0.000 | 0.000 | 0.996 | 201.134 | 0.010 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.081 | 0.037 | 0.000 | 0.081 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000098 | 202.418 | 0.073 | n/a | 0.000 | 0.000 | 0.939 | 201.105 | 0.023 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.144 | 0.073 | 0.000 | 0.144 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f000000000000007e | 202.417 | 0.040 | n/a | 0.000 | 0.000 | 1.016 | 201.138 | 0.012 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.105 | 0.040 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000078 | 202.371 | 0.043 | n/a | 0.000 | 0.000 | 0.939 | 201.114 | 0.028 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.111 | 0.043 | 0.000 | 0.111 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000090 | 202.365 | 0.048 | n/a | 0.000 | 0.000 | 1.004 | 201.111 | 0.010 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.087 | 0.048 | 0.000 | 0.087 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f000000000000005c | 202.347 | 0.032 | n/a | 0.000 | 0.000 | 0.964 | 201.130 | 0.010 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.097 | 0.032 | 0.000 | 0.097 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000081 | 202.317 | 0.042 | n/a | 0.000 | 0.000 | 1.023 | 201.018 | 0.010 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.118 | 0.042 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000070 | 202.308 | 0.041 | n/a | 0.000 | 0.000 | 0.678 | 201.241 | 0.016 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.131 | 0.041 | 0.000 | 0.131 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000076 | 202.282 | 0.034 | n/a | 0.000 | 0.000 | 0.761 | 201.294 | 0.011 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.078 | 0.034 | 0.000 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f00000000000000a5 | 202.238 | 0.042 | n/a | 0.000 | 0.000 | 0.830 | 201.015 | 0.011 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.242 | 0.042 | 0.000 | 0.242 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000086 | 202.225 | 0.034 | n/a | 0.000 | 0.000 | 0.902 | 201.094 | 0.010 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.074 | 0.034 | 0.000 | 0.074 | gw-r/thread-54/journal/page | none observed |

## P3 / L4 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.678 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.727 | 200.789 | 0.007 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.081 | 0.043 | 0.000 | 0.081 |
| p99 | 203.840 | n/a | n/a | n/a | 0.160 | n/a | 0.000 | 0.000 | 2.184 | 202.272 | 3.820 | 0.000 | 0.175 | 0.000 | n/a | n/a | 0.230 | 0.160 | 0.001 | 0.230 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ed710ae2c499e5f00000000000000e8 | 203.840 | 0.034 | n/a | 0.000 | 0.000 | 1.607 | 201.943 | 0.007 | 0.000 | 0.175 | 0.000 | n/a | n/a | 0.073 | 0.034 | 0.000 | 0.073 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f00000000000000e4 | 203.506 | 0.056 | n/a | 0.000 | 0.000 | 0.995 | 202.272 | 0.022 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.095 | 0.056 | 0.000 | 0.095 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f00000000000000d3 | 203.415 | 0.042 | n/a | 0.000 | 0.000 | 2.184 | 200.973 | 0.007 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.141 | 0.042 | 0.000 | 0.141 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f00000000000000f4 | 202.921 | 0.051 | n/a | 0.000 | 0.000 | 0.884 | 201.687 | 0.011 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.176 | 0.051 | 0.000 | 0.176 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f00000000000000e7 | 202.847 | 0.045 | n/a | 0.000 | 0.000 | 0.929 | 201.679 | 0.019 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.114 | 0.045 | 0.000 | 0.114 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f00000000000000d5 | 202.797 | 0.035 | n/a | 0.000 | 0.000 | 0.573 | 202.050 | 0.010 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.070 | 0.035 | 0.000 | 0.070 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f00000000000000e0 | 202.734 | 0.042 | n/a | 0.000 | 0.000 | 0.996 | 201.434 | 0.013 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.118 | 0.042 | 0.000 | 0.118 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f00000000000000c4 | 202.602 | 0.042 | n/a | 0.000 | 0.000 | 0.742 | 201.549 | 0.021 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.125 | 0.042 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f00000000000000c9 | 202.430 | 0.046 | n/a | 0.000 | 0.000 | 0.822 | 201.368 | 0.007 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.110 | 0.046 | 0.000 | 0.110 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f000000000000011c | 202.372 | 0.063 | n/a | 0.000 | 0.000 | 0.945 | 201.117 | 0.007 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.132 | 0.063 | 0.000 | 0.132 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f00000000000000d1 | 202.346 | 0.041 | n/a | 0.000 | 0.000 | 0.903 | 201.204 | 0.009 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.107 | 0.041 | 0.000 | 0.107 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000122 | 202.344 | 0.045 | n/a | 0.000 | 0.000 | 0.927 | 201.192 | 0.012 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.077 | 0.045 | 0.000 | 0.077 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f00000000000000fc | 202.344 | 0.064 | n/a | 0.000 | 0.000 | 0.783 | 201.156 | 0.012 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.230 | 0.064 | 0.000 | 0.230 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000113 | 202.334 | 0.035 | n/a | 0.000 | 0.000 | 0.897 | 201.226 | 0.027 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.077 | 0.035 | 0.000 | 0.077 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f00000000000000ca | 202.328 | 0.045 | n/a | 0.000 | 0.000 | 1.078 | 201.017 | 0.007 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.127 | 0.045 | 0.000 | 0.127 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000102 | 202.260 | 0.038 | n/a | 0.000 | 0.000 | 0.938 | 201.041 | 0.007 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.162 | 0.038 | 0.000 | 0.162 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f00000000000000da | 202.257 | 0.034 | n/a | 0.000 | 0.000 | 0.923 | 201.141 | 0.012 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.069 | 0.034 | 0.000 | 0.069 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000127 | 202.172 | 0.045 | n/a | 0.000 | 0.000 | 0.925 | 201.010 | 0.007 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.105 | 0.045 | 0.000 | 0.105 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f00000000000000f8 | 202.162 | 0.040 | n/a | 0.000 | 0.000 | 0.997 | 200.956 | 0.007 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.082 | 0.040 | 0.000 | 0.082 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f00000000000000f2 | 202.126 | 0.039 | n/a | 0.000 | 0.000 | 0.827 | 201.068 | 0.031 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.083 | 0.039 | 0.000 | 0.083 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / read (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.618 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.648 | 200.764 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.078 | 0.042 | 0.000 | 0.078 |
| p99 | 205.234 | n/a | n/a | n/a | 0.096 | n/a | 0.000 | 0.000 | 1.661 | 204.329 | 2.483 | 7.990 | 0.143 | 0.000 | n/a | n/a | 0.331 | 0.096 | 0.001 | 0.331 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ed710ae2c499e5f0000000000000160 | 205.234 | 0.032 | n/a | 0.000 | 0.000 | 0.741 | 204.329 | 0.006 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.068 | 0.032 | 0.000 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000165 | 205.196 | 0.052 | n/a | 0.000 | 0.000 | 0.614 | 196.424 | 0.004 | 7.990 | 0.036 | 0.000 | n/a | n/a | 0.074 | 0.052 | 0.000 | 0.074 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f000000000000013b | 204.166 | 0.056 | n/a | 0.000 | 0.000 | 1.297 | 202.654 | 0.011 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.109 | 0.056 | 0.000 | 0.109 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000154 | 202.785 | 0.035 | n/a | 0.000 | 0.000 | 0.665 | 201.916 | 0.013 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.075 | 0.035 | 0.000 | 0.075 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f000000000000017d | 202.532 | 0.059 | n/a | 0.000 | 0.000 | 1.064 | 201.194 | 0.006 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.140 | 0.059 | 0.000 | 0.140 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000137 | 202.509 | 0.036 | n/a | 0.000 | 0.000 | 0.546 | 201.793 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.077 | 0.036 | 0.000 | 0.077 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000134 | 202.300 | 0.045 | n/a | 0.000 | 0.000 | 1.051 | 201.051 | 0.007 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.081 | 0.045 | 0.000 | 0.081 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f000000000000016d | 202.286 | 0.032 | n/a | 0.000 | 0.000 | 0.586 | 201.477 | 0.016 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.069 | 0.032 | 0.000 | 0.069 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f000000000000017a | 202.229 | 0.044 | n/a | 0.000 | 0.000 | 0.705 | 201.302 | 0.010 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.098 | 0.044 | 0.000 | 0.098 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000162 | 202.171 | 0.042 | n/a | 0.000 | 0.000 | 1.017 | 200.933 | 0.006 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.107 | 0.042 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f000000000000014f | 202.169 | 0.034 | n/a | 0.000 | 0.000 | 0.910 | 201.074 | 0.007 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.077 | 0.034 | 0.000 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000167 | 202.136 | 0.057 | n/a | 0.000 | 0.000 | 1.050 | 200.848 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.135 | 0.057 | 0.000 | 0.135 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f000000000000014c | 202.115 | 0.033 | n/a | 0.000 | 0.000 | 0.610 | 201.280 | 0.027 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.068 | 0.033 | 0.000 | 0.068 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000184 | 202.108 | 0.035 | n/a | 0.000 | 0.000 | 0.725 | 201.193 | 0.010 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.071 | 0.035 | 0.000 | 0.071 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000150 | 202.065 | 0.043 | n/a | 0.000 | 0.000 | 0.733 | 201.096 | 0.021 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.113 | 0.043 | 0.000 | 0.113 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f000000000000015f | 202.049 | 0.045 | n/a | 0.000 | 0.000 | 0.667 | 201.179 | 0.012 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.080 | 0.045 | 0.000 | 0.080 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000189 | 202.048 | 0.046 | n/a | 0.000 | 0.000 | 0.672 | 201.144 | 0.010 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.113 | 0.046 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000143 | 202.038 | 0.032 | n/a | 0.000 | 0.000 | 0.900 | 200.969 | 0.006 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.065 | 0.032 | 0.000 | 0.065 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000142 | 202.037 | 0.096 | n/a | 0.000 | 0.000 | 0.739 | 200.944 | 0.010 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.152 | 0.096 | 0.000 | 0.152 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000139 | 201.932 | 0.032 | n/a | 0.000 | 0.000 | 0.673 | 201.081 | 0.006 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.069 | 0.032 | 0.000 | 0.069 | gw-r/thread-54/journal/page | none observed |

## P3 / L64 / read (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.442 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.625 | 200.691 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.076 | 0.042 | 0.000 | 0.076 |
| p99 | 202.627 | n/a | n/a | n/a | 0.078 | n/a | 0.000 | 0.000 | 1.261 | 201.319 | 3.611 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.181 | 0.078 | 0.001 | 0.181 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ed710ae2c499e5f00000000000001a6 | 202.831 | 0.035 | n/a | 0.000 | 0.000 | 0.620 | 202.008 | 0.010 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.082 | 0.035 | 0.000 | 0.082 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f00000000000001c5 | 202.627 | 0.051 | n/a | 0.000 | 0.000 | 1.011 | 201.213 | 0.010 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.181 | 0.051 | 0.000 | 0.181 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f00000000000001a1 | 202.418 | 0.029 | n/a | 0.000 | 0.000 | 1.300 | 200.959 | 0.006 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.063 | 0.029 | 0.000 | 0.063 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f00000000000001bf | 202.347 | 0.040 | n/a | 0.000 | 0.000 | 0.875 | 201.272 | 0.010 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.073 | 0.040 | 0.000 | 0.073 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f00000000000001e2 | 202.298 | 0.048 | n/a | 0.000 | 0.000 | 1.146 | 200.942 | 0.006 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.088 | 0.048 | 0.000 | 0.088 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000202 | 202.268 | 0.047 | n/a | 0.000 | 0.000 | 0.767 | 201.248 | 0.011 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.112 | 0.047 | 0.000 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f00000000000001cb | 202.054 | 0.035 | n/a | 0.000 | 0.000 | 1.261 | 200.643 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.063 | 0.035 | 0.000 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f00000000000001fc | 202.041 | 0.037 | n/a | 0.000 | 0.000 | 0.601 | 201.240 | 0.015 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.079 | 0.037 | 0.000 | 0.079 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f00000000000001fb | 202.030 | 0.034 | n/a | 0.000 | 0.000 | 0.506 | 201.319 | 0.013 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.064 | 0.034 | 0.000 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f00000000000001cc | 201.995 | 0.052 | n/a | 0.000 | 0.000 | 0.756 | 200.991 | 0.011 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.123 | 0.052 | 0.000 | 0.123 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f00000000000001ab | 201.994 | 0.034 | n/a | 0.000 | 0.000 | 0.718 | 201.079 | 0.006 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.078 | 0.034 | 0.000 | 0.078 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f00000000000001f4 | 201.989 | 0.042 | n/a | 0.000 | 0.000 | 1.032 | 200.757 | 0.005 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.095 | 0.042 | 0.000 | 0.095 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f00000000000001a2 | 201.943 | 0.037 | n/a | 0.000 | 0.000 | 0.646 | 201.105 | 0.010 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.078 | 0.037 | 0.000 | 0.078 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f00000000000001bd | 201.872 | 0.051 | n/a | 0.000 | 0.000 | 0.766 | 200.869 | 0.008 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.124 | 0.051 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f00000000000001bc | 201.851 | 0.034 | n/a | 0.000 | 0.000 | 0.549 | 201.118 | 0.009 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.072 | 0.034 | 0.000 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f00000000000001fe | 201.851 | 0.053 | n/a | 0.000 | 0.000 | 0.912 | 200.697 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.130 | 0.053 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f00000000000001ec | 201.842 | 0.034 | n/a | 0.000 | 0.000 | 0.751 | 200.916 | 0.006 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.070 | 0.034 | 0.000 | 0.070 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000193 | 201.820 | 0.038 | n/a | 0.000 | 0.000 | 0.699 | 200.911 | 0.006 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.082 | 0.038 | 0.000 | 0.082 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f00000000000001c0 | 201.812 | 0.038 | n/a | 0.000 | 0.000 | 0.795 | 200.823 | 0.005 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.095 | 0.038 | 0.000 | 0.095 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000200 | 201.812 | 0.045 | n/a | 0.000 | 0.000 | 0.798 | 200.784 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.127 | 0.045 | 0.000 | 0.127 | gw-r/thread-49/journal/page | none observed |

## P3 / L256 / read (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.582 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.607 | 200.737 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.075 | 0.040 | 0.000 | 0.075 |
| p99 | 202.792 | n/a | n/a | n/a | 0.086 | n/a | 0.000 | 0.000 | 1.662 | 201.404 | 1.527 | 0.188 | 0.126 | 0.000 | n/a | n/a | 0.169 | 0.086 | 0.001 | 0.169 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ed710ae2c499e5f0000000000000213 | 205.125 | 0.037 | n/a | 0.000 | 0.000 | 0.396 | 204.545 | 0.011 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.067 | 0.037 | 0.000 | 0.067 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000216 | 202.792 | 0.033 | n/a | 0.000 | 0.000 | 1.662 | 197.011 | 0.009 | 3.880 | 0.126 | 0.000 | n/a | n/a | 0.071 | 0.033 | 0.000 | 0.071 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000237 | 202.345 | 0.032 | n/a | 0.000 | 0.000 | 1.423 | 200.765 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.063 | 0.032 | 0.000 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f000000000000025d | 202.309 | 0.032 | n/a | 0.000 | 0.000 | 0.712 | 201.404 | 0.013 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.067 | 0.032 | 0.000 | 0.067 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000277 | 202.232 | 0.046 | n/a | 0.000 | 0.000 | 0.888 | 201.129 | 0.010 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.083 | 0.046 | 0.000 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000248 | 202.134 | 0.050 | n/a | 0.000 | 0.000 | 0.965 | 200.949 | 0.009 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.096 | 0.050 | 0.000 | 0.096 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f000000000000022e | 202.099 | 0.038 | n/a | 0.000 | 0.000 | 0.696 | 201.120 | 0.009 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.152 | 0.038 | 0.000 | 0.152 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000246 | 202.070 | 0.042 | n/a | 0.000 | 0.000 | 0.674 | 201.196 | 0.010 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.072 | 0.042 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000244 | 202.067 | 0.034 | n/a | 0.000 | 0.000 | 0.702 | 201.171 | 0.009 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.069 | 0.034 | 0.000 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000221 | 202.063 | 0.044 | n/a | 0.000 | 0.000 | 0.781 | 201.007 | 0.010 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.077 | 0.044 | 0.000 | 0.077 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000210 | 202.033 | 0.035 | n/a | 0.000 | 0.000 | 0.891 | 200.972 | 0.006 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.065 | 0.035 | 0.000 | 0.065 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f000000000000024f | 201.991 | 0.035 | n/a | 0.000 | 0.000 | 0.501 | 201.298 | 0.011 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.067 | 0.035 | 0.000 | 0.067 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f000000000000020e | 201.979 | 0.056 | n/a | 0.000 | 0.000 | 0.858 | 200.879 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.129 | 0.056 | 0.000 | 0.129 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f000000000000020d | 201.952 | 0.067 | n/a | 0.000 | 0.000 | 0.831 | 200.848 | 0.010 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.099 | 0.067 | 0.000 | 0.099 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000271 | 201.939 | 0.034 | n/a | 0.000 | 0.000 | 0.707 | 201.054 | 0.006 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.071 | 0.034 | 0.000 | 0.071 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f000000000000022c | 201.934 | 0.034 | n/a | 0.000 | 0.000 | 0.416 | 201.332 | 0.010 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.070 | 0.034 | 0.000 | 0.070 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000243 | 201.932 | 0.059 | n/a | 0.000 | 0.000 | 0.764 | 200.944 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.107 | 0.059 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000247 | 201.918 | 0.049 | n/a | 0.000 | 0.000 | 0.883 | 200.804 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.127 | 0.049 | 0.000 | 0.127 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f000000000000023c | 201.909 | 0.044 | n/a | 0.000 | 0.000 | 0.596 | 201.085 | 0.010 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.113 | 0.044 | 0.000 | 0.113 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000265 | 201.909 | 0.047 | n/a | 0.000 | 0.000 | 0.937 | 200.704 | 0.009 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.145 | 0.047 | 0.000 | 0.145 | gw-r/thread-54/journal/page | none observed |

## P3 / L1024 / read (70 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 68.693 | n/a | n/a | n/a | 0.051 | n/a | 0.000 | 0.000 | 0.557 | 67.878 | 0.006 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.070 | 0.051 | 0.001 | 0.070 |
| p99 | 205.958 | n/a | n/a | n/a | 0.114 | n/a | 0.000 | 0.000 | 2.080 | 203.697 | 4.056 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.144 | 0.114 | 0.002 | 0.144 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ed710ae2c499e5f0000000000000289 | 205.958 | 0.040 | n/a | 0.000 | 0.000 | 2.080 | 203.697 | 0.010 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.066 | 0.040 | 0.000 | 0.066 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000285 | 201.930 | 0.044 | n/a | 0.000 | 0.000 | 1.109 | 200.648 | 0.010 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.074 | 0.044 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f000000000000028e | 201.868 | 0.034 | n/a | 0.000 | 0.000 | 0.741 | 200.954 | 0.006 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.067 | 0.034 | 0.000 | 0.067 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000282 | 201.837 | 0.054 | n/a | 0.000 | 0.000 | 0.572 | 201.042 | 0.010 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.094 | 0.054 | 0.000 | 0.094 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000280 | 201.827 | 0.031 | n/a | 0.000 | 0.000 | 0.606 | 201.043 | 0.021 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.066 | 0.031 | 0.000 | 0.066 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f000000000000028d | 201.813 | 0.037 | n/a | 0.000 | 0.000 | 0.584 | 201.037 | 0.010 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.075 | 0.037 | 0.000 | 0.075 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f000000000000027e | 201.768 | 0.031 | n/a | 0.000 | 0.000 | 0.631 | 200.980 | 0.007 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.059 | 0.031 | 0.000 | 0.059 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f000000000000028c | 201.727 | 0.042 | n/a | 0.000 | 0.000 | 0.575 | 200.900 | 0.006 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.144 | 0.042 | 0.000 | 0.144 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f000000000000027b | 201.582 | 0.040 | n/a | 0.000 | 0.000 | 0.552 | 200.819 | 0.009 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.104 | 0.040 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000292 | 201.555 | 0.049 | n/a | 0.000 | 0.000 | 0.608 | 200.716 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.120 | 0.049 | 0.000 | 0.120 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000291 | 201.518 | 0.061 | n/a | 0.000 | 0.000 | 0.589 | 200.700 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.113 | 0.061 | 0.000 | 0.113 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000286 | 201.504 | 0.032 | n/a | 0.000 | 0.000 | 0.405 | 200.920 | 0.011 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.069 | 0.032 | 0.000 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000290 | 201.369 | 0.049 | n/a | 0.000 | 0.000 | 0.548 | 200.629 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.100 | 0.049 | 0.000 | 0.100 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f000000000000027f | 201.357 | 0.030 | n/a | 0.000 | 0.000 | 0.383 | 200.822 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.069 | 0.030 | 0.000 | 0.069 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000287 | 201.335 | 0.034 | n/a | 0.000 | 0.000 | 0.487 | 200.688 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.067 | 0.034 | 0.000 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f000000000000027a | 201.316 | 0.032 | n/a | 0.000 | 0.000 | 0.473 | 200.693 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.069 | 0.032 | 0.000 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000279 | 201.248 | 0.032 | n/a | 0.000 | 0.000 | 0.420 | 200.679 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.066 | 0.032 | 0.000 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f000000000000028b | 201.232 | 0.040 | n/a | 0.000 | 0.000 | 0.472 | 200.551 | 0.005 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.072 | 0.040 | 0.000 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f000000000000027c | 188.213 | 0.059 | n/a | 0.000 | 0.000 | 0.834 | 186.938 | 0.268 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.092 | 0.059 | 0.000 | 0.092 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000293 | 176.890 | 0.046 | n/a | 0.000 | 0.000 | 0.564 | 175.843 | 0.343 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.071 | 0.046 | 0.000 | 0.071 | gw-r/thread-54/journal/page | none observed |

## P3 / tail / read (213 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 91.092 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.445 | 90.585 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.068 | 0.040 | 0.001 | 0.068 |
| p99 | 201.658 | n/a | n/a | n/a | 0.095 | n/a | 0.000 | 0.000 | 0.890 | 200.927 | 1.416 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.137 | 0.095 | 0.002 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ed710ae2c499e5f0000000000000ee7 | 201.760 | 0.043 | n/a | 0.000 | 0.000 | 0.454 | 201.127 | 0.003 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.098 | 0.043 | 0.000 | 0.098 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000f08 | 201.664 | 0.037 | n/a | 0.000 | 0.000 | 0.570 | 200.886 | 0.007 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.106 | 0.037 | 0.000 | 0.106 | gw-r/thread-52/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000ee4 | 201.658 | 0.057 | n/a | 0.000 | 0.000 | 0.830 | 200.588 | 0.004 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.136 | 0.057 | 0.000 | 0.136 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000f34 | 201.580 | 0.024 | n/a | 0.000 | 0.000 | 0.465 | 200.955 | 0.008 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.066 | 0.024 | 0.000 | 0.066 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000f03 | 201.569 | 0.033 | n/a | 0.000 | 0.000 | 0.445 | 200.927 | 0.009 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.071 | 0.033 | 0.000 | 0.071 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000f39 | 201.539 | 0.035 | n/a | 0.000 | 0.000 | 0.625 | 200.755 | 0.003 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.078 | 0.035 | 0.000 | 0.078 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000ed4 | 201.536 | 0.027 | n/a | 0.000 | 0.000 | 0.583 | 200.809 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.058 | 0.027 | 0.000 | 0.058 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000f0e | 201.509 | 0.030 | n/a | 0.000 | 0.000 | 0.640 | 200.718 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.075 | 0.030 | 0.000 | 0.075 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000ef0 | 201.503 | 0.038 | n/a | 0.000 | 0.000 | 0.558 | 200.753 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.100 | 0.038 | 0.000 | 0.100 | gw-r/thread-50/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000f06 | 201.501 | 0.077 | n/a | 0.000 | 0.000 | 0.426 | 200.878 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.094 | 0.077 | 0.000 | 0.094 | gw-r/thread-53/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000f2f | 201.492 | 0.032 | n/a | 0.000 | 0.000 | 0.537 | 200.788 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.077 | 0.032 | 0.000 | 0.077 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000ed3 | 201.462 | 0.040 | n/a | 0.000 | 0.000 | 0.591 | 200.711 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.076 | 0.040 | 0.000 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000ed8 | 201.458 | 0.032 | n/a | 0.000 | 0.000 | 0.489 | 200.797 | 0.004 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.078 | 0.032 | 0.000 | 0.078 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000efe | 201.426 | 0.048 | n/a | 0.000 | 0.000 | 0.602 | 200.627 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.107 | 0.048 | 0.000 | 0.107 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000eea | 201.414 | 0.039 | n/a | 0.000 | 0.000 | 0.420 | 200.795 | 0.010 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.103 | 0.039 | 0.000 | 0.103 | gw-r/thread-49/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000f1d | 201.406 | 0.033 | n/a | 0.000 | 0.000 | 0.587 | 200.659 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.071 | 0.033 | 0.000 | 0.071 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000ed2 | 201.398 | 0.040 | n/a | 0.000 | 0.000 | 0.430 | 200.769 | 0.007 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.105 | 0.040 | 0.000 | 0.105 | gw-r/thread-54/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000ef6 | 201.392 | 0.021 | n/a | 0.000 | 0.000 | 0.631 | 200.635 | 0.004 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.055 | 0.021 | 0.000 | 0.055 | gw-r/thread-47/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000efd | 201.377 | 0.027 | n/a | 0.000 | 0.000 | 0.484 | 200.747 | 0.004 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.067 | 0.027 | 0.000 | 0.067 | gw-r/thread-51/journal/page | none observed |
| 3ed710ae2c499e5f0000000000000f09 | 201.376 | 0.039 | n/a | 0.000 | 0.000 | 0.602 | 200.589 | 0.025 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.083 | 0.039 | 0.000 | 0.083 | gw-r/thread-49/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
