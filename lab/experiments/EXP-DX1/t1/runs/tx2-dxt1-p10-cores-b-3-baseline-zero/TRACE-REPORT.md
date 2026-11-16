# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-64/peer.transact-await (includes order/network/storage)` (158.056 ms, trace `d92e2598482d8b780000000000001df5`); `node-13/thread-0/driver.queue.subject` (117.752 ms, trace `d92e2598482d8b7800000000000011ce`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (100.276 ms, trace `d92e2598482d8b78000000000000013d`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (65.835 ms, trace `d92e2598482d8b7800000000000011cc`); `node-13/thread-0/driver.queue.subject` (66.330 ms, trace `d92e2598482d8b7800000000000011d7`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-cores-b-3-baseline-zero`; source `d709fd769d271992b6a87841489c90665585e919`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 4258/4259 (99.977%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 4259/4259. Raw trace bytes: 10728387.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 276 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14467.041 | 302.244 | 4.511 | 457 |
| L1 | 0 | 44960.984 | 833.943 | 24.828 | 1496 |
| L4 | 0 | 44984.929 | 983.230 | 20.912 | 1742 |
| L16 | 0 | 44981.110 | 8433.337 | 70.245 | 34331 |
| L64 | 0 | 44990.449 | 8754.675 | 59.899 | 35756 |
| L256 | 0 | 44989.163 | 942.673 | 13.422 | 1560 |
| L1024 | 0 | 44988.600 | 1165.928 | 18.420 | 1598 |
| tail | 0 | 164243.708 | 4140.464 | 74.670 | 6125 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| d92e2598482d8b780000000000001df5 | driver.queue.scheduler-dispatch | 0.056 | none | 0 / 32 |
| d92e2598482d8b780000000000001df5 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace d92e2598482d8b780000000000001df5 waited: []

| d92e2598482d8b7800000000000011ce | driver.queue.subject | 117.752 | d92e2598482d8b7800000000000011cc | 4 / 32 |
| d92e2598482d8b7800000000000011ce | driver.queue.scheduler-late | 0.441 | none | 4 / 32 |
| d92e2598482d8b7800000000000011ce | driver.queue.scheduler-dispatch | 0.087 | none | 1 / 32 |

Observed active steps while trace d92e2598482d8b7800000000000011ce waited: [{"at":1794810805328.725,"inFlight":6,"capacity":32,"active":[{"traceId":"d92e2598482d8b7800000000000011cb","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011cc","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011cd","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011cf","step":"rpc.probe.transact"},{"traceId":"d92e2598482d8b7800000000000011d0","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d2","step":"client.http"}]},{"at":1794810805349.2305,"inFlight":6,"capacity":32,"active":[{"traceId":"d92e2598482d8b7800000000000011cc","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011cf","step":"rpc.probe.transact"},{"traceId":"d92e2598482d8b7800000000000011d0","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d2","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d3","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d4","step":"client.http"}]},{"at":1794810805369.3025,"inFlight":5,"capacity":32,"active":[{"traceId":"d92e2598482d8b7800000000000011cc","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d0","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d2","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d3","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d4","step":"client.http"}]},{"at":1794810805390.222,"inFlight":4,"capacity":32,"active":[{"traceId":"d92e2598482d8b7800000000000011cc","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d2","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d3","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d4","step":"client.http"}]},{"at":1794810805410.5051,"inFlight":3,"capacity":32,"active":[{"traceId":"d92e2598482d8b7800000000000011cc","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d3","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d4","step":"client.http"}]}]

| d92e2598482d8b78000000000000013d | driver.queue.scheduler-dispatch | 0.142 | none | 0 / 32 |
| d92e2598482d8b78000000000000013d | driver.queue.scheduler-late | 0.005 | none | 0 / 32 |

Observed active steps while trace d92e2598482d8b78000000000000013d waited: []

| d92e2598482d8b7800000000000011cc | driver.queue.scheduler-dispatch | 0.058 | none | 2 / 32 |
| d92e2598482d8b7800000000000011cc | driver.queue.scheduler-late | 0.004 | none | 2 / 32 |

Observed active steps while trace d92e2598482d8b7800000000000011cc waited: []

| d92e2598482d8b7800000000000011d7 | driver.queue.subject | 66.330 | d92e2598482d8b7800000000000011d4 | 6 / 32 |
| d92e2598482d8b7800000000000011d7 | driver.queue.scheduler-dispatch | 0.077 | none | 1 / 32 |
| d92e2598482d8b7800000000000011d7 | driver.queue.scheduler-late | 0.002 | none | 6 / 32 |

Observed active steps while trace d92e2598482d8b7800000000000011d7 waited: [{"at":1794810805369.3025,"inFlight":5,"capacity":32,"active":[{"traceId":"d92e2598482d8b7800000000000011cc","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d0","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d2","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d3","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d4","step":"client.http"}]},{"at":1794810805390.222,"inFlight":4,"capacity":32,"active":[{"traceId":"d92e2598482d8b7800000000000011cc","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d2","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d3","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d4","step":"client.http"}]},{"at":1794810805410.5051,"inFlight":3,"capacity":32,"active":[{"traceId":"d92e2598482d8b7800000000000011cc","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d3","step":"client.http"},{"traceId":"d92e2598482d8b7800000000000011d4","step":"client.http"}]}]

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.441 | 0.577 | 0.000 | 0.592 | 5.393 | 0.544 | 0.000 | 0.082 | 1.679 | 7.946 | 0.032 | n/a | 0.386 | 13.389 | n/a | n/a | 0.028 | 6.171 | 0.184 | 0.028 |
| p99 | 76.481 | 5.916 | 0.000 | 5.323 | 20.134 | n/a | 3.576 | 2.307 | 4.233 | 24.853 | 0.234 | n/a | 4.159 | 44.236 | n/a | n/a | 0.162 | 20.852 | 0.380 | 0.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b7800000000000000f3 | 76.481 | 20.134 | 0.544 | 0.000 | 0.174 | 2.493 | 24.853 | 0.147 | n/a | 4.159 | 23.914 | n/a | n/a | 0.064 | 20.852 | 0.273 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| d92e2598482d8b7800000000000000f0 | 68.908 | 10.380 | n/a | 3.576 | 0.223 | 1.055 | 9.132 | 0.030 | n/a | 0.120 | 44.236 | n/a | n/a | 0.156 | 14.179 | 0.206 | 0.156 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| d92e2598482d8b78000000000000010b | 53.889 | 9.104 | 0.184 | 0.000 | 0.054 | 1.181 | 20.632 | 0.031 | n/a | 0.215 | 22.468 | n/a | n/a | 0.021 | 9.342 | 0.173 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000103 | 50.563 | 5.393 | 0.229 | 1.324 | 0.222 | 1.436 | 22.788 | 0.035 | n/a | 0.112 | 18.949 | n/a | n/a | 0.075 | 7.168 | 0.142 | 0.075 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000129 | 45.602 | 6.839 | 0.178 | 0.426 | 0.072 | 1.644 | 20.458 | 0.040 | n/a | 0.386 | 15.533 | n/a | n/a | 0.026 | 7.514 | 0.165 | 0.026 | gw-w/thread-47/gateway.admitted-work | none observed |
| d92e2598482d8b7800000000000000f7 | 44.587 | 7.500 | 0.276 | 0.000 | 0.109 | 2.791 | 15.085 | 0.058 | n/a | 1.972 | 16.745 | n/a | n/a | 0.052 | 7.884 | 0.177 | 0.052 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000119 | 41.019 | 6.390 | 0.254 | 0.481 | 0.066 | 1.679 | 10.321 | 0.032 | n/a | 0.093 | 21.665 | n/a | n/a | 0.039 | 7.191 | 0.175 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000011d | 40.255 | 5.716 | 0.399 | 0.751 | 0.066 | 2.189 | 11.311 | 0.048 | n/a | 0.155 | 19.595 | n/a | n/a | 0.027 | 6.931 | 0.172 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000121 | 35.625 | 4.952 | 0.390 | 0.353 | 0.088 | 1.969 | 8.267 | 0.234 | n/a | 0.436 | 18.901 | n/a | n/a | 0.034 | 5.783 | 0.162 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000105 | 33.552 | 5.860 | 0.215 | 0.000 | 0.096 | 1.957 | 14.509 | 0.035 | n/a | 0.394 | 10.450 | n/a | n/a | 0.035 | 6.171 | 0.184 | 0.035 | gw-w/thread-48/gateway.admitted-work | none observed |
| d92e2598482d8b780000000000000115 | 33.192 | 6.873 | 0.219 | 0.519 | 0.057 | 2.366 | 9.835 | 0.035 | n/a | 0.093 | 13.174 | n/a | n/a | 0.022 | 7.668 | 0.231 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000010f | 33.136 | 8.057 | 0.228 | 0.000 | 0.111 | 3.113 | 7.946 | 0.093 | n/a | 0.154 | 13.389 | n/a | n/a | 0.044 | 8.396 | 0.253 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000117 | 31.716 | 8.400 | n/a | 1.720 | 0.069 | 2.829 | 1.563 | 0.021 | n/a | 0.557 | 16.528 | n/a | n/a | 0.029 | 10.189 | 0.321 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000127 | 30.885 | 3.829 | 0.153 | 0.000 | 0.045 | 1.238 | 13.487 | 0.030 | n/a | 1.962 | 10.120 | n/a | n/a | 0.022 | 4.027 | 0.130 | 0.022 | gw-w/thread-44/gateway.admitted-work | none observed |
| d92e2598482d8b7800000000000000fe | 30.441 | 4.378 | 0.302 | 0.000 | 0.071 | 1.898 | 8.775 | 0.032 | n/a | 0.445 | 14.493 | n/a | n/a | 0.047 | 4.751 | 0.156 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.075ms; driver.publication.persist-deferred 0.025ms |
| d92e2598482d8b7800000000000000fb | 29.689 | 4.870 | 0.224 | 0.000 | 0.082 | 2.097 | 12.401 | 0.058 | n/a | 0.551 | 9.379 | n/a | n/a | 0.028 | 5.176 | 0.174 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000000f9 | 29.155 | 5.505 | n/a | 1.439 | 0.132 | 1.316 | 4.729 | 0.022 | n/a | 0.825 | 15.137 | n/a | n/a | 0.049 | 7.076 | 0.243 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000100 | 27.325 | 8.071 | n/a | 0.000 | 2.307 | 1.770 | 2.220 | 0.037 | n/a | 0.107 | 12.764 | n/a | n/a | 0.049 | 10.378 | 0.380 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000109 | 24.694 | 3.660 | n/a | 0.000 | 0.074 | 0.908 | 1.565 | 0.025 | n/a | 0.432 | 18.003 | n/a | n/a | 0.026 | 3.734 | 0.151 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000106 | 24.337 | 6.896 | n/a | 0.524 | 1.760 | 1.326 | 5.242 | 0.022 | n/a | 0.092 | 8.455 | n/a | n/a | 0.020 | 9.180 | 0.377 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.008ms |

## P2/P4 / read-your-own-write / read (58 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 68.277 | n/a | n/a | n/a | 31.622 | 2.969 | 1.849 | 0.000 | 0.404 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.224 | 45.500 | 0.729 | 12.224 |
| p99 | 287.067 | n/a | n/a | n/a | 75.891 | 161.886 | 10.983 | 0.000 | 92.976 | 137.260 | 146.800 | n/a | 0.022 | 0.000 | n/a | n/a | 128.081 | 186.657 | 1.000 | 128.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b780000000000001228 | 287.067 | 24.771 | 161.886 | 0.000 | 0.000 | 0.536 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 99.874 | 186.657 | 0.650 | 99.874 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.451ms; driver.publication.readback 0.509ms; driver.reader-basis.broadcast 0.495ms; driver.publication.readback 0.342ms; driver.reader-basis.broadcast 0.246ms |
| d92e2598482d8b780000000000001224 | 273.010 | 31.724 | 0.299 | 0.000 | 0.000 | 92.976 | 1.485 | 146.510 | n/a | 0.005 | 0.000 | n/a | n/a | 0.011 | 32.022 | 0.117 | 0.011 | gw-r/thread-44/gateway.admission-wait | driver.expected-state.bind-receipt 1.451ms; driver.publication.readback 0.509ms; driver.publication.readback 0.349ms; driver.publication.readback 0.342ms; driver.reader-basis.broadcast 0.246ms |
| d92e2598482d8b780000000000001223 | 258.820 | 36.594 | 5.318 | 3.612 | 0.000 | 61.949 | 18.431 | 132.902 | n/a | 0.008 | 0.000 | n/a | n/a | 0.007 | 45.523 | 0.176 | 0.007 | gw-r/thread-47/gateway.admission-wait | driver.publication.readback 0.509ms; driver.publication.readback 0.349ms; driver.publication.readback 0.342ms; driver.reader-basis.broadcast 0.246ms; driver.reader-basis.broadcast 0.208ms |
| d92e2598482d8b780000000000001227 | 212.159 | 42.817 | 1.279 | 5.285 | 0.000 | 13.955 | 2.009 | 146.800 | n/a | 0.006 | 0.000 | n/a | n/a | 0.008 | 49.381 | 0.233 | 0.008 | gw-r/thread-42/gateway.admission-wait | driver.publication.readback 0.342ms; driver.reader-basis.broadcast 0.246ms; driver.reader-basis.broadcast 0.208ms; driver.publication.persist-deferred 0.127ms; driver.publication.readback 0.114ms |
| d92e2598482d8b780000000000001221 | 193.115 | 34.940 | 8.711 | 1.849 | 0.000 | 10.332 | 137.260 | 0.003 | n/a | 0.011 | 0.000 | n/a | n/a | 0.010 | 45.500 | 0.236 | 0.010 | gw-r/thread-45/gateway.admitted-work | driver.publication.readback 0.349ms; driver.publication.readback 0.342ms; driver.reader-basis.broadcast 0.246ms; driver.publication.persist-deferred 0.127ms; driver.publication.readback 0.114ms |
| d92e2598482d8b78000000000000169c | 176.948 | 55.679 | 44.836 | 4.491 | 0.000 | 0.395 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 71.548 | 105.006 | 0.593 | 71.548 | node-13/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.455ms; driver.reader-basis.broadcast 0.260ms; driver.reader-basis.broadcast 0.236ms; driver.publication.readback 0.180ms; driver.publication.readback 0.110ms |
| d92e2598482d8b780000000000000312 | 169.848 | 29.387 | 0.607 | 1.768 | 0.000 | 62.151 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 75.935 | 31.762 | 0.187 | 75.935 | node-13/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.578ms; driver.publication.readback 0.127ms; driver.publication.readback 0.116ms; driver.publication.readback 0.116ms; driver.publication.readback 0.105ms |
| d92e2598482d8b780000000000001e8c | 160.529 | 69.426 | 0.371 | 10.983 | 0.000 | 7.263 | 72.465 | 0.003 | n/a | 0.010 | 0.000 | n/a | n/a | 0.008 | 80.780 | 0.503 | 0.008 | gw-r/thread-42/gateway.admitted-work | driver.reader-basis.broadcast 0.852ms; driver.reader-basis.broadcast 0.328ms; driver.publication.readback 0.088ms; driver.publication.persist-deferred 0.029ms |
| d92e2598482d8b78000000000000031a | 158.733 | 12.435 | 142.997 | 0.000 | 0.000 | 0.474 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.827 | 155.432 | 0.979 | 2.827 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.578ms; driver.publication.readback 0.116ms; driver.publication.readback 0.116ms; driver.publication.readback 0.105ms; driver.reader-basis.broadcast 0.074ms |
| d92e2598482d8b780000000000001693 | 151.297 | 63.295 | 55.919 | 8.133 | 0.000 | 0.490 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.460 | 127.347 | 0.842 | 23.460 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.455ms; driver.reader-basis.broadcast 0.260ms; driver.reader-basis.broadcast 0.236ms; driver.publication.readback 0.180ms; driver.publication.readback 0.101ms |
| d92e2598482d8b780000000000000315 | 144.282 | 14.622 | 0.584 | 0.000 | 0.000 | 0.996 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 128.081 | 15.206 | 0.105 | 128.081 | node-13/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.578ms; driver.publication.readback 0.127ms; driver.publication.readback 0.116ms; driver.publication.readback 0.105ms; driver.publication.readback 0.073ms |
| d92e2598482d8b780000000000000316 | 132.656 | 59.551 | 0.259 | 6.225 | 0.000 | 6.940 | 42.218 | 17.431 | n/a | 0.022 | 0.000 | n/a | n/a | 0.010 | 66.034 | 0.498 | 0.010 | gw-r/thread-48/gateway.response-write | driver.expected-state.bind-receipt 1.578ms; driver.publication.readback 0.127ms; driver.publication.readback 0.116ms; driver.publication.readback 0.105ms; driver.publication.readback 0.073ms |
| d92e2598482d8b780000000000000911 | 99.750 | 19.243 | 3.748 | 0.000 | 0.000 | 0.320 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 76.440 | 22.991 | 0.230 | 76.440 | node-13/thread-3/socket.wait-first-byte | driver.publication.readback 0.141ms; driver.publication.readback 0.128ms; driver.publication.readback 0.121ms; driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.057ms |
| d92e2598482d8b78000000000000091a | 96.875 | 21.604 | 50.405 | 1.930 | 0.000 | 0.404 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.531 | 73.940 | 0.763 | 22.531 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication.readback 0.128ms; driver.publication.readback 0.121ms; driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.060ms; driver.publication.readback 0.053ms |
| d92e2598482d8b780000000000001c72 | 96.327 | 75.891 | 0.914 | 6.212 | 0.000 | 0.488 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.822 | 83.017 | 0.862 | 12.822 | node-13/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.734ms; driver.publication.readback 0.072ms; driver.publication.readback 0.060ms; driver.publication.readback 0.053ms; driver.publication.readback 0.049ms |
| d92e2598482d8b780000000000001695 | 94.105 | 23.767 | 55.563 | 6.083 | 0.000 | 0.145 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.547 | 85.413 | 0.908 | 8.547 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.455ms; driver.reader-basis.broadcast 0.260ms; driver.publication.readback 0.101ms; driver.publication.readback 0.086ms; driver.publication.readback 0.059ms |
| d92e2598482d8b78000000000000167e | 92.670 | 40.284 | 25.151 | 2.019 | 0.000 | 0.209 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.008 | 67.453 | 0.728 | 25.008 | node-13/thread-3/socket.wait-first-byte | driver.publication.readback 0.167ms; driver.publication.readback 0.087ms; driver.publication.readback 0.086ms; driver.publication.readback 0.066ms; driver.publication.readback 0.059ms |
| d92e2598482d8b78000000000000168d | 86.376 | 32.455 | 3.461 | 2.333 | 0.000 | 0.519 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.609 | 38.249 | 0.443 | 47.609 | node-13/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.455ms; driver.reader-basis.broadcast 0.260ms; driver.publication.readback 0.087ms; driver.publication.readback 0.086ms; driver.publication.readback 0.059ms |
| d92e2598482d8b780000000000001690 | 84.938 | 16.889 | 25.821 | 0.000 | 0.000 | 0.402 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.826 | 42.710 | 0.503 | 41.826 | node-13/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.455ms; driver.reader-basis.broadcast 0.260ms; driver.publication.readback 0.101ms; driver.publication.readback 0.087ms; driver.publication.readback 0.086ms |
| d92e2598482d8b780000000000001694 | 80.249 | 16.892 | 55.382 | 0.854 | 0.000 | 0.154 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.968 | 73.128 | 0.911 | 6.968 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.455ms; driver.reader-basis.broadcast 0.260ms; driver.publication.readback 0.101ms; driver.publication.readback 0.086ms; driver.publication.readback 0.059ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.170 | 0.662 | 0.000 | 0.592 | 2.501 | n/a | 0.000 | 0.085 | 0.921 | 1.989 | 0.025 | n/a | 0.395 | 10.088 | n/a | n/a | 0.027 | 3.618 | 0.199 | 0.027 |
| p99 | 29.155 | 2.857 | 0.000 | 2.671 | 5.505 | n/a | 1.439 | 2.106 | 4.233 | 4.729 | 0.058 | n/a | 3.489 | 15.495 | n/a | n/a | 0.162 | 7.076 | 0.335 | 0.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b7800000000000000f9 | 29.155 | 5.505 | n/a | 1.439 | 0.132 | 1.316 | 4.729 | 0.022 | n/a | 0.825 | 15.137 | n/a | n/a | 0.049 | 7.076 | 0.243 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000011e | 23.161 | 2.501 | n/a | 0.000 | 0.085 | 0.921 | 4.000 | 0.025 | n/a | 0.098 | 15.495 | n/a | n/a | 0.036 | 2.587 | 0.112 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000000f5 | 21.479 | 3.040 | n/a | 0.000 | 1.278 | 0.694 | 2.715 | 0.023 | n/a | 0.730 | 12.837 | n/a | n/a | 0.162 | 4.317 | 0.201 | 0.162 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000000fd | 21.231 | 2.323 | n/a | 0.000 | 1.581 | 1.270 | 4.570 | 0.058 | n/a | 0.148 | 11.253 | n/a | n/a | 0.027 | 3.905 | 0.184 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000110 | 19.170 | 3.289 | n/a | 0.000 | 0.053 | 4.233 | 1.989 | 0.046 | n/a | 0.143 | 9.395 | n/a | n/a | 0.023 | 3.342 | 0.174 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000123 | 18.374 | 2.426 | n/a | 0.000 | 0.064 | 0.825 | 1.668 | 0.042 | n/a | 3.489 | 9.833 | n/a | n/a | 0.026 | 2.490 | 0.135 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000112 | 18.212 | 3.556 | n/a | 0.000 | 0.062 | 2.900 | 1.167 | 0.019 | n/a | 0.395 | 10.088 | n/a | n/a | 0.025 | 3.618 | 0.199 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| d92e2598482d8b780000000000000125 | 12.797 | 2.184 | n/a | 0.000 | 2.106 | 0.802 | 1.656 | 0.026 | n/a | 0.825 | 5.174 | n/a | n/a | 0.025 | 4.290 | 0.335 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000011a | 9.427 | 2.196 | n/a | 0.000 | 0.062 | 0.634 | 0.994 | 0.022 | n/a | 0.366 | 5.126 | n/a | n/a | 0.028 | 2.258 | 0.240 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.867 | 0.000 | 0.000 | 0.513 | 3.830 | n/a | 0.000 | 0.081 | 1.359 | 4.706 | 0.034 | n/a | 0.202 | 11.542 | n/a | n/a | 0.031 | 4.372 | 0.192 | 0.031 |
| p99 | 124.225 | 3.007 | 0.029 | 2.255 | 7.260 | n/a | 0.668 | 3.862 | 6.209 | 30.324 | 0.581 | n/a | 3.034 | 100.276 | n/a | n/a | 0.081 | 8.052 | 0.353 | 0.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b78000000000000013d | 124.225 | 7.098 | 0.266 | 0.267 | 0.146 | 1.952 | 13.708 | 0.040 | n/a | 0.418 | 100.276 | n/a | n/a | 0.054 | 7.777 | 0.063 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| d92e2598482d8b78000000000000019c | 84.176 | 4.011 | 0.332 | 0.244 | 0.050 | 1.537 | 11.726 | 0.042 | n/a | 0.106 | 66.099 | n/a | n/a | 0.027 | 4.637 | 0.055 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000156 | 73.220 | 6.719 | n/a | 0.000 | 0.129 | 1.374 | 21.468 | 0.044 | n/a | 0.091 | 43.341 | n/a | n/a | 0.053 | 6.848 | 0.094 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.054ms |
| d92e2598482d8b780000000000000188 | 51.208 | 7.260 | 0.335 | 0.354 | 0.103 | 2.521 | 22.935 | 0.115 | n/a | 0.202 | 17.337 | n/a | n/a | 0.046 | 8.052 | 0.157 | 0.046 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000001d2 | 51.158 | 3.824 | 0.273 | 0.272 | 0.077 | 2.240 | 9.047 | 0.100 | n/a | 0.705 | 34.586 | n/a | n/a | 0.032 | 4.447 | 0.087 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000190 | 47.446 | 3.797 | 0.189 | 0.243 | 0.070 | 4.792 | 30.324 | 0.050 | n/a | 0.140 | 7.811 | n/a | n/a | 0.029 | 4.300 | 0.091 | 0.029 | gw-w/thread-48/gateway.admitted-work | none observed |
| d92e2598482d8b7800000000000001c2 | 43.938 | 4.781 | 0.290 | 0.432 | 0.081 | 6.209 | 20.856 | 0.047 | n/a | 1.137 | 10.068 | n/a | n/a | 0.037 | 5.584 | 0.127 | 0.037 | gw-w/thread-47/gateway.admitted-work | none observed |
| d92e2598482d8b780000000000000134 | 43.928 | 5.125 | 0.246 | 0.000 | 0.066 | 1.580 | 11.259 | 0.038 | n/a | 0.093 | 25.494 | n/a | n/a | 0.026 | 5.438 | 0.124 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000013f | 42.458 | 5.591 | 0.210 | 0.668 | 0.076 | 2.222 | 7.597 | 0.031 | n/a | 0.504 | 25.531 | n/a | n/a | 0.027 | 6.546 | 0.154 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000149 | 38.876 | 5.396 | 0.318 | 0.301 | 0.144 | 1.661 | 11.267 | 0.083 | n/a | 0.191 | 19.467 | n/a | n/a | 0.049 | 6.158 | 0.158 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000012d | 37.793 | 3.700 | 0.167 | 0.338 | 0.055 | 1.175 | 12.719 | 0.059 | n/a | 0.130 | 19.428 | n/a | n/a | 0.022 | 4.260 | 0.113 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000145 | 37.640 | 4.094 | 0.224 | 0.509 | 0.058 | 1.773 | 11.190 | 0.047 | n/a | 0.160 | 19.558 | n/a | n/a | 0.026 | 4.886 | 0.130 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000012b | 35.871 | 4.788 | 0.437 | 0.000 | 0.145 | 2.115 | 16.326 | 0.056 | n/a | 0.335 | 11.617 | n/a | n/a | 0.052 | 5.370 | 0.150 | 0.052 | gw-w/thread-45/gateway.admitted-work | none observed |
| d92e2598482d8b7800000000000001d5 | 35.356 | 6.300 | n/a | 0.000 | 1.157 | 3.793 | 1.405 | 0.018 | n/a | 0.429 | 22.226 | n/a | n/a | 0.028 | 7.457 | 0.211 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.119ms; driver.publication.persist-deferred 0.019ms |
| d92e2598482d8b780000000000000137 | 35.093 | 5.293 | 0.204 | 0.377 | 0.100 | 1.710 | 7.666 | 0.039 | n/a | 0.113 | 19.551 | n/a | n/a | 0.040 | 5.974 | 0.170 | 0.040 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000170 | 33.076 | 4.778 | 0.150 | 0.000 | 0.057 | 1.089 | 9.466 | 0.035 | n/a | 0.081 | 17.398 | n/a | n/a | 0.022 | 4.985 | 0.151 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000001bf | 32.448 | 5.871 | 0.308 | 0.000 | 0.061 | 1.926 | 6.993 | 0.039 | n/a | 1.026 | 16.192 | n/a | n/a | 0.033 | 6.240 | 0.192 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.041ms |
| d92e2598482d8b78000000000000017c | 31.767 | 5.824 | 0.173 | 0.257 | 0.055 | 1.077 | 5.491 | 0.034 | n/a | 2.515 | 16.317 | n/a | n/a | 0.024 | 6.308 | 0.199 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000192 | 31.658 | 4.201 | 0.289 | 0.290 | 0.227 | 1.957 | 10.646 | 0.039 | n/a | 0.171 | 13.771 | n/a | n/a | 0.068 | 5.007 | 0.158 | 0.068 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000016c | 31.444 | 4.220 | 0.239 | 0.287 | 0.055 | 2.637 | 7.659 | 0.030 | n/a | 0.611 | 15.679 | n/a | n/a | 0.027 | 4.800 | 0.153 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.697 | 0.000 | 0.000 | 0.486 | 2.532 | n/a | 0.000 | 0.108 | 0.844 | 1.315 | 0.025 | n/a | 0.223 | 10.310 | n/a | n/a | 0.032 | 2.919 | 0.214 | 0.032 |
| p99 | 26.867 | 1.002 | 0.000 | 0.942 | 6.947 | n/a | 0.000 | 3.862 | 4.867 | 7.249 | 0.081 | n/a | 3.034 | 20.325 | n/a | n/a | 0.081 | 7.727 | 0.353 | 0.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b780000000000000132 | 26.867 | 3.786 | n/a | 0.000 | 0.108 | 1.146 | 2.535 | 0.043 | n/a | 0.674 | 18.532 | n/a | n/a | 0.042 | 3.894 | 0.145 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000135 | 26.314 | 6.947 | n/a | 0.000 | 0.780 | 1.941 | 4.191 | 0.045 | n/a | 0.496 | 11.890 | n/a | n/a | 0.023 | 7.727 | 0.294 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000001c7 | 24.477 | 1.830 | n/a | 0.000 | 0.046 | 0.656 | 1.472 | 0.024 | n/a | 0.100 | 20.325 | n/a | n/a | 0.024 | 1.875 | 0.077 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000146 | 23.093 | 2.232 | n/a | 0.000 | 0.059 | 0.648 | 1.465 | 0.024 | n/a | 0.391 | 18.249 | n/a | n/a | 0.024 | 2.291 | 0.099 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000001be | 22.005 | 2.839 | n/a | 0.000 | 0.080 | 1.031 | 1.194 | 0.033 | n/a | 0.221 | 16.568 | n/a | n/a | 0.040 | 2.919 | 0.133 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| d92e2598482d8b780000000000000184 | 19.557 | 3.460 | n/a | 0.000 | 0.089 | 1.695 | 2.514 | 0.081 | n/a | 0.842 | 10.839 | n/a | n/a | 0.037 | 3.549 | 0.181 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| d92e2598482d8b7800000000000001d0 | 19.162 | 2.216 | n/a | 0.000 | 0.064 | 0.871 | 1.123 | 0.026 | n/a | 0.167 | 14.666 | n/a | n/a | 0.029 | 2.280 | 0.119 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000151 | 18.659 | 3.841 | n/a | 0.000 | 0.157 | 1.136 | 7.249 | 0.031 | n/a | 0.101 | 6.085 | n/a | n/a | 0.058 | 3.998 | 0.214 | 0.058 | gw-w/thread-43/commit.prepare-and-validate | none observed |
| d92e2598482d8b780000000000000180 | 18.480 | 2.561 | n/a | 0.000 | 0.064 | 1.093 | 1.655 | 0.026 | n/a | 0.456 | 12.596 | n/a | n/a | 0.028 | 2.625 | 0.142 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000001e2 | 18.406 | 4.394 | n/a | 0.000 | 0.159 | 1.328 | 1.622 | 0.037 | n/a | 0.131 | 10.654 | n/a | n/a | 0.080 | 4.553 | 0.247 | 0.080 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000001d4 | 18.289 | 2.731 | n/a | 0.000 | 0.111 | 4.867 | 1.182 | 0.022 | n/a | 0.115 | 9.212 | n/a | n/a | 0.047 | 2.842 | 0.155 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000015b | 17.697 | 2.287 | n/a | 0.000 | 0.065 | 0.844 | 2.118 | 0.025 | n/a | 1.888 | 10.437 | n/a | n/a | 0.031 | 2.352 | 0.133 | 0.031 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000016e | 16.588 | 4.422 | n/a | 0.000 | 0.233 | 1.490 | 1.406 | 0.032 | n/a | 0.138 | 8.785 | n/a | n/a | 0.081 | 4.655 | 0.281 | 0.081 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000177 | 16.555 | 1.757 | n/a | 0.000 | 3.862 | 0.534 | 1.315 | 0.023 | n/a | 3.034 | 6.010 | n/a | n/a | 0.020 | 5.619 | 0.339 | 0.020 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.078ms; driver.reader-basis.broadcast 0.050ms; driver.publication.persist-deferred 0.021ms |
| d92e2598482d8b780000000000000194 | 16.007 | 2.152 | n/a | 0.000 | 0.076 | 0.732 | 1.178 | 0.024 | n/a | 0.164 | 11.649 | n/a | n/a | 0.032 | 2.228 | 0.139 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000001cd | 14.547 | 1.766 | n/a | 0.000 | 0.060 | 0.608 | 1.323 | 0.022 | n/a | 0.426 | 10.310 | n/a | n/a | 0.033 | 1.827 | 0.126 | 0.033 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000018e | 13.805 | 3.072 | n/a | 0.000 | 0.110 | 0.802 | 0.992 | 0.020 | n/a | 0.354 | 8.409 | n/a | n/a | 0.046 | 3.182 | 0.231 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000001dc | 13.318 | 1.962 | n/a | 0.000 | 1.589 | 0.730 | 1.009 | 0.021 | n/a | 0.428 | 7.559 | n/a | n/a | 0.020 | 3.551 | 0.267 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000001a7 | 11.452 | 3.463 | n/a | 0.000 | 0.152 | 1.016 | 1.058 | 0.025 | n/a | 0.168 | 5.513 | n/a | n/a | 0.057 | 3.615 | 0.316 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000001b2 | 11.365 | 2.140 | n/a | 0.000 | 1.872 | 0.695 | 1.046 | 0.021 | n/a | 0.104 | 5.467 | n/a | n/a | 0.021 | 4.012 | 0.353 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.208 | 0.147 | 0.000 | 0.555 | 3.592 | n/a | 0.000 | 0.071 | 1.163 | 3.229 | 0.031 | n/a | 0.304 | 9.138 | n/a | n/a | 0.033 | 4.071 | 0.195 | 0.033 |
| p99 | 77.279 | 3.802 | 0.000 | 2.813 | 8.542 | n/a | 0.642 | 0.243 | 5.527 | 31.524 | 0.167 | n/a | 3.830 | 43.979 | n/a | n/a | 0.107 | 11.463 | 0.383 | 0.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b7800000000000002a7 | 80.990 | 8.542 | 0.149 | 0.470 | 0.058 | 1.918 | 15.113 | 0.054 | n/a | 0.304 | 54.357 | n/a | n/a | 0.023 | 9.220 | 0.114 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| d92e2598482d8b7800000000000001f0 | 77.279 | 13.555 | n/a | 1.879 | 0.138 | 5.696 | 31.524 | 0.167 | n/a | 3.337 | 20.870 | n/a | n/a | 0.114 | 15.571 | 0.201 | 0.114 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.021ms |
| d92e2598482d8b78000000000000023e | 53.410 | 3.722 | 0.235 | 0.271 | 0.059 | 1.666 | 33.181 | 0.023 | n/a | 0.324 | 13.896 | n/a | n/a | 0.034 | 4.287 | 0.080 | 0.034 | gw-w/thread-46/gateway.admitted-work | driver.reader-basis.broadcast 0.077ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.015ms |
| d92e2598482d8b7800000000000002ab | 50.851 | 5.620 | 0.259 | 0.582 | 0.060 | 1.722 | 6.868 | 0.026 | n/a | 19.649 | 16.038 | n/a | n/a | 0.027 | 6.522 | 0.128 | 0.027 | gw-w/thread-48/d/transact-async | driver.reader-basis.broadcast 0.040ms |
| d92e2598482d8b7800000000000001fc | 49.987 | 3.375 | n/a | 0.000 | 0.089 | 0.693 | 1.355 | 0.022 | n/a | 0.448 | 43.979 | n/a | n/a | 0.027 | 3.464 | 0.069 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000228 | 47.672 | 4.388 | n/a | 0.000 | 0.113 | 0.722 | 5.113 | 0.019 | n/a | 0.406 | 36.862 | n/a | n/a | 0.047 | 4.501 | 0.094 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000277 | 44.588 | 4.342 | 0.310 | 0.000 | 0.073 | 2.022 | 8.507 | 0.040 | n/a | 0.122 | 29.139 | n/a | n/a | 0.033 | 4.725 | 0.106 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| d92e2598482d8b7800000000000001f9 | 41.742 | 4.373 | 0.308 | 0.313 | 0.085 | 2.181 | 24.500 | 0.057 | n/a | 0.748 | 9.143 | n/a | n/a | 0.035 | 5.078 | 0.122 | 0.035 | gw-w/thread-41/gateway.admitted-work | driver.reader-basis.broadcast 0.051ms |
| d92e2598482d8b780000000000000299 | 39.481 | 3.994 | 0.249 | 0.368 | 0.175 | 1.746 | 10.834 | 0.051 | n/a | 0.595 | 21.405 | n/a | n/a | 0.063 | 4.786 | 0.121 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| d92e2598482d8b780000000000000291 | 38.002 | 6.127 | 0.249 | 0.555 | 0.076 | 1.648 | 7.027 | 0.046 | n/a | 3.072 | 19.165 | n/a | n/a | 0.037 | 7.007 | 0.184 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| d92e2598482d8b78000000000000021b | 36.662 | 4.249 | 0.426 | 0.361 | 0.053 | 5.527 | 15.769 | 0.047 | n/a | 0.510 | 9.674 | n/a | n/a | 0.046 | 5.089 | 0.139 | 0.046 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.114ms |
| d92e2598482d8b7800000000000001ee | 36.643 | 4.298 | 0.202 | 0.298 | 0.093 | 2.179 | 14.350 | 0.068 | n/a | 0.348 | 14.768 | n/a | n/a | 0.038 | 4.892 | 0.133 | 0.038 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| d92e2598482d8b780000000000000242 | 36.117 | 5.134 | 0.196 | 0.484 | 0.070 | 1.837 | 9.086 | 0.037 | n/a | 0.841 | 18.400 | n/a | n/a | 0.031 | 5.884 | 0.163 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| d92e2598482d8b780000000000000297 | 34.723 | 6.286 | 0.258 | 0.435 | 0.228 | 2.162 | 12.286 | 0.038 | n/a | 0.507 | 12.449 | n/a | n/a | 0.074 | 7.208 | 0.208 | 0.074 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.102ms |
| d92e2598482d8b7800000000000001f3 | 32.948 | 3.490 | 0.717 | 0.367 | 0.058 | 1.423 | 14.632 | 0.034 | n/a | 0.373 | 11.828 | n/a | n/a | 0.027 | 4.632 | 0.141 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms; driver.publication.persist-deferred 0.017ms |
| d92e2598482d8b780000000000000232 | 32.334 | 5.206 | 0.203 | 0.565 | 0.080 | 2.334 | 13.224 | 0.044 | n/a | 0.222 | 10.421 | n/a | n/a | 0.035 | 6.053 | 0.187 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.131ms |
| d92e2598482d8b780000000000000236 | 31.964 | 5.379 | 0.273 | 0.327 | 0.028 | 1.060 | 6.886 | 0.035 | n/a | 0.109 | 17.843 | n/a | n/a | 0.023 | 6.007 | 0.188 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.139ms; driver.reader-basis.broadcast 0.033ms |
| d92e2598482d8b78000000000000022c | 31.728 | 4.016 | 0.234 | 0.290 | 0.152 | 1.392 | 9.899 | 0.043 | n/a | 0.373 | 15.279 | n/a | n/a | 0.051 | 4.692 | 0.148 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| d92e2598482d8b780000000000000207 | 31.055 | 4.812 | 0.477 | 0.435 | 0.243 | 2.226 | 6.878 | 0.071 | n/a | 0.165 | 15.677 | n/a | n/a | 0.071 | 5.967 | 0.192 | 0.071 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| d92e2598482d8b780000000000000261 | 31.048 | 4.761 | n/a | 0.000 | 0.078 | 0.717 | 1.062 | 0.017 | n/a | 0.093 | 24.284 | n/a | n/a | 0.037 | 4.838 | 0.156 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (34 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.135 | 0.250 | 0.000 | 0.524 | 2.634 | n/a | 0.000 | 0.067 | 0.909 | 1.394 | 0.026 | n/a | 0.302 | 6.745 | n/a | n/a | 0.037 | 2.687 | 0.195 | 0.037 |
| p99 | 27.036 | 2.010 | 0.000 | 1.528 | 6.803 | n/a | 0.000 | 4.659 | 3.810 | 10.022 | 0.076 | n/a | 3.676 | 16.798 | n/a | n/a | 0.107 | 11.463 | 0.424 | 0.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b780000000000000221 | 27.036 | 6.803 | n/a | 0.000 | 4.659 | 3.054 | 10.022 | 0.044 | n/a | 0.253 | 2.154 | n/a | n/a | 0.046 | 11.463 | 0.424 | 0.046 | node-13/thread-0/driver.queue.scheduler-late | none observed |
| d92e2598482d8b780000000000000248 | 26.414 | 3.968 | n/a | 0.000 | 0.094 | 0.768 | 1.055 | 0.015 | n/a | 3.676 | 16.795 | n/a | n/a | 0.043 | 4.063 | 0.154 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.019ms |
| d92e2598482d8b780000000000000212 | 22.510 | 3.562 | n/a | 0.000 | 0.111 | 1.230 | 1.889 | 0.065 | n/a | 0.174 | 15.438 | n/a | n/a | 0.042 | 3.673 | 0.163 | 0.042 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000022d | 22.367 | 3.193 | n/a | 0.000 | 0.159 | 0.909 | 1.149 | 0.020 | n/a | 0.088 | 16.798 | n/a | n/a | 0.051 | 3.352 | 0.150 | 0.051 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000001ea | 21.517 | 3.513 | n/a | 0.000 | 0.067 | 0.820 | 4.904 | 0.035 | n/a | 0.862 | 11.285 | n/a | n/a | 0.032 | 3.580 | 0.166 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000029c | 20.743 | 2.410 | n/a | 0.000 | 0.104 | 3.810 | 2.126 | 0.040 | n/a | 0.183 | 12.020 | n/a | n/a | 0.051 | 2.514 | 0.121 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000023f | 19.006 | 2.849 | n/a | 0.000 | 0.103 | 2.198 | 8.735 | 0.018 | n/a | 0.053 | 4.943 | n/a | n/a | 0.107 | 2.952 | 0.155 | 0.107 | gw-w/thread-48/commit.prepare-and-validate | none observed |
| d92e2598482d8b78000000000000021c | 18.761 | 3.056 | n/a | 0.000 | 0.067 | 1.057 | 2.497 | 0.053 | n/a | 0.157 | 11.844 | n/a | n/a | 0.030 | 3.123 | 0.166 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000204 | 17.037 | 2.139 | n/a | 0.000 | 0.060 | 0.827 | 1.147 | 0.026 | n/a | 0.128 | 12.661 | n/a | n/a | 0.049 | 2.199 | 0.129 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000225 | 16.892 | 2.634 | n/a | 0.000 | 0.054 | 1.083 | 1.917 | 0.053 | n/a | 0.174 | 10.951 | n/a | n/a | 0.027 | 2.687 | 0.159 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000234 | 16.377 | 3.376 | n/a | 0.000 | 0.182 | 1.165 | 1.488 | 0.027 | n/a | 0.133 | 9.901 | n/a | n/a | 0.104 | 3.558 | 0.217 | 0.104 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000001ff | 16.094 | 1.905 | n/a | 0.000 | 0.062 | 0.831 | 1.299 | 0.026 | n/a | 0.479 | 11.465 | n/a | n/a | 0.027 | 1.967 | 0.122 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000002a4 | 15.915 | 2.618 | n/a | 0.000 | 0.053 | 1.191 | 5.428 | 0.039 | n/a | 0.237 | 6.312 | n/a | n/a | 0.037 | 2.671 | 0.168 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000027f | 15.240 | 2.442 | n/a | 0.000 | 0.056 | 0.972 | 4.338 | 0.023 | n/a | 0.090 | 7.292 | n/a | n/a | 0.026 | 2.498 | 0.164 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000001f6 | 15.044 | 2.119 | n/a | 0.000 | 0.081 | 1.120 | 2.192 | 0.076 | n/a | 0.799 | 8.612 | n/a | n/a | 0.047 | 2.200 | 0.146 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000267 | 14.856 | 4.796 | n/a | 0.000 | 0.085 | 1.642 | 6.281 | 0.032 | n/a | 0.342 | 1.631 | n/a | n/a | 0.047 | 4.882 | 0.329 | 0.047 | gw-w/thread-46/gateway.admitted-work | none observed |
| d92e2598482d8b78000000000000022a | 13.917 | 1.629 | n/a | 0.000 | 0.043 | 0.765 | 3.229 | 0.052 | n/a | 0.623 | 7.556 | n/a | n/a | 0.020 | 1.672 | 0.120 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000000274 | 13.135 | 3.738 | n/a | 0.000 | 0.113 | 0.996 | 2.086 | 0.040 | n/a | 0.211 | 5.899 | n/a | n/a | 0.052 | 3.851 | 0.293 | 0.052 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000025c | 12.949 | 3.542 | n/a | 0.000 | 0.112 | 0.935 | 1.150 | 0.020 | n/a | 0.392 | 6.745 | n/a | n/a | 0.052 | 3.653 | 0.282 | 0.052 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000002ac | 12.933 | 3.593 | n/a | 0.000 | 0.122 | 1.351 | 1.934 | 0.040 | n/a | 0.773 | 5.060 | n/a | n/a | 0.060 | 3.715 | 0.287 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (1706 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.594 | 0.430 | 0.000 | 0.526 | 2.257 | n/a | 0.000 | 0.044 | 0.595 | 1.035 | 0.013 | n/a | 0.108 | 5.917 | n/a | n/a | 0.015 | 2.560 | 0.230 | 0.015 |
| p99 | 41.196 | 2.287 | 0.041 | 2.078 | 6.818 | n/a | 0.297 | 13.104 | 6.252 | 8.136 | 0.052 | n/a | 2.879 | 32.178 | n/a | n/a | 0.049 | 16.934 | 0.638 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b780000000000000513 | 70.806 | 3.651 | n/a | 0.000 | 38.150 | 4.278 | 0.960 | 0.019 | n/a | 1.186 | 22.548 | n/a | n/a | 0.014 | 41.802 | 0.590 | 0.014 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.210ms; driver.reader-basis.broadcast 0.073ms; driver.publication.readback 0.052ms; driver.publication.readback 0.049ms; driver.publication.readback 0.045ms |
| d92e2598482d8b7800000000000002bc | 64.625 | 3.479 | 0.161 | 0.306 | 0.052 | 1.184 | 7.813 | 0.039 | n/a | 0.655 | 50.909 | n/a | n/a | 0.026 | 3.998 | 0.062 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.077ms; driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.021ms |
| d92e2598482d8b780000000000000825 | 61.769 | 4.956 | n/a | 0.000 | 39.076 | 0.452 | 3.739 | 0.011 | n/a | 0.441 | 13.078 | n/a | n/a | 0.016 | 44.032 | 0.713 | 0.016 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.142ms; driver.publication.readback 0.065ms; driver.publication.readback 0.056ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.045ms |
| d92e2598482d8b780000000000000512 | 61.243 | 1.536 | n/a | 0.000 | 27.542 | 2.710 | 0.566 | 0.013 | n/a | 0.038 | 28.824 | n/a | n/a | 0.014 | 29.078 | 0.475 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.073ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.027ms; driver.publication.persist-deferred 0.024ms |
| d92e2598482d8b780000000000000826 | 59.953 | 4.794 | n/a | 0.000 | 0.032 | 6.286 | 2.648 | 0.025 | n/a | 0.184 | 45.968 | n/a | n/a | 0.015 | 4.827 | 0.081 | 0.015 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.065ms; driver.publication.readback 0.056ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.045ms |
| d92e2598482d8b780000000000000822 | 56.200 | 2.322 | n/a | 0.000 | 35.826 | 2.144 | 0.693 | 0.011 | n/a | 0.315 | 14.875 | n/a | n/a | 0.014 | 38.148 | 0.679 | 0.014 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.142ms; driver.publication.readback 0.056ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.045ms; driver.publication.readback 0.039ms |
| d92e2598482d8b78000000000000038b | 52.342 | 5.392 | 0.247 | 0.406 | 0.012 | 1.173 | 6.419 | 0.023 | n/a | 0.062 | 38.597 | n/a | n/a | 0.010 | 6.057 | 0.116 | 0.010 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.272ms; driver.publication.readback 0.128ms; driver.reader-basis.broadcast 0.042ms; driver.publication.readback 0.024ms; driver.publication.persist-deferred 0.016ms |
| d92e2598482d8b780000000000000391 | 52.243 | 3.176 | n/a | 0.000 | 1.098 | 0.483 | 0.868 | 0.012 | n/a | 0.206 | 46.390 | n/a | n/a | 0.010 | 4.274 | 0.082 | 0.010 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.117ms; driver.publication.persist-deferred 0.014ms |
| d92e2598482d8b780000000000000558 | 50.652 | 16.429 | n/a | 2.214 | 0.048 | 5.908 | 4.873 | 0.035 | n/a | 0.996 | 20.128 | n/a | n/a | 0.022 | 18.691 | 0.369 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.016ms |
| d92e2598482d8b780000000000000c37 | 47.680 | 3.735 | n/a | 0.000 | 29.782 | 3.328 | 0.976 | 0.016 | n/a | 1.794 | 8.034 | n/a | n/a | 0.016 | 33.517 | 0.703 | 0.016 | node-13/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.020ms |
| d92e2598482d8b780000000000000824 | 47.378 | 3.015 | n/a | 0.000 | 3.883 | 5.686 | 0.871 | 0.006 | n/a | 0.569 | 33.341 | n/a | n/a | 0.006 | 6.898 | 0.146 | 0.006 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.045ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.029ms |
| d92e2598482d8b780000000000000516 | 45.521 | 2.798 | n/a | 0.000 | 0.398 | 0.561 | 1.698 | 0.046 | n/a | 0.153 | 39.859 | n/a | n/a | 0.008 | 3.196 | 0.070 | 0.008 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.073ms; driver.publication.readback 0.049ms; driver.publication.readback 0.045ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.027ms |
| d92e2598482d8b7800000000000007f0 | 45.378 | 4.702 | n/a | 0.000 | 0.134 | 0.657 | 1.001 | 0.010 | n/a | 0.044 | 38.820 | n/a | n/a | 0.010 | 4.836 | 0.107 | 0.010 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.183ms; driver.publication.readback 0.114ms; driver.publication.readback 0.101ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.026ms |
| d92e2598482d8b7800000000000009ec | 45.280 | 3.771 | n/a | 0.000 | 0.026 | 0.427 | 1.284 | 0.010 | n/a | 0.096 | 39.651 | n/a | n/a | 0.013 | 3.798 | 0.084 | 0.013 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.312ms; driver.publication.persist-deferred 0.176ms; driver.publication.readback 0.082ms; driver.publication.readback 0.055ms; driver.publication.readback 0.045ms |
| d92e2598482d8b780000000000000823 | 45.037 | 2.371 | n/a | 0.000 | 6.333 | 7.337 | 0.661 | 0.005 | n/a | 0.015 | 28.302 | n/a | n/a | 0.013 | 8.705 | 0.193 | 0.013 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.045ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.018ms |
| d92e2598482d8b780000000000000980 | 44.626 | 3.226 | 0.199 | 0.000 | 0.039 | 2.607 | 10.127 | 0.018 | n/a | 0.108 | 28.283 | n/a | n/a | 0.020 | 3.463 | 0.078 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.228ms; driver.publication.readback 0.111ms; driver.publication.readback 0.046ms; driver.publication.readback 0.029ms; driver.publication.persist-deferred 0.026ms |
| d92e2598482d8b78000000000000032f | 42.705 | 1.665 | n/a | 0.000 | 30.327 | 0.400 | 1.046 | 0.018 | n/a | 0.051 | 9.177 | n/a | n/a | 0.021 | 31.992 | 0.749 | 0.021 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.138ms; driver.publication.readback 0.085ms; driver.publication.readback 0.064ms; driver.publication.readback 0.053ms; driver.publication.readback 0.050ms |
| d92e2598482d8b7800000000000009ea | 41.196 | 2.240 | n/a | 0.000 | 7.882 | 3.544 | 1.346 | 0.021 | n/a | 2.026 | 24.126 | n/a | n/a | 0.011 | 10.122 | 0.246 | 0.011 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.312ms; driver.reader-basis.broadcast 0.119ms; driver.publication.readback 0.082ms; driver.publication.readback 0.055ms; driver.publication.readback 0.048ms |
| d92e2598482d8b780000000000000e55 | 41.127 | 1.146 | n/a | 0.000 | 1.380 | 1.674 | 0.376 | 0.004 | n/a | 0.013 | 36.529 | n/a | n/a | 0.005 | 2.525 | 0.061 | 0.005 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.146ms |
| d92e2598482d8b780000000000000e56 | 41.100 | 2.093 | n/a | 0.000 | 0.691 | 0.320 | 0.540 | 0.006 | n/a | 0.542 | 36.906 | n/a | n/a | 0.003 | 2.784 | 0.068 | 0.003 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.146ms; driver.publication.persist-deferred 0.025ms |

## P2 / L16 / commit / 5-10 facts (991 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.224 | 0.000 | 0.000 | 0.415 | 1.826 | n/a | 0.000 | 0.045 | 0.581 | 0.880 | 0.013 | n/a | 0.111 | 5.316 | n/a | n/a | 0.015 | 2.075 | 0.213 | 0.015 |
| p99 | 39.067 | 1.999 | 0.037 | 1.148 | 4.728 | n/a | 0.000 | 13.104 | 6.536 | 5.634 | 0.050 | n/a | 2.879 | 28.919 | n/a | n/a | 0.053 | 14.431 | 0.638 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b780000000000000512 | 61.243 | 1.536 | n/a | 0.000 | 27.542 | 2.710 | 0.566 | 0.013 | n/a | 0.038 | 28.824 | n/a | n/a | 0.014 | 29.078 | 0.475 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.073ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.027ms; driver.publication.persist-deferred 0.024ms |
| d92e2598482d8b780000000000000822 | 56.200 | 2.322 | n/a | 0.000 | 35.826 | 2.144 | 0.693 | 0.011 | n/a | 0.315 | 14.875 | n/a | n/a | 0.014 | 38.148 | 0.679 | 0.014 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.142ms; driver.publication.readback 0.056ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.045ms; driver.publication.readback 0.039ms |
| d92e2598482d8b780000000000000516 | 45.521 | 2.798 | n/a | 0.000 | 0.398 | 0.561 | 1.698 | 0.046 | n/a | 0.153 | 39.859 | n/a | n/a | 0.008 | 3.196 | 0.070 | 0.008 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.073ms; driver.publication.readback 0.049ms; driver.publication.readback 0.045ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.027ms |
| d92e2598482d8b780000000000000823 | 45.037 | 2.371 | n/a | 0.000 | 6.333 | 7.337 | 0.661 | 0.005 | n/a | 0.015 | 28.302 | n/a | n/a | 0.013 | 8.705 | 0.193 | 0.013 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.045ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.018ms |
| d92e2598482d8b78000000000000032f | 42.705 | 1.665 | n/a | 0.000 | 30.327 | 0.400 | 1.046 | 0.018 | n/a | 0.051 | 9.177 | n/a | n/a | 0.021 | 31.992 | 0.749 | 0.021 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.138ms; driver.publication.readback 0.085ms; driver.publication.readback 0.064ms; driver.publication.readback 0.053ms; driver.publication.readback 0.050ms |
| d92e2598482d8b7800000000000009ea | 41.196 | 2.240 | n/a | 0.000 | 7.882 | 3.544 | 1.346 | 0.021 | n/a | 2.026 | 24.126 | n/a | n/a | 0.011 | 10.122 | 0.246 | 0.011 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.312ms; driver.reader-basis.broadcast 0.119ms; driver.publication.readback 0.082ms; driver.publication.readback 0.055ms; driver.publication.readback 0.048ms |
| d92e2598482d8b780000000000000e55 | 41.127 | 1.146 | n/a | 0.000 | 1.380 | 1.674 | 0.376 | 0.004 | n/a | 0.013 | 36.529 | n/a | n/a | 0.005 | 2.525 | 0.061 | 0.005 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.146ms |
| d92e2598482d8b780000000000000e57 | 40.176 | 1.397 | n/a | 0.000 | 0.036 | 1.335 | 0.747 | 0.008 | n/a | 0.118 | 36.528 | n/a | n/a | 0.007 | 1.433 | 0.036 | 0.007 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.121ms; driver.publication.readback 0.030ms; driver.publication.persist-deferred 0.025ms; driver.publication.persist-deferred 0.006ms |
| d92e2598482d8b780000000000000c39 | 39.320 | 3.580 | n/a | 0.000 | 23.905 | 3.281 | 0.451 | 0.006 | n/a | 0.379 | 7.715 | n/a | n/a | 0.004 | 27.485 | 0.699 | 0.004 | node-13/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.020ms |
| d92e2598482d8b7800000000000007ff | 39.067 | 2.142 | n/a | 0.000 | 0.028 | 4.055 | 0.966 | 0.010 | n/a | 0.046 | 31.806 | n/a | n/a | 0.014 | 2.170 | 0.056 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.082ms; driver.publication.readback 0.511ms; driver.publication.readback 0.125ms; driver.reader-basis.broadcast 0.095ms; driver.publication.readback 0.077ms |
| d92e2598482d8b780000000000000c36 | 38.578 | 1.883 | n/a | 0.000 | 0.215 | 32.186 | 0.807 | 0.013 | n/a | 0.309 | 3.151 | n/a | n/a | 0.015 | 2.098 | 0.054 | 0.015 | node-13/thread-0/socket.wait-first-byte | none observed |
| d92e2598482d8b7800000000000007b2 | 38.569 | 1.804 | n/a | 0.000 | 0.066 | 1.088 | 1.216 | 0.021 | n/a | 0.082 | 34.267 | n/a | n/a | 0.026 | 1.870 | 0.048 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.059ms; driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.011ms |
| d92e2598482d8b7800000000000005d5 | 38.553 | 1.875 | n/a | 0.000 | 25.270 | 0.455 | 2.424 | 0.022 | n/a | 0.054 | 8.441 | n/a | n/a | 0.012 | 27.145 | 0.704 | 0.012 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.075ms; driver.reader-basis.broadcast 0.066ms; driver.publication.readback 0.063ms; driver.publication.readback 0.059ms; driver.publication.readback 0.049ms |
| d92e2598482d8b7800000000000005d4 | 37.192 | 1.131 | n/a | 0.000 | 0.021 | 0.673 | 0.858 | 0.010 | n/a | 0.045 | 34.443 | n/a | n/a | 0.011 | 1.152 | 0.031 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.075ms; driver.reader-basis.broadcast 0.066ms; driver.publication.readback 0.059ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.025ms |
| d92e2598482d8b7800000000000009ee | 36.353 | 1.433 | n/a | 0.000 | 0.022 | 0.632 | 0.848 | 0.013 | n/a | 0.134 | 33.259 | n/a | n/a | 0.012 | 1.455 | 0.040 | 0.012 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.312ms; driver.publication.persist-deferred 0.176ms; driver.publication.readback 0.082ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.021ms |
| d92e2598482d8b780000000000000390 | 36.238 | 1.425 | n/a | 0.000 | 0.023 | 0.469 | 0.840 | 0.022 | n/a | 0.392 | 33.054 | n/a | n/a | 0.013 | 1.449 | 0.040 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000051c | 36.111 | 1.535 | n/a | 0.000 | 13.723 | 1.998 | 1.482 | 0.037 | n/a | 1.380 | 15.944 | n/a | n/a | 0.013 | 15.258 | 0.423 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.210ms; driver.publication.readback 0.062ms; driver.publication.readback 0.060ms; driver.publication.readback 0.034ms; driver.publication.persist-deferred 0.021ms |
| d92e2598482d8b7800000000000005d2 | 34.192 | 1.122 | n/a | 0.000 | 0.013 | 0.265 | 0.564 | 0.005 | n/a | 0.035 | 32.178 | n/a | n/a | 0.008 | 1.136 | 0.033 | 0.008 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.066ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.015ms |
| d92e2598482d8b7800000000000008df | 33.905 | 1.202 | n/a | 0.000 | 27.451 | 0.249 | 1.099 | 0.010 | n/a | 0.274 | 3.610 | n/a | n/a | 0.010 | 28.652 | 0.845 | 0.010 | node-13/thread-0/driver.queue.subject | none observed |
| d92e2598482d8b780000000000000392 | 33.594 | 1.898 | n/a | 0.000 | 0.037 | 1.992 | 0.626 | 0.013 | n/a | 0.082 | 28.919 | n/a | n/a | 0.027 | 1.935 | 0.058 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.117ms; driver.publication.persist-deferred 0.031ms; driver.publication.persist-deferred 0.014ms |

## P2 / L64 / commit (1772 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.188 | 0.310 | 0.000 | 0.516 | 2.170 | n/a | 0.000 | 0.036 | 0.524 | 0.901 | 0.012 | n/a | 0.085 | 5.146 | n/a | n/a | 0.013 | 2.455 | 0.252 | 0.013 |
| p99 | 45.541 | 2.509 | 0.035 | 1.954 | 6.893 | n/a | 0.260 | 13.820 | 6.618 | 8.225 | 0.048 | n/a | 2.658 | 36.841 | n/a | n/a | 0.039 | 15.587 | 0.653 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b7800000000000011ce | 125.570 | 1.219 | n/a | 0.000 | 118.280 | 1.744 | 0.609 | 0.006 | n/a | 0.025 | 3.674 | n/a | n/a | 0.012 | 119.500 | 0.952 | 0.012 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.552ms; driver.reader-basis.broadcast 0.199ms; driver.reader-basis.broadcast 0.191ms; driver.publication.readback 0.064ms; driver.publication.readback 0.060ms |
| d92e2598482d8b7800000000000011cc | 121.578 | 4.707 | n/a | 0.000 | 0.062 | 5.871 | 2.103 | 0.032 | n/a | 0.195 | 108.588 | n/a | n/a | 0.022 | 4.769 | 0.039 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.552ms; driver.reader-basis.broadcast 0.199ms; driver.reader-basis.broadcast 0.191ms; driver.publication.readback 0.064ms; driver.publication.readback 0.060ms |
| d92e2598482d8b7800000000000011d7 | 89.242 | 2.571 | n/a | 0.000 | 66.409 | 0.290 | 1.145 | 0.020 | n/a | 2.658 | 16.141 | n/a | n/a | 0.009 | 68.980 | 0.773 | 0.009 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.552ms; driver.reader-basis.broadcast 0.199ms; driver.publication.readback 0.064ms; driver.publication.readback 0.063ms; driver.publication.readback 0.053ms |
| d92e2598482d8b7800000000000011d3 | 81.674 | 3.490 | n/a | 0.000 | 0.023 | 0.609 | 0.861 | 0.008 | n/a | 0.049 | 76.623 | n/a | n/a | 0.010 | 3.514 | 0.043 | 0.010 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.552ms; driver.reader-basis.broadcast 0.199ms; driver.publication.readback 0.064ms; driver.publication.readback 0.050ms; driver.publication.readback 0.038ms |
| d92e2598482d8b7800000000000011d0 | 77.475 | 3.535 | n/a | 0.000 | 1.447 | 0.471 | 0.878 | 0.007 | n/a | 0.028 | 71.102 | n/a | n/a | 0.008 | 4.982 | 0.064 | 0.008 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.060ms; driver.publication.readback 0.050ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms |
| d92e2598482d8b7800000000000011d2 | 73.751 | 3.006 | n/a | 0.000 | 0.045 | 0.559 | 1.080 | 0.027 | n/a | 0.058 | 68.960 | n/a | n/a | 0.017 | 3.051 | 0.041 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.552ms; driver.publication.readback 0.050ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.016ms |
| d92e2598482d8b7800000000000011d4 | 73.420 | 1.687 | n/a | 0.000 | 1.962 | 0.388 | 0.842 | 0.010 | n/a | 0.063 | 68.458 | n/a | n/a | 0.010 | 3.649 | 0.050 | 0.010 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.552ms; driver.reader-basis.broadcast 0.199ms; driver.publication.readback 0.064ms; driver.publication.readback 0.053ms; driver.publication.readback 0.050ms |
| d92e2598482d8b780000000000001189 | 59.727 | 1.901 | n/a | 0.000 | 18.693 | 0.940 | 0.656 | 0.014 | n/a | 0.102 | 37.405 | n/a | n/a | 0.015 | 20.594 | 0.345 | 0.015 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.225ms; driver.publication.readback 0.118ms; driver.publication.readback 0.107ms; driver.publication.readback 0.066ms; driver.publication.readback 0.063ms |
| d92e2598482d8b7800000000000011cb | 58.112 | 5.895 | n/a | 0.000 | 0.053 | 3.623 | 2.009 | 0.023 | n/a | 0.078 | 46.403 | n/a | n/a | 0.028 | 5.948 | 0.102 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.191ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.017ms |
| d92e2598482d8b780000000000001561 | 52.700 | 1.970 | n/a | 0.000 | 38.543 | 0.467 | 0.722 | 0.018 | n/a | 0.058 | 10.907 | n/a | n/a | 0.015 | 40.513 | 0.769 | 0.015 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.073ms; driver.publication.readback 0.071ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.044ms; driver.publication.readback 0.034ms |
| d92e2598482d8b780000000000001b38 | 48.719 | 1.986 | n/a | 0.000 | 0.246 | 3.005 | 0.852 | 0.014 | n/a | 0.047 | 42.563 | n/a | n/a | 0.007 | 2.232 | 0.046 | 0.007 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.239ms; driver.publication.readback 0.108ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.039ms; driver.publication.persist-deferred 0.020ms |
| d92e2598482d8b7800000000000011cf | 48.382 | 9.673 | 0.175 | 0.000 | 0.017 | 1.128 | 0.927 | 0.015 | n/a | 0.043 | 36.397 | n/a | n/a | 0.007 | 9.864 | 0.204 | 0.007 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.003ms |
| d92e2598482d8b78000000000000118c | 48.196 | 2.095 | n/a | 0.000 | 0.060 | 0.430 | 0.825 | 0.012 | n/a | 0.075 | 44.671 | n/a | n/a | 0.027 | 2.156 | 0.045 | 0.027 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.225ms; driver.publication.readback 0.107ms; driver.publication.readback 0.066ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.033ms |
| d92e2598482d8b78000000000000121e | 47.895 | 1.949 | n/a | 0.000 | 26.287 | 2.010 | 1.711 | 0.010 | n/a | 1.612 | 14.301 | n/a | n/a | 0.016 | 28.236 | 0.590 | 0.016 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.661ms; driver.expected-state.bind-receipt 1.128ms; driver.reader-basis.broadcast 0.460ms; driver.publication.readback 0.349ms; driver.publication.readback 0.128ms |
| d92e2598482d8b780000000000001c41 | 47.778 | 2.547 | n/a | 0.000 | 3.538 | 0.344 | 0.863 | 0.010 | n/a | 0.071 | 40.397 | n/a | n/a | 0.009 | 6.085 | 0.127 | 0.009 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.134ms; driver.publication.persist-deferred 0.023ms |
| d92e2598482d8b780000000000001b36 | 47.706 | 4.988 | n/a | 0.000 | 0.020 | 0.738 | 1.875 | 0.026 | n/a | 0.103 | 39.944 | n/a | n/a | 0.012 | 5.008 | 0.105 | 0.012 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.020ms |
| d92e2598482d8b78000000000000154f | 46.169 | 1.128 | n/a | 0.000 | 0.009 | 3.262 | 1.827 | 0.011 | n/a | 0.051 | 39.875 | n/a | n/a | 0.005 | 1.137 | 0.025 | 0.005 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.019ms |
| d92e2598482d8b78000000000000154e | 45.541 | 1.513 | n/a | 0.000 | 0.014 | 0.795 | 0.966 | 0.015 | n/a | 1.650 | 40.580 | n/a | n/a | 0.007 | 1.528 | 0.034 | 0.007 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001b39 | 45.234 | 2.939 | n/a | 0.000 | 0.015 | 1.409 | 2.040 | 0.051 | n/a | 0.158 | 38.615 | n/a | n/a | 0.008 | 2.954 | 0.065 | 0.008 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.239ms; driver.publication.readback 0.108ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.039ms |
| d92e2598482d8b7800000000000011cd | 44.991 | 1.858 | n/a | 0.000 | 0.017 | 1.287 | 0.528 | 0.006 | n/a | 0.022 | 41.266 | n/a | n/a | 0.008 | 1.875 | 0.042 | 0.008 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.191ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.017ms |

## P2 / L64 / commit / 5-10 facts (1059 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.876 | 0.000 | 0.000 | 0.398 | 1.772 | n/a | 0.000 | 0.037 | 0.520 | 0.776 | 0.012 | n/a | 0.084 | 4.574 | n/a | n/a | 0.013 | 1.992 | 0.239 | 0.013 |
| p99 | 40.597 | 2.001 | 0.033 | 1.034 | 4.927 | n/a | 0.000 | 12.511 | 6.781 | 4.713 | 0.044 | n/a | 1.953 | 34.856 | n/a | n/a | 0.042 | 14.369 | 0.621 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b7800000000000011ce | 125.570 | 1.219 | n/a | 0.000 | 118.280 | 1.744 | 0.609 | 0.006 | n/a | 0.025 | 3.674 | n/a | n/a | 0.012 | 119.500 | 0.952 | 0.012 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.552ms; driver.reader-basis.broadcast 0.199ms; driver.reader-basis.broadcast 0.191ms; driver.publication.readback 0.064ms; driver.publication.readback 0.060ms |
| d92e2598482d8b7800000000000011cc | 121.578 | 4.707 | n/a | 0.000 | 0.062 | 5.871 | 2.103 | 0.032 | n/a | 0.195 | 108.588 | n/a | n/a | 0.022 | 4.769 | 0.039 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.552ms; driver.reader-basis.broadcast 0.199ms; driver.reader-basis.broadcast 0.191ms; driver.publication.readback 0.064ms; driver.publication.readback 0.060ms |
| d92e2598482d8b7800000000000011d4 | 73.420 | 1.687 | n/a | 0.000 | 1.962 | 0.388 | 0.842 | 0.010 | n/a | 0.063 | 68.458 | n/a | n/a | 0.010 | 3.649 | 0.050 | 0.010 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.552ms; driver.reader-basis.broadcast 0.199ms; driver.publication.readback 0.064ms; driver.publication.readback 0.053ms; driver.publication.readback 0.050ms |
| d92e2598482d8b780000000000001189 | 59.727 | 1.901 | n/a | 0.000 | 18.693 | 0.940 | 0.656 | 0.014 | n/a | 0.102 | 37.405 | n/a | n/a | 0.015 | 20.594 | 0.345 | 0.015 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.225ms; driver.publication.readback 0.118ms; driver.publication.readback 0.107ms; driver.publication.readback 0.066ms; driver.publication.readback 0.063ms |
| d92e2598482d8b780000000000001561 | 52.700 | 1.970 | n/a | 0.000 | 38.543 | 0.467 | 0.722 | 0.018 | n/a | 0.058 | 10.907 | n/a | n/a | 0.015 | 40.513 | 0.769 | 0.015 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.073ms; driver.publication.readback 0.071ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.044ms; driver.publication.readback 0.034ms |
| d92e2598482d8b78000000000000118c | 48.196 | 2.095 | n/a | 0.000 | 0.060 | 0.430 | 0.825 | 0.012 | n/a | 0.075 | 44.671 | n/a | n/a | 0.027 | 2.156 | 0.045 | 0.027 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.225ms; driver.publication.readback 0.107ms; driver.publication.readback 0.066ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.033ms |
| d92e2598482d8b78000000000000121e | 47.895 | 1.949 | n/a | 0.000 | 26.287 | 2.010 | 1.711 | 0.010 | n/a | 1.612 | 14.301 | n/a | n/a | 0.016 | 28.236 | 0.590 | 0.016 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.661ms; driver.expected-state.bind-receipt 1.128ms; driver.reader-basis.broadcast 0.460ms; driver.publication.readback 0.349ms; driver.publication.readback 0.128ms |
| d92e2598482d8b78000000000000154f | 46.169 | 1.128 | n/a | 0.000 | 0.009 | 3.262 | 1.827 | 0.011 | n/a | 0.051 | 39.875 | n/a | n/a | 0.005 | 1.137 | 0.025 | 0.005 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.019ms |
| d92e2598482d8b78000000000000154e | 45.541 | 1.513 | n/a | 0.000 | 0.014 | 0.795 | 0.966 | 0.015 | n/a | 1.650 | 40.580 | n/a | n/a | 0.007 | 1.528 | 0.034 | 0.007 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000123e | 44.208 | 1.616 | n/a | 0.000 | 0.027 | 2.668 | 0.804 | 0.012 | n/a | 0.312 | 38.755 | n/a | n/a | 0.013 | 1.643 | 0.037 | 0.013 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000019e4 | 40.597 | 2.258 | n/a | 0.000 | 0.040 | 0.524 | 0.722 | 0.012 | n/a | 0.179 | 36.841 | n/a | n/a | 0.021 | 2.298 | 0.057 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.626ms |
| d92e2598482d8b780000000000001c43 | 40.024 | 1.254 | n/a | 0.000 | 0.026 | 2.096 | 0.515 | 0.010 | n/a | 0.041 | 36.072 | n/a | n/a | 0.011 | 1.280 | 0.032 | 0.011 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.134ms; driver.publication.persist-deferred 0.018ms |
| d92e2598482d8b780000000000001550 | 39.779 | 0.939 | n/a | 0.000 | 0.012 | 2.707 | 0.608 | 0.012 | n/a | 0.040 | 35.456 | n/a | n/a | 0.005 | 0.951 | 0.024 | 0.005 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.019ms |
| d92e2598482d8b780000000000001426 | 39.612 | 2.842 | n/a | 0.000 | 0.047 | 0.849 | 0.885 | 0.014 | n/a | 0.101 | 34.856 | n/a | n/a | 0.020 | 2.889 | 0.073 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.217ms |
| d92e2598482d8b7800000000000019c7 | 39.102 | 4.012 | n/a | 0.000 | 0.134 | 27.439 | 0.831 | 0.014 | n/a | 0.060 | 6.575 | n/a | n/a | 0.037 | 4.146 | 0.106 | 0.037 | node-13/thread-0/socket.wait-first-byte | driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.035ms |
| d92e2598482d8b780000000000001427 | 38.912 | 4.427 | n/a | 0.000 | 0.062 | 0.344 | 0.632 | 0.008 | n/a | 0.035 | 33.386 | n/a | n/a | 0.018 | 4.489 | 0.115 | 0.018 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.217ms; driver.publication.persist-deferred 0.030ms |
| d92e2598482d8b78000000000000123f | 38.760 | 1.527 | n/a | 0.000 | 0.042 | 1.952 | 1.336 | 0.029 | n/a | 0.689 | 33.167 | n/a | n/a | 0.017 | 1.569 | 0.040 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.019ms |
| d92e2598482d8b780000000000001c4a | 36.934 | 2.146 | n/a | 0.000 | 28.978 | 0.555 | 1.263 | 0.026 | n/a | 0.078 | 3.873 | n/a | n/a | 0.014 | 31.125 | 0.843 | 0.014 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.025ms; driver.reader-basis.broadcast 0.740ms; driver.publication.readback 0.559ms; driver.publication.readback 0.337ms; driver.publication.persist-deferred 0.278ms |
| d92e2598482d8b78000000000000120f | 35.899 | 5.245 | n/a | 0.000 | 0.036 | 5.643 | 15.072 | 0.041 | n/a | 0.177 | 9.673 | n/a | n/a | 0.013 | 5.281 | 0.147 | 0.013 | gw-w/thread-41/gateway.admitted-work | driver.publication.readback 0.064ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.039ms; driver.publication.readback 0.030ms; driver.publication.persist-deferred 0.019ms |
| d92e2598482d8b7800000000000013b8 | 35.739 | 2.051 | n/a | 0.000 | 0.074 | 0.337 | 0.722 | 0.012 | n/a | 0.267 | 32.249 | n/a | n/a | 0.026 | 2.125 | 0.059 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (95 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.268 | 0.147 | 0.000 | 0.449 | 3.199 | n/a | 0.000 | 0.041 | 0.805 | 2.196 | 0.021 | n/a | 0.087 | 6.789 | n/a | n/a | 0.019 | 3.489 | 0.220 | 0.019 |
| p99 | 161.902 | 2.686 | 0.022 | 1.898 | 9.565 | n/a | 0.470 | 2.387 | 3.960 | 39.097 | 0.061 | n/a | 1.968 | 158.056 | n/a | n/a | 0.044 | 10.391 | 0.405 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b780000000000001df5 | 161.902 | 1.963 | n/a | 0.000 | 0.058 | 0.602 | 0.911 | 0.012 | n/a | 0.279 | 158.056 | n/a | n/a | 0.022 | 2.021 | 0.012 | 0.022 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.327ms; driver.reader-basis.broadcast 0.326ms |
| d92e2598482d8b780000000000001e87 | 54.401 | 4.862 | n/a | 0.000 | 0.057 | 2.669 | 3.158 | 0.038 | n/a | 0.196 | 43.400 | n/a | n/a | 0.021 | 4.919 | 0.090 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e93 | 52.379 | 4.882 | 0.263 | 0.000 | 0.033 | 1.708 | 39.097 | 0.038 | n/a | 0.067 | 6.277 | n/a | n/a | 0.015 | 5.178 | 0.099 | 0.015 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| d92e2598482d8b780000000000001e20 | 44.327 | 9.565 | 0.733 | 0.000 | 0.093 | 2.930 | 4.187 | 0.061 | n/a | 0.661 | 26.066 | n/a | n/a | 0.031 | 10.391 | 0.234 | 0.031 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001dfd | 33.361 | 2.755 | n/a | 0.000 | 1.723 | 0.660 | 10.849 | 0.016 | n/a | 0.052 | 17.290 | n/a | n/a | 0.016 | 4.478 | 0.134 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e64 | 31.367 | 3.386 | 0.288 | 0.000 | 0.039 | 1.175 | 13.244 | 0.024 | n/a | 0.108 | 13.076 | n/a | n/a | 0.027 | 3.713 | 0.118 | 0.027 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e78 | 27.932 | 3.418 | 0.259 | 0.000 | 0.041 | 1.145 | 9.869 | 0.022 | n/a | 0.081 | 13.073 | n/a | n/a | 0.025 | 3.718 | 0.133 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001df3 | 27.380 | 3.951 | 0.343 | 0.333 | 0.041 | 1.308 | 10.357 | 0.044 | n/a | 0.088 | 10.892 | n/a | n/a | 0.023 | 4.668 | 0.170 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e7c | 25.392 | 3.334 | 0.242 | 0.000 | 0.040 | 1.247 | 7.463 | 0.036 | n/a | 0.469 | 12.545 | n/a | n/a | 0.016 | 3.617 | 0.142 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001df0 | 23.004 | 4.678 | 0.225 | 0.470 | 0.009 | 3.960 | 4.884 | 0.016 | n/a | 0.884 | 7.871 | n/a | n/a | 0.006 | 5.382 | 0.234 | 0.006 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.124ms; driver.publication.persist-deferred 0.018ms |
| d92e2598482d8b780000000000001e0a | 22.867 | 4.439 | 0.230 | 0.266 | 0.030 | 1.287 | 8.939 | 0.030 | n/a | 0.243 | 7.391 | n/a | n/a | 0.013 | 4.964 | 0.217 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e80 | 22.272 | 3.277 | 0.233 | 0.000 | 0.036 | 1.152 | 7.858 | 0.031 | n/a | 0.086 | 9.579 | n/a | n/a | 0.020 | 3.547 | 0.159 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e4e | 21.920 | 3.539 | 0.407 | 0.000 | 0.041 | 1.240 | 9.455 | 0.021 | n/a | 0.240 | 6.953 | n/a | n/a | 0.024 | 3.987 | 0.182 | 0.024 | gw-w/thread-62/gateway.admitted-work | none observed |
| d92e2598482d8b780000000000001e6a | 21.402 | 3.728 | 0.300 | 0.000 | 0.040 | 1.233 | 7.281 | 0.020 | n/a | 0.245 | 8.538 | n/a | n/a | 0.017 | 4.068 | 0.190 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e8a | 21.292 | 3.586 | 0.318 | 0.000 | 0.047 | 1.359 | 7.500 | 0.027 | n/a | 0.062 | 8.375 | n/a | n/a | 0.019 | 3.952 | 0.186 | 0.019 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e3c | 21.225 | 3.512 | 0.205 | 0.000 | 0.038 | 1.032 | 7.250 | 0.017 | n/a | 0.059 | 9.094 | n/a | n/a | 0.017 | 3.755 | 0.177 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e24 | 20.422 | 4.265 | 0.176 | 0.000 | 0.037 | 1.237 | 7.255 | 0.035 | n/a | 0.318 | 7.080 | n/a | n/a | 0.018 | 4.478 | 0.219 | 0.018 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e8f | 20.297 | 3.549 | 0.151 | 0.000 | 0.033 | 1.108 | 3.521 | 0.019 | n/a | 0.066 | 11.835 | n/a | n/a | 0.014 | 3.733 | 0.184 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e44 | 19.822 | 3.906 | 0.268 | 0.000 | 0.038 | 1.413 | 9.033 | 0.035 | n/a | 0.094 | 5.019 | n/a | n/a | 0.016 | 4.212 | 0.212 | 0.016 | gw-w/thread-46/gateway.admitted-work | none observed |
| d92e2598482d8b780000000000001e0c | 19.194 | 4.311 | 0.248 | 0.000 | 0.087 | 1.943 | 7.583 | 0.022 | n/a | 0.059 | 4.905 | n/a | n/a | 0.036 | 4.646 | 0.242 | 0.036 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.591 | 0.000 | 0.000 | 0.460 | 2.148 | n/a | 0.000 | 0.048 | 0.605 | 1.068 | 0.016 | n/a | 0.069 | 6.268 | n/a | n/a | 0.021 | 2.333 | 0.194 | 0.021 |
| p99 | 161.902 | 1.792 | 0.000 | 0.842 | 3.531 | n/a | 0.000 | 2.387 | 1.440 | 10.849 | 0.046 | n/a | 1.968 | 158.056 | n/a | n/a | 0.044 | 4.478 | 0.373 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b780000000000001df5 | 161.902 | 1.963 | n/a | 0.000 | 0.058 | 0.602 | 0.911 | 0.012 | n/a | 0.279 | 158.056 | n/a | n/a | 0.022 | 2.021 | 0.012 | 0.022 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.327ms; driver.reader-basis.broadcast 0.326ms |
| d92e2598482d8b780000000000001dfd | 33.361 | 2.755 | n/a | 0.000 | 1.723 | 0.660 | 10.849 | 0.016 | n/a | 0.052 | 17.290 | n/a | n/a | 0.016 | 4.478 | 0.134 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001dec | 16.518 | 2.529 | n/a | 0.000 | 0.049 | 0.605 | 5.533 | 0.043 | n/a | 0.097 | 7.641 | n/a | n/a | 0.022 | 2.577 | 0.156 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e01 | 15.535 | 1.991 | n/a | 0.000 | 0.040 | 0.458 | 1.327 | 0.014 | n/a | 0.056 | 11.632 | n/a | n/a | 0.017 | 2.031 | 0.131 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001def | 15.347 | 1.759 | n/a | 0.000 | 0.050 | 1.440 | 5.748 | 0.015 | n/a | 0.042 | 6.268 | n/a | n/a | 0.026 | 1.809 | 0.118 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e5a | 15.044 | 2.670 | n/a | 0.000 | 0.093 | 0.750 | 1.292 | 0.027 | n/a | 0.393 | 9.794 | n/a | n/a | 0.024 | 2.763 | 0.184 | 0.024 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.813ms |
| d92e2598482d8b780000000000001e21 | 14.613 | 2.056 | n/a | 0.000 | 2.387 | 0.692 | 1.643 | 0.031 | n/a | 1.968 | 5.817 | n/a | n/a | 0.018 | 4.444 | 0.304 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001ea0 | 13.979 | 2.356 | n/a | 0.000 | 0.096 | 1.189 | 5.070 | 0.035 | n/a | 0.358 | 4.838 | n/a | n/a | 0.036 | 2.453 | 0.175 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e0d | 13.268 | 2.145 | n/a | 0.000 | 0.042 | 0.543 | 2.970 | 0.016 | n/a | 0.060 | 7.475 | n/a | n/a | 0.018 | 2.187 | 0.165 | 0.018 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001ea8 | 13.085 | 3.304 | n/a | 0.000 | 0.087 | 0.498 | 0.910 | 0.012 | n/a | 0.068 | 8.162 | n/a | n/a | 0.044 | 3.391 | 0.259 | 0.044 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e2b | 13.025 | 2.148 | n/a | 0.000 | 0.053 | 0.528 | 0.968 | 0.014 | n/a | 0.060 | 9.231 | n/a | n/a | 0.024 | 2.201 | 0.169 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e17 | 12.422 | 1.568 | n/a | 0.000 | 0.030 | 0.381 | 0.747 | 0.012 | n/a | 0.044 | 9.623 | n/a | n/a | 0.018 | 1.597 | 0.129 | 0.018 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.276ms |
| d92e2598482d8b780000000000001e2f | 12.016 | 2.285 | n/a | 0.000 | 0.048 | 0.797 | 1.189 | 0.021 | n/a | 0.067 | 7.591 | n/a | n/a | 0.019 | 2.333 | 0.194 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e74 | 11.714 | 3.070 | n/a | 0.000 | 0.100 | 0.640 | 1.030 | 0.016 | n/a | 0.066 | 6.760 | n/a | n/a | 0.032 | 3.170 | 0.271 | 0.032 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e8b | 11.459 | 2.476 | n/a | 0.000 | 0.048 | 0.604 | 1.063 | 0.017 | n/a | 0.069 | 7.162 | n/a | n/a | 0.021 | 2.524 | 0.220 | 0.021 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e85 | 11.245 | 2.114 | n/a | 0.000 | 0.048 | 0.489 | 0.950 | 0.013 | n/a | 0.056 | 7.552 | n/a | n/a | 0.023 | 2.162 | 0.192 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.298ms |
| d92e2598482d8b780000000000001e4f | 10.930 | 2.085 | n/a | 0.000 | 0.045 | 0.726 | 1.605 | 0.028 | n/a | 0.090 | 6.328 | n/a | n/a | 0.023 | 2.131 | 0.195 | 0.023 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e27 | 10.591 | 1.896 | n/a | 0.000 | 0.038 | 0.653 | 1.504 | 0.025 | n/a | 0.096 | 6.360 | n/a | n/a | 0.017 | 1.934 | 0.183 | 0.017 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e03 | 10.371 | 1.819 | n/a | 0.000 | 0.034 | 0.638 | 1.201 | 0.046 | n/a | 0.073 | 6.542 | n/a | n/a | 0.017 | 1.854 | 0.179 | 0.017 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001e3d | 10.355 | 2.754 | n/a | 0.000 | 0.096 | 0.721 | 0.960 | 0.016 | n/a | 0.292 | 5.483 | n/a | n/a | 0.032 | 2.850 | 0.275 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.615ms |

## P2 / L1024 / commit (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.869 | 0.342 | 0.000 | 0.520 | 3.208 | n/a | 0.000 | 0.046 | 0.917 | 1.817 | 0.021 | n/a | 0.086 | 6.436 | n/a | n/a | 0.022 | 3.575 | 0.243 | 0.022 |
| p99 | 56.347 | 2.006 | 0.011 | 1.981 | 7.364 | n/a | 2.340 | 3.002 | 4.620 | 45.447 | 0.066 | n/a | 3.596 | 35.541 | n/a | n/a | 0.083 | 7.433 | 0.458 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b780000000000001f26 | 56.347 | 3.551 | 0.229 | 0.000 | 0.036 | 1.214 | 45.447 | 0.034 | n/a | 0.072 | 5.747 | n/a | n/a | 0.016 | 3.817 | 0.068 | 0.016 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.932ms |
| d92e2598482d8b780000000000001ec0 | 52.187 | 3.209 | 0.239 | 0.000 | 0.047 | 4.620 | 8.430 | 0.025 | n/a | 0.057 | 35.541 | n/a | n/a | 0.018 | 3.495 | 0.067 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.339ms |
| d92e2598482d8b780000000000001f4d | 39.571 | 4.152 | 0.223 | 0.000 | 0.074 | 4.307 | 17.419 | 0.025 | n/a | 0.121 | 13.227 | n/a | n/a | 0.023 | 4.449 | 0.112 | 0.023 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 1.040ms |
| d92e2598482d8b780000000000001eb9 | 35.683 | 2.128 | n/a | 0.000 | 0.043 | 0.966 | 1.936 | 0.026 | n/a | 0.066 | 30.498 | n/a | n/a | 0.020 | 2.172 | 0.061 | 0.020 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001ef1 | 33.812 | 1.640 | n/a | 0.000 | 0.059 | 0.448 | 1.021 | 0.035 | n/a | 0.073 | 30.509 | n/a | n/a | 0.026 | 1.699 | 0.050 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.375ms |
| d92e2598482d8b780000000000001ec3 | 31.774 | 7.364 | n/a | 0.000 | 0.069 | 4.502 | 15.179 | 0.063 | n/a | 0.628 | 3.937 | n/a | n/a | 0.031 | 7.433 | 0.234 | 0.031 | gw-w/thread-46/storage/begin-command! | driver.reader-basis.broadcast 0.841ms |
| d92e2598482d8b780000000000001ec5 | 31.563 | 3.466 | 0.245 | 0.000 | 0.039 | 0.955 | 8.821 | 0.018 | n/a | 0.329 | 17.671 | n/a | n/a | 0.019 | 3.750 | 0.119 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.330ms |
| d92e2598482d8b780000000000001ebd | 26.512 | 4.656 | n/a | 0.000 | 0.077 | 0.486 | 2.089 | 0.019 | n/a | 0.366 | 18.765 | n/a | n/a | 0.054 | 4.733 | 0.179 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.318ms |
| d92e2598482d8b780000000000001f45 | 25.837 | 3.640 | 0.166 | 0.000 | 0.037 | 4.059 | 6.153 | 0.026 | n/a | 0.229 | 11.511 | n/a | n/a | 0.016 | 3.843 | 0.149 | 0.016 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001eb7 | 22.428 | 4.096 | 0.271 | 0.000 | 0.046 | 1.380 | 8.200 | 0.017 | n/a | 0.059 | 8.340 | n/a | n/a | 0.020 | 4.413 | 0.197 | 0.020 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.357ms |
| d92e2598482d8b780000000000001ee3 | 22.232 | 3.309 | 0.234 | 0.000 | 0.036 | 0.917 | 11.967 | 0.027 | n/a | 0.076 | 5.652 | n/a | n/a | 0.015 | 3.578 | 0.161 | 0.015 | gw-w/thread-64/gateway.admitted-work | driver.reader-basis.broadcast 0.330ms |
| d92e2598482d8b780000000000001ecb | 21.426 | 3.944 | 0.283 | 0.000 | 0.040 | 1.141 | 5.638 | 0.021 | n/a | 0.318 | 10.025 | n/a | n/a | 0.015 | 4.267 | 0.199 | 0.015 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.928ms |
| d92e2598482d8b780000000000001ed0 | 20.906 | 6.160 | n/a | 0.000 | 0.092 | 0.994 | 1.583 | 0.032 | n/a | 0.111 | 11.889 | n/a | n/a | 0.045 | 6.252 | 0.299 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001f4b | 20.675 | 4.135 | 0.182 | 0.000 | 0.041 | 1.489 | 6.992 | 0.024 | n/a | 0.105 | 7.685 | n/a | n/a | 0.022 | 4.357 | 0.211 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001f2c | 20.224 | 3.208 | 0.172 | 0.000 | 0.038 | 2.691 | 2.681 | 0.034 | n/a | 0.123 | 11.257 | n/a | n/a | 0.020 | 3.418 | 0.169 | 0.020 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001f39 | 20.216 | 2.548 | n/a | 0.000 | 0.061 | 4.548 | 1.830 | 0.029 | n/a | 0.088 | 11.088 | n/a | n/a | 0.022 | 2.610 | 0.129 | 0.022 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001efa | 19.853 | 4.063 | 0.263 | 0.000 | 0.092 | 1.002 | 6.419 | 0.017 | n/a | 0.043 | 7.911 | n/a | n/a | 0.043 | 4.417 | 0.223 | 0.043 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.368ms |
| d92e2598482d8b780000000000001f06 | 19.830 | 3.160 | 0.169 | 0.000 | 0.037 | 0.881 | 8.784 | 0.026 | n/a | 0.122 | 6.634 | n/a | n/a | 0.017 | 3.366 | 0.170 | 0.017 | gw-w/thread-64/gateway.admitted-work | driver.reader-basis.broadcast 0.790ms |
| d92e2598482d8b780000000000001f0c | 19.578 | 4.913 | 0.358 | 0.000 | 0.034 | 1.791 | 2.897 | 0.046 | n/a | 0.108 | 9.417 | n/a | n/a | 0.014 | 5.305 | 0.271 | 0.014 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.716ms |
| d92e2598482d8b780000000000001ed7 | 19.216 | 3.638 | 0.286 | 0.000 | 0.105 | 0.977 | 4.580 | 0.019 | n/a | 0.066 | 9.516 | n/a | n/a | 0.029 | 4.028 | 0.210 | 0.029 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.351ms |

## P2 / L1024 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.152 | 0.499 | 0.000 | 0.467 | 2.530 | n/a | 0.000 | 0.061 | 0.704 | 1.226 | 0.018 | n/a | 0.082 | 5.662 | n/a | n/a | 0.025 | 2.610 | 0.246 | 0.025 |
| p99 | 35.683 | 2.006 | 0.011 | 1.014 | 7.364 | n/a | 2.340 | 3.002 | 4.548 | 15.179 | 0.066 | n/a | 0.628 | 30.509 | n/a | n/a | 0.076 | 7.433 | 0.458 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b780000000000001eb9 | 35.683 | 2.128 | n/a | 0.000 | 0.043 | 0.966 | 1.936 | 0.026 | n/a | 0.066 | 30.498 | n/a | n/a | 0.020 | 2.172 | 0.061 | 0.020 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001ef1 | 33.812 | 1.640 | n/a | 0.000 | 0.059 | 0.448 | 1.021 | 0.035 | n/a | 0.073 | 30.509 | n/a | n/a | 0.026 | 1.699 | 0.050 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.375ms |
| d92e2598482d8b780000000000001ec3 | 31.774 | 7.364 | n/a | 0.000 | 0.069 | 4.502 | 15.179 | 0.063 | n/a | 0.628 | 3.937 | n/a | n/a | 0.031 | 7.433 | 0.234 | 0.031 | gw-w/thread-46/storage/begin-command! | driver.reader-basis.broadcast 0.841ms |
| d92e2598482d8b780000000000001f39 | 20.216 | 2.548 | n/a | 0.000 | 0.061 | 4.548 | 1.830 | 0.029 | n/a | 0.088 | 11.088 | n/a | n/a | 0.022 | 2.610 | 0.129 | 0.022 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001ed4 | 19.085 | 4.879 | n/a | 0.000 | 0.173 | 0.835 | 2.074 | 0.066 | n/a | 0.220 | 10.786 | n/a | n/a | 0.053 | 5.052 | 0.265 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001f4e | 17.996 | 3.105 | n/a | 0.000 | 2.337 | 3.979 | 2.036 | 0.032 | n/a | 0.119 | 6.370 | n/a | n/a | 0.019 | 5.442 | 0.302 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001eec | 17.973 | 4.229 | n/a | 0.000 | 0.066 | 1.524 | 9.057 | 0.034 | n/a | 0.208 | 2.823 | n/a | n/a | 0.032 | 4.295 | 0.239 | 0.032 | gw-w/thread-46/storage/begin-command! | none observed |
| d92e2598482d8b780000000000001ee0 | 16.585 | 5.738 | n/a | 0.000 | 0.144 | 1.505 | 1.337 | 0.024 | n/a | 0.103 | 7.681 | n/a | n/a | 0.053 | 5.882 | 0.355 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001f56 | 14.562 | 3.450 | n/a | 0.000 | 0.139 | 1.042 | 1.238 | 0.017 | n/a | 0.082 | 8.519 | n/a | n/a | 0.076 | 3.589 | 0.246 | 0.076 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001eb2 | 14.255 | 4.610 | n/a | 0.000 | 0.126 | 1.191 | 1.206 | 0.024 | n/a | 0.083 | 6.968 | n/a | n/a | 0.047 | 4.736 | 0.332 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001efb | 13.884 | 2.414 | n/a | 0.000 | 0.058 | 0.708 | 4.121 | 0.017 | n/a | 0.620 | 5.919 | n/a | n/a | 0.027 | 2.472 | 0.178 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.131ms |
| d92e2598482d8b780000000000001f01 | 12.259 | 2.855 | n/a | 0.000 | 0.036 | 0.688 | 1.486 | 0.024 | n/a | 0.073 | 7.081 | n/a | n/a | 0.015 | 2.891 | 0.236 | 0.015 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001f03 | 12.041 | 1.765 | n/a | 0.000 | 0.050 | 0.704 | 1.501 | 0.028 | n/a | 0.088 | 7.886 | n/a | n/a | 0.018 | 1.816 | 0.151 | 0.018 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001edd | 11.901 | 2.885 | n/a | 0.000 | 0.061 | 0.411 | 1.990 | 0.012 | n/a | 0.208 | 6.309 | n/a | n/a | 0.025 | 2.945 | 0.247 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001f62 | 11.730 | 2.814 | n/a | 2.340 | 0.073 | 0.631 | 1.656 | 0.017 | n/a | 0.066 | 4.090 | n/a | n/a | 0.044 | 5.227 | 0.446 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001f59 | 11.687 | 1.857 | n/a | 0.000 | 0.047 | 0.559 | 1.464 | 0.023 | n/a | 0.092 | 7.621 | n/a | n/a | 0.024 | 1.904 | 0.163 | 0.024 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001eda | 11.551 | 3.003 | n/a | 0.000 | 0.082 | 0.744 | 0.893 | 0.015 | n/a | 0.083 | 6.703 | n/a | n/a | 0.028 | 3.085 | 0.267 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001eac | 11.152 | 2.433 | n/a | 0.000 | 0.041 | 1.495 | 1.128 | 0.018 | n/a | 0.066 | 5.947 | n/a | n/a | 0.024 | 2.474 | 0.222 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001eef | 10.868 | 2.310 | n/a | 0.000 | 0.031 | 0.669 | 0.943 | 0.016 | n/a | 0.054 | 6.828 | n/a | n/a | 0.016 | 2.341 | 0.215 | 0.016 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001ef5 | 10.581 | 2.293 | n/a | 0.000 | 0.040 | 0.600 | 1.091 | 0.019 | n/a | 0.079 | 6.436 | n/a | n/a | 0.023 | 2.333 | 0.220 | 0.023 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (365 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.271 | 0.213 | 0.000 | 0.528 | 3.412 | n/a | 0.000 | 0.050 | 0.830 | 1.613 | 0.021 | n/a | 0.093 | 5.716 | n/a | n/a | 0.033 | 3.747 | 0.284 | 0.033 |
| p99 | 48.875 | 2.787 | 0.028 | 2.755 | 8.314 | n/a | 1.909 | 1.884 | 4.308 | 22.203 | 0.071 | n/a | 0.972 | 15.520 | n/a | n/a | 0.111 | 10.117 | 0.531 | 0.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b7800000000000020c4 | 77.970 | 2.125 | n/a | 0.000 | 0.055 | 0.990 | 2.125 | 0.040 | n/a | 0.520 | 72.074 | n/a | n/a | 0.042 | 2.180 | 0.028 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.017ms |
| d92e2598482d8b780000000000001fdf | 54.544 | 1.564 | n/a | 0.000 | 0.038 | 0.473 | 1.939 | 0.014 | n/a | 0.235 | 50.249 | n/a | n/a | 0.031 | 1.602 | 0.029 | 0.031 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.350ms |
| d92e2598482d8b78000000000000219c | 54.314 | 4.535 | 0.278 | 0.000 | 0.055 | 1.609 | 32.930 | 0.035 | n/a | 0.661 | 14.168 | n/a | n/a | 0.043 | 4.868 | 0.090 | 0.043 | gw-w/thread-63/gateway.admitted-work | driver.reader-basis.broadcast 1.112ms |
| d92e2598482d8b7800000000000021d7 | 48.875 | 4.302 | n/a | 0.000 | 0.098 | 0.906 | 0.970 | 0.016 | n/a | 0.081 | 42.445 | n/a | n/a | 0.057 | 4.400 | 0.090 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.240ms |
| d92e2598482d8b780000000000002003 | 45.234 | 3.518 | 0.162 | 0.000 | 0.031 | 1.242 | 33.872 | 0.016 | n/a | 0.215 | 6.158 | n/a | n/a | 0.020 | 3.711 | 0.082 | 0.020 | gw-w/thread-64/gateway.admitted-work | none observed |
| d92e2598482d8b780000000000002232 | 43.489 | 3.556 | 0.308 | 0.000 | 0.153 | 1.109 | 29.765 | 0.018 | n/a | 0.077 | 8.438 | n/a | n/a | 0.066 | 4.017 | 0.092 | 0.066 | gw-w/thread-64/gateway.admitted-work | driver.reader-basis.broadcast 0.412ms |
| d92e2598482d8b780000000000001fac | 36.297 | 3.719 | 0.192 | 0.000 | 0.041 | 1.401 | 19.985 | 0.038 | n/a | 1.878 | 9.010 | n/a | n/a | 0.033 | 3.952 | 0.109 | 0.033 | gw-w/thread-63/gateway.admitted-work | none observed |
| d92e2598482d8b780000000000002096 | 31.514 | 3.804 | n/a | 0.000 | 0.047 | 0.574 | 22.203 | 0.028 | n/a | 0.050 | 4.776 | n/a | n/a | 0.031 | 3.850 | 0.122 | 0.031 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| d92e2598482d8b7800000000000020c8 | 31.270 | 7.093 | 0.328 | 0.000 | 0.041 | 4.710 | 6.870 | 0.024 | n/a | 0.448 | 11.722 | n/a | n/a | 0.032 | 7.462 | 0.239 | 0.032 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.107ms; driver.publication.persist-deferred 0.023ms |
| d92e2598482d8b780000000000002166 | 30.162 | 5.246 | 0.226 | 0.000 | 0.146 | 1.968 | 13.441 | 0.075 | n/a | 0.497 | 8.457 | n/a | n/a | 0.106 | 5.618 | 0.186 | 0.106 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.521ms |
| d92e2598482d8b7800000000000020d3 | 29.679 | 11.372 | 0.214 | 0.000 | 0.109 | 0.819 | 4.778 | 0.016 | n/a | 0.054 | 12.267 | n/a | n/a | 0.050 | 11.695 | 0.394 | 0.050 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001fd3 | 28.990 | 8.616 | n/a | 0.000 | 0.048 | 1.111 | 3.442 | 0.061 | n/a | 0.154 | 15.520 | n/a | n/a | 0.039 | 8.664 | 0.299 | 0.039 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000002076 | 28.985 | 3.401 | 0.249 | 0.000 | 0.068 | 0.828 | 14.675 | 0.027 | n/a | 0.117 | 9.584 | n/a | n/a | 0.037 | 3.718 | 0.128 | 0.037 | gw-w/thread-47/gateway.admitted-work | none observed |
| d92e2598482d8b780000000000001f8b | 28.779 | 3.342 | 0.173 | 0.000 | 0.050 | 1.181 | 18.774 | 0.035 | n/a | 0.279 | 4.912 | n/a | n/a | 0.033 | 3.564 | 0.124 | 0.033 | gw-w/thread-46/gateway.admitted-work | none observed |
| d92e2598482d8b780000000000002186 | 28.714 | 9.922 | n/a | 1.828 | 0.100 | 0.864 | 2.831 | 0.029 | n/a | 0.690 | 12.390 | n/a | n/a | 0.060 | 11.850 | 0.413 | 0.060 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000020e9 | 27.718 | 3.574 | 0.169 | 0.000 | 0.024 | 1.392 | 11.545 | 0.021 | n/a | 0.051 | 10.925 | n/a | n/a | 0.016 | 3.767 | 0.136 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000002136 | 27.160 | 3.348 | 0.157 | 0.341 | 0.030 | 1.040 | 10.074 | 0.025 | n/a | 0.081 | 12.037 | n/a | n/a | 0.027 | 3.876 | 0.143 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001fae | 25.594 | 4.778 | 0.254 | 0.000 | 0.047 | 3.219 | 8.053 | 0.034 | n/a | 0.667 | 8.506 | n/a | n/a | 0.035 | 5.079 | 0.198 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000002104 | 25.263 | 5.893 | 0.313 | 0.000 | 0.057 | 1.652 | 6.318 | 0.035 | n/a | 0.092 | 10.867 | n/a | n/a | 0.036 | 6.263 | 0.248 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000020b5 | 25.035 | 5.223 | 0.457 | 0.000 | 0.054 | 1.507 | 9.926 | 0.023 | n/a | 0.062 | 7.756 | n/a | n/a | 0.028 | 5.733 | 0.229 | 0.028 | gw-w/thread-63/gateway.admitted-work | none observed |

## P2 / tail / commit / 5-10 facts (109 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.398 | 0.155 | 0.000 | 0.487 | 2.529 | n/a | 0.000 | 0.053 | 0.654 | 1.005 | 0.016 | n/a | 0.086 | 5.115 | n/a | n/a | 0.034 | 2.700 | 0.260 | 0.034 |
| p99 | 54.544 | 1.651 | 0.030 | 0.931 | 5.423 | n/a | 0.000 | 2.642 | 3.101 | 5.090 | 0.054 | n/a | 0.818 | 50.249 | n/a | n/a | 0.107 | 5.916 | 0.473 | 0.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d92e2598482d8b7800000000000020c4 | 77.970 | 2.125 | n/a | 0.000 | 0.055 | 0.990 | 2.125 | 0.040 | n/a | 0.520 | 72.074 | n/a | n/a | 0.042 | 2.180 | 0.028 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.017ms |
| d92e2598482d8b780000000000001fdf | 54.544 | 1.564 | n/a | 0.000 | 0.038 | 0.473 | 1.939 | 0.014 | n/a | 0.235 | 50.249 | n/a | n/a | 0.031 | 1.602 | 0.029 | 0.031 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.350ms |
| d92e2598482d8b7800000000000021d7 | 48.875 | 4.302 | n/a | 0.000 | 0.098 | 0.906 | 0.970 | 0.016 | n/a | 0.081 | 42.445 | n/a | n/a | 0.057 | 4.400 | 0.090 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.240ms |
| d92e2598482d8b7800000000000020a2 | 20.160 | 6.060 | n/a | 0.000 | 0.055 | 1.911 | 3.003 | 0.059 | n/a | 0.818 | 8.225 | n/a | n/a | 0.028 | 6.115 | 0.303 | 0.028 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001ff3 | 17.116 | 4.994 | n/a | 0.000 | 0.034 | 1.666 | 4.576 | 0.025 | n/a | 0.226 | 5.562 | n/a | n/a | 0.033 | 5.029 | 0.294 | 0.033 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001fa0 | 16.301 | 5.423 | n/a | 0.000 | 0.039 | 1.357 | 6.695 | 0.054 | n/a | 0.123 | 2.560 | n/a | n/a | 0.050 | 5.461 | 0.335 | 0.050 | gw-w/thread-48/gateway.admitted-work | none observed |
| d92e2598482d8b780000000000001fa1 | 15.912 | 5.104 | n/a | 0.000 | 0.124 | 0.806 | 1.433 | 0.023 | n/a | 0.132 | 8.214 | n/a | n/a | 0.076 | 5.227 | 0.329 | 0.076 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000002058 | 15.832 | 4.026 | n/a | 0.000 | 0.117 | 1.090 | 2.642 | 0.025 | n/a | 2.578 | 5.263 | n/a | n/a | 0.090 | 4.143 | 0.262 | 0.090 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.619ms |
| d92e2598482d8b780000000000002126 | 15.558 | 1.779 | n/a | 0.000 | 0.042 | 0.762 | 1.577 | 0.033 | n/a | 0.193 | 11.140 | n/a | n/a | 0.032 | 1.821 | 0.117 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000002024 | 15.410 | 2.333 | n/a | 0.000 | 2.642 | 1.246 | 2.078 | 0.043 | n/a | 0.509 | 6.529 | n/a | n/a | 0.031 | 4.974 | 0.323 | 0.031 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000001fe8 | 14.983 | 2.709 | n/a | 0.000 | 0.045 | 0.540 | 1.064 | 0.015 | n/a | 0.098 | 10.477 | n/a | n/a | 0.035 | 2.754 | 0.184 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000223e | 14.740 | 2.268 | n/a | 0.000 | 0.066 | 0.466 | 4.613 | 0.015 | n/a | 0.171 | 7.105 | n/a | n/a | 0.036 | 2.334 | 0.158 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b78000000000000200a | 14.698 | 3.285 | n/a | 0.000 | 0.059 | 3.101 | 2.075 | 0.045 | n/a | 0.167 | 5.933 | n/a | n/a | 0.034 | 3.344 | 0.228 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000021c3 | 13.776 | 3.541 | n/a | 0.000 | 0.097 | 0.629 | 0.894 | 0.016 | n/a | 0.297 | 8.244 | n/a | n/a | 0.057 | 3.638 | 0.264 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000021cf | 13.775 | 2.775 | n/a | 0.000 | 0.855 | 0.814 | 5.090 | 0.029 | n/a | 0.097 | 4.093 | n/a | n/a | 0.023 | 3.630 | 0.264 | 0.023 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.841ms |
| d92e2598482d8b7800000000000020da | 13.548 | 2.833 | n/a | 0.000 | 0.056 | 0.725 | 0.962 | 0.014 | n/a | 0.059 | 8.866 | n/a | n/a | 0.034 | 2.889 | 0.213 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b780000000000002064 | 13.363 | 4.356 | n/a | 0.000 | 0.043 | 1.980 | 4.337 | 0.043 | n/a | 0.119 | 2.450 | n/a | n/a | 0.035 | 4.398 | 0.329 | 0.035 | node-13/thread-0/driver.execute | none observed |
| d92e2598482d8b7800000000000020f8 | 13.336 | 3.554 | n/a | 0.000 | 0.112 | 0.769 | 1.295 | 0.016 | n/a | 0.076 | 7.447 | n/a | n/a | 0.067 | 3.666 | 0.275 | 0.067 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| d92e2598482d8b7800000000000021da | 13.225 | 3.626 | n/a | 0.000 | 1.137 | 0.426 | 1.222 | 0.020 | n/a | 0.075 | 6.661 | n/a | n/a | 0.059 | 4.763 | 0.360 | 0.059 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.359ms |
| d92e2598482d8b780000000000001f76 | 13.183 | 2.320 | n/a | 0.000 | 1.631 | 0.549 | 0.950 | 0.014 | n/a | 0.061 | 7.631 | n/a | n/a | 0.028 | 3.951 | 0.300 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.109 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.396 | 200.471 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 |
| p99 | 393.131 | n/a | n/a | n/a | 18.275 | n/a | 3.675 | 0.000 | 7.692 | 388.870 | 0.118 | n/a | 0.150 | 0.000 | n/a | n/a | 44.827 | 21.950 | 0.271 | 44.827 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6020b1eba0a327220000000000000002 | 393.131 | 2.548 | n/a | 0.000 | 0.000 | 1.139 | 388.870 | 0.118 | n/a | 0.087 | 0.000 | n/a | n/a | 0.369 | 2.548 | 0.006 | 0.369 | gw-r/thread-45/gateway.admitted-work | none observed |
| 429eac72b0a436df0000000000000005 | 205.208 | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 204.129 | 0.012 | n/a | 0.129 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000000006 | 204.517 | 0.000 | n/a | 0.000 | 0.000 | 1.396 | 202.723 | 0.022 | n/a | 0.150 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-47/journal/page | none observed |
| 429eac72b0a436df0000000000000007 | 203.369 | 0.000 | n/a | 0.000 | 0.000 | 1.617 | 201.361 | 0.014 | n/a | 0.142 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-45/journal/page | none observed |
| 429eac72b0a436df0000000000001448 | 201.558 | 0.000 | n/a | 0.000 | 0.000 | 0.593 | 200.759 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df0000000000001449 | 201.109 | 0.000 | n/a | 0.000 | 0.000 | 0.528 | 200.471 | 0.003 | n/a | 0.030 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df000000000000144d | 87.358 | 17.490 | n/a | 0.000 | 0.000 | 2.368 | 67.345 | 0.004 | n/a | 0.006 | 0.000 | n/a | n/a | 0.146 | 17.490 | 0.200 | 0.146 | gw-r/thread-42/gateway.admitted-work | none observed |
| 429eac72b0a436df000000000000144c | 80.858 | 18.275 | n/a | 3.675 | 0.000 | 1.960 | 56.762 | 0.003 | n/a | 0.003 | 0.000 | n/a | n/a | 0.178 | 21.950 | 0.271 | 0.178 | gw-r/thread-49/gateway.admitted-work | none observed |
| 429eac72b0a436df000000000000144f | 66.322 | 13.924 | n/a | 1.212 | 0.000 | 6.358 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 44.827 | 15.136 | 0.228 | 44.827 | node-13/thread-5/socket.wait-first-byte | none observed |
| 429eac72b0a436df000000000000144e | 65.670 | 14.838 | n/a | 1.051 | 0.000 | 7.692 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.088 | 15.889 | 0.242 | 42.088 | node-13/thread-5/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 861.589 | n/a | n/a | n/a | 0.261 | n/a | 0.000 | 0.000 | 1.309 | 840.167 | 0.062 | n/a | 0.418 | 0.000 | n/a | n/a | 0.375 | 0.261 | 0.000 | 0.375 |
| p99 | 1006.964 | n/a | n/a | n/a | 13.802 | n/a | 0.000 | 0.000 | 1.512 | 1003.328 | 4.032 | n/a | 1.903 | 0.000 | n/a | n/a | 1.383 | 13.802 | 0.016 | 1.383 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6020b1eba0a3272200000000000000a4 | 1006.964 | 0.261 | n/a | 0.000 | 0.000 | 1.512 | 1003.328 | 0.062 | n/a | 0.418 | 0.000 | n/a | n/a | 1.383 | 0.261 | 0.000 | 1.383 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a3272200000000000000a5 | 861.589 | 13.802 | n/a | 0.000 | 0.000 | 1.309 | 840.167 | 4.032 | n/a | 1.903 | 0.000 | n/a | n/a | 0.375 | 13.802 | 0.016 | 0.375 | gw-r/thread-46/journal/page | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 427.272 | n/a | n/a | n/a | 2.557 | n/a | 0.000 | 0.000 | 0.732 | 419.874 | 0.014 | n/a | 0.090 | 0.000 | n/a | n/a | 0.123 | 2.557 | 0.006 | 0.123 |
| p99 | 1029.747 | n/a | n/a | n/a | 13.592 | n/a | 0.000 | 0.000 | 27.300 | 1001.074 | 0.046 | n/a | 0.150 | 0.000 | n/a | n/a | 19.552 | 13.592 | 0.132 | 19.552 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6020b1eba0a3272200000000000000cf | 1029.747 | 0.116 | n/a | 0.000 | 0.000 | 27.300 | 1001.074 | 0.014 | n/a | 0.123 | 0.000 | n/a | n/a | 1.119 | 0.116 | 0.000 | 1.119 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a3272200000000000000bb | 1005.565 | 2.595 | n/a | 0.000 | 0.000 | 1.903 | 1000.826 | 0.013 | n/a | 0.103 | 0.000 | n/a | n/a | 0.126 | 2.595 | 0.003 | 0.126 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a3272200000000000000b4 | 989.677 | 3.692 | n/a | 0.000 | 0.000 | 2.252 | 983.421 | 0.020 | n/a | 0.132 | 0.000 | n/a | n/a | 0.160 | 3.692 | 0.004 | 0.160 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a3272200000000000000ba | 973.108 | 2.515 | n/a | 0.000 | 0.000 | 0.637 | 969.643 | 0.014 | n/a | 0.140 | 0.000 | n/a | n/a | 0.159 | 2.515 | 0.003 | 0.159 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a3272200000000000000ae | 971.003 | 3.735 | n/a | 0.000 | 0.000 | 0.681 | 966.256 | 0.034 | n/a | 0.120 | 0.000 | n/a | n/a | 0.176 | 3.735 | 0.004 | 0.176 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a3272200000000000000ab | 773.572 | 3.999 | n/a | 0.000 | 0.000 | 0.565 | 768.576 | 0.017 | n/a | 0.099 | 0.000 | n/a | n/a | 0.315 | 3.999 | 0.005 | 0.315 | gw-r/thread-45/journal/page | none observed |
| 6020b1eba0a3272200000000000000b2 | 744.137 | 6.175 | n/a | 0.000 | 0.000 | 0.732 | 737.034 | 0.012 | n/a | 0.083 | 0.000 | n/a | n/a | 0.102 | 6.175 | 0.008 | 0.102 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a3272200000000000000c1 | 727.077 | 5.484 | n/a | 0.000 | 0.000 | 0.586 | 720.707 | 0.022 | n/a | 0.150 | 0.000 | n/a | n/a | 0.127 | 5.484 | 0.008 | 0.127 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a3272200000000000000a8 | 724.285 | 2.383 | n/a | 0.000 | 0.000 | 5.393 | 716.124 | 0.046 | n/a | 0.133 | 0.000 | n/a | n/a | 0.207 | 2.383 | 0.003 | 0.207 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a3272200000000000000c9 | 675.307 | 2.306 | n/a | 0.000 | 0.000 | 1.948 | 670.806 | 0.019 | n/a | 0.122 | 0.000 | n/a | n/a | 0.107 | 2.306 | 0.003 | 0.107 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a3272200000000000000bf | 651.644 | 2.487 | n/a | 0.000 | 0.000 | 0.618 | 648.333 | 0.018 | n/a | 0.081 | 0.000 | n/a | n/a | 0.106 | 2.487 | 0.004 | 0.106 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a3272200000000000000c6 | 643.281 | 2.430 | n/a | 0.000 | 0.000 | 0.643 | 640.026 | 0.014 | n/a | 0.083 | 0.000 | n/a | n/a | 0.085 | 2.430 | 0.004 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 6020b1eba0a3272200000000000000ca | 591.691 | 2.655 | n/a | 0.000 | 0.000 | 0.574 | 588.349 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.079 | 2.655 | 0.004 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a3272200000000000000b6 | 445.251 | 2.557 | n/a | 0.000 | 0.000 | 1.187 | 441.241 | 0.021 | n/a | 0.145 | 0.000 | n/a | n/a | 0.100 | 2.557 | 0.006 | 0.100 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a3272200000000000000a7 | 427.272 | 5.739 | n/a | 0.000 | 0.000 | 1.233 | 419.874 | 0.009 | n/a | 0.090 | 0.000 | n/a | n/a | 0.328 | 5.739 | 0.013 | 0.328 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a3272200000000000000b9 | 404.738 | 2.360 | n/a | 0.000 | 0.000 | 0.690 | 401.380 | 0.018 | n/a | 0.150 | 0.000 | n/a | n/a | 0.140 | 2.360 | 0.006 | 0.140 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a3272200000000000000c4 | 359.486 | 2.048 | n/a | 0.000 | 0.000 | 0.549 | 356.723 | 0.015 | n/a | 0.082 | 0.000 | n/a | n/a | 0.068 | 2.048 | 0.006 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a3272200000000000000c7 | 318.653 | 2.132 | n/a | 0.000 | 0.000 | 3.367 | 312.971 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.097 | 2.132 | 0.007 | 0.097 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a3272200000000000000c3 | 279.229 | 2.776 | n/a | 0.000 | 0.000 | 0.828 | 275.412 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 0.106 | 2.776 | 0.010 | 0.106 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a3272200000000000000b1 | 276.892 | 4.325 | n/a | 0.000 | 0.000 | 1.899 | 270.388 | 0.012 | n/a | 0.080 | 0.000 | n/a | n/a | 0.188 | 4.325 | 0.016 | 0.188 | gw-r/thread-44/journal/page | none observed |

## P3 / L1 / internal (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 439.997 | n/a | n/a | n/a | 3.762 | n/a | 0.000 | 0.000 | 0.633 | 427.135 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.115 | 4.153 | 0.009 | 0.115 |
| p99 | 1016.639 | n/a | n/a | n/a | 12.548 | n/a | 3.110 | 0.000 | 4.804 | 1009.631 | 0.713 | n/a | 2.971 | 0.000 | n/a | n/a | 43.367 | 13.516 | 0.537 | 43.367 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6020b1eba0a3272200000000000000d2 | 1016.639 | 4.434 | n/a | 0.896 | 0.000 | 1.426 | 1009.631 | 0.022 | n/a | 0.115 | 0.000 | n/a | n/a | 0.115 | 5.329 | 0.005 | 0.115 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a327220000000000000135 | 1008.591 | 5.214 | n/a | 0.000 | 0.000 | 0.818 | 1002.393 | 0.009 | n/a | 0.091 | 0.000 | n/a | n/a | 0.066 | 5.214 | 0.005 | 0.066 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000000129 | 1004.402 | 5.812 | n/a | 0.000 | 0.000 | 0.534 | 997.857 | 0.015 | n/a | 0.069 | 0.000 | n/a | n/a | 0.115 | 5.812 | 0.006 | 0.115 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a32722000000000000013e | 1003.729 | 2.680 | n/a | 0.000 | 0.000 | 0.492 | 1000.452 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.070 | 2.680 | 0.003 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a327220000000000000128 | 1003.674 | 4.592 | n/a | 0.000 | 0.000 | 0.782 | 998.157 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.102 | 4.592 | 0.005 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a327220000000000000112 | 1002.576 | 0.093 | n/a | 0.000 | 0.000 | 0.503 | 1000.833 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 1.091 | 0.093 | 0.000 | 1.091 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a327220000000000000151 | 1000.132 | 2.874 | n/a | 0.000 | 0.000 | 0.366 | 996.756 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.095 | 2.874 | 0.003 | 0.095 | gw-r/thread-45/journal/page | none observed |
| 6020b1eba0a327220000000000000104 | 1000.088 | 3.259 | n/a | 0.583 | 0.000 | 0.734 | 995.325 | 0.014 | n/a | 0.099 | 0.000 | n/a | n/a | 0.073 | 3.843 | 0.004 | 0.073 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000000100 | 999.764 | 3.249 | n/a | 0.000 | 0.000 | 0.618 | 995.754 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.084 | 3.249 | 0.003 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a3272200000000000000d9 | 992.561 | 3.570 | n/a | 3.110 | 0.000 | 0.363 | 985.332 | 0.013 | n/a | 0.060 | 0.000 | n/a | n/a | 0.112 | 6.680 | 0.007 | 0.112 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a32722000000000000010b | 991.543 | 3.442 | n/a | 0.565 | 0.000 | 1.786 | 985.628 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.077 | 4.007 | 0.004 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a3272200000000000000d8 | 989.506 | 3.262 | n/a | 0.597 | 0.000 | 1.802 | 983.645 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 0.134 | 3.859 | 0.004 | 0.134 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a32722000000000000011b | 983.527 | 3.560 | n/a | 0.582 | 0.000 | 0.476 | 978.722 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.135 | 4.142 | 0.004 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a3272200000000000000de | 980.445 | 3.642 | n/a | 0.555 | 0.000 | 1.404 | 974.600 | 0.020 | n/a | 0.110 | 0.000 | n/a | n/a | 0.114 | 4.197 | 0.004 | 0.114 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a3272200000000000000d1 | 956.177 | 5.902 | n/a | 1.151 | 0.000 | 1.051 | 947.644 | 0.013 | n/a | 0.074 | 0.000 | n/a | n/a | 0.342 | 7.053 | 0.007 | 0.342 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000000124 | 948.426 | 4.249 | n/a | 0.000 | 0.000 | 0.789 | 943.174 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.176 | 4.249 | 0.004 | 0.176 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a3272200000000000000fd | 936.021 | 5.874 | n/a | 0.684 | 0.000 | 0.633 | 928.667 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.092 | 6.558 | 0.007 | 0.092 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a3272200000000000000dd | 927.180 | 3.663 | n/a | 0.607 | 0.000 | 0.596 | 922.143 | 0.012 | n/a | 0.061 | 0.000 | n/a | n/a | 0.097 | 4.271 | 0.005 | 0.097 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a3272200000000000000e3 | 869.595 | 3.176 | n/a | 0.491 | 0.000 | 0.506 | 865.073 | 0.151 | n/a | 0.055 | 0.000 | n/a | n/a | 0.143 | 3.668 | 0.004 | 0.143 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a327220000000000000157 | 862.867 | 6.038 | n/a | 0.000 | 0.000 | 0.368 | 853.329 | 0.006 | n/a | 2.971 | 0.000 | n/a | n/a | 0.155 | 6.038 | 0.007 | 0.155 | gw-r/thread-42/journal/page | none observed |

## P3 / L4 / internal (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 362.269 | n/a | n/a | n/a | 3.031 | n/a | 0.000 | 0.000 | 0.584 | 355.951 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.087 | 3.087 | 0.010 | 0.087 |
| p99 | 1002.839 | n/a | n/a | n/a | 9.856 | n/a | 0.761 | 0.000 | 5.053 | 1000.805 | 0.022 | n/a | 0.070 | 0.000 | n/a | n/a | 40.067 | 10.433 | 0.460 | 40.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6020b1eba0a327220000000000000183 | 1003.856 | 0.156 | n/a | 0.000 | 0.000 | 1.103 | 1001.390 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 1.151 | 0.156 | 0.000 | 1.151 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a3272200000000000001e6 | 1002.839 | 0.234 | n/a | 0.000 | 0.000 | 0.657 | 1000.725 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 1.177 | 0.234 | 0.000 | 1.177 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a327220000000000000161 | 1002.819 | 0.128 | n/a | 0.000 | 0.000 | 0.701 | 1000.805 | 0.015 | n/a | 0.057 | 0.000 | n/a | n/a | 1.112 | 0.128 | 0.000 | 1.112 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000000171 | 1002.609 | 0.160 | n/a | 0.000 | 0.000 | 0.599 | 1000.672 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 1.139 | 0.160 | 0.000 | 1.139 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a327220000000000000182 | 998.743 | 2.307 | n/a | 0.000 | 0.000 | 5.345 | 990.961 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.061 | 2.307 | 0.002 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a3272200000000000001c0 | 997.970 | 2.549 | n/a | 0.000 | 0.000 | 0.584 | 994.726 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.070 | 2.549 | 0.003 | 0.070 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000000188 | 995.357 | 2.346 | n/a | 0.761 | 0.000 | 1.105 | 991.006 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.098 | 3.107 | 0.003 | 0.098 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a3272200000000000001a3 | 994.931 | 2.537 | n/a | 0.636 | 0.000 | 0.446 | 991.168 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.095 | 3.173 | 0.003 | 0.095 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a3272200000000000001c1 | 992.738 | 2.427 | n/a | 0.000 | 0.000 | 0.736 | 989.430 | 0.017 | n/a | 0.064 | 0.000 | n/a | n/a | 0.064 | 2.427 | 0.002 | 0.064 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a32722000000000000017c | 991.241 | 3.031 | n/a | 0.000 | 0.000 | 0.465 | 987.628 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.079 | 3.031 | 0.003 | 0.079 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a3272200000000000001a4 | 990.046 | 3.093 | n/a | 0.000 | 0.000 | 0.372 | 986.453 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.067 | 3.093 | 0.003 | 0.067 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a32722000000000000016b | 979.743 | 2.683 | n/a | 0.000 | 0.000 | 0.574 | 976.371 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.087 | 2.683 | 0.003 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a3272200000000000001a2 | 978.961 | 5.827 | n/a | 0.000 | 0.000 | 0.818 | 972.144 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.137 | 5.827 | 0.006 | 0.137 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a327220000000000000197 | 963.064 | 1.950 | n/a | 0.000 | 0.000 | 0.550 | 960.447 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.071 | 1.950 | 0.002 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a3272200000000000001f4 | 924.048 | 3.376 | n/a | 0.000 | 0.000 | 0.844 | 919.700 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.085 | 3.376 | 0.004 | 0.085 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a3272200000000000001be | 865.780 | 4.932 | n/a | 0.000 | 0.000 | 0.704 | 859.914 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.171 | 4.932 | 0.006 | 0.171 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a327220000000000000178 | 856.019 | 2.925 | n/a | 0.000 | 0.000 | 0.678 | 852.309 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.069 | 2.925 | 0.003 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a3272200000000000001f1 | 821.828 | 2.711 | n/a | 0.000 | 0.000 | 0.755 | 818.221 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.095 | 2.711 | 0.003 | 0.095 | gw-r/thread-45/journal/page | none observed |
| 6020b1eba0a32722000000000000019a | 807.851 | 6.551 | n/a | 0.000 | 0.000 | 1.023 | 800.135 | 0.005 | n/a | 0.067 | 0.000 | n/a | n/a | 0.069 | 6.551 | 0.008 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a3272200000000000001e4 | 751.059 | 2.295 | n/a | 0.000 | 0.000 | 2.442 | 746.192 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.082 | 2.295 | 0.003 | 0.082 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / internal (1523 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.297 | n/a | n/a | n/a | 3.320 | n/a | 0.000 | 0.000 | 0.221 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.154 | 3.320 | 0.279 | 7.154 |
| p99 | 337.839 | n/a | n/a | n/a | 13.026 | n/a | 1.039 | 0.000 | 0.946 | 334.920 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 47.848 | 13.473 | 0.822 | 47.848 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6020b1eba0a327220000000000000213 | 1002.680 | 0.102 | n/a | 0.000 | 0.000 | 0.362 | 1001.023 | 0.013 | n/a | 0.085 | 0.000 | n/a | n/a | 1.096 | 0.102 | 0.000 | 1.096 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a3272200000000000001fb | 1001.464 | 2.411 | n/a | 0.000 | 0.000 | 0.399 | 998.547 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.069 | 2.411 | 0.002 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000000215 | 998.224 | 2.313 | n/a | 0.000 | 0.000 | 0.472 | 995.284 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 0.088 | 2.313 | 0.002 | 0.088 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a32722000000000000020e | 995.441 | 2.286 | n/a | 0.000 | 0.000 | 0.433 | 992.603 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.064 | 2.286 | 0.002 | 0.064 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a327220000000000000221 | 984.659 | 2.219 | n/a | 0.000 | 0.000 | 0.590 | 981.729 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.073 | 2.219 | 0.002 | 0.073 | gw-r/thread-45/journal/page | none observed |
| 6020b1eba0a327220000000000000212 | 974.346 | 2.571 | n/a | 0.000 | 0.000 | 0.446 | 971.233 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.056 | 2.571 | 0.003 | 0.056 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a327220000000000000204 | 961.480 | 2.594 | n/a | 0.000 | 0.000 | 0.345 | 958.440 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.064 | 2.594 | 0.003 | 0.064 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a32722000000000000020f | 951.475 | 6.624 | n/a | 0.000 | 0.000 | 0.503 | 944.192 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.104 | 6.624 | 0.007 | 0.104 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000000222 | 790.712 | 2.795 | n/a | 0.000 | 0.000 | 0.655 | 787.141 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.074 | 2.795 | 0.004 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a327220000000000000216 | 789.030 | 1.673 | n/a | 0.000 | 0.000 | 1.160 | 786.092 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.061 | 1.673 | 0.002 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a3272200000000000001fc | 726.972 | 2.103 | n/a | 0.000 | 0.000 | 0.497 | 724.259 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.078 | 2.103 | 0.003 | 0.078 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a32722000000000000021e | 672.489 | 2.235 | n/a | 0.000 | 0.000 | 0.423 | 669.721 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.062 | 2.235 | 0.003 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a3272200000000000001ff | 662.944 | 2.301 | n/a | 0.000 | 0.000 | 2.973 | 657.568 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.058 | 2.301 | 0.003 | 0.058 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a327220000000000000219 | 636.862 | 2.019 | n/a | 0.000 | 0.000 | 0.451 | 634.288 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.055 | 2.019 | 0.003 | 0.055 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a32722000000000000020c | 570.464 | 4.014 | n/a | 0.000 | 0.000 | 0.624 | 565.696 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.056 | 4.014 | 0.007 | 0.056 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000000220 | 337.839 | 2.290 | n/a | 0.000 | 0.000 | 0.515 | 334.920 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.061 | 2.290 | 0.007 | 0.061 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a327220000000000000200 | 331.813 | 2.469 | n/a | 0.000 | 0.000 | 0.537 | 328.698 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.062 | 2.469 | 0.007 | 0.062 | gw-r/thread-45/journal/page | none observed |
| 6020b1eba0a3272200000000000001fd | 276.140 | 2.668 | n/a | 0.000 | 0.000 | 0.432 | 272.888 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.073 | 2.668 | 0.010 | 0.073 | gw-r/thread-45/journal/page | none observed |
| 6020b1eba0a32722000000000000021b | 253.032 | 3.998 | n/a | 0.000 | 0.000 | 0.407 | 248.446 | 0.013 | n/a | 0.054 | 0.000 | n/a | n/a | 0.114 | 3.998 | 0.016 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a32722000000000000020b | 247.907 | 2.471 | n/a | 0.000 | 0.000 | 0.330 | 245.007 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.064 | 2.471 | 0.010 | 0.064 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / internal (1531 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.940 | n/a | n/a | n/a | 4.150 | n/a | 0.000 | 0.000 | 0.207 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.310 | 4.173 | 0.342 | 6.310 |
| p99 | 389.975 | n/a | n/a | n/a | 17.146 | n/a | 1.415 | 0.000 | 1.397 | 386.709 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 47.436 | 17.717 | 0.867 | 47.436 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6020b1eba0a327220000000000001aaf | 1002.382 | 0.103 | n/a | 0.000 | 0.000 | 0.300 | 1000.810 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 1.096 | 0.103 | 0.000 | 1.096 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a327220000000000001a8b | 1001.943 | 0.094 | n/a | 0.000 | 0.000 | 0.240 | 1000.439 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 1.136 | 0.094 | 0.000 | 1.136 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a327220000000000001a95 | 1001.879 | 0.104 | n/a | 0.000 | 0.000 | 0.236 | 1000.412 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 1.088 | 0.104 | 0.000 | 1.088 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000001a8a | 985.603 | 3.813 | n/a | 0.000 | 0.000 | 0.552 | 981.152 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.060 | 3.813 | 0.004 | 0.060 | gw-r/thread-66/journal/page | none observed |
| 6020b1eba0a327220000000000001aa0 | 926.750 | 5.199 | n/a | 0.000 | 0.000 | 0.321 | 921.044 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.144 | 5.199 | 0.006 | 0.144 | gw-r/thread-45/journal/page | none observed |
| 6020b1eba0a327220000000000001a90 | 893.551 | 4.431 | n/a | 0.000 | 0.000 | 1.016 | 887.986 | 0.001 | n/a | 0.010 | 0.000 | n/a | n/a | 0.106 | 4.431 | 0.005 | 0.106 | gw-r/thread-66/journal/page | none observed |
| 6020b1eba0a327220000000000001ab3 | 833.111 | 2.117 | n/a | 0.000 | 0.000 | 0.658 | 830.229 | 0.002 | n/a | 0.041 | 0.000 | n/a | n/a | 0.064 | 2.117 | 0.003 | 0.064 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a327220000000000001a8d | 813.577 | 11.175 | n/a | 1.415 | 0.000 | 0.459 | 799.815 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.671 | 12.590 | 0.015 | 0.671 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a327220000000000001aac | 712.806 | 3.044 | n/a | 0.000 | 0.000 | 0.505 | 709.031 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.193 | 3.044 | 0.004 | 0.193 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000001aa7 | 664.904 | 4.915 | n/a | 0.000 | 0.000 | 0.544 | 659.307 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.112 | 4.915 | 0.007 | 0.112 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000001acb | 567.160 | 2.202 | n/a | 0.000 | 0.000 | 0.518 | 564.345 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.063 | 2.202 | 0.004 | 0.063 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000001a97 | 539.340 | 1.770 | n/a | 0.000 | 0.000 | 0.304 | 537.155 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.067 | 1.770 | 0.003 | 0.067 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a327220000000000001ab4 | 521.885 | 8.453 | n/a | 0.000 | 0.000 | 0.978 | 512.165 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.260 | 8.453 | 0.016 | 0.260 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a327220000000000001ac0 | 492.042 | 4.484 | n/a | 0.000 | 0.000 | 1.469 | 485.971 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.095 | 4.484 | 0.009 | 0.095 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000001ac2 | 432.357 | 3.516 | n/a | 0.000 | 0.000 | 0.490 | 428.225 | 0.002 | n/a | 0.012 | 0.000 | n/a | n/a | 0.113 | 3.516 | 0.008 | 0.113 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000001ac7 | 389.975 | 2.787 | n/a | 0.000 | 0.000 | 0.385 | 386.709 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.064 | 2.787 | 0.007 | 0.064 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a327220000000000001ac3 | 338.583 | 2.544 | n/a | 0.000 | 0.000 | 1.296 | 334.627 | 0.002 | n/a | 0.038 | 0.000 | n/a | n/a | 0.077 | 2.544 | 0.008 | 0.077 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a327220000000000001aa5 | 337.187 | 1.765 | n/a | 0.000 | 0.000 | 0.337 | 335.003 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.056 | 1.765 | 0.005 | 0.056 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a327220000000000001abe | 303.240 | 3.352 | n/a | 0.000 | 0.000 | 0.310 | 299.489 | 0.004 | n/a | 0.014 | 0.000 | n/a | n/a | 0.070 | 3.352 | 0.011 | 0.070 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a327220000000000001ab5 | 295.874 | 2.396 | n/a | 0.000 | 0.000 | 0.324 | 293.039 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.073 | 2.396 | 0.008 | 0.073 | gw-r/thread-42/journal/page | none observed |

## P3 / L256 / internal (98 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 366.388 | n/a | n/a | n/a | 3.085 | n/a | 0.000 | 0.000 | 0.433 | 357.360 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.085 | 3.100 | 0.010 | 0.085 |
| p99 | 1004.480 | n/a | n/a | n/a | 13.914 | n/a | 4.027 | 0.000 | 3.687 | 1000.604 | 0.134 | n/a | 0.063 | 0.000 | n/a | n/a | 42.247 | 15.653 | 0.527 | 42.247 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6020b1eba0a327220000000000001b20 | 1004.480 | 5.864 | n/a | 0.000 | 0.000 | 0.695 | 997.798 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.090 | 5.864 | 0.006 | 0.090 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a327220000000000001b24 | 1003.316 | 2.573 | n/a | 0.000 | 0.000 | 0.402 | 1000.231 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.061 | 2.573 | 0.003 | 0.061 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000001ad1 | 1003.019 | 2.639 | n/a | 0.000 | 0.000 | 0.335 | 999.948 | 0.008 | n/a | 0.024 | 0.000 | n/a | n/a | 0.065 | 2.639 | 0.003 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a327220000000000001b11 | 1002.609 | 0.086 | n/a | 0.000 | 0.000 | 0.946 | 1000.439 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 1.100 | 0.086 | 0.000 | 1.100 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000001b38 | 1002.475 | 0.132 | n/a | 0.000 | 0.000 | 0.571 | 1000.604 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 1.124 | 0.132 | 0.000 | 1.124 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a327220000000000001b2c | 1002.156 | 0.108 | n/a | 0.000 | 0.000 | 0.368 | 1000.540 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 1.099 | 0.108 | 0.000 | 1.099 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000001b1f | 1001.013 | 2.464 | n/a | 0.000 | 0.000 | 0.587 | 997.834 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.080 | 2.464 | 0.002 | 0.080 | gw-r/thread-66/journal/page | none observed |
| 6020b1eba0a327220000000000001ad5 | 1000.376 | 6.064 | n/a | 0.000 | 0.000 | 0.399 | 993.749 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.136 | 6.064 | 0.006 | 0.136 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000001b52 | 1000.282 | 3.074 | n/a | 0.000 | 0.000 | 0.477 | 996.617 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.068 | 3.074 | 0.003 | 0.068 | gw-r/thread-66/journal/page | none observed |
| 6020b1eba0a327220000000000001b51 | 999.873 | 5.766 | n/a | 0.000 | 0.000 | 0.550 | 993.410 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.123 | 5.766 | 0.006 | 0.123 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000001b25 | 998.055 | 2.562 | n/a | 0.000 | 0.000 | 0.292 | 995.113 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.062 | 2.562 | 0.003 | 0.062 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a327220000000000001ae4 | 996.851 | 4.152 | n/a | 0.000 | 0.000 | 0.485 | 992.082 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.105 | 4.152 | 0.004 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a327220000000000001b16 | 996.575 | 2.340 | n/a | 0.000 | 0.000 | 0.480 | 993.655 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.058 | 2.340 | 0.002 | 0.058 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a327220000000000001b40 | 985.749 | 10.505 | n/a | 4.027 | 0.000 | 0.788 | 969.982 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.405 | 14.532 | 0.015 | 0.405 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000001b53 | 935.548 | 11.471 | n/a | 1.512 | 0.000 | 3.687 | 918.535 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.319 | 12.983 | 0.014 | 0.319 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000001b4e | 913.942 | 4.586 | n/a | 0.648 | 0.000 | 0.394 | 908.201 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.085 | 5.235 | 0.006 | 0.085 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a327220000000000001af6 | 863.721 | 2.456 | n/a | 0.000 | 0.000 | 0.376 | 860.788 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.055 | 2.456 | 0.003 | 0.055 | gw-r/thread-45/journal/page | none observed |
| 6020b1eba0a327220000000000001ad2 | 863.298 | 2.293 | n/a | 0.000 | 0.000 | 0.532 | 860.367 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.072 | 2.293 | 0.003 | 0.072 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000001b15 | 850.169 | 5.726 | n/a | 0.000 | 0.000 | 0.651 | 843.660 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.109 | 5.726 | 0.007 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a327220000000000001b3d | 812.103 | 2.242 | n/a | 0.000 | 0.000 | 0.333 | 809.422 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.071 | 2.242 | 0.003 | 0.071 | gw-r/thread-42/journal/page | none observed |

## P3 / L1024 / internal (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 395.045 | n/a | n/a | n/a | 3.115 | n/a | 0.000 | 0.000 | 0.514 | 389.783 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.089 | 3.274 | 0.011 | 0.089 |
| p99 | 1004.692 | n/a | n/a | n/a | 11.089 | n/a | 1.301 | 0.000 | 31.460 | 1002.950 | 0.486 | n/a | 0.051 | 0.000 | n/a | n/a | 49.568 | 11.790 | 0.761 | 49.568 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6020b1eba0a327220000000000001bd9 | 1004.692 | 0.149 | n/a | 0.000 | 0.000 | 0.416 | 1002.950 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 1.120 | 0.149 | 0.000 | 1.120 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a327220000000000001be0 | 1004.569 | 2.983 | n/a | 0.000 | 0.000 | 0.275 | 1001.153 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.123 | 2.983 | 0.003 | 0.123 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000001be6 | 1002.428 | 2.793 | n/a | 0.000 | 0.000 | 1.057 | 998.487 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.060 | 2.793 | 0.003 | 0.060 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a327220000000000001bbc | 1002.250 | 0.181 | n/a | 0.000 | 0.000 | 0.495 | 1000.413 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 1.130 | 0.181 | 0.000 | 1.130 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a327220000000000001bc4 | 1001.712 | 4.912 | n/a | 0.000 | 0.000 | 0.326 | 996.333 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.113 | 4.912 | 0.005 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a327220000000000001bb4 | 1001.710 | 2.410 | n/a | 0.000 | 0.000 | 0.573 | 998.602 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.069 | 2.410 | 0.002 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a327220000000000001bbb | 1000.824 | 2.722 | n/a | 0.000 | 0.000 | 0.439 | 997.565 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.072 | 2.722 | 0.003 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a327220000000000001bac | 998.452 | 4.425 | n/a | 0.000 | 0.000 | 1.709 | 992.205 | 0.002 | n/a | 0.032 | 0.000 | n/a | n/a | 0.079 | 4.425 | 0.004 | 0.079 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000001b8f | 998.082 | 2.586 | n/a | 0.771 | 0.000 | 1.614 | 992.992 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.094 | 3.357 | 0.003 | 0.094 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a327220000000000001bca | 997.511 | 2.522 | n/a | 0.000 | 0.000 | 0.305 | 994.580 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.062 | 2.522 | 0.003 | 0.062 | gw-r/thread-66/journal/page | none observed |
| 6020b1eba0a327220000000000001bf2 | 997.086 | 2.495 | n/a | 0.000 | 0.000 | 0.341 | 994.139 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 0.081 | 2.495 | 0.003 | 0.081 | gw-r/thread-66/journal/page | none observed |
| 6020b1eba0a327220000000000001bd5 | 993.097 | 3.019 | n/a | 0.000 | 0.000 | 1.004 | 988.960 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.069 | 3.019 | 0.003 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000001bb3 | 992.718 | 3.172 | n/a | 0.000 | 0.000 | 0.376 | 989.056 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.065 | 3.172 | 0.003 | 0.065 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a327220000000000001bc3 | 991.851 | 2.483 | n/a | 0.000 | 0.000 | 0.529 | 988.730 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.073 | 2.483 | 0.003 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a327220000000000001bf0 | 977.911 | 2.239 | n/a | 0.000 | 0.000 | 0.669 | 974.921 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.057 | 2.239 | 0.002 | 0.057 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a327220000000000001bb9 | 922.195 | 3.072 | n/a | 0.000 | 0.000 | 0.523 | 918.514 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.060 | 3.072 | 0.003 | 0.060 | gw-r/thread-66/journal/page | none observed |
| 6020b1eba0a327220000000000001b92 | 861.509 | 2.541 | n/a | 0.000 | 0.000 | 0.418 | 858.436 | 0.021 | n/a | 0.029 | 0.000 | n/a | n/a | 0.065 | 2.541 | 0.003 | 0.065 | gw-r/thread-66/journal/page | none observed |
| 6020b1eba0a327220000000000001bc2 | 855.458 | 5.914 | n/a | 0.000 | 0.000 | 31.460 | 817.931 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.108 | 5.914 | 0.007 | 0.108 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a327220000000000001bb0 | 846.547 | 10.648 | n/a | 0.000 | 0.000 | 0.514 | 834.864 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.499 | 10.648 | 0.013 | 0.499 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000001b7e | 830.232 | 3.927 | n/a | 0.000 | 0.000 | 0.361 | 825.817 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.097 | 3.927 | 0.005 | 0.097 | gw-r/thread-46/journal/page | none observed |

## P3 / tail / internal (367 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 346.187 | n/a | n/a | n/a | 3.309 | n/a | 0.000 | 0.000 | 0.468 | 335.472 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.092 | 3.338 | 0.011 | 0.092 |
| p99 | 1004.131 | n/a | n/a | n/a | 12.887 | n/a | 1.212 | 0.000 | 3.927 | 1000.629 | 0.058 | n/a | 0.070 | 0.000 | n/a | n/a | 47.684 | 13.584 | 0.725 | 47.684 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6020b1eba0a327220000000000001c16 | 1005.146 | 3.890 | n/a | 0.000 | 0.000 | 0.543 | 1000.615 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.068 | 3.890 | 0.004 | 0.068 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000001c79 | 1004.380 | 4.543 | n/a | 0.000 | 0.000 | 0.575 | 999.052 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.173 | 4.543 | 0.005 | 0.173 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a327220000000000001e15 | 1004.364 | 0.142 | n/a | 0.000 | 0.000 | 2.071 | 1000.993 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 1.106 | 0.142 | 0.000 | 1.106 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000001d6a | 1004.131 | 3.531 | n/a | 0.000 | 0.000 | 0.416 | 1000.041 | 0.012 | n/a | 0.033 | 0.000 | n/a | n/a | 0.099 | 3.531 | 0.004 | 0.099 | gw-r/thread-46/journal/page | none observed |
| 6020b1eba0a327220000000000001d4b | 1003.843 | 4.178 | n/a | 0.000 | 0.000 | 1.864 | 997.704 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.064 | 4.178 | 0.004 | 0.064 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000001cc6 | 1003.842 | 2.782 | n/a | 0.000 | 0.000 | 0.364 | 1000.605 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.065 | 2.782 | 0.003 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000001bf7 | 1003.802 | 4.707 | n/a | 1.060 | 0.000 | 0.767 | 997.125 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.116 | 5.767 | 0.006 | 0.116 | gw-r/thread-66/journal/page | none observed |
| 6020b1eba0a327220000000000001bf6 | 1002.778 | 2.456 | n/a | 0.000 | 0.000 | 0.373 | 999.849 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.070 | 2.456 | 0.002 | 0.070 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000001c86 | 1002.770 | 0.199 | n/a | 0.000 | 0.000 | 0.630 | 1000.731 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 1.172 | 0.199 | 0.000 | 1.172 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a327220000000000001d72 | 1002.709 | 0.147 | n/a | 0.000 | 0.000 | 0.662 | 1000.693 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 1.157 | 0.147 | 0.000 | 1.157 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000001d5b | 1002.586 | 2.593 | n/a | 0.000 | 0.000 | 0.375 | 999.524 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.061 | 2.593 | 0.003 | 0.061 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a327220000000000001ded | 1002.495 | 0.112 | n/a | 0.000 | 0.000 | 0.740 | 1000.503 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 1.095 | 0.112 | 0.000 | 1.095 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000001c20 | 1002.457 | 0.120 | n/a | 0.000 | 0.000 | 0.551 | 1000.629 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 1.101 | 0.120 | 0.000 | 1.101 | gw-r/thread-42/journal/page | none observed |
| 6020b1eba0a327220000000000001d57 | 1002.429 | 0.154 | n/a | 0.000 | 0.000 | 0.557 | 1000.538 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 1.133 | 0.154 | 0.000 | 1.133 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000001db9 | 1002.240 | 0.109 | n/a | 0.000 | 0.000 | 0.421 | 1000.481 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 1.199 | 0.109 | 0.000 | 1.199 | gw-r/thread-49/journal/page | none observed |
| 6020b1eba0a327220000000000001e1d | 1002.181 | 0.110 | n/a | 0.000 | 0.000 | 0.539 | 1000.408 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 1.091 | 0.110 | 0.000 | 1.091 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a327220000000000001cc7 | 1002.075 | 0.103 | n/a | 0.000 | 0.000 | 0.500 | 1000.343 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 1.098 | 0.103 | 0.000 | 1.098 | gw-r/thread-48/journal/page | none observed |
| 6020b1eba0a327220000000000001e20 | 1002.037 | 0.120 | n/a | 0.000 | 0.000 | 0.385 | 1000.424 | 0.004 | n/a | 0.016 | 0.000 | n/a | n/a | 1.089 | 0.120 | 0.000 | 1.089 | gw-r/thread-44/journal/page | none observed |
| 6020b1eba0a327220000000000001c7b | 1002.016 | 0.092 | n/a | 0.000 | 0.000 | 0.349 | 1000.454 | 0.003 | n/a | 0.030 | 0.000 | n/a | n/a | 1.088 | 0.092 | 0.000 | 1.088 | gw-r/thread-47/journal/page | none observed |
| 6020b1eba0a327220000000000001e0c | 1001.906 | 0.081 | n/a | 0.000 | 0.000 | 0.270 | 1000.427 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 1.085 | 0.081 | 0.000 | 1.085 | gw-r/thread-46/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.293 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.827 | 201.076 | 0.018 | n/a | 0.114 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 213.171 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 10.502 | 204.978 | 4.980 | n/a | 0.624 | 0.000 | n/a | n/a | 49.845 | 0.000 | 0.000 | 49.845 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 429eac72b0a436df000000000000000a | 213.171 | 0.000 | n/a | 0.000 | 0.000 | 10.502 | 201.995 | 0.027 | n/a | 0.267 | 0.000 | n/a | n/a | 0.380 | 0.000 | 0.000 | 0.380 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000000057 | 206.290 | 0.000 | n/a | 0.000 | 0.000 | 1.070 | 204.871 | 0.022 | n/a | 0.166 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000030 | 205.958 | 0.000 | n/a | 0.000 | 0.000 | 0.582 | 204.978 | 0.030 | n/a | 0.252 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000000051 | 205.931 | 0.000 | n/a | 0.000 | 0.000 | 0.833 | 204.815 | 0.019 | n/a | 0.173 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000000015 | 205.738 | 0.000 | n/a | 0.000 | 0.000 | 3.948 | 201.479 | 0.018 | n/a | 0.098 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000000041 | 205.374 | 0.000 | n/a | 0.000 | 0.000 | 0.543 | 204.672 | 0.036 | n/a | 0.042 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000000058 | 205.301 | 0.000 | n/a | 0.000 | 0.000 | 4.077 | 200.978 | 0.015 | n/a | 0.113 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df0000000000000011 | 205.290 | 0.000 | n/a | 0.000 | 0.000 | 0.473 | 201.588 | 2.930 | n/a | 0.178 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df000000000000002b | 205.136 | 0.000 | n/a | 0.000 | 0.000 | 0.911 | 203.964 | 0.026 | n/a | 0.110 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df000000000000001a | 205.131 | 0.000 | n/a | 0.000 | 0.000 | 0.551 | 203.856 | 0.289 | n/a | 0.336 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-45/journal/page | none observed |
| 429eac72b0a436df0000000000000018 | 204.878 | 0.000 | n/a | 0.000 | 0.000 | 3.175 | 201.323 | 0.037 | n/a | 0.241 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df000000000000000e | 204.709 | 0.000 | n/a | 0.000 | 0.000 | 2.492 | 201.919 | 0.025 | n/a | 0.137 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-45/journal/page | none observed |
| 429eac72b0a436df0000000000000017 | 204.418 | 0.000 | n/a | 0.000 | 0.000 | 0.915 | 203.215 | 0.011 | n/a | 0.126 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df000000000000002a | 204.368 | 0.000 | n/a | 0.000 | 0.000 | 0.570 | 203.495 | 0.020 | n/a | 0.169 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000000013 | 204.227 | 0.000 | n/a | 0.000 | 0.000 | 3.044 | 200.855 | 0.013 | n/a | 0.131 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000024 | 204.163 | 0.000 | n/a | 0.000 | 0.000 | 0.748 | 203.136 | 0.021 | n/a | 0.128 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000000019 | 204.028 | 0.000 | n/a | 0.000 | 0.000 | 2.168 | 201.344 | 0.018 | n/a | 0.414 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000000048 | 203.839 | 0.000 | n/a | 0.000 | 0.000 | 2.737 | 200.863 | 0.012 | n/a | 0.112 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 429eac72b0a436df000000000000001e | 203.796 | 0.000 | n/a | 0.000 | 0.000 | 0.875 | 202.597 | 0.013 | n/a | 0.121 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-45/journal/page | none observed |
| 429eac72b0a436df0000000000000031 | 203.694 | 0.000 | n/a | 0.000 | 0.000 | 0.982 | 202.309 | 0.022 | n/a | 0.252 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / read (224 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.848 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.750 | 200.891 | 0.012 | n/a | 0.081 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 |
| p99 | 207.011 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.496 | 205.808 | 7.598 | n/a | 0.309 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 429eac72b0a436df0000000000000078 | 210.362 | 0.000 | n/a | 0.000 | 0.000 | 0.595 | 209.466 | 0.027 | n/a | 0.155 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df0000000000000063 | 207.898 | 0.000 | n/a | 0.000 | 0.000 | 0.567 | 207.028 | 0.019 | n/a | 0.169 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000000060 | 207.011 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 205.808 | 0.056 | n/a | 0.170 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 429eac72b0a436df00000000000000e6 | 206.452 | 0.000 | n/a | 0.000 | 0.000 | 0.638 | 205.582 | 0.014 | n/a | 0.093 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df000000000000009e | 206.235 | 0.000 | n/a | 0.000 | 0.000 | 1.010 | 204.953 | 0.011 | n/a | 0.118 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df00000000000000a6 | 206.176 | 0.000 | n/a | 0.000 | 0.000 | 0.872 | 201.180 | 3.838 | n/a | 0.147 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df0000000000000119 | 206.176 | 0.000 | n/a | 0.000 | 0.000 | 4.064 | 201.840 | 0.010 | n/a | 0.130 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000000071 | 206.115 | 0.000 | n/a | 0.000 | 0.000 | 0.750 | 205.112 | 0.019 | n/a | 0.136 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df00000000000000a9 | 206.075 | 0.000 | n/a | 0.000 | 0.000 | 3.759 | 201.852 | 0.058 | n/a | 0.252 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df00000000000000a8 | 205.945 | 0.000 | n/a | 0.000 | 0.000 | 3.818 | 201.804 | 0.011 | n/a | 0.120 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df00000000000000d4 | 205.943 | 0.000 | n/a | 0.000 | 0.000 | 4.571 | 201.134 | 0.009 | n/a | 0.116 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-45/journal/page | none observed |
| 429eac72b0a436df00000000000000fd | 205.915 | 0.000 | n/a | 0.000 | 0.000 | 0.939 | 204.664 | 0.008 | n/a | 0.089 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df00000000000000d9 | 205.913 | 0.000 | n/a | 0.000 | 0.000 | 4.682 | 201.005 | 0.007 | n/a | 0.095 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000097 | 205.596 | 0.000 | n/a | 0.000 | 0.000 | 0.641 | 204.662 | 0.012 | n/a | 0.118 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df000000000000010a | 205.552 | 0.000 | n/a | 0.000 | 0.000 | 4.496 | 200.814 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df00000000000000e7 | 205.436 | 0.000 | n/a | 0.000 | 0.000 | 0.832 | 204.348 | 0.009 | n/a | 0.033 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df00000000000000ca | 205.147 | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 204.223 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df000000000000006b | 205.101 | 0.000 | n/a | 0.000 | 0.000 | 3.884 | 200.887 | 0.014 | n/a | 0.113 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df0000000000000146 | 204.956 | 0.000 | n/a | 0.000 | 0.000 | 0.600 | 204.158 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df0000000000000114 | 204.776 | 0.000 | n/a | 0.000 | 0.000 | 0.654 | 203.935 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-44/journal/page | none observed |

## P3 / L4 / read (222 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.640 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.658 | 200.814 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 |
| p99 | 204.060 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.293 | 202.811 | 3.774 | n/a | 0.160 | 0.000 | n/a | n/a | 0.259 | 0.000 | 0.000 | 0.259 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 429eac72b0a436df000000000000016e | 205.909 | 0.000 | n/a | 0.000 | 0.000 | 0.772 | 204.735 | 0.013 | n/a | 0.133 | 0.000 | n/a | n/a | 0.255 | 0.000 | 0.000 | 0.255 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000231 | 204.508 | 0.000 | n/a | 0.000 | 0.000 | 0.567 | 203.764 | 0.021 | n/a | 0.070 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000000167 | 204.060 | 0.000 | n/a | 0.000 | 0.000 | 1.055 | 202.811 | 0.005 | n/a | 0.085 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 429eac72b0a436df000000000000017c | 204.044 | 0.000 | n/a | 0.000 | 0.000 | 3.293 | 200.505 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df000000000000017e | 203.892 | 0.000 | n/a | 0.000 | 0.000 | 2.312 | 201.348 | 0.005 | n/a | 0.135 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000000175 | 203.381 | 0.000 | n/a | 0.000 | 0.000 | 1.404 | 201.614 | 0.009 | n/a | 0.113 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df00000000000001e5 | 203.277 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 202.070 | 0.015 | n/a | 0.100 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-47/journal/page | none observed |
| 429eac72b0a436df00000000000001f0 | 203.272 | 0.000 | n/a | 0.000 | 0.000 | 0.765 | 202.294 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df00000000000001a3 | 203.177 | 0.000 | n/a | 0.000 | 0.000 | 1.457 | 201.498 | 0.010 | n/a | 0.103 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df00000000000001ee | 203.131 | 0.000 | n/a | 0.000 | 0.000 | 0.843 | 201.980 | 0.018 | n/a | 0.182 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 429eac72b0a436df0000000000000184 | 203.074 | 0.000 | n/a | 0.000 | 0.000 | 0.565 | 202.315 | 0.010 | n/a | 0.086 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df0000000000000183 | 202.990 | 0.000 | n/a | 0.000 | 0.000 | 1.576 | 201.101 | 0.007 | n/a | 0.082 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-47/journal/page | none observed |
| 429eac72b0a436df0000000000000166 | 202.945 | 0.000 | n/a | 0.000 | 0.000 | 1.198 | 201.395 | 0.009 | n/a | 0.109 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df00000000000001cf | 202.848 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 201.715 | 0.016 | n/a | 0.141 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df000000000000016d | 202.846 | 0.000 | n/a | 0.000 | 0.000 | 0.558 | 202.081 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df00000000000001d0 | 202.791 | 0.000 | n/a | 0.000 | 0.000 | 0.846 | 201.731 | 0.014 | n/a | 0.118 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000000192 | 202.782 | 0.000 | n/a | 0.000 | 0.000 | 0.804 | 201.697 | 0.014 | n/a | 0.114 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000250 | 202.719 | 0.000 | n/a | 0.000 | 0.000 | 1.694 | 200.862 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df00000000000001d8 | 202.663 | 0.000 | n/a | 0.000 | 0.000 | 1.170 | 201.333 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df00000000000001fd | 202.621 | 0.000 | n/a | 0.000 | 0.000 | 1.405 | 201.030 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / read (163 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 77.387 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.490 | 76.093 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 |
| p99 | 204.528 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.798 | 201.320 | 3.002 | n/a | 0.090 | 0.000 | n/a | n/a | 51.069 | 0.000 | 0.000 | 51.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 429eac72b0a436df000000000000025f | 205.860 | 0.000 | n/a | 0.000 | 0.000 | 4.415 | 201.221 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-47/journal/page | none observed |
| 429eac72b0a436df000000000000027e | 204.528 | 0.000 | n/a | 0.000 | 0.000 | 3.798 | 200.593 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df0000000000000267 | 202.892 | 0.000 | n/a | 0.000 | 0.000 | 0.724 | 201.932 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df000000000000027b | 202.597 | 0.000 | n/a | 0.000 | 0.000 | 1.386 | 201.030 | 0.011 | n/a | 0.060 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df000000000000028f | 202.560 | 0.000 | n/a | 0.000 | 0.000 | 1.095 | 201.185 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000000296 | 202.439 | 0.000 | n/a | 0.000 | 0.000 | 1.570 | 200.685 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-45/journal/page | none observed |
| 429eac72b0a436df0000000000000282 | 202.298 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 201.320 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-45/journal/page | none observed |
| 429eac72b0a436df00000000000002a0 | 202.264 | 0.000 | n/a | 0.000 | 0.000 | 0.848 | 201.149 | 0.006 | n/a | 0.085 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df000000000000026e | 202.121 | 0.000 | n/a | 0.000 | 0.000 | 0.693 | 201.223 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 429eac72b0a436df00000000000002a1 | 202.009 | 0.000 | n/a | 0.000 | 0.000 | 0.679 | 201.140 | 0.008 | n/a | 0.088 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000000290 | 201.983 | 0.000 | n/a | 0.000 | 0.000 | 0.770 | 201.031 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-45/journal/page | none observed |
| 429eac72b0a436df0000000000000294 | 201.972 | 0.000 | n/a | 0.000 | 0.000 | 0.689 | 201.049 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000283 | 201.959 | 0.000 | n/a | 0.000 | 0.000 | 0.554 | 201.156 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df000000000000025d | 201.959 | 0.000 | n/a | 0.000 | 0.000 | 0.676 | 201.104 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-45/journal/page | none observed |
| 429eac72b0a436df000000000000027c | 201.951 | 0.000 | n/a | 0.000 | 0.000 | 0.709 | 201.056 | 0.007 | n/a | 0.080 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-47/journal/page | none observed |
| 429eac72b0a436df0000000000000279 | 201.943 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 200.968 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df000000000000026f | 201.928 | 0.000 | n/a | 0.000 | 0.000 | 0.794 | 200.949 | 0.020 | n/a | 0.063 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000000271 | 201.833 | 0.000 | n/a | 0.000 | 0.000 | 0.529 | 201.092 | 0.029 | n/a | 0.084 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df0000000000000288 | 201.787 | 0.000 | n/a | 0.000 | 0.000 | 0.732 | 200.852 | 0.005 | n/a | 0.062 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000287 | 201.763 | 0.000 | n/a | 0.000 | 0.000 | 0.432 | 201.126 | 0.010 | n/a | 0.090 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / read (138 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 116.461 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.461 | 115.927 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |
| p99 | 202.531 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.098 | 201.276 | 4.024 | n/a | 0.083 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 429eac72b0a436df0000000000000e45 | 202.607 | 0.000 | n/a | 0.000 | 0.000 | 0.778 | 201.475 | 0.011 | n/a | 0.101 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df0000000000000e38 | 202.531 | 0.000 | n/a | 0.000 | 0.000 | 0.970 | 201.276 | 0.009 | n/a | 0.083 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df0000000000000e5a | 202.142 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 200.953 | 0.013 | n/a | 0.051 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000e3b | 201.881 | 0.000 | n/a | 0.000 | 0.000 | 0.529 | 201.051 | 0.015 | n/a | 0.075 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df0000000000000e70 | 201.753 | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 200.940 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000e6a | 201.739 | 0.000 | n/a | 0.000 | 0.000 | 0.650 | 200.908 | 0.005 | n/a | 0.063 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df0000000000000e78 | 201.701 | 0.000 | n/a | 0.000 | 0.000 | 0.513 | 200.999 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000000e5b | 201.701 | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 200.842 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000000e73 | 201.653 | 0.000 | n/a | 0.000 | 0.000 | 0.590 | 200.899 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-45/journal/page | none observed |
| 429eac72b0a436df0000000000000e47 | 201.600 | 0.000 | n/a | 0.000 | 0.000 | 0.661 | 200.772 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000000e63 | 201.598 | 0.000 | n/a | 0.000 | 0.000 | 0.680 | 200.646 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.232 | 0.000 | 0.000 | 0.232 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df0000000000000e90 | 201.596 | 0.000 | n/a | 0.000 | 0.000 | 0.544 | 200.845 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-45/journal/page | none observed |
| 429eac72b0a436df0000000000000e74 | 201.594 | 0.000 | n/a | 0.000 | 0.000 | 0.463 | 200.984 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.071 | 0.000 | 0.000 | 0.071 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000e77 | 201.528 | 0.000 | n/a | 0.000 | 0.000 | 0.448 | 200.845 | 0.011 | n/a | 0.057 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000000e62 | 201.507 | 0.000 | n/a | 0.000 | 0.000 | 0.497 | 200.816 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-47/journal/page | none observed |
| 429eac72b0a436df0000000000000e4e | 201.459 | 0.000 | n/a | 0.000 | 0.000 | 0.646 | 200.645 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-45/journal/page | none observed |
| 429eac72b0a436df0000000000000e4c | 201.457 | 0.000 | n/a | 0.000 | 0.000 | 0.321 | 200.952 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-66/journal/page | none observed |
| 429eac72b0a436df0000000000000e37 | 201.447 | 0.000 | n/a | 0.000 | 0.000 | 0.601 | 200.676 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000e53 | 201.404 | 0.000 | n/a | 0.000 | 0.000 | 0.421 | 200.821 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000000e86 | 201.403 | 0.000 | n/a | 0.000 | 0.000 | 0.535 | 200.731 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / read (231 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.074 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.462 | 200.515 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 |
| p99 | 205.414 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.800 | 201.647 | 2.383 | n/a | 0.105 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 429eac72b0a436df0000000000000f64 | 217.156 | 0.000 | n/a | 0.000 | 0.000 | 0.509 | 193.746 | 22.782 | n/a | 0.013 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df0000000000000ea9 | 205.989 | 0.000 | n/a | 0.000 | 0.000 | 0.302 | 205.551 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 429eac72b0a436df0000000000000ee4 | 205.414 | 0.000 | n/a | 0.000 | 0.000 | 4.318 | 200.555 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.503 | 0.000 | 0.000 | 0.503 | gw-r/thread-47/journal/page | none observed |
| 429eac72b0a436df0000000000000f5e | 205.124 | 0.000 | n/a | 0.000 | 0.000 | 4.446 | 200.551 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000f53 | 204.668 | 0.000 | n/a | 0.000 | 0.000 | 3.585 | 200.903 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-47/journal/page | none observed |
| 429eac72b0a436df0000000000000eee | 204.565 | 0.000 | n/a | 0.000 | 0.000 | 3.800 | 200.630 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-66/journal/page | none observed |
| 429eac72b0a436df0000000000000f67 | 203.654 | 0.000 | n/a | 0.000 | 0.000 | 3.007 | 200.537 | 0.003 | n/a | 0.037 | 0.000 | n/a | n/a | 0.070 | 0.000 | 0.000 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000ed6 | 203.554 | 0.000 | n/a | 0.000 | 0.000 | 0.317 | 200.756 | 2.383 | n/a | 0.021 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000f57 | 203.284 | 0.000 | n/a | 0.000 | 0.000 | 0.561 | 202.544 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 429eac72b0a436df0000000000000f09 | 202.792 | 0.000 | n/a | 0.000 | 0.000 | 0.517 | 200.164 | 2.010 | n/a | 0.017 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000000f08 | 202.675 | 0.000 | n/a | 0.000 | 0.000 | 1.927 | 200.569 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df0000000000000f0c | 202.664 | 0.000 | n/a | 0.000 | 0.000 | 1.733 | 200.731 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000000f18 | 202.478 | 0.000 | n/a | 0.000 | 0.000 | 0.956 | 201.306 | 0.008 | n/a | 0.076 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000ef8 | 202.363 | 0.000 | n/a | 0.000 | 0.000 | 0.476 | 201.647 | 0.011 | n/a | 0.152 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000000f7e | 202.180 | 0.000 | n/a | 0.000 | 0.000 | 1.321 | 200.687 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df0000000000000f3d | 202.048 | 0.000 | n/a | 0.000 | 0.000 | 0.522 | 201.304 | 0.009 | n/a | 0.120 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df0000000000000f00 | 202.048 | 0.000 | n/a | 0.000 | 0.000 | 1.429 | 200.505 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.072 | 0.000 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000f7f | 201.964 | 0.000 | n/a | 0.000 | 0.000 | 0.486 | 201.272 | 0.010 | n/a | 0.104 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df0000000000000ecd | 201.953 | 0.000 | n/a | 0.000 | 0.000 | 1.143 | 200.569 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000f32 | 201.950 | 0.000 | n/a | 0.000 | 0.000 | 0.427 | 201.351 | 0.009 | n/a | 0.105 | 0.000 | n/a | n/a | 0.058 | 0.000 | 0.000 | 0.058 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / read (232 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.072 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.446 | 200.496 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 |
| p99 | 202.552 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.000 | 201.249 | 2.016 | n/a | 0.074 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 429eac72b0a436df0000000000000fa6 | 204.443 | 0.000 | n/a | 0.000 | 0.000 | 0.481 | 203.792 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000000ffe | 204.289 | 0.000 | n/a | 0.000 | 0.000 | 3.456 | 200.672 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000000ff9 | 202.552 | 0.000 | n/a | 0.000 | 0.000 | 2.000 | 200.432 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000000fc2 | 202.535 | 0.000 | n/a | 0.000 | 0.000 | 2.005 | 200.391 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000000fbf | 202.065 | 0.000 | n/a | 0.000 | 0.000 | 1.299 | 200.552 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df000000000000105c | 202.034 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 201.028 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000000f96 | 201.973 | 0.000 | n/a | 0.000 | 0.000 | 0.530 | 201.249 | 0.008 | n/a | 0.104 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df0000000000000fcd | 201.956 | 0.000 | n/a | 0.000 | 0.000 | 0.446 | 201.340 | 0.003 | n/a | 0.032 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-66/journal/page | none observed |
| 429eac72b0a436df0000000000001034 | 201.952 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 200.910 | 0.004 | n/a | 0.063 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df000000000000103f | 201.935 | 0.000 | n/a | 0.000 | 0.000 | 0.707 | 201.045 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df0000000000000fd8 | 201.900 | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 201.051 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000000ffc | 201.872 | 0.000 | n/a | 0.000 | 0.000 | 0.658 | 201.080 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.074 | 0.000 | 0.000 | 0.074 | gw-r/thread-66/journal/page | none observed |
| 429eac72b0a436df0000000000001089 | 201.868 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 201.079 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df0000000000000fd2 | 201.829 | 0.000 | n/a | 0.000 | 0.000 | 0.975 | 200.606 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000000fb7 | 201.784 | 0.000 | n/a | 0.000 | 0.000 | 0.949 | 200.672 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df000000000000108b | 201.778 | 0.000 | n/a | 0.000 | 0.000 | 0.722 | 200.786 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-47/journal/page | none observed |
| 429eac72b0a436df0000000000000fe4 | 201.745 | 0.000 | n/a | 0.000 | 0.000 | 0.664 | 200.854 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000000fcb | 201.734 | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 200.949 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df0000000000001077 | 201.726 | 0.000 | n/a | 0.000 | 0.000 | 0.498 | 200.957 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df0000000000001043 | 201.721 | 0.000 | n/a | 0.000 | 0.000 | 1.205 | 200.383 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-49/journal/page | none observed |

## P3 / tail / read (840 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.112 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.493 | 200.494 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 |
| p99 | 203.085 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.563 | 201.314 | 1.116 | n/a | 0.101 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 429eac72b0a436df000000000000140e | 239.519 | 0.000 | n/a | 0.000 | 0.000 | 38.918 | 200.486 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df00000000000010d6 | 233.601 | 0.000 | n/a | 0.000 | 0.000 | 0.384 | 233.102 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df00000000000011f1 | 211.356 | 0.000 | n/a | 0.000 | 0.000 | 10.785 | 200.442 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000001389 | 204.464 | 0.000 | n/a | 0.000 | 0.000 | 3.612 | 200.699 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000001235 | 204.003 | 0.000 | n/a | 0.000 | 0.000 | 1.108 | 202.447 | 0.018 | n/a | 0.071 | 0.000 | n/a | n/a | 0.359 | 0.000 | 0.000 | 0.359 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df000000000000135c | 203.452 | 0.000 | n/a | 0.000 | 0.000 | 2.811 | 200.506 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df00000000000010a9 | 203.303 | 0.000 | n/a | 0.000 | 0.000 | 0.520 | 202.620 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-66/journal/page | none observed |
| 429eac72b0a436df000000000000110c | 203.223 | 0.000 | n/a | 0.000 | 0.000 | 2.590 | 200.478 | 0.016 | n/a | 0.030 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df0000000000001100 | 203.085 | 0.000 | n/a | 0.000 | 0.000 | 2.477 | 200.467 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df000000000000124e | 203.077 | 0.000 | n/a | 0.000 | 0.000 | 0.197 | 202.709 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-49/journal/page | none observed |
| 429eac72b0a436df0000000000001337 | 202.950 | 0.000 | n/a | 0.000 | 0.000 | 0.544 | 202.179 | 0.012 | n/a | 0.039 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df000000000000142e | 202.799 | 0.000 | n/a | 0.000 | 0.000 | 1.935 | 200.712 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-48/journal/page | none observed |
| 429eac72b0a436df000000000000136f | 202.787 | 0.000 | n/a | 0.000 | 0.000 | 1.903 | 200.738 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-44/journal/page | none observed |
| 429eac72b0a436df00000000000013f5 | 202.731 | 0.000 | n/a | 0.000 | 0.000 | 2.047 | 200.559 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df0000000000001392 | 202.727 | 0.000 | n/a | 0.000 | 0.000 | 2.110 | 200.453 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-66/journal/page | none observed |
| 429eac72b0a436df0000000000001170 | 202.677 | 0.000 | n/a | 0.000 | 0.000 | 1.520 | 200.937 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-42/journal/page | none observed |
| 429eac72b0a436df000000000000132c | 202.639 | 0.000 | n/a | 0.000 | 0.000 | 1.063 | 201.215 | 0.011 | n/a | 0.115 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-66/journal/page | none observed |
| 429eac72b0a436df000000000000143e | 202.630 | 0.000 | n/a | 0.000 | 0.000 | 2.074 | 200.425 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df00000000000012cc | 202.609 | 0.000 | n/a | 0.000 | 0.000 | 1.589 | 200.846 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-46/journal/page | none observed |
| 429eac72b0a436df00000000000013d9 | 202.488 | 0.000 | n/a | 0.000 | 0.000 | 1.251 | 200.936 | 0.005 | n/a | 0.088 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-44/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3707 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/3.591 ms; post-ACK p50/p99: 0.393/1.888 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.871 | 10.394 | 10.163 | reported |
| All-primary p99 ms | 45.378 | 44.527 | 43.922 | <=50 |
| L256 5-10 p50Ms | 10.431 | 10.111 | 10.111 | <=10 |
| L256 5-10 p99Ms | 161.902 | 161.619 | 161.617 | <=50 |
| L256 11-25 p50Ms | 13.887 | 12.735 | 12.735 | <=10 |
| L256 11-25 p99Ms | 18.993 | 18.490 | 18.489 | <=50 |
| L256 26-50 p50Ms | 17.279 | 16.511 | 16.511 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 54.401 | 53.451 | 53.449 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 9.407 | 9.087 | 8.831 | <=10 |
| Burst 11-25 p50 ms | 11.455 | 11.007 | 10.623 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 161.902 | 161.619 | 161.617 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 35.683 | 35.277 | 35.275 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 68.685/68.685 | 65.309 | 44.369 | 114.746 | 0.749/0.107 |
| 5-10 | 250-1000 | 137 | 11.680/77.916 | 11.347 | 6.522 | 15.985 | 0.079/0.021 |
| 11-25 | 100-250 | 42 | 12.843/73.090 | 11.824 | 6.553 | 17.542 | 0.071/0.023 |
| 26-50 | 100-250 | 13 | 14.683/23.851 | 13.415 | 7.106 | 18.859 | 0.088/0.022 |
| 11-25 | 250-1000 | 70 | 13.676/49.898 | 12.925 | 7.231 | 17.189 | 0.084/0.022 |
| 5-10 | 50-100 | 75 | 8.808/19.117 | 8.481 | 4.841 | 11.733 | 0.051/0.019 |
| 5-10 | 100-250 | 63 | 10.638/54.506 | 10.254 | 5.945 | 14.188 | 0.070/0.020 |
| 26-50 | 250-1000 | 24 | 19.651/77.142 | 18.426 | 9.632 | 28.908 | 0.117/0.023 |
| 11-25 | 0-50 | 525 | 10.205/33.561 | 9.594 | 5.442 | 13.326 | 0.048/0.019 |
| 5-10 | 0-50 | 1098 | 8.241/31.562 | 7.855 | 4.394 | 10.827 | 0.042/0.019 |
| 5-10 | overlap | 859 | 10.701/39.998 | 10.413 | 6.774 | 15.073 | 0.035/0.018 |
| 26-50 | overlap | 156 | 17.271/76.028 | 16.171 | 9.723 | 22.938 | 0.051/0.019 |
| 26-50 | 50-100 | 13 | 14.234/32.100 | 13.591 | 7.477 | 19.815 | 0.083/0.019 |
| 11-25 | overlap | 396 | 12.914/48.473 | 12.378 | 8.102 | 18.241 | 0.040/0.018 |
| 11-25 | 50-100 | 43 | 10.647/32.869 | 9.999 | 5.205 | 13.276 | 0.063/0.019 |
| 26-50 | 0-50 | 192 | 14.286/43.402 | 13.179 | 6.814 | 17.710 | 0.061/0.020 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1842 | 14 | 1171.681 |
| burst | 1865 | 10 | 622.660 |

## Writer heap, GC and scheduler stalls

Source d709fd769d271992b6a87841489c90665585e919; 3707 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 480.657 / 543.669 |
| GC events / total duration / maximum ms | 844 / 1879.820 / 38.123 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":830,"4":7,"8":7} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 45.378 / 24 / 1794.340 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.
