# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.subject` (84.507 ms, trace `aeeb8a184539e80c0000000000001873`); `node-14/thread-0/driver.queue.subject` (122.319 ms, trace `aeeb8a184539e80c0000000000001a9d`); `node-14/thread-0/driver.queue.scheduler-late` (76.870 ms, trace `aeeb8a184539e80c0000000000001b3f`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (82.067 ms, trace `aeeb8a184539e80c0000000000001a99`); `node-14/thread-0/client.persist-and-resolve` (83.477 ms, trace `aeeb8a184539e80c0000000000001875`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p2-cost-b-2-summary`; source `8f8e995899327e659c1973b85a0fd51b2de1850d`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 6791970.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13393.287 | 676.585 | 82.227 | 308 |
| L1 | 0 | 19951.531 | 465.209 | 21.598 | 462 |
| L4 | 0 | 19973.179 | 411.889 | 12.196 | 426 |
| L16 | 0 | 19973.027 | 421.123 | 9.874 | 474 |
| L64 | 0 | 19854.976 | 423.716 | 7.771 | 596 |
| L256 | 0 | 19979.809 | 426.401 | 13.561 | 486 |
| L1024 | 0 | 19992.226 | 4437.048 | 188.975 | 11841 |
| tail | 0 | 64610.252 | 12857.531 | 542.639 | 36899 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| aeeb8a184539e80c0000000000001873 | driver.queue.subject | 84.507 | aeeb8a184539e80c0000000000001872 | 3 / 32 |
| aeeb8a184539e80c0000000000001873 | driver.queue.scheduler-late | 28.004 | none | 3 / 32 |
| aeeb8a184539e80c0000000000001873 | driver.queue.scheduler-dispatch | 0.219 | none | 7 / 32 |

Observed active steps while trace aeeb8a184539e80c0000000000001873 waited: [{"at":1794545598903.2239,"inFlight":6,"capacity":32,"active":[{"traceId":"aeeb8a184539e80c000000000000186c","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001871","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001872","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001876","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001877","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001878","step":"client.persist-and-resolve"}]},{"at":1794545598954.8374,"inFlight":9,"capacity":32,"active":[{"traceId":"aeeb8a184539e80c0000000000001871","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001872","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001876","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001877","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001878","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001874","step":"client.http"},{"traceId":"aeeb8a184539e80c000000000000187b","step":"client.http"},{"traceId":"aeeb8a184539e80c000000000000187c","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c000000000000187d","step":"client.persist-and-resolve"}]}]

| aeeb8a184539e80c0000000000001a9d | driver.queue.subject | 122.319 | aeeb8a184539e80c0000000000001a99 | 2 / 32 |
| aeeb8a184539e80c0000000000001a9d | driver.queue.scheduler-late | 42.200 | none | 2 / 32 |
| aeeb8a184539e80c0000000000001a9d | driver.queue.scheduler-dispatch | 0.097 | none | 4 / 32 |

Observed active steps while trace aeeb8a184539e80c0000000000001a9d waited: [{"at":1794545603525.0435,"inFlight":5,"capacity":32,"active":[{"traceId":"aeeb8a184539e80c0000000000001a9b","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001a99","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001a9e","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001a9f","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001aa0","step":"client.http"}]},{"at":1794545603565.9824,"inFlight":6,"capacity":32,"active":[{"traceId":"aeeb8a184539e80c0000000000001a9b","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001a99","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001a9e","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001a9f","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001aa0","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001aa1","step":"client.http"}]},{"at":1794545603584.8691,"inFlight":6,"capacity":32,"active":[{"traceId":"aeeb8a184539e80c0000000000001a9b","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001a99","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001a9e","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001a9f","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001aa0","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001aa1","step":"client.http"}]}]

| aeeb8a184539e80c0000000000001b3f | driver.queue.scheduler-late | 76.870 | none | 3 / 32 |
| aeeb8a184539e80c0000000000001b3f | driver.queue.subject | 55.304 | aeeb8a184539e80c0000000000001b3e | 3 / 32 |
| aeeb8a184539e80c0000000000001b3f | driver.queue.scheduler-dispatch | 0.063 | none | 5 / 32 |

Observed active steps while trace aeeb8a184539e80c0000000000001b3f waited: [{"at":1794545604966.2607,"inFlight":7,"capacity":32,"active":[{"traceId":"aeeb8a184539e80c0000000000001b3a","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001b3b","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001b3e","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001b40","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001b41","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001b42","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001b43","step":"client.persist-and-resolve"}]},{"at":1794545605012.2478,"inFlight":5,"capacity":32,"active":[{"traceId":"aeeb8a184539e80c0000000000001b3e","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001b40","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001b41","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001b42","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001b43","step":"client.persist-and-resolve"}]}]

| aeeb8a184539e80c0000000000001a99 | driver.queue.subject | 46.904 | aeeb8a184539e80c0000000000001a97 | 2 / 32 |
| aeeb8a184539e80c0000000000001a99 | driver.queue.scheduler-late | 1.304 | none | 2 / 32 |
| aeeb8a184539e80c0000000000001a99 | driver.queue.scheduler-dispatch | 0.741 | none | 1 / 32 |

Observed active steps while trace aeeb8a184539e80c0000000000001a99 waited: []

| aeeb8a184539e80c0000000000001875 | driver.queue.subject | 63.804 | aeeb8a184539e80c0000000000001874 | 3 / 32 |
| aeeb8a184539e80c0000000000001875 | driver.queue.scheduler-late | 25.304 | none | 3 / 32 |
| aeeb8a184539e80c0000000000001875 | driver.queue.scheduler-dispatch | 0.074 | none | 8 / 32 |

Observed active steps while trace aeeb8a184539e80c0000000000001875 waited: [{"at":1794545598903.2239,"inFlight":6,"capacity":32,"active":[{"traceId":"aeeb8a184539e80c000000000000186c","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001871","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001872","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001876","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001877","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001878","step":"client.persist-and-resolve"}]},{"at":1794545598954.8374,"inFlight":9,"capacity":32,"active":[{"traceId":"aeeb8a184539e80c0000000000001871","step":"client.http"},{"traceId":"aeeb8a184539e80c0000000000001872","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001876","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001877","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001878","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c0000000000001874","step":"client.http"},{"traceId":"aeeb8a184539e80c000000000000187b","step":"client.http"},{"traceId":"aeeb8a184539e80c000000000000187c","step":"client.persist-and-resolve"},{"traceId":"aeeb8a184539e80c000000000000187d","step":"client.persist-and-resolve"}]}]

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 40.289 | 0.865 | 0.000 | 1.601 | 5.385 | 3.239 | 0.000 | 0.127 | 1.834 | 7.881 | 0.049 | n/a | 0.521 | 19.366 | n/a | n/a | 0.060 | 6.611 | 0.187 | 0.060 |
| p99 | 92.577 | 3.645 | 2.634 | 10.107 | 28.215 | n/a | 9.479 | 2.300 | 5.391 | 38.290 | 0.367 | n/a | 3.748 | 83.886 | n/a | n/a | 0.395 | 30.515 | 0.530 | 0.395 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c0000000000000454 | 92.577 | 3.946 | n/a | 0.000 | 1.099 | 0.903 | 2.095 | 0.036 | n/a | 0.575 | 83.886 | n/a | n/a | 0.037 | 5.045 | 0.054 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000424 | 90.335 | 16.882 | 3.239 | 0.000 | 0.136 | 2.428 | 38.290 | 0.367 | n/a | 1.157 | 27.769 | n/a | n/a | 0.068 | 20.256 | 0.224 | 0.068 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000441 | 57.553 | 28.215 | n/a | 0.000 | 2.300 | 2.878 | 6.214 | 0.079 | n/a | 2.446 | 15.298 | n/a | n/a | 0.124 | 30.515 | 0.530 | 0.124 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000436 | 56.591 | 6.215 | 0.199 | 0.000 | 0.155 | 2.224 | 20.520 | 0.042 | n/a | 0.422 | 26.774 | n/a | n/a | 0.039 | 6.569 | 0.116 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000422 | 55.785 | 11.963 | n/a | 0.000 | 1.170 | 1.390 | 20.245 | 0.115 | n/a | 0.334 | 20.174 | n/a | n/a | 0.395 | 13.133 | 0.235 | 0.395 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000042c | 49.586 | 7.409 | 0.245 | 0.000 | 0.104 | 2.835 | 19.620 | 0.040 | n/a | 1.657 | 17.588 | n/a | n/a | 0.086 | 7.758 | 0.156 | 0.086 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000434 | 48.211 | 5.322 | 0.324 | 0.000 | 0.094 | 2.449 | 20.147 | 0.050 | n/a | 0.231 | 19.534 | n/a | n/a | 0.060 | 5.740 | 0.119 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000448 | 47.513 | 9.335 | n/a | 3.180 | 1.126 | 0.957 | 2.072 | 0.033 | n/a | 0.384 | 30.391 | n/a | n/a | 0.035 | 13.642 | 0.287 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000042e | 46.539 | 5.133 | 2.222 | 0.000 | 0.079 | 2.665 | 15.781 | 0.098 | n/a | 1.127 | 19.374 | n/a | n/a | 0.059 | 7.434 | 0.160 | 0.059 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000043c | 46.538 | 7.375 | 1.376 | 0.000 | 0.063 | 1.945 | 15.654 | 0.068 | n/a | 0.368 | 19.627 | n/a | n/a | 0.064 | 8.813 | 0.189 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000431 | 45.487 | 7.342 | n/a | 0.000 | 0.257 | 1.076 | 7.375 | 0.079 | n/a | 0.398 | 28.830 | n/a | n/a | 0.129 | 7.599 | 0.167 | 0.129 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000044a | 43.660 | 4.924 | 0.302 | 0.324 | 0.051 | 1.834 | 15.410 | 0.094 | n/a | 1.271 | 19.366 | n/a | n/a | 0.082 | 5.602 | 0.128 | 0.082 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000452 | 41.397 | 6.022 | 0.313 | 0.549 | 0.064 | 2.066 | 11.661 | 0.067 | n/a | 0.989 | 19.630 | n/a | n/a | 0.036 | 6.948 | 0.168 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000043e | 40.765 | 4.987 | 1.261 | 0.000 | 0.069 | 5.391 | 6.748 | 0.049 | n/a | 3.644 | 18.577 | n/a | n/a | 0.040 | 6.318 | 0.155 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000044e | 40.289 | 4.779 | 0.336 | 0.000 | 0.075 | 1.709 | 13.487 | 0.056 | n/a | 0.247 | 19.539 | n/a | n/a | 0.061 | 5.189 | 0.129 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000428 | 39.698 | 5.112 | 0.250 | 9.479 | 0.060 | 2.355 | 11.503 | 0.045 | n/a | 0.493 | 10.343 | n/a | n/a | 0.058 | 14.901 | 0.375 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000437 | 35.697 | 5.417 | n/a | 0.000 | 0.968 | 0.854 | 9.497 | 0.056 | n/a | 3.748 | 15.125 | n/a | n/a | 0.032 | 6.385 | 0.179 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000440 | 35.658 | 7.808 | 0.303 | 0.000 | 0.097 | 2.824 | 7.881 | 0.040 | n/a | 0.468 | 16.185 | n/a | n/a | 0.052 | 8.209 | 0.230 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000043a | 35.314 | 6.162 | n/a | 2.640 | 0.389 | 1.125 | 2.858 | 0.050 | n/a | 0.793 | 21.223 | n/a | n/a | 0.074 | 9.191 | 0.260 | 0.074 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000457 | 33.944 | 5.385 | 0.462 | 0.470 | 0.028 | 1.912 | 14.075 | 0.051 | n/a | 0.459 | 11.074 | n/a | n/a | 0.028 | 6.345 | 0.187 | 0.028 | gw-w/thread-44/gateway.admitted-work | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.029 | 1.025 | 0.000 | 1.968 | 4.740 | n/a | 0.000 | 0.843 | 0.951 | 1.496 | 0.036 | n/a | 0.575 | 15.799 | n/a | n/a | 0.062 | 5.683 | 0.241 | 0.062 |
| p99 | 92.577 | 3.645 | 0.007 | 4.606 | 28.215 | n/a | 2.314 | 2.300 | 3.857 | 6.214 | 0.079 | n/a | 2.446 | 83.886 | n/a | n/a | 0.124 | 30.515 | 0.530 | 0.124 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c0000000000000454 | 92.577 | 3.946 | n/a | 0.000 | 1.099 | 0.903 | 2.095 | 0.036 | n/a | 0.575 | 83.886 | n/a | n/a | 0.037 | 5.045 | 0.054 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000441 | 57.553 | 28.215 | n/a | 0.000 | 2.300 | 2.878 | 6.214 | 0.079 | n/a | 2.446 | 15.298 | n/a | n/a | 0.124 | 30.515 | 0.530 | 0.124 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000044f | 29.776 | 3.467 | n/a | 0.000 | 0.771 | 0.852 | 1.496 | 0.036 | n/a | 0.816 | 22.304 | n/a | n/a | 0.036 | 4.238 | 0.142 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000443 | 29.371 | 5.316 | n/a | 1.639 | 0.127 | 0.874 | 1.391 | 0.034 | n/a | 0.241 | 19.689 | n/a | n/a | 0.061 | 7.082 | 0.241 | 0.061 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000426 | 26.029 | 3.840 | n/a | 0.000 | 0.146 | 3.857 | 1.473 | 0.027 | n/a | 0.521 | 16.113 | n/a | n/a | 0.053 | 3.986 | 0.153 | 0.053 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000042a | 25.319 | 5.768 | n/a | 0.000 | 0.843 | 0.982 | 1.276 | 0.026 | n/a | 0.548 | 15.799 | n/a | n/a | 0.078 | 6.611 | 0.261 | 0.078 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000456 | 23.208 | 5.177 | n/a | 2.314 | 1.029 | 0.951 | 1.480 | 0.041 | n/a | 0.709 | 11.435 | n/a | n/a | 0.074 | 8.519 | 0.367 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000042f | 19.411 | 4.740 | n/a | 0.000 | 0.943 | 0.954 | 4.636 | 0.036 | n/a | 0.193 | 7.795 | n/a | n/a | 0.115 | 5.683 | 0.293 | 0.115 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000044b | 18.264 | 3.565 | n/a | 0.000 | 0.111 | 0.921 | 1.579 | 0.040 | n/a | 0.701 | 11.286 | n/a | n/a | 0.062 | 3.675 | 0.201 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.087 | 0.000 | 0.000 | 0.353 | 2.984 | 0.201 | 0.000 | 0.066 | 2.169 | 0.399 | 0.028 | n/a | 1.563 | 6.131 | n/a | n/a | 0.033 | 3.331 | 0.131 | 0.033 |
| p99 | 52.332 | 0.666 | 0.000 | 1.318 | 6.096 | n/a | 0.508 | 0.346 | 5.601 | 20.428 | 0.176 | n/a | 5.456 | 17.173 | n/a | n/a | 0.059 | 6.871 | 0.195 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c000000000000045a | 52.332 | 6.096 | 0.201 | 0.508 | 0.066 | 2.169 | 20.428 | 0.176 | n/a | 5.456 | 17.173 | n/a | n/a | 0.059 | 6.871 | 0.131 | 0.059 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000c94 | 17.087 | 2.984 | n/a | 0.000 | 0.346 | 5.601 | 0.399 | 0.028 | n/a | 1.563 | 6.131 | n/a | n/a | 0.033 | 3.331 | 0.195 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.919ms |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.620 | 0.531 | 0.000 | 0.981 | 5.279 | n/a | 0.000 | 0.129 | 1.927 | 5.156 | 0.048 | n/a | 0.284 | 13.016 | n/a | n/a | 0.054 | 6.000 | 0.191 | 0.054 |
| p99 | 91.863 | 4.256 | 0.017 | 5.531 | 12.872 | n/a | 2.953 | 1.164 | 6.604 | 35.853 | 0.120 | n/a | 9.570 | 71.397 | n/a | n/a | 0.100 | 15.779 | 0.500 | 0.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c000000000000047f | 91.863 | 12.872 | n/a | 1.768 | 1.139 | 0.874 | 2.974 | 0.039 | n/a | 0.731 | 71.397 | n/a | n/a | 0.070 | 15.779 | 0.172 | 0.070 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000046e | 78.713 | 4.129 | 0.223 | 0.000 | 0.212 | 2.491 | 26.015 | 0.094 | n/a | 0.357 | 45.145 | n/a | n/a | 0.047 | 4.564 | 0.058 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000468 | 61.430 | 7.213 | 0.714 | 0.000 | 0.065 | 4.281 | 19.289 | 0.120 | n/a | 9.570 | 20.133 | n/a | n/a | 0.045 | 7.992 | 0.130 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000486 | 54.914 | 3.653 | 0.220 | 0.000 | 0.063 | 1.870 | 35.853 | 0.038 | n/a | 0.163 | 13.016 | n/a | n/a | 0.039 | 3.936 | 0.072 | 0.039 | gw-w/thread-47/gateway.admitted-work | none observed |
| aeeb8a184539e80c0000000000000466 | 46.232 | 9.316 | n/a | 0.000 | 0.562 | 6.604 | 5.151 | 0.075 | n/a | 3.776 | 20.649 | n/a | n/a | 0.100 | 9.878 | 0.214 | 0.100 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000045e | 45.255 | 5.459 | 0.351 | 0.317 | 0.079 | 2.454 | 17.457 | 0.073 | n/a | 0.235 | 18.776 | n/a | n/a | 0.055 | 6.206 | 0.137 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000465 | 41.414 | 6.514 | 0.362 | 0.000 | 0.100 | 2.255 | 9.946 | 0.043 | n/a | 0.292 | 21.815 | n/a | n/a | 0.087 | 6.976 | 0.168 | 0.087 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000047e | 39.054 | 4.813 | 1.956 | 0.000 | 0.066 | 1.943 | 15.799 | 0.065 | n/a | 0.238 | 14.118 | n/a | n/a | 0.057 | 6.835 | 0.175 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | client.encode 2.195ms |
| aeeb8a184539e80c000000000000049c | 37.729 | 5.052 | 0.382 | 0.000 | 0.094 | 2.610 | 18.466 | 0.055 | n/a | 0.279 | 10.736 | n/a | n/a | 0.054 | 5.528 | 0.147 | 0.054 | gw-w/thread-43/gateway.admitted-work | none observed |
| aeeb8a184539e80c000000000000047a | 37.579 | 4.981 | 0.267 | 0.000 | 0.084 | 2.290 | 12.369 | 0.051 | n/a | 0.204 | 17.263 | n/a | n/a | 0.069 | 5.333 | 0.142 | 0.069 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000470 | 37.055 | 4.146 | 0.263 | 0.000 | 0.129 | 2.093 | 14.357 | 0.046 | n/a | 0.201 | 15.754 | n/a | n/a | 0.066 | 4.538 | 0.122 | 0.066 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000046b | 36.413 | 7.162 | n/a | 2.953 | 0.677 | 1.096 | 3.193 | 0.075 | n/a | 1.386 | 19.821 | n/a | n/a | 0.050 | 10.792 | 0.296 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000460 | 34.845 | 5.037 | n/a | 0.000 | 1.080 | 0.909 | 3.268 | 0.038 | n/a | 1.902 | 22.526 | n/a | n/a | 0.086 | 6.117 | 0.176 | 0.086 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000463 | 34.338 | 6.546 | n/a | 0.000 | 0.929 | 1.389 | 1.838 | 0.041 | n/a | 1.635 | 21.894 | n/a | n/a | 0.065 | 7.475 | 0.218 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000493 | 33.288 | 6.932 | n/a | 0.000 | 1.164 | 0.970 | 7.441 | 0.064 | n/a | 0.795 | 15.841 | n/a | n/a | 0.082 | 8.095 | 0.243 | 0.082 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000498 | 33.107 | 5.104 | 0.269 | 0.000 | 0.132 | 2.080 | 12.694 | 0.059 | n/a | 0.262 | 12.445 | n/a | n/a | 0.063 | 5.505 | 0.166 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004a2 | 31.738 | 4.655 | 0.302 | 0.000 | 0.076 | 1.898 | 10.387 | 0.051 | n/a | 0.211 | 14.110 | n/a | n/a | 0.048 | 5.033 | 0.159 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000045c | 31.680 | 3.989 | 0.302 | 0.353 | 0.066 | 2.049 | 11.261 | 0.049 | n/a | 0.193 | 13.384 | n/a | n/a | 0.034 | 4.709 | 0.149 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004a0 | 31.094 | 5.373 | 0.343 | 0.000 | 0.118 | 1.999 | 12.232 | 0.059 | n/a | 0.233 | 10.662 | n/a | n/a | 0.076 | 5.833 | 0.188 | 0.076 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000496 | 30.512 | 3.744 | 0.174 | 0.000 | 0.076 | 2.015 | 11.459 | 0.047 | n/a | 0.229 | 12.723 | n/a | n/a | 0.044 | 3.995 | 0.131 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.949 | 0.974 | 0.000 | 1.479 | 3.714 | n/a | 0.000 | 0.519 | 0.937 | 1.537 | 0.041 | n/a | 0.344 | 7.776 | n/a | n/a | 0.051 | 4.548 | 0.299 | 0.051 |
| p99 | 46.232 | 1.804 | 0.004 | 2.236 | 9.316 | n/a | 1.526 | 1.032 | 6.604 | 5.151 | 0.075 | n/a | 3.776 | 21.894 | n/a | n/a | 0.100 | 9.878 | 0.354 | 0.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c0000000000000466 | 46.232 | 9.316 | n/a | 0.000 | 0.562 | 6.604 | 5.151 | 0.075 | n/a | 3.776 | 20.649 | n/a | n/a | 0.100 | 9.878 | 0.214 | 0.100 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000463 | 34.338 | 6.546 | n/a | 0.000 | 0.929 | 1.389 | 1.838 | 0.041 | n/a | 1.635 | 21.894 | n/a | n/a | 0.065 | 7.475 | 0.218 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000048c | 24.232 | 3.714 | n/a | 0.000 | 0.834 | 4.322 | 1.491 | 0.042 | n/a | 0.261 | 13.517 | n/a | n/a | 0.051 | 4.548 | 0.188 | 0.051 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000477 | 20.801 | 4.046 | n/a | 1.526 | 1.032 | 0.920 | 2.000 | 0.052 | n/a | 0.344 | 10.822 | n/a | n/a | 0.059 | 6.604 | 0.317 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000049e | 16.949 | 5.811 | n/a | 0.000 | 0.189 | 0.937 | 1.537 | 0.037 | n/a | 0.600 | 7.776 | n/a | n/a | 0.063 | 6.000 | 0.354 | 0.063 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000482 | 13.722 | 3.713 | n/a | 0.000 | 0.389 | 0.873 | 1.633 | 0.036 | n/a | 0.263 | 6.765 | n/a | n/a | 0.049 | 4.103 | 0.299 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004a8 | 11.586 | 3.100 | n/a | 0.000 | 0.519 | 1.456 | 1.294 | 0.031 | n/a | 0.224 | 4.938 | n/a | n/a | 0.024 | 3.619 | 0.312 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 0.119ms |
| aeeb8a184539e80c0000000000000490 | 9.371 | 3.145 | n/a | 0.000 | 0.118 | 0.883 | 1.073 | 0.041 | n/a | 0.634 | 3.440 | n/a | n/a | 0.038 | 3.262 | 0.348 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.919 | 0.616 | 0.000 | 0.978 | 4.523 | 0.956 | 0.000 | 0.150 | 1.888 | 4.976 | 0.046 | n/a | 0.362 | 12.730 | n/a | n/a | 0.056 | 4.966 | 0.190 | 0.056 |
| p99 | 166.543 | 3.988 | 0.007 | 5.120 | 10.764 | n/a | 1.971 | 1.132 | 4.679 | 25.656 | 3.098 | n/a | 2.526 | 152.595 | n/a | n/a | 0.129 | 11.177 | 0.402 | 0.129 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c00000000000004e6 | 166.543 | 9.225 | n/a | 0.000 | 0.485 | 1.128 | 2.639 | 0.035 | n/a | 0.307 | 152.595 | n/a | n/a | 0.129 | 9.710 | 0.058 | 0.129 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004d1 | 59.157 | 10.764 | 0.324 | 0.000 | 0.089 | 3.353 | 25.656 | 0.061 | n/a | 1.318 | 17.546 | n/a | n/a | 0.047 | 11.177 | 0.189 | 0.047 | gw-w/thread-41/gateway.admitted-work | none observed |
| aeeb8a184539e80c00000000000004b7 | 51.790 | 4.778 | 0.288 | 0.000 | 0.077 | 2.182 | 10.224 | 0.052 | n/a | 0.464 | 33.673 | n/a | n/a | 0.053 | 5.142 | 0.099 | 0.053 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004df | 47.906 | 4.615 | 0.365 | 0.000 | 0.086 | 2.473 | 18.466 | 0.041 | n/a | 0.279 | 21.512 | n/a | n/a | 0.069 | 5.066 | 0.106 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004d9 | 46.549 | 5.028 | 0.331 | 0.000 | 0.112 | 2.009 | 13.429 | 0.104 | n/a | 0.474 | 24.983 | n/a | n/a | 0.079 | 5.471 | 0.118 | 0.079 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004d5 | 43.306 | 4.184 | 0.289 | 0.000 | 0.111 | 2.066 | 12.731 | 0.052 | n/a | 0.256 | 23.560 | n/a | n/a | 0.057 | 4.583 | 0.106 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004b8 | 41.665 | 8.452 | n/a | 1.971 | 0.246 | 2.087 | 2.168 | 0.028 | n/a | 0.183 | 26.458 | n/a | n/a | 0.072 | 10.669 | 0.256 | 0.072 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004d3 | 41.487 | 4.523 | 0.220 | 0.000 | 0.071 | 2.069 | 14.109 | 0.048 | n/a | 0.242 | 20.157 | n/a | n/a | 0.048 | 4.814 | 0.116 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004cb | 39.163 | 5.026 | 0.956 | 0.000 | 0.070 | 2.127 | 15.779 | 0.086 | n/a | 0.488 | 14.568 | n/a | n/a | 0.061 | 6.052 | 0.155 | 0.061 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004b0 | 38.039 | 4.893 | 0.281 | 0.000 | 0.067 | 2.028 | 21.130 | 0.048 | n/a | 0.477 | 9.074 | n/a | n/a | 0.040 | 5.241 | 0.138 | 0.040 | gw-w/thread-47/gateway.admitted-work | none observed |
| aeeb8a184539e80c00000000000004bf | 37.361 | 3.873 | 0.215 | 0.000 | 0.075 | 1.911 | 18.107 | 0.045 | n/a | 0.362 | 12.730 | n/a | n/a | 0.042 | 4.163 | 0.111 | 0.042 | gw-w/thread-45/gateway.admitted-work | none observed |
| aeeb8a184539e80c00000000000004e9 | 36.657 | 4.317 | 0.225 | 0.000 | 0.078 | 2.867 | 11.199 | 0.061 | n/a | 0.247 | 17.603 | n/a | n/a | 0.060 | 4.620 | 0.126 | 0.060 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004e1 | 36.072 | 5.780 | n/a | 0.000 | 0.823 | 0.964 | 1.312 | 0.030 | n/a | 0.208 | 26.902 | n/a | n/a | 0.053 | 6.603 | 0.183 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004da | 36.070 | 9.745 | n/a | 0.000 | 0.251 | 1.912 | 3.145 | 0.064 | n/a | 1.155 | 19.745 | n/a | n/a | 0.054 | 9.996 | 0.277 | 0.054 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004ea | 35.243 | 6.841 | n/a | 0.000 | 0.613 | 4.679 | 2.800 | 3.098 | n/a | 0.416 | 16.687 | n/a | n/a | 0.109 | 7.453 | 0.211 | 0.109 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004ba | 34.519 | 4.669 | n/a | 0.000 | 1.132 | 0.989 | 13.971 | 0.046 | n/a | 0.203 | 13.444 | n/a | n/a | 0.066 | 5.801 | 0.168 | 0.066 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004c7 | 32.993 | 4.344 | 0.481 | 0.000 | 0.150 | 2.219 | 12.212 | 0.486 | n/a | 0.398 | 12.633 | n/a | n/a | 0.069 | 4.975 | 0.151 | 0.069 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004cd | 32.035 | 3.985 | 0.315 | 0.000 | 0.067 | 1.835 | 15.675 | 0.067 | n/a | 0.346 | 9.676 | n/a | n/a | 0.069 | 4.366 | 0.136 | 0.069 | gw-w/thread-48/gateway.admitted-work | none observed |
| aeeb8a184539e80c00000000000004c1 | 32.001 | 4.406 | 0.396 | 0.000 | 0.068 | 2.163 | 13.972 | 0.127 | n/a | 0.973 | 9.847 | n/a | n/a | 0.048 | 4.870 | 0.152 | 0.048 | gw-w/thread-43/gateway.admitted-work | none observed |
| aeeb8a184539e80c00000000000004e5 | 29.919 | 4.563 | 0.297 | 0.000 | 0.072 | 2.112 | 9.685 | 0.044 | n/a | 0.267 | 12.823 | n/a | n/a | 0.056 | 4.932 | 0.165 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.514 | 0.610 | 0.000 | 1.871 | 3.744 | n/a | 0.000 | 0.760 | 0.993 | 1.312 | 0.036 | n/a | 0.357 | 9.433 | n/a | n/a | 0.047 | 4.617 | 0.244 | 0.047 |
| p99 | 36.072 | 1.401 | 0.005 | 2.416 | 6.361 | n/a | 0.000 | 0.998 | 1.562 | 4.893 | 0.059 | n/a | 0.587 | 26.902 | n/a | n/a | 0.115 | 6.925 | 0.375 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c00000000000004e1 | 36.072 | 5.780 | n/a | 0.000 | 0.823 | 0.964 | 1.312 | 0.030 | n/a | 0.208 | 26.902 | n/a | n/a | 0.053 | 6.603 | 0.183 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004b2 | 22.841 | 3.744 | n/a | 0.000 | 0.990 | 1.111 | 2.207 | 0.057 | n/a | 0.365 | 14.331 | n/a | n/a | 0.037 | 4.733 | 0.207 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004ae | 21.617 | 3.841 | n/a | 0.000 | 0.990 | 0.988 | 4.893 | 0.059 | n/a | 0.292 | 10.518 | n/a | n/a | 0.037 | 4.831 | 0.223 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004d6 | 21.540 | 6.361 | n/a | 0.000 | 0.565 | 1.562 | 1.894 | 0.049 | n/a | 0.357 | 10.638 | n/a | n/a | 0.115 | 6.925 | 0.322 | 0.115 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004f6 | 20.969 | 3.856 | n/a | 0.000 | 0.760 | 0.993 | 1.625 | 0.042 | n/a | 0.371 | 13.281 | n/a | n/a | 0.040 | 4.617 | 0.220 | 0.040 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004c5 | 16.514 | 3.565 | n/a | 0.000 | 0.578 | 1.103 | 1.382 | 0.038 | n/a | 0.559 | 9.244 | n/a | n/a | 0.047 | 4.143 | 0.251 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004ee | 15.746 | 3.206 | n/a | 0.000 | 0.745 | 0.899 | 0.890 | 0.024 | n/a | 0.501 | 9.433 | n/a | n/a | 0.047 | 3.952 | 0.251 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004bc | 14.915 | 3.262 | n/a | 0.000 | 0.383 | 0.832 | 1.218 | 0.036 | n/a | 0.218 | 8.932 | n/a | n/a | 0.034 | 3.646 | 0.244 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004c3 | 12.687 | 3.896 | n/a | 0.000 | 0.860 | 1.030 | 0.979 | 0.029 | n/a | 0.587 | 5.231 | n/a | n/a | 0.075 | 4.755 | 0.375 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004f8 | 12.508 | 3.445 | n/a | 0.000 | 0.998 | 1.317 | 0.954 | 0.031 | n/a | 0.275 | 5.432 | n/a | n/a | 0.056 | 4.444 | 0.355 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.033 | 0.620 | 0.000 | 1.528 | 4.153 | n/a | 0.000 | 0.180 | 1.767 | 5.171 | 0.040 | n/a | 0.271 | 13.231 | n/a | n/a | 0.052 | 4.627 | 0.199 | 0.052 |
| p99 | 147.062 | 2.391 | 0.000 | 4.200 | 17.535 | n/a | 0.000 | 1.250 | 5.817 | 53.094 | 0.163 | n/a | 1.434 | 133.831 | n/a | n/a | 0.123 | 17.757 | 0.447 | 0.123 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c000000000000054e | 147.062 | 3.736 | 0.235 | 0.000 | 0.081 | 1.811 | 6.963 | 0.074 | n/a | 0.278 | 133.831 | n/a | n/a | 0.052 | 4.051 | 0.028 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000051f | 88.678 | 17.535 | n/a | 0.000 | 0.222 | 5.817 | 50.521 | 0.128 | n/a | 1.265 | 13.125 | n/a | n/a | 0.065 | 17.757 | 0.200 | 0.065 | gw-w/thread-45/storage/begin-command! | none observed |
| aeeb8a184539e80c000000000000051e | 78.544 | 3.877 | 0.375 | 0.000 | 0.064 | 2.034 | 53.094 | 0.059 | n/a | 0.384 | 18.600 | n/a | n/a | 0.055 | 4.317 | 0.055 | 0.055 | gw-w/thread-41/gateway.admitted-work | none observed |
| aeeb8a184539e80c0000000000000503 | 46.760 | 6.211 | n/a | 0.000 | 0.455 | 4.481 | 6.640 | 0.064 | n/a | 1.434 | 27.445 | n/a | n/a | 0.029 | 6.667 | 0.143 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.259ms |
| aeeb8a184539e80c0000000000000540 | 39.871 | 4.153 | 0.261 | 0.000 | 0.164 | 2.125 | 9.172 | 0.051 | n/a | 0.537 | 23.326 | n/a | n/a | 0.083 | 4.578 | 0.115 | 0.083 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000522 | 39.384 | 4.623 | 0.309 | 0.000 | 0.099 | 2.721 | 12.240 | 0.040 | n/a | 0.205 | 19.076 | n/a | n/a | 0.074 | 5.030 | 0.128 | 0.074 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000050e | 38.965 | 4.183 | 0.272 | 0.000 | 0.133 | 2.094 | 13.684 | 0.163 | n/a | 0.291 | 18.083 | n/a | n/a | 0.062 | 4.589 | 0.118 | 0.062 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000501 | 34.822 | 4.515 | 0.229 | 0.000 | 0.057 | 2.112 | 14.029 | 0.057 | n/a | 0.533 | 13.231 | n/a | n/a | 0.060 | 4.800 | 0.138 | 0.060 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000507 | 34.596 | 4.838 | 1.111 | 0.000 | 0.068 | 2.113 | 10.208 | 0.082 | n/a | 0.331 | 15.801 | n/a | n/a | 0.044 | 6.017 | 0.174 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000532 | 33.273 | 3.730 | 0.304 | 0.000 | 0.070 | 1.875 | 5.141 | 0.031 | n/a | 0.143 | 21.927 | n/a | n/a | 0.053 | 4.104 | 0.123 | 0.053 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000546 | 32.359 | 8.363 | 0.316 | 0.000 | 0.110 | 2.001 | 5.969 | 0.045 | n/a | 0.245 | 15.230 | n/a | n/a | 0.080 | 8.789 | 0.272 | 0.080 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000054a | 32.320 | 5.705 | 0.245 | 0.000 | 0.122 | 1.832 | 9.235 | 0.043 | n/a | 0.223 | 14.854 | n/a | n/a | 0.062 | 6.072 | 0.188 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000502 | 32.250 | 4.700 | n/a | 0.000 | 1.250 | 0.870 | 5.122 | 0.097 | n/a | 0.343 | 19.790 | n/a | n/a | 0.078 | 5.951 | 0.185 | 0.078 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000052b | 31.978 | 5.462 | n/a | 0.000 | 0.891 | 0.979 | 2.675 | 0.071 | n/a | 0.552 | 21.293 | n/a | n/a | 0.055 | 6.353 | 0.199 | 0.055 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000050f | 31.515 | 7.635 | n/a | 0.000 | 0.964 | 0.846 | 2.188 | 0.031 | n/a | 0.266 | 19.497 | n/a | n/a | 0.089 | 8.599 | 0.273 | 0.089 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000052a | 31.144 | 5.572 | 0.381 | 0.000 | 0.065 | 1.820 | 11.694 | 0.033 | n/a | 0.185 | 11.341 | n/a | n/a | 0.054 | 6.018 | 0.193 | 0.054 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000050a | 28.690 | 5.640 | 0.372 | 0.000 | 0.063 | 2.200 | 9.698 | 0.042 | n/a | 0.159 | 10.476 | n/a | n/a | 0.039 | 6.075 | 0.212 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000536 | 26.678 | 3.909 | 0.266 | 0.000 | 0.063 | 2.062 | 6.172 | 0.031 | n/a | 0.166 | 13.968 | n/a | n/a | 0.040 | 4.239 | 0.159 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000541 | 26.417 | 3.715 | n/a | 0.000 | 1.130 | 1.023 | 1.217 | 0.037 | n/a | 0.414 | 18.831 | n/a | n/a | 0.051 | 4.844 | 0.183 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000053e | 26.074 | 3.692 | 0.265 | 0.000 | 0.062 | 1.825 | 8.931 | 0.039 | n/a | 0.153 | 11.058 | n/a | n/a | 0.050 | 4.019 | 0.154 | 0.050 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.202 | 0.816 | 0.000 | 1.700 | 3.715 | n/a | 0.000 | 0.802 | 0.910 | 1.130 | 0.034 | n/a | 0.378 | 12.629 | n/a | n/a | 0.050 | 4.308 | 0.215 | 0.050 |
| p99 | 32.250 | 1.670 | 0.000 | 2.721 | 5.085 | n/a | 0.000 | 1.250 | 2.435 | 5.122 | 0.097 | n/a | 0.976 | 19.790 | n/a | n/a | 0.123 | 6.063 | 0.353 | 0.123 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c0000000000000502 | 32.250 | 4.700 | n/a | 0.000 | 1.250 | 0.870 | 5.122 | 0.097 | n/a | 0.343 | 19.790 | n/a | n/a | 0.078 | 5.951 | 0.185 | 0.078 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000541 | 26.417 | 3.715 | n/a | 0.000 | 1.130 | 1.023 | 1.217 | 0.037 | n/a | 0.414 | 18.831 | n/a | n/a | 0.051 | 4.844 | 0.183 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004ff | 25.496 | 5.085 | n/a | 0.000 | 0.978 | 0.916 | 1.130 | 0.041 | n/a | 0.588 | 16.709 | n/a | n/a | 0.050 | 6.063 | 0.238 | 0.050 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000051a | 22.311 | 3.408 | n/a | 0.000 | 0.718 | 0.909 | 1.495 | 0.048 | n/a | 0.378 | 15.311 | n/a | n/a | 0.044 | 4.125 | 0.185 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000533 | 21.960 | 3.448 | n/a | 0.000 | 1.032 | 0.898 | 0.768 | 0.027 | n/a | 0.452 | 15.293 | n/a | n/a | 0.042 | 4.481 | 0.204 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000052f | 21.711 | 3.415 | n/a | 0.000 | 0.595 | 1.020 | 0.599 | 0.024 | n/a | 0.207 | 15.813 | n/a | n/a | 0.038 | 4.010 | 0.185 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000517 | 20.898 | 4.666 | n/a | 0.000 | 1.148 | 0.910 | 1.412 | 0.032 | n/a | 0.250 | 12.380 | n/a | n/a | 0.099 | 5.815 | 0.278 | 0.099 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000513 | 20.202 | 3.506 | n/a | 0.000 | 0.802 | 0.891 | 1.129 | 0.034 | n/a | 0.479 | 13.309 | n/a | n/a | 0.051 | 4.308 | 0.213 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000004fc | 19.832 | 3.817 | n/a | 0.000 | 0.255 | 1.078 | 1.050 | 0.033 | n/a | 0.911 | 12.629 | n/a | n/a | 0.059 | 4.072 | 0.205 | 0.059 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000053b | 18.967 | 3.788 | n/a | 0.000 | 0.332 | 2.435 | 2.251 | 0.077 | n/a | 0.976 | 8.985 | n/a | n/a | 0.123 | 4.120 | 0.217 | 0.123 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000515 | 18.628 | 3.352 | n/a | 0.000 | 0.648 | 0.921 | 1.112 | 0.039 | n/a | 0.271 | 12.241 | n/a | n/a | 0.045 | 4.000 | 0.215 | 0.045 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000525 | 17.117 | 3.675 | n/a | 0.000 | 0.431 | 0.934 | 0.954 | 0.036 | n/a | 0.620 | 10.422 | n/a | n/a | 0.046 | 4.105 | 0.240 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000537 | 15.579 | 4.378 | n/a | 0.000 | 1.125 | 0.872 | 0.725 | 0.034 | n/a | 0.254 | 8.111 | n/a | n/a | 0.080 | 5.502 | 0.353 | 0.080 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000054b | 14.990 | 3.592 | n/a | 0.000 | 1.035 | 0.842 | 1.295 | 0.031 | n/a | 0.235 | 7.914 | n/a | n/a | 0.046 | 4.627 | 0.309 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000050c | 14.540 | 4.068 | n/a | 0.000 | 0.180 | 0.908 | 1.785 | 0.033 | n/a | 0.168 | 7.350 | n/a | n/a | 0.049 | 4.248 | 0.292 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.720 | 0.696 | 0.000 | 1.508 | 4.312 | n/a | 0.000 | 0.291 | 1.718 | 3.682 | 0.038 | n/a | 0.453 | 9.224 | n/a | n/a | 0.050 | 4.876 | 0.240 | 0.050 |
| p99 | 63.233 | 2.951 | 2.975 | 5.209 | 8.336 | n/a | 4.124 | 1.758 | 6.797 | 23.760 | 0.123 | n/a | 4.211 | 51.247 | n/a | n/a | 0.115 | 11.840 | 0.459 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c0000000000000572 | 63.233 | 4.258 | 0.342 | 0.000 | 0.103 | 1.924 | 4.993 | 0.039 | n/a | 0.221 | 51.247 | n/a | n/a | 0.106 | 4.703 | 0.074 | 0.106 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000562 | 57.134 | 3.966 | 0.295 | 0.000 | 0.072 | 3.664 | 23.760 | 0.079 | n/a | 0.298 | 24.960 | n/a | n/a | 0.041 | 4.333 | 0.076 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000596 | 41.144 | 4.312 | 0.265 | 0.000 | 0.063 | 5.022 | 10.658 | 0.043 | n/a | 0.210 | 20.529 | n/a | n/a | 0.042 | 4.640 | 0.113 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000589 | 40.596 | 7.271 | n/a | 4.124 | 0.444 | 0.950 | 6.238 | 0.060 | n/a | 4.211 | 17.182 | n/a | n/a | 0.115 | 11.840 | 0.292 | 0.115 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000578 | 38.889 | 4.344 | n/a | 0.000 | 1.758 | 2.112 | 1.099 | 0.028 | n/a | 1.217 | 28.257 | n/a | n/a | 0.073 | 6.103 | 0.157 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.000ms |
| aeeb8a184539e80c0000000000000551 | 34.352 | 3.408 | 0.277 | 0.000 | 0.021 | 3.374 | 9.034 | 0.096 | n/a | 0.808 | 17.306 | n/a | n/a | 0.029 | 3.706 | 0.108 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000057f | 31.979 | 5.090 | n/a | 0.000 | 0.433 | 1.066 | 19.842 | 0.053 | n/a | 0.220 | 5.179 | n/a | n/a | 0.096 | 5.523 | 0.173 | 0.096 | gw-w/thread-48/commit.prepare-and-validate | none observed |
| aeeb8a184539e80c0000000000000574 | 31.660 | 3.992 | 0.243 | 0.000 | 0.072 | 1.971 | 11.167 | 0.038 | n/a | 0.183 | 13.926 | n/a | n/a | 0.068 | 4.307 | 0.136 | 0.068 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000055b | 31.045 | 4.246 | 0.193 | 0.000 | 0.070 | 2.216 | 8.586 | 0.036 | n/a | 0.417 | 15.235 | n/a | n/a | 0.047 | 4.508 | 0.145 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000577 | 30.902 | 8.336 | n/a | 0.000 | 0.456 | 1.465 | 4.551 | 0.053 | n/a | 0.247 | 15.721 | n/a | n/a | 0.074 | 8.792 | 0.285 | 0.074 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000582 | 29.806 | 4.201 | 0.210 | 0.000 | 0.062 | 1.810 | 4.560 | 0.037 | n/a | 0.462 | 18.422 | n/a | n/a | 0.042 | 4.473 | 0.150 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000550 | 28.609 | 4.667 | n/a | 0.000 | 0.722 | 6.797 | 7.397 | 0.071 | n/a | 0.244 | 8.655 | n/a | n/a | 0.056 | 5.390 | 0.188 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000576 | 28.254 | 4.001 | 0.240 | 0.000 | 0.080 | 1.831 | 9.291 | 0.066 | n/a | 1.027 | 11.669 | n/a | n/a | 0.050 | 4.321 | 0.153 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000059f | 28.149 | 4.702 | 0.227 | 0.000 | 0.114 | 2.051 | 9.734 | 0.066 | n/a | 0.433 | 10.760 | n/a | n/a | 0.063 | 5.043 | 0.179 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000058c | 26.796 | 4.531 | 0.179 | 0.000 | 0.060 | 1.982 | 8.913 | 0.030 | n/a | 0.411 | 10.649 | n/a | n/a | 0.041 | 4.770 | 0.178 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000588 | 25.755 | 5.132 | 0.353 | 0.000 | 0.062 | 1.915 | 8.834 | 0.051 | n/a | 0.841 | 8.518 | n/a | n/a | 0.050 | 5.546 | 0.215 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000597 | 25.676 | 5.865 | n/a | 0.000 | 0.594 | 4.385 | 11.127 | 0.123 | n/a | 1.426 | 2.083 | n/a | n/a | 0.072 | 6.459 | 0.252 | 0.072 | node-14/thread-0/driver.execute | none observed |
| aeeb8a184539e80c000000000000057e | 24.691 | 4.750 | 0.229 | 0.000 | 0.053 | 2.113 | 6.575 | 0.031 | n/a | 0.398 | 10.505 | n/a | n/a | 0.037 | 5.033 | 0.204 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000557 | 24.151 | 4.367 | n/a | 0.000 | 0.570 | 0.867 | 0.728 | 0.025 | n/a | 0.496 | 17.069 | n/a | n/a | 0.029 | 4.937 | 0.204 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000564 | 23.903 | 3.377 | 0.279 | 0.000 | 0.088 | 1.833 | 7.006 | 0.038 | n/a | 0.384 | 10.856 | n/a | n/a | 0.042 | 3.743 | 0.157 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.461 | 0.696 | 0.000 | 1.667 | 4.344 | n/a | 0.000 | 0.722 | 1.004 | 1.224 | 0.034 | n/a | 0.476 | 6.961 | n/a | n/a | 0.058 | 4.887 | 0.291 | 0.058 |
| p99 | 38.889 | 1.957 | 2.975 | 5.209 | 7.273 | n/a | 0.000 | 1.758 | 6.797 | 11.127 | 0.123 | n/a | 4.089 | 28.257 | n/a | n/a | 0.109 | 8.730 | 0.459 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c0000000000000578 | 38.889 | 4.344 | n/a | 0.000 | 1.758 | 2.112 | 1.099 | 0.028 | n/a | 1.217 | 28.257 | n/a | n/a | 0.073 | 6.103 | 0.157 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.000ms |
| aeeb8a184539e80c0000000000000550 | 28.609 | 4.667 | n/a | 0.000 | 0.722 | 6.797 | 7.397 | 0.071 | n/a | 0.244 | 8.655 | n/a | n/a | 0.056 | 5.390 | 0.188 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000597 | 25.676 | 5.865 | n/a | 0.000 | 0.594 | 4.385 | 11.127 | 0.123 | n/a | 1.426 | 2.083 | n/a | n/a | 0.072 | 6.459 | 0.252 | 0.072 | node-14/thread-0/driver.execute | none observed |
| aeeb8a184539e80c0000000000000554 | 23.502 | 4.069 | n/a | 0.000 | 0.807 | 0.890 | 4.742 | 0.059 | n/a | 0.284 | 12.602 | n/a | n/a | 0.049 | 4.876 | 0.207 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000055d | 21.633 | 7.273 | n/a | 0.000 | 0.173 | 1.092 | 0.790 | 0.027 | n/a | 0.471 | 11.740 | n/a | n/a | 0.067 | 7.446 | 0.344 | 0.067 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000559 | 19.367 | 3.716 | n/a | 0.000 | 0.757 | 0.909 | 1.352 | 0.037 | n/a | 0.495 | 12.047 | n/a | n/a | 0.054 | 4.472 | 0.231 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000056f | 19.016 | 7.054 | n/a | 0.000 | 1.676 | 1.082 | 1.513 | 0.062 | n/a | 0.574 | 6.961 | n/a | n/a | 0.094 | 8.730 | 0.459 | 0.094 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000583 | 16.971 | 4.466 | n/a | 0.000 | 0.420 | 1.370 | 0.855 | 0.027 | n/a | 4.089 | 5.656 | n/a | n/a | 0.088 | 4.887 | 0.288 | 0.088 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005a4 | 15.461 | 3.496 | n/a | 0.000 | 1.013 | 0.950 | 1.837 | 0.062 | n/a | 0.447 | 7.614 | n/a | n/a | 0.042 | 4.509 | 0.292 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000059c | 15.251 | 5.205 | n/a | 0.000 | 0.185 | 0.992 | 1.080 | 0.029 | n/a | 0.236 | 7.420 | n/a | n/a | 0.104 | 5.389 | 0.353 | 0.104 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005aa | 14.913 | 4.865 | n/a | 0.000 | 0.543 | 1.004 | 1.064 | 0.028 | n/a | 0.555 | 6.795 | n/a | n/a | 0.059 | 5.407 | 0.363 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000058f | 14.905 | 3.026 | n/a | 0.000 | 0.878 | 0.965 | 3.682 | 0.042 | n/a | 0.751 | 5.537 | n/a | n/a | 0.024 | 3.904 | 0.262 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000565 | 13.393 | 3.562 | n/a | 0.000 | 0.340 | 0.892 | 0.611 | 0.028 | n/a | 0.234 | 7.617 | n/a | n/a | 0.109 | 3.902 | 0.291 | 0.109 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000593 | 12.688 | 3.173 | n/a | 0.000 | 1.023 | 1.962 | 1.425 | 0.034 | n/a | 0.412 | 4.626 | n/a | n/a | 0.034 | 4.196 | 0.331 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005af | 11.888 | 3.586 | n/a | 0.000 | 0.291 | 0.845 | 1.224 | 0.052 | n/a | 0.713 | 5.128 | n/a | n/a | 0.050 | 3.876 | 0.326 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000058d | 11.872 | 4.386 | n/a | 0.000 | 0.963 | 1.048 | 0.571 | 0.026 | n/a | 0.476 | 4.343 | n/a | n/a | 0.058 | 5.350 | 0.451 | 0.058 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.251 | 0.584 | 0.000 | 1.401 | 4.773 | n/a | 0.000 | 0.119 | 1.789 | 3.871 | 0.035 | n/a | 0.302 | 9.604 | n/a | n/a | 0.056 | 5.148 | 0.227 | 0.056 |
| p99 | 68.916 | 3.179 | 0.000 | 9.121 | 14.717 | n/a | 0.000 | 1.112 | 4.722 | 51.883 | 0.099 | n/a | 1.345 | 50.722 | n/a | n/a | 0.147 | 15.810 | 0.593 | 0.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c00000000000005ed | 68.916 | 4.785 | n/a | 0.000 | 0.101 | 0.924 | 51.883 | 0.069 | n/a | 0.193 | 10.913 | n/a | n/a | 0.050 | 4.885 | 0.071 | 0.050 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| aeeb8a184539e80c00000000000005b8 | 61.070 | 6.923 | n/a | 0.000 | 0.974 | 0.994 | 0.930 | 0.027 | n/a | 0.431 | 50.722 | n/a | n/a | 0.069 | 7.897 | 0.129 | 0.069 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005ca | 44.955 | 5.061 | 0.198 | 0.000 | 0.073 | 2.079 | 22.430 | 0.036 | n/a | 0.187 | 14.835 | n/a | n/a | 0.055 | 5.333 | 0.119 | 0.055 | gw-w/thread-48/gateway.admitted-work | none observed |
| aeeb8a184539e80c00000000000005e5 | 40.199 | 8.086 | n/a | 0.000 | 1.033 | 4.722 | 3.269 | 0.099 | n/a | 1.345 | 21.498 | n/a | n/a | 0.147 | 9.119 | 0.227 | 0.147 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005c2 | 36.566 | 4.264 | 0.225 | 0.000 | 0.096 | 1.992 | 14.380 | 0.033 | n/a | 0.323 | 15.143 | n/a | n/a | 0.109 | 4.585 | 0.125 | 0.109 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c0000000000000605 | 36.183 | 3.457 | 0.309 | 0.000 | 0.066 | 1.832 | 17.478 | 0.035 | n/a | 0.186 | 12.765 | n/a | n/a | 0.056 | 3.832 | 0.106 | 0.056 | gw-w/thread-41/gateway.admitted-work | none observed |
| aeeb8a184539e80c00000000000005f1 | 33.506 | 6.117 | n/a | 0.000 | 0.843 | 1.075 | 7.087 | 0.041 | n/a | 0.206 | 18.067 | n/a | n/a | 0.070 | 6.960 | 0.208 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005ec | 32.642 | 4.336 | 0.270 | 0.000 | 0.078 | 1.971 | 13.715 | 0.098 | n/a | 0.306 | 11.810 | n/a | n/a | 0.058 | 4.684 | 0.144 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005ff | 31.884 | 4.866 | 0.217 | 0.000 | 0.065 | 2.137 | 11.858 | 0.057 | n/a | 0.784 | 11.842 | n/a | n/a | 0.056 | 5.148 | 0.161 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005e8 | 28.378 | 5.555 | 0.459 | 0.000 | 0.067 | 2.109 | 10.115 | 0.064 | n/a | 0.177 | 9.760 | n/a | n/a | 0.072 | 6.081 | 0.214 | 0.072 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005b7 | 28.376 | 5.073 | 0.289 | 0.000 | 0.061 | 1.927 | 6.350 | 0.033 | n/a | 0.156 | 14.429 | n/a | n/a | 0.058 | 5.423 | 0.191 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005fa | 27.152 | 4.773 | 0.197 | 0.000 | 0.055 | 1.914 | 6.445 | 0.052 | n/a | 0.788 | 12.883 | n/a | n/a | 0.046 | 5.025 | 0.185 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005dc | 26.965 | 5.007 | 0.252 | 0.000 | 0.064 | 4.410 | 5.466 | 0.033 | n/a | 0.335 | 11.356 | n/a | n/a | 0.042 | 5.323 | 0.197 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005f0 | 26.761 | 3.399 | 0.200 | 0.000 | 0.063 | 1.879 | 5.686 | 0.079 | n/a | 0.488 | 14.923 | n/a | n/a | 0.044 | 3.662 | 0.137 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005e9 | 26.658 | 14.717 | n/a | 0.000 | 1.093 | 1.142 | 1.464 | 0.036 | n/a | 0.715 | 7.362 | n/a | n/a | 0.130 | 15.810 | 0.593 | 0.130 | node-14/thread-0/driver.publication | none observed |
| aeeb8a184539e80c00000000000005e4 | 26.465 | 4.121 | 0.302 | 0.000 | 0.100 | 2.071 | 5.435 | 0.036 | n/a | 0.387 | 13.936 | n/a | n/a | 0.077 | 4.524 | 0.171 | 0.077 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005e2 | 25.672 | 4.878 | 0.241 | 0.000 | 0.066 | 1.984 | 8.297 | 0.034 | n/a | 0.188 | 9.942 | n/a | n/a | 0.042 | 5.185 | 0.202 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005d8 | 24.791 | 3.538 | 0.183 | 0.000 | 0.068 | 2.032 | 7.561 | 0.031 | n/a | 0.149 | 11.188 | n/a | n/a | 0.040 | 3.789 | 0.153 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005fd | 23.448 | 4.013 | 0.248 | 0.000 | 0.109 | 2.031 | 3.871 | 0.024 | n/a | 0.429 | 12.648 | n/a | n/a | 0.076 | 4.369 | 0.186 | 0.076 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005dd | 22.928 | 3.767 | n/a | 0.000 | 0.943 | 0.937 | 1.751 | 0.065 | n/a | 0.391 | 15.024 | n/a | n/a | 0.050 | 4.709 | 0.205 | 0.050 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.012 | 1.029 | 0.000 | 1.940 | 4.253 | n/a | 0.000 | 0.733 | 1.035 | 1.464 | 0.035 | n/a | 0.362 | 5.959 | n/a | n/a | 0.060 | 4.925 | 0.341 | 0.060 |
| p99 | 68.916 | 2.842 | 0.000 | 9.121 | 14.717 | n/a | 0.000 | 1.093 | 4.722 | 51.883 | 0.099 | n/a | 1.345 | 21.498 | n/a | n/a | 0.147 | 15.810 | 0.593 | 0.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c00000000000005ed | 68.916 | 4.785 | n/a | 0.000 | 0.101 | 0.924 | 51.883 | 0.069 | n/a | 0.193 | 10.913 | n/a | n/a | 0.050 | 4.885 | 0.071 | 0.050 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| aeeb8a184539e80c00000000000005e5 | 40.199 | 8.086 | n/a | 0.000 | 1.033 | 4.722 | 3.269 | 0.099 | n/a | 1.345 | 21.498 | n/a | n/a | 0.147 | 9.119 | 0.227 | 0.147 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005f1 | 33.506 | 6.117 | n/a | 0.000 | 0.843 | 1.075 | 7.087 | 0.041 | n/a | 0.206 | 18.067 | n/a | n/a | 0.070 | 6.960 | 0.208 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005e9 | 26.658 | 14.717 | n/a | 0.000 | 1.093 | 1.142 | 1.464 | 0.036 | n/a | 0.715 | 7.362 | n/a | n/a | 0.130 | 15.810 | 0.593 | 0.130 | node-14/thread-0/driver.publication | none observed |
| aeeb8a184539e80c00000000000005dd | 22.928 | 3.767 | n/a | 0.000 | 0.943 | 0.937 | 1.751 | 0.065 | n/a | 0.391 | 15.024 | n/a | n/a | 0.050 | 4.709 | 0.205 | 0.050 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005d1 | 16.936 | 4.106 | n/a | 0.000 | 0.819 | 1.122 | 0.949 | 0.031 | n/a | 0.253 | 9.604 | n/a | n/a | 0.052 | 4.925 | 0.291 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005cb | 16.300 | 5.691 | n/a | 0.000 | 0.307 | 1.977 | 1.770 | 0.070 | n/a | 0.457 | 5.959 | n/a | n/a | 0.070 | 5.998 | 0.368 | 0.070 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005f7 | 14.012 | 4.790 | n/a | 0.000 | 1.046 | 1.040 | 1.553 | 0.035 | n/a | 1.081 | 4.407 | n/a | n/a | 0.060 | 5.835 | 0.416 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005d5 | 13.111 | 3.747 | n/a | 0.000 | 0.483 | 1.035 | 0.733 | 0.029 | n/a | 0.201 | 6.842 | n/a | n/a | 0.042 | 4.229 | 0.323 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005b2 | 12.461 | 3.528 | n/a | 0.000 | 0.720 | 0.863 | 1.304 | 0.044 | n/a | 0.660 | 5.305 | n/a | n/a | 0.037 | 4.249 | 0.341 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005b4 | 12.294 | 3.665 | n/a | 0.000 | 0.537 | 0.823 | 1.182 | 0.032 | n/a | 0.222 | 5.787 | n/a | n/a | 0.046 | 4.202 | 0.342 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005cd | 12.163 | 4.452 | n/a | 0.000 | 0.733 | 0.949 | 1.068 | 0.027 | n/a | 0.362 | 4.495 | n/a | n/a | 0.076 | 5.185 | 0.426 | 0.076 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005f5 | 12.124 | 4.244 | n/a | 0.000 | 0.927 | 0.888 | 0.669 | 0.026 | n/a | 0.450 | 4.884 | n/a | n/a | 0.036 | 5.170 | 0.426 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c00000000000005fb | 11.979 | 3.351 | n/a | 0.000 | 0.222 | 2.860 | 5.453 | 0.012 | n/a | 0.000 | 0.000 | n/a | n/a | 0.081 | 3.573 | 0.298 | 0.081 | node-14/thread-0/driver.execute | none observed |
| aeeb8a184539e80c00000000000005c3 | 11.374 | 4.253 | n/a | 0.000 | 0.244 | 0.952 | 0.930 | 0.032 | n/a | 0.298 | 4.565 | n/a | n/a | 0.098 | 4.497 | 0.395 | 0.098 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (845 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.697 | 0.846 | 0.000 | 1.717 | 4.006 | n/a | 0.000 | 0.844 | 1.017 | 1.115 | 0.032 | n/a | 0.301 | 7.777 | n/a | n/a | 0.039 | 5.160 | 0.314 | 0.039 |
| p99 | 100.296 | 3.278 | 0.942 | 5.610 | 37.469 | n/a | 2.148 | 31.698 | 25.118 | 16.999 | 4.805 | n/a | 5.282 | 60.732 | n/a | n/a | 0.114 | 54.903 | 0.999 | 0.114 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c0000000000000a50 | 132.144 | 6.608 | n/a | 0.000 | 31.760 | 1.758 | 50.621 | 0.094 | n/a | 4.982 | 36.259 | n/a | n/a | 0.062 | 38.368 | 0.290 | 0.062 | gw-w/thread-45/commit.prepare-and-validate | driver.publication 4.139ms; driver.publication 4.068ms; driver.publication 2.707ms; driver.publication 1.610ms; driver.publication 1.414ms |
| aeeb8a184539e80c00000000000008fa | 126.488 | 4.216 | n/a | 0.000 | 58.740 | 3.764 | 1.236 | 0.031 | n/a | 3.097 | 55.345 | n/a | n/a | 0.060 | 62.956 | 0.498 | 0.060 | node-14/thread-0/driver.queue.subject | driver.publication 2.156ms; driver.publication 1.615ms; driver.expected-state.bind-receipt 1.373ms; driver.publication 1.367ms; driver.publication 1.260ms |
| aeeb8a184539e80c00000000000006ea | 106.720 | 22.051 | n/a | 0.000 | 1.682 | 1.363 | 4.742 | 0.061 | n/a | 0.794 | 75.993 | n/a | n/a | 0.034 | 23.733 | 0.222 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aeeb8a184539e80c000000000000076d | 102.428 | 4.270 | n/a | 0.000 | 14.393 | 1.017 | 1.179 | 0.038 | n/a | 0.243 | 81.254 | n/a | n/a | 0.033 | 18.663 | 0.182 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.434ms; driver.publication 2.208ms; driver.publication 1.608ms |
| aeeb8a184539e80c0000000000000a56 | 102.358 | 9.202 | n/a | 0.000 | 4.786 | 37.922 | 2.085 | 10.722 | n/a | 4.646 | 32.948 | n/a | n/a | 0.048 | 13.988 | 0.137 | 0.048 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.120ms; driver.publication 1.886ms; driver.expected-state.bind-receipt 1.366ms |
| aeeb8a184539e80c00000000000006ed | 101.926 | 96.564 | n/a | 0.000 | 5.306 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.055 | 101.871 | 0.999 | 0.055 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.401ms; driver.publication 1.350ms; driver.publication 1.304ms; driver.publication 1.092ms |
| aeeb8a184539e80c0000000000000a58 | 101.281 | 9.406 | n/a | 0.000 | 6.273 | 42.464 | 0.779 | 5.549 | n/a | 0.317 | 36.374 | n/a | n/a | 0.119 | 15.679 | 0.155 | 0.119 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.304ms; driver.publication 2.135ms; driver.publication 1.886ms |
| aeeb8a184539e80c0000000000000770 | 101.181 | 94.345 | n/a | 3.289 | 3.509 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.039 | 101.142 | 1.000 | 0.039 | node-14/thread-0/client.persist-and-resolve | driver.publication 2.434ms; driver.publication 2.379ms; driver.publication 1.608ms; driver.publication 1.598ms; driver.publication 1.150ms |
| aeeb8a184539e80c000000000000076c | 100.296 | 11.485 | n/a | 0.000 | 3.453 | 1.081 | 1.735 | 0.035 | n/a | 1.220 | 81.234 | n/a | n/a | 0.053 | 14.938 | 0.149 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.434ms; driver.publication 2.208ms |
| aeeb8a184539e80c00000000000006eb | 98.695 | 8.825 | n/a | 0.000 | 9.694 | 1.584 | 10.703 | 0.021 | n/a | 0.450 | 67.364 | n/a | n/a | 0.052 | 18.520 | 0.188 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.401ms |
| aeeb8a184539e80c0000000000000773 | 97.896 | 8.176 | n/a | 0.000 | 2.108 | 35.619 | 1.626 | 0.030 | n/a | 4.426 | 45.858 | n/a | n/a | 0.054 | 10.284 | 0.105 | 0.054 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 2.379ms; driver.publication 1.608ms; driver.publication 1.598ms; driver.publication 1.483ms; driver.publication 1.150ms |
| aeeb8a184539e80c0000000000000a57 | 96.539 | 9.477 | n/a | 0.000 | 1.047 | 33.140 | 10.523 | 5.413 | n/a | 0.297 | 36.566 | n/a | n/a | 0.077 | 10.525 | 0.109 | 0.077 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 2.135ms; driver.publication 1.886ms |
| aeeb8a184539e80c00000000000006ee | 96.361 | 7.261 | n/a | 0.000 | 2.161 | 1.072 | 1.485 | 0.071 | n/a | 5.282 | 78.964 | n/a | n/a | 0.066 | 9.422 | 0.098 | 0.066 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.401ms; driver.publication 1.350ms; driver.publication 1.304ms; driver.publication 1.092ms |
| aeeb8a184539e80c00000000000006ec | 95.789 | 7.525 | n/a | 0.000 | 7.008 | 3.103 | 1.240 | 1.487 | n/a | 0.210 | 75.146 | n/a | n/a | 0.069 | 14.533 | 0.152 | 0.069 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.401ms; driver.publication 1.350ms |
| aeeb8a184539e80c0000000000000ac6 | 94.795 | 10.561 | n/a | 0.000 | 2.896 | 10.081 | 8.799 | 0.048 | n/a | 0.227 | 62.148 | n/a | n/a | 0.035 | 13.456 | 0.142 | 0.035 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 2.084ms; driver.publication 1.328ms; driver.publication 1.184ms |
| aeeb8a184539e80c000000000000076f | 94.417 | 7.850 | n/a | 0.000 | 5.494 | 6.166 | 37.633 | 0.084 | n/a | 0.357 | 36.798 | n/a | n/a | 0.033 | 13.344 | 0.141 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.434ms; driver.publication 2.208ms; driver.publication 1.608ms; driver.publication 1.598ms |
| aeeb8a184539e80c0000000000000a5a | 92.713 | 12.948 | n/a | 0.000 | 5.667 | 17.459 | 8.773 | 1.703 | n/a | 0.283 | 45.826 | n/a | n/a | 0.052 | 18.615 | 0.201 | 0.052 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 4.958ms; driver.publication 2.304ms; driver.expected-state.bind-receipt 2.226ms; driver.publication 2.135ms; driver.publication 1.886ms |
| aeeb8a184539e80c0000000000000772 | 91.993 | 6.724 | n/a | 0.000 | 0.659 | 5.447 | 1.777 | 29.786 | n/a | 0.075 | 47.451 | n/a | n/a | 0.074 | 7.384 | 0.080 | 0.074 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.379ms; driver.publication 1.608ms; driver.publication 1.598ms; driver.publication 1.150ms; driver.expected-state.bind-receipt 1.107ms |
| aeeb8a184539e80c0000000000000a5d | 90.657 | 2.289 | n/a | 0.000 | 70.905 | 1.689 | 1.969 | 0.065 | n/a | 1.014 | 12.683 | n/a | n/a | 0.043 | 73.194 | 0.807 | 0.043 | node-14/thread-0/driver.queue.subject | driver.publication 4.958ms; driver.publication 4.213ms; driver.publication 2.304ms; driver.expected-state.bind-receipt 2.226ms; driver.publication 2.135ms |
| aeeb8a184539e80c0000000000000a59 | 87.106 | 16.195 | n/a | 0.000 | 0.139 | 22.455 | 13.335 | 0.070 | n/a | 3.096 | 31.729 | n/a | n/a | 0.086 | 16.334 | 0.188 | 0.086 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 4.958ms; driver.publication 2.304ms; driver.publication 2.135ms; driver.publication 1.886ms |

## P2 / L1024 / commit / 5-10 facts (490 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.712 | 0.714 | 0.000 | 1.574 | 3.531 | n/a | 0.000 | 0.870 | 1.018 | 0.935 | 0.031 | n/a | 0.288 | 6.990 | n/a | n/a | 0.039 | 4.657 | 0.311 | 0.039 |
| p99 | 101.281 | 2.451 | 2.538 | 5.310 | 40.643 | n/a | 2.344 | 35.950 | 20.935 | 10.523 | 4.850 | n/a | 5.650 | 55.345 | n/a | n/a | 0.114 | 62.956 | 0.999 | 0.114 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c00000000000008fa | 126.488 | 4.216 | n/a | 0.000 | 58.740 | 3.764 | 1.236 | 0.031 | n/a | 3.097 | 55.345 | n/a | n/a | 0.060 | 62.956 | 0.498 | 0.060 | node-14/thread-0/driver.queue.subject | driver.publication 2.156ms; driver.publication 1.615ms; driver.expected-state.bind-receipt 1.373ms; driver.publication 1.367ms; driver.publication 1.260ms |
| aeeb8a184539e80c000000000000076d | 102.428 | 4.270 | n/a | 0.000 | 14.393 | 1.017 | 1.179 | 0.038 | n/a | 0.243 | 81.254 | n/a | n/a | 0.033 | 18.663 | 0.182 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.434ms; driver.publication 2.208ms; driver.publication 1.608ms |
| aeeb8a184539e80c0000000000000a56 | 102.358 | 9.202 | n/a | 0.000 | 4.786 | 37.922 | 2.085 | 10.722 | n/a | 4.646 | 32.948 | n/a | n/a | 0.048 | 13.988 | 0.137 | 0.048 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.120ms; driver.publication 1.886ms; driver.expected-state.bind-receipt 1.366ms |
| aeeb8a184539e80c00000000000006ed | 101.926 | 96.564 | n/a | 0.000 | 5.306 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.055 | 101.871 | 0.999 | 0.055 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.401ms; driver.publication 1.350ms; driver.publication 1.304ms; driver.publication 1.092ms |
| aeeb8a184539e80c0000000000000a58 | 101.281 | 9.406 | n/a | 0.000 | 6.273 | 42.464 | 0.779 | 5.549 | n/a | 0.317 | 36.374 | n/a | n/a | 0.119 | 15.679 | 0.155 | 0.119 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.304ms; driver.publication 2.135ms; driver.publication 1.886ms |
| aeeb8a184539e80c0000000000000770 | 101.181 | 94.345 | n/a | 3.289 | 3.509 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.039 | 101.142 | 1.000 | 0.039 | node-14/thread-0/client.persist-and-resolve | driver.publication 2.434ms; driver.publication 2.379ms; driver.publication 1.608ms; driver.publication 1.598ms; driver.publication 1.150ms |
| aeeb8a184539e80c0000000000000a57 | 96.539 | 9.477 | n/a | 0.000 | 1.047 | 33.140 | 10.523 | 5.413 | n/a | 0.297 | 36.566 | n/a | n/a | 0.077 | 10.525 | 0.109 | 0.077 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 2.135ms; driver.publication 1.886ms |
| aeeb8a184539e80c00000000000006ec | 95.789 | 7.525 | n/a | 0.000 | 7.008 | 3.103 | 1.240 | 1.487 | n/a | 0.210 | 75.146 | n/a | n/a | 0.069 | 14.533 | 0.152 | 0.069 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.401ms; driver.publication 1.350ms |
| aeeb8a184539e80c0000000000000a5d | 90.657 | 2.289 | n/a | 0.000 | 70.905 | 1.689 | 1.969 | 0.065 | n/a | 1.014 | 12.683 | n/a | n/a | 0.043 | 73.194 | 0.807 | 0.043 | node-14/thread-0/driver.queue.subject | driver.publication 4.958ms; driver.publication 4.213ms; driver.publication 2.304ms; driver.expected-state.bind-receipt 2.226ms; driver.publication 2.135ms |
| aeeb8a184539e80c0000000000000ac7 | 85.144 | 6.631 | n/a | 0.000 | 5.122 | 8.898 | 3.590 | 0.023 | n/a | 0.084 | 60.732 | n/a | n/a | 0.063 | 11.753 | 0.138 | 0.063 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.084ms |
| aeeb8a184539e80c0000000000000a4b | 80.965 | 7.375 | n/a | 0.000 | 29.854 | 2.247 | 4.256 | 0.047 | n/a | 0.213 | 36.913 | n/a | n/a | 0.060 | 37.229 | 0.460 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 10.370ms; driver.publication 4.068ms; driver.publication 2.361ms; driver.expected-state.bind-receipt 2.054ms; driver.expected-state.bind-receipt 1.022ms |
| aeeb8a184539e80c0000000000000a49 | 80.940 | 23.956 | n/a | 0.000 | 0.817 | 3.081 | 11.495 | 0.120 | n/a | 6.419 | 34.970 | n/a | n/a | 0.082 | 24.773 | 0.306 | 0.082 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 10.370ms; driver.publication 2.361ms; driver.expected-state.bind-receipt 2.054ms; driver.expected-state.bind-receipt 1.022ms |
| aeeb8a184539e80c0000000000000775 | 77.567 | 70.987 | n/a | 3.289 | 3.257 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.034 | 77.532 | 1.000 | 0.034 | node-14/thread-0/client.persist-and-resolve | driver.publication 2.379ms; driver.publication 2.313ms; driver.publication 1.608ms; driver.publication 1.598ms; driver.publication 1.598ms |
| aeeb8a184539e80c0000000000000774 | 76.956 | 7.044 | n/a | 0.000 | 1.126 | 2.984 | 0.885 | 0.022 | n/a | 0.145 | 64.680 | n/a | n/a | 0.069 | 8.170 | 0.106 | 0.069 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.379ms; driver.publication 2.313ms; driver.publication 1.608ms; driver.publication 1.598ms; driver.publication 1.483ms |
| aeeb8a184539e80c00000000000008f9 | 70.588 | 4.164 | n/a | 0.000 | 5.719 | 6.297 | 1.298 | 0.011 | n/a | 2.608 | 50.440 | n/a | n/a | 0.052 | 9.882 | 0.140 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.615ms; driver.expected-state.bind-receipt 1.373ms; driver.publication 1.367ms; driver.publication 1.205ms |
| aeeb8a184539e80c0000000000000a5c | 70.062 | 10.992 | n/a | 0.000 | 1.935 | 9.147 | 7.531 | 0.066 | n/a | 0.366 | 39.966 | n/a | n/a | 0.059 | 12.927 | 0.185 | 0.059 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 4.958ms; driver.publication 4.213ms; driver.publication 2.304ms; driver.expected-state.bind-receipt 2.226ms; driver.publication 2.135ms |
| aeeb8a184539e80c00000000000008fe | 65.145 | 5.103 | n/a | 0.000 | 0.672 | 4.541 | 0.912 | 0.030 | n/a | 1.458 | 52.380 | n/a | n/a | 0.049 | 5.775 | 0.089 | 0.049 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 2.156ms; driver.publication 1.615ms; driver.expected-state.bind-receipt 1.373ms; driver.publication 1.220ms; driver.publication 1.205ms |
| aeeb8a184539e80c0000000000000905 | 63.693 | 2.552 | n/a | 0.000 | 0.132 | 9.316 | 2.508 | 0.059 | n/a | 0.285 | 48.801 | n/a | n/a | 0.040 | 2.684 | 0.042 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.359ms; driver.publication 1.260ms; driver.publication 1.168ms; driver.publication 1.105ms |
| aeeb8a184539e80c0000000000000b46 | 61.585 | 7.514 | n/a | 0.000 | 32.016 | 9.875 | 0.973 | 0.029 | n/a | 0.133 | 10.987 | n/a | n/a | 0.058 | 39.530 | 0.642 | 0.058 | node-14/thread-0/driver.queue.subject | driver.publication 2.089ms; driver.publication 1.535ms; driver.publication 1.465ms; driver.publication 1.398ms; driver.expected-state.bind-receipt 1.374ms |
| aeeb8a184539e80c0000000000000906 | 61.488 | 2.357 | n/a | 0.000 | 0.885 | 13.260 | 5.133 | 0.029 | n/a | 0.754 | 39.042 | n/a | n/a | 0.028 | 3.242 | 0.053 | 0.028 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.359ms; driver.publication 1.260ms; driver.publication 1.168ms; driver.publication 1.105ms |

## P2/P4 / read-your-own-write / read (58 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 77.811 | n/a | n/a | n/a | 27.185 | 24.378 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 55.705 | 1.000 | 0.014 |
| p99 | 224.060 | n/a | n/a | n/a | 72.436 | 97.419 | 6.804 | 0.000 | 68.997 | 100.202 | 56.972 | n/a | 0.033 | 0.000 | n/a | n/a | 137.294 | 137.173 | 1.000 | 137.294 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c0000000000001b31 | 224.060 | 34.979 | 22.614 | 0.000 | 0.000 | 68.997 | 40.475 | 56.972 | n/a | 0.011 | 0.000 | n/a | n/a | 0.011 | 57.594 | 0.257 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 2.098ms; driver.publication 1.426ms; client.parse 1.196ms; driver.publication 1.111ms; driver.publication 1.100ms |
| aeeb8a184539e80c000000000000186d | 220.197 | 38.932 | 97.419 | 0.821 | 0.000 | 0.170 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 82.854 | 137.173 | 0.623 | 82.854 | node-14/thread-0/rpc.replica.observe | driver.publication 7.838ms; driver.publication 5.360ms; client.parse 3.492ms; client.encode 3.277ms; driver.publication 2.002ms |
| aeeb8a184539e80c0000000000001868 | 169.000 | 22.912 | 8.373 | 0.000 | 0.000 | 0.421 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 137.294 | 31.285 | 0.185 | 137.294 | node-14/thread-0/socket.wait-first-byte | client.parse 3.492ms; client.encode 3.277ms; driver.publication 1.817ms; driver.publication 1.274ms; driver.publication 1.073ms |
| aeeb8a184539e80c0000000000001b32 | 163.927 | 49.089 | 30.371 | 2.539 | 0.000 | 21.723 | 51.762 | 8.411 | n/a | 0.018 | 0.000 | n/a | n/a | 0.014 | 81.999 | 0.500 | 0.014 | gw-w/thread-67/gateway.admitted-work | driver.expected-state.bind-receipt 2.098ms; driver.publication 1.111ms; driver.publication 1.100ms |
| aeeb8a184539e80c000000000000062e | 155.352 | 30.639 | 19.709 | 3.879 | 0.000 | 0.904 | 100.202 | 0.009 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 54.227 | 0.349 | 0.009 | gw-w/thread-48/gateway.admitted-work | driver.publication 1.575ms; driver.publication 1.203ms; driver.publication 1.003ms |
| aeeb8a184539e80c0000000000001869 | 145.494 | 27.185 | 12.016 | 1.966 | 0.000 | 48.913 | 52.177 | 3.217 | n/a | 0.012 | 0.000 | n/a | n/a | 0.008 | 41.166 | 0.283 | 0.008 | node-14/thread-0/socket.wait-first-byte | client.parse 3.492ms; driver.publication 1.817ms; driver.publication 1.274ms; driver.publication 1.069ms |
| aeeb8a184539e80c0000000000001e19 | 136.181 | 18.935 | 7.248 | 0.000 | 0.000 | 0.459 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 109.540 | 26.183 | 0.192 | 109.540 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.613ms; client.parse 1.198ms |
| aeeb8a184539e80c0000000000001865 | 133.239 | 63.208 | 35.529 | 6.804 | 0.000 | 0.692 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.006 | 105.541 | 0.792 | 27.006 | node-14/thread-0/client.reach | driver.publication 1.817ms; driver.publication 1.274ms; driver.publication 1.137ms; driver.publication 1.073ms; driver.publication 1.069ms |
| aeeb8a184539e80c00000000000008b7 | 131.577 | 29.946 | 16.101 | 2.905 | 0.000 | 2.360 | 25.438 | 54.787 | n/a | 0.018 | 0.000 | n/a | n/a | 0.023 | 48.951 | 0.372 | 0.023 | gw-w/thread-48/gateway.admission-wait | driver.publication 2.468ms; driver.publication 1.235ms |
| aeeb8a184539e80c0000000000001e15 | 126.272 | 57.151 | 27.367 | 3.038 | 0.000 | 0.386 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.331 | 87.556 | 0.693 | 38.331 | node-14/thread-0/client.reach | driver.publication 2.613ms |
| aeeb8a184539e80c0000000000001b7a | 123.861 | 13.367 | 2.050 | 0.000 | 0.000 | 48.114 | 14.271 | 46.012 | n/a | 0.033 | 0.000 | n/a | n/a | 0.013 | 15.418 | 0.124 | 0.013 | node-14/thread-0/socket.wait-first-byte | client.encode 1.320ms; driver.publication 1.283ms |
| aeeb8a184539e80c0000000000001b79 | 122.352 | 22.211 | 20.865 | 0.000 | 0.000 | 28.921 | 14.189 | 36.126 | n/a | 0.031 | 0.000 | n/a | n/a | 0.009 | 43.076 | 0.352 | 0.009 | gw-w/thread-48/gateway.admission-wait | client.encode 1.320ms; driver.publication 1.106ms |
| aeeb8a184539e80c000000000000186a | 115.213 | 25.644 | 88.740 | 0.821 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 115.206 | 1.000 | 0.007 | node-14/thread-0/rpc.replica.observe | client.parse 3.492ms; driver.publication 1.274ms; driver.publication 1.069ms |
| aeeb8a184539e80c0000000000001a95 | 111.538 | 72.436 | 37.055 | 2.028 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 111.519 | 1.000 | 0.019 | node-14/thread-2/replica.pull-at | driver.expected-state.bind-receipt 2.628ms; driver.publication 2.011ms; driver.publication 1.880ms; driver.publication 1.774ms; driver.expected-state.bind-receipt 1.573ms |
| aeeb8a184539e80c0000000000001a98 | 101.629 | 71.987 | 27.575 | 2.028 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.039 | 101.590 | 1.000 | 0.039 | node-14/thread-2/replica.pull-at | driver.expected-state.bind-receipt 2.628ms; driver.publication 2.011ms; driver.publication 1.774ms; driver.plan-and-encode-command 1.204ms |
| aeeb8a184539e80c0000000000001870 | 100.216 | 18.237 | 80.879 | 1.094 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 100.210 | 1.000 | 0.006 | node-14/thread-0/rpc.replica.observe | client.parse 3.492ms |
| aeeb8a184539e80c00000000000009d4 | 99.954 | 19.999 | 10.937 | 2.450 | 0.000 | 0.400 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 66.168 | 33.385 | 0.334 | 66.168 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.004ms; driver.publication 1.267ms; driver.publication 1.159ms |
| aeeb8a184539e80c0000000000001b2f | 98.802 | 37.064 | 35.864 | 0.000 | 0.000 | 10.089 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.785 | 72.928 | 0.738 | 15.785 | node-14/thread-0/rpc.replica.observe | driver.expected-state.bind-receipt 2.098ms; driver.publication 1.155ms; driver.publication 1.111ms |
| aeeb8a184539e80c00000000000008b6 | 96.302 | 20.945 | 12.936 | 0.000 | 0.000 | 0.932 | 61.454 | 0.008 | n/a | 0.000 | 0.000 | n/a | n/a | 0.027 | 33.882 | 0.352 | 0.027 | gw-w/thread-65/gateway.admitted-work | driver.publication 2.468ms; driver.publication 1.317ms; driver.publication 1.235ms |
| aeeb8a184539e80c0000000000001a9c | 93.269 | 35.962 | 57.271 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.036 | 93.233 | 1.000 | 0.036 | node-14/thread-0/rpc.replica.observe | driver.plan-and-encode-command 1.204ms |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.087 | 0.666 | 0.000 | 1.318 | 2.984 | n/a | 0.000 | 0.346 | 5.601 | 0.399 | 0.028 | n/a | 1.563 | 6.131 | n/a | n/a | 0.033 | 3.331 | 0.195 | 0.033 |
| p99 | 17.087 | 0.666 | 0.000 | 1.318 | 2.984 | n/a | 0.000 | 0.346 | 5.601 | 0.399 | 0.028 | n/a | 1.563 | 6.131 | n/a | n/a | 0.033 | 3.331 | 0.195 | 0.033 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c0000000000000c94 | 17.087 | 2.984 | n/a | 0.000 | 0.346 | 5.601 | 0.399 | 0.028 | n/a | 1.563 | 6.131 | n/a | n/a | 0.033 | 3.331 | 0.195 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.919ms |

## P2 / tail / commit (2622 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.874 | 0.781 | 0.000 | 1.620 | 3.813 | n/a | 0.000 | 0.786 | 0.947 | 0.993 | 0.031 | n/a | 0.201 | 6.114 | n/a | n/a | 0.035 | 4.908 | 0.342 | 0.035 |
| p99 | 115.114 | 3.392 | 2.603 | 6.134 | 43.662 | n/a | 2.915 | 39.381 | 26.731 | 11.828 | 2.987 | n/a | 4.569 | 39.592 | n/a | n/a | 0.104 | 80.288 | 1.000 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c0000000000001873 | 184.711 | 69.114 | n/a | 2.810 | 112.730 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.058 | 184.653 | 1.000 | 0.058 | node-14/thread-0/driver.queue.subject | driver.publication 7.838ms; driver.publication 5.360ms; client.encode 3.277ms; driver.publication 2.882ms; driver.publication 2.793ms |
| aeeb8a184539e80c0000000000001a9d | 183.573 | 7.512 | n/a | 0.000 | 164.616 | 2.598 | 1.967 | 0.041 | n/a | 0.547 | 6.258 | n/a | n/a | 0.033 | 172.128 | 0.938 | 0.033 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.677ms; driver.expected-state.bind-receipt 2.628ms; driver.publication 2.331ms; driver.publication 1.774ms; driver.publication 1.728ms |
| aeeb8a184539e80c0000000000001b3f | 183.425 | 9.872 | n/a | 0.000 | 132.237 | 26.654 | 4.893 | 0.063 | n/a | 4.569 | 5.112 | n/a | n/a | 0.024 | 142.109 | 0.775 | 0.024 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.739ms; driver.publication 1.426ms; driver.publication 1.334ms; driver.publication 1.332ms; driver.publication 1.325ms |
| aeeb8a184539e80c0000000000001a99 | 183.112 | 13.212 | n/a | 0.000 | 48.949 | 11.317 | 17.383 | 0.050 | n/a | 10.083 | 82.067 | n/a | n/a | 0.051 | 62.161 | 0.339 | 0.051 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.677ms; driver.expected-state.bind-receipt 2.628ms; driver.publication 2.331ms; driver.publication 2.011ms; driver.publication 1.774ms |
| aeeb8a184539e80c0000000000001875 | 177.660 | 85.633 | n/a | 2.810 | 89.182 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.036 | 177.624 | 1.000 | 0.036 | node-14/thread-0/client.persist-and-resolve | driver.publication 7.838ms; driver.publication 5.360ms; client.encode 3.277ms; driver.publication 2.882ms; driver.publication 2.647ms |
| aeeb8a184539e80c0000000000001a9b | 169.177 | 29.763 | n/a | 0.000 | 2.825 | 13.310 | 15.480 | 4.759 | n/a | 5.446 | 97.549 | n/a | n/a | 0.046 | 32.587 | 0.193 | 0.046 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.628ms; driver.publication 1.774ms; driver.plan-and-encode-command 1.204ms; driver.publication 1.045ms |
| aeeb8a184539e80c0000000000001871 | 163.338 | 10.447 | n/a | 0.000 | 89.097 | 49.939 | 1.222 | 0.040 | n/a | 0.218 | 12.311 | n/a | n/a | 0.064 | 99.544 | 0.609 | 0.064 | node-14/thread-0/driver.queue.scheduler-late | client.encode 3.277ms; driver.publication 2.002ms; client.parse 0.873ms |
| aeeb8a184539e80c0000000000001016 | 161.572 | 7.963 | n/a | 0.000 | 120.348 | 4.471 | 1.031 | 0.032 | n/a | 0.468 | 27.207 | n/a | n/a | 0.052 | 128.311 | 0.794 | 0.052 | node-14/thread-0/driver.queue.subject | driver.publication 5.734ms; driver.publication 3.648ms; driver.publication 3.537ms; driver.publication 2.317ms; driver.publication 1.585ms |
| aeeb8a184539e80c0000000000001872 | 156.640 | 77.721 | n/a | 6.881 | 71.978 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.060 | 156.580 | 1.000 | 0.060 | node-14/thread-0/client.persist-and-resolve | driver.publication 7.838ms; driver.publication 5.360ms; client.encode 3.277ms; driver.publication 2.002ms; driver.expected-state.bind-receipt 1.499ms |
| aeeb8a184539e80c0000000000001a9e | 153.403 | 19.790 | n/a | 0.000 | 22.960 | 12.383 | 8.035 | 0.041 | n/a | 0.822 | 89.226 | n/a | n/a | 0.147 | 42.750 | 0.279 | 0.147 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.677ms; driver.expected-state.bind-receipt 2.628ms; driver.publication 2.331ms; driver.publication 1.774ms; driver.publication 1.728ms |
| aeeb8a184539e80c0000000000001b3b | 148.884 | 120.577 | n/a | 10.169 | 18.110 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.029 | 148.856 | 1.000 | 0.029 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.426ms; client.parse 1.196ms; driver.publication 1.100ms; driver.publication 1.080ms |
| aeeb8a184539e80c00000000000015ba | 147.007 | 5.669 | 1.535 | 0.000 | 0.015 | 11.313 | 28.959 | 0.071 | n/a | 0.217 | 99.209 | n/a | n/a | 0.021 | 7.219 | 0.049 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 3.855ms; driver.publication 3.352ms; driver.publication 2.513ms; driver.publication 2.442ms; driver.publication 1.399ms |
| aeeb8a184539e80c0000000000001a9f | 144.793 | 108.162 | n/a | 26.457 | 9.943 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.231 | 144.562 | 0.998 | 0.231 | node-14/thread-0/client.persist-and-resolve | driver.expected-state.bind-receipt 2.677ms; driver.publication 2.331ms; driver.publication 1.728ms; driver.publication 1.550ms; driver.publication 1.319ms |
| aeeb8a184539e80c0000000000001877 | 143.838 | 115.038 | n/a | 9.690 | 19.090 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 143.818 | 1.000 | 0.019 | node-14/thread-0/client.persist-and-resolve | driver.publication 7.838ms; driver.publication 5.360ms; client.encode 3.277ms; driver.publication 2.882ms; driver.publication 2.002ms |
| aeeb8a184539e80c0000000000001876 | 142.346 | 112.923 | n/a | 9.690 | 19.712 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 142.325 | 1.000 | 0.021 | node-14/thread-0/client.persist-and-resolve | driver.publication 7.838ms; driver.publication 5.360ms; client.encode 3.277ms; driver.publication 2.882ms; driver.publication 2.002ms |
| aeeb8a184539e80c000000000000186c | 139.831 | 4.893 | n/a | 0.000 | 6.535 | 116.264 | 1.134 | 0.024 | n/a | 3.823 | 7.125 | n/a | n/a | 0.034 | 11.427 | 0.082 | 0.034 | node-14/thread-0/socket.wait-first-byte | client.parse 3.492ms; driver.publication 1.274ms; driver.publication 1.069ms |
| aeeb8a184539e80c0000000000001b3e | 132.244 | 3.661 | n/a | 0.000 | 76.626 | 42.863 | 1.658 | 0.038 | n/a | 2.238 | 5.118 | n/a | n/a | 0.042 | 80.288 | 0.607 | 0.042 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.426ms; client.parse 1.196ms; driver.publication 1.100ms; driver.publication 1.080ms |
| aeeb8a184539e80c000000000000187b | 131.662 | 5.390 | n/a | 0.000 | 50.809 | 48.697 | 2.644 | 0.058 | n/a | 2.170 | 21.860 | n/a | n/a | 0.034 | 56.198 | 0.427 | 0.034 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 7.838ms; driver.publication 5.360ms; client.encode 3.277ms; driver.publication 2.882ms; driver.publication 2.647ms |
| aeeb8a184539e80c0000000000001878 | 131.080 | 118.283 | n/a | 9.690 | 3.089 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 131.062 | 1.000 | 0.018 | node-14/thread-0/client.persist-and-resolve | driver.publication 7.838ms; driver.publication 5.360ms; client.encode 3.277ms; driver.publication 2.882ms; driver.publication 2.647ms |
| aeeb8a184539e80c00000000000015b9 | 128.959 | 3.935 | n/a | 0.000 | 8.044 | 6.070 | 1.989 | 8.386 | n/a | 0.343 | 100.159 | n/a | n/a | 0.033 | 11.979 | 0.093 | 0.033 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 3.352ms; driver.publication 2.513ms; driver.publication 2.442ms; driver.publication 1.982ms |

## P2 / tail / commit / 5-10 facts (1557 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.342 | 0.629 | 0.000 | 1.491 | 3.299 | n/a | 0.000 | 0.808 | 0.935 | 0.802 | 0.031 | n/a | 0.201 | 5.632 | n/a | n/a | 0.035 | 4.261 | 0.335 | 0.035 |
| p99 | 110.888 | 2.334 | 2.603 | 5.315 | 54.875 | n/a | 3.119 | 39.381 | 30.699 | 6.631 | 3.640 | n/a | 4.260 | 38.085 | n/a | n/a | 0.102 | 86.752 | 1.000 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeeb8a184539e80c0000000000001a99 | 183.112 | 13.212 | n/a | 0.000 | 48.949 | 11.317 | 17.383 | 0.050 | n/a | 10.083 | 82.067 | n/a | n/a | 0.051 | 62.161 | 0.339 | 0.051 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.677ms; driver.expected-state.bind-receipt 2.628ms; driver.publication 2.331ms; driver.publication 2.011ms; driver.publication 1.774ms |
| aeeb8a184539e80c0000000000001875 | 177.660 | 85.633 | n/a | 2.810 | 89.182 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.036 | 177.624 | 1.000 | 0.036 | node-14/thread-0/client.persist-and-resolve | driver.publication 7.838ms; driver.publication 5.360ms; client.encode 3.277ms; driver.publication 2.882ms; driver.publication 2.647ms |
| aeeb8a184539e80c0000000000001871 | 163.338 | 10.447 | n/a | 0.000 | 89.097 | 49.939 | 1.222 | 0.040 | n/a | 0.218 | 12.311 | n/a | n/a | 0.064 | 99.544 | 0.609 | 0.064 | node-14/thread-0/driver.queue.scheduler-late | client.encode 3.277ms; driver.publication 2.002ms; client.parse 0.873ms |
| aeeb8a184539e80c0000000000001016 | 161.572 | 7.963 | n/a | 0.000 | 120.348 | 4.471 | 1.031 | 0.032 | n/a | 0.468 | 27.207 | n/a | n/a | 0.052 | 128.311 | 0.794 | 0.052 | node-14/thread-0/driver.queue.subject | driver.publication 5.734ms; driver.publication 3.648ms; driver.publication 3.537ms; driver.publication 2.317ms; driver.publication 1.585ms |
| aeeb8a184539e80c0000000000001872 | 156.640 | 77.721 | n/a | 6.881 | 71.978 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.060 | 156.580 | 1.000 | 0.060 | node-14/thread-0/client.persist-and-resolve | driver.publication 7.838ms; driver.publication 5.360ms; client.encode 3.277ms; driver.publication 2.002ms; driver.expected-state.bind-receipt 1.499ms |
| aeeb8a184539e80c0000000000001a9f | 144.793 | 108.162 | n/a | 26.457 | 9.943 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.231 | 144.562 | 0.998 | 0.231 | node-14/thread-0/client.persist-and-resolve | driver.expected-state.bind-receipt 2.677ms; driver.publication 2.331ms; driver.publication 1.728ms; driver.publication 1.550ms; driver.publication 1.319ms |
| aeeb8a184539e80c0000000000001877 | 143.838 | 115.038 | n/a | 9.690 | 19.090 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 143.818 | 1.000 | 0.019 | node-14/thread-0/client.persist-and-resolve | driver.publication 7.838ms; driver.publication 5.360ms; client.encode 3.277ms; driver.publication 2.882ms; driver.publication 2.002ms |
| aeeb8a184539e80c0000000000001876 | 142.346 | 112.923 | n/a | 9.690 | 19.712 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 142.325 | 1.000 | 0.021 | node-14/thread-0/client.persist-and-resolve | driver.publication 7.838ms; driver.publication 5.360ms; client.encode 3.277ms; driver.publication 2.882ms; driver.publication 2.002ms |
| aeeb8a184539e80c0000000000001878 | 131.080 | 118.283 | n/a | 9.690 | 3.089 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 131.062 | 1.000 | 0.018 | node-14/thread-0/client.persist-and-resolve | driver.publication 7.838ms; driver.publication 5.360ms; client.encode 3.277ms; driver.publication 2.882ms; driver.publication 2.647ms |
| aeeb8a184539e80c00000000000015b9 | 128.959 | 3.935 | n/a | 0.000 | 8.044 | 6.070 | 1.989 | 8.386 | n/a | 0.343 | 100.159 | n/a | n/a | 0.033 | 11.979 | 0.093 | 0.033 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 3.352ms; driver.publication 2.513ms; driver.publication 2.442ms; driver.publication 1.982ms |
| aeeb8a184539e80c00000000000015bc | 124.552 | 8.368 | n/a | 0.000 | 0.236 | 4.032 | 2.587 | 0.040 | n/a | 1.685 | 107.526 | n/a | n/a | 0.077 | 8.604 | 0.069 | 0.077 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 3.352ms; driver.publication 2.513ms; driver.publication 2.442ms; driver.publication 1.385ms |
| aeeb8a184539e80c0000000000001b40 | 122.103 | 57.248 | n/a | 2.361 | 62.468 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.025 | 122.078 | 1.000 | 0.025 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.426ms; driver.publication 1.115ms; driver.publication 1.080ms |
| aeeb8a184539e80c0000000000001015 | 121.076 | 4.384 | n/a | 0.000 | 41.512 | 0.897 | 56.281 | 0.105 | n/a | 0.325 | 17.508 | n/a | n/a | 0.064 | 45.896 | 0.379 | 0.064 | gw-w/thread-65/commit.prepare-and-validate | driver.publication 5.734ms; driver.publication 1.474ms; driver.expected-state.bind-receipt 1.172ms; driver.publication 1.135ms; driver.publication 0.539ms |
| aeeb8a184539e80c0000000000001aa0 | 117.330 | 7.646 | n/a | 0.000 | 17.447 | 8.245 | 5.221 | 0.048 | n/a | 2.760 | 75.894 | n/a | n/a | 0.069 | 25.093 | 0.214 | 0.069 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.677ms; driver.publication 2.331ms; driver.publication 1.728ms; driver.publication 1.319ms |
| aeeb8a184539e80c0000000000001b3a | 115.114 | 3.305 | n/a | 0.000 | 27.133 | 62.754 | 1.601 | 0.094 | n/a | 5.208 | 14.976 | n/a | n/a | 0.043 | 30.439 | 0.264 | 0.043 | node-14/thread-0/socket.wait-first-byte | client.parse 1.196ms; driver.publication 1.100ms |
| aeeb8a184539e80c0000000000001b42 | 110.888 | 63.016 | n/a | 2.361 | 45.492 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 110.869 | 1.000 | 0.020 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.739ms; driver.publication 1.426ms; driver.publication 1.115ms; driver.publication 1.080ms |
| aeeb8a184539e80c000000000000187c | 109.105 | 77.750 | n/a | 4.639 | 26.686 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 109.075 | 1.000 | 0.030 | node-14/thread-0/client.persist-and-resolve | driver.publication 7.838ms; driver.publication 5.360ms; client.encode 3.277ms; driver.publication 2.882ms; driver.publication 2.647ms |
| aeeb8a184539e80c0000000000001b7f | 106.531 | 3.574 | n/a | 0.000 | 0.870 | 49.755 | 2.974 | 3.820 | n/a | 0.388 | 45.123 | n/a | n/a | 0.028 | 4.444 | 0.042 | 0.028 | node-14/thread-0/socket.wait-first-byte | client.encode 1.320ms; driver.publication 1.283ms |
| aeeb8a184539e80c0000000000001507 | 105.789 | 10.058 | n/a | 0.000 | 0.261 | 67.058 | 3.484 | 0.104 | n/a | 7.398 | 17.385 | n/a | n/a | 0.041 | 10.319 | 0.098 | 0.041 | node-14/thread-0/socket.wait-first-byte | client.parse 1.896ms; driver.publication 1.196ms; driver.publication 1.140ms; driver.publication 1.114ms |
| aeeb8a184539e80c0000000000001b7e | 105.440 | 4.657 | n/a | 0.000 | 1.382 | 52.611 | 3.107 | 0.060 | n/a | 6.658 | 36.876 | n/a | n/a | 0.089 | 6.039 | 0.057 | 0.089 | node-14/thread-0/socket.wait-first-byte | client.encode 1.320ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.190 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.150 | 200.509 | 0.008 | n/a | 0.038 | 0.000 | n/a | n/a | 0.251 | 0.000 | 0.000 | 0.251 |
| p99 | 203.779 | n/a | n/a | n/a | 29.150 | n/a | 3.500 | 0.000 | 8.393 | 201.937 | 0.146 | n/a | 0.252 | 0.000 | n/a | n/a | 0.452 | 31.316 | 0.288 | 0.452 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82abfb2807dd0e0c0000000000000006 | 203.779 | 0.000 | n/a | 0.000 | 0.000 | 1.493 | 201.746 | 0.033 | n/a | 0.225 | 0.000 | n/a | n/a | 0.281 | 0.000 | 0.000 | 0.281 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000007 | 203.647 | 0.000 | n/a | 0.000 | 0.000 | 1.150 | 201.937 | 0.058 | n/a | 0.252 | 0.000 | n/a | n/a | 0.251 | 0.000 | 0.000 | 0.251 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000005 | 203.061 | 0.000 | n/a | 0.000 | 0.000 | 1.013 | 201.588 | 0.029 | n/a | 0.171 | 0.000 | n/a | n/a | 0.261 | 0.000 | 0.000 | 0.261 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000eeb | 201.632 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 200.753 | 0.008 | n/a | 0.049 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000ee9 | 201.302 | 0.000 | n/a | 0.000 | 0.000 | 0.555 | 200.589 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000eea | 201.190 | 0.000 | n/a | 0.000 | 0.000 | 0.531 | 200.509 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da0000000000000002 | 160.829 | 2.358 | n/a | 0.000 | 0.000 | 1.929 | 155.943 | 0.146 | n/a | 0.000 | 0.000 | n/a | n/a | 0.452 | 2.358 | 0.015 | 0.452 | gw-r/thread-46/gateway.admitted-work | none observed |
| 82abfb2807dd0e0c0000000000000ef0 | 135.009 | 16.227 | n/a | 3.500 | 0.000 | 2.687 | 112.190 | 0.006 | n/a | 0.000 | 0.000 | n/a | n/a | 0.399 | 19.727 | 0.146 | 0.399 | gw-r/thread-45/gateway.admitted-work | none observed |
| 82abfb2807dd0e0c0000000000000eee | 108.786 | 29.150 | n/a | 2.167 | 0.000 | 8.030 | 69.219 | 0.009 | n/a | 0.000 | 0.000 | n/a | n/a | 0.212 | 31.316 | 0.288 | 0.212 | gw-r/thread-49/gateway.admitted-work | none observed |
| 82abfb2807dd0e0c0000000000000eef | 107.119 | 22.519 | n/a | 0.000 | 0.000 | 8.393 | 75.868 | 0.004 | n/a | 0.000 | 0.000 | n/a | n/a | 0.335 | 22.519 | 0.210 | 0.335 | gw-r/thread-45/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 813.406 | n/a | n/a | n/a | 10.214 | n/a | 0.000 | 0.000 | 1.033 | 801.174 | 0.013 | n/a | 0.106 | 0.000 | n/a | n/a | 1.384 | 10.214 | 0.013 | 1.384 |
| p99 | 1005.631 | n/a | n/a | n/a | 10.796 | n/a | 0.000 | 0.000 | 1.901 | 1001.517 | 0.047 | n/a | 0.445 | 0.000 | n/a | n/a | 2.140 | 10.796 | 0.794 | 2.140 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4240664582eea2da00000000000000a4 | 1005.631 | 0.337 | n/a | 0.000 | 0.000 | 1.901 | 1001.517 | 0.047 | n/a | 0.445 | 0.000 | n/a | n/a | 1.384 | 0.337 | 0.000 | 1.384 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da00000000000000a5 | 813.406 | 10.796 | n/a | 0.000 | 0.000 | 1.033 | 801.174 | 0.013 | n/a | 0.106 | 0.000 | n/a | n/a | 0.285 | 10.796 | 0.013 | 0.285 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da000000000000081e | 12.868 | 10.214 | n/a | 0.000 | 0.000 | 0.513 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.140 | 10.214 | 0.794 | 2.140 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 441.547 | n/a | n/a | n/a | 2.946 | n/a | 0.000 | 0.000 | 0.809 | 437.835 | 0.021 | n/a | 0.094 | 0.000 | n/a | n/a | 0.108 | 2.946 | 0.007 | 0.108 |
| p99 | 1005.556 | n/a | n/a | n/a | 31.998 | n/a | 0.000 | 0.000 | 4.570 | 1001.555 | 0.369 | n/a | 0.194 | 0.000 | n/a | n/a | 20.219 | 31.998 | 0.116 | 20.219 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4240664582eea2da00000000000000b4 | 1005.556 | 2.929 | n/a | 0.000 | 0.000 | 0.710 | 1001.555 | 0.158 | n/a | 0.100 | 0.000 | n/a | n/a | 0.104 | 2.929 | 0.003 | 0.104 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da00000000000000cf | 1004.010 | 0.166 | n/a | 0.000 | 0.000 | 1.475 | 1001.050 | 0.021 | n/a | 0.158 | 0.000 | n/a | n/a | 1.141 | 0.166 | 0.000 | 1.141 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da00000000000000ba | 997.446 | 6.464 | n/a | 0.000 | 0.000 | 4.570 | 985.902 | 0.217 | n/a | 0.194 | 0.000 | n/a | n/a | 0.099 | 6.464 | 0.006 | 0.099 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da00000000000000bb | 991.952 | 3.490 | n/a | 0.000 | 0.000 | 0.532 | 987.409 | 0.173 | n/a | 0.114 | 0.000 | n/a | n/a | 0.233 | 3.490 | 0.004 | 0.233 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da00000000000000ae | 990.843 | 2.866 | n/a | 0.000 | 0.000 | 0.718 | 987.050 | 0.019 | n/a | 0.106 | 0.000 | n/a | n/a | 0.084 | 2.866 | 0.003 | 0.084 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da00000000000000ab | 892.921 | 3.190 | n/a | 0.000 | 0.000 | 0.809 | 888.705 | 0.019 | n/a | 0.089 | 0.000 | n/a | n/a | 0.110 | 3.190 | 0.004 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da00000000000000c1 | 845.235 | 5.698 | n/a | 0.000 | 0.000 | 1.038 | 838.164 | 0.143 | n/a | 0.089 | 0.000 | n/a | n/a | 0.104 | 5.698 | 0.007 | 0.104 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da00000000000000a8 | 802.994 | 2.419 | n/a | 0.000 | 0.000 | 0.756 | 799.598 | 0.023 | n/a | 0.094 | 0.000 | n/a | n/a | 0.104 | 2.419 | 0.003 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da00000000000000ca | 766.111 | 2.444 | n/a | 0.000 | 0.000 | 1.007 | 762.311 | 0.173 | n/a | 0.098 | 0.000 | n/a | n/a | 0.079 | 2.444 | 0.003 | 0.079 | gw-r/thread-50/journal/page | none observed |
| 4240664582eea2da00000000000000b2 | 618.624 | 2.946 | n/a | 0.000 | 0.000 | 2.434 | 612.898 | 0.155 | n/a | 0.083 | 0.000 | n/a | n/a | 0.108 | 2.946 | 0.005 | 0.108 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da00000000000000c8 | 570.545 | 3.548 | n/a | 0.000 | 0.000 | 0.597 | 566.133 | 0.021 | n/a | 0.126 | 0.000 | n/a | n/a | 0.119 | 3.548 | 0.006 | 0.119 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da00000000000000bf | 535.152 | 4.222 | n/a | 0.000 | 0.000 | 0.898 | 529.639 | 0.203 | n/a | 0.100 | 0.000 | n/a | n/a | 0.090 | 4.222 | 0.008 | 0.090 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da00000000000000c5 | 526.853 | 4.177 | n/a | 0.000 | 0.000 | 0.799 | 521.685 | 0.013 | n/a | 0.076 | 0.000 | n/a | n/a | 0.104 | 4.177 | 0.008 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da00000000000000c4 | 464.703 | 2.361 | n/a | 0.000 | 0.000 | 0.997 | 461.015 | 0.118 | n/a | 0.106 | 0.000 | n/a | n/a | 0.106 | 2.361 | 0.005 | 0.106 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da00000000000000b6 | 441.547 | 2.732 | n/a | 0.000 | 0.000 | 0.783 | 437.835 | 0.019 | n/a | 0.094 | 0.000 | n/a | n/a | 0.083 | 2.732 | 0.006 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da00000000000000c7 | 432.869 | 2.271 | n/a | 0.000 | 0.000 | 0.776 | 429.663 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.096 | 2.271 | 0.005 | 0.096 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da00000000000000a7 | 399.698 | 31.998 | n/a | 0.000 | 0.000 | 0.809 | 366.427 | 0.019 | n/a | 0.084 | 0.000 | n/a | n/a | 0.361 | 31.998 | 0.080 | 0.361 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da00000000000000b0 | 321.622 | 5.274 | n/a | 0.000 | 0.000 | 0.806 | 315.285 | 0.018 | n/a | 0.081 | 0.000 | n/a | n/a | 0.158 | 5.274 | 0.016 | 0.158 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da00000000000000b8 | 292.143 | 6.185 | n/a | 0.000 | 0.000 | 0.781 | 284.883 | 0.018 | n/a | 0.063 | 0.000 | n/a | n/a | 0.214 | 6.185 | 0.021 | 0.214 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da00000000000000b5 | 261.552 | 5.814 | n/a | 0.000 | 0.000 | 1.179 | 254.307 | 0.012 | n/a | 0.142 | 0.000 | n/a | n/a | 0.097 | 5.814 | 0.022 | 0.097 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 434.833 | n/a | n/a | n/a | 4.481 | n/a | 0.646 | 0.000 | 0.832 | 428.778 | 0.017 | n/a | 0.078 | 0.000 | n/a | n/a | 0.126 | 5.163 | 0.015 | 0.126 |
| p99 | 1009.680 | n/a | n/a | n/a | 21.210 | n/a | 1.827 | 0.000 | 4.939 | 1001.080 | 0.234 | n/a | 0.150 | 0.000 | n/a | n/a | 34.727 | 22.901 | 0.521 | 34.727 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4240664582eea2da00000000000000d2 | 1009.680 | 9.448 | n/a | 0.909 | 0.000 | 0.942 | 998.026 | 0.017 | n/a | 0.087 | 0.000 | n/a | n/a | 0.249 | 10.358 | 0.010 | 0.249 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da00000000000000fe | 1008.267 | 3.823 | n/a | 0.000 | 0.000 | 4.939 | 999.275 | 0.017 | n/a | 0.097 | 0.000 | n/a | n/a | 0.116 | 3.823 | 0.004 | 0.116 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da00000000000000d8 | 1003.691 | 0.240 | n/a | 0.000 | 0.000 | 1.003 | 1001.080 | 0.021 | n/a | 0.149 | 0.000 | n/a | n/a | 1.199 | 0.240 | 0.000 | 1.199 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da0000000000000105 | 1000.628 | 4.246 | n/a | 0.000 | 0.000 | 2.407 | 993.638 | 0.156 | n/a | 0.072 | 0.000 | n/a | n/a | 0.109 | 4.246 | 0.004 | 0.109 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da000000000000010d | 996.518 | 3.930 | n/a | 0.000 | 0.000 | 0.597 | 991.655 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.250 | 3.930 | 0.004 | 0.250 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da00000000000000d1 | 991.162 | 13.757 | n/a | 0.880 | 0.000 | 0.785 | 975.481 | 0.013 | n/a | 0.072 | 0.000 | n/a | n/a | 0.173 | 14.637 | 0.015 | 0.173 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da00000000000000df | 987.789 | 3.504 | n/a | 0.601 | 0.000 | 0.760 | 982.583 | 0.120 | n/a | 0.120 | 0.000 | n/a | n/a | 0.101 | 4.105 | 0.004 | 0.101 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da00000000000000da | 973.579 | 6.587 | n/a | 0.560 | 0.000 | 0.889 | 965.292 | 0.018 | n/a | 0.080 | 0.000 | n/a | n/a | 0.154 | 7.146 | 0.007 | 0.154 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da0000000000000100 | 971.080 | 6.646 | n/a | 1.098 | 0.000 | 1.039 | 961.989 | 0.026 | n/a | 0.150 | 0.000 | n/a | n/a | 0.133 | 7.743 | 0.008 | 0.133 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da00000000000000de | 953.171 | 4.481 | n/a | 0.682 | 0.000 | 0.819 | 947.009 | 0.017 | n/a | 0.082 | 0.000 | n/a | n/a | 0.082 | 5.163 | 0.005 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da00000000000000e0 | 855.333 | 7.156 | n/a | 1.229 | 0.000 | 0.896 | 845.742 | 0.013 | n/a | 0.078 | 0.000 | n/a | n/a | 0.219 | 8.385 | 0.010 | 0.219 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da0000000000000102 | 830.258 | 5.496 | n/a | 0.000 | 0.000 | 3.118 | 821.378 | 0.029 | n/a | 0.133 | 0.000 | n/a | n/a | 0.104 | 5.496 | 0.007 | 0.104 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da00000000000000e4 | 779.598 | 4.642 | n/a | 0.646 | 0.000 | 0.632 | 773.483 | 0.018 | n/a | 0.074 | 0.000 | n/a | n/a | 0.103 | 5.288 | 0.007 | 0.103 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da00000000000000ea | 644.692 | 4.618 | n/a | 0.000 | 0.000 | 1.367 | 638.437 | 0.021 | n/a | 0.112 | 0.000 | n/a | n/a | 0.137 | 4.618 | 0.007 | 0.137 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da00000000000000fb | 643.631 | 7.326 | n/a | 0.701 | 0.000 | 0.667 | 634.525 | 0.204 | n/a | 0.122 | 0.000 | n/a | n/a | 0.085 | 8.028 | 0.012 | 0.085 | gw-r/thread-50/journal/page | none observed |
| 4240664582eea2da00000000000000db | 565.263 | 10.775 | n/a | 1.500 | 0.000 | 1.982 | 550.691 | 0.017 | n/a | 0.094 | 0.000 | n/a | n/a | 0.205 | 12.275 | 0.022 | 0.205 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da00000000000000e8 | 557.052 | 6.003 | n/a | 0.891 | 0.000 | 0.916 | 549.021 | 0.020 | n/a | 0.107 | 0.000 | n/a | n/a | 0.093 | 6.895 | 0.012 | 0.093 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da00000000000000dc | 493.605 | 3.379 | n/a | 0.538 | 0.000 | 4.236 | 485.214 | 0.011 | n/a | 0.111 | 0.000 | n/a | n/a | 0.116 | 3.917 | 0.008 | 0.116 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da0000000000000107 | 468.768 | 21.210 | n/a | 0.965 | 0.000 | 1.028 | 444.356 | 0.013 | n/a | 0.054 | 0.000 | n/a | n/a | 1.142 | 22.175 | 0.047 | 1.142 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da00000000000000d3 | 457.787 | 4.901 | n/a | 0.639 | 0.000 | 1.816 | 450.023 | 0.234 | n/a | 0.083 | 0.000 | n/a | n/a | 0.090 | 5.541 | 0.012 | 0.090 | gw-r/thread-43/journal/page | none observed |

## P3 / L4 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 370.971 | n/a | n/a | n/a | 4.199 | n/a | 0.000 | 0.000 | 0.749 | 355.195 | 0.015 | n/a | 0.053 | 0.000 | n/a | n/a | 0.151 | 4.436 | 0.012 | 0.151 |
| p99 | 1004.927 | n/a | n/a | n/a | 11.716 | n/a | 3.496 | 0.000 | 3.763 | 1002.524 | 0.403 | n/a | 0.823 | 0.000 | n/a | n/a | 46.868 | 14.818 | 0.610 | 46.868 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4240664582eea2da0000000000000137 | 1004.927 | 0.193 | n/a | 0.000 | 0.000 | 0.932 | 1002.524 | 0.023 | n/a | 0.130 | 0.000 | n/a | n/a | 1.125 | 0.193 | 0.000 | 1.125 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da0000000000000114 | 1003.209 | 0.214 | n/a | 0.000 | 0.000 | 0.836 | 1000.952 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 1.131 | 0.214 | 0.000 | 1.131 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da000000000000012b | 999.499 | 6.457 | n/a | 0.000 | 0.000 | 0.640 | 992.210 | 0.009 | n/a | 0.036 | 0.000 | n/a | n/a | 0.146 | 6.457 | 0.006 | 0.146 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da000000000000011d | 997.224 | 5.843 | n/a | 1.021 | 0.000 | 0.657 | 989.277 | 0.156 | n/a | 0.054 | 0.000 | n/a | n/a | 0.215 | 6.864 | 0.007 | 0.215 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da0000000000000126 | 996.971 | 3.676 | n/a | 0.000 | 0.000 | 0.575 | 992.569 | 0.011 | n/a | 0.049 | 0.000 | n/a | n/a | 0.091 | 3.676 | 0.004 | 0.091 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da000000000000012a | 982.750 | 2.894 | n/a | 0.000 | 0.000 | 0.722 | 978.474 | 0.403 | n/a | 0.078 | 0.000 | n/a | n/a | 0.177 | 2.894 | 0.003 | 0.177 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da0000000000000141 | 912.800 | 4.614 | n/a | 0.000 | 0.000 | 0.717 | 907.326 | 0.017 | n/a | 0.044 | 0.000 | n/a | n/a | 0.082 | 4.614 | 0.005 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da0000000000000111 | 874.458 | 3.158 | n/a | 0.620 | 0.000 | 0.881 | 869.509 | 0.147 | n/a | 0.050 | 0.000 | n/a | n/a | 0.094 | 3.779 | 0.004 | 0.094 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da0000000000000127 | 794.551 | 8.339 | n/a | 0.995 | 0.000 | 0.961 | 783.041 | 0.185 | n/a | 0.823 | 0.000 | n/a | n/a | 0.207 | 9.334 | 0.012 | 0.207 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da000000000000011e | 782.256 | 4.855 | n/a | 0.000 | 0.000 | 0.840 | 776.322 | 0.027 | n/a | 0.052 | 0.000 | n/a | n/a | 0.161 | 4.855 | 0.006 | 0.161 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da0000000000000139 | 749.314 | 11.716 | n/a | 0.768 | 0.000 | 0.724 | 735.848 | 0.020 | n/a | 0.075 | 0.000 | n/a | n/a | 0.164 | 12.484 | 0.017 | 0.164 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da0000000000000134 | 733.684 | 6.510 | n/a | 0.765 | 0.000 | 0.757 | 725.461 | 0.009 | n/a | 0.043 | 0.000 | n/a | n/a | 0.140 | 7.275 | 0.010 | 0.140 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da000000000000010e | 728.825 | 3.693 | n/a | 0.743 | 0.000 | 1.081 | 723.103 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.116 | 4.436 | 0.006 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da0000000000000149 | 703.439 | 3.781 | n/a | 0.745 | 0.000 | 0.877 | 697.794 | 0.047 | n/a | 0.061 | 0.000 | n/a | n/a | 0.134 | 4.526 | 0.006 | 0.134 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da0000000000000132 | 675.073 | 3.638 | n/a | 0.000 | 0.000 | 0.626 | 670.528 | 0.157 | n/a | 0.038 | 0.000 | n/a | n/a | 0.086 | 3.638 | 0.005 | 0.086 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da0000000000000142 | 674.218 | 5.815 | n/a | 0.699 | 0.000 | 1.168 | 666.060 | 0.263 | n/a | 0.031 | 0.000 | n/a | n/a | 0.181 | 6.515 | 0.010 | 0.181 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da000000000000013d | 663.167 | 3.419 | n/a | 0.000 | 0.000 | 2.522 | 657.025 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.136 | 3.419 | 0.005 | 0.136 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da0000000000000124 | 631.206 | 3.199 | n/a | 0.000 | 0.000 | 3.763 | 623.899 | 0.127 | n/a | 0.077 | 0.000 | n/a | n/a | 0.141 | 3.199 | 0.005 | 0.141 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da000000000000012d | 608.121 | 6.312 | n/a | 0.000 | 0.000 | 0.628 | 600.882 | 0.020 | n/a | 0.053 | 0.000 | n/a | n/a | 0.226 | 6.312 | 0.010 | 0.226 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da000000000000012c | 400.423 | 4.882 | n/a | 0.000 | 0.000 | 3.477 | 391.768 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.223 | 4.882 | 0.012 | 0.223 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 418.338 | n/a | n/a | n/a | 2.847 | n/a | 0.000 | 0.000 | 0.723 | 411.250 | 0.011 | n/a | 0.044 | 0.000 | n/a | n/a | 0.117 | 2.847 | 0.008 | 0.117 |
| p99 | 1004.583 | n/a | n/a | n/a | 8.938 | n/a | 0.892 | 0.000 | 5.145 | 1001.438 | 2.241 | n/a | 0.111 | 0.000 | n/a | n/a | 43.570 | 8.938 | 0.642 | 43.570 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4240664582eea2da0000000000000154 | 1004.583 | 6.295 | n/a | 0.000 | 0.000 | 5.145 | 992.761 | 0.157 | n/a | 0.038 | 0.000 | n/a | n/a | 0.187 | 6.295 | 0.006 | 0.187 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da000000000000017f | 1003.682 | 0.173 | n/a | 0.000 | 0.000 | 0.811 | 1001.438 | 0.014 | n/a | 0.111 | 0.000 | n/a | n/a | 1.135 | 0.173 | 0.000 | 1.135 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da0000000000000164 | 1003.375 | 0.191 | n/a | 0.000 | 0.000 | 0.857 | 1001.092 | 0.017 | n/a | 0.069 | 0.000 | n/a | n/a | 1.148 | 0.191 | 0.000 | 1.148 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da000000000000016e | 1002.601 | 0.144 | n/a | 0.000 | 0.000 | 0.703 | 1000.571 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 1.118 | 0.144 | 0.000 | 1.118 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da0000000000000187 | 1001.185 | 3.519 | n/a | 0.000 | 0.000 | 0.943 | 996.566 | 0.021 | n/a | 0.065 | 0.000 | n/a | n/a | 0.071 | 3.519 | 0.004 | 0.071 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da0000000000000186 | 997.806 | 2.729 | n/a | 0.000 | 0.000 | 5.125 | 989.752 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.105 | 2.729 | 0.003 | 0.105 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da0000000000000174 | 918.556 | 2.583 | n/a | 0.000 | 0.000 | 3.178 | 912.560 | 0.088 | n/a | 0.066 | 0.000 | n/a | n/a | 0.080 | 2.583 | 0.003 | 0.080 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da0000000000000159 | 784.444 | 3.206 | n/a | 0.000 | 0.000 | 0.861 | 780.252 | 0.015 | n/a | 0.042 | 0.000 | n/a | n/a | 0.067 | 3.206 | 0.004 | 0.067 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da0000000000000155 | 773.545 | 2.489 | n/a | 0.000 | 0.000 | 1.338 | 767.321 | 2.241 | n/a | 0.067 | 0.000 | n/a | n/a | 0.088 | 2.489 | 0.003 | 0.088 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da000000000000017a | 751.352 | 4.616 | n/a | 0.000 | 0.000 | 2.836 | 743.736 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.069 | 4.616 | 0.006 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da0000000000000189 | 690.043 | 4.623 | n/a | 0.892 | 0.000 | 0.669 | 683.633 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.162 | 5.515 | 0.008 | 0.162 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da000000000000014f | 639.529 | 4.987 | n/a | 0.000 | 0.000 | 0.773 | 633.467 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.225 | 4.987 | 0.008 | 0.225 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da0000000000000184 | 598.177 | 8.291 | n/a | 0.000 | 0.000 | 0.686 | 588.914 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.232 | 8.291 | 0.014 | 0.232 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da000000000000016d | 588.307 | 2.906 | n/a | 0.000 | 0.000 | 0.680 | 584.573 | 0.011 | n/a | 0.043 | 0.000 | n/a | n/a | 0.093 | 2.906 | 0.005 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da0000000000000177 | 544.465 | 2.904 | n/a | 0.000 | 0.000 | 0.595 | 540.697 | 0.127 | n/a | 0.066 | 0.000 | n/a | n/a | 0.077 | 2.904 | 0.005 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da0000000000000166 | 541.605 | 7.054 | n/a | 0.000 | 0.000 | 3.521 | 530.811 | 0.014 | n/a | 0.064 | 0.000 | n/a | n/a | 0.140 | 7.054 | 0.013 | 0.140 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da000000000000017d | 538.499 | 6.917 | n/a | 0.000 | 0.000 | 0.717 | 530.375 | 0.144 | n/a | 0.035 | 0.000 | n/a | n/a | 0.312 | 6.917 | 0.013 | 0.312 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da0000000000000171 | 521.718 | 4.204 | n/a | 0.000 | 0.000 | 0.863 | 516.165 | 0.277 | n/a | 0.062 | 0.000 | n/a | n/a | 0.147 | 4.204 | 0.008 | 0.147 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da0000000000000170 | 469.208 | 8.938 | n/a | 0.000 | 0.000 | 3.445 | 456.592 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.202 | 8.938 | 0.019 | 0.202 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da000000000000017c | 463.951 | 2.110 | n/a | 0.000 | 0.000 | 0.599 | 461.119 | 0.013 | n/a | 0.045 | 0.000 | n/a | n/a | 0.065 | 2.110 | 0.005 | 0.065 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / internal (48 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 322.758 | n/a | n/a | n/a | 3.048 | n/a | 0.000 | 0.000 | 0.619 | 317.377 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.090 | 3.048 | 0.011 | 0.090 |
| p99 | 1004.932 | n/a | n/a | n/a | 14.590 | n/a | 0.000 | 0.000 | 4.123 | 1001.392 | 0.251 | n/a | 0.090 | 0.000 | n/a | n/a | 46.284 | 14.590 | 0.192 | 46.284 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4240664582eea2da00000000000001a7 | 1004.932 | 2.831 | n/a | 0.000 | 0.000 | 0.557 | 1001.392 | 0.009 | n/a | 0.038 | 0.000 | n/a | n/a | 0.105 | 2.831 | 0.003 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da00000000000001a6 | 1003.782 | 2.770 | n/a | 0.000 | 0.000 | 0.719 | 1000.133 | 0.013 | n/a | 0.057 | 0.000 | n/a | n/a | 0.090 | 2.770 | 0.003 | 0.090 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da00000000000001c4 | 994.526 | 4.326 | n/a | 0.000 | 0.000 | 0.550 | 989.433 | 0.071 | n/a | 0.059 | 0.000 | n/a | n/a | 0.088 | 4.326 | 0.004 | 0.088 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da00000000000001c3 | 985.468 | 2.751 | n/a | 0.000 | 0.000 | 0.527 | 981.941 | 0.111 | n/a | 0.055 | 0.000 | n/a | n/a | 0.083 | 2.751 | 0.003 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da000000000000019a | 965.706 | 2.561 | n/a | 0.000 | 0.000 | 2.879 | 960.105 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.090 | 2.561 | 0.003 | 0.090 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da00000000000001a4 | 874.202 | 3.711 | n/a | 0.000 | 0.000 | 0.576 | 869.738 | 0.015 | n/a | 0.043 | 0.000 | n/a | n/a | 0.118 | 3.711 | 0.004 | 0.118 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da000000000000018b | 865.202 | 5.879 | n/a | 0.000 | 0.000 | 2.359 | 856.812 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.097 | 5.879 | 0.007 | 0.097 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da000000000000019c | 840.356 | 5.431 | n/a | 0.000 | 0.000 | 0.705 | 834.078 | 0.011 | n/a | 0.038 | 0.000 | n/a | n/a | 0.094 | 5.431 | 0.006 | 0.094 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da00000000000001d4 | 791.913 | 2.125 | n/a | 0.000 | 0.000 | 0.578 | 789.080 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.067 | 2.125 | 0.003 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da00000000000001c1 | 766.257 | 2.677 | n/a | 0.000 | 0.000 | 0.594 | 762.875 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.072 | 2.677 | 0.003 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da00000000000001a0 | 675.973 | 6.369 | n/a | 0.000 | 0.000 | 0.995 | 668.493 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.089 | 6.369 | 0.009 | 0.089 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da00000000000001c5 | 662.975 | 3.057 | n/a | 0.000 | 0.000 | 0.656 | 659.098 | 0.027 | n/a | 0.046 | 0.000 | n/a | n/a | 0.092 | 3.057 | 0.005 | 0.092 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da00000000000001af | 644.284 | 7.434 | n/a | 0.000 | 0.000 | 0.805 | 635.901 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.092 | 7.434 | 0.012 | 0.092 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da00000000000001b5 | 623.644 | 2.483 | n/a | 0.000 | 0.000 | 0.562 | 620.475 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.083 | 2.483 | 0.004 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da00000000000001a8 | 619.655 | 4.027 | n/a | 0.000 | 0.000 | 4.123 | 611.364 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.095 | 4.027 | 0.006 | 0.095 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da00000000000001d0 | 546.933 | 2.506 | n/a | 0.000 | 0.000 | 3.805 | 540.482 | 0.008 | n/a | 0.039 | 0.000 | n/a | n/a | 0.093 | 2.506 | 0.005 | 0.093 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da00000000000001b8 | 530.962 | 3.071 | n/a | 0.000 | 0.000 | 0.800 | 526.969 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.076 | 3.071 | 0.006 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da00000000000001cd | 525.973 | 2.809 | n/a | 0.000 | 0.000 | 2.847 | 520.077 | 0.125 | n/a | 0.034 | 0.000 | n/a | n/a | 0.082 | 2.809 | 0.005 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da0000000000000198 | 476.140 | 2.554 | n/a | 0.000 | 0.000 | 0.855 | 472.461 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.193 | 2.554 | 0.005 | 0.193 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da00000000000001b7 | 468.613 | 14.590 | n/a | 0.000 | 0.000 | 0.868 | 452.885 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.217 | 14.590 | 0.031 | 0.217 | gw-r/thread-45/journal/page | none observed |

## P3 / L256 / internal (45 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 319.879 | n/a | n/a | n/a | 3.357 | n/a | 0.000 | 0.000 | 0.680 | 314.720 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.115 | 3.357 | 0.011 | 0.115 |
| p99 | 1002.956 | n/a | n/a | n/a | 9.670 | n/a | 0.000 | 0.000 | 5.034 | 1001.013 | 2.036 | n/a | 0.222 | 0.000 | n/a | n/a | 38.505 | 9.670 | 0.424 | 38.505 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4240664582eea2da00000000000001e9 | 1002.956 | 0.139 | n/a | 0.000 | 0.000 | 0.607 | 1001.013 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 1.122 | 0.139 | 0.000 | 1.122 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da0000000000000217 | 1002.647 | 0.166 | n/a | 0.000 | 0.000 | 0.680 | 1000.591 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 1.145 | 0.166 | 0.000 | 1.145 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da0000000000000212 | 1002.403 | 0.118 | n/a | 0.000 | 0.000 | 0.572 | 1000.525 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 1.119 | 0.118 | 0.000 | 1.119 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da00000000000001fe | 999.526 | 2.317 | n/a | 0.000 | 0.000 | 0.591 | 996.143 | 0.347 | n/a | 0.062 | 0.000 | n/a | n/a | 0.067 | 2.317 | 0.002 | 0.067 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da0000000000000211 | 998.974 | 4.490 | n/a | 0.000 | 0.000 | 0.555 | 993.552 | 0.140 | n/a | 0.037 | 0.000 | n/a | n/a | 0.200 | 4.490 | 0.004 | 0.200 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da0000000000000219 | 991.482 | 4.854 | n/a | 0.000 | 0.000 | 0.746 | 985.553 | 0.012 | n/a | 0.056 | 0.000 | n/a | n/a | 0.260 | 4.854 | 0.005 | 0.260 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da0000000000000215 | 945.047 | 2.854 | n/a | 0.000 | 0.000 | 2.675 | 939.362 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.087 | 2.854 | 0.003 | 0.087 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da00000000000001ff | 865.978 | 6.298 | n/a | 0.000 | 0.000 | 1.356 | 857.520 | 0.017 | n/a | 0.222 | 0.000 | n/a | n/a | 0.565 | 6.298 | 0.007 | 0.565 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da0000000000000206 | 850.685 | 3.577 | n/a | 0.000 | 0.000 | 0.582 | 846.376 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.099 | 3.577 | 0.004 | 0.099 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da00000000000001dc | 800.111 | 2.774 | n/a | 0.000 | 0.000 | 3.206 | 794.018 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.072 | 2.774 | 0.003 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da00000000000001f7 | 796.990 | 2.499 | n/a | 0.000 | 0.000 | 0.578 | 793.799 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.076 | 2.499 | 0.003 | 0.076 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da0000000000000202 | 772.494 | 6.487 | n/a | 0.000 | 0.000 | 0.744 | 764.865 | 0.019 | n/a | 0.054 | 0.000 | n/a | n/a | 0.323 | 6.487 | 0.008 | 0.323 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da00000000000001f0 | 756.986 | 2.063 | n/a | 0.000 | 0.000 | 2.762 | 752.034 | 0.011 | n/a | 0.057 | 0.000 | n/a | n/a | 0.059 | 2.063 | 0.003 | 0.059 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da00000000000001f4 | 662.856 | 2.459 | n/a | 0.000 | 0.000 | 0.857 | 659.402 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.083 | 2.459 | 0.004 | 0.083 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da00000000000001e7 | 626.962 | 2.319 | n/a | 0.000 | 0.000 | 0.614 | 623.882 | 0.011 | n/a | 0.049 | 0.000 | n/a | n/a | 0.086 | 2.319 | 0.004 | 0.086 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da00000000000001d8 | 613.251 | 1.897 | n/a | 0.000 | 0.000 | 0.526 | 610.729 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.060 | 1.897 | 0.003 | 0.060 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da00000000000001f9 | 572.575 | 5.162 | n/a | 0.000 | 0.000 | 2.222 | 565.002 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.141 | 5.162 | 0.009 | 0.141 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da00000000000001e0 | 471.426 | 9.670 | n/a | 0.000 | 0.000 | 0.703 | 460.850 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.162 | 9.670 | 0.021 | 0.162 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da000000000000020f | 463.266 | 3.591 | n/a | 0.000 | 0.000 | 0.631 | 458.890 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.102 | 3.591 | 0.008 | 0.102 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da00000000000001ee | 440.745 | 2.631 | n/a | 0.000 | 0.000 | 0.581 | 437.383 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.106 | 2.631 | 0.006 | 0.106 | gw-r/thread-45/journal/page | none observed |

## P3 / L1024 / internal (737 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.197 | n/a | n/a | n/a | 3.672 | n/a | 0.000 | 0.000 | 0.274 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.808 | 3.672 | 0.308 | 6.808 |
| p99 | 116.553 | n/a | n/a | n/a | 18.963 | n/a | 1.054 | 0.000 | 2.247 | 107.190 | 0.155 | n/a | 0.050 | 0.000 | n/a | n/a | 47.060 | 19.237 | 0.838 | 47.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4240664582eea2da0000000000000225 | 970.792 | 3.057 | n/a | 0.000 | 0.000 | 0.588 | 966.952 | 0.011 | n/a | 0.075 | 0.000 | n/a | n/a | 0.109 | 3.057 | 0.003 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da000000000000021a | 895.845 | 2.114 | n/a | 0.000 | 0.000 | 0.713 | 892.899 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.083 | 2.114 | 0.002 | 0.083 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da0000000000000226 | 890.103 | 2.961 | n/a | 0.000 | 0.000 | 0.571 | 886.401 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.112 | 2.961 | 0.003 | 0.112 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da0000000000000222 | 741.847 | 2.726 | n/a | 0.000 | 0.000 | 4.086 | 734.808 | 0.011 | n/a | 0.037 | 0.000 | n/a | n/a | 0.179 | 2.726 | 0.004 | 0.179 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da000000000000021d | 734.807 | 2.183 | n/a | 0.000 | 0.000 | 0.564 | 731.940 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.085 | 2.183 | 0.003 | 0.085 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da000000000000021e | 258.029 | 2.804 | n/a | 0.000 | 0.000 | 0.604 | 253.914 | 0.542 | n/a | 0.072 | 0.000 | n/a | n/a | 0.094 | 2.804 | 0.011 | 0.094 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da0000000000000223 | 228.414 | 3.416 | n/a | 0.000 | 0.000 | 0.704 | 224.166 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.083 | 3.416 | 0.015 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da00000000000002e9 | 116.553 | 8.249 | n/a | 1.492 | 0.000 | 0.783 | 105.798 | 0.026 | n/a | 0.051 | 0.000 | n/a | n/a | 0.154 | 9.741 | 0.084 | 0.154 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da0000000000000778 | 114.705 | 8.831 | n/a | 0.000 | 0.000 | 0.704 | 104.985 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.153 | 8.831 | 0.077 | 0.153 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da0000000000000313 | 110.820 | 2.865 | n/a | 0.000 | 0.000 | 0.637 | 107.190 | 0.008 | n/a | 0.031 | 0.000 | n/a | n/a | 0.091 | 2.865 | 0.026 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da000000000000021b | 106.441 | 3.519 | n/a | 0.000 | 0.000 | 0.912 | 101.836 | 0.008 | n/a | 0.032 | 0.000 | n/a | n/a | 0.133 | 3.519 | 0.033 | 0.133 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da0000000000000627 | 104.734 | 6.202 | n/a | 0.000 | 0.000 | 3.282 | 95.081 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.113 | 6.202 | 0.059 | 0.113 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da0000000000000745 | 97.908 | 3.032 | n/a | 0.000 | 0.000 | 2.247 | 92.481 | 0.011 | n/a | 0.049 | 0.000 | n/a | n/a | 0.088 | 3.032 | 0.031 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da0000000000000582 | 89.076 | 5.090 | n/a | 0.000 | 0.000 | 0.744 | 83.114 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.089 | 5.090 | 0.057 | 0.089 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da0000000000000614 | 88.685 | 9.483 | n/a | 0.000 | 0.000 | 1.138 | 77.664 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.326 | 9.483 | 0.107 | 0.326 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da000000000000078c | 84.523 | 5.139 | n/a | 0.000 | 0.000 | 0.843 | 78.342 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.143 | 5.139 | 0.061 | 0.143 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da0000000000000656 | 82.896 | 15.602 | n/a | 0.000 | 0.000 | 2.613 | 64.395 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.276 | 15.602 | 0.188 | 0.276 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da000000000000036a | 79.978 | 6.312 | n/a | 0.000 | 0.000 | 0.700 | 72.822 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.094 | 6.312 | 0.079 | 0.094 | gw-r/thread-46/journal/page | none observed |
| 4240664582eea2da0000000000000764 | 77.122 | 8.326 | n/a | 0.000 | 0.000 | 2.428 | 66.129 | 0.129 | n/a | 0.008 | 0.000 | n/a | n/a | 0.103 | 8.326 | 0.108 | 0.103 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da00000000000004f3 | 76.884 | 3.546 | n/a | 0.000 | 0.000 | 1.016 | 72.076 | 0.103 | n/a | 0.041 | 0.000 | n/a | n/a | 0.102 | 3.546 | 0.046 | 0.102 | gw-r/thread-45/journal/page | none observed |

## P3 / tail / internal (2213 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.524 | n/a | n/a | n/a | 4.469 | n/a | 0.000 | 0.000 | 0.267 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.134 | 4.479 | 0.366 | 6.134 |
| p99 | 360.468 | n/a | n/a | n/a | 20.473 | n/a | 2.028 | 0.000 | 1.833 | 357.101 | 0.116 | n/a | 0.038 | 0.000 | n/a | n/a | 46.811 | 22.435 | 0.852 | 46.811 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4240664582eea2da0000000000001a56 | 1012.250 | 2.929 | n/a | 0.000 | 0.000 | 12.497 | 996.588 | 0.097 | n/a | 0.037 | 0.000 | n/a | n/a | 0.103 | 2.929 | 0.003 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da0000000000001a33 | 1002.765 | 0.205 | n/a | 0.000 | 0.000 | 0.735 | 1000.625 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 1.149 | 0.205 | 0.000 | 1.149 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da0000000000001a7f | 1002.572 | 0.278 | n/a | 0.000 | 0.000 | 0.705 | 1000.400 | 0.012 | n/a | 0.035 | 0.000 | n/a | n/a | 1.142 | 0.278 | 0.000 | 1.142 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da0000000000001a3d | 998.512 | 2.720 | n/a | 0.000 | 0.000 | 0.549 | 995.088 | 0.054 | n/a | 0.031 | 0.000 | n/a | n/a | 0.070 | 2.720 | 0.003 | 0.070 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da0000000000001a7b | 994.278 | 4.735 | n/a | 0.000 | 0.000 | 0.609 | 988.749 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.146 | 4.735 | 0.005 | 0.146 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da0000000000001a76 | 984.999 | 5.671 | n/a | 0.000 | 0.000 | 0.623 | 978.463 | 0.105 | n/a | 0.034 | 0.000 | n/a | n/a | 0.102 | 5.671 | 0.006 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da0000000000001a31 | 958.972 | 4.044 | n/a | 0.000 | 0.000 | 0.603 | 954.176 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.112 | 4.044 | 0.004 | 0.112 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da0000000000001a47 | 944.536 | 4.985 | n/a | 0.000 | 0.000 | 0.547 | 938.794 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.145 | 4.985 | 0.005 | 0.145 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da0000000000001a38 | 934.203 | 4.238 | n/a | 0.000 | 0.000 | 0.756 | 929.060 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.113 | 4.238 | 0.005 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da0000000000001a35 | 859.711 | 12.203 | n/a | 0.000 | 0.000 | 4.561 | 842.587 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.326 | 12.203 | 0.014 | 0.326 | gw-r/thread-64/journal/page | none observed |
| 4240664582eea2da0000000000001a58 | 833.882 | 3.323 | n/a | 0.000 | 0.000 | 1.205 | 829.116 | 0.116 | n/a | 0.029 | 0.000 | n/a | n/a | 0.093 | 3.323 | 0.004 | 0.093 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da0000000000001a78 | 739.112 | 3.035 | n/a | 0.000 | 0.000 | 0.573 | 735.228 | 0.107 | n/a | 0.030 | 0.000 | n/a | n/a | 0.138 | 3.035 | 0.004 | 0.138 | gw-r/thread-49/journal/page | none observed |
| 4240664582eea2da0000000000001a52 | 711.719 | 2.358 | n/a | 0.000 | 0.000 | 0.639 | 708.584 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.079 | 2.358 | 0.003 | 0.079 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da0000000000001a4d | 632.347 | 2.720 | n/a | 0.000 | 0.000 | 0.560 | 628.934 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.101 | 2.720 | 0.004 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da0000000000001a3e | 589.950 | 1.746 | n/a | 0.000 | 0.000 | 0.563 | 587.524 | 0.009 | n/a | 0.034 | 0.000 | n/a | n/a | 0.074 | 1.746 | 0.003 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 4240664582eea2da0000000000001a72 | 578.683 | 2.599 | n/a | 0.000 | 0.000 | 0.696 | 575.277 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.078 | 2.599 | 0.004 | 0.078 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da0000000000001a70 | 524.972 | 3.494 | n/a | 0.000 | 0.000 | 0.715 | 520.619 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.086 | 3.494 | 0.007 | 0.086 | gw-r/thread-45/journal/page | none observed |
| 4240664582eea2da0000000000001a5a | 524.849 | 15.592 | n/a | 0.000 | 0.000 | 0.642 | 508.074 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.499 | 15.592 | 0.030 | 0.499 | gw-r/thread-43/journal/page | none observed |
| 4240664582eea2da0000000000001a68 | 464.000 | 2.725 | n/a | 0.000 | 0.000 | 0.779 | 460.294 | 0.107 | n/a | 0.025 | 0.000 | n/a | n/a | 0.070 | 2.725 | 0.006 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 4240664582eea2da0000000000001a66 | 453.769 | 5.148 | n/a | 0.000 | 0.000 | 0.762 | 447.769 | 0.006 | n/a | 0.019 | 0.000 | n/a | n/a | 0.065 | 5.148 | 0.011 | 0.065 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / read (76 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.179 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 201.034 | 0.019 | n/a | 0.128 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 |
| p99 | 209.169 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.830 | 208.054 | 5.181 | n/a | 0.570 | 0.000 | n/a | n/a | 0.406 | 0.000 | 0.000 | 0.406 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82abfb2807dd0e0c0000000000000039 | 209.169 | 0.000 | n/a | 0.000 | 0.000 | 0.589 | 208.054 | 0.054 | n/a | 0.283 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000019 | 204.186 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 202.526 | 0.120 | n/a | 0.570 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000009 | 203.867 | 0.000 | n/a | 0.000 | 0.000 | 1.630 | 201.594 | 0.025 | n/a | 0.213 | 0.000 | n/a | n/a | 0.406 | 0.000 | 0.000 | 0.406 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000008 | 203.450 | 0.000 | n/a | 0.000 | 0.000 | 1.830 | 201.236 | 0.017 | n/a | 0.145 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c000000000000004f | 203.388 | 0.000 | n/a | 0.000 | 0.000 | 1.695 | 201.287 | 0.019 | n/a | 0.153 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 | gw-r/thread-50/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000041 | 203.211 | 0.000 | n/a | 0.000 | 0.000 | 1.510 | 201.291 | 0.016 | n/a | 0.166 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c000000000000001e | 203.120 | 0.000 | n/a | 0.000 | 0.000 | 1.142 | 201.525 | 0.054 | n/a | 0.288 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000037 | 203.098 | 0.000 | n/a | 0.000 | 0.000 | 1.028 | 201.721 | 0.025 | n/a | 0.185 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000057 | 203.085 | 0.000 | n/a | 0.000 | 0.000 | 1.025 | 201.635 | 0.021 | n/a | 0.250 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000032 | 203.016 | 0.000 | n/a | 0.000 | 0.000 | 0.989 | 201.592 | 0.021 | n/a | 0.198 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c000000000000000f | 203.007 | 0.000 | n/a | 0.000 | 0.000 | 1.044 | 201.622 | 0.090 | n/a | 0.139 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000012 | 202.923 | 0.000 | n/a | 0.000 | 0.000 | 0.867 | 201.658 | 0.018 | n/a | 0.159 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c000000000000000e | 202.920 | 0.000 | n/a | 0.000 | 0.000 | 0.878 | 201.600 | 0.028 | n/a | 0.261 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000055 | 202.899 | 0.000 | n/a | 0.000 | 0.000 | 0.671 | 201.277 | 0.695 | n/a | 0.100 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c000000000000002b | 202.880 | 0.000 | n/a | 0.000 | 0.000 | 0.906 | 201.577 | 0.027 | n/a | 0.217 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c000000000000003e | 202.833 | 0.000 | n/a | 0.000 | 0.000 | 1.121 | 201.370 | 0.016 | n/a | 0.141 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c000000000000003b | 202.815 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 201.577 | 0.036 | n/a | 0.195 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c000000000000004b | 202.750 | 0.000 | n/a | 0.000 | 0.000 | 0.713 | 201.575 | 0.132 | n/a | 0.192 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000015 | 202.750 | 0.000 | n/a | 0.000 | 0.000 | 0.928 | 201.417 | 0.029 | n/a | 0.167 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000040 | 202.722 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 201.529 | 0.043 | n/a | 0.163 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.164 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.862 | 200.997 | 0.018 | n/a | 0.107 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 |
| p99 | 205.419 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.726 | 203.619 | 4.625 | n/a | 0.343 | 0.000 | n/a | n/a | 0.306 | 0.000 | 0.000 | 0.306 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82abfb2807dd0e0c000000000000007a | 205.419 | 0.000 | n/a | 0.000 | 0.000 | 1.473 | 203.619 | 0.020 | n/a | 0.187 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000077 | 204.413 | 0.000 | n/a | 0.000 | 0.000 | 2.726 | 201.353 | 0.016 | n/a | 0.113 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c000000000000006a | 204.123 | 0.000 | n/a | 0.000 | 0.000 | 1.400 | 202.101 | 0.022 | n/a | 0.343 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c000000000000006d | 203.196 | 0.000 | n/a | 0.000 | 0.000 | 0.892 | 201.876 | 0.039 | n/a | 0.257 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000bb | 203.071 | 0.000 | n/a | 0.000 | 0.000 | 1.130 | 201.603 | 0.048 | n/a | 0.126 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000083 | 203.069 | 0.000 | n/a | 0.000 | 0.000 | 1.032 | 201.755 | 0.016 | n/a | 0.130 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-50/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000098 | 203.031 | 0.000 | n/a | 0.000 | 0.000 | 0.927 | 201.628 | 0.027 | n/a | 0.248 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-50/journal/page | none observed |
| 82abfb2807dd0e0c000000000000009f | 203.024 | 0.000 | n/a | 0.000 | 0.000 | 1.834 | 200.775 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.306 | 0.000 | 0.000 | 0.306 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000088 | 203.019 | 0.000 | n/a | 0.000 | 0.000 | 1.032 | 201.423 | 0.043 | n/a | 0.220 | 0.000 | n/a | n/a | 0.300 | 0.000 | 0.000 | 0.300 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000b8 | 202.914 | 0.000 | n/a | 0.000 | 0.000 | 1.267 | 201.319 | 0.017 | n/a | 0.119 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000093 | 202.852 | 0.000 | n/a | 0.000 | 0.000 | 1.341 | 201.143 | 0.015 | n/a | 0.049 | 0.000 | n/a | n/a | 0.305 | 0.000 | 0.000 | 0.305 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000061 | 202.840 | 0.000 | n/a | 0.000 | 0.000 | 1.146 | 201.344 | 0.039 | n/a | 0.193 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000094 | 202.785 | 0.000 | n/a | 0.000 | 0.000 | 1.125 | 201.328 | 0.037 | n/a | 0.190 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c000000000000008c | 202.705 | 0.000 | n/a | 0.000 | 0.000 | 1.680 | 200.612 | 0.015 | n/a | 0.171 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000080 | 202.692 | 0.000 | n/a | 0.000 | 0.000 | 0.976 | 201.421 | 0.018 | n/a | 0.153 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000b3 | 202.673 | 0.000 | n/a | 0.000 | 0.000 | 0.864 | 201.465 | 0.025 | n/a | 0.177 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000066 | 202.658 | 0.000 | n/a | 0.000 | 0.000 | 1.179 | 201.213 | 0.011 | n/a | 0.107 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-50/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000092 | 202.647 | 0.000 | n/a | 0.000 | 0.000 | 0.839 | 201.340 | 0.023 | n/a | 0.214 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000a7 | 202.638 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 201.414 | 0.019 | n/a | 0.184 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c000000000000006e | 202.621 | 0.000 | n/a | 0.000 | 0.000 | 0.917 | 201.377 | 0.040 | n/a | 0.164 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-64/journal/page | none observed |

## P3 / L4 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.868 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.762 | 200.867 | 0.012 | n/a | 0.068 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 |
| p99 | 207.511 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.758 | 204.306 | 4.482 | n/a | 0.237 | 0.000 | n/a | n/a | 0.532 | 0.000 | 0.000 | 0.532 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82abfb2807dd0e0c00000000000000d6 | 207.511 | 0.000 | n/a | 0.000 | 0.000 | 2.758 | 204.306 | 0.035 | n/a | 0.227 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000103 | 205.825 | 0.000 | n/a | 0.000 | 0.000 | 2.159 | 203.063 | 0.010 | n/a | 0.110 | 0.000 | n/a | n/a | 0.482 | 0.000 | 0.000 | 0.482 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000109 | 203.781 | 0.000 | n/a | 0.000 | 0.000 | 1.531 | 201.853 | 0.008 | n/a | 0.118 | 0.000 | n/a | n/a | 0.271 | 0.000 | 0.000 | 0.271 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000d2 | 203.740 | 0.000 | n/a | 0.000 | 0.000 | 1.708 | 201.412 | 0.014 | n/a | 0.074 | 0.000 | n/a | n/a | 0.532 | 0.000 | 0.000 | 0.532 | gw-r/thread-50/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000fc | 203.624 | 0.000 | n/a | 0.000 | 0.000 | 1.616 | 201.704 | 0.009 | n/a | 0.098 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000fb | 203.513 | 0.000 | n/a | 0.000 | 0.000 | 2.341 | 200.938 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000f4 | 203.402 | 0.000 | n/a | 0.000 | 0.000 | 1.685 | 201.074 | 0.018 | n/a | 0.237 | 0.000 | n/a | n/a | 0.388 | 0.000 | 0.000 | 0.388 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000f6 | 203.094 | 0.000 | n/a | 0.000 | 0.000 | 0.841 | 201.936 | 0.024 | n/a | 0.141 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000d4 | 202.980 | 0.000 | n/a | 0.000 | 0.000 | 1.289 | 201.322 | 0.009 | n/a | 0.082 | 0.000 | n/a | n/a | 0.278 | 0.000 | 0.000 | 0.278 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c000000000000011c | 202.936 | 0.000 | n/a | 0.000 | 0.000 | 1.001 | 201.667 | 0.010 | n/a | 0.109 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000e9 | 202.688 | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 201.676 | 0.015 | n/a | 0.107 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c000000000000011b | 202.654 | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 201.545 | 0.032 | n/a | 0.173 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000129 | 202.601 | 0.000 | n/a | 0.000 | 0.000 | 0.745 | 201.644 | 0.011 | n/a | 0.101 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000e6 | 202.563 | 0.000 | n/a | 0.000 | 0.000 | 0.952 | 201.431 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000d1 | 202.487 | 0.000 | n/a | 0.000 | 0.000 | 0.911 | 201.047 | 0.020 | n/a | 0.141 | 0.000 | n/a | n/a | 0.369 | 0.000 | 0.000 | 0.369 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000fe | 202.459 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 201.343 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000cc | 202.423 | 0.000 | n/a | 0.000 | 0.000 | 0.857 | 201.260 | 0.028 | n/a | 0.160 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000f7 | 202.371 | 0.000 | n/a | 0.000 | 0.000 | 1.022 | 201.065 | 0.014 | n/a | 0.053 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c00000000000000c6 | 202.353 | 0.000 | n/a | 0.000 | 0.000 | 0.787 | 201.205 | 0.025 | n/a | 0.142 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000102 | 202.342 | 0.000 | n/a | 0.000 | 0.000 | 0.730 | 201.284 | 0.014 | n/a | 0.115 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.861 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.758 | 200.924 | 0.012 | n/a | 0.060 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 |
| p99 | 204.472 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.493 | 202.857 | 3.393 | n/a | 0.192 | 0.000 | n/a | n/a | 0.313 | 0.000 | 0.000 | 0.313 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82abfb2807dd0e0c000000000000017c | 204.472 | 0.000 | n/a | 0.000 | 0.000 | 1.179 | 202.857 | 0.037 | n/a | 0.112 | 0.000 | n/a | n/a | 0.288 | 0.000 | 0.000 | 0.288 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000194 | 203.969 | 0.000 | n/a | 0.000 | 0.000 | 1.254 | 202.395 | 0.043 | n/a | 0.070 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000167 | 203.659 | 0.000 | n/a | 0.000 | 0.000 | 2.493 | 200.943 | 0.015 | n/a | 0.051 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000186 | 203.203 | 0.000 | n/a | 0.000 | 0.000 | 1.311 | 201.443 | 0.012 | n/a | 0.123 | 0.000 | n/a | n/a | 0.313 | 0.000 | 0.000 | 0.313 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c000000000000013d | 203.154 | 0.000 | n/a | 0.000 | 0.000 | 0.599 | 202.349 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c000000000000012c | 203.124 | 0.000 | n/a | 0.000 | 0.000 | 1.110 | 201.718 | 0.042 | n/a | 0.108 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c000000000000012e | 202.985 | 0.000 | n/a | 0.000 | 0.000 | 1.074 | 201.655 | 0.012 | n/a | 0.104 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c000000000000014d | 202.852 | 0.000 | n/a | 0.000 | 0.000 | 1.198 | 201.447 | 0.026 | n/a | 0.077 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c000000000000016d | 202.801 | 0.000 | n/a | 0.000 | 0.000 | 1.183 | 201.339 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000187 | 202.553 | 0.000 | n/a | 0.000 | 0.000 | 1.045 | 201.252 | 0.006 | n/a | 0.088 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000193 | 202.510 | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 201.512 | 0.033 | n/a | 0.077 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c000000000000017d | 202.486 | 0.000 | n/a | 0.000 | 0.000 | 1.198 | 201.010 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000130 | 202.442 | 0.000 | n/a | 0.000 | 0.000 | 0.623 | 201.475 | 0.042 | n/a | 0.192 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000152 | 202.408 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 201.246 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c000000000000015a | 202.403 | 0.000 | n/a | 0.000 | 0.000 | 1.131 | 201.090 | 0.012 | n/a | 0.041 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000185 | 202.402 | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 201.202 | 0.014 | n/a | 0.143 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000173 | 202.393 | 0.000 | n/a | 0.000 | 0.000 | 0.737 | 201.420 | 0.022 | n/a | 0.091 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c000000000000013f | 202.362 | 0.000 | n/a | 0.000 | 0.000 | 0.854 | 201.302 | 0.007 | n/a | 0.090 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000170 | 202.304 | 0.000 | n/a | 0.000 | 0.000 | 0.917 | 201.027 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.297 | 0.000 | 0.000 | 0.297 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c000000000000018c | 202.283 | 0.000 | n/a | 0.000 | 0.000 | 0.914 | 201.185 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / read (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.593 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.718 | 200.751 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 |
| p99 | 205.041 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.621 | 204.238 | 2.790 | n/a | 0.169 | 0.000 | n/a | n/a | 0.350 | 0.000 | 0.000 | 0.350 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82abfb2807dd0e0c00000000000001a4 | 205.956 | 0.000 | n/a | 0.000 | 0.000 | 0.913 | 204.742 | 0.027 | n/a | 0.079 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001bc | 205.041 | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 204.238 | 0.018 | n/a | 0.068 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000197 | 202.986 | 0.000 | n/a | 0.000 | 0.000 | 1.621 | 201.133 | 0.021 | n/a | 0.092 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001c8 | 202.763 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 201.646 | 0.015 | n/a | 0.113 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001ae | 202.651 | 0.000 | n/a | 0.000 | 0.000 | 1.672 | 200.632 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.301 | 0.000 | 0.000 | 0.301 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001ea | 202.508 | 0.000 | n/a | 0.000 | 0.000 | 1.550 | 200.757 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001bb | 202.459 | 0.000 | n/a | 0.000 | 0.000 | 1.007 | 201.044 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.350 | 0.000 | 0.000 | 0.350 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001d7 | 202.351 | 0.000 | n/a | 0.000 | 0.000 | 0.846 | 201.248 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001b6 | 202.335 | 0.000 | n/a | 0.000 | 0.000 | 0.693 | 201.363 | 0.017 | n/a | 0.093 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001aa | 202.274 | 0.000 | n/a | 0.000 | 0.000 | 0.929 | 201.105 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001e5 | 202.198 | 0.000 | n/a | 0.000 | 0.000 | 1.024 | 200.881 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001db | 202.182 | 0.000 | n/a | 0.000 | 0.000 | 0.649 | 201.333 | 0.011 | n/a | 0.097 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001c1 | 202.155 | 0.000 | n/a | 0.000 | 0.000 | 0.776 | 201.197 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001ba | 202.131 | 0.000 | n/a | 0.000 | 0.000 | 1.087 | 200.791 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001a5 | 202.089 | 0.000 | n/a | 0.000 | 0.000 | 0.885 | 201.005 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001cf | 202.080 | 0.000 | n/a | 0.000 | 0.000 | 0.532 | 201.246 | 0.028 | n/a | 0.169 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001de | 202.078 | 0.000 | n/a | 0.000 | 0.000 | 1.027 | 200.823 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001ef | 202.048 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 200.956 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001c9 | 202.047 | 0.000 | n/a | 0.000 | 0.000 | 0.668 | 201.170 | 0.009 | n/a | 0.098 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c00000000000001a8 | 202.014 | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 200.909 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.685 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.723 | 200.802 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 |
| p99 | 203.402 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.093 | 201.981 | 0.834 | n/a | 0.591 | 0.000 | n/a | n/a | 0.356 | 0.000 | 0.000 | 0.356 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82abfb2807dd0e0c000000000000024c | 209.233 | 0.000 | n/a | 0.000 | 0.000 | 2.093 | 206.036 | 0.063 | n/a | 0.596 | 0.000 | n/a | n/a | 0.446 | 0.000 | 0.000 | 0.446 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c000000000000023b | 203.402 | 0.000 | n/a | 0.000 | 0.000 | 1.605 | 201.557 | 0.021 | n/a | 0.104 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c000000000000020d | 203.391 | 0.000 | n/a | 0.000 | 0.000 | 1.763 | 201.399 | 0.016 | n/a | 0.096 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c000000000000026d | 203.069 | 0.000 | n/a | 0.000 | 0.000 | 0.848 | 201.842 | 0.068 | n/a | 0.123 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c000000000000022e | 203.059 | 0.000 | n/a | 0.000 | 0.000 | 1.161 | 201.672 | 0.041 | n/a | 0.079 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000264 | 202.893 | 0.000 | n/a | 0.000 | 0.000 | 1.259 | 201.396 | 0.012 | n/a | 0.081 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c000000000000021b | 202.853 | 0.000 | n/a | 0.000 | 0.000 | 0.648 | 201.981 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000234 | 202.837 | 0.000 | n/a | 0.000 | 0.000 | 0.619 | 201.901 | 0.015 | n/a | 0.167 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c000000000000024b | 202.831 | 0.000 | n/a | 0.000 | 0.000 | 1.301 | 201.255 | 0.015 | n/a | 0.115 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000277 | 202.616 | 0.000 | n/a | 0.000 | 0.000 | 1.434 | 200.910 | 0.009 | n/a | 0.086 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000251 | 202.576 | 0.000 | n/a | 0.000 | 0.000 | 1.286 | 201.077 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000257 | 202.550 | 0.000 | n/a | 0.000 | 0.000 | 1.136 | 201.214 | 0.018 | n/a | 0.073 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000236 | 202.525 | 0.000 | n/a | 0.000 | 0.000 | 1.130 | 201.043 | 0.010 | n/a | 0.108 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c000000000000026e | 202.463 | 0.000 | n/a | 0.000 | 0.000 | 1.050 | 201.166 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000242 | 202.422 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 201.324 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c000000000000024f | 202.343 | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 201.258 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000275 | 202.297 | 0.000 | n/a | 0.000 | 0.000 | 0.617 | 201.404 | 0.014 | n/a | 0.118 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c000000000000020c | 202.293 | 0.000 | n/a | 0.000 | 0.000 | 0.569 | 201.406 | 0.026 | n/a | 0.126 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000268 | 202.249 | 0.000 | n/a | 0.000 | 0.000 | 0.948 | 200.998 | 0.022 | n/a | 0.110 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000269 | 202.243 | 0.000 | n/a | 0.000 | 0.000 | 1.089 | 200.958 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / read (67 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 70.189 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.663 | 69.454 | 0.009 | n/a | 0.039 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 |
| p99 | 207.162 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.475 | 205.056 | 2.012 | n/a | 0.128 | 0.000 | n/a | n/a | 51.006 | 0.000 | 0.000 | 51.006 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82abfb2807dd0e0c000000000000028d | 207.162 | 0.000 | n/a | 0.000 | 0.000 | 1.906 | 205.056 | 0.014 | n/a | 0.088 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000289 | 202.739 | 0.000 | n/a | 0.000 | 0.000 | 0.881 | 201.484 | 0.077 | n/a | 0.108 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000284 | 202.707 | 0.000 | n/a | 0.000 | 0.000 | 1.324 | 201.157 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000291 | 202.503 | 0.000 | n/a | 0.000 | 0.000 | 0.857 | 201.394 | 0.025 | n/a | 0.098 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c000000000000027e | 202.401 | 0.000 | n/a | 0.000 | 0.000 | 0.960 | 201.150 | 0.020 | n/a | 0.117 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c000000000000028a | 202.342 | 0.000 | n/a | 0.000 | 0.000 | 0.974 | 201.093 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c000000000000028b | 202.323 | 0.000 | n/a | 0.000 | 0.000 | 1.034 | 201.073 | 0.014 | n/a | 0.054 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c000000000000027d | 201.960 | 0.000 | n/a | 0.000 | 0.000 | 0.665 | 201.062 | 0.010 | n/a | 0.081 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000292 | 201.843 | 0.000 | n/a | 0.000 | 0.000 | 0.556 | 201.047 | 0.014 | n/a | 0.128 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c000000000000028f | 201.777 | 0.000 | n/a | 0.000 | 0.000 | 0.730 | 200.805 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000296 | 201.760 | 0.000 | n/a | 0.000 | 0.000 | 0.586 | 200.890 | 0.019 | n/a | 0.085 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000297 | 201.745 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 200.781 | 0.014 | n/a | 0.051 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c000000000000027f | 201.700 | 0.000 | n/a | 0.000 | 0.000 | 0.533 | 200.996 | 0.012 | n/a | 0.068 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000283 | 201.698 | 0.000 | n/a | 0.000 | 0.000 | 0.685 | 200.757 | 0.014 | n/a | 0.068 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000282 | 201.648 | 0.000 | n/a | 0.000 | 0.000 | 0.721 | 200.703 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000290 | 201.549 | 0.000 | n/a | 0.000 | 0.000 | 0.621 | 200.740 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000295 | 201.527 | 0.000 | n/a | 0.000 | 0.000 | 0.547 | 200.770 | 0.016 | n/a | 0.082 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000294 | 201.425 | 0.000 | n/a | 0.000 | 0.000 | 0.574 | 200.654 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000286 | 201.372 | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 200.628 | 0.011 | n/a | 0.053 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c000000000000027c | 201.239 | 0.000 | n/a | 0.000 | 0.000 | 0.554 | 200.535 | 0.012 | n/a | 0.048 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |

## P3 / tail / read (218 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 82.854 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 80.983 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 |
| p99 | 203.192 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.765 | 201.148 | 1.166 | n/a | 0.100 | 0.000 | n/a | n/a | 50.396 | 0.000 | 0.000 | 50.396 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 82abfb2807dd0e0c0000000000000eb2 | 229.259 | 0.000 | n/a | 0.000 | 0.000 | 28.434 | 200.598 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000ea8 | 203.612 | 0.000 | n/a | 0.000 | 0.000 | 1.612 | 201.519 | 0.016 | n/a | 0.071 | 0.000 | n/a | n/a | 0.395 | 0.000 | 0.000 | 0.395 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000eae | 203.192 | 0.000 | n/a | 0.000 | 0.000 | 1.859 | 201.097 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000ed4 | 202.920 | 0.000 | n/a | 0.000 | 0.000 | 0.702 | 201.919 | 0.025 | n/a | 0.103 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000ee2 | 202.472 | 0.000 | n/a | 0.000 | 0.000 | 1.370 | 200.890 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000e72 | 202.277 | 0.000 | n/a | 0.000 | 0.000 | 1.235 | 200.710 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.278 | 0.000 | 0.000 | 0.278 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000ea9 | 202.160 | 0.000 | n/a | 0.000 | 0.000 | 0.774 | 201.111 | 0.010 | n/a | 0.100 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-43/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000eab | 202.040 | 0.000 | n/a | 0.000 | 0.000 | 0.672 | 201.148 | 0.017 | n/a | 0.076 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-49/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000edf | 201.898 | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 200.817 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000ee1 | 201.887 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 201.083 | 0.020 | n/a | 0.074 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000ebd | 201.865 | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 200.819 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000e7d | 201.863 | 0.000 | n/a | 0.000 | 0.000 | 0.702 | 200.775 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.319 | 0.000 | 0.000 | 0.319 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000e74 | 201.857 | 0.000 | n/a | 0.000 | 0.000 | 0.890 | 200.656 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-48/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000ee0 | 201.836 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 200.774 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-64/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000e7c | 201.835 | 0.000 | n/a | 0.000 | 0.000 | 0.742 | 200.860 | 0.013 | n/a | 0.062 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000ed7 | 201.770 | 0.000 | n/a | 0.000 | 0.000 | 0.629 | 200.901 | 0.011 | n/a | 0.098 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000ed5 | 201.764 | 0.000 | n/a | 0.000 | 0.000 | 0.583 | 200.977 | 0.027 | n/a | 0.056 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000ebb | 201.695 | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 200.775 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-46/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000ecb | 201.688 | 0.000 | n/a | 0.000 | 0.000 | 0.686 | 200.796 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-47/journal/page | none observed |
| 82abfb2807dd0e0c0000000000000ec0 | 201.659 | 0.000 | n/a | 0.000 | 0.000 | 0.928 | 200.562 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-49/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
