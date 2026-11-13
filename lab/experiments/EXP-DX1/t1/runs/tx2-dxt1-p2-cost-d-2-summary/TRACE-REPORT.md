# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (189.772 ms, trace `cfc1e96bce8d4c960000000000000883`); `node-14/thread-0/driver.queue.scheduler-late` (127.874 ms, trace `cfc1e96bce8d4c960000000000001b5b`); `gw-w/thread-49/commit.prepare-and-validate` (200.178 ms, trace `cfc1e96bce8d4c960000000000000540`); `node-14/thread-0/socket.wait-first-byte` (120.513 ms, trace `cfc1e96bce8d4c960000000000001b5c`); `node-14/thread-0/socket.wait-first-byte` (124.176 ms, trace `cfc1e96bce8d4c960000000000001b5d`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p2-cost-d-2-summary`; source `b93872958321dadbd615ed359d84950571e7f982`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 7198751.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 254 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14568.527 | 973.587 | 53.664 | 311 |
| L1 | 0 | 19956.082 | 550.624 | 14.621 | 462 |
| L4 | 0 | 19974.042 | 460.953 | 16.650 | 426 |
| L16 | 0 | 19961.884 | 441.012 | 7.475 | 474 |
| L64 | 0 | 19970.276 | 504.320 | 8.862 | 610 |
| L256 | 0 | 19995.482 | 489.423 | 31.945 | 485 |
| L1024 | 0 | 19323.896 | 4559.335 | 135.002 | 12213 |
| tail | 0 | 64373.167 | 13914.957 | 601.865 | 37198 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| cfc1e96bce8d4c960000000000000883 | driver.queue.subject | 7.032 | cfc1e96bce8d4c96000000000000087d | 1 / 32 |
| cfc1e96bce8d4c960000000000000883 | driver.queue.scheduler-late | 0.469 | none | 1 / 32 |
| cfc1e96bce8d4c960000000000000883 | driver.queue.scheduler-dispatch | 0.094 | none | 0 / 32 |

Observed active steps while trace cfc1e96bce8d4c960000000000000883 waited: []

| cfc1e96bce8d4c960000000000001b5b | driver.queue.scheduler-late | 127.874 | none | 2 / 32 |
| cfc1e96bce8d4c960000000000001b5b | driver.queue.subject | 125.995 | cfc1e96bce8d4c960000000000001b5a | 2 / 32 |
| cfc1e96bce8d4c960000000000001b5b | driver.queue.scheduler-dispatch | 0.064 | none | 13 / 32 |

Observed active steps while trace cfc1e96bce8d4c960000000000001b5b waited: [{"at":1794567786626.5444,"inFlight":7,"capacity":32,"active":[{"traceId":"cfc1e96bce8d4c960000000000001b58","step":"client.http"},{"traceId":"cfc1e96bce8d4c960000000000001b5a","step":"client.http"},{"traceId":"cfc1e96bce8d4c960000000000001b5c","step":"client.http"},{"traceId":"cfc1e96bce8d4c960000000000001b5d","step":"client.http"},{"traceId":"cfc1e96bce8d4c960000000000001b5e","step":"client.http"},{"traceId":"cfc1e96bce8d4c960000000000001b5f","step":"client.http"},{"traceId":"cfc1e96bce8d4c960000000000001b61","step":"client.http"}]},{"at":1794567786733.5698,"inFlight":15,"capacity":32,"active":[{"traceId":"cfc1e96bce8d4c960000000000001b5a","step":"client.http"},{"traceId":"cfc1e96bce8d4c960000000000001b5c","step":"client.http"},{"traceId":"cfc1e96bce8d4c960000000000001b5d","step":"client.http"},{"traceId":"cfc1e96bce8d4c960000000000001b5e","step":"client.http"},{"traceId":"cfc1e96bce8d4c960000000000001b5f","step":"client.http"},{"traceId":"cfc1e96bce8d4c960000000000001b61","step":"client.http"},{"traceId":"cfc1e96bce8d4c960000000000001b62","step":"rpc.probe.transact"},{"traceId":"cfc1e96bce8d4c960000000000001b65","step":"client.http"},{"traceId":"cfc1e96bce8d4c960000000000001b67","step":"client.http"},{"traceId":"cfc1e96bce8d4c960000000000001b68","step":"client.http"},{"traceId":"cfc1e96bce8d4c960000000000001b69","step":"client.http"},{"traceId":"cfc1e96bce8d4c960000000000001b6b","step":"client.commit-send-queue"},{"traceId":"cfc1e96bce8d4c960000000000001b6c","step":"client.commit-send-queue"},{"traceId":"cfc1e96bce8d4c960000000000001b6d","step":"client.commit-send-queue"},{"traceId":"cfc1e96bce8d4c960000000000001b6e","step":"client.commit-send-queue"}]}]

| cfc1e96bce8d4c960000000000000540 | driver.queue.scheduler-dispatch | 0.080 | none | 0 / 32 |
| cfc1e96bce8d4c960000000000000540 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace cfc1e96bce8d4c960000000000000540 waited: []

| cfc1e96bce8d4c960000000000001b5c | driver.queue.scheduler-late | 113.473 | none | 2 / 32 |
| cfc1e96bce8d4c960000000000001b5c | driver.queue.scheduler-dispatch | 0.007 | none | 2 / 32 |

Observed active steps while trace cfc1e96bce8d4c960000000000001b5c waited: []

| cfc1e96bce8d4c960000000000001b5d | driver.queue.scheduler-late | 105.241 | none | 3 / 32 |
| cfc1e96bce8d4c960000000000001b5d | driver.queue.scheduler-dispatch | 0.024 | none | 3 / 32 |

Observed active steps while trace cfc1e96bce8d4c960000000000001b5d waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 45.103 | 1.493 | 0.000 | 2.354 | 7.580 | 0.235 | 0.000 | 0.271 | 1.818 | 11.446 | 0.055 | n/a | 0.752 | 21.724 | n/a | n/a | 0.059 | 8.534 | 0.241 | 0.059 |
| p99 | 185.616 | 25.822 | 0.453 | 26.784 | 46.197 | 22.073 | 3.542 | 1.132 | 6.874 | 144.781 | 0.368 | n/a | 6.620 | 36.506 | n/a | n/a | 0.472 | 53.205 | 0.576 | 0.472 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c960000000000000450 | 185.616 | 5.818 | 0.418 | 0.335 | 0.061 | 1.883 | 144.781 | 0.071 | n/a | 0.239 | 31.948 | n/a | n/a | 0.062 | 6.633 | 0.036 | 0.062 | gw-w/thread-44/gateway.admitted-work | none observed |
| cfc1e96bce8d4c960000000000000448 | 126.809 | 46.197 | 6.282 | 0.650 | 0.076 | 2.479 | 38.422 | 0.151 | n/a | 0.495 | 31.910 | n/a | n/a | 0.146 | 53.205 | 0.420 | 0.146 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000454 | 93.988 | 5.114 | 0.437 | 1.822 | 0.095 | 1.883 | 62.365 | 0.051 | n/a | 0.442 | 21.724 | n/a | n/a | 0.056 | 7.468 | 0.079 | 0.056 | gw-w/thread-49/gateway.admitted-work | none observed |
| cfc1e96bce8d4c960000000000000426 | 93.942 | 17.259 | 0.745 | 0.000 | 0.131 | 6.874 | 29.081 | 0.210 | n/a | 6.620 | 32.939 | n/a | n/a | 0.083 | 18.134 | 0.193 | 0.083 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000044c | 92.488 | 5.707 | 22.073 | 0.405 | 0.061 | 3.311 | 24.044 | 0.081 | n/a | 0.265 | 36.506 | n/a | n/a | 0.036 | 28.246 | 0.305 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000422 | 81.085 | 36.504 | 0.229 | 0.000 | 0.680 | 1.475 | 16.015 | 0.182 | n/a | 0.448 | 25.081 | n/a | n/a | 0.472 | 37.414 | 0.461 | 0.472 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000436 | 74.652 | 10.517 | 1.062 | 0.000 | 0.370 | 5.771 | 31.908 | 0.368 | n/a | 1.141 | 23.318 | n/a | n/a | 0.198 | 11.949 | 0.160 | 0.198 | gw-w/thread-49/gateway.admitted-work | none observed |
| cfc1e96bce8d4c960000000000000439 | 74.474 | 26.113 | 0.022 | 0.000 | 0.704 | 2.053 | 23.081 | 0.142 | n/a | 3.843 | 18.461 | n/a | n/a | 0.055 | 26.838 | 0.360 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000438 | 67.346 | 14.108 | 0.338 | 0.000 | 0.271 | 3.094 | 14.401 | 0.054 | n/a | 0.588 | 34.413 | n/a | n/a | 0.079 | 14.717 | 0.219 | 0.079 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000432 | 61.567 | 7.657 | 0.551 | 0.000 | 0.071 | 2.567 | 16.965 | 0.051 | n/a | 3.081 | 30.512 | n/a | n/a | 0.114 | 8.279 | 0.134 | 0.114 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000044a | 58.810 | 8.441 | 0.011 | 3.542 | 0.656 | 1.550 | 5.699 | 0.036 | n/a | 4.136 | 34.675 | n/a | n/a | 0.064 | 12.650 | 0.215 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000042e | 56.093 | 7.001 | 0.272 | 0.000 | 0.072 | 2.109 | 15.097 | 0.055 | n/a | 0.279 | 31.158 | n/a | n/a | 0.049 | 7.346 | 0.131 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000451 | 47.674 | 5.644 | 0.011 | 1.416 | 0.814 | 0.925 | 5.426 | 0.045 | n/a | 2.183 | 31.156 | n/a | n/a | 0.053 | 7.885 | 0.165 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000045a | 46.681 | 4.481 | 0.535 | 0.282 | 0.103 | 1.161 | 11.446 | 0.039 | n/a | 0.752 | 27.827 | n/a | n/a | 0.055 | 5.400 | 0.116 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000043e | 45.103 | 6.443 | 0.236 | 0.000 | 0.058 | 1.818 | 15.400 | 0.046 | n/a | 0.591 | 20.469 | n/a | n/a | 0.041 | 6.738 | 0.149 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000042a | 44.967 | 9.363 | 2.789 | 0.000 | 0.079 | 2.887 | 15.471 | 0.066 | n/a | 0.430 | 13.793 | n/a | n/a | 0.090 | 12.230 | 0.272 | 0.090 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000442 | 44.953 | 10.031 | 0.305 | 0.423 | 0.069 | 3.104 | 11.342 | 0.063 | n/a | 0.892 | 18.670 | n/a | n/a | 0.055 | 10.828 | 0.241 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.203ms |
| cfc1e96bce8d4c96000000000000045c | 44.901 | 6.421 | 0.235 | 0.845 | 0.106 | 3.810 | 16.360 | 0.057 | n/a | 0.358 | 16.659 | n/a | n/a | 0.050 | 7.607 | 0.169 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000042c | 41.385 | 10.515 | 0.006 | 0.000 | 0.559 | 0.927 | 1.590 | 0.028 | n/a | 1.663 | 25.991 | n/a | n/a | 0.106 | 11.079 | 0.268 | 0.106 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000433 | 39.391 | 9.207 | 0.006 | 0.000 | 0.561 | 1.136 | 2.477 | 0.034 | n/a | 0.680 | 25.225 | n/a | n/a | 0.065 | 9.774 | 0.248 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (87 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 80.457 | n/a | n/a | n/a | 22.463 | 21.957 | 0.000 | 0.000 | 0.191 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.032 | 53.656 | 0.783 | 0.032 |
| p99 | 408.578 | n/a | n/a | n/a | 72.518 | 124.527 | 32.563 | 0.000 | 193.082 | 213.968 | 216.903 | n/a | 0.346 | 0.000 | n/a | n/a | 168.636 | 181.906 | 1.000 | 168.636 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c960000000000000882 | 408.578 | 29.661 | 23.277 | 32.563 | 0.000 | 140.784 | 73.094 | 109.135 | n/a | 0.008 | 0.000 | n/a | n/a | 0.055 | 85.501 | 0.209 | 0.055 | node-14/thread-0/socket.queue-and-write | client.encode 10.272ms; driver.publication 8.011ms; driver.publication 6.566ms; driver.publication 5.315ms; driver.publication 4.370ms |
| cfc1e96bce8d4c960000000000000884 | 331.561 | 19.844 | 11.026 | 0.000 | 0.000 | 193.082 | 12.683 | 94.897 | n/a | 0.010 | 0.000 | n/a | n/a | 0.020 | 30.870 | 0.093 | 0.020 | node-14/thread-0/socket.queue-and-write | client.encode 10.272ms; driver.publication 8.011ms; driver.publication 6.566ms; driver.publication 5.315ms; driver.publication 4.370ms |
| cfc1e96bce8d4c96000000000000087b | 331.291 | 24.622 | 24.029 | 10.246 | 0.000 | 21.954 | 213.968 | 36.410 | n/a | 0.046 | 0.000 | n/a | n/a | 0.016 | 58.897 | 0.178 | 0.016 | gw-w/thread-45/gateway.admitted-work | client.encode 10.272ms; driver.publication 8.011ms; driver.publication 6.566ms; driver.publication 5.337ms; driver.publication 5.315ms |
| cfc1e96bce8d4c960000000000001b57 | 296.411 | 72.518 | 107.884 | 1.505 | 0.000 | 0.174 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 114.330 | 181.906 | 0.614 | 114.330 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.611ms; client.parse 1.501ms; driver.publication 1.326ms; driver.publication 1.140ms |
| cfc1e96bce8d4c960000000000001b50 | 274.907 | 19.347 | 7.812 | 0.000 | 0.000 | 186.922 | 15.069 | 45.736 | n/a | 0.003 | 0.000 | n/a | n/a | 0.019 | 27.159 | 0.099 | 0.019 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.381ms; driver.publication 1.611ms; client.parse 1.501ms; driver.publication 1.140ms |
| cfc1e96bce8d4c960000000000001b4f | 264.760 | 39.333 | 20.081 | 0.000 | 0.000 | 154.136 | 15.761 | 35.420 | n/a | 0.013 | 0.000 | n/a | n/a | 0.016 | 59.414 | 0.224 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.381ms; driver.publication 2.238ms; driver.publication 1.611ms; client.parse 1.501ms; driver.publication 1.140ms |
| cfc1e96bce8d4c96000000000000087f | 261.891 | 22.906 | 7.027 | 0.000 | 0.000 | 11.177 | 3.789 | 216.903 | n/a | 0.022 | 0.000 | n/a | n/a | 0.068 | 29.933 | 0.114 | 0.068 | gw-w/thread-46/gateway.admission-wait | client.encode 10.272ms; driver.publication 6.566ms; driver.publication 5.315ms; driver.publication 4.370ms; driver.publication 3.334ms |
| cfc1e96bce8d4c960000000000001b4d | 243.156 | 32.271 | 41.983 | 0.000 | 0.000 | 0.266 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 168.636 | 74.253 | 0.305 | 168.636 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 3.473ms; driver.publication 3.381ms; driver.publication 2.238ms; driver.publication 1.611ms; client.parse 1.501ms |
| cfc1e96bce8d4c960000000000001b4c | 197.089 | 60.628 | 73.861 | 0.000 | 0.000 | 1.918 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 60.682 | 134.489 | 0.682 | 60.682 | node-14/thread-0/rpc.replica.observe | driver.expected-state.bind-receipt 3.473ms; driver.publication 3.381ms; driver.publication 2.238ms; driver.publication 1.486ms; driver.publication 1.287ms |
| cfc1e96bce8d4c960000000000001585 | 155.322 | 27.181 | 18.551 | 0.000 | 0.000 | 85.942 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.648 | 45.731 | 0.294 | 23.648 | node-14/thread-0/socket.body-read | driver.publication 3.256ms; driver.expected-state.bind-receipt 1.164ms; client.parse 1.103ms; driver.publication 1.098ms |
| cfc1e96bce8d4c960000000000000f87 | 143.205 | 21.417 | 9.769 | 0.000 | 0.000 | 30.532 | 49.595 | 31.831 | n/a | 0.004 | 0.000 | n/a | n/a | 0.057 | 31.186 | 0.218 | 0.057 | gw-w/thread-64/gateway.response-write | client.parse 1.409ms; driver.publication 1.336ms |
| cfc1e96bce8d4c96000000000000088d | 141.962 | 56.215 | 84.243 | 1.482 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 141.941 | 1.000 | 0.021 | node-14/thread-0/rpc.replica.observe | driver.publication 8.011ms; driver.publication 6.566ms; driver.publication 4.370ms; driver.publication 2.538ms; driver.expected-state.bind-receipt 2.495ms |
| cfc1e96bce8d4c960000000000000f82 | 132.216 | 13.307 | 8.417 | 0.000 | 0.000 | 0.215 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 110.276 | 21.725 | 0.164 | 110.276 | node-14/thread-0/socket.wait-first-byte | client.parse 1.409ms; driver.publication 1.336ms; driver.publication 1.098ms |
| cfc1e96bce8d4c96000000000000088e | 132.047 | 56.562 | 73.983 | 1.482 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 132.027 | 1.000 | 0.021 | node-14/thread-0/rpc.replica.observe | driver.publication 8.011ms; driver.publication 4.370ms; driver.publication 2.538ms; driver.expected-state.bind-receipt 2.495ms; driver.expected-state.bind-receipt 1.325ms |
| cfc1e96bce8d4c96000000000000088f | 124.979 | 0.430 | 124.527 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 124.957 | 1.000 | 0.023 | node-14/thread-0/rpc.replica.observe | driver.publication 8.011ms; driver.publication 4.370ms; driver.expected-state.bind-receipt 1.325ms; driver.publication 1.205ms |
| cfc1e96bce8d4c96000000000000157f | 122.243 | 51.425 | 22.542 | 5.094 | 0.000 | 0.517 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.665 | 79.061 | 0.647 | 42.665 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.195ms; driver.publication 1.098ms |
| cfc1e96bce8d4c960000000000000f83 | 122.241 | 11.442 | 6.284 | 0.000 | 0.000 | 0.213 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 104.302 | 17.726 | 0.145 | 104.302 | node-14/thread-0/socket.wait-first-byte | client.parse 1.409ms; driver.publication 1.336ms; driver.publication 1.098ms |
| cfc1e96bce8d4c960000000000000602 | 120.030 | 36.990 | 13.349 | 2.734 | 0.000 | 1.441 | 65.432 | 0.010 | n/a | 0.042 | 0.000 | n/a | n/a | 0.032 | 53.072 | 0.442 | 0.032 | gw-w/thread-44/gateway.admitted-work | none observed |
| cfc1e96bce8d4c960000000000000f80 | 117.664 | 36.279 | 11.808 | 3.492 | 0.000 | 0.295 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 65.789 | 51.579 | 0.438 | 65.789 | node-14/thread-0/socket.wait-first-byte | client.parse 1.409ms; driver.publication 1.336ms; driver.publication 1.098ms; driver.publication 1.054ms |
| cfc1e96bce8d4c960000000000002038 | 115.834 | 11.776 | 48.826 | 0.000 | 0.000 | 0.049 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 55.183 | 60.602 | 0.523 | 55.183 | node-14/thread-0/socket.wait-first-byte | client.parse 1.500ms; client.parse 1.264ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.150 | 1.538 | 0.000 | 3.412 | 5.180 | 0.007 | 0.000 | 0.814 | 0.875 | 2.026 | 0.045 | n/a | 0.867 | 10.515 | n/a | n/a | 0.053 | 7.885 | 0.308 | 0.053 |
| p99 | 47.674 | 4.527 | 0.453 | 5.352 | 10.515 | 0.014 | 3.469 | 1.132 | 1.146 | 5.426 | 0.059 | n/a | 2.183 | 31.156 | n/a | n/a | 0.106 | 11.079 | 0.576 | 0.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c960000000000000451 | 47.674 | 5.644 | 0.011 | 1.416 | 0.814 | 0.925 | 5.426 | 0.045 | n/a | 2.183 | 31.156 | n/a | n/a | 0.053 | 7.885 | 0.165 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000042c | 41.385 | 10.515 | 0.006 | 0.000 | 0.559 | 0.927 | 1.590 | 0.028 | n/a | 1.663 | 25.991 | n/a | n/a | 0.106 | 11.079 | 0.268 | 0.106 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000445 | 28.611 | 5.109 | 0.005 | 0.000 | 1.125 | 0.796 | 2.015 | 0.059 | n/a | 0.380 | 19.071 | n/a | n/a | 0.052 | 6.238 | 0.218 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000428 | 24.500 | 7.580 | 0.014 | 0.000 | 0.889 | 1.146 | 2.026 | 0.038 | n/a | 0.914 | 11.815 | n/a | n/a | 0.078 | 8.483 | 0.346 | 0.078 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000044d | 23.150 | 3.926 | 0.008 | 3.469 | 1.132 | 1.005 | 2.139 | 0.049 | n/a | 0.867 | 10.515 | n/a | n/a | 0.042 | 8.534 | 0.369 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000443 | 21.042 | 5.003 | 0.005 | 0.000 | 0.852 | 0.875 | 3.433 | 0.055 | n/a | 0.973 | 9.804 | n/a | n/a | 0.041 | 5.861 | 0.279 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000458 | 17.457 | 7.671 | 0.006 | 1.707 | 0.677 | 0.735 | 1.421 | 0.029 | n/a | 0.212 | 4.940 | n/a | n/a | 0.059 | 10.061 | 0.576 | 0.059 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000430 | 16.797 | 4.464 | 0.007 | 0.000 | 0.704 | 0.846 | 2.062 | 0.045 | n/a | 0.789 | 7.809 | n/a | n/a | 0.071 | 5.175 | 0.308 | 0.071 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000456 | 14.363 | 5.180 | 0.011 | 1.626 | 0.659 | 0.606 | 0.980 | 0.028 | n/a | 0.229 | 5.012 | n/a | n/a | 0.031 | 7.476 | 0.521 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.020 | 0.761 | 0.000 | 1.606 | 5.604 | 0.019 | 0.348 | 0.199 | 1.597 | 8.303 | 0.059 | n/a | 0.645 | 15.948 | n/a | n/a | 0.056 | 6.811 | 0.196 | 0.056 |
| p99 | 101.833 | 6.605 | 0.929 | 9.207 | 18.208 | 1.996 | 5.366 | 4.641 | 6.696 | 32.964 | 0.127 | n/a | 5.363 | 66.019 | n/a | n/a | 0.336 | 21.827 | 0.524 | 0.336 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c96000000000000047c | 101.833 | 4.719 | 0.225 | 0.348 | 0.071 | 1.651 | 24.840 | 0.039 | n/a | 3.871 | 66.019 | n/a | n/a | 0.050 | 5.364 | 0.053 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000472 | 90.885 | 4.902 | 0.463 | 0.372 | 0.069 | 1.589 | 20.929 | 0.093 | n/a | 0.223 | 62.187 | n/a | n/a | 0.057 | 5.806 | 0.064 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000046a | 89.017 | 5.230 | 0.305 | 0.469 | 0.064 | 2.054 | 32.964 | 0.086 | n/a | 2.994 | 44.800 | n/a | n/a | 0.050 | 6.068 | 0.068 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000046c | 59.766 | 18.208 | 1.996 | 1.018 | 0.605 | 5.049 | 5.334 | 0.100 | n/a | 5.363 | 21.757 | n/a | n/a | 0.336 | 21.827 | 0.365 | 0.336 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000467 | 57.474 | 4.301 | 0.276 | 0.353 | 0.103 | 5.412 | 28.174 | 0.060 | n/a | 0.263 | 18.475 | n/a | n/a | 0.059 | 5.032 | 0.088 | 0.059 | gw-w/thread-49/gateway.admitted-work | none observed |
| cfc1e96bce8d4c960000000000000460 | 57.082 | 6.048 | 0.283 | 0.425 | 0.064 | 2.246 | 23.251 | 0.062 | n/a | 3.147 | 21.479 | n/a | n/a | 0.077 | 6.820 | 0.119 | 0.077 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000468 | 54.058 | 8.493 | 0.005 | 0.000 | 0.883 | 5.063 | 17.301 | 0.080 | n/a | 0.883 | 21.292 | n/a | n/a | 0.059 | 9.381 | 0.174 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000470 | 52.288 | 4.551 | 0.313 | 0.357 | 0.100 | 1.605 | 20.980 | 0.088 | n/a | 0.265 | 23.982 | n/a | n/a | 0.047 | 5.320 | 0.102 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000049e | 51.876 | 6.569 | 0.308 | 0.306 | 0.125 | 2.641 | 21.962 | 0.082 | n/a | 0.257 | 19.563 | n/a | n/a | 0.064 | 7.307 | 0.141 | 0.064 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000498 | 49.061 | 4.806 | 0.295 | 0.381 | 0.079 | 1.770 | 25.947 | 0.058 | n/a | 0.261 | 15.385 | n/a | n/a | 0.079 | 5.561 | 0.113 | 0.079 | gw-w/thread-45/gateway.admitted-work | none observed |
| cfc1e96bce8d4c96000000000000045e | 48.536 | 5.240 | 0.336 | 0.000 | 0.062 | 2.525 | 15.325 | 0.060 | n/a | 3.234 | 21.716 | n/a | n/a | 0.036 | 5.639 | 0.116 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000046d | 47.773 | 11.634 | 0.019 | 4.549 | 1.141 | 1.323 | 2.530 | 0.027 | n/a | 1.336 | 25.158 | n/a | n/a | 0.057 | 17.343 | 0.363 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004a2 | 44.094 | 6.360 | 0.297 | 0.488 | 0.073 | 1.462 | 15.720 | 0.048 | n/a | 0.263 | 19.328 | n/a | n/a | 0.056 | 7.217 | 0.164 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000474 | 43.612 | 4.023 | 0.199 | 0.396 | 0.061 | 1.288 | 16.383 | 0.061 | n/a | 0.580 | 20.567 | n/a | n/a | 0.054 | 4.678 | 0.107 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000049c | 41.955 | 5.271 | 0.276 | 0.591 | 0.068 | 1.541 | 16.358 | 0.056 | n/a | 0.257 | 17.466 | n/a | n/a | 0.069 | 6.207 | 0.148 | 0.069 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000465 | 40.457 | 4.312 | 0.005 | 1.473 | 1.021 | 1.173 | 2.135 | 0.033 | n/a | 2.115 | 28.150 | n/a | n/a | 0.039 | 6.811 | 0.168 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000048b | 40.302 | 11.995 | 0.010 | 0.000 | 0.843 | 1.871 | 8.303 | 0.053 | n/a | 4.889 | 12.162 | n/a | n/a | 0.175 | 12.847 | 0.319 | 0.175 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000478 | 39.327 | 4.003 | 0.210 | 0.291 | 0.065 | 1.597 | 17.793 | 0.081 | n/a | 3.353 | 11.894 | n/a | n/a | 0.040 | 4.569 | 0.116 | 0.040 | gw-w/thread-49/gateway.admitted-work | none observed |
| cfc1e96bce8d4c96000000000000048e | 39.274 | 7.511 | 0.009 | 0.000 | 0.199 | 2.488 | 4.295 | 0.127 | n/a | 1.532 | 23.034 | n/a | n/a | 0.078 | 7.719 | 0.197 | 0.078 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004a4 | 38.720 | 4.097 | 0.219 | 0.301 | 0.119 | 1.622 | 13.060 | 0.039 | n/a | 0.320 | 18.895 | n/a | n/a | 0.048 | 4.737 | 0.122 | 0.048 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.985 | 0.627 | 0.000 | 1.653 | 4.312 | 0.006 | 0.000 | 0.883 | 0.895 | 1.809 | 0.049 | n/a | 0.595 | 7.979 | n/a | n/a | 0.043 | 6.811 | 0.330 | 0.043 |
| p99 | 54.058 | 2.553 | 0.000 | 4.509 | 8.493 | 0.013 | 1.489 | 4.641 | 5.063 | 17.301 | 0.127 | n/a | 2.115 | 28.150 | n/a | n/a | 0.083 | 9.381 | 0.488 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c960000000000000468 | 54.058 | 8.493 | 0.005 | 0.000 | 0.883 | 5.063 | 17.301 | 0.080 | n/a | 0.883 | 21.292 | n/a | n/a | 0.059 | 9.381 | 0.174 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000465 | 40.457 | 4.312 | 0.005 | 1.473 | 1.021 | 1.173 | 2.135 | 0.033 | n/a | 2.115 | 28.150 | n/a | n/a | 0.039 | 6.811 | 0.168 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000048e | 39.274 | 7.511 | 0.009 | 0.000 | 0.199 | 2.488 | 4.295 | 0.127 | n/a | 1.532 | 23.034 | n/a | n/a | 0.078 | 7.719 | 0.197 | 0.078 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000479 | 21.677 | 4.661 | 0.008 | 1.489 | 1.044 | 0.895 | 1.809 | 0.051 | n/a | 0.438 | 11.231 | n/a | n/a | 0.050 | 7.202 | 0.332 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004a0 | 19.985 | 6.268 | 0.013 | 0.000 | 0.460 | 1.309 | 2.699 | 0.068 | n/a | 1.107 | 7.979 | n/a | n/a | 0.083 | 6.741 | 0.337 | 0.083 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004aa | 15.718 | 3.022 | 0.004 | 0.000 | 4.641 | 0.641 | 1.247 | 0.030 | n/a | 0.379 | 5.722 | n/a | n/a | 0.031 | 7.668 | 0.488 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.908ms |
| cfc1e96bce8d4c960000000000000483 | 12.965 | 3.539 | 0.006 | 0.000 | 0.980 | 0.813 | 1.361 | 0.049 | n/a | 0.527 | 5.650 | n/a | n/a | 0.041 | 4.525 | 0.349 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000492 | 11.275 | 3.630 | 0.006 | 0.000 | 0.080 | 0.879 | 1.736 | 0.028 | n/a | 0.595 | 4.278 | n/a | n/a | 0.043 | 3.716 | 0.330 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.436 | 0.966 | 0.000 | 1.403 | 5.583 | 0.206 | 0.000 | 0.239 | 1.543 | 6.789 | 0.046 | n/a | 0.369 | 14.073 | n/a | n/a | 0.064 | 6.403 | 0.230 | 0.064 |
| p99 | 118.391 | 3.493 | 3.183 | 6.759 | 11.401 | 0.555 | 0.623 | 1.209 | 3.935 | 23.908 | 0.112 | n/a | 2.073 | 98.341 | n/a | n/a | 0.194 | 12.438 | 0.392 | 0.194 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c9600000000000004cf | 118.391 | 4.697 | 0.268 | 0.333 | 0.250 | 1.788 | 11.953 | 0.063 | n/a | 0.511 | 98.341 | n/a | n/a | 0.187 | 5.548 | 0.047 | 0.187 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004b9 | 64.980 | 5.323 | 0.470 | 0.542 | 0.097 | 2.095 | 17.090 | 0.054 | n/a | 0.728 | 38.486 | n/a | n/a | 0.095 | 6.432 | 0.099 | 0.095 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004c1 | 52.651 | 4.798 | 0.486 | 0.406 | 0.239 | 1.575 | 19.070 | 0.054 | n/a | 0.588 | 25.300 | n/a | n/a | 0.135 | 5.928 | 0.113 | 0.135 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004db | 52.472 | 4.466 | 0.206 | 0.000 | 0.072 | 1.658 | 13.966 | 0.046 | n/a | 0.218 | 31.798 | n/a | n/a | 0.043 | 4.744 | 0.090 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004c9 | 51.973 | 6.458 | 0.302 | 0.623 | 0.068 | 1.827 | 23.908 | 0.050 | n/a | 0.238 | 18.429 | n/a | n/a | 0.072 | 7.451 | 0.143 | 0.072 | gw-w/thread-44/gateway.admitted-work | none observed |
| cfc1e96bce8d4c9600000000000004b2 | 47.203 | 7.832 | 0.555 | 0.428 | 0.261 | 2.500 | 16.206 | 0.101 | n/a | 0.557 | 18.637 | n/a | n/a | 0.126 | 9.077 | 0.192 | 0.126 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004d3 | 44.339 | 9.195 | 0.458 | 0.459 | 0.072 | 1.813 | 11.714 | 0.112 | n/a | 0.523 | 19.928 | n/a | n/a | 0.064 | 10.185 | 0.230 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004eb | 44.299 | 4.223 | 0.495 | 0.000 | 0.085 | 1.388 | 21.240 | 0.048 | n/a | 0.475 | 16.294 | n/a | n/a | 0.052 | 4.803 | 0.108 | 0.052 | gw-w/thread-49/gateway.admitted-work | none observed |
| cfc1e96bce8d4c9600000000000004cd | 40.270 | 7.725 | 0.446 | 0.317 | 0.072 | 1.753 | 14.493 | 0.042 | n/a | 0.256 | 15.125 | n/a | n/a | 0.042 | 8.559 | 0.213 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004fd | 39.550 | 4.788 | 0.221 | 0.000 | 0.055 | 1.936 | 10.697 | 0.045 | n/a | 0.279 | 21.491 | n/a | n/a | 0.039 | 5.064 | 0.128 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004dc | 39.384 | 11.401 | 0.012 | 0.000 | 1.025 | 3.311 | 2.213 | 0.034 | n/a | 0.210 | 21.099 | n/a | n/a | 0.079 | 12.438 | 0.316 | 0.079 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004d5 | 39.241 | 5.635 | 0.352 | 0.000 | 0.095 | 2.691 | 13.905 | 0.050 | n/a | 0.526 | 15.916 | n/a | n/a | 0.072 | 6.082 | 0.155 | 0.072 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004e7 | 39.178 | 7.576 | 0.320 | 0.000 | 0.113 | 2.359 | 12.553 | 0.040 | n/a | 0.233 | 15.910 | n/a | n/a | 0.073 | 8.010 | 0.204 | 0.073 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004ba | 38.535 | 10.805 | 0.006 | 0.000 | 1.012 | 0.752 | 1.965 | 0.032 | n/a | 0.637 | 23.270 | n/a | n/a | 0.056 | 11.823 | 0.307 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004f3 | 37.484 | 6.007 | 0.383 | 0.000 | 0.071 | 2.065 | 17.010 | 0.072 | n/a | 0.338 | 11.487 | n/a | n/a | 0.053 | 6.460 | 0.172 | 0.053 | gw-w/thread-49/gateway.admitted-work | none observed |
| cfc1e96bce8d4c9600000000000004e5 | 37.087 | 5.224 | 0.209 | 0.000 | 0.062 | 1.543 | 14.015 | 0.069 | n/a | 0.369 | 15.541 | n/a | n/a | 0.054 | 5.496 | 0.148 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004c3 | 35.571 | 4.930 | 0.344 | 0.471 | 0.104 | 1.277 | 11.815 | 0.043 | n/a | 0.561 | 15.965 | n/a | n/a | 0.061 | 5.849 | 0.164 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004b6 | 34.659 | 6.001 | 0.473 | 0.395 | 0.113 | 2.397 | 6.789 | 0.104 | n/a | 0.575 | 17.730 | n/a | n/a | 0.081 | 6.982 | 0.201 | 0.081 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004bc | 30.457 | 6.156 | 0.010 | 0.000 | 1.166 | 1.050 | 10.233 | 0.040 | n/a | 0.675 | 11.065 | n/a | n/a | 0.060 | 7.333 | 0.241 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004d7 | 30.436 | 4.413 | 0.486 | 0.000 | 0.122 | 1.868 | 9.332 | 0.063 | n/a | 0.417 | 13.662 | n/a | n/a | 0.073 | 5.021 | 0.165 | 0.073 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.792 | 1.171 | 0.000 | 1.907 | 4.781 | 0.007 | 0.000 | 0.613 | 0.911 | 1.510 | 0.042 | n/a | 0.345 | 10.267 | n/a | n/a | 0.062 | 5.178 | 0.297 | 0.062 |
| p99 | 29.801 | 2.252 | 0.017 | 2.390 | 8.174 | 0.019 | 0.000 | 1.209 | 3.935 | 2.394 | 0.078 | n/a | 2.073 | 14.279 | n/a | n/a | 0.194 | 9.057 | 0.392 | 0.194 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c9600000000000004b4 | 29.801 | 8.174 | 0.019 | 0.000 | 0.865 | 3.935 | 1.974 | 0.061 | n/a | 0.415 | 14.279 | n/a | n/a | 0.079 | 9.057 | 0.304 | 0.079 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004ef | 21.053 | 4.122 | 0.008 | 0.000 | 0.442 | 0.800 | 1.510 | 0.042 | n/a | 0.622 | 13.312 | n/a | n/a | 0.194 | 4.572 | 0.217 | 0.194 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004be | 20.980 | 5.028 | 0.010 | 0.000 | 0.140 | 0.913 | 1.468 | 0.027 | n/a | 0.555 | 12.777 | n/a | n/a | 0.062 | 5.178 | 0.247 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004c5 | 20.883 | 5.790 | 0.011 | 0.000 | 0.398 | 0.749 | 2.320 | 0.078 | n/a | 2.073 | 9.380 | n/a | n/a | 0.084 | 6.199 | 0.297 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004f7 | 20.818 | 4.781 | 0.007 | 0.000 | 0.967 | 1.346 | 2.394 | 0.050 | n/a | 0.859 | 10.356 | n/a | n/a | 0.058 | 5.754 | 0.276 | 0.058 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004c7 | 19.792 | 5.583 | 0.010 | 0.000 | 0.810 | 0.911 | 1.291 | 0.033 | n/a | 0.250 | 10.833 | n/a | n/a | 0.072 | 6.403 | 0.323 | 0.072 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004af | 18.887 | 5.267 | 0.007 | 0.000 | 1.209 | 0.778 | 1.506 | 0.063 | n/a | 0.345 | 9.644 | n/a | n/a | 0.068 | 6.484 | 0.343 | 0.068 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004e2 | 18.194 | 4.311 | 0.007 | 0.000 | 0.688 | 0.958 | 1.596 | 0.042 | n/a | 0.281 | 10.267 | n/a | n/a | 0.045 | 5.005 | 0.275 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004d8 | 11.893 | 3.703 | 0.005 | 0.000 | 0.332 | 0.875 | 1.912 | 0.044 | n/a | 0.275 | 4.705 | n/a | n/a | 0.040 | 4.040 | 0.340 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004fa | 10.931 | 3.663 | 0.006 | 0.000 | 0.613 | 0.962 | 1.136 | 0.031 | n/a | 0.216 | 4.254 | n/a | n/a | 0.050 | 4.281 | 0.392 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.215 | 0.825 | 0.000 | 1.504 | 5.393 | 0.035 | 0.000 | 0.220 | 1.523 | 9.594 | 0.048 | n/a | 0.361 | 15.685 | n/a | n/a | 0.051 | 5.781 | 0.208 | 0.051 |
| p99 | 274.161 | 5.546 | 0.008 | 5.187 | 15.187 | 1.604 | 0.000 | 1.164 | 4.858 | 216.983 | 5.405 | n/a | 3.887 | 76.892 | n/a | n/a | 0.313 | 16.031 | 0.484 | 0.313 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c960000000000000540 | 274.161 | 3.946 | 1.376 | 0.000 | 0.084 | 1.603 | 216.983 | 0.060 | n/a | 0.230 | 49.833 | n/a | n/a | 0.046 | 5.406 | 0.020 | 0.046 | gw-w/thread-49/commit.prepare-and-validate | none observed |
| cfc1e96bce8d4c96000000000000050c | 100.954 | 7.315 | 0.335 | 0.000 | 0.082 | 2.357 | 13.196 | 0.046 | n/a | 0.667 | 76.892 | n/a | n/a | 0.064 | 7.732 | 0.077 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000521 | 62.125 | 15.187 | 0.012 | 0.000 | 0.833 | 3.765 | 31.417 | 0.130 | n/a | 0.642 | 10.103 | n/a | n/a | 0.037 | 16.031 | 0.258 | 0.037 | gw-w/thread-47/gateway.admitted-work | none observed |
| cfc1e96bce8d4c960000000000000545 | 61.092 | 4.534 | 0.005 | 0.000 | 0.698 | 1.426 | 1.108 | 0.026 | n/a | 1.201 | 52.047 | n/a | n/a | 0.046 | 5.237 | 0.086 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000509 | 49.767 | 6.534 | 0.453 | 0.000 | 0.107 | 4.858 | 21.685 | 0.073 | n/a | 0.292 | 15.685 | n/a | n/a | 0.080 | 7.094 | 0.143 | 0.080 | gw-w/thread-49/gateway.admitted-work | none observed |
| cfc1e96bce8d4c960000000000000505 | 49.734 | 9.089 | 0.003 | 0.000 | 0.213 | 0.792 | 2.800 | 5.405 | n/a | 0.039 | 31.356 | n/a | n/a | 0.038 | 9.304 | 0.187 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.217ms |
| cfc1e96bce8d4c96000000000000052c | 47.420 | 8.956 | 1.604 | 0.000 | 0.365 | 3.867 | 14.987 | 0.126 | n/a | 0.767 | 16.436 | n/a | n/a | 0.313 | 10.924 | 0.230 | 0.313 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000051e | 45.304 | 5.675 | 0.452 | 0.000 | 0.215 | 2.857 | 13.587 | 0.074 | n/a | 0.925 | 21.340 | n/a | n/a | 0.179 | 6.341 | 0.140 | 0.179 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000542 | 44.803 | 6.106 | 0.289 | 0.000 | 0.307 | 1.458 | 21.516 | 0.074 | n/a | 3.887 | 11.094 | n/a | n/a | 0.070 | 6.703 | 0.150 | 0.070 | gw-w/thread-48/gateway.admitted-work | none observed |
| cfc1e96bce8d4c960000000000000510 | 44.615 | 4.182 | 0.263 | 0.000 | 0.072 | 1.523 | 22.190 | 0.061 | n/a | 0.538 | 15.744 | n/a | n/a | 0.042 | 4.517 | 0.101 | 0.042 | gw-w/thread-47/gateway.admitted-work | driver.expected-state.bind-receipt 1.708ms; driver.publication 1.521ms |
| cfc1e96bce8d4c960000000000000503 | 43.959 | 4.756 | 0.210 | 0.000 | 0.079 | 1.931 | 14.417 | 0.123 | n/a | 0.561 | 21.831 | n/a | n/a | 0.051 | 5.045 | 0.115 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000526 | 40.419 | 6.431 | 0.214 | 0.000 | 0.059 | 2.487 | 14.855 | 0.046 | n/a | 0.264 | 16.021 | n/a | n/a | 0.042 | 6.704 | 0.166 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000534 | 38.882 | 4.345 | 0.348 | 0.000 | 0.067 | 1.359 | 14.631 | 0.049 | n/a | 0.286 | 17.736 | n/a | n/a | 0.062 | 4.760 | 0.122 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000532 | 37.867 | 8.320 | 0.218 | 0.000 | 0.079 | 2.155 | 20.277 | 0.139 | n/a | 0.506 | 5.958 | n/a | n/a | 0.216 | 8.617 | 0.228 | 0.216 | gw-w/thread-47/gateway.admitted-work | none observed |
| cfc1e96bce8d4c96000000000000052d | 37.707 | 13.217 | 0.035 | 0.000 | 1.043 | 1.593 | 1.887 | 0.027 | n/a | 0.201 | 19.643 | n/a | n/a | 0.060 | 14.296 | 0.379 | 0.060 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000511 | 36.810 | 9.462 | 0.007 | 0.000 | 0.250 | 1.165 | 3.635 | 0.035 | n/a | 3.458 | 18.745 | n/a | n/a | 0.051 | 9.720 | 0.264 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000054a | 36.666 | 5.974 | 0.299 | 0.000 | 0.068 | 1.832 | 11.837 | 0.052 | n/a | 0.262 | 16.300 | n/a | n/a | 0.042 | 6.340 | 0.173 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000538 | 36.379 | 5.145 | 0.281 | 0.000 | 0.068 | 2.214 | 10.021 | 0.045 | n/a | 0.229 | 18.332 | n/a | n/a | 0.045 | 5.493 | 0.151 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000054c | 35.898 | 5.497 | 0.220 | 0.000 | 0.064 | 1.570 | 10.152 | 0.034 | n/a | 0.259 | 18.056 | n/a | n/a | 0.046 | 5.781 | 0.161 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000504 | 35.681 | 3.900 | 0.007 | 0.000 | 0.905 | 1.101 | 9.773 | 2.332 | n/a | 0.204 | 17.368 | n/a | n/a | 0.091 | 4.811 | 0.135 | 0.091 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.409 | 1.220 | 0.000 | 1.835 | 4.177 | 0.006 | 0.000 | 0.772 | 0.909 | 2.309 | 0.037 | n/a | 0.444 | 9.720 | n/a | n/a | 0.050 | 5.118 | 0.263 | 0.050 |
| p99 | 35.681 | 2.795 | 0.000 | 2.883 | 5.606 | 0.012 | 0.000 | 1.164 | 2.015 | 9.773 | 2.332 | n/a | 3.644 | 17.368 | n/a | n/a | 0.107 | 6.575 | 0.484 | 0.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c960000000000000504 | 35.681 | 3.900 | 0.007 | 0.000 | 0.905 | 1.101 | 9.773 | 2.332 | n/a | 0.204 | 17.368 | n/a | n/a | 0.091 | 4.811 | 0.135 | 0.091 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000004fe | 26.202 | 5.606 | 0.010 | 0.000 | 0.929 | 1.358 | 2.002 | 0.056 | n/a | 0.361 | 15.797 | n/a | n/a | 0.083 | 6.545 | 0.250 | 0.083 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000500 | 26.009 | 4.417 | 0.006 | 0.000 | 0.983 | 2.015 | 2.631 | 0.030 | n/a | 0.245 | 15.621 | n/a | n/a | 0.062 | 5.405 | 0.208 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000517 | 25.327 | 3.327 | 0.005 | 0.000 | 0.351 | 1.793 | 2.355 | 0.056 | n/a | 1.039 | 16.363 | n/a | n/a | 0.038 | 3.682 | 0.145 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000050d | 21.979 | 4.833 | 0.012 | 0.000 | 0.685 | 0.762 | 4.999 | 0.033 | n/a | 0.514 | 10.063 | n/a | n/a | 0.079 | 5.530 | 0.252 | 0.079 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000054d | 19.729 | 5.393 | 0.006 | 0.000 | 0.983 | 0.495 | 4.847 | 0.040 | n/a | 0.178 | 7.741 | n/a | n/a | 0.045 | 6.382 | 0.324 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000535 | 19.550 | 4.177 | 0.006 | 0.000 | 0.177 | 1.735 | 2.760 | 0.069 | n/a | 0.524 | 10.054 | n/a | n/a | 0.049 | 4.360 | 0.223 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000530 | 19.409 | 4.826 | 0.006 | 0.000 | 0.772 | 0.909 | 1.413 | 0.037 | n/a | 0.237 | 11.159 | n/a | n/a | 0.051 | 5.604 | 0.289 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000051b | 18.848 | 4.121 | 0.006 | 0.000 | 0.397 | 1.009 | 2.702 | 0.104 | n/a | 1.560 | 8.899 | n/a | n/a | 0.050 | 4.524 | 0.240 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000053d | 18.524 | 4.673 | 0.006 | 0.000 | 0.766 | 0.581 | 1.356 | 0.030 | n/a | 3.644 | 7.386 | n/a | n/a | 0.081 | 5.446 | 0.294 | 0.081 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000543 | 17.316 | 4.177 | 0.010 | 0.000 | 0.931 | 0.874 | 1.086 | 0.026 | n/a | 0.451 | 9.720 | n/a | n/a | 0.041 | 5.118 | 0.296 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000514 | 16.585 | 4.131 | 0.008 | 0.000 | 0.220 | 0.742 | 1.741 | 0.040 | n/a | 0.251 | 9.405 | n/a | n/a | 0.046 | 4.359 | 0.263 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000527 | 15.477 | 3.205 | 0.005 | 0.000 | 0.944 | 0.646 | 2.309 | 0.033 | n/a | 0.444 | 7.850 | n/a | n/a | 0.042 | 4.155 | 0.268 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000539 | 13.598 | 5.401 | 0.010 | 0.000 | 1.164 | 1.121 | 1.301 | 0.032 | n/a | 0.265 | 4.197 | n/a | n/a | 0.107 | 6.575 | 0.484 | 0.107 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000519 | 13.552 | 3.418 | 0.005 | 0.000 | 0.615 | 0.602 | 1.606 | 0.032 | n/a | 0.565 | 6.663 | n/a | n/a | 0.045 | 4.038 | 0.298 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.073 | 0.705 | 0.000 | 1.729 | 5.295 | 0.008 | 0.000 | 0.353 | 1.263 | 4.915 | 0.044 | n/a | 0.444 | 11.590 | n/a | n/a | 0.063 | 5.905 | 0.244 | 0.063 |
| p99 | 76.820 | 3.985 | 0.000 | 3.813 | 8.369 | 0.557 | 0.000 | 1.954 | 3.320 | 46.634 | 0.119 | n/a | 4.062 | 58.782 | n/a | n/a | 0.145 | 9.004 | 0.480 | 0.145 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c960000000000000572 | 76.820 | 5.851 | 0.263 | 0.000 | 0.104 | 1.532 | 9.901 | 0.058 | n/a | 0.264 | 58.782 | n/a | n/a | 0.066 | 6.217 | 0.081 | 0.066 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000580 | 74.160 | 5.500 | 0.316 | 0.000 | 0.089 | 1.844 | 46.634 | 0.059 | n/a | 0.223 | 19.432 | n/a | n/a | 0.063 | 5.905 | 0.080 | 0.063 | gw-w/thread-44/gateway.admitted-work | none observed |
| cfc1e96bce8d4c960000000000000594 | 65.219 | 6.746 | 0.261 | 0.000 | 0.064 | 2.255 | 32.191 | 0.116 | n/a | 4.062 | 19.480 | n/a | n/a | 0.045 | 7.071 | 0.108 | 0.045 | gw-w/thread-42/gateway.admitted-work | none observed |
| cfc1e96bce8d4c9600000000000005a1 | 64.312 | 8.128 | 0.007 | 0.000 | 0.353 | 0.977 | 2.004 | 0.035 | n/a | 0.279 | 52.451 | n/a | n/a | 0.078 | 8.488 | 0.132 | 0.078 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000059b | 52.940 | 4.416 | 0.233 | 0.000 | 0.119 | 1.832 | 19.164 | 0.035 | n/a | 0.226 | 26.853 | n/a | n/a | 0.062 | 4.768 | 0.090 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000576 | 46.314 | 4.476 | 0.266 | 0.000 | 0.132 | 1.492 | 23.578 | 0.053 | n/a | 0.411 | 15.833 | n/a | n/a | 0.074 | 4.874 | 0.105 | 0.074 | gw-w/thread-47/gateway.admitted-work | none observed |
| cfc1e96bce8d4c9600000000000005a9 | 42.950 | 5.615 | 0.507 | 0.000 | 0.346 | 2.798 | 12.873 | 0.119 | n/a | 0.591 | 19.958 | n/a | n/a | 0.145 | 6.467 | 0.151 | 0.145 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.460ms; driver.publication 1.355ms |
| cfc1e96bce8d4c96000000000000056c | 40.918 | 5.116 | 0.386 | 0.000 | 0.099 | 2.834 | 15.315 | 0.117 | n/a | 1.227 | 15.741 | n/a | n/a | 0.084 | 5.601 | 0.137 | 0.084 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000564 | 40.120 | 6.100 | 0.214 | 0.000 | 0.066 | 2.157 | 13.484 | 0.049 | n/a | 0.304 | 17.705 | n/a | n/a | 0.041 | 6.379 | 0.159 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000553 | 39.378 | 3.794 | 0.207 | 0.000 | 0.067 | 1.614 | 13.742 | 0.079 | n/a | 0.917 | 18.918 | n/a | n/a | 0.042 | 4.067 | 0.103 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000574 | 38.685 | 6.240 | 0.556 | 0.000 | 0.070 | 2.365 | 16.902 | 0.044 | n/a | 0.239 | 12.221 | n/a | n/a | 0.047 | 6.866 | 0.177 | 0.047 | gw-w/thread-49/gateway.admitted-work | none observed |
| cfc1e96bce8d4c96000000000000055d | 37.403 | 4.027 | 0.213 | 0.000 | 0.073 | 1.570 | 17.297 | 0.099 | n/a | 0.800 | 13.277 | n/a | n/a | 0.048 | 4.312 | 0.115 | 0.048 | gw-w/thread-45/gateway.admitted-work | none observed |
| cfc1e96bce8d4c9600000000000005b5 | 36.166 | 4.813 | 0.368 | 0.000 | 0.104 | 2.042 | 10.271 | 0.046 | n/a | 0.231 | 18.231 | n/a | n/a | 0.060 | 5.285 | 0.146 | 0.060 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000578 | 34.860 | 4.311 | 0.259 | 0.000 | 0.106 | 1.627 | 8.661 | 0.034 | n/a | 0.236 | 19.562 | n/a | n/a | 0.065 | 4.676 | 0.134 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000058b | 34.741 | 7.833 | 0.007 | 0.000 | 1.165 | 0.859 | 5.858 | 0.043 | n/a | 0.208 | 18.678 | n/a | n/a | 0.091 | 9.004 | 0.259 | 0.091 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000586 | 34.234 | 4.217 | 0.246 | 0.000 | 0.105 | 1.698 | 9.804 | 0.031 | n/a | 0.444 | 17.627 | n/a | n/a | 0.061 | 4.568 | 0.133 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000058a | 33.638 | 4.794 | 0.281 | 0.000 | 0.064 | 1.486 | 11.547 | 0.046 | n/a | 0.527 | 14.835 | n/a | n/a | 0.056 | 5.139 | 0.153 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000554 | 31.889 | 6.235 | 0.006 | 0.000 | 1.053 | 0.759 | 5.919 | 0.038 | n/a | 0.441 | 17.351 | n/a | n/a | 0.086 | 7.294 | 0.229 | 0.086 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005aa | 30.868 | 7.055 | 0.008 | 0.000 | 0.287 | 0.556 | 2.128 | 0.038 | n/a | 0.382 | 20.352 | n/a | n/a | 0.062 | 7.350 | 0.238 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000598 | 30.487 | 5.863 | 0.281 | 0.000 | 0.065 | 2.881 | 7.720 | 0.102 | n/a | 1.487 | 12.047 | n/a | n/a | 0.041 | 6.209 | 0.204 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.314 | 1.116 | 0.000 | 1.944 | 4.759 | 0.007 | 0.000 | 0.694 | 0.856 | 1.346 | 0.043 | n/a | 0.554 | 7.078 | n/a | n/a | 0.069 | 5.650 | 0.342 | 0.069 |
| p99 | 30.448 | 2.359 | 0.000 | 2.716 | 6.454 | 0.011 | 0.000 | 1.954 | 3.320 | 5.944 | 0.096 | n/a | 1.468 | 24.816 | n/a | n/a | 0.110 | 7.188 | 0.480 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c96000000000000057a | 30.448 | 3.552 | 0.003 | 0.000 | 0.641 | 0.572 | 0.689 | 0.014 | n/a | 0.119 | 24.816 | n/a | n/a | 0.041 | 4.197 | 0.138 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.191ms |
| cfc1e96bce8d4c96000000000000055a | 22.635 | 5.598 | 0.005 | 0.000 | 0.948 | 0.822 | 1.786 | 0.047 | n/a | 0.841 | 12.519 | n/a | n/a | 0.069 | 6.551 | 0.289 | 0.069 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000059e | 21.835 | 5.467 | 0.007 | 0.000 | 0.850 | 1.092 | 1.872 | 0.054 | n/a | 0.397 | 12.032 | n/a | n/a | 0.064 | 6.323 | 0.290 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000552 | 20.444 | 5.923 | 0.007 | 0.000 | 0.821 | 2.820 | 4.915 | 0.073 | n/a | 0.885 | 4.919 | n/a | n/a | 0.082 | 6.751 | 0.330 | 0.082 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000599 | 18.583 | 5.773 | 0.009 | 0.000 | 0.864 | 3.320 | 5.944 | 0.051 | n/a | 0.237 | 2.330 | n/a | n/a | 0.055 | 6.646 | 0.358 | 0.055 | node-14/thread-0/driver.execute | none observed |
| cfc1e96bce8d4c96000000000000058e | 18.374 | 6.084 | 0.010 | 0.000 | 0.227 | 0.790 | 1.171 | 0.043 | n/a | 0.677 | 9.261 | n/a | n/a | 0.110 | 6.321 | 0.344 | 0.110 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005b3 | 18.011 | 6.454 | 0.011 | 0.000 | 0.723 | 1.263 | 2.188 | 0.061 | n/a | 0.302 | 6.910 | n/a | n/a | 0.098 | 7.188 | 0.399 | 0.098 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000595 | 17.660 | 3.835 | 0.007 | 0.000 | 0.670 | 0.743 | 1.346 | 0.031 | n/a | 1.468 | 9.496 | n/a | n/a | 0.066 | 4.511 | 0.255 | 0.066 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000055f | 17.314 | 4.572 | 0.010 | 0.000 | 1.068 | 0.983 | 0.964 | 0.026 | n/a | 0.439 | 9.158 | n/a | n/a | 0.093 | 5.650 | 0.326 | 0.093 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000556 | 16.565 | 5.295 | 0.007 | 0.000 | 0.694 | 1.160 | 1.154 | 0.027 | n/a | 0.627 | 7.520 | n/a | n/a | 0.081 | 5.996 | 0.362 | 0.081 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000566 | 15.394 | 4.074 | 0.008 | 0.000 | 0.218 | 1.293 | 1.863 | 0.096 | n/a | 0.463 | 7.309 | n/a | n/a | 0.069 | 4.300 | 0.279 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005ac | 15.003 | 4.759 | 0.007 | 0.000 | 0.358 | 0.856 | 1.228 | 0.035 | n/a | 0.610 | 7.078 | n/a | n/a | 0.074 | 5.124 | 0.342 | 0.074 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005b0 | 14.819 | 4.287 | 0.006 | 0.000 | 1.017 | 1.109 | 1.269 | 0.057 | n/a | 0.666 | 6.355 | n/a | n/a | 0.054 | 5.309 | 0.358 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000590 | 14.421 | 4.958 | 0.005 | 0.000 | 1.954 | 0.792 | 1.080 | 0.030 | n/a | 0.554 | 5.002 | n/a | n/a | 0.045 | 6.917 | 0.480 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000584 | 14.043 | 4.432 | 0.008 | 0.000 | 0.373 | 0.844 | 1.760 | 0.060 | n/a | 0.648 | 5.842 | n/a | n/a | 0.076 | 4.813 | 0.343 | 0.076 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000570 | 12.712 | 3.737 | 0.005 | 0.000 | 0.374 | 0.634 | 1.446 | 0.034 | n/a | 0.246 | 6.188 | n/a | n/a | 0.048 | 4.117 | 0.324 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005a6 | 12.517 | 3.736 | 0.006 | 0.000 | 0.542 | 0.754 | 0.938 | 0.027 | n/a | 0.222 | 6.249 | n/a | n/a | 0.044 | 4.283 | 0.342 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.467 | 0.710 | 0.000 | 1.737 | 5.633 | 0.016 | 0.000 | 0.206 | 1.330 | 5.619 | 0.039 | n/a | 0.267 | 10.062 | n/a | n/a | 0.058 | 6.117 | 0.229 | 0.058 |
| p99 | 55.197 | 6.095 | 0.008 | 5.458 | 15.002 | n/a | 0.000 | 1.209 | 8.172 | 25.094 | 0.167 | n/a | 1.766 | 44.874 | n/a | n/a | 0.159 | 15.122 | 0.620 | 0.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c9600000000000005de | 55.197 | 12.563 | 0.377 | 0.000 | 0.066 | 6.703 | 10.625 | 0.080 | n/a | 0.444 | 24.270 | n/a | n/a | 0.070 | 13.006 | 0.236 | 0.070 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005d3 | 53.801 | 5.538 | 0.008 | 0.000 | 1.043 | 0.856 | 1.139 | 0.033 | n/a | 0.244 | 44.874 | n/a | n/a | 0.066 | 6.589 | 0.122 | 0.066 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005c5 | 51.444 | 10.889 | 0.016 | 0.000 | 0.484 | 8.147 | 6.848 | 0.080 | n/a | 1.766 | 23.168 | n/a | n/a | 0.046 | 11.390 | 0.221 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.492ms |
| cfc1e96bce8d4c9600000000000005b9 | 47.466 | 4.044 | 0.278 | 0.000 | 0.069 | 1.521 | 24.042 | 0.042 | n/a | 0.196 | 17.226 | n/a | n/a | 0.049 | 4.391 | 0.092 | 0.049 | gw-w/thread-49/gateway.admitted-work | none observed |
| cfc1e96bce8d4c9600000000000005c4 | 44.751 | 5.648 | 1.456 | 0.000 | 0.061 | 2.690 | 17.500 | 0.038 | n/a | 0.210 | 17.082 | n/a | n/a | 0.066 | 7.165 | 0.160 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005ca | 43.040 | 5.671 | 0.344 | 0.000 | 0.065 | 1.698 | 25.094 | 0.048 | n/a | 0.506 | 9.557 | n/a | n/a | 0.057 | 6.081 | 0.141 | 0.057 | gw-w/thread-46/gateway.admitted-work | none observed |
| cfc1e96bce8d4c9600000000000005e4 | 40.250 | 6.403 | 0.370 | 0.000 | 0.071 | 2.275 | 20.585 | 0.039 | n/a | 0.394 | 10.062 | n/a | n/a | 0.051 | 6.844 | 0.170 | 0.051 | gw-w/thread-47/gateway.admitted-work | none observed |
| cfc1e96bce8d4c9600000000000005be | 38.072 | 9.605 | 0.011 | 0.000 | 0.435 | 0.936 | 2.235 | 0.066 | n/a | 0.298 | 24.432 | n/a | n/a | 0.054 | 10.051 | 0.264 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.369ms |
| cfc1e96bce8d4c9600000000000005f0 | 37.227 | 5.635 | 0.788 | 0.000 | 0.069 | 1.330 | 10.077 | 0.060 | n/a | 0.267 | 18.941 | n/a | n/a | 0.061 | 6.492 | 0.174 | 0.061 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005d2 | 36.020 | 5.225 | 0.534 | 0.000 | 0.120 | 2.176 | 5.619 | 0.167 | n/a | 0.353 | 21.734 | n/a | n/a | 0.093 | 5.878 | 0.163 | 0.093 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005d6 | 35.699 | 5.633 | 0.395 | 0.000 | 0.089 | 1.342 | 12.508 | 0.033 | n/a | 0.198 | 15.424 | n/a | n/a | 0.078 | 6.117 | 0.171 | 0.078 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005da | 35.409 | 6.670 | 1.602 | 0.000 | 0.071 | 3.789 | 10.660 | 0.023 | n/a | 0.083 | 12.455 | n/a | n/a | 0.056 | 8.343 | 0.236 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.231ms; driver.publication 1.176ms |
| cfc1e96bce8d4c9600000000000005fc | 33.822 | 6.299 | 0.387 | 0.000 | 0.072 | 1.923 | 11.089 | 0.065 | n/a | 0.396 | 13.532 | n/a | n/a | 0.059 | 6.758 | 0.200 | 0.059 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005cc | 31.083 | 4.125 | 0.415 | 0.000 | 0.067 | 1.562 | 12.809 | 0.033 | n/a | 0.188 | 11.842 | n/a | n/a | 0.042 | 4.607 | 0.148 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005f4 | 29.852 | 4.704 | 0.283 | 0.000 | 0.013 | 1.367 | 11.789 | 0.076 | n/a | 0.323 | 11.258 | n/a | n/a | 0.040 | 4.999 | 0.167 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c96000000000000060a | 29.767 | 3.745 | 0.280 | 0.000 | 0.065 | 2.166 | 6.521 | 0.056 | n/a | 1.522 | 15.369 | n/a | n/a | 0.043 | 4.090 | 0.137 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005bd | 29.564 | 6.161 | 6.110 | 0.000 | 0.206 | 1.996 | 7.466 | 0.034 | n/a | 0.209 | 7.224 | n/a | n/a | 0.159 | 12.476 | 0.422 | 0.159 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005e6 | 28.989 | 6.230 | 0.285 | 0.000 | 0.112 | 2.356 | 6.063 | 0.048 | n/a | 0.210 | 13.622 | n/a | n/a | 0.064 | 6.626 | 0.229 | 0.064 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000608 | 28.133 | 5.737 | 0.265 | 0.000 | 0.062 | 1.704 | 6.478 | 0.080 | n/a | 0.775 | 12.973 | n/a | n/a | 0.060 | 6.064 | 0.216 | 0.060 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000606 | 27.347 | 5.251 | 0.194 | 0.000 | 0.064 | 8.172 | 3.371 | 0.038 | n/a | 0.202 | 10.012 | n/a | n/a | 0.042 | 5.510 | 0.201 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.125 | 1.112 | 0.000 | 2.012 | 4.916 | 0.007 | 0.000 | 0.647 | 0.881 | 1.382 | 0.034 | n/a | 0.273 | 6.051 | n/a | n/a | 0.063 | 6.050 | 0.359 | 0.063 |
| p99 | 53.801 | 2.444 | 0.000 | 3.931 | 10.889 | n/a | 0.000 | 1.209 | 8.147 | 8.731 | 0.080 | n/a | 1.766 | 44.874 | n/a | n/a | 0.100 | 11.390 | 0.454 | 0.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c9600000000000005d3 | 53.801 | 5.538 | 0.008 | 0.000 | 1.043 | 0.856 | 1.139 | 0.033 | n/a | 0.244 | 44.874 | n/a | n/a | 0.066 | 6.589 | 0.122 | 0.066 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005c5 | 51.444 | 10.889 | 0.016 | 0.000 | 0.484 | 8.147 | 6.848 | 0.080 | n/a | 1.766 | 23.168 | n/a | n/a | 0.046 | 11.390 | 0.221 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.492ms |
| cfc1e96bce8d4c9600000000000005ee | 21.883 | 4.916 | 0.006 | 0.000 | 1.128 | 0.881 | 1.780 | 0.041 | n/a | 0.329 | 12.739 | n/a | n/a | 0.063 | 6.050 | 0.276 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005f2 | 20.587 | 5.359 | 0.008 | 0.000 | 0.885 | 0.803 | 1.785 | 0.042 | n/a | 0.263 | 11.344 | n/a | n/a | 0.100 | 6.252 | 0.304 | 0.100 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005f9 | 19.327 | 7.724 | 0.014 | 0.000 | 1.034 | 1.053 | 1.111 | 0.030 | n/a | 0.250 | 8.050 | n/a | n/a | 0.059 | 8.772 | 0.454 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005d7 | 16.591 | 6.224 | 0.007 | 0.000 | 1.209 | 0.952 | 1.734 | 0.045 | n/a | 0.280 | 6.039 | n/a | n/a | 0.100 | 7.440 | 0.448 | 0.100 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005b6 | 16.150 | 5.968 | 0.011 | 0.000 | 0.801 | 1.134 | 1.143 | 0.029 | n/a | 0.184 | 6.786 | n/a | n/a | 0.095 | 6.779 | 0.420 | 0.095 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005fd | 16.125 | 3.429 | n/a | 0.000 | 0.290 | 3.406 | 8.731 | 0.070 | n/a | 0.134 | 0.000 | n/a | n/a | 0.064 | 3.719 | 0.231 | 0.064 | gw-w/thread-47/storage/begin-command! | none observed |
| cfc1e96bce8d4c9600000000000005df | 15.314 | 4.326 | 0.007 | 0.000 | 0.647 | 0.874 | 1.382 | 0.035 | n/a | 0.273 | 7.698 | n/a | n/a | 0.073 | 4.979 | 0.325 | 0.073 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005eb | 15.050 | 5.946 | 0.010 | 0.000 | 0.316 | 1.099 | 1.228 | 0.034 | n/a | 0.286 | 6.051 | n/a | n/a | 0.082 | 6.271 | 0.417 | 0.082 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005cf | 13.671 | 4.003 | 0.006 | 0.000 | 0.969 | 0.848 | 1.396 | 0.047 | n/a | 0.646 | 5.714 | n/a | n/a | 0.043 | 4.978 | 0.364 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005e7 | 11.912 | 4.502 | 0.007 | 0.000 | 0.213 | 1.088 | 1.066 | 0.032 | n/a | 0.216 | 4.734 | n/a | n/a | 0.054 | 4.722 | 0.396 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005cd | 10.729 | 3.726 | 0.005 | 0.000 | 0.350 | 0.630 | 0.954 | 0.026 | n/a | 0.308 | 4.688 | n/a | n/a | 0.041 | 4.082 | 0.380 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c9600000000000005f7 | 9.715 | 3.006 | 0.005 | 0.000 | 0.478 | 0.557 | 1.508 | 0.030 | n/a | 0.361 | 3.733 | n/a | n/a | 0.037 | 3.490 | 0.359 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (861 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.275 | 0.907 | 0.000 | 1.743 | 3.940 | 0.006 | 0.000 | 0.784 | 0.959 | 1.252 | 0.034 | n/a | 0.316 | 8.381 | n/a | n/a | 0.039 | 5.096 | 0.300 | 0.039 |
| p99 | 161.736 | 3.543 | 1.649 | 6.941 | 13.524 | 11.728 | 0.000 | 71.186 | 41.184 | 19.046 | 7.740 | n/a | 6.128 | 86.878 | n/a | n/a | 0.130 | 84.736 | 0.801 | 0.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c960000000000000883 | 429.136 | 31.838 | 0.028 | 0.000 | 7.594 | 191.934 | 47.118 | 68.135 | n/a | 0.474 | 81.976 | n/a | n/a | 0.039 | 39.460 | 0.092 | 0.039 | node-14/thread-0/socket.wait-first-byte | client.encode 10.272ms; driver.publication 8.011ms; driver.publication 6.566ms; client.parse 5.398ms; driver.publication 5.315ms |
| cfc1e96bce8d4c960000000000000894 | 249.303 | 1.976 | 0.005 | 0.000 | 212.288 | 3.568 | 1.045 | 0.021 | n/a | 0.314 | 30.061 | n/a | n/a | 0.023 | 214.269 | 0.859 | 0.023 | node-14/thread-0/driver.queue.subject | driver.publication 8.011ms; client.parse 5.398ms; driver.publication 3.380ms; driver.publication 2.757ms; driver.publication 2.492ms |
| cfc1e96bce8d4c96000000000000088a | 244.837 | 5.738 | 15.594 | 0.000 | 0.142 | 11.163 | 21.081 | 154.883 | n/a | 0.432 | 35.656 | n/a | n/a | 0.149 | 21.474 | 0.088 | 0.149 | gw-w/thread-64/gateway.admission-wait | client.encode 10.272ms; driver.publication 8.011ms; driver.publication 6.566ms; driver.publication 5.315ms; driver.publication 4.370ms |
| cfc1e96bce8d4c960000000000000614 | 201.985 | 4.058 | 0.231 | 0.000 | 0.061 | 6.248 | 60.923 | 0.054 | n/a | 0.582 | 129.779 | n/a | n/a | 0.050 | 4.350 | 0.022 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cfc1e96bce8d4c960000000000000902 | 179.097 | 5.229 | 0.018 | 0.000 | 149.867 | 5.953 | 0.871 | 0.029 | n/a | 0.150 | 16.934 | n/a | n/a | 0.047 | 155.114 | 0.866 | 0.047 | node-14/thread-0/driver.queue.subject | client.encode 2.193ms; driver.expected-state.bind-receipt 1.324ms; driver.expected-state.bind-receipt 1.305ms; driver.publication 1.296ms; driver.publication 1.296ms |
| cfc1e96bce8d4c960000000000000898 | 176.127 | 6.789 | 0.010 | 0.000 | 49.896 | 109.963 | 1.150 | 0.034 | n/a | 1.335 | 6.925 | n/a | n/a | 0.025 | 56.696 | 0.322 | 0.025 | node-14/thread-0/socket.wait-first-byte | client.parse 5.398ms; driver.publication 2.757ms; driver.publication 2.728ms; driver.publication 2.034ms; driver.expected-state.bind-receipt 1.325ms |
| cfc1e96bce8d4c9600000000000008a1 | 171.326 | 3.410 | 0.004 | 0.000 | 150.092 | 0.633 | 6.198 | 0.032 | n/a | 0.318 | 10.595 | n/a | n/a | 0.044 | 153.506 | 0.896 | 0.044 | node-14/thread-0/driver.queue.scheduler-late | client.parse 5.398ms; driver.publication 3.380ms; driver.publication 2.492ms; driver.publication 2.081ms; driver.publication 2.034ms |
| cfc1e96bce8d4c96000000000000089a | 167.575 | 9.799 | 7.943 | 0.000 | 19.219 | 114.685 | 1.992 | 0.027 | n/a | 0.207 | 13.679 | n/a | n/a | 0.024 | 36.961 | 0.221 | 0.024 | node-14/thread-0/socket.queue-and-write | client.parse 5.398ms; driver.publication 3.380ms; driver.publication 2.757ms; driver.publication 2.034ms; driver.publication 1.237ms |
| cfc1e96bce8d4c960000000000000901 | 161.736 | 5.516 | 0.009 | 0.000 | 21.346 | 37.855 | 1.037 | 9.002 | n/a | 0.042 | 86.878 | n/a | n/a | 0.051 | 26.871 | 0.166 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | client.encode 2.193ms; driver.expected-state.bind-receipt 1.324ms; driver.expected-state.bind-receipt 1.305ms; driver.publication 1.296ms; driver.publication 1.296ms |
| cfc1e96bce8d4c96000000000000088b | 160.721 | 62.587 | 0.014 | 0.000 | 25.196 | 0.678 | 4.928 | 0.060 | n/a | 11.918 | 55.290 | n/a | n/a | 0.050 | 87.797 | 0.546 | 0.050 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 6.566ms; driver.publication 5.315ms; driver.publication 2.538ms; driver.expected-state.bind-receipt 2.495ms; driver.publication 1.823ms |
| cfc1e96bce8d4c9600000000000008ff | 159.855 | 6.437 | 6.082 | 0.000 | 6.201 | 60.941 | 0.849 | 0.023 | n/a | 1.614 | 77.678 | n/a | n/a | 0.030 | 18.720 | 0.117 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | client.encode 2.193ms; driver.expected-state.bind-receipt 1.305ms; driver.publication 1.296ms; driver.publication 0.252ms |
| cfc1e96bce8d4c960000000000000900 | 158.513 | 19.074 | 1.851 | 3.550 | 1.427 | 35.109 | 2.026 | 17.241 | n/a | 0.063 | 78.132 | n/a | n/a | 0.040 | 25.902 | 0.163 | 0.040 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.305ms; driver.publication 1.296ms; driver.publication 1.296ms |
| cfc1e96bce8d4c96000000000000089b | 158.472 | 12.069 | 115.179 | 5.348 | 5.831 | 0.699 | 0.634 | 0.011 | n/a | 1.714 | 16.951 | n/a | n/a | 0.036 | 138.427 | 0.874 | 0.036 | node-14/thread-0/client.commit-send-queue | client.parse 5.398ms; driver.publication 3.380ms; driver.publication 2.757ms; driver.publication 2.034ms; driver.publication 1.237ms |
| cfc1e96bce8d4c9600000000000008a0 | 157.879 | 4.308 | 12.176 | 0.000 | 107.352 | 0.841 | 0.561 | 2.290 | n/a | 0.419 | 29.882 | n/a | n/a | 0.050 | 123.836 | 0.784 | 0.050 | node-14/thread-0/driver.queue.scheduler-late | client.parse 5.398ms; driver.publication 3.380ms; driver.publication 2.757ms; driver.publication 2.492ms; driver.publication 2.081ms |
| cfc1e96bce8d4c960000000000000888 | 154.583 | 13.265 | 3.918 | 0.000 | 17.519 | 32.278 | 42.863 | 0.048 | n/a | 0.292 | 44.363 | n/a | n/a | 0.036 | 34.703 | 0.224 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | client.encode 10.272ms; driver.publication 6.566ms; driver.publication 5.315ms; driver.publication 1.823ms; driver.expected-state.bind-receipt 1.749ms |
| cfc1e96bce8d4c960000000000000899 | 147.837 | 6.190 | 10.460 | 0.000 | 20.104 | 101.952 | 0.653 | 0.513 | n/a | 0.120 | 7.812 | n/a | n/a | 0.033 | 36.754 | 0.249 | 0.033 | node-14/thread-0/socket.wait-first-byte | client.parse 5.398ms; driver.publication 3.380ms; driver.publication 2.757ms; driver.publication 2.034ms; driver.publication 1.237ms |
| cfc1e96bce8d4c96000000000000089f | 147.324 | 5.430 | 11.728 | 0.000 | 107.326 | 6.320 | 0.389 | 0.010 | n/a | 0.510 | 15.559 | n/a | n/a | 0.052 | 124.484 | 0.845 | 0.052 | node-14/thread-0/driver.queue.scheduler-late | client.parse 5.398ms; driver.publication 3.380ms; driver.publication 2.757ms; driver.publication 2.081ms; driver.publication 2.034ms |
| cfc1e96bce8d4c960000000000000887 | 144.419 | 10.735 | 0.011 | 0.000 | 24.111 | 24.542 | 28.829 | 0.057 | n/a | 3.880 | 52.204 | n/a | n/a | 0.050 | 34.858 | 0.241 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | client.encode 10.272ms; driver.publication 1.823ms |
| cfc1e96bce8d4c960000000000000903 | 142.584 | 5.027 | 0.006 | 0.000 | 0.183 | 41.184 | 1.117 | 4.262 | n/a | 0.253 | 90.511 | n/a | n/a | 0.041 | 5.216 | 0.037 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.324ms; driver.expected-state.bind-receipt 1.305ms; driver.publication 1.296ms; driver.publication 1.296ms; driver.publication 1.282ms |
| cfc1e96bce8d4c9600000000000008a2 | 139.560 | 4.275 | 12.534 | 0.000 | 85.570 | 2.441 | 1.603 | 0.958 | n/a | 0.058 | 32.096 | n/a | n/a | 0.025 | 102.380 | 0.734 | 0.025 | node-14/thread-0/driver.queue.scheduler-late | client.parse 5.398ms; driver.publication 3.380ms; driver.publication 2.492ms; driver.publication 2.081ms; driver.publication 1.153ms |

## P2 / L1024 / commit / 5-10 facts (503 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.975 | 0.750 | 0.000 | 1.603 | 3.492 | 0.006 | 0.000 | 0.783 | 1.000 | 1.109 | 0.033 | n/a | 0.289 | 7.514 | n/a | n/a | 0.039 | 4.575 | 0.293 | 0.039 |
| p99 | 159.855 | 2.764 | 0.742 | 5.529 | 10.559 | 11.728 | 0.000 | 85.570 | 28.918 | 11.563 | 5.905 | n/a | 5.000 | 78.773 | n/a | n/a | 0.144 | 123.836 | 0.845 | 0.144 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c960000000000000894 | 249.303 | 1.976 | 0.005 | 0.000 | 212.288 | 3.568 | 1.045 | 0.021 | n/a | 0.314 | 30.061 | n/a | n/a | 0.023 | 214.269 | 0.859 | 0.023 | node-14/thread-0/driver.queue.subject | driver.publication 8.011ms; client.parse 5.398ms; driver.publication 3.380ms; driver.publication 2.757ms; driver.publication 2.492ms |
| cfc1e96bce8d4c960000000000000902 | 179.097 | 5.229 | 0.018 | 0.000 | 149.867 | 5.953 | 0.871 | 0.029 | n/a | 0.150 | 16.934 | n/a | n/a | 0.047 | 155.114 | 0.866 | 0.047 | node-14/thread-0/driver.queue.subject | client.encode 2.193ms; driver.expected-state.bind-receipt 1.324ms; driver.expected-state.bind-receipt 1.305ms; driver.publication 1.296ms; driver.publication 1.296ms |
| cfc1e96bce8d4c9600000000000008a1 | 171.326 | 3.410 | 0.004 | 0.000 | 150.092 | 0.633 | 6.198 | 0.032 | n/a | 0.318 | 10.595 | n/a | n/a | 0.044 | 153.506 | 0.896 | 0.044 | node-14/thread-0/driver.queue.scheduler-late | client.parse 5.398ms; driver.publication 3.380ms; driver.publication 2.492ms; driver.publication 2.081ms; driver.publication 2.034ms |
| cfc1e96bce8d4c960000000000000901 | 161.736 | 5.516 | 0.009 | 0.000 | 21.346 | 37.855 | 1.037 | 9.002 | n/a | 0.042 | 86.878 | n/a | n/a | 0.051 | 26.871 | 0.166 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | client.encode 2.193ms; driver.expected-state.bind-receipt 1.324ms; driver.expected-state.bind-receipt 1.305ms; driver.publication 1.296ms; driver.publication 1.296ms |
| cfc1e96bce8d4c96000000000000088b | 160.721 | 62.587 | 0.014 | 0.000 | 25.196 | 0.678 | 4.928 | 0.060 | n/a | 11.918 | 55.290 | n/a | n/a | 0.050 | 87.797 | 0.546 | 0.050 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 6.566ms; driver.publication 5.315ms; driver.publication 2.538ms; driver.expected-state.bind-receipt 2.495ms; driver.publication 1.823ms |
| cfc1e96bce8d4c9600000000000008ff | 159.855 | 6.437 | 6.082 | 0.000 | 6.201 | 60.941 | 0.849 | 0.023 | n/a | 1.614 | 77.678 | n/a | n/a | 0.030 | 18.720 | 0.117 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | client.encode 2.193ms; driver.expected-state.bind-receipt 1.305ms; driver.publication 1.296ms; driver.publication 0.252ms |
| cfc1e96bce8d4c96000000000000089b | 158.472 | 12.069 | 115.179 | 5.348 | 5.831 | 0.699 | 0.634 | 0.011 | n/a | 1.714 | 16.951 | n/a | n/a | 0.036 | 138.427 | 0.874 | 0.036 | node-14/thread-0/client.commit-send-queue | client.parse 5.398ms; driver.publication 3.380ms; driver.publication 2.757ms; driver.publication 2.034ms; driver.publication 1.237ms |
| cfc1e96bce8d4c9600000000000008a0 | 157.879 | 4.308 | 12.176 | 0.000 | 107.352 | 0.841 | 0.561 | 2.290 | n/a | 0.419 | 29.882 | n/a | n/a | 0.050 | 123.836 | 0.784 | 0.050 | node-14/thread-0/driver.queue.scheduler-late | client.parse 5.398ms; driver.publication 3.380ms; driver.publication 2.757ms; driver.publication 2.492ms; driver.publication 2.081ms |
| cfc1e96bce8d4c960000000000000899 | 147.837 | 6.190 | 10.460 | 0.000 | 20.104 | 101.952 | 0.653 | 0.513 | n/a | 0.120 | 7.812 | n/a | n/a | 0.033 | 36.754 | 0.249 | 0.033 | node-14/thread-0/socket.wait-first-byte | client.parse 5.398ms; driver.publication 3.380ms; driver.publication 2.757ms; driver.publication 2.034ms; driver.publication 1.237ms |
| cfc1e96bce8d4c96000000000000089f | 147.324 | 5.430 | 11.728 | 0.000 | 107.326 | 6.320 | 0.389 | 0.010 | n/a | 0.510 | 15.559 | n/a | n/a | 0.052 | 124.484 | 0.845 | 0.052 | node-14/thread-0/driver.queue.scheduler-late | client.parse 5.398ms; driver.publication 3.380ms; driver.publication 2.757ms; driver.publication 2.081ms; driver.publication 2.034ms |
| cfc1e96bce8d4c9600000000000008a2 | 139.560 | 4.275 | 12.534 | 0.000 | 85.570 | 2.441 | 1.603 | 0.958 | n/a | 0.058 | 32.096 | n/a | n/a | 0.025 | 102.380 | 0.734 | 0.025 | node-14/thread-0/driver.queue.scheduler-late | client.parse 5.398ms; driver.publication 3.380ms; driver.publication 2.492ms; driver.publication 2.081ms; driver.publication 1.153ms |
| cfc1e96bce8d4c960000000000000905 | 136.277 | 3.334 | 0.009 | 0.000 | 28.012 | 2.560 | 0.893 | 0.030 | n/a | 0.213 | 101.198 | n/a | n/a | 0.030 | 31.354 | 0.230 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.324ms; driver.expected-state.bind-receipt 1.305ms; driver.publication 1.296ms; driver.publication 1.296ms; driver.publication 1.282ms |
| cfc1e96bce8d4c960000000000000904 | 135.653 | 5.590 | 0.037 | 0.000 | 0.279 | 24.226 | 5.000 | 10.296 | n/a | 0.063 | 90.097 | n/a | n/a | 0.065 | 5.906 | 0.044 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.324ms; driver.expected-state.bind-receipt 1.305ms; driver.publication 1.296ms; driver.publication 1.296ms; driver.publication 1.282ms |
| cfc1e96bce8d4c960000000000000893 | 108.233 | 6.390 | 0.007 | 0.000 | 1.265 | 71.410 | 1.217 | 0.032 | n/a | 0.469 | 27.409 | n/a | n/a | 0.033 | 7.662 | 0.071 | 0.033 | node-14/thread-0/socket.wait-first-byte | driver.publication 8.011ms; driver.publication 2.757ms; driver.expected-state.bind-receipt 1.325ms; driver.publication 1.237ms; driver.publication 1.205ms |
| cfc1e96bce8d4c96000000000000090a | 106.279 | 2.820 | 0.004 | 0.000 | 1.494 | 3.844 | 0.872 | 0.023 | n/a | 0.134 | 97.061 | n/a | n/a | 0.027 | 4.318 | 0.041 | 0.027 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.324ms; driver.publication 1.296ms; driver.publication 1.282ms; driver.publication 1.237ms; driver.publication 1.233ms |
| cfc1e96bce8d4c960000000000000909 | 102.587 | 3.355 | 0.006 | 0.000 | 0.405 | 0.633 | 1.156 | 0.032 | n/a | 3.671 | 93.284 | n/a | n/a | 0.045 | 3.766 | 0.037 | 0.045 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.324ms; driver.publication 1.296ms; driver.publication 1.282ms; driver.publication 1.233ms; driver.publication 1.221ms |
| cfc1e96bce8d4c9600000000000008a3 | 102.341 | 2.480 | 0.005 | 0.000 | 82.251 | 5.641 | 0.801 | 0.030 | n/a | 0.437 | 10.673 | n/a | n/a | 0.025 | 84.736 | 0.828 | 0.025 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 3.380ms; driver.publication 2.492ms; driver.publication 2.081ms; driver.publication 1.201ms; driver.publication 1.153ms |
| cfc1e96bce8d4c9600000000000007d4 | 101.573 | 8.372 | 0.647 | 0.000 | 0.742 | 11.725 | 1.058 | 0.037 | n/a | 0.187 | 78.773 | n/a | n/a | 0.032 | 9.761 | 0.096 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.913ms; driver.publication 1.495ms; driver.publication 1.248ms; driver.publication 1.093ms; driver.publication 1.037ms |
| cfc1e96bce8d4c9600000000000008a4 | 98.207 | 5.529 | 11.250 | 0.000 | 42.820 | 2.423 | 0.532 | 1.958 | n/a | 0.117 | 33.561 | n/a | n/a | 0.016 | 59.599 | 0.607 | 0.016 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 3.380ms; driver.publication 2.492ms; driver.publication 2.081ms; driver.publication 1.201ms; driver.publication 1.153ms |
| cfc1e96bce8d4c9600000000000007d5 | 92.647 | 3.917 | 4.623 | 0.000 | 1.544 | 4.474 | 1.288 | 0.042 | n/a | 0.664 | 76.053 | n/a | n/a | 0.043 | 10.084 | 0.109 | 0.043 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 1.913ms; driver.publication 1.512ms; driver.publication 1.495ms; driver.publication 1.248ms; driver.publication 1.093ms |

## P2 / outside-phases / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.672 | 0.974 | 0.000 | 1.365 | 3.964 | 0.010 | 0.000 | 3.127 | 2.155 | 3.746 | 0.034 | n/a | 0.296 | 19.725 | n/a | n/a | 0.026 | 8.335 | 0.216 | 0.026 |
| p99 | 88.250 | 1.636 | 0.100 | 2.640 | 6.481 | 0.299 | 0.000 | 30.837 | 5.928 | 12.201 | 4.250 | n/a | 3.999 | 25.184 | n/a | n/a | 0.031 | 37.329 | 0.566 | 0.031 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c960000000000000cc2 | 88.250 | 6.481 | 0.010 | 0.000 | 30.837 | 5.928 | 12.201 | 4.250 | n/a | 3.328 | 25.184 | n/a | n/a | 0.030 | 37.329 | 0.423 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 2.338ms; driver.publication 1.945ms; driver.publication 1.446ms; driver.publication 1.125ms; driver.publication 1.117ms |
| cfc1e96bce8d4c960000000000000cbf | 58.306 | 3.964 | 0.005 | 0.000 | 29.013 | 3.887 | 1.515 | 0.034 | n/a | 3.999 | 15.858 | n/a | n/a | 0.031 | 32.982 | 0.566 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication 2.225ms; driver.publication 1.945ms; driver.publication 1.446ms; driver.publication 1.075ms |
| cfc1e96bce8d4c960000000000000cc1 | 38.672 | 5.358 | 0.299 | 0.000 | 2.679 | 0.640 | 3.746 | 2.849 | n/a | 0.296 | 22.782 | n/a | n/a | 0.024 | 8.335 | 0.216 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.945ms; driver.publication 1.858ms; driver.publication 1.446ms |
| cfc1e96bce8d4c960000000000000cc0 | 33.396 | 3.423 | 0.011 | 0.000 | 3.127 | 2.155 | 4.654 | 0.031 | n/a | 0.245 | 19.725 | n/a | n/a | 0.026 | 6.561 | 0.196 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.225ms; driver.publication 1.945ms; driver.publication 1.446ms |

## P2 / outside-phases / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.672 | 0.974 | 0.000 | 1.365 | 3.964 | 0.011 | 0.000 | 3.127 | 2.155 | 3.746 | 0.034 | n/a | 0.296 | 19.725 | n/a | n/a | 0.026 | 8.335 | 0.216 | 0.026 |
| p99 | 58.306 | 1.636 | 0.100 | 2.640 | 5.358 | 0.299 | 0.000 | 29.013 | 3.887 | 4.654 | 2.849 | n/a | 3.999 | 22.782 | n/a | n/a | 0.031 | 32.982 | 0.566 | 0.031 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c960000000000000cbf | 58.306 | 3.964 | 0.005 | 0.000 | 29.013 | 3.887 | 1.515 | 0.034 | n/a | 3.999 | 15.858 | n/a | n/a | 0.031 | 32.982 | 0.566 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication 2.225ms; driver.publication 1.945ms; driver.publication 1.446ms; driver.publication 1.075ms |
| cfc1e96bce8d4c960000000000000cc1 | 38.672 | 5.358 | 0.299 | 0.000 | 2.679 | 0.640 | 3.746 | 2.849 | n/a | 0.296 | 22.782 | n/a | n/a | 0.024 | 8.335 | 0.216 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.945ms; driver.publication 1.858ms; driver.publication 1.446ms |
| cfc1e96bce8d4c960000000000000cc0 | 33.396 | 3.423 | 0.011 | 0.000 | 3.127 | 2.155 | 4.654 | 0.031 | n/a | 0.245 | 19.725 | n/a | n/a | 0.026 | 6.561 | 0.196 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.225ms; driver.publication 1.945ms; driver.publication 1.446ms |

## P2 / tail / commit (2603 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.775 | 0.883 | 0.000 | 1.822 | 4.185 | 0.006 | 0.000 | 0.856 | 0.853 | 1.357 | 0.034 | n/a | 0.225 | 6.917 | n/a | n/a | 0.039 | 5.490 | 0.347 | 0.039 |
| p99 | 142.846 | 3.737 | 2.413 | 8.194 | 17.426 | 4.294 | 0.000 | 76.886 | 46.073 | 15.124 | 6.561 | n/a | 5.677 | 46.932 | n/a | n/a | 0.119 | 90.186 | 0.793 | 0.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c960000000000001b5b | 379.084 | 11.220 | 49.561 | 0.000 | 253.933 | 29.434 | 1.417 | 9.583 | n/a | 0.042 | 23.864 | n/a | n/a | 0.031 | 314.713 | 0.830 | 0.031 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.502ms; driver.publication 2.212ms; driver.publication 1.611ms; driver.publication 1.530ms; client.parse 1.501ms |
| cfc1e96bce8d4c960000000000001b5c | 271.219 | 7.781 | 5.315 | 0.000 | 113.480 | 120.750 | 0.737 | 0.015 | n/a | 0.112 | 22.991 | n/a | n/a | 0.038 | 126.576 | 0.467 | 0.038 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.611ms; client.parse 1.501ms; driver.publication 1.326ms; driver.publication 1.140ms |
| cfc1e96bce8d4c960000000000001b5d | 268.874 | 8.288 | 2.213 | 2.230 | 105.265 | 124.319 | 0.758 | 0.010 | n/a | 1.781 | 23.984 | n/a | n/a | 0.026 | 117.996 | 0.439 | 0.026 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.611ms; client.parse 1.501ms; driver.publication 1.449ms; driver.publication 1.326ms; driver.publication 1.252ms |
| cfc1e96bce8d4c960000000000001b5e | 256.715 | 9.131 | 2.127 | 2.230 | 96.721 | 118.849 | 0.719 | 3.244 | n/a | 1.187 | 22.478 | n/a | n/a | 0.029 | 110.208 | 0.429 | 0.029 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.611ms; client.parse 1.501ms; driver.publication 1.449ms; driver.publication 1.326ms; driver.publication 1.140ms |
| cfc1e96bce8d4c960000000000001b5a | 253.937 | 5.744 | 0.010 | 0.000 | 127.581 | 108.550 | 1.232 | 0.036 | n/a | 0.225 | 10.516 | n/a | n/a | 0.042 | 133.336 | 0.525 | 0.042 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.611ms; client.parse 1.501ms; driver.publication 1.140ms |
| cfc1e96bce8d4c960000000000001b60 | 250.793 | 6.807 | 14.139 | 0.000 | 174.063 | 20.697 | 2.028 | 8.584 | n/a | 0.095 | 24.332 | n/a | n/a | 0.047 | 195.010 | 0.778 | 0.047 | node-14/thread-0/driver.queue.subject | driver.publication 2.502ms; driver.publication 2.212ms; driver.publication 1.611ms; driver.publication 1.530ms; driver.publication 1.449ms |
| cfc1e96bce8d4c960000000000001b5f | 238.025 | 7.763 | 2.238 | 2.230 | 71.610 | 125.544 | 1.893 | 0.032 | n/a | 2.822 | 23.879 | n/a | n/a | 0.014 | 83.841 | 0.352 | 0.014 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.611ms; driver.publication 1.449ms; driver.publication 1.326ms; driver.publication 1.252ms; driver.publication 1.140ms |
| cfc1e96bce8d4c960000000000001b66 | 209.563 | 2.845 | 16.464 | 0.000 | 152.448 | 4.008 | 0.262 | 9.309 | n/a | 0.018 | 24.172 | n/a | n/a | 0.036 | 171.758 | 0.820 | 0.036 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.212ms; driver.publication 1.530ms; driver.publication 1.449ms; driver.publication 1.326ms; driver.publication 1.252ms |
| cfc1e96bce8d4c960000000000001b6a | 209.354 | 4.356 | 0.003 | 0.000 | 195.182 | 0.273 | 1.010 | 0.018 | n/a | 0.064 | 8.397 | n/a | n/a | 0.051 | 199.541 | 0.953 | 0.051 | node-14/thread-0/driver.queue.subject | driver.publication 2.502ms; driver.publication 2.212ms; driver.publication 1.530ms; driver.publication 1.449ms; driver.publication 1.326ms |
| cfc1e96bce8d4c960000000000000fdc | 200.991 | 2.777 | 0.004 | 0.000 | 188.643 | 0.541 | 1.610 | 0.034 | n/a | 0.164 | 7.188 | n/a | n/a | 0.030 | 191.424 | 0.952 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 7.407ms; driver.publication 4.641ms; driver.publication 4.639ms; driver.publication 4.087ms; driver.publication 3.040ms |
| cfc1e96bce8d4c960000000000000fdb | 196.994 | 5.107 | 0.006 | 0.000 | 175.207 | 8.006 | 2.311 | 0.053 | n/a | 0.317 | 5.959 | n/a | n/a | 0.028 | 180.320 | 0.915 | 0.028 | node-14/thread-0/driver.queue.subject | driver.publication 7.407ms; driver.publication 4.641ms; driver.publication 4.639ms; driver.publication 4.624ms; driver.publication 4.224ms |
| cfc1e96bce8d4c960000000000000fda | 186.623 | 25.233 | 0.007 | 0.000 | 104.067 | 38.099 | 6.069 | 0.038 | n/a | 0.609 | 12.455 | n/a | n/a | 0.047 | 129.306 | 0.693 | 0.047 | node-14/thread-0/driver.queue.subject | driver.publication 7.407ms; driver.publication 6.805ms; driver.publication 4.624ms; driver.publication 4.158ms; driver.publication 4.087ms |
| cfc1e96bce8d4c960000000000001b61 | 168.578 | 8.235 | 2.233 | 2.230 | 3.414 | 127.590 | 0.579 | 2.399 | n/a | 0.750 | 21.131 | n/a | n/a | 0.016 | 16.113 | 0.096 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.449ms; driver.publication 1.326ms; driver.publication 1.252ms; driver.publication 1.140ms; driver.publication 1.050ms |
| cfc1e96bce8d4c960000000000001b6c | 168.261 | 14.739 | 60.060 | 0.000 | 30.607 | 26.100 | 10.070 | 5.443 | n/a | 1.143 | 20.077 | n/a | n/a | 0.022 | 105.406 | 0.626 | 0.022 | node-14/thread-0/client.commit-send-queue | driver.publication 2.502ms; driver.publication 2.212ms; driver.publication 1.530ms; driver.publication 1.449ms; driver.publication 1.326ms |
| cfc1e96bce8d4c960000000000001b65 | 167.814 | 3.594 | 0.007 | 0.000 | 107.413 | 50.913 | 0.833 | 0.028 | n/a | 0.365 | 4.630 | n/a | n/a | 0.031 | 111.013 | 0.662 | 0.031 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.449ms; driver.publication 1.326ms; driver.publication 1.252ms; driver.publication 1.140ms; driver.publication 1.050ms |
| cfc1e96bce8d4c9600000000000013c6 | 164.455 | 17.542 | 0.025 | 0.000 | 8.318 | 39.902 | 25.037 | 1.394 | n/a | 5.677 | 66.456 | n/a | n/a | 0.104 | 25.886 | 0.157 | 0.104 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 7.388ms; driver.publication 5.250ms; driver.publication 4.479ms; driver.publication 4.007ms; driver.publication 1.951ms |
| cfc1e96bce8d4c960000000000001b58 | 164.064 | 14.780 | 0.008 | 0.000 | 7.155 | 132.281 | 1.351 | 0.033 | n/a | 3.875 | 4.536 | n/a | n/a | 0.046 | 21.942 | 0.134 | 0.046 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.381ms; driver.publication 1.611ms; client.parse 1.501ms |
| cfc1e96bce8d4c960000000000001b67 | 159.693 | 6.225 | 2.142 | 0.000 | 97.667 | 42.613 | 1.637 | 0.013 | n/a | 2.668 | 6.711 | n/a | n/a | 0.017 | 106.034 | 0.664 | 0.017 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.449ms; driver.publication 1.326ms; driver.publication 1.252ms; driver.publication 1.140ms; driver.publication 1.050ms |
| cfc1e96bce8d4c960000000000001b56 | 157.238 | 8.322 | 0.009 | 0.000 | 5.250 | 127.059 | 0.891 | 0.031 | n/a | 0.103 | 15.526 | n/a | n/a | 0.048 | 13.581 | 0.086 | 0.048 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.381ms; client.parse 1.501ms |
| cfc1e96bce8d4c960000000000001b69 | 155.016 | 7.804 | 2.777 | 0.000 | 70.747 | 57.482 | 11.698 | 0.022 | n/a | 0.358 | 4.103 | n/a | n/a | 0.025 | 81.328 | 0.525 | 0.025 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.449ms; driver.publication 1.326ms; driver.publication 1.252ms; driver.publication 1.050ms |

## P2 / tail / commit / 5-10 facts (1542 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.593 | 0.712 | 0.000 | 1.639 | 3.613 | 0.006 | 0.000 | 0.875 | 0.813 | 1.179 | 0.033 | n/a | 0.227 | 6.280 | n/a | n/a | 0.039 | 4.801 | 0.339 | 0.039 |
| p99 | 145.387 | 2.753 | 2.213 | 7.625 | 12.897 | 4.433 | 0.000 | 71.610 | 46.382 | 8.391 | 8.241 | n/a | 4.945 | 46.932 | n/a | n/a | 0.119 | 88.916 | 0.805 | 0.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cfc1e96bce8d4c960000000000001b5c | 271.219 | 7.781 | 5.315 | 0.000 | 113.480 | 120.750 | 0.737 | 0.015 | n/a | 0.112 | 22.991 | n/a | n/a | 0.038 | 126.576 | 0.467 | 0.038 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.611ms; client.parse 1.501ms; driver.publication 1.326ms; driver.publication 1.140ms |
| cfc1e96bce8d4c960000000000001b5e | 256.715 | 9.131 | 2.127 | 2.230 | 96.721 | 118.849 | 0.719 | 3.244 | n/a | 1.187 | 22.478 | n/a | n/a | 0.029 | 110.208 | 0.429 | 0.029 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.611ms; client.parse 1.501ms; driver.publication 1.449ms; driver.publication 1.326ms; driver.publication 1.140ms |
| cfc1e96bce8d4c960000000000001b60 | 250.793 | 6.807 | 14.139 | 0.000 | 174.063 | 20.697 | 2.028 | 8.584 | n/a | 0.095 | 24.332 | n/a | n/a | 0.047 | 195.010 | 0.778 | 0.047 | node-14/thread-0/driver.queue.subject | driver.publication 2.502ms; driver.publication 2.212ms; driver.publication 1.611ms; driver.publication 1.530ms; driver.publication 1.449ms |
| cfc1e96bce8d4c960000000000001b5f | 238.025 | 7.763 | 2.238 | 2.230 | 71.610 | 125.544 | 1.893 | 0.032 | n/a | 2.822 | 23.879 | n/a | n/a | 0.014 | 83.841 | 0.352 | 0.014 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.611ms; driver.publication 1.449ms; driver.publication 1.326ms; driver.publication 1.252ms; driver.publication 1.140ms |
| cfc1e96bce8d4c960000000000001b66 | 209.563 | 2.845 | 16.464 | 0.000 | 152.448 | 4.008 | 0.262 | 9.309 | n/a | 0.018 | 24.172 | n/a | n/a | 0.036 | 171.758 | 0.820 | 0.036 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.212ms; driver.publication 1.530ms; driver.publication 1.449ms; driver.publication 1.326ms; driver.publication 1.252ms |
| cfc1e96bce8d4c960000000000000fdc | 200.991 | 2.777 | 0.004 | 0.000 | 188.643 | 0.541 | 1.610 | 0.034 | n/a | 0.164 | 7.188 | n/a | n/a | 0.030 | 191.424 | 0.952 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 7.407ms; driver.publication 4.641ms; driver.publication 4.639ms; driver.publication 4.087ms; driver.publication 3.040ms |
| cfc1e96bce8d4c960000000000000fdb | 196.994 | 5.107 | 0.006 | 0.000 | 175.207 | 8.006 | 2.311 | 0.053 | n/a | 0.317 | 5.959 | n/a | n/a | 0.028 | 180.320 | 0.915 | 0.028 | node-14/thread-0/driver.queue.subject | driver.publication 7.407ms; driver.publication 4.641ms; driver.publication 4.639ms; driver.publication 4.624ms; driver.publication 4.224ms |
| cfc1e96bce8d4c960000000000001b61 | 168.578 | 8.235 | 2.233 | 2.230 | 3.414 | 127.590 | 0.579 | 2.399 | n/a | 0.750 | 21.131 | n/a | n/a | 0.016 | 16.113 | 0.096 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.449ms; driver.publication 1.326ms; driver.publication 1.252ms; driver.publication 1.140ms; driver.publication 1.050ms |
| cfc1e96bce8d4c960000000000001b6c | 168.261 | 14.739 | 60.060 | 0.000 | 30.607 | 26.100 | 10.070 | 5.443 | n/a | 1.143 | 20.077 | n/a | n/a | 0.022 | 105.406 | 0.626 | 0.022 | node-14/thread-0/client.commit-send-queue | driver.publication 2.502ms; driver.publication 2.212ms; driver.publication 1.530ms; driver.publication 1.449ms; driver.publication 1.326ms |
| cfc1e96bce8d4c960000000000001b65 | 167.814 | 3.594 | 0.007 | 0.000 | 107.413 | 50.913 | 0.833 | 0.028 | n/a | 0.365 | 4.630 | n/a | n/a | 0.031 | 111.013 | 0.662 | 0.031 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.449ms; driver.publication 1.326ms; driver.publication 1.252ms; driver.publication 1.140ms; driver.publication 1.050ms |
| cfc1e96bce8d4c960000000000001b56 | 157.238 | 8.322 | 0.009 | 0.000 | 5.250 | 127.059 | 0.891 | 0.031 | n/a | 0.103 | 15.526 | n/a | n/a | 0.048 | 13.581 | 0.086 | 0.048 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.381ms; client.parse 1.501ms |
| cfc1e96bce8d4c960000000000001b69 | 155.016 | 7.804 | 2.777 | 0.000 | 70.747 | 57.482 | 11.698 | 0.022 | n/a | 0.358 | 4.103 | n/a | n/a | 0.025 | 81.328 | 0.525 | 0.025 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.449ms; driver.publication 1.326ms; driver.publication 1.252ms; driver.publication 1.050ms |
| cfc1e96bce8d4c960000000000000e51 | 153.325 | 4.948 | 0.006 | 0.000 | 120.039 | 15.158 | 1.178 | 0.039 | n/a | 0.175 | 11.735 | n/a | n/a | 0.047 | 124.993 | 0.815 | 0.047 | node-14/thread-0/driver.queue.subject | driver.publication 24.441ms; driver.publication 11.803ms; driver.publication 9.800ms; driver.expected-state.bind-receipt 2.104ms; driver.publication 1.802ms |
| cfc1e96bce8d4c960000000000000fd0 | 149.242 | 8.545 | 1.764 | 0.000 | 21.865 | 88.349 | 4.316 | 4.529 | n/a | 0.045 | 19.798 | n/a | n/a | 0.031 | 32.174 | 0.216 | 0.031 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.805ms; driver.expected-state.bind-receipt 5.857ms; driver.publication 4.624ms; driver.publication 4.188ms; driver.publication 4.158ms |
| cfc1e96bce8d4c960000000000001123 | 146.783 | 2.968 | 0.006 | 0.000 | 115.167 | 14.526 | 3.049 | 0.068 | n/a | 6.747 | 4.218 | n/a | n/a | 0.035 | 118.141 | 0.805 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication 3.180ms; driver.publication 2.272ms; driver.publication 2.156ms; driver.publication 1.993ms; driver.publication 1.991ms |
| cfc1e96bce8d4c960000000000001b68 | 145.387 | 5.088 | 2.797 | 0.000 | 82.300 | 43.667 | 0.491 | 3.332 | n/a | 0.086 | 7.610 | n/a | n/a | 0.016 | 90.186 | 0.620 | 0.016 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.449ms; driver.publication 1.326ms; driver.publication 1.252ms; driver.publication 1.050ms |
| cfc1e96bce8d4c960000000000001b77 | 142.846 | 3.585 | 0.008 | 0.000 | 133.219 | 0.510 | 0.780 | 0.025 | n/a | 0.292 | 4.388 | n/a | n/a | 0.038 | 136.812 | 0.958 | 0.038 | node-14/thread-0/driver.queue.subject | driver.publication 2.502ms; driver.publication 2.212ms; driver.publication 1.530ms; driver.publication 1.449ms; driver.publication 1.379ms |
| cfc1e96bce8d4c96000000000000111c | 134.224 | 11.063 | 0.016 | 0.000 | 0.468 | 15.317 | 49.099 | 0.147 | n/a | 3.126 | 54.924 | n/a | n/a | 0.064 | 11.546 | 0.086 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.156ms; driver.publication 2.038ms; driver.expected-state.bind-receipt 1.492ms; driver.publication 1.436ms; driver.publication 1.386ms |
| cfc1e96bce8d4c96000000000000158d | 134.151 | 6.082 | 1.646 | 0.000 | 65.247 | 17.486 | 0.549 | 2.415 | n/a | 0.074 | 40.635 | n/a | n/a | 0.016 | 72.976 | 0.544 | 0.016 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 3.922ms; driver.publication 3.256ms; driver.expected-state.bind-receipt 2.353ms; driver.publication 2.094ms; driver.publication 1.472ms |
| cfc1e96bce8d4c96000000000000158c | 132.721 | 8.467 | 1.202 | 0.000 | 66.115 | 33.156 | 0.726 | 0.014 | n/a | 1.807 | 21.197 | n/a | n/a | 0.035 | 75.785 | 0.571 | 0.035 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 3.256ms; driver.expected-state.bind-receipt 2.353ms; driver.publication 2.094ms; driver.publication 1.472ms; driver.expected-state.bind-receipt 1.164ms |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.537 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.181 | 200.732 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 |
| p99 | 203.923 | n/a | n/a | n/a | 23.029 | n/a | 2.512 | 0.000 | 12.489 | 201.555 | 0.171 | n/a | 0.189 | 0.000 | n/a | n/a | 0.590 | 25.541 | 0.274 | 0.590 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ae6e0d4a9faddca0000000000000006 | 203.923 | 0.000 | n/a | 0.000 | 0.000 | 1.595 | 201.555 | 0.022 | n/a | 0.160 | 0.000 | n/a | n/a | 0.590 | 0.000 | 0.000 | 0.590 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000007 | 203.459 | 0.000 | n/a | 0.000 | 0.000 | 1.447 | 201.341 | 0.056 | n/a | 0.189 | 0.000 | n/a | n/a | 0.427 | 0.000 | 0.000 | 0.427 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000005 | 203.322 | 0.000 | n/a | 0.000 | 0.000 | 1.181 | 201.500 | 0.017 | n/a | 0.152 | 0.000 | n/a | n/a | 0.471 | 0.000 | 0.000 | 0.471 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000eb9 | 201.809 | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 200.932 | 0.004 | n/a | 0.061 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000eb6 | 201.593 | 0.000 | n/a | 0.000 | 0.000 | 0.682 | 200.732 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000eb8 | 201.537 | 0.000 | n/a | 0.000 | 0.000 | 0.739 | 200.611 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000eb7 | 201.451 | 0.000 | n/a | 0.000 | 0.000 | 0.535 | 200.737 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000ebc | 163.608 | 21.911 | n/a | 1.915 | 0.000 | 12.489 | 127.036 | 0.005 | n/a | 0.004 | 0.000 | n/a | n/a | 0.249 | 23.826 | 0.146 | 0.249 | gw-r/thread-65/gateway.admitted-work | none observed |
| bce6f983331d62190000000000000002 | 138.234 | 1.927 | n/a | 0.000 | 0.000 | 1.941 | 133.468 | 0.171 | n/a | 0.166 | 0.000 | n/a | n/a | 0.561 | 1.927 | 0.014 | 0.561 | gw-r/thread-51/gateway.admitted-work | none observed |
| 1ae6e0d4a9faddca0000000000000ebe | 93.258 | 23.029 | n/a | 2.512 | 0.000 | 0.470 | 67.056 | 0.007 | n/a | 0.006 | 0.000 | n/a | n/a | 0.178 | 25.541 | 0.274 | 0.178 | gw-r/thread-65/gateway.admitted-work | none observed |
| 1ae6e0d4a9faddca0000000000000ebd | 82.021 | 18.311 | n/a | 0.000 | 0.000 | 6.363 | 57.147 | 0.007 | n/a | 0.017 | 0.000 | n/a | n/a | 0.176 | 18.311 | 0.223 | 0.176 | gw-r/thread-49/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 871.433 | n/a | n/a | n/a | 3.343 | n/a | 0.000 | 0.000 | 0.774 | 843.027 | 0.012 | n/a | 0.126 | 0.000 | n/a | n/a | 1.468 | 3.343 | 0.031 | 1.468 |
| p99 | 1005.667 | n/a | n/a | n/a | 26.914 | n/a | 0.000 | 0.000 | 1.991 | 1001.597 | 0.017 | n/a | 0.280 | 0.000 | n/a | n/a | 16.805 | 26.914 | 0.164 | 16.805 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bce6f983331d621900000000000000a4 | 1005.667 | 0.319 | n/a | 0.000 | 0.000 | 1.991 | 1001.597 | 0.012 | n/a | 0.280 | 0.000 | n/a | n/a | 1.468 | 0.319 | 0.000 | 1.468 | gw-r/thread-51/journal/page | none observed |
| bce6f983331d621900000000000000a5 | 871.433 | 26.914 | n/a | 0.000 | 0.000 | 0.774 | 843.027 | 0.017 | n/a | 0.126 | 0.000 | n/a | n/a | 0.576 | 26.914 | 0.031 | 0.576 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d62190000000000000839 | 20.422 | 3.343 | n/a | 0.000 | 0.000 | 0.274 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.805 | 3.343 | 0.164 | 16.805 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 431.802 | n/a | n/a | n/a | 4.119 | n/a | 0.000 | 0.000 | 1.157 | 427.790 | 0.018 | n/a | 0.117 | 0.000 | n/a | n/a | 0.143 | 4.119 | 0.010 | 0.143 |
| p99 | 1003.978 | n/a | n/a | n/a | 13.562 | n/a | 0.000 | 0.000 | 3.775 | 996.073 | 0.479 | n/a | 0.281 | 0.000 | n/a | n/a | 8.868 | 13.562 | 0.347 | 8.868 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bce6f983331d621900000000000000bb | 1003.978 | 6.940 | n/a | 0.000 | 0.000 | 3.775 | 992.938 | 0.016 | n/a | 0.096 | 0.000 | n/a | n/a | 0.212 | 6.940 | 0.007 | 0.212 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d621900000000000000cf | 1000.055 | 2.830 | n/a | 0.000 | 0.000 | 0.919 | 996.073 | 0.015 | n/a | 0.128 | 0.000 | n/a | n/a | 0.091 | 2.830 | 0.003 | 0.091 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d621900000000000000b4 | 992.265 | 8.911 | n/a | 0.000 | 0.000 | 3.097 | 979.802 | 0.030 | n/a | 0.216 | 0.000 | n/a | n/a | 0.209 | 8.911 | 0.009 | 0.209 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d621900000000000000ba | 985.162 | 5.987 | n/a | 0.000 | 0.000 | 0.976 | 977.910 | 0.014 | n/a | 0.117 | 0.000 | n/a | n/a | 0.157 | 5.987 | 0.006 | 0.157 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d621900000000000000c5 | 884.587 | 5.332 | n/a | 0.000 | 0.000 | 1.148 | 877.900 | 0.015 | n/a | 0.077 | 0.000 | n/a | n/a | 0.115 | 5.332 | 0.006 | 0.115 | gw-r/thread-48/journal/page | none observed |
| bce6f983331d621900000000000000b2 | 866.584 | 4.666 | n/a | 0.000 | 0.000 | 1.410 | 859.917 | 0.045 | n/a | 0.273 | 0.000 | n/a | n/a | 0.273 | 4.666 | 0.005 | 0.273 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d621900000000000000ae | 833.630 | 1.863 | n/a | 0.000 | 0.000 | 0.733 | 830.806 | 0.028 | n/a | 0.106 | 0.000 | n/a | n/a | 0.094 | 1.863 | 0.002 | 0.094 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d621900000000000000c9 | 807.094 | 2.812 | n/a | 0.000 | 0.000 | 0.787 | 803.080 | 0.195 | n/a | 0.128 | 0.000 | n/a | n/a | 0.093 | 2.812 | 0.003 | 0.093 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d621900000000000000bf | 806.303 | 8.100 | n/a | 0.000 | 0.000 | 1.069 | 792.896 | 0.045 | n/a | 0.247 | 0.000 | n/a | n/a | 3.946 | 8.100 | 0.010 | 3.946 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d621900000000000000ab | 694.102 | 2.806 | n/a | 0.000 | 0.000 | 1.778 | 689.280 | 0.017 | n/a | 0.118 | 0.000 | n/a | n/a | 0.104 | 2.806 | 0.004 | 0.104 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d621900000000000000a8 | 610.534 | 2.849 | n/a | 0.000 | 0.000 | 1.264 | 606.179 | 0.018 | n/a | 0.097 | 0.000 | n/a | n/a | 0.127 | 2.849 | 0.005 | 0.127 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d621900000000000000c1 | 589.518 | 9.681 | n/a | 0.000 | 0.000 | 1.346 | 578.161 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.245 | 9.681 | 0.016 | 0.245 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d621900000000000000a7 | 536.361 | 3.205 | n/a | 0.000 | 0.000 | 1.359 | 531.308 | 0.015 | n/a | 0.143 | 0.000 | n/a | n/a | 0.331 | 3.205 | 0.006 | 0.331 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d621900000000000000b9 | 494.851 | 4.764 | n/a | 0.000 | 0.000 | 0.491 | 489.380 | 0.017 | n/a | 0.071 | 0.000 | n/a | n/a | 0.129 | 4.764 | 0.010 | 0.129 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d621900000000000000ca | 431.802 | 2.595 | n/a | 0.000 | 0.000 | 1.247 | 427.790 | 0.021 | n/a | 0.069 | 0.000 | n/a | n/a | 0.080 | 2.595 | 0.006 | 0.080 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d621900000000000000b6 | 394.983 | 5.830 | n/a | 0.000 | 0.000 | 1.157 | 387.763 | 0.015 | n/a | 0.122 | 0.000 | n/a | n/a | 0.096 | 5.830 | 0.015 | 0.096 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d621900000000000000c2 | 391.351 | 7.369 | n/a | 0.000 | 0.000 | 2.428 | 381.159 | 0.053 | n/a | 0.133 | 0.000 | n/a | n/a | 0.208 | 7.369 | 0.019 | 0.208 | gw-r/thread-48/journal/page | none observed |
| bce6f983331d621900000000000000aa | 330.307 | 2.856 | n/a | 0.000 | 0.000 | 1.228 | 325.917 | 0.012 | n/a | 0.088 | 0.000 | n/a | n/a | 0.206 | 2.856 | 0.009 | 0.206 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d621900000000000000ac | 325.402 | 5.666 | n/a | 0.000 | 0.000 | 0.965 | 318.446 | 0.013 | n/a | 0.112 | 0.000 | n/a | n/a | 0.200 | 5.666 | 0.017 | 0.200 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d621900000000000000cc | 274.709 | 4.119 | n/a | 0.000 | 0.000 | 1.140 | 268.704 | 0.479 | n/a | 0.119 | 0.000 | n/a | n/a | 0.149 | 4.119 | 0.015 | 0.149 | gw-r/thread-44/journal/page | none observed |

## P3 / L1 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 337.042 | n/a | n/a | n/a | 3.407 | n/a | 0.000 | 0.000 | 0.878 | 331.665 | 0.019 | n/a | 0.094 | 0.000 | n/a | n/a | 0.162 | 3.407 | 0.012 | 0.162 |
| p99 | 1007.894 | n/a | n/a | n/a | 13.486 | n/a | 1.285 | 0.000 | 3.182 | 1003.448 | 0.696 | n/a | 0.228 | 0.000 | n/a | n/a | 42.846 | 13.486 | 0.506 | 42.846 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bce6f983331d621900000000000000d1 | 1007.894 | 3.427 | n/a | 0.000 | 0.000 | 0.706 | 1003.448 | 0.018 | n/a | 0.105 | 0.000 | n/a | n/a | 0.189 | 3.427 | 0.003 | 0.189 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d621900000000000000d0 | 1004.525 | 3.217 | n/a | 0.000 | 0.000 | 1.046 | 999.991 | 0.016 | n/a | 0.157 | 0.000 | n/a | n/a | 0.099 | 3.217 | 0.003 | 0.099 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d621900000000000000d7 | 1004.373 | 0.148 | n/a | 0.000 | 0.000 | 1.472 | 1001.365 | 0.020 | n/a | 0.156 | 0.000 | n/a | n/a | 1.212 | 0.148 | 0.000 | 1.212 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d621900000000000000dd | 1004.285 | 0.192 | n/a | 0.000 | 0.000 | 1.941 | 1001.810 | 0.026 | n/a | 0.213 | 0.000 | n/a | n/a | 0.104 | 0.192 | 0.000 | 0.104 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d621900000000000000e4 | 1003.645 | 0.204 | n/a | 0.000 | 0.000 | 0.603 | 1001.440 | 0.048 | n/a | 0.170 | 0.000 | n/a | n/a | 1.181 | 0.204 | 0.000 | 1.181 | gw-r/thread-48/journal/page | none observed |
| bce6f983331d62190000000000000102 | 1003.363 | 0.147 | n/a | 0.000 | 0.000 | 1.038 | 1000.939 | 0.013 | n/a | 0.105 | 0.000 | n/a | n/a | 1.120 | 0.147 | 0.000 | 1.120 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d62190000000000000107 | 994.825 | 2.864 | n/a | 0.000 | 0.000 | 2.244 | 989.485 | 0.018 | n/a | 0.105 | 0.000 | n/a | n/a | 0.109 | 2.864 | 0.003 | 0.109 | gw-r/thread-46/journal/page | none observed |
| bce6f983331d6219000000000000010f | 987.629 | 2.704 | n/a | 0.000 | 0.000 | 0.878 | 983.728 | 0.036 | n/a | 0.207 | 0.000 | n/a | n/a | 0.077 | 2.704 | 0.003 | 0.077 | gw-r/thread-51/journal/page | none observed |
| bce6f983331d621900000000000000d9 | 964.384 | 10.912 | n/a | 0.000 | 0.000 | 1.107 | 951.683 | 0.017 | n/a | 0.094 | 0.000 | n/a | n/a | 0.570 | 10.912 | 0.011 | 0.570 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d621900000000000000df | 947.163 | 4.998 | n/a | 0.000 | 0.000 | 0.540 | 941.309 | 0.026 | n/a | 0.080 | 0.000 | n/a | n/a | 0.209 | 4.998 | 0.005 | 0.209 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d621900000000000000ff | 813.323 | 8.058 | n/a | 0.000 | 0.000 | 0.758 | 804.118 | 0.095 | n/a | 0.123 | 0.000 | n/a | n/a | 0.171 | 8.058 | 0.010 | 0.171 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d621900000000000000dc | 645.346 | 3.637 | n/a | 0.000 | 0.000 | 0.894 | 640.568 | 0.015 | n/a | 0.080 | 0.000 | n/a | n/a | 0.153 | 3.637 | 0.006 | 0.153 | gw-r/thread-48/journal/page | none observed |
| bce6f983331d621900000000000000e0 | 639.006 | 4.872 | n/a | 0.000 | 0.000 | 2.904 | 630.603 | 0.212 | n/a | 0.112 | 0.000 | n/a | n/a | 0.303 | 4.872 | 0.008 | 0.303 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d62190000000000000104 | 611.877 | 2.442 | n/a | 0.000 | 0.000 | 0.870 | 608.314 | 0.014 | n/a | 0.134 | 0.000 | n/a | n/a | 0.103 | 2.442 | 0.004 | 0.103 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d621900000000000000e9 | 586.834 | 9.987 | n/a | 1.285 | 0.000 | 0.548 | 574.808 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.131 | 11.272 | 0.019 | 0.131 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d621900000000000000fd | 576.813 | 3.280 | n/a | 0.000 | 0.000 | 1.267 | 571.855 | 0.235 | n/a | 0.085 | 0.000 | n/a | n/a | 0.091 | 3.280 | 0.006 | 0.091 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d621900000000000000ec | 482.466 | 4.220 | n/a | 0.000 | 0.000 | 1.013 | 476.909 | 0.024 | n/a | 0.118 | 0.000 | n/a | n/a | 0.181 | 4.220 | 0.009 | 0.181 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d62190000000000000109 | 461.929 | 13.486 | n/a | 0.000 | 0.000 | 1.387 | 446.819 | 0.014 | n/a | 0.090 | 0.000 | n/a | n/a | 0.134 | 13.486 | 0.029 | 0.134 | gw-r/thread-46/journal/page | none observed |
| bce6f983331d621900000000000000d4 | 442.872 | 3.407 | n/a | 0.000 | 0.000 | 1.716 | 437.548 | 0.019 | n/a | 0.067 | 0.000 | n/a | n/a | 0.115 | 3.407 | 0.008 | 0.115 | gw-r/thread-48/journal/page | none observed |
| bce6f983331d621900000000000000fc | 435.109 | 9.908 | n/a | 0.000 | 0.000 | 2.778 | 422.004 | 0.040 | n/a | 0.086 | 0.000 | n/a | n/a | 0.294 | 9.908 | 0.023 | 0.294 | gw-r/thread-49/journal/page | none observed |

## P3 / L4 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 456.167 | n/a | n/a | n/a | 3.292 | n/a | 0.000 | 0.000 | 0.786 | 451.276 | 0.011 | n/a | 0.065 | 0.000 | n/a | n/a | 0.116 | 3.292 | 0.008 | 0.116 |
| p99 | 1004.162 | n/a | n/a | n/a | 8.747 | n/a | 0.000 | 0.000 | 4.199 | 1001.295 | 0.328 | n/a | 0.115 | 0.000 | n/a | n/a | 43.670 | 8.747 | 0.195 | 43.670 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bce6f983331d62190000000000000116 | 1004.162 | 0.327 | n/a | 0.000 | 0.000 | 1.223 | 1001.295 | 0.010 | n/a | 0.115 | 0.000 | n/a | n/a | 1.192 | 0.327 | 0.000 | 1.192 | gw-r/thread-48/journal/page | none observed |
| bce6f983331d62190000000000000143 | 1003.163 | 0.121 | n/a | 0.000 | 0.000 | 0.786 | 1001.055 | 0.007 | n/a | 0.088 | 0.000 | n/a | n/a | 1.105 | 0.121 | 0.000 | 1.105 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d62190000000000000128 | 1001.955 | 0.331 | n/a | 0.000 | 0.000 | 0.654 | 1000.764 | 0.011 | n/a | 0.060 | 0.000 | n/a | n/a | 0.135 | 0.331 | 0.000 | 0.135 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d6219000000000000013a | 1000.859 | 3.990 | n/a | 0.000 | 0.000 | 2.558 | 993.937 | 0.155 | n/a | 0.068 | 0.000 | n/a | n/a | 0.152 | 3.990 | 0.004 | 0.152 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d6219000000000000012d | 998.926 | 6.146 | n/a | 0.000 | 0.000 | 0.991 | 991.494 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.245 | 6.146 | 0.006 | 0.245 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d6219000000000000012e | 985.611 | 2.781 | n/a | 0.000 | 0.000 | 0.958 | 981.712 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.094 | 2.781 | 0.003 | 0.094 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d6219000000000000011f | 981.906 | 4.060 | n/a | 0.000 | 0.000 | 0.705 | 976.634 | 0.069 | n/a | 0.070 | 0.000 | n/a | n/a | 0.368 | 4.060 | 0.004 | 0.368 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d6219000000000000014b | 911.397 | 3.292 | n/a | 0.000 | 0.000 | 1.142 | 906.754 | 0.019 | n/a | 0.077 | 0.000 | n/a | n/a | 0.113 | 3.292 | 0.004 | 0.113 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d62190000000000000135 | 856.772 | 2.392 | n/a | 0.000 | 0.000 | 0.852 | 853.382 | 0.011 | n/a | 0.054 | 0.000 | n/a | n/a | 0.081 | 2.392 | 0.003 | 0.081 | gw-r/thread-51/journal/page | none observed |
| bce6f983331d62190000000000000126 | 847.792 | 3.229 | n/a | 0.000 | 0.000 | 0.394 | 843.763 | 0.187 | n/a | 0.050 | 0.000 | n/a | n/a | 0.169 | 3.229 | 0.004 | 0.169 | gw-r/thread-46/journal/page | none observed |
| bce6f983331d62190000000000000130 | 827.062 | 2.483 | n/a | 0.000 | 0.000 | 0.731 | 823.538 | 0.163 | n/a | 0.057 | 0.000 | n/a | n/a | 0.091 | 2.483 | 0.003 | 0.091 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d6219000000000000013f | 777.585 | 3.713 | n/a | 0.000 | 0.000 | 2.512 | 771.140 | 0.015 | n/a | 0.081 | 0.000 | n/a | n/a | 0.123 | 3.713 | 0.005 | 0.123 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d62190000000000000113 | 665.552 | 5.420 | n/a | 0.000 | 0.000 | 0.801 | 659.095 | 0.018 | n/a | 0.103 | 0.000 | n/a | n/a | 0.116 | 5.420 | 0.008 | 0.116 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d6219000000000000013d | 603.920 | 2.534 | n/a | 0.000 | 0.000 | 0.732 | 600.485 | 0.015 | n/a | 0.072 | 0.000 | n/a | n/a | 0.082 | 2.534 | 0.004 | 0.082 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d62190000000000000120 | 581.949 | 2.195 | n/a | 0.000 | 0.000 | 1.895 | 577.661 | 0.029 | n/a | 0.098 | 0.000 | n/a | n/a | 0.072 | 2.195 | 0.004 | 0.072 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d6219000000000000011d | 561.906 | 6.221 | n/a | 0.000 | 0.000 | 0.801 | 554.596 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.215 | 6.221 | 0.011 | 0.215 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d62190000000000000137 | 525.292 | 2.430 | n/a | 0.000 | 0.000 | 0.604 | 522.060 | 0.008 | n/a | 0.078 | 0.000 | n/a | n/a | 0.113 | 2.430 | 0.005 | 0.113 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d62190000000000000110 | 521.084 | 2.657 | n/a | 0.000 | 0.000 | 0.811 | 517.366 | 0.035 | n/a | 0.084 | 0.000 | n/a | n/a | 0.131 | 2.657 | 0.005 | 0.131 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d6219000000000000012a | 506.540 | 4.073 | n/a | 0.000 | 0.000 | 1.524 | 500.704 | 0.103 | n/a | 0.060 | 0.000 | n/a | n/a | 0.074 | 4.073 | 0.008 | 0.074 | gw-r/thread-51/journal/page | none observed |
| bce6f983331d62190000000000000111 | 502.273 | 6.196 | n/a | 0.000 | 0.000 | 1.275 | 494.412 | 0.010 | n/a | 0.095 | 0.000 | n/a | n/a | 0.286 | 6.196 | 0.012 | 0.286 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 378.697 | n/a | n/a | n/a | 3.663 | n/a | 0.000 | 0.000 | 0.688 | 368.302 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.121 | 3.663 | 0.008 | 0.121 |
| p99 | 1004.555 | n/a | n/a | n/a | 7.931 | n/a | 1.348 | 0.000 | 3.641 | 1001.765 | 0.426 | n/a | 0.167 | 0.000 | n/a | n/a | 42.284 | 9.247 | 0.702 | 42.284 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bce6f983331d62190000000000000157 | 1004.555 | 0.264 | n/a | 0.000 | 0.000 | 1.221 | 1001.765 | 0.027 | n/a | 0.101 | 0.000 | n/a | n/a | 1.177 | 0.264 | 0.000 | 1.177 | gw-r/thread-51/journal/page | none observed |
| bce6f983331d62190000000000000171 | 1004.042 | 0.343 | n/a | 0.000 | 0.000 | 1.170 | 1001.206 | 0.014 | n/a | 0.088 | 0.000 | n/a | n/a | 1.221 | 0.343 | 0.000 | 1.221 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d62190000000000000188 | 1003.052 | 0.163 | n/a | 0.000 | 0.000 | 0.886 | 1000.800 | 0.006 | n/a | 0.078 | 0.000 | n/a | n/a | 1.118 | 0.163 | 0.000 | 1.118 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d62190000000000000178 | 999.638 | 2.939 | n/a | 0.000 | 0.000 | 0.564 | 995.981 | 0.010 | n/a | 0.051 | 0.000 | n/a | n/a | 0.093 | 2.939 | 0.003 | 0.093 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d6219000000000000018a | 998.465 | 4.974 | n/a | 0.000 | 0.000 | 1.409 | 991.795 | 0.133 | n/a | 0.062 | 0.000 | n/a | n/a | 0.092 | 4.974 | 0.005 | 0.092 | gw-r/thread-46/journal/page | none observed |
| bce6f983331d62190000000000000168 | 990.504 | 3.213 | n/a | 0.000 | 0.000 | 0.767 | 986.253 | 0.040 | n/a | 0.147 | 0.000 | n/a | n/a | 0.084 | 3.213 | 0.003 | 0.084 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d62190000000000000180 | 990.504 | 3.285 | n/a | 0.000 | 0.000 | 0.724 | 985.975 | 0.249 | n/a | 0.097 | 0.000 | n/a | n/a | 0.174 | 3.285 | 0.003 | 0.174 | gw-r/thread-46/journal/page | none observed |
| bce6f983331d6219000000000000017d | 959.079 | 5.023 | n/a | 0.000 | 0.000 | 0.917 | 952.961 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.096 | 5.023 | 0.005 | 0.096 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d6219000000000000015e | 836.296 | 4.800 | n/a | 0.000 | 0.000 | 0.926 | 830.347 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.153 | 4.800 | 0.006 | 0.153 | gw-r/thread-51/journal/page | none observed |
| bce6f983331d62190000000000000170 | 804.828 | 6.358 | n/a | 0.000 | 0.000 | 0.572 | 797.251 | 0.426 | n/a | 0.102 | 0.000 | n/a | n/a | 0.120 | 6.358 | 0.008 | 0.120 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d62190000000000000182 | 772.287 | 5.586 | n/a | 0.000 | 0.000 | 0.560 | 765.776 | 0.015 | n/a | 0.167 | 0.000 | n/a | n/a | 0.182 | 5.586 | 0.007 | 0.182 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d6219000000000000018c | 756.240 | 3.974 | n/a | 0.000 | 0.000 | 0.768 | 751.299 | 0.010 | n/a | 0.096 | 0.000 | n/a | n/a | 0.093 | 3.974 | 0.005 | 0.093 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d6219000000000000017a | 755.339 | 2.523 | n/a | 0.000 | 0.000 | 0.524 | 752.113 | 0.030 | n/a | 0.057 | 0.000 | n/a | n/a | 0.093 | 2.523 | 0.003 | 0.093 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d62190000000000000187 | 747.982 | 5.046 | n/a | 0.000 | 0.000 | 1.020 | 741.540 | 0.083 | n/a | 0.077 | 0.000 | n/a | n/a | 0.216 | 5.046 | 0.007 | 0.216 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d62190000000000000175 | 610.495 | 2.520 | n/a | 0.000 | 0.000 | 3.641 | 604.138 | 0.011 | n/a | 0.084 | 0.000 | n/a | n/a | 0.101 | 2.520 | 0.004 | 0.101 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d62190000000000000155 | 561.146 | 4.009 | n/a | 0.000 | 0.000 | 1.130 | 555.832 | 0.017 | n/a | 0.058 | 0.000 | n/a | n/a | 0.100 | 4.009 | 0.007 | 0.100 | gw-r/thread-51/journal/page | none observed |
| bce6f983331d6219000000000000016a | 524.497 | 4.373 | n/a | 0.000 | 0.000 | 1.038 | 518.933 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.073 | 4.373 | 0.008 | 0.073 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d62190000000000000159 | 504.231 | 2.116 | n/a | 0.000 | 0.000 | 0.580 | 501.366 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.106 | 2.116 | 0.004 | 0.106 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d62190000000000000166 | 472.774 | 3.368 | n/a | 0.000 | 0.000 | 0.978 | 468.259 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.103 | 3.368 | 0.007 | 0.103 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d62190000000000000150 | 471.039 | 3.919 | n/a | 0.000 | 0.000 | 0.748 | 466.163 | 0.005 | n/a | 0.083 | 0.000 | n/a | n/a | 0.121 | 3.919 | 0.008 | 0.121 | gw-r/thread-50/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 335.326 | n/a | n/a | n/a | 3.561 | n/a | 0.000 | 0.000 | 0.687 | 328.485 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 0.110 | 3.561 | 0.011 | 0.110 |
| p99 | 1007.797 | n/a | n/a | n/a | 11.357 | n/a | 1.848 | 0.000 | 3.410 | 1001.616 | 0.857 | n/a | 0.094 | 0.000 | n/a | n/a | 48.490 | 11.357 | 0.583 | 48.490 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bce6f983331d621900000000000001a9 | 1007.797 | 5.373 | n/a | 0.000 | 0.000 | 0.607 | 1001.616 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.147 | 5.373 | 0.005 | 0.147 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d6219000000000000018e | 1003.360 | 3.760 | n/a | 0.000 | 0.000 | 0.583 | 998.546 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.366 | 3.760 | 0.004 | 0.366 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d621900000000000001c6 | 1002.892 | 0.198 | n/a | 0.000 | 0.000 | 0.698 | 1000.748 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 1.178 | 0.198 | 0.000 | 1.178 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d621900000000000001aa | 987.469 | 5.320 | n/a | 0.000 | 0.000 | 0.532 | 981.207 | 0.218 | n/a | 0.042 | 0.000 | n/a | n/a | 0.149 | 5.320 | 0.005 | 0.149 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d621900000000000001c8 | 969.348 | 3.027 | n/a | 0.000 | 0.000 | 0.847 | 965.208 | 0.115 | n/a | 0.074 | 0.000 | n/a | n/a | 0.077 | 3.027 | 0.003 | 0.077 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d621900000000000001a8 | 962.146 | 5.884 | n/a | 0.000 | 0.000 | 0.734 | 955.209 | 0.095 | n/a | 0.052 | 0.000 | n/a | n/a | 0.171 | 5.884 | 0.006 | 0.171 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d621900000000000001c5 | 956.468 | 2.969 | n/a | 0.000 | 0.000 | 0.770 | 952.578 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.083 | 2.969 | 0.003 | 0.083 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d6219000000000000019d | 857.303 | 1.775 | n/a | 0.000 | 0.000 | 2.225 | 853.157 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.079 | 1.775 | 0.002 | 0.079 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d621900000000000001b8 | 844.954 | 5.636 | n/a | 0.000 | 0.000 | 0.805 | 838.275 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.192 | 5.636 | 0.007 | 0.192 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d621900000000000001d1 | 741.542 | 4.365 | n/a | 0.000 | 0.000 | 0.520 | 736.535 | 0.009 | n/a | 0.043 | 0.000 | n/a | n/a | 0.070 | 4.365 | 0.006 | 0.070 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d621900000000000001a0 | 723.472 | 5.891 | n/a | 0.000 | 0.000 | 3.410 | 714.063 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.073 | 5.891 | 0.008 | 0.073 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d6219000000000000019b | 661.762 | 2.396 | n/a | 0.000 | 0.000 | 0.421 | 658.799 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.078 | 2.396 | 0.004 | 0.078 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d621900000000000001bb | 597.484 | 6.814 | n/a | 0.000 | 0.000 | 0.960 | 589.186 | 0.170 | n/a | 0.051 | 0.000 | n/a | n/a | 0.304 | 6.814 | 0.011 | 0.304 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d621900000000000001d8 | 586.999 | 3.561 | n/a | 0.000 | 0.000 | 0.740 | 581.626 | 0.857 | n/a | 0.090 | 0.000 | n/a | n/a | 0.125 | 3.561 | 0.006 | 0.125 | gw-r/thread-51/journal/page | none observed |
| bce6f983331d621900000000000001d5 | 522.056 | 3.013 | n/a | 0.000 | 0.000 | 0.606 | 518.264 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.119 | 3.013 | 0.006 | 0.119 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d621900000000000001b0 | 503.945 | 3.046 | n/a | 0.000 | 0.000 | 0.441 | 500.227 | 0.110 | n/a | 0.044 | 0.000 | n/a | n/a | 0.076 | 3.046 | 0.006 | 0.076 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d621900000000000001a3 | 463.563 | 4.420 | n/a | 0.000 | 0.000 | 0.839 | 458.088 | 0.013 | n/a | 0.077 | 0.000 | n/a | n/a | 0.126 | 4.420 | 0.010 | 0.126 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d621900000000000001d6 | 462.012 | 2.522 | n/a | 0.000 | 0.000 | 1.705 | 457.639 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.078 | 2.522 | 0.005 | 0.078 | gw-r/thread-46/journal/page | none observed |
| bce6f983331d621900000000000001c9 | 454.838 | 4.066 | n/a | 0.000 | 0.000 | 0.725 | 449.750 | 0.157 | n/a | 0.031 | 0.000 | n/a | n/a | 0.110 | 4.066 | 0.009 | 0.110 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d621900000000000001ca | 445.928 | 8.910 | n/a | 1.848 | 0.000 | 0.738 | 434.156 | 0.019 | n/a | 0.059 | 0.000 | n/a | n/a | 0.199 | 10.758 | 0.024 | 0.199 | gw-r/thread-65/journal/page | none observed |

## P3 / L256 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 436.657 | n/a | n/a | n/a | 3.945 | n/a | 0.000 | 0.000 | 0.668 | 433.961 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.130 | 4.600 | 0.010 | 0.130 |
| p99 | 1008.381 | n/a | n/a | n/a | 17.362 | n/a | 2.300 | 0.000 | 2.961 | 1001.219 | 0.303 | n/a | 0.086 | 0.000 | n/a | n/a | 23.363 | 19.661 | 0.741 | 23.363 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bce6f983331d6219000000000000021b | 1008.381 | 5.759 | n/a | 1.110 | 0.000 | 0.766 | 1000.346 | 0.017 | n/a | 0.047 | 0.000 | n/a | n/a | 0.336 | 6.869 | 0.007 | 0.336 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d621900000000000001fb | 1004.748 | 0.139 | n/a | 0.000 | 0.000 | 0.890 | 1001.219 | 0.022 | n/a | 0.086 | 0.000 | n/a | n/a | 2.391 | 0.139 | 0.000 | 2.391 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d6219000000000000021a | 1001.842 | 3.126 | n/a | 0.000 | 0.000 | 1.756 | 996.782 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.126 | 3.126 | 0.003 | 0.126 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d62190000000000000219 | 997.642 | 3.971 | n/a | 0.705 | 0.000 | 0.646 | 992.134 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.137 | 4.677 | 0.005 | 0.137 | gw-r/thread-51/journal/page | none observed |
| bce6f983331d62190000000000000215 | 997.069 | 3.322 | n/a | 0.766 | 0.000 | 0.691 | 992.108 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.106 | 4.088 | 0.004 | 0.106 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d621900000000000001ed | 991.026 | 5.168 | n/a | 0.000 | 0.000 | 0.665 | 984.932 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.206 | 5.168 | 0.005 | 0.206 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d62190000000000000202 | 982.682 | 3.740 | n/a | 0.680 | 0.000 | 0.809 | 977.151 | 0.135 | n/a | 0.036 | 0.000 | n/a | n/a | 0.130 | 4.421 | 0.004 | 0.130 | gw-r/thread-51/journal/page | none observed |
| bce6f983331d6219000000000000020b | 965.222 | 6.477 | n/a | 0.706 | 0.000 | 0.846 | 956.982 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.167 | 7.184 | 0.007 | 0.167 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d62190000000000000216 | 873.258 | 17.362 | n/a | 2.300 | 0.000 | 0.704 | 852.670 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.167 | 19.661 | 0.023 | 0.167 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d621900000000000001f7 | 869.954 | 5.386 | n/a | 0.000 | 0.000 | 0.668 | 863.755 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.080 | 5.386 | 0.006 | 0.080 | gw-r/thread-51/journal/page | none observed |
| bce6f983331d621900000000000001eb | 851.394 | 2.535 | n/a | 0.000 | 0.000 | 0.519 | 848.160 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.117 | 2.535 | 0.003 | 0.117 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d62190000000000000213 | 678.457 | 4.061 | n/a | 0.689 | 0.000 | 0.412 | 673.140 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.122 | 4.750 | 0.007 | 0.122 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d621900000000000001f1 | 663.281 | 3.594 | n/a | 0.000 | 0.000 | 1.073 | 658.481 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.063 | 3.594 | 0.005 | 0.063 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d62190000000000000203 | 622.640 | 3.270 | n/a | 0.656 | 0.000 | 0.718 | 617.703 | 0.141 | n/a | 0.039 | 0.000 | n/a | n/a | 0.115 | 3.926 | 0.006 | 0.115 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d62190000000000000206 | 574.481 | 3.642 | n/a | 1.133 | 0.000 | 1.140 | 568.210 | 0.180 | n/a | 0.046 | 0.000 | n/a | n/a | 0.130 | 4.775 | 0.008 | 0.130 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d621900000000000001df | 570.766 | 5.501 | n/a | 0.000 | 0.000 | 0.438 | 564.406 | 0.189 | n/a | 0.048 | 0.000 | n/a | n/a | 0.184 | 5.501 | 0.010 | 0.184 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d621900000000000001f3 | 569.943 | 2.823 | n/a | 0.000 | 0.000 | 0.549 | 566.032 | 0.016 | n/a | 0.059 | 0.000 | n/a | n/a | 0.464 | 2.823 | 0.005 | 0.464 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d621900000000000001e0 | 531.441 | 5.435 | n/a | 0.000 | 0.000 | 1.160 | 524.469 | 0.023 | n/a | 0.071 | 0.000 | n/a | n/a | 0.283 | 5.435 | 0.010 | 0.283 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d621900000000000001e6 | 531.071 | 5.509 | n/a | 0.000 | 0.000 | 2.961 | 522.362 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.159 | 5.509 | 0.010 | 0.159 | gw-r/thread-46/journal/page | none observed |
| bce6f983331d621900000000000001e4 | 459.915 | 6.431 | n/a | 0.000 | 0.000 | 0.846 | 452.384 | 0.011 | n/a | 0.060 | 0.000 | n/a | n/a | 0.183 | 6.431 | 0.014 | 0.183 | gw-r/thread-49/journal/page | none observed |

## P3 / L1024 / internal (747 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.759 | n/a | n/a | n/a | 3.572 | n/a | 0.000 | 0.000 | 0.269 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.481 | 3.572 | 0.293 | 7.481 |
| p99 | 307.409 | n/a | n/a | n/a | 16.937 | n/a | 1.409 | 0.000 | 1.219 | 304.165 | 0.152 | n/a | 0.062 | 0.000 | n/a | n/a | 48.395 | 17.109 | 0.835 | 48.395 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bce6f983331d62190000000000000227 | 969.660 | 7.202 | n/a | 1.202 | 0.000 | 0.702 | 960.249 | 0.011 | n/a | 0.038 | 0.000 | n/a | n/a | 0.256 | 8.405 | 0.009 | 0.256 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d62190000000000000228 | 694.328 | 4.909 | n/a | 0.000 | 0.000 | 1.023 | 688.174 | 0.019 | n/a | 0.068 | 0.000 | n/a | n/a | 0.135 | 4.909 | 0.007 | 0.135 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d6219000000000000021c | 683.205 | 2.164 | n/a | 0.000 | 0.000 | 0.527 | 680.412 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.066 | 2.164 | 0.003 | 0.066 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d6219000000000000021f | 533.698 | 2.224 | n/a | 0.000 | 0.000 | 1.877 | 529.485 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.071 | 2.224 | 0.004 | 0.071 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d62190000000000000225 | 452.539 | 3.857 | n/a | 0.000 | 0.000 | 3.090 | 445.351 | 0.011 | n/a | 0.058 | 0.000 | n/a | n/a | 0.171 | 3.857 | 0.009 | 0.171 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d62190000000000000224 | 427.404 | 6.142 | n/a | 0.000 | 0.000 | 0.962 | 419.977 | 0.010 | n/a | 0.045 | 0.000 | n/a | n/a | 0.268 | 6.142 | 0.014 | 0.268 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d62190000000000000222 | 337.225 | 7.608 | n/a | 0.000 | 0.000 | 0.940 | 328.353 | 0.017 | n/a | 0.071 | 0.000 | n/a | n/a | 0.236 | 7.608 | 0.023 | 0.236 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d6219000000000000021d | 307.409 | 2.662 | n/a | 0.000 | 0.000 | 0.425 | 304.165 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.113 | 2.662 | 0.009 | 0.113 | gw-r/thread-51/journal/page | none observed |
| bce6f983331d62190000000000000220 | 274.639 | 15.691 | n/a | 0.000 | 0.000 | 0.949 | 257.584 | 0.223 | n/a | 0.039 | 0.000 | n/a | n/a | 0.153 | 15.691 | 0.057 | 0.153 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d62190000000000000460 | 208.227 | 30.021 | n/a | 0.000 | 0.000 | 1.565 | 176.063 | 0.300 | n/a | 0.069 | 0.000 | n/a | n/a | 0.208 | 30.021 | 0.144 | 0.208 | gw-r/thread-46/gateway.admitted-work | none observed |
| bce6f983331d62190000000000000478 | 118.550 | 4.332 | n/a | 0.000 | 0.000 | 0.651 | 113.409 | 0.004 | n/a | 0.062 | 0.000 | n/a | n/a | 0.092 | 4.332 | 0.037 | 0.092 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d62190000000000000316 | 103.974 | 2.495 | n/a | 0.000 | 0.000 | 0.785 | 100.576 | 0.010 | n/a | 0.035 | 0.000 | n/a | n/a | 0.073 | 2.495 | 0.024 | 0.073 | gw-r/thread-46/journal/page | none observed |
| bce6f983331d621900000000000002f9 | 86.242 | 7.128 | n/a | 0.000 | 0.000 | 1.219 | 77.578 | 0.198 | n/a | 0.018 | 0.000 | n/a | n/a | 0.102 | 7.128 | 0.083 | 0.102 | gw-r/thread-46/journal/page | none observed |
| bce6f983331d6219000000000000078f | 85.259 | 3.087 | n/a | 0.000 | 0.000 | 0.499 | 81.465 | 0.013 | n/a | 0.032 | 0.000 | n/a | n/a | 0.162 | 3.087 | 0.036 | 0.162 | gw-r/thread-46/journal/page | none observed |
| bce6f983331d6219000000000000062c | 79.992 | 3.607 | n/a | 0.000 | 0.000 | 0.732 | 75.342 | 0.149 | n/a | 0.056 | 0.000 | n/a | n/a | 0.105 | 3.607 | 0.045 | 0.105 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d621900000000000004e9 | 79.745 | 2.422 | n/a | 0.000 | 0.000 | 0.646 | 76.549 | 0.003 | n/a | 0.047 | 0.000 | n/a | n/a | 0.077 | 2.422 | 0.030 | 0.077 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d621900000000000007ed | 78.313 | 4.811 | n/a | 0.000 | 0.000 | 0.558 | 72.809 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.090 | 4.811 | 0.061 | 0.090 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d621900000000000004cd | 77.447 | 9.009 | n/a | 0.000 | 0.000 | 0.738 | 67.383 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.247 | 9.009 | 0.116 | 0.247 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d6219000000000000080f | 76.388 | 7.211 | n/a | 0.000 | 0.000 | 0.610 | 68.256 | 0.088 | n/a | 0.034 | 0.000 | n/a | n/a | 0.191 | 7.211 | 0.094 | 0.191 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d621900000000000007da | 76.060 | 1.630 | n/a | 0.000 | 0.000 | 0.514 | 73.735 | 0.088 | n/a | 0.030 | 0.000 | n/a | n/a | 0.063 | 1.630 | 0.021 | 0.063 | gw-r/thread-51/journal/page | none observed |

## P3 / tail / internal (2231 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.018 | n/a | n/a | n/a | 4.555 | n/a | 0.000 | 0.000 | 0.261 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.094 | 4.578 | 0.368 | 6.094 |
| p99 | 315.122 | n/a | n/a | n/a | 23.675 | n/a | 2.185 | 0.000 | 1.652 | 311.728 | 0.114 | n/a | 0.044 | 0.000 | n/a | n/a | 47.006 | 25.263 | 0.836 | 47.006 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bce6f983331d62190000000000001a59 | 1003.506 | 0.473 | n/a | 0.000 | 0.000 | 0.625 | 1001.072 | 0.010 | n/a | 0.152 | 0.000 | n/a | n/a | 1.175 | 0.473 | 0.000 | 1.175 | gw-r/thread-49/journal/page | none observed |
| bce6f983331d62190000000000001a4f | 1003.413 | 0.260 | n/a | 0.000 | 0.000 | 0.757 | 1001.111 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 1.199 | 0.260 | 0.000 | 1.199 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d62190000000000001a76 | 1002.646 | 0.146 | n/a | 0.000 | 0.000 | 0.374 | 1000.931 | 0.024 | n/a | 0.051 | 0.000 | n/a | n/a | 1.120 | 0.146 | 0.000 | 1.120 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d62190000000000001a95 | 1002.506 | 4.480 | n/a | 0.000 | 0.000 | 0.627 | 997.250 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.116 | 4.480 | 0.004 | 0.116 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d62190000000000001a9d | 1002.495 | 0.106 | n/a | 0.000 | 0.000 | 0.444 | 1000.794 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 1.106 | 0.106 | 0.000 | 1.106 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d62190000000000001a4e | 995.377 | 2.932 | n/a | 0.000 | 0.000 | 0.332 | 992.022 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.070 | 2.932 | 0.003 | 0.070 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d62190000000000001a73 | 943.031 | 18.275 | n/a | 1.096 | 0.000 | 1.219 | 922.149 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.252 | 19.371 | 0.021 | 0.252 | gw-r/thread-51/journal/page | none observed |
| bce6f983331d62190000000000001a99 | 933.029 | 2.185 | n/a | 0.000 | 0.000 | 0.385 | 930.333 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.087 | 2.185 | 0.002 | 0.087 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d62190000000000001a8e | 793.734 | 4.244 | n/a | 0.000 | 0.000 | 0.452 | 788.846 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.134 | 4.244 | 0.005 | 0.134 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d62190000000000001a84 | 711.484 | 4.394 | n/a | 0.000 | 0.000 | 0.372 | 706.560 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.124 | 4.394 | 0.006 | 0.124 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d62190000000000001a6a | 684.664 | 6.446 | n/a | 0.000 | 0.000 | 0.416 | 677.592 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.177 | 6.446 | 0.009 | 0.177 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d62190000000000001a70 | 671.825 | 2.757 | n/a | 0.000 | 0.000 | 0.464 | 668.480 | 0.005 | n/a | 0.017 | 0.000 | n/a | n/a | 0.101 | 2.757 | 0.004 | 0.101 | gw-r/thread-46/journal/page | none observed |
| bce6f983331d62190000000000001a54 | 662.123 | 5.453 | n/a | 0.000 | 0.000 | 0.558 | 655.794 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.287 | 5.453 | 0.008 | 0.287 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d62190000000000001a64 | 658.990 | 7.212 | n/a | 0.000 | 0.000 | 0.485 | 651.077 | 0.005 | n/a | 0.018 | 0.000 | n/a | n/a | 0.193 | 7.212 | 0.011 | 0.193 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d62190000000000001a51 | 580.615 | 15.865 | n/a | 2.058 | 0.000 | 0.915 | 561.128 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.599 | 17.922 | 0.031 | 0.599 | gw-r/thread-44/journal/page | none observed |
| bce6f983331d62190000000000001a97 | 513.814 | 4.556 | n/a | 0.000 | 0.000 | 0.362 | 508.792 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.069 | 4.556 | 0.009 | 0.069 | gw-r/thread-65/journal/page | none observed |
| bce6f983331d62190000000000001a96 | 485.315 | 2.207 | n/a | 0.000 | 0.000 | 0.650 | 482.280 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.130 | 2.207 | 0.005 | 0.130 | gw-r/thread-47/journal/page | none observed |
| bce6f983331d62190000000000001a91 | 459.078 | 2.703 | n/a | 0.000 | 0.000 | 1.145 | 455.130 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.066 | 2.703 | 0.006 | 0.066 | gw-r/thread-46/journal/page | none observed |
| bce6f983331d62190000000000001a89 | 446.518 | 2.718 | n/a | 0.000 | 0.000 | 0.482 | 443.096 | 0.070 | n/a | 0.043 | 0.000 | n/a | n/a | 0.110 | 2.718 | 0.006 | 0.110 | gw-r/thread-50/journal/page | none observed |
| bce6f983331d62190000000000001a52 | 398.800 | 3.938 | n/a | 0.000 | 0.000 | 0.486 | 394.264 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.075 | 3.938 | 0.010 | 0.075 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.260 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.013 | 201.121 | 0.019 | n/a | 0.141 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 |
| p99 | 208.826 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.064 | 202.812 | 6.096 | n/a | 2.629 | 0.000 | n/a | n/a | 0.714 | 0.000 | 0.000 | 0.714 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ae6e0d4a9faddca000000000000003c | 208.826 | 0.000 | n/a | 0.000 | 0.000 | 7.064 | 201.422 | 0.026 | n/a | 0.156 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000000d | 207.310 | 0.000 | n/a | 0.000 | 0.000 | 1.572 | 202.812 | 0.076 | n/a | 2.629 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000020 | 206.090 | 0.000 | n/a | 0.000 | 0.000 | 2.441 | 202.779 | 0.034 | n/a | 0.304 | 0.000 | n/a | n/a | 0.531 | 0.000 | 0.000 | 0.531 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000003e | 203.892 | 0.000 | n/a | 0.000 | 0.000 | 1.209 | 202.103 | 0.067 | n/a | 0.338 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-48/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000000e | 203.874 | 0.000 | n/a | 0.000 | 0.000 | 1.286 | 202.157 | 0.014 | n/a | 0.247 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000008 | 203.610 | 0.000 | n/a | 0.000 | 0.000 | 1.588 | 201.551 | 0.018 | n/a | 0.205 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000002b | 203.564 | 0.000 | n/a | 0.000 | 0.000 | 1.048 | 202.058 | 0.039 | n/a | 0.287 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000022 | 203.423 | 0.000 | n/a | 0.000 | 0.000 | 1.576 | 201.501 | 0.021 | n/a | 0.195 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000001f | 203.407 | 0.000 | n/a | 0.000 | 0.000 | 1.047 | 201.768 | 0.022 | n/a | 0.252 | 0.000 | n/a | n/a | 0.317 | 0.000 | 0.000 | 0.317 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000001e | 203.371 | 0.000 | n/a | 0.000 | 0.000 | 1.307 | 201.635 | 0.022 | n/a | 0.251 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000004b | 203.367 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 202.092 | 0.141 | n/a | 0.146 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000041 | 203.330 | 0.000 | n/a | 0.000 | 0.000 | 1.078 | 201.818 | 0.033 | n/a | 0.258 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000001a | 203.224 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 201.885 | 0.023 | n/a | 0.296 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000003f | 203.177 | 0.000 | n/a | 0.000 | 0.000 | 1.345 | 201.394 | 0.016 | n/a | 0.142 | 0.000 | n/a | n/a | 0.280 | 0.000 | 0.000 | 0.280 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000023 | 203.171 | 0.000 | n/a | 0.000 | 0.000 | 1.360 | 201.341 | 0.015 | n/a | 0.165 | 0.000 | n/a | n/a | 0.290 | 0.000 | 0.000 | 0.290 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000000b | 203.169 | 0.000 | n/a | 0.000 | 0.000 | 0.527 | 201.895 | 0.093 | n/a | 0.535 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000046 | 203.102 | 0.000 | n/a | 0.000 | 0.000 | 1.285 | 201.398 | 0.015 | n/a | 0.137 | 0.000 | n/a | n/a | 0.266 | 0.000 | 0.000 | 0.266 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000028 | 203.071 | 0.000 | n/a | 0.000 | 0.000 | 1.514 | 201.257 | 0.016 | n/a | 0.157 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000048 | 203.020 | 0.000 | n/a | 0.000 | 0.000 | 0.682 | 201.810 | 0.031 | n/a | 0.323 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000059 | 202.873 | 0.000 | n/a | 0.000 | 0.000 | 1.036 | 201.501 | 0.030 | n/a | 0.153 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.129 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.894 | 200.955 | 0.021 | n/a | 0.123 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 |
| p99 | 205.201 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.994 | 203.725 | 6.128 | n/a | 0.286 | 0.000 | n/a | n/a | 0.442 | 0.000 | 0.000 | 0.442 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ae6e0d4a9faddca000000000000009e | 205.201 | 0.000 | n/a | 0.000 | 0.000 | 2.994 | 201.694 | 0.066 | n/a | 0.211 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-48/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000007b | 205.170 | 0.000 | n/a | 0.000 | 0.000 | 1.136 | 203.725 | 0.023 | n/a | 0.127 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-48/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000076 | 204.639 | 0.000 | n/a | 0.000 | 0.000 | 1.874 | 202.244 | 0.031 | n/a | 0.158 | 0.000 | n/a | n/a | 0.332 | 0.000 | 0.000 | 0.332 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000065 | 203.778 | 0.000 | n/a | 0.000 | 0.000 | 1.806 | 201.546 | 0.022 | n/a | 0.169 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000096 | 203.775 | 0.000 | n/a | 0.000 | 0.000 | 2.089 | 201.269 | 0.012 | n/a | 0.120 | 0.000 | n/a | n/a | 0.286 | 0.000 | 0.000 | 0.286 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000074 | 203.560 | 0.000 | n/a | 0.000 | 0.000 | 1.547 | 201.403 | 0.028 | n/a | 0.140 | 0.000 | n/a | n/a | 0.442 | 0.000 | 0.000 | 0.442 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000071 | 203.360 | 0.000 | n/a | 0.000 | 0.000 | 1.465 | 201.566 | 0.026 | n/a | 0.168 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000a4 | 203.237 | 0.000 | n/a | 0.000 | 0.000 | 0.947 | 201.927 | 0.022 | n/a | 0.190 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000b2 | 203.090 | 0.000 | n/a | 0.000 | 0.000 | 1.039 | 201.660 | 0.022 | n/a | 0.209 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000085 | 203.075 | 0.000 | n/a | 0.000 | 0.000 | 1.141 | 201.580 | 0.019 | n/a | 0.163 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-48/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000008d | 202.996 | 0.000 | n/a | 0.000 | 0.000 | 0.954 | 201.694 | 0.022 | n/a | 0.199 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000095 | 202.984 | 0.000 | n/a | 0.000 | 0.000 | 0.893 | 201.767 | 0.042 | n/a | 0.171 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000b7 | 202.838 | 0.000 | n/a | 0.000 | 0.000 | 1.168 | 201.293 | 0.015 | n/a | 0.153 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-48/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000006e | 202.811 | 0.000 | n/a | 0.000 | 0.000 | 1.181 | 201.328 | 0.018 | n/a | 0.137 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000067 | 202.807 | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 201.644 | 0.029 | n/a | 0.140 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000062 | 202.802 | 0.000 | n/a | 0.000 | 0.000 | 0.811 | 201.622 | 0.040 | n/a | 0.216 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000078 | 202.790 | 0.000 | n/a | 0.000 | 0.000 | 1.347 | 201.156 | 0.016 | n/a | 0.131 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000a6 | 202.744 | 0.000 | n/a | 0.000 | 0.000 | 1.243 | 201.157 | 0.027 | n/a | 0.165 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000007d | 202.677 | 0.000 | n/a | 0.000 | 0.000 | 0.845 | 201.513 | 0.021 | n/a | 0.148 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-48/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000aa | 202.650 | 0.000 | n/a | 0.000 | 0.000 | 1.107 | 201.209 | 0.011 | n/a | 0.162 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.969 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.845 | 200.872 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 |
| p99 | 206.955 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.308 | 204.229 | 3.898 | n/a | 0.365 | 0.000 | n/a | n/a | 0.529 | 0.000 | 0.000 | 0.529 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ae6e0d4a9faddca00000000000000d4 | 206.955 | 0.000 | n/a | 0.000 | 0.000 | 2.308 | 204.229 | 0.019 | n/a | 0.129 | 0.000 | n/a | n/a | 0.271 | 0.000 | 0.000 | 0.271 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000c6 | 205.953 | 0.000 | n/a | 0.000 | 0.000 | 1.277 | 203.892 | 0.080 | n/a | 0.365 | 0.000 | n/a | n/a | 0.340 | 0.000 | 0.000 | 0.340 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000d7 | 204.003 | 0.000 | n/a | 0.000 | 0.000 | 0.605 | 203.126 | 0.037 | n/a | 0.106 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000d8 | 203.136 | 0.000 | n/a | 0.000 | 0.000 | 1.422 | 201.405 | 0.008 | n/a | 0.108 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000df | 203.043 | 0.000 | n/a | 0.000 | 0.000 | 1.559 | 201.214 | 0.007 | n/a | 0.090 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000107 | 202.850 | 0.000 | n/a | 0.000 | 0.000 | 0.917 | 201.638 | 0.012 | n/a | 0.147 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000ca | 202.847 | 0.000 | n/a | 0.000 | 0.000 | 1.068 | 201.392 | 0.015 | n/a | 0.178 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000d1 | 202.839 | 0.000 | n/a | 0.000 | 0.000 | 1.030 | 201.448 | 0.032 | n/a | 0.186 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000f9 | 202.800 | 0.000 | n/a | 0.000 | 0.000 | 1.043 | 201.350 | 0.011 | n/a | 0.267 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000125 | 202.779 | 0.000 | n/a | 0.000 | 0.000 | 1.891 | 200.706 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000011c | 202.723 | 0.000 | n/a | 0.000 | 0.000 | 1.650 | 200.721 | 0.011 | n/a | 0.106 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000126 | 202.719 | 0.000 | n/a | 0.000 | 0.000 | 1.339 | 200.974 | 0.013 | n/a | 0.079 | 0.000 | n/a | n/a | 0.314 | 0.000 | 0.000 | 0.314 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000c5 | 202.606 | 0.000 | n/a | 0.000 | 0.000 | 1.162 | 201.088 | 0.030 | n/a | 0.207 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000120 | 202.564 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 201.453 | 0.016 | n/a | 0.165 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000c9 | 202.507 | 0.000 | n/a | 0.000 | 0.000 | 1.018 | 201.157 | 0.012 | n/a | 0.104 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000f6 | 202.506 | 0.000 | n/a | 0.000 | 0.000 | 0.933 | 201.312 | 0.008 | n/a | 0.091 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000f7 | 202.481 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 201.404 | 0.013 | n/a | 0.116 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000ce | 202.443 | 0.000 | n/a | 0.000 | 0.000 | 0.899 | 201.290 | 0.006 | n/a | 0.101 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000c2 | 202.422 | 0.000 | n/a | 0.000 | 0.000 | 1.133 | 200.944 | 0.010 | n/a | 0.174 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000000ec | 202.413 | 0.000 | n/a | 0.000 | 0.000 | 1.113 | 201.014 | 0.011 | n/a | 0.083 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-51/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.852 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 200.977 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 |
| p99 | 221.070 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.822 | 219.995 | 6.789 | n/a | 0.230 | 0.000 | n/a | n/a | 0.444 | 0.000 | 0.000 | 0.444 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ae6e0d4a9faddca0000000000000141 | 221.070 | 0.000 | n/a | 0.000 | 0.000 | 0.808 | 219.995 | 0.019 | n/a | 0.101 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000129 | 210.277 | 0.000 | n/a | 0.000 | 0.000 | 1.187 | 202.036 | 6.789 | n/a | 0.036 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000013a | 204.734 | 0.000 | n/a | 0.000 | 0.000 | 0.902 | 203.439 | 0.015 | n/a | 0.112 | 0.000 | n/a | n/a | 0.266 | 0.000 | 0.000 | 0.266 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000160 | 204.277 | 0.000 | n/a | 0.000 | 0.000 | 1.822 | 201.887 | 0.011 | n/a | 0.114 | 0.000 | n/a | n/a | 0.444 | 0.000 | 0.000 | 0.444 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000137 | 203.986 | 0.000 | n/a | 0.000 | 0.000 | 1.188 | 202.221 | 0.016 | n/a | 0.220 | 0.000 | n/a | n/a | 0.342 | 0.000 | 0.000 | 0.342 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000152 | 203.970 | 0.000 | n/a | 0.000 | 0.000 | 0.946 | 202.680 | 0.034 | n/a | 0.076 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000164 | 203.532 | 0.000 | n/a | 0.000 | 0.000 | 1.154 | 202.014 | 0.050 | n/a | 0.148 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000136 | 203.463 | 0.000 | n/a | 0.000 | 0.000 | 1.105 | 201.918 | 0.016 | n/a | 0.191 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000012d | 203.017 | 0.000 | n/a | 0.000 | 0.000 | 0.904 | 201.705 | 0.031 | n/a | 0.230 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000018e | 202.877 | 0.000 | n/a | 0.000 | 0.000 | 1.042 | 201.338 | 0.040 | n/a | 0.159 | 0.000 | n/a | n/a | 0.298 | 0.000 | 0.000 | 0.298 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000012f | 202.753 | 0.000 | n/a | 0.000 | 0.000 | 0.942 | 201.522 | 0.038 | n/a | 0.115 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000165 | 202.686 | 0.000 | n/a | 0.000 | 0.000 | 1.053 | 201.309 | 0.031 | n/a | 0.093 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000176 | 202.638 | 0.000 | n/a | 0.000 | 0.000 | 1.335 | 201.042 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000012c | 202.626 | 0.000 | n/a | 0.000 | 0.000 | 1.069 | 201.225 | 0.007 | n/a | 0.142 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000017b | 202.625 | 0.000 | n/a | 0.000 | 0.000 | 0.941 | 201.332 | 0.020 | n/a | 0.094 | 0.000 | n/a | n/a | 0.237 | 0.000 | 0.000 | 0.237 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000016b | 202.596 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 201.349 | 0.016 | n/a | 0.097 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000146 | 202.528 | 0.000 | n/a | 0.000 | 0.000 | 1.142 | 201.059 | 0.015 | n/a | 0.100 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000189 | 202.519 | 0.000 | n/a | 0.000 | 0.000 | 0.562 | 201.483 | 0.012 | n/a | 0.115 | 0.000 | n/a | n/a | 0.347 | 0.000 | 0.000 | 0.347 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000015f | 202.511 | 0.000 | n/a | 0.000 | 0.000 | 1.103 | 201.073 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000138 | 202.474 | 0.000 | n/a | 0.000 | 0.000 | 0.995 | 201.227 | 0.012 | n/a | 0.098 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-50/journal/page | none observed |

## P3 / L64 / read (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.707 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.695 | 200.824 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 |
| p99 | 203.749 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.691 | 202.342 | 2.896 | n/a | 0.280 | 0.000 | n/a | n/a | 0.255 | 0.000 | 0.000 | 0.255 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ae6e0d4a9faddca00000000000001a0 | 203.923 | 0.000 | n/a | 0.000 | 0.000 | 0.626 | 203.090 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000001da | 203.749 | 0.000 | n/a | 0.000 | 0.000 | 1.764 | 201.621 | 0.020 | n/a | 0.157 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000001fa | 203.622 | 0.000 | n/a | 0.000 | 0.000 | 0.881 | 202.342 | 0.021 | n/a | 0.159 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000001d9 | 203.212 | 0.000 | n/a | 0.000 | 0.000 | 1.691 | 201.233 | 0.017 | n/a | 0.079 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000001a5 | 202.736 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 201.620 | 0.014 | n/a | 0.156 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000001c9 | 202.561 | 0.000 | n/a | 0.000 | 0.000 | 1.027 | 200.866 | 0.006 | n/a | 0.537 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000001c3 | 202.541 | 0.000 | n/a | 0.000 | 0.000 | 0.779 | 201.522 | 0.013 | n/a | 0.105 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000001ad | 202.526 | 0.000 | n/a | 0.000 | 0.000 | 0.970 | 201.212 | 0.020 | n/a | 0.109 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000001e0 | 202.475 | 0.000 | n/a | 0.000 | 0.000 | 1.239 | 201.043 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000001a9 | 202.319 | 0.000 | n/a | 0.000 | 0.000 | 0.796 | 201.309 | 0.023 | n/a | 0.075 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000001b6 | 202.273 | 0.000 | n/a | 0.000 | 0.000 | 0.886 | 201.106 | 0.012 | n/a | 0.088 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000203 | 202.261 | 0.000 | n/a | 0.000 | 0.000 | 0.616 | 201.189 | 0.012 | n/a | 0.280 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000001a6 | 202.261 | 0.000 | n/a | 0.000 | 0.000 | 0.991 | 200.988 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000001b2 | 202.239 | 0.000 | n/a | 0.000 | 0.000 | 0.709 | 201.299 | 0.010 | n/a | 0.112 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000204 | 202.236 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 201.140 | 0.008 | n/a | 0.127 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000195 | 202.234 | 0.000 | n/a | 0.000 | 0.000 | 0.999 | 200.922 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000001d5 | 202.217 | 0.000 | n/a | 0.000 | 0.000 | 0.869 | 201.099 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000001ab | 202.196 | 0.000 | n/a | 0.000 | 0.000 | 0.687 | 201.196 | 0.055 | n/a | 0.097 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000200 | 202.185 | 0.000 | n/a | 0.000 | 0.000 | 0.648 | 201.284 | 0.011 | n/a | 0.083 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000001e1 | 202.122 | 0.000 | n/a | 0.000 | 0.000 | 0.562 | 201.324 | 0.040 | n/a | 0.082 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-44/journal/page | none observed |

## P3 / L256 / read (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.782 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.732 | 200.844 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 |
| p99 | 203.204 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.793 | 201.643 | 4.876 | n/a | 0.148 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ae6e0d4a9faddca0000000000000219 | 206.492 | 0.000 | n/a | 0.000 | 0.000 | 3.800 | 202.524 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000250 | 203.204 | 0.000 | n/a | 0.000 | 0.000 | 1.169 | 201.643 | 0.008 | n/a | 0.148 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000023f | 203.191 | 0.000 | n/a | 0.000 | 0.000 | 1.178 | 201.620 | 0.016 | n/a | 0.138 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000023c | 202.775 | 0.000 | n/a | 0.000 | 0.000 | 0.999 | 201.442 | 0.007 | n/a | 0.153 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000022e | 202.436 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 201.370 | 0.015 | n/a | 0.092 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000245 | 202.427 | 0.000 | n/a | 0.000 | 0.000 | 1.062 | 201.073 | 0.008 | n/a | 0.107 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000236 | 202.411 | 0.000 | n/a | 0.000 | 0.000 | 0.981 | 201.122 | 0.007 | n/a | 0.085 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000026f | 202.396 | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 201.363 | 0.013 | n/a | 0.110 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000252 | 202.363 | 0.000 | n/a | 0.000 | 0.000 | 0.904 | 201.207 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000247 | 202.348 | 0.000 | n/a | 0.000 | 0.000 | 1.135 | 200.956 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000274 | 202.344 | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 200.974 | 0.007 | n/a | 0.098 | 0.000 | n/a | n/a | 0.238 | 0.000 | 0.000 | 0.238 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000025d | 202.330 | 0.000 | n/a | 0.000 | 0.000 | 0.939 | 201.158 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000225 | 202.291 | 0.000 | n/a | 0.000 | 0.000 | 0.750 | 201.269 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000224 | 202.291 | 0.000 | n/a | 0.000 | 0.000 | 1.019 | 201.025 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000265 | 202.281 | 0.000 | n/a | 0.000 | 0.000 | 0.764 | 201.312 | 0.010 | n/a | 0.089 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000026d | 202.216 | 0.000 | n/a | 0.000 | 0.000 | 1.167 | 200.806 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000231 | 202.216 | 0.000 | n/a | 0.000 | 0.000 | 0.864 | 201.084 | 0.011 | n/a | 0.129 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000268 | 202.202 | 0.000 | n/a | 0.000 | 0.000 | 0.714 | 201.261 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000248 | 202.197 | 0.000 | n/a | 0.000 | 0.000 | 0.817 | 201.107 | 0.007 | n/a | 0.124 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000255 | 202.163 | 0.000 | n/a | 0.000 | 0.000 | 0.920 | 201.035 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-51/journal/page | none observed |

## P3 / L1024 / read (61 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.755 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.686 | 70.206 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 |
| p99 | 206.376 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.105 | 205.548 | 1.858 | n/a | 0.116 | 0.000 | n/a | n/a | 126.006 | 0.000 | 0.000 | 126.006 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ae6e0d4a9faddca000000000000028b | 206.376 | 0.000 | n/a | 0.000 | 0.000 | 0.618 | 205.548 | 0.014 | n/a | 0.083 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000295 | 202.818 | 0.000 | n/a | 0.000 | 0.000 | 0.979 | 201.501 | 0.012 | n/a | 0.116 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000285 | 202.661 | 0.000 | n/a | 0.000 | 0.000 | 1.167 | 201.074 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.334 | 0.000 | 0.000 | 0.334 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000294 | 202.557 | 0.000 | n/a | 0.000 | 0.000 | 1.049 | 201.142 | 0.007 | n/a | 0.079 | 0.000 | n/a | n/a | 0.279 | 0.000 | 0.000 | 0.279 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000287 | 202.349 | 0.000 | n/a | 0.000 | 0.000 | 1.056 | 201.019 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000291 | 202.276 | 0.000 | n/a | 0.000 | 0.000 | 0.627 | 201.344 | 0.021 | n/a | 0.108 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000293 | 202.263 | 0.000 | n/a | 0.000 | 0.000 | 0.984 | 200.957 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000289 | 202.207 | 0.000 | n/a | 0.000 | 0.000 | 0.831 | 201.128 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000282 | 202.113 | 0.000 | n/a | 0.000 | 0.000 | 0.717 | 201.180 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000290 | 202.056 | 0.000 | n/a | 0.000 | 0.000 | 0.754 | 201.075 | 0.007 | n/a | 0.101 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000028f | 202.037 | 0.000 | n/a | 0.000 | 0.000 | 0.838 | 200.987 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000028c | 201.994 | 0.000 | n/a | 0.000 | 0.000 | 0.550 | 201.194 | 0.014 | n/a | 0.075 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000027d | 201.970 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 200.896 | 0.015 | n/a | 0.072 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000027c | 201.920 | 0.000 | n/a | 0.000 | 0.000 | 0.837 | 200.858 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000028e | 201.751 | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 200.911 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000027e | 201.705 | 0.000 | n/a | 0.000 | 0.000 | 0.707 | 200.812 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000283 | 201.441 | 0.000 | n/a | 0.000 | 0.000 | 0.536 | 200.729 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000280 | 201.349 | 0.000 | n/a | 0.000 | 0.000 | 0.395 | 200.754 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca000000000000028a | 175.305 | 0.000 | n/a | 0.000 | 0.000 | 0.886 | 174.212 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca00000000000003af | 127.124 | 0.000 | n/a | 0.000 | 0.000 | 1.117 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 126.006 | 0.000 | 0.000 | 126.006 | node-14/thread-3/socket.wait-first-byte | none observed |

## P3 / tail / read (205 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 87.073 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.577 | 85.880 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 |
| p99 | 203.171 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.637 | 201.669 | 2.184 | n/a | 0.142 | 0.000 | n/a | n/a | 50.189 | 0.000 | 0.000 | 50.189 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ae6e0d4a9faddca0000000000000e76 | 211.247 | 0.000 | n/a | 0.000 | 0.000 | 0.535 | 210.458 | 0.050 | n/a | 0.095 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000e55 | 203.843 | 0.000 | n/a | 0.000 | 0.000 | 1.162 | 202.251 | 0.014 | n/a | 0.142 | 0.000 | n/a | n/a | 0.274 | 0.000 | 0.000 | 0.274 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000e53 | 203.171 | 0.000 | n/a | 0.000 | 0.000 | 1.057 | 201.669 | 0.009 | n/a | 0.186 | 0.000 | n/a | n/a | 0.251 | 0.000 | 0.000 | 0.251 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000e47 | 202.821 | 0.000 | n/a | 0.000 | 0.000 | 1.050 | 201.446 | 0.009 | n/a | 0.098 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000e54 | 202.708 | 0.000 | n/a | 0.000 | 0.000 | 1.170 | 201.229 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000e70 | 202.539 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 201.152 | 0.010 | n/a | 0.158 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000e7a | 202.479 | 0.000 | n/a | 0.000 | 0.000 | 1.347 | 200.946 | 0.022 | n/a | 0.061 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000eae | 202.199 | 0.000 | n/a | 0.000 | 0.000 | 1.303 | 200.719 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000e64 | 202.085 | 0.000 | n/a | 0.000 | 0.000 | 1.272 | 200.675 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-49/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000e69 | 201.999 | 0.000 | n/a | 0.000 | 0.000 | 0.841 | 200.906 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000e46 | 201.958 | 0.000 | n/a | 0.000 | 0.000 | 0.840 | 200.860 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-47/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000e98 | 201.928 | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 200.870 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-44/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000e6b | 201.921 | 0.000 | n/a | 0.000 | 0.000 | 0.946 | 200.681 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000e6e | 201.896 | 0.000 | n/a | 0.000 | 0.000 | 0.559 | 201.121 | 0.008 | n/a | 0.092 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000e6f | 201.875 | 0.000 | n/a | 0.000 | 0.000 | 0.577 | 201.010 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-50/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000eb5 | 201.859 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 200.834 | 0.029 | n/a | 0.041 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-46/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000ead | 201.841 | 0.000 | n/a | 0.000 | 0.000 | 0.649 | 200.998 | 0.042 | n/a | 0.060 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000e9c | 201.840 | 0.000 | n/a | 0.000 | 0.000 | 0.548 | 201.092 | 0.008 | n/a | 0.074 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-51/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000e9d | 201.752 | 0.000 | n/a | 0.000 | 0.000 | 0.685 | 200.901 | 0.004 | n/a | 0.061 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-65/journal/page | none observed |
| 1ae6e0d4a9faddca0000000000000e9a | 201.748 | 0.000 | n/a | 0.000 | 0.000 | 0.645 | 200.857 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-65/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
