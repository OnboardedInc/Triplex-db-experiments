# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.subject` (68.080 ms, trace `54f5c68b5b0806750000000000000ea5`); `node-14/thread-0/driver.queue.subject` (50.121 ms, trace `54f5c68b5b080675000000000000035c`); `gw-w/thread-64/peer.transact-await (includes order/network/storage)` (33.438 ms, trace `54f5c68b5b0806750000000000000355`); `node-14/thread-0/client.commit-send-queue` (41.777 ms, trace `54f5c68b5b0806750000000000000354`); `node-14/thread-0/driver.queue.subject` (86.391 ms, trace `54f5c68b5b0806750000000000000365`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p4-tls-zero-a-3-baseline`; source `a8bc259a437829f8d65e9630ab698b30bf202117`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 6650919.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 207 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14408.815 | 617.990 | 33.099 | 311 |
| L1 | 0 | 19968.443 | 427.671 | 17.690 | 462 |
| L4 | 0 | 19972.832 | 386.057 | 21.826 | 426 |
| L16 | 0 | 19983.850 | 396.353 | 8.866 | 474 |
| L64 | 0 | 19986.691 | 448.419 | 7.956 | 601 |
| L256 | 0 | 19966.516 | 387.297 | 13.547 | 481 |
| L1024 | 0 | 19984.471 | 3833.083 | 153.087 | 12016 |
| tail | 0 | 64573.944 | 11160.323 | 670.467 | 37397 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 54f5c68b5b0806750000000000000ea5 | driver.queue.subject | 68.080 | 54f5c68b5b0806750000000000000ea2 | 4 / 32 |
| 54f5c68b5b0806750000000000000ea5 | driver.queue.scheduler-late | 33.438 | none | 4 / 32 |
| 54f5c68b5b0806750000000000000ea5 | driver.queue.scheduler-dispatch | 0.115 | none | 2 / 32 |

Observed active steps while trace 54f5c68b5b0806750000000000000ea5 waited: [{"at":1794615770021.6074,"inFlight":4,"capacity":32,"active":[{"traceId":"54f5c68b5b0806750000000000000ea0","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000ea1","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000ea2","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000ea3","step":"rpc.probe.transact"}]},{"at":1794615770051.4148,"inFlight":3,"capacity":32,"active":[{"traceId":"54f5c68b5b0806750000000000000ea0","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000ea1","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000ea2","step":"client.http"}]},{"at":1794615770071.5945,"inFlight":2,"capacity":32,"active":[{"traceId":"54f5c68b5b0806750000000000000ea2","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000ea9","step":"client.http"}]}]

| 54f5c68b5b080675000000000000035c | driver.queue.subject | 50.121 | 54f5c68b5b0806750000000000000353 | 7 / 32 |
| 54f5c68b5b080675000000000000035c | driver.queue.scheduler-late | 10.051 | none | 7 / 32 |
| 54f5c68b5b080675000000000000035c | driver.queue.scheduler-dispatch | 0.138 | none | 9 / 32 |

Observed active steps while trace 54f5c68b5b080675000000000000035c waited: [{"at":1794615743790.575,"inFlight":6,"capacity":32,"active":[{"traceId":"54f5c68b5b0806750000000000000353","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000354","step":"client.commit-send-queue"},{"traceId":"54f5c68b5b0806750000000000000355","step":"client.commit-send-queue"},{"traceId":"54f5c68b5b0806750000000000000359","step":"client.commit-send-queue"},{"traceId":"54f5c68b5b080675000000000000035a","step":"client.commit-send-queue"},{"traceId":"54f5c68b5b080675000000000000035b","step":"client.commit-send-queue"}]},{"at":1794615743810.053,"inFlight":10,"capacity":32,"active":[{"traceId":"54f5c68b5b0806750000000000000353","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000354","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000355","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000359","step":"client.http"},{"traceId":"54f5c68b5b080675000000000000035a","step":"client.http"},{"traceId":"54f5c68b5b080675000000000000035b","step":"client.http"},{"traceId":"54f5c68b5b080675000000000000035e","step":"client.http"},{"traceId":"54f5c68b5b080675000000000000035f","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000361","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000362","step":"client.http"}]}]

| 54f5c68b5b0806750000000000000355 | driver.queue.scheduler-late | 14.663 | none | 6 / 32 |
| 54f5c68b5b0806750000000000000355 | driver.queue.scheduler-dispatch | 0.015 | none | 6 / 32 |

Observed active steps while trace 54f5c68b5b0806750000000000000355 waited: []

| 54f5c68b5b0806750000000000000354 | driver.queue.scheduler-late | 24.256 | none | 5 / 32 |
| 54f5c68b5b0806750000000000000354 | driver.queue.scheduler-dispatch | 0.016 | none | 5 / 32 |

Observed active steps while trace 54f5c68b5b0806750000000000000354 waited: []

| 54f5c68b5b0806750000000000000365 | driver.queue.subject | 86.391 | 54f5c68b5b0806750000000000000364 | 10 / 32 |
| 54f5c68b5b0806750000000000000365 | driver.queue.scheduler-late | 2.796 | none | 10 / 32 |
| 54f5c68b5b0806750000000000000365 | driver.queue.scheduler-dispatch | 0.131 | none | 1 / 32 |

Observed active steps while trace 54f5c68b5b0806750000000000000365 waited: [{"at":1794615743841.204,"inFlight":7,"capacity":32,"active":[{"traceId":"54f5c68b5b0806750000000000000355","step":"client.http"},{"traceId":"54f5c68b5b080675000000000000035b","step":"client.http"},{"traceId":"54f5c68b5b080675000000000000035e","step":"client.http"},{"traceId":"54f5c68b5b080675000000000000035f","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000361","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000362","step":"client.http"},{"traceId":"54f5c68b5b080675000000000000035c","step":"client.http"}]},{"at":1794615743860.8586,"inFlight":5,"capacity":32,"active":[{"traceId":"54f5c68b5b080675000000000000035f","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000361","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000362","step":"client.http"},{"traceId":"54f5c68b5b080675000000000000035c","step":"client.http"},{"traceId":"54f5c68b5b080675000000000000036a","step":"client.http"}]},{"at":1794615743881.1248,"inFlight":4,"capacity":32,"active":[{"traceId":"54f5c68b5b0806750000000000000362","step":"client.http"},{"traceId":"54f5c68b5b080675000000000000035c","step":"client.http"},{"traceId":"54f5c68b5b080675000000000000036a","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000360","step":"client.http"}]},{"at":1794615743904.299,"inFlight":2,"capacity":32,"active":[{"traceId":"54f5c68b5b0806750000000000000364","step":"client.http"},{"traceId":"54f5c68b5b0806750000000000000375","step":"client.http"}]}]

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.135 | 0.615 | 0.000 | 1.600 | 4.988 | 0.209 | 0.000 | 0.135 | 1.571 | 8.682 | 0.063 | n/a | 0.607 | 14.752 | n/a | n/a | 0.063 | 5.527 | 0.216 | 0.063 |
| p99 | 68.552 | 5.286 | 0.003 | 10.888 | 12.938 | 0.919 | 6.351 | 27.416 | 3.779 | 25.438 | 0.745 | n/a | 3.729 | 27.557 | n/a | n/a | 0.302 | 38.851 | 0.671 | 0.302 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b08067500000000000000f0 | 68.552 | 12.938 | 0.508 | 0.000 | 0.086 | 2.905 | 23.844 | 0.226 | n/a | 0.426 | 27.557 | n/a | n/a | 0.061 | 13.532 | 0.197 | 0.061 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000114 | 63.130 | 9.746 | 0.006 | 3.249 | 0.618 | 1.241 | 25.438 | 0.079 | n/a | 0.190 | 22.516 | n/a | n/a | 0.047 | 13.618 | 0.216 | 0.047 | gw-w/thread-47/commit.prepare-and-validate | none observed |
| 54f5c68b5b08067500000000000000fd | 57.921 | 7.508 | 0.010 | 3.918 | 27.416 | 1.139 | 2.472 | 0.046 | n/a | 0.578 | 14.752 | n/a | n/a | 0.083 | 38.851 | 0.671 | 0.083 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 54f5c68b5b08067500000000000000ee | 57.327 | 12.667 | 0.011 | 6.351 | 1.204 | 0.912 | 9.914 | 0.089 | n/a | 0.765 | 25.112 | n/a | n/a | 0.302 | 20.233 | 0.353 | 0.302 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000000f4 | 45.908 | 5.784 | 0.431 | 0.000 | 0.067 | 1.826 | 14.257 | 0.051 | n/a | 0.095 | 23.313 | n/a | n/a | 0.083 | 6.283 | 0.137 | 0.083 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000000f8 | 40.362 | 7.114 | 0.509 | 0.000 | 0.067 | 3.027 | 15.445 | 0.068 | n/a | 3.564 | 10.493 | n/a | n/a | 0.076 | 7.690 | 0.191 | 0.076 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000011e | 39.873 | 6.008 | 0.311 | 0.583 | 0.083 | 1.711 | 12.383 | 0.052 | n/a | 0.840 | 17.841 | n/a | n/a | 0.062 | 6.984 | 0.175 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000100 | 38.807 | 12.521 | 0.323 | 0.000 | 0.133 | 1.899 | 8.447 | 0.075 | n/a | 0.428 | 14.899 | n/a | n/a | 0.081 | 12.977 | 0.334 | 0.081 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000000fa | 38.270 | 4.753 | 0.269 | 0.000 | 0.068 | 2.161 | 13.397 | 0.047 | n/a | 0.607 | 16.892 | n/a | n/a | 0.076 | 5.090 | 0.133 | 0.076 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000124 | 37.575 | 3.551 | 0.450 | 0.000 | 0.108 | 1.564 | 15.616 | 0.092 | n/a | 1.987 | 14.152 | n/a | n/a | 0.055 | 4.109 | 0.109 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000102 | 37.172 | 5.856 | 0.353 | 2.148 | 0.196 | 1.571 | 9.599 | 0.045 | n/a | 0.391 | 16.973 | n/a | n/a | 0.041 | 8.552 | 0.230 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000108 | 36.239 | 4.988 | 0.246 | 0.000 | 0.115 | 1.585 | 12.922 | 0.097 | n/a | 0.142 | 16.087 | n/a | n/a | 0.056 | 5.349 | 0.148 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000010c | 36.112 | 4.608 | 0.359 | 0.425 | 0.135 | 2.454 | 6.940 | 0.063 | n/a | 2.991 | 18.073 | n/a | n/a | 0.063 | 5.527 | 0.153 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000112 | 35.415 | 4.779 | 0.477 | 0.000 | 0.118 | 3.779 | 10.404 | 0.065 | n/a | 0.664 | 15.046 | n/a | n/a | 0.084 | 5.373 | 0.152 | 0.084 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000010a | 34.135 | 5.165 | 0.919 | 0.000 | 0.084 | 3.097 | 9.865 | 0.060 | n/a | 3.729 | 11.169 | n/a | n/a | 0.047 | 6.168 | 0.181 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000116 | 34.106 | 4.240 | 0.253 | 0.405 | 0.134 | 2.432 | 12.900 | 0.064 | n/a | 0.710 | 12.900 | n/a | n/a | 0.068 | 5.031 | 0.148 | 0.068 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000126 | 33.916 | 4.605 | 0.233 | 0.532 | 0.072 | 1.579 | 12.991 | 0.060 | n/a | 0.117 | 13.681 | n/a | n/a | 0.046 | 5.442 | 0.160 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000011a | 31.504 | 4.448 | 0.209 | 0.000 | 0.080 | 1.554 | 8.682 | 0.087 | n/a | 0.983 | 15.417 | n/a | n/a | 0.044 | 4.737 | 0.150 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000000f6 | 29.940 | 6.665 | 0.012 | 0.000 | 0.348 | 1.374 | 1.980 | 0.050 | n/a | 2.844 | 16.555 | n/a | n/a | 0.113 | 7.025 | 0.235 | 0.113 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000011b | 27.195 | 5.340 | 0.005 | 0.000 | 1.011 | 1.217 | 5.593 | 0.059 | n/a | 0.114 | 13.786 | n/a | n/a | 0.070 | 6.356 | 0.234 | 0.070 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.108 | 0.948 | 0.000 | 1.785 | 4.324 | 0.006 | 0.000 | 0.485 | 1.325 | 1.980 | 0.061 | n/a | 0.568 | 9.722 | n/a | n/a | 0.058 | 5.107 | 0.235 | 0.058 |
| p99 | 29.940 | 2.377 | 0.000 | 2.780 | 6.665 | 0.012 | 0.000 | 1.011 | 2.056 | 5.593 | 0.745 | n/a | 2.844 | 16.555 | n/a | n/a | 0.219 | 7.025 | 0.398 | 0.219 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b08067500000000000000f6 | 29.940 | 6.665 | 0.012 | 0.000 | 0.348 | 1.374 | 1.980 | 0.050 | n/a | 2.844 | 16.555 | n/a | n/a | 0.113 | 7.025 | 0.235 | 0.113 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000011b | 27.195 | 5.340 | 0.005 | 0.000 | 1.011 | 1.217 | 5.593 | 0.059 | n/a | 0.114 | 13.786 | n/a | n/a | 0.070 | 6.356 | 0.234 | 0.070 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000010f | 24.684 | 4.307 | 0.006 | 0.000 | 0.879 | 1.103 | 1.921 | 0.050 | n/a | 0.568 | 15.793 | n/a | n/a | 0.057 | 5.191 | 0.210 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000000f2 | 23.567 | 4.275 | 0.007 | 0.000 | 0.824 | 1.590 | 2.098 | 0.061 | n/a | 0.554 | 13.938 | n/a | n/a | 0.219 | 5.107 | 0.217 | 0.219 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000120 | 20.108 | 4.618 | 0.006 | 0.000 | 0.110 | 2.056 | 2.723 | 0.117 | n/a | 0.703 | 9.722 | n/a | n/a | 0.052 | 4.734 | 0.235 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000122 | 17.137 | 4.919 | 0.010 | 0.000 | 0.485 | 1.321 | 2.053 | 0.089 | n/a | 0.674 | 7.506 | n/a | n/a | 0.080 | 5.414 | 0.316 | 0.080 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000010d | 14.855 | 3.816 | 0.005 | 0.000 | 0.225 | 1.222 | 1.916 | 0.082 | n/a | 0.781 | 6.765 | n/a | n/a | 0.042 | 4.046 | 0.272 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000117 | 14.498 | 4.324 | 0.005 | 0.000 | 0.485 | 1.389 | 1.953 | 0.745 | n/a | 0.205 | 5.335 | n/a | n/a | 0.057 | 4.814 | 0.332 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000000fb | 12.008 | 3.924 | 0.008 | 0.000 | 0.850 | 1.325 | 1.326 | 0.036 | n/a | 0.532 | 3.948 | n/a | n/a | 0.058 | 4.782 | 0.398 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.450 | 0.539 | 0.000 | 0.924 | 4.802 | 0.014 | 0.000 | 0.163 | 1.453 | 6.769 | 0.052 | n/a | 0.397 | 12.042 | n/a | n/a | 0.057 | 5.683 | 0.216 | 0.057 |
| p99 | 82.397 | 4.428 | 0.173 | 6.409 | 10.192 | 1.422 | 3.095 | 6.529 | 6.227 | 38.698 | 0.323 | n/a | 3.196 | 58.867 | n/a | n/a | 0.123 | 14.213 | 0.525 | 0.123 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b0806750000000000000137 | 82.397 | 9.332 | 0.011 | 0.000 | 0.478 | 2.634 | 10.775 | 0.101 | n/a | 0.110 | 58.867 | n/a | n/a | 0.089 | 9.821 | 0.119 | 0.089 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000134 | 72.265 | 4.794 | 0.245 | 0.000 | 0.137 | 4.650 | 38.698 | 0.056 | n/a | 0.397 | 23.226 | n/a | n/a | 0.061 | 5.176 | 0.072 | 0.061 | gw-w/thread-42/gateway.admitted-work | none observed |
| 54f5c68b5b080675000000000000012a | 49.608 | 5.001 | 0.213 | 0.403 | 0.066 | 2.602 | 11.584 | 0.100 | n/a | 0.125 | 29.466 | n/a | n/a | 0.049 | 5.683 | 0.115 | 0.049 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000151 | 44.511 | 5.383 | 0.013 | 2.112 | 1.087 | 1.703 | 2.187 | 0.075 | n/a | 1.016 | 30.878 | n/a | n/a | 0.055 | 8.595 | 0.193 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000128 | 41.784 | 4.129 | 0.234 | 0.270 | 0.066 | 4.397 | 20.314 | 0.054 | n/a | 0.113 | 12.166 | n/a | n/a | 0.041 | 4.700 | 0.112 | 0.041 | gw-w/thread-44/gateway.admitted-work | none observed |
| 54f5c68b5b0806750000000000000131 | 41.776 | 5.183 | 0.215 | 0.445 | 0.091 | 1.548 | 14.923 | 0.050 | n/a | 0.350 | 18.926 | n/a | n/a | 0.045 | 5.934 | 0.142 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000014b | 40.466 | 10.192 | 0.009 | 3.095 | 0.917 | 0.832 | 2.355 | 0.045 | n/a | 0.723 | 22.230 | n/a | n/a | 0.068 | 14.213 | 0.351 | 0.068 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000140 | 37.688 | 7.377 | 0.012 | 0.000 | 0.758 | 1.036 | 5.828 | 0.098 | n/a | 0.156 | 22.355 | n/a | n/a | 0.066 | 8.148 | 0.216 | 0.066 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000013a | 37.208 | 4.261 | 0.215 | 0.378 | 0.113 | 1.895 | 11.576 | 0.101 | n/a | 0.234 | 18.384 | n/a | n/a | 0.053 | 4.966 | 0.133 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000014c | 36.167 | 5.310 | 0.381 | 0.288 | 0.073 | 1.823 | 16.460 | 0.049 | n/a | 0.439 | 11.296 | n/a | n/a | 0.049 | 6.052 | 0.167 | 0.049 | gw-w/thread-42/gateway.admitted-work | driver.expected-state.bind-receipt 4.587ms; driver.publication 1.425ms |
| 54f5c68b5b080675000000000000012f | 34.588 | 5.036 | 0.006 | 0.000 | 0.141 | 1.453 | 8.352 | 0.045 | n/a | 0.106 | 19.392 | n/a | n/a | 0.057 | 5.183 | 0.150 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000013c | 34.259 | 6.753 | 0.313 | 0.312 | 0.097 | 2.678 | 8.249 | 0.048 | n/a | 0.114 | 15.643 | n/a | n/a | 0.052 | 7.475 | 0.218 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000169 | 33.709 | 4.455 | 0.246 | 0.486 | 0.095 | 1.843 | 10.920 | 0.107 | n/a | 0.474 | 15.017 | n/a | n/a | 0.066 | 5.282 | 0.157 | 0.066 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000015f | 32.886 | 4.156 | 0.304 | 0.335 | 0.110 | 3.248 | 12.959 | 0.117 | n/a | 0.319 | 11.261 | n/a | n/a | 0.077 | 4.905 | 0.149 | 0.077 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000143 | 32.824 | 4.031 | 0.477 | 0.352 | 0.070 | 1.195 | 7.871 | 0.044 | n/a | 0.437 | 18.302 | n/a | n/a | 0.047 | 4.929 | 0.150 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000147 | 31.341 | 5.609 | 0.248 | 0.452 | 0.155 | 1.969 | 9.890 | 0.067 | n/a | 0.105 | 12.754 | n/a | n/a | 0.092 | 6.464 | 0.206 | 0.092 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000166 | 31.302 | 4.686 | 0.730 | 0.395 | 0.045 | 1.435 | 12.436 | 0.047 | n/a | 0.462 | 11.014 | n/a | n/a | 0.052 | 5.857 | 0.187 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000163 | 30.860 | 4.907 | 0.402 | 0.000 | 0.086 | 1.885 | 10.263 | 0.072 | n/a | 0.103 | 13.019 | n/a | n/a | 0.123 | 5.395 | 0.175 | 0.123 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000153 | 30.711 | 3.873 | 0.225 | 0.000 | 0.130 | 1.387 | 7.940 | 0.052 | n/a | 3.196 | 13.845 | n/a | n/a | 0.063 | 4.228 | 0.138 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000179 | 28.800 | 5.864 | 0.281 | 0.000 | 0.078 | 1.777 | 9.567 | 0.048 | n/a | 0.187 | 10.954 | n/a | n/a | 0.044 | 6.223 | 0.216 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.133 | 0.764 | 0.000 | 1.646 | 3.512 | 0.006 | 0.000 | 0.226 | 0.927 | 1.252 | 0.041 | n/a | 0.304 | 6.401 | n/a | n/a | 0.057 | 4.375 | 0.289 | 0.057 |
| p99 | 34.588 | 1.702 | 0.046 | 2.193 | 6.780 | 0.012 | 0.000 | 6.529 | 6.227 | 8.913 | 0.323 | n/a | 0.826 | 19.392 | n/a | n/a | 0.063 | 9.563 | 0.525 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b080675000000000000012f | 34.588 | 5.036 | 0.006 | 0.000 | 0.141 | 1.453 | 8.352 | 0.045 | n/a | 0.106 | 19.392 | n/a | n/a | 0.057 | 5.183 | 0.150 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000132 | 26.898 | 6.780 | 0.006 | 0.000 | 0.981 | 6.227 | 8.913 | 0.091 | n/a | 0.826 | 3.017 | n/a | n/a | 0.059 | 7.766 | 0.289 | 0.059 | node-14/thread-0/socket.wait-first-byte | none observed |
| 54f5c68b5b0806750000000000000144 | 22.203 | 3.795 | 0.007 | 0.000 | 0.217 | 0.927 | 4.884 | 0.323 | n/a | 0.453 | 11.537 | n/a | n/a | 0.060 | 4.019 | 0.181 | 0.060 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000175 | 18.206 | 3.031 | 0.004 | 0.000 | 6.529 | 0.936 | 1.137 | 0.042 | n/a | 0.132 | 6.370 | n/a | n/a | 0.026 | 9.563 | 0.525 | 0.026 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 4.533ms; driver.publication 0.804ms |
| 54f5c68b5b0806750000000000000159 | 15.133 | 3.292 | 0.006 | 0.000 | 1.077 | 0.740 | 1.099 | 0.038 | n/a | 0.119 | 8.707 | n/a | n/a | 0.053 | 4.375 | 0.289 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000014f | 14.070 | 4.903 | 0.012 | 0.000 | 1.100 | 0.836 | 1.371 | 0.036 | n/a | 0.434 | 5.321 | n/a | n/a | 0.057 | 6.015 | 0.428 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000016b | 13.889 | 3.512 | 0.006 | 0.000 | 0.224 | 1.040 | 1.252 | 0.041 | n/a | 0.608 | 7.158 | n/a | n/a | 0.048 | 3.741 | 0.269 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000015d | 12.061 | 3.309 | 0.005 | 0.000 | 0.226 | 0.738 | 0.978 | 0.036 | n/a | 0.304 | 6.401 | n/a | n/a | 0.063 | 3.540 | 0.294 | 0.063 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 83.187 | n/a | n/a | n/a | 44.218 | 1.603 | 3.677 | 0.000 | 0.656 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.526 | 54.530 | 0.747 | 16.526 |
| p99 | 186.897 | n/a | n/a | n/a | 132.102 | 75.969 | 14.756 | 0.000 | 2.907 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 139.353 | 146.198 | 1.000 | 139.353 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b0806750000000000001659 | 186.897 | 68.337 | 3.873 | 14.756 | 0.000 | 1.661 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 98.270 | 86.966 | 0.465 | 98.270 | node-14/thread-3/socket.wait-first-byte | driver.publication 6.532ms; driver.publication 2.652ms; driver.publication 1.520ms; driver.publication 1.310ms; driver.publication 1.150ms |
| 54f5c68b5b080675000000000000170b | 179.369 | 25.274 | 14.469 | 0.000 | 0.000 | 0.274 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 139.353 | 39.742 | 0.222 | 139.353 | node-14/thread-3/socket.wait-first-byte | driver.publication 4.544ms; driver.publication 4.413ms; driver.publication 1.867ms; driver.publication 1.864ms; driver.publication 1.405ms |
| 54f5c68b5b0806750000000000001706 | 174.482 | 132.102 | 0.863 | 13.234 | 0.000 | 0.813 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.471 | 146.198 | 0.838 | 27.471 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 4.544ms; driver.publication 4.413ms; driver.publication 1.867ms; driver.publication 1.864ms; driver.publication 1.405ms |
| 54f5c68b5b0806750000000000001662 | 157.951 | 27.835 | 20.885 | 0.000 | 0.000 | 0.240 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 108.992 | 48.720 | 0.308 | 108.992 | node-14/thread-3/socket.wait-first-byte | driver.publication 6.532ms; driver.publication 2.652ms; driver.publication 1.520ms; driver.publication 1.310ms; driver.publication 1.116ms |
| 54f5c68b5b0806750000000000001a50 | 134.568 | 46.655 | 0.302 | 2.109 | 0.000 | 0.244 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 85.258 | 49.066 | 0.365 | 85.258 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.339ms; driver.publication 1.204ms; driver.publication 1.098ms |
| 54f5c68b5b0806750000000000001982 | 115.841 | 34.265 | 75.969 | 2.888 | 0.000 | 0.395 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.324 | 113.123 | 0.977 | 2.324 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 4.704ms; driver.publication 4.132ms; driver.publication 2.828ms; driver.publication 2.291ms; driver.publication 1.649ms |
| 54f5c68b5b080675000000000000197f | 115.620 | 79.096 | 1.482 | 10.224 | 0.000 | 0.352 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.465 | 90.802 | 0.785 | 24.465 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 4.704ms; driver.publication 2.828ms; driver.publication 2.291ms; driver.publication 1.649ms; driver.publication 1.532ms |
| 54f5c68b5b0806750000000000000736 | 111.715 | 47.051 | 57.192 | 4.203 | 0.000 | 0.610 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.659 | 108.446 | 0.971 | 2.659 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.402ms; driver.publication 1.308ms; driver.publication 1.205ms |
| 54f5c68b5b080675000000000000165a | 104.935 | 36.933 | 17.593 | 3.463 | 0.000 | 0.877 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 46.069 | 57.989 | 0.553 | 46.069 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.150ms; driver.publication 1.116ms |
| 54f5c68b5b080675000000000000103d | 102.941 | 66.916 | 7.470 | 8.426 | 0.000 | 1.020 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.109 | 82.812 | 0.804 | 19.109 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.422ms; driver.publication 1.404ms; driver.publication 1.260ms; driver.expected-state.bind-receipt 1.257ms; driver.expected-state.bind-receipt 1.238ms |
| 54f5c68b5b0806750000000000001a4e | 99.713 | 43.491 | 1.527 | 3.025 | 0.000 | 0.432 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.239 | 48.042 | 0.482 | 51.239 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.204ms |
| 54f5c68b5b0806750000000000001136 | 97.994 | 78.087 | 4.900 | 8.314 | 0.000 | 0.733 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.960 | 91.301 | 0.932 | 5.960 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 2.434ms; driver.publication 2.271ms; driver.publication 1.447ms |
| 54f5c68b5b0806750000000000001d77 | 97.406 | 63.754 | 0.642 | 7.218 | 0.000 | 1.250 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.542 | 71.614 | 0.735 | 24.542 | node-14/thread-3/client.reach-decode-and-cache | none observed |
| 54f5c68b5b0806750000000000000732 | 95.032 | 61.139 | 0.921 | 8.909 | 0.000 | 0.904 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.158 | 70.969 | 0.747 | 23.158 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.308ms; driver.publication 1.205ms; driver.publication 1.062ms |
| 54f5c68b5b0806750000000000001661 | 83.651 | 29.853 | 20.163 | 1.649 | 0.000 | 0.656 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.331 | 51.665 | 0.618 | 31.331 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.116ms |
| 54f5c68b5b08067500000000000002f0 | 83.187 | 20.397 | 36.096 | 3.621 | 0.000 | 0.907 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.166 | 60.114 | 0.723 | 22.166 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.309ms; driver.publication 1.358ms; driver.publication 1.198ms |
| 54f5c68b5b0806750000000000001658 | 77.404 | 46.715 | 1.603 | 4.594 | 0.000 | 2.907 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.585 | 52.912 | 0.684 | 21.585 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.150ms |
| 54f5c68b5b0806750000000000001c80 | 76.648 | 64.023 | 2.236 | 5.301 | 0.000 | 0.668 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.420 | 71.560 | 0.934 | 4.420 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.176ms |
| 54f5c68b5b0806750000000000000d32 | 76.264 | 63.150 | 0.601 | 5.872 | 0.000 | 1.215 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.426 | 69.623 | 0.913 | 5.426 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.629ms; driver.publication 1.189ms; driver.publication 1.005ms |
| 54f5c68b5b0806750000000000000b45 | 70.427 | 52.607 | 0.563 | 7.701 | 0.000 | 0.962 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.594 | 60.871 | 0.864 | 8.594 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.398ms; driver.publication 1.021ms |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.818 | 0.580 | 0.000 | 0.759 | 4.072 | 0.188 | 0.000 | 0.177 | 1.346 | 6.531 | 0.046 | n/a | 0.165 | 11.803 | n/a | n/a | 0.056 | 4.752 | 0.213 | 0.056 |
| p99 | 75.287 | 3.119 | 0.210 | 3.982 | 8.075 | 0.854 | 0.523 | 1.104 | 16.468 | 32.892 | 0.145 | n/a | 1.412 | 30.796 | n/a | n/a | 0.190 | 9.066 | 0.362 | 0.190 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b08067500000000000001c3 | 75.287 | 6.515 | 0.854 | 0.000 | 0.271 | 16.468 | 27.751 | 0.144 | n/a | 0.315 | 22.778 | n/a | n/a | 0.190 | 7.640 | 0.101 | 0.190 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000189 | 51.460 | 3.912 | 0.006 | 0.000 | 0.409 | 1.009 | 30.964 | 0.083 | n/a | 0.114 | 14.912 | n/a | n/a | 0.050 | 4.327 | 0.084 | 0.050 | gw-w/thread-42/commit.prepare-and-validate | none observed |
| 54f5c68b5b08067500000000000001a7 | 48.509 | 3.476 | 0.292 | 0.339 | 0.127 | 1.342 | 32.892 | 0.050 | n/a | 0.141 | 9.772 | n/a | n/a | 0.080 | 4.233 | 0.087 | 0.080 | gw-w/thread-44/gateway.request-parse | none observed |
| 54f5c68b5b08067500000000000001a8 | 43.366 | 7.655 | 0.013 | 0.000 | 0.422 | 2.009 | 1.859 | 0.039 | n/a | 0.513 | 30.796 | n/a | n/a | 0.062 | 8.090 | 0.187 | 0.062 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001bb | 39.896 | 3.541 | 0.388 | 0.000 | 0.086 | 1.612 | 12.747 | 0.044 | n/a | 0.101 | 21.328 | n/a | n/a | 0.049 | 4.016 | 0.101 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000018e | 34.366 | 3.871 | 0.290 | 0.000 | 0.155 | 1.647 | 6.531 | 0.092 | n/a | 0.523 | 21.183 | n/a | n/a | 0.074 | 4.317 | 0.126 | 0.074 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001a1 | 33.434 | 3.887 | 0.265 | 0.244 | 0.068 | 1.239 | 6.787 | 0.044 | n/a | 0.086 | 20.757 | n/a | n/a | 0.056 | 4.465 | 0.134 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000187 | 32.131 | 4.211 | 0.006 | 0.000 | 1.104 | 1.151 | 7.688 | 0.038 | n/a | 0.481 | 17.399 | n/a | n/a | 0.054 | 5.320 | 0.166 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001b4 | 30.481 | 8.075 | 0.006 | 0.000 | 0.985 | 1.153 | 2.778 | 0.135 | n/a | 0.193 | 17.085 | n/a | n/a | 0.070 | 9.066 | 0.297 | 0.070 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001b7 | 30.040 | 4.498 | 0.225 | 0.000 | 0.072 | 1.747 | 10.985 | 0.105 | n/a | 0.141 | 12.211 | n/a | n/a | 0.057 | 4.794 | 0.160 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000181 | 29.947 | 4.007 | 0.335 | 0.000 | 0.098 | 1.765 | 10.257 | 0.054 | n/a | 0.072 | 13.308 | n/a | n/a | 0.051 | 4.439 | 0.148 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001aa | 29.465 | 5.796 | 0.005 | 0.000 | 1.032 | 0.840 | 8.056 | 0.041 | n/a | 1.186 | 12.458 | n/a | n/a | 0.048 | 6.833 | 0.232 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000018c | 28.585 | 3.507 | 0.188 | 0.000 | 0.088 | 1.346 | 9.217 | 0.046 | n/a | 0.384 | 13.763 | n/a | n/a | 0.045 | 3.784 | 0.132 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000185 | 27.989 | 5.250 | 0.006 | 0.000 | 0.297 | 0.762 | 5.328 | 0.043 | n/a | 0.086 | 16.130 | n/a | n/a | 0.085 | 5.554 | 0.198 | 0.085 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000194 | 27.850 | 5.970 | 0.290 | 0.000 | 0.144 | 1.740 | 6.735 | 0.046 | n/a | 0.405 | 12.463 | n/a | n/a | 0.056 | 6.404 | 0.230 | 0.056 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001c4 | 27.601 | 5.342 | 0.011 | 0.000 | 0.303 | 4.679 | 1.117 | 0.036 | n/a | 0.094 | 15.956 | n/a | n/a | 0.062 | 5.657 | 0.205 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000199 | 27.387 | 4.247 | 0.210 | 0.000 | 0.084 | 2.490 | 8.042 | 0.049 | n/a | 0.086 | 12.132 | n/a | n/a | 0.047 | 4.541 | 0.166 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000195 | 27.308 | 7.559 | 0.010 | 0.000 | 0.128 | 0.926 | 1.868 | 0.048 | n/a | 0.115 | 16.606 | n/a | n/a | 0.048 | 7.697 | 0.282 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001a3 | 26.873 | 3.708 | 0.275 | 0.235 | 0.080 | 1.907 | 9.752 | 0.145 | n/a | 0.223 | 10.503 | n/a | n/a | 0.045 | 4.299 | 0.160 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000184 | 26.818 | 4.857 | 0.216 | 0.523 | 0.120 | 1.668 | 9.405 | 0.043 | n/a | 0.067 | 9.837 | n/a | n/a | 0.080 | 5.717 | 0.213 | 0.080 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.616 | 0.767 | 0.000 | 1.917 | 3.883 | 0.006 | 0.000 | 0.661 | 0.881 | 1.117 | 0.037 | n/a | 0.119 | 9.101 | n/a | n/a | 0.052 | 4.296 | 0.239 | 0.052 |
| p99 | 51.460 | 1.809 | 0.013 | 2.879 | 5.342 | 0.011 | 0.000 | 0.984 | 4.679 | 30.964 | 0.112 | n/a | 1.139 | 15.956 | n/a | n/a | 0.073 | 5.713 | 0.362 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b0806750000000000000189 | 51.460 | 3.912 | 0.006 | 0.000 | 0.409 | 1.009 | 30.964 | 0.083 | n/a | 0.114 | 14.912 | n/a | n/a | 0.050 | 4.327 | 0.084 | 0.050 | gw-w/thread-42/commit.prepare-and-validate | none observed |
| 54f5c68b5b08067500000000000001c4 | 27.601 | 5.342 | 0.011 | 0.000 | 0.303 | 4.679 | 1.117 | 0.036 | n/a | 0.094 | 15.956 | n/a | n/a | 0.062 | 5.657 | 0.205 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000017f | 25.080 | 4.722 | 0.007 | 0.000 | 0.984 | 0.918 | 1.984 | 0.112 | n/a | 0.919 | 15.385 | n/a | n/a | 0.049 | 5.713 | 0.228 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001ae | 19.765 | 4.495 | 0.006 | 0.000 | 0.712 | 0.841 | 1.166 | 0.037 | n/a | 0.633 | 11.803 | n/a | n/a | 0.073 | 5.213 | 0.264 | 0.073 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000017b | 19.683 | 4.010 | 0.005 | 0.000 | 0.680 | 0.800 | 1.124 | 0.045 | n/a | 0.145 | 12.833 | n/a | n/a | 0.042 | 4.695 | 0.239 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000192 | 14.616 | 2.883 | 0.006 | 0.000 | 0.259 | 0.719 | 1.443 | 0.034 | n/a | 0.119 | 9.101 | n/a | n/a | 0.052 | 3.147 | 0.215 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000190 | 14.573 | 3.883 | 0.005 | 0.000 | 0.408 | 0.750 | 1.098 | 0.034 | n/a | 0.080 | 8.250 | n/a | n/a | 0.064 | 4.296 | 0.295 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001bc | 12.296 | 2.897 | 0.006 | 0.000 | 0.661 | 0.881 | 1.016 | 0.036 | n/a | 1.139 | 5.614 | n/a | n/a | 0.046 | 3.563 | 0.290 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001a4 | 11.752 | 3.401 | 0.005 | 0.000 | 0.755 | 1.560 | 1.083 | 0.039 | n/a | 0.077 | 4.775 | n/a | n/a | 0.056 | 4.161 | 0.354 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001c6 | 11.336 | 3.385 | 0.005 | 0.000 | 0.716 | 0.898 | 1.035 | 0.037 | n/a | 0.399 | 4.808 | n/a | n/a | 0.053 | 4.106 | 0.362 | 0.053 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.705 | 0.492 | 0.000 | 1.382 | 4.243 | 0.014 | 0.000 | 0.143 | 1.514 | 3.968 | 0.058 | n/a | 0.370 | 11.356 | n/a | n/a | 0.056 | 4.820 | 0.221 | 0.056 |
| p99 | 107.021 | 3.486 | 1.564 | 4.052 | 14.376 | 1.128 | 0.000 | 3.351 | 5.642 | 33.984 | 0.168 | n/a | 17.260 | 79.190 | n/a | n/a | 0.126 | 14.993 | 0.388 | 0.126 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b08067500000000000001d5 | 107.021 | 3.223 | 0.187 | 0.000 | 0.060 | 1.167 | 5.828 | 0.065 | n/a | 17.260 | 79.190 | n/a | n/a | 0.042 | 3.469 | 0.032 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001ed | 71.434 | 14.376 | 0.012 | 0.000 | 0.605 | 5.642 | 33.984 | 0.168 | n/a | 0.466 | 16.115 | n/a | n/a | 0.065 | 14.993 | 0.210 | 0.065 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000208 | 57.003 | 6.205 | 0.231 | 0.000 | 0.058 | 1.245 | 27.379 | 0.042 | n/a | 0.100 | 21.690 | n/a | n/a | 0.054 | 6.494 | 0.114 | 0.054 | gw-w/thread-44/gateway.admitted-work | none observed |
| 54f5c68b5b08067500000000000001d8 | 42.888 | 3.562 | 0.346 | 0.000 | 0.143 | 5.001 | 11.237 | 0.053 | n/a | 2.015 | 20.405 | n/a | n/a | 0.126 | 4.051 | 0.094 | 0.126 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001dc | 40.170 | 5.426 | 0.895 | 0.000 | 0.073 | 1.656 | 11.551 | 0.078 | n/a | 0.083 | 20.351 | n/a | n/a | 0.058 | 6.394 | 0.159 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000218 | 35.022 | 4.432 | 0.285 | 0.000 | 0.056 | 4.672 | 13.803 | 0.088 | n/a | 0.631 | 10.991 | n/a | n/a | 0.064 | 4.773 | 0.136 | 0.064 | gw-w/thread-49/gateway.admitted-work | none observed |
| 54f5c68b5b08067500000000000001f8 | 33.836 | 4.566 | 0.189 | 0.000 | 0.070 | 1.698 | 9.312 | 0.053 | n/a | 0.118 | 17.787 | n/a | n/a | 0.043 | 4.825 | 0.143 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001d1 | 32.572 | 9.235 | 0.006 | 0.000 | 3.351 | 2.421 | 1.933 | 0.037 | n/a | 0.851 | 14.700 | n/a | n/a | 0.038 | 12.592 | 0.387 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.273ms |
| 54f5c68b5b0806750000000000000200 | 31.068 | 3.824 | 0.282 | 0.000 | 0.068 | 1.802 | 12.529 | 0.111 | n/a | 0.222 | 12.185 | n/a | n/a | 0.043 | 4.175 | 0.134 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000214 | 30.545 | 4.023 | 0.288 | 0.000 | 0.069 | 1.514 | 7.166 | 0.095 | n/a | 0.487 | 16.828 | n/a | n/a | 0.075 | 4.380 | 0.143 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001ec | 27.994 | 4.292 | 0.249 | 0.000 | 0.066 | 1.514 | 7.530 | 0.058 | n/a | 0.143 | 14.055 | n/a | n/a | 0.088 | 4.607 | 0.165 | 0.088 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000204 | 26.572 | 4.476 | 0.234 | 0.000 | 0.111 | 1.616 | 6.878 | 0.045 | n/a | 0.430 | 12.726 | n/a | n/a | 0.056 | 4.820 | 0.181 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001dd | 26.442 | 6.853 | 0.009 | 0.000 | 0.426 | 1.502 | 1.498 | 0.055 | n/a | 0.224 | 15.813 | n/a | n/a | 0.063 | 7.288 | 0.276 | 0.063 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000201 | 25.732 | 4.029 | 0.005 | 0.000 | 0.795 | 1.606 | 1.381 | 0.048 | n/a | 0.195 | 17.621 | n/a | n/a | 0.051 | 4.829 | 0.188 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000021c | 25.660 | 4.196 | 0.149 | 0.000 | 0.061 | 2.275 | 7.888 | 0.166 | n/a | 0.679 | 10.182 | n/a | n/a | 0.065 | 4.405 | 0.172 | 0.065 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001d0 | 25.616 | 3.890 | 0.007 | 0.000 | 1.094 | 0.948 | 2.037 | 0.058 | n/a | 0.644 | 16.873 | n/a | n/a | 0.064 | 4.991 | 0.195 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001e0 | 25.594 | 4.243 | 0.270 | 0.000 | 0.150 | 1.701 | 11.192 | 0.058 | n/a | 0.512 | 7.396 | n/a | n/a | 0.072 | 4.662 | 0.182 | 0.072 | gw-w/thread-47/gateway.admitted-work | none observed |
| 54f5c68b5b080675000000000000020e | 25.226 | 3.517 | 0.217 | 0.000 | 0.077 | 1.605 | 8.912 | 0.084 | n/a | 0.453 | 10.308 | n/a | n/a | 0.053 | 3.810 | 0.151 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001e1 | 24.664 | 4.447 | 0.014 | 0.000 | 0.393 | 0.990 | 3.770 | 0.069 | n/a | 0.483 | 14.423 | n/a | n/a | 0.074 | 4.855 | 0.197 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001f6 | 24.553 | 3.386 | 0.203 | 0.000 | 0.075 | 1.467 | 10.201 | 0.063 | n/a | 0.179 | 8.928 | n/a | n/a | 0.050 | 3.664 | 0.149 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.804 | 1.216 | 0.000 | 1.726 | 3.844 | 0.006 | 0.000 | 0.725 | 0.967 | 1.962 | 0.048 | n/a | 0.349 | 11.356 | n/a | n/a | 0.054 | 4.704 | 0.243 | 0.054 |
| p99 | 25.732 | 1.732 | 0.079 | 3.788 | 6.400 | 0.014 | 0.000 | 1.094 | 2.076 | 4.015 | 0.163 | n/a | 1.836 | 17.621 | n/a | n/a | 0.120 | 7.086 | 0.388 | 0.120 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b0806750000000000000201 | 25.732 | 4.029 | 0.005 | 0.000 | 0.795 | 1.606 | 1.381 | 0.048 | n/a | 0.195 | 17.621 | n/a | n/a | 0.051 | 4.829 | 0.188 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001d0 | 25.616 | 3.890 | 0.007 | 0.000 | 1.094 | 0.948 | 2.037 | 0.058 | n/a | 0.644 | 16.873 | n/a | n/a | 0.064 | 4.991 | 0.195 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001e1 | 24.664 | 4.447 | 0.014 | 0.000 | 0.393 | 0.990 | 3.770 | 0.069 | n/a | 0.483 | 14.423 | n/a | n/a | 0.074 | 4.855 | 0.197 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001da | 23.705 | 5.281 | 0.010 | 0.000 | 0.197 | 0.607 | 2.437 | 0.035 | n/a | 1.836 | 13.191 | n/a | n/a | 0.111 | 5.488 | 0.232 | 0.111 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001ca | 23.510 | 6.400 | 0.010 | 0.000 | 0.676 | 1.010 | 1.509 | 0.035 | n/a | 0.366 | 13.385 | n/a | n/a | 0.120 | 7.086 | 0.301 | 0.120 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001e3 | 22.910 | 6.180 | 0.006 | 0.000 | 0.551 | 1.051 | 1.256 | 0.163 | n/a | 0.703 | 12.939 | n/a | n/a | 0.060 | 6.738 | 0.294 | 0.060 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001e7 | 21.257 | 3.737 | 0.005 | 0.000 | 0.962 | 0.699 | 1.487 | 0.039 | n/a | 0.106 | 14.178 | n/a | n/a | 0.043 | 4.704 | 0.221 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000205 | 20.804 | 3.844 | 0.006 | 0.000 | 0.842 | 0.975 | 3.347 | 0.070 | n/a | 0.319 | 11.356 | n/a | n/a | 0.047 | 4.691 | 0.225 | 0.047 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001cc | 17.481 | 5.687 | 0.006 | 0.000 | 1.089 | 0.705 | 1.173 | 0.039 | n/a | 0.349 | 8.379 | n/a | n/a | 0.054 | 6.782 | 0.388 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001f3 | 17.331 | 3.328 | 0.005 | 0.000 | 0.116 | 0.967 | 4.015 | 0.116 | n/a | 0.607 | 8.112 | n/a | n/a | 0.064 | 3.450 | 0.199 | 0.064 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001e5 | 15.668 | 3.713 | 0.010 | 0.000 | 0.725 | 2.076 | 2.738 | 0.156 | n/a | 0.212 | 5.983 | n/a | n/a | 0.055 | 4.448 | 0.284 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000001fd | 15.636 | 3.039 | 0.005 | 0.000 | 0.764 | 0.952 | 2.052 | 0.042 | n/a | 0.108 | 8.635 | n/a | n/a | 0.040 | 3.807 | 0.243 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000020f | 13.519 | 3.449 | 0.005 | 0.000 | 0.392 | 0.909 | 0.977 | 0.045 | n/a | 0.370 | 7.318 | n/a | n/a | 0.053 | 3.847 | 0.285 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000209 | 12.552 | 3.368 | 0.006 | 0.000 | 0.943 | 1.540 | 1.122 | 0.034 | n/a | 0.110 | 5.380 | n/a | n/a | 0.050 | 4.317 | 0.344 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000219 | 11.445 | 3.057 | 0.005 | 0.000 | 0.095 | 0.847 | 1.962 | 0.073 | n/a | 0.184 | 5.177 | n/a | n/a | 0.044 | 3.157 | 0.276 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.372 | 0.946 | 0.000 | 1.661 | 4.665 | 0.010 | 0.000 | 0.304 | 1.167 | 3.676 | 0.039 | n/a | 0.412 | 8.645 | n/a | n/a | 0.057 | 5.357 | 0.267 | 0.057 |
| p99 | 92.561 | 6.101 | 0.000 | 7.061 | 13.928 | 8.592 | 0.000 | 1.199 | 5.380 | 36.780 | 0.312 | n/a | 6.595 | 80.948 | n/a | n/a | 0.112 | 14.945 | 0.491 | 0.112 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b0806750000000000000246 | 92.561 | 5.297 | 0.005 | 0.000 | 0.672 | 4.116 | 1.369 | 0.025 | n/a | 0.046 | 80.948 | n/a | n/a | 0.082 | 5.974 | 0.065 | 0.082 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 4.012ms |
| 54f5c68b5b0806750000000000000233 | 48.690 | 3.421 | 0.006 | 0.000 | 0.386 | 0.690 | 36.780 | 0.044 | n/a | 0.088 | 7.226 | n/a | n/a | 0.049 | 3.813 | 0.078 | 0.049 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| 54f5c68b5b080675000000000000026d | 48.272 | 5.562 | 8.592 | 0.000 | 0.056 | 1.426 | 9.120 | 0.048 | n/a | 0.079 | 23.348 | n/a | n/a | 0.040 | 14.210 | 0.294 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.537ms; driver.publication 1.604ms |
| 54f5c68b5b080675000000000000027f | 46.259 | 3.606 | 0.298 | 0.000 | 0.052 | 1.300 | 22.097 | 0.038 | n/a | 0.372 | 18.438 | n/a | n/a | 0.057 | 3.957 | 0.086 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 3.643ms |
| 54f5c68b5b080675000000000000024c | 44.846 | 5.855 | 0.512 | 0.000 | 0.058 | 1.735 | 18.174 | 0.058 | n/a | 0.100 | 18.310 | n/a | n/a | 0.043 | 6.426 | 0.143 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000025a | 42.558 | 5.246 | 0.281 | 0.000 | 0.102 | 5.118 | 8.690 | 0.039 | n/a | 0.391 | 22.607 | n/a | n/a | 0.083 | 5.629 | 0.132 | 0.083 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000257 | 37.759 | 13.928 | 0.015 | 0.000 | 1.002 | 0.895 | 1.668 | 0.032 | n/a | 3.340 | 16.830 | n/a | n/a | 0.050 | 14.945 | 0.396 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000245 | 32.939 | 7.430 | 0.008 | 0.000 | 0.616 | 1.159 | 1.851 | 0.045 | n/a | 3.025 | 18.745 | n/a | n/a | 0.060 | 8.054 | 0.245 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000230 | 31.297 | 5.954 | 0.282 | 0.000 | 0.076 | 2.053 | 8.430 | 0.038 | n/a | 0.129 | 14.265 | n/a | n/a | 0.070 | 6.312 | 0.202 | 0.070 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000280 | 31.115 | 6.505 | 0.005 | 0.000 | 1.125 | 5.145 | 1.649 | 0.060 | n/a | 0.114 | 16.434 | n/a | n/a | 0.079 | 7.636 | 0.245 | 0.079 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000229 | 29.620 | 3.967 | 0.344 | 0.000 | 0.122 | 1.520 | 7.713 | 0.037 | n/a | 0.515 | 15.324 | n/a | n/a | 0.078 | 4.432 | 0.150 | 0.078 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000025b | 29.187 | 3.467 | 0.006 | 0.000 | 0.641 | 0.734 | 17.977 | 0.033 | n/a | 0.066 | 6.225 | n/a | n/a | 0.038 | 4.114 | 0.141 | 0.038 | gw-w/thread-45/gateway.request-parse | none observed |
| 54f5c68b5b080675000000000000026e | 29.043 | 12.462 | 0.013 | 0.000 | 1.048 | 0.773 | 1.386 | 0.027 | n/a | 0.057 | 13.166 | n/a | n/a | 0.112 | 13.523 | 0.466 | 0.112 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000023c | 28.291 | 7.259 | 0.251 | 0.000 | 0.048 | 1.754 | 7.020 | 0.072 | n/a | 0.327 | 11.523 | n/a | n/a | 0.036 | 7.558 | 0.267 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000249 | 27.764 | 6.846 | 0.007 | 0.000 | 0.572 | 2.220 | 4.009 | 0.293 | n/a | 1.348 | 12.405 | n/a | n/a | 0.065 | 7.426 | 0.267 | 0.065 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000022d | 27.389 | 4.523 | 0.006 | 0.000 | 0.315 | 0.983 | 6.195 | 0.030 | n/a | 0.402 | 14.893 | n/a | n/a | 0.042 | 4.844 | 0.177 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000240 | 26.684 | 3.978 | 0.234 | 0.000 | 0.052 | 1.889 | 10.621 | 0.044 | n/a | 0.113 | 9.712 | n/a | n/a | 0.042 | 4.264 | 0.160 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000027b | 26.255 | 3.804 | 0.214 | 0.000 | 0.105 | 2.632 | 11.574 | 0.068 | n/a | 0.618 | 7.184 | n/a | n/a | 0.057 | 4.122 | 0.157 | 0.057 | gw-w/thread-49/gateway.admitted-work | none observed |
| 54f5c68b5b080675000000000000021f | 26.182 | 5.163 | 0.216 | 0.000 | 0.054 | 1.708 | 10.181 | 0.054 | n/a | 0.095 | 8.666 | n/a | n/a | 0.046 | 5.433 | 0.207 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000022b | 25.974 | 4.154 | 0.005 | 0.000 | 0.336 | 0.898 | 1.542 | 0.052 | n/a | 0.619 | 18.301 | n/a | n/a | 0.067 | 4.495 | 0.173 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.631 | 1.013 | 0.000 | 1.760 | 4.497 | 0.007 | 0.000 | 0.552 | 1.031 | 1.602 | 0.042 | n/a | 0.414 | 6.225 | n/a | n/a | 0.054 | 5.080 | 0.296 | 0.054 |
| p99 | 92.561 | 1.908 | 0.000 | 4.456 | 6.808 | 0.014 | 0.000 | 1.125 | 5.145 | 36.780 | 0.312 | n/a | 6.595 | 80.948 | n/a | n/a | 0.097 | 7.893 | 0.421 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b0806750000000000000246 | 92.561 | 5.297 | 0.005 | 0.000 | 0.672 | 4.116 | 1.369 | 0.025 | n/a | 0.046 | 80.948 | n/a | n/a | 0.082 | 5.974 | 0.065 | 0.082 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 4.012ms |
| 54f5c68b5b0806750000000000000233 | 48.690 | 3.421 | 0.006 | 0.000 | 0.386 | 0.690 | 36.780 | 0.044 | n/a | 0.088 | 7.226 | n/a | n/a | 0.049 | 3.813 | 0.078 | 0.049 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| 54f5c68b5b0806750000000000000280 | 31.115 | 6.505 | 0.005 | 0.000 | 1.125 | 5.145 | 1.649 | 0.060 | n/a | 0.114 | 16.434 | n/a | n/a | 0.079 | 7.636 | 0.245 | 0.079 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000025b | 29.187 | 3.467 | 0.006 | 0.000 | 0.641 | 0.734 | 17.977 | 0.033 | n/a | 0.066 | 6.225 | n/a | n/a | 0.038 | 4.114 | 0.141 | 0.038 | gw-w/thread-45/gateway.request-parse | none observed |
| 54f5c68b5b080675000000000000022b | 25.974 | 4.154 | 0.005 | 0.000 | 0.336 | 0.898 | 1.542 | 0.052 | n/a | 0.619 | 18.301 | n/a | n/a | 0.067 | 4.495 | 0.173 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000278 | 22.372 | 3.747 | 0.006 | 0.000 | 0.442 | 0.900 | 5.271 | 0.068 | n/a | 3.505 | 8.388 | n/a | n/a | 0.043 | 4.195 | 0.188 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000026a | 21.647 | 6.808 | 0.014 | 0.000 | 1.070 | 1.083 | 2.116 | 0.039 | n/a | 0.168 | 10.252 | n/a | n/a | 0.097 | 7.893 | 0.365 | 0.097 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000227 | 20.531 | 5.411 | 0.009 | 0.000 | 0.594 | 0.735 | 1.270 | 0.032 | n/a | 0.414 | 11.992 | n/a | n/a | 0.074 | 6.014 | 0.293 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000222 | 17.631 | 4.497 | 0.010 | 0.000 | 1.081 | 1.301 | 1.602 | 0.032 | n/a | 0.413 | 8.645 | n/a | n/a | 0.049 | 5.588 | 0.317 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000025c | 17.519 | 4.857 | 0.007 | 0.000 | 0.217 | 1.031 | 1.123 | 0.036 | n/a | 6.595 | 3.603 | n/a | n/a | 0.049 | 5.080 | 0.290 | 0.049 | gw-w/thread-42/d/transact-async | none observed |
| 54f5c68b5b080675000000000000021e | 17.337 | 5.542 | 0.010 | 0.000 | 0.486 | 2.385 | 5.123 | 0.312 | n/a | 0.150 | 3.264 | n/a | n/a | 0.065 | 6.038 | 0.348 | 0.065 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000272 | 15.904 | 3.948 | 0.006 | 0.000 | 0.760 | 0.651 | 1.002 | 0.031 | n/a | 3.446 | 6.007 | n/a | n/a | 0.054 | 4.714 | 0.296 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000265 | 15.344 | 4.464 | 0.007 | 0.000 | 0.927 | 1.521 | 6.116 | 0.052 | n/a | 0.464 | 1.699 | n/a | n/a | 0.092 | 5.399 | 0.352 | 0.092 | node-14/thread-0/driver.execute | none observed |
| 54f5c68b5b080675000000000000027c | 13.936 | 5.335 | 0.010 | 0.000 | 0.223 | 1.044 | 1.170 | 0.043 | n/a | 0.488 | 5.564 | n/a | n/a | 0.058 | 5.567 | 0.399 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000023d | 11.916 | 4.601 | 0.012 | 0.000 | 0.404 | 1.978 | 0.935 | 0.029 | n/a | 0.293 | 3.620 | n/a | n/a | 0.044 | 5.016 | 0.421 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000261 | 11.626 | 3.217 | 0.006 | 0.000 | 0.552 | 0.888 | 1.806 | 0.045 | n/a | 0.439 | 4.630 | n/a | n/a | 0.042 | 3.775 | 0.325 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000250 | 9.649 | 3.054 | 0.008 | 0.000 | 0.253 | 0.944 | 1.199 | 0.042 | n/a | 0.514 | 3.585 | n/a | n/a | 0.050 | 3.315 | 0.344 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.065 | 0.443 | 0.000 | 0.932 | 4.004 | 0.030 | 0.000 | 0.144 | 1.240 | 4.165 | 0.042 | n/a | 0.278 | 8.161 | n/a | n/a | 0.048 | 4.327 | 0.213 | 0.048 |
| p99 | 54.380 | 2.977 | 0.001 | 2.776 | 11.936 | n/a | 0.000 | 1.151 | 9.354 | 28.464 | 2.926 | n/a | 17.908 | 37.408 | n/a | n/a | 0.115 | 12.445 | 0.482 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b08067500000000000002d3 | 54.380 | 3.570 | 0.198 | 0.000 | 0.064 | 1.106 | 28.464 | 0.039 | n/a | 0.087 | 20.800 | n/a | n/a | 0.052 | 3.832 | 0.070 | 0.052 | gw-w/thread-46/gateway.admitted-work | none observed |
| 54f5c68b5b08067500000000000002cd | 46.470 | 7.397 | 0.272 | 0.000 | 0.052 | 7.079 | 10.208 | 0.101 | n/a | 1.819 | 19.493 | n/a | n/a | 0.048 | 7.721 | 0.166 | 0.048 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.182ms |
| 54f5c68b5b08067500000000000002bf | 45.023 | 4.155 | 0.007 | 0.000 | 0.792 | 0.889 | 1.509 | 0.054 | n/a | 0.152 | 37.408 | n/a | n/a | 0.057 | 4.954 | 0.110 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000028b | 39.730 | 11.936 | 0.028 | 0.000 | 0.482 | 1.371 | 6.191 | 0.037 | n/a | 0.489 | 19.098 | n/a | n/a | 0.098 | 12.445 | 0.313 | 0.098 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000290 | 39.375 | 3.609 | 0.181 | 0.000 | 0.050 | 1.240 | 13.608 | 2.926 | n/a | 0.099 | 17.622 | n/a | n/a | 0.040 | 3.840 | 0.098 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000285 | 38.486 | 3.792 | 0.449 | 0.000 | 0.063 | 1.442 | 7.302 | 0.064 | n/a | 0.704 | 24.628 | n/a | n/a | 0.042 | 4.304 | 0.112 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000029f | 35.216 | 4.146 | 0.009 | 0.000 | 0.524 | 0.785 | 1.078 | 0.037 | n/a | 17.908 | 10.649 | n/a | n/a | 0.079 | 4.680 | 0.133 | 0.079 | gw-w/thread-47/d/transact-async | none observed |
| 54f5c68b5b08067500000000000002b2 | 32.545 | 4.004 | 0.246 | 0.000 | 0.052 | 1.710 | 11.561 | 0.046 | n/a | 0.095 | 14.770 | n/a | n/a | 0.062 | 4.302 | 0.132 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000298 | 31.951 | 4.976 | 0.264 | 0.000 | 0.141 | 1.630 | 7.321 | 0.041 | n/a | 0.096 | 17.405 | n/a | n/a | 0.077 | 5.382 | 0.168 | 0.077 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000002cb | 28.814 | 3.604 | 0.345 | 0.000 | 0.056 | 9.354 | 5.928 | 0.185 | n/a | 0.140 | 9.144 | n/a | n/a | 0.058 | 4.006 | 0.139 | 0.058 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000296 | 28.781 | 5.251 | 0.205 | 0.000 | 0.065 | 1.757 | 6.033 | 0.040 | n/a | 0.148 | 15.236 | n/a | n/a | 0.046 | 5.521 | 0.192 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000289 | 27.421 | 3.544 | 0.221 | 0.000 | 0.123 | 1.671 | 9.234 | 0.048 | n/a | 0.395 | 12.139 | n/a | n/a | 0.045 | 3.888 | 0.142 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000002aa | 24.611 | 3.688 | 3.366 | 0.000 | 0.119 | 1.240 | 6.586 | 0.040 | n/a | 0.375 | 9.132 | n/a | n/a | 0.063 | 7.174 | 0.292 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000002be | 23.506 | 3.736 | 0.359 | 0.000 | 0.060 | 1.672 | 9.268 | 0.072 | n/a | 0.133 | 8.161 | n/a | n/a | 0.045 | 4.155 | 0.177 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000002a7 | 22.970 | 4.735 | 0.006 | 0.000 | 0.997 | 1.212 | 2.743 | 0.075 | n/a | 1.102 | 12.055 | n/a | n/a | 0.046 | 5.738 | 0.250 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000002a6 | 22.596 | 3.229 | 0.182 | 0.000 | 0.053 | 1.392 | 9.131 | 0.085 | n/a | 0.708 | 7.774 | n/a | n/a | 0.041 | 3.465 | 0.153 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000002b0 | 22.561 | 3.459 | 0.240 | 0.000 | 0.109 | 1.284 | 6.834 | 0.042 | n/a | 0.107 | 10.419 | n/a | n/a | 0.066 | 3.809 | 0.169 | 0.066 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000002c8 | 21.997 | 3.192 | 0.184 | 0.000 | 0.062 | 1.112 | 7.647 | 0.037 | n/a | 0.098 | 9.617 | n/a | n/a | 0.048 | 3.438 | 0.156 | 0.048 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000002d5 | 21.708 | 4.282 | 0.449 | 0.000 | 0.100 | 1.416 | 5.328 | 0.043 | n/a | 0.466 | 9.565 | n/a | n/a | 0.059 | 4.831 | 0.223 | 0.059 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000002a2 | 21.518 | 3.852 | 0.194 | 0.000 | 0.051 | 1.434 | 7.617 | 0.043 | n/a | 0.402 | 7.884 | n/a | n/a | 0.040 | 4.097 | 0.190 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.754 | 0.620 | 0.000 | 1.701 | 3.766 | 0.009 | 0.000 | 0.610 | 0.928 | 1.236 | 0.037 | n/a | 0.325 | 5.692 | n/a | n/a | 0.057 | 4.278 | 0.346 | 0.057 |
| p99 | 45.023 | 2.622 | 0.000 | 2.478 | 6.368 | n/a | 0.000 | 1.151 | 5.751 | 4.939 | 0.082 | n/a | 17.908 | 37.408 | n/a | n/a | 0.115 | 6.991 | 0.482 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b08067500000000000002bf | 45.023 | 4.155 | 0.007 | 0.000 | 0.792 | 0.889 | 1.509 | 0.054 | n/a | 0.152 | 37.408 | n/a | n/a | 0.057 | 4.954 | 0.110 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000029f | 35.216 | 4.146 | 0.009 | 0.000 | 0.524 | 0.785 | 1.078 | 0.037 | n/a | 17.908 | 10.649 | n/a | n/a | 0.079 | 4.680 | 0.133 | 0.079 | gw-w/thread-47/d/transact-async | none observed |
| 54f5c68b5b0806750000000000000299 | 18.338 | 6.012 | 0.009 | 0.000 | 0.836 | 0.969 | 3.458 | 0.043 | n/a | 0.133 | 6.792 | n/a | n/a | 0.087 | 6.857 | 0.374 | 0.087 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000029b | 17.630 | 3.025 | 0.006 | 0.000 | 0.552 | 5.751 | 1.019 | 0.030 | n/a | 0.098 | 7.058 | n/a | n/a | 0.090 | 3.583 | 0.203 | 0.090 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000291 | 15.593 | 5.606 | 0.030 | 0.000 | 0.386 | 1.068 | 1.735 | 0.082 | n/a | 0.566 | 6.077 | n/a | n/a | 0.042 | 6.023 | 0.386 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000002bb | 15.416 | 4.394 | 0.009 | 0.000 | 0.970 | 0.661 | 1.194 | 0.030 | n/a | 0.331 | 7.791 | n/a | n/a | 0.035 | 5.374 | 0.349 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000002b7 | 14.494 | 6.368 | 0.013 | 0.000 | 0.610 | 1.183 | 1.236 | 0.048 | n/a | 0.462 | 4.460 | n/a | n/a | 0.115 | 6.991 | 0.482 | 0.115 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000002a3 | 13.754 | 3.315 | 0.006 | 0.000 | 0.956 | 1.057 | 1.779 | 0.049 | n/a | 0.518 | 6.004 | n/a | n/a | 0.069 | 4.278 | 0.311 | 0.069 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000002b3 | 13.512 | 5.171 | 0.012 | 0.000 | 1.151 | 1.024 | 1.201 | 0.037 | n/a | 0.099 | 4.741 | n/a | n/a | 0.075 | 6.334 | 0.469 | 0.075 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000002ab | 12.385 | 3.376 | 0.006 | 0.000 | 0.757 | 0.711 | 2.154 | 0.037 | n/a | 0.415 | 4.883 | n/a | n/a | 0.046 | 4.140 | 0.334 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000002c3 | 11.782 | 3.023 | 0.015 | 0.000 | 1.057 | 0.709 | 1.080 | 0.033 | n/a | 0.142 | 5.692 | n/a | n/a | 0.031 | 4.095 | 0.348 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b08067500000000000002c9 | 11.292 | 1.594 | n/a | 0.000 | 0.463 | 4.149 | 4.939 | 0.033 | n/a | 0.070 | 0.000 | n/a | n/a | 0.044 | 2.057 | 0.182 | 0.044 | node-14/thread-0/socket.wait-first-byte | none observed |
| 54f5c68b5b08067500000000000002c5 | 10.536 | 3.466 | 0.006 | 0.000 | 0.169 | 0.928 | 1.459 | 0.042 | n/a | 0.325 | 4.083 | n/a | n/a | 0.056 | 3.641 | 0.346 | 0.056 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b0806750000000000000282 | 9.543 | 3.766 | 0.007 | 0.000 | 0.144 | 0.675 | 1.001 | 0.030 | n/a | 0.359 | 3.491 | n/a | n/a | 0.069 | 3.917 | 0.411 | 0.069 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (846 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.242 | 0.812 | 0.000 | 1.637 | 3.740 | 0.005 | 0.000 | 0.758 | 0.872 | 1.278 | 0.036 | n/a | 0.161 | 6.764 | n/a | n/a | 0.038 | 4.749 | 0.314 | 0.038 |
| p99 | 85.956 | 3.193 | 2.116 | 5.604 | 13.371 | 20.830 | 0.000 | 27.840 | 23.814 | 13.610 | 3.473 | n/a | 3.905 | 40.134 | n/a | n/a | 0.111 | 49.136 | 0.736 | 0.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b080675000000000000035c | 122.452 | 6.726 | 0.018 | 0.000 | 60.310 | 2.780 | 5.316 | 2.816 | n/a | 0.331 | 44.108 | n/a | n/a | 0.047 | 67.054 | 0.548 | 0.047 | node-14/thread-0/driver.queue.subject | driver.publication 3.932ms; driver.expected-state.bind-receipt 2.564ms; driver.publication 2.031ms; driver.publication 1.885ms; driver.publication 1.730ms |
| 54f5c68b5b0806750000000000000355 | 116.333 | 3.279 | 20.830 | 0.000 | 14.678 | 32.970 | 10.352 | 0.698 | n/a | 0.050 | 33.438 | n/a | n/a | 0.038 | 38.787 | 0.333 | 0.038 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 3.932ms; driver.publication 3.112ms; driver.expected-state.bind-receipt 2.564ms; driver.publication 2.031ms; driver.publication 2.011ms |
| 54f5c68b5b0806750000000000000354 | 115.366 | 12.072 | 41.777 | 0.000 | 24.272 | 9.823 | 1.292 | 3.352 | n/a | 0.026 | 22.707 | n/a | n/a | 0.045 | 78.121 | 0.677 | 0.045 | node-14/thread-0/client.commit-send-queue | driver.publication 3.932ms; driver.publication 3.112ms; driver.expected-state.bind-receipt 2.564ms; driver.publication 2.031ms; driver.publication 2.011ms |
| 54f5c68b5b0806750000000000000365 | 109.588 | 3.109 | 0.006 | 0.000 | 89.318 | 1.037 | 2.333 | 0.111 | n/a | 3.032 | 10.591 | n/a | n/a | 0.050 | 92.433 | 0.843 | 0.050 | node-14/thread-0/driver.queue.subject | driver.publication 1.730ms; driver.publication 1.461ms; driver.publication 1.281ms; driver.publication 1.246ms; driver.publication 1.240ms |
| 54f5c68b5b0806750000000000000360 | 106.494 | 2.887 | 0.008 | 0.000 | 75.511 | 0.720 | 1.385 | 0.073 | n/a | 0.366 | 25.513 | n/a | n/a | 0.031 | 78.407 | 0.736 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication 2.031ms; driver.publication 1.730ms; driver.publication 1.461ms; driver.publication 1.281ms; driver.publication 1.246ms |
| 54f5c68b5b0806750000000000000353 | 102.554 | 10.927 | 1.512 | 0.000 | 27.324 | 41.619 | 4.909 | 0.042 | n/a | 0.281 | 15.885 | n/a | n/a | 0.055 | 39.763 | 0.388 | 0.055 | node-14/thread-0/socket.queue-and-write | driver.publication 3.932ms; driver.publication 3.112ms; driver.expected-state.bind-receipt 2.564ms; driver.publication 2.011ms; driver.publication 1.340ms |
| 54f5c68b5b0806750000000000000364 | 90.969 | 3.970 | 0.003 | 0.000 | 72.369 | 2.826 | 3.991 | 0.036 | n/a | 0.086 | 7.635 | n/a | n/a | 0.052 | 76.343 | 0.839 | 0.052 | node-14/thread-0/driver.queue.subject | driver.publication 1.730ms; driver.publication 1.461ms; driver.publication 1.281ms; driver.publication 1.246ms; driver.publication 1.138ms |
| 54f5c68b5b0806750000000000000317 | 87.124 | 8.711 | 0.012 | 0.000 | 1.942 | 28.847 | 5.206 | 0.100 | n/a | 0.079 | 42.165 | n/a | n/a | 0.062 | 10.665 | 0.122 | 0.062 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 15.867ms; driver.publication 2.208ms; driver.expected-state.bind-receipt 1.040ms; driver.publication 0.690ms |
| 54f5c68b5b080675000000000000035b | 85.956 | 6.837 | 23.723 | 0.000 | 10.383 | 9.312 | 0.938 | 1.612 | n/a | 0.013 | 33.101 | n/a | n/a | 0.036 | 40.943 | 0.476 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 3.932ms; driver.expected-state.bind-receipt 2.564ms; driver.publication 2.031ms; driver.publication 2.011ms; driver.publication 1.730ms |
| 54f5c68b5b0806750000000000000352 | 84.642 | 13.371 | 0.013 | 0.000 | 41.312 | 12.695 | 2.122 | 0.052 | n/a | 3.244 | 8.684 | n/a | n/a | 3.150 | 54.696 | 0.646 | 3.150 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 3.112ms; driver.publication 2.011ms; driver.publication 1.340ms |
| 54f5c68b5b0806750000000000000362 | 82.706 | 3.534 | 4.709 | 0.000 | 2.291 | 23.814 | 2.658 | 0.037 | n/a | 1.383 | 44.259 | n/a | n/a | 0.021 | 10.534 | 0.127 | 0.021 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 2.031ms; driver.publication 1.730ms; driver.publication 1.461ms; driver.publication 1.281ms; driver.publication 1.137ms |
| 54f5c68b5b0806750000000000000359 | 82.516 | 9.346 | 24.495 | 0.000 | 14.914 | 8.287 | 1.022 | 2.648 | n/a | 0.023 | 21.749 | n/a | n/a | 0.032 | 48.755 | 0.591 | 0.032 | node-14/thread-0/client.commit-send-queue | driver.publication 3.932ms; driver.publication 3.112ms; driver.expected-state.bind-receipt 2.564ms; driver.publication 2.031ms; driver.publication 2.011ms |
| 54f5c68b5b080675000000000000035e | 81.668 | 8.711 | 4.486 | 0.000 | 11.693 | 4.182 | 4.209 | 0.031 | n/a | 1.744 | 46.565 | n/a | n/a | 0.048 | 24.889 | 0.305 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 3.932ms; driver.expected-state.bind-receipt 2.564ms; driver.publication 2.031ms; driver.publication 1.730ms; driver.publication 1.137ms |
| 54f5c68b5b080675000000000000035a | 79.975 | 6.139 | 24.549 | 0.000 | 9.878 | 12.059 | 2.677 | 0.151 | n/a | 0.016 | 24.445 | n/a | n/a | 0.061 | 40.566 | 0.507 | 0.061 | node-14/thread-0/client.commit-send-queue | driver.publication 3.932ms; driver.expected-state.bind-receipt 2.564ms; driver.publication 2.031ms; driver.publication 2.011ms; driver.publication 1.730ms |
| 54f5c68b5b08067500000000000003df | 79.923 | 16.012 | 0.004 | 0.000 | 2.874 | 21.317 | 4.764 | 0.071 | n/a | 0.119 | 34.735 | n/a | n/a | 0.028 | 18.889 | 0.236 | 0.028 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 35.406ms |
| 54f5c68b5b080675000000000000035f | 78.145 | 7.302 | 8.216 | 0.000 | 4.804 | 1.542 | 0.828 | 3.567 | n/a | 3.259 | 48.604 | n/a | n/a | 0.025 | 20.321 | 0.260 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.031ms; driver.publication 1.730ms; driver.publication 1.461ms; driver.publication 1.137ms; driver.publication 1.124ms |
| 54f5c68b5b0806750000000000000361 | 77.733 | 3.639 | 2.940 | 0.000 | 2.060 | 4.740 | 2.366 | 12.681 | n/a | 1.136 | 48.128 | n/a | n/a | 0.043 | 8.639 | 0.111 | 0.043 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 2.031ms; driver.publication 1.730ms; driver.publication 1.461ms; driver.publication 1.281ms; driver.publication 1.137ms |
| 54f5c68b5b0806750000000000000815 | 77.093 | 9.003 | 0.008 | 0.000 | 0.816 | 28.777 | 5.553 | 0.052 | n/a | 0.874 | 31.969 | n/a | n/a | 0.042 | 9.827 | 0.127 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.879ms; driver.publication 1.199ms; driver.publication 1.055ms; driver.publication 1.046ms; driver.publication 1.044ms |
| 54f5c68b5b0806750000000000000319 | 76.651 | 5.426 | 0.041 | 0.000 | 4.633 | 14.861 | 21.685 | 0.228 | n/a | 4.155 | 25.581 | n/a | n/a | 0.042 | 10.099 | 0.132 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 15.867ms; driver.publication 4.372ms; driver.publication 2.208ms; driver.expected-state.bind-receipt 1.040ms |
| 54f5c68b5b08067500000000000003dd | 75.347 | 37.998 | 0.005 | 0.000 | 11.133 | 0.445 | 7.691 | 0.032 | n/a | 0.133 | 17.682 | n/a | n/a | 0.228 | 49.136 | 0.652 | 0.228 | node-14/thread-0/driver.publication | driver.publication 5.303ms; driver.expected-state.bind-receipt 1.123ms |

## P2 / L1024 / commit / 5-10 facts (491 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.152 | 0.696 | 0.000 | 1.482 | 3.190 | 0.004 | 0.000 | 0.765 | 0.858 | 1.112 | 0.036 | n/a | 0.154 | 6.005 | n/a | n/a | 0.038 | 4.168 | 0.312 | 0.038 |
| p99 | 82.706 | 2.242 | 2.132 | 5.962 | 11.677 | 20.830 | 0.000 | 26.174 | 26.825 | 16.230 | 3.713 | n/a | 3.888 | 40.134 | n/a | n/a | 0.128 | 40.566 | 0.739 | 0.128 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b0806750000000000000355 | 116.333 | 3.279 | 20.830 | 0.000 | 14.678 | 32.970 | 10.352 | 0.698 | n/a | 0.050 | 33.438 | n/a | n/a | 0.038 | 38.787 | 0.333 | 0.038 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 3.932ms; driver.publication 3.112ms; driver.expected-state.bind-receipt 2.564ms; driver.publication 2.031ms; driver.publication 2.011ms |
| 54f5c68b5b0806750000000000000365 | 109.588 | 3.109 | 0.006 | 0.000 | 89.318 | 1.037 | 2.333 | 0.111 | n/a | 3.032 | 10.591 | n/a | n/a | 0.050 | 92.433 | 0.843 | 0.050 | node-14/thread-0/driver.queue.subject | driver.publication 1.730ms; driver.publication 1.461ms; driver.publication 1.281ms; driver.publication 1.246ms; driver.publication 1.240ms |
| 54f5c68b5b0806750000000000000353 | 102.554 | 10.927 | 1.512 | 0.000 | 27.324 | 41.619 | 4.909 | 0.042 | n/a | 0.281 | 15.885 | n/a | n/a | 0.055 | 39.763 | 0.388 | 0.055 | node-14/thread-0/socket.queue-and-write | driver.publication 3.932ms; driver.publication 3.112ms; driver.expected-state.bind-receipt 2.564ms; driver.publication 2.011ms; driver.publication 1.340ms |
| 54f5c68b5b0806750000000000000317 | 87.124 | 8.711 | 0.012 | 0.000 | 1.942 | 28.847 | 5.206 | 0.100 | n/a | 0.079 | 42.165 | n/a | n/a | 0.062 | 10.665 | 0.122 | 0.062 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 15.867ms; driver.publication 2.208ms; driver.expected-state.bind-receipt 1.040ms; driver.publication 0.690ms |
| 54f5c68b5b0806750000000000000362 | 82.706 | 3.534 | 4.709 | 0.000 | 2.291 | 23.814 | 2.658 | 0.037 | n/a | 1.383 | 44.259 | n/a | n/a | 0.021 | 10.534 | 0.127 | 0.021 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 2.031ms; driver.publication 1.730ms; driver.publication 1.461ms; driver.publication 1.281ms; driver.publication 1.137ms |
| 54f5c68b5b0806750000000000000359 | 82.516 | 9.346 | 24.495 | 0.000 | 14.914 | 8.287 | 1.022 | 2.648 | n/a | 0.023 | 21.749 | n/a | n/a | 0.032 | 48.755 | 0.591 | 0.032 | node-14/thread-0/client.commit-send-queue | driver.publication 3.932ms; driver.publication 3.112ms; driver.expected-state.bind-receipt 2.564ms; driver.publication 2.031ms; driver.publication 2.011ms |
| 54f5c68b5b080675000000000000035a | 79.975 | 6.139 | 24.549 | 0.000 | 9.878 | 12.059 | 2.677 | 0.151 | n/a | 0.016 | 24.445 | n/a | n/a | 0.061 | 40.566 | 0.507 | 0.061 | node-14/thread-0/client.commit-send-queue | driver.publication 3.932ms; driver.expected-state.bind-receipt 2.564ms; driver.publication 2.031ms; driver.publication 2.011ms; driver.publication 1.730ms |
| 54f5c68b5b08067500000000000003df | 79.923 | 16.012 | 0.004 | 0.000 | 2.874 | 21.317 | 4.764 | 0.071 | n/a | 0.119 | 34.735 | n/a | n/a | 0.028 | 18.889 | 0.236 | 0.028 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 35.406ms |
| 54f5c68b5b080675000000000000035f | 78.145 | 7.302 | 8.216 | 0.000 | 4.804 | 1.542 | 0.828 | 3.567 | n/a | 3.259 | 48.604 | n/a | n/a | 0.025 | 20.321 | 0.260 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.031ms; driver.publication 1.730ms; driver.publication 1.461ms; driver.publication 1.137ms; driver.publication 1.124ms |
| 54f5c68b5b0806750000000000000361 | 77.733 | 3.639 | 2.940 | 0.000 | 2.060 | 4.740 | 2.366 | 12.681 | n/a | 1.136 | 48.128 | n/a | n/a | 0.043 | 8.639 | 0.111 | 0.043 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 2.031ms; driver.publication 1.730ms; driver.publication 1.461ms; driver.publication 1.281ms; driver.publication 1.137ms |
| 54f5c68b5b0806750000000000000319 | 76.651 | 5.426 | 0.041 | 0.000 | 4.633 | 14.861 | 21.685 | 0.228 | n/a | 4.155 | 25.581 | n/a | n/a | 0.042 | 10.099 | 0.132 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 15.867ms; driver.publication 4.372ms; driver.publication 2.208ms; driver.expected-state.bind-receipt 1.040ms |
| 54f5c68b5b08067500000000000003dd | 75.347 | 37.998 | 0.005 | 0.000 | 11.133 | 0.445 | 7.691 | 0.032 | n/a | 0.133 | 17.682 | n/a | n/a | 0.228 | 49.136 | 0.652 | 0.228 | node-14/thread-0/driver.publication | driver.publication 5.303ms; driver.expected-state.bind-receipt 1.123ms |
| 54f5c68b5b0806750000000000000811 | 72.325 | 2.958 | 0.003 | 0.000 | 59.598 | 3.683 | 1.858 | 0.020 | n/a | 0.753 | 3.422 | n/a | n/a | 0.029 | 62.560 | 0.865 | 0.029 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.879ms; driver.publication 1.199ms; driver.publication 1.189ms; driver.publication 1.046ms; driver.publication 1.044ms |
| 54f5c68b5b0806750000000000000350 | 67.899 | 5.272 | 0.012 | 0.000 | 3.002 | 30.222 | 0.572 | 0.027 | n/a | 0.268 | 28.468 | n/a | n/a | 0.057 | 8.286 | 0.122 | 0.057 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.112ms |
| 54f5c68b5b0806750000000000000351 | 66.280 | 5.250 | 0.010 | 0.000 | 1.782 | 26.825 | 23.389 | 0.048 | n/a | 0.097 | 8.837 | n/a | n/a | 0.042 | 7.042 | 0.106 | 0.042 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.112ms; driver.publication 2.011ms |
| 54f5c68b5b080675000000000000034f | 65.685 | 7.757 | 0.015 | 0.000 | 0.258 | 25.568 | 0.971 | 0.039 | n/a | 0.126 | 30.880 | n/a | n/a | 0.071 | 8.031 | 0.122 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 54f5c68b5b080675000000000000031d | 65.530 | 15.457 | 4.582 | 0.000 | 18.484 | 12.886 | 2.001 | 0.066 | n/a | 0.097 | 11.905 | n/a | n/a | 0.052 | 38.523 | 0.588 | 0.052 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 4.372ms; driver.publication 3.216ms; driver.publication 2.126ms; driver.expected-state.bind-receipt 2.025ms; driver.publication 1.412ms |
| 54f5c68b5b080675000000000000036a | 58.732 | 4.276 | 0.008 | 0.000 | 7.502 | 1.926 | 2.099 | 0.040 | n/a | 2.709 | 40.134 | n/a | n/a | 0.038 | 11.786 | 0.201 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.461ms; driver.publication 1.281ms; driver.publication 1.137ms; driver.publication 1.124ms; driver.publication 1.124ms |
| 54f5c68b5b08067500000000000003d9 | 57.745 | 7.433 | 0.010 | 0.000 | 0.118 | 25.627 | 9.050 | 0.112 | n/a | 0.752 | 14.603 | n/a | n/a | 0.041 | 7.560 | 0.131 | 0.041 | node-14/thread-0/socket.wait-first-byte | driver.publication 10.325ms; driver.expected-state.bind-receipt 1.123ms |
| 54f5c68b5b0806750000000000000812 | 51.323 | 3.058 | 0.005 | 0.000 | 2.693 | 7.590 | 1.217 | 0.042 | n/a | 0.079 | 36.611 | n/a | n/a | 0.028 | 5.757 | 0.112 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.189ms; driver.publication 1.044ms |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.099 | 0.381 | 0.000 | 1.143 | 2.207 | 0.004 | 0.000 | 2.299 | 0.507 | 4.102 | 0.022 | n/a | 0.331 | 2.594 | n/a | n/a | 0.033 | 4.509 | 0.373 | 0.033 |
| p99 | 12.099 | 0.381 | 0.000 | 1.143 | 2.207 | 0.004 | 0.000 | 2.299 | 0.507 | 4.102 | 0.022 | n/a | 0.331 | 2.594 | n/a | n/a | 0.033 | 4.509 | 0.373 | 0.033 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b0806750000000000000962 | 12.099 | 2.207 | 0.004 | 0.000 | 2.299 | 0.507 | 4.102 | 0.022 | n/a | 0.331 | 2.594 | n/a | n/a | 0.033 | 4.509 | 0.373 | 0.033 | gw-w/thread-44/gateway.response-encode | none observed |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.099 | 0.381 | 0.000 | 1.143 | 2.207 | 0.004 | 0.000 | 2.299 | 0.507 | 4.102 | 0.022 | n/a | 0.331 | 2.594 | n/a | n/a | 0.033 | 4.509 | 0.373 | 0.033 |
| p99 | 12.099 | 0.381 | 0.000 | 1.143 | 2.207 | 0.004 | 0.000 | 2.299 | 0.507 | 4.102 | 0.022 | n/a | 0.331 | 2.594 | n/a | n/a | 0.033 | 4.509 | 0.373 | 0.033 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b0806750000000000000962 | 12.099 | 2.207 | 0.004 | 0.000 | 2.299 | 0.507 | 4.102 | 0.022 | n/a | 0.331 | 2.594 | n/a | n/a | 0.033 | 4.509 | 0.373 | 0.033 | gw-w/thread-44/gateway.response-encode | none observed |

## P2 / tail / commit (2621 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.767 | 0.750 | 0.000 | 1.587 | 3.565 | 0.005 | 0.000 | 0.734 | 0.736 | 1.124 | 0.029 | n/a | 0.122 | 5.427 | n/a | n/a | 0.034 | 4.525 | 0.356 | 0.034 |
| p99 | 57.588 | 2.882 | 2.757 | 5.253 | 10.851 | 0.816 | 0.000 | 20.233 | 13.753 | 8.267 | 2.150 | n/a | 3.717 | 28.741 | n/a | n/a | 0.094 | 28.668 | 0.715 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b0806750000000000000ea5 | 127.364 | 3.975 | 0.005 | 0.000 | 101.633 | 0.640 | 1.111 | 0.032 | n/a | 1.154 | 18.767 | n/a | n/a | 0.046 | 105.613 | 0.829 | 0.046 | node-14/thread-0/driver.queue.subject | driver.publication 3.450ms; driver.publication 2.156ms; driver.publication 1.446ms; driver.publication 1.298ms; driver.expected-state.bind-receipt 1.219ms |
| 54f5c68b5b0806750000000000000ea2 | 103.348 | 27.611 | 3.073 | 5.908 | 1.445 | 43.054 | 4.356 | 1.785 | n/a | 0.065 | 16.004 | n/a | n/a | 0.046 | 38.037 | 0.368 | 0.046 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.450ms; driver.publication 2.156ms; driver.publication 1.298ms; driver.expected-state.bind-receipt 1.219ms; client.encode 1.099ms |
| 54f5c68b5b0806750000000000001634 | 103.213 | 27.618 | 0.123 | 0.000 | 1.191 | 58.578 | 3.110 | 1.462 | n/a | 3.279 | 7.835 | n/a | n/a | 0.017 | 28.932 | 0.280 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.631ms; driver.publication 4.215ms; driver.publication 3.763ms; driver.publication 3.483ms; driver.publication 2.858ms |
| 54f5c68b5b0806750000000000000ea0 | 96.323 | 15.301 | 0.011 | 0.000 | 25.176 | 32.184 | 1.530 | 0.054 | n/a | 0.115 | 21.903 | n/a | n/a | 0.049 | 40.488 | 0.420 | 0.049 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 9.561ms; driver.publication 3.450ms; driver.publication 1.298ms; driver.expected-state.bind-receipt 1.219ms; driver.publication 1.151ms |
| 54f5c68b5b0806750000000000001336 | 95.078 | 2.732 | 0.005 | 0.000 | 69.237 | 4.443 | 1.406 | 0.060 | n/a | 5.817 | 11.319 | n/a | n/a | 0.059 | 71.974 | 0.757 | 0.059 | node-14/thread-0/driver.queue.subject | driver.publication 1.833ms; driver.publication 1.744ms; driver.publication 1.582ms; driver.publication 1.321ms; driver.publication 1.220ms |
| 54f5c68b5b0806750000000000000e9b | 92.718 | 16.701 | 0.011 | 0.000 | 24.160 | 17.952 | 1.629 | 0.032 | n/a | 3.757 | 28.437 | n/a | n/a | 0.038 | 40.871 | 0.441 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 9.561ms; driver.publication 3.634ms; driver.publication 3.159ms; driver.publication 1.151ms; client.encode 1.099ms |
| 54f5c68b5b0806750000000000000d4f | 89.676 | 9.671 | 0.004 | 0.000 | 0.490 | 23.654 | 9.864 | 1.768 | n/a | 0.137 | 44.057 | n/a | n/a | 0.029 | 10.166 | 0.113 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.930ms; driver.publication 1.652ms; driver.publication 1.502ms; driver.publication 1.302ms; driver.publication 1.230ms |
| 54f5c68b5b080675000000000000163a | 85.759 | 5.772 | 0.010 | 0.000 | 63.129 | 11.301 | 1.008 | 0.028 | n/a | 0.102 | 4.375 | n/a | n/a | 0.034 | 68.911 | 0.804 | 0.034 | node-14/thread-0/driver.queue.subject | driver.publication 6.631ms; driver.publication 4.215ms; driver.publication 3.763ms; driver.publication 3.483ms; driver.publication 2.858ms |
| 54f5c68b5b0806750000000000000ea6 | 82.002 | 3.688 | 0.004 | 0.000 | 65.568 | 0.646 | 0.930 | 0.026 | n/a | 2.627 | 8.469 | n/a | n/a | 0.044 | 69.260 | 0.845 | 0.044 | node-14/thread-0/driver.queue.subject | driver.publication 2.156ms; driver.publication 1.446ms; driver.publication 1.298ms; driver.publication 1.219ms; driver.publication 1.193ms |
| 54f5c68b5b0806750000000000001334 | 81.348 | 2.799 | 0.004 | 0.000 | 49.272 | 2.752 | 0.882 | 0.029 | n/a | 0.053 | 25.524 | n/a | n/a | 0.032 | 52.075 | 0.640 | 0.032 | node-14/thread-0/driver.queue.subject | driver.publication 1.833ms; driver.publication 1.744ms; driver.publication 1.220ms; driver.publication 1.166ms |
| 54f5c68b5b0806750000000000001333 | 77.923 | 4.163 | 0.007 | 0.000 | 0.963 | 19.344 | 8.267 | 0.091 | n/a | 0.149 | 44.901 | n/a | n/a | 0.039 | 5.132 | 0.066 | 0.039 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 1.220ms; driver.publication 1.166ms |
| 54f5c68b5b0806750000000000000d4e | 74.718 | 9.319 | 0.097 | 2.532 | 1.006 | 4.903 | 10.927 | 0.072 | n/a | 1.846 | 43.988 | n/a | n/a | 0.030 | 12.954 | 0.173 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.652ms; driver.publication 1.302ms; driver.publication 1.169ms |
| 54f5c68b5b0806750000000000001331 | 73.634 | 8.940 | 0.011 | 0.000 | 1.103 | 0.623 | 2.222 | 0.042 | n/a | 0.071 | 60.565 | n/a | n/a | 0.057 | 10.054 | 0.137 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.701ms; driver.publication 1.220ms |
| 54f5c68b5b08067500000000000016be | 72.886 | 18.728 | 0.008 | 0.000 | 22.465 | 21.297 | 7.435 | 0.053 | n/a | 0.772 | 2.078 | n/a | n/a | 0.050 | 41.201 | 0.565 | 0.050 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 6.337ms; driver.publication 5.906ms; driver.publication 3.086ms; driver.publication 1.095ms; driver.publication 1.067ms |
| 54f5c68b5b0806750000000000001637 | 71.109 | 4.274 | 0.006 | 0.000 | 36.307 | 19.245 | 1.510 | 0.043 | n/a | 0.065 | 9.615 | n/a | n/a | 0.045 | 40.587 | 0.571 | 0.045 | node-14/thread-0/driver.queue.subject | driver.publication 6.631ms; driver.publication 4.215ms; driver.publication 3.763ms; driver.publication 2.858ms; driver.publication 2.519ms |
| 54f5c68b5b0806750000000000001645 | 70.642 | 2.389 | 0.005 | 0.000 | 38.435 | 8.840 | 1.031 | 0.047 | n/a | 0.336 | 19.533 | n/a | n/a | 0.026 | 40.829 | 0.578 | 0.026 | node-14/thread-0/driver.queue.subject | driver.publication 3.483ms; driver.publication 1.778ms; driver.publication 1.476ms; driver.publication 1.073ms; driver.publication 1.049ms |
| 54f5c68b5b0806750000000000000ea1 | 70.276 | 20.597 | 8.673 | 0.000 | 3.317 | 17.048 | 3.806 | 0.026 | n/a | 0.073 | 16.707 | n/a | n/a | 0.031 | 32.586 | 0.464 | 0.031 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.450ms; driver.expected-state.bind-receipt 1.219ms |
| 54f5c68b5b0806750000000000000bc2 | 69.069 | 8.195 | 0.003 | 0.000 | 36.283 | 0.759 | 1.667 | 0.087 | n/a | 0.117 | 21.924 | n/a | n/a | 0.034 | 44.482 | 0.644 | 0.034 | node-14/thread-0/driver.queue.subject | driver.publication 8.195ms; driver.publication 1.303ms; driver.publication 1.196ms |
| 54f5c68b5b0806750000000000000e98 | 68.634 | 16.876 | 0.729 | 0.000 | 9.925 | 21.113 | 2.721 | 0.019 | n/a | 1.079 | 16.138 | n/a | n/a | 0.035 | 27.529 | 0.401 | 0.035 | node-14/thread-0/socket.wait-first-byte | driver.publication 9.561ms; driver.publication 5.936ms; driver.publication 3.634ms; driver.publication 3.159ms; driver.expected-state.bind-receipt 2.131ms |
| 54f5c68b5b0806750000000000000e97 | 66.812 | 15.220 | 1.387 | 0.000 | 10.177 | 21.503 | 0.627 | 0.323 | n/a | 0.252 | 17.293 | n/a | n/a | 0.029 | 26.784 | 0.401 | 0.029 | node-14/thread-0/socket.wait-first-byte | driver.publication 9.561ms; driver.publication 6.479ms; driver.publication 3.634ms; driver.publication 3.159ms; driver.expected-state.bind-receipt 2.131ms |

## P2 / tail / commit / 5-10 facts (1556 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.343 | 0.624 | 0.000 | 1.461 | 3.141 | 0.005 | 0.000 | 0.744 | 0.745 | 0.942 | 0.028 | n/a | 0.122 | 4.876 | n/a | n/a | 0.033 | 4.060 | 0.353 | 0.033 |
| p99 | 51.473 | 2.192 | 2.859 | 5.669 | 10.298 | 0.226 | 0.000 | 19.542 | 12.886 | 5.397 | 3.065 | n/a | 3.680 | 25.046 | n/a | n/a | 0.092 | 28.668 | 0.726 | 0.092 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 54f5c68b5b0806750000000000000ea2 | 103.348 | 27.611 | 3.073 | 5.908 | 1.445 | 43.054 | 4.356 | 1.785 | n/a | 0.065 | 16.004 | n/a | n/a | 0.046 | 38.037 | 0.368 | 0.046 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.450ms; driver.publication 2.156ms; driver.publication 1.298ms; driver.expected-state.bind-receipt 1.219ms; client.encode 1.099ms |
| 54f5c68b5b0806750000000000001634 | 103.213 | 27.618 | 0.123 | 0.000 | 1.191 | 58.578 | 3.110 | 1.462 | n/a | 3.279 | 7.835 | n/a | n/a | 0.017 | 28.932 | 0.280 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.631ms; driver.publication 4.215ms; driver.publication 3.763ms; driver.publication 3.483ms; driver.publication 2.858ms |
| 54f5c68b5b0806750000000000001336 | 95.078 | 2.732 | 0.005 | 0.000 | 69.237 | 4.443 | 1.406 | 0.060 | n/a | 5.817 | 11.319 | n/a | n/a | 0.059 | 71.974 | 0.757 | 0.059 | node-14/thread-0/driver.queue.subject | driver.publication 1.833ms; driver.publication 1.744ms; driver.publication 1.582ms; driver.publication 1.321ms; driver.publication 1.220ms |
| 54f5c68b5b0806750000000000000d4f | 89.676 | 9.671 | 0.004 | 0.000 | 0.490 | 23.654 | 9.864 | 1.768 | n/a | 0.137 | 44.057 | n/a | n/a | 0.029 | 10.166 | 0.113 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.930ms; driver.publication 1.652ms; driver.publication 1.502ms; driver.publication 1.302ms; driver.publication 1.230ms |
| 54f5c68b5b0806750000000000001334 | 81.348 | 2.799 | 0.004 | 0.000 | 49.272 | 2.752 | 0.882 | 0.029 | n/a | 0.053 | 25.524 | n/a | n/a | 0.032 | 52.075 | 0.640 | 0.032 | node-14/thread-0/driver.queue.subject | driver.publication 1.833ms; driver.publication 1.744ms; driver.publication 1.220ms; driver.publication 1.166ms |
| 54f5c68b5b0806750000000000001645 | 70.642 | 2.389 | 0.005 | 0.000 | 38.435 | 8.840 | 1.031 | 0.047 | n/a | 0.336 | 19.533 | n/a | n/a | 0.026 | 40.829 | 0.578 | 0.026 | node-14/thread-0/driver.queue.subject | driver.publication 3.483ms; driver.publication 1.778ms; driver.publication 1.476ms; driver.publication 1.073ms; driver.publication 1.049ms |
| 54f5c68b5b0806750000000000000bc2 | 69.069 | 8.195 | 0.003 | 0.000 | 36.283 | 0.759 | 1.667 | 0.087 | n/a | 0.117 | 21.924 | n/a | n/a | 0.034 | 44.482 | 0.644 | 0.034 | node-14/thread-0/driver.queue.subject | driver.publication 8.195ms; driver.publication 1.303ms; driver.publication 1.196ms |
| 54f5c68b5b0806750000000000000e97 | 66.812 | 15.220 | 1.387 | 0.000 | 10.177 | 21.503 | 0.627 | 0.323 | n/a | 0.252 | 17.293 | n/a | n/a | 0.029 | 26.784 | 0.401 | 0.029 | node-14/thread-0/socket.wait-first-byte | driver.publication 9.561ms; driver.publication 6.479ms; driver.publication 3.634ms; driver.publication 3.159ms; driver.expected-state.bind-receipt 2.131ms |
| 54f5c68b5b0806750000000000000e96 | 66.609 | 19.769 | 0.014 | 0.000 | 11.272 | 20.875 | 1.115 | 0.026 | n/a | 0.826 | 12.652 | n/a | n/a | 0.061 | 31.054 | 0.466 | 0.061 | node-14/thread-0/socket.wait-first-byte | driver.publication 7.694ms; driver.publication 3.634ms; driver.publication 3.159ms; driver.expected-state.bind-receipt 2.131ms |
| 54f5c68b5b0806750000000000001335 | 65.865 | 4.296 | 0.009 | 0.000 | 0.692 | 9.219 | 1.411 | 0.040 | n/a | 0.057 | 50.097 | n/a | n/a | 0.044 | 4.997 | 0.076 | 0.044 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.744ms; driver.publication 1.220ms; driver.publication 1.166ms |
| 54f5c68b5b08067500000000000011a1 | 61.367 | 2.348 | 0.004 | 0.000 | 48.110 | 3.058 | 2.463 | 0.032 | n/a | 0.081 | 5.238 | n/a | n/a | 0.033 | 50.462 | 0.822 | 0.033 | node-14/thread-0/driver.queue.subject | driver.publication 1.626ms; driver.publication 1.267ms; driver.publication 1.188ms; driver.publication 1.013ms |
| 54f5c68b5b0806750000000000000d20 | 55.285 | 3.628 | 0.007 | 0.000 | 2.249 | 8.734 | 11.324 | 0.048 | n/a | 0.086 | 29.182 | n/a | n/a | 0.027 | 5.884 | 0.106 | 0.027 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 1.260ms; driver.publication 1.160ms |
| 54f5c68b5b0806750000000000000d51 | 53.549 | 3.314 | 0.006 | 0.000 | 4.453 | 5.310 | 34.733 | 0.043 | n/a | 0.062 | 5.586 | n/a | n/a | 0.042 | 7.773 | 0.145 | 0.042 | gw-w/thread-67/commit.prepare-and-validate | driver.expected-state.bind-receipt 3.930ms; driver.publication 1.302ms; driver.publication 1.169ms |
| 54f5c68b5b0806750000000000001648 | 51.548 | 4.618 | 0.772 | 0.000 | 8.913 | 1.313 | 1.183 | 2.790 | n/a | 0.474 | 31.466 | n/a | n/a | 0.019 | 14.303 | 0.277 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 3.483ms; driver.publication 1.476ms; driver.publication 1.049ms |
| 54f5c68b5b0806750000000000000d24 | 51.545 | 5.481 | 0.007 | 0.000 | 26.640 | 2.199 | 3.481 | 0.023 | n/a | 0.584 | 13.093 | n/a | n/a | 0.035 | 32.129 | 0.623 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication 2.166ms; driver.publication 1.260ms; driver.publication 1.180ms; driver.publication 1.167ms; driver.publication 1.160ms |
| 54f5c68b5b0806750000000000000ce1 | 51.473 | 2.900 | 0.004 | 0.000 | 34.471 | 0.660 | 0.896 | 0.025 | n/a | 2.261 | 10.232 | n/a | n/a | 0.023 | 37.376 | 0.726 | 0.023 | node-14/thread-0/driver.queue.subject | driver.publication 3.297ms; driver.publication 1.377ms; driver.publication 1.006ms |
| 54f5c68b5b080675000000000000119f | 51.418 | 8.933 | 0.010 | 0.000 | 0.670 | 14.281 | 3.213 | 0.062 | n/a | 5.470 | 18.753 | n/a | n/a | 0.024 | 9.614 | 0.187 | 0.024 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.626ms; driver.publication 1.267ms; driver.publication 1.013ms |
| 54f5c68b5b0806750000000000000d53 | 49.529 | 2.709 | 0.006 | 0.000 | 3.133 | 6.649 | 28.526 | 0.760 | n/a | 0.025 | 7.700 | n/a | n/a | 0.021 | 5.848 | 0.118 | 0.021 | gw-w/thread-64/gateway.route | driver.expected-state.bind-receipt 3.930ms; driver.publication 1.302ms; driver.publication 1.169ms; driver.publication 1.093ms |
| 54f5c68b5b0806750000000000000e91 | 48.548 | 17.235 | 0.014 | 0.000 | 7.019 | 16.459 | 1.048 | 0.030 | n/a | 0.081 | 6.602 | n/a | n/a | 0.060 | 24.268 | 0.500 | 0.060 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.852ms; driver.publication 2.392ms |
| 54f5c68b5b08067500000000000016bd | 47.389 | 9.552 | 0.007 | 0.000 | 0.832 | 31.017 | 1.333 | 0.052 | n/a | 0.108 | 4.453 | n/a | n/a | 0.035 | 10.391 | 0.219 | 0.035 | node-14/thread-0/socket.wait-first-byte | none observed |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.583 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.145 | 200.750 | 0.011 | n/a | 0.040 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 |
| p99 | 255.445 | n/a | n/a | n/a | 26.349 | n/a | 2.209 | 0.000 | 4.402 | 246.055 | 0.323 | n/a | 0.165 | 0.000 | n/a | n/a | 0.338 | 28.559 | 0.291 | 0.338 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e49870ac6945c8e50000000000000002 | 255.445 | 4.233 | n/a | 0.000 | 0.000 | 4.402 | 246.055 | 0.323 | n/a | 0.094 | 0.000 | n/a | n/a | 0.338 | 4.233 | 0.017 | 0.338 | gw-r/thread-49/gateway.admitted-work | none observed |
| 7b006484a62c082b0000000000000007 | 202.723 | 0.000 | n/a | 0.000 | 0.000 | 1.145 | 201.183 | 0.011 | n/a | 0.165 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b0000000000000005 | 202.697 | 0.000 | n/a | 0.000 | 0.000 | 1.359 | 200.968 | 0.013 | n/a | 0.116 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b0000000000000006 | 202.251 | 0.000 | n/a | 0.000 | 0.000 | 0.959 | 200.904 | 0.012 | n/a | 0.114 | 0.000 | n/a | n/a | 0.262 | 0.000 | 0.000 | 0.262 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b0000000000000f2a | 201.665 | 0.000 | n/a | 0.000 | 0.000 | 0.570 | 200.914 | 0.015 | n/a | 0.056 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-66/journal/page | none observed |
| 7b006484a62c082b0000000000000f2b | 201.583 | 0.000 | n/a | 0.000 | 0.000 | 0.650 | 200.750 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b0000000000000f28 | 201.516 | 0.000 | n/a | 0.000 | 0.000 | 0.631 | 200.629 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-66/journal/page | none observed |
| 7b006484a62c082b0000000000000f29 | 201.428 | 0.000 | n/a | 0.000 | 0.000 | 0.642 | 200.600 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000f2e | 98.278 | 26.349 | n/a | 2.209 | 0.000 | 3.335 | 66.058 | 0.003 | n/a | 0.003 | 0.000 | n/a | n/a | 0.321 | 28.559 | 0.291 | 0.321 | gw-r/thread-51/gateway.admitted-work | none observed |
| 7b006484a62c082b0000000000000f30 | 80.355 | 20.349 | n/a | 0.000 | 0.000 | 2.293 | 57.390 | 0.007 | n/a | 0.009 | 0.000 | n/a | n/a | 0.307 | 20.349 | 0.253 | 0.307 | gw-r/thread-51/gateway.admitted-work | none observed |
| 7b006484a62c082b0000000000000f2f | 71.286 | 16.069 | n/a | 0.000 | 0.000 | 1.459 | 53.554 | 0.012 | n/a | 0.007 | 0.000 | n/a | n/a | 0.186 | 16.069 | 0.225 | 0.186 | gw-r/thread-47/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 805.051 | n/a | n/a | n/a | 0.185 | n/a | 0.000 | 0.000 | 1.340 | 788.270 | 0.011 | n/a | 0.146 | 0.000 | n/a | n/a | 0.273 | 0.185 | 0.000 | 0.273 |
| p99 | 1005.209 | n/a | n/a | n/a | 13.426 | n/a | 0.000 | 0.000 | 2.925 | 1002.014 | 0.026 | n/a | 0.421 | 0.000 | n/a | n/a | 1.222 | 13.426 | 0.017 | 1.222 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e49870ac6945c8e500000000000000a4 | 1005.209 | 0.185 | n/a | 0.000 | 0.000 | 1.340 | 1002.014 | 0.026 | n/a | 0.421 | 0.000 | n/a | n/a | 1.222 | 0.185 | 0.000 | 1.222 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e500000000000000a5 | 805.051 | 13.426 | n/a | 0.000 | 0.000 | 2.925 | 788.270 | 0.011 | n/a | 0.146 | 0.000 | n/a | n/a | 0.273 | 13.426 | 0.017 | 0.273 | gw-r/thread-51/journal/page | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 424.337 | n/a | n/a | n/a | 2.570 | n/a | 0.000 | 0.000 | 0.718 | 421.491 | 0.019 | n/a | 0.089 | 0.000 | n/a | n/a | 0.092 | 2.570 | 0.006 | 0.092 |
| p99 | 1002.422 | n/a | n/a | n/a | 10.935 | n/a | 0.000 | 0.000 | 2.006 | 999.181 | 1.857 | n/a | 0.129 | 0.000 | n/a | n/a | 7.399 | 10.935 | 0.223 | 7.399 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e49870ac6945c8e500000000000000b4 | 1002.422 | 2.444 | n/a | 0.000 | 0.000 | 0.608 | 999.181 | 0.012 | n/a | 0.083 | 0.000 | n/a | n/a | 0.094 | 2.444 | 0.002 | 0.094 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e500000000000000ae | 1001.563 | 2.518 | n/a | 0.000 | 0.000 | 0.641 | 998.184 | 0.022 | n/a | 0.116 | 0.000 | n/a | n/a | 0.083 | 2.518 | 0.003 | 0.083 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e500000000000000bb | 998.009 | 2.316 | n/a | 0.000 | 0.000 | 0.902 | 994.567 | 0.011 | n/a | 0.128 | 0.000 | n/a | n/a | 0.085 | 2.316 | 0.002 | 0.085 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e500000000000000cf | 995.327 | 2.369 | n/a | 0.000 | 0.000 | 0.826 | 991.950 | 0.014 | n/a | 0.090 | 0.000 | n/a | n/a | 0.079 | 2.369 | 0.002 | 0.079 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e500000000000000ba | 992.027 | 2.570 | n/a | 0.000 | 0.000 | 0.612 | 988.531 | 0.152 | n/a | 0.067 | 0.000 | n/a | n/a | 0.096 | 2.570 | 0.003 | 0.096 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e500000000000000ab | 837.867 | 2.659 | n/a | 0.000 | 0.000 | 0.562 | 834.446 | 0.013 | n/a | 0.073 | 0.000 | n/a | n/a | 0.113 | 2.659 | 0.003 | 0.113 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e500000000000000c1 | 811.378 | 10.935 | n/a | 0.000 | 0.000 | 1.087 | 799.074 | 0.023 | n/a | 0.120 | 0.000 | n/a | n/a | 0.140 | 10.935 | 0.013 | 0.140 | gw-r/thread-48/journal/page | none observed |
| e49870ac6945c8e500000000000000a8 | 799.427 | 2.116 | n/a | 0.000 | 0.000 | 0.831 | 795.744 | 0.537 | n/a | 0.098 | 0.000 | n/a | n/a | 0.101 | 2.116 | 0.003 | 0.101 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e500000000000000ca | 646.668 | 2.348 | n/a | 0.000 | 0.000 | 0.627 | 643.373 | 0.137 | n/a | 0.101 | 0.000 | n/a | n/a | 0.083 | 2.348 | 0.004 | 0.083 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e500000000000000b2 | 635.527 | 2.895 | n/a | 0.000 | 0.000 | 0.750 | 631.688 | 0.022 | n/a | 0.087 | 0.000 | n/a | n/a | 0.085 | 2.895 | 0.005 | 0.085 | gw-r/thread-48/journal/page | none observed |
| e49870ac6945c8e500000000000000c8 | 619.876 | 2.542 | n/a | 0.000 | 0.000 | 1.216 | 615.762 | 0.186 | n/a | 0.092 | 0.000 | n/a | n/a | 0.077 | 2.542 | 0.004 | 0.077 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e500000000000000bf | 593.070 | 3.841 | n/a | 0.000 | 0.000 | 0.895 | 588.016 | 0.019 | n/a | 0.129 | 0.000 | n/a | n/a | 0.171 | 3.841 | 0.006 | 0.171 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e500000000000000c5 | 573.103 | 2.587 | n/a | 0.000 | 0.000 | 2.006 | 568.303 | 0.048 | n/a | 0.076 | 0.000 | n/a | n/a | 0.083 | 2.587 | 0.005 | 0.083 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e500000000000000b6 | 440.688 | 2.547 | n/a | 0.000 | 0.000 | 0.758 | 437.250 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.075 | 2.547 | 0.006 | 0.075 | gw-r/thread-48/journal/page | none observed |
| e49870ac6945c8e500000000000000c4 | 424.337 | 1.986 | n/a | 0.000 | 0.000 | 0.661 | 421.491 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.081 | 1.986 | 0.005 | 0.081 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e500000000000000a6 | 413.941 | 4.749 | n/a | 0.000 | 0.000 | 0.772 | 408.121 | 0.016 | n/a | 0.118 | 0.000 | n/a | n/a | 0.166 | 4.749 | 0.011 | 0.166 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e500000000000000c7 | 388.755 | 2.615 | n/a | 0.000 | 0.000 | 0.673 | 385.263 | 0.013 | n/a | 0.084 | 0.000 | n/a | n/a | 0.107 | 2.615 | 0.007 | 0.107 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e500000000000000b0 | 345.730 | 5.767 | n/a | 0.000 | 0.000 | 0.530 | 338.936 | 0.228 | n/a | 0.122 | 0.000 | n/a | n/a | 0.148 | 5.767 | 0.017 | 0.148 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e500000000000000b8 | 343.938 | 5.012 | n/a | 0.000 | 0.000 | 0.548 | 336.230 | 1.857 | n/a | 0.095 | 0.000 | n/a | n/a | 0.197 | 5.012 | 0.015 | 0.197 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e500000000000000cb | 274.027 | 2.055 | n/a | 0.000 | 0.000 | 0.753 | 271.045 | 0.013 | n/a | 0.083 | 0.000 | n/a | n/a | 0.079 | 2.055 | 0.007 | 0.079 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 404.921 | n/a | n/a | n/a | 4.521 | n/a | 0.607 | 0.000 | 0.700 | 397.915 | 0.013 | n/a | 0.078 | 0.000 | n/a | n/a | 0.118 | 4.760 | 0.015 | 0.118 |
| p99 | 1003.612 | n/a | n/a | n/a | 16.677 | n/a | 1.531 | 0.000 | 2.545 | 1001.300 | 0.274 | n/a | 0.159 | 0.000 | n/a | n/a | 42.196 | 17.644 | 0.912 | 42.196 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e49870ac6945c8e500000000000000d0 | 1003.612 | 0.146 | n/a | 0.000 | 0.000 | 0.933 | 1001.300 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 1.125 | 0.146 | 0.000 | 1.125 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e5000000000000010d | 1002.994 | 6.210 | n/a | 0.000 | 0.000 | 0.967 | 995.528 | 0.014 | n/a | 0.075 | 0.000 | n/a | n/a | 0.199 | 6.210 | 0.006 | 0.199 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e500000000000000d8 | 1002.659 | 0.106 | n/a | 0.000 | 0.000 | 0.371 | 1000.955 | 0.019 | n/a | 0.107 | 0.000 | n/a | n/a | 1.100 | 0.106 | 0.000 | 1.100 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e50000000000000101 | 997.614 | 2.645 | n/a | 0.653 | 0.000 | 0.690 | 993.424 | 0.013 | n/a | 0.088 | 0.000 | n/a | n/a | 0.101 | 3.298 | 0.003 | 0.101 | gw-r/thread-50/journal/page | none observed |
| e49870ac6945c8e50000000000000105 | 994.971 | 3.261 | n/a | 0.000 | 0.000 | 1.226 | 990.316 | 0.008 | n/a | 0.089 | 0.000 | n/a | n/a | 0.071 | 3.261 | 0.003 | 0.071 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e500000000000000fe | 994.141 | 6.224 | n/a | 0.000 | 0.000 | 2.424 | 985.263 | 0.022 | n/a | 0.130 | 0.000 | n/a | n/a | 0.078 | 6.224 | 0.006 | 0.078 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e500000000000000d2 | 993.249 | 4.418 | n/a | 0.616 | 0.000 | 1.364 | 986.404 | 0.172 | n/a | 0.119 | 0.000 | n/a | n/a | 0.156 | 5.035 | 0.005 | 0.156 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e500000000000000df | 993.228 | 3.573 | n/a | 0.614 | 0.000 | 0.788 | 987.821 | 0.237 | n/a | 0.059 | 0.000 | n/a | n/a | 0.136 | 4.187 | 0.004 | 0.136 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e500000000000000de | 991.955 | 4.521 | n/a | 0.802 | 0.000 | 0.551 | 985.812 | 0.021 | n/a | 0.101 | 0.000 | n/a | n/a | 0.149 | 5.323 | 0.005 | 0.149 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e500000000000000da | 944.615 | 5.089 | n/a | 0.598 | 0.000 | 0.785 | 937.817 | 0.165 | n/a | 0.084 | 0.000 | n/a | n/a | 0.076 | 5.687 | 0.006 | 0.076 | gw-r/thread-48/journal/page | none observed |
| e49870ac6945c8e500000000000000e0 | 846.874 | 5.001 | n/a | 0.602 | 0.000 | 0.694 | 840.369 | 0.012 | n/a | 0.088 | 0.000 | n/a | n/a | 0.108 | 5.603 | 0.007 | 0.108 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e500000000000000e4 | 809.864 | 5.939 | n/a | 0.841 | 0.000 | 0.996 | 801.716 | 0.152 | n/a | 0.108 | 0.000 | n/a | n/a | 0.113 | 6.779 | 0.008 | 0.113 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e50000000000000102 | 791.138 | 2.459 | n/a | 0.000 | 0.000 | 1.558 | 786.961 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.070 | 2.459 | 0.003 | 0.070 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e500000000000000eb | 648.734 | 4.416 | n/a | 0.000 | 0.000 | 0.738 | 643.315 | 0.014 | n/a | 0.087 | 0.000 | n/a | n/a | 0.164 | 4.416 | 0.007 | 0.164 | gw-r/thread-50/journal/page | none observed |
| e49870ac6945c8e500000000000000e7 | 586.671 | 8.703 | n/a | 1.531 | 0.000 | 2.545 | 573.421 | 0.274 | n/a | 0.078 | 0.000 | n/a | n/a | 0.118 | 10.235 | 0.017 | 0.118 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e500000000000000fb | 584.900 | 7.995 | n/a | 0.725 | 0.000 | 1.105 | 574.625 | 0.198 | n/a | 0.159 | 0.000 | n/a | n/a | 0.094 | 8.720 | 0.015 | 0.094 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e500000000000000db | 575.556 | 9.803 | n/a | 1.301 | 0.000 | 0.618 | 563.673 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.088 | 11.104 | 0.019 | 0.088 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e50000000000000107 | 467.122 | 12.106 | n/a | 1.354 | 0.000 | 0.998 | 452.323 | 0.028 | n/a | 0.153 | 0.000 | n/a | n/a | 0.160 | 13.460 | 0.029 | 0.160 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e500000000000000dc | 453.105 | 5.795 | n/a | 0.644 | 0.000 | 0.970 | 445.432 | 0.031 | n/a | 0.056 | 0.000 | n/a | n/a | 0.176 | 6.439 | 0.014 | 0.176 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e500000000000000d4 | 442.373 | 5.090 | n/a | 0.665 | 0.000 | 0.866 | 435.597 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.104 | 5.755 | 0.013 | 0.104 | gw-r/thread-50/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 428.061 | n/a | n/a | n/a | 3.372 | n/a | 0.000 | 0.000 | 0.702 | 424.373 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.094 | 3.646 | 0.010 | 0.094 |
| p99 | 1006.047 | n/a | n/a | n/a | 13.397 | n/a | 1.842 | 0.000 | 1.833 | 1002.094 | 3.880 | n/a | 0.090 | 0.000 | n/a | n/a | 45.499 | 14.297 | 0.556 | 45.499 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e49870ac6945c8e50000000000000129 | 1006.047 | 3.062 | n/a | 0.000 | 0.000 | 0.771 | 1002.094 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.067 | 3.062 | 0.003 | 0.067 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e50000000000000136 | 1003.994 | 0.165 | n/a | 0.000 | 0.000 | 1.833 | 1000.734 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 1.188 | 0.165 | 0.000 | 1.188 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e5000000000000011c | 1002.093 | 3.061 | n/a | 0.000 | 0.000 | 0.702 | 998.025 | 0.133 | n/a | 0.047 | 0.000 | n/a | n/a | 0.125 | 3.061 | 0.003 | 0.125 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e50000000000000114 | 1001.670 | 4.807 | n/a | 0.000 | 0.000 | 0.757 | 995.947 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.097 | 4.807 | 0.005 | 0.097 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e50000000000000125 | 994.449 | 2.749 | n/a | 0.000 | 0.000 | 0.954 | 990.476 | 0.131 | n/a | 0.080 | 0.000 | n/a | n/a | 0.059 | 2.749 | 0.003 | 0.059 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e5000000000000012a | 994.385 | 5.594 | n/a | 0.000 | 0.000 | 0.815 | 987.735 | 0.011 | n/a | 0.057 | 0.000 | n/a | n/a | 0.173 | 5.594 | 0.006 | 0.173 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e50000000000000140 | 958.453 | 2.664 | n/a | 0.000 | 0.000 | 0.522 | 954.982 | 0.158 | n/a | 0.057 | 0.000 | n/a | n/a | 0.070 | 2.664 | 0.003 | 0.070 | gw-r/thread-50/journal/page | none observed |
| e49870ac6945c8e50000000000000111 | 837.790 | 2.784 | n/a | 0.000 | 0.000 | 1.396 | 833.430 | 0.031 | n/a | 0.072 | 0.000 | n/a | n/a | 0.077 | 2.784 | 0.003 | 0.077 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e50000000000000126 | 759.435 | 7.784 | n/a | 0.000 | 0.000 | 0.425 | 747.120 | 3.880 | n/a | 0.036 | 0.000 | n/a | n/a | 0.189 | 7.784 | 0.010 | 0.189 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e5000000000000013c | 743.262 | 2.388 | n/a | 0.000 | 0.000 | 0.792 | 739.950 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.069 | 2.388 | 0.003 | 0.069 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e50000000000000147 | 737.446 | 5.047 | n/a | 0.000 | 0.000 | 0.823 | 731.418 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.091 | 5.047 | 0.007 | 0.091 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e5000000000000011d | 736.345 | 3.093 | n/a | 0.000 | 0.000 | 0.970 | 732.161 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.068 | 3.093 | 0.004 | 0.068 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e50000000000000131 | 694.092 | 5.028 | n/a | 0.000 | 0.000 | 0.967 | 687.832 | 0.126 | n/a | 0.072 | 0.000 | n/a | n/a | 0.067 | 5.028 | 0.007 | 0.067 | gw-r/thread-50/journal/page | none observed |
| e49870ac6945c8e50000000000000133 | 688.039 | 2.653 | n/a | 0.000 | 0.000 | 0.631 | 684.641 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.072 | 2.653 | 0.004 | 0.072 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e5000000000000010e | 680.719 | 6.541 | n/a | 0.938 | 0.000 | 0.873 | 672.033 | 0.005 | n/a | 0.090 | 0.000 | n/a | n/a | 0.238 | 7.479 | 0.011 | 0.238 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e5000000000000012c | 668.223 | 3.921 | n/a | 0.664 | 0.000 | 0.649 | 662.826 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.094 | 4.584 | 0.007 | 0.094 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e50000000000000124 | 655.518 | 3.063 | n/a | 0.946 | 0.000 | 0.655 | 650.690 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.108 | 4.008 | 0.006 | 0.108 | gw-r/thread-50/journal/page | none observed |
| e49870ac6945c8e50000000000000141 | 623.527 | 4.599 | n/a | 0.000 | 0.000 | 1.479 | 617.168 | 0.154 | n/a | 0.051 | 0.000 | n/a | n/a | 0.076 | 4.599 | 0.007 | 0.076 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e50000000000000138 | 573.083 | 13.397 | n/a | 0.900 | 0.000 | 0.615 | 557.875 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.237 | 14.297 | 0.025 | 0.237 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e50000000000000142 | 429.630 | 3.646 | n/a | 0.000 | 0.000 | 0.678 | 425.199 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.071 | 3.646 | 0.008 | 0.071 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 400.962 | n/a | n/a | n/a | 3.105 | n/a | 0.000 | 0.000 | 0.652 | 393.055 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.094 | 3.108 | 0.009 | 0.094 |
| p99 | 1003.362 | n/a | n/a | n/a | 8.106 | n/a | 2.093 | 0.000 | 4.326 | 1000.957 | 1.699 | n/a | 0.073 | 0.000 | n/a | n/a | 44.857 | 8.124 | 0.694 | 44.857 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e49870ac6945c8e5000000000000017e | 1003.362 | 2.263 | n/a | 0.000 | 0.000 | 0.513 | 1000.435 | 0.031 | n/a | 0.060 | 0.000 | n/a | n/a | 0.060 | 2.263 | 0.002 | 0.060 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e50000000000000185 | 1002.615 | 0.138 | n/a | 0.000 | 0.000 | 0.551 | 1000.747 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 1.121 | 0.138 | 0.000 | 1.121 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e50000000000000163 | 1002.476 | 0.109 | n/a | 0.000 | 0.000 | 0.455 | 1000.740 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 1.110 | 0.109 | 0.000 | 1.110 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e5000000000000016d | 1001.740 | 0.122 | n/a | 0.000 | 0.000 | 0.526 | 1000.957 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.054 | 0.122 | 0.000 | 0.054 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e50000000000000184 | 991.665 | 3.504 | n/a | 0.000 | 0.000 | 1.611 | 986.421 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.080 | 3.504 | 0.004 | 0.080 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e50000000000000173 | 967.124 | 3.108 | n/a | 0.000 | 0.000 | 0.698 | 963.190 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.067 | 3.108 | 0.003 | 0.067 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e50000000000000153 | 935.338 | 4.652 | n/a | 0.000 | 0.000 | 1.121 | 929.285 | 0.013 | n/a | 0.050 | 0.000 | n/a | n/a | 0.218 | 4.652 | 0.005 | 0.218 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e50000000000000159 | 833.041 | 4.772 | n/a | 0.000 | 0.000 | 1.314 | 826.788 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.114 | 4.772 | 0.006 | 0.114 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e50000000000000179 | 816.892 | 2.787 | n/a | 0.000 | 0.000 | 0.960 | 812.882 | 0.162 | n/a | 0.039 | 0.000 | n/a | n/a | 0.063 | 2.787 | 0.003 | 0.063 | gw-r/thread-48/journal/page | none observed |
| e49870ac6945c8e50000000000000154 | 723.960 | 2.523 | n/a | 0.000 | 0.000 | 0.869 | 718.735 | 1.699 | n/a | 0.044 | 0.000 | n/a | n/a | 0.089 | 2.523 | 0.003 | 0.089 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e50000000000000182 | 644.493 | 2.504 | n/a | 0.000 | 0.000 | 0.543 | 641.253 | 0.062 | n/a | 0.048 | 0.000 | n/a | n/a | 0.083 | 2.504 | 0.004 | 0.083 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e5000000000000016c | 633.996 | 2.396 | n/a | 0.000 | 0.000 | 0.416 | 631.063 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.082 | 2.396 | 0.004 | 0.082 | gw-r/thread-48/journal/page | none observed |
| e49870ac6945c8e5000000000000014e | 604.256 | 2.027 | n/a | 0.000 | 0.000 | 0.415 | 601.685 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.081 | 2.027 | 0.003 | 0.081 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e50000000000000176 | 594.926 | 5.372 | n/a | 0.000 | 0.000 | 0.614 | 588.717 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.178 | 5.372 | 0.009 | 0.178 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e50000000000000188 | 590.494 | 3.105 | n/a | 2.093 | 0.000 | 0.587 | 584.531 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.132 | 5.198 | 0.009 | 0.132 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e5000000000000017c | 582.105 | 2.448 | n/a | 0.000 | 0.000 | 0.652 | 578.807 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.142 | 2.448 | 0.004 | 0.142 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e50000000000000170 | 580.711 | 2.800 | n/a | 0.000 | 0.000 | 1.252 | 576.073 | 0.464 | n/a | 0.045 | 0.000 | n/a | n/a | 0.077 | 2.800 | 0.005 | 0.077 | gw-r/thread-48/journal/page | none observed |
| e49870ac6945c8e50000000000000165 | 542.278 | 7.386 | n/a | 0.000 | 0.000 | 0.866 | 533.281 | 0.538 | n/a | 0.047 | 0.000 | n/a | n/a | 0.159 | 7.386 | 0.014 | 0.159 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e50000000000000151 | 469.802 | 3.609 | n/a | 0.000 | 0.000 | 0.881 | 465.023 | 0.135 | n/a | 0.073 | 0.000 | n/a | n/a | 0.080 | 3.609 | 0.008 | 0.080 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e50000000000000166 | 450.972 | 2.950 | n/a | 0.000 | 0.000 | 0.769 | 446.718 | 0.426 | n/a | 0.038 | 0.000 | n/a | n/a | 0.071 | 2.950 | 0.007 | 0.071 | gw-r/thread-51/journal/page | none observed |

## P3 / L64 / internal (48 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 335.176 | n/a | n/a | n/a | 3.559 | n/a | 0.000 | 0.000 | 0.646 | 330.390 | 0.010 | n/a | 0.040 | 0.000 | n/a | n/a | 0.110 | 3.559 | 0.011 | 0.110 |
| p99 | 1004.435 | n/a | n/a | n/a | 13.523 | n/a | 0.000 | 0.000 | 2.292 | 997.420 | 0.905 | n/a | 0.099 | 0.000 | n/a | n/a | 30.507 | 13.523 | 0.786 | 30.507 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e49870ac6945c8e500000000000001c2 | 1004.435 | 5.823 | n/a | 0.000 | 0.000 | 0.874 | 997.420 | 0.021 | n/a | 0.052 | 0.000 | n/a | n/a | 0.244 | 5.823 | 0.006 | 0.244 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e500000000000001a5 | 1000.747 | 3.544 | n/a | 0.000 | 0.000 | 0.482 | 996.482 | 0.009 | n/a | 0.038 | 0.000 | n/a | n/a | 0.191 | 3.544 | 0.004 | 0.191 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e5000000000000018a | 999.894 | 3.317 | n/a | 0.000 | 0.000 | 1.034 | 995.265 | 0.155 | n/a | 0.040 | 0.000 | n/a | n/a | 0.083 | 3.317 | 0.003 | 0.083 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e500000000000001a6 | 998.391 | 3.042 | n/a | 0.000 | 0.000 | 0.600 | 994.484 | 0.115 | n/a | 0.042 | 0.000 | n/a | n/a | 0.110 | 3.042 | 0.003 | 0.110 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e50000000000000199 | 995.935 | 4.073 | n/a | 0.000 | 0.000 | 1.783 | 989.036 | 0.905 | n/a | 0.036 | 0.000 | n/a | n/a | 0.102 | 4.073 | 0.004 | 0.102 | gw-r/thread-50/journal/page | none observed |
| e49870ac6945c8e500000000000001c3 | 994.261 | 3.339 | n/a | 0.000 | 0.000 | 0.582 | 990.193 | 0.010 | n/a | 0.029 | 0.000 | n/a | n/a | 0.108 | 3.339 | 0.003 | 0.108 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e500000000000001a3 | 932.520 | 2.684 | n/a | 0.000 | 0.000 | 0.480 | 929.216 | 0.010 | n/a | 0.039 | 0.000 | n/a | n/a | 0.091 | 2.684 | 0.003 | 0.091 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e5000000000000019c | 801.514 | 5.187 | n/a | 0.000 | 0.000 | 0.778 | 795.393 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.110 | 5.187 | 0.006 | 0.110 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e500000000000001c1 | 790.649 | 3.427 | n/a | 0.000 | 0.000 | 0.575 | 786.386 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.195 | 3.427 | 0.004 | 0.195 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e500000000000001d3 | 741.589 | 1.812 | n/a | 0.000 | 0.000 | 0.498 | 739.141 | 0.013 | n/a | 0.031 | 0.000 | n/a | n/a | 0.094 | 1.812 | 0.002 | 0.094 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e500000000000001b4 | 667.957 | 2.479 | n/a | 0.000 | 0.000 | 0.392 | 664.968 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.082 | 2.479 | 0.004 | 0.082 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e5000000000000019f | 635.214 | 3.665 | n/a | 0.000 | 0.000 | 0.630 | 630.790 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.086 | 3.665 | 0.006 | 0.086 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e500000000000001c4 | 624.126 | 6.134 | n/a | 0.000 | 0.000 | 0.616 | 616.992 | 0.113 | n/a | 0.045 | 0.000 | n/a | n/a | 0.227 | 6.134 | 0.010 | 0.227 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e500000000000001b7 | 591.760 | 3.921 | n/a | 0.000 | 0.000 | 0.695 | 586.815 | 0.110 | n/a | 0.039 | 0.000 | n/a | n/a | 0.180 | 3.921 | 0.007 | 0.180 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e500000000000001a7 | 582.251 | 6.266 | n/a | 0.000 | 0.000 | 2.292 | 573.289 | 0.151 | n/a | 0.068 | 0.000 | n/a | n/a | 0.184 | 6.266 | 0.011 | 0.184 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e500000000000001cc | 571.430 | 4.654 | n/a | 0.000 | 0.000 | 0.697 | 565.860 | 0.018 | n/a | 0.038 | 0.000 | n/a | n/a | 0.164 | 4.654 | 0.008 | 0.164 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e500000000000001ae | 556.769 | 5.320 | n/a | 0.000 | 0.000 | 0.504 | 550.504 | 0.252 | n/a | 0.049 | 0.000 | n/a | n/a | 0.140 | 5.320 | 0.010 | 0.140 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e500000000000001cf | 555.045 | 3.170 | n/a | 0.000 | 0.000 | 1.280 | 550.427 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.117 | 3.170 | 0.006 | 0.117 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e50000000000000197 | 481.444 | 2.404 | n/a | 0.000 | 0.000 | 0.393 | 478.498 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.105 | 2.404 | 0.005 | 0.105 | gw-r/thread-48/journal/page | none observed |
| e49870ac6945c8e500000000000001b6 | 426.958 | 13.523 | n/a | 0.000 | 0.000 | 0.658 | 412.538 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.191 | 13.523 | 0.032 | 0.191 | gw-r/thread-44/journal/page | none observed |

## P3 / L256 / internal (45 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 301.698 | n/a | n/a | n/a | 2.696 | n/a | 0.000 | 0.000 | 0.646 | 297.372 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.098 | 2.696 | 0.010 | 0.098 |
| p99 | 1005.577 | n/a | n/a | n/a | 8.526 | n/a | 0.000 | 0.000 | 3.387 | 1000.744 | 1.080 | n/a | 0.121 | 0.000 | n/a | n/a | 39.366 | 8.526 | 0.624 | 39.366 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e49870ac6945c8e500000000000001e8 | 1005.577 | 5.084 | n/a | 0.000 | 0.000 | 0.646 | 999.524 | 0.132 | n/a | 0.036 | 0.000 | n/a | n/a | 0.155 | 5.084 | 0.005 | 0.155 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e50000000000000216 | 1002.921 | 0.187 | n/a | 0.000 | 0.000 | 0.720 | 1000.744 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 1.205 | 0.187 | 0.000 | 1.205 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e50000000000000210 | 1002.620 | 0.149 | n/a | 0.000 | 0.000 | 0.573 | 1000.702 | 0.033 | n/a | 0.071 | 0.000 | n/a | n/a | 1.092 | 0.149 | 0.000 | 1.092 | gw-r/thread-48/journal/page | none observed |
| e49870ac6945c8e500000000000001fc | 1002.290 | 0.122 | n/a | 0.000 | 0.000 | 0.406 | 1000.597 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 1.111 | 0.122 | 0.000 | 1.111 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e50000000000000212 | 997.553 | 8.052 | n/a | 0.000 | 0.000 | 0.556 | 988.779 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.104 | 8.052 | 0.008 | 0.104 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e50000000000000215 | 965.787 | 3.014 | n/a | 0.000 | 0.000 | 0.444 | 962.233 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.066 | 3.014 | 0.003 | 0.066 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e50000000000000218 | 958.472 | 2.611 | n/a | 0.000 | 0.000 | 0.677 | 954.988 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.126 | 2.611 | 0.003 | 0.126 | gw-r/thread-50/journal/page | none observed |
| e49870ac6945c8e50000000000000205 | 946.802 | 3.919 | n/a | 0.000 | 0.000 | 0.509 | 942.261 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.076 | 3.919 | 0.004 | 0.076 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e500000000000001f5 | 831.850 | 2.696 | n/a | 0.000 | 0.000 | 0.815 | 828.199 | 0.010 | n/a | 0.037 | 0.000 | n/a | n/a | 0.092 | 2.696 | 0.003 | 0.092 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e500000000000001fe | 784.842 | 2.132 | n/a | 0.000 | 0.000 | 0.687 | 781.614 | 0.261 | n/a | 0.061 | 0.000 | n/a | n/a | 0.087 | 2.132 | 0.003 | 0.087 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e50000000000000201 | 733.113 | 2.329 | n/a | 0.000 | 0.000 | 0.565 | 730.078 | 0.012 | n/a | 0.061 | 0.000 | n/a | n/a | 0.068 | 2.329 | 0.003 | 0.068 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e500000000000001ee | 726.866 | 4.738 | n/a | 0.000 | 0.000 | 0.684 | 721.252 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.164 | 4.738 | 0.007 | 0.164 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e500000000000001f2 | 706.315 | 2.365 | n/a | 0.000 | 0.000 | 0.915 | 702.729 | 0.165 | n/a | 0.065 | 0.000 | n/a | n/a | 0.076 | 2.365 | 0.003 | 0.076 | gw-r/thread-48/journal/page | none observed |
| e49870ac6945c8e500000000000001db | 702.736 | 3.031 | n/a | 0.000 | 0.000 | 1.774 | 697.784 | 0.011 | n/a | 0.067 | 0.000 | n/a | n/a | 0.068 | 3.031 | 0.004 | 0.068 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e500000000000001e6 | 677.230 | 2.337 | n/a | 0.000 | 0.000 | 0.411 | 674.343 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.098 | 2.337 | 0.003 | 0.098 | gw-r/thread-50/journal/page | none observed |
| e49870ac6945c8e500000000000001d8 | 585.830 | 4.129 | n/a | 0.000 | 0.000 | 0.716 | 580.672 | 0.005 | n/a | 0.121 | 0.000 | n/a | n/a | 0.187 | 4.129 | 0.007 | 0.187 | gw-r/thread-50/journal/page | none observed |
| e49870ac6945c8e500000000000001f7 | 516.717 | 2.289 | n/a | 0.000 | 0.000 | 2.439 | 511.858 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.074 | 2.289 | 0.004 | 0.074 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e5000000000000020e | 516.688 | 5.257 | n/a | 0.000 | 0.000 | 0.621 | 510.434 | 0.140 | n/a | 0.044 | 0.000 | n/a | n/a | 0.191 | 5.257 | 0.010 | 0.191 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e500000000000001ec | 485.922 | 4.269 | n/a | 0.000 | 0.000 | 0.709 | 480.726 | 0.010 | n/a | 0.040 | 0.000 | n/a | n/a | 0.169 | 4.269 | 0.009 | 0.169 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e500000000000001df | 451.693 | 4.981 | n/a | 0.000 | 0.000 | 0.903 | 445.637 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.086 | 4.981 | 0.011 | 0.086 | gw-r/thread-44/journal/page | none observed |

## P3 / L1024 / internal (773 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.871 | n/a | n/a | n/a | 3.382 | n/a | 0.000 | 0.000 | 0.263 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.196 | 3.382 | 0.279 | 7.196 |
| p99 | 148.316 | n/a | n/a | n/a | 16.242 | n/a | 1.079 | 0.000 | 0.950 | 142.154 | 0.129 | n/a | 0.063 | 0.000 | n/a | n/a | 48.294 | 16.673 | 0.829 | 48.294 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e49870ac6945c8e50000000000000224 | 1003.070 | 0.126 | n/a | 0.000 | 0.000 | 0.794 | 1000.958 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 1.109 | 0.126 | 0.000 | 1.109 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e50000000000000219 | 859.272 | 2.166 | n/a | 0.000 | 0.000 | 0.573 | 856.408 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.080 | 2.166 | 0.003 | 0.080 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e50000000000000226 | 837.917 | 4.262 | n/a | 0.000 | 0.000 | 0.611 | 832.853 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.118 | 4.262 | 0.005 | 0.118 | gw-r/thread-48/journal/page | none observed |
| e49870ac6945c8e50000000000000221 | 741.878 | 2.144 | n/a | 0.000 | 0.000 | 0.418 | 739.199 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.075 | 2.144 | 0.003 | 0.075 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e5000000000000021c | 697.325 | 3.339 | n/a | 0.000 | 0.000 | 0.789 | 693.068 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.076 | 3.339 | 0.005 | 0.076 | gw-r/thread-50/journal/page | none observed |
| e49870ac6945c8e50000000000000222 | 259.104 | 2.631 | n/a | 0.000 | 0.000 | 0.539 | 255.452 | 0.358 | n/a | 0.044 | 0.000 | n/a | n/a | 0.080 | 2.631 | 0.010 | 0.080 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e5000000000000021d | 249.898 | 3.360 | n/a | 0.000 | 0.000 | 0.548 | 245.836 | 0.016 | n/a | 0.053 | 0.000 | n/a | n/a | 0.085 | 3.360 | 0.013 | 0.085 | gw-r/thread-50/journal/page | none observed |
| e49870ac6945c8e5000000000000021a | 148.316 | 5.279 | n/a | 0.000 | 0.000 | 0.608 | 142.154 | 0.011 | n/a | 0.052 | 0.000 | n/a | n/a | 0.212 | 5.279 | 0.036 | 0.212 | gw-r/thread-50/journal/page | none observed |
| e49870ac6945c8e500000000000004f2 | 110.629 | 5.790 | n/a | 1.079 | 0.000 | 0.665 | 102.802 | 0.115 | n/a | 0.061 | 0.000 | n/a | n/a | 0.118 | 6.869 | 0.062 | 0.118 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e500000000000007f8 | 96.638 | 3.671 | n/a | 0.000 | 0.000 | 0.622 | 92.210 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.120 | 3.671 | 0.038 | 0.120 | gw-r/thread-48/journal/page | none observed |
| e49870ac6945c8e500000000000007ad | 91.543 | 4.076 | n/a | 0.000 | 0.000 | 0.385 | 86.569 | 0.344 | n/a | 0.018 | 0.000 | n/a | n/a | 0.152 | 4.076 | 0.045 | 0.152 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e500000000000002f8 | 87.347 | 5.432 | n/a | 0.000 | 0.000 | 0.504 | 81.306 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.074 | 5.432 | 0.062 | 0.074 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e50000000000000672 | 86.823 | 10.389 | n/a | 0.000 | 0.000 | 0.734 | 75.413 | 0.004 | n/a | 0.130 | 0.000 | n/a | n/a | 0.153 | 10.389 | 0.120 | 0.153 | gw-r/thread-48/journal/page | none observed |
| e49870ac6945c8e500000000000005f7 | 86.254 | 3.792 | n/a | 0.000 | 0.000 | 0.776 | 81.399 | 0.131 | n/a | 0.075 | 0.000 | n/a | n/a | 0.082 | 3.792 | 0.044 | 0.082 | gw-r/thread-48/journal/page | none observed |
| e49870ac6945c8e500000000000005d8 | 82.940 | 5.494 | n/a | 0.000 | 0.000 | 0.421 | 76.823 | 0.003 | n/a | 0.043 | 0.000 | n/a | n/a | 0.156 | 5.494 | 0.066 | 0.156 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e50000000000000641 | 82.356 | 3.769 | n/a | 0.000 | 0.000 | 0.651 | 77.803 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.094 | 3.769 | 0.046 | 0.094 | gw-r/thread-50/journal/page | none observed |
| e49870ac6945c8e50000000000000768 | 81.806 | 5.502 | n/a | 0.000 | 0.000 | 0.606 | 75.455 | 0.003 | n/a | 0.011 | 0.000 | n/a | n/a | 0.229 | 5.502 | 0.067 | 0.229 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e5000000000000049d | 81.349 | 6.843 | n/a | 0.000 | 0.000 | 0.521 | 73.775 | 0.002 | n/a | 0.034 | 0.000 | n/a | n/a | 0.175 | 6.843 | 0.084 | 0.175 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e50000000000000476 | 81.248 | 5.960 | n/a | 0.000 | 0.000 | 0.438 | 74.578 | 0.129 | n/a | 0.024 | 0.000 | n/a | n/a | 0.119 | 5.960 | 0.073 | 0.119 | gw-r/thread-48/journal/page | none observed |
| e49870ac6945c8e500000000000004fd | 78.934 | 3.309 | n/a | 0.000 | 0.000 | 0.681 | 74.798 | 0.003 | n/a | 0.045 | 0.000 | n/a | n/a | 0.098 | 3.309 | 0.042 | 0.098 | gw-r/thread-51/journal/page | none observed |

## P3 / tail / internal (2317 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.293 | n/a | n/a | n/a | 4.103 | n/a | 0.000 | 0.000 | 0.241 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.296 | 4.113 | 0.346 | 6.296 |
| p99 | 330.268 | n/a | n/a | n/a | 16.070 | n/a | 1.641 | 0.000 | 0.860 | 327.182 | 0.109 | n/a | 0.032 | 0.000 | n/a | n/a | 46.852 | 16.197 | 0.846 | 46.852 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e49870ac6945c8e50000000000001ac6 | 1005.021 | 3.525 | n/a | 0.000 | 0.000 | 0.468 | 1000.894 | 0.009 | n/a | 0.028 | 0.000 | n/a | n/a | 0.097 | 3.525 | 0.004 | 0.097 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e50000000000001abc | 1002.528 | 0.159 | n/a | 0.000 | 0.000 | 0.484 | 1000.631 | 0.015 | n/a | 0.052 | 0.000 | n/a | n/a | 1.186 | 0.159 | 0.000 | 1.186 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e50000000000001b09 | 1002.331 | 0.100 | n/a | 0.000 | 0.000 | 0.368 | 1000.706 | 0.013 | n/a | 0.050 | 0.000 | n/a | n/a | 1.095 | 0.100 | 0.000 | 1.095 | gw-r/thread-50/journal/page | none observed |
| e49870ac6945c8e50000000000001adf | 1002.128 | 0.097 | n/a | 0.000 | 0.000 | 0.346 | 1000.465 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 1.189 | 0.097 | 0.000 | 1.189 | gw-r/thread-66/journal/page | none observed |
| e49870ac6945c8e50000000000001b01 | 994.609 | 2.439 | n/a | 0.000 | 0.000 | 0.352 | 991.619 | 0.093 | n/a | 0.031 | 0.000 | n/a | n/a | 0.074 | 2.439 | 0.002 | 0.074 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e50000000000001b05 | 990.004 | 2.815 | n/a | 0.000 | 0.000 | 0.414 | 986.669 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.075 | 2.815 | 0.003 | 0.075 | gw-r/thread-48/journal/page | none observed |
| e49870ac6945c8e50000000000001abb | 986.325 | 4.616 | n/a | 0.000 | 0.000 | 0.807 | 980.589 | 0.124 | n/a | 0.043 | 0.000 | n/a | n/a | 0.145 | 4.616 | 0.005 | 0.145 | gw-r/thread-66/journal/page | none observed |
| e49870ac6945c8e50000000000001ac1 | 887.445 | 4.926 | n/a | 0.000 | 0.000 | 0.489 | 881.850 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.151 | 4.926 | 0.006 | 0.151 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e50000000000001ad0 | 885.637 | 9.558 | n/a | 0.000 | 0.000 | 0.457 | 875.231 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.367 | 9.558 | 0.011 | 0.367 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e50000000000001ae2 | 835.838 | 6.576 | n/a | 0.000 | 0.000 | 0.551 | 828.538 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.122 | 6.576 | 0.008 | 0.122 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e50000000000001abe | 825.225 | 18.548 | n/a | 2.502 | 0.000 | 0.437 | 803.135 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.563 | 21.050 | 0.026 | 0.563 | gw-r/thread-44/journal/page | none observed |
| e49870ac6945c8e50000000000001b02 | 720.108 | 4.685 | n/a | 0.000 | 0.000 | 2.959 | 712.303 | 0.013 | n/a | 0.040 | 0.000 | n/a | n/a | 0.109 | 4.685 | 0.007 | 0.109 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e50000000000001adb | 708.279 | 4.210 | n/a | 0.000 | 0.000 | 0.535 | 703.322 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.182 | 4.210 | 0.006 | 0.182 | gw-r/thread-50/journal/page | none observed |
| e49870ac6945c8e50000000000001ad6 | 670.886 | 2.579 | n/a | 0.000 | 0.000 | 0.515 | 667.645 | 0.005 | n/a | 0.017 | 0.000 | n/a | n/a | 0.125 | 2.579 | 0.004 | 0.125 | gw-r/thread-47/journal/page | none observed |
| e49870ac6945c8e50000000000001afa | 577.284 | 2.458 | n/a | 0.000 | 0.000 | 0.296 | 574.422 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.077 | 2.458 | 0.004 | 0.077 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e50000000000001ac7 | 540.153 | 2.544 | n/a | 0.000 | 0.000 | 0.471 | 536.783 | 0.121 | n/a | 0.032 | 0.000 | n/a | n/a | 0.202 | 2.544 | 0.005 | 0.202 | gw-r/thread-66/journal/page | none observed |
| e49870ac6945c8e50000000000001afc | 530.917 | 3.080 | n/a | 0.000 | 0.000 | 0.526 | 527.006 | 0.156 | n/a | 0.040 | 0.000 | n/a | n/a | 0.111 | 3.080 | 0.006 | 0.111 | gw-r/thread-49/journal/page | none observed |
| e49870ac6945c8e50000000000001ae4 | 518.505 | 11.920 | n/a | 1.968 | 0.000 | 0.498 | 503.697 | 0.127 | n/a | 0.035 | 0.000 | n/a | n/a | 0.260 | 13.889 | 0.027 | 0.260 | gw-r/thread-46/journal/page | none observed |
| e49870ac6945c8e50000000000001af0 | 505.722 | 3.381 | n/a | 0.000 | 0.000 | 0.372 | 501.853 | 0.018 | n/a | 0.025 | 0.000 | n/a | n/a | 0.072 | 3.381 | 0.007 | 0.072 | gw-r/thread-51/journal/page | none observed |
| e49870ac6945c8e50000000000001afd | 455.320 | 3.645 | n/a | 0.000 | 0.000 | 0.484 | 450.875 | 0.113 | n/a | 0.053 | 0.000 | n/a | n/a | 0.151 | 3.645 | 0.008 | 0.151 | gw-r/thread-51/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.025 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 200.939 | 0.013 | n/a | 0.119 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 204.453 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.167 | 201.621 | 3.886 | n/a | 0.219 | 0.000 | n/a | n/a | 0.421 | 0.000 | 0.000 | 0.421 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b006484a62c082b0000000000000033 | 204.453 | 0.000 | n/a | 0.000 | 0.000 | 3.167 | 200.969 | 0.020 | n/a | 0.164 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b000000000000003f | 203.229 | 0.000 | n/a | 0.000 | 0.000 | 1.604 | 201.289 | 0.014 | n/a | 0.193 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 7b006484a62c082b000000000000001a | 203.175 | 0.000 | n/a | 0.000 | 0.000 | 1.171 | 201.621 | 0.033 | n/a | 0.213 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b000000000000004a | 203.024 | 0.000 | n/a | 0.000 | 0.000 | 1.473 | 201.151 | 0.053 | n/a | 0.099 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b0000000000000009 | 202.983 | 0.000 | n/a | 0.000 | 0.000 | 1.485 | 200.944 | 0.016 | n/a | 0.117 | 0.000 | n/a | n/a | 0.421 | 0.000 | 0.000 | 0.421 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b0000000000000030 | 202.905 | 0.000 | n/a | 0.000 | 0.000 | 1.260 | 201.256 | 0.011 | n/a | 0.131 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b000000000000000b | 202.879 | 0.000 | n/a | 0.000 | 0.000 | 1.029 | 201.523 | 0.013 | n/a | 0.186 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b0000000000000035 | 202.773 | 0.000 | n/a | 0.000 | 0.000 | 1.331 | 201.169 | 0.012 | n/a | 0.123 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b0000000000000056 | 202.737 | 0.000 | n/a | 0.000 | 0.000 | 1.143 | 201.287 | 0.012 | n/a | 0.131 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b0000000000000022 | 202.695 | 0.000 | n/a | 0.000 | 0.000 | 1.290 | 201.133 | 0.012 | n/a | 0.137 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b0000000000000020 | 202.684 | 0.000 | n/a | 0.000 | 0.000 | 1.070 | 201.262 | 0.012 | n/a | 0.150 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b0000000000000019 | 202.598 | 0.000 | n/a | 0.000 | 0.000 | 1.023 | 201.257 | 0.021 | n/a | 0.171 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b0000000000000034 | 202.577 | 0.000 | n/a | 0.000 | 0.000 | 1.133 | 201.108 | 0.012 | n/a | 0.184 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b0000000000000008 | 202.572 | 0.000 | n/a | 0.000 | 0.000 | 1.075 | 201.190 | 0.018 | n/a | 0.163 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b000000000000002f | 202.508 | 0.000 | n/a | 0.000 | 0.000 | 0.892 | 201.297 | 0.011 | n/a | 0.127 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-46/journal/page | none observed |
| 7b006484a62c082b0000000000000018 | 202.467 | 0.000 | n/a | 0.000 | 0.000 | 0.850 | 201.228 | 0.021 | n/a | 0.187 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b0000000000000054 | 202.451 | 0.000 | n/a | 0.000 | 0.000 | 0.965 | 201.196 | 0.041 | n/a | 0.132 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| 7b006484a62c082b0000000000000055 | 202.444 | 0.000 | n/a | 0.000 | 0.000 | 1.010 | 200.956 | 0.012 | n/a | 0.111 | 0.000 | n/a | n/a | 0.354 | 0.000 | 0.000 | 0.354 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000046 | 202.401 | 0.000 | n/a | 0.000 | 0.000 | 1.156 | 201.003 | 0.011 | n/a | 0.102 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b000000000000002e | 202.372 | 0.000 | n/a | 0.000 | 0.000 | 0.808 | 201.264 | 0.027 | n/a | 0.174 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-49/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.944 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 200.875 | 0.016 | n/a | 0.099 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 |
| p99 | 206.247 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.923 | 205.089 | 26.938 | n/a | 0.203 | 0.000 | n/a | n/a | 0.264 | 0.000 | 0.000 | 0.264 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b006484a62c082b0000000000000072 | 206.247 | 0.000 | n/a | 0.000 | 0.000 | 0.900 | 205.089 | 0.016 | n/a | 0.122 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b00000000000000a0 | 205.992 | 0.000 | n/a | 0.000 | 0.000 | 1.102 | 204.560 | 0.028 | n/a | 0.146 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b000000000000008e | 202.948 | 0.000 | n/a | 0.000 | 0.000 | 1.032 | 201.577 | 0.016 | n/a | 0.117 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b00000000000000a6 | 202.781 | 0.000 | n/a | 0.000 | 0.000 | 1.191 | 201.193 | 0.056 | n/a | 0.135 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b00000000000000b5 | 202.781 | 0.000 | n/a | 0.000 | 0.000 | 1.244 | 201.158 | 0.011 | n/a | 0.159 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b000000000000008f | 202.669 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 201.516 | 0.039 | n/a | 0.180 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b00000000000000ba | 202.649 | 0.000 | n/a | 0.000 | 0.000 | 1.041 | 201.318 | 0.019 | n/a | 0.140 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b00000000000000a8 | 202.609 | 0.000 | n/a | 0.000 | 0.000 | 1.159 | 201.124 | 0.011 | n/a | 0.143 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b000000000000007e | 202.546 | 0.000 | n/a | 0.000 | 0.000 | 1.103 | 201.052 | 0.020 | n/a | 0.148 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b000000000000009b | 202.529 | 0.000 | n/a | 0.000 | 0.000 | 0.651 | 201.531 | 0.025 | n/a | 0.201 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b00000000000000a5 | 202.494 | 0.000 | n/a | 0.000 | 0.000 | 1.184 | 200.968 | 0.049 | n/a | 0.113 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b0000000000000079 | 202.471 | 0.000 | n/a | 0.000 | 0.000 | 1.105 | 201.071 | 0.016 | n/a | 0.116 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000073 | 202.439 | 0.000 | n/a | 0.000 | 0.000 | 1.021 | 201.136 | 0.019 | n/a | 0.125 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b000000000000006d | 202.438 | 0.000 | n/a | 0.000 | 0.000 | 1.180 | 200.948 | 0.013 | n/a | 0.115 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b000000000000006b | 202.421 | 0.000 | n/a | 0.000 | 0.000 | 0.885 | 201.182 | 0.038 | n/a | 0.164 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b000000000000005d | 202.400 | 0.000 | n/a | 0.000 | 0.000 | 0.849 | 201.240 | 0.019 | n/a | 0.147 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b0000000000000059 | 202.396 | 0.000 | n/a | 0.000 | 0.000 | 1.182 | 200.875 | 0.029 | n/a | 0.152 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b000000000000006a | 202.393 | 0.000 | n/a | 0.000 | 0.000 | 1.224 | 200.854 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b000000000000005b | 202.371 | 0.000 | n/a | 0.000 | 0.000 | 0.750 | 201.305 | 0.021 | n/a | 0.183 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-46/journal/page | none observed |
| 7b006484a62c082b0000000000000062 | 202.356 | 0.000 | n/a | 0.000 | 0.000 | 0.856 | 201.188 | 0.019 | n/a | 0.113 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.843 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.737 | 200.857 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 205.147 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.853 | 203.670 | 2.126 | n/a | 0.226 | 0.000 | n/a | n/a | 0.922 | 0.000 | 0.000 | 0.922 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b006484a62c082b00000000000000d0 | 205.147 | 0.000 | n/a | 0.000 | 0.000 | 1.231 | 203.670 | 0.024 | n/a | 0.083 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b000000000000011c | 204.191 | 0.000 | n/a | 0.000 | 0.000 | 1.853 | 202.168 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b000000000000011d | 203.549 | 0.000 | n/a | 0.000 | 0.000 | 1.070 | 202.022 | 0.012 | n/a | 0.226 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b00000000000000c5 | 203.066 | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 202.168 | 0.011 | n/a | 0.072 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b00000000000000bf | 202.821 | 0.000 | n/a | 0.000 | 0.000 | 1.226 | 201.281 | 0.011 | n/a | 0.161 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b00000000000000e1 | 202.756 | 0.000 | n/a | 0.000 | 0.000 | 1.273 | 201.215 | 0.008 | n/a | 0.115 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b00000000000000e5 | 202.749 | 0.000 | n/a | 0.000 | 0.000 | 0.867 | 201.609 | 0.012 | n/a | 0.095 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b00000000000000f8 | 202.728 | 0.000 | n/a | 0.000 | 0.000 | 0.924 | 201.572 | 0.007 | n/a | 0.100 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b00000000000000ce | 202.685 | 0.000 | n/a | 0.000 | 0.000 | 0.905 | 201.541 | 0.011 | n/a | 0.121 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b0000000000000111 | 202.631 | 0.000 | n/a | 0.000 | 0.000 | 0.819 | 201.567 | 0.013 | n/a | 0.104 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b0000000000000120 | 202.611 | 0.000 | n/a | 0.000 | 0.000 | 0.952 | 201.339 | 0.015 | n/a | 0.108 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-46/journal/page | none observed |
| 7b006484a62c082b00000000000000be | 202.564 | 0.000 | n/a | 0.000 | 0.000 | 0.857 | 201.393 | 0.028 | n/a | 0.151 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b00000000000000d8 | 202.521 | 0.000 | n/a | 0.000 | 0.000 | 1.287 | 200.893 | 0.008 | n/a | 0.074 | 0.000 | n/a | n/a | 0.259 | 0.000 | 0.000 | 0.259 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b00000000000000c2 | 202.409 | 0.000 | n/a | 0.000 | 0.000 | 0.715 | 201.448 | 0.011 | n/a | 0.117 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b0000000000000125 | 202.359 | 0.000 | n/a | 0.000 | 0.000 | 0.790 | 201.305 | 0.011 | n/a | 0.129 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b000000000000010a | 202.300 | 0.000 | n/a | 0.000 | 0.000 | 1.008 | 201.021 | 0.008 | n/a | 0.086 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b000000000000011f | 202.255 | 0.000 | n/a | 0.000 | 0.000 | 0.713 | 201.289 | 0.019 | n/a | 0.097 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b00000000000000e8 | 202.228 | 0.000 | n/a | 0.000 | 0.000 | 0.742 | 201.227 | 0.022 | n/a | 0.109 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b00000000000000cb | 202.195 | 0.000 | n/a | 0.000 | 0.000 | 0.690 | 201.272 | 0.046 | n/a | 0.098 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b00000000000000f9 | 202.168 | 0.000 | n/a | 0.000 | 0.000 | 0.850 | 201.057 | 0.007 | n/a | 0.084 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.648 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.726 | 200.773 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 |
| p99 | 206.223 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.155 | 202.164 | 2.572 | n/a | 0.134 | 0.000 | n/a | n/a | 50.330 | 0.000 | 0.000 | 50.330 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b006484a62c082b0000000000000150 | 206.223 | 0.000 | n/a | 0.000 | 0.000 | 5.155 | 200.779 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b0000000000000128 | 204.872 | 0.000 | n/a | 0.000 | 0.000 | 3.496 | 201.134 | 0.011 | n/a | 0.109 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b0000000000000147 | 203.672 | 0.000 | n/a | 0.000 | 0.000 | 1.772 | 201.517 | 0.015 | n/a | 0.134 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b000000000000014e | 202.832 | 0.000 | n/a | 0.000 | 0.000 | 1.386 | 201.100 | 0.008 | n/a | 0.087 | 0.000 | n/a | n/a | 0.251 | 0.000 | 0.000 | 0.251 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b000000000000012f | 202.802 | 0.000 | n/a | 0.000 | 0.000 | 1.096 | 201.481 | 0.010 | n/a | 0.097 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b000000000000013a | 202.741 | 0.000 | n/a | 0.000 | 0.000 | 0.421 | 202.164 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000183 | 202.540 | 0.000 | n/a | 0.000 | 0.000 | 1.158 | 201.090 | 0.007 | n/a | 0.077 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b000000000000013c | 202.395 | 0.000 | n/a | 0.000 | 0.000 | 0.926 | 201.158 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b000000000000016c | 202.243 | 0.000 | n/a | 0.000 | 0.000 | 0.986 | 200.996 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b000000000000015f | 202.228 | 0.000 | n/a | 0.000 | 0.000 | 0.948 | 201.019 | 0.005 | n/a | 0.066 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-46/journal/page | none observed |
| 7b006484a62c082b0000000000000165 | 202.225 | 0.000 | n/a | 0.000 | 0.000 | 1.050 | 200.893 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b0000000000000137 | 202.214 | 0.000 | n/a | 0.000 | 0.000 | 0.746 | 201.245 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b000000000000016a | 202.192 | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 201.192 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000155 | 202.182 | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 201.115 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b0000000000000143 | 202.052 | 0.000 | n/a | 0.000 | 0.000 | 0.836 | 200.962 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b000000000000017c | 202.010 | 0.000 | n/a | 0.000 | 0.000 | 0.874 | 200.872 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-46/journal/page | none observed |
| 7b006484a62c082b0000000000000135 | 201.998 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 201.007 | 0.008 | n/a | 0.081 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b000000000000014f | 201.989 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 201.098 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b0000000000000153 | 201.982 | 0.000 | n/a | 0.000 | 0.000 | 0.868 | 200.801 | 0.022 | n/a | 0.072 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b000000000000015b | 201.950 | 0.000 | n/a | 0.000 | 0.000 | 0.573 | 201.124 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-47/journal/page | none observed |

## P3 / L64 / read (107 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.558 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.690 | 200.746 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 202.466 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.206 | 201.294 | 3.930 | n/a | 0.157 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b006484a62c082b00000000000001cb | 202.476 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 201.248 | 0.018 | n/a | 0.068 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b00000000000001af | 202.466 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 201.298 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b0000000000000192 | 202.402 | 0.000 | n/a | 0.000 | 0.000 | 0.933 | 201.157 | 0.017 | n/a | 0.077 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b00000000000001c0 | 202.335 | 0.000 | n/a | 0.000 | 0.000 | 0.807 | 201.222 | 0.016 | n/a | 0.157 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b00000000000001ab | 202.319 | 0.000 | n/a | 0.000 | 0.000 | 0.987 | 200.996 | 0.021 | n/a | 0.101 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b00000000000001a4 | 202.312 | 0.000 | n/a | 0.000 | 0.000 | 0.779 | 201.294 | 0.011 | n/a | 0.115 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b00000000000001a5 | 202.297 | 0.000 | n/a | 0.000 | 0.000 | 0.809 | 201.260 | 0.010 | n/a | 0.095 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b00000000000001c8 | 202.237 | 0.000 | n/a | 0.000 | 0.000 | 0.961 | 201.047 | 0.006 | n/a | 0.086 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-46/journal/page | none observed |
| 7b006484a62c082b00000000000001ca | 202.147 | 0.000 | n/a | 0.000 | 0.000 | 0.929 | 200.940 | 0.011 | n/a | 0.070 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-46/journal/page | none observed |
| 7b006484a62c082b0000000000000191 | 202.090 | 0.000 | n/a | 0.000 | 0.000 | 0.811 | 201.021 | 0.012 | n/a | 0.059 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b00000000000001c4 | 202.065 | 0.000 | n/a | 0.000 | 0.000 | 0.950 | 200.824 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b00000000000001bc | 202.062 | 0.000 | n/a | 0.000 | 0.000 | 0.934 | 200.878 | 0.013 | n/a | 0.065 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b0000000000000198 | 202.053 | 0.000 | n/a | 0.000 | 0.000 | 0.833 | 200.940 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b0000000000000202 | 202.050 | 0.000 | n/a | 0.000 | 0.000 | 0.831 | 200.960 | 0.008 | n/a | 0.087 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b00000000000001e6 | 202.014 | 0.000 | n/a | 0.000 | 0.000 | 0.872 | 200.907 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b00000000000001cd | 202.013 | 0.000 | n/a | 0.000 | 0.000 | 0.514 | 183.913 | 0.011 | n/a | 17.465 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b00000000000001c1 | 202.009 | 0.000 | n/a | 0.000 | 0.000 | 0.534 | 201.238 | 0.019 | n/a | 0.101 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000190 | 202.008 | 0.000 | n/a | 0.000 | 0.000 | 0.877 | 200.891 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b00000000000001c3 | 202.003 | 0.000 | n/a | 0.000 | 0.000 | 1.119 | 200.708 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b00000000000001a6 | 201.999 | 0.000 | n/a | 0.000 | 0.000 | 0.690 | 201.053 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-49/journal/page | none observed |

## P3 / L256 / read (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.587 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 200.769 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 |
| p99 | 202.529 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.296 | 201.336 | 0.552 | n/a | 0.111 | 0.000 | n/a | n/a | 0.318 | 0.000 | 0.000 | 0.318 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b006484a62c082b0000000000000214 | 204.290 | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 203.338 | 0.018 | n/a | 0.078 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b000000000000023f | 202.529 | 0.000 | n/a | 0.000 | 0.000 | 1.296 | 200.927 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000205 | 202.425 | 0.000 | n/a | 0.000 | 0.000 | 1.187 | 201.000 | 0.015 | n/a | 0.103 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b000000000000023a | 202.234 | 0.000 | n/a | 0.000 | 0.000 | 0.930 | 201.086 | 0.009 | n/a | 0.079 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-46/journal/page | none observed |
| 7b006484a62c082b000000000000021e | 202.212 | 0.000 | n/a | 0.000 | 0.000 | 0.707 | 201.238 | 0.017 | n/a | 0.102 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000236 | 202.196 | 0.000 | n/a | 0.000 | 0.000 | 0.994 | 200.949 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b000000000000025e | 202.185 | 0.000 | n/a | 0.000 | 0.000 | 0.898 | 201.068 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b000000000000026a | 202.171 | 0.000 | n/a | 0.000 | 0.000 | 0.906 | 200.976 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b000000000000020c | 202.167 | 0.000 | n/a | 0.000 | 0.000 | 0.684 | 201.223 | 0.013 | n/a | 0.099 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b000000000000025d | 202.156 | 0.000 | n/a | 0.000 | 0.000 | 1.320 | 200.621 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000206 | 202.155 | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 201.208 | 0.016 | n/a | 0.111 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000208 | 202.135 | 0.000 | n/a | 0.000 | 0.000 | 0.582 | 201.336 | 0.013 | n/a | 0.106 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b0000000000000219 | 202.135 | 0.000 | n/a | 0.000 | 0.000 | 0.747 | 201.128 | 0.020 | n/a | 0.117 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b0000000000000260 | 202.123 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 201.105 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000250 | 202.081 | 0.000 | n/a | 0.000 | 0.000 | 1.004 | 200.854 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b000000000000020b | 202.071 | 0.000 | n/a | 0.000 | 0.000 | 0.713 | 200.961 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.318 | 0.000 | 0.000 | 0.318 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b000000000000021a | 202.069 | 0.000 | n/a | 0.000 | 0.000 | 0.577 | 201.280 | 0.012 | n/a | 0.096 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b0000000000000229 | 202.065 | 0.000 | n/a | 0.000 | 0.000 | 0.820 | 201.031 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b000000000000025f | 202.033 | 0.000 | n/a | 0.000 | 0.000 | 0.735 | 201.017 | 0.008 | n/a | 0.074 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b0000000000000235 | 201.984 | 0.000 | n/a | 0.000 | 0.000 | 0.599 | 201.166 | 0.037 | n/a | 0.080 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / read (68 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.777 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.605 | 72.136 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 210.262 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.036 | 206.931 | 3.200 | n/a | 0.100 | 0.000 | n/a | n/a | 0.324 | 0.000 | 0.000 | 0.324 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b006484a62c082b0000000000000289 | 210.262 | 0.000 | n/a | 0.000 | 0.000 | 3.036 | 206.931 | 0.023 | n/a | 0.080 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b000000000000027e | 202.205 | 0.000 | n/a | 0.000 | 0.000 | 0.855 | 200.942 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.324 | 0.000 | 0.000 | 0.324 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b0000000000000287 | 202.048 | 0.000 | n/a | 0.000 | 0.000 | 0.695 | 201.158 | 0.011 | n/a | 0.077 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b000000000000028a | 202.037 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 200.889 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b000000000000028c | 202.031 | 0.000 | n/a | 0.000 | 0.000 | 0.884 | 200.909 | 0.006 | n/a | 0.080 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b000000000000028f | 202.009 | 0.000 | n/a | 0.000 | 0.000 | 0.729 | 201.044 | 0.011 | n/a | 0.082 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b000000000000027c | 201.988 | 0.000 | n/a | 0.000 | 0.000 | 0.553 | 201.230 | 0.010 | n/a | 0.100 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b0000000000000290 | 201.928 | 0.000 | n/a | 0.000 | 0.000 | 0.747 | 200.911 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-51/journal/page | none observed |
| 7b006484a62c082b000000000000027d | 201.889 | 0.000 | n/a | 0.000 | 0.000 | 0.752 | 200.955 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b0000000000000278 | 201.778 | 0.000 | n/a | 0.000 | 0.000 | 0.802 | 200.746 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-46/journal/page | none observed |
| 7b006484a62c082b000000000000028b | 201.774 | 0.000 | n/a | 0.000 | 0.000 | 0.737 | 200.795 | 0.010 | n/a | 0.053 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000284 | 201.772 | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 200.772 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b000000000000028e | 201.746 | 0.000 | n/a | 0.000 | 0.000 | 0.674 | 200.843 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b0000000000000279 | 201.740 | 0.000 | n/a | 0.000 | 0.000 | 0.650 | 200.845 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b0000000000000285 | 201.641 | 0.000 | n/a | 0.000 | 0.000 | 0.683 | 200.750 | 0.012 | n/a | 0.060 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 7b006484a62c082b0000000000000283 | 201.519 | 0.000 | n/a | 0.000 | 0.000 | 0.616 | 200.735 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 7b006484a62c082b0000000000000277 | 201.330 | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 200.567 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b0000000000000280 | 201.191 | 0.000 | n/a | 0.000 | 0.000 | 0.430 | 200.603 | 0.010 | n/a | 0.034 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b000000000000027a | 188.947 | 0.000 | n/a | 0.000 | 0.000 | 0.811 | 187.937 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b0000000000000291 | 171.435 | 0.000 | n/a | 0.000 | 0.000 | 1.183 | 169.914 | 0.013 | n/a | 0.067 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | gw-r/thread-50/journal/page | none observed |

## P3 / tail / read (207 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 92.374 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.475 | 91.267 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 |
| p99 | 202.587 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.171 | 201.061 | 1.208 | n/a | 0.102 | 0.000 | n/a | n/a | 0.273 | 0.000 | 0.000 | 0.273 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b006484a62c082b0000000000000ee2 | 222.585 | 0.000 | n/a | 0.000 | 0.000 | 31.674 | 190.741 | 0.003 | n/a | 0.029 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b0000000000000f0d | 203.912 | 0.000 | n/a | 0.000 | 0.000 | 2.129 | 201.374 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.355 | 0.000 | 0.000 | 0.355 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000eb2 | 202.587 | 0.000 | n/a | 0.000 | 0.000 | 0.861 | 201.368 | 0.042 | n/a | 0.050 | 0.000 | n/a | n/a | 0.265 | 0.000 | 0.000 | 0.265 | gw-r/thread-46/journal/page | none observed |
| 7b006484a62c082b0000000000000f20 | 202.380 | 0.000 | n/a | 0.000 | 0.000 | 1.472 | 200.725 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000f15 | 201.835 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 201.061 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b0000000000000ede | 201.806 | 0.000 | n/a | 0.000 | 0.000 | 0.635 | 200.887 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-46/journal/page | none observed |
| 7b006484a62c082b0000000000000ed6 | 201.798 | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 200.968 | 0.004 | n/a | 0.130 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b0000000000000f16 | 201.740 | 0.000 | n/a | 0.000 | 0.000 | 0.637 | 200.848 | 0.024 | n/a | 0.065 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-46/journal/page | none observed |
| 7b006484a62c082b0000000000000eef | 201.734 | 0.000 | n/a | 0.000 | 0.000 | 0.706 | 200.858 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-50/journal/page | none observed |
| 7b006484a62c082b0000000000000f27 | 201.663 | 0.000 | n/a | 0.000 | 0.000 | 0.650 | 200.843 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000f1f | 201.650 | 0.000 | n/a | 0.000 | 0.000 | 0.631 | 200.753 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b0000000000000eb3 | 201.649 | 0.000 | n/a | 0.000 | 0.000 | 0.636 | 200.840 | 0.011 | n/a | 0.042 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000ee4 | 201.634 | 0.000 | n/a | 0.000 | 0.000 | 0.617 | 200.813 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000f0a | 201.620 | 0.000 | n/a | 0.000 | 0.000 | 0.645 | 200.829 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b0000000000000eb1 | 201.612 | 0.000 | n/a | 0.000 | 0.000 | 0.549 | 200.831 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b0000000000000ecd | 201.612 | 0.000 | n/a | 0.000 | 0.000 | 0.540 | 200.897 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-44/journal/page | none observed |
| 7b006484a62c082b0000000000000f21 | 201.578 | 0.000 | n/a | 0.000 | 0.000 | 0.702 | 200.619 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-49/journal/page | none observed |
| 7b006484a62c082b0000000000000ef5 | 201.567 | 0.000 | n/a | 0.000 | 0.000 | 0.611 | 200.803 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 7b006484a62c082b0000000000000f02 | 201.545 | 0.000 | n/a | 0.000 | 0.000 | 0.499 | 200.892 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-48/journal/page | none observed |
| 7b006484a62c082b0000000000000ebc | 201.524 | 0.000 | n/a | 0.000 | 0.000 | 0.536 | 200.814 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
