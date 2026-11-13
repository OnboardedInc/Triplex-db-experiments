# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (186.559 ms, trace `349ae9bbcae1ca2d0000000000001a52`); `node-14/thread-0/socket.wait-first-byte` (103.391 ms, trace `349ae9bbcae1ca2d000000000000190b`); `node-14/thread-0/driver.queue.scheduler-late` (127.297 ms, trace `349ae9bbcae1ca2d00000000000014be`); `node-14/thread-0/socket.wait-first-byte` (74.212 ms, trace `349ae9bbcae1ca2d00000000000014c7`); `node-14/thread-0/driver.queue.scheduler-late` (90.282 ms, trace `349ae9bbcae1ca2d0000000000001918`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-cpu-floor-a-2-engine-isolated`; source `04f9aa93ffa8297049405cedb99839753b8aeb3f`; subjects 10000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 37964337.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 205 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14484.565 | 543.831 | 82.708 | 311 |
| L1 | 0 | 19971.667 | 407.521 | 11.931 | 462 |
| L4 | 0 | 19980.221 | 343.558 | 5.969 | 426 |
| L16 | 0 | 19974.605 | 371.786 | 9.907 | 474 |
| L64 | 0 | 19953.637 | 399.345 | 11.791 | 610 |
| L256 | 0 | 19976.448 | 480.846 | 27.681 | 472 |
| L1024 | 0 | 19986.361 | 3734.164 | 88.394 | 12086 |
| tail | 0 | 64491.727 | 12642.618 | 594.580 | 37343 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 349ae9bbcae1ca2d0000000000001a52 | driver.queue.subject | 23.085 | 349ae9bbcae1ca2d0000000000001a4f | 1 / 32 |
| 349ae9bbcae1ca2d0000000000001a52 | driver.queue.scheduler-late | 0.647 | none | 1 / 32 |
| 349ae9bbcae1ca2d0000000000001a52 | driver.queue.scheduler-dispatch | 0.062 | none | 4 / 32 |

Observed active steps while trace 349ae9bbcae1ca2d0000000000001a52 waited: []

| 349ae9bbcae1ca2d000000000000190b | driver.queue.scheduler-late | 0.581 | none | 4 / 32 |
| 349ae9bbcae1ca2d000000000000190b | driver.queue.scheduler-dispatch | 0.083 | none | 4 / 32 |

Observed active steps while trace 349ae9bbcae1ca2d000000000000190b waited: []

| 349ae9bbcae1ca2d00000000000014be | driver.queue.scheduler-late | 127.297 | none | 1 / 32 |
| 349ae9bbcae1ca2d00000000000014be | driver.queue.scheduler-dispatch | 0.051 | none | 1 / 32 |

Observed active steps while trace 349ae9bbcae1ca2d00000000000014be waited: []

| 349ae9bbcae1ca2d00000000000014c7 | driver.queue.scheduler-late | 13.208 | none | 7 / 32 |
| 349ae9bbcae1ca2d00000000000014c7 | driver.queue.scheduler-dispatch | 0.007 | none | 7 / 32 |

Observed active steps while trace 349ae9bbcae1ca2d00000000000014c7 waited: []

| 349ae9bbcae1ca2d0000000000001918 | driver.queue.scheduler-late | 90.282 | none | 6 / 32 |
| 349ae9bbcae1ca2d0000000000001918 | driver.queue.subject | 70.644 | 349ae9bbcae1ca2d0000000000001917 | 6 / 32 |
| 349ae9bbcae1ca2d0000000000001918 | driver.queue.scheduler-dispatch | 0.119 | none | 1 / 32 |

Observed active steps while trace 349ae9bbcae1ca2d0000000000001918 waited: [{"at":1794584681657.6982,"inFlight":9,"capacity":32,"active":[{"traceId":"349ae9bbcae1ca2d000000000000190b","step":"client.http"},{"traceId":"349ae9bbcae1ca2d0000000000001912","step":"client.http"},{"traceId":"349ae9bbcae1ca2d0000000000001913","step":"client.http"},{"traceId":"349ae9bbcae1ca2d0000000000001914","step":"client.http"},{"traceId":"349ae9bbcae1ca2d0000000000001915","step":"client.http"},{"traceId":"349ae9bbcae1ca2d0000000000001916","step":"client.http"},{"traceId":"349ae9bbcae1ca2d0000000000001919","step":"client.http"},{"traceId":"349ae9bbcae1ca2d000000000000191b","step":"client.http"},{"traceId":"349ae9bbcae1ca2d000000000000191c","step":"client.http"}]},{"at":1794584681678.1826,"inFlight":8,"capacity":32,"active":[{"traceId":"349ae9bbcae1ca2d000000000000190b","step":"client.commit-send-queue"},{"traceId":"349ae9bbcae1ca2d0000000000001916","step":"client.http"},{"traceId":"349ae9bbcae1ca2d0000000000001919","step":"client.http"},{"traceId":"349ae9bbcae1ca2d000000000000191b","step":"client.http"},{"traceId":"349ae9bbcae1ca2d000000000000191c","step":"client.http"},{"traceId":"349ae9bbcae1ca2d000000000000191a","step":"client.commit-send-queue"},{"traceId":"349ae9bbcae1ca2d0000000000001917","step":"client.commit-send-queue"},{"traceId":"349ae9bbcae1ca2d0000000000001921","step":"client.commit-send-queue"}]},{"at":1794584681699.1243,"inFlight":7,"capacity":32,"active":[{"traceId":"349ae9bbcae1ca2d000000000000190b","step":"client.http"},{"traceId":"349ae9bbcae1ca2d0000000000001919","step":"client.http"},{"traceId":"349ae9bbcae1ca2d000000000000191b","step":"client.http"},{"traceId":"349ae9bbcae1ca2d000000000000191c","step":"client.http"},{"traceId":"349ae9bbcae1ca2d000000000000191a","step":"client.http"},{"traceId":"349ae9bbcae1ca2d0000000000001917","step":"client.http"},{"traceId":"349ae9bbcae1ca2d0000000000001921","step":"client.http"}]}]

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.454 | 0.452 | 0.000 | 1.420 | 5.066 | 0.200 | 0.000 | 0.201 | 1.199 | 6.417 | 0.035 | 0.000 | 0.478 | 13.052 | n/a | n/a | 0.054 | 5.740 | 0.234 | 0.054 |
| p99 | 69.813 | 4.482 | 3.289 | 8.133 | 13.226 | 0.773 | 6.599 | 0.969 | 4.285 | 24.482 | 0.160 | 0.000 | 3.364 | 49.614 | n/a | n/a | 1.341 | 15.215 | 0.597 | 1.341 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d0000000000000425 | 69.813 | 13.226 | 0.537 | 0.000 | 0.097 | 4.278 | 24.482 | 0.160 | 0.000 | 1.653 | 25.326 | n/a | n/a | 0.054 | 13.859 | 0.199 | 0.054 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000044b | 66.699 | 4.166 | 0.217 | 0.750 | 0.061 | 1.350 | 8.985 | 0.035 | 0.000 | 0.182 | 49.614 | n/a | n/a | 1.341 | 5.193 | 0.078 | 1.341 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000441 | 40.743 | 5.140 | 0.298 | 0.657 | 0.061 | 3.453 | 17.749 | 0.052 | 0.000 | 0.595 | 12.698 | n/a | n/a | 0.040 | 6.156 | 0.151 | 0.040 | gw-w/thread-49/gateway.admitted-work | none observed |
| 349ae9bbcae1ca2d000000000000043d | 38.310 | 5.683 | 0.266 | 0.000 | 0.073 | 3.526 | 11.473 | 0.046 | 0.000 | 0.698 | 16.502 | n/a | n/a | 0.042 | 6.022 | 0.157 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000435 | 37.315 | 4.750 | 0.454 | 5.257 | 0.096 | 1.380 | 13.520 | 0.037 | 0.000 | 0.726 | 11.027 | n/a | n/a | 0.067 | 10.558 | 0.283 | 0.067 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000042d | 36.917 | 4.637 | 0.246 | 0.000 | 0.073 | 2.037 | 14.375 | 0.074 | 0.000 | 0.299 | 15.103 | n/a | n/a | 0.073 | 4.956 | 0.134 | 0.073 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000431 | 35.294 | 5.790 | 0.366 | 0.000 | 0.093 | 2.662 | 11.165 | 0.035 | 0.000 | 1.002 | 14.091 | n/a | n/a | 0.092 | 6.248 | 0.177 | 0.092 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000453 | 35.130 | 5.668 | 0.314 | 0.557 | 0.050 | 1.717 | 10.452 | 0.045 | 0.000 | 0.806 | 15.480 | n/a | n/a | 0.040 | 6.589 | 0.188 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000432 | 33.395 | 6.987 | 0.010 | 2.429 | 0.808 | 1.199 | 1.727 | 0.027 | 0.000 | 2.682 | 17.465 | n/a | n/a | 0.061 | 10.235 | 0.306 | 0.061 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000043b | 33.249 | 6.348 | 0.005 | 1.366 | 0.645 | 0.775 | 1.106 | 0.025 | 0.000 | 3.364 | 19.573 | n/a | n/a | 0.040 | 8.364 | 0.252 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000449 | 33.074 | 9.758 | 0.012 | 1.792 | 0.969 | 1.310 | 1.511 | 0.029 | 0.000 | 0.914 | 16.742 | n/a | n/a | 0.038 | 12.531 | 0.379 | 0.038 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000422 | 31.640 | 8.238 | 0.027 | 0.000 | 0.615 | 0.990 | 8.069 | 0.042 | 0.000 | 0.240 | 13.128 | n/a | n/a | 0.292 | 8.880 | 0.281 | 0.292 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000045b | 29.729 | 6.141 | 0.773 | 0.000 | 0.066 | 4.285 | 8.089 | 0.042 | 0.000 | 0.478 | 9.815 | n/a | n/a | 0.039 | 6.980 | 0.235 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000437 | 29.633 | 6.542 | 0.200 | 0.000 | 0.201 | 1.795 | 8.601 | 0.068 | 0.000 | 0.764 | 11.413 | n/a | n/a | 0.048 | 6.944 | 0.234 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000044f | 27.454 | 5.057 | 0.298 | 0.000 | 0.117 | 1.464 | 6.417 | 0.031 | 0.000 | 0.944 | 13.052 | n/a | n/a | 0.073 | 5.472 | 0.199 | 0.073 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000042f | 27.291 | 3.291 | 0.006 | 0.000 | 0.305 | 0.653 | 8.302 | 0.031 | 0.000 | 0.196 | 14.437 | n/a | n/a | 0.070 | 3.602 | 0.132 | 0.070 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000459 | 26.479 | 3.967 | 0.225 | 0.000 | 0.116 | 1.164 | 7.416 | 0.058 | 0.000 | 0.295 | 13.176 | n/a | n/a | 0.062 | 4.308 | 0.163 | 0.062 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000042b | 25.974 | 3.813 | 0.006 | 0.000 | 0.636 | 0.739 | 3.911 | 0.025 | 0.000 | 0.478 | 16.308 | n/a | n/a | 0.057 | 4.455 | 0.172 | 0.057 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000438 | 25.477 | 7.765 | 0.008 | 6.599 | 0.844 | 0.800 | 2.765 | 0.035 | 0.000 | 0.253 | 6.357 | n/a | n/a | 0.053 | 15.215 | 0.597 | 0.053 | node-14/thread-0/node.gc | none observed |
| 349ae9bbcae1ca2d0000000000000429 | 24.775 | 5.224 | 0.310 | 0.000 | 0.133 | 2.002 | 9.546 | 0.043 | 0.000 | 0.564 | 6.866 | n/a | n/a | 0.087 | 5.667 | 0.229 | 0.087 | gw-w/thread-50/gateway.admitted-work | none observed |

## P2/P4 / read-your-own-write / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 77.603 | n/a | n/a | n/a | 23.998 | 22.444 | 0.769 | 0.000 | 0.680 | 4.970 | 0.005 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.011 | 52.419 | 0.789 | 0.011 |
| p99 | 239.208 | n/a | n/a | n/a | 75.429 | 132.354 | 11.064 | 0.000 | 154.460 | 76.144 | 90.579 | 20.047 | 0.176 | 0.000 | n/a | n/a | 0.042 | 158.260 | 1.000 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d00000000000014bb | 239.208 | 44.412 | 24.043 | 0.000 | 0.000 | 154.460 | 16.249 | 0.006 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.020 | 68.455 | 0.286 | 0.020 | node-14/thread-0/socket.wait-first-byte | client.parse 2.464ms; driver.publication 2.124ms |
| 349ae9bbcae1ca2d0000000000001a61 | 195.550 | 33.504 | 5.273 | 0.000 | 0.000 | 79.886 | 6.027 | 70.828 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.013 | 38.777 | 0.198 | 0.013 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 3.382ms; client.parse 3.090ms; driver.publication 2.408ms; driver.publication 1.808ms; driver.publication 1.536ms |
| 349ae9bbcae1ca2d00000000000014b8 | 194.080 | 75.429 | 56.189 | 6.479 | 0.000 | 0.489 | 42.581 | 0.006 | 12.894 | 0.006 | 0.000 | n/a | n/a | 0.008 | 138.097 | 0.712 | 0.008 | node-14/thread-0/client.reach | driver.expected-state.bind-receipt 1.091ms |
| 349ae9bbcae1ca2d0000000000000b27 | 188.149 | 19.742 | 3.365 | 4.098 | 0.000 | 52.153 | 18.185 | 90.579 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.013 | 27.206 | 0.145 | 0.013 | gw-w/thread-70/gateway.admission-wait | driver.publication 1.556ms; client.parse 1.411ms; driver.publication 1.091ms |
| 349ae9bbcae1ca2d0000000000001a60 | 181.427 | 20.860 | 4.786 | 2.359 | 0.000 | 64.936 | 11.843 | 76.625 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.013 | 28.005 | 0.154 | 0.013 | gw-w/thread-49/gateway.admission-wait | driver.expected-state.bind-receipt 3.382ms; client.parse 3.090ms; driver.publication 2.408ms; driver.publication 1.808ms; driver.publication 1.536ms |
| 349ae9bbcae1ca2d000000000000190a | 180.334 | 54.770 | 65.889 | 2.625 | 0.000 | 1.656 | 35.317 | 0.007 | 20.047 | 0.011 | 0.000 | n/a | n/a | 0.011 | 123.285 | 0.684 | 0.011 | node-14/thread-0/rpc.replica.observe | driver.publication 2.409ms; driver.publication 1.597ms; driver.publication 1.435ms; driver.publication 1.354ms; driver.expected-state.bind-receipt 1.103ms |
| 349ae9bbcae1ca2d0000000000000b28 | 177.647 | 18.310 | 3.224 | 0.000 | 0.000 | 61.300 | 11.021 | 83.778 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.009 | 21.534 | 0.121 | 0.009 | gw-w/thread-50/gateway.admission-wait | driver.publication 1.556ms; client.parse 1.411ms; driver.publication 1.091ms |
| 349ae9bbcae1ca2d0000000000000b26 | 176.272 | 15.652 | 4.745 | 0.000 | 0.000 | 57.831 | 13.763 | 84.261 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.015 | 20.397 | 0.116 | 0.015 | gw-w/thread-46/gateway.admission-wait | driver.publication 1.556ms; client.parse 1.411ms; driver.publication 1.091ms |
| 349ae9bbcae1ca2d0000000000001a69 | 173.432 | 22.997 | 31.237 | 0.000 | 0.000 | 97.789 | 2.383 | 18.998 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.008 | 54.234 | 0.313 | 0.008 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 3.382ms; client.parse 3.090ms; driver.publication 2.408ms; driver.publication 1.808ms; driver.publication 1.536ms |
| 349ae9bbcae1ca2d0000000000000b2e | 171.493 | 16.963 | 12.294 | 2.891 | 0.000 | 60.029 | 2.141 | 77.152 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.011 | 32.148 | 0.187 | 0.011 | gw-w/thread-49/gateway.admission-wait | client.parse 1.411ms; driver.publication 1.091ms |
| 349ae9bbcae1ca2d0000000000001a5d | 165.139 | 29.337 | 18.395 | 2.449 | 0.000 | 37.725 | 25.007 | 52.215 | 0.000 | 0.002 | 0.000 | n/a | n/a | 0.010 | 50.181 | 0.304 | 0.010 | gw-w/thread-50/gateway.admission-wait | driver.expected-state.bind-receipt 3.382ms; driver.publication 2.344ms; driver.publication 1.998ms; driver.publication 1.808ms; driver.publication 1.397ms |
| 349ae9bbcae1ca2d000000000000190f | 158.269 | 25.906 | 132.354 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 158.260 | 1.000 | 0.008 | node-14/thread-0/rpc.replica.observe | client.parse 2.171ms; driver.publication 1.354ms |
| 349ae9bbcae1ca2d0000000000000b25 | 155.258 | 35.366 | 22.626 | 2.632 | 0.000 | 3.755 | 40.865 | 38.880 | 11.114 | 0.009 | 0.000 | n/a | n/a | 0.011 | 60.624 | 0.390 | 0.011 | gw-w/thread-69/gateway.admission-wait | driver.publication 1.556ms |
| 349ae9bbcae1ca2d0000000000000f8b | 139.740 | 56.100 | 31.886 | 4.093 | 0.000 | 5.203 | 32.003 | 0.008 | 10.412 | 0.016 | 0.000 | n/a | n/a | 0.019 | 92.079 | 0.659 | 0.019 | node-14/thread-0/client.reach | driver.publication 4.037ms; driver.publication 4.013ms; driver.publication 1.136ms; driver.publication 1.041ms |
| 349ae9bbcae1ca2d0000000000001f1c | 137.054 | 26.453 | 28.059 | 11.064 | 0.000 | 29.464 | 26.914 | 15.085 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.007 | 65.576 | 0.478 | 0.007 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.065ms; driver.publication 3.060ms; driver.publication 1.652ms |
| 349ae9bbcae1ca2d0000000000001911 | 134.514 | 26.211 | 108.289 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 134.500 | 1.000 | 0.014 | node-14/thread-0/rpc.replica.observe | client.parse 2.171ms |
| 349ae9bbcae1ca2d00000000000014cd | 134.016 | 27.901 | 22.352 | 0.000 | 0.000 | 18.403 | 65.308 | 0.009 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.025 | 50.253 | 0.375 | 0.025 | gw-w/thread-70/gateway.admitted-work | driver.publication 4.963ms; driver.expected-state.bind-receipt 1.685ms; driver.publication 1.094ms; client.encode 1.014ms; driver.publication 1.000ms |
| 349ae9bbcae1ca2d0000000000000d18 | 131.419 | 30.424 | 22.231 | 2.442 | 0.000 | 3.651 | 33.035 | 39.613 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.008 | 55.097 | 0.419 | 0.008 | gw-w/thread-51/gateway.admission-wait | driver.publication 1.165ms; driver.publication 1.161ms; driver.publication 1.130ms; driver.publication 1.060ms; driver.publication 1.002ms |
| 349ae9bbcae1ca2d0000000000001a5f | 126.798 | 26.697 | 13.043 | 0.000 | 0.000 | 9.265 | 43.834 | 33.932 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.019 | 39.740 | 0.313 | 0.019 | gw-w/thread-70/gateway.admission-wait | driver.expected-state.bind-receipt 3.382ms; driver.publication 2.344ms; driver.publication 1.808ms; driver.publication 1.397ms; driver.publication 1.214ms |
| 349ae9bbcae1ca2d00000000000006d2 | 123.492 | 33.356 | 15.697 | 3.366 | 0.000 | 1.470 | 69.576 | 0.007 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.012 | 52.419 | 0.424 | 0.012 | gw-w/thread-48/gateway.admitted-work | driver.publication 1.144ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.656 | 0.587 | 0.000 | 1.863 | 4.166 | 0.009 | 0.000 | 0.712 | 0.765 | 1.128 | 0.027 | 0.000 | 0.465 | 7.962 | n/a | n/a | 0.054 | 5.386 | 0.355 | 0.054 |
| p99 | 27.291 | 0.996 | 0.000 | 2.142 | 5.189 | 0.024 | 1.417 | 0.819 | 1.039 | 8.302 | 0.035 | 0.000 | 1.031 | 16.308 | n/a | n/a | 0.070 | 5.948 | 0.431 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d000000000000042f | 27.291 | 3.291 | 0.006 | 0.000 | 0.305 | 0.653 | 8.302 | 0.031 | 0.000 | 0.196 | 14.437 | n/a | n/a | 0.070 | 3.602 | 0.132 | 0.070 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000042b | 25.974 | 3.813 | 0.006 | 0.000 | 0.636 | 0.739 | 3.911 | 0.025 | 0.000 | 0.478 | 16.308 | n/a | n/a | 0.057 | 4.455 | 0.172 | 0.057 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000450 | 24.482 | 5.189 | 0.009 | 0.000 | 0.751 | 0.903 | 0.918 | 0.026 | 0.000 | 0.381 | 16.238 | n/a | n/a | 0.068 | 5.948 | 0.243 | 0.068 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000444 | 20.964 | 3.402 | 0.005 | 0.000 | 0.816 | 1.039 | 4.606 | 0.027 | 0.000 | 0.157 | 10.875 | n/a | n/a | 0.038 | 4.222 | 0.201 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000427 | 15.656 | 4.822 | 0.010 | 0.000 | 0.725 | 0.765 | 1.094 | 0.034 | 0.000 | 0.178 | 7.962 | n/a | n/a | 0.067 | 5.557 | 0.355 | 0.067 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000455 | 15.542 | 4.912 | 0.009 | 0.000 | 0.819 | 0.805 | 1.128 | 0.034 | 0.000 | 1.031 | 6.751 | n/a | n/a | 0.054 | 5.740 | 0.369 | 0.054 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000442 | 15.124 | 5.066 | 0.009 | 0.000 | 0.665 | 0.955 | 1.416 | 0.026 | 0.000 | 0.550 | 6.383 | n/a | n/a | 0.053 | 5.739 | 0.379 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000457 | 12.504 | 3.486 | 0.005 | 1.417 | 0.479 | 0.682 | 1.000 | 0.027 | 0.000 | 0.474 | 4.892 | n/a | n/a | 0.043 | 5.386 | 0.431 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000044c | 12.062 | 4.166 | 0.024 | 0.000 | 0.712 | 0.694 | 0.994 | 0.035 | 0.000 | 0.465 | 4.920 | n/a | n/a | 0.052 | 4.902 | 0.406 | 0.052 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.132 | 0.558 | 0.000 | 1.138 | 4.309 | 0.011 | 0.000 | 0.133 | 1.056 | 5.604 | 0.035 | 0.000 | 0.447 | 11.563 | n/a | n/a | 0.054 | 5.041 | 0.225 | 0.054 |
| p99 | 47.767 | 2.706 | 0.212 | 4.487 | 8.576 | 0.351 | 2.759 | 1.187 | 3.344 | 18.934 | 0.105 | 13.362 | 1.486 | 33.251 | n/a | n/a | 0.125 | 8.710 | 0.439 | 0.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d000000000000046d | 47.767 | 4.846 | 0.005 | 2.759 | 0.275 | 0.498 | 5.800 | 0.051 | 0.000 | 0.244 | 33.251 | n/a | n/a | 0.037 | 7.885 | 0.165 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000049e | 39.880 | 4.004 | 0.287 | 0.219 | 0.083 | 1.346 | 18.934 | 0.042 | 0.000 | 1.486 | 13.354 | n/a | n/a | 0.125 | 4.593 | 0.115 | 0.125 | gw-w/thread-53/gateway.admitted-work | none observed |
| 349ae9bbcae1ca2d0000000000000494 | 38.545 | 5.106 | 0.275 | 0.361 | 0.093 | 1.354 | 9.014 | 0.028 | 13.362 | 0.450 | 8.433 | n/a | n/a | 0.068 | 5.836 | 0.151 | 0.068 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 349ae9bbcae1ca2d000000000000046f | 38.543 | 4.970 | 0.223 | 0.000 | 0.100 | 2.025 | 14.155 | 0.056 | 0.000 | 0.465 | 16.493 | n/a | n/a | 0.055 | 5.293 | 0.137 | 0.055 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000045f | 35.912 | 5.929 | 0.344 | 0.352 | 0.062 | 1.727 | 11.007 | 0.035 | 0.000 | 0.405 | 15.993 | n/a | n/a | 0.059 | 6.687 | 0.186 | 0.059 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000049c | 32.010 | 5.676 | 0.307 | 0.387 | 0.174 | 1.471 | 8.947 | 0.053 | 0.000 | 0.652 | 14.245 | n/a | n/a | 0.098 | 6.544 | 0.204 | 0.098 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004a2 | 31.899 | 3.964 | 0.179 | 0.234 | 0.084 | 1.155 | 11.273 | 0.046 | 0.000 | 1.378 | 13.531 | n/a | n/a | 0.054 | 4.462 | 0.140 | 0.054 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000498 | 30.868 | 3.360 | 0.217 | 0.216 | 0.092 | 1.200 | 9.259 | 0.082 | 0.000 | 0.517 | 15.843 | n/a | n/a | 0.083 | 3.884 | 0.126 | 0.083 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000477 | 30.497 | 3.745 | 0.301 | 0.252 | 0.105 | 3.344 | 11.253 | 0.058 | 0.000 | 0.403 | 10.959 | n/a | n/a | 0.076 | 4.403 | 0.144 | 0.076 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000047b | 30.468 | 3.376 | 0.193 | 0.258 | 0.059 | 0.979 | 5.604 | 0.033 | 0.000 | 0.189 | 19.727 | n/a | n/a | 0.050 | 3.885 | 0.128 | 0.050 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000473 | 28.839 | 5.112 | 0.351 | 0.276 | 0.131 | 1.504 | 9.788 | 0.034 | 0.000 | 0.631 | 10.935 | n/a | n/a | 0.077 | 5.870 | 0.204 | 0.077 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000466 | 28.691 | 3.497 | 0.237 | 1.759 | 0.092 | 1.069 | 8.059 | 0.050 | 0.000 | 0.447 | 13.417 | n/a | n/a | 0.065 | 5.584 | 0.195 | 0.065 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000464 | 28.438 | 3.764 | 0.005 | 0.000 | 0.528 | 0.754 | 1.007 | 0.025 | 0.000 | 0.472 | 21.837 | n/a | n/a | 0.046 | 4.298 | 0.151 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000481 | 27.616 | 4.256 | 0.268 | 0.366 | 0.051 | 1.583 | 9.088 | 0.040 | 0.000 | 0.247 | 11.669 | n/a | n/a | 0.047 | 4.941 | 0.179 | 0.047 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000469 | 27.568 | 3.641 | 0.221 | 0.000 | 0.101 | 1.441 | 8.407 | 0.031 | 0.000 | 0.218 | 13.453 | n/a | n/a | 0.055 | 3.963 | 0.144 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000467 | 26.522 | 8.576 | 0.010 | 0.000 | 0.124 | 3.164 | 7.341 | 0.092 | 0.000 | 1.320 | 5.822 | n/a | n/a | 0.073 | 8.710 | 0.328 | 0.073 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000045d | 25.926 | 4.945 | 0.183 | 0.000 | 0.061 | 1.964 | 6.192 | 0.035 | 0.000 | 0.217 | 12.291 | n/a | n/a | 0.039 | 5.189 | 0.200 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000487 | 24.748 | 3.487 | 0.172 | 0.230 | 0.053 | 1.053 | 6.094 | 0.033 | 0.000 | 0.252 | 13.335 | n/a | n/a | 0.039 | 3.943 | 0.159 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004a4 | 24.635 | 3.659 | 0.260 | 0.433 | 0.133 | 1.371 | 6.423 | 0.043 | 0.000 | 0.693 | 11.563 | n/a | n/a | 0.059 | 4.485 | 0.182 | 0.059 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000047f | 24.385 | 6.781 | 0.005 | 1.555 | 0.135 | 1.009 | 2.001 | 0.037 | 0.000 | 0.291 | 12.528 | n/a | n/a | 0.043 | 8.477 | 0.348 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.235 | 0.821 | 0.000 | 1.458 | 3.192 | 0.005 | 0.000 | 0.646 | 0.750 | 1.047 | 0.028 | 0.000 | 0.427 | 6.156 | n/a | n/a | 0.046 | 3.975 | 0.291 | 0.046 |
| p99 | 28.438 | 1.470 | 0.002 | 2.007 | 8.576 | 0.010 | 0.000 | 1.090 | 3.164 | 7.341 | 0.092 | 0.000 | 1.320 | 21.837 | n/a | n/a | 0.083 | 8.710 | 0.328 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d0000000000000464 | 28.438 | 3.764 | 0.005 | 0.000 | 0.528 | 0.754 | 1.007 | 0.025 | 0.000 | 0.472 | 21.837 | n/a | n/a | 0.046 | 4.298 | 0.151 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000467 | 26.522 | 8.576 | 0.010 | 0.000 | 0.124 | 3.164 | 7.341 | 0.092 | 0.000 | 1.320 | 5.822 | n/a | n/a | 0.073 | 8.710 | 0.328 | 0.073 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000478 | 17.642 | 3.673 | 0.005 | 0.000 | 1.090 | 0.932 | 1.272 | 0.041 | 0.000 | 0.785 | 9.760 | n/a | n/a | 0.083 | 4.768 | 0.270 | 0.083 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004a0 | 15.986 | 3.995 | 0.006 | 0.000 | 0.646 | 0.750 | 4.657 | 0.057 | 0.000 | 0.306 | 5.516 | n/a | n/a | 0.052 | 4.647 | 0.291 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000048d | 15.235 | 2.976 | 0.005 | 0.000 | 0.994 | 0.947 | 1.405 | 0.046 | 0.000 | 0.297 | 8.517 | n/a | n/a | 0.049 | 3.975 | 0.261 | 0.049 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000483 | 13.186 | 3.111 | 0.005 | 0.000 | 0.748 | 0.709 | 0.923 | 0.027 | 0.000 | 0.220 | 7.405 | n/a | n/a | 0.038 | 3.864 | 0.293 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004aa | 11.705 | 2.497 | 0.004 | 0.000 | 0.910 | 0.611 | 1.047 | 0.028 | 0.000 | 0.427 | 6.156 | n/a | n/a | 0.023 | 3.412 | 0.291 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000492 | 10.704 | 3.192 | 0.005 | 0.000 | 0.138 | 0.666 | 0.726 | 0.022 | 0.000 | 1.005 | 4.912 | n/a | n/a | 0.038 | 3.335 | 0.312 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.775 | 0.475 | 0.000 | 0.622 | 3.655 | 0.186 | 0.000 | 0.119 | 1.119 | 4.512 | 0.033 | 0.000 | 0.273 | 11.547 | n/a | n/a | 0.048 | 4.331 | 0.199 | 0.048 |
| p99 | 60.708 | 2.017 | 0.004 | 3.829 | 6.482 | 0.380 | 0.443 | 0.979 | 2.029 | 12.883 | 2.239 | 0.000 | 1.384 | 44.566 | n/a | n/a | 0.076 | 7.356 | 0.496 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d00000000000004d3 | 60.708 | 4.137 | 0.249 | 0.217 | 0.064 | 1.447 | 9.697 | 0.051 | 0.000 | 0.220 | 44.566 | n/a | n/a | 0.059 | 4.668 | 0.077 | 0.059 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004b9 | 38.876 | 3.649 | 0.265 | 0.361 | 0.055 | 1.701 | 6.731 | 0.053 | 0.000 | 0.304 | 25.699 | n/a | n/a | 0.055 | 4.331 | 0.111 | 0.055 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004c1 | 34.788 | 4.277 | 0.190 | 0.443 | 0.063 | 1.712 | 12.883 | 0.058 | 0.000 | 0.476 | 14.641 | n/a | n/a | 0.045 | 4.973 | 0.143 | 0.045 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004e7 | 32.854 | 4.916 | 0.380 | 0.000 | 0.074 | 1.169 | 6.972 | 0.035 | 0.000 | 0.414 | 18.835 | n/a | n/a | 0.058 | 5.370 | 0.163 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004cd | 30.713 | 4.975 | 0.269 | 0.377 | 0.105 | 2.017 | 9.635 | 0.053 | 0.000 | 0.300 | 12.917 | n/a | n/a | 0.066 | 5.727 | 0.186 | 0.066 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004e9 | 30.283 | 6.072 | 0.005 | 0.000 | 0.668 | 0.847 | 2.938 | 0.038 | 0.000 | 0.252 | 19.427 | n/a | n/a | 0.036 | 6.745 | 0.223 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004b2 | 29.219 | 3.645 | 0.193 | 0.337 | 0.065 | 1.298 | 10.051 | 0.052 | 0.000 | 0.199 | 13.333 | n/a | n/a | 0.045 | 4.240 | 0.145 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004f7 | 28.720 | 3.592 | 0.218 | 0.000 | 0.108 | 2.029 | 8.931 | 0.039 | 0.000 | 1.384 | 12.359 | n/a | n/a | 0.060 | 3.917 | 0.136 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.604ms |
| 349ae9bbcae1ca2d00000000000004d7 | 28.013 | 3.904 | 0.295 | 0.327 | 0.065 | 1.243 | 10.363 | 0.029 | 0.000 | 0.386 | 11.359 | n/a | n/a | 0.042 | 4.591 | 0.164 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004f3 | 27.985 | 3.468 | 0.228 | 0.000 | 0.102 | 1.145 | 8.342 | 2.239 | 0.000 | 0.386 | 12.010 | n/a | n/a | 0.064 | 3.799 | 0.136 | 0.064 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004dc | 27.695 | 5.702 | 0.006 | 0.000 | 0.201 | 0.637 | 1.323 | 0.025 | 0.000 | 0.241 | 19.516 | n/a | n/a | 0.044 | 5.909 | 0.213 | 0.044 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004fd | 27.100 | 3.604 | 0.243 | 0.217 | 0.066 | 1.072 | 5.329 | 0.032 | 0.000 | 0.159 | 16.325 | n/a | n/a | 0.052 | 4.130 | 0.152 | 0.052 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004db | 26.264 | 3.655 | 0.337 | 0.231 | 0.056 | 1.287 | 8.980 | 0.034 | 0.000 | 0.225 | 11.411 | n/a | n/a | 0.048 | 4.279 | 0.163 | 0.048 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004e5 | 25.912 | 3.070 | 0.217 | 0.000 | 0.078 | 1.119 | 11.335 | 0.032 | 0.000 | 0.211 | 9.802 | n/a | n/a | 0.047 | 3.365 | 0.130 | 0.047 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004cf | 24.650 | 3.251 | 0.186 | 0.208 | 0.058 | 1.239 | 6.825 | 0.052 | 0.000 | 0.733 | 12.054 | n/a | n/a | 0.044 | 3.704 | 0.150 | 0.044 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004e1 | 24.445 | 3.903 | 0.300 | 0.000 | 0.076 | 1.785 | 6.531 | 0.031 | 0.000 | 0.201 | 11.547 | n/a | n/a | 0.069 | 4.280 | 0.175 | 0.069 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004eb | 24.319 | 3.486 | 0.222 | 0.000 | 0.119 | 1.106 | 5.475 | 0.031 | 0.000 | 0.404 | 13.413 | n/a | n/a | 0.061 | 3.828 | 0.157 | 0.061 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004c3 | 23.622 | 3.836 | 0.227 | 0.252 | 0.111 | 1.390 | 6.384 | 0.048 | 0.000 | 0.310 | 11.007 | n/a | n/a | 0.058 | 4.427 | 0.187 | 0.058 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004d5 | 23.152 | 4.745 | 0.199 | 0.389 | 0.065 | 1.696 | 5.215 | 0.031 | 0.000 | 0.161 | 10.605 | n/a | n/a | 0.046 | 5.398 | 0.233 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004ca | 22.775 | 5.726 | 0.010 | 0.000 | 0.167 | 1.644 | 1.432 | 0.028 | 0.000 | 0.187 | 13.543 | n/a | n/a | 0.039 | 5.902 | 0.259 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.961 | 0.645 | 0.000 | 1.601 | 3.238 | 0.005 | 0.000 | 0.513 | 0.774 | 1.046 | 0.027 | 0.000 | 0.227 | 9.574 | n/a | n/a | 0.048 | 3.696 | 0.232 | 0.048 |
| p99 | 19.236 | 2.017 | 0.000 | 3.829 | 5.427 | 0.006 | 0.000 | 0.979 | 1.344 | 4.359 | 0.041 | 0.000 | 0.599 | 12.685 | n/a | n/a | 0.063 | 6.412 | 0.496 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d00000000000004e3 | 19.236 | 5.090 | 0.006 | 0.000 | 0.805 | 0.817 | 1.698 | 0.030 | 0.000 | 0.401 | 10.339 | n/a | n/a | 0.051 | 5.901 | 0.307 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004f8 | 19.141 | 3.750 | 0.004 | 0.000 | 0.859 | 0.774 | 0.840 | 0.022 | 0.000 | 0.159 | 12.685 | n/a | n/a | 0.048 | 4.614 | 0.241 | 0.048 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004b0 | 18.521 | 3.345 | 0.006 | 0.000 | 0.369 | 0.967 | 1.646 | 0.041 | 0.000 | 0.210 | 11.888 | n/a | n/a | 0.048 | 3.720 | 0.201 | 0.048 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004bf | 17.040 | 2.829 | 0.005 | 0.000 | 0.513 | 1.344 | 1.060 | 0.027 | 0.000 | 0.214 | 11.013 | n/a | n/a | 0.034 | 3.347 | 0.196 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004ef | 16.430 | 2.914 | 0.006 | 0.000 | 0.350 | 0.757 | 1.046 | 0.032 | 0.000 | 0.599 | 10.664 | n/a | n/a | 0.062 | 3.270 | 0.199 | 0.062 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004d8 | 15.961 | 3.119 | 0.005 | 0.000 | 0.572 | 0.679 | 1.589 | 0.041 | 0.000 | 0.345 | 9.574 | n/a | n/a | 0.037 | 3.696 | 0.232 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004c7 | 14.589 | 2.848 | 0.005 | 0.000 | 0.240 | 0.593 | 4.359 | 0.026 | 0.000 | 0.172 | 6.307 | n/a | n/a | 0.041 | 3.093 | 0.212 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004b4 | 13.618 | 3.673 | 0.005 | 0.000 | 0.654 | 0.854 | 0.900 | 0.027 | 0.000 | 0.227 | 7.224 | n/a | n/a | 0.055 | 4.332 | 0.318 | 0.055 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004c5 | 12.922 | 5.427 | 0.005 | 0.000 | 0.979 | 0.795 | 0.898 | 0.041 | 0.000 | 0.239 | 4.491 | n/a | n/a | 0.047 | 6.412 | 0.496 | 0.047 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004fa | 9.281 | 3.238 | 0.006 | 0.000 | 0.400 | 0.705 | 0.814 | 0.024 | 0.000 | 0.426 | 3.605 | n/a | n/a | 0.063 | 3.644 | 0.393 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.588 | 0.472 | 0.000 | 1.233 | 3.954 | 0.017 | 0.000 | 0.126 | 1.256 | 4.386 | 0.036 | 0.000 | 0.486 | 10.891 | n/a | n/a | 0.054 | 4.825 | 0.214 | 0.054 |
| p99 | 50.497 | 2.566 | 0.041 | 4.740 | 17.060 | 1.077 | 0.375 | 1.138 | 4.689 | 24.057 | 0.088 | 0.000 | 1.246 | 39.817 | n/a | n/a | 0.227 | 17.318 | 0.408 | 0.227 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d0000000000000511 | 50.497 | 6.021 | 0.006 | 0.000 | 0.840 | 0.996 | 2.144 | 0.041 | 0.000 | 0.577 | 39.817 | n/a | n/a | 0.055 | 6.867 | 0.136 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000521 | 50.255 | 17.060 | 0.017 | 0.000 | 0.240 | 3.972 | 14.060 | 0.085 | 0.000 | 0.486 | 14.270 | n/a | n/a | 0.064 | 17.318 | 0.345 | 0.064 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000550 | 48.148 | 4.760 | 0.206 | 0.000 | 0.062 | 1.486 | 5.845 | 0.057 | 0.000 | 0.386 | 35.307 | n/a | n/a | 0.040 | 5.028 | 0.104 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000510 | 45.941 | 4.487 | 0.202 | 0.375 | 0.072 | 1.256 | 24.057 | 0.047 | 0.000 | 0.460 | 14.942 | n/a | n/a | 0.044 | 5.136 | 0.112 | 0.044 | gw-w/thread-49/gateway.admitted-work | none observed |
| 349ae9bbcae1ca2d0000000000000548 | 39.501 | 7.689 | 0.240 | 0.000 | 0.125 | 2.980 | 16.629 | 0.035 | 0.000 | 0.292 | 11.440 | n/a | n/a | 0.070 | 8.053 | 0.204 | 0.070 | gw-w/thread-49/gateway.admitted-work | none observed |
| 349ae9bbcae1ca2d0000000000000503 | 36.450 | 3.904 | 0.447 | 0.352 | 0.156 | 1.584 | 16.037 | 0.063 | 0.000 | 0.301 | 13.552 | n/a | n/a | 0.055 | 4.859 | 0.133 | 0.055 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000542 | 32.271 | 6.097 | 0.183 | 0.000 | 0.073 | 1.546 | 11.907 | 0.062 | 0.000 | 0.730 | 11.625 | n/a | n/a | 0.048 | 6.354 | 0.197 | 0.048 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000532 | 31.712 | 4.230 | 1.077 | 0.000 | 0.083 | 1.471 | 13.133 | 0.051 | 0.000 | 0.773 | 10.836 | n/a | n/a | 0.057 | 5.390 | 0.170 | 0.057 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000054a | 30.379 | 5.663 | 0.232 | 0.000 | 0.114 | 1.538 | 5.789 | 0.035 | 0.000 | 0.380 | 16.553 | n/a | n/a | 0.075 | 6.009 | 0.198 | 0.075 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000534 | 29.823 | 3.954 | 0.260 | 0.000 | 0.065 | 1.494 | 9.026 | 0.036 | 0.000 | 0.485 | 14.444 | n/a | n/a | 0.058 | 4.280 | 0.144 | 0.058 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000053c | 28.767 | 3.743 | 0.308 | 0.000 | 0.065 | 1.452 | 5.355 | 0.040 | 0.000 | 0.568 | 17.184 | n/a | n/a | 0.054 | 4.115 | 0.143 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000520 | 28.329 | 3.771 | 0.302 | 0.290 | 0.116 | 1.641 | 7.347 | 0.054 | 0.000 | 0.481 | 14.265 | n/a | n/a | 0.061 | 4.479 | 0.158 | 0.061 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000540 | 27.258 | 4.582 | 0.216 | 0.000 | 0.072 | 1.803 | 7.110 | 0.043 | 0.000 | 0.519 | 12.862 | n/a | n/a | 0.050 | 4.870 | 0.179 | 0.050 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000052d | 27.209 | 7.038 | 0.009 | 0.000 | 1.046 | 0.836 | 4.386 | 0.027 | 0.000 | 0.651 | 13.156 | n/a | n/a | 0.061 | 8.092 | 0.297 | 0.061 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000509 | 26.612 | 3.372 | 0.274 | 0.260 | 0.106 | 4.689 | 6.621 | 0.031 | 0.000 | 0.172 | 11.021 | n/a | n/a | 0.066 | 4.012 | 0.151 | 0.066 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000054c | 26.302 | 3.483 | 0.252 | 0.000 | 0.059 | 1.347 | 10.289 | 0.088 | 0.000 | 0.567 | 10.161 | n/a | n/a | 0.055 | 3.794 | 0.144 | 0.055 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000052c | 26.186 | 3.681 | 0.724 | 0.000 | 0.130 | 1.434 | 6.918 | 0.049 | 0.000 | 0.899 | 12.277 | n/a | n/a | 0.074 | 4.535 | 0.173 | 0.074 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000525 | 24.859 | 3.144 | 0.178 | 0.000 | 0.039 | 0.999 | 10.457 | 0.034 | 0.000 | 0.833 | 9.142 | n/a | n/a | 0.033 | 3.361 | 0.135 | 0.033 | gw-w/thread-53/gateway.admitted-work | none observed |
| 349ae9bbcae1ca2d0000000000000501 | 23.948 | 3.368 | 0.005 | 0.000 | 0.769 | 1.799 | 1.653 | 0.042 | 0.000 | 0.249 | 16.013 | n/a | n/a | 0.050 | 4.142 | 0.173 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000530 | 22.694 | 2.553 | 0.006 | 0.000 | 0.688 | 0.634 | 4.328 | 0.036 | 0.000 | 0.617 | 13.788 | n/a | n/a | 0.043 | 3.247 | 0.143 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.430 | 0.786 | 0.000 | 1.607 | 3.368 | 0.005 | 0.000 | 0.769 | 0.814 | 1.238 | 0.028 | 0.000 | 0.497 | 9.416 | n/a | n/a | 0.050 | 4.230 | 0.260 | 0.050 |
| p99 | 23.948 | 1.481 | 0.041 | 4.740 | 6.311 | 0.010 | 0.000 | 1.121 | 1.799 | 4.487 | 0.061 | 0.000 | 1.246 | 16.013 | n/a | n/a | 0.227 | 6.864 | 0.408 | 0.227 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d0000000000000501 | 23.948 | 3.368 | 0.005 | 0.000 | 0.769 | 1.799 | 1.653 | 0.042 | 0.000 | 0.249 | 16.013 | n/a | n/a | 0.050 | 4.142 | 0.173 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000530 | 22.694 | 2.553 | 0.006 | 0.000 | 0.688 | 0.634 | 4.328 | 0.036 | 0.000 | 0.617 | 13.788 | n/a | n/a | 0.043 | 3.247 | 0.143 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000505 | 20.478 | 3.471 | 0.005 | 0.000 | 1.006 | 1.329 | 2.954 | 0.033 | 0.000 | 0.536 | 11.103 | n/a | n/a | 0.041 | 4.482 | 0.219 | 0.041 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000051c | 19.247 | 3.826 | 0.005 | 0.000 | 0.398 | 0.802 | 4.487 | 0.028 | 0.000 | 0.223 | 9.416 | n/a | n/a | 0.060 | 4.230 | 0.220 | 0.060 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000050e | 18.960 | 4.119 | 0.005 | 0.000 | 0.804 | 0.826 | 1.827 | 0.030 | 0.000 | 0.483 | 10.827 | n/a | n/a | 0.040 | 4.928 | 0.260 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000543 | 18.491 | 3.896 | 0.010 | 0.000 | 1.098 | 0.814 | 1.106 | 0.030 | 0.000 | 0.624 | 10.859 | n/a | n/a | 0.054 | 5.005 | 0.271 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000535 | 18.368 | 4.092 | 0.010 | 0.000 | 1.121 | 1.329 | 1.052 | 0.024 | 0.000 | 0.497 | 10.192 | n/a | n/a | 0.050 | 5.223 | 0.284 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000517 | 17.430 | 3.044 | 0.005 | 0.000 | 0.235 | 1.203 | 1.052 | 0.025 | 0.000 | 0.155 | 11.663 | n/a | n/a | 0.047 | 3.283 | 0.188 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000519 | 16.836 | 6.311 | 0.005 | 0.000 | 0.548 | 0.715 | 1.087 | 0.025 | 0.000 | 0.223 | 7.861 | n/a | n/a | 0.060 | 6.864 | 0.408 | 0.060 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000514 | 15.898 | 3.250 | 0.006 | 0.000 | 0.819 | 0.711 | 1.238 | 0.026 | 0.000 | 1.084 | 8.725 | n/a | n/a | 0.039 | 4.075 | 0.256 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000539 | 14.454 | 4.302 | 0.010 | 0.000 | 0.126 | 1.060 | 0.904 | 0.027 | 0.000 | 1.246 | 6.553 | n/a | n/a | 0.227 | 4.437 | 0.307 | 0.227 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000004fe | 13.947 | 2.646 | 0.005 | 0.000 | 0.663 | 0.590 | 0.830 | 0.025 | 0.000 | 0.181 | 8.958 | n/a | n/a | 0.047 | 3.315 | 0.238 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000527 | 13.862 | 3.070 | 0.005 | 0.000 | 0.848 | 0.906 | 1.516 | 0.036 | 0.000 | 0.700 | 6.739 | n/a | n/a | 0.042 | 3.923 | 0.283 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000054d | 11.969 | 3.200 | 0.005 | 0.000 | 0.064 | 0.598 | 1.549 | 0.061 | 0.000 | 0.529 | 5.906 | n/a | n/a | 0.055 | 3.270 | 0.273 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000053d | 10.985 | 3.344 | 0.009 | 0.000 | 0.992 | 0.762 | 0.832 | 0.026 | 0.000 | 0.155 | 4.804 | n/a | n/a | 0.060 | 4.346 | 0.396 | 0.060 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.412 | 0.478 | 0.000 | 1.403 | 4.149 | 0.010 | 0.000 | 0.360 | 0.985 | 2.362 | 0.032 | 0.000 | 0.444 | 9.263 | n/a | n/a | 0.051 | 4.677 | 0.248 | 0.051 |
| p99 | 55.788 | 1.949 | 1.833 | 4.247 | 9.069 | 0.360 | 0.000 | 1.139 | 4.078 | 13.473 | 0.085 | 0.000 | 3.369 | 38.941 | n/a | n/a | 0.143 | 9.399 | 0.457 | 0.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d0000000000000580 | 55.788 | 4.149 | 0.299 | 0.000 | 0.064 | 1.571 | 10.115 | 0.049 | 0.000 | 0.550 | 38.941 | n/a | n/a | 0.051 | 4.512 | 0.081 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000564 | 40.382 | 3.748 | 0.304 | 0.000 | 0.060 | 1.263 | 11.519 | 0.034 | 0.000 | 0.530 | 22.880 | n/a | n/a | 0.045 | 4.111 | 0.102 | 0.045 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000056c | 40.251 | 8.916 | 0.237 | 0.000 | 0.171 | 1.381 | 9.790 | 0.058 | 0.000 | 3.369 | 16.254 | n/a | n/a | 0.078 | 9.323 | 0.232 | 0.078 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000570 | 35.196 | 5.119 | 0.360 | 0.000 | 0.106 | 2.578 | 12.167 | 0.044 | 0.000 | 1.601 | 13.150 | n/a | n/a | 0.070 | 5.585 | 0.159 | 0.070 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.103ms |
| 349ae9bbcae1ca2d0000000000000578 | 32.693 | 7.474 | 0.291 | 0.000 | 0.059 | 1.464 | 5.494 | 0.055 | 0.000 | 0.444 | 17.366 | n/a | n/a | 0.047 | 7.824 | 0.239 | 0.047 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000055d | 32.391 | 3.705 | 0.259 | 0.000 | 0.059 | 1.642 | 10.494 | 0.050 | 0.000 | 0.188 | 15.948 | n/a | n/a | 0.046 | 4.023 | 0.124 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005af | 31.854 | 3.398 | 0.270 | 0.000 | 0.060 | 1.801 | 13.473 | 0.057 | 0.000 | 0.186 | 12.569 | n/a | n/a | 0.041 | 3.728 | 0.117 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005a3 | 28.771 | 4.883 | 0.237 | 0.000 | 0.057 | 1.634 | 6.005 | 0.029 | 0.000 | 0.147 | 15.740 | n/a | n/a | 0.038 | 5.177 | 0.180 | 0.038 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000561 | 28.658 | 5.709 | 0.010 | 0.000 | 0.347 | 0.740 | 11.056 | 0.029 | 0.000 | 0.150 | 10.549 | n/a | n/a | 0.067 | 6.066 | 0.212 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005a9 | 28.493 | 3.417 | 0.347 | 0.000 | 0.138 | 1.306 | 10.885 | 0.040 | 0.000 | 0.506 | 11.764 | n/a | n/a | 0.089 | 3.902 | 0.137 | 0.089 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000586 | 26.300 | 5.403 | 0.300 | 0.000 | 0.151 | 1.265 | 6.894 | 0.030 | 0.000 | 0.439 | 11.746 | n/a | n/a | 0.072 | 5.854 | 0.223 | 0.072 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000059b | 26.163 | 9.069 | 0.269 | 0.000 | 0.062 | 2.260 | 4.950 | 0.030 | 0.000 | 0.192 | 9.263 | n/a | n/a | 0.069 | 9.399 | 0.359 | 0.069 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000058b | 25.648 | 5.811 | 0.005 | 0.000 | 0.562 | 0.635 | 1.483 | 0.027 | 0.000 | 0.512 | 16.566 | n/a | n/a | 0.048 | 6.378 | 0.249 | 0.048 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000568 | 25.472 | 3.518 | 0.285 | 0.000 | 0.063 | 1.278 | 7.519 | 0.031 | 0.000 | 0.473 | 12.260 | n/a | n/a | 0.044 | 3.867 | 0.152 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000553 | 25.113 | 3.779 | 0.190 | 0.000 | 0.066 | 0.933 | 9.632 | 0.031 | 0.000 | 0.162 | 10.274 | n/a | n/a | 0.046 | 4.035 | 0.161 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005b5 | 24.672 | 3.230 | 0.263 | 0.000 | 0.040 | 1.224 | 8.114 | 0.029 | 0.000 | 0.361 | 11.374 | n/a | n/a | 0.038 | 3.533 | 0.143 | 0.038 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000598 | 24.505 | 3.490 | 0.208 | 0.000 | 0.068 | 1.480 | 8.189 | 0.068 | 0.000 | 0.337 | 10.617 | n/a | n/a | 0.048 | 3.766 | 0.154 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000057a | 23.850 | 3.545 | 0.004 | 0.000 | 0.859 | 0.559 | 0.805 | 0.019 | 0.000 | 1.064 | 16.938 | n/a | n/a | 0.057 | 4.408 | 0.185 | 0.057 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 1.494ms |
| 349ae9bbcae1ca2d0000000000000554 | 23.458 | 4.450 | 0.006 | 0.000 | 0.291 | 0.640 | 5.209 | 0.051 | 0.000 | 0.734 | 12.035 | n/a | n/a | 0.043 | 4.747 | 0.202 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005a4 | 22.824 | 3.527 | 0.006 | 0.000 | 0.922 | 4.078 | 1.878 | 0.047 | 0.000 | 0.292 | 12.030 | n/a | n/a | 0.044 | 4.454 | 0.195 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.438 | 0.640 | 0.000 | 1.690 | 3.655 | 0.005 | 0.000 | 0.758 | 0.717 | 1.305 | 0.035 | 0.000 | 0.416 | 5.646 | n/a | n/a | 0.050 | 4.408 | 0.320 | 0.050 |
| p99 | 23.850 | 1.949 | 0.000 | 3.016 | 6.362 | 0.011 | 0.000 | 1.128 | 3.924 | 4.676 | 0.085 | 0.000 | 3.120 | 16.938 | n/a | n/a | 0.143 | 7.297 | 0.447 | 0.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d000000000000057a | 23.850 | 3.545 | 0.004 | 0.000 | 0.859 | 0.559 | 0.805 | 0.019 | 0.000 | 1.064 | 16.938 | n/a | n/a | 0.057 | 4.408 | 0.185 | 0.057 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 1.494ms |
| 349ae9bbcae1ca2d000000000000059f | 20.412 | 4.557 | 0.009 | 0.000 | 0.572 | 0.614 | 1.360 | 0.045 | 0.000 | 0.416 | 12.785 | n/a | n/a | 0.055 | 5.138 | 0.252 | 0.055 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000552 | 17.861 | 5.716 | 0.005 | 0.000 | 0.810 | 3.924 | 3.979 | 0.085 | 0.000 | 0.406 | 2.831 | n/a | n/a | 0.105 | 6.531 | 0.366 | 0.105 | node-14/thread-0/driver.execute | none observed |
| 349ae9bbcae1ca2d0000000000000599 | 17.767 | 6.362 | 0.011 | 0.000 | 0.924 | 3.116 | 4.676 | 0.042 | 0.000 | 0.227 | 2.266 | n/a | n/a | 0.143 | 7.297 | 0.411 | 0.143 | node-14/thread-0/driver.execute | none observed |
| 349ae9bbcae1ca2d000000000000055b | 17.313 | 4.164 | 0.010 | 0.000 | 0.997 | 1.000 | 1.551 | 0.044 | 0.000 | 0.904 | 8.598 | n/a | n/a | 0.044 | 5.171 | 0.299 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000055f | 16.305 | 3.254 | 0.005 | 0.000 | 0.778 | 0.571 | 0.813 | 0.024 | 0.000 | 0.458 | 10.347 | n/a | n/a | 0.056 | 4.037 | 0.248 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005ad | 16.215 | 4.729 | 0.005 | 0.000 | 0.828 | 0.985 | 2.362 | 0.062 | 0.000 | 0.931 | 6.261 | n/a | n/a | 0.050 | 5.563 | 0.343 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005b1 | 14.611 | 3.588 | 0.006 | 0.000 | 1.083 | 0.689 | 0.889 | 0.031 | 0.000 | 0.207 | 8.067 | n/a | n/a | 0.051 | 4.677 | 0.320 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000571 | 14.438 | 3.662 | 0.005 | 0.000 | 0.130 | 0.592 | 1.190 | 0.052 | 0.000 | 3.120 | 5.646 | n/a | n/a | 0.042 | 3.796 | 0.263 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005a6 | 13.008 | 3.851 | 0.010 | 0.000 | 0.758 | 0.717 | 1.908 | 0.024 | 0.000 | 0.413 | 5.268 | n/a | n/a | 0.059 | 4.619 | 0.355 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000556 | 12.704 | 3.655 | 0.005 | 0.000 | 0.667 | 0.536 | 1.315 | 0.024 | 0.000 | 0.450 | 6.010 | n/a | n/a | 0.041 | 4.327 | 0.341 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000566 | 12.223 | 2.498 | 0.005 | 0.000 | 0.380 | 0.786 | 1.305 | 0.046 | 0.000 | 0.897 | 6.264 | n/a | n/a | 0.043 | 2.883 | 0.236 | 0.043 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000595 | 12.071 | 3.367 | 0.005 | 0.000 | 0.504 | 0.928 | 1.348 | 0.044 | 0.000 | 0.256 | 5.569 | n/a | n/a | 0.050 | 3.876 | 0.321 | 0.050 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000584 | 11.329 | 3.928 | 0.005 | 0.000 | 1.128 | 0.804 | 0.909 | 0.027 | 0.000 | 0.179 | 4.282 | n/a | n/a | 0.064 | 5.062 | 0.447 | 0.064 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005b3 | 10.635 | 2.821 | 0.005 | 0.000 | 0.580 | 0.543 | 0.983 | 0.026 | 0.000 | 0.474 | 5.165 | n/a | n/a | 0.039 | 3.405 | 0.320 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000058e | 9.817 | 2.984 | 0.005 | 0.000 | 0.097 | 0.644 | 0.861 | 0.027 | 0.000 | 0.230 | 4.928 | n/a | n/a | 0.041 | 3.086 | 0.314 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000590 | 8.446 | 2.572 | 0.004 | 0.000 | 0.270 | 0.739 | 0.820 | 0.035 | 0.000 | 0.380 | 3.593 | n/a | n/a | 0.033 | 2.846 | 0.337 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.032 | 0.530 | 0.000 | 0.711 | 3.803 | 0.016 | 0.000 | 0.139 | 1.103 | 1.946 | 0.036 | 0.000 | 0.374 | 8.894 | n/a | n/a | 0.058 | 4.365 | 0.231 | 0.058 |
| p99 | 119.197 | 2.043 | 3.509 | 6.474 | 10.943 | n/a | 0.000 | 1.702 | 3.313 | 16.493 | 1.540 | 83.230 | 3.261 | 28.449 | n/a | n/a | 0.091 | 11.486 | 0.536 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d00000000000005bd | 119.197 | 6.614 | 0.500 | 0.000 | 0.071 | 1.871 | 16.075 | 0.099 | 83.230 | 0.429 | 10.239 | n/a | n/a | 0.068 | 7.185 | 0.060 | 0.068 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 349ae9bbcae1ca2d00000000000005b9 | 52.641 | 5.222 | 0.197 | 0.000 | 0.058 | 1.703 | 16.493 | 0.105 | 0.000 | 0.352 | 28.449 | n/a | n/a | 0.062 | 5.477 | 0.104 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005ee | 38.136 | 6.511 | 0.013 | 0.000 | 0.817 | 0.936 | 1.946 | 0.062 | 0.000 | 1.011 | 26.764 | n/a | n/a | 0.075 | 7.342 | 0.193 | 0.075 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005bf | 38.130 | 10.571 | 0.012 | 0.000 | 0.601 | 0.861 | 3.556 | 0.039 | 0.000 | 1.764 | 20.654 | n/a | n/a | 0.072 | 11.184 | 0.293 | 0.072 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005c4 | 33.052 | 3.307 | 0.225 | 0.000 | 0.114 | 1.145 | 9.500 | 0.031 | 0.000 | 0.424 | 18.244 | n/a | n/a | 0.063 | 3.646 | 0.110 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005ef | 30.266 | 4.263 | 0.325 | 0.000 | 0.056 | 1.715 | 6.830 | 1.540 | 0.000 | 0.869 | 14.625 | n/a | n/a | 0.043 | 4.645 | 0.153 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 2.589ms |
| 349ae9bbcae1ca2d00000000000005fc | 27.626 | 3.691 | 0.204 | 0.000 | 0.069 | 1.591 | 5.935 | 0.037 | 0.000 | 0.436 | 15.614 | n/a | n/a | 0.050 | 3.964 | 0.143 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005f2 | 27.452 | 4.438 | 0.209 | 0.000 | 0.071 | 1.953 | 8.232 | 0.066 | 0.000 | 0.249 | 12.183 | n/a | n/a | 0.051 | 4.718 | 0.172 | 0.051 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005e4 | 27.394 | 3.641 | 0.319 | 0.000 | 0.096 | 1.385 | 9.166 | 0.034 | 0.000 | 3.081 | 9.597 | n/a | n/a | 0.075 | 4.056 | 0.148 | 0.075 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005de | 27.117 | 3.673 | 0.297 | 0.000 | 0.072 | 1.545 | 8.448 | 0.035 | 0.000 | 0.315 | 12.646 | n/a | n/a | 0.087 | 4.042 | 0.149 | 0.087 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005cc | 25.943 | 3.583 | 0.210 | 0.000 | 0.058 | 1.244 | 5.853 | 0.037 | 0.000 | 0.253 | 14.647 | n/a | n/a | 0.056 | 3.852 | 0.148 | 0.056 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000609 | 25.598 | 3.667 | 0.258 | 0.000 | 0.167 | 1.396 | 9.273 | 0.058 | 0.000 | 0.857 | 9.849 | n/a | n/a | 0.074 | 4.092 | 0.160 | 0.074 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005e6 | 24.934 | 4.910 | 1.806 | 0.000 | 0.062 | 1.515 | 6.960 | 0.030 | 0.000 | 0.424 | 9.172 | n/a | n/a | 0.054 | 6.778 | 0.272 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005d6 | 24.772 | 3.548 | 0.198 | 0.000 | 0.060 | 1.466 | 9.082 | 0.038 | 0.000 | 0.180 | 10.152 | n/a | n/a | 0.047 | 3.807 | 0.154 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000607 | 24.270 | 3.468 | 0.217 | 0.000 | 0.104 | 3.313 | 6.365 | 0.055 | 0.000 | 0.298 | 10.382 | n/a | n/a | 0.069 | 3.788 | 0.156 | 0.069 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d0000000000000603 | 23.373 | 3.596 | 0.206 | 0.000 | 0.164 | 1.033 | 7.078 | 0.032 | 0.000 | 0.169 | 11.037 | n/a | n/a | 0.059 | 3.965 | 0.170 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005ca | 22.510 | 3.824 | 0.186 | 0.000 | 0.062 | 1.144 | 7.284 | 0.060 | 0.000 | 0.300 | 9.604 | n/a | n/a | 0.045 | 4.072 | 0.181 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005db | 21.418 | 10.943 | 0.008 | 0.000 | 0.535 | 0.829 | 1.522 | 0.032 | 0.000 | 0.274 | 7.198 | n/a | n/a | 0.076 | 11.486 | 0.536 | 0.076 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005c2 | 20.074 | 5.195 | 0.005 | 0.000 | 0.496 | 0.988 | 2.536 | 0.095 | 0.000 | 1.518 | 9.184 | n/a | n/a | 0.057 | 5.696 | 0.284 | 0.057 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005e2 | 19.503 | 3.478 | 0.005 | 0.000 | 1.016 | 0.638 | 1.092 | 0.025 | 0.000 | 0.439 | 12.765 | n/a | n/a | 0.044 | 4.499 | 0.231 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.486 | 0.591 | 0.000 | 1.504 | 3.573 | 0.008 | 0.000 | 0.764 | 0.919 | 1.116 | 0.029 | 0.000 | 0.237 | 6.612 | n/a | n/a | 0.045 | 4.057 | 0.274 | 0.045 |
| p99 | 38.136 | 1.388 | 0.001 | 3.255 | 6.511 | n/a | 0.000 | 1.652 | 3.106 | 12.500 | 0.062 | 0.000 | 1.011 | 26.764 | n/a | n/a | 0.091 | 7.342 | 0.449 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d00000000000005ee | 38.136 | 6.511 | 0.013 | 0.000 | 0.817 | 0.936 | 1.946 | 0.062 | 0.000 | 1.011 | 26.764 | n/a | n/a | 0.075 | 7.342 | 0.193 | 0.075 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005fe | 17.516 | 2.396 | n/a | 0.000 | 0.213 | 2.278 | 12.500 | 0.026 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.044 | 2.609 | 0.149 | 0.044 | gw-w/thread-50/gateway.admitted-work | none observed |
| 349ae9bbcae1ca2d00000000000005f7 | 17.310 | 2.400 | 0.005 | 0.000 | 1.652 | 3.106 | 0.968 | 0.025 | 0.000 | 0.226 | 8.894 | n/a | n/a | 0.035 | 4.057 | 0.234 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005df | 16.974 | 4.936 | 0.009 | 0.000 | 0.915 | 0.919 | 0.903 | 0.025 | 0.000 | 0.187 | 8.990 | n/a | n/a | 0.091 | 5.859 | 0.345 | 0.091 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005f3 | 15.456 | 3.803 | 0.005 | 0.000 | 0.139 | 1.471 | 0.869 | 0.040 | 0.000 | 0.232 | 8.844 | n/a | n/a | 0.054 | 3.948 | 0.255 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005c5 | 14.877 | 5.574 | 0.009 | 0.000 | 1.090 | 1.047 | 1.483 | 0.047 | 0.000 | 0.610 | 4.958 | n/a | n/a | 0.059 | 6.674 | 0.449 | 0.059 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005cd | 13.726 | 3.099 | 0.016 | 0.000 | 0.708 | 0.619 | 1.547 | 0.036 | 0.000 | 0.237 | 7.427 | n/a | n/a | 0.038 | 3.823 | 0.279 | 0.038 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005d4 | 13.486 | 3.573 | 0.009 | 0.000 | 0.115 | 0.970 | 1.364 | 0.049 | 0.000 | 0.732 | 6.612 | n/a | n/a | 0.064 | 3.696 | 0.274 | 0.064 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005b7 | 13.201 | 2.806 | 0.004 | 0.000 | 0.292 | 0.447 | 1.116 | 0.025 | 0.000 | 0.196 | 8.283 | n/a | n/a | 0.032 | 3.102 | 0.235 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005e8 | 13.001 | 3.818 | 0.006 | 0.000 | 0.764 | 1.044 | 1.158 | 0.030 | 0.000 | 0.528 | 5.609 | n/a | n/a | 0.045 | 4.588 | 0.353 | 0.045 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005d7 | 12.917 | 4.191 | 0.009 | 0.000 | 1.105 | 0.740 | 0.987 | 0.025 | 0.000 | 0.380 | 5.421 | n/a | n/a | 0.061 | 5.304 | 0.411 | 0.061 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005ec | 12.858 | 3.379 | 0.005 | 0.000 | 0.980 | 0.688 | 0.993 | 0.028 | 0.000 | 0.619 | 6.120 | n/a | n/a | 0.046 | 4.365 | 0.339 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005f9 | 12.738 | 4.305 | 0.008 | 0.000 | 1.296 | 0.627 | 1.398 | 0.029 | 0.000 | 0.875 | 4.160 | n/a | n/a | 0.040 | 5.609 | 0.440 | 0.040 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d00000000000005cf | 11.936 | 2.983 | 0.005 | 0.000 | 0.076 | 0.820 | 1.100 | 0.031 | 0.000 | 0.217 | 6.660 | n/a | n/a | 0.045 | 3.064 | 0.257 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (851 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.138 | 0.732 | 0.000 | 1.594 | 3.639 | 0.006 | 0.000 | 0.771 | 0.774 | 1.162 | 0.029 | 0.000 | 0.262 | 7.208 | n/a | n/a | 0.038 | 4.674 | 0.310 | 0.038 |
| p99 | 66.450 | 2.740 | 2.122 | 4.498 | 10.229 | 2.052 | 0.000 | 22.924 | 19.604 | 10.139 | 4.431 | 0.000 | 4.258 | 35.479 | n/a | n/a | 0.100 | 26.679 | 0.654 | 0.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d0000000000000b33 | 104.669 | 7.286 | 0.210 | 0.000 | 7.755 | 71.409 | 1.031 | 0.019 | 0.000 | 2.497 | 14.433 | n/a | n/a | 0.030 | 15.250 | 0.146 | 0.030 | node-14/thread-0/socket.wait-first-byte | client.parse 1.411ms; driver.publication 1.091ms |
| 349ae9bbcae1ca2d0000000000000b32 | 102.094 | 3.926 | 0.008 | 0.000 | 18.372 | 66.897 | 1.198 | 0.041 | 0.000 | 0.208 | 11.409 | n/a | n/a | 0.037 | 22.305 | 0.218 | 0.037 | node-14/thread-0/socket.wait-first-byte | client.parse 1.411ms |
| 349ae9bbcae1ca2d0000000000000b35 | 99.522 | 7.365 | 3.027 | 0.000 | 47.555 | 21.318 | 1.514 | 0.012 | 0.000 | 2.869 | 15.831 | n/a | n/a | 0.031 | 57.947 | 0.582 | 0.031 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.385ms; driver.publication 1.167ms; driver.publication 1.091ms |
| 349ae9bbcae1ca2d0000000000000b34 | 97.449 | 7.259 | 0.005 | 0.000 | 47.742 | 30.853 | 1.435 | 0.029 | 0.000 | 0.125 | 9.965 | n/a | n/a | 0.037 | 55.006 | 0.564 | 0.037 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.385ms; driver.publication 1.091ms |
| 349ae9bbcae1ca2d0000000000000b36 | 83.579 | 15.596 | 1.649 | 1.507 | 18.471 | 26.024 | 8.062 | 0.058 | 0.000 | 0.123 | 12.052 | n/a | n/a | 0.038 | 37.223 | 0.445 | 0.038 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.385ms; driver.publication 1.167ms; driver.publication 1.091ms |
| 349ae9bbcae1ca2d0000000000000646 | 82.496 | 6.615 | 0.011 | 0.000 | 3.675 | 3.018 | 2.055 | 7.665 | 0.000 | 0.070 | 59.334 | n/a | n/a | 0.052 | 10.302 | 0.125 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 4.153ms; driver.expected-state.add-commit 2.212ms; driver.publication 2.175ms; driver.publication 1.168ms; driver.publication 1.049ms |
| 349ae9bbcae1ca2d0000000000000644 | 78.650 | 9.956 | 0.012 | 0.000 | 0.113 | 12.198 | 10.065 | 3.591 | 0.000 | 0.246 | 42.399 | n/a | n/a | 0.069 | 10.081 | 0.128 | 0.069 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 3.759ms; driver.publication 1.168ms; driver.publication 1.049ms |
| 349ae9bbcae1ca2d000000000000070d | 69.334 | 9.061 | 0.009 | 0.000 | 0.402 | 12.485 | 13.829 | 0.066 | 0.000 | 0.305 | 33.111 | n/a | n/a | 0.067 | 9.471 | 0.137 | 0.067 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.266ms; driver.publication 1.158ms; driver.publication 1.052ms |
| 349ae9bbcae1ca2d0000000000000649 | 66.450 | 2.812 | 0.006 | 0.000 | 0.104 | 3.316 | 1.310 | 0.028 | 0.000 | 0.322 | 58.515 | n/a | n/a | 0.036 | 2.922 | 0.044 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 4.153ms; driver.expected-state.add-commit 2.212ms; driver.publication 1.034ms; driver.expected-state.bind-receipt 1.007ms |
| 349ae9bbcae1ca2d00000000000007d5 | 65.748 | 2.710 | 0.003 | 0.000 | 1.554 | 1.739 | 1.823 | 1.070 | 0.000 | 0.184 | 56.631 | n/a | n/a | 0.034 | 4.267 | 0.065 | 0.034 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 1.635ms; driver.publication 1.107ms; driver.expected-state.bind-receipt 1.094ms; driver.publication 1.083ms; driver.publication 1.036ms |
| 349ae9bbcae1ca2d0000000000000b37 | 65.644 | 6.897 | 2.154 | 1.507 | 15.705 | 21.038 | 0.537 | 7.000 | 0.000 | 0.021 | 10.767 | n/a | n/a | 0.018 | 26.264 | 0.400 | 0.018 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.385ms; driver.publication 1.167ms; driver.publication 1.091ms |
| 349ae9bbcae1ca2d000000000000064a | 61.927 | 7.412 | 0.013 | 0.000 | 1.270 | 4.394 | 2.784 | 0.056 | 0.000 | 0.254 | 45.686 | n/a | n/a | 0.059 | 8.695 | 0.140 | 0.059 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 4.153ms; driver.expected-state.add-commit 2.212ms; driver.publication 1.275ms; driver.publication 1.034ms; driver.expected-state.bind-receipt 1.007ms |
| 349ae9bbcae1ca2d00000000000006de | 61.442 | 3.745 | 0.006 | 0.000 | 0.143 | 46.552 | 1.006 | 0.039 | 0.000 | 0.176 | 9.738 | n/a | n/a | 0.036 | 3.894 | 0.063 | 0.036 | node-14/thread-0/socket.wait-first-byte | none observed |
| 349ae9bbcae1ca2d000000000000073f | 60.660 | 2.396 | 0.004 | 0.000 | 22.924 | 5.675 | 1.226 | 9.273 | 0.000 | 0.513 | 18.619 | n/a | n/a | 0.029 | 25.324 | 0.417 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication 1.185ms; driver.publication 1.108ms; driver.publication 1.066ms |
| 349ae9bbcae1ca2d0000000000000b3c | 58.160 | 3.552 | 0.006 | 0.000 | 38.752 | 8.230 | 1.204 | 0.082 | 0.000 | 0.337 | 5.960 | n/a | n/a | 0.037 | 42.310 | 0.727 | 0.037 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.385ms; driver.publication 1.167ms; driver.publication 1.091ms |
| 349ae9bbcae1ca2d0000000000000b38 | 57.249 | 3.421 | 0.002 | 0.000 | 23.256 | 13.061 | 1.247 | 3.032 | 0.000 | 0.040 | 13.143 | n/a | n/a | 0.047 | 26.679 | 0.466 | 0.047 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 1.091ms |
| 349ae9bbcae1ca2d00000000000007d6 | 56.522 | 2.298 | 0.005 | 0.000 | 1.058 | 3.918 | 0.792 | 0.028 | 0.000 | 2.072 | 46.310 | n/a | n/a | 0.042 | 3.362 | 0.059 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.635ms; driver.publication 1.107ms; driver.expected-state.bind-receipt 1.094ms; driver.publication 1.083ms; driver.publication 1.068ms |
| 349ae9bbcae1ca2d0000000000000b39 | 56.370 | 8.357 | 2.052 | 1.507 | 2.346 | 20.896 | 0.575 | 7.882 | 0.000 | 0.016 | 12.706 | n/a | n/a | 0.031 | 14.263 | 0.253 | 0.031 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.385ms; driver.publication 1.167ms; driver.publication 1.091ms |
| 349ae9bbcae1ca2d00000000000007d7 | 55.577 | 2.511 | 0.005 | 0.000 | 36.364 | 5.094 | 0.815 | 0.026 | 0.000 | 0.183 | 10.557 | n/a | n/a | 0.022 | 38.881 | 0.700 | 0.022 | node-14/thread-0/driver.queue.subject | driver.publication 1.635ms; driver.publication 1.107ms; driver.expected-state.bind-receipt 1.094ms; driver.publication 1.083ms; driver.publication 1.068ms |
| 349ae9bbcae1ca2d000000000000061e | 54.394 | 7.265 | 0.030 | 0.000 | 0.641 | 12.196 | 1.629 | 0.032 | 0.000 | 0.542 | 31.992 | n/a | n/a | 0.066 | 7.936 | 0.146 | 0.066 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.840ms; driver.publication 1.106ms |

## P2 / L1024 / commit / 5-10 facts (493 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.525 | 0.607 | 0.000 | 1.475 | 3.130 | 0.006 | 0.000 | 0.798 | 0.776 | 0.989 | 0.029 | 0.000 | 0.256 | 6.648 | n/a | n/a | 0.039 | 4.085 | 0.303 | 0.039 |
| p99 | 65.644 | 2.067 | 2.184 | 4.354 | 8.499 | 1.646 | 0.000 | 22.924 | 13.061 | 7.186 | 4.845 | 0.000 | 4.207 | 33.111 | n/a | n/a | 0.113 | 26.264 | 0.661 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d0000000000000b32 | 102.094 | 3.926 | 0.008 | 0.000 | 18.372 | 66.897 | 1.198 | 0.041 | 0.000 | 0.208 | 11.409 | n/a | n/a | 0.037 | 22.305 | 0.218 | 0.037 | node-14/thread-0/socket.wait-first-byte | client.parse 1.411ms |
| 349ae9bbcae1ca2d000000000000070d | 69.334 | 9.061 | 0.009 | 0.000 | 0.402 | 12.485 | 13.829 | 0.066 | 0.000 | 0.305 | 33.111 | n/a | n/a | 0.067 | 9.471 | 0.137 | 0.067 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.266ms; driver.publication 1.158ms; driver.publication 1.052ms |
| 349ae9bbcae1ca2d0000000000000649 | 66.450 | 2.812 | 0.006 | 0.000 | 0.104 | 3.316 | 1.310 | 0.028 | 0.000 | 0.322 | 58.515 | n/a | n/a | 0.036 | 2.922 | 0.044 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 4.153ms; driver.expected-state.add-commit 2.212ms; driver.publication 1.034ms; driver.expected-state.bind-receipt 1.007ms |
| 349ae9bbcae1ca2d00000000000007d5 | 65.748 | 2.710 | 0.003 | 0.000 | 1.554 | 1.739 | 1.823 | 1.070 | 0.000 | 0.184 | 56.631 | n/a | n/a | 0.034 | 4.267 | 0.065 | 0.034 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 1.635ms; driver.publication 1.107ms; driver.expected-state.bind-receipt 1.094ms; driver.publication 1.083ms; driver.publication 1.036ms |
| 349ae9bbcae1ca2d0000000000000b37 | 65.644 | 6.897 | 2.154 | 1.507 | 15.705 | 21.038 | 0.537 | 7.000 | 0.000 | 0.021 | 10.767 | n/a | n/a | 0.018 | 26.264 | 0.400 | 0.018 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.385ms; driver.publication 1.167ms; driver.publication 1.091ms |
| 349ae9bbcae1ca2d000000000000064a | 61.927 | 7.412 | 0.013 | 0.000 | 1.270 | 4.394 | 2.784 | 0.056 | 0.000 | 0.254 | 45.686 | n/a | n/a | 0.059 | 8.695 | 0.140 | 0.059 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 4.153ms; driver.expected-state.add-commit 2.212ms; driver.publication 1.275ms; driver.publication 1.034ms; driver.expected-state.bind-receipt 1.007ms |
| 349ae9bbcae1ca2d000000000000073f | 60.660 | 2.396 | 0.004 | 0.000 | 22.924 | 5.675 | 1.226 | 9.273 | 0.000 | 0.513 | 18.619 | n/a | n/a | 0.029 | 25.324 | 0.417 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication 1.185ms; driver.publication 1.108ms; driver.publication 1.066ms |
| 349ae9bbcae1ca2d0000000000000b3c | 58.160 | 3.552 | 0.006 | 0.000 | 38.752 | 8.230 | 1.204 | 0.082 | 0.000 | 0.337 | 5.960 | n/a | n/a | 0.037 | 42.310 | 0.727 | 0.037 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.385ms; driver.publication 1.167ms; driver.publication 1.091ms |
| 349ae9bbcae1ca2d0000000000000b38 | 57.249 | 3.421 | 0.002 | 0.000 | 23.256 | 13.061 | 1.247 | 3.032 | 0.000 | 0.040 | 13.143 | n/a | n/a | 0.047 | 26.679 | 0.466 | 0.047 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 1.091ms |
| 349ae9bbcae1ca2d00000000000007d6 | 56.522 | 2.298 | 0.005 | 0.000 | 1.058 | 3.918 | 0.792 | 0.028 | 0.000 | 2.072 | 46.310 | n/a | n/a | 0.042 | 3.362 | 0.059 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.635ms; driver.publication 1.107ms; driver.expected-state.bind-receipt 1.094ms; driver.publication 1.083ms; driver.publication 1.068ms |
| 349ae9bbcae1ca2d000000000000064e | 46.224 | 4.289 | 6.580 | 0.000 | 10.934 | 6.946 | 0.976 | 2.077 | 0.000 | 0.822 | 13.547 | n/a | n/a | 0.052 | 21.803 | 0.472 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 4.153ms; driver.expected-state.add-commit 2.212ms; driver.publication 1.275ms; driver.publication 1.229ms; driver.publication 1.048ms |
| 349ae9bbcae1ca2d0000000000000b4c | 45.527 | 2.687 | 0.004 | 0.000 | 25.020 | 6.622 | 0.702 | 0.024 | 0.000 | 0.080 | 10.360 | n/a | n/a | 0.028 | 27.711 | 0.609 | 0.028 | node-14/thread-0/driver.queue.subject | driver.publication 3.017ms; driver.publication 1.302ms; driver.publication 1.220ms; driver.publication 1.037ms |
| 349ae9bbcae1ca2d0000000000000867 | 44.156 | 4.587 | 1.646 | 0.000 | 9.278 | 8.890 | 1.010 | 4.845 | 0.000 | 0.026 | 13.854 | n/a | n/a | 0.019 | 15.512 | 0.351 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 3.068ms; driver.publication 1.257ms; driver.expected-state.bind-receipt 1.156ms; driver.publication 1.085ms; driver.publication 1.023ms |
| 349ae9bbcae1ca2d0000000000000863 | 42.968 | 3.266 | 0.010 | 0.000 | 24.844 | 2.076 | 1.397 | 0.069 | 0.000 | 0.275 | 10.992 | n/a | n/a | 0.039 | 28.120 | 0.654 | 0.039 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 349ae9bbcae1ca2d0000000000000740 | 41.694 | 3.597 | 0.008 | 0.000 | 12.840 | 1.765 | 4.098 | 0.032 | 0.000 | 0.177 | 19.120 | n/a | n/a | 0.056 | 16.446 | 0.394 | 0.056 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.185ms; driver.publication 1.108ms |
| 349ae9bbcae1ca2d0000000000000747 | 41.657 | 2.918 | 0.006 | 0.000 | 0.427 | 9.188 | 1.447 | 8.143 | 0.000 | 0.345 | 19.143 | n/a | n/a | 0.040 | 3.352 | 0.080 | 0.040 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 1.361ms; driver.publication 1.066ms; driver.publication 1.046ms |
| 349ae9bbcae1ca2d0000000000000868 | 40.420 | 5.810 | 0.002 | 0.000 | 5.370 | 12.357 | 0.756 | 0.778 | 0.000 | 0.028 | 15.296 | n/a | n/a | 0.023 | 11.182 | 0.277 | 0.023 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 3.068ms; driver.publication 1.394ms; driver.publication 1.257ms; driver.expected-state.bind-receipt 1.156ms; driver.publication 1.085ms |
| 349ae9bbcae1ca2d0000000000000864 | 39.815 | 3.955 | 1.213 | 0.000 | 14.227 | 7.331 | 0.637 | 0.018 | 0.000 | 1.102 | 11.309 | n/a | n/a | 0.025 | 19.394 | 0.487 | 0.025 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.023ms |
| 349ae9bbcae1ca2d00000000000007c3 | 39.699 | 4.732 | 0.085 | 0.000 | 2.760 | 8.316 | 1.368 | 0.051 | 0.000 | 0.311 | 22.048 | n/a | n/a | 0.029 | 7.577 | 0.191 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 2.897ms; driver.publication 1.586ms; driver.publication 1.257ms |
| 349ae9bbcae1ca2d00000000000006a1 | 37.965 | 2.024 | 0.004 | 0.000 | 20.848 | 2.571 | 0.822 | 0.025 | 0.000 | 0.375 | 11.270 | n/a | n/a | 0.027 | 22.876 | 0.603 | 0.027 | node-14/thread-0/driver.queue.subject | driver.publication 1.316ms; driver.publication 1.208ms; driver.publication 1.094ms |

## P2 / tail / commit (2617 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.305 | 0.791 | 0.000 | 1.627 | 3.668 | 0.006 | 0.000 | 0.754 | 0.724 | 1.183 | 0.031 | 0.000 | 0.190 | 6.373 | n/a | n/a | 0.035 | 4.737 | 0.335 | 0.035 |
| p99 | 111.798 | 3.049 | 2.567 | 5.797 | 11.317 | 1.283 | 0.000 | 35.992 | 47.084 | 9.582 | 5.873 | 0.000 | 4.045 | 40.242 | n/a | n/a | 0.099 | 42.118 | 0.729 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d0000000000001a52 | 265.364 | 4.416 | 0.005 | 0.000 | 23.794 | 187.297 | 2.358 | 40.365 | 0.000 | 0.040 | 7.045 | n/a | n/a | 0.043 | 28.215 | 0.106 | 0.043 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 3.382ms; client.parse 3.090ms; driver.publication 2.408ms; driver.publication 2.344ms; driver.publication 1.998ms |
| 349ae9bbcae1ca2d000000000000190b | 244.962 | 8.117 | 16.339 | 0.000 | 0.665 | 104.206 | 20.238 | 40.024 | 0.000 | 4.720 | 50.587 | n/a | n/a | 0.066 | 25.120 | 0.103 | 0.066 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.881ms; driver.publication 2.409ms; client.parse 2.171ms; driver.publication 1.910ms; driver.publication 1.730ms |
| 349ae9bbcae1ca2d00000000000014be | 219.638 | 4.565 | 0.007 | 0.000 | 127.347 | 68.996 | 1.324 | 0.064 | 0.000 | 1.668 | 15.624 | n/a | n/a | 0.043 | 131.919 | 0.601 | 0.043 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.124ms; client.parse 1.810ms; driver.publication 1.023ms |
| 349ae9bbcae1ca2d00000000000014c7 | 207.409 | 28.347 | 0.756 | 3.895 | 13.215 | 75.032 | 2.861 | 60.357 | 0.000 | 5.162 | 17.764 | n/a | n/a | 0.021 | 46.213 | 0.223 | 0.021 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.963ms; driver.expected-state.add-commit 2.418ms; driver.expected-state.bind-receipt 1.947ms; driver.expected-state.bind-receipt 1.685ms; driver.publication 1.527ms |
| 349ae9bbcae1ca2d0000000000001918 | 191.762 | 6.961 | 0.008 | 0.000 | 161.045 | 3.435 | 8.838 | 7.829 | 0.000 | 0.167 | 3.405 | n/a | n/a | 0.073 | 168.014 | 0.876 | 0.073 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 6.881ms; driver.expected-state.bind-receipt 2.147ms; driver.publication 1.910ms; driver.publication 1.730ms; driver.expected-state.bind-receipt 1.569ms |
| 349ae9bbcae1ca2d00000000000014bc | 177.790 | 5.971 | 0.012 | 0.000 | 0.749 | 129.758 | 0.847 | 0.036 | 0.000 | 0.115 | 40.242 | n/a | n/a | 0.060 | 6.731 | 0.038 | 0.060 | node-14/thread-0/socket.wait-first-byte | client.parse 2.464ms; driver.expected-state.bind-receipt 0.205ms |
| 349ae9bbcae1ca2d00000000000014bf | 175.902 | 5.689 | 0.006 | 0.000 | 98.132 | 47.084 | 4.590 | 0.025 | 0.000 | 1.991 | 18.346 | n/a | n/a | 0.039 | 103.827 | 0.590 | 0.039 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.124ms |
| 349ae9bbcae1ca2d0000000000001917 | 162.434 | 8.230 | 2.559 | 0.000 | 115.875 | 6.029 | 10.876 | 0.030 | 0.000 | 0.076 | 18.704 | n/a | n/a | 0.056 | 126.663 | 0.780 | 0.056 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 6.881ms; driver.publication 1.910ms; driver.publication 1.730ms; driver.expected-state.bind-receipt 1.569ms; driver.publication 1.408ms |
| 349ae9bbcae1ca2d00000000000014c0 | 156.822 | 4.725 | 0.979 | 0.000 | 62.796 | 62.230 | 8.301 | 0.025 | 0.000 | 0.141 | 17.599 | n/a | n/a | 0.027 | 68.500 | 0.437 | 0.027 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.124ms; driver.publication 1.527ms; driver.publication 1.023ms |
| 349ae9bbcae1ca2d0000000000001913 | 149.388 | 3.264 | 0.007 | 0.000 | 0.448 | 125.263 | 1.765 | 0.052 | 0.000 | 0.279 | 18.263 | n/a | n/a | 0.046 | 3.718 | 0.025 | 0.046 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.881ms; client.parse 2.171ms; driver.publication 1.730ms |
| 349ae9bbcae1ca2d00000000000014c1 | 148.734 | 4.430 | 0.963 | 0.000 | 52.066 | 64.293 | 3.159 | 6.142 | 0.000 | 0.606 | 17.042 | n/a | n/a | 0.032 | 57.460 | 0.386 | 0.032 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.124ms; driver.publication 1.527ms; driver.publication 1.275ms; driver.publication 1.023ms |
| 349ae9bbcae1ca2d0000000000001912 | 148.020 | 4.451 | 0.007 | 0.000 | 2.098 | 97.529 | 1.375 | 0.046 | 0.000 | 0.158 | 42.318 | n/a | n/a | 0.037 | 6.556 | 0.044 | 0.037 | node-14/thread-0/socket.wait-first-byte | client.parse 2.171ms; driver.publication 0.683ms |
| 349ae9bbcae1ca2d0000000000001a74 | 145.754 | 6.494 | 0.012 | 0.000 | 95.542 | 0.623 | 0.969 | 0.029 | 0.000 | 0.417 | 41.604 | n/a | n/a | 0.062 | 102.049 | 0.700 | 0.062 | node-14/thread-0/driver.queue.subject | driver.publication 2.408ms; driver.publication 2.053ms; driver.publication 1.536ms; driver.publication 1.275ms; driver.publication 1.239ms |
| 349ae9bbcae1ca2d0000000000001916 | 145.238 | 7.952 | 0.009 | 0.000 | 96.039 | 2.522 | 2.892 | 0.077 | 0.000 | 8.464 | 27.210 | n/a | n/a | 0.073 | 104.000 | 0.716 | 0.073 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 6.881ms; driver.publication 1.730ms; driver.publication 1.184ms |
| 349ae9bbcae1ca2d00000000000014c2 | 142.672 | 4.615 | 1.127 | 0.000 | 47.505 | 68.607 | 0.948 | 3.935 | 0.000 | 0.443 | 15.477 | n/a | n/a | 0.016 | 53.247 | 0.373 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.124ms; driver.publication 1.527ms; driver.publication 1.275ms; driver.publication 1.023ms |
| 349ae9bbcae1ca2d0000000000000d5f | 142.451 | 3.910 | 0.005 | 0.000 | 59.144 | 8.896 | 18.315 | 0.160 | 0.000 | 1.110 | 50.867 | n/a | n/a | 0.044 | 63.059 | 0.443 | 0.044 | node-14/thread-0/driver.queue.subject | driver.publication 9.294ms; driver.publication 4.474ms; driver.publication 4.043ms; driver.publication 3.364ms; driver.publication 2.593ms |
| 349ae9bbcae1ca2d00000000000014e4 | 142.053 | 4.386 | 0.009 | 0.000 | 130.563 | 0.622 | 0.857 | 0.030 | 0.000 | 0.406 | 5.116 | n/a | n/a | 0.064 | 134.957 | 0.950 | 0.064 | node-14/thread-0/driver.queue.subject | driver.publication 1.510ms; driver.publication 1.354ms; driver.publication 1.325ms; driver.publication 1.291ms; driver.publication 1.221ms |
| 349ae9bbcae1ca2d0000000000001a72 | 138.670 | 5.740 | 0.009 | 0.000 | 114.649 | 7.508 | 1.638 | 0.040 | 0.000 | 3.341 | 5.698 | n/a | n/a | 0.046 | 120.399 | 0.868 | 0.046 | node-14/thread-0/driver.queue.scheduler-late | client.parse 3.090ms; driver.publication 2.408ms; driver.publication 2.053ms; driver.publication 1.536ms; driver.publication 1.239ms |
| 349ae9bbcae1ca2d00000000000014e2 | 133.777 | 12.603 | 0.013 | 0.000 | 0.458 | 49.612 | 3.611 | 1.580 | 0.000 | 0.995 | 64.861 | n/a | n/a | 0.044 | 13.074 | 0.098 | 0.044 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.510ms; driver.publication 1.354ms; driver.publication 1.291ms; driver.publication 1.221ms; driver.publication 1.121ms |
| 349ae9bbcae1ca2d0000000000001914 | 133.488 | 9.990 | 0.014 | 0.000 | 1.155 | 108.881 | 0.925 | 0.098 | 0.000 | 3.787 | 8.582 | n/a | n/a | 0.056 | 11.159 | 0.084 | 0.056 | node-14/thread-0/socket.wait-first-byte | client.parse 2.171ms; driver.publication 1.730ms |

## P2 / tail / commit / 5-10 facts (1555 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.851 | 0.653 | 0.000 | 1.479 | 3.202 | 0.006 | 0.000 | 0.772 | 0.691 | 0.982 | 0.030 | 0.000 | 0.193 | 6.037 | n/a | n/a | 0.035 | 4.196 | 0.325 | 0.035 |
| p99 | 106.799 | 2.240 | 2.296 | 5.556 | 9.839 | 0.979 | 0.000 | 34.480 | 50.680 | 5.311 | 5.873 | 0.000 | 4.049 | 37.643 | n/a | n/a | 0.099 | 39.111 | 0.725 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 349ae9bbcae1ca2d000000000000190b | 244.962 | 8.117 | 16.339 | 0.000 | 0.665 | 104.206 | 20.238 | 40.024 | 0.000 | 4.720 | 50.587 | n/a | n/a | 0.066 | 25.120 | 0.103 | 0.066 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.881ms; driver.publication 2.409ms; client.parse 2.171ms; driver.publication 1.910ms; driver.publication 1.730ms |
| 349ae9bbcae1ca2d00000000000014be | 219.638 | 4.565 | 0.007 | 0.000 | 127.347 | 68.996 | 1.324 | 0.064 | 0.000 | 1.668 | 15.624 | n/a | n/a | 0.043 | 131.919 | 0.601 | 0.043 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.124ms; client.parse 1.810ms; driver.publication 1.023ms |
| 349ae9bbcae1ca2d00000000000014bc | 177.790 | 5.971 | 0.012 | 0.000 | 0.749 | 129.758 | 0.847 | 0.036 | 0.000 | 0.115 | 40.242 | n/a | n/a | 0.060 | 6.731 | 0.038 | 0.060 | node-14/thread-0/socket.wait-first-byte | client.parse 2.464ms; driver.expected-state.bind-receipt 0.205ms |
| 349ae9bbcae1ca2d00000000000014c0 | 156.822 | 4.725 | 0.979 | 0.000 | 62.796 | 62.230 | 8.301 | 0.025 | 0.000 | 0.141 | 17.599 | n/a | n/a | 0.027 | 68.500 | 0.437 | 0.027 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.124ms; driver.publication 1.527ms; driver.publication 1.023ms |
| 349ae9bbcae1ca2d0000000000001913 | 149.388 | 3.264 | 0.007 | 0.000 | 0.448 | 125.263 | 1.765 | 0.052 | 0.000 | 0.279 | 18.263 | n/a | n/a | 0.046 | 3.718 | 0.025 | 0.046 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.881ms; client.parse 2.171ms; driver.publication 1.730ms |
| 349ae9bbcae1ca2d00000000000014c1 | 148.734 | 4.430 | 0.963 | 0.000 | 52.066 | 64.293 | 3.159 | 6.142 | 0.000 | 0.606 | 17.042 | n/a | n/a | 0.032 | 57.460 | 0.386 | 0.032 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.124ms; driver.publication 1.527ms; driver.publication 1.275ms; driver.publication 1.023ms |
| 349ae9bbcae1ca2d0000000000001912 | 148.020 | 4.451 | 0.007 | 0.000 | 2.098 | 97.529 | 1.375 | 0.046 | 0.000 | 0.158 | 42.318 | n/a | n/a | 0.037 | 6.556 | 0.044 | 0.037 | node-14/thread-0/socket.wait-first-byte | client.parse 2.171ms; driver.publication 0.683ms |
| 349ae9bbcae1ca2d00000000000014c2 | 142.672 | 4.615 | 1.127 | 0.000 | 47.505 | 68.607 | 0.948 | 3.935 | 0.000 | 0.443 | 15.477 | n/a | n/a | 0.016 | 53.247 | 0.373 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.124ms; driver.publication 1.527ms; driver.publication 1.275ms; driver.publication 1.023ms |
| 349ae9bbcae1ca2d00000000000014e4 | 142.053 | 4.386 | 0.009 | 0.000 | 130.563 | 0.622 | 0.857 | 0.030 | 0.000 | 0.406 | 5.116 | n/a | n/a | 0.064 | 134.957 | 0.950 | 0.064 | node-14/thread-0/driver.queue.subject | driver.publication 1.510ms; driver.publication 1.354ms; driver.publication 1.325ms; driver.publication 1.291ms; driver.publication 1.221ms |
| 349ae9bbcae1ca2d00000000000014e2 | 133.777 | 12.603 | 0.013 | 0.000 | 0.458 | 49.612 | 3.611 | 1.580 | 0.000 | 0.995 | 64.861 | n/a | n/a | 0.044 | 13.074 | 0.098 | 0.044 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.510ms; driver.publication 1.354ms; driver.publication 1.291ms; driver.publication 1.221ms; driver.publication 1.121ms |
| 349ae9bbcae1ca2d0000000000001914 | 133.488 | 9.990 | 0.014 | 0.000 | 1.155 | 108.881 | 0.925 | 0.098 | 0.000 | 3.787 | 8.582 | n/a | n/a | 0.056 | 11.159 | 0.084 | 0.056 | node-14/thread-0/socket.wait-first-byte | client.parse 2.171ms; driver.publication 1.730ms |
| 349ae9bbcae1ca2d0000000000001915 | 127.853 | 2.840 | 0.008 | 0.000 | 0.190 | 102.687 | 2.230 | 8.344 | 0.000 | 0.098 | 11.423 | n/a | n/a | 0.033 | 3.037 | 0.024 | 0.033 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.881ms; client.parse 2.171ms; driver.publication 1.730ms; driver.publication 1.184ms |
| 349ae9bbcae1ca2d0000000000001a71 | 124.882 | 2.898 | 0.007 | 0.000 | 62.909 | 52.039 | 0.962 | 0.026 | 0.000 | 1.089 | 4.918 | n/a | n/a | 0.034 | 65.814 | 0.527 | 0.034 | node-14/thread-0/driver.queue.scheduler-late | client.parse 3.090ms; driver.publication 2.408ms; driver.publication 1.536ms; driver.publication 1.239ms; client.parse 1.224ms |
| 349ae9bbcae1ca2d0000000000002071 | 121.447 | 3.660 | 0.006 | 0.000 | 49.042 | 50.680 | 0.856 | 0.034 | 0.000 | 0.112 | 17.007 | n/a | n/a | 0.050 | 52.708 | 0.434 | 0.050 | node-14/thread-0/socket.wait-first-byte | driver.publication 16.364ms; driver.publication 1.115ms |
| 349ae9bbcae1ca2d0000000000001a6b | 118.119 | 3.329 | 0.010 | 0.000 | 33.488 | 67.412 | 1.132 | 0.046 | 0.000 | 3.054 | 9.608 | n/a | n/a | 0.040 | 36.827 | 0.312 | 0.040 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 3.382ms; client.parse 3.090ms; driver.publication 1.808ms; client.parse 1.224ms; driver.publication 1.214ms |
| 349ae9bbcae1ca2d0000000000001dde | 106.799 | 3.501 | 0.009 | 0.000 | 2.084 | 0.666 | 4.535 | 0.044 | 0.000 | 0.551 | 95.366 | n/a | n/a | 0.044 | 5.594 | 0.052 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 349ae9bbcae1ca2d000000000000191a | 105.171 | 3.361 | 8.426 | 0.000 | 60.217 | 4.543 | 1.325 | 1.553 | 0.000 | 0.036 | 25.674 | n/a | n/a | 0.034 | 72.005 | 0.685 | 0.034 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 6.881ms; driver.publication 1.910ms; driver.publication 1.730ms; driver.expected-state.bind-receipt 1.569ms; driver.publication 1.408ms |
| 349ae9bbcae1ca2d0000000000002074 | 102.823 | 5.188 | 0.006 | 0.000 | 8.639 | 63.103 | 2.039 | 14.048 | 0.000 | 0.083 | 9.678 | n/a | n/a | 0.039 | 13.833 | 0.135 | 0.039 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.284ms; driver.publication 1.115ms; driver.publication 0.635ms |
| 349ae9bbcae1ca2d0000000000001f28 | 93.248 | 3.513 | 0.006 | 0.000 | 21.908 | 59.827 | 0.789 | 0.029 | 0.000 | 0.122 | 7.019 | n/a | n/a | 0.036 | 25.427 | 0.273 | 0.036 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.031ms |
| 349ae9bbcae1ca2d00000000000014c6 | 93.189 | 12.961 | 1.354 | 3.895 | 23.908 | 21.587 | 2.722 | 0.016 | 0.000 | 0.047 | 26.663 | n/a | n/a | 0.037 | 42.118 | 0.452 | 0.037 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.expected-state.add-commit 2.418ms; driver.expected-state.bind-receipt 1.947ms; driver.publication 1.527ms; driver.publication 1.275ms; driver.publication 1.201ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.306 | n/a | n/a | n/a | 0.052 | n/a | 0.000 | 0.000 | 0.881 | 200.531 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.160 | 0.052 | 0.000 | 0.160 |
| p99 | 203.832 | n/a | n/a | n/a | 24.306 | n/a | 1.416 | 0.000 | 5.343 | 202.199 | 0.108 | 15.764 | 0.221 | 0.000 | n/a | n/a | 0.280 | 24.306 | 0.320 | 0.280 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1f61223a684379750000000000000006 | 203.832 | 0.106 | n/a | 0.000 | 0.000 | 1.181 | 202.199 | 0.028 | 0.000 | 0.221 | 0.000 | n/a | n/a | 0.096 | 0.106 | 0.001 | 0.096 | gw-r/thread-52/journal/page | none observed |
| 1f61223a684379750000000000000007 | 202.478 | 0.042 | n/a | 0.000 | 0.000 | 0.817 | 201.267 | 0.019 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.160 | 0.042 | 0.000 | 0.160 | gw-r/thread-56/journal/page | none observed |
| 1f61223a684379750000000000000005 | 202.316 | 0.048 | n/a | 0.000 | 0.000 | 0.896 | 201.046 | 0.017 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.178 | 0.048 | 0.000 | 0.178 | gw-r/thread-71/journal/page | none observed |
| 1f61223a684379750000000000000f08 | 201.438 | 0.052 | n/a | 0.000 | 0.000 | 0.716 | 200.531 | 0.003 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.096 | 0.052 | 0.000 | 0.096 | gw-r/thread-55/journal/page | none observed |
| 1f61223a684379750000000000000f06 | 201.393 | 0.032 | n/a | 0.000 | 0.000 | 0.471 | 200.780 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.065 | 0.032 | 0.000 | 0.065 | gw-r/thread-55/journal/page | none observed |
| 1f61223a684379750000000000000f07 | 201.306 | 0.036 | n/a | 0.000 | 0.000 | 0.472 | 200.687 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.067 | 0.036 | 0.000 | 0.067 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b20000000000000002 | 149.354 | 1.160 | n/a | 0.000 | 0.000 | 1.016 | 131.010 | 0.108 | 15.764 | 0.081 | 0.000 | n/a | n/a | 0.215 | 1.160 | 0.008 | 0.215 | gw-r/thread-52/gateway.admitted-work | none observed |
| 1f61223a684379750000000000000f0b | 79.279 | 17.984 | n/a | 1.416 | 0.000 | 3.425 | 56.264 | 0.003 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.185 | 19.399 | 0.245 | 0.185 | gw-r/thread-51/gateway.admitted-work | none observed |
| 1f61223a684379750000000000000f0c | 75.853 | 24.306 | n/a | 0.000 | 0.000 | 5.343 | 45.938 | 0.004 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.256 | 24.306 | 0.320 | 0.256 | gw-r/thread-56/gateway.admitted-work | none observed |
| 1f61223a684379750000000000000f0d | 71.312 | 18.979 | n/a | 1.135 | 0.000 | 0.881 | 50.028 | 0.004 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.280 | 20.113 | 0.282 | 0.280 | gw-r/thread-51/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 806.593 | n/a | n/a | n/a | 0.252 | n/a | 0.000 | 0.000 | 1.192 | 786.042 | 0.012 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.233 | 0.252 | 0.000 | 0.233 |
| p99 | 1006.193 | n/a | n/a | n/a | 18.992 | n/a | 0.000 | 0.000 | 1.957 | 1002.222 | 0.029 | 0.000 | 0.438 | 0.000 | n/a | n/a | 1.295 | 18.992 | 0.024 | 1.295 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10d93c6de8c356b200000000000000a4 | 1006.193 | 0.252 | n/a | 0.000 | 0.000 | 1.957 | 1002.222 | 0.029 | 0.000 | 0.438 | 0.000 | n/a | n/a | 1.295 | 0.252 | 0.000 | 1.295 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b200000000000000a5 | 806.593 | 18.992 | n/a | 0.000 | 0.000 | 1.192 | 786.042 | 0.012 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.233 | 18.992 | 0.024 | 0.233 | gw-r/thread-71/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 449.721 | n/a | n/a | n/a | 2.947 | n/a | 0.000 | 0.000 | 0.827 | 445.955 | 0.013 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.094 | 2.947 | 0.008 | 0.094 |
| p99 | 1020.747 | n/a | n/a | n/a | 6.260 | n/a | 0.914 | 0.000 | 19.680 | 1001.145 | 0.427 | 0.000 | 0.371 | 0.000 | n/a | n/a | 1.255 | 6.260 | 0.251 | 1.255 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10d93c6de8c356b200000000000000d0 | 1020.747 | 4.140 | n/a | 0.914 | 0.000 | 19.680 | 995.842 | 0.012 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.094 | 5.054 | 0.005 | 0.094 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b200000000000000bb | 1005.319 | 0.176 | n/a | 0.000 | 0.000 | 2.580 | 1001.145 | 0.012 | 0.000 | 0.152 | 0.000 | n/a | n/a | 1.255 | 0.176 | 0.000 | 1.255 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b200000000000000b4 | 998.194 | 2.838 | n/a | 0.000 | 0.000 | 2.066 | 993.110 | 0.016 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.087 | 2.838 | 0.003 | 0.087 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b200000000000000ba | 980.208 | 4.194 | n/a | 0.000 | 0.000 | 1.063 | 974.777 | 0.010 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.098 | 4.194 | 0.004 | 0.098 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b200000000000000ae | 951.266 | 3.852 | n/a | 0.000 | 0.000 | 0.827 | 946.264 | 0.040 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.157 | 3.852 | 0.004 | 0.157 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b200000000000000ab | 778.601 | 2.737 | n/a | 0.000 | 0.000 | 4.502 | 771.141 | 0.012 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.096 | 2.737 | 0.004 | 0.096 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b200000000000000b2 | 738.560 | 2.325 | n/a | 0.000 | 0.000 | 0.658 | 735.408 | 0.013 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.074 | 2.325 | 0.003 | 0.074 | gw-r/thread-53/journal/page | none observed |
| 10d93c6de8c356b200000000000000c2 | 716.575 | 5.601 | n/a | 0.000 | 0.000 | 0.552 | 710.222 | 0.023 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.115 | 5.601 | 0.008 | 0.115 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b200000000000000a8 | 709.823 | 1.921 | n/a | 0.000 | 0.000 | 1.201 | 706.432 | 0.019 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.103 | 1.921 | 0.003 | 0.103 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b200000000000000c9 | 691.193 | 2.253 | n/a | 0.000 | 0.000 | 0.813 | 687.255 | 0.427 | 0.000 | 0.371 | 0.000 | n/a | n/a | 0.074 | 2.253 | 0.003 | 0.074 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b200000000000000c1 | 653.074 | 2.420 | n/a | 0.000 | 0.000 | 0.787 | 649.693 | 0.010 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.087 | 2.420 | 0.004 | 0.087 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b200000000000000c7 | 647.295 | 2.446 | n/a | 0.000 | 0.000 | 0.484 | 644.090 | 0.080 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.069 | 2.446 | 0.004 | 0.069 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b200000000000000cb | 573.560 | 4.304 | n/a | 0.000 | 0.000 | 0.577 | 568.455 | 0.011 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.143 | 4.304 | 0.008 | 0.143 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b200000000000000a7 | 489.727 | 5.521 | n/a | 0.000 | 0.000 | 0.564 | 482.968 | 0.011 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.569 | 5.521 | 0.011 | 0.569 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b200000000000000b6 | 449.721 | 2.798 | n/a | 0.000 | 0.000 | 0.716 | 445.955 | 0.029 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.080 | 2.798 | 0.006 | 0.080 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b200000000000000b8 | 409.322 | 5.079 | n/a | 0.000 | 0.000 | 3.626 | 400.326 | 0.011 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.182 | 5.079 | 0.012 | 0.182 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b200000000000000c3 | 330.574 | 4.872 | n/a | 0.000 | 0.000 | 1.361 | 324.132 | 0.013 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.077 | 4.872 | 0.015 | 0.077 | gw-r/thread-54/journal/page | none observed |
| 10d93c6de8c356b200000000000000c5 | 313.494 | 1.971 | n/a | 0.000 | 0.000 | 0.425 | 310.938 | 0.013 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.068 | 1.971 | 0.006 | 0.068 | gw-r/thread-54/journal/page | none observed |
| 10d93c6de8c356b200000000000000c8 | 313.160 | 2.403 | n/a | 0.000 | 0.000 | 2.713 | 307.525 | 0.378 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.073 | 2.403 | 0.008 | 0.073 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b200000000000000cc | 270.875 | 1.983 | n/a | 0.000 | 0.000 | 1.181 | 267.522 | 0.013 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.086 | 1.983 | 0.007 | 0.086 | gw-r/thread-49/journal/page | none observed |

## P3 / L1 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 444.056 | n/a | n/a | n/a | 4.017 | n/a | 0.570 | 0.000 | 0.705 | 438.232 | 0.012 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.097 | 4.778 | 0.014 | 0.097 |
| p99 | 1010.720 | n/a | n/a | n/a | 12.142 | n/a | 1.603 | 0.000 | 3.602 | 1003.790 | 2.691 | 13.521 | 0.596 | 0.000 | n/a | n/a | 0.260 | 13.395 | 0.530 | 0.260 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10d93c6de8c356b20000000000000100 | 1010.720 | 5.244 | n/a | 0.649 | 0.000 | 0.784 | 1003.790 | 0.009 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.120 | 5.893 | 0.006 | 0.120 | gw-r/thread-52/journal/page | none observed |
| 10d93c6de8c356b200000000000000d2 | 1009.106 | 8.120 | n/a | 1.603 | 0.000 | 0.853 | 998.199 | 0.012 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.243 | 9.722 | 0.010 | 0.243 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b200000000000000d8 | 1005.255 | 3.090 | n/a | 0.661 | 0.000 | 0.584 | 1000.657 | 0.075 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.097 | 3.751 | 0.004 | 0.097 | gw-r/thread-54/journal/page | none observed |
| 10d93c6de8c356b2000000000000010c | 1002.377 | 5.211 | n/a | 0.000 | 0.000 | 0.896 | 996.146 | 0.009 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.063 | 5.211 | 0.005 | 0.063 | gw-r/thread-54/journal/page | none observed |
| 10d93c6de8c356b200000000000000de | 1001.776 | 5.033 | n/a | 0.570 | 0.000 | 0.421 | 995.439 | 0.013 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.224 | 5.603 | 0.006 | 0.224 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b20000000000000104 | 997.235 | 2.775 | n/a | 0.000 | 0.000 | 0.757 | 992.588 | 0.777 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.260 | 2.775 | 0.003 | 0.260 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b200000000000000dd | 990.192 | 3.481 | n/a | 0.467 | 0.000 | 0.879 | 984.990 | 0.200 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.078 | 3.948 | 0.004 | 0.078 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b200000000000000d1 | 982.984 | 5.128 | n/a | 0.859 | 0.000 | 1.751 | 974.878 | 0.026 | 0.000 | 0.201 | 0.000 | n/a | n/a | 0.140 | 5.988 | 0.006 | 0.140 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b200000000000000d9 | 981.584 | 3.567 | n/a | 0.586 | 0.000 | 0.613 | 976.612 | 0.011 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.121 | 4.153 | 0.004 | 0.121 | gw-r/thread-54/journal/page | none observed |
| 10d93c6de8c356b200000000000000fd | 909.744 | 6.012 | n/a | 0.524 | 0.000 | 0.556 | 902.458 | 0.010 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.136 | 6.536 | 0.007 | 0.136 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b200000000000000e4 | 880.161 | 3.014 | n/a | 0.456 | 0.000 | 0.594 | 875.899 | 0.009 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.130 | 3.470 | 0.004 | 0.130 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b200000000000000df | 735.160 | 8.684 | n/a | 0.646 | 0.000 | 1.142 | 724.411 | 0.013 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.208 | 9.330 | 0.013 | 0.208 | gw-r/thread-52/journal/page | none observed |
| 10d93c6de8c356b20000000000000101 | 700.188 | 3.020 | n/a | 0.000 | 0.000 | 0.920 | 696.081 | 0.016 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.083 | 3.020 | 0.004 | 0.083 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b200000000000000ea | 581.268 | 2.589 | n/a | 0.000 | 0.000 | 0.407 | 578.115 | 0.009 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.090 | 2.589 | 0.004 | 0.090 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b200000000000000e7 | 578.606 | 10.946 | n/a | 1.134 | 0.000 | 0.850 | 565.485 | 0.017 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.104 | 12.080 | 0.021 | 0.104 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b200000000000000dc | 550.466 | 3.164 | n/a | 0.574 | 0.000 | 0.629 | 545.945 | 0.009 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.087 | 3.738 | 0.007 | 0.087 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b200000000000000fa | 504.560 | 10.587 | n/a | 0.588 | 0.000 | 0.586 | 492.539 | 0.008 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.187 | 11.176 | 0.022 | 0.187 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b200000000000000fb | 485.472 | 3.383 | n/a | 0.000 | 0.000 | 0.928 | 481.010 | 0.010 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.070 | 3.383 | 0.007 | 0.070 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b200000000000000da | 473.084 | 5.530 | n/a | 0.873 | 0.000 | 1.929 | 464.537 | 0.010 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.115 | 6.402 | 0.014 | 0.115 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000000107 | 461.410 | 12.142 | n/a | 1.253 | 0.000 | 0.594 | 446.216 | 0.578 | 0.000 | 0.470 | 0.000 | n/a | n/a | 0.159 | 13.395 | 0.029 | 0.159 | gw-r/thread-52/journal/page | none observed |

## P3 / L4 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 450.716 | n/a | n/a | n/a | 3.265 | n/a | 0.000 | 0.000 | 0.702 | 447.769 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.083 | 3.392 | 0.009 | 0.083 |
| p99 | 1006.944 | n/a | n/a | n/a | 9.421 | n/a | 1.202 | 0.000 | 3.246 | 1002.930 | 0.607 | 0.000 | 0.092 | 0.000 | n/a | n/a | 1.117 | 10.174 | 0.669 | 1.117 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10d93c6de8c356b2000000000000012a | 1006.944 | 6.338 | n/a | 0.000 | 0.000 | 0.977 | 999.408 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.174 | 6.338 | 0.006 | 0.174 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b20000000000000140 | 1004.957 | 0.126 | n/a | 0.000 | 0.000 | 0.638 | 1002.930 | 0.059 | 0.000 | 0.092 | 0.000 | n/a | n/a | 1.112 | 0.126 | 0.000 | 1.112 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b20000000000000113 | 1003.000 | 0.116 | n/a | 0.000 | 0.000 | 0.928 | 1000.768 | 0.007 | 0.000 | 0.064 | 0.000 | n/a | n/a | 1.117 | 0.116 | 0.000 | 1.117 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b20000000000000136 | 1002.628 | 0.119 | n/a | 0.000 | 0.000 | 0.615 | 1000.710 | 0.020 | 0.000 | 0.055 | 0.000 | n/a | n/a | 1.109 | 0.119 | 0.000 | 1.109 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000000125 | 996.709 | 2.392 | n/a | 0.000 | 0.000 | 1.353 | 992.864 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.059 | 2.392 | 0.002 | 0.059 | gw-r/thread-52/journal/page | none observed |
| 10d93c6de8c356b2000000000000011c | 991.742 | 2.926 | n/a | 0.000 | 0.000 | 0.534 | 988.129 | 0.010 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.068 | 2.926 | 0.003 | 0.068 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000000129 | 958.215 | 2.872 | n/a | 0.000 | 0.000 | 1.380 | 953.848 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.075 | 2.872 | 0.003 | 0.075 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000000148 | 826.420 | 3.516 | n/a | 0.000 | 0.000 | 0.725 | 821.917 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.210 | 3.516 | 0.004 | 0.210 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b20000000000000131 | 778.327 | 3.925 | n/a | 0.000 | 0.000 | 1.313 | 772.797 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.226 | 3.925 | 0.005 | 0.226 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b2000000000000013c | 769.420 | 1.673 | n/a | 0.000 | 0.000 | 0.659 | 766.977 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.055 | 1.673 | 0.002 | 0.055 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b20000000000000123 | 755.929 | 3.313 | n/a | 0.000 | 0.000 | 0.626 | 751.730 | 0.148 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.070 | 3.313 | 0.004 | 0.070 | gw-r/thread-54/journal/page | none observed |
| 10d93c6de8c356b20000000000000110 | 754.352 | 2.086 | n/a | 0.000 | 0.000 | 1.957 | 749.607 | 0.607 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.057 | 2.086 | 0.003 | 0.057 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b2000000000000012c | 716.646 | 2.581 | n/a | 0.000 | 0.000 | 0.431 | 713.524 | 0.007 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.062 | 2.581 | 0.004 | 0.062 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b20000000000000126 | 683.109 | 8.370 | n/a | 1.202 | 0.000 | 0.702 | 672.708 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.073 | 9.572 | 0.014 | 0.073 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b2000000000000011d | 664.909 | 2.088 | n/a | 0.000 | 0.000 | 0.720 | 661.969 | 0.006 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.062 | 2.088 | 0.003 | 0.062 | gw-r/thread-53/journal/page | none observed |
| 10d93c6de8c356b20000000000000133 | 611.492 | 3.634 | n/a | 0.000 | 0.000 | 2.823 | 604.906 | 0.014 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.080 | 3.634 | 0.006 | 0.080 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b2000000000000010d | 607.991 | 4.651 | n/a | 0.658 | 0.000 | 0.488 | 601.388 | 0.489 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.247 | 5.309 | 0.009 | 0.247 | gw-r/thread-54/journal/page | none observed |
| 10d93c6de8c356b20000000000000142 | 541.568 | 4.217 | n/a | 0.000 | 0.000 | 1.236 | 536.001 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.068 | 4.217 | 0.008 | 0.068 | gw-r/thread-53/journal/page | none observed |
| 10d93c6de8c356b2000000000000013a | 504.728 | 6.405 | n/a | 0.000 | 0.000 | 0.779 | 497.278 | 0.028 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.166 | 6.405 | 0.013 | 0.166 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b20000000000000138 | 490.568 | 8.512 | n/a | 0.610 | 0.000 | 0.384 | 480.894 | 0.010 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.093 | 9.122 | 0.019 | 0.093 | gw-r/thread-71/journal/page | none observed |

## P3 / L16 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 363.484 | n/a | n/a | n/a | 3.087 | n/a | 0.000 | 0.000 | 0.705 | 359.832 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.066 | 3.087 | 0.007 | 0.066 |
| p99 | 1018.669 | n/a | n/a | n/a | 10.408 | n/a | 1.183 | 0.000 | 5.309 | 1001.094 | 0.941 | 13.955 | 0.090 | 0.000 | n/a | n/a | 1.117 | 11.590 | 0.681 | 1.117 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10d93c6de8c356b20000000000000185 | 1018.669 | 2.687 | n/a | 0.000 | 0.000 | 0.833 | 1001.094 | 0.005 | 13.955 | 0.037 | 0.000 | n/a | n/a | 0.057 | 2.687 | 0.003 | 0.057 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b20000000000000164 | 1002.693 | 0.124 | n/a | 0.000 | 0.000 | 0.598 | 1000.775 | 0.006 | 0.000 | 0.073 | 0.000 | n/a | n/a | 1.117 | 0.124 | 0.000 | 1.117 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b2000000000000016e | 1002.427 | 2.927 | n/a | 0.000 | 0.000 | 0.797 | 998.593 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.069 | 2.927 | 0.003 | 0.069 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b2000000000000017e | 1002.000 | 2.573 | n/a | 0.000 | 0.000 | 0.522 | 998.790 | 0.010 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.059 | 2.573 | 0.003 | 0.059 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b20000000000000174 | 997.730 | 2.551 | n/a | 0.000 | 0.000 | 0.573 | 994.492 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.064 | 2.551 | 0.003 | 0.064 | gw-r/thread-53/journal/page | none observed |
| 10d93c6de8c356b20000000000000154 | 994.466 | 3.375 | n/a | 0.000 | 0.000 | 0.860 | 990.093 | 0.005 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.075 | 3.375 | 0.003 | 0.075 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b20000000000000184 | 985.215 | 2.469 | n/a | 0.000 | 0.000 | 0.723 | 981.906 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.072 | 2.469 | 0.003 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 10d93c6de8c356b20000000000000179 | 873.480 | 2.405 | n/a | 0.000 | 0.000 | 0.617 | 870.351 | 0.008 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.057 | 2.405 | 0.003 | 0.057 | gw-r/thread-52/journal/page | none observed |
| 10d93c6de8c356b20000000000000159 | 826.414 | 6.091 | n/a | 0.000 | 0.000 | 0.772 | 819.332 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.178 | 6.091 | 0.007 | 0.178 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b20000000000000182 | 727.866 | 5.052 | n/a | 0.000 | 0.000 | 0.893 | 721.794 | 0.017 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.065 | 5.052 | 0.007 | 0.065 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b2000000000000016d | 713.293 | 3.870 | n/a | 0.000 | 0.000 | 0.380 | 708.329 | 0.532 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.129 | 3.870 | 0.005 | 0.129 | gw-r/thread-52/journal/page | none observed |
| 10d93c6de8c356b20000000000000187 | 689.538 | 4.391 | n/a | 0.000 | 0.000 | 0.774 | 684.267 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.067 | 4.391 | 0.006 | 0.067 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b20000000000000155 | 665.922 | 2.063 | n/a | 0.000 | 0.000 | 5.309 | 658.448 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.061 | 2.063 | 0.003 | 0.061 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b20000000000000176 | 664.377 | 3.494 | n/a | 0.000 | 0.000 | 0.888 | 659.887 | 0.007 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.061 | 3.494 | 0.005 | 0.061 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b2000000000000017c | 661.724 | 3.087 | n/a | 0.000 | 0.000 | 0.540 | 657.971 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.095 | 3.087 | 0.005 | 0.095 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000000170 | 626.303 | 2.521 | n/a | 0.000 | 0.000 | 0.745 | 622.720 | 0.199 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.056 | 2.521 | 0.004 | 0.056 | gw-r/thread-52/journal/page | none observed |
| 10d93c6de8c356b20000000000000167 | 512.833 | 3.465 | n/a | 0.000 | 0.000 | 0.891 | 508.336 | 0.007 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.077 | 3.465 | 0.007 | 0.077 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b2000000000000014f | 499.112 | 2.123 | n/a | 0.000 | 0.000 | 0.614 | 496.237 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.079 | 2.123 | 0.004 | 0.079 | gw-r/thread-52/journal/page | none observed |
| 10d93c6de8c356b20000000000000152 | 474.186 | 3.194 | n/a | 0.000 | 0.000 | 0.634 | 470.219 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.097 | 3.194 | 0.007 | 0.097 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000000166 | 469.938 | 10.408 | n/a | 1.183 | 0.000 | 0.732 | 457.235 | 0.210 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.124 | 11.590 | 0.025 | 0.124 | gw-r/thread-53/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 326.536 | n/a | n/a | n/a | 3.444 | n/a | 0.000 | 0.000 | 0.634 | 321.637 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.070 | 3.444 | 0.011 | 0.070 |
| p99 | 1006.161 | n/a | n/a | n/a | 10.951 | n/a | 0.771 | 0.000 | 3.167 | 1001.197 | 1.686 | 0.000 | 0.154 | 0.000 | n/a | n/a | 1.131 | 11.722 | 0.706 | 1.131 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10d93c6de8c356b200000000000001c3 | 1006.161 | 5.670 | n/a | 0.000 | 0.000 | 3.167 | 996.985 | 0.107 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.166 | 5.670 | 0.006 | 0.166 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b200000000000001a5 | 1003.179 | 0.128 | n/a | 0.000 | 0.000 | 0.637 | 1001.197 | 0.010 | 0.000 | 0.076 | 0.000 | n/a | n/a | 1.131 | 0.128 | 0.000 | 1.131 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b200000000000001a4 | 1001.008 | 2.715 | n/a | 0.631 | 0.000 | 0.611 | 996.739 | 0.151 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.093 | 3.345 | 0.003 | 0.093 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b200000000000001c2 | 992.000 | 2.504 | n/a | 0.000 | 0.000 | 0.476 | 988.914 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.067 | 2.504 | 0.003 | 0.067 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b200000000000001a3 | 985.843 | 3.516 | n/a | 0.000 | 0.000 | 0.586 | 981.599 | 0.012 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.066 | 3.516 | 0.004 | 0.066 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000000189 | 975.241 | 2.705 | n/a | 0.674 | 0.000 | 0.550 | 971.187 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.095 | 3.379 | 0.003 | 0.095 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b20000000000000198 | 941.022 | 1.696 | n/a | 0.000 | 0.000 | 0.529 | 938.665 | 0.016 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.059 | 1.696 | 0.002 | 0.059 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b200000000000001c0 | 880.404 | 4.050 | n/a | 0.000 | 0.000 | 0.654 | 875.571 | 0.009 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.069 | 4.050 | 0.005 | 0.069 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b2000000000000019b | 799.337 | 5.688 | n/a | 0.000 | 0.000 | 2.210 | 790.923 | 0.387 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.075 | 5.688 | 0.007 | 0.075 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b200000000000001b4 | 751.119 | 3.842 | n/a | 0.000 | 0.000 | 0.586 | 746.536 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.121 | 3.842 | 0.005 | 0.121 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b200000000000001d3 | 661.929 | 1.618 | n/a | 0.000 | 0.000 | 0.494 | 659.706 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.062 | 1.618 | 0.002 | 0.062 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b200000000000001cd | 654.370 | 4.898 | n/a | 0.000 | 0.000 | 0.804 | 648.440 | 0.008 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.167 | 4.898 | 0.007 | 0.167 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b200000000000001b8 | 588.096 | 3.161 | n/a | 0.000 | 0.000 | 0.634 | 584.048 | 0.135 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.065 | 3.161 | 0.005 | 0.065 | gw-r/thread-53/journal/page | none observed |
| 10d93c6de8c356b20000000000000197 | 558.206 | 3.444 | n/a | 0.000 | 0.000 | 0.556 | 554.088 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.080 | 3.444 | 0.006 | 0.080 | gw-r/thread-53/journal/page | none observed |
| 10d93c6de8c356b200000000000001cf | 546.888 | 3.138 | n/a | 0.000 | 0.000 | 0.567 | 543.030 | 0.014 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.087 | 3.138 | 0.006 | 0.087 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b2000000000000019e | 546.805 | 5.187 | n/a | 0.648 | 0.000 | 0.890 | 539.914 | 0.005 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.104 | 5.835 | 0.011 | 0.104 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b200000000000001c4 | 537.714 | 4.310 | n/a | 0.000 | 0.000 | 1.117 | 532.005 | 0.120 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.077 | 4.310 | 0.008 | 0.077 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b200000000000001a7 | 477.566 | 3.649 | n/a | 0.000 | 0.000 | 0.782 | 472.983 | 0.005 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.080 | 3.649 | 0.008 | 0.080 | gw-r/thread-52/journal/page | none observed |
| 10d93c6de8c356b200000000000001ae | 473.079 | 5.296 | n/a | 0.634 | 0.000 | 1.147 | 465.756 | 0.006 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.121 | 5.930 | 0.013 | 0.121 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b2000000000000019f | 436.268 | 2.719 | n/a | 0.000 | 0.000 | 0.833 | 432.577 | 0.013 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.070 | 2.719 | 0.006 | 0.070 | gw-r/thread-53/journal/page | none observed |

## P3 / L256 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 436.225 | n/a | n/a | n/a | 2.954 | n/a | 0.000 | 0.000 | 0.628 | 433.659 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.071 | 2.954 | 0.007 | 0.071 |
| p99 | 1006.577 | n/a | n/a | n/a | 19.805 | n/a | 0.841 | 0.000 | 4.891 | 1001.225 | 2.331 | 8.152 | 0.166 | 0.000 | n/a | n/a | 1.179 | 19.805 | 0.345 | 1.179 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10d93c6de8c356b200000000000001e8 | 1006.577 | 4.271 | n/a | 0.000 | 0.000 | 0.783 | 1001.225 | 0.013 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.118 | 4.271 | 0.004 | 0.118 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000000214 | 1003.013 | 0.200 | n/a | 0.000 | 0.000 | 0.727 | 1000.824 | 0.006 | 0.000 | 0.077 | 0.000 | n/a | n/a | 1.179 | 0.200 | 0.000 | 1.179 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b20000000000000216 | 1001.391 | 4.074 | n/a | 0.000 | 0.000 | 0.698 | 996.496 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.077 | 4.074 | 0.004 | 0.077 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b200000000000001fc | 995.322 | 3.665 | n/a | 0.000 | 0.000 | 0.640 | 990.887 | 0.005 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.073 | 3.665 | 0.004 | 0.073 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000000205 | 994.286 | 2.277 | n/a | 0.000 | 0.000 | 0.534 | 991.375 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.063 | 2.277 | 0.002 | 0.063 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b2000000000000020f | 989.402 | 2.140 | n/a | 0.000 | 0.000 | 0.493 | 986.498 | 0.172 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.059 | 2.140 | 0.002 | 0.059 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b20000000000000213 | 982.943 | 2.591 | n/a | 0.000 | 0.000 | 0.550 | 979.690 | 0.004 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.057 | 2.591 | 0.003 | 0.057 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000000210 | 938.448 | 9.078 | n/a | 0.841 | 0.000 | 0.615 | 927.704 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.156 | 9.918 | 0.011 | 0.156 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b200000000000001f5 | 902.159 | 3.296 | n/a | 0.000 | 0.000 | 0.762 | 897.973 | 0.005 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.067 | 3.296 | 0.004 | 0.067 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b200000000000001f3 | 779.440 | 2.734 | n/a | 0.000 | 0.000 | 0.451 | 776.098 | 0.005 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.074 | 2.734 | 0.004 | 0.074 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b200000000000001e7 | 749.377 | 2.338 | n/a | 0.000 | 0.000 | 0.581 | 746.340 | 0.015 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.075 | 2.338 | 0.003 | 0.075 | gw-r/thread-53/journal/page | none observed |
| 10d93c6de8c356b200000000000001fd | 716.054 | 2.903 | n/a | 0.000 | 0.000 | 2.698 | 710.195 | 0.103 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.073 | 2.903 | 0.004 | 0.073 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000000200 | 659.981 | 3.827 | n/a | 0.000 | 0.000 | 0.481 | 655.521 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.100 | 3.827 | 0.006 | 0.100 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b200000000000001ee | 624.346 | 3.867 | n/a | 0.000 | 0.000 | 0.628 | 619.665 | 0.004 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.140 | 3.867 | 0.006 | 0.140 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b200000000000001db | 609.755 | 4.495 | n/a | 0.000 | 0.000 | 0.831 | 604.297 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.078 | 4.495 | 0.007 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b2000000000000020d | 592.667 | 3.166 | n/a | 0.000 | 0.000 | 0.611 | 588.760 | 0.005 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.057 | 3.166 | 0.005 | 0.057 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b200000000000001ec | 570.463 | 2.651 | n/a | 0.000 | 0.000 | 0.502 | 559.059 | 0.004 | 8.152 | 0.030 | 0.000 | n/a | n/a | 0.065 | 2.651 | 0.005 | 0.065 | gw-r/thread-52/journal/page | none observed |
| 10d93c6de8c356b200000000000001d8 | 531.057 | 2.179 | n/a | 0.000 | 0.000 | 0.376 | 528.366 | 0.017 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.058 | 2.179 | 0.004 | 0.058 | gw-r/thread-53/journal/page | none observed |
| 10d93c6de8c356b200000000000001da | 494.439 | 3.116 | n/a | 0.000 | 0.000 | 0.834 | 490.371 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.073 | 3.116 | 0.006 | 0.073 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b200000000000001df | 459.724 | 4.899 | n/a | 0.000 | 0.000 | 1.309 | 453.380 | 0.008 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.066 | 4.899 | 0.011 | 0.066 | gw-r/thread-56/journal/page | none observed |

## P3 / L1024 / internal (755 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.034 | n/a | n/a | n/a | 3.306 | n/a | 0.000 | 0.000 | 0.557 | 8.821 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.079 | 3.306 | 0.263 | 0.079 |
| p99 | 224.448 | n/a | n/a | n/a | 13.708 | n/a | 1.007 | 0.000 | 5.116 | 221.313 | 1.030 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.874 | 14.379 | 0.817 | 0.874 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10d93c6de8c356b20000000000000222 | 1002.643 | 3.449 | n/a | 0.000 | 0.000 | 0.722 | 998.360 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.066 | 3.449 | 0.003 | 0.066 | gw-r/thread-53/journal/page | none observed |
| 10d93c6de8c356b20000000000000217 | 774.211 | 1.712 | n/a | 0.000 | 0.000 | 0.405 | 771.988 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.066 | 1.712 | 0.002 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b20000000000000223 | 754.765 | 2.052 | n/a | 0.000 | 0.000 | 1.152 | 751.437 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.073 | 2.052 | 0.003 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 10d93c6de8c356b2000000000000021f | 670.402 | 4.705 | n/a | 0.000 | 0.000 | 0.732 | 664.799 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.120 | 4.705 | 0.007 | 0.120 | gw-r/thread-52/journal/page | none observed |
| 10d93c6de8c356b2000000000000021a | 618.721 | 2.717 | n/a | 0.000 | 0.000 | 0.389 | 615.517 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.061 | 2.717 | 0.004 | 0.061 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b20000000000000220 | 342.723 | 2.243 | n/a | 0.000 | 0.000 | 0.807 | 337.499 | 2.050 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.070 | 2.243 | 0.007 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b2000000000000021b | 249.430 | 2.382 | n/a | 0.000 | 0.000 | 0.530 | 246.410 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.059 | 2.382 | 0.010 | 0.059 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b20000000000000218 | 224.448 | 2.438 | n/a | 0.000 | 0.000 | 0.582 | 221.313 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.070 | 2.438 | 0.011 | 0.070 | gw-r/thread-53/journal/page | none observed |
| 10d93c6de8c356b2000000000000021d | 121.700 | 2.725 | n/a | 0.000 | 0.000 | 0.563 | 118.092 | 0.190 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.067 | 2.725 | 0.022 | 0.067 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b200000000000004e7 | 109.700 | 5.112 | n/a | 0.000 | 0.000 | 0.319 | 103.794 | 0.354 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.084 | 5.112 | 0.047 | 0.084 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000000312 | 95.787 | 2.750 | n/a | 0.000 | 0.000 | 0.546 | 92.384 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.066 | 2.750 | 0.029 | 0.066 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b20000000000000796 | 93.196 | 2.176 | n/a | 0.000 | 0.000 | 0.683 | 90.117 | 0.106 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.092 | 2.176 | 0.023 | 0.092 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b200000000000002f4 | 89.646 | 6.339 | n/a | 0.000 | 0.000 | 0.551 | 82.646 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.082 | 6.339 | 0.071 | 0.082 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b20000000000000752 | 88.835 | 3.607 | n/a | 0.000 | 0.000 | 0.373 | 84.750 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.095 | 3.607 | 0.041 | 0.095 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b20000000000000663 | 88.087 | 5.692 | n/a | 1.900 | 0.000 | 0.351 | 80.005 | 0.030 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.096 | 7.592 | 0.086 | 0.096 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b200000000000005ec | 86.636 | 4.847 | n/a | 0.000 | 0.000 | 0.684 | 80.999 | 0.002 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.092 | 4.847 | 0.056 | 0.092 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b20000000000000634 | 84.608 | 8.717 | n/a | 0.000 | 0.000 | 0.699 | 74.928 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.220 | 8.717 | 0.103 | 0.220 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b2000000000000046c | 82.479 | 3.251 | n/a | 0.000 | 0.000 | 1.279 | 77.830 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.077 | 3.251 | 0.039 | 0.077 | gw-r/thread-53/journal/page | none observed |
| 10d93c6de8c356b20000000000000783 | 81.844 | 9.476 | n/a | 0.000 | 0.000 | 0.373 | 71.636 | 0.014 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.264 | 9.476 | 0.116 | 0.264 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000000760 | 80.899 | 7.218 | n/a | 0.000 | 0.000 | 0.429 | 73.004 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.224 | 7.218 | 0.089 | 0.224 | gw-r/thread-56/journal/page | none observed |

## P3 / tail / internal (2217 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.153 | n/a | n/a | n/a | 4.382 | n/a | 0.000 | 0.000 | 0.540 | 7.631 | 0.004 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.102 | 4.418 | 0.346 | 0.102 |
| p99 | 348.672 | n/a | n/a | n/a | 20.093 | n/a | 1.759 | 0.000 | 4.536 | 344.572 | 0.589 | 0.000 | 0.096 | 0.000 | n/a | n/a | 1.501 | 21.806 | 0.845 | 1.501 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10d93c6de8c356b20000000000001a89 | 1004.973 | 4.896 | n/a | 0.000 | 0.000 | 0.598 | 999.392 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.053 | 4.896 | 0.005 | 0.053 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b20000000000001a4f | 1003.687 | 2.759 | n/a | 0.000 | 0.000 | 3.465 | 997.341 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.063 | 2.759 | 0.003 | 0.063 | gw-r/thread-52/journal/page | none observed |
| 10d93c6de8c356b20000000000001a46 | 1002.962 | 2.540 | n/a | 0.000 | 0.000 | 0.325 | 1000.013 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.054 | 2.540 | 0.003 | 0.054 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000001a91 | 1002.102 | 0.104 | n/a | 0.000 | 0.000 | 0.371 | 1000.464 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 1.129 | 0.104 | 0.000 | 1.129 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000001a45 | 997.749 | 5.727 | n/a | 0.000 | 0.000 | 1.387 | 990.497 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.107 | 5.727 | 0.006 | 0.107 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000001a68 | 994.004 | 2.351 | n/a | 0.000 | 0.000 | 0.521 | 991.037 | 0.009 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.050 | 2.351 | 0.002 | 0.050 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b20000000000001a8d | 976.261 | 6.433 | n/a | 1.841 | 0.000 | 1.125 | 966.719 | 0.003 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.117 | 8.274 | 0.008 | 0.117 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b20000000000001a6b | 874.874 | 2.848 | n/a | 0.000 | 0.000 | 0.443 | 871.451 | 0.018 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.088 | 2.848 | 0.003 | 0.088 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b20000000000001a59 | 869.260 | 5.958 | n/a | 0.000 | 0.000 | 0.708 | 862.327 | 0.100 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.140 | 5.958 | 0.007 | 0.140 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b20000000000001a4a | 835.087 | 6.725 | n/a | 0.000 | 0.000 | 0.528 | 827.593 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.200 | 6.725 | 0.008 | 0.200 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b20000000000001a47 | 773.970 | 7.660 | n/a | 0.000 | 0.000 | 0.515 | 765.528 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.229 | 7.660 | 0.010 | 0.229 | gw-r/thread-51/journal/page | none observed |
| 10d93c6de8c356b20000000000001a64 | 711.239 | 2.516 | n/a | 0.000 | 0.000 | 0.311 | 708.208 | 0.101 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.068 | 2.516 | 0.004 | 0.068 | gw-r/thread-49/journal/page | none observed |
| 10d93c6de8c356b20000000000001a5f | 683.981 | 5.997 | n/a | 0.000 | 0.000 | 0.376 | 677.276 | 0.167 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.143 | 5.997 | 0.009 | 0.143 | gw-r/thread-56/journal/page | none observed |
| 10d93c6de8c356b20000000000001a8a | 667.245 | 2.086 | n/a | 0.000 | 0.000 | 0.479 | 664.596 | 0.003 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.063 | 2.086 | 0.003 | 0.063 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b20000000000001a82 | 612.622 | 3.051 | n/a | 0.000 | 0.000 | 0.406 | 609.058 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.080 | 3.051 | 0.005 | 0.080 | gw-r/thread-53/journal/page | none observed |
| 10d93c6de8c356b20000000000001a78 | 535.102 | 2.386 | n/a | 0.000 | 0.000 | 0.432 | 532.213 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.044 | 2.386 | 0.004 | 0.044 | gw-r/thread-55/journal/page | none observed |
| 10d93c6de8c356b20000000000001a50 | 504.455 | 2.017 | n/a | 0.000 | 0.000 | 0.392 | 501.964 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.057 | 2.017 | 0.004 | 0.057 | gw-r/thread-52/journal/page | none observed |
| 10d93c6de8c356b20000000000001a84 | 497.893 | 1.910 | n/a | 0.000 | 0.000 | 0.508 | 495.403 | 0.003 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.048 | 1.910 | 0.004 | 0.048 | gw-r/thread-71/journal/page | none observed |
| 10d93c6de8c356b20000000000001a6c | 481.204 | 8.938 | n/a | 0.000 | 0.000 | 0.572 | 471.143 | 0.096 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.424 | 8.938 | 0.019 | 0.424 | gw-r/thread-53/journal/page | none observed |
| 10d93c6de8c356b20000000000001a85 | 458.551 | 4.933 | n/a | 0.000 | 0.000 | 0.902 | 452.615 | 0.002 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.083 | 4.933 | 0.011 | 0.083 | gw-r/thread-53/journal/page | none observed |

## P3 / warmup / read (73 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.033 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.807 | 200.986 | 0.015 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.086 | 0.043 | 0.000 | 0.086 |
| p99 | 204.905 | n/a | n/a | n/a | 0.093 | n/a | 0.000 | 0.000 | 4.397 | 202.819 | 7.031 | 0.000 | 0.370 | 0.000 | n/a | n/a | 0.315 | 0.093 | 0.001 | 0.315 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1f61223a684379750000000000000022 | 204.905 | 0.070 | n/a | 0.000 | 0.000 | 1.712 | 202.778 | 0.043 | 0.000 | 0.178 | 0.000 | n/a | n/a | 0.124 | 0.070 | 0.000 | 0.124 | gw-r/thread-54/journal/page | none observed |
| 1f61223a68437975000000000000000d | 204.414 | 0.053 | n/a | 0.000 | 0.000 | 1.345 | 202.689 | 0.042 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.090 | 0.053 | 0.000 | 0.090 | gw-r/thread-55/journal/page | none observed |
| 1f61223a684379750000000000000028 | 204.346 | 0.040 | n/a | 0.000 | 0.000 | 1.240 | 202.819 | 0.017 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.089 | 0.040 | 0.000 | 0.089 | gw-r/thread-56/journal/page | none observed |
| 1f61223a684379750000000000000055 | 204.015 | 0.047 | n/a | 0.000 | 0.000 | 1.314 | 202.307 | 0.050 | 0.000 | 0.183 | 0.000 | n/a | n/a | 0.114 | 0.047 | 0.000 | 0.114 | gw-r/thread-55/journal/page | none observed |
| 1f61223a68437975000000000000003d | 203.529 | 0.031 | n/a | 0.000 | 0.000 | 0.872 | 202.326 | 0.026 | 0.000 | 0.202 | 0.000 | n/a | n/a | 0.071 | 0.031 | 0.000 | 0.071 | gw-r/thread-54/journal/page | none observed |
| 1f61223a684379750000000000000025 | 203.392 | 0.036 | n/a | 0.000 | 0.000 | 1.758 | 201.333 | 0.037 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.075 | 0.036 | 0.000 | 0.075 | gw-r/thread-53/journal/page | none observed |
| 1f61223a68437975000000000000000f | 203.310 | 0.039 | n/a | 0.000 | 0.000 | 0.969 | 201.822 | 0.031 | 0.000 | 0.370 | 0.000 | n/a | n/a | 0.080 | 0.039 | 0.000 | 0.080 | gw-r/thread-55/journal/page | none observed |
| 1f61223a68437975000000000000000a | 203.199 | 0.061 | n/a | 0.000 | 0.000 | 0.822 | 201.947 | 0.033 | 0.000 | 0.234 | 0.000 | n/a | n/a | 0.102 | 0.061 | 0.000 | 0.102 | gw-r/thread-51/journal/page | none observed |
| 1f61223a684379750000000000000023 | 203.198 | 0.034 | n/a | 0.000 | 0.000 | 1.848 | 201.123 | 0.014 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.078 | 0.034 | 0.000 | 0.078 | gw-r/thread-71/journal/page | none observed |
| 1f61223a684379750000000000000027 | 202.894 | 0.045 | n/a | 0.000 | 0.000 | 0.844 | 201.656 | 0.088 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.115 | 0.045 | 0.000 | 0.115 | gw-r/thread-52/journal/page | none observed |
| 1f61223a684379750000000000000053 | 202.743 | 0.057 | n/a | 0.000 | 0.000 | 0.765 | 201.552 | 0.016 | 0.000 | 0.267 | 0.000 | n/a | n/a | 0.086 | 0.057 | 0.000 | 0.086 | gw-r/thread-55/journal/page | none observed |
| 1f61223a68437975000000000000001f | 202.714 | 0.047 | n/a | 0.000 | 0.000 | 1.389 | 201.034 | 0.014 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.109 | 0.047 | 0.000 | 0.109 | gw-r/thread-51/journal/page | none observed |
| 1f61223a68437975000000000000000b | 202.708 | 0.091 | n/a | 0.000 | 0.000 | 1.072 | 201.076 | 0.017 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.292 | 0.091 | 0.000 | 0.292 | gw-r/thread-56/journal/page | none observed |
| 1f61223a684379750000000000000035 | 202.549 | 0.045 | n/a | 0.000 | 0.000 | 1.175 | 201.042 | 0.014 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.115 | 0.045 | 0.000 | 0.115 | gw-r/thread-56/journal/page | none observed |
| 1f61223a68437975000000000000001c | 202.474 | 0.033 | n/a | 0.000 | 0.000 | 0.886 | 201.279 | 0.015 | 0.000 | 0.179 | 0.000 | n/a | n/a | 0.080 | 0.033 | 0.000 | 0.080 | gw-r/thread-51/journal/page | none observed |
| 1f61223a684379750000000000000013 | 202.468 | 0.042 | n/a | 0.000 | 0.000 | 0.672 | 201.383 | 0.023 | 0.000 | 0.242 | 0.000 | n/a | n/a | 0.105 | 0.042 | 0.000 | 0.105 | gw-r/thread-55/journal/page | none observed |
| 1f61223a684379750000000000000014 | 202.457 | 0.044 | n/a | 0.000 | 0.000 | 0.971 | 201.161 | 0.015 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.099 | 0.044 | 0.000 | 0.099 | gw-r/thread-53/journal/page | none observed |
| 1f61223a684379750000000000000026 | 202.402 | 0.052 | n/a | 0.000 | 0.000 | 1.004 | 201.058 | 0.016 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.134 | 0.052 | 0.000 | 0.134 | gw-r/thread-56/journal/page | none observed |
| 1f61223a68437975000000000000002b | 202.393 | 0.030 | n/a | 0.000 | 0.000 | 0.658 | 201.372 | 0.102 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.067 | 0.030 | 0.000 | 0.067 | gw-r/thread-56/journal/page | none observed |
| 1f61223a684379750000000000000017 | 202.384 | 0.039 | n/a | 0.000 | 0.000 | 0.397 | 201.606 | 0.043 | 0.000 | 0.226 | 0.000 | n/a | n/a | 0.074 | 0.039 | 0.000 | 0.074 | gw-r/thread-56/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.880 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.711 | 200.884 | 0.013 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.081 | 0.040 | 0.000 | 0.081 |
| p99 | 209.406 | n/a | n/a | n/a | 0.073 | n/a | 0.000 | 0.000 | 2.464 | 208.005 | 4.178 | 0.000 | 2.449 | 0.000 | n/a | n/a | 0.165 | 0.073 | 0.001 | 0.165 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1f61223a684379750000000000000077 | 209.406 | 0.045 | n/a | 0.000 | 0.000 | 1.078 | 208.005 | 0.031 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.107 | 0.045 | 0.000 | 0.107 | gw-r/thread-54/journal/page | none observed |
| 1f61223a684379750000000000000069 | 204.325 | 0.037 | n/a | 0.000 | 0.000 | 0.650 | 203.390 | 0.011 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.075 | 0.037 | 0.000 | 0.075 | gw-r/thread-52/journal/page | none observed |
| 1f61223a684379750000000000000082 | 203.455 | 0.030 | n/a | 0.000 | 0.000 | 2.464 | 200.801 | 0.009 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.064 | 0.030 | 0.000 | 0.064 | gw-r/thread-52/journal/page | none observed |
| 1f61223a68437975000000000000006a | 202.928 | 0.040 | n/a | 0.000 | 0.000 | 1.149 | 201.451 | 0.016 | 0.000 | 0.187 | 0.000 | n/a | n/a | 0.084 | 0.040 | 0.000 | 0.084 | gw-r/thread-53/journal/page | none observed |
| 1f61223a684379750000000000000067 | 202.801 | 0.049 | n/a | 0.000 | 0.000 | 1.020 | 201.351 | 0.013 | 0.000 | 0.258 | 0.000 | n/a | n/a | 0.111 | 0.049 | 0.000 | 0.111 | gw-r/thread-52/journal/page | none observed |
| 1f61223a684379750000000000000087 | 202.718 | 0.044 | n/a | 0.000 | 0.000 | 0.848 | 201.547 | 0.018 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.109 | 0.044 | 0.000 | 0.109 | gw-r/thread-71/journal/page | none observed |
| 1f61223a684379750000000000000080 | 202.644 | 0.050 | n/a | 0.000 | 0.000 | 1.201 | 201.126 | 0.017 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.134 | 0.050 | 0.000 | 0.134 | gw-r/thread-52/journal/page | none observed |
| 1f61223a68437975000000000000005f | 202.604 | 0.035 | n/a | 0.000 | 0.000 | 0.639 | 201.654 | 0.040 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.073 | 0.035 | 0.000 | 0.073 | gw-r/thread-56/journal/page | none observed |
| 1f61223a6843797500000000000000c6 | 202.561 | 0.044 | n/a | 0.000 | 0.000 | 1.001 | 201.213 | 0.010 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.120 | 0.044 | 0.000 | 0.120 | gw-r/thread-51/journal/page | none observed |
| 1f61223a68437975000000000000009d | 202.538 | 0.034 | n/a | 0.000 | 0.000 | 0.750 | 201.450 | 0.015 | 0.000 | 0.202 | 0.000 | n/a | n/a | 0.088 | 0.034 | 0.000 | 0.088 | gw-r/thread-71/journal/page | none observed |
| 1f61223a68437975000000000000005d | 202.508 | 0.031 | n/a | 0.000 | 0.000 | 0.813 | 201.462 | 0.019 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-56/journal/page | none observed |
| 1f61223a684379750000000000000065 | 202.486 | 0.041 | n/a | 0.000 | 0.000 | 1.063 | 201.132 | 0.011 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.106 | 0.041 | 0.000 | 0.106 | gw-r/thread-52/journal/page | none observed |
| 1f61223a684379750000000000000073 | 202.456 | 0.043 | n/a | 0.000 | 0.000 | 0.986 | 201.137 | 0.016 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.117 | 0.043 | 0.000 | 0.117 | gw-r/thread-71/journal/page | none observed |
| 1f61223a684379750000000000000095 | 202.417 | 0.033 | n/a | 0.000 | 0.000 | 0.710 | 201.358 | 0.103 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.067 | 0.033 | 0.000 | 0.067 | gw-r/thread-54/journal/page | none observed |
| 1f61223a684379750000000000000074 | 202.410 | 0.042 | n/a | 0.000 | 0.000 | 0.817 | 201.240 | 0.017 | 0.000 | 0.205 | 0.000 | n/a | n/a | 0.089 | 0.042 | 0.000 | 0.089 | gw-r/thread-49/journal/page | none observed |
| 1f61223a6843797500000000000000b7 | 202.377 | 0.040 | n/a | 0.000 | 0.000 | 0.635 | 201.384 | 0.015 | 0.000 | 0.232 | 0.000 | n/a | n/a | 0.072 | 0.040 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 1f61223a684379750000000000000089 | 202.369 | 0.030 | n/a | 0.000 | 0.000 | 0.514 | 201.500 | 0.032 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.108 | 0.030 | 0.000 | 0.108 | gw-r/thread-71/journal/page | none observed |
| 1f61223a68437975000000000000005e | 202.325 | 0.039 | n/a | 0.000 | 0.000 | 0.757 | 201.174 | 0.019 | 0.000 | 0.231 | 0.000 | n/a | n/a | 0.105 | 0.039 | 0.000 | 0.105 | gw-r/thread-51/journal/page | none observed |
| 1f61223a684379750000000000000093 | 202.317 | 0.030 | n/a | 0.000 | 0.000 | 0.561 | 201.515 | 0.014 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.063 | 0.030 | 0.000 | 0.063 | gw-r/thread-54/journal/page | none observed |
| 1f61223a68437975000000000000006f | 202.310 | 0.040 | n/a | 0.000 | 0.000 | 0.899 | 201.153 | 0.011 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.092 | 0.040 | 0.000 | 0.092 | gw-r/thread-52/journal/page | none observed |

## P3 / L4 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.718 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.700 | 200.802 | 0.007 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.078 | 0.041 | 0.000 | 0.078 |
| p99 | 205.233 | n/a | n/a | n/a | 0.127 | n/a | 0.000 | 0.000 | 2.448 | 202.626 | 5.228 | 0.000 | 0.852 | 0.000 | n/a | n/a | 0.152 | 0.127 | 0.001 | 0.152 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1f61223a6843797500000000000000db | 205.233 | 0.027 | n/a | 0.000 | 0.000 | 2.448 | 202.626 | 0.010 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.057 | 0.027 | 0.000 | 0.057 | gw-r/thread-54/journal/page | none observed |
| 1f61223a6843797500000000000000d7 | 202.621 | 0.035 | n/a | 0.000 | 0.000 | 0.941 | 201.167 | 0.014 | 0.000 | 0.375 | 0.000 | n/a | n/a | 0.088 | 0.035 | 0.000 | 0.088 | gw-r/thread-56/journal/page | none observed |
| 1f61223a6843797500000000000000f0 | 202.578 | 0.029 | n/a | 0.000 | 0.000 | 0.839 | 201.516 | 0.010 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.073 | 0.029 | 0.000 | 0.073 | gw-r/thread-52/journal/page | none observed |
| 1f61223a6843797500000000000000d4 | 202.539 | 0.033 | n/a | 0.000 | 0.000 | 1.116 | 201.214 | 0.007 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.071 | 0.033 | 0.000 | 0.071 | gw-r/thread-53/journal/page | none observed |
| 1f61223a6843797500000000000000df | 202.530 | 0.042 | n/a | 0.000 | 0.000 | 0.783 | 201.467 | 0.011 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.096 | 0.042 | 0.000 | 0.096 | gw-r/thread-71/journal/page | none observed |
| 1f61223a684379750000000000000111 | 202.510 | 0.060 | n/a | 0.000 | 0.000 | 1.094 | 201.125 | 0.012 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.130 | 0.060 | 0.000 | 0.130 | gw-r/thread-53/journal/page | none observed |
| 1f61223a6843797500000000000000f9 | 202.447 | 0.031 | n/a | 0.000 | 0.000 | 0.908 | 201.314 | 0.010 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-53/journal/page | none observed |
| 1f61223a6843797500000000000000c9 | 202.413 | 0.041 | n/a | 0.000 | 0.000 | 0.710 | 201.380 | 0.012 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.108 | 0.041 | 0.000 | 0.108 | gw-r/thread-53/journal/page | none observed |
| 1f61223a6843797500000000000000e6 | 202.356 | 0.042 | n/a | 0.000 | 0.000 | 1.342 | 200.769 | 0.013 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.101 | 0.042 | 0.000 | 0.101 | gw-r/thread-71/journal/page | none observed |
| 1f61223a684379750000000000000121 | 202.276 | 0.057 | n/a | 0.000 | 0.000 | 0.912 | 201.074 | 0.032 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.133 | 0.057 | 0.000 | 0.133 | gw-r/thread-55/journal/page | none observed |
| 1f61223a6843797500000000000000d0 | 202.273 | 0.030 | n/a | 0.000 | 0.000 | 0.724 | 201.272 | 0.010 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.073 | 0.030 | 0.000 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 1f61223a68437975000000000000010c | 202.271 | 0.033 | n/a | 0.000 | 0.000 | 0.626 | 201.419 | 0.011 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.074 | 0.033 | 0.000 | 0.074 | gw-r/thread-52/journal/page | none observed |
| 1f61223a68437975000000000000012a | 202.242 | 0.044 | n/a | 0.000 | 0.000 | 0.933 | 201.051 | 0.010 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.110 | 0.044 | 0.000 | 0.110 | gw-r/thread-56/journal/page | none observed |
| 1f61223a68437975000000000000011a | 202.184 | 0.046 | n/a | 0.000 | 0.000 | 0.828 | 201.147 | 0.007 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.078 | 0.046 | 0.000 | 0.078 | gw-r/thread-52/journal/page | none observed |
| 1f61223a684379750000000000000106 | 202.167 | 0.044 | n/a | 0.000 | 0.000 | 0.666 | 201.253 | 0.011 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.074 | 0.044 | 0.000 | 0.074 | gw-r/thread-52/journal/page | none observed |
| 1f61223a6843797500000000000000e4 | 202.162 | 0.032 | n/a | 0.000 | 0.000 | 0.751 | 201.087 | 0.007 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.091 | 0.032 | 0.000 | 0.091 | gw-r/thread-53/journal/page | none observed |
| 1f61223a684379750000000000000105 | 202.119 | 0.032 | n/a | 0.000 | 0.000 | 0.684 | 201.227 | 0.010 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.066 | 0.032 | 0.000 | 0.066 | gw-r/thread-53/journal/page | none observed |
| 1f61223a6843797500000000000000cf | 202.117 | 0.048 | n/a | 0.000 | 0.000 | 0.817 | 201.019 | 0.010 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.120 | 0.048 | 0.000 | 0.120 | gw-r/thread-55/journal/page | none observed |
| 1f61223a68437975000000000000011b | 202.081 | 0.042 | n/a | 0.000 | 0.000 | 0.689 | 201.104 | 0.011 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.086 | 0.042 | 0.000 | 0.086 | gw-r/thread-56/journal/page | none observed |
| 1f61223a684379750000000000000104 | 202.033 | 0.040 | n/a | 0.000 | 0.000 | 0.848 | 200.967 | 0.008 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.103 | 0.040 | 0.000 | 0.103 | gw-r/thread-51/journal/page | none observed |

## P3 / L16 / read (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.670 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.669 | 200.840 | 0.007 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.074 | 0.040 | 0.000 | 0.074 |
| p99 | 205.704 | n/a | n/a | n/a | 0.097 | n/a | 0.281 | 0.000 | 1.558 | 203.883 | 4.292 | 13.955 | 0.159 | 0.000 | n/a | n/a | 0.200 | 0.315 | 0.002 | 0.200 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1f61223a684379750000000000000144 | 205.704 | 0.056 | n/a | 0.000 | 0.000 | 1.558 | 203.883 | 0.012 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.119 | 0.056 | 0.000 | 0.119 | gw-r/thread-53/journal/page | none observed |
| 1f61223a68437975000000000000017b | 203.237 | 0.038 | n/a | 0.000 | 0.000 | 1.276 | 201.671 | 0.008 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.085 | 0.038 | 0.000 | 0.085 | gw-r/thread-53/journal/page | none observed |
| 1f61223a68437975000000000000019b | 203.171 | 0.065 | n/a | 0.000 | 0.000 | 1.481 | 201.423 | 0.008 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.125 | 0.065 | 0.000 | 0.125 | gw-r/thread-49/journal/page | none observed |
| 1f61223a684379750000000000000196 | 202.577 | 0.054 | n/a | 0.000 | 0.000 | 0.984 | 201.304 | 0.029 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.121 | 0.054 | 0.000 | 0.121 | gw-r/thread-53/journal/page | none observed |
| 1f61223a684379750000000000000191 | 202.429 | 0.038 | n/a | 0.000 | 0.000 | 0.526 | 201.649 | 0.020 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.118 | 0.038 | 0.000 | 0.118 | gw-r/thread-51/journal/page | none observed |
| 1f61223a68437975000000000000018e | 202.385 | 0.038 | n/a | 0.000 | 0.000 | 1.217 | 200.979 | 0.007 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.075 | 0.038 | 0.000 | 0.075 | gw-r/thread-55/journal/page | none observed |
| 1f61223a684379750000000000000194 | 202.384 | 0.047 | n/a | 0.000 | 0.000 | 0.857 | 201.277 | 0.011 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.115 | 0.047 | 0.000 | 0.115 | gw-r/thread-53/journal/page | none observed |
| 1f61223a684379750000000000000145 | 202.375 | 0.057 | n/a | 0.000 | 0.000 | 1.129 | 200.955 | 0.017 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.135 | 0.057 | 0.000 | 0.135 | gw-r/thread-49/journal/page | none observed |
| 1f61223a684379750000000000000138 | 202.370 | 0.044 | n/a | 0.000 | 0.000 | 0.861 | 201.256 | 0.010 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.110 | 0.044 | 0.000 | 0.110 | gw-r/thread-51/journal/page | none observed |
| 1f61223a684379750000000000000185 | 202.277 | 0.038 | n/a | 0.000 | 0.000 | 1.167 | 200.907 | 0.006 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.081 | 0.038 | 0.000 | 0.081 | gw-r/thread-49/journal/page | none observed |
| 1f61223a684379750000000000000163 | 202.276 | 0.034 | n/a | 0.000 | 0.000 | 0.731 | 201.353 | 0.011 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.065 | 0.034 | 0.000 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 1f61223a684379750000000000000171 | 202.189 | 0.040 | n/a | 0.000 | 0.000 | 0.981 | 200.984 | 0.006 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.120 | 0.040 | 0.000 | 0.120 | gw-r/thread-53/journal/page | none observed |
| 1f61223a684379750000000000000181 | 202.115 | 0.086 | n/a | 0.000 | 0.000 | 0.835 | 200.922 | 0.007 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.200 | 0.086 | 0.000 | 0.200 | gw-r/thread-56/journal/page | none observed |
| 1f61223a684379750000000000000158 | 202.110 | 0.040 | n/a | 0.000 | 0.000 | 0.745 | 201.126 | 0.022 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.084 | 0.040 | 0.000 | 0.084 | gw-r/thread-56/journal/page | none observed |
| 1f61223a684379750000000000000139 | 202.094 | 0.042 | n/a | 0.000 | 0.000 | 0.852 | 200.999 | 0.007 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.108 | 0.042 | 0.000 | 0.108 | gw-r/thread-71/journal/page | none observed |
| 1f61223a684379750000000000000148 | 202.070 | 0.047 | n/a | 0.000 | 0.000 | 0.819 | 200.982 | 0.008 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.145 | 0.047 | 0.000 | 0.145 | gw-r/thread-51/journal/page | none observed |
| 1f61223a68437975000000000000016c | 202.045 | 0.046 | n/a | 0.000 | 0.000 | 0.782 | 201.016 | 0.022 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.114 | 0.046 | 0.000 | 0.114 | gw-r/thread-71/journal/page | none observed |
| 1f61223a684379750000000000000183 | 202.043 | 0.054 | n/a | 0.000 | 0.000 | 0.882 | 200.909 | 0.011 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.126 | 0.054 | 0.000 | 0.126 | gw-r/thread-56/journal/page | none observed |
| 1f61223a684379750000000000000193 | 202.029 | 0.034 | n/a | 0.000 | 0.000 | 0.748 | 201.089 | 0.006 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.067 | 0.034 | 0.000 | 0.067 | gw-r/thread-52/journal/page | none observed |
| 1f61223a684379750000000000000157 | 202.017 | 0.044 | n/a | 0.000 | 0.000 | 0.486 | 201.208 | 0.076 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.079 | 0.044 | 0.000 | 0.079 | gw-r/thread-53/journal/page | none observed |

## P3 / L64 / read (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.525 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.634 | 200.733 | 0.006 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.072 | 0.040 | 0.000 | 0.072 |
| p99 | 202.721 | n/a | n/a | n/a | 0.093 | n/a | 0.000 | 0.000 | 1.666 | 201.432 | 2.625 | 0.000 | 0.175 | 0.000 | n/a | n/a | 0.178 | 0.093 | 0.001 | 0.178 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1f61223a6843797500000000000001bc | 203.167 | 0.033 | n/a | 0.000 | 0.000 | 2.208 | 200.799 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.070 | 0.033 | 0.000 | 0.070 | gw-r/thread-53/journal/page | none observed |
| 1f61223a6843797500000000000001aa | 202.721 | 0.048 | n/a | 0.000 | 0.000 | 0.847 | 201.623 | 0.005 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.105 | 0.048 | 0.000 | 0.105 | gw-r/thread-52/journal/page | none observed |
| 1f61223a6843797500000000000001ba | 202.529 | 0.041 | n/a | 0.000 | 0.000 | 0.953 | 201.312 | 0.008 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.081 | 0.041 | 0.000 | 0.081 | gw-r/thread-52/journal/page | none observed |
| 1f61223a6843797500000000000001f0 | 202.487 | 0.033 | n/a | 0.000 | 0.000 | 1.666 | 200.666 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.072 | 0.033 | 0.000 | 0.072 | gw-r/thread-71/journal/page | none observed |
| 1f61223a6843797500000000000001df | 202.436 | 0.047 | n/a | 0.000 | 0.000 | 1.172 | 201.019 | 0.011 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.104 | 0.047 | 0.000 | 0.104 | gw-r/thread-55/journal/page | none observed |
| 1f61223a6843797500000000000001f5 | 202.388 | 0.047 | n/a | 0.000 | 0.000 | 1.306 | 200.870 | 0.007 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.104 | 0.047 | 0.000 | 0.104 | gw-r/thread-55/journal/page | none observed |
| 1f61223a684379750000000000000211 | 202.351 | 0.053 | n/a | 0.000 | 0.000 | 0.681 | 201.339 | 0.009 | 0.000 | 0.175 | 0.000 | n/a | n/a | 0.094 | 0.053 | 0.000 | 0.094 | gw-r/thread-52/journal/page | none observed |
| 1f61223a6843797500000000000001f8 | 202.343 | 0.035 | n/a | 0.000 | 0.000 | 0.706 | 201.432 | 0.009 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.067 | 0.035 | 0.000 | 0.067 | gw-r/thread-71/journal/page | none observed |
| 1f61223a6843797500000000000001f9 | 202.317 | 0.047 | n/a | 0.000 | 0.000 | 0.965 | 201.110 | 0.006 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.104 | 0.047 | 0.000 | 0.104 | gw-r/thread-52/journal/page | none observed |
| 1f61223a6843797500000000000001e2 | 202.307 | 0.030 | n/a | 0.000 | 0.000 | 0.677 | 201.405 | 0.010 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.075 | 0.030 | 0.000 | 0.075 | gw-r/thread-51/journal/page | none observed |
| 1f61223a6843797500000000000001f6 | 202.223 | 0.040 | n/a | 0.000 | 0.000 | 0.736 | 201.251 | 0.007 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.121 | 0.040 | 0.000 | 0.121 | gw-r/thread-49/journal/page | none observed |
| 1f61223a6843797500000000000001d0 | 202.184 | 0.034 | n/a | 0.000 | 0.000 | 0.668 | 201.313 | 0.009 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.070 | 0.034 | 0.000 | 0.070 | gw-r/thread-52/journal/page | none observed |
| 1f61223a68437975000000000000019e | 202.162 | 0.035 | n/a | 0.000 | 0.000 | 0.614 | 201.333 | 0.017 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.066 | 0.035 | 0.000 | 0.066 | gw-r/thread-56/journal/page | none observed |
| 1f61223a6843797500000000000001bd | 202.151 | 0.032 | n/a | 0.000 | 0.000 | 0.637 | 201.323 | 0.010 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.071 | 0.032 | 0.000 | 0.071 | gw-r/thread-56/journal/page | none observed |
| 1f61223a6843797500000000000001ad | 202.143 | 0.043 | n/a | 0.000 | 0.000 | 1.232 | 200.742 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.066 | 0.043 | 0.000 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 1f61223a6843797500000000000001c8 | 202.111 | 0.049 | n/a | 0.000 | 0.000 | 0.685 | 201.214 | 0.009 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.080 | 0.049 | 0.000 | 0.080 | gw-r/thread-71/journal/page | none observed |
| 1f61223a6843797500000000000001b0 | 202.074 | 0.035 | n/a | 0.000 | 0.000 | 0.922 | 200.975 | 0.006 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.076 | 0.035 | 0.000 | 0.076 | gw-r/thread-53/journal/page | none observed |
| 1f61223a6843797500000000000001b2 | 202.066 | 0.064 | n/a | 0.000 | 0.000 | 0.803 | 200.904 | 0.008 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.208 | 0.064 | 0.000 | 0.208 | gw-r/thread-53/journal/page | none observed |
| 1f61223a6843797500000000000001ee | 202.049 | 0.049 | n/a | 0.000 | 0.000 | 0.928 | 200.898 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.117 | 0.049 | 0.000 | 0.117 | gw-r/thread-71/journal/page | none observed |
| 1f61223a6843797500000000000001fd | 202.043 | 0.044 | n/a | 0.000 | 0.000 | 0.799 | 201.017 | 0.006 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.112 | 0.044 | 0.000 | 0.112 | gw-r/thread-53/journal/page | none observed |

## P3 / L256 / read (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.589 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.629 | 200.740 | 0.006 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.072 | 0.041 | 0.000 | 0.072 |
| p99 | 205.642 | n/a | n/a | n/a | 0.074 | n/a | 0.000 | 0.000 | 4.024 | 202.515 | 2.379 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.158 | 0.074 | 0.001 | 0.158 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1f61223a684379750000000000000227 | 206.803 | 0.029 | n/a | 0.000 | 0.000 | 4.150 | 202.515 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.058 | 0.029 | 0.000 | 0.058 | gw-r/thread-56/journal/page | none observed |
| 1f61223a684379750000000000000224 | 205.642 | 0.034 | n/a | 0.000 | 0.000 | 1.824 | 203.659 | 0.006 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.061 | 0.034 | 0.000 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 1f61223a68437975000000000000021d | 205.343 | 0.037 | n/a | 0.000 | 0.000 | 4.024 | 201.120 | 0.010 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.069 | 0.037 | 0.000 | 0.069 | gw-r/thread-53/journal/page | none observed |
| 1f61223a684379750000000000000249 | 202.369 | 0.052 | n/a | 0.000 | 0.000 | 0.803 | 201.300 | 0.011 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.120 | 0.052 | 0.000 | 0.120 | gw-r/thread-52/journal/page | none observed |
| 1f61223a684379750000000000000253 | 202.229 | 0.041 | n/a | 0.000 | 0.000 | 0.821 | 201.212 | 0.005 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.089 | 0.041 | 0.000 | 0.089 | gw-r/thread-55/journal/page | none observed |
| 1f61223a684379750000000000000247 | 202.208 | 0.050 | n/a | 0.000 | 0.000 | 0.674 | 201.215 | 0.020 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.162 | 0.050 | 0.000 | 0.162 | gw-r/thread-52/journal/page | none observed |
| 1f61223a684379750000000000000228 | 202.164 | 0.044 | n/a | 0.000 | 0.000 | 0.739 | 201.256 | 0.008 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.060 | 0.044 | 0.000 | 0.060 | gw-r/thread-55/journal/page | none observed |
| 1f61223a68437975000000000000025e | 202.137 | 0.056 | n/a | 0.000 | 0.000 | 0.901 | 200.968 | 0.006 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.136 | 0.056 | 0.000 | 0.136 | gw-r/thread-56/journal/page | none observed |
| 1f61223a684379750000000000000218 | 202.133 | 0.033 | n/a | 0.000 | 0.000 | 0.563 | 201.372 | 0.008 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.068 | 0.033 | 0.000 | 0.068 | gw-r/thread-56/journal/page | none observed |
| 1f61223a68437975000000000000025d | 202.121 | 0.047 | n/a | 0.000 | 0.000 | 0.737 | 201.108 | 0.014 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.084 | 0.047 | 0.000 | 0.084 | gw-r/thread-52/journal/page | none observed |
| 1f61223a684379750000000000000265 | 202.096 | 0.049 | n/a | 0.000 | 0.000 | 0.868 | 200.972 | 0.006 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.116 | 0.049 | 0.000 | 0.116 | gw-r/thread-71/journal/page | none observed |
| 1f61223a684379750000000000000272 | 202.018 | 0.053 | n/a | 0.000 | 0.000 | 0.894 | 200.871 | 0.006 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.131 | 0.053 | 0.000 | 0.131 | gw-r/thread-53/journal/page | none observed |
| 1f61223a684379750000000000000252 | 201.997 | 0.044 | n/a | 0.000 | 0.000 | 0.979 | 200.813 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.102 | 0.044 | 0.000 | 0.102 | gw-r/thread-51/journal/page | none observed |
| 1f61223a684379750000000000000261 | 201.994 | 0.031 | n/a | 0.000 | 0.000 | 0.615 | 201.177 | 0.012 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 | gw-r/thread-55/journal/page | none observed |
| 1f61223a684379750000000000000246 | 201.965 | 0.036 | n/a | 0.000 | 0.000 | 0.557 | 201.205 | 0.009 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.066 | 0.036 | 0.000 | 0.066 | gw-r/thread-53/journal/page | none observed |
| 1f61223a684379750000000000000257 | 201.911 | 0.042 | n/a | 0.000 | 0.000 | 0.648 | 201.049 | 0.009 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.095 | 0.042 | 0.000 | 0.095 | gw-r/thread-51/journal/page | none observed |
| 1f61223a684379750000000000000267 | 201.896 | 0.049 | n/a | 0.000 | 0.000 | 0.744 | 200.944 | 0.009 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.081 | 0.049 | 0.000 | 0.081 | gw-r/thread-71/journal/page | none observed |
| 1f61223a684379750000000000000287 | 201.884 | 0.045 | n/a | 0.000 | 0.000 | 0.625 | 200.947 | 0.016 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.118 | 0.045 | 0.000 | 0.118 | gw-r/thread-55/journal/page | none observed |
| 1f61223a68437975000000000000024b | 201.875 | 0.042 | n/a | 0.000 | 0.000 | 0.755 | 200.869 | 0.006 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.138 | 0.042 | 0.000 | 0.138 | gw-r/thread-52/journal/page | none observed |
| 1f61223a68437975000000000000022f | 201.873 | 0.045 | n/a | 0.000 | 0.000 | 0.668 | 201.005 | 0.009 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.078 | 0.045 | 0.000 | 0.078 | gw-r/thread-51/journal/page | none observed |

## P3 / L1024 / read (64 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 78.620 | n/a | n/a | n/a | 0.049 | n/a | 0.000 | 0.000 | 0.552 | 77.984 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.071 | 0.049 | 0.001 | 0.071 |
| p99 | 203.578 | n/a | n/a | n/a | 0.107 | n/a | 0.000 | 0.000 | 3.157 | 202.947 | 3.600 | 0.000 | 0.262 | 0.000 | n/a | n/a | 0.148 | 0.107 | 0.002 | 0.148 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1f61223a68437975000000000000029d | 203.578 | 0.037 | n/a | 0.000 | 0.000 | 0.420 | 202.947 | 0.010 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.073 | 0.037 | 0.000 | 0.073 | gw-r/thread-56/journal/page | none observed |
| 1f61223a6843797500000000000002a4 | 202.151 | 0.055 | n/a | 0.000 | 0.000 | 0.920 | 200.960 | 0.008 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.136 | 0.055 | 0.000 | 0.136 | gw-r/thread-51/journal/page | none observed |
| 1f61223a68437975000000000000029e | 202.142 | 0.038 | n/a | 0.000 | 0.000 | 0.726 | 201.189 | 0.011 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.084 | 0.038 | 0.000 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 1f61223a6843797500000000000002a2 | 202.063 | 0.033 | n/a | 0.000 | 0.000 | 0.638 | 201.207 | 0.009 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.063 | 0.033 | 0.000 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 1f61223a68437975000000000000028d | 202.016 | 0.031 | n/a | 0.000 | 0.000 | 0.541 | 201.270 | 0.010 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 | gw-r/thread-53/journal/page | none observed |
| 1f61223a684379750000000000000291 | 202.010 | 0.037 | n/a | 0.000 | 0.000 | 0.669 | 201.135 | 0.010 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.071 | 0.037 | 0.000 | 0.071 | gw-r/thread-71/journal/page | none observed |
| 1f61223a684379750000000000000298 | 201.871 | 0.041 | n/a | 0.000 | 0.000 | 0.621 | 201.004 | 0.011 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.109 | 0.041 | 0.000 | 0.109 | gw-r/thread-56/journal/page | none observed |
| 1f61223a68437975000000000000029b | 201.848 | 0.036 | n/a | 0.000 | 0.000 | 0.714 | 200.904 | 0.008 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.071 | 0.036 | 0.000 | 0.071 | gw-r/thread-56/journal/page | none observed |
| 1f61223a6843797500000000000002a3 | 201.805 | 0.051 | n/a | 0.000 | 0.000 | 0.817 | 200.740 | 0.006 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.136 | 0.051 | 0.000 | 0.136 | gw-r/thread-71/journal/page | none observed |
| 1f61223a68437975000000000000029f | 201.597 | 0.040 | n/a | 0.000 | 0.000 | 0.654 | 200.752 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.093 | 0.040 | 0.000 | 0.093 | gw-r/thread-56/journal/page | none observed |
| 1f61223a684379750000000000000299 | 201.530 | 0.033 | n/a | 0.000 | 0.000 | 0.593 | 200.742 | 0.006 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.068 | 0.033 | 0.000 | 0.068 | gw-r/thread-49/journal/page | none observed |
| 1f61223a6843797500000000000002a0 | 201.512 | 0.043 | n/a | 0.000 | 0.000 | 0.639 | 200.664 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.108 | 0.043 | 0.000 | 0.108 | gw-r/thread-49/journal/page | none observed |
| 1f61223a684379750000000000000292 | 201.469 | 0.033 | n/a | 0.000 | 0.000 | 0.577 | 200.719 | 0.006 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.072 | 0.033 | 0.000 | 0.072 | gw-r/thread-55/journal/page | none observed |
| 1f61223a68437975000000000000028c | 201.459 | 0.040 | n/a | 0.000 | 0.000 | 0.593 | 200.672 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.098 | 0.040 | 0.000 | 0.098 | gw-r/thread-52/journal/page | none observed |
| 1f61223a68437975000000000000028f | 201.453 | 0.055 | n/a | 0.000 | 0.000 | 0.672 | 200.553 | 0.008 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.119 | 0.055 | 0.000 | 0.119 | gw-r/thread-51/journal/page | none observed |
| 1f61223a68437975000000000000028b | 201.375 | 0.032 | n/a | 0.000 | 0.000 | 0.374 | 200.855 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.063 | 0.032 | 0.000 | 0.063 | gw-r/thread-56/journal/page | none observed |
| 1f61223a684379750000000000000294 | 201.359 | 0.043 | n/a | 0.000 | 0.000 | 0.520 | 200.647 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.097 | 0.043 | 0.000 | 0.097 | gw-r/thread-55/journal/page | none observed |
| 1f61223a684379750000000000000297 | 201.336 | 0.037 | n/a | 0.000 | 0.000 | 0.470 | 200.706 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.068 | 0.037 | 0.000 | 0.068 | gw-r/thread-49/journal/page | none observed |
| 1f61223a684379750000000000000293 | 167.414 | 0.037 | n/a | 0.000 | 0.000 | 0.635 | 166.538 | 0.119 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.053 | 0.037 | 0.000 | 0.053 | gw-r/thread-71/journal/page | none observed |
| 1f61223a684379750000000000000296 | 118.167 | 0.073 | n/a | 0.000 | 0.000 | 3.157 | 114.792 | 0.007 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.106 | 0.073 | 0.001 | 0.106 | gw-r/thread-49/journal/page | none observed |

## P3 / tail / read (215 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 88.948 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.472 | 88.271 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.065 | 0.042 | 0.001 | 0.065 |
| p99 | 201.923 | n/a | n/a | n/a | 0.103 | n/a | 0.000 | 0.000 | 2.094 | 200.961 | 3.690 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.159 | 0.103 | 0.002 | 0.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1f61223a684379750000000000000eb7 | 202.154 | 0.028 | n/a | 0.000 | 0.000 | 1.277 | 200.751 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.052 | 0.028 | 0.000 | 0.052 | gw-r/thread-56/journal/page | none observed |
| 1f61223a684379750000000000000efc | 202.121 | 0.036 | n/a | 0.000 | 0.000 | 1.465 | 200.498 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.078 | 0.036 | 0.000 | 0.078 | gw-r/thread-51/journal/page | none observed |
| 1f61223a684379750000000000000e98 | 201.923 | 0.038 | n/a | 0.000 | 0.000 | 0.670 | 201.072 | 0.007 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.084 | 0.038 | 0.000 | 0.084 | gw-r/thread-71/journal/page | none observed |
| 1f61223a684379750000000000000ecf | 201.860 | 0.030 | n/a | 0.000 | 0.000 | 0.695 | 200.938 | 0.008 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.063 | 0.030 | 0.000 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 1f61223a684379750000000000000eca | 201.804 | 0.050 | n/a | 0.000 | 0.000 | 0.694 | 200.897 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.104 | 0.050 | 0.000 | 0.104 | gw-r/thread-52/journal/page | none observed |
| 1f61223a684379750000000000000efd | 201.786 | 0.042 | n/a | 0.000 | 0.000 | 1.016 | 200.584 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.102 | 0.042 | 0.000 | 0.102 | gw-r/thread-53/journal/page | none observed |
| 1f61223a684379750000000000000ed0 | 201.746 | 0.045 | n/a | 0.000 | 0.000 | 0.567 | 200.976 | 0.017 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.063 | 0.045 | 0.000 | 0.063 | gw-r/thread-52/journal/page | none observed |
| 1f61223a684379750000000000000ee4 | 201.665 | 0.049 | n/a | 0.000 | 0.000 | 0.760 | 200.700 | 0.004 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.107 | 0.049 | 0.000 | 0.107 | gw-r/thread-55/journal/page | none observed |
| 1f61223a684379750000000000000ef8 | 201.661 | 0.042 | n/a | 0.000 | 0.000 | 0.727 | 200.755 | 0.003 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.091 | 0.042 | 0.000 | 0.091 | gw-r/thread-49/journal/page | none observed |
| 1f61223a684379750000000000000e8f | 201.621 | 0.045 | n/a | 0.000 | 0.000 | 0.755 | 200.686 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.088 | 0.045 | 0.000 | 0.088 | gw-r/thread-49/journal/page | none observed |
| 1f61223a684379750000000000000eeb | 201.581 | 0.044 | n/a | 0.000 | 0.000 | 0.605 | 200.811 | 0.004 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.073 | 0.044 | 0.000 | 0.073 | gw-r/thread-51/journal/page | none observed |
| 1f61223a684379750000000000000eb2 | 201.554 | 0.039 | n/a | 0.000 | 0.000 | 0.495 | 200.858 | 0.019 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.105 | 0.039 | 0.000 | 0.105 | gw-r/thread-71/journal/page | none observed |
| 1f61223a684379750000000000000efe | 201.543 | 0.045 | n/a | 0.000 | 0.000 | 0.682 | 200.656 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.113 | 0.045 | 0.000 | 0.113 | gw-r/thread-51/journal/page | none observed |
| 1f61223a684379750000000000000ecd | 201.537 | 0.038 | n/a | 0.000 | 0.000 | 0.601 | 200.782 | 0.009 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.058 | 0.038 | 0.000 | 0.058 | gw-r/thread-52/journal/page | none observed |
| 1f61223a684379750000000000000eba | 201.532 | 0.042 | n/a | 0.000 | 0.000 | 0.567 | 200.798 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.068 | 0.042 | 0.000 | 0.068 | gw-r/thread-51/journal/page | none observed |
| 1f61223a684379750000000000000efa | 201.513 | 0.029 | n/a | 0.000 | 0.000 | 0.487 | 200.824 | 0.012 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.054 | 0.029 | 0.000 | 0.054 | gw-r/thread-49/journal/page | none observed |
| 1f61223a684379750000000000000edb | 201.505 | 0.033 | n/a | 0.000 | 0.000 | 0.400 | 200.942 | 0.008 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.065 | 0.033 | 0.000 | 0.065 | gw-r/thread-53/journal/page | none observed |
| 1f61223a684379750000000000000ea9 | 201.494 | 0.029 | n/a | 0.000 | 0.000 | 0.390 | 200.961 | 0.004 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.057 | 0.029 | 0.000 | 0.057 | gw-r/thread-56/journal/page | none observed |
| 1f61223a684379750000000000000ec1 | 201.472 | 0.028 | n/a | 0.000 | 0.000 | 0.376 | 200.933 | 0.020 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.052 | 0.028 | 0.000 | 0.052 | gw-r/thread-52/journal/page | none observed |
| 1f61223a684379750000000000000ed2 | 201.472 | 0.028 | n/a | 0.000 | 0.000 | 0.499 | 200.838 | 0.004 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.056 | 0.028 | 0.000 | 0.056 | gw-r/thread-52/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
