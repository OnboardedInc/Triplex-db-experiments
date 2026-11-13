# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (178.965 ms, trace `f87b72a2e58b18ba0000000000000448`); `node-14/thread-0/socket.wait-first-byte` (83.674 ms, trace `f87b72a2e58b18ba00000000000014cc`); `node-14/thread-0/socket.wait-first-byte` (69.165 ms, trace `f87b72a2e58b18ba0000000000001482`); `node-14/thread-0/socket.wait-first-byte` (112.495 ms, trace `f87b72a2e58b18ba00000000000014c5`); `node-14/thread-0/driver.queue.subject` (177.471 ms, trace `f87b72a2e58b18ba0000000000001489`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p2-cost-c-3-summary`; source `f9f51d85bab0e75977e71edd735d1cb80ffeeb58`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 7177272.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 238 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13567.949 | 902.158 | 45.888 | 308 |
| L1 | 0 | 19033.705 | 487.399 | 24.904 | 462 |
| L4 | 0 | 19168.408 | 415.604 | 18.779 | 426 |
| L16 | 0 | 19330.162 | 426.072 | 10.322 | 474 |
| L64 | 0 | 19912.824 | 627.780 | 17.446 | 610 |
| L256 | 0 | 19032.814 | 442.286 | 11.538 | 472 |
| L1024 | 0 | 19929.211 | 4483.700 | 228.484 | 12127 |
| tail | 0 | 64443.250 | 13639.247 | 708.009 | 37291 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| f87b72a2e58b18ba0000000000000448 | driver.queue.scheduler-dispatch | 0.146 | none | 0 / 32 |
| f87b72a2e58b18ba0000000000000448 | driver.queue.scheduler-late | 0.018 | none | 0 / 32 |

Observed active steps while trace f87b72a2e58b18ba0000000000000448 waited: []

| f87b72a2e58b18ba00000000000014cc | driver.queue.scheduler-late | 78.444 | none | 6 / 32 |
| f87b72a2e58b18ba00000000000014cc | driver.queue.scheduler-dispatch | 0.007 | none | 6 / 32 |

Observed active steps while trace f87b72a2e58b18ba00000000000014cc waited: []

| f87b72a2e58b18ba0000000000001482 | driver.queue.subject | 63.191 | f87b72a2e58b18ba0000000000001481 | 3 / 32 |
| f87b72a2e58b18ba0000000000001482 | driver.queue.scheduler-late | 4.326 | none | 3 / 32 |
| f87b72a2e58b18ba0000000000001482 | driver.queue.scheduler-dispatch | 0.198 | none | 1 / 32 |

Observed active steps while trace f87b72a2e58b18ba0000000000001482 waited: [{"at":1794566184186.1108,"inFlight":3,"capacity":32,"active":[{"traceId":"f87b72a2e58b18ba0000000000001478","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000147c","step":"client.http"},{"traceId":"f87b72a2e58b18ba0000000000001480","step":"rpc.probe.transact"}]},{"at":1794566184206.475,"inFlight":2,"capacity":32,"active":[{"traceId":"f87b72a2e58b18ba000000000000147c","step":"client.http"},{"traceId":"f87b72a2e58b18ba0000000000001480","step":"rpc.probe.transact"}]},{"at":1794566184230.6096,"inFlight":2,"capacity":32,"active":[{"traceId":"f87b72a2e58b18ba000000000000147e","step":"client.http"},{"traceId":"f87b72a2e58b18ba0000000000001484","step":"client.http"}]}]

| f87b72a2e58b18ba00000000000014c5 | driver.queue.scheduler-late | 93.297 | none | 1 / 32 |
| f87b72a2e58b18ba00000000000014c5 | driver.queue.scheduler-dispatch | 0.133 | none | 1 / 32 |

Observed active steps while trace f87b72a2e58b18ba00000000000014c5 waited: []

| f87b72a2e58b18ba0000000000001489 | driver.queue.subject | 177.471 | f87b72a2e58b18ba0000000000001482 | 2 / 32 |
| f87b72a2e58b18ba0000000000001489 | driver.queue.scheduler-late | 6.802 | none | 2 / 32 |
| f87b72a2e58b18ba0000000000001489 | driver.queue.scheduler-dispatch | 0.205 | none | 6 / 32 |

Observed active steps while trace f87b72a2e58b18ba0000000000001489 waited: [{"at":1794566184277.5796,"inFlight":3,"capacity":32,"active":[{"traceId":"f87b72a2e58b18ba0000000000001482","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000148a","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000148c","step":"client.http"}]},{"at":1794566184300.0596,"inFlight":6,"capacity":32,"active":[{"traceId":"f87b72a2e58b18ba0000000000001482","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000148a","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000148c","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000148d","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000148f","step":"client.http"},{"traceId":"f87b72a2e58b18ba0000000000001490","step":"client.http"}]},{"at":1794566184319.983,"inFlight":5,"capacity":32,"active":[{"traceId":"f87b72a2e58b18ba0000000000001482","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000148c","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000148d","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000148f","step":"client.http"},{"traceId":"f87b72a2e58b18ba0000000000001490","step":"client.http"}]},{"at":1794566184384.0034,"inFlight":6,"capacity":32,"active":[{"traceId":"f87b72a2e58b18ba0000000000001482","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000148c","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000148d","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000148f","step":"client.http"},{"traceId":"f87b72a2e58b18ba0000000000001490","step":"client.http"},{"traceId":"f87b72a2e58b18ba0000000000001492","step":"client.http"}]},{"at":1794566184409.9043,"inFlight":9,"capacity":32,"active":[{"traceId":"f87b72a2e58b18ba0000000000001482","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000148f","step":"client.http"},{"traceId":"f87b72a2e58b18ba0000000000001494","step":"client.http"},{"traceId":"f87b72a2e58b18ba0000000000001495","step":"client.http"},{"traceId":"f87b72a2e58b18ba0000000000001497","step":"client.http"},{"traceId":"f87b72a2e58b18ba0000000000001498","step":"client.http"},{"traceId":"f87b72a2e58b18ba0000000000001493","step":"client.commit-send-queue"},{"traceId":"f87b72a2e58b18ba000000000000149d","step":"client.commit-send-queue"},{"traceId":"f87b72a2e58b18ba000000000000149e","step":"client.commit-send-queue"}]},{"at":1794566184430.4893,"inFlight":7,"capacity":32,"active":[{"traceId":"f87b72a2e58b18ba0000000000001482","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000148f","step":"client.http"},{"traceId":"f87b72a2e58b18ba0000000000001498","step":"client.http"},{"traceId":"f87b72a2e58b18ba0000000000001493","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000149d","step":"client.http"},{"traceId":"f87b72a2e58b18ba000000000000149e","step":"client.http"},{"traceId":"f87b72a2e58b18ba0000000000001496","step":"client.http"}]}]

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.793 | 0.991 | 0.000 | 1.755 | 6.253 | 0.040 | 0.000 | 0.164 | 1.520 | 9.313 | 0.052 | n/a | 0.402 | 18.104 | n/a | n/a | 0.057 | 6.950 | 0.198 | 0.057 |
| p99 | 355.176 | 9.377 | 0.041 | 13.322 | 136.140 | 4.620 | 4.498 | 1.247 | 179.503 | 40.920 | 0.428 | n/a | 3.811 | 56.051 | n/a | n/a | 0.407 | 140.813 | 0.445 | 0.407 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba0000000000000448 | 355.176 | 136.140 | 0.011 | 4.498 | 0.164 | 179.503 | 5.275 | 0.054 | n/a | 0.310 | 29.141 | n/a | n/a | 0.081 | 140.813 | 0.396 | 0.081 | node-14/thread-0/socket.wait-first-byte | none observed |
| f87b72a2e58b18ba0000000000000425 | 87.745 | 14.583 | 0.658 | 0.000 | 0.144 | 6.103 | 40.920 | 0.428 | n/a | 1.835 | 22.990 | n/a | n/a | 0.082 | 15.386 | 0.175 | 0.082 | gw-w/thread-46/gateway.admitted-work | none observed |
| f87b72a2e58b18ba0000000000000422 | 81.776 | 17.613 | 0.040 | 4.130 | 0.713 | 1.569 | 14.601 | 0.233 | n/a | 0.402 | 42.070 | n/a | n/a | 0.407 | 22.495 | 0.275 | 0.407 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000437 | 77.742 | 5.149 | 0.338 | 0.000 | 0.209 | 2.073 | 13.280 | 0.084 | n/a | 0.509 | 56.051 | n/a | n/a | 0.049 | 5.696 | 0.073 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000044a | 69.528 | 12.253 | 4.620 | 4.026 | 0.093 | 5.391 | 18.453 | 0.113 | n/a | 0.739 | 23.760 | n/a | n/a | 0.080 | 20.992 | 0.302 | 0.080 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 9.397ms; driver.publication 2.697ms |
| f87b72a2e58b18ba000000000000044e | 65.531 | 5.821 | 0.310 | 0.000 | 0.071 | 1.755 | 20.595 | 0.061 | n/a | 0.260 | 36.609 | n/a | n/a | 0.049 | 6.202 | 0.095 | 0.049 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000441 | 65.289 | 6.916 | 0.898 | 0.452 | 0.068 | 2.907 | 10.714 | 0.035 | n/a | 0.516 | 42.727 | n/a | n/a | 0.057 | 8.333 | 0.128 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000430 | 65.277 | 8.045 | 0.691 | 0.000 | 0.048 | 3.481 | 32.291 | 0.072 | n/a | 0.210 | 20.344 | n/a | n/a | 0.095 | 8.784 | 0.135 | 0.095 | gw-w/thread-49/gateway.admitted-work | driver.publication 1.327ms |
| f87b72a2e58b18ba000000000000042a | 55.766 | 10.098 | 0.017 | 0.000 | 1.045 | 1.183 | 1.729 | 0.031 | n/a | 0.700 | 40.713 | n/a | n/a | 0.250 | 11.160 | 0.200 | 0.250 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000042d | 43.550 | 4.276 | 0.238 | 0.000 | 0.063 | 4.686 | 9.313 | 0.048 | n/a | 0.395 | 24.481 | n/a | n/a | 0.050 | 4.577 | 0.105 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000452 | 42.837 | 4.112 | 0.279 | 1.879 | 0.059 | 1.730 | 12.565 | 0.072 | n/a | 0.309 | 21.796 | n/a | n/a | 0.036 | 6.330 | 0.148 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000444 | 42.628 | 5.450 | 0.005 | 0.000 | 0.424 | 1.108 | 8.088 | 0.098 | n/a | 0.317 | 27.087 | n/a | n/a | 0.050 | 5.880 | 0.138 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000435 | 41.158 | 6.209 | 0.317 | 0.000 | 0.184 | 1.520 | 17.341 | 0.072 | n/a | 0.583 | 14.823 | n/a | n/a | 0.109 | 6.710 | 0.163 | 0.109 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000043f | 40.487 | 6.985 | 0.277 | 0.000 | 0.054 | 3.798 | 12.931 | 0.059 | n/a | 0.565 | 15.775 | n/a | n/a | 0.043 | 7.316 | 0.181 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000458 | 39.793 | 4.009 | 0.821 | 0.000 | 0.078 | 1.843 | 16.752 | 0.049 | n/a | 0.251 | 15.952 | n/a | n/a | 0.038 | 4.908 | 0.123 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000043d | 39.715 | 6.716 | 0.339 | 0.000 | 0.085 | 1.731 | 12.477 | 0.051 | n/a | 0.528 | 17.729 | n/a | n/a | 0.060 | 7.140 | 0.180 | 0.060 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000447 | 38.357 | 6.982 | 0.572 | 0.000 | 0.052 | 1.332 | 11.005 | 0.053 | n/a | 0.213 | 18.104 | n/a | n/a | 0.044 | 7.605 | 0.198 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000429 | 38.127 | 6.253 | 0.570 | 0.000 | 0.127 | 2.361 | 14.479 | 0.073 | n/a | 0.388 | 13.760 | n/a | n/a | 0.116 | 6.950 | 0.182 | 0.116 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000432 | 37.558 | 8.067 | 0.006 | 0.000 | 1.247 | 0.853 | 1.903 | 0.049 | n/a | 3.811 | 21.555 | n/a | n/a | 0.067 | 9.320 | 0.248 | 0.067 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000438 | 32.825 | 11.259 | 0.007 | 0.000 | 0.781 | 0.927 | 7.147 | 0.052 | n/a | 0.276 | 12.324 | n/a | n/a | 0.052 | 12.047 | 0.367 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.053 | 1.287 | 0.000 | 2.020 | 5.251 | 0.006 | 0.000 | 0.551 | 1.108 | 2.041 | 0.042 | n/a | 0.591 | 12.941 | n/a | n/a | 0.050 | 6.040 | 0.252 | 0.050 |
| p99 | 55.766 | 2.733 | 0.009 | 3.721 | 10.098 | 0.017 | 2.174 | 1.045 | 1.357 | 8.088 | 0.098 | n/a | 0.915 | 40.713 | n/a | n/a | 0.250 | 11.160 | 0.445 | 0.250 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba000000000000042a | 55.766 | 10.098 | 0.017 | 0.000 | 1.045 | 1.183 | 1.729 | 0.031 | n/a | 0.700 | 40.713 | n/a | n/a | 0.250 | 11.160 | 0.200 | 0.250 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000444 | 42.628 | 5.450 | 0.005 | 0.000 | 0.424 | 1.108 | 8.088 | 0.098 | n/a | 0.317 | 27.087 | n/a | n/a | 0.050 | 5.880 | 0.138 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000450 | 28.425 | 5.389 | 0.010 | 0.000 | 0.641 | 1.357 | 4.310 | 0.068 | n/a | 0.768 | 15.832 | n/a | n/a | 0.050 | 6.040 | 0.212 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000042f | 27.165 | 5.251 | 0.006 | 0.000 | 0.472 | 0.996 | 6.783 | 0.042 | n/a | 0.240 | 13.317 | n/a | n/a | 0.058 | 5.729 | 0.211 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000426 | 23.053 | 5.156 | 0.017 | 0.000 | 0.634 | 1.234 | 2.041 | 0.042 | n/a | 0.915 | 12.941 | n/a | n/a | 0.073 | 5.807 | 0.252 | 0.073 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000442 | 18.664 | 8.162 | 0.010 | 0.000 | 0.130 | 1.139 | 1.584 | 0.031 | n/a | 0.591 | 6.932 | n/a | n/a | 0.085 | 8.302 | 0.445 | 0.085 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000454 | 17.626 | 4.057 | 0.005 | 1.792 | 0.484 | 0.936 | 2.452 | 0.047 | n/a | 0.789 | 7.027 | n/a | n/a | 0.038 | 6.338 | 0.360 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000456 | 15.212 | 3.566 | 0.005 | 2.174 | 0.551 | 0.658 | 1.563 | 0.042 | n/a | 0.279 | 6.335 | n/a | n/a | 0.039 | 6.296 | 0.414 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000044c | 12.392 | 3.266 | 0.006 | 0.000 | 0.843 | 0.728 | 1.447 | 0.039 | n/a | 0.263 | 5.751 | n/a | n/a | 0.050 | 4.115 | 0.332 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.898 | 0.724 | 0.000 | 0.921 | 4.966 | 0.097 | 0.000 | 0.175 | 1.324 | 8.326 | 0.048 | n/a | 0.361 | 14.276 | n/a | n/a | 0.057 | 6.086 | 0.194 | 0.057 |
| p99 | 137.400 | 6.680 | 0.004 | 6.558 | 11.388 | 1.583 | 4.407 | 11.203 | 5.470 | 49.037 | 0.157 | n/a | 2.273 | 105.423 | n/a | n/a | 0.100 | 15.448 | 0.582 | 0.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba0000000000000468 | 137.400 | 4.052 | 0.262 | 0.000 | 0.090 | 1.505 | 24.359 | 0.048 | n/a | 1.619 | 105.423 | n/a | n/a | 0.040 | 4.405 | 0.032 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000046e | 96.170 | 5.519 | 0.327 | 0.000 | 0.124 | 1.795 | 30.934 | 0.065 | n/a | 0.386 | 56.951 | n/a | n/a | 0.069 | 5.970 | 0.062 | 0.069 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000047e | 77.031 | 9.458 | 0.005 | 4.407 | 1.043 | 1.009 | 6.092 | 0.033 | n/a | 0.849 | 54.095 | n/a | n/a | 0.038 | 14.915 | 0.194 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000478 | 66.041 | 4.527 | 0.008 | 1.520 | 0.114 | 0.763 | 49.037 | 0.054 | n/a | 0.227 | 9.734 | n/a | n/a | 0.057 | 6.169 | 0.093 | 0.057 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| f87b72a2e58b18ba000000000000045a | 58.927 | 4.115 | 0.247 | 0.450 | 0.059 | 1.931 | 18.475 | 0.064 | n/a | 0.231 | 33.325 | n/a | n/a | 0.031 | 4.870 | 0.083 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004a0 | 54.823 | 6.947 | 0.626 | 0.000 | 0.188 | 2.490 | 20.715 | 0.060 | n/a | 0.363 | 23.349 | n/a | n/a | 0.086 | 7.761 | 0.142 | 0.086 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000470 | 47.721 | 3.935 | 0.195 | 0.000 | 0.062 | 2.824 | 24.147 | 0.078 | n/a | 0.302 | 16.141 | n/a | n/a | 0.037 | 4.192 | 0.088 | 0.037 | gw-w/thread-45/gateway.admitted-work | none observed |
| f87b72a2e58b18ba000000000000045c | 45.301 | 4.995 | 0.257 | 0.350 | 0.098 | 2.028 | 14.074 | 0.064 | n/a | 0.249 | 23.121 | n/a | n/a | 0.065 | 5.700 | 0.126 | 0.065 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000045f | 44.695 | 4.340 | 0.330 | 0.276 | 0.100 | 1.843 | 10.873 | 0.098 | n/a | 1.020 | 25.754 | n/a | n/a | 0.062 | 5.045 | 0.113 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004a2 | 44.126 | 6.562 | 0.598 | 0.000 | 0.212 | 5.470 | 14.167 | 0.072 | n/a | 1.004 | 15.957 | n/a | n/a | 0.084 | 7.372 | 0.167 | 0.084 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000047a | 43.744 | 4.618 | 0.535 | 0.000 | 0.133 | 3.256 | 12.517 | 0.079 | n/a | 0.361 | 22.144 | n/a | n/a | 0.100 | 5.286 | 0.121 | 0.100 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000048e | 41.771 | 3.525 | 0.003 | 0.000 | 0.600 | 0.599 | 2.210 | 0.039 | n/a | 0.213 | 34.553 | n/a | n/a | 0.026 | 4.129 | 0.099 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000461 | 39.739 | 7.302 | 0.010 | 2.024 | 0.583 | 0.989 | 2.013 | 0.036 | n/a | 2.273 | 24.435 | n/a | n/a | 0.073 | 9.919 | 0.250 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000496 | 38.965 | 6.025 | 0.315 | 0.000 | 0.073 | 1.609 | 17.208 | 0.058 | n/a | 0.233 | 13.385 | n/a | n/a | 0.060 | 6.413 | 0.165 | 0.060 | gw-w/thread-42/gateway.admitted-work | none observed |
| f87b72a2e58b18ba0000000000000492 | 37.548 | 4.224 | 0.251 | 0.000 | 0.140 | 1.948 | 19.156 | 0.059 | n/a | 0.523 | 11.178 | n/a | n/a | 0.068 | 4.615 | 0.123 | 0.068 | gw-w/thread-48/gateway.admitted-work | none observed |
| f87b72a2e58b18ba0000000000000498 | 36.321 | 9.073 | 0.013 | 2.868 | 0.175 | 0.944 | 2.937 | 0.035 | n/a | 0.239 | 19.969 | n/a | n/a | 0.068 | 12.129 | 0.334 | 0.068 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000465 | 36.075 | 4.030 | 0.289 | 0.000 | 0.083 | 2.666 | 8.571 | 0.039 | n/a | 0.204 | 20.126 | n/a | n/a | 0.068 | 4.401 | 0.122 | 0.068 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000467 | 35.938 | 10.330 | 0.006 | 0.000 | 0.525 | 3.678 | 8.558 | 0.094 | n/a | 1.428 | 11.267 | n/a | n/a | 0.051 | 10.861 | 0.302 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000046c | 35.688 | 11.388 | 0.008 | 1.951 | 0.365 | 1.226 | 2.893 | 0.046 | n/a | 0.666 | 17.076 | n/a | n/a | 0.069 | 13.713 | 0.384 | 0.069 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000049c | 34.459 | 4.195 | 0.238 | 0.000 | 0.076 | 1.448 | 12.809 | 0.068 | n/a | 0.282 | 15.297 | n/a | n/a | 0.047 | 4.508 | 0.131 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.910 | 0.933 | 0.000 | 1.734 | 4.241 | 0.006 | 0.000 | 0.643 | 1.036 | 2.762 | 0.038 | n/a | 0.260 | 6.620 | n/a | n/a | 0.051 | 5.544 | 0.300 | 0.051 |
| p99 | 66.041 | 3.329 | 0.004 | 3.410 | 10.330 | 0.008 | 1.922 | 11.203 | 3.678 | 49.037 | 0.094 | n/a | 1.428 | 14.179 | n/a | n/a | 0.060 | 15.448 | 0.582 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba0000000000000478 | 66.041 | 4.527 | 0.008 | 1.520 | 0.114 | 0.763 | 49.037 | 0.054 | n/a | 0.227 | 9.734 | n/a | n/a | 0.057 | 6.169 | 0.093 | 0.057 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| f87b72a2e58b18ba0000000000000467 | 35.938 | 10.330 | 0.006 | 0.000 | 0.525 | 3.678 | 8.558 | 0.094 | n/a | 1.428 | 11.267 | n/a | n/a | 0.051 | 10.861 | 0.302 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004a7 | 26.566 | 4.241 | 0.004 | 0.000 | 11.203 | 1.416 | 2.762 | 0.037 | n/a | 0.230 | 6.620 | n/a | n/a | 0.052 | 15.448 | 0.582 | 0.052 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 4.523ms; driver.publication 1.090ms |
| f87b72a2e58b18ba0000000000000463 | 22.715 | 4.532 | 0.006 | 0.000 | 0.426 | 1.205 | 2.048 | 0.039 | n/a | 0.230 | 14.179 | n/a | n/a | 0.051 | 4.964 | 0.219 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000048c | 17.910 | 3.778 | 0.007 | 0.000 | 0.643 | 1.271 | 1.865 | 0.050 | n/a | 0.394 | 9.842 | n/a | n/a | 0.060 | 4.428 | 0.247 | 0.060 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000482 | 16.602 | 3.714 | 0.005 | 1.922 | 0.899 | 1.036 | 4.243 | 0.031 | n/a | 0.260 | 4.448 | n/a | n/a | 0.043 | 6.541 | 0.394 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000049e | 16.262 | 4.856 | 0.006 | 0.000 | 0.682 | 1.006 | 3.047 | 0.038 | n/a | 0.331 | 6.251 | n/a | n/a | 0.046 | 5.544 | 0.341 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000490 | 12.378 | 2.889 | 0.006 | 0.000 | 0.822 | 0.637 | 1.469 | 0.027 | n/a | 0.446 | 6.047 | n/a | n/a | 0.036 | 3.717 | 0.300 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.202 | 0.612 | 0.000 | 1.243 | 4.938 | 0.191 | 0.000 | 0.126 | 1.308 | 4.861 | 0.044 | n/a | 0.299 | 12.652 | n/a | n/a | 0.054 | 5.216 | 0.205 | 0.054 |
| p99 | 87.715 | 6.050 | 2.656 | 8.663 | 18.827 | 0.922 | 2.153 | 1.271 | 5.428 | 16.150 | 0.110 | n/a | 1.088 | 75.948 | n/a | n/a | 0.175 | 20.045 | 0.476 | 0.175 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba00000000000004de | 87.715 | 5.963 | 0.006 | 0.000 | 0.249 | 0.768 | 4.457 | 0.026 | n/a | 0.221 | 75.948 | n/a | n/a | 0.076 | 6.218 | 0.071 | 0.076 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004d9 | 83.626 | 5.258 | 0.326 | 0.000 | 0.064 | 2.325 | 11.710 | 0.058 | n/a | 0.802 | 63.031 | n/a | n/a | 0.053 | 5.647 | 0.068 | 0.053 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004b7 | 52.024 | 4.980 | 0.304 | 0.000 | 0.125 | 1.928 | 11.816 | 0.052 | n/a | 0.266 | 32.472 | n/a | n/a | 0.079 | 5.410 | 0.104 | 0.079 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004e4 | 42.414 | 5.434 | 0.325 | 0.000 | 0.125 | 5.428 | 14.156 | 0.070 | n/a | 0.273 | 16.539 | n/a | n/a | 0.067 | 5.883 | 0.139 | 0.067 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004e8 | 42.080 | 18.827 | 0.008 | 0.000 | 1.210 | 0.901 | 4.861 | 0.057 | n/a | 1.088 | 15.014 | n/a | n/a | 0.115 | 20.045 | 0.476 | 0.115 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004db | 42.033 | 5.988 | 0.005 | 2.153 | 0.892 | 0.674 | 1.846 | 0.034 | n/a | 0.257 | 30.096 | n/a | n/a | 0.088 | 9.039 | 0.215 | 0.088 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004cb | 38.455 | 4.640 | 0.463 | 0.000 | 0.077 | 2.647 | 15.209 | 0.079 | n/a | 0.461 | 14.817 | n/a | n/a | 0.061 | 5.180 | 0.135 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004e6 | 37.750 | 3.879 | 0.340 | 0.000 | 0.143 | 1.318 | 8.095 | 0.044 | n/a | 0.491 | 23.347 | n/a | n/a | 0.093 | 4.362 | 0.116 | 0.093 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004d1 | 34.341 | 4.701 | 0.197 | 0.000 | 0.060 | 2.118 | 9.308 | 0.043 | n/a | 0.218 | 17.650 | n/a | n/a | 0.046 | 4.958 | 0.144 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004c7 | 34.242 | 5.535 | 0.289 | 0.000 | 0.062 | 1.667 | 13.494 | 0.099 | n/a | 0.252 | 12.759 | n/a | n/a | 0.084 | 5.886 | 0.172 | 0.084 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004e0 | 33.709 | 5.506 | 0.380 | 0.000 | 0.109 | 1.951 | 11.150 | 0.101 | n/a | 0.727 | 13.705 | n/a | n/a | 0.081 | 5.994 | 0.178 | 0.081 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004b0 | 33.345 | 4.311 | 0.315 | 0.000 | 0.073 | 1.417 | 16.150 | 0.094 | n/a | 1.064 | 9.869 | n/a | n/a | 0.052 | 4.699 | 0.141 | 0.052 | gw-w/thread-44/gateway.admitted-work | none observed |
| f87b72a2e58b18ba00000000000004ea | 32.749 | 3.949 | 0.922 | 0.000 | 0.082 | 1.576 | 12.702 | 0.042 | n/a | 0.255 | 13.161 | n/a | n/a | 0.061 | 4.953 | 0.151 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004cd | 32.302 | 5.097 | 0.249 | 0.000 | 0.126 | 1.876 | 9.641 | 0.035 | n/a | 0.248 | 14.957 | n/a | n/a | 0.073 | 5.472 | 0.169 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004f2 | 32.238 | 4.938 | 0.257 | 0.000 | 0.103 | 1.406 | 7.399 | 0.032 | n/a | 0.199 | 17.834 | n/a | n/a | 0.070 | 5.298 | 0.164 | 0.070 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004bf | 31.837 | 4.214 | 0.290 | 0.000 | 0.069 | 1.589 | 15.781 | 0.042 | n/a | 0.231 | 9.568 | n/a | n/a | 0.054 | 4.573 | 0.144 | 0.054 | gw-w/thread-44/gateway.admitted-work | none observed |
| f87b72a2e58b18ba00000000000004cf | 30.500 | 9.813 | 0.013 | 0.000 | 0.205 | 1.044 | 1.469 | 0.026 | n/a | 0.206 | 17.654 | n/a | n/a | 0.070 | 10.031 | 0.329 | 0.070 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004d5 | 30.113 | 4.892 | 0.206 | 0.000 | 0.067 | 1.736 | 5.974 | 0.040 | n/a | 0.482 | 16.672 | n/a | n/a | 0.044 | 5.165 | 0.172 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004f0 | 29.980 | 4.042 | 0.366 | 0.000 | 0.107 | 1.511 | 6.895 | 0.068 | n/a | 0.368 | 16.559 | n/a | n/a | 0.063 | 4.515 | 0.151 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004d3 | 29.202 | 5.010 | 0.299 | 0.000 | 0.071 | 1.934 | 12.786 | 0.037 | n/a | 0.609 | 8.402 | n/a | n/a | 0.054 | 5.380 | 0.184 | 0.054 | gw-w/thread-49/gateway.admitted-work | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.680 | 0.923 | 0.000 | 1.855 | 4.227 | 0.006 | 0.000 | 0.418 | 0.829 | 1.436 | 0.043 | n/a | 0.462 | 9.941 | n/a | n/a | 0.049 | 4.880 | 0.297 | 0.049 |
| p99 | 22.802 | 1.830 | 2.656 | 4.805 | 6.935 | 0.012 | 0.000 | 1.017 | 1.308 | 5.383 | 0.110 | n/a | 1.022 | 12.652 | n/a | n/a | 0.175 | 7.876 | 0.455 | 0.175 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba00000000000004e2 | 22.802 | 6.416 | 0.008 | 0.000 | 0.401 | 1.115 | 2.131 | 0.097 | n/a | 0.986 | 11.473 | n/a | n/a | 0.175 | 6.825 | 0.299 | 0.175 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004d7 | 22.103 | 6.935 | 0.006 | 0.000 | 0.935 | 1.212 | 2.202 | 0.110 | n/a | 1.022 | 9.631 | n/a | n/a | 0.049 | 7.876 | 0.356 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004ae | 21.062 | 4.227 | 0.007 | 0.000 | 0.271 | 0.915 | 5.383 | 0.048 | n/a | 0.221 | 9.941 | n/a | n/a | 0.050 | 4.506 | 0.214 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004b2 | 20.739 | 5.234 | 0.012 | 0.000 | 1.017 | 1.135 | 1.776 | 0.037 | n/a | 0.657 | 10.797 | n/a | n/a | 0.074 | 6.263 | 0.302 | 0.074 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004bd | 19.986 | 3.278 | 0.005 | 0.000 | 0.834 | 0.829 | 1.635 | 0.059 | n/a | 0.650 | 12.652 | n/a | n/a | 0.045 | 4.117 | 0.206 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004f6 | 18.680 | 4.005 | 0.005 | 0.000 | 0.870 | 0.633 | 1.228 | 0.027 | n/a | 0.228 | 11.649 | n/a | n/a | 0.034 | 4.880 | 0.261 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004ee | 18.508 | 3.318 | 0.005 | 0.000 | 0.390 | 0.828 | 1.330 | 0.043 | n/a | 0.360 | 12.186 | n/a | n/a | 0.047 | 3.713 | 0.201 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004c5 | 17.147 | 5.540 | 0.006 | 0.000 | 0.063 | 0.680 | 1.197 | 0.034 | n/a | 0.514 | 9.075 | n/a | n/a | 0.039 | 5.608 | 0.327 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004fa | 15.144 | 4.078 | 0.007 | 0.000 | 0.418 | 0.723 | 1.436 | 0.049 | n/a | 0.462 | 7.902 | n/a | n/a | 0.069 | 4.504 | 0.297 | 0.069 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004c3 | 13.726 | 5.404 | 0.006 | 0.000 | 0.832 | 1.308 | 1.259 | 0.033 | n/a | 0.201 | 4.633 | n/a | n/a | 0.050 | 6.241 | 0.455 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (93 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.069 | n/a | n/a | n/a | 32.144 | 21.417 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 60.495 | 0.999 | 0.018 |
| p99 | 431.981 | n/a | n/a | n/a | 85.350 | 150.139 | 12.229 | 0.000 | 280.826 | 160.767 | 108.686 | n/a | 8.151 | 0.000 | n/a | n/a | 126.535 | 165.444 | 1.000 | 126.535 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba00000000000014bf | 431.981 | 50.619 | 11.344 | 1.279 | 0.000 | 280.826 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 87.914 | 63.241 | 0.146 | 87.914 | node-14/thread-0/socket.queue-and-write | driver.expected-state.bind-receipt 30.484ms; driver.publication 5.569ms; client.parse 5.248ms; driver.publication 4.698ms; driver.publication 3.881ms |
| f87b72a2e58b18ba00000000000014be | 292.263 | 60.125 | 104.041 | 1.279 | 0.000 | 0.284 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 126.535 | 165.444 | 0.566 | 126.535 | node-14/thread-0/socket.wait-first-byte | client.parse 5.248ms; driver.publication 3.881ms; driver.publication 1.278ms; driver.publication 1.232ms; client.parse 1.054ms |
| f87b72a2e58b18ba0000000000000a66 | 284.436 | 63.455 | 66.349 | 3.757 | 0.000 | 11.338 | 79.425 | 59.859 | n/a | 0.225 | 0.000 | n/a | n/a | 0.027 | 133.562 | 0.470 | 0.027 | node-14/thread-0/rpc.replica.observe | driver.publication 3.582ms; driver.publication 2.134ms; driver.publication 1.725ms; driver.publication 1.376ms; driver.publication 1.362ms |
| f87b72a2e58b18ba0000000000001fcd | 203.035 | 47.716 | 7.182 | 7.708 | 0.000 | 116.883 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.545 | 62.607 | 0.308 | 23.545 | node-14/thread-0/socket.queue-and-write | driver.publication 1.571ms; driver.publication 1.412ms; driver.publication 1.251ms; driver.publication 1.099ms |
| f87b72a2e58b18ba00000000000014b7 | 195.802 | 15.087 | 3.968 | 6.797 | 0.000 | 110.594 | 9.530 | 49.810 | n/a | 0.004 | 0.000 | n/a | n/a | 0.012 | 25.852 | 0.132 | 0.012 | node-14/thread-0/socket.wait-first-byte | client.parse 5.248ms; driver.publication 3.881ms; driver.publication 1.830ms; driver.publication 1.232ms; client.parse 1.054ms |
| f87b72a2e58b18ba00000000000018b5 | 187.673 | 32.954 | 12.441 | 0.000 | 0.000 | 67.460 | 53.683 | 21.099 | n/a | 0.026 | 0.000 | n/a | n/a | 0.011 | 45.395 | 0.242 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.477ms; driver.publication 1.555ms; client.parse 1.549ms; driver.publication 1.333ms; client.parse 1.170ms |
| f87b72a2e58b18ba00000000000004dc | 186.331 | 17.905 | 6.218 | 0.000 | 0.000 | 0.982 | 160.767 | 0.010 | n/a | 0.418 | 0.000 | n/a | n/a | 0.030 | 24.123 | 0.129 | 0.030 | gw-w/thread-48/gateway.admitted-work | driver.publication 1.997ms |
| f87b72a2e58b18ba00000000000014b6 | 185.156 | 85.350 | 12.764 | 0.000 | 0.000 | 35.692 | 27.051 | 24.274 | n/a | 0.010 | 0.000 | n/a | n/a | 0.016 | 98.114 | 0.530 | 0.016 | node-14/thread-0/client.reach | driver.publication 3.881ms; driver.publication 1.830ms; driver.publication 1.232ms; driver.publication 1.133ms; client.parse 1.054ms |
| f87b72a2e58b18ba00000000000018b2 | 160.872 | 39.348 | 19.410 | 2.564 | 0.000 | 38.854 | 26.456 | 34.208 | n/a | 0.013 | 0.000 | n/a | n/a | 0.018 | 61.322 | 0.381 | 0.018 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.477ms; driver.publication 1.555ms; driver.publication 1.286ms; client.parse 1.170ms; driver.publication 1.156ms |
| f87b72a2e58b18ba0000000000001fca | 156.348 | 19.075 | 6.962 | 0.000 | 0.000 | 42.935 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 87.376 | 26.037 | 0.167 | 87.376 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.571ms; driver.publication 1.412ms; driver.publication 1.251ms; driver.publication 1.249ms; driver.publication 1.148ms |
| f87b72a2e58b18ba000000000000142d | 154.671 | 4.518 | 150.139 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 154.657 | 1.000 | 0.014 | node-14/thread-0/rpc.replica.observe | client.encode 10.100ms; driver.publication 8.707ms; driver.expected-state.bind-receipt 7.608ms; driver.publication 2.771ms; driver.expected-state.bind-receipt 2.604ms |
| f87b72a2e58b18ba0000000000001fc4 | 154.506 | 25.946 | 9.139 | 0.000 | 0.000 | 58.738 | 24.970 | 35.689 | n/a | 0.005 | 0.000 | n/a | n/a | 0.018 | 35.086 | 0.227 | 0.018 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.571ms; driver.publication 1.412ms; driver.publication 1.251ms; driver.publication 1.249ms; driver.publication 1.242ms |
| f87b72a2e58b18ba0000000000001462 | 154.055 | 19.475 | 21.417 | 0.000 | 0.000 | 49.451 | 17.537 | 46.158 | n/a | 0.005 | 0.000 | n/a | n/a | 0.010 | 40.893 | 0.265 | 0.010 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.634ms; driver.publication 1.607ms; driver.publication 1.486ms; driver.publication 1.110ms; driver.publication 1.099ms |
| f87b72a2e58b18ba00000000000006c9 | 149.461 | 22.520 | 9.945 | 0.000 | 0.000 | 8.772 | 18.851 | 89.334 | n/a | 0.026 | 0.000 | n/a | n/a | 0.012 | 32.466 | 0.217 | 0.012 | gw-w/thread-48/gateway.admission-wait | driver.publication 3.450ms; driver.publication 2.684ms; driver.publication 1.490ms; driver.publication 1.194ms; driver.publication 1.115ms |
| f87b72a2e58b18ba0000000000000a69 | 148.313 | 15.682 | 5.622 | 0.000 | 0.000 | 13.539 | 4.737 | 108.686 | n/a | 0.025 | 0.000 | n/a | n/a | 0.022 | 21.304 | 0.144 | 0.022 | gw-w/thread-49/gateway.admission-wait | driver.publication 3.582ms; driver.publication 2.134ms; driver.publication 1.362ms; driver.publication 1.283ms; driver.publication 1.036ms |
| f87b72a2e58b18ba0000000000001fcf | 147.625 | 40.529 | 36.948 | 1.037 | 0.000 | 0.100 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 69.012 | 78.514 | 0.532 | 69.012 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.412ms; driver.publication 1.251ms |
| f87b72a2e58b18ba0000000000001fd1 | 138.973 | 43.572 | 23.983 | 1.037 | 0.000 | 0.086 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 70.295 | 68.592 | 0.494 | 70.295 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.251ms |
| f87b72a2e58b18ba0000000000000990 | 138.914 | 32.803 | 19.743 | 2.249 | 0.000 | 1.024 | 83.040 | 0.007 | n/a | 0.016 | 0.000 | n/a | n/a | 0.032 | 54.795 | 0.394 | 0.032 | gw-w/thread-49/gateway.admitted-work | driver.expected-state.bind-receipt 1.548ms; driver.publication 1.541ms; driver.publication 1.382ms; driver.publication 1.352ms; driver.publication 1.325ms |
| f87b72a2e58b18ba0000000000001488 | 134.668 | 59.515 | 17.609 | 0.000 | 0.000 | 1.996 | 55.475 | 0.038 | n/a | 0.020 | 0.000 | n/a | n/a | 0.016 | 77.124 | 0.573 | 0.016 | gw-w/thread-46/gateway.admitted-work | driver.publication 1.420ms; driver.publication 1.416ms; driver.publication 1.264ms |
| f87b72a2e58b18ba00000000000014c9 | 129.380 | 2.786 | 126.579 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 129.365 | 1.000 | 0.016 | node-14/thread-0/rpc.replica.observe | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.523 | 0.714 | 0.000 | 1.610 | 4.953 | 0.032 | 0.000 | 0.277 | 1.327 | 5.002 | 0.043 | n/a | 0.343 | 12.828 | n/a | n/a | 0.057 | 5.457 | 0.210 | 0.057 |
| p99 | 232.883 | 3.994 | 0.008 | 3.727 | 22.127 | 0.740 | 0.000 | 2.086 | 5.344 | 212.436 | 0.183 | n/a | 2.649 | 75.817 | n/a | n/a | 0.129 | 22.645 | 0.364 | 0.129 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba000000000000053b | 232.883 | 5.516 | 0.350 | 0.000 | 0.158 | 2.036 | 212.436 | 0.043 | n/a | 0.339 | 11.938 | n/a | n/a | 0.067 | 6.024 | 0.026 | 0.067 | gw-w/thread-47/gateway.admitted-work | none observed |
| f87b72a2e58b18ba0000000000000510 | 88.713 | 8.178 | 0.005 | 0.000 | 0.777 | 1.014 | 2.468 | 0.048 | n/a | 0.335 | 75.817 | n/a | n/a | 0.072 | 8.959 | 0.101 | 0.072 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000521 | 75.665 | 22.127 | 0.032 | 0.000 | 0.486 | 5.314 | 30.977 | 0.183 | n/a | 0.690 | 15.779 | n/a | n/a | 0.077 | 22.645 | 0.299 | 0.077 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004fc | 62.483 | 9.406 | 0.516 | 0.000 | 0.277 | 3.707 | 18.137 | 0.102 | n/a | 0.563 | 29.646 | n/a | n/a | 0.129 | 10.198 | 0.163 | 0.129 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000509 | 41.014 | 3.799 | 0.248 | 0.000 | 0.065 | 1.228 | 17.412 | 0.063 | n/a | 0.524 | 17.631 | n/a | n/a | 0.043 | 4.112 | 0.100 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000050f | 38.709 | 5.023 | 0.317 | 0.000 | 0.117 | 1.327 | 9.302 | 0.034 | n/a | 0.190 | 22.345 | n/a | n/a | 0.054 | 5.457 | 0.141 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000050b | 37.734 | 4.212 | 0.256 | 0.000 | 0.073 | 1.466 | 11.363 | 0.110 | n/a | 0.837 | 19.345 | n/a | n/a | 0.073 | 4.541 | 0.120 | 0.073 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000053f | 37.643 | 7.061 | 0.412 | 0.000 | 0.094 | 2.515 | 15.909 | 0.104 | n/a | 0.369 | 11.096 | n/a | n/a | 0.083 | 7.567 | 0.201 | 0.083 | gw-w/thread-42/gateway.admitted-work | none observed |
| f87b72a2e58b18ba0000000000000541 | 35.427 | 4.359 | 0.717 | 0.000 | 0.090 | 1.920 | 14.320 | 0.070 | n/a | 0.329 | 13.563 | n/a | n/a | 0.059 | 5.166 | 0.146 | 0.059 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000054b | 35.415 | 5.400 | 0.320 | 0.000 | 0.137 | 1.867 | 10.408 | 0.051 | n/a | 0.321 | 16.808 | n/a | n/a | 0.102 | 5.857 | 0.165 | 0.102 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000533 | 35.269 | 4.586 | 0.302 | 0.000 | 0.071 | 1.346 | 10.512 | 0.039 | n/a | 0.212 | 18.136 | n/a | n/a | 0.064 | 4.959 | 0.141 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000051d | 35.147 | 5.746 | 0.333 | 0.000 | 0.147 | 1.763 | 7.549 | 0.059 | n/a | 0.343 | 19.143 | n/a | n/a | 0.065 | 6.226 | 0.177 | 0.065 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000505 | 34.244 | 7.949 | 0.006 | 0.000 | 2.086 | 5.344 | 2.238 | 0.031 | n/a | 0.719 | 15.813 | n/a | n/a | 0.057 | 10.042 | 0.293 | 0.057 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.235ms |
| f87b72a2e58b18ba0000000000000502 | 32.274 | 5.293 | 0.264 | 0.000 | 0.085 | 1.337 | 9.075 | 0.040 | n/a | 0.528 | 15.602 | n/a | n/a | 0.050 | 5.642 | 0.175 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000051f | 29.847 | 3.724 | 0.276 | 0.000 | 0.073 | 1.609 | 11.191 | 0.034 | n/a | 0.380 | 12.516 | n/a | n/a | 0.043 | 4.073 | 0.136 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000549 | 28.536 | 4.490 | 0.272 | 0.000 | 0.055 | 1.421 | 11.209 | 0.061 | n/a | 0.338 | 10.637 | n/a | n/a | 0.052 | 4.817 | 0.169 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000052b | 28.085 | 4.384 | 0.311 | 0.000 | 0.086 | 1.673 | 9.843 | 0.053 | n/a | 0.218 | 11.467 | n/a | n/a | 0.050 | 4.781 | 0.170 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000537 | 27.558 | 4.002 | 0.211 | 0.000 | 0.069 | 1.383 | 8.194 | 0.045 | n/a | 0.432 | 13.165 | n/a | n/a | 0.057 | 4.282 | 0.155 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000052d | 27.286 | 5.550 | 0.007 | 0.000 | 0.564 | 0.932 | 2.741 | 0.041 | n/a | 2.649 | 14.733 | n/a | n/a | 0.070 | 6.120 | 0.224 | 0.070 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000500 | 25.516 | 4.953 | 0.006 | 0.000 | 0.961 | 0.866 | 5.002 | 0.037 | n/a | 0.204 | 13.435 | n/a | n/a | 0.052 | 5.921 | 0.232 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.451 | 0.866 | 0.000 | 1.957 | 4.638 | 0.006 | 0.000 | 0.598 | 0.861 | 1.407 | 0.036 | n/a | 0.305 | 12.777 | n/a | n/a | 0.057 | 5.370 | 0.251 | 0.057 |
| p99 | 25.516 | 2.080 | 0.008 | 2.189 | 5.979 | 0.018 | 0.000 | 0.969 | 1.468 | 5.129 | 0.057 | n/a | 0.986 | 15.379 | n/a | n/a | 0.081 | 6.803 | 0.363 | 0.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba0000000000000500 | 25.516 | 4.953 | 0.006 | 0.000 | 0.961 | 0.866 | 5.002 | 0.037 | n/a | 0.204 | 13.435 | n/a | n/a | 0.052 | 5.921 | 0.232 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000054d | 24.523 | 4.815 | 0.006 | 0.000 | 0.598 | 0.772 | 5.129 | 0.047 | n/a | 0.305 | 12.777 | n/a | n/a | 0.073 | 5.419 | 0.221 | 0.073 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000051b | 23.391 | 5.871 | 0.010 | 0.000 | 0.290 | 0.777 | 1.185 | 0.032 | n/a | 0.218 | 14.946 | n/a | n/a | 0.063 | 6.171 | 0.264 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000504 | 23.295 | 4.480 | 0.005 | 0.000 | 0.401 | 0.917 | 1.323 | 0.032 | n/a | 0.676 | 15.379 | n/a | n/a | 0.080 | 4.886 | 0.210 | 0.080 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000004fe | 22.789 | 5.868 | 0.011 | 0.000 | 0.924 | 0.954 | 1.104 | 0.034 | n/a | 0.866 | 12.960 | n/a | n/a | 0.069 | 6.803 | 0.299 | 0.069 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000535 | 22.637 | 3.447 | 0.005 | 0.000 | 0.422 | 1.468 | 1.672 | 0.041 | n/a | 0.245 | 15.296 | n/a | n/a | 0.040 | 3.875 | 0.171 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000050d | 22.329 | 4.638 | 0.005 | 0.000 | 0.969 | 0.861 | 2.228 | 0.029 | n/a | 0.190 | 13.352 | n/a | n/a | 0.057 | 5.612 | 0.251 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000527 | 20.451 | 3.336 | 0.005 | 0.000 | 0.783 | 0.843 | 2.148 | 0.052 | n/a | 0.967 | 12.273 | n/a | n/a | 0.043 | 4.125 | 0.202 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000543 | 20.314 | 4.584 | 0.004 | 0.000 | 0.460 | 0.696 | 1.407 | 0.036 | n/a | 0.258 | 12.828 | n/a | n/a | 0.040 | 5.049 | 0.249 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000052f | 19.857 | 3.614 | 0.005 | 0.000 | 0.566 | 0.889 | 1.748 | 0.052 | n/a | 0.986 | 11.950 | n/a | n/a | 0.046 | 4.185 | 0.211 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000519 | 19.788 | 5.979 | 0.017 | 0.000 | 0.527 | 0.760 | 1.132 | 0.036 | n/a | 0.222 | 11.033 | n/a | n/a | 0.081 | 6.523 | 0.330 | 0.081 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000516 | 18.863 | 5.503 | 0.018 | 0.000 | 0.955 | 0.779 | 1.186 | 0.034 | n/a | 0.381 | 9.946 | n/a | n/a | 0.063 | 6.475 | 0.343 | 0.063 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000513 | 15.489 | 4.518 | 0.006 | 0.000 | 0.771 | 1.166 | 2.044 | 0.057 | n/a | 0.527 | 6.357 | n/a | n/a | 0.043 | 5.295 | 0.342 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000053d | 14.831 | 5.143 | 0.010 | 0.000 | 0.217 | 0.982 | 1.302 | 0.042 | n/a | 0.891 | 6.171 | n/a | n/a | 0.072 | 5.370 | 0.362 | 0.072 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000538 | 10.887 | 3.199 | 0.005 | 0.000 | 0.743 | 0.606 | 1.137 | 0.031 | n/a | 0.203 | 4.919 | n/a | n/a | 0.043 | 3.948 | 0.363 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.440 | 0.875 | 0.000 | 1.697 | 5.005 | 0.012 | 0.000 | 0.428 | 1.102 | 4.844 | 0.039 | n/a | 0.292 | 10.375 | n/a | n/a | 0.055 | 5.476 | 0.273 | 0.055 |
| p99 | 144.264 | 30.056 | 0.804 | 31.435 | 75.336 | 1.109 | 0.000 | 35.270 | 6.765 | 38.678 | 0.221 | n/a | 4.720 | 60.212 | n/a | n/a | 0.968 | 75.958 | 0.700 | 0.968 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba00000000000005a4 | 144.264 | 75.336 | 0.016 | 0.000 | 0.605 | 5.695 | 7.996 | 0.171 | n/a | 1.071 | 52.406 | n/a | n/a | 0.968 | 75.958 | 0.527 | 0.968 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005a6 | 107.944 | 40.328 | 0.012 | 0.000 | 35.270 | 6.395 | 5.118 | 0.221 | n/a | 1.656 | 18.850 | n/a | n/a | 0.095 | 75.610 | 0.700 | 0.095 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 19.535ms; driver.publication 5.731ms; driver.expected-state.add-commit 2.777ms |
| f87b72a2e58b18ba0000000000000577 | 75.176 | 3.849 | 0.273 | 0.000 | 0.109 | 1.688 | 15.762 | 0.066 | n/a | 0.356 | 53.005 | n/a | n/a | 0.069 | 4.231 | 0.056 | 0.069 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005ae | 73.456 | 4.381 | 0.400 | 0.000 | 0.058 | 1.226 | 6.615 | 0.041 | n/a | 0.462 | 60.212 | n/a | n/a | 0.060 | 4.839 | 0.066 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000054f | 59.898 | 3.907 | 0.245 | 0.000 | 0.052 | 1.207 | 10.980 | 0.063 | n/a | 0.223 | 43.175 | n/a | n/a | 0.047 | 4.205 | 0.070 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000575 | 59.520 | 4.614 | 0.300 | 0.000 | 0.064 | 1.932 | 38.678 | 0.074 | n/a | 0.430 | 13.364 | n/a | n/a | 0.065 | 4.978 | 0.084 | 0.065 | gw-w/thread-48/gateway.admitted-work | none observed |
| f87b72a2e58b18ba00000000000005a2 | 50.247 | 9.827 | 1.057 | 0.000 | 0.145 | 3.810 | 20.970 | 0.071 | n/a | 0.312 | 13.865 | n/a | n/a | 0.190 | 11.029 | 0.219 | 0.190 | gw-w/thread-45/gateway.admitted-work | none observed |
| f87b72a2e58b18ba000000000000058b | 47.687 | 7.852 | 0.006 | 0.000 | 0.589 | 0.962 | 2.258 | 0.033 | n/a | 0.211 | 35.734 | n/a | n/a | 0.043 | 8.447 | 0.177 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000563 | 46.969 | 5.927 | 0.240 | 0.000 | 0.065 | 1.661 | 24.416 | 0.032 | n/a | 0.191 | 14.396 | n/a | n/a | 0.041 | 6.233 | 0.133 | 0.041 | gw-w/thread-49/gateway.admitted-work | none observed |
| f87b72a2e58b18ba0000000000000597 | 38.360 | 5.005 | 0.211 | 0.000 | 0.063 | 1.936 | 19.857 | 0.039 | n/a | 0.216 | 10.989 | n/a | n/a | 0.044 | 5.278 | 0.138 | 0.044 | gw-w/thread-49/gateway.admitted-work | none observed |
| f87b72a2e58b18ba0000000000000592 | 38.239 | 5.186 | 0.374 | 0.000 | 0.029 | 6.765 | 15.770 | 0.038 | n/a | 0.499 | 9.532 | n/a | n/a | 0.045 | 5.589 | 0.146 | 0.045 | gw-w/thread-46/gateway.admitted-work | driver.publication 1.075ms |
| f87b72a2e58b18ba0000000000000558 | 35.728 | 8.105 | 0.011 | 0.000 | 0.960 | 0.880 | 2.325 | 0.036 | n/a | 0.269 | 23.055 | n/a | n/a | 0.087 | 9.076 | 0.254 | 0.087 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000552 | 35.106 | 3.892 | 0.214 | 0.000 | 0.077 | 1.309 | 9.155 | 0.039 | n/a | 0.208 | 20.175 | n/a | n/a | 0.039 | 4.182 | 0.119 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000585 | 34.796 | 4.817 | 0.182 | 0.000 | 0.071 | 1.582 | 10.936 | 0.047 | n/a | 0.205 | 16.907 | n/a | n/a | 0.051 | 5.070 | 0.146 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000589 | 33.045 | 3.960 | 0.260 | 0.000 | 0.076 | 1.843 | 10.057 | 0.060 | n/a | 0.833 | 15.912 | n/a | n/a | 0.044 | 4.296 | 0.130 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000055d | 31.238 | 3.979 | 0.236 | 0.000 | 0.115 | 1.180 | 9.929 | 0.042 | n/a | 0.222 | 15.478 | n/a | n/a | 0.057 | 4.330 | 0.139 | 0.057 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000055f | 30.584 | 6.308 | 0.011 | 0.000 | 0.910 | 1.044 | 7.204 | 0.053 | n/a | 0.456 | 14.507 | n/a | n/a | 0.092 | 7.229 | 0.236 | 0.092 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000057f | 27.671 | 3.833 | 1.109 | 0.000 | 0.067 | 1.390 | 8.249 | 0.040 | n/a | 0.269 | 12.659 | n/a | n/a | 0.056 | 5.008 | 0.181 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000561 | 27.610 | 8.687 | 0.006 | 0.000 | 1.117 | 0.848 | 5.991 | 0.030 | n/a | 0.373 | 10.518 | n/a | n/a | 0.040 | 9.810 | 0.355 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005a8 | 27.447 | 4.844 | 0.423 | 0.000 | 0.090 | 1.780 | 7.685 | 0.065 | n/a | 0.562 | 11.931 | n/a | n/a | 0.068 | 5.357 | 0.195 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.621 | 0.913 | 0.000 | 1.899 | 5.369 | 0.007 | 0.000 | 0.724 | 0.938 | 1.935 | 0.040 | n/a | 0.396 | 5.930 | n/a | n/a | 0.062 | 5.978 | 0.340 | 0.062 |
| p99 | 107.944 | 5.386 | 0.804 | 6.534 | 40.328 | 0.015 | 0.000 | 35.270 | 6.395 | 7.204 | 0.221 | n/a | 2.025 | 18.850 | n/a | n/a | 0.110 | 75.610 | 0.700 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba00000000000005a6 | 107.944 | 40.328 | 0.012 | 0.000 | 35.270 | 6.395 | 5.118 | 0.221 | n/a | 1.656 | 18.850 | n/a | n/a | 0.095 | 75.610 | 0.700 | 0.095 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 19.535ms; driver.publication 5.731ms; driver.expected-state.add-commit 2.777ms |
| f87b72a2e58b18ba000000000000055f | 30.584 | 6.308 | 0.011 | 0.000 | 0.910 | 1.044 | 7.204 | 0.053 | n/a | 0.456 | 14.507 | n/a | n/a | 0.092 | 7.229 | 0.236 | 0.092 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005b2 | 22.440 | 6.301 | 0.015 | 0.000 | 0.802 | 0.987 | 1.991 | 0.071 | n/a | 0.439 | 11.768 | n/a | n/a | 0.068 | 7.117 | 0.317 | 0.068 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000551 | 22.139 | 5.889 | 0.007 | 0.000 | 0.266 | 5.480 | 6.963 | 0.089 | n/a | 0.364 | 3.027 | n/a | n/a | 0.055 | 6.162 | 0.278 | 0.055 | node-14/thread-0/socket.wait-first-byte | none observed |
| f87b72a2e58b18ba000000000000057a | 20.318 | 5.888 | 0.010 | 0.000 | 0.544 | 0.980 | 0.868 | 0.024 | n/a | 0.283 | 11.610 | n/a | n/a | 0.110 | 6.443 | 0.317 | 0.110 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.233ms |
| f87b72a2e58b18ba00000000000005ac | 19.708 | 7.961 | 0.005 | 0.000 | 1.111 | 0.723 | 1.866 | 0.031 | n/a | 2.025 | 5.930 | n/a | n/a | 0.055 | 9.078 | 0.461 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000058f | 17.960 | 5.842 | 0.006 | 0.000 | 1.219 | 0.889 | 1.935 | 0.052 | n/a | 0.929 | 7.023 | n/a | n/a | 0.064 | 7.068 | 0.394 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000599 | 17.577 | 5.426 | 0.010 | 0.000 | 0.542 | 3.394 | 5.474 | 0.047 | n/a | 0.246 | 2.376 | n/a | n/a | 0.062 | 5.978 | 0.340 | 0.062 | node-14/thread-0/driver.execute | none observed |
| f87b72a2e58b18ba000000000000055a | 16.621 | 5.152 | 0.008 | 0.000 | 0.477 | 1.789 | 1.884 | 0.033 | n/a | 0.226 | 6.991 | n/a | n/a | 0.061 | 5.636 | 0.339 | 0.061 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000059e | 15.164 | 3.587 | 0.005 | 0.000 | 0.176 | 0.682 | 0.945 | 0.026 | n/a | 0.396 | 9.298 | n/a | n/a | 0.049 | 3.768 | 0.248 | 0.049 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000058d | 15.105 | 5.369 | 0.006 | 0.000 | 0.724 | 0.938 | 1.864 | 0.053 | n/a | 1.018 | 5.083 | n/a | n/a | 0.050 | 6.099 | 0.404 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000556 | 15.092 | 4.105 | 0.006 | 0.000 | 0.428 | 0.700 | 1.997 | 0.040 | n/a | 0.238 | 7.536 | n/a | n/a | 0.042 | 4.539 | 0.301 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000583 | 14.392 | 4.441 | 0.006 | 0.000 | 0.439 | 0.895 | 2.832 | 0.037 | n/a | 0.299 | 5.385 | n/a | n/a | 0.058 | 4.886 | 0.340 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000594 | 13.548 | 3.054 | 0.006 | 0.000 | 1.069 | 0.706 | 3.218 | 0.030 | n/a | 0.386 | 5.031 | n/a | n/a | 0.050 | 4.128 | 0.305 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba000000000000056f | 12.925 | 4.644 | 0.010 | 0.000 | 0.511 | 0.829 | 1.107 | 0.028 | n/a | 0.401 | 5.319 | n/a | n/a | 0.076 | 5.166 | 0.400 | 0.076 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000565 | 12.494 | 3.855 | 0.005 | 0.000 | 1.007 | 0.729 | 0.893 | 0.045 | n/a | 0.370 | 5.490 | n/a | n/a | 0.100 | 4.867 | 0.390 | 0.100 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005b0 | 11.445 | 4.543 | 0.010 | 0.000 | 0.922 | 0.971 | 0.909 | 0.027 | n/a | 0.662 | 3.325 | n/a | n/a | 0.075 | 5.476 | 0.478 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.492 | 0.743 | 0.000 | 1.241 | 4.599 | 0.017 | 0.000 | 0.177 | 1.195 | 2.845 | 0.041 | n/a | 0.440 | 10.203 | n/a | n/a | 0.060 | 5.139 | 0.249 | 0.060 |
| p99 | 68.575 | 3.477 | 0.000 | 4.487 | 11.354 | n/a | 0.000 | 3.294 | 2.950 | 44.436 | 0.101 | n/a | 25.836 | 38.813 | n/a | n/a | 0.168 | 14.655 | 0.523 | 0.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba00000000000005e3 | 68.575 | 4.225 | 0.306 | 0.000 | 0.070 | 1.516 | 23.089 | 0.043 | n/a | 0.456 | 38.813 | n/a | n/a | 0.056 | 4.602 | 0.067 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005fd | 52.494 | 4.294 | n/a | 0.000 | 0.664 | 2.860 | 44.436 | 0.046 | n/a | 0.136 | 0.000 | n/a | n/a | 0.057 | 4.958 | 0.094 | 0.057 | gw-w/thread-44/gateway.admitted-work | none observed |
| f87b72a2e58b18ba00000000000005d5 | 50.127 | 3.496 | 0.272 | 0.000 | 0.063 | 1.373 | 6.079 | 0.042 | n/a | 25.836 | 12.925 | n/a | n/a | 0.042 | 3.831 | 0.076 | 0.042 | gw-w/thread-44/d/db | none observed |
| f87b72a2e58b18ba00000000000005c3 | 49.139 | 4.860 | 0.506 | 0.000 | 0.081 | 1.377 | 24.015 | 0.068 | n/a | 0.256 | 17.919 | n/a | n/a | 0.058 | 5.446 | 0.111 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005cb | 41.008 | 4.189 | 0.217 | 0.000 | 0.064 | 1.732 | 19.415 | 0.046 | n/a | 0.227 | 15.081 | n/a | n/a | 0.038 | 4.469 | 0.109 | 0.038 | gw-w/thread-49/gateway.admitted-work | none observed |
| f87b72a2e58b18ba00000000000005c9 | 35.947 | 5.728 | 0.398 | 0.000 | 0.061 | 1.798 | 12.139 | 0.083 | n/a | 0.358 | 15.281 | n/a | n/a | 0.101 | 6.187 | 0.172 | 0.101 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005e1 | 31.449 | 4.105 | 0.005 | 0.000 | 1.190 | 0.592 | 5.632 | 0.047 | n/a | 0.271 | 19.540 | n/a | n/a | 0.065 | 5.301 | 0.169 | 0.065 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000602 | 30.696 | 6.039 | 0.300 | 0.000 | 0.062 | 1.756 | 7.382 | 0.049 | n/a | 0.218 | 14.821 | n/a | n/a | 0.072 | 6.400 | 0.208 | 0.072 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005dd | 30.291 | 4.151 | 0.209 | 0.000 | 0.078 | 1.495 | 6.898 | 0.047 | n/a | 0.508 | 16.860 | n/a | n/a | 0.044 | 4.438 | 0.147 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005fb | 30.185 | 5.244 | 0.294 | 0.000 | 0.122 | 1.905 | 10.011 | 0.101 | n/a | 0.858 | 11.575 | n/a | n/a | 0.074 | 5.660 | 0.188 | 0.074 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005b8 | 30.059 | 5.635 | 0.253 | 0.000 | 0.058 | 1.073 | 6.088 | 0.051 | n/a | 0.225 | 16.584 | n/a | n/a | 0.092 | 5.946 | 0.198 | 0.092 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000606 | 29.337 | 4.496 | 0.254 | 0.000 | 0.073 | 1.820 | 10.684 | 0.079 | n/a | 0.306 | 11.579 | n/a | n/a | 0.046 | 4.823 | 0.164 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005be | 29.148 | 7.891 | 0.010 | 0.000 | 0.713 | 0.867 | 1.888 | 0.037 | n/a | 1.355 | 16.326 | n/a | n/a | 0.061 | 8.614 | 0.296 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005b4 | 28.059 | 4.039 | 0.200 | 0.000 | 0.046 | 1.842 | 10.795 | 0.042 | n/a | 0.217 | 10.838 | n/a | n/a | 0.039 | 4.285 | 0.153 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005b6 | 28.022 | 11.354 | 0.007 | 0.000 | 3.294 | 1.335 | 1.150 | 0.036 | n/a | 0.266 | 10.412 | n/a | n/a | 0.168 | 14.655 | 0.523 | 0.168 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005fe | 27.708 | 3.798 | 0.223 | 0.000 | 0.069 | 1.345 | 10.734 | 0.062 | n/a | 0.880 | 10.544 | n/a | n/a | 0.053 | 4.090 | 0.148 | 0.053 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005ef | 27.547 | 5.896 | 0.291 | 0.000 | 0.065 | 2.950 | 6.889 | 0.047 | n/a | 0.413 | 10.908 | n/a | n/a | 0.087 | 6.252 | 0.227 | 0.087 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005bd | 25.889 | 4.819 | 0.256 | 0.000 | 0.065 | 1.691 | 12.193 | 0.053 | n/a | 0.204 | 6.547 | n/a | n/a | 0.062 | 5.139 | 0.199 | 0.062 | gw-w/thread-46/gateway.admitted-work | none observed |
| f87b72a2e58b18ba00000000000005f1 | 25.158 | 3.887 | 0.275 | 0.000 | 0.127 | 1.238 | 7.327 | 0.035 | n/a | 0.436 | 11.742 | n/a | n/a | 0.091 | 4.289 | 0.170 | 0.091 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000600 | 23.149 | 8.854 | 0.005 | 0.000 | 0.304 | 0.594 | 1.679 | 0.031 | n/a | 0.259 | 11.357 | n/a | n/a | 0.066 | 9.163 | 0.396 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.557 | 1.132 | 0.000 | 2.002 | 4.599 | 0.008 | 0.000 | 0.664 | 1.114 | 1.314 | 0.032 | n/a | 0.535 | 6.662 | n/a | n/a | 0.061 | 5.570 | 0.351 | 0.061 |
| p99 | 52.494 | 2.786 | 0.000 | 4.370 | 11.354 | n/a | 0.000 | 3.294 | 2.860 | 44.436 | 0.054 | n/a | 3.717 | 12.225 | n/a | n/a | 0.168 | 14.655 | 0.523 | 0.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba00000000000005fd | 52.494 | 4.294 | n/a | 0.000 | 0.664 | 2.860 | 44.436 | 0.046 | n/a | 0.136 | 0.000 | n/a | n/a | 0.057 | 4.958 | 0.094 | 0.057 | gw-w/thread-44/gateway.admitted-work | none observed |
| f87b72a2e58b18ba00000000000005b6 | 28.022 | 11.354 | 0.007 | 0.000 | 3.294 | 1.335 | 1.150 | 0.036 | n/a | 0.266 | 10.412 | n/a | n/a | 0.168 | 14.655 | 0.523 | 0.168 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005ed | 21.168 | 4.650 | 0.007 | 0.000 | 0.913 | 1.203 | 1.759 | 0.054 | n/a | 1.040 | 11.474 | n/a | n/a | 0.068 | 5.570 | 0.263 | 0.068 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005c4 | 20.995 | 6.695 | 0.013 | 0.000 | 1.040 | 2.272 | 2.845 | 0.050 | n/a | 1.230 | 6.788 | n/a | n/a | 0.061 | 7.748 | 0.369 | 0.061 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005f2 | 19.361 | 4.203 | 0.008 | 0.000 | 0.658 | 0.542 | 1.075 | 0.027 | n/a | 0.584 | 12.225 | n/a | n/a | 0.039 | 4.869 | 0.251 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005eb | 17.118 | 5.546 | 0.013 | 0.000 | 0.441 | 1.114 | 1.194 | 0.032 | n/a | 0.619 | 8.070 | n/a | n/a | 0.090 | 6.000 | 0.351 | 0.090 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005df | 16.954 | 4.523 | 0.007 | 0.000 | 1.117 | 1.085 | 1.577 | 0.033 | n/a | 0.579 | 7.971 | n/a | n/a | 0.061 | 5.647 | 0.333 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005d6 | 16.557 | 7.219 | 0.010 | 0.000 | 1.153 | 1.014 | 0.949 | 0.027 | n/a | 3.717 | 2.385 | n/a | n/a | 0.081 | 8.383 | 0.506 | 0.081 | gw-w/thread-49/d/transact-async | none observed |
| f87b72a2e58b18ba00000000000005e7 | 15.985 | 4.098 | 0.006 | 0.000 | 0.489 | 0.792 | 1.314 | 0.032 | n/a | 0.535 | 8.630 | n/a | n/a | 0.089 | 4.593 | 0.287 | 0.089 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005f9 | 15.798 | 4.599 | 0.007 | 0.000 | 0.451 | 0.795 | 1.938 | 0.037 | n/a | 1.249 | 6.662 | n/a | n/a | 0.059 | 5.057 | 0.320 | 0.059 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005d3 | 14.729 | 4.653 | 0.014 | 0.000 | 1.009 | 1.132 | 1.335 | 0.035 | n/a | 0.229 | 6.263 | n/a | n/a | 0.060 | 5.676 | 0.385 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005cf | 14.189 | 5.677 | 0.008 | 0.000 | 0.326 | 1.142 | 1.158 | 0.029 | n/a | 0.499 | 5.288 | n/a | n/a | 0.062 | 6.011 | 0.424 | 0.062 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005cc | 11.850 | 3.914 | 0.006 | 0.000 | 1.111 | 1.140 | 1.357 | 0.028 | n/a | 0.474 | 3.784 | n/a | n/a | 0.036 | 5.031 | 0.425 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba00000000000005f6 | 9.939 | 3.816 | 0.011 | 0.000 | 0.379 | 0.759 | 0.967 | 0.028 | n/a | 0.440 | 3.500 | n/a | n/a | 0.040 | 4.206 | 0.423 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.960 | 1.289 | 0.000 | 1.578 | 4.032 | 0.028 | 0.000 | 0.281 | 3.122 | 2.620 | 0.037 | n/a | 1.290 | 25.460 | n/a | n/a | 0.073 | 7.094 | 0.169 | 0.073 |
| p99 | 75.620 | 2.573 | 0.000 | 1.835 | 13.148 | 0.830 | 0.000 | 3.195 | 3.460 | 15.863 | 0.104 | n/a | 15.451 | 40.767 | n/a | n/a | 0.275 | 14.200 | 0.188 | 0.275 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba0000000000000608 | 75.620 | 13.148 | 0.830 | 0.000 | 0.222 | 3.122 | 15.863 | 0.104 | n/a | 1.290 | 40.767 | n/a | n/a | 0.275 | 14.200 | 0.188 | 0.275 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f87b72a2e58b18ba0000000000000ca7 | 41.960 | 3.872 | 0.028 | 0.000 | 3.195 | 3.460 | 2.620 | 0.037 | n/a | 15.451 | 13.256 | n/a | n/a | 0.042 | 7.094 | 0.169 | 0.042 | gw-w/thread-66/d/transact-async | driver.publication 1.701ms; driver.publication 1.245ms; driver.publication 1.060ms |
| f87b72a2e58b18ba0000000000000ca5 | 32.408 | 4.032 | 0.006 | 0.000 | 0.281 | 1.150 | 0.866 | 0.030 | n/a | 0.510 | 25.460 | n/a | n/a | 0.073 | 4.319 | 0.133 | 0.073 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 3.020ms; driver.publication 1.701ms; driver.publication 1.060ms |

## P2 / L1024 / commit (854 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.405 | 0.957 | 0.000 | 1.749 | 4.050 | 0.006 | 0.000 | 0.814 | 1.090 | 1.376 | 0.035 | n/a | 0.313 | 8.625 | n/a | n/a | 0.039 | 5.304 | 0.297 | 0.039 |
| p99 | 153.337 | 3.268 | 2.617 | 6.205 | 13.642 | 2.797 | 0.000 | 69.012 | 37.038 | 21.683 | 7.237 | n/a | 6.810 | 65.302 | n/a | n/a | 0.109 | 75.495 | 0.782 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba0000000000000a79 | 181.301 | 7.972 | 7.023 | 0.000 | 138.497 | 10.792 | 1.698 | 2.569 | n/a | 0.763 | 11.927 | n/a | n/a | 0.059 | 153.492 | 0.847 | 0.059 | node-14/thread-0/driver.queue.subject | client.parse 2.677ms; driver.publication 2.099ms; driver.publication 1.826ms; driver.publication 1.624ms; driver.publication 1.362ms |
| f87b72a2e58b18ba0000000000000639 | 176.608 | 10.110 | 0.308 | 0.000 | 0.706 | 37.038 | 9.235 | 39.588 | n/a | 5.656 | 73.915 | n/a | n/a | 0.052 | 11.124 | 0.063 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.402ms; driver.publication 2.118ms; driver.expected-state.bind-receipt 1.589ms; driver.publication 1.587ms; driver.publication 1.571ms |
| f87b72a2e58b18ba0000000000000a5f | 173.404 | 5.068 | 0.015 | 0.000 | 121.797 | 20.940 | 0.968 | 0.040 | n/a | 0.150 | 24.373 | n/a | n/a | 0.053 | 126.880 | 0.732 | 0.053 | node-14/thread-0/driver.queue.subject | driver.publication 3.582ms; driver.publication 2.598ms; driver.publication 2.134ms; driver.expected-state.bind-receipt 1.956ms; driver.publication 1.879ms |
| f87b72a2e58b18ba0000000000000638 | 173.182 | 9.567 | 0.017 | 0.000 | 14.972 | 22.859 | 37.458 | 0.090 | n/a | 22.836 | 65.302 | n/a | n/a | 0.081 | 24.556 | 0.142 | 0.081 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 7.312ms; driver.expected-state.bind-receipt 2.769ms; driver.publication 2.402ms; driver.expected-state.bind-receipt 1.589ms; driver.publication 1.587ms |
| f87b72a2e58b18ba0000000000000a76 | 170.859 | 2.782 | n/a | 0.000 | 1.685 | 147.179 | 19.042 | 0.032 | n/a | 0.073 | 0.000 | n/a | n/a | 0.067 | 4.467 | 0.026 | 0.067 | node-14/thread-0/socket.wait-first-byte | client.parse 2.677ms; driver.publication 2.099ms; driver.publication 1.624ms; driver.publication 1.362ms; driver.publication 1.311ms |
| f87b72a2e58b18ba0000000000000a51 | 169.595 | 6.029 | 0.008 | 0.000 | 121.034 | 1.946 | 1.147 | 0.033 | n/a | 0.241 | 39.112 | n/a | n/a | 0.046 | 127.071 | 0.749 | 0.046 | node-14/thread-0/driver.queue.subject | driver.publication 2.598ms; driver.expected-state.bind-receipt 1.956ms; driver.publication 1.879ms; driver.publication 1.755ms; driver.publication 1.367ms |
| f87b72a2e58b18ba0000000000000a74 | 159.293 | 7.454 | 0.013 | 0.000 | 2.621 | 105.966 | 1.710 | 0.033 | n/a | 0.244 | 41.207 | n/a | n/a | 0.045 | 10.088 | 0.063 | 0.045 | node-14/thread-0/socket.wait-first-byte | client.parse 2.677ms; driver.publication 1.013ms |
| f87b72a2e58b18ba0000000000000a75 | 156.985 | 6.315 | 0.015 | 0.000 | 3.740 | 111.772 | 1.559 | 0.031 | n/a | 5.284 | 25.972 | n/a | n/a | 2.297 | 10.070 | 0.064 | 2.297 | node-14/thread-0/socket.wait-first-byte | client.parse 2.677ms; driver.publication 2.099ms |
| f87b72a2e58b18ba0000000000000a7c | 153.337 | 2.764 | 11.215 | 0.000 | 115.012 | 7.254 | 1.091 | 4.133 | n/a | 0.490 | 11.344 | n/a | n/a | 0.034 | 128.991 | 0.841 | 0.034 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.099ms; driver.publication 1.826ms; driver.publication 1.624ms; driver.publication 1.362ms; driver.publication 1.311ms |
| f87b72a2e58b18ba0000000000000a77 | 147.976 | 5.797 | 0.017 | 0.000 | 1.808 | 98.118 | 3.440 | 6.826 | n/a | 0.460 | 31.465 | n/a | n/a | 0.045 | 7.621 | 0.052 | 0.045 | node-14/thread-0/socket.wait-first-byte | client.parse 2.677ms; driver.publication 2.099ms; driver.publication 1.221ms |
| f87b72a2e58b18ba0000000000000a65 | 147.155 | 4.572 | 0.006 | 0.000 | 119.338 | 0.926 | 5.125 | 0.063 | n/a | 0.253 | 16.823 | n/a | n/a | 0.051 | 123.916 | 0.842 | 0.051 | node-14/thread-0/driver.queue.subject | driver.publication 3.582ms; driver.publication 2.134ms; driver.publication 1.725ms; driver.publication 1.376ms; driver.publication 1.362ms |
| f87b72a2e58b18ba0000000000000a78 | 142.357 | 2.797 | 0.010 | 0.000 | 9.906 | 95.457 | 2.122 | 0.062 | n/a | 4.735 | 27.220 | n/a | n/a | 0.047 | 12.713 | 0.089 | 0.047 | node-14/thread-0/socket.wait-first-byte | client.parse 2.677ms; driver.publication 2.099ms; driver.publication 1.221ms |
| f87b72a2e58b18ba0000000000000a7a | 138.134 | 4.428 | 0.136 | 0.000 | 2.413 | 96.793 | 2.326 | 0.036 | n/a | 6.810 | 25.162 | n/a | n/a | 0.029 | 6.977 | 0.051 | 0.029 | node-14/thread-0/socket.wait-first-byte | client.parse 2.677ms; driver.publication 2.099ms; driver.publication 1.221ms |
| f87b72a2e58b18ba0000000000000a7b | 136.871 | 3.939 | 0.007 | 0.000 | 111.248 | 5.287 | 1.825 | 0.051 | n/a | 3.142 | 11.334 | n/a | n/a | 0.038 | 115.195 | 0.842 | 0.038 | node-14/thread-0/driver.queue.scheduler-late | client.parse 2.677ms; driver.publication 2.099ms; driver.publication 1.311ms; driver.publication 1.221ms |
| f87b72a2e58b18ba000000000000063f | 135.837 | 7.194 | 0.017 | 0.000 | 87.134 | 0.698 | 0.851 | 3.478 | n/a | 0.093 | 36.302 | n/a | n/a | 0.070 | 94.345 | 0.695 | 0.070 | node-14/thread-0/driver.queue.subject | driver.publication 2.402ms; driver.publication 2.118ms; driver.publication 1.587ms; driver.publication 1.571ms; driver.publication 1.483ms |
| f87b72a2e58b18ba0000000000000a49 | 135.804 | 5.972 | 0.258 | 0.000 | 0.110 | 2.993 | 12.148 | 0.180 | n/a | 7.945 | 106.136 | n/a | n/a | 0.059 | 6.341 | 0.047 | 0.059 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.816ms; driver.publication 1.712ms; driver.publication 1.465ms; driver.publication 1.156ms |
| f87b72a2e58b18ba0000000000000a4f | 130.085 | 7.625 | 0.017 | 0.000 | 0.414 | 12.896 | 0.981 | 0.031 | n/a | 5.189 | 102.878 | n/a | n/a | 0.054 | 8.056 | 0.062 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.755ms; driver.publication 1.204ms |
| f87b72a2e58b18ba0000000000000a58 | 129.299 | 7.264 | 0.008 | 0.000 | 68.223 | 0.692 | 9.487 | 0.075 | n/a | 2.343 | 41.160 | n/a | n/a | 0.047 | 75.495 | 0.584 | 0.047 | node-14/thread-0/driver.queue.subject | driver.publication 2.598ms; driver.expected-state.bind-receipt 1.956ms; driver.publication 1.879ms; driver.publication 1.755ms; driver.publication 1.725ms |
| f87b72a2e58b18ba0000000000000676 | 119.974 | 3.369 | 0.006 | 0.000 | 40.145 | 5.833 | 1.678 | 3.796 | n/a | 1.500 | 63.607 | n/a | n/a | 0.038 | 43.521 | 0.363 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.866ms; driver.expected-state.bind-receipt 1.803ms; driver.publication 1.389ms; driver.publication 1.351ms; driver.publication 1.184ms |
| f87b72a2e58b18ba0000000000000a4c | 116.613 | 3.937 | 0.007 | 0.000 | 1.325 | 1.067 | 1.894 | 0.076 | n/a | 3.447 | 104.818 | n/a | n/a | 0.042 | 5.269 | 0.045 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.465ms; driver.publication 1.156ms |

## P2 / L1024 / commit / 5-10 facts (497 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.271 | 0.785 | 0.000 | 1.634 | 3.595 | 0.006 | 0.000 | 0.819 | 1.117 | 1.183 | 0.033 | n/a | 0.294 | 7.493 | n/a | n/a | 0.039 | 4.674 | 0.282 | 0.039 |
| p99 | 156.985 | 2.731 | 2.573 | 5.121 | 10.961 | 2.787 | 0.000 | 87.134 | 37.038 | 20.293 | 6.332 | n/a | 5.656 | 71.704 | n/a | n/a | 0.102 | 94.345 | 0.812 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba0000000000000639 | 176.608 | 10.110 | 0.308 | 0.000 | 0.706 | 37.038 | 9.235 | 39.588 | n/a | 5.656 | 73.915 | n/a | n/a | 0.052 | 11.124 | 0.063 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.402ms; driver.publication 2.118ms; driver.expected-state.bind-receipt 1.589ms; driver.publication 1.587ms; driver.publication 1.571ms |
| f87b72a2e58b18ba0000000000000a5f | 173.404 | 5.068 | 0.015 | 0.000 | 121.797 | 20.940 | 0.968 | 0.040 | n/a | 0.150 | 24.373 | n/a | n/a | 0.053 | 126.880 | 0.732 | 0.053 | node-14/thread-0/driver.queue.subject | driver.publication 3.582ms; driver.publication 2.598ms; driver.publication 2.134ms; driver.expected-state.bind-receipt 1.956ms; driver.publication 1.879ms |
| f87b72a2e58b18ba0000000000000638 | 173.182 | 9.567 | 0.017 | 0.000 | 14.972 | 22.859 | 37.458 | 0.090 | n/a | 22.836 | 65.302 | n/a | n/a | 0.081 | 24.556 | 0.142 | 0.081 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 7.312ms; driver.expected-state.bind-receipt 2.769ms; driver.publication 2.402ms; driver.expected-state.bind-receipt 1.589ms; driver.publication 1.587ms |
| f87b72a2e58b18ba0000000000000a76 | 170.859 | 2.782 | n/a | 0.000 | 1.685 | 147.179 | 19.042 | 0.032 | n/a | 0.073 | 0.000 | n/a | n/a | 0.067 | 4.467 | 0.026 | 0.067 | node-14/thread-0/socket.wait-first-byte | client.parse 2.677ms; driver.publication 2.099ms; driver.publication 1.624ms; driver.publication 1.362ms; driver.publication 1.311ms |
| f87b72a2e58b18ba0000000000000a75 | 156.985 | 6.315 | 0.015 | 0.000 | 3.740 | 111.772 | 1.559 | 0.031 | n/a | 5.284 | 25.972 | n/a | n/a | 2.297 | 10.070 | 0.064 | 2.297 | node-14/thread-0/socket.wait-first-byte | client.parse 2.677ms; driver.publication 2.099ms |
| f87b72a2e58b18ba0000000000000a7c | 153.337 | 2.764 | 11.215 | 0.000 | 115.012 | 7.254 | 1.091 | 4.133 | n/a | 0.490 | 11.344 | n/a | n/a | 0.034 | 128.991 | 0.841 | 0.034 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.099ms; driver.publication 1.826ms; driver.publication 1.624ms; driver.publication 1.362ms; driver.publication 1.311ms |
| f87b72a2e58b18ba0000000000000a65 | 147.155 | 4.572 | 0.006 | 0.000 | 119.338 | 0.926 | 5.125 | 0.063 | n/a | 0.253 | 16.823 | n/a | n/a | 0.051 | 123.916 | 0.842 | 0.051 | node-14/thread-0/driver.queue.subject | driver.publication 3.582ms; driver.publication 2.134ms; driver.publication 1.725ms; driver.publication 1.376ms; driver.publication 1.362ms |
| f87b72a2e58b18ba0000000000000a78 | 142.357 | 2.797 | 0.010 | 0.000 | 9.906 | 95.457 | 2.122 | 0.062 | n/a | 4.735 | 27.220 | n/a | n/a | 0.047 | 12.713 | 0.089 | 0.047 | node-14/thread-0/socket.wait-first-byte | client.parse 2.677ms; driver.publication 2.099ms; driver.publication 1.221ms |
| f87b72a2e58b18ba0000000000000a7b | 136.871 | 3.939 | 0.007 | 0.000 | 111.248 | 5.287 | 1.825 | 0.051 | n/a | 3.142 | 11.334 | n/a | n/a | 0.038 | 115.195 | 0.842 | 0.038 | node-14/thread-0/driver.queue.scheduler-late | client.parse 2.677ms; driver.publication 2.099ms; driver.publication 1.311ms; driver.publication 1.221ms |
| f87b72a2e58b18ba000000000000063f | 135.837 | 7.194 | 0.017 | 0.000 | 87.134 | 0.698 | 0.851 | 3.478 | n/a | 0.093 | 36.302 | n/a | n/a | 0.070 | 94.345 | 0.695 | 0.070 | node-14/thread-0/driver.queue.subject | driver.publication 2.402ms; driver.publication 2.118ms; driver.publication 1.587ms; driver.publication 1.571ms; driver.publication 1.483ms |
| f87b72a2e58b18ba0000000000000a4f | 130.085 | 7.625 | 0.017 | 0.000 | 0.414 | 12.896 | 0.981 | 0.031 | n/a | 5.189 | 102.878 | n/a | n/a | 0.054 | 8.056 | 0.062 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.755ms; driver.publication 1.204ms |
| f87b72a2e58b18ba0000000000000676 | 119.974 | 3.369 | 0.006 | 0.000 | 40.145 | 5.833 | 1.678 | 3.796 | n/a | 1.500 | 63.607 | n/a | n/a | 0.038 | 43.521 | 0.363 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.866ms; driver.expected-state.bind-receipt 1.803ms; driver.publication 1.389ms; driver.publication 1.351ms; driver.publication 1.184ms |
| f87b72a2e58b18ba0000000000000a4c | 116.613 | 3.937 | 0.007 | 0.000 | 1.325 | 1.067 | 1.894 | 0.076 | n/a | 3.447 | 104.818 | n/a | n/a | 0.042 | 5.269 | 0.045 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.465ms; driver.publication 1.156ms |
| f87b72a2e58b18ba0000000000000a50 | 115.133 | 9.118 | 0.232 | 0.000 | 0.731 | 1.982 | 2.491 | 4.565 | n/a | 6.644 | 89.308 | n/a | n/a | 0.062 | 10.082 | 0.088 | 0.062 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.204ms |
| f87b72a2e58b18ba0000000000000688 | 93.024 | 3.942 | 0.006 | 0.000 | 3.880 | 3.632 | 20.293 | 0.037 | n/a | 3.614 | 57.575 | n/a | n/a | 0.045 | 7.828 | 0.084 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.409ms; driver.publication 1.184ms; driver.publication 1.156ms; driver.publication 1.150ms; driver.expected-state.bind-receipt 1.109ms |
| f87b72a2e58b18ba0000000000000a52 | 90.720 | 7.908 | 0.008 | 0.000 | 0.733 | 19.388 | 2.308 | 0.038 | n/a | 2.274 | 57.966 | n/a | n/a | 0.097 | 8.649 | 0.095 | 0.097 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.956ms; driver.publication 1.879ms; driver.publication 1.755ms; driver.publication 1.204ms |
| f87b72a2e58b18ba0000000000000b48 | 89.753 | 3.225 | 0.004 | 0.000 | 36.647 | 0.534 | 1.074 | 0.029 | n/a | 0.121 | 48.090 | n/a | n/a | 0.029 | 39.875 | 0.444 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.534ms; driver.publication 1.442ms; driver.publication 1.264ms; driver.publication 1.250ms; driver.publication 1.225ms |
| f87b72a2e58b18ba000000000000069c | 87.485 | 2.043 | 0.006 | 0.000 | 69.012 | 2.746 | 0.925 | 0.029 | n/a | 0.685 | 12.003 | n/a | n/a | 0.035 | 71.061 | 0.812 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication 2.636ms; driver.publication 2.229ms; driver.publication 1.708ms; driver.publication 1.441ms; driver.publication 1.378ms |
| f87b72a2e58b18ba000000000000065c | 85.402 | 3.438 | 0.006 | 0.000 | 62.018 | 1.328 | 1.532 | 0.072 | n/a | 0.364 | 16.606 | n/a | n/a | 0.037 | 65.463 | 0.767 | 0.037 | node-14/thread-0/driver.queue.subject | driver.publication 2.923ms; driver.publication 1.936ms; driver.publication 1.319ms; driver.publication 1.289ms; driver.publication 1.282ms |
| f87b72a2e58b18ba0000000000000645 | 85.075 | 3.208 | 0.008 | 0.000 | 0.117 | 1.351 | 8.354 | 0.041 | n/a | 0.254 | 71.704 | n/a | n/a | 0.039 | 3.332 | 0.039 | 0.039 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 2.402ms; driver.publication 2.118ms; driver.publication 1.587ms; driver.publication 1.571ms; driver.publication 1.483ms |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.408 | 0.672 | 0.000 | 1.268 | 3.872 | 0.006 | 0.000 | 0.281 | 1.150 | 0.866 | 0.030 | n/a | 0.510 | 13.256 | n/a | n/a | 0.042 | 4.319 | 0.133 | 0.042 |
| p99 | 41.960 | 1.289 | 0.000 | 1.578 | 4.032 | 0.028 | 0.000 | 3.195 | 3.460 | 2.620 | 0.037 | n/a | 15.451 | 25.460 | n/a | n/a | 0.073 | 7.094 | 0.169 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba0000000000000ca7 | 41.960 | 3.872 | 0.028 | 0.000 | 3.195 | 3.460 | 2.620 | 0.037 | n/a | 15.451 | 13.256 | n/a | n/a | 0.042 | 7.094 | 0.169 | 0.042 | gw-w/thread-66/d/transact-async | driver.publication 1.701ms; driver.publication 1.245ms; driver.publication 1.060ms |
| f87b72a2e58b18ba0000000000000ca5 | 32.408 | 4.032 | 0.006 | 0.000 | 0.281 | 1.150 | 0.866 | 0.030 | n/a | 0.510 | 25.460 | n/a | n/a | 0.073 | 4.319 | 0.133 | 0.073 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 3.020ms; driver.publication 1.701ms; driver.publication 1.060ms |

## P2 / tail / commit (2612 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.770 | 0.846 | 0.000 | 1.677 | 3.921 | 0.006 | 0.000 | 0.781 | 0.846 | 1.328 | 0.033 | n/a | 0.220 | 6.760 | n/a | n/a | 0.034 | 4.987 | 0.329 | 0.034 |
| p99 | 131.228 | 3.499 | 2.848 | 6.364 | 14.156 | 2.919 | 0.000 | 62.593 | 60.725 | 12.524 | 4.756 | n/a | 4.769 | 51.982 | n/a | n/a | 0.110 | 70.450 | 0.793 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba00000000000014cc | 280.888 | 48.429 | 1.865 | 29.549 | 78.451 | 84.645 | 13.533 | 5.333 | n/a | 0.572 | 18.478 | n/a | n/a | 0.034 | 158.294 | 0.564 | 0.034 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 30.484ms; driver.publication 5.569ms; driver.publication 4.698ms; driver.publication 3.877ms; driver.publication 3.332ms |
| f87b72a2e58b18ba0000000000001482 | 253.417 | 28.925 | 0.019 | 0.000 | 67.715 | 70.790 | 11.735 | 4.078 | n/a | 0.313 | 69.793 | n/a | n/a | 0.049 | 96.659 | 0.381 | 0.049 | node-14/thread-0/socket.wait-first-byte | client.encode 3.553ms; driver.expected-state.bind-receipt 1.502ms; driver.publication 1.463ms; driver.publication 1.428ms; driver.publication 1.420ms |
| f87b72a2e58b18ba00000000000014c5 | 241.160 | 9.378 | 0.009 | 0.000 | 93.430 | 115.048 | 6.714 | 0.033 | n/a | 2.274 | 14.185 | n/a | n/a | 0.089 | 102.817 | 0.426 | 0.089 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.278ms |
| f87b72a2e58b18ba0000000000001489 | 240.581 | 6.044 | 0.008 | 0.000 | 184.479 | 1.818 | 5.426 | 0.027 | n/a | 1.749 | 40.983 | n/a | n/a | 0.047 | 190.530 | 0.792 | 0.047 | node-14/thread-0/driver.queue.subject | client.encode 3.553ms; driver.publication 1.627ms; driver.expected-state.bind-receipt 1.619ms; driver.publication 1.593ms; driver.publication 1.563ms |
| f87b72a2e58b18ba00000000000014c8 | 224.301 | 11.901 | 2.896 | 0.000 | 54.908 | 122.555 | 0.722 | 4.397 | n/a | 0.038 | 26.846 | n/a | n/a | 0.038 | 69.705 | 0.311 | 0.038 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.569ms; driver.publication 3.877ms; driver.publication 1.815ms; driver.expected-state.bind-receipt 1.729ms; driver.publication 1.278ms |
| f87b72a2e58b18ba00000000000014c6 | 223.491 | 11.642 | 1.453 | 0.000 | 70.121 | 113.489 | 1.482 | 5.036 | n/a | 0.101 | 20.098 | n/a | n/a | 0.070 | 83.215 | 0.372 | 0.070 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.815ms; driver.expected-state.bind-receipt 1.729ms; driver.publication 1.278ms |
| f87b72a2e58b18ba00000000000014c7 | 219.992 | 13.232 | 2.790 | 0.000 | 59.475 | 114.256 | 0.953 | 3.313 | n/a | 0.039 | 25.896 | n/a | n/a | 0.038 | 75.498 | 0.343 | 0.038 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.877ms; driver.publication 1.815ms; driver.expected-state.bind-receipt 1.729ms; driver.publication 1.278ms |
| f87b72a2e58b18ba000000000000142c | 217.570 | 19.279 | 0.007 | 0.000 | 5.605 | 156.715 | 2.049 | 0.036 | n/a | 8.246 | 25.538 | n/a | n/a | 0.094 | 24.891 | 0.114 | 0.094 | node-14/thread-0/socket.wait-first-byte | client.encode 10.100ms; driver.publication 9.564ms; driver.publication 8.707ms; driver.expected-state.bind-receipt 7.608ms; driver.publication 4.427ms |
| f87b72a2e58b18ba000000000000142e | 201.877 | 25.237 | 0.016 | 0.000 | 1.712 | 147.111 | 10.670 | 0.059 | n/a | 3.101 | 13.853 | n/a | n/a | 0.119 | 26.964 | 0.134 | 0.119 | node-14/thread-0/socket.wait-first-byte | client.encode 10.100ms; driver.publication 9.564ms; driver.publication 8.707ms; driver.expected-state.bind-receipt 7.608ms; driver.publication 5.985ms |
| f87b72a2e58b18ba00000000000018b9 | 194.714 | 18.939 | 0.009 | 0.000 | 24.742 | 136.217 | 2.701 | 0.039 | n/a | 4.046 | 7.956 | n/a | n/a | 0.066 | 43.689 | 0.224 | 0.066 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.477ms; driver.publication 2.233ms; driver.publication 1.861ms; driver.publication 1.555ms; client.parse 1.549ms |
| f87b72a2e58b18ba0000000000001432 | 193.420 | 50.372 | 0.712 | 0.000 | 17.948 | 100.876 | 5.764 | 0.057 | n/a | 0.768 | 16.438 | n/a | n/a | 0.485 | 69.032 | 0.357 | 0.485 | node-14/thread-0/socket.wait-first-byte | driver.publication 9.564ms; driver.expected-state.bind-receipt 6.325ms; driver.publication 6.173ms; driver.publication 5.985ms; driver.expected-state.bind-receipt 5.758ms |
| f87b72a2e58b18ba00000000000014ca | 190.393 | 10.632 | 0.007 | 0.000 | 123.352 | 34.627 | 5.707 | 0.043 | n/a | 3.262 | 12.726 | n/a | n/a | 0.036 | 133.990 | 0.704 | 0.036 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 5.569ms; driver.publication 3.877ms; driver.publication 3.332ms; driver.publication 1.815ms; driver.expected-state.bind-receipt 1.729ms |
| f87b72a2e58b18ba0000000000001428 | 184.370 | 36.293 | 0.012 | 0.000 | 0.546 | 128.162 | 16.022 | 0.094 | n/a | 0.264 | 2.843 | n/a | n/a | 0.134 | 36.851 | 0.200 | 0.134 | node-14/thread-0/socket.wait-first-byte | client.encode 10.100ms; driver.publication 8.707ms; driver.expected-state.bind-receipt 7.608ms; driver.publication 4.427ms; driver.publication 2.771ms |
| f87b72a2e58b18ba0000000000001431 | 170.098 | 22.955 | 0.013 | 0.000 | 44.604 | 83.999 | 3.917 | 0.297 | n/a | 1.741 | 11.394 | n/a | n/a | 1.178 | 67.572 | 0.397 | 1.178 | node-14/thread-0/socket.wait-first-byte | client.encode 10.100ms; driver.publication 8.707ms; driver.expected-state.bind-receipt 7.608ms; driver.publication 2.771ms; driver.expected-state.bind-receipt 2.604ms |
| f87b72a2e58b18ba0000000000001437 | 169.792 | 15.358 | 0.019 | 0.000 | 94.406 | 10.875 | 4.507 | 0.117 | n/a | 3.961 | 40.476 | n/a | n/a | 0.073 | 109.783 | 0.647 | 0.073 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 9.564ms; driver.publication 6.173ms; driver.publication 5.985ms; driver.expected-state.bind-receipt 5.758ms; driver.expected-state.bind-receipt 4.637ms |
| f87b72a2e58b18ba00000000000018c3 | 166.258 | 4.223 | 0.006 | 0.000 | 126.852 | 5.169 | 19.223 | 0.021 | n/a | 0.050 | 10.673 | n/a | n/a | 0.042 | 131.081 | 0.788 | 0.042 | node-14/thread-0/driver.queue.subject | driver.publication 2.233ms; driver.publication 1.861ms; driver.publication 1.333ms; driver.publication 1.298ms; driver.publication 1.169ms |
| f87b72a2e58b18ba00000000000014cb | 160.389 | 9.636 | 1.708 | 0.000 | 89.142 | 34.875 | 7.601 | 1.038 | n/a | 0.478 | 15.871 | n/a | n/a | 0.040 | 100.485 | 0.627 | 0.040 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 5.569ms; driver.publication 3.877ms; driver.publication 3.332ms; driver.publication 1.815ms; driver.expected-state.bind-receipt 1.729ms |
| f87b72a2e58b18ba00000000000014d3 | 156.662 | 9.891 | 0.005 | 0.000 | 59.894 | 78.535 | 2.251 | 0.071 | n/a | 0.291 | 5.640 | n/a | n/a | 0.083 | 69.791 | 0.445 | 0.083 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 30.484ms; driver.publication 5.569ms; driver.publication 4.698ms; driver.publication 3.877ms; driver.publication 3.332ms |
| f87b72a2e58b18ba000000000000148f | 154.468 | 14.155 | 0.005 | 0.000 | 1.074 | 87.376 | 3.779 | 0.220 | n/a | 0.069 | 47.758 | n/a | n/a | 0.032 | 15.234 | 0.099 | 0.032 | node-14/thread-0/socket.wait-first-byte | client.encode 3.553ms; driver.expected-state.bind-receipt 1.619ms; driver.expected-state.bind-receipt 1.502ms; driver.publication 1.463ms; driver.publication 1.428ms |
| f87b72a2e58b18ba00000000000014c1 | 150.539 | 6.266 | 0.005 | 0.000 | 20.629 | 97.183 | 5.156 | 0.043 | n/a | 0.462 | 20.724 | n/a | n/a | 0.071 | 26.901 | 0.179 | 0.071 | node-14/thread-0/socket.wait-first-byte | client.parse 5.248ms; driver.publication 3.881ms |

## P2 / tail / commit / 5-10 facts (1549 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.997 | 0.704 | 0.000 | 1.541 | 3.413 | 0.006 | 0.000 | 0.792 | 0.833 | 1.145 | 0.033 | n/a | 0.211 | 6.324 | n/a | n/a | 0.035 | 4.383 | 0.319 | 0.035 |
| p99 | 127.479 | 2.615 | 2.346 | 5.258 | 11.642 | 2.294 | 0.000 | 62.593 | 56.868 | 7.374 | 5.000 | n/a | 4.194 | 49.513 | n/a | n/a | 0.110 | 69.791 | 0.805 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f87b72a2e58b18ba00000000000014c8 | 224.301 | 11.901 | 2.896 | 0.000 | 54.908 | 122.555 | 0.722 | 4.397 | n/a | 0.038 | 26.846 | n/a | n/a | 0.038 | 69.705 | 0.311 | 0.038 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.569ms; driver.publication 3.877ms; driver.publication 1.815ms; driver.expected-state.bind-receipt 1.729ms; driver.publication 1.278ms |
| f87b72a2e58b18ba00000000000014c6 | 223.491 | 11.642 | 1.453 | 0.000 | 70.121 | 113.489 | 1.482 | 5.036 | n/a | 0.101 | 20.098 | n/a | n/a | 0.070 | 83.215 | 0.372 | 0.070 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.815ms; driver.expected-state.bind-receipt 1.729ms; driver.publication 1.278ms |
| f87b72a2e58b18ba00000000000014c7 | 219.992 | 13.232 | 2.790 | 0.000 | 59.475 | 114.256 | 0.953 | 3.313 | n/a | 0.039 | 25.896 | n/a | n/a | 0.038 | 75.498 | 0.343 | 0.038 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.877ms; driver.publication 1.815ms; driver.expected-state.bind-receipt 1.729ms; driver.publication 1.278ms |
| f87b72a2e58b18ba0000000000001431 | 170.098 | 22.955 | 0.013 | 0.000 | 44.604 | 83.999 | 3.917 | 0.297 | n/a | 1.741 | 11.394 | n/a | n/a | 1.178 | 67.572 | 0.397 | 1.178 | node-14/thread-0/socket.wait-first-byte | client.encode 10.100ms; driver.publication 8.707ms; driver.expected-state.bind-receipt 7.608ms; driver.publication 2.771ms; driver.expected-state.bind-receipt 2.604ms |
| f87b72a2e58b18ba0000000000001437 | 169.792 | 15.358 | 0.019 | 0.000 | 94.406 | 10.875 | 4.507 | 0.117 | n/a | 3.961 | 40.476 | n/a | n/a | 0.073 | 109.783 | 0.647 | 0.073 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 9.564ms; driver.publication 6.173ms; driver.publication 5.985ms; driver.expected-state.bind-receipt 5.758ms; driver.expected-state.bind-receipt 4.637ms |
| f87b72a2e58b18ba00000000000014cb | 160.389 | 9.636 | 1.708 | 0.000 | 89.142 | 34.875 | 7.601 | 1.038 | n/a | 0.478 | 15.871 | n/a | n/a | 0.040 | 100.485 | 0.627 | 0.040 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 5.569ms; driver.publication 3.877ms; driver.publication 3.332ms; driver.publication 1.815ms; driver.expected-state.bind-receipt 1.729ms |
| f87b72a2e58b18ba00000000000014d3 | 156.662 | 9.891 | 0.005 | 0.000 | 59.894 | 78.535 | 2.251 | 0.071 | n/a | 0.291 | 5.640 | n/a | n/a | 0.083 | 69.791 | 0.445 | 0.083 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 30.484ms; driver.publication 5.569ms; driver.publication 4.698ms; driver.publication 3.877ms; driver.publication 3.332ms |
| f87b72a2e58b18ba000000000000148f | 154.468 | 14.155 | 0.005 | 0.000 | 1.074 | 87.376 | 3.779 | 0.220 | n/a | 0.069 | 47.758 | n/a | n/a | 0.032 | 15.234 | 0.099 | 0.032 | node-14/thread-0/socket.wait-first-byte | client.encode 3.553ms; driver.expected-state.bind-receipt 1.619ms; driver.expected-state.bind-receipt 1.502ms; driver.publication 1.463ms; driver.publication 1.428ms |
| f87b72a2e58b18ba00000000000014c1 | 150.539 | 6.266 | 0.005 | 0.000 | 20.629 | 97.183 | 5.156 | 0.043 | n/a | 0.462 | 20.724 | n/a | n/a | 0.071 | 26.901 | 0.179 | 0.071 | node-14/thread-0/socket.wait-first-byte | client.parse 5.248ms; driver.publication 3.881ms |
| f87b72a2e58b18ba0000000000001d9d | 144.910 | 8.366 | 0.077 | 0.000 | 5.078 | 5.539 | 7.374 | 0.715 | n/a | 1.365 | 116.368 | n/a | n/a | 0.028 | 13.521 | 0.093 | 0.028 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 1.962ms; driver.publication 1.470ms; driver.publication 1.022ms |
| f87b72a2e58b18ba00000000000018ba | 139.844 | 6.725 | 0.425 | 0.000 | 18.449 | 90.618 | 0.897 | 6.189 | n/a | 0.675 | 15.831 | n/a | n/a | 0.037 | 25.598 | 0.183 | 0.037 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.477ms; driver.publication 1.555ms; client.parse 1.549ms; driver.publication 1.333ms |
| f87b72a2e58b18ba00000000000014e5 | 139.378 | 2.617 | 0.003 | 0.000 | 124.143 | 2.988 | 2.843 | 0.595 | n/a | 0.385 | 5.769 | n/a | n/a | 0.036 | 126.762 | 0.909 | 0.036 | node-14/thread-0/driver.queue.subject | driver.publication 1.592ms; driver.publication 1.465ms; driver.publication 1.429ms; driver.publication 1.417ms; driver.publication 1.364ms |
| f87b72a2e58b18ba00000000000018bb | 136.284 | 7.487 | 1.262 | 0.000 | 13.030 | 86.661 | 0.663 | 6.321 | n/a | 0.144 | 20.682 | n/a | n/a | 0.034 | 21.779 | 0.160 | 0.034 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.477ms; driver.publication 1.555ms; client.parse 1.549ms; driver.publication 1.333ms |
| f87b72a2e58b18ba000000000000148c | 134.665 | 3.864 | 0.006 | 0.000 | 3.439 | 54.931 | 1.284 | 0.023 | n/a | 0.387 | 70.693 | n/a | n/a | 0.037 | 7.310 | 0.054 | 0.037 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | client.encode 3.553ms; driver.publication 1.420ms; driver.publication 1.416ms; driver.publication 1.264ms |
| f87b72a2e58b18ba0000000000001496 | 127.825 | 4.033 | 8.935 | 0.000 | 61.956 | 4.414 | 1.306 | 4.849 | n/a | 0.420 | 41.852 | n/a | n/a | 0.061 | 74.924 | 0.586 | 0.061 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | client.encode 3.553ms; driver.publication 1.627ms; driver.expected-state.bind-receipt 1.619ms; driver.publication 1.593ms; driver.publication 1.563ms |
| f87b72a2e58b18ba00000000000018bf | 127.479 | 5.560 | 0.010 | 0.000 | 64.880 | 39.791 | 1.023 | 0.029 | n/a | 0.305 | 15.832 | n/a | n/a | 0.049 | 70.450 | 0.553 | 0.049 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 4.477ms; driver.publication 1.555ms; client.parse 1.549ms; driver.publication 1.333ms |
| f87b72a2e58b18ba00000000000014e3 | 127.450 | 7.931 | 0.013 | 0.000 | 18.161 | 17.477 | 10.202 | 4.342 | n/a | 3.698 | 65.593 | n/a | n/a | 0.034 | 26.105 | 0.205 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.465ms; driver.publication 1.429ms; driver.publication 1.417ms; driver.publication 1.364ms; driver.publication 1.263ms |
| f87b72a2e58b18ba00000000000018b1 | 124.110 | 8.731 | 0.010 | 0.000 | 7.327 | 56.868 | 1.643 | 0.043 | n/a | 1.340 | 48.081 | n/a | n/a | 0.067 | 16.068 | 0.129 | 0.067 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.790ms; driver.publication 1.787ms; driver.publication 1.555ms; driver.publication 1.286ms; client.parse 1.170ms |
| f87b72a2e58b18ba00000000000018c2 | 121.832 | 2.597 | 0.004 | 0.000 | 102.150 | 4.589 | 0.737 | 0.021 | n/a | 0.347 | 11.357 | n/a | n/a | 0.029 | 104.751 | 0.860 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication 1.861ms; driver.publication 1.333ms |
| f87b72a2e58b18ba000000000000148d | 119.580 | 2.878 | 0.007 | 0.000 | 0.101 | 50.001 | 3.950 | 0.039 | n/a | 11.569 | 50.994 | n/a | n/a | 0.041 | 2.985 | 0.025 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | client.encode 3.553ms; driver.publication 1.416ms; driver.publication 1.343ms; driver.publication 1.264ms |

## P3 / outside-phases / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.366 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.950 | 200.604 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 |
| p99 | 204.122 | n/a | n/a | n/a | 21.531 | n/a | 2.002 | 0.000 | 15.132 | 202.018 | 0.138 | n/a | 0.372 | 0.000 | n/a | n/a | 3.059 | 23.534 | 0.264 | 3.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4f51d385cbb41520000000000000007 | 204.122 | 0.000 | n/a | 0.000 | 0.000 | 1.333 | 202.018 | 0.036 | n/a | 0.372 | 0.000 | n/a | n/a | 0.363 | 0.000 | 0.000 | 0.363 | gw-r/thread-47/journal/page | none observed |
| c4f51d385cbb41520000000000000006 | 203.229 | 0.000 | n/a | 0.000 | 0.000 | 1.204 | 201.589 | 0.014 | n/a | 0.209 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb41520000000000000005 | 202.590 | 0.000 | n/a | 0.000 | 0.000 | 0.819 | 201.358 | 0.021 | n/a | 0.142 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb41520000000000000ea1 | 202.093 | 0.000 | n/a | 0.000 | 0.000 | 0.928 | 200.905 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb41520000000000000ea2 | 201.859 | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 200.999 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb41520000000000000ea3 | 201.448 | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 200.635 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb41520000000000000ea4 | 201.366 | 0.000 | n/a | 0.000 | 0.000 | 0.583 | 200.604 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-44/journal/page | none observed |
| 8c5a2465101827920000000000000002 | 169.502 | 1.385 | n/a | 0.000 | 0.000 | 2.724 | 164.747 | 0.138 | n/a | 0.116 | 0.000 | n/a | n/a | 0.390 | 1.385 | 0.008 | 0.390 | gw-r/thread-46/gateway.admitted-work | none observed |
| c4f51d385cbb41520000000000000ea7 | 135.177 | 21.531 | n/a | 2.002 | 0.000 | 15.132 | 96.299 | 0.007 | n/a | 0.014 | 0.000 | n/a | n/a | 0.191 | 23.534 | 0.174 | 0.191 | gw-r/thread-67/gateway.admitted-work | none observed |
| c4f51d385cbb4152000000000000005a | 125.661 | 0.000 | n/a | 0.000 | 0.000 | 0.950 | 124.386 | 0.015 | n/a | 0.089 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb41520000000000000ea8 | 101.216 | 21.123 | n/a | 0.000 | 0.000 | 1.791 | 75.214 | 0.013 | n/a | 0.016 | 0.000 | n/a | n/a | 3.059 | 21.123 | 0.209 | 3.059 | gw-r/thread-42/gateway.admitted-work | none observed |
| c4f51d385cbb41520000000000000ea9 | 77.094 | 19.099 | n/a | 1.246 | 0.000 | 4.083 | 52.349 | 0.008 | n/a | 0.010 | 0.000 | n/a | n/a | 0.299 | 20.345 | 0.264 | 0.299 | gw-r/thread-67/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 846.063 | n/a | n/a | n/a | 0.188 | n/a | 0.000 | 0.000 | 1.731 | 820.229 | 0.022 | n/a | 0.109 | 0.000 | n/a | n/a | 1.391 | 0.188 | 0.000 | 1.391 |
| p99 | 1005.613 | n/a | n/a | n/a | 15.778 | n/a | 5.342 | 0.000 | 2.391 | 1001.718 | 0.032 | n/a | 0.553 | 0.000 | n/a | n/a | 2.192 | 21.120 | 0.025 | 2.192 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8c5a24651018279200000000000000a4 | 1005.613 | 0.188 | n/a | 0.000 | 0.000 | 1.731 | 1001.718 | 0.032 | n/a | 0.553 | 0.000 | n/a | n/a | 1.391 | 0.188 | 0.000 | 1.391 | gw-r/thread-47/journal/page | none observed |
| 8c5a24651018279200000000000000a5 | 846.063 | 15.778 | n/a | 5.342 | 0.000 | 2.391 | 820.229 | 0.022 | n/a | 0.109 | 0.000 | n/a | n/a | 2.192 | 21.120 | 0.025 | 2.192 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / internal (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 383.292 | n/a | n/a | n/a | 3.421 | n/a | 0.000 | 0.000 | 0.908 | 376.502 | 0.023 | n/a | 0.123 | 0.000 | n/a | n/a | 0.179 | 3.421 | 0.011 | 0.179 |
| p99 | 1005.795 | n/a | n/a | n/a | 15.423 | n/a | 2.445 | 0.000 | 4.782 | 1002.218 | 0.780 | n/a | 0.564 | 0.000 | n/a | n/a | 47.092 | 15.423 | 0.239 | 47.092 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8c5a24651018279200000000000000bc | 1005.795 | 0.133 | n/a | 0.000 | 0.000 | 2.086 | 1002.218 | 0.026 | n/a | 0.224 | 0.000 | n/a | n/a | 1.109 | 0.133 | 0.000 | 1.109 | gw-r/thread-47/journal/page | none observed |
| 8c5a24651018279200000000000000d1 | 1004.887 | 0.182 | n/a | 0.000 | 0.000 | 2.282 | 1000.998 | 0.020 | n/a | 0.208 | 0.000 | n/a | n/a | 1.197 | 0.182 | 0.000 | 1.197 | gw-r/thread-47/journal/page | none observed |
| 8c5a24651018279200000000000000b4 | 1004.562 | 0.315 | n/a | 0.000 | 0.000 | 1.164 | 1001.592 | 0.027 | n/a | 0.240 | 0.000 | n/a | n/a | 1.223 | 0.315 | 0.000 | 1.223 | gw-r/thread-45/journal/page | none observed |
| 8c5a24651018279200000000000000bb | 997.437 | 3.060 | n/a | 0.000 | 0.000 | 0.881 | 993.230 | 0.019 | n/a | 0.098 | 0.000 | n/a | n/a | 0.148 | 3.060 | 0.003 | 0.148 | gw-r/thread-46/journal/page | none observed |
| 8c5a24651018279200000000000000ae | 965.673 | 2.751 | n/a | 0.000 | 0.000 | 4.782 | 957.894 | 0.027 | n/a | 0.127 | 0.000 | n/a | n/a | 0.093 | 2.751 | 0.003 | 0.093 | gw-r/thread-67/journal/page | none observed |
| 8c5a24651018279200000000000000c3 | 879.960 | 15.423 | n/a | 0.000 | 0.000 | 0.804 | 863.166 | 0.050 | n/a | 0.200 | 0.000 | n/a | n/a | 0.318 | 15.423 | 0.018 | 0.318 | gw-r/thread-67/journal/page | none observed |
| 8c5a24651018279200000000000000ab | 828.720 | 3.421 | n/a | 0.000 | 0.000 | 0.760 | 824.261 | 0.032 | n/a | 0.137 | 0.000 | n/a | n/a | 0.110 | 3.421 | 0.004 | 0.110 | gw-r/thread-45/journal/page | none observed |
| 8c5a24651018279200000000000000ca | 738.397 | 6.908 | n/a | 0.000 | 0.000 | 0.562 | 730.423 | 0.277 | n/a | 0.120 | 0.000 | n/a | n/a | 0.108 | 6.908 | 0.009 | 0.108 | gw-r/thread-67/journal/page | none observed |
| 8c5a24651018279200000000000000a8 | 729.850 | 3.006 | n/a | 0.000 | 0.000 | 0.948 | 725.650 | 0.023 | n/a | 0.099 | 0.000 | n/a | n/a | 0.124 | 3.006 | 0.004 | 0.124 | gw-r/thread-42/journal/page | none observed |
| 8c5a24651018279200000000000000c8 | 718.277 | 2.684 | n/a | 0.000 | 0.000 | 0.872 | 714.538 | 0.013 | n/a | 0.087 | 0.000 | n/a | n/a | 0.084 | 2.684 | 0.004 | 0.084 | gw-r/thread-46/journal/page | none observed |
| 8c5a24651018279200000000000000b3 | 709.347 | 8.138 | n/a | 0.000 | 0.000 | 0.946 | 699.852 | 0.037 | n/a | 0.143 | 0.000 | n/a | n/a | 0.231 | 8.138 | 0.011 | 0.231 | gw-r/thread-44/journal/page | none observed |
| 8c5a24651018279200000000000000c1 | 621.832 | 3.070 | n/a | 0.000 | 0.000 | 0.896 | 617.630 | 0.022 | n/a | 0.135 | 0.000 | n/a | n/a | 0.079 | 3.070 | 0.005 | 0.079 | gw-r/thread-42/journal/page | none observed |
| 8c5a24651018279200000000000000cc | 523.579 | 4.674 | n/a | 0.000 | 0.000 | 0.700 | 517.821 | 0.225 | n/a | 0.086 | 0.000 | n/a | n/a | 0.074 | 4.674 | 0.009 | 0.074 | gw-r/thread-42/journal/page | none observed |
| 8c5a24651018279200000000000000a7 | 438.009 | 3.065 | n/a | 0.000 | 0.000 | 0.600 | 433.875 | 0.019 | n/a | 0.243 | 0.000 | n/a | n/a | 0.206 | 3.065 | 0.007 | 0.206 | gw-r/thread-47/journal/page | none observed |
| 8c5a24651018279200000000000000b8 | 423.848 | 5.798 | n/a | 0.000 | 0.000 | 1.115 | 416.655 | 0.017 | n/a | 0.123 | 0.000 | n/a | n/a | 0.139 | 5.798 | 0.014 | 0.139 | gw-r/thread-45/journal/page | none observed |
| 8c5a24651018279200000000000000b9 | 383.292 | 3.928 | n/a | 0.000 | 0.000 | 2.558 | 376.502 | 0.017 | n/a | 0.107 | 0.000 | n/a | n/a | 0.181 | 3.928 | 0.010 | 0.181 | gw-r/thread-45/journal/page | none observed |
| 8c5a24651018279200000000000000c6 | 275.948 | 4.064 | n/a | 0.000 | 0.000 | 1.092 | 270.439 | 0.100 | n/a | 0.121 | 0.000 | n/a | n/a | 0.131 | 4.064 | 0.015 | 0.131 | gw-r/thread-44/journal/page | none observed |
| 8c5a24651018279200000000000000b1 | 275.545 | 9.385 | n/a | 0.000 | 0.000 | 0.961 | 264.618 | 0.180 | n/a | 0.201 | 0.000 | n/a | n/a | 0.200 | 9.385 | 0.034 | 0.200 | gw-r/thread-47/journal/page | none observed |
| 8c5a24651018279200000000000000bf | 269.731 | 2.705 | n/a | 0.000 | 0.000 | 1.098 | 265.680 | 0.023 | n/a | 0.121 | 0.000 | n/a | n/a | 0.104 | 2.705 | 0.010 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 8c5a24651018279200000000000000cd | 268.444 | 2.950 | n/a | 0.000 | 0.000 | 0.648 | 264.628 | 0.017 | n/a | 0.101 | 0.000 | n/a | n/a | 0.100 | 2.950 | 0.011 | 0.100 | gw-r/thread-42/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 353.153 | n/a | n/a | n/a | 4.438 | n/a | 0.602 | 0.000 | 0.934 | 346.603 | 0.017 | n/a | 0.112 | 0.000 | n/a | n/a | 0.142 | 4.968 | 0.015 | 0.142 |
| p99 | 1006.576 | n/a | n/a | n/a | 18.401 | n/a | 2.036 | 0.000 | 2.317 | 1001.322 | 1.731 | n/a | 1.056 | 0.000 | n/a | n/a | 29.219 | 20.437 | 0.580 | 29.219 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8c5a2465101827920000000000000103 | 1006.576 | 2.672 | n/a | 0.000 | 0.000 | 2.301 | 1001.322 | 0.031 | n/a | 0.132 | 0.000 | n/a | n/a | 0.118 | 2.672 | 0.003 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 8c5a24651018279200000000000000da | 1002.887 | 0.109 | n/a | 0.000 | 0.000 | 0.678 | 1000.867 | 0.015 | n/a | 0.110 | 0.000 | n/a | n/a | 1.109 | 0.109 | 0.000 | 1.109 | gw-r/thread-48/journal/page | none observed |
| 8c5a24651018279200000000000000d4 | 1002.642 | 10.025 | n/a | 1.672 | 0.000 | 0.917 | 989.661 | 0.015 | n/a | 0.093 | 0.000 | n/a | n/a | 0.259 | 11.697 | 0.012 | 0.259 | gw-r/thread-67/journal/page | none observed |
| 8c5a2465101827920000000000000107 | 992.114 | 5.499 | n/a | 0.960 | 0.000 | 1.044 | 984.283 | 0.012 | n/a | 0.151 | 0.000 | n/a | n/a | 0.166 | 6.458 | 0.007 | 0.166 | gw-r/thread-67/journal/page | none observed |
| 8c5a246510182792000000000000010f | 985.677 | 2.750 | n/a | 0.000 | 0.000 | 2.195 | 980.551 | 0.014 | n/a | 0.074 | 0.000 | n/a | n/a | 0.094 | 2.750 | 0.003 | 0.094 | gw-r/thread-42/journal/page | none observed |
| 8c5a24651018279200000000000000e1 | 977.629 | 3.344 | n/a | 0.641 | 0.000 | 0.844 | 972.632 | 0.013 | n/a | 0.057 | 0.000 | n/a | n/a | 0.098 | 3.985 | 0.004 | 0.098 | gw-r/thread-45/journal/page | none observed |
| 8c5a24651018279200000000000000d3 | 972.539 | 5.418 | n/a | 1.537 | 0.000 | 1.420 | 963.664 | 0.016 | n/a | 0.190 | 0.000 | n/a | n/a | 0.295 | 6.955 | 0.007 | 0.295 | gw-r/thread-67/journal/page | none observed |
| 8c5a24651018279200000000000000e0 | 950.169 | 4.640 | n/a | 0.629 | 0.000 | 0.644 | 943.786 | 0.123 | n/a | 0.131 | 0.000 | n/a | n/a | 0.217 | 5.269 | 0.006 | 0.217 | gw-r/thread-47/journal/page | none observed |
| 8c5a24651018279200000000000000e7 | 894.379 | 3.628 | n/a | 0.602 | 0.000 | 1.437 | 888.490 | 0.013 | n/a | 0.081 | 0.000 | n/a | n/a | 0.129 | 4.229 | 0.005 | 0.129 | gw-r/thread-48/journal/page | none observed |
| 8c5a24651018279200000000000000dc | 878.791 | 4.505 | n/a | 0.750 | 0.000 | 2.009 | 871.256 | 0.021 | n/a | 0.096 | 0.000 | n/a | n/a | 0.154 | 5.255 | 0.006 | 0.154 | gw-r/thread-48/journal/page | none observed |
| 8c5a2465101827920000000000000100 | 871.117 | 8.789 | n/a | 1.045 | 0.000 | 0.791 | 860.292 | 0.016 | n/a | 0.078 | 0.000 | n/a | n/a | 0.106 | 9.833 | 0.011 | 0.106 | gw-r/thread-67/journal/page | none observed |
| 8c5a24651018279200000000000000e2 | 691.020 | 4.851 | n/a | 0.681 | 0.000 | 1.093 | 684.169 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.139 | 5.532 | 0.008 | 0.139 | gw-r/thread-49/journal/page | none observed |
| 8c5a24651018279200000000000000df | 665.000 | 4.072 | n/a | 0.901 | 0.000 | 1.017 | 658.684 | 0.021 | n/a | 0.214 | 0.000 | n/a | n/a | 0.092 | 4.973 | 0.007 | 0.092 | gw-r/thread-44/journal/page | none observed |
| 8c5a2465101827920000000000000104 | 664.003 | 2.632 | n/a | 0.000 | 0.000 | 1.041 | 660.093 | 0.013 | n/a | 0.119 | 0.000 | n/a | n/a | 0.104 | 2.632 | 0.004 | 0.104 | gw-r/thread-67/journal/page | none observed |
| 8c5a24651018279200000000000000ea | 592.999 | 18.401 | n/a | 2.036 | 0.000 | 0.631 | 571.629 | 0.031 | n/a | 0.099 | 0.000 | n/a | n/a | 0.172 | 20.437 | 0.034 | 0.172 | gw-r/thread-47/journal/page | none observed |
| 8c5a24651018279200000000000000ed | 540.466 | 3.330 | n/a | 0.656 | 0.000 | 0.658 | 535.590 | 0.027 | n/a | 0.122 | 0.000 | n/a | n/a | 0.085 | 3.985 | 0.007 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 8c5a24651018279200000000000000fe | 537.775 | 4.370 | n/a | 0.000 | 0.000 | 2.317 | 530.852 | 0.017 | n/a | 0.117 | 0.000 | n/a | n/a | 0.102 | 4.370 | 0.008 | 0.102 | gw-r/thread-67/journal/page | none observed |
| 8c5a24651018279200000000000000fd | 465.650 | 4.486 | n/a | 0.000 | 0.000 | 2.279 | 458.590 | 0.021 | n/a | 0.113 | 0.000 | n/a | n/a | 0.161 | 4.486 | 0.010 | 0.161 | gw-r/thread-67/journal/page | none observed |
| 8c5a2465101827920000000000000109 | 462.813 | 17.366 | n/a | 0.729 | 0.000 | 1.185 | 443.171 | 0.014 | n/a | 0.084 | 0.000 | n/a | n/a | 0.264 | 18.095 | 0.039 | 0.264 | gw-r/thread-45/journal/page | none observed |
| 8c5a24651018279200000000000000d6 | 431.734 | 7.479 | n/a | 1.097 | 0.000 | 1.040 | 421.632 | 0.184 | n/a | 0.098 | 0.000 | n/a | n/a | 0.203 | 8.576 | 0.020 | 0.203 | gw-r/thread-46/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 458.005 | n/a | n/a | n/a | 4.062 | n/a | 0.000 | 0.000 | 0.902 | 440.823 | 0.015 | n/a | 0.066 | 0.000 | n/a | n/a | 0.148 | 4.089 | 0.009 | 0.148 |
| p99 | 1003.677 | n/a | n/a | n/a | 25.139 | n/a | 1.186 | 0.000 | 6.653 | 1001.327 | 24.573 | n/a | 0.233 | 0.000 | n/a | n/a | 36.688 | 25.139 | 0.571 | 36.688 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8c5a2465101827920000000000000116 | 1003.677 | 0.152 | n/a | 0.000 | 0.000 | 0.964 | 1001.327 | 0.016 | n/a | 0.107 | 0.000 | n/a | n/a | 1.111 | 0.152 | 0.000 | 1.111 | gw-r/thread-49/journal/page | none observed |
| 8c5a2465101827920000000000000142 | 1003.046 | 4.642 | n/a | 0.000 | 0.000 | 0.684 | 997.307 | 0.131 | n/a | 0.058 | 0.000 | n/a | n/a | 0.224 | 4.642 | 0.005 | 0.224 | gw-r/thread-45/journal/page | none observed |
| 8c5a246510182792000000000000012c | 999.161 | 4.627 | n/a | 0.000 | 0.000 | 0.710 | 992.837 | 0.720 | n/a | 0.100 | 0.000 | n/a | n/a | 0.168 | 4.627 | 0.005 | 0.168 | gw-r/thread-47/journal/page | none observed |
| 8c5a246510182792000000000000012d | 998.062 | 5.701 | n/a | 0.000 | 0.000 | 0.813 | 991.355 | 0.016 | n/a | 0.079 | 0.000 | n/a | n/a | 0.099 | 5.701 | 0.006 | 0.099 | gw-r/thread-47/journal/page | none observed |
| 8c5a246510182792000000000000011f | 993.193 | 3.371 | n/a | 0.718 | 0.000 | 0.559 | 988.341 | 0.012 | n/a | 0.049 | 0.000 | n/a | n/a | 0.142 | 4.089 | 0.004 | 0.142 | gw-r/thread-44/journal/page | none observed |
| 8c5a2465101827920000000000000128 | 989.959 | 3.243 | n/a | 0.698 | 0.000 | 0.656 | 984.364 | 0.543 | n/a | 0.079 | 0.000 | n/a | n/a | 0.376 | 3.941 | 0.004 | 0.376 | gw-r/thread-48/journal/page | none observed |
| 8c5a2465101827920000000000000139 | 986.935 | 3.808 | n/a | 0.000 | 0.000 | 1.143 | 981.811 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.104 | 3.808 | 0.004 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 8c5a2465101827920000000000000149 | 899.528 | 7.043 | n/a | 0.000 | 0.000 | 0.757 | 891.300 | 0.042 | n/a | 0.114 | 0.000 | n/a | n/a | 0.273 | 7.043 | 0.008 | 0.273 | gw-r/thread-47/journal/page | none observed |
| 8c5a246510182792000000000000012f | 814.083 | 4.062 | n/a | 0.000 | 0.000 | 2.879 | 806.932 | 0.015 | n/a | 0.086 | 0.000 | n/a | n/a | 0.109 | 4.062 | 0.005 | 0.109 | gw-r/thread-46/journal/page | none observed |
| 8c5a2465101827920000000000000127 | 798.457 | 6.720 | n/a | 0.000 | 0.000 | 0.937 | 790.164 | 0.314 | n/a | 0.084 | 0.000 | n/a | n/a | 0.238 | 6.720 | 0.008 | 0.238 | gw-r/thread-42/journal/page | none observed |
| 8c5a246510182792000000000000013e | 778.614 | 1.762 | n/a | 0.000 | 0.000 | 2.464 | 774.190 | 0.026 | n/a | 0.078 | 0.000 | n/a | n/a | 0.094 | 1.762 | 0.002 | 0.094 | gw-r/thread-45/journal/page | none observed |
| 8c5a2465101827920000000000000135 | 742.048 | 6.152 | n/a | 0.000 | 0.000 | 0.832 | 734.762 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 0.217 | 6.152 | 0.008 | 0.217 | gw-r/thread-49/journal/page | none observed |
| 8c5a2465101827920000000000000113 | 716.096 | 2.696 | n/a | 0.688 | 0.000 | 0.566 | 711.791 | 0.183 | n/a | 0.055 | 0.000 | n/a | n/a | 0.117 | 3.383 | 0.005 | 0.117 | gw-r/thread-47/journal/page | none observed |
| 8c5a2465101827920000000000000129 | 639.152 | 6.330 | n/a | 0.000 | 0.000 | 1.696 | 630.778 | 0.138 | n/a | 0.083 | 0.000 | n/a | n/a | 0.126 | 6.330 | 0.010 | 0.126 | gw-r/thread-45/journal/page | none observed |
| 8c5a2465101827920000000000000120 | 619.338 | 2.378 | n/a | 0.000 | 0.000 | 0.949 | 615.633 | 0.029 | n/a | 0.233 | 0.000 | n/a | n/a | 0.117 | 2.378 | 0.004 | 0.117 | gw-r/thread-44/journal/page | none observed |
| 8c5a2465101827920000000000000110 | 565.503 | 4.667 | n/a | 0.620 | 0.000 | 0.732 | 559.198 | 0.009 | n/a | 0.125 | 0.000 | n/a | n/a | 0.153 | 5.287 | 0.009 | 0.153 | gw-r/thread-42/journal/page | none observed |
| 8c5a2465101827920000000000000136 | 564.037 | 5.036 | n/a | 0.000 | 0.000 | 1.198 | 557.313 | 0.209 | n/a | 0.080 | 0.000 | n/a | n/a | 0.202 | 5.036 | 0.009 | 0.202 | gw-r/thread-42/journal/page | none observed |
| 8c5a246510182792000000000000013b | 538.508 | 3.330 | n/a | 0.000 | 0.000 | 0.803 | 534.188 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.097 | 3.330 | 0.006 | 0.097 | gw-r/thread-47/journal/page | none observed |
| 8c5a2465101827920000000000000143 | 507.871 | 9.401 | n/a | 0.887 | 0.000 | 0.825 | 496.401 | 0.014 | n/a | 0.068 | 0.000 | n/a | n/a | 0.275 | 10.288 | 0.020 | 0.275 | gw-r/thread-49/journal/page | none observed |
| 8c5a246510182792000000000000011e | 502.061 | 6.483 | n/a | 0.000 | 0.000 | 0.912 | 494.389 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 0.217 | 6.483 | 0.013 | 0.217 | gw-r/thread-44/journal/page | none observed |

## P3 / L16 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 419.282 | n/a | n/a | n/a | 3.509 | n/a | 0.000 | 0.000 | 0.727 | 413.883 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.109 | 3.509 | 0.010 | 0.109 |
| p99 | 1009.212 | n/a | n/a | n/a | 10.612 | n/a | 0.791 | 0.000 | 5.321 | 1001.389 | 1.634 | n/a | 0.114 | 0.000 | n/a | n/a | 56.826 | 10.612 | 0.365 | 56.826 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8c5a2465101827920000000000000187 | 1009.212 | 7.006 | n/a | 0.000 | 0.000 | 0.701 | 1001.343 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.109 | 7.006 | 0.007 | 0.109 | gw-r/thread-46/journal/page | none observed |
| 8c5a2465101827920000000000000174 | 1007.498 | 0.193 | n/a | 0.000 | 0.000 | 5.321 | 1000.679 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 1.247 | 0.193 | 0.000 | 1.247 | gw-r/thread-47/journal/page | none observed |
| 8c5a2465101827920000000000000186 | 1007.033 | 2.680 | n/a | 0.000 | 0.000 | 3.497 | 1000.738 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.066 | 2.680 | 0.003 | 0.066 | gw-r/thread-46/journal/page | none observed |
| 8c5a246510182792000000000000017a | 1005.929 | 0.212 | n/a | 0.000 | 0.000 | 3.043 | 1001.389 | 0.018 | n/a | 0.114 | 0.000 | n/a | n/a | 1.154 | 0.212 | 0.000 | 1.154 | gw-r/thread-67/journal/page | none observed |
| 8c5a246510182792000000000000016e | 1004.052 | 2.786 | n/a | 0.000 | 0.000 | 0.860 | 1000.184 | 0.007 | n/a | 0.105 | 0.000 | n/a | n/a | 0.111 | 2.786 | 0.003 | 0.111 | gw-r/thread-44/journal/page | none observed |
| 8c5a2465101827920000000000000155 | 998.730 | 5.252 | n/a | 0.000 | 0.000 | 3.027 | 990.247 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.151 | 5.252 | 0.005 | 0.151 | gw-r/thread-45/journal/page | none observed |
| 8c5a2465101827920000000000000180 | 995.469 | 2.846 | n/a | 0.000 | 0.000 | 0.759 | 991.700 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.101 | 2.846 | 0.003 | 0.101 | gw-r/thread-49/journal/page | none observed |
| 8c5a2465101827920000000000000165 | 991.888 | 2.826 | n/a | 0.000 | 0.000 | 0.704 | 988.211 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.098 | 2.826 | 0.003 | 0.098 | gw-r/thread-47/journal/page | none observed |
| 8c5a246510182792000000000000015b | 779.608 | 3.201 | n/a | 0.000 | 0.000 | 0.518 | 775.719 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.085 | 3.201 | 0.004 | 0.085 | gw-r/thread-49/journal/page | none observed |
| 8c5a246510182792000000000000016d | 747.484 | 3.884 | n/a | 0.000 | 0.000 | 0.508 | 742.923 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.118 | 3.884 | 0.005 | 0.118 | gw-r/thread-42/journal/page | none observed |
| 8c5a2465101827920000000000000185 | 743.024 | 4.482 | n/a | 0.000 | 0.000 | 0.970 | 737.397 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.108 | 4.482 | 0.006 | 0.108 | gw-r/thread-42/journal/page | none observed |
| 8c5a2465101827920000000000000189 | 732.290 | 4.631 | n/a | 0.000 | 0.000 | 0.856 | 726.646 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.094 | 4.631 | 0.006 | 0.094 | gw-r/thread-44/journal/page | none observed |
| 8c5a246510182792000000000000017e | 715.049 | 4.024 | n/a | 0.000 | 0.000 | 0.887 | 709.812 | 0.028 | n/a | 0.090 | 0.000 | n/a | n/a | 0.208 | 4.024 | 0.006 | 0.208 | gw-r/thread-49/journal/page | none observed |
| 8c5a2465101827920000000000000177 | 707.938 | 3.026 | n/a | 0.000 | 0.000 | 0.568 | 703.876 | 0.306 | n/a | 0.071 | 0.000 | n/a | n/a | 0.090 | 3.026 | 0.004 | 0.090 | gw-r/thread-47/journal/page | none observed |
| 8c5a2465101827920000000000000170 | 621.339 | 2.728 | n/a | 0.000 | 0.000 | 0.547 | 617.927 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.086 | 2.728 | 0.004 | 0.086 | gw-r/thread-47/journal/page | none observed |
| 8c5a2465101827920000000000000156 | 610.326 | 2.459 | n/a | 0.000 | 0.000 | 0.601 | 605.467 | 1.634 | n/a | 0.074 | 0.000 | n/a | n/a | 0.092 | 2.459 | 0.004 | 0.092 | gw-r/thread-45/journal/page | none observed |
| 8c5a2465101827920000000000000153 | 518.127 | 3.888 | n/a | 0.000 | 0.000 | 0.752 | 513.152 | 0.163 | n/a | 0.051 | 0.000 | n/a | n/a | 0.121 | 3.888 | 0.008 | 0.121 | gw-r/thread-47/journal/page | none observed |
| 8c5a2465101827920000000000000167 | 509.069 | 3.204 | n/a | 0.000 | 0.000 | 0.727 | 504.797 | 0.178 | n/a | 0.050 | 0.000 | n/a | n/a | 0.113 | 3.204 | 0.006 | 0.113 | gw-r/thread-46/journal/page | none observed |
| 8c5a2465101827920000000000000150 | 468.976 | 3.557 | n/a | 0.000 | 0.000 | 0.737 | 464.472 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.153 | 3.557 | 0.008 | 0.153 | gw-r/thread-67/journal/page | none observed |
| 8c5a2465101827920000000000000166 | 432.626 | 10.612 | n/a | 0.000 | 0.000 | 3.432 | 418.315 | 0.022 | n/a | 0.075 | 0.000 | n/a | n/a | 0.169 | 10.612 | 0.025 | 0.169 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / internal (52 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 308.666 | n/a | n/a | n/a | 3.707 | n/a | 0.000 | 0.000 | 0.669 | 293.229 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.145 | 3.707 | 0.016 | 0.145 |
| p99 | 1002.688 | n/a | n/a | n/a | 15.049 | n/a | 2.042 | 0.000 | 6.421 | 1000.837 | 2.960 | n/a | 0.587 | 0.000 | n/a | n/a | 50.066 | 17.091 | 0.690 | 50.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8c5a24651018279200000000000001a9 | 1002.688 | 0.117 | n/a | 0.000 | 0.000 | 0.538 | 1000.837 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 1.117 | 0.117 | 0.000 | 1.117 | gw-r/thread-45/journal/page | none observed |
| 8c5a24651018279200000000000001a7 | 1002.593 | 0.110 | n/a | 0.000 | 0.000 | 0.503 | 1000.792 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 1.109 | 0.110 | 0.000 | 1.109 | gw-r/thread-44/journal/page | none observed |
| 8c5a24651018279200000000000001a5 | 1002.563 | 0.144 | n/a | 0.000 | 0.000 | 0.514 | 1000.702 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 1.145 | 0.144 | 0.000 | 1.145 | gw-r/thread-45/journal/page | none observed |
| 8c5a24651018279200000000000001c7 | 996.081 | 3.510 | n/a | 0.000 | 0.000 | 0.565 | 991.822 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.100 | 3.510 | 0.004 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 8c5a24651018279200000000000001c6 | 981.560 | 2.858 | n/a | 0.000 | 0.000 | 0.386 | 978.062 | 0.141 | n/a | 0.030 | 0.000 | n/a | n/a | 0.084 | 2.858 | 0.003 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 8c5a246510182792000000000000018b | 980.519 | 3.203 | n/a | 0.000 | 0.000 | 3.468 | 973.689 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.089 | 3.203 | 0.003 | 0.089 | gw-r/thread-46/journal/page | none observed |
| 8c5a24651018279200000000000001c4 | 930.095 | 2.986 | n/a | 0.000 | 0.000 | 0.523 | 926.301 | 0.152 | n/a | 0.036 | 0.000 | n/a | n/a | 0.097 | 2.986 | 0.003 | 0.097 | gw-r/thread-44/journal/page | none observed |
| 8c5a246510182792000000000000019a | 890.674 | 1.942 | n/a | 0.000 | 0.000 | 3.013 | 885.553 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.100 | 1.942 | 0.002 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 8c5a24651018279200000000000001b8 | 795.182 | 2.996 | n/a | 0.000 | 0.000 | 0.665 | 791.072 | 0.280 | n/a | 0.089 | 0.000 | n/a | n/a | 0.080 | 2.996 | 0.004 | 0.080 | gw-r/thread-44/journal/page | none observed |
| 8c5a246510182792000000000000019d | 758.755 | 5.329 | n/a | 0.000 | 0.000 | 0.592 | 752.594 | 0.011 | n/a | 0.075 | 0.000 | n/a | n/a | 0.155 | 5.329 | 0.007 | 0.155 | gw-r/thread-47/journal/page | none observed |
| 8c5a2465101827920000000000000199 | 609.829 | 4.458 | n/a | 0.000 | 0.000 | 0.762 | 604.209 | 0.165 | n/a | 0.099 | 0.000 | n/a | n/a | 0.135 | 4.458 | 0.007 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 8c5a24651018279200000000000001d0 | 600.109 | 5.084 | n/a | 0.000 | 0.000 | 0.890 | 593.974 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.090 | 5.084 | 0.008 | 0.090 | gw-r/thread-46/journal/page | none observed |
| 8c5a24651018279200000000000001bc | 575.412 | 2.700 | n/a | 0.000 | 0.000 | 5.240 | 567.284 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.116 | 2.700 | 0.005 | 0.116 | gw-r/thread-67/journal/page | none observed |
| 8c5a24651018279200000000000001d7 | 571.965 | 1.897 | n/a | 0.000 | 0.000 | 0.546 | 569.125 | 0.239 | n/a | 0.079 | 0.000 | n/a | n/a | 0.079 | 1.897 | 0.003 | 0.079 | gw-r/thread-44/journal/page | none observed |
| 8c5a24651018279200000000000001d3 | 548.428 | 9.714 | n/a | 0.000 | 0.000 | 0.711 | 537.651 | 0.047 | n/a | 0.048 | 0.000 | n/a | n/a | 0.257 | 9.714 | 0.018 | 0.257 | gw-r/thread-49/journal/page | none observed |
| 8c5a24651018279200000000000001a0 | 508.674 | 7.045 | n/a | 0.000 | 0.000 | 0.806 | 500.517 | 0.164 | n/a | 0.049 | 0.000 | n/a | n/a | 0.093 | 7.045 | 0.014 | 0.093 | gw-r/thread-44/journal/page | none observed |
| 8c5a24651018279200000000000001c8 | 496.517 | 3.708 | n/a | 0.000 | 0.000 | 0.442 | 492.049 | 0.166 | n/a | 0.050 | 0.000 | n/a | n/a | 0.101 | 3.708 | 0.007 | 0.101 | gw-r/thread-45/journal/page | none observed |
| 8c5a24651018279200000000000001d5 | 457.707 | 3.311 | n/a | 0.000 | 0.000 | 0.765 | 453.334 | 0.163 | n/a | 0.050 | 0.000 | n/a | n/a | 0.083 | 3.311 | 0.007 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 8c5a24651018279200000000000001b2 | 453.824 | 5.796 | n/a | 0.000 | 0.000 | 0.690 | 447.156 | 0.009 | n/a | 0.056 | 0.000 | n/a | n/a | 0.116 | 5.796 | 0.013 | 0.116 | gw-r/thread-67/journal/page | none observed |
| 8c5a24651018279200000000000001a1 | 438.073 | 2.464 | n/a | 0.000 | 0.000 | 0.530 | 434.944 | 0.011 | n/a | 0.040 | 0.000 | n/a | n/a | 0.084 | 2.464 | 0.006 | 0.084 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 443.485 | n/a | n/a | n/a | 3.496 | n/a | 0.000 | 0.000 | 0.640 | 423.663 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.118 | 3.496 | 0.010 | 0.118 |
| p99 | 1015.068 | n/a | n/a | n/a | 10.208 | n/a | 0.000 | 0.000 | 25.741 | 1003.562 | 0.219 | n/a | 0.173 | 0.000 | n/a | n/a | 33.124 | 10.208 | 0.597 | 33.124 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8c5a246510182792000000000000021a | 1015.068 | 1.726 | n/a | 0.000 | 0.000 | 10.672 | 1002.221 | 0.018 | n/a | 0.173 | 0.000 | n/a | n/a | 0.259 | 1.726 | 0.002 | 0.259 | gw-r/thread-67/journal/page | none observed |
| 8c5a2465101827920000000000000213 | 1009.819 | 5.743 | n/a | 0.000 | 0.000 | 4.374 | 999.453 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.186 | 5.743 | 0.006 | 0.186 | gw-r/thread-49/journal/page | none observed |
| 8c5a24651018279200000000000001ec | 1007.151 | 2.813 | n/a | 0.000 | 0.000 | 0.468 | 1003.562 | 0.152 | n/a | 0.091 | 0.000 | n/a | n/a | 0.065 | 2.813 | 0.003 | 0.065 | gw-r/thread-44/journal/page | none observed |
| 8c5a2465101827920000000000000209 | 1005.864 | 5.707 | n/a | 0.000 | 0.000 | 5.934 | 993.990 | 0.023 | n/a | 0.053 | 0.000 | n/a | n/a | 0.157 | 5.707 | 0.006 | 0.157 | gw-r/thread-46/journal/page | none observed |
| 8c5a2465101827920000000000000218 | 1002.863 | 0.128 | n/a | 0.000 | 0.000 | 0.665 | 1000.877 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 1.115 | 0.128 | 0.000 | 1.115 | gw-r/thread-44/journal/page | none observed |
| 8c5a2465101827920000000000000217 | 978.245 | 2.891 | n/a | 0.000 | 0.000 | 0.381 | 974.857 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.081 | 2.891 | 0.003 | 0.081 | gw-r/thread-67/journal/page | none observed |
| 8c5a24651018279200000000000001f9 | 966.292 | 3.620 | n/a | 0.000 | 0.000 | 0.635 | 961.903 | 0.011 | n/a | 0.044 | 0.000 | n/a | n/a | 0.079 | 3.620 | 0.004 | 0.079 | gw-r/thread-42/journal/page | none observed |
| 8c5a2465101827920000000000000200 | 953.104 | 2.744 | n/a | 0.000 | 0.000 | 0.444 | 949.787 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.082 | 2.744 | 0.003 | 0.082 | gw-r/thread-49/journal/page | none observed |
| 8c5a2465101827920000000000000214 | 872.468 | 9.405 | n/a | 0.000 | 0.000 | 0.726 | 861.937 | 0.219 | n/a | 0.049 | 0.000 | n/a | n/a | 0.132 | 9.405 | 0.011 | 0.132 | gw-r/thread-46/journal/page | none observed |
| 8c5a24651018279200000000000001f6 | 822.807 | 4.425 | n/a | 0.000 | 0.000 | 0.517 | 817.729 | 0.012 | n/a | 0.046 | 0.000 | n/a | n/a | 0.079 | 4.425 | 0.005 | 0.079 | gw-r/thread-42/journal/page | none observed |
| 8c5a24651018279200000000000001ea | 799.803 | 5.594 | n/a | 0.000 | 0.000 | 3.068 | 790.951 | 0.013 | n/a | 0.048 | 0.000 | n/a | n/a | 0.129 | 5.594 | 0.007 | 0.129 | gw-r/thread-44/journal/page | none observed |
| 8c5a2465101827920000000000000201 | 670.744 | 3.012 | n/a | 0.000 | 0.000 | 0.907 | 666.531 | 0.006 | n/a | 0.144 | 0.000 | n/a | n/a | 0.143 | 3.012 | 0.004 | 0.143 | gw-r/thread-45/journal/page | none observed |
| 8c5a2465101827920000000000000211 | 635.475 | 3.496 | n/a | 0.000 | 0.000 | 0.622 | 631.073 | 0.127 | n/a | 0.026 | 0.000 | n/a | n/a | 0.132 | 3.496 | 0.006 | 0.132 | gw-r/thread-47/journal/page | none observed |
| 8c5a2465101827920000000000000204 | 617.498 | 4.584 | n/a | 0.000 | 0.000 | 0.812 | 611.939 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.097 | 4.584 | 0.007 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 8c5a24651018279200000000000001f0 | 608.552 | 2.584 | n/a | 0.000 | 0.000 | 0.607 | 605.203 | 0.012 | n/a | 0.049 | 0.000 | n/a | n/a | 0.097 | 2.584 | 0.004 | 0.097 | gw-r/thread-42/journal/page | none observed |
| 8c5a24651018279200000000000001df | 591.055 | 3.974 | n/a | 0.000 | 0.000 | 1.063 | 585.767 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.160 | 3.974 | 0.007 | 0.160 | gw-r/thread-44/journal/page | none observed |
| 8c5a24651018279200000000000001f2 | 584.063 | 1.855 | n/a | 0.000 | 0.000 | 0.640 | 581.421 | 0.018 | n/a | 0.062 | 0.000 | n/a | n/a | 0.068 | 1.855 | 0.003 | 0.068 | gw-r/thread-49/journal/page | none observed |
| 8c5a24651018279200000000000001e5 | 498.949 | 3.277 | n/a | 0.000 | 0.000 | 0.559 | 494.902 | 0.021 | n/a | 0.091 | 0.000 | n/a | n/a | 0.100 | 3.277 | 0.007 | 0.100 | gw-r/thread-67/journal/page | none observed |
| 8c5a24651018279200000000000001dd | 497.532 | 5.428 | n/a | 0.000 | 0.000 | 0.769 | 491.122 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.166 | 5.428 | 0.011 | 0.166 | gw-r/thread-49/journal/page | none observed |
| 8c5a24651018279200000000000001dc | 495.731 | 5.234 | n/a | 0.000 | 0.000 | 0.759 | 489.492 | 0.018 | n/a | 0.119 | 0.000 | n/a | n/a | 0.110 | 5.234 | 0.011 | 0.110 | gw-r/thread-45/journal/page | none observed |

## P3 / L1024 / internal (745 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.965 | n/a | n/a | n/a | 3.750 | n/a | 0.000 | 0.000 | 0.291 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.218 | 3.750 | 0.308 | 6.218 |
| p99 | 250.821 | n/a | n/a | n/a | 17.344 | n/a | 1.167 | 0.000 | 1.245 | 245.428 | 0.168 | n/a | 0.059 | 0.000 | n/a | n/a | 47.656 | 19.118 | 0.825 | 47.656 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8c5a2465101827920000000000000227 | 967.594 | 4.253 | n/a | 0.000 | 0.000 | 2.793 | 960.387 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.118 | 4.253 | 0.004 | 0.118 | gw-r/thread-42/journal/page | none observed |
| 8c5a2465101827920000000000000228 | 760.513 | 3.807 | n/a | 0.000 | 0.000 | 0.818 | 755.594 | 0.149 | n/a | 0.052 | 0.000 | n/a | n/a | 0.094 | 3.807 | 0.005 | 0.094 | gw-r/thread-42/journal/page | none observed |
| 8c5a246510182792000000000000021c | 672.290 | 3.172 | n/a | 0.000 | 0.000 | 1.048 | 667.795 | 0.013 | n/a | 0.092 | 0.000 | n/a | n/a | 0.171 | 3.172 | 0.005 | 0.171 | gw-r/thread-45/journal/page | none observed |
| 8c5a2465101827920000000000000224 | 604.883 | 3.277 | n/a | 0.000 | 0.000 | 0.617 | 600.625 | 0.171 | n/a | 0.058 | 0.000 | n/a | n/a | 0.134 | 3.277 | 0.005 | 0.134 | gw-r/thread-44/journal/page | none observed |
| 8c5a246510182792000000000000021f | 562.794 | 5.724 | n/a | 0.000 | 0.000 | 0.567 | 556.301 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.151 | 5.724 | 0.010 | 0.151 | gw-r/thread-44/journal/page | none observed |
| 8c5a2465101827920000000000000225 | 405.491 | 3.658 | n/a | 0.000 | 0.000 | 0.688 | 400.976 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.098 | 3.658 | 0.009 | 0.098 | gw-r/thread-42/journal/page | none observed |
| 8c5a246510182792000000000000021d | 279.951 | 4.759 | n/a | 0.000 | 0.000 | 0.691 | 274.318 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.124 | 4.759 | 0.017 | 0.124 | gw-r/thread-46/journal/page | none observed |
| 8c5a2465101827920000000000000220 | 250.821 | 4.276 | n/a | 0.000 | 0.000 | 0.918 | 245.428 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.114 | 4.276 | 0.017 | 0.114 | gw-r/thread-44/journal/page | none observed |
| 8c5a2465101827920000000000000222 | 185.237 | 3.329 | n/a | 0.000 | 0.000 | 0.830 | 180.740 | 0.149 | n/a | 0.048 | 0.000 | n/a | n/a | 0.141 | 3.329 | 0.018 | 0.141 | gw-r/thread-49/journal/page | none observed |
| 8c5a24651018279200000000000004e9 | 106.530 | 5.641 | n/a | 0.000 | 0.000 | 0.409 | 100.336 | 0.007 | n/a | 0.027 | 0.000 | n/a | n/a | 0.110 | 5.641 | 0.053 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 8c5a246510182792000000000000030e | 100.642 | 2.404 | n/a | 0.000 | 0.000 | 1.021 | 97.107 | 0.003 | n/a | 0.011 | 0.000 | n/a | n/a | 0.096 | 2.404 | 0.024 | 0.096 | gw-r/thread-46/journal/page | none observed |
| 8c5a246510182792000000000000055b | 94.750 | 16.437 | n/a | 0.000 | 0.000 | 0.895 | 76.309 | 0.268 | n/a | 0.040 | 0.000 | n/a | n/a | 0.802 | 16.437 | 0.173 | 0.802 | gw-r/thread-47/journal/page | none observed |
| 8c5a2465101827920000000000000749 | 90.717 | 3.882 | n/a | 0.000 | 0.000 | 0.365 | 86.362 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.084 | 3.882 | 0.043 | 0.084 | gw-r/thread-46/journal/page | none observed |
| 8c5a246510182792000000000000065a | 89.356 | 5.977 | n/a | 0.000 | 0.000 | 0.737 | 82.520 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.081 | 5.977 | 0.067 | 0.081 | gw-r/thread-46/journal/page | none observed |
| 8c5a246510182792000000000000078e | 88.898 | 3.105 | n/a | 0.000 | 0.000 | 0.539 | 84.949 | 0.168 | n/a | 0.028 | 0.000 | n/a | n/a | 0.108 | 3.105 | 0.035 | 0.108 | gw-r/thread-47/journal/page | none observed |
| 8c5a2465101827920000000000000630 | 85.485 | 2.051 | n/a | 0.000 | 0.000 | 0.908 | 82.350 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.105 | 2.051 | 0.024 | 0.105 | gw-r/thread-44/journal/page | none observed |
| 8c5a2465101827920000000000000602 | 85.446 | 14.800 | n/a | 0.000 | 0.000 | 1.549 | 67.898 | 0.156 | n/a | 0.023 | 0.000 | n/a | n/a | 1.021 | 14.800 | 0.173 | 1.021 | gw-r/thread-67/journal/page | none observed |
| 8c5a246510182792000000000000046c | 82.780 | 4.557 | n/a | 0.000 | 0.000 | 0.716 | 77.421 | 0.002 | n/a | 0.013 | 0.000 | n/a | n/a | 0.071 | 4.557 | 0.055 | 0.071 | gw-r/thread-46/journal/page | none observed |
| 8c5a2465101827920000000000000493 | 81.241 | 9.570 | n/a | 1.167 | 0.000 | 0.653 | 69.590 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.202 | 10.738 | 0.132 | 0.202 | gw-r/thread-49/journal/page | none observed |
| 8c5a2465101827920000000000000754 | 78.861 | 1.617 | n/a | 0.000 | 0.000 | 0.409 | 76.733 | 0.003 | n/a | 0.011 | 0.000 | n/a | n/a | 0.089 | 1.617 | 0.021 | 0.089 | gw-r/thread-42/journal/page | none observed |

## P3 / tail / internal (2199 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.119 | n/a | n/a | n/a | 4.552 | n/a | 0.000 | 0.000 | 0.271 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.911 | 4.573 | 0.378 | 5.911 |
| p99 | 336.178 | n/a | n/a | n/a | 24.450 | n/a | 2.027 | 0.000 | 2.230 | 333.659 | 0.143 | n/a | 0.051 | 0.000 | n/a | n/a | 47.845 | 25.071 | 0.841 | 47.845 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8c5a2465101827920000000000001a79 | 1002.655 | 0.112 | n/a | 0.000 | 0.000 | 0.491 | 1000.880 | 0.014 | n/a | 0.064 | 0.000 | n/a | n/a | 1.095 | 0.112 | 0.000 | 1.095 | gw-r/thread-44/journal/page | none observed |
| 8c5a2465101827920000000000001a2c | 1002.519 | 0.117 | n/a | 0.000 | 0.000 | 0.485 | 1000.744 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 1.097 | 0.117 | 0.000 | 1.097 | gw-r/thread-49/journal/page | none observed |
| 8c5a2465101827920000000000001a52 | 1002.120 | 0.105 | n/a | 0.000 | 0.000 | 0.335 | 1000.538 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 1.097 | 0.105 | 0.000 | 1.097 | gw-r/thread-49/journal/page | none observed |
| 8c5a2465101827920000000000001a2b | 994.891 | 2.391 | n/a | 0.000 | 0.000 | 0.340 | 992.038 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.068 | 2.391 | 0.002 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 8c5a2465101827920000000000001a36 | 994.863 | 3.929 | n/a | 0.000 | 0.000 | 0.455 | 990.280 | 0.093 | n/a | 0.045 | 0.000 | n/a | n/a | 0.062 | 3.929 | 0.004 | 0.062 | gw-r/thread-67/journal/page | none observed |
| 8c5a2465101827920000000000001a71 | 993.089 | 2.440 | n/a | 0.000 | 0.000 | 0.438 | 990.060 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.086 | 2.440 | 0.002 | 0.086 | gw-r/thread-46/journal/page | none observed |
| 8c5a2465101827920000000000001a4f | 957.386 | 14.998 | n/a | 1.449 | 0.000 | 0.650 | 939.772 | 0.173 | n/a | 0.039 | 0.000 | n/a | n/a | 0.305 | 16.447 | 0.017 | 0.305 | gw-r/thread-42/journal/page | none observed |
| 8c5a2465101827920000000000001a75 | 952.139 | 2.576 | n/a | 0.000 | 0.000 | 1.319 | 947.794 | 0.318 | n/a | 0.055 | 0.000 | n/a | n/a | 0.077 | 2.576 | 0.003 | 0.077 | gw-r/thread-42/journal/page | none observed |
| 8c5a2465101827920000000000001a6a | 786.504 | 2.909 | n/a | 0.000 | 0.000 | 2.712 | 780.331 | 0.420 | n/a | 0.048 | 0.000 | n/a | n/a | 0.084 | 2.909 | 0.004 | 0.084 | gw-r/thread-47/journal/page | none observed |
| 8c5a2465101827920000000000001a60 | 709.850 | 5.278 | n/a | 0.000 | 0.000 | 3.551 | 700.607 | 0.285 | n/a | 0.049 | 0.000 | n/a | n/a | 0.080 | 5.278 | 0.007 | 0.080 | gw-r/thread-47/journal/page | none observed |
| 8c5a2465101827920000000000001a4b | 706.720 | 2.515 | n/a | 0.000 | 0.000 | 0.505 | 703.453 | 0.090 | n/a | 0.041 | 0.000 | n/a | n/a | 0.117 | 2.515 | 0.004 | 0.117 | gw-r/thread-42/journal/page | none observed |
| 8c5a2465101827920000000000001a40 | 702.255 | 12.369 | n/a | 0.000 | 0.000 | 0.818 | 688.682 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.339 | 12.369 | 0.018 | 0.339 | gw-r/thread-45/journal/page | none observed |
| 8c5a2465101827920000000000001a46 | 692.646 | 6.784 | n/a | 1.280 | 0.000 | 0.707 | 683.588 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.249 | 8.063 | 0.012 | 0.249 | gw-r/thread-45/journal/page | none observed |
| 8c5a2465101827920000000000001a31 | 661.244 | 4.168 | n/a | 0.000 | 0.000 | 0.580 | 656.314 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.127 | 4.168 | 0.006 | 0.127 | gw-r/thread-45/journal/page | none observed |
| 8c5a2465101827920000000000001a2e | 614.636 | 13.615 | n/a | 0.000 | 0.000 | 7.315 | 593.171 | 0.182 | n/a | 0.053 | 0.000 | n/a | n/a | 0.300 | 13.615 | 0.022 | 0.300 | gw-r/thread-49/journal/page | none observed |
| 8c5a2465101827920000000000001a72 | 506.009 | 2.810 | n/a | 0.000 | 0.000 | 0.531 | 502.196 | 0.334 | n/a | 0.058 | 0.000 | n/a | n/a | 0.080 | 2.810 | 0.006 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 8c5a2465101827920000000000001a73 | 496.130 | 2.474 | n/a | 0.000 | 0.000 | 0.660 | 492.864 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.058 | 2.474 | 0.005 | 0.058 | gw-r/thread-46/journal/page | none observed |
| 8c5a2465101827920000000000001a6d | 456.920 | 2.204 | n/a | 0.000 | 0.000 | 0.523 | 454.097 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.060 | 2.204 | 0.005 | 0.060 | gw-r/thread-67/journal/page | none observed |
| 8c5a2465101827920000000000001a65 | 434.106 | 2.682 | n/a | 0.000 | 0.000 | 0.542 | 430.746 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.096 | 2.682 | 0.006 | 0.096 | gw-r/thread-49/journal/page | none observed |
| 8c5a2465101827920000000000001a30 | 394.857 | 4.864 | n/a | 0.000 | 0.000 | 0.670 | 389.044 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.230 | 4.864 | 0.012 | 0.230 | gw-r/thread-42/journal/page | none observed |

## P3 / warmup / read (72 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.358 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.995 | 200.980 | 0.022 | n/a | 0.156 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 |
| p99 | 204.607 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.911 | 202.350 | 2.906 | n/a | 3.132 | 0.000 | n/a | n/a | 0.697 | 0.000 | 0.000 | 0.697 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4f51d385cbb41520000000000000008 | 204.607 | 0.000 | n/a | 0.000 | 0.000 | 1.697 | 202.350 | 0.043 | n/a | 0.251 | 0.000 | n/a | n/a | 0.265 | 0.000 | 0.000 | 0.265 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb41520000000000000009 | 204.378 | 0.000 | n/a | 0.000 | 0.000 | 2.331 | 201.132 | 0.024 | n/a | 0.194 | 0.000 | n/a | n/a | 0.697 | 0.000 | 0.000 | 0.697 | gw-r/thread-47/journal/page | none observed |
| c4f51d385cbb4152000000000000001f | 204.143 | 0.000 | n/a | 0.000 | 0.000 | 2.911 | 200.897 | 0.017 | n/a | 0.157 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb41520000000000000031 | 203.876 | 0.000 | n/a | 0.000 | 0.000 | 1.844 | 201.645 | 0.032 | n/a | 0.207 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb4152000000000000000b | 203.861 | 0.000 | n/a | 0.000 | 0.000 | 0.803 | 201.955 | 0.035 | n/a | 0.921 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb41520000000000000041 | 203.858 | 0.000 | n/a | 0.000 | 0.000 | 1.062 | 202.228 | 0.067 | n/a | 0.308 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb41520000000000000022 | 203.477 | 0.000 | n/a | 0.000 | 0.000 | 1.165 | 201.701 | 0.063 | n/a | 0.307 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb4152000000000000000c | 203.359 | 0.000 | n/a | 0.000 | 0.000 | 1.132 | 201.762 | 0.045 | n/a | 0.227 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb41520000000000000023 | 203.347 | 0.000 | n/a | 0.000 | 0.000 | 1.224 | 201.616 | 0.036 | n/a | 0.222 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb4152000000000000001b | 203.298 | 0.000 | n/a | 0.000 | 0.000 | 1.011 | 201.713 | 0.023 | n/a | 0.397 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb41520000000000000030 | 203.286 | 0.000 | n/a | 0.000 | 0.000 | 1.122 | 201.738 | 0.029 | n/a | 0.249 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-47/journal/page | none observed |
| c4f51d385cbb41520000000000000027 | 203.280 | 0.000 | n/a | 0.000 | 0.000 | 1.439 | 201.104 | 0.016 | n/a | 0.290 | 0.000 | n/a | n/a | 0.431 | 0.000 | 0.000 | 0.431 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb41520000000000000059 | 203.099 | 0.000 | n/a | 0.000 | 0.000 | 1.161 | 201.582 | 0.078 | n/a | 0.156 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-48/journal/page | none observed |
| c4f51d385cbb4152000000000000002d | 202.985 | 0.000 | n/a | 0.000 | 0.000 | 0.987 | 201.610 | 0.022 | n/a | 0.213 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb41520000000000000037 | 202.959 | 0.000 | n/a | 0.000 | 0.000 | 1.013 | 201.124 | 0.016 | n/a | 0.156 | 0.000 | n/a | n/a | 0.650 | 0.000 | 0.000 | 0.650 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb4152000000000000003f | 202.879 | 0.000 | n/a | 0.000 | 0.000 | 1.175 | 201.465 | 0.015 | n/a | 0.110 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb41520000000000000012 | 202.798 | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 201.639 | 0.073 | n/a | 0.284 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb4152000000000000004e | 202.688 | 0.000 | n/a | 0.000 | 0.000 | 1.018 | 201.338 | 0.015 | n/a | 0.157 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb41520000000000000014 | 202.662 | 0.000 | n/a | 0.000 | 0.000 | 1.099 | 201.124 | 0.029 | n/a | 0.223 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb4152000000000000002b | 202.656 | 0.000 | n/a | 0.000 | 0.000 | 1.123 | 201.177 | 0.021 | n/a | 0.178 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.187 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.869 | 201.008 | 0.021 | n/a | 0.131 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 |
| p99 | 212.059 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.578 | 205.093 | 4.549 | n/a | 0.468 | 0.000 | n/a | n/a | 0.852 | 0.000 | 0.000 | 0.852 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4f51d385cbb41520000000000000077 | 212.059 | 0.000 | n/a | 0.000 | 0.000 | 7.578 | 204.153 | 0.023 | n/a | 0.163 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb415200000000000000a8 | 209.349 | 0.000 | n/a | 0.000 | 0.000 | 4.156 | 204.851 | 0.031 | n/a | 0.157 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb4152000000000000008f | 208.654 | 0.000 | n/a | 0.000 | 0.000 | 3.063 | 205.093 | 0.017 | n/a | 0.148 | 0.000 | n/a | n/a | 0.332 | 0.000 | 0.000 | 0.332 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb415200000000000000b4 | 207.688 | 0.000 | n/a | 0.000 | 0.000 | 2.815 | 203.317 | 0.235 | n/a | 0.468 | 0.000 | n/a | n/a | 0.852 | 0.000 | 0.000 | 0.852 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb415200000000000000a5 | 204.682 | 0.000 | n/a | 0.000 | 0.000 | 3.432 | 200.897 | 0.030 | n/a | 0.133 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb4152000000000000006f | 203.640 | 0.000 | n/a | 0.000 | 0.000 | 1.106 | 202.083 | 0.023 | n/a | 0.158 | 0.000 | n/a | n/a | 0.270 | 0.000 | 0.000 | 0.270 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb41520000000000000075 | 203.601 | 0.000 | n/a | 0.000 | 0.000 | 1.747 | 201.544 | 0.014 | n/a | 0.164 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb415200000000000000b5 | 203.244 | 0.000 | n/a | 0.000 | 0.000 | 1.107 | 201.584 | 0.043 | n/a | 0.326 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb41520000000000000065 | 203.120 | 0.000 | n/a | 0.000 | 0.000 | 1.111 | 201.527 | 0.038 | n/a | 0.227 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb4152000000000000007e | 203.115 | 0.000 | n/a | 0.000 | 0.000 | 1.166 | 201.518 | 0.023 | n/a | 0.208 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb41520000000000000087 | 203.102 | 0.000 | n/a | 0.000 | 0.000 | 1.423 | 201.304 | 0.017 | n/a | 0.131 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb415200000000000000c2 | 202.969 | 0.000 | n/a | 0.000 | 0.000 | 1.181 | 201.396 | 0.022 | n/a | 0.219 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-48/journal/page | none observed |
| c4f51d385cbb4152000000000000009b | 202.899 | 0.000 | n/a | 0.000 | 0.000 | 1.114 | 201.460 | 0.022 | n/a | 0.171 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| c4f51d385cbb4152000000000000007d | 202.855 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 201.515 | 0.029 | n/a | 0.181 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb415200000000000000b3 | 202.828 | 0.000 | n/a | 0.000 | 0.000 | 0.902 | 201.450 | 0.059 | n/a | 0.147 | 0.000 | n/a | n/a | 0.270 | 0.000 | 0.000 | 0.270 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb415200000000000000a9 | 202.696 | 0.000 | n/a | 0.000 | 0.000 | 0.954 | 201.373 | 0.046 | n/a | 0.128 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-47/journal/page | none observed |
| c4f51d385cbb4152000000000000006d | 202.688 | 0.000 | n/a | 0.000 | 0.000 | 1.133 | 201.214 | 0.015 | n/a | 0.147 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb415200000000000000a6 | 202.668 | 0.000 | n/a | 0.000 | 0.000 | 1.070 | 201.270 | 0.046 | n/a | 0.115 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb41520000000000000063 | 202.657 | 0.000 | n/a | 0.000 | 0.000 | 1.297 | 201.041 | 0.036 | n/a | 0.112 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb41520000000000000069 | 202.638 | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 201.533 | 0.025 | n/a | 0.193 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-67/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.990 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 200.999 | 0.011 | n/a | 0.097 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 |
| p99 | 203.901 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.800 | 201.875 | 7.207 | n/a | 0.229 | 0.000 | n/a | n/a | 0.408 | 0.000 | 0.000 | 0.408 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4f51d385cbb41520000000000000109 | 203.901 | 0.000 | n/a | 0.000 | 0.000 | 1.800 | 201.533 | 0.014 | n/a | 0.146 | 0.000 | n/a | n/a | 0.408 | 0.000 | 0.000 | 0.408 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb4152000000000000010d | 203.853 | 0.000 | n/a | 0.000 | 0.000 | 1.575 | 201.783 | 0.026 | n/a | 0.148 | 0.000 | n/a | n/a | 0.321 | 0.000 | 0.000 | 0.321 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb4152000000000000012b | 203.414 | 0.000 | n/a | 0.000 | 0.000 | 1.433 | 201.555 | 0.019 | n/a | 0.229 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb4152000000000000010b | 203.137 | 0.000 | n/a | 0.000 | 0.000 | 1.056 | 201.778 | 0.020 | n/a | 0.159 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb4152000000000000011b | 203.091 | 0.000 | n/a | 0.000 | 0.000 | 0.953 | 201.875 | 0.010 | n/a | 0.106 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb415200000000000000ea | 202.939 | 0.000 | n/a | 0.000 | 0.000 | 1.023 | 201.518 | 0.013 | n/a | 0.155 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-48/journal/page | none observed |
| c4f51d385cbb4152000000000000012a | 202.910 | 0.000 | n/a | 0.000 | 0.000 | 0.955 | 201.670 | 0.019 | n/a | 0.115 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb415200000000000000fc | 202.830 | 0.000 | n/a | 0.000 | 0.000 | 1.157 | 201.297 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.259 | 0.000 | 0.000 | 0.259 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb415200000000000000d3 | 202.751 | 0.000 | n/a | 0.000 | 0.000 | 1.030 | 201.357 | 0.017 | n/a | 0.096 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-48/journal/page | none observed |
| c4f51d385cbb415200000000000000d1 | 202.711 | 0.000 | n/a | 0.000 | 0.000 | 1.132 | 201.298 | 0.008 | n/a | 0.144 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-48/journal/page | none observed |
| c4f51d385cbb415200000000000000e3 | 202.684 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 201.496 | 0.046 | n/a | 0.138 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb415200000000000000db | 202.620 | 0.000 | n/a | 0.000 | 0.000 | 1.140 | 201.161 | 0.008 | n/a | 0.104 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb4152000000000000010a | 202.585 | 0.000 | n/a | 0.000 | 0.000 | 0.688 | 201.576 | 0.015 | n/a | 0.169 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb4152000000000000010e | 202.568 | 0.000 | n/a | 0.000 | 0.000 | 0.912 | 201.304 | 0.021 | n/a | 0.139 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb415200000000000000c9 | 202.537 | 0.000 | n/a | 0.000 | 0.000 | 1.020 | 201.262 | 0.011 | n/a | 0.105 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb415200000000000000e6 | 202.498 | 0.000 | n/a | 0.000 | 0.000 | 1.057 | 201.249 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb41520000000000000121 | 202.492 | 0.000 | n/a | 0.000 | 0.000 | 1.183 | 200.985 | 0.022 | n/a | 0.097 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb415200000000000000df | 202.484 | 0.000 | n/a | 0.000 | 0.000 | 0.918 | 201.293 | 0.022 | n/a | 0.125 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb415200000000000000da | 202.483 | 0.000 | n/a | 0.000 | 0.000 | 0.905 | 201.239 | 0.009 | n/a | 0.122 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb415200000000000000e2 | 202.481 | 0.000 | n/a | 0.000 | 0.000 | 0.537 | 201.576 | 0.033 | n/a | 0.210 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.876 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 200.886 | 0.008 | n/a | 0.071 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 |
| p99 | 203.735 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.719 | 202.842 | 0.520 | n/a | 0.163 | 0.000 | n/a | n/a | 0.439 | 0.000 | 0.000 | 0.439 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4f51d385cbb41520000000000000180 | 203.735 | 0.000 | n/a | 0.000 | 0.000 | 1.821 | 201.344 | 0.010 | n/a | 0.119 | 0.000 | n/a | n/a | 0.439 | 0.000 | 0.000 | 0.439 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb4152000000000000013f | 203.693 | 0.000 | n/a | 0.000 | 0.000 | 0.648 | 202.842 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb4152000000000000012d | 203.577 | 0.000 | n/a | 0.000 | 0.000 | 1.311 | 201.882 | 0.009 | n/a | 0.097 | 0.000 | n/a | n/a | 0.280 | 0.000 | 0.000 | 0.280 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb4152000000000000015f | 202.693 | 0.000 | n/a | 0.000 | 0.000 | 1.143 | 201.216 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb4152000000000000018c | 202.658 | 0.000 | n/a | 0.000 | 0.000 | 0.776 | 201.544 | 0.013 | n/a | 0.154 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb4152000000000000017c | 202.611 | 0.000 | n/a | 0.000 | 0.000 | 1.048 | 201.258 | 0.013 | n/a | 0.102 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb4152000000000000014e | 202.596 | 0.000 | n/a | 0.000 | 0.000 | 1.393 | 200.870 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.260 | 0.000 | 0.000 | 0.260 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb4152000000000000013b | 202.516 | 0.000 | n/a | 0.000 | 0.000 | 0.831 | 201.448 | 0.024 | n/a | 0.104 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb4152000000000000015e | 202.509 | 0.000 | n/a | 0.000 | 0.000 | 0.636 | 201.500 | 0.029 | n/a | 0.103 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb41520000000000000150 | 202.453 | 0.000 | n/a | 0.000 | 0.000 | 0.875 | 201.325 | 0.012 | n/a | 0.123 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb41520000000000000138 | 202.448 | 0.000 | n/a | 0.000 | 0.000 | 1.040 | 201.128 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb41520000000000000163 | 202.430 | 0.000 | n/a | 0.000 | 0.000 | 1.003 | 201.181 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb4152000000000000016f | 202.400 | 0.000 | n/a | 0.000 | 0.000 | 0.778 | 201.215 | 0.044 | n/a | 0.106 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb41520000000000000157 | 202.381 | 0.000 | n/a | 0.000 | 0.000 | 1.008 | 201.086 | 0.007 | n/a | 0.084 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-47/journal/page | none observed |
| c4f51d385cbb41520000000000000175 | 202.369 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 201.230 | 0.009 | n/a | 0.121 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb4152000000000000018e | 202.357 | 0.000 | n/a | 0.000 | 0.000 | 0.641 | 201.473 | 0.011 | n/a | 0.109 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb4152000000000000018b | 202.319 | 0.000 | n/a | 0.000 | 0.000 | 0.657 | 201.365 | 0.026 | n/a | 0.134 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb41520000000000000146 | 202.319 | 0.000 | n/a | 0.000 | 0.000 | 0.744 | 201.227 | 0.019 | n/a | 0.099 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-47/journal/page | none observed |
| c4f51d385cbb41520000000000000151 | 202.317 | 0.000 | n/a | 0.000 | 0.000 | 0.770 | 201.290 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb41520000000000000193 | 202.304 | 0.000 | n/a | 0.000 | 0.000 | 0.965 | 201.051 | 0.008 | n/a | 0.076 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-67/journal/page | none observed |

## P3 / L64 / read (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.756 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.735 | 200.878 | 0.011 | n/a | 0.072 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 |
| p99 | 203.187 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.925 | 201.565 | 3.699 | n/a | 0.170 | 0.000 | n/a | n/a | 0.520 | 0.000 | 0.000 | 0.520 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4f51d385cbb41520000000000000200 | 203.194 | 0.000 | n/a | 0.000 | 0.000 | 1.083 | 201.565 | 0.021 | n/a | 0.290 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb415200000000000001a5 | 203.187 | 0.000 | n/a | 0.000 | 0.000 | 2.050 | 200.896 | 0.009 | n/a | 0.078 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb415200000000000001fc | 203.178 | 0.000 | n/a | 0.000 | 0.000 | 1.248 | 201.700 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb415200000000000001f9 | 202.960 | 0.000 | n/a | 0.000 | 0.000 | 1.088 | 201.453 | 0.023 | n/a | 0.143 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb41520000000000000198 | 202.801 | 0.000 | n/a | 0.000 | 0.000 | 1.169 | 201.277 | 0.011 | n/a | 0.095 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb41520000000000000204 | 202.701 | 0.000 | n/a | 0.000 | 0.000 | 1.137 | 201.228 | 0.029 | n/a | 0.103 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb415200000000000001c7 | 202.646 | 0.000 | n/a | 0.000 | 0.000 | 0.881 | 201.441 | 0.017 | n/a | 0.128 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb41520000000000000203 | 202.613 | 0.000 | n/a | 0.000 | 0.000 | 0.735 | 201.518 | 0.036 | n/a | 0.168 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb415200000000000001ca | 202.611 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 201.365 | 0.010 | n/a | 0.096 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb415200000000000001b0 | 202.538 | 0.000 | n/a | 0.000 | 0.000 | 0.785 | 201.511 | 0.011 | n/a | 0.106 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb415200000000000001c2 | 202.498 | 0.000 | n/a | 0.000 | 0.000 | 1.035 | 201.120 | 0.016 | n/a | 0.104 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb415200000000000001eb | 202.458 | 0.000 | n/a | 0.000 | 0.000 | 0.929 | 201.288 | 0.012 | n/a | 0.108 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb415200000000000001d1 | 202.456 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 201.517 | 0.016 | n/a | 0.110 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| c4f51d385cbb415200000000000001ea | 202.401 | 0.000 | n/a | 0.000 | 0.000 | 1.035 | 201.047 | 0.008 | n/a | 0.092 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb415200000000000001e7 | 202.362 | 0.000 | n/a | 0.000 | 0.000 | 1.027 | 201.107 | 0.007 | n/a | 0.079 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb415200000000000001c6 | 202.329 | 0.000 | n/a | 0.000 | 0.000 | 0.706 | 201.338 | 0.045 | n/a | 0.077 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb415200000000000001c3 | 202.308 | 0.000 | n/a | 0.000 | 0.000 | 1.104 | 200.967 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb415200000000000001d8 | 202.304 | 0.000 | n/a | 0.000 | 0.000 | 0.601 | 201.442 | 0.034 | n/a | 0.096 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb415200000000000001bd | 202.260 | 0.000 | n/a | 0.000 | 0.000 | 0.715 | 201.309 | 0.011 | n/a | 0.111 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb415200000000000001a9 | 202.244 | 0.000 | n/a | 0.000 | 0.000 | 0.764 | 201.255 | 0.013 | n/a | 0.094 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.794 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.754 | 200.841 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 |
| p99 | 206.988 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.736 | 204.838 | 2.600 | n/a | 0.185 | 0.000 | n/a | n/a | 0.292 | 0.000 | 0.000 | 0.292 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4f51d385cbb41520000000000000218 | 234.698 | 0.000 | n/a | 0.000 | 0.000 | 0.837 | 233.550 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb41520000000000000250 | 206.988 | 0.000 | n/a | 0.000 | 0.000 | 0.992 | 204.838 | 0.036 | n/a | 0.757 | 0.000 | n/a | n/a | 0.364 | 0.000 | 0.000 | 0.364 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb4152000000000000021a | 206.736 | 0.000 | n/a | 0.000 | 0.000 | 4.144 | 202.331 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb4152000000000000020d | 204.241 | 0.000 | n/a | 0.000 | 0.000 | 1.736 | 202.143 | 0.014 | n/a | 0.132 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb41520000000000000251 | 203.249 | 0.000 | n/a | 0.000 | 0.000 | 1.076 | 201.865 | 0.018 | n/a | 0.133 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb4152000000000000020c | 202.824 | 0.000 | n/a | 0.000 | 0.000 | 1.223 | 201.262 | 0.012 | n/a | 0.150 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb4152000000000000023c | 202.773 | 0.000 | n/a | 0.000 | 0.000 | 0.773 | 201.675 | 0.034 | n/a | 0.122 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb41520000000000000221 | 202.708 | 0.000 | n/a | 0.000 | 0.000 | 0.558 | 201.871 | 0.013 | n/a | 0.127 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb4152000000000000022f | 202.622 | 0.000 | n/a | 0.000 | 0.000 | 0.829 | 201.477 | 0.025 | n/a | 0.185 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb4152000000000000023f | 202.587 | 0.000 | n/a | 0.000 | 0.000 | 1.245 | 201.112 | 0.013 | n/a | 0.087 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb4152000000000000020f | 202.587 | 0.000 | n/a | 0.000 | 0.000 | 1.061 | 201.264 | 0.007 | n/a | 0.090 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb41520000000000000229 | 202.586 | 0.000 | n/a | 0.000 | 0.000 | 0.890 | 201.442 | 0.015 | n/a | 0.112 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb41520000000000000231 | 202.512 | 0.000 | n/a | 0.000 | 0.000 | 0.810 | 201.334 | 0.016 | n/a | 0.126 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb41520000000000000259 | 202.417 | 0.000 | n/a | 0.000 | 0.000 | 0.671 | 201.395 | 0.025 | n/a | 0.109 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb41520000000000000246 | 202.389 | 0.000 | n/a | 0.000 | 0.000 | 0.877 | 201.279 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb41520000000000000223 | 202.350 | 0.000 | n/a | 0.000 | 0.000 | 0.776 | 201.322 | 0.017 | n/a | 0.118 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb41520000000000000237 | 202.269 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 201.020 | 0.022 | n/a | 0.096 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb4152000000000000021f | 202.239 | 0.000 | n/a | 0.000 | 0.000 | 0.873 | 201.146 | 0.008 | n/a | 0.094 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb4152000000000000023d | 202.202 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 201.191 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb4152000000000000027a | 202.188 | 0.000 | n/a | 0.000 | 0.000 | 0.819 | 201.086 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-49/journal/page | none observed |

## P3 / L1024 / read (66 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 69.242 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.624 | 68.422 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 |
| p99 | 222.461 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.247 | 221.731 | 3.112 | n/a | 0.144 | 0.000 | n/a | n/a | 50.196 | 0.000 | 0.000 | 50.196 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4f51d385cbb4152000000000000028b | 222.461 | 0.000 | n/a | 0.000 | 0.000 | 0.539 | 221.731 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb4152000000000000027c | 203.378 | 0.000 | n/a | 0.000 | 0.000 | 1.028 | 201.932 | 0.035 | n/a | 0.144 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb41520000000000000289 | 202.882 | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 201.667 | 0.013 | n/a | 0.130 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb41520000000000000288 | 202.847 | 0.000 | n/a | 0.000 | 0.000 | 1.194 | 201.304 | 0.017 | n/a | 0.106 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb41520000000000000292 | 202.594 | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 201.388 | 0.014 | n/a | 0.122 | 0.000 | n/a | n/a | 0.291 | 0.000 | 0.000 | 0.291 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb41520000000000000294 | 202.106 | 0.000 | n/a | 0.000 | 0.000 | 0.747 | 201.144 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb4152000000000000028e | 202.072 | 0.000 | n/a | 0.000 | 0.000 | 0.833 | 201.003 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb41520000000000000282 | 202.031 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 200.968 | 0.007 | n/a | 0.113 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb4152000000000000027d | 202.019 | 0.000 | n/a | 0.000 | 0.000 | 0.828 | 200.942 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb4152000000000000028f | 201.968 | 0.000 | n/a | 0.000 | 0.000 | 0.710 | 201.028 | 0.007 | n/a | 0.077 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb4152000000000000027e | 201.938 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 200.949 | 0.007 | n/a | 0.080 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb41520000000000000280 | 201.861 | 0.000 | n/a | 0.000 | 0.000 | 0.779 | 200.829 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb41520000000000000283 | 201.658 | 0.000 | n/a | 0.000 | 0.000 | 0.618 | 200.784 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb41520000000000000290 | 201.636 | 0.000 | n/a | 0.000 | 0.000 | 0.562 | 200.852 | 0.008 | n/a | 0.078 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb41520000000000000293 | 201.636 | 0.000 | n/a | 0.000 | 0.000 | 0.627 | 200.819 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-47/journal/page | none observed |
| c4f51d385cbb4152000000000000028d | 201.501 | 0.000 | n/a | 0.000 | 0.000 | 0.572 | 200.756 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb41520000000000000285 | 201.376 | 0.000 | n/a | 0.000 | 0.000 | 0.504 | 200.702 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb41520000000000000287 | 181.290 | 0.000 | n/a | 0.000 | 0.000 | 0.709 | 180.375 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb4152000000000000028a | 154.401 | 0.000 | n/a | 0.000 | 0.000 | 1.107 | 153.034 | 0.015 | n/a | 0.061 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb4152000000000000028c | 150.354 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 146.259 | 3.112 | n/a | 0.084 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-46/journal/page | none observed |

## P3 / tail / read (216 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 83.277 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.536 | 82.496 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 202.684 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.076 | 201.310 | 3.909 | n/a | 0.124 | 0.000 | n/a | n/a | 49.869 | 0.000 | 0.000 | 49.869 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4f51d385cbb41520000000000000e87 | 203.074 | 0.000 | n/a | 0.000 | 0.000 | 2.076 | 200.744 | 0.011 | n/a | 0.065 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb41520000000000000e34 | 202.888 | 0.000 | n/a | 0.000 | 0.000 | 1.247 | 201.310 | 0.017 | n/a | 0.118 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb41520000000000000e3d | 202.684 | 0.000 | n/a | 0.000 | 0.000 | 1.358 | 200.774 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.498 | 0.000 | 0.000 | 0.498 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb41520000000000000e75 | 202.498 | 0.000 | n/a | 0.000 | 0.000 | 0.735 | 201.478 | 0.015 | n/a | 0.135 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb41520000000000000e32 | 202.189 | 0.000 | n/a | 0.000 | 0.000 | 0.727 | 201.304 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb41520000000000000e7c | 202.084 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 200.998 | 0.007 | n/a | 0.071 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb41520000000000000e8f | 202.071 | 0.000 | n/a | 0.000 | 0.000 | 0.874 | 200.920 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb41520000000000000e6b | 202.024 | 0.000 | n/a | 0.000 | 0.000 | 0.429 | 201.349 | 0.019 | n/a | 0.086 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb41520000000000000e37 | 201.995 | 0.000 | n/a | 0.000 | 0.000 | 0.907 | 200.858 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-46/journal/page | none observed |
| c4f51d385cbb41520000000000000e3e | 201.992 | 0.000 | n/a | 0.000 | 0.000 | 1.053 | 200.653 | 0.005 | n/a | 0.064 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb41520000000000000e69 | 201.963 | 0.000 | n/a | 0.000 | 0.000 | 0.482 | 201.167 | 0.012 | n/a | 0.051 | 0.000 | n/a | n/a | 0.252 | 0.000 | 0.000 | 0.252 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb41520000000000000e67 | 201.922 | 0.000 | n/a | 0.000 | 0.000 | 0.586 | 201.015 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb41520000000000000e85 | 201.917 | 0.000 | n/a | 0.000 | 0.000 | 0.521 | 201.185 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-67/journal/page | none observed |
| c4f51d385cbb41520000000000000e8e | 201.910 | 0.000 | n/a | 0.000 | 0.000 | 0.874 | 200.790 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb41520000000000000e8d | 201.846 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 200.791 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb41520000000000000e76 | 201.841 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 200.831 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-45/journal/page | none observed |
| c4f51d385cbb41520000000000000e82 | 201.798 | 0.000 | n/a | 0.000 | 0.000 | 0.609 | 200.956 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-44/journal/page | none observed |
| c4f51d385cbb41520000000000000e7a | 201.765 | 0.000 | n/a | 0.000 | 0.000 | 0.728 | 200.785 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-42/journal/page | none observed |
| c4f51d385cbb41520000000000000e6d | 201.739 | 0.000 | n/a | 0.000 | 0.000 | 0.586 | 200.952 | 0.015 | n/a | 0.081 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| c4f51d385cbb41520000000000000e58 | 201.720 | 0.000 | n/a | 0.000 | 0.000 | 0.841 | 200.686 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-49/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
